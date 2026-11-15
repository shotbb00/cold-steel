// 1918 warships (the North Sea: data/units1918/ships.js), built at their real size, bow toward +z, on the
// 1945 kit (models/ships1945.js KIT: lofted hulls, rails, masts, funnels, the ship rig that rides the swell
// and trains the guns). One builder dresses every steel warship from a list of what stands where: the
// turrets (superfiring ones on their barbettes), the single guns behind their shields, the casemate guns
// along the hull, the coal funnels, the tripod or pole masts with their spotting tops, the conning tower
// and the open bridge, the torpedo tubes; the U-boats, the motor torpedo boats and the steamers their own.
// Royal Navy dark Home Fleet grey with planked decks; the Kaiserliche Marine a lighter blue-grey.
import { P, merge, loft } from '../units/geometry.js';
import { sideProfile } from './vehicleCommon.js';
import { KIT } from './ships1945.js';

const { box, cyl, every, strut, hull, turret, boat, searchlight, mast, funnel, windows, vent, ship, sub, BLACK, GLASS, CANVAS } = KIT;
const RN = { hull: 0x5c6268, deck: 0x857a62, upper: 0x6a7076, gun: 0x62686e, black: BLACK, boat: 0x8a8a80 };
const KM = { hull: 0x7e868e, deck: 0x887c64, upper: 0x8c949a, gun: 0x848c94, black: BLACK, boat: 0x9a9a90 };

// ---------------------------------------------------------------- guns (geometry at 0, facing +z)

/** A single gun behind its shield on a pedestal (the light cruisers', destroyers', sloops' guns). */
const shielded = (c, { len = 5, cal = 0.1, w = 2, h = 1.5, d = 2.2 } = {}) => merge([
  P.cyl(0.4, 0.55, 0.6, { y: 0.3, color: c.gun }, 10),                                                   // the pedestal
  sideProfile([[-d * 0.45, 0], [d * 0.5, 0], [d * 0.5, h * 0.5], [d * 0.18, h], [-d * 0.45, h]], w, { y: 0.55, color: c.gun, surf: 'plate' }, 0.06), // the shield
  P.box(w * 0.86, h * 0.8, 0.1, { y: 0.55 + h * 0.4, z: -d * 0.46, color: 0x1c1e20 }),                    // its open back, dark
  P.cyl(cal, cal * 1.3, len, { y: 0.55 + h * 0.4, z: d * 0.5 + len / 2 - 0.2, rx: Math.PI / 2, color: BLACK, surf: 'metal' }, 8),
])
/** A torpedo tube mount: a turntable, `n` tubes side by side. */
const tubes = (c, n, len = 6.5) => merge([
  P.cyl(1, 1.1, 0.4, { y: 0.2, color: c.gun }, 12),
  ...every(0, n - 1, 1).flatMap((i) => [P.cyl(0.3, 0.3, len, { x: (i - (n - 1) / 2) * 0.68, y: 0.75, rx: Math.PI / 2, color: c.upper, surf: 'plate' }, 8),
    P.cyl(0.34, 0.34, 0.4, { x: (i - (n - 1) / 2) * 0.68, y: 0.75, z: -len / 2, rx: Math.PI / 2, color: BLACK }, 8)]),
]);
/** A spotting top: the round or boxy platform with its screen, high on a mast. */
const top = (c, x, y, z, r = 2.4, round = false) => [
  round ? cyl(r, r * 0.9, 2.2, { x, y, z, color: c.upper }, 14) : box(r * 2, 2.2, r * 1.6, { x, y, z, color: c.upper }),
  P.box(r * 1.9, 0.5, 0.2, { x, y: y + 0.4, z: z + (round ? r : r * 0.8), color: GLASS }),
];

// ---------------------------------------------------------------- the steel warship

/**
 * One warship from a description: `len, beam, fb, draft, sheer` (the hull), `fc` [aft end, height] a raised
 * forecastle, `turrets` [{ z, up (on a barbette up by that), aft, w, barrels, len, cal }], `guns` (shielded singles)
 * [{ x, z, y, aft, len, cal }], `casemates` [z from, z to, step, y below the deck], `funnels` [[z, r, h]],
 * `fore` / `main` masts { z, h, tripod, topR, round }, `bridge` { z, w, d, h }, `tubes` [[z, n, x]], `boats`.
 */
