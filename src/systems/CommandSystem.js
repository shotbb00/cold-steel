// Tactical-view RTS controls: click / box selection of friendly stacks, contextual
// right-click orders (move, attack, move-and-hold), right-drag to move and face the way you
// drag (an arrow shows it; drag next to a squad to just turn it), hotkeys, selection rings and
// order markers.
// Double-click a stack (or select it and press Tab) to take direct control of it.
// Targeting mode (fortify / air strike buttons): a ghost follows the cursor; LMB confirms,
// RMB or Esc cancels, Q / E rotate a structure.
// Orders themselves are plain commands handed to game.orders (core/Orders.js), which runs them
// here or — for a multiplayer client — on the host; selection, markers and sounds stay local.
import * as THREE from 'three';
import { STRUCTURES } from './Construction.js';
import { KINDS } from './AirStrike.js';
import { GAS } from './Gas.js';
import { CameraMode } from '../core/CameraManager.js';
import { enemyOf } from '../data/factions.js';
import { dist2DSq } from '../core/math.js';
import { GroundDecal } from '../world/GroundDecal.js';
import { keys, keyOf } from '../core/Keys.js';
import { planCover } from '../world/CoverPlan.js';

const ARROW_SIZE = 10;     // metres long: the facing arrow drawn while right-dragging
const MARKER_COLORS = { move: 0x5cf4ff, attack: 0xff4f86, hold: 0xffc35a };
const ids = (stacks) => [...stacks].filter((s) => s.alive).map((s) => s.id);

