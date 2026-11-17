// The bombers (data/bombers.js), swept from cross-sections like the rest (airKit.js), metres, nose +z:
//   piston    the 1945 twins and four-engined bombers: the round fuselage with the glazed nose, the cockpit
//             glazing, the wing with its engines in nacelles (each propeller spun: rig.props), one fin
//   swing     the swing-wing jets, from the Su-24's lines (aircraft2027.js): the crew side by side or in
//             tandem, the slab intakes, the wings swept for the run, one tall fin, bombs on the belly;
//             `k` scales the whole machine (the Tu-22M3, the B-1B), `nacelles` the B-1B's engines under it
//   b52       the Stratofortress: the long slab-sided fuselage, the high swept wing drooping to the tips,
//             eight engines in four pods on pylons, the tall fin
// Contract: aircraft.js (jets: jet: true; propellers: props).
import * as THREE from 'three';
import { P, merge, pair } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';
import { body, surface, fin } from './airKit.js';
import { mark, mountMulti } from './ww2Aircraft.js';

const GLASS = 0x1b2126;
const DARK = 0x2a2c28;
const HOLE = 0x141414;
const C = { camo: 1 };
const M = (parts) => merge(parts.flat(Infinity));
const point = (root, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); return o; };
const roundel = (x, y, z, r, up = false) => P.cyl(r, r, 0.02, up ? { x, y, z } : { x, y, z, rz: Math.PI / 2 }, 14);
/** Linear along a list of sections [[at, …values]]: the values at `at` (clamped). */
const along = (secs, at) => {
  let i = 0;
  while (i < secs.length - 2 && at > secs[i + 1][0]) i++;
  const a = secs[i], b = secs[i + 1], k = Math.min(1, Math.max(0, (at - a[0]) / (b[0] - a[0] || 1)));
  return a.map((v, j) => v + (b[j] - v) * k);
};

// ---------------------------------------------------------------- 1945: the piston bombers

/**
 * o: len, span (full), engines 2 | 4, color, kind (mark: 'us' | 'sov' | 'de'), fat (fuselage half-width),
 * chord (wing root half-chord), r (propeller radius), blades.
 */
function piston(key, o) {
  const { len, span, engines, color, kind, fat = 0.9, chord = 2.4, r = 1.7, blades = 3 } = o;
  const L = len / 2, H = span / 2, y0 = 2.4, c = { color, ...C };
  const wy = y0 - fat * 0.35, zw = L * 0.12;
  const wing = [[fat * 0.7, wy, zw, chord, chord * 0.14], [H * 0.4, wy + 0.15, zw - 0.2, chord * 0.8, chord * 0.11], [H, wy + 0.5, zw - 0.8, chord * 0.35, 0.06]];
  const xs = engines === 2 ? [H * 0.33] : [H * 0.24, H * 0.5];
  const nac = xs.map((ex) => {
    const [, y, z, hc] = along(wing, ex);
    return { ex, y: y - 0.1, f: z + hc + 1.0, z, hc };
  });
  const geo = () => M([
    body([[L, y0, 0.1, 0.1], [L - 0.8, y0, fat * 0.65, fat * 0.7], [L - 2.5, y0, fat, fat * 1.05], [0, y0 + 0.05, fat, fat * 1.1, 2.6], [-L * 0.55, y0 + 0.25, fat * 0.55, fat * 0.7], [-L + 0.3, y0 + 0.45, 0.15, 0.22]], c),
    body([[L + 0.02, y0, 0.06, 0.06], [L - 0.5, y0, fat * 0.5, fat * 0.55], [L - 1.0, y0, fat * 0.62, fat * 0.68]], { color: GLASS }),           // the glazed nose
    body([[L - 2.2, y0 + fat * 0.85, 0.05, 0.05], [L - 2.8, y0 + fat * 1.05, fat * 0.6, 0.32], [L - 4.0, y0 + fat * 1.08, fat * 0.6, 0.32], [L - 4.6, y0 + fat * 0.9, 0.2, 0.1]], { color: GLASS }), // the cockpit
    ...pair((s) => surface(wing.map(([x, ...v]) => [s * x, ...v]), c)),
    ...pair((s) => nac.map(({ ex, y, f, z, hc }) => [
      body([[f, y, 0.5, 0.5], [f - 0.4, y, 0.62, 0.62], [z - hc * 0.5, y, 0.5, 0.55], [z - hc * 1.1, y, 0.12, 0.15]], { x: s * ex, ...c }),
      P.cyl(0.45, 0.45, 0.02, { x: s * ex, y, z: f + 0.005, rx: Math.PI / 2, color: HOLE }, 14),
    ])),
    ...pair((s) => surface([[s * 0.2, y0 + 0.45, -L + 1.2, 1.1, 0.15], [s * H * 0.3, y0 + 0.45, -L + 0.6, 0.5, 0.06]], c)),
    fin([[y0 + 0.4, -L + 1.4, 1.5, 0.14], [y0 + fat + 1.6, -L + 0.9, 1.0, 0.1], [y0 + fat + 2.6, -L + 0.7, 0.5, 0.06]], c),
    ...pair((s) => { const [, y, z, , t] = along(wing, H * 0.7); return mark(kind, s * H * 0.7, y + t + 0.005, z, chord * 0.32, true); }),
    ...pair((s) => mark(kind, s * fat * 0.71, y0 + 0.18, -L * 0.35, fat * 0.5)),
  ]);
  return (mats) => mountMulti(key, mats, geo, { props: pair((s) => nac.map(({ ex, y, f }) => [s * ex, y, f + 0.1])).flat(), blades, r, door: [0, y0 - fat, zw] });
}

