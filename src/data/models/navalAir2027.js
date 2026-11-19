// 2027's aircraft over the Baltic (data/air27sea.js), swept from cross-sections (airKit.js), metres, nose +z:
//   F-35B / F-35C   the Lightning II: the chined nose, the caret intakes either side of the cockpit, the wide
//                   flat body round the one big engine, the trapezoid wing, the twin fins canted out; the
//                   C's bigger wing (13.1 m against the B's 10.7) with two LRASMs under it
//   P-8A Poseidon   the Boeing 737-800 made a sub hunter: two turbofans under the swept wing, the raked tips
//   E-7A Wedgetail  the 737-700 with the MESA radar's "top hat" plank on a pylon over the body
//   Tu-214R         the Tupolev airliner with the side-looking radar fairings along the belly
//   MQ-9B           the SeaGuardian: the long slim wing, the bulged satellite-dish nose, the V tail and the
//                   ventral fin, a three-blade pusher propeller; its sea radar in a pod under the belly
//   Orion           Kronshtadt's Inokhodets: the same layout, smaller, the V tail
//   AW101           the three-engined Merlin of the Polish Navy: the long body, the sponsons, five blades
// Contract: aircraft.js (jets: jet: true; propellers: props; helicopters: rotor, tailRotor, rotorRadius, blades).
import * as THREE from 'three';
import { P, merge, pair, loft } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';
import { body, surface, fin, blades, missile } from './airKit.js';

const GLASS = 0x1b2126;
const DARK = 0x2a2c28;
const HOLE = 0x141414;
const WHITE = 0xd8d6cc;
const C = { camo: 1 };
const M = (parts) => merge(parts.flat(Infinity));
const point = (root, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); return o; };
const roundel = (x, y, z, r, up = false) => P.cyl(r, r, 0.02, up ? { x, y, z } : { x, y, z, rz: Math.PI / 2 }, 14);

/** Propeller: `n` blades of radius r about z (as models/navalAir85.js). */
function propeller(n, r) {
  const blade = (k) => loft([[0, 0.08, 0, 0.06, 0.04, 2], [0, r * 0.45, 0, 0.13, 0.03, 2.2], [0, r * 0.9, 0, 0.08, 0.02, 2], [0, r, 0, 0.03, 0.01, 2]], { color: 0x2a2c2a, surf: 'paint' }, 8).rotateY(0.35).rotateZ((k / n) * Math.PI * 2);
  return M([P.cyl(0.1, 0.22, 0.7, { rx: Math.PI / 2, color: 0x3a3c36 }, 12), ...Array.from({ length: n }, (_, k) => blade(k))]);
}

const cache = {};
/** Build once and mount: body and marks, the gun point, the propellers (spun by systems/AirStrike.js) if any. */
function mount(key, mats, make, { gun = [0, 1.2, 4], props = [], blades: nb = 3, r = 1.4 } = {}) {
  const m = (cache[key] ??= { ...make(), prop: props.length ? propeller(nb, r) : null });
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(m.body, mats.body);
  if (m.marks) add(m.marks, mats.glow, false);
  const ps = props.map((at) => { const g = new THREE.Group(); g.position.set(...at); root.add(g); meshAdder(g)(m.prop, mats.body); return g; });
  return { root, gun: point(root, ...gun), pods: [], ...(ps.length ? { props: ps } : { jet: true }) };
}

// ---------------------------------------------------------------- F-35B / F-35C

