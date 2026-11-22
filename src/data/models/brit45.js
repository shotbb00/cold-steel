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
//   buildBrCrusaderCS Crusader II CS (the 3-inch howitzer) · buildBrBishop the 25-pdr in a tall box on a Valentine
//   buildBrScorpion   Matilda Scorpion flail · buildBrBoforsPortee a Bofors on a lorry bed · buildBrGL GL radar lorry · buildBr37AA 3.7-inch AA
// and, in olive drab for the 21st Army Group (units45/brit21.js): buildBrChurchill21 (VII), buildBrChurchillSBG21 (AVRE with the
// Small Box Girder bridge), buildBrCrusaderAA21, buildBrMorrisBofors21, buildBrGL21, buildBr37AA21, buildBrLandMattress21,
// buildBr42Mortar21, buildBrSmoke21 — the makers (boforsLorry, radarLorry) take colours for models/brit14.js
import { P, merge, pair, grime } from '../units/geometry.js';
import { trackedHull, castTurret, runningGear, roadWheelGeometry, stationHull } from './vehicleCommon.js';
import { rig, crane, whiteStar } from './ww2Armour.js';
import { vehicle, wheeled, tracked, towTruck } from './support.js';
import { heavyAA } from './ww2AirDefence.js';
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

/** A Crusader hull in `color` with `turret(color, dark)` and `gun(dark)` on it (the gun tank, the CS, the AA tank). */
export const crusader = (key, color, dark, turret, gun, at) => (mats) => rig(once(key, () => {
  const gear = runningGear({ halfWidth: 1.18, length: 4.4, wheels: 5, wheelR: 0.41, sprocket: -1, rollers: 0, trackWidth: 0.32, wheelColor: dark });
  return {
    gear, wheel: roadWheelGeometry(0.41, 0.24, dark),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-3.0, 1.6, 0.5], [2.1, 1.6, 0.5], [2.55, 1.35, 0.55], [3.0, 1.0, 0.6]], { belly: 0.8, fender: 1.4, fenderY: 1.05, chamfer: 0.05 }, { color, ...C }),
      P.box(0.7, 0.18, 0.5, { x: 0.5, y: 1.68, z: 1.95, color, ...C }),                 // the driver's hood: low, under the 6-pdr's barrel
      P.box(0.3, 0.08, 0.04, { x: 0.5, y: 1.7, z: 2.21, color: GLASS }),                          // (the visor, on the hood's front)
      P.box(1.9, 0.12, 1.6, { y: 1.67, z: -2.0, color: dark }),                            // engine deck louvres
      ...pair((s) => P.box(0.05, 0.5, 4.8, { x: s * 1.43, y: 1.2, z: -0.1, color })),    // the sand shields over the tracks
      ...(color === STONE ? [-1, 1].flatMap((s) => flash(s * 1.46, 1.3, -1.2)) : []),
    ]), 1.25, 0.3),
    turret: turret(color, dark),
    gun: gun(dark),
  };
}), mats, at);
const crusaderTurret = (color, dark) => grime(merge([
  castTurret([[0.75, 0.72, 0.6], [0.5, 0.78, 0.66], [-0.6, 0.78, 0.64], [-0.95, 0.7, 0.56]], { color, ...C }, 6), // (angular: a high exponent)
  P.box(0.55, 0.45, 0.25, { y: 0.32, z: 0.82, color, ...C }),
  P.box(0.5, 0.2, 0.5, { x: -0.3, y: 0.72, z: -0.3, color: dark }),                   // the hatch
]), 0.9, 0.0, 0.3);

export const buildBrCrusader = crusader('crusader', STONE, STONE_DK, crusaderTurret,
  (dark) => merge([P.cyl(0.045, 0.05, 2.4, { z: 1.2, rx: Math.PI / 2, color: dark }, 10)]),
  { turretAt: [0, 1.6, 0.4], gunAt: [0, 0.32, 0.9], muzzle: 2.45 });
/** Crusader II CS: the close-support tank — the same turret, the short fat 3-inch howitzer for high explosive and smoke. */
export const buildBrCrusaderCS = crusader('crusaderCS', STONE, STONE_DK, crusaderTurret,
  (dark) => merge([P.cyl(0.07, 0.075, 1.25, { z: 0.62, rx: Math.PI / 2, color: dark }, 12)]),
  { turretAt: [0, 1.6, 0.4], gunAt: [0, 0.32, 0.9], muzzle: 1.3 });

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

// ================================================================ the rest of the British kit
// The 8th Army's in Light Stone; the 21st Army Group's (units45/brit21.js) in olive drab (OD21); the makers
// take the colours, so models/brit14.js builds the 14th Army's in jungle green from the same ones.
const OD21 = 0x4e5036, OD21_DK = 0x3b3d2a;
const YELLOW = 0xd2a82a, BLACK = 0x161616;

// ---------------------------------------------------------------- Sherman Firefly, Sherman Crab, M10 Achilles (21st Army Group)

