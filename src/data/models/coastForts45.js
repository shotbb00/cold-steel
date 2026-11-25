// The 1945 epoch's coastal forts for the armies that hold a beach but are not the Wehrmacht (models/atlanticWall.js
// is the German Atlantic Wall), in the same kit:
//   British   a Type 24 hexagonal pillbox (a Bren in its loopholes, a blast wall at the door), a Type 28 anti-tank
//             pillbox (the 2-pounder behind a stepped embrasure), and a 6-inch coast gun on its pivot in an open
//             emplacement under the thick concrete canopy against air attack
//   US        Oahu 1942: a low concrete pillbox faced with lava rock (firing slits, a Browning), a 37 mm casemate
//             under a camouflage net, and a 155 mm GPF on a Panama mount (round pivot, steel rail for the trails)
//   Japanese  a coconut-log-and-coral pillbox (low, earth-covered, a firing slit, palm fronds over it), the same
//             bigger with a concrete face for the 47 mm, a 12 cm naval gun in a casemate set into the hillside,
//             and a command dugout under logs and earth (the Lanes mode's headquarters)
// Built as render/RigRenderer.js rigs: { root, muzzle, animate(u, dt), die(time) }.
import * as THREE from 'three';
import { P, merge, pair, grime } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';

const DARK = 0x141412;
const STEEL = 0x34362f;
const BAG = 0xa8966a;
const EARTH = 0x5e5340;
const cache = {};
const once = (key, make) => (cache[key] ??= make());
const relYaw = (u) => Math.atan2(Math.sin((u.turretYaw ?? u.yaw) - u.yaw), Math.cos((u.turretYaw ?? u.yaw) - u.yaw));
const clamp = (v, a) => Math.max(-a, Math.min(a, v));

/** A rig from `geoOf()` ({ base, gun } geometry, made on first use): the gun group at `at`, the muzzle at `tip` in it, traversing within `arc` (Infinity: all round). */
export function fortRig(geoOf, { at = [0, 0, 0], tip = [0, 0, 1], arc = Infinity, recoil = 0.3, pitch = true } = {}) {
  return (mats) => {
    const geo = geoOf();
    const root = new THREE.Group();
    meshAdder(root)(geo.base, mats.body);
    const gun = new THREE.Group();
    gun.position.set(...at);
    root.add(gun);
    if (geo.gun) meshAdder(gun)(geo.gun, mats.body);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(...tip);
    gun.add(muzzle);
    return {
      root,
      muzzle,
      animate(u) {
        gun.rotation.y = clamp(relYaw(u), arc);
        if (pitch) gun.rotation.x = -(u.gunPitch ?? 0.02);
        gun.position.z = at[2] - (u.recoil ?? 0) * recoil;
      },
      die(time) {
        gun.rotation.x = Math.min(0.3, time * 0.4);
        gun.rotation.z = Math.min(0.25, time * 0.3);
        root.scale.y = Math.max(0.8, 1 - time * 0.15); // (the roof cracks and sags)
      },
    };
  };
}

// ---------------------------------------------------------------- British

const BR_CONCRETE = 0xa4a196, BR_DARK = 0x7c796f;

