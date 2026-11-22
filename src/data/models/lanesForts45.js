// The Lanes mode's 1945 fortifications (units45/atlanticWall.js lanesForts45) for the armies that aren't Japan
// (Japan's are its log pillboxes in models/coastForts45.js), in the same kit:
//   nest      the bunker line's MG position: a ring of sandbags (US, 21st Army Group), a sangar of stacked stone
//             with a course of bags on top (8th Army), a ring of logs (14th Army; the Red Army's, in an earth parapet)
//   dugout    log-and-earth: a mound over a log roof, a face of logs, sandbags or stone with a firing slit, an MG
//             or an anti-tank gun behind it (US 57 mm, British 6-pounder, Soviet 45 mm) — the DZOT of the Red Army
//   command   each army's headquarters: a US command post (wall tent, sandbagged dugout, radio mast, the Stars and
//             Stripes), British dugouts (a stone sangar under a canvas lean-to in the desert, earth and timber under
//             a net in Normandy, a log bunker and a thatched basha in Burma) under the Union Flag, the Red Army's
//             zemlyanka under the red flag, and the Wehrmacht's Regelbau command bunker (no flag)
// Built as fortRig rigs (models/coastForts45.js).
import { P, merge, pair, grime } from '../units/geometry.js';
import { fortRig } from './coastForts45.js';

