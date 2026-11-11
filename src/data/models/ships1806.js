// 1806 sailing warships (data/units1806/ships.js): wooden hulls, gun decks, three masts of square sails.
// The ship floats with y = 0 at the waterline, bow toward +z. Each mast's yards and sails are their own
// group (`rig`): braced round to the wind and filled by it, luffing head to wind (sailRig.animate);
// the whole ship heels to leeward with the wind on her beam.
//   the 74 (third rate)  two gun decks, the backbone of the line; Royal Navy in Nelson's black and ochre
//                         with the chequer of ports, the French in black and red ochre with the tricolour
import * as THREE from 'three';
import { P, merge, loft } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';
import { offWind } from '../../entities/sailing.js';
import { wind } from '../../world/Wind.js';

const BLACK = 0x1c1a17;
const WOOD = 0x6e5236;       // bright work, masts, yards
const DECKW = 0x9a8466;      // the planking
const SAIL = 0xe6dfcb;
const IRON = 0x262624;
const NAVY = {
  rn: { band: 0xc8973a, port: 0x2a1e14, lid: 0x9a2a20, stern: 0xc8973a, flag: 'rn' },   // black and ochre, the port lids' red insides
  fr: { band: 0x8e3322, port: 0x241812, lid: 0x8e3322, stern: 0x2e4a7a, flag: 'fr' },   // black and red ochre, the stern in blue
  fire: { band: 0x5a4a32, port: 0x1a1410, lid: 0x3a2e22, stern: 0x4a3c2c, flag: 'none' }, // a fireship: an old hull, the ports shut
};

/** The hull's half-width at z (bow +z), for a ship `len` long and `beam` wide: a bluff round bow, a full body, a narrower square stern. */
const halfWidth = (z, len, beam) => {
  const t = z / (len / 2);              // −1 stern … +1 bow
  if (t > 0.45) return (beam / 2) * Math.sqrt(Math.max(0.02, 1 - ((t - 0.45) / 0.55) ** 2));
  if (t < -0.6) return (beam / 2) * (0.78 + 0.22 * (1 + (t + 0.6) / 0.4));
  return beam / 2;
};

/** A square sail on its yard: `w` wide on the yard, `h` deep, a slight belly forward (bent along its depth). */
const square = (w, h, y) => [
  loft([[0, y - h, 0.25, w * 0.47, 0.06, 3], [0, y - h * 0.5, 0.9, w * 0.5, 0.06, 3], [0, y - 0.15, 0.25, w * 0.5, 0.06, 3]], { color: SAIL, surf: 'cloth' }, 6),
  P.cyl(0.22, 0.22, w * 1.08, { y, rz: Math.PI / 2, color: WOOD }, 6),                       // the yard
];

/**
 * A three-masted ship of the line. `o`: { len, beam, fb (upper deck above the water), draft, decks (gun
 * decks), ports (a side, a deck), masts [[z, height above the deck], fore … mizzen], navy }.
 */
