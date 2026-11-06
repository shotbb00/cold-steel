// 1945 aircraft (data/air45.ts), built like aircraft.js from swept cross-sections (airKit.js), in
// metres, nose toward +z, each with its propeller (rig.prop, spun by systems/AirStrike.js):
//   strike: P-47D Thunderbolt (the big radial, the bubble canopy, the elliptical wing, rockets),
//           Il-2 Shturmovik (the armoured nose, the two-seat canopy, the swept outer wings, the
//           undercarriage fairings, the rocket rails), Fw 190 F-8 (the radial cowl, the bomb),
//           Ju 87 G (the inverted gull wing, the spatted legs, the two 3.7 cm gun pods)
//   fighters: P-51D Mustang (the belly scoop), Yak-3, Fw 190 D-9 (the long nose), Bf 109 G-10
// Markings in fixed colours: the US star, the Soviet red star, the Balkenkreuz (no swastika).
// Contract: aircraft.js.
import * as THREE from 'three';
import { P, merge, pair } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';
import { body, surface, fin } from './airKit.js';

const GLASS = 0x1b2126;
const DARK = 0x2a2c28;
const HOLE = 0x141414;
const WHITE = 0xd8d6cc;
const C = { camo: 1 };
const M = (parts) => merge(parts.flat(Infinity));

const point = (root, x, y, z) => {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  root.add(o);
  return o;
};

/** National markings: the US star (blue disc, white star), the red star, the Balkenkreuz. `up`: on a wing. */
function mark(kind, x, y, z, r, up = false) {
  const disc = (rr, color, dy = 0) => P.cyl(rr, rr, 0.02, up ? { x, y: y + dy, z, color } : { x: x + Math.sign(x) * dy, y, z, rz: Math.PI / 2, color }, 16);
  const bar = (w, h, color, dy) => (up ? P.box(w, 0.02, h, { x, y: y + dy, z, color }) : P.box(0.02, h, w, { x: x + Math.sign(x) * dy, y, z, color }));
  if (kind === 'us') return [disc(r, 0x22325c), disc(r * 0.6, WHITE, 0.012), bar(r * 2.6, r * 0.35, WHITE, 0.006)];
  if (kind === 'sov') return [disc(r, WHITE), disc(r * 0.85, 0xa8231c, 0.012)];
  return [bar(r * 2, r * 0.6, WHITE, 0), bar(r * 0.6, r * 2, WHITE, 0), bar(r * 1.7, r * 0.3, 0x141414, 0.012), bar(r * 0.3, r * 1.7, 0x141414, 0.012)];
}

/** The spinner and `n` blades of radius r, in the propeller's own frame (it turns about z). */
function propeller(n, r, color = 0x1e1e1c) {
  return M([
    P.cyl(0.02, 0.24, 0.5, { z: 0.15, rx: Math.PI / 2, color: 0x3a3c36 }, 12),
    ...Array.from({ length: n }, (_, k) => P.box(0.2, r, 0.04, { color }).translate(0, r / 2, 0).rotateZ((k / n) * Math.PI * 2)),
  ]);
}

const cache = {};
/** Build (once) and mount: body painted, the propeller at `prop` [x, y, z] (radius in `r`). */
function mount(key, mats, make, { gun, pods = [], prop, blades = 3, r = 1.7 }) {
  const m = (cache[key] ??= { body: make(), prop: propeller(blades, r) });
  const root = new THREE.Group();
  meshAdder(root)(m.body, mats.body);
  const p = new THREE.Group();
  p.position.set(...prop);
  root.add(p);
  meshAdder(p)(m.prop, mats.body);
  return { root, gun: point(root, ...gun), pods: pods.map((q) => point(root, ...q)), prop: p };
}

// ---------------------------------------------------------------- P-47D Thunderbolt

