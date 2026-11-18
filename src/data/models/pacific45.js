// 1945 in the Pacific (Iwo Jima): the Imperial Japanese Army's vehicles and guns, and the Marines' amtrac.
//   buildJpChiHa   Type 97 Shin-hōtō Chi-Ha: the riveted hull, the bigger turret offset to the right with
//                  the long 47 mm, the horseshoe radio antenna round it
//   buildJpHaGo    Type 95 Ha-Go: the light tank, small turret to the left with its 37 mm
//   buildJpHoNi    Type 1 Ho-Ni I: the Chi-Ha's chassis with an open shield and the 75 mm field gun
//   buildJpType91  Type 91 10 cm howitzer, towed by an Isuzu lorry
//   buildJpType98  Type 98 20 mm AA gun on its cruciform mount
//   buildJpRocket  Type 4 20 cm rocket launcher: rails on a lorry bed
//   buildJpIsuzu   Isuzu Type 94 lorry (the medics' and the command post's)
//   buildUsLvt4    LVT-4 Water Buffalo: the Marines' amphibian tractor, open hold, the ramp at the stern
import { P, merge, pair, grime } from '../units/geometry.js';
import { trackedHull, castTurret, runningGear, roadWheelGeometry, stationHull } from './vehicleCommon.js';
import { rig } from './ww2Armour.js';
import { vehicle, wheeled, towTruck } from './support.js';
import { truckUnit } from './truck.js';

const JP = 0x6f6a44, JP_DK = 0x56522f, STEEL = 0x2b2d28, RUBBER = 0x1f201c, WOOD = 0x6a4a2c, RED = 0xb8231e, WHITE = 0xe6e2d6;
const MC = 0x4f5a3c, MC_DK = 0x3e4730; // the Marines' green
const C = { camo: 1 };
const cache = {};
const once = (key, make) => (cache[key] ??= make());

/** Rivets: a row of small studs along x from x0 to x1 at (y, z) — the Japanese hulls' look. */
const rivets = (x0, x1, y, z, n, color) => Array.from({ length: n }, (_, i) => P.cyl(0.018, 0.018, 0.02, { x: x0 + ((x1 - x0) * i) / (n - 1), y, z, rx: Math.PI / 2, color }, 5));
/** The horseshoe antenna over a Chi-Ha's turret. */
const horseshoe = (r, y, color) => [
  ...Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (0.15 + (0.7 * i) / 8) + Math.PI / 2; return P.box(0.025, 0.025, r * 0.38, { x: Math.cos(a) * r, y, z: -Math.sin(a) * r - 0.15, ry: a, color }); }),
  ...[0, 4, 8].map((i) => { const a = Math.PI * (0.15 + (0.7 * i) / 8) + Math.PI / 2; return P.box(0.03, 0.4, 0.03, { x: Math.cos(a) * r, y: y - 0.2, z: -Math.sin(a) * r - 0.15, color }); }), // (its posts on the turret)
];
const tyre = (x, y, z, r, w) => [
  P.cyl(r, r, w, { x, y, z, rz: Math.PI / 2, color: RUBBER, surf: 'rubber' }, 14),
  P.cyl(r * 0.55, r * 0.55, w + 0.02, { x, y, z, rz: Math.PI / 2, color: STEEL }, 10),
];
const ISUZU = { length: 5.4, width: 1.9, bonnet: 'square', r: 0.42, axles: [4.2, 1.0] };
const isuzuTow = () => grime(merge(towTruck({ color: JP, dark: JP_DK, length: 5.4, width: 1.9, bonnet: 'square' })), 1, 0.4);

// ---------------------------------------------------------------- Type 97 Shin-hōtō Chi-Ha

