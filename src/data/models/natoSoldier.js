// NATO infantryman, mid-1980s US Army: M81 woodland BDU, PASGT helmet and flak vest, ALICE
// webbing and pack. The figure is the shared one in soldierBody.js (head with a face, shaped
// trunk, tapered limbs, hands, boots); this file dresses and arms it. Weapon variants: M16A2
// rifle, M60 machine gun, Carl Gustaf recoilless rifle, FIM-92 Stinger; crewmen wear a CVC
// helmet and carry an M3 grease gun. Forward observers carry the PRC-77 radio with its whip
// antenna; air assault troops (101st) wear goggles on the helmet, bandoliers across the chest
// and a lighter assault pack. A blue armband identifies the side. Model contract (see
// render/StackRenderer.js):
//   torso – everything above the hips except the arms, standing pose, feet at y = 0, facing +z
//   arms  – arms, hands and weapon, posed by the renderer around rig.shoulderY
//   glow  – identification markings (tinted with the faction marking colour)
//   thigh / shin – one leg segment, pivot at its top joint, hanging down -y
//   rig   – hip offset/height and segment lengths; muzzle – where rounds leave the weapon
import { P, merge, pair, grime, loft } from '../units/geometry.js';
import { head, trunk, arms as armsHold, thigh as thighPart, shin as shinPart, helmet, binoculars, finish } from './soldierBody.js';

const OD = 0x4b5331;
const OD_DK = 0x3c4428;
const BROWN = 0x5a4632;
const WEB = 0x58563a;
const POCKET = 0x4f4d33;
const BLACK = 0x1b1b1b;
const HELMET = 0x4d5733;
const STEEL = 0x2b2b2b;
const TANKER = 0x3d4230;