/** Type 24: an irregular hexagon (the rear face longer, the door in it), 5 loopholes, a blast wall behind. */
export const buildBritPillbox = fortRig(() => once('br24', () => {
  const r = 2.35, a = r * Math.cos(Math.PI / 6), h = 2.0;
  const faces = [0, 1, 2, 4, 5].map((i) => {
    const t = (i * Math.PI) / 3;
    return [
      P.box(1.0, 0.5, 0.12, { x: Math.sin(t) * (a + 0.02), y: 1.2, z: Math.cos(t) * (a + 0.02), ry: t, color: BR_DARK }),   // the stepped surround…
      P.box(0.7, 0.24, 0.14, { x: Math.sin(t) * (a + 0.05), y: 1.2, z: Math.cos(t) * (a + 0.05), ry: t, color: DARK }),     // …and the loophole
    ];
  }).flat();
  return {
    base: grime(merge([
      P.cyl(r, r + 0.05, h + 0.3, { y: (h - 0.3) / 2, ry: Math.PI / 6, sz: 0.94, color: BR_CONCRETE }, 6),   // the walls, sunk a little
      P.cyl(r + 0.18, r + 0.18, 0.32, { y: h + 0.05, ry: Math.PI / 6, sz: 0.94, color: BR_CONCRETE }, 6),     // the roof slab, a lip all round
      ...faces,
      P.box(0.8, 1.6, 0.12, { y: 0.8, z: -a * 0.94 - 0.02, color: 0x2a2620 }),                                 // the door
      ...pair((s) => P.box(0.3, 0.2, 0.1, { x: s * 0.85, y: 1.2, z: -a * 0.94 - 0.03, color: DARK })),         // its two rifle loops
      P.box(2.6, 1.7, 0.45, { y: 0.75, z: -a - 1.0, color: BR_CONCRETE }),                                      // the blast wall
      ...[-0.9, 0, 0.9].map((x) => P.box(0.8, 0.28, 0.45, { x, y: 0.14, z: -a - 1.5, color: BAG })),           // sandbags at its foot
    ]), 1.2, 0.1, 0.5),
    gun: merge([
      P.box(0.14, 0.16, 0.7, { y: 1.2, z: a - 0.55, color: STEEL }),                                             // the Bren
      P.cyl(0.03, 0.03, 0.5, { y: 1.22, z: a + 0.05, rx: Math.PI / 2, color: STEEL }, 6),
      P.box(0.08, 0.2, 0.06, { y: 1.36, z: a - 0.5, color: STEEL }),                                             // its magazine on top
    ]),
  };
}), { tip: [0, 1.22, 2.35 * Math.cos(Math.PI / 6) + 0.3], recoil: 0.02, pitch: false });

/** Type 28: the anti-tank pillbox, the 2-pounder behind a wide stepped embrasure. */
export const buildBritType28 = fortRig(() => once('br28', () => {
  const w = 5.4, d = 5.0, h = 2.4;
  return {
    base: grime(merge([
      P.box(w, h + 0.4, d, { y: (h - 0.4) / 2, color: BR_CONCRETE }),
      P.box(w + 0.4, 0.4, d + 0.4, { y: h + 0.15, color: BR_CONCRETE }),                       // the roof, overhanging
      P.box(3.2, 1.6, 0.2, { y: 1.15, z: d / 2 + 0.05, color: BR_DARK }),                      // the embrasure's outer step…
      P.box(2.6, 1.15, 0.24, { y: 1.1, z: d / 2 + 0.08, color: 0x5c5a53 }),                    // …the inner…
      P.box(2.0, 0.75, 0.26, { y: 1.05, z: d / 2 + 0.1, color: DARK }),                        // …and the black mouth
      ...pair((s) => P.box(0.12, 0.22, 0.6, { x: s * (w / 2 + 0.02), y: 1.3, z: 0.6, color: DARK })), // the side loopholes
      P.box(0.9, 1.7, 0.12, { x: -1.3, y: 0.85, z: -d / 2 - 0.02, color: 0x2a2620 }),          // the door
    ]), 1.4, 0.1, 0.5),
    gun: merge([
      P.box(0.9, 0.6, 1.0, { color: STEEL }),                                                  // the breech
      P.box(1.3, 0.8, 0.06, { y: 0.15, z: 0.65, color: 0x4a4e3a }),                            // the shield
      P.cyl(0.05, 0.07, 2.0, { z: 1.6, rx: Math.PI / 2, color: STEEL }, 8),                    // the 2-pdr's barrel
    ]),
  };
}), { at: [0, 1.05, 1.0], tip: [0, 0, 2.7], arc: 0.6, recoil: 0.3 });

