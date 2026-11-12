// ZSU-23-4 Shilka self-propelled anti-aircraft gun in Soviet green: the low hull extruded from
// its outline on six road wheels a side that turn as it drives (rear sprocket, no return
// rollers), the big flat slab-sided turret with its four 23 mm 2A7 cannons in two stacked
// pairs, the "Gun Dish" radar on its mast at the rear (turning while it searches), and side
// boxes. Gun elevation follows u.gunPitch. Red stars. See render/RigRenderer.js.
import * as THREE from 'three';
import { P, merge, pair, grime } from '../units/geometry.js';
import { trackedHull, planProfile, runningGear, roadWheelGeometry, spinningWheels, distanceDriven, groundTilt, meshAdder } from './vehicleCommon.js';

const GREEN = 0x4a5634;
const GREEN_DK = 0x3a4428;
const STEEL = 0x2b2d28;
const GLASS = 0x1a1d1c;

let GEO = null;
function geometry() {
  if (GEO) return GEO;
  const gear = runningGear({ halfWidth: 1.3, length: 4.8, wheels: 6, wheelR: 0.32, sprocket: -1, rollers: 0, trackWidth: 0.36, wheelColor: GREEN_DK });
  GEO = {
    gear,
    wheel: roadWheelGeometry(0.32, 0.32, GREEN_DK),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-3.25, 1.3, 0.5], [-2.9, 1.33, 0.42], [2.4, 1.38, 0.42], [3.1, 1.02, 0.5], [3.3, 0.98, 0.72]],
        { belly: 1.1, fender: 1.5, fenderY: 0.92 }, { color: GREEN }),
      ...pair((s) => P.box(0.05, 0.05, 6.4, { x: s * 1.5, y: 0.92, z: 0.0, color: GREEN_DK })),         // fender lips
      P.box(3.1, 0.06, 6.2, { y: 1.02, z: -0.2, color: GREEN }),                                // fenders
      ...pair((s) => P.box(0.4, 0.3, 1.6, { x: s * 1.35, y: 1.2, z: -1.6, color: GREEN_DK })), // fender boxes
      P.box(0.5, 0.08, 0.45, { x: -0.6, y: 1.4, z: 2.2, color: GREEN_DK }),                    // driver's hatch
      ...[-0.15, 0, 0.15].map((x) => P.box(0.1, 0.07, 0.05, { x: -0.6 + x, y: 1.45, z: 2.46, rx: -0.3, color: GLASS })), // his periscopes
      ...pair((s) => P.box(0.22, 0.12, 0.12, { x: s * 1.1, y: 1.05, z: 3.15, color: STEEL })),
      ...pair((s) => P.cyl(0.08, 0.08, 0.12, { x: s * 1.0, y: 1.25, z: 3.05, rx: Math.PI / 2 - 0.5, color: STEEL }, 10)), // headlights…
      ...pair((s) => P.cyl(0.065, 0.065, 0.02, { x: s * 1.0, y: 1.28, z: 3.11, rx: Math.PI / 2 - 0.5, color: 0x9a9a88 }, 10)),
      P.cyl(0.1, 0.1, 0.14, { x: -1.0, y: 1.42, z: 2.75, rx: Math.PI / 2, color: STEEL }, 10),    // …and the IR light
      // the engine deck at the rear: its grilles, the exhaust louvres on the left, the tow cable down the side
      ...Array.from({ length: 6 }, (_, k) => P.box(2.0, 0.03, 0.08, { y: 1.35, z: -2.95 + k * 0.18, color: GREEN_DK })),
      P.box(0.05, 0.3, 0.9, { x: -1.5, y: 1.15, z: -2.6, color: STEEL }),
      ...[-2.9, -2.75, -2.6, -2.45, -2.3].map((z) => P.box(0.06, 0.26, 0.04, { x: -1.52, y: 1.15, z, color: 0x141414 })),
      P.cyl(0.04, 0.04, 4.2, { x: 1.38, y: 1.3, z: 0.2, rx: Math.PI / 2, color: STEEL }, 6),
      ...pair((s) => P.box(0.14, 0.12, 0.08, { x: s * 1.0, y: 1.1, z: -3.28, color: 0x5a1a14 })),   // rear lights
    ]), 1.2, 0.3),
    turret: grime(merge([
      planProfile([[-1.35, 1.55], [1.35, 1.55], [1.55, 1.0], [1.55, -1.75], [-1.55, -1.75], [-1.55, 1.0]], 0.95, { color: GREEN }),
      ...pair((s) => P.box(0.12, 0.6, 1.5, { x: s * 1.6, y: 0.5, z: -0.6, color: GREEN_DK })),  // side equipment boxes
      P.cyl(0.3, 0.3, 0.2, { x: 0.7, y: 1.05, z: 0.2, color: GREEN_DK }, 12),                   // commander's hatch
      P.box(0.3, 0.9, 0.3, { y: 1.35, z: -1.45, color: GREEN_DK }),                             // radar mast
      P.box(1.4, 0.5, 0.35, { y: 0.55, z: 1.65, color: GREEN }),                                // gun mantlet
      // the flat sides: their ventilation louvres, the access doors and their hinges, the grab rails
      ...pair((s) => [0, 1, 2, 3, 4].map((k) => P.box(0.04, 0.06, 0.7, { x: s * 1.565, y: 0.62 + k * 0.08, z: 0.55, color: 0x141414 }))).flat(),
      ...pair((s) => P.box(0.03, 0.6, 0.8, { x: s * 1.56, y: 0.45, z: -0.5, color: GREEN_DK })),
      ...pair((s) => [-0.85, -0.15].map((z) => P.box(0.05, 0.1, 0.06, { x: s * 1.58, y: 0.7, z, color: STEEL }))).flat(),
      ...pair((s) => P.box(0.05, 0.05, 1.6, { x: s * 1.4, y: 1.0, z: -0.2, color: STEEL })),
      // the commander's and gunner's hatches with their vision blocks, the sight head
      ...[0, 1, 2, 3].map((k) => P.box(0.1, 0.07, 0.04, { x: 0.7 + Math.sin(k * 0.8 - 1.2) * 0.32, y: 1.12, z: 0.2 + Math.cos(k * 0.8 - 1.2) * 0.32, ry: k * 0.8 - 1.2, color: GLASS })),
      P.cyl(0.28, 0.28, 0.06, { x: -0.6, y: 0.98, z: 0.3, color: GREEN_DK }, 12),
      P.box(0.3, 0.26, 0.3, { x: -0.6, y: 1.08, z: 0.85, color: GREEN_DK }),
      P.box(0.22, 0.12, 0.02, { x: -0.6, y: 1.1, z: 1.0, color: GLASS }),
      P.cyl(0.006, 0.006, 2.2, { x: -1.2, y: 2.05, z: -1.5, color: STEEL }, 4),                  // the radio whip
    ]), 0.7, 0.0, 0.4),
    gun: merge([
      ...[[-0.32, 0], [0.32, 0], [-0.32, 0.25], [0.32, 0.25]].map(([x, y]) => P.cyl(0.035, 0.04, 2.1, { x, y, z: 1.05, rx: Math.PI / 2, color: STEEL }, 8)),
      ...[[-0.32, 0], [0.32, 0], [-0.32, 0.25], [0.32, 0.25]].map(([x, y]) => P.cyl(0.055, 0.055, 0.16, { x, y, z: 2.05, rx: Math.PI / 2, color: STEEL }, 8)), // flash hiders
      ...pair((s) => P.box(0.18, 0.45, 0.9, { x: s * 0.32, y: 0.12, z: 0.15, color: GREEN_DK })),  // gun cradles
    ]),
    radar: merge([
      P.cyl(0.62, 0.62, 0.08, { z: 0.08, rx: Math.PI / 2 + 0.2, color: 0x56604a }, 18),          // the "Gun Dish"
      P.box(0.2, 0.2, 0.25, { color: STEEL }),
    ]),
    marks: merge([...pair((s) => P.cyl(0.16, 0.16, 0.02, { x: s * 1.57, y: 0.55, z: 0.3, rz: Math.PI / 2 }, 5))]),
  };
  return GEO;
}

