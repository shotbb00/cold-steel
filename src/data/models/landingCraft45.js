// 1944 landing craft (the coastal maps: Omaha), bow toward +z. Model contract as render/RigRenderer.js:
// build(mats) → { root, muzzle, animate(u, dt, t) }. Each has a bow ramp hinged at its foot that comes
// down when she grounds (u.rampK 0 up … 1 down, systems/Landing.js), and rides the swell until she's on
// the sand (u.beached: still).
//   LCVP (Higgins boat): 11 m of plywood, a square well for a platoon's section, the steel ramp forward,
//        the coxswain aft with two .30 machine guns on rings either side of him
//   LCT Mk 6: 37 m, a flat open tank deck between high sides, a low wheelhouse and the funnel aft
import * as THREE from 'three';
import { P, merge } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';

const GREY = 0x8a949a;
const DARK = 0x5c656b;
const WOOD = 0x6e6248;
const STEEL = 0x6c7478;
const BLACK = 0x1c1e20;

const plate = (o) => ({ surf: 'plate', ...o });
const box = (w, h, d, o) => P.box(w, h, d, plate(o));

function craft(describe) {
  let d = null;
  return (mats) => {
    d ??= describe();
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    meshAdder(body)(d.fixed, mats.body);
    const ramp = new THREE.Group(); // hinged at its foot, on the bow
    ramp.position.set(0, d.hinge[0], d.hinge[1]);
    meshAdder(ramp)(d.ramp, mats.body);
    body.add(ramp);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, d.gunAt[0], d.gunAt[1]);
    body.add(muzzle);
    const phase = Math.random() * 10;
    return {
      root,
      muzzle,
      animate(u, dt, t) {
        const k = u.rampK ?? 0;
        ramp.rotation.x = k * 1.42; // (down: almost flat, its lip in the surf)
        const bob = u.beached ? 0.1 : 1, sea = (u.seaK ?? 1) * bob;
        body.rotation.set(Math.sin(t * 0.9 + phase) * 0.03 * sea - (u.beached ? 0.02 : 0), 0, Math.sin(t * 0.7 + phase * 1.7) * 0.04 * sea + (u.list ?? 0));
        body.position.y = Math.sin(t * 1.1 + phase) * 0.18 * sea - (u.sink ?? 0);
      },
    };
  };
}

/** The Higgins boat: 10.9 × 3.3 m. */
export const buildLCVP = craft(() => {
  const L = 10.9, B = 3.3, fb = 1.5;
  const fixed = merge([
    box(B, 1.6, L - 1.2, { y: fb - 0.8, z: -0.6, color: GREY }),                      // the hull
    box(B - 0.5, 0.12, L - 2.6, { y: 0.35, z: -0.3, color: WOOD, surf: 'deck' }),      // the well's floor
    ...[-1, 1].map((s) => box(0.1, 0.5, L - 2.2, { x: s * (B / 2 - 0.05), y: fb + 0.25, z: -0.5, color: GREY })), // her high sides
    box(B, 0.6, 1.4, { y: fb + 0.3, z: -L / 2 + 0.7, color: GREY }),                   // the stern sheets
    box(1.1, 0.8, 1.0, { x: 0.6, y: fb + 0.6, z: -L / 2 + 1.6, color: DARK }),         // the coxswain's station
    ...[-1, 1].flatMap((s) => [
      P.cyl(0.45, 0.45, 0.1, { x: s * 1.1, y: fb + 0.65, z: -L / 2 + 2.1, color: STEEL }, 10),  // the gun rings
      P.cyl(0.05, 0.05, 1.1, { x: s * 1.1, y: fb + 0.95, z: -L / 2 + 2.6, rx: Math.PI / 2 - 0.15, color: BLACK }, 5), // the .30s
    ]),
    box(B * 0.92, 0.25, 0.4, { y: -0.1, z: -0.4, color: 0x2a2420 }),                   // the keel's shadow line
  ]);
  const ramp = merge([
    box(B - 0.3, 2.0, 0.14, { y: 1.0, z: 0, color: STEEL, surf: 'metal' }),
    ...[0.5, 1.0, 1.5].map((y) => box(B - 0.35, 0.06, 0.1, { y, z: -0.1, color: DARK, surf: 'metal' })),
  ]);
  return { fixed, ramp, hinge: [0.25, L / 2 - 0.55], gunAt: [fb + 1, -L / 2 + 3] };
});

/** LCT Mk 6: 36.6 × 9.8 m, the tank deck open, the wheelhouse aft. */
export const buildLCT = craft(() => {
  const L = 36.6, B = 9.8, fb = 2.4;
  const fixed = merge([
    box(B, 2.4, L - 1, { y: fb - 1.2, z: -0.5, color: GREY }),                       // the hull
    box(B - 1.4, 0.15, L - 7, { y: 0.9, z: 1.2, color: STEEL, surf: 'deck' }),       // the tank deck
    ...[-1, 1].map((s) => box(0.6, 1.4, L - 6, { x: s * (B / 2 - 0.3), y: fb + 0.7, z: 1.5, color: GREY })), // the wing walls
    box(B, 1.4, 5, { y: fb + 0.7, z: -L / 2 + 2.5, color: GREY }),                   // the stern
    box(4.6, 2.4, 3.2, { x: -2, y: fb + 2.6, z: -L / 2 + 3, color: GREY }),          // the wheelhouse
    box(4.4, 0.6, 1.2, { x: -2, y: fb + 2.6, z: -L / 2 + 4.65, color: 0x2a3a44 }),
    P.cyl(0.55, 0.6, 3, { x: 2.3, y: fb + 2.6, z: -L / 2 + 2.2, color: DARK }, 10),   // the funnel
    ...[-1, 1].map((s) => P.cyl(0.35, 0.35, 0.8, { x: s * 3.6, y: fb + 1.8, z: -L / 2 + 5.5, color: STEEL }, 8)), // the 20 mm tubs
    P.cyl(0.05, 0.05, 6, { x: -2, y: fb + 6.5, z: -L / 2 + 3, color: BLACK }, 5),       // the mast
  ]);
  const ramp = merge([
    box(B - 1.8, 3.4, 0.25, { y: 1.7, z: 0, color: STEEL, surf: 'metal' }),
    ...[0.8, 1.6, 2.4].map((y) => box(B - 1.9, 0.08, 0.15, { y, z: -0.15, color: DARK, surf: 'metal' })),
  ]);
  return { fixed, ramp, hinge: [0.8, L / 2 - 0.8], gunAt: [fb + 2, -L / 2 + 5.5] };
});
