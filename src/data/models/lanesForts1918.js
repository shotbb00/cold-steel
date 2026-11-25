// The Lanes mode's 1918 fortifications (units1918/roles.js lanesForts1918), one look per army, in the kit of
// models/lanesForts45.js (fortRig rigs, models/coastForts45.js):
//   nest      the bunker line's MG post: a ring of sandbags (British, ANZAC, French), of stacked stone (Ottoman,
//             Italian, k.u.k. on the Karst), of logs in an earth parapet (Russian), or a German concrete MG post
//             (a "Mebu"), each with its army's machine gun — Vickers, Hotchkiss, MG 08, Schwarzlose, Maxim, Fiat-Revelli
//   dugout    the MG or field gun behind a firing slit: a mound over a timber, rail or corrugated-iron roof, or a
//             concrete casemate (German); the field gun is the army's own (18-pdr, 75, 7.7 cm, 8 cm, 7.5 cm Krupp, 3-inch, 75/27)
//   command   each army's headquarters: dugouts with a timber entrance under a telephone pole and the flag —
//             a British/ANZAC dugout with elephant iron, a French abri beside an Adrian hut, a German concrete
//             Stollen entrance, a k.u.k. cavern portal in the rock, an Ottoman stone redoubt house, a Russian
//             zemlyanka, an Italian stone and sandbag shelter on the Carso
// A few pickets of barbed wire run in front of every nest and dugout.
import { P, merge, pair, grime } from '../units/geometry.js';
import { fortRig } from './coastForts45.js';