export const buildJpChiHa = (mats) => rig(once('chiha', () => {
  const gear = runningGear({ halfWidth: 0.98, length: 3.7, wheels: 6, wheelR: 0.26, sprocket: 1, rollers: 2, trackWidth: 0.33, wheelColor: JP_DK });
  return {
    gear, wheel: roadWheelGeometry(0.26, 0.28, JP_DK),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-2.75, 1.5, 0.45], [-1.2, 1.62, 0.45], [1.6, 1.62, 0.45], [2.0, 1.45, 0.55], [2.75, 0.95, 0.6]], { belly: 0.72, fender: 1.15, fenderY: 0.98, chamfer: 0.05 }, { color: JP, ...C }),
      P.box(1.1, 0.42, 0.7, { x: -0.25, y: 1.78, z: 1.1, color: JP, ...C }),                                  // the stepped front superstructure
      P.cyl(0.06, 0.06, 0.18, { x: 0.35, y: 1.62, z: 1.47, rx: Math.PI / 2, color: STEEL }, 8),            // the bow MG
      P.box(0.3, 0.1, 0.04, { x: -0.45, y: 1.85, z: 1.46, color: STEEL }),                                  // driver's visor
      ...pair((s) => rivets(-0.9, 0.9, 1.5, 2.0 + s * 0.0, 9, JP_DK)).flat(),
      P.box(0.9, 0.3, 0.9, { y: 1.75, z: -1.9, color: JP_DK }),                                              // the engine deck's louvres
      ...pair((s) => P.cyl(0.08, 0.08, 0.7, { x: s * 0.75, y: 1.6, z: -2.55, color: STEEL }, 8)),          // the exhausts
      ...pair((s) => P.box(0.02, 0.24, 0.24, { x: s * 1.16, y: 1.3, z: -0.5, color: WHITE })).flat(),       // the unit's white marks
    ]), 1.25, 0.3),
    turret: grime(merge([
      castTurret([[0.75, 0.62, 0.62], [0.45, 0.72, 0.68], [-0.55, 0.7, 0.66], [-0.95, 0.55, 0.6]], { color: JP, ...C }, 3),
      P.cyl(0.24, 0.26, 0.18, { y: 0.72, z: -0.25, color: JP, ...C }, 12),                                  // the cupola
      P.box(0.5, 0.42, 0.22, { y: 0.32, z: 0.82, color: JP, ...C }),                                         // the mantlet
      ...horseshoe(0.75, 0.82, STEEL),
    ]), 0.9, 0.0, 0.3),
    gun: merge([P.cyl(0.035, 0.045, 2.2, { z: 1.1, rx: Math.PI / 2, color: JP_DK }, 10)]),
  };
}), mats, { turretAt: [0.25, 1.62, 0.1], gunAt: [0, 0.32, 0.9], muzzle: 2.25 });

// ---------------------------------------------------------------- Type 95 Ha-Go

export const buildJpHaGo = (mats) => rig(once('hago', () => {
  const gear = runningGear({ halfWidth: 0.82, length: 3.0, wheels: 4, wheelR: 0.3, sprocket: 1, rollers: 2, trackWidth: 0.25, wheelColor: JP_DK });
  return {
    gear, wheel: roadWheelGeometry(0.3, 0.24, JP_DK),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-2.15, 1.42, 0.45], [1.1, 1.45, 0.45], [1.5, 1.3, 0.5], [2.2, 0.9, 0.55]], { belly: 0.6, fender: 1.0, fenderY: 0.95, chamfer: 0.05 }, { color: JP, ...C }),
      P.box(0.8, 0.35, 0.6, { x: 0.2, y: 1.6, z: 0.8, color: JP, ...C }),                                    // the hull MG's bay
      P.cyl(0.05, 0.05, 0.16, { x: 0.35, y: 1.6, z: 1.12, rx: Math.PI / 2, color: STEEL }, 8),
      ...rivets(-0.7, 0.7, 1.38, 1.62, 7, JP_DK),
      P.box(0.7, 0.2, 0.8, { x: -0.2, y: 1.52, z: -1.5, color: JP_DK }),
      P.cyl(0.07, 0.07, 0.6, { x: 0.65, y: 1.5, z: -2.0, color: STEEL }, 8),
    ]), 1.25, 0.3),
    turret: grime(merge([
      castTurret([[0.5, 0.42, 0.55], [0.25, 0.48, 0.6], [-0.45, 0.46, 0.58], [-0.65, 0.36, 0.5]], { color: JP, ...C }, 3),
      P.box(0.3, 0.3, 0.16, { y: 0.3, z: 0.55, color: JP, ...C }),
    ]), 0.9, 0.0, 0.3),
    gun: merge([P.cyl(0.03, 0.035, 1.3, { z: 0.65, rx: Math.PI / 2, color: JP_DK }, 8)]),
  };
}), mats, { turretAt: [-0.25, 1.45, 0.25], gunAt: [0, 0.3, 0.6], muzzle: 1.35 });

// ---------------------------------------------------------------- Type 1 Ho-Ni I

