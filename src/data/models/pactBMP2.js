// BMP-2 infantry fighting vehicle in Soviet green. The hull is built from its cross-sections
// (vehicleCommon.js stationHull): the knife-edge nose and long ribbed upper glacis, fenders over
// the tracks and upper sides sloping in to the roof, the flat roof over the troop compartment
// with its four angled hatches, firing ports with their periscopes along both sides, and the
// two bulged rear doors (fuel tanks inside them). Driver's hatch and periscopes front left,
// engine louvres front right with the exhaust on the right side, trim vane folded on the
// glacis, headlights, tow hooks, fender stowage. Six road wheels a side that turn as it
// drives (front sprocket, three return rollers). The faceted two-man turret: 30 mm 2A42 cannon
// with its recoil sleeve and muzzle brake, coaxial PKT, the 9M113 Konkurs launcher on the
// roof, commander's and gunner's hatches, sights, IR searchlight, smoke dischargers, aerial.
// Red stars. See render/RigRenderer.js.
import * as THREE from 'three';
import { P, merge, pair, grime } from '../units/geometry.js';
import { stationHull, runningGear, roadWheelGeometry, spinningWheels, distanceDriven, groundTilt, meshAdder } from './vehicleCommon.js';

const GREEN = 0x4a5634;
const GREEN_DK = 0x3a4428;
const STEEL = 0x2b2d28;
const GLASS = 0x1a1d1c;

// the glacis runs from the roof's front edge (z 2.25, y 1.6) down to the nose (z 3.35, y 1.0)
const glacisY = (z) => 1.6 - ((z - 2.25) / 1.1) * 0.6;
const GLACIS = Math.atan2(0.6, 1.1);