const DARK = 0x141412, STEEL = 0x34362f, DOOR = 0x2a2620, POLE = 0x6a5a3e, IRON = 0x7e7a6e, WIRE = 0x3a3832;
const cache = {};
const once = (key, make) => (cache[key] ??= make());
const r01 = (i, k) => Math.abs((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1);

/** Each army's look: earth, wall, roof (timber, iron or concrete), MG, field gun, helmet, flag. */
const STYLES = {
  uk: { ground: 0x5e5340, cover: 0x5a5a40, wall: 'bag', bag: 0xa8966a, bag2: 0x9a8960, log: 0x6a5638, roof: 'iron', mg: 'vickers', gun: 'g18', paint: 0x5c5638, helmet: 0x55523a, hat: 'brodie', flag: 'uk' },
  anzac: { ground: 0xb8a070, cover: 0xb09868, wall: 'bag', bag: 0xc8b48a, bag2: 0xb8a47a, log: 0x7a6a50, roof: 'iron', mg: 'vickers', gun: 'g18', paint: 0x8a7a50, helmet: 0x8a7a50, hat: 'slouch', flag: 'au' },
  fr: { ground: 0x8a8070, cover: 0x6a6a4a, wall: 'bag', bag: 0xb0a07a, bag2: 0xa09070, log: 0x6a5a40, roof: 'log', mg: 'hotchkiss', gun: 'g75', paint: 0x6a7a8a, helmet: 0x6a7a8a, hat: 'adrian', flag: 'fr' },
  de: { ground: 0x5a4c38, cover: 0x56603e, wall: 'concrete', concrete: 0xa5a294, bag: 0xa09070, bag2: 0x908060, log: 0x5a4630, roof: 'concrete', mg: 'mg08', gun: 'g77', paint: 0x6a6a5a, helmet: 0x5a5c50, hat: 'stahl', flag: 'de' },
  ah: { ground: 0x8a8678, cover: 0x7a7a68, wall: 'stone', stone: [0xb8b4a8, 0xa4a094, 0xc8c4b8], bag: 0xa09a80, bag2: 0x908a70, log: 0x5a4a34, roof: 'log', mg: 'schwarzlose', gun: 'g8', paint: 0x6e7468, helmet: 0x5e6458, hat: 'stahl', flag: 'ah' },
  ot: { ground: 0xc0a878, cover: 0xb89f70, wall: 'stone', stone: [0xc8b48a, 0xb4a078, 0xd4c098], bag: 0xc4b088, bag2: 0xb4a078, log: 0x7a6448, roof: 'log', mg: 'mg08', gun: 'g75k', paint: 0x8c7f58, helmet: 0x8c7f58, hat: 'kabalak', flag: 'ot' },
  ru: { ground: 0x5a4c38, cover: 0x56603e, wall: 'log', bag: 0x9a8a62, bag2: 0x8c7c56, log: 0x6b553a, roof: 'log', mg: 'maxim', gun: 'g3in', paint: 0x5c6444, helmet: 0x5c6444, hat: 'cap', flag: 'ru', berm: true },
  it: { ground: 0x9a9484, cover: 0x8a8670, wall: 'stone', stone: [0xc4c0b2, 0xb0ac9e, 0xd2cec0], bag: 0xa8a080, bag2: 0x989070, log: 0x5e4c36, roof: 'iron', mg: 'fiat', gun: 'g7527', paint: 0x6a6e58, helmet: 0x5e624e, hat: 'adrian', flag: 'it' },
};

const log = (len, c, o = {}) => P.cyl(0.17, 0.17, len, { rz: Math.PI / 2, color: c, ...o }, 7);

/** A course of sandbags or stones across `w` at y, z. */
function course(st, w, y, z, row, kind = st.wall) {
  const n = Math.max(2, Math.round(w / 0.85)), bw = w / n;
  return Array.from({ length: n }, (_, i) => {
    const x = -w / 2 + bw * (i + 0.5) + (row % 2 && i < n - 1 ? bw * 0.25 : 0);
    return kind === 'stone'
      ? P.box(bw * (0.85 + r01(i, row) * 0.2), 0.3 + r01(i, row + 3) * 0.08, 0.5, { x, y, z, ry: (r01(i, row + 5) - 0.5) * 0.15, color: st.stone[(i + row) % 3] })
      : P.box(bw * 0.98, 0.3, 0.5, { x, y, z, color: row % 2 ? st.bag2 : st.bag });
  });
}

/** Barbed wire: `n` iron pickets in a line `w` wide at z, the strands between them. */
function wire(w, z, n = 5) {
  const posts = Array.from({ length: n }, (_, i) => P.box(0.05, 1.0, 0.05, { x: -w / 2 + (w * i) / (n - 1), y: 0.5, z: z + (i % 2) * 0.35, rz: (r01(i, 9) - 0.5) * 0.2, color: WIRE }));
  const strands = [0.3, 0.6, 0.9].flatMap((y) => [P.box(w, 0.02, 0.02, { y, z: z + 0.17, ry: 0.012, color: WIRE }), P.box(w * 0.98, 0.02, 0.02, { y: y - 0.12, z: z + 0.2, ry: -0.02, rz: 0.01, color: WIRE })]);
  return [...posts, ...strands];
}

/** The face of a dugout `w` wide at z = f, a slit `slit` wide at height sy: logs, sandbags or stone. */
function face(st, w, f, k, slit, sy) {
  const side = (w - slit) / 2;
  if (st.wall === 'log') {
    return [0.18, 0.5, sy + 0.38, sy + 0.7].map((y) => log(w, st.log, { y: y * (y < sy ? k : 1), z: f, sx: k }))
      .concat(pair((s) => log(side, st.log, { x: s * (slit / 2 + side / 2), y: sy, z: f })))
      .concat(pair((s) => P.cyl(0.18, 0.18, sy + 0.9, { x: s * w * 0.5, y: (sy + 0.9) / 2, z: f, color: st.log }, 7)));
  }
  const rows = [0.15, 0.45].map((y, i) => course(st, w, y * k, f, i)).flat();
  const mid = pair((s) => course(st, side, sy, f, 2).map((g) => g.translate(s * (slit / 2 + side / 2), 0, 0))).flat();
  const top = [sy + 0.32, sy + 0.62].map((y, i) => course(st, w, y, f, 3 + i)).flat();
  const posts = st.wall === 'bag' ? pair((s) => P.box(0.2, sy + 0.9, 0.2, { x: s * (w * 0.5 + 0.05), y: (sy + 0.9) / 2, z: f, color: st.log })) : [];
  return [...rows, ...mid, ...top, ...posts];
}

/** The gunner, kneeling behind his gun at z = -0.75: his army's helmet or hat. */
function gunner(st, z = -0.75) {
  const out = [P.box(0.5, 0.42, 0.3, { y: -0.2, z, color: st.paint })];
  const hz = { y: 0.12, z };
  if (st.hat === 'brodie') out.push(P.sphere(0.16, { ...hz, sy: 0.55, color: st.helmet }, 8, 4), P.cyl(0.26, 0.26, 0.03, { ...hz, y: 0.1, color: st.helmet }, 10));
  else if (st.hat === 'slouch') out.push(P.cyl(0.12, 0.14, 0.16, { ...hz, y: 0.18, color: st.helmet }, 8), P.cyl(0.3, 0.3, 0.025, { ...hz, y: 0.12, color: st.helmet }, 10));
  else if (st.hat === 'adrian') out.push(P.sphere(0.16, { ...hz, sy: 0.65, color: st.helmet }, 8, 4), P.box(0.03, 0.06, 0.26, { ...hz, y: 0.24, color: st.helmet }), P.cyl(0.21, 0.21, 0.02, { ...hz, y: 0.08, color: st.helmet }, 10));
  else if (st.hat === 'stahl') out.push(P.sphere(0.18, { ...hz, sy: 0.8, color: st.helmet }, 8, 4), P.cyl(0.19, 0.2, 0.08, { ...hz, y: 0.04, color: st.helmet }, 10));
  else if (st.hat === 'kabalak') out.push(P.cyl(0.13, 0.15, 0.2, { ...hz, y: 0.2, color: st.helmet }, 8), P.sphere(0.13, { ...hz, y: 0.3, sy: 0.5, color: st.helmet }, 8, 4));
  else out.push(P.cyl(0.15, 0.14, 0.12, { ...hz, y: 0.18, color: st.helmet }, 8), P.box(0.18, 0.02, 0.1, { ...hz, y: 0.13, z: z + 0.15, color: 0x2a2a24 })); // the peaked cap
  return out;
}

/** The army's MG and gunner, the muzzle at z ≈ 0.75. */
function mgParts(st) {
  const jacket = (r, len, c = 0x4a5040) => P.cyl(r, r, len, { z: len / 2 + 0.05, rx: Math.PI / 2, color: c }, 10);
  const tripod = [[-0.3, 0.1], [0.3, 0.1], [0, -0.45]].map(([x, z]) => P.cyl(0.02, 0.02, 0.6, { x, y: -0.3, z, rz: -x * 0.6, rx: z * 0.6, color: STEEL }, 4));
  const gun = {
    vickers: [P.box(0.16, 0.2, 0.45, { z: -0.15, color: 0x3a3c32 }), jacket(0.07, 0.55, 0x5a5a48), P.cyl(0.02, 0.03, 0.15, { z: 0.68, rx: Math.PI / 2, color: STEEL }, 6), ...tripod],
    hotchkiss: [P.box(0.12, 0.16, 0.5, { z: -0.12, color: 0x3a3c32 }), P.cyl(0.035, 0.035, 0.6, { z: 0.35, rx: Math.PI / 2, color: STEEL }, 6), ...[0.1, 0.2, 0.3].map((z) => P.cyl(0.06, 0.06, 0.03, { z, rx: Math.PI / 2, color: 0x9a7a3a }, 8)), P.box(0.2, 0.02, 0.3, { x: 0.15, y: 0.02, color: 0x8a7a40 }), ...tripod], // the brass cooling rings, the strip from the side
    mg08: [P.box(0.18, 0.2, 0.45, { z: -0.15, color: STEEL }), jacket(0.075, 0.55), P.cyl(0.02, 0.02, 0.15, { z: 0.68, rx: Math.PI / 2, color: STEEL }, 5), P.box(0.6, 0.06, 0.9, { y: -0.35, z: -0.1, color: 0x3a3a30 })], // on its sled
    schwarzlose: [P.box(0.18, 0.2, 0.4, { z: -0.15, color: STEEL }), jacket(0.08, 0.35), P.cyl(0.025, 0.07, 0.22, { z: 0.52, rx: Math.PI / 2, color: STEEL }, 8), ...tripod],
    maxim: [P.box(0.18, 0.2, 0.4, { z: -0.1, color: STEEL }), jacket(0.075, 0.55), P.box(0.55, 0.45, 0.03, { y: 0.05, z: 0.12, color: 0x4e5a36 }),
      ...pair((s) => P.cyl(0.17, 0.17, 0.05, { x: s * 0.24, y: -0.3, z: -0.05, rz: Math.PI / 2, color: 0x3a3a30 }, 10)), P.box(0.06, 0.06, 0.6, { y: -0.3, z: -0.45, color: 0x4e5a36 })], // the Sokolov mount
    fiat: [P.box(0.14, 0.18, 0.45, { z: -0.15, color: STEEL }), jacket(0.05, 0.55), P.box(0.06, 0.2, 0.2, { x: -0.12, y: 0.02, z: -0.1, color: 0x3a3a30 }), ...tripod], // the slim jacket, the box magazine on the left
  }[st.mg];
  return [...gun, ...gunner(st)];
}

/** The army's field gun behind its shield (wheels, trail), the muzzle at z = len + 0.4. */
function gunParts(st) {
  const [len, r, shield] = { g18: [2.3, 0.05, 1], g75: [2.5, 0.045, 1], g77: [2.4, 0.045, 1], g8: [2.2, 0.045, 1], g75k: [2.1, 0.045, 0.9], g3in: [2.3, 0.045, 1], g7527: [2.0, 0.045, 0.9] }[st.gun];
  return [
    P.box(0.45, 0.4, 0.9, { color: STEEL }),                                                         // the breech and cradle
    P.box(1.5 * shield, 1.0, 0.05, { y: 0.2, z: 0.45, color: st.paint }),                            // the shield
    ...(st.gun === 'g75' ? [P.box(0.9, 0.35, 0.05, { y: -0.45, z: 0.43, color: st.paint })] : []),   // (the 75's lower apron)
    P.cyl(r, r * 1.25, len, { z: len / 2 + 0.4, rx: Math.PI / 2, color: STEEL }, 8),                  // the barrel
    P.cyl(r * 1.8, r * 1.8, len * 0.45, { y: -0.12, z: len * 0.22 + 0.4, rx: Math.PI / 2, color: STEEL }, 8), // the recoil cylinder under it
    ...pair((s) => P.cyl(0.55, 0.55, 0.08, { x: s * 0.7, y: -0.2, z: 0.1, rz: Math.PI / 2, color: 0x4a3c2a }, 12)), // the wooden wheels
    P.box(0.18, 0.15, 1.8, { y: -0.6, z: -1.1, rx: -0.2, color: st.paint }),                         // the trail
    ...gunner(st, -0.9),
  ];
}

/** The MG nest: a ring of sandbags, stone or logs, or a German concrete MG post. */
function nestGeo(army) {
  const st = STYLES[army];
  return once(`n18-${army}`, () => {
    if (st.wall === 'concrete') return { // the Mebu: a squat concrete block, the slit in front, earth banked round
      base: grime(merge([
        P.box(3.4, 1.5, 3.0, { y: 0.55, z: -0.4, color: st.concrete }),
        P.box(3.6, 0.4, 3.2, { y: 1.45, z: -0.4, color: st.concrete }),
        P.box(1.6, 0.22, 0.1, { y: 0.85, z: 1.12, color: DARK }),
        P.sphere(2.9, { sy: 0.35, sz: 0.9, y: -0.2, z: -0.6, color: st.ground }, 12, 6),
        P.box(0.9, 1.3, 0.1, { y: 0.4, z: -1.92, color: DOOR }),
        ...wire(6, 4.2),
      ]), 1.2, 0.1, 0.5),
      gun: merge(mgParts(st)),
    };
    const ring = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      if (Math.cos(a) < -0.8) continue; // (the way in, at the back)
      const x = Math.sin(a) * 1.9, z = Math.cos(a) * 1.9;
      for (let row = 0; row < 3; row++) {
        const o = { x, y: 0.15 + row * 0.3, z, ry: a + (row % 2) * 0.12 };
        if (st.wall === 'log') ring.push(log(1.05, st.log, { ...o, y: 0.17 + row * 0.32 }));
        else if (st.wall === 'stone' && row < 2) ring.push(P.box(0.9 + r01(i, row) * 0.15, 0.3, 0.55, { ...o, color: st.stone[(i + row) % 3] }));
        else ring.push(P.box(0.95, 0.3, 0.5, { ...o, color: row % 2 ? st.bag2 : st.bag }));
      }
    }
    return {
      base: grime(merge([
        P.cyl(1.8, 1.8, 0.1, { y: -0.02, color: 0x3a3226 }, 12),
        ...ring,
        ...(st.berm || st.wall === 'log' ? [P.torus(2.55, 0.55, { rx: Math.PI / 2, sy: 0.9, y: 0.1, color: st.ground }, 14)] : []),
        ...(st.roof === 'iron' ? [P.box(1.6, 0.04, 1.4, { y: 1.15, z: -1.0, rx: 0.12, color: IRON })] : []),  // a sheet of corrugated iron over the back
        P.box(0.5, 0.5, 0.35, { x: 0.8, y: 0.25, z: -0.6, color: 0x4a4a3a }),                    // ammunition boxes
        ...wire(6, 4.0),
      ]), 1.0, 0.1, 0.5),
      gun: merge(mgParts(st)),
    };
  });
}

