// 1985 warships (WW3 at sea: data/units/ships85.js), built at their real size, bow toward +z, on the
// 1945 kit (models/ships1945.js KIT: lofted hulls, rails, masts, hull numbers, the ship rig that rides
// the swell and trains the guns). What's new is the 1980s kit below: missile canisters and box
// launchers, the arm launchers (Mk 26, Mk 13, SA-N-3, Shtil), vertical-launch and Granit lids, Phalanx
// and AK-630, the SPY-1 faces, the big Soviet radars (Top Pair, Top Sail, Top Dome), lattice masts,
// macks, hangars and helicopter decks; and the modern submarines, teardrop hulls under a sail.
// US ships haze grey with a dark non-skid deck and their hull numbers; Soviet ships a bluer grey.
import * as THREE from 'three';
import { P, merge, loft } from '../units/geometry.js';
import { sideProfile } from './vehicleCommon.js';
import { KIT, buildIowa } from './ships1945.js';

const { box, cyl, every, strut, hull, bowNumber, numerals, boat, windows, vent, raft, ship, sub, BLACK, GLASS, WHITE } = KIT;
const USN = { hull: 0x7f868c, deck: 0x4c5156, upper: 0x8d949a, gun: 0x8d949a, black: BLACK, boat: 0x8d949a };
const VMF = { hull: 0x6a7882, deck: 0x5c4a44, upper: 0x7b8993, gun: 0x75838d, black: BLACK, boat: 0xa0a49e };
const DOME = 0xe4e4dc;
const DARK = 0x3a3e42;
const SUB = { hull: 0x1c1e20, deck: 0x1c1e20, upper: 0x202224, gun: 0x202224, black: BLACK, boat: 0x202224 };

/** A geometry part rotated about y by `ry` and put at (x, y, z). */
const put = (parts, x, y, z, ry = 0) => merge(parts).rotateY(ry).translate(x, y, z);

// ---------------------------------------------------------------- guns (mount geometry: base at 0, facing +z)

/** Mk 45 5-inch: the smooth faceted gunhouse, one long barrel. */
const mk45 = (c) => merge([
  sideProfile([[-2.6, 0], [2.2, 0], [3.2, 1.1], [2.4, 2.3], [-2.6, 2.3]], 3.2, { color: c.gun, surf: 'plate' }, 0.12),
  P.cyl(1.5, 1.6, 0.5, { y: -0.2, color: c.upper }, 14),
  P.cyl(0.12, 0.16, 7, { y: 1.1, z: 6.2, rx: Math.PI / 2, color: c.gun, surf: 'metal' }, 8),
]);
/** AK-130: the big boxy twin 130 mm house. */
const ak130 = (c) => merge([
  sideProfile([[-3.2, 0], [3, 0], [3.7, 1.1], [3.1, 2.8], [-3.2, 2.8]], 4.6, { color: c.gun, surf: 'plate' }, 0.15),
  P.cyl(2.1, 2.2, 0.6, { y: -0.25, color: c.upper }, 14),
  ...[-0.75, 0.75].map((x) => P.cyl(0.13, 0.18, 6.8, { x, y: 1.3, z: 6.6, rx: Math.PI / 2, color: c.gun, surf: 'metal' }, 8)),
  box(1, 0.6, 1.2, { y: 3.1, z: -1.4, color: c.gun }),
]);
/** A 76 mm (OTO Melara, AK-176): a rounded little house; `twin` — the Soviet AK-726. */
const gun76 = (c, twin = false) => merge([
  sideProfile([[-1.6, 0], [1.4, 0], [2, 0.9], [1.3, 1.7], [-1.6, 1.7]], twin ? 3.2 : 2.4, { color: c.gun, surf: 'plate' }, 0.1),
  P.cyl(1.2, 1.3, 0.4, { y: -0.15, color: c.upper }, 12),
  ...(twin ? [-0.55, 0.55] : [0]).map((x) => P.cyl(0.08, 0.1, 4.2, { x, y: 0.9, z: 3.7, rx: Math.PI / 2, color: c.gun, surf: 'metal' }, 8)),
]);
/** Phalanx: the white dome on its mount, the six-barrel gun under it. */
const phalanx = (c) => merge([
  P.cyl(0.7, 0.9, 1.4, { y: 0.7, color: c.gun }, 10),
  box(1.5, 1, 1.6, { y: 1.9, color: c.gun }),
  P.cyl(0.78, 0.78, 1.5, { y: 3.1, color: DOME, surf: 'paint' }, 14),
  P.sphere(0.78, { y: 3.85, sy: 0.75, color: DOME, surf: 'paint' }, 14, 8),
  P.cyl(0.2, 0.22, 2.2, { y: 2.2, z: 1.7, rx: Math.PI / 2 - 0.15, color: BLACK, surf: 'metal' }, 8),
]);
/** AK-630: a squat round turret, one six-barrel gun. */
const ak630 = (c) => merge([
  P.cyl(0.9, 1, 1, { y: 0.5, color: c.gun }, 12),
  P.sphere(0.9, { y: 1, sy: 0.6, color: c.gun }, 12, 6),
  P.cyl(0.1, 0.12, 2.1, { y: 1.05, z: 1.5, rx: Math.PI / 2 - 0.1, color: BLACK, surf: 'metal' }, 6),
]);

// ---------------------------------------------------------------- launchers (fixed parts)

