// The armour of the two second armies (support.js vehicle kit; contract in render/RigRenderer.js):
//   Leopard 1A5   Bundeswehr: the slim hull with its wedge nose, the welded 1A5 turret with the
//                 spaced add-on armour in a wedge front, the 105 mm L7A3 in its thermal sleeve,
//                 seven road wheels, four return rollers, steel skirts with their wavy edge.
//   Leopard 2A4   the flat-faced, vertical-sided turret, the EMES 15 sight box, PERI periscope,
//                 the 120 mm Rh-120 with thermal sleeve and fume extractor, a big wide hull.
//   Marder 1A3    the tall boxy infantry fighting vehicle: the small two-man turret with the 20 mm
//                 Rh 202 on its roof and a Milan launcher beside it, add-on armour on the sides.
//   T-55AM2       NVA: the rounded T-55 turret with the "eyebrow" BDD armour on its front, the
//                 laser rangefinder over the 100 mm D-10T, five big road wheels, rubber skirts.
//   BMP-1         the low prow-nosed carrier: the ribbed glacis, the small cone turret with the
//                 73 mm 2A28 and the Malyutka missile on its rail, six small road wheels.
import { P, merge, pair, grime } from '../units/geometry.js';
import { planProfile, trackedHull, castTurret } from './vehicleCommon.js';
import { vehicle, tracked } from './support.js';

const BW = 0x46503a;       // Bundeswehr: bronze green base (the three-tone camo is the material's)
const BW_DK = 0x343a2a;
const NVA = 0x4a5636;      // NVA: plain dark olive
const NVA_DK = 0x37422a;
const STEEL = 0x2b2d28;
const RUBBER = 0x1f201c;
const GLASS = 0x1a1d1c;
const WOOD = 0x5a4632;
const C = { camo: 1 };

const smoke = (x, y, z, n, ry) => Array.from({ length: n }, (_, k) => P.cyl(0.045, 0.045, 0.24, { x, y: y + k * 0.09, z, rx: -0.7, ry, color: STEEL }, 8));

// ---------------------------------------------------------------- Bundeswehr

