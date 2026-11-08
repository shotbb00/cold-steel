// 1945 warships for the open-sea maps (the Pacific): built at their real size, bow toward +z.
// Model contract as render/RigRenderer.js: build(mats) → { root, muzzle, animate(u, dt, t) }.
// A ship rides the swell (a slow pitch and roll), heels into a turn (u.turning) and settles and
// lists as it floods (u.sink, u.list: entities/UnitStack.js); its gun mounts train on u.turretYaw.
//   Fletcher (US): 115 m, five single 5-inch mounts (two forward, three aft), two raked funnels,
//                  a quintuple torpedo mount amidships ×2, Measure 21 navy blue over deck blue
//   Kagerō (IJN):  119 m, three twin 12.7 cm mounts (one forward, two aft), a big trunked funnel
//                  pair, two quadruple Long Lance mounts, grey with a linoleum-brown deck
import * as THREE from 'three';
import { P, merge } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';

const US = { hull: 0x3a4652, deck: 0x4a5258, upper: 0x56606a, gun: 0x4e5862, black: 0x1c1e20 };
const IJN = { hull: 0x5e6468, deck: 0x6a4a36, upper: 0x6e7478, gun: 0x5a6064, black: 0x1c1e20 };

/** A hull: a long box with a fine bow and a rounded stern, freeboard `fb`, below water down to -draft. */
function hull(len, beam, fb, draft, c, sheer = 1.2) {
  const parts = [];
  const mid = len * 0.62;
  parts.push(P.box(beam, fb + draft, mid, { y: (fb - draft) / 2, z: -len * 0.06, color: c.hull }));
  // the bow: tapering boxes forward, rising with the sheer
  for (let k = 0; k < 6; k++) {
    const t = (k + 1) / 6;
    const w = beam * (1 - t * 0.85);
    const zc = mid / 2 - len * 0.06 + (len * 0.32 / 6) * (k + 0.5);
    parts.push(P.box(w, fb + draft + sheer * t, len * 0.32 / 6 + 0.05, { y: (fb - draft + sheer * t) / 2, z: zc, color: c.hull }));
  }
  // the stern: narrowing a little aft
  for (let k = 0; k < 3; k++) {
    const w = beam * (0.95 - k * 0.12);
    parts.push(P.box(w, fb + draft - k * 0.4, len * 0.06 / 3 + 0.05, { y: (fb - draft + k * 0.4) / 2, z: -mid / 2 - len * 0.06 - (len * 0.06 / 3) * (k + 0.5), color: c.hull }));
  }
  parts.push(P.box(beam * 0.96, 0.12, len * 0.86, { y: fb + 0.06, z: 0, color: c.deck }));      // the deck
  parts.push(P.box(beam + 0.05, 0.5, len * 0.9, { y: -0.2, color: 0x2a1c18 }));                   // the boot-topping at the waterline
  return parts;
}

/** A gun mount: a house with its barrel(s), at deck height, trained by the rig. */
function mount(c, { w = 3.4, h = 2.6, d = 4.2, barrels = 1, len = 5.5, cal = 0.16 } = {}) {
  const parts = [P.box(w, h, d, { y: h / 2, color: c.gun }), P.box(w * 0.9, 0.3, d * 0.8, { y: h + 0.1, z: -0.2, color: c.upper })];
  for (let b = 0; b < barrels; b++) {
    const x = barrels === 1 ? 0 : (b - (barrels - 1) / 2) * 0.9;
    parts.push(P.cyl(cal, cal * 1.25, len, { x, y: h * 0.55, z: d / 2 + len / 2 - 0.3, rx: Math.PI / 2, color: c.black }, 8));
  }
  return merge(parts);
}

/** A torpedo mount: a turntable with a row of tubes. */
const torpedoMount = (c, tubes) => merge([
  P.cyl(1.4, 1.5, 0.4, { y: 0.2, color: c.gun }, 12),
  ...Array.from({ length: tubes }, (_, i) => P.cyl(0.32, 0.32, 7.5, { x: (i - (tubes - 1) / 2) * 0.72, y: 0.75, rx: Math.PI / 2, color: c.upper }, 8)),
]);

/**
 * Put a ship together: the hull and superstructure (fixed), the gun mounts (each its own group,
 * trained toward u.turretYaw within its arc), the torpedo mounts.
 */
function ship(describe) {
  let d = null;
  return (mats) => {
    d ??= describe();
    const root = new THREE.Group();
    const body = new THREE.Group();   // pitch, roll, heel, settling: the whole ship moves on the water
    root.add(body);
    meshAdder(body)(d.fixed, mats.body);
    const mounts = d.mounts.map((m) => {
      const g = new THREE.Group();
      g.position.set(...m.at);
      if (m.aft) g.rotation.y = Math.PI;
      meshAdder(g)(m.geo, mats.body);
      body.add(g);
      return { g, aft: !!m.aft, arc: m.arc ?? 2.6 };
    });
    for (const t of d.torps ?? []) {
      const g = new THREE.Group();
      g.position.set(...t.at);
      g.rotation.y = Math.PI / 2;
      meshAdder(g)(t.geo, mats.body);
      body.add(g);
    }
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 1.5, 9);
    mounts[0].g.add(muzzle);
    const phase = Math.random() * 10;
    let heel = 0;
    return {
      root,
      muzzle,
      animate(u, dt, t) {
        heel += ((u.turning ?? 0) * 0.07 - heel) * Math.min(1, dt * 0.8);
        body.rotation.set(
          Math.sin(t * 0.55 + phase) * 0.012 + (u.trim ?? 0),             // the swell, bow up and down (and down by the head when flooding)
          0,
          Math.sin(t * 0.42 + phase * 1.7) * 0.022 + heel + (u.list ?? 0), // the roll, the heel into a turn, a list
        );
        body.position.y = Math.sin(t * 0.7 + phase) * 0.25;
        // the mounts train on the target, each within its arc (forward ones over the bow, aft ones over the stern)
        const want = (u.turretYaw ?? u.yaw) - u.yaw;
        for (const m of mounts) {
          const rel = Math.atan2(Math.sin(want - (m.aft ? Math.PI : 0)), Math.cos(want - (m.aft ? Math.PI : 0)));
          const aim = Math.max(-m.arc / 2 * 1.15, Math.min(m.arc / 2 * 1.15, rel)) + (m.aft ? Math.PI : 0);
          m.g.rotation.y += Math.atan2(Math.sin(aim - m.g.rotation.y), Math.cos(aim - m.g.rotation.y)) * Math.min(1, dt * 1.5);
        }
      },
    };
  };
}

