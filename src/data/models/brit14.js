// The 14th Army in Burma, 1944 (Kohima), in jungle green — what models/brit45.js (the 8th Army's desert kit) doesn't have:
//   buildBrStuart     M3A1 Stuart ("Honey"): small and tall, two volute bogies a side, the round-sided turret with the 37 mm
//   buildBrJeepCP     Willys jeep with a No. 22 wireless set in the back, its aerials up when set up (the command post)
//   buildBrJeepAmb    Willys jeep with the stretcher frame over the bonnet and the back (the Burma field ambulance)
//   buildBrPack37     the 3.7-inch mountain howitzer: split trail, small wheels, the short barrel; jeep-towed here (mules in the hills)
//   buildBr25pdrJG    the 25-pounder on its platform, towed by a Morris Quad, in jungle green
//   buildBrRecoveryJG a Matador-sized recovery lorry with its jib, in jungle green
import { P, merge, pair, grime } from '../units/geometry.js';
import { trackedHull, castTurret, runningGear, roadWheelGeometry } from './vehicleCommon.js';
import { rig, crane } from './ww2Armour.js';
import { vehicle, wheeled, towTruck } from './support.js';
import { truckUnit } from './truck.js';

const JG = 0x46503a, JG_DK = 0x343b2a, STEEL = 0x2b2d28, RUBBER = 0x1f201c, CANVAS = 0x5a5c42, RED = 0xb8231e, WHITE = 0xe6e2d6, GLASS = 0x1a1d1c;
const C = { camo: 1 };
const cache = {};
const once = (key, make) => (cache[key] ??= make());
const tyre = (x, y, z, r, w) => [
  P.cyl(r, r, w, { x, y, z, rz: Math.PI / 2, color: RUBBER, surf: 'rubber' }, 14),
  P.cyl(r * 0.55, r * 0.55, w + 0.02, { x, y, z, rz: Math.PI / 2, color: STEEL }, 10),
];
/** SEAC's white star in its ring was not used: the 14th Army's vehicles carried a white recognition bar instead. */
const bar = (x, y, z) => P.box(0.02, 0.1, 0.5, { x, y, z, color: WHITE });

// ---------------------------------------------------------------- M3A1 Stuart (4.5 × 2.2 m, 2.3 m high)

export const buildBrStuart = (mats) => rig(once('stuart', () => {
  const gear = runningGear({ halfWidth: 0.95, length: 3.1, wheels: 4, wheelR: 0.26, sprocket: 1, rollers: 3, trackWidth: 0.3, wheelColor: JG_DK });
  return {
    gear, wheel: roadWheelGeometry(0.26, 0.26, JG_DK),
    hull: grime(merge([
      ...gear.parts,
      ...pair((s) => [-0.78, 0.78].map((z) => P.box(0.16, 0.4, 0.62, { x: s * 0.95, y: 0.52, z, color: JG_DK }))).flat(), // the volute bogies
      // the tall narrow hull: the engine deck high at the back, the stepped glacis to the front
      trackedHull([[-2.25, 1.55, 0.5], [-1.0, 1.65, 0.5], [1.2, 1.65, 0.5], [1.8, 1.35, 0.55], [2.25, 0.95, 0.6]], { belly: 0.72, fender: 1.12, fenderY: 0.98, chamfer: 0.05 }, { color: JG, ...C }),
      P.box(1.5, 0.3, 0.6, { y: 1.72, z: 1.25, color: JG, ...C }),                              // the driver's and bow gunner's front box
      ...pair((s) => P.box(0.3, 0.08, 0.04, { x: s * 0.4, y: 1.76, z: 1.56, color: GLASS })),   // their hatches' vision slots
      P.cyl(0.02, 0.02, 0.4, { x: 0.4, y: 1.6, z: 1.7, rx: Math.PI / 2 - 0.4, color: STEEL }, 6), // the bow Browning
      P.box(1.6, 0.06, 1.1, { y: 1.68, z: -1.6, color: JG_DK }),                                 // engine deck
      ...pair((s) => bar(s * 1.125, 1.3, -0.4)),
    ]), 1.25, 0.3),
    turret: grime(merge([
      castTurret([[0.6, 0.56, 0.6], [0.35, 0.62, 0.64], [-0.55, 0.6, 0.62], [-0.75, 0.5, 0.55]], { color: JG, ...C }, 2.2), // (round-sided, as the welded M3A1's)
      P.box(0.4, 0.34, 0.2, { y: 0.32, z: 0.68, color: JG, ...C }),                                // the mantlet
      P.box(0.5, 0.08, 0.5, { x: -0.1, y: 0.65, z: -0.2, color: JG_DK }),                         // the split hatch
    ]), 0.9, 0.0, 0.3),
    gun: merge([P.cyl(0.028, 0.034, 1.7, { z: 0.85, rx: Math.PI / 2, color: JG_DK }, 8)]),
  };
}), mats, { turretAt: [0, 1.65, 0.1], gunAt: [0, 0.32, 0.7], muzzle: 1.75 });

