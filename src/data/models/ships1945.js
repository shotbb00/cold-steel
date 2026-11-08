// 1945 warships for the open-sea maps (the Pacific): built at their real size, bow toward +z.
// Model contract as render/RigRenderer.js: build(mats) → { root, muzzle, animate(u, dt, t) }.
// A ship rides the swell (a slow pitch and roll), heels into a turn (u.turning) and settles and
// lists as it floods (u.sink, u.list: entities/UnitStack.js); its gun mounts train on u.turretYaw.
//   Fletcher (US): 115 m, five single 5-inch mounts (two forward, three aft), two raked funnels,
//                  a quintuple torpedo mount amidships ×2, Measure 21 navy blue over deck blue
//   Kagerō (IJN):  119 m, three twin 12.7 cm mounts (one forward, two aft), a big trunked funnel
//                  pair, two quadruple Long Lance mounts, grey with a linoleum-brown deck
import * as THREE from 'three';
import { P, merge, loft } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';

const US = { hull: 0x3a4652, deck: 0x4a5258, upper: 0x56606a, gun: 0x4e5862, black: 0x1c1e20 };
const IJN = { hull: 0x5e6468, deck: 0x6a4a36, upper: 0x6e7478, gun: 0x5a6064, black: 0x1c1e20 };

/**
 * A hull, lofted: half-breadths swept from the stern (rounded, near full beam) through the parallel
 * midbody to a fine bow, the sheer rising forward; freeboard `fb` above the water, `draft` below.
 * A flat deck on top follows the same outline, a dark boot-topping band runs along the waterline.
 */
function hull(len, beam, fb, draft, c, sheer = 1.2) {
  const N = 18;
  const breadth = (t) => (t < 0.12 ? 0.78 + 0.22 * Math.sin((t / 0.12) * Math.PI / 2) : t < 0.58 ? 1 : Math.max(0.03, 1 - ((t - 0.58) / 0.42) ** 1.7));
  const rise = (t) => sheer * Math.max(0, (t - 0.55) / 0.45) ** 2;
  const hullS = [];
  const deckS = [];
  const bootS = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const z = -len / 2 + t * len;
    const w = (beam / 2) * breadth(t);
    const top = fb + rise(t);
    hullS.push([0, (top - draft) / 2, z, w, (top + draft) / 2, 4]);
    deckS.push([0, top + 0.05, z, Math.max(0.05, w * 0.97), 0.08, 6]);
    bootS.push([0, -0.15, z, w + 0.04, 0.3, 4]);
  }
  return [loft(hullS, { color: c.hull }, 12), loft(deckS, { color: c.deck }, 10), loft(bootS, { color: 0x2a1c18 }, 10)];
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

/** A big-gun turret: a sloped house with `barrels` guns. */
const turret = (c, { w, h, d, barrels, len, cal }) => merge([
  P.box(w, h, d, { y: h / 2, color: c.gun }),
  P.box(w * 0.92, h * 0.25, d * 0.5, { y: h * 0.9, z: d * 0.2, rx: -0.25, color: c.gun }),   // the sloped face
  P.cyl(w * 0.55, w * 0.6, 0.6, { y: 0.1, color: c.upper }, 14),                             // the barbette ring
  ...Array.from({ length: barrels }, (_, b) => P.cyl(cal, cal * 1.3, len, { x: (b - (barrels - 1) / 2) * (w / barrels) * 0.85, y: h * 0.5, z: d / 2 + len / 2 - 0.5, rx: Math.PI / 2, color: c.black }, 10)),
]);

