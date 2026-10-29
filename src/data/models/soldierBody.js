// The human figure both factions' infantry share, swept from cross-sections (units/geometry.js
// loft) instead of capsules: a head with a face (deep-set eyes under the brow ridge, nose, lips,
// ears, square jaw; stubble and eye shadow painted into the skin), neck, a trunk with chest,
// waist and hips, shoulders, tapered arms in the weapon hold with hands whose fingers and thumb
// wrap the weapon, thighs
// with a knee, shins with a calf, and boots with heel and toe. Uniform, gear, headgear and
// weapons come from natoSoldier.js / pactSoldier.js on top. Proportions follow the rig both
// models report (hips at 0.96 m, 0.48 m leg segments, shoulders at 1.47 m), so the animation in
// render/StackRenderer.js is unchanged.
import * as THREE from 'three';
import { P, loft, limb, pair } from '../units/geometry.js';

export const SKIN = 0xb38f74;   // weathered, outdoors skin (the instance tint varies it per man)
const EYE = 0x2a2420;
const BROW = 0x3e3024;

/** Field glasses hung on the chest. */
export function binoculars(color) {
  return [...pair((s) => P.cyl(0.03, 0.026, 0.1, { x: s * 0.035, y: 1.4, z: 0.16, rx: Math.PI / 2, color }, 10)), P.box(0.03, 0.03, 0.05, { y: 1.4, z: 0.15, color })];
}

/** Skin shading painted into the head's vertex colours: what makes a face read at a distance. */
function paintFace(g, skin) {
  const p = g.attributes.position, c = g.attributes.color;
  const base = new THREE.Color(skin), stub = base.clone().multiplyScalar(0.68).lerp(new THREE.Color(0x3e3a36), 0.3);
  const warm = base.clone().lerp(new THREE.Color(0xc0705a), 0.25), col = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    col.copy(base);
    if (z > 0.0 && y < 1.71 && y > 1.6) col.lerp(stub, Math.min(1, (1.715 - y) / 0.03));       // shaved jaw: stubble shadow
    if (z > 0.04 && Math.abs(x) > 0.035 && Math.abs(x) < 0.08 && y > 1.71 && y < 1.745) col.lerp(warm, 0.5); // cheeks
    for (const sx of [-0.033, 0.033]) {                                                                   // eye sockets
      const d = Math.hypot(x - sx, (y - 1.752) * 1.4);
      if (z > 0.04 && d < 0.03) col.multiplyScalar(0.62 + 0.38 * (d / 0.03));
    }
    if (y > 1.79) col.multiplyScalar(1.05);                                                               // forehead catches the light
    if (y < 1.645) col.multiplyScalar(0.85);                                                              // under the chin, the neck
    c.setXYZ(i, col.r, col.g, col.b);
  }
  return g;
}

/**
 * Head, face and neck. Crown at ~1.86 m, chin at ~1.64 m, facing +z: the skull and jaw swept from
 * sections with a flatter face, cheekbones and a square jaw; the brow ridge over deep-set eyes
 * (whites, irises, upper lids), the nose with its bridge and nostrils, the lips, the ears with
 * their rims, the Adam's apple; stubble, cheeks and eye shadow painted into the skin.
 */
