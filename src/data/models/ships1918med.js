// 1918 in the Mediterranean (data/units1918/navyMed.js): the Regia Marina, the k.u.k. Kriegsmarine and the Marine
// nationale, at their real size, bow toward +z, on the 1918 warship builder (models/ships1918.js warship: turrets on
// their barbettes, shielded singles, casemates, coal funnels, masts with their tops, tubes). The mounts are listed
// turrets first, then the single guns, in the order the unit's `mounts` fire them.
// Italian grey a touch darker than the k.u.k. light grey; the French a blue-grey ("gris bleu") with black funnel caps.
import { P, merge } from '../units/geometry.js';
import { KIT } from './ships1945.js';
import { warship, uboat, motorBoat, steamer, shielded, KUK, RM } from './ships1918.js';

const { ship, sub, BLACK } = KIT;
const MN = { hull: 0x6f7a84, deck: 0x8a7e66, upper: 0x7c8892, gun: 0x748089, black: BLACK, boat: 0x9a9c94 };   // the Marine nationale's blue-grey

/** A twin or triple turret of `cal` (m) guns `len` long, `w` wide. */
const T = (z, o) => ({ z, len: 13, cal: 0.32, w: 9, ...o });

// ---------------------------------------------------------------- the Regia Marina

/** Conte di Cavour: 176 m, thirteen 305 mm — triples A, Q, Y on the deck, twins B and X superfiring — two funnels either side of Q. */
export const buildCavour = ship(() => warship(RM, {
  len: 176, beam: 28, fb: 7, draft: 9.3, sheer: 1.8,
  turrets: [T(66, { barrels: 3 }), T(53, { up: 3, w: 8 }), T(0, { barrels: 3, aft: true, arc: 4 }), T(-50, { up: 3, aft: true, w: 8 }), T(-63, { barrels: 3, aft: true })],
  casemates: [-40, 40, 8, 2],
  bridge: { z: 38, w: 11, d: 8, h: 6 },
  house: [[-36, 32, 13, 3.5]],
  casing: 3.5,
  funnels: [[18, 3.2, 11], [-18, 3.2, 11]],
  fore: { z: 30, h: 24, y: 3.5, topR: 2 },
  main: { z: -30, h: 20, y: 3.5 },
  boats: [[7, 8, 8, 1], [-7, 8, 8, -1], [7, -8, 8, 1], [-7, -8, 8, -1]],
}));

/** Pisa: 140 m, an armoured cruiser — two twin 254 mm on the centreline, four twin 190 mm in wing turrets, three funnels. */
export const buildPisa = ship(() => warship(RM, {
  len: 140, beam: 21, fb: 6, draft: 7, fc: [-30, 2.4],
  turrets: [T(52, { len: 11, cal: 0.27, w: 7 }), T(-52, { aft: true, len: 11, cal: 0.27, w: 7 }),
    T(26, { x: 7.6, w: 5.6, len: 8, cal: 0.2, arc: 3 }), T(26, { x: -7.6, w: 5.6, len: 8, cal: 0.2, arc: 3 }),
    T(-24, { x: 7.6, aft: true, w: 5.6, len: 8, cal: 0.2, arc: 3 }), T(-24, { x: -7.6, aft: true, w: 5.6, len: 8, cal: 0.2, arc: 3 })],
  casemates: [-14, 14, 7, 1.6],
  bridge: { z: 40, w: 9, d: 6, h: 4 },
  house: [[-16, 14, 8, 2.6]],
  funnels: [[12, 2.4, 10], [1, 2.4, 10], [-10, 2.4, 10]],
  fore: { z: 34, h: 22, y: 2.4, topR: 1.6, round: true },
  main: { z: -36, h: 18, y: 2.4 },
  boats: [[5, -2, 7, 1], [-5, -2, 7, -1]],
}));

/** A PN torpedo boat (Pattison, Naples, 1917): 42 m, two 76 mm, two tall funnels, two 450 mm tubes. */
export const buildPN = ship(() => warship(RM, {
  len: 42.5, beam: 4.6, fb: 2.2, draft: 1.6, fc: [9, 1.2], rake: 0.03,
  guns: [{ z: 15, len: 3, cal: 0.06 }, { z: -15, aft: true, len: 3, cal: 0.06 }],
  bridge: { z: 10, w: 3.4, d: 2.6, h: 1.8 },
  funnels: [[3, 0.75, 4], [-3, 0.75, 4]],
  fore: { z: 7, h: 8, y: 1.2 },
  tubeMounts: [[0, -8, 2]],
}));

