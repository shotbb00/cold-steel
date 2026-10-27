// The second support power's machines (data/air.ts, systems/AirStrike.js), every part swept from
// its cross-sections (airKit.js) so they hold up from the side and from behind, not only head-on:
//   ground-attack jets for the gun run — NATO A-10A Thunderbolt II (the GAU-8 under the nose,
//   the bubble canopy, the straight wing with its drooped tips, gear pods and pylons of
//   Mavericks and an ECM pod, the TF34 engine pods high on the rear fuselage, the tailplane with
//   its twin fins) and Pact Su-25 Grach (the long pointed nose, the small armoured canopy and the
//   spine behind it, engines in nacelles along the fuselage, the swept shoulder wing with the
//   split airbrake pods at the tips, B-8 rocket pods and R-60s, the tall single fin);
//   transport helicopters for the air assault — NATO UH-60A Black Hawk (the low wide cabin, the
//   flat glazed nose, twin engines on top, the tail pylon with the canted tail rotor and the
//   stabilator, fixed gear, door guns) and Pact Mi-8 Hip (the big rounded pod with its glazed
//   nose, the engine cowling on top, round windows, external fuel tanks, the rear clamshell
//   doors, outriggers with UB-32 pods, tricycle gear, five-blade rotor).
// Contract: build(mats) → { root, gun (Object3D at the muzzle), pods: [Object3D…],
//   rotor / tailRotor (helicopters: groups that spin), rotorRadius, blades, doors (helicopters:
//   where the squad jumps out, in model space) }
import * as THREE from 'three';
import { P, merge, pair, limb } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';
import { body, surface, fin, blades, rocketPod, missile } from './airKit.js';

const GREY = 0x4d5547;      // A-10 "Lizard" dark grey-green
const GREY_DK = 0x353b31;
const SU_GREEN = 0x55603c;
const SU_SAND = 0x8a7a55;
const OD = 0x3c4530;
const OD_DK = 0x2d3424;
const HIP = 0x4f5a36;
const GLASS = 0x1b2126;
const STEEL = 0x2a2c28;
const BLADE = 0x24271f;
const HOLE = 0x141414;
const TYRE = 0x1d1d1b;
const C = { camo: 1 };

const point = (root, x, y, z) => {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  root.add(o);
  return o;
};

// ---------------------------------------------------------------- A-10A