let GEO = null;
function geometry() {
  if (GEO) return GEO;
  const gear = runningGear({ halfWidth: 1.25, length: 4.7, wheels: 6, wheelR: 0.3, sprocket: 1, rollers: 3, trackWidth: 0.36, wheelColor: GREEN_DK });
  const ribs = [];
  for (let i = 0; i < 6; i++) {
    const z = 2.45 + i * 0.15;
    ribs.push(P.box(2.4 - i * 0.06, 0.035, 0.05, { y: glacisY(z) + 0.02, z, rx: GLACIS, color: GREEN_DK }));
  }
  GEO = {
    gear,
    wheel: roadWheelGeometry(0.3, 0.32, GREEN_DK),
    hull: grime(merge([
      ...gear.parts,
      stationHull([
        [-3.36, [[0, 0.52], [1.0, 0.52], [1.0, 1.0], [1.48, 1.0], [1.27, 1.46], [0, 1.46]]],
        [-2.9, [[0, 0.45], [1.02, 0.45], [1.02, 1.0], [1.52, 1.0], [1.28, 1.52], [0, 1.52]]],
        [2.25, [[0, 0.45], [1.02, 0.45], [1.02, 1.0], [1.52, 1.0], [1.26, 1.58], [0, 1.6]]],
        [2.9, [[0, 0.47], [1.02, 0.47], [1.02, 0.98], [1.5, 0.98], [1.3, 1.25], [0, 1.25]]],
        [3.35, [[0, 0.64], [1.0, 0.64], [1.0, 0.93], [1.44, 0.93], [1.3, 1.0], [0, 1.0]]],
        [3.47, [[0, 0.76], [0.96, 0.76], [0.96, 0.86], [1.36, 0.86], [1.28, 0.9], [0, 0.9]]],
      ], { color: GREEN }),
      ...ribs,
      // trim vane folded on the lower glacis
      P.box(2.3, 0.04, 0.42, { y: glacisY(3.05) + 0.04, z: 3.05, rx: GLACIS, color: GREEN_DK }),
      // driver's hatch with periscopes, commander's station behind it (front left)
      P.box(0.5, 0.05, 0.5, { x: -0.62, y: 1.62, z: 1.75, color: GREEN_DK }),
      ...[-0.15, 0, 0.15].map((x) => P.box(0.1, 0.07, 0.04, { x: -0.62 + x, y: 1.64, z: 2.03, rx: 0.3, color: GLASS })),
      P.cyl(0.24, 0.26, 0.1, { x: -0.62, y: 1.63, z: 1.05, color: GREEN }, 12),
      // engine louvres front right, exhaust on the right side
      P.box(0.95, 0.03, 0.9, { x: 0.62, y: 1.6, z: 1.7, color: GREEN_DK }),
      ...[1.35, 1.5, 1.65, 1.8, 1.95, 2.1].map((z) => P.box(0.9, 0.025, 0.04, { x: 0.62, y: 1.625, z, color: STEEL })),
      P.box(0.06, 0.22, 0.5, { x: 1.4, y: 1.18, z: 1.6, rz: -0.47, color: STEEL }),
      // the four roof hatches over the troops, hinged, a little proud of the roof
      ...[-2.45, -1.55].flatMap((z) => pair((s) => P.box(0.68, 0.06, 0.75, { x: s * 0.42, y: 1.565, z, rz: s * -0.04, color: GREEN_DK }))),
      ...[-2.45, -1.55].flatMap((z) => pair((s) => P.box(0.05, 0.05, 0.3, { x: s * 0.72, y: 1.6, z, color: STEEL }))), // hinges
      // firing ports and their periscopes along both sloped sides
      ...[-2.6, -1.95, -1.3, -0.55].flatMap((z) => pair((s) => [
        P.cyl(0.07, 0.07, 0.05, { x: s * 1.41, y: 1.2, z, rz: s * (Math.PI / 2 - 0.47), color: GREEN_DK }, 10),
        P.box(0.08, 0.08, 0.14, { x: s * 1.2, y: 1.55, z: z + 0.2, color: GLASS }),
      ]).flat()),
      // the two rear doors, bulged with the fuel tanks, and their handles
      ...pair((s) => P.box(0.72, 0.84, 0.16, { x: s * 0.42, y: 0.98, z: -3.42, color: GREEN })),
      ...pair((s) => P.box(0.04, 0.2, 0.05, { x: s * 0.2, y: 1.0, z: -3.52, color: STEEL })),
      // headlights and the IR light, tow hooks, fender stowage, tow cable
      ...pair((s) => P.cyl(0.08, 0.08, 0.08, { x: s * 1.1, y: 1.08, z: 3.18, rx: Math.PI / 2 - GLACIS, color: STEEL }, 10)),
      ...pair((s) => P.cyl(0.06, 0.06, 0.02, { x: s * 1.1, y: 1.09, z: 3.22, rx: Math.PI / 2 - GLACIS, color: GLASS }, 10)),
      P.cyl(0.09, 0.09, 0.1, { x: -1.25, y: 1.1, z: 3.12, rx: Math.PI / 2 - GLACIS, color: 0x2a2232 }, 10),
      ...pair((s) => P.box(0.1, 0.1, 0.12, { x: s * 0.7, y: 0.8, z: 3.44, color: STEEL })),
      ...pair((s) => P.box(0.4, 0.3, 0.9, { x: s * 1.3, y: 1.15, z: -2.75, color: GREEN_DK })),
      P.cyl(0.025, 0.025, 4.2, { x: -1.36, y: 1.03, z: -0.4, rx: Math.PI / 2, color: STEEL }, 6),
      // fender edges
      ...pair((s) => P.box(0.04, 0.12, 6.2, { x: s * 1.52, y: 0.95, z: 0.1, color: GREEN_DK })),
    ]), 1.25, 0.3),
    turret: grime(merge([
      // faceted turret: sides raked in, a sloped front, the ring skirt below
      stationHull([
        [0.0, [[0, -0.95], [0.66, -0.95], [1.02, -0.4], [1.05, 0.5], [0.7, 1.05], [0, 1.12]]],
        [0.36, [[0, -0.92], [0.62, -0.92], [0.95, -0.37], [0.98, 0.46], [0.64, 0.97], [0, 1.04]]],
        [0.62, [[0, -0.76], [0.5, -0.76], [0.76, -0.31], [0.78, 0.36], [0.5, 0.73], [0, 0.8]]],
      ], { color: GREEN }, 'y'),
      P.cyl(0.95, 0.97, 0.08, { y: -0.03, color: GREEN_DK }, 20),
      // commander's (left) and gunner's (right) hatches
      P.cyl(0.26, 0.28, 0.08, { x: -0.32, y: 0.65, z: -0.15, color: GREEN }, 14),
      P.cyl(0.24, 0.26, 0.07, { x: 0.32, y: 0.65, z: -0.2, color: GREEN }, 14),
      ...[0, 1, 2, 3].map((k) => P.box(0.08, 0.06, 0.04, { x: -0.32 + Math.sin(k * 0.5 - 0.75) * 0.26, y: 0.69, z: -0.15 + Math.cos(k * 0.5 - 0.75) * 0.26, ry: k * 0.5 - 0.75, color: GLASS })),
      // gunner's sight and the commander's IR searchlight
      P.box(0.2, 0.22, 0.22, { x: 0.32, y: 0.71, z: 0.3, color: GREEN }),
      P.box(0.16, 0.12, 0.02, { x: 0.32, y: 0.74, z: 0.42, color: GLASS }),
      P.cyl(0.1, 0.1, 0.14, { x: -0.55, y: 0.68, z: 0.4, rx: Math.PI / 2, color: STEEL }, 12),
      P.cyl(0.085, 0.085, 0.02, { x: -0.55, y: 0.68, z: 0.48, rx: Math.PI / 2, color: 0x2a2232 }, 12),
      // 9M113 Konkurs on its launch rail
      P.box(0.1, 0.16, 0.36, { x: 0.05, y: 0.72, z: 0.05, color: STEEL }),
      P.cyl(0.075, 0.075, 1.2, { x: 0.05, y: 0.88, z: 0.15, rx: Math.PI / 2, color: GREEN_DK }, 12),
      P.cyl(0.085, 0.085, 0.06, { x: 0.05, y: 0.88, z: 0.75, rx: Math.PI / 2, color: STEEL }, 12),
      P.cyl(0.085, 0.085, 0.06, { x: 0.05, y: 0.88, z: -0.45, rx: Math.PI / 2, color: STEEL }, 12),
      // smoke dischargers, three a side on the front corners; aerial at the rear
      ...pair((s) => merge([0, 1, 2].map((k) => P.cyl(0.045, 0.045, 0.22, { x: s * (0.88 - k * 0.1), y: 0.4 + k * 0.02, z: 0.68 - k * 0.05, rx: -0.9, rz: s * 0.35, color: STEEL }, 8)))),
      P.cyl(0.01, 0.01, 1.6, { x: -0.55, y: 1.3, z: -0.6, color: STEEL }, 4),
      // mantlet with the coaxial PKT beside the cannon
      P.box(0.52, 0.34, 0.24, { y: 0.3, z: 1.12, color: GREEN }),
      P.cyl(0.018, 0.018, 0.35, { x: 0.18, y: 0.26, z: 1.3, rx: Math.PI / 2, color: STEEL }, 6),
    ]), 0.5, 0.0, 0.4),
    gun: merge([
      P.cyl(0.07, 0.075, 0.75, { z: 0.4, rx: Math.PI / 2, color: GREEN_DK }, 12),         // recoil sleeve
      P.cyl(0.035, 0.042, 2.2, { z: 1.85, rx: Math.PI / 2, color: STEEL }, 10),            // 2A42 30 mm
      P.cyl(0.055, 0.055, 0.04, { z: 1.2, rx: Math.PI / 2, color: STEEL }, 10),            // barrel collar
      P.cyl(0.06, 0.055, 0.22, { z: 2.9, rx: Math.PI / 2, color: STEEL }, 10),             // muzzle brake
    ]),
    marks: merge([...pair((s) => P.cyl(0.13, 0.13, 0.02, { x: s * 1.03, y: 0.2, z: 0.0, rz: Math.PI / 2 }, 5))]),
  };
  return GEO;
}

