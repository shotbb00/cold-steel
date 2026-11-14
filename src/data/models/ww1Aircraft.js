// 1918 aircraft (data/air18.ts): biplanes (and one triplane) of wood, wire and doped fabric, built
// like ww2Aircraft.js from swept cross-sections (airKit.js), in metres, nose toward +z, each with its
// wooden two-blade propeller (rig.prop, spun by systems/AirStrike.js). One builder, `plane(key, o)`:
//   wings     2 (biplane) or 3 (the Fokker Dr.I), the upper one staggered ahead, struts between
//   span, len the size; `seats` 2: the observer's cockpit behind the pilot with its Lewis on a ring
//   rotary    a round cowl (Camel, Dr.I) — else an inline engine's flat nose and radiator
//   bombs     small bombs under the lower wing (the ground-attack and day bombers)
// Markings in fixed colours: the RFC/RAF roundel, the French cocarde, the 1918 Balkenkreuz.
import * as THREE from 'three';
import { P, merge, pair, loft } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';
import { body, surface, fin } from './airKit.js';

const WOOD = 0x6a4428;
const DARK = 0x2a2c28;
const STEEL = 0x3a3c38;
const WHITE = 0xd8d6cc;
const C = { camo: 1 };
const M = (parts) => merge(parts.flat(Infinity));

const point = (root, x, y, z) => {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  root.add(o);
  return o;
};

/** Markings: 'uk' blue-white-red roundel, 'fr' red-white-blue cocarde, else the Balkenkreuz. `up`: on a wing. */
function mark(kind, x, y, z, r, up = false) {
  const disc = (rr, color, d = 0) => P.cyl(rr, rr, 0.02, up ? { x, y: y + d, z, color } : { x: x + Math.sign(x) * d, y, z, rz: Math.PI / 2, color }, 16);
  const bar = (w, h, color, d) => (up ? P.box(w, 0.02, h, { x, y: y + d, z, color }) : P.box(0.02, h, w, { x: x + Math.sign(x) * d, y, z, color }));
  if (kind === 'uk') return [disc(r, 0x22325c), disc(r * 0.66, WHITE, 0.006), disc(r * 0.33, 0xa8231c, 0.012)];
  if (kind === 'fr') return [disc(r, 0xa8231c), disc(r * 0.66, WHITE, 0.006), disc(r * 0.33, 0x22325c, 0.012)];
  return [bar(r * 2, r * 0.5, WHITE, 0), bar(r * 0.5, r * 2, WHITE, 0), bar(r * 1.8, r * 0.32, 0x141414, 0.008), bar(r * 0.32, r * 1.8, 0x141414, 0.008)];
}

/** The wooden two-blade propeller of radius r (it turns about z). */
function propeller(r) {
  return M([
    P.cyl(0.08, 0.12, 0.25, { rx: Math.PI / 2, color: STEEL }, 10),
    ...[0, Math.PI].map((a) => loft([[0, r * 0.08, 0, 0.07, 0.05, 2], [0, r * 0.4, 0, 0.11, 0.035, 2.2], [0, r * 0.85, 0, 0.09, 0.025, 2.2], [0, r, 0, 0.04, 0.015, 2]], { color: WOOD, surf: 'paint' }, 8).rotateY(0.3).rotateZ(a)),
  ]);
}

const cache = {};

/**
 * A biplane (or triplane). o: color, kind ('uk' | 'fr' | 'de'), span (half, m), len, wings (2 | 3),
 * seats (1 | 2), rotary, bombs, armour (the Junkers J.I: corrugated metal, square).
 */
