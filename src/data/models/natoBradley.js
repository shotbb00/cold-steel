// M2 Bradley infantry fighting vehicle in MERDC woodland camouflage: the tall hull built from
// its cross-sections (chamfered upper edges, long upper glacis), firing ports, the exhaust
// grille front right, armoured side skirts, rear troop ramp, six road wheels a side that
// turn as it drives (front sprocket, three return rollers); the two-man turret offset to the
// right with the 25 mm M242 Bushmaster, the folding twin TOW launcher on its left side, smoke
// dischargers, the commander's hatch with its vision blocks, the bustle rack. Blue ID panels. See render/RigRenderer.js.
import * as THREE from 'three';
import { P, merge, pair, grime } from '../units/geometry.js';
import { stationHull, runningGear, roadWheelGeometry, spinningWheels, distanceDriven, groundTilt, meshAdder } from './vehicleCommon.js';

const GREEN = 0x4b5a35;
const DARK = 0x33382a;
const STEEL = 0x2d2f2a;
const GLASS = 0x1a1d1c;
const C = { camo: 1 };

let GEO = null;
function geometry() {
  if (GEO) return GEO;
  const gear = runningGear({ halfWidth: 1.35, length: 4.6, wheels: 6, wheelR: 0.32, sprocket: 1, rollers: 3, trackWidth: 0.53 });
  const skirts = [];
  for (let i = 0; i < 5; i++) skirts.push(...pair((s) => P.box(0.06, 0.5, 1.12, { x: s * 1.72, y: 0.9, z: -2.3 + i * 1.15, color: GREEN, ...C })));
  GEO = {
    gear,
    wheel: roadWheelGeometry(0.32, 0.46),
    hull: grime(merge([
      ...gear.parts,
      // the hull from its sections: lower hull between the tracks, the tall sides over them with
      // the upper edge chamfered in, the long upper glacis and the short lower one
      stationHull([
        [-3.22, [[0, 0.5], [1.2, 0.5], [1.2, 1.15], [1.68, 1.15], [1.68, 1.72], [1.48, 1.96], [0, 1.96]]],
        [1.5, [[0, 0.45], [1.2, 0.45], [1.2, 1.15], [1.68, 1.15], [1.68, 1.76], [1.48, 2.02], [0, 2.02]]],
        [2.7, [[0, 0.45], [1.2, 0.45], [1.2, 1.15], [1.68, 1.15], [1.68, 1.52], [1.5, 1.6], [0, 1.6]]],
        [3.1, [[0, 0.75], [1.2, 0.75], [1.2, 1.15], [1.64, 1.15], [1.64, 1.38], [1.48, 1.44], [0, 1.45]]],
        [3.22, [[0, 1.0], [1.16, 1.0], [1.16, 1.15], [1.58, 1.15], [1.58, 1.3], [1.45, 1.35], [0, 1.36]]],
      ], { color: GREEN, ...C }),
      // firing ports on the sides, the engine exhaust grille front right, fender edges, tow cable
      ...[-2.3, -1.2].flatMap((z) => pair((s) => P.cyl(0.08, 0.09, 0.08, { x: s * 1.7, y: 1.45, z, rz: Math.PI / 2, color: DARK }, 10))),
      P.box(0.05, 0.35, 0.7, { x: 1.71, y: 1.5, z: 1.9, color: STEEL }),
      ...[1.65, 1.8, 1.95, 2.1].map((z) => P.box(0.03, 0.3, 0.04, { x: 1.735, y: 1.5, z, color: DARK })),
      ...pair((s) => P.box(0.06, 0.05, 6.3, { x: s * 1.7, y: 1.16, z: 0.0, color: DARK })),
      P.cyl(0.025, 0.025, 3.6, { x: -1.69, y: 1.62, z: -0.6, rx: Math.PI / 2, color: STEEL }, 6),
      ...skirts,
      P.box(1.7, 1.25, 0.08, { y: 1.25, z: -3.22, color: DARK }),                              // troop ramp
      P.box(0.6, 0.06, 0.6, { x: -0.8, y: 2.03, z: -1.8, color: DARK }),                       // cargo hatch
      P.cyl(0.3, 0.3, 0.1, { x: -0.6, y: 2.05, z: 1.3, color: DARK }, 12),                      // driver's hatch
      ...pair((s) => P.box(0.26, 0.12, 0.12, { x: s * 1.2, y: 1.6, z: 2.95, color: STEEL })),   // headlights
      P.box(2.8, 0.08, 0.6, { y: 1.35, z: 3.0, rx: 0.8, color: DARK }),                        // trim vane
    ]), 1.3, 0.35),
    turret: grime(merge([
      // faceted turret: sides raked in, the front cheeks angled to the mantlet
      stationHull([
        [0.0, [[0, -1.0], [0.9, -1.0], [1.05, -0.65], [1.05, 0.45], [0.85, 1.15], [0, 1.15]]],
        [0.62, [[0, -0.9], [0.8, -0.9], [0.93, -0.58], [0.93, 0.38], [0.72, 0.96], [0, 1.0]]],
      ], { color: GREEN, ...C }, 'y'),
      // bustle rack with stowage, vision blocks round the commander, sight glass
      P.box(1.7, 0.05, 0.05, { y: 0.55, z: -1.32, color: STEEL }),
      ...[-0.8, 0, 0.8].map((x) => P.box(0.04, 0.4, 0.35, { x, y: 0.35, z: -1.15, color: STEEL })),
      P.box(1.3, 0.3, 0.3, { y: 0.3, z: -1.2, color: 0x4d5236 }),
      ...[0, 1, 2, 3, 4].map((k) => P.box(0.1, 0.07, 0.03, { x: 0.45 + Math.sin(k * 0.6 - 1.2) * 0.34, y: 0.78, z: -0.35 + Math.cos(k * 0.6 - 1.2) * 0.34, ry: k * 0.6 - 1.2, color: GLASS })),
      P.box(0.26, 0.18, 0.02, { x: -0.45, y: 0.78, z: 0.71, color: GLASS }),
      P.box(0.55, 0.45, 1.15, { x: -1.35, y: 0.45, z: -0.15, color: GREEN, ...C }),             // twin TOW launcher
      P.box(0.12, 0.25, 0.6, { x: -1.05, y: 0.35, z: -0.15, color: DARK }),                     // its folding arm
      ...[-0.6, 0.3].map((z) => P.box(0.57, 0.03, 0.05, { x: -1.35, y: 0.68, z, color: DARK })), // straps
      ...pair((s) => P.cyl(0.08, 0.08, 0.1, { x: -1.35 + s * 0.13, y: 0.45, z: 0.45, rx: Math.PI / 2, color: 0x1a1c19 }, 10)),
      P.cyl(0.32, 0.34, 0.2, { x: 0.45, y: 0.72, z: -0.35, color: GREEN, ...C }, 12),            // commander's hatch
      P.box(0.35, 0.3, 0.3, { x: -0.45, y: 0.75, z: 0.55, color: DARK }),                       // sight head
      ...pair((s) => merge([0, 1, 2, 3].map((k) => P.cyl(0.05, 0.05, 0.22, { x: s * (0.95 - k * 0.07), y: 0.5, z: 1.0, rx: -1.0, rz: s * 0.3, color: DARK }, 8)))), // smoke dischargers
      P.box(0.5, 0.42, 0.3, { y: 0.32, z: 1.22, color: GREEN, ...C }),                         // mantlet
    ]), 0.6, 0.0, 0.3),
    gun: merge([
      P.cyl(0.045, 0.055, 2.3, { z: 1.15, rx: Math.PI / 2, color: STEEL }, 10),               // M242 Bushmaster
      P.cyl(0.07, 0.07, 0.18, { z: 2.25, rx: Math.PI / 2, color: STEEL }, 10),
      P.box(0.22, 0.2, 0.5, { z: 0.15, color: DARK }),
    ]),
    marks: merge([...pair((s) => P.box(0.02, 0.24, 0.5, { x: s * 1.67, y: 1.75, z: -0.4 }))]),
  };
  return GEO;
}

