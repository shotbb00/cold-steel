// NVA infantryman (Nationale Volksarmee), mid-1980s: the "Strichtarn" rain-pattern field uniform
// (its fine brown strokes on grey-olive shown as a speckle — they're finer than the mesh), the
// Stahlhelm M56 with its flared skirt, the leather belt with the three-magazine pouch, the
// Schutzmaskentasche, canteen and spade, the Sturmgepäck on the back. A red armband for the side.
// Weapon variants: MPi-KM (the East German AKM: light wood, slant muzzle brake), PK, RPG-7,
// 82 mm Granatwerfer, Strela-2, SWD, MPi-KMS-72 for crews. Crews wear the padded tanker's cap;
// Aufklärer the soft field cap with binoculars; Fallschirmjäger (FJB-40) the orange-red beret.
// Same model contract as natoSoldier.js (render/StackRenderer.js).
import * as THREE from 'three';
import { P, merge, pair, grime, loft, limb } from '../units/geometry.js';
import { FACTIONS } from '../factions.js';
import { head, trunk, arms as armsHold, thigh as thighPart, shin as shinPart, helmet, binoculars, finish } from './soldierBody.js';

const STRICH = 0x6c6c55;   // Strichtarn: grey-olive ground
const STRICH_DK = 0x56563f;
const KDA = 0x62655f;      // Kampfgruppen der Arbeiterklasse: stone-grey drill
const KDA_DK = 0x4c4f4a;
const LEATHER = 0x2e2117;
const BOOTS = 0x151515;
const STEEL = 0x262626;
const WOOD = 0x8a5630;     // MPi-KM: lighter wood than the Soviet laminate
const HELMET = 0x4b5139;
const CAP = 0x1c1c1c;
const RIG = 0x5b5a43;