function warship(c, o) {
  const { len, beam, fb, draft, sheer = 1.2 } = o;
  const H = hull(len, beam, fb, draft, c, sheer);
  const parts = [...H.parts];
  const deckAt = (z) => (o.fc && z > o.fc[0] ? H.top(z) + o.fc[1] : H.top(z));
  if (o.fc) { // the raised forecastle: the hull's breadth carried up a deck from its break to the stem
    const [z0, h] = o.fc;
    const secs = every(z0, len / 2 - 0.5, 2).map((z) => [0, H.top(z) + h / 2, z, Math.max(0.1, H.side(z, (H.top(z) - draft) / 2) * 0.98), h / 2, 4]);
    parts.push(loft(secs, { color: c.hull, surf: 'plate' }, 12), loft(secs.map(([x, y, z, w]) => [x, y + h / 2 + 0.05, z, Math.max(0.05, w * 0.97), 0.07, 6]), { color: c.deck, surf: 'deck' }, 10));
  }
  // the casemate guns: ports along both sides under the deck edge, a barrel out of each
  if (o.casemates) {
    const [a, b, step, dy] = o.casemates;
    for (const s of [-1, 1]) for (const z of every(a, b, step)) {
      const y = deckAt(z) - dy;
      const x = H.side(z, y);
      parts.push(box(0.5, 1.6, 2.2, { x: s * (x - 0.1), y, z, color: BLACK }), P.cyl(0.08, 0.1, 3.2, { x: s * (x + 1.4), y, z, rz: Math.PI / 2, color: BLACK, surf: 'metal' }, 6));
    }
  }
  // the superstructure: a conning tower forward of the bridge, the open bridge on its chart house
  const br = o.bridge;
  if (br) {
    const y0 = deckAt(br.z);
    parts.push(box(br.w * 0.8, br.h, br.d, { y: y0 + br.h / 2, z: br.z - 1, color: c.upper }));
    parts.push(cyl(br.w * 0.22, br.w * 0.24, br.h * 0.75, { y: y0 + br.h * 0.38, z: br.z + br.d / 2 + br.w * 0.15, color: c.gun }, 12));   // the conning tower
    parts.push(box(br.w, 0.25, br.d * 0.7, { y: y0 + br.h + 0.12, z: br.z, color: c.upper }));                                           // the bridge deck
    parts.push(P.box(br.w, 1, 0.12, { y: y0 + br.h + 0.75, z: br.z + br.d * 0.35, color: CANVAS, surf: 'cloth' }));                       // its canvas dodger
    parts.push(box(br.w * 0.4, 1.8, 2.2, { y: y0 + br.h + 1.1, z: br.z - 0.5, color: c.upper }), ...windows(0, y0 + br.h + 1.4, br.z - 0.5, br.w * 0.4, 2.2)); // the wheelhouse
    parts.push(...searchlight(c, br.w * 0.4, y0 + br.h + 0.25, br.z - br.d * 0.2), ...searchlight(c, -br.w * 0.4, y0 + br.h + 0.25, br.z - br.d * 0.2));
  }
  if (o.house) for (const [z0, z1, w, h] of o.house) parts.push(box(w, h, z1 - z0, { y: deckAt((z0 + z1) / 2) + h / 2, z: (z0 + z1) / 2, color: c.upper })); // casings, deckhouses
  for (const [z, r, h] of o.funnels ?? []) {
    const y = deckAt(z) + (o.casing ?? 0);
    parts.push(...funnel(c, 0, y, z, r, h, o.rake ?? 0.04, { oval: 1.25 }), P.cyl(r * 1.16, r * 1.16, 0.6, { y: y + h * 0.72, z: z - h * 0.72 * (o.rake ?? 0.04), color: o.band ?? c.upper }, 14)); // (a band: the flotilla's mark)
  }
  for (const m of [o.fore, o.main].filter(Boolean)) {
    const y = deckAt(m.z) + (m.y ?? 0);
    parts.push(...mast(c, 0, y, m.z, m.h, { tripod: !!m.tripod, yard: m.yard ?? 6, legsY: y }));
    if (m.topR) parts.push(...top(c, 0, y + m.h * 0.86, m.z, m.topR, m.round));
  }
  if (o.mineRails) { // the mine rails: two tracks along the after deck to the stern, the mines on their sinkers along them
    const [z0, z1] = o.mineRails;
    for (const s of [-1, 1]) {
      const x = s * Math.min(beam * 0.3, H.side(z0, (H.top(z0) - draft) / 2) - 1);
      parts.push(P.box(0.5, 0.15, z1 - z0, { x, y: deckAt((z0 + z1) / 2) + 0.08, z: (z0 + z1) / 2, color: BLACK, surf: 'metal' }));
      for (const z of every(z0 + 0.8, z1 - 0.8, 1.6)) parts.push(box(0.8, 0.5, 0.8, { x, y: deckAt(z) + 0.4, z, color: c.gun }), P.sphere(0.55, { x, y: deckAt(z) + 1.1, z, color: BLACK }));
    }
  }
  if (o.gallows != null) { // the sweep: a gallows over the stern, the winch drum before it, the otter boards stowed either side
    const z = o.gallows, y = deckAt(z);
    parts.push(strut([-beam * 0.25, y, z], [-beam * 0.25, y + 4, z], 0.15, c.upper), strut([beam * 0.25, y, z], [beam * 0.25, y + 4, z], 0.15, c.upper), strut([-beam * 0.25, y + 4, z], [beam * 0.25, y + 4, z], 0.12, c.upper));
    parts.push(P.cyl(0.7, 0.7, 2.4, { y: y + 0.9, z: z + 4, rz: Math.PI / 2, color: c.gun }, 12), box(1.2, 0.6, 1.4, { y: y + 0.3, z: z + 4, color: c.gun }));
    for (const s of [-1, 1]) parts.push(box(0.15, 1.6, 2.6, { x: s * (H.side(z + 2, H.top(z + 2) - 1) - 0.3), y: y + 0.6, z: z + 2, color: 0x6a5a40, surf: 'cloth' }));
  }
  for (const [z, n, x = 0] of o.tubeHouse ?? []) parts.push(box(1.4, 0.4, n * 0.8, { x, y: deckAt(z) + 0.2, z, color: c.gun }));
  for (const [x, z, l, s] of o.boats ?? []) parts.push(boat(c, x, deckAt(z) + (o.casing ?? 0) * 0.5, z, l, s));
  for (const [x, z] of o.vents ?? []) parts.push(...vent(c, x, deckAt(z), z, x > 0 ? Math.PI / 2 : -Math.PI / 2));
  // what trains: the turrets on their barbettes, the shielded guns
  const mounts = [];
  for (const t of o.turrets ?? []) {
    const y = deckAt(t.z) + (t.up ?? 0);
    if (t.up) parts.push(cyl(t.w * 0.55, t.w * 0.58, t.up, { y: y - t.up / 2, z: t.z, color: c.upper }, 18));
    mounts.push({ geo: turret(c, { w: t.w, h: t.h ?? t.w * 0.38, d: t.d ?? t.w * 1.1, barrels: t.barrels ?? 2, len: t.len, cal: t.cal, ears: !!t.ears }), at: [t.x ?? 0, y, t.z], aft: !!t.aft, arc: t.arc ?? 4.6 });
  }
  for (const g of o.guns ?? []) {
    const y = deckAt(g.z) + (g.y ?? 0);
    if (g.y) parts.push(box(2.4, g.y, 2.4, { x: g.x ?? 0, y: y - g.y / 2, z: g.z, color: c.upper }));   // its platform
    mounts.push({ geo: shielded(c, { len: g.len, cal: g.cal }), at: [g.x ?? 0, y, g.z], aft: !!g.aft, arc: g.arc ?? 4.6 });
  }
  return { fixed: merge(parts), mounts, torps: (o.tubeMounts ?? []).map(([x, z, n]) => ({ geo: tubes(c, n), at: [x, deckAt(z) + 0.1, z] })) };
}