export const buildBuckley = ship(() => {
  const c = US;
  const fb = 4.5;
  return {
    fixed: merge([
      ...hull(93, 11, fb, 3.4, c),
      P.box(8, 3, 12, { y: fb + 1.5, z: 22, color: c.upper }),
      P.box(6, 3, 5, { y: fb + 4.5, z: 23, color: c.upper }),
      P.box(6.4, 0.7, 2.2, { y: fb + 6, z: 25, color: 0x2a3036 }),
      P.cyl(0.22, 0.26, 11, { y: fb + 8.5, z: 19, color: c.black }, 6),
      P.cyl(1.6, 1.8, 5, { y: fb + 4, z: 5, rx: -0.1, color: c.upper }, 12),
      P.box(7, 2.4, 22, { y: fb + 1.2, z: -2, color: c.upper }),
      ...[-30, -34, -38].map((z) => P.box(2.4, 0.9, 1.2, { x: 0, y: fb + 0.5, z, color: c.black })),   // depth-charge racks aft
    ]),
    mounts: [
      { geo: mount(c, { barrels: 1, len: 4.5, cal: 0.12, w: 2.6, h: 2.2, d: 3.4 }), at: [0, fb + 0.1, 36] },
      { geo: mount(c, { barrels: 1, len: 4.5, cal: 0.12, w: 2.6, h: 2.2, d: 3.4 }), at: [0, fb + 2.5, 29] },
      { geo: mount(c, { barrels: 1, len: 4.5, cal: 0.12, w: 2.6, h: 2.2, d: 3.4 }), at: [0, fb + 0.1, -24], aft: true },
    ],
  };
});

export const buildKaibokan = ship(() => {
  const c = IJN;
  const fb = 4.5;
  return {
    fixed: merge([
      ...hull(78, 9.4, fb, 3, c, 1.6),
      P.box(7, 3, 10, { y: fb + 1.5, z: 16, color: c.upper }),
      P.box(5, 2.6, 4.5, { y: fb + 4.3, z: 17, color: c.upper }),
      P.cyl(0.22, 0.26, 10, { y: fb + 8, z: 13, rx: -0.12, color: c.black }, 6),
      P.cyl(1.5, 1.7, 4.5, { y: fb + 3.8, z: 2, rx: -0.15, color: c.upper }, 12),
      P.box(6, 2.4, 16, { y: fb + 1.2, z: -2, color: c.upper }),
      ...[-26, -30].map((z) => P.box(2.2, 0.9, 1.2, { y: fb + 0.5, z, color: c.black })),
    ]),
    mounts: [
      { geo: mount(c, { barrels: 1, len: 4.5, cal: 0.12, w: 2.6, h: 2.2, d: 3.2 }), at: [0, fb + 0.1, 30] },
      { geo: mount(c, { barrels: 2, len: 4.5, cal: 0.12, w: 3.4, h: 2.4, d: 3.8 }), at: [0, fb + 0.1, -20], aft: true },
    ],
  };
});

export const buildBaltimore = ship(() => {
  const c = US;
  const fb = 7.5;
  const t3 = turret(c, { w: 8, h: 3.6, d: 9, barrels: 3, len: 12, cal: 0.3 });
  return {
    fixed: merge([
      ...hull(205, 21, fb, 7, c),
      P.box(14, 5, 26, { y: fb + 2.5, z: 32, color: c.upper }),
      P.box(11, 5, 12, { y: fb + 7.5, z: 34, color: c.upper }),        // the bridge tower
      P.box(11.4, 1, 3, { y: fb + 10, z: 39, color: 0x2a3036 }),
      P.box(5, 3, 5, { y: fb + 11.5, z: 32, color: c.upper }),
      P.cyl(0.4, 0.5, 20, { y: fb + 19, z: 28, color: c.black }, 6),
      P.box(13, 4, 50, { y: fb + 2, z: -6, color: c.upper }),
      ...[12, -14].map((z) => P.cyl(3, 3.4, 11, { y: fb + 9.5, z, rx: -0.08, color: c.upper }, 12)),
      ...[12, -14].map((z) => P.cyl(3.02, 3.02, 1, { y: fb + 14.6, z: z - 0.4, rx: -0.08, color: c.black }, 12)),
      P.box(9, 4, 12, { y: fb + 2, z: -40, color: c.upper }),
      ...[-1, 1].map((s) => P.box(2.4, 2, 3, { x: s * 8, y: fb + 5, z: 0, color: c.gun })), // 5-inch secondaries either side
    ]),
    mounts: [
      { geo: t3, at: [0, fb, 70], arc: 5 },
      { geo: t3, at: [0, fb + 3.2, 56], arc: 5 },
      { geo: t3, at: [0, fb, -58], aft: true, arc: 5 },
    ],
  };
});

