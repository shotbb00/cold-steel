// The 1806 infantryman (data/epoch.js), one builder for the four armies on the soldierBody.js
// figure, same model contract as ww2Soldier.js (render/StackRenderer.js):
//   fr  France: the imperial blue habit-veste with white lapels, red collar and cuffs, white
//       breeches, black gaiters to the knee, the bicorne worn across (en bataille) with its
//       tricolour cockade, the calfskin knapsack with the greatcoat rolled on top
//   by  Bavaria: the cornflower-blue (kornblumenblau) coat with red facings and the Raupenhelm,
//       the leather helmet with its black fur crest
//   pr  Prussia: the dark Prussian-blue coat with red facings, the bicorne with its black-and-white
//       pompon, the queue
//   sx  Saxony: the white coat with red facings, the bicorne
// All: the white crossbelts (cartridge box on the right hip, bayonet and sabre on the left), the
// smoothbore musket with its bayonet fixed. kind: line | grenadier (French: the bearskin; others:
// a tall plume) | light (French voltigeurs: the shako).
import { P, merge, pair, grime, loft, limb } from '../units/geometry.js';
import { head, trunk, arms as armsHold, thigh as thighPart, shin as shinPart, finish } from './soldierBody.js';

const WOOD = 0x6b4426;
const STEEL = 0x8c8e8c;
const BRASS = 0xb08a3a;
const BLACK = 0x161616;
const WHITE = 0xe6e2d6;

export const ARMIES_1806 = {
  fr: { coat: 0x1d2a5c, facing: 0xb02424, lapel: WHITE, breeches: 0xe2ddcf, gaiter: BLACK, belt: WHITE, hat: BLACK, cockade: [0x1d2a8c, 0xf0f0f0, 0xc02020] },
  by: { coat: 0x5c8fcc, facing: 0xa82626, lapel: 0xa82626, breeches: 0xe2ddcf, gaiter: BLACK, belt: WHITE, hat: BLACK, cockade: [0x3a6ac0, 0xf0f0f0] },
  pr: { coat: 0x1b2440, facing: 0xb02a2a, lapel: 0xb02a2a, breeches: 0xe2ddcf, gaiter: BLACK, belt: WHITE, hat: BLACK, cockade: [BLACK, 0xf0f0f0] },
  sx: { coat: 0xe4e0d2, facing: 0xa82a2a, lapel: 0xa82a2a, breeches: 0xd8d2bc, gaiter: BLACK, belt: WHITE, hat: BLACK, cockade: [0xf0f0f0, 0x2a7a3a] },
};

/** The smoothbore musket (Charleville / Potsdam), bayonet fixed (in the arms' frame). */
function musket(bayonet = true, to = 1.3) { // (the rifle: shorter, no bayonet fixed)
  return {
    parts: [
      loft([[0.2, 1.3, 0.2, 0.022, 0.036, 3], [0.2, 1.28, 0.02, 0.022, 0.05, 3], [0.2, 1.265, -0.12, 0.024, 0.066, 3.2], [0.2, 1.265, -0.135, 0.023, 0.062, 3]], { color: WOOD }, 8), // butt
      loft([[0.2, 1.31, 0.22, 0.024, 0.03, 3], [0.2, 1.32, to - 0.08, 0.019, 0.022, 3]], { color: WOOD }, 8),     // the long fore-end
      P.cyl(0.011, 0.012, to - 0.2, { x: 0.2, y: 1.335, z: (to + 0.2) / 2, rx: Math.PI / 2, color: STEEL }, 6),  // barrel
      P.box(0.035, 0.04, 0.12, { x: 0.215, y: 1.32, z: 0.28, color: STEEL }),                                 // the lock
      P.box(0.012, 0.03, 0.03, { x: 0.23, y: 1.35, z: 0.25, color: STEEL }),                                  // the cock
      ...[0.55, 0.85, 1.12].map((z) => P.cyl(0.026, 0.026, 0.015, { x: 0.2, y: 1.322, z, rx: Math.PI / 2, color: BRASS }, 8)), // barrel bands
      ...(bayonet ? [
        P.cyl(0.015, 0.015, 0.06, { x: 0.2, y: 1.335, z: to + 0.02, rx: Math.PI / 2, color: STEEL }, 6),        // the socket
        P.box(0.008, 0.016, 0.4, { x: 0.2, y: 1.355, z: to + 0.24, color: 0xb8bab6 }),                        // the blade
      ] : []),
    ],
    muzzle: { x: 0.2, y: 1.335, z: to },
  };
}

