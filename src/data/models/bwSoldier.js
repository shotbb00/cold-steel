// Bundeswehr infantryman, mid-1980s: the plain olive moleskin field uniform (Flecktarn only came
// in 1990), the M1-shaped Stahlhelm M62 with its net, the Koppeltragegestell — belt and Y straps,
// two G3 magazine pouches in front, the gas-mask bag on the left hip, canteen, Klappspaten and the
// small Sturmgepäck on the back. A blue armband and a black-red-gold flag on the left sleeve.
// Weapon variants: G3 rifle, MG3, Panzerfaust 44 "Lanze", 120 mm Mörser, Fliegerfaust 1 (Redeye),
// G3SG/1 with its scope, MP2 (Uzi) for crews. Crews wear the black beret with a headset; Fernspäher
// the soft field cap and binoculars; Fallschirmjäger the maroon beret. Same model contract as
// natoSoldier.js (render/StackRenderer.js).
import { P, merge, pair, grime, loft, limb } from '../units/geometry.js';
import { FACTIONS } from '../factions.js';
import { head, trunk, arms as armsHold, thigh as thighPart, shin as shinPart, helmet, binoculars, finish } from './soldierBody.js';

const OLIV = 0x5a5c3b;     // moleskin "oliv", greyer than US olive drab
const OLIV_DK = 0x484a30;
const WEB = 0x55573a;
const LEATHER = 0x2a2018;
const BLACK = 0x161616;
const STEEL = 0x2a2a2a;
const HELMET = 0x4e5236;
const NET = 0x3c3e28;

