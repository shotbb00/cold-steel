// 1945 warships of the Atlantic and the Mediterranean (data/units45/ships.js: the Royal Navy for the British
// armies, the Kriegsmarine for the Wehrmacht), built at their real size, bow toward +z, on the 1945 kit
// (models/ships1945.js KIT: lofted hulls, rails, masts, funnels, turrets, the ship rig).
//   Royal Navy (Home Fleet greys, planked decks on the big ships):
//     Tribal (115 m): four twin 4.7-inch gunhouses (A, B forward, X superfiring over Y aft), the two raked
//       funnels — the fore one fatter — a quad pom-pom, one quad torpedo mount, the tripod foremast
//     River frigate (92 m): the long forecastle, a 4-inch forward with the Hedgehog behind it, one funnel,
//       the lattice mast, depth-charge rails and throwers all down the quarterdeck
//     Dido (156 m): five twin 5.25-inch turrets — three stepped up forward (A, B, Q) — two upright funnels
//     County (Kent class, 192 m): the high flush side, three tall funnels, four twin 8-inch turrets
//     King George V (227 m): a quadruple 14-inch turret forward and aft, a twin superfiring, the boxy bridge,
//       two funnels with the athwartships catapult and its hangars between them, 5.25-inch twins along the sides
//     Illustrious (230 m): the armoured-box carrier, her flight deck carried down over the closed bow, the island
//       with its funnel to starboard, 4.5-inch twins at the deck's four corners
//     T-class (84 m): the bulged bow with its external tubes, the 4-inch forward of the conning tower
//     Vosper MTB (21 m): two torpedo tubes, twin .5s, the hard-chine plywood hull
//     a merchantman of the convoys (140 m)
//   Kriegsmarine (light grey, dark-grey gunhouses, teak decks), all with the raked, flared Atlantic bow:
//     Narvik (Z 23 class, 127 m): the big twin 15 cm turret forward, three singles aft, two capped funnels
//     Admiral Hipper (203 m): four twin 20.3 cm turrets, the tower bridge, one big capped funnel, the hangar
//     Bismarck (251 m): four twin 38 cm turrets (Anton, Bruno forward; Caesar, Dora aft), six 15 cm twins,
//       the tower bridge with its rangefinder, the single funnel, the catapult athwartships
//     Type VIIC U-boat (67 m): the saddle tanks, the 8.8 cm forward of the tower, the 'Wintergarten' aft
//     S-boot (S 38 class, 35 m): the tubes under the forecastle, the armoured round bridge
import { P, merge, loft } from '../units/geometry.js';
import { KIT } from './ships1945.js';

const { box, cyl, every, strut, hull, turret, aa, boat, searchlight, mast, funnel, windows, vent, raft, mount, ship, sub,
  oerlikon, depthCharges, airplane, catapult, crane, torpedoMount, submarine, torpedoBoat, transport, flattop, carrier, BLACK, GLASS, WHITE } = KIT;
const RN = { hull: 0x6c7479, deck: 0x857a62, upper: 0x8f979c, gun: 0x7a8287, black: BLACK, boat: 0x9aa0a0 };
const RN_DD = { ...RN, deck: 0x5e5c56 };   // (destroyers and escorts: corticene, not planks)
const KM = { hull: 0x8a9096, deck: 0x8c7c62, upper: 0x9ca2a6, gun: 0x70767a, black: BLACK, boat: 0xa0a29c };

/**
 * The Atlantic bow (the Kriegsmarine's from 1938): the stem raked forward `rake` m over the water and the bows
 * flared out wide at the deck, the forefoot cut away under it — lofted over the kit hull's straight stem.
 */
function atlanticBow(H, c, rake, draft) {
  const L = H.len / 2, t = H.top(L - 1);
  const w0 = H.side(L - 14, t);
  const hullS = [], deckS = [];
  for (let k = 0; k <= 10; k++) {
    const f = k / 10, z = L - 14 + f * (14 + rake);
    const lo = -draft * 0.6 + (t - 1.6 + draft * 0.6) * f ** 1.5, hi = t + 0.3 * f;
    const w = Math.max(0.12, w0 * (1 - f) ** 1.1);
    hullS.push([0, (lo + hi) / 2, z, w, (hi - lo) / 2, 4]);
    deckS.push([0, hi + 0.05, z, Math.max(0.06, w * 0.95), 0.07, 6]);
  }
  return [loft(hullS, { color: c.hull, surf: 'plate' }, 12), loft(deckS, { color: c.deck, surf: 'deck' }, 8)];
}
/** A German funnel cap: the raked 'clinker screen' over the mouth. */
const cap = (c, z, y, r) => P.cyl(r * 1.18, r * 1.05, 1.2, { y, z: z - 0.6, rx: -0.35, sz: 1.3, color: c.upper, surf: 'plate' }, 14);
/** The 8-barrelled pom-pom (two rows of four). */
const pompom = (c, x, y, z, ry = 0) => [aa(c, x, y, z, { n: 4, ry, cal: 0.08, len: 2.6 }), aa(c, x, y + 0.7, z, { n: 4, ry, cal: 0.08, len: 2.6, tub: false })];
/** A lattice mast (the escorts' and the destroyers' from 1942): four legs braced, a radar lantern on top. */
const lattice = (c, x, y, z, h) => [
  ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => strut([x + a * 0.9, y, z + b * 0.9], [x + a * 0.25, y + h, z + b * 0.25], 0.1, c.upper)),
  ...every(1, 3, 1).map((i) => box(1.8 - i * 0.35, 0.12, 1.8 - i * 0.35, { x, y: y + (i * h) / 4, z, color: c.upper })),
  cyl(0.9, 0.9, 1.6, { x, y: y + h + 0.8, z, color: c.upper }, 10), P.cyl(0.95, 0.95, 0.5, { x, y: y + h + 1.2, z, color: GLASS }, 10), // the Type 271's lantern
];

