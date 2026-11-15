// The German coast at Zeebrugge, 1918 (the coastal map's fixed guns: data/units1918/coast.js), as render/RigRenderer.js
// rigs { root, muzzle, animate(u), die(time) } like models/atlanticWall.js:
//   moleGun   a 10.5 cm naval gun on its pedestal behind a curved shield, in a ring of sandbags on the Mole's head
//   coastGun  a heavy naval gun (the 28 cm of the Kaiser Wilhelm II battery's kind) on a turntable in an open concrete
//             emplacement behind the dunes, its shield, the ammunition recesses round the wall
import * as THREE from 'three';
import { P, merge, grime } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';

const GREY = 0x7a8088;
const DARK = 0x2a2c2a;
const CONCRETE = 0xa6a296;
const SAND = 0xa8966a;
const FIELD_GREY = 0x5c604e;
const cache = {};

/** A gun on a pedestal behind its shield, scaled by k: [base, gun] geometries. */
function gunGeo(key, k, ring) {
  return (cache[key] ??= (() => {
    const bags = [], base = [];
    if (ring === 'sandbags') for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      if (Math.cos(a) < -0.7) continue; // (the way in, at the back)
      for (const y of [0.2, 0.55]) bags.push(P.box(0.9, 0.32, 0.5, { x: Math.sin(a) * 3.4 * k, y, z: Math.cos(a) * 3.4 * k, ry: a, color: SAND }));
    }
    if (ring === 'concrete') {
      base.push(P.cyl(7.5 * k, 7.8 * k, 1.6, { y: 0.3, color: CONCRETE }, 28), P.cyl(6.2 * k, 6.2 * k, 0.4, { y: 1.0, color: 0x4a4840 }, 28)); // the emplacement and its floor
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; base.push(P.box(1.2, 1, 0.8, { x: Math.sin(a) * 6.6 * k, y: 1.2, z: Math.cos(a) * 6.6 * k, ry: a, color: 0x2a2826 })); } // the ready-use recesses
    }
    const shieldH = 2.2 * k, w = 2.6 * k;
    return {
      base: grime(merge([...bags, ...base]), 0.8, 0.1, 0.5),
      gun: merge([
        P.cyl(0.55 * k, 0.8 * k, 1.2 * k, { y: 0.6 * k, color: GREY }, 12),                                      // the pedestal
        P.cyl(1.4 * k, 1.4 * k, 0.15, { y: 0.1, color: DARK }, 16),                                               // the training ring
        P.box(0.9 * k, 0.8 * k, 2.2 * k, { y: 1.4 * k, z: -0.2 * k, color: GREY }),                               // the cradle and breech
        P.cyl(0.11 * k, 0.15 * k, 5 * k, { y: 1.5 * k, z: 2.4 * k, rx: Math.PI / 2, color: DARK }, 10),           // the barrel
        P.box(w, shieldH, 0.12, { y: 1.1 * k + shieldH / 2 - 0.4, z: 0.7 * k, color: GREY }),                    // the shield's face
        ...[-1, 1].map((s) => P.box(0.1, shieldH * 0.85, 1.6 * k, { x: s * w / 2, y: 1.1 * k + shieldH * 0.42 - 0.4, z: 0, color: GREY })), // its wings
        P.box(w, 0.1, 1.6 * k, { y: 1.1 * k + shieldH - 0.4, z: 0, color: GREY }),                                // its roof
        ...[-0.8, 0.8].map((x) => P.box(0.45, 0.9, 0.35, { x: x * k, y: 0.9, z: -1.6 * k, color: FIELD_GREY })),   // two of the crew
      ]),
    };
  })());
}

function rig(key, k, ring, len) {
  return () => (mats) => {
    const g = gunGeo(key, k, ring);
    const root = new THREE.Group();
    meshAdder(root)(g.base, mats.body);
    const gun = new THREE.Group();
    gun.position.y = ring === 'concrete' ? 1.2 : 0;
    root.add(gun);
    meshAdder(gun)(g.gun, mats.body);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 1.5 * k, len * k);
    gun.add(muzzle);
    return {
      root,
      muzzle,
      animate(u) {
        gun.rotation.y = Math.atan2(Math.sin((u.turretYaw ?? u.yaw) - u.yaw), Math.cos((u.turretYaw ?? u.yaw) - u.yaw)); // (all round: it trains on anything)
        gun.rotation.x = -(u.gunPitch ?? 0.03);
      },
      die(time) { gun.rotation.x = Math.min(0.35, time * 0.4); gun.rotation.z = Math.min(0.25, time * 0.3); },
    };
  };
}

export const buildMoleGun = rig('mole', 1, 'sandbags', 5);
export const buildCoastGun = rig('coast', 2.4, 'concrete', 5);
