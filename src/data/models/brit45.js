// The British 8th Army in the desert, 1942 (El Alamein), in Light Stone with the darker shade over it:
//   buildBrCrusader   Crusader III cruiser tank: long and low, five big Christie wheels a side, the angular turret, the 6-pdr
//   buildBrGrant      M3 Grant: the tall riveted hull, the 75 mm in its sponson on the right, the British turret with the 37 mm
//   buildBrDaimler    Daimler armoured car: four wheels, the small two-man turret with the 2-pdr
//   buildBrDeacon     Deacon: a 6-pdr behind a shield in an armoured box on an AEC Matador lorry
//   buildBr25pdr      the 25-pounder gun-howitzer on its round firing platform, towed by a Morris Quad
//   buildBrCarrier    the Universal (Bren) Carrier: a small open tracked box
//   buildBrAustinAmb  Austin K2 ambulance
//   buildBrDorchester AEC Dorchester armoured command vehicle
//   buildBrScammell   Scammell Pioneer recovery lorry with its jib
import { P, merge, pair, grime } from '../units/geometry.js';
import { trackedHull, castTurret, runningGear, roadWheelGeometry, stationHull } from './vehicleCommon.js';
import { rig, crane } from './ww2Armour.js';
import { vehicle, wheeled, towTruck } from './support.js';
import { truckUnit } from './truck.js';

const STONE = 0xb8a77c, STONE_DK = 0x938458, STEEL = 0x2b2d28, RUBBER = 0x1f201c, RED = 0xb8231e, WHITE = 0xe6e2d6, GLASS = 0x1a1d1c;
const C = { camo: 1 };
const cache = {};
const once = (key, make) => (cache[key] ??= make());
const tyre = (x, y, z, r, w) => [
  P.cyl(r, r, w, { x, y, z, rz: Math.PI / 2, color: RUBBER, surf: 'rubber' }, 14),
  P.cyl(r * 0.55, r * 0.55, w + 0.02, { x, y, z, rz: Math.PI / 2, color: STEEL }, 10),
];
/** The 8th Army's red-white-red recognition flash on a side. */
const flash = (x, y, z) => [P.box(0.02, 0.18, 0.12, { x, y, z: z - 0.12, color: RED }), P.box(0.02, 0.18, 0.12, { x, y, z, color: WHITE }), P.box(0.02, 0.18, 0.12, { x, y, z: z + 0.12, color: RED })];
const lorryOf = (o, extra = () => [], body = 'cargo') => {
  const t = truckUnit({ color: STONE, dark: STONE_DK, camo: 0, ...o, body, bodyH: o.bodyH ?? 1.7 });
  const L = t.layout;
  return { t, L, parts: [...t.parts, ...extra(L)] };
};
const MATADOR = { length: 6.3, width: 2.4, bonnet: 'square', r: 0.5, axles: [5.0, 1.4] };
const AUSTIN = { length: 5.2, width: 2.1, bonnet: 'square', r: 0.42, axles: [4.0, 1.0] };
const quadTow = () => grime(merge(towTruck({ color: STONE, dark: STONE_DK, length: 4.5, width: 2.2, bonnet: 'square' })), 1, 0.4);

// ---------------------------------------------------------------- Crusader III

