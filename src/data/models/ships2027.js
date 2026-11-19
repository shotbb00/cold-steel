// 2027 warships of the Baltic (data/units2027/ships.js), built at their real size, bow toward +z, on the
// 1945 kit (models/ships1945.js: lofted hulls, rails, hull numbers, the ship rig) and the 1985 one
// (models/ships1985.js KIT85: guns, canisters, lids, masts, the modern submarine). What's new: the stealthy
// shapes — superstructures with their walls leaning in (`slope`), enclosed pyramid masts, flat radar faces
// (SPY-6, Poliment, Furke), vertical-launch hatches flush in the deck, faceted gunhouses — and the shore's
// missile trucks (models/modern2027.js launcherTruck).
// Paint: the US Navy haze grey with a dark non-skid deck; the Polish Navy a lighter, cooler grey; the
// Russian Baltic Fleet a blue-grey with dark decks.
import * as THREE from 'three';
import { P, merge, part } from '../units/geometry.js';
import { sideProfile } from './vehicleCommon.js';
import { KIT } from './ships1945.js';
import { KIT85 } from './ships1985.js';
import { launcherTruck, pod } from './modern2027.js';

const { box, strut, bowNumber, boat, windows, ship, sub, BLACK, WHITE } = KIT;
const { hull, put, mk45, gun76, phalanx, ak630, canisters, lids, lattice, dish, radome, house, helideck, modernSub, SUB, DOME, DARK } = KIT85;
const USN = { hull: 0x7d848a, deck: 0x484d52, upper: 0x899096, gun: 0x899096, black: BLACK, boat: 0x899096 };
const PLN = { hull: 0x878e94, deck: 0x50555a, upper: 0x959ba0, gun: 0x8f969b, black: BLACK, boat: 0x9aa0a4 };
const RUS = { hull: 0x627079, deck: 0x46494c, upper: 0x71808a, gun: 0x6c7a84, black: BLACK, boat: 0x9a9e98 };
const FACE = 0x4c545a; // the radar arrays' faces

// ---------------------------------------------------------------- the stealthy kit

/** A faceted block: w × d at its foot (y), h high, its walls leaning in to kx, kz of that at the top — a stealthy superstructure. */
function slope(c, x, y, z, w, h, d, kx = 0.84, kz = 0.92) {
  const g = new THREE.BoxGeometry(w, h, d);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * kx); p.setZ(i, p.getZ(i) * kz); }
  g.computeVertexNormals();
  return part(g, { x, y: y + h / 2, z, color: c.upper, surf: 'plate' });
}
/** An enclosed mast: a tall faceted pyramid (its sensors behind the plating), a pole and a small dome on top. */
const tower = (c, x, y, z, w, h, d, k = 0.36) => [slope(c, x, y, z, w, h, d, k, k), P.cyl(0.15, 0.2, 4, { x, y: y + h + 2, z, color: BLACK, surf: 'metal' }, 6), P.sphere(0.6, { x, y: y + h + 0.4, z, color: DOME, surf: 'paint' }, 10, 6)];
/** A flat radar array on a wall: a w × h face looking out along `ry`, tilted back a little; (x, y, z) its centre. */
const face = (x, y, z, ry, w, h = w, tilt = 0.2) => put([P.box(w, h, 0.3, { rx: -tilt, color: FACE }), P.box(w + 0.3, h + 0.3, 0.15, { z: -0.12, rx: -tilt, color: DARK })], x, y, z, ry);
/** Where a slope's wall is at height `t` (0 foot … 1 top): its half-width there. */
const wallAt = (w, k, t) => (w / 2) * (1 - (1 - k) * t);
/** Vertical-launch cells: a raised deck block with a grid of square hatches on it (cols across, rows along). */
const vls = (x, y, z, cols, rows, pitch = 0.8) => [box(cols * pitch + 0.6, 0.3, rows * pitch + 0.6, { x, y: y + 0.15, z, color: DARK }), ...lids(x, y + 0.3, z, cols, rows, { pitch, size: pitch * 0.8, color: 0x3e4246 })];
/** RAM (Mk 49): the 21-round box on its pedestal, facing `ry`. */
const ram = (c, x, y, z, ry = 0) => put([P.cyl(0.6, 0.8, 1.4, { y: 0.7, color: c.gun }, 10), box(1.6, 1.4, 1.8, { y: 2, color: c.gun }), P.box(1.3, 1.1, 0.1, { y: 2, z: 0.92, color: DARK })], x, y, z, ry);
/** The shield of a CIWS or small gun, faceted: profile [z, y] pairs, `w` wide. */
const facet = (c, pts, w) => sideProfile(pts, w, { color: c.gun, surf: 'plate' }, 0.08);
const barrel = (r, len, y, z0, x = 0, color = c0) => P.cyl(r * 0.8, r, len, { x, y, z: z0 + len / 2, rx: Math.PI / 2, color, surf: 'metal' }, 8);
const c0 = 0x5a6066;

