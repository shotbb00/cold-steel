// Shapes the aircraft share, all swept from cross-sections (units/geometry.js loft), so they hold
// up from every side, not only head-on:
//   body      a fuselage, nacelle or canopy along z: [[z, y, halfWidth, halfHeight, e?], …]
//   surface   a wing, tailplane or stabiliser along x: [[x, y, z, halfChord, halfThickness], …]
//             (a lens-shaped section, thick in the middle, thin at the leading and trailing edges)
//   fin       a vertical fin or tail pylon along y: [[y, z, halfChord, halfThickness, x?], …]
//   blades    n rotor blades from the hub out to radius r, tapering at the tips
//   rocketPod a UB-32 / B-8 / M261 pod: tube, rounded nose ring, dark front, from z0 forward to z1
//   missile   a slim missile with its cruciform fins, nose at z1
import { P, loft, merge } from '../units/geometry.js';

export const body = (sections, { x = 0, ...o } = {}, radial = 14) => loft(sections.map(([z, y, w, d, e = 2.3]) => [x, y, z, w, d, e]), o, radial);

export const surface = (sections, o = {}) => loft(sections.map(([x, y, z, c, t]) => [x, y, z, c, t, 1.7]), o, 10);

export const fin = (sections, o = {}) => loft(sections.map(([y, z, c, t, x = 0]) => [x, y, z, t, c, 1.7]), o, 10);

export function blades(n, r, chord, color, root = 0.45) {
  const parts = [];
  for (let k = 0; k < n; k++) {
    const g = loft([[root, 0, 0, chord * 0.42, 0.03, 3], [root + 0.6, 0, 0, chord * 0.5, 0.035, 3], [r - 0.5, 0, 0, chord * 0.5, 0.03, 3], [r, 0, -chord * 0.08, chord * 0.32, 0.02, 3]], { color, surf: 'paint' }, 8);
    parts.push(g.rotateY((k / n) * Math.PI * 2));
  }
  return parts;
}

export function rocketPod(x, y, z0, z1, r, color, face = 0x141414) {
  return [
    loft([[x, y, z0 - 0.05, r * 0.5, r * 0.5, 2], [x, y, z0, r * 0.92, r * 0.92, 2], [x, y, z0 + 0.15, r, r, 2], [x, y, z1 - 0.2, r, r, 2], [x, y, z1 - 0.05, r * 0.92, r * 0.92, 2], [x, y, z1, r * 0.82, r * 0.82, 2]], { color }, 12),
    P.cyl(r * 0.8, r * 0.8, 0.02, { x, y, z: z1 + 0.005, rx: Math.PI / 2, color: face }, 12),
  ];
}

export function missile(x, y, z0, z1, r, color, finColor = color) {
  const fins = [0, 1, 2, 3].map((k) => P.box(0.01, r * 4, 0.3, { x, y, z: z0 + 0.2, rz: (k * Math.PI) / 4 + Math.PI / 4, color: finColor }));
  return [
    loft([[x, y, z0, r * 0.8, r * 0.8, 2], [x, y, z0 + 0.1, r, r, 2], [x, y, z1 - r * 3, r, r, 2], [x, y, z1 - r, r * 0.6, r * 0.6, 2], [x, y, z1, r * 0.1, r * 0.1, 2]], { color }, 8),
    merge(fins),
  ];
}
