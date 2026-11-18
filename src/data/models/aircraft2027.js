// 2027's aircraft (data/air27.js), swept from cross-sections like the rest (airKit.js), metres, nose +z:
//   AH-64E Apache   the slim fuselage with the boxy side sponsons, the stepped flat-paned tandem cockpit,
//                   the TADS turret on the nose and the M230 chain gun under the chin, the engines either
//                   side of the mast, stub wings with Hellfires and a rocket pod, the Longbow radar over the
//                   rotor, tailwheel gear, the low stabilator and the scissors tail rotor
//   Mi-28NM Havoc   bigger and heavier: the armoured stepped cockpits, the 30 mm in its turret under the nose,
//                   the radar dome over the five-blade rotor, the wing pylons with Atakas and B-8 pods, the
//                   X tail rotor
//   F-16C           the chin intake under the nose, the bubble canopy, the blended wing and strakes, one fin
//   FA-50PL         the T-50: smaller, a tandem canopy, the intakes either side under the wing roots
//   Su-35S          the Flanker: the long nose, the lifting body between the two widely spaced engines with
//                   the intakes under them, twin fins on the nacelles, the tail sting
//   Su-24MR         the swing-wing reconnaissance bomber: the side-by-side cockpit, the slab intakes, the
//                   wings swept for speed, the tall fin, the recon pods
// Contract: aircraft.js (helicopters: rotor, tailRotor, rotorRadius, blades; jets: jet: true).
import * as THREE from 'three';
import { P, merge, pair, loft, limb } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';
import { body, surface, fin, blades, rocketPod, missile } from './airKit.js';

const GLASS = 0x1b2126;
const STEEL = 0x2a2c28;
const BLADE = 0x24271f;
const HOLE = 0x141414;
const TYRE = 0x1d1d1b;
const DARK = 0x2a2c28;
const WHITE = 0xd8d6cc;
const C = { camo: 1 };
const M = (parts) => merge(parts.flat(Infinity));

const point = (root, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); return o; };
const roundel = (x, y, z, r, up = false) => P.cyl(r, r, 0.02, up ? { x, y, z } : { x, y, z, rz: Math.PI / 2 }, 14);
const wheel = (x, y, z, r = 0.3) => P.cyl(r, r, 0.18, { x, y, z, rz: Math.PI / 2, color: TYRE, surf: 'rubber' }, 12);

const cache = {};
/** A jet: body (painted) and marks (the side's colour), the gun's muzzle. */
function jet(key, mats, make, gun) {
  const m = (cache[key] ??= make());
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(m.body, mats.body);
  if (m.marks) add(m.marks, mats.glow, false);
  return { root, gun: point(root, ...gun), pods: [], jet: true };
}
/** A helicopter: body, marks, the main and tail rotors (they spin), gun and pods. */
function heli(key, mats, make, o) {
  const m = (cache[key] ??= make());
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(m.body, mats.body);
  if (m.marks) add(m.marks, mats.glow, false);
  const rotor = new THREE.Group();
  rotor.position.set(...o.rotorAt);
  meshAdder(rotor)(m.rotor, mats.body);
  root.add(rotor);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(...o.tailAt);
  meshAdder(tailRotor)(m.tailRotor, mats.body, false);
  root.add(tailRotor);
  return { root, rotor, tailRotor, gun: point(root, ...o.gun), pods: o.pods.map((p) => point(root, ...p)), rotorRadius: o.radius, blades: o.blades };
}

// ---------------------------------------------------------------- AH-64E Apache