/** The bicorne, worn across the head: the two cocked brims together, the crown under them. */
export function bicorne(c, plume) {
  return [
    loft([[0, 1.765, -0.005, 0.1, 0.108, 2.2], [0, 1.83, -0.005, 0.098, 0.104, 2.2], [0, 1.86, -0.005, 0.07, 0.08, 2]], { color: c.hat }, 12), // crown
    loft([[-0.23, 1.835, 0, 0.025, 0.02, 2], [-0.14, 1.865, 0, 0.05, 0.055, 2], [0, 1.885, 0, 0.06, 0.085, 2], [0.14, 1.865, 0, 0.05, 0.055, 2], [0.23, 1.835, 0, 0.025, 0.02, 2]], { color: c.hat }, 10), // the brims
    ...c.cockade.map((col, i) => P.cyl(0.04 - i * 0.012, 0.04 - i * 0.012, 0.012, { x: -0.07, y: 1.86, z: 0.062 + i * 0.004, rx: Math.PI / 2, color: col }, 10)),
    ...(plume ? [loft([[-0.07, 1.89, 0.03, 0.022, 0.022, 2], [-0.07, 2.02, 0.03, 0.03, 0.03, 2], [-0.07, 2.1, 0.03, 0.012, 0.012, 2]], { color: plume }, 8)] : []),
  ];
}

/** The French grenadiers' bearskin: tall black fur, the red patch at the back, the plume. */
const bearskin = () => [
  loft([[0, 1.74, -0.01, 0.112, 0.12, 2], [0, 1.85, -0.015, 0.13, 0.135, 2], [0, 1.98, -0.02, 0.126, 0.13, 2], [0, 2.06, -0.03, 0.09, 0.095, 2], [0, 2.08, -0.03, 0.03, 0.03, 2]], { color: 0x1a1612 }, 12),
  P.box(0.07, 0.07, 0.01, { y: 2.0, z: -0.15, color: 0xb02424 }),
  loft([[-0.11, 1.92, 0.02, 0.02, 0.02, 2], [-0.12, 2.08, 0.02, 0.028, 0.028, 2], [-0.12, 2.16, 0.02, 0.01, 0.01, 2]], { color: 0xb02424 }, 8),
];

/** The shako (French light infantry): flared black felt, the peak, the cords, a plume. */
export const shako = (plume) => [
  P.cyl(0.11, 0.098, 0.2, { y: 1.85, color: BLACK }, 14),
  P.box(0.16, 0.012, 0.07, { y: 1.76, z: 0.12, rx: 0.25, color: BLACK }),
  P.cyl(0.112, 0.112, 0.02, { y: 1.935, color: 0x2a2a2a }, 14),
  loft([[0, 1.95, 0.08, 0.02, 0.02, 2], [0, 2.07, 0.08, 0.026, 0.026, 2], [0, 2.13, 0.08, 0.01, 0.01, 2]], { color: plume }, 8),
];

/** The Bavarian Raupenhelm: the leather skull, the brass front, the black fur crest front to back. */
export const raupenhelm = (plume) => [
  loft([[0, 1.74, -0.01, 0.112, 0.12, 2], [0, 1.8, -0.01, 0.112, 0.12, 2], [0, 1.86, -0.012, 0.085, 0.095, 2]], { color: BLACK }, 12),
  P.box(0.18, 0.012, 0.07, { y: 1.75, z: 0.125, rx: 0.2, color: BLACK }),                                    // peak
  P.box(0.12, 0.07, 0.012, { y: 1.8, z: 0.118, color: BRASS }),                                             // the front plate
  loft([[0, 1.86, 0.12, 0.035, 0.03, 2], [0, 1.94, 0.04, 0.05, 0.06, 2], [0, 1.93, -0.07, 0.05, 0.065, 2], [0, 1.84, -0.14, 0.03, 0.03, 2]], { color: 0x161412 }, 10), // the crest
  ...(plume ? [loft([[-0.1, 1.84, 0.0, 0.02, 0.02, 2], [-0.11, 1.98, 0.0, 0.026, 0.026, 2], [-0.11, 2.05, 0.0, 0.01, 0.01, 2]], { color: plume }, 8)] : []),
];

