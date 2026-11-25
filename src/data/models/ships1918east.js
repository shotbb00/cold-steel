// 1918 warships of the east (data/units1918/navyEast.js): the Russian Baltic Fleet of Moon Sound, 1917, and the
// Ottoman Navy of the Dardanelles and the Black Sea. Built on the same warship builder as the North Sea's
// (models/ships1918.js warship / uboat / steamer), at their real size, bow toward +z. Russian ships in the
// Baltic's dark grey, the Ottomans in the Mediterranean's light grey (Yavuz and Midilli kept their German paint).
import { P, merge } from '../units/geometry.js';
import { KIT } from './ships1945.js';
import { warship, uboat, steamer } from './ships1918.js';

const { ship, sub, BLACK } = KIT;
const RU = { hull: 0x565c5a, deck: 0x857a62, upper: 0x626866, gun: 0x5a605e, black: BLACK, boat: 0x8a8a80 };   // the Baltic Fleet's dark grey
const OT = { hull: 0x8c9296, deck: 0x8a7e66, upper: 0x989ea2, gun: 0x8e9498, black: BLACK, boat: 0xa4a49a };   // the Ottoman light grey
const YS = { hull: 0x7e868e, deck: 0x887c64, upper: 0x8c949a, gun: 0x848c94, black: BLACK, boat: 0x9a9a90 };   // Yavuz, Midilli: still the Kaiserliche Marine's blue-grey

// ---------------------------------------------------------------- the Russian Baltic Fleet

/** Gangut: 181 m, twelve 12-inch in four triple turrets on one level along the centreline, two funnels, pole masts, the low flush deck. */
export const buildGangut = ship(() => warship(RU, {
  len: 181, beam: 26.9, fb: 6, draft: 8.4, sheer: 1.2,
  turrets: [57, 14, -22, -66].map((z, i) => ({ z, aft: i > 1, w: 10, d: 10.5, h: 3.4, barrels: 3, len: 14, cal: 0.32, arc: i === 0 || i === 3 ? 4.6 : 3.6 })),
  casemates: [-56, 46, 8, 1.6],
  bridge: { z: 44, w: 11, d: 7, h: 5 },
  house: [[-12, 4, 10, 3], [24, 40, 10, 3]],
  casing: 3,
  funnels: [[32, 3.2, 10], [-4, 3.2, 10]],
  fore: { z: 38, h: 26, y: 3, topR: 1.6, round: true },
  main: { z: -12, h: 24, y: 3, topR: 1.4, round: true },
  boats: [[6.5, 22, 8, 1], [-6.5, 22, 8, -1], [6.5, -8, 8, 1], [-6.5, -8, 8, -1]],
}));

/** Slava (Borodino class): 121 m, four 12-inch in two twin turrets, twelve 6-inch in six twin wing turrets, two tall funnels, the tumblehome hull. */
export const buildSlava = ship(() => warship(RU, {
  len: 121, beam: 23.2, fb: 7.5, draft: 8, sheer: 1.6, fc: [-36, 2.6],
  turrets: [{ z: 42, w: 9, len: 12, cal: 0.32, ears: false }, { z: -46, aft: true, w: 9, len: 12, cal: 0.32 },
    ...[[22, false], [2, false], [-18, true]].flatMap(([z, aft]) => [-1, 1].map((s) => ({ x: s * 7.6, z, up: 2.4, aft, w: 5, h: 2, d: 5.4, len: 7, cal: 0.13, arc: 3 })))],
  bridge: { z: 32, w: 13, d: 7, h: 6 },
  house: [[-30, 28, 9, 2.4]],
  casing: 2.4,
  funnels: [[10, 3, 13], [-8, 3, 13]],
  fore: { z: 28, h: 24, y: 2.4, topR: 1.8, round: true },
  main: { z: -30, h: 22, y: 2.4, topR: 1.4, round: true },
  boats: [[7, -2, 8, 1], [-7, -2, 8, -1]],
}));