export const buildUsP47 = (mats) => mount('p47', mats, () => M([
  body([[5.3, 1.9, 0.72, 0.72], [4.6, 1.9, 0.78, 0.8], [3.2, 1.92, 0.72, 0.85], [1.0, 1.98, 0.62, 0.85], [-1.5, 2.0, 0.48, 0.7], [-4.0, 2.05, 0.28, 0.45], [-5.6, 2.1, 0.12, 0.25]], { color: 0x4d4f34, ...C }),
  P.cyl(0.55, 0.55, 0.02, { y: 1.9, z: 5.31, rx: Math.PI / 2, color: HOLE }, 16),
  body([[2.3, 2.75, 0.05, 0.05], [1.8, 2.95, 0.3, 0.28], [0.9, 3.0, 0.32, 0.3], [0.2, 2.85, 0.25, 0.2], [-0.3, 2.7, 0.1, 0.06]], { color: GLASS }),
  ...pair((s) => surface([[s * 0.5, 1.45, 0.6, 1.5, 0.18], [s * 3.0, 1.55, 0.3, 1.25, 0.12], [s * 5.5, 1.7, -0.1, 0.75, 0.06], [s * 6.2, 1.73, -0.15, 0.4, 0.03]], { color: 0x4d4f34, ...C })),
  ...pair((s) => surface([[s * 0.2, 2.1, -5.0, 0.75, 0.07], [s * 2.5, 2.1, -5.2, 0.4, 0.03]], { color: 0x4d4f34, ...C })),
  fin([[2.2, -4.8, 0.95, 0.07], [3.2, -5.2, 0.7, 0.05], [3.8, -5.5, 0.35, 0.03]], { color: 0x4d4f34, ...C }),
  ...pair((s) => [2.8, 3.4].map((x) => P.cyl(0.05, 0.05, 1.6, { x: s * x, y: 1.25, z: 0.4, rx: Math.PI / 2, color: DARK }, 6))), // the rocket tubes
  ...pair((s) => mark('us', s * 4.2, 1.66, -0.3, 0.42, true)),
  ...pair((s) => mark('us', s * 0.5, 2.05, -2.4, 0.4)),
]), { gun: [2.5, 1.45, 1.2], pods: [[-3.1, 1.25, 1.2], [3.1, 1.25, 1.2]], prop: [0, 1.9, 5.4], blades: 4, r: 1.95 });

// ---------------------------------------------------------------- P-51D Mustang

export const buildUsP51 = (mats) => mount('p51', mats, () => M([
  body([[4.7, 1.95, 0.3, 0.32], [4.1, 1.95, 0.42, 0.48], [2.5, 2.0, 0.48, 0.62], [0.5, 2.0, 0.5, 0.66], [-2.0, 2.05, 0.36, 0.52], [-4.2, 2.1, 0.15, 0.3], [-4.9, 2.1, 0.08, 0.18]], { color: 0xb4b7b6, ...C }),
  body([[0.2, 1.32, 0.05, 0.05], [-0.6, 1.26, 0.3, 0.25], [-2.0, 1.4, 0.28, 0.2], [-2.8, 1.62, 0.1, 0.08]], { color: 0xb4b7b6, ...C }), // the belly scoop
  body([[2.0, 2.55, 0.05, 0.05], [1.5, 2.8, 0.3, 0.28], [0.6, 2.85, 0.32, 0.28], [-0.1, 2.68, 0.2, 0.14]], { color: GLASS }),
  ...pair((s) => surface([[s * 0.4, 1.5, 0.2, 1.35, 0.17], [s * 5.6, 1.72, -0.3, 0.55, 0.05]], { color: 0xb4b7b6, ...C })),
  ...pair((s) => surface([[s * 0.2, 2.15, -4.2, 0.65, 0.06], [s * 2.0, 2.15, -4.45, 0.35, 0.03]], { color: 0xb4b7b6, ...C })),
  fin([[2.2, -3.9, 0.85, 0.06], [3.3, -4.4, 0.55, 0.04], [3.6, -4.6, 0.3, 0.03]], { color: 0xb4b7b6, ...C }),
  ...pair((s) => mark('us', s * 4.0, 1.68, -0.6, 0.38, true)),
  ...pair((s) => mark('us', s * 0.36, 2.05, -2.0, 0.34)),
]), { gun: [2.2, 1.5, 0.9], prop: [0, 1.95, 4.85], blades: 4, r: 1.7 });

