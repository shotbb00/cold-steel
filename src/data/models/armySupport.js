// Support vehicles of the two second armies (support.js vehicle kit; contract in render/RigRenderer.js).
// The Bundeswehr builds most of them on the Leopard 1 chassis, the NVA on the T-55's:
//   Pionierpanzer 1   Leopard 1 engineer tank: dozer blade, the crane jib, the auger, MG3.
//   Biber             Leopard 1 bridge layer: the two halves of its 22 m bridge stacked on the hull.
//   Bergepanzer 2     Leopard 1 recovery tank: the tall superstructure, the crane, the spade.
//   Minenpflug        a Leopard 1 with the track-width mine plough ahead of it.
//   Fuchs FüFu        the TPz 1 Fuchs 6×6 command vehicle: masts up once it is set up.
//   Fuchs EloKa       the Fuchs as an electronic warfare jammer: the antennas on their masts.
//   Unimog San        the 4×4 ambulance with its box body and red crosses.
//   Artillerieradar   the battery-locating radar on a MAN truck.
//   IMR               NVA engineer tank on the T-55: the crane arm with its grab, the dozer blade.
//   BLG-60            the East German / Polish scissors bridge on the T-55.
//   T-55 Berge        the recovery T-55: the superstructure in place of the turret, the jib, the spade.
//   KMT-5             a T-55 pushing the KMT-5 mine rollers ahead of each track.
//   MT-LBu            the command MT-LB: the boxy rear cabin, the mast up once set up.
//   W50 San           the IFA W50 ambulance: the East German lorry with its box body.
//   R-378             the jammer on a Ural with its masts.
//   SNAR-10           the battlefield radar on its MT-LB, the antenna turning on the turret.
import { truckUnit } from './truck.js';
import { P, merge, pair, grime, loft } from '../units/geometry.js';
import { planProfile, trackedHull, castTurret } from './vehicleCommon.js';
import { vehicle, tracked, wheeled, towTruck, scissors, cross } from './support.js';

const BW = 0x46503a;
const BW_DK = 0x343a2a;
const NVA = 0x4a5636;
const NVA_DK = 0x37422a;
const STEEL = 0x2b2d28;
const RUBBER = 0x1f201c;
const GLASS = 0x1a1d1c;
const C = { camo: 1 };
const smoke = (x, y, z, n, ry) => Array.from({ length: n }, (_, k) => P.cyl(0.045, 0.045, 0.24, { x, y: y + k * 0.09, z, rx: -0.7, ry, color: STEEL }, 8));

/** The Leopard 1 chassis: hull, running gear, skirts (three-tone). */
function leo1(extra = []) {
  const g = tracked({ halfWidth: 1.35, length: 5.0, wheels: 7, wheelR: 0.35, sprocket: -1, rollers: 4, trackWidth: 0.55, wheelColor: BW_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.55, 1.3, 0.55], [-3.3, 1.35, 0.45], [2.2, 1.38, 0.45], [3.45, 1.0, 0.5], [3.55, 0.78, 0.78]],
        { belly: 1.12, fender: 1.66, fenderY: 1.1, chamfer: 0.04 }, { color: BW, ...C }),
      ...Array.from({ length: 6 }, (_, i) => pair((s) => P.box(0.05, 0.5 - (i % 2) * 0.06, 1.02, { x: s * 1.68, y: 0.96 + (i % 2) * 0.03, z: -2.7 + i * 1.03, color: BW, ...C }))).flat(),
      P.box(1.9, 0.06, 1.5, { y: 1.36, z: -2.5, color: BW_DK }),
      ...[-3.0, -2.7, -2.4, -2.1].map((z) => P.box(1.8, 0.03, 0.06, { y: 1.4, z, color: STEEL })),
      ...pair((s) => P.cyl(0.07, 0.07, 0.1, { x: s * 1.25, y: 1.15, z: 3.1, rx: Math.PI / 2, color: STEEL }, 10)),
      ...extra,
    ]), 1.2, 0.3),
  };
}