/** The dugout: `k` its size, `gun` a field gun in it (else an MG). Concrete for the Germans. */
function dugoutGeo(army, k, gun) {
  const st = STYLES[army];
  return once(`d18-${army}-${k}-${gun}`, () => {
    const w = 3.6 * k, f = 2.1 * k, sy = 0.85 * k, slit = w * (gun ? 0.55 : 0.4);
    if (st.wall === 'concrete') return {
      base: grime(merge([
        P.sphere(3.4 * k, { sy: 0.42, sz: 0.85, y: -0.1, color: st.ground }, 12, 6),
        ...pair((s) => P.box((w - slit) / 2, sy + 0.9, 0.9, { x: s * (slit / 2 + (w - slit) / 4), y: (sy + 0.9) / 2, z: f - 0.3, color: st.concrete })), // the casemate's front, either side of the embrasure
        P.box(w, 0.25 * k + 0.2, 0.9, { y: sy + 0.33 * k + 0.1, z: f - 0.3, color: st.concrete }),
        P.box(w + 0.4, 0.6, 3.6 * k, { y: sy + 0.75 * k + 0.25, z: 0.2, color: st.concrete }),  // the slab roof
        P.box(slit, 0.32 * k, 0.1, { y: sy, z: f - 0.35, color: DARK }),
        P.sphere(2.4 * k, { sy: 0.22, sz: 0.8, y: sy + 0.9 * k + 0.25, z: -0.4, color: st.cover }, 10, 5), // earth over the slab
        P.box(1.0, 0.9, 1.6, { y: 0.1, z: -2.7 * k, color: DOOR }),
        ...wire(w + 3, f + 3.5, 6),
      ]), 1.4, 0.1, 0.4),
      gun: merge(gun ? gunParts(st) : mgParts(st)),
    };
    const roof = [-1.2, -0.4, 0.4, 1.2].map((z) => st.roof === 'iron'
      ? P.box(w * 0.72, 0.1, 0.85, { y: 1.43 * k - 0.02, z: z * k + 0.3, rx: 0.04, color: IRON })   // elephant iron on the rails, on the mound
      : log(w * 0.72, st.log, { y: 1.43 * k - 0.02, z: z * k + 0.3, sx: k }));
    return {
      base: grime(merge([
        P.sphere(3.4 * k, { sy: 0.42, sz: 0.85, y: -0.1, color: st.ground }, 12, 6),             // the mound
        ...face(st, w, f, k, slit, sy),
        P.box(slit, 0.32 * k, 0.1, { y: sy, z: f - 0.08, color: DARK }),
        ...roof,
        P.sphere(2.3 * k, { sy: 0.22, sz: 0.8, y: 1.38 * k, z: -0.3, color: st.cover }, 10, 5),  // earth over the roof
        ...(st.wall !== 'log' ? course(st, w * 0.6, 1.88 * k, 0.6, 1, 'bag') : []),             // sandbags weighing it down
        P.box(1.0, 0.9, 1.6, { y: 0.1, z: -2.7 * k, color: DOOR }),                               // the trench in at the back
        ...wire(w + 3, f + 3.5, 6),
      ]), 1.4, 0.1, 0.4),
      gun: merge(gun ? gunParts(st) : mgParts(st)),
    };
  });
}