/** The 21st Army Group's tactical signs on a plate facing +z (`dir` 1) or -z (-1), leaning back by `rx`: the red arm-of-service square with its serial, the yellow bridge-class disc. */
const brSigns = (z, y, hw, dir = 1, rx = 0) => {
  const at = (d) => ({ y: y - Math.sin(rx) * d * dir, z: z + Math.cos(rx) * d * dir });
  return [
    P.box(0.22, 0.22, 0.02, { x: -hw, ...at(0), rx, color: RED }), P.box(0.08, 0.1, 0.02, { x: -hw, ...at(0.012), rx, color: WHITE }),
    P.cyl(0.14, 0.14, 0.02, { x: hw, ...at(0), rx: rx + Math.PI / 2, color: YELLOW }, 14), P.box(0.1, 0.07, 0.02, { x: hw, ...at(0.012), rx, color: BLACK }),
  ];
};
/** The Sherman V (M4A4) most British Shermans were: the hull stretched for the Chrysler multibank, the bogies further apart; British stowage (the bin on the tail), the star and the signs. */
const shermanV = () => {
  const gear = runningGear({ halfWidth: 1.12, length: 4.3, wheels: 6, wheelR: 0.26, sprocket: 1, rollers: 3, trackWidth: 0.42, wheelColor: OD21_DK });
  return { gear, wheel: roadWheelGeometry(0.26, 0.36, OD21_DK), parts: [
    ...gear.parts,
    ...pair((s) => [-1.45, 0, 1.45].map((z) => P.box(0.2, 0.42, 0.7, { x: s * 1.12, y: 0.55, z, color: OD21_DK }))).flat(), // the volute bogies
    trackedHull([[-3.2, 1.72, 0.55], [-2.95, 1.95, 0.5], [1.3, 1.98, 0.5], [2.75, 1.05, 0.55]], { belly: 0.85, fender: 1.32, fenderY: 1.02, chamfer: 0.06 }, { color: OD21, ...C }),
    P.box(1.75, 0.62, 0.1, { y: 0.78, z: 2.62, rx: 0.46, color: OD21, ...C }),                      // the transmission nose
    ...pair((s) => P.box(0.36, 0.14, 0.18, { x: s * 0.42, y: 2.0, z: 1.15, color: OD21_DK })),       // the driver's and co-driver's hatches
    P.box(1.8, 0.04, 1.3, { y: 1.97, z: -2.3, color: OD21_DK }),                                     // the engine deck
    P.box(1.7, 0.5, 0.4, { y: 1.45, z: -3.4, color: OD21, ...C }),                                   // the stowage bin on the tail
    P.cyl(0.13, 0.13, 1.5, { y: 2.08, z: -2.95, rz: Math.PI / 2, color: 0x5c5a42 }, 8),              // a rolled tarpaulin
    ...pair((s) => P.box(0.06, 0.06, 1.2, { x: s * 1.25, y: 1.12, z: 0.3, color: STEEL })),          // the tools on the sponsons
    ...[-0.6, -0.3, 0, 0.3, 0.6].map((x) => P.box(0.26, 0.05, 0.16, { x, y: 1.715, z: 1.765, rx: 0.57, color: STEEL })), // spare track links on the glacis
    ...[-1, 1].flatMap((s) => whiteStar(s * 1.335, 1.55, -0.7, 0.36)),
    ...brSigns(-3.61, 1.45, 0.55, -1),
    ...brSigns(2.67, 0.76, 0.6, 1, 0.46),
  ] };
};
/** The Sherman's 75 mm turret (the Firefly kept it, the Crab too) with `extra` fittings. */
const turret75 = (extra) => grime(merge([
  castTurret([[1.1, 0.5, 0.5], [0.85, 0.85, 0.7], [0.2, 0.98, 0.76], [-0.6, 0.95, 0.74], [-1.2, 0.8, 0.58], [-1.45, 0.5, 0.4]], { color: OD21, ...C }),
  P.cyl(0.33, 0.35, 0.2, { x: 0.45, y: 0.84, z: -0.35, color: OD21, ...C }, 14),                    // the commander's cupola
  ...extra,
]), 0.9, 0.0, 0.3);
/** The QF 17-pounder along +z, `L` to the brake: the thick breech end, the long tube, the counterweight collar and the double-baffle brake (muzzle at L + 0.32). */
const seventeenPdr = (L, color) => merge([
  P.cyl(0.072, 0.085, 0.7, { z: 0.35, rx: Math.PI / 2, color }, 12),
  P.cyl(0.05, 0.064, L - 0.7, { z: 0.7 + (L - 0.7) / 2, rx: Math.PI / 2, color }, 12),
  P.cyl(0.088, 0.088, 0.24, { z: L - 0.2, rx: Math.PI / 2, color }, 12),                             // the counterweight
  P.cyl(0.055, 0.055, 0.32, { z: L + 0.16, rx: Math.PI / 2, color: STEEL }, 10),
  ...[0.06, 0.26].map((d) => P.box(0.22, 0.15, 0.1, { z: L + d, color: STEEL })),                    // the brake's two baffles
]);

