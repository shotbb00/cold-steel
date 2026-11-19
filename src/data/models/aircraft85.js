// The aircraft of the Northern Flank and Korea, 1985 (data/air.ts, the no / usmc / rok / kpa entries) that
// no other table already has, swept from cross-sections like the rest (airKit.js), metres, nose +z:
//   F-5E Tiger II   the ROK Air Force's fighter-bomber: the long sharp nose with the two M39 guns on top, the
//                   small canopy, the intakes on the sides behind it, the thin trapezoid wing with the leading-
//                   edge extensions and the Sidewinders on its tips, the two J85 nozzles side by side; rocket pods
//   RF-5A           the Freedom Fighter with the camera nose (Norway's 717 Squadron, the ROK's reconnaissance flight)
//   AV-8B Harrier II the Marines' jump jet, new in 1985: the high wing drooping to its tips, the big intakes beside
//                   the raised canopy, the four swivelling nozzles under the wing roots, the GAU-12 pods under the
//                   belly, Rockeye cluster bombs on the pylons
//   CH-46E Sea Knight the Marines' assault transport: the long box of a fuselage, a three-blade rotor at each end
//                   (the rear one high on its pylon, the engines either side of it), the sponsons with the main
//                   wheels, the rear ramp, a .50 cal in the crew door
//   500MD Defender  the ROK Army's TOW helicopter, built under licence by Korean Air: the glazed egg, the TOW
//                   sight in the nose, two tubes a side on the outrigger, the T-tail, skids
//   F-16A / Su-7BMK (strike) the F-16 of aircraft2027.js with Mk 82s on its pylons; the Su-7 is the Su-22M4 of
//                   armyAircraft.js (the same Sukhoi airframe — swept back for the run, the swing wings are the Su-7's)
// Contract: aircraft.js.
import * as THREE from 'three';
import { P, merge, pair, limb } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';
import { body, surface, fin, blades, rocketPod, missile } from './airKit.js';
import { buildF16 } from './aircraft2027.js';

const GREY = 0x6e7479;
const SEA = 0x50573b;       // South-East Asia camouflage's green
const MARINE = 0x45503a;
const OD = 0x3c4530;
const GLASS = 0x1b2126;
const STEEL = 0x2a2c28;
const BLADE = 0x24271f;
const HOLE = 0x141414;
const TYRE = 0x1d1d1b;
const DARK = 0x2a2c28;
const WHITE = 0xd8d6cc;
const BOMB = 0x4a4f3c;
const C = { camo: 1 };
const M = (parts) => merge(parts.flat(Infinity));

const point = (root, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); return o; };
const roundel = (x, y, z, r, up = false) => P.cyl(r, r, 0.02, up ? { x, y, z } : { x, y, z, rz: Math.PI / 2 }, 14);
const wheel = (x, y, z, r = 0.3, w = 0.18) => P.cyl(r, r, w, { x, y, z, rz: Math.PI / 2, color: TYRE, surf: 'rubber' }, 12);
/** A low-drag bomb (Mk 82, Rockeye) from z0 back to the nose at z1. */
const bomb = (x, y, z0, z1, r) => [
  body([[z1, y, r * 0.3, r * 0.3], [z1 - r * 1.5, y, r, r], [z0 + r * 2, y, r, r], [z0, y, r * 0.45, r * 0.45]], { x, color: BOMB }, 10),
  ...[0, 1].map((k) => P.box(k ? 0.02 : r * 3, k ? r * 3 : 0.02, 0.3, { x, y, z: z0 + 0.15, color: BOMB })),
];