export const buildTakao = ship(() => {
  const c = IJN;
  const fb = 7;
  const t2 = turret(c, { w: 7, h: 3.4, d: 8.5, barrels: 2, len: 11, cal: 0.28 });
  return {
    fixed: merge([
      ...hull(203, 19, fb, 6.3, c, 2.6),
      P.box(13, 5, 18, { y: fb + 2.5, z: 26, color: c.upper }),
      P.box(12, 6, 12, { y: fb + 8, z: 26, color: c.upper }),          // the massive bridge block
      P.box(10, 4, 9, { y: fb + 13, z: 25, color: c.upper }),
      P.box(10.4, 1, 2.6, { y: fb + 14.6, z: 29.5, color: 0x2a3036 }),
      P.cyl(0.4, 0.5, 18, { y: fb + 20, z: 18, rx: -0.12, color: c.black }, 6),
      P.cyl(3.4, 4, 12, { y: fb + 9, z: 4, rx: -0.35, color: c.upper }, 12),   // the trunked funnel, raked far back
      P.box(11, 4, 40, { y: fb + 2, z: -12, color: c.upper }),
      ...[-1, 1].map((s) => P.box(2.6, 1.6, 9, { x: s * 8.6, y: fb + 1, z: -8, color: c.gun })), // torpedo mounts under the deck edge
    ]),
    mounts: [
      { geo: t2, at: [0, fb, 74], arc: 5 },
      { geo: t2, at: [0, fb + 2.8, 63], arc: 5 },
      { geo: t2, at: [0, fb, 52], arc: 5 },
      { geo: t2, at: [0, fb + 2.8, -48], aft: true, arc: 5 },
      { geo: t2, at: [0, fb, -60], aft: true, arc: 5 },
    ],
  };
});

export const buildIowa = ship(() => {
  const c = US;
  const fb = 9;
  const t3 = turret(c, { w: 12, h: 5, d: 13, barrels: 3, len: 20, cal: 0.5 });
  return {
    fixed: merge([
      ...hull(262, 33, fb, 11, c, 2),
      P.box(18, 6, 30, { y: fb + 3, z: 36, color: c.upper }),
      P.cyl(5, 5.5, 14, { y: fb + 10, z: 40, color: c.upper }, 12),    // the conning tower
      P.box(14, 6, 14, { y: fb + 18, z: 38, color: c.upper }),          // the bridge levels
      P.box(14.4, 1.2, 3, { y: fb + 20, z: 45, color: 0x2a3036 }),
      P.box(6, 4, 6, { y: fb + 23, z: 37, color: c.upper }),            // main director
      P.cyl(0.5, 0.6, 22, { y: fb + 32, z: 32, color: c.black }, 6),
      P.box(17, 6, 64, { y: fb + 3, z: -10, color: c.upper }),
      ...[14, -10].map((z) => P.cyl(4.5, 5, 14, { y: fb + 13, z, color: c.upper }, 12)),
      ...[14, -10].map((z) => P.cyl(4.52, 4.52, 1, { y: fb + 20.4, z, color: c.black }, 12)),
      ...[-1, 1].flatMap((s) => [30, 8, -14, -36].map((z) => P.box(3.2, 2.4, 4, { x: s * 11, y: fb + 7.2, z, color: c.gun }))), // 5-inch twin secondaries
    ]),
    mounts: [
      { geo: t3, at: [0, fb, 92], arc: 5 },
      { geo: t3, at: [0, fb + 4, 74], arc: 5 },
      { geo: t3, at: [0, fb, -74], aft: true, arc: 5 },
    ],
  };
});

