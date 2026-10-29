// Touch controls (phones, tablets): the same game through fingers. Nothing here knows the rules —
// it feeds the input model the mouse and keys already drive (InputHandler state and the bus's
// 'mousedown' / 'mouseup' / 'key' events), so selection, orders and direct control run the
// same code as on a desktop.
//
// Command view (on the battlefield itself):
//   tap               your stack: select it (tap it again quickly: take direct control).
//                     Anywhere else with stacks selected: order them there — at an enemy, an
//                     attack; on a house, garrison it. In a targeting mode (smoke, air support,
//                     building) the tap places it.
//   drag              pan: the ground follows the finger
//   hold, then drag   with stacks selected: move there and face the way you drag (the men's
//                     cover spots show while you aim, like a right-drag); with none, box select
//   two fingers       pinch to zoom, twist to turn the view, slide both up or down to tilt it
// A row at the top of the command panel adds what a mouse does with keys (take control,
// deselect, cancel a targeting), and a pause button sits in the top bar in both views. On touch
// the panel starts collapsed to its Orders button and that row, so the battlefield stays clear;
// Orders opens the rest (reinforcements, building, smoke, air support), and any command given
// folds it away again.
// Direct control: a stick on the left (pushed to the rim it sprints), drag on the right half
// to look, a fire button (hold), reload / crouch / prone / next man, and back to command.
// body.touch is set at once on a phone or tablet (coarse pointer), and on a laptop with a touch
// screen only once it is touched, so it keeps its mouse layout until then.
import { CameraMode } from '../core/CameraManager.js';
import { keys } from '../core/Keys.js';

const HOLD = 0.42;        // seconds before a still finger starts a box select
const SLOP = 12;          // px a finger may wander and still be a tap
const STICK = 56;         // px from the stick's centre to its rim
const LOOK = 1.7;         // look speed: mouse-pixels per finger-pixel

const btn = (cls, label, title = label) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.innerHTML = label;
  b.title = title;
  b.tabIndex = -1;
  return b;
};

export class TouchControls {
  constructor(game) {
    this.game = game;
    this.input = game.input;
    this.fingers = new Map();   // battlefield touches: id → { x, y }
    this.single = null;         // the one-finger gesture: { id, x0, y0, t0, mode: pending | pan | box }
    this.pair = null;           // the two-finger gesture: { d, a, y }
    this.ignore = false;        // after a two-finger gesture, until every finger is up
    this.held = new Set();      // key codes the stick is holding down

    // the container of both renderers' canvases (Babylon draws on its own, above Three's)
    const canvas = game.canvas.parentElement ?? game.canvas;
    canvas.style.touchAction = 'none';
    const opts = { passive: false };
    canvas.addEventListener('touchstart', (e) => this.start(e), opts);
    canvas.addEventListener('touchmove', (e) => this.move(e), opts);
    canvas.addEventListener('touchend', (e) => this.end(e), opts);
    canvas.addEventListener('touchcancel', (e) => this.end(e, true), opts);
    window.addEventListener('touchstart', () => this.enable(), { passive: true, capture: true });

    this.buildToolbar();
    this.buildPad();
    if (matchMedia('(pointer: coarse)').matches) this.enable(); // a phone or tablet: fingers from the start
  }

  /** First touch: switch the layout to touch (and say so to the code that asks). */
  enable() {
    if (this.input.touch) return;
    this.input.touch = true;
    this.input.mouse.inside = false;   // no edge scrolling from a finger's last position
    document.body.classList.add('touch');
  }

  get commanding() {
    return this.game.cameraManager.mode !== CameraMode.ACTION;
  }

  // ------------------------------------------------------------------ the battlefield