/** Harpoon (or Moskit, `big`): canisters in a frame, angled up, facing `ry` — `n` of them, two a tier. */
function canisters(c, x, y, z, ry, { n = 4, r = 0.3, len = 4.6, up = 0.5 } = {}) {
  const g = [];
  for (let i = 0; i < n; i++) {
    const cx = ((i % 2) - 0.5) * r * 2.4, cy = Math.floor(i / 2) * r * 2.3;
    g.push(P.cyl(r, r, len, { x: cx, y: 0.8 + cy + len * 0.5 * Math.sin(up), z: 0, rx: Math.PI / 2 - up, color: c.upper, surf: 'plate' }, 10));
    g.push(P.cyl(r * 1.05, r * 1.05, 0.12, { x: cx, y: 0.8 + cy + len * Math.sin(up), z: len * 0.5 * Math.cos(up), rx: Math.PI / 2 - up, color: DARK }, 10));
  }
  g.push(box(r * 5, 0.5, len * 0.5, { y: 0.3, color: c.gun }), ...[-1, 1].map((s) => box(0.15, 1.6, 0.15, { x: s * r * 2.6, y: 1, z: -len * 0.25, color: c.gun, surf: 'metal' })));
  return put(g, x, y, z, ry);
}
/** A box launcher (ASROC, Sea Sparrow, SS-N-14): a cell block on a trainable pedestal, raised a little. */
const boxLauncher = (c, x, y, z, ry, { w = 2.6, h = 1.8, d = 5, up = 0.25, cells = 8 } = {}) => put([
  P.cyl(0.9, 1.1, 1.2, { y: 0.6, color: c.gun }, 10),
  box(w, h, d, { y: 1.2 + h / 2, rx: -up, color: c.upper }),
  ...Array.from({ length: cells }, (_, i) => P.box(w / Math.ceil(cells / 2) * 0.8, h / 2 * 0.8, 0.1, { x: ((i % Math.ceil(cells / 2)) - (Math.ceil(cells / 2) - 1) / 2) * (w / Math.ceil(cells / 2)), y: 1.2 + h * (i < cells / 2 ? 0.27 : 0.73), z: d / 2 + 0.03, rx: -up, color: DARK })),
], x, y, z, ry);
/** An arm launcher: a drum on the magazine hatch and one or two rails with a missile on each. */
const armLauncher = (c, x, y, z, { arms = 2, ry = 0, missile = WHITE } = {}) => put([
  P.cyl(2.2, 2.2, 0.2, { y: 0.1, color: DARK }, 16),
  P.cyl(1.1, 1.4, 1.4, { y: 0.8, color: c.gun }, 12),
  ...(arms === 2 ? [-1, 1] : [0]).flatMap((s) => [
    box(0.5, 0.5, 4.2, { x: s * 1, y: 2, z: 0.6, rx: -0.3, color: c.gun }),
    P.cyl(0.18, 0.18, 4.4, { x: s * 1, y: 2.55, z: 0.7, rx: Math.PI / 2 - 0.3, color: missile, surf: 'paint' }, 8),
  ]),
], x, y, z, ry);
/** Flush lids on deck: a grid of square (VLS) or round (Granit, S-300F) hatches. */
function lids(x, y, z, cols, rows, { pitch = 1.6, round = false, size = 1.2, color = DARK } = {}) {
  const g = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const lx = x + (i - (cols - 1) / 2) * pitch, lz = z + (j - (rows - 1) / 2) * pitch;
    g.push(round ? P.cyl(size / 2, size / 2, 0.12, { x: lx, y: y + 0.06, z: lz, color }, 12) : P.box(size, 0.12, size, { x: lx, y: y + 0.06, z: lz, color }));
  }
  return g;
}
/** Big inclined tubes along a side (Slava's Bazalts, Kiev's): `pairs` two-high, facing forward and up a little. */
const sideTubes = (c, x, y, z0, z1, pairs, r = 0.95) => every(0, pairs - 1, 1).flatMap((i) => {
  const z = z0 + ((z1 - z0) * i) / Math.max(1, pairs - 1);
  return [0, 1].map((k) => P.cyl(r, r, 9, { x, y: y + r + k * r * 2.1, z, rx: Math.PI / 2 - 0.22, color: c.upper, surf: 'plate' }, 12));
});
/** An RBU anti-submarine rocket launcher: a fan of short barrels on a mount. */
const rbu = (c, x, y, z, ry = 0) => put([P.cyl(0.6, 0.7, 0.8, { y: 0.4, color: c.gun }, 8), ...every(0, 11, 1).map((i) => P.cyl(0.11, 0.11, 1.6, { x: ((i % 6) - 2.5) * 0.24, y: 1.1 + Math.floor(i / 6) * 0.25, z: 0.3, rx: Math.PI / 2 - 0.6, color: BLACK, surf: 'metal' }, 6))], x, y, z, ry);

// ---------------------------------------------------------------- radars and masts

