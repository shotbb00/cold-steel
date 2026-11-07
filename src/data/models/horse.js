// The horse (1806: cavalry, horse artillery, limbers): a skeleton of parts — body, neck, head, tail,
// four legs of three segments — built with the game's loft(), and a gait animator.
//   • Gaits are real footfall patterns: the four-beat walk, the diagonal trot, the three-beat canter
//     (left lead) and the four-beat transverse gallop with its moment of suspension. Each has its
//     stride rate, the share of the stride a hoof is on the ground (duty), the hoof's lift, and the
//     body's bounce, rock and the head's nod.
//   • Legs are placed by two-bone IK: a hoof on the ground stays where it was set down while the
//     body passes over it (no sliding), and in the air it is carried forward on an arc. The foreleg
//     folds at the knee (the joint forward), the hind leg at the hock (the joint back); the pastern
//     takes the weight in stance and the hoof flips back in the swing.
//   • Changing gait blends every parameter over half a second, so the footfall slides from one
//     pattern into the next.
// Real dimensions: a 1.6 m (15.3 hands) cavalry horse, nose toward +z, hooves on y = 0.
// buildHorse({ coat, saddle }) → { root, update(dt, gait) }; gait: 'halt' | 'walk' | 'trot' | 'canter' | 'gallop'.
import * as THREE from 'three';
import { P, loft } from '../units/geometry.js';

/** Footfall patterns. off: when in the stride each hoof sets down (LF, RF, LH, RH); speed in m/s. */
export const GAITS = {
  halt: { speed: 0, freq: 0.6, duty: 1, lift: 0, off: [0, 0.5, 0.5, 0], bob: 0, bobK: 2, low: 0, pitch: 0, nod: 0, nodK: 2, stretch: 0, tail: 0 },
  walk: { speed: 1.7, freq: 0.95, duty: 0.62, lift: 0.11, off: [0.25, 0.75, 0, 0.5], bob: 0.014, bobK: 2, low: 0.31, pitch: 0.01, nod: 0.07, nodK: 2, stretch: 0.06, tail: 0.05 },
  trot: { speed: 4.0, freq: 1.45, duty: 0.42, lift: 0.2, off: [0, 0.5, 0.5, 0], bob: 0.045, bobK: 2, low: 0.21, pitch: 0.01, nod: 0.02, nodK: 2, stretch: 0.0, tail: 0.25 },
  canter: { speed: 6.5, freq: 1.7, duty: 0.4, lift: 0.24, off: [0.56, 0.33, 0.33, 0], bob: 0.06, bobK: 1, low: 0.5, pitch: 0.07, nod: 0.12, nodK: 1, stretch: 0.16, tail: 0.45 },
  gallop: { speed: 13, freq: 2.1, duty: 0.28, lift: 0.3, off: [0.54, 0.44, 0.12, 0], bob: 0.07, bobK: 1, low: 0.62, pitch: 0.09, nod: 0.14, nodK: 1, stretch: 0.36, tail: 0.75 },
};
const KEYS = ['speed', 'freq', 'duty', 'lift', 'bob', 'low', 'pitch', 'nod', 'stretch', 'tail'];

/** Coats: body, the dark points (lower legs, mane, tail), the muzzle. */
export const COATS = {
  bay: { body: 0x7a4527, points: 0x1e1814, muzzle: 0x3a2a20 },
  chestnut: { body: 0x9c5a2c, points: 0x8a4c24, muzzle: 0x6e4028 },
  grey: { body: 0xb9b6ae, points: 0x8e8b84, muzzle: 0x55524c },
  black: { body: 0x231f1c, points: 0x161311, muzzle: 0x2c2724 },
};
const HOOF = 0x2b2420;

