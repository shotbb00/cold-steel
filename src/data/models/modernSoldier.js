// The 2027 infantryman (data/epoch.js), one builder for the four armies on the soldierBody.js figure,
// same model contract as natoSoldier.js (render/StackRenderer.js):
//   us  US Army: OCP (plain coyote-green here), a coyote plate carrier with its magazine pouches, the
//       high-cut ECH helmet with the night-vision mount and the battery pack at the back
//   pl  Polish Army: wz. 93 Pantera woodland (the camo pattern), a green carrier, the wz. 2005 helmet
//   ru  Russian Ground Forces: EMR digital green (plain), the 6B45 Ratnik vest with its collar, the 6B47
//       helmet in its cover
//   by  Belarus: the same Russian kit cut older — a darker green, the 6B7-style helmet, a lighter vest
// All wear the side's armband (the identification tape of a modern war) and knee pads.
// Weapons (black polymer, optics): rifle (M4A1 / MSBS Grot / AK-12 / AK-74M), mg (M249 / PKP-style
// belt-fed for all others), at (Javelin CLU and tube / Spike-LR / Kornet-style tube — RPG-7 for Belarus),
// manpads (Stinger / Piorun / Verba / Igla), mortar (60/82 mm), sniper (Mk 22 / Bor / SVD-M / SVD), smg
// (the short carbine: crews and assault kits). Options as natoSoldier: crew, scout, radio, airAssault.
import { P, merge, pair, grime, loft, limb } from '../units/geometry.js';
import { head, trunk, arms as armsHold, thigh as thighPart, shin as shinPart, helmet, binoculars, finish } from './soldierBody.js';
import { FACTIONS } from '../factions.js';

const BLACK = 0x161616;
const POLY = 0x1f1f1d;      // rifle polymer
const FDE = 0x8a7656;       // flat dark earth furniture (US)
const STEEL = 0x2a2a2a;

const ARMY = {
  us: { side: 'nato', coat: 0x7b7558, coatDk: 0x625d45, trousers: 0x78714f, carrier: 0x6f6247, pouch: 0x655a42, helmet: 0x6c6248, boot: 0x8a7656, camo: 0, furn: FDE },
  pl: { side: 'nato', coat: 0x5a6140, coatDk: 0x474d33, trousers: 0x585f3f, carrier: 0x4a5038, pouch: 0x43482f, helmet: 0x4b5139, boot: BLACK, camo: 1, furn: POLY },
  ru: { side: 'pact', coat: 0x5e6249, coatDk: 0x4b4e3a, trousers: 0x5b5f47, carrier: 0x52563f, pouch: 0x4a4d38, helmet: 0x595d45, boot: 0x2a2420, camo: 0, furn: POLY },
  by: { side: 'pact', coat: 0x535a3e, coatDk: 0x434933, trousers: 0x51573c, carrier: 0x4c5138, pouch: 0x434833, helmet: 0x4e5338, boot: BLACK, camo: 0, furn: 0x5a3a24 },
};

// ------------------------------------------------------------------ weapons (in the arms' frame)

/** A modern carbine or assault rifle: stock, receiver, magazine (curved for an AK), rail and optic, barrel. */
function carbine(c, { to = 0.86, ak = false, optic = true, short = false } = {}) {
  const end = short ? to - 0.12 : to;
  return [
    P.box(0.035, 0.07, 0.2, { x: 0.2, y: 1.29, z: -0.03, color: c.furn }),                                   // stock
    P.box(0.045, 0.065, 0.32, { x: 0.2, y: 1.32, z: 0.27, color: POLY }),                                    // receiver
    P.box(0.05, 0.055, 0.26, { x: 0.2, y: 1.325, z: short ? 0.5 : 0.56, color: c.furn }),                    // handguard
    ak ? P.box(0.03, 0.13, 0.05, { x: 0.2, y: 1.235, z: 0.36, rx: -0.35, color: c.furn === FDE ? POLY : 0x2a2622 }) // curved magazine
      : P.box(0.03, 0.12, 0.045, { x: 0.2, y: 1.24, z: 0.33, rx: -0.12, color: POLY }),
    P.box(0.025, 0.08, 0.035, { x: 0.2, y: 1.255, z: 0.2, rx: 0.3, color: POLY }),                           // grip
    P.cyl(0.011, 0.011, end - 0.62, { x: 0.2, y: 1.33, z: (end + 0.62) / 2, rx: Math.PI / 2, color: STEEL }, 6), // barrel
    P.cyl(0.016, 0.016, 0.05, { x: 0.2, y: 1.33, z: end - 0.02, rx: Math.PI / 2, color: BLACK }, 6),          // flash hider
    ...(optic ? [P.box(0.035, 0.045, 0.09, { x: 0.2, y: 1.38, z: 0.26, color: BLACK }), P.cyl(0.018, 0.018, 0.03, { x: 0.2, y: 1.385, z: 0.32, rx: Math.PI / 2, color: 0x2c3a40 }, 8)] : []),
  ];
}