/** An F-class submarine (Fiat-Laurenti, 1916): 45.6 m, two bow tubes, a 76 mm forward of the tower. */
export const buildFClass = sub(() => uboat({ ...RM, hull: 0x6a7278, deck: 0x50565c }, { len: 45.6, beam: 4.2, tower: [4.2, 2.4, 0.5], gunZ: 6.5, gunLen: 3 }));

/** An Italian steamer taken up for trooping: grey hull, the black-topped buff funnel of the Navigazione Generale. */
export const buildPiroscafo = ship(() => steamer({ ...RM, hull: 0x4a5056, upper: 0x7e868a, funnel: 0xb89c62 }, { len: 112, beam: 14, fb: 5.5, band: 0x1c1e20 }));

/** Partenope: an old torpedo cruiser turned minelayer — 73 m, two funnels, two 76 mm, the mine rails aft. */
export const buildPartenope = ship(() => warship(RM, {
  len: 73, beam: 8.2, fb: 3.2, draft: 3.4, fc: [16, 1.8],
  guns: [{ z: 28, len: 4, cal: 0.08 }, { z: 2, len: 3, cal: 0.06, arc: 3.6 }],
  bridge: { z: 18, w: 5, d: 4, h: 2.6 },
  funnels: [[8, 1.3, 6], [-2, 1.3, 6]],
  fore: { z: 14, h: 13, y: 1.8 },
  main: { z: -10, h: 10 },
  mineRails: [-34, -14],
}));

/** An RD sweeper (rimorchiatore dragamine, 1916–18): 35 m, a tug's hull, one funnel, a 76 mm forward, the sweep aft. */
export const buildRD = ship(() => warship(RM, {
  len: 35, beam: 5.8, fb: 2.4, draft: 2, sheer: 0.9, fc: [7, 1.2],
  guns: [{ z: 12, len: 3, cal: 0.06 }, { z: -8, aft: true, len: 2, cal: 0.05 }],
  bridge: { z: 6, w: 3.6, d: 2.6, h: 2 },
  house: [[-6, 4, 3.6, 1.8]],
  funnels: [[0, 0.8, 4]],
  fore: { z: 5, h: 9, y: 1.2 },
  gallows: -15,
}));

// ---------------------------------------------------------------- the k.u.k. Kriegsmarine

/** SMS Viribus Unitis (Tegetthoff class): 152 m, twelve 30.5 cm in four triple turrets, superfiring pairs at each end, two funnels close together. */
export const buildTegetthoff = ship(() => warship(KUK, {
  len: 152, beam: 27.3, fb: 6.5, draft: 8.6, sheer: 1.4,
  turrets: [T(52, { barrels: 3, w: 9.5, ears: true }), T(39, { barrels: 3, up: 3, w: 9.5, ears: true }), T(-38, { barrels: 3, up: 3, aft: true, w: 9.5, ears: true }), T(-51, { barrels: 3, aft: true, w: 9.5, ears: true })],
  casemates: [-26, 26, 7, 1.8],
  bridge: { z: 28, w: 12, d: 8, h: 6.5 },
  house: [[-28, 22, 14, 4]],
  casing: 4,
  funnels: [[8, 3.2, 11], [-3, 3.2, 11]],
  fore: { z: 20, h: 24, y: 4, topR: 2.2, round: true },
  main: { z: -24, h: 20, y: 4 },
  boats: [[7, -12, 8, 1], [-7, -12, 8, -1]],
  vents: [[5, 2], [-5, 2]],
}));

/** SMS Radetzky: 139 m, the semi-dreadnought — twin 30.5 cm fore and aft, four twin 24 cm in wing turrets, three funnels. */
export const buildRadetzky = ship(() => warship(KUK, {
  len: 138.8, beam: 24.6, fb: 6.5, draft: 8.1, sheer: 1.6,
  turrets: [T(50, { w: 8.5, ears: true }), T(-50, { aft: true, w: 8.5, ears: true }),
    T(22, { x: 8.4, w: 6.4, len: 10, cal: 0.24, arc: 3 }), T(22, { x: -8.4, w: 6.4, len: 10, cal: 0.24, arc: 3 }),
    T(-22, { x: 8.4, aft: true, w: 6.4, len: 10, cal: 0.24, arc: 3 }), T(-22, { x: -8.4, aft: true, w: 6.4, len: 10, cal: 0.24, arc: 3 })],
  casemates: [-30, 30, 10, 1.6],
  bridge: { z: 36, w: 10, d: 7, h: 5 },
  house: [[-16, 14, 9, 3]],
  casing: 3,
  funnels: [[10, 2.6, 10], [0, 2.6, 10], [-10, 2.6, 10]],
  fore: { z: 31, h: 22, y: 3, topR: 1.8, round: true },
  main: { z: -32, h: 18, y: 3 },
  boats: [[6, 0, 7, 1], [-6, 0, 7, -1]],
}));