export function buildPactShilka(mats) {
  const g = geometry();
  const root = new THREE.Group();
  const hull = new THREE.Group();
  root.add(hull);
  meshAdder(hull)(g.hull, mats.body);
  const wheels = spinningWheels(hull, g.wheel, g.gear.wheels, g.gear.wheelR, mats.body);
  const turret = new THREE.Group();
  turret.position.set(0, 1.38, -0.2);
  hull.add(turret);
  meshAdder(turret)(g.turret, mats.body);
  meshAdder(turret)(g.marks, mats.glow, false);
  const gun = new THREE.Group();
  gun.position.set(0, 0.5, 1.7);
  turret.add(gun);
  meshAdder(gun)(g.gun, mats.body);
  const radar = new THREE.Group();
  radar.position.set(0, 1.85, -1.45);
  turret.add(radar);
  meshAdder(radar)(g.radar, mats.body);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.12, 2.15);
  gun.add(muzzle);

  const st = {};
  return {
    root,
    muzzle,
    animate(u, dt, t, ctx) {
      groundTilt(st, u, ctx, dt);
      hull.rotation.set(st.pitch, 0, st.roll);
      turret.rotation.y = u.turretYaw - u.yaw;
      gun.rotation.x = -(u.gunPitch ?? 0.05);
      gun.position.z = 1.7 - Math.abs(Math.sin(t * 50)) * 0.06 * u.recoil; // cannons cycling
      radar.rotation.y = u.airTarget ? 0 : radar.rotation.y + dt * 2.2;
      wheels.update(distanceDriven(u));
    },
    die(time) {
      gun.rotation.x = Math.min(0.35, time * 0.5);
      radar.rotation.z = Math.min(0.8, time * 0.6);
    },
  };
}