// ---------------------------------------------------------------- Il-2 Shturmovik

export const buildSovIl2 = (mats) => mount('il2', mats, () => M([
  body([[5.6, 1.95, 0.45, 0.5], [4.0, 1.98, 0.6, 0.7, 2.6], [1.5, 2.0, 0.6, 0.75], [-1.0, 2.0, 0.5, 0.65], [-4.0, 2.05, 0.25, 0.35], [-5.8, 2.1, 0.1, 0.2]], { color: 0x4f5a34, ...C }),
  body([[2.2, 2.6, 0.05, 0.05], [1.7, 2.85, 0.33, 0.3], [-0.4, 2.9, 0.33, 0.3], [-0.9, 2.75, 0.2, 0.15]], { color: GLASS }),
  ...pair((s) => surface([[s * 0.5, 1.5, 0.4, 1.6, 0.2], [s * 3.0, 1.5, 0.1, 1.4, 0.14], [s * 7.3, 1.75, -0.8, 0.6, 0.05]], { color: 0x4f5a34, ...C })),
  ...pair((s) => body([[2.0, 1.3, 0.05, 0.05], [1.5, 1.28, 0.22, 0.25], [-0.6, 1.3, 0.22, 0.25], [-1.0, 1.35, 0.05, 0.05]], { x: s * 1.9, color: 0x4f5a34, ...C })), // undercarriage fairings
  ...pair((s) => surface([[s * 0.2, 2.15, -5.1, 0.8, 0.07], [s * 2.6, 2.15, -5.4, 0.4, 0.03]], { color: 0x4f5a34, ...C })),
  fin([[2.2, -4.9, 1.0, 0.07], [3.2, -5.3, 0.75, 0.05], [3.7, -5.5, 0.4, 0.03]], { color: 0x4f5a34, ...C }),
  ...pair((s) => [3.3, 3.8, 4.3, 4.8].map((x) => P.box(0.05, 0.05, 1.3, { x: s * x, y: 1.32, z: 0.2, color: DARK }))), // RS-82 rails
  ...pair((s) => mark('sov', s * 0.3, 3.3, -5.1, 0.35)),
  ...pair((s) => mark('sov', s * 0.3, 2.05, -2.8, 0.32)),
]), { gun: [2.2, 1.45, 1.4], pods: [[-3.8, 1.25, 0.9], [3.8, 1.25, 0.9]], prop: [0, 1.95, 5.75], blades: 3, r: 1.8 });

// ---------------------------------------------------------------- Yak-3

export const buildSovYak3 = (mats) => mount('yak3', mats, () => M([
  body([[4.1, 1.95, 0.28, 0.3], [3.4, 1.95, 0.4, 0.45], [1.8, 1.98, 0.45, 0.58], [0.0, 2.0, 0.42, 0.58], [-2.2, 2.05, 0.3, 0.45], [-3.9, 2.1, 0.1, 0.2]], { color: 0x7d8790, ...C }),
  body([[0.6, 1.36, 0.05, 0.05], [0.2, 1.32, 0.26, 0.2], [-0.8, 1.38, 0.22, 0.16], [-1.3, 1.55, 0.06, 0.05]], { color: 0x7d8790, ...C }),
  body([[1.4, 2.5, 0.05, 0.05], [1.0, 2.72, 0.26, 0.25], [0.2, 2.75, 0.27, 0.24], [-0.4, 2.6, 0.15, 0.1]], { color: GLASS }),
  ...pair((s) => surface([[s * 0.4, 1.55, 0.2, 1.2, 0.16], [s * 4.6, 1.7, -0.2, 0.5, 0.04]], { color: 0x7d8790, ...C })),
  ...pair((s) => surface([[s * 0.2, 2.15, -3.4, 0.55, 0.05], [s * 1.6, 2.15, -3.6, 0.3, 0.03]], { color: 0x7d8790, ...C })),
  fin([[2.2, -3.2, 0.7, 0.05], [3.0, -3.6, 0.45, 0.04], [3.2, -3.8, 0.25, 0.03]], { color: 0x7d8790, ...C }),
  ...pair((s) => mark('sov', s * 0.2, 2.75, -3.4, 0.3)),
  ...pair((s) => mark('sov', s * 3.5, 1.67, -0.4, 0.3, true)),
]), { gun: [0, 2.3, 2.6], prop: [0, 1.95, 4.15], blades: 3, r: 1.5 });

