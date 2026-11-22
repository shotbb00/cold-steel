// The Royal Norwegian Navy's and the ROK Navy's ships, 1985 (data/units/navies85.js), at their real size, bow toward +z.
// The warships on the 1985 kit (models/ships1985.js KIT85, the 1945 KIT under it: lofted hulls, rails, hull numbers,
// the ship rig that rides the swell and trains the guns); the landing craft on the landing-craft rig (models/
// landingCraft45.js craft: the bow ramp comes down when she grounds). Each flies her own ensign at the stern.
//   Oslo        Norwegian frigate, 96 m: twin 3-inch forward, the lattice mast on the bridge, one funnel, Sea Sparrow on
//               the after house, six Penguin boxes on the quarterdeck, a 40 mm Bofors right aft
//   Hauk        Norwegian fast attack craft, 36.5 m: Bofors forward, the low house, six Penguins and two torpedo tubes aft
//   Sauda       Norwegian minesweeper (MSC type), 44 m of wood: Bofors forward, the sweep gear on the quarterdeck
//   Reinøysund  Norwegian tank landing craft, 50 m: the open tank deck between high sides, the two-storey house aft
//   L-boat      Norwegian landing boat, 12.4 m: steel, a closed wheelhouse aft
//   Ulsan       ROK frigate, 102 m: 76 mm fore and aft, the big bridge block, a low wide funnel, two Harpoon quads
//   Gearing     ROK destroyer (FRAM I), 119 m: twin 5-inch fore and aft, two funnels, ASROC between them, Harpoons aft
//   PKM         ROK patrol boat, 37 m: Bofors forward, a tall house and mast, the Sea Vulcan aft
//   Kum San     ROK minesweeper (MSC-268), 44 m: twin 20 mm forward, the sweep gear aft
//   Un Bong     ROK tank landing ship (LST-542 class), 100 m: the bow doors, the long main deck, the house aft, LCVPs on davits
//   LCM-8       ROK landing craft, 22.4 m: the open well, the coxswain's house aft
import { P, merge, loft } from '../units/geometry.js';
import { sideProfile } from './vehicleCommon.js';
import { KIT } from './ships1945.js';
import { KIT85 } from './ships1985.js';
import { craft } from './landingCraft45.js';

const { box, cyl, every, strut, bowNumber, boat, vent, raft, ship, mount, funnel, aa, BLACK, GLASS, WHITE } = KIT;
const { hull, put, gun76, lattice, dish, radome, house, boxLauncher, canisters, DARK } = KIT85;

const RNON = { hull: 0x8b9499, deck: 0x4f5457, upper: 0x9aa3a8, gun: 0x929ba0, black: BLACK, boat: 0xa4aaad };   // Norwegian light grey
const ROKN = { hull: 0x737c85, deck: 0x484e54, upper: 0x87909a, gun: 0x87909a, black: BLACK, boat: 0x939ba3 };   // ROK haze grey
const WOODDECK = 0x7a6c52;
const STEEL = 0x5e666b;
const FLOAT = 0xd8542a;

// ---------------------------------------------------------------- the ensigns

/** The ensign on a staff at the stern (x, y, z: the staff's foot), streaming aft; `s` scales it for a small boat. */
function ensign(army, x, y, z, s = 1) {
  const W = 1.5 * s, Hh = 1.05 * s, fy = y + 2.5 * s - Hh / 2, hoist = z - 0.06, fz = hoist - W / 2;
  const g = [P.cyl(0.04 * s, 0.05 * s, 2.6 * s, { x, y: y + 1.3 * s, z, color: BLACK, surf: 'metal' }, 5)];
  const piece = (w, h, zc, dy, color, t) => P.box(t, h, w, { x, y: fy + dy, z: zc, color, surf: 'cloth' });
  if (army === 'no') { // red, the white-edged blue cross (22 × 16), its upright toward the hoist
    const cz = hoist - W * 8 / 22;
    g.push(piece(W, Hh, fz, 0, 0xba0c2f, 0.03), piece(W * 4 / 22, Hh, cz, 0, WHITE, 0.05), piece(W, Hh * 4 / 16, fz, 0, WHITE, 0.05),
      piece(W * 2 / 22, Hh, cz, 0, 0x00205b, 0.07), piece(W, Hh * 2 / 16, fz, 0, 0x00205b, 0.07));
  } else { // the Taegukgi: white, the red-over-blue circle, the four trigrams in the corners
    const r = Hh * 0.25;
    g.push(piece(W, Hh, fz, 0, WHITE, 0.03),
      P.cyl(r, r, 0.07, { x, y: fy + r * 0.28, z: fz, rz: Math.PI / 2, color: 0xcd2e3a }, 14), P.cyl(r * 0.98, r * 0.98, 0.06, { x, y: fy - r * 0.28, z: fz, rz: Math.PI / 2, color: 0x0047a0 }, 14),
      ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => P.box(0.06, Hh * 0.2, W * 0.12, { x, y: fy + b * Hh * 0.3, z: fz + a * W * 0.32, rx: a * b * 0.6, color: BLACK })));
  }
  return g;
}
/** A flat hull-measure for the box-built craft (bowNumber needs `top`, `side` and `len`). */
const flat = (L, B, fb) => ({ len: L, top: () => fb, side: () => B / 2 + 0.02 });

