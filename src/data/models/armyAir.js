// Air defence of the two second armies (support.js vehicle kit; contract in render/RigRenderer.js):
//   Gepard        Bundeswehr Flakpanzer: the Leopard 1 hull, the big turret with a 35 mm KDA on
//                 each side, the search radar turning on the back, the tracking radar in front.
//   HAWK          the Improved HAWK launcher: three big missiles on their towed launcher.
//   Roland        Flarakpanzer Roland on the Marder hull: a launch arm each side of the turret,
//                 the search radar dish on top.
//   Fla-MK 20     the twin 20 mm Rh 202 on its two-wheeled carriage, towed by a Unimog.
//   HAWK PAR      the HAWK battery's pulse acquisition radar on its trailer.
//   ZSU-57-2      NVA: the old open-topped twin 57 mm on its T-54-style hull.
//   Strela-1      the 9K31 on its BRDM-2: four missile boxes on the turret.
//   Osa           the 9K33 (SA-8): the boat-shaped 6×6 with the radar and six missiles on its turret.
//   S-60          the 57 mm on its four-wheeled carriage, towed by a Ural.
//   P-40          the long-range search radar's cabin and arrays on a tracked chassis.
import { P, merge, pair, grime } from '../units/geometry.js';
import { planProfile, trackedHull, castTurret } from './vehicleCommon.js';
import { vehicle, tracked, wheeled, towTruck } from './support.js';

const BW = 0x46503a;
const BW_DK = 0x343a2a;
const NVA = 0x4a5636;
const NVA_DK = 0x37422a;
const STEEL = 0x2b2d28;
const RUBBER = 0x1f201c;
const WHITE = 0xd8d6cc;
const C = { camo: 1 };
const tyre = (x, y, z, r, w = 0.3) => P.cyl(r, r, w, { x, y, z, rz: Math.PI / 2, color: RUBBER, surf: 'rubber' }, 14);
const unimog = () => grime(merge(towTruck({ color: BW, dark: BW_DK, length: 5.0, width: 2.15 })), 1, 0.3);
const ural = () => grime(merge(towTruck({ color: NVA, dark: NVA_DK, length: 7.4, width: 2.5, bonnet: 'round' })), 1, 0.4);

/** A Leopard 1-sized tracked hull (Gepard) or the Marder's (Roland), in the three-tone. */
const bwHull = ({ length, half, top, wheels }) => {
  const g = tracked({ halfWidth: half, length, wheels, wheelR: 0.35, sprocket: -1, rollers: 3, trackWidth: 0.5, wheelColor: BW_DK });
  const L = length / 2 + 0.95;
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-L, top - 0.05, 0.55], [-L + 0.25, top, 0.45], [L - 1.3, top, 0.45], [L - 0.1, 1.0, 0.5], [L, 0.8, 0.8]], { belly: half - 0.25, fender: half + 0.3, fenderY: 1.1, chamfer: 0.05 }, { color: BW, ...C }),
      ...Array.from({ length: 5 }, (_, i) => pair((s) => P.box(0.05, 0.46, (length + 1) / 5, { x: s * (half + 0.32), y: 0.95, z: -L + 0.9 + i * ((length + 1) / 5), color: BW, ...C }))).flat(),
    ]), 1.2, 0.3),
  };
};

// ---------------------------------------------------------------- Bundeswehr

export const buildBwGepard = vehicle(() => ({
  ...bwHull({ length: 5.0, half: 1.35, top: 1.38, wheels: 7 }),
  turret: {
    geo: grime(merge([
      planProfile([[-1.1, 1.3], [1.1, 1.3], [1.25, 0.6], [1.25, -1.5], [-1.25, -1.5], [-1.25, 0.6]], 1.0, { color: BW, ...C }),
      P.cyl(0.42, 0.42, 0.55, { y: 1.15, z: 1.25, rx: Math.PI / 2, color: BW_DK }, 16),              // the tracking radar's dish in front
      P.cyl(0.08, 0.1, 0.5, { y: 1.25, z: -1.0, color: STEEL }, 8),                                   // the search radar's mast
      ...pair((s) => P.box(0.4, 0.75, 1.6, { x: s * 1.45, y: 0.55, z: 0.1, color: BW, ...C })),       // the gun housings on the sides
    ]), 0.9, 0, 0.4),
    at: [0, 1.38, -0.3],
  },
  gun: {
    geo: merge([...pair((s) => merge([
      P.cyl(0.045, 0.05, 3.0, { x: s * 1.45, z: 1.4, rx: Math.PI / 2, color: STEEL }, 10),            // the 35 mm Oerlikon KDA barrels
      P.cyl(0.07, 0.07, 0.25, { x: s * 1.45, z: 2.85, rx: Math.PI / 2, color: STEEL }, 10),           // muzzle velocity sensors
    ]))]),
    at: [0, 0.75, 0.3],
  },
  spin: {
    geo: merge([P.box(1.6, 0.45, 0.1, { y: 0.25, color: BW_DK }), P.box(0.1, 0.4, 0.4, { y: 0.1, z: 0.15, color: STEEL })]),
    at: [0, 1.45, -1.0],
    rate: 2.4,
    onTurret: true,
    always: true,
  },
  muzzle: [1.45, 0, 3.0],
  recoil: 0.06,
  marks: merge([...pair((s) => P.box(0.02, 0.3, 0.3, { x: s * 1.68, y: 1.2, z: 1.0 }))]),
}));