/** Tb 74 T (the 250-tonne boats, Trieste): 58 m, two 6.6 cm, one funnel, two twin tubes. */
export const buildTb250 = ship(() => warship(KUK, {
  len: 57.8, beam: 5.8, fb: 2.6, draft: 1.5, fc: [12, 1.4], rake: 0.03,
  guns: [{ z: 21, len: 3, cal: 0.06 }, { z: -22, aft: true, len: 3, cal: 0.06 }],
  bridge: { z: 13, w: 4, d: 3, h: 2 },
  funnels: [[2, 1.1, 4.8]],
  fore: { z: 10, h: 10, y: 1.4 },
  main: { z: -16, h: 7 },
  tubeMounts: [[0, -6, 2], [0, -13, 2]],
}));

/** SMS Chamäleon (1913): 72 m, a purpose-built minelayer — two funnels, two 6.6 cm, rails for the mines down the after deck. */
export const buildChamaleon = ship(() => warship(KUK, {
  len: 72, beam: 9, fb: 3.4, draft: 3, fc: [14, 2],
  guns: [{ z: 26, len: 3, cal: 0.06 }, { z: -6, aft: true, len: 3, cal: 0.06, arc: 3.6 }],
  bridge: { z: 16, w: 5.4, d: 4, h: 2.8 },
  house: [[-4, 12, 5.4, 2.2]],
  funnels: [[8, 1.3, 6], [0, 1.3, 6]],
  fore: { z: 13, h: 13, y: 2 },
  main: { z: -12, h: 10 },
  mineRails: [-34, -14],
}));

/** An Österreichischer Lloyd steamer in naval service: black hull, white upper works, the plain black Lloyd funnel. */
export const buildLloyd = ship(() => steamer({ ...KUK, hull: 0x2e3032, upper: 0x9a9c98, funnel: 0x2a2c2e }, { len: 105, beam: 13.4, fb: 5.5, band: 0x8c3a2c }));

// ---------------------------------------------------------------- the Marine nationale

/** Courbet: 166 m, twelve 305 mm in six twins — two superfiring at each end and one on either beam amidships — two widely spaced funnels. */
export const buildCourbet = ship(() => warship(MN, {
  len: 166, beam: 27, fb: 7.2, draft: 9, sheer: 2,
  turrets: [T(62, { w: 8.5 }), T(50, { up: 3, w: 8.5 }), T(4, { x: 9.6, w: 8, arc: 3 }), T(4, { x: -9.6, w: 8, arc: 3 }), T(-46, { up: 3, aft: true, w: 8.5 }), T(-58, { aft: true, w: 8.5 })],
  casemates: [-36, 38, 7, 1.8],
  bridge: { z: 37, w: 11, d: 8, h: 6 },
  house: [[-34, 30, 12, 3.5]],
  casing: 3.5,
  funnels: [[24, 3, 11], [-18, 3, 11]],
  band: BLACK,
  fore: { z: 31, h: 24, y: 3.5, topR: 1.8 },
  main: { z: -28, h: 22, y: 3.5, topR: 1.6 },
  boats: [[6.5, 12, 8, 1], [-6.5, 12, 8, -1], [6.5, -8, 8, 1], [-6.5, -8, 8, -1]],
}));

