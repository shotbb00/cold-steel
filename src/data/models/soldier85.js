// The 1985 infantrymen of the Northern Flank and Korea (data/epoch.js), one builder for the four armies
// on the soldierBody.js figure, same model contract as natoSoldier.js (render/StackRenderer.js):
//   no    Norwegian Army, Brigade Nord in winter: the white snow anorak and over-trousers over the M75
//         field uniform, the M1-pattern helmet in a white cover, green webbing; AG3 (the licence G3) and
//         MG3 from the Bundeswehr's kit, Carl Gustaf, M72. Crews in green with the black beret.
//   usmc  US Marine Corps on the Norwegian winter exercises: the overwhite parka and trousers over the woodland,
//         PASGT helmet in a white cover, ALICE gear; M16A2, M60, the Marines' kit as the Army's.
//   rok   ROK Army: plain olive-green fatigues, the M1 helmet under a net, ALICE-type webbing; M16, M60.
//   kpa   Korean People's Army: the khaki-brown cotton uniform, the canvas chest rig for three AK
//         magazines, a Soviet-pattern steel helmet; the AK (Type 58/68), PK, RPG-7, SVD from the NVA's kit.
//         Militia (the Worker-Peasant Red Guards): grey-brown work clothes and a soft cap.
// Options as natoSoldier: weapon, crew, scout, radio; `militia` for the Red Guards.
import { P, merge, pair, grime, loft } from '../units/geometry.js';
import { FACTIONS } from '../factions.js';
import { head, trunk, arms as armsHold, thigh as thighPart, shin as shinPart, helmet, binoculars, finish } from './soldierBody.js';
import { weapon as natoWeapon } from './natoSoldier.js';
import { weapon as bwWeapon } from './bwSoldier.js';
import { weapon as nvaWeapon } from './nvaSoldier.js';

const BLACK = 0x161616;
const SNOW = 0xd9dcd8;
const SNOW_DK = 0xc2c6c2;

const ARMY = {
  no: { side: 'nato', coat: SNOW, coatDk: SNOW_DK, trousers: SNOW, web: 0x51553a, helmet: 0xd0d3cf, boot: BLACK, under: 0x4d5236, camo: 0,
    arm: (k) => (k === 'rifle' || k === 'mg' || k === 'smg' ? bwWeapon : natoWeapon)(k) },
  usmc: { side: 'nato', coat: SNOW, coatDk: SNOW_DK, trousers: SNOW, web: 0x58563a, helmet: 0xd0d3cf, boot: BLACK, under: 0x4b5331, camo: 0, arm: natoWeapon },
  rok: { side: 'nato', coat: 0x4c5234, coatDk: 0x3d4229, trousers: 0x4c5234, web: 0x5d5a3c, helmet: 0x464d32, boot: BLACK, under: 0x4c5234, camo: 0, arm: natoWeapon },
  kpa: { side: 'pact', coat: 0x6b6440, coatDk: 0x57512f, trousers: 0x6b6440, web: 0x7a7350, helmet: 0x4a5136, boot: 0x2a2018, under: 0x6b6440, camo: 0, arm: nvaWeapon },
};
const MILITIA = { coat: 0x5e5a4a, coatDk: 0x4b483b, trousers: 0x55524a };

/** A soft peaked field cap (the KPA's with its red star, the ROK's patrol cap). */
const cap = (color, dk, star) => [
  loft([[0, 1.77, -0.008, 0.1, 0.11, 2.4], [0, 1.83, -0.01, 0.1, 0.11, 2.4], [0, 1.865, -0.012, 0.085, 0.095, 2.4], [0, 1.875, -0.012, 0.02, 0.02, 2]], { color }, 12),
  P.box(0.15, 0.01, 0.07, { y: 1.785, z: 0.125, rx: 0.12, color: dk }),
  ...(star ? [P.box(0.025, 0.025, 0.01, { y: 1.815, z: 0.107, rz: 0.78, color: 0xb02a20 })] : []),
];