/** A lattice mast: four legs to a platform, cross-braced; `top` what sits on it. */
function lattice(c, x, y, z, h, w, top = []) {
  const g = [];
  const k = 0.32; // (the top's share of the base's width)
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [a, b] of legs) g.push(strut([x + a * w / 2, y, z + b * w / 2], [x + a * w * k / 2, y + h, z + b * w * k / 2], 0.14, c.upper));
  for (let i = 1; i <= 3; i++) {
    const t = i / 4, s = (1 - t) + t * k, yy = y + h * t;
    for (let e = 0; e < 4; e++) {
      const [a1, b1] = legs[e], [a2, b2] = legs[(e + 1) % 4];
      g.push(strut([x + a1 * w * s / 2, yy, z + b1 * w * s / 2], [x + a2 * w * s / 2, yy, z + b2 * w * s / 2], 0.06, c.upper));
    }
  }
  g.push(box(w * k + 1.4, 0.2, w * k + 1.4, { x, y: y + h, z, color: c.upper }), P.cyl(0.12, 0.12, 3.5, { x, y: y + h + 1.7, z, color: BLACK, surf: 'metal' }, 5));
  return [...g, ...top.map((f) => f(x, y + h + 0.2, z))];
}
// radar heads, (x, y, z) at their foot
const dish = (w, h) => (x, y, z) => merge([P.cyl(0.25, 0.3, 1, { x, y: y + 0.5, z, color: DARK }, 8), P.box(w, h, 0.25, { x, y: y + 1 + h / 2, z, rx: -0.15, color: 0x5a6066, surf: 'metal' }), P.box(w, 0.12, 0.12, { x, y: y + 1, z: z + 0.8, color: BLACK })]);
const slab = (w, h) => (x, y, z) => merge([P.cyl(0.25, 0.3, 1, { x, y: y + 0.5, z, color: DARK }, 8), P.box(w, h, 0.45, { x, y: y + 1 + h / 2, z, rx: -0.25, color: 0x6a7076 })]);
const topPair = (x, y, z) => merge([P.cyl(0.4, 0.5, 1.2, { x, y: y + 0.6, z, color: DARK }, 8), ...[-1, 1].map((s) => P.box(6.5, 3.6, 0.4, { x, y: y + 3.1, z: z + s * 1.2, rx: s * 0.2, color: 0x5e666c })), P.box(1.2, 4, 2.4, { x, y: y + 3, z, color: DARK })]);
const topSail = (x, y, z) => merge([P.cyl(0.4, 0.5, 1.2, { x, y: y + 0.6, z, color: DARK }, 8), P.box(7.5, 4.2, 0.5, { x, y: y + 3.3, z: z + 0.6, rx: -0.35, color: 0x5e666c }), P.box(7.5, 0.3, 2, { x, y: y + 1.3, z: z - 0.3, color: DARK })]);
const headNet = (x, y, z) => merge([P.cyl(0.25, 0.3, 1, { x, y: y + 0.5, z, color: DARK }, 8), P.box(5, 0.9, 0.35, { x, y: y + 1.4, z, color: 0x5e666c }), P.box(0.35, 0.9, 5, { x, y: y + 2.4, z, color: 0x5e666c })]);
const radome = (r = 1.2) => (x, y, z) => merge([P.cyl(r * 0.5, r * 0.6, 0.8, { x, y: y + 0.4, z, color: DARK }, 8), P.sphere(r, { x, y: y + 0.8 + r * 0.8, z, color: DOME, surf: 'paint' }, 12, 8)]);
/** The Top Dome / Front Door directors: a big dome on a squat base. */
const bigDome = (c, x, y, z, r = 2.6) => [P.cyl(r * 0.9, r, 1.6, { x, y: y + 0.8, z, color: c.upper }, 16), P.sphere(r, { x, y: y + 1.6, z, sy: 0.9, color: DOME, surf: 'paint' }, 16, 10)];
/** SPY-1: the octagonal flat array on a superstructure face, looking out along `ry` (tilted back a little). */
const spy1 = (x, y, z, ry) => put([P.cyl(2.3, 2.3, 0.25, { rx: Math.PI / 2 - 0.2, color: 0x5a6268 }, 8), P.cyl(2.45, 2.45, 0.12, { z: -0.1, rx: Math.PI / 2 - 0.2, color: DARK }, 8)], x, y, z, ry);
/** A mack (mast-and-stack): a tapered uptake, the exhaust mouths on top, a lattice mast standing on it. */
function mack(c, x, y, z, w, d, h, top = []) {
  const g = [loft([[x, y, z, w / 2, d / 2, 4], [x, y + h * 0.6, z, w / 2 * 0.9, d / 2 * 0.92, 4], [x, y + h, z, w / 2 * 0.7, d / 2 * 0.8, 4]], { color: c.upper, surf: 'plate' }, 12)];
  g.push(...[-0.25, 0.25].map((k) => P.cyl(w * 0.16, w * 0.16, 0.6, { x: x + k * w, y: y + h + 0.1, z: z - d * 0.15, color: BLACK }, 10)));
  g.push(...lattice(c, x, y + h, z + d * 0.15, 7, w * 0.8, top));
  return g;
}
/** A deckhouse block with a band of bridge windows across its front (`win`: the windows' height from its foot). */
const house = (c, x, y, z, w, h, d, win = null) => [box(w, h, d, { x, y: y + h / 2, z, color: c.upper }), ...(win != null ? windows(x, y + win, z, w, d) : [])];
/** A helicopter deck: the landing circle and lines, nets at the edges (on the deck at y). */
const helideck = (x, y, z, w, d) => [
  P.torus(Math.min(w, d) * 0.3, 0.12, { x, y: y + 0.08, z, rx: Math.PI / 2, color: WHITE }, 28),
  P.box(0.3, 0.05, d * 0.9, { x, y: y + 0.08, z, color: WHITE }),
  P.box(w * 0.5, 0.05, 0.3, { x, y: y + 0.08, z: z - d * 0.3, color: WHITE }),
];
/** A Soviet funnel: a big boxy uptake, louvred, black-topped. */
const sovFunnel = (c, x, y, z, w, d, h) => [
  loft([[x, y, z, w / 2, d / 2, 5], [x, y + h, z - d * 0.1, w / 2 * 0.85, d / 2 * 0.85, 5]], { color: c.upper, surf: 'plate' }, 12),
  P.box(w * 0.86, 0.8, d * 0.86, { x, y: y + h - 0.2, z: z - d * 0.1, color: BLACK }),
  ...[-1, 1].flatMap((s) => every(0, 3, 1).map((i) => P.box(0.1, 0.25, d * 0.6, { x: x + s * w / 2 * 0.98, y: y + h * 0.3 + i * 0.6, z, color: DARK }))),
];
/** A pennant number on the bows (Soviet ships: big, a bit further aft than the US ones). */
const pennant = (H, text, h = 2.4) => bowNumber(H, text, h);

// ---------------------------------------------------------------- frigates

export const buildPerry = ship(() => {
  const c = USN, fb = 6;
  const H = hull(136, 14, fb, 5, c, 1.2);
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '7', 2.6),
    ...house(c, 0, fb, -6, 11.5, 5, 66),                                    // the long superstructure
    ...house(c, 0, fb + 5, 22, 10, 3, 10, 2),                               // the bridge
    ...house(c, 0, fb, -45, 13, 6, 18),                                     // the twin hangars
    P.box(0.3, 4.2, 18, { y: fb + 3, z: -45, color: DARK }),                // (their doors' seam)
    ...helideck(0, H.top(-60), -60, 13, 14),
    ...lattice(c, 0, fb + 5, 12, 14, 4, [dish(6, 2.4)]),                     // the SPS-49
    radome(1.5)(0, fb + 8, 21),                                              // the STIR fire-control radome
    box(3.2, 4, 5, { y: fb + 7, z: -16, color: c.upper }),                  // the little stack
    P.box(2.6, 0.5, 4.2, { y: fb + 9.2, z: -16, color: BLACK }),
    armLauncher(c, 0, H.top(44), 44, { arms: 1 }),                           // the Mk 13
    ...[-1, 1].map((s) => boat(c, s * 6.2, fb + 2.4, 0, 7, s)),
    ...[-1, 1].flatMap((s) => [raft(s * 5.4, fb + 5.6, -24), ...vent(c, s * 3, fb + 5, 5)]),
  ]);
  return { fixed, mounts: [{ geo: gun76(c), at: [0, fb + 5, -4], arc: 5 }, { geo: phalanx(c), at: [0, fb + 6, -40], aft: true, arc: 5 }] };
});