/** Waldeck-Rousseau (Edgar Quinet class): 159 m, an armoured cruiser — twin 194 mm fore and aft, single 194 mm turrets on the beams, six funnels in two groups of three. */
export const buildWaldeckRousseau = ship(() => warship(MN, {
  len: 159, beam: 21.5, fb: 6.5, draft: 8.4, sheer: 1.6, fc: [-36, 2.4],
  turrets: [T(58, { w: 7, len: 10, cal: 0.21 }), T(-58, { aft: true, w: 7, len: 10, cal: 0.21 }),
    T(34, { x: 8.4, barrels: 1, w: 4.4, len: 10, cal: 0.21, arc: 3 }), T(34, { x: -8.4, barrels: 1, w: 4.4, len: 10, cal: 0.21, arc: 3 }),
    T(-26, { x: 8.4, aft: true, barrels: 1, w: 4.4, len: 10, cal: 0.21, arc: 3 }), T(-26, { x: -8.4, aft: true, barrels: 1, w: 4.4, len: 10, cal: 0.21, arc: 3 })],
  casemates: [-12, 16, 7, 1.6],
  bridge: { z: 44, w: 9, d: 6, h: 4 },
  house: [[-24, 28, 8, 2.6]],
  funnels: [[24, 2, 10], [17, 2, 10], [10, 2, 10], [-4, 2, 10], [-11, 2, 10], [-18, 2, 10]],
  band: BLACK,
  fore: { z: 38, h: 22, y: 2.4, topR: 1.6, round: true },
  main: { z: -42, h: 18, y: 2.4 },
  boats: [[5.5, 3, 7, 1], [-5.5, 3, 7, -1]],
}));

/** Jurien de la Gravière: 137 m, a protected cruiser — eight 164.7 mm singles (one at each end, six on the beams), three funnels. */
export const buildJurien = ship(() => warship(MN, {
  len: 137, beam: 15, fb: 5, draft: 6.4, fc: [24, 2.2],
  guns: [{ z: 56, len: 6, cal: 0.12 }, { x: 6, z: 30, len: 6, cal: 0.12, arc: 3 }, { x: -6, z: 30, len: 6, cal: 0.12, arc: 3 }, { x: 6.4, z: 0, len: 6, cal: 0.12, arc: 3 }, { x: -6.4, z: 0, len: 6, cal: 0.12, arc: 3 },
    { x: 6, z: -30, aft: true, len: 6, cal: 0.12, arc: 3 }, { x: -6, z: -30, aft: true, len: 6, cal: 0.12, arc: 3 }, { z: -56, aft: true, len: 6, cal: 0.12 }],
  bridge: { z: 40, w: 8, d: 5, h: 3.6 },
  house: [[-20, 18, 7, 2.2]],
  funnels: [[12, 2.1, 10], [0, 2.1, 10], [-12, 2.1, 10]],
  band: BLACK,
  fore: { z: 34, h: 20, y: 2.2, topR: 1.3, round: true },
  main: { z: -38, h: 16 },
  boats: [[5, -18, 6.5, 1], [-5, -18, 6.5, -1]],
}));

/** Bisson (the 800-tonne type, 1913): 78 m, a 100 mm at each end, four 65 mm in the waist, three funnels, two twin tubes. */
export const buildBisson = ship(() => warship(MN, {
  len: 78, beam: 8, fb: 2.8, draft: 3, fc: [17, 1.6], rake: 0.04,
  guns: [{ z: 31, len: 4.2, cal: 0.08 }, { x: 2.6, z: 6, len: 3, cal: 0.06, arc: 2.6 }, { x: -2.6, z: 6, len: 3, cal: 0.06, arc: 2.6 }, { x: 2.6, z: -16, aft: true, len: 3, cal: 0.06, arc: 2.6 }, { x: -2.6, z: -16, aft: true, len: 3, cal: 0.06, arc: 2.6 }, { z: -33, aft: true, len: 4.2, cal: 0.08 }],
  bridge: { z: 20, w: 4.8, d: 3.6, h: 2.4 },
  funnels: [[11, 1.1, 5.5], [3, 1.1, 5.5], [-5, 1.1, 5.5]],
  band: BLACK,
  fore: { z: 17, h: 11, y: 1.6 },
  main: { z: -22, h: 8 },
  tubeMounts: [[0, -10, 2], [0, -26, 2]],
}));

/** Arras (aviso de 1re classe, 1918): 75 m, built to look like a merchantman from a periscope — one tall funnel, two 138.6 mm, depth charges aft. */
export const buildArras = ship(() => warship(MN, {
  len: 74.9, beam: 8.7, fb: 3.8, draft: 3.2, fc: [12, 2.2],
  guns: [{ z: 27, len: 5, cal: 0.1 }, { z: -30, aft: true, len: 5, cal: 0.1 }],
  bridge: { z: 10, w: 6, d: 4.6, h: 3.2 },
  house: [[-16, 6, 6, 2.4]],
  funnels: [[-4, 1.7, 7.5]],
  band: BLACK,
  fore: { z: 18, h: 15, y: 2.2 },
  main: { z: -22, h: 12 },
  boats: [[3.6, -10, 5, 1], [-3.6, -10, 5, -1]],
}));