// ---------------------------------------------------------------- the line

/** HMS Queen Elizabeth: 196 m, eight 15-inch in four twin turrets (A and B forward, X and Y aft, superfiring), two funnels, the tripod foremast. */
export const buildQueenElizabeth = ship(() => warship(RN, {
  len: 196, beam: 27.6, fb: 8, draft: 9, sheer: 2.4,
  turrets: [{ z: 70, w: 9.5, len: 15, cal: 0.38 }, { z: 56, up: 3, w: 9.5, len: 15, cal: 0.38 }, { z: -48, up: 3, aft: true, w: 9.5, len: 15, cal: 0.38 }, { z: -62, aft: true, w: 9.5, len: 15, cal: 0.38 }],
  casemates: [-30, 42, 8, 1.8],
  bridge: { z: 40, w: 12, d: 10, h: 7 },
  house: [[-38, 34, 14, 4]],
  casing: 4,
  funnels: [[22, 3.6, 12], [4, 3.6, 12]],
  fore: { z: 31, h: 26, tripod: true, topR: 2.8, y: 4 },
  main: { z: -28, h: 22, y: 4, topR: 1.8 },
  boats: [[7, -8, 9, 1], [-7, -8, 9, -1], [7, -18, 8, 1], [-7, -18, 8, -1]],
  vents: [[5, 12], [-5, 12]],
}));
/** SMS Bayern: 180 m, eight 38 cm in four twin turrets (A, B, C, D), one big funnel, a pole foremast over the armoured tower. */
export const buildBayern = ship(() => warship(KM, {
  len: 180, beam: 30, fb: 7.5, draft: 9.3, sheer: 1.8,
  turrets: [{ z: 64, w: 10, len: 14, cal: 0.4, ears: true }, { z: 50, up: 3, w: 10, len: 14, cal: 0.4, ears: true }, { z: -46, up: 3, aft: true, w: 10, len: 14, cal: 0.4, ears: true }, { z: -60, aft: true, w: 10, len: 14, cal: 0.4, ears: true }],
  casemates: [-30, 36, 7, 1.6],
  bridge: { z: 34, w: 13, d: 11, h: 8 },
  house: [[-36, 28, 15, 4.5]],
  casing: 4.5,
  funnels: [[10, 4.6, 13]],
  fore: { z: 25, h: 24, y: 4.5, topR: 2.2, round: true },
  main: { z: -24, h: 20, y: 4.5, tripod: true, topR: 1.8, round: true },
  boats: [[7.5, -6, 9, 1], [-7.5, -6, 9, -1], [7.5, -16, 8, 1], [-7.5, -16, 8, -1]],
  vents: [[5, -2], [-5, -2]],
}));
/** HMS Lion: 213 m, eight 13.5-inch — A and B forward, Q amidships between the funnels, X aft — three funnels, the tripod foremast. */
export const buildLion = ship(() => warship(RN, {
  len: 213, beam: 27, fb: 8, draft: 8.5, sheer: 2.4, fc: [-20, 2.6],
  turrets: [{ z: 80, w: 9, len: 14, cal: 0.36 }, { z: 66, up: 3, w: 9, len: 14, cal: 0.36 }, { z: -24, aft: true, w: 9, len: 14, cal: 0.36, arc: 4 }, { z: -68, aft: true, w: 9, len: 14, cal: 0.36 }],
  casemates: [-10, 50, 10, 1.6],
  bridge: { z: 52, w: 11, d: 9, h: 6 },
  house: [[-8, 44, 12, 3.5], [-48, -34, 10, 3]],
  casing: 3.5,
  funnels: [[34, 3.4, 11], [12, 3.4, 11], [-4, 3.4, 11]],
  fore: { z: 44, h: 26, tripod: true, topR: 2.6, y: 3.5 },
  boats: [[6.5, 22, 9, 1], [-6.5, 22, 9, -1]],
}));
/** SMS Derfflinger: 210 m, eight 30.5 cm in four twin turrets (A, B forward, C, D aft, superfiring), two funnels, flush-decked. */
export const buildDerfflinger = ship(() => warship(KM, {
  len: 210, beam: 29, fb: 6.5, draft: 9.2, sheer: 3.2,
  turrets: [{ z: 74, w: 9, len: 13, cal: 0.33, ears: true }, { z: 60, up: 3, w: 9, len: 13, cal: 0.33, ears: true }, { z: -50, up: 3, aft: true, w: 9, len: 13, cal: 0.33, ears: true }, { z: -64, aft: true, w: 9, len: 13, cal: 0.33, ears: true }],
  casemates: [-36, 42, 7, 1.4],
  bridge: { z: 42, w: 12, d: 10, h: 7 },
  house: [[-40, 36, 14, 4]],
  casing: 4,
  funnels: [[20, 4, 12], [-2, 4, 12]],
  fore: { z: 32, h: 26, tripod: true, topR: 2.2, round: true, y: 4 },
  main: { z: -30, h: 20, y: 4 },
  boats: [[7, 6, 9, 1], [-7, 6, 9, -1], [7, -12, 8, 1], [-7, -12, 8, -1]],
}));

