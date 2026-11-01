// The Bundeswehr's and the NVA's own aircraft (data/air.ts, bw / nva entries), built like
// aircraft.js from swept cross-sections (airKit.js):
//   PAH-1        the Heeresflieger's BO-105 anti-tank helicopter: the glazed egg of a cabin, the
//                roof sight over the gunner, three HOT tubes a side on the outrigger, skids, the
//                slim boom with the end-plated stabiliser, four-blade hingeless rotor
//   Alpha Jet A  the Luftwaffe's close-support jet: tandem stepped canopy, engines along the
//                fuselage sides, the swept shoulder wing with anhedral, the 27 mm Mauser gun pod
//                under the belly, rocket pods on the wing pylons
//   UH-1D        the Heer's transport helicopter: the boxy cabin with its big doors and chin
//                windows, the engine on the roof, the long boom with the elevator, two-blade rotor
//                and its stabiliser bar, skids, an MG3 in the door
//   Su-22M4      the NVA's fighter-bomber: the long fuselage with the nose intake and its shock
//                cone, the big dorsal spine, the swing wings swept back for the run, the tall fin
//                and the ventral fin, the NR-30 cannon in the wing roots, UB-32 pods on the pylons
// Contract: aircraft.js.
import * as THREE from 'three';
import { P, merge, pair, limb } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';
import { body, surface, fin, blades, rocketPod } from './airKit.js';

const BW = 0x3b4a2c;        // the Heeresflieger in the army's three-tone (paint does the rest)
const LW = 0x4e5440;        // Luftwaffe Norm 72: yellow-olive and basalt grey
const NVA = 0x4f5a36;
const NVA_DK = 0x3c4529;
const GLASS = 0x1b2126;
const STEEL = 0x2a2c28;
const BLADE = 0x24271f;
const HOLE = 0x141414;
const TYRE = 0x1d1d1b;
const WHITE = 0xd8d6cc;
const BLACK = 0x161616;
const C = { camo: 1 };

const point = (root, x, y, z) => {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  root.add(o);
  return o;
};

/** The Bundeswehr's Balkenkreuz on a side (facing ±x): the black cross with its white edges. */
const balken = (x, y, z, k) => [
  P.box(0.02, 0.62 * k, 0.2 * k, { x, y, z, color: WHITE }), P.box(0.02, 0.2 * k, 0.62 * k, { x, y, z, color: WHITE }),
  P.box(0.03, 0.54 * k, 0.12 * k, { x, y, z, color: BLACK }), P.box(0.03, 0.12 * k, 0.54 * k, { x, y, z, color: BLACK }),
];

/** A helicopter's rig from its geometry: rotor and tail rotor groups at their hubs. */
function heli(g, mats, { rotorAt, tailAt, tailCant = 0 }) {
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(g.body, mats.body);
  if (g.marks) add(g.marks, mats.glow, false);
  const rotor = new THREE.Group();
  rotor.position.set(...rotorAt);
  meshAdder(rotor)(g.rotor, mats.body);
  root.add(rotor);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(...tailAt);
  tailRotor.rotation.z = tailCant;
  meshAdder(tailRotor)(g.tailRotor, mats.body, false);
  root.add(tailRotor);
  return { root, rotor, tailRotor };
}

// ---------------------------------------------------------------- PAH-1

