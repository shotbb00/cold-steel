// The vehicles of the Northern Flank and Korea, 1985 (support.js vehicle kit; contract in render/RigRenderer.js),
// where the four armies' kit looks unlike anything the US Army, the Bundeswehr, the Soviets or the NVA drive:
//   Norway   Leopard 1A1NO (the cast turret of the early Leopard, the L7 in its thermal sleeve) · NM116 (the
//            M24 Chaffee rebuilt by Thune-Eureka: a diesel, the 90 mm D/925, a laser rangefinder) · NM135 (the
//            M113 with the Hägglunds 20 mm turret)
//   USMC     M60A1 (the long needle-nose turret, the big M19 cupola) · AAV7A1 (the 26-tonne amphibious tractor,
//            the .50 cal turret at the right front) · LAV-25 (the 8×8 with the 25 mm turret) · M198 155 mm on its
//            split trail behind a 5-ton truck · the M151A2 jeep with a TOW
//   Korea    M48A5K (the turtle-shell M48 turret with the 105 mm and the low cupola) · KIFV (the aluminium
//            carrier with its armoured .50 cal) · the jeep with the M40 106 mm recoilless rifle
//   KPA      T-55 (plain, as the KPA has them) · Chonma-ho (the North's T-62: longer, the flatter dome, the
//            115 mm with its fume extractor out along the barrel) · VTT-323 (the M1973 carrier with the
//            14.5 mm turret) · Koksan M1978 (the 170 mm gun on an open mount at the back of a T-54 hull)
// NATO hulls are painted in parts with camo 1: each army's paint (RigRenderer ARMY_CAMO).
import { P, merge, pair, grime } from '../units/geometry.js';
import { planProfile, trackedHull, castTurret } from './vehicleCommon.js';
import { vehicle, tracked, wheeled, towTruck, m113Hull } from './support.js';

const OD = 0x4a5236;
const OD_DK = 0x353b28;
const KPA = 0x4b5634;
const KPA_DK = 0x384228;
const STEEL = 0x2b2d28;
const RUBBER = 0x1f201c;
const GLASS = 0x1a1d1c;
const WOOD = 0x5a4632;
const C = { camo: 1 };

const smoke = (x, y, z, n, ry) => Array.from({ length: n }, (_, k) => P.cyl(0.045, 0.045, 0.24, { x, y: y + k * 0.09, z, rx: -0.7, ry, color: STEEL }, 8));
const tyre = (x, y, z, r, w = 0.3) => P.cyl(r, r, w, { x, y, z, rz: Math.PI / 2, color: RUBBER, surf: 'rubber' }, 14);
const fifty = (x, y, z, len = 1.1) => [ // a Browning .50 cal on its cradle
  P.box(0.12, 0.14, 0.5, { x, y, z, color: STEEL }),
  P.cyl(0.028, 0.028, len, { x, y: y + 0.02, z: z + 0.25 + len / 2, rx: Math.PI / 2, color: STEEL }, 8),
];

// ---------------------------------------------------------------- Norway

/** Leopard 1A1NO: the Leopard 1 hull, the first cast turret, the 105 mm L7 in its thermal sleeve. */
export const buildNoLeopard1 = vehicle(() => {
  const g = tracked({ halfWidth: 1.35, length: 5.0, wheels: 7, wheelR: 0.35, sprocket: -1, rollers: 4, trackWidth: 0.55, wheelColor: OD_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.55, 1.3, 0.55], [-3.3, 1.35, 0.45], [2.2, 1.38, 0.45], [3.45, 1.0, 0.5], [3.55, 0.78, 0.78]],
        { belly: 1.12, fender: 1.66, fenderY: 1.1, chamfer: 0.04 }, { color: OD, ...C }),
      ...Array.from({ length: 6 }, (_, i) => pair((s) => P.box(0.04, 0.42, 1.0, { x: s * 1.68, y: 0.95, z: -2.7 + i * 1.03, color: RUBBER, surf: 'rubber' }))).flat(), // rubber skirts
      P.box(1.9, 0.06, 1.5, { y: 1.36, z: -2.5, color: OD_DK }),
      ...[-3.0, -2.7, -2.4, -2.1].map((z) => P.box(1.8, 0.03, 0.06, { y: 1.4, z, color: STEEL })),
      ...pair((s) => P.cyl(0.07, 0.07, 0.1, { x: s * 1.25, y: 1.15, z: 3.1, rx: Math.PI / 2, color: STEEL }, 10)),
      P.box(0.5, 0.06, 0.45, { x: -0.55, y: 1.39, z: 2.0, color: OD_DK }),
      ...pair((s) => P.cyl(0.025, 0.025, 3.4, { x: s * 1.3, y: 1.38, z: -0.4, rx: Math.PI / 2, color: STEEL }, 6)),
    ]), 1.2, 0.3),
    turret: {
      geo: grime(merge([
        // the cast turret of the 1A1: rounded all round, the cheeks swept back from the mantlet
        castTurret([[1.75, 0.5, 0.4], [1.45, 1.1, 0.72], [0.8, 1.45, 0.82], [-0.5, 1.5, 0.82], [-1.5, 1.4, 0.72], [-2.05, 1.05, 0.55], [-2.2, 0.55, 0.35]], { color: OD, ...C }),
        P.cyl(0.32, 0.35, 0.22, { x: 0.65, y: 0.82, z: -0.45, color: OD }, 14),                       // commander's cupola
        P.cyl(0.11, 0.11, 0.25, { x: 0.65, y: 1.0, z: -0.2, color: OD_DK }, 10),                      // his TRP 2A periscope
        P.cyl(0.3, 0.3, 0.05, { x: -0.65, y: 0.8, z: -0.5, color: OD_DK }, 14),                      // loader's hatch…
        P.box(0.07, 0.08, 0.35, { x: -0.65, y: 0.85, z: -0.25, color: STEEL }),                      // …and its MG3
        P.cyl(0.02, 0.02, 0.7, { x: -0.65, y: 0.85, z: 0.25, rx: Math.PI / 2, color: STEEL }, 6),
        ...pair((s) => P.box(0.22, 0.12, 0.35, { x: s * 1.35, y: 0.55, z: 0.3, color: OD_DK })),    // the rangefinder's armoured ends on the cheeks
        ...pair((s) => smoke(s * 1.42, 0.3, -0.7, 4, s * 1.2)).flat(),
        P.box(2.3, 0.35, 0.7, { y: 0.4, z: -2.35, color: 0x575a40 }),                                // rear stowage basket
        P.box(0.7, 0.5, 0.3, { y: 0.4, z: 1.75, color: OD, ...C }),                                  // mantlet
      ]), 0.9, 0, 0.4),
      at: [0, 1.38, -0.1],
    },
    gun: {
      geo: merge([
        P.cyl(0.075, 0.1, 5.5, { z: 2.75, rx: Math.PI / 2, color: OD }, 14),
        ...[0.7, 1.4, 3.6, 4.4].map((z) => P.cyl(0.13, 0.13, 0.62, { z, rx: Math.PI / 2, color: OD_DK }, 14)),
        P.cyl(0.16, 0.16, 0.6, { z: 2.6, rx: Math.PI / 2, color: OD }, 14),
      ]).scale(1, 1, 0.74),
      at: [0, 0.4, 1.85],
      pitch: 0,
    },
    muzzle: [0, 0, 4.1],
    recoil: 0.4,
    marks: merge([...pair((s) => P.box(0.02, 0.3, 0.4, { x: s * 1.69, y: 1.2, z: 0.9 }))]),
  };
});