/** The 6-inch coast gun: on its pivot in a round apron, a parapet to the sea, the canopy on its rear wall and piers. */
export const buildBritBattery = fortRig(() => once('brcb', () => {
  const parapet = Array.from({ length: 7 }, (_, i) => {
    const t = -1.2 + (i * 2.4) / 6;
    return P.box(2.2, 1.0, 0.9, { x: Math.sin(t) * 5.6, y: 0.4, z: Math.cos(t) * 5.6, ry: t, color: BR_CONCRETE });
  });
  return {
    base: grime(merge([
      P.cyl(5.6, 6.0, 0.6, { y: -0.1, color: BR_DARK }, 18),                                   // the apron
      P.cyl(1.4, 1.5, 0.5, { y: 0.35, color: STEEL }, 14),                                     // the holdfast ring
      ...parapet,
      P.box(10, 0.75, 6.2, { y: 3.9, z: -1.0, color: BR_CONCRETE }),                           // the canopy
      P.box(10, 3.6, 0.9, { y: 1.8, z: -3.9, color: BR_CONCRETE }),                            // the rear wall
      ...pair((s) => P.box(0.9, 3.6, 2.6, { x: s * 4.6, y: 1.8, z: -2.4, color: BR_CONCRETE })), // the side piers
      ...pair((s) => P.box(1.1, 1.8, 0.1, { x: s * 2.2, y: 0.9, z: -3.43, color: 0x2a2620 })), // the magazine and shell-hoist doors
      P.box(10.6, 0.25, 6.8, { y: 4.38, z: -1.0, color: 0x5a6440 }),                           // turf over the canopy
      P.box(14, 1.2, 4, { y: 0.2, z: -6.5, rx: 0.4, color: EARTH }),                           // earth banked behind
    ]), 1.6, 0.2, 0.6),
    gun: merge([
      P.cyl(0.75, 0.9, 0.9, { y: -0.6, color: STEEL }, 12),                                    // the pedestal
      P.box(1.3, 1.0, 2.2, { y: 0.1, z: -0.3, color: STEEL }),                                 // the cradle and breech
      P.box(2.8, 2.1, 0.12, { y: 0.35, z: 0.9, color: 0x5d6150 }),                             // the shield: front…
      ...pair((s) => P.box(0.1, 2.1, 1.6, { x: s * 1.4, y: 0.35, z: 0.15, color: 0x5d6150 })), // …sides…
      P.box(2.8, 0.1, 1.7, { y: 1.4, z: 0.1, rx: -0.12, color: 0x5d6150 }),                    // …and roof
      P.cyl(0.14, 0.2, 7.0, { z: 4.3, rx: Math.PI / 2, color: STEEL }, 12),                    // the 45-calibre barrel
    ]),
  };
}), { at: [0, 1.4, 0], tip: [0, 0, 7.9], arc: 1.1, recoil: 0.6 });

// ---------------------------------------------------------------- US (Oahu, 1942)

const US_CONCRETE = 0x9d988a, LAVA = 0x4b4640, OD = 0x55603a;