  start(e) {
    e.preventDefault();
    this.enable();
    if (!this.commanding || this.game.ended) return;
    for (const t of e.changedTouches) this.fingers.set(t.identifier, { x: t.clientX, y: t.clientY });
    if (this.ignore) return;
    if (this.fingers.size === 1) {
      const [id, f] = [...this.fingers][0];
      this.single = { id, x0: f.x, y0: f.y, t0: e.timeStamp, mode: 'pending' };
      this.point(f.x, f.y);
      clearTimeout(this.holdTimer);
      this.holdTimer = setTimeout(() => navigator.vibrate?.(12), HOLD * 1000); // felt: now a drag boxes
    } else if (this.fingers.size === 2) {
      this.cancelSingle();
      this.pair = this.measure();
      this.input.mouse.buttons.add(1);   // the middle-button camera code turns and tilts
    }
  }

  move(e) {
    e.preventDefault();
    if (!this.commanding) return;
    const before = new Map([...this.fingers].map(([id, f]) => [id, { ...f }]));
    for (const t of e.changedTouches) if (this.fingers.has(t.identifier)) this.fingers.set(t.identifier, { x: t.clientX, y: t.clientY });
    if (this.pair && this.fingers.size >= 2) return this.twoFinger();
    const s = this.single;
    if (!s) return;
    const f = this.fingers.get(s.id);
    if (!f) return;
    if (s.mode === 'pending' && Math.hypot(f.x - s.x0, f.y - s.y0) > SLOP) {
      // decided by the events' own times, not the timer: a busy frame can hold the moves back
      clearTimeout(this.holdTimer);
      if (e.timeStamp - s.t0 >= HOLD * 1000) this.startBox();
      else s.mode = 'pan';
    }
    if (s.mode === 'pan') this.pan(before.get(s.id), f);
    else if (s.mode === 'box' || s.mode === 'aim') this.point(f.x, f.y);
  }

  end(e, cancelled = false) {
    e.preventDefault();
    const s = this.single;
    for (const t of e.changedTouches) {
      const f = this.fingers.get(t.identifier);
      this.fingers.delete(t.identifier);
      if (!s || t.identifier !== s.id || !f) continue;
      clearTimeout(this.holdTimer);
      this.single = null;
      if (cancelled || !this.commanding) { if (s.mode === 'box' || s.mode === 'aim') this.cancelBox(); continue; }
      if (s.mode === 'pending') this.tap(f.x, f.y);
      else if (s.mode === 'box') this.mouse('mouseup', 0, f.x, f.y);
      else if (s.mode === 'aim') { this.point(f.x, f.y); this.mouse('mouseup', 2, f.x, f.y); }
    }
    if (this.pair && this.fingers.size < 2) {
      this.pair = null;
      this.input.mouse.buttons.delete(1);
      this.ignore = this.fingers.size > 0;
    }
    if (!this.fingers.size) this.ignore = false;
  }

  /** A tap: select your own stack, otherwise order the selection there (or place a targeting). */
  tap(x, y) {
    const cs = this.game.commands;
    this.point(x, y);
    if (cs.targeting) return this.mouse('mousedown', 0, x, y);
    const own = cs.stackAt(x, y, cs.faction, (s) => this.game.mine(s) && !s.stats.structure && !s.autonomous);
    const button = own || !cs.selected.size ? 0 : 2;
    this.mouse('mousedown', button, x, y);
    this.mouse('mouseup', button, x, y);
  }

  startBox() {
    const s = this.single;
    if (!s || s.mode !== 'pending' || !this.commanding) return;
    // with a selection: aim a move-and-face order (the right-drag); without: a selection box
    s.mode = this.game.commands.selected.size ? 'aim' : 'box';
    this.mouse('mousedown', s.mode === 'aim' ? 2 : 0, s.x0, s.y0);
  }

  cancelBox() {
    const cs = this.game.commands;
    cs.drag = null;
    cs.rdrag = null;
    cs.boxEl.hidden = true;
    cs.hideFacingArrow();
  }

  cancelSingle() {
    clearTimeout(this.holdTimer);
    if (this.single?.mode === 'box' || this.single?.mode === 'aim') this.cancelBox();
    this.single = null;
  }