// ---------------------------------------------------------------- guns (mount geometry: base at 0, facing +z)

/** Bofors 40/70 in its rounded shield. */
const bofors = (c) => merge([
  P.cyl(0.9, 1, 0.4, { y: 0.2, color: c.upper }, 12),
  sideProfile([[-1.2, 0.35], [1.0, 0.35], [1.35, 1.0], [0.8, 1.9], [-1.2, 1.9]], 1.9, { color: c.gun, surf: 'plate' }, 0.08),
  P.cyl(0.07, 0.1, 3.2, { y: 1.3, z: 2.7, rx: Math.PI / 2 - 0.06, color: BLACK, surf: 'metal' }, 6),
  P.cyl(0.13, 0.13, 0.45, { y: 1.4, z: 4.2, rx: Math.PI / 2 - 0.06, color: BLACK, surf: 'metal' }, 6),
]);
/** Twin 3-inch/50 Mk 33: the open mount behind its shield. */
const mk33 = (c) => mount(c, { w: 3, h: 2.1, d: 3.4, barrels: 2, len: 4.2, cal: 0.1 });
/** Twin 5-inch/38 Mk 38: the gunhouse of the war's destroyers. */
const mk38 = (c) => mount(c, { w: 4.4, h: 2.9, d: 5.2, barrels: 2, len: 5.6, cal: 0.15 });
/** A twin light gun (30 mm Emerlec, `k` 1; twin 20 mm Oerlikons, smaller). */
const twinLight = (c, k = 1) => merge([
  P.cyl(0.6 * k, 0.7 * k, 0.6 * k, { y: 0.3 * k, color: c.gun }, 10),
  box(1.2 * k, 0.8 * k, 1.2 * k, { y: 0.95 * k, color: c.gun }),
  ...[-0.3, 0.3].map((x) => P.cyl(0.05 * k, 0.06 * k, 2.2 * k, { x: x * k, y: 1.05 * k, z: 1.5 * k, rx: Math.PI / 2 - 0.12, color: BLACK, surf: 'metal' }, 6)),
]);
/** The 20 mm Sea Vulcan: a small gatling on a pedestal. */
const vulcan = (c) => merge([
  P.cyl(0.45, 0.55, 0.9, { y: 0.45, color: c.gun }, 10),
  box(1.0, 0.7, 1.1, { y: 1.2, color: c.gun }),
  P.cyl(0.16, 0.16, 1.9, { y: 1.3, z: 1.4, rx: Math.PI / 2 - 0.1, color: BLACK, surf: 'metal' }, 8),
]);
/** A Penguin launcher: the square box on its frame, angled up a little, facing `ry`. */
const penguin = (c, x, y, z, ry) => put([
  box(1.0, 0.95, 3.2, { y: 1.15, rx: -0.14, color: c.upper }),
  P.box(0.8, 0.75, 0.08, { y: 1.38, z: 1.6, rx: -0.14, color: DARK }),
  ...[-1, 1].map((k) => box(0.12, 0.8, 0.12, { x: k * 0.4, y: 0.4, z: k * 0.6, color: c.gun, surf: 'metal' })),
  box(1.1, 0.12, 2.4, { y: 0.06, color: c.gun }),
], x, y, z, ry);
/** Mk 32 triple torpedo tubes on the deck edge, trained out at `ry`. */
const mk32 = (c, x, y, z, ry) => put([P.cyl(0.4, 0.45, 0.6, { y: 0.3, color: c.gun }, 8), ...[-0.3, 0, 0.3].map((dx, i) => P.cyl(0.17, 0.17, 2.6, { x: dx, y: 0.75 + (i === 1 ? 0.25 : 0), rx: Math.PI / 2, color: c.upper }, 8))], x, y, z, ry);
/** A pole mast with a yard and a navigation radar on it. */
const poleMast = (c, x, y, z, h, yard = 3) => [
  strut([x, y, z], [x, y + h, z], 0.12, c.upper), P.box(yard, 0.1, 0.1, { x, y: y + h * 0.8, z, color: BLACK }),
  dish(Math.max(1.6, yard * 0.7), 0.5)(x, y + h * 0.55, z + 0.25), P.cyl(0.05, 0.05, 1.4, { x, y: y + h + 0.7, z, color: BLACK }, 5),
];

