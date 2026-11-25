// The Imperial Russian Navy of 1805–07 (data/units1806/eastNavies.js `ru`): Seniavin's Mediterranean squadron and the
// Baltic fleet on the 1806 hulls (models/ships1806.js shipOfTheLine), in their own paint and colours —
//   black topsides with a white band along the gun deck, the port lids red, the stern and quarter galleries dark green
//   with a gilt taffrail and the double eagle over it; the Andreyevsky flag (St Andrew's blue saltire on white) at the
//   stern, the white masthead pennant; the jack (the saltire on red under a white cross) at the bowsprit;
//   the 74 (and her 66-gun sisters), the 80-gun two-decker, the frigate, the brig, the fireship (an old hull, her
//   ensign still flying), and the Baltic skerry galley: a long open hull, ten sweeps a side, two lateen sails and the
//   bow battery (the `ptBoat` slot).
// And the landing boats of two armies without the Royal Navy's: the Russian ship's barkas and the pram (green jackets,
// the saltire), the Prussian Haffkahn and Prahm (fishermen's boats off the Haff, grey coats, the black-and-white flag).
import { P, merge, loft } from '../units/geometry.js';
import { NAVY, shipOfTheLine, sailRig, landingBoat, halfWidth } from './ships1806.js';

const WOOD = 0x6e5236, DECKW = 0x9a8466, SAIL = 0xe6dfcb, IRON = 0x262624;
const WHITE = 0xeeeeea, BLUE = 0x1f3a8e, RED = 0xc01c1c, GILT = 0xc9a23a;

/** The Andreyevsky flag: St Andrew's blue saltire on white, hoist at z0 (aft along −z), centred at height y; `k` scales the 2.4 × 4 flag. */
export function stAndrew(y, z0, k = 1) {
  const h = 2.4 * k, w = 4 * k, zc = z0 - w / 2, a = Math.atan2(h, w), d = Math.hypot(h, w) * 0.94;
  return [
    P.box(0.05, h, w, { y, z: zc, color: WHITE }),
    P.box(0.07, h / 6, d, { y, z: zc, rx: a, color: BLUE }),
    P.box(0.07, h / 6, d, { y, z: zc, rx: -a, color: BLUE }),
  ];
}

/** The Russian jack at the bowsprit's end: red, the white cross over it, the blue saltire on that. */
const jack = (y, z, k = 1) => {
  const h = 1.4 * k, w = 2 * k, a = Math.atan2(h, w), d = Math.hypot(h, w) * 0.94;
  return [
    P.box(0.05, h, w, { y, z, color: RED }),
    P.box(0.06, h, h / 5, { y, z, color: WHITE }), P.box(0.06, h / 5, w, { y, z, color: WHITE }),
    P.box(0.07, h / 9, d, { y, z, rx: a, color: BLUE }), P.box(0.07, h / 9, d, { y, z, rx: -a, color: BLUE }),
  ];
};

NAVY.ru = { band: 0xe8e4d6, port: 0x241812, lid: 0xa8261e, stern: 0x24402e, flag: stAndrew, pennant: WHITE };
NAVY.ruFire = { ...NAVY.fire, flag: stAndrew }; // (a fireship: an old hull, her ports shut — under the saltire until the crew lights her)

/** A Russian ship: the 1806 hull in Russian paint, the gilt taffrail and double eagle on the transom, the jack on the bowsprit. */
function russian(o) {
  const d = shipOfTheLine({ ...o, navy: o.navy ?? 'ru' });
  const { len, beam, fb } = o, sc = beam / 14.6, L = len / 52;
  const tip = [len / 2 - 2 + Math.cos(0.3) * 17 * L, fb + 1 + Math.sin(0.3) * 17 * L]; // (the bowsprit's end: as shipOfTheLine's)
  const extra = [
    P.box(beam * 0.7, 0.45, 0.2, { y: fb + 3.15, z: -len / 2 - 0.35, color: GILT }),                 // the gilt taffrail
    P.box(2.0 * sc, 1.2, 0.2, { y: fb + 4.0, z: -len / 2 - 0.3, color: GILT }),                     // the double eagle: the body…
    ...[-1, 1].map((s) => P.box(1.3 * sc, 0.5, 0.2, { x: s * 1.4 * sc, y: fb + 4.2, z: -len / 2 - 0.3, rz: s * -0.4, color: GILT })), // …and its wings
    ...[-1, 1].map((s) => P.box(0.12, 1.2, len * 0.62, { x: s * (beam / 2 + 0.06), y: fb - 0.2, z: -len * 0.02, color: 0x24402e })), // a green strake under the upper ports
    P.cyl(0.04, 0.04, 2.2, { y: tip[1] + 1, z: tip[0] - 0.6, color: WOOD }, 4),                    // the jack staff
    ...(o.navy ? [] : jack(tip[1] + 1.6, tip[0] - 1.7, sc)),
  ];
  return { ...d, fixed: merge([d.fixed, ...extra]) };
}

