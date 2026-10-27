// The human figure both factions' infantry share, swept from cross-sections (units/geometry.js
// loft) instead of capsules: a head with a face (brow, nose, ears, eyes, jaw), neck, a trunk
// with chest, waist and hips, shoulders, tapered arms in the weapon hold with real hands, thighs
// with a knee, shins with a calf, and boots with heel and toe. Uniform, gear, headgear and
// weapons come from natoSoldier.js / pactSoldier.js on top. Proportions follow the rig both
// models report (hips at 0.96 m, 0.48 m leg segments, shoulders at 1.47 m), so the animation in
// render/StackRenderer.js is unchanged.
import { P, loft, limb, pair } from '../units/geometry.js';

export const SKIN = 0xc29a74;
const EYE = 0x2a2420;
const BROW = 0x6a5038;

/** Field glasses hung on the chest. */
export function binoculars(color) {
  return [...pair((s) => P.cyl(0.03, 0.026, 0.1, { x: s * 0.035, y: 1.4, z: 0.16, rx: Math.PI / 2, color }, 10)), P.box(0.03, 0.03, 0.05, { y: 1.4, z: 0.15, color })];
}

/** Head, face and neck. Crown at ~1.85 m, chin at ~1.62 m, facing +z. */
export function head(skin = SKIN) {
  return [
    loft([
      [0, 1.585, 0.0, 0.052, 0.056, 2],
      [0, 1.64, 0.0, 0.055, 0.058, 2],                // neck
      [0, 1.655, 0.035, 0.05, 0.05, 2.2],             // chin
      [0, 1.675, 0.02, 0.07, 0.078, 2.4],             // jaw
      [0, 1.71, 0.008, 0.08, 0.095, 2.3],
      [0, 1.745, 0.004, 0.086, 0.1, 2.2],             // cheekbones, eyes
      [0, 1.78, -0.002, 0.088, 0.103, 2.1],           // brow, temples
      [0, 1.815, -0.008, 0.08, 0.095, 2.1],
      [0, 1.842, -0.012, 0.058, 0.07, 2],
      [0, 1.858, -0.015, 0.02, 0.025, 2],             // crown
    ], { color: skin }, 12),
    P.box(0.022, 0.04, 0.03, { y: 1.735, z: 0.1, rx: -0.25, color: skin }),            // nose
    ...pair((s) => P.box(0.03, 0.008, 0.012, { x: s * 0.032, y: 1.768, z: 0.1, rz: s * -0.12, color: BROW })), // brows
    ...pair((s) => P.box(0.016, 0.008, 0.006, { x: s * 0.032, y: 1.754, z: 0.1, color: EYE })),
    ...pair((s) => P.sphere(0.022, { x: s * 0.087, y: 1.745, z: -0.005, sx: 0.45, sy: 1.2, color: skin }, 6, 5)), // ears
  ];
}

/**
 * Trunk from the crotch to the base of the neck, plus the shoulder caps. `cut` (y) splits the
 * colouring: below it `lower` (trousers), above it `upper` (jacket); `tail` drops the jacket
 * hem over the trousers. `broad` widens the shoulders (body armour, padding).
 */
export function trunk({ upper, lower = upper, camoUpper = 0, camoLower = 0, cut = 1.05, broad = 1 }) {
  const ring = (y, w, d, z = 0, e = 2.5) => [0, y, z, w, d, e];
  const below = [ring(0.88, 0.1, 0.09), ring(0.92, 0.155, 0.105), ring(0.99, 0.168, 0.112), ring(cut + 0.01, 0.163, 0.108)];
  const above = [
    ring(cut - 0.03, 0.17, 0.115),                    // jacket hem, a little proud of the trousers
    ring(1.1, 0.158, 0.104),                          // waist
    ring(1.2, 0.166, 0.11, 0.005),
    ring(1.31, 0.182 * broad, 0.122, 0.012),          // chest
    ring(1.41, 0.196 * broad, 0.124, 0.006),
    ring(1.48, 0.2 * broad, 0.11, -0.004, 2.8),       // across the shoulders
    ring(1.535, 0.15 * broad, 0.09, -0.01, 2.4),
    ring(1.575, 0.075, 0.068, -0.006, 2),             // root of the neck
  ];
  return [
    loft(below, { color: lower, camo: camoLower }, 12),
    loft(above, { color: upper, camo: camoUpper }, 12),
    ...pair((s) => P.sphere(0.066, { x: s * 0.185 * broad, y: 1.465, z: -0.005, sx: 1.05, sy: 0.8, color: upper, camo: camoUpper }, 9, 7)), // deltoids
  ];
}