function weapon(kind, army, c) {
  const ak = army === 'ru' || army === 'by';
  switch (kind) {
    case 'mg': return { // belt-fed: the box of belt under it, the bipod folded, a longer heavier barrel
      parts: [...carbine(c, { to: 0.98, optic: army !== 'by' }),
        P.box(0.09, 0.09, 0.1, { x: 0.15, y: 1.25, z: 0.3, color: army === 'us' ? FDE : 0x3a3d30 }),
        ...pair((s) => P.box(0.01, 0.01, 0.2, { x: 0.2 + s * 0.02, y: 1.31, z: 0.8, color: STEEL }))],
      muzzle: { x: 0.2, y: 1.33, z: 0.98 } };
    case 'at': if (army === 'by') return { // RPG-7: the tube on the shoulder, the warhead's cone in front
      parts: [P.cyl(0.024, 0.024, 0.95, { x: 0.17, y: 1.5, z: 0.25, rx: Math.PI / 2, color: 0x4a4a38 }, 8),
        P.cyl(0.045, 0.012, 0.2, { x: 0.17, y: 1.5, z: 0.82, rx: -Math.PI / 2, color: 0x4f5638 }, 10),
        P.cyl(0.04, 0.04, 0.12, { x: 0.17, y: 1.5, z: -0.2, rx: Math.PI / 2, color: BLACK }, 8)],
      muzzle: { x: 0.17, y: 1.5, z: 0.92 } };
      return { // Javelin / Spike / Kornet-style: the fat launch tube on the shoulder, the sight unit at the side
        parts: [P.cyl(0.075, 0.075, 1.15, { x: 0.17, y: 1.5, z: 0.3, rx: Math.PI / 2, color: army === 'us' ? 0x5a5a40 : 0x3d4232 }, 12),
          P.box(0.16, 0.13, 0.18, { x: 0.05, y: 1.5, z: 0.2, color: army === 'us' ? FDE : 0x2c2e26 }),         // command launch unit
          P.cyl(0.03, 0.03, 0.06, { x: 0.05, y: 1.5, z: 0.32, rx: Math.PI / 2, color: 0x2c3a40 }, 8)],
        muzzle: { x: 0.17, y: 1.5, z: 0.88 } };
    case 'manpads': return { // the long tube, the grip stock and its IFF antenna
      parts: [P.cyl(0.04, 0.04, 1.5, { x: 0.17, y: 1.52, z: 0.35, rx: Math.PI / 2, color: army === 'us' ? 0x4b5236 : 0x3f4a34 }, 10),
        P.box(0.04, 0.12, 0.1, { x: 0.17, y: 1.42, z: 0.25, color: BLACK }),
        P.box(0.1, 0.008, 0.008, { x: 0.12, y: 1.58, z: 0.4, color: STEEL })],
      muzzle: { x: 0.17, y: 1.52, z: 1.1 } };
    case 'mortar': return { // the tube at a slant, bipod, baseplate
      parts: [P.cyl(0.04, 0.044, 1.1, { x: 0.05, y: 1.06, z: 0.62, rx: 0.65, color: 0x3f4232 }, 12),
        ...pair((s) => limb([0.05 + s * 0.03, 1.2, 0.76], [0.05 + s * 0.3, 0.56, 0.88], [[0, 0.014, 0.014], [1, 0.014, 0.014]], { color: STEEL }, 5)),
        P.box(0.38, 0.04, 0.38, { x: 0.05, y: 0.56, z: 0.26, color: STEEL })],
      muzzle: { x: 0.05, y: 1.53, z: 0.98 } };
    case 'sniper': return { // long barrel, a big scope
      parts: [...carbine(c, { to: 1.1, ak, optic: false }),
        P.cyl(0.02, 0.02, 0.32, { x: 0.2, y: 1.395, z: 0.3, rx: Math.PI / 2, color: BLACK }, 10),
        P.cyl(0.027, 0.02, 0.05, { x: 0.2, y: 1.395, z: 0.48, rx: Math.PI / 2, color: BLACK }, 10)],
      muzzle: { x: 0.2, y: 1.33, z: 1.1 } };
    case 'smg': return { parts: carbine(c, { short: true, ak }), muzzle: { x: 0.2, y: 1.33, z: 0.74 } };
    default: return { parts: carbine(c, { ak, optic: army !== 'by', to: ak ? 0.9 : 0.86 }), muzzle: { x: 0.2, y: 1.33, z: ak ? 0.9 : 0.86 } };
  }
}