export class CommandSystem {
  constructor(game) {
    this.game = game;
    this.faction = game.playerFaction;
    this.enemy = enemyOf(this.faction);
    this.selected = new Set();
    this.rings = new Map();
    this.markers = [];
    this.drag = null;
    this.boxEl = document.getElementById('select-box');

    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this._p = new THREE.Vector3();
    this._v = new THREE.Vector3();

    this.preview = this.buildPreview();
    this.ringGeo = new THREE.RingGeometry(0.92, 1, 48);
    this.ringGeo.rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xffc35a).multiplyScalar(1.5), transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });

    const bus = game.bus;
    bus.on('mousedown', (e) => this.onMouseDown(e));
    bus.on('mouseup', (e) => this.onMouseUp(e));
    bus.on('key', (e) => this.onKey(e));
    bus.on('ui:command', (cmd) => this.runCommand(cmd));
    bus.on('stack:destroyed', (s) => {
      if (this.selected.delete(s)) this.emitSelection();
    });
    bus.on('stack:removed', (s) => {
      if (this.selected.delete(s)) this.emitSelection();
    });
  }

  get active() {
    return this.game.cameraManager.mode === CameraMode.TACTICAL && !this.game.ended;
  }

  playerStacks() {
    // co-op: not your partner's; never fortifications or the lane waves (they go by themselves)
    return this.game.world.stacksOf(this.faction).filter((s) => this.game.mine(s) && !s.stats.structure && !s.autonomous);
  }

  // ---------------------------------------------------------------- picking

  pickGround(x, y, out) {
    const rect = this.game.canvas.getBoundingClientRect();
    this.ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.game.camera);
    const ray = this.raycaster.ray;
    return this.game.terrain.raycast(ray.origin, ray.direction, 900, out);
  }

  /** Visible stack of `faction` with a living unit (edge) closest to `point`, within maxDist. */
  stackNear(point, faction, maxDist = 2.8) {
    let best = null;
    let bestD = maxDist;
    for (const s of this.game.world.stacksOf(faction)) {
      if (s.visible === false) continue;
      for (const u of s.units) {
        if (!u.alive || u.visible === false) continue;
        const d = Math.sqrt(dist2DSq(point, u.pos)) - u.radius;
        if (d < bestD) { bestD = d; best = s; }
      }
    }
    return best;
  }

  /** Replace the selection (used when returning from direct control). */
  select(stacks) {
    this.selected = new Set(stacks.filter((s) => s.alive));
    this.emitSelection();
  }

  // ---------------------------------------------------------------- input

  onMouseDown({ button, x, y, shift, ctrl, alt }) {
    if (!this.active) return;
    if (alt && this.game.coop && (button === 0 || button === 2)) {
      // co-op: Alt + click marks the spot for the teammate (ui/Chat.js), Alt + right-click danger
      const p = this.pickGround(x, y, this._p);
      if (p) this.game.bus.emit('ping', { x: p.x, z: p.z, kind: button === 2 ? 'danger' : 'here' });
      return;
    }
    if (this.targeting) {
      if (button === 0) this.confirmTargeting(x, y);
      else if (button === 2) this.cancelTargeting();
      return;
    }
    if (button === 0) this.drag = { x0: x, y0: y, shift };
    else if (button === 2) {
      // a click orders at once on release; a drag sets the facing (see update / onMouseUp)
      const p = this.pickGround(x, y, this._p);
      this.rdrag = { x0: x, y0: y, ctrl, p0: p ? p.clone() : null };
    }
  }

  onMouseUp({ button, x, y }) {
    if (button === 2 && this.rdrag) {
      const r = this.rdrag;
      this.rdrag = null;
      this.hideFacingArrow();
      if (!this.active) return;
      const far = Math.hypot(x - r.x0, y - r.y0) > 10;
      const p1 = far ? this.pickGround(x, y, this._v) : null;
      if (far && r.p0 && p1 && this.selected.size) this.issueFacing(r.p0, p1, r.ctrl);
      else this.issueOrder(r.x0, r.y0, r.ctrl);
      return;
    }
    if (button !== 0 || !this.drag) return;
    const d = this.drag;
    this.drag = null;
    this.boxEl.hidden = true;
    if (!this.active) return;
    if (Math.abs(x - d.x0) < 6 && Math.abs(y - d.y0) < 6) this.clickSelect(x, y, d.shift);
    else this.boxSelect(Math.min(x, d.x0), Math.min(y, d.y0), Math.max(x, d.x0), Math.max(y, d.y0), d.shift);
  }

  onKey({ code, shift }) {
    if (!this.active) return;
    if (this.targeting) {
      if (code === 'Escape') { this.cancelTargeting(); this.escConsumed = true; }
      else if (keys.is(code, 'turnLeft')) this.targeting.yaw = (this.targeting.yaw ?? this.targeting.autoYaw ?? 0) + Math.PI / 12;
      else if (keys.is(code, 'turnRight')) this.targeting.yaw = (this.targeting.yaw ?? this.targeting.autoYaw ?? 0) - Math.PI / 12;
      return;
    }
    if (keys.is(code, 'hold')) this.runCommand('hold');
    else if (keys.is(code, 'withdraw')) this.runCommand('withdraw');
    else if (keys.is(code, 'sandbags')) this.runCommand('build:sandbags');
    else if (keys.is(code, 'trench')) this.runCommand('build:trench');
    else if (keys.is(code, 'wire')) this.runCommand('build:wire');
    else if (keys.is(code, 'mines')) this.runCommand('build:mines');
    else if (keys.is(code, 'heli')) this.runCommand('air');
    else if (keys.is(code, 'jet')) this.runCommand('air:jet');
    else if (keys.is(code, 'lift')) this.runCommand('air:lift');
    else if (keys.is(code, 'gas')) this.runCommand('gas');
    else if (keys.is(code, 'cancelJob')) this.runCommand('cancelJob');
    else if (keys.is(code, 'smoke')) this.runCommand('smoke');
    else if (keys.is(code, 'unload')) this.runCommand('unload');
    else if (keys.is(code, 'engineer')) this.runCommand('engineer');
    else if (keys.is(code, 'flare')) this.runCommand('flare');
    else if (keys.is(code, 'reinforce')) this.game.bus.emit('ui:reinforcements');
    else if (keys.is(code, 'leave')) this.runCommand('leave');
    else if (keys.is(code, 'selectAll')) this.runCommand('selectAll');
    else if (code.startsWith('Digit')) {
      const stack = this.playerStacks()[Number(code.slice(5)) - 1];
      if (!stack) return;
      if (!shift) this.selected.clear();
      this.selected.add(stack);
      this.emitSelection();
    }
  }

  runCommand(cmd) {
    if (cmd === 'selectAll') {
      this.selected = new Set(this.playerStacks());
      this.emitSelection();
    } else if (cmd === 'hold') {
      if (!this.selected.size) return this.game.bus.emit('toast', 'Select a stack first');
      this.game.orders.issue({ t: 'hold', s: ids(this.selected) });
      for (const s of this.selected) this.addMarker(s.centroid, 'hold');
      this.game.bus.emit('order', { kind: 'hold' });
    } else if (cmd === 'control') {
      this.game.toggleView();
    } else if (cmd.startsWith('build:')) {
      const sel = [...this.selected].filter((st) => st.alive);
      const dozer = sel.length === 1 && sel[0].stats.dozer;
      if (dozer) return this.startTargeting({ kind: 'build', structure: 'revetment', stack: sel[0] }); // its blade digs one thing (T)
      const builders = sel.filter((st) => st.usesCover);
      if (builders.length !== 1) return this.game.bus.emit('toast', 'Select one infantry stack to build with');
      this.startTargeting({ kind: 'build', structure: cmd.slice(6), stack: builders[0] });
    } else if (cmd === 'leave') {
      const inside = [...this.selected].filter((s) => s.alive && s.garrison);
      if (!inside.length) return this.game.bus.emit('toast', 'Select a stack inside a building');
      this.game.orders.issue({ t: 'leave', s: ids(inside) });
      this.game.bus.emit('order', { kind: 'move' });
    } else if (cmd === 'flare') {
      if (!this.game.conditions?.night) return this.game.bus.emit('toast', 'Illumination rounds are for night battles');
      const mortars = [...this.selected].filter((s) => s.alive && s.flareRounds > 0);
      if (!mortars.length) return this.game.bus.emit('toast', 'Select a mortar team with illumination rounds');
      this.startTargeting({ kind: 'smoke', stacks: mortars, flare: true });
    } else if (cmd === 'withdraw') {
      const sel = [...this.selected].filter((s) => s.alive && !s.stats.structure && s.type.id !== 'crew');
      if (!sel.length) return this.game.bus.emit('toast', 'Select the stacks to send back');
      this.game.orders.issue({ t: 'withdraw', s: ids(sel) });
      this.select([]);
      this.game.bus.emit('order', { kind: 'move' });
    } else if (cmd === 'cancelJob') {
      const sel = [...this.selected].filter((s) => s.alive);
      if (!sel.length) return this.game.bus.emit('toast', 'Select the stack whose order to cancel');
      this.game.orders.issue({ t: 'cancelBuild', s: ids(sel) });
      this.game.bus.emit('order', { kind: 'cancel' });
    } else if (cmd === 'bridge') {
      const layers = [...this.selected].filter((st) => st.alive && st.stats.bridgeLayer && !st.units[0].dropped);
      if (!layers.length) return this.game.bus.emit('toast', 'Select a bridge layer that still carries its bridge');
      this.startTargeting({ kind: 'engineer', stack: layers[0], layer: true });
    } else if (cmd === 'engineer') {
      const lc = [...this.selected].find((st) => st.alive && st.stats.lineCharge && (st.units[0].lineCharges ?? st.stats.lineCharge.count) > 0);
      if (lc) return this.startTargeting({ kind: 'engineer', stack: lc, lineCharge: true }); // X: the line charge
      const eng = [...this.selected].filter((st) => st.alive && st.stats.engineer);
      if (!eng.length && [...this.selected].some((st) => st.stats.bridgeLayer)) return this.runCommand('bridge'); // X for both
      if (eng.length !== 1) return this.game.bus.emit('toast', 'Select one engineer stack');
      this.startTargeting({ kind: 'engineer', stack: eng[0] });
    } else if (cmd === 'unload') {
      const carriers = [...this.selected].filter((s) => this.game.transport.canUnload(s));
      if (!carriers.length) return this.game.bus.emit('toast', 'Select loaded IFVs to unload');
      const squads = this.game.orders.issue({ t: 'unload', s: ids(carriers) }) ?? [];
      for (const sq of squads) this.selected.add(sq);
      this.emitSelection();
    } else if (cmd === 'smoke') {
      const sel = [...this.selected].filter((s) => s.alive);
      const vehicles = sel.filter((s) => s.smokeLeft > 0);
      const mortars = sel.filter((s) => s.smokeRounds > 0);
      if (mortars.length) return this.startTargeting({ kind: 'smoke', stacks: mortars });
      if (!vehicles.length) return this.game.bus.emit('toast', 'Select vehicles with smoke launchers, or a mortar team');
      this.game.orders.issue({ t: 'popSmoke', s: ids(vehicles) });
    } else if (cmd === 'air' || cmd.startsWith('air:')) {
      const air = cmd.slice(4) || 'heli';
      if (!this.game.air.ready(this.faction, air)) {
        return this.game.bus.emit('toast', `${KINDS[air].aircraft[this.faction].name} not ready (${Math.ceil(this.game.air.cooldownLeft(this.faction, air))} s)`);
      }
      this.startTargeting({ kind: 'air', air, yaw: null }); // null: run in from our base until Q/E turn it
    } else if (cmd === 'gas') {
      if (this.game.air.limit[this.faction] === 0) return this.game.bus.emit('toast', 'No support in this battle');
      if (!this.game.gas.ready(this.faction)) return this.game.bus.emit('toast', `Gas not ready (${Math.ceil(this.game.gas.cooldownLeft(this.faction))} s)`);
      this.startTargeting({ kind: 'smoke', gas: true });
    }
  }

  // ---------------------------------------------------------------- targeting mode

  startTargeting(t) {
    this.cancelTargeting();
    const scene = this.game.scene;
    // the hint chip at the bottom (ui/HUD.js) says what to do, in finger or mouse words
    const touch = this.game.input.touch;
    const click = touch ? 'tap' : 'click';
    const cancel = touch ? 'Cancel stops' : 'right-click cancels';
    const turn = (what) => (touch ? `the arrows turn ${what}` : `${keyOf('turnLeft')}/${keyOf('turnRight')} turn ${what}`);
    if (t.kind === 'build') {
      const def = STRUCTURES[t.structure];
      const ghost = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0x8fe9ff, transparent: true, opacity: 0.35, depthWrite: false });
      ghost.add(new THREE.Mesh(new THREE.BoxGeometry(def.length, 0.8, def.width), mat));
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 4), mat);
      arrow.rotation.x = Math.PI / 2; // points to the front (enemy side)
      arrow.position.set(0, 0.2, def.width / 2 + 0.8);
      ghost.add(arrow);
      t.ghost = ghost;
      // face the enemy by default
      const base = this.game.world.bases[this.enemy];
      t.yaw = base ? Math.atan2(base.x - t.stack.centroid.x, base.z - t.stack.centroid.z) : 0;
      t.hint = `${def.name} (${def.cost} CP): ${click} to place — ${turn('it')}, ${cancel}`;
    } else if (t.kind === 'engineer') {
      const geo = new THREE.RingGeometry(0.9, 1, 48);
      geo.rotateX(-Math.PI / 2);
      t.decal = new GroundDecal(geo, new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false }), this.game.terrain, 0.3);
      t.ghost = t.decal.mesh;
      if (t.layer) { // a blueprint of the bridge itself, the way works are placed
        const river = this.game.world.river;
        t.ghost = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.4, river ? river.spanLength : 30),
          new THREE.MeshBasicMaterial({ color: 0x8fe9ff, transparent: true, opacity: 0.35, depthWrite: false }));
      }
      t.hint = t.lineCharge ? `Line charge: ${click} where the lane should end (25–${t.stack.stats.lineCharge.range} m) — ${cancel}`
        : t.layer ? `Bridge layer: ${click} the river where the bridge should go — ${cancel}`
        : `Engineers: ${click} mines or wire to clear them${this.game.map.bridgeAt ? ', or a bridge to blow it' : ''} — ${cancel}`;
    } else if (t.kind === 'smoke') {
      const geo = new THREE.RingGeometry(0.92, 1, 48);
      geo.rotateX(-Math.PI / 2);
      t.decal = new GroundDecal(geo, new THREE.MeshBasicMaterial({ color: 0xe8e6e0, transparent: true, opacity: 0.7, depthWrite: false }), this.game.terrain, 0.3);
      t.ghost = t.decal.mesh;
      if (t.gas) t.decal.mesh.material.color.set(0xd8d27a);
      t.hint = t.gas ? `Gas (${GAS.cost} CP): ${click} where the shells should fall — ${cancel}`
        : t.flare ? `Illumination: ${click} where to light up — ${cancel}` : `Smoke: ${click} where to lay the screen — ${cancel}`;
    } else {
      // the strafe line the gun will walk, with an arrowhead showing the direction of the run;
      // an air assault: the landing zone, with the arrow it comes in along
      const p = KINDS[t.air];
      const shape = new THREE.Shape();
      const L = (p.runLength || 30) / 2;
      shape.moveTo(-1.5, -L); shape.lineTo(1.5, -L); shape.lineTo(1.5, L - 6); shape.lineTo(5, L - 6);
      shape.lineTo(0, L + 3); shape.lineTo(-5, L - 6); shape.lineTo(-1.5, L - 6); shape.closePath();
      if (t.air === 'lift') {
        const hole = new THREE.Path();
        hole.absarc(0, L + 12, 6.5, 0, Math.PI * 2, true);
        shape.moveTo(0, L + 20);
        shape.absarc(0, L + 12, 8, 0, Math.PI * 2, false);
        shape.holes.push(hole);
      }
      const geo = new THREE.ShapeGeometry(shape);
      if (t.air === 'lift') geo.translate(0, -(L + 12), 0); // the ring sits on the clicked spot
      geo.rotateX(Math.PI / 2);
      t.decal = new GroundDecal(geo, new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xff6a3d).multiplyScalar(1.6), transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
      }), this.game.terrain, 0.3);
      t.ghost = t.decal.mesh;
      t.hint = t.air === 'lift'
        ? `Air assault (${p.cost} CP): ${click} the landing zone — ${turn('the approach')}, ${cancel}`
        : `${p.label} (${p.cost} CP): ${click} the target — ${turn('the run')}, ${cancel}`;
    }
    scene.add(t.ghost);
    if (touch) { // on a touch screen: tap where it goes (it stays there while you pan or turn it), then Place
      t.ghost.visible = false;
      const turns = t.kind === 'build' || t.kind === 'air';
      t.hint = `${t.hint.split(':')[0]}: tap where it goes${turns ? ', the arrows turn it' : ''}, then Place — ${cancel}`;
    }
    this.targeting = t;
  }

  /** Touch: put the blueprint at the tapped point (it stays there until the next tap or Place). */
  pinTargeting(x, y) {
    const t = this.targeting;
    const p = t && this.pickGround(x, y, this._p);
    if (!p) return;
    t.pin = p.clone();
    t.ghost.visible = true;
    this.updateTargeting();
  }

  /** Touch: the Place button — confirm the blueprint where it was put. */
  confirmPinned() {
    const t = this.targeting;
    if (t?.pin) this.confirmTargeting(0, 0, t.pin);
  }

  cancelTargeting() {
    const t = this.targeting;
    if (!t) return;
    t.ghost.removeFromParent();
    this.targeting = null;
  }

  confirmTargeting(x, y, at = null) {
    const t = this.targeting;
    const p = at ? this._p.copy(at) : this.pickGround(x, y, this._p);
    if (!p) return;
    if (t.kind === 'build') {
      if (!t.stack.alive) return this.cancelTargeting();
      this.game.orders.issue({ t: 'build', s: t.stack.id, k: t.structure, x: p.x, z: p.z, yaw: t.yaw });
      this.game.bus.emit('order', { kind: 'build' });
    } else if (t.kind === 'engineer') {
      if (!t.stack.alive) return this.cancelTargeting();
      if (t.lineCharge) {
        this.game.orders.issue({ t: 'lineCharge', s: t.stack.id, x: p.x, z: p.z });
        this.addMarker(p, 'attack');
        this.game.bus.emit('order', { kind: 'build' });
        return this.cancelTargeting();
      }
      if (t.layer) {
        this.game.orders.issue({ t: 'build', s: t.stack.id, k: 'span', x: p.x, z: p.z, yaw: 0 });
        this.addMarker(p, 'hold');
        this.game.bus.emit('order', { kind: 'build' });
        return this.cancelTargeting();
      }
      const bridge = this.game.map.bridgeAt?.(p.x, p.z);
      const at = bridge && !bridge.blown ? bridge : p;
      this.game.orders.issue({ t: 'build', s: t.stack.id, k: bridge && !bridge.blown ? 'demolish' : 'clear', x: at.x, z: at.z, yaw: 0 });
      this.addMarker(at, 'attack');
      this.game.bus.emit('order', { kind: 'build' });
    } else if (t.kind === 'smoke' && t.gas) {
      if (this.game.orders.issue({ t: 'gas', x: p.x, z: p.z }) === false) return;
      this.addMarker(p, 'attack');
    } else if (t.kind === 'smoke') {
      this.game.orders.issue({ t: t.flare ? 'flare' : 'smoke', s: ids(t.stacks), x: p.x, z: p.z });
      this.addMarker(p, 'hold');
    } else if (this.game.orders.issue({ t: 'air', x: p.x, z: p.z, yaw: t.yaw ?? this.game.air.defaultYaw(this.faction, p.x, p.z), k: t.air }) === false) {
      return;
    } else {
      this.addMarker(p, 'attack');
    }
    this.cancelTargeting();
  }

  updateTargeting() {
    const t = this.targeting;
    if (!t) return;
    if (!this.active) return this.cancelTargeting();
    const m = this.game.input.mouse;
    // a finger is not a cursor: on touch the blueprint stays where it was tapped
    const p = this.game.input.touch ? (t.pin ? this._p.copy(t.pin) : null) : this.pickGround(m.x, m.y, this._p);
    if (!p) return;
    if (t.kind === 'build') {
      t.ghost.position.set(p.x, p.y + 0.4, p.z);
      t.ghost.rotation.y = t.yaw;
    } else {
      if (t.kind === 'smoke') return t.decal.place(p.x, p.z, 10);
      if (t.kind === 'engineer' && t.layer) {
        const river = this.game.world.river;
        if (!river) return;
        const z = river.path(p.x, p.z);
        const ch = river.channelAt(p.x, p.z);
        const ok = Math.abs(p.z - z) <= river.halfWidth + 25 && !river.crossings.some((c) => !c.blown && c.channel === ch && Math.abs(c.x - p.x) < 14);
        t.ghost.position.set(p.x, river.deck + 0.2, z);
        t.ghost.material.color.set(ok ? 0x8fe9ff : 0xff6a55);
        return;
      }
      if (t.kind === 'engineer') {
        const bridge = this.game.map.bridgeAt?.(p.x, p.z);
        return bridge && !bridge.blown ? t.decal.place(bridge.x, bridge.z, 7) : t.decal.place(p.x, p.z, 9);
      }
      t.autoYaw = this.game.air.defaultYaw(this.faction, p.x, p.z);
      t.decal.place(p.x, p.z, 1, t.yaw ?? t.autoYaw);
    }
  }

  // ---------------------------------------------------------------- selection

  /**
   * The stack of `faction` under a click at screen (x, y): its label, or the man (or vehicle)
   * drawn nearest the cursor within a few pixels, so a squad far out or zoomed away is as easy
   * to hit as a tank; failing both, the old ground test.
   */
  stackAt(x, y, faction, ok = () => true) {
    const labels = this.game.labels?.items;
    if (labels) {
      for (const [s, item] of labels) {
        if (s.faction !== faction || !s.alive || s.visible === false || !ok(s) || item.el.hidden || item.el.style.display === 'none') continue;
        const r = item.el.getBoundingClientRect();
        if (r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return s;
      }
    }
    const rect = this.game.canvas.getBoundingClientRect();
    const reach = this.game.input.touch ? 34 : 20;
    let best = null;
    let bestD = reach * reach;
    for (const s of this.game.world.stacksOf(faction)) {
      if (s.visible === false || !ok(s)) continue;
      for (const u of s.units) {
        if (!u.alive || u.visible === false) continue;
        const v = this._v.set(u.pos.x, u.pos.y + 0.9, u.pos.z).project(this.game.camera);
        if (v.z > 1) continue;
        const d = (rect.left + (v.x * 0.5 + 0.5) * rect.width - x) ** 2 + (rect.top + (-v.y * 0.5 + 0.5) * rect.height - y) ** 2;
        if (d < bestD) { bestD = d; best = s; }
      }
    }
    if (best) return best;
    const p = this.pickGround(x, y, this._p);
    const near = p ? this.stackNear(p, faction) : null;
    return near && ok(near) ? near : null;
  }

  clickSelect(x, y, shift) {
    const stack = this.stackAt(x, y, this.faction, (s) => this.game.mine(s) && !s.stats.structure && !s.autonomous);
    if (!shift) this.selected.clear();
    if (stack) {
      if (shift && this.selected.has(stack)) this.selected.delete(stack);
      else this.selected.add(stack);
      // double-click: take control
      const now = performance.now();
      if (this.lastClick?.stack === stack && now - this.lastClick.time < 350) {
        this.lastClick = null;
        this.game.bus.emit('ui:possess', stack);
        return;
      }
      this.lastClick = { stack, time: now };
    }
    this.emitSelection();
  }

  boxSelect(x0, y0, x1, y1, shift) {
    if (!shift) this.selected.clear();
    const rect = this.game.canvas.getBoundingClientRect();
    for (const s of this.playerStacks()) {
      const v = this._v.copy(s.centroid).project(this.game.camera);
      if (v.z > 1) continue;
      const sx = rect.left + (v.x * 0.5 + 0.5) * rect.width;
      const sy = rect.top + (-v.y * 0.5 + 0.5) * rect.height;
      if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) this.selected.add(s);
    }
    this.emitSelection();
  }

  emitSelection() {
    this.game.bus.emit('selection', [...this.selected]);
  }

  // ---------------------------------------------------------------- orders

  issueOrder(x, y, hold) {
    if (!this.selected.size) return this.game.bus.emit('toast', 'Select a stack first');
    const target = this.stackAt(x, y, this.enemy);
    const p = this.pickGround(x, y, this._p);
    if (!p) return;
    // right-click your own IFVs with infantry selected: climb in
    const own = target ? null : this.stackNear(p, this.faction, 3.5);
    if (own?.stats.carries) {
      const squads = [...this.selected].filter((s) => s.usesCover && s !== own);
      if (squads.length) {
        this.game.bus.emit('order', { kind: 'move' });
        this.game.orders.issue({ t: 'board', s: squads[0].id, c: own.id });
        return;
      }
    }
    // right-click a house with infantry selected: garrison it
    const building = target ? null : this.game.buildings.at(p.x, p.z, 0.5);
    if (building) {
      const squads = [...this.selected].filter((s) => s.usesCover);
      if (squads.length) {
        this.game.orders.issue({ t: 'garrison', s: ids(squads), b: building.index });
        const others = [...this.selected].filter((s) => !s.usesCover);
        if (others.length) this.moveGroup(others, p, { hold });
        this.game.bus.emit('order', { kind: 'hold' });
        this.addMarker({ x: building.x, z: building.z }, 'hold');
        return;
      }
    }
    this.game.bus.emit('order', { kind: target ? 'attack' : hold ? 'hold' : 'move' });
    if (target) {
      this.game.orders.issue({ t: 'attack', s: ids(this.selected), target: target.id });
      this.addMarker(target.centroid, 'attack');
      return;
    }
    this.moveGroup([...this.selected], p, { hold });
    this.addMarker(p, hold ? 'hold' : 'move');
  }

  /** Right-drag: move the selection to `p0` and hold there facing toward `p1`. */
  issueFacing(p0, p1) {
    const stacks = [...this.selected].filter((s) => s.alive);
    if (!stacks.length) return;
    const yaw = Math.atan2(p1.x - p0.x, p1.z - p0.z);
    // dragged from a house with infantry selected: garrison it, manning the windows that way
    const building = this.game.buildings.at(p0.x, p0.z, 0.5);
    const squads = stacks.filter((s) => s.usesCover);
    if (building && squads.length) {
      this.game.orders.issue({ t: 'garrison', s: ids(squads), b: building.index, face: Math.round(yaw * 1000) / 1000 });
      this.addMarker({ x: building.x, z: building.z }, 'hold');
      this.game.bus.emit('order', { kind: 'hold' });
      return;
    }
    const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    // a squad dragged right next to itself only turns round
    const one = stacks.length === 1 ? stacks[0] : null;
    const dest = one && Math.hypot(one.centroid.x - p0.x, one.centroid.z - p0.z) < one.footprint + 3 ? one.centroid.clone() : p0;
    this.moveGroup(stacks, dest, { hold: true, facing: dir, face: yaw });
    this.addMarker(dest, 'hold');
    this.game.bus.emit('order', { kind: 'hold' });
  }

  /** The arrow shown while right-dragging: from the press point toward the cursor. */
  showFacingArrow(p0, p1) {
    if (!this.arrow) {
      const shape = new THREE.Shape();
      shape.moveTo(-0.12, 0); shape.lineTo(0.12, 0); shape.lineTo(0.12, 0.6); shape.lineTo(0.35, 0.6); // a slim shaft,
      shape.lineTo(0, 1); shape.lineTo(-0.35, 0.6); shape.lineTo(-0.12, 0.6); shape.closePath();          // then the head
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(Math.PI / 2); // flat, pointing along +z
      this.arrow = new GroundDecal(geo, new THREE.MeshBasicMaterial({
        color: new THREE.Color(MARKER_COLORS.hold).multiplyScalar(1.5), transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
      }), this.game.terrain, 0.3);
      this.game.scene.add(this.arrow.mesh);
    }
    this.arrow.mesh.visible = true;
    this.arrow.place(p0.x, p0.z, ARROW_SIZE, Math.atan2(p1.x - p0.x, p1.z - p0.z)); // only the direction counts: one size however far you drag
  }

  hideFacingArrow() {
    if (this.arrow) this.arrow.mesh.visible = false;
  }

  /**
   * Spread a group around `point`: frontline stacks in a row at the point, the rest in a row
   * behind them. Rows run perpendicular to `facing` (default: from the group toward the point).
   * `face` (yaw): they hold there looking that way.
   */
  moveGroup(stacks, point, { hold = false, facing = null, face = null } = {}) {
    if (!stacks.length) return;
    const moves = this.groupDests(stacks, point, facing).map(([s, x, z]) => [s.id, x, z]);
    this.game.orders.issue(face === null ? { t: 'move', m: moves, hold } : { t: 'move', m: moves, hold: true, face: Math.round(face * 1000) / 1000 });
  }

  /** Where each of `stacks` goes when sent to `point` together: [[stack, x, z]], side by side. */
  groupDests(stacks, point, facing = null) {
    const dir = new THREE.Vector3();
    if (facing) dir.copy(facing);
    else {
      for (const s of stacks) dir.add(s.centroid);
      dir.divideScalar(stacks.length).subVectors(point, dir);
    }
    dir.y = 0;
    if (dir.lengthSq() < 1) dir.set(0, 0, -1);
    dir.normalize();
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);

    const front = stacks.filter((s) => s.type.role === 'frontline');
    const back = stacks.filter((s) => s.type.role !== 'frontline');
    const rows = front.length && back.length ? [[front, 0], [back, -14]] : [[stacks, 0]];

    const moves = [];
    for (const [row, depth] of rows) {
      row.sort((a, b) => perp.dot(a.centroid) - perp.dot(b.centroid)); // keep left/right order, no crossing
      const widths = row.map((s) => s.footprint * 2 + 2);
      let cursor = -widths.reduce((a, b) => a + b, 0) / 2;
      row.forEach((s, i) => {
        const off = cursor + widths[i] / 2;
        cursor += widths[i];
        const dest = point.clone().addScaledVector(perp, off).addScaledVector(dir, depth);
        moves.push([s, Math.round(dest.x * 100) / 100, Math.round(dest.z * 100) / 100]);
      });
    }
    return moves;
  }

  // ---------------------------------------------------------------- cover preview

  /**
   * Markers over the view where the men will lie, each with a tick toward the cover that shields
   * it. Drawn as page elements, not in the 3D scene, so walls and roofs never hide them and they
   * stay the same size at any zoom.
   */
  buildPreview() {
    const root = document.createElement('div');
    root.id = 'cover-preview';
    (document.getElementById('labels') ?? document.body).append(root);
    return { root, els: [], spots: [], key: '', at: 0, v: new THREE.Vector3(), w: new THREE.Vector3() };
  }

  /**
   * While you aim a move with infantry selected — hovering the ground, or dragging out the
   * facing (right-drag, or hold-and-drag on touch) — show the cover each man would take there
   * (world/CoverPlan.js, the plan the order then follows; onto a house, the windows its men
   * would man). Nothing near any cover: nothing shown.
   */
  updatePreview() {
    const pv = this.preview;
    const hide = () => { pv.spots = []; pv.key = ''; this.drawPreview(); };
    const inf = [...this.selected].filter((s) => s.alive && s.usesCover && this.game.mine(s));
    const dug = this.game.construction.revetments?.length && [...this.selected].some((s) => s.alive && !s.usesCover && this.game.mine(s)); // vehicles: dug-in positions to show
    if (!this.active || this.targeting || this.drag || (!inf.length && !dug)) return hide();
    const m = this.game.input.mouse;
    let point = null;
    let face = null;
    if (this.rdrag?.p0) {
      point = this.rdrag.p0;
      const far = Math.hypot(m.x - this.rdrag.x0, m.y - this.rdrag.y0) > 10 ? this.pickGround(m.x, m.y, this._v) : null;
      if (far) face = Math.atan2(far.x - point.x, far.z - point.z);
    } else if (!this.game.input.touch && m.inside && !m.buttons.size) {
      point = this.pickGround(m.x, m.y, this._p);
      if (point && this.stackAt(m.x, m.y, this.enemy)) point = null; // that click would be an attack
    }
    if (!point) return hide();
    const key = `${Math.round(point.x * 2)},${Math.round(point.z * 2)},${face === null ? '-' : Math.round(face * 20)},${inf.map((s) => s.id).join(',')}`;
    const now = performance.now();
    if (key !== pv.key && now - pv.at >= 80) {
      pv.key = key;
      pv.at = now;
      const dir = face === null ? null : new THREE.Vector3(Math.sin(face), 0, Math.cos(face));
      const all = [...this.selected].filter((s) => s.alive);
      // onto a house: the windows the squads would man (Buildings.pickWindows)
      const building = this.game.buildings.at(point.x, point.z, 0.5);
      const men = inf.reduce((a, s) => a + s.units.filter((u) => u.alive).length, 0);
      pv.spots = building
        ? this.game.buildings.pickWindows(building, men, face, this.faction)
        : this.groupDests(all, point, dir).flatMap(([s, x, z]) => [...((s.usesCover ? planCover(this.game.world, s, { x, z }, face) : this.game.construction.planRevetments(s, { x, z }))?.values() ?? [])]);
    }
    this.drawPreview();
  }

  /** Place the markers for pv.spots on screen (every frame: the camera moves). */
  drawPreview() {
    const pv = this.preview;
    const terrain = this.game.terrain;
    const cam = this.game.camera;
    const rect = this.game.canvas.getBoundingClientRect();
    const screen = (v) => [rect.left + (v.x * 0.5 + 0.5) * rect.width, rect.top + (-v.y * 0.5 + 0.5) * rect.height];
    let n = 0;
    for (const spot of pv.spots) {
      const y = terrain.heightAt(spot.x, spot.z) + 0.3;
      const v = pv.v.set(spot.x, y, spot.z).project(cam);
      if (v.z > 1) continue;
      const [x0, y0] = screen(v);
      const [x1, y1] = screen(pv.w.set(spot.x + (spot.dirX ?? 0) * 1.2, y, spot.z + (spot.dirZ ?? 1) * 1.2).project(cam));
      let el = pv.els[n];
      if (!el) {
        el = document.createElement('i');
        pv.root.append(el);
        pv.els.push(el);
      }
      el.hidden = false;
      el.style.transform = `translate(${x0.toFixed(1)}px, ${y0.toFixed(1)}px) rotate(${Math.atan2(y1 - y0, x1 - x0).toFixed(3)}rad)`;
      n++;
    }
    for (let i = n; i < pv.els.length; i++) pv.els[i].hidden = true;
  }

  addMarker(point, kind) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(MARKER_COLORS[kind]).multiplyScalar(1.6), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const decal = new GroundDecal(this.ringGeo, mat, this.game.terrain, 0.2);
    decal.place(point.x, point.z);
    this.game.scene.add(decal.mesh);
    this.markers.push({ decal, x: point.x, z: point.z, t: 0 });
  }

  // ---------------------------------------------------------------- per frame

  update(dt) {
    this.updateTargeting();
    this.updatePreview();
    // right-drag: show which way they'll face
    if (this.rdrag?.p0 && this.active) {
      const m = this.game.input.mouse;
      const p = Math.hypot(m.x - this.rdrag.x0, m.y - this.rdrag.y0) > 10 ? this.pickGround(m.x, m.y, this._v) : null;
      if (p && this.selected.size) this.showFacingArrow(this.rdrag.p0, p); else this.hideFacingArrow();
    }
    // Drag box
    if (this.drag && this.active) {
      const m = this.game.input.mouse;
      const x0 = Math.min(m.x, this.drag.x0);
      const y0 = Math.min(m.y, this.drag.y0);
      const w = Math.abs(m.x - this.drag.x0);
      const h = Math.abs(m.y - this.drag.y0);
      this.boxEl.hidden = w < 6 && h < 6;
      Object.assign(this.boxEl.style, { left: `${x0}px`, top: `${y0}px`, width: `${w}px`, height: `${h}px` });
    }

    // Selection rings under selected stacks
    for (const s of this.game.world.stacks) {
      if (s.faction !== this.faction) continue;
      let ring = this.rings.get(s);
      const show = s.alive && this.selected.has(s);
      if (!ring) {
        if (!show) continue;
        ring = new GroundDecal(this.ringGeo, this.ringMat, this.game.terrain, 0.2);
        this.game.scene.add(ring.mesh);
        this.rings.set(s, ring);
      }
      ring.mesh.visible = show;
      if (show) ring.place(s.centroid.x, s.centroid.z, s.footprint + 0.8);
    }

    // Order markers expand and fade
    for (let i = this.markers.length - 1; i >= 0; i--) {
      const mk = this.markers[i];
      mk.t += dt;
      const p = mk.t / 0.7;
      const mesh = mk.decal.mesh;
      if (p >= 1) {
        mesh.removeFromParent();
        mesh.geometry.dispose();
        mesh.material.dispose();
        this.markers.splice(i, 1);
        continue;
      }
      mk.decal.place(mk.x, mk.z, 1 + p * 2.5);
      mesh.material.opacity = 1 - p;
    }
  }
}