export const buildKrivak = ship(() => {
  const c = VMF, fb = 6.5;
  const H = hull(123, 14, fb, 4.6, c, 2);
  const fixed = merge([
    ...H.parts,
    ...pennant(H, '702'),
    boxLauncher(c, 0, H.top(44), 44, 0, { w: 4.2, h: 2.4, d: 7, up: 0.08, cells: 4 }), // the SS-N-14 quad
    ...lids(0, H.top(36), 36, 1, 1, { round: true, size: 4 }),              // the SA-N-4 bin, forward
    rbu(c, -2.8, H.top(32), 32), rbu(c, 2.8, H.top(32), 32),
    ...house(c, 0, fb, 14, 10, 4, 22),
    ...house(c, 0, fb + 4, 20, 7.5, 3, 7, 1.8),
    ...lattice(c, 0, fb + 4, 12, 12, 3.6, [headNet]),
    ...sovFunnel(c, 0, fb, -3, 5.5, 8, 9),
    ...house(c, 0, fb, -20, 9, 3.2, 16),
    ...lids(0, fb + 3.2, -24, 1, 1, { round: true, size: 4 }),              // the SA-N-4 bin, aft
    ...[-1, 1].map((s) => boat(c, s * 6.5, fb + 0.3, 2, 7, s)),
  ]);
  const twin = gun76(c, true);
  return { fixed, mounts: [{ geo: twin, at: [0, fb + 0.1, -38], aft: true, arc: 5 }, { geo: twin, at: [0, fb + 0.1, -47], aft: true, arc: 5 }] };
});

// ---------------------------------------------------------------- destroyers

/** Spruance and Ticonderoga share the hull and the two macks; `aegis` the cruiser's big deckhouse. */
function spruanceHull(c, number, aegis) {
  const fb = 6.5;
  const H = hull(172, 17, fb, 6, c, 1.4);
  const parts = [
    ...H.parts,
    ...bowNumber(H, number, 3),
    ...house(c, 0, fb, 20, 15, aegis ? 9 : 7, 40),                          // the forward block
    ...house(c, 0, fb + (aegis ? 9 : 7), 30, 12, 3, 9, 1.6),               // the bridge
    ...house(c, 0, fb, -28, 13, aegis ? 8 : 6.5, 32),                        // the after block (the hangar in it)
    P.box(0.3, 4.5, 8, { x: 6.55, y: fb + 2.8, z: -38, color: DARK }),
    ...mack(c, 2, fb + (aegis ? 9 : 7), 10, 6, 8, 7, [aegis ? slab(5, 3) : dish(5.5, 2.2)]),
    ...mack(c, -2, fb + (aegis ? 8 : 6.5), -22, 6, 8, 6, [dish(5, 2)]),
    ...helideck(0, fb, -52, 15, 14),
    ...[-1, 1].map((s) => canisters(c, s * 3.6, fb, -2, s * 0.25)),        // Harpoon quads amidships
    ...[-1, 1].map((s) => boat(c, s * 8, fb + 1, -10, 7.5, s)),
    ...[-1, 1].flatMap((s) => [raft(s * 7, fb + 7.4, 6), ...vent(c, s * 4, fb + 6.5, -30)]),
  ];
  if (aegis) {
    parts.push(...[-1, 1].map((s) => spy1(s * 5.2, fb + 5.5, 39.6, s * 0.78)), ...[-1, 1].map((s) => spy1(s * 4.6, fb + 5, -44, Math.PI - s * 0.78)));
    parts.push(armLauncher(c, 0, H.top(58), 58), armLauncher(c, 0, fb, -64, { ry: Math.PI }));   // the Mk 26s
    parts.push(...[-1, 1].map((s) => P.box(4, 0.15, 5, { x: s * 0.1, y: H.top(58) + 0.01, z: 58, color: DARK })));
  } else {
    parts.push(boxLauncher(c, 0, H.top(52), 52, 0), boxLauncher(c, 0, fb + 6.5, -40, Math.PI, { w: 2.2, h: 1.6, d: 4 }));   // ASROC, Sea Sparrow
  }
  return { H, fb, parts };
}

export const buildSpruance = ship(() => {
  const c = USN;
  const { H, fb, parts } = spruanceHull(c, '963', false);
  const g = mk45(c);
  return {
    fixed: merge(parts),
    mounts: [{ geo: g, at: [0, H.top(64), 64], arc: 5 }, { geo: g, at: [0, fb, -66], aft: true, arc: 5 },
      { geo: phalanx(c), at: [4, fb + 7, 36], arc: 4 }, { geo: phalanx(c), at: [-4, fb + 6.5, -42], aft: true, arc: 4 }],
  };
});

export const buildSovremenny = ship(() => {
  const c = VMF, fb = 7;
  const H = hull(156, 17, fb, 5.6, c, 2.4);
  const fixed = merge([
    ...H.parts,
    ...pennant(H, '620'),
    armLauncher(c, 0, H.top(48), 48, { arms: 1, missile: 0xc8ccc4 }),        // the Shtil (SA-N-7), forward
    ...house(c, 0, fb, 18, 10, 6, 34),
    ...house(c, 0, fb + 6, 28, 9, 3, 9, 1.6),
    ...[-1, 1].map((s) => canisters(c, s * 6.6, fb, 31, 0, { n: 4, r: 0.65, len: 9.5, up: 0.16 })),   // the Moskit tubes beside the bridge
    ...lattice(c, 0, fb + 6, 18, 12, 4.4, [slab(6, 3.4)]),                   // Top Steer
    ...bigDome(c, 0, fb + 6, 6, 1.8),
    ...sovFunnel(c, 0, fb, -6, 7, 10, 11),
    ...house(c, 0, fb, -22, 11, 4.5, 16),                                    // the telescopic hangar
    ...helideck(0, fb, -38, 15, 14),
    armLauncher(c, 0, fb + 4.5, -28, { arms: 1, ry: Math.PI, missile: 0xc8ccc4 }),
    ...[-1, 1].flatMap((s) => [ak630(c).translate(s * 3.8, fb + 6, 10), ak630(c).translate(s * 4.4, fb + 4.5, -16)]),
    ...[-1, 1].map((s) => boat(c, s * 7.8, fb + 1, -6, 7, s)),
  ]);
  const g = ak130(c);
  return { fixed, mounts: [{ geo: g, at: [0, H.top(58), 58], arc: 5 }, { geo: g, at: [0, fb + 0.1, -52], aft: true, arc: 5 }] };
});

// ---------------------------------------------------------------- cruisers