function lightning(color, { span, lrasm = false }) {
  const c = { color, ...C }, half = span / 2;
  return {
    body: M([
      // the chined nose into the wide flat body, the single engine's nozzle
      body([[7.8, 1.9, 0.03, 0.03], [7.2, 1.9, 0.3, 0.22, 1.8], [6.0, 1.95, 0.6, 0.42, 1.8], [4.6, 2.0, 0.85, 0.6, 2], [2.6, 2.0, 1.45, 0.7, 2.6], [0, 2.0, 1.6, 0.72, 3], [-3.5, 2.0, 1.5, 0.66, 3], [-5.8, 2.0, 1.0, 0.55, 2.6], [-6.9, 2.0, 0.62, 0.55]], c),
      P.cyl(0.6, 0.52, 0.9, { y: 2.0, z: -7.3, rx: Math.PI / 2, color: DARK }, 14),
      P.cyl(0.45, 0.45, 0.02, { y: 2.0, z: -7.76, rx: Math.PI / 2, color: HOLE }, 14),
      // the caret intakes either side, behind the cockpit
      ...pair((sx) => body([[3.9, 1.85, 0.2, 0.45, 2], [3.0, 1.85, 0.4, 0.55, 2.5], [0.5, 1.9, 0.45, 0.55, 2.5]], { x: sx * 1.15, ...c })),
      ...pair((sx) => P.box(0.3, 0.75, 0.004, { x: sx * 1.17, y: 1.85, z: 3.905, color: HOLE })),
      // the one-piece canopy
      body([[5.6, 2.45, 0.05, 0.05], [5.0, 2.72, 0.36, 0.3], [3.8, 2.82, 0.38, 0.32], [2.8, 2.65, 0.28, 0.2], [2.2, 2.45, 0.12, 0.08]], { color: GLASS }),
      // the wing, the tailplanes, the twin fins canted out
      ...pair((sx) => surface([[sx * 1.3, 2.0, -1.6, 2.6, 0.14], [sx * half, 2.0, -3.6, 0.8, 0.05]], c)),
      ...pair((sx) => surface([[sx * 0.7, 2.0, -6.4, 1.1, 0.07], [sx * 3.4, 2.0, -7.0, 0.5, 0.03]], c)),
      ...pair((sx) => fin([[2.2, -5.0, 1.2, 0.07, sx * 1.1], [3.4, -5.9, 0.85, 0.05, sx * 1.5], [4.4, -6.6, 0.45, 0.03, sx * 1.85]], c)),
      // (the C off a carrier: two LRASMs under the wings, on their pylons)
      ...(lrasm ? pair((sx) => [missile(sx * 3.2, 1.55, -3.6, 0.8, 0.24, 0x4e5458), P.box(0.1, 0.4, 1.6, { x: sx * 3.2, y: 1.85, z: -1.6, color: DARK })]) : []),
    ]),
    marks: M([...pair((sx) => roundel(sx * (half * 0.7), 2.12, -3.0, 0.4, true))]),
  };
}
export const buildF35B = (mats) => mount('f35b', mats, () => lightning(0x6d747a, { span: 10.7 }), { gun: [-0.6, 2.4, 3.0] });
export const buildF35C = (mats) => mount('f35c', mats, () => lightning(0x6d747a, { span: 13.1, lrasm: true }), { gun: [-0.6, 2.4, 3.0] });

// ---------------------------------------------------------------- the airliners: P-8A, E-7A, Tu-214R