// ---------------------------------------------------------------- the Royal Navy

export const buildTribal = ship(() => {
  const c = RN_DD;
  const fb = 5;
  const H = hull(115, 11.1, fb, 3.2, c, 2);
  const twin = mount(c, { w: 3.8, h: 2.5, d: 4.6, barrels: 2, len: 5.2, cal: 0.13 });
  return {
    fixed: merge([
      ...H.parts,
      box(6, 2.4, 5, { y: fb + 1.2, z: 37, color: c.upper }),           // B gun's deck
      box(7.5, 3, 10, { y: fb + 1.5, z: 29, color: c.upper }),
      box(6.5, 3, 6, { y: fb + 4.5, z: 30, color: c.upper }),           // the bridge
      ...windows(0, fb + 5.5, 30, 6.5, 6),
      ...[-1, 1].map((s) => box(2.2, 0.3, 2.8, { x: s * 4.3, y: fb + 5.9, z: 31, color: c.upper })),
      box(3, 2, 3, { y: fb + 7, z: 29, color: c.upper }),               // the director
      cyl(0.35, 0.35, 4, { y: fb + 7.4, z: 29, rz: Math.PI / 2, color: c.gun }, 8),
      ...mast(c, 0, fb + 3, 25, 15, { tripod: true, rake: 0.1, radar: 'ladder', yard: 7 }),
      box(7, 2.4, 24, { y: fb + 1.2, z: 4, color: c.upper }),           // the midships deckhouse
      ...funnel(c, 0, fb + 2.4, 12, 2.1, 7.5, 0.14, { oval: 1.35 }),    // the fat forward funnel
      ...funnel(c, 0, fb + 2.4, 1, 1.6, 6.5, 0.14, { oval: 1.3 }),
      ...pompom(c, 0, fb + 2.4, -6, Math.PI),
      box(7, 2.4, 10, { y: fb + 1.2, z: -24, color: c.upper }),         // the after deckhouse (X on it)
      ...searchlight(c, 0, fb + 2.4, 7),
      ...[-1, 1].map((s) => boat(c, s * 4.6, fb + 0.2, 6, 7.5, s)),
      ...[-1, 1].flatMap((s) => [raft(s * 4.1, fb + 1.6, -24), ...vent(c, s * 2.4, fb + 2.4, -2)]),
      ...[-1, 1].map((s) => oerlikon(c, s * 3.6, fb + 6, 28, s * Math.PI / 2)),
      ...depthCharges(c, H, -55, 2),
    ]),
    mounts: [
      { geo: twin, at: [0, H.top(44) + 0.1, 44], arc: 5 },
      { geo: twin, at: [0, fb + 2.5, 37], arc: 5 },
      { geo: twin, at: [0, fb + 2.5, -21], aft: true, arc: 5 },
      { geo: twin, at: [0, fb + 0.1, -34], aft: true, arc: 5 },
    ],
    torps: [{ geo: torpedoMount(c, 4), at: [0, fb + 0.2, -13] }],
  };
});