/** Admiral Makarov (Bayan class): 137 m, two 8-inch singles in turrets fore and aft, 6-inch along the hull in casemates, four funnels, two masts. */
export const buildBayan = ship(() => warship(RU, {
  len: 137, beam: 17.5, fb: 6, draft: 6.5, sheer: 1.4, fc: [30, 2.2],
  turrets: [{ z: 52, w: 6.4, h: 2.6, barrels: 1, len: 10, cal: 0.22 }, { z: -54, aft: true, w: 6.4, h: 2.6, barrels: 1, len: 10, cal: 0.22 }],
  casemates: [-34, 26, 10, 1.6],
  bridge: { z: 40, w: 9, d: 6, h: 4 },
  house: [[-40, 32, 9, 2.6]],
  casing: 2.6,
  funnels: [[22, 1.9, 10], [10, 1.9, 10], [-2, 1.9, 10], [-14, 1.9, 10]],
  fore: { z: 34, h: 22, y: 2.6, topR: 1.4, round: true },
  main: { z: -34, h: 20, y: 2.6 },
  boats: [[5.5, -24, 7, 1], [-5.5, -24, 7, -1]],
}));

/** Novik: 102 m, four 102 mm singles, four twin torpedo tubes, four funnels in two pairs, the raised forecastle. */
export const buildNovik = ship(() => warship(RU, {
  len: 102, beam: 9.5, fb: 3.4, draft: 3, fc: [26, 2], rake: 0.06,
  guns: [{ z: 42, len: 4.6, cal: 0.09 }, { z: -8, len: 4.6, cal: 0.09, arc: 3.6 }, { z: -36, aft: true, len: 4.6, cal: 0.09 }, { z: -46, aft: true, len: 4.6, cal: 0.09 }],
  bridge: { z: 27, w: 5.5, d: 4.5, h: 2.8 },
  funnels: [[19, 1.2, 6], [13, 1.2, 6], [3, 1.2, 6], [-3, 1.2, 6]],
  fore: { z: 23, h: 14, y: 2 },
  main: { z: -30, h: 9 },
  tubeMounts: [[0, 8, 2], [0, -16, 2], [0, -22, 2], [0, -28, 2]],
  boats: [[3.6, -12, 5, 1]],
}));

/** Grozyashchiy: a 69 m armoured gunboat of 1890, low in the water, the big guns behind shields fore and aft, one funnel, two masts. */
export const buildGrozyashchiy = ship(() => warship(RU, {
  len: 69, beam: 12.6, fb: 2.6, draft: 3.8, sheer: 0.8, fc: [18, 1.6],
  guns: [{ z: 26, len: 6, cal: 0.13 }, { z: -28, aft: true, len: 6, cal: 0.13 }, { x: 4, z: 4, len: 4.6, cal: 0.1, arc: 2.6 }, { x: -4, z: 4, len: 4.6, cal: 0.1, arc: 2.6 }],
  bridge: { z: 14, w: 7, d: 4, h: 3 },
  house: [[-16, 10, 6, 2.2]],
  funnels: [[-2, 1.8, 8]],
  fore: { z: 10, h: 16, y: 2.2, topR: 1.1, round: true },
  main: { z: -18, h: 13 },
  boats: [[4.6, -10, 5, 1], [-4.6, -10, 5, -1]],
}));

/** Bars: a 68 m submarine, four tubes and the Drzewiecki drop-collars along the casing (here eight), two deck guns. */
export const buildBars = sub(() => {
  const len = 68, beam = 4.5, deck = beam * 0.16;
  return merge([
    uboat({ ...RU, hull: 0x4e5452, deck: 0x40444a }, { len, beam, tower: [4.4, 2.4, 3], gunZ: 12, gunLen: 2.6 }),
    ...[-18, -10, 12, 20].flatMap((z) => [-1, 1].map((s) => P.cyl(0.26, 0.26, 5, { x: s * (beam * 0.4 + 0.4), y: deck - 0.2, z, rx: Math.PI / 2, color: 0x3a3e40, surf: 'metal' }, 8))), // the drop collars' torpedoes, outside the casing
    P.box(0.8, 0.8, 1.2, { y: deck + 0.4, z: -9, color: RU.gun }), P.cyl(0.08, 0.1, 2.2, { y: deck + 0.8, z: -10.6, rx: Math.PI / 2, color: BLACK, surf: 'metal' }, 6), // the after gun
  ]);
});

/** Amur: a 91 m minelayer of 1907, two funnels, the mine ports and rails aft, a few 120 mm guns. */
export const buildAmur = ship(() => warship(RU, {
  len: 91, beam: 14, fb: 5, draft: 4.5, fc: [20, 2],
  guns: [{ z: 38, len: 5, cal: 0.1 }, { x: 4.6, z: 4, len: 5, cal: 0.1, arc: 2.8 }, { x: -4.6, z: 4, len: 5, cal: 0.1, arc: 2.8 }, { z: -20, y: 2, aft: true, len: 5, cal: 0.1 }],
  bridge: { z: 24, w: 8, d: 5, h: 3.4 },
  house: [[-14, 18, 8, 2.4]],
  funnels: [[10, 2, 9], [-2, 2, 9]],
  fore: { z: 20, h: 18, y: 2, topR: 1.1, round: true },
  main: { z: -14, h: 15 },
  mineRails: [-44, -24],
  boats: [[5, -6, 6, 1], [-5, -6, 6, -1]],
}));

