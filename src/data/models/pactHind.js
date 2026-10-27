// Mi-24 Hind attack helicopter in Soviet two-tone camouflage (green and sand, render/paint.js):
// the bulky fuselage with its troop cabin, the stepped "double bubble" canopies, the four-barrel
// 12.7 mm Yak-B gun turret under the nose, the drooping stub wings with two UB-32 rocket pods a
// side and anti-tank rails at the tips, twin engine intakes, retracted gear, the tail boom with
// its swept fin and tail rotor on the left, and the five-bladed main rotor. Red stars.
// Contract: see natoCobra.js.
import * as THREE from 'three';
import { P, merge, pair, loft, limb } from '../units/geometry.js';
import { body, surface, fin, blades, rocketPod, missile } from './airKit.js';
import { meshAdder } from './vehicleCommon.js';

const GREEN = 0x4f5a36;
const GLASS = 0x1b2126;
const STEEL = 0x2a2c28;
const BLADE = 0x262920;
const HOLE = 0x141414;
const DARK = 0x323a26;
const C = { camo: 1 };

let GEO = null;
function geometry() {
  if (GEO) return GEO;
  GEO = {
    body: merge([
      // the bulky fuselage: narrow nose, deep troop cabin, the boom rising to the swept fin
      body([
        [5.3, 1.22, 0.14, 0.18], [4.7, 1.42, 0.5, 0.55, 2.4], [3.6, 1.75, 0.72, 0.82, 2.5], [2.4, 1.95, 0.86, 1.0, 2.6],
        [1.0, 2.0, 0.98, 1.05, 2.7], [-1.5, 2.05, 0.95, 1.0, 2.7], [-2.8, 2.25, 0.62, 0.72], [-4.0, 2.45, 0.4, 0.45], [-8.5, 2.55, 0.22, 0.25], [-9.6, 2.6, 0.1, 0.12],
      ], { color: GREEN, ...C }),
      // the "double bubble": gunner's canopy in front and low, the pilot's behind and higher
      body([[5.0, 1.85, 0.05, 0.05], [4.6, 2.05, 0.42, 0.3], [3.95, 2.15, 0.48, 0.38], [3.45, 2.05, 0.35, 0.25]], { color: GLASS }),
      body([[3.6, 2.35, 0.05, 0.05], [3.2, 2.65, 0.5, 0.32], [2.45, 2.78, 0.56, 0.4], [1.9, 2.62, 0.4, 0.26]], { color: GLASS }),
      ...[4.3, 2.8].map((z, i) => body([[z + 0.04, 2.1 + i * 0.6, 0.47 + i * 0.07, 0.36 + i * 0.03], [z - 0.04, 2.12 + i * 0.6, 0.47 + i * 0.07, 0.36 + i * 0.03]], { color: DARK })),
      // cabin windows and door
      ...[0.4, 1.2].flatMap((z) => pair((s) => P.box(0.04, 0.35, 0.45, { x: s * 0.98, y: 2.2, z, color: GLASS }))),
      // twin engines on top with their dust-filter intakes, exhausts turned out; the transmission
      ...pair((s) => body([[2.3, 3.0, 0.3, 0.3, 2], [2.0, 3.02, 0.4, 0.4, 2], [-0.6, 3.0, 0.4, 0.4, 2], [-1.4, 2.95, 0.3, 0.3, 2]], { x: s * 0.55, color: GREEN, ...C })),
      ...pair((s) => P.cyl(0.26, 0.26, 0.04, { x: s * 0.55, y: 3.0, z: 2.32, rx: Math.PI / 2, color: HOLE }, 12)),
      ...pair((s) => limb([s * 0.7, 3.0, -1.3], [s * 1.1, 2.9, -1.9], [[0, 0.2, 0.2], [1, 0.22, 0.22]], { color: STEEL })),
      body([[1.0, 3.1, 0.4, 0.3, 2.6], [0.0, 3.3, 0.45, 0.45, 2.6], [-1.6, 3.15, 0.35, 0.3, 2.6]], { color: GREEN, ...C }),
      P.cyl(0.22, 0.24, 0.6, { y: 3.65, z: -0.2, color: STEEL }, 10),                                   // rotor mast
      // tail: swept fin, stabiliser
      fin([[2.6, -9.0, 0.75, 0.08], [3.6, -9.6, 0.55, 0.07], [4.2, -10.0, 0.35, 0.05]], { color: GREEN, ...C }),
      surface([[-1.2, 2.5, -7.9, 0.35, 0.04], [0, 2.5, -7.9, 0.4, 0.05], [1.2, 2.5, -7.9, 0.35, 0.04]], { color: GREEN, ...C }),
      // the drooping stub wings: two UB-32 pods a side, the Falanga rails and missiles at the tips
      ...pair((s) => surface([[s * 0.9, 1.85, 0.2, 0.85, 0.12], [s * 3.3, 1.3, 0.1, 0.55, 0.07]], { color: GREEN, ...C })),
      ...pair((s) => [1.6, 2.5].flatMap((x) => rocketPod(s * x, 1.72 - (x - 0.9) * 0.23 - 0.32, -0.7, 0.95, 0.24, DARK))).flat(),
      ...pair((s) => P.box(0.1, 0.5, 1.2, { x: s * 3.32, y: 1.2, z: 0.15, color: STEEL })),
      ...pair((s) => [-0.12, 0.12].flatMap((dy) => missile(s * 3.45, 1.2 + dy, -0.6, 0.9, 0.07, 0x5a5e52))).flat(),
      // the Yak-B turret under the nose, its four barrels; the retracted gear's fairings
      P.sphere(0.32, { y: 1.02, z: 4.6, sy: 0.85, color: DARK }, 12, 8),
      ...[[-0.04, -0.04], [0.04, -0.04], [-0.04, 0.04], [0.04, 0.04]].map(([x, y]) => P.cyl(0.025, 0.025, 1.0, { x, y: 0.98 + y, z: 5.15, rx: Math.PI / 2, color: STEEL }, 5)),
      body([[3.0, 0.92, 0.2, 0.15], [2.6, 0.9, 0.3, 0.2], [2.0, 0.95, 0.25, 0.15]], { color: DARK }),
      ...pair((s) => body([[-0.3, 1.05, 0.15, 0.18], [-0.6, 1.0, 0.25, 0.25], [-1.3, 1.05, 0.22, 0.22], [-1.6, 1.1, 0.12, 0.12]], { x: s * 1.0, color: DARK })),
    ]),
    marks: merge([...pair((s) => P.cyl(0.32, 0.32, 0.02, { x: s * 0.37, y: 2.5, z: -5.0, rz: Math.PI / 2 }, 5))]),
    rotor: merge([...blades(5, 8.6, 0.58, BLADE, 0.5), P.cyl(0.35, 0.35, 0.25, { color: STEEL }, 10)]),
    tailRotor: merge([...[0, 1, 2].map((k) => P.box(0.04, 3.2, 0.26, { color: BLADE, surf: 'paint', rx: (k / 3) * Math.PI })), P.cyl(0.12, 0.12, 0.12, { rz: Math.PI / 2, color: STEEL }, 8)]),
  };
  return GEO;
}

export function buildPactHind(mats) {
  const g = geometry();
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(g.body, mats.body);
  add(g.marks, mats.glow, false);
  const rotor = new THREE.Group();
  rotor.position.set(0, 3.95, -0.2);
  meshAdder(rotor)(g.rotor, mats.body);
  root.add(rotor);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(-0.15, 3.5, -9.6);
  meshAdder(tailRotor)(g.tailRotor, mats.body, false);
  root.add(tailRotor);
  const gun = new THREE.Object3D();
  gun.position.set(0, 0.98, 5.65);
  root.add(gun);
  const pods = [-2.5, -1.6, 1.6, 2.5].map((x) => {
    const o = new THREE.Object3D();
    o.position.set(x, 1.72 - (Math.abs(x) - 0.9) * 0.23 - 0.32, 1.0);   // the fronts of the drooping wing's pods
    root.add(o);
    return o;
  });
  return { root, rotor, tailRotor, gun, pods, rotorRadius: 8.6, blades: 5 };
}