/** The T-55 chassis (plain NVA green). */
function t55(extra = []) {
  const g = tracked({ halfWidth: 1.35, length: 4.6, wheels: 5, wheelR: 0.41, sprocket: -1, rollers: 0, trackWidth: 0.58, wheelColor: NVA_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.1, 1.28, 0.55], [-2.9, 1.33, 0.45], [2.0, 1.36, 0.45], [3.0, 1.0, 0.6], [3.12, 0.84, 0.84]],
        { belly: 1.1, fender: 1.62, fenderY: 1.05, chamfer: 0.04 }, { color: NVA }),
      ...pair((s) => P.cyl(0.3, 0.3, 0.95, { x: s * 0.7, y: 1.6, z: -2.95, rz: Math.PI / 2, color: NVA_DK }, 14)),
      ...[0.4, 1.0, 1.6].map((z) => P.box(0.42, 0.3, 0.5, { x: 1.4, y: 1.2, z: -z, color: NVA_DK })),
      P.box(1.7, 0.05, 1.2, { y: 1.34, z: -2.15, color: NVA_DK }),
      ...pair((s) => P.cyl(0.07, 0.07, 0.1, { x: s * 1.25, y: 1.12, z: 2.9, rx: Math.PI / 2, color: STEEL }, 10)),
      ...extra,
    ]), 1.2, 0.3),
  };
}

/** The MT-LB chassis (plain NVA green). */
function mtlb(extra = [], roof = 1.85) {
  const g = tracked({ halfWidth: 1.25, length: 4.4, wheels: 6, wheelR: 0.3, sprocket: 1, rollers: 0, trackWidth: 0.35, wheelColor: NVA_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.2, roof, 0.45], [-3.0, roof, 0.4], [1.6, roof, 0.4], [2.6, 1.55, 0.45], [3.2, 0.95, 0.75]], { belly: 1.0, fender: 1.45, fenderY: 0.95, chamfer: 0.08 }, { color: NVA }),
      P.box(0.5, 0.06, 0.45, { x: -0.55, y: 1.57, z: 2.3, color: NVA_DK }),
      ...pair((s) => P.box(0.7, 0.06, 0.6, { x: s * 0.6, y: roof + 0.02, z: -1.8, color: NVA_DK })),     // roof hatches
      ...extra,
    ]), 1.1, 0.3),
  };
}

/** The TPz 1 Fuchs: the tall wedge-nosed 6×6 box. */
function fuchs(extra = []) {
  return {
    wheels: wheeled([-1.75, 0.0, 2.1], 1.15, 0.55),
    hull: grime(merge([
      trackedHull([[-3.3, 2.25, 0.7], [-3.1, 2.3, 0.6], [1.4, 2.3, 0.6], [2.3, 1.95, 0.6], [3.4, 1.2, 0.85]], { belly: 1.0, fender: 1.35, fenderY: 1.05, chamfer: 0.12 }, { color: BW, ...C }),
      P.box(1.8, 0.3, 0.05, { y: 2.05, z: 2.35, rx: -0.6, color: GLASS }),                                // the windscreen
      P.box(1.0, 1.3, 0.06, { y: 1.5, z: -3.32, color: BW_DK }),                                          // the rear doors
      ...pair((s) => P.box(0.06, 0.06, 5.6, { x: s * 1.38, y: 1.3, z: 0.0, color: BW_DK })),             // the side rubbing strips
      ...extra,
    ]), 1.1, 0.3),
  };
}

/** A dozer blade across the front on its push arms. */
const blade = (z, w, color, dark) => [
  P.box(w, 0.75, 0.12, { y: 0.6, z, rx: -0.15, color }),
  ...pair((s) => P.box(0.12, 0.12, 1.2, { x: s * (w / 2 - 0.3), y: 0.75, z: z - 0.6, rx: 0.2, color: dark })),
];

// ---------------------------------------------------------------- Bundeswehr