export const buildYamato = ship(() => {
  const c = IJN;
  const fb = 10;
  const t3 = turret(c, { w: 14, h: 5.6, d: 15, barrels: 3, len: 21, cal: 0.6 });
  return {
    fixed: merge([
      ...hull(263, 38.9, fb, 11, c, 3),
      P.box(20, 6, 34, { y: fb + 3, z: 26, color: c.upper }),
      P.box(14, 10, 16, { y: fb + 11, z: 26, color: c.upper }),         // the tower bridge (pagoda)
      P.box(11, 8, 12, { y: fb + 20, z: 25, color: c.upper }),
      P.box(11.4, 1.2, 3, { y: fb + 22, z: 31, color: 0x2a3036 }),
      P.box(16, 2.4, 4, { y: fb + 25.5, z: 25, color: c.gun }),        // the 15 m rangefinder
      P.cyl(0.5, 0.6, 14, { y: fb + 33, z: 23, color: c.black }, 6),
      P.cyl(5, 6, 13, { y: fb + 12, z: 2, rx: -0.3, color: c.upper }, 12), // the single raked funnel
      P.box(19, 6, 56, { y: fb + 3, z: -20, color: c.upper }),
      ...[-1, 1].flatMap((s) => [16, 0, -16].map((z) => P.box(3.4, 2.6, 4.4, { x: s * 12.5, y: fb + 7.4, z, color: c.gun }))),
    ]),
    mounts: [
      { geo: t3, at: [0, fb, 88], arc: 5 },
      { geo: t3, at: [0, fb + 4.5, 70], arc: 5 },
      { geo: t3, at: [0, fb, -70], aft: true, arc: 5 },
    ],
  };
});

/** A submarine: the long pressure hull awash, the conning tower ("sail") with periscopes, a deck gun. */
function boat(c, { len, beam, tower, gunZ, hangar = false }) {
  const parts = [];
  const deck = beam * 0.13; // (she rides low: a metre of casing above the water)
  const secs = [];
  for (let k = 0; k <= 16; k++) { // the pressure hull: a cigar, fuller aft of amidships, fine at the bow
    const t = k / 16;
    const r = (beam / 2) * Math.max(0.05, Math.sin(Math.PI * Math.min(1, 0.04 + t * 0.94)) ** 0.55);
    secs.push([0, -beam * 0.3, -len / 2 + t * len, r, r * 0.9, 2.2]);
  }
  parts.push(loft(secs, { color: c.hull }, 12));
  parts.push(P.box(beam * 0.55, 0.25, len * 0.86, { y: deck, color: c.deck }));               // the casing deck
  parts.push(P.box(beam * 0.5, tower[1], tower[0], { y: deck + tower[1] / 2, z: tower[2], color: c.upper })); // the sail
  parts.push(P.box(beam * 0.52, 0.5, tower[0] * 0.8, { y: deck + tower[1] + 0.25, z: tower[2], color: c.black }));
  for (const [dz, h] of [[-0.6, 5.5], [0.8, 4.5]]) parts.push(P.cyl(0.12, 0.15, h, { y: deck + tower[1] + h / 2, z: tower[2] + dz, color: c.black }, 6)); // periscopes
  parts.push(P.box(0.9, 1.1, 1.4, { y: deck + 0.6, z: gunZ, color: c.gun }));                     // deck gun
  parts.push(P.cyl(0.1, 0.12, 3.2, { y: deck + 1, z: gunZ + 1.8, rx: Math.PI / 2, color: c.black }, 6));
  if (hangar) parts.push(P.cyl(1.5, 1.5, 9, { y: deck + 1.4, z: tower[2] + 8, rx: Math.PI / 2, color: c.upper }, 10)); // the I-boat's floatplane hangar
  return merge(parts);
}

/** A boat as a rig: no mounts to train, it just rides the swell (lightly: it's low in the water). */
function sub(describe) {
  let geo = null;
  return (mats) => {
    geo ??= describe();
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    meshAdder(body)(geo, mats.body);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0, 40);
    body.add(muzzle);
    const phase = Math.random() * 10;
    return {
      root,
      muzzle,
      animate(u, dt, t) {
        const awash = (u.depth ?? 0) < 1 ? 1 : 0.2;
        body.rotation.set(Math.sin(t * 0.6 + phase) * 0.01 * awash + (u.trim ?? 0), 0, Math.sin(t * 0.45 + phase) * 0.03 * awash + (u.list ?? 0));
      },
    };
  };
}