// ---------------------------------------------------------------- Fw 190 F-8 and D-9

function fw190(long, color) {
  const n = long ? 1.0 : 0; // the D-9's longer nose
  return M([
    body([[4.4 + n, 1.95, 0.62, 0.62], [3.6 + n, 1.95, 0.66, 0.66], [2.2, 1.98, 0.6, 0.72], [0.0, 2.0, 0.45, 0.65], [-2.5, 2.05, 0.28, 0.45], [-4.6, 2.1, 0.1, 0.22]], { color, ...C }),
    P.cyl(0.48, 0.48, 0.02, { y: 1.95, z: 4.41 + n, rx: Math.PI / 2, color: HOLE }, 16),
    body([[1.6, 2.5, 0.05, 0.05], [1.2, 2.75, 0.28, 0.27], [0.0, 2.8, 0.3, 0.27], [-0.8, 2.62, 0.18, 0.12]], { color: GLASS }),
    ...pair((s) => surface([[s * 0.5, 1.5, 0.3, 1.35, 0.17], [s * 5.25, 1.66, -0.3, 0.5, 0.05]], { color, ...C })),
    ...pair((s) => surface([[s * 0.2, 2.15, -4.0, 0.6, 0.06], [s * 1.8, 2.15, -4.25, 0.35, 0.03]], { color, ...C })),
    fin([[2.2, -3.7, 0.85, 0.06], [3.2, -4.15, 0.55, 0.04], [3.5, -4.4, 0.3, 0.03]], { color, ...C }),
    ...(long ? [] : [body([[0.9, 1.1, 0.04, 0.04], [0.5, 1.1, 0.18, 0.18], [-0.9, 1.1, 0.18, 0.18], [-1.3, 1.1, 0.05, 0.05]], { color: 0x3a3c32 })]), // the SC 250 under the belly
    ...pair((s) => mark('de', s * 0.43, 2.0, -2.2, 0.32)),
    ...pair((s) => mark('de', s * 3.8, 1.64, -0.5, 0.35, true)),
  ]);
}
export const buildWhFw190F = (mats) => mount('fw190f', mats, () => fw190(false, 0x5a6248), { gun: [0, 2.35, 2.2], pods: [[-2.4, 1.3, 0.6], [2.4, 1.3, 0.6]], prop: [0, 1.95, 4.55], blades: 3, r: 1.65 });
export const buildWhFw190D = (mats) => mount('fw190d', mats, () => fw190(true, 0x6e7468), { gun: [0, 2.35, 2.6], prop: [0, 1.95, 5.55], blades: 3, r: 1.7 });

// ---------------------------------------------------------------- Ju 87 G