let PAH = null;
export function buildBwPAH1(mats) {
  PAH ??= {
    body: merge([
      // the glazed front of the egg, the cabin, the clamshell doors at the back, the slim boom
      body([[2.6, 1.25, 0.1, 0.1, 2], [2.4, 1.28, 0.52, 0.52, 2], [1.85, 1.38, 0.74, 0.72, 2.2], [1.25, 1.42, 0.8, 0.78, 2.3]], { color: GLASS }),
      body([
        [1.3, 1.42, 0.8, 0.78, 2.3], [0.0, 1.45, 0.8, 0.8, 2.6], [-1.3, 1.5, 0.75, 0.72, 2.6], [-2.0, 1.65, 0.45, 0.42],
        [-2.4, 1.8, 0.22, 0.22], [-5.6, 1.95, 0.15, 0.15], [-6.0, 2.0, 0.12, 0.12],
      ], { color: BW, ...C }),
      P.box(0.05, 0.9, 0.05, { y: 1.6, z: 2.15, rx: -0.6, color: BW }),                                  // the windscreen's centre post
      ...pair((s) => P.box(0.04, 0.75, 0.05, { x: s * 0.76, y: 1.5, z: 1.25, color: BW })),             // the door frames
      ...pair((s) => P.box(0.03, 0.55, 0.7, { x: s * 0.79, y: 1.55, z: 0.35, color: GLASS })),          // the rear doors' windows
      // the engines and transmission under their fairing, exhausts, the mast
      body([[0.9, 2.2, 0.45, 0.15, 2.6], [0.3, 2.35, 0.5, 0.3, 2.6], [-1.2, 2.32, 0.45, 0.28, 2.6], [-1.9, 2.18, 0.25, 0.12, 2.6]], { color: BW, ...C }),
      ...pair((s) => P.cyl(0.1, 0.12, 0.35, { x: s * 0.3, y: 2.45, z: -1.95, rx: -1.2, color: STEEL }, 8)),
      P.cyl(0.11, 0.13, 0.5, { y: 2.8, color: STEEL }, 10),
      // the gunner's roof sight (SFIM APX 397) on its post
      P.cyl(0.06, 0.08, 0.3, { x: 0.38, y: 2.3, z: 1.25, color: STEEL }, 8),
      body([[1.45, 2.5, 0.12, 0.12], [1.3, 2.5, 0.16, 0.15], [1.05, 2.5, 0.14, 0.13]], { x: 0.38, color: STEEL }),
      P.box(0.2, 0.16, 0.02, { x: 0.38, y: 2.5, z: 1.47, color: GLASS }),
      // the HOT outrigger: three tubes a side on the beam across the cabin floor
      P.box(3.7, 0.1, 0.18, { y: 1.0, z: -0.2, color: STEEL }),
      ...pair((s) => [1.2, 1.43, 1.66].flatMap((x) => [
        P.cyl(0.1, 0.1, 1.45, { x: s * x, y: 1.16, z: -0.15, rx: Math.PI / 2, color: 0x4a5236 }, 10),
        P.cyl(0.08, 0.08, 0.02, { x: s * x, y: 1.16, z: 0.585, rx: Math.PI / 2, color: HOLE }, 10),
      ])).flat(),
      // skids on their cross tubes
      ...pair((s) => P.cyl(0.04, 0.04, 3.2, { x: s * 0.95, y: 0.05, z: 0.1, rx: Math.PI / 2, color: STEEL }, 6)),
      ...pair((s) => limb([s * 0.95, 0.05, 1.7], [s * 0.95, 0.3, 2.05], [[0, 0.04, 0.04], [1, 0.04, 0.04]], { color: STEEL })),
      ...pair((s) => [0.85, -0.85].map((z) => limb([s * 0.55, 0.8, z], [s * 0.95, 0.05, z], [[0, 0.045, 0.045], [1, 0.04, 0.04]], { color: STEEL }))).flat(),
      // the stabiliser with its end plates, the fin, the tail rotor's gearbox
      surface([[-1.0, 1.9, -5.0, 0.25, 0.03], [0, 1.9, -5.0, 0.28, 0.04], [1.0, 1.9, -5.0, 0.25, 0.03]], { color: BW, ...C }),
      ...pair((s) => fin([[1.72, -5.0, 0.22, 0.03, s * 1.0], [2.15, -5.05, 0.18, 0.02, s * 1.0]], { color: BW, ...C })),
      fin([[1.9, -5.75, 0.35, 0.05], [2.7, -6.1, 0.25, 0.04], [3.0, -6.25, 0.15, 0.03]], { color: BW, ...C }),
      P.cyl(0.08, 0.08, 0.25, { x: -0.12, y: 2.6, z: -6.05, rz: Math.PI / 2, color: STEEL }, 8),
      ...pair((s) => balken(s * 0.2, 1.9, -3.6, 0.5)).flat(),
      P.cyl(0.006, 0.006, 0.8, { y: 2.6, z: -2.6, rx: -0.5, color: STEEL }, 4),                           // the whip antenna
    ]),
    rotor: merge([...blades(4, 4.9, 0.27, BLADE, 0.3), P.cyl(0.2, 0.2, 0.22, { color: STEEL }, 10)]),
    tailRotor: merge([P.box(0.04, 1.9, 0.16, { color: BLADE, surf: 'paint' }), P.cyl(0.07, 0.07, 0.1, { rz: Math.PI / 2, color: STEEL }, 8)]),
  };
  const r = heli(PAH, mats, { rotorAt: [0, 3.05, 0], tailAt: [-0.27, 2.6, -6.05] });
  return { ...r, rotorRadius: 4.9, blades: 4, gun: point(r.root, 1.43, 1.16, 0.6), pods: [] };
}

