// 1985 aircraft over the sea (data/units/air85sea.js), built from swept cross-sections (airKit.js) in
// metres, nose toward +z, like fighters.js:
//   F-14A Tomcat    the swing wings half back, the wide flat body between the far-apart engines, the twin
//                   fins, Phoenix and Sparrow under the belly
//   A-6E Intruder   the bulbous radar nose, the side-by-side canopy, the refuelling probe, Harpoons
//   E-2C Hawkeye    the rotodome on its pylon, two turboprops, the four-finned tail
//   P-3C Orion      the long airliner body, four turboprops, the MAD boom out of the tail
//   Tu-22M3 Backfire  the long nose, the huge intakes, the swing wings swept back, a Kh-22 under each wing
//   Yak-38 Forger   the small jump jet off the Kiev, two vectoring nozzles under it
//   Il-38 May       the Il-18 turned sub hunter: wings far forward, four turboprops, the MAD sting
//   Tu-95RTs Bear-D the swept wing, four contra-rotating turboprops, the big belly radome
// Contract: aircraft.js (root, gun, pods, prop / props).
import * as THREE from 'three';
import { P, merge, pair, loft } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';
import { body, surface, fin, missile } from './airKit.js';

const NAVY = 0x8c949a;     // tactical paint scheme greys
const NAVY_DK = 0x6f777e;
const SOV_NAVY = 0x8e9696;
const BACKFIRE = 0xa6aaa6;
const GLASS = 0x1b2126;
const DARK = 0x2a2c28;
const HOLE = 0x141414;
const WHITE = 0xd8d6cc;
const RED = 0xa8231c;
const C = { camo: 1 };
const M = (parts) => merge(parts.flat(Infinity));

const point = (root, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); return o; };

/** A marking: the US low-visibility star (a dark disc and bars) or the Soviet red star (a red disc in a white ring). */
function mark(kind, x, y, z, r, up = false) {
  const disc = (rr, color, d = 0) => P.cyl(rr, rr, 0.02, up ? { x, y: y + d, z, color } : { x: x + Math.sign(x || 1) * d, y, z, rz: Math.PI / 2, color }, 14);
  return kind === 'us' ? [disc(r, 0x5a6066), P.box(up ? r * 2.6 : 0.02, up ? 0.02 : r * 0.35, up ? r * 0.35 : r * 2.6, { x, y, z, color: 0x5a6066 })] : [disc(r, WHITE), disc(r * 0.82, RED, 0.012)];
}

/** Propeller: `n` blades of radius r about z (contra-rotating pairs: `contra`). */
function propeller(n, r, contra = false) {
  const blade = (k, dz) => loft([[0, r * 0.12, dz, 0.07, 0.05, 2], [0, r * 0.45, dz, 0.16, 0.03, 2.2], [0, r * 0.9, dz, 0.1, 0.02, 2], [0, r, dz, 0.04, 0.01, 2]], { color: 0x2a2c2a, surf: 'paint' }, 8).rotateY(0.35).rotateZ((k / n) * Math.PI * 2);
  return M([P.cyl(0.05, 0.32, 0.9, { z: 0.1, rx: Math.PI / 2, color: 0x3a3c36 }, 12), ...Array.from({ length: n }, (_, k) => blade(k, 0)), ...(contra ? Array.from({ length: n }, (_, k) => blade(k + 0.5, -0.5)) : [])]);
}

const cache = {};
/** Build once and mount: the body, then the gun point and the propellers (spun by systems/AirStrike.js spin). */
function mount(key, mats, make, { gun, props = [], blades = 4, r = 1.8, contra = false }) {
  const m = (cache[key] ??= { body: make(), prop: props.length ? propeller(blades, r, contra) : null });
  const root = new THREE.Group();
  meshAdder(root)(m.body, mats.body);
  const ps = props.map((at) => { const g = new THREE.Group(); g.position.set(...at); root.add(g); meshAdder(g)(m.prop, mats.body); return g; });
  return { root, gun: point(root, ...gun), pods: [], ...(ps.length ? { props: ps } : { jet: true }) };
}
/** An engine nacelle with its intake, at (x, y) from z0 back to z1. */
const nacelle = (x, y, z0, z1, r, color) => [body([[z0, y, r * 0.7, r * 0.8], [z0 - 0.6, y, r, r], [z1 + 0.8, y, r * 0.9, r * 0.9], [z1, y, r * 0.5, r * 0.5]], { x, color, ...C })];