export const buildRiver = ship(() => {
  const c = RN_DD;
  const fb = 4.4;
  const H = hull(91.9, 11.1, fb, 3.7, c, 2.2);
  const four = mount(c, { w: 2.6, h: 2.1, d: 3.2, barrels: 1, len: 4.6, cal: 0.11 });
  const fc = every(0, 45.6, 1.5).map((z) => [z, Math.max(0.15, H.side(z, fb) * 0.98)]);
  return {
    fixed: merge([
      ...H.parts,
      loft(fc.map(([z, w]) => [0, fb + 1.2, z, w, 1.25, 4]), { color: c.hull, surf: 'plate' }, 12),   // the long forecastle deck, carried aft past the funnel
      loft(fc.map(([z, w]) => [0, fb + 2.47, z, w * 0.96, 0.06, 6]), { color: c.deck, surf: 'deck' }, 8),
      box(3.2, 1.4, 2.4, { y: fb + 3.1, z: 30, color: c.gun }),                    // the Hedgehog
      ...every(-1.2, 1.2, 0.6).flatMap((x) => [-0.6, 0.6].map((dz) => P.cyl(0.08, 0.08, 1, { x, y: fb + 4.2, z: 30 + dz, rx: 0.5, color: BLACK }, 5))),
      box(7, 3, 7, { y: fb + 3.9, z: 22, color: c.upper }),                       // the bridge
      ...windows(0, fb + 4.9, 22, 7, 7),
      box(5.5, 1.6, 4, { y: fb + 6.2, z: 21.5, color: c.upper }),
      ...lattice(c, 0, fb + 2.4, 16, 9),
      ...funnel(c, 0, fb + 2.4, 6, 1.7, 5.5, 0.06, { oval: 1.3 }),
      box(6, 2, 10, { y: fb + 3.4, z: -2, color: c.upper }),                      // the engine-room casing
      ...pompom(c, 0, fb + 2.4, -10, Math.PI),
      ...[-1, 1].flatMap((s) => [12, -6].map((z) => oerlikon(c, s * 4, fb + 2.4, z, s * Math.PI / 2))),
      ...[-1, 1].map((s) => boat(c, s * 4.7, fb + 2.4, 4, 6.5, s)),
      ...[-1, 1].map((s) => raft(s * 4.2, fb + 3.6, -4)),
      ...depthCharges(c, H, -42, 5),                                              // (150 charges: rails aft, throwers down both sides)
    ]),
    mounts: [
      { geo: four, at: [0, fb + 2.5, 36], arc: 5 },
      { geo: four, at: [0, fb + 0.1, -30], aft: true, arc: 5 },
    ],
  };
});

export const buildDido = ship(() => {
  const c = RN;
  const fb = 6.5;
  const H = hull(156, 15.4, fb, 5.4, c, 1.8);
  const t2 = turret(c, { w: 5.2, h: 2.8, d: 6.4, barrels: 2, len: 7.5, cal: 0.17 });
  return {
    fixed: merge([
      ...H.parts,
      box(7, 2.6, 7, { y: fb + 1.3, z: 50, color: c.upper }),           // B's barbette
      box(7.5, 5.2, 7.5, { y: fb + 2.6, z: 41, color: c.upper }),       // Q's, higher still
      box(10, 4.4, 14, { y: fb + 2.2, z: 30, color: c.upper }),
      box(8, 4, 8, { y: fb + 6.4, z: 31, color: c.upper }),             // the bridge
      ...windows(0, fb + 7.8, 31, 8, 8),
      ...[-1, 1].map((s) => box(2.4, 0.3, 3, { x: s * 5.2, y: fb + 8.3, z: 32, color: c.upper })),
      box(3.4, 2, 3.4, { y: fb + 9.4, z: 30, color: c.upper }),          // the director
      ...mast(c, 0, fb + 4.4, 25, 17, { tripod: true, radar: 'ladder', yard: 8, legsY: fb + 4.4 }),
      box(9, 3.4, 40, { y: fb + 1.7, z: -2, color: c.upper }),
      ...funnel(c, 0, fb + 3.4, 10, 2.4, 8, 0.03, { oval: 1.3 }),
      ...funnel(c, 0, fb + 3.4, -6, 2.4, 8, 0.03, { oval: 1.3 }),
      ...mast(c, 0, fb + 3.4, -18, 15, { tripod: true, yard: 7 }),
      box(7, 2.6, 8, { y: fb + 1.3, z: -45, color: c.upper }),          // X's barbette
      ...[-1, 1].flatMap((s) => pompom(c, s * 3.4, fb + 3.4, 2, s * Math.PI / 2)),
      ...[-1, 1].map((s) => torpedoMount(c, 3).clone().rotateY(s * Math.PI / 2).translate(s * 5.4, fb + 0.2, -26)),
      ...[-1, 1].flatMap((s) => every(-34, 20, 9).map((z) => oerlikon(c, s * (H.side(z, fb) - 1), fb, z, s * Math.PI / 2))),
      ...[-1, 1].map((s) => boat(c, s * 5.8, fb + 3.4, -14, 8, s)),
      ...[-1, 1].flatMap((s) => searchlight(c, s * 2.6, fb + 3.4, 2)),
    ]),
    mounts: [
      { geo: t2, at: [0, H.top(58), 58], arc: 5 },
      { geo: t2, at: [0, fb + 2.6, 50], arc: 5 },
      { geo: t2, at: [0, fb + 5.2, 41], arc: 5 },
      { geo: t2, at: [0, fb + 2.6, -45], aft: true, arc: 5 },
      { geo: t2, at: [0, fb, -55], aft: true, arc: 5 },
    ],
  };
});