export const buildVirginia = ship(() => {
  const c = USN, fb = 6.5;
  const H = hull(178, 19, fb, 6.4, c, 1.4);
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '38', 3),
    armLauncher(c, 0, H.top(58), 58), armLauncher(c, 0, fb, -62, { ry: Math.PI }),   // the Mk 26s
    ...house(c, 0, fb, 20, 15, 8, 30),
    ...house(c, 0, fb + 8, 30, 12, 3, 8, 1.6),
    ...lattice(c, 0, fb + 8, 16, 14, 5, [slab(5, 3)]),                       // SPS-48
    ...house(c, 0, fb, -20, 13, 7, 24),
    ...lattice(c, 0, fb + 7, -22, 11, 4.4, [dish(5.5, 2.2)]),                // SPS-40
    ...[-1, 1].map((s) => canisters(c, s * 4, fb, -38, s * 0.3)),
    ...[-1, 1].flatMap((s) => radome(1.3)(s * 5, fb + 8, 8)),
    ...[-1, 1].map((s) => boat(c, s * 8.6, fb + 1, -2, 7.5, s)),
  ]);
  const g = mk45(c);
  return { fixed, mounts: [{ geo: g, at: [0, H.top(72), 72], arc: 5 }, { geo: g, at: [0, fb, -74], aft: true, arc: 5 }, { geo: phalanx(c), at: [5, fb + 8, 24], arc: 4 }, { geo: phalanx(c), at: [-5, fb + 7, -30], aft: true, arc: 4 }] };
});

export const buildKara = ship(() => {
  const c = VMF, fb = 7;
  const H = hull(173, 18.6, fb, 6, c, 2.4);
  const fixed = merge([
    ...H.parts,
    ...pennant(H, '527'),
    armLauncher(c, 0, H.top(56), 56, { missile: 0xc8ccc4 }),                // SA-N-3 forward
    ...[-1, 1].map((s) => boxLauncher(c, s * 6.4, fb, 40, s * 0.12, { w: 2.6, h: 2.6, d: 7, up: 0.1, cells: 4 })),   // SS-N-14 quads
    ...house(c, 0, fb, 16, 12, 6.5, 40),
    ...house(c, 0, fb + 6.5, 30, 10, 3, 8, 1.6),
    ...lattice(c, 0, fb + 6.5, 22, 13, 5, [topSail]),
    ...sovFunnel(c, 0, fb + 6.5, 4, 8, 11, 8),
    ...bigDome(c, 0, fb + 6.5, 14, 1.6),
    ...house(c, 0, fb, -36, 11, 5, 26),
    armLauncher(c, 0, fb + 5, -44, { ry: Math.PI, missile: 0xc8ccc4 }),
    ...house(c, 0, fb, -60, 10, 4, 10),                                      // the hangar
    ...helideck(0, fb, -74, 14, 12),
    ...[-1, 1].flatMap((s) => [ak630(c).translate(s * 4.8, fb + 6.5, 28), rbu(c, s * 3, H.top(48), 48)]),
    ...[-1, 1].map((s) => boat(c, s * 8.6, fb + 1, -14, 7.5, s)),
  ]);
  const twin = gun76(c, true);
  return { fixed, mounts: [{ geo: twin, at: [7, fb + 0.1, 2], arc: 4 }, { geo: twin, at: [-7, fb + 0.1, 2], arc: 4 }] };
});

export const buildTiconderoga = ship(() => {
  const c = USN;
  const { H, fb, parts } = spruanceHull(c, '47', true);
  const g = mk45(c);
  return {
    fixed: merge(parts),
    mounts: [{ geo: g, at: [0, H.top(70), 70], arc: 5 }, { geo: g, at: [0, fb, -75], aft: true, arc: 5 },
      { geo: phalanx(c), at: [5, fb + 9, 30], arc: 4 }, { geo: phalanx(c), at: [-5, fb + 8, -36], aft: true, arc: 4 }],
  };
});

export const buildSlava = ship(() => {
  const c = VMF, fb = 7.5;
  const H = hull(186, 21, fb, 7.6, c, 2.6);
  const fixed = merge([
    ...H.parts,
    ...pennant(H, '121'),
    ...[-1, 1].flatMap((s) => sideTubes(c, s * 7.6, fb, 22, 48, 4)),       // the Bazalt tubes, four pairs a side
    ...house(c, 0, fb, 30, 9, 8, 36),
    ...house(c, 0, fb + 8, 44, 9, 3, 8, 1.6),
    ...lattice(c, 0, fb + 8, 32, 15, 5.4, [topPair]),
    ...[-1, 1].flatMap((s) => sovFunnel(c, s * 3, fb, 2, 5, 10, 11)),       // the twin uptakes
    ...house(c, 0, fb, -22, 12, 6, 26),
    ...bigDome(c, 0, fb + 6, -24, 2.4),                                      // Top Dome
    ...lids(0, fb, -48, 2, 4, { round: true, size: 2.4, pitch: 3.2 }),       // the S-300F revolvers
    ...house(c, 0, fb, -66, 11, 4.2, 10),
    ...helideck(0, fb, -80, 15, 12),
    ...[-1, 1].flatMap((s) => [ak630(c).translate(s * 3.4, fb + 8, 16), ak630(c).translate(s * 5.2, fb + 6, -12)]),
    ...[-1, 1].map((s) => boat(c, s * 9.6, fb + 1, -4, 8, s)),
  ]);
  return { fixed, mounts: [{ geo: ak130(c), at: [0, H.top(70), 70], arc: 5 }] };
});

// ---------------------------------------------------------------- capital ships

export const buildIowa85 = buildIowa; // ponytail: the 1945 Iowa stands in — add her Tomahawk boxes, Harpoon quads and Phalanxes when the battleships get a pass

export const buildKirov = ship(() => {
  const c = VMF, fb = 9;
  const H = hull(252, 28.5, fb, 9, c, 3);
  const fixed = merge([
    ...H.parts,
    ...lids(0, H.top(104), 104, 2, 1, { round: true, size: 3.4, pitch: 5 }),         // the SA-N-4 bins
    ...lids(0, H.top(90), 90, 3, 4, { round: true, size: 2.2, pitch: 3 }),            // the S-300F revolvers (12)
    ...lids(0, H.top(66) + 0.8, 66, 4, 5, { size: 2.6, pitch: 3.2 }),                 // the 20 Granit lids
    box(14, 0.8, 18, { y: H.top(66) + 0.4, z: 66, color: c.upper }),
    ...house(c, 0, fb, 22, 20, 9, 52),
    ...house(c, 0, fb + 9, 32, 15, 7, 26),
    ...house(c, 0, fb + 16, 40, 12, 3, 9, 1.6),
    ...lattice(c, 0, fb + 16, 26, 14, 7, [topPair]),
    ...bigDome(c, 0, fb + 9, 14, 2.6),
    ...sovFunnel(c, 0, fb + 9, 4, 10, 13, 8),
    ...house(c, 0, fb, -38, 17, 8, 40),
    ...lattice(c, 0, fb + 8, -36, 11, 5, [topSail]),
    ...bigDome(c, 0, fb + 8, -52, 2.8),
    ...[-1, 1].flatMap((s) => [ak630(c).translate(s * 8, fb + 9, 42), ak630(c).translate(s * 8, fb + 9, 6), ak630(c).translate(s * 7.5, fb + 8, -54)]),
    ...[-1, 1].map((s) => rbu(c, s * 3, H.top(112), 112)),
    ...helideck(0, fb, -96, 20, 18),
    ...[-1, 1].map((s) => boat(c, s * 12.8, fb + 1, -20, 9, s)),
  ]);
  return { fixed, mounts: [{ geo: ak130(c), at: [0, fb + 0.1, -78], aft: true, arc: 5 }] };
});