// ------------------------------------------------------------------ headgear

function headgear(army, c, crew, scout) {
  const C = { camo: c.camo };
  if (crew) return [ // the tanker's helmet: a rounded shell with ear cups and a boom mic
    helmet([[1.72, 0.105, 1.08], [1.76, 0.112], [1.81, 0.106], [1.845, 0.085], [1.868, 0.04]], { color: army === 'us' ? 0x6c6248 : 0x2a2a24, skirt: 0.03 }),
    ...pair((s) => P.cyl(0.045, 0.045, 0.04, { x: s * 0.1, y: 1.73, rz: Math.PI / 2, color: 0x2a2a24 }, 10)),
    P.cyl(0.006, 0.006, 0.12, { x: 0.07, y: 1.69, z: 0.09, rx: 1.2, ry: -0.5, color: BLACK }, 4),
  ];
  if (scout) return [ // a boonie hat / panama, the face half in a shemagh
    P.cyl(0.18, 0.19, 0.012, { y: 1.8, color: c.coat, ...C }, 16),
    loft([[0, 1.8, -0.01, 0.105, 0.115, 2.4], [0, 1.86, -0.012, 0.095, 0.105, 2.4], [0, 1.885, -0.012, 0.03, 0.03, 2]], { color: c.coat, ...C }, 12),
  ];
  const hi = army === 'us' || army === 'pl'; // high-cut shells: the ears free for the headset
  return [
    helmet(hi ? [[1.77, 0.148, 1.1], [1.79, 0.146], [1.82, 0.137], [1.848, 0.115], [1.866, 0.08], [1.878, 0.03]]
      : [[1.745, 0.152, 1.1], [1.77, 0.15], [1.81, 0.14], [1.842, 0.119], [1.864, 0.084], [1.878, 0.03]], { color: c.helmet, ...C, skirt: hi ? 0 : 0.04 }),
    ...(hi ? [
      ...pair((s) => P.box(0.012, 0.025, 0.12, { x: s * 0.142, y: 1.79, color: BLACK })),                // side rails
      ...pair((s) => P.box(0.03, 0.06, 0.05, { x: s * 0.13, y: 1.73, z: 0.01, color: BLACK })),           // ear cups of the headset
      P.box(0.05, 0.035, 0.02, { y: 1.81, z: 0.15, color: BLACK }),                                       // night-vision mount
      P.box(0.08, 0.045, 0.04, { y: 1.82, z: -0.15, color: c.pouch }),                                    // counterweight / battery
    ] : [
      loft([[0, 1.79, -0.008, 0.152, 0.165, 2], [0, 1.805, -0.008, 0.149, 0.162, 2]], { color: c.coatDk }, 14), // the cover's band
      ...pair((s) => P.box(0.008, 0.12, 0.014, { x: s * 0.075, y: 1.68, z: 0.035, rz: s * -0.25, color: BLACK })),
    ]),
  ];
}

