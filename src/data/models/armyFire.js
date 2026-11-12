// Recon and fire support of the two second armies (support.js vehicle kit; contract in
// render/RigRenderer.js):
//   Luchs        Bundeswehr Spähpanzer: the long boat-shaped 8×8 with its 20 mm turret, quiet and fast.
//   SPW-70       NVA BTR-70: the 8×8 with the side doors between the axles, the KPVT turret.
//   Jaguar 1     Bundeswehr Jagdpanzer: the low casemate on the Kanonenjagdpanzer hull, HOT launcher
//                on the roof (it fires from behind cover, the launcher up).
//   MT-12        NVA: the 100 mm Rapira anti-tank gun on its split trail, towed by a Ural.
//   M109A3G      Bundeswehr: the M109 with the long L39 barrel, the German stowage, three-tone.
//   D-30         NVA: the 122 mm howitzer on its three-legged carriage, towed by a Ural.
//   LARS 2       Bundeswehr: two 18-tube 110 mm launchers on a MAN 7-tonne.
//   RM-70        NVA: the Czech 40-tube 122 mm launcher on the Tatra 813 with its armoured cab and
//                the reload pack behind it.
//   Panzermörser Bundeswehr: the M113 with the 120 mm Tampella firing through the open roof.
//   2B11         NVA: the 120 mm mortar on its wheeled carriage behind a GAZ-66.
import { truckUnit } from './truck.js';
import { P, merge, pair, grime, loft } from '../units/geometry.js';
import { planProfile, trackedHull, castTurret } from './vehicleCommon.js';
import { vehicle, tracked, wheeled, towTruck, m113Hull } from './support.js';

const BW = 0x46503a;
const BW_DK = 0x343a2a;
const NVA = 0x4a5636;
const NVA_DK = 0x37422a;
const STEEL = 0x2b2d28;
const RUBBER = 0x1f201c;
const GLASS = 0x1a1d1c;
const C = { camo: 1 };
const tyre = (x, y, z, r, w = 0.3) => P.cyl(r, r, w, { x, y, z, rz: Math.PI / 2, color: RUBBER, surf: 'rubber' }, 14);

// ---------------------------------------------------------------- recon

export const buildBwLuchs = vehicle(() => ({
  wheels: wheeled([-2.0, -0.8, 0.8, 2.0], 1.2, 0.5),
  hull: grime(merge([
    // the boat hull: pointed both ends (it drives backwards as well as forwards), flat sides
    trackedHull([[-3.6, 1.2, 0.85], [-3.1, 1.75, 0.55], [2.9, 1.75, 0.55], [3.6, 1.2, 0.85]], { belly: 1.1, fender: 1.4, fenderY: 1.05, chamfer: 0.1 }, { color: BW, ...C }),
    ...pair((s) => P.box(0.06, 0.06, 6.2, { x: s * 1.42, y: 1.1, color: BW_DK })),                     // the splash rail
    ...pair((s) => P.cyl(0.18, 0.18, 0.3, { x: s * 0.6, y: 0.65, z: -3.4, rx: Math.PI / 2, color: STEEL }, 10)), // propellers' shrouds at the rear
    P.box(0.45, 0.06, 0.4, { x: -0.55, y: 1.77, z: 2.4, color: BW_DK }),                              // front driver
    P.box(0.45, 0.06, 0.4, { x: 0.55, y: 1.77, z: -2.4, color: BW_DK }),                              // rear driver
  ]), 1.1, 0.3),
  turret: {
    geo: grime(merge([
      planProfile([[-0.6, 0.85], [0.6, 0.85], [0.95, 0.3], [0.95, -0.75], [-0.95, -0.75], [-0.95, 0.3]], 0.5, { color: BW, ...C }),
      P.cyl(0.26, 0.26, 0.05, { x: -0.45, y: 0.52, z: -0.3, color: BW_DK }, 12),
      ...pair((s) => [0, 1, 2].map((k) => P.cyl(0.04, 0.04, 0.2, { x: s * 0.9, y: 0.25 + k * 0.08, z: 0.4, rx: -0.7, color: STEEL }, 8))).flat(),
    ]), 0.6, 0, 0.4),
    at: [0, 1.77, 0.4],
  },
  gun: { geo: merge([P.cyl(0.03, 0.035, 1.8, { z: 0.9, rx: Math.PI / 2, color: STEEL }, 10), P.box(0.18, 0.18, 0.4, { z: 0.1, color: BW_DK })]), at: [0, 0.26, 0.7], pitch: 0 },
  muzzle: [0, 0, 1.85],
  recoil: 0.06,
  marks: merge([...pair((s) => P.box(0.02, 0.3, 0.3, { x: s * 1.42, y: 1.4, z: 0.8 }))]),
}));