export const buildBwLeopard1 = vehicle(() => {
  const g = tracked({ halfWidth: 1.35, length: 5.0, wheels: 7, wheelR: 0.35, sprocket: -1, rollers: 4, trackWidth: 0.55, wheelColor: BW_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.55, 1.3, 0.55], [-3.3, 1.35, 0.45], [2.2, 1.38, 0.45], [3.45, 1.0, 0.5], [3.55, 0.78, 0.78]],
        { belly: 1.12, fender: 1.66, fenderY: 1.1, chamfer: 0.04 }, { color: BW, ...C }),
      // steel skirts with the wavy lower edge, in panels
      ...Array.from({ length: 6 }, (_, i) => pair((s) => P.box(0.05, 0.5 - (i % 2) * 0.06, 1.02, { x: s * 1.68, y: 0.96 + (i % 2) * 0.03, z: -2.7 + i * 1.03, color: BW, ...C }))).flat(),
      P.box(1.9, 0.06, 1.5, { y: 1.36, z: -2.5, color: BW_DK }),                                        // engine deck
      ...[-3.0, -2.7, -2.4, -2.1].map((z) => P.box(1.8, 0.03, 0.06, { y: 1.4, z, color: STEEL })),
      ...pair((s) => P.cyl(0.07, 0.07, 0.1, { x: s * 1.25, y: 1.15, z: 3.1, rx: Math.PI / 2, color: STEEL }, 10)), // headlights
      P.box(0.5, 0.06, 0.45, { x: -0.55, y: 1.39, z: 2.0, color: BW_DK }),                               // driver's hatch (left)
      ...pair((s) => P.cyl(0.025, 0.025, 3.4, { x: s * 1.3, y: 1.38, z: -0.4, rx: Math.PI / 2, color: STEEL }, 6)), // tow cables
    ]), 1.2, 0.3),
    turret: {
      geo: grime(merge([
        // the 1A5's welded turret: the spaced armour comes to a wedge in front
        planProfile([[-0.25, 2.1], [0.25, 2.1], [1.55, 0.95], [1.6, -1.35], [1.25, -2.0], [-1.25, -2.0], [-1.6, -1.35], [-1.55, 0.95]], 0.78, { color: BW, ...C }),
        P.box(0.5, 0.42, 0.55, { x: -0.7, y: 0.95, z: 0.6, color: BW_DK }),                              // EMES 18 sight
        P.box(0.3, 0.14, 0.02, { x: -0.7, y: 0.98, z: 0.88, color: GLASS }),
        P.cyl(0.32, 0.35, 0.22, { x: 0.65, y: 0.88, z: -0.45, color: BW }, 14),                          // commander's cupola
        P.cyl(0.11, 0.11, 0.3, { x: 0.65, y: 1.1, z: -0.2, color: BW_DK }, 10),                          // PERI R12
        P.cyl(0.3, 0.3, 0.05, { x: -0.65, y: 0.81, z: -0.5, color: BW_DK }, 14),                         // loader's hatch…
        P.box(0.07, 0.08, 0.35, { x: -0.65, y: 0.98, z: -0.25, color: STEEL }),                          // …and its MG3
        P.cyl(0.02, 0.02, 0.7, { x: -0.65, y: 0.98, z: 0.25, rx: Math.PI / 2, color: STEEL }, 6),
        ...pair((s) => smoke(s * 1.5, 0.35, -0.9, 4, s * 1.2)).flat(),                                   // smoke dischargers on the sides
        P.box(2.6, 0.06, 0.9, { y: 0.45, z: -2.35, color: STEEL }),                                      // rear stowage basket
        P.box(2.3, 0.35, 0.8, { y: 0.66, z: -2.35, color: 0x575a40 }),
        P.box(0.8, 0.55, 0.3, { y: 0.4, z: 2.0, color: BW }),                                            // mantlet
      ]), 0.9, 0, 0.4),
      at: [0, 1.38, -0.1],
    },
    gun: {
      geo: merge([
        P.cyl(0.075, 0.1, 5.5, { z: 2.75, rx: Math.PI / 2, color: BW }, 14),
        ...[0.7, 1.4, 3.6, 4.4].map((z) => P.cyl(0.13, 0.13, 0.62, { z, rx: Math.PI / 2, color: BW_DK }, 14)), // thermal sleeve
        P.cyl(0.16, 0.16, 0.6, { z: 2.6, rx: Math.PI / 2, color: BW }, 14),                              // bore evacuator
      ]).scale(1, 1, 0.74),
      at: [0, 0.4, 2.0],
      pitch: 0,
    },
    muzzle: [0, 0, 4.1],
    recoil: 0.4,
    marks: merge([...pair((s) => P.box(0.02, 0.32, 0.32, { x: s * 1.69, y: 1.2, z: 0.9 }))]),             // the Iron Cross on the skirts
  };
});