/** Sherman VC Firefly: the 17-pounder crammed into the 75 mm turret, its barrel far out past the nose; the wireless moved into a box on the turret's back, the hull gunner and his MG gone (the plate over the hole: ammunition there now). */
export const buildBrFirefly21 = (mats) => rig(once('firefly21', () => {
  const v = shermanV();
  return {
    gear: v.gear, wheel: v.wheel,
    hull: grime(merge([...v.parts, P.cyl(0.11, 0.11, 0.06, { x: 0.5, y: 1.49, z: 2.1, rx: 0.57, color: OD21 }, 10)]), 1.25, 0.3),
    turret: turret75([
      P.box(1.0, 0.58, 0.34, { y: 0.4, z: 1.24, color: OD21, ...C }),                                // the 17-pounder's wider mantlet
      P.box(1.0, 0.45, 0.62, { y: 0.42, z: -1.62, color: OD21, ...C }),                              // the bustle box with the No. 19 set
      P.box(0.5, 0.05, 0.38, { x: -0.45, y: 0.97, z: -0.3, color: OD21_DK }),                        // the loader's big hatch
      P.cyl(0.12, 0.12, 0.9, { y: 0.74, z: -1.65, rz: Math.PI / 2, color: 0x5c5a42 }, 8),            // bedrolls on the box
      ...[-0.35, 0.35].map((x, k) => P.cyl(0.012, 0.012, 2.4 - k * 0.6, { x, y: 1.85 - k * 0.3, z: -1.75, color: STEEL }, 4)), // the aerials
    ]),
    gun: seventeenPdr(4.2, OD21),
  };
}), mats, { turretAt: [0, 1.98, -0.2], gunAt: [0, 0.42, 1.3], muzzle: 4.52 });

/** Sherman Crab: the flail drum out in front on its two arms, driven off the main engine, the chains, the wire-cutter discs at the drum's ends; the lane-marking boxes and station-keeping lights on the tail. */
export const buildBrCrab21 = (mats) => rig(once('crab21', () => {
  const v = shermanV();
  const ARM = Math.atan2(0.55, 3.6);
  return {
    gear: v.gear, wheel: v.wheel,
    hull: grime(merge([
      ...v.parts,
      P.cyl(0.02, 0.02, 0.45, { x: 0.5, y: 1.62, z: 2.1, rx: Math.PI / 2 - 0.6, color: STEEL }, 6),  // the bow MG
      ...pair((s) => P.box(0.3, 0.4, 0.4, { x: s * 1.45, y: 1.35, z: 0.95, color: OD21_DK })),        // the arms' pivot brackets
      ...pair((s) => P.box(0.14, 0.2, 3.65, { x: s * 1.5, y: 1.17, z: 2.8, rx: ARM, color: OD21 })),  // the arms
      P.cyl(0.07, 0.07, 3.6, { x: 1.38, y: 1.25, z: 2.8, rx: Math.PI / 2 - ARM, color: STEEL }, 8),   // the drive shaft down the right arm
      P.cyl(0.18, 0.18, 3.3, { y: 0.9, z: 4.6, rz: Math.PI / 2, color: STEEL }, 12),                  // the rotor drum
      ...pair((s) => [
        P.cyl(0.4, 0.4, 0.04, { x: s * 1.66, y: 0.9, z: 4.6, rz: Math.PI / 2, color: STEEL }, 14),   // the wire cutters
        P.box(0.04, 0.6, 0.9, { x: s * 1.6, y: 1.05, z: 4.35, color: OD21 }),                         // the side screens round the bearings
      ]).flat(),
      ...Array.from({ length: 16 }, (_, k) => [
        P.box(0.03, 0.55, 0.03, { x: -1.42 + k * 0.19, y: 0.6, z: 4.65 + (k % 2) * 0.05, rx: -0.12, color: 0x222220 }), // the chains…
        P.box(0.07, 0.07, 0.07, { x: -1.42 + k * 0.19, y: 0.32, z: 4.69 + (k % 2) * 0.05, color: 0x222220 }),           // …their weights
      ]).flat(),
      ...pair((s) => [
        P.box(0.32, 0.45, 0.34, { x: s * 1.15, y: 1.45, z: -3.42, color: OD21_DK }),                  // the lane markers (powder and pickets)
        P.cyl(0.02, 0.02, 1.3, { x: s * 1.15, y: 2.32, z: -3.42, color: STEEL }, 4),                  // the station-keeping lights on their poles
        P.box(0.12, 0.12, 0.12, { x: s * 1.15, y: 3.0, z: -3.42, color: s > 0 ? 0xc8c0a0 : 0x7a2620 }),
      ]).flat(),
    ]), 1.25, 0.3),
    turret: turret75([P.box(0.85, 0.5, 0.28, { y: 0.4, z: 1.15, color: OD21, ...C })]),
    gun: merge([P.cyl(0.05, 0.06, 2.3, { z: 1.15, rx: Math.PI / 2, color: OD21 }, 10)]),           // the 75 mm M3
  };
}), mats, { turretAt: [0, 1.98, -0.2], gunAt: [0, 0.4, 1.25], muzzle: 2.35 });