const DARK = 0x141412, STEEL = 0x34362f, DOOR = 0x2a2620, POLE = 0x6a5a3e;
const cache = {};
const once = (key, make) => (cache[key] ??= make());
const rnd = (i, k) => (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
const r01 = (i, k) => Math.abs(rnd(i, k));

/** Each army's look: earth, what its walls are built of, what covers the roof, its MG, AT gun, helmet and flag. */
const STYLES = {
  us: { ground: 0x6b5a40, cover: 0x5a6440, wall: 'bag', bag: 0xa8966a, bag2: 0x9a8960, log: 0x5b4630, mg: 'm1919', at: 'us57', paint: 0x55603a, helmet: 0x55603a, flag: 'us' },
  brit: { ground: 0xc4ab7c, cover: 0xb9a070, wall: 'stone', bag: 0xc8b48a, bag2: 0xb8a47a, log: 0x7a6a50, stone: [0xb3a07a, 0x9d8964, 0xc4b08a], mg: 'bren', at: 'sixpdr', paint: 0xb59a6a, helmet: 0xa08a5c, flag: 'uk' },
  brit21: { ground: 0x5e5340, cover: 0x56603e, wall: 'bag', bag: 0xa8966a, bag2: 0x9a8960, log: 0x6a5638, mg: 'bren', at: 'sixpdr', paint: 0x4f5a38, helmet: 0x4f5a38, flag: 'uk', net: 0x4a5434 },
  brit14: { ground: 0x7a4e34, cover: 0x6a5236, wall: 'log', bag: 0x9a8a62, bag2: 0x8c7c56, log: 0x5a4430, mg: 'bren', at: 'sixpdr', paint: 0x48553a, helmet: 0x4a5236, flag: 'uk', fronds: 0x4f6a30 },
  sov: { ground: 0x5a4c38, cover: 0x56603e, wall: 'log', bag: 0x9a8a62, bag2: 0x8c7c56, log: 0x6b553a, mg: 'maxim', at: 'sov45', paint: 0x4e5a36, helmet: 0x56603e, flag: 'sov', berm: true },
};

const log = (len, c, o = {}) => P.cyl(0.17, 0.17, len, { rz: Math.PI / 2, color: c, ...o }, 7);

/** A course of `n` sandbags (or stones) across `w`, centred at y, z. */
function course(st, w, y, z, row, kind = st.wall) {
  const n = Math.max(2, Math.round(w / 0.85)), bw = w / n;
  return Array.from({ length: n }, (_, i) => {
    const x = -w / 2 + bw * (i + 0.5) + (row % 2 ? bw * 0.25 : 0) * (i < n - 1 ? 1 : 0);
    return kind === 'stone'
      ? P.box(bw * (0.85 + r01(i, row) * 0.2), 0.3 + r01(i, row + 3) * 0.08, 0.5, { x, y, z, ry: (r01(i, row + 5) - 0.5) * 0.15, color: st.stone[(i + row) % 3] })
      : P.box(bw * 0.98, 0.3, 0.5, { x, y, z, color: row % 2 ? st.bag2 : st.bag });
  });
}

/** The face of a dugout, `w` wide at z = f, with a slit `slit` wide at height `sy`: logs, sandbags or stone. */
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

/** An MG (on its tripod, bipod or wheels) and its gunner, the muzzle at z ≈ 0.75. */
function mgParts(st) {
  const gunner = [P.box(0.5, 0.42, 0.3, { y: -0.2, z: -0.75, color: st.paint }), P.sphere(0.17, { sy: 0.7, y: 0.12, z: -0.75, color: st.helmet }, 8, 4)];
  if (st.flag === 'uk') gunner.push(P.cyl(0.26, 0.26, 0.03, { y: 0.08, z: -0.75, color: st.helmet }, 10)); // the Brodie's brim
  const gun = {
    m1919: [P.box(0.15, 0.17, 0.6, { color: STEEL }), P.cyl(0.045, 0.045, 0.5, { z: 0.5, rx: Math.PI / 2, color: 0x2a2c26 }, 7),
      ...[[-0.3, 0.1], [0.3, 0.1], [0, -0.45]].map(([x, z]) => P.cyl(0.02, 0.02, 0.6, { x, y: -0.3, z, rz: -x * 0.6, rx: z * 0.6, color: STEEL }, 4))],
    bren: [P.box(0.12, 0.14, 0.6, { color: 0x3a3a30 }), P.cyl(0.025, 0.025, 0.5, { z: 0.5, rx: Math.PI / 2, color: STEEL }, 6),
      P.box(0.05, 0.2, 0.14, { y: 0.15, z: 0.05, rx: -0.3, color: STEEL }), P.box(0.06, 0.08, 0.25, { y: -0.02, z: -0.4, color: 0x5a4632 }),
      ...pair((s) => P.cyl(0.015, 0.015, 0.35, { x: s * 0.1, y: -0.15, z: 0.4, rz: s * 0.4, color: STEEL }, 4))],
    maxim: [P.box(0.18, 0.2, 0.4, { z: -0.1, color: STEEL }), P.cyl(0.075, 0.075, 0.55, { z: 0.35, rx: Math.PI / 2, color: 0x4a5040 }, 10),
      P.cyl(0.02, 0.02, 0.15, { z: 0.68, rx: Math.PI / 2, color: STEEL }, 5), P.box(0.55, 0.45, 0.03, { y: 0.05, z: 0.12, color: 0x4e5a36 }),
      ...pair((s) => P.cyl(0.17, 0.17, 0.05, { x: s * 0.24, y: -0.3, z: -0.05, rz: Math.PI / 2, color: 0x3a3a30 }, 10)), P.box(0.06, 0.06, 0.6, { y: -0.3, z: -0.45, color: 0x4e5a36 })],
  }[st.mg];
  return [...gun, ...gunner];
}

/** An anti-tank gun behind its shield, the muzzle at z = len + 0.4. */
function atParts(st) {
  const [sw, sh, len, r, c] = { us57: [1.4, 0.9, 2.3, 0.055, 0x55603a], sixpdr: [1.5, 0.95, 2.3, 0.055, st.paint], sov45: [1.2, 0.8, 2.0, 0.04, 0x4e5a36] }[st.at];
  return [
    P.box(0.6, 0.45, 0.9, { color: STEEL }),                                                       // the breech
    P.box(sw, sh, 0.05, { y: 0.15, z: 0.5, color: c }),                                            // the shield
    ...(st.at === 'sixpdr' ? [P.box(sw * 0.7, 0.25, 0.05, { y: 0.15 + sh / 2 + 0.1, z: 0.48, color: c })] : []), // (the 6-pounder's tall shield)
    P.cyl(r, r * 1.3, len, { z: len / 2 + 0.4, rx: Math.PI / 2, color: STEEL }, 8),                // the barrel
    ...(st.at === 'us57' ? [P.cyl(r * 1.5, r * 1.5, 0.2, { z: len + 0.35, rx: Math.PI / 2, color: STEEL }, 8)] : []),
    ...pair((s) => P.cyl(0.35, 0.35, 0.12, { x: s * 0.55, y: -0.35, z: 0.2, rz: Math.PI / 2, color: 0x2e2e28 }, 10)), // the wheels
    P.box(0.45, 0.4, 0.3, { y: -0.2, z: -0.7, color: st.paint }), P.sphere(0.16, { sy: 0.7, y: 0.08, z: -0.7, color: st.helmet }, 8, 4), // the layer
  ];
}

/** The MG nest: a ring of sandbags, stone or logs, the gun in the middle. */
function nestGeo(army) {
  const st = STYLES[army];
  return once(`nest-${army}`, () => {
    const ring = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      if (Math.cos(a) < -0.8) continue; // (the way in, at the back)
      const x = Math.sin(a) * 1.9, z = Math.cos(a) * 1.9;
      for (let row = 0; row < 3; row++) {
        const y = 0.15 + row * 0.3, o = { x, y, z, ry: a + (row % 2) * 0.12 };
        if (st.wall === 'log') ring.push(log(1.05, st.log, { ...o, y: 0.17 + row * 0.32 }));
        else if (st.wall === 'stone' && row < 2) ring.push(P.box(0.9 + r01(i, row) * 0.15, 0.3, 0.55, { ...o, color: st.stone[(i + row) % 3] }));
        else ring.push(P.box(0.95, 0.3, 0.5, { ...o, color: row % 2 ? st.bag2 : st.bag }));
      }
    }
    return {
      base: grime(merge([
        P.cyl(1.8, 1.8, 0.1, { y: -0.02, color: 0x3a3226 }, 12),                                 // the trodden floor
        ...ring,
        ...(st.berm || st.wall === 'log' ? [P.torus(2.55, 0.55, { rx: Math.PI / 2, sy: 0.9, y: 0.1, color: st.ground }, 14)] : []), // an earth parapet thrown up round it
        ...(st.fronds ? Array.from({ length: 3 }, (_, i) => P.box(1.7, 0.05, 0.45, { x: Math.sin(i * 2.1 + 1) * 2.7, y: 0.55, z: Math.cos(i * 2.1 + 1) * 2.7, ry: i * 2.1 + 1, rz: 0.25, color: st.fronds })) : []), // (leaves laid on the parapet)
        P.box(0.5, 0.5, 0.35, { x: 0.8, y: 0.25, z: -0.6, color: 0x4a4a3a }),                    // ammunition boxes
        P.box(0.45, 0.3, 0.3, { x: 0.8, y: 0.62, z: -0.6, color: 0x4a4a3a }),
      ]), 1.0, 0.1, 0.5),
      gun: merge(mgParts(st)),
    };
  });
}

