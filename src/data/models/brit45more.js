// The British kit the first pass of models/brit45.js left on borrowed American hulls or left out (a file of its own so the two can be
// worked on apart; it builds on brit45.js's Crusader and Valentine):
//   britBofors / buildBrBofors / buildBrBofors21  the 40 mm Bofors on the British four-wheeled carriage, outriggers out, towed by a 3-tonner
//                                                 (Light Stone for the 8th Army, olive drab for the 21st Army Group; models/brit14.js: jungle green)
//   buildBrCrusaderAA        Crusader AA Mk I (8th Army): the Bofors in a tall open-topped turret on the Crusader
//   buildBrValentineBridge   Valentine Bridgelayer (8th Army): the turretless Valentine with the scissors bridge folded on its back
//   buildBrShermanDD21       Sherman DD (21st Army Group) ashore: the screen collapsed round the hull, the propellers, British markings
import { P, merge, pair, grime } from '../units/geometry.js';
import { trackedHull, castTurret, runningGear, roadWheelGeometry } from './vehicleCommon.js';
import { rig, whiteStar } from './ww2Armour.js';
import { vehicle, towTruck } from './support.js';
import { crusader, valentineHull } from './brit45.js';

const STONE = 0xb8a77c, STONE_DK = 0x938458, OD21 = 0x4e5036, OD21_DK = 0x3b3d2a;
const STEEL = 0x2b2d28, RUBBER = 0x1f201c, RED = 0xb8231e, WHITE = 0xe6e2d6, BRASS = 0xa88a3a, CANVAS = 0x7a7658, YELLOW = 0xc8a43a;
const C = { camo: 1 };
const cache = {};
const once = (key, make) => (cache[key] ??= make());
const tyre = (x, y, z, r, w) => [
  P.cyl(r, r, w, { x, y, z, rz: Math.PI / 2, color: RUBBER, surf: 'rubber' }, 14),
  P.cyl(r * 0.55, r * 0.55, w + 0.02, { x, y, z, rz: Math.PI / 2, color: STEEL }, 10),
];
const flash = (x, y, z) => [P.box(0.02, 0.18, 0.12, { x, y, z: z - 0.12, color: RED }), P.box(0.02, 0.18, 0.12, { x, y, z, color: WHITE }), P.box(0.02, 0.18, 0.12, { x, y, z: z + 0.12, color: RED })];

/** The Bofors itself (in the gun's frame, z forward): the breech casing, a 4-round clip standing in the loading guides, the recoil
 *  spring casing, the barrel and its conical flash hider. Its muzzle at z = 3.1. */
const boforsGun = (dark) => [
  P.box(0.3, 0.34, 0.95, { color: dark }),
  P.box(0.16, 0.36, 0.12, { y: 0.34, z: -0.08, color: STEEL }),
  ...[-0.05, 0.05].map((z) => P.box(0.12, 0.2, 0.05, { y: 0.6, z: z - 0.08, color: BRASS })),
  P.cyl(0.08, 0.08, 0.6, { z: 0.75, rx: Math.PI / 2, color: dark }, 10),
  P.cyl(0.04, 0.045, 1.9, { z: 1.95, rx: Math.PI / 2, color: STEEL }, 10),
  P.cyl(0.07, 0.045, 0.24, { z: 2.98, rx: Math.PI / 2, color: STEEL }, 10),
];

// ---------------------------------------------------------------- the British 40 mm Bofors

/** The 40 mm Bofors on its British carriage (Platform, Travelling, No. 2), set up: the four outriggers swung out onto their jack pads,
 *  no shield, the layer's and the trainer's seats either side with their handwheels, the "Stiffkey stick" sight bar over the layer
 *  (the 8th Army's own answer to the predictor); towed by a 3-ton lorry. */
