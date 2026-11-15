// The 1918 infantryman (data/epoch.js), one builder for the four armies on the soldierBody.js
// figure, same model contract as ww2Soldier.js (render/StackRenderer.js):
//   uk  British Army: khaki serge, the Brodie "tin hat" with its wide flat brim, the 1908 webbing
//       with its rows of cartridge pouches, puttees wound to the knee over ankle boots
//   fr  French Army: horizon blue, the Adrian helmet with its crest and peaks, the long greatcoat
//       with its tails buttoned back, leather cartridge boxes, puttees
//   de  German Heer: field grey, the M16 Stahlhelm with its side lugs, the leather belt and three-cell
//       pouches, the fluted gas-mask tin, jackboots
//   st  Sturmtruppen: the same Stahlhelm, sandbags of stick grenades slung across the chest, the
//       Karabiner and the MP 18, puttees and ankle boots for the assault
// Weapons: rifle (SMLE / Lebel / Gew 98 / Kar 98 AZ), bayonets fixed; smg (MP 18, the drum);
// mg (Lewis / Chauchat / MG 08/15); at (rifle grenade cup / Tankgewehr); mortar; sniper; flame.
import { P, merge, pair, grime, loft, limb } from '../units/geometry.js';
import { head, trunk, arms as armsHold, thigh as thighPart, shin as shinPart, helmet, binoculars, finish } from './soldierBody.js';

const STEEL = 0x2a2a2a;
const BLACK = 0x171717;
const WOOD = 0x6a4428;
const LEATHER_BLACK = 0x1c1a17;
const LEATHER_BROWN = 0x5a3a22;

const ARMY = {
  uk: { coat: 0x6e6444, coatDk: 0x5a5236, trousers: 0x6a6042, web: 0x9a8c64, belt: 0x9a8c64, boot: 0x3e2a1c, puttee: 0x625a3e, helmet: 0x5a5a40 },
  fr: { coat: 0x8a9aa6, coatDk: 0x6e7e8a, trousers: 0x84949f, web: LEATHER_BROWN, belt: LEATHER_BROWN, boot: 0x3a2a1e, puttee: 0x7a8a96, helmet: 0x7a8a92 },
  de: { coat: 0x6c6e5c, coatDk: 0x56584a, trousers: 0x5e604f, web: LEATHER_BLACK, belt: LEATHER_BLACK, boot: BLACK, helmet: 0x5a5e50 },
  st: { coat: 0x686a58, coatDk: 0x525446, trousers: 0x5a5c4c, web: LEATHER_BLACK, belt: LEATHER_BLACK, boot: 0x2a2420, puttee: 0x56584a, helmet: 0x55594c },
};

// ------------------------------------------------------------------ weapons (in the arms' frame)

/** A bolt rifle: the stock, the action, wood almost to the muzzle (`wood2`), the barrel, a fixed bayonet (`bayonet` m). */
function rifle({ to = 1.0, wood2 = 0.85, bayonet = 0.4, nose = false }) {
  return [
    loft([[0.2, 1.31, 0.2, 0.022, 0.034, 3], [0.2, 1.28, 0.02, 0.022, 0.05, 3], [0.2, 1.27, -0.11, 0.024, 0.062, 3.2], [0.2, 1.27, -0.125, 0.023, 0.06, 3]], { color: WOOD }, 8),
    P.box(0.04, 0.05, 0.22, { x: 0.2, y: 1.325, z: 0.31, color: STEEL }),
    loft([[0.2, 1.31, 0.42, 0.026, 0.032, 3], [0.2, 1.318, wood2, 0.02, 0.025, 3]], { color: WOOD }, 8),
    P.cyl(0.011, 0.011, to - 0.4, { x: 0.2, y: 1.335, z: (to + 0.4) / 2, rx: Math.PI / 2, color: STEEL }, 6),
    P.cyl(0.008, 0.008, 0.07, { x: 0.24, y: 1.34, z: 0.27, rz: Math.PI / 2, color: STEEL }, 5),
    ...(nose ? [P.box(0.03, 0.03, 0.05, { x: 0.2, y: 1.335, z: to - 0.02, color: STEEL })] : []),        // the SMLE's snub nose cap
    ...(bayonet ? [P.box(0.006, 0.022, bayonet, { x: 0.2, y: 1.318, z: to + bayonet / 2 - 0.03, color: 0x9a9a9a })] : []), // the blade
  ];
}
const tip = (to, bayonet = 0) => ({ x: 0.2, y: 1.335, z: to + Math.max(0, bayonet - 0.05) });