function weapon(kind) {
  switch (kind) {
    case 'mg': // PK: long fluted barrel, skeleton stock, the box under it, bipod
      return {
        parts: [
          P.box(0.055, 0.1, 0.34, { x: 0.2, y: 1.29, z: 0.3, color: STEEL }),
          P.cyl(0.018, 0.018, 0.62, { x: 0.2, y: 1.31, z: 0.78, rx: Math.PI / 2, color: STEEL }, 8),
          P.cyl(0.024, 0.02, 0.07, { x: 0.2, y: 1.31, z: 1.1, rx: Math.PI / 2, color: STEEL }, 8),
          P.box(0.03, 0.03, 0.22, { x: 0.2, y: 1.31, z: -0.02, color: WOOD }),                                    // skeleton stock…
          P.box(0.03, 0.09, 0.03, { x: 0.2, y: 1.27, z: -0.12, color: WOOD }),                                    // …its butt
          P.box(0.03, 0.09, 0.04, { x: 0.2, y: 1.22, z: 0.18, rx: 0.4, color: WOOD }),                            // grip
          P.box(0.1, 0.12, 0.1, { x: 0.2, y: 1.18, z: 0.32, color: 0x41452f }),                                   // ammunition box
          ...pair((s) => P.box(0.014, 0.014, 0.3, { x: 0.2 + s * 0.05, y: 1.22, z: 1.0, rx: 0.9, color: STEEL })),
        ],
        muzzle: { x: 0.2, y: 1.31, z: 1.15 },
      };
    case 'at': // RPG-7: the tube, wooden heat shields, the PGO-7 sight, the pointed grenade in front
      return {
        parts: [
          P.cyl(0.03, 0.03, 0.95, { x: 0.17, y: 1.56, z: 0.12, rx: Math.PI / 2, color: STEEL }, 10),
          P.cyl(0.046, 0.046, 0.22, { x: 0.17, y: 1.56, z: 0.08, rx: Math.PI / 2, color: WOOD }, 10),             // heat shield
          P.cyl(0.055, 0.03, 0.1, { x: 0.17, y: 1.56, z: -0.38, rx: Math.PI / 2, color: STEEL }, 10),             // venturi
          loft([[0.17, 1.56, 0.58, 0.035, 0.035], [0.17, 1.56, 0.64, 0.05, 0.05], [0.17, 1.56, 0.74, 0.05, 0.05], [0.17, 1.56, 0.86, 0.012, 0.012]], { color: 0x4a5236 }, 12), // the PG-7 grenade
          P.box(0.04, 0.12, 0.05, { x: 0.17, y: 1.47, z: 0.2, color: STEEL }),
          P.box(0.05, 0.06, 0.14, { x: 0.1, y: 1.62, z: 0.1, color: BLACKISH() }),                                // optical sight
        ],
        muzzle: { x: 0.17, y: 1.56, z: 0.86 },
      };
    case 'mortar': // 82 mm Granatwerfer: tube, bipod, a round baseplate
      return {
        parts: [
          P.cyl(0.046, 0.05, 1.15, { x: 0.05, y: 1.06, z: 0.63, rx: 0.65, color: 0x3d4430 }, 10),
          P.cyl(0.056, 0.056, 0.08, { x: 0.05, y: 1.52, z: 0.97, rx: 0.65, color: STEEL }, 10),
          ...pair((s) => limb([0.05 + s * 0.03, 1.2, 0.76], [0.05 + s * 0.3, 0.56, 0.88], [[0, 0.012, 0.012], [1, 0.012, 0.012]], { color: STEEL }, 5)),
          P.cyl(0.22, 0.22, 0.04, { x: 0.05, y: 0.55, z: 0.28, color: STEEL }, 12),
        ],
        muzzle: { x: 0.05, y: 1.53, z: 1.0 },
      };
    case 'manpads': // Strela-2M: the launch tube, the thermal battery and grip under the front, the sight
      return {
        parts: [
          P.cyl(0.04, 0.04, 1.45, { x: 0.17, y: 1.58, z: 0.2, rx: Math.PI / 2, color: 0x4c5638 }, 12),
          P.cyl(0.055, 0.045, 0.06, { x: 0.17, y: 1.58, z: 0.93, rx: Math.PI / 2, color: 0x4c5638 }, 12),
          P.box(0.05, 0.15, 0.08, { x: 0.17, y: 1.46, z: 0.12, color: STEEL }),                                   // grip and trigger
          P.cyl(0.03, 0.03, 0.12, { x: 0.17, y: 1.47, z: 0.42, color: 0x3a3a3a }, 8),                             // battery
          P.box(0.04, 0.08, 0.06, { x: 0.1, y: 1.65, z: 0.5, color: STEEL }),
        ],
        muzzle: { x: 0.17, y: 1.58, z: 0.97 },
      };
    case 'sniper': // SWD: the long barrel, the skeleton wood stock, PSO-1 scope
      return {
        parts: [
          P.box(0.035, 0.06, 0.24, { x: 0.2, y: 1.32, z: 0.3, color: STEEL }),
          P.box(0.03, 0.09, 0.04, { x: 0.2, y: 1.23, z: 0.38, rx: 0.1, color: STEEL }),                           // 10-round box
          P.box(0.028, 0.03, 0.26, { x: 0.2, y: 1.3, z: 0.02, color: WOOD }),                                     // skeleton stock
          P.box(0.028, 0.1, 0.03, { x: 0.2, y: 1.25, z: -0.1, color: WOOD }),
          P.box(0.028, 0.04, 0.22, { x: 0.2, y: 1.32, z: 0.55, color: WOOD }),                                    // handguard
          P.cyl(0.011, 0.011, 0.5, { x: 0.2, y: 1.33, z: 0.88, rx: Math.PI / 2, color: STEEL }, 6),
          P.cyl(0.016, 0.016, 0.07, { x: 0.2, y: 1.33, z: 1.15, rx: Math.PI / 2, color: STEEL }, 8),
          P.cyl(0.02, 0.02, 0.28, { x: 0.205, y: 1.4, z: 0.28, rx: Math.PI / 2, color: 0x181818 }, 10),          // scope
          P.box(0.03, 0.04, 0.06, { x: 0.2, y: 1.37, z: 0.28, color: 0x181818 }),
        ],
        muzzle: { x: 0.2, y: 1.33, z: 1.19 },
      };
    case 'smg': // MPi-KMS-72: the folding-stock carbine
      return {
        parts: [
          P.box(0.04, 0.06, 0.24, { x: 0.2, y: 1.32, z: 0.32, color: STEEL }),
          loft([[0.2, 1.27, 0.38, 0.013, 0.034, 4], [0.2, 1.19, 0.41, 0.013, 0.034, 4], [0.2, 1.13, 0.45, 0.013, 0.033, 4]], { color: STEEL }, 8),
          P.box(0.026, 0.035, 0.14, { x: 0.2, y: 1.33, z: 0.54, color: WOOD }),
          P.cyl(0.011, 0.011, 0.2, { x: 0.2, y: 1.335, z: 0.72, rx: Math.PI / 2, color: STEEL }, 6),
        ],
        muzzle: { x: 0.2, y: 1.335, z: 0.83 },
      };
    default: // MPi-KM: light wood stock and handguard, steel 30-round magazine, slant muzzle brake
      return {
        parts: [
          P.box(0.04, 0.062, 0.26, { x: 0.2, y: 1.32, z: 0.32, color: STEEL }),
          loft([[0.2, 1.268, 0.38, 0.013, 0.034, 4], [0.2, 1.19, 0.41, 0.013, 0.034, 4], [0.2, 1.125, 0.45, 0.013, 0.033, 4]], { color: STEEL }, 8), // curved magazine
          P.box(0.03, 0.09, 0.045, { x: 0.2, y: 1.235, z: 0.24, rx: 0.4, color: WOOD }),
          loft([[0.2, 1.31, 0.19, 0.02, 0.03, 3], [0.2, 1.29, 0.05, 0.022, 0.048, 3], [0.2, 1.275, -0.09, 0.023, 0.058, 3.4], [0.2, 1.275, -0.105, 0.022, 0.056, 3]], { color: WOOD }, 8), // stock
          P.box(0.028, 0.04, 0.16, { x: 0.2, y: 1.325, z: 0.52, color: WOOD }),                                   // lower handguard
          P.box(0.024, 0.02, 0.14, { x: 0.2, y: 1.355, z: 0.52, color: WOOD }),                                   // upper handguard
          P.cyl(0.011, 0.011, 0.24, { x: 0.2, y: 1.335, z: 0.74, rx: Math.PI / 2, color: STEEL }, 6),
          P.box(0.016, 0.05, 0.02, { x: 0.2, y: 1.36, z: 0.79, color: STEEL }),                                   // front sight
          P.cyl(0.014, 0.014, 0.05, { x: 0.2, y: 1.335, z: 0.88, rx: Math.PI / 2, color: STEEL }, 8),             // slant brake
        ],
        muzzle: { x: 0.2, y: 1.335, z: 0.91 },
      };
  }
}
function BLACKISH() { return 0x181818; }