/** NM116: the M24 Chaffee's hull and turret, the Norwegian rebuild — the 90 mm D/925 with its muzzle brake,
 *  the laser rangefinder on the mantlet, a diesel under the new rear deck. 5.0 m long, 3.0 m wide. */
export const buildNoNM116 = vehicle(() => {
  const g = tracked({ halfWidth: 1.15, length: 3.9, wheels: 5, wheelR: 0.33, sprocket: 1, rollers: 3, trackWidth: 0.4, wheelColor: OD_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-2.5, 1.45, 0.55], [-2.3, 1.55, 0.45], [1.3, 1.6, 0.45], [2.45, 1.0, 0.55], [2.55, 0.8, 0.75]],
        { belly: 0.92, fender: 1.48, fenderY: 1.1, chamfer: 0.05 }, { color: OD, ...C }),
      P.box(1.7, 0.05, 1.3, { y: 1.57, z: -1.6, color: OD_DK }),                                       // the new engine deck
      ...[-2.0, -1.7, -1.4].map((z) => P.box(1.6, 0.03, 0.06, { y: 1.6, z, color: STEEL })),
      ...pair((s) => P.box(0.5, 0.06, 0.45, { x: s * 0.5, y: 1.42, z: 1.55, rx: 0.48, color: OD_DK })), // driver's and co-driver's hatches on the glacis
      ...pair((s) => P.cyl(0.07, 0.07, 0.1, { x: s * 1.1, y: 1.15, z: 2.45, rx: Math.PI / 2, color: STEEL }, 10)),
      ...pair((s) => P.box(0.4, 0.3, 1.0, { x: s * 1.3, y: 1.25, z: -1.2, color: OD_DK })),           // stowage bins on the fenders
    ]), 1.2, 0.3),
    turret: {
      geo: grime(merge([
        castTurret([[1.05, 0.45, 0.3], [0.85, 0.8, 0.6], [0.3, 0.98, 0.72], [-0.5, 0.98, 0.7], [-1.2, 0.85, 0.6], [-1.45, 0.5, 0.36]], { color: OD, ...C }),
        P.cyl(0.28, 0.3, 0.2, { x: 0.45, y: 0.7, z: -0.4, color: OD }, 14),                            // commander's cupola
        P.box(0.07, 0.08, 0.35, { x: 0.45, y: 0.86, z: -0.2, color: STEEL }),                          // its MG3
        P.box(0.32, 0.2, 0.32, { x: -0.38, y: 0.68, z: 0.75, color: OD_DK }),                          // the laser rangefinder over the mantlet
        P.box(0.02, 0.1, 0.02, { x: -0.38, y: 0.68, z: 0.92, color: GLASS }),
        ...pair((s) => smoke(s * 0.92, 0.32, 0.15, 3, s * 1.1)).flat(),
        P.box(1.4, 0.25, 0.5, { y: 0.3, z: -1.65, color: 0x575a40 }),                                  // stowage on the bustle
        P.box(0.6, 0.45, 0.25, { y: 0.32, z: 1.05, color: OD, ...C }),                                 // mantlet
      ]), 0.9, 0, 0.4),
      at: [0, 1.6, 0.0],
    },
    gun: {
      geo: merge([
        P.cyl(0.06, 0.075, 3.4, { z: 1.7, rx: Math.PI / 2, color: OD }, 12),                           // 90 mm D/925, low pressure
        P.box(0.24, 0.16, 0.28, { z: 3.45, color: STEEL }),                                            // its muzzle brake
      ]),
      at: [0, 0.32, 1.1],
      pitch: 0,
    },
    muzzle: [0, 0, 3.6],
    recoil: 0.3,
    marks: merge([...pair((s) => P.box(0.02, 0.25, 0.4, { x: s * 1.49, y: 1.3, z: 0.4 }))]),
  };
});