const SEVENTY_FOUR = { len: 52, beam: 14.6, fb: 6.2, draft: 6.4, decks: 2, ports: 14, masts: [[15, 46], [0.5, 52], [-14, 36]] };
const EIGHTY = { len: 56, beam: 15.6, fb: 6.6, draft: 6.8, decks: 2, ports: 16, masts: [[16.5, 50], [0.5, 56], [-15, 39]] }; // (Rafail, Uriil: the long two-deckers of 80 and 84 guns)
const FRIGATE = { len: 45, beam: 11.8, fb: 4.6, draft: 5, decks: 1, ports: 13, masts: [[13, 42], [0, 47], [-12, 33]] };
const BRIG = { len: 29, beam: 8.8, fb: 3.2, draft: 3.8, decks: 1, ports: 8, masts: [[6.5, 29], [-5, 32]] };

export const buildSeventyFourRU = sailRig(() => russian(SEVENTY_FOUR));
export const buildEightyRU = sailRig(() => russian(EIGHTY));
export const buildFrigateRU = sailRig(() => russian(FRIGATE));
export const buildBrigRU = sailRig(() => russian(BRIG));
export const buildFireshipRU = sailRig(() => russian({ ...BRIG, navy: 'ruFire' }));

/**
 * The Baltic skerry galley (grebnoi flot): a long, low open hull for the Finnish skerries, ten sweeps a side, two lateen
 * sails on raked masts, a bow battery — a long 24-pounder between two light guns — and the awning over her stern.
 */