export const buildNvaBTR70 = vehicle(() => ({
  wheels: wheeled([-2.05, -0.75, 0.75, 2.05], 1.18, 0.5),
  hull: grime(merge([
    trackedHull([[-3.5, 1.65, 0.6], [-3.2, 2.0, 0.5], [1.6, 2.05, 0.5], [2.7, 1.65, 0.55], [3.6, 1.1, 0.8]], { belly: 1.0, fender: 1.42, fenderY: 1.05, chamfer: 0.14 }, { color: NVA }),
    ...pair((s) => P.box(0.05, 0.6, 0.5, { x: s * 1.43, y: 1.35, z: 0.0, color: NVA_DK })),           // the side doors between the axles
    ...[-2.0, -1.4, -0.8, 0.6, 1.2].map((z) => pair((s) => P.box(0.04, 0.08, 0.1, { x: s * 1.42, y: 1.7, z, color: STEEL }))).flat(), // firing ports
    ...pair((s) => P.box(0.5, 0.06, 0.5, { x: s * 0.55, y: 2.06, z: -0.8, color: NVA_DK })),          // roof hatches
    P.box(1.2, 0.2, 0.06, { y: 1.75, z: 2.4, rx: 0.6, color: GLASS }),                                // the windscreen armour flaps
  ]), 1.1, 0.3),
  turret: {
    geo: grime(merge([castTurret([[0.55, 0.3, 0.2], [0.4, 0.45, 0.42], [-0.1, 0.48, 0.48], [-0.45, 0.35, 0.36], [-0.55, 0.2, 0.18]], { color: NVA }, 2.4)]), 0.5, 0, 0.4),
    at: [0, 2.05, 0.9],
  },
  gun: { geo: merge([P.cyl(0.04, 0.045, 1.6, { z: 0.8, rx: Math.PI / 2, color: STEEL }, 10), P.cyl(0.015, 0.015, 0.6, { x: 0.12, z: 0.4, rx: Math.PI / 2, color: STEEL }, 6)]), at: [0, 0.3, 0.45], pitch: 0 },
  muzzle: [0, 0, 1.65],
  recoil: 0.06,
  marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.44, y: 1.75, z: -1.6 }))]),
}));

// ---------------------------------------------------------------- anti-tank

export const buildBwJaguar = vehicle(() => {
  const g = tracked({ halfWidth: 1.3, length: 4.2, wheels: 5, wheelR: 0.35, sprocket: -1, rollers: 2, trackWidth: 0.45, wheelColor: BW_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      // the low casemate: the sharply sloped front, the fighting compartment up front
      trackedHull([[-3.1, 1.5, 0.5], [-2.9, 1.55, 0.45], [0.6, 1.7, 0.45], [2.4, 1.3, 0.45], [3.1, 0.9, 0.7]], { belly: 1.05, fender: 1.6, fenderY: 1.05, chamfer: 0.06 }, { color: BW, ...C }),
      ...[-2.0, -1.0, 0.0].map((z) => pair((s) => P.box(0.05, 0.42, 0.95, { x: s * 1.62, y: 0.95, z, color: BW, ...C }))).flat(), // skirts
      P.box(1.7, 0.05, 1.2, { y: 1.53, z: -2.2, color: BW_DK }),
    ]), 1.1, 0.3),
    turret: {
      geo: grime(merge([
        P.cyl(0.3, 0.32, 0.45, { y: 0.2, color: BW }, 14),                                            // the launcher's pedestal
        P.box(0.22, 0.32, 0.3, { x: 0.25, y: 0.3, color: BW_DK }),                                    // the sight
      ]), 0.5, 0, 0.3),
      at: [0, 1.7, 0.2],
    },
    gun: { geo: merge([P.cyl(0.085, 0.085, 1.3, { z: 0.5, rx: Math.PI / 2, color: 0x56603e }, 12), P.cyl(0.095, 0.095, 0.08, { z: 1.15, rx: Math.PI / 2, color: STEEL }, 12)]), at: [0, 0.3, 0], pitch: 0 }, // the HOT tube
    muzzle: [0, 0, 1.2],
    recoil: 0.04,
    marks: merge([...pair((s) => P.box(0.02, 0.3, 0.3, { x: s * 1.64, y: 1.2, z: 1.2 }))]),
  };
});