/** The log-and-earth dugout: `k` its size, `at` an anti-tank gun in it (else an MG). */
function dugoutGeo(army, k, at) {
  const st = STYLES[army];
  return once(`dug-${army}-${k}-${at}`, () => {
    const w = 3.6 * k, f = 2.1 * k, sy = 0.85 * k, slit = w * (at ? 0.55 : 0.4);
    const roof = [-1.2, -0.4, 0.4, 1.2].map((z) => st.wall === 'stone'
      ? P.box(w * 0.95, 0.12, 0.85, { y: 1.75 * k, z: z * k + 0.3, rx: 0.04, color: 0x8a8578 })      // (the desert: corrugated iron on rails…)
      : log(w * 0.95, st.log, { y: 1.75 * k, z: z * k + 0.3, sx: k }));
    return {
      base: grime(merge([
        P.sphere(3.4 * k, { sy: 0.42, sz: 0.85, y: -0.1, color: st.ground }, 12, 6),             // the mound
        ...face(st, w, f, k, slit, sy),
        P.box(slit, 0.32 * k, 0.1, { y: sy, z: f - 0.08, color: DARK }),                          // the dark behind the slit
        ...roof,
        P.sphere(2.5 * k, { sy: 0.26, sz: 0.8, y: 1.7 * k, z: -0.3, color: st.cover }, 10, 5),  // earth (or sand) over the roof
        ...(st.wall === 'stone' ? course(st, w * 0.8, 2.25 * k, 0.6, 1, 'bag') : []),             // (…sandbags weighing it down)
        ...(st.fronds ? Array.from({ length: 4 }, (_, i) => P.box(0.5, 0.06, 2.0, { x: Math.sin(i * 2.4) * k, y: 2.15 * k, z: Math.cos(i * 2.4) * 0.8 * k, ry: i * 2.4, rx: 0.15, color: st.fronds })) : []),
        ...(st.net ? [P.box(w + 1.2, 0.08, 4.5 * k, { y: 2.3 * k, color: st.net, camo: 1 })] : []),
        P.box(1.0, 0.9, 1.6, { y: 0.1, z: -2.7 * k, color: DOOR }),                               // the crawl trench in at the back
      ]), 1.4, 0.1, 0.4),
      gun: merge(at ? atParts(st) : mgParts(st)),
    };
  });
}

