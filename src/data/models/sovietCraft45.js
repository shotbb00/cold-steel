// The Black Sea Fleet's small craft for a landing (Novorossiysk, Malaya Zemlya, February 1943), bow toward +z, on the
// 1944 landing craft's frame (./landingCraft45.js craft: a ramp hinged at its foot, the swell till she grounds).
//   MO-4 "small hunter": 27 m of wood, a raised forecastle, the bridge amidships, a 45 mm gun fore and aft,
//        a mast — no ramp: the naval infantry go over the bow into the surf
//   Tender: the little self-propelled landing barge of 1942, an open well with a bow ramp, the helmsman aft
import { P, merge, loft } from '../units/geometry.js';
import { craft } from './landingCraft45.js';

const GREY = 0x7e8a90;  // (the Black Sea Fleet's light grey)
const DARK = 0x4e585e;
const WOOD = 0x6a5c44;
const STEEL = 0x626a6e;
const GLASS = 0x2a3a44;

const box = (w, h, d, o) => P.box(w, h, d, { surf: 'plate', ...o });
/** A 45 mm 21-K on its pedestal, the barrel over the bow (dir 1) or the stern (-1). */
const gun45 = (y, z, dir) => [
  P.cyl(0.35, 0.45, 0.7, { y: y + 0.35, z, color: STEEL }, 8),
  box(0.9, 0.7, 0.12, { y: y + 0.9, z: z + dir * 0.3, color: GREY }),                   // the shield
  P.cyl(0.05, 0.06, 2.0, { y: y + 0.9, z: z + dir * 1.2, rx: Math.PI / 2, color: DARK }, 6),
];

/** MO-4: 26.9 × 3.9 m. */
export const buildMO4 = craft(() => {
  const L = 26.9, B = 3.9, fb = 1.6;
  const fixed = merge([
    // the hull: a square stern, the sides straight amidships, fining to a sharp stem that rises a little (her sheer)
    loft([[0, 0.5, -L / 2, 1.75, 1.1, 4], [0, 0.5, -8, 1.95, 1.1, 4], [0, 0.55, 4, 1.95, 1.15, 4], [0, 0.7, 9, 1.5, 1.2, 4], [0, 0.9, 12.3, 0.65, 1.2, 3], [0, 1.0, L / 2, 0.06, 1.1, 2]], { color: GREY, surf: 'plate' }, 12),
    box(B - 0.4, 0.1, 20, { y: fb + 0.02, z: -2.6, color: WOOD, surf: 'deck' }),
    box(2.4, 0.1, 3.4, { y: fb + 0.1, z: 9.0, color: WOOD, surf: 'deck' }),
    box(2.4, 1.6, 3.6, { y: fb + 0.8, z: 1.5, color: GREY }),                                          // the bridge
    box(2.2, 0.35, 0.08, { y: fb + 1.3, z: 3.32, color: GLASS }),
    box(2.6, 0.12, 4.0, { y: fb + 1.66, z: 1.5, color: DARK }),
    P.cyl(0.07, 0.09, 6.5, { y: fb + 4.2, z: 1.0, color: DARK }, 6),                                   // the mast
    P.box(1.8, 0.06, 0.06, { y: fb + 6.0, z: 1.0, color: DARK }),
    ...gun45(fb, L / 2 - 6.2, 1), ...gun45(fb, -L / 2 + 3.5, -1),                                       // the 45s, fore and aft
    ...[-1, 1].map((s) => P.cyl(0.03, 0.03, 1.2, { x: s * 1.1, y: fb + 2.0, z: 0, rx: Math.PI / 2 - 0.2, color: 0x1c1e20 }, 5)), // the DShKs on the bridge wings
    ...[-1, 1].map((s) => box(0.5, 0.5, 1.6, { x: s * 1.2, y: fb + 0.25, z: -L / 2 + 1.2, color: DARK })), // the depth-charge racks
      ]);
  return { fixed, ramp: null, hinge: [0, 0], gunAt: [fb + 1, L / 2 - 6] };
});

/** The landing tender: 15 × 4.2 m, the vehicle well open, a steel ramp forward. */
export const buildTender = craft(() => {
  const L = 15, B = 4.2, fb = 1.7;
  const fixed = merge([
    box(B, 0.5, L - 0.4, { y: 0.25, z: -0.2, color: GREY }),                                           // the bottom
    ...[-1, 1].map((s) => box(0.2, fb + 0.2, L - 0.4, { x: s * (B / 2 - 0.1), y: (fb + 0.2) / 2, z: -0.2, color: GREY })), // the sides
    box(B, fb + 0.3, 3.0, { y: (fb + 0.3) / 2, z: -L / 2 + 1.5, color: GREY }),                       // the stern
    box(B - 0.4, 0.1, L - 3.6, { y: 0.52, z: 1.2, color: WOOD, surf: 'deck' }),                       // the well's planking
    box(1.6, 1.4, 1.4, { x: 0.9, y: fb + 0.9, z: -L / 2 + 1.4, color: DARK }),                         // the helmsman's cab
    box(1.4, 0.3, 0.06, { x: 0.9, y: fb + 1.3, z: -L / 2 + 2.12, color: GLASS }),
    P.cyl(0.18, 0.2, 1.4, { x: -1.2, y: fb + 0.9, z: -L / 2 + 0.8, color: 0x2a2a2a }, 8),            // the exhaust
  ]);
  const ramp = merge([
    box(B - 0.5, fb + 0.1, 0.14, { y: (fb + 0.1) / 2, z: 0, color: STEEL, surf: 'metal' }),
    ...[0.5, 1.0, 1.4].map((y) => box(B - 0.6, 0.06, 0.1, { y, z: -0.1, color: DARK, surf: 'metal' })),
  ]);
  return { fixed, ramp, hinge: [0.3, L / 2 - 0.4], gunAt: [fb + 1, -L / 2 + 2] };
});