/** NM135: the M113 with the Hägglunds turret on the roof — the 20 mm Rh 202, an MG3 beside it. */
export const buildNoNM135 = vehicle(() => ({
  ...m113Hull([], { color: OD }),
  turret: {
    geo: grime(merge([
      planProfile([[-0.4, 0.7], [0.4, 0.7], [0.65, 0.3], [0.65, -0.6], [-0.65, -0.6], [-0.65, 0.3]], 0.42, { color: OD, ...C }),
      P.cyl(0.24, 0.24, 0.05, { x: -0.3, y: 0.43, z: -0.25, color: OD_DK }, 12),                        // hatch
      ...[0, 1, 2].map((k) => P.box(0.1, 0.06, 0.03, { x: -0.3 + (k - 1) * 0.14, y: 0.44, z: 0.0, color: GLASS })), // vision blocks
      ...pair((s) => smoke(s * 0.62, 0.15, 0.25, 3, s * 1.0)).flat(),
    ]), 0.6, 0, 0.4),
    at: [0.2, 1.85, 0.4],
  },
  gun: {
    geo: merge([
      P.box(0.22, 0.2, 0.4, { z: 0.1, color: OD_DK }),
      P.cyl(0.03, 0.035, 1.6, { z: 1.0, rx: Math.PI / 2, color: STEEL }, 10),                          // Rh 202
      P.cyl(0.015, 0.015, 0.6, { x: 0.09, z: 0.5, rx: Math.PI / 2, color: STEEL }, 6),                 // coaxial MG3
    ]),
    at: [0, 0.22, 0.65],
    pitch: 0,
  },
  muzzle: [0, 0, 1.8],
  recoil: 0.06,
  marks: merge([P.box(0.02, 0.3, 0.5, { x: 1.39, y: 1.4, z: -0.6 })]),
}));

// ---------------------------------------------------------------- US Marine Corps

/** M60A1: the long cast hull with its rounded glacis, six road wheels and three return rollers, the
 *  needle-nosed A1 turret with the M19 cupola and its .50 cal, the 105 mm M68 with the bore evacuator. */
export const buildUsM60A1 = vehicle(() => {
  const g = tracked({ halfWidth: 1.45, length: 4.9, wheels: 6, wheelR: 0.33, sprocket: -1, rollers: 3, trackWidth: 0.6, wheelColor: OD_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.3, 1.45, 0.5], [-3.0, 1.55, 0.45], [2.4, 1.6, 0.45], [3.3, 1.1, 0.6], [3.5, 0.98, 0.8]],
        { belly: 1.15, fender: 1.72, fenderY: 1.1, chamfer: 0.05 }, { color: OD, ...C }),
      P.box(2.4, 0.06, 1.6, { y: 1.57, z: -2.3, color: OD_DK }),                                       // engine deck
      ...pair((s) => P.box(0.5, 0.35, 1.4, { x: s * 1.45, y: 1.3, z: -1.6, color: OD_DK })),          // fender stowage boxes
      ...pair((s) => P.box(0.24, 0.17, 0.13, { x: s * 1.3, y: 1.25, z: 3.2, rx: 0.4, color: STEEL })),  // headlight guards
      P.box(0.5, 0.06, 0.45, { y: 1.6, z: 2.2, color: OD_DK }),                                        // driver's hatch, on the centre line
    ]), 1.2, 0.3),
    turret: {
      geo: grime(merge([
        // the A1's turret: long, narrow at the front where it comes to the gun, the bustle wide behind
        castTurret([[2.0, 0.42, 0.35], [1.4, 0.95, 0.7], [0.5, 1.35, 0.8], [-0.7, 1.45, 0.8], [-1.6, 1.4, 0.72], [-2.1, 1.1, 0.55], [-2.25, 0.6, 0.35]], { color: OD, ...C }, 3),
        // the M19 cupola: a turret on the turret, the .50 cal inside it
        P.cyl(0.45, 0.5, 0.42, { x: 0.6, y: 0.95, z: -0.35, color: OD, ...C }, 16),
        ...fifty(0.6, 1.08, -0.1, 0.9),
        P.cyl(0.3, 0.3, 0.05, { x: -0.65, y: 0.82, z: -0.5, color: OD_DK }, 14),                      // loader's hatch
        P.box(0.5, 0.3, 0.4, { x: -0.65, y: 0.7, z: 0.6, color: OD_DK }),                              // the AN/VSS-1 searchlight box
        P.box(2.2, 0.35, 0.6, { y: 0.45, z: -2.45, color: 0x4d5236 }),                                 // bustle rack
        P.box(0.75, 0.55, 0.35, { y: 0.4, z: 1.95, color: OD, ...C }),                                 // mantlet in its canvas cover
      ]), 0.9, 0, 0.4),
      at: [0, 1.6, 0.2],
    },
    gun: {
      geo: merge([
        P.cyl(0.075, 0.09, 5.2, { z: 2.6, rx: Math.PI / 2, color: OD }, 12),
        P.cyl(0.13, 0.13, 0.55, { z: 2.4, rx: Math.PI / 2, color: OD_DK }, 12),                         // bore evacuator
      ]).scale(1, 1, 0.78),
      at: [0, 0.4, 2.0],
      pitch: 0,
    },
    muzzle: [0, 0, 4.1],
    recoil: 0.4,
    marks: merge([P.box(0.02, 0.3, 0.6, { x: 1.73, y: 1.3, z: -1.2 }), P.box(0.02, 0.3, 0.6, { x: -1.73, y: 1.3, z: -1.2 })]),
  };
});

/** AAV7A1: the amphibious tractor — a tall flat-sided box 7.9 m long, the bow raked for the water, the big
 *  ramp at the back, six road wheels, the .50 cal weapon station at the right front. */
