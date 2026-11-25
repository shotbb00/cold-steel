// The vehicles of the Northern Flank and Korea, 1985 (support.js vehicle kit; contract in render/RigRenderer.js),
// where the four armies' kit looks unlike anything the US Army, the Bundeswehr, the Soviets or the NVA drive:
//   Norway   Leopard 1A1NO (the cast turret of the early Leopard, the L7 in its thermal sleeve) · NM116 (the
//            M24 Chaffee rebuilt by Thune-Eureka: a diesel, the 90 mm D/925, a laser rangefinder) · NM135 (the
//            M113 with the Hägglunds 20 mm turret) · NM142 (the M113 with the armoured twin-TOW turret) · the
//            Leopard 1A1NO with a mine plough
//   USMC     M60A1 (the long needle-nose turret, the big M19 cupola) · AAV7A1 (the 26-tonne amphibious tractor,
//            the .50 cal turret at the right front) · LAV-25 (the 8×8 with the 25 mm turret) · M198 155 mm on its
//            split trail behind a 5-ton truck · the M151A2 jeep with a TOW · the M718A1 jeep ambulance
//   Norway   (air defence) the 40 mm Bofors L/70 on its carriage behind a truck
//   Korea    M48A5K (the turtle-shell M48 turret with the 105 mm and the low cupola) · KIFV (the aluminium
//            carrier with its armoured .50 cal) · the jeep with the M40 106 mm recoilless rifle · K1 (low, boxy
//            welded turret, 105 mm) · K136 Kooryong (36 × 130 mm on the KM809) · KM900 (Fiat 6614) · M48 AVLB
//   KPA      T-55 (plain, as the KPA has them) · Chonma-ho (the North's T-62: longer, the flatter dome, the
//            115 mm with its fume extractor out along the barrel) · VTT-323 (the M1973 carrier with the
//            14.5 mm turret) · Koksan M1978 (the 170 mm gun on an open mount at the back of a T-54 hull) · the
//            S-125's 5P73 launcher (SA-3: four missiles on their beam, towed in) · the Sungri-58 ambulance
// NATO hulls are painted in parts with camo 1: each army's paint (RigRenderer ARMY_CAMO).
import { P, merge, pair, grime } from '../units/geometry.js';
import { planProfile, sideProfile, trackedHull, castTurret, stationHull } from './vehicleCommon.js';
import { vehicle, tracked, wheeled, towTruck, m113Hull, cross, scissors } from './support.js';
import { truckUnit } from './truck.js';

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
const noLeopard1 = () => {
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
};
export const buildNoLeopard1 = vehicle(noLeopard1);

/** Leopard 1A1NO with a track-width mine plough ahead of it: a blade and tines before each track, the frame
 *  and push arms back to the hull sides. */
export const buildNoLeopard1Plough = vehicle(() => {
  const d = noLeopard1();
  return {
    ...d,
    hull: merge([d.hull, grime(merge([
      ...pair((s) => P.box(0.8, 0.6, 0.12, { x: s * 1.35, y: 0.42, z: 3.95, rx: 0.4, color: OD_DK })),
      ...pair((s) => [0, 1, 2, 3, 4].map((k) => P.box(0.06, 0.22, 0.06, { x: s * 1.35 - 0.32 + k * 0.16, y: 0.12, z: 4.12, rx: 0.5, color: STEEL }))).flat(),
      ...pair((s) => P.box(0.12, 0.5, 0.35, { x: s * 1.35, y: 0.62, z: 3.72, color: STEEL })),
      P.box(3.1, 0.16, 0.16, { y: 0.82, z: 3.68, color: STEEL }),
      ...pair((s) => P.box(0.16, 0.16, 1.6, { x: s * 1.3, y: 0.92, z: 2.95, rx: 0.08, color: STEEL })),
      ...pair((s) => P.box(0.3, 0.3, 0.3, { x: s * 1.3, y: 0.98, z: 2.2, color: OD_DK })),
    ]), 1.2, 0.3)]),
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

/** The M718A1 front-line ambulance: the M151 with its tail stretched for two litters under a canvas top, red crosses. */
export const buildUsM718 = vehicle(() => {
  const j = jeep([P.box(0.01, 0.01, 0.01)], [0, 0, 0], [0, 1.6, 0]);
  return {
    wheels: j.wheels,
    hull: merge([
      j.hull,
      grime(merge([P.box(1.5, 0.9, 1.9, { y: 1.45, z: -0.7, color: OD_DK })]), 1.2, 1.9, 0.3),             // the canvas over the litters
      ...cross({ x: 0.76, y: 1.45, z: -0.7 }),
      ...cross({ x: -0.76, y: 1.45, z: -0.7 }),
    ]),
    muzzle: [0, 1.6, 0],
  };
});

// ---------------------------------------------------------------- Korea

/** M48A5K: the M48's boat-shaped cast hull, six road wheels and five return rollers, the big rounded
 *  "turtle" turret with the 105 mm M68 and the low Israeli-style cupola of the A5. */
/** The M48's chassis (the A5K tank's and the AVLB's): six road wheels, five return rollers, the cast hull. */
const m48Chassis = (extra = []) => {
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
      ...extra,
    ]), 1.2, 0.3),
  };
};