/** A twin-jet airliner `len` long, `span` across, radius `r`: low swept wing, engines under it; `extra(y)` its own fittings. */
function airliner(color, { len, span, r, extra = () => [] }) {
  const c = { color, ...C }, y = 3.4, wz = len * 0.04, half = span / 2, sweep = half * 0.47;
  const ex = half * 0.33, f = (ex - r * 0.6) / (half - r * 0.6), ez = wz - sweep * f, ey = y - r - 0.9, wy = y - r * 0.6 + r * 0.25 * f; // the engines: under the wing a third of the way out
  return {
    body: M([
      body([[len * 0.5, y - 0.3, 0.2, 0.3], [len * 0.47, y - 0.1, r * 0.75, r * 0.8], [len * 0.4, y, r, r], [-len * 0.25, y, r, r], [-len * 0.42, y + 0.5, r * 0.55, r * 0.6], [-len * 0.5, y + 0.9, 0.2, 0.25]], c),
      body([[len * 0.48, y + 0.5, 0.25, 0.15], [len * 0.455, y + 0.75, r * 0.6, 0.3], [len * 0.43, y + 0.75, r * 0.6, 0.28]], { color: GLASS }),
      // the low wing, its raked tips; the engines on pylons under it
      ...pair((sx) => surface([[sx * r * 0.6, y - r * 0.6, wz, 3.6, 0.35], [sx * half, y - r * 0.35, wz - sweep, 0.9, 0.08]], c)),
      ...pair((sx) => body([[ez + 4.6, ey, 0.8, 0.8], [ez + 4.3, ey, 0.95, 0.95], [ez + 0.6, ey, 0.85, 0.85], [ez, ey, 0.5, 0.5]], { x: sx * ex, ...c })),
      ...pair((sx) => P.cyl(0.7, 0.7, 0.02, { x: sx * ex, y: ey, z: ez + 4.61, rx: Math.PI / 2, color: HOLE }, 14)),
      ...pair((sx) => P.box(0.25, wy - ey, 3, { x: sx * ex, y: (wy + ey) / 2 + 0.3, z: ez + 1.6, color })),          // the pylon
      // the tailplanes and the fin
      ...pair((sx) => surface([[sx * 0.4, y + 0.6, -len * 0.42, 1.8, 0.12], [sx * span * 0.17, y + 0.6, -len * 0.46 - 1.6, 0.6, 0.05]], c)),
      fin([[y + 0.6, -len * 0.38, 2.6, 0.14], [y + 3.2, -len * 0.44, 1.6, 0.1], [y + 5.6, -len * 0.49, 0.9, 0.06]], c),
      ...extra(y, c),
    ]),
    marks: M([...pair((sx) => roundel(sx * (r + 0.01), y, -len * 0.3, 0.55))]),
  };
}
const GREY = 0x8c949a;
export const buildP8 = (mats) => mount('p8', mats, () => airliner(GREY, { len: 39.5, span: 37.6, r: 1.88, extra: (y, c) => [
  body([[-14.0, y - 1.7, 0.4, 0.3], [-15.5, y - 1.7, 0.5, 0.35], [-17.5, y - 1.6, 0.4, 0.3]], c),                  // (no MAD boom: sonobuoys) the tail-end fairing
] }), { gun: [0, 1.5, 15] });
export const buildE7 = (mats) => mount('e7', mats, () => airliner(GREY, { len: 33.6, span: 35.8, r: 1.88, extra: (y, c) => [
  P.box(0.7, 1.1, 3.2, { y: y + 2.3, z: -3.0, color: GREY }),                                                         // the pylon
  P.box(1.1, 1.7, 10.7, { y: y + 3.5, z: -3.0, color: WHITE }), P.box(3.6, 0.5, 1.6, { y: y + 4.1, z: -3.0, color: WHITE }), // the MESA plank and its top hat
] }), { gun: [0, 1.5, 13] });
export const buildTu214R = (mats) => mount('tu214r', mats, () => airliner(0xc8cccc, { len: 46.2, span: 42, r: 1.9, extra: (y, c) => [
  ...pair((sx) => body([[6, y - 1.5, 0.3, 0.2], [4, y - 1.5, 0.55, 0.45], [-6, y - 1.5, 0.55, 0.45], [-8, y - 1.5, 0.3, 0.2]], { x: sx * 1.1, color: 0xb8bcbc })), // the side-looking radar fairings
] }), { gun: [0, 1.5, 18] });

// ---------------------------------------------------------------- the long-endurance drones: MQ-9B, Orion

/** A turboprop or piston drone `len` long, `span` across: the domed nose, the slim body, the long straight wing, the V tail, a pusher prop. */
function male(color, { len, span, ventral = false, pod = false }) {
  const c = { color, ...C }, y = 1.6, w = len * 0.075;
  return {
    body: M([
      body([[len * 0.5, y, 0.1, 0.1], [len * 0.46, y + 0.1, w * 1.1, w * 1.2], [len * 0.3, y + 0.1, w * 1.15, w * 1.2], [-len * 0.2, y, w, w], [-len * 0.43, y, w * 0.55, w * 0.55]], c),
      ...pair((sx) => surface([[sx * w * 0.6, y + w * 0.6, len * 0.05, len * 0.06, 0.07], [sx * span / 2, y + w * 0.7, len * 0.03, len * 0.03, 0.03]], c)),
      ...pair((sx) => fin([[y + w * 0.3, -len * 0.38, len * 0.06, 0.05, sx * 0.15], [y + len * 0.13, -len * 0.42, len * 0.035, 0.03, sx * len * 0.12]], c)), // the V tail
      ...(ventral ? [fin([[y - w * 0.3, -len * 0.4, len * 0.05, 0.05], [y - len * 0.11, -len * 0.42, len * 0.03, 0.03]], c)] : []),
      ...(pod ? [body([[len * 0.12, y - w - 0.2, 0.1, 0.1], [len * 0.08, y - w - 0.2, 0.3, 0.3], [-len * 0.08, y - w - 0.2, 0.3, 0.3], [-len * 0.12, y - w - 0.2, 0.1, 0.1]], { color: WHITE }), P.box(0.1, 0.4, 1, { y: y - w + 0.1, color: DARK })] : []),
      P.sphere(0.12, { y: y - w * 1.1, z: len * 0.38, color: DARK }, 8, 6),                                                // the camera ball
    ]),
    marks: M([...pair((sx) => roundel(sx * span * 0.38, y + w * 0.75, len * 0.03, 0.3, true))]),
  };
}
export const buildMQ9 = (mats) => mount('mq9', mats, () => male(0x9aa0a4, { len: 11.7, span: 24, ventral: true, pod: true }), { gun: [0, 1, 5], props: [[0, 1.6, -5.4]], blades: 3, r: 1.5 });
export const buildOrion = (mats) => mount('orion', mats, () => male(0xb4b8b4, { len: 8, span: 16 }), { gun: [0, 1, 3], props: [[0, 1.6, -3.7]], blades: 3, r: 0.85 });