const cache = {};
/** A jet: body (painted), marks (the side's colour), the gun's muzzle, the pods the rockets / bombs leave from. */
function jet(key, mats, make, gun, pods = []) {
  const m = (cache[key] ??= make());
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(m.body, mats.body);
  if (m.marks) add(m.marks, mats.glow, false);
  return { root, gun: point(root, ...gun), pods: pods.map((p) => point(root, ...p)), jet: true };
}
/** A helicopter: body, marks, the main rotor (and a tandem's rear one, turning the other way), the tail rotor. */
function heli(key, mats, make, o) {
  const m = (cache[key] ??= make());
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(m.body, mats.body);
  if (m.marks) add(m.marks, mats.glow, false);
  const spinner = (at, geo, shadow = true) => { const g = new THREE.Group(); g.position.set(...at); meshAdder(g)(geo, mats.body, shadow); root.add(g); return g; };
  return {
    root, rotor: spinner(o.rotorAt, m.rotor), rotor2: o.rotor2At ? spinner(o.rotor2At, m.rotor) : null, tailRotor: o.tailAt ? spinner(o.tailAt, m.tailRotor, false) : null,
    gun: point(root, ...o.gun), pods: [], rotorRadius: o.radius, blades: o.blades, doors: o.doors ?? [],
  };
}

// ---------------------------------------------------------------- F-5E Tiger II, RF-5A

function f5(recon) {
  const c = { color: SEA, ...C };
  const nose = recon // the RF-5A's camera nose: blunter and deeper
    ? [[7.3, 1.8, 0.12, 0.12, 3], [6.7, 1.8, 0.36, 0.34, 3.2], [5.4, 1.82, 0.48, 0.46, 3]]
    : [[7.3, 1.75, 0.03, 0.03], [6.6, 1.78, 0.24, 0.18], [5.4, 1.82, 0.42, 0.38]];
  return {
    body: M([
      body([...nose, [4.2, 1.85, 0.52, 0.52], [3.0, 1.85, 0.56, 0.6, 2.6], [1.0, 1.8, 0.75, 0.6, 2.8], [-2.0, 1.78, 0.82, 0.55, 3], [-5.0, 1.8, 0.75, 0.5, 3], [-6.8, 1.82, 0.7, 0.45, 3]], c),
      ...(recon ? [...pair((s) => P.box(0.02, 0.24, 0.4, { x: s * 0.42, y: 1.78, z: 6.0, color: GLASS })), P.box(0.3, 0.02, 0.4, { y: 1.34, z: 5.9, color: GLASS })] // camera windows
        : pair((s) => P.cyl(0.03, 0.03, 0.6, { x: s * 0.2, y: 2.0, z: 5.5, rx: Math.PI / 2, color: STEEL }, 6))),                  // the two M39 guns
      // the J85s' nozzles side by side
      ...pair((s) => P.cyl(0.3, 0.28, 0.5, { x: s * 0.34, y: 1.82, z: -7.0, rx: Math.PI / 2, color: DARK }, 12)),
      ...pair((s) => P.cyl(0.24, 0.24, 0.02, { x: s * 0.34, y: 1.82, z: -7.26, rx: Math.PI / 2, color: HOLE }, 12)),
      // the intakes on the sides behind the cockpit
      ...pair((s) => body([[2.4, 1.7, 0.22, 0.35, 3], [1.8, 1.7, 0.28, 0.4, 3], [-1.5, 1.72, 0.28, 0.4, 3], [-2.8, 1.75, 0.15, 0.25]], { x: s * 0.75, ...c })),
      ...pair((s) => P.box(0.36, 0.62, 0.004, { x: s * 0.77, y: 1.7, z: 2.403, color: HOLE })),
      // canopy, spine
      body([[4.6, 2.25, 0.05, 0.05], [4.1, 2.5, 0.3, 0.28], [3.3, 2.58, 0.32, 0.3], [2.6, 2.45, 0.24, 0.18], [2.1, 2.3, 0.1, 0.07]], { color: GLASS }),
      body([[2.6, 2.35, 0.25, 0.18], [0.0, 2.4, 0.32, 0.2], [-4.5, 2.3, 0.25, 0.12]], c),
      // the leading-edge extensions, the thin wing, the tailplanes, the fin
      ...pair((s) => surface([[s * 0.6, 1.8, 1.9, 1.0, 0.04], [s * 0.95, 1.78, 0.6, 0.4, 0.03]], c)),
      ...pair((s) => surface([[s * 0.7, 1.7, -1.2, 1.6, 0.12], [s * 4.0, 1.7, -2.6, 0.55, 0.04]], c)),
      ...pair((s) => surface([[s * 0.5, 1.85, -5.9, 0.8, 0.05], [s * 2.2, 1.85, -6.5, 0.35, 0.03]], c)),
      fin([[2.2, -4.6, 1.2, 0.08], [3.0, -5.4, 0.9, 0.07], [4.0, -6.3, 0.4, 0.04]], c),
      // Sidewinders on the wingtips, the centreline tank; the fighter-bomber's rocket pods
      ...pair((s) => missile(s * 4.05, 1.7, -3.5, -1.2, 0.065, WHITE)),
      body([[1.0, 0.95, 0.05, 0.05], [0.4, 0.95, 0.26, 0.26], [-2.4, 0.95, 0.26, 0.26], [-3.0, 0.95, 0.06, 0.06]], { color: WHITE }),
      P.box(0.08, 0.3, 1.2, { y: 1.2, z: -0.8, color: DARK }),
      ...(recon ? [] : [
        ...pair((s) => P.box(0.08, 0.3, 1.2, { x: s * 2.4, y: 1.55, z: -1.9, color: DARK })),
        ...pair((s) => rocketPod(s * 2.4, 1.32, -2.6, -0.9, 0.2, 0x5a5e52)),
      ]),
    ]),
    marks: M([...pair((s) => roundel(s * 0.09, 3.2, -5.4, 0.3)), ...pair((s) => roundel(s * 2.9, 1.76, -2.2, 0.3, true))]),
  };
}
export const buildF5E = (mats) => jet('f5e', mats, () => f5(false), [0, 2.0, 5.85], [[-2.4, 1.32, -0.9], [2.4, 1.32, -0.9]]);
export const buildRF5A = (mats) => jet('rf5a', mats, () => f5(true), [0, 1.4, 6.0]);