/** Brumaire: 52 m, a Laubeuf submarine — the Drzewiecki drop collars along her casing as well as the bow tube, a small gun added in the war. */
export const buildBrumaire = sub(() => merge([
  uboat({ ...MN, hull: 0x5e6870, deck: 0x4c5258 }, { len: 52.1, beam: 5.4, tower: [3.6, 2.2, 1], gunZ: 7, gunLen: 2 }),
  ...[-1, 1].flatMap((s) => [-14, 12].map((z) => P.cyl(0.24, 0.24, 5, { x: s * 1.9, y: 0.6, z, rx: Math.PI / 2, color: 0x4c5258, surf: 'metal' }, 8))), // the drop collars' torpedoes
]));

/** A French motor torpedo boat: a long narrow hull, the torpedo on its frame, a machine gun. */
export const buildVedetteLT = ship(() => ({ fixed: motorBoat({ ...MN, hull: 0x66707a }, { len: 18.3, beam: 3.2, trough: false }), mounts: [{ geo: merge([P.box(0.1, 0.1, 0.1, { color: BLACK })]), at: [0, 1.4, 0], arc: 6 }] }));

/** A Messageries Maritimes liner taken up for trooping: grey hull, the black funnel. */
export const buildPaquebot = ship(() => steamer({ ...MN, hull: 0x3a3e42, upper: 0x8a8e8c, funnel: 0x262829 }, { len: 130, beam: 15.5, fb: 6.5, band: 0x262829 }));

/** Pollux (1913): a small minelayer — 62 m, two funnels, two 47 mm, rails aft. */
export const buildPollux = ship(() => warship(MN, {
  len: 62, beam: 8, fb: 3, draft: 2.8, fc: [12, 1.8],
  guns: [{ z: 23, len: 2.4, cal: 0.05 }, { z: -2, aft: true, len: 2.4, cal: 0.05, arc: 3.6 }],
  bridge: { z: 14, w: 5, d: 3.6, h: 2.6 },
  funnels: [[7, 1.1, 5.5], [0, 1.1, 5.5]],
  band: BLACK,
  fore: { z: 11, h: 12, y: 1.8 },
  main: { z: -8, h: 9 },
  mineRails: [-29, -10],
}));

/** A trawler taken up by the navy (chalutier): 40 m, the high bow, the funnel and the wheelhouse aft of amidships, a gun forward — the sweep aft when she sweeps. */
const chalutier = (sweep) => warship({ ...MN, hull: 0x34383c, upper: 0x7e8282 }, {
  len: 40, beam: 7, fb: 2.6, draft: 3, sheer: 1.6, fc: [10, 1.4],
  guns: [{ z: 15, len: sweep ? 2.4 : 3, cal: 0.05 }, ...(sweep ? [{ z: -9, aft: true, len: 2, cal: 0.05 }] : [])],
  bridge: { z: 1, w: 4, d: 2.8, h: 2 },
  house: [[-7, 0, 4, 1.8]],
  funnels: [[-4, 0.8, 5]],
  band: BLACK,
  fore: { z: 9, h: 11 },
  main: { z: -12, h: 8 },
  ...(sweep ? { gallows: -17 } : { boats: [[2.6, -12, 4, 1]] }),
});
export const buildChalutier = ship(() => chalutier(true));
export const buildChalutierArme = ship(() => chalutier(false));

/** A French motor launch (vedette à moteur): she lays the smoke, takes off the wounded, brings a section in. */
export const buildVedette = ship(() => ({ fixed: motorBoat({ ...MN, hull: 0x6c7680 }, { len: 21, beam: 4, trough: false }), mounts: [{ geo: shielded(MN, { len: 1.6, cal: 0.04, w: 1.1, h: 0.8, d: 1.1 }), at: [0, 1.4, -7], aft: true, arc: 5 }] }));

/** A self-propelled lighter (chaland automoteur): a flat steel barge for men and guns, low sides, the engine house and a short funnel aft. */
export const buildChaland = ship(() => warship({ ...MN, hull: 0x3a3c3e, upper: 0x6a6e70 }, {
  len: 34, beam: 8, fb: 1.8, draft: 1.4, sheer: 0.4,
  guns: [{ z: 13, len: 1.8, cal: 0.04 }],
  house: [[-16, -9, 6, 2.2]],
  funnels: [[-12, 0.6, 3.4]],
}));
