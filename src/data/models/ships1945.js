// 1945 warships for the open-sea maps (the Pacific): built at their real size, bow toward +z.
// Model contract as render/RigRenderer.js: build(mats) → { root, muzzle, animate(u, dt, t) }.
// A ship rides the swell (a slow pitch and roll), heels into a turn (u.turning) and settles and
// lists as it floods (u.sink, u.list: entities/UnitStack.js); its gun mounts train on u.turretYaw.
// Steel is surface 'plate' and decks 'deck' / 'flight' (render/paint.js pShip: plating seams, rust
// running down, planking), so the paint needs no textures. The kit below dresses every ship:
// deck-edge rails on stanchions, portholes, anchors, hull numbers (US), light AA in tubs, boats on
// davits, masts with radar, searchlights, funnels with caps and steam pipes, catapults with floatplanes.
//   Fletcher (US): 115 m, five single 5-inch mounts (two forward, three aft), two raked funnels,
//                  a quintuple torpedo mount amidships ×2, Measure 21 navy blue over deck blue
//   Kagerō (IJN):  119 m, three twin 12.7 cm mounts (one forward, two aft), a big trunked funnel
//                  pair, two quadruple Long Lance mounts, grey with a linoleum-brown deck
import * as THREE from 'three';
import { P, merge, loft } from '../units/geometry.js';
import { meshAdder, sideProfile } from './vehicleCommon.js';

const BLACK = 0x1c1e20;
const GLASS = 0x2a3a44;
const WHITE = 0xd8d6cc;
const CANVAS = 0x8a887c;
const US = { hull: 0x56626e, deck: 0x5a6470, upper: 0x7e8892, gun: 0x737d88, black: BLACK, boat: 0x8a9298 };
const IJN = { hull: 0x6e747a, deck: 0x7a5640, upper: 0x7c8288, gun: 0x6e747a, black: BLACK, boat: 0x8c9296 };

// steel unless it's black (bare metal), glass or white paint
const plate = (o = {}) => (o.surf !== undefined || o.color === BLACK || o.color === GLASS || o.color === WHITE ? o : { ...o, surf: 'plate' });
const box = (w, h, d, o) => P.box(w, h, d, plate(o));
const cyl = (rt, rb, h, o, n) => P.cyl(rt, rb, h, plate(o), n);
/** z positions from `a` to `b` every `step` metres */
const every = (a, b, step) => Array.from({ length: Math.max(0, Math.floor((b - a) / step) + 1) }, (_, i) => a + i * step);

/** A strut between two points (masts' legs, davits, crane jibs). */
const _up = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
function strut(a, b, r, color) {
  _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _d.length();
  _e.setFromQuaternion(_q.setFromUnitVectors(_up, _d.normalize()));
  return P.cyl(r, r, len, { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: (a[2] + b[2]) / 2, rx: _e.x, ry: _e.y, rz: _e.z, color, surf: 'metal' }, 6);
}

// ---------------------------------------------------------------- the hull

const breadth = (t) => (t < 0.12 ? 0.78 + 0.22 * Math.sin((t / 0.12) * Math.PI / 2) : t < 0.58 ? 1 : Math.max(0.03, 1 - ((t - 0.58) / 0.42) ** 1.7));

/**
 * A hull, lofted: half-breadths swept from the stern (rounded, near full beam) through the parallel
 * midbody to a fine bow, the sheer rising forward; freeboard `fb` above the water, `draft` below.
 * A planked deck on top follows the same outline, a dark boot-topping band runs along the waterline;
 * rails on stanchions round the deck edge, a row of portholes forward, the anchors at the bow.
 * Returns the parts and the hull's measure (`top(z)`: the deck there, `side(z, y)`: the half-breadth
 * at that height) so the rest of the kit can sit on it.
 */
function hull(len, beam, fb, draft, c, sheer = 1.2, { deck = 'deck', rails = true } = {}) {
  const N = 40;
  const at = (t) => ({ z: -len / 2 + t * len, w: (beam / 2) * breadth(t), top: fb + sheer * Math.max(0, (t - 0.55) / 0.45) ** 2 });
  const tz = (z) => Math.min(1, Math.max(0, (z + len / 2) / len));
  const top = (z) => at(tz(z)).top;
  const side = (z, y) => {
    const p = at(tz(z));
    const v = Math.min(1, Math.abs((y - (p.top - draft) / 2) / ((p.top + draft) / 2)));
    return p.w * (1 - v ** 4) ** 0.25;
  };
  const hullS = [];
  const deckS = [];
  const bootS = [];
  for (let i = 0; i <= N; i++) {
    const p = at(i / N);
    hullS.push([0, (p.top - draft) / 2, p.z, p.w, (p.top + draft) / 2, 4]);
    deckS.push([0, p.top + 0.05, p.z, Math.max(0.05, p.w * 0.97), 0.08, 6]);
    bootS.push([0, -0.15, p.z, p.w + 0.04, 0.35, 4]);
  }
  const parts = [loft(hullS, { color: c.hull, surf: 'plate' }, 16), loft(deckS, { color: c.deck, surf: deck }, 10), loft(bootS, { color: 0x2a1c18, surf: 'plate' }, 12)];
  for (const s of [-1, 1]) {
    if (rails) {
      for (const h of [0.55, 1.05]) {
        const r = [];
        for (let i = 1; i < N; i++) { const p = at(i / N); r.push([s * Math.max(0.05, p.w - 0.15), p.top + h, p.z, 0.03, 0.03, 2]); }
        parts.push(loft(r, { color: c.upper, surf: 'metal' }, 5));
      }
      for (const z of every(-len / 2 + 3, len / 2 - 4, 3)) parts.push(P.box(0.06, 1.05, 0.06, { x: s * (at(tz(z)).w - 0.15), y: top(z) + 0.53, z, color: c.upper, surf: 'metal' }));
    }
    // portholes: a row along the forward half, under the deck edge
    for (const z of every(len * 0.08, len * 0.36, 1.8)) {
      const y = top(z) - 1.3;
      parts.push(P.box(0.3, 0.42, 0.42, { x: s * (side(z, y) - 0.1), y, z, color: BLACK }));
    }
    // the anchor in its hawse, and the chain down from the deck
    const za = len * 0.4;
    const ya = top(za) - 1.6;
    parts.push(P.box(0.5, 1.8, 1.3, { x: s * (side(za, ya) - 0.15), y: ya, z: za, color: BLACK }));
    parts.push(P.cyl(0.45, 0.45, 0.6, { x: s * (side(za, top(za) - 0.5) - 0.2), y: top(za) - 0.5, z: za + 0.6, rz: Math.PI / 2, color: BLACK }, 8));
    parts.push(P.box(0.5, 0.25, 6, { x: s * 1.2, y: top(za + 3) + 0.15, z: za - 3, color: BLACK }));                  // the cable on deck
  }
  parts.push(...[-1, 1].map((s) => P.cyl(0.55, 0.65, 0.9, { x: s * 1.2, y: top(len * 0.36) + 0.45, z: len * 0.36, color: c.gun }, 10))); // the windlass capstans
  return { parts, top, side, len };
}

// numerals as painted on a hull (seven strokes a figure), along `u` (the reading direction) and `v` (up)
const SEGS = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function numerals(text, h, put) {
  const dw = h * 0.55;
  const t = h * 0.14;
  const parts = [];
  [...text].forEach((ch, i) => {
    const u0 = i * (dw + h * 0.28);
    const seg = { a: [dw / 2, h, dw, t], d: [dw / 2, 0, dw, t], g: [dw / 2, h / 2, dw, t], b: [dw, h * 0.75, t, h / 2], c: [dw, h * 0.25, t, h / 2], e: [0, h * 0.25, t, h / 2], f: [0, h * 0.75, t, h / 2] };
    for (const k of SEGS[ch] ?? '') { const [u, v, du, dv] = seg[k]; parts.push(put(u0 + u, v, du, dv)); }
  });
  return parts;
}
/** The hull number on both bows (US ships), white, a little aft of the stem. */
function bowNumber(H, text, h = 2.2) {
  const z0 = H.len * 0.3;
  const y0 = H.top(z0) - h - 0.9;
  return [-1, 1].flatMap((s) => numerals(text, h, (u, v, du, dv) => {
    const z = z0 + (s > 0 ? -u : u) - (s > 0 ? 0 : text.length * h * 0.83);
    const y = y0 + v;
    const ry = Math.atan(s * (H.side(z + 0.5, y) - H.side(z - 0.5, y)));
    return P.box(0.12, dv, du, { x: s * (H.side(z, y) + 0.02), y, z, ry, color: WHITE });
  }));
}

// ---------------------------------------------------------------- the kit