// ---------------------------------------------------------------- US Navy

export const buildF14 = (mats) => mount('f14', mats, () => M([
  body([[9.6, 1.9, 0.04, 0.04], [8.6, 1.9, 0.42, 0.45], [6.8, 1.95, 0.62, 0.7], [4.6, 2.0, 0.75, 0.8], [2.0, 1.95, 1.9, 0.6, 3], [-3.0, 1.95, 2.0, 0.55, 3], [-6.0, 2.0, 1.4, 0.45, 3], [-8.4, 2.05, 0.5, 0.25]], { color: NAVY, ...C }),
  body([[6.2, 2.6, 0.05, 0.05], [5.4, 2.9, 0.42, 0.34], [3.6, 2.98, 0.44, 0.36], [2.6, 2.75, 0.3, 0.22]], { color: GLASS }),
  ...pair((s) => nacelle(s * 1.5, 1.75, 2.6, -8.6, 0.62, NAVY)),
  ...pair((s) => P.box(0.9, 1.1, 0.004, { x: s * 1.5, y: 1.75, z: 2.65, color: HOLE })),
  ...pair((s) => surface([[s * 2.0, 2.15, 0.2, 3.4, 0.16], [s * 7.4, 2.05, -3.6, 1.4, 0.06]], { color: NAVY, ...C })),   // the swing wings, half back
  ...pair((s) => surface([[s * 1.8, 1.9, -7.4, 2.0, 0.08], [s * 4.6, 1.85, -8.8, 0.8, 0.04]], { color: NAVY, ...C })),
  ...pair((s) => fin([[2.2, -5.4, 2.4, 0.1, s * 1.5], [3.2, -6.6, 1.8, 0.08, s * 1.62], [4.9, -8.1, 0.9, 0.05, s * 1.75]], { color: NAVY, ...C })),
  ...pair((s) => missile(s * 0.7, 1.15, -2.6, 1.4, 0.19, WHITE)),                                                     // Phoenix under the belly
  ...pair((s) => missile(s * 2.8, 1.55, -1.0, 1.8, 0.1, WHITE)),
  ...pair((s) => mark('us', s * 2.18, 1.75, -4.5, 0.32)),
]), { gun: [0, 1.6, 6.5] });

export const buildA6 = (mats) => mount('a6', mats, () => M([
  body([[8.2, 1.7, 0.1, 0.1], [7.6, 1.75, 0.8, 0.8], [5.5, 1.8, 1.0, 1.0], [3.0, 1.85, 0.95, 0.9], [-1.0, 1.9, 0.85, 0.8], [-5.0, 2.0, 0.45, 0.45], [-8.2, 2.1, 0.2, 0.2]], { color: NAVY, ...C }),
  body([[5.6, 2.55, 0.1, 0.1], [4.8, 2.9, 0.9, 0.42], [3.2, 2.95, 0.9, 0.42], [2.2, 2.7, 0.7, 0.25]], { color: GLASS }),       // side by side
  P.cyl(0.07, 0.07, 3, { x: 0, y: 2.9, z: 7.4, rx: Math.PI / 2 - 0.15, color: DARK }, 6),                            // the refuelling probe
  ...pair((s) => body([[2.2, 1.45, 0.5, 0.5], [-3.8, 1.5, 0.48, 0.48], [-4.6, 1.55, 0.3, 0.3]], { x: s * 0.95, color: NAVY, ...C })),
  ...pair((s) => surface([[s * 0.8, 2.1, 0.0, 3.6, 0.2], [s * 8.1, 2.2, -2.6, 1.3, 0.07]], { color: NAVY, ...C })),
  ...pair((s) => surface([[s * 0.4, 2.3, -6.8, 1.8, 0.07], [s * 3.4, 2.3, -7.8, 0.8, 0.04]], { color: NAVY, ...C })),
  fin([[2.4, -5.6, 2.4, 0.1], [4.5, -7.2, 1.2, 0.06]], { color: NAVY, ...C }),
  ...pair((s) => [3.4, 5.6].map((x) => missile(s * x, 1.5, -2.6, 1.0, 0.17, WHITE))),                                // four Harpoons
  ...pair((s) => mark('us', s * 1.0, 1.9, -3.0, 0.32)),
]), { gun: [0, 1.4, 7] });