function weapon(kind) {
  switch (kind) {
    case 'mg': // MG3: the perforated barrel jacket, bipod, the 50-round belt drum
      return {
        parts: [
          P.box(0.06, 0.11, 0.42, { x: 0.2, y: 1.29, z: 0.3, color: BLACK }),                                    // receiver
          P.cyl(0.032, 0.032, 0.5, { x: 0.2, y: 1.31, z: 0.76, rx: Math.PI / 2, color: STEEL }, 8),              // barrel jacket…
          ...[0.6, 0.7, 0.8, 0.9].map((z) => P.box(0.066, 0.018, 0.04, { x: 0.2, y: 1.31, z, color: 0x111111 })), // …its cooling slots
          P.cyl(0.03, 0.022, 0.07, { x: 0.2, y: 1.31, z: 1.05, rx: Math.PI / 2, color: BLACK }, 8),             // muzzle booster
          loft([[0.2, 1.27, 0.08, 0.022, 0.045, 3], [0.2, 1.26, -0.08, 0.024, 0.06, 3.4], [0.2, 1.26, -0.12, 0.024, 0.06, 3]], { color: BLACK }, 8), // stock
          P.box(0.03, 0.09, 0.04, { x: 0.2, y: 1.21, z: 0.17, rx: 0.4, color: BLACK }),                          // grip
          P.cyl(0.06, 0.06, 0.07, { x: 0.12, y: 1.25, z: 0.3, rz: Math.PI / 2, color: OLIV_DK }, 12),            // belt drum
          ...pair((s) => P.box(0.014, 0.014, 0.3, { x: 0.2 + s * 0.05, y: 1.21, z: 0.95, rx: 0.9, color: STEEL })), // bipod folded forward
        ],
        muzzle: { x: 0.2, y: 1.31, z: 1.1 },
      };
    case 'at': // Panzerfaust 44 "Lanze": a short launcher tube, the fat rocket sticking out in front
      return {
        parts: [
          P.cyl(0.035, 0.035, 0.9, { x: 0.17, y: 1.56, z: 0.12, rx: Math.PI / 2, color: OLIV_DK }, 10),
          loft([[0.17, 1.56, 0.56, 0.04, 0.04], [0.17, 1.56, 0.62, 0.066, 0.066], [0.17, 1.56, 0.76, 0.066, 0.066], [0.17, 1.56, 0.86, 0.03, 0.03], [0.17, 1.56, 0.9, 0.01, 0.01]], { color: 0x3f4632 }, 12), // the warhead
          P.box(0.04, 0.12, 0.05, { x: 0.17, y: 1.47, z: 0.25, color: BLACK }),                                   // grip and trigger
          P.box(0.05, 0.06, 0.1, { x: 0.1, y: 1.62, z: 0.2, color: BLACK }),                                      // sight
          P.box(0.05, 0.1, 0.04, { x: 0.17, y: 1.49, z: -0.05, color: BLACK }),                                   // shoulder rest
        ],
        muzzle: { x: 0.17, y: 1.56, z: 0.9 },
      };
    case 'mortar': // Mörser 120 mm (Tampella): a heavy tube on its bipod and a round baseplate
      return {
        parts: [
          P.cyl(0.065, 0.07, 1.25, { x: 0.05, y: 1.08, z: 0.64, rx: 0.65, color: OLIV_DK }, 12),
          P.cyl(0.075, 0.075, 0.08, { x: 0.05, y: 1.58, z: 1.0, rx: 0.65, color: STEEL }, 12),
          P.cyl(0.077, 0.077, 0.07, { x: 0.05, y: 1.24, z: 0.77, rx: 0.65, color: STEEL }, 12),
          ...pair((s) => limb([0.05 + s * 0.04, 1.22, 0.78], [0.05 + s * 0.34, 0.56, 0.9], [[0, 0.016, 0.016], [1, 0.016, 0.016]], { color: STEEL }, 5)),
          P.cyl(0.26, 0.26, 0.05, { x: 0.05, y: 0.55, z: 0.26, color: STEEL }, 14),                               // baseplate
        ],
        muzzle: { x: 0.05, y: 1.6, z: 1.03 },
      };
    case 'manpads': // Fliegerfaust 1 (FIM-43 Redeye): the tube, its seeker dome, the grip stock
      return {
        parts: [
          P.cyl(0.042, 0.042, 1.2, { x: 0.17, y: 1.58, z: 0.2, rx: Math.PI / 2, color: OLIV_DK }, 12),
          loft([[0.17, 1.58, 0.8, 0.045, 0.045], [0.17, 1.58, 0.84, 0.04, 0.04], [0.17, 1.58, 0.86, 0.022, 0.022]], { color: 0x8a8a7a }, 10), // seeker dome cap
          P.box(0.06, 0.15, 0.18, { x: 0.17, y: 1.45, z: 0.2, color: OLIV }),                                     // grip stock
          P.box(0.04, 0.1, 0.12, { x: 0.1, y: 1.65, z: 0.34, color: BLACK }),                                     // open sight frame
        ],
        muzzle: { x: 0.17, y: 1.58, z: 0.86 },
      };
    case 'sniper': // G3SG/1: the G3 with a fitted trigger, Zeiss scope on the claw mount, bipod
      return { parts: [...g3(), ...[0.26, 0.38].map((z) => P.box(0.022, 0.03, 0.02, { x: 0.2, y: 1.385, z, color: BLACK })),
        P.cyl(0.02, 0.02, 0.3, { x: 0.2, y: 1.42, z: 0.3, rx: Math.PI / 2, color: BLACK }, 10),
        P.cyl(0.028, 0.021, 0.06, { x: 0.2, y: 1.42, z: 0.48, rx: Math.PI / 2, color: BLACK }, 10),
        P.cyl(0.024, 0.024, 0.04, { x: 0.2, y: 1.42, z: 0.13, rx: Math.PI / 2, color: BLACK }, 10)],
      muzzle: { x: 0.2, y: 1.33, z: 1.0 } };
    case 'smg': // MP2 (Uzi): the boxy receiver, the magazine through the grip
      return {
        parts: [
          P.box(0.05, 0.07, 0.26, { x: 0.2, y: 1.29, z: 0.3, color: BLACK }),
          P.box(0.03, 0.15, 0.04, { x: 0.2, y: 1.2, z: 0.25, color: BLACK }),
          P.cyl(0.011, 0.011, 0.08, { x: 0.2, y: 1.3, z: 0.47, rx: Math.PI / 2, color: STEEL }, 6),
        ],
        muzzle: { x: 0.2, y: 1.3, z: 0.52 },
      };
    default:
      return { parts: g3(), muzzle: { x: 0.2, y: 1.33, z: 1.0 } };
  }
}