// ---------------------------------------------------------------- carriers

/**
 * A modern carrier: the flight deck over the hangar, overhanging both sides, an angled landing deck
 * to port (`angle` rad), the island to starboard, deck-edge elevators, catapult tracks and markings.
 */
function supercarrier(c, H, { len, beam, fb, deckW, angle, angleLen, islandZ, islandX, number, elevators, cats = [] }) {
  const dy = fb + 9;
  const deckC = 0x45494c;
  const parts = [
    ...H.parts,
    box(beam * 0.94, 9, len * 0.8, { y: fb + 4.5, z: 0, color: c.upper }),
    box(deckW * 0.62, 0.8, len * 0.97, { x: deckW * 0.12, y: dy, z: 0, color: deckC, surf: 'flight' }),                     // the axial deck
    box(deckW * 0.5, 0.8, angleLen, { x: -deckW * 0.18, y: dy - 0.01, z: -len * 0.12, ry: angle, color: deckC, surf: 'flight' }), // the angled deck
    ...[-1, 1].map((s) => box(4, 6, len * 0.6, { x: s * (beam * 0.47 + 2), y: dy - 3.4, z: -len * 0.05, color: c.upper })),         // the sponsons under it
    P.box(0.5, 0.06, angleLen * 0.95, { x: -deckW * 0.18, y: dy + 0.42, z: -len * 0.12, ry: angle, color: WHITE }),         // the landing area's centre line
    ...[-1, 1].map((s) => P.box(0.3, 0.06, angleLen * 0.9, { x: -deckW * 0.18 + s * deckW * 0.2 * Math.cos(angle), y: dy + 0.42, z: -len * 0.12 - s * deckW * 0.2 * Math.sin(angle), ry: angle, color: 0xd8c040 })),
    ...cats.map(([x, z, l]) => P.box(0.5, 0.06, l, { x, y: dy + 0.42, z, color: 0x2a2c2e })),
    ...elevators.map(([x, z]) => P.box(15, 0.06, 18, { x, y: dy + 0.41, z, color: 0x3a3e42 })),
    ...every(-len * 0.42, -len * 0.34, 4).map((z) => P.box(deckW * 0.3, 0.06, 0.15, { x: -deckW * 0.18, y: dy + 0.43, z, ry: angle, color: BLACK })),   // the arresting wires
  ];
  // the island: decks stacked, the bridge windows, two lattice masts with the radars
  parts.push(...house(c, islandX, dy, islandZ, 9, 16, 34), ...house(c, islandX, dy + 16, islandZ + 4, 9, 4, 18, 2));
  parts.push(...lattice(c, islandX, dy + 20, islandZ + 2, 10, 4.4, [slab(5, 3)]), ...lattice(c, islandX, dy + 16, islandZ - 12, 8, 4, [dish(6.5, 2.4)]));
  if (number) {
    const h = 14, w = number.length * h * 0.55 + (number.length - 1) * h * 0.28;
    parts.push(...numerals(number, h, (u, v, du, dv) => P.box(du, 0.06, dv, { x: deckW * 0.12 + w / 2 - u, y: dy + 0.44, z: len * 0.38 + v, color: WHITE })));
  }
  return { parts, dy };
}

export const buildNimitz = ship(() => {
  const c = USN;
  const len = 330, beam = 40, fb = 10;
  const H = hull(len, beam, fb, 11, c, 1.6, { rails: false });
  const { parts, dy } = supercarrier(c, H, { len, beam, fb, deckW: 76, angle: 0.16, angleLen: 220, islandZ: -20, islandX: 27, number: '68',
    elevators: [[26, 60], [26, 30], [26, -100], [-8, -130]], cats: [[4, 120, 90], [16, 120, 90], [-14, -10, 90], [-24, -5, 90]] });
  parts.push(...[[30, 140], [-12, 140], [30, -150]].map(([x, z]) => boxLauncher(c, x, dy + 0.4, z, x > 0 ? 0.6 : -0.6, { w: 2.2, h: 1.6, d: 4 })));
  return { fixed: merge(parts), mounts: [{ geo: phalanx(c), at: [31, dy + 0.4, 110], arc: 4 }, { geo: phalanx(c), at: [-13, dy + 0.4, 100], arc: 4 }, { geo: phalanx(c), at: [31, dy + 0.4, -155], aft: true, arc: 4 }] };
});

export const buildKiev = ship(() => {
  const c = VMF, fb = 9;
  const len = 273, beam = 31;
  const H = hull(len, beam, fb, 9, c, 2.6, { rails: false });
  const dy = fb + 7;
  const fixed = merge([
    ...H.parts,
    ...[-1, 1].flatMap((s) => sideTubes(c, s * 5.5, H.top(80), 70, 90, 2, 1)),     // the Bazalts on the foredeck
    armLauncher(c, 0, H.top(84), 84, { missile: 0xc8ccc4 }),
    box(beam * 0.9, 7, len * 0.62, { y: fb + 3.5, z: -len * 0.12, color: c.upper }),
    box(36, 0.7, 190, { x: -4, y: dy, z: -50, ry: 0.07, color: 0x4a4e50, surf: 'flight' }),                 // the angled flight deck
    ...[-1, 1].map((s) => P.box(0.4, 0.06, 180, { x: -4 + s * 0.1, y: dy + 0.38, z: -50, ry: 0.07, color: WHITE })),
    ...helideck(-6, dy + 0.35, -110, 20, 18),
    ...house(c, 8, dy, 20, 12, 12, 70),                                                 // the great island
    ...house(c, 8, dy + 12, 40, 10, 3, 14, 1.6),
    ...lattice(c, 8, dy + 12, 22, 12, 5.6, [topSail]),
    ...sovFunnel(c, 8, dy + 12, 0, 9, 14, 6),
    armLauncher(c, 8, dy + 12, 51, { missile: 0xc8ccc4 }),
    ...bigDome(c, 8, dy + 15, 36, 2),
    ...[-1, 1].map((s) => ak630(c).translate(s * 9, H.top(64), 64)),
  ]);
  return { fixed, mounts: [{ geo: gun76(c, true), at: [0, H.top(112), 112], arc: 5 }, { geo: gun76(c, true), at: [8, dy + 12, -10], aft: true, arc: 4 }] };
});