export const buildE2 = (mats) => mount('e2', mats, () => M([
  body([[8.4, 2.0, 0.2, 0.3], [7.4, 2.05, 0.9, 1.0], [4.0, 2.1, 1.2, 1.25], [-2.0, 2.2, 1.0, 1.05], [-6.5, 2.5, 0.45, 0.5], [-8.6, 2.7, 0.25, 0.3]], { color: NAVY, ...C }),
  body([[8.0, 2.75, 0.2, 0.15], [7.2, 3.05, 0.85, 0.4], [5.8, 3.0, 0.8, 0.35]], { color: GLASS }),
  ...pair((s) => surface([[s * 0.8, 2.9, 1.2, 3.0, 0.3], [s * 12.3, 2.9, 0.4, 1.6, 0.12]], { color: NAVY, ...C })),
  ...pair((s) => nacelle(s * 3.4, 2.6, 4.2, -1.2, 0.6, NAVY)),
  ...pair((s) => strut2([0, 3.2, -1.0], [s * 0.1, 4.6, -1.8])),
  P.cyl(3.65, 3.65, 0.75, { y: 5.0, z: -2.0, color: WHITE, surf: 'paint' }, 28),                                     // the rotodome
  P.cyl(3.7, 3.7, 0.08, { y: 5.0, z: -2.0, color: NAVY_DK }, 28),
  surface([[-4.0, 3.2, -7.8, 1.6, 0.08], [4.0, 3.2, -7.8, 1.6, 0.08]], { color: NAVY, ...C }),
  ...[-4, -1.4, 1.4, 4].map((x) => fin([[0.4, -7.8, 1.6, 0.08, x], [3.2, -8.0, 1.1, 0.06, x]], { color: NAVY, ...C }).translate(0, 3.0, 0)),
  ...pair((s) => mark('us', s * 1.3, 2.2, -4.0, 0.36)),
]), { gun: [0, 1.6, 7], props: [[-3.4, 2.6, 4.7], [3.4, 2.6, 4.7]], blades: 4, r: 2.1 });
function strut2(a, b) { const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); const e = new THREE.Euler().setFromQuaternion(q); return P.cyl(0.25, 0.3, d.length(), { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: (a[2] + b[2]) / 2, rx: e.x, ry: e.y, rz: e.z, color: NAVY }, 8); }