/** M10 Achilles: the M10's sloped hull on the M4A2's running gear, its bolted-on armour bosses, the open five-sided turret with the counterweights on its back — re-gunned with the 17-pounder. */
export const buildBrAchilles21 = (mats) => rig(once('achilles21', () => {
  const gear = runningGear({ halfWidth: 1.12, length: 4.0, wheels: 6, wheelR: 0.26, sprocket: 1, rollers: 3, trackWidth: 0.42, wheelColor: OD21_DK });
  const full = [[0, 0.55], [0.9, 0.55], [0.9, 1.0], [1.48, 1.0], [0.98, 1.95], [0, 1.95]];
  const LEAN = Math.atan2(0.5, 0.95), GLACIS = Math.atan2(0.9, 2.05);
  // the bolted plates on the sloped sides, each with its bolt heads
  const plates = pair((s) => [-1.8, -0.6].flatMap((z) => {
    const out = (d, u) => ({ x: s * (1.23 + Math.cos(LEAN) * d - Math.sin(LEAN) * u), y: 1.475 + Math.sin(LEAN) * d + Math.cos(LEAN) * u });
    return [P.box(0.04, 0.85, 1.1, { ...out(0.03, 0), z, rz: s * LEAN, color: OD21, ...C }),
      ...[-0.3, 0.3].flatMap((u) => [-0.45, 0, 0.45].map((dz) => P.box(0.05, 0.05, 0.05, { ...out(0.06, u), z: z + dz, rz: s * LEAN, color: OD21_DK })))];
  })).flat();
  const top = [[0.86, -0.86], [0.9, 0.1], [0.44, 0.95], [-0.44, 0.95], [-0.9, 0.1], [-0.86, -0.86]];
  const rim = top.map(([x, z], i) => {
    const [x2, z2] = top[(i + 1) % top.length];
    return P.box(Math.hypot(x2 - x, z2 - z) + 0.04, 0.12, 0.05, { x: (x + x2) / 2, y: 0.68, z: (z + z2) / 2, ry: Math.atan2(-(z2 - z), x2 - x), color: OD21, ...C });
  });
  return {
    gear, wheel: roadWheelGeometry(0.26, 0.36, OD21_DK),
    hull: grime(merge([
      ...gear.parts,
      ...pair((s) => [-1.35, 0, 1.35].map((z) => P.box(0.2, 0.42, 0.7, { x: s * 1.12, y: 0.55, z, color: OD21_DK }))).flat(),
      stationHull([
        [-2.95, [[0, 0.6], [0.9, 0.6], [0.9, 1.0], [1.45, 1.0], [1.2, 1.5], [0, 1.5]]],
        [-2.45, full], [0.8, full],
        [2.85, [[0, 0.65], [0.9, 0.65], [0.9, 0.95], [1.38, 0.95], [1.3, 1.05], [0, 1.05]]],
      ], { color: OD21, ...C }),
      P.box(1.8, 0.5, 0.12, { y: 0.75, z: 2.88, rx: 0.5, color: OD21, ...C }),                       // the cast transmission nose
      ...plates,
      ...pair((s) => P.box(0.9, 0.04, 0.9, { x: s * 0.5, y: 1.582, z: 1.712, rx: GLACIS, color: OD21, ...C })), // the plates on the glacis
      P.box(1.7, 0.05, 1.2, { y: 1.97, z: -1.9, color: OD21_DK }),                                   // the engine deck
      P.box(1.6, 0.4, 0.4, { y: 1.3, z: -3.15, color: OD21, ...C }),                                 // the stowage bin on the tail
      ...[-1, 1].flatMap((s) => whiteStar(s * 0.001, 0, 0, 0.3).map((g) => g.rotateZ(s * LEAN).translate(s * (1.23 + Math.cos(LEAN) * 0.035), 1.475 + Math.sin(LEAN) * 0.035, 0.3))), // (on the sloped side)
      ...brSigns(-3.36, 1.3, 0.5, -1),
    ]), 1.25, 0.3),
    turret: grime(merge([
      stationHull([
        [0, [[0, -0.95], [0.95, -0.95], [1.02, 0.15], [0.5, 1.05], [0, 1.05]]],
        [0.62, [[0, -0.86], [0.86, -0.86], [0.9, 0.1], [0.44, 0.95], [0, 0.95]]],
      ], { color: OD21, ...C }, 'y'),
      stationHull([[0.62, [[0, -0.8], [0.8, -0.8], [0.84, 0.08], [0.4, 0.89], [0, 0.89]]], [0.64, [[0, -0.8], [0.8, -0.8], [0.84, 0.08], [0.4, 0.89], [0, 0.89]]]], { color: 0x23241c }, 'y'), // the open top: the dark inside
      ...rim,
      P.box(0.8, 0.55, 0.3, { y: 0.32, z: 1.12, color: OD21, ...C }),                               // the mantlet
      P.box(0.34, 0.3, 0.9, { y: 0.66, z: 0.3, color: OD21_DK }),                                    // the breech, seen from above
      ...pair((s) => P.box(0.6, 0.42, 0.5, { x: s * 0.46, y: 0.28, z: -1.18, color: OD21, ...C })),  // the counterweights on the back
      P.box(0.05, 0.4, 0.05, { x: 0.6, y: 0.85, z: -0.8, color: STEEL }),                            // the .50 on its pintle
      P.box(0.1, 0.12, 0.5, { x: 0.6, y: 1.08, z: -0.65, color: STEEL }),
    ]), 0.9, 0.0, 0.3),
    gun: seventeenPdr(4.2, OD21),
  };
}), mats, { turretAt: [0, 1.95, -0.35], gunAt: [0, 0.32, 1.15], muzzle: 4.52 });

