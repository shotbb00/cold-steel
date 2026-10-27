// Floating soldier callouts ("Reloading!", "Man down!") that follow the speaker for a moment.
// In the action view you hear everyone near you; in the tactical view only squad-level
// calls (retreat, flank, rally) come through so the map doesn't drown in text.
import * as THREE from 'three';

const LIFETIME = 2;
const HEAR_DISTANCE = 60;
const MAX_VISIBLE = 6;

export class Barks {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('labels');
    this.items = [];
    this._v = new THREE.Vector3();
    game.bus.on('bark', (e) => this.add(e));
  }

  add({ unit, stack, text, priority }) {
    const { camera, cameraManager } = this.game;
    const tactical = cameraManager.blend > 0.5;
    if (tactical ? !priority : unit.pos.distanceTo(camera.position) > HEAR_DISTANCE) return;
    if (stack.visible === false) return; // you hear them, but you can't see who it was
    if (this.items.length >= MAX_VISIBLE) this.items.shift().el.remove();
    const el = document.createElement('div');
    el.className = `bark ${stack.faction === this.game.playerFaction ? 'ally' : 'enemy'}`;
    el.textContent = text;
    this.root.appendChild(el);
    this.items.push({ el, unit, t: 0 });
  }

  update(dt) {
    const cam = this.game.camera;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const b = this.items[i];
      b.t += dt;
      if (b.t > LIFETIME) {
        b.el.remove();
        this.items.splice(i, 1);
        continue;
      }
      const v = this._v.set(b.unit.pos.x, b.unit.pos.y + 2.5 + b.t * 0.3, b.unit.pos.z).project(cam);
      if (v.z > 1) {
        b.el.style.display = 'none';
        continue;
      }
      b.el.style.display = '';
      const x = (v.x * 0.5 + 0.5) * innerWidth;
      const y = (-v.y * 0.5 + 0.5) * innerHeight;
      b.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }
}