// ---------------------------------------------------------------- the Royal Norwegian Navy

export const buildOslo = ship(() => {
  const c = RNON, fb = 5;
  const H = hull(96, 11.2, fb, 4.4, c, 2.6);
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '300', 2.2),                                              // (F300: the letter is left off, as the kit paints figures)
    put([P.cyl(0.6, 0.7, 0.8, { y: 0.4, color: c.gun }, 8), box(2, 1.1, 2.2, { y: 1.3, rx: -0.45, color: c.upper }), P.box(1.7, 0.9, 0.08, { y: 1.75, z: 1.05, rx: -0.45, color: DARK })], 0, H.top(23), 23), // the Terne launcher
    ...house(c, 0, fb, 12, 9, 3, 16),                                        // the forward deckhouse
    ...house(c, 0, fb + 3, 15, 8, 2.8, 8, 1.6),                              // the bridge
    ...[-1, 1].map((s) => box(1.6, 0.25, 2.4, { x: s * 4.8, y: fb + 5.6, z: 18, color: c.upper })),
    ...lattice(c, 0, fb + 5.8, 11.5, 8, 3, [dish(4.2, 1.6)]),
    radome(0.9)(0, fb + 5.8, 17.2),                                          // the fire-control radar on the bridge roof
    ...house(c, 0, fb, -4, 8, 2.6, 14),
    ...funnel(c, 0, fb + 2.6, -2, 1.5, 5.5, 0.12, { oval: 1.5 }),
    ...house(c, 0, fb, -20, 8.5, 2.8, 14),                                   // the after deckhouse
    boxLauncher(c, 0, fb + 2.8, -22, Math.PI, { w: 2.2, h: 1.5, d: 4 }),      // Sea Sparrow
    ...[-1, 1].flatMap((s) => [0, 1, 2].map((k) => penguin(c, s * 3.3, fb, -30.5 - k * 2.6, s * 0.35))), // the six Penguins
    ...[-1, 1].map((s) => mk32(c, s * 4.4, fb, 4, s * 1.2)),
    ...[-1, 1].map((s) => boat(c, s * 5.2, fb + 0.4, -9, 6, s)),
    ...[-1, 1].flatMap((s) => [raft(s * 4, fb + 3.4, -16), ...vent(c, s * 2.6, fb + 2.6, -8)]),
    ...ensign('no', 0, fb, -47.4),
  ]);
  return { fixed, mounts: [{ geo: mk33(c), at: [0, H.top(32) + 0.1, 32], arc: 5 }, { geo: bofors(c), at: [0, fb + 0.1, -42], aft: true, arc: 5 }] };
});