// ---------------------------------------------------------------- Crusader AA Mk III (21st Army Group)

/** Crusader AA Mk III: the small, flat, enclosed turret with two 20 mm Oerlikons. */
export const buildBrCrusaderAA21 = crusader('crusaderAA21', OD21, OD21_DK,
  (color, dark) => grime(merge([
    castTurret([[0.55, 0.6, 0.48], [-0.55, 0.62, 0.5], [-0.7, 0.55, 0.45]], { color, ...C }, 6),
    P.box(0.6, 0.35, 0.2, { y: 0.26, z: 0.6, color, ...C }),
    P.box(0.4, 0.08, 0.4, { x: -0.2, y: 0.52, z: -0.2, color: dark }),
  ]), 0.9, 0.0, 0.3),
  () => merge(pair((s) => P.cyl(0.025, 0.03, 1.6, { x: s * 0.17, z: 0.8, rx: Math.PI / 2, color: STEEL }, 8))),
  { turretAt: [0, 1.6, 0.2], gunAt: [0, 0.28, 0.6], muzzle: 1.6 });

// ---------------------------------------------------------------- Bishop (8th Army)

/** The Valentine's hull and running gear: small, low, six road wheels a side. */
export const valentineHull = (color, dark) => {
  const g = tracked({ halfWidth: 1.05, length: 3.6, wheels: 6, wheelR: 0.3, sprocket: -1, rollers: 3, trackWidth: 0.36, wheelColor: dark });
  return { wheels: g.wheels, parts: [
    ...g.parts,
    trackedHull([[-2.7, 1.55, 0.55], [1.6, 1.6, 0.55], [2.7, 1.0, 0.6]], { belly: 0.75, fender: 1.25, fenderY: 1.0, chamfer: 0.05 }, { color, ...C }),
    P.box(1.6, 0.1, 1.0, { y: 1.58, z: -1.9, color: dark }),                                       // engine deck
  ] };
};
/** Bishop: a 25-pounder in a tall fixed box on a Valentine — it lays by turning the hull. */
export const buildBrBishop = vehicle(() => {
  const v = valentineHull(STONE, STONE_DK);
  return {
    wheels: v.wheels,
    hull: grime(merge([
      ...v.parts,
      P.box(1.8, 1.25, 1.8, { y: 2.2, z: -0.1, color: STONE, ...C }),                            // the tall box, open at the back
      P.box(0.5, 0.25, 0.5, { x: -0.4, y: 2.9, z: -0.4, color: STONE_DK }),                       // the roof hatch
      ...[-1, 1].flatMap((s) => flash(s * 0.91, 2.2, -0.4)),
    ]), 1.25, 0.3),
    turret: { geo: merge([P.box(0.6, 0.5, 0.25, { color: STONE_DK })]), at: [0, 2.15, 0.85] },
    gun: { geo: merge([P.cyl(0.05, 0.06, 1.7, { z: 0.85, rx: Math.PI / 2, color: STONE_DK }, 12)]), at: [0, 0, 0.1], pitch: null },
    muzzle: [0, 0, 1.7],
    recoil: 0.35,
  };
});

// ---------------------------------------------------------------- Matilda Scorpion (8th Army)