// ------------------------------------------------------------------ the man

export function buildModernSoldier({ army = 'us', weapon: kind = 'rifle', crew = false, scout = false, radio = false, airAssault = false } = {}) {
  const c = ARMY[army] ?? ARMY.us;
  const C = { camo: c.camo };
  const w = weapon(crew ? 'smg' : kind, army, c);
  const armour = !crew;
  const broad = armour ? 1.06 : 1;
  const russian = army === 'ru' || army === 'by';
  const torso = [
    ...trunk({ upper: c.coat, lower: c.trousers, camoUpper: c.camo, camoLower: c.camo, cut: 1.04, broad }),
    loft([[0, 1.535, -0.01, 0.12, 0.1, 2], [0, 1.58, -0.02, 0.112, 0.095, 2]], { color: c.coatDk, ...C }, 12),   // collar
    loft([[0, 1.045, 0, 0.198, 0.138, 3], [0, 1.09, 0, 0.194, 0.134, 3]], { color: c.pouch }, 12),               // the battle belt
    ...pair((s) => P.box(0.07, 0.09, 0.05, { x: s * 0.15, y: 1.06, z: 0.11, color: c.pouch })),                // its pouches
    P.box(0.1, 0.12, 0.05, { x: -0.16, y: 1.0, z: -0.12, color: c.pouch }),                                       // IFAK / dump pouch
    ...(armour ? [
      // the plate carrier: front and back plates, the shoulder straps, three rifle magazines in front, the radio pouch
      loft([[0, 1.14, 0.03, 0.2, 0.155, 3], [0, 1.3, 0.04, 0.215, 0.165, 3], [0, 1.47, 0.02, 0.22, 0.16, 3], [0, 1.53, 0.0, 0.18, 0.14, 2.6]], { color: c.carrier }, 14),
      ...(russian ? [loft([[0, 1.52, -0.02, 0.15, 0.12, 2], [0, 1.6, -0.03, 0.14, 0.11, 2]], { color: c.carrier }, 12)] : []), // the Ratnik's armoured collar
      ...[-0.07, 0, 0.07].map((x) => P.box(0.06, 0.1, 0.05, { x, y: 1.24, z: 0.2, color: c.pouch })),
      P.box(0.07, 0.11, 0.05, { x: 0.15, y: 1.42, z: 0.17, color: c.pouch }),
      P.box(0.3, 0.32, 0.07, { y: 1.33, z: -0.18, color: c.carrier }),                                           // the back plate and its pack
      ...(army === 'us' || army === 'pl' ? [P.box(0.2, 0.22, 0.09, { y: 1.3, z: -0.25, color: c.pouch })] : []), // assault pack / hydration
    ] : []),
    ...(radio ? [
      loft([[0, 1.2, -0.27, 0.13, 0.07, 5], [0, 1.46, -0.28, 0.13, 0.07, 5]], { color: 0x3a3d30 }, 10),
      P.cyl(0.006, 0.006, 1.1, { x: 0.09, y: 2.05, z: -0.3, rx: -0.1, color: BLACK }, 4),
    ] : []),
    ...(airAssault ? [P.box(0.22, 0.05, 0.05, { y: 1.81, z: 0.12, color: BLACK })] : []),                       // goggles on the helmet
    ...head(),
    ...headgear(army, c, crew, scout),
    ...(scout ? binoculars(BLACK) : []),
  ];
  const arms = [...armsHold({ sleeve: c.coat, camo: c.camo, broad, glove: army === 'us' || army === 'pl' ? 0x3a3428 : null, band: FACTIONS[c.side].marking }), ...w.parts];
  const thigh = merge([
    thighPart({ color: c.trousers, ...C }),
    P.box(0.04, 0.15, 0.16, { x: 0.098, y: -0.24, color: c.coatDk, ...C }),                                       // cargo pocket
  ]);
  const shin = grime(merge([
    ...shinPart({ color: c.trousers, ...C, boot: c.boot, bootTop: 0.22 }),
    P.box(0.11, 0.1, 0.05, { y: -0.02, z: 0.06, color: BLACK }),                                                   // knee pad
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
