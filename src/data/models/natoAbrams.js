// M1 Abrams, mid-1980s, in MERDC woodland camouflage (render/paint.js). Hull and turret are
// extruded from their real outlines: the long flat hull with its shallow glacis, armoured side
// skirts in seven panels, and the faceted wedge turret with bustle rack, commander's cupola and
// .50 cal, loader's M240, the gunner's primary sight "doghouse", smoke grenade launchers and a
// wind sensor. 120 mm gun with thermal shroud and bore evacuator. Seven road wheels a side that
// turn as it drives, two return rollers, rear sprocket, linked tracks. Blue ID panels.
// See render/RigRenderer.js for the model contract.
import * as THREE from 'three';
import { P, merge, pair, grime } from '../units/geometry.js';
import { sideProfile, planProfile, runningGear, roadWheelGeometry, spinningWheels, distanceDriven, groundTilt, meshAdder } from './vehicleCommon.js';

const GREEN = 0x4b5a35;
const DARK = 0x33382a;
const STEEL = 0x2d2f2a;
const BAG = 0x4d5236;
const C = { camo: 1 };

let GEO = null;
function geometry() {
  if (GEO) return GEO;
  const gear = runningGear({ halfWidth: 1.52, length: 6.0, wheels: 7, wheelR: 0.33, sprocket: -1, rollers: 2, trackWidth: 0.63 });
  const skirts = [];
  for (let i = 0; i < 7; i++) {
    const z = -3.2 + i * 1.0;
    skirts.push(...pair((s) => P.box(0.07, 0.6, 0.97, { x: s * 1.88, y: 0.86, z, color: GREEN, ...C })));
  }
  skirts.push(...pair((s) => P.box(0.07, 0.5, 0.7, { x: s * 1.88, y: 0.95, z: 3.75, rx: 0.35, color: GREEN, ...C })));
  GEO = {
    gear,
    wheel: roadWheelGeometry(0.33, 0.55),
    hull: grime(merge([
      ...gear.parts,
      // lower hull between the tracks, then the wide upper hull over them
      sideProfile([[-3.7, 0.45], [-3.75, 1.4], [2.6, 1.48], [3.9, 1.1], [3.95, 0.9], [3.35, 0.45]], 2.3, { color: GREEN, ...C }),
      sideProfile([[-3.78, 1.02], [-3.8, 1.42], [2.6, 1.5], [3.88, 1.12], [3.9, 1.02]], 3.72, { color: GREEN, ...C }),
      ...skirts,
      P.box(2.6, 0.06, 1.7, { y: 1.47, z: -2.4, color: DARK }),                         // engine deck grilles
      ...[-3.0, -2.6, -2.2, -1.8].map((z) => P.box(2.5, 0.03, 0.06, { y: 1.51, z, color: STEEL })),
      P.box(2.9, 0.55, 0.12, { y: 1.1, z: -3.8, color: DARK }),                         // exhaust grille
      ...pair((s) => P.box(0.36, 0.14, 0.16, { x: s * 1.25, y: 1.32, z: 3.75, rx: 0.4, color: STEEL })), // headlight groups
      ...pair((s) => P.box(0.12, 0.12, 0.2, { x: s * 0.8, y: 0.62, z: 3.65, color: STEEL })),             // tow eyes
      P.cyl(0.03, 0.03, 5.5, { x: 1.7, y: 1.5, z: -0.6, rx: Math.PI / 2, color: STEEL }, 6),             // tow cable
      P.box(0.55, 0.08, 0.5, { y: 1.47, z: 2.95, rx: -0.29, color: DARK }),             // driver's hatch
    ]), 1.25, 0.3),
    turret: grime(merge([
      planProfile([[-0.55, 2.45], [0.55, 2.45], [1.72, 1.25], [1.8, -1.2], [1.62, -2.0], [-1.62, -2.0], [-1.8, -1.2], [-1.72, 1.25]], 0.62, { color: GREEN, ...C }),
      planProfile([[-0.5, 2.25], [0.5, 2.25], [1.58, 1.15], [1.65, -1.15], [1.5, -1.9], [-1.5, -1.9], [-1.65, -1.15], [-1.58, 1.15]], 0.16, { y: 0.6, color: GREEN, ...C }),
      // bustle rack with stowage
      ...pair((s) => P.box(0.05, 0.05, 0.8, { x: s * 1.5, y: 0.55, z: -2.4, color: STEEL })),
      P.box(3.0, 0.05, 0.05, { y: 0.55, z: -2.8, color: STEEL }),
      P.box(3.0, 0.05, 0.05, { y: 0.2, z: -2.8, color: STEEL }),
      ...[-1.5, -0.75, 0, 0.75, 1.5].map((x) => P.box(0.04, 0.38, 0.04, { x, y: 0.37, z: -2.8, color: STEEL })),
      P.box(1.1, 0.34, 0.55, { x: -0.7, y: 0.36, z: -2.45, color: BAG }),
      P.box(0.9, 0.28, 0.5, { x: 0.6, y: 0.33, z: -2.45, rz: 0.06, color: 0x5b5236 }),
      // commander's cupola with .50 cal, loader's hatch and M240, gunner's sight doghouse
      P.cyl(0.38, 0.42, 0.3, { x: 0.62, y: 0.9, z: -0.45, color: GREEN, ...C }, 14),
      ...[0, 1, 2, 3, 4, 5].map((k) => P.box(0.1, 0.07, 0.03, { x: 0.62 + Math.sin(k * 1.047) * 0.4, y: 0.98, z: -0.45 + Math.cos(k * 1.047) * 0.4, ry: k * 1.047, color: 0x1a1d1c })), // vision blocks
      P.box(0.1, 0.12, 0.35, { x: 0.62, y: 1.13, z: -0.15, color: STEEL }),
      P.cyl(0.022, 0.022, 0.95, { x: 0.62, y: 1.15, z: 0.4, rx: Math.PI / 2, color: STEEL }, 6),
      P.cyl(0.33, 0.33, 0.06, { x: -0.65, y: 0.79, z: -0.35, color: DARK }, 14),
      P.box(0.06, 0.09, 0.7, { x: -0.95, y: 0.98, z: -0.1, color: STEEL }),
      P.box(0.46, 0.38, 0.56, { x: 0.78, y: 0.95, z: 0.85, color: GREEN, ...C }),
      P.box(0.36, 0.2, 0.03, { x: 0.78, y: 0.98, z: 1.14, color: 0x14181a }),           // sight glass
      P.cyl(0.015, 0.015, 0.6, { x: -0.25, y: 1.05, z: -1.7, color: STEEL }, 5),        // wind sensor
      // smoke grenade launchers, six tubes a side
      ...pair((s) => merge([0, 1, 2, 3, 4, 5].map((k) => P.cyl(0.045, 0.045, 0.24, { x: s * (1.62 - (k % 3) * 0.1), y: 0.42 + Math.floor(k / 3) * 0.1, z: 1.45 + (k % 3) * 0.06, rx: -1.1, rz: s * 0.4, color: DARK }, 8)))),
      P.box(0.95, 0.6, 0.35, { y: 0.4, z: 2.5, color: GREEN, ...C }),                  // mantlet
    ]), 0.9, 0.0, 0.3),
    marks: merge([
      ...pair((s) => P.box(0.02, 0.26, 0.55, { x: s * 1.79, y: 0.32, z: 0.2 })),
      P.box(0.5, 0.2, 0.02, { y: 0.45, z: -2.84 }),
    ]),
    gun: merge([
      P.cyl(0.095, 0.12, 5.3, { z: 2.75, rx: Math.PI / 2, color: GREEN, ...C }, 14),
      ...[0.9, 1.7, 3.6, 4.4].map((z) => P.cyl(0.135, 0.135, 0.07, { z, rx: Math.PI / 2, color: DARK }, 14)),  // shroud bands
      P.cyl(0.155, 0.155, 0.5, { z: 2.8, rx: Math.PI / 2, color: GREEN, ...C }, 14),          // bore evacuator
      P.cyl(0.11, 0.1, 0.12, { z: 5.42, rx: Math.PI / 2, color: STEEL }, 14),                 // muzzle reference
      P.box(0.5, 0.42, 0.5, { z: 0.15, color: DARK }),                                        // canvas mantlet cover
    ]),
  };
  return GEO;
}