export const buildBwLeopard2 = vehicle(() => {
  const g = tracked({ halfWidth: 1.55, length: 5.5, wheels: 7, wheelR: 0.35, sprocket: -1, rollers: 4, trackWidth: 0.63, wheelColor: BW_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.85, 1.42, 0.55], [-3.6, 1.45, 0.45], [2.6, 1.48, 0.45], [3.85, 1.12, 0.55], [3.95, 0.9, 0.85]],
        { belly: 1.25, fender: 1.88, fenderY: 1.25, chamfer: 0.04 }, { color: BW, ...C }),
      // skirts: the heavy armoured panels in front, lighter ones behind
      ...Array.from({ length: 7 }, (_, i) => pair((s) => P.box(i < 2 ? 0.1 : 0.06, 0.66, 0.94, { x: s * (i < 2 ? 1.9 : 1.88), y: 1.0, z: 2.85 - i * 0.95, color: BW, ...C }))).flat(),
      P.box(2.2, 0.06, 1.7, { y: 1.47, z: -2.75, color: BW_DK }),                                       // engine deck
      ...[-3.4, -3.1, -2.8, -2.5, -2.2].map((z) => P.box(2.1, 0.03, 0.06, { y: 1.51, z, color: STEEL })),
      P.box(0.5, 0.06, 0.45, { x: -0.6, y: 1.5, z: 2.3, color: BW_DK }),                                 // driver's hatch
      ...pair((s) => P.cyl(0.07, 0.07, 0.1, { x: s * 1.45, y: 1.25, z: 3.45, rx: Math.PI / 2, color: STEEL }, 10)),
    ]), 1.3, 0.3),
    turret: {
      geo: grime(merge([
        // flat, vertical faces: the 2A4's slab-sided turret, the long bustle behind
        planProfile([[-1.05, 1.95], [1.05, 1.95], [1.75, 1.5], [1.78, -1.7], [1.45, -2.3], [-1.45, -2.3], [-1.78, -1.7], [-1.75, 1.5]], 0.86, { color: BW, ...C }),
        P.box(0.62, 0.5, 0.6, { x: -0.85, y: 1.02, z: 1.15, color: BW }),                                // EMES 15 sight box
        P.box(0.4, 0.18, 0.02, { x: -0.85, y: 1.05, z: 1.46, color: GLASS }),
        P.cyl(0.34, 0.36, 0.2, { x: 0.7, y: 0.95, z: -0.45, color: BW }, 14),                            // commander's hatch
        P.cyl(0.14, 0.14, 0.42, { x: 0.85, y: 1.22, z: 0.0, color: BW_DK }, 10),                         // PERI R17…
        P.box(0.26, 0.2, 0.28, { x: 0.85, y: 1.5, z: 0.0, color: BW_DK }),                               // …its head
        P.cyl(0.3, 0.3, 0.05, { x: -0.7, y: 0.88, z: -0.6, color: BW_DK }, 14),                          // loader's hatch…
        P.box(0.07, 0.08, 0.35, { x: -0.7, y: 0.95, z: -0.35, color: STEEL }),                           // …and its MG3
        P.cyl(0.02, 0.02, 0.7, { x: -0.7, y: 0.95, z: 0.15, rx: Math.PI / 2, color: STEEL }, 6),
        ...pair((s) => smoke(s * 1.7, 0.4, -1.4, 4, s * 1.4)).flat(),
        ...pair((s) => smoke(s * 1.75, 0.4, -1.7, 4, s * 1.4)).flat(),
        P.box(3.0, 0.06, 0.8, { y: 0.5, z: -2.7, color: STEEL }),                                        // bustle basket
        P.box(2.7, 0.35, 0.7, { y: 0.7, z: -2.7, color: 0x575a40 }),
        P.box(0.9, 0.62, 0.25, { y: 0.42, z: 2.0, color: BW }),                                          // gun mantlet
      ]), 0.9, 0, 0.4),
      at: [0, 1.48, 0.0],
    },
    gun: {
      geo: merge([
        P.cyl(0.095, 0.12, 5.6, { z: 2.8, rx: Math.PI / 2, color: BW }, 14),
        ...[0.8, 1.6, 3.5, 4.3].map((z) => P.cyl(0.15, 0.15, 0.62, { z, rx: Math.PI / 2, color: BW_DK }, 14)),
        P.cyl(0.18, 0.18, 0.55, { z: 2.55, rx: Math.PI / 2, color: BW }, 14),                            // fume extractor
        P.box(0.08, 0.06, 0.12, { y: 0.16, z: 5.4, color: STEEL }),                                       // muzzle reference sensor
      ]).scale(1, 1, 0.74),
      at: [0, 0.42, 2.05],
      pitch: 0,
    },
    muzzle: [0, 0, 4.15],
    recoil: 0.42,
    marks: merge([...pair((s) => P.box(0.02, 0.34, 0.34, { x: s * 1.92, y: 1.2, z: 1.0 }))]),
  };
});

