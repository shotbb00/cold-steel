// The Atlantic Wall, 1944 (the coastal maps), in the same kit as the fortifications (models/fortifications.js):
//   casemate  a squat concrete gun house (an H677 for the 88: built into the bluff's foot, a wing wall
//             toward the sea so the ships can't see into it, the embrasure looking along the beach;
//             an H679 / H669 for the 155 mm battery inland, bigger, a long barrel out of the front)
//             The gun traverses only within its embrasure.
// Built as render/RigRenderer.js rigs: { root, muzzle, animate(u, dt), die(time) }.
import * as THREE from 'three';
import { P, merge, grime } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';

const CONCRETE = 0x9a968a;
const CONCRETE_DARK = 0x6e6b62;
const EARTH = 0x5a5038;
const STEEL = 0x3a3c36;
const GRASS = 0x56603a;

const cache = {};

/** `k`: its size (1 the 88's casemate, 1.5 the battery's), `len` the barrel's length. */
function casemateGeo(k, len) {
  return (cache[`${k}:${len}`] ??= (() => {
    const w = 7 * k, d = 6 * k, h = 3.4 * k;
    const base = grime(merge([
      P.box(w + 6, h * 0.7, d + 4, { y: h * 0.25, z: -1, color: EARTH }),                 // the earth heaped over its sides and back
      P.box(w + 5, 0.4, d + 3, { y: h * 0.62, z: -1.2, color: GRASS }),                    // turf on it
      P.box(w, h, d, { y: h / 2, color: CONCRETE }),                                        // the casemate
      P.box(w + 0.8, 0.5, d + 0.8, { y: h + 0.2, color: CONCRETE_DARK }),                  // the roof slab, overhanging
      P.box(1.2, h * 1.05, d * 0.9, { x: -w / 2 - 0.6, y: h / 2, z: d * 0.3, color: CONCRETE }), // the wing wall (seaward: the side toward which it never fires)
      P.box(w * 0.55, h * 0.5, 0.3, { y: h * 0.45, z: d / 2 + 0.05, color: 0x1e1e1c }),    // the embrasure's dark mouth
      P.box(w * 0.75, 0.35, 1.4, { y: h * 0.78, z: d / 2 + 0.6, color: CONCRETE_DARK }),   // the stepped hood over it
      P.box(1.4, 2, 0.2, { x: w / 4, y: 1, z: -d / 2 - 0.05, color: 0x2a2620 }),           // the door at the back
    ]), 1.4, 0.2, 0.6);
    const gun = merge([
      P.box(1.6 * k, 1.2 * k, 1.4 * k, { y: 0, z: 0, color: STEEL }),                     // the breech and cradle
      P.box(1.8 * k, 1.1 * k, 0.12, { y: 0.1, z: 0.8 * k, color: STEEL }),                 // the shield in the embrasure
      P.cyl(0.11 * k, 0.15 * k, len, { z: len / 2 + 0.6, rx: Math.PI / 2, color: STEEL }, 12), // the barrel
      P.cyl(0.18 * k, 0.18 * k, 0.4, { z: len + 0.4, rx: Math.PI / 2, color: STEEL }, 10),     // the muzzle brake
    ]);
    return { base, gun, h, d };
  })());
}

/** A casemated gun: `k` its size, `len` its barrel, `arc` the embrasure's traverse either side (rad). */
export function buildCasemate(k = 1, len = 5, arc = 0.6) {
  return () => (mats) => {
    const g = casemateGeo(k, len);
    const root = new THREE.Group();
    meshAdder(root)(g.base, mats.body);
    const gun = new THREE.Group();
    gun.position.set(0, g.h * 0.42, g.d / 2 - 1.2 * k);
    root.add(gun);
    meshAdder(gun)(g.gun, mats.body);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0, len + 0.8);
    gun.add(muzzle);
    return {
      root,
      muzzle,
      animate(u) {
        const rel = Math.atan2(Math.sin((u.turretYaw ?? u.yaw) - u.yaw), Math.cos((u.turretYaw ?? u.yaw) - u.yaw));
        gun.rotation.y = Math.max(-arc, Math.min(arc, rel));
        gun.rotation.x = -(u.gunPitch ?? 0.02);
        gun.position.z = g.d / 2 - 1.2 * k - (u.recoil ?? 0) * 0.5 * k;
      },
      die(time) {
        gun.rotation.x = Math.min(0.3, time * 0.4);
        gun.rotation.z = Math.min(0.2, time * 0.3);
      },
    };
  };
}