/** Light AA: a 40 mm quad (US) or twin, or a 25 mm triple (IJN), in a tub, pointing out at `ry`. */
function aa(c, x, y, z, { n = 4, ry = 0, tub = true, cal = 0.07, len = 3.2 } = {}) {
  const g = [];
  if (tub) g.push(cyl(1.5 + n * 0.12, 1.5 + n * 0.12, 1.1, { y: 0.55, color: c.upper }, 14));
  g.push(box(0.5 + n * 0.32, 0.9, 1.3, { y: 1.2, color: c.gun }));
  for (let i = 0; i < n; i++) g.push(P.cyl(cal, cal * 1.2, len, { x: (i - (n - 1) / 2) * 0.32, y: 1.8, z: len * 0.38, rx: Math.PI / 2 - 0.5, color: BLACK, surf: 'metal' }, 6));
  return merge(g).rotateY(ry).translate(x, y, z);
}
/** A 20 mm Oerlikon: pedestal, shield, barrel up. */
const oerlikon = (c, x, y, z, ry = 0) => merge([
  P.cyl(0.15, 0.2, 1.1, { y: 0.55, color: c.gun, surf: 'metal' }, 6),
  box(0.9, 0.75, 0.06, { y: 1.3, z: 0.25, color: c.gun }),
  P.cyl(0.04, 0.05, 2.1, { y: 1.75, z: 0.6, rx: Math.PI / 2 - 0.6, color: BLACK, surf: 'metal' }, 5),
]).rotateY(ry).translate(x, y, z);
/** A motor boat on its davits at the deck edge (side `s`). */
function boat(c, x, y, z, len = 8, s = 1) {
  const b = len * 0.26;
  const g = [loft([[0, 0.5, -len / 2, b * 0.4, 0.45, 3], [0, 0.45, -len * 0.25, b / 2, 0.55, 3], [0, 0.45, len * 0.2, b / 2, 0.55, 3], [0, 0.6, len / 2, 0.1, 0.4, 3]], { color: c.boat, surf: 'plate' }, 8),
    P.box(b * 0.7, 0.5, len * 0.3, { y: 1.1, z: -len * 0.05, color: c.boat })];
  for (const dz of [-len * 0.38, len * 0.38]) g.push(strut([s * -b, -0.6, dz], [s * -b, 2.6, dz], 0.1, c.upper), strut([s * -b, 2.6, dz], [0, 2.4, dz], 0.08, c.upper));
  return merge(g).translate(x, y, z);
}
/** A searchlight on its pedestal. */
const searchlight = (c, x, y, z) => [P.cyl(0.25, 0.3, 0.8, { x, y: y + 0.4, z, color: c.gun }, 8), cyl(0.6, 0.6, 1, { x, y: y + 1.3, z, rx: Math.PI / 2, color: c.upper }, 12), P.cyl(0.55, 0.55, 0.05, { x, y: y + 1.3, z: z + 0.52, rx: Math.PI / 2, color: GLASS }, 12)];
/** The bedspring air-search antenna (US SK / IJN Type 21 'mattress'): a grid in a frame, facing +z. */
function grid(x, y, z, w, h, color = BLACK, n = 5) {
  const g = [];
  for (let i = 0; i <= n; i++) {
    g.push(P.box(w, 0.07, 0.07, { x, y: y - h / 2 + (i * h) / n, z, color, surf: 'metal' }));
    g.push(P.box(0.07, h, 0.07, { x: x - w / 2 + (i * w) / n, y, z, color, surf: 'metal' }));
  }
  return g;
}
/** A mast: a pole (or a tripod with two raked legs), a platform, yards, a radar on top. */
function mast(c, x, y, z, h, { tripod = false, yard = 8, rake = 0, radar = null } = {}) {
  const top = [x, y + h, z - Math.sin(rake) * h];
  const g = [strut([x, y, z], top, 0.32, c.upper)];
  if (tripod) for (const s of [-1, 1]) g.push(strut([x + s * h * 0.2, y, z - h * 0.28], [top[0], y + h * 0.75, z - Math.sin(rake) * h * 0.75], 0.24, c.upper));
  const at = (k) => [x, y + h * k, z - Math.sin(rake) * h * k];
  const [px, py, pz] = at(0.62);
  g.push(box(2.6, 0.2, 2.6, { x: px, y: py, z: pz, color: c.upper }), P.box(2.6, 0.5, 0.05, { x: px, y: py + 0.3, z: pz + 1.3, color: c.upper, surf: 'metal' }));
  const [yx, yy, yz] = at(0.82);
  g.push(P.box(yard, 0.14, 0.14, { x: yx, y: yy, z: yz, color: BLACK }), P.box(yard * 0.6, 0.1, 0.1, { x: yx, y: yy - 1.2, z: yz, color: BLACK }));
  if (radar === 'sk') g.push(...grid(top[0], top[1] + 2.6, top[2] + 0.6, 5, 5, BLACK, 6));
  if (radar === 'sc') g.push(...grid(top[0], top[1] + 1.4, top[2] + 0.4, 3.2, 2.2, BLACK, 4));
  if (radar === 'sg') g.push(box(1.8, 0.6, 0.7, { x: top[0], y: top[1] + 0.5, z: top[2], color: c.upper }), P.cyl(0.1, 0.1, 1.2, { x: top[0], y: top[1] + 1.2, z: top[2], color: BLACK }, 5));
  if (radar === 'mattress') g.push(box(3.4, 1.8, 0.3, { x: top[0], y: top[1] + 1.2, z: top[2] + 0.5, color: c.upper }), ...grid(top[0], top[1] + 1.2, top[2] + 0.7, 3.2, 1.6, BLACK, 4));
  if (radar === 'ladder') g.push(...grid(top[0], top[1] - 0.5, top[2] + 0.5, 1.2, 4, BLACK, 3));
  return g;
}
/** A funnel: raked back by `rake`, a black cap over a dark mouth, steam pipes up its after face. */
function funnel(c, x, y, z, r, h, rake = 0, { oval = 1 } = {}) {
  const cx = (k) => [x, y + h * k * Math.cos(rake), z - h * k * Math.sin(rake)];
  const [, my, mz] = cx(0.5);
  const [, ty, tz] = cx(1);
  return [
    cyl(r, r * 1.12, h, { x, y: my, z: mz, rx: -rake, sz: oval, color: c.upper }, 16),
    P.cyl(r * 1.02, r * 1.02, 0.9, { x, y: ty - 0.45, z: tz, rx: -rake, sz: oval, color: BLACK }, 16),
    P.cyl(r * 0.85, r * 0.85, 0.3, { x, y: ty + 0.05, z: tz, rx: -rake, sz: oval, color: 0x0e0f10 }, 14),
    ...[-0.35, 0.35].map((k) => strut([x + k * r, y, z - r * oval - 0.3], [x + k * r, ty + 0.4, tz - r * oval - 0.3], 0.12, c.upper)),
    P.box(r * 2.4, 0.15, 1.6, { x, y: my, z: mz + r * oval + 0.8, color: c.upper, surf: 'metal' }),                       // a searchlight platform
  ];
}
/** Bridge windows: a dark band round the front and sides of a block. */
const windows = (x, y, z, w, d) => [P.box(w + 0.1, 0.7, 0.3, { x, y, z: z + d / 2, color: GLASS }), ...[-1, 1].map((s) => P.box(0.3, 0.7, d * 0.6, { x: x + s * w / 2, y, z: z + d * 0.15, color: GLASS }))];
/** Ventilator cowls, life rafts: the clutter on a deckhouse. */
const vent = (c, x, y, z, ry = 0) => [P.cyl(0.3, 0.3, 1.2, { x, y: y + 0.6, z, color: c.upper }, 8), P.cyl(0.42, 0.3, 0.6, { x: x + Math.sin(ry) * 0.2, y: y + 1.3, z: z + Math.cos(ry) * 0.2, rx: Math.PI / 2 * 0.9, ry, color: c.upper }, 8)];
const raft = (x, y, z) => P.box(0.5, 1.2, 2.6, { x, y, z, color: 0x8a8e8a, surf: 'cloth' });
/** Depth charges: racks over the stern and K-gun throwers either side. */
const depthCharges = (c, H, z0, k = 4) => [
  ...[-1.6, 1.6].map((x) => box(0.9, 1.1, 5, { x, y: H.top(z0) + 0.55, z: z0 + 1, color: c.gun })),
  ...[-1.6, 1.6].flatMap((x) => every(0, 4, 1).map((dz) => P.cyl(0.32, 0.32, 0.6, { x, y: H.top(z0) + 1.3, z: z0 - 1 + dz, rz: Math.PI / 2, color: BLACK }, 8))),
  ...[-1, 1].flatMap((s) => every(0, k - 1, 1).map((i) => P.cyl(0.25, 0.3, 1.4, { x: s * (H.side(z0 + 8 + i * 3, H.top(z0)) - 1.2), y: H.top(z0) + 0.7, z: z0 + 8 + i * 3, rz: s * 0.6, color: c.gun, surf: 'metal' }, 8))),
];