function shipOfTheLine(o) {
  const { len, beam, fb, draft, decks, ports, masts, navy } = o;
  const c = NAVY[navy];
  const n = masts.length, sc = beam / 14.6, L = len / 52; // (two masts: a brig; the sizes from the 74's)
  const hull = [];
  // the hull: under water a rounded vee, above it the sides falling in toward the rail (tumblehome)
  const secs = (y, d, k, e) => {
    const out = [];
    for (let i = 0; i <= 20; i++) { const z = -len / 2 + (i / 20) * len; out.push([0, y, z, halfWidth(z, len, beam) * k, d, e]); }
    return out;
  };
  hull.push(loft(secs(-draft / 2, draft / 2 + 0.6, 0.94, 1.8), { color: 0x3a3228, surf: 'plate' }, 14));        // the bottom (coppered, foul)
  hull.push(loft(secs(fb / 2, fb / 2 + 0.2, 1, 3.2), { color: BLACK, surf: 'plate' }, 14));                       // the topsides
  // the gun deck bands and their ports: open, the guns run out, the lids raised (their red insides)
  for (let k = 0; k < decks; k++) {
    const y = fb - 1.9 - (decks - 1 - k) * 2.3; // (counted down from the upper deck)
    const run = len * 0.66, z0 = -len * 0.3;
    for (const s of [-1, 1]) {
      hull.push(P.box(0.08, 1.1, run, { x: s * (beam / 2 + 0.02), y, z: z0 + run / 2 - len * 0.02, color: c.band, surf: 'plate' }));
      for (let i = 0; i < ports; i++) {
        const z = z0 + (i + 0.5) * (run / ports);
        const hw = halfWidth(z, len, beam);
        hull.push(P.box(0.1, 0.75, 0.8, { x: s * (hw + 0.05), y, z, color: c.port }));
        hull.push(P.box(0.06, 0.72, 0.78, { x: s * (hw + 0.38), y: y + 0.62, z, rz: s * -0.9, color: c.lid }));    // the lid, swung up
        hull.push(P.cyl(0.13, 0.17, 1.4, { x: s * (hw + 0.5), y: y - 0.05, z, rz: Math.PI / 2, color: IRON }, 7));  // the gun's muzzle out of the port
      }
    }
  }
  // the decks, each to the hull's own plan (narrowing to the bow and the stern — boxes overhung her sides): the waist, the forecastle
  // and the quarterdeck raised (their bulwarks), the poop at the stern
  const plan = (z0, z1, n = 12) => Array.from({ length: n + 1 }, (_, i) => z0 + ((z1 - z0) * i) / n);
  const castle = (z0, z1, y, d, k) => loft(plan(z0, z1).map((z) => [0, y, z, halfWidth(z, len, beam) * k, d, 4]), { color: BLACK, surf: 'plate' }, 12);
  const plate = (z0, z1, y, k) => loft(plan(z0, z1).map((z) => [0, y, z, Math.max(0.3, halfWidth(z, len, beam) * k), 0.12, 6]), { color: DECKW, surf: 'deck' }, 12);
  hull.push(plate(-len * 0.48, len * 0.47, fb + 0.1, 0.93));
  hull.push(castle(len * 0.2, len * 0.47, fb + 1.0, 1.0, 0.97));     // forecastle
  hull.push(castle(-len * 0.5, -len * 0.08, fb + 1.2, 1.2, 0.98));   // quarterdeck
  hull.push(castle(-len * 0.5, -len * 0.3, fb + 2.9, 0.6, 0.95));    // poop
  hull.push(plate(-len * 0.48, -len * 0.1, fb + 2.42, 0.92));
  hull.push(plate(len * 0.21, len * 0.45, fb + 2.02, 0.9));
  for (const s of [-1, 1]) hull.push(P.box(0.15, 0.9, len * 0.3, { x: s * beam * 0.44, y: fb + 0.6, z: len * 0.03, color: c.band })); // the waist's rails
  // the stern: the gallery of windows across the transom, the quarter galleries on its sides
  hull.push(P.box(beam * 0.74, 3.6, 0.5, { y: fb + 1.6, z: -len / 2 - 0.05, color: c.stern }));
  for (let r = 0; r < 2; r++) for (let i = -3; i <= 3; i++) hull.push(P.box(0.9 * sc, 0.8, 0.12, { x: i * 1.35 * sc, y: fb + 0.8 + r * 1.6, z: -len / 2 - 0.35, color: 0x30383c }));
  for (const s of [-1, 1]) hull.push(P.box(0.6, 3.4, 3.2, { x: s * beam * 0.4, y: fb + 1.4, z: -len * 0.44, color: c.stern }));
  // the bow: the head and the figurehead, the bowsprit and the jib-boom out over it, the headsails
  hull.push(loft([[0, fb - 0.5, len / 2 - 1, 1.2, 1.4, 2.4], [0, fb + 0.3, len / 2 + 2.5, 0.6, 0.9, 2.4], [0, fb + 1.4, len / 2 + 4, 0.35, 0.5, 2]], { color: c.band }, 8));
  const sprit = (l, r, y0, z0, up) => P.cyl(r * 0.7, r, l, { y: y0 + Math.sin(up) * l / 2, z: z0 + Math.cos(up) * l / 2, rx: Math.PI / 2 - up, color: WOOD }, 8);
  hull.push(sprit(18 * L, 0.55 * sc, fb + 1, len / 2 - 2, 0.3), sprit(12 * L, 0.3 * sc, fb + 1 + Math.sin(0.3) * 15 * L, len / 2 - 2 + Math.cos(0.3) * 15 * L, 0.28));
  // the masts: lower mast, the top (a platform), topmast, topgallant; the shrouds down to the channels
  const rig = [];
  masts.forEach(([z, h], i) => {
    const sp = []; // this mast's spars, shrouds and stay: their own group (a mast that falls goes with its rigging)
    const r = (0.55 + (i === 1 ? 0.1 : 0)) * sc;
    sp.push(P.cyl(r * 0.8, r, h * 0.5, { y: fb + h * 0.25, z, color: WOOD }, 10));
    sp.push(P.cyl(r * 0.55, r * 0.7, h * 0.32, { y: fb + h * 0.5 + h * 0.15, z, color: WOOD }, 8));
    sp.push(P.cyl(r * 0.3, r * 0.45, h * 0.22, { y: fb + h * 0.82 + h * 0.09, z, color: WOOD }, 7));
    sp.push(P.box(beam * 0.32, 0.25, 3.2, { y: fb + h * 0.5, z, color: WOOD }));                       // the top
    for (const s of [-1, 1]) for (const dz of [-1.5, 0, 1.5]) { // the shrouds, from the channels to the top
      const a = new THREE.Vector3(s * (beam / 2 + 0.3), fb + 0.4, z + dz), b = new THREE.Vector3(s * beam * 0.15, fb + h * 0.5, z + dz * 0.3);
      const m = a.clone().add(b).multiplyScalar(0.5), l = a.distanceTo(b);
      sp.push(P.cyl(0.05, 0.05, l, { x: m.x, y: m.y, z: m.z, rz: Math.atan2(b.x - a.x, b.y - a.y) * -1, color: IRON }, 4));
    }
    sp.push(P.cyl(0.04, 0.04, len * 0.3, { y: fb + h * 0.75, z: z + (i < n - 1 ? len * 0.12 : -len * 0.12), rx: Math.PI / 2 - (i < n - 1 ? -0.9 : 0.9), color: IRON }, 4)); // a stay
    // the yards and sails, braced together: the course, the topsail, the topgallant (the mizzen: no course — the spanker)
    const w = beam * (n === 3 ? [1.45, 1.55, 1.05][i] : [1.45, 1.4][i]);
    const sails = [];
    if (i < n - 1 || n < 3) sails.push(...square(w, h * 0.2, h * 0.43)); // (a ship's mizzen: no course — the spanker; a brig's main has both)
    sails.push(...square(w * 0.78, h * 0.24, h * 0.73), ...square(w * 0.5, h * 0.14, h * 0.9));
    rig.push({ at: [0, fb, z], geo: merge(sails), spars: merge(sp), mast: i });
  });
  // the spanker on the mizzen: fore and aft, on its gaff and boom (it swings out to leeward, not braced)
  const [mz, mh] = masts[n - 1];
  rig.push({ at: [0, fb, mz], fore: true, mast: n - 1, geo: merge([
    loft([[0, mh * 0.12, -0.5, 0.06, 0.06, 2], [0, mh * 0.3, -6, 0.06, 0.06, 2], [0, mh * 0.42, -0.8, 0.06, 0.06, 2]], { color: SAIL, surf: 'cloth' }, 4),
    P.box(0.12, mh * 0.34, 9, { y: mh * 0.26, z: -5, color: SAIL, surf: 'cloth' }),
    P.cyl(0.18, 0.18, 11, { y: mh * 0.1, z: -5.5, rx: Math.PI / 2, color: WOOD }, 6),
  ]) });
  // the jib and the fore topmast staysail on the stays to the bowsprit
  // the headsails, each along its stay: from a foremast head down to the bowsprit (the staysail) and the jib-boom's end (the jib)
  const [fz, fh] = masts[0];
  const along = (z0, y0, z1, y1, w) => {
    const l = Math.hypot(z1 - z0, y1 - y0), th = Math.atan2(z0 - z1, y0 - y1); // (its long side down the stay)
    return P.box(0.08, l * 0.74, w, { y: (y0 + y1) / 2 - Math.sin(th) * w * 0.5, z: (z0 + z1) / 2 - Math.cos(th) * w * 0.5, rx: th, color: SAIL, surf: 'cloth' });
  };
  const spritEnd = [len / 2 - 2 + Math.cos(0.3) * 17 * L, fb + 1 + Math.sin(0.3) * 17 * L], boomEnd = [len / 2 - 2 + (Math.cos(0.3) * 15 + Math.cos(0.28) * 11) * L, fb + 1 + (Math.sin(0.3) * 15 + Math.sin(0.28) * 11) * L];
  hull.push(along(fz, fb + fh * 0.5, spritEnd[0], spritEnd[1], 2.2), along(fz, fb + fh * 0.82, boomEnd[0], boomEnd[1], 2.6));
  for (const [ez, ey, top] of [[...spritEnd, 0.5], [...boomEnd, 0.82]]) { // the stays themselves
    const y0 = fb + fh * top, l = Math.hypot(ez - fz, ey - y0);
    hull.push(P.cyl(0.05, 0.05, l, { y: (y0 + ey) / 2, z: (fz + ez) / 2, rx: Math.atan2(ez - fz, y0 - ey) * -1 + Math.PI, color: IRON }, 4));
  }
  // the colours: at the stern, and the masthead pennant
  const flag = c.flag === 'none' ? [P.box(0.05, 0.5, 0.5, { y: fb + 7.5, z: -len / 2 - 2, color: 0x2a2a2a })] : c.flag === 'rn'
    ? [P.box(0.05, 2.4, 4, { y: fb + 7.5, z: -len / 2 - 3, color: 0xe8e8e2 }), P.box(0.06, 2.4, 0.5, { y: fb + 7.5, z: -len / 2 - 3, color: 0xb8221e }), P.box(0.06, 0.45, 4, { y: fb + 7.5, z: -len / 2 - 3, color: 0xb8221e }), P.box(0.07, 1.2, 2, { y: fb + 8.1, z: -len / 2 - 2, color: 0x1f2e6e })]
    : [P.box(0.05, 2.4, 1.33, { y: fb + 7.5, z: -len / 2 - 1.9, color: 0x1f3a8e }), P.box(0.05, 2.4, 1.33, { y: fb + 7.5, z: -len / 2 - 3.2, color: 0xeeeeea }), P.box(0.05, 2.4, 1.33, { y: fb + 7.5, z: -len / 2 - 4.5, color: 0xc8221e })];
  hull.push(P.cyl(0.12, 0.15, 7, { y: fb + 5, z: -len / 2 - 1, rx: -0.3, color: WOOD }, 6));
  const colours = merge(flag); // (their own: they come down when she strikes)
  hull.push(P.box(0.04, 0.25, 6, { y: fb + masts[Math.min(1, n - 1)][1] + 0.2, z: masts[Math.min(1, n - 1)][0] - 3, color: c.flag === 'rn' ? 0xb8221e : 0x1f3a8e }));
  return { fixed: merge(hull), rig, colours, len, beam, mastCount: n };
}