// ---------------------------------------------------------------- flags (in the x-y plane, the hoist at x = 0)

function flag(kind, x, y, z) {
  const w = 1.7, h = 1.0, at = (o) => ({ ...o, x: x + w / 2 + (o.x ?? 0), y: y + (o.y ?? 0), z });
  if (kind === 'us') {
    return [P.box(w, h, 0.03, at({ color: 0xe8e4da })),
      ...Array.from({ length: 7 }, (_, i) => P.box(w, h / 13, 0.045, at({ y: h / 2 - h / 26 - (i * 2 * h) / 13, color: 0xb22234 }))),
      P.box(w * 0.4, (h * 7) / 13, 0.06, at({ x: -w * 0.3, y: h / 2 - (h * 7) / 26, color: 0x3c3b6e }))];
  }
  if (kind === 'uk') {
    const d = Math.hypot(w, h), t = Math.atan2(h, w);
    return [P.box(w, h, 0.03, at({ color: 0x1f3a7a })),
      ...pair((s) => P.box(d, 0.2, 0.04, at({ rz: s * t, color: 0xe8e4da }))),
      ...pair((s) => P.box(d, 0.07, 0.05, at({ rz: s * t, color: 0xc8202a }))),
      P.box(w, 0.32, 0.055, at({ color: 0xe8e4da })), P.box(0.32, h, 0.055, at({ color: 0xe8e4da })),
      P.box(w, 0.19, 0.065, at({ color: 0xc8202a })), P.box(0.19, h, 0.065, at({ color: 0xc8202a }))];
  }
  // the Red Army's red banner, the hammer and sickle and the star in the corner
  return [P.box(w, h, 0.03, at({ color: 0xc41e1e })),
    P.torus(0.12, 0.025, at({ x: -w * 0.33, y: 0.18, color: 0xf2c230 }), 10),
    P.box(0.035, 0.26, 0.05, at({ x: -w * 0.33, y: 0.16, rz: 0.7, color: 0xf2c230 })),
    P.box(0.12, 0.05, 0.05, at({ x: -w * 0.38, y: 0.27, rz: 0.7, color: 0xf2c230 })),
    P.cone(0.07, 0.03, at({ x: -w * 0.33, y: 0.4, rx: Math.PI / 2, color: 0xf2c230 }), 5)];
}

const mast = (x, z, hgt, c = 0x6a6c66) => [P.cyl(0.06, 0.08, hgt, { x, y: hgt / 2, z, color: c }, 6), P.box(1.6, 0.05, 0.05, { x, y: hgt - 0.4, z, color: c }),
  ...pair((s) => P.cyl(0.012, 0.012, hgt * 0.75, { x: x + s * 1.2, y: hgt * 0.36, z: z - 0.6, rz: s * -0.12, rx: 0.08, color: 0x2a2a28 }, 3))]; // the mast and its guy wires
const pole = (x, z, hgt, kind) => [P.cyl(0.05, 0.05, hgt, { x, y: hgt / 2, z, color: POLE }, 5), ...flag(kind, x, hgt - 0.6, z)];

