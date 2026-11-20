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
import { rig, crane } from './ww2Armour.js';
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
const crusader = (key, color, dark, turret, gun, at) => (mats) => rig(once(key, () => {
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
const valentineHull = (color, dark) => {
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
/** Churchill AVRE with the Small Box Girder bridge held up in front on its frame (dropped across the gap), the Petard’s stubby barrel. */
export const buildBrChurchillSBG21 = vehicle(() => {
  const h = churchillHull(OD21, OD21_DK);
  return {
    wheels: h.wheels,
    hull: grime(merge(h.parts), 1.25, 0.3),
    turret: { geo: grime(merge([churchillTurret(), P.cyl(0.14, 0.14, 0.7, { y: 0.35, z: 1.25, rx: Math.PI / 2, color: OD21_DK }, 10)]), 0.9, 0, 0.3), at: [0, 2.0, 0.5] }, // (the Petard)
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