export const buildFjJu87 = (mats) => mount('ju87', mats, () => M([
  body([[5.1, 2.0, 0.45, 0.5], [3.8, 2.0, 0.55, 0.7], [1.5, 2.05, 0.6, 0.8], [-1.5, 2.1, 0.45, 0.65], [-4.5, 2.15, 0.22, 0.35], [-6.0, 2.2, 0.1, 0.2]], { color: 0x5a6248, ...C }),
  body([[4.2, 1.35, 0.05, 0.05], [3.8, 1.3, 0.3, 0.2], [2.8, 1.35, 0.28, 0.18], [2.4, 1.5, 0.05, 0.05]], { color: 0x5a6248, ...C }), // the chin radiator
  body([[2.4, 2.7, 0.05, 0.05], [1.9, 2.95, 0.34, 0.32], [-1.0, 3.0, 0.34, 0.32], [-1.6, 2.8, 0.2, 0.15]], { color: GLASS }),
  // the inverted gull wing: down from the root, then up and out
  ...pair((s) => surface([[s * 0.5, 1.65, 0.2, 1.3, 0.2], [s * 2.4, 1.15, -0.1, 1.2, 0.14]], { color: 0x5a6248, ...C })),
  ...pair((s) => surface([[s * 2.4, 1.15, -0.1, 1.2, 0.14], [s * 6.9, 1.75, -0.6, 0.6, 0.05]], { color: 0x5a6248, ...C })),
  // the fixed legs in their spats
  ...pair((s) => P.box(0.12, 0.55, 0.35, { x: s * 2.4, y: 0.8, z: 0.0, color: 0x5a6248 })),
  ...pair((s) => body([[0.6, 0.45, 0.05, 0.06], [0.25, 0.45, 0.18, 0.35], [-0.5, 0.48, 0.16, 0.32], [-0.8, 0.55, 0.04, 0.05]], { x: s * 2.4, color: 0x5a6248, ...C })),
  // the two 3.7 cm BK guns in their pods under the wings
  ...pair((s) => [P.box(0.3, 0.32, 1.6, { x: s * 3.3, y: 1.0, z: 0.0, color: 0x4a4e3e }), P.cyl(0.05, 0.05, 1.8, { x: s * 3.3, y: 1.0, z: 1.6, rx: Math.PI / 2, color: DARK }, 8)]),
  ...pair((s) => surface([[s * 0.2, 2.25, -5.5, 0.75, 0.07], [s * 2.6, 2.25, -5.7, 0.45, 0.03]], { color: 0x5a6248, ...C })),
  fin([[2.3, -5.3, 0.95, 0.07], [3.3, -5.6, 0.75, 0.05], [3.6, -5.7, 0.55, 0.03]], { color: 0x5a6248, ...C }),
  ...pair((s) => mark('de', s * 0.38, 2.1, -3.0, 0.32)),
  ...pair((s) => mark('de', s * 4.8, 1.48, -0.7, 0.38, true)),
]), { gun: [3.3, 1.0, 2.5], pods: [[-3.3, 1.0, 2.5], [3.3, 1.0, 2.5]], prop: [0, 2.0, 5.25], blades: 3, r: 1.7 });

// ---------------------------------------------------------------- Bf 109 G-10

export const buildFjBf109 = (mats) => mount('bf109', mats, () => M([
  body([[4.3, 2.0, 0.32, 0.36], [3.5, 2.0, 0.45, 0.52], [1.5, 2.0, 0.45, 0.62], [-1.0, 2.05, 0.36, 0.52], [-3.5, 2.1, 0.18, 0.3], [-4.5, 2.15, 0.08, 0.2]], { color: 0x7a8078, ...C }),
  body([[1.9, 2.55, 0.05, 0.05], [1.5, 2.75, 0.27, 0.25], [0.6, 2.78, 0.27, 0.24], [0.0, 2.62, 0.15, 0.1]], { color: GLASS }),
  ...pair((s) => [1.5, 0.6].map((z) => P.box(0.02, 0.26, 0.03, { x: s * 0.24, y: 2.68, z, color: DARK }))), // the canopy frames
  ...pair((s) => surface([[s * 0.4, 1.55, 0.3, 1.1, 0.15], [s * 4.95, 1.7, -0.2, 0.45, 0.04]], { color: 0x7a8078, ...C })),
  ...pair((s) => P.box(0.35, 0.15, 0.6, { x: s * 1.4, y: 1.42, z: 0.0, color: 0x6a7068 })),                    // underwing radiators
  ...pair((s) => surface([[s * 0.2, 2.35, -3.6, 0.55, 0.05], [s * 1.6, 2.35, -3.8, 0.3, 0.03]], { color: 0x7a8078, ...C })),
  fin([[2.2, -3.4, 0.75, 0.06], [3.2, -3.8, 0.5, 0.04], [3.4, -4.0, 0.3, 0.03]], { color: 0x7a8078, ...C }),
  ...pair((s) => mark('de', s * 0.37, 2.05, -1.8, 0.3)),
  ...pair((s) => mark('de', s * 3.8, 1.65, -0.4, 0.32, true)),
]), { gun: [0, 2.0, 4.4], prop: [0, 2.0, 4.4], blades: 3, r: 1.5 });