// ---------------------------------------------------------------- AW101 Merlin

const MERLIN = [[5.2, 1.8, 0.3, 0.45], [4.6, 1.9, 0.95, 0.9, 3], [3.4, 2.0, 1.25, 1.1, 3.2], [-3.4, 2.05, 1.3, 1.15, 3.5], [-4.6, 2.3, 0.8, 0.75], [-7.6, 2.8, 0.38, 0.4], [-10.6, 3.2, 0.25, 0.3]];
export const buildAW101 = (mats) => {
  const m = (cache.aw101 ??= {
    body: M([
      body(MERLIN, { color: GREY, ...C }),
      body([[4.8, 2.4, 0.3, 0.2], [4.2, 2.8, 1.0, 0.45], [3.6, 2.8, 1.0, 0.35]], { color: GLASS }),
      body([[2.6, 3.0, 0.9, 0.3, 3], [-2.6, 3.2, 1.0, 0.45, 3], [-3.6, 3.0, 0.6, 0.2, 3]], { color: GREY, ...C }),  // the three engines' housing over the cabin
      P.cyl(0.28, 0.3, 0.6, { y: 3.85, z: -0.2, color: DARK }, 10),
      ...pair((sx) => body([[0.6, 1.0, 0.3, 0.35], [-0.2, 1.0, 0.45, 0.45], [-2.2, 1.0, 0.45, 0.45], [-2.8, 1.0, 0.25, 0.3]], { x: sx * 1.4, color: GREY, ...C })), // the sponsons
      fin([[2.9, -10.2, 0.75, 0.12], [4.6, -10.7, 0.5, 0.08]], { color: GREY, ...C }),
      surface([[0, 3.9, -10.4, 0.4, 0.05], [1.6, 3.9, -10.4, 0.35, 0.04]], { color: GREY, ...C }),
      ...pair((sx) => P.cyl(0.32, 0.32, 0.22, { x: sx * 1.5, y: 0.32, z: -1.2, rz: Math.PI / 2, color: 0x1d1d1b, surf: 'rubber' }, 12)),
      ...pair((sx) => P.box(0.1, 0.5, 0.12, { x: sx * 1.5, y: 0.65, z: -1.2, color: DARK })),
      P.cyl(0.28, 0.28, 0.2, { y: 0.3, z: 3.6, rz: Math.PI / 2, color: 0x1d1d1b, surf: 'rubber' }, 10), P.box(0.08, 0.7, 0.08, { y: 0.7, z: 3.6, color: DARK }),
    ]),
    marks: M([...pair((sx) => roundel(sx * 1.29, 2.1, -1.8, 0.35))]),
    rotor: merge([...blades(5, 9.3, 0.6, 0x2a2c2a), P.cyl(0.4, 0.4, 0.28, { color: DARK }, 10)]),
    tail: merge([...blades(4, 2.0, 0.28, 0x2a2c2a, 0.15), P.cyl(0.14, 0.14, 0.2, { color: DARK }, 8)]),
  });
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(m.body, mats.body);
  add(m.marks, mats.glow, false);
  const rotor = new THREE.Group(); rotor.position.set(0, 4.15, -0.2); meshAdder(rotor)(m.rotor, mats.body); root.add(rotor);
  const tailRotor = new THREE.Group(); tailRotor.position.set(-0.35, 4.3, -10.6); tailRotor.rotation.z = Math.PI / 2; meshAdder(tailRotor)(m.tail, mats.body, false); root.add(tailRotor);
  return { root, rotor, tailRotor, rotorRadius: 9.3, blades: 5, gun: point(root, 0, 1.2, 4), pods: [], doors: [] };
};