export function buildPactBMP2(mats) {
  const g = geometry();
  const root = new THREE.Group();
  const hull = new THREE.Group();
  root.add(hull);
  meshAdder(hull)(g.hull, mats.body);
  const wheels = spinningWheels(hull, g.wheel, g.gear.wheels, g.gear.wheelR, mats.body);
  const turret = new THREE.Group();
  turret.position.set(0, 1.57, 0.4);
  hull.add(turret);
  meshAdder(turret)(g.turret, mats.body);
  meshAdder(turret)(g.marks, mats.glow, false);
  const gun = new THREE.Group();
  gun.position.set(0, 0.3, 1.2);
  turret.add(gun);
  meshAdder(gun)(g.gun, mats.body);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, 3.02);
  gun.add(muzzle);

  const st = {};
  return {
    root,
    muzzle,
    animate(u, dt, t, ctx) {
      groundTilt(st, u, ctx, dt);
      hull.rotation.set(st.pitch, 0, st.roll);
      hull.position.y = Math.sin(u.walkPhase * 2.2) * 0.02 * u.gait;
      turret.rotation.y = u.turretYaw - u.yaw;
      gun.rotation.x = -(u.gunPitch ?? 0.03);
      gun.position.z = 1.2 - u.recoil * 0.1;
      wheels.update(distanceDriven(u));
    },
    die(time) {
      turret.position.y = 1.57 + Math.min(0.4, time * 0.6);
      turret.rotation.z = Math.min(0.5, time * 0.6);
    },
  };
}