export const buildHauk = ship(() => {
  const c = { ...RNON, hull: 0x7e888d }, fb = 2.4;
  const H = hull(36.5, 6.2, fb, 1.5, c, 0.7, { fittings: false });
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '986', 0.9),
    ...house(c, 0, fb, 3, 4.2, 2.1, 10),
    ...house(c, 0, fb + 2.1, 5, 3.4, 1.3, 4.4, 0.65),                         // the wheelhouse on top
    ...poleMast(c, 0, fb + 3.4, 3.6, 4.2, 2.2),
    radome(0.55)(0, fb + 3.4, 6.2),                                          // the fire-control dome
    ...[-1, 1].flatMap((s) => [0, 1, 2].map((k) => penguin(c, s * 1.7, fb, -8.5 - k * 2.4, s * 0.3))),
    ...[-1, 1].map((s) => P.cyl(0.3, 0.3, 5.5, { x: s * 2.55, y: fb + 0.5, z: -3.5, rx: Math.PI / 2, color: c.upper }, 10)), // the torpedo tubes
    put([P.cyl(0.35, 0.4, 0.8, { y: 0.4, color: c.gun }, 8), P.cyl(0.05, 0.06, 1.8, { y: 1, z: 0.9, rx: Math.PI / 2 - 0.2, color: BLACK, surf: 'metal' }, 6)], 0, fb, -16, Math.PI), // the 20 mm aft
    ...ensign('no', 0, fb, -18, 0.6),
  ]);
  return { fixed, mounts: [{ geo: bofors(c), at: [0, H.top(11) + 0.1, 11], arc: 5 }] };
});

/** An MSC-type wooden sweeper (Norway's Saudas, Korea's MSC-268s): `gun` the forward mount's geometry. */
function msc(army, c, number, gun) {
  const fb = 3.2;
  const H = hull(44, 8.4, fb, 2.6, { ...c, deck: WOODDECK }, 1.4);
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, number, 1.2),
    ...house(c, 0, fb, 3, 6, 2.4, 14),
    ...house(c, 0, fb + 2.4, 6.5, 4.8, 2, 5, 1.2),                            // the bridge
    ...[-1, 1].map((s) => box(1.2, 0.2, 1.8, { x: s * 3, y: fb + 4, z: 8, color: c.upper })),
    ...poleMast(c, 0, fb + 4.4, 4.5, 7, 3.4),
    ...funnel(c, 0, fb + 2.4, -1.5, 0.75, 2.4, 0.12, { oval: 1.3 }),
    // the sweep gear: the reel and winch, the gallows over the stern, the floats and the kites
    cyl(1.0, 1.0, 2.6, { y: fb + 1.1, z: -10, rz: Math.PI / 2, color: STEEL }, 12),
    box(2.4, 1.2, 1.8, { y: fb + 0.6, z: -7, color: DARK }),
    ...[-1, 1].map((s) => strut([s * 3, fb, -20.5], [s * 2, fb + 4, -19.5], 0.12, c.upper)), P.box(4.4, 0.25, 0.25, { y: fb + 4, z: -19.5, color: c.upper, surf: 'metal' }),
    ...[-1, 1].map((s) => cyl(0.4, 0.4, 2.6, { x: s * 2.8, y: fb + 0.5, z: -15, rx: Math.PI / 2, color: FLOAT }, 8)),
    ...[-1, 1].map((s) => box(1.2, 0.9, 0.15, { x: s * 1.6, y: fb + 0.6, z: -17.5, color: DARK, surf: 'metal' })),
    ...[-1, 1].map((s) => boat(c, s * 3.6, fb + 0.2, -3, 4.5, s)),
    ...ensign(army, 0, fb, -21.6, 0.8),
  ]);
  return { fixed, mounts: [{ geo: gun, at: [0, H.top(14) + 0.1, 14], arc: 5 }, { geo: twinLight(c, 0.7), at: [0, fb + 2.4, -4], aft: true, arc: 4 }] };
}
export const buildSauda = ship(() => msc('no', RNON, '311', bofors(RNON)));