export const buildBwPionier = vehicle(() => ({
  ...leo1([
    ...blade(3.85, 3.3, BW, BW_DK),
    P.box(2.6, 0.9, 2.2, { x: 0.15, y: 1.85, z: 0.6, color: BW, ...C }),                               // the superstructure
    P.cyl(0.12, 0.12, 2.0, { x: -1.24, y: 1.7, z: -0.2, rx: Math.PI / 2, color: STEEL }, 10),          // the auger on the side
    P.box(0.5, 0.3, 0.5, { x: 0.8, y: 2.45, z: 0.2, color: BW_DK }),
  ]),
  turret: {
    geo: grime(merge([
      P.box(0.35, 0.35, 4.2, { y: 0.2, z: 1.2, rx: -0.2, color: BW, ...C }),                            // the crane jib laid forward
      P.cyl(0.2, 0.2, 0.4, { color: BW_DK }, 12),
    ]), 0.6, 0, 0.3),
    at: [-0.8, 2.3, 0.0],
  },
  gun: { geo: merge([P.cyl(0.02, 0.02, 0.8, { z: 0.4, rx: Math.PI / 2, color: STEEL }, 6), P.box(0.07, 0.08, 0.3, { color: STEEL })]), at: [1.4, -0.05, 0.8], pitch: 0 }, // MG3
  muzzle: [0, 0, 0.8],
  recoil: 0.02,
  marks: merge([...pair((s) => P.box(0.02, 0.3, 0.3, { x: s * 1.69, y: 1.2, z: 0.9 }))]),
}));

export const buildBwBiber = vehicle(() => ({
  ...leo1([
    ...blade(3.75, 3.0, BW, BW_DK),                                                                       // the support blade it lowers to lay
    P.box(1.2, 0.4, 2.0, { y: 1.55, z: 0.6, color: BW_DK }),                                            // the laying gear
  ]),
  load: grime(merge([0, 1].map((k) => merge([
    P.box(3.9, 0.22, 11.0, { y: 1.85 + k * 0.3, z: 0.2, color: BW, ...C }),                              // the two bridge halves, one on the other
    ...pair((s) => P.box(0.12, 0.35, 11.0, { x: s * 1.9, y: 2.0 + k * 0.3, z: 0.2, color: BW_DK })),
  ]))), 1.2, 0.3),
  muzzle: [0, 2, 0],
  marks: merge([...pair((s) => P.box(0.02, 0.3, 0.3, { x: s * 1.69, y: 1.2, z: -1.4 }))]),
}));

export const buildBwBergepanzer = vehicle(() => ({
  ...leo1([
    ...blade(3.8, 3.2, BW, BW_DK),                                                                      // the spade, here as the front blade
    P.box(2.7, 1.0, 3.0, { y: 1.88, z: 0.6, color: BW, ...C }),                                        // the tall superstructure
    P.box(0.9, 0.06, 0.8, { x: 0.6, y: 2.4, z: -0.4, color: BW_DK }),
    P.box(1.6, 0.4, 1.2, { y: 1.6, z: -2.0, color: 0x575a40 }),                                         // the spare power pack on the deck
    ...pair((s) => P.cyl(0.03, 0.03, 4.0, { x: s * 1.2, y: 1.42, z: -0.6, rx: Math.PI / 2, color: STEEL }, 6)), // tow cables
  ]),
  turret: {
    geo: grime(merge([
      P.cyl(0.25, 0.25, 0.4, { color: BW_DK }, 12),
      P.box(0.3, 0.3, 4.0, { y: 0.25, z: -1.6, rx: 0.05, color: BW, ...C }),                            // the crane jib laid back along the hull
      P.box(0.12, 0.4, 0.12, { y: 0.0, z: -3.6, color: STEEL }),                                        // its hook block
    ]), 0.6, 0, 0.3),
    at: [1.0, 2.38, 1.6],
  },
  gun: { geo: merge([P.cyl(0.02, 0.02, 0.8, { z: 0.4, rx: Math.PI / 2, color: STEEL }, 6), P.box(0.07, 0.1, 0.3, { y: 0.02, color: STEEL })]), at: [-1.8, 0.03, -1.0], pitch: 0 },
  muzzle: [0, 0, 0.8],
  recoil: 0.02,
  marks: merge([...pair((s) => P.box(0.02, 0.3, 0.3, { x: s * 1.69, y: 1.2, z: 0.9 }))]),
}));