function weapon(kind) {
  switch (kind) {
    case 'mg': // M60
      return {
        parts: [
          P.box(0.07, 0.12, 0.6, { x: 0.2, y: 1.29, z: 0.38, color: STEEL }),
          P.cyl(0.024, 0.024, 0.55, { x: 0.2, y: 1.31, z: 0.95, rx: Math.PI / 2, color: STEEL }, 8),
          P.cyl(0.03, 0.026, 0.08, { x: 0.2, y: 1.31, z: 1.25, rx: Math.PI / 2, color: BLACK }, 8),
          P.box(0.05, 0.11, 0.26, { x: 0.2, y: 1.27, z: 0.0, color: BLACK }),
          P.box(0.11, 0.12, 0.13, { x: 0.13, y: 1.19, z: 0.36, color: OD }),
          P.box(0.02, 0.05, 0.14, { x: 0.2, y: 1.37, z: 0.55, color: STEEL }),
          ...pair((s) => P.box(0.015, 0.015, 0.32, { x: 0.2 + s * 0.06, y: 1.22, z: 1.02, rx: 0.9, color: STEEL })),
        ],
        muzzle: { x: 0.2, y: 1.31, z: 1.3 },
      };
    case 'at': // Carl Gustaf on the right shoulder
      return {
        parts: [
          P.cyl(0.06, 0.06, 1.1, { x: 0.17, y: 1.56, z: 0.15, rx: Math.PI / 2, color: OD_DK }, 12),
          P.cyl(0.085, 0.05, 0.16, { x: 0.17, y: 1.56, z: -0.45, rx: Math.PI / 2, color: STEEL }, 12),
          P.box(0.04, 0.12, 0.05, { x: 0.17, y: 1.47, z: 0.3, color: BLACK }),
          P.box(0.05, 0.06, 0.12, { x: 0.1, y: 1.62, z: 0.22, color: BLACK }),
        ],
        muzzle: { x: 0.17, y: 1.56, z: 0.72 },
      };
    case 'mortar': // M29A1 81 mm: tube planted at a slant, bipod, baseplate
      return {
        parts: [
          P.cyl(0.045, 0.05, 1.1, { x: 0.05, y: 1.05, z: 0.62, rx: 0.65, color: OD_DK }, 10),
          P.cyl(0.055, 0.055, 0.08, { x: 0.05, y: 1.49, z: 0.95, rx: 0.65, color: STEEL }, 10),
          ...pair((s) => P.cyl(0.012, 0.012, 0.75, { x: 0.05 + s * 0.18, y: 0.85, z: 0.95, rz: s * 0.35, color: STEEL }, 5)),
          P.box(0.38, 0.05, 0.38, { x: 0.05, y: 0.55, z: 0.28, color: STEEL }),
        ],
        muzzle: { x: 0.05, y: 1.5, z: 0.98 },
      };
    case 'manpads': // FIM-92 Stinger: the long tube, the grip stock with its IFF antenna
      return {
        parts: [
          P.cyl(0.05, 0.05, 1.5, { x: 0.17, y: 1.58, z: 0.2, rx: Math.PI / 2, color: OD_DK }, 12),
          P.cyl(0.065, 0.065, 0.06, { x: 0.17, y: 1.58, z: 0.96, rx: Math.PI / 2, color: OD }, 12),
          P.box(0.06, 0.16, 0.2, { x: 0.17, y: 1.45, z: 0.22, color: BLACK }),          // grip stock
          P.box(0.2, 0.02, 0.12, { x: 0.25, y: 1.7, z: 0.3, color: STEEL }),            // IFF antenna
          P.box(0.05, 0.07, 0.1, { x: 0.1, y: 1.64, z: 0.26, color: BLACK }),           // sight
        ],
        muzzle: { x: 0.17, y: 1.58, z: 0.98 },
      };
    case 'smg': // M3 grease gun
      return {
        parts: [
          P.cyl(0.035, 0.035, 0.3, { x: 0.2, y: 1.28, z: 0.3, rx: Math.PI / 2, color: STEEL }, 8),
          P.box(0.025, 0.12, 0.03, { x: 0.2, y: 1.2, z: 0.3, color: STEEL }),
          P.cyl(0.012, 0.012, 0.12, { x: 0.2, y: 1.28, z: 0.5, rx: Math.PI / 2, color: BLACK }, 6),
        ],
        muzzle: { x: 0.2, y: 1.28, z: 0.58 },
      };
    default: // M16A2: carry handle, ribbed round handguard, A2 front sight, curved 30-round magazine
      return {
        parts: [
          P.box(0.045, 0.06, 0.25, { x: 0.2, y: 1.33, z: 0.32, color: BLACK }),               // upper receiver
          P.box(0.04, 0.055, 0.17, { x: 0.2, y: 1.285, z: 0.33, color: BLACK }),              // lower receiver, magwell
          P.box(0.022, 0.028, 0.17, { x: 0.2, y: 1.388, z: 0.31, color: BLACK }),             // carry handle…
          ...[0.23, 0.39].map((z) => P.box(0.02, 0.03, 0.03, { x: 0.2, y: 1.362, z, color: BLACK })),
          P.box(0.014, 0.03, 0.03, { x: 0.2, y: 1.41, z: 0.24, color: BLACK }),               // …and its rear sight
          loft([[0.2, 1.268, 0.37, 0.013, 0.034, 4], [0.2, 1.2, 0.385, 0.013, 0.034, 4], [0.2, 1.135, 0.42, 0.013, 0.033, 4]], { color: BLACK }, 8), // magazine
          P.box(0.03, 0.09, 0.045, { x: 0.2, y: 1.235, z: 0.255, rx: 0.4, color: BLACK }),    // pistol grip
          P.box(0.012, 0.035, 0.075, { x: 0.2, y: 1.255, z: 0.31, color: BLACK }),            // trigger guard
          loft([[0.2, 1.318, 0.2, 0.02, 0.03, 3], [0.2, 1.305, 0.08, 0.022, 0.045, 3], [0.2, 1.298, -0.06, 0.023, 0.056, 3.4], [0.2, 1.298, -0.075, 0.022, 0.055, 3]], { color: BLACK }, 8), // stock
          loft([[0.2, 1.33, 0.44, 0.031, 0.031, 2], [0.2, 1.33, 0.5, 0.033, 0.033, 2], [0.2, 1.33, 0.64, 0.029, 0.029, 2]], { color: BLACK }, 10), // handguard
          ...[0.47, 0.53, 0.59].map((z) => P.cyl(0.034, 0.034, 0.008, { x: 0.2, y: 1.33, z, rx: Math.PI / 2, color: 0x252525 }, 10)), // ribs
          P.cyl(0.011, 0.011, 0.28, { x: 0.2, y: 1.33, z: 0.78, rx: Math.PI / 2, color: STEEL }, 6),   // barrel
          P.box(0.02, 0.07, 0.025, { x: 0.2, y: 1.355, z: 0.68, color: BLACK }),               // front sight base
          P.box(0.006, 0.03, 0.006, { x: 0.2, y: 1.4, z: 0.68, color: BLACK }),                // post
          P.cyl(0.016, 0.016, 0.05, { x: 0.2, y: 1.33, z: 0.92, rx: Math.PI / 2, color: STEEL }, 8),   // flash hider
        ],
        muzzle: { x: 0.2, y: 1.33, z: 0.95 },
      };
  }
}