export const buildUsAAV7 = vehicle(() => {
  const g = tracked({ halfWidth: 1.4, length: 5.0, wheels: 6, wheelR: 0.32, sprocket: 1, rollers: 0, trackWidth: 0.53, wheelColor: OD_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.9, 2.95, 0.5], [-3.7, 3.05, 0.45], [2.3, 3.05, 0.45], [3.3, 2.1, 0.5], [4.0, 1.1, 0.95]],
        { belly: 1.15, fender: 1.66, fenderY: 1.1, chamfer: 0.06 }, { color: OD, ...C }),
      P.box(2.0, 1.9, 0.08, { y: 1.85, z: -3.95, color: OD_DK }),                                      // the stern ramp
      P.box(0.7, 1.2, 0.03, { x: -0.4, y: 1.9, z: -4.0, color: OD, ...C }),                            // …its door
      ...pair((s) => P.box(0.06, 0.12, 6.6, { x: s * 1.67, y: 1.15, color: OD_DK })),                  // the rubbing strake over the tracks
      ...[-2.6, -1.5, -0.4].map((z) => P.box(0.7, 0.06, 0.9, { y: 3.08, z, color: OD_DK })),           // the cargo hatches along the roof
      P.box(0.6, 0.35, 0.6, { x: -0.65, y: 3.2, z: 1.6, color: OD, ...C }),                            // driver's cupola, left front
      ...[-0.12, 0.12].map((x) => P.box(0.12, 0.08, 0.04, { x: -0.65 + x, y: 3.25, z: 1.91, color: GLASS })),
      ...pair((s) => P.box(0.3, 0.2, 0.08, { x: s * 1.0, y: 1.7, z: 3.6, rx: 0.9, color: STEEL })),   // headlights in their guards
      P.box(2.4, 0.08, 0.5, { y: 1.55, z: 3.7, rx: 0.9, color: OD_DK }),                               // the bow plane
    ]), 1.2, 0.3),
    turret: {
      geo: grime(merge([
        P.cyl(0.45, 0.5, 0.5, { y: 0.25, color: OD, ...C }, 14),                                        // the weapon station
        ...[0, 1, 2, 3, 4].map((k) => P.box(0.1, 0.07, 0.03, { x: Math.sin(k * 0.6 - 1.2) * 0.46, y: 0.4, z: Math.cos(k * 0.6 - 1.2) * 0.46, ry: k * 0.6 - 1.2, color: GLASS })),
        P.cyl(0.25, 0.25, 0.05, { y: 0.52, z: -0.1, color: OD_DK }, 12),
      ]), 0.6, 0, 0.4),
      at: [0.6, 3.05, 1.1],
    },
    gun: { geo: merge([P.box(0.16, 0.16, 0.4, { color: STEEL }), P.cyl(0.03, 0.03, 1.1, { y: 0.02, z: 0.75, rx: Math.PI / 2, color: STEEL }, 8)]), at: [0, 0.3, 0.45], pitch: 0 },
    muzzle: [0, 0, 1.3],
    recoil: 0.04,
    marks: merge([...pair((s) => P.box(0.02, 0.35, 0.8, { x: s * 1.67, y: 2.3, z: -1.0 }))]),
  };
});

/** LAV-25: the 8×8 light armoured vehicle — the sloped boat nose, the long flat-sided hull, the two-man
 *  turret with the 25 mm M242 and its smoke dischargers. 6.4 m long, 2.5 m wide. */
export const buildUsLAV25 = vehicle(() => ({
  wheels: wheeled([-2.05, -0.95, 0.55, 1.65], 1.15, 0.5),
  hull: grime(merge([
    trackedHull([[-3.2, 1.95, 0.75], [-3.0, 2.05, 0.6], [1.0, 2.1, 0.6], [2.4, 1.75, 0.6], [3.2, 1.05, 0.85]],
      { belly: 1.0, fender: 1.25, fenderY: 1.05, chamfer: 0.12 }, { color: OD, ...C }),
    ...pair((s) => P.box(0.05, 0.6, 0.55, { x: s * 1.26, y: 1.5, z: -2.4, color: OD_DK })),            // stowage on the hull's flanks
    ...pair((s) => P.box(0.6, 0.06, 0.5, { x: s * 0.45, y: 2.07, z: -2.0, color: OD_DK })),           // troop hatches
    P.box(0.5, 0.06, 0.45, { x: -0.55, y: 2.0, z: 1.6, rx: -0.2, color: OD_DK }),                      // driver's hatch, left front
    ...pair((s) => P.box(0.06, 0.6, 0.6, { x: s * 0.4, y: 1.35, z: -3.22, color: OD_DK })),           // the twin rear doors
    ...pair((s) => P.cyl(0.07, 0.07, 0.08, { x: s * 0.9, y: 1.3, z: 3.0, rx: Math.PI / 2 - 0.6, color: STEEL }, 8)),
  ]), 1.1, 0.3),
  turret: {
    geo: grime(merge([
      planProfile([[-0.5, 0.95], [0.5, 0.95], [0.95, 0.4], [0.95, -0.8], [-0.95, -0.8], [-0.95, 0.4]], 0.55, { color: OD, ...C }),
      ...pair((s) => P.cyl(0.26, 0.26, 0.05, { x: s * 0.45, y: 0.57, z: -0.3, color: OD_DK }, 12)),   // the two hatches
      ...pair((s) => [0, 1, 2, 3].map((k) => P.cyl(0.04, 0.04, 0.2, { x: s * 0.9, y: 0.25 + k * 0.07, z: 0.45, rx: -0.7, ry: s * 0.6, color: STEEL }, 8))).flat(),
      P.box(0.2, 0.2, 0.25, { x: -0.5, y: 0.65, z: 0.45, color: OD_DK }),                               // the sight head
    ]), 0.6, 0, 0.4),
    at: [0, 2.1, 0.0],
  },
  gun: {
    geo: merge([P.box(0.25, 0.25, 0.45, { z: 0.1, color: OD_DK }), P.cyl(0.03, 0.035, 2.0, { z: 1.2, rx: Math.PI / 2, color: STEEL }, 10)]),
    at: [0, 0.3, 0.85],
    pitch: 0,
  },
  muzzle: [0, 0, 2.2],
  recoil: 0.06,
  marks: merge([...pair((s) => P.box(0.02, 0.3, 0.6, { x: s * 1.26, y: 1.6, z: 0.0 }))]),
}));