export const buildCounty = ship(() => {
  const c = RN;
  const fb = 9;
  const H = hull(192, 20.8, fb, 6.5, c, 1.2);
  const t2 = turret(c, { w: 7, h: 3.4, d: 8.5, barrels: 2, len: 11, cal: 0.26 });
  const four = mount(c, { w: 3.8, h: 2.2, d: 4, barrels: 2, len: 4.6, cal: 0.12 });
  const walrus = airplane(0x6a7470, { span: 14, len: 11.5, floats: true });
  return {
    fixed: merge([
      ...H.parts,
      ...[60, -62].map((z) => box(8.5, 3, 9, { y: fb + 1.5, z, color: c.upper })),   // B's and X's barbettes
      box(13, 4.5, 20, { y: fb + 2.25, z: 40, color: c.upper }),
      box(10, 5, 9, { y: fb + 7, z: 42, color: c.upper }),               // the bridge
      ...windows(0, fb + 8.6, 42, 10, 9),
      ...[-1, 1].map((s) => box(2.6, 0.3, 3, { x: s * 6.3, y: fb + 9.2, z: 43, color: c.upper })),
      box(4, 2.4, 4, { y: fb + 10.7, z: 41, color: c.upper }),
      ...mast(c, 0, fb + 4.5, 35, 22, { tripod: true, radar: 'ladder', yard: 10 }),
      box(12, 4, 54, { y: fb + 2, z: 0, color: c.upper }),
      ...[18, 4, -10].map((z) => funnel(c, 0, fb + 4, z, 2.5, 13, 0.06, { oval: 1.4 })).flat(),   // the three tall funnels
      ...mast(c, 0, fb + 4, -30, 22, { yard: 8 }),
      ...[-1, 1].flatMap((s) => [8, -4].map((z) => four.clone().rotateY(s * Math.PI / 2).translate(s * 7.4, fb, z))),
      ...[-1, 1].flatMap((s) => pompom(c, s * 4.4, fb + 4, 26, s * Math.PI / 2)),
      catapult(c, 0, fb + 4, -20, Math.PI / 2, walrus),
      ...crane(c, 4, fb + 4, -24, 9, 11, Math.PI / 2),
      ...[-1, 1].map((s) => torpedoMount(c, 4).clone().rotateY(s * Math.PI / 2).translate(s * 7, fb + 0.2, -40)),
      ...[-1, 1].map((s) => boat(c, s * 7.6, fb + 4, -2, 9, s)),
      ...[-1, 1].flatMap((s) => searchlight(c, s * 3, fb + 4, 12)),
    ]),
    mounts: [
      { geo: t2, at: [0, H.top(72), 72], arc: 5 },
      { geo: t2, at: [0, fb + 3, 60], arc: 5 },
      { geo: t2, at: [0, fb + 3, -62], aft: true, arc: 5 },
      { geo: t2, at: [0, fb, -74], aft: true, arc: 5 },
    ],
  };
});

export const buildKGV = ship(() => {
  const c = RN;
  const fb = 9;
  const H = hull(227, 31.4, fb, 9.9, c, 2.4);
  const quad = turret(c, { w: 15, h: 5, d: 13, barrels: 4, len: 17, cal: 0.42, ears: true });
  const twin = turret(c, { w: 11, h: 4.6, d: 12, barrels: 2, len: 17, cal: 0.42, ears: true });
  const sec = turret(c, { w: 5.4, h: 2.8, d: 6.4, barrels: 2, len: 7.5, cal: 0.17 });
  const walrus = airplane(0x6a7470, { span: 14, len: 11.5, floats: true });
  return {
    fixed: merge([
      ...H.parts,
      box(13, 4, 14, { y: fb + 2, z: 60, color: c.upper }),             // B's barbette
      box(20, 6, 30, { y: fb + 3, z: 30, color: c.upper }),
      box(15, 7, 14, { y: fb + 9.5, z: 36, color: c.upper }),           // the boxy bridge block
      box(11, 4, 9, { y: fb + 15, z: 35, color: c.upper }),
      ...windows(0, fb + 16.4, 35, 11, 9),
      ...windows(0, fb + 11, 36, 15, 14),
      box(5, 3, 5, { y: fb + 18.5, z: 34, color: c.upper }),            // the main director
      cyl(0.6, 0.6, 8, { y: fb + 19, z: 34, rz: Math.PI / 2, color: c.gun }, 8),
      ...mast(c, 0, fb + 17, 28, 20, { tripod: true, radar: 'ladder', yard: 12, legsY: fb + 6 }),
      box(18, 6, 70, { y: fb + 3, z: -12, color: c.upper }),
      ...funnel(c, 0, fb + 6, 12, 4.2, 12, 0, { oval: 1.3 }),
      ...funnel(c, 0, fb + 6, -22, 4.2, 12, 0, { oval: 1.3 }),
      ...[-1, 1].map((s) => box(6, 5, 12, { x: s * 6.5, y: fb + 8.5, z: 0, color: c.upper })),   // the aircraft hangars either side of the funnel
      catapult(c, 0, fb + 6, -4, Math.PI / 2, walrus),
      ...mast(c, 0, fb + 6, -36, 20, { tripod: true, yard: 10 }),
      box(10, 4, 10, { y: fb + 8, z: -42, color: c.upper }),            // the after director
      ...[-1, 1].flatMap((s) => [30, 18, -30, -42].map((z) => sec.clone().rotateY(s * Math.PI / 2).translate(s * 11, fb + 6, z))),   // eight 5.25-inch twins
      ...[-1, 1].flatMap((s) => [44, -14, -52].flatMap((z) => pompom(c, s * 8, fb + 6, z, s * Math.PI / 2))),
      ...[-1, 1].flatMap((s) => every(-90, 90, 12).filter((z) => Math.abs(z) > 56).map((z) => oerlikon(c, s * (H.side(z, fb) - 1.2), H.top(z), z, s * Math.PI / 2))),
      ...[-1, 1].map((s) => boat(c, s * 8, fb + 6, 2, 10, s)),
      ...[-1, 1].flatMap((s) => searchlight(c, s * 4, fb + 6, -10)),
    ]),
    mounts: [
      { geo: quad, at: [0, H.top(76), 76], arc: 5 },
      { geo: twin, at: [0, fb + 4, 60], arc: 5 },
      { geo: quad, at: [0, fb, -76], aft: true, arc: 5 },
    ],
  };
});