function weapon(kind, army) {
  switch (kind) {
    case 'none': return { parts: [], muzzle: { x: 0.2, y: 1.3, z: 0.4 } }; // (a gunner: hands free)
    case 'smg': // MP 18: the wooden stock, the perforated barrel jacket, the snail drum out to the left
      return { parts: [
        loft([[0.2, 1.3, 0.2, 0.022, 0.034, 3], [0.2, 1.28, 0.0, 0.024, 0.05, 3], [0.2, 1.27, -0.1, 0.024, 0.058, 3]], { color: WOOD }, 8),
        P.box(0.045, 0.055, 0.24, { x: 0.2, y: 1.32, z: 0.32, color: STEEL }),
        P.cyl(0.022, 0.022, 0.22, { x: 0.2, y: 1.33, z: 0.54, rx: Math.PI / 2, color: STEEL }, 8),
        P.cyl(0.055, 0.055, 0.06, { x: 0.1, y: 1.3, z: 0.34, rz: Math.PI / 2, color: STEEL }, 12),
      ], muzzle: { x: 0.2, y: 1.33, z: 0.66 } };
    case 'mg':
      if (army === 'uk') return { // Lewis: the fat cooling shroud, the pan magazine on top, the butt
        parts: [
          ...rifle({ to: 0.5, wood2: 0.3, bayonet: 0 }),
          P.cyl(0.045, 0.04, 0.55, { x: 0.2, y: 1.33, z: 0.72, rx: Math.PI / 2, color: 0x2f3128 }, 10),
          P.cyl(0.1, 0.1, 0.035, { x: 0.2, y: 1.42, z: 0.34, color: STEEL }, 14),
          ...pair((s) => P.box(0.012, 0.012, 0.28, { x: 0.2 + s * 0.05, y: 1.22, z: 0.85, rx: 0.9, color: STEEL })),
        ], muzzle: { x: 0.2, y: 1.33, z: 1.0 } };
      if (army === 'fr') return { // Chauchat: the half-moon magazine underneath, the slim barrel, the bipod, the pistol grip
        parts: [
          ...rifle({ to: 0.95, wood2: 0.38, bayonet: 0 }),
          P.cyl(0.026, 0.026, 0.4, { x: 0.2, y: 1.33, z: 0.62, rx: Math.PI / 2, color: STEEL }, 8),
          P.box(0.03, 0.16, 0.12, { x: 0.2, y: 1.2, z: 0.36, rx: -0.4, color: STEEL }),
          ...pair((s) => P.box(0.012, 0.012, 0.3, { x: 0.2 + s * 0.05, y: 1.22, z: 0.82, rx: 0.9, color: STEEL })),
        ], muzzle: { x: 0.2, y: 1.335, z: 0.97 } };
      return { // MG 08/15: the water jacket, the wooden butt, the bipod, the belt drum
        parts: [
          loft([[0.2, 1.27, 0.08, 0.022, 0.045, 3], [0.2, 1.26, -0.14, 0.024, 0.06, 3]], { color: WOOD }, 8),
          P.box(0.07, 0.1, 0.32, { x: 0.2, y: 1.29, z: 0.26, color: BLACK }),
          P.cyl(0.05, 0.05, 0.5, { x: 0.2, y: 1.31, z: 0.68, rx: Math.PI / 2, color: 0x3a3c32 }, 12),
          P.cyl(0.014, 0.014, 0.1, { x: 0.2, y: 1.31, z: 0.98, rx: Math.PI / 2, color: STEEL }, 6),
          P.cyl(0.06, 0.06, 0.08, { x: 0.11, y: 1.25, z: 0.3, rz: Math.PI / 2, color: 0x3a3c30 }, 12),
          ...pair((s) => P.box(0.014, 0.014, 0.3, { x: 0.2 + s * 0.06, y: 1.21, z: 0.85, rx: 0.9, color: STEEL })),
        ], muzzle: { x: 0.2, y: 1.31, z: 1.04 } };
    case 'at':
      if (army === 'uk' || army === 'fr') return { // the rifle with the grenade cup on the muzzle (Mills / VB)
        parts: [...rifle({ to: army === 'fr' ? 1.08 : 0.96, bayonet: 0, nose: army === 'uk' }),
          P.cyl(0.03, 0.022, 0.1, { x: 0.2, y: 1.335, z: (army === 'fr' ? 1.08 : 0.96) + 0.04, rx: Math.PI / 2, color: STEEL }, 10)],
        muzzle: tip((army === 'fr' ? 1.08 : 0.96) + 0.1) };
      return { // Mauser Tankgewehr M1918: a giant single-shot rifle on a bipod
        parts: [...rifle({ to: 1.6, wood2: 0.6, bayonet: 0 }),
          P.cyl(0.018, 0.018, 1.1, { x: 0.2, y: 1.335, z: 1.05, rx: Math.PI / 2, color: STEEL }, 8),
          ...pair((s) => P.box(0.014, 0.014, 0.34, { x: 0.2 + s * 0.06, y: 1.2, z: 0.9, rx: 0.9, color: STEEL }))],
        muzzle: tip(1.62) };
    case 'mortar': // Stokes / crapouillot / leichter Minenwerfer: the tube on its bipod and the baseplate
      return { parts: [
        P.cyl(0.042, 0.046, 1.1, { x: 0.05, y: 1.06, z: 0.62, rx: 0.65, color: 0x3f4232 }, 12),
        ...pair((s) => limb([0.05 + s * 0.03, 1.2, 0.76], [0.05 + s * 0.3, 0.56, 0.88], [[0, 0.014, 0.014], [1, 0.014, 0.014]], { color: STEEL }, 5)),
        P.box(0.4, 0.04, 0.4, { x: 0.05, y: 0.56, z: 0.26, color: STEEL }),
      ], muzzle: { x: 0.05, y: 1.53, z: 0.98 } };
    case 'flame': // the Wechselapparat's nozzle and hose (the tank rides on the back: in the torso)
      return { parts: [
        P.cyl(0.026, 0.026, 0.8, { x: 0.2, y: 1.29, z: 0.44, rx: Math.PI / 2, color: STEEL }, 8),
        P.box(0.04, 0.1, 0.05, { x: 0.2, y: 1.22, z: 0.22, color: BLACK }),
      ], muzzle: { x: 0.2, y: 1.29, z: 0.86 } };
    case 'sniper': {
      const to = army === 'fr' ? 1.08 : army === 'uk' ? 0.96 : 1.04;
      return { parts: [...rifle({ to, bayonet: 0, nose: army === 'uk' }),
        P.cyl(0.016, 0.016, 0.26, { x: 0.2, y: 1.39, z: 0.33, rx: Math.PI / 2, color: BLACK }, 10)], muzzle: tip(to) };
    }
    default: { // the rifle: SMLE (short, the snub nose), Lebel (long, the long thin bayonet), Gew 98, the Sturm's carbine (no bayonet)
      const R = { uk: [0.96, 0.43, true], fr: [1.1, 0.52, false], de: [1.04, 0.4, false], st: [0.92, 0, false] }[army] ?? [1, 0.4, false];
      return { parts: rifle({ to: R[0], wood2: R[0] - 0.08, bayonet: R[1], nose: R[2] }), muzzle: tip(R[0]) };
    }
  }
}