export const buildB26 = piston('b26', { len: 17.8, span: 21.6, engines: 2, color: 0x4d4f34, kind: 'us', fat: 0.85, chord: 1.9, r: 2.0, blades: 4 });
export const buildJu88 = piston('ju88', { len: 14.4, span: 20.0, engines: 2, color: 0x5a6248, kind: 'de', fat: 0.8, chord: 1.8, r: 1.7 });
export const buildB17 = piston('b17', { len: 22.7, span: 31.6, engines: 4, color: 0x4d4f34, kind: 'us', fat: 1.1, chord: 3.6, r: 1.7 });
export const buildPe8 = piston('pe8', { len: 23.6, span: 39.0, engines: 4, color: 0x4f5a34, kind: 'sov', fat: 1.2, chord: 3.4, r: 1.8 });
export const buildHe177 = piston('he177', { len: 20.4, span: 31.4, engines: 2, color: 0x5a6248, kind: 'de', fat: 1.0, chord: 3.0, r: 2.2, blades: 4 }); // (two coupled DB 605s in each nacelle)

// ---------------------------------------------------------------- the jets

const cache = {};
function jet(key, mats, make, gun) {
  const m = (cache[key] ??= make());
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(m.body, mats.body);
  add(m.marks, mats.glow, false);
  return { root, gun: point(root, ...gun), pods: [], jet: true };
}

/** o: color, tandem (crew one behind the other), k (scale), nacelles (engines under the body), racks (bombs on the belly). */
const swing = (key, { color, tandem = false, k = 1, nacelles = false, racks = 2 }) => (mats) => jet(key, mats, () => {
  const c = { color, ...C };
  const geo = M([
    body([[11.0, 1.8, 0.05, 0.05], [10.2, 1.85, 0.5, 0.45], [8.6, 1.9, 0.8, 0.7], [6.6, 2.0, 0.95, 0.8, 2.6], [3.0, 2.0, 1.0, 0.8, 3], [-3.0, 2.0, 0.95, 0.75, 3], [-8.5, 2.05, 0.75, 0.6], [-10.6, 2.1, 0.55, 0.45]], c),
    ...pair((sx) => P.cyl(0.45, 0.42, 0.7, { x: sx * 0.42, y: 2.05, z: -10.9, rx: Math.PI / 2, color: DARK }, 14)),
    ...pair((sx) => body([[5.0, 1.9, 0.35, 0.65, 5], [4.0, 1.9, 0.45, 0.7, 5], [-3.0, 1.95, 0.45, 0.68, 4], [-6.0, 1.98, 0.32, 0.55, 3]], { x: sx * 1.2, ...c })),
    ...pair((sx) => P.box(0.6, 1.2, 0.004, { x: sx * 1.25, y: 1.9, z: 5.003, color: HOLE })),
    tandem
      ? body([[8.4, 2.55, 0.05, 0.05], [7.6, 2.85, 0.42, 0.32], [5.0, 2.9, 0.42, 0.32], [4.4, 2.7, 0.2, 0.15]], { color: GLASS })
      : body([[8.2, 2.55, 0.1, 0.05], [7.5, 2.85, 0.68, 0.32, 3], [6.2, 2.95, 0.7, 0.34, 3], [5.4, 2.75, 0.5, 0.2, 3]], { color: GLASS }),
    ...pair((sx) => surface([[sx * 1.4, 2.4, 0.5, 2.6, 0.18], [sx * 2.6, 2.4, -0.5, 1.6, 0.14]], c)),
    ...pair((sx) => surface([[sx * 2.5, 2.38, -0.8, 1.7, 0.12], [sx * 7.0, 2.25, -5.4, 0.7, 0.05]], c)),
    ...pair((sx) => surface([[sx * 1.0, 2.0, -8.6, 1.6, 0.07], [sx * 4.0, 1.85, -10.0, 0.7, 0.04]], c)),
    fin([[2.7, -6.4, 2.0, 0.1], [4.0, -7.6, 1.5, 0.08], [5.6, -9.2, 0.7, 0.05]], c),
    ...(nacelles ? pair((sx) => [
      body([[1.5, 1.2, 0.85, 0.5, 4], [0.8, 1.2, 0.95, 0.55, 4], [-4.5, 1.25, 0.9, 0.55, 3], [-6.0, 1.3, 0.6, 0.45]], { x: sx * 1.6, ...c }),
      P.box(1.5, 0.8, 0.004, { x: sx * 1.6, y: 1.2, z: 1.503, color: HOLE }),
    ]) : []),
    // the bombs on racks under the body
    ...pair((sx) => [P.box(0.1, 0.3, 1.6 * racks + 0.6, { x: sx * 0.45, y: 1.3, z: 0, color: DARK }),
      ...Array.from({ length: racks }, (_, i) => P.capsule(0.22, 1.2, { x: sx * 0.45, y: 1.05, z: (i - (racks - 1) / 2) * 1.6, rx: Math.PI / 2, color: DARK }))]),
  ]);
  const marks = M([...pair((sx) => roundel(sx * 0.11, 4.6, -7.6, 0.4)), ...pair((sx) => roundel(sx * 5.0, 2.33, -3.6, 0.36, true))]);
  return { body: geo.scale(k, k, k), marks: marks.scale(k, k, k) };
}, [0, 1.2 * k, 6.0 * k]);