export const buildBwMinenpflug = vehicle(() => ({
  ...leo1([
    // the track-width plough: a blade ahead of each track, its tines raking the ground, the frame
    ...pair((s) => P.box(0.8, 0.6, 0.12, { x: s * 1.35, y: 0.42, z: 3.95, rx: 0.4, color: BW_DK })),    // the blades ahead of the tracks
    ...pair((s) => [0, 1, 2, 3, 4].map((k) => P.box(0.06, 0.22, 0.06, { x: s * 1.35 - 0.32 + k * 0.16, y: 0.12, z: 4.12, rx: 0.5, color: STEEL }))).flat(), // their tines
    ...pair((s) => P.box(0.12, 0.5, 0.35, { x: s * 1.35, y: 0.62, z: 3.72, color: STEEL })),            // the brackets behind each blade
    P.box(3.1, 0.16, 0.16, { y: 0.82, z: 3.68, color: STEEL }),                                         // the cross frame joining them
    ...pair((s) => P.box(0.16, 0.16, 1.6, { x: s * 1.3, y: 0.92, z: 2.95, rx: 0.08, color: STEEL })),    // the push arms back to the hull
    ...pair((s) => P.box(0.3, 0.3, 0.3, { x: s * 1.3, y: 0.98, z: 2.2, color: BW_DK })),                // their mounts on the hull sides
  ]),
  turret: {
    geo: grime(merge([
      planProfile([[-0.25, 2.1], [0.25, 2.1], [1.55, 0.95], [1.6, -1.35], [1.25, -2.0], [-1.25, -2.0], [-1.6, -1.35], [-1.55, 0.95]], 0.78, { color: BW, ...C }),
      P.box(0.5, 0.42, 0.55, { x: -0.7, y: 0.95, z: 0.6, color: BW_DK }),
      P.cyl(0.32, 0.35, 0.22, { x: 0.65, y: 0.88, z: -0.45, color: BW }, 14),
      ...pair((s) => smoke(s * 1.5, 0.35, -0.9, 4, s * 1.2)).flat(),
      P.box(2.3, 0.35, 0.8, { y: 0.66, z: -2.35, color: 0x575a40 }),
      P.box(0.8, 0.55, 0.3, { y: 0.4, z: 2.0, color: BW }),
    ]), 0.9, 0, 0.4),
    at: [0, 1.38, -0.1],
  },
  gun: { geo: merge([P.cyl(0.075, 0.1, 5.5, { z: 2.75, rx: Math.PI / 2, color: BW }, 14), P.cyl(0.16, 0.16, 0.6, { z: 2.6, rx: Math.PI / 2, color: BW }, 14)]).scale(1, 1, 0.74), at: [0, 0.4, 2.0], pitch: 0 },
  muzzle: [0, 0, 4.1],
  recoil: 0.4,
  marks: merge([...pair((s) => P.box(0.02, 0.32, 0.32, { x: s * 1.69, y: 1.2, z: 0.9 }))]),
}));

export const buildBwFuchsCP = vehicle(() => ({
  ...fuchs([
    P.box(0.8, 0.5, 0.6, { x: 0.5, y: 2.55, z: -1.0, color: BW_DK }),                                    // radio boxes on the roof
    ...[[-0.9, -2.6], [0.9, -2.8]].map(([x, z]) => P.cyl(0.006, 0.006, 2.8, { x, y: 3.7, z, color: STEEL }, 4)), // whips
  ]),
  deploy: { geo: merge([P.cyl(0.08, 0.12, 4.0, { y: 2.0, color: STEEL }, 8), P.box(1.2, 0.05, 0.05, { y: 4.0, color: STEEL })]), at: [0, 2.3, -1.8] }, // the mast
  muzzle: [0, 2, 0],
  marks: merge([...pair((s) => P.box(0.02, 0.3, 0.3, { x: s * 1.37, y: 1.7, z: 0.8 }))]),
}));