// ------------------------------------------------------------------ headgear

function headgear(army, c, crew) {
  if (crew) return [ // the tank crews' leather helmet / the soft cap
    loft([[0, 1.77, -0.01, 0.105, 0.115, 2.2], [0, 1.83, -0.012, 0.105, 0.115, 2.2], [0, 1.87, -0.012, 0.07, 0.08, 2]], { color: army === 'uk' || army === 'fr' ? 0x3a2c1e : c.coatDk }, 12),
  ];
  if (army === 'uk') return [ // the Brodie: a shallow bowl on a wide flat brim
    helmet([[1.8, 0.21, 1.1, 2], [1.808, 0.205], [1.812, 0.13], [1.84, 0.128], [1.868, 0.1], [1.886, 0.04]], { color: c.helmet }),
    P.box(0.008, 0.12, 0.012, { x: 0, y: 1.7, z: 0.1, color: c.web }), // the chin strap
  ];
  if (army === 'fr') return [ // the Adrian: the dome, the peaks front and back, the crest along the top
    helmet([[1.775, 0.148, 1.42, 2], [1.785, 0.14, 1.2], [1.8, 0.135], [1.84, 0.125], [1.87, 0.094], [1.888, 0.035]], { color: c.helmet }),
    P.box(0.022, 0.035, 0.2, { y: 1.9, color: c.helmet }),
    P.box(0.03, 0.03, 0.006, { y: 1.83, z: 0.13, color: 0x9a9a8a }), // the grenade badge
  ];
  return [ // M16 Stahlhelm: the deep skirt over ears and nape, the visor, the lugs at the sides
    helmet([[1.7, 0.175, 1.1], [1.725, 0.16], [1.76, 0.15], [1.8, 0.144], [1.835, 0.125], [1.862, 0.09], [1.878, 0.03]], { color: c.helmet, skirt: 0.045 }),
    ...pair((s) => P.cyl(0.014, 0.014, 0.025, { x: s * 0.15, y: 1.79, rz: Math.PI / 2, color: c.helmet }, 6)),
  ];
}