export const plane = (key, o) => (mats) => {
  const { color, kind, span = 4.2, len = 5.8, wings = 2, seats = 1, rotary = false, bombs = 0, armour = false } = o;
  const m = (cache[key] ??= {
    body: M([
      // the fuselage: slab-sided (fabric over a box girder), deep at the cockpit, tapering to the tail
      body([[len * 0.45, 1.62, 0.44, 0.48, 2.6], [len * 0.38, 1.62, 0.46, 0.52, 2.8], [len * 0.12, 1.65, 0.44, 0.52, 3], [-len * 0.12, 1.68, 0.36, 0.44, 3], [-len * 0.38, 1.74, 0.16, 0.22, 3], [-len * 0.52, 1.76, 0.06, 0.1, 2.5]], { color, ...C }),
      ...(rotary
        ? [P.cyl(0.5, 0.5, 0.45, { y: 1.62, z: len * 0.45, rx: Math.PI / 2, color: armour ? STEEL : 0x8a8a84 }, 16)]                          // the rotary's round cowl
        : [P.box(0.75, 0.8, 0.4, { y: 1.62, z: len * 0.45, color: DARK }), P.box(0.1, 0.5, 0.6, { x: 0.36, y: 2.05, z: len * 0.33, color: STEEL })]), // an inline's radiator, its exhaust stack
      P.box(0.5, 0.06, 0.6, { y: 2.13, z: len * 0.12, color: 0x1a1a18 }),                                                                   // the pilot's cockpit
      ...pair((s) => P.box(0.07, 0.07, 0.75, { x: s * 0.12, y: 2.18, z: len * 0.24, color: DARK })),                                        // the twin Vickers on the cowling
      ...(seats > 1 ? [P.box(0.55, 0.06, 0.55, { y: 2.12, z: -len * 0.08, color: 0x1a1a18 }), P.torus(0.33, 0.03, { y: 2.2, z: -len * 0.08, rx: Math.PI / 2, color: STEEL }, 14),
        P.box(0.07, 0.07, 0.8, { x: 0.15, y: 2.38, z: -len * 0.12, rx: -0.3, color: DARK })] : []),                                          // the observer's ring and his Lewis
      // the wings: the lower at the fuselage, the upper (and a triplane's middle) staggered ahead
      ...Array.from({ length: wings }, (_, k) => {
        const y = 1.25 + k * (wings === 3 ? 0.78 : 1.5), z = len * 0.1 + k * 0.25, sp = span * (wings === 3 ? 0.85 - k * 0.02 : 1 - (1 - k) * 0.06);
        return pair((s) => surface([[s * 0.15, y, z, wings === 3 ? 1.05 : 1.45, 0.08], [s * sp, y + 0.05, z, wings === 3 ? 1.0 : 1.4, 0.06]], { color, ...C }));
      }),
      // the struts: the interplane pair either side, the cabane over the fuselage, the bracing wires
      ...pair((s) => [0.35, -0.55].map((dz) => P.box(0.05, (wings === 3 ? 1.56 : 1.5) + 0.05, 0.06, { x: s * span * 0.66, y: 2.02, z: len * 0.1 + dz + 0.12, color: WOOD }))),
      ...pair((s) => P.box(0.04, 0.6, 0.04, { x: s * 0.32, y: 2.45, z: len * 0.15, rz: s * 0.25, color: STEEL })),
      ...(wings === 2 ? pair((s) => { // the bracing wires: from the lower wing's root up to the outer strut
        const dx = span * 0.66 - 0.45, dy = 1.45;
        return P.box(0.012, Math.hypot(dx, dy), 0.012, { x: s * (0.45 + span * 0.66) / 2, y: 1.3 + dy / 2, z: len * 0.1, rz: -s * Math.atan2(dx, dy), color: STEEL });
      }) : []),
      // the tail: the tailplane, the fin and rudder
      ...pair((s) => surface([[s * 0.05, 1.76, -len * 0.47, 0.75, 0.05], [s * 1.45, 1.76, -len * 0.5, 0.5, 0.03]], { color, ...C })),
      fin([[1.76, -len * 0.48, 0.9, 0.05], [2.45, -len * 0.53, 0.6, 0.04], [2.6, -len * 0.55, 0.35, 0.03]], { color: kind === 'fr' ? WHITE : color, ...C }),
      // the undercarriage: two wheels on a V of struts, the tail skid
      ...pair((s) => [P.cyl(0.36, 0.36, 0.1, { x: s * 0.72, y: 0.36, z: len * 0.3, rz: Math.PI / 2, color: 0x2a2a26 }, 14),
        P.box(0.04, 1.0, 0.04, { x: s * 0.45, y: 0.85, z: len * 0.34, rz: s * -0.35, rx: 0.2, color: STEEL }), P.box(0.04, 1.0, 0.04, { x: s * 0.45, y: 0.85, z: len * 0.2, rz: s * -0.35, rx: -0.3, color: STEEL })]),
      P.cyl(0.03, 0.03, 1.5, { y: 0.36, z: len * 0.3, rz: Math.PI / 2, color: STEEL }, 6),
      P.box(0.04, 0.5, 0.04, { y: 1.45, z: -len * 0.47, rx: 0.5, color: STEEL }),
      ...(armour ? pair((s) => [0.6, 1.0].map((y) => P.box(0.02, 0.04, len * 0.6, { x: s * 0.45, y: 1.3 + y * 0.5, z: len * 0.05, color: STEEL }))) : []), // the corrugations
      ...(bombs ? pair((s) => Array.from({ length: bombs }, (_, i) => P.capsule(0.1, 0.45, { x: s * (0.9 + i * 0.45), y: 1.05, z: len * 0.1, rx: Math.PI / 2, color: DARK }))) : []),
      // the markings: on the upper wing's tips, the fuselage sides, (the French) the rudder
      ...pair((s) => mark(kind, s * span * (wings === 3 ? 0.62 : 0.78), 1.25 + (wings - 1) * (wings === 3 ? 0.78 : 1.5) + 0.06, len * 0.1 + (wings - 1) * 0.25, wings === 3 ? 0.4 : 0.55, true)), // (inside the wing's chord and tip)
      ...pair((s) => mark(kind, s * 0.37, 1.72, -len * 0.25, 0.32)),
    ]),
    prop: propeller(1.3),
  });
  const root = new THREE.Group();
  meshAdder(root)(m.body, mats.body);
  const p = new THREE.Group();
  p.position.set(0, 1.62, len * 0.45 + 0.3);
  root.add(p);
  meshAdder(p)(m.prop, mats.body);
  return { root, gun: point(root, 0, 2.2, len * 0.5), pods: pair((s) => point(root, s * 1.1, 1.0, len * 0.1)), prop: p };
};