// ---------------------------------------------------------------- cruisers

/** HMS Caledon (C class): 137 m, five 6-inch singles on the centreline, two funnels, torpedo tubes on deck. */
export const buildCaledon = ship(() => warship(RN, {
  len: 137, beam: 13, fb: 5, draft: 4.5, fc: [28, 2.4],
  guns: [{ z: 56, len: 6, cal: 0.13 }, { z: 26, y: 2.6, len: 6, cal: 0.13 }, { z: -6, len: 6, cal: 0.13, arc: 4 }, { z: -42, y: 2.4, aft: true, len: 6, cal: 0.13 }, { z: -56, aft: true, len: 6, cal: 0.13 }],
  bridge: { z: 34, w: 7, d: 6, h: 4 },
  house: [[-14, 22, 7, 2.4]],
  funnels: [[14, 2.2, 9], [0, 2.2, 9]],
  fore: { z: 30, h: 22, tripod: true, topR: 1.6, y: 2.4 },
  main: { z: -32, h: 16 },
  tubeMounts: [[3.5, -22, 2], [-3.5, -22, 2]],
  boats: [[4.5, 6, 7, 1], [-4.5, 6, 7, -1]],
}));
/** SMS Königsberg (1915): 151 m, eight 15 cm — two abreast forward, two aft on the centreline, four along the waist — three funnels. */
export const buildKonigsberg = ship(() => warship(KM, {
  len: 151, beam: 14.2, fb: 5, draft: 6, fc: [30, 2.4],
  guns: [{ x: 2.6, z: 58, len: 6, cal: 0.13 }, { x: -2.6, z: 58, len: 6, cal: 0.13 }, { x: 5.6, z: 22, len: 6, cal: 0.13, arc: 3 }, { x: -5.6, z: 22, len: 6, cal: 0.13, arc: 3 },
    { x: 5.6, z: -20, aft: true, len: 6, cal: 0.13, arc: 3 }, { x: -5.6, z: -20, aft: true, len: 6, cal: 0.13, arc: 3 }, { z: -50, y: 2.2, aft: true, len: 6, cal: 0.13 }, { z: -62, aft: true, len: 6, cal: 0.13 }],
  bridge: { z: 40, w: 8, d: 6, h: 4 },
  house: [[-16, 26, 8, 2.4]],
  funnels: [[22, 2.2, 10], [8, 2.2, 10], [-6, 2.2, 10]],
  fore: { z: 34, h: 22, topR: 1.4, round: true, y: 2.4 },
  main: { z: -34, h: 18 },
  tubeMounts: [[3.6, -30, 2], [-3.6, -30, 2]],
  boats: [[5, -12, 7, 1], [-5, -12, 7, -1]],
}));

// ---------------------------------------------------------------- flotillas and escorts

