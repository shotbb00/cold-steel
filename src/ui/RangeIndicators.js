// What a stack can reach, drawn on the ground for the stacks you're looking at — the selected
// ones in the command view, the one you lead in direct control: a faint white ring at the reach of
// what it fires at anything (mortars and guns: their indirect range; IFVs: the cannon), and a
// fainter one further out where an anti-tank missile reaches vehicles. Either way it only shoots
// at what your side has spotted.
// What it sees is the lit ground of the fog of war (render/FogOfWar.js).
import * as THREE from 'three';
import { GroundDecal } from '../world/GroundDecal.js';
import { CameraMode } from '../core/CameraManager.js';

const MAX_SHOWN = 10;
const BAND = 0.2;            // half-width of the drawn lines, metres

const mat = (color, opacity) => new THREE.MeshBasicMaterial({
  color, transparent: true, opacity, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
});
const RING = mat(0xffffff, 0.2);
const MISSILE_RING = mat(0xffd9a0, 0.1);

/** The farthest the stack can hit anything (its guns), and its missiles' reach against vehicles (0: none). */
export function weaponReach(stack) {
  let gun = 0;
  let missile = 0;
  for (let i = 0; i < stack.units.length; i++) {
    const s = stack.unitStats(i);
    gun = Math.max(gun, s.gunRange ?? s.range ?? 0);
    missile = Math.max(missile, s.atgm?.range ?? 0);
  }
  return { gun, missile: missile > gun + 5 ? missile : 0 };
}

/** Flat on XZ; theta 0 points along +z (yaw 0), as GroundDecal.place rotates. */
const flat = (g) => g.rotateX(-Math.PI / 2).rotateY(-Math.PI / 2);

function ringGeometry(r) {
  return flat(new THREE.RingGeometry(r - BAND, r + BAND, Math.min(256, Math.max(64, Math.round(r * 1.4))), 1));
}

export class RangeIndicators {
  constructor(game) {
    this.game = game;
    this.items = new Map(); // stack → { ring, missile?, x, z }
  }

  shown() {
    const g = this.game;
    if (g.ended) return [];
    if (g.cameraManager.mode === CameraMode.ACTION) {
      const s = g.player.unit?.stack;
      return s?.alive ? [s] : [];
    }
    return [...g.commands.selected].filter((s) => s.alive).slice(0, MAX_SHOWN);
  }

  update() {
    const show = new Set(this.shown());
    for (const [s, item] of this.items) if (!show.has(s)) this.remove(s, item);
    for (const s of show) {
      const item = this.items.get(s) ?? this.create(s);
      const { x, z } = s.centroid;
      if (Math.abs(x - item.x) + Math.abs(z - item.z) > 0.3) {
        item.ring.place(x, z);
        item.missile?.place(x, z);
        item.x = x;
        item.z = z;
      }
    }
  }

  create(s) {
    const g = this.game;
    const reach = weaponReach(s);
    const item = { ring: new GroundDecal(ringGeometry(reach.gun), RING, g.terrain, 0.25), x: Infinity, z: Infinity };
    if (reach.missile) item.missile = new GroundDecal(ringGeometry(reach.missile), MISSILE_RING, g.terrain, 0.25);
    for (const d of [item.ring, item.missile]) if (d) g.scene.add(d.mesh);
    this.items.set(s, item);
    return item;
  }

  remove(s, item) {
    for (const d of [item.ring, item.missile]) {
      if (!d) continue;
      d.mesh.removeFromParent();
      d.geometry.dispose();
    }
    this.items.delete(s);
  }
}