export const buildIllustrious = carrier(() => {
  const c = RN;
  const g = turret(c, { w: 4.6, h: 2.4, d: 5.2, barrels: 2, len: 5.4, cal: 0.14 });
  const len = 230, beam = 29.2, fb = 8;
  const H = hull(len, beam, fb, 8.5, c, 1.6, { rails: false });
  const dy = fb + 7.5;
  return {
    fixed: merge([flattop(c, H, { len, beam, fb, deck: 0x5e605c, islandZ: 22, mark: WHITE, aaN: 4, aaCal: 0.08 }),
      loft(every(len * 0.35, len * 0.475, 3).map((z) => [0, (H.top(z) - 0.5 + dy - 0.3) / 2, z, Math.max(1, H.side(z, H.top(z)) * 0.98), (dy - 0.3 - H.top(z) + 0.5) / 2, 4]), { color: c.hull, surf: 'plate' }, 12),   // the closed 'hurricane' bow, the hull's sides carried up to the flight deck
      ...[-1, 1].flatMap((s) => [72, -80].map((z) => box(6, 0.6, 7, { x: s * 18.8, y: dy - 2.9, z, color: c.upper })))]),   // the gun sponsons, under the flight deck's edge
    mounts: [{ geo: g, at: [18.8, dy - 2.6, 72], arc: 4 }, { geo: g, at: [-18.8, dy - 2.6, 72], arc: 4 }, { geo: g, at: [18.8, dy - 2.6, -80], aft: true, arc: 4 }, { geo: g, at: [-18.8, dy - 2.6, -80], aft: true, arc: 4 }],
  };
});

/** The T-class: the kit's boat with the T's bulged bow (the two external bow tubes either side of the stem) and her external amidships tubes. */
export const buildTClass = sub(() => {
  const c = { ...RN, hull: 0x4a5056, upper: 0x555c62, gun: 0x555c62, deck: 0x4a4e50 };
  const len = 84, beam = 7.8;
  return merge([
    submarine(c, { len, beam, tower: [11, 4, 4], gunZ: 12 }),
    loft(every(0, 8, 1).map((k) => [0, 0.5, len * 0.3 + k * 1.6, 1.4 + Math.sin((k / 8) * Math.PI) * 1.1, 1.3 + Math.sin((k / 8) * Math.PI) * 0.4, 3]), { color: c.hull, surf: 'plate' }, 12),   // the bow bulge
    ...[-1, 1].map((s) => P.cyl(0.35, 0.35, 0.2, { x: s * 1.1, y: 0.2, z: len * 0.3 + 13, rx: Math.PI / 2, color: BLACK }, 8)),
    ...[-1, 1].map((s) => box(1, 1.1, 7, { x: s * beam * 0.36, y: 0.4, z: -2, color: c.hull })),   // the amidships external tubes' casings
  ]);
});

export const buildVosperMTB = ship(() => torpedoBoat({ ...RN, hull: 0x8a9496, deck: 0x6e7470, upper: 0x9aa2a4, gun: 0x6e767a }, { len: 21.3, beam: 5.6, fb: 1.6, tubes: [[-1.9, 1], [1.9, 1]], twin50: true }));

/** A British merchantman of the convoys: a dark hull, the wartime grey upperworks. */
export const buildMerchantRN = ship(() => transport({ ...RN, hull: 0x3e4246, upper: 0x8c8e88, boat: 0x8c8e88 }, { len: 140, beam: 18, fb: 6.2, houseZ: -4, gunAft: true }));