export function buildNatoBradley(mats) {
  const g = geometry();
  const root = new THREE.Group();
  const hull = new THREE.Group();
  root.add(hull);
  meshAdder(hull)(g.hull, mats.body);
  meshAdder(hull)(g.marks, mats.glow, false);
  const wheels = spinningWheels(hull, g.wheel, g.gear.wheels, g.gear.wheelR, mats.body);
  const turret = new THREE.Group();
  turret.position.set(0.35, 2.02, 0.3);
  hull.add(turret);
  meshAdder(turret)(g.turret, mats.body);
  const gun = new THREE.Group();
  gun.position.set(0, 0.32, 1.3);
  turret.add(gun);
  meshAdder(gun)(g.gun, mats.body);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, 2.35);
  gun.add(muzzle);

  const st = {};
  return {
    root,
    muzzle,
    animate(u, dt, t, ctx) {
      groundTilt(st, u, ctx, dt);
      hull.rotation.set(st.pitch - u.recoil * 0.01, 0, st.roll);
      hull.position.y = Math.sin(u.walkPhase * 2.2) * 0.02 * u.gait;
      turret.rotation.y = u.turretYaw - u.yaw;
      gun.rotation.x = -(u.gunPitch ?? 0.03);
      gun.position.z = 1.3 - u.recoil * 0.08;
      wheels.update(distanceDriven(u));
    },
    die(time) {
      turret.rotation.z = Math.min(0.15, time * 0.3);
      gun.rotation.x = Math.min(0.3, time * 0.4);
    },
  };
}