export const buildRokM48 = vehicle(() => {
  return {
    ...m48Chassis(),
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

/** K1 (the "88 tank"): lower and boxier than the Abrams it grew from — a hull 7.5 m long, the flat-roofed welded
 *  turret with its sides sloped in and the narrow wedge front, the gunner's sight box on the roof, the 105 mm
 *  KM68A1 in its thermal sleeve with the bore evacuator, six road wheels and two return rollers (hydropneumatic
 *  at the front and rear stations: it kneels and tilts to fire over a ridge). */
export const buildRokK1 = vehicle(() => {
  const g = tracked({ halfWidth: 1.45, length: 4.9, wheels: 6, wheelR: 0.34, sprocket: -1, rollers: 2, trackWidth: 0.6, wheelColor: OD_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.6, 1.26, 0.5], [-3.35, 1.3, 0.45], [2.35, 1.32, 0.45], [3.6, 0.98, 0.6], [3.72, 0.9, 0.82]],
        { belly: 1.15, fender: 1.8, fenderY: 1.22, chamfer: 0.04 }, { color: OD, ...C }),
      ...Array.from({ length: 6 }, (_, i) => pair((s) => P.box(0.07, 0.62, 0.98, { x: s * 1.8, y: 0.96, z: -2.75 + i * 1.0, color: OD, ...C }))).flat(), // the side skirts
      P.box(2.2, 0.06, 1.5, { y: 1.31, z: -2.7, color: OD_DK }),                                                  // the engine deck grilles
      ...[-3.2, -2.9, -2.6, -2.3].map((z) => P.box(2.0, 0.03, 0.06, { y: 1.34, z, color: STEEL })),
      P.box(1.5, 0.5, 0.06, { y: 1.0, z: -3.62, color: STEEL }),                                                  // the exhaust louvres at the back
      P.box(0.55, 0.06, 0.5, { y: 1.33, z: 2.25, color: OD_DK }),                                                 // driver's hatch
      ...pair((s) => P.box(0.24, 0.16, 0.12, { x: s * 1.3, y: 1.15, z: 3.55, rx: 0.4, color: STEEL })),          // headlights in their guards
      ...pair((s) => P.box(0.14, 0.14, 0.2, { x: s * 0.7, y: 0.75, z: 3.75, color: STEEL })),                    // tow hooks
    ]), 1.3, 0.3),
    turret: {
      geo: grime(merge([
        stationHull([
          [2.05, [[0, 0.05], [0.62, 0.05], [0.55, 0.52], [0, 0.56]]],     // the narrow wedge nose
          [1.05, [[0, 0], [1.66, 0], [1.5, 0.64], [0, 0.68]]],
          [-1.35, [[0, 0], [1.7, 0], [1.55, 0.66], [0, 0.68]]],
          [-2.05, [[0, 0.08], [1.45, 0.08], [1.33, 0.6], [0, 0.63]]],      // the bustle's back
        ], { color: OD, ...C }),
        P.box(0.5, 0.36, 0.55, { x: -0.62, y: 0.86, z: 0.95, color: OD_DK }),                                     // the gunner's sight box
        P.box(0.36, 0.06, 0.03, { x: -0.62, y: 0.92, z: 1.23, color: GLASS }),
        P.cyl(0.36, 0.4, 0.22, { x: 0.68, y: 0.78, z: -0.35, color: OD, ...C }, 14),                             // commander's cupola
        P.cyl(0.12, 0.12, 0.28, { x: 0.68, y: 1.0, z: -0.05, color: OD_DK }, 10),                                // his periscopic sight
        ...fifty(0.68, 0.98, -0.25, 1.0),                                                                          // the K6 .50 cal
        P.cyl(0.29, 0.29, 0.05, { x: -0.68, y: 0.7, z: -0.55, color: OD_DK }, 14),                                // loader's hatch…
        P.box(0.12, 0.12, 0.32, { x: -0.68, y: 0.8, z: -0.3, color: STEEL }),                                     // …and his M60
        P.cyl(0.02, 0.02, 0.6, { x: -0.68, y: 0.8, z: 0.1, rx: Math.PI / 2, color: STEEL }, 6),
        P.cyl(0.02, 0.02, 0.8, { x: -0.9, y: 1.05, z: -1.8, color: STEEL }, 4),                                   // the crosswind sensor's mast
        ...pair((s) => smoke(s * 1.55, 0.45, 0.6, 6, s * 1.2)).flat(),                                             // the six-barrel smoke clusters
        P.box(2.9, 0.06, 0.9, { y: 0.32, z: -2.45, color: STEEL }),                                                // bustle rack…
        P.box(2.5, 0.38, 0.8, { y: 0.54, z: -2.45, color: 0x56583e }),                                             // …loaded
        P.box(0.85, 0.56, 0.22, { y: 0.34, z: 2.1, color: OD, ...C }),                                            // mantlet
      ]), 0.9, 0, 0.4),
      at: [0, 1.32, 0.2],
    },
    gun: {
      geo: merge([
        P.cyl(0.08, 0.1, 5.4, { z: 2.7, rx: Math.PI / 2, color: OD }, 14),
        ...[0.6, 1.3, 3.8].map((z) => P.cyl(0.12, 0.12, 0.6, { z, rx: Math.PI / 2, color: OD_DK }, 14)),          // the thermal sleeve's sections
        P.cyl(0.16, 0.16, 0.7, { z: 2.6, rx: Math.PI / 2, color: OD }, 14),                                         // bore evacuator
      ]).scale(1, 1, 0.74),
      at: [0, 0.36, 2.15],
      pitch: 0,
    },
    muzzle: [0, 0, 4.0],
    recoil: 0.4,
    marks: merge([...pair((s) => P.box(0.02, 0.3, 0.6, { x: s * 1.84, y: 1.0, z: -0.4 }))]),
  };
});