/** Reinøysund: 50 × 10.2 m. */
export const buildReinoysund = craft(() => {
  const L = 50, B = 10.2, fb = 2.6, wall = fb + 1.4, c = RNON;
  const fixed = merge([
    box(B, 1.0, L - 0.4, { y: 0.5, z: -0.2, color: c.hull }),                              // the bottom under the tank deck
    box(B * 1.01, 0.35, L - 0.4, { y: -0.05, z: -0.2, color: 0x2a1c18 }),                   // the boot topping
    ...[-1, 1].map((s) => box(0.7, wall, L - 0.4, { x: s * (B / 2 - 0.35), y: wall / 2, z: -0.2, color: c.hull })), // the high sides
    ...[-1, 1].map((s) => P.box(0.08, 0.08, L - 14, { x: s * (B / 2 - 0.35), y: wall + 0.9, z: 6, color: c.upper, surf: 'metal' })), // the rails on them
    box(B, wall, 13, { y: wall / 2, z: -L / 2 + 6.5, color: c.hull }),                       // the stern block
    box(B - 1.4, 0.15, L - 14, { y: 1.0, z: 6, color: STEEL, surf: 'deck' }),               // the tank deck
    ...house(c, 0, wall, -L / 2 + 6, 8.4, 2.4, 10),
    ...house(c, 0, wall + 2.4, -L / 2 + 7.5, 6.4, 2.2, 6, 1.3),                             // the bridge
    ...[-1, 1].map((s) => box(1.4, 0.2, 2, { x: s * 3.9, y: wall + 4.2, z: -L / 2 + 9.6, color: c.upper })),
    ...poleMast(c, 0, wall + 4.6, -L / 2 + 6.5, 6, 3),
    ...[-1, 1].map((s) => P.cyl(0.45, 0.5, 2.4, { x: s * 2.2, y: wall + 3.6, z: -L / 2 + 2.8, color: c.upper }, 10)),     // the exhausts
    ...[-1, 1].map((s) => P.cyl(0.4, 0.4, 0.3, { x: s * 2.2, y: wall + 4.85, z: -L / 2 + 2.8, color: BLACK }, 10)),
    ...[-1, 1].flatMap((s) => [P.cyl(0.4, 0.45, 0.9, { x: s * 3.8, y: wall + 0.45, z: -L / 2 + 12, color: c.gun }, 8), P.cyl(0.05, 0.06, 1.8, { x: s * 3.8, y: wall + 1.1, z: -L / 2 + 13, rx: Math.PI / 2 - 0.3, color: BLACK, surf: 'metal' }, 6)]), // the 20 mm
    ...bowNumber(flat(L, B, wall), '4502', 1.3),
    ...ensign('no', 0, wall, -L / 2 + 0.4, 0.8),
  ]);
  const ramp = merge([box(B - 2, 3.6, 0.25, { y: 1.8, color: STEEL, surf: 'metal' }), ...[0.9, 1.8, 2.7].map((y) => box(B - 2.1, 0.08, 0.15, { y, z: -0.15, color: DARK, surf: 'metal' }))]);
  return { fixed, ramp, hinge: [1.0, L / 2 - 0.4], gunAt: [wall + 1.2, -L / 2 + 12] };
});

/** The Norwegian landing boat: 12.4 × 3.7 m, steel, the wheelhouse closed against the spray. */
export const buildNoLandingBoat = craft(() => {
  const L = 12.4, B = 3.7, fb = 1.6, c = RNON;
  const fixed = merge([
    box(B, 0.45, L - 0.5, { y: 0.15, z: -0.25, color: c.hull }),
    ...[-1, 1].map((s) => box(0.15, fb + 0.5, L - 0.5, { x: s * (B / 2 - 0.075), y: (fb + 0.5) / 2, z: -0.25, color: c.hull })),
    box(B - 0.3, 0.1, L - 3.6, { y: 0.4, z: 1.0, color: STEEL, surf: 'deck' }),            // the well's floor
    box(B, fb + 0.5, 2.6, { y: (fb + 0.5) / 2, z: -L / 2 + 1.3, color: c.hull }),           // the stern
    box(2.2, 1.5, 1.8, { y: fb + 1.25, z: -L / 2 + 1.6, color: c.upper }),                  // the wheelhouse
    P.box(2.25, 0.45, 0.06, { y: fb + 1.6, z: -L / 2 + 2.52, color: GLASS }),
    ...[-1, 1].map((s) => P.box(0.06, 0.45, 1.1, { x: s * 1.12, y: fb + 1.6, z: -L / 2 + 1.8, color: GLASS })),
    P.cyl(0.04, 0.04, 1.6, { y: fb + 2.8, z: -L / 2 + 1.2, color: BLACK }, 5), P.box(0.7, 0.12, 0.18, { y: fb + 3.2, z: -L / 2 + 1.2, color: DARK }), // the mast and radar
    box(B * 0.92, 0.25, 0.4, { y: -0.1, z: -0.4, color: 0x2a2420 }),
    ...ensign('no', 0, fb + 0.5, -L / 2 + 0.15, 0.45),
  ]);
  const ramp = merge([box(B - 0.3, 2.1, 0.14, { y: 1.05, color: STEEL, surf: 'metal' }), ...[0.5, 1.0, 1.5].map((y) => box(B - 0.35, 0.06, 0.1, { y, z: -0.1, color: DARK, surf: 'metal' }))]);
  return { fixed, ramp, hinge: [0.25, L / 2 - 0.5], gunAt: [fb + 1, -L / 2 + 3] };
});