export const buildApache = (mats) => heli('apache', mats, () => {
  const c = { color: 0x3c4230, ...C };
  return {
    body: M([
      body([[5.0, 1.15, 0.12, 0.14], [4.6, 1.3, 0.38, 0.45, 2.6], [3.6, 1.45, 0.5, 0.65, 2.8], [2.2, 1.55, 0.55, 0.78, 3], [0.6, 1.6, 0.62, 0.82, 3],
        [-1.0, 1.7, 0.6, 0.75, 3], [-2.4, 1.95, 0.36, 0.48], [-5.5, 2.1, 0.22, 0.3], [-8.3, 2.25, 0.15, 0.22], [-8.8, 2.3, 0.06, 0.08]], c),
      ...pair((s) => body([[2.2, 1.25, 0.18, 0.32, 4], [1.6, 1.25, 0.32, 0.42, 4], [-0.8, 1.3, 0.32, 0.42, 4], [-1.6, 1.35, 0.18, 0.3, 4]], { x: s * 0.68, ...c })),     // the avionics sponsons
      // the flat-paned stepped canopy: gunner low in front, pilot behind and higher
      body([[4.3, 1.9, 0.05, 0.05], [3.9, 2.05, 0.38, 0.22, 4], [3.1, 2.12, 0.42, 0.26, 4], [2.6, 2.35, 0.42, 0.32, 4], [1.7, 2.45, 0.42, 0.34, 4], [1.2, 2.3, 0.3, 0.2, 4]], { color: GLASS }),
      ...[3.0, 1.9].map((z) => body([[z + 0.04, 2.1 + (3.0 - z) * 0.22, 0.44, 0.3, 4], [z - 0.04, 2.12 + (3.0 - z) * 0.22, 0.44, 0.3, 4]], { color: 0x2c3024 })),
      // the TADS/PNVS turret on the nose
      P.sphere(0.32, { y: 1.1, z: 5.05, sy: 1.1, color: 0x2c3024 }, 12, 8),
      ...pair((s) => P.box(0.06, 0.24, 0.3, { x: s * 0.3, y: 1.1, z: 5.15, color: GLASS })),
      // engines either side of the mast, their exhausts, the mast and the Longbow radar
      ...pair((s) => body([[0.7, 2.35, 0.18, 0.18], [0.3, 2.4, 0.32, 0.3], [-1.6, 2.4, 0.32, 0.3], [-2.1, 2.35, 0.22, 0.22]], { x: s * 0.82, ...c })),
      ...pair((s) => P.box(0.25, 0.3, 0.5, { x: s * 1.15, y: 2.4, z: -2.0, ry: s * 0.5, color: DARK })),
      body([[0.9, 2.45, 0.25, 0.2], [0.0, 2.6, 0.5, 0.35], [-1.0, 2.55, 0.45, 0.3], [-1.6, 2.4, 0.25, 0.15]], c),
      P.cyl(0.16, 0.18, 1.3, { y: 3.4, z: -0.2, color: STEEL }, 10),
      P.sphere(0.45, { y: 4.3, z: -0.2, sy: 0.55, color: 0x3c4230 }, 14, 8),
      // tail: the fin with the scissors rotor on its right, the stabilator low on the boom, the tailwheel
      fin([[2.1, -8.3, 0.65, 0.07], [2.9, -8.7, 0.5, 0.06], [3.6, -9.05, 0.35, 0.05]], c),
      surface([[-1.6, 2.25, -8.0, 0.32, 0.03], [0, 2.25, -8.0, 0.36, 0.04], [1.6, 2.25, -8.0, 0.32, 0.03]], c),
      limb([0, 2.05, -8.2], [0, 0.35, -8.1], [[0, 0.04, 0.04], [1, 0.04, 0.04]], { color: STEEL }), wheel(0, 0.25, -8.1, 0.2),
      // stub wings: a rocket pod inboard, four Hellfires outboard each side
      ...pair((s) => surface([[s * 0.6, 1.65, -0.2, 0.55, 0.07], [s * 2.5, 1.6, -0.25, 0.42, 0.05]], c)),
      ...pair((s) => rocketPod(s * 1.25, 1.18, -0.9, 0.6, 0.24, DARK)).flat(),
      ...pair((s) => P.box(0.12, 0.4, 0.8, { x: s * 1.25, y: 1.5, z: -0.15, color: DARK })),            // the pods' pylons
      ...pair((s) => [-0.12, 0.12].flatMap((dx) => [-0.12, 0.12].map((dy) => missile(s * 2.15 + dx, 1.25 + dy, -0.7, 0.75, 0.085, 0x3c4230)))).flat(),
      ...pair((s) => P.box(0.4, 0.06, 1.2, { x: s * 2.15, y: 1.44, z: 0.0, color: DARK })),
      // the M230 under the chin, the main gear on its struts
      P.box(0.3, 0.3, 0.4, { y: 0.95, z: 3.4, color: DARK }),
      P.cyl(0.05, 0.06, 1.6, { y: 0.9, z: 4.3, rx: Math.PI / 2, color: STEEL }, 8),
      ...pair((s) => [limb([s * 0.5, 1.2, 3.0], [s * 1.15, 0.35, 2.9], [[0, 0.06, 0.06], [1, 0.05, 0.05]], { color: STEEL }), wheel(s * 1.2, 0.33, 2.9, 0.32)]),
    ]),
    marks: M([P.box(0.02, 0.3, 0.6, { x: 0.3, y: 2.1, z: -5.0 })]),
    rotor: M([...blades(4, 7.3, 0.55, BLADE), P.cyl(0.32, 0.32, 0.22, { color: STEEL }, 12)]),
    tailRotor: M([P.box(0.04, 2.8, 0.25, { color: BLADE, surf: 'paint' }), P.box(0.04, 2.8, 0.25, { rx: 1.0, color: BLADE, surf: 'paint' }), P.cyl(0.1, 0.1, 0.26, { x: -0.1, rz: Math.PI / 2, color: STEEL }, 8)]),
  };
}, { rotorAt: [0, 3.95, -0.2], tailAt: [0.12, 3.45, -9.0], gun: [0, 0.9, 5.1], pods: [[-1.25, 1.18, 0.6], [1.25, 1.18, 0.6]], radius: 7.3, blades: 4 });

