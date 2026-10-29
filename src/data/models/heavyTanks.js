// The heavy tanks, each its own model (support.js kit):
//   M1IP Abrams  the improved M1: the longer, flat-faced composite turret with its bustle rack,
//                the 105 mm M68 with bore evacuator, seven road wheels and full skirts, the
//                commander's .50 on the cupola and the loader's M240.
//   T-80B        the gas-turbine Soviet tank: lower and narrower than the T-72, six rubber-rimmed
//                wheels with gaps between and five return rollers, the rubber flaps on the front
//                fenders, the turbine's big rear grille, a smooth cast turret with the 1A33 sight
//                box, smoke dischargers in a band across the front and the 125 mm 2A46 gun.
import * as THREE from 'three';
import { P, part, merge, pair, grime } from '../units/geometry.js';
import { planProfile, trackedHull, castTurret } from './vehicleCommon.js';
import { vehicle, tracked } from './support.js';

const SAND_GREEN = 0x4f5a37;
const NATO_DK = 0x343a2a;
const PACT = 0x4c5835;
const PACT_DK = 0x3a4428;
const STEEL = 0x2b2d28;
const RUBBER = 0x1f201c;
const ERA = 0x55603c;
const GLASS = 0x1a1d1c;
const C = { camo: 1 };

export const buildNatoM1IP = vehicle(() => {
  const g = tracked({ halfWidth: 1.5, length: 5.3, wheels: 7, wheelR: 0.33, sprocket: -1, rollers: 2, trackWidth: 0.62, wheelColor: NATO_DK });
  const skirts = [];
  for (let i = 0; i < 7; i++) skirts.push(...pair((s) => P.box(0.07, 0.72, 0.92, { x: s * 1.86, y: 0.98, z: -3.0 + i * 0.94, color: SAND_GREEN, ...C })));
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      // hull from its sections: belly between the tracks, sponsons over them, the shallow glacis
      trackedHull([[-3.8, 1.38, 0.5], [-3.5, 1.4, 0.45], [2.5, 1.42, 0.45], [3.85, 1.05, 0.62], [3.92, 0.98, 0.85]],
        { belly: 1.18, fender: 1.86, fenderY: 1.3, chamfer: 0.04 }, { color: SAND_GREEN, ...C }),
      ...skirts,
      P.box(2.0, 0.06, 1.6, { y: 1.42, z: -2.8, color: NATO_DK }),                                     // engine deck grille
      P.box(1.6, 0.6, 0.06, { y: 1.05, z: -3.82, color: STEEL }),                                      // turbine exhaust
      P.box(0.55, 0.06, 0.5, { y: 1.4, z: 2.3, color: NATO_DK }),                                      // driver's hatch
    ]), 1.3, 0.3),
    turret: {
      geo: grime(merge([
        // the IP's longer turret front: flat, wedge-faced composite
        planProfile([[-0.85, 2.15], [0.85, 2.15], [1.75, 1.2], [1.8, -1.3], [1.45, -2.0], [-1.45, -2.0], [-1.8, -1.3], [-1.75, 1.2]], 0.82, { color: SAND_GREEN, ...C }),
        P.box(3.2, 0.06, 1.2, { y: 0.5, z: -2.55, color: STEEL }),                                       // bustle rack…
        ...[-1.5, -0.5, 0.5, 1.5].map((x) => P.box(0.05, 0.45, 1.2, { x, y: 0.72, z: -2.55, color: STEEL })),
        P.box(2.6, 0.4, 1.0, { y: 0.75, z: -2.55, color: 0x56583e }),                                    // …loaded with kit
        P.cyl(0.38, 0.42, 0.3, { x: 0.7, y: 0.98, z: -0.4, color: SAND_GREEN }, 14),                    // commander's cupola
        P.box(0.14, 0.16, 0.55, { x: 0.7, y: 1.22, z: -0.2, color: STEEL }),                             // M2 .50
        P.cyl(0.03, 0.03, 1.1, { x: 0.7, y: 1.24, z: 0.5, rx: Math.PI / 2, color: STEEL }, 6),
        P.cyl(0.3, 0.3, 0.06, { x: -0.7, y: 0.86, z: -0.5, color: NATO_DK }, 14),                        // loader's hatch
        P.cyl(0.02, 0.02, 0.9, { x: -0.7, y: 1.0, z: 0.1, rx: Math.PI / 2, color: STEEL }, 6),           // M240…
        P.box(0.07, 0.08, 0.3, { x: -0.7, y: 1.0, z: -0.25, color: STEEL }),                            // …its receiver…
        P.box(0.05, 0.13, 0.05, { x: -0.7, y: 0.93, z: -0.3, color: STEEL }),                           // …on a pintle at the hatch
        P.box(0.5, 0.45, 0.4, { x: 0.65, y: 1.0, z: 0.9, color: NATO_DK }),                              // GPS doghouse
        ...pair((s) => P.box(0.3, 0.25, 0.35, { x: s * 1.55, y: 0.6, z: 1.35, ry: s * 0.5, color: NATO_DK })), // smoke dischargers
        P.box(0.9, 0.62, 0.2, { y: 0.4, z: 2.1, color: SAND_GREEN }),                                    // mantlet
      ]), 0.9, 0, 0.4),
      at: [0, 1.38, 0.2],
    },
    gun: {
      geo: merge([
        P.cyl(0.09, 0.12, 5.4, { z: 2.7, rx: Math.PI / 2, color: SAND_GREEN }, 14),
        P.cyl(0.17, 0.17, 0.7, { z: 3.1, rx: Math.PI / 2, color: NATO_DK }, 14),                        // bore evacuator
        P.cyl(0.11, 0.11, 0.08, { z: 5.38, rx: Math.PI / 2, color: STEEL }, 14),                        // muzzle ring
      ]),
      at: [0, 0.42, 2.1],
      pitch: 0,
    },
    muzzle: [0, 0, 5.5],
    recoil: 0.4,
    marks: merge([...pair((s) => P.box(0.02, 0.3, 0.6, { x: s * 1.79, y: 0.45, z: -0.6 }))]),
  };
});