export const buildTarawa = ship(() => {
  const c = USN;
  const len = 250, beam = 32, fb = 14;
  const H = hull(len, beam, fb, 8, c, 0.8, { rails: false });
  const dy = fb + 6;
  const fixed = merge([
    ...H.parts,
    box(beam * 0.94, 6, len * 0.7, { y: fb + 3, z: -10, color: c.upper }),
    box(beam * 1.02, 0.7, len * 0.96, { y: dy, z: -2, color: 0x45494c, surf: 'flight' }),
    P.box(0.5, 0.06, len * 0.9, { x: -4, y: dy + 0.38, color: WHITE }),
    ...every(-90, 90, 30).flatMap((z) => helideck(-4, dy + 0.3, z, 14, 14)),
    ...house(c, 12, dy, 10, 9, 14, 52),
    ...house(c, 12, dy + 14, 22, 9, 3.4, 14, 1.8),
    ...lattice(c, 12, dy + 14, 6, 10, 4.4, [dish(6, 2.4)]), ...lattice(c, 12, dy + 14, -10, 8, 4, [slab(4.5, 2.6)]),
    ...[-1, 1].map((s) => P.box(0.3, 7, 22, { x: s * 0.5, y: fb - 2, z: -len / 2 + 0.5, color: DARK })),   // the well-deck gate in her stern
  ]);
  const numbers = numerals('1', 12, (u, v, du, dv) => P.box(du, 0.06, dv, { x: 2 - u, y: dy + 0.4, z: 100 + v, color: WHITE }));
  return { fixed: merge([fixed, ...numbers]), mounts: [{ geo: mk45(c), at: [-5, H.top(96) + 0.1, 96], arc: 4 }, { geo: phalanx(c), at: [12, dy + 14, 34], arc: 4 }, { geo: phalanx(c), at: [-13, dy, -112], aft: true, arc: 4 }] };
});

export const buildMoskva = ship(() => {
  const c = VMF, fb = 8;
  const len = 189, beam = 26;
  const H = hull(len, beam, fb, 7.5, c, 2.2, { rails: false });
  const fixed = merge([
    ...H.parts,
    armLauncher(c, 0, H.top(76), 76, { missile: 0xc8ccc4 }), armLauncher(c, 0, H.top(62) + 3, 62, { missile: 0xc8ccc4 }),
    box(8, 3, 8, { y: H.top(62) + 1.5, z: 62, color: c.upper }),
    rbu(c, -3, H.top(70), 70), rbu(c, 3, H.top(70), 70),
    ...house(c, 0, fb, 26, 18, 12, 34),
    ...house(c, 0, fb + 12, 34, 12, 3, 10, 1.6),
    ...lattice(c, 0, fb + 12, 22, 12, 5, [topSail]),
    ...sovFunnel(c, 0, fb + 12, 14, 9, 9, 6),
    box(beam * 1.25, 0.7, 90, { y: fb + 4, z: -46, color: 0x4a4e50, surf: 'flight' }),           // the wide helicopter deck aft
    box(beam * 0.9, 4, 82, { y: fb + 2, z: -46, color: c.upper }),
    ...every(-80, -20, 30).flatMap((z) => helideck(0, fb + 4.3, z, 16, 16)),
    ...[-1, 1].map((s) => ak630(c).translate(s * 7, fb + 12, 40)),
  ]);
  return { fixed, mounts: [{ geo: gun76(c, true), at: [9.5, fb + 0.1, 6], arc: 4 }, { geo: gun76(c, true), at: [-9.5, fb + 0.1, 6], arc: 4 }] };
});

// ---------------------------------------------------------------- missile boats

export const buildPegasus = ship(() => {
  const c = USN;
  const H = hull(40, 8.6, 2.6, 1.2, c, 0.6, { rails: false, fittings: false });
  const lift = 2.2; // foil-borne: the hull up out of the water on its foils
  const fixed = merge([
    merge(H.parts).translate(0, lift, 0),
    ...bowNumber(H, '1', 0.9).map((g) => g.translate(0, lift, 0)),
    ...house(c, 0, 2.6 + lift, 2, 5.2, 2.6, 12, 1.4),
    P.cyl(0.08, 0.1, 4, { y: 2.6 + lift + 4.6, z: 0, color: BLACK }, 5),
    radome(0.9)(0, 2.6 + lift + 2.6, 4),
    ...[-1, 1].map((s) => canisters(c, s * 2.4, 2.6 + lift, -12, 0, { n: 4, r: 0.28, len: 4.4, up: 0.3 })),
    strut([0, lift, 15], [0, -1.6, 15], 0.35, c.upper), P.box(5, 0.25, 1.4, { y: -1.6, z: 15, color: c.upper }),       // the bow foil
    ...[-1, 1].flatMap((s) => [strut([s * 3.4, lift, -12], [s * 3.4, -1.6, -12], 0.35, c.upper)]), P.box(9, 0.25, 1.6, { y: -1.6, z: -12, color: c.upper }),
  ]);
  return { fixed, mounts: [{ geo: gun76(c), at: [0, 2.7 + lift, 12], arc: 5 }] };
});

export const buildTarantul = ship(() => {
  const c = VMF, fb = 3.4;
  const H = hull(56, 10.2, fb, 2.6, c, 1.2, { fittings: false });
  const fixed = merge([
    ...H.parts,
    ...pennant(H, '952', 1.6),
    ...house(c, 0, fb, 3, 7, 3.6, 18),
    ...house(c, 0, fb + 3.6, 7, 6, 2.4, 6, 1.2),
    radome(1.8)(0, fb + 6, 6),                                                 // Band Stand
    ...[-1, 1].map((s) => canisters(c, s * 3.9, fb, -9, 0, { n: 2, r: 0.62, len: 9, up: 0.14 })),   // the Moskit tubes
  ]);
  return { fixed, mounts: [{ geo: gun76(c), at: [0, H.top(18) + 0.1, 18], arc: 5 }, { geo: ak630(c), at: [2, fb, -20], aft: true, arc: 4 }, { geo: ak630(c), at: [-2, fb, -20], aft: true, arc: 4 }] };
});

// ---------------------------------------------------------------- landing ships