export const buildJpHoNi = (mats) => rig(once('honi', () => {
  const gear = runningGear({ halfWidth: 0.98, length: 3.7, wheels: 6, wheelR: 0.26, sprocket: 1, rollers: 2, trackWidth: 0.33, wheelColor: JP_DK });
  return {
    gear, wheel: roadWheelGeometry(0.26, 0.28, JP_DK),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-2.75, 1.5, 0.45], [1.6, 1.55, 0.45], [2.0, 1.4, 0.55], [2.75, 0.95, 0.6]], { belly: 0.72, fender: 1.15, fenderY: 0.98, chamfer: 0.05 }, { color: JP, ...C }),
      // the open three-sided shield over the fighting compartment
      P.box(1.9, 0.9, 0.05, { y: 2.0, z: 1.0, rx: -0.2, color: JP, ...C }),
      ...pair((s) => P.box(0.05, 0.9, 1.5, { x: s * 0.95, y: 2.0, z: 0.3, color: JP, ...C })),
      ...rivets(-0.9, 0.9, 1.5, 2.0, 9, JP_DK),
      ...pair((s) => P.cyl(0.08, 0.08, 0.7, { x: s * 0.75, y: 1.6, z: -2.55, color: STEEL }, 8)),
    ]), 1.25, 0.3),
    turret: grime(merge([P.box(0.5, 0.4, 0.5, { y: 0.2, color: STEEL })]), 0.9, 0.0, 0.3),
    gun: merge([P.box(0.3, 0.3, 0.6, { color: STEEL }), P.cyl(0.05, 0.06, 2.4, { z: 1.4, rx: Math.PI / 2, color: JP_DK }, 10)]),
  };
}), mats, { turretAt: [0, 1.6, 0.6], gunAt: [0, 0.5, 0.3], muzzle: 2.6, arc: 0.18 });

// ---------------------------------------------------------------- the guns

const trail = (len, spread, color) => pair((s) => [
  P.box(0.12, 0.14, len, { x: s * Math.sin(spread) * len / 2, y: 0.22, z: -Math.cos(spread) * len / 2, ry: -s * spread, color }),
  P.box(0.35, 0.26, 0.08, { x: s * Math.sin(spread) * len, y: 0.1, z: -Math.cos(spread) * len, ry: -s * spread, color: STEEL }),
]).flat();

export const buildJpType91 = vehicle(() => ({
  hull: grime(merge([...trail(2.6, 0.4, JP), ...pair((s) => tyre(s * 0.85, 0.6, 0.05, 0.6, 0.16)).flat()]), 1, 0.3),
  turret: { geo: grime(merge([P.box(1.5, 0.85, 0.05, { y: 0.8, z: 0.45, rx: -0.1, color: JP }), P.box(0.38, 0.45, 1.0, { y: 0.55, color: STEEL })]), 0.8, 0, 0.3), at: [0, 0.4, 0] },
  gun: { geo: merge([P.box(0.32, 0.3, 1.1, { color: STEEL }), P.cyl(0.055, 0.065, 2.4, { z: 1.5, rx: Math.PI / 2, color: JP }, 12)]), at: [0, 0.8, 0.1], pitch: 0.38 },
  muzzle: [0, 0, 2.7],
  recoil: 0.42,
  tow: { geo: isuzuTow(), hitch: 2.8 },
}));

export const buildJpType98 = vehicle(() => ({
  hull: grime(merge([
    ...[0, Math.PI / 2].map((a) => P.box(0.16, 0.12, 2.4, { y: 0.32, ry: a, color: JP })),
    P.cyl(0.22, 0.3, 0.45, { y: 0.62, color: JP }, 12),
  ]), 1, 0.3),
  turret: { geo: grime(merge([P.box(0.7, 0.3, 0.6, { y: 0.15, color: JP }), ...pair((s) => P.box(0.26, 0.05, 0.26, { x: s * 0.5, y: 0.3, z: -0.35, color: STEEL }))]), 0.8, 0, 0.3), at: [0, 0.85, 0] },
  gun: { geo: merge([P.cyl(0.028, 0.03, 1.5, { z: 0.75, rx: Math.PI / 2, color: STEEL }, 8), P.box(0.18, 0.22, 0.5, { color: STEEL }), P.box(0.08, 0.3, 0.12, { y: 0.2, z: 0.1, color: STEEL })]), at: [0, 0.4, 0.1], pitch: null },
  muzzle: [0, 0, 1.5],
  recoil: 0.05,
  tow: { geo: isuzuTow(), hitch: 1.2 },
}));