export function buildNatoSoldier({ weapon: kind = 'rifle', crew = false, scout = false, radio = false, airAssault = false } = {}) {
  const w = weapon(kind);
  const armour = !(crew || scout);
  const broad = armour ? 1.05 : 1;
  const C = { camo: 1 };
  const torso = [
    // woodland BDU: trousers and the blouse worn over them
    ...trunk({ upper: OD, lower: OD, camoUpper: 1, camoLower: 1, cut: 1.04, broad }),
    ...pair((s) => P.box(0.1, 0.1, 0.02, { x: s * 0.09, y: 1.38, z: 0.14, color: OD_DK, ...C })),    // breast pockets
    // LC-2 pistol belt, ammo pouches with their flaps, canteen
    loft([[0, 1.05, 0, 0.196, 0.136, 3], [0, 1.09, 0, 0.192, 0.132, 3]], { color: WEB }, 12),
    ...pair((s) => loft([[s * 0.1, 1.03, 0.148, 0.046, 0.03, 4], [s * 0.1, 1.13, 0.152, 0.047, 0.032, 4]], { color: WEB }, 8)),
    ...pair((s) => P.box(0.095, 0.035, 0.065, { x: s * 0.1, y: 1.14, z: 0.152, rx: 0.15, color: WEB })),
    P.cyl(0.044, 0.047, 0.15, { x: -0.19, y: 1.0, z: -0.1, color: OD_DK, ...C }, 10),
    P.cyl(0.018, 0.018, 0.03, { x: -0.19, y: 1.085, z: -0.1, color: BLACK }, 6),
    // PASGT flak vest with its collar, medium ALICE pack on its frame (crewmen and scouts go without)
    ...(armour ? [
      loft([
        [0, 1.1, 0.0, 0.205, 0.15, 3], [0, 1.22, 0.01, 0.208, 0.155, 3], [0, 1.34, 0.016, 0.224, 0.163, 3],
        [0, 1.44, 0.008, 0.234, 0.157, 3.2], [0, 1.51, -0.004, 0.222, 0.138, 3], [0, 1.545, -0.01, 0.148, 0.11, 2.6],
      ], { color: OD_DK, ...C }, 14),
      loft([[0, 1.53, -0.012, 0.112, 0.102, 2], [0, 1.575, -0.02, 0.108, 0.097, 2]], { color: OD_DK, ...C }, 12),  // collar
      P.box(0.012, 0.36, 0.02, { y: 1.31, z: 0.172, color: 0x2a2a20 }),                 // front closure
      ...pair((s) => P.box(0.04, 0.4, 0.016, { x: s * 0.12, y: 1.32, z: 0.188, rz: s * -0.14, color: WEB })),  // LC-2 suspenders…
      ...pair((s) => P.box(0.04, 0.4, 0.016, { x: s * 0.1, y: 1.32, z: -0.165, rz: s * 0.2, color: WEB })),    // …crossing behind
      ...pair((s) => P.box(0.05, 0.06, 0.03, { x: s * 0.13, y: 1.43, z: 0.19, color: 0x2a2a20 })),            // first-aid pouch, snap links
      P.box(0.06, 0.14, 0.05, { x: 0.15, y: 1.25, z: 0.195, color: OD_DK, camo: 1 }),                           // compass pouch
      loft([[0, 1.2, -0.25, 0.16, 0.072, 4], [0, 1.36, -0.265, 0.165, 0.082, 4.5], [0, 1.5, -0.25, 0.15, 0.072, 4]], { color: WEB }, 12), // pack
      P.box(0.32, 0.06, 0.17, { y: 1.5, z: -0.255, rx: -0.15, color: POCKET }),          // flap
      ...[-0.11, 0, 0.11].map((x) => loft([[x, 1.24, -0.332, 0.042, 0.026, 4], [x, 1.33, -0.338, 0.044, 0.028, 4]], { color: POCKET }, 8)), // outer pockets
      ...pair((s) => P.box(0.02, 0.5, 0.02, { x: s * 0.13, y: 1.23, z: -0.2, color: 0x22241c })),           // frame
      P.cyl(0.042, 0.042, 0.34, { y: 1.15, z: -0.255, rz: Math.PI / 2, color: OD_DK, ...C }, 8),               // poncho roll
    ] : []),
    ...(radio ? [                                                                 // PRC-77 on the back
      loft([[0, 1.2, -0.335, 0.145, 0.072, 5], [0, 1.48, -0.34, 0.145, 0.072, 5]], { color: 0x3f4430 }, 10),
      P.box(0.06, 0.05, 0.05, { x: 0.1, y: 1.5, z: -0.33, color: BLACK }),
      P.cyl(0.006, 0.006, 1.3, { x: 0.1, y: 2.15, z: -0.36, rx: -0.12, color: BLACK }, 4), // whip antenna
      P.box(0.05, 0.1, 0.04, { x: -0.2, y: 1.6, z: 0.08, color: BLACK }),          // handset on the shoulder
    ] : []),
    ...(airAssault ? [
      P.box(0.06, 0.5, 0.05, { y: 1.33, z: 0.186, rz: 0.65, color: WEB }),           // bandoliers
      P.box(0.06, 0.5, 0.05, { y: 1.33, z: 0.19, rz: -0.65, color: WEB }),
      P.box(0.22, 0.05, 0.05, { y: 1.81, z: 0.12, color: BLACK }),                  // goggles on the helmet
      ...pair((s) => P.cyl(0.03, 0.03, 0.02, { x: s * 0.055, y: 1.81, z: 0.147, rx: Math.PI / 2, color: 0x6a7a70 }, 8)),
    ] : []),
    ...head(),
    ...(scout ? [
      P.cyl(0.19, 0.2, 0.012, { y: 1.8, color: OD, ...C }, 16),                 // boonie hat brim and crown
      loft([[0, 1.8, -0.01, 0.105, 0.115, 2.4], [0, 1.85, -0.012, 0.1, 0.11, 2.4], [0, 1.875, -0.012, 0.085, 0.095, 2.4], [0, 1.885, -0.012, 0.03, 0.03, 2]], { color: OD, ...C }, 12),
      ...binoculars(BLACK),                                                       // binoculars on the chest
      P.box(0.32, 0.2, 0.12, { y: 1.12, z: -0.185, color: WEB }),                  // butt pack, no ALICE frame
    ] : crew ? [
      // DH-132 combat vehicle crewman helmet: rounded shell with ear cups and a boom mic
      helmet([[1.72, 0.105, 1.08], [1.76, 0.112], [1.81, 0.106], [1.845, 0.085], [1.868, 0.04]], { color: TANKER, skirt: 0.03 }),
      ...pair((s) => P.cyl(0.045, 0.045, 0.04, { x: s * 0.1, y: 1.73, rz: Math.PI / 2, color: TANKER }, 10)),
      P.cyl(0.006, 0.006, 0.12, { x: 0.07, y: 1.69, z: 0.09, rx: 1.2, ry: -0.5, color: BLACK }, 4),
    ] : [
      // PASGT helmet in its woodland cover, the band round it, chin strap
      helmet([[1.75, 0.15, 1.1], [1.775, 0.148], [1.81, 0.138], [1.84, 0.118], [1.862, 0.082], [1.876, 0.03]], { color: HELMET, ...C, skirt: 0.055 }),
      loft([[0, 1.785, -0.008, 0.15, 0.163, 2], [0, 1.802, -0.008, 0.147, 0.16, 2]], { color: OD_DK }, 14),
      ...pair((s) => P.box(0.008, 0.12, 0.014, { x: s * 0.075, y: 1.68, z: 0.035, rz: s * -0.25, color: WEB })),
    ]),
  ];
  // arms and weapon: a separate part, pivoting at the shoulders (aim, lower, recoil, reload)
  const arms = [...armsHold({ sleeve: OD, ...C, broad }), ...w.parts];
  const glow = [
    P.cyl(0.08, 0.08, 0.06, { x: -0.272 * broad, y: 1.38, rz: 0.12 }, 10), // armband (team colour)
  ];
  const thigh = merge([
    thighPart({ color: OD, ...C }),
    P.box(0.04, 0.15, 0.16, { x: 0.098, y: -0.24, color: BROWN, ...C }), // cargo pocket and its flap
    P.box(0.045, 0.03, 0.165, { x: 0.1, y: -0.16, color: BROWN, ...C }),
  ]);
  const shin = grime(merge(shinPart({ color: OD, ...C, boot: BLACK, bootTop: 0.2 })), -0.3, -0.5); // muddy boots
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