/** A small floatplane or carrier aircraft, built along +z at the origin; `fold` folds the wings up. */
function airplane(col, { span = 12, len = 10, floats = false, mark = WHITE, fold = false } = {}) {
  const L = len;
  const g = [
    loft([[0, 0.9, -L * 0.5, 0.2, 0.25], [0, 1, -L * 0.2, 0.5, 0.6], [0, 1.1, L * 0.15, 0.62, 0.72], [0, 1.05, L * 0.42, 0.6, 0.62], [0, 1.05, L * 0.48, 0.3, 0.3]], { color: col, surf: 'paint' }, 10),
    P.box(0.6, 0.45, L * 0.2, { y: 1.75, z: L * 0.02, color: GLASS }),
    P.box(span * 0.34, 0.1, L * 0.12, { y: 1.2, z: -L * 0.43, color: col }),
    P.box(0.1, L * 0.13, L * 0.12, { y: 1.2 + L * 0.065, z: -L * 0.44, color: col }),
    P.cyl(0.18, 0.05, 0.5, { y: 1.05, z: L * 0.52, rx: Math.PI / 2, color: BLACK }, 8),
    P.box(span * 0.95 * 0.0 + 2.4, 0.08, 0.12, { y: 1.05, z: L * 0.54, color: BLACK, surf: 'metal' }),   // the propeller
  ];
  if (fold) {
    g.push(P.box(span * 0.3, 0.16, L * 0.22, { y: 0.75, z: L * 0.15, color: col }));
    for (const s of [-1, 1]) g.push(P.box(0.16, span * 0.33, L * 0.2, { x: s * span * 0.16, y: 0.75 + span * 0.17, z: L * 0.05, rz: s * 0.15, color: col }));
  } else {
    g.push(P.box(span, 0.16, L * 0.22, { y: floats ? 1.4 : 0.75, z: L * 0.15, color: col }));
    for (const s of [-1, 1]) g.push(P.cyl(0.55, 0.55, 0.03, { x: s * span * 0.33, y: (floats ? 1.4 : 0.75) + 0.1, z: L * 0.15, color: mark }, 12));
  }
  if (floats) g.push(loft([[0, -0.4, -L * 0.3, 0.3, 0.3], [0, -0.35, L * 0.1, 0.42, 0.4], [0, -0.2, L * 0.42, 0.15, 0.15]], { color: col, surf: 'paint' }, 8), P.box(0.1, 1.2, 0.4, { y: 0.2, z: L * 0.1, color: col }));
  else g.push(...[-1, 1].map((s) => P.cyl(0.22, 0.22, 0.14, { x: s * 1.2, y: 0.22, z: L * 0.2, rz: Math.PI / 2, color: BLACK }, 8)));
  return merge(g);
}
/** A catapult on a turntable with a floatplane on it, at deck height `y`, trained `ry`. */
const catapult = (c, x, y, z, ry, plane) => merge([
  P.cyl(1.4, 1.6, 0.6, { y: 0.3, color: c.gun }, 12),
  box(1.1, 0.7, 20, { y: 0.9, color: c.gun }),
  plane.clone().translate(0, 1.6, 1),
]).rotateY(ry).translate(x, y, z);
/** A crane on the stern: post and jib. */
const crane = (c, x, y, z, h = 9, reach = 10, ry = 0) => [strut([x, y, z], [x, y + h, z], 0.4, c.upper), strut([x, y + 1.5, z], [x + Math.sin(ry) * reach, y + h * 0.95, z + Math.cos(ry) * reach], 0.22, c.upper)];

// ---------------------------------------------------------------- guns

/** A gun mount: a sloped-faced house with its barrel(s) and blast bags, sight hoods on the roof. */
function mount(c, { w = 3.4, h = 2.6, d = 4.2, barrels = 1, len = 5.5, cal = 0.16 } = {}) {
  const parts = [
    sideProfile([[-d / 2, 0], [d / 2, 0], [d / 2, h * 0.5], [d / 2 - d * 0.3, h], [-d / 2 + 0.2, h], [-d / 2, h - 0.3]], w, { color: c.gun, surf: 'plate' }, 0.08),
    ...[-1, 1].map((s) => box(0.5, 0.35, 0.8, { x: s * w * 0.3, y: h + 0.15, z: d * 0.05, color: c.gun })),   // sight hoods
    P.box(0.9, 0.12, 0.9, { x: 0, y: h + 0.05, z: -d * 0.25, color: c.upper }),                             // hatch
    P.cyl(w * 0.45, w * 0.48, 0.5, { y: -0.2, color: c.upper }, 14),
  ];
  for (let b = 0; b < barrels; b++) {
    const x = barrels === 1 ? 0 : (b - (barrels - 1) / 2) * 1;
    parts.push(P.cyl(cal * 2.4, cal * 2.6, 0.5, { x, y: h * 0.42, z: d / 2 + 0.2, rx: Math.PI / 2, color: CANVAS, surf: 'cloth' }, 8));
    parts.push(P.cyl(cal, cal * 1.25, len, { x, y: h * 0.42, z: d / 2 + len / 2, rx: Math.PI / 2, color: BLACK, surf: 'metal' }, 8));
  }
  return merge(parts);
}

/** A big-gun turret: long sloped face, flat roof, the barbette under it, rangefinder ears aft. */
const turret = (c, { w, h, d, barrels, len, cal, ears = false }) => merge([
  sideProfile([[-d / 2, 0], [d / 2, 0], [d / 2, h * 0.45], [d / 2 - d * 0.28, h], [-d / 2, h]], w, { color: c.gun, surf: 'plate' }, 0.15),
  cyl(w * 0.52, w * 0.55, 1.2, { y: -0.5, color: c.upper }, 18),                                                      // the barbette ring
  ...(ears ? [-1, 1].map((s) => cyl(0.7, 0.7, 2.4, { x: s * (w / 2 + 0.8), y: h * 0.72, z: -d * 0.3, rz: Math.PI / 2, color: c.gun }, 10)) : []),
  ...[-1, 1].map((s) => box(1, 0.5, 1.4, { x: s * w * 0.28, y: h + 0.25, z: d * 0.05, color: c.gun })),
  P.box(1.4, 0.15, 1.4, { y: h + 0.07, z: -d * 0.3, color: c.upper }),
  ...Array.from({ length: barrels }, (_, b) => {
    const x = (b - (barrels - 1) / 2) * (w / barrels) * 0.85;
    return [P.cyl(cal * 2.2, cal * 2.4, 0.8, { x, y: h * 0.45, z: d / 2 + 0.3, rx: Math.PI / 2, color: CANVAS, surf: 'cloth' }, 10),
      P.cyl(cal, cal * 1.35, len, { x, y: h * 0.45, z: d / 2 + len / 2 + 0.2, rx: Math.PI / 2, color: BLACK, surf: 'metal' }, 10),
      P.cyl(cal * 1.15, cal * 1.15, 0.8, { x, y: h * 0.45, z: d / 2 + len - 0.1, rx: Math.PI / 2, color: BLACK, surf: 'metal' }, 10)];
  }).flat(),
]);

/** A torpedo mount: a turntable, a row of tubes with their breech ends, the trainer's cab. */
const torpedoMount = (c, tubes) => merge([
  P.cyl(1.4, 1.5, 0.4, { y: 0.2, color: c.gun }, 12),
  ...Array.from({ length: tubes }, (_, i) => [P.cyl(0.32, 0.32, 7.5, { x: (i - (tubes - 1) / 2) * 0.72, y: 0.75, rx: Math.PI / 2, color: c.upper, surf: 'plate' }, 8),
    P.cyl(0.36, 0.36, 0.4, { x: (i - (tubes - 1) / 2) * 0.72, y: 0.75, z: -3.6, rx: Math.PI / 2, color: BLACK }, 8)]).flat(),
  box(1.4, 1.2, 1.4, { y: 1.3, z: -2.6, color: c.upper }),
]);

// ---------------------------------------------------------------- the rig

/**
 * Put a ship together: the hull and superstructure (fixed), the gun mounts (each its own group,
 * trained toward u.turretYaw within its arc), the torpedo mounts.
 */