/** Fugas: a 50 m coal-fired minesweeper, one funnel, a 63 mm forward, the sweep gear over the stern. */
export const buildFugas = ship(() => warship(RU, {
  len: 50, beam: 6.4, fb: 2.6, draft: 2.2, fc: [10, 1.6],
  guns: [{ z: 18, len: 3, cal: 0.07 }, { z: -6, aft: true, len: 3, cal: 0.07 }],
  bridge: { z: 10, w: 4.4, d: 3, h: 2.4 },
  funnels: [[1, 1.1, 5]],
  fore: { z: 7, h: 10, y: 1.6 },
  gallows: -22,
}));

// ---------------------------------------------------------------- the Ottoman Navy

/**
 * Yavuz Sultan Selim (ex-Goeben, Moltke class): 186.6 m, ten 28 cm in five twin turrets — A forward, the two wing
 * turrets en echelon amidships between the funnels, C superfiring over D aft — two funnels, the pole masts.
 */
export const buildYavuz = ship(() => warship(YS, {
  len: 186.6, beam: 29.4, fb: 7, draft: 9, sheer: 3, fc: [-34, 2.6],
  turrets: [{ z: 62, w: 8.6, len: 12, cal: 0.3, ears: true }, { x: 9, z: 12, w: 8.6, len: 12, cal: 0.3, ears: true, arc: 3.2 }, { x: -9, z: 4, w: 8.6, len: 12, cal: 0.3, ears: true, arc: 3.2 },
    { z: -46, up: 3, aft: true, w: 8.6, len: 12, cal: 0.3, ears: true }, { z: -60, aft: true, w: 8.6, len: 12, cal: 0.3, ears: true }],
  casemates: [-30, 44, 7, 1.4],
  bridge: { z: 46, w: 12, d: 9, h: 6 },
  house: [[-34, 40, 9, 3.6]],
  casing: 3.6,
  funnels: [[28, 3.6, 12], [-14, 3.6, 12]],
  fore: { z: 38, h: 26, y: 3.6, topR: 2, round: true },
  main: { z: -26, h: 22, y: 3.6 },
  boats: [[6, 18, 8, 1], [-6, 18, 8, -1], [6, -4, 8, 1], [-6, -4, 8, -1]],
}));

/** Midilli (ex-Breslau, Magdeburg class): 138.7 m, eight 15 cm after her 1917 refit, four funnels, the raised forecastle, mine rails aft. */
export const buildMidilli = ship(() => warship(YS, {
  len: 138.7, beam: 13.5, fb: 5, draft: 4.4, fc: [28, 2.4],
  guns: [{ x: 2.4, z: 56, len: 6, cal: 0.13 }, { x: -2.4, z: 56, len: 6, cal: 0.13 }, { x: 5.4, z: 20, len: 6, cal: 0.13, arc: 3 }, { x: -5.4, z: 20, len: 6, cal: 0.13, arc: 3 },
    { x: 5.4, z: -24, aft: true, len: 6, cal: 0.13, arc: 3 }, { x: -5.4, z: -24, aft: true, len: 6, cal: 0.13, arc: 3 }, { z: -48, y: 2.2, aft: true, len: 6, cal: 0.13 }, { z: -58, aft: true, len: 6, cal: 0.13 }],
  bridge: { z: 38, w: 8, d: 6, h: 4 },
  house: [[-18, 26, 8, 2.4]],
  funnels: [[22, 1.9, 10], [12, 1.9, 10], [2, 1.9, 10], [-8, 1.9, 10]],
  fore: { z: 32, h: 22, y: 2.4, topR: 1.3, round: true },
  main: { z: -36, h: 18 },
  mineRails: [-66, -52],
  boats: [[5, -14, 7, 1], [-5, -14, 7, -1]],
}));

