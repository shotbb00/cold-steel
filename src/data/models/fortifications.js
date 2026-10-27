// Fixed fortifications for the Lanes mode (modes/lanes.js), in the same kit as the vehicles:
//   turret bunker  a sunk concrete casemate with a tank turret on top — the Bundeswehr really
//                  did dig old tank turrets into the border line; the Pact used T-55 turrets.
//                  The turret traverses and recoils like a tank's.
//   MG pit         a round concrete pit in a ring of sandbags, a heavy MG on a pintle behind a
//                  shield, traversing to its target
//   command bunker a blockhouse half buried in an earth berm: camouflage net, aerials, a
//                  radio mast, sandbag walls at the doors (the headquarters)
// Built as render/RigRenderer.js rigs: { root, muzzle, animate(u, dt), die(time) }.
import * as THREE from 'three';
import { P, merge, pair, grime } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';

const CONCRETE = 0x8a877d;
const CONCRETE_DARK = 0x6a675f;
const EARTH = 0x4e4232;
const BAG = 0xa8966a;
const STEEL = 0x2d2f2a;
const C = { camo: 1 };
const PAINT = { nato: 0x4b5a35, pact: 0x55603e };

const cache = {};
const once = (key, fn) => (cache[key] ??= fn());

// ---------------------------------------------------------------- turret bunker

function bunkerGeo(faction) {
  return once(`bunker-${faction}`, () => {
    const green = PAINT[faction];
    const base = grime(merge([
      P.cyl(5.2, 6.2, 1.1, { y: 0.35, color: EARTH }, 18),                    // earth berm
      P.box(5.0, 1.5, 5.0, { y: 0.9, color: CONCRETE }),                       // the casemate
      P.box(5.6, 0.25, 5.6, { y: 1.7, color: CONCRETE_DARK }),                 // roof slab
      P.cyl(1.5, 1.6, 0.35, { y: 1.95, color: CONCRETE_DARK }, 16),           // turret ring
      ...pair((s) => P.box(0.8, 0.5, 0.06, { x: s * 1.4, y: 1.0, z: 2.52, color: 0x1c1c1a })), // firing slits
      P.box(1.0, 1.1, 0.1, { x: -1.6, y: 0.8, z: -2.52, color: 0x2a2620 }),    // rear door
      ...[0, 1, 2, 3, 4].map((i) => P.box(1.0, 0.35, 0.5, { x: -2 + i, y: 1.95, z: 2.6, ry: (i - 2) * 0.05, color: BAG })), // bags on the roof edge
    ]), 1.2, 0.2, 0.6);
    const turret = faction === 'nato'
      ? merge([ // M48-style cast turret
        P.sphere(1.6, { sy: 0.45, sz: 1.15, y: 0.25, color: green, ...C }, 16, 8),
        P.box(1.3, 0.55, 0.7, { y: 0.32, z: 1.55, color: green, ...C }),         // mantlet
        P.cyl(0.42, 0.45, 0.4, { x: 0.65, y: 0.85, z: -0.35, color: green, ...C }, 12), // cupola
        P.box(1.6, 0.5, 0.8, { y: 0.3, z: -1.75, color: green, ...C }),          // bustle
      ])
      : merge([ // T-55 dome
        P.sphere(1.7, { sy: 0.5, y: 0.15, color: green, ...C }, 18, 9),
        P.box(1.0, 0.5, 0.5, { y: 0.32, z: 1.55, color: green, ...C }),
        P.cyl(0.38, 0.4, 0.3, { x: -0.6, y: 0.85, z: -0.2, color: green, ...C }, 12),
        P.cyl(0.3, 0.3, 0.25, { x: 0.65, y: 0.8, z: 0.1, color: green, ...C }, 10),
      ]);
    const barrel = merge([
      P.cyl(0.11, 0.14, 4.4, { z: 2.2, rx: Math.PI / 2, color: green, ...C }, 12),
      P.cyl(0.18, 0.18, 0.45, { z: 2.6, rx: Math.PI / 2, color: green, ...C }, 12), // fume extractor
      P.cyl(0.15, 0.15, 0.3, { z: 4.4, rx: Math.PI / 2, color: STEEL }, 10),
    ]);
    const marks = merge([...pair((s) => P.box(0.4, 0.3, 0.02, { x: s * 1.1, y: 0.4, z: -1.0, ry: s * 0.6 }))]);
    return { base, turret, barrel, marks };
  });
}

export function buildTurretBunker(faction) {
  return (mats) => {
    const g = bunkerGeo(faction);
    const root = new THREE.Group();
    meshAdder(root)(g.base, mats.body);
    const turret = new THREE.Group();
    turret.position.set(0, 2.1, 0.2);
    root.add(turret);
    meshAdder(turret)(g.turret, mats.body);
    meshAdder(turret)(g.marks, mats.glow, false);
    const barrel = new THREE.Group();
    barrel.position.set(0, 0.35, 1.7);
    turret.add(barrel);
    meshAdder(barrel)(g.barrel, mats.body);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0, 4.6);
    barrel.add(muzzle);
    return {
      root,
      muzzle,
      animate(u) {
        turret.rotation.y = u.turretYaw - u.yaw;
        barrel.rotation.x = -(u.gunPitch ?? 0.03);
        barrel.position.z = 1.7 - u.recoil * 0.45;
      },
      die(time) {
        turret.rotation.z = Math.min(0.35, time * 0.5);
        turret.position.y = 2.1 + Math.sin(Math.min(Math.PI, time * 3)) * 0.8; // the blast lifts it, it drops back crooked
        barrel.rotation.x = Math.min(0.25, time * 0.4);
      },
    };
  };
}