export const buildBwMarder = vehicle(() => {
  const g = tracked({ halfWidth: 1.4, length: 4.9, wheels: 6, wheelR: 0.35, sprocket: 1, rollers: 3, trackWidth: 0.45, wheelColor: BW_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      // the tall box: a steep nose, a long roof, the rear ramp
      trackedHull([[-3.35, 1.85, 0.5], [-3.15, 1.92, 0.45], [1.3, 1.92, 0.45], [2.85, 1.3, 0.5], [3.35, 0.95, 0.8]],
        { belly: 1.18, fender: 1.7, fenderY: 1.1, chamfer: 0.06 }, { color: BW, ...C }),
      ...[-2.4, -1.4, -0.4, 0.6].map((z) => pair((s) => P.box(0.08, 0.6, 0.92, { x: s * 1.74, y: 1.42, z, color: BW, ...C }))).flat(), // 1A3 add-on armour
      ...Array.from({ length: 5 }, (_, i) => pair((s) => P.box(0.05, 0.42, 0.98, { x: s * 1.72, y: 0.92, z: -2.3 + i * 1.0, color: RUBBER, surf: 'rubber' }))).flat(),
      P.box(1.6, 1.0, 0.08, { y: 1.3, z: -3.38, color: BW_DK }),                                        // the rear ramp
      ...pair((s) => P.cyl(0.25, 0.25, 0.06, { x: s * 0.9, y: 1.96, z: -1.5, color: BW_DK }, 12)),      // roof hatches
      P.box(0.5, 0.06, 0.45, { x: -0.65, y: 1.93, z: 1.2, color: BW_DK }),                              // driver's hatch
      ...[-0.2, 0, 0.2].map((x) => P.box(0.12, 0.08, 0.05, { x: -0.65 + x, y: 1.97, z: 1.47, rx: -0.3, color: GLASS })), // his periscopes
      ...pair((s) => P.cyl(0.06, 0.06, 0.1, { x: s * 1.2, y: 1.1, z: 3.1, rx: Math.PI / 2, color: STEEL }, 10)),
      // the headlights in their guards and the convoy lights on the glacis, tow hooks under the nose, mud flaps
      ...pair((s) => P.box(0.26, 0.18, 0.14, { x: s * 1.18, y: 1.33, z: 2.92, rx: 0.4, color: STEEL })),
      ...pair((s) => P.box(0.16, 0.1, 0.02, { x: s * 1.18, y: 1.35, z: 3.0, rx: 0.4, color: GLASS })),
      ...pair((s) => P.box(0.3, 0.24, 0.03, { x: s * 1.18, y: 1.4, z: 3.02, rx: 0.4, color: STEEL })),
      ...pair((s) => P.box(0.14, 0.14, 0.2, { x: s * 0.75, y: 0.78, z: 3.36, color: STEEL })),
      ...pair((s) => P.box(0.42, 0.34, 0.03, { x: s * 1.5, y: 0.86, z: 3.0, color: RUBBER, surf: 'rubber' })),
      // the engine's air grilles on the right of the glacis (the Marder's engine is at the front)
      ...Array.from({ length: 6 }, (_, k) => P.box(0.95, 0.03, 0.07, { x: 0.62, y: 1.92 - (1.45 + k * 0.17 - 1.3) * 0.4 + 0.03, z: 1.45 + k * 0.17, rx: 0.38, color: BW_DK })),
      // periscopes along the troop compartment's roof edges, the antennas' feet and whips at the back
      ...[-2.7, -2.15, -1.6, -1.05, -0.5].map((z) => pair((s) => P.box(0.16, 0.09, 0.1, { x: s * 1.28, y: 1.96, z, ry: s * 0.25, color: GLASS }))).flat(),
      ...pair((s) => P.cyl(0.08, 0.1, 0.12, { x: s * 1.15, y: 1.98, z: -2.95, color: STEEL }, 10)),
      ...pair((s) => P.cyl(0.006, 0.006, 2.4, { x: s * 1.15, y: 3.2, z: -2.95, color: STEEL }, 4)),
      // the ramp's hinges, handle and lights; jerrycans in their racks either side of it
      ...[-0.6, 0.6].map((x) => P.box(0.2, 0.1, 0.1, { x, y: 0.82, z: -3.42, color: STEEL })),
      P.box(0.5, 0.06, 0.06, { y: 1.45, z: -3.43, color: STEEL }),
      ...pair((s) => P.box(0.12, 0.1, 0.04, { x: s * 1.1, y: 1.65, z: -3.4, color: 0x5a1a14 })),
      ...pair((s) => P.box(0.36, 0.48, 0.14, { x: s * 1.18, y: 1.25, z: -3.44, color: 0x4a4e36 })),
      ...pair((s) => P.box(0.4, 0.06, 0.16, { x: s * 1.18, y: 1.0, z: -3.44, color: STEEL })),
    ]), 1.3, 0.3),
    turret: {
      geo: grime(merge([
        planProfile([[-0.5, 0.75], [0.5, 0.75], [0.8, 0.3], [0.8, -0.7], [-0.8, -0.7], [-0.8, 0.3]], 0.42, { color: BW, ...C }),
        P.box(0.3, 0.3, 0.6, { x: 0.0, y: 0.55, z: 0.1, color: BW_DK }),                                 // the cannon's housing on the roof
        // Milan on its bracket on the right
        P.cyl(0.07, 0.07, 1.2, { x: 0.75, y: 0.75, z: 0.2, rx: Math.PI / 2, color: 0x56603e }, 10),
        P.box(0.16, 0.3, 0.2, { x: 0.62, y: 0.55, z: -0.15, color: BW_DK }),                             // its bracket on the roof
        ...pair((s) => smoke(s * 0.82, 0.18, 0.5, 3, s * 0.6)).flat(),
        P.cyl(0.24, 0.24, 0.05, { x: -0.45, y: 0.44, z: -0.35, color: BW_DK }, 12),                      // commander's hatch
        ...[0, 1, 2, 3, 4].map((k) => P.box(0.1, 0.07, 0.04, { x: -0.45 + Math.sin(k * 0.7 - 1.4) * 0.3, y: 0.46, z: -0.35 + Math.cos(k * 0.7 - 1.4) * 0.3, ry: k * 0.7 - 1.4, color: GLASS })), // its periscopes
        P.box(0.26, 0.32, 0.3, { x: -0.5, y: 0.6, z: 0.3, color: BW_DK }),                                // the PERI Z11 sight head…
        P.box(0.2, 0.14, 0.02, { x: -0.5, y: 0.66, z: 0.46, color: GLASS }),                              // …its window
        P.cyl(0.13, 0.13, 0.2, { x: 0.28, y: 0.6, z: 0.42, rx: Math.PI / 2, color: STEEL }, 12),          // the searchlight beside the cannon
        P.cyl(0.11, 0.11, 0.02, { x: 0.28, y: 0.6, z: 0.53, rx: Math.PI / 2, color: GLASS }, 12),
        P.box(1.4, 0.28, 0.36, { y: 0.25, z: -0.88, color: BW_DK }),                                     // the stowage basket on the turret's back
        ...[-0.6, 0, 0.6].map((x) => P.box(0.04, 0.32, 0.04, { x, y: 0.27, z: -1.06, color: STEEL })),
      ]), 0.6, 0, 0.4),
      at: [0, 1.92, 0.4],
    },
    gun: {
      geo: merge([
        P.cyl(0.03, 0.035, 1.9, { z: 0.95, rx: Math.PI / 2, color: STEEL }, 10),                          // Rh 202 20 mm
        P.cyl(0.05, 0.045, 0.16, { z: 1.9, rx: Math.PI / 2, color: STEEL }, 10),
      ]),
      at: [0, 0.6, 0.4],
      pitch: 0,
    },
    muzzle: [0, 0, 2.0],
    recoil: 0.08,
    marks: merge([...pair((s) => P.box(0.02, 0.3, 0.3, { x: s * 1.79, y: 1.45, z: 0.6 }))]),
  };
});