function headgear(army, c, { crew, scout, militia }) {
  if (militia) return cap(MILITIA.coatDk, MILITIA.coatDk, true);
  if (crew) {
    if (army === 'no') return [ // the armoured troops' black beret with the headset over it
      loft([[0.01, 1.795, -0.005, 0.1, 0.11, 2.2], [0.03, 1.83, -0.01, 0.124, 0.13, 2.2], [0.045, 1.852, -0.01, 0.1, 0.11, 2.2], [0.05, 1.858, -0.01, 0.02, 0.02, 2]], { color: 0x141414 }, 12),
      ...pair((s) => P.cyl(0.04, 0.04, 0.035, { x: s * 0.1, y: 1.73, rz: Math.PI / 2, color: BLACK }, 10)),
      P.box(0.22, 0.012, 0.02, { y: 1.85, color: BLACK }),
    ];
    return [ // the tanker's helmet (the KPA's padded cloth one in black)
      helmet([[1.72, 0.105, 1.08], [1.76, 0.112], [1.81, 0.106], [1.845, 0.085], [1.868, 0.04]], { color: army === 'kpa' ? 0x1c1c1c : 0x3d4230, skirt: 0.03 }),
      ...pair((s) => P.cyl(0.045, 0.045, 0.04, { x: s * 0.1, y: 1.73, rz: Math.PI / 2, color: 0x2a2a24 }, 10)),
    ];
  }
  if (scout) {
    if (army === 'no') return [ // the ski troops' white knitted cap
      loft([[0, 1.75, -0.01, 0.106, 0.116, 2.2], [0, 1.82, -0.012, 0.104, 0.114, 2.2], [0, 1.87, -0.012, 0.075, 0.085, 2.2], [0, 1.885, -0.012, 0.02, 0.02, 2]], { color: SNOW_DK }, 12),
    ];
    if (army === 'usmc') return [ // the boonie hat, white like the rest
      P.cyl(0.19, 0.2, 0.012, { y: 1.8, color: c.coat }, 16),
      loft([[0, 1.8, -0.01, 0.105, 0.115, 2.4], [0, 1.85, -0.012, 0.1, 0.11, 2.4], [0, 1.875, -0.012, 0.085, 0.095, 2.4], [0, 1.885, -0.012, 0.03, 0.03, 2]], { color: c.coat }, 12),
    ];
    return cap(c.coat, c.coatDk, army === 'kpa');
  }
  if (army === 'kpa') return [ // the Soviet-pattern steel helmet: a deep dome with a short flared rim
    helmet([[1.72, 0.158, 1.08], [1.745, 0.152], [1.785, 0.143], [1.825, 0.125], [1.855, 0.09], [1.874, 0.03]], { color: c.helmet, skirt: 0.02 }),
    ...pair((s) => P.box(0.008, 0.12, 0.014, { x: s * 0.075, y: 1.66, z: 0.035, rz: s * -0.25, color: c.web })),
  ];
  if (army === 'usmc') return [ // PASGT in its white cover, the band round it
    helmet([[1.75, 0.15, 1.1], [1.775, 0.148], [1.81, 0.138], [1.84, 0.118], [1.862, 0.082], [1.876, 0.03]], { color: c.helmet, skirt: 0.055 }),
    loft([[0, 1.785, -0.008, 0.15, 0.163, 2], [0, 1.802, -0.008, 0.147, 0.16, 2]], { color: 0x3c4428 }, 14),
  ];
  return [ // the M1 steel pot: the round shell with its short rim, a white cover (Norway) or a net (Korea)
    helmet([[1.745, 0.158, 1.06], [1.755, 0.152], [1.79, 0.143], [1.83, 0.125], [1.858, 0.088], [1.874, 0.03]], { color: c.helmet }),
    ...(army === 'rok' ? [1.78, 1.82].map((y) => loft([[0, y, -0.008, 0.147, 0.156, 2], [0, y + 0.008, -0.008, 0.144, 0.153, 2]], { color: 0x33382a }, 14)) : []),
    ...pair((s) => P.box(0.008, 0.12, 0.014, { x: s * 0.075, y: 1.68, z: 0.035, rz: s * -0.25, color: c.web })),
  ];
}