// ---------------------------------------------------------------- flags (the x-y plane, the hoist at x = 0)

function flag(kind, x, y, z) {
  const w = 1.7, h = 1.0, at = (o) => ({ ...o, x: x + w / 2 + (o.x ?? 0), y: y + (o.y ?? 0), z });
  const bands = (cs, vertical) => cs.map((c, i) => (vertical
    ? P.box(w / cs.length, h, 0.03, at({ x: -w / 2 + (w / cs.length) * (i + 0.5), color: c }))
    : P.box(w, h / cs.length, 0.03, at({ y: h / 2 - (h / cs.length) * (i + 0.5), color: c }))));
  const union = (sx, sy, ox, oy) => { // the Union Flag, scaled into a canton
    const d = Math.hypot(w, h) * sx, t = Math.atan2(h * sy, w * sx), o = (q) => at({ ...q, x: (q.x ?? 0) + ox, y: (q.y ?? 0) + oy });
    return [P.box(w * sx, h * sy, 0.035, o({ color: 0x1f3a7a })),
      ...pair((s) => P.box(d, 0.2 * sy, 0.04, o({ rz: s * t, color: 0xe8e4da }))), ...pair((s) => P.box(d, 0.07 * sy, 0.045, o({ rz: s * t, color: 0xc8202a }))),
      P.box(w * sx, 0.32 * sy, 0.05, o({ color: 0xe8e4da })), P.box(0.32 * sx, h * sy, 0.05, o({ color: 0xe8e4da })),
      P.box(w * sx, 0.19 * sy, 0.055, o({ color: 0xc8202a })), P.box(0.19 * sx, h * sy, 0.055, o({ color: 0xc8202a }))];
  };
  const star = (sx, sy, r) => P.cyl(r, r, 0.04, at({ x: sx, y: sy, rx: Math.PI / 2, color: 0xe8e4da }), 7);
  switch (kind) {
    case 'uk': return union(1, 1, 0, 0);
    case 'au': return [P.box(w, h, 0.03, at({ color: 0x1f3a7a })), ...union(0.5, 0.5, -w / 4, h / 4), // the Australian blue ensign: the Union in the canton, the stars
      star(-w / 4, -h / 4, 0.1), ...[[0.45, 0.25], [0.25, 0.05], [0.6, -0.05], [0.45, -0.3]].map(([sx, sy]) => star(sx, sy, 0.06))];
    case 'fr': return bands([0x22325c, 0xe8e4da, 0xc8202a], true);
    case 'it': return [...bands([0x2a7a3a, 0xe8e4da, 0xc8202a], true), P.box(0.24, 0.3, 0.05, at({ color: 0xc8202a })), P.box(0.06, 0.2, 0.06, at({ color: 0xe8e4da })), P.box(0.16, 0.06, 0.06, at({ color: 0xe8e4da }))]; // the Savoy shield
    case 'de': return bands([0x161616, 0xe8e4da, 0xc8202a]);
    case 'ah': return bands([0x161616, 0xd8b830]);
    case 'ru': return bands([0xe8e4da, 0x22489a, 0xc8202a]);
    default: return [P.box(w, h, 0.03, at({ color: 0xc41e1e })), // the Ottoman red, the white crescent and star
      P.cyl(0.26, 0.26, 0.04, at({ x: -0.12, rx: Math.PI / 2, color: 0xe8e4da }), 16), P.cyl(0.21, 0.21, 0.05, at({ x: -0.04, rx: Math.PI / 2, color: 0xc41e1e }), 16),
      P.cyl(0.08, 0.08, 0.05, at({ x: 0.26, rx: Math.PI / 2, color: 0xe8e4da }), 5)];
  }
}

