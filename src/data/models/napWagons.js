// 1806 wagons (data/units1806): a four-wheeled army wagon and its pair of horses (models/horse.js),
// a driver on the near horse — one rig per wagon for render/RigRenderer.js.
//   kind: ammo (the closed chests of the ammunition wagon), ambulance (the covered wagon — no red
//   cross yet in 1806), hq (covered, the army's flag; set up, the staff's tent stands beside it as
//   u.deployK rises), pontoon (a long bed with its boat, gone once the bridge is laid: u.dropped / laying)
import * as THREE from 'three';
import { P, merge, loft } from '../units/geometry.js';
import { buildHorse } from './horse.js';
import { ARMIES_1806 } from './napSoldier.js';

const WOOD = { fr: 0x51613a, by: 0x4a5a6a, pr: 0x3e4a5a, sx: 0x3e4a5a, gb: 0x5a6670 };
const IRON = 0x2a2a28;
const CANVAS = 0xd8d0b8;
const FLAG = { fr: [0x1d2a8c, 0xf0f0f0, 0xc02020], by: [0x3a6ac0, 0xf0f0f0, 0x3a6ac0], pr: [0x161616, 0xf0f0f0, 0x161616], sx: [0x2a7a3a, 0xf0f0f0, 0x2a7a3a], gb: [0x1d2a8c, 0xf0f0f0, 0xc02020] };

const material = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };

function wheel(x, z, r, color) {
  const parts = [P.torus(r - 0.025, 0.03, { x, y: r, z, ry: Math.PI / 2, color: IRON }, 18), P.cyl(0.07, 0.07, 0.14, { x, y: r, z, rz: Math.PI / 2, color })];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    parts.push(P.box(0.025, r - 0.05, 0.03, { x, y: r + Math.cos(a) * (r / 2), z: z + Math.sin(a) * (r / 2), rx: a, color }));
  }
  return parts;
}

export function buildWagon({ army = 'fr', kind = 'ammo' } = {}) {
  const wood = WOOD[army] ?? WOOD.fr;
  const mat = material();
  const root = new THREE.Group();
  const long = kind === 'pontoon';
  const len = long ? 5.2 : 3.4;
  const wagon = new THREE.Group();
  wagon.add(mesh(merge([
    ...wheel(0.75, len / 2 - 0.6, 0.5, wood), ...wheel(-0.75, len / 2 - 0.6, 0.5, wood),
    ...wheel(0.75, -len / 2 + 0.6, 0.65, wood), ...wheel(-0.75, -len / 2 + 0.6, 0.65, wood),
    P.box(1.3, 0.12, len, { y: 0.95, color: wood }),                                                       // the bed
    ...[-1, 1].map((s) => P.box(0.06, 0.4, len, { x: s * 0.64, y: 1.2, color: wood })),                    // the sides
    P.box(0.08, 0.08, 2.4, { y: 0.7, z: len / 2 + 1.1, color: wood }),                                     // the pole
  ]), mat));
  if (kind === 'ammo') wagon.add(mesh(merge([0.9, -0.1, -1.1].map((z) => P.box(1.1, 0.5, 0.8, { y: 1.35, z, color: 0x3a2e22 }))), mat));
  if (kind === 'ambulance' || kind === 'hq') { // the canvas tilt over hoops
    wagon.add(mesh(loft([-1, -0.5, 0, 0.5, 1].map((t) => [0, 1.4, t * (len / 2 - 0.1), 0.68, 0.62, 2]), { color: CANVAS, warp: (v) => { v.y = Math.max(1.32, v.y); } }, 14), mat));
  }
  let load = null;
  if (long) { // the pontoon: a flat-bottomed boat on the bed
    load = mesh(loft([[0, 1.45, -2.4, 0.5, 0.22, 4], [0, 1.4, -1.8, 0.7, 0.3, 4], [0, 1.4, 1.8, 0.7, 0.3, 4], [0, 1.5, 2.4, 0.5, 0.2, 4]], { color: 0x5a4a34 }, 12), mat);
    wagon.add(load);
  }
  let flag = null, tent = null;
  if (kind === 'hq') {
    const c = FLAG[army] ?? FLAG.fr;
    flag = new THREE.Group();
    flag.add(mesh(merge([P.cyl(0.025, 0.025, 2.4, { y: 1.2, color: 0x6a5030 }), ...c.map((col, i) => P.box(0.36, 0.5, 0.01, { x: 0.18 + i * 0.36, y: 2.1, color: col }))]), mat));
    flag.position.set(0.5, 1.0, -1.2);
    wagon.add(flag);
    tent = mesh(merge([ // the staff's tent: a ridge, the canvas, a table
      P.box(0.05, 2.4, 0.05, { x: 0, y: 1.2, z: -1.6, color: 0x6a5030 }),
      P.box(0.05, 2.4, 0.05, { x: 0, y: 1.2, z: 1.6, color: 0x6a5030 }),
      ...[-1, 1].map((s) => P.box(0.04, 2.2, 3.3, { x: s * 0.72, y: 1.08, rz: s * 0.58, color: CANVAS })),
      P.box(1.0, 0.06, 0.6, { y: 0.75, color: 0x6a5030 }),
    ]), mat);
    tent.position.set(-3.2, 0, -0.5);
    tent.visible = false;
    root.add(tent);
  }
  root.add(wagon);
  // the pair of horses, the driver's horse saddled
  const coat = ARMIES_1806[army]?.coat ?? 0x24324a;
  const horses = [0.65, -0.65].map((x, i) => {
    const h = buildHorse({ coat: i ? 'black' : 'bay', saddle: i ? false : { cloth: coat, trim: 0x2a1c12 } });
    h.root.position.set(x, 0, len / 2 + 2.6);
    root.add(h.root);
    return h;
  });
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 1.5, len / 2);
  root.add(muzzle);
  return {
    root, muzzle,
    animate(u, dt, t) {
      const v = Math.hypot(u.vel.x, u.vel.z);
      for (const h of horses) h.update(dt, v > 3 ? 'trot' : v > 0.4 ? 'walk' : 'halt');
      if (load) load.visible = !u.dropped && !u.laying;
      if (tent) { const k = u.alive ? u.deployK ?? 0 : 0; tent.visible = k > 0.05; tent.scale.y = Math.max(0.05, k); }
      if (flag) flag.rotation.y = Math.sin(t * 1.3) * 0.15;
    },
    die(time) {
      const k = Math.min(1, time / 0.8);
      wagon.rotation.z = 0.5 * k;
      for (const h of horses) { h.body.rotation.z = 1.3 * k; h.body.position.y = 1.2 - 0.6 * k; }
    },
  };
}