/** The Ural-375 the NVA towed its guns with: long, the round bonnet, the canvas tilt. */
const ural = () => grime(merge(towTruck({ color: NVA, dark: NVA_DK, length: 7.4, width: 2.5, bonnet: 'round' })), 1, 0.4);

export const buildNvaRapira = vehicle(() => ({
  hull: grime(merge([
    // the split trail spread back, the shield, the two road wheels, the spades dug in
    ...pair((s) => P.box(0.12, 0.12, 3.0, { x: s * 0.6, y: 0.42, z: -1.6, ry: s * -0.18, color: NVA_DK })),
    ...pair((s) => P.box(0.3, 0.5, 0.06, { x: s * 0.88, y: 0.25, z: -3.05, color: STEEL })),           // the spades at the trail ends
    ...pair((s) => tyre(s * 1.0, 0.45, -0.15, 0.45, 0.28)),
    P.box(2.0, 0.2, 0.5, { y: 0.55, z: -0.15, color: NVA }),                                           // axle and cradle base
  ]), 1, 0.3),
  turret: {
    geo: grime(merge([
      P.box(2.0, 1.0, 0.06, { y: 0.55, z: 0.5, rx: -0.1, color: NVA }),                                // the shield
      P.box(0.55, 0.5, 0.06, { y: 1.3, z: 0.45, rx: -0.1, color: NVA }),
    ]), 0.8, 0, 0.3),
    at: [0, 0.55, 0],
  },
  gun: {
    geo: merge([
      P.box(0.4, 0.4, 1.5, { z: 0.0, color: NVA_DK }),                                                  // cradle and recuperator
      P.cyl(0.07, 0.085, 6.0, { z: 3.2, rx: Math.PI / 2, color: NVA }, 12),                             // the long smoothbore
      P.cyl(0.13, 0.12, 0.35, { z: 6.25, rx: Math.PI / 2, color: STEEL }, 12),                          // pepperpot muzzle brake
    ]).scale(1, 1, 0.75),
    at: [0, 0.75, 0.1],
    pitch: 0,
  },
  muzzle: [0, 0, 4.95],
  recoil: 0.5,
  tow: { geo: ural(), hitch: 3.4 },
  marks: merge([P.box(0.02, 0.2, 0.4, { x: 1.0, y: 0.8, z: 0.3 })]),
}));

// ---------------------------------------------------------------- artillery