// ---------------------------------------------------------------- MG pit

function pitGeo(faction) {
  return once(`pit-${faction}`, () => {
    const bags = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      if (Math.cos(a) < -0.85) continue; // the way in, at the back
      for (let row = 0; row < 2; row++) {
        bags.push(P.box(0.95, 0.3, 0.5, { x: Math.sin(a) * 2.2, y: 0.18 + row * 0.3, z: Math.cos(a) * 2.2, ry: a + (row ? 0.1 : 0), color: row ? 0x9a8960 : BAG }));
      }
    }
    return {
      base: grime(merge([
        P.cyl(2.0, 2.3, 0.5, { y: 0.1, color: CONCRETE }, 16),       // the concrete pit lip
        ...bags,
        P.box(1.4, 0.9, 0.25, { y: 0.95, z: 1.4, color: CONCRETE_DARK }), // front shield
      ]), 0.8, 0.1, 0.5),
      gun: merge([
        P.cyl(0.05, 0.06, 1.0, { y: 0.5, color: STEEL }, 6),              // pintle
        P.box(0.22, 0.2, 0.9, { y: 1.05, z: 0.1, color: STEEL }),          // receiver
        P.cyl(0.045, 0.045, 1.1, { y: 1.08, z: 1.0, rx: Math.PI / 2, color: STEEL }, 6), // barrel
        P.box(0.7, 0.5, 0.04, { y: 1.15, z: 0.45, color: PAINT[faction] }), // gun shield
        P.box(0.16, 0.18, 0.3, { x: 0.2, y: 0.95, z: -0.1, color: 0x3a3a2a }), // ammo box
      ]),
    };
  });
}

export function buildMgPit(faction) {
  return (mats) => {
    const g = pitGeo(faction);
    const root = new THREE.Group();
    meshAdder(root)(g.base, mats.body);
    const gun = new THREE.Group();
    gun.position.set(0, 0.2, 0.2);
    root.add(gun);
    meshAdder(gun)(g.gun, mats.body);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 1.08, 1.6);
    gun.add(muzzle);
    return {
      root,
      muzzle,
      animate(u) {
        gun.rotation.y = u.turretYaw - u.yaw;
        gun.rotation.x = -u.recoil * 0.04;
      },
      die(time) {
        gun.rotation.z = Math.min(1.2, time * 1.5);
      },
    };
  };
}

// ---------------------------------------------------------------- command bunker

function hqGeo(faction) {
  return once(`hq-${faction}`, () => {
    const net = PAINT[faction];
    return grime(merge([
      P.box(12, 2.2, 9, { y: 0.4, color: EARTH }),                           // earth berm over it
      P.box(9.5, 2.6, 7, { y: 1.3, color: CONCRETE }),                       // the blockhouse
      P.box(10.2, 0.35, 7.6, { y: 2.75, color: CONCRETE_DARK }),             // roof
      P.box(10.6, 0.15, 8.2, { y: 3.05, color: net, ...C }),                 // camouflage net
      ...pair((s) => P.box(1.4, 1.9, 0.12, { x: s * 2.6, y: 1.05, z: 3.52, color: 0x2a2620 })), // doors
      ...pair((s) => P.box(2.2, 0.9, 0.55, { x: s * 2.6, y: 0.45, z: 5.0, color: BAG })), // blast walls
      ...[-3.5, -1.2, 1.2, 3.5].map((x) => P.box(0.9, 0.25, 0.06, { x, y: 2.0, z: 3.52, color: 0x1c1c1a })), // vision slits
      P.cyl(0.08, 0.1, 12, { x: -3.8, y: 8.8, z: -2.5, color: 0x6a6c66 }, 6), // radio mast
      P.box(1.6, 0.06, 0.06, { x: -3.8, y: 14.4, z: -2.5, color: 0x6a6c66 }),
      ...pair((s) => P.cyl(0.02, 0.02, 4, { x: s * 1.8 + 2, y: 5, z: -1.5, rz: s * 0.15, color: 0x2a2a28 }, 4)), // whip aerials
      P.box(1.0, 0.8, 1.0, { x: 3.5, y: 3.4, z: -2, color: STEEL }),          // generator
    ]), 1.5, 0.2, 0.5);
  });
}

export function buildCommandBunker(faction) {
  return (mats) => {
    const root = new THREE.Group();
    meshAdder(root)(hqGeo(faction), mats.body);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 3.4, 4);
    root.add(muzzle);
    return {
      root,
      muzzle,
      animate() {},
      die(time) {
        root.scale.y = Math.max(0.45, 1 - time * 0.4); // the roof comes in
      },
    };
  };
}
