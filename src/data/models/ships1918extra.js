// 1918: the ship classes the sea maps were missing (data/units1918/shipTypes.js), on the 1918 kit
// (models/ships1918.js warship / uboat / motorBoat, the 1945 KIT under them), bow toward +z, real size:
//   Abercrombie   the big-gun monitor: one twin 14-inch turret on a short, bulged hull, the tall tripod
//   Ben-my-Chree  the seaplane carrier: a fast Isle of Man steamer, a hangar aft, the derricks that hoist the seaplanes
//   Campinas      the French seaplane carrier: a cargo steamer with canvas hangars fore and aft
//   tramp         the convoy's merchant steamer: three islands, a thin funnel, two masts and their derricks (dazzle in the Allies')
//   trawler       the armed trawler: a steel North Sea trawler, the gun on a bandstand forward, depth charges aft
//   UC II         the minelaying U-boat: her raised forward casing over the six mine chutes
//   U 151         the U-cruiser: a big boat with two 15 cm guns
// and each navy's landing craft (systems/Landing.js): steam pinnaces and motor boats for the men, lighters for the vehicles
// (the French ones: models/ships1918med.js).
import { P, merge, loft } from '../units/geometry.js';
import { sideProfile } from './vehicleCommon.js';
import { KIT } from './ships1945.js';
import { warship, uboat, motorBoat } from './ships1918.js';

const { box, every, strut, hull, mast, funnel, windows, ship, sub, BLACK, CANVAS } = KIT;
const RN = { hull: 0x5c6268, deck: 0x857a62, upper: 0x6a7076, gun: 0x62686e, black: BLACK, boat: 0x8a8a80 };
const KM = { hull: 0x7e868e, deck: 0x887c64, upper: 0x8c949a, gun: 0x848c94, black: BLACK, boat: 0x9a9a90 };
const FR = { hull: 0x6e7880, deck: 0x887c64, upper: 0x7c868e, gun: 0x6e7880, black: BLACK, boat: 0x9a9a90 };   // the Marine nationale's blue-grey

// ---------------------------------------------------------------- the monitor

/**
 * HMS Abercrombie (1915): 102 m, her hull only 18 m across but the anti-torpedo bulges either side make her 27,
 * the freeboard low; one twin 14-inch turret (built for a Greek battlecruiser) forward on a tall barbette, the
 * tripod mast with its big spotting top, one funnel, two 6-inch on the shelter deck.
 */
export const buildAbercrombie = ship(() => {
  const w = warship(RN, {
    len: 102, beam: 18, fb: 3.2, draft: 3.1, sheer: 1.6, fc: [6, 2.4],
    turrets: [{ z: 26, up: 3.4, w: 11, len: 16, cal: 0.4 }],
    guns: [{ x: 6.5, z: -8, y: 1.6, len: 6, cal: 0.12, arc: 3 }, { x: -6.5, z: -8, y: 1.6, len: 6, cal: 0.12, arc: 3 }],
    bridge: { z: 12, w: 10, d: 7, h: 4 },
    house: [[-30, 6, 9, 3]],
    funnels: [[-14, 2.4, 11]],
    fore: { z: 4, h: 34, tripod: true, topR: 3, y: 2.4 },
    boats: [[6, -24, 7, 1], [-6, -24, 7, -1]],
  });
  // the bulges: a long blister along each side at the waterline, faired into the hull at both ends
  const bulge = (s) => loft(every(0, 16, 1).map((k) => { const t = k / 16, f = Math.sin(Math.PI * t) ** 0.5; return [s * (8.2 + 2.6 * f), 0.2, -40 + t * 78, Math.max(0.15, 2.8 * f), Math.max(0.15, 2.2 * f), 4]; }), { color: RN.hull, surf: 'plate' }, 10);
  return { fixed: merge([w.fixed, bulge(1), bulge(-1)]), mounts: w.mounts, torps: [] };
});

// ---------------------------------------------------------------- the seaplane carriers

/** A seaplane on the deck, wings folded back along her (boxes: floats, fuselage, the folded wings, the tail). */
const seaplane = (x, y, z, color = 0x8a8a7c) => [
  ...[-1, 1].map((s) => P.box(0.5, 0.5, 5, { x: x + s * 1.1, y: y + 0.25, z, color: 0x6a6a5e })),
  P.box(1, 1, 8, { x, y: y + 1.6, z: z - 0.5, color }),
  ...[-1, 1].map((s) => P.box(0.12, 2.2, 5, { x: x + s * 1.4, y: y + 2, z: z - 1.5, color })),
  P.box(3, 0.08, 1.2, { x, y: y + 2, z: z - 4.4, color }),
];