/** The model's builder: the hull, and the rig groups that answer the wind (UnitStack's animate hook). */
function sailRig(describe) {
  let d = null;
  return (mats) => {
    d ??= describe();
    const root = new THREE.Group();
    const body = new THREE.Group();   // pitch and roll on the swell, the heel to leeward
    root.add(body);
    meshAdder(body)(d.fixed, mats.body);
    const masts = Array.from({ length: d.mastCount }, () => { const m = new THREE.Group(); body.add(m); return m; }); // a mast and all on it: hidden when it goes by the board
    const rig = d.rig.map((r) => {
      if (r.spars) meshAdder(masts[r.mast])(r.spars, mats.body);
      const g = new THREE.Group();
      g.position.set(...r.at);
      const s = new THREE.Group();
      meshAdder(s)(r.geo, mats.body);
      g.add(s);
      masts[r.mast].add(g);
      return { g, s, fore: !!r.fore };
    });
    const colours = new THREE.Group();
    meshAdder(colours)(d.colours, mats.body);
    body.add(colours);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(d.beam / 2 + 1, 2, 0);
    body.add(muzzle);
    const phase = Math.random() * 10;
    let heel = 0, brace = 0;
    return {
      root,
      muzzle,
      animate(u, dt, t) {
        const off = offWind(u.yaw ?? 0), b = Math.abs(off);          // where the wind comes from, off her bow
        const flog = b < 1.05 || u.struck ? Math.sin(t * 9 + phase) * 0.06 : 0; // head to wind, or her sheets let fly when she strikes: the sails flog (a shiver of the yards — never a non-uniform scale: Babylon draws nothing for one made mid-battle)
        const want = b < 1.05 ? 0 : Math.sign(off) * Math.min(0.6, (Math.PI - b) * 0.45); // braced round: square before the wind, sharp up close-hauled
        brace += (want - brace) * Math.min(1, dt * 0.6);
        heel += (-Math.sign(off) * Math.sin(Math.min(b, Math.PI / 2)) * 0.07 * Math.min(1.5, wind.speed / 7) * (b < 1.05 ? 0.2 : 1) - heel) * Math.min(1, dt * 0.5);
        for (const r of rig) {
          if (r.fore) r.g.rotation.y = Math.sign(off) * Math.min(0.9, (Math.PI - b) * 0.55);  // the spanker out to leeward
          else r.g.rotation.y = brace + flog;
        }
        for (let i = 0; i < masts.length; i++) masts[i].visible = u.masts?.[i] !== false;
        colours.visible = !u.struck && !u.prize; // (struck: hauled down; a prize: not her own to fly)
        const sea = u.seaK ?? 1;
        body.rotation.set(Math.sin(t * 0.5 + phase) * 0.014 * sea + (u.trim ?? 0), 0, Math.sin(t * 0.4 + phase * 1.7) * 0.025 * sea + heel + (u.list ?? 0));
        body.position.y = Math.sin(t * 0.65 + phase) * 0.3 * sea;
      },
    };
  };
}