/** The G3: long and slim, black furniture, a straight 20-round magazine, drum rear sight, ringed front sight. */
function g3() {
  return [
    P.box(0.042, 0.065, 0.3, { x: 0.2, y: 1.325, z: 0.32, color: STEEL }),                                       // receiver
    loft([[0.2, 1.265, 0.4, 0.015, 0.035, 4], [0.2, 1.13, 0.41, 0.015, 0.035, 4]], { color: STEEL }, 8),         // straight magazine
    P.box(0.03, 0.09, 0.045, { x: 0.2, y: 1.235, z: 0.24, rx: 0.4, color: BLACK }),                              // grip
    P.box(0.012, 0.035, 0.08, { x: 0.2, y: 1.26, z: 0.3, color: BLACK }),                                        // trigger guard
    loft([[0.2, 1.32, 0.18, 0.022, 0.036, 3], [0.2, 1.3, 0.04, 0.024, 0.05, 3], [0.2, 1.29, -0.1, 0.025, 0.06, 3.4], [0.2, 1.29, -0.115, 0.024, 0.058, 3]], { color: BLACK }, 8), // fixed stock
    loft([[0.2, 1.322, 0.48, 0.028, 0.034, 3], [0.2, 1.322, 0.7, 0.026, 0.03, 3]], { color: BLACK }, 10),        // slim handguard
    P.cyl(0.015, 0.015, 0.12, { x: 0.2, y: 1.36, z: 0.68, rx: Math.PI / 2, color: STEEL }, 6),                   // cocking tube
    P.cyl(0.011, 0.011, 0.24, { x: 0.2, y: 1.33, z: 0.82, rx: Math.PI / 2, color: STEEL }, 6),                   // barrel
    P.cyl(0.018, 0.018, 0.02, { x: 0.2, y: 1.38, z: 0.17, rz: Math.PI / 2, color: STEEL }, 8),                   // drum rear sight
    P.cyl(0.016, 0.016, 0.02, { x: 0.2, y: 1.39, z: 0.72, rx: Math.PI / 2, color: STEEL }, 8),                   // hooded front sight
    P.cyl(0.016, 0.016, 0.06, { x: 0.2, y: 1.33, z: 0.96, rx: Math.PI / 2, color: BLACK }, 8),                   // flash hider
  ];
}

/** Black, red and gold rings round the left upper arm, above the armband (soldierBody's arm line). */
function flagBand() {
  const a = [-0.215, 1.46, -0.01];
  const b = [-0.1, 1.24, 0.22];
  const at = (t) => a.map((v, i) => v + (b[i] - v) * t);
  return [[0x111111, 0.05], [0xb01818, 0.095], [0xd4a514, 0.14]].map(([color, t]) => limb(at(t), at(t + 0.045), [[0, 0.081, 0.083], [1, 0.08, 0.082]], { color }, 10));
}