// ---------------------------------------------------------------- the Kriegsmarine

export const buildNarvik = ship(() => {
  const c = KM;
  const fb = 5.5;
  const H = hull(127, 12, fb, 4, c, 2.6);
  const twin = turret(c, { w: 5.4, h: 2.8, d: 6.6, barrels: 2, len: 7.5, cal: 0.16 });   // the LC/38 twin turret
  const single = mount(c, { w: 3.4, h: 2.6, d: 4.2, barrels: 1, len: 7, cal: 0.16 });
  return {
    fixed: merge([
      ...H.parts,
      ...atlanticBow(H, c, 3.5, 4),
      box(8, 3, 12, { y: fb + 1.5, z: 32, color: c.upper }),
      box(6.5, 3, 7, { y: fb + 4.5, z: 33, color: c.upper }),           // the bridge
      ...windows(0, fb + 5.5, 33, 6.5, 7),
      box(3.4, 1.6, 0.3, { y: fb + 7.5, z: 34, color: c.upper }),       // the FuMO 21 'mattress'
      box(3, 2, 3, { y: fb + 7, z: 31.5, color: c.gun }),
      cyl(0.35, 0.35, 4, { y: fb + 7.6, z: 31.5, rz: Math.PI / 2, color: c.gun }, 8),
      ...mast(c, 0, fb + 3, 27, 15, { rake: 0.06, yard: 7 }),
      box(7, 2.4, 30, { y: fb + 1.2, z: 2, color: c.upper }),           // the midships deckhouse
      ...funnel(c, 0, fb + 2.4, 13, 2, 7, 0.06, { oval: 1.3 }), cap(c, 13 - 0.4, fb + 9.5, 2),
      ...funnel(c, 0, fb + 2.4, -4, 2, 7, 0.06, { oval: 1.3 }), cap(c, -4 - 0.4, fb + 9.5, 2),
      ...[-1, 1].map((s) => aa(c, s * 2.8, fb + 2.4, 4, { n: 2, ry: s * Math.PI / 2, cal: 0.06, len: 2.6 })),   // 3.7 cm twins
      box(7, 2.4, 12, { y: fb + 1.2, z: -28, color: c.upper }),         // the after deckhouse
      ...[-1, 1].flatMap((s) => [-15, 22].map((z) => oerlikon(c, s * 3.6, z > 0 ? fb + 3 : fb + 2.4, z, s * Math.PI / 2))),
      ...[-1, 1].map((s) => boat(c, s * 4.8, fb + 0.2, 8, 7, s)),
      ...searchlight(c, 0, fb + 2.4, -14),
      ...depthCharges(c, H, -60, 2),
    ]),
    mounts: [
      { geo: twin, at: [0, H.top(48) + 0.1, 48], arc: 5 },
      { geo: single, at: [0, fb + 2.5, -24], aft: true, arc: 5 },
      { geo: single, at: [0, fb + 0.1, -38], aft: true, arc: 5 },
      { geo: single, at: [0, fb + 0.1, -48], aft: true, arc: 5 },
    ],
    torps: [{ geo: torpedoMount(c, 4), at: [0, fb + 2.5, 5] }, { geo: torpedoMount(c, 4), at: [0, fb + 0.2, -16] }],
  };
});