export function head(skin = SKIN) {
  const sk = new THREE.Color(skin);
  const lip = '#' + sk.clone().lerp(new THREE.Color(0x8a4a40), 0.45).getHexString();
  const dark = '#' + sk.clone().multiplyScalar(0.78).getHexString();
  const H = (c) => parseInt(String(c).slice(1), 16);
  const skull = loft([
    [0, 1.58, 0.0, 0.054, 0.058, 2],
    [0, 1.625, 0.002, 0.056, 0.06, 2],              // neck
    [0, 1.645, 0.03, 0.054, 0.056, 2.4],
    [0, 1.655, 0.042, 0.052, 0.05, 2.8],            // the chin
    [0, 1.672, 0.028, 0.074, 0.076, 3.0],           // square jaw
    [0, 1.695, 0.014, 0.082, 0.09, 2.8],
    [0, 1.72, 0.008, 0.086, 0.097, 2.6],
    [0, 1.742, 0.005, 0.09, 0.1, 2.4],              // cheekbones
    [0, 1.765, 0.0, 0.088, 0.102, 2.2],             // eyes, temples
    [0, 1.79, -0.004, 0.087, 0.103, 2.1],           // brow
    [0, 1.82, -0.01, 0.08, 0.096, 2.05],
    [0, 1.845, -0.014, 0.062, 0.076, 2],
    [0, 1.862, -0.016, 0.03, 0.035, 2],             // crown
  ], {
    color: skin,
    warp: (v) => {
      // flatten the face a little and set the eyes back under the brow
      if (v.z > 0.05) v.z = 0.05 + (v.z - 0.05) * 0.82;
      for (const sx of [-0.033, 0.033]) {
        const d = Math.hypot(v.x - sx, (v.y - 1.758) * 1.3);
        if (v.z > 0.05 && d < 0.03) v.z -= 0.01 * (1 - d / 0.03);
      }
    },
  }, 18);
  paintFace(skull, skin);
  return [
    skull,
    // brow ridge and brows over the eyes
    loft([[-0.058, 1.778, 0.078, 0.012, 0.01, 2], [0, 1.78, 0.091, 0.012, 0.012, 2], [0.058, 1.778, 0.078, 0.012, 0.01, 2]], { color: skin }, 6),
    ...pair((s) => P.box(0.038, 0.012, 0.012, { x: s * 0.034, y: 1.777, z: 0.09, rz: s * -0.1, ry: s * -0.25, color: BROW })),
    // eyes: whites, irises, the upper lids over them
    ...pair((s) => P.sphere(0.0125, { x: s * 0.034, y: 1.758, z: 0.073, sx: 1.4, sy: 0.72, color: 0xcfc6b8 }, 8, 6)),
    ...pair((s) => P.sphere(0.0072, { x: s * 0.034, y: 1.757, z: 0.083, color: EYE }, 6, 5)),
    ...pair((s) => P.box(0.03, 0.006, 0.012, { x: s * 0.033, y: 1.766, z: 0.081, ry: s * -0.2, color: H(dark) })),
    // the nose: bridge down to the tip, nostrils
    loft([[0, 1.77, 0.088, 0.009, 0.006, 2], [0, 1.745, 0.1, 0.011, 0.01, 2], [0, 1.727, 0.112, 0.015, 0.014, 2], [0, 1.718, 0.106, 0.016, 0.01, 2]], { color: skin }, 8),
    ...pair((s) => P.sphere(0.009, { x: s * 0.012, y: 1.718, z: 0.1, color: skin }, 6, 4)),
    // mouth: lips and the line between them
    loft([[-0.022, 1.693, 0.088, 0.006, 0.005, 2], [0, 1.694, 0.096, 0.007, 0.007, 2], [0.022, 1.693, 0.088, 0.006, 0.005, 2]], { color: H(lip) }, 6),
    P.box(0.036, 0.0025, 0.006, { y: 1.689, z: 0.095, color: 0x3a2622 }),
    loft([[-0.018, 1.684, 0.087, 0.005, 0.005, 2], [0, 1.683, 0.093, 0.007, 0.007, 2], [0.018, 1.684, 0.087, 0.005, 0.005, 2]], { color: H(lip) }, 6),
    // ears: the shell and its rim, the lobe
    ...pair((s) => loft([[s * 0.088, 1.725, -0.012, 0.01, 0.014, 2], [s * 0.09, 1.75, -0.016, 0.012, 0.024, 2], [s * 0.088, 1.775, -0.02, 0.01, 0.018, 2]], { color: skin }, 8)),
    ...pair((s) => P.sphere(0.008, { x: s * 0.086, y: 1.718, z: -0.008, color: skin }, 6, 4)),
    // Adam's apple
    P.sphere(0.012, { y: 1.625, z: 0.05, sy: 1.4, color: H(dark) }, 6, 5),
  ];
}

/**
 * Trunk from the crotch to the base of the neck, plus the shoulder caps. `cut` (y) splits the
 * colouring: below it `lower` (trousers), above it `upper` (jacket); `tail` drops the jacket
 * hem over the trousers. `broad` widens the shoulders (body armour, padding).
 */