export const buildBwFuchsEW = vehicle(() => ({
  ...fuchs([P.box(1.0, 0.45, 1.4, { y: 2.53, z: -1.4, color: BW_DK })]),                                // the jammer's equipment on the roof
  deploy: { // two masts with their log-periodic arrays
    geo: merge([...pair((s) => merge([P.cyl(0.07, 0.1, 3.4, { x: s * 0.6, y: 1.7, color: STEEL }, 8), ...[0, 1, 2, 3].map((k) => P.box(1.4 - k * 0.25, 0.03, 0.03, { x: s * 0.6, y: 2.85 + k * 0.15, color: STEEL }))]))]),
    at: [0, 2.3, -2.0],
  },
  muzzle: [0, 2, 0],
  marks: merge([...pair((s) => P.box(0.02, 0.3, 0.3, { x: s * 1.37, y: 1.7, z: 0.8 }))]),
}));

export const buildBwUnimogSan = vehicle(() => {
  const t = truckUnit({ length: 5.3, width: 2.2, color: BW, dark: BW_DK, camo: 1, bonnet: 'square', body: 'box', r: 0.55, axles: [4.0, 1.25], bodyH: 1.7, cabLen: 1.45 });
  const L = t.layout, mid = (L.rear + L.bodyFront) / 2, y = L.deck + 0.95;
  return {
    wheels: wheeled(L.axles, t.track, 0.55),
    hull: grime(merge([
      ...t.parts,
      ...cross({ x: L.hw + 0.04, y, z: mid }),
      ...cross({ x: -(L.hw + 0.04), y, z: mid }),
      ...cross({ y: L.top + 0.02, z: mid, rz: Math.PI / 2 }),
    ]), 1.1, 0.3),
    muzzle: [0, 2, 0],
  };
});

export const buildBwArtRadar = vehicle(() => {
  const t = truckUnit({ length: 7.2, width: 2.5, color: BW, dark: BW_DK, camo: 1, bonnet: 'cabover', body: 'box', r: 0.55, axles: [6.2, 2.1, 0.9], bodyH: 1.7 });
  const L = t.layout, mid = (L.rear + L.bodyFront) / 2;
  return {
    wheels: wheeled(L.axles, t.track, 0.55),
    hull: grime(merge([
      ...t.parts,
      P.cyl(0.2, 0.22, 0.25, { y: L.top + 0.12, z: mid - 0.6, color: STEEL }, 12),                       // the antenna's turntable on the shelter roof
      P.box(1.0, 0.45, 0.8, { x: 0.5, y: L.top + 0.22, z: mid + 0.8, color: BW_DK }),                     // the electronics on the roof
    ]), 1.1, 0.3),
    spin: { geo: merge([P.box(2.6, 1.1, 0.12, { y: 0.62, rx: -0.3, color: BW_DK }), P.box(0.3, 0.3, 0.4, { y: 0.1, color: STEEL })]), at: [0, L.top + 0.25, mid - 0.6], rate: 0.5, onDeploy: true },
    muzzle: [0, 2, 0],
    marks: merge([...pair((s) => P.box(0.02, 0.3, 0.3, { x: s * (L.hw - 0.03), y: L.deck + 0.4, z: L.cabFront - 0.5 }))]),
  };
});

// ---------------------------------------------------------------- NVA

export const buildNvaIMR = vehicle(() => ({
  ...t55([...blade(3.6, 3.2, NVA, NVA_DK), P.box(1.8, 0.7, 1.6, { y: 1.7, z: 0.4, color: NVA })]),
  turret: {
    geo: grime(merge([
      P.cyl(0.4, 0.45, 0.4, { y: 0.2, color: NVA_DK }, 14),
      P.box(0.35, 0.35, 4.5, { y: 0.55, z: 1.6, rx: -0.12, color: NVA }),                                 // the crane arm…
      ...pair((s) => P.box(0.1, 0.5, 0.35, { x: s * 0.25, y: 0.3, z: 3.8, rx: 0.4, color: STEEL })),       // …and its grab
    ]), 0.6, 0, 0.3),
    at: [0, 2.05, -0.2],
  },
  gun: { geo: merge([P.cyl(0.02, 0.02, 0.8, { z: 0.4, rx: Math.PI / 2, color: STEEL }, 6), P.box(0.1, 0.1, 0.3, { color: STEEL })]), at: [-0.33, 0.3, 0.3], pitch: 0 },
  muzzle: [0, 0, 0.8],
  recoil: 0.02,
  marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.64, y: 1.2, z: 0.6 }))]),
}));