export const buildBwHawk = vehicle(() => ({
  hull: grime(merge([
    // the launcher's trailer, jacked down: the two axles, the outriggers
    P.box(1.6, 0.3, 3.6, { y: 0.6, color: BW, ...C }),
    ...pair((s) => tyre(s * 0.85, 0.45, -1.0, 0.42, 0.25)),
    ...pair((s) => tyre(s * 0.85, 0.45, 0.4, 0.42, 0.25)),
    ...[[-1, -1.6], [1, -1.6], [-1, 1.6], [1, 1.6]].map(([x, z]) => P.box(0.1, 0.5, 0.1, { x: x * 0.95, y: 0.3, z, color: STEEL })),
  ]), 1, 0.3),
  turret: { geo: grime(merge([P.cyl(0.5, 0.55, 0.4, { y: 0.2, color: BW_DK }, 14)]), 0.6, 0, 0.3), at: [0, 0.75, 0] },
  gun: { // three missiles side by side on the beam
    geo: merge([
      P.box(2.2, 0.15, 0.4, { color: STEEL }),
      ...[-0.75, 0, 0.75].flatMap((x) => [
        P.cyl(0.18, 0.18, 4.6, { x, y: 0.3, z: 0.4, rx: Math.PI / 2, color: WHITE }, 12),
        P.cone(0.18, 0.6, { x, y: 0.3, z: 2.95, rx: Math.PI / 2, color: WHITE }, 12),
        ...[0, 1, 2, 3].map((k) => P.box(0.02, 0.55, 0.5, { x: x + Math.sin(k * 1.57) * 0.2, y: 0.3 + Math.cos(k * 1.57) * 0.2, z: -1.6, rz: k * 1.57, color: WHITE })), // fins
      ]),
    ]),
    at: [0, 0.55, 0],
  },
  muzzle: [0, 0.3, 3.2],
  recoil: 0,
  tow: { geo: grime(merge(towTruck({ color: BW, dark: BW_DK, length: 6.6, width: 2.4 })), 1, 0.3), hitch: 2.1 },
  marks: merge([P.box(0.02, 0.25, 0.4, { x: 0.81, y: 0.65, z: 0.8 })]),
}));

export const buildBwRoland = vehicle(() => ({
  ...bwHull({ length: 4.9, half: 1.4, top: 1.9, wheels: 6 }),
  turret: {
    geo: grime(merge([
      planProfile([[-0.85, 1.0], [0.85, 1.0], [1.0, 0.4], [1.0, -1.0], [-1.0, -1.0], [-1.0, 0.4]], 0.9, { color: BW, ...C }),
      P.cyl(0.32, 0.32, 0.35, { y: 0.9, z: 0.9, rx: Math.PI / 2, color: BW_DK }, 14),                 // the tracking radar
      P.cyl(0.07, 0.09, 0.5, { y: 1.15, z: -0.4, color: STEEL }, 8),
    ]), 0.8, 0, 0.4),
    at: [0, 1.92, -0.2],
  },
  gun: { // a launch arm each side, two missile tubes on each
    geo: merge([...pair((s) => merge([0, 1].map((j) => P.cyl(0.12, 0.12, 2.4, { x: s * 1.25, y: j * 0.28, z: 0.3, rx: Math.PI / 2, color: 0x56603e }, 10))))]),
    at: [0, 0.6, 0],
  },
  spin: {
    geo: merge([P.box(1.4, 0.4, 0.08, { y: 0.2, color: BW_DK })]),
    at: [0, 1.35, -0.4],
    rate: 2.2,
    onTurret: true,
    always: true,
  },
  muzzle: [1.25, 0, 1.5],
  recoil: 0,
  marks: merge([...pair((s) => P.box(0.02, 0.3, 0.3, { x: s * 1.74, y: 1.4, z: 1.2 }))]),
}));