// the guns (mount geometry: base at 0, facing +z)
/** 57 mm Mk 110 / Bofors Mk 3: the low faceted cupola, one long barrel. */
const gun57 = (c) => merge([facet(c, [[-1.5, 0], [1.2, 0], [2, 0.6], [1, 1.5], [-1.5, 1.5]], 2.4), P.cyl(1.2, 1.3, 0.4, { y: -0.15, color: c.upper }, 12), barrel(0.09, 3.6, 0.8, 1.6, 0, c.gun)]);
/** A-190 100 mm: a bigger faceted house, a sloped face. */
const gun100 = (c) => merge([facet(c, [[-2, 0], [1.8, 0], [2.6, 0.9], [1.4, 2.1], [-2, 2.1]], 3), P.cyl(1.5, 1.6, 0.5, { y: -0.2, color: c.upper }, 12), barrel(0.11, 5, 1.1, 2.2, 0, c.gun)]);
/** A-192M 130 mm: the big single house of the Gorshkov. */
const gun130 = (c) => merge([facet(c, [[-2.8, 0], [2.4, 0], [3.4, 1.1], [2, 2.6], [-2.8, 2.6]], 4), P.cyl(2, 2.1, 0.6, { y: -0.25, color: c.upper }, 14), barrel(0.14, 7, 1.3, 3, 0, c.gun)]);
/** 30 mm (Mk 46, AK-306): a small turret, one barrel. */
const gun30 = (c) => merge([facet(c, [[-0.9, 0], [0.8, 0], [1.1, 0.5], [0.6, 1], [-0.9, 1]], 1.4), P.cyl(0.7, 0.8, 0.3, { y: -0.1, color: c.upper }, 10), barrel(0.05, 2.4, 0.55, 0.9, 0, BLACK)]);
/** AK-630M-2 Duet / Palash: one turret, two six-barrel guns. */
const duet = (c) => merge([P.cyl(1, 1.1, 1, { y: 0.5, color: c.gun }, 12), facet(c, [[-1, 0.9], [0.9, 0.9], [1.2, 1.4], [0.6, 2], [-1, 2]], 2.2), ...[-0.5, 0.5].map((x) => barrel(0.1, 2, 1.5, 1, x, BLACK))]);
/** Pantsir-M: the turret with its two 30 mm guns and a missile pack each side. */
const pantsir = (c) => merge([P.cyl(1.3, 1.4, 1, { y: 0.5, color: c.gun }, 12), facet(c, [[-1.3, 1], [1.2, 1], [1.6, 1.6], [0.8, 2.4], [-1.3, 2.4]], 2.2), ...[-0.4, 0.4].map((x) => barrel(0.08, 2.2, 1.7, 1.2, x, BLACK)),
  ...[-1, 1].map((s) => box(0.7, 0.9, 2.6, { x: s * 1.5, y: 1.9, z: 0.2, color: c.upper })), ...[-1, 1].map((s) => P.box(0.6, 0.8, 0.1, { x: s * 1.5, y: 1.9, z: 1.52, color: DARK }))]);