export const buildFletcher = ship(() => {
  const c = US;
  const fb = 5.5;
  const fixed = merge([
    ...hull(115, 12, fb, 4, c),
    P.box(9, 3, 14, { y: fb + 1.5, z: 28, color: c.upper }),          // forward deckhouse
    P.box(7, 3.2, 7, { y: fb + 4.6, z: 30, color: c.upper }),         // the bridge
    P.box(7.4, 0.8, 3, { y: fb + 6.4, z: 32, color: 0x2a3036 }),      // bridge windows
    P.box(3, 2, 3, { y: fb + 7.6, z: 29, color: c.upper }),           // director
    P.cyl(0.25, 0.3, 14, { y: fb + 10, z: 26, color: c.black }, 6),    // the mast
    P.box(6, 0.2, 0.2, { y: fb + 14, z: 26, color: c.black }),         // yard
    P.box(8, 2.6, 26, { y: fb + 1.3, z: 4, color: c.upper }),          // midships deckhouse
    ...[12, -2].map((z) => P.cyl(1.8, 2.1, 7, { y: fb + 5.5, z, rx: -0.12, color: c.upper }, 12)), // the two funnels, raked
    ...[12, -2].map((z) => P.cyl(1.82, 1.82, 0.8, { y: fb + 8.8, z: z - 0.4, rx: -0.12, color: c.black }, 12)),
    P.box(8, 2.6, 8, { y: fb + 1.3, z: -24, color: c.upper }),         // after deckhouse
  ]);
  const gun = mount(c, { barrels: 1, len: 6, cal: 0.18 });
  return {
    fixed,
    mounts: [
      { geo: gun, at: [0, fb + 0.1, 46], arc: 5 },
      { geo: gun, at: [0, fb + 3.2, 39], arc: 5 },
      { geo: gun, at: [0, fb + 2.7, -18], aft: true, arc: 5 },
      { geo: gun, at: [0, fb + 0.1, -36], aft: true, arc: 5 },
      { geo: gun, at: [0, fb + 0.1, -45], aft: true, arc: 5 },
    ],
    torps: [{ geo: torpedoMount(c, 5), at: [0, fb + 0.2, 0] }, { geo: torpedoMount(c, 5), at: [0, fb + 0.2, -9] }],
  };
});

export const buildKagero = ship(() => {
  const c = IJN;
  const fb = 6;
  const fixed = merge([
    ...hull(119, 11, fb, 3.8, c, 2.2),
    P.box(8, 3, 12, { y: fb + 1.5, z: 30, color: c.upper }),          // forward superstructure
    P.box(6, 3, 6, { y: fb + 4.5, z: 31, color: c.upper }),           // the bridge
    P.box(6.4, 0.8, 2.6, { y: fb + 6.2, z: 33, color: 0x2a3036 }),
    P.box(3.4, 2.2, 3.4, { y: fb + 7.2, z: 30, color: c.upper }),     // rangefinder
    P.cyl(0.25, 0.3, 13, { y: fb + 9.5, z: 26, rx: -0.15, color: c.black }, 6), // the raked tripod mast (one leg)
    P.box(7, 2.6, 30, { y: fb + 1.3, z: 2, color: c.upper }),         // midships
    P.cyl(2.2, 2.6, 8, { y: fb + 5.8, z: 14, rx: -0.2, color: c.upper }, 12),   // the big trunked forward funnel
    P.cyl(1.7, 2, 6.5, { y: fb + 5, z: 1, rx: -0.2, color: c.upper }, 12),       // the after funnel
    ...[14, 1].map((z) => P.cyl(z > 5 ? 2.22 : 1.72, z > 5 ? 2.22 : 1.72, 0.8, { y: fb + (z > 5 ? 9.4 : 8.1), z: z - 0.8, rx: -0.2, color: c.black }, 12)),
    P.box(7, 2.6, 7, { y: fb + 1.3, z: -26, color: c.upper }),
  ]);
  const twin = mount(c, { w: 4.2, h: 2.8, d: 5, barrels: 2, len: 6, cal: 0.15 });
  return {
    fixed,
    mounts: [
      { geo: twin, at: [0, fb + 0.1, 43], arc: 5 },
      { geo: twin, at: [0, fb + 2.7, -19], aft: true, arc: 5 },
      { geo: twin, at: [0, fb + 0.1, -38], aft: true, arc: 5 },
    ],
    torps: [{ geo: torpedoMount(c, 4), at: [0, fb + 0.2, -6] }, { geo: torpedoMount(c, 4), at: [0, fb + 0.2, 20] }],
  };
});
