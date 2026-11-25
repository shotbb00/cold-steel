// The 1806 forts (units1806/forts.js): the Lanes mode's bunker line, strongpoint and headquarters and the coast's
// shore battery, one look per army, in the kit of models/lanesForts1918.js (fortRig rigs, models/coastForts45.js):
//   post      the musketry work (the bunker line's and the strongpoint's men): a flèche, two faces of earth meeting
//             in a point, its inside revetted — with fascines and gabions on the crest (French, Bavarian), planks and a
//             palisade in the ditch (Prussian, Saxon, Austrian), logs (Russian), sandbags (British), dressed stone
//             (Danish) — three men of the army behind it with their muskets
//   battery   a field gun behind an embrasure cut through a straight parapet, the cheeks revetted the same way, a plank
//             platform; `coast`: a 24-pounder on its garrison carriage, the furnace for heated shot, the army's flag
//   work      the strongpoint's gun: a closed redoubt (French, Bavarian, Russian, Austrian, Danish), a Prussian star
//             redoubt with the gun en barbette, or a Martello tower with a 24-pounder on its roof (British)
//   command   the headquarters: a fortified farm under the tricolour (Bavarian: blue-white shutters and lozenges), a
//             whitewashed Portuguese quinta behind sandbags (British), a star redoubt round a timber blockhouse
//             (Prussian, Saxon), a church with its onion dome behind a log-revetted bank (Russian), a two-storey
//             blockhouse in a palisade (Austrian), a round stone fort (Danish granite, Spanish sandstone, Dutch brick)
// Spain's works are stone-faced like Denmark's; Holland's are planked dune batteries in the sand.
import { P, merge, pair, grime, loft } from '../units/geometry.js';
import { fortRig } from './coastForts45.js';
import { wheel } from './napGuns.js';