// ---------------------------------------------------------------- NVA

export const buildNvaT55 = vehicle(() => {
  const g = tracked({ halfWidth: 1.35, length: 4.6, wheels: 5, wheelR: 0.41, sprocket: -1, rollers: 0, trackWidth: 0.58, wheelColor: NVA_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.1, 1.28, 0.55], [-2.9, 1.33, 0.45], [2.0, 1.36, 0.45], [3.0, 1.0, 0.6], [3.12, 0.84, 0.84]],
        { belly: 1.1, fender: 1.62, fenderY: 1.05, chamfer: 0.04 }, { color: NVA }),
      ...Array.from({ length: 5 }, (_, i) => pair((s) => P.box(0.04, 0.4, 0.98, { x: s * 1.64, y: 0.9, z: -2.4 + i * 1.0, color: RUBBER, surf: 'rubber' }))).flat(), // AM2 rubber skirts
      ...pair((s) => P.cyl(0.3, 0.3, 0.95, { x: s * 0.7, y: 1.6, z: -2.95, rz: Math.PI / 2, color: NVA_DK }, 14)), // fuel drums at the rear
      P.cyl(0.14, 0.14, 2.9, { y: 1.5, z: -3.3, rz: Math.PI / 2, color: WOOD }, 10),                    // unditching log
      ...[0.4, 1.0, 1.6].map((z) => P.box(0.42, 0.3, 0.5, { x: 1.4, y: 1.2, z: -z, color: NVA_DK })),   // fender tanks
      P.box(1.7, 0.05, 1.2, { y: 1.34, z: -2.15, color: NVA_DK }),                                     // engine deck
      ...pair((s) => P.cyl(0.07, 0.07, 0.1, { x: s * 1.25, y: 1.12, z: 2.9, rx: Math.PI / 2, color: STEEL }, 10)),
      P.box(0.45, 0.06, 0.4, { x: -0.6, y: 1.37, z: 1.9, color: NVA_DK }),
    ]), 1.2, 0.3),
    turret: {
      geo: grime(merge([
        // the round T-55 dome, higher than the T-72's
        castTurret([[1.5, 0.38, 0.32], [1.35, 0.95, 0.62], [0.95, 1.3, 0.82], [0.3, 1.38, 0.9], [-0.35, 1.35, 0.88], [-0.95, 1.2, 0.76], [-1.35, 0.9, 0.56], [-1.5, 0.38, 0.26]], { color: NVA }),
        // BDD "eyebrows": the horseshoe blocks either side of the gun
        ...pair((s) => P.box(0.7, 0.42, 0.42, { x: s * 0.62, y: 0.42, z: 1.3, ry: s * -0.45, color: NVA })),
        P.box(0.4, 0.22, 0.3, { y: 0.92, z: 1.0, color: NVA_DK }),                                        // KTD-2 laser rangefinder over the gun
        P.cyl(0.33, 0.36, 0.22, { x: -0.55, y: 0.92, z: -0.25, color: NVA }, 14),                        // commander's cupola
        P.cyl(0.3, 0.3, 0.05, { x: 0.55, y: 0.92, z: -0.3, color: NVA_DK }, 14),                         // loader's hatch…
        P.box(0.12, 0.14, 0.4, { x: 0.55, y: 1.0, z: -0.1, color: STEEL }),                              // …and the DShK
        P.cyl(0.025, 0.025, 1.0, { x: 0.55, y: 1.02, z: 0.5, rx: Math.PI / 2, color: STEEL }, 6),
        P.cyl(0.15, 0.15, 0.28, { x: 0.65, y: 0.62, z: 1.05, rx: Math.PI / 2, color: STEEL }, 12),       // IR searchlight
        ...pair((s) => smoke(s * 1.1, 0.5, 0.8, 4, s * 0.8)).flat(),                                      // 902B smoke launchers
        P.box(1.2, 0.3, 0.45, { y: 0.3, z: -1.45, color: NVA_DK }),                                     // rear stowage
        P.box(0.6, 0.42, 0.3, { y: 0.4, z: 1.5, color: NVA }),                                           // mantlet
      ]), 0.9, 0, 0.4),
      at: [0, 1.36, 0.5],
    },
    gun: {
      geo: merge([
        P.cyl(0.075, 0.1, 5.3, { z: 2.65, rx: Math.PI / 2, color: NVA }, 14),
        P.cyl(0.14, 0.14, 0.5, { z: 4.6, rx: Math.PI / 2, color: NVA }, 14),                             // the D-10T's fume extractor, near the muzzle
        ...[1.2, 2.6].map((z) => P.cyl(0.12, 0.12, 0.7, { z, rx: Math.PI / 2, color: NVA_DK }, 14)),     // thermal sleeve
      ]).scale(1, 1, 0.72),
      at: [0, 0.42, 1.55],
      pitch: 0,
    },
    muzzle: [0, 0, 3.85],
    recoil: 0.38,
    marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.64, y: 1.2, z: 0.6 }))]), // tactical numbers on the hull sides
  };
});

