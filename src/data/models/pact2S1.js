// 2S1 Gvozdika self-propelled howitzer: the low amphibious hull extruded from its boat-like
// outline, seven small road wheels a side (no return rollers, front sprocket) that turn as it
// drives, trim vane folded on the bow, the compact turned turret set well back with its
// cupola and hatches, and the 122 mm barrel with double-baffle muzzle brake raised to firing
// elevation. Red stars on the turret. See render/RigRenderer.js.
import * as THREE from 'three';
import { P, part, merge, pair, grime } from '../units/geometry.js';
import { trackedHull, runningGear, roadWheelGeometry, spinningWheels, distanceDriven, groundTilt, meshAdder } from './vehicleCommon.js';

const GREEN = 0x4a5634;
const GREEN_DK = 0x3a4428;
const STEEL = 0x2b2d28;
const ELEVATION = 0.96;

function turretDome() {
  const pts = [[0, 0], [1.18, 0], [1.2, 0.32], [1.02, 0.72], [0.58, 0.93], [0, 0.97]].map(([r, y]) => new THREE.Vector2(r, y));
  return part(new THREE.LatheGeometry(pts, 26), { sz: 1.15, color: GREEN });
}

let GEO = null;
function geometry() {
  if (GEO) return GEO;
  const gear = runningGear({ halfWidth: 1.33, length: 4.9, wheels: 7, wheelR: 0.29, sprocket: 1, rollers: 0, trackWidth: 0.4, wheelColor: GREEN_DK });
  GEO = {
    gear,
    wheel: roadWheelGeometry(0.29, 0.34, GREEN_DK),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-3.25, 1.25, 0.5], [-2.9, 1.3, 0.45], [1.6, 1.36, 0.45], [2.9, 1.02, 0.5], [3.3, 0.98, 0.72]],
        { belly: 1.1, fender: 1.55, fenderY: 0.92 }, { color: GREEN }),
      ...pair((s) => P.box(0.05, 0.05, 6.4, { x: s * 1.55, y: 0.92, z: 0.0, color: GREEN_DK })),        // fender lips
      P.box(2.0, 0.06, 0.55, { y: 1.07, z: 3.08, rx: 0.25, color: GREEN_DK }),              // trim vane, folded
      ...pair((s) => P.box(0.35, 0.28, 1.4, { x: s * 1.15, y: 1.42, z: 0.2, color: GREEN_DK })), // stowage bins
      P.box(0.5, 0.08, 0.45, { x: -0.5, y: 1.4, z: 1.7, color: GREEN_DK }),                 // driver's hatch
      ...pair((s) => P.box(0.25, 0.12, 0.12, { x: s * 1.0, y: 1.08, z: 3.15, color: STEEL })), // headlights
    ]), 1.2, 0.3),
    turret: grime(merge([
      turretDome(),
      P.cyl(0.3, 0.32, 0.25, { x: -0.5, y: 1.05, z: -0.35, color: GREEN }, 12),            // cupola
      P.cyl(0.28, 0.28, 0.05, { x: 0.45, y: 0.95, z: -0.3, color: GREEN_DK }, 12),
      P.box(0.65, 0.6, 0.38, { y: 0.48, z: 1.38, color: GREEN }),                           // mantlet
      P.box(0.45, 0.3, 0.6, { x: 0.9, y: 0.45, z: -0.9, ry: -0.4, color: GREEN_DK }),
    ]), 0.8, 0.0, 0.4),
    marks: merge([...pair((s) => P.cyl(0.16, 0.16, 0.02, { x: s * 1.19, y: 0.5, z: -0.3, rz: Math.PI / 2 }, 5))]),
    barrel: merge([
      P.cyl(0.09, 0.12, 3.9, { z: 1.95, rx: Math.PI / 2, color: GREEN }, 14),
      P.cyl(0.15, 0.15, 0.45, { z: 2.0, rx: Math.PI / 2, color: GREEN_DK }, 14),            // fume extractor
      P.box(0.3, 0.25, 0.18, { z: 3.85, color: STEEL }),                                     // double-baffle muzzle brake
      P.box(0.3, 0.25, 0.18, { z: 4.08, color: STEEL }),
      P.box(0.12, 0.14, 0.4, { z: 3.96, color: STEEL }),
    ]),
  };
  return GEO;
}

export function buildPact2S1(mats) {
  const g = geometry();
  const root = new THREE.Group();
  const hull = new THREE.Group();
  root.add(hull);
  meshAdder(hull)(g.hull, mats.body);
  const wheels = spinningWheels(hull, g.wheel, g.gear.wheels, g.gear.wheelR, mats.body);
  const turret = new THREE.Group();
  turret.position.set(0, 1.32, -1.3);
  hull.add(turret);
  const addT = meshAdder(turret);
  addT(g.turret, mats.body);
  addT(g.marks, mats.glow, false);
  const barrel = new THREE.Group();
  barrel.position.set(0, 0.5, 1.5);
  barrel.rotation.x = -ELEVATION;
  turret.add(barrel);
  meshAdder(barrel)(g.barrel, mats.body);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, 4.2);
  barrel.add(muzzle);

  const st = {};
  return {
    root,
    muzzle,
    animate(u, dt, t, ctx) {
      groundTilt(st, u, ctx, dt, 3);
      hull.rotation.set(st.pitch - u.recoil * 0.04, 0, st.roll);
      turret.rotation.y = u.turretYaw - u.yaw;
      barrel.position.z = 1.5 - u.recoil * 0.5;
      wheels.update(distanceDriven(u));
    },
    die(time) {
      barrel.rotation.x = -ELEVATION + Math.min(0.7, time * 0.6);
    },
  };
}