/** HMS Vendetta (V and W class): 95 m, four 4-inch singles (two superfiring each end), a thin and a fat funnel, two triple tubes. */
export const buildVandW = ship(() => warship(RN, {
  len: 95, beam: 9, fb: 3.6, draft: 3.2, fc: [22, 2.2], rake: 0.08, band: 0xd8d6cc,
  guns: [{ z: 38, len: 4.5, cal: 0.09 }, { z: 28, y: 2.6, len: 4.5, cal: 0.09 }, { z: -30, y: 2.2, aft: true, len: 4.5, cal: 0.09 }, { z: -40, aft: true, len: 4.5, cal: 0.09 }],
  bridge: { z: 22, w: 5.5, d: 4.5, h: 3 },
  funnels: [[14, 1.2, 6], [0, 1.7, 6.5]],
  fore: { z: 18, h: 14, y: 2.2 },
  main: { z: -16, h: 9 },
  tubeMounts: [[0, -6, 3], [0, -20, 3]],
  boats: [[3.5, 6, 5, 1], [-3.5, 6, 5, -1]],
}));
/** SMS S 53 (a large torpedo boat of the 1916 programme): 83 m, three 8.8 cm, three funnels, six tubes, the low turtle forecastle. */
export const buildGrossesTorpedoboot = ship(() => warship(KM, {
  len: 83, beam: 8.4, fb: 3, draft: 3.4, fc: [16, 1.8], rake: 0.03,
  guns: [{ z: 34, len: 4, cal: 0.08 }, { z: -2, len: 4, cal: 0.08, arc: 3.6 }, { z: -36, aft: true, len: 4, cal: 0.08 }],
  bridge: { z: 18, w: 5, d: 4, h: 2.4 },
  funnels: [[10, 1.3, 5.5], [0, 1.3, 5.5], [-10, 1.3, 5]],
  fore: { z: 14, h: 12, y: 1.8 },
  main: { z: -24, h: 8 },
  tubeMounts: [[2.2, 4, 1], [-2.2, 4, 1], [0, -16, 2], [0, -26, 2]],
  boats: [[3.2, -10, 4.5, 1]],
}));
/** HMS Flower-class sloop: 81 m, a merchant-looking escort, two 4.7-inch, one tall funnel, depth charges aft. */
export const buildFlower = ship(() => warship(RN, {
  len: 81, beam: 10, fb: 4, draft: 3.5, fc: [14, 2.2],
  guns: [{ z: 30, len: 4.5, cal: 0.1 }, { z: -32, aft: true, len: 4.5, cal: 0.1 }],
  bridge: { z: 16, w: 6, d: 5, h: 3.5 },
  house: [[-14, 10, 6.5, 2.4]],
  funnels: [[0, 1.8, 7]],
  fore: { z: 20, h: 14, y: 2.2 },
  main: { z: -20, h: 12 },
  boats: [[4, -6, 5.5, 1], [-4, -6, 5.5, -1]],
}));
/** SMS A 26 (a coastal torpedo boat of the Flanders flotillas): 50 m, two 8.8 cm, one funnel, a single tube. */
export const buildABoot = ship(() => warship(KM, {
  len: 50, beam: 5.4, fb: 2.4, draft: 1.8, fc: [10, 1.4],
  guns: [{ z: 18, len: 3.6, cal: 0.08 }, { z: -18, aft: true, len: 3.6, cal: 0.08 }],
  bridge: { z: 11, w: 4, d: 3, h: 2.2 },
  funnels: [[1, 1.1, 4.5]],
  fore: { z: 8, h: 9, y: 1.4 },
  tubeMounts: [[0, -8, 1]],
}));

// ---------------------------------------------------------------- mine warfare

/** HMS Abdiel: a flotilla leader turned fast minelayer — 80 m, three 4-inch, the after tubes gone for mine rails to the stern. */
export const buildAbdiel = ship(() => warship(RN, {
  len: 80, beam: 8, fb: 3.4, draft: 3, fc: [18, 2], rake: 0.08,
  guns: [{ z: 32, len: 4.5, cal: 0.09 }, { z: 2, len: 4.5, cal: 0.09, arc: 3.6 }, { z: -10, aft: true, len: 4.5, cal: 0.09, arc: 3.6 }],
  bridge: { z: 19, w: 5, d: 4, h: 3 },
  funnels: [[11, 1.3, 6], [-1, 1.3, 6]],
  fore: { z: 15, h: 13, y: 2 },
  mineRails: [-38, -14],
}));
/** SMS Brummer: a fast cruiser built to lay mines — 140 m, four 15 cm, rails for 400 mines down both sides of the after deck. */
export const buildBrummer = ship(() => warship(KM, {
  len: 140, beam: 13.2, fb: 5, draft: 6, fc: [28, 2.4],
  guns: [{ z: 54, len: 6, cal: 0.13 }, { z: 26, y: 2.6, len: 6, cal: 0.13 }, { z: -24, y: 2.4, aft: true, len: 6, cal: 0.13 }, { z: -36, aft: true, len: 6, cal: 0.13 }],
  bridge: { z: 34, w: 7, d: 6, h: 4 },
  house: [[-12, 22, 7, 2.4]],
  funnels: [[12, 2.4, 9], [-2, 2.4, 9]],
  fore: { z: 30, h: 20, y: 2.4, topR: 1.4, round: true },
  main: { z: -18, h: 16 },
  mineRails: [-66, -40],
}));
/** HMS Aberdare (a Hunt-class sweeper): 70 m, one funnel, a 4-inch forward, the sweep gear over the stern. */
export const buildHuntSweeper = ship(() => warship(RN, {
  len: 70, beam: 8.5, fb: 3.4, draft: 2.3, fc: [12, 2],
  guns: [{ z: 26, len: 4.5, cal: 0.09 }, { z: -10, aft: true, len: 3.5, cal: 0.07 }],
  bridge: { z: 14, w: 5.5, d: 4, h: 3 },
  house: [[-8, 8, 5.5, 2.2]],
  funnels: [[0, 1.5, 6]],
  fore: { z: 11, h: 12, y: 2 },
  gallows: -32,
  boats: [[3.5, -2, 5, 1]],
}));
/** SMS M 57 (a 1916 Minensuchboot): 59 m, two 8.8 cm, one funnel, the sweep gear aft. */
export const buildMBoot = ship(() => warship(KM, {
  len: 59, beam: 7.3, fb: 3, draft: 2.2, fc: [10, 1.8],
  guns: [{ z: 22, len: 3.6, cal: 0.08 }, { z: -12, aft: true, len: 3.6, cal: 0.08 }],
  bridge: { z: 12, w: 5, d: 3.5, h: 2.6 },
  funnels: [[1, 1.3, 5.5]],
  fore: { z: 9, h: 11, y: 1.8 },
  gallows: -27,
}));

