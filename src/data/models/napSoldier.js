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
//   gb  Britain (Egypt 1801): the red coat with blue facings and white lace, the 'stovepipe' felt shako
//       with its brass plate, white breeches; the Highlanders in the feather bonnet and the dark
//       Government tartan kilt; the riflemen in green with black facings
//   ru  Russia (1807): the dark green coat with red collar and cuffs, the kiver (the felt shako of
//       1803) with its pompon; the grenadiers in the leather kasket with its big brass plate and
//       black horsehair crest; the jägers all in green
//   au  Austria (1805–09): the white coat without lapels, facings in the regiment's colour, grey trousers
//       and short black gaiters (kind line: the German regiments in the crested 1798 helmet); kind
//       hungarian: the Kaskett of 1806 and the tight light-blue pantaloons with laced half-boots;
//       grenadier: the bearskin with its brass plate; light: the Grenzer in brown and Hungarian blue under
//       the felt shako; rifle: the Jäger in pike grey, green facings, the Corsican hat; pioneer: pike grey
//       and the Kaskett; officer and the gunners (armed false): artillery brown, the Corsican hat
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
const TARTAN = 0x1c3326; // (the dark Government sett: green and blue, read from afar)

export const ARMIES_1806 = {
  fr: { coat: 0x1d2a5c, facing: 0xb02424, lapel: WHITE, breeches: 0xe2ddcf, gaiter: BLACK, belt: WHITE, hat: BLACK, cockade: [0x1d2a8c, 0xf0f0f0, 0xc02020] },
  by: { coat: 0x5c8fcc, facing: 0xa82626, lapel: 0xa82626, breeches: 0xe2ddcf, gaiter: BLACK, belt: WHITE, hat: BLACK, cockade: [0x3a6ac0, 0xf0f0f0] },
  pr: { coat: 0x1b2440, facing: 0xb02a2a, lapel: 0xb02a2a, breeches: 0xe2ddcf, gaiter: BLACK, belt: WHITE, hat: BLACK, cockade: [BLACK, 0xf0f0f0] },
  sx: { coat: 0xe4e0d2, facing: 0xa82a2a, lapel: 0xa82a2a, breeches: 0xd8d2bc, gaiter: BLACK, belt: WHITE, hat: BLACK, cockade: [0xf0f0f0, 0x2a7a3a] },
  gb: { coat: 0xb0261e, facing: 0x1d2a5c, lapel: 0xb0261e, breeches: 0xe2ddcf, gaiter: BLACK, belt: WHITE, hat: BLACK, cockade: [BLACK] },
  ru: { coat: 0x1e3524, facing: 0xa82424, lapel: 0x1e3524, breeches: 0xe2ddcf, gaiter: BLACK, belt: WHITE, hat: BLACK, cockade: [BLACK, 0xe08a20] },
  es: { coat: 0xe6e2d6, facing: 0x5a2a6a, lapel: 0x5a2a6a, breeches: 0xe2ddcf, gaiter: BLACK, belt: WHITE, hat: BLACK, cockade: [0xc02020] }, // (Spain: the white coat, the Rey's violet facings, the red cockade)
  au: { coat: 0xe8e4d8, facing: 0x6fa0d0, lapel: 0xe8e4d8, breeches: 0xb2b2aa, gaiter: BLACK, belt: WHITE, hat: BLACK, cockade: [0xd8b54a, BLACK] },
  dk: { coat: 0xb4281f, facing: 0xe0c040, lapel: 0xb4281f, breeches: 0x9ab0c8, gaiter: BLACK, belt: WHITE, hat: BLACK, cockade: [0xc8102e, 0xf0f0f0] }, // (Denmark 1807: DK_KIND)
};