/** Millennium 35 mm: a small faceted turret, one short barrel. */
const millennium = (c) => merge([P.cyl(0.8, 0.9, 0.8, { y: 0.4, color: c.gun }, 10), facet(c, [[-0.9, 0.7], [0.8, 0.7], [1.1, 1.1], [0.5, 1.6], [-0.9, 1.6]], 1.6), barrel(0.07, 2.2, 1.15, 0.9, 0, BLACK)]);

/** Anti-ship missile canisters across the deck (NSM, Uran, RBS15): `n` a side, angled outboard, at (x, y, z). */
const amidships = (c, y, z, n, o = {}) => [-1, 1].map((s) => canisters(c, s * (o.x ?? 2.4), y, z, s * (Math.PI / 2 - 0.35), { n, r: 0.3, len: 4, up: 0.35, ...o }));

// ---------------------------------------------------------------- frigates

export const buildConstellation = ship(() => {
  const c = USN, fb = 7, len = 151, beam = 19.8;
  const H = hull(len, beam, fb, 6, c, 1.3);
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '62', 2.8),
    ...vls(0, H.top(42), 42, 4, 8),                                            // 32 Mk 41 cells
    slope(c, 0, fb, 18, 15, 8, 30),                                           // the forward block, its walls leaning in
    slope(c, 0, fb + 8, 24, 12, 3, 12, 0.9, 0.85), ...windows(0, fb + 9.5, 24, 11.2, 10.4),   // the bridge
    ...tower(c, 0, fb + 8, 12, 7, 14, 8),                                      // the mast
    ...[-1, 1].map((s) => face(s * wallAt(15, 0.84, 0.55), fb + 4.4, 30, s * 0.55, 3.6)),     // SPY-6(V)3: two faces forward
    face(0, fb + 4.8, -53.6, Math.PI, 4),                                      // … and one aft, on the hangar
    slope(c, 0, fb, -6, 12, 6.5, 14), slope(c, 0, fb + 6.5, -6, 5, 4, 7, 0.8, 0.8),           // the uptake, its funnel
    ...amidships(c, fb, -18, 4),                                              // 16 NSM in four quads
    ...amidships(c, fb, -24, 4),
    slope(c, 0, fb, -42, 15, 7, 24),                                          // the hangar
    ram(c, 0, fb + 7, -46),
    ...helideck(0, H.top(-64), -64, 15, 16),
    ...[-1, 1].map((s) => boat(c, s * 7.8, fb + 1, -30, 7, s)),
  ]);
  return { fixed, mounts: [{ geo: gun57(c), at: [0, H.top(58), 58], arc: 5 }] };
});

export const buildMiecznik = ship(() => {
  const c = PLN, fb = 7, len = 138.7, beam = 19.8;
  const H = hull(len, beam, fb, 5.5, c, 1.4);
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '271', 2.6),
    ...vls(0, H.top(42), 42, 3, 4, 1.1),                                       // the CAMM silos
    slope(c, 0, fb, 6, 16, 7.5, 54, 0.88, 0.95),                              // one long superstructure, bow to hangar
    slope(c, 0, fb + 7.5, 24, 13, 3, 12, 0.88, 0.85), ...windows(0, fb + 9, 24, 12, 10.6),   // the bridge
    ...tower(c, 0, fb + 7.5, 12, 7, 12, 8, 0.4),                               // the mast
    box(0.6, 0.6, 0.6, { y: fb + 19.8, z: 12, color: DARK }), P.box(4.6, 1.4, 0.4, { y: fb + 20.7, z: 12, color: FACE }), // NS-200 on its top
    slope(c, 0, fb + 7.5, -8, 5, 4, 6, 0.8, 0.8),                             // the funnel
    ...amidships(c, H.top(36), 35, 4, { x: 3 }),                              // 8 NSM forward of the bridge
    slope(c, 0, fb, -34, 15, 6.5, 20),                                        // the hangar
    millennium(c).translate(0, fb + 6.5, -30),
    ...helideck(0, H.top(-56), -56, 15, 14),
    ...[-1, 1].map((s) => boat(c, s * 8.2, fb + 1, -14, 7, s)),
  ]);
  return { fixed, mounts: [{ geo: gun57(c), at: [0, H.top(54), 54], arc: 5 }] };
});