// ---------------------------------------------------------------- Alpha Jet A

let ALPHA = null;
export function buildBwAlphaJet(mats) {
  ALPHA ??= {
    body: merge([
      body([
        [6.3, 1.6, 0.05, 0.05], [5.8, 1.6, 0.25, 0.25], [4.8, 1.65, 0.45, 0.48], [3.8, 1.7, 0.55, 0.6], [2.5, 1.75, 0.6, 0.7, 2.4],
        [0.0, 1.8, 0.58, 0.72, 2.4], [-2.5, 1.85, 0.5, 0.6], [-4.5, 1.95, 0.35, 0.42], [-5.8, 2.05, 0.15, 0.2],
      ], { color: LW, ...C }),
      P.cyl(0.012, 0.012, 0.9, { y: 1.6, z: 6.7, rx: Math.PI / 2, color: STEEL }, 4),                       // pitot
      // the stepped tandem canopy (the instructor's seat higher behind), its frames, the spine
      body([[4.6, 2.05, 0.05, 0.05], [4.1, 2.3, 0.38, 0.3], [2.9, 2.45, 0.42, 0.35], [2.0, 2.5, 0.4, 0.33], [1.4, 2.35, 0.3, 0.22]], { color: GLASS }),
      ...[4.15, 2.95].map((z) => body([[z + 0.03, 2.3 + (4.15 - z) * 0.12, 0.4, 0.32], [z - 0.03, 2.3 + (4.15 - z) * 0.12, 0.4, 0.32]], { color: 0x2c3126 })),
      body([[1.6, 2.35, 0.28, 0.2], [-1.0, 2.3, 0.25, 0.18], [-3.5, 2.2, 0.15, 0.1]], { color: LW, ...C }),
      // the Larzac engines along the fuselage sides: intakes beside the rear seat, nozzles under the fin
      ...pair((s) => body([[2.6, 1.65, 0.25, 0.4, 2.5], [2.3, 1.65, 0.35, 0.48], [-1.5, 1.65, 0.38, 0.5], [-3.2, 1.7, 0.3, 0.35], [-3.6, 1.72, 0.22, 0.25]], { x: s * 0.55, color: LW, ...C })),
      ...pair((s) => P.box(0.4, 0.62, 0.04, { x: s * 0.62, y: 1.65, z: 2.62, color: HOLE })),
      ...pair((s) => P.cyl(0.2, 0.2, 0.04, { x: s * 0.55, y: 1.72, z: -3.62, rx: Math.PI / 2, color: HOLE }, 10)),
      // the swept shoulder wing with anhedral, the tailplane, the fin
      ...pair((s) => surface([[s * 0.5, 2.25, 0.4, 1.25, 0.12], [s * 2.5, 2.1, -0.7, 0.9, 0.08], [s * 4.55, 1.95, -1.8, 0.55, 0.05]], { color: LW, ...C })),
      surface([[-2.1, 1.85, -5.6, 0.35, 0.03], [0, 2.0, -4.6, 0.75, 0.06], [2.1, 1.85, -5.6, 0.35, 0.03]], { color: LW, ...C }),
      fin([[2.3, -3.8, 1.1, 0.08], [3.4, -4.7, 0.8, 0.06], [4.1, -5.3, 0.5, 0.04], [4.2, -5.4, 0.3, 0.03]], { color: LW, ...C }),
      // the 27 mm Mauser pod under the belly on its pylon, the barrel out front
      P.box(0.12, 0.25, 1.2, { y: 1.12, z: 0.3, color: 0x3a3f32 }),
      body([[1.8, 0.95, 0.06, 0.06], [1.5, 0.95, 0.18, 0.18], [-1.0, 0.98, 0.2, 0.2], [-1.6, 1.0, 0.1, 0.1]], { color: 0x3a3f32 }),
      P.cyl(0.03, 0.035, 0.6, { y: 0.95, z: 2.05, rx: Math.PI / 2, color: STEEL }, 6),
      // rocket pods under the wings
      ...pair((s) => P.box(0.1, 0.3, 1.1, { x: s * 2.3, y: 1.95, z: -0.4, color: 0x3a3f32 })),
      ...pair((s) => rocketPod(s * 2.3, 1.62, -1.2, 0.9, 0.2, 0x5a5e52)).flat(),
      ...pair((s) => balken(s * 0.94, 1.66, -1.6, 0.9)).flat(),
      ...pair((s) => balken(s * 0.07, 3.2, -4.5, 0.6)).flat(),
    ]),
  };
  const root = new THREE.Group();
  meshAdder(root)(ALPHA.body, mats.body);
  return { root, gun: point(root, 0, 0.95, 2.35), pods: [point(root, -2.3, 1.62, 0.9), point(root, 2.3, 1.62, 0.9)], jet: true };
}