/**
 * HMS Ben-my-Chree (1915): 114 m, the Isle of Man Steam Packet's fastest steamer — two tall funnels, a raised
 * hangar over her after deck with its doors aft, the derricks either side that swing the seaplanes out onto the water.
 * One of her Short 184s sank a Turkish ship with an air-dropped torpedo, the first ever, off Gallipoli in 1915.
 */
export const buildBenMyChree = ship(() => {
  const len = 114, fb = 5;
  const w = warship(RN, {
    len, beam: 14, fb, draft: 4.6, sheer: 1.4, fc: [26, 2.2], rake: 0.1,
    guns: [{ z: 46, len: 3.5, cal: 0.08 }, { z: -54, aft: true, len: 3.5, cal: 0.08 }],
    bridge: { z: 28, w: 9, d: 5, h: 3 },
    house: [[-6, 24, 9, 2.6]],
    funnels: [[16, 2.1, 10], [4, 2.1, 10]],
    fore: { z: 36, h: 18, y: 2.2 },
    boats: [[6, 10, 7, 1], [-6, 10, 7, -1]],
  });
  const hy = fb + 1;
  const fixed = merge([
    w.fixed,
    box(12, 6.5, 34, { y: hy + 3.25, z: -30, color: RN.upper }),                                         // the hangar
    P.box(9, 5.4, 0.2, { y: hy + 3, z: -47.1, color: 0x2a2c2e }),                                         // its doors, aft
    box(12.6, 0.3, 35, { y: hy + 6.6, z: -30, color: RN.deck }),
    ...[-1, 1].flatMap((s) => [strut([s * 5, fb, -50], [s * 5, fb + 14, -50], 0.3, RN.upper), strut([s * 5, fb + 1.5, -50], [s * 11, fb + 11, -55], 0.18, RN.upper)]), // the derrick posts and booms
    ...seaplane(0, fb, -52),                                                                              // a Short 184 on the quarterdeck
  ]);
  return { fixed, mounts: w.mounts, torps: [] };
});

/**
 * Campinas (1915): a French cargo steamer of 115 m taken up for the Levant — one funnel amidships, two masts,
 * canvas hangars over the holds fore and aft, the seaplanes hoisted out by the cargo booms.
 */
export const buildCampinas = ship(() => {
  const fb = 5.4;
  const w = warship(FR, {
    len: 115, beam: 15, fb, draft: 6, sheer: 1.4, fc: [42, 2.2],
    guns: [{ z: 50, len: 3.5, cal: 0.08 }, { z: -52, aft: true, len: 3.5, cal: 0.08 }],
    bridge: { z: 8, w: 10, d: 6, h: 3 },
    house: [[-6, 8, 11, 2.6]],
    funnels: [[-2, 2.2, 9]],
    fore: { z: 30, h: 20 },
    main: { z: -30, h: 18 },
    boats: [[6.5, -6, 7, 1], [-6.5, -6, 7, -1]],
  });
  const fixed = merge([
    w.fixed,
    ...[[22, 16], [-24, 18]].flatMap(([z, l]) => [
      ...every(-l / 2, l / 2, 3).map((dz) => P.cyl(5.2, 5.2, 0.25, { y: fb + 0.4, z: z + dz, rx: Math.PI / 2, color: RN.upper }, 10)),  // the hangar's hoops
      P.cyl(5, 5, l, { y: fb + 0.4, z, rx: Math.PI / 2, color: CANVAS, surf: 'cloth' }, 12),                                          // its canvas
    ]),
    ...[30, -30].flatMap((z) => [-1, 1].map((s) => strut([0, fb + 1.5, z], [s * 7, fb + 10, z - Math.sign(z) * 9], 0.15, FR.upper))), // the cargo booms
  ]);
  return { fixed, mounts: w.mounts, torps: [] };
});

// ---------------------------------------------------------------- the merchant steamer

/**
 * A tramp steamer of the convoys (100 m): forecastle, bridge island and poop with the well decks between, the tall thin
 * funnel in her owner's colours, a mast in each well with its derricks over the hatches, a gun on the poop. `dazzle`:
 * the Admiralty's dazzle paint, slabs of dark and light across her side to throw off a U-boat's estimate of her course.
 */