const orion = (color, kind, { len, wingZ, span, mad }) => M([
  body([[len * 0.5, 2.4, 0.3, 0.4], [len * 0.47, 2.45, 1.2, 1.3], [len * 0.4, 2.5, 1.6, 1.65], [-len * 0.25, 2.55, 1.6, 1.65], [-len * 0.42, 2.9, 0.8, 0.9], [-len * 0.5, 3.2, 0.3, 0.35]], { color, ...C }),
  body([[len * 0.49, 3.3, 0.3, 0.2], [len * 0.46, 3.6, 1.1, 0.4], [len * 0.42, 3.55, 1.1, 0.35]], { color: GLASS }),
  ...pair((s) => surface([[s * 1.4, 2.0, wingZ, 4.6, 0.45], [s * span / 2, 2.6, wingZ - 1.6, 1.8, 0.15]], { color, ...C })),
  ...pair((s) => [0.33, 0.62].map((k) => nacelle(s * span / 2 * k, 2.2, wingZ + 4.6, wingZ - 2.6, 0.7, color))),
  surface([[-6.0, 3.3, -len * 0.45, 3.0, 0.15], [6.0, 3.3, -len * 0.45, 3.0, 0.15]], { color, ...C }),
  fin([[0.5, -len * 0.42, 4.6, 0.18], [5.2, -len * 0.47, 2.2, 0.1]], { color, ...C }).translate(0, 3.0, 0),
  ...(mad ? [P.cyl(0.18, 0.28, 4.2, { y: 3.3, z: -len * 0.5 - 1.8, rx: Math.PI / 2, color })] : []),
  ...pair((s) => mark(kind, s * 1.62, 2.6, -len * 0.3, 0.5)),
]);
export const buildP3 = (mats) => mount('p3', mats, () => orion(NAVY, 'us', { len: 33, wingZ: 2.2, span: 30, mad: true }), { gun: [0, 1.5, 12], props: [[-4.9, 2.2, 7.3], [-9.3, 2.2, 7.3], [4.9, 2.2, 7.3], [9.3, 2.2, 7.3]], blades: 4, r: 2.1 });

// ---------------------------------------------------------------- Soviet Navy (AV-MF)

export const buildTu22M = (mats) => mount('tu22m', mats, () => M([
  body([[21, 2.2, 0.05, 0.05], [19.5, 2.25, 0.8, 0.85], [16, 2.3, 1.1, 1.15], [12, 2.35, 1.2, 1.25], [4, 2.4, 2.2, 1.3, 3], [-10, 2.5, 2.1, 1.25, 3], [-17, 2.6, 1.6, 1.0, 3], [-20.5, 2.6, 1.3, 0.8]], { color: BACKFIRE, ...C }),
  body([[16.6, 3.1, 0.2, 0.15], [15.2, 3.45, 0.9, 0.4], [13.2, 3.4, 0.9, 0.35]], { color: GLASS }),
  ...pair((s) => P.box(1.3, 1.9, 0.004, { x: s * 1.9, y: 2.4, z: 9.1, color: HOLE })),                                // the big intakes
  ...pair((s) => body([[9.2, 2.4, 0.75, 1.0, 3], [2, 2.4, 0.8, 1.05, 3]], { x: s * 1.9, color: BACKFIRE, ...C })),
  ...pair((s) => P.cyl(0.85, 0.8, 1.2, { x: s * 1.0, y: 2.45, z: -20.6, rx: Math.PI / 2, color: DARK }, 14)),
  ...pair((s) => surface([[s * 2.0, 2.9, 2.0, 9.0, 0.35], [s * 6.5, 2.9, -1.0, 5.4, 0.25]], { color: BACKFIRE, ...C })),   // the fixed gloves
  ...pair((s) => surface([[s * 6.4, 2.85, -2.2, 4.2, 0.2], [s * 15.5, 2.6, -11.0, 1.8, 0.08]], { color: BACKFIRE, ...C })),  // the wings swept back
  ...pair((s) => surface([[s * 1.6, 2.7, -16.8, 4.6, 0.14], [s * 7.6, 2.6, -19.6, 1.8, 0.06]], { color: BACKFIRE, ...C })),
  fin([[3.5, -13.5, 7.0, 0.22], [8.2, -18.0, 3.0, 0.12], [9.4, -19.2, 1.6, 0.07]], { color: BACKFIRE, ...C }),
  ...pair((s) => missile(s * 5.2, 1.7, -3.5, 7.5, 0.48, 0xd0d0c8)),                                                  // a Kh-22 under each glove
  ...pair((s) => mark('sov', s * 0.32, 5.6, -16.4, 0.6)),
]), { gun: [0, 2.4, -21] });