/** K136 Kooryong: two 18-tube 130 mm launchers side by side on a turntable at the back of the KM809 (the Korean
 *  M809 5-ton 6×6 with its square bonnet), the rear jacks down to fire. */
export const buildRokK136 = vehicle(() => {
  const t = truckUnit({ length: 7.6, width: 2.45, color: OD, dark: OD_DK, camo: 1, bonnet: 'square', body: 'flat', r: 0.55, axles: [6.4, 2.0, 0.75] });
  const L = t.layout;
  const pod = (x) => [
    P.box(0.98, 0.52, 2.4, { x, color: OD, ...C }),
    ...Array.from({ length: 18 }, (_, k) => P.cyl(0.062, 0.062, 0.03, { x: x - 0.4 + (k % 6) * 0.16, y: -0.16 + Math.floor(k / 6) * 0.16, z: 1.215, rx: Math.PI / 2, color: 0x141414 }, 8)),
  ];
  return {
    wheels: wheeled(L.axles, t.track, 0.55),
    hull: grime(merge([
      ...t.parts,
      P.box(1.3, 0.3, 1.3, { y: L.deck + 0.25, z: L.rear + 1.5, color: OD_DK }),                         // the turntable's base
      ...pair((s) => P.box(0.3, 0.6, 0.3, { x: s * 1.05, y: L.deck - 0.2, z: L.rear + 0.35, color: STEEL })), // the rear jacks
      P.box(1.9, 0.5, 0.9, { y: L.deck + 0.3, z: L.cabRear - 0.6, color: 0x575a40 }),                      // the crew's kit behind the cab
    ]), 1.2, 0.3),
    turret: { geo: grime(merge([P.box(1.0, 0.4, 1.0, { y: 0.2, color: OD_DK })]), 0.6, 0, 0.3), at: [0, L.deck + 0.4, L.rear + 1.5] },
    gun: { geo: merge([P.box(1.6, 0.14, 0.6, { y: -0.36, color: STEEL }), ...pod(-0.52), ...pod(0.52)]), at: [0, 0.72, 0.4], pitch: 0.5 },
    muzzle: [0, 0, 1.25],
    recoil: 0.04,
    marks: merge([...pair((s) => P.box(0.02, 0.28, 0.4, { x: s * (L.hw - 0.03), y: L.deck + 0.4, z: L.cabFront - 0.5 }))]),
  };
});