/** Matilda Scorpion: the Matilda II with a flail drum out in front on two arms, its own engine boxed on the right. */
export const buildBrScorpion = vehicle(() => {
  const g = tracked({ halfWidth: 1.1, length: 4.2, wheels: 10, wheelR: 0.18, sprocket: -1, rollers: 0, trackWidth: 0.36, wheelColor: STONE_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.0, 1.75, 0.5], [2.2, 1.75, 0.5], [2.9, 1.1, 0.55]], { belly: 0.75, fender: 1.3, fenderY: 1.05, chamfer: 0.05 }, { color: STONE, ...C }),
      ...pair((s) => P.box(0.08, 0.7, 5.6, { x: s * 1.34, y: 0.75, z: -0.1, color: STONE, ...C })), // the side skirts over the bogies
      P.box(0.6, 0.75, 1.4, { x: 1.62, y: 1.45, z: 0.3, color: STONE, ...C }),                     // the flail’s own engine in its box
      ...pair((s) => P.box(0.12, 0.12, 2.7, { x: s * 1.2, y: 1.05, z: 3.95, rx: 0.18, color: STEEL })), // the arms
      P.cyl(0.12, 0.12, 3.0, { y: 0.8, z: 5.2, rz: Math.PI / 2, color: STEEL }, 10),               // the drum…
      ...Array.from({ length: 14 }, (_, k) => P.box(0.03, 0.6, 0.03, { x: -1.3 + k * 0.2, y: 0.45, z: 5.25, color: 0x222220 })), // …its chains
      ...[-1, 1].flatMap((s) => flash(s * 1.39, 1.0, -1.2)),
    ]), 1.25, 0.3),
    turret: { geo: grime(merge([castTurret([[0.6, 0.6, 0.62], [-0.6, 0.62, 0.62], [-0.8, 0.5, 0.52]], { color: STONE, ...C }, 2.2)]), 0.9, 0, 0.3), at: [0, 1.75, 0.0] },
    gun: { geo: merge([P.cyl(0.03, 0.035, 1.3, { z: 0.65, rx: Math.PI / 2, color: STONE_DK }, 8)]), at: [0, 0.32, 0.6], pitch: null },
    muzzle: [0, 0, 1.3],
    recoil: 0.1,
  };
});

// ---------------------------------------------------------------- Bofors on a lorry

/** A 40 mm Bofors on the bed of a light lorry: the 8th Army’s portée, the 21st Army Group’s Morris C9/B. */
export const boforsLorry = (color, dark) => vehicle(() => {
  const { t, L, parts } = lorryOf({ ...AUSTIN, color, dark }, () => [], 'flat');
  return {
    wheels: wheeled(L.axles, t.track, AUSTIN.r),
    hull: grime(merge(parts), 1, 0.4),
    turret: { geo: grime(merge([P.cyl(0.35, 0.42, 0.4, { y: 0.2, color: dark }, 12), P.box(1.0, 0.35, 0.9, { y: 0.55, color }), ...pair((s) => P.box(0.28, 0.05, 0.28, { x: s * 0.6, y: 0.72, z: -0.4, color: STEEL }))]), 0.8, 0, 0.3), at: [0, L.deck, L.rear + 1.2] },
    gun: { geo: merge([P.cyl(0.05, 0.055, 2.4, { z: 1.2, rx: Math.PI / 2, color: STEEL }, 10), P.box(0.35, 0.4, 0.8, { color: dark })]), at: [0, 0.85, 0.1], pitch: null },
    muzzle: [0, 0, 2.4],
    recoil: 0.06,
  };
});
export const buildBrBoforsPortee = boforsLorry(STONE, STONE_DK);
export const buildBrMorrisBofors21 = boforsLorry(OD21, OD21_DK);

// ---------------------------------------------------------------- radar

/** A radar lorry: GL (`gl`: the gun-laying set’s aerial frame of dipoles) or a light warning set (`yagi`: one beam on a mast). */
export const radarLorry = (color, dark, kind = 'gl') => vehicle(() => {
  const { t, L, parts } = lorryOf({ ...MATADOR, color, dark, bodyH: 2.0 }, () => [], 'box');
  const spin = kind === 'gl'
    ? [P.box(0.12, 1.4, 0.12, { y: 0.7, color: STEEL }), P.box(3.0, 0.08, 0.08, { y: 1.4, color: STEEL }), P.box(0.08, 1.4, 0.08, { y: 1.4, color: STEEL }),
      ...Array.from({ length: 6 }, (_, k) => P.box(0.04, 0.6, 0.04, { x: -1.25 + k * 0.5, y: 1.4, z: 0.15, color: 0x8a8c80 }))]
    : [P.box(0.1, 2.6, 0.1, { y: 1.3, color: STEEL }), P.box(0.06, 0.06, 2.6, { y: 2.6, z: 0.6, color: STEEL }),
      ...Array.from({ length: 5 }, (_, k) => P.box(1.1 - k * 0.12, 0.03, 0.03, { y: 2.6, z: -0.4 + k * 0.5, color: 0x8a8c80 }))];
  return { wheels: wheeled(L.axles, t.track, MATADOR.r), hull: grime(merge(parts), 1, 0.4), muzzle: [0, 3, 0], spin: { geo: merge(spin), at: [0, L.top, L.rear + 1.3], rate: 1.0 } };
});
export const buildBrGL = radarLorry(STONE, STONE_DK);
export const buildBrGL21 = radarLorry(OD21, OD21_DK);

// ---------------------------------------------------------------- the 3.7-inch AA gun

export const buildBr37AA = heavyAA(STONE, 4.7, STONE_DK, 'square');
export const buildBr37AA21 = heavyAA(OD21, 4.7, OD21_DK, 'square');

// ---------------------------------------------------------------- Churchill (21st Army Group)