// ---------------------------------------------------------------- the ROK Navy

export const buildUlsan = ship(() => {
  const c = ROKN, fb = 5.5;
  const H = hull(102, 11.5, fb, 3.5, c, 1.8);
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '951', 2.2),
    ...house(c, 0, fb, 16, 10, 3.2, 22),                                     // the forward block
    ...house(c, 0, fb + 3.2, 21, 9, 3, 8, 1.8),                              // the bridge
    ...[-1, 1].map((s) => box(1.4, 0.25, 2.2, { x: s * 5.1, y: fb + 5.8, z: 24, color: c.upper })),
    ...lattice(c, 0, fb + 6.2, 17, 8, 3.2, [dish(4.6, 1.8)]),
    radome(1)(0, fb + 6.2, 23),                                             // the fire-control dome
    ...house(c, 0, fb, -2, 7, 5, 8),                                         // the low wide funnel
    P.box(6.4, 0.6, 7.4, { y: fb + 5.2, z: -2, color: BLACK }),
    ...[-1, 1].map((s) => canisters(c, s * 3.2, fb, -9, s * 0.3)),           // the Harpoon quads
    ...house(c, 0, fb, -20, 9, 2.8, 16),                                     // the after deckhouse
    ...[-1, 1].map((s) => twinLight(c).translate(s * 3.2, fb + 2.8, -25)),
    ...[-1, 1].map((s) => mk32(c, s * 4.4, fb, 4, s * 1.2)),
    ...[-1, 1].map((s) => boat(c, s * 5.6, fb + 0.4, 2, 6, s)),
    ...[-1, 1].flatMap((s) => [raft(s * 4.2, fb + 3.6, -14), ...vent(c, s * 2.8, fb + 3.2, 8)]),
    ...ensign('rok', 0, fb, -50.6),
  ]);
  const g = gun76(c);
  return { fixed, mounts: [{ geo: g, at: [0, H.top(36) + 0.1, 36], arc: 5 }, { geo: g, at: [0, fb + 0.1, -38], aft: true, arc: 5 },
    { geo: twinLight(c), at: [4.2, fb + 3.2, 11], arc: 4 }, { geo: twinLight(c), at: [-4.2, fb + 3.2, 11], arc: 4 }] };
});

export const buildGearingRok = ship(() => {
  const c = ROKN, fb = 5.6;
  const H = hull(119, 12.5, fb, 4.4, c, 2.2);
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '915', 2.4),
    ...house(c, 0, fb, 24, 9, 2.8, 16),                                      // the forward deckhouse
    ...house(c, 0, fb + 2.8, 27, 8, 3, 8, 1.8),                              // the bridge
    box(2.6, 1.8, 2.6, { y: fb + 6.7, z: 27, color: c.upper }), cyl(0.3, 0.3, 3.8, { y: fb + 7.1, z: 27, rz: Math.PI / 2, color: c.gun }, 8), // the Mk 37 director
    ...lattice(c, 0, fb + 2.8, 19, 13, 3.6, [dish(6, 2.2)]),                 // the SPS-40
    ...house(c, 0, fb, 2, 8, 2.4, 30),                                       // the midships house
    ...funnel(c, 0, fb + 2.4, 11, 1.5, 6.5, 0.08, { oval: 1.4 }),
    ...funnel(c, 0, fb + 2.4, -8, 1.5, 6, 0.08, { oval: 1.4 }),
    boxLauncher(c, 0, fb + 2.4, 1.5, 0, { w: 2.6, h: 1.8, d: 4.4 }),          // ASROC, between the funnels
    ...house(c, 0, fb, -20, 9, 4, 9),                                        // the old DASH hangar
    ...[-1, 1].map((s) => canisters(c, s * 3, fb, -31, s * 0.4)),            // the Harpoon quads on the DASH deck
    ...[-1, 1].map((s) => mk32(c, s * 4.6, fb, -14, s * 1.2)),
    ...[-1, 1].map((s) => boat(c, s * 5.6, fb + 0.4, 6, 6.5, s)),
    ...[-1, 1].flatMap((s) => [raft(s * 4, fb + 3, -2), ...vent(c, s * 2.6, fb + 2.4, -12)]),
    ...ensign('rok', 0, fb, -59.2),
  ]);
  const g = mk38(c);
  return { fixed, mounts: [{ geo: g, at: [0, H.top(42) + 0.1, 42], arc: 5 }, { geo: g, at: [0, fb + 0.1, -44], aft: true, arc: 5 }] };
});