/** KM900 (the Fiat 6614 built under licence by Asia Motors): the boat-shaped 4×4 armoured carrier, the hull's
 *  sides sloped in above and below the wheels, the glacis down to a pointed bow, the .50 cal on its cupola. */
export const buildRokKM900 = vehicle(() => {
  const mid = [[0, 0.45], [0.82, 0.45], [1.2, 1.02], [0.98, 1.74], [0, 1.78]];
  return {
    wheels: wheeled([1.45, -1.45], 1.12, 0.5),
    hull: grime(merge([
      stationHull([
        [2.95, [[0, 0.7], [0.75, 0.7], [0.95, 1.02], [0.78, 1.25], [0, 1.28]]],                   // the bow
        [2.2, mid], [-2.55, mid],
        [-2.9, [[0, 0.6], [0.78, 0.6], [1.12, 1.02], [0.92, 1.66], [0, 1.68]]],                  // the back, its door
      ], { color: OD, ...C }),
      ...[1.45, -1.45].flatMap((z) => pair((s) => P.box(0.12, 0.08, 1.2, { x: s * 1.18, y: 1.08, z, color: OD_DK }))), // the wheel arches' lips
      P.box(0.9, 0.95, 0.05, { y: 1.12, z: -2.92, color: OD_DK }),                                    // the rear door
      P.box(0.05, 0.75, 0.7, { x: 1.1, y: 1.3, z: 0.1, rz: -0.32, color: OD_DK }),                    // the side door
      ...pair((s) => [-1.6, -0.6, 0.7].map((z) => P.box(0.03, 0.1, 0.22, { x: s * 1.06, y: 1.5, z, rz: s * 0.32, color: GLASS }))).flat(), // vision blocks
      ...pair((s) => [-1.2, -0.2].map((z) => P.cyl(0.04, 0.04, 0.04, { x: s * 1.13, y: 1.3, z, rz: Math.PI / 2, color: STEEL }, 8))).flat(), // firing ports
      P.box(0.6, 0.06, 0.5, { x: -0.45, y: 1.8, z: 1.55, color: OD_DK }),                             // the driver's hatch, left
      ...[-0.15, 0, 0.15].map((x) => P.box(0.1, 0.07, 0.04, { x: -0.45 + x, y: 1.78, z: 1.86, rx: -0.4, color: GLASS })),
      P.box(0.5, 0.25, 0.6, { x: 0.55, y: 1.88, z: -1.6, color: STEEL }),                             // the engine's exhaust and grille, right rear
      P.box(0.8, 0.05, 0.6, { y: 1.8, z: -0.9, color: OD_DK }),                                       // the roof hatch
      ...pair((s) => P.box(0.2, 0.14, 0.1, { x: s * 0.6, y: 1.18, z: 2.75, color: STEEL })),         // headlights
      ...pair((s) => P.box(0.14, 0.1, 0.02, { x: s * 0.6, y: 1.18, z: 2.81, color: GLASS })),
    ]), 1.1, 0.3),
    turret: {
      geo: grime(merge([
        P.cyl(0.42, 0.46, 0.28, { y: 0.14, color: OD, ...C }, 14),                                    // the cupola
        ...[0, 1, 2, 3, 4].map((k) => P.box(0.1, 0.07, 0.03, { x: Math.sin(k * 0.6 - 1.2) * 0.44, y: 0.2, z: Math.cos(k * 0.6 - 1.2) * 0.44, ry: k * 0.6 - 1.2, color: GLASS })),
        P.cyl(0.28, 0.28, 0.05, { y: 0.3, z: -0.1, color: OD_DK }, 12),
      ]), 0.6, 0, 0.4),
      at: [0.2, 1.78, 0.4],
    },
    gun: { geo: merge(fifty(0, 0, 0, 1.1)), at: [0, 0.42, 0.2], pitch: 0 },
    muzzle: [0, 0, 1.4],
    recoil: 0.04,
    marks: merge([...pair((s) => P.box(0.02, 0.28, 0.45, { x: s * 1.15, y: 1.35, z: -2.0, rz: s * 0.32 }))]),
  };
});

