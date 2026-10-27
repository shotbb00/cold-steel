// M109 self-propelled howitzer in MERDC woodland camouflage: the aluminium hull extruded from
// its outline, with sponsons over the tracks, front sprocket and no return rollers; the big
// slab-sided turret with its rear bustle door, commander's cupola and .50 cal, side hatches and
// stowage; the long 155 mm barrel with fume extractor and muzzle brake, raised to firing
// elevation. Seven road wheels a side that turn as it drives. See render/RigRenderer.js.
import * as THREE from 'three';
import { P, merge, pair, grime } from '../units/geometry.js';
import { trackedHull, planProfile, runningGear, roadWheelGeometry, spinningWheels, distanceDriven, groundTilt, meshAdder } from './vehicleCommon.js';

const GREEN = 0x4b5a35;
const DARK = 0x33382a;
const STEEL = 0x2d2f2a;
const C = { camo: 1 };
const ELEVATION = 0.96; // ~55°, matches the firing solution in UnitStack.lob

let GEO = null;
function geometry() {
  if (GEO) return GEO;
  const gear = runningGear({ halfWidth: 1.42, length: 5.0, wheels: 7, wheelR: 0.32, sprocket: 1, rollers: 0, trackWidth: 0.4 });
  GEO = {
    gear,
    wheel: roadWheelGeometry(0.32, 0.38),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-3.1, 1.48, 0.5], [-2.8, 1.5, 0.45], [1.9, 1.55, 0.45], [2.75, 1.22, 0.5], [3.1, 1.05, 0.82]],
        { belly: 1.2, fender: 1.6, fenderY: 0.98 }, { color: GREEN, ...C }),
      ...pair((s) => P.box(0.05, 0.05, 6.1, { x: s * 1.6, y: 0.98, z: 0.0, color: DARK })),              // fender lips
      P.box(1.0, 0.05, 0.8, { x: 0.6, y: 1.5, z: 2.1, rx: -0.38, color: DARK }),            // driver's hatch
      P.box(2.6, 0.4, 0.06, { y: 1.15, z: -3.12, color: DARK }),                           // rear door
      ...pair((s) => P.box(0.3, 0.12, 0.12, { x: s * 1.2, y: 1.2, z: 3.0, color: STEEL })),  // headlights
      ...pair((s) => P.box(0.08, 0.9, 0.08, { x: s * 0.4, y: 1.7, z: 2.5, rx: 0.5, color: STEEL })), // travel lock A-frame, lowered
    ]), 1.25, 0.3),
    turret: grime(merge([
      planProfile([[-1.4, 1.95], [1.4, 1.95], [1.5, 1.4], [1.5, -2.2], [-1.5, -2.2], [-1.5, 1.4]], 1.15, { color: GREEN, ...C }),
      planProfile([[-1.25, 1.65], [1.25, 1.65], [1.35, 1.2], [1.35, -2.05], [-1.35, -2.05], [-1.35, 1.2]], 0.2, { y: 1.12, color: GREEN, ...C }),
      P.box(1.0, 0.8, 0.08, { y: 0.6, z: -2.22, color: DARK }),                             // bustle door
      ...pair((s) => P.box(0.06, 0.7, 0.8, { x: s * 1.52, y: 0.6, z: -0.6, color: DARK })), // side hatches
      P.cyl(0.36, 0.4, 0.3, { x: 0.85, y: 1.45, z: -0.2, color: GREEN, ...C }, 14),          // cupola
      P.box(0.1, 0.12, 0.35, { x: 0.85, y: 1.66, z: 0.1, color: STEEL }),
      P.cyl(0.022, 0.022, 0.9, { x: 0.85, y: 1.68, z: 0.6, rx: Math.PI / 2, color: STEEL }, 6),
      P.box(0.5, 0.4, 0.9, { x: -1.6, y: 0.7, z: -1.3, color: 0x4d5236 }),                 // stowage
      P.box(0.9, 0.7, 0.45, { y: 0.55, z: 1.95, color: GREEN, ...C }),                     // gun shield
    ]), 0.9, 0.0, 0.3),
    marks: merge([...pair((s) => P.box(0.02, 0.26, 0.55, { x: s * 1.51, y: 0.95, z: 0.4 }))]),
    barrel: merge([
      P.cyl(0.12, 0.16, 5.2, { z: 2.6, rx: Math.PI / 2, color: GREEN, ...C }, 14),
      P.cyl(0.19, 0.19, 0.65, { z: 2.3, rx: Math.PI / 2, color: GREEN, ...C }, 14),          // fume extractor
      P.box(0.44, 0.3, 0.55, { z: 5.2, color: STEEL }),                                       // muzzle brake
      ...pair((s) => P.box(0.06, 0.24, 0.32, { x: s * 0.25, z: 5.2, color: STEEL })),
      P.cyl(0.2, 0.2, 0.6, { z: 0.25, rx: Math.PI / 2, color: DARK }, 14),                   // recoil housing
    ]),
  };
  return GEO;
}

export function buildNatoM109(mats) {
  const g = geometry();
  const root = new THREE.Group();
  const hull = new THREE.Group();
  root.add(hull);
  meshAdder(hull)(g.hull, mats.body);
  const wheels = spinningWheels(hull, g.wheel, g.gear.wheels, g.gear.wheelR, mats.body);
  const turret = new THREE.Group();
  turret.position.set(0, 1.53, -0.7);
  hull.add(turret);
  const addT = meshAdder(turret);
  addT(g.turret, mats.body);
  addT(g.marks, mats.glow, false);
  const barrel = new THREE.Group();
  barrel.position.set(0, 0.62, 1.95);
  barrel.rotation.x = -ELEVATION;
  turret.add(barrel);
  meshAdder(barrel)(g.barrel, mats.body);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, 5.5);
  barrel.add(muzzle);

  const st = {};
  return {
    root,
    muzzle,
    animate(u, dt, t, ctx) {
      groundTilt(st, u, ctx, dt, 3);
      hull.rotation.set(st.pitch - u.recoil * 0.04, 0, st.roll);
      turret.rotation.y = u.turretYaw - u.yaw;
      barrel.position.z = 1.95 - u.recoil * 0.6;
      wheels.update(distanceDriven(u));
    },
    die(time) {
      barrel.rotation.x = -ELEVATION + Math.min(0.8, time * 0.6);
      turret.rotation.z = Math.min(0.15, time * 0.3);
    },
  };
}