/** M198: the 155 mm towed howitzer emplaced — the split trails spread wide, the wheels lifted, the long
 *  barrel with its double-baffle brake over the cradle — towed by an M813 5-ton truck. */
export const buildUsM198 = vehicle(() => ({
  hull: grime(merge([
    ...pair((s) => P.box(0.18, 0.2, 4.2, { x: s * 1.0, y: 0.18, z: -2.0, ry: s * -0.3, color: OD, ...C })), // the trails, spread
    ...pair((s) => P.box(0.4, 0.3, 0.3, { x: s * 1.6, y: 0.12, z: -3.95, ry: s * -0.3, color: STEEL })),   // their spades
    ...pair((s) => tyre(s * 1.05, 0.55, 0.1, 0.55, 0.35)),
    P.cyl(0.06, 0.06, 2.1, { y: 0.55, z: 0.1, rz: Math.PI / 2, color: STEEL }, 8),                         // axle
    P.cyl(0.5, 0.55, 0.3, { y: 0.15, color: OD_DK }, 14),                                                 // the firing base on the ground
    P.box(1.2, 0.3, 1.0, { y: 0.45, z: 0.0, color: OD, ...C }),                                           // the bottom carriage
  ]), 1, 0.3),
  turret: {
    geo: grime(merge([
      P.box(1.0, 0.5, 1.3, { y: 0.25, color: OD, ...C }),                                                 // the top carriage
      ...pair((s) => P.box(0.12, 0.8, 0.6, { x: s * 0.45, y: 0.7, z: 0.1, color: OD_DK })),              // the trunnion cheeks
      ...pair((s) => P.cyl(0.08, 0.08, 1.3, { x: s * 0.4, y: 1.0, z: -0.3, rx: 1.1, color: STEEL }, 8)), // the equilibrators
    ]), 0.8, 0, 0.3),
    at: [0, 0.6, 0.0],
  },
  gun: {
    geo: merge([
      P.box(0.8, 0.4, 2.0, { z: -0.1, color: OD_DK }),                                                    // the cradle and recoil gear
      P.cyl(0.09, 0.11, 6.1, { z: 2.9, rx: Math.PI / 2, color: OD }, 12),
      P.box(0.4, 0.28, 0.5, { z: 5.95, color: STEEL }),                                                   // double-baffle brake
    ]).scale(1, 1, 0.8),
    at: [0, 0.95, 0.2],
    pitch: 0.45,
  },
  muzzle: [0, 0, 5.0],
  recoil: 0.6,
  tow: { geo: grime(merge(towTruck({ color: OD, dark: OD_DK, length: 7.6, width: 2.5 })), 1, 0.3), hitch: 1.0 },
  marks: merge([P.box(0.02, 0.2, 0.4, { x: 0.61, y: 0.45, z: 0.0 })]),
}));

/** The M151A2 jeep (the open quarter-ton, its windscreen folded flat), carrying a weapon on a post in the back. */
const jeep = (weapon, gunAt, muzzle) => ({
  wheels: wheeled([-1.05, 1.1], 0.7, 0.36),
  hull: grime(merge([
    P.box(1.55, 0.45, 3.2, { y: 0.75, color: OD, ...C }),                                                   // the tub
    P.box(1.4, 0.25, 1.0, { y: 1.05, z: 1.05, color: OD, ...C }),                                           // the bonnet
    P.box(1.4, 0.04, 0.5, { y: 1.2, z: 0.4, rx: -1.45, color: OD_DK }),                                     // the windscreen, folded down
    P.box(1.62, 0.06, 3.0, { y: 0.98, color: OD_DK }),                                                      // the wings round the wheels
    ...pair((s) => P.box(0.45, 0.3, 0.45, { x: s * 0.35, y: 1.1, z: -0.1, color: 0x2a2a24 })),            // the seats
    P.box(0.9, 0.04, 0.05, { y: 1.06, z: 1.56, color: STEEL }),                                             // the grille
    ...pair((s) => P.cyl(0.07, 0.07, 0.05, { x: s * 0.5, y: 1.0, z: 1.6, rx: Math.PI / 2, color: GLASS }, 8)),
    P.cyl(0.07, 0.07, 0.5, { y: 1.2, z: -0.9, color: STEEL }, 8),                                           // the weapon's post
  ]), 1, 0.3),
  turret: { geo: merge([P.cyl(0.12, 0.14, 0.1, { color: STEEL }, 10)]), at: [0, 1.45, -0.9] },
  gun: { geo: merge(weapon), at: gunAt, pitch: 0 },
  muzzle,
  recoil: 0.1,
  marks: merge([P.box(0.25, 0.02, 0.25, { y: 1.18, z: 1.2 })]),
});

/** M151A2 with the M220 TOW on its post: the launch tube over the tripod head, the sight beside it. */
export const buildUsJeepTOW = vehicle(() => jeep([
  P.box(0.3, 0.3, 0.4, { color: OD_DK }),                                                                   // the traversing unit
  P.cyl(0.11, 0.11, 1.5, { x: 0, y: 0.25, z: 0.3, rx: Math.PI / 2, color: OD, ...C }, 12),                 // the launch tube
  P.box(0.22, 0.25, 0.35, { x: 0.25, y: 0.1, z: 0.15, color: STEEL }),                                       // the optical sight
], [0, 0.15, 0], [0, 0.25, 1.05]));