/** The beach pillbox: low, rectangular, faced with lava rock, three slits to the sea and one each side. */
export const buildUsPillbox = fortRig(() => once('uspb', () => {
  const w = 3.9, d = 3.0, h = 1.6;
  const rocks = Array.from({ length: 10 }, (_, i) => {
    const r = (k) => (Math.sin(i * 12.9 + k * 4.1) + 1) / 2;
    const front = i < 6;
    return front
      ? P.box(0.5 + r(1) * 0.4, 0.3 + r(2) * 0.2, 0.06, { x: (r(3) - 0.5) * (w - 0.8), y: 0.2 + r(4) * 0.5, z: d / 2 + 0.02, color: i % 2 ? LAVA : 0x5d574e })
      : P.box(0.06, 0.3 + r(2) * 0.2, 0.5 + r(1) * 0.4, { x: (i % 2 ? 1 : -1) * (w / 2 + 0.02), y: 0.2 + r(4) * 0.9, z: (r(3) - 0.5) * (d - 0.8), color: LAVA });
  });
  return {
    base: grime(merge([
      P.box(w, h + 0.3, d, { y: (h - 0.3) / 2, color: US_CONCRETE }),
      P.box(w + 0.3, 0.35, d + 0.3, { y: h + 0.1, color: US_CONCRETE }),                                  // the roof slab
      ...[-1.15, 0, 1.15].map((x) => P.box(0.7, 0.17, 0.08, { x, y: 1.1, z: d / 2 + 0.03, color: DARK })), // the slits
      ...pair((s) => P.box(0.08, 0.17, 0.7, { x: s * (w / 2 + 0.03), y: 1.1, color: DARK })),
      ...rocks,
      P.box(w + 0.4, 1.0, 2.0, { y: -0.05, z: -d / 2 - 0.55, rx: 0.6, color: 0x7a5a3e }),               // the red earth banked behind
      P.box(0.8, 1.4, 0.1, { x: 1.2, y: 0.55, z: -d / 2 - 0.02, color: 0x2a2620 }),                      // the door
    ]), 1.0, 0.1, 0.5),
    gun: merge([
      P.box(0.18, 0.2, 0.8, { y: 1.08, z: d / 2 - 0.6, color: STEEL }),                                 // the M1919
      P.cyl(0.035, 0.035, 0.6, { y: 1.1, z: d / 2 + 0.05, rx: Math.PI / 2, color: STEEL }, 6),
      P.box(0.5, 0.45, 0.3, { y: 0.8, z: d / 2 - 1.2, color: OD }),                                     // the gunner
    ]),
  };
}), { tip: [0, 1.1, 1.85], arc: 1.3, recoil: 0.02, pitch: false });

/** The 37 mm casemate: a bigger concrete box with a wide embrasure, sandbags at its lip, a net over the roof. */
export const buildUsGunCasemate = fortRig(() => once('uscm', () => {
  const w = 5.6, d = 4.6, h = 2.1;
  return {
    base: grime(merge([
      P.box(w, h + 0.4, d, { y: (h - 0.4) / 2, color: US_CONCRETE }),
      P.box(w + 0.2, 0.4, d + 0.2, { y: h + 0.15, color: US_CONCRETE }),
      P.box(2.4, 0.9, 0.2, { y: 1.1, z: d / 2 + 0.03, color: DARK }),                          // the embrasure
      P.box(3.0, 0.2, 0.7, { y: 0.55, z: d / 2 + 0.3, color: US_CONCRETE }),                   // its sill
      ...[-1.2, -0.4, 0.4, 1.2].map((x) => P.box(0.78, 0.3, 0.45, { x, y: 0.3, z: d / 2 + 0.7, color: BAG })), // sandbags below it
      P.box(w + 3, h, 3, { y: 0.4, z: -d / 2 - 1, rx: 0.5, color: 0x7a5a3e }),                 // earth behind
      ...pair((s) => P.box(w * 0.5, 1.2, d + 1.2, { x: s * (w / 2 + 0.9), y: 0.2, rz: s * -0.6, color: 0x7a5a3e })),
      P.box(w + 1.4, 0.12, d + 1.2, { y: h + 0.45, color: OD, camo: 1 }),                      // the camouflage net
      ...[[-2.6, 1.8], [2.6, 1.8], [-2.6, -2], [2.6, -2]].map(([x, z]) => P.cyl(0.04, 0.04, 0.5, { x, y: h + 0.2, z, color: 0x6a5a3e }, 5)), // its posts
    ]), 1.3, 0.1, 0.5),
    gun: merge([
      P.box(0.7, 0.5, 0.9, { color: STEEL }),
      P.box(1.1, 0.7, 0.05, { y: 0.15, z: 0.6, color: OD }),                                   // the M3's shield
      P.cyl(0.045, 0.06, 2.0, { z: 1.5, rx: Math.PI / 2, color: STEEL }, 8),
    ]),
  };
}), { at: [0, 1.1, 0.9], tip: [0, 0, 2.6], arc: 0.6, recoil: 0.3 });