function ship(describe) {
  let d = null;
  return (mats) => {
    d ??= describe();
    const root = new THREE.Group();
    const body = new THREE.Group();   // pitch, roll, heel, settling: the whole ship moves on the water
    root.add(body);
    meshAdder(body)(d.fixed, mats.body);
    const mounts = d.mounts.map((m) => {
      const g = new THREE.Group();
      g.position.set(...m.at);
      if (m.aft) g.rotation.y = Math.PI;
      meshAdder(g)(m.geo, mats.body);
      body.add(g);
      return { g, aft: !!m.aft, arc: m.arc ?? 2.6 };
    });
    for (const t of d.torps ?? []) {
      const g = new THREE.Group();
      g.position.set(...t.at);
      g.rotation.y = Math.PI / 2;
      meshAdder(g)(t.geo, mats.body);
      body.add(g);
    }
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 1.5, 9);
    mounts[0].g.add(muzzle);
    const phase = Math.random() * 10;
    let heel = 0;
    return {
      root,
      muzzle,
      animate(u, dt, t) {
        heel += ((u.turning ?? 0) * 0.07 - heel) * Math.min(1, dt * 0.8);
        const sea = u.seaK ?? 1; // (the sea state: the weather, GameEngine.seaState)
        body.rotation.set(
          Math.sin(t * 0.55 + phase) * 0.012 * sea + (u.trim ?? 0),                // the swell, bow up and down (and down by the head when flooding)
          0,
          Math.sin(t * 0.42 + phase * 1.7) * 0.022 * sea ** 1.5 + heel + (u.list ?? 0), // the roll, the heel into a turn, a list
        );
        body.position.y = Math.sin(t * 0.7 + phase) * 0.25 * sea;
        // the mounts train on the target, each within its arc (forward ones over the bow, aft ones over the stern)
        const want = (u.turretYaw ?? u.yaw) - u.yaw;
        for (const m of mounts) {
          const rel = Math.atan2(Math.sin(want - (m.aft ? Math.PI : 0)), Math.cos(want - (m.aft ? Math.PI : 0)));
          const aim = Math.max(-m.arc / 2 * 1.15, Math.min(m.arc / 2 * 1.15, rel)) + (m.aft ? Math.PI : 0);
          m.g.rotation.y += Math.atan2(Math.sin(aim - m.g.rotation.y), Math.cos(aim - m.g.rotation.y)) * Math.min(1, dt * 1.5);
        }
      },
    };
  };
}

// ---------------------------------------------------------------- destroyers and escorts

export const buildFletcher = ship(() => {
  const c = US;
  const fb = 5.5;
  const H = hull(115, 12, fb, 4, c);
  const fixed = merge([
    ...H.parts,
    ...bowNumber(H, '557'),
    box(9, 3, 20, { y: fb + 1.5, z: 31, color: c.upper }),           // forward deckhouse (mount 2 on its fore end)
    box(7, 3.2, 7, { y: fb + 4.6, z: 29, color: c.upper }),          // the bridge
    ...windows(0, fb + 5.6, 29, 7, 7),
    ...[-1, 1].map((s) => box(2.4, 0.3, 3, { x: s * 4.6, y: fb + 5.9, z: 30, color: c.upper })),   // bridge wings
    box(3, 2, 3, { y: fb + 7.2, z: 28, color: c.upper }),            // the Mk 37 director
    cyl(0.4, 0.4, 4.6, { y: fb + 7.6, z: 28, rz: Math.PI / 2, color: c.gun }, 8),   // its rangefinder
    ...mast(c, 0, fb + 6.2, 25, 12, { tripod: true, radar: 'sc', yard: 7 }),
    box(8, 2.6, 26, { y: fb + 1.3, z: 4, color: c.upper }),          // midships deckhouse
    ...funnel(c, 0, fb + 2.6, 12, 1.8, 7, 0.12, { oval: 1.3 }),
    ...funnel(c, 0, fb + 2.6, -2, 1.8, 6.5, 0.12, { oval: 1.3 }),
    ...searchlight(c, 0, fb + 2.6, 5),
    box(8, 2.6, 16, { y: fb + 1.3, z: -22, color: c.upper }),        // after deckhouse (mount 3 on it)
    aa(c, 0, fb + 2.6, -27, { n: 2, ry: Math.PI }),                  // the twin 40s
    ...[-1, 1].map((s) => aa(c, s * 3.4, fb, -10, { n: 2, ry: s * Math.PI / 2 })),
    ...[-1, 1].flatMap((s) => [24, 20].map((z) => oerlikon(c, s * 4, fb + 3, z, s * Math.PI / 2))),
    ...[-1, 1].map((s) => boat(c, s * 4.8, fb + 0.2, 8, 7.5, s)),
    ...[-1, 1].flatMap((s) => [raft(s * 4.2, fb + 1.6, -22), ...vent(c, s * 2.6, fb + 2.6, 0)]),
    ...depthCharges(c, H, -55, 3),
  ]);
  const gun = mount(c, { barrels: 1, len: 6, cal: 0.18 });
  return {
    fixed,
    mounts: [
      { geo: gun, at: [0, H.top(46) + 0.1, 46], arc: 5 },
      { geo: gun, at: [0, fb + 3.1, 39], arc: 5 },
      { geo: gun, at: [0, fb + 2.7, -18], aft: true, arc: 5 },
      { geo: gun, at: [0, fb + 0.1, -36], aft: true, arc: 5 },
      { geo: gun, at: [0, fb + 0.1, -45], aft: true, arc: 5 },
    ],
    torps: [{ geo: torpedoMount(c, 5), at: [0, fb + 2.7, 0] }, { geo: torpedoMount(c, 5), at: [0, fb + 0.2, -9] }],
  };
});

export const buildKagero = ship(() => {
  const c = IJN;
  const fb = 6;
  const H = hull(119, 11, fb, 3.8, c, 2.2);
  const fixed = merge([
    ...H.parts,
    box(8, 3, 12, { y: fb + 1.5, z: 30, color: c.upper }),           // forward superstructure
    box(6, 3, 6, { y: fb + 4.5, z: 31, color: c.upper }),            // the bridge
    ...windows(0, fb + 5.4, 31, 6, 6),
    box(3.4, 2.2, 3.4, { y: fb + 7.2, z: 30, color: c.upper }),      // the director
    cyl(0.4, 0.4, 4.4, { y: fb + 7.6, z: 30, rz: Math.PI / 2, color: c.gun }, 8),
    ...mast(c, 0, fb + 6, 26, 12, { tripod: true, rake: 0.15, radar: 'ladder', yard: 7 }),
    box(7, 2.6, 30, { y: fb + 1.3, z: 2, color: c.upper }),          // midships
    ...funnel(c, 0, fb + 2.6, 14, 2.2, 8, 0.2, { oval: 1.4 }),        // the big trunked forward funnel
    ...funnel(c, 0, fb + 2.6, 1, 1.7, 6.5, 0.2, { oval: 1.3 }),
    box(7, 2.6, 14, { y: fb + 1.3, z: -22, color: c.upper }),        // after deckhouse (mount 2 on it)
    ...[-1, 1].map((s) => box(2.2, 1.8, 6, { x: s * 3.6, y: fb + 0.9, z: -12, color: c.upper })),   // the torpedo reload lockers
    ...[-1, 1].map((s) => aa(c, s * 2.4, fb + 2.6, 8, { n: 3, ry: s * Math.PI / 2, cal: 0.05, len: 2.4 })),   // 25 mm triples
    aa(c, 0, fb + 4.6, 26, { n: 3, cal: 0.05, len: 2.4 }),
    ...[-1, 1].map((s) => aa(c, s * 3, fb + 2.6, -27, { n: 3, ry: Math.PI, cal: 0.05, len: 2.4, tub: false })),
    ...[-1, 1].map((s) => boat(c, s * 4.4, fb + 0.2, -4, 7, s)),
    ...searchlight(c, 0, fb + 2.6, 8),
    ...[-1, 1].flatMap((s) => vent(c, s * 2.4, fb + 2.6, -6)),
    ...depthCharges(c, H, -57, 2),
  ]);
  const twin = mount(c, { w: 4.2, h: 2.8, d: 5, barrels: 2, len: 6, cal: 0.15 });
  return {
    fixed,
    mounts: [
      { geo: twin, at: [0, H.top(43) + 0.1, 43], arc: 5 },
      { geo: twin, at: [0, fb + 2.7, -19], aft: true, arc: 5 },
      { geo: twin, at: [0, fb + 0.1, -38], aft: true, arc: 5 },
    ],
    torps: [{ geo: torpedoMount(c, 4), at: [0, fb + 0.2, -6] }, { geo: torpedoMount(c, 4), at: [0, fb + 0.2, 20] }],
  };
});