/** The jeep with the M40 106 mm recoilless rifle: the long tube, the .50 cal spotting rifle on top of it. */
export const buildRokJeep106 = vehicle(() => jeep([
  P.box(0.25, 0.25, 0.4, { color: OD_DK }),
  P.cyl(0.08, 0.08, 3.4, { y: 0.2, z: 0.5, rx: Math.PI / 2, color: OD }, 12),                                // the M40, 3.4 m
  P.cyl(0.14, 0.11, 0.5, { y: 0.2, z: -1.35, rx: Math.PI / 2, color: STEEL }, 12),                           // its breech and venturi
  P.cyl(0.025, 0.025, 1.6, { y: 0.32, z: 0.6, rx: Math.PI / 2, color: STEEL }, 8),                            // the M8C spotting rifle
], [0, 0.15, 0], [0, 0.2, 2.2]));

// ---------------------------------------------------------------- Korea

/** M48A5K: the M48's boat-shaped cast hull, six road wheels and five return rollers, the big rounded
 *  "turtle" turret with the 105 mm M68 and the low Israeli-style cupola of the A5. */
export const buildRokM48 = vehicle(() => {
  const g = tracked({ halfWidth: 1.45, length: 4.6, wheels: 6, wheelR: 0.33, sprocket: -1, rollers: 5, trackWidth: 0.6, wheelColor: OD_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      // the cast hull: the rounded bow running back into the fenders
      trackedHull([[-3.3, 1.4, 0.55], [-3.05, 1.5, 0.45], [2.0, 1.55, 0.45], [3.0, 1.15, 0.55], [3.4, 0.85, 0.8]],
        { belly: 1.15, fender: 1.72, fenderY: 1.12, chamfer: 0.12 }, { color: OD, ...C }),
      P.box(2.4, 0.06, 1.5, { y: 1.52, z: -2.3, color: OD_DK }),
      ...pair((s) => P.box(0.45, 0.3, 1.3, { x: s * 1.45, y: 1.3, z: -1.4, color: OD_DK })),
      ...pair((s) => P.box(0.24, 0.17, 0.13, { x: s * 1.3, y: 1.25, z: 3.0, rx: 0.4, color: STEEL })),
    ]), 1.2, 0.3),
    turret: {
      geo: grime(merge([
        castTurret([[1.75, 0.55, 0.38], [1.3, 1.15, 0.72], [0.4, 1.5, 0.86], [-0.6, 1.5, 0.86], [-1.5, 1.3, 0.72], [-1.95, 0.8, 0.45]], { color: OD, ...C }, 2.2),
        P.cyl(0.38, 0.42, 0.24, { x: 0.6, y: 0.86, z: -0.35, color: OD, ...C }, 16),                    // the A5's low cupola
        ...fifty(0.6, 1.04, -0.2, 0.9),
        P.cyl(0.3, 0.3, 0.05, { x: -0.6, y: 0.85, z: -0.4, color: OD_DK }, 14),                        // loader's hatch
        P.box(0.15, 0.12, 0.3, { x: -0.6, y: 0.92, z: -0.15, color: STEEL }),                           // and his M60
        ...pair((s) => P.box(0.22, 0.14, 0.4, { x: s * 1.35, y: 0.55, z: 0.5, color: OD_DK })),       // the rangefinder's "ears"
        P.box(2.0, 0.3, 0.6, { y: 0.35, z: -2.15, color: 0x4d5236 }),                                   // bustle rack
        P.box(0.7, 0.5, 0.3, { y: 0.38, z: 1.7, color: OD, ...C }),                                     // mantlet
      ]), 0.9, 0, 0.4),
      at: [0, 1.55, 0.1],
    },
    gun: {
      geo: merge([
        P.cyl(0.075, 0.09, 5.2, { z: 2.6, rx: Math.PI / 2, color: OD }, 12),
        P.cyl(0.13, 0.13, 0.55, { z: 2.4, rx: Math.PI / 2, color: OD_DK }, 12),
      ]).scale(1, 1, 0.78),
      at: [0, 0.4, 1.8],
      pitch: 0,
    },
    muzzle: [0, 0, 4.1],
    recoil: 0.4,
    marks: merge([...pair((s) => P.box(0.02, 0.3, 0.6, { x: s * 1.73, y: 1.3, z: -1.2 }))]),
  };
});

/** KIFV (K200): the Korean aluminium carrier — longer than the M113, the trim vane on the bow, the .50 cal
 *  behind its armoured shield at the right front, an M60 on a pintle behind the troop hatch. */
export const buildRokKIFV = vehicle(() => ({
  ...m113Hull([
    P.box(0.5, 0.06, 0.5, { x: -0.3, y: 1.92, z: -1.4, color: OD_DK }),                                    // the troop hatch
    P.box(0.06, 0.35, 0.06, { x: -0.3, y: 2.08, z: -1.75, color: STEEL }),                                  // its pintle
    P.box(0.1, 0.1, 0.8, { x: -0.3, y: 2.28, z: -1.5, color: STEEL }),                                      // and the M60 on it
  ], { color: OD, roof: 1.9 }),
  turret: {
    geo: grime(merge([
      P.cyl(0.42, 0.46, 0.3, { y: 0.15, color: OD, ...C }, 14),                                             // the commander's cupola
      P.box(0.8, 0.5, 0.06, { y: 0.55, z: 0.45, color: OD, ...C }),                                         // the gun shield in front…
      ...pair((s) => P.box(0.06, 0.4, 0.4, { x: s * 0.4, y: 0.5, z: 0.25, color: OD, ...C })),             // …and its wings
    ]), 0.6, 0, 0.4),
    at: [0.45, 1.9, 0.6],
  },
  gun: { geo: merge(fifty(0, 0, 0, 1.1)), at: [0, 0.5, 0.3], pitch: 0 },
  muzzle: [0, 0, 1.4],
  recoil: 0.04,
  marks: merge([P.box(0.02, 0.3, 0.5, { x: 1.39, y: 1.4, z: -0.6 })]),
}));

