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

export function craft(describe) {
  let d = null;
  return (mats) => {
    d ??= describe();
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    meshAdder(body)(d.fixed, mats.body);
    const ramp = new THREE.Group(); // hinged at its foot, on the bow (a minesweeper: none)
    if (d.ramp) { ramp.position.set(0, d.hinge[0], d.hinge[1]); meshAdder(ramp)(d.ramp, mats.body); body.add(ramp); }
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

/** A YMS motor minesweeper: 41 m of wood, a deckhouse and funnel, a 3-inch gun forward, the sweep gear (the winch, the floats and the otter boards) aft. */
export const buildYMS = craft(() => {
  const L = 41, B = 7.5, fb = 2.6;
  const fixed = merge([
    box(B, 3.2, L - 4, { y: fb - 1.6, z: -1, color: GREY }),
    P.box(B * 0.5, 2.6, 4, { y: fb - 1.2, z: L / 2 - 4, color: GREY, surf: 'plate' }),            // the bow, narrowing
    box(B - 0.6, 0.12, L - 6, { y: fb + 0.05, z: -1, color: WOOD, surf: 'deck' }),
    box(4.4, 2.4, 9, { y: fb + 1.2, z: 5, color: GREY }),                                          // the deckhouse
    box(3.6, 1.6, 3, { y: fb + 3.2, z: 7.5, color: GREY }),                                        // the bridge
    box(3.4, 0.5, 0.1, { y: fb + 3.4, z: 9.05, color: 0x2a3a44 }),
    P.cyl(0.55, 0.6, 3, { y: fb + 3.6, z: 2.5, color: DARK }, 10),                                 // the funnel
    P.cyl(0.08, 0.1, 10, { y: fb + 7, z: 6, color: DARK }, 6),                                     // the mast
    P.box(3, 0.08, 0.08, { y: fb + 9.5, z: 6, color: DARK }),
    P.cyl(0.6, 0.7, 0.6, { y: fb + 0.4, z: L / 2 - 7, color: STEEL }, 10),                        // the 3-inch gun's mount
    P.cyl(0.07, 0.09, 3, { y: fb + 0.72, z: L / 2 - 5.4, rx: Math.PI / 2, color: STEEL }, 8),
    box(2.4, 1.4, 2, { y: fb + 0.7, z: -L / 2 + 6, color: DARK }),                                 // the sweep winch
    ...[-1, 1].flatMap((s) => [
      P.cyl(0.35, 0.35, 2.4, { x: s * 2.2, y: fb + 0.4, z: -L / 2 + 2.5, rx: Math.PI / 2, color: 0xb84a2a }, 8), // the floats, red
      P.box(0.1, 1.2, 1.6, { x: s * 3.3, y: fb + 0.6, z: -L / 2 + 3.5, color: STEEL }),               // the otter boards
    ]),
  ]);
  return { fixed, ramp: null, hinge: [0, 0], gunAt: [fb + 1, L / 2 - 4] };
});

/**
 * LSM(R)-188: a medium landing ship turned rocket ship (Iwo Jima, Okinawa) — the long low hull, the round
 * conning tower to starboard aft, the 5-inch gun on the stern, and the well deck forward full of rocket
 * launchers in rows: a ripple of hundreds of 5-inch rockets onto the beach before the first wave lands.
 */
export const buildLSMR = craft(() => {
  const L = 62, B = 10.5, fb = 2.8;
  const fixed = merge([
    box(B, 3.4, L - 6, { y: fb - 1.7, z: -2, color: GREY }),
    P.box(B * 0.55, 3.0, 6, { y: fb - 1.4, z: L / 2 - 5, color: GREY, surf: 'plate' }),            // the bow, narrowing
    box(B - 0.6, 0.12, L - 8, { y: fb + 0.05, z: -2, color: STEEL, surf: 'deck' }),
    ...[-1, 1].map((s) => box(0.3, 1.0, L - 10, { x: s * (B / 2 - 0.15), y: fb + 0.5, z: -1, color: GREY })), // the bulwarks
    P.cyl(2.1, 2.3, 5.5, { x: B / 2 - 2.6, y: fb + 2.75, z: -L / 2 + 14, color: GREY }, 16),      // the round conning tower, to starboard
    box(3.6, 0.5, 0.1, { x: B / 2 - 2.6, y: fb + 4.6, z: -L / 2 + 16.1, color: 0x2a3a44 }),
    P.cyl(0.08, 0.1, 9, { x: B / 2 - 2.6, y: fb + 9.5, z: -L / 2 + 14, color: DARK }, 6),           // the mast
    P.cyl(0.9, 1.0, 1.0, { y: fb + 0.5, z: -L / 2 + 4.5, color: STEEL }, 12),                       // the 5-inch mount aft
    P.box(1.6, 1.3, 2.0, { y: fb + 1.5, z: -L / 2 + 4.5, color: GREY }),
    P.cyl(0.08, 0.1, 4, { y: fb + 1.6, z: -L / 2 + 1.7, rx: Math.PI / 2, color: STEEL }, 8),
    // the rocket launchers: rows of racks over the forward deck, each a frame of rails angled up
    ...Array.from({ length: 6 }, (_, i) => i).flatMap((i) => [-2.6, 0, 2.6].flatMap((x) => [
      box(2.0, 0.12, 2.2, { x, y: fb + 0.9, z: -4 + i * 4.2, rx: -0.6, color: DARK }),
      ...[-0.7, 0, 0.7].map((dx) => box(0.12, 0.12, 2.4, { x: x + dx, y: fb + 1.05, z: -4 + i * 4.2, rx: -0.6, color: STEEL })),
      box(1.8, 0.7, 0.14, { x, y: fb + 0.4, z: -4 + i * 4.2 - 0.6, color: DARK }),
    ])),
  ]);
  return { fixed, ramp: null, hinge: [0, 0], gunAt: [fb + 2, 4] };
});

/** A DD Sherman afloat: the canvas screen raised all round on its struts, the hull below the water, the turret top inside it, the twin propellers astern. */
export const buildDD = craft(() => {
  const L = 6.2, B = 3, CANVAS = 0x8c8a6c, OLIVE = 0x4c5434;
  const fixed = merge([
    box(B, 1.2, L, { y: -0.5, color: OLIVE }),                                                  // the hull, awash
    ...[-1, 1].map((s) => P.box(0.08, 1.9, L * 0.92, { x: s * (B / 2 + 0.25), y: 0.85, color: CANVAS, surf: 'cloth' })), // the screen's sides
    P.box(B + 0.5, 1.9, 0.08, { y: 0.85, z: L / 2 - 0.1, color: CANVAS, surf: 'cloth' }),       // its bow…
    P.box(B + 0.5, 1.9, 0.08, { y: 0.85, z: -L / 2 + 0.1, color: CANVAS, surf: 'cloth' }),      // …and stern
    ...[-1, 1].flatMap((s) => [-2, 0, 2].map((z) => P.cyl(0.04, 0.04, 1.9, { x: s * (B / 2 + 0.2), y: 0.85, z, color: STEEL }, 4))), // the struts
    P.box(0.3, 0.12, L * 0.9, { y: 1.85, x: -B / 2 - 0.25, color: STEEL }), P.box(0.3, 0.12, L * 0.9, { y: 1.85, x: B / 2 + 0.25, color: STEEL }), // the top rail
    P.cyl(0.9, 1.0, 1.6, { y: 0.85, z: -0.3, color: OLIVE }, 12),                               // the turret, its top inside the screen
    P.cyl(0.07, 0.08, 1.2, { y: 1.3, z: 0.6, rx: Math.PI / 2, color: OLIVE }, 6),               // the gun, stowed
    ...[-1, 1].map((s) => P.cyl(0.35, 0.35, 0.1, { x: s * 0.8, y: -0.5, z: -L / 2 - 0.4, rx: Math.PI / 2, color: STEEL }, 8)), // the propellers
  ]);
  return { fixed, ramp: null, hinge: [0, 0], gunAt: [1.4, 1] };
});

/** The Higgins boat: 10.9 × 3.3 m. */
export const buildLCVP = craft(() => {
  const L = 10.9, B = 3.3, fb = 1.5;
  const fixed = merge([
    // the hull, open: the bottom under the well, the sides and the stern sheets round it, all of it up to the ramp's hinge
    box(B, 0.45, L - 0.55 + 0.1, { y: 0.125, z: -0.275 + 0.05, color: GREY }),
    ...[-1, 1].map((s) => box(0.15, 2.1, L - 0.55 + 0.1, { x: s * (B / 2 - 0.075), y: 0.95, z: -0.275 + 0.05, color: GREY })),
    box(B, 2.1, 2.0, { y: 0.95, z: -L / 2 + 1.0, color: GREY }),
    box(B - 0.3, 0.12, L - 2.0 - 0.55, { y: 0.35, z: (-L / 2 + 2.0 + L / 2 - 0.55) / 2, color: WOOD, surf: 'deck' }), // the well's floor
    ...[-1, 1].map((s) => box(0.1, 0.5, L - 2.2, { x: s * (B / 2 - 0.05), y: fb + 0.25, z: -0.5, color: GREY })), // her high sides
    box(B, 0.6, 1.4, { y: fb + 0.3, z: -L / 2 + 0.7, color: GREY }),                   // the stern sheets
    box(1.1, 0.8, 1.0, { x: 0.6, y: fb + 0.6, z: -L / 2 + 1.6, color: DARK }),         // the coxswain's station
    ...[-1, 1].flatMap((s) => [
      P.cyl(0.45, 0.45, 0.1, { x: s * 1.15, y: fb + 0.52, z: -L / 2 + 2.1, color: STEEL }, 10),  // the gun rings (on her sides)
      P.cyl(0.04, 0.04, 0.4, { x: s * 1.15, y: fb + 0.72, z: -L / 2 + 2.1, color: STEEL }, 5),    // the pintles
      P.cyl(0.05, 0.05, 1.1, { x: s * 1.15, y: fb + 0.92, z: -L / 2 + 2.55, rx: Math.PI / 2 - 0.15, color: BLACK }, 5), // the .30s
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
    // the hull, open: the bottom under the tank deck, the wing walls either side of it, the stern, up to the ramp's hinge
    box(B, 0.9, L - 0.3 + 0.1, { y: 0.45, z: -0.15 + 0.05, color: GREY }),
    ...[-1, 1].map((s) => box(0.6, 3.8, L - 0.3 + 0.1, { x: s * (B / 2 - 0.3), y: 1.9, z: -0.15 + 0.05, color: GREY })),
    box(B, 3.8, 4.7, { y: 1.9, z: -L / 2 + 2.35, color: GREY }),
    box(B - 1.2, 0.15, L - 4.7 - 0.8, { y: 0.9, z: (-L / 2 + 4.7 + L / 2 - 0.8) / 2, color: STEEL, surf: 'deck' }), // the tank deck
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

// The other navies' craft on the same frame (data/units45/ships.js lcvp/lct per army):
//   LCA (Royal Navy): 12.6 m, low and armoured, the troop well roofed over at the sides, the coxswain's armoured
//        cockpit forward to starboard, the armoured bow doors in front of the ramp
//   LCT Mk 4 (Royal Navy): 57 m, long and thin-skinned, the open tank deck, bridge and funnel on the starboard quarter
//   Pionierlandungsboot 39 (Heer engineers): 15.5 m, a steel box with a bow ramp, the small wheelhouse aft
//   Marinefährprahm (Kriegsmarine): 47 m, the raised bow ramp, the open hold, wheelhouse and gun platforms aft
//   Shōhatsu (Imperial Army): 10.6 m of wood, a bow ramp, the helmsman aft
//   Daihatsu (Imperial Army): 14.9 m, the twin keel, the split bow with the ramp between its two halves
const RN_GREY = 0x8a9399, RN_DK = 0x5e676c, KM_GREY = 0x8a9096, KM_DK = 0x60666a, HEER = 0x5f6560, IJA = 0x62685a, IJA_DK = 0x464a3e, WOOD_JP = 0x6b6250;
const GLASS = 0x2a3a44;

/** LCA: 12.6 × 3.0 m. */
export const buildLCA = craft(() => {
  const L = 12.6, B = 3.0, fb = 1.6, h = L / 2 - 0.5;
  const fixed = merge([
    box(B, 0.45, L - 0.5, { y: 0.2, z: -0.25, color: RN_GREY }),                                         // the bottom
    ...[-1, 1].map((s) => box(0.15, fb, L - 0.5, { x: s * (B / 2 - 0.075), y: fb / 2, z: -0.25, color: RN_GREY })), // the sides
    box(B, fb, 2.4, { y: fb / 2, z: -L / 2 + 1.2, color: RN_GREY }),                                     // the engine room aft
    box(B - 0.3, 0.1, L - 2.9, { y: 0.42, z: 0.95, color: WOOD, surf: 'deck' }),                         // the well's floor
    ...[-1, 1].flatMap((s) => [
      box(0.08, 0.35, L - 3, { x: s * B / 2, y: fb + 0.17, z: 0, color: RN_DK }),                        // the armoured bulwarks
      box(0.85, 0.08, 7.2, { x: s * (B / 2 - 0.5), y: fb + 0.36, z: 0.4, color: RN_DK }),                // the armoured roof over the side benches
      box(0.45, 2.0, 0.2, { x: s * (B / 2 - 0.22), y: 1.0, z: h - 0.15, color: RN_DK }),                 // the bow posts either side of the doors
    ]),
    box(B, 0.3, 0.2, { y: 2.05, z: h - 0.15, color: RN_DK }),                                            // over the doorway
    box(0.9, 0.9, 1.1, { x: -0.95, y: fb + 0.85, z: h - 1.3, color: RN_DK }),                           // the coxswain's armoured cockpit, starboard
    box(0.7, 0.08, 0.02, { x: -0.95, y: fb + 1.05, z: h - 0.74, color: BLACK }),                        //   its vision slit
    box(0.7, 0.5, 0.7, { x: 0.95, y: fb + 0.65, z: h - 1.3, color: RN_DK }),                            // the Bren gunner's shield, port
    P.cyl(0.04, 0.04, 0.9, { x: 0.95, y: fb + 1.0, z: h - 0.9, rx: Math.PI / 2, color: BLACK }, 5),
    box(B - 0.4, 0.4, 1.8, { y: fb + 0.2, z: -L / 2 + 1.1, color: RN_DK }),                             // the engine hatch
    box(B * 0.9, 0.25, 0.4, { y: -0.1, z: -0.4, color: 0x2a2420 }),
  ]);
  const ramp = merge([
    box(B - 0.6, 1.5, 0.12, { y: 0.75, color: STEEL, surf: 'metal' }),
    ...[-1, 1].map((s) => box((B - 0.6) / 2 - 0.04, 1.45, 0.06, { x: s * (B - 0.6) / 4, y: 0.76, z: 0.09, color: RN_DK, surf: 'metal' })), // the armoured doors (open with her ramp)
  ]);
  return { fixed, ramp, hinge: [0.4, h], gunAt: [fb + 1, h - 1] };
});

/** LCT Mk 4: 57 × 11.8 m. */
export const buildLCT4 = craft(() => {
  const L = 57, B = 11.8, H = 3.2, h = L / 2 - 0.8, bx = -(B / 2 - 2.4); // (starboard: -x)
  const fixed = merge([
    box(B, 0.9, L - 0.7, { y: 0.45, z: -0.35, color: RN_GREY }),
    ...[-1, 1].map((s) => box(0.7, H, L - 0.7, { x: s * (B / 2 - 0.35), y: H / 2, z: -0.35, color: RN_GREY })), // the wing walls
    box(B, H, 7, { y: H / 2, z: -L / 2 + 3.5, color: RN_GREY }),                                         // the stern
    box(B - 1.4, 0.15, L - 7.8, { y: 0.9, z: 3.1, color: STEEL, surf: 'deck' }),                          // the tank deck
    box(3.8, 3.0, 4.4, { x: bx, y: H + 1.5, z: -L / 2 + 6.6, color: RN_GREY }),                          // the bridge, on the starboard quarter
    box(4.2, 0.15, 5.0, { x: bx, y: H + 3.1, z: -L / 2 + 6.8, color: RN_DK }),
    box(4.0, 0.9, 0.1, { x: bx, y: H + 3.6, z: -L / 2 + 9.3, color: RN_GREY }),                          // its screen
    box(3.4, 0.4, 0.06, { x: bx, y: H + 2.3, z: -L / 2 + 8.85, color: GLASS }),
    P.cyl(0.7, 0.75, 3.4, { x: bx, y: H + 1.7, z: -L / 2 + 3.0, color: RN_GREY }, 10),                    // the funnel, abaft it
    P.cyl(0.72, 0.72, 0.4, { x: bx, y: H + 3.5, z: -L / 2 + 3.0, color: BLACK }, 10),
    P.cyl(0.06, 0.06, 7, { x: bx, y: H + 6.5, z: -L / 2 + 6.2, color: BLACK }, 5),                        // the mast
    P.box(2.4, 0.06, 0.06, { x: bx, y: H + 8.5, z: -L / 2 + 6.2, color: BLACK }),
    ...[[bx - 1.0, -L / 2 + 10], [B / 2 - 1.4, -L / 2 + 6]].flatMap(([x, z]) => [                        // the Oerlikon tubs
      P.cyl(0.8, 0.8, 0.9, { x, y: H + 0.45, z, color: RN_GREY }, 10),
      P.cyl(0.05, 0.06, 1.6, { x, y: H + 1.3, z: z + 0.6, rx: Math.PI / 2 - 0.4, color: BLACK }, 5),
    ]),
    ...[-6, 0, 6].map((z) => box(1.0, 0.4, 0.4, { x: B / 2 - 0.35, y: H + 0.2, z, color: RN_DK })),       // bitts on the port wing wall
    box(2.2, 0.8, 2.0, { x: 2.5, y: H + 0.4, z: -L / 2 + 3, color: RN_DK }),                              // the capstan housing aft
  ]);
  const ramp = merge([
    box(B - 2.0, 3.0, 0.25, { y: 1.5, color: STEEL, surf: 'metal' }),
    ...[0.7, 1.4, 2.1].map((y) => box(B - 2.1, 0.08, 0.15, { y, z: -0.15, color: DARK, surf: 'metal' })),
  ]);
  return { fixed, ramp, hinge: [0.8, h], gunAt: [H + 2, -L / 2 + 10] };
});

/** Pionierlandungsboot 39: 15.5 × 4.5 m. */
export const buildPiLB = craft(() => {
  const L = 15.5, B = 4.5, fb = 2.0, h = L / 2 - 0.5;
  const fixed = merge([
    box(B, 0.5, L - 0.5, { y: 0.25, z: -0.25, color: HEER }),
    ...[-1, 1].flatMap((s) => [
      box(0.15, fb, L - 0.5, { x: s * (B / 2 - 0.075), y: fb / 2, z: -0.25, color: HEER }),
      box(0.12, 0.15, L - 1, { x: s * (B / 2 + 0.04), y: fb - 0.1, z: -0.25, color: DARK }),           // the rubbing strake
      box(0.4, 0.4, 1.2, { x: s * (B / 2 - 0.2), y: fb + 0.2, z: h - 0.6, color: HEER }),              // the bow cheeks
    ]),
    box(B, fb, 3.6, { y: fb / 2, z: -L / 2 + 1.8, color: HEER }),                                        // the engine room aft
    box(B - 0.3, 0.1, L - 4.1, { y: 0.52, z: 1.55, color: STEEL, surf: 'deck' }),                         // the hold
    box(2.0, 1.5, 1.8, { y: fb + 0.75, z: -L / 2 + 2.2, color: HEER }),                                  // the wheelhouse
    box(2.2, 0.1, 2.0, { y: fb + 1.55, z: -L / 2 + 2.2, color: DARK }),
    box(1.8, 0.35, 0.05, { y: fb + 1.1, z: -L / 2 + 3.12, color: GLASS }),
    P.cyl(0.04, 0.04, 1.0, { y: fb + 1.8, z: -L / 2 + 2.6, rx: Math.PI / 2, color: BLACK }, 5),          // the MG 34 on the roof
    ...[-1, 1].map((s) => P.cyl(0.12, 0.12, 1.0, { x: s * 1.6, y: fb + 0.5, z: -L / 2 + 0.6, color: BLACK }, 6)), // the exhausts
  ]);
  const ramp = merge([
    box(B - 0.6, 1.9, 0.14, { y: 0.95, color: STEEL, surf: 'metal' }),
    ...[0.5, 1.0, 1.5].map((y) => box(B - 0.65, 0.06, 0.1, { y, z: -0.1, color: DARK, surf: 'metal' })),
  ]);
  return { fixed, ramp, hinge: [0.5, h], gunAt: [fb + 2, -L / 2 + 3] };
});

/** Marinefährprahm (type A): 47 × 6.6 m. */
export const buildMFP = craft(() => {
  const L = 47, B = 6.6, H = 3.0, h = L / 2 - 1.0;
  const fixed = merge([
    box(B, 1.0, L - 1, { y: 0.5, z: -0.5, color: KM_GREY }),
    ...[-1, 1].flatMap((s) => [
      box(0.4, H, L - 1, { x: s * (B / 2 - 0.2), y: H / 2, z: -0.5, color: KM_GREY }),
      box(0.5, 1.6, 4.5, { x: s * (B / 2 - 0.25), y: H + 0.8, z: h - 2.25, color: KM_GREY }),          // the raised bow
    ]),
    box(B, 0.3, 0.5, { y: H + 1.45, z: h - 4.3, color: KM_DK }),                                          // the bow's crossbeam
    box(B, H, 13, { y: H / 2, z: -L / 2 + 6.5, color: KM_GREY }),                                         // the stern
    box(B - 0.8, 0.12, 32.5, { y: 1.0, z: 5.75, color: STEEL, surf: 'deck' }),                            // the open hold
    box(3.2, 2.2, 3.2, { y: H + 1.1, z: -12.5, color: KM_GREY }),                                         // the wheelhouse
    box(3.0, 0.4, 0.05, { y: H + 1.6, z: -10.88, color: GLASS }),
    box(3.6, 0.12, 3.8, { y: H + 2.26, z: -12.5, color: KM_DK }),
    P.cyl(0.55, 0.55, 0.5, { y: H + 2.55, z: -12.8, color: KM_DK }, 10),                                  // a 2 cm flak on its roof
    P.cyl(0.05, 0.06, 1.6, { y: H + 3.0, z: -12.0, rx: Math.PI / 2 - 0.4, color: BLACK }, 5),
    P.cyl(1.4, 1.5, 1.0, { y: H + 0.5, z: -19, color: KM_GREY }, 12),                                    // the gun platform aft
    box(1.6, 1.3, 0.12, { y: H + 1.6, z: -18.5, color: KM_DK }),                                          // the 7.5 cm's shield
    P.cyl(0.6, 0.6, 0.8, { y: H + 1.3, z: -19.1, color: KM_DK }, 10),
    P.cyl(0.08, 0.1, 3.6, { y: H + 1.6, z: -20.9, rx: Math.PI / 2, color: BLACK }, 6),                     //   its barrel, over the stern
    P.cyl(0.8, 0.8, 0.8, { x: 2.0, y: H + 0.4, z: -9.5, color: KM_GREY }, 10),                            // a 2 cm tub forward of the bridge
    P.cyl(0.05, 0.06, 1.6, { x: 2.0, y: H + 1.2, z: -8.9, rx: Math.PI / 2 - 0.4, color: BLACK }, 5),
    P.cyl(0.05, 0.05, 5, { y: H + 4.7, z: -13.4, color: BLACK }, 5),                                       // the mast
    ...[-1, 1].map((s) => P.cyl(0.15, 0.15, 1.2, { x: s * 2.6, y: H + 0.6, z: -22.4, color: BLACK }, 6)),  // the exhausts
  ]);
  const ramp = merge([
    box(B - 1.4, 3.8, 0.25, { y: 1.9, color: STEEL, surf: 'metal' }),
    ...[0.9, 1.8, 2.7].map((y) => box(B - 1.5, 0.08, 0.15, { y, z: -0.15, color: DARK, surf: 'metal' })),
  ]);
  return { fixed, ramp, hinge: [1.0, h], gunAt: [H + 2, -16] };
});

/** Shōhatsu: 10.6 × 2.4 m of wood. */
export const buildShohatsu = craft(() => {
  const L = 10.6, B = 2.4, fb = 1.4, h = L / 2 - 0.4;
  const fixed = merge([
    box(B, 0.4, L - 0.4, { y: 0.2, z: -0.2, color: WOOD_JP }),
    ...[-1, 1].flatMap((s) => [
      box(0.12, fb, L - 0.4, { x: s * (B / 2 - 0.06), y: fb / 2, z: -0.2, color: WOOD_JP }),
      ...[0.5, 1.0].map((y) => box(0.04, 0.06, L - 0.6, { x: s * (B / 2 + 0.01), y, z: -0.2, color: IJA_DK })), // the strakes
    ]),
    box(B, fb, 2.0, { y: fb / 2, z: -L / 2 + 1.0, color: WOOD_JP }),                                     // the engine aft
    box(B - 0.24, 0.08, L - 2.4, { y: 0.42, z: 0.8, color: WOOD, surf: 'deck' }),
    box(1.0, 0.5, 0.06, { x: 0.4, y: fb + 0.25, z: -L / 2 + 1.9, color: IJA_DK }),                       // the helmsman's screen
    P.cyl(0.1, 0.1, 0.8, { x: -0.6, y: fb + 0.4, z: -L / 2 + 0.5, color: BLACK }, 6),                    // the exhaust
  ]);
  const ramp = merge([
    box(B - 0.4, 1.3, 0.12, { y: 0.65, color: WOOD_JP, surf: 'deck' }),
    ...[0.4, 0.8].map((y) => box(B - 0.45, 0.06, 0.08, { y, z: -0.08, color: IJA_DK })),
  ]);
  return { fixed, ramp, hinge: [0.35, h], gunAt: [fb + 1, -L / 2 + 2] };
});

/** Daihatsu (type A, 14 m class): 14.9 × 3.4 m. */
export const buildDaihatsu = craft(() => {
  const L = 14.9, B = 3.4, fb = 1.6, h = L / 2 - 1.8;
  const fixed = merge([
    box(B, 0.45, L - 1.8, { y: 0.22, z: -0.9, color: IJA }),
    ...[-1, 1].flatMap((s) => [
      box(0.15, fb, L - 1.8, { x: s * (B / 2 - 0.075), y: fb / 2, z: -0.9, color: IJA }),
      box(0.7, fb, 1.8, { x: s * (B / 2 - 0.35), y: fb / 2, z: L / 2 - 0.9, color: IJA }),              // the split bow: a half either side of the ramp
      box(0.5, 0.8, 1.2, { x: s * (B / 2 - 0.35), y: 0.2, z: L / 2 - 0.4, rx: 0.5, color: IJA }),        //   their forefoot
      box(0.3, 0.35, L - 3, { x: s * 1.0, y: -0.15, z: -0.5, color: IJA_DK }),                           // the twin keel
      P.cyl(0.04, 0.04, 1.0, { x: s * 1.3, y: fb + 0.4, z: -L / 2 + 3.0, rx: Math.PI / 2 - 0.2, color: BLACK }, 5), // the 7.7 mm guns
    ]),
    box(B, fb, 3.0, { y: fb / 2, z: -L / 2 + 1.5, color: IJA }),                                         // the engine aft
    box(B - 0.3, 0.1, L - 4.8, { y: 0.48, z: 0.6, color: WOOD, surf: 'deck' }),
    box(1.4, 1.2, 1.4, { y: fb + 0.6, z: -L / 2 + 1.8, color: IJA }),                                    // the little wheelhouse
    box(1.2, 0.3, 0.05, { y: fb + 0.9, z: -L / 2 + 2.52, color: GLASS }),
    box(1.6, 0.08, 1.6, { y: fb + 1.24, z: -L / 2 + 1.8, color: IJA_DK }),
  ]);
  const ramp = merge([
    box(B - 1.5, 1.5, 0.14, { y: 0.75, color: STEEL, surf: 'metal' }),
    ...[0.5, 1.0].map((y) => box(B - 1.55, 0.06, 0.1, { y, z: -0.1, color: DARK, surf: 'metal' })),
  ]);
  return { fixed, ramp, hinge: [0.45, h], gunAt: [fb + 1, -L / 2 + 3] };
});