export const buildBuckley = ship(() => {
  const c = US;
  const fb = 4.5;
  const H = hull(93, 11, fb, 3.4, c);
  return {
    fixed: merge([
      ...H.parts,
      ...bowNumber(H, '51', 1.9),
      box(8, 2.5, 16, { y: fb + 1.25, z: 23, color: c.upper }),
      box(6, 3, 5, { y: fb + 4, z: 23, color: c.upper }),
      ...windows(0, fb + 4.9, 23, 6, 5),
      ...[-1, 1].map((s) => box(2, 0.3, 2.6, { x: s * 3.9, y: fb + 5.4, z: 24, color: c.upper })),
      ...mast(c, 0, fb + 5.5, 20, 10, { radar: 'sc', yard: 6 }),
      box(3.2, 1.4, 2.4, { y: fb + 0.7, z: 31.5, color: c.gun }),      // the Hedgehog
      ...every(-1.2, 1.2, 0.6).flatMap((x) => [-0.6, 0.6].map((dz) => P.cyl(0.08, 0.08, 1, { x, y: fb + 1.8, z: 31.5 + dz, rx: 0.5, color: BLACK }, 5))),
      ...funnel(c, 0, fb + 2.4, 5, 1.6, 5, 0.1, { oval: 1.3 }),
      box(7, 2.4, 22, { y: fb + 1.2, z: -2, color: c.upper }),
      aa(c, 0, fb + 2.4, -10, { n: 2, ry: Math.PI }),
      ...[-1, 1].flatMap((s) => [10, -6].map((z) => oerlikon(c, s * 3.2, fb + 2.4, z, s * Math.PI / 2))),
      ...[-1, 1].map((s) => boat(c, s * 4.4, fb + 0.2, 0, 7, s)),
      ...[-1, 1].map((s) => raft(s * 3.7, fb + 1.4, -8)),
      ...depthCharges(c, H, -44, 4),
    ]),
    mounts: [
      { geo: mount(c, { barrels: 1, len: 4.5, cal: 0.12, w: 2.6, h: 2.2, d: 3.4 }), at: [0, H.top(36) + 0.1, 36] },
      { geo: mount(c, { barrels: 1, len: 4.5, cal: 0.12, w: 2.6, h: 2.2, d: 3.4 }), at: [0, fb + 2.5, 28.5] },
      { geo: mount(c, { barrels: 1, len: 4.5, cal: 0.12, w: 2.6, h: 2.2, d: 3.4 }), at: [0, fb + 0.1, -24], aft: true },
    ],
  };
});

export const buildKaibokan = ship(() => {
  const c = IJN;
  const fb = 4.5;
  const H = hull(78, 9.4, fb, 3, c, 1.6);
  return {
    fixed: merge([
      ...H.parts,
      box(7, 3, 10, { y: fb + 1.5, z: 16, color: c.upper }),
      box(5, 2.6, 4.5, { y: fb + 4.3, z: 17, color: c.upper }),
      ...windows(0, fb + 5, 17, 5, 4.5),
      ...mast(c, 0, fb + 5.6, 13, 9, { tripod: true, rake: 0.12, radar: 'mattress', yard: 5 }),
      ...funnel(c, 0, fb + 2.4, 2, 1.5, 4.5, 0.15, { oval: 1.2 }),
      box(6, 2.4, 16, { y: fb + 1.2, z: -2, color: c.upper }),
      ...[-1, 1].map((s) => aa(c, s * 2.2, fb + 2.4, 4, { n: 3, ry: s * Math.PI / 2, cal: 0.05, len: 2.4 })),
      aa(c, 0, fb + 2.4, -8, { n: 3, ry: Math.PI, cal: 0.05, len: 2.4 }),
      ...[-1, 1].map((s) => boat(c, s * 3.9, fb + 0.2, -4, 6, s)),
      ...depthCharges(c, H, -33, 4),
    ]),
    mounts: [
      { geo: mount(c, { barrels: 1, len: 4.5, cal: 0.12, w: 2.6, h: 2.2, d: 3.2 }), at: [0, H.top(30) + 0.1, 30] },
      { geo: mount(c, { barrels: 2, len: 4.5, cal: 0.12, w: 3.4, h: 2.4, d: 3.8 }), at: [0, fb + 0.1, -20], aft: true },
    ],
  };
});

// ---------------------------------------------------------------- cruisers

export const buildBaltimore = ship(() => {
  const c = US;
  const fb = 7.5;
  const H = hull(205, 21, fb, 7, c);
  const t3 = turret(c, { w: 8, h: 3.6, d: 9, barrels: 3, len: 12, cal: 0.3 });
  const five = mount(c, { w: 4, h: 2.6, d: 4.6, barrels: 2, len: 5, cal: 0.15 });
  const kingfisher = airplane(0x3c4c60, { span: 11, len: 10, floats: true });
  return {
    fixed: merge([
      ...H.parts,
      ...bowNumber(H, '68', 3),
      box(10, 3.2, 12, { y: fb + 1.6, z: 56, color: c.upper }),        // the barbette of the superfiring turret
      box(14, 5, 26, { y: fb + 2.5, z: 32, color: c.upper }),
      box(11, 5, 12, { y: fb + 7.5, z: 34, color: c.upper }),          // the bridge tower
      ...windows(0, fb + 9.4, 34, 11, 12),
      ...[-1, 1].map((s) => box(3, 0.3, 4, { x: s * 7, y: fb + 9.8, z: 36, color: c.upper })),
      box(5, 3, 5, { y: fb + 11.5, z: 32, color: c.upper }),
      cyl(0.6, 0.6, 7, { y: fb + 12, z: 32, rz: Math.PI / 2, color: c.gun }, 8),
      ...mast(c, 0, fb + 10, 28, 16, { tripod: true, radar: 'sk', yard: 10 }),
      box(13, 4, 50, { y: fb + 2, z: -6, color: c.upper }),
      ...funnel(c, 0, fb + 4, 12, 3, 10, 0.08, { oval: 1.3 }),
      ...funnel(c, 0, fb + 4, -14, 3, 10, 0.08, { oval: 1.3 }),
      ...mast(c, 0, fb + 4, -26, 14, { radar: 'sg', yard: 8 }),
      box(9, 4, 12, { y: fb + 2, z: -40, color: c.upper }),
      ...[-1, 1].flatMap((s) => [16, -2].map((z) => five.clone().rotateY(s * Math.PI / 2).translate(s * 4.2, fb + 4, z))), // 5-inch twins either side
      ...[-1, 1].flatMap((s) => [[26, fb + 5], [7, fb + 4], [-20, fb + 4], [-28, fb + 4]].map(([z, y]) => aa(c, s * 5, y, z, { ry: s * Math.PI / 2 }))),     // the quad 40s
      aa(c, 0, fb + 5, 42), aa(c, 0, fb + 4, -46, { ry: Math.PI }),
      ...[-1, 1].flatMap((s) => every(-30, 20, 10).map((z) => oerlikon(c, s * (H.side(z, fb) - 1), fb, z, s * Math.PI / 2))),
      ...[-1, 1].map((s) => boat(c, s * 7.8, fb + 4, -24, 9, s)),
      ...[-1, 1].map((s) => catapult(c, s * 5, fb + 0.1, -82, s * 0.5, kingfisher)),
      ...crane(c, 0, fb, -95, 10, 12, Math.PI),
      ...[-1, 1].flatMap((s) => searchlight(c, s * 3, fb + 7, 2)),
    ]),
    mounts: [
      { geo: t3, at: [0, H.top(70), 70], arc: 5 },
      { geo: t3, at: [0, fb + 3.2, 56], arc: 5 },
      { geo: t3, at: [0, fb, -58], aft: true, arc: 5 },
    ],
  };
});