// ------------------------------------------------------------------ the man

export function buildWw1Soldier({ army = 'uk', weapon: kind = 'rifle', crew = false, scout = false, radio = false, blue = false } = {}) {
  const c = blue ? { ...ARMY.uk, coat: 0x232a3c, coatDk: 0x1a2030, trousers: 0x232a3c, puttee: 0xa8a28a } : ARMY[army] ?? ARMY.uk; // (blue: the Royal Navy's landing parties — jumpers and bell-bottoms under the Army's webbing and tin hat, canvas gaiters)
  const w = weapon(crew ? 'smg' : kind, army);
  const gear = !crew;
  const coatLong = army === 'fr' && !crew;   // the poilu's greatcoat, to the knee
  const torso = [
    ...trunk({ upper: c.coat, lower: coatLong ? c.coat : c.trousers, cut: coatLong ? 0.72 : 1.0 }),
    loft([[0, 1.535, -0.01, 0.12, 0.1, 2], [0, 1.585, -0.02, 0.112, 0.095, 2]], { color: c.coatDk }, 12),   // the stand collar
    ...pair((s) => P.box(0.1, 0.1, 0.02, { x: s * 0.095, y: 1.38, z: 0.137, color: c.coat })),
    loft([[0, 1.045, 0, 0.196, 0.136, 3], [0, 1.09, 0, 0.192, 0.132, 3]], { color: c.belt }, 12),
    ...(gear ? [
      ...pair((s) => loft([[0.11, 1.09, 0.142], [0.115, 1.25, 0.15], [0.11, 1.4, 0.14], [0.1, 1.52, 0.1], [0.08, 1.55, 0.02]]
        .map(([x, y, z]) => [s * x, y, z, 0.02, 0.006, 2]), { color: c.web }, 6)),
      ...(army === 'uk'
        ? pair((s) => [0, 1].map((r) => P.box(0.13, 0.05, 0.045, { x: s * 0.1, y: 1.2 + r * 0.07, z: 0.15, color: c.web })))   // the 1908 pattern: five pouches a side, stacked
        : pair((s) => [0.06, 0.13].map((dx) => P.box(0.055, 0.075, 0.04, { x: s * (0.04 + dx), y: 1.1, z: 0.15, color: c.web })))).flat(),
      P.cyl(0.044, 0.047, 0.15, { x: 0.19, y: 1.0, z: -0.1, color: army === 'fr' ? 0x6a5a40 : 0x4d4932 }, 10),  // the water bottle
      P.box(0.17, 0.15, 0.07, { x: -0.13, y: 0.98, z: -0.14, color: army === 'uk' ? c.web : 0x6a6650 }),           // haversack / bread bag
      ...(army === 'de' || army === 'st' ? [
        P.cyl(0.055, 0.055, 0.2, { x: 0.02, y: 1.0, z: -0.19, color: 0x4f5240 }, 12),                              // the gas-mask tin
        ...[-0.06, 0.06].map((d) => P.cyl(0.058, 0.058, 0.012, { x: 0.02, y: 1.0 + d, z: -0.19, color: 0x44473a }, 12)),
      ] : army === 'fr' ? [
        P.cyl(0.05, 0.05, 0.16, { x: 0.04, y: 1.0, z: -0.19, color: 0x5a5e5a }, 10),                               // the M2 mask tin
        loft([[0, 1.3, -0.19, 0.15, 0.06, 4], [0, 1.48, -0.2, 0.16, 0.065, 4], [0, 1.55, -0.18, 0.13, 0.05, 4]], { color: 0x5a4a34 }, 12), // the pack with its blanket roll
      ] : [
        P.box(0.16, 0.2, 0.06, { x: 0, y: 1.32, z: 0.17, color: 0x6a6044 }),                                       // the small box respirator, on the chest
        P.box(0.12, 0.2, 0.03, { x: 0.05, y: 1.08, z: -0.18, color: 0x3b3b2c }),                                   // the entrenching tool
      ]),
      ...(army === 'st' ? [ // the grenade sacks, slung across the chest, the stick grenades in the belt
        ...pair((s) => P.box(0.12, 0.14, 0.07, { x: s * 0.12, y: 1.2, z: 0.17, color: 0x8a7c5a })),
        ...pair((s) => limb([s * 0.14, 1.55, 0.1], [-s * 0.12, 1.25, 0.16], [[0, 0.012, 0.006], [1, 0.012, 0.006]], { color: 0x8a7c5a }, 4)),
        ...[-0.08, 0.02].map((x) => P.cyl(0.012, 0.012, 0.28, { x, y: 1.0, z: 0.16, color: WOOD }, 5)),
        ...[-0.08, 0.02].map((x) => P.cyl(0.032, 0.032, 0.08, { x, y: 1.17, z: 0.16, color: 0x4a4c40 }, 8)),
      ] : []),
    ] : []),
    ...head(),
    ...headgear(army, c, crew),
    ...(scout ? binoculars(BLACK) : []),
    ...(kind === 'flame' ? [ // the ring tank on the back
      loft([[0, 1.0, -0.24, 0.17, 0.08, 2], [0, 1.4, -0.25, 0.17, 0.08, 2]], { color: 0x3a3c30 }, 14),
    ] : []),
    ...(radio ? [ // the field telephone, its reel of wire
      P.box(0.16, 0.12, 0.1, { x: -0.18, y: 1.0, z: -0.05, color: 0x4a3a28 }),
      P.cyl(0.08, 0.08, 0.06, { y: 1.35, z: -0.24, rx: Math.PI / 2, color: 0x3a3a2c }, 12),
    ] : []),
  ];
  const arms = [...armsHold({ sleeve: c.coat, cuff: c.coatDk }), ...w.parts];
  const thigh = merge([thighPart({ color: c.trousers })]);
  const puttees = !!c.puttee && !crew;
  const shin = grime(merge([
    ...shinPart({ color: c.trousers, boot: c.boot, bootTop: puttees ? 0.13 : 0.34, blouse: !puttees }),
    ...(puttees ? [loft([[0, -0.38, 0.0, 0.058, 0.062, 2], [0, -0.2, 0.0, 0.062, 0.066, 2], [0, -0.02, 0.0, 0.07, 0.074, 2]], { color: c.puttee }, 10)] : []), // the puttees, wound to the knee
  ]), -0.3, -0.5);
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

/** An army's 1918 helmet (Brodie, Adrian, Stahlhelm), as parts on a standing man's head: the 1918 cavalry's (napCavalry.js). */
export const ww1Helmet = (army) => headgear(army, ARMY[army] ?? ARMY.uk, false);