const DARK = 0x141412, IRON = 0x2a2a28, BRONZE = 0x9a7a3a, POLE = 0x6a5a3e, SKIN = 0xd2a283, WHITE = 0xe8e4da, BLACK = 0x161616;
const PLANK = 0x8a7458, FASCINE = 0x6a5a36, WICKER = 0x7a6238, STAKE = 0x76624a, LOG = 0x6b553a, BRICK = 0x8a4a32, BREECHES = 0xe2ddcf;
const cache = {};
const once = (key, make) => (cache[key] ??= make());
const r01 = (i, k) => Math.abs((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1);

/** Each army's look: how its works are revetted, earth, gun paint, coats, flag, its headquarters and its strongpoint's gun. */
const EARTH = { earth: 0x7a6a4a, turf: 0x5e6a3a };
const STYLES = {
  nato: { ...EARTH, work: 'fascine', gabion: true, wood: 0x51613a, coat: 0x1d2a5c, hat: 'bicorne', flag: 'fr', hq: 'farm', big: 'redoubt', wall: 0xc8bca0, roof: 0x8a4a32, trim: 0x5a4a34 },
  by: { ...EARTH, work: 'fascine', gabion: true, wood: 0x4a5a6a, coat: 0x5c8fcc, hat: 'crest', flag: 'by', hq: 'farm', big: 'redoubt', wall: 0xe0dcd0, roof: 0x6a5a50, trim: 0x3a6ac0 },
  pact: { earth: 0x6a5a40, turf: 0x56603e, work: 'palisade', wood: 0x3e4a5a, coat: 0x1b2440, hat: 'bicorne', flag: 'pr', hq: 'star', big: 'star' },
  sx: { earth: 0x6a5a40, turf: 0x56603e, work: 'palisade', wood: 0x3e4a5a, coat: 0xe4e0d2, hat: 'bicorne', flag: 'sx', hq: 'star', big: 'star' },
  gb: { earth: 0xb09a70, turf: 0x8a8450, work: 'bag', wood: 0x5a6670, coat: 0xb0261e, hat: 'shako', flag: 'gb', hq: 'farm', big: 'martello', wall: 0xece6d8, roof: 0xa85a3a, trim: 0x2a5a32 },
  ru: { earth: 0x5a4c38, turf: 0x56603e, work: 'log', wood: 0x4e6a3c, coat: 0x1e3524, hat: 'shako', flag: 'ru', hq: 'church', big: 'redoubt' },
  au: { ...EARTH, work: 'palisade', wood: 0x9a7a3a, coat: 0xe6e2d6, hat: 'crest', flag: 'au', hq: 'blockhouse', big: 'redoubt' },
  dk: { earth: 0x6a6450, turf: 0x5e6a40, work: 'stone', stone: [0x9a9890, 0x8a8880, 0xaaa89e], wood: 0x7a2a22, coat: 0xb0261e, hat: 'bicorne', flag: 'dk', hq: 'fort', big: 'redoubt' },
  es: { earth: 0xa08a62, turf: 0x7a7a48, work: 'stone', stone: [0xc8b48a, 0xb8a478, 0xd4c098], wood: 0x6a5a3a, coat: 0xe6e2d6, hat: 'bicorne', flag: 'es', hq: 'fort', big: 'redoubt' },
  nl: { earth: 0xc8ab78, turf: 0x8a9058, work: 'palisade', wood: 0x4a5a3a, coat: 0x1d2a5c, hat: 'bicorne', flag: 'nl', hq: 'fort', big: 'redoubt', stone: [0x8a4a32, 0x7a4030, 0x9a5a3e] },
};

/** A long bank of earth across x (half below ground): `h` high, `d` deep. */
// (sloping away at its two ends: the earth's natural slope, not a cut loaf)
const bank = (w, h, d, { x = 0, y = 0, z = 0, color } = {}) => loft([[x - w / 2 - 0.7, y, z, d * 0.55, 0.04, 2], [x - w / 2 + 0.35, y, z, d, h, 2], [x + w / 2 - 0.35, y, z, d, h, 2], [x + w / 2 + 0.7, y, z, d * 0.55, 0.04, 2]], { color }, 10);
const log = (len, o) => P.cyl(0.16, 0.16, len, { rz: Math.PI / 2, color: LOG, ...o }, 6);
const moved = (parts, ry, x, z) => parts.map((g) => g.rotateY(ry).translate(x, 0, z));

/** The inside face of a work `w` wide and `h` high at z = 0: fascines, planks, sandbags, logs or dressed stone. */
function revetment(st, w, h) {
  const rows = Math.max(2, Math.round(h / 0.28));
  if (st.work === 'fascine') {
    return [...Array.from({ length: rows }, (_, i) => P.cyl(0.13, 0.13, w, { rz: Math.PI / 2, y: 0.13 + i * (h - 0.2) / (rows - 1), z: -0.05 * i, color: i % 2 ? FASCINE : 0x5e5030 }, 6)),
      ...Array.from({ length: Math.max(2, Math.round(w / 1.2)) + 1 }, (_, i) => P.box(0.06, h + 0.15, 0.06, { x: -w / 2 + (w * i) / Math.max(2, Math.round(w / 1.2)), y: h / 2, z: -0.16, color: STAKE }))]; // (the pickets holding them)
  }
  if (st.work === 'log') {
    return [...Array.from({ length: rows }, (_, i) => log(w, { y: 0.16 + i * 0.3, z: -0.04 * i })),
      ...pair((s) => P.cyl(0.17, 0.17, h + 0.3, { x: s * w * 0.48, y: (h + 0.3) / 2, z: -0.2, color: 0x5e4a32 }, 6))];
  }
  if (st.work === 'palisade') return [P.box(w, h, 0.1, { y: h / 2, z: -0.05, color: PLANK }), ...[0.25, 0.5, 0.75].map((t) => P.box(0.12, h + 0.1, 0.12, { x: -w / 2 + w * t, y: h / 2, z: -0.14, color: STAKE }))];
  const n = Math.max(2, Math.round(w / 0.85)), bw = w / n;
  return Array.from({ length: rows }, (_, row) => Array.from({ length: n }, (_, i) => st.work === 'stone'
    ? P.box(bw * 0.97, 0.27, 0.5, { x: -w / 2 + bw * (i + 0.5) + (row % 2 && i < n - 1 ? bw * 0.25 : 0), y: 0.14 + row * 0.28, z: 0, color: st.stone[(i + row) % 3] })
    : P.box(bw * 0.97, 0.27, 0.5, { x: -w / 2 + bw * (i + 0.5) + (row % 2 && i < n - 1 ? bw * 0.25 : 0), y: 0.14 + row * 0.28, z: 0, ry: (r01(i, row) - 0.5) * 0.12, color: (i + row) % 2 ? 0xa8966a : 0x9a8960 }))).flat();
}

/** A stretch of parapet `w` wide, `h` high: the bank (its inside face at z = 0, the enemy at +z), the revetment, the
 *  gabions or the palisade, the ditch. Stone: a masonry breastwork with an earth top. */
function parapet(st, w, h = 1.1, gabions = st.gabion) {
  const out = st.work === 'stone'
    ? [P.box(w, h, 1.6, { y: h / 2, z: 0.85, color: st.stone[1] }), P.box(w + 0.1, 0.18, 1.8, { y: h + 0.05, z: 0.85, color: st.stone[2] }), bank(w, h * 0.7, 2.2, { z: 2.0, color: st.turf })]
    : [bank(w, h * 1.15, 1.9, { z: 0.95, color: st.earth }), bank(w * 0.98, h * 0.3, 0.9, { y: h * 0.8, z: 1.1, color: st.turf })];
  out.push(...revetment(st, w, h));
  if (gabions) for (let x = -w / 2 + 0.45; x < w / 2 - 0.3; x += 0.85) out.push(P.cyl(0.32, 0.3, 0.7, { x, y: h + 0.3, z: 0.4, color: (x * 7) % 2 > 1 ? WICKER : 0x6e5834 }, 7));
  if (st.work === 'palisade') {
    for (let x = -w / 2 + 0.15; x < w / 2; x += 0.32) out.push(P.box(0.13, 1.7, 0.13, { x, y: 0.7, z: 3.35, rx: 0.4, ry: (r01(x * 10, 2) - 0.5) * 0.3, color: STAKE }));
    out.push(P.box(w, 0.1, 0.1, { y: 0.7, z: 3.25, color: 0x5e4c38 }));
  }
  out.push(P.box(w, 0.04, 1.3, { y: 0.02, z: st.work === 'stone' ? 3.4 : 2.8, color: 0x3e3426 }));   // the ditch
  return out;
}

// ---------------------------------------------------------------- men and guns (in the rig's gun group: +z the enemy)

/** A man of the army, standing (or with his musket levelled over the parapet). */
function man(st, x, z, musket = true) {
  const head = { x, y: 1.55, z };
  const hat = {
    bicorne: [P.box(0.42, 0.13, 0.12, { ...head, y: 1.68, color: BLACK })],
    crest: [P.sphere(0.13, { ...head, y: 1.62, sy: 0.8, color: BLACK }, 7, 4), P.box(0.06, 0.12, 0.3, { ...head, y: 1.72, color: BLACK })], // the Raupenhelm / the Austrian helmet
    shako: [P.cyl(0.11, 0.11, 0.24, { ...head, y: 1.74, color: BLACK }, 7), P.box(0.2, 0.02, 0.1, { ...head, y: 1.63, z: z + 0.12, color: BLACK })],
  }[st.hat];
  return [
    P.box(0.3, 0.8, 0.18, { x, y: 0.4, z, color: BREECHES }),
    P.box(0.38, 0.62, 0.24, { x, y: 1.1, z, color: st.coat }),
    P.box(0.06, 0.6, 0.02, { x: x - 0.06, y: 1.12, z: z + 0.125, rz: 0.5, color: WHITE }),                 // the crossbelt
    P.sphere(0.11, { ...head, color: SKIN }, 6, 4),
    ...hat,
    ...(musket ? [P.box(0.04, 0.05, 1.45, { x: x + 0.14, y: 1.3, z: z + 0.42, color: 0x4e3826 }), P.box(0.1, 0.1, 0.3, { x: x + 0.14, y: 1.22, z: z + 0.15, color: st.coat })] : []),
  ];
}

/** The army's field gun (`coast`: an iron 24-pounder on a garrison carriage), the axle at z = 0, the muzzle at z = L - 0.3. */
function gun(st, coast = false) {
  if (coast) {
    const L = 3.0;
    return { L, y: 0.85, parts: [
      P.box(0.9, 0.5, 1.8, { y: 0.4, z: -0.1, color: 0x5a4a34 }),
      ...[-1, 1].flatMap((s) => [-0.6, 0.5].map((z) => P.cyl(0.22, 0.22, 0.12, { x: s * 0.5, y: 0.22, z, rz: Math.PI / 2, color: 0x4a3a2a }, 10))),
      P.cyl(0.17, 0.27, L, { y: 0.85, z: L / 2 - 0.3, rx: Math.PI / 2, color: IRON }, 12),
      P.sphere(0.16, { y: 0.85, z: -0.4, color: IRON }, 8, 6),
      ...man(st, -0.9, -0.9, false), ...man(st, 0.9, -1.2, false),
    ] };
  }
  const L = 1.9, R = 0.66, y = R + 0.18, wood = st.wood;
  return { L, y, parts: [
    ...wheel(0.62, R, wood), ...wheel(-0.62, R, wood),
    P.cyl(0.05, 0.05, 1.3, { y: R, rz: Math.PI / 2, color: IRON }),
    ...pair((s) => P.box(0.08, 0.28, 1.9, { x: s * 0.2, y: R - 0.05, z: -0.6, rx: -0.26, color: wood })),     // the cheeks, down to the trail
    P.box(0.34, 0.12, 0.5, { y: 0.14, z: -1.4, color: wood }),
    P.cyl(0.13, 0.17, L, { y, z: L / 2 - 0.3, rx: Math.PI / 2, color: BRONZE }, 10),                           // the bronze barrel
    P.cyl(0.16, 0.16, 0.12, { y, z: L - 0.36, rx: Math.PI / 2, color: BRONZE }, 10),
    P.sphere(0.11, { y, z: -0.38, color: BRONZE }, 6, 4),
    ...man(st, -0.95, -0.7, false), ...man(st, 0.95, -1.0, false),
    P.cyl(0.03, 0.03, 2.4, { x: 1.15, y: 1.0, z: -0.6, rx: 1.2, color: 0x5a4028 }, 5),                           // the rammer
  ] };
}

// ---------------------------------------------------------------- flags (the x-y plane, the hoist at x = 0)

function flag(kind, x, y, z) {
  const w = 1.7, h = 1.1, at = (o) => ({ ...o, x: x + w / 2 + (o.x ?? 0), y: y + (o.y ?? 0), z });
  const bands = (cs, vertical) => cs.map((c, i) => (vertical
    ? P.box(w / cs.length, h, 0.03, at({ x: -w / 2 + (w / cs.length) * (i + 0.5), color: c }))
    : P.box(w, h / cs.length, 0.03, at({ y: h / 2 - (h / cs.length) * (i + 0.5), color: c }))));
  const saltire = (c, t) => pair((s) => P.box(Math.hypot(w, h), t, 0.04, at({ rz: s * Math.atan2(h, w), color: c })));
  switch (kind) {
    case 'fr': return bands([0x22325c, WHITE, 0xc8202a], true);
    case 'by': return Array.from({ length: 15 }, (_, i) => P.box(w / 5, h / 3, 0.03, at({ x: -w / 2 + (w / 5) * ((i % 5) + 0.5), y: h / 2 - (h / 3) * (Math.floor(i / 5) + 0.5), color: (i % 5 + Math.floor(i / 5)) % 2 ? WHITE : 0x3a7ac8 }))); // the lozenges
    case 'pr': return [P.box(w, h, 0.03, at({ color: WHITE })), P.box(0.22, 0.45, 0.05, at({ color: BLACK })), ...pair((s) => P.box(0.45, 0.16, 0.05, at({ x: s * 0.25, y: 0.1, rz: s * 0.45, color: BLACK }))), P.sphere(0.08, at({ y: 0.3, color: BLACK }), 6, 4)]; // the black eagle
    case 'sx': return bands([WHITE, 0x2a7a3a]);
    case 'au': return bands([BLACK, 0xd8b830]);
    case 'ru': return [P.box(w, h, 0.03, at({ color: WHITE })), ...saltire(0x22489a, 0.2)];                 // St Andrew's cross
    case 'es': return bands([0xc8202a, 0xe0b020, 0xe0b020, 0xc8202a]);
    case 'nl': return bands([0xc8202a, WHITE, 0x22325c]);
    case 'dk': return [P.box(w, h, 0.03, at({ color: 0xc8102e })), P.box(0.2, h, 0.05, at({ x: -w * 0.18, color: WHITE })), P.box(w, 0.2, 0.05, at({ color: WHITE }))];
    default: return [P.box(w, h, 0.03, at({ color: 0x1f3a7a })), ...saltire(WHITE, 0.26), ...saltire(0xc8202a, 0.08), // the Union Flag
      P.box(w, 0.34, 0.05, at({ color: WHITE })), P.box(0.34, h, 0.05, at({ color: WHITE })), P.box(w, 0.2, 0.055, at({ color: 0xc8202a })), P.box(0.2, h, 0.055, at({ color: 0xc8202a }))];
  }
}
const pole = (st, x, z, hgt) => [P.cyl(0.05, 0.06, hgt, { x, y: hgt / 2, z, color: POLE }, 5), ...flag(st.flag, x, hgt - 0.7, z)];

/** A hip roof `w` × `d` with its eaves at y, `h` high. */
const roof = (w, d, y, h, color, o = {}) => P.cone(1, h, { color }, 4).rotateY(Math.PI / 4).scale(w / 1.41, 1, d / 1.41).rotateY(o.ry ?? 0).translate(o.x ?? 0, y + h / 2, o.z ?? 0);

// ---------------------------------------------------------------- the works

/** The musketry work: a flèche (British: a curve of sandbags; Danish: a straight stone breastwork), three men behind. */
function postGeo(army) {
  const st = STYLES[army];
  return once(`p06-${army}`, () => {
    const parts = st.work === 'stone' ? parapet(st, 6.5, 1.1, false).map((g) => g.translate(0, 0, 0.6))
      : st.work === 'bag' ? Array.from({ length: 9 }, (_, i) => (i - 4) * 0.26).flatMap((a) => moved(revetment(st, 1.25, 1.1), a, Math.sin(a) * 4, Math.cos(a) * 4 - 3.0))
        : pair((s) => moved(parapet(st, 4.6, 1.1, false), s * 0.45, s * 2.0, 0.45)).flat();
    if (st.work === 'bag') parts.push(P.sphere(4.6, { sy: 0.18, sz: 0.5, y: 0, z: 1.4, color: st.earth }, 12, 5));
    parts.push(P.box(5.5, 0.05, 2.4, { y: 0.02, z: -0.8, color: 0x4a3e2c }), P.box(0.6, 0.4, 0.4, { x: 2.2, y: 0.2, z: -1.4, color: 0x5a4a34 })); // the trodden ground, a cartridge chest
    return { base: grime(merge(parts), 1.0, 0.1, 0.5), gun: merge([-0.9, 0, 0.9].flatMap((x, i) => man(st, x, -0.1 - (i % 2) * 0.15))) };
  });
}

/** A gun behind its embrasure (`coast`: the 24-pounder, the furnace, the flag), `k` its size; `closed`: the flanks
 *  run back into a redoubt. */
function batteryGeo(army, k, coast = false, closed = false) {
  const st = STYLES[army];
  return once(`b06-${army}-${k}-${coast}-${closed}`, () => {
    const g = 1.5 * k, side = 2.7 * k, h = (coast ? 1.3 : 1.15) * Math.min(1.15, k);
    const parts = [
      ...pair((s) => parapet(st, side, h).map((p) => p.translate(s * (g / 2 + side / 2), 0, 0))).flat(),
      st.work === 'stone' ? P.box(g, 0.55, 1.6, { y: 0.27, z: 0.85, color: st.stone[0] }) : bank(g, 0.6, 1.9, { z: 0.95, color: st.earth }),  // the sole of the embrasure
      ...pair((s) => moved(st.gabion ? [0, 0.8, 1.6].map((x) => P.cyl(0.32, 0.3, h, { x: x - 0.8, y: h / 2, color: WICKER }, 7)) : revetment(st, 2.0, h), Math.PI / 2, s * (g / 2 + 0.1), 0.9)).flat(), // the cheeks
      P.box(g + 2.4, 0.08, 3.4, { y: 0.04, z: -1.7, color: PLANK }),                                                            // the platform
      ...[[0, 0], [0.3, 0], [0.15, 0.26], [0.15, 0.09]].map(([x, z], i) => P.sphere(0.12, { x: -side + x, y: 0.12 + (i === 3 ? 0.2 : 0), z: -1.5 + z, color: IRON }, 6, 4)), // the shot
      P.cyl(0.25, 0.25, 0.55, { x: side - 0.4, y: 0.28, z: -2.0, color: 0x5a4028 }, 8),                                         // a powder barrel
    ];
    if (closed) parts.push(...pair((s) => moved(parapet(st, 4.6 * k, h), s * Math.PI / 2, s * (g / 2 + side), -2.3 * k)).flat());
    if (coast) parts.push(P.box(1.5, 1.3, 1.5, { x: side + 1.4, y: 0.65, z: -2.2, color: BRICK }), P.cyl(0.18, 0.22, 1.1, { x: side + 1.4, y: 1.8, z: -2.5, color: 0x5a3a2a }, 6),
      P.box(0.55, 0.45, 0.05, { x: side + 1.4, y: 0.5, z: -1.44, color: 0xff7a2a }), ...pole(st, -side - 0.6, -2.6, 7));
    const gn = gun(st, coast);
    return { base: grime(merge(parts), 1.2, 0.1, 0.4), gun: merge(gn.parts) };
  });
}

/** A star redoubt `R` across: six salients of earth, a palisade in the ditch, (`blockhouse`: a timber blockhouse inside). */
function starParts(st, R) {
  const out = [], r = R * 0.68;
  for (let i = 0; i < 12; i++) {
    const a0 = (i * Math.PI) / 6, a1 = ((i + 1) * Math.PI) / 6;
    const [ra, rb] = i % 2 ? [r, R] : [R, r];
    const ax = Math.sin(a0) * ra, az = Math.cos(a0) * ra, bx = Math.sin(a1) * rb, bz = Math.cos(a1) * rb;
    const len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(-(bz - az), bx - ax);   // (the face's line; its outside away from the centre)
    const p = parapet(st, len + 0.3, 1.1, false).map((g) => g.translate(0, 0, -0.3));
    out.push(...moved(p, yaw, (ax + bx) / 2, (az + bz) / 2));
  }
  return out;
}

/** The strongpoint's gun: a closed redoubt, a star redoubt (the gun en barbette), or a Martello tower. */
function workGeo(army) {
  const st = STYLES[army];
  if (st.big !== 'star') return batteryGeo(army, 1.3, false, true);
  return once(`s06-${army}`, () => {
    const gn = gun(st);
    return { base: grime(merge([...starParts(st, 6.2), P.cyl(1.9, 2.1, 0.7, { y: 0.35, color: st.earth }, 10), P.box(1.2, 0.5, 2.6, { y: 0.2, z: -2.8, rx: 0.2, color: st.earth })]), 1.2, 0.1, 0.4), // (the barbette, the ramp up to it)
      gun: merge(gn.parts) };
  });
}

/** A Martello tower: thick round walls tapering up, the door high up with its ladder, a 24-pounder on its roof. */
function martelloGeo(army) {
  const st = STYLES[army];
  return once(`m06-${army}`, () => {
    const STONE = 0xc8bca0, H = 6;
    const gn = gun(st, true);
    return {
      base: grime(merge([
        P.cyl(2.7, 3.3, H, { y: H / 2, color: STONE }, 16),
        P.cyl(2.85, 2.85, 0.18, { y: H - 0.6, color: 0xb4a88e }, 16),                                    // the string course
        P.torus(2.62, 0.3, { rx: Math.PI / 2, y: H + 0.15, sy: 1.2, color: 0xbab094 }, 16),              // the parapet round the roof
        P.box(0.9, 1.5, 0.15, { y: 3.4, z: -3.0, rx: -0.1, color: 0x2a2620 }),                           // the door, a floor up
        ...pair((s) => P.box(0.06, 3.0, 0.06, { x: s * 0.3, y: 1.5, z: -3.4, rx: -0.15, color: POLE })), ...[0.5, 1.1, 1.7, 2.3].map((y) => P.box(0.6, 0.05, 0.05, { y, z: -3.45 + y * 0.06, color: POLE })), // the ladder
        ...[0.8, 2.4, 3.9].map((a) => P.box(0.15, 0.6, 0.1, { x: Math.sin(a) * 2.95, y: 3.6, z: Math.cos(a) * 2.95, ry: a, color: DARK })), // the windows
        P.cyl(3.6, 3.9, 0.4, { y: 0.1, color: st.earth }, 14),
        ...pole(st, -2.1, -1.9, H + 4.2),
      ]), 1.2, 0.1, 0.4),
      gun: merge([...gn.parts, P.box(1.2, 0.12, 3.6, { y: 0.06, z: 0.3, color: PLANK })]),  // (on its traversing slide)
    };
  });
}

/** The headquarters. */
function commandGeo(army) {
  const st = STYLES[army];
  return once(`c06-${army}`, () => {
    let parts;
    if (st.hq === 'farm') { // the fortified farm: the house, the yard wall loopholed in front, the gate barricaded
      const win = (x, y, z) => [P.box(0.6, 0.8, 0.06, { x, y, z, color: DARK }), ...pair((s) => P.box(0.28, 0.8, 0.05, { x: x + s * 0.45, y, z: z + 0.01, color: st.trim }))];
      parts = [
        P.box(8, 3.4, 5.2, { y: 1.7, z: -1.2, color: st.wall }), roof(8.6, 5.8, 3.4, 1.9, st.roof, { z: -1.2 }),
        P.box(0.6, 1.4, 0.6, { x: 2.6, y: 5.1, z: -1.6, color: st.wall }),
        ...[-2.6, 0, 2.6].flatMap((x) => win(x, 2.5, 1.42)), ...[-2.6, 2.6].flatMap((x) => win(x, 1.0, 1.42)), P.box(1.2, 2.0, 0.06, { y: 1.0, z: 1.42, color: 0x3a2e22 }),
        ...pair((s) => P.box(4.8, 1.9, 0.5, { x: s * 3.6, y: 0.95, z: 4.6, color: st.wall })),
        ...pair((s) => P.box(0.5, 1.9, 5.6, { x: s * 6.0, y: 0.95, z: 2.0, color: st.wall })),
        ...[-5, -4, -3, -2, 2, 3, 4, 5].map((x) => P.box(0.25, 0.14, 0.06, { x, y: 1.4, z: 4.86, color: DARK })), // the loopholes
        P.box(2.2, 1.0, 0.8, { y: 0.5, z: 4.8, ry: 0.15, color: 0x5a4a34 }), P.cyl(0.55, 0.55, 0.15, { x: 0.8, y: 0.55, z: 5.3, rx: 0.2, rz: Math.PI / 2, color: 0x4a3a2a }, 10), // the cart across the gate
        ...(st.work === 'bag' ? revetment(st, 8, 0.85).map((g) => g.translate(0, 0, 6.2)) : Array.from({ length: 8 }, (_, i) => P.cyl(0.32, 0.3, 0.75, { x: -3.2 + i * 0.9, y: 0.37, z: 6.0, color: WICKER }, 7))),
        ...pole(st, -3.2, -1.2, 9.5),
      ];
    } else if (st.hq === 'star') { // the star redoubt round a timber blockhouse
      parts = [
        ...starParts(st, 8.4),
        ...[0, 1, 2, 3, 4, 5, 6].map((i) => P.box(4.4, 0.34, 4.4, { y: 0.17 + i * 0.34, color: i % 2 ? LOG : 0x5e4a32 })),
        roof(5.0, 5.0, 2.4, 1.3, 0x5a4a3a), P.box(1.0, 1.7, 0.06, { y: 0.85, z: -2.22, color: 0x2a2620 }),
        ...[-1.2, 0, 1.2].flatMap((x) => [P.box(0.3, 0.12, 0.06, { x, y: 1.6, z: 2.22, color: DARK }), P.box(0.06, 0.12, 0.3, { x: 2.22, y: 1.6, z: x, color: DARK }), P.box(0.06, 0.12, 0.3, { x: -2.22, y: 1.6, z: x, color: DARK })]),
        ...pole(st, 0, 0, 8.5),
      ];
    } else if (st.hq === 'church') { // a whitewashed church with its onion dome, a log-revetted bank in front
      const W = 0xe8e4d8, GREEN = 0x4e7a52, GOLD = 0xc8a040;
      parts = [
        P.box(5, 4.2, 8, { y: 2.1, z: -2, color: W }), roof(5.4, 8.4, 4.2, 1.6, GREEN, { z: -2 }),
        P.cyl(2.2, 2.2, 3.6, { y: 1.8, z: -6, color: W }, 10), P.sphere(2.25, { y: 3.6, z: -6, sy: 0.5, color: GREEN }, 10, 5),       // the apse
        P.box(3, 7.5, 3, { y: 3.75, z: 3.2, color: W }), P.cyl(1.0, 1.0, 1.2, { y: 8.1, z: 3.2, color: W }, 10),                     // the bell tower
        P.sphere(1.25, { y: 9.3, z: 3.2, sy: 1.1, color: GREEN }, 10, 7), P.cone(0.45, 1.4, { y: 10.9, z: 3.2, color: GREEN }, 8),     // the onion dome
        P.box(0.07, 1.1, 0.07, { y: 12.1, z: 3.2, color: GOLD }), P.box(0.6, 0.07, 0.07, { y: 12.3, z: 3.2, color: GOLD }), P.box(0.4, 0.07, 0.07, { y: 11.85, z: 3.2, rz: 0.3, color: GOLD }),
        P.sphere(0.9, { y: 5.9, z: -2, sy: 1.1, color: GOLD }, 8, 5), P.cyl(0.35, 0.35, 0.8, { y: 5.6, z: -2, color: W }, 8),          // the small dome over the nave
        ...[-1, 0, 1].map((x) => P.box(0.5, 1.2, 0.06, { x: 2.53, y: 2.6, z: x * 2.2 - 2, color: DARK })), P.box(1.3, 2.4, 0.08, { y: 1.2, z: 4.72, color: 0x3a2e22 }),
        ...[-0.6, 0, 0.6].flatMap((a) => moved(parapet(st, 5.4, 1.1), a, Math.sin(a) * 9.5, Math.cos(a) * 9.5 - 2.0)),
        ...pole(st, -3.6, 1.5, 8),
      ];
    } else if (st.hq === 'blockhouse') { // the two-storey blockhouse, the upper one turned and overhanging, in a palisade
      const fence = (w) => Array.from({ length: Math.round(w / 0.32) }, (_, i) => P.box(0.13, 2.2, 0.13, { x: -w / 2 + i * 0.32, y: 1.0, color: STAKE }));
      parts = [
        ...[0, 1, 2, 3, 4, 5].map((i) => P.box(5, 0.4, 5, { y: 0.2 + i * 0.4, color: i % 2 ? LOG : 0x5e4a32 })),
        ...[0, 1, 2, 3, 4].map((i) => P.box(5.4, 0.4, 5.4, { y: 2.6 + i * 0.4, ry: Math.PI / 4, color: i % 2 ? 0x5e4a32 : LOG })),
        roof(5.6, 5.6, 4.6, 1.8, 0x5a4a3a, { ry: Math.PI / 4 }),
        ...[0, 1, 2, 3].map((i) => (i * Math.PI) / 2 + Math.PI / 4).map((a) => P.box(0.4, 0.14, 0.06, { x: Math.sin(a) * 2.73, y: 3.6, z: Math.cos(a) * 2.73, ry: a, color: DARK })),
        P.box(1.0, 1.8, 0.06, { y: 0.9, z: -2.53, color: 0x2a2620 }),
        ...[0, 1, 2, 3].flatMap((i) => moved(fence(i === 2 ? 5 : 13), (i * Math.PI) / 2, Math.sin(i * Math.PI / 2) * 6.5, Math.cos(i * Math.PI / 2) * 6.5)),
        ...pole(st, 0, 0, 9),
      ];
    } else { // the Danish round stone fort: a low drum of granite, embrasures in its parapet, the flag in the middle
      parts = [
        P.cyl(5.6, 6.0, 3.0, { y: 1.5, color: st.stone[1] }, 18), P.cyl(5.7, 5.7, 0.2, { y: 3.0, color: st.stone[2] }, 18),
        ...Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2).map((a, i) => P.box(2.4, 0.9, 0.7, { x: Math.sin(a) * 5.3, y: 3.5, z: Math.cos(a) * 5.3, ry: a, color: st.stone[i % 3] })),
        P.cyl(5.0, 5.0, 0.1, { y: 3.05, color: st.turf }, 16), P.box(3, 2, 2.5, { y: 4.0, z: -1, color: 0xb0a890 }), roof(3.4, 2.9, 5.0, 1.0, BRICK, { z: -1 }),   // the guardhouse on top
        P.box(1.4, 2.0, 0.1, { y: 1.0, z: -5.95, color: 0x2a2620 }),
        ...[1, 2, 4, 5].map((i) => (i / 6) * Math.PI * 2).map((a) => P.box(0.5, 0.2, 0.1, { x: Math.sin(a) * 5.85, y: 1.8, z: Math.cos(a) * 5.85, ry: a, color: DARK })),
        ...pole(st, 1.6, 1.6, 10),
      ];
    }
    return { base: grime(merge(parts), 1.5, 0.2, 0.4), gun: null };
  });
}