export const buildTakao = ship(() => {
  const c = IJN;
  const fb = 7;
  const H = hull(203, 19, fb, 6.3, c, 2.6);
  const t2 = turret(c, { w: 7, h: 3.4, d: 8.5, barrels: 2, len: 11, cal: 0.28 });
  const ha = mount(c, { w: 3.8, h: 2.4, d: 4.4, barrels: 2, len: 5, cal: 0.14 });
  const jake = airplane(0x4a5a40, { span: 14, len: 11, floats: true, mark: 0xb02020 });
  return {
    fixed: merge([
      ...H.parts,
      ...[63, -48].map((z) => box(9, 2.8, 10, { y: fb + 1.4, z, color: c.upper })),   // the superfiring barbettes
      box(13, 5, 18, { y: fb + 2.5, z: 26, color: c.upper }),
      box(12, 6, 12, { y: fb + 8, z: 26, color: c.upper }),           // the massive bridge block
      box(10, 4, 9, { y: fb + 13, z: 25, color: c.upper }),
      ...windows(0, fb + 14.6, 25, 10, 9),
      ...windows(0, fb + 10, 26, 12, 12),
      ...[-1, 1].map((s) => box(2.6, 0.3, 3, { x: s * 6.6, y: fb + 11, z: 28, color: c.upper })),
      box(9, 1.6, 2.4, { y: fb + 16, z: 25, color: c.gun }),           // the rangefinder
      box(3.4, 1.8, 0.3, { y: fb + 17.6, z: 27, color: c.upper }), ...grid(0, fb + 17.6, 27.2, 3.2, 1.6, BLACK, 4), // Type 21
      ...mast(c, 0, fb + 4, 18, 18, { tripod: true, rake: 0.12, yard: 10 }),
      ...funnel(c, 0, fb + 4, 4, 3.4, 13, 0.35, { oval: 1.4 }),      // the trunked funnel, raked far back
      ...mast(c, 0, fb + 4, -30, 16, { tripod: true, rake: 0.1, radar: 'ladder', yard: 8 }),
      box(11, 4, 40, { y: fb + 2, z: -12, color: c.upper }),
      ...[-1, 1].map((s) => box(2.6, 1.6, 9, { x: s * 8.6, y: fb + 1, z: -8, color: c.gun })), // torpedo mounts under the deck edge
      ...[-1, 1].flatMap((s) => [4, -8].map((z) => ha.clone().rotateY(s * Math.PI / 2).translate(s * 3.6, fb + 4, z))),
      ...[-1, 1].flatMap((s) => [-16, -24, -30].map((z) => aa(c, s * 4, fb + 4, z, { n: 3, ry: s * Math.PI / 2, cal: 0.05, len: 2.4 }))),
      ...[-1, 1].flatMap((s) => every(38, 46, 8).map((z) => aa(c, s * 5.5, fb + 0.1, z, { n: 3, ry: s * Math.PI / 2, cal: 0.05, len: 2.4, tub: false }))),
      ...[-1, 1].map((s) => catapult(c, s * 5.5, fb + 4, -24, s * 1.2, jake)),
      ...crane(c, 0, fb + 4, -34, 10, 12, Math.PI),
      ...[-1, 1].map((s) => boat(c, s * 7.2, fb + 4, -8, 9, s)),
      ...[-1, 1].flatMap((s) => searchlight(c, s * 3.5, fb + 4, -2)),
    ]),
    mounts: [
      { geo: t2, at: [0, H.top(74), 74], arc: 5 },
      { geo: t2, at: [0, fb + 2.8, 63], arc: 5 },
      { geo: t2, at: [0, fb, 52], arc: 5 },
      { geo: t2, at: [0, fb + 2.8, -48], aft: true, arc: 5 },
      { geo: t2, at: [0, fb, -60], aft: true, arc: 5 },
    ],
  };
});

// ---------------------------------------------------------------- battleships

export const buildIowa = ship(() => {
  const c = US;
  const fb = 9;
  const H = hull(262, 33, fb, 11, c, 2);
  const t3 = turret(c, { w: 12, h: 5, d: 13, barrels: 3, len: 20, cal: 0.5, ears: true });
  const five = mount(c, { w: 4.4, h: 2.8, d: 5, barrels: 2, len: 5.4, cal: 0.15 });
  const kingfisher = airplane(0x3c4c60, { span: 11, len: 10, floats: true });
  return {
    fixed: merge([
      ...H.parts,
      box(14, 4, 15, { y: fb + 2, z: 74, color: c.upper }),           // the barbette of No. 2
      box(18, 6, 30, { y: fb + 3, z: 36, color: c.upper }),
      cyl(5, 5.5, 14, { y: fb + 10, z: 40, color: c.upper }, 16),     // the conning tower
      box(14, 6, 14, { y: fb + 18, z: 38, color: c.upper }),           // the bridge levels
      ...windows(0, fb + 20, 38, 14, 14),
      ...[-1, 1].map((s) => box(3, 0.3, 5, { x: s * 8.5, y: fb + 20.6, z: 40, color: c.upper })),
      box(6, 4, 6, { y: fb + 23, z: 37, color: c.upper }),             // main director
      cyl(0.7, 0.7, 9, { y: fb + 24, z: 37, rz: Math.PI / 2, color: c.gun }, 8),
      ...mast(c, 0, fb + 25, 32, 14, { tripod: true, radar: 'sk', yard: 12 }),
      box(17, 6, 64, { y: fb + 3, z: -10, color: c.upper }),
      ...funnel(c, 0, fb + 6, 14, 4.5, 14, 0, { oval: 1.3 }),
      ...funnel(c, 0, fb + 6, -10, 4.5, 14, 0, { oval: 1.3 }),
      ...mast(c, 0, fb + 6, -26, 20, { radar: 'sg', yard: 10 }),
      box(10, 4, 10, { y: fb + 8, z: -32, color: c.upper }),           // the after director
      ...[-1, 1].flatMap((s) => [30, 14, -2, -18, -36].map((z) => five.clone().rotateY(s * Math.PI / 2).translate(s * 6, fb + 6, z))), // 5-inch twins
      ...[-1, 1].flatMap((s) => [46, 22, 6, -10, -26, -44].map((z) => aa(c, s * 13.5, fb + 0.1, z, { ry: s * Math.PI / 2 }))),             // quad 40s on the main deck
      ...[-1, 1].flatMap((s) => [24, -27].map((z) => aa(c, s * 6.4, fb + 6, z, { ry: s * Math.PI / 2 }))),
      aa(c, 0, fb + 0.1, 100), aa(c, 0, fb + 0.1, -100, { ry: Math.PI }),
      ...[-1, 1].flatMap((s) => every(-110, 110, 9).filter((z) => Math.abs(z) > 50).map((z) => oerlikon(c, s * (H.side(z, fb) - 1.2), H.top(z), z, s * Math.PI / 2))),
      ...[-1, 1].map((s) => catapult(c, s * 8, fb + 0.1, -112, s * 0.45, kingfisher)),
      ...crane(c, 0, fb, -126, 12, 16, Math.PI),
      ...[-1, 1].map((s) => boat(c, s * 9.5, fb + 6, 0, 10, s)),
      ...[-1, 1].flatMap((s) => searchlight(c, s * 3.2, fb + 6, 24)),
    ]),
    mounts: [
      { geo: t3, at: [0, H.top(92), 92], arc: 5 },
      { geo: t3, at: [0, fb + 4, 74], arc: 5 },
      { geo: t3, at: [0, fb, -74], aft: true, arc: 5 },
    ],
  };
});