export const buildNvaBLG60 = vehicle(() => ({
  ...t55([P.box(1.4, 0.4, 1.8, { y: 1.55, z: 0.6, color: NVA_DK })]),
  load: grime(scissors({ y: 1.8, length: 10.4, width: 3.2, color: NVA, dark: NVA_DK }), 1.2, 0.3),
  muzzle: [0, 2, 0],
  marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.64, y: 1.2, z: -1.2 }))]),
}));

export const buildNvaT55Recovery = vehicle(() => ({
  ...t55([
    ...blade(3.35, 2.8, NVA, NVA_DK).map((g) => g.rotateY(Math.PI)),                                    // the spade at the rear
    P.box(2.2, 0.9, 2.2, { y: 1.8, z: 0.6, color: NVA }),                                                // the superstructure
    P.box(0.7, 0.06, 0.6, { x: 0.5, y: 2.27, z: 0.4, color: NVA_DK }),
  ]),
  turret: {
    geo: grime(merge([
      P.cyl(0.22, 0.22, 0.4, { color: NVA_DK }, 12),
      P.box(0.28, 0.28, 3.2, { y: 0.3, z: 1.2, rx: -0.35, color: NVA }),                                  // the jib, raised a little
      P.box(0.12, 0.45, 0.12, { y: 1.0, z: 2.7, color: STEEL }),
    ]), 0.6, 0, 0.3),
    at: [-0.8, 2.25, 1.3],
  },
  gun: { geo: merge([P.cyl(0.02, 0.02, 0.8, { z: 0.4, rx: Math.PI / 2, color: STEEL }, 6)]), at: [1.4, 0.0, -0.5], pitch: 0 },
  muzzle: [0, 0, 0.8],
  recoil: 0.02,
  marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.64, y: 1.2, z: 0.6 }))]),
}));

export const buildNvaKMT5 = vehicle(() => ({
  ...t55([
    // the KMT-5: a set of heavy rollers ahead of each track on its push frame
    ...pair((s) => [0, 1, 2].map((k) => P.cyl(0.38, 0.38, 0.14, { x: s * (1.05 + k * 0.2), y: 0.38, z: 4.1, rz: Math.PI / 2, color: STEEL }, 14))).flat(),
    ...pair((s) => P.cyl(0.07, 0.07, 0.6, { x: s * 1.25, y: 0.38, z: 4.1, rz: Math.PI / 2, color: STEEL }, 8)),          // the rollers' axles
    ...pair((s) => P.box(0.1, 0.12, 1.2, { x: s * 1.25, y: 0.5, z: 3.5, rx: 0.1, color: NVA_DK })),
    P.box(2.6, 0.15, 0.15, { y: 0.52, z: 3.25, color: NVA_DK }),
  ]),
  turret: {
    geo: grime(merge([
      castTurret([[1.5, 0.38, 0.32], [1.35, 0.95, 0.62], [0.95, 1.3, 0.82], [0.3, 1.38, 0.9], [-0.35, 1.35, 0.88], [-0.95, 1.2, 0.76], [-1.35, 0.9, 0.56], [-1.5, 0.38, 0.26]], { color: NVA }),
      P.cyl(0.33, 0.36, 0.22, { x: -0.55, y: 0.92, z: -0.25, color: NVA }, 14),
      P.box(0.6, 0.42, 0.3, { y: 0.4, z: 1.5, color: NVA }),
    ]), 0.9, 0, 0.4),
    at: [0, 1.36, 0.5],
  },
  gun: { geo: merge([P.cyl(0.075, 0.1, 5.3, { z: 2.65, rx: Math.PI / 2, color: NVA }, 14), P.cyl(0.14, 0.14, 0.5, { z: 4.6, rx: Math.PI / 2, color: NVA }, 14)]).scale(1, 1, 0.72), at: [0, 0.42, 1.55], pitch: 0 },
  muzzle: [0, 0, 3.85],
  recoil: 0.38,
  marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.64, y: 1.2, z: 0.6 }))]),
}));