/** The Churchill’s long hull: the tracks run up round the tall side panniers (the little bogies hidden under them), the round escape doors. */
const churchillHull = (color, dark) => {
  const g = tracked({ halfWidth: 1.35, length: 6.0, wheels: 11, wheelR: 0.2, sprocket: -1, rollers: 0, trackWidth: 0.36, wheelColor: dark });
  return { wheels: g.wheels, parts: [
    ...g.parts,
    trackedHull([[-3.6, 2.0, 0.55], [3.0, 2.0, 0.55], [3.6, 1.6, 0.6]], { belly: 0.95, fender: 1.05, fenderY: 1.0, chamfer: 0.05 }, { color, ...C }),
    ...pair((s) => P.box(0.5, 1.15, 7.0, { x: s * 1.35, y: 1.2, color, ...C })),                   // the panniers
    ...pair((s) => P.box(0.42, 0.08, 7.3, { x: s * 1.35, y: 1.82, color: STEEL })),                // the track’s top run over them
    ...pair((s) => P.cyl(0.28, 0.28, 0.04, { x: s * 1.61, y: 1.25, z: 0.6, rz: Math.PI / 2, color: dark }, 12)), // the escape doors
    P.box(1.8, 0.1, 1.6, { y: 2.03, z: -2.4, color: dark }),                                      // engine deck
  ] };
};
const churchillTurret = () => castTurret([[0.85, 0.78, 0.72], [0.5, 0.84, 0.76], [-0.7, 0.84, 0.74], [-1.0, 0.74, 0.66]], { color: OD21, ...C }, 3);
/** Churchill VII: the thickest-armoured Allied tank, the 75 mm in the heavy cast-and-welded turret. */
export const buildBrChurchill21 = vehicle(() => {
  const h = churchillHull(OD21, OD21_DK);
  return {
    wheels: h.wheels,
    hull: grime(merge(h.parts), 1.25, 0.3),
    turret: { geo: grime(merge([churchillTurret(), P.box(0.6, 0.45, 0.25, { y: 0.34, z: 0.92, color: OD21, ...C })]), 0.9, 0, 0.3), at: [0, 2.0, 0.5] },
    gun: { geo: merge([P.cyl(0.05, 0.055, 2.4, { z: 1.2, rx: Math.PI / 2, color: OD21_DK }, 10)]), at: [0, 0.34, 1.0], pitch: null },
    muzzle: [0, 0, 2.4],
    recoil: 0.3,
  };
});
/** The AVRE's turret: the welded Churchill III's slab-sided square box, the Petard's short fat spigot mortar in its mantlet (the gun group). */
const avreTurret = () => grime(merge([
  stationHull([[0, [[0, -0.9], [0.8, -0.9], [0.8, 0.78], [0, 0.78]]], [0.8, [[0, -0.84], [0.74, -0.84], [0.74, 0.72], [0, 0.72]]]], { color: OD21, ...C }, 'y'),
  P.box(0.62, 0.5, 0.2, { y: 0.38, z: 0.86, color: OD21, ...C }),                                  // the mantlet plate
  P.cyl(0.24, 0.26, 0.12, { x: 0.3, y: 0.86, z: -0.3, color: OD21, ...C }, 12),                     // the commander's cupola
  P.box(0.42, 0.05, 0.42, { x: -0.32, y: 0.82, z: -0.25, color: OD21_DK }),                          // the loader's hatch
  P.cyl(0.012, 0.012, 2.2, { x: -0.55, y: 1.9, z: -0.75, color: STEEL }, 4),                         // the No. 19 set's aerial
]), 0.9, 0, 0.3);
const petard = () => merge([
  P.cyl(0.15, 0.17, 0.95, { z: 0.47, rx: Math.PI / 2, color: OD21_DK }, 12),                        // the 290 mm spigot mortar: a short, fat tube
  P.cyl(0.19, 0.19, 0.1, { z: 0.92, rx: Math.PI / 2, color: STEEL }, 12),                            // its reinforced muzzle
]);
/** Churchill AVRE (79th Armoured Division): the Petard for the bunkers and the sea walls, the demolition-charge boxes on the panniers, a dozer blade fitted up front. */
export const buildBrAVRE21 = vehicle(() => {
  const h = churchillHull(OD21, OD21_DK);
  return {
    wheels: h.wheels,
    hull: grime(merge([
      ...h.parts,
      ...pair((s) => [-1.6, 1.2].map((z) => P.box(0.2, 0.42, 1.0, { x: s * 1.68, y: 1.4, z, color: OD21_DK }))).flat(), // the charge boxes on the pannier sides
      ...pair((s) => P.box(0.14, 0.18, 1.2, { x: s * 1.38, y: 0.8, z: 3.55, rx: 0.12, color: STEEL })),               // the blade's push arms…
      P.box(3.2, 0.9, 0.12, { y: 0.72, z: 4.15, rx: -0.18, color: OD21_DK }),                                            // …the blade, lifted
      P.box(3.2, 0.08, 0.2, { y: 0.28, z: 4.24, color: STEEL }),                                                         // its cutting edge
      ...[-1, 1].flatMap((s) => whiteStar(s * 1.62, 1.35, -0.2, 0.32)),
      ...brSigns(-3.62, 1.55, 0.7, -1),
    ]), 1.25, 0.3),
    turret: { geo: avreTurret(), at: [0, 2.0, 0.5] },
    gun: { geo: petard(), at: [0, 0.38, 0.96], pitch: null },
    muzzle: [0, 0, 0.97],
    recoil: 0.15,
  };
});
/** Churchill AVRE with the Small Box Girder bridge held up in front on its frame (dropped across the gap), the Petard’s stubby barrel. */
export const buildBrChurchillSBG21 = vehicle(() => {
  const h = churchillHull(OD21, OD21_DK);
  return {
    wheels: h.wheels,
    hull: grime(merge(h.parts), 1.25, 0.3),
    turret: { geo: merge([avreTurret(), petard().translate(0, 0.38, 0.96)]), at: [0, 2.0, 0.5] }, // (the Petard)
    load: merge([
      ...pair((s) => P.box(0.3, 0.55, 9.0, { x: s * 1.1, y: 3.0, z: 3.4, rx: -0.3, color: OD21_DK })), // the two girders…
      P.box(2.2, 0.08, 9.0, { y: 2.8, z: 3.4, rx: -0.3, color: STEEL }),                             // …the deck between them
    ]),
    muzzle: [0, 2.5, 0],
  };
});