let A10 = null;
export function buildNatoA10(mats) {
  A10 ??= {
    body: merge([
      body([
        [8.1, -0.05, 0.12, 0.14], [7.7, 0.0, 0.45, 0.5], [7.0, 0.08, 0.62, 0.72], [6.1, 0.15, 0.74, 0.88],
        [5.0, 0.22, 0.8, 0.98, 2.6], [3.4, 0.22, 0.82, 0.95, 2.6], [1.0, 0.15, 0.8, 0.88, 2.6], [-1.5, 0.2, 0.72, 0.8, 2.6],
        [-3.6, 0.32, 0.6, 0.66], [-5.6, 0.45, 0.42, 0.5], [-7.4, 0.6, 0.2, 0.3], [-8.0, 0.65, 0.05, 0.08],
      ], { color: GREY, ...C }),
      // bubble canopy, its windscreen frame, the spine behind it
      body([[5.95, 1.0, 0.05, 0.05], [5.5, 1.22, 0.4, 0.3], [4.8, 1.38, 0.45, 0.4], [4.0, 1.38, 0.42, 0.38], [3.4, 1.2, 0.22, 0.18]], { color: GLASS }),
      body([[5.52, 1.2, 0.43, 0.33], [5.4, 1.24, 0.44, 0.35]], { color: GREY_DK }),
      body([[3.6, 1.05, 0.3, 0.2], [2.0, 1.05, 0.35, 0.2], [0.0, 0.95, 0.3, 0.15]], { color: GREY, ...C }),
      // GAU-8 under the nose, offset to the left of the nose gear
      P.cyl(0.2, 0.22, 0.6, { x: 0.1, y: -0.48, z: 7.9, rx: Math.PI / 2, color: STEEL }, 12),
      ...[0, 1, 2, 3, 4, 5, 6].map((k) => P.cyl(0.03, 0.03, 0.5, { x: 0.1 + Math.sin(k * 0.9) * 0.13, y: -0.48 + Math.cos(k * 0.9) * 0.13, z: 8.4, rx: Math.PI / 2, color: STEEL }, 5)),
      // the straight wing: thick inner panels, outer panels with a little dihedral, drooped tips
      ...pair((s) => surface([[s * 0.6, -0.4, 0.7, 1.6, 0.2], [s * 3.0, -0.38, 0.65, 1.45, 0.17], [s * 7.8, -0.18, 0.55, 0.95, 0.1], [s * 8.5, -0.24, 0.55, 0.85, 0.06], [s * 8.8, -0.38, 0.55, 0.7, 0.03]], { color: GREY, ...C })),
      ...pair((s) => body([[2.6, -0.62, 0.12, 0.12], [2.2, -0.68, 0.3, 0.28], [0.8, -0.68, 0.32, 0.3], [-0.6, -0.6, 0.2, 0.18]], { x: s * 2.2, color: GREY, ...C })), // gear pods
      // TF34s high on the rear fuselage on their pylons, intakes and exhausts
      ...pair((s) => body([[-1.55, 1.3, 0.6, 0.6, 2], [-1.75, 1.3, 0.66, 0.66, 2], [-3.4, 1.3, 0.66, 0.66, 2], [-4.9, 1.3, 0.55, 0.55, 2], [-5.4, 1.3, 0.45, 0.45, 2]], { x: s * 1.55, color: GREY, ...C })),
      ...pair((s) => P.cyl(0.52, 0.52, 0.04, { x: s * 1.55, y: 1.3, z: -1.56, rx: Math.PI / 2, color: HOLE }, 14)),
      ...pair((s) => P.cyl(0.4, 0.4, 0.04, { x: s * 1.55, y: 1.3, z: -5.42, rx: Math.PI / 2, color: HOLE }, 14)),
      ...pair((s) => P.box(0.2, 0.6, 1.6, { x: s * 0.95, y: 0.95, z: -3.4, rz: s * -0.5, color: GREY, ...C })),
      // tailplane and twin fins at its tips
      surface([[-2.9, 0.62, -6.6, 0.75, 0.08], [0, 0.62, -6.4, 0.95, 0.1], [2.9, 0.62, -6.6, 0.75, 0.08]], { color: GREY, ...C }),
      ...pair((s) => fin([[0.2, -6.6, 0.95, 0.08, s * 2.9], [1.6, -6.7, 0.85, 0.07, s * 2.9], [2.55, -6.8, 0.6, 0.05, s * 2.9], [2.75, -6.85, 0.25, 0.03, s * 2.9]], { color: GREY, ...C })),
      // pylons with Mavericks and an ECM pod
      ...[-5.4, -4.2, 4.2, 5.4].map((x) => P.box(0.1, 0.3, 1.3, { x, y: -0.55, z: 0.8, color: GREY_DK })),
      ...[-5.4, -4.2, 4.2].flatMap((x) => missile(x, -0.85, -0.3, 1.9, 0.15, 0x7a7a6e, GREY_DK)),
      ...rocketPod(5.4, -0.85, -0.4, 1.7, 0.16, 0x5a5e52),
      // the nose gear, retracted, its doors; refuelling slot and the pitot
      P.box(0.4, 0.08, 1.2, { x: -0.25, y: -0.72, z: 6.0, color: GREY_DK }),
      P.cyl(0.015, 0.015, 0.9, { x: 0.45, y: 0.1, z: 8.0, rx: Math.PI / 2, color: STEEL }, 4),
    ]),
    marks: merge([...pair((s) => P.cyl(0.4, 0.4, 0.02, { x: s * 6.5, y: -0.22, z: 0.6 }, 5))]),
  };
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(A10.body, mats.body);
  add(A10.marks, mats.glow, false);
  return { root, gun: point(root, 0.1, -0.48, 8.7), pods: [point(root, -4.2, -0.85, 1.9), point(root, 5.4, -0.85, 1.7)], jet: true };
}

// ---------------------------------------------------------------- Su-25

