// The Armada Española and the Bataafse Marine, 1805 (data/units1806/westNavies.js), on the 1806 sailing ship
// builders (models/ships1806.js shipOfTheLine, gunboat, sailRig):
//   es  Spain: black hulls with broad ochre bands along the gun decks, the port lids red, the stern in red; the
//       naval ensign of 1785 (red–yellow–red, the yellow twice as wide, the crowned arms of Castile and León
//       near the hoist), a red masthead pennant. Santísima Trinidad, the only four-decker afloat (61 m, 136
//       guns), and the Santa Ana-class 112s (Príncipe de Asturias); the Havana-built 74s, a little longer than
//       the British.
//   nl  Holland: built for the shoals of the Texel and the Zuiderzee — flatter floors, less draught and lower
//       topsides than anyone's, so a Dutch 74 is shorter and squatter (and leewardly); black and yellow ochre,
//       the stern in dark green; the red–white–blue ensign with the Batavian Maiden in its white canton.
import { P } from '../units/geometry.js';
import { NAVY, shipOfTheLine, gunboat, sailRig } from './ships1806.js';

/** The Spanish naval ensign (1785): red, a double yellow band, red; the arms on the yellow near the hoist. */
function spanishEnsign(y, z0, k = 1) {
  const RED = 0xb8141c, GOLD = 0xf0c420, h = 2.4 * k, l = 4 * k;
  return [
    ...[-1, 1].map((s) => P.box(0.05, h / 4, l, { y: y + s * h * 3 / 8, z: z0 - l / 2, color: RED })),
    P.box(0.05, h / 2, l, { y, z: z0 - l / 2, color: GOLD }),
    P.box(0.07, h * 0.34, 0.36 * k, { y, z: z0 - 1.1 * k, color: RED }),            // the arms: Castile's red quarter…
    P.box(0.08, h * 0.17, 0.18 * k, { y: y - h * 0.08, z: z0 - 1.2 * k, color: 0xeeeeea }), // …and León's white
    P.box(0.08, h * 0.08, 0.3 * k, { y: y + h * 0.22, z: z0 - 1.1 * k, color: 0xd8a820 }),  // the crown over them
  ];
}

/** The Batavian ensign: red, white, blue; the Maiden of Holland (a seated figure, the lion beside her) in a white canton. */
function batavianEnsign(y, z0, k = 1) {
  const h = 2.4 * k, l = 4 * k, b = h / 3;
  return [
    P.box(0.05, b, l, { y: y + b, z: z0 - l / 2, color: 0xae1c28 }),
    P.box(0.05, b, l, { y, z: z0 - l / 2, color: 0xeeeeea }),
    P.box(0.05, b, l, { y: y - b, z: z0 - l / 2, color: 0x21468b }),
    P.box(0.07, b * 1.6, 1.3 * k, { y: y + b * 0.7, z: z0 - 0.7 * k, color: 0xeeeeea }),      // the canton over the red
    P.box(0.08, b * 0.9, 0.35 * k, { y: y + b * 0.7, z: z0 - 0.55 * k, color: 0x3a5a9a }),  // the Maiden (her blue gown)…
    P.box(0.08, b * 0.5, 0.4 * k, { y: y + b * 0.45, z: z0 - 0.98 * k, color: 0xc89a30 }),  // …and the lion at her feet
  ];
}

NAVY.es = { band: 0xd4a84a, port: 0x241812, lid: 0xa02a20, stern: 0x8a2a20, flag: spanishEnsign, pennant: 0xb8141c };
NAVY.nl = { band: 0xc2a050, port: 0x241812, lid: 0x9a2a20, stern: 0x243c30, flag: batavianEnsign, pennant: 0xae1c28 };

// Spain
const FOUR_DECKER = { len: 61, beam: 16.4, fb: 11, draft: 7.8, decks: 4, ports: 16, masts: [[18.5, 56], [1, 63], [-16, 44]] };
const SPANISH_112 = { len: 58, beam: 16.2, fb: 8.9, draft: 7.2, decks: 3, ports: 15, masts: [[17.5, 55], [1, 61], [-15.5, 43]] };
export const buildTrinidad = sailRig(() => shipOfTheLine({ ...FOUR_DECKER, navy: 'es' }));
export const buildSpanish112 = sailRig(() => shipOfTheLine({ ...SPANISH_112, navy: 'es' }));
export const buildSeventyFourES = sailRig(() => shipOfTheLine({ len: 54, beam: 15, fb: 6.3, draft: 6.6, decks: 2, ports: 14, masts: [[15.5, 47], [0.5, 53], [-14.5, 37]], navy: 'es' }));
export const buildFrigateES = sailRig(() => shipOfTheLine({ len: 45, beam: 12, fb: 4.6, draft: 5, decks: 1, ports: 13, masts: [[12.5, 42], [0, 47], [-11.5, 33]], navy: 'es' }));
export const buildBrigES = sailRig(() => shipOfTheLine({ len: 29, beam: 8.6, fb: 3.1, draft: 3.6, decks: 1, ports: 8, masts: [[6.3, 29], [-4.8, 32]], navy: 'es' }));
export const buildGunboatES = sailRig(() => gunboat('es'));

// Holland: lower, flatter, shallower
export const buildSeventyFourNL = sailRig(() => shipOfTheLine({ len: 49, beam: 14.4, fb: 5.6, draft: 5.4, decks: 2, ports: 13, masts: [[14, 43], [0.5, 49], [-13, 34]], navy: 'nl' }));
export const buildFlagshipNL = sailRig(() => shipOfTheLine({ len: 53, beam: 15, fb: 5.9, draft: 5.6, decks: 2, ports: 15, masts: [[15, 45], [0.5, 51], [-14, 35]], navy: 'nl' })); // (the 80s and big 74s: Koninklijke Hollander, Vrijheid)
export const buildFrigateNL = sailRig(() => shipOfTheLine({ len: 43, beam: 11.6, fb: 4.1, draft: 4.2, decks: 1, ports: 12, masts: [[12, 40], [0, 45], [-11, 31]], navy: 'nl' }));
export const buildBrigNL = sailRig(() => shipOfTheLine({ len: 28, beam: 8.8, fb: 2.9, draft: 3.1, decks: 1, ports: 8, masts: [[6, 28], [-4.6, 31]], navy: 'nl' }));
export const buildGunboatNL = sailRig(() => gunboat('nl'));