export function buildNatoAbrams(mats) {
  const g = geometry();
  const root = new THREE.Group();
  const hull = new THREE.Group();
  root.add(hull);
  meshAdder(hull)(g.hull, mats.body);
  const wheels = spinningWheels(hull, g.wheel, g.gear.wheels, g.gear.wheelR, mats.body);
  const turret = new THREE.Group();
  turret.position.set(0, 1.5, -0.3);
  hull.add(turret);
  const addT = meshAdder(turret);
  addT(g.turret, mats.body);
  addT(g.marks, mats.glow, false);
  const gun = new THREE.Group();
  gun.position.set(0, 0.42, 2.55);
  turret.add(gun);
  meshAdder(gun)(g.gun, mats.body);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, 5.55);
  gun.add(muzzle);

  const st = {};
  return {
    root,
    muzzle,
    animate(u, dt, t, ctx) {
      groundTilt(st, u, ctx, dt);
      hull.rotation.set(st.pitch - u.recoil * 0.025, 0, st.roll);
      hull.position.y = Math.sin(u.walkPhase * 2.3) * 0.015 * u.gait;
      turret.rotation.y = u.turretYaw - u.yaw;
      gun.position.z = 2.55 - u.recoil * 0.45;
      wheels.update(distanceDriven(u));
    },
    die(time) {
      turret.rotation.z = Math.min(0.22, time * 0.5);
      turret.position.y = 1.5 + Math.max(0, Math.sin(Math.min(time, 0.6) * 5)) * 0.25;
    },
  };
}