// ---------------------------------------------------------------- the carrier

/**
 * HMS Furious as in 1918: 240 m, her big guns gone for a flying-off deck over a hangar forward and a landing-on
 * deck over another aft, the funnel, bridge and mast left standing between them with gangways down either side.
 */
export const buildFurious = ship(() => {
  const fb = 7, len = 240;
  const w = warship(RN, {
    len, beam: 27, fb, draft: 7.3, sheer: 2,
    guns: [{ x: 11, z: 18, arc: 3, len: 5, cal: 0.11 }, { x: -11, z: 18, arc: 3, len: 5, cal: 0.11 }, { x: 11, z: -12, aft: true, arc: 3, len: 5, cal: 0.11 }, { x: -11, z: -12, aft: true, arc: 3, len: 5, cal: 0.11 }],
    bridge: { z: 16, w: 10, d: 7, h: 7 },
    funnels: [[0, 3.6, 13]],
    fore: { z: 8, h: 26, tripod: true, topR: 2, y: 2 },
    boats: [[10, -2, 9, 1], [-10, -2, 9, -1]],
  });
  const DECK = 0x6e6a5e, hy = fb + 8;
  const fixed = merge([
    w.fixed,
    box(17, 8, 70, { y: fb + 4, z: 64, color: RN.upper }),                                        // the forward hangar
    box(21, 0.6, 84, { y: hy, z: 66, color: DECK, surf: 'flight' }),                                 // the flying-off deck, sloping to the bow
    P.box(1.2, 0.05, 80, { y: hy + 0.32, z: 66, color: 0xd8d6cc }),
    box(19, 9, 80, { y: fb + 4.5, z: -70, color: RN.upper }),                                       // the after hangar
    box(23, 0.6, 92, { y: hy + 1, z: -70, color: DECK, surf: 'flight' }),                            // the landing-on deck
    P.box(1.2, 0.05, 88, { y: hy + 1.32, z: -70, color: 0xd8d6cc }),
    ...[-1, 1].map((s) => box(2.6, 0.4, 56, { x: s * 11.5, y: hy + 0.5, z: -2, color: DECK })),      // the gangways either side of the funnel
    ...every(-28, 24, 8).flatMap((z) => [-1, 1].map((s) => P.box(0.2, hy - fb, 0.2, { x: s * 11.5, y: fb + (hy - fb) / 2, z, color: RN.upper, surf: 'metal' }))),
    P.box(20, 6, 0.3, { y: hy + 4, z: -24, color: 0x3a3c3a, surf: 'cloth' }),                        // the crash barrier of ropes at the landing deck's fore end
    ...every(-112, -30, 8).map((z) => P.box(22, 0.08, 0.15, { y: hy + 1.34, z, color: 0x2a2a28, surf: 'metal' })), // the arrester wires (fore and aft ones, 1918)
  ]);
  return { fixed, mounts: w.mounts, torps: [] };
});

// ---------------------------------------------------------------- Zeebrugge: the storming ships (the coastal map's landing craft)

/**
 * HMS Vindictive as fitted for the raid: an old cruiser, a false deck built up along her port side with eighteen
 * brows (gangways) to drop onto the Mole's parapet, mattresses hung as fenders, a fighting top full of Lewis guns,
 * flamethrower huts and howitzers fore and aft. Her port side (+x) goes against the wall.
 */