export const buildBwFlaMK20 = vehicle(() => ({
  hull: grime(merge([
    P.box(0.9, 0.2, 1.3, { y: 0.4, color: BW, ...C }),
    ...pair((s) => tyre(s * 0.75, 0.4, -0.2, 0.36, 0.2)),
    ...[[0, 0.9], [-0.55, -0.7], [0.55, -0.7]].map(([x, z]) => P.box(0.1, 0.4, 0.1, { x, y: 0.2, z, color: STEEL })),
  ]), 1, 0.3),
  turret: {
    geo: grime(merge([
      P.cyl(0.55, 0.55, 0.1, { color: BW }, 16),
      P.box(0.34, 0.07, 0.32, { x: -0.42, y: 0.28, z: -0.42, color: BW_DK }),
      P.box(0.36, 0.5, 0.26, { x: -0.42, y: 0.58, z: -0.42, rx: 0.12, color: 0x5a5c3b }),            // the gunner
      P.sphere(0.135, { x: -0.42, y: 1.0, z: -0.38, sy: 0.75, color: 0x4e5236 }, 10, 6),
    ]), 0.8, 0, 0.3),
    at: [0, 0.5, 0],
  },
  gun: {
    geo: merge([
      P.box(0.55, 0.22, 0.8, { z: 0.1, color: BW_DK }),
      ...pair((s) => P.cyl(0.028, 0.025, 1.7, { x: s * 0.14, z: 1.3, rx: Math.PI / 2, color: STEEL }, 8)), // twin Rh 202
      ...pair((s) => P.box(0.16, 0.26, 0.4, { x: s * 0.4, y: 0.02, z: 0.05, color: BW })),            // drum magazines
    ]),
    at: [0.05, 0.42, 0.05],
  },
  muzzle: [0, 0, 2.2],
  recoil: 0.05,
  tow: { geo: unimog(), hitch: 1.3 },
  marks: merge([P.box(0.02, 0.16, 0.3, { x: 0.455, y: 0.46, z: 0.2 })]),
}));

export const buildBwHawkRadar = vehicle(() => ({
  hull: grime(merge([
    P.box(1.8, 0.3, 3.2, { y: 0.6, color: BW, ...C }),
    ...pair((s) => tyre(s * 0.95, 0.45, -0.8, 0.42, 0.25)),
    P.box(1.4, 1.0, 1.4, { y: 1.25, z: -0.6, color: BW_DK }),                                         // the transmitter housing
    P.cyl(0.14, 0.16, 0.5, { y: 2.0, z: -0.6, color: STEEL }, 10),
  ]), 1, 0.3),
  spin: { // the PAR's long rectangular antenna
    geo: merge([P.box(3.4, 0.7, 0.12, { y: 0.4, color: BW_DK }), P.box(0.2, 0.4, 0.5, { y: 0.0, z: 0.2, color: STEEL })]),
    at: [0, 2.25, -0.6],
    rate: 1.0,
    onDeploy: true,
  },
  tow: { geo: grime(merge(towTruck({ color: BW, dark: BW_DK, length: 6.6, width: 2.4 })), 1, 0.3), hitch: 1.9 },
  muzzle: [0, 2, 0],
  marks: merge([P.box(0.02, 0.25, 0.4, { x: 0.91, y: 0.65, z: 0.8 })]),
}));

// ---------------------------------------------------------------- NVA