export const buildPKM = ship(() => {
  const c = ROKN, fb = 2.8;
  const H = hull(37, 6.9, fb, 1.7, c, 0.9, { fittings: false });
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '211', 1),
    ...house(c, 0, fb, 2, 5, 2.4, 12),
    ...house(c, 0, fb + 2.4, 4.4, 4.2, 1.6, 5, 0.9),                          // the bridge
    ...lattice(c, 0, fb + 4, 2.2, 4.2, 1.4, [dish(2.4, 0.7)]),
    ...[-1, 1].map((s) => put([P.cyl(0.2, 0.25, 0.8, { y: 0.4, color: c.gun }, 6), P.cyl(0.04, 0.05, 1.4, { y: 0.95, z: 0.7, rx: Math.PI / 2 - 0.2, color: BLACK, surf: 'metal' }, 5)], s * 2.4, fb + 2.4, 5, s * 0.8)), // the .50s on the bridge wings
    ...ensign('rok', 0, fb, -18, 0.6),
  ]);
  return { fixed, mounts: [{ geo: bofors(c), at: [0, H.top(11) + 0.1, 11], arc: 5 }, { geo: vulcan(c), at: [0, fb + 0.1, -12], aft: true, arc: 5 }] };
});

export const buildKumSan = ship(() => msc('rok', ROKN, '551', twinLight(ROKN, 0.75)));

/** Un Bong (LST-542 class): 100 × 15.2 m. */
export const buildUnBong = craft(() => {
  const L = 100, B = 15.2, fb = 4.6, draft = 2.2, c = ROKN, bowL = 14, z0 = L / 2 - bowL;
  const fixed = merge([
    box(B, fb + draft, L - bowL, { y: (fb - draft) / 2, z: -bowL / 2, color: c.hull }),
    loft([[0, (fb - draft) / 2, z0 - 0.1, B / 2, (fb + draft) / 2, 6], [0, (fb - draft) / 2 + 0.2, z0 + bowL * 0.55, B / 2 * 0.86, (fb + draft) / 2 - 0.1, 5], [0, (fb - draft) / 2 + 0.6, L / 2 - 0.3, B / 2 * 0.5, (fb + draft) / 2 - 0.5, 4]], { color: c.hull, surf: 'plate' }, 16), // the blunt bow
    ...[-1, 1].map((s) => P.box(0.08, fb + 0.5, 0.1, { x: s * 0.3, y: (fb - draft) / 2 + 0.6, z: L / 2 - 0.2, color: DARK })), // the bow doors' seam
    box(B * 1.01, 0.4, L - bowL, { y: -0.1, z: -bowL / 2, color: 0x2a1c18 }),
    box(B - 0.4, 0.12, L - 2, { y: fb + 0.06, z: -0.5, color: c.deck, surf: 'deck' }),
    ...[-1, 1].flatMap((s) => [P.box(0.06, 0.06, L - 8, { x: s * (B / 2 - 0.15), y: fb + 1.05, z: -2, color: c.upper, surf: 'metal' }), ...every(-L / 2 + 2, L / 2 - 8, 4).map((z) => P.box(0.06, 1.05, 0.06, { x: s * (B / 2 - 0.15), y: fb + 0.53, z, color: c.upper, surf: 'metal' }))]),
    box(6, 0.3, 8, { y: fb + 0.2, z: 22, color: DARK }),                                       // the elevator hatch to the tank deck
    ...house(c, 0, fb, -L / 2 + 13, 12, 5.4, 22),                                             // the house aft
    ...house(c, 0, fb + 5.4, -L / 2 + 17, 8, 2.6, 7, 1.5),                                    // the bridge
    ...[-1, 1].map((s) => box(2, 0.25, 2.4, { x: s * 5, y: fb + 7.7, z: -L / 2 + 19.5, color: c.upper })),
    ...poleMast(c, 0, fb + 8, -L / 2 + 15, 9, 4),
    ...[-1, 1].map((s) => P.cyl(0.6, 0.65, 3, { x: s * 3.5, y: fb + 6.9, z: -L / 2 + 8, color: c.upper }, 10)),          // the exhausts
    ...[-1, 1].map((s) => P.cyl(0.55, 0.55, 0.3, { x: s * 3.5, y: fb + 8.5, z: -L / 2 + 8, color: BLACK }, 10)),
    aa(c, 0, fb, L / 2 - 8, { n: 2 }), aa(c, 0, fb + 5.4, -L / 2 + 6, { n: 2, ry: Math.PI }),  // the twin 40s, bow and stern
    ...[-1, 1].flatMap((s) => [aa(c, s * 5.5, fb, 12, { n: 2, ry: s * Math.PI / 2 }), aa(c, s * 5.5, fb, -14, { n: 2, ry: s * Math.PI / 2 })]),
    ...[-1, 1].flatMap((s) => [-18, -6].map((z) => boat(c, s * 7.8, fb + 0.6, z, 9, s))),     // the LCVPs on their davits
    ...bowNumber(flat(L, B, fb + 0.5), '807', 2.2),
    ...ensign('rok', 0, fb + 5.4, -L / 2 + 0.6),
  ]);
  const ramp = merge([box(B * 0.42, fb + 0.6, 0.3, { y: (fb + 0.6) / 2, color: STEEL, surf: 'metal' })]);
  return { fixed, ramp, hinge: [0.6, L / 2 - 0.2], gunAt: [fb + 2, L / 2 - 8] };
});