export const buildVindictive = ship(() => {
  const len = 100, beam = 17, fb = 5.5;
  const w = warship(RN, {
    len, beam, fb, draft: 6, sheer: 1.6, fc: [20, 2.2], rake: 0.05,
    guns: [{ z: 40, len: 5, cal: 0.12 }, { z: -38, aft: true, len: 3, cal: 0.16 }],
    bridge: { z: 26, w: 9, d: 7, h: 4 },
    funnels: [[10, 2.2, 10], [-2, 2.2, 10], [-14, 2.2, 10]],
    fore: { z: 22, h: 22, topR: 2.6, y: 2.2 },
    main: { z: -26, h: 16 },
  });
  const deckY = fb + 2.6, parts = [w.fixed];
  parts.push(box(3, 0.4, 62, { x: beam / 2 - 1, y: deckY, z: 2, color: 0x6a5a44 }));                                // the false deck along the port side
  for (const z of every(-26, 30, 3.3)) {                                                                             // the brows: raised, hinged at the false deck
    parts.push(P.box(1.1, 0.12, 6.5, { x: beam / 2 + 1.6, y: deckY + 2.6, z, rz: -0.75, ry: Math.PI / 2, color: 0x7a6a50 }));
    parts.push(strut([beam / 2 - 0.5, deckY, z], [beam / 2 - 0.5, deckY + 5.5, z], 0.08, BLACK));
  }
  for (const z of every(-30, 32, 2.6)) parts.push(P.box(0.6, 1.6, 2.2, { x: beam / 2 + 0.1, y: fb - 1, z, color: 0x8a7a5a, surf: 'cloth' })); // the mattress fenders
  for (const z of [16, -20]) parts.push(box(2.6, 2.4, 2.6, { x: beam / 2 - 2.5, y: deckY + 1.2, z, color: RN.upper }));          // the flamethrower huts
  return { fixed: merge(parts), mounts: w.mounts, torps: [] };
});
/** A Mersey ferry (Iris, Daffodil): broad and high-sided for the crowds on the Liverpool crossing, a tall funnel, the upper deck packed with men. */
const ferry = (c) => warship(c, {
  len: 46, beam: 12, fb: 3.4, draft: 2.8, sheer: 0.8,
  guns: [{ z: 14, len: 2.2, cal: 0.05 }],
  house: [[-14, 12, 10, 2.6]],
  bridge: { z: 8, w: 9, d: 3, h: 2.6 },
  funnels: [[-2, 1.6, 9]],
  fore: { z: 12, h: 9, y: 2.6 },
  boats: [[5, -10, 5, 1], [-5, -10, 5, -1]],
});
export const buildMerseyFerry = ship(() => ferry({ ...RN, hull: 0x2a2c2e, upper: 0x8a8476 }));
/** A motor launch: a small wooden boat (she lays the smoke, takes off the wounded, brings in a section). */
export const buildML = ship(() => ({ fixed: motorBoat({ ...RN, hull: 0x5c6268 }, { len: 24, beam: 4.5, trough: false }), mounts: [{ geo: shielded(RN, { len: 2, cal: 0.05, w: 1.2, h: 0.9, d: 1.2 }), at: [0, 1.4, -8], aft: true, arc: 5 }] }));

// ---------------------------------------------------------------- submarines

/** A First War submarine: the casing over the hull, a small conning tower, the deck gun forward, the jumping wires from bow to stern over the tower. */
function uboat(c, { len, beam, tower, gunZ, gunLen = 3 }) {
  const deck = beam * 0.16;
  const secs = every(0, 20, 1).map((k) => { const t = k / 20; const r = (beam / 2) * Math.max(0.06, Math.sin(Math.PI * Math.min(1, 0.03 + t * 0.95)) ** 0.6); return [0, -beam * 0.28, -len / 2 + t * len, r, r * 0.9, 2.2]; });
  const cw = (t) => beam * 0.36 * Math.min(1, 0.2 + t * 7, (1 - t) * 5);
  const cz = (t) => -len * 0.48 + t * len * 0.95;
  const cas = every(0, 24, 1).map((k) => { const t = k / 24; return [0, deck / 2 - beam * 0.12, cz(t), Math.max(0.1, cw(t)), deck / 2 + beam * 0.12, 3]; });
  const [tl, th, tz] = tower;
  const sail = every(0, 10, 1).map((k) => { const t = k / 10; return [0, deck + th / 2, tz - tl / 2 + t * tl, Math.max(0.12, beam * 0.16 * Math.sin(Math.PI * Math.min(1, 0.08 + t * 0.84)) ** 0.4), th / 2, 6]; });
  const tt = deck + th;
  return merge([
    loft(secs, { color: c.hull, surf: 'plate' }, 14),
    loft(cas, { color: c.hull, surf: 'plate' }, 12),
    loft(cas.map(([x, y, z, w, h]) => [x, y + h + 0.04, z, Math.max(0.06, w * 0.9), 0.06, 6]), { color: c.deck, surf: 'deck' }, 8),
    loft(sail, { color: c.upper, surf: 'plate' }, 12),
    P.box(beam * 0.2, 0.06, tl * 0.4, { y: tt + 0.01, z: tz + tl * 0.1, color: BLACK }),                       // the open bridge
    ...[[0.4, 3.2], [-0.5, 2.6]].map(([dz, h]) => P.cyl(0.1, 0.13, h, { y: tt + h / 2, z: tz + dz, color: BLACK, surf: 'metal' }, 6)),   // the periscopes
    box(1, 1, 1.4, { y: deck + 0.5, z: gunZ, color: c.gun }), P.cyl(0.1, 0.13, gunLen, { y: deck + 1, z: gunZ + gunLen / 2 + 0.5, rx: Math.PI / 2, color: BLACK, surf: 'metal' }, 6), // the deck gun
    strut([0, deck, cz(0.99)], [0, tt + 2.4, tz + 0.4], 0.03, BLACK), strut([0, tt + 2.4, tz + 0.4], [0, deck, cz(0.02)], 0.03, BLACK),     // the jumping wires
    strut([0, deck, cz(0.98)], [0, deck + 1.6, cz(0.95)], 0.08, c.upper),                                        // the net cutter
    ...[-1, 1].map((s) => box(1.8, 0.1, 1, { x: s * (cw(0.9) + 0.8), y: -0.5, z: cz(0.9), color: c.hull })), // the bow planes
  ]);
}
export const buildEClass = sub(() => uboat({ ...RN, deck: 0x4a4e52 }, { len: 55, beam: 6.9, tower: [5, 2.6, 2], gunZ: 8 }));
export const buildUB3 = sub(() => uboat({ ...KM, hull: 0x6a7076, deck: 0x50555a }, { len: 55.5, beam: 5.8, tower: [5.5, 2.8, 1], gunZ: 7.5, gunLen: 3.6 }));