const tramp = (c, { funnel: fc, band, dazzle }) => {
  const len = 100, fb = 4.2;
  const w = warship(c, {
    len, beam: 14, fb, draft: 6, sheer: 1.6, fc: [38, 2.4],
    guns: [{ z: -46, y: 2.4, aft: true, len: 3.5, cal: 0.08 }],
    house: [[-2, 14, 12, 2.6]],
    bridge: { z: 10, w: 11, d: 5, h: 2.6 },
    boats: [[5.4, 0, 6, 1], [-5.4, 0, 6, -1]],
  });
  const parts = [w.fixed];
  parts.push(...funnel({ ...c, upper: fc }, 0, fb + 2.6, 2, 1.4, 12, 0.05), P.cyl(1.6, 1.6, 1.2, { y: fb + 12, z: 1.4, color: band }, 14));
  parts.push(box(13, 2.4, 10, { y: fb + 1.2, z: -45, color: c.upper }));                                   // the poop
  for (const z of [26, -26]) {                                                                           // the wells: a mast, its derricks, the hatches either side
    parts.push(...mast(c, 0, fb, z, 18, { yard: 4 }));
    parts.push(...[-1, 1].map((s) => strut([0, fb + 1.6, z], [0, fb + 9, z + s * 11], 0.14, c.upper)));
    parts.push(...[z - 7, z + 7].map((hz) => box(6, 1, 5, { y: fb + 0.5, z: hz, color: c.gun })));
  }
  if (dazzle) for (const s of [-1, 1]) { // the slabs: on the parallel middle body, where the side is flat
    const [d1, d2] = dazzle;
    every(-36, 30, 11).forEach((z, i) => parts.push(P.box(0.1, fb + 5, 6, { x: s * 7.02, y: (fb - 5.5) / 2 + 0.1, z, rx: (i % 2 ? 0.6 : -0.5), color: i % 3 ? d1 : d2, surf: 'plate' })));
  }
  return { fixed: merge(parts), mounts: w.mounts, torps: [] };
};
export const buildTrampRN = ship(() => tramp({ ...RN, hull: 0xa8aeb0, upper: 0xb4b8b6 }, { funnel: 0x2a2c2e, band: 0x8a2a20, dazzle: [0x2a3036, 0x4a6078] }));
export const buildTrampDE = ship(() => tramp({ ...KM, hull: 0x26282a, upper: 0xc8c0a8, deck: 0x7a6a52 }, { funnel: 0xc8a460, band: 0x1c1e20 }));
export const buildTrampFR = ship(() => tramp({ ...FR, hull: 0x9aa4aa, upper: 0xb0b4b0 }, { funnel: 0x2a2c2e, band: 0xb8a060, dazzle: [0x30383e, 0x6a7a62] }));
export const buildTrampIT = ship(() => tramp({ ...FR, hull: 0x3a3a38, upper: 0xc0b8a4, deck: 0x7a6a52 }, { funnel: 0xb8a070, band: 0x1c1e20 }));
export const buildTrampRU = ship(() => tramp({ ...KM, hull: 0x2e2c2a, upper: 0xb8b0a0, deck: 0x7a6a52 }, { funnel: 0x2a2c2e, band: 0xb83a2a }));   // (the Russian Volunteer Fleet: a red band on the black funnel)

// ---------------------------------------------------------------- the armed trawler

/**
 * An Admiralty trawler (Castle class, 41 m): a steel North Sea trawler with a whaleback forecastle, the 12-pounder on
 * its bandstand over the bow, the wheelhouse before the tall funnel, the trawl gallows still on her side, depth
 * charges on the stern. A German Vorpostenboot the same build: a requisitioned fishing trawler, black hull, an 8.8 cm.
 */
const trawler = (c) => {
  const w = warship(c, {
    len: 41, beam: 7, fb: 2.4, draft: 3.4, sheer: 1.6, fc: [10, 1.4],
    guns: [{ z: 15, y: 1.2, len: 2.6, cal: 0.06 }],
    house: [[-10, 2, 4, 2]],
    bridge: { z: 4, w: 3.6, d: 2.6, h: 1.8 },
    funnels: [[-3, 0.8, 6]],
    fore: { z: 9, h: 13, y: 1.4 },
    main: { z: -14, h: 8 },
    boats: [[2.2, -12, 4, 1]],
  });
  const y = 2.6;
  return {
    fixed: merge([
      w.fixed,
      ...[[10, 1], [-8, 1]].map(([z]) => strut([3.3, y, z], [3.9, y + 3, z], 0.12, c.upper)),                      // the trawl gallows on the starboard side
      box(2.4, 0.5, 2.6, { y: y + 0.3, z: -18, color: c.gun }), ...[-0.6, 0.6].map((x) => P.cyl(0.35, 0.35, 0.8, { x, y: y + 0.95, z: -18.4, color: BLACK }, 8)), // the depth charges on their rack
    ]),
    mounts: w.mounts, torps: [],
  };
};
export const buildArmedTrawler = ship(() => trawler({ ...RN, hull: 0x4e5458 }));
export const buildVorpostenboot = ship(() => trawler({ ...KM, hull: 0x26282a, upper: 0x8c8a80 }));