let SU25 = null;
export function buildPactSu25(mats) {
  SU25 ??= {
    body: merge([
      body([
        [7.9, 0.1, 0.05, 0.05], [7.4, 0.08, 0.22, 0.25], [6.6, 0.1, 0.4, 0.45], [5.6, 0.18, 0.52, 0.62], [4.6, 0.25, 0.6, 0.75, 2.5],
        [3.4, 0.25, 0.62, 0.78, 2.5], [1.6, 0.22, 0.58, 0.72, 2.5], [-1.0, 0.28, 0.5, 0.62], [-3.8, 0.38, 0.42, 0.52], [-6.2, 0.5, 0.3, 0.4], [-7.3, 0.55, 0.12, 0.18],
      ], { color: SU_GREEN, ...C }),
      P.cyl(0.012, 0.012, 1.2, { x: 0.0, y: 0.1, z: 8.4, rx: Math.PI / 2, color: STEEL }, 4),                  // pitot boom
      // the small armoured canopy, its frame, the spine behind it
      body([[5.35, 0.85, 0.05, 0.05], [4.95, 1.02, 0.34, 0.24], [4.3, 1.12, 0.37, 0.3], [3.55, 1.02, 0.25, 0.16]], { color: GLASS }),
      body([[4.98, 1.0, 0.36, 0.26], [4.88, 1.04, 0.37, 0.27]], { color: 0x3a4428 }),
      body([[3.7, 0.9, 0.25, 0.18], [1.0, 0.95, 0.3, 0.22], [-3.0, 0.8, 0.22, 0.15]], { color: SU_GREEN, ...C }),
      // engines in nacelles along the fuselage: intakes beside the cockpit, nozzles at the tail
      ...pair((s) => body([[2.6, 0.02, 0.42, 0.5, 3], [2.4, 0.02, 0.5, 0.58, 2.6], [0.0, 0.02, 0.52, 0.6, 2.4], [-3.4, 0.08, 0.45, 0.5], [-4.4, 0.12, 0.36, 0.38]], { x: s * 0.95, color: SU_GREEN, ...C })),
      ...pair((s) => P.box(0.6, 0.7, 0.04, { x: s * 0.97, y: 0.02, z: 2.61, color: HOLE })),
      ...pair((s) => P.cyl(0.32, 0.32, 0.04, { x: s * 0.95, y: 0.12, z: -4.42, rx: Math.PI / 2, color: HOLE }, 12)),
      // the swept, tapered shoulder wing, a little anhedral; the split airbrake pods at the tips
      ...pair((s) => surface([[s * 0.9, 0.55, 0.5, 1.7, 0.18], [s * 3.6, 0.47, -0.4, 1.25, 0.13], [s * 7.0, 0.36, -1.45, 0.72, 0.07]], { color: SU_GREEN, ...C })),
      ...pair((s) => body([[-0.6, 0.36, 0.06, 0.08], [-0.9, 0.36, 0.13, 0.2], [-2.3, 0.36, 0.13, 0.2], [-2.55, 0.36, 0.08, 0.04]], { x: s * 7.15, color: SU_GREEN, ...C })),
      // tailplane on the fuselage, the tall swept fin
      surface([[-2.5, 0.85, -6.7, 0.45, 0.05], [0, 0.85, -6.1, 0.85, 0.08], [2.5, 0.85, -6.7, 0.45, 0.05]], { color: SU_GREEN, ...C }),
      fin([[0.7, -5.6, 1.35, 0.09], [2.0, -6.3, 0.95, 0.07], [3.2, -6.95, 0.55, 0.05], [3.35, -7.05, 0.3, 0.03]], { color: SU_GREEN, ...C }),
      // pylons with B-8 rocket pods and R-60s
      ...[-4.6, -2.8, 2.8, 4.6].map((x) => P.box(0.1, 0.25, 1.1, { x, y: 0.22, z: 0.3 - Math.abs(x) * 0.25, color: 0x3a4428 })),
      ...[-4.6, -2.8, 2.8, 4.6].flatMap((x) => rocketPod(x, -0.12, -0.9 - Math.abs(x) * 0.25, 1.4 - Math.abs(x) * 0.25, 0.25, 0x5a5e52)),
      ...pair((s) => missile(s * 6.2, 0.12, -2.4, -0.6, 0.065, 0x9a9a90)).flat(),
      // GSh-30-2 in its fairing under the left of the nose
      body([[6.3, -0.42, 0.06, 0.06], [5.9, -0.45, 0.12, 0.1], [4.6, -0.42, 0.14, 0.1]], { x: -0.32, color: 0x3a4428 }),
      ...[-0.04, 0.04].map((dx) => P.cyl(0.03, 0.03, 0.5, { x: -0.32 + dx, y: -0.45, z: 6.5, rx: Math.PI / 2, color: STEEL }, 5)),
    ]),
    marks: merge([...pair((s) => P.cyl(0.38, 0.38, 0.02, { x: s * 0.085, y: 1.9, z: -6.35, rz: Math.PI / 2 }, 5))]),
  };
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(SU25.body, mats.body);
  add(SU25.marks, mats.glow, false);
  return { root, gun: point(root, -0.32, -0.45, 6.8), pods: [point(root, -4.6, -0.12, 0.3), point(root, 4.6, -0.12, 0.3)], jet: true };
}

