// What a stack can reach and what it watches, drawn on the ground for the stacks you're
// looking at — the selected ones in the command view, the one you lead in direct control:
//   • a faint white ring at its longest weapon reach (mortars and guns: their indirect range,
//     IFVs: the missile), centred on the squad
//   • a pale fan of its view cone out to sight range, facing where it looks (the squad's
//     facing, a vehicle's turret)
// What the whole side sees right now is the fog of war (render/FogOfWar.js); this is the one
// stack's reach.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GroundDecal } from '../world/GroundDecal.js';
import { CameraMode } from '../core/CameraManager.js';

const MAX_SHOWN = 10;
const BAND = 0.2;            // half-width of the drawn lines, metres

const mat = (color, opacity) => new THREE.MeshBasicMaterial({
  color, transparent: true, opacity, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
});
const RING = mat(0xffffff, 0.2);
const FAN = mat(0xcfe6ff, 0.035);
const EDGE = mat(0xcfe6ff, 0.22);

/** The farthest anything in the stack can hit. */
export function weaponReach(stack) {
  let r = 0;
  for (let i = 0; i < stack.units.length; i++) {
    const s = stack.unitStats(i);
    r = Math.max(r, s.range ?? 0, s.gunRange ?? 0, s.atgm?.range ?? 0);
  }
  return r;
}

/** Flat on XZ; theta 0 points along +z (yaw 0), as GroundDecal.place rotates. */
const flat = (g) => g.rotateX(-Math.PI / 2).rotateY(-Math.PI / 2);

function ringGeometry(r) {
  return flat(new THREE.RingGeometry(r - BAND, r + BAND, Math.min(256, Math.max(64, Math.round(r * 1.4))), 1));
}

function fanGeometry(r, fov) {
  return flat(new THREE.RingGeometry(1, r, Math.max(16, Math.round(fov * r * 0.4)), 14, -fov / 2, fov));
}

function edgeGeometry(r, fov) {
  const arc = new THREE.RingGeometry(r - BAND, r + BAND, Math.max(16, Math.round(fov * r * 0.4)), 1, -fov / 2, fov);
  const sides = [-fov / 2, fov / 2].map((a) => {
    const g = new THREE.PlaneGeometry(BAND * 2, r - 1, 1, 18);
    g.translate(0, (r + 1) / 2, 0);  // along +y from the centre…
    g.rotateZ(a - Math.PI / 2);      // …turned to the cone's edge (same frame as the ring's theta)
    return g;
  });
  return flat(mergeGeometries([arc, ...sides]));
}

export class RangeIndicators {
  constructor(game) {
    this.game = game;
    this.items = new Map(); // stack → { ring, fan, edge, reach, sight, fov, x, z, yaw }
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
      const lead = s.units.find((u) => u.alive);
      const yaw = s.usesCover ? (s.leader?.yaw ?? s.facing) : (lead?.turretYaw ?? s.facing);
      const { x, z } = s.centroid;
      if (Math.abs(x - item.x) + Math.abs(z - item.z) > 0.3) {
        item.ring.place(x, z);
        item.x = x;
        item.z = z;
        item.yaw = null; // the fan moved too
      }
      if (item.yaw === null || Math.abs(yaw - item.yaw) > 0.02) {
        item.fan.place(x, z, 1, yaw);
        item.edge.place(x, z, 1, yaw);
        item.yaw = yaw;
      }
    }
  }

  create(s) {
    const g = this.game;
    const st = s.stats;
    const reach = weaponReach(s);
    const sight = (st.sight ?? 100) * (st.binoculars ? 1.25 : 1);
    const fov = st.fov ?? 2.1;
    const item = {
      ring: new GroundDecal(ringGeometry(reach), RING, g.terrain, 0.25),
      fan: new GroundDecal(fanGeometry(sight, fov), FAN, g.terrain, 0.2),
      edge: new GroundDecal(edgeGeometry(sight, fov), EDGE, g.terrain, 0.22),
      x: Infinity, z: Infinity, yaw: null,
    };
    for (const d of [item.ring, item.fan, item.edge]) g.scene.add(d.mesh);
    this.items.set(s, item);
    return item;
  }

  remove(s, item) {
    for (const d of [item.ring, item.fan, item.edge]) {
      d.mesh.removeFromParent();
      d.geometry.dispose();
    }
    this.items.delete(s);
  }
}