// ---------------------------------------------------------------- Willys jeep (3.36 × 1.57 m)

const JEEP = { axles: [1.06, -1.06], track: 0.62, r: 0.36 };
/** The jeep's body (no wheels: a unit's spin, a tow's are added) from the tail at z = -1.68 to the grille at 1.68. */
const jeepBody = () => [
  P.box(1.3, 0.42, 2.0, { y: 0.72, z: -0.55, color: JG, ...C }),                                  // the tub
  P.box(1.0, 0.3, 1.0, { y: 0.85, z: 1.1, color: JG, ...C }),                                     // the bonnet
  P.box(0.95, 0.5, 0.06, { y: 0.78, z: 1.64, color: JG_DK }),                                     // the slotted grille
  ...pair((s) => P.box(0.3, 0.05, 1.1, { x: s * 0.72, y: 0.75, z: 1.05, color: JG, ...C })),     // the flat front wings
  ...pair((s) => P.box(0.06, 0.1, 0.6, { x: s * 0.76, y: 0.56, z: -1.06, color: JG })),           // the rear wheel arches
  P.box(1.2, 0.4, 0.04, { y: 1.15, z: 0.58, rx: -0.15, color: STEEL }),                           // the windscreen frame
  P.box(1.1, 0.32, 0.02, { y: 1.15, z: 0.6, rx: -0.15, color: GLASS }),
  ...pair((s) => P.box(0.42, 0.1, 0.42, { x: s * 0.3, y: 0.98, z: 0.05, color: CANVAS })),       // the front seats
  P.box(0.3, 0.3, 0.3, { x: 0.55, y: 0.95, z: -1.55, color: JG_DK }),                             // the jerrican on the back
  P.cyl(0.02, 0.02, 0.6, { x: -0.6, y: 0.55, z: 0.2, rz: Math.PI / 2, color: STEEL }, 5),        // the axe and the shovel along the side
  ...pair((s) => bar(s * 0.66, 0.8, -0.6)),
];
const jeepTow = () => grime(merge([...jeepBody(), ...JEEP.axles.flatMap((z) => pair((s) => tyre(s * JEEP.track, JEEP.r, z, JEEP.r, 0.18)).flat())]), 1, 0.4).translate(0, 0, 1.7); // (a tow's tail at z = 0)
const jeep = (extra = [], deploy) => vehicle(() => ({
  wheels: wheeled(JEEP.axles, JEEP.track, JEEP.r),
  hull: grime(merge([...jeepBody(), ...extra]), 1, 0.4),
  ...(deploy && { deploy }),
  muzzle: [0, 1.6, 0],
}));

export const buildBrJeepCP = jeep([
  P.box(0.55, 0.4, 0.45, { y: 1.12, z: -0.9, color: 0x3e4030 }),                                  // the No. 22 set in the back
  P.box(0.4, 0.14, 0.3, { x: -0.4, y: 1.0, z: -1.2, color: STEEL }),                               // its batteries
], { geo: merge([...pair((s) => P.cyl(0.015, 0.015, 3.2, { x: s * 0.5, y: 1.6, color: STEEL }, 4))]), at: [0, 0.9, -1.3] });