/** The headquarters of each army. */
function commandGeo(army) {
  return once(`cmd-${army}`, () => {
    if (army === 'de') return germanCommand();
    const st = STYLES[army];
    const dug = [
      P.sphere(5.6, { sy: 0.42, sz: 0.75, y: -0.3, color: st.ground }, 14, 7),                    // the dugout's mound
      ...[-1.8, -0.6, 0.6, 1.8].map((z) => st.wall === 'stone' ? P.box(6.5, 0.14, 1.0, { y: 2.0, z, color: 0x8a8578 }) : log(6.8, st.log, { y: 2.0, z })), // the roof showing through
      P.sphere(4.2, { sy: 0.18, sz: 0.65, y: 2.05, color: st.cover }, 10, 5),
      P.box(2.4, 1.9, 1.0, { y: 0.85, z: 3.9, color: st.wall === 'stone' ? st.stone[1] : st.log }), // the entrance frame
      P.box(1.5, 1.55, 0.2, { y: 0.78, z: 4.45, color: DOOR }),
      ...pair((s) => course(st, 2.2, 0.15, 0, 0).concat(course(st, 2.2, 0.45, 0, 1)).concat(course(st, 2.2, 0.75, 0, 2)).map((g) => g.rotateY(Math.PI / 2).translate(s * 1.75, 0, 5.3))).flat(), // the walls of the way in
    ];
    const extra = {
      us: () => [ // the wall tent beside it, a jerrycan stack, the radio mast and the flag
        P.box(3.0, 1.5, 4.2, { x: 5.2, y: 0.75, z: 1.0, color: 0x5d6640 }),
        P.cyl(1.75, 1.75, 4.3, { x: 5.2, y: 1.95, z: 1.0, rx: -Math.PI / 2, sy: 0.45, color: 0x56603b }, 3),
        P.box(0.9, 1.2, 0.05, { x: 5.2, y: 0.6, z: 3.12, color: 0x3a3c2a }),
        ...[0, 1, 2].map((i) => P.box(0.18, 0.45, 0.34, { x: 3.0 + i * 0.22, y: 0.22, z: 3.6, color: 0x4a5634 })),
        ...mast(-2.6, -1.5, 10), ...pole(2.4, 3.4, 6, 'us')],
      brit: () => [ // a canvas lean-to off the sangar, the mast and the Union Flag
        P.box(3.6, 0.06, 3.0, { x: 4.6, y: 1.7, z: 2.0, rz: 0.28, color: 0xc2ac80 }),
        ...pair((s) => P.cyl(0.04, 0.04, 2.1, { x: 6.2, y: 1.05, z: 2.0 + s * 1.3, color: POLE }, 4)),
        ...course(st, 3.6, 0.15, 3.6, 0).map((g) => g.translate(4.2, 0, 0)), ...course(st, 3.6, 0.45, 3.6, 1).map((g) => g.translate(4.2, 0, 0)),
        ...mast(-2.6, -1.5, 10), ...pole(2.4, 3.4, 6, 'uk')],
      brit21: () => [P.box(9.5, 0.08, 7.0, { y: 2.6, color: st.net, camo: 1 }), // the camouflage net over it all
        ...[[-4.2, 3], [4.2, 3], [-4.2, -3], [4.2, -3]].map(([x, z]) => P.cyl(0.05, 0.05, 2.6, { x, y: 1.3, z, color: POLE }, 5)),
        ...mast(-2.6, -1.5, 10), ...pole(2.4, 3.4, 6, 'uk')],
      brit14: () => [ // a basha beside it: a thatched roof on bamboo posts
        ...[[-1.4, -1.6], [1.4, -1.6], [-1.4, 1.6], [1.4, 1.6]].map(([x, z]) => P.cyl(0.06, 0.06, 1.9, { x: x + 5.4, y: 0.95, z: z + 0.8, color: 0x9a8a50 }, 5)),
        P.cyl(2.2, 2.2, 4.0, { x: 5.4, y: 2.45, z: 0.8, rx: -Math.PI / 2, sy: 0.5, color: 0x8a7a48 }, 3),
        ...Array.from({ length: 5 }, (_, i) => P.box(0.5, 0.06, 2.0, { x: Math.sin(i * 2.4) * 2.2, y: 2.35, z: Math.cos(i * 2.4) * 1.6, ry: i * 2.4, rx: 0.15, color: st.fronds })),
        ...mast(-2.6, -1.5, 10), ...pole(2.4, 3.4, 6, 'uk')],
      sov: () => [P.cyl(0.12, 0.12, 1.2, { x: 1.6, y: 2.6, z: -0.8, color: 0x2a2a26 }, 6), // the stovepipe
        ...[-2, 2].map((x) => log(2.6, st.log, { x: x * 0.9, y: 0.25, z: 6.6, ry: Math.PI / 2 })),
        ...mast(-2.6, -1.5, 9), ...pole(2.4, 3.4, 6.5, 'sov')],
    }[army]();
    return { base: grime(merge([...dug, ...extra]), 1.5, 0.2, 0.4), gun: null };
  });
}