export const britBofors = (color, dark) => vehicle(() => ({
  hull: grime(merge([
    P.box(0.62, 0.2, 3.0, { y: 0.5, color }),                                                            // the chassis
    ...pair((s) => [-1.15, 1.15].flatMap((z) => tyre(s * 0.72, 0.38, z, 0.38, 0.16))).flat(),          // the four wheels
    ...pair((s) => [-1, 1].flatMap((t) => [
      P.box(0.12, 0.1, 1.5, { x: s * 0.55, y: 0.33, z: t * 0.55, ry: s * t * Math.PI / 4, color }),    // the outriggers, swung out…
      P.cyl(0.16, 0.18, 0.06, { x: s * 1.08, y: 0.03, z: t * 1.08, color: STEEL }, 10),               // …onto their jack pads
      P.cyl(0.03, 0.03, 0.3, { x: s * 1.08, y: 0.18, z: t * 1.08, color: STEEL }, 6),
    ])).flat(),
    P.cyl(0.3, 0.36, 0.35, { y: 0.78, color }, 12),                                                       // the pedestal
    P.box(0.18, 0.12, 0.9, { y: 0.5, z: 1.9, rx: 0.15, color: dark }),                                   // the drawbar
  ]), 1, 0.3),
  turret: { geo: grime(merge([
    P.cyl(0.55, 0.55, 0.08, { y: 0.02, color: dark }, 14),                                              // the turntable
    ...pair((s) => P.box(0.08, 0.55, 0.6, { x: s * 0.24, y: 0.32, color })),                             // the trunnion brackets
    ...pair((s) => P.box(0.3, 0.06, 0.28, { x: s * 0.62, y: 0.3, z: -0.42, color: STEEL })),           // the seats…
    ...pair((s) => P.box(0.05, 0.3, 0.05, { x: s * 0.62, y: 0.15, z: -0.42, color: STEEL })),
    ...pair((s) => P.cyl(0.13, 0.13, 0.03, { x: s * 0.46, y: 0.48, z: -0.12, rz: Math.PI / 2, color: STEEL }, 10)), // …their handwheels
    P.box(0.03, 0.55, 0.03, { x: -0.58, y: 0.58, z: 0.05, color: STEEL }),                             // the Stiffkey stick's post…
    P.box(0.03, 0.03, 0.5, { x: -0.58, y: 0.86, z: 0.2, color: STEEL }),                               // …and its bar
  ]), 0.8, 0, 0.3), at: [0, 0.95, 0] },
  gun: { geo: merge(boforsGun(dark)), at: [0, 0.5, 0.05], pitch: null },
  muzzle: [0, 0, 3.1],
  recoil: 0.06,
  tow: { geo: grime(merge(towTruck({ color, dark, length: 5.6, width: 2.2, bonnet: 'square' })), 1, 0.4), hitch: 2.4 },
}));
export const buildBrBofors = britBofors(STONE, STONE_DK);
export const buildBrBofors21 = britBofors(OD21, OD21_DK);

// ---------------------------------------------------------------- Crusader AA Mk I (8th Army)

/** Crusader AA Mk I: an old Crusader with its turret off and a 40 mm Bofors in a tall, slab-sided, open-topped turret in its place. */
export const buildBrCrusaderAA = crusader('crusaderAA', STONE, STONE_DK,
  (color, dark) => grime(merge([
    P.cyl(0.62, 0.66, 0.2, { y: 0.1, color: dark }, 16),                                               // the turret ring's collar
    ...pair((s) => P.box(0.06, 0.8, 1.5, { x: s * 0.66, y: 0.6, color, ...C })),                         // the side plates…
    P.box(1.38, 0.5, 0.06, { y: 0.45, z: 0.74, color, ...C }),                                           // …the low front plate under the gun
    P.box(1.38, 0.8, 0.06, { y: 0.6, z: -0.74, color, ...C }),                                           // …the back
    P.cyl(0.24, 0.3, 0.45, { y: 0.4, color: dark }, 12),                                                 // the gun's pedestal inside
  ]), 0.9, 0.0, 0.3),
  (dark) => merge(boforsGun(dark)),
  { turretAt: [0, 1.6, 0.1], gunAt: [0, 0.75, 0.0], muzzle: 3.1 });

// ---------------------------------------------------------------- Valentine Bridgelayer (8th Army)

/** Valentine Bridgelayer: the Valentine with no turret, a plate over the ring, the 34-foot scissors bridge folded in two on its back
 *  (the hinge at the tail), the launching arm's rams at the nose: it swings the bridge up and over and unfolds it across the gap. */
export const buildBrValentineBridge = vehicle(() => {
  const v = valentineHull(STONE, STONE_DK);
  return {
    wheels: v.wheels,
    hull: grime(merge([
      ...v.parts,
      P.box(1.3, 0.2, 1.2, { y: 1.7, z: 0.3, color: STONE, ...C }),                                     // the plate over the turret ring
      ...pair((s) => P.box(0.12, 0.12, 1.1, { x: s * 0.42, y: 1.78, z: 2.05, rx: 0.45, color: STEEL })), // the launching arm's rams
      P.cyl(0.09, 0.09, 1.3, { y: 1.65, z: 2.45, rz: Math.PI / 2, color: STEEL }, 8),                   // its pivot on the nose
      ...[-1, 1].flatMap((s) => flash(s * 1.27, 1.25, -1.2)),
    ]), 1.25, 0.3),
    load: merge([
      // the bridge folded: two halves stacked, each two trackways with the deck between them
      ...[0, 1].flatMap((k) => [
        ...pair((s) => P.box(0.85, 0.26, 5.2, { x: s * 0.95, y: 1.95 + k * 0.3, z: -0.1, color: k ? STONE_DK : STONE })),
        P.box(1.05, 0.06, 5.2, { y: 1.88 + k * 0.3, z: -0.1, color: STEEL }),
        ...pair((s) => [-1.6, 0, 1.6].map((z) => P.box(0.87, 0.04, 0.08, { x: s * 0.95, y: 2.09 + k * 0.3, z, color: STEEL }))).flat(), // the cross ribs
      ]),
      ...pair((s) => P.cyl(0.17, 0.17, 0.35, { x: s * 0.95, y: 2.1, z: -2.75, rz: Math.PI / 2, color: STEEL }, 10)), // the scissors hinges
    ]),
    muzzle: [0, 2.5, 0],
  };
});