export const buildBrJeepAmb = jeep([
  // the stretcher frame: two stretchers across the back, one over the bonnet
  ...pair((s) => P.box(0.05, 0.6, 0.05, { x: s * 0.62, y: 1.25, z: -1.5, color: STEEL })),
  P.box(1.6, 0.08, 1.9, { y: 1.5, z: -0.6, color: CANVAS }),
  P.box(1.6, 0.08, 0.55, { y: 1.04, z: 1.15, color: CANVAS }),                                   // (lashed down on the bonnet)
  ...pair((s) => [P.box(0.03, 0.4, 0.4, { x: s * 0.81, y: 1.5, z: -0.6, color: WHITE }), P.box(0.04, 0.28, 0.08, { x: s * 0.815, y: 1.5, z: -0.6, color: RED }), P.box(0.04, 0.08, 0.28, { x: s * 0.815, y: 1.5, z: -0.6, color: RED })]).flat(),
]);

// ---------------------------------------------------------------- the guns

/** A field gun on two wheels: its trail (one box trail, or split), shield, cradle and barrel; towed by `tow`. */
const fieldGun = ({ wheelR, axle, trail, split, shield, barrel, bore, platform, tow, hitch }) => vehicle(() => ({
  hull: grime(merge([
    ...(platform ? [P.cyl(1.0, 1.0, 0.08, { y: 0.05, color: STEEL }, 18)] : []),                  // the 25-pounder's round firing platform
    ...(split
      ? pair((s) => P.box(0.1, 0.12, trail, { x: s * Math.sin(0.3) * trail / 2, y: wheelR * 0.55, z: -Math.cos(0.3) * trail / 2, ry: -s * 0.3, rx: -0.12, color: JG }))
      : [P.box(0.16, 0.18, trail, { y: wheelR * 0.75, z: -trail / 2, rx: -0.12, color: JG })]),
    ...pair((s) => tyre(s * axle, wheelR, 0.05, wheelR, 0.16)).flat(),
    P.cyl(0.05, 0.05, axle * 2, { y: wheelR, z: 0.05, rz: Math.PI / 2, color: STEEL }, 8),
    P.box(0.4, 0.3, 0.5, { y: wheelR + 0.1, color: JG }),                                       // the carriage the cradle sits on
  ]), 1, 0.3),
  turret: { geo: grime(merge([P.box(shield[0], shield[1], 0.05, { y: wheelR + 0.25, z: 0.45, rx: -0.1, color: JG, ...C }), P.box(0.3, 0.3, 0.7, { y: wheelR, color: STEEL })]), 0.8, 0, 0.3), at: [0, 0.1, 0] },
  gun: { geo: merge([P.box(0.26, 0.24, 0.8, { color: STEEL }), P.cyl(bore, bore * 1.15, barrel, { z: 0.3 + barrel / 2, rx: Math.PI / 2, color: JG_DK }, 12)]), at: [0, wheelR + 0.2, 0.1], pitch: 0.4 },
  muzzle: [0, 0, 0.3 + barrel],
  recoil: 0.35,
  tow: { geo: tow(), hitch },
}));

export const buildBrPack37 = fieldGun({ wheelR: 0.42, axle: 0.55, trail: 2.0, split: true, shield: [1.1, 0.6], barrel: 1.1, bore: 0.05, tow: jeepTow, hitch: 1.9 });
export const buildBr25pdrJG = fieldGun({ wheelR: 0.55, axle: 0.8, trail: 2.6, split: false, shield: [1.4, 0.8], barrel: 2.2, bore: 0.05, platform: true, hitch: 2.9,
  tow: () => grime(merge(towTruck({ color: JG, dark: JG_DK, length: 4.5, width: 2.2, bonnet: 'square' })), 1, 0.4) });

// ---------------------------------------------------------------- recovery lorry

export const buildBrRecoveryJG = vehicle(() => {
  const o = { length: 6.8, width: 2.4, bonnet: 'square', r: 0.5, axles: [5.4, 1.4] };
  const t = truckUnit({ color: JG, dark: JG_DK, camo: 0, ...o, body: 'flat', bodyH: 1.7 });
  const L = t.layout;
  return { wheels: wheeled(L.axles, t.track, o.r), hull: grime(merge([...t.parts, ...crane(0, L.deck, L.deck + 2.2, L.rear + 0.4, -1.9, 0.7, JG_DK)]), 1, 0.4), muzzle: [0, 2.5, 0] };
});