export const buildNvaMTLBu = vehicle(() => ({
  ...mtlb([
    P.box(2.3, 0.6, 2.6, { y: 2.15, z: -1.7, color: NVA }),                                               // the raised command cabin
    ...[[-0.9, -2.8, 2.45], [0.9, -2.6, 2.45], [0.0, 0.8, 1.85]].map(([x, z, base]) => P.cyl(0.006, 0.006, 2.6, { x, y: base + 1.3, z, color: STEEL }, 4)), // whips on the cabin and the roof
  ]),
  deploy: { geo: merge([P.cyl(0.08, 0.11, 4.5, { y: 2.25, color: STEEL }, 8), P.box(1.0, 0.05, 0.05, { y: 4.5, color: STEEL })]), at: [0, 2.45, -2.6] },
  muzzle: [0, 2, 0],
  marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.47, y: 1.5, z: 0.0 }))]),
}));

export const buildNvaW50San = vehicle(() => {
  const t = truckUnit({ length: 6.0, width: 2.35, color: NVA, dark: NVA_DK, bonnet: 'cabover', body: 'box', r: 0.55, axles: [4.9, 1.3], bodyH: 1.8, cabLen: 1.5 });
  const L = t.layout, mid = (L.rear + L.bodyFront) / 2, y = L.deck + 1.0;
  return {
    wheels: wheeled(L.axles, t.track, 0.55),
    hull: grime(merge([
      ...t.parts,
      ...cross({ x: L.hw + 0.04, y, z: mid }),
      ...cross({ x: -(L.hw + 0.04), y, z: mid }),
      ...cross({ y: L.top + 0.02, z: mid, rz: Math.PI / 2 }),
    ]), 1.1, 0.3),
    muzzle: [0, 2, 0],
  };
});

export const buildNvaR378 = vehicle(() => {
  const t = truckUnit({ length: 7.4, width: 2.5, color: NVA, dark: NVA_DK, bonnet: 'round', body: 'box', r: 0.55, axles: [6.3, 2.0, 0.8], bodyH: 1.8 });
  const L = t.layout;
  return {
    wheels: wheeled(L.axles, t.track, 0.55),
    hull: grime(merge([
      ...t.parts,
      ...pair((s) => P.cyl(0.12, 0.14, 0.3, { x: s * 0.7, y: L.top + 0.15, z: L.rear + 1.0, color: STEEL }, 10)), // the masts' feet on the kung's roof
      P.box(0.8, 0.5, 0.7, { y: L.top + 0.25, z: L.bodyFront - 0.6, color: NVA_DK }),                      // the antenna tuners
    ]), 1.1, 0.4),
    deploy: { // the two masts with their big arrays
      geo: merge([...pair((s) => merge([P.cyl(0.08, 0.11, 4.0, { x: s * 0.7, y: 2.0, color: STEEL }, 8), ...[0, 1, 2, 3, 4].map((k) => P.box(1.8 - k * 0.3, 0.03, 0.03, { x: s * 0.7, y: 3.2 + k * 0.17, color: STEEL }))]))]),
      at: [0, L.top + 0.3, L.rear + 1.0],
    },
    muzzle: [0, 2, 0],
    marks: merge([P.box(0.02, 0.22, 0.55, { x: L.hw - 0.03, y: L.deck + 0.5, z: L.cabFront - 0.6 })]),
  };
});

export const buildNvaSNAR10 = vehicle(() => ({
  ...mtlb([P.box(2.0, 0.5, 2.0, { y: 2.1, z: -1.5, color: NVA })]),
  turret: { geo: grime(merge([P.cyl(0.6, 0.65, 0.35, { y: 0.17, color: NVA_DK }, 14)]), 0.6, 0, 0.3), at: [0, 2.35, -1.5] },
  spin: { geo: merge([P.box(2.4, 0.8, 0.1, { y: 0.45, rx: -0.2, color: NVA_DK }), P.box(0.3, 0.3, 0.3, { color: STEEL })]), at: [0, 0.4, 0], rate: 0.6, onTurret: true, onDeploy: true },
  muzzle: [0, 2, 0],
  marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.47, y: 1.5, z: 0.6 }))]),
}));