export const buildNewport = ship(() => {
  const c = USN, fb = 7;
  const H = hull(160, 21, fb, 5, c, 1);
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '1179', 2.4),
    ...[-1, 1].flatMap((s) => [strut([s * 3.5, fb + 6, 62], [s * 3, fb + 3, 92], 0.6, c.upper), strut([s * 3.5, fb, 74], [s * 3, fb + 3, 92], 0.4, c.upper)]),   // the derrick horns
    P.box(3, 1, 26, { y: fb + 3.5, z: 88, color: c.gun }),                    // the ramp, run out over them
    ...house(c, 0, fb, 20, 16, 9, 32),
    ...house(c, 0, fb + 9, 28, 13, 3, 10, 1.6),
    ...lattice(c, 0, fb + 9, 16, 12, 4, [dish(4, 1.8)]),
    ...[-1, 1].flatMap((s) => [box(3, 7, 5, { x: s * 4.5, y: fb + 12.5, z: 6, color: c.upper }), P.box(2.6, 0.5, 4.2, { x: s * 4.5, y: fb + 16, z: 6, color: BLACK })]),
    box(19, 0.4, 40, { y: fb, z: -44, color: c.deck }),
    ...helideck(0, fb, -56, 16, 16),
    ...[-1, 1].map((s) => boat(c, s * 9.6, fb + 1, 0, 8, s)),
  ]);
  return { fixed, mounts: [{ geo: phalanx(c), at: [0, fb + 12, 30], arc: 5 }] };
});

export const buildRopucha = ship(() => {
  const c = VMF, fb = 6;
  const H = hull(113, 15, fb, 4, c, 1.6);
  const fixed = merge([
    ...H.parts,
    ...pennant(H, '012', 2),
    ...house(c, 0, fb, -10, 13, 8, 30),
    ...house(c, 0, fb + 8, -2, 10, 3, 8, 1.6),
    ...lattice(c, 0, fb + 8, -10, 10, 3.4, [headNet]),
    ...sovFunnel(c, 0, fb + 8, -18, 6, 8, 4),
    box(13, 0.4, 36, { y: fb, z: 26, color: c.deck }),
    ...[-1, 1].map((s) => boat(c, s * 7, fb + 1, -24, 6.5, s)),
  ]);
  const twin57 = gun76(c, true);
  return { fixed, mounts: [{ geo: twin57, at: [0, fb + 0.1, 36], arc: 5 }, { geo: twin57, at: [0, fb + 8, -21], aft: true, arc: 5 }] };
});

// ---------------------------------------------------------------- submarines

/**
 * A modern submarine: a teardrop pressure hull (mostly under water: a hump of it awash), the sail with
 * its masts, planes on the sail (`sailPlanes`) or at the bow, the cruciform tail and its propeller;
 * `pod` the towed-array pod on the upper fin (Victor), `lids` missile hatches either side (Oscar).
 */
function modernSub(c, { len, beam, sail: [sl, sh, sz], sailPlanes = true, pod = false, lids: nLids = 0, wide = 1 }) {
  const parts = [];
  const cy = -beam * 0.3;
  const secs = [];
  for (let k = 0; k <= 28; k++) {
    const t = k / 28; // stern … bow
    const r = (beam / 2) * (t > 0.86 ? Math.sqrt(Math.max(0.02, 1 - ((t - 0.86) / 0.14) ** 2)) : t < 0.45 ? Math.max(0.06, (t / 0.45) ** 0.7) : 1);
    secs.push([0, cy, -len / 2 + t * len, r * wide, r, 2]);
  }
  parts.push(loft(secs, { color: c.hull, surf: 'rubber' }, 20));
  const top = cy + beam / 2;
  // the sail: a flat-sided fin, rounded in front
  const sec = [];
  for (let k = 0; k <= 10; k++) {
    const t = k / 10;
    const w = 1.3 * (t > 0.75 ? Math.sqrt(Math.max(0.05, 1 - ((t - 0.75) / 0.25) ** 2)) : 0.6 + 0.4 * (t / 0.75));
    sec.push([0, top + sh / 2 - 0.4, sz - sl / 2 + t * sl, w, sh / 2 + 0.2, 5]);
  }
  parts.push(loft(sec, { color: c.upper, surf: 'rubber' }, 12));
  for (const [dz, h] of [[sl * 0.15, 3.2], [-sl * 0.05, 2.6], [-sl * 0.25, 2.2]]) parts.push(P.cyl(0.2, 0.22, h, { y: top + sh + h / 2 - 0.3, z: sz + dz, color: BLACK, surf: 'metal' }, 6));
  if (sailPlanes) parts.push(P.box(8, 0.3, 2.4, { y: top + sh * 0.55, z: sz + sl * 0.15, color: c.upper }));
  else parts.push(...[-1, 1].map((s) => P.box(3.4, 0.3, 2.4, { x: s * (beam / 2 * wide + 1.4), y: cy + 0.5, z: len * 0.36, color: c.upper })));
  // the tail: four fins, the propeller behind them
  const tz = -len / 2 + 5;
  parts.push(P.box(0.4, 6, 5, { y: cy + 3, z: tz, color: c.upper }), P.box(0.4, 5, 5, { y: cy - 2.5, z: tz, color: c.upper }), P.box(beam * wide + 4, 0.4, 5, { y: cy, z: tz, color: c.upper }));
  parts.push(P.cyl(1.4, 0.6, 1.2, { y: cy, z: -len / 2 + 0.4, rx: Math.PI / 2, color: 0x7a6040, surf: 'metal' }, 7));
  if (pod) parts.push(P.capsule(0.9, 5, { y: cy + 6.4, z: tz - 1, rx: Math.PI / 2, color: c.upper }));
  for (let i = 0; i < nLids; i++) for (const s of [-1, 1]) {
    const z = sz + sl / 2 + 4 + i * 3.6;
    parts.push(P.box(2.4, 0.15, 2.8, { x: s * beam * wide * 0.32, y: top - 0.5, z, rz: s * -0.35, color: 0x2c2e30 }));
  }
  return merge(parts);
}

export const buildLosAngeles = sub(() => modernSub(SUB, { len: 110, beam: 10, sail: [12, 6, 26] }));
export const buildVictor = sub(() => modernSub(SUB, { len: 106, beam: 10.6, sail: [14, 4.6, 6], sailPlanes: false, pod: true }));
export const buildOscar = sub(() => modernSub(SUB, { len: 154, beam: 13, sail: [24, 6, 16], sailPlanes: false, lids: 12, wide: 1.3 }));