// ---------------------------------------------------------------- UH-1D

let HUEY = null;
export function buildBwUH1D(mats) {
  HUEY ??= {
    body: merge([
      // the cabin: the rounded nose, the boxy body, the boom rising to the fin
      body([
        [3.35, 1.35, 0.3, 0.4, 2], [3.0, 1.4, 0.8, 0.75, 2.4], [2.2, 1.45, 0.95, 0.85, 3], [0.0, 1.45, 0.98, 0.88, 3.4],
        [-1.5, 1.5, 0.95, 0.85, 3.4], [-2.2, 1.75, 0.6, 0.55], [-2.8, 1.95, 0.32, 0.32], [-8.0, 2.1, 0.18, 0.2], [-8.6, 2.15, 0.14, 0.16],
      ], { color: BW, ...C }),
      // the windscreens, chin windows, the cockpit doors and the cabin's big sliding doors
      ...pair((s) => P.box(0.8, 0.66, 0.04, { x: s * 0.42, y: 1.8, z: 2.98, rx: -0.6, ry: s * 0.3, color: GLASS })),
      ...pair((s) => P.box(0.5, 0.32, 0.04, { x: s * 0.42, y: 0.98, z: 3.12, rx: 0.55, color: GLASS })),
      ...pair((s) => P.box(0.04, 0.55, 0.8, { x: s * 0.97, y: 1.75, z: 2.05, color: GLASS })),
      ...pair((s) => P.box(0.04, 0.45, 0.6, { x: s * 0.99, y: 1.8, z: 0.3, color: GLASS })),
      ...pair((s) => P.box(0.03, 0.05, 2.0, { x: s * 1.0, y: 2.2, z: 0.4, color: STEEL })),               // the door rails
      ...pair((s) => P.box(0.03, 1.3, 0.04, { x: s * 0.99, y: 1.5, z: 1.4, color: 0x2d3424 })),
      // the engine on the roof, the exhaust stack turned up, the mast
      body([[1.0, 2.3, 0.5, 0.15, 3], [0.4, 2.45, 0.55, 0.35, 3], [-1.8, 2.45, 0.5, 0.3, 3], [-2.6, 2.35, 0.3, 0.15, 3]], { color: BW, ...C }),
      P.cyl(0.18, 0.2, 0.5, { y: 2.6, z: -2.7, rx: -1.0, color: STEEL }, 10),
      P.box(0.5, 0.3, 0.05, { y: 2.45, z: 1.0, color: HOLE }),                                            // the intake
      P.cyl(0.13, 0.15, 0.55, { y: 3.05, z: 0.2, color: STEEL }, 10),
      // the elevator on the boom, the fin with the tail rotor on its left, the tail skid
      surface([[-1.4, 2.05, -4.8, 0.3, 0.03], [0, 2.05, -4.8, 0.34, 0.04], [1.4, 2.05, -4.8, 0.3, 0.03]], { color: BW, ...C }),
      fin([[2.0, -8.1, 0.45, 0.08], [3.0, -8.65, 0.35, 0.06], [3.5, -8.95, 0.22, 0.04]], { color: BW, ...C }),
      P.cyl(0.09, 0.09, 0.25, { x: -0.12, y: 3.2, z: -8.8, rz: Math.PI / 2, color: STEEL }, 8),
      limb([0, 2.0, -8.3], [0, 1.4, -8.6], [[0, 0.03, 0.03], [1, 0.03, 0.03]], { color: STEEL }),
      // skids on their cross tubes, the steps
      ...pair((s) => P.cyl(0.045, 0.045, 4.2, { x: s * 1.25, y: 0.06, z: 0.2, rx: Math.PI / 2, color: STEEL }, 6)),
      ...pair((s) => limb([s * 1.25, 0.06, 2.3], [s * 1.25, 0.35, 2.7], [[0, 0.045, 0.045], [1, 0.04, 0.04]], { color: STEEL })),
      ...pair((s) => [1.2, -1.1].map((z) => limb([s * 0.7, 0.75, z], [s * 1.25, 0.06, z], [[0, 0.05, 0.05], [1, 0.045, 0.045]], { color: STEEL }))).flat(),
      // the MG3 on its pintle in the right door
      P.cyl(0.025, 0.025, 0.6, { x: 1.15, y: 1.35, z: 0.9, color: STEEL }, 5),
      P.box(0.08, 0.12, 1.1, { x: 1.15, y: 1.7, z: 1.1, color: STEEL }),
      ...pair((s) => balken(s * 0.3, 2.04, -4.0, 0.6)).flat(),
      P.box(0.5, 0.18, 0.02, { y: 1.25, z: 3.2, rx: 0.3, color: WHITE }),                                  // the nose number
    ]),
    rotor: merge([...blades(2, 7.3, 0.53, BLADE, 0.4), P.box(1.6, 0.04, 0.06, { y: 0.18, ry: Math.PI / 2, color: STEEL }), P.cyl(0.25, 0.25, 0.25, { color: STEEL }, 10)]),
    tailRotor: merge([P.box(0.04, 2.6, 0.2, { color: BLADE, surf: 'paint' }), P.cyl(0.08, 0.08, 0.1, { rz: Math.PI / 2, color: STEEL }, 8)]),
  };
  const r = heli(HUEY, mats, { rotorAt: [0, 3.45, 0.2], tailAt: [-0.3, 3.2, -8.8] });
  return {
    ...r, rotorRadius: 7.3, blades: 2,
    gun: point(r.root, 1.15, 1.7, 1.65),
    pods: [],
    doors: [new THREE.Vector3(-1.6, 0, 0.4), new THREE.Vector3(1.6, 0, 0.4)],
  };
}