const POST_RIG = { at: [0, 0, -0.2], tip: [0, 1.3, 1.1], arc: 0.7, recoil: 0, pitch: false };
/** The gun's rig: behind its embrasure (the muzzle just in it), or raised (`y`: the barbette, the tower's roof) and all round. */
const gunRig = (coast, y = 0) => {
  const L = coast ? 3.0 : 1.9;
  return { at: [0, y, y ? 0 : 0.55 - L + (coast ? 0.2 : 0)], tip: [0, coast ? 0.85 : 0.84, L - 0.25], arc: y ? Infinity : 0.6, recoil: 0.35, pitch: false };
};

/** An army's 1806 forts (rigs): the musketry work, the battery (and a bigger one), the strongpoint's gun, the headquarters, the shore battery. */
export function forts1806(army) {
  const st = STYLES[army];
  const tower = () => fortRig(() => martelloGeo(army), gunRig(true, 6));
  const battery = (k, coast = false) => fortRig(() => batteryGeo(army, k, coast), gunRig(coast));
  return {
    post: fortRig(() => postGeo(army), POST_RIG),
    battery: battery(1),
    bigBattery: battery(1.25),
    work: st.big === 'martello' ? tower() : fortRig(() => workGeo(army), gunRig(false, st.big === 'star' ? 0.7 : 0)),
    command: fortRig(() => commandGeo(army), { tip: [0, 3, 4], arc: 0, pitch: false, recoil: 0 }),
    shore: st.big === 'martello' ? tower() : battery(1.2, true),
  };
}