/** The Wehrmacht's Regelbau command bunker: concrete half buried, earth banked up, blotches, a steel cupola, the aerial. */
const DE = { concrete: 0xa9a598, dark: 0x77746b, earth: 0x5e5340, turf: 0x5a6440, blotch: [0x5c6244, 0x6e5e42, 0x4a4e3a] };
function germanCommand() {
  const w = 9, d = 7.5, h = 2.6;
  return {
    base: grime(merge([
      P.box(w, h + 0.8, d, { y: (h - 0.8) / 2, color: DE.concrete }),
      P.box(w - 0.3, 0.7, d - 0.3, { y: h + 0.3, color: DE.concrete }),
      ...pair((s) => P.box(3.2, h * 1.1, d + 1.6, { x: s * (w / 2 + 1.1), y: h * 0.22, rz: s * -0.55, color: DE.earth })),
      P.box(w + 3, h * 1.1, 3.2, { y: h * 0.22, z: -d / 2 - 1.1, rx: 0.55, color: DE.earth }),
      P.box(w - 1.4, 0.35, d - 2, { y: h + 0.8, z: -0.6, color: DE.turf }),
      ...[-2.8, 0, 2.8].map((x) => P.box(1.0, 0.22, 0.1, { x, y: h * 0.7, z: d / 2 + 0.02, color: DARK })),   // the observation slits
      ...pair((s) => P.box(1.3, 2.0, 0.1, { x: s * 2.6, y: 0.75, z: d / 2 + 0.02, color: DOOR })),        // the gas-tight doors…
      ...pair((s) => P.box(2.2, 1.6, 0.8, { x: s * 2.6, y: 0.6, z: d / 2 + 1.6, color: DE.concrete })),   // …behind their blast walls
      ...Array.from({ length: 5 }, (_, i) => P.box(1.0 + r01(i, 1) * 1.6, 0.5 + r01(i, 2) * 0.8, 0.04, { x: (r01(i, 3) - 0.5) * (w - 2), y: 0.4 + r01(i, 4) * 1.4, z: d / 2 + 0.03, color: DE.blotch[i % 3] })),
      P.cyl(0.75, 0.85, 0.7, { x: 2.4, y: h + 0.95, z: 0.8, color: STEEL }, 12),                          // the steel observation cupola
      P.sphere(0.75, { sy: 0.5, x: 2.4, y: h + 1.3, z: 0.8, color: STEEL }, 10, 4),
      ...[0, 1, 2, 3].map((i) => P.box(0.18, 0.08, 0.04, { x: 2.4 + Math.sin(i * 1.57) * 0.82, y: h + 1.05, z: 0.8 + Math.cos(i * 1.57) * 0.82, ry: i * 1.57, color: DARK })),
      ...mast(-2.8, -1.5, 11 + h),                                          // the aerial mast on the roof
      ...[0, 1, 2, 3].map((i) => P.cyl(0.02, 0.02, 1.6, { x: -2.8 + Math.sin(i * 1.57) * 0.8, y: 13.2, z: -1.5 + Math.cos(i * 1.57) * 0.8, rz: Math.sin(i * 1.57) * 1.57, rx: Math.cos(i * 1.57) * 1.57, color: 0x2a2a28 }, 3)), // its star aerial
    ]), 1.5, 0.2, 0.6),
    gun: null,
  };
}

const MG_RIG = { at: [0, 0.8, 0.1], tip: [0, 0.02, 0.8], recoil: 0.02, pitch: false };
const DUG_MG = (k) => ({ at: [0, 0.85 * k, 2.1 * k - 0.85], tip: [0, 0.02, 0.8], arc: 0.7, recoil: 0.02, pitch: false });
const DUG_AT = (k) => ({ at: [0, 0.85 * k - 0.05, 2.1 * k - 1.5], tip: [0, 0, 2.8], arc: 0.6, recoil: 0.25 });

/** An army's forts (rigs): the MG nest, the MG dugout, the AT gun's dugout (and a bigger one), the headquarters. */
export const lanesFortModels45 = (army) => ({
  nest: fortRig(() => nestGeo(army), MG_RIG),
  mgDugout: fortRig(() => dugoutGeo(army, 1, false), DUG_MG(1)),
  gunDugout: fortRig(() => dugoutGeo(army, 1.4, true), DUG_AT(1.4)),
  bigGunDugout: fortRig(() => dugoutGeo(army, 1.6, true), DUG_AT(1.6)),
  command: fortRig(() => commandGeo(army), { tip: [0, 3, 4], arc: 0, pitch: false, recoil: 0 }),
});
export const buildGermanCommandBunker = fortRig(() => commandGeo('de'), { tip: [0, 3, 4], arc: 0, pitch: false, recoil: 0 });