// ---------------------------------------------------------------- Mi-28NM Havoc

export const buildMi28 = (mats) => heli('mi28', mats, () => {
  const c = { color: 0x4c5a3a, ...C };
  return {
    body: M([
      body([[5.6, 1.4, 0.15, 0.2], [5.1, 1.55, 0.45, 0.55, 2.6], [3.8, 1.65, 0.6, 0.8, 3], [2.0, 1.75, 0.7, 0.95, 3], [0.0, 1.8, 0.78, 1.0, 3],
        [-1.8, 1.9, 0.7, 0.85, 3], [-3.0, 2.15, 0.38, 0.5], [-6.5, 2.4, 0.24, 0.32], [-9.5, 2.6, 0.16, 0.22], [-10.0, 2.65, 0.07, 0.08]], c),
      // the armoured stepped cockpits with flat panes, the radome on the nose
      body([[4.8, 2.25, 0.05, 0.05], [4.3, 2.4, 0.42, 0.25, 4], [3.4, 2.48, 0.46, 0.28, 4], [2.8, 2.75, 0.46, 0.35, 4], [1.8, 2.85, 0.46, 0.36, 4], [1.2, 2.65, 0.32, 0.22, 4]], { color: GLASS }),
      ...[3.3, 2.1].map((z) => body([[z + 0.05, 2.45 + (3.3 - z) * 0.25, 0.48, 0.32, 4], [z - 0.05, 2.47 + (3.3 - z) * 0.25, 0.48, 0.32, 4]], { color: 0x323a28 })),
      P.sphere(0.36, { y: 1.35, z: 5.75, sy: 0.9, color: 0x323a28 }, 12, 8),
      // engines high on the sides, the mast, the radar dome over the rotor
      ...pair((s) => body([[0.9, 2.75, 0.2, 0.2], [0.4, 2.8, 0.38, 0.36], [-2.0, 2.8, 0.38, 0.34], [-2.6, 2.75, 0.26, 0.24]], { x: s * 0.95, ...c })),
      ...pair((s) => P.box(0.3, 0.32, 0.5, { x: s * 1.35, y: 2.75, z: -2.6, ry: s * 0.6, color: DARK })),
      body([[1.1, 2.85, 0.3, 0.2], [0.0, 3.05, 0.55, 0.38], [-1.3, 3.0, 0.5, 0.32], [-2.0, 2.8, 0.3, 0.15]], c),
      P.cyl(0.18, 0.2, 1.1, { y: 3.85, z: -0.4, color: STEEL }, 10),
      P.sphere(0.55, { y: 4.85, z: -0.4, sy: 0.6, color: 0x4c5a3a }, 14, 8),
      // the tail fin (X tail rotor on its right), the stabiliser, the tailwheel
      fin([[2.4, -9.5, 0.75, 0.08], [3.3, -9.95, 0.55, 0.07], [4.1, -10.3, 0.35, 0.05]], c),
      surface([[-1.4, 2.7, -8.6, 0.35, 0.04], [0, 2.7, -8.6, 0.4, 0.05], [1.4, 2.7, -8.6, 0.35, 0.04]], c),
      limb([0, 2.3, -9.3], [0, 0.35, -9.2], [[0, 0.05, 0.05], [1, 0.05, 0.05]], { color: STEEL }), wheel(0, 0.25, -9.2, 0.22),
      // stub wings: B-8 pods inboard, Ataka tubes outboard, wingtip pods
      ...pair((s) => surface([[s * 0.75, 1.75, -0.6, 0.6, 0.08], [s * 2.8, 1.6, -0.65, 0.45, 0.05]], c)),
      ...pair((s) => rocketPod(s * 1.4, 1.22, -1.3, 0.4, 0.27, DARK)).flat(),
      ...pair((s) => P.box(0.12, 0.45, 0.9, { x: s * 1.4, y: 1.58, z: -0.45, color: DARK })),           // the pods' pylons
      ...pair((s) => P.box(0.12, 0.3, 1.0, { x: s * 2.35, y: 1.55, z: -0.45, color: DARK })),           // the Atakas' launcher rails
      ...pair((s) => [-0.1, 0.1].flatMap((dx) => [-0.1, 0.1].map((dy) => P.cyl(0.1, 0.1, 1.9, { x: s * 2.35 + dx, y: 1.32 + dy, z: -0.4, rx: Math.PI / 2, color: 0x4c5a3a }, 10)))).flat(),
      ...pair((s) => P.box(0.15, 0.2, 1.0, { x: s * 2.85, y: 1.6, z: -0.6, color: DARK })),
      // the 2A42 in its turret under the nose, the main gear
      P.sphere(0.35, { y: 1.0, z: 4.0, sy: 0.8, color: DARK }, 12, 8),
      P.cyl(0.06, 0.07, 2.0, { y: 0.95, z: 5.0, rx: Math.PI / 2, color: STEEL }, 8),
      ...pair((s) => [limb([s * 0.6, 1.3, 2.6], [s * 1.3, 0.38, 2.5], [[0, 0.07, 0.07], [1, 0.06, 0.06]], { color: STEEL }), wheel(s * 1.35, 0.36, 2.5, 0.36)]),
    ]),
    marks: M([...pair((s) => P.box(0.02, 0.45, 0.45, { x: s * 0.24, y: 2.45, z: -6.0 }))]),
    rotor: M([...blades(5, 8.6, 0.65, BLADE), P.cyl(0.38, 0.38, 0.25, { color: STEEL }, 12)]),
    tailRotor: M([P.box(0.04, 3.6, 0.28, { color: BLADE, surf: 'paint' }), P.box(0.04, 3.6, 0.28, { rx: 0.95, color: BLADE, surf: 'paint' }), P.cyl(0.12, 0.12, 0.28, { x: -0.1, rz: Math.PI / 2, color: STEEL }, 8)]),
  };
}, { rotorAt: [0, 4.45, -0.4], tailAt: [0.13, 3.9, -10.2], gun: [0, 0.95, 6.0], pods: [[-1.4, 1.22, 0.4], [1.4, 1.22, 0.4]], radius: 8.6, blades: 5 });