/**
 * An oared gunboat: an open boat with one lug sail, a heavy gun in the bow, sweeps along her sides (she rows
 * when the wind fails). Low, cheap and hard to hit.
 */
function gunboat(navy) {
  const c = NAVY[navy];
  const len = 18, beam = 4.6;
  const parts = [
    loft(Array.from({ length: 11 }, (_, i) => { const z = -len / 2 + (i / 10) * len; return [0, 0.15, z, halfWidth(z, len, beam), 0.95, 2.2]; }), { color: 0x4a3a2a, surf: 'plate' }, 10),
    loft(Array.from({ length: 11 }, (_, i) => { const z = -len * 0.45 + (i / 10) * len * 0.9; return [0, 0.9, z, Math.max(0.2, halfWidth(z, len, beam) * 0.9), 0.08, 6]; }), { color: DECKW, surf: 'deck' }, 10), // (her deck to the boat's own plan)
    P.box(0.12, 0.4, len * 0.7, { x: beam * 0.46, y: 1.15, color: c.band }), P.box(0.12, 0.4, len * 0.7, { x: -beam * 0.46, y: 1.15, color: c.band }),
    P.box(1.4, 0.7, 2.2, { y: 1.3, z: len * 0.3, color: WOOD }),                               // the gun's slide…
    P.cyl(0.24, 0.3, 3, { y: 1.75, z: len * 0.38, rx: Math.PI / 2, color: IRON }, 8),        // …and the long 24-pounder on it
    P.cyl(0.18, 0.22, 12, { y: 6.9, z: 1, color: WOOD }, 8),                                   // the mast
  ];
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) parts.push(P.cyl(0.06, 0.06, 5.5, { x: s * (beam / 2 + 1.6), y: 0.9, z: -5 + i * 1.8, rz: s * 1.2, color: WOOD }, 4)); // the sweeps
  const sail = merge([P.box(0.08, 7, 6, { y: 7, z: -0.6, rx: 0.08, color: SAIL, surf: 'cloth' }), P.cyl(0.1, 0.1, 7.5, { y: 10.4, z: -0.6, rx: Math.PI / 2 - 0.25, color: WOOD }, 5)]);
  const colours = merge(c.flag === 'rn' ? [P.box(0.05, 1, 1.6, { y: 2.6, z: -len / 2 - 0.8, color: 0xb8221e })] : [P.box(0.05, 1, 0.55, { y: 2.6, z: -len / 2 - 0.5, color: 0x1f3a8e }), P.box(0.05, 1, 0.55, { y: 2.6, z: -len / 2 - 1.05, color: 0xeeeeea }), P.box(0.05, 1, 0.55, { y: 2.6, z: -len / 2 - 1.6, color: 0xc8221e })]);
  parts.push(P.cyl(0.05, 0.05, 2.4, { y: 1.9, z: -len / 2, color: WOOD }, 4));
  return { fixed: merge(parts), rig: [{ at: [0, 0, 1], fore: true, mast: 0, geo: sail }], colours, len, beam, mastCount: 1 };
}