// ---------------------------------------------------------------- F-16A with Mk 82s (Norway)

let MK82 = null;
export function buildF16Strike(mats) {
  const r = buildF16(mats);
  MK82 ??= M(pair((s) => bomb(s * 2.6, 1.48, -2.8, -0.6, 0.14)));
  meshAdder(r.root)(MK82, mats.body);
  return { ...r, pods: [point(r.root, -2.6, 1.48, -0.6), point(r.root, 2.6, 1.48, -0.6)] };
}

// ---------------------------------------------------------------- AV-8B Harrier II

export const buildAV8B = (mats) => jet('av8b', mats, () => {
  const c = { color: MARINE, ...C };
  return {
    body: M([
      body([[7.0, 1.6, 0.03, 0.03], [6.3, 1.62, 0.3, 0.32], [5.2, 1.68, 0.48, 0.55], [4.0, 1.72, 0.55, 0.65], [2.5, 1.75, 0.7, 0.75, 2.6], [0.0, 1.8, 0.85, 0.85, 2.8],
        [-2.5, 1.85, 0.7, 0.7, 2.6], [-5.0, 2.05, 0.4, 0.42], [-6.6, 2.2, 0.2, 0.25], [-7.1, 2.25, 0.08, 0.1]], c),
      // the raised bubble canopy, the hump behind it
      body([[4.6, 2.3, 0.05, 0.05], [4.0, 2.65, 0.38, 0.4], [3.0, 2.78, 0.4, 0.42], [2.2, 2.6, 0.3, 0.25], [1.6, 2.45, 0.15, 0.1]], { color: GLASS }),
      body([[2.2, 2.4, 0.4, 0.25], [0.0, 2.55, 0.6, 0.35], [-3.0, 2.4, 0.4, 0.25], [-5.0, 2.3, 0.2, 0.1]], c),
      // the big intakes beside the cockpit, the four nozzles under the wing roots
      ...pair((s) => body([[2.6, 1.75, 0.3, 0.6, 3], [2.1, 1.75, 0.38, 0.65, 3], [0.0, 1.72, 0.4, 0.62, 3], [-1.0, 1.7, 0.3, 0.5]], { x: s * 0.9, ...c })),
      ...pair((s) => P.box(0.5, 1.0, 0.004, { x: s * 0.92, y: 1.75, z: 2.603, color: HOLE })),
      ...pair((s) => [0.8, -0.9].map((z) => P.cyl(0.22, 0.25, 0.55, { x: s * 0.95, y: 1.2, z, rx: 0.35, color: DARK }, 12))),
      // the high wing drooping to the tips, the drooping tailplane, the fin
      ...pair((s) => surface([[s * 0.4, 2.55, -0.6, 1.9, 0.16], [s * 4.6, 2.0, -2.6, 0.6, 0.05]], c)),
      ...pair((s) => surface([[s * 0.3, 2.2, -5.6, 0.9, 0.06], [s * 2.1, 1.95, -6.3, 0.4, 0.03]], c)),
      fin([[2.4, -4.8, 1.1, 0.08], [3.0, -5.4, 0.9, 0.07], [3.55, -6.0, 0.5, 0.05]], c),
      // the GAU-12 in the left belly pod, its ammunition in the right
      ...pair((s) => body([[1.5, 0.9, 0.05, 0.05], [1.1, 0.9, 0.2, 0.2], [-1.8, 0.9, 0.22, 0.22], [-2.3, 0.9, 0.08, 0.08]], { x: s * 0.45, ...c })),
      P.cyl(0.035, 0.035, 0.5, { x: -0.45, y: 0.9, z: 1.6, rx: Math.PI / 2, color: STEEL }, 6),
      // Rockeyes on the inner pylons, Sidewinders outboard
      ...pair((s) => P.box(0.08, 0.35, 1.2, { x: s * 2.2, y: 2.2, z: -1.4, color: DARK })),
      ...pair((s) => bomb(s * 2.2, 1.9, -2.4, -0.4, 0.2)),
      ...pair((s) => P.box(0.08, 0.35, 1.0, { x: s * 3.3, y: 1.95, z: -1.9, color: DARK })),
      ...pair((s) => missile(s * 3.3, 1.72, -3.0, -0.8, 0.065, WHITE)),
    ]),
    marks: M([...pair((s) => roundel(s * 0.09, 3.0, -5.3, 0.28)), ...pair((s) => roundel(s * 3.6, 2.2, -2.1, 0.3, true))]),
  };
}, [-0.45, 0.9, 1.9], [[-2.2, 1.9, -0.4], [2.2, 1.9, -0.4]]);