// ---------------------------------------------------------------- Korean People's Army

/** The T-54/55 hull of the KPA's tanks: `long` the Chonma-ho's (the T-62's longer hull). */
const kpaHull = (long, extra = []) => {
  const L = long ? 0.25 : 0;
  const g = tracked({ halfWidth: 1.35, length: 4.6 + L * 2, wheels: 5, wheelR: 0.41, sprocket: -1, rollers: 0, trackWidth: 0.58, wheelColor: KPA_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.1 - L, 1.28, 0.55], [-2.9 - L, 1.33, 0.45], [2.0 + L, 1.36, 0.45], [3.0 + L, 1.0, 0.6], [3.12 + L, 0.84, 0.84]],
        { belly: 1.1, fender: 1.62, fenderY: 1.05, chamfer: 0.04 }, { color: KPA, ...C }),
      ...pair((s) => P.cyl(0.3, 0.3, 0.95, { x: s * 0.7, y: 1.6, z: -2.95 - L, rz: Math.PI / 2, color: KPA_DK }, 14)), // fuel drums at the rear
      P.cyl(0.14, 0.14, 2.9, { y: 1.5, z: -3.3 - L, rz: Math.PI / 2, color: WOOD }, 10),                   // unditching log
      ...[0.4, 1.0, 1.6].map((z) => P.box(0.42, 0.3, 0.5, { x: 1.4, y: 1.2, z: -z, color: KPA_DK })),     // fender tanks
      P.box(1.7, 0.05, 1.2, { y: 1.34, z: -2.15 - L, color: KPA_DK }),
      ...pair((s) => P.cyl(0.07, 0.07, 0.1, { x: s * 1.25, y: 1.12, z: 2.9 + L, rx: Math.PI / 2, color: STEEL }, 10)),
      P.box(0.45, 0.06, 0.4, { x: -0.6, y: 1.37, z: 1.9 + L, color: KPA_DK }),
      ...extra,
    ]), 1.2, 0.3),
  };
};

/** T-55 as the KPA has them: no add-on armour, the round dome, the 100 mm D-10T, a DShK on the loader's hatch. */
export const buildKpaT55 = vehicle(() => ({
  ...kpaHull(false),
  turret: {
    geo: grime(merge([
      castTurret([[1.5, 0.38, 0.32], [1.35, 0.95, 0.62], [0.95, 1.3, 0.82], [0.3, 1.38, 0.9], [-0.35, 1.35, 0.88], [-0.95, 1.2, 0.76], [-1.35, 0.9, 0.56], [-1.5, 0.38, 0.26]], { color: KPA, ...C }),
      P.cyl(0.33, 0.36, 0.22, { x: -0.55, y: 0.92, z: -0.25, color: KPA }, 14),
      P.cyl(0.3, 0.3, 0.05, { x: 0.55, y: 0.92, z: -0.3, color: KPA_DK }, 14),
      P.box(0.12, 0.14, 0.4, { x: 0.55, y: 1.0, z: -0.1, color: STEEL }),
      P.cyl(0.025, 0.025, 1.0, { x: 0.55, y: 1.02, z: 0.5, rx: Math.PI / 2, color: STEEL }, 6),
      P.cyl(0.15, 0.15, 0.28, { x: 0.65, y: 0.62, z: 1.05, rx: Math.PI / 2, color: STEEL }, 12),            // IR searchlight
      P.box(1.2, 0.3, 0.45, { y: 0.3, z: -1.45, color: KPA_DK }),
      P.box(0.6, 0.42, 0.3, { y: 0.4, z: 1.5, color: KPA }),
    ]), 0.9, 0, 0.4),
    at: [0, 1.36, 0.5],
  },
  gun: {
    geo: merge([
      P.cyl(0.075, 0.1, 5.3, { z: 2.65, rx: Math.PI / 2, color: KPA }, 14),
      P.cyl(0.14, 0.14, 0.5, { z: 4.6, rx: Math.PI / 2, color: KPA }, 14),                                 // the fume extractor near the muzzle
    ]).scale(1, 1, 0.72),
    at: [0, 0.42, 1.55],
    pitch: 0,
  },
  muzzle: [0, 0, 3.85],
  recoil: 0.38,
  marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.64, y: 1.2, z: 0.6 }))]),
}));

/** Chonma-ho: the North's T-62 — the longer hull, the wider and flatter dome turret, the 115 mm smoothbore
 *  with its fume extractor a third of the way back from the muzzle, a laser rangefinder over the gun. */