export function buildSoldier85({ army = 'no', weapon: kind = 'rifle', crew = false, scout = false, radio = false, militia = false } = {}) {
  const base = ARMY[army] ?? ARMY.no;
  // crews leave the snow kit off: Norway's in the green M75, the Marines in woodland
  const c = militia ? { ...base, ...MILITIA } : crew ? { ...base, coat: base.under, coatDk: base.coatDk === SNOW_DK ? 0x3e432b : base.coatDk, trousers: base.under } : base;
  const C = { camo: c.camo };
  const w = c.arm(crew ? 'smg' : kind);
  const gear = !(crew || scout || militia);
  const torso = [
    ...trunk({ upper: c.coat, lower: c.trousers, camoUpper: c.camo, camoLower: c.trousers === c.coat ? c.camo : 0, cut: 1.04 }),
    ...pair((s) => P.box(0.1, 0.1, 0.02, { x: s * 0.09, y: 1.38, z: 0.138, color: c.coatDk, ...C })),                // breast pockets
    loft([[0, 1.535, -0.01, 0.12, 0.1, 2], [0, 1.58, -0.02, 0.112, 0.095, 2]], { color: c.coatDk, ...C }, 12),        // collar
    loft([[0, 1.045, 0, 0.196, 0.136, 3], [0, 1.09, 0, 0.192, 0.132, 3]], { color: c.web }, 12),                        // belt
    ...(gear ? [
      ...(army === 'kpa' ? [
        // the canvas chest rig: three magazine pockets across the chest, the straps over the shoulders
        loft([[0, 1.2, 0.15, 0.16, 0.04, 4], [0, 1.36, 0.165, 0.165, 0.045, 4]], { color: c.web }, 10),
        ...[-0.09, 0, 0.09].map((x) => P.box(0.075, 0.03, 0.05, { x, y: 1.37, z: 0.17, rx: 0.15, color: c.coatDk })),
        ...pair((s) => loft([[0.1, 1.36, 0.16], [0.1, 1.48, 0.12], [0.08, 1.55, 0.02], [0.08, 1.5, -0.12]]
          .map(([x, y, z]) => [s * x, y, z, 0.018, 0.006, 2]), { color: c.web }, 6)),
        P.cyl(0.042, 0.045, 0.14, { x: 0.19, y: 1.0, z: -0.1, color: 0x3d4430 }, 10),                                    // canteen
        loft([[0, 1.24, -0.18, 0.13, 0.055, 4], [0, 1.4, -0.19, 0.135, 0.06, 4]], { color: c.coatDk }, 12),             // the small pack
      ] : [
        ...pair((s) => loft([[s * 0.1, 1.03, 0.148, 0.048, 0.03, 4], [s * 0.1, 1.14, 0.152, 0.05, 0.032, 4]], { color: c.web }, 8)), // magazine pouches
        ...pair((s) => P.box(0.1, 0.035, 0.065, { x: s * 0.1, y: 1.15, z: 0.152, rx: 0.15, color: c.web })),
        P.cyl(0.044, 0.047, 0.15, { x: -0.19, y: 1.0, z: -0.1, color: c.web }, 10),                                      // canteen
        ...pair((s) => loft([[0.11, 1.09, 0.142], [0.115, 1.25, 0.15], [0.11, 1.4, 0.14], [0.1, 1.52, 0.1], [0.08, 1.55, 0.02]]
          .map(([x, y, z]) => [s * x, y, z, 0.02, 0.006, 2]), { color: c.web }, 6)),                                     // the straps
        // the pack: Norway's and the Marines' big winter rucksack, Korea's small one
        loft([[0, 1.18, -0.21, 0.16, 0.07, 4], [0, 1.36, -0.24, 0.17, 0.085, 4.5], [0, army === 'rok' ? 1.48 : 1.58, -0.22, 0.15, 0.07, 4]], { color: army === 'no' ? 0x4f553a : c.web }, 12),
        ...(army === 'no' || army === 'usmc' ? [P.cyl(0.05, 0.05, 0.36, { y: 1.62, z: -0.22, rz: Math.PI / 2, color: SNOW_DK }, 8)] : []), // the sleeping mat rolled on top
      ]),
    ] : []),
    ...(radio ? [
      loft([[0, 1.2, gear ? -0.33 : -0.21, 0.145, 0.072, 5], [0, 1.48, gear ? -0.335 : -0.215, 0.145, 0.072, 5]], { color: 0x3f4430 }, 10),
      P.cyl(0.006, 0.006, 1.3, { x: 0.1, y: 2.15, z: gear ? -0.35 : -0.23, rx: -0.12, color: BLACK }, 4),
    ] : []),
    ...head(),
    ...headgear(army, c, { crew, scout, militia }),
    ...(scout ? binoculars(BLACK) : []),
  ];
  const arms = [...armsHold({ sleeve: c.coat, camo: c.camo, cuff: c.coatDk, band: FACTIONS[c.side].marking }), ...w.parts];
  const tc = c.trousers === c.coat ? c.camo : 0;
  const thigh = merge([
    thighPart({ color: c.trousers, camo: tc }),
    P.box(0.04, 0.15, 0.16, { x: 0.098, y: -0.24, color: c.trousers === SNOW ? SNOW_DK : c.coatDk, camo: tc }),        // cargo pocket
  ]);
  const shin = grime(merge(shinPart({ color: c.trousers, camo: tc, boot: c.boot, bootTop: army === 'kpa' ? 0.14 : 0.22 })), -0.3, -0.5);
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