/** Strichtarn: the grey-olive cloth speckled darker and browner, vertex by vertex. */
function strichtarn(geo) {
  const p = geo.attributes.position, c = geo.attributes.color;
  const k = new THREE.Color(STRICH); // (part colours are stored the way three.js keeps them: linear)
  const base = [k.r, k.g, k.b];
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(c.getX(i) - base[0]) > 0.01 || Math.abs(c.getY(i) - base[1]) > 0.01) continue;
    const h = Math.sin(p.getX(i) * 127.1 + p.getY(i) * 311.7 + p.getZ(i) * 74.7) * 43758.5;
    const n = h - Math.floor(h);
    if (n < 0.35) c.setXYZ(i, c.getX(i) * 0.78, c.getY(i) * 0.72, c.getZ(i) * 0.62); // the brown strokes
  }
  return geo;
}

export function buildNvaSoldier({ weapon: kind = 'rifle', crew = false, scout = false, radio = false, airAssault = false, militia = false } = {}) {
  const w = weapon(kind);
  const gear = !(crew || scout || militia);
  const cloth = militia ? KDA : STRICH;     // the Kampfgruppen's stone-grey (no Strichtarn: its speckle keys on STRICH)
  const clothDk = militia ? KDA_DK : STRICH_DK;
  const torso = [
    ...trunk({ upper: cloth, lower: cloth, cut: 1.02 }),
    ...pair((s) => P.box(0.1, 0.11, 0.02, { x: s * 0.095, y: 1.38, z: 0.137, color: cloth })),
    ...pair((s) => P.box(0.11, 0.03, 0.024, { x: s * 0.095, y: 1.445, z: 0.14, color: clothDk })),
    loft([[0, 1.535, -0.01, 0.12, 0.1, 2], [0, 1.585, -0.02, 0.112, 0.095, 2]], { color: clothDk }, 12),       // collar
    loft([[0, 1.04, 0, 0.192, 0.134, 3], [0, 1.085, 0, 0.188, 0.13, 3]], { color: LEATHER }, 12),                // leather belt
    P.box(0.05, 0.045, 0.012, { y: 1.06, z: 0.136, color: 0x707060 }),
    ...(gear ? [
      loft([[0.11, 1.02, 0.148, 0.065, 0.032, 4], [0.11, 1.16, 0.152, 0.067, 0.034, 4]], { color: RIG }, 8),       // three-magazine pouch
      P.box(0.13, 0.035, 0.07, { x: 0.11, y: 1.17, z: 0.154, rx: 0.15, color: RIG }),
      P.box(0.075, 0.18, 0.15, { x: -0.21, y: 1.0, z: 0.02, color: clothDk }),                                 // gas-mask bag
      P.cyl(0.042, 0.045, 0.14, { x: 0.19, y: 1.0, z: -0.1, color: 0x3d4430 }, 10),                              // canteen
      ...pair((s) => loft([[0.1, 1.09, 0.14], [0.11, 1.3, 0.15], [0.1, 1.48, 0.12], [0.08, 1.55, 0.02]]
        .map(([x, y, z]) => [s * x, y, z, 0.018, 0.006, 2]), { color: LEATHER }, 6)),                             // the straps
      loft([[0, 1.24, -0.2, 0.14, 0.06, 4], [0, 1.38, -0.215, 0.145, 0.068, 4.5], [0, 1.47, -0.2, 0.13, 0.06, 4]], { color: clothDk }, 12), // Sturmgepäck
      P.box(0.11, 0.2, 0.03, { x: -0.06, y: 1.08, z: -0.18, color: 0x3a3a2b }),                                   // spade
    ] : []),
    ...(radio ? [
      loft([[0, 1.2, gear ? -0.29 : -0.21, 0.15, 0.072, 5], [0, 1.48, gear ? -0.295 : -0.215, 0.15, 0.072, 5]], { color: 0x4a4e36 }, 10),
      P.cyl(0.006, 0.006, 1.3, { x: 0.1, y: 2.15, z: gear ? -0.31 : -0.23, rx: -0.12, color: STEEL }, 4),
    ] : []),
    ...head(),
    ...(scout || militia ? [
      loft([[0, 1.77, -0.008, 0.1, 0.11, 2.4], [0, 1.83, -0.01, 0.1, 0.11, 2.4], [0, 1.865, -0.012, 0.085, 0.095, 2.4], [0, 1.875, -0.012, 0.02, 0.02, 2]], { color: cloth }, 12),
      P.box(0.15, 0.01, 0.07, { y: 1.785, z: 0.125, rx: 0.12, color: clothDk }),
      ...(scout ? binoculars(STEEL) : []),
    ] : airAssault ? [
      loft([[0.01, 1.795, -0.005, 0.1, 0.11, 2.2], [0.03, 1.83, -0.01, 0.125, 0.13, 2.2], [0.045, 1.855, -0.01, 0.1, 0.11, 2.2], [0.05, 1.86, -0.01, 0.02, 0.02, 2]], { color: 0x9a3a24 }, 12), // orange-red beret
    ] : crew ? [
      helmet([[1.73, 0.102, 1.1], [1.77, 0.108], [1.82, 0.1], [1.855, 0.075], [1.872, 0.03]], { color: CAP, skirt: 0.035 }),
      ...[-0.05, 0, 0.05].map((x) => loft([[x, 1.8, 0.1, 0.014, 0.014], [x, 1.874, 0.0, 0.016, 0.016], [x, 1.83, -0.1, 0.014, 0.014]], { color: CAP }, 6)),
    ] : [
      // Stahlhelm M56: a deep dome, the skirt flaring out low over the ears and neck
      helmet([[1.7, 0.168, 1.08], [1.725, 0.15], [1.76, 0.142], [1.8, 0.137], [1.835, 0.122], [1.862, 0.086], [1.878, 0.03]], { color: HELMET }),
      ...pair((s) => P.box(0.008, 0.12, 0.014, { x: s * 0.075, y: 1.65, z: 0.035, rz: s * -0.25, color: LEATHER })),
    ]),
  ];
  const arms = [...armsHold({ sleeve: cloth, cuff: clothDk, band: FACTIONS.pact.marking }), ...w.parts];
  const thigh = merge([
    thighPart({ color: cloth }),
    P.box(0.04, 0.14, 0.15, { x: 0.098, y: -0.24, color: clothDk }),
  ]);
  const shin = grime(merge(shinPart({ color: cloth, boot: BOOTS, bootTop: 0.26 })), -0.3, -0.5);
  return {
    torso: finish(strichtarn(merge(torso))),
    arms: finish(strichtarn(merge(arms))),
    glow: null,
    thigh: finish(strichtarn(thigh), false),
    shin: finish(strichtarn(shin), false),
    rig: { hipX: 0.12, hipY: 0.96, thighLen: 0.48, shinLen: 0.48, shoulderY: 1.47 },
    muzzle: w.muzzle,
  };
}