export function trunk({ upper, lower = upper, camoUpper = 0, camoLower = 0, cut = 1.05, broad = 1 }) {
  const ring = (y, w, d, z = 0, e = 2.5) => [0, y, z, w, d, e];
  const below = [ring(0.88, 0.11, 0.1), ring(0.92, 0.172, 0.118), ring(0.99, 0.185, 0.124), ring(cut + 0.01, 0.18, 0.12)];
  const above = [
    ring(cut - 0.03, 0.187, 0.127),                    // jacket hem, a little proud of the trousers
    ring(1.1, 0.176, 0.118),                          // waist
    ring(1.2, 0.184, 0.124, 0.005),
    ring(1.31, 0.2 * broad, 0.136, 0.012),          // chest
    ring(1.41, 0.214 * broad, 0.138, 0.006),
    ring(1.48, 0.222 * broad, 0.122, -0.004, 2.8),       // across the shoulders
    ring(1.535, 0.165 * broad, 0.1, -0.01, 2.4),
    ring(1.575, 0.075, 0.068, -0.006, 2),             // root of the neck
  ];
  return [
    loft(below, { color: lower, camo: camoLower }, 12),
    loft(above, { color: upper, camo: camoUpper }, 12),
    ...pair((s) => P.sphere(0.082, { x: s * 0.2 * broad, y: 1.465, z: -0.005, sx: 1.05, sy: 0.8, color: upper, camo: camoUpper }, 9, 7)), // deltoids
  ];
}

// the weapon hold every infantry weapon is drawn for: right hand on the grip, left under the fore-end
const R_SHOULDER = [0.215, 1.46, -0.01];
const R_ELBOW = [0.255, 1.215, 0.0];
const R_HAND = [0.2, 1.255, 0.3];
const L_SHOULDER = [-0.215, 1.46, -0.01];
const L_ELBOW = [-0.1, 1.24, 0.22];
const L_HAND = [0.165, 1.28, 0.5];