export const buildHipper = ship(() => {
  const c = KM;
  const fb = 7.5;
  const H = hull(202.8, 21.3, fb, 6.5, c, 2.8);
  const t2 = turret(c, { w: 7.4, h: 3.6, d: 9, barrels: 2, len: 11, cal: 0.24 });
  const ha = mount(c, { w: 4, h: 2.4, d: 4.4, barrels: 2, len: 5, cal: 0.12 });
  const arado = airplane(0x6a7068, { span: 12.5, len: 11, floats: true, mark: 0x161616 });
  return {
    fixed: merge([
      ...H.parts,
      ...atlanticBow(H, c, 5, 6.5),
      ...[62, -58].map((z) => box(9, 3, 10, { y: fb + 1.5, z, color: c.upper })),     // Bruno's and Caesar's barbettes
      box(12, 4.5, 22, { y: fb + 2.25, z: 36, color: c.upper }),
      box(9, 9, 9, { y: fb + 9, z: 38, color: c.upper }),               // the tower bridge
      ...windows(0, fb + 8, 38, 9, 9), ...windows(0, fb + 12.2, 38, 9, 9),
      cyl(2.4, 2.4, 2.6, { y: fb + 14.8, z: 37, color: c.upper }, 14),  // the foretop's rangefinder cupola
      box(9, 1.2, 1.6, { y: fb + 15.4, z: 37, color: c.gun }),
      box(3.6, 1.8, 0.3, { y: fb + 17.2, z: 38, color: c.upper }),      // FuMO 'mattress'
      ...mast(c, 0, fb + 13.5, 33, 12, { rake: 0.05, yard: 8 }),
      box(12, 4, 44, { y: fb + 2, z: -4, color: c.upper }),
      ...funnel(c, 0, fb + 4, 14, 3.8, 10, 0.05, { oval: 1.4 }), cap(c, 14 - 0.5, fb + 14.6, 3.8),
      box(8, 5, 10, { y: fb + 6.5, z: -2, color: c.upper }),            // the hangar
      catapult(c, 0, fb + 4, -12, Math.PI / 2, arado),
      ...crane(c, 5, fb + 4, -8, 9, 11, Math.PI / 2), ...crane(c, -5, fb + 4, -8, 9, 11, -Math.PI / 2),
      ...mast(c, 0, fb + 4, -26, 18, { yard: 8 }),
      ...[-1, 1].flatMap((s) => [26, 14, -18].map((z) => ha.clone().rotateY(s * Math.PI / 2).translate(s * 7.4, fb + 4, z))),   // 10.5 cm twins
      ...[-1, 1].flatMap((s) => [6, -30].map((z) => aa(c, s * 5.4, fb + 4, z, { n: 2, ry: s * Math.PI / 2, cal: 0.06, len: 2.6 }))),
      ...[-1, 1].map((s) => torpedoMount(c, 3).clone().rotateY(s * Math.PI / 2).translate(s * 8.6, fb + 0.2, -36)),
      ...[-1, 1].map((s) => boat(c, s * 7.8, fb + 4, 2, 9, s)),
      ...[-1, 1].flatMap((s) => searchlight(c, s * 3.4, fb + 4, -20)),
    ]),
    mounts: [
      { geo: t2, at: [0, H.top(74), 74], arc: 5 },
      { geo: t2, at: [0, fb + 3, 62], arc: 5 },
      { geo: t2, at: [0, fb + 3, -58], aft: true, arc: 5 },
      { geo: t2, at: [0, fb, -70], aft: true, arc: 5 },
    ],
  };
});

export const buildBismarck = ship(() => {
  const c = KM;
  const fb = 9;
  const H = hull(251, 36, fb, 9.3, c, 3);
  const t2 = turret(c, { w: 13, h: 5.2, d: 14, barrels: 2, len: 19, cal: 0.45, ears: true });
  const sec = turret(c, { w: 6.4, h: 3, d: 7.4, barrels: 2, len: 8.5, cal: 0.18 });   // the 15 cm twins
  const ha = mount(c, { w: 4.2, h: 2.6, d: 4.6, barrels: 2, len: 5.2, cal: 0.12 });   // the 10.5 cm
  const arado = airplane(0x6a7068, { span: 12.5, len: 11, floats: true, mark: 0x161616 });
  return {
    fixed: merge([
      ...H.parts,
      ...atlanticBow(H, c, 6, 9.3),
      ...[74, -70].map((z) => box(13, 4, 14, { y: fb + 2, z, color: c.upper })),      // Bruno's and Caesar's barbettes
      box(20, 6, 36, { y: fb + 3, z: 36, color: c.upper }),
      cyl(4.4, 4.8, 6, { y: fb + 9, z: 46, color: c.gun }, 16),       // the armoured conning tower
      box(13, 9, 14, { y: fb + 10.5, z: 38, color: c.upper }),         // the tower bridge
      ...windows(0, fb + 11, 38, 13, 14), ...windows(0, fb + 14.4, 38, 13, 14),
      box(8, 4, 8, { y: fb + 17, z: 37, color: c.upper }),
      cyl(3, 3, 3, { y: fb + 20.5, z: 37, color: c.upper }, 16),       // the foretop's rotating rangefinder hood
      box(11, 1.4, 1.8, { y: fb + 21, z: 37, color: c.gun }),
      box(4, 2, 0.3, { y: fb + 23.4, z: 38.4, color: c.upper }),        // FuMO 23
      ...mast(c, 0, fb + 22, 34, 10, { yard: 9 }),
      box(19, 6, 76, { y: fb + 3, z: -16, color: c.upper }),
      ...funnel(c, 0, fb + 6, 10, 5, 12, 0.02, { oval: 1.45 }), cap(c, 10 - 0.2, fb + 18.2, 5),
      box(14, 5, 12, { y: fb + 8.5, z: -18, color: c.upper }),          // the hangar
      catapult(c, 0, fb + 6, -4, Math.PI / 2, arado),
      ...crane(c, 7, fb + 6, -14, 10, 13, Math.PI / 2), ...crane(c, -7, fb + 6, -14, 10, 13, -Math.PI / 2),
      ...mast(c, 0, fb + 11, -30, 20, { yard: 10 }),
      box(9, 5, 9, { y: fb + 8.5, z: -44, color: c.upper }),            // the after control position
      cyl(2.4, 2.4, 2.4, { y: fb + 12.2, z: -44, color: c.upper }, 14),
      ...[-1, 1].flatMap((s) => [36, 22, -46].map((z) => sec.clone().rotateY(s * Math.PI / 2).translate(s * 11.5, fb + 1.6, z))),   // three 15 cm twins a side
      ...[-1, 1].flatMap((s) => [14, 0, -26, -36].map((z) => ha.clone().rotateY(s * Math.PI / 2).translate(s * 7.8, fb + 6, z))),
      ...[-1, 1].flatMap((s) => [28, -8, -54].map((z) => aa(c, s * 9.6, fb + 6, z, { n: 2, ry: s * Math.PI / 2, cal: 0.06, len: 2.6 }))),
      ...[-1, 1].flatMap((s) => every(-100, 100, 14).filter((z) => Math.abs(z) > 62).map((z) => oerlikon(c, s * (H.side(z, fb) - 1.4), H.top(z), z, s * Math.PI / 2))),
      ...[-1, 1].map((s) => boat(c, s * 9.2, fb + 6, 2, 11, s)),
      ...[-1, 1].flatMap((s) => searchlight(c, s * 4, fb + 6, -6)),
    ]),
    mounts: [
      { geo: t2, at: [0, H.top(90), 90], arc: 5 },
      { geo: t2, at: [0, fb + 4, 74], arc: 5 },
      { geo: t2, at: [0, fb + 4, -70], aft: true, arc: 5 },
      { geo: t2, at: [0, fb, -86], aft: true, arc: 5 },
    ],
  };
});