export function buildNapSoldier({ army = 'fr', kind = 'line', armed = true } = {}) {
  // the light troops and the riflemen of the German armies in green; the officers with a sash, no musket
  const green = (kind === 'light' || kind === 'rifle') && army !== 'fr' ? { coat: kind === 'rifle' ? 0x26402c : 0x30553a, facing: kind === 'rifle' ? 0x161616 : 0xa82626, lapel: kind === 'rifle' ? 0x26402c : 0xa82626 } : {};
  const c = { ...(ARMIES_1806[army] ?? ARMIES_1806.fr), ...green };
  const officer = kind === 'officer';
  const w = !armed || officer ? { parts: officer ? [P.box(0.012, 0.75, 0.03, { x: 0.2, y: 1.62, z: 0.12, rx: -0.35, color: 0xb8bab6 })] : [], muzzle: { x: 0.2, y: 1.3, z: 0.4 } } // (gunners: the rammer and the sponge; officers: the sword)
    : kind === 'rifle' ? musket(false, 1.0) : musket();
  const plume = kind === 'grenadier' ? 0xb02424 : kind === 'light' ? 0x2a7a3a : officer ? 0xf0f0f0 : kind === 'rifle' ? 0x161616 : null;
  const hat = army === 'by' ? raupenhelm(plume)
    : kind === 'grenadier' && army === 'fr' ? bearskin()
      : (kind === 'light' || kind === 'rifle') && army === 'fr' ? shako(kind === 'rifle' ? 0xb02424 : 0xd8c040)
        : bicorne(c, plume);
  const torso = [
    ...trunk({ upper: c.coat, lower: c.breeches, cut: 1.08 }),
    loft([[0, 1.53, -0.01, 0.122, 0.104, 2], [0, 1.6, -0.02, 0.112, 0.096, 2]], { color: c.facing }, 12),           // the high collar
    P.box(0.17, 0.27, 0.016, { y: 1.36, z: 0.138, color: c.lapel }),                                                 // lapels
    ...[1.26, 1.32, 1.38, 1.44].flatMap((y) => pair((s) => P.sphere(0.011, { x: s * 0.07, y, z: 0.148, color: BRASS }, 5, 4))),
    // the coat tails behind, to the back of the knee, turned back in the facing colour
    ...pair((s) => loft([[s * 0.07, 1.1, -0.13, 0.07, 0.02, 3], [s * 0.075, 0.9, -0.14, 0.065, 0.02, 3], [s * 0.07, 0.72, -0.13, 0.05, 0.018, 3]], { color: c.coat }, 6)),
    ...pair((s) => P.box(0.05, 0.3, 0.012, { x: s * 0.07, y: 0.88, z: -0.155, color: c.facing })),
    // the crossbelts: cartridge box on the right hip, bayonet scabbard on the left
    ...pair((s) => limb([s * -0.15, 1.53, 0.09], [s * 0.17, 1.03, 0.14], [[0, 0.028, 0.006], [1, 0.028, 0.006]], { color: c.belt }, 4)),
    ...pair((s) => limb([s * -0.15, 1.53, -0.09], [s * 0.17, 1.05, -0.12], [[0, 0.028, 0.006], [1, 0.028, 0.006]], { color: c.belt }, 4)),
    P.box(0.17, 0.12, 0.06, { x: 0.13, y: 1.0, z: -0.15, color: BLACK }),                                          // cartridge box
    P.box(0.03, 0.32, 0.03, { x: -0.19, y: 0.92, z: -0.06, rx: 0.15, color: BLACK }),                              // scabbard
    // the knapsack, the greatcoat rolled on top
    P.box(0.3, 0.3, 0.1, { y: 1.3, z: -0.2, color: army === 'fr' ? 0x7a5a3a : 0x4a3a2a }),
    P.cyl(0.05, 0.05, 0.36, { y: 1.48, z: -0.2, rz: Math.PI / 2, color: army === 'fr' ? 0x5a5a62 : 0x6a6458 }, 8),
    ...(army === 'pr' ? [loft([[0, 1.62, -0.11, 0.02, 0.02, 2], [0, 1.48, -0.13, 0.016, 0.016, 2]], { color: 0x3a2a1e }, 6)] : []), // the queue
    ...head(),
    ...hat,
    ...(officer ? [loft([[0, 1.04, 0, 0.19, 0.13, 3], [0, 1.1, 0, 0.19, 0.13, 3]], { color: army === 'fr' ? 0xe6e2d6 : army === 'pr' ? 0x161616 : 0xd8b54a }, 12)] : []), // the officer's sash
    ...(kind === 'pioneer' ? [ // the pioneer's axe on his back, the leather apron
      P.box(0.03, 0.7, 0.03, { x: -0.08, y: 1.3, z: -0.27, rz: 0.4, color: 0x6a4428 }), P.box(0.16, 0.1, 0.02, { x: -0.23, y: 1.62, z: -0.27, rz: 0.4, color: 0x8c8e8c }),
      P.box(0.3, 0.45, 0.012, { y: 0.88, z: 0.14, color: 0xc8b48a }),
    ] : []),
  ];
  const arms = [...armsHold({ sleeve: c.coat, cuff: c.facing }), ...w.parts];
  const thigh = merge([thighPart({ color: c.breeches })]);
  const shin = grime(merge(shinPart({ color: c.breeches, boot: c.gaiter, bootTop: 0.42, blouse: false })), -0.3, -0.5);
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