// ---------------------------------------------------------------- F-16C and FA-50

/** The light single-engine fighter: `chin` the F-16's intake under the nose, else the T-50's side intakes. */
function lightFighter(color, { chin, len = 1, tandem = false }) {
  const c = { color, ...C };
  const s = (z) => z * len;
  return {
    body: M([
      body([[s(7.6), 1.9, 0.03, 0.03], [s(7.0), 1.9, 0.26, 0.26], [s(5.8), 1.92, 0.45, 0.48], [s(4.4), 1.95, 0.55, 0.6], [s(2.6), 1.95, 0.62, 0.62, 2.6],
        [s(0.0), 1.9, 0.75, 0.62, 2.8], [s(-3.4), 1.9, 0.62, 0.58, 2.6], [s(-6.0), 1.92, 0.48, 0.5], [s(-6.8), 1.92, 0.42, 0.42]], c),
      P.cyl(0.4, 0.38, 0.6, { y: 1.92, z: s(-7.0), rx: Math.PI / 2, color: DARK }, 14),
      P.cyl(0.33, 0.33, 0.02, { y: 1.92, z: s(-7.31), rx: Math.PI / 2, color: HOLE }, 14),
      ...(chin
        ? [body([[s(3.2), 1.12, 0.48, 0.32, 3.5], [s(2.4), 1.15, 0.55, 0.38, 3.5], [s(-1.0), 1.3, 0.55, 0.4, 3], [s(-3.0), 1.5, 0.45, 0.35]], c), P.box(0.9, 0.55, 0.004, { y: 1.12, z: s(3.203), color: HOLE })]
        : pair((sx) => [body([[s(2.6), 1.6, 0.25, 0.32, 3], [s(1.8), 1.6, 0.32, 0.38, 3], [s(-1.5), 1.65, 0.3, 0.36, 3]], { x: sx * 0.72, ...c }), P.box(0.48, 0.6, 0.004, { x: sx * 0.72, y: 1.6, z: s(2.603), color: HOLE })])),
      // the bubble canopy (tandem on the T-50)
      body(tandem ? [[s(5.6), 2.35, 0.05, 0.05], [s(5.0), 2.62, 0.32, 0.28], [s(3.4), 2.78, 0.36, 0.32], [s(2.2), 2.6, 0.28, 0.2], [s(1.6), 2.4, 0.15, 0.1]]
        : [[s(5.4), 2.35, 0.05, 0.05], [s(4.8), 2.62, 0.32, 0.28], [s(3.9), 2.72, 0.34, 0.3], [s(3.1), 2.55, 0.25, 0.18], [s(2.6), 2.35, 0.12, 0.08]], { color: GLASS }),
      body([[s(3.0), 2.4, 0.3, 0.22], [s(0.0), 2.5, 0.38, 0.22], [s(-4.0), 2.35, 0.3, 0.15]], c),                // the dorsal spine
      // strakes, the cropped delta wing, the tailplanes, the single fin
      ...pair((sx) => surface([[sx * 0.6, 1.95, s(2.4), 1.2, 0.05], [sx * 1.0, 1.95, s(0.8), 0.6, 0.04]], c)),
      ...pair((sx) => surface([[sx * 0.8, 1.95, s(-1.2), 2.4, 0.14], [sx * 4.6, 1.95, s(-3.0), 0.75, 0.05]], c)),
      ...pair((sx) => surface([[sx * 0.6, 1.9, s(-5.8), 1.1, 0.06], [sx * 2.8, 1.85, s(-6.6), 0.45, 0.03]], c)),
      fin([[2.3, s(-4.4), 1.3, 0.09], [3.4, s(-5.4), 0.9, 0.07], [4.4, s(-6.3), 0.45, 0.04]], c),
      // wingtip missiles, pylons
      ...pair((sx) => missile(sx * 4.75, 1.95, s(-3.8), s(-1.6), 0.07, WHITE)),
      ...pair((sx) => P.box(0.08, 0.3, 1.2, { x: sx * 2.6, y: 1.75, z: s(-1.8), color: DARK })),
    ]),
    marks: M([...pair((sx) => roundel(sx * 0.1, 3.4, s(-5.3), 0.3)), ...pair((sx) => roundel(sx * 3.0, 1.98, s(-2.0), 0.3, true))]),
  };
}
export const buildF16 = (mats) => jet('f16', mats, () => lightFighter(0x6e7479, { chin: true }), [-0.5, 2.3, 3.6]);
export const buildFA50 = (mats) => jet('fa50', mats, () => lightFighter(0x6a7075, { chin: false, len: 0.88, tandem: true }), [-0.5, 2.2, 3.0]);