// the legs: joint (elbow / stifle), the two long segments, where the hoof stands at rest, which way the joint bends
const LEGS = [
  { id: 'LF', x: 0.16, y: 1.0, z: 0.48, a: 0.46, b: 0.36, hoofZ: 0.53, fore: true },
  { id: 'RF', x: -0.16, y: 1.0, z: 0.48, a: 0.46, b: 0.36, hoofZ: 0.53, fore: true },
  { id: 'LH', x: 0.17, y: 1.05, z: -0.48, a: 0.48, b: 0.4, hoofZ: -0.6, fore: false },
  { id: 'RH', x: -0.17, y: 1.05, z: -0.48, a: 0.48, b: 0.4, hoofZ: -0.6, fore: false },
];
const PASTERN = 0.14;   // fetlock to the top of the hoof
const HOOF_H = 0.075;
const BLEND = 0.5;      // seconds a change of gait takes

const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; };
const smooth = (s) => s * s * (3 - 2 * s);

export function buildHorse({ coat = 'bay', saddle = false } = {}) {
  const C = COATS[coat] ?? COATS.bay;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
  const root = new THREE.Group();
  const body = new THREE.Group();           // bobs and rocks over the legs
  body.position.set(0, 1.2, 0);
  root.add(body);
  const B = (g) => { g.translate(0, -1.2, 0); return g; }; // body parts are modelled in horse space

  // the barrel: buttocks, quarters, belly, shoulder, chest
  body.add(mesh(B(loft([
    [0, 1.38, -0.95, 0.06, 0.07, 2], [0, 1.36, -0.9, 0.2, 0.22, 2], [0, 1.33, -0.78, 0.29, 0.29, 2], [0, 1.3, -0.58, 0.32, 0.33, 2.1],
    [0, 1.27, -0.3, 0.33, 0.35, 2.1], [0, 1.25, 0.0, 0.335, 0.37, 2.1], [0, 1.27, 0.28, 0.32, 0.36, 2.1], [0, 1.31, 0.5, 0.27, 0.33, 2],
    [0, 1.33, 0.66, 0.19, 0.25, 2], [0, 1.33, 0.74, 0.08, 0.1, 2],
  ], { color: C.body }, 18)), mat));
  // the withers rise a little ahead of the back
  body.add(mesh(B(loft([[0, 1.57, 0.12, 0.05, 0.05], [0, 1.63, 0.3, 0.1, 0.09], [0, 1.65, 0.44, 0.1, 0.09], [0, 1.66, 0.56, 0.06, 0.06]], { color: C.body }, 10)), mat));
  // the shoulders and the muscle over the hind legs, so the legs grow out of the body
  for (const s of [-1, 1]) {
    body.add(mesh(B(loft([[s * 0.12, 1.5, 0.52, 0.08, 0.12, 2], [s * 0.15, 1.3, 0.52, 0.11, 0.16, 2], [s * 0.16, 1.1, 0.49, 0.1, 0.14, 2], [s * 0.16, 0.96, 0.48, 0.085, 0.12, 2], [s * 0.16, 0.86, 0.48, 0.07, 0.09, 2]], { color: C.body }, 12)), mat));
    body.add(mesh(B(loft([[s * 0.16, 1.5, -0.62, 0.11, 0.2, 2], [s * 0.19, 1.26, -0.56, 0.12, 0.21, 2], [s * 0.18, 1.04, -0.49, 0.085, 0.13, 2]], { color: C.body }, 12)), mat));
  }

  // the neck, pivoting at its base so the head can nod and stretch
  const neck = new THREE.Group();
  neck.position.set(0, 0.3, 0.5);           // (body space: the base of the neck, high on the chest)
  body.add(neck);
  const NECK = [[0, -0.12, -0.06, 0.16, 0.3, 2], [0, 0.08, 0.1, 0.135, 0.25, 2], [0, 0.28, 0.26, 0.11, 0.19, 2], [0, 0.46, 0.4, 0.092, 0.145, 2], [0, 0.57, 0.49, 0.084, 0.115, 2]];
  neck.add(mesh(loft(NECK, { color: C.body }, 14), mat));
  // the mane along the crest: each section pushed up-back by its depth
  const crest = NECK.map(([x, y, z, w, d], i) => {
    const n = NECK[Math.min(i + 1, NECK.length - 1)], p = NECK[Math.max(i - 1, 0)];
    const ty = n[1] - p[1], tz = n[2] - p[2], l = Math.hypot(ty, tz);
    return [0, y + (tz / l) * d * 0.92, z - (ty / l) * d * 0.92, 0.034, 0.06];
  });
  neck.add(mesh(loft(crest, { color: C.points }, 8), mat));
  // the head, from the poll down to the muzzle
  const head = new THREE.Group();
  head.position.set(0, 0.57, 0.49);
  neck.add(head);
  head.add(mesh(loft([[0, 0.03, -0.04, 0.085, 0.11, 2], [0, -0.07, 0.09, 0.1, 0.15, 2.2], [0, -0.19, 0.2, 0.088, 0.115, 2.2], [0, -0.3, 0.29, 0.075, 0.092, 2.2], [0, -0.4, 0.36, 0.07, 0.084, 2.2], [0, -0.46, 0.41, 0.055, 0.064, 2]], { color: C.body }, 14), mat));
  head.add(mesh(loft([[0, -0.37, 0.34, 0.072, 0.086, 2], [0, -0.45, 0.4, 0.064, 0.075, 2], [0, -0.485, 0.425, 0.042, 0.052, 2]], { color: C.muzzle }, 12), mat));
  for (const s of [-1, 1]) {
    head.add(mesh(P.sphere(0.022, { x: s * 0.082, y: -0.09, z: 0.11, color: 0x0c0a09 }, 8, 6), mat));                                  // eyes
    head.add(mesh(P.cone(0.032, 0.13, { x: s * 0.045, y: 0.09, z: -0.04, rx: -0.25, rz: -s * 0.18, color: C.body }, 6), mat));           // ears
  }
  head.add(mesh(loft([[0, 0.06, -0.01, 0.03, 0.03], [0, 0.03, 0.06, 0.05, 0.03], [0, -0.02, 0.1, 0.03, 0.02]], { color: C.points }, 8), mat)); // forelock

  // the tail: a dock, then the hair hanging from it
  const tail = new THREE.Group();
  tail.position.set(0, 0.18, -0.92);
  body.add(tail);
  tail.add(mesh(loft([[0, 0, 0.02, 0.05, 0.05], [0, -0.08, -0.08, 0.055, 0.06], [0, -0.3, -0.16, 0.075, 0.09], [0, -0.56, -0.17, 0.08, 0.08], [0, -0.78, -0.14, 0.05, 0.05], [0, -0.86, -0.12, 0.02, 0.02]], { color: C.points }, 10), mat));

  if (saddle) { // a light cavalry saddle on a shabraque, the cloth with its border, draped over the back
    const shell = (grow, lo, hi, color) => loft([[0, 1.27, -0.26, 0.31 + grow, 0.33 + grow, 2.1], [0, 1.25, -0.16, 0.33 + grow, 0.36 + grow, 2.1], [0, 1.25, 0.12, 0.335 + grow, 0.37 + grow, 2.1], [0, 1.27, 0.36, 0.32 + grow, 0.36 + grow, 2.1], [0, 1.28, 0.44, 0.31 + grow, 0.355 + grow, 2.1]],
      { color, warp: (v) => { v.y = Math.min(hi, Math.max(lo, v.y)); } }, 20);
    body.add(mesh(B(shell(0.012, 1.16, 9, 0x7d1a1a)), mat));
    body.add(mesh(B(shell(0.02, 1.13, 1.19, 0xd8b54a)), mat));                                                           // the border
    body.add(mesh(B(loft([[0, 1.66, -0.13, 0.15, 0.05, 2], [0, 1.65, 0.06, 0.16, 0.05, 2], [0, 1.67, 0.26, 0.13, 0.05, 2]], { color: 0x4a2c18 }, 12)), mat)); // the seat
    body.add(mesh(B(loft([[0, 1.66, 0.28, 0.11, 0.04, 2], [0, 1.74, 0.33, 0.08, 0.035, 2]], { color: 0x4a2c18 }, 10)), mat));                         // pommel
    body.add(mesh(B(loft([[0, 1.66, -0.12, 0.13, 0.04, 2], [0, 1.74, -0.17, 0.1, 0.035, 2]], { color: 0x4a2c18 }, 10)), mat));                       // cantle
    for (const s of [-1, 1]) {
      body.add(mesh(B(P.box(0.02, 0.34, 0.035, { x: s * 0.355, y: 1.4, z: 0.1, rz: s * 0.06, color: 0x2a1c12 })), mat));             // stirrup leathers
      body.add(mesh(B(P.box(0.08, 0.02, 0.06, { x: s * 0.37, y: 1.22, z: 0.1, color: 0x8a8a86 })), mat));                             // stirrups
    }
  }

  // the legs: joint group → long segment → knee/hock group → cannon → fetlock group → pastern → hoof (kept level)
  const legs = LEGS.map((L, i) => {
    const top = new THREE.Group();
    top.position.set(L.x, L.y - 1.2, L.z);
    body.add(top);
    const up = L.fore
      ? loft([[0, 0.1, 0, 0.08, 0.12], [0, -0.12, 0.01, 0.072, 0.1], [0, -0.33, 0, 0.05, 0.066], [0, -L.a, 0, 0.052, 0.06]], { color: C.body }, 12)
      : loft([[0, 0.1, 0, 0.09, 0.16], [0, -0.14, -0.02, 0.078, 0.125], [0, -0.35, -0.01, 0.055, 0.08], [0, -L.a, 0, 0.048, 0.075]], { color: C.body }, 12);
    top.add(mesh(up, mat));
    const mid = new THREE.Group();
    mid.position.y = -L.a;
    top.add(mid);
    mid.add(mesh(P.sphere(0.05, { color: C.body }, 10, 8), mat));                                                   // the knee / hock
    mid.add(mesh(loft([[0, 0, 0, 0.043, 0.05], [0, -0.1, 0, 0.034, 0.042], [0, -L.b, 0, 0.033, 0.04]], { color: C.points }, 10), mat));
    const fet = new THREE.Group();
    fet.position.y = -L.b;
    mid.add(fet);
    fet.add(mesh(P.sphere(0.042, { color: C.points }, 10, 8), mat));                                                // the fetlock
    fet.add(mesh(loft([[0, 0, 0, 0.036, 0.038], [0, -PASTERN, 0, 0.033, 0.035]], { color: C.points }, 10), mat));
    const hoof = new THREE.Group();
    hoof.position.y = -PASTERN;
    fet.add(hoof);
    hoof.add(mesh(P.cyl(0.048, 0.06, HOOF_H, { y: -HOOF_H / 2, color: HOOF }, 12), mat));
    return { ...L, i, top, mid, fet, hoof };
  });

  // ------------------------------------------------------------------ the gait
  const cur = { ...GAITS.halt };
  let from = { ...GAITS.halt }, to = GAITS.halt, blend = 1, name = 'halt';
  let phase = Math.random(), t = Math.random() * 10;
  const offs = [...GAITS.halt.off];
  const _inv = new THREE.Matrix4(), _v = new THREE.Vector3();

  /** Two-bone IK in the leg's own plane: joint angles that put the fetlock at `f` (body space). */
  function solve(L, f) {
    const vy = f.y - L.top.position.y, vz = f.z - L.top.position.z;
    let d = Math.hypot(vy, vz);
    d = Math.min(L.a + L.b - 1e-4, Math.max(Math.abs(L.a - L.b) + 1e-4, d));
    const base = Math.atan2(-vz, -vy);                                    // rotation.x that points a segment at the fetlock
    const alpha = Math.acos((L.a * L.a + d * d - L.b * L.b) / (2 * L.a * d));
    const a1 = L.fore ? base - alpha : base + alpha;                      // the knee bends forward, the hock back
    const ky = -Math.cos(a1) * L.a, kz = -Math.sin(a1) * L.a;
    const a2 = Math.atan2(-(vz - kz), -(vy - ky));
    return [a1, a2 - a1];
  }

  function update(dt, gaitName = name) {
    if (gaitName !== name && GAITS[gaitName]) { from = { ...cur, off: [...offs] }; to = GAITS[gaitName]; blend = 0; name = gaitName; }
    blend = Math.min(1, blend + dt / BLEND);
    const k = smooth(blend);
    for (const key of KEYS) cur[key] = from[key] + (to[key] - from[key]) * k;
    for (let i = 0; i < 4; i++) offs[i] = (from.off?.[i] ?? to.off[i]) + (to.off[i] - (from.off?.[i] ?? to.off[i])) * k;
    cur.bobK = to.bobK; cur.nodK = to.nodK;
    t += dt;
    phase = (phase + cur.freq * dt) % 1;
    const moving = cur.speed > 0.05;
    const stride = moving ? cur.speed / cur.freq : 0;   // metres the body goes in one stride

    // the body: bounce (lowest when the weight lands), rock, and at a halt just breathing
    const w = Math.PI * 2;
    const bob = -cur.bob * Math.cos(w * cur.bobK * (phase - cur.low)) + (moving ? 0 : Math.sin(t * 1.6) * 0.004); // lowest mid-stance (`low`)
    const pitch = cur.pitch * Math.sin(w * (phase - cur.low + 0.25));                                             // nose down as the weight comes onto the forehand
    body.position.y = 1.2 + bob;
    body.rotation.x = pitch;
    // the neck nods with the stride (and stretches out at speed); idle, it looks about now and then
    const idle = moving ? 0 : Math.sin(t * 0.35) * 0.08 + Math.max(0, Math.sin(t * 0.13) - 0.85) * 1.6;
    neck.rotation.x = cur.stretch + cur.nod * Math.sin(w * (cur.nodK * phase + 0.1)) + idle - pitch;
    neck.rotation.y = moving ? 0 : Math.sin(t * 0.23) * 0.12;
    head.rotation.x = -cur.stretch * 0.55 - idle * 0.5;
    tail.rotation.x = 0.05 + cur.tail * 0.95 - pitch;
    tail.rotation.z = Math.sin(t * (moving ? 3.2 : 0.9)) * (moving ? 0.08 : 0.12);

    body.updateMatrix();
    _inv.copy(body.matrix).invert();
    for (const L of legs) {
      // where the hoof is (root space): planted and sliding back under the body, or carried forward
      let p = (phase - offs[L.i] + 1) % 1;
      let hz = L.hoofZ, hy = 0, flex;
      if (!moving || p < cur.duty) {
        const s = moving ? p / cur.duty : 0.5;
        hz += stride * cur.duty * (0.5 - s);
        flex = -0.55 + 0.25 * Math.sin(Math.PI * s);                      // the pastern sinks under the weight
      } else {
        const s = (p - cur.duty) / (1 - cur.duty);
        hz += stride * cur.duty * (smooth(s) - 0.5) + (L.fore ? 0.06 : -0.03) * Math.sin(Math.PI * s) * Math.min(1, stride);
        hy = cur.lift * Math.sin(Math.PI * Math.min(1, s * 1.15)) ** 0.8;
        flex = -0.55 + (L.fore ? 1.9 : 1.5) * Math.sin(Math.PI * Math.min(1, s * 1.25)) * Math.min(1, cur.lift / 0.2 + 0.4);
      }
      // the fetlock from the hoof and the pastern's angle (flex: 0 = straight down, − = sloping forward)
      _v.set(L.x, hy + HOOF_H + PASTERN * Math.cos(flex), hz + PASTERN * Math.sin(flex)).applyMatrix4(_inv); // (into body space)
      const [a1, a2] = solve(L, _v);
      L.top.rotation.x = a1;
      L.mid.rotation.x = a2;
      L.fet.rotation.x = flex - (a1 + a2) - pitch;                        // the pastern's own angle, whatever the leg and body above do
      L.hoof.rotation.x = -flex;                                          // the hoof stays level with the ground
      if (moving && p >= cur.duty) L.hoof.rotation.x += 0.6 * Math.sin(Math.PI * ((p - cur.duty) / (1 - cur.duty))); // flipped up in the swing
    }
  }

  update(0);
  return { root, body, neck, head, tail, legs, update, get gait() { return name; }, get speed() { return cur.speed; } };
}