// Austria, per kind (over ARMIES_1806.au): coat, facings (no lapels: the coat's own colour), trousers, the hat
const AU_GREY = 0x7d8288;   // hechtgrau, the pike grey of the Jäger and the technical troops
const AU_BROWN = 0x6a4a30;  // the artillery's brown
const HUNG = 0x6f98c8;      // the Hungarians' tight light-blue pantaloons
const YELLOW = 0xe0b828;
const AU_KIND = {
  line: { facing: 0x6fa0d0, cap: 'helm' },                                                                   // (the Hoch- und Deutschmeister's sky blue)
  hungarian: { facing: YELLOW, breeches: HUNG, hungarian: true, cap: 'kaskett' },
  grenadier: { facing: 0xa82424, cap: 'bearskin' },
  light: { coat: 0x5e4630, facing: 0xa82424, lapel: 0x5e4630, breeches: HUNG, hungarian: true, cap: 'shako' },
  rifle: { coat: AU_GREY, facing: 0x2f7a3a, lapel: AU_GREY, breeches: AU_GREY, cap: 'corse', plume: 0x141814 },
  pioneer: { coat: AU_GREY, facing: 0x8a1f2a, lapel: AU_GREY, breeches: AU_GREY, cap: 'kaskett' },
  officer: { coat: AU_BROWN, facing: 0xa82424, lapel: AU_BROWN, cap: 'bicorne' },
  gunner: { coat: AU_BROWN, facing: 0xa82424, lapel: AU_BROWN, breeches: 0x8a8478, cap: 'corse', pompon: YELLOW },
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

/** The British 'stovepipe' shako of 1800: a tall felt cylinder, the peak, the brass plate, the tuft on the front. */
export const stovepipe = (tuft = 0xe6e2d6) => [
  P.cyl(0.104, 0.104, 0.21, { y: 1.85, color: BLACK }, 14),
  P.box(0.17, 0.012, 0.07, { y: 1.755, z: 0.12, rx: 0.25, color: BLACK }),
  P.box(0.1, 0.1, 0.01, { y: 1.85, z: 0.104, color: BRASS }),
  loft([[0, 1.94, 0.09, 0.022, 0.022, 2], [0, 2.02, 0.09, 0.03, 0.03, 2], [0, 2.06, 0.09, 0.012, 0.012, 2]], { color: tuft }, 8),
];

/** The round hat (seamen: tarred black; marines: with the white band): a low crown, a wide brim. */
const roundHat = (band) => [
  P.cyl(0.19, 0.19, 0.015, { y: 1.77, color: BLACK }, 14),
  P.cyl(0.1, 0.108, 0.13, { y: 1.835, color: BLACK }, 14),
  ...(band ? [P.cyl(0.11, 0.11, 0.03, { y: 1.79, color: band }, 14)] : []),
];

/** The Highland feather bonnet: the diced band, the black ostrich plumes over it, the hackle at the side. */
const featherBonnet = () => [
  P.cyl(0.108, 0.106, 0.05, { y: 1.8, color: 0xe6e2d6 }, 14),
  ...[0, 1, 2, 3].map((i) => P.box(0.03, 0.05, 0.01, { x: -0.06 + i * 0.04, y: 1.8, z: 0.106, color: i % 2 ? 0xb02424 : 0x1d2a5c })),
  loft([[0, 1.82, -0.01, 0.12, 0.125, 2], [0, 1.92, -0.03, 0.135, 0.14, 2], [0, 2.0, -0.05, 0.11, 0.12, 2], [0, 2.05, -0.06, 0.04, 0.05, 2]], { color: 0x141414 }, 12),
  loft([[-0.12, 1.82, 0.02, 0.018, 0.018, 2], [-0.13, 1.96, 0.02, 0.026, 0.026, 2], [-0.13, 2.02, 0.02, 0.01, 0.01, 2]], { color: 0xe6e2d6 }, 8),
];

/** The Bavarian Raupenhelm: the leather skull, the brass front, the black fur crest front to back. */
export const raupenhelm = (plume) => [
  loft([[0, 1.74, -0.01, 0.112, 0.12, 2], [0, 1.8, -0.01, 0.112, 0.12, 2], [0, 1.86, -0.012, 0.085, 0.095, 2]], { color: BLACK }, 12),
  P.box(0.18, 0.012, 0.07, { y: 1.75, z: 0.125, rx: 0.2, color: BLACK }),                                    // peak
  P.box(0.12, 0.07, 0.012, { y: 1.8, z: 0.118, color: BRASS }),                                             // the front plate
  loft([[0, 1.86, 0.12, 0.035, 0.03, 2], [0, 1.94, 0.04, 0.05, 0.06, 2], [0, 1.93, -0.07, 0.05, 0.065, 2], [0, 1.84, -0.14, 0.03, 0.03, 2]], { color: 0x161412 }, 10), // the crest
  ...(plume ? [loft([[-0.1, 1.84, 0.0, 0.02, 0.02, 2], [-0.11, 1.98, 0.0, 0.026, 0.026, 2], [-0.11, 2.05, 0.0, 0.01, 0.01, 2]], { color: plume }, 8)] : []),
];

/** The Russian kiver of 1803: a felt shako, a little narrower at the top, the peak, the brass edge, the pompon. */
export const kiver = (pompon = 0xe6e2d6) => [
  P.cyl(0.098, 0.108, 0.19, { y: 1.84, color: BLACK }, 14),
  P.box(0.16, 0.012, 0.07, { y: 1.755, z: 0.12, rx: 0.25, color: BLACK }),
  P.cyl(0.11, 0.11, 0.018, { y: 1.75, color: BRASS }, 14),
  P.sphere(0.03, { y: 1.95, z: 0.07, color: pompon }, 8, 6),
];

/** The grenadiers' kasket (1802): the leather skull, the tall brass front plate, the black horsehair crest over it. */
const kasket = () => [
  ...raupenhelm(),
  P.box(0.16, 0.13, 0.012, { y: 1.83, z: 0.105, rx: -0.15, color: BRASS }),
];

/** The Austrian infantry helmet of 1798: the leather skull, the brass front plate and comb, the black-and-yellow woollen crest. */
export const auHelm = () => [
  loft([[0, 1.74, -0.01, 0.112, 0.12, 2], [0, 1.8, -0.01, 0.112, 0.12, 2], [0, 1.86, -0.012, 0.085, 0.095, 2]], { color: BLACK }, 12),
  P.box(0.18, 0.012, 0.07, { y: 1.75, z: 0.125, rx: 0.2, color: BLACK }),
  P.box(0.11, 0.06, 0.012, { y: 1.79, z: 0.118, color: BRASS }),
  loft([[0, 1.86, 0.11, 0.03, 0.028, 2], [0, 1.93, 0.03, 0.045, 0.055, 2], [0, 1.92, -0.07, 0.045, 0.06, 2], [0, 1.84, -0.14, 0.028, 0.028, 2]], { color: 0x161412 }, 10),
  loft([[0, 1.875, 0.105, 0.012, 0.02, 2], [0, 1.945, 0.03, 0.016, 0.045, 2], [0, 1.935, -0.07, 0.016, 0.05, 2], [0, 1.855, -0.135, 0.01, 0.02, 2]], { color: YELLOW }, 8), // (the yellow in it)
];

/** The Kaskett of 1806: a tall leather cap, the front shield standing up over it with the brass plate, the black-and-yellow rose at the side. */
export const kaskett = () => [
  loft([[0, 1.74, -0.01, 0.11, 0.118, 2], [0, 1.86, -0.012, 0.104, 0.11, 2], [0, 1.9, -0.012, 0.098, 0.104, 2], [0, 1.91, -0.012, 0.05, 0.05, 2]], { color: BLACK }, 12),
  P.box(0.17, 0.012, 0.07, { y: 1.75, z: 0.125, rx: 0.2, color: BLACK }),                                    // peak
  P.box(0.2, 0.17, 0.014, { y: 1.88, z: 0.104, rx: -0.1, color: BLACK }),                                    // the front shield
  P.box(0.08, 0.07, 0.01, { y: 1.86, z: 0.114, rx: -0.1, color: BRASS }),                                    // the plate with the cypher
  P.cyl(0.032, 0.032, 0.012, { x: -0.108, y: 1.88, z: 0.02, rz: Math.PI / 2, color: YELLOW }, 10),           // the rose
  P.cyl(0.016, 0.016, 0.014, { x: -0.11, y: 1.88, z: 0.02, rz: Math.PI / 2, color: BLACK }, 8),
];

/** The Austrian grenadier's bearskin: tall black fur, the big brass front plate, the cloth patch at the back. */
const auBearskin = (back) => [
  loft([[0, 1.74, -0.01, 0.112, 0.12, 2], [0, 1.85, -0.015, 0.125, 0.13, 2], [0, 1.97, -0.02, 0.12, 0.124, 2], [0, 2.04, -0.03, 0.085, 0.09, 2], [0, 2.06, -0.03, 0.03, 0.03, 2]], { color: 0x1a1612 }, 12),
  P.box(0.17, 0.15, 0.012, { y: 1.84, z: 0.118, rx: -0.06, color: BRASS }),
  P.box(0.08, 0.08, 0.01, { y: 1.97, z: -0.145, color: back }),
];

/** The Corsican hat (Korsehut): the round crown, the wide brim hooked up on the left, a plume of black cock's feathers or a pompon. */
export const corse = (plume, pompon) => [
  P.cyl(0.19, 0.19, 0.014, { x: 0.02, y: 1.77, color: BLACK }, 14),
  P.cyl(0.098, 0.106, 0.15, { y: 1.845, color: BLACK }, 14),
  P.box(0.012, 0.15, 0.27, { x: -0.155, y: 1.84, rz: -0.32, color: BLACK }),                                 // the left brim, turned up
  ...(plume ? [loft([[-0.13, 1.86, 0, 0.022, 0.022, 2], [-0.15, 1.98, -0.03, 0.035, 0.03, 2], [-0.12, 2.05, -0.07, 0.012, 0.012, 2]], { color: plume }, 8)] : []),
  ...(pompon ? [P.sphere(0.026, { x: -0.16, y: 1.9, z: 0.02, color: pompon }, 8, 6)] : []),
];

// Spain's others (data/units1806/westNavies.js): the light infantry, the Guardias Españolas and the gunners in dark blue with red, the provincial
// militia in brown paño pardo; the light troops and the militia in the round hat
const ES_KIND = { light: { coat: 0x1d2a5c, facing: 0xb02424, lapel: 0xb02424 }, guard: { coat: 0x1d2a5c, facing: 0xb02424, lapel: 0xb02424 }, gunner: { coat: 0x1d2a5c, facing: 0xb02424, lapel: 0xb02424 }, militia: { coat: 0x6a5038, facing: 0xb02424, lapel: 0x6a5038, breeches: 0x8a7a5a } };

// Denmark 1807 (over ARMIES_1806.dk: the red coat, yellow facings, light-blue trousers, the round hat): the Landeværn in
// grey vadmel, the Livgarde in red and dark blue under the bearskin; the light troops and Jægers in green (the generic rule)
const DK_KIND = { militia: { coat: 0x6c6c66, facing: 0xb02424, lapel: 0x6c6c66, breeches: 0x76766e }, grenadier: { facing: 0x1d2a5c, lapel: 0x1d2a5c, breeches: 0xe2ddcf } };

export function buildNapSoldier({ army = 'fr', kind = 'line', armed = true } = {}) {
  // the light troops and the riflemen of the German armies in green; the officers with a sash, no musket
  const green = army === 'ru' && (kind === 'rifle' || kind === 'light') ? { facing: 0x1e3524, breeches: 0x1e3524 } // (the Russian jägers: green from collar to gaiters)
    : army === 'es' ? ES_KIND[!armed ? 'gunner' : kind] ?? {}
    : (kind === 'rifle' || (kind === 'light' && army !== 'gb')) && army !== 'fr' ? { coat: kind === 'rifle' ? 0x26402c : 0x30553a, facing: kind === 'rifle' ? 0x161616 : 0xa82626, lapel: kind === 'rifle' ? 0x26402c : 0xa82626 } : {};
  // the fleet's men ashore (Aboukir 1801): the seamen in short blue jackets and white trousers, the marines in red with white facings
  const sailor = kind === 'sailor', marine = kind === 'marine';
  const navy = sailor ? { coat: 0x1d2a5c, facing: 0x1d2a5c, lapel: 0x1d2a5c, breeches: 0xe8e4d8, gaiter: 0x1a1a1a } : marine ? { facing: 0xe6e2d6 } : {};
  const au = army === 'au' ? AU_KIND[!armed && kind === 'line' ? 'gunner' : kind] ?? AU_KIND.line : null; // (Austria: the unarmed are the gunners)
  const dk = army === 'dk' ? DK_KIND[kind] ?? {} : null; // (Denmark 1807: data/units1806/eastNavies.js)
  const c = { ...(ARMIES_1806[army] ?? ARMIES_1806.fr), ...green, ...navy, ...au, ...dk };
  const officer = kind === 'officer';
  const w = !armed || officer ? { parts: officer ? [P.box(0.012, 0.75, 0.03, { x: 0.2, y: 1.62, z: 0.12, rx: -0.35, color: 0xb8bab6 })] : [], muzzle: { x: 0.2, y: 1.3, z: 0.4 } } // (gunners: the rammer and the sponge; officers: the sword)
    : kind === 'rifle' ? musket(false, 1.0) : musket();
  const plume = kind === 'grenadier' ? 0xb02424 : kind === 'light' ? 0x2a7a3a : officer ? 0xf0f0f0 : kind === 'rifle' ? 0x161616 : null;
  const highland = army === 'gb' && kind === 'highland';
  const hat = au ? { helm: auHelm, kaskett, bearskin: () => auBearskin(c.facing), shako: () => kiver(YELLOW), corse: () => corse(c.plume, c.pompon), bicorne: () => bicorne(c, null) }[c.cap]()
    : sailor ? roundHat(null) : marine ? roundHat(WHITE) : army === 'es' && (kind === 'light' || kind === 'militia') ? roundHat(kind === 'light' ? 0xb02424 : null) : army === 'gb' ? (highland ? featherBonnet() : officer ? bicorne(c, null) : stovepipe(kind === 'grenadier' ? WHITE : kind === 'light' || kind === 'rifle' ? 0x2a5a32 : 0xd0d0c8))
    : army === 'by' ? raupenhelm(plume)
    : army === 'dk' && kind !== 'grenadier' && !officer ? corse(kind === 'light' || kind === 'rifle' ? 0x1e3a24 : null, 0xc8102e) // (the Danish round hat, its brim turned up, the red cockade; the Landeværn too)
    : army === 'ru' && !officer ? (kind === 'grenadier' ? kasket() : kiver(kind === 'light' || kind === 'rifle' ? 0x2a5a32 : 0xe6e2d6))
    : kind === 'grenadier' && (army === 'fr' || army === 'dk') ? bearskin() // (and the Danish Livgarde til Fods)
      : (kind === 'light' || kind === 'rifle') && army === 'fr' ? shako(kind === 'rifle' ? 0xb02424 : 0xd8c040)
        : bicorne(c, plume);
  const torso = [
    ...trunk({ upper: c.coat, lower: highland ? TARTAN : c.breeches, cut: 1.08 }),
    loft([[0, 1.53, -0.01, 0.122, 0.104, 2], [0, 1.6, -0.02, 0.112, 0.096, 2]], { color: c.facing }, 12),           // the high collar
    ...(army === 'gb' && kind !== 'rifle' && !sailor ? [1.24, 1.3, 1.36, 1.42].flatMap((y) => pair((s) => P.box(0.05, 0.014, 0.01, { x: s * 0.05, y, z: 0.142, color: WHITE }))) : []), // the white lace loops
    ...(highland ? [loft([[0, 1.0, 0, 0.19, 0.14, 3], [0, 0.78, 0, 0.21, 0.16, 3], [0, 0.56, 0, 0.21, 0.16, 3]], { color: TARTAN }, 12), // the kilt, to the knee
      P.box(0.12, 0.14, 0.05, { y: 0.9, z: 0.17, color: 0xe6e2d6 })] : []),                                          // the sporran
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
    ...(sailor ? [] : [P.box(0.3, 0.3, 0.1, { y: 1.3, z: -0.2, color: army === 'fr' ? 0x7a5a3a : army === 'gb' ? 0x1a1a1a : 0x4a3a2a }),
      P.cyl(0.05, 0.05, 0.36, { y: 1.48, z: -0.2, rz: Math.PI / 2, color: army === 'fr' ? 0x5a5a62 : 0x6a6458 }, 8)]), // (the seamen: no knapsack)
    ...(army === 'pr' ? [loft([[0, 1.62, -0.11, 0.02, 0.02, 2], [0, 1.48, -0.13, 0.016, 0.016, 2]], { color: 0x3a2a1e }, 6)] : []), // the queue
    ...head(),
    ...hat,
    ...(officer ? [loft([[0, 1.04, 0, 0.19, 0.13, 3], [0, 1.1, 0, 0.19, 0.13, 3]], { color: army === 'fr' ? 0xe6e2d6 : army === 'pr' ? 0x161616 : army === 'gb' ? 0xa02038 : army === 'ru' ? 0xb0b0a8 : 0xd8b54a }, 12)] : []), // the officer's sash
    ...(kind === 'pioneer' ? [ // the pioneer's axe on his back, the leather apron
      P.box(0.03, 0.7, 0.03, { x: -0.08, y: 1.3, z: -0.27, rz: 0.4, color: 0x6a4428 }), P.box(0.16, 0.1, 0.02, { x: -0.23, y: 1.62, z: -0.27, rz: 0.4, color: 0x8c8e8c }),
      P.box(0.3, 0.45, 0.012, { y: 0.88, z: 0.14, color: 0xc8b48a }),
    ] : []),
  ];
  const arms = [...armsHold({ sleeve: c.coat, cuff: c.facing }), ...w.parts];
  const thigh = merge([thighPart({ color: highland ? 0xd8b8a0 : c.breeches })]);   // (under the kilt: the bare knee)
  const shin = grime(merge(shinPart(c.hungarian ? { color: c.breeches, boot: BLACK, bootTop: 0.2, blouse: false } : au ? { color: c.breeches, boot: c.gaiter, bootTop: 0.3, blouse: false } : highland ? { color: 0xc84040, boot: BLACK, bootTop: 0.1, blouse: false } : sailor ? { color: c.breeches, boot: BLACK, bootTop: 0.08, blouse: false } : { color: c.breeches, boot: c.gaiter, bootTop: 0.42, blouse: false })), -0.3, -0.5); // (the Highlander's diced hose and shoes)
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