export const buildF111 = swing('f111', { color: 0x4a5244 });
export const buildTornado = swing('tornado', { color: 0x4e5440, tandem: true });
export const buildSu24M = swing('su24m', { color: 0x8b928e });
export const buildTu22M3 = swing('tu22m3', { color: 0xa0a6a6, k: 1.9, racks: 3 });
export const buildB1B = swing('b1b', { color: 0x4a4e52, k: 2.0, nacelles: true, racks: 3 });

/** B-52G/H: the long fuselage, the high wing drooping to its tips, eight engines in pairs, the tall fin. */
export const buildB52 = (mats) => jet('b52', mats, () => {
  const c = { color: 0x5a6058, ...C };
  const wing = [[1.0, 4.1, 2.0, 4.0, 0.35], [10, 3.8, -4.5, 2.4, 0.2], [28, 3.3, -13, 0.9, 0.06]];
  const pods = [7, 14].map((x) => { const [, y, z] = along(wing, x); return { x, y: y - 1.3, z: z + 2 }; });
  return {
    body: M([
      body([[24, 2.8, 0.1, 0.1], [23, 2.8, 0.9, 0.9], [20, 3.0, 1.3, 1.4], [0, 3.0, 1.3, 1.5, 3], [-14, 3.2, 1.0, 1.2], [-22, 3.6, 0.5, 0.6], [-24, 3.8, 0.15, 0.2]], c),
      body([[20.5, 4.1, 0.05, 0.05], [19.8, 4.4, 0.9, 0.35], [18.6, 4.5, 0.9, 0.35], [18, 4.3, 0.4, 0.15]], { color: GLASS }),
      ...pair((s) => surface(wing.map(([x, ...v]) => [s * x, ...v]), c)),
      ...pair((s) => pods.map(({ x, y, z }) => [
        body([[z + 2.6, y, 0.85, 0.55], [z + 2.0, y, 0.95, 0.62], [z - 2.0, y, 0.85, 0.55], [z - 2.8, y, 0.4, 0.3]], { x: s * x, ...c }),
        P.box(1.5, 0.9, 0.004, { x: s * x, y, z: z + 2.61, color: HOLE }),
        P.box(0.2, 1.1, 2.5, { x: s * x, y: y + 0.95, z, color: DARK }),
      ])),
      ...pair((s) => surface([[s * 1.0, 3.9, -21, 1.8, 0.2], [s * 8, 3.9, -23.5, 0.8, 0.08]], c)),
      fin([[3.9, -19.5, 3.5, 0.25], [8, -21.5, 2.3, 0.15], [11, -22.5, 1.5, 0.1]], c),
    ]),
    marks: M([...pair((s) => roundel(s * 0.17, 7.5, -21.3, 0.8)), ...pair((s) => roundel(s * 19, along(wing, 19)[1] + 0.13, along(wing, 19)[2], 1.0, true))]),
  };
}, [0, 1.6, 0]);