// ---------------------------------------------------------------- U-boats

/** UC 55 (UC II class, 50 m): the minelayer — the raised forward casing over six vertical mine chutes (their lids in a row), the gun before the tower. */
export const buildUC2 = sub(() => {
  const c = { ...KM, hull: 0x6a7076, deck: 0x50555a };
  return merge([
    uboat(c, { len: 50.5, beam: 5.2, tower: [4.5, 2.6, -3], gunZ: 2, gunLen: 3.4 }),
    loft(every(0, 8, 1).map((k) => { const t = k / 8; return [0, 1.1, 6 + t * 16, 1.5 * Math.min(1, 0.4 + Math.sin(Math.PI * t) * 1.4), 0.6 * Math.min(1, 0.3 + Math.sin(Math.PI * t) * 1.5), 4]; }), { color: c.hull, surf: 'plate' }, 10),
    ...every(0, 5, 1).map((i) => P.cyl(0.5, 0.5, 0.15, { y: 1.75, z: 8.5 + i * 2.2, color: BLACK }, 10)),
  ]);
});
/** U 151 (U-Kreuzer, 65 m): the Deutschland type built to carry cargo, armed for the long cruises off the Azores and America — two 15 cm guns, fore and aft of the tower. */
export const buildUKreuzer = sub(() => {
  const c = { ...KM, hull: 0x5e6468, deck: 0x4a4f54 };
  const gun15 = (z, aft) => [box(1.6, 1.4, 2.2, { y: 1.4 + 0.7, z, color: c.gun }), P.cyl(0.15, 0.2, 6, { y: 2.5, z: z + (aft ? -3.5 : 3.5), rx: Math.PI / 2, color: BLACK, surf: 'metal' }, 8), ...[-1, 1].map((s) => P.box(0.1, 1.2, 2, { x: s * 0.9, y: 2.4, z, color: c.gun }))];
  return merge([
    uboat(c, { len: 65, beam: 8.9, tower: [7, 3.2, 0], gunZ: 12, gunLen: 0.1 }), // (the kit's deck gun inside the forward 15 cm's mount)
    ...gun15(12, false), ...gun15(-11, true),
  ]);
});

// ---------------------------------------------------------------- landing craft (each navy's boats for the men, lighters for the vehicles)

/** A machine gun on a post: a landing craft's mount. */
const mg = (c) => merge([P.cyl(0.06, 0.08, 1, { y: 0.5, color: c.gun }, 6), P.cyl(0.05, 0.06, 1.2, { y: 1.05, z: 0.4, rx: Math.PI / 2, color: BLACK, surf: 'metal' }, 5)]);

/** A steam pinnace (12–15 m): a round-bilged launch with a thin tall funnel, the engine casing, an awning over the men aft. */
const pinnace = (c, { len = 14, beam = 3.4, funnel: fc = BLACK } = {}) => {
  const H = hull(len, beam, 1.2, 1, c, 0.6, { rails: false, fittings: false });
  const y = (z) => H.top(z);
  return {
    fixed: merge([
      ...H.parts,
      box(beam * 0.5, 0.9, len * 0.22, { y: y(len * 0.05) + 0.45, z: len * 0.05, color: c.upper }),                         // the engine casing
      P.cyl(0.28, 0.3, 2.8, { y: y(len * 0.1) + 1.8, z: len * 0.1, color: fc }, 10), P.cyl(0.3, 0.3, 0.3, { y: y(len * 0.1) + 3.2, z: len * 0.1, color: BLACK }, 10), // the funnel
      ...every(-len * 0.4, -len * 0.1, len * 0.15).flatMap((z) => [-1, 1].map((s) => P.cyl(0.04, 0.04, 1.6, { x: s * beam * 0.36, y: y(z) + 0.8, z, color: c.upper }, 4))), // the awning stanchions
      P.box(beam * 0.8, 0.06, len * 0.34, { y: y(-len * 0.25) + 1.62, z: -len * 0.25, color: CANVAS, surf: 'cloth' }),       // the awning
      box(beam * 0.7, 0.5, len * 0.3, { y: y(-len * 0.25) + 0.25, z: -len * 0.25, color: 0x5a4a36 }),                        // the men's thwarts (wood)
    ]),
    mounts: [{ geo: mg(c), at: [0, y(len * 0.32) + 0.1, len * 0.32], arc: 5 }],
  };
};
/**
 * A lighter (Prahm, chaland, mavna — 30 m): a flat, square-ended barge with a raked bow, the open hold for the guns and
 * wagons, a wheelhouse and a stumpy funnel aft (self-propelled, or the tug's crew aboard).
 */