// ---------------------------------------------------------------- CH-46E Sea Knight

const SEA_KNIGHT = [[6.6, 1.6, 0.3, 0.5, 2.2], [6.2, 1.75, 0.85, 0.95, 2.6], [5.2, 1.95, 1.0, 1.1, 3.5], [2.0, 2.0, 1.05, 1.15, 4], [-3.5, 2.05, 1.05, 1.15, 4], [-5.5, 2.4, 0.95, 0.9, 3.5], [-7.0, 2.85, 0.7, 0.5, 3]];
export const buildCH46 = (mats) => heli('ch46', mats, () => {
  const c = { color: OD, ...C };
  return {
    body: M([
      body(SEA_KNIGHT, c),
      // the windscreens and the chin windows
      ...pair((s) => P.box(0.7, 0.55, 0.04, { x: s * 0.42, y: 2.35, z: 6.35, rx: -0.75, ry: s * 0.25, color: GLASS })),
      ...pair((s) => P.box(0.45, 0.3, 0.04, { x: s * 0.45, y: 1.35, z: 6.55, rx: 0.5, color: GLASS })),
      ...pair((s) => P.box(0.04, 0.5, 0.7, { x: s * 1.0, y: 2.4, z: 5.4, color: GLASS })),
      // round windows along the cabin, the crew door on the right with its .50 cal
      ...[3.2, 1.8, 0.4, -1.0, -2.4].flatMap((z) => pair((s) => P.cyl(0.18, 0.18, 0.04, { x: s * 1.05, y: 2.35, z, rz: Math.PI / 2, color: GLASS }, 10))),
      P.box(0.04, 1.4, 0.9, { x: 1.05, y: 1.85, z: 4.3, color: 0x2d3424 }),
      P.box(0.1, 0.12, 1.2, { x: 1.12, y: 2.15, z: 4.4, color: STEEL }),
      // the forward rotor's pylon over the cockpit, the rear pylon tall at the back, the engines either side of it
      body([[6.0, 3.0, 0.4, 0.2], [5.2, 3.2, 0.55, 0.35], [4.0, 3.15, 0.5, 0.3], [3.4, 3.05, 0.3, 0.1]], c),
      P.cyl(0.2, 0.24, 0.8, { y: 3.8, z: 5.0, color: STEEL }, 10),
      fin([[3.0, -3.8, 1.5, 0.5], [4.3, -4.8, 1.05, 0.45], [4.6, -5.1, 0.7, 0.35]], c),
      P.cyl(0.2, 0.24, 0.5, { y: 4.8, z: -5.2, color: STEEL }, 10),
      ...pair((s) => body([[-2.8, 3.3, 0.25, 0.25], [-3.2, 3.35, 0.38, 0.38], [-5.2, 3.35, 0.38, 0.38], [-5.6, 3.3, 0.25, 0.25]], { x: s * 0.85, ...c })),
      ...pair((s) => P.cyl(0.22, 0.22, 0.02, { x: s * 0.85, y: 3.35, z: -2.79, rx: Math.PI / 2, color: HOLE }, 10)),
      ...pair((s) => P.cyl(0.2, 0.2, 0.02, { x: s * 0.85, y: 3.33, z: -5.61, rx: Math.PI / 2, color: HOLE }, 10)),
      // the rear ramp's seam, the sponsons with the main wheels, the twin nose wheels
      P.box(1.4, 0.04, 1.6, { y: 2.15, z: -6.2, rx: -0.33, color: 0x2d3424 }),
      ...pair((s) => body([[-1.0, 0.95, 0.15, 0.3], [-1.6, 0.95, 0.4, 0.4], [-4.0, 0.95, 0.4, 0.4], [-4.6, 0.95, 0.15, 0.25]], { x: s * 1.05, ...c })),
      ...pair((s) => wheel(s * 1.3, 0.38, -3.0, 0.38, 0.22)),
      limb([0, 1.0, 4.6], [0, 0.3, 4.6], [[0, 0.06, 0.06], [1, 0.05, 0.05]], { color: STEEL }),
      ...[-0.12, 0.12].map((x) => wheel(x, 0.28, 4.6, 0.28, 0.15)),
    ]),
    marks: M([...pair((s) => P.box(0.02, 0.35, 0.9, { x: s * 1.06, y: 1.55, z: 0.4 }))]),
    rotor: M([...blades(3, 7.62, 0.47, BLADE, 0.4), P.cyl(0.32, 0.32, 0.3, { color: STEEL }, 10)]),
  };
}, { rotorAt: [0, 4.3, 5.0], rotor2At: [0, 5.1, -5.2], gun: [1.12, 2.15, 5.0], radius: 7.62, blades: 3,
  doors: [new THREE.Vector3(0, 0, -8.5), new THREE.Vector3(1.6, 0, 4.3)] });

