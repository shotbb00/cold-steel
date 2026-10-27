// M163 VADS self-propelled anti-aircraft gun in MERDC woodland camouflage: the boxy aluminium
// M113 hull (sloped glacis, trim vane, rear ramp), five road wheels a side that turn as it
// drives (front sprocket, no return rollers), and the open turret with the six-barrel 20 mm
// M61 Vulcan, its ammunition drum and the ranging radar on the right. Gun elevation follows
// u.gunPitch; the radar head turns while searching. See render/RigRenderer.js.
import * as THREE from 'three';
import { P, merge, pair, grime } from '../units/geometry.js';
import { trackedHull, runningGear, roadWheelGeometry, spinningWheels, distanceDriven, groundTilt, meshAdder } from './vehicleCommon.js';

const GREEN = 0x4b5a35;
const DARK = 0x33382a;
const STEEL = 0x2d2f2a;
const C = { camo: 1 };

let GEO = null;
function geometry() {
  if (GEO) return GEO;
  const gear = runningGear({ halfWidth: 1.15, length: 3.9, wheels: 5, wheelR: 0.3, sprocket: 1, rollers: 0, trackWidth: 0.38 });
  GEO = {
    gear,
    wheel: roadWheelGeometry(0.3, 0.34),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-2.45, 1.75, 0.5], [1.55, 1.82, 0.42], [2.35, 1.25, 0.5], [2.5, 1.08, 0.78]],
        { belly: 0.95, fender: 1.36, fenderY: 1.0, chamfer: 0.05 }, { color: GREEN, ...C }),
      P.box(2.3, 0.06, 0.45, { y: 1.28, z: 2.42, rx: 0.9, color: DARK }),                       // trim vane
      P.box(1.9, 1.15, 0.06, { y: 1.15, z: -2.47, color: DARK }),                               // rear ramp
      P.cyl(0.32, 0.32, 0.12, { x: 0.75, y: 1.86, z: 1.0, color: DARK }, 12),                   // driver's hatch
      ...pair((s) => P.box(0.22, 0.12, 0.12, { x: s * 1.0, y: 1.45, z: 2.25, color: STEEL })), // headlights
    ]), 1.2, 0.3),
    turret: grime(merge([
      P.cyl(0.95, 1.0, 0.32, { y: 0.16, color: GREEN, ...C }, 20),                                // turret ring and base
      P.box(1.3, 0.55, 1.3, { y: 0.6, z: -0.1, color: GREEN, ...C }),                           // gunner's station
      P.box(0.55, 0.65, 0.9, { x: -0.85, y: 0.6, z: -0.2, color: DARK }),                       // ammunition drum
      P.box(0.12, 0.9, 0.12, { x: 0.85, y: 0.85, z: -0.1, color: STEEL }),                      // radar post
    ]), 0.6, 0.0, 0.3),
    gun: merge([
      ...[0, 1, 2, 3, 4, 5].map((k) => P.cyl(0.03, 0.03, 1.8, { x: Math.cos(k * 1.047) * 0.075, y: Math.sin(k * 1.047) * 0.075, z: 0.9, rx: Math.PI / 2, color: STEEL }, 6)),
      P.cyl(0.13, 0.13, 0.12, { z: 1.55, rx: Math.PI / 2, color: STEEL }, 12),                 // barrel clamp
      P.box(0.45, 0.4, 0.7, { z: -0.1, color: DARK }),                                          // receiver
    ]),
    radar: merge([
      P.cyl(0.32, 0.32, 0.06, { z: 0.05, rx: Math.PI / 2, color: 0x5a5e55 }, 16),               // radar dish
      P.box(0.12, 0.12, 0.2, { color: STEEL }),
    ]),
    marks: merge([...pair((s) => P.box(0.02, 0.24, 0.5, { x: s * 1.31, y: 1.5, z: -0.6 }))]),
  };
  return GEO;
}

export function buildNatoM163(mats) {
  const g = geometry();
  const root = new THREE.Group();
  const hull = new THREE.Group();
  root.add(hull);
  meshAdder(hull)(g.hull, mats.body);
  meshAdder(hull)(g.marks, mats.glow, false);
  const wheels = spinningWheels(hull, g.wheel, g.gear.wheels, g.gear.wheelR, mats.body);
  const turret = new THREE.Group();
  turret.position.set(0, 1.82, -0.5);
  hull.add(turret);
  meshAdder(turret)(g.turret, mats.body);
  const gun = new THREE.Group();
  gun.position.set(0.1, 0.7, 0.55);
  turret.add(gun);
  meshAdder(gun)(g.gun, mats.body);
  const radar = new THREE.Group();
  radar.position.set(0.85, 1.32, -0.1);
  turret.add(radar);
  meshAdder(radar)(g.radar, mats.body);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, 1.85);
  gun.add(muzzle);

  const st = {};
  return {
    root,
    muzzle,
    animate(u, dt, t, ctx) {
      groundTilt(st, u, ctx, dt);
      hull.rotation.set(st.pitch, 0, st.roll);
      turret.rotation.y = u.turretYaw - u.yaw;
      gun.rotation.x = -(u.gunPitch ?? 0.05) + Math.sin(t * 60) * 0.004 * u.recoil;
      gun.rotation.z += dt * 40 * u.recoil;           // the barrels spin while it fires
      radar.rotation.y = u.airTarget ? 0 : radar.rotation.y + dt * 3;
      wheels.update(distanceDriven(u));
    },
    die(time) {
      gun.rotation.x = Math.min(0.4, time * 0.5);
      turret.rotation.z = Math.min(0.1, time * 0.2);
    },
  };
}