export const buildNvaZSU57 = vehicle(() => {
  const g = tracked({ halfWidth: 1.35, length: 4.6, wheels: 4, wheelR: 0.41, sprocket: -1, rollers: 0, trackWidth: 0.55, wheelColor: NVA_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.0, 1.25, 0.55], [-2.8, 1.3, 0.45], [2.0, 1.33, 0.45], [2.95, 1.0, 0.6], [3.05, 0.85, 0.85]], { belly: 1.1, fender: 1.62, fenderY: 1.05, chamfer: 0.04 }, { color: NVA }),
      ...pair((s) => P.cyl(0.28, 0.28, 0.9, { x: s * 0.7, y: 1.55, z: -2.9, rz: Math.PI / 2, color: NVA_DK }, 12)),
    ]), 1.2, 0.3),
    turret: {
      geo: grime(merge([
        // the open-topped box: thin walls round the crew and the guns
        ...pair((s) => P.box(0.06, 0.8, 2.6, { x: s * 1.3, y: 0.4, color: NVA })),
        P.box(2.6, 0.8, 0.06, { y: 0.4, z: -1.3, color: NVA }),
        P.box(2.6, 0.5, 0.06, { y: 0.25, z: 1.3, rx: -0.3, color: NVA }),
        P.box(2.5, 0.06, 2.5, { y: 0.02, color: NVA_DK }),
      ]), 0.9, 0, 0.4),
      at: [0, 1.33, -0.3],
    },
    gun: { geo: merge([...pair((s) => merge([P.cyl(0.05, 0.06, 4.0, { x: s * 0.35, z: 1.8, rx: Math.PI / 2, color: STEEL }, 10), P.cyl(0.09, 0.08, 0.3, { x: s * 0.35, z: 3.85, rx: Math.PI / 2, color: STEEL }, 10)])), P.box(1.0, 0.4, 0.9, { color: NVA_DK })]).scale(1, 1, 0.8), at: [0, 0.5, 0.4] },
    muzzle: [0.35, 0, 3.2],
    recoil: 0.1,
    marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.64, y: 1.2, z: 0.6 }))]),
  };
});

/** The BRDM-2's boat hull, for the Strela-1. */
const brdm = () => ({
  wheels: wheeled([-1.45, 1.35], 1.05, 0.5),
  hull: grime(merge([
    trackedHull([[-2.85, 1.55, 0.6], [-2.55, 1.85, 0.5], [1.0, 1.85, 0.5], [2.0, 1.55, 0.6], [2.85, 1.05, 0.85]], { belly: 0.95, fender: 1.2, fenderY: 1.0, chamfer: 0.15 }, { color: NVA }),
    P.box(1.4, 0.2, 0.05, { y: 1.65, z: 2.05, rx: 0.7, color: 0x1a1d1c }),                            // the windscreen hatches
  ]), 1.1, 0.3),
});

export const buildNvaStrela1 = vehicle(() => ({
  ...brdm(),
  turret: { geo: grime(merge([P.cyl(0.55, 0.6, 0.3, { y: 0.15, color: NVA }, 14), P.box(0.4, 0.3, 0.4, { y: 0.45, z: 0.2, color: NVA_DK })]), 0.6, 0, 0.3), at: [0, 1.85, -0.4] },
  gun: { // four missile containers, two a side
    geo: merge([...pair((s) => merge([0, 1].map((j) => P.box(0.22, 0.22, 1.9, { x: s * (0.45 + j * 0.25), y: 0.1, z: 0.25, color: 0x56603e }))))]),
    at: [0, 0.5, 0],
  },
  muzzle: [0.55, 0.1, 1.2],
  recoil: 0,
  marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.22, y: 1.55, z: -0.8 }))]),
}));

export const buildNvaOsa = vehicle(() => ({
  wheels: wheeled([-2.1, 0.0, 2.1], 1.2, 0.55),
  hull: grime(merge([
    trackedHull([[-4.5, 1.7, 0.6], [-4.2, 2.1, 0.5], [3.0, 2.1, 0.5], [4.0, 1.7, 0.6], [4.6, 1.1, 0.85]], { belly: 1.05, fender: 1.4, fenderY: 1.05, chamfer: 0.16 }, { color: NVA }),
    P.box(1.6, 0.25, 0.05, { y: 1.9, z: 3.8, rx: 0.7, color: 0x1a1d1c }),
    P.box(0.5, 0.06, 0.5, { x: -0.6, y: 2.12, z: 3.0, color: NVA_DK }),
  ]), 1.1, 0.3),
  turret: {
    geo: grime(merge([
      P.cyl(0.9, 1.0, 0.5, { y: 0.25, color: NVA }, 16),
      P.cyl(0.45, 0.45, 0.25, { y: 0.9, z: 0.6, rx: Math.PI / 2, color: NVA_DK }, 14),                // the tracking radar dish
      P.cyl(0.08, 0.1, 0.7, { y: 1.0, z: -0.3, color: STEEL }, 8),
    ]), 0.8, 0, 0.4),
    at: [0, 2.1, -0.6],
  },
  gun: { // three missiles on a rail each side
    geo: merge([...pair((s) => merge([0, 1, 2].map((j) => P.cyl(0.1, 0.1, 2.9, { x: s * (0.95 + j * 0.0), y: -0.05 + j * 0.24, z: 0.4, rx: Math.PI / 2, color: WHITE }, 10))))]),
    at: [0, 0.6, 0],
  },
  spin: {
    geo: merge([P.box(1.8, 0.45, 0.1, { y: 0.25, color: NVA_DK })]),
    at: [0, 1.3, -0.3],
    rate: 2.0,
    onTurret: true,
    always: true,
  },
  muzzle: [0.95, 0, 1.9],
  recoil: 0,
  marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.42, y: 1.6, z: -1.6 }))]),
}));