/** An Isuzu lorry with `extra(L)` on its bed. */
const isuzu = (extra = () => [], body = 'flat') => vehicle(() => {
  const t = truckUnit({ color: JP, dark: JP_DK, camo: 0, ...ISUZU, body, bodyH: 1.6 });
  const L = t.layout;
  return { wheels: wheeled(L.axles, t.track, ISUZU.r), hull: grime(merge([...t.parts, ...extra(L)]), 1, 0.4), muzzle: [0, 2.5, 0] };
});
export const buildJpIsuzu = isuzu(undefined, 'cargo');
export const buildJpIsuzuAmb = isuzu((L) => [ // the red cross on white, both sides and the roof
  ...pair((s) => [P.box(0.02, 0.6, 0.6, { x: s * (L.hw + 0.01), y: L.deck + 0.9, z: L.rear + 1.0, color: WHITE }), P.box(0.03, 0.4, 0.12, { x: s * (L.hw + 0.015), y: L.deck + 0.9, z: L.rear + 1.0, color: RED }), P.box(0.03, 0.12, 0.4, { x: s * (L.hw + 0.015), y: L.deck + 0.9, z: L.rear + 1.0, color: RED })]).flat(),
], 'box');

export const buildJpRocket = vehicle(() => {
  const t = truckUnit({ color: JP, dark: JP_DK, camo: 0, ...ISUZU, body: 'flat' });
  const L = t.layout;
  return {
    wheels: wheeled(L.axles, t.track, ISUZU.r),
    hull: grime(merge(t.parts), 1.0, 0.4),
    turret: { geo: merge([P.box(1.4, 0.22, 0.7, { y: 0.11, color: JP_DK })]), at: [0, L.deck + 0.1, L.rear + 1.1] },
    // four wooden-framed rails, a fat 20 cm rocket on each
    gun: { geo: merge([...[-0.45, -0.15, 0.15, 0.45].flatMap((x) => [P.box(0.1, 0.08, 2.4, { x, y: 0.05, z: 1.0, color: WOOD }), P.cyl(0.1, 0.1, 1.0, { x, y: 0.2, z: 1.4, rx: Math.PI / 2, color: 0x3a3c30 }, 10)])]), at: [0, 0.35, -0.4], pitch: 0.45 },
    muzzle: [0, 0.2, 2.2],
    recoil: 0.02,
  };
});

// ---------------------------------------------------------------- LVT-4 Water Buffalo

export const buildUsLvt4 = (mats) => rig(once('lvt4', () => {
  const gear = runningGear({ halfWidth: 1.38, length: 5.6, wheels: 10, wheelR: 0.2, sprocket: 1, rollers: 0, trackWidth: 0.36, wheelColor: MC_DK });
  return {
    gear, wheel: roadWheelGeometry(0.2, 0.3, MC_DK),
    hull: grime(merge([
      ...gear.parts,
      // the boat hull: the pontoon sides over the tracks, the bow sloping up for the water
      stationHull([
        [-3.9, [[0, 0.5], [1.6, 0.5], [1.65, 2.2], [0, 2.2]]],
        [2.6, [[0, 0.5], [1.6, 0.5], [1.65, 2.2], [0, 2.2]]],
        [3.95, [[0, 1.3], [1.5, 1.3], [1.55, 2.0], [0, 2.0]]],
      ], { color: MC, ...C }),
      P.box(2.9, 0.06, 4.6, { y: 2.21, z: -1.3, color: MC_DK }),                                            // the open hold's floor line
      P.box(2.0, 0.55, 1.1, { y: 2.45, z: 2.2, color: MC, ...C }),                                           // the cab up front
      ...pair((s) => P.box(0.06, 0.4, 0.4, { x: s * 0.55, y: 2.55, z: 2.76, color: 0x1a1d1c })),           // its windows
      P.box(2.6, 1.7, 0.08, { y: 1.35, z: -3.95, color: MC_DK }),                                            // the stern ramp
      ...pair((s) => [P.cyl(0.03, 0.03, 0.64, { x: s * 1.2, y: 2.5, z: 1.4, color: STEEL }, 6), P.box(0.1, 0.12, 0.7, { x: s * 1.2, y: 2.84, z: 1.5, color: STEEL })]).flat(), // the .30 cal mounts
      ...pair((s) => P.box(0.02, 0.4, 0.4, { x: s * 1.66, y: 1.7, z: 0.6, color: WHITE })),
    ]), 1.25, 0.3),
    turret: merge([P.box(0.3, 0.2, 0.3, { y: 0.1, color: STEEL })]),
    gun: merge([P.cyl(0.03, 0.03, 1.2, { z: 0.6, rx: Math.PI / 2, color: STEEL }, 6)]),
  };
}), mats, { turretAt: [0, 2.6, 1.9], gunAt: [0, 0.25, 0.1], muzzle: 1.3 });
