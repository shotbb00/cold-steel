// The Atlantic Wall, 1944 (the coastal maps), in the same kit as the fortifications (models/fortifications.js):
//   casemate  a squat concrete gun casemate sunk into the ground: walls and roof two metres thick, no eaves,
//             earth banked up its sides and back and turf on the roof, painted in blotches, a wide dark
//             embrasure in a stepped concrete frame (an H677 for the 88, a wing wall to the sea; an H669 for
//             the 155 mm battery inland, bigger, the long barrel out of it). The gun traverses within it.
//   tobruk    a Tobruk ringstand: a block of concrete flush with the ground, a round opening, the MG 42 on its
//             rail ring, a few sandbags round the lip
// Built as render/RigRenderer.js rigs: { root, muzzle, animate(u, dt), die(time) }.
import * as THREE from 'three';
import { P, merge, grime } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';

const CONCRETE = 0xa9a598;
const CONCRETE_DARK = 0x77746b;
const EARTH = 0x5e5340;
const TURF = 0x5a6440;
const STEEL = 0x34362f;
const BLOTCH = [0x5c6244, 0x6e5e42, 0x4a4e3a];

const cache = {};

/** Camouflage paint: a few blotches over a face (`face`: 'x' a side at ±x, 'z' the front). */
function blotches(n, w, h, at, face, seed) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = (k) => ((Math.sin(seed * 97.1 + i * 13.7 + k * 3.1) + 1) / 2);
    const bw = 0.8 + r(1) * 1.6, bh = 0.5 + r(2) * 0.9, u = (r(3) - 0.5) * (w - bw), v = 0.3 + r(4) * (h - bh - 0.3);
    out.push(face === 'z'
      ? P.box(bw, bh, 0.04, { x: u, y: v, z: at, color: BLOTCH[i % 3] })
      : P.box(0.04, bh, bw, { x: at, y: v, z: u, color: BLOTCH[i % 3] }));
  }
  return out;
}

/** `k`: its size (1 the 88's casemate, 1.5 the battery's), `len` the barrel's length. */
function casemateGeo(k, len) {
  return (cache[`${k}:${len}`] ??= (() => {
    const w = 7 * k, d = 6.5 * k, h = 2.6 * k, sink = 0.8;
    const base = grime(merge([
      P.box(w, h + sink, d, { y: (h - sink) / 2, color: CONCRETE }),                               // the casemate, sunk in
      P.box(w - 0.3, 0.7, d - 0.3, { y: h + 0.3, color: CONCRETE }),                                 // the roof: thick, flush (no eaves)
      ...[-1, 1].map((s) => P.box(3.2 * k, h * 1.1, d + 1.6, { x: s * (w / 2 + 1.1 * k), y: h * 0.22, rz: s * -0.55, color: EARTH })), // the earth banked up its sides
      P.box(w + 3, h * 1.1, 3.2 * k, { y: h * 0.22, z: -d / 2 - 1.1 * k, rx: 0.55, color: EARTH }), // …and its back
      P.box(w - 1, 0.35, d - 1.6, { y: h + 0.8, z: -0.4, color: TURF }),                              // turf on the roof
      P.box(w * 0.68, h * 0.78, 0.35, { y: h * 0.5, z: d / 2 + 0.12, color: CONCRETE_DARK }),        // the stepped frame…
      P.box(w * 0.56, h * 0.5, 0.4, { y: h * 0.48, z: d / 2 + 0.2, color: 0x141412 }),               // …and the embrasure's black mouth
      P.box(w * 0.72, 0.45, 1.3 * k, { y: h * 0.92, z: d / 2 + 0.55 * k, color: CONCRETE }),         // the hood over it
      P.box(1.3 * k, h + 0.6, 3 * k, { x: -w / 2 - 0.65 * k, y: (h - 0.2) / 2, z: d / 2 + 0.9 * k, color: CONCRETE }), // the wing wall (to the sea)
      ...blotches(4, w * 0.9, h, d / 2 + 0.36, 'z', k),
      ...blotches(2, w * 0.5, h * 0.7, -w / 2 - 1.31 * k, 'x', k + 1),
    ]), 1.4, 0.2, 0.6);
    const gun = merge([
      P.box(1.4 * k, 1.1 * k, 1.4 * k, { color: STEEL }),                                          // the breech and cradle
      P.box(1.7 * k, 1.0 * k, 0.12, { y: 0.1, z: 0.8 * k, color: STEEL }),                         // the shield in the embrasure
      P.cyl(0.11 * k, 0.15 * k, len, { z: len / 2 + 0.6, rx: Math.PI / 2, color: STEEL }, 12),     // the barrel
      P.cyl(0.18 * k, 0.18 * k, 0.4, { z: len + 0.4, rx: Math.PI / 2, color: STEEL }, 10),         // the muzzle brake
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
    gun.position.set(0, g.h * 0.45, g.d / 2 - 1.3 * k);
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
        gun.position.z = g.d / 2 - 1.3 * k - (u.recoil ?? 0) * 0.5 * k;
      },
      die(time) {
        gun.rotation.x = Math.min(0.3, time * 0.4);
        gun.rotation.z = Math.min(0.2, time * 0.3);
      },
    };
  };
}

function tobrukGeo() {
  return (cache.tobruk ??= (() => {
    const bags = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      if (Math.cos(a) < -0.6) continue; // (the back: the way down into it)
      bags.push(P.box(0.8, 0.28, 0.45, { x: Math.sin(a) * 1.55, y: 0.5, z: Math.cos(a) * 1.55, ry: a, color: 0xa8966a }));
    }
    return {
      base: grime(merge([
        P.box(3.6, 0.9, 3.6, { y: -0.05, color: CONCRETE }),                       // the block, its top just above the ground
        P.cyl(0.75, 0.75, 0.2, { y: 0.42, color: 0x141412 }, 16),                  // the round opening
        P.cyl(0.9, 0.9, 0.12, { y: 0.45, color: CONCRETE_DARK }, 16),              // its lip
        P.box(1.2, 0.4, 0.9, { y: 0.15, z: -1.9, color: CONCRETE_DARK }),          // the entrance's steps
        ...bags,
        ...blotches(2, 3, 0.4, 1.82, 'z', 7),
      ]), 0.8, 0.1, 0.5),
      gun: merge([
        P.cyl(0.7, 0.7, 0.05, { y: 0.55, color: STEEL }, 14),                      // the rail ring
        P.box(0.16, 0.18, 0.9, { y: 0.8, z: 0.15, color: STEEL }),                 // the MG 42
        P.cyl(0.04, 0.04, 0.9, { y: 0.82, z: 0.95, rx: Math.PI / 2, color: STEEL }, 6),
        P.box(0.5, 0.5, 0.25, { y: 0.55, z: -0.25, color: 0x56603a }),             // the gunner's helmet and shoulders
      ]),
    };
  })());
}

/** The Tobruk MG pit. */
export function buildTobruk() {
  return (mats) => {
    const g = tobrukGeo();
    const root = new THREE.Group();
    meshAdder(root)(g.base, mats.body);
    const gun = new THREE.Group();
    root.add(gun);
    meshAdder(gun)(g.gun, mats.body);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.82, 1.45);
    gun.add(muzzle);
    return {
      root,
      muzzle,
      animate(u) { gun.rotation.y = (u.turretYaw ?? u.yaw) - u.yaw; },
      die(time) { gun.rotation.z = Math.min(1.2, time * 1.5); },
    };
  };
}