export const buildNvaS60 = vehicle(() => ({
  hull: grime(merge([
    P.box(1.7, 0.3, 3.2, { y: 0.55, color: NVA }),
    ...[-1.1, 1.1].flatMap((z) => pair((s) => tyre(s * 0.9, 0.45, z, 0.42, 0.25))),
    ...[[-1, -1.5], [1, -1.5], [-1, 1.5], [1, 1.5]].map(([x, z]) => P.box(0.1, 0.4, 0.1, { x: x * 0.95, y: 0.25, z, color: STEEL })),
  ]), 1, 0.3),
  turret: {
    geo: grime(merge([
      P.cyl(0.75, 0.75, 0.15, { color: NVA }, 16),
      ...pair((s) => P.box(0.06, 0.7, 1.0, { x: s * 0.55, y: 0.4, z: 0.2, color: NVA })),             // the thin shield sides
    ]), 0.8, 0, 0.3),
    at: [0, 0.75, 0],
  },
  gun: {
    geo: merge([
      P.box(0.5, 0.4, 1.2, { color: NVA_DK }),
      P.cyl(0.05, 0.06, 4.2, { z: 2.4, rx: Math.PI / 2, color: STEEL }, 10),
      P.cyl(0.09, 0.08, 0.35, { z: 4.45, rx: Math.PI / 2, color: STEEL }, 10),                         // the pepperpot brake
      P.box(0.3, 0.25, 0.5, { x: 0.35, y: 0.15, z: -0.2, color: NVA }),                                 // the clip feed
    ]).scale(1, 1, 0.8),
    at: [0, 0.5, 0.1],
  },
  muzzle: [0, 0, 3.7],
  recoil: 0.15,
  tow: { geo: ural(), hitch: 2.4 },
  marks: merge([P.box(0.02, 0.2, 0.4, { x: 0.86, y: 0.7, z: 0.4 })]),
}));

export const buildNvaP40 = vehicle(() => {
  const g = tracked({ halfWidth: 1.4, length: 5.0, wheels: 7, wheelR: 0.33, sprocket: 1, rollers: 0, trackWidth: 0.45, wheelColor: NVA_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.2, 1.3, 0.5], [-3.0, 1.35, 0.45], [2.4, 1.35, 0.45], [3.2, 1.0, 0.6]], { belly: 1.15, fender: 1.65, fenderY: 1.1, chamfer: 0.05 }, { color: NVA }),
      P.box(2.9, 1.5, 4.4, { y: 2.1, z: -0.4, color: NVA }),                                            // the operators' cabin
      P.cyl(0.18, 0.2, 0.4, { y: 3.05, z: -0.4, color: STEEL }, 10),
    ]), 1.1, 0.3),
    spin: { // two big Yagi arrays back to back
      geo: merge([
        P.cyl(0.08, 0.08, 1.4, { y: 0.7, color: STEEL }, 8),
        ...[0.7, 1.4].flatMap((y) => [P.box(4.2, 0.1, 0.1, { y, color: STEEL }), ...[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((x) => P.box(0.03, 0.03, 1.0, { x, y, z: 0.45, color: STEEL }))]),
        P.box(4.3, 1.0, 0.05, { y: 1.05, z: -0.1, color: NVA_DK }),
      ]),
      at: [0, 3.25, -0.4],
      rate: 0.9,
      onDeploy: true,
    },
    muzzle: [0, 3, 0],
    marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.46, y: 2.1, z: 1.0 }))]),
  };
});