const lighter = (c, { len = 30, beam = 8, fb = 1.6, draft = 1.4, funnel: fc = BLACK, wood = false } = {}) => {
  const z0 = -len / 2, z1 = len / 2;
  const side = wood ? 0x5a4632 : c.hull;
  return {
    fixed: merge([
      sideProfile([[z0, -draft], [z1 - 4, -draft], [z1, fb], [z0 + 0.6, fb], [z0, fb - 0.6]], beam, { color: side, surf: wood ? 'deck' : 'plate' }, 0.15), // the hull: flat bottom, the bow raked up
      P.box(beam - 1.2, 0.1, len - 10, { y: fb - 0.6, z: -1, color: 0x2a2826 }),                                         // the hold, open
      ...[-1, 1].map((s) => box(0.3, 0.5, len - 10, { x: s * (beam / 2 - 0.5), y: fb + 0.25, z: -1, color: side })),   // its coamings
      box(3, 2, 2.6, { y: fb + 1, z: z0 + 2.6, color: c.upper }), ...windows(0, fb + 1.5, z0 + 2.6, 3, 2.6),           // the wheelhouse
      P.cyl(0.4, 0.45, 2.6, { y: fb + 1.3, z: z0 + 0.8, color: fc }, 10),                                              // the funnel
      P.cyl(0.08, 0.1, 6, { y: fb + 3, z: z1 - 5, color: c.upper }, 5),                                                // the derrick post
    ]),
    mounts: [{ geo: mg(c), at: [0, fb, z1 - 3], arc: 5 }],
  };
};
const RU = { hull: 0x6a7276, deck: 0x857a62, upper: 0x7a8286, gun: 0x5e666a, black: BLACK, boat: 0x8a8a80 };        // the Russian Baltic Fleet's dark grey
const OT = { hull: 0x7a7e80, deck: 0x857a62, upper: 0x8a8e8e, gun: 0x6e7476, black: BLACK, boat: 0x9a9a90 };        // the Ottoman navy's (German-taught) grey
const KUK = { hull: 0x8a9096, deck: 0x8a7e66, upper: 0x969ca2, gun: 0x8c9298, black: BLACK, boat: 0xa4a49a };
const RM = { hull: 0x7a8288, deck: 0x887c64, upper: 0x868e94, gun: 0x7e868c, black: BLACK, boat: 0x9a9a90 };
export const buildPinnaceDE = ship(() => pinnace(KM, { funnel: 0x2a2c2e }));
export const buildPinnaceAH = ship(() => pinnace(KUK, { funnel: 0x8c9298, len: 13 }));
export const buildPinnaceRU = ship(() => pinnace(RU, { funnel: 0x1c1e20, len: 15 }));
export const buildCutterOT = ship(() => pinnace({ ...OT, hull: 0x5a4632, upper: 0x6a5a44 }, { funnel: 0x2a2c2e, len: 12, beam: 3.8 })); // (a wooden steam cutter)
/** The Italian motobarca: a motor boat of the MAS family, longer, the men in her open well. */
export const buildMotobarcaIT = ship(() => ({ fixed: motorBoat({ ...RM, hull: 0x6e767c }, { len: 20, beam: 3.6, trough: false }), mounts: [{ geo: mg(RM), at: [0, 1.4, 6], arc: 5 }] }));
export const buildLighterDE = ship(() => lighter(KM, { len: 32, funnel: 0x2a2c2e }));
export const buildLighterAH = ship(() => lighter(KUK, { len: 30 }));
export const buildBargeRU = ship(() => lighter(RU, { len: 34, beam: 7, fb: 2, funnel: 0x1c1e20 }));  // (the Elpidifor type: built for the Bosphorus landing)
export const buildBettolinaIT = ship(() => lighter(RM, { len: 26, beam: 7, funnel: 0x6e767c }));
export const buildMavnaOT = ship(() => lighter(OT, { len: 26, beam: 7.5, wood: true }));