/** Type VIIC: the kit's boat, smaller, with the saddle tanks bulging along her sides and the 'Wintergarten' AA platform aft of the tower. */
export const buildTypeVII = sub(() => {
  const c = { ...KM, hull: 0x7a8086, upper: 0x8a9096, gun: 0x6a7074, deck: 0x5e5a52 };
  const len = 67.1, beam = 6.2;
  return merge([
    submarine(c, { len, beam, tower: [8.5, 3.6, 2], gunZ: 9 }),
    ...[-1, 1].map((s) => loft(every(0, 12, 1).map((k) => [s * beam * 0.42, -0.9, -14 + k * 2.4, 0.15 + Math.sin((k / 12) * Math.PI) * 1.05, 0.25 + Math.sin((k / 12) * Math.PI) * 1.2, 2.4]), { color: c.hull, surf: 'plate' }, 12)),   // the saddle tanks
    box(2.4, 0.15, 3.4, { y: beam * 0.13 + 2.6, z: -3.6, color: c.upper }),                                        // the Wintergarten
    ...[-1, 1].map((s) => P.box(0.05, 0.9, 3.4, { x: s * 1.2, y: beam * 0.13 + 3.1, z: -3.6, color: c.upper, surf: 'metal' })),
    oerlikon(c, 0, beam * 0.13 + 2.7, -4.2, Math.PI),
  ]);
});

/** S 38 class: the tubes covered by the raised forecastle, the low armoured round bridge, a 20 mm fore and aft. */
export const buildSBoot = ship(() => {
  const c = { ...KM, hull: 0x9aa0a2, deck: 0x7e7c74, upper: 0xa2a8aa, gun: 0x6e7478 };
  const d = torpedoBoat(c, { len: 34.9, beam: 5.3, fb: 1.9, tubes: [[-1.15, 8.5], [1.15, 8.5]], twin50: false });
  const H = hull(34.9, 5.3, 1.9, 1.3, c, 0.6, { rails: false, fittings: false });   // (the kit boat's own hull: the forecastle follows its lines)
  const fc = every(-1, 11.5, 1.25).map((z) => [z, Math.max(0.2, H.side(z, 1.9) * 0.97)]);
  return {
    fixed: merge([d.fixed,
      loft(fc.map(([z, w]) => [0, 1.9 + 0.55, z, w, 0.55, 4]), { color: c.hull, surf: 'plate' }, 10), loft(fc.map(([z, w]) => [0, 1.9 + 1.12, z, w * 0.95, 0.06, 6]), { color: c.deck, surf: 'deck' }, 8),   // the raised forecastle over the tubes
      ...[-1, 1].map((s) => P.cyl(0.32, 0.32, 0.1, { x: s * 1.15, y: 1.9 + 0.45, z: 11.55, rx: Math.PI / 2, color: BLACK }, 10)),                          // their mouths, where it steps down
      P.cyl(1.4, 1.5, 1.3, { y: 1.9 + 1.8, z: 2.8, sz: 1.2, color: c.gun }, 14), P.box(2, 0.4, 0.2, { y: 1.9 + 2.1, z: 4.3, color: GLASS }),         // the Kalottenbrücke
      oerlikon(c, 0, 1.9 + 1.1, 7.6, 0),
    ]),
    mounts: d.mounts,
  };
});