export const buildSteregushchiy = ship(() => {
  const c = RUS, fb = 5, len = 104.5, beam = 13;
  const H = hull(len, beam, fb, 3.7, c, 1.6);
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '530', 1.8),
    ...vls(0, H.top(29), 29, 3, 4, 0.9),                                       // the Redut cells
    slope(c, 0, fb, 6, 10, 6, 30, 0.82, 0.9),
    slope(c, 0, fb + 6, 14, 8, 2.6, 8, 0.88, 0.8), ...windows(0, fb + 7.3, 14, 7.4, 6.8),
    ...tower(c, 0, fb + 6, 4, 6, 12, 7, 0.34),                                  // the pyramid mast, the Furke on its top
    ...[-1, 1].map((s) => face(s * wallAt(6, 0.34, 0.45), fb + 11.4, 4, s * Math.PI / 2, 1.8, 1.8, 0.4)),
    ...amidships(c, fb, -14, 4, { x: 2 }),                                    // 8 Uran
    slope(c, 0, fb, -27, 11, 5, 14),                                          // the hangar
    ...[-1, 1].map((s) => ak630(c).translate(s * 2.6, fb + 5, -24)),
    ...helideck(0, H.top(-43), -43, 11, 12),
  ]);
  return { fixed, mounts: [{ geo: gun100(c), at: [0, H.top(38), 38], arc: 5 }] };
});

// ---------------------------------------------------------------- destroyers

export const buildBurke3 = ship(() => {
  const c = USN, fb = 7, len = 155, beam = 20;
  const H = hull(len, beam, fb, 6.3, c, 1.6);
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '125', 3),
    ...vls(0, H.top(47), 47, 4, 8),                                            // forward: 32 cells
    slope(c, 0, fb, 22, 17, 10, 30, 0.84, 0.9),                               // the forward block, the SPY-6 on its corners
    slope(c, 0, fb + 10, 28, 13, 3, 10, 0.9, 0.8), ...windows(0, fb + 11.5, 28, 12.4, 8.6),
    ...[-1, 1].map((s) => face(s * wallAt(17, 0.84, 0.6) * 0.92, fb + 6, 34.5, s * 0.78, 4.3)),  // two faces forward
    ...lattice(c, 0, fb + 13, 26, 9, 4, [radome(0.9)]),                         // the mast
    slope(c, 0, fb, 2, 9, 6, 8, 0.8, 0.8), slope(c, 0, fb + 6, 2, 6, 3, 6, 0.85, 0.85),   // the forward stack
    slope(c, 0, fb, -14, 9, 6, 8, 0.8, 0.8), slope(c, 0, fb + 6, -14, 6, 3, 6, 0.85, 0.85), // the after one
    ...amidships(c, fb, -6, 4, { x: 2.8 }),                                   // NSM
    slope(c, 0, fb, -26, 15, 8, 16),                                          // the after block
    ...[-1, 1].map((s) => face(s * wallAt(15, 0.84, 0.5) * 0.92, fb + 4, -32.5, Math.PI - s * 0.78, 3.8)),  // and two aft
    ...vls(0, fb, -42, 8, 8),                                                 // aft: 64 cells
    slope(c, 0, fb, -54, 16, 6, 10),                                           // the hangars
    ...helideck(0, H.top(-68), -68, 16, 14),
    ...[-1, 1].map((s) => boat(c, s * 8, fb + 1, -2, 7, s)),
  ]);
  return { fixed, mounts: [{ geo: mk45(c), at: [0, H.top(62), 62], arc: 5 }, { geo: phalanx(c), at: [0, fb + 6, -54], aft: true, arc: 4 }] };
});