export const buildYamato = ship(() => {
  const c = { ...IJN, deck: 0x9a845e };   // the scrubbed hinoki deck
  const fb = 10;
  const H = hull(263, 38.9, fb, 11, c, 3);
  const t3 = turret(c, { w: 14, h: 5.6, d: 15, barrels: 3, len: 21, cal: 0.6 });
  const sec = turret(c, { w: 8, h: 3.4, d: 9, barrels: 3, len: 10, cal: 0.24 });   // the 15.5 cm triples
  const ha = mount(c, { w: 4.2, h: 2.6, d: 4.6, barrels: 2, len: 5, cal: 0.14 });
  const jake = airplane(0x4a5a40, { span: 14, len: 11, floats: true, mark: 0xb02020 });
  const t25 = (x, y, z, ry, tub = true) => aa(c, x, y, z, { n: 3, ry, cal: 0.05, len: 2.4, tub });
  return {
    fixed: merge([
      ...H.parts,
      box(16, 4.5, 17, { y: fb + 2.25, z: 70, color: c.upper }),       // the barbette of No. 2
      box(20, 6, 34, { y: fb + 3, z: 26, color: c.upper }),
      box(14, 10, 16, { y: fb + 11, z: 26, color: c.upper }),          // the tower bridge (pagoda)
      box(11, 8, 12, { y: fb + 20, z: 25, color: c.upper }),
      ...windows(0, fb + 22, 25, 11, 12),
      ...windows(0, fb + 14, 26, 14, 16),
      ...[-1, 1].map((s) => box(3, 0.3, 4, { x: s * 8.5, y: fb + 16, z: 29, color: c.upper })),
      box(16, 2.4, 4, { y: fb + 25.5, z: 25, color: c.gun }),          // the 15 m rangefinder
      box(4, 2, 0.3, { y: fb + 28, z: 27, color: c.upper }), ...grid(0, fb + 28, 27.2, 3.8, 1.8, BLACK, 5), // Type 21
      ...[-1, 1].map((s) => box(3, 1.6, 0.3, { x: s * 5, y: fb + 23, z: 31.2, color: c.upper })),       // Type 22 horns
      ...mast(c, 0, fb + 24, 23, 12, { yard: 10, radar: 'ladder' }),
      ...funnel(c, 0, fb + 6, 2, 5, 13, 0.3, { oval: 1.5 }),           // the single raked funnel
      ...mast(c, 0, fb + 6, -14, 18, { tripod: true, rake: 0.1, yard: 10 }),
      box(19, 6, 56, { y: fb + 3, z: -20, color: c.upper }),
      box(10, 3.4, 10, { y: fb + 7.7, z: 46, color: c.upper }),        // the forward secondary's barbette
      sec.clone().translate(0, fb + 9.4, 46),
      sec.clone().rotateY(Math.PI).translate(0, fb + 6, -43),
      ...[-1, 1].flatMap((s) => [16, 0, -16].map((z) => ha.clone().rotateY(s * Math.PI / 2).translate(s * 7.4, fb + 6, z))), // 12.7 cm HA twins
      ...[-1, 1].flatMap((s) => [-8, -24, -38].map((z) => t25(s * 7.4, fb + 6, z, s * Math.PI / 2))),
      ...[-1, 1].flatMap((s) => every(-60, 60, 10).map((z) => t25(s * (H.side(z, fb) - 2.2), fb + 0.1, z, s * Math.PI / 2, false))),
      ...[-1, 1].flatMap((s) => [31, 22].map((z) => t25(s * 5.4, fb + 16, z, s * Math.PI / 2))),
      ...[-1, 1].map((s) => catapult(c, s * 12, fb + 0.1, -112, s * 0.5, jake)),
      ...crane(c, 0, fb, -100, 13, 18, Math.PI),
      jake.clone().translate(-4, fb + 0.1, -122), jake.clone().translate(6, fb + 0.1, -124),
      ...[-1, 1].map((s) => boat(c, s * 10.5, fb + 6, -44, 11, s)),
      ...[-1, 1].flatMap((s) => searchlight(c, s * 5, fb + 16, 20)),
    ]),
    mounts: [
      { geo: t3, at: [0, H.top(88), 88], arc: 5 },
      { geo: t3, at: [0, fb + 4.5, 70], arc: 5 },
      { geo: t3, at: [0, fb, -70], aft: true, arc: 5 },
    ],
  };
});

// ---------------------------------------------------------------- submarines

/** A submarine: the long pressure hull awash, the conning tower ("sail") with periscopes, a deck gun. */
function submarine(c, { len, beam, tower, gunZ, hangar = false }) {
  const parts = [];
  const deck = beam * 0.13; // (she rides low: a metre of casing above the water)
  const secs = [];
  for (let k = 0; k <= 24; k++) { // the pressure hull: a cigar, fuller aft of amidships, fine at the bow
    const t = k / 24;
    const r = (beam / 2) * Math.max(0.05, Math.sin(Math.PI * Math.min(1, 0.04 + t * 0.94)) ** 0.55);
    secs.push([0, -beam * 0.3, -len / 2 + t * len, r, r * 0.9, 2.2]);
  }
  parts.push(loft(secs, { color: c.hull, surf: 'plate' }, 16));
  // the casing: a ship-shaped outer hull over the cigar, its sides sloping down into it, a raked bow
  // rising forward and a fine tail; the planked deck along its top
  const cw = (t) => beam * 0.3 * Math.min(1, 0.2 + t * 8, (1 - t) * 5.5);   // the casing's half-breadth, 0 aft … 1 at the stem
  const cz = (t) => -len * 0.47 + t * len * 0.92;
  const rise = (t) => (t > 0.75 ? ((t - 0.75) / 0.25) ** 2 * 1.2 : 0);
  const cas = [];
  const top = [];
  for (let k = 0; k <= 30; k++) {
    const t = k / 30;
    const lo = -beam * 0.3;
    cas.push([0, (deck + rise(t) + lo) / 2, cz(t), Math.max(0.1, cw(t)), (deck + rise(t) - lo) / 2, 3]);
    top.push([0, deck + rise(t) + 0.06, cz(t), Math.max(0.08, cw(t) * 0.92), 0.07, 6]);
  }
  parts.push(loft(cas, { color: c.hull, surf: 'plate' }, 14), loft(top, { color: c.deck, surf: 'deck' }, 10));
  // limber holes: the free-flooding slots along the casing's sides, where it is full width
  for (const s of [-1, 1]) for (let t = 0.12; t < 0.8; t += 1.4 / (len * 0.92)) parts.push(P.box(0.2, 0.3, 0.7, { x: s * (cw(t) * 0.97 - 0.02), y: deck - 0.4, z: cz(t), color: BLACK }));
  const [tl, th, tz] = tower;
  // the fairwater: flat-sided and narrow, a rounded front, the bridge high forward, stepped down aft to
  // the gun platform, tapering away at the back; the open bridge a dark well in its top
  const sw = beam * 0.2;
  const sail = [];
  for (let k = 0; k <= 16; k++) {
    const t = k / 16;   // 0 aft … 1 forward
    const w = sw * (t > 0.8 ? Math.max(0, 1 - ((t - 0.8) / 0.2) ** 2) ** 0.5 : t < 0.3 ? 0.55 + 0.45 * (t / 0.3) : 1);
    const h = th * (t > 0.42 ? 1 : 0.62 + 0.38 * Math.max(0, (t - 0.34) / 0.08));
    sail.push([0, deck + h / 2, tz - tl / 2 + t * tl, Math.max(0.12, w), h / 2, 6]);
  }
  parts.push(loft(sail, { color: c.upper, surf: 'plate' }, 16));
  parts.push(P.box(sw * 1.5, 0.06, tl * 0.32, { y: deck + th + 0.01, z: tz + tl * 0.18, color: BLACK }));                   // the bridge well
  parts.push(...[-1, 1].map((s) => P.box(0.06, 0.45, tl * 0.4, { x: s * sw * 0.96, y: deck + th + 0.22, z: tz + tl * 0.16, color: c.upper, surf: 'metal' })));   // the bridge screen
  // the periscope standards: two slim posts braced together, the periscopes out of their tops, the SJ radar mast aft
  const ps = tz + tl * 0.02;
  for (const [dz, h] of [[0.7, 4.2], [-0.7, 3.6]]) {
    parts.push(P.cyl(0.22, 0.3, h, { y: deck + th + h / 2, z: ps + dz, color: c.upper, surf: 'plate' }, 8));
    parts.push(P.cyl(0.1, 0.12, 1.8, { y: deck + th + h + 0.9, z: ps + dz, color: BLACK, surf: 'metal' }, 6));
  }
  parts.push(P.box(0.14, 0.14, 1.4, { y: deck + th + 3.2, z: ps, color: c.upper, surf: 'metal' }));
  parts.push(P.cyl(0.08, 0.1, 3.2, { y: deck + th + 1.6, z: ps - 2.2, color: BLACK, surf: 'metal' }, 5), P.cyl(0.45, 0.45, 0.12, { y: deck + th + 3.3, z: ps - 2.2, rx: Math.PI / 2, color: c.upper }, 10)); // SJ radar
  parts.push(oerlikon(c, 0, deck + th * 0.62, tz - tl * 0.38, Math.PI), oerlikon(c, 0, deck + th, tz - tl * 0.1, Math.PI));
  parts.push(box(1.4, 1.2, 1.8, { y: deck + 0.7, z: gunZ, color: c.gun }), P.box(1.6, 0.9, 0.1, { y: deck + 1.4, z: gunZ + 0.9, color: c.gun }));  // deck gun and shield
  parts.push(P.cyl(0.12, 0.15, 4, { y: deck + 1.3, z: gunZ + 2.4, rx: Math.PI / 2, color: BLACK, surf: 'metal' }, 6));
  parts.push(...[-1, 1].map((s) => box(2.2, 0.12, 1.2, { x: s * (cw(0.88) + 1), y: -0.6, z: cz(0.88), color: c.hull })));   // bow planes
  parts.push(strut([0, deck + rise(0.97), cz(0.97)], [0, deck + rise(0.97) + 1.6, cz(0.95)], 0.1, c.upper), strut([0, deck + rise(0.97) + 1.6, cz(0.95)], [0, deck + th + 3.2, ps + 0.7], 0.035, BLACK)); // net cutter, jumping wire
  if (hangar) {
    parts.push(cyl(1.6, 1.6, 9, { y: deck + 1.5, z: tz + 8, rx: Math.PI / 2, color: c.upper }, 12)); // the I-boat's floatplane hangar
    parts.push(P.cyl(1.4, 1.4, 0.15, { y: deck + 1.5, z: tz + 12.6, rx: Math.PI / 2, color: c.gun }, 12));
    parts.push(box(0.8, 0.5, 18, { y: deck + 0.35, z: tz + 22, color: c.gun }));                               // the catapult rail forward
  }
  return merge(parts);
}