const vadd = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vnorm = (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
/** Turn `v` about the unit axis `k` by `t` (Rodrigues). */
const vrot = (v, k, t) => {
  const c = Math.cos(t), s = Math.sin(t), d = v[0] * k[0] + v[1] * k[1] + v[2] * k[2], x = vcross(k, v);
  return [v[0] * c + x[0] * s + k[0] * d * (1 - c), v[1] * c + x[1] * s + k[1] * d * (1 - c), v[2] * c + x[2] * s + k[2] * d * (1 - c)];
};

/**
 * A hand gripping round a bar: the back of the hand from the wrist along `dir`, the palm facing
 * `palm`; four fingers in two joints curled round the grip, the thumb wrapped over from the side.
 */
function hand(at, dir, palm, skin, glove, side = 1) {
  const c = glove ?? skin;
  const d = vnorm(dir);
  const n = vnorm(palm);
  const w = vnorm(vcross(n, d)).map((v) => v * side);        // across the knuckles
  const knuckles = vadd(at, d, 0.075);
  const parts = [
    // the palm: wider at the knuckles, thick at the heel of the hand
    loft([vadd(at, d, -0.005), vadd(at, d, 0.035), vadd(at, d, 0.075)].map((p, i) => [...p, [0.03, 0.04, 0.042][i], [0.018, 0.016, 0.013][i], 2.6]), { color: c }, 8),
  ];
  const axis = w;                                              // fingers curl about the knuckle line
  for (let f = 0; f < 4; f++) {
    const off = (f - 1.5) * 0.0195;
    const root = vadd(knuckles, w, off);
    const len1 = [0.034, 0.038, 0.036, 0.03][f], len2 = [0.03, 0.033, 0.031, 0.026][f];
    const d1 = vrot(d, axis, 1.2 * side);                      // first joint bends toward the palm…
    const mid = vadd(root, d1, len1);
    const d2 = vrot(d1, axis, 1.3 * side);                     // …the second wraps round the grip
    const tip = vadd(mid, d2, len2);
    const r = f === 3 ? 0.0085 : 0.0095;
    parts.push(limb(root, mid, [[0, r, r], [1, r * 0.95, r * 0.95]], { color: c }, 6));
    parts.push(limb(mid, tip, [[0, r * 0.95, r * 0.95], [1, r * 0.8, r * 0.8]], { color: c }, 6));
  }
  // the thumb: from the side of the palm near the wrist, over the grip
  const tRoot = vadd(vadd(at, d, 0.02), w, -0.03);
  const td1 = vnorm(vadd(vadd(d, w, -0.5), n, 0.5));
  const tMid = vadd(tRoot, td1, 0.035);
  const td2 = vnorm(vadd(d, n, 0.8));
  parts.push(limb(tRoot, tMid, [[0, 0.012, 0.012], [1, 0.011, 0.011]], { color: c }, 6));
  parts.push(limb(tMid, vadd(tMid, td2, 0.028), [[0, 0.011, 0.011], [1, 0.0085, 0.0085]], { color: c }, 6));
  return parts;
}

/**
 * Both arms in the hold, sleeves of `sleeve` colour (camo flag), optional gloves; `band`: the
 * side's armband round the left upper sleeve (on the arm, so it follows it when aiming).
 */
export function arms({ sleeve, camo = 0, skin = SKIN, glove = null, cuff = null, broad = 1, band = null }) {
  const sh = (p) => [p[0] * broad, p[1], p[2]];
  const upper = [[0, 0.078, 0.08], [0.2, 0.076, 0.078], [0.65, 0.068, 0.07], [1, 0.064, 0.066]];   // loose sleeves
  const fore = [[0, 0.064, 0.066], [0.25, 0.064, 0.066], [0.75, 0.05, 0.05], [0.9, 0.047, 0.046], [0.96, 0.036, 0.034], [1, 0.032, 0.03]]; // cuff, then the wrist
  const dir = (a, b) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l = Math.hypot(...d); return d.map((v) => v / l); };
  const parts = [
    limb(sh(R_SHOULDER), R_ELBOW, upper, { color: sleeve, camo }),
    limb(R_ELBOW, R_HAND, fore, { color: sleeve, camo }),
    limb(sh(L_SHOULDER), L_ELBOW, upper, { color: sleeve, camo }),
    limb(L_ELBOW, L_HAND, fore, { color: sleeve, camo }),
    ...hand(R_HAND, [0, -0.45, 0.89], [-1, 0, 0], skin, glove, 1),        // round the pistol grip, palm toward the stock
    ...hand(L_HAND, dir(L_ELBOW, L_HAND), [0, 1, 0.1], skin, glove, -1),   // cupping the fore-end from below
  ];
  if (band != null) {
    const a = sh(L_SHOULDER);
    const at = (t) => [a[0] + (L_ELBOW[0] - a[0]) * t, a[1] + (L_ELBOW[1] - a[1]) * t, a[2] + (L_ELBOW[2] - a[2]) * t];
    parts.push(limb(at(0.22), at(0.4), [[0, 0.083, 0.085], [1, 0.081, 0.083]], { color: band }, 10));
  }
  if (cuff) {
    // rolled or buttoned cuffs just short of the wrists
    for (const [e, h] of [[R_ELBOW, R_HAND], [L_ELBOW, L_HAND]]) {
      const t = 0.86;
      parts.push(limb(
        [e[0] + (h[0] - e[0]) * t, e[1] + (h[1] - e[1]) * t, e[2] + (h[2] - e[2]) * t],
        [e[0] + (h[0] - e[0]) * 0.94, e[1] + (h[1] - e[1]) * 0.94, e[2] + (h[2] - e[2]) * 0.94],
        [[0, 0.042, 0.04], [1, 0.04, 0.038]], { color: cuff, camo }, 8,
      ));
    }
  }
  return parts;
}

/** Thigh: hanging from the hip joint (y = 0) to the knee (y = -0.48). */
export function thigh({ color, camo = 0 }) {
  return limb([0, 0.05, -0.005], [0, -0.5, 0.012], [
    [0, 0.085, 0.09], [0.12, 0.104, 0.108], [0.45, 0.097, 0.1], [0.8, 0.08, 0.083], [0.93, 0.078, 0.084], [1, 0.068, 0.072],
  ], { color, camo }, 10);
}