// ---------------------------------------------------------------- Su-22M4

let SU22 = null;
export function buildNvaSu22(mats) {
  SU22 ??= {
    body: merge([
      // the long fuselage from the nose intake back to the nozzle; the shock cone in the intake
      body([[9.0, 1.8, 0.45, 0.45, 2], [8.4, 1.8, 0.55, 0.55, 2], [5.0, 1.85, 0.7, 0.75, 2.1], [2.0, 1.9, 0.78, 0.85, 2.2], [-2.0, 1.9, 0.78, 0.85, 2.2], [-5.5, 1.95, 0.7, 0.75, 2.1], [-8.5, 2.0, 0.55, 0.58], [-9.4, 2.0, 0.5, 0.52]], { color: NVA, ...C }),
      P.cyl(0.4, 0.4, 0.04, { y: 1.8, z: 8.99, rx: Math.PI / 2, color: HOLE }, 14),
      P.cyl(0.04, 0.3, 0.8, { y: 1.8, z: 9.1, rx: Math.PI / 2, color: 0x8a8a80 }, 12),
      P.cyl(0.012, 0.012, 1.4, { x: 0.35, y: 2.1, z: 9.5, rx: Math.PI / 2, color: STEEL }, 4),               // the pitot boom off to the right
      // the canopy and its frame; the big dorsal spine behind it
      body([[6.4, 2.45, 0.05, 0.05], [5.9, 2.7, 0.38, 0.32], [5.1, 2.8, 0.4, 0.36], [4.5, 2.7, 0.3, 0.22]], { color: GLASS }),
      body([[5.93, 2.69, 0.39, 0.33], [5.85, 2.71, 0.4, 0.34]], { color: NVA_DK }),
      body([[4.6, 2.6, 0.32, 0.25], [0.0, 2.75, 0.35, 0.3], [-4.5, 2.65, 0.3, 0.2]], { color: NVA, ...C }),
      P.cyl(0.45, 0.45, 0.04, { y: 2.0, z: -9.42, rx: Math.PI / 2, color: HOLE }, 14),
      // the fixed gloves and the outer panels swept back to 63°, the fences on them
      ...pair((s) => surface([[s * 0.7, 1.75, 0.8, 2.2, 0.18], [s * 2.0, 1.7, -0.6, 1.3, 0.12]], { color: NVA, ...C })),
      ...pair((s) => surface([[s * 1.95, 1.7, -0.6, 1.1, 0.1], [s * 5.0, 1.6, -3.4, 0.55, 0.05]], { color: NVA, ...C })),
      ...pair((s) => P.box(0.03, 0.12, 1.3, { x: s * 1.7, y: 1.8, z: -0.4, color: NVA_DK })),
      // the all-moving tailplane, the tall swept fin and the ventral fin
      surface([[-2.7, 1.9, -8.6, 0.4, 0.04], [0, 2.0, -7.4, 1.0, 0.08], [2.7, 1.9, -8.6, 0.4, 0.04]], { color: NVA, ...C }),
      fin([[2.6, -5.8, 1.6, 0.1], [4.0, -7.0, 1.1, 0.08], [5.0, -8.0, 0.65, 0.05], [5.1, -8.15, 0.35, 0.03]], { color: NVA, ...C }),
      fin([[1.25, -7.0, 0.8, 0.05], [0.6, -7.6, 0.5, 0.04]], { color: NVA, ...C }),
      // the NR-30s in the wing roots, the pylons with UB-32 pods
      ...pair((s) => P.cyl(0.035, 0.04, 0.6, { x: s * 0.75, y: 1.55, z: 2.95, rx: Math.PI / 2, color: STEEL }, 6)),
      ...pair((s) => [1.5, 3.0].map((x) => P.box(0.1, 0.3, 1.1, { x: s * x, y: 1.5, z: -0.6 - (x - 1.5) * 0.6, color: NVA_DK }))).flat(),
      ...pair((s) => [1.5, 3.0].flatMap((x) => rocketPod(s * x, 1.12, -1.6 - (x - 1.5) * 0.6, 0.6 - (x - 1.5) * 0.6, 0.25, 0x5a5e52))).flat(),
    ]),
    marks: merge([...pair((s) => P.cyl(0.4, 0.4, 0.02, { x: s * 0.1, y: 4.0, z: -7.0, rz: Math.PI / 2 }, 12))]),
  };
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(SU22.body, mats.body);
  add(SU22.marks, mats.glow, false);
  return { root, gun: point(root, 0.75, 1.55, 3.3), pods: [point(root, -1.5, 1.12, 0.6), point(root, 1.5, 1.12, 0.6)], jet: true };
}
