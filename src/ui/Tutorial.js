// The boot camp card (modes/bootcamp.js): the current step's title, what to do, and its tasks,
// ticked off as they are done; when all are, the next step follows after a moment. "Show me"
// swings the command camera to what the step is about; Skip moves on. After the chapter's last
// step a closing card offers the next chapter, or the way back to the menu. Gold ground rings
// (marker()) show where to go.
import * as THREE from 'three';
import { GroundDecal } from '../world/GroundDecal.js';
import { toMenu } from '../core/replay.js';

const NEXT_AFTER = 1.6;   // seconds the finished step stays ticked before the next one

export class Tutorial {
  /** opts: { label (the card's header), outro (closing text), onFinish(), next: { title, go() } } */
  constructor(game, steps, shared = {}, opts = {}) {
    this.game = game;
    this.steps = steps;
    this.shared = shared;
    this.opts = opts;
    this.index = -1;
    this.wait = 0;
    this.markers = [];
    const root = (this.root = document.createElement('div'));
    root.id = 'tutorial';
    root.innerHTML = `<div class="tu-head"><span class="tu-count"></span><button type="button" tabindex="-1" class="tu-skip">Skip step</button></div>
      <h3></h3><p class="tu-text"></p><ul class="tu-tasks"></ul>
      <div class="tu-foot"><button type="button" tabindex="-1" class="tu-show">Show me</button></div>`;
    document.getElementById('hud').append(root);
    document.body.classList.add('bootcamp');
    this.count = root.querySelector('.tu-count');
    this.title = root.querySelector('h3');
    this.text = root.querySelector('.tu-text');
    this.list = root.querySelector('.tu-tasks');
    this.showBtn = root.querySelector('.tu-show');
    root.querySelector('.tu-skip').addEventListener('click', (e) => { e.currentTarget.blur(); this.next(); });
    this.showBtn.addEventListener('click', (e) => { e.currentTarget.blur(); this.lookAt(this.ctx?.focus); });
    game.tutorial = this; // the first step's start() already points things out through it
    this.next();
  }

  get step() {
    return this.steps[this.index];
  }

  next() {
    if (this.step) this.step.end?.(this.game, this.ctx);
    this.index++;
    this.wait = 0;
    if (!this.step) return this.finish();
    this.ctx = { ...this.shared };
    this.step.start?.(this.game, this.ctx);
    this.count.textContent = `${this.opts.label ?? 'Boot camp'} · ${this.index + 1} / ${this.steps.length}`;
    this.title.textContent = this.step.title;
    this.touchText = null;   // update() fills in the text for mouse or fingers
    this.list.replaceChildren(...this.step.tasks.map(([label]) => Object.assign(document.createElement('li'), { textContent: label })));
    this.root.classList.remove('done');
    this.showBtn.hidden = !this.ctx.focus;
  }

  update(dt) {
    const step = this.step;
    if (!step) return;
    step.update?.(this.game, this.ctx, dt);
    const touch = document.body.classList.contains('touch');
    if (touch !== this.touchText) {
      this.touchText = touch;
      this.text.innerHTML = (touch && step.touch) || step.text;
    }
    let all = true;
    step.tasks.forEach(([, done], i) => {
      const li = this.list.children[i];
      const ok = li.classList.contains('done') || !!done(this.game, this.ctx); // a ticked task stays ticked
      li.classList.toggle('done', ok);
      if (!ok) all = false;
    });
    for (const m of this.markers) m.mat.opacity = 0.45 + Math.sin(this.game.time * 4) * 0.25;
    if (!all) return;
    if (!this.wait) {
      this.root.classList.add('done');
      this.game.audio?.play('ready', null, { volume: 0.6 });
    }
    this.wait += dt;
    if (this.wait > NEXT_AFTER) this.next();
  }

  finish() {
    this.opts.onFinish?.();
    this.count.textContent = this.opts.label ?? 'Boot camp';
    this.title.textContent = 'Chapter complete';
    this.text.innerHTML = this.opts.outro ?? 'That is the core of it.';
    this.list.replaceChildren();
    this.root.classList.add('done', 'final');
    const foot = this.root.querySelector('.tu-foot');
    const btn = (label, cls, fn) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: cls, textContent: label });
      b.addEventListener('click', fn);
      return b;
    };
    const next = this.opts.next;
    foot.replaceChildren(...[
      next && btn(`Next: ${next.title}`, 'deploy tu-next', () => next.go()),
      btn(next ? 'All chapters' : 'Back to the menu', next ? 'tu-show' : 'deploy', () => toMenu(next ? 'bootcamp' : 'battle')),
    ].filter(Boolean));
    this.root.querySelector('.tu-skip').hidden = true;
  }

  /** A pulsing gold ring on the ground at `at`; returns it with remove(). */
  marker(at, radius) {
    const geo = new THREE.RingGeometry(0.9, 1, 64);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xe0b45a, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false });
    const ring = new GroundDecal(geo, mat, this.game.terrain, 0.3);
    ring.place(at.x, at.z, radius);
    this.game.scene.add(ring.mesh);
    const m = { mat, remove: () => { ring.mesh.removeFromParent(); this.markers.splice(this.markers.indexOf(m), 1); } };
    this.markers.push(m);
    this.focus(at);
    return m;
  }

  /** What "Show me" should look at in this step (a stack or a spot). */
  focus(thing) {
    if (this.ctx) this.ctx.focus = thing;
    this.showBtn.hidden = !thing;
  }

  highlight(stack) {
    this.focus(stack);
  }

  show(thing) {
    this.focus(thing);
    this.lookAt(thing);
  }

  lookAt(thing) {
    const p = thing?.centroid ?? thing;
    if (p) this.game.cameraManager.tactical.target.set(p.x, 0, p.z);
  }
}