/** The T-80's cast turret: lower and a little narrower than the T-72's, the same thick cheeks. */
function t80Dome() {
  return castTurret([
    [1.95, 0.42, 0.3], [1.7, 1.08, 0.55], [1.2, 1.5, 0.7], [0.4, 1.6, 0.74],
    [-0.4, 1.55, 0.72], [-1.1, 1.34, 0.6], [-1.55, 0.95, 0.44], [-1.75, 0.42, 0.22],
  ], { color: PACT });
}

export const buildPactT80 = vehicle(() => {
  const g = tracked({ halfWidth: 1.32, length: 4.8, wheels: 6, wheelR: 0.33, sprocket: -1, rollers: 5, trackWidth: 0.55, wheelColor: RUBBER });
  const flaps = [];
  for (let i = 0; i < 5; i++) flaps.push(...pair((s) => P.box(0.04, 0.5, 0.46, { x: s * 1.66, y: 0.95, z: 1.3 + i * 0.47, color: RUBBER })));
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      // the low, narrow hull: belly between the tracks, the fender shelf, the flat upper glacis
      trackedHull([[-3.4, 1.3, 0.5], [-3.1, 1.33, 0.45], [2.3, 1.36, 0.45], [3.4, 0.98, 0.6], [3.5, 0.92, 0.8]],
        { belly: 1.04, fender: 1.67, fenderY: 1.02, chamfer: 0.04 }, { color: PACT }),
      ...pair((s) => P.box(0.05, 0.05, 6.6, { x: s * 1.67, y: 1.02, z: -0.2, color: PACT_DK })),       // fender lips
      ...flaps,                                                                                          // rubber flaps up front
      P.box(1.9, 0.07, 1.4, { y: 1.33, z: -2.5, color: STEEL }),                                       // turbine grille…
      ...[-0.6, -0.2, 0.2, 0.6].map((x) => P.box(0.06, 0.05, 1.35, { x, y: 1.38, z: -2.5, color: PACT_DK })),
      P.box(1.7, 0.4, 0.08, { y: 1.05, z: -3.42, color: STEEL }),                                      // …and the exhaust
      ...pair((s) => P.box(0.45, 0.32, 1.6, { x: s * 1.42, y: 1.25, z: -1.2, color: PACT_DK })),       // fender tanks
      P.cyl(0.12, 0.12, 2.8, { y: 1.45, z: -3.55, rz: Math.PI / 2, color: 0x5a4632 }, 10),             // unditching log
      P.box(0.48, 0.07, 0.42, { y: 1.38, z: 2.1, color: PACT_DK }),                                    // driver's hatch
      // Kontakt-1 bricks over the upper glacis (the T-80BV of 1985), the V splash rib below them
      ...Array.from({ length: 3 }, (_, row) => Array.from({ length: 6 }, (_, col) => {
        const t = (row + 0.5) / 3, z = 2.4 + t * 0.95, y = 1.36 - t * 0.36;
        return P.box(0.34, 0.08, 0.28, { x: -0.88 + col * 0.35, y: y + 0.05, z, rx: Math.atan2(0.38, 1.1), color: ERA });
      })).flat(),
      ...pair((s) => P.box(0.06, 0.05, 0.8, { x: s * 0.35, y: 1.03, z: 3.3, rx: 0.33, ry: s * -0.55, color: PACT_DK })),
      ...pair((s) => P.cyl(0.075, 0.075, 0.1, { x: s * 1.3, y: 1.14, z: 3.05, rx: Math.PI / 2, color: STEEL }, 10)),   // headlights…
      ...pair((s) => P.cyl(0.06, 0.06, 0.02, { x: s * 1.3, y: 1.14, z: 3.11, rx: Math.PI / 2, color: GLASS }, 10)),
      ...pair((s) => P.box(0.2, 0.16, 0.02, { x: s * 1.3, y: 1.16, z: 3.16, color: STEEL })),                      // …and their guards
      ...[-0.12, 0.12].map((x) => P.box(0.12, 0.07, 0.04, { x, y: 1.41, z: 2.32, rx: 0.3, color: GLASS })),       // driver's periscopes
      // rubber side skirts along the rest of the hull, tow cables
      ...pair((s) => P.box(0.04, 0.42, 4.0, { x: s * 1.66, y: 0.9, z: -1.25, color: RUBBER, surf: 'rubber' })),
      ...pair((s) => P.cyl(0.025, 0.025, 3.6, { x: s * 1.18, y: 1.38, z: -0.5, rx: Math.PI / 2, color: STEEL }, 6)),
    ]), 1.2, 0.3),
    turret: {
      geo: grime(merge([
        t80Dome(),
        P.box(0.42, 0.42, 0.55, { x: -0.6, y: 0.85, z: 0.5, color: PACT_DK }),                          // 1A33 sight box
        P.cyl(0.35, 0.38, 0.25, { x: 0.6, y: 0.82, z: -0.3, color: PACT }, 14),                         // commander's cupola
        P.box(0.12, 0.14, 0.4, { x: 0.6, y: 1.02, z: -0.1, color: STEEL }),                             // NSVT
        P.cyl(0.025, 0.025, 1.0, { x: 0.6, y: 1.04, z: 0.5, rx: Math.PI / 2, color: STEEL }, 6),
        ...[-0.9, -0.7, -0.5, 0.5, 0.7, 0.9].map((a) => P.cyl(0.06, 0.06, 0.35, { x: Math.sin(a) * 1.45, y: 0.5, z: Math.cos(a) * 1.65, rx: Math.PI / 2 - 0.4, ry: a, color: PACT_DK }, 8)), // smoke band
        P.box(1.6, 0.35, 0.5, { y: 0.32, z: -1.65, color: PACT_DK }),                                   // rear stowage
        // Kontakt-1 round the turret front, stowage boxes on the sides, the snorkel, IR searchlight
        // bricks along the cheeks either side of the gun, following the turret's front contour
        ...pair((s) => [0.55, 0.8, 1.05, 1.3].map((x) => {
          const z = x < 1.08 ? 1.95 - ((x - 0.42) / 0.66) * 0.25 : 1.7 - ((x - 1.08) / 0.42) * 0.5;
          const slope = x < 1.08 ? 0.25 / 0.66 : 0.5 / 0.42;
          return P.box(0.3, 0.22, 0.2, { x: s * x, y: 0.4, z: z + 0.08, ry: s * Math.atan(slope), color: ERA });
        })).flat(),
        ...pair((s) => P.box(0.28, 0.3, 0.8, { x: s * 1.42, y: 0.3, z: -0.95, ry: -s * 0.4, color: PACT_DK })),
        P.cyl(0.08, 0.08, 1.8, { x: -0.9, y: 0.5, z: -1.55, rz: Math.PI / 2, ry: 0.35, color: PACT_DK }, 8),
        P.cyl(0.16, 0.16, 0.3, { x: 0.55, y: 0.6, z: 1.3, rx: Math.PI / 2, color: STEEL }, 12),
        P.cyl(0.13, 0.13, 0.02, { x: 0.55, y: 0.6, z: 1.46, rx: Math.PI / 2, color: 0x2a2232 }, 12),
        ...[0, 1, 2, 3].map((k) => P.box(0.09, 0.06, 0.03, { x: 0.6 + Math.sin(k * 0.6 - 0.9) * 0.36, y: 0.92, z: -0.3 + Math.cos(k * 0.6 - 0.9) * 0.36, ry: k * 0.6 - 0.9, color: GLASS })), // cupola periscopes
        P.box(0.3, 0.16, 0.02, { x: -0.6, y: 0.9, z: 0.78, color: GLASS }),                             // sight window
        P.box(0.75, 0.48, 0.4, { y: 0.4, z: 1.75, color: PACT }),                                       // mantlet
      ]), 0.9, 0, 0.4),
      at: [0, 1.36, 0.15],
    },
    gun: {
      geo: merge([
        P.cyl(0.1, 0.13, 5.5, { z: 2.75, rx: Math.PI / 2, color: PACT }, 14),
        ...[0.8, 1.6, 3.4, 4.3].map((z) => P.cyl(0.15, 0.15, 0.65, { z, rx: Math.PI / 2, color: PACT_DK }, 14)), // thermal sleeve
        P.cyl(0.18, 0.18, 0.5, { z: 2.45, rx: Math.PI / 2, color: PACT }, 14),                         // fume extractor
      ]),
      at: [0, 0.42, 1.8],
      pitch: 0,
    },
    muzzle: [0, 0, 5.6],
    recoil: 0.4,
    marks: merge([...pair((s) => P.cyl(0.17, 0.17, 0.02, { x: s * 1.69, y: 0.92, z: -0.6, rz: Math.PI / 2 }, 5))]),
  };
});