export const buildGato = sub(() => boat(US, { len: 95, beam: 8.3, tower: [12, 4.2, 6], gunZ: 16 }));
export const buildB1 = sub(() => boat({ ...IJN, deck: 0x4a4e52 }, { len: 108, beam: 9.3, tower: [11, 4.6, 4], gunZ: -16, hangar: true }));

/** An aircraft carrier: the hull, the hangar under a long flight deck, the island to starboard, aircraft parked aft. */
function flattop(c, { len, beam, fb, draft, deck, islandZ, funnel = 'stack' }) {
  const dy = fb + 7.5;   // the flight deck's height
  const plane = (x, z, yaw) => [P.box(1.2, 1, 10, { x, y: dy + 1, z, ry: yaw, color: c.plane }), P.box(12, 0.25, 1.8, { x, y: dy + 1.3, z: z + 1.2 * Math.cos(yaw), ry: yaw, color: c.plane })];
  return merge([
    ...hull(len, beam, fb, draft, c, 1.4),
    P.box(beam * 0.92, 7.5, len * 0.78, { y: fb + 3.75, z: -len * 0.02, color: c.upper }),              // the hangar
    P.box(beam * 1.15, 0.6, len * 0.95, { y: dy, z: 0, color: deck }),                                    // the flight deck (overhanging)
    ...[-1, 1].map((s) => P.box(0.2, 0.1, len * 0.9, { x: s * beam * 0.2, y: dy + 0.32, color: 0xd8d6cc })), // deck lines
    P.box(5, 9, 22, { x: beam * 0.55, y: dy + 4.5, z: islandZ, color: c.upper }),                       // the island
    P.box(5.2, 1, 6, { x: beam * 0.55, y: dy + 8, z: islandZ + 6, color: 0x2a3036 }),
    funnel === 'stack'
      ? P.box(4.4, 8, 9, { x: beam * 0.55, y: dy + 12, z: islandZ - 4, color: c.upper })
      : P.cyl(1.8, 2.2, 9, { x: beam * 0.62, y: fb + 2, z: islandZ - 10, rz: -1.2, color: c.upper }, 10), // the IJN's funnels, turned down over the side
    P.cyl(0.4, 0.5, 14, { x: beam * 0.55, y: dy + 15, z: islandZ + 4, color: c.black }, 6),
    ...[-0.32, -0.2, -0.08].flatMap((k, i) => plane((i % 2 ? 5 : -5), len * k - 30, Math.PI)),
  ]);
}

/** A carrier as a rig: rides the swell, its deck-edge mounts train like a ship's. */
const carrier = (describe) => ship(() => {
  const d = describe();
  return { fixed: d.fixed, mounts: d.mounts };
});

export const buildEssex = carrier(() => {
  const c = { ...US, plane: 0x2e3d52 };
  const g = mount(c, { w: 4, h: 2.6, d: 4.6, barrels: 2, len: 5, cal: 0.15 });
  return {
    fixed: flattop(c, { len: 267, beam: 28, fb: 9, draft: 8, deck: 0x3e4650, islandZ: 10 }),
    mounts: [{ geo: g, at: [15, 17, 28], arc: 4 }, { geo: g, at: [15, 17, 52], arc: 4 }, { geo: g, at: [15, 17, -14], aft: true, arc: 4 }, { geo: g, at: [15, 17, -36], aft: true, arc: 4 }],
  };
});

export const buildShokaku = carrier(() => {
  const c = { ...IJN, plane: 0x3c4a34 };
  const g = mount(c, { w: 3.8, h: 2.4, d: 4.4, barrels: 2, len: 5, cal: 0.14 });
  return {
    fixed: flattop(c, { len: 257, beam: 26, fb: 8.5, draft: 8.8, deck: 0x8a6a4a, islandZ: 40, funnel: 'down' }),
    mounts: [{ geo: g, at: [-14, 10, 70], arc: 4 }, { geo: g, at: [14, 10, 60], arc: 4 }, { geo: g, at: [-14, 10, -60], aft: true, arc: 4 }, { geo: g, at: [14, 10, -70], aft: true, arc: 4 }],
  };
});