/**
 * Shin from the knee (y = 0) down, with the boot. `bootTop` is the height of the boot shaft
 * above the sole (short combat boots ~0.17 m, kirza jackboots ~0.3 m); `blouse` tucks the
 * trouser leg into the boot with a puff of cloth.
 */
export function shin({ color, camo = 0, boot, bootTop = 0.17, blouse = true }) {
  const sole = -0.5;
  const top = sole + bootTop;
  const parts = [
    limb([0, 0.04, 0.012], [0, top + 0.02, -0.005], [
      [0, 0.072, 0.078], [0.1, 0.074, 0.082], [0.3, 0.074, 0.084], [0.65, 0.062, 0.068], [1, 0.058, 0.064],  // trouser leg, the calf in it
    ], { color, camo }, 10),
    // boot shaft, then the foot from heel to toe (swept forward)
    limb([0, top + 0.01, -0.005], [0, sole + 0.07, -0.005], [[0, 0.058, 0.064], [1, 0.062, 0.068]], { color: boot }, 10),
    loft([
      [0, sole + 0.06, -0.095, 0.05, 0.05, 3],
      [0, sole + 0.06, -0.065, 0.058, 0.062, 3.2],    // heel
      [0, sole + 0.055, 0.03, 0.06, 0.058, 3.2],      // instep
      [0, sole + 0.045, 0.14, 0.056, 0.046, 3],       // toe box
      [0, sole + 0.04, 0.19, 0.034, 0.034, 2.4],
    ], { color: boot }, 10),
    P.box(0.125, 0.03, 0.3, { y: sole + 0.015, z: 0.048, color: 0x141414 }),         // the heavy sole
  ];
  if (blouse) parts.push(limb([0, top + 0.06, -0.005], [0, top - 0.005, -0.005], [[0, 0.064, 0.07], [0.6, 0.076, 0.082], [1, 0.068, 0.074]], { color, camo }, 10));
  return parts;
}

/**
 * A helmet shell swept from rings [[y, r, depthScale?], …] over the head, centred at z.
 * `skirt` drops the rim at the sides and back (PASGT) by that much.
 */
export function helmet(rings, { color, camo = 0, z = -0.008, skirt = 0 }) {
  const rimY = rings[0][0];
  // lower the rim behind the brow line: covers the ears and the nape like the real shell
  const warp = skirt ? (v) => {
    const up = v.y - rimY;
    if (up > 0.04) return;
    const back = Math.min(1, Math.max(0, (0.06 - (v.z - z)) / 0.16));
    v.y -= skirt * back * (1 - Math.max(0, up) / 0.04);
  } : null;
  return loft(rings.map(([y, r, k = 1.08, e = 2]) => [0, y, z, r, r * k, e]), { color, camo, warp }, 14);
}

/**
 * Finish a merged soldier part: cloth, not paint, for everything that isn't metal or glass (matte,
 * with the weave relief — render/paint.js surfaces), and the shading a figure has in its creases
 * baked into the vertex colours: undersides (under the helmet brim, the chin, the arms, the
 * pack) and surfaces turned in toward the body (between the legs, the armpits, behind the gear)
 * go darker. `axis` false for the legs, which are built round their own joint.
 */
export function finish(geo, axis = true) {
  const p = geo.attributes.position, n = geo.attributes.normal, c = geo.attributes.color, paint = geo.attributes.paint;
  for (let i = 0; i < p.count; i++) {
    const px = paint.getX(i);
    if (Math.floor(px * 0.5 + 0.01) === 0) paint.setX(i, px + 8);       // surface 0 (paint) → 4 (cloth)
    const ny = n.getY(i);
    let f = 0.7 + 0.3 * Math.min(1, Math.max(0, (ny + 0.65) / 1.1));     // facing down: darker
    if (axis) {
      const rx = p.getX(i), rz = p.getZ(i), r = Math.hypot(rx, rz);
      if (r > 0.02) {
        const out = (n.getX(i) * rx + n.getZ(i) * rz) / r;                // −1 facing the body's axis … +1 facing out
        f *= 0.78 + 0.22 * Math.min(1, Math.max(0, out + 0.6));
      }
    }
    c.setXYZ(i, c.getX(i) * f, c.getY(i) * f, c.getZ(i) * f);
  }
  return geo;
}