/** The 155 mm GPF on a Panama mount: a concrete pivot in the middle, a steel rail round the back for the trails to ride on. */
export const buildUsBattery = fortRig(() => once('usgpf', () => {
  const rail = Array.from({ length: 13 }, (_, i) => {
    const t = Math.PI * 0.35 + (i * Math.PI * 1.3) / 12;
    return [
      P.box(1.9, 0.35, 1.0, { x: Math.sin(t) * 6.2, y: 0.05, z: Math.cos(t) * 6.2, ry: t, color: US_CONCRETE }),
      P.box(1.9, 0.12, 0.18, { x: Math.sin(t) * 6.2, y: 0.28, z: Math.cos(t) * 6.2, ry: t, color: STEEL }),
    ];
  }).flat();
  const berm = Array.from({ length: 7 }, (_, i) => {
    const t = -0.9 + (i * 1.8) / 6;
    return P.box(1.5, 0.7, 0.8, { x: Math.sin(t) * 4.2, y: 0.3, z: Math.cos(t) * 4.2, ry: t, color: BAG });
  });
  return {
    base: grime(merge([
      P.cyl(1.8, 2.0, 0.5, { y: 0.1, color: US_CONCRETE }, 16),                                // the pivot block
      ...rail,
      ...berm,
    ]), 0.8, 0.1, 0.6),
    gun: merge([
      ...pair((s) => P.cyl(0.78, 0.78, 0.28, { x: s * 1.05, y: -0.82, rz: Math.PI / 2, color: 0x3a3c33 }, 14)), // the wheels
      P.cyl(0.08, 0.08, 2.2, { y: -0.82, rz: Math.PI / 2, color: STEEL }, 6),                  // the axle
      P.box(1.1, 0.6, 2.4, { y: -0.2, z: -0.2, color: OD }),                                   // the cradle and recuperator
      P.cyl(0.13, 0.2, 5.9, { y: 0.15, z: 2.4, rx: Math.PI / 2, color: OD }, 12),              // the barrel
      P.box(0.6, 0.6, 0.8, { y: 0.15, z: -1.0, color: STEEL }),                                // the breech
      ...pair((s) => P.box(0.3, 0.3, 5.4, { x: s * 1.6, y: -1.05, z: -3.2, ry: s * -0.28, rx: -0.12, color: OD })), // the split trails…
      ...pair((s) => P.box(0.7, 0.5, 0.2, { x: s * 2.35, y: -1.3, z: -5.7, color: STEEL })),   // …their spades on the rail
    ]),
  };
}), { at: [0, 1.6, 0], tip: [0, 0.15, 5.5], recoil: 0.5 });

// ---------------------------------------------------------------- Japanese

const CORAL = 0x8f8468, LOG = 0x5b4630, LOG_DK = 0x463525, FROND = 0x5d6b3a, JP_CONCRETE = 0x7d786c, ROCK = [0x46413a, 0x504a41, 0x3d3833];

const log = (len, o) => P.cyl(0.17, 0.17, len, { rz: Math.PI / 2, color: LOG, ...o }, 7);
const fronds = (n, r, y, seed) => Array.from({ length: n }, (_, i) => {
  const a = seed + i * 2.4;
  return P.box(0.5, 0.06, 2.0, { x: Math.sin(a) * r, y: y + (i % 2) * 0.05, z: Math.cos(a) * r * 0.8, ry: a, rx: 0.15, color: FROND });
});