/** LCM-8: 22.4 × 6.4 m. */
export const buildLCM8 = craft(() => {
  const L = 22.4, B = 6.4, fb = 2.0, c = ROKN;
  const fixed = merge([
    box(B, 0.7, L - 0.4, { y: 0.25, z: -0.2, color: c.hull }),
    box(B * 1.01, 0.3, L - 0.4, { y: -0.05, z: -0.2, color: 0x2a1c18 }),
    ...[-1, 1].map((s) => box(0.5, fb + 0.4, L - 0.4, { x: s * (B / 2 - 0.25), y: (fb + 0.4) / 2, z: -0.2, color: c.hull })),
    box(B - 1, 0.1, L - 6.4, { y: 0.62, z: 2.2, color: STEEL, surf: 'deck' }),              // the well
    box(B, fb + 0.4, 6, { y: (fb + 0.4) / 2, z: -L / 2 + 3, color: c.hull }),               // the stern, the engines under it
    box(2.6, 1.6, 2.2, { x: 1.1, y: fb + 1.2, z: -L / 2 + 3.6, color: c.upper }),           // the coxswain's house, to starboard
    P.box(2.65, 0.45, 0.06, { x: 1.1, y: fb + 1.6, z: -L / 2 + 4.72, color: GLASS }),
    ...[-1, 1].flatMap((s) => [P.cyl(0.3, 0.35, 0.5, { x: s * 2.3, y: fb + 0.65, z: -L / 2 + 5.4, color: c.gun }, 8), P.cyl(0.04, 0.05, 1.4, { x: s * 2.3, y: fb + 1.1, z: -L / 2 + 6, rx: Math.PI / 2 - 0.2, color: BLACK, surf: 'metal' }, 5)]), // the .50s
    P.cyl(0.04, 0.04, 2, { x: 1.1, y: fb + 3, z: -L / 2 + 3.2, color: BLACK }, 5),
    ...ensign('rok', -1.6, fb + 0.4, -L / 2 + 0.3, 0.5),
  ]);
  const ramp = merge([box(B - 1.2, 2.4, 0.2, { y: 1.2, color: STEEL, surf: 'metal' }), ...[0.6, 1.2, 1.8].map((y) => box(B - 1.3, 0.07, 0.12, { y, z: -0.12, color: DARK, surf: 'metal' }))]);
  return { fixed, ramp, hinge: [0.5, L / 2 - 0.4], gunAt: [fb + 1, -L / 2 + 5.4] };
});