const telephone = (x, z, hgt) => [P.cyl(0.07, 0.09, hgt, { x, y: hgt / 2, z, color: POLE }, 6), ...[0, 0.5].map((d) => P.box(1.2, 0.07, 0.07, { x, y: hgt - 0.3 - d, z, color: POLE })),
  ...[-0.45, 0.45].map((dx) => P.box(0.015, 0.015, 7, { x: x + dx, y: hgt - 0.25, z: z - 3.5, rx: 0.12, color: 0x2a2a28 }))]; // the wires running back
const pole = (x, z, hgt, kind) => [P.cyl(0.05, 0.05, hgt, { x, y: hgt / 2, z, color: POLE }, 5), ...flag(kind, x, hgt - 0.6, z)];

/** Each army's headquarters. */
function commandGeo(army) {
  return once(`c18-${army}`, () => {
    const st = STYLES[army];
    const mound = [P.sphere(5.6, { sy: 0.42, sz: 0.75, y: -0.3, color: st.ground }, 14, 7), P.sphere(4.2, { sy: 0.18, sz: 0.65, y: 2.05, color: st.cover }, 10, 5)];
    const way = (h = 3) => pair((s) => Array.from({ length: h }, (_, i) => course(st, 2.2, 0.15 + i * 0.3, 0, i, st.wall === 'log' || st.wall === 'concrete' ? 'bag' : st.wall)).flat().map((g) => g.rotateY(Math.PI / 2).translate(s * 1.75, 0, 5.3))).flat();
    const frame = (c) => [P.box(2.4, 1.9, 1.0, { y: 0.85, z: 3.9, color: c }), P.box(1.5, 1.55, 0.2, { y: 0.78, z: 4.45, color: DOOR })];
    const parts = {
      uk: () => [...mound, ...[-1.8, -0.6, 0.6, 1.8].map((z) => P.box(6.5, 0.14, 1.0, { y: 2.0, z, color: IRON })), ...frame(st.log), ...way(),
        P.box(1.2, 0.8, 0.05, { x: 1.9, y: 1.5, z: 4.42, color: 0x3a3226 }),                            // the gas curtain rolled over the door
        ...telephone(-2.6, -1.5, 6), ...pole(2.4, 3.4, 6, 'uk')],
      anzac: () => [...mound, ...[-1.8, -0.6, 0.6, 1.8].map((z) => P.box(6.5, 0.14, 1.0, { y: 2.0, z, color: IRON })), ...frame(st.log), ...way(),
        P.box(3.6, 0.06, 3.0, { x: 4.6, y: 1.7, z: 2.0, rz: 0.28, color: 0xc2ac80 }), ...pair((s) => P.cyl(0.04, 0.04, 2.1, { x: 6.2, y: 1.05, z: 2.0 + s * 1.3, color: POLE }, 4)), // the bivvy sheet off its side
        ...telephone(-2.6, -1.5, 6), ...pole(2.4, 3.4, 6, 'au')],
      fr: () => [...mound, ...[-1.8, -0.6, 0.6, 1.8].map((z) => log(6.8, st.log, { y: 2.0, z })), ...frame(st.log), ...way(),
        P.box(3.2, 1.6, 5.0, { x: 6.4, y: 0.8, z: 0.5, color: 0x7a6a4c }), ...pair((s) => P.box(1.9, 0.08, 5.2, { x: 6.4 + s * 0.85, y: 2.05, z: 0.5, rz: s * -0.6, color: 0x5a5a50 })), // the Adrian hut beside it
        ...telephone(-2.6, -1.5, 6), ...pole(2.4, 3.4, 6, 'fr')],
      de: () => [ // a Stollen: the concrete entrance to a deep dugout, two stairways down
        P.sphere(5.6, { sy: 0.38, sz: 0.75, y: -0.3, color: st.ground }, 14, 7),
        P.box(6.0, 2.4, 2.4, { y: 0.9, z: 3.4, color: st.concrete }), P.box(6.4, 0.5, 2.8, { y: 2.3, z: 3.3, color: st.concrete }),
        ...pair((s) => P.box(1.2, 1.7, 0.1, { x: s * 1.6, y: 0.75, z: 4.62, color: DOOR })), P.box(0.9, 0.2, 0.1, { y: 1.8, z: 4.62, color: DARK }),
        P.sphere(3.8, { sy: 0.2, sz: 0.65, y: 2.1, z: -0.5, color: st.cover }, 10, 5),
        ...pair((s) => P.box(1.2, 1.2, 2.2, { x: s * 3.5, y: 0.3, z: 4.6, rx: 0.4, color: st.ground })),
        ...telephone(-2.6, -1.5, 6), ...pole(2.4, 4.9, 6, 'de')],
      ah: () => [ // a cavern cut into the rock: a grey rock mass, a dressed-stone portal, the timber door
        P.sphere(5.8, { sy: 0.55, sz: 0.75, y: -0.4, color: 0x9a968a }, 10, 6), P.sphere(3.6, { sy: 0.45, x: -2.5, y: 1.4, z: -1, color: 0xa8a498 }, 8, 5),
        ...[0, 1, 2, 3, 4].map((i) => P.box(0.7, 0.5, 0.7, { x: -1.5 + (i % 2) * 3, y: 0.25 + Math.floor(i / 2) * 0.5, z: 3.95, color: st.stone[i % 3] })), // the portal's dressed stones
        P.box(3.6, 0.5, 0.8, { y: 2.1, z: 3.9, color: st.stone[1] }), P.box(2.2, 1.85, 0.2, { y: 0.92, z: 4.15, color: DOOR }),
        ...way(2), ...telephone(-2.6, -1.5, 6), ...pole(2.6, 4.9, 6, 'ah')],
      ot: () => [ // a stone redoubt house: thick walls, a flat roof of beams and earth, a parapet round it
        P.box(6.0, 2.4, 5.0, { y: 1.0, color: st.stone[0] }), P.box(6.4, 0.3, 5.4, { y: 2.3, color: 0x7a6448 }), P.box(6.2, 0.35, 5.2, { y: 2.55, color: st.ground }),
        ...[0, 1, 2, 3].map((i) => P.box(0.5, 0.15, 0.1, { x: -2.1 + i * 1.4, y: 1.6, z: 2.52, color: DARK })), // its loopholes
        P.box(1.3, 1.8, 0.1, { y: 0.8, z: 2.52, color: DOOR }),
        ...course(st, 6.2, 2.85, 2.45, 0), ...course(st, 6.2, 2.85, -2.45, 1),
        ...pair((s) => course(st, 5.0, 0.15, 0, s > 0 ? 2 : 3).concat(course(st, 5.0, 0.45, 0, 4)).map((g) => g.rotateY(Math.PI / 2).translate(s * 4.6, 0, 0.5))).flat(), // the sangar walls either side
        ...telephone(-2.6, -3.5, 6), ...pole(2.4, 3.6, 6.5, 'ot')],
      ru: () => [...mound, ...[-1.8, -0.6, 0.6, 1.8].map((z) => log(6.8, st.log, { y: 2.0, z })), ...frame(st.log), ...way(),
        P.cyl(0.12, 0.12, 1.2, { x: 1.6, y: 2.6, z: -0.8, color: 0x2a2a26 }, 6),                       // the zemlyanka's stovepipe
        ...[-2, 2].map((x) => log(2.6, st.log, { x: x * 0.9, y: 0.25, z: 6.6, ry: Math.PI / 2 })),
        ...telephone(-2.6, -1.5, 6), ...pole(2.4, 3.4, 6.5, 'ru')],
      it: () => [...mound, ...[-1.8, -0.6, 0.6, 1.8].map((z) => P.box(6.5, 0.14, 1.0, { y: 2.0, z, color: IRON })), ...frame(st.stone[1]), ...way(),
        ...course(st, 5.0, 2.35, 0.4, 1, 'bag'), ...course(st, 4.0, 2.65, 0.4, 2, 'bag'),             // sandbags on the roof against the Austrian shells
        ...telephone(-2.6, -1.5, 6), ...pole(2.4, 3.4, 6, 'it')],
    }[army]();
    return { base: grime(merge(parts), 1.5, 0.2, 0.4), gun: null };
  });
}