  /** One finger: the ground under it stays under it. */
  pan(a, b) {
    if (!a) return;
    const cs = this.game.commands;
    const p0 = cs.pickGround(a.x, a.y, cs._v);
    if (!p0) return;
    const x0 = p0.x;
    const z0 = p0.z;
    const p1 = cs.pickGround(b.x, b.y, cs._v);
    if (!p1) return;
    const cm = this.game.cameraManager;
    const t = cm.tactical.target;
    t.x = Math.max(-cm.bounds.x, Math.min(cm.bounds.x, t.x + x0 - p1.x));
    t.z = Math.max(-cm.bounds.z, Math.min(cm.bounds.z, t.z + z0 - p1.z));
  }

  measure() {
    const [a, b] = [...this.fingers.values()];
    return { d: Math.hypot(b.x - a.x, b.y - a.y), a: Math.atan2(b.y - a.y, b.x - a.x), y: (a.y + b.y) / 2 };
  }

  /** Two fingers: pinch zooms, twisting turns the view, sliding both up or down tilts it. */
  twoFinger() {
    const now = this.measure();
    const was = this.pair;
    const m = this.input.mouse;
    if (now.d > 20 && was.d > 20) m.wheel += (was.d / now.d - 1) / 0.0012;   // camera: height × (1 + wheel × 0.0012)
    let da = now.a - was.a;
    if (da > Math.PI) da -= 2 * Math.PI;
    if (da < -Math.PI) da += 2 * Math.PI;
    m.dx -= da / 0.006;             // the map turns with the fingers
    m.dy += (now.y - was.y) * 1.2;
    this.pair = now;
  }

  point(x, y) {
    const m = this.input.mouse;
    m.x = x;
    m.y = y;
  }

  mouse(type, button, x, y) {
    this.game.bus.emit(type, { button, x, y, shift: false, ctrl: false, alt: false });
  }

  key(action) {
    const code = keys.code(action);
    if (code) this.game.bus.emit('key', { code, shift: false, ctrl: false });
  }

  // ------------------------------------------------------------------ command toolbar