export const buildBrCrusader = (mats) => rig(once('crusader', () => {
  const gear = runningGear({ halfWidth: 1.18, length: 4.4, wheels: 5, wheelR: 0.41, sprocket: -1, rollers: 0, trackWidth: 0.32, wheelColor: STONE_DK });
  return {
    gear, wheel: roadWheelGeometry(0.41, 0.24, STONE_DK),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-3.0, 1.6, 0.5], [2.1, 1.6, 0.5], [2.55, 1.35, 0.55], [3.0, 1.0, 0.6]], { belly: 0.8, fender: 1.4, fenderY: 1.05, chamfer: 0.05 }, { color: STONE, ...C }),
      P.box(0.7, 0.18, 0.5, { x: 0.5, y: 1.68, z: 1.95, color: STONE, ...C }),                 // the driver's hood: low, under the 6-pdr's barrel
      P.box(0.3, 0.08, 0.04, { x: 0.5, y: 1.7, z: 2.21, color: GLASS }),                          // (the visor, on the hood's front)
      P.box(1.9, 0.12, 1.6, { y: 1.67, z: -2.0, color: STONE_DK }),                            // engine deck louvres
      ...pair((s) => P.box(0.05, 0.5, 4.8, { x: s * 1.43, y: 1.2, z: -0.1, color: STONE })),    // the sand shields over the tracks
      ...[-1, 1].flatMap((s) => flash(s * 1.46, 1.3, -1.2)),
    ]), 1.25, 0.3),
    turret: grime(merge([
      castTurret([[0.75, 0.72, 0.6], [0.5, 0.78, 0.66], [-0.6, 0.78, 0.64], [-0.95, 0.7, 0.56]], { color: STONE, ...C }, 6), // (angular: a high exponent)
      P.box(0.55, 0.45, 0.25, { y: 0.32, z: 0.82, color: STONE, ...C }),
      P.box(0.5, 0.2, 0.5, { x: -0.3, y: 0.72, z: -0.3, color: STONE_DK }),                   // the hatch
    ]), 0.9, 0.0, 0.3),
    gun: merge([P.cyl(0.045, 0.05, 2.4, { z: 1.2, rx: Math.PI / 2, color: STONE_DK }, 10)]),
  };
}), mats, { turretAt: [0, 1.6, 0.4], gunAt: [0, 0.32, 0.9], muzzle: 2.45 });

// ---------------------------------------------------------------- M3 Grant

export const buildBrGrant = (mats) => rig(once('grant', () => {
  const gear = runningGear({ halfWidth: 1.12, length: 4.0, wheels: 6, wheelR: 0.27, sprocket: 1, rollers: 3, trackWidth: 0.42, wheelColor: STONE_DK });
  return {
    gear, wheel: roadWheelGeometry(0.27, 0.32, STONE_DK),
    hull: grime(merge([
      ...gear.parts,
      // the tall riveted hull, its upper part boxy and high
      trackedHull([[-2.85, 2.15, 0.55], [1.3, 2.2, 0.55], [2.3, 1.6, 0.6], [2.85, 1.1, 0.6]], { belly: 0.85, fender: 1.32, fenderY: 1.05, chamfer: 0.06 }, { color: STONE, ...C }),
      ...Array.from({ length: 8 }, (_, i) => P.cyl(0.02, 0.02, 0.02, { x: -0.9 + i * 0.25, y: 2.12, z: 1.4, rx: Math.PI / 2, color: STONE_DK }, 5)), // rivets
      // the 75 mm in its sponson on the right front
      P.box(0.8, 0.8, 1.0, { x: 0.72, y: 1.85, z: 2.05, color: STONE, ...C }),                  // (its front out of the glacis)
      P.cyl(0.32, 0.32, 0.2, { x: 0.72, y: 1.85, z: 2.6, rx: Math.PI / 2, color: STONE, ...C }, 14), // the round gun mount
      P.cyl(0.055, 0.065, 1.7, { x: 0.72, y: 1.85, z: 3.5, rx: Math.PI / 2, color: STONE_DK }, 10),
      ...[-1, 1].flatMap((s) => flash(s * 1.34, 1.7, -1.0)),
    ]), 1.25, 0.3),
    turret: grime(merge([
      castTurret([[0.65, 0.62, 0.55], [0.35, 0.66, 0.6], [-0.6, 0.62, 0.58], [-0.8, 0.52, 0.5]], { color: STONE, ...C }, 3),
      P.box(0.4, 0.3, 0.2, { y: 0.28, z: 0.72, color: STONE, ...C }),
    ]), 0.9, 0.0, 0.3),
    gun: merge([P.cyl(0.03, 0.035, 1.5, { z: 0.75, rx: Math.PI / 2, color: STONE_DK }, 8)]),
  };
}), mats, { turretAt: [-0.35, 2.2, 0.0], gunAt: [0, 0.28, 0.75], muzzle: 1.55 });

// ---------------------------------------------------------------- Daimler armoured car