export const buildGorshkov = ship(() => {
  const c = RUS, fb = 6.5, len = 135, beam = 16;
  const H = hull(len, beam, fb, 4.5, c, 1.8);
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '454', 2.2),
    ...lids(0, H.top(43), 43, 4, 8, { pitch: 0.8, size: 0.6, round: true, color: 0x3e4246 }),   // the Redut cells
    ...vls(0, H.top(35), 35, 2, 8, 1),                                         // UKSK: 16 cells for Oniks, Kalibr, Zircon
    slope(c, 0, fb, 8, 13, 7, 36, 0.84, 0.92),
    slope(c, 0, fb + 7, 20, 10, 2.6, 8, 0.88, 0.8), ...windows(0, fb + 8.3, 20, 9.4, 6.8),
    ...tower(c, 0, fb + 7, 10, 7.5, 15, 8, 0.32),                               // the pyramid mast
    ...[0, 1, 2, 3].map((k) => { const ry = k * Math.PI / 2, r = wallAt(7.5, 0.32, 0.4) + 0.2; return face(Math.sin(ry) * r, fb + 13, 10 + Math.cos(ry) * r, ry, 1.8, 1.8, 0.35); }), // Poliment's four faces
    slope(c, 0, fb + 7, -4, 5, 4, 6, 0.8, 0.8),
    slope(c, 0, fb, -24, 12, 6, 16),                                          // the hangar
    ...[-1, 1].map((s) => duet(c).translate(s * 3, fb + 6, -21)),
    ...helideck(0, H.top(-48), -48, 13, 14),
    ...[-1, 1].map((s) => boat(c, s * 6.4, fb + 1, -8, 7, s)),
  ]);
  return { fixed, mounts: [{ geo: gun130(c), at: [0, H.top(53), 53], arc: 5 }] };
});

// ---------------------------------------------------------------- missile boats and corvettes

export const buildOrkan = ship(() => {
  const c = PLN, fb = 3.2, len = 49, beam = 8.65;
  const H = hull(len, beam, fb, 2.1, c, 0.8, { fittings: false });
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '421', 1.2),
    slope(c, 0, fb, 2, 6.4, 3.4, 15, 0.86, 0.9),
    slope(c, 0, fb + 3.4, 5, 5.2, 2, 5, 0.9, 0.8), ...windows(0, fb + 4.4, 5, 4.8, 4.2),
    ...lattice(c, 0, fb + 3.4, -1, 6, 2.6, [radome(1)]),
    ...[-1, 1].map((s) => canisters(c, s * 2, fb, -13, s * 0.4, { n: 4, r: 0.32, len: 4.4, up: 0.2 })),   // RBS15: two quads aft
  ]);
  return { fixed, mounts: [{ geo: gun76(c), at: [0, H.top(14) + 0.1, 14], arc: 5 }, { geo: ak630(c), at: [0, fb, -20], aft: true, arc: 4 }] };
});

export const buildKarakurt = ship(() => {
  const c = RUS, fb = 3.8, len = 67, beam = 11;
  const H = hull(len, beam, fb, 2.8, c, 1.2, { fittings: false });
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '575', 1.4),
    slope(c, 0, fb, 6, 8.6, 4, 20, 0.84, 0.9),
    slope(c, 0, fb + 4, 11, 7, 2.2, 6, 0.88, 0.8), ...windows(0, fb + 5.1, 11, 6.4, 5.2),
    ...tower(c, 0, fb + 4, 3, 5, 9, 6, 0.34),                                   // the mast and its radar faces
    ...[-1, 1].map((s) => face(s * wallAt(5, 0.34, 0.4), fb + 7.6, 3, s * Math.PI / 2, 1.3, 1.3, 0.4)),
    ...vls(0, fb, -10, 2, 4, 1),                                              // UKSK: 8 cells
  ]);
  return { fixed, mounts: [{ geo: gun76(c), at: [0, H.top(24) + 0.1, 24], arc: 5 }, { geo: pantsir(c), at: [0, fb, -23], aft: true, arc: 5 }] };
});