export const buildYak38 = (mats) => mount('yak38', mats, () => M([
  body([[8.2, 1.9, 0.05, 0.05], [7.2, 1.92, 0.4, 0.45], [5.0, 1.95, 0.7, 0.75], [1.0, 2.0, 0.95, 0.85], [-4.0, 2.05, 0.7, 0.65], [-7.8, 2.15, 0.3, 0.3]], { color: SOV_NAVY, ...C }),
  body([[5.4, 2.55, 0.05, 0.05], [4.6, 2.85, 0.4, 0.33], [3.4, 2.85, 0.38, 0.3], [2.6, 2.65, 0.25, 0.2]], { color: GLASS }),
  ...pair((s) => P.box(0.6, 0.9, 0.004, { x: s * 0.95, y: 2.0, z: 3.1, color: HOLE })),
  ...pair((s) => body([[3.2, 2.0, 0.4, 0.55], [-1.0, 2.0, 0.42, 0.6]], { x: s * 0.85, color: SOV_NAVY, ...C })),
  ...pair((s) => P.cyl(0.4, 0.42, 0.9, { x: s * 0.9, y: 1.25, z: -1.2, color: DARK }, 10)),                           // the vectoring nozzles
  ...pair((s) => surface([[s * 0.9, 2.3, -0.6, 2.8, 0.14], [s * 3.6, 2.15, -2.0, 1.2, 0.06]], { color: SOV_NAVY, ...C })),
  ...pair((s) => surface([[s * 0.4, 2.2, -6.6, 1.4, 0.06], [s * 2.1, 2.2, -7.3, 0.7, 0.04]], { color: SOV_NAVY, ...C })),
  fin([[2.6, -5.2, 2.2, 0.09], [4.4, -6.6, 1.0, 0.05]], { color: SOV_NAVY, ...C }),
  ...pair((s) => missile(s * 2.6, 1.85, -2.0, -0.4, 0.08, WHITE)),
  ...pair((s) => mark('sov', s * 0.06, 3.6, -5.6, 0.32)),
]), { gun: [0, 1.6, 5.5] });

export const buildIl38 = (mats) => mount('il38', mats, () => orion(SOV_NAVY, 'sov', { len: 38, wingZ: 6.0, span: 37, mad: true }), { gun: [0, 1.5, 14], props: [[-6.1, 2.2, 11.1], [-11.5, 2.2, 11.1], [6.1, 2.2, 11.1], [11.5, 2.2, 11.1]], blades: 4, r: 2.2 });

export const buildTu95 = (mats) => mount('tu95', mats, () => M([
  body([[24, 2.8, 0.4, 0.5], [22, 2.85, 1.3, 1.4], [16, 2.9, 1.5, 1.55], [-14, 3.0, 1.45, 1.5], [-21, 3.3, 0.8, 0.9], [-24.5, 3.6, 0.3, 0.3]], { color: SOV_NAVY, ...C }),
  body([[23, 3.9, 0.3, 0.2], [21.4, 4.25, 1.1, 0.4], [19.6, 4.2, 1.1, 0.35]], { color: GLASS }),
  body([[6, 1.4, 1.6, 0.4], [3, 0.9, 2.6, 0.9], [-1, 1.2, 1.8, 0.5]], { color: SOV_NAVY, ...C }),                     // the belly radome (Big Bulge)
  ...pair((s) => surface([[s * 1.5, 2.6, 4.0, 7.0, 0.5], [s * 25, 2.0, -12, 2.6, 0.15]], { color: SOV_NAVY, ...C })),
  ...pair((s) => [0.3, 0.6].map((k) => nacelle(s * 25 * k, 2.6, 6.5 - k * 16, 0.5 - k * 16, 0.85, SOV_NAVY))),
  ...pair((s) => surface([[s * 1.2, 3.4, -19, 4.0, 0.2], [s * 7.0, 3.4, -22.5, 1.8, 0.08]], { color: SOV_NAVY, ...C })),
  fin([[3.4, -17.5, 6.0, 0.24], [9.0, -22.5, 2.6, 0.12]], { color: SOV_NAVY, ...C }),
  ...pair((s) => mark('sov', s * 0.4, 7.2, -20.5, 0.65)),
]), { gun: [0, 2.6, -25], props: [[-7.5, 2.6, 2.5], [-15, 2.6, -2.3], [7.5, 2.6, 2.5], [15, 2.6, -2.3]], blades: 4, r: 2.8, contra: true });