// ---------------------------------------------------------------- Land Mattress, the 4.2-inch mortar (21st Army Group)

/** Land Mattress: thirty 3-inch rocket tubes in a block on a light two-wheeled carriage, towed behind a lorry. */
export const buildBrLandMattress21 = vehicle(() => ({
  hull: grime(merge([...pair((s) => tyre(s * 0.85, 0.45, 0.0, 0.45, 0.16)).flat(), P.box(1.75, 0.1, 0.1, { y: 0.45, color: STEEL }),
    ...pair((s) => P.box(0.1, 0.1, 2.0, { x: s * 0.3, y: 0.32, z: -1.0, ry: s * 0.15, rx: 0.12, color: OD21 }))]), 1, 0.3),
  turret: { geo: merge([P.box(0.5, 0.3, 0.5, { y: 0.2, color: OD21_DK })]), at: [0, 0.45, 0.0] },
  gun: { geo: merge(Array.from({ length: 30 }, (_, k) => P.cyl(0.045, 0.045, 1.5, { x: ((k % 6) - 2.5) * 0.12, y: (Math.floor(k / 6) - 2) * 0.12, z: 0.5, rx: Math.PI / 2, color: k % 2 ? OD21 : OD21_DK }, 8))), at: [0, 0.6, 0.0], pitch: 0.6 },
  muzzle: [0, 0, 1.25],
  recoil: 0.02,
  tow: { geo: grime(merge(towTruck({ color: OD21, dark: OD21_DK, length: 5.4, width: 2.2, bonnet: 'square' })), 1, 0.4), hitch: 2.2 },
}));
/** The 4.2-inch mortar on its wheeled carriage, unhitched and laid; towed by a light lorry. */
export const buildBr42Mortar21 = vehicle(() => ({
  hull: grime(merge([P.box(0.65, 0.08, 0.65, { y: 0.04, z: -0.3, color: STEEL }), ...pair((s) => tyre(s * 0.65, 0.38, 0.4, 0.36, 0.16)).flat(), P.box(1.3, 0.08, 0.1, { y: 0.38, z: 0.4, color: OD21_DK })]), 1, 0.3),
  turret: { geo: grime(merge(pair((s) => P.box(0.05, 0.85, 0.05, { x: s * 0.33, y: 0.4, z: 0.55, rz: s * 0.3, rx: -0.3, color: STEEL }))), 0.6, 0, 0.3), at: [0, 0.1, 0] },
  gun: { geo: merge([P.cyl(0.065, 0.075, 1.75, { z: 0.8, rx: Math.PI / 2, color: OD21 }, 12)]), at: [0, 0.0, -0.3], pitch: 0.95 },
  muzzle: [0, 0, 1.7],
  recoil: 0.1,
  tow: { geo: grime(merge(towTruck({ color: OD21, dark: OD21_DK, length: 4.6, width: 2.1, bonnet: 'square' })), 1, 0.4), hitch: 1.2 },
}));

// ---------------------------------------------------------------- smoke lorry (21st Army Group)

/** A Pioneer smoke company’s lorry: the generators and the fuel drums on its bed, the exhaust stack. */
export const buildBrSmoke21 = lorry({ ...MATADOR, color: OD21, dark: OD21_DK }, (L) => [
  ...[-0.55, 0, 0.55].map((x) => P.cyl(0.28, 0.28, 0.9, { x, y: L.deck + 0.45, z: L.rear + 0.7, color: 0x3a3c32 }, 12)),
  P.box(1.2, 0.8, 1.3, { y: L.deck + 0.4, z: L.rear + 2.1, color: STEEL }),
  P.cyl(0.1, 0.12, 1.1, { x: 0.4, y: L.deck + 1.25, z: L.rear + 2.3, color: 0x222220 }, 8),
], 'flat');