export const buildBuyanM = ship(() => {
  const c = RUS, fb = 3.6, len = 74, beam = 11;
  const H = hull(len, beam, fb, 2.6, c, 1, { fittings: false });
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '562', 1.4),
    slope(c, 0, fb, 6, 9, 4.4, 26, 0.84, 0.9),
    slope(c, 0, fb + 4.4, 13, 7.2, 2.2, 6, 0.88, 0.8), ...windows(0, fb + 5.5, 13, 6.6, 5.2),
    ...tower(c, 0, fb + 4.4, 5, 5, 8, 6, 0.36),
    ...vls(0, fb + 4.4, -2, 2, 4, 1),                                         // the eight Kalibr cells on the after deckhouse
  ]);
  return { fixed, mounts: [{ geo: gun100(c), at: [0, H.top(28) + 0.1, 28], arc: 5 }, { geo: duet(c), at: [0, fb, -24], aft: true, arc: 4 }] };
});

// ---------------------------------------------------------------- submarines

export const buildVirginia = sub(() => modernSub(SUB, { len: 140, beam: 10.4, sail: [11, 6, 34], sailPlanes: false, vls: 12 }));
export const buildKilo = sub(() => modernSub(SUB, { len: 74, beam: 9.9, sail: [14, 4.2, 8], sailPlanes: false }));

// ---------------------------------------------------------------- the amphibious ships

export const buildSanAntonio = ship(() => {
  const c = USN, fb = 10, len = 208.5, beam = 31.9;
  const H = hull(len, beam, fb, 7, c, 1);
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '17', 3),
    slope(c, 0, fb, 40, 28, 11, 76, 0.88, 0.94),                              // the slab-sided block
    slope(c, 0, fb + 11, 62, 20, 4, 14, 0.9, 0.8), ...windows(0, fb + 13, 62, 18.4, 11.4),
    ...tower(c, 0, fb + 11, 52, 9, 22, 9, 0.42),                                // the enclosed masts (AEM/S)
    ...tower(c, 0, fb + 6, -14, 9, 20, 9, 0.42),
    slope(c, 0, fb, -14, 24, 6, 28, 0.9, 0.9),                                // the hangar
    box(29, 0.6, 66, { y: fb + 0.3, z: -66, color: 0x45494c, surf: 'flight' }), // the flight deck
    ...helideck(0, fb + 0.6, -60, 18, 18), ...helideck(0, fb + 0.6, -86, 18, 16),
    ram(c, 8, fb + 11, 72), ram(c, -8, fb + 6, -2, Math.PI),
    ...[-1, 1].map((s) => P.box(0.3, 7, 24, { x: s * 0.5, y: fb - 3, z: -len / 2 + 0.4, color: DARK })),   // the well-deck gate
  ]);
  return { fixed, mounts: [{ geo: gun30(c), at: [0, fb + 11, 72], arc: 5 }, { geo: gun30(c), at: [10, fb + 6, -20], aft: true, arc: 4 }] };
});

export const buildIvanGren = ship(() => {
  const c = RUS, fb = 6, len = 135, beam = 16.5;
  const H = hull(len, beam, fb, 3.6, c, 1.4);
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '135', 2.2),
    box(13, 0.4, 44, { y: H.top(30), z: 30, color: c.deck }),                 // the vehicle deck's hatch
    strut([0, fb, 12], [0, fb + 10, 30], 0.35, c.upper),                      // the crane's jib
    slope(c, 0, fb, -18, 14, 9, 36, 0.86, 0.92),
    slope(c, 0, fb + 9, -10, 11, 3, 8, 0.9, 0.8), ...windows(0, fb + 10.5, -10, 10.2, 6.4),
    ...tower(c, 0, fb + 9, -22, 5, 10, 6, 0.36),
    ...helideck(0, H.top(-52), -52, 14, 14),
    ...[-1, 1].map((s) => boat(c, s * 7.6, fb + 1, -26, 7, s)),
  ]);
  return { fixed, mounts: [{ geo: duet(c), at: [0, fb + 9, -3], arc: 5 }] };
});