export function buildBwSoldier({ weapon: kind = 'rifle', crew = false, scout = false, radio = false, airAssault = false } = {}) {
  const w = weapon(kind);
  const gear = !(crew || scout);
  const torso = [
    // moleskin jacket and trousers: breast pockets with their flaps, the jacket worn over the trousers
    ...trunk({ upper: OLIV, lower: OLIV, cut: 1.03 }),
    ...pair((s) => P.box(0.1, 0.11, 0.02, { x: s * 0.095, y: 1.38, z: 0.137, color: OLIV })),
    ...pair((s) => P.box(0.11, 0.03, 0.024, { x: s * 0.095, y: 1.445, z: 0.14, color: OLIV_DK })),
    loft([[0, 1.535, -0.01, 0.12, 0.1, 2], [0, 1.58, -0.02, 0.112, 0.095, 2]], { color: OLIV_DK }, 12),            // collar
    // Koppel: the belt with its buckle, the two G3 pouches, the gas-mask bag on the left hip, canteen
    loft([[0, 1.045, 0, 0.196, 0.136, 3], [0, 1.09, 0, 0.192, 0.132, 3]], { color: LEATHER }, 12),
    P.box(0.05, 0.045, 0.012, { y: 1.065, z: 0.14, color: 0x6a6a5a }),
    ...(gear ? [
      ...pair((s) => loft([[s * 0.1, 1.03, 0.15, 0.05, 0.032, 4], [s * 0.1, 1.16, 0.154, 0.052, 0.034, 4]], { color: WEB }, 8)), // magazine pouches
      ...pair((s) => P.box(0.105, 0.035, 0.07, { x: s * 0.1, y: 1.17, z: 0.155, rx: 0.15, color: WEB })),
      P.box(0.07, 0.2, 0.17, { x: -0.215, y: 1.0, z: 0.0, color: OLIV_DK }),                                     // gas-mask bag
      P.cyl(0.044, 0.047, 0.15, { x: 0.19, y: 1.0, z: -0.1, color: OLIV_DK }, 10),                               // canteen
      // the Y straps over the shoulders, the small pack, the folding spade under it
      ...pair((s) => loft([[0.11, 1.09, 0.142], [0.115, 1.25, 0.15], [0.11, 1.4, 0.14], [0.1, 1.52, 0.1], [0.08, 1.55, 0.02]]
        .map(([x, y, z]) => [s * x, y, z, 0.02, 0.006, 2]), { color: WEB }, 6)),
      loft([[0, 1.1, -0.135, 0.02, 0.006, 2], [0, 1.3, -0.15, 0.02, 0.006, 2], [0, 1.45, -0.14, 0.04, 0.006, 2]], { color: WEB }, 6),
      loft([[0, 1.24, -0.2, 0.14, 0.06, 4], [0, 1.38, -0.215, 0.145, 0.068, 4.5], [0, 1.48, -0.2, 0.13, 0.06, 4]], { color: OLIV_DK }, 12), // Sturmgepäck
      P.box(0.12, 0.2, 0.03, { x: 0.05, y: 1.08, z: -0.18, color: 0x3b3b2c }),                                   // Klappspaten
    ] : []),
    ...(radio ? [                                                                         // SEM 35 on the back
      loft([[0, 1.2, gear ? -0.29 : -0.21, 0.14, 0.07, 5], [0, 1.46, gear ? -0.295 : -0.215, 0.14, 0.07, 5]], { color: 0x41452f }, 10),
      P.cyl(0.006, 0.006, 1.25, { x: 0.1, y: 2.12, z: gear ? -0.31 : -0.23, rx: -0.12, color: BLACK }, 4),
      P.box(0.05, 0.1, 0.035, { x: -0.13, y: 1.42, z: 0.16, rx: 0.1, color: BLACK }),
    ] : []),
    ...head(),
    ...(scout ? [
      // soft field cap with its peak; binoculars
      loft([[0, 1.77, -0.008, 0.1, 0.11, 2.4], [0, 1.83, -0.01, 0.1, 0.11, 2.4], [0, 1.865, -0.012, 0.085, 0.095, 2.4], [0, 1.875, -0.012, 0.02, 0.02, 2]], { color: OLIV }, 12),
      P.box(0.15, 0.01, 0.07, { y: 1.785, z: 0.125, rx: 0.12, color: OLIV_DK }),
      ...binoculars(BLACK),
    ] : airAssault ? [
      loft([[0.01, 1.795, -0.005, 0.1, 0.11, 2.2], [0.03, 1.83, -0.01, 0.125, 0.13, 2.2], [0.045, 1.855, -0.01, 0.1, 0.11, 2.2], [0.05, 1.86, -0.01, 0.02, 0.02, 2]], { color: 0x5a1e24 }, 12), // maroon beret
      P.box(0.022, 0.03, 0.01, { x: -0.06, y: 1.83, z: 0.105, color: 0xb9a46a }),                                 // its badge
    ] : crew ? [
      // black beret, the headset over it
      loft([[0.01, 1.795, -0.005, 0.1, 0.11, 2.2], [0.03, 1.83, -0.01, 0.124, 0.13, 2.2], [0.045, 1.852, -0.01, 0.1, 0.11, 2.2], [0.05, 1.858, -0.01, 0.02, 0.02, 2]], { color: 0x141414 }, 12),
      ...pair((s) => P.cyl(0.04, 0.04, 0.035, { x: s * 0.1, y: 1.73, rz: Math.PI / 2, color: BLACK }, 10)),
      P.box(0.22, 0.012, 0.02, { y: 1.85, color: BLACK }),
    ] : [
      // Stahlhelm M62: the round M1 shell with a short brim all round, under its net
      helmet([[1.745, 0.158, 1.06], [1.755, 0.152], [1.79, 0.143], [1.83, 0.125], [1.858, 0.088], [1.874, 0.03]], { color: HELMET }),
      ...[1.78, 1.82].map((y) => loft([[0, y, -0.008, 0.147, 0.156, 2], [0, y + 0.008, -0.008, 0.144, 0.153, 2]], { color: NET }, 14)),
      ...pair((s) => P.box(0.008, 0.12, 0.014, { x: s * 0.075, y: 1.68, z: 0.035, rz: s * -0.25, color: LEATHER })),
    ]),
  ];
  // arms and weapon: the blue armband and the black-red-gold flag on the sleeve
  const arms = [...armsHold({ sleeve: OLIV, cuff: OLIV_DK, band: FACTIONS.nato.marking }), ...w.parts, ...flagBand()];
  const thigh = merge([
    thighPart({ color: OLIV }),
    P.box(0.04, 0.14, 0.15, { x: 0.098, y: -0.24, color: OLIV_DK }),
  ]);
  const shin = grime(merge(shinPart({ color: OLIV, boot: BLACK, bootTop: 0.22 })), -0.3, -0.5);
  return {
    torso: finish(merge(torso)),
    arms: finish(merge(arms)),
    glow: null,
    thigh: finish(thigh, false),
    shin: finish(shin, false),
    rig: { hipX: 0.12, hipY: 0.96, thighLen: 0.48, shinLen: 0.48, shoulderY: 1.47 },
    muzzle: w.muzzle,
  };
}