/** The log pillbox: `k` its size; `concrete` the 47 mm's blockhouse (a concrete face under the logs, a wide embrasure). */
function jpBoxGeo(k, concrete) {
  return once(`jpbox${k}`, () => {
    const w = 3.4 * k, f = 2.2 * k, lg = (len, o) => log(len, { sx: k, sz: k, ...o });
    const row = (y, c = LOG) => lg(w, { y: y * k, z: f, color: c });
    const face = concrete
      ? [P.box(w, 1.05 * k, 0.7, { y: 0.45 * k, z: f + 0.05, color: JP_CONCRETE }),                 // a concrete face under the logs…
        P.box(w * 0.5, 0.26 * k, 0.1, { y: 0.84 * k, z: f + 0.41, color: DARK })]                    // …its wide embrasure
      : [row(0.17, LOG_DK), row(0.5, LOG_DK),                                                        // a wall of logs…
        ...pair((s) => lg(w * 0.3, { x: s * w * 0.35, y: 0.84 * k, z: f })),                         // …the slit row: a gap in the middle
        P.box(w * 0.4, 0.3 * k, 0.1, { y: 0.84 * k, z: f - 0.05, color: DARK })];                    // the dark behind the slit
    const roof = [-1.2, -0.4, 0.4, 1.2].map((z) => lg(w * 0.9, { y: 1.7 * k, z: z * k + 0.3 }));
    return {
      base: grime(merge([
        P.sphere(3.2 * k, { sy: 0.42, sz: 0.85, y: -0.1, color: CORAL }, 12, 6),                    // the mound of coral sand
        ...face, row(1.18), row(1.5),
        ...pair((s) => P.cyl(0.18, 0.18, 1.7 * k, { x: s * w * 0.5, y: 0.75 * k, z: f, color: LOG_DK }, 7)), // the corner posts
        ...roof,
        P.sphere(2.4 * k, { sy: 0.25, sz: 0.8, y: 1.55 * k, z: -0.3, color: 0x857a60 }, 10, 5),     // earth over the logs
        ...fronds(4, 1.0 * k, 1.95 * k, k),                                                          // palm fronds over it
        P.box(1.0, 0.9, 1.6, { y: 0.1, z: -2.6 * k, color: 0x2a2620 }),                              // the crawl trench in at the back
      ]), 1.4, 0.1, 0.4),
      gun: concrete
        ? merge([
          P.box(0.7, 0.5, 0.8, { color: STEEL }),
          P.box(1.0, 0.6, 0.05, { y: 0.1, z: 0.5, color: 0x6f6a44 }),                                // the Type 1 47 mm's shield
          P.cyl(0.04, 0.055, 2.0, { z: 1.4, rx: Math.PI / 2, color: STEEL }, 8),
        ])
        : merge([
          P.box(0.16, 0.18, 0.8, { color: STEEL }),                                                   // the Type 92
          P.cyl(0.05, 0.05, 0.5, { y: 0.02, z: 0.6, rx: Math.PI / 2, color: STEEL }, 6),              // its finned barrel
          P.box(0.3, 0.04, 0.12, { x: 0.12, z: -0.1, color: 0x8a7a50 }),                               // the ammunition strip
        ]),
    };
  });
}

export const buildJpPillbox = fortRig(() => jpBoxGeo(1, false), { at: [0, 0.85, 1.6], tip: [0, 0.02, 0.9], arc: 0.7, recoil: 0.02, pitch: false });
export const buildJpBlockhouse = fortRig(() => jpBoxGeo(1.5, true), { at: [0, 1.28, 2.2], tip: [0, 0, 2.5], arc: 0.6, recoil: 0.25 });