export const buildNvaBMP1 = vehicle(() => {
  const g = tracked({ halfWidth: 1.25, length: 4.6, wheels: 6, wheelR: 0.3, sprocket: 1, rollers: 3, trackWidth: 0.3, wheelColor: NVA_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      // the low boat hull: the long ribbed glacis to a sharp prow, the sloped roof over the troop bay
      trackedHull([[-3.35, 1.55, 0.45], [-3.15, 1.62, 0.4], [0.5, 1.65, 0.4], [2.4, 1.12, 0.45], [3.38, 0.72, 0.62]],
        { belly: 1.0, fender: 1.5, fenderY: 0.98, chamfer: 0.12 }, { color: NVA }),
      ...[1.0, 1.4, 1.8, 2.2].map((z) => P.box(1.9, 0.04, 0.05, { y: 1.65 - (z - 0.5) * 0.28 + 0.03, z, rx: 0.27, color: NVA_DK })), // glacis ribs
      ...pair((s) => P.box(0.06, 0.8, 0.6, { x: s * 0.5, y: 1.1, z: -3.37, color: NVA_DK })),           // rear doors (the fuel tanks inside)
      ...[-2.6, -1.9, -1.2].map((z) => pair((s) => P.cyl(0.22, 0.22, 0.05, { x: s * 0.6, y: 1.66, z, color: NVA_DK }, 12))).flat(), // the troop hatches
      ...[-2.8, -2.2, -1.6, -1.0].map((z) => pair((s) => P.cyl(0.03, 0.03, 0.06, { x: s * 1.42, y: 1.35, z, rz: Math.PI / 2, color: STEEL }, 6))).flat(), // firing ports
      P.box(0.45, 0.06, 0.4, { x: -0.55, y: 1.5, z: 1.2, color: NVA_DK }),                              // driver's hatch
      ...pair((s) => P.cyl(0.06, 0.06, 0.1, { x: s * 1.05, y: 1.05, z: 2.8, rx: Math.PI / 2, color: STEEL }, 10)),
    ]), 1.1, 0.3),
    turret: {
      geo: grime(merge([
        castTurret([[0.75, 0.3, 0.2], [0.6, 0.7, 0.4], [0.2, 0.85, 0.5], [-0.3, 0.82, 0.48], [-0.7, 0.6, 0.36], [-0.85, 0.3, 0.18]], { color: NVA }, 2.2),
        P.cyl(0.18, 0.18, 0.05, { x: -0.3, y: 0.49, z: -0.25, color: NVA_DK }, 12),                      // gunner's hatch
        P.box(0.04, 0.04, 0.9, { y: 0.62, z: 0.55, color: STEEL }),                                       // the missile rail over the gun…
        P.cyl(0.07, 0.06, 0.8, { y: 0.7, z: 0.6, rx: Math.PI / 2, color: 0x5a6444 }, 10),                // …the Malyutka on it
        P.cyl(0.07, 0.02, 0.16, { y: 0.7, z: 1.08, rx: Math.PI / 2, color: 0x5a6444 }, 10),
        ...[0, 1, 2, 3].map((k) => P.box(0.01, 0.2, 0.12, { x: Math.sin(k * 1.57) * 0.08, y: 0.7 + Math.cos(k * 1.57) * 0.08, z: 0.25, rz: k * 1.57, color: 0x5a6444 })), // its folded fins
        P.cyl(0.08, 0.08, 0.2, { x: 0.3, y: 0.36, z: 0.6, rx: Math.PI / 2, color: STEEL }, 10),          // IR light
      ]), 0.5, 0, 0.4),
      at: [0, 1.62, 0.2],
    },
    gun: {
      geo: merge([
        P.cyl(0.05, 0.06, 2.0, { z: 1.0, rx: Math.PI / 2, color: STEEL }, 12),                            // 2A28 Grom, 73 mm
        P.cyl(0.075, 0.075, 0.12, { z: 0.2, rx: Math.PI / 2, color: NVA_DK }, 12),
      ]),
      at: [0, 0.32, 0.6],
      pitch: 0,
    },
    muzzle: [0, 0, 2.05],
    recoil: 0.12,
    marks: merge([...pair((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.52, y: 1.3, z: -1.2 }))]),
  };
});