export const buildBwM109G = vehicle(() => {
  const g = tracked({ halfWidth: 1.4, length: 4.3, wheels: 7, wheelR: 0.33, sprocket: 1, rollers: 0, trackWidth: 0.4, wheelColor: BW_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.1, 1.4, 0.5], [-2.9, 1.45, 0.45], [1.8, 1.45, 0.45], [3.1, 1.1, 0.6]], { belly: 1.1, fender: 1.6, fenderY: 1.1, chamfer: 0.05 }, { color: BW, ...C }),
      P.box(0.5, 0.06, 0.45, { x: -0.6, y: 1.48, z: 2.4, color: BW_DK }),
      ...pair((s) => P.box(0.4, 0.3, 1.2, { x: s * 1.45, y: 1.3, z: -2.2, color: BW_DK })),            // German stowage boxes
      ...[-0.15, 0, 0.15].map((x) => P.box(0.1, 0.07, 0.05, { x: -0.6 + x, y: 1.52, z: 2.64, rx: -0.3, color: GLASS })), // the driver's periscopes
      // headlights in their guards, tow hooks, the engine's grille on the right of the glacis (the M109's engine is at the front)
      ...pair((s) => P.box(0.24, 0.17, 0.13, { x: s * 1.15, y: 1.25, z: 2.95, rx: 0.4, color: STEEL })),
      ...pair((s) => P.box(0.15, 0.1, 0.02, { x: s * 1.15, y: 1.27, z: 3.02, rx: 0.4, color: GLASS })),
      ...pair((s) => P.box(0.14, 0.14, 0.2, { x: s * 0.7, y: 0.8, z: 3.12, color: STEEL })),
      ...Array.from({ length: 6 }, (_, k) => P.box(0.9, 0.03, 0.07, { x: 0.55, y: 1.45 - (2.0 + k * 0.15 - 1.8) * 0.27 + 0.03, z: 2.0 + k * 0.15, rx: 0.26, color: BW_DK })),
      // the rear: the big door, its handle, the spade brackets, the lights
      P.box(0.9, 0.85, 0.06, { y: 1.0, z: -3.12, color: BW_DK }),
      P.box(0.04, 0.16, 0.05, { x: 0.3, y: 1.0, z: -3.16, color: STEEL }),
      ...pair((s) => P.box(0.18, 0.4, 0.2, { x: s * 1.0, y: 0.75, z: -3.15, color: STEEL })),
      ...pair((s) => P.box(0.12, 0.1, 0.04, { x: s * 1.2, y: 1.3, z: -3.13, color: 0x5a1a14 })),
    ]), 1.2, 0.3),
    turret: {
      geo: grime(merge([
        // the big square turret set back on the hull, the overhanging bustle
        planProfile([[-1.4, 1.2], [1.4, 1.2], [1.45, -2.0], [-1.45, -2.0]], 1.15, { color: BW, ...C }),
        P.cyl(0.32, 0.34, 0.2, { x: 0.8, y: 1.2, z: -0.4, color: BW }, 14),                            // commander's cupola
        P.box(0.12, 0.12, 0.4, { x: 0.8, y: 1.35, z: -0.2, color: STEEL }),
        P.box(1.0, 0.8, 0.4, { y: 0.55, z: 1.3, color: BW }),                                          // mantlet
        ...[0, 1, 2, 3, 4].map((k) => P.box(0.1, 0.07, 0.04, { x: 0.8 + Math.sin(k * 0.7 - 1.4) * 0.34, y: 1.32, z: -0.4 + Math.cos(k * 0.7 - 1.4) * 0.34, ry: k * 0.7 - 1.4, color: GLASS })), // the cupola's vision blocks
        P.cyl(0.3, 0.3, 0.05, { x: -0.7, y: 1.17, z: -0.6, color: BW_DK }, 12),                         // the loader's hatch
        P.box(0.3, 0.28, 0.32, { x: -0.75, y: 1.3, z: 0.65, color: BW_DK }),                            // the panoramic sight's head
        // the A3G's German kit: 2 × 4 smoke dischargers on the front corners, stowage boxes along the turret's sides
        ...pair((s) => Array.from({ length: 4 }, (_, k) => P.cyl(0.05, 0.05, 0.26, { x: s * (1.15 + (k % 2) * 0.12), y: 0.95 + Math.floor(k / 2) * 0.12, z: 1.15, rx: -0.6, ry: s * 0.5, color: STEEL }, 8))).flat(),
        ...pair((s) => P.box(0.3, 0.45, 1.5, { x: s * 1.6, y: 0.6, z: -0.7, color: BW_DK })),
        ...pair((s) => [-1.2, -0.2].map((z) => P.box(0.04, 0.05, 0.16, { x: s * 1.76, y: 0.7, z, color: STEEL }))).flat(),
        // the side doors, the ammunition hatch and the basket on the bustle's back
        ...pair((s) => P.box(0.03, 0.8, 0.7, { x: s * 1.455, y: 0.6, z: 0.5, color: BW_DK })),
        P.box(0.7, 0.55, 0.03, { y: 0.6, z: -2.02, color: BW_DK }),
        P.box(2.6, 0.3, 0.45, { y: 0.35, z: -2.25, color: 0x575a40 }),
        ...[-1.1, 0, 1.1].map((x) => P.box(0.04, 0.32, 0.04, { x, y: 0.37, z: -2.47, color: STEEL })),
        P.cyl(0.006, 0.006, 2.4, { x: -1.2, y: 2.35, z: -1.8, color: STEEL }, 4),                        // the radio whip
      ]), 0.9, 0, 0.4),
      at: [0, 1.45, -0.9],
    },
    gun: {
      geo: merge([
        P.cyl(0.1, 0.12, 6.0, { z: 3.0, rx: Math.PI / 2, color: BW }, 14),                             // the long L39 of the A3G
        P.cyl(0.16, 0.16, 0.6, { z: 2.0, rx: Math.PI / 2, color: BW_DK }, 14),                         // bore evacuator
        P.cyl(0.17, 0.15, 0.45, { z: 5.95, rx: Math.PI / 2, color: STEEL }, 14),                       // double-baffle brake
      ]).scale(1, 1, 0.72),
      at: [0, 0.6, 1.4],
      pitch: 0.35,
    },
    muzzle: [0, 0, 4.5],
    recoil: 0.6,
    marks: merge([...pair((s) => P.box(0.02, 0.32, 0.32, { x: s * 1.62, y: 1.25, z: 0.8 }))]),
  };
});

