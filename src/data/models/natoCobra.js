// AH-1S Cobra attack helicopter in olive drab: the slim fuselage with tandem canopy (gunner in
// front, pilot behind and above), the chin turret with its 20 mm M197 cannon, stub wings with
// two 2.75 in rocket pods and TOW launchers, the engine hump, skids, the tail boom with fin and
// tail rotor, and the two-bladed main rotor. Blue ID panel on the tail.
// Contract (systems/AirStrike.js): build(mats) → { root, rotor, tailRotor, gun (Object3D at the
// muzzle), pods: [Object3D…] (rocket launch points), rotorRadius }
import * as THREE from 'three';
import { P, merge, pair, loft, limb } from '../units/geometry.js';
import { body, surface, fin, blades, rocketPod, missile } from './airKit.js';
import { meshAdder } from './vehicleCommon.js';

const OD = 0x3e4730;
const OD_DK = 0x2f3624;
const GLASS = 0x1b2126;
const STEEL = 0x2a2c28;
const BLADE = 0x24271f;
const HOLE = 0x141414;

let GEO = null;
function geometry() {
  if (GEO) return GEO;
  GEO = {
    body: merge([
      // the famously slim fuselage (under a metre wide), deep at the cockpits, tapering into the boom
      body([
        [3.85, 1.32, 0.1, 0.12], [3.5, 1.4, 0.34, 0.38, 2.4], [2.7, 1.5, 0.44, 0.55, 2.6], [1.4, 1.6, 0.49, 0.7, 2.8],
        [0.0, 1.68, 0.5, 0.75, 2.8], [-1.2, 1.78, 0.45, 0.66, 2.6], [-2.2, 1.95, 0.3, 0.42], [-5.5, 2.05, 0.17, 0.22], [-7.5, 2.1, 0.12, 0.15], [-7.9, 2.12, 0.05, 0.06],
      ], { color: OD }),
      // the stepped tandem canopy: gunner in front and low, pilot behind and higher; its frames
      body([[3.3, 1.78, 0.05, 0.05], [2.85, 1.95, 0.33, 0.24], [2.15, 2.02, 0.37, 0.28], [1.65, 2.2, 0.37, 0.36], [0.95, 2.35, 0.36, 0.35], [0.45, 2.25, 0.2, 0.2]], { color: GLASS }),
      ...[2.3, 1.4].map((z) => body([[z + 0.04, 2.0 + (2.3 - z) * 0.2, 0.39, 0.35], [z - 0.04, 2.02 + (2.3 - z) * 0.2, 0.39, 0.35]], { color: OD_DK })),
      // the engine hump with its intakes, the exhaust angled up and back, the transmission fairing
      body([[0.6, 2.35, 0.2, 0.15, 2.6], [0.2, 2.45, 0.38, 0.32, 2.6], [-1.4, 2.45, 0.38, 0.3, 2.6], [-2.0, 2.4, 0.26, 0.2]], { color: OD }),
      ...pair((s) => P.box(0.04, 0.22, 0.3, { x: s * 0.37, y: 2.48, z: 0.1, color: HOLE })),
      limb([0, 2.5, -1.9], [0, 2.75, -2.5], [[0, 0.2, 0.2], [1, 0.22, 0.22]], { color: STEEL }),
      P.cyl(0.18, 0.18, 0.02, { y: 2.76, z: -2.51, rx: -1.2, color: HOLE }, 10),
      P.cyl(0.18, 0.2, 0.55, { y: 2.65, z: -0.3, color: STEEL }, 10),                                   // rotor mast
      // tail: the fin with the rotor on its left, the small elevators mid-boom
      fin([[2.0, -7.4, 0.55, 0.06], [2.8, -7.75, 0.45, 0.05], [3.3, -8.0, 0.3, 0.04]], { color: OD }),
      surface([[-0.85, 2.0, -5.3, 0.25, 0.03], [0, 2.0, -5.3, 0.28, 0.035], [0.85, 2.0, -5.3, 0.25, 0.03]], { color: OD }),
      fin([[1.95, -7.5, 0.25, 0.03], [1.55, -7.6, 0.2, 0.03]], { color: OD }),                          // ventral fin
      // stub wings: 2.75 in rocket pods inboard, TOW launchers (2 × 2 tubes) outboard
      ...pair((s) => surface([[s * 0.45, 1.45, 0.1, 0.42, 0.06], [s * 1.6, 1.38, 0.05, 0.32, 0.04]], { color: OD })),
      ...pair((s) => rocketPod(s * 0.95, 1.12, -0.55, 0.95, 0.19, OD_DK)).flat(),
      ...pair((s) => [-0.09, 0.09].flatMap((dx) => [-0.09, 0.09].map((dy) => P.cyl(0.075, 0.075, 1.25, { x: s * 1.45 + dx, y: 1.2 + dy, z: 0.15, rx: Math.PI / 2, color: OD_DK }, 8)))).flat(),
      // the M197 in the chin turret
      P.sphere(0.26, { y: 1.05, z: 3.2, sy: 0.85, color: OD_DK }, 12, 8),
      ...[0, 1, 2].map((k) => P.cyl(0.025, 0.025, 1.1, { x: Math.sin(k * 2.094) * 0.04, y: 0.98 + Math.cos(k * 2.094) * 0.04, z: 3.85, rx: Math.PI / 2, color: STEEL }, 5)),
      // skids, curved up at the front, on their cross tubes
      ...pair((s) => loft([[s * 0.85, 0.1, -1.6, 0.04, 0.04, 2], [s * 0.85, 0.08, 1.2, 0.04, 0.04, 2], [s * 0.85, 0.18, 1.75, 0.04, 0.04, 2], [s * 0.85, 0.38, 1.95, 0.04, 0.04, 2]], { color: STEEL }, 6)),
      ...[1.1, -0.9].flatMap((z) => pair((s) => limb([s * 0.85, 0.1, z], [s * 0.35, 1.05, z], [[0, 0.04, 0.04], [1, 0.045, 0.045]], { color: STEEL }))),
    ]),
    marks: merge([P.box(0.02, 0.3, 0.6, { x: 0.2, y: 2.05, z: -5.0 })]),
    rotor: merge([...blades(2, 6.7, 0.65, BLADE), P.cyl(0.28, 0.28, 0.2, { color: STEEL }, 10), P.box(0.9, 0.12, 0.2, { y: 0.15, color: STEEL })]),
    tailRotor: merge([P.box(0.04, 2.6, 0.24, { color: BLADE, surf: 'paint' }), P.cyl(0.1, 0.1, 0.1, { rz: Math.PI / 2, color: STEEL }, 8)]),
  };
  return GEO;
}

export function buildNatoCobra(mats) {
  const g = geometry();
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(g.body, mats.body);
  add(g.marks, mats.glow, false);
  const rotor = new THREE.Group();
  rotor.position.set(0, 2.95, -0.3);
  meshAdder(rotor)(g.rotor, mats.body);
  root.add(rotor);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(-0.14, 2.85, -7.8);
  meshAdder(tailRotor)(g.tailRotor, mats.body, false);
  root.add(tailRotor);
  const gun = new THREE.Object3D();
  gun.position.set(0, 0.98, 4.5);
  root.add(gun);
  const pods = [-1, 1].map((s) => {
    const o = new THREE.Object3D();
    o.position.set(s * 0.95, 1.12, 0.95);
    root.add(o);
    return o;
  });
  return { root, rotor, tailRotor, gun, pods, rotorRadius: 6.7, blades: 2 };
}