const MG_RIG = { at: [0, 0.8, 0.1], tip: [0, 0.02, 0.8], recoil: 0.02, pitch: false };
const MEBU_RIG = { at: [0, 0.85, 0.2], tip: [0, 0.02, 0.8], arc: 0.6, recoil: 0.02, pitch: false };
const DUG_MG = (k) => ({ at: [0, 0.85 * k, 2.1 * k - 0.85], tip: [0, 0.02, 0.8], arc: 0.7, recoil: 0.02, pitch: false });
const DUG_GUN = (k) => ({ at: [0, 0.85 * k - 0.05, 2.1 * k - 1.9], tip: [0, 0, 2.7], arc: 0.6, recoil: 0.25 });

/** An army's 1918 forts (rigs): the MG nest, the MG dugout, the field gun's dugout (and a bigger one), the headquarters. */
export const lanesFortModels1918 = (army) => ({
  nest: fortRig(() => nestGeo(army), STYLES[army].wall === 'concrete' ? MEBU_RIG : MG_RIG),
  mgDugout: fortRig(() => dugoutGeo(army, 1, false), DUG_MG(1)),
  gunDugout: fortRig(() => dugoutGeo(army, 1.4, true), DUG_GUN(1.4)),
  bigGunDugout: fortRig(() => dugoutGeo(army, 1.6, true), DUG_GUN(1.6)),
  command: fortRig(() => commandGeo(army), { tip: [0, 3, 4], arc: 0, pitch: false, recoil: 0 }),
});