export const buildNvaD30 = vehicle(() => ({
  hull: grime(merge([
    // emplaced: the wheels lifted, the three trail legs spread at 120°, the firing jack down
    ...[0, 2.09, 4.19].map((a) => P.box(0.14, 0.14, 2.6, { x: Math.sin(a) * 1.3, y: 0.15, z: Math.cos(a) * 1.3, ry: a, color: NVA_DK })),
    ...[0, 2.09, 4.19].map((a) => P.box(0.3, 0.06, 0.3, { x: Math.sin(a) * 2.55, y: 0.04, z: Math.cos(a) * 2.55, ry: a, color: STEEL })),
    ...pair((s) => tyre(s * 0.95, 0.5, 0.0, 0.45, 0.28)),
    P.cyl(0.35, 0.4, 0.4, { y: 0.25, color: NVA }, 14),                                                 // the firing pedestal
  ]), 1, 0.3),
  turret: {
    geo: grime(merge([
      P.box(1.7, 0.85, 0.06, { y: 0.75, z: 0.55, rx: -0.15, color: NVA }),                              // the small shield
      P.box(0.5, 0.6, 1.2, { y: 0.5, color: NVA_DK }),                                                  // the top carriage
    ]), 0.8, 0, 0.3),
    at: [0, 0.45, 0],
  },
  gun: {
    geo: merge([
      P.box(0.45, 0.4, 1.4, { color: NVA_DK }),                                                          // recoil gear over the barrel
      P.cyl(0.075, 0.09, 4.9, { z: 2.6, rx: Math.PI / 2, color: NVA }, 12),
      P.cyl(0.16, 0.14, 0.5, { z: 5.0, rx: Math.PI / 2, color: STEEL }, 12),                            // the big muzzle brake
      P.box(0.3, 0.06, 0.2, { y: 0.14, z: 5.1, color: STEEL }),                                         // its towing eye
    ]).scale(1, 1, 0.8),
    at: [0, 0.75, 0.2],
    pitch: 0.4,
  },
  muzzle: [0, 0, 4.2],
  recoil: 0.5,
  tow: { geo: ural(), hitch: 4.7 },
  marks: merge([P.box(0.02, 0.2, 0.4, { x: 0.86, y: 0.9, z: 0.4 })]),
}));

// ---------------------------------------------------------------- rocket artillery

const tubes = (cols, rows, w, h, len, color) => {
  const parts = [P.box(w + 0.1, h + 0.1, len, { color })];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    parts.push(P.cyl(0.055, 0.055, 0.03, { x: -w / 2 + (i + 0.5) * (w / cols), y: -h / 2 + (j + 0.5) * (h / rows), z: len / 2 + 0.01, rx: Math.PI / 2, color: 0x141414 }, 8));
  }
  return parts;
};

export const buildBwLARS = vehicle(() => {
  const t = truckUnit({ length: 7.0, width: 2.5, color: BW, dark: BW_DK, camo: 1, bonnet: 'cabover', body: 'flat', r: 0.55, axles: [6.0, 2.0, 0.8] });
  const L = t.layout;
  return {
    wheels: wheeled(L.axles, t.track, 0.55),
    hull: grime(merge([
      ...t.parts,
      P.box(1.3, 0.3, 1.3, { y: L.deck + 0.25, z: L.rear + 1.6, color: BW_DK }),                         // the launcher's turntable base
      ...pair((s) => P.box(0.3, 0.6, 0.3, { x: s * 1.05, y: L.deck - 0.2, z: L.rear + 0.4, color: STEEL })), // the rear jacks
    ]), 1.2, 0.3),
    turret: { geo: grime(merge([P.box(1.0, 0.4, 1.0, { y: 0.2, color: BW_DK })]), 0.6, 0, 0.3), at: [0, L.deck + 0.4, L.rear + 1.6] },
    gun: { // two 18-tube launchers side by side, on their cradle
      geo: merge([P.box(1.3, 0.15, 0.5, { y: -0.4, color: STEEL }), ...pair((s) => merge(tubes(3, 6, 0.55, 0.75, 2.6, BW).map((g) => g.translate(s * 0.5, 0, 0))))]),
      at: [0, 0.75, 0.3],
      pitch: 0.55,
    },
    muzzle: [0, 0, 1.35],
    recoil: 0.04,
    marks: merge([...pair((s) => P.box(0.02, 0.3, 0.3, { x: s * (L.hw - 0.03), y: L.deck + 0.5, z: L.cabFront - 0.4 }))]),
  };
});

