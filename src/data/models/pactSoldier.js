// Warsaw Pact infantryman, mid-1980s Soviet Army: khaki "Afghanka" field uniform, SSh-68
// helmet, chest rig and RD-54 pack, kirza jackboots, on the shared figure in soldierBody.js.
// Weapon variants: AK-74 rifle, PKM machine gun, RPG-7; 9K32 Strela-2; crewmen wear the padded
// tanker's cap and carry an AKS-74U. Artillery observers carry the R-107 radio; the VDV (air
// assault) wear the striped telnyashka under an open collar, the blue beret instead of the
// helmet, and the RD-54 swapped for a parachutist's bag. A red armband and a red star on the
// helmet identify the side. Same model contract as natoSoldier.js.
import { P, merge, pair, grime, loft, limb } from '../units/geometry.js';
import { FACTIONS } from '../factions.js';
import { head, trunk, arms as armsHold, thigh as thighPart, shin as shinPart, helmet, binoculars, finish } from './soldierBody.js';

const KHAKI = 0x7a7650;      // the Afghanka: a dusty olive-tan, faded
const KHAKI_DK = 0x625f3e;
const POCKET = 0x6c6946;
const HELMET = 0x47533a;
const RIG = 0x6b6a44;
const BOOTS = 0x161616;
const STEEL = 0x262626;
const WOOD = 0x5c2f22;     // plum laminate
const BAKELITE = 0x7a3a1c; // orange-brown magazine
const CAP = 0x1e1e1e;
const OD = 0x4c5633;