// ---------------------------------------------------------------- UH-60A

let UH60 = null;
export function buildNatoUH60(mats) {
  UH60 ??= {
    body: merge([
      // the low, wide cabin and nose; the boom running back to the tail pylon
      body([
        [3.95, 1.2, 0.28, 0.28, 2.6], [3.55, 1.3, 0.72, 0.55, 2.8], [2.8, 1.48, 0.98, 0.8, 3], [1.8, 1.58, 1.1, 0.95, 3.2],
        [-1.4, 1.58, 1.1, 0.95, 3.2], [-2.4, 1.8, 0.86, 0.72, 3], [-3.4, 2.05, 0.46, 0.46, 2.4], [-8.2, 2.3, 0.26, 0.32, 2.4], [-8.9, 2.4, 0.18, 0.22, 2.4],
      ], { color: OD }),
      // windscreen and the cockpit's chin windows, cabin and door windows
      ...pair((s) => P.box(0.85, 0.62, 0.04, { x: s * 0.45, y: 1.95, z: 3.05, rx: -0.62, ry: s * 0.25, color: GLASS })),
      ...pair((s) => P.box(0.04, 0.55, 0.85, { x: s * 1.06, y: 1.8, z: 2.55, ry: s * -0.12, color: GLASS })),
      ...pair((s) => P.box(0.5, 0.3, 0.04, { x: s * 0.45, y: 0.9, z: 3.3, rx: 0.5, color: GLASS })),
      ...pair((s) => P.box(0.04, 0.5, 0.7, { x: s * 1.12, y: 1.85, z: 1.0, color: GLASS })),
      ...pair((s) => P.box(0.04, 0.5, 0.6, { x: s * 1.12, y: 1.85, z: -0.4, color: GLASS })),
      ...pair((s) => P.box(0.03, 1.4, 0.03, { x: s * 1.12, y: 1.5, z: 1.55, color: OD_DK })),               // door rails
      // engines, transmission fairing and exhausts on top; the mast
      body([[1.6, 2.6, 0.8, 0.28, 3], [0.6, 2.72, 0.85, 0.4, 3], [-1.2, 2.7, 0.8, 0.38, 3], [-2.3, 2.5, 0.5, 0.2, 3]], { color: OD }),
      ...pair((s) => body([[0.9, 2.75, 0.22, 0.22, 2], [-1.6, 2.75, 0.25, 0.25, 2], [-2.2, 2.75, 0.2, 0.2, 2]], { x: s * 0.6, color: OD })),
      ...pair((s) => P.cyl(0.2, 0.2, 0.03, { x: s * 0.6, y: 2.75, z: 0.92, rx: Math.PI / 2, color: HOLE }, 10)),
      ...pair((s) => P.box(0.2, 0.22, 0.4, { x: s * 0.75, y: 2.8, z: -2.2, ry: s * 0.6, color: STEEL })),
      P.cyl(0.24, 0.26, 0.6, { y: 3.2, z: -0.2, color: STEEL }, 10),
      // tail pylon, stabilator, tailwheel
      fin([[2.2, -8.8, 0.55, 0.14], [3.2, -9.2, 0.45, 0.12], [3.7, -9.45, 0.3, 0.08]], { color: OD }),
      surface([[-2.2, 1.95, -8.6, 0.42, 0.05], [0, 1.95, -8.6, 0.45, 0.06], [2.2, 1.95, -8.6, 0.42, 0.05]], { color: OD }),
      limb([0, 2.2, -7.5], [0, 0.95, -7.7], [[0, 0.06, 0.06], [1, 0.05, 0.05]], { color: STEEL }),
      P.cyl(0.2, 0.2, 0.12, { y: 0.2, z: -7.7, rz: Math.PI / 2, color: TYRE, surf: 'rubber' }, 12),
      // fixed main gear on its struts, the door guns, the step and antennas
      ...pair((s) => limb([s * 0.85, 0.95, 2.1], [s * 1.3, 0.35, 2.0], [[0, 0.06, 0.06], [1, 0.05, 0.05]], { color: STEEL })),
      ...pair((s) => P.cyl(0.33, 0.33, 0.2, { x: s * 1.35, y: 0.33, z: 2.0, rz: Math.PI / 2, color: TYRE, surf: 'rubber' }, 14)),
      ...pair((s) => P.box(0.06, 0.08, 1.0, { x: s * 1.25, y: 1.85, z: 1.4, ry: s * 0.4, color: STEEL })),
      P.cyl(0.01, 0.01, 0.9, { y: 2.6, z: -4.5, rx: -0.4, color: STEEL }, 4),
    ]),
    marks: merge([P.box(0.02, 0.3, 0.7, { x: 1.115, y: 1.15, z: -0.8 })]),
    rotor: merge([...blades(4, 8.1, 0.55, BLADE), P.cyl(0.36, 0.36, 0.25, { color: STEEL }, 10)]),
    tailRotor: merge([P.box(0.05, 3.3, 0.24, { color: BLADE, surf: 'paint' }), P.box(0.05, 0.24, 3.3, { color: BLADE, surf: 'paint' }), P.cyl(0.12, 0.12, 0.12, { rz: Math.PI / 2, color: STEEL }, 8)]),
  };
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(UH60.body, mats.body);
  add(UH60.marks, mats.glow, false);
  const rotor = new THREE.Group();
  rotor.position.set(0, 3.55, -0.2);
  meshAdder(rotor)(UH60.rotor, mats.body);
  root.add(rotor);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.3, 3.3, -9.3);
  tailRotor.rotation.z = 0.35; // canted
  meshAdder(tailRotor)(UH60.tailRotor, mats.body, false);
  root.add(tailRotor);
  return {
    root, rotor, tailRotor, rotorRadius: 8.1, blades: 4,
    gun: point(root, 1.3, 1.85, 1.9),
    pods: [],
    doors: [new THREE.Vector3(-1.6, 0, 0.2), new THREE.Vector3(1.6, 0, 0.2)],
  };
}