export const buildKpaChonma = vehicle(() => ({
  ...kpaHull(true),
  turret: {
    geo: grime(merge([
      castTurret([[1.55, 0.4, 0.3], [1.3, 1.1, 0.62], [0.8, 1.42, 0.78], [0.0, 1.5, 0.84], [-0.7, 1.45, 0.82], [-1.3, 1.2, 0.68], [-1.65, 0.75, 0.42], [-1.75, 0.35, 0.22]], { color: KPA, ...C }, 2.3),
      P.cyl(0.33, 0.36, 0.22, { x: 0.55, y: 0.8, z: -0.3, color: KPA }, 14),                               // commander's cupola (right, as the T-62)
      P.cyl(0.3, 0.3, 0.05, { x: -0.55, y: 0.8, z: -0.35, color: KPA_DK }, 14),                            // loader's hatch…
      P.box(0.12, 0.14, 0.4, { x: -0.55, y: 0.88, z: -0.15, color: STEEL }),                               // …and the AA gun on it
      P.cyl(0.025, 0.025, 1.0, { x: -0.55, y: 0.9, z: 0.45, rx: Math.PI / 2, color: STEEL }, 6),
      P.box(0.38, 0.22, 0.3, { y: 0.84, z: 1.0, color: KPA_DK }),                                          // laser rangefinder over the gun
      P.cyl(0.15, 0.15, 0.28, { x: 0.7, y: 0.6, z: 1.0, rx: Math.PI / 2, color: STEEL }, 12),              // IR searchlight
      ...pair((s) => smoke(s * 1.25, 0.4, 0.4, 3, s * 0.9)).flat(),
      P.box(1.4, 0.3, 0.45, { y: 0.28, z: -1.65, color: KPA_DK }),                                         // rear stowage
      P.box(0.6, 0.42, 0.3, { y: 0.4, z: 1.55, color: KPA }),
    ]), 0.9, 0, 0.4),
    at: [0, 1.36, 0.6],
  },
  gun: {
    geo: merge([
      P.cyl(0.075, 0.095, 5.6, { z: 2.8, rx: Math.PI / 2, color: KPA }, 14),                               // 115 mm U-5TS
      P.cyl(0.15, 0.15, 0.55, { z: 3.6, rx: Math.PI / 2, color: KPA }, 14),                                // its fume extractor
    ]).scale(1, 1, 0.74),
    at: [0, 0.42, 1.65],
    pitch: 0,
  },
  muzzle: [0, 0, 4.15],
  recoil: 0.4,
  marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.64, y: 1.2, z: 0.6 }))]),
}));

/** VTT-323 (M1973): the North's tracked carrier, on the lines of the Chinese Type 63 — the high slab-sided
 *  hull, the sloped bow, five road wheels, and a cone turret with the 14.5 mm KPVT and a PKT beside it. */
export const buildKpaVTT323 = vehicle(() => {
  const g = tracked({ halfWidth: 1.25, length: 4.2, wheels: 5, wheelR: 0.33, sprocket: 1, rollers: 0, trackWidth: 0.42, wheelColor: KPA_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.0, 2.0, 0.5], [-2.85, 2.05, 0.45], [1.2, 2.05, 0.45], [2.6, 1.3, 0.5], [3.05, 0.9, 0.75]],
        { belly: 1.0, fender: 1.5, fenderY: 1.05, chamfer: 0.08 }, { color: KPA, ...C }),
      P.box(1.4, 1.1, 0.06, { y: 1.35, z: -3.02, color: KPA_DK }),                                         // rear door
      ...pair((s) => P.box(0.55, 0.06, 0.55, { x: s * 0.5, y: 2.07, z: -1.8, color: KPA_DK })),            // roof hatches
      ...[-2.2, -1.5, -0.8].map((z) => pair((s) => P.box(0.04, 0.08, 0.1, { x: s * 1.51, y: 1.65, z, color: STEEL }))).flat(), // firing ports
      P.box(0.45, 0.06, 0.4, { x: -0.6, y: 1.8, z: 1.55, rx: 0.5, color: KPA_DK }),                        // driver's hatch
      ...pair((s) => P.cyl(0.06, 0.06, 0.1, { x: s * 1.0, y: 1.2, z: 2.9, rx: Math.PI / 2, color: STEEL }, 10)),
    ]), 1.1, 0.3),
    turret: {
      geo: grime(merge([castTurret([[0.55, 0.3, 0.2], [0.4, 0.45, 0.42], [-0.1, 0.48, 0.48], [-0.45, 0.35, 0.36], [-0.55, 0.2, 0.18]], { color: KPA, ...C }, 2.4)]), 0.5, 0, 0.4),
      at: [0, 2.05, 0.2],
    },
    gun: { geo: merge([P.cyl(0.04, 0.045, 1.6, { z: 0.8, rx: Math.PI / 2, color: STEEL }, 10), P.cyl(0.015, 0.015, 0.6, { x: 0.12, z: 0.4, rx: Math.PI / 2, color: STEEL }, 6)]), at: [0, 0.3, 0.45], pitch: 0 },
    muzzle: [0, 0, 1.65],
    recoil: 0.06,
    marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.51, y: 1.6, z: 0.4 }))]),
  };
});

/** Koksan M1978: the 170 mm gun on an open mount at the back of a T-54 hull with the turret taken off, the
 *  long barrel out over the engine deck to the front, the recoil spades folded at the tail. */
export const buildKpaKoksan = vehicle(() => ({
  ...kpaHull(false, pair((s) => P.box(0.5, 0.7, 0.12, { x: s * 0.9, y: 0.95, z: -3.3, rx: -0.4, color: KPA_DK }))), // the spades
  turret: {
    geo: grime(merge([
      P.box(2.0, 0.35, 2.2, { y: 0.18, color: KPA, ...C }),                                                 // the mount on the deck
      ...pair((s) => P.box(0.12, 1.0, 1.4, { x: s * 0.55, y: 0.75, z: 0.1, color: KPA_DK })),              // the cradle's cheeks
      P.box(1.6, 0.06, 1.0, { y: 0.38, z: -0.7, color: STEEL }),                                            // the crew's platform
    ]), 0.9, 0, 0.4),
    at: [0, 1.36, -1.6],
  },
  gun: {
    geo: merge([
      P.box(1.0, 0.5, 2.0, { z: -0.2, color: KPA_DK }),                                                     // the recoil gear
      P.cyl(0.1, 0.13, 9.0, { z: 4.4, rx: Math.PI / 2, color: KPA }, 12),                                    // 170 mm, L/50
      P.cyl(0.16, 0.16, 0.5, { z: 8.8, rx: Math.PI / 2, color: STEEL }, 12),                                 // muzzle brake
    ]).scale(1, 1, 0.8),
    at: [0, 1.0, 0.3],
    pitch: 0.25,
  },
  muzzle: [0, 0, 7.3],
  recoil: 0.7,
  marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.64, y: 1.2, z: 0.6 }))]),
}));