function weapon(kind) {
  switch (kind) {
    case 'mg': // PKM
      return {
        parts: [
          P.box(0.07, 0.11, 0.54, { x: 0.2, y: 1.29, z: 0.38, color: STEEL }),
          P.cyl(0.022, 0.022, 0.62, { x: 0.2, y: 1.31, z: 0.95, rx: Math.PI / 2, color: STEEL }, 8),
          P.cyl(0.03, 0.03, 0.06, { x: 0.2, y: 1.31, z: 1.28, rx: Math.PI / 2, color: STEEL }, 8),
          P.box(0.04, 0.1, 0.24, { x: 0.2, y: 1.26, z: 0.0, color: WOOD }),
          P.box(0.12, 0.13, 0.12, { x: 0.13, y: 1.18, z: 0.4, color: OD }), // 100-round box
          ...pair((s) => P.box(0.015, 0.015, 0.3, { x: 0.2 + s * 0.06, y: 1.22, z: 1.05, rx: 0.9, color: STEEL })),
        ],
        muzzle: { x: 0.2, y: 1.31, z: 1.32 },
      };
    case 'at': // RPG-7 on the right shoulder
      return {
        parts: [
          P.cyl(0.025, 0.025, 0.95, { x: 0.17, y: 1.56, z: 0.1, rx: Math.PI / 2, color: STEEL }, 8),
          P.cyl(0.036, 0.036, 0.26, { x: 0.17, y: 1.56, z: 0.1, rx: Math.PI / 2, color: WOOD }, 8),
          P.cyl(0.045, 0.03, 0.12, { x: 0.17, y: 1.56, z: -0.42, rx: Math.PI / 2, color: STEEL }, 8),
          P.cyl(0.045, 0.045, 0.1, { x: 0.17, y: 1.56, z: 0.6, rx: Math.PI / 2, color: OD }, 10),
          P.cone(0.05, 0.28, { x: 0.17, y: 1.56, z: 0.79, rx: Math.PI / 2, color: OD }, 10),
          P.box(0.03, 0.1, 0.04, { x: 0.17, y: 1.48, z: 0.2, color: STEEL }),
        ],
        muzzle: { x: 0.17, y: 1.56, z: 0.95 },
      };
    case 'mortar': // 2B14 Podnos 82 mm: tube planted at a slant, bipod, baseplate
      return {
        parts: [
          P.cyl(0.045, 0.05, 1.1, { x: 0.05, y: 1.05, z: 0.62, rx: 0.65, color: KHAKI_DK }, 10),
          P.cyl(0.055, 0.055, 0.08, { x: 0.05, y: 1.49, z: 0.95, rx: 0.65, color: STEEL }, 10),
          P.cyl(0.056, 0.056, 0.06, { x: 0.05, y: 1.225, z: 0.753, rx: 0.65, color: STEEL }, 10),      // bipod collar on the tube…
          ...pair((s) => limb([0.05 + s * 0.03, 1.2, 0.76], [0.05 + s * 0.3, 0.56, 0.88], [[0, 0.012, 0.012], [1, 0.012, 0.012]], { color: STEEL }, 5)), // …and its legs to the ground
          P.box(0.5, 0.02, 0.02, { x: 0.05, y: 0.78, z: 0.84, color: STEEL }),                           // the spread chain between them
          P.box(0.38, 0.05, 0.38, { x: 0.05, y: 0.55, z: 0.28, color: STEEL }),
        ],
        muzzle: { x: 0.05, y: 1.5, z: 0.98 },
      };
    case 'manpads': // 9K32 Strela-2: a slimmer tube, the thermal battery at the front of the grip
      return {
        parts: [
          P.cyl(0.04, 0.04, 1.45, { x: 0.17, y: 1.58, z: 0.2, rx: Math.PI / 2, color: OD }, 12),
          P.cyl(0.05, 0.045, 0.12, { x: 0.17, y: 1.58, z: 0.92, rx: Math.PI / 2, color: KHAKI_DK }, 12),
          P.box(0.05, 0.15, 0.06, { x: 0.17, y: 1.46, z: 0.3, color: STEEL }),          // grip
          P.cyl(0.03, 0.03, 0.14, { x: 0.17, y: 1.42, z: 0.4, color: OD }, 8),          // battery
          P.box(0.04, 0.06, 0.08, { x: 0.11, y: 1.64, z: 0.5, color: STEEL }),          // sight
        ],
        muzzle: { x: 0.17, y: 1.58, z: 0.96 },
      };
    case 'smg': // AKS-74U
      return {
        parts: [
          P.box(0.05, 0.09, 0.28, { x: 0.2, y: 1.29, z: 0.3, color: STEEL }),
          P.box(0.03, 0.1, 0.05, { x: 0.2, y: 1.2, z: 0.35, rx: 0.35, color: BAKELITE }),
          P.cyl(0.02, 0.02, 0.1, { x: 0.2, y: 1.3, z: 0.5, rx: Math.PI / 2, color: STEEL }, 8),
        ],
        muzzle: { x: 0.2, y: 1.3, z: 0.56 },
      };
    default: // AK-74: plum furniture, gas tube over the barrel, curved bakelite magazine, muzzle brake
      return {
        parts: [
          P.box(0.045, 0.065, 0.3, { x: 0.2, y: 1.31, z: 0.3, color: STEEL }),                // receiver
          loft([[0.2, 1.345, 0.17, 0.02, 0.012, 3], [0.2, 1.352, 0.3, 0.022, 0.016, 3], [0.2, 1.348, 0.44, 0.021, 0.014, 3]], { color: STEEL }, 8), // dust cover
          P.box(0.052, 0.05, 0.17, { x: 0.2, y: 1.302, z: 0.535, color: WOOD }),             // lower handguard
          loft([[0.2, 1.352, 0.45, 0.022, 0.018, 2.4], [0.2, 1.355, 0.62, 0.02, 0.016, 2.4]], { color: WOOD }, 8), // upper handguard, gas tube
          P.cyl(0.011, 0.011, 0.32, { x: 0.2, y: 1.322, z: 0.76, rx: Math.PI / 2, color: STEEL }, 6),  // barrel
          P.box(0.024, 0.055, 0.03, { x: 0.2, y: 1.34, z: 0.82, color: STEEL }),               // front sight block
          P.cyl(0.017, 0.017, 0.075, { x: 0.2, y: 1.322, z: 0.93, rx: Math.PI / 2, color: STEEL }, 8), // muzzle brake
          loft([[0.2, 1.275, 0.36, 0.013, 0.032, 4], [0.2, 1.205, 0.385, 0.013, 0.033, 4], [0.2, 1.14, 0.43, 0.013, 0.033, 4], [0.2, 1.09, 0.49, 0.013, 0.032, 4]], { color: BAKELITE }, 8), // magazine
          P.box(0.028, 0.09, 0.04, { x: 0.2, y: 1.24, z: 0.225, rx: 0.35, color: BAKELITE }),  // pistol grip
          loft([[0.2, 1.305, 0.15, 0.02, 0.03, 3], [0.2, 1.285, 0.02, 0.022, 0.042, 3], [0.2, 1.26, -0.11, 0.023, 0.055, 3.4], [0.2, 1.258, -0.125, 0.022, 0.054, 3]], { color: WOOD }, 8), // stock
        ],
        muzzle: { x: 0.2, y: 1.322, z: 0.97 },
      };
  }
}