/** A boat as a rig: no mounts to train, it just rides the swell (lightly: it's low in the water). */
function sub(describe) {
  let geo = null;
  return (mats) => {
    geo ??= describe();
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    meshAdder(body)(geo, mats.body);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0, 40);
    body.add(muzzle);
    const phase = Math.random() * 10;
    return {
      root,
      muzzle,
      animate(u, dt, t) {
        const awash = (u.depth ?? 0) < 1 ? 1 : 0.2;
        body.rotation.set(Math.sin(t * 0.6 + phase) * 0.01 * awash + (u.trim ?? 0), 0, Math.sin(t * 0.45 + phase) * 0.03 * awash + (u.list ?? 0));
      },
    };
  };
}

export const buildGato = sub(() => submarine({ ...US, deck: 0x5a5a52 }, { len: 95, beam: 8.3, tower: [12, 4.2, 6], gunZ: 16 }));
export const buildB1 = sub(() => submarine({ ...IJN, deck: 0x4a4e52 }, { len: 108, beam: 9.3, tower: [11, 4.6, 4], gunZ: -16, hangar: true }));

// ---------------------------------------------------------------- carriers

/**
 * An aircraft carrier: the hull, the hangar (open bays along its sides) under a long planked flight
 * deck with its markings and elevators, catwalks and AA sponsons along the edges, the island to
 * starboard with its mast and radar, the air group parked aft with wings folded.
 */
function flattop(c, H, { len, beam, fb, deck, islandZ, funnel: fun = 'stack', number = null, mark, aaN = 4, aaCal = 0.07 }) {
  const dy = fb + 7.5;   // the flight deck's height
  const fw = beam * 1.15;
  const parts = [
    ...H.parts,
    box(beam * 0.92, 7.5, len * 0.78, { y: fb + 3.75, z: -len * 0.02, color: c.upper }),               // the hangar
    ...[-1, 1].flatMap((s) => every(-len * 0.32, len * 0.3, 14).map((z) => P.box(0.2, 4.5, 9, { x: s * beam * 0.46, y: fb + 3.5, z, color: 0x141618 }))), // its open bays
    box(fw, 0.6, len * 0.95, { y: dy, z: 0, color: deck, surf: 'flight' }),                              // the flight deck (overhanging)
    ...[-1, 1].map((s) => box(2.6, 0.2, len * 0.8, { x: s * (fw / 2 + 1.2), y: dy - 1, z: 0, color: c.upper })), // catwalks
    P.box(0.5, 0.05, len * 0.9, { y: dy + 0.32, color: WHITE }),                                          // the centre line
    ...[-1, 1].map((s) => P.box(0.25, 0.05, len * 0.9, { x: s * (fw / 2 - 0.6), y: dy + 0.32, color: WHITE })),
    ...[len * 0.3, 0, -len * 0.28].map((z) => P.box(13, 0.04, 14, { y: dy + 0.31, z, color: 0x34383c })),  // the elevators
    ...every(-len * 0.45, -len * 0.3, 3).map((z) => P.box(fw * 0.8, 0.06, 0.12, { y: dy + 0.33, z, color: BLACK })), // arresting wires
    // the island
    box(5, 9, 22, { x: beam * 0.55, y: dy + 4.5, z: islandZ, color: c.upper }),
    box(6.5, 2.5, 8, { x: beam * 0.55, y: dy + 10, z: islandZ + 6, color: c.upper }),
    ...windows(beam * 0.55, dy + 10.6, islandZ + 6, 6.5, 8),
    box(3, 2, 3, { x: beam * 0.55, y: dy + 12.3, z: islandZ + 7, color: c.upper }),
    ...mast(c, beam * 0.55, dy + 11.2, islandZ + 2, 12, { tripod: true, radar: 'sk', yard: 8 }),
    aa(c, beam * 0.55, dy + 9, islandZ - 9, { n: aaN, cal: aaCal, ry: Math.PI }),
    aa(c, beam * 0.55, dy + 9, islandZ + 13, { n: aaN, cal: aaCal }),
    ...(fun === 'stack'
      ? funnel(c, beam * 0.55, dy + 9, islandZ - 4, 2.6, 7, 0.08, { oval: 1.6 })
      : [cyl(1.8, 2.2, 9, { x: beam * 0.62, y: fb + 2, z: islandZ - 10, rz: -1.2, color: c.upper }, 10), P.cyl(1.82, 1.82, 0.6, { x: beam * 0.62 + 4.2, y: fb + 0.4, z: islandZ - 10, rz: -1.2, color: BLACK }, 10)]), // the IJN's funnels, turned down over the side
    ...crane(c, beam * 0.5, dy, islandZ - 16, 8, 9, Math.PI / 2),
    // AA sponsons along both edges
    ...[-1, 1].flatMap((s) => every(-len * 0.4, len * 0.38, len * 0.13).flatMap((z) => [aa(c, s * (fw / 2 + 2.2), dy - 1.6, z, { n: aaN, cal: aaCal, ry: s * Math.PI / 2 }),
      box(5, 0.5, 5.4, { x: s * (fw / 2 + 2.2), y: dy - 1.85, z, color: c.upper }), strut([s * (fw / 2 + 3.8), dy - 2, z], [s * (beam * 0.46), dy - 6, z], 0.15, c.upper)])),
    ...[-1, 1].flatMap((s) => every(-len * 0.36, len * 0.34, 12).map((z) => oerlikon(c, s * (fw / 2 + 1.6), dy - 0.9, z + 5, s * Math.PI / 2))),
  ];
  if (number) parts.push(...numerals(number, 14, (u, v, du, dv) => P.box(du, 0.05, dv, { x: 3.8 - u, y: dy + 0.34, z: len * 0.36 + v, color: WHITE })));
  // the air group, spotted aft with wings folded, two lines
  const plane = airplane(c.plane, { span: 12.5, len: 10, fold: true, mark });
  for (const [i, z] of every(-len * 0.44, -len * 0.18, 9).entries()) {
    for (const x of i % 2 ? [-7, 3] : [-3, 7]) parts.push(plane.clone().translate(x, dy + 0.3, z));
  }
  parts.push(airplane(c.plane, { span: 12.5, len: 10, mark }).translate(-2, dy + 0.3, len * 0.12)); // one spotted for launch
  return merge(parts);
}

/** A carrier as a rig: rides the swell, its deck-edge mounts train like a ship's. */
const carrier = (describe) => ship(() => {
  const d = describe();
  return { fixed: d.fixed, mounts: d.mounts };
});

export const buildEssex = carrier(() => {
  const c = { ...US, plane: 0x2e3d52 };
  const g = mount(c, { w: 4, h: 2.6, d: 4.6, barrels: 2, len: 5, cal: 0.15 });
  const len = 267, beam = 28, fb = 9;
  const H = hull(len, beam, fb, 8, c, 1.4, { rails: false });
  return {
    fixed: flattop(c, H, { len, beam, fb, deck: 0x6a665a, islandZ: 10, number: '9', mark: WHITE }),
    mounts: [{ geo: g, at: [15, 17, 28], arc: 4 }, { geo: g, at: [15, 17, 52], arc: 4 }, { geo: g, at: [15, 17, -14], aft: true, arc: 4 }, { geo: g, at: [15, 17, -36], aft: true, arc: 4 }],
  };
});

export const buildShokaku = carrier(() => {
  const c = { ...IJN, plane: 0x3c4a34 };
  const g = mount(c, { w: 3.8, h: 2.4, d: 4.4, barrels: 2, len: 5, cal: 0.14 });
  const len = 257, beam = 26, fb = 8.5;
  const H = hull(len, beam, fb, 8.8, c, 1.4, { rails: false });
  return {
    fixed: merge([flattop(c, H, { len, beam, fb, deck: 0x8a6a4a, islandZ: 40, funnel: 'down', mark: 0xb02020, aaN: 3, aaCal: 0.05 }),
      ...[[-14, 70], [14, 60], [-14, -60], [14, -70]].map(([x, z]) => box(6, 0.6, 7, { x: x * 0.97, y: 9.7, z, color: c.upper }))]),
    mounts: [{ geo: g, at: [-14, 10, 70], arc: 4 }, { geo: g, at: [14, 10, 60], arc: 4 }, { geo: g, at: [-14, 10, -60], aft: true, arc: 4 }, { geo: g, at: [14, 10, -70], aft: true, arc: 4 }],
  };
});