export const buildAmerica = ship(() => {
  const c = USN, len = 257, beam = 32, fb = 14;
  const H = hull(len, beam, fb, 8, c, 0.8, { rails: false });
  const dy = fb + 5.5;
  const fixed = merge([
    ...H.parts,
    box(beam * 0.94, 5.5, len * 0.74, { y: fb + 2.75, z: -8, color: c.upper }),
    box(beam * 1.3, 0.7, len * 0.97, { y: dy, z: -2, color: 0x45494c, surf: 'flight' }),
    P.box(0.5, 0.06, len * 0.9, { x: -4, y: dy + 0.38, color: WHITE }),
    ...[-90, -60, -30, 0, 30, 60, 90].flatMap((z) => helideck(-4, dy + 0.3, z, 14, 14)),
    slope(c, 16, dy, 0, 10, 14, 50, 0.86, 0.94),                               // the island
    slope(c, 16, dy + 14, 10, 9, 3.4, 14, 0.9, 0.8), ...windows(16, dy + 15.5, 10, 8.4, 11.6),
    ...lattice(c, 16, dy + 14, -4, 10, 4.4, [dish(6, 2.4)]), ...tower(c, 16, dy + 14, -16, 4.5, 8, 5, 0.4),
    ...[-1, 1].map((s) => ram(c, s * 13, dy, 116, s * 0.5)),
  ]);
  const numbers = KIT.numerals('6', 12, (u, v, du, dv) => P.box(du, 0.06, dv, { x: 2 - u, y: dy + 0.4, z: 100 + v, color: WHITE }));
  return { fixed: merge([fixed, ...numbers]), mounts: [{ geo: phalanx(c), at: [16, dy + 14, 22], arc: 4 }, { geo: phalanx(c), at: [-15, dy, -118], aft: true, arc: 4 }] };
});

// ---------------------------------------------------------------- the shore's missile trucks (models/modern2027.js launcherTruck)

const KH = 0x4a5634;
/** NSM Coastal: the Jelcz 6×6 launcher with its box of four canisters. */
export const buildNsmLauncher = launcherTruck({ length: 10.2, axles: [8.9, 3.0, 1.6], pack: [...pod(0, 0.6, 1.7, 1.3, 4.8, 2, 2, 0.26), P.box(1.4, 0.25, 4.2, { y: -0.1, z: 2.2, color: 0x2e3226 })] });
/** Bastion-P: the K340P on the MZKT-7930 8×8, two big Oniks canisters side by side. */
export const buildBastion = launcherTruck({ length: 12.7, axles: [11.2, 9.7, 4.6, 3.1], bonnet: 'square', pack: [...[-0.5, 0.5].map((x) => P.cyl(0.42, 0.42, 8.8, { x, y: 0.6, z: 2.2, rx: Math.PI / 2, color: KH, camo: 1 }, 14)), ...[-0.5, 0.5].map((x) => P.cyl(0.36, 0.36, 0.04, { x, y: 0.6, z: 6.62, rx: Math.PI / 2, color: 0x141414 }, 12)), P.box(1.8, 0.3, 7.6, { y: 0.05, z: 2.2, color: 0x2e3226 })].map((g) => g.translate(0, 0, -1.8)) });
/** Bal: the 3S60 on the MZKT-7930, two banks of four Uran canisters. */
export const buildBal = launcherTruck({ length: 12.7, axles: [11.2, 9.7, 4.6, 3.1], bonnet: 'square', pack: [...pod(0, 0.65, 2.2, 1.0, 4.6, 2, 4, 0.2), ...pod(0, 1.65, 2.2, 1.0, 4.6, 2, 4, 0.2), P.box(1.8, 0.3, 4.4, { y: 0.0, z: 2.2, color: 0x2e3226 })].map((g) => g.translate(0, 0, -1.6)) });