/** Turgut Reis (ex-Weissenburg, Brandenburg class): 115.7 m, six 28 cm in three twin turrets on the centreline, the middle one short-barrelled, two funnels abreast. */
export const buildTurgutReis = ship(() => {
  const w = warship(OT, {
    len: 115.7, beam: 19.5, fb: 6, draft: 7.6, sheer: 1.4, fc: [-26, 2.4],
    turrets: [{ z: 40, w: 8.4, len: 11, cal: 0.29 }, { z: -14, aft: true, w: 8.4, len: 8, cal: 0.29 }, { z: -44, aft: true, w: 8.4, len: 11, cal: 0.29 }],
    casemates: [-6, 26, 8, 1.4],
    bridge: { z: 28, w: 11, d: 6, h: 5 },
    house: [[-4, 24, 10, 2.6]],
    casing: 2.6,
    fore: { z: 24, h: 22, y: 2.6, topR: 1.8, round: true },
    main: { z: -30, h: 18 },
    boats: [[6, -2, 7, 1], [-6, -2, 7, -1]],
  });
  // the two funnels side by side abreast amidships (the warship builder sets them on the centreline)
  const y = 6 + 2.4 + 2.6;
  w.fixed = merge([w.fixed, ...[-1, 1].flatMap((s) => [P.cyl(2, 2.1, 11, { x: s * 3.2, y: y + 5.5, z: 10, color: OT.upper }, 14), P.cyl(2.1, 2.1, 0.8, { x: s * 3.2, y: y + 10.6, z: 10, color: BLACK }, 14)])]);
  return w;
});

/** Muavenet-i Milliye (the German S 165 type, 1910): 74 m, two 75 mm and two 57 mm, three tubes, two funnels, the turtleback forecastle. */
export const buildMuavenet = ship(() => warship(OT, {
  len: 74, beam: 7.9, fb: 2.8, draft: 3, fc: [16, 1.6], rake: 0.04,
  guns: [{ z: 30, len: 3.6, cal: 0.08 }, { x: 2.4, z: 6, len: 2.8, cal: 0.06, arc: 2.6 }, { x: -2.4, z: 6, len: 2.8, cal: 0.06, arc: 2.6 }, { z: -32, aft: true, len: 3.6, cal: 0.08 }],
  bridge: { z: 18, w: 4.6, d: 3.4, h: 2.2 },
  funnels: [[10, 1.3, 5.5], [-2, 1.3, 5.5]],
  fore: { z: 14, h: 11, y: 1.6 },
  main: { z: -22, h: 7 },
  tubeMounts: [[0, -10, 1], [0, -18, 1], [0, 2, 1]],
}));

/** Peyk-i Şevket: an 80 m torpedo gunboat from Krupp (1907), two 105 mm, six 57 mm along the waist, two funnels. */
export const buildPeyk = ship(() => warship(OT, {
  len: 80, beam: 8.4, fb: 3.4, draft: 3, fc: [18, 1.8],
  guns: [{ z: 32, len: 4.2, cal: 0.09 }, { z: -34, aft: true, len: 4.2, cal: 0.09 },
    ...[12, -2, -16].flatMap((z) => [-1, 1].map((s) => ({ x: s * 3, z, aft: z < 0, len: 2.6, cal: 0.05, arc: 2.6 })))],
  bridge: { z: 21, w: 5, d: 3.6, h: 2.6 },
  funnels: [[6, 1.3, 6], [-6, 1.3, 6]],
  fore: { z: 17, h: 13, y: 1.8 },
  main: { z: -24, h: 9 },
  tubeMounts: [[0, -26, 1]],
}));

/** Nusret: a 40 m minelayer, one funnel, a pair of 47 mm, the mines on rails over the stern — the one that sank three battleships off Kephez. */
export const buildNusret = ship(() => warship(OT, {
  len: 40, beam: 7.5, fb: 2.4, draft: 2.4, sheer: 0.8, fc: [8, 1.4],
  guns: [{ z: 14, len: 2, cal: 0.05 }, { z: -2, aft: true, len: 2, cal: 0.05 }],
  bridge: { z: 8, w: 4, d: 2.6, h: 2 },
  funnels: [[2, 1.1, 5]],
  fore: { z: 6, h: 10, y: 1.4 },
  mineRails: [-18, -6],
}));

/** An Ottoman steamer taken up for trooping (Gül Cemal, the Bosporus liners): black hull, buff upperworks, the red-banded funnel. */
export const buildTroopshipOT = ship(() => steamer({ ...OT, hull: 0x262626, upper: 0x8a8070, funnel: 0x2a2a2a }, { len: 118, beam: 15, fb: 6, band: 0xa02a22 }));