// ---------------------------------------------------------------- motor torpedo boats

/** A coastal motor boat: a stepped planing hull, the cockpit, the torpedo in its trough aft (CMB) or a tube forward (LM). */
function motorBoat(c, { len, beam, trough }) {
  const fb = 1.1;
  const H = hull(len, beam, fb, 0.7, c, 0.5, { rails: false, fittings: false });
  const y = (z) => H.top(z);
  return merge([
    ...H.parts,
    box(beam * 0.5, 0.8, len * 0.18, { y: y(-len * 0.04) + 0.4, z: -len * 0.04, color: c.upper }),                                  // the cockpit's coaming
    P.box(beam * 0.45, 0.4, 0.08, { y: y(len * 0.05) + 0.75, z: len * 0.05, rx: -0.4, color: GLASS }),                         // its screen
    box(beam * 0.38, 0.25, len * 0.18, { y: y(len * 0.17) + 0.12, z: len * 0.17, color: c.upper }),                               // the engine hatch forward
    ...(trough
      ? [P.box(0.75, 0.3, len * 0.36, { y: y(-len * 0.28) + 0.05, z: -len * 0.28, color: BLACK }), P.cyl(0.27, 0.27, len * 0.32, { y: y(-len * 0.28) + 0.2, z: -len * 0.28, rx: Math.PI / 2, color: c.gun, surf: 'metal' }, 8)] // the torpedo in its stern trough
      : [P.cyl(0.3, 0.3, len * 0.36, { y: y(len * 0.2) + 0.3, z: len * 0.2, rx: Math.PI / 2, color: c.gun }, 8)]),              // the tube on the foredeck
    P.cyl(0.04, 0.05, 1.2, { y: y(-len * 0.05) + 0.6, z: -len * 0.05, color: BLACK, surf: 'metal' }, 5),                        // a Lewis gun on its post
    P.cyl(0.05, 0.06, 1.2, { y: y(-len * 0.05) + 1.1, z: -len * 0.05 + 0.5, rx: Math.PI / 2, color: BLACK, surf: 'metal' }, 5),
  ]);
}
export const buildCMB = ship(() => ({ fixed: motorBoat({ ...RN, hull: 0x5a6066 }, { len: 16.8, beam: 3.4, trough: true }), mounts: [{ geo: merge([P.box(0.1, 0.1, 0.1, { color: BLACK })]), at: [0, 1.4, 0], arc: 6 }] }));
export const buildLM = ship(() => ({ fixed: motorBoat(KM, { len: 15.5, beam: 3, trough: false }), mounts: [{ geo: merge([P.box(0.1, 0.1, 0.1, { color: BLACK })]), at: [0, 1.4, 0], arc: 6 }] }));

// ---------------------------------------------------------------- steamers

/** A troopship: a straight stem, a counter stern, the tall funnel amidships, two masts with their derricks, one gun aft. */
function steamer(c, { len, beam, fb, band }) {
  const H = hull(len, beam, fb, 6, c, 1.6);
  const y = fb;
  return {
    fixed: merge([
      ...H.parts,
      box(beam * 0.6, 3, len * 0.22, { y: y + 1.5, z: 0, color: 0xc8c4b4 }), box(beam * 0.5, 2.4, len * 0.12, { y: y + 4.2, z: 2, color: 0xc8c4b4 }), ...windows(0, y + 4.6, 2, beam * 0.5, len * 0.12),
      ...funnel({ ...c, upper: c.funnel ?? c.upper }, 0, y + 3, -6, 2.4, 11, 0.06),
      P.cyl(2.75, 2.75, 1.2, { y: y + 11, z: -6.6, color: band }, 14),
      ...[len * 0.3, -len * 0.3].flatMap((z) => [...mast(c, 0, y, z, 20, { yard: 5 }), strut([0, y + 2, z], [0, y + 11, z + Math.sign(z) * 12], 0.15, c.upper), box(beam * 0.45, 1.4, 9, { y: H.top(z - Math.sign(z) * 8) + 0.5, z: z - Math.sign(z) * 8, color: c.gun })]), // the masts, derricks, hatches (between mast and house)
      ...[-1, 1].map((s) => boat(c, s * beam * 0.36, y + 3, -2, 7, s)),
    ]),
    mounts: [{ geo: shielded(c, { len: 3.5, cal: 0.08 }), at: [0, H.top(-len * 0.44) + 0.1, -len * 0.44], aft: true, arc: 4 }],
  };
}
export const buildTroopshipRN = ship(() => steamer({ ...RN, hull: 0x3c3e40, upper: 0x6a6c6a, funnel: 0x6a6c6a }, { len: 125, beam: 16, fb: 6, band: 0x1c1e20 }));
export const buildTroopshipKM = ship(() => steamer({ ...KM, hull: 0x3a3c3e, upper: 0x8c8e88, funnel: 0xc8a460 }, { len: 120, beam: 15.5, fb: 6, band: 0x1c1e20 }));