// ---------------------------------------------------------------- Sherman DD (21st Army Group)

/** The Sherman DD the 21st Army Group swam in on Gold, Juno and Sword, ashore: the collapsed canvas screen round the hull on its
 *  boat-shaped rail, the struts folded flat, the twin propellers under the tail; the 75 mm M3, the stowage bin on the turret's back;
 *  British markings — the white star small, the red arm-of-service square on the nose, the squadron's triangle on the turret. */
export const buildBrShermanDD21 = (mats) => rig(once('shermanDD21', () => {
  const gear = runningGear({ halfWidth: 1.12, length: 4.0, wheels: 6, wheelR: 0.26, sprocket: 1, rollers: 3, trackWidth: 0.42, wheelColor: OD21_DK });
  return {
    gear, wheel: roadWheelGeometry(0.26, 0.36, OD21_DK),
    hull: grime(merge([
      ...gear.parts,
      ...pair((s) => [-1.35, 0, 1.35].map((z) => P.box(0.2, 0.42, 0.7, { x: s * 1.12, y: 0.55, z, color: OD21_DK }))).flat(), // the volute bogies
      trackedHull([[-2.95, 1.75, 0.55], [-2.7, 1.95, 0.5], [1.3, 1.98, 0.5], [2.75, 1.05, 0.55]], { belly: 0.85, fender: 1.32, fenderY: 1.02, chamfer: 0.06 }, { color: OD21, ...C }),
      P.box(1.75, 0.62, 0.1, { y: 0.78, z: 2.62, rx: 0.46, color: OD21, ...C }),                        // the lower nose plate
      ...pair((s) => P.box(0.36, 0.14, 0.18, { x: s * 0.42, y: 2.0, z: 1.15, color: OD21_DK })),       // the driver's and co-driver's hatches
      P.box(1.8, 0.04, 1.2, { y: 1.77, z: -2.3, color: OD21_DK }),                                     // engine deck
      // the screen, down: the folded canvas on its rail all round at the track-guard line, the struts lying flat on it
      ...pair((s) => P.box(0.18, 0.28, 5.5, { x: s * 1.44, y: 1.2, z: -0.1, color: CANVAS, surf: 'cloth' })),
      P.box(3.06, 0.28, 0.18, { y: 1.2, z: 2.66, color: CANVAS, surf: 'cloth' }),
      P.box(3.06, 0.28, 0.18, { y: 1.2, z: -2.86, color: CANVAS, surf: 'cloth' }),
      ...pair((s) => [-2.0, -0.7, 0.6, 1.9].map((z) => P.box(0.06, 0.06, 0.6, { x: s * 1.44, y: 1.38, z, color: STEEL }))).flat(),
      ...pair((s) => [P.cyl(0.32, 0.32, 0.05, { x: s * 0.7, y: 0.75, z: -3.1, rx: Math.PI / 2, color: STEEL }, 10), // the propellers, raised
        P.box(0.08, 0.5, 0.08, { x: s * 0.7, y: 1.0, z: -3.0, color: STEEL })]).flat(),
      // British markings
      ...[-1, 1].flatMap((s) => whiteStar(s * 1.335, 1.68, -0.9, 0.2)),
      P.box(0.3, 0.02, 0.3, { x: -0.55, y: 1.55, z: 2.12, rx: 0.57, color: RED }),                      // the arm-of-service square…
      P.box(0.14, 0.025, 0.05, { x: -0.55, y: 1.555, z: 2.12, rx: 0.57, color: WHITE }),               // …its regiment's number
    ]), 1.25, 0.3),
    turret: grime(merge([
      castTurret([[1.05, 0.5, 0.5], [0.85, 0.82, 0.7], [0.25, 0.94, 0.76], [-0.55, 0.92, 0.74], [-1.05, 0.72, 0.58]], { color: OD21, ...C }),
      P.box(0.85, 0.5, 0.26, { y: 0.44, z: 1.1, color: OD21, ...C }),                                  // the mantlet
      P.box(0.95, 0.42, 0.4, { y: 0.5, z: -1.2, color: OD21_DK }),                                      // the stowage bin on the back
      P.cyl(0.3, 0.3, 0.06, { x: 0.38, y: 0.95, z: -0.3, color: OD21_DK }, 12),                         // the commander's hatch
      P.cyl(0.006, 0.006, 2.2, { x: -0.5, y: 2.0, z: -0.7, color: STEEL }, 4),                           // the No. 19 set's aerial
      ...pair((s) => P.cyl(0.16, 0.16, 0.02, { x: s * 0.87, y: 0.6, z: -0.2, rz: Math.PI / 2, color: YELLOW }, 3)), // A Squadron's triangle
    ]), 0.9, 0.0, 0.3),
    gun: merge([P.cyl(0.05, 0.056, 2.6, { z: 1.3, rx: Math.PI / 2, color: OD21 }, 12)]),
  };
}), mats, { turretAt: [0, 1.98, -0.2], gunAt: [0, 0.44, 1.2], muzzle: 2.6 });