/** M48 AVLB: the M48's hull with the launcher where the turret was and the 18 m scissors bridge folded on top. */
export const buildRokAVLB = vehicle(() => ({
  ...m48Chassis([
    stationHull([[-0.6, [[0, 1.5], [0.9, 1.5], [0.9, 1.9], [0.75, 2.0], [0, 2.0]]], [1.0, [[0, 1.5], [0.9, 1.5], [0.9, 1.9], [0.75, 2.0], [0, 2.0]]]], { color: OD, ...C }),
    ...pair((s) => P.box(0.22, 0.22, 1.6, { x: s * 0.75, y: 1.7, z: 2.4, rx: 0.25, color: OD_DK })),         // the launching arms
    ...pair((s) => P.cyl(0.09, 0.09, 1.2, { x: s * 0.75, y: 1.45, z: 2.7, rx: Math.PI / 2 + 0.5, color: STEEL }, 8)),
    P.box(2.6, 0.18, 0.3, { y: 1.0, z: 3.5, color: OD_DK }),                                                 // the front spade
    P.cyl(0.3, 0.32, 0.18, { x: 0.5, y: 2.05, z: 0.6, color: OD_DK }, 12),                                   // the commander's hatch
  ]),
  load: grime(scissors({ y: 2.08, length: 9.2, width: 3.8, color: OD, dark: OD_DK }), 1.2, 0.3),
  muzzle: [0, 2, 0],
  marks: merge([...pair((s) => P.box(0.02, 0.3, 0.6, { x: s * 1.73, y: 1.3, z: -1.2 }))]),
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


/** The 40 mm Bofors L/70 on its four-wheeled carriage, jacked down: the gun in its box of a shield, behind an OD truck. */
export const buildNoBofors = vehicle(() => ({
  hull: grime(merge([
    P.box(1.6, 0.3, 3.0, { y: 0.55, color: OD, ...C }),
    ...[-1.0, 1.0].flatMap((z) => pair((s) => tyre(s * 0.85, 0.42, z, 0.4, 0.25))),
    ...[[-1, -1.4], [1, -1.4], [-1, 1.4], [1, 1.4]].map(([x, z]) => P.box(0.1, 0.4, 0.1, { x: x * 1.0, y: 0.25, z, color: STEEL })), // the outriggers' jacks
  ]), 1, 0.3),
  turret: {
    geo: grime(merge([
      P.cyl(0.7, 0.7, 0.15, { color: OD_DK }, 16),
      P.box(1.4, 0.9, 1.3, { y: 0.55, z: -0.1, color: OD, ...C }),                                        // the shield box round the mount
    ]), 0.8, 0, 0.3),
    at: [0, 0.75, 0],
  },
  gun: {
    geo: merge([
      P.box(0.45, 0.45, 1.0, { color: OD_DK }),
      P.cyl(0.05, 0.06, 3.0, { z: 1.9, rx: Math.PI / 2, color: STEEL }, 10),                                // 40 mm, L/70
      P.cyl(0.08, 0.07, 0.3, { z: 3.45, rx: Math.PI / 2, color: STEEL }, 10),                               // flash hider
      P.box(0.3, 0.35, 0.4, { y: 0.4, z: -0.2, color: OD }),                                               // the clip feed on top
    ]),
    at: [0, 1.0, 0.2],
  },
  muzzle: [0, 0, 3.6],
  recoil: 0.15,
  tow: { geo: grime(merge(towTruck({ color: OD, dark: OD_DK, length: 6.4, width: 2.4 })), 1, 0.3), hitch: 2.2 },
  marks: merge([P.box(0.02, 0.2, 0.4, { x: 0.81, y: 0.65, z: 0.4 })]),
}));

/** The S-125's 5P73 launcher (SA-3): four missiles, two on each side of the beam, the boosters' big fins at the back. */
export const buildKpaS125 = vehicle(() => ({
  hull: grime(merge([
    P.box(2.2, 0.35, 2.2, { y: 0.35, color: KPA }),                                                         // the launcher's base, set down
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => P.box(0.12, 0.45, 0.12, { x: x * 1.15, y: 0.22, z: z * 1.15, color: STEEL })),
  ]), 1, 0.3),
  turret: { geo: grime(merge([P.cyl(0.55, 0.6, 0.5, { y: 0.25, color: KPA_DK }, 14)]), 0.6, 0, 0.3), at: [0, 0.55, 0] },
  gun: {
    geo: merge([
      P.box(2.4, 0.2, 0.5, { color: STEEL }),
      ...[[-0.85, -0.2], [-0.85, 0.45], [0.85, -0.2], [0.85, 0.45]].flatMap(([x, y]) => [
        P.cyl(0.15, 0.15, 3.4, { x, y, z: 0.9, rx: Math.PI / 2, color: 0xb8b8a8 }, 10),                    // the sustainer
        P.cone(0.15, 0.5, { x, y, z: 2.85, rx: Math.PI / 2, color: 0xb8b8a8 }, 10),
        P.cyl(0.2, 0.2, 1.1, { x, y, z: -1.3, rx: Math.PI / 2, color: 0x9a9a8a }, 10),                     // the booster
        ...[0, 1, 2, 3].map((k) => P.box(0.02, 0.6, 0.55, { x: x + Math.sin(k * 1.57) * 0.25, y: y + Math.cos(k * 1.57) * 0.25, z: -1.7, rz: k * 1.57, color: 0x9a9a8a })),
      ]),
    ]),
    at: [0, 0.75, 0],
    pitch: 0.5,
  },
  muzzle: [0, 0.45, 3.1],
  recoil: 0,
  tow: { geo: grime(merge(towTruck({ color: KPA, dark: KPA_DK, length: 7.0, width: 2.5, bonnet: 'round' })), 1, 0.4), hitch: 1.9 },
  marks: merge([P.box(0.02, 0.25, 0.4, { x: 1.11, y: 0.4, z: 0.4 })]),
}));

// ---------------------------------------------------------------- KPA: the HY-2 Silkworm coastal battery (data/units/baltic85.js coastMissile)

const MISSILE = 0x8e9682;
/** The HY-2 (CSS-C-3 Silkworm) on its towed launcher: a four-wheeled trailer with jacks, the turntable, the launch rail
 *  and the missile on it — the fat body with its rounded radar nose, the two mid wings, the tailplanes and the fin, the
 *  booster slung under the tail. Towed in behind a truck, set down, then away to a new hide. */
export const buildKpaHY2 = vehicle(() => ({
  wheels: wheeled([1.6, -1.6, -2.6], 0.85, 0.45),
  hull: grime(merge([
    P.box(1.6, 0.3, 6.2, { y: 0.8, z: -0.3, color: KPA }),                                                   // the trailer's frame
    ...pair((s) => P.box(0.12, 0.35, 6.4, { x: s * 0.75, y: 0.62, z: -0.3, color: KPA_DK })),
    P.box(0.14, 0.14, 1.6, { y: 0.6, z: 3.5, color: STEEL }), P.cyl(0.1, 0.1, 0.25, { y: 0.6, z: 4.3, color: STEEL }, 8), // the drawbar and its eye
    ...[[-1, 2.4], [1, 2.4], [-1, -3.2], [1, -3.2]].flatMap(([x, z]) => [
      P.box(0.8, 0.12, 0.14, { x: x * 1.15, y: 0.78, z, color: KPA_DK }),                                   // the outriggers…
      P.box(0.12, 0.7, 0.12, { x: x * 1.5, y: 0.4, z, color: STEEL }), P.box(0.35, 0.06, 0.35, { x: x * 1.5, y: 0.04, z, color: STEEL }), // …their jacks
    ]),
    ...pair((s) => P.box(0.4, 0.06, 2.2, { x: s * 0.85, y: 0.98, z: -2.1, color: KPA_DK })),               // the mudguards
    P.box(1.4, 0.25, 1.4, { y: 1.05, z: -0.3, color: KPA_DK }),                                            // the turntable's ring
  ]), 1, 0.35),
  turret: {
    geo: grime(merge([
      P.cyl(0.75, 0.8, 0.3, { y: 0.15, color: KPA }, 14),
      ...pair((s) => P.box(0.12, 0.7, 0.9, { x: s * 0.42, y: 0.55, color: KPA })),                       // the trunnion brackets
    ]), 0.6, 0, 0.3),
    at: [0, 1.2, -0.3],
  },
  gun: {
    geo: merge([
      P.box(0.5, 0.22, 6.6, { y: 0.1, z: 0.6, color: KPA_DK }),                                              // the launch rail
      ...[-2, 0, 2].map((z) => P.box(0.7, 0.08, 0.2, { y: 0.24, z, color: STEEL })),
      P.cyl(0.38, 0.38, 5.4, { y: 0.95, z: 0.7, rx: Math.PI / 2, color: MISSILE }, 14),                      // the body
      P.sphere(0.38, { y: 0.95, z: 3.4, sz: 1.5, color: 0xb8b8a8 }, 14, 8),                                   // the radar nose
      ...pair((s) => planProfile([[s * 0.35, 1.5], [s * 1.25, -0.3], [s * 1.25, -0.75], [s * 0.35, -0.75]], 0.05, { y: 0.92, z: 0.6, color: MISSILE }, 0)), // the mid wings
      ...pair((s) => planProfile([[s * 0.35, 0.2], [s * 0.85, -0.5], [s * 0.85, -0.8], [s * 0.35, -0.8]], 0.04, { y: 0.92, z: -1.4, color: MISSILE }, 0)), // the tailplanes
      sideProfile([[-1.85, 1.3], [-1.2, 1.3], [-1.9, 2.1], [-2.2, 2.1]], 0.05, { color: MISSILE }, 0),     // the fin
      P.cyl(0.3, 0.3, 1.9, { y: 0.45, z: -1.2, rx: Math.PI / 2, color: 0x6a705e }, 12),                    // the booster under the tail…
      P.cone(0.3, 0.4, { y: 0.45, z: -0.05, rx: Math.PI / 2, color: 0x6a705e }, 12),
      ...[0, 1, 2].map((k) => P.box(0.03, 0.5, 0.5, { x: Math.sin(k * 2.1 + 1) * 0.4, y: 0.45 + Math.cos(k * 2.1 + 1) * 0.4, z: -2.0, rz: -(k * 2.1 + 1), color: 0x6a705e })), // …its fins
    ]),
    at: [0, 0.6, 0],
    pitch: 0.14,
  },
  muzzle: [0, 0.95, 4],
  recoil: 0,
  tow: { geo: grime(merge(towTruck({ color: KPA, dark: KPA_DK, length: 7.0, width: 2.5, bonnet: 'round' })), 1, 0.4), hitch: 4.4 },
  marks: merge([P.box(0.02, 0.25, 0.4, { x: 0.82, y: 0.8, z: 1.4 })]),
}));

/** The battery's fire-control radar on its truck (the Chinese Type 352, NATO's Square Tie): a box body on a 6×6, the
 *  slotted antenna turning on the roof. */
export const buildKpaHY2Radar = vehicle(() => {
  const t = truckUnit({ length: 7.2, width: 2.5, color: KPA, dark: KPA_DK, bonnet: 'round', body: 'box', r: 0.55, bodyH: 2.0 });
  const L = t.layout;
  return {
    wheels: wheeled(L.axles, t.track, 0.55),
    hull: grime(merge([
      ...t.parts,
      P.cyl(0.35, 0.45, 0.4, { y: L.top + 0.2, z: (L.rear + L.bodyFront) / 2 - 0.6, color: KPA_DK }, 12), // the antenna's pedestal
      ...pair((s) => P.box(0.3, 0.6, 0.3, { x: s * 1.05, y: 0.55, z: L.rear + 0.4, color: STEEL })),           // the levelling jacks
    ]), 1.0, 0.4),
    spin: {
      geo: merge([
        P.cyl(0.08, 0.1, 0.9, { y: 0.45, color: STEEL }, 8),
        P.box(3.2, 1.0, 0.14, { y: 1.3, z: 0.1, rx: -0.2, color: 0x5e665a }),                                 // the slotted array…
        ...[-1.2, -0.4, 0.4, 1.2].map((x) => P.box(0.04, 0.9, 0.04, { x, y: 1.3, z: 0.2, rx: -0.2, color: 0x2e3428 })), // …its slots
        P.box(0.12, 0.12, 0.9, { y: 0.8, z: 0.45, color: STEEL }),                                            // the feed arm
      ]),
      at: [0, L.top + 0.4, (L.rear + L.bodyFront) / 2 - 0.6],
      rate: 1.4,
      always: true,
    },
    marks: merge([...pair((s) => P.box(0.02, 0.35, 0.35, { x: s * (L.hw + 0.04), y: L.deck + 1.2, z: L.cabRear - 0.8 }))]),
  };
});

// ---------------------------------------------------------------- Norway's NM142 and the KPA's ambulance

/** NM142: the M113 with Hägglunds' armoured TOW turret — a low box on the roof, a TOW launch tube on each side
 *  of it, the sight in the middle (the missiles reloaded from under armour). */
export const buildNoNM142 = vehicle(() => ({
  ...m113Hull([], { color: OD }),
  turret: {
    geo: grime(merge([
      planProfile([[-0.45, 0.65], [0.45, 0.65], [0.62, 0.3], [0.62, -0.65], [-0.62, -0.65], [-0.62, 0.3]], 0.5, { color: OD, ...C }),
      P.cyl(0.24, 0.24, 0.05, { x: 0.25, y: 0.51, z: -0.3, color: OD_DK }, 12),                       // hatch
      ...pair((s) => smoke(s * 0.6, 0.15, 0.3, 3, s * 1.0)).flat(),
    ]), 0.6, 0, 0.4),
    at: [0, 1.85, 0.3],
  },
  gun: {
    geo: merge([
      P.box(0.34, 0.3, 0.35, { color: OD_DK }),                                                         // the sight head
      P.box(0.22, 0.12, 0.03, { y: 0.02, z: 0.18, color: GLASS }),
      ...pair((s) => P.cyl(0.11, 0.11, 1.55, { x: s * 0.78, y: 0.05, z: 0.2, rx: Math.PI / 2, color: OD, ...C }, 12)), // the two TOW tubes
      ...pair((s) => P.box(0.2, 0.08, 0.3, { x: s * 0.68, y: -0.05, z: 0.0, color: STEEL })),         // their trunnions
    ]),
    at: [0, 0.35, 0.45],
    pitch: null,
  },
  muzzle: [0.78, 0.05, 1.0],
  recoil: 0.03,
  marks: merge([P.box(0.02, 0.3, 0.5, { x: 1.39, y: 1.4, z: -0.6 })]),
}));

/** The KPA's field ambulance: the Sungri-58 lorry (the North's own copy of the Soviet GAZ-51) with a box body,
 *  red crosses on its sides and roof. */
export const buildKpaSungriSan = vehicle(() => {
  const t = truckUnit({ length: 5.7, width: 2.25, color: KPA, dark: KPA_DK, bonnet: 'round', body: 'box', r: 0.48, axles: [4.5, 1.15], bodyH: 1.7, cabLen: 1.4 });
  const L = t.layout, mid = (L.rear + L.bodyFront) / 2, y = L.deck + 0.95;
  return {
    wheels: wheeled(L.axles, t.track, 0.48),
    hull: grime(merge([
      ...t.parts,
      ...cross({ x: L.hw + 0.04, y, z: mid }),
      ...cross({ x: -(L.hw + 0.04), y, z: mid }),
      ...cross({ y: L.top + 0.02, z: mid, rz: Math.PI / 2 }),
    ]), 1.1, 0.3),
    muzzle: [0, 2, 0],
  };
});