export const buildBrDaimler = vehicle(() => ({
  wheels: wheeled([1.15, -1.15], 1.06, 0.5),
  hull: grime(merge([
    stationHull([
      [-2.0, [[0, 0.6], [0.66, 0.6], [0.8, 1.05], [0.62, 1.5], [0, 1.5]]],
      [1.3, [[0, 0.6], [0.66, 0.6], [0.8, 1.05], [0.62, 1.5], [0, 1.5]]],
      [2.0, [[0, 0.7], [0.55, 0.7], [0.66, 1.0], [0.5, 1.3], [0, 1.3]]],
    ], { color: STONE, ...C }),
    ...pair((s) => [1.15, -1.15].map((z) => P.box(0.42, 0.05, 1.15, { x: s * 1.0, y: 1.06, z, color: STONE_DK }))).flat(), // the mudguards over the wheels
    P.box(0.45, 0.1, 0.04, { y: 1.2, z: 1.9, rx: -0.5, color: GLASS }),
    ...[-1, 1].flatMap((s) => flash(s * 0.78, 1.05, -0.5)),
  ]), 1, 0.4),
  turret: { geo: grime(merge([castTurret([[0.5, 0.5, 0.5], [-0.5, 0.48, 0.5], [-0.65, 0.4, 0.45]], { color: STONE, ...C }, 4)]), 0.8, 0, 0.3), at: [0, 1.5, -0.2] },
  gun: { geo: merge([P.cyl(0.03, 0.035, 1.3, { z: 0.65, rx: Math.PI / 2, color: STONE_DK }, 8)]), at: [0, 0.25, 0.4], pitch: null },
  muzzle: [0, 0, 1.3],
  recoil: 0.1,
}));

// ---------------------------------------------------------------- Deacon

export const buildBrDeacon = vehicle(() => {
  const { t, L, parts } = lorryOf({ ...MATADOR }, () => [], 'flat');
  return {
    wheels: wheeled(L.axles, t.track, MATADOR.r),
    hull: grime(merge([...parts, P.box(2.2, 0.9, 2.6, { y: L.deck + 0.45, z: L.rear + 1.4, color: STONE, ...C })]), 1, 0.4), // the armoured box round the gun
    turret: { geo: grime(merge([P.box(1.6, 0.9, 0.06, { y: 0.55, z: 0.5, color: STONE, ...C }), P.box(0.4, 0.4, 0.8, { y: 0.3, color: STEEL })]), 0.8, 0, 0.3), at: [0, L.deck + 0.9, L.rear + 1.4] },
    gun: { geo: merge([P.cyl(0.04, 0.045, 2.4, { z: 1.2, rx: Math.PI / 2, color: STONE_DK }, 10)]), at: [0, 0.45, 0.3], pitch: null },
    muzzle: [0, 0, 2.4],
    recoil: 0.3,
  };
});

// ---------------------------------------------------------------- 25-pounder

export const buildBr25pdr = vehicle(() => ({
  hull: grime(merge([
    P.cyl(1.0, 1.0, 0.08, { y: 0.05, color: STEEL }, 18),                                      // the round firing platform
    P.box(0.16, 0.18, 2.6, { y: 0.42, z: -1.3, rx: -0.12, color: STONE }),                                // the box trail
    P.box(0.5, 0.3, 0.1, { y: 0.18, z: -2.55, color: STEEL }),
    ...pair((s) => tyre(s * 0.8, 0.64, 0.05, 0.55, 0.18)).flat(),
    P.cyl(0.06, 0.06, 1.6, { y: 0.64, z: 0.05, rz: Math.PI / 2, color: STEEL }, 8),                // the axle
    P.box(0.5, 0.42, 0.7, { y: 0.66, z: 0.0, color: STONE }),                                    // the carriage the cradle sits on
  ]), 1, 0.3),
  turret: { geo: grime(merge([P.box(1.4, 0.8, 0.05, { y: 0.75, z: 0.5, rx: -0.1, color: STONE, ...C }), P.box(0.36, 0.42, 0.9, { y: 0.5, color: STEEL })]), 0.8, 0, 0.3), at: [0, 0.4, 0] },
  gun: { geo: merge([P.box(0.3, 0.28, 1.0, { color: STEEL }), P.cyl(0.05, 0.06, 2.2, { z: 1.4, rx: Math.PI / 2, color: STONE_DK }, 12)]), at: [0, 0.75, 0.1], pitch: 0.38 },
  muzzle: [0, 0, 2.5],
  recoil: 0.42,
  tow: { geo: quadTow(), hitch: 2.9 },
}));