// ---------------------------------------------------------------- Su-35S

export const buildSu35 = (mats) => jet('su35', mats, () => {
  const c = { color: 0x5f6f7a, ...C };
  return {
    body: M([
      // the long drooped nose and cockpit section
      body([[11.0, 1.75, 0.04, 0.04], [10.2, 1.8, 0.4, 0.42], [8.6, 1.9, 0.62, 0.68], [6.8, 2.0, 0.72, 0.75], [5.0, 2.05, 0.8, 0.72, 2.6]], c),
      // the flat lifting body blending into the wing, out to the tail sting
      body([[5.6, 2.05, 0.7, 0.55, 3], [2.5, 2.05, 1.6, 0.5, 4], [-2.5, 2.05, 1.9, 0.42, 4], [-6.0, 2.05, 1.3, 0.35, 3.5], [-9.5, 2.05, 0.35, 0.25], [-11.2, 2.05, 0.15, 0.12]], c),
      // the engine nacelles far apart under the body, their intakes in front, the nozzles
      ...pair((sx) => body([[3.2, 1.35, 0.45, 0.5, 4], [2.4, 1.4, 0.55, 0.6, 4], [-4.0, 1.5, 0.6, 0.6, 3], [-8.0, 1.6, 0.55, 0.55]], { x: sx * 1.35, ...c })),
      ...pair((sx) => P.box(0.85, 0.95, 0.004, { x: sx * 1.35, y: 1.35, z: 3.203, color: HOLE })),
      ...pair((sx) => P.cyl(0.55, 0.5, 0.9, { x: sx * 1.35, y: 1.6, z: -8.5, rx: Math.PI / 2, color: DARK }, 14)),
      ...pair((sx) => P.cyl(0.45, 0.45, 0.02, { x: sx * 1.35, y: 1.6, z: -8.96, rx: Math.PI / 2, color: HOLE }, 14)),
      // canopy
      body([[7.6, 2.55, 0.05, 0.05], [6.9, 2.88, 0.4, 0.34], [5.8, 2.98, 0.42, 0.36], [4.9, 2.82, 0.3, 0.22], [4.4, 2.6, 0.15, 0.1]], { color: GLASS }),
      // the big wing, the tailplanes, the twin fins on the nacelles
      ...pair((sx) => surface([[sx * 1.6, 2.05, -1.2, 4.0, 0.16], [sx * 4.5, 2.0, -3.6, 1.8, 0.1], [sx * 7.4, 1.95, -5.6, 0.8, 0.05]], c)),
      ...pair((sx) => surface([[sx * 1.6, 1.8, -8.4, 1.4, 0.08], [sx * 4.6, 1.75, -9.4, 0.7, 0.04]], c)),
      ...pair((sx) => fin([[1.95, -6.2, 1.7, 0.09, sx * 1.35], [3.8, -7.4, 1.1, 0.07, sx * 1.45], [5.2, -8.4, 0.6, 0.05, sx * 1.5]], c)),
      // missiles under the wings and between the engines
      ...pair((sx) => missile(sx * 4.2, 1.72, -4.2, -1.8, 0.1, WHITE)),
      ...pair((sx) => P.box(0.08, 0.3, 1.4, { x: sx * 4.2, y: 1.92, z: -3.0, color: DARK })),            // pylons
      ...pair((sx) => missile(sx * 6.2, 1.8, -5.6, -3.6, 0.07, WHITE)),
      ...pair((sx) => P.box(0.06, 0.2, 1.0, { x: sx * 6.2, y: 1.92, z: -4.6, color: DARK })),
      missile(0, 1.48, -3.5, 0.0, 0.12, WHITE),
      P.box(0.1, 0.3, 1.8, { y: 1.7, z: -1.8, color: DARK }),                                           // the belly pylon
    ]),
    marks: M([...pair((sx) => roundel(sx * 1.55, 4.2, -7.3, 0.36)), ...pair((sx) => roundel(sx * 5.6, 2.08, -4.4, 0.36, true))]),
  };
}, [1.0, 2.2, 6.0]);