// ---------------------------------------------------------------- 500MD Defender (TOW)

export const buildMD500 = (mats) => heli('md500', mats, () => {
  const c = { color: OD, ...C };
  return {
    body: M([
      // the glazed front of the egg, the cabin, the slim boom
      body([[1.9, 1.2, 0.1, 0.1, 2], [1.75, 1.25, 0.45, 0.5, 2], [1.3, 1.32, 0.62, 0.66, 2.2], [0.8, 1.35, 0.66, 0.7, 2.3]], { color: GLASS }),
      body([[0.85, 1.35, 0.66, 0.7, 2.3], [0.0, 1.38, 0.68, 0.72, 2.4], [-0.9, 1.45, 0.6, 0.62, 2.3], [-1.5, 1.6, 0.3, 0.3], [-1.8, 1.7, 0.14, 0.14], [-4.8, 1.8, 0.1, 0.1], [-5.1, 1.82, 0.08, 0.08]], c),
      P.box(0.04, 0.8, 0.04, { y: 1.55, z: 1.62, rx: -0.7, color: OD }),                                 // the windscreen's centre post
      ...pair((s) => P.box(0.03, 0.6, 0.04, { x: s * 0.67, y: 1.4, z: 0.6, color: OD })),                // the door frames
      // the engine fairing behind the rotor, the exhaust, the mast
      body([[0.4, 2.0, 0.35, 0.1], [0.0, 2.15, 0.42, 0.2], [-1.0, 2.1, 0.38, 0.18], [-1.4, 1.95, 0.2, 0.08]], c),
      P.cyl(0.08, 0.1, 0.25, { y: 1.95, z: -1.45, rx: Math.PI / 2, color: STEEL }, 8),
      P.cyl(0.09, 0.11, 0.35, { y: 2.3, color: STEEL }, 10),
      // the TOW sight in the nose, the outrigger with two tubes a side
      P.sphere(0.2, { y: 1.05, z: 1.95, sy: 0.9, color: DARK }, 10, 8),
      P.box(0.16, 0.12, 0.02, { y: 1.05, z: 2.14, color: GLASS }),
      P.box(2.6, 0.1, 0.18, { y: 0.95, z: -0.3, color: STEEL }),
      ...pair((s) => [1.05, 1.25].flatMap((x) => [
        P.cyl(0.1, 0.1, 1.3, { x: s * x, y: 1.1, z: -0.2, rx: Math.PI / 2, color: 0x4a5236 }, 10),
        P.cyl(0.08, 0.08, 0.02, { x: s * x, y: 1.1, z: 0.455, rx: Math.PI / 2, color: HOLE }, 10),
      ])),
      // skids, the T-tail with its end plates and the ventral fin, the tail rotor's gearbox
      ...pair((s) => P.cyl(0.04, 0.04, 2.4, { x: s * 0.85, y: 0.05, z: 0.0, rx: Math.PI / 2, color: STEEL }, 6)),
      ...pair((s) => [0.7, -0.7].map((z) => limb([s * 0.45, 0.9, z], [s * 0.85, 0.05, z], [[0, 0.04, 0.04], [1, 0.035, 0.035]], { color: STEEL }))),
      fin([[1.7, -4.6, 0.3, 0.03], [2.5, -4.85, 0.2, 0.025]], c),
      fin([[1.3, -4.75, 0.15, 0.02], [1.75, -4.6, 0.2, 0.03]], c),
      surface([[-0.85, 2.45, -4.85, 0.2, 0.02], [0, 2.5, -4.85, 0.22, 0.03], [0.85, 2.45, -4.85, 0.2, 0.02]], c),
      ...pair((s) => fin([[2.3, -4.85, 0.14, 0.02, s * 0.85], [2.62, -4.88, 0.12, 0.02, s * 0.85]], c)),
      P.cyl(0.06, 0.06, 0.2, { x: -0.1, y: 1.85, z: -4.95, rz: Math.PI / 2, color: STEEL }, 8),
    ]),
    marks: M([...pair((s) => P.box(0.02, 0.16, 0.4, { x: s * 0.105, y: 1.8, z: -3.0 }))]),
    rotor: M([...blades(4, 4.03, 0.2, BLADE, 0.25), P.cyl(0.14, 0.14, 0.16, { color: STEEL }, 10)]),
    tailRotor: M([P.box(0.03, 1.3, 0.12, { color: BLADE, surf: 'paint' }), P.cyl(0.05, 0.05, 0.08, { rz: Math.PI / 2, color: STEEL }, 8)]),
  };
}, { rotorAt: [0, 2.5, 0], tailAt: [-0.22, 1.85, -4.95], gun: [1.15, 1.1, 0.45], radius: 4.03, blades: 4 });
