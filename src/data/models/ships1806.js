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
    const y = 1.6 + k * 2.3;
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
  // the decks: the waist, the forecastle and the quarterdeck raised, the poop at the stern
  hull.push(P.box(beam * 0.88, 0.3, len * 0.9, { y: fb, z: 0, color: DECKW, surf: 'deck' }));
  hull.push(loft([[0, fb + 1.0, len * 0.22, halfWidth(len * 0.22, len, beam) * 0.96, 1.0, 3.5], [0, fb + 1.0, len * 0.44, halfWidth(len * 0.44, len, beam) * 0.9, 1.0, 3.5]], { color: BLACK, surf: 'plate' }, 10)); // forecastle
  hull.push(loft([[0, fb + 1.2, -len * 0.5, beam * 0.39, 1.2, 4], [0, fb + 1.2, -len * 0.08, beam * 0.47, 1.2, 4]], { color: BLACK, surf: 'plate' }, 10)); // quarterdeck
  hull.push(loft([[0, fb + 2.9, -len * 0.5, beam * 0.36, 0.6, 4], [0, fb + 2.9, -len * 0.3, beam * 0.4, 0.6, 4]], { color: BLACK, surf: 'plate' }, 10)); // poop
  hull.push(P.box(beam * 0.84, 0.2, len * 0.36, { y: fb + 2.3, z: -len * 0.29, color: DECKW, surf: 'deck' }));
  hull.push(P.box(beam * 0.7, 0.2, len * 0.2, { y: fb + 2.1, z: len * 0.33, color: DECKW, surf: 'deck' }));
  for (const s of [-1, 1]) hull.push(P.box(0.15, 0.9, len * 0.3, { x: s * beam * 0.44, y: fb + 0.6, z: len * 0.03, color: c.band })); // the waist's rails
  // the stern: the gallery of windows across the transom, the quarter galleries on its sides
  hull.push(P.box(beam * 0.74, 3.6, 0.5, { y: fb + 1.6, z: -len / 2 - 0.05, color: c.stern }));
  for (let r = 0; r < 2; r++) for (let i = -3; i <= 3; i++) hull.push(P.box(0.9, 0.8, 0.12, { x: i * 1.35, y: fb + 0.8 + r * 1.6, z: -len / 2 - 0.35, color: 0x30383c }));
  for (const s of [-1, 1]) hull.push(P.box(0.6, 3.4, 3.2, { x: s * beam * 0.4, y: fb + 1.4, z: -len * 0.44, color: c.stern }));
  // the bow: the head and the figurehead, the bowsprit and the jib-boom out over it, the headsails
  hull.push(loft([[0, fb - 0.5, len / 2 - 1, 1.2, 1.4, 2.4], [0, fb + 0.3, len / 2 + 2.5, 0.6, 0.9, 2.4], [0, fb + 1.4, len / 2 + 4, 0.35, 0.5, 2]], { color: c.band }, 8));
  const sprit = (l, r, y0, z0, up) => P.cyl(r * 0.7, r, l, { y: y0 + Math.sin(up) * l / 2, z: z0 + Math.cos(up) * l / 2, rx: Math.PI / 2 - up, color: WOOD }, 8);
  hull.push(sprit(18, 0.55, fb + 1, len / 2 - 2, 0.3), sprit(12, 0.3, fb + 1 + Math.sin(0.3) * 15, len / 2 - 2 + Math.cos(0.3) * 15, 0.28));
  // the masts: lower mast, the top (a platform), topmast, topgallant; the shrouds down to the channels
  const rig = [];
  masts.forEach(([z, h], i) => {
    const sp = []; // this mast's spars, shrouds and stay: their own group (a mast that falls goes with its rigging)
    const r = 0.55 + (i === 1 ? 0.1 : 0);
    sp.push(P.cyl(r * 0.8, r, h * 0.5, { y: fb + h * 0.25, z, color: WOOD }, 10));
    sp.push(P.cyl(r * 0.55, r * 0.7, h * 0.32, { y: fb + h * 0.5 + h * 0.15, z, color: WOOD }, 8));
    sp.push(P.cyl(r * 0.3, r * 0.45, h * 0.22, { y: fb + h * 0.82 + h * 0.09, z, color: WOOD }, 7));
    sp.push(P.box(beam * 0.32, 0.25, 3.2, { y: fb + h * 0.5, z, color: WOOD }));                       // the top
    for (const s of [-1, 1]) for (const dz of [-1.5, 0, 1.5]) { // the shrouds, from the channels to the top
      const a = new THREE.Vector3(s * (beam / 2 + 0.3), fb + 0.4, z + dz), b = new THREE.Vector3(s * beam * 0.15, fb + h * 0.5, z + dz * 0.3);
      const m = a.clone().add(b).multiplyScalar(0.5), l = a.distanceTo(b);
      sp.push(P.cyl(0.05, 0.05, l, { x: m.x, y: m.y, z: m.z, rz: Math.atan2(b.x - a.x, b.y - a.y) * -1, color: IRON }, 4));
    }
    sp.push(P.cyl(0.04, 0.04, len * 0.3, { y: fb + h * 0.75, z: z + (i < 2 ? len * 0.12 : -len * 0.12), rx: Math.PI / 2 - (i < 2 ? -0.9 : 0.9), color: IRON }, 4)); // a stay
    // the yards and sails, braced together: the course, the topsail, the topgallant (the mizzen: no course — the spanker)
    const w = beam * (i === 1 ? 1.55 : i === 0 ? 1.45 : 1.05);
    const sails = [];
    if (i < 2) sails.push(...square(w, h * 0.2, h * 0.43));
    sails.push(...square(w * 0.78, h * 0.24, h * 0.73), ...square(w * 0.5, h * 0.14, h * 0.9));
    rig.push({ at: [0, fb, z], geo: merge(sails), spars: merge(sp), mast: i });
  });
  // the spanker on the mizzen: fore and aft, on its gaff and boom (it swings out to leeward, not braced)
  const [mz, mh] = masts[2];
  rig.push({ at: [0, fb, mz], fore: true, mast: 2, geo: merge([
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
  const spritEnd = [len / 2 - 2 + Math.cos(0.3) * 17, fb + 1 + Math.sin(0.3) * 17], boomEnd = [len / 2 - 2 + Math.cos(0.3) * 15 + Math.cos(0.28) * 11, fb + 1 + Math.sin(0.3) * 15 + Math.sin(0.28) * 11];
  hull.push(along(fz, fb + fh * 0.5, spritEnd[0], spritEnd[1], 2.2), along(fz, fb + fh * 0.82, boomEnd[0], boomEnd[1], 2.6));
  for (const [ez, ey, top] of [[...spritEnd, 0.5], [...boomEnd, 0.82]]) { // the stays themselves
    const y0 = fb + fh * top, l = Math.hypot(ez - fz, ey - y0);
    hull.push(P.cyl(0.05, 0.05, l, { y: (y0 + ey) / 2, z: (fz + ez) / 2, rx: Math.atan2(ez - fz, y0 - ey) * -1 + Math.PI, color: IRON }, 4));
  }
  // the colours: at the stern, and the masthead pennant
  const flag = c.flag === 'rn'
    ? [P.box(0.05, 2.4, 4, { y: fb + 7.5, z: -len / 2 - 3, color: 0xe8e8e2 }), P.box(0.06, 2.4, 0.5, { y: fb + 7.5, z: -len / 2 - 3, color: 0xb8221e }), P.box(0.06, 0.45, 4, { y: fb + 7.5, z: -len / 2 - 3, color: 0xb8221e }), P.box(0.07, 1.2, 2, { y: fb + 8.1, z: -len / 2 - 2, color: 0x1f2e6e })]
    : [P.box(0.05, 2.4, 1.33, { y: fb + 7.5, z: -len / 2 - 1.9, color: 0x1f3a8e }), P.box(0.05, 2.4, 1.33, { y: fb + 7.5, z: -len / 2 - 3.2, color: 0xeeeeea }), P.box(0.05, 2.4, 1.33, { y: fb + 7.5, z: -len / 2 - 4.5, color: 0xc8221e })];
  hull.push(P.cyl(0.12, 0.15, 7, { y: fb + 5, z: -len / 2 - 1, rx: -0.3, color: WOOD }, 6));
  const colours = merge(flag); // (their own: they come down when she strikes)
  hull.push(P.box(0.04, 0.25, 6, { y: fb + masts[1][1] + 0.2, z: masts[1][0] - 3, color: c.flag === 'rn' ? 0xb8221e : 0x1f3a8e }));
  return { fixed: merge(hull), rig, colours, len, beam };
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
    const masts = [0, 1, 2].map(() => { const m = new THREE.Group(); body.add(m); return m; }); // a mast and all on it: hidden when it goes by the board
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
        const fill = b < 1.05 ? 0.25 + 0.2 * Math.sin(t * 9 + phase) : Math.min(1.2, 0.5 + wind.speed / 10); // head to wind: the sails flog
        const want = b < 1.05 ? 0 : Math.sign(off) * Math.min(0.6, (Math.PI - b) * 0.45); // braced round: square before the wind, sharp up close-hauled
        brace += (want - brace) * Math.min(1, dt * 0.6);
        heel += (-Math.sign(off) * Math.sin(Math.min(b, Math.PI / 2)) * 0.07 * Math.min(1.5, wind.speed / 7) * (b < 1.05 ? 0.2 : 1) - heel) * Math.min(1, dt * 0.5);
        for (const r of rig) {
          if (r.fore) r.g.rotation.y = Math.sign(off) * Math.min(0.9, (Math.PI - b) * 0.55);  // the spanker out to leeward
          else r.g.rotation.y = brace;
          r.s.scale.z = fill;
        }
        for (let i = 0; i < 3; i++) masts[i].visible = u.masts?.[i] !== false;
        colours.visible = !u.struck;
        if (u.struck) for (const r of rig) r.s.scale.z = 0.2 + 0.15 * Math.sin(t * 7 + phase); // (her sails let fly)
        const sea = u.seaK ?? 1;
        body.rotation.set(Math.sin(t * 0.5 + phase) * 0.014 * sea + (u.trim ?? 0), 0, Math.sin(t * 0.4 + phase * 1.7) * 0.025 * sea + heel + (u.list ?? 0));
        body.position.y = Math.sin(t * 0.65 + phase) * 0.3 * sea;
      },
    };
  };
}

const SEVENTY_FOUR = { len: 52, beam: 14.6, fb: 6.2, draft: 6.4, decks: 2, ports: 14, masts: [[15, 46], [0.5, 52], [-14, 36]] };
export const buildSeventyFourRN = sailRig(() => shipOfTheLine({ ...SEVENTY_FOUR, navy: 'rn' }));
export const buildSeventyFourFR = sailRig(() => shipOfTheLine({ ...SEVENTY_FOUR, navy: 'fr', len: 55, beam: 15.2 })); // (the French 74s: bigger, finer)