// ---------------------------------------------------------------- Su-24MR

export const buildSu24 = (mats) => jet('su24', mats, () => {
  const c = { color: 0x8b928e, ...C };
  return {
    body: M([
      // the broad nose (the crew side by side), the long body
      body([[11.0, 1.8, 0.05, 0.05], [10.2, 1.85, 0.5, 0.45], [8.6, 1.9, 0.8, 0.7], [6.6, 2.0, 0.95, 0.8, 2.6], [3.0, 2.0, 1.0, 0.8, 3], [-3.0, 2.0, 0.95, 0.75, 3], [-8.5, 2.05, 0.75, 0.6], [-10.6, 2.1, 0.55, 0.45]], c),
      ...pair((sx) => P.cyl(0.45, 0.42, 0.7, { x: sx * 0.42, y: 2.05, z: -10.9, rx: Math.PI / 2, color: DARK }, 14)),
      // the slab intakes on the body's sides
      ...pair((sx) => body([[5.0, 1.9, 0.35, 0.65, 5], [4.0, 1.9, 0.45, 0.7, 5], [-3.0, 1.95, 0.45, 0.68, 4], [-6.0, 1.98, 0.32, 0.55, 3]], { x: sx * 1.2, ...c })),
      ...pair((sx) => P.box(0.6, 1.2, 0.004, { x: sx * 1.25, y: 1.9, z: 5.003, color: HOLE })),
      // the wide canopy over the side-by-side crew
      body([[8.2, 2.55, 0.1, 0.05], [7.5, 2.85, 0.68, 0.32, 3], [6.2, 2.95, 0.7, 0.34, 3], [5.4, 2.75, 0.5, 0.2, 3]], { color: GLASS }),
      // the gloves and the wings swept back, the tailplanes, the tall fin
      ...pair((sx) => surface([[sx * 1.4, 2.4, 0.5, 2.6, 0.18], [sx * 2.6, 2.4, -0.5, 1.6, 0.14]], c)),
      ...pair((sx) => surface([[sx * 2.5, 2.38, -0.8, 1.7, 0.12], [sx * 7.0, 2.25, -5.4, 0.7, 0.05]], c)),
      ...pair((sx) => surface([[sx * 1.0, 2.0, -8.6, 1.6, 0.07], [sx * 4.0, 1.85, -10.0, 0.7, 0.04]], c)),
      fin([[2.7, -6.4, 2.0, 0.1], [4.0, -7.6, 1.5, 0.08], [5.6, -9.2, 0.7, 0.05]], c),
      // the reconnaissance pods under the body
      ...pair((sx) => body([[3.5, 1.05, 0.05, 0.05], [3.0, 1.05, 0.25, 0.25], [-2.5, 1.05, 0.25, 0.25], [-3.0, 1.05, 0.12, 0.12]], { x: sx * 0.55, color: 0x9aa09c })),
    ]),
    marks: M([...pair((sx) => roundel(sx * 0.11, 4.6, -7.6, 0.4)), ...pair((sx) => roundel(sx * 5.0, 2.33, -3.6, 0.36, true))]),
  };
}, [0, 1.2, 6.0]);