// the weapon hold every infantry weapon is drawn for: right hand on the grip, left under the fore-end
const R_SHOULDER = [0.2, 1.46, -0.01];
const R_ELBOW = [0.255, 1.215, 0.0];
const R_HAND = [0.2, 1.255, 0.3];
const L_SHOULDER = [-0.2, 1.46, -0.01];
const L_ELBOW = [-0.1, 1.24, 0.22];
const L_HAND = [0.165, 1.28, 0.5];

/** A hand gripping, from the wrist toward `dir` (unit [x, y, z]). */
function hand(at, dir, skin, glove) {
  const c = glove ?? skin;
  const tip = [at[0] + dir[0] * 0.085, at[1] + dir[1] * 0.085, at[2] + dir[2] * 0.085];
  return [
    limb(at, tip, [[0, 0.03, 0.022, 3], [0.45, 0.04, 0.026, 3], [1, 0.032, 0.022, 2.4]], { color: c }, 8), // palm and curled fingers
    P.sphere(0.017, { x: at[0] + dir[0] * 0.03 + 0.012, y: at[1] + 0.02, z: at[2] + dir[2] * 0.03, sx: 0.8, sz: 1.5, color: c }, 6, 4), // thumb
  ];
}

/** Both arms in the hold, sleeves of `sleeve` colour (camo flag), optional gloves. */
export function arms({ sleeve, camo = 0, skin = SKIN, glove = null, cuff = null, broad = 1 }) {
  const sh = (p) => [p[0] * broad, p[1], p[2]];
  const upper = [[0, 0.062, 0.064], [0.2, 0.06, 0.062], [0.65, 0.052, 0.054], [1, 0.047, 0.05]];
  const fore = [[0, 0.048, 0.05], [0.25, 0.05, 0.052], [0.75, 0.038, 0.036], [0.93, 0.034, 0.032], [1, 0.03, 0.028]];
  const dir = (a, b) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l = Math.hypot(...d); return d.map((v) => v / l); };
  const parts = [
    limb(sh(R_SHOULDER), R_ELBOW, upper, { color: sleeve, camo }),
    limb(R_ELBOW, R_HAND, fore, { color: sleeve, camo }),
    limb(sh(L_SHOULDER), L_ELBOW, upper, { color: sleeve, camo }),
    limb(L_ELBOW, L_HAND, fore, { color: sleeve, camo }),
    ...hand(R_HAND, [0, -0.25, 0.97], skin, glove),
    ...hand(L_HAND, dir(L_ELBOW, L_HAND), skin, glove),
  ];
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
    [0, 0.07, 0.075], [0.12, 0.088, 0.092], [0.45, 0.08, 0.085], [0.8, 0.062, 0.066], [0.93, 0.058, 0.064], [1, 0.05, 0.055],
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
      [0, 0.058, 0.064], [0.1, 0.06, 0.068], [0.3, 0.06, 0.072], [0.65, 0.047, 0.054], [1, 0.044, 0.05],
    ], { color, camo }, 10),
    // boot shaft, then the foot from heel to toe (swept forward)
    limb([0, top + 0.01, -0.005], [0, sole + 0.07, -0.005], [[0, 0.05, 0.055], [1, 0.053, 0.06]], { color: boot }, 10),
    loft([
      [0, sole + 0.055, -0.085, 0.045, 0.045, 3],
      [0, sole + 0.055, -0.06, 0.052, 0.055, 3.2],    // heel
      [0, sole + 0.05, 0.03, 0.054, 0.05, 3.2],       // instep
      [0, sole + 0.04, 0.13, 0.05, 0.04, 3],          // toe box
      [0, sole + 0.035, 0.175, 0.03, 0.03, 2.4],
    ], { color: boot }, 10),
    P.box(0.11, 0.02, 0.27, { y: sole + 0.01, z: 0.045, color: 0x141414 }),          // sole
  ];
  if (blouse) parts.push(limb([0, top + 0.05, -0.005], [0, top - 0.005, -0.005], [[0, 0.05, 0.056], [0.6, 0.06, 0.066], [1, 0.054, 0.06]], { color, camo }, 10));
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