const FIRST_RATE = { len: 57, beam: 16, fb: 8.8, draft: 7, decks: 3, ports: 15, masts: [[17, 54], [1, 60], [-15, 42]] };
const FRIGATE = { len: 46, beam: 12, fb: 4.6, draft: 5, decks: 1, ports: 13, masts: [[13, 43], [0, 48], [-12, 34]] };
const BRIG = { len: 30, beam: 9, fb: 3.2, draft: 3.8, decks: 1, ports: 8, masts: [[6.5, 30], [-5, 33]] };
export const buildFirstRateRN = sailRig(() => shipOfTheLine({ ...FIRST_RATE, navy: 'rn' }));
export const buildFirstRateFR = sailRig(() => shipOfTheLine({ ...FIRST_RATE, navy: 'fr', len: 60, beam: 16.4 }));
export const buildFrigateRN = sailRig(() => shipOfTheLine({ ...FRIGATE, navy: 'rn' }));
export const buildFrigateFR = sailRig(() => shipOfTheLine({ ...FRIGATE, navy: 'fr', len: 48 }));
export const buildBrigRN = sailRig(() => shipOfTheLine({ ...BRIG, navy: 'rn' }));
export const buildBrigFR = sailRig(() => shipOfTheLine({ ...BRIG, navy: 'fr' }));
export const buildFireship = sailRig(() => shipOfTheLine({ ...BRIG, navy: 'fire' })); // (an old brig, her ports nailed shut and her hold full of pitch and powder)
export const buildGunboatRN = sailRig(() => gunboat('rn'));
export const buildGunboatFR = sailRig(() => gunboat('fr'));

const SEVENTY_FOUR = { len: 52, beam: 14.6, fb: 6.2, draft: 6.4, decks: 2, ports: 14, masts: [[15, 46], [0.5, 52], [-14, 36]] };
export const buildSeventyFourRN = sailRig(() => shipOfTheLine({ ...SEVENTY_FOUR, navy: 'rn' }));
export const buildSeventyFourFR = sailRig(() => shipOfTheLine({ ...SEVENTY_FOUR, navy: 'fr', len: 55, beam: 15.2 })); // (the French 74s: bigger, finer)