export const buildNvaRM70 = vehicle(() => {
  const t = truckUnit({ length: 8.8, width: 2.5, color: NVA, dark: NVA_DK, bonnet: 'cabover', body: 'flat', r: 0.6, axles: [7.6, 6.3, 1.9, 0.7], armour: true, cabLen: 1.8 });
  const L = t.layout;
  return {
    wheels: wheeled(L.axles, t.track, 0.6),
    hull: grime(merge([
      ...t.parts,
      P.box(2.4, 1.0, 1.1, { y: L.deck + 0.55, z: L.cabRear - 0.7, color: NVA_DK }),                    // the 40-round reload pack behind the cab
      P.box(1.4, 0.3, 1.4, { y: L.deck + 0.25, z: L.rear + 1.7, color: NVA_DK }),                        // the launcher's turntable base
      ...pair((s) => P.box(0.3, 0.6, 0.3, { x: s * 1.05, y: L.deck - 0.2, z: L.rear + 0.4, color: STEEL })),
    ]), 1.2, 0.3),
    turret: { geo: grime(merge([P.box(1.1, 0.4, 1.1, { y: 0.2, color: NVA_DK })]), 0.6, 0, 0.3), at: [0, L.deck + 0.4, L.rear + 1.7] },
    gun: { geo: merge([P.box(1.4, 0.15, 0.5, { y: -0.35, color: STEEL }), ...tubes(10, 4, 1.9, 0.6, 3.0, NVA)]), at: [0, 0.7, 0.3], pitch: 0.55 },
    muzzle: [0, 0, 1.55],
    recoil: 0.04,
    marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * (L.hw - 0.03), y: L.deck + 0.5, z: L.cabFront - 0.7 }))]),
  };
});

// ---------------------------------------------------------------- mortars

export const buildBwPanzermoerser = vehicle(() => ({
  ...m113Hull([
    P.box(1.6, 0.06, 1.7, { y: 1.88, z: -1.25, rx: 0.65, color: BW_DK }),                              // the roof hatch thrown open
    ...pair((s) => P.box(0.4, 0.3, 1.0, { x: s * 1.42, y: 1.55, z: 0.4, color: BW_DK })),               // German stowage on the sides
  ], { color: BW }),
  turret: { geo: merge([P.cyl(0.6, 0.65, 0.15, { color: STEEL }, 14)]), at: [0, 1.25, -1.15] },
  gun: { geo: merge([P.cyl(0.13, 0.15, 1.75, { z: 0.85, rx: Math.PI / 2, color: STEEL }, 12)]), at: [0, 0.2, 0], pitch: 1.0 }, // 120 mm Tampella
  muzzle: [0, 0, 1.8],
  recoil: 0.14,
  marks: merge([P.box(0.02, 0.3, 0.3, { x: 1.375, y: 1.4, z: 1.2 })]),
}));

export const buildNvaMortar120 = vehicle(() => ({
  hull: grime(merge([
    P.cyl(0.45, 0.5, 0.08, { y: 0.04, z: -0.3, color: STEEL }, 16),                                      // the round baseplate
    ...pair((s) => tyre(s * 0.7, 0.4, 0.4, 0.38, 0.22)),                                                 // the wheels of its carriage, off to the side
    P.box(1.5, 0.08, 0.1, { y: 0.4, z: 0.4, color: NVA_DK }),
  ]), 1, 0.3),
  turret: {
    geo: grime(merge([
      ...pair((s) => P.box(0.05, 0.9, 0.05, { x: s * 0.35, y: 0.4, z: 0.55, rz: s * 0.3, rx: -0.3, color: STEEL })), // the bipod
    ]), 0.6, 0, 0.3),
    at: [0, 0.1, 0],
  },
  gun: { geo: merge([P.cyl(0.075, 0.085, 1.85, { z: 0.9, rx: Math.PI / 2, color: NVA }, 12)]), at: [0, 0.0, -0.3], pitch: 0.95 },
  muzzle: [0, 0, 1.85],
  recoil: 0.1,
  tow: { geo: grime(merge(towTruck({ color: NVA, dark: NVA_DK, length: 5.65, width: 2.3, bonnet: 'round' })), 1, 0.4), hitch: 1.2 }, // a GAZ-66
  marks: merge([P.box(0.02, 0.18, 0.35, { x: 0.76, y: 0.45, z: 0.4 })]),
}));