  buildToolbar() {
    const bar = (this.toolbar = document.createElement('div'));
    bar.id = 'touch-bar';
    const control = btn('tb-control', 'Take control');
    const clear = btn('tb-clear', 'Deselect');
    const cancel = btn('tb-cancel', 'Cancel');
    const pause = btn('tb-pause', '❚❚', 'Pause');
    control.addEventListener('click', () => this.game.toggleView());
    clear.addEventListener('click', () => { this.game.commands.select([]); });
    cancel.addEventListener('click', () => this.game.commands.cancelTargeting());
    pause.addEventListener('click', () => this.game.bus.emit('key', { code: 'Escape' }));
    bar.append(cancel, control, clear);
    const panel = document.getElementById('command-panel');
    const orders = btn('tb-orders', 'Orders', 'Show or hide the orders panel');
    orders.addEventListener('click', () => this.setPanel(panel.classList.contains('collapsed')));
    panel.prepend(orders, bar);
    this.panel = panel;
    // a command given — a button in the panel (not Orders or Reinforcements, which open things),
    // a unit bought, an order on the battlefield — folds the panel away again
    panel.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b && !b.matches('.tb-orders, .rf-open')) setTimeout(() => this.setPanel(false), 0);
    });
    for (const ev of ['order', 'ui:reinforce']) this.game.bus.on(ev, () => this.setPanel(false));
    document.getElementById('topbar').append(pause);
    this.tb = { control, clear, cancel, orders };
    this.setPanel(false);
  }

  /** Open or collapse the command panel (touch layout only; the mouse layout ignores it). */
  setPanel(open) {
    this.panel.classList.toggle('collapsed', !open);
    // the reinforcements window is opened from the panel: it goes when the panel folds away
    if (!open && document.body.classList.contains('touch')) this.game.frontlineHud?.window.toggle(false);
    this.tb.orders?.setAttribute('aria-expanded', String(open));
  }

  // ------------------------------------------------------------------ direct control pad

  buildPad() {
    const pad = (this.pad = document.createElement('div'));
    pad.id = 'touch-pad';
    pad.innerHTML = '<div class="tp-look"></div><div class="tp-stick"><i></i></div><div class="tp-buttons"></div>';
    document.getElementById('hud').append(pad);
    const look = pad.querySelector('.tp-look');
    const stick = pad.querySelector('.tp-stick');
    const knob = stick.querySelector('i');
    const box = pad.querySelector('.tp-buttons');
    const opts = { passive: false };

    // the stick: direction → the movement keys; at the rim, sprint
    let stickId = null;
    let centre = null;
    const setStick = (dx, dy) => {
      const r = Math.min(1, Math.hypot(dx, dy) / STICK);
      const a = Math.atan2(dy, dx);
      const vx = Math.cos(a) * r;
      const vy = Math.sin(a) * r;
      knob.style.transform = `translate(${vx * STICK}px, ${vy * STICK}px)`;
      const want = new Set();
      if (vy < -0.35) want.add(keys.code('up'));
      if (vy > 0.35) want.add(keys.code('down'));
      if (vx < -0.35) want.add(keys.code('left'));
      if (vx > 0.35) want.add(keys.code('right'));
      if (r > 0.95 && vy < -0.35) want.add(keys.code('sprint'));
      this.hold(want);
    };
    stick.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      stickId = t.identifier;
      const r = stick.getBoundingClientRect();
      centre = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      setStick(t.clientX - centre.x, t.clientY - centre.y);
    }, opts);
    stick.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === stickId) setStick(t.clientX - centre.x, t.clientY - centre.y);
    }, opts);
    const release = (e) => {
      for (const t of e.changedTouches) if (t.identifier === stickId) { stickId = null; setStick(0, 0); }
    };
    stick.addEventListener('touchend', release);
    stick.addEventListener('touchcancel', release);

    // look: drag anywhere on the right half
    const lookers = new Map();
    look.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) lookers.set(t.identifier, { x: t.clientX, y: t.clientY });
    }, opts);
    look.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const m = this.input.mouse;
      for (const t of e.changedTouches) {
        const was = lookers.get(t.identifier);
        if (!was) continue;
        m.dx += (t.clientX - was.x) * LOOK;
        m.dy += (t.clientY - was.y) * LOOK;
        lookers.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
    }, opts);
    const unlook = (e) => { for (const t of e.changedTouches) lookers.delete(t.identifier); };
    look.addEventListener('touchend', unlook);
    look.addEventListener('touchcancel', unlook);

    // fire: held like the left mouse button; the rest are key presses
    const fire = btn('tp-fire', 'Fire');
    const press = (on) => (e) => { e.preventDefault(); if (on) this.input.mouse.buttons.add(0); else this.input.mouse.buttons.delete(0); };
    fire.addEventListener('touchstart', press(true), opts);
    fire.addEventListener('touchend', press(false), opts);
    fire.addEventListener('touchcancel', press(false), opts);
    box.append(fire);
    for (const [action, label] of [['reload', 'Reload'], ['crouch', 'Crouch'], ['prone', 'Prone'], ['nextMember', 'Next man'], ['sight', 'Sight'], ['toggleView', 'Command']]) {
      const b = btn(`tp-${action}`, label);
      b.addEventListener('touchstart', (e) => { e.preventDefault(); this.key(action); }, opts);
      box.append(b);
    }
  }

  /** Keep exactly these key codes held down for the stick. */
  hold(want) {
    const k = this.input.keys;
    for (const c of this.held) if (!want.has(c)) k.delete(c);
    for (const c of want) if (c) k.add(c);
    this.held = new Set([...want].filter(Boolean));
  }

  /** Per frame: the toolbar's buttons for the moment; let go of everything when control ends. */
  update() {
    if (!this.input.touch) return;
    const cs = this.game.commands;
    const commanding = this.commanding;
    this.tb.cancel.hidden = !cs.targeting;
    this.tb.control.hidden = !cs.selected.size || !!this.game.net;
    this.tb.clear.hidden = !cs.selected.size;
    this.sightBtn ??= this.pad.querySelector('.tp-sight');
    if (this.sightBtn) this.sightBtn.hidden = !this.game.player.sightKind?.();
    if (commanding && (this.held.size || this.input.mouse.buttons.has(0))) {
      this.hold(new Set());
      if (!this.single) this.input.mouse.buttons.delete(0);
    }
  }
}