export function buildPactSoldier({ weapon: kind = 'rifle', crew = false, scout = false, radio = false, airAssault = false } = {}) {
  const w = weapon(kind);
  const rig = !(crew || scout || airAssault);
  const torso = [
    // Afghanka: trousers, the jacket over them with its fold-down collar, breast and hip pockets
    ...trunk({ upper: KHAKI, lower: KHAKI, cut: 1.0 }),
    loft([[0, 1.54, -0.01, 0.118, 0.1, 2], [0, 1.585, -0.02, 0.11, 0.094, 2], [0, 1.6, -0.025, 0.1, 0.086, 2]], { color: KHAKI_DK }, 12), // collar
    ...pair((s) => P.box(0.11, 0.11, 0.02, { x: s * 0.095, y: 1.38, z: 0.137, color: POCKET })),
    ...pair((s) => P.box(0.115, 0.025, 0.024, { x: s * 0.095, y: 1.44, z: 0.139, color: KHAKI_DK })),        // flaps
    ...pair((s) => P.box(0.12, 0.13, 0.02, { x: s * 0.115, y: 1.11, z: 0.125, color: POCKET })),
    P.box(0.012, 0.42, 0.012, { y: 1.3, z: 0.143, color: KHAKI_DK }),                                       // button placket
    // leather belt with its buckle
    loft([[0, 1.04, 0, 0.19, 0.132, 3], [0, 1.08, 0, 0.186, 0.128, 3]], { color: 0x3b2a1c }, 12),
    P.box(0.05, 0.045, 0.012, { y: 1.06, z: 0.134, color: 0x8a7a40 }),
    P.box(0.035, 0.24, 0.05, { x: -0.2, y: 0.95, z: -0.03, rz: 0.15, color: 0x3b2a1c }),                 // bayonet in its scabbard
    P.box(0.1, 0.12, 0.06, { x: 0.19, y: 1.0, z: 0.04, color: KHAKI_DK }),                              // grenade pouch
    P.box(0.02, 0.5, 0.012, { x: 0.05, y: 1.32, z: 0.145, rz: -0.7, color: 0x3b2a1c }),                  // the rifle sling across the chest
    ...(radio ? [                                                                 // R-107 on the back
      // over the RD-54 when he carries one, else straight on his back
      loft([[0, 1.18, rig ? -0.335 : -0.21, 0.155, 0.076, 5], [0, 1.5, rig ? -0.34 : -0.215, 0.155, 0.076, 5]], { color: 0x4a4e36 }, 10),
      P.cyl(0.006, 0.006, 1.3, { x: 0.1, y: 2.15, z: rig ? -0.36 : -0.24, rx: -0.12, color: STEEL }, 4),
    ] : []),
    ...(airAssault ? [
      P.box(0.075, 0.055, 0.012, { y: 1.525, z: 0.097, color: 0xe8e8e8 }),          // telnyashka showing in the open collar…
      ...[1.512, 1.536].map((y) => P.box(0.077, 0.01, 0.008, { y, z: 0.103, color: 0x2a3f8a })), // …its blue stripes
      loft([[0, 1.18, -0.215, 0.15, 0.062, 4], [0, 1.42, -0.225, 0.155, 0.067, 4]], { color: KHAKI_DK }, 10), // jump bag
    ] : []),
    // chest rig for four AK magazines and grenades, RD-54 pack with the rolled cape on top
    ...(rig ? [
      loft([[0, 1.2, 0.152, 0.16, 0.02, 4], [0, 1.4, 0.163, 0.17, 0.022, 4]], { color: RIG }, 10),
      ...[-0.09, -0.03, 0.03, 0.09].map((x) => loft([[x, 1.21, 0.178, 0.027, 0.023, 4], [x, 1.35, 0.186, 0.028, 0.025, 4]], { color: KHAKI_DK }, 8)),
      ...pair((s) => loft([[s * 0.155, 1.25, 0.163, 0.029, 0.025, 3], [s * 0.155, 1.33, 0.168, 0.031, 0.027, 3]], { color: KHAKI_DK }, 8)),
      loft([[0, 1.24, -0.215, 0.14, 0.062, 4], [0, 1.4, -0.23, 0.145, 0.072, 4.5], [0, 1.5, -0.215, 0.135, 0.062, 4]], { color: KHAKI_DK }, 12),
      P.cyl(0.052, 0.052, 0.32, { y: 1.57, z: -0.215, rz: Math.PI / 2, color: 0x5a4a32 }, 8),                   // rolled cape
      P.cyl(0.042, 0.044, 0.12, { x: 0.185, y: 0.98, z: -0.09, color: KHAKI_DK }, 10),                       // canteen
    ] : []),
    ...head(),
    ...(scout ? [
      loft([[0, 1.77, -0.008, 0.1, 0.11, 2.4], [0, 1.83, -0.01, 0.098, 0.108, 2.4], [0, 1.865, -0.01, 0.075, 0.085, 2.4], [0, 1.875, -0.01, 0.02, 0.02, 2]], { color: KHAKI }, 12), // soft field cap
      P.box(0.14, 0.01, 0.06, { y: 1.785, z: 0.125, rx: 0.15, color: KHAKI }),     // peak
      ...binoculars(STEEL),                                                      // binoculars
    ] : airAssault ? [
      loft([[0.01, 1.795, -0.005, 0.1, 0.11, 2.2], [0.03, 1.83, -0.01, 0.125, 0.13, 2.2], [0.045, 1.855, -0.01, 0.1, 0.11, 2.2], [0.05, 1.86, -0.01, 0.02, 0.02, 2]], { color: 0x3b6fb0 }, 12), // blue beret, tilted right
    ] : crew ? [
      // padded tanker's cap with its three ridges
      helmet([[1.73, 0.102, 1.1], [1.77, 0.108], [1.82, 0.1], [1.855, 0.075], [1.872, 0.03]], { color: CAP, skirt: 0.035 }),
      ...[-0.05, 0, 0.05].map((x) => loft([[x, 1.8, 0.1, 0.014, 0.014], [x, 1.874, 0.0, 0.016, 0.016], [x, 1.83, -0.1, 0.014, 0.014]], { color: CAP }, 6)),
    ] : [
      // SSh-68: a high dome with a short flared rim
      helmet([[1.742, 0.153, 1.06], [1.752, 0.146], [1.785, 0.14], [1.825, 0.124], [1.855, 0.088], [1.872, 0.03]], { color: HELMET }),
      ...pair((s) => P.box(0.008, 0.12, 0.012, { x: s * 0.075, y: 1.68, z: 0.035, rz: s * -0.25, color: 0x3b2a1c })),
    ]),
  ];
  // arms and weapon: a separate part, pivoting at the shoulders (aim, lower, recoil, reload)
  const arms = [...armsHold({ sleeve: KHAKI, cuff: KHAKI_DK, band: FACTIONS.pact.marking }), ...w.parts]; // the red armband rides on the sleeve
  const glow = [
    P.cyl(0.026, 0.026, 0.01, { y: airAssault ? 1.83 : crew ? 1.79 : scout ? 1.81 : 1.8, z: airAssault ? 0.105 : crew ? 0.105 : scout ? 0.108 : 0.152, rx: Math.PI / 2 }, 5), // red star
  ];
  const thigh = merge([
    thighPart({ color: KHAKI }),
    P.box(0.04, 0.14, 0.15, { x: 0.098, y: -0.24, color: POCKET }),
  ]);
  const shin = grime(merge(shinPart({ color: KHAKI, boot: BOOTS, bootTop: 0.3 })), -0.3, -0.5); // kirza jackboots, muddy
  return {
    torso: finish(merge(torso)),
    arms: finish(merge(arms)),
    glow: merge(glow),
    thigh: finish(thigh, false),
    shin: finish(shin, false),
    rig: { hipX: 0.12, hipY: 0.96, thighLen: 0.48, shinLen: 0.48, shoulderY: 1.47 },
    muzzle: w.muzzle,
  };
}