/** The cave gun: a naval gun in a concrete casemate set into the rock of a hillside, only its mouth showing. */
export const buildJpCaveGun = fortRig(() => once('jpcave', () => ({
  base: grime(merge([
    P.sphere(7, { sy: 0.65, sz: 0.8, y: -0.5, z: -2, color: ROCK[0] }, 12, 7),                       // the hill
    P.sphere(3.5, { sy: 0.8, x: -4.5, y: 0.2, z: 0.4, ry: 0.6, color: ROCK[1] }, 8, 5),               // its shoulders
    P.sphere(3.0, { sy: 0.9, x: 4.6, y: 0.0, z: 0.8, ry: -0.4, color: ROCK[2] }, 8, 5),
    P.box(4.6, 3.2, 1.6, { y: 1.3, z: 3.0, color: JP_CONCRETE }),                                     // the casemate's face
    P.box(5.0, 0.5, 2.0, { y: 3.0, z: 3.1, color: JP_CONCRETE }),                                     // the lintel slab
    P.box(2.8, 1.5, 0.3, { y: 1.4, z: 3.75, color: DARK }),                                           // the mouth
    ...[[-2, 4.2, -1.5], [1.5, 4.0, -2.5], [3.5, 2.6, 0.2], [-3.8, 2.6, -0.2]].map(([x, y, z], i) => P.cone(0.9, 1.4, { x, y, z, color: i % 2 ? FROND : 0x4f5a34 }, 6)), // scrub on the rock
  ]), 1.8, 0.2, 0.4),
  gun: merge([
    P.box(1.2, 0.9, 1.4, { color: STEEL }),
    P.box(2.2, 1.2, 0.08, { y: 0.15, z: 0.75, color: 0x5e5f52 }),                                     // the shield in the mouth
    P.cyl(0.1, 0.14, 5.0, { z: 3.2, rx: Math.PI / 2, color: STEEL }, 10),                             // the 12 cm barrel
  ]),
})), { at: [0, 1.3, 2.4], tip: [0, 0, 5.8], arc: 0.45, recoil: 0.4 });

/** The command dugout: a long earth mound over logs, a framed entrance, sandbag walls, an aerial and the flag. */
export const buildJpCommandPost = fortRig(() => once('jphq', () => ({
  base: grime(merge([
    P.sphere(6.2, { sy: 0.45, sz: 0.75, y: -0.3, color: CORAL }, 14, 7),
    ...[-2, -0.7, 0.6, 1.9].map((z) => log(7.5, { y: 2.3, z })),                                      // the roof logs showing through
    P.sphere(4.6, { sy: 0.18, sz: 0.65, y: 2.35, color: 0x958a6c }, 10, 5),
    P.box(2.4, 2.0, 1.2, { y: 0.9, z: 4.2, color: LOG_DK }),                                          // the entrance frame
    P.box(1.5, 1.6, 0.2, { y: 0.8, z: 4.85, color: DARK }),
    ...pair((s) => P.box(0.6, 0.9, 2.2, { x: s * 1.7, y: 0.45, z: 5.6, color: BAG })),                // the sandbag walls
    ...fronds(5, 2.4, 2.6, 0.5),
    P.cyl(0.06, 0.08, 9, { x: -2.5, y: 6.5, z: -1.5, color: 0x6a5a3e }, 6),                           // the aerial mast
    P.box(1.8, 0.05, 0.05, { x: -2.5, y: 10.8, z: -1.5, color: 0x6a5a3e }),
    P.cyl(0.05, 0.05, 6, { x: 2.8, y: 4.8, z: 2.6, color: 0x6a5a3e }, 5),                             // the flagpole…
    P.box(1.6, 1.06, 0.03, { x: 3.62, y: 7.2, z: 2.6, color: 0xe6e2d6 }),                             // …the Hinomaru
    P.cyl(0.32, 0.32, 0.04, { x: 3.62, y: 7.2, z: 2.6, rx: Math.PI / 2, color: 0xb8231e }, 14),
  ]), 1.5, 0.2, 0.4),
  gun: null,
})), { tip: [0, 3, 4], arc: 0, pitch: false, recoil: 0 });