// ---------------------------------------------------------------- Mi-8

let MI8 = null;
export function buildPactMi8(mats) {
  MI8 ??= {
    body: merge([
      // the glazed nose, then the big rounded pod; the boom up to the fin
      body([[5.55, 1.72, 0.3, 0.3, 2], [5.2, 1.76, 0.85, 0.82, 2], [4.6, 1.82, 1.12, 1.08, 2.1], [4.3, 1.85, 1.18, 1.14, 2.2]], { color: GLASS }),
      body([
        [4.35, 1.85, 1.18, 1.15, 2.2], [3.4, 1.9, 1.26, 1.25, 2.3], [-2.0, 1.9, 1.26, 1.25, 2.3], [-3.0, 2.0, 1.18, 1.12, 2.3],
        [-3.7, 2.25, 0.75, 0.75], [-4.5, 2.5, 0.46, 0.46], [-9.0, 2.8, 0.26, 0.26], [-9.7, 2.9, 0.2, 0.2],
      ], { color: HIP }),
      body([[4.25, 2.85, 0.4, 0.25, 2.2], [4.2, 2.95, 0.5, 0.2, 2.2]], { color: HIP }),                    // brow over the glazing
      // the engine cowling on top: twin intakes, exhausts out to the sides
      body([[3.6, 3.1, 0.75, 0.38, 3], [3.0, 3.2, 0.85, 0.48, 3], [-0.6, 3.2, 0.85, 0.48, 3], [-1.6, 3.05, 0.55, 0.3, 3]], { color: HIP }),
      ...pair((s) => P.cyl(0.32, 0.32, 0.04, { x: s * 0.45, y: 3.15, z: 3.62, rx: Math.PI / 2, color: HOLE }, 12)),
      ...pair((s) => body([[-0.2, 3.1, 0.2, 0.2, 2], [-1.0, 3.1, 0.22, 0.22, 2]], { x: s * 0.95, color: STEEL })),
      // round windows, the sliding door, the rear clamshell doors
      ...[-1.5, -0.6, 0.3, 1.2, 2.1].flatMap((z) => pair((s) => P.cyl(0.22, 0.22, 0.04, { x: s * 1.25, y: 2.15, z, rz: Math.PI / 2, color: GLASS }, 12))),
      P.box(0.03, 1.5, 1.3, { x: 1.26, y: 1.75, z: 2.9, color: 0x3c4529 }),
      ...pair((s) => P.box(0.03, 1.7, 0.03, { x: s * 0.55, y: 1.8, z: -3.25, rx: -0.4, color: 0x3c4529 })),
      // external fuel tanks on both sides, the weapon outriggers with UB-32 pods
      ...pair((s) => body([[0.9, 1.2, 0.18, 0.2], [0.6, 1.2, 0.38, 0.42], [-1.1, 1.2, 0.38, 0.42], [-1.4, 1.2, 0.18, 0.2]], { x: s * 1.45, color: HIP })),
      ...pair((s) => surface([[s * 1.2, 1.45, 0.4, 0.3, 0.05], [s * 2.6, 1.25, 0.4, 0.25, 0.04]], { color: HIP })),
      ...pair((s) => limb([s * 1.2, 0.9, 0.4], [s * 2.6, 1.2, 0.4], [[0, 0.04, 0.04], [1, 0.04, 0.04]], { color: STEEL })),
      ...pair((s) => rocketPod(s * 2.45, 0.95, -0.4, 1.3, 0.25, 0x5a5e52)).flat(),
      // tricycle gear: the twin nose wheels, the main legs out on their struts
      ...[-0.2, 0.2].map((x) => P.cyl(0.3, 0.3, 0.18, { x, y: 0.3, z: 3.9, rz: Math.PI / 2, color: TYRE, surf: 'rubber' }, 12)),
      limb([0, 0.85, 3.9], [0, 0.3, 3.9], [[0, 0.07, 0.07], [1, 0.06, 0.06]], { color: STEEL }),
      ...pair((s) => limb([s * 1.0, 1.0, -0.6], [s * 1.75, 0.4, -0.6], [[0, 0.07, 0.07], [1, 0.06, 0.06]], { color: STEEL })),
      ...pair((s) => limb([s * 1.2, 1.3, 0.2], [s * 1.75, 0.45, -0.6], [[0, 0.05, 0.05], [1, 0.05, 0.05]], { color: STEEL })),
      ...pair((s) => P.cyl(0.4, 0.4, 0.25, { x: s * 1.8, y: 0.4, z: -0.6, rz: Math.PI / 2, color: TYRE, surf: 'rubber' }, 14)),
      // tail: fin with the rotor on its left, the small stabiliser, the boom's tail skid
      fin([[2.8, -9.2, 0.6, 0.12], [3.8, -9.6, 0.5, 0.1], [4.4, -9.9, 0.32, 0.07]], { color: HIP }),
      surface([[-1.2, 2.7, -8.2, 0.35, 0.04], [0, 2.7, -8.2, 0.38, 0.05], [1.2, 2.7, -8.2, 0.35, 0.04]], { color: HIP }),
      limb([0, 2.6, -8.6], [0, 1.7, -8.9], [[0, 0.04, 0.04], [1, 0.035, 0.035]], { color: STEEL }),
      P.cyl(0.28, 0.3, 0.7, { y: 3.65, z: 1.0, color: STEEL }, 10),                                         // mast
      P.cyl(0.04, 0.04, 0.6, { x: 0.3, y: 1.35, z: 5.4, rx: Math.PI / 2, color: STEEL }, 6),               // the nose PK
    ]),
    marks: merge([...pair((s) => P.cyl(0.4, 0.4, 0.02, { x: s * 0.42, y: 2.65, z: -5.6, rz: Math.PI / 2 }, 5))]),
    rotor: merge([...blades(5, 10.6, 0.55, BLADE, 0.5), P.cyl(0.45, 0.45, 0.3, { color: STEEL }, 10)]),
    tailRotor: merge([P.box(0.05, 3.9, 0.3, { color: BLADE, surf: 'paint' }), P.box(0.05, 0.3, 3.9, { color: BLADE, surf: 'paint' }), P.box(0.05, 2.75, 0.3, { rx: 0.785, color: BLADE, surf: 'paint' }), P.cyl(0.14, 0.14, 0.14, { rz: Math.PI / 2, color: STEEL }, 8)]),
  };
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(MI8.body, mats.body);
  add(MI8.marks, mats.glow, false);
  const rotor = new THREE.Group();
  rotor.position.set(0, 4.05, 1.0);
  meshAdder(rotor)(MI8.rotor, mats.body);
  root.add(rotor);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(-0.3, 3.8, -9.6);
  meshAdder(tailRotor)(MI8.tailRotor, mats.body, false);
  root.add(tailRotor);
  return {
    root, rotor, tailRotor, rotorRadius: 10.6, blades: 5,
    gun: point(root, 0.3, 1.35, 5.75),        // the nose PK
    pods: [point(root, -2.45, 0.95, 1.4), point(root, 2.45, 0.95, 1.4)],
    doors: [new THREE.Vector3(1.6, 0, 2.9), new THREE.Vector3(0, 0, -4.4)],
  };
}