function galley() {
  const len = 26, beam = 5, c = NAVY.ru;
  const parts = [
    loft(Array.from({ length: 13 }, (_, i) => { const z = -len / 2 + (i / 12) * len; return [0, 0.15, z, halfWidth(z, len, beam), 0.95, 2.2]; }), { color: 0x3a3022, surf: 'plate' }, 10),
    loft(Array.from({ length: 13 }, (_, i) => { const z = -len * 0.45 + (i / 12) * len * 0.9; return [0, 0.9, z, Math.max(0.2, halfWidth(z, len, beam) * 0.9), 0.08, 6]; }), { color: DECKW, surf: 'deck' }, 10),
    ...[-1, 1].map((s) => P.box(0.12, 0.4, len * 0.74, { x: s * beam * 0.46, y: 1.15, color: c.band })),          // the white gunwale
    P.box(0.7, 0.3, len * 0.6, { y: 1.1, z: -0.5, color: WOOD }),                                                 // the gangway down her middle
    P.box(2.4, 0.7, 2.6, { y: 1.3, z: len * 0.33, color: WOOD }),                                                 // the bow platform…
    P.cyl(0.24, 0.3, 3.2, { y: 1.8, z: len * 0.4, rx: Math.PI / 2, color: IRON }, 8),                             // …the long 24-pounder…
    ...[-1, 1].map((s) => P.cyl(0.13, 0.16, 1.8, { x: s * 0.9, y: 1.75, z: len * 0.38, rx: Math.PI / 2, color: IRON }, 7)), // …and the two light guns
    P.box(beam * 0.76, 0.12, 4.2, { y: 2.9, z: -len * 0.38, color: 0xa8261e }),                                  // the stern awning
    ...[-1, 1].flatMap((s) => [-1, 1].map((e) => P.cyl(0.05, 0.05, 1.9, { x: s * beam * 0.34, y: 1.95, z: -len * 0.38 + e * 1.9, color: WOOD }, 4))),
    P.box(0.06, 0.9, 1.0, { y: 0.4, z: -len / 2 - 0.3, color: 0x3a3022 }),                                       // the rudder
    P.cyl(0.05, 0.05, 3, { y: 2.6, z: -len / 2 + 0.2, color: WOOD }, 4),                                         // the ensign staff
  ];
  const DOWN = 0.37, cs = Math.cos(DOWN), sn = Math.sin(DOWN);
  const sweep = (s) => merge([
    P.cyl(0.06, 0.06, 6.2, { x: s * cs * 2, y: -sn * 2, rz: s * (Math.PI / 2 - DOWN), color: WOOD }, 4),
    P.box(0.05, 0.9, 0.32, { x: s * cs * 4.9, y: -sn * 4.9, rz: s * (Math.PI / 2 - DOWN), color: WOOD }),
  ]);
  const oars = [-1, 1].flatMap((s) => Array.from({ length: 10 }, (_, i) => ({ at: [s * (beam / 2), 1.15, -len * 0.33 + i * (len * 0.56 / 9)], side: s })));
  // the lateen sails: a long yard slung aslant from the masthead, the triangle of canvas under it (two raked panels)
  const lateen = (h, w) => merge([
    P.cyl(0.1, 0.1, w * 1.25, { y: h * 0.78, z: -0.4, rx: Math.PI / 2 - 0.55, color: WOOD }, 5),
    P.box(0.08, h * 0.55, w * 0.5, { y: h * 0.5, z: w * 0.12, rx: -0.3, color: SAIL, surf: 'cloth' }),
    P.box(0.08, h * 0.42, w * 0.45, { y: h * 0.4, z: -w * 0.3, rx: 0.35, color: SAIL, surf: 'cloth' }),
  ]);
  const mast = (z, h) => merge([P.cyl(0.16, 0.22, h, { y: h / 2, z, rx: -0.06, color: WOOD }, 8)]);
  return {
    fixed: merge(parts),
    rig: [{ at: [0, 0, 6.5], fore: true, mast: 0, geo: lateen(11, 9), spars: mast(6.5, 11.5) }, { at: [0, 0, -1.5], fore: true, mast: 1, geo: lateen(13, 11), spars: mast(-1.5, 13.5) }],
    colours: merge(stAndrew(3.6, -len / 2 + 0.1, 0.42)), len, beam, mastCount: 2, oars, sweep: { [-1]: sweep(-1), [1]: sweep(1) },
  };
}
export const buildGalleyRU = sailRig(galley);

// the landing boats: the Russian ship's barkas (green jackets, the white strake, the saltire), the pram (a flat gun barge);
// the Prussian Haffkahn and Prahm (plain tarred planking, the rowers in grey, the black-and-white flag)
const prussian = (y, z0) => [P.box(0.04, 0.3, 1.0, { y: y + 0.15, z: z0 - 0.5, color: 0x161616 }), P.box(0.04, 0.3, 1.0, { y: y - 0.15, z: z0 - 0.5, color: WHITE })];
const RU_BOAT = { paint: 0xe8e4d6, hull: 0x3e3628, jacket: 0x1e3524 };
const PR_BOAT = { paint: 0x6e5a40, hull: 0x2e2a24, jacket: 0x5a5a54 };
export const buildBarkasRU = sailRig(() => landingBoat({ len: 12, beam: 3, oarsASide: 6, ...RU_BOAT, flag: stAndrew(2.3, -12 / 2 + 0.4, 0.25) }));
export const buildPramRU = sailRig(() => landingBoat({ len: 15, beam: 4.4, oarsASide: 8, gun: true, ...RU_BOAT, flag: stAndrew(2.3, -15 / 2 + 0.4, 0.25) }));
export const buildKahnPR = sailRig(() => landingBoat({ len: 12, beam: 3, oarsASide: 6, ...PR_BOAT, flag: prussian(2.3, -12 / 2 + 0.4) }));
export const buildPrahmPR = sailRig(() => landingBoat({ len: 15, beam: 4.4, oarsASide: 8, gun: true, ...PR_BOAT, flag: prussian(2.3, -15 / 2 + 0.4) }));