// ---------------------------------------------------------------- ships' helicopters (KINDS.helo)
//   SH-60B Seahawk  the Hawk in Navy grey: the chin radome, the sonobuoy launcher on the left, the MAD bird
//                   on its pylon, the canted tail rotor
//   Ka-27 Helix     the short boxy Kamov: two three-blade rotors one above the other turning opposite ways
//                   (no tail rotor), the twin fins, the radar under the chin
import { blades } from './airKit.js';
const HAWK = [[3.9, 1.5, 0.15, 0.3], [3.4, 1.55, 0.6, 0.65], [2.6, 1.65, 0.95, 0.85, 3], [1.2, 1.7, 1.08, 0.95, 3.2], [-1.6, 1.75, 1.05, 0.95, 3.2], [-3.0, 1.95, 0.6, 0.6], [-5.5, 2.25, 0.3, 0.32], [-8.6, 2.5, 0.2, 0.25]];
const HELIX = [[3.4, 1.6, 0.3, 0.5], [2.8, 1.7, 0.95, 0.9, 3], [1.6, 1.8, 1.15, 1.0, 3.5], [-1.8, 1.85, 1.15, 1.0, 3.5], [-2.8, 2.05, 0.7, 0.6], [-5.6, 2.35, 0.32, 0.3]];
const helo = {};
/** A helicopter rig (aircraft.js contract): body, main rotor (and a second, coaxial, turning the other way), tail rotor. */
function heloRig(key, mats, make) {
  const m = (helo[key] ??= make());
  const root = new THREE.Group();
  meshAdder(root)(m.body, mats.body);
  const rotor = new THREE.Group(); rotor.position.set(...m.rotorAt); meshAdder(rotor)(m.rotor, mats.body); root.add(rotor);
  let rotor2 = null, tailRotor = null;
  if (m.rotor2At) { rotor2 = new THREE.Group(); rotor2.position.set(...m.rotor2At); meshAdder(rotor2)(m.rotor, mats.body); root.add(rotor2); }
  if (m.tailAt) { tailRotor = new THREE.Group(); tailRotor.position.set(...m.tailAt); tailRotor.rotation.z = 0.35; meshAdder(tailRotor)(m.tail, mats.body, false); root.add(tailRotor); }
  return { root, rotor, rotor2, tailRotor, rotorRadius: m.r, blades: m.n, gun: point(root, 0, 1.2, 3), pods: [], doors: [] };
}
export const buildSH60 = (mats) => heloRig('sh60', mats, () => ({
  body: M([
    body(HAWK, { color: NAVY, ...C }),
    body([[3.0, 2.0, 0.25, 0.2], [2.4, 2.35, 0.8, 0.38], [1.9, 2.3, 0.8, 0.3]], { color: GLASS }),
    body([[3.4, 0.95, 0.2, 0.15], [2.9, 0.85, 0.55, 0.32], [2.2, 0.95, 0.5, 0.25]], { color: NAVY_DK }),                 // the chin radome
    body([[1.6, 2.6, 0.8, 0.28, 3], [0.6, 2.72, 0.85, 0.4, 3], [-1.2, 2.7, 0.8, 0.38, 3], [-2.3, 2.5, 0.5, 0.2, 3]], { color: NAVY, ...C }),
    P.cyl(0.24, 0.26, 0.6, { y: 3.2, z: -0.2, color: DARK }, 10),
    P.box(0.5, 0.9, 1.6, { x: -1.15, y: 1.6, z: -1.2, color: NAVY_DK }),                                                 // the sonobuoy launcher
    P.box(0.08, 0.08, 1.4, { x: 1.2, y: 1.9, z: -2.2, color: DARK }), P.capsule(0.12, 0.7, { x: 1.35, y: 1.9, z: -3.0, rx: Math.PI / 2, color: 0xd8b830 }), // the MAD bird
    fin([[2.2, -8.8, 0.55, 0.14], [3.2, -9.2, 0.45, 0.12], [3.7, -9.45, 0.3, 0.08]], { color: NAVY, ...C }),
    surface([[-2.0, 2.1, -8.6, 0.42, 0.05], [2.0, 2.1, -8.6, 0.42, 0.05]], { color: NAVY, ...C }),
    ...pair((s) => P.cyl(0.3, 0.3, 0.2, { x: s * 1.3, y: 0.3, z: 1.9, rz: Math.PI / 2, color: 0x1d1d1b, surf: 'rubber' }, 12)),
    P.cyl(0.22, 0.22, 0.14, { y: 0.24, z: -2.6, rz: Math.PI / 2, color: 0x1d1d1b, surf: 'rubber' }, 10),             // (the tailwheel well forward: a deck landing)
    ...pair((s) => mark('us', s * 1.07, 1.6, -0.6, 0.3)),
  ]),
  rotor: merge([...blades(4, 8.1, 0.55, 0x2a2c2a), P.cyl(0.36, 0.36, 0.25, { color: DARK }, 10)]), rotorAt: [0, 3.55, -0.2], r: 8.1, n: 4,
  tail: merge([P.box(0.05, 3.3, 0.24, { color: 0x2a2c2a }), P.box(0.05, 0.24, 3.3, { color: 0x2a2c2a })]), tailAt: [0.3, 3.3, -9.3],
}));
export const buildKa27 = (mats) => heloRig('ka27', mats, () => ({
  body: M([
    body(HELIX, { color: SOV_NAVY, ...C }),
    body([[3.2, 2.1, 0.3, 0.2], [2.6, 2.5, 1.0, 0.4], [2.0, 2.45, 1.0, 0.32]], { color: GLASS }),
    P.sphere(0.7, { y: 0.9, z: 2.6, sy: 0.55, color: SOV_NAVY }, 12, 8),                                                 // the radar under the chin
    body([[1.2, 2.85, 0.75, 0.35, 3], [-1.6, 2.9, 0.8, 0.4, 3], [-2.4, 2.7, 0.5, 0.2, 3]], { color: SOV_NAVY, ...C }),
    P.cyl(0.25, 0.25, 1.4, { y: 3.6, z: 0.0, color: DARK }, 10),                                                         // the coaxial mast
    surface([[-1.6, 2.4, -5.4, 0.7, 0.06], [1.6, 2.4, -5.4, 0.7, 0.06]], { color: SOV_NAVY, ...C }),
    ...pair((s) => fin([[0.0, -5.4, 0.9, 0.08, s * 1.6], [1.2, -5.6, 0.7, 0.06, s * 1.6]], { color: SOV_NAVY, ...C }).translate(0, 1.9, 0)),
    ...pair((s) => P.cyl(0.32, 0.32, 0.22, { x: s * 1.3, y: 0.32, z: 1.6, rz: Math.PI / 2, color: 0x1d1d1b, surf: 'rubber' }, 12)),
    ...pair((s) => P.cyl(0.32, 0.32, 0.22, { x: s * 1.3, y: 0.32, z: -1.6, rz: Math.PI / 2, color: 0x1d1d1b, surf: 'rubber' }, 12)),
    ...pair((s) => mark('sov', s * 0.06, 2.6, -5.6, 0.3)),
  ]),
  rotor: merge([...blades(3, 7.95, 0.5, 0x2a2c2a), P.cyl(0.34, 0.34, 0.25, { color: DARK }, 10)]), rotorAt: [0, 3.9, 0], rotor2At: [0, 4.75, 0], r: 7.95, n: 3,
}));