// ---------------------------------------------------------------- Universal Carrier

export const buildBrCarrier = (mats) => rig(once('bren', () => {
  const gear = runningGear({ halfWidth: 0.88, length: 2.4, wheels: 3, wheelR: 0.3, sprocket: 1, rollers: 0, trackWidth: 0.26, wheelColor: STONE_DK });
  return {
    gear, wheel: roadWheelGeometry(0.3, 0.2, STONE_DK),
    hull: grime(merge([
      ...gear.parts,
      // the open steel box: the floor, low walls round it, the sloped front plate with the Bren's slot
      P.box(1.24, 0.08, 3.4, { y: 0.4, z: -0.15, color: STONE_DK }),
      ...pair((s) => P.box(0.06, 0.7, 3.4, { x: s * 0.62, y: 0.7, z: -0.15, color: STONE, ...C })),
      ...pair((s) => P.box(0.36, 0.06, 3.3, { x: s * 0.86, y: 0.8, z: -0.1, color: STONE, ...C })),         // the guards over the tracks
      P.box(1.3, 0.7, 0.06, { y: 0.7, z: -1.85, color: STONE, ...C }),
      P.box(1.3, 0.75, 0.06, { y: 0.72, z: 1.62, rx: -0.35, color: STONE, ...C }),
      P.box(2.0, 0.3, 0.5, { y: 0.55, z: 1.95, color: STONE, ...C }),                              // the nose over the final drives
      P.box(0.5, 0.35, 0.8, { y: 0.6, z: -0.2, color: STONE_DK }),                                 // the engine cover between the seats
      ...[-1, 1].flatMap((s) => flash(s * 0.655, 0.95, -0.6)),
    ]), 1.25, 0.3),
    turret: merge([P.box(0.2, 0.15, 0.2, { y: 0.08, color: STEEL })]),
    gun: merge([P.cyl(0.02, 0.02, 0.8, { z: 0.4, rx: Math.PI / 2, color: STEEL }, 6), P.box(0.06, 0.14, 0.06, { y: 0.1, z: 0.2, rx: -0.3, color: STEEL })]),
  };
}), mats, { turretAt: [0.35, 1.0, 1.5], gunAt: [0, 0.12, 0.05], muzzle: 0.8 });

// ---------------------------------------------------------------- lorries

const lorry = (o, extra, body) => vehicle(() => {
  const { t, L, parts } = lorryOf(o, extra, body);
  return { wheels: wheeled(L.axles, t.track, o.r), hull: grime(merge(parts), 1, 0.4), muzzle: [0, 2.5, 0] };
});
export const buildBrAustinAmb = lorry({ ...AUSTIN, bodyH: 1.8 }, (L) => [
  ...pair((s) => [P.box(0.02, 0.6, 0.6, { x: s * (L.hw + 0.01), y: L.deck + 0.9, z: L.rear + 1.0, color: WHITE }), P.box(0.03, 0.4, 0.12, { x: s * (L.hw + 0.015), y: L.deck + 0.9, z: L.rear + 1.0, color: RED }), P.box(0.03, 0.12, 0.4, { x: s * (L.hw + 0.015), y: L.deck + 0.9, z: L.rear + 1.0, color: RED })]).flat(),
], 'box');
export const buildBrDorchester = lorry({ ...MATADOR, bodyH: 2.1 }, (L) => [
  P.cyl(0.03, 0.03, 3.2, { x: L.hw - 0.2, y: L.top + 1.6, z: L.rear + 0.6, color: STEEL }, 4),   // the wireless aerials
  P.cyl(0.03, 0.03, 2.6, { x: -L.hw + 0.2, y: L.top + 1.3, z: L.rear + 0.6, color: STEEL }, 4),
  P.box(2.6, 0.1, 2.0, { y: L.top + 0.05, z: L.rear + 1.6, color: STONE_DK }),                  // the awning rolled on the roof
], 'box');
export const buildBrScammell = lorry({ ...MATADOR, length: 6.8 }, (L) => [
  ...crane(0, L.deck, L.deck + 2.2, L.rear + 0.4, -1.9, 0.7, STONE_DK),                         // the jib's post and the jib over the back, the hook
], 'flat');
