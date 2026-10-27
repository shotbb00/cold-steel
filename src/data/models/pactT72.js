// T-72B in Soviet green with dust: hull extruded from its outline (steep V-glacis faced with
// Kontakt-1 reactive armour bricks), full-length rubber side skirts, two external fuel drums
// and the unditching log at the rear. The cast turret is turned (lathe) and stretched, with an
// arc of ERA bricks, the commander's cupola with NSVT 12.7 mm, the gunner's sight, the L-4 IR
// searchlight, snorkel and stowage boxes. 125 mm gun with thermal sleeve and fume extractor.
// Six big road wheels a side that turn as it drives, three return rollers, rear sprocket.
// Red stars on the turret. See render/RigRenderer.js for the contract.
import * as THREE from 'three';
import { P, part, merge, pair, grime } from '../units/geometry.js';
import { stationHull, runningGear, roadWheelGeometry, spinningWheels, distanceDriven, groundTilt, meshAdder } from './vehicleCommon.js';

const GREEN = 0x4a5634;
const GREEN_DK = 0x3a4428;
const ERA = 0x55603c;
const STEEL = 0x2b2d28;
const RUBBER = 0x1f201c;
const WOOD = 0x5a4632;
const GLASS = 0x1a1d1c;

/** The cast turret: a turned dome, stretched fore and aft. */
function turretDome() {
  const pts = [[0, 0.02], [1.5, 0.02], [1.58, 0.18], [1.46, 0.46], [1.12, 0.68], [0.6, 0.79], [0, 0.82]].map(([r, y]) => new THREE.Vector2(r, y));
  return part(new THREE.LatheGeometry(pts, 30), { sz: 1.13, z: 0.05, color: GREEN });
}

let GEO = null;
function geometry() {
  if (GEO) return GEO;
  const gear = runningGear({ halfWidth: 1.38, length: 4.9, wheels: 6, wheelR: 0.39, sprocket: -1, rollers: 3, trackWidth: 0.58, wheelColor: 0x3a4428 });
  // Kontakt-1 bricks on the upper glacis: (2.35, 1.42) → (3.45, 0.97)
  const glacis = [];
  const ga = Math.atan2(1.42 - 0.97, 3.45 - 2.35);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 7; col++) {
      const t = (row + 0.5) / 3;
      glacis.push(P.box(0.36, 0.09, 0.3, { x: -1.05 + col * 0.35, y: 1.42 - (1.42 - 0.97) * t + 0.05, z: 2.35 + 1.1 * t, rx: ga, color: ERA }));
    }
  }
  const era = [];
  for (let i = 0; i < 11; i++) {
    const a = -0.95 + (i / 10) * 1.9;
    if (Math.abs(a) < 0.16) continue; // the gun goes here
    for (const yy of [0.32, 0.56]) {
      if (yy > 0.5 && Math.abs(a) > 0.75) continue;
      era.push(P.box(0.36, 0.2, 0.26, { x: Math.sin(a) * 1.5, y: yy, z: Math.cos(a) * 1.62 + 0.1, ry: a, rx: yy > 0.5 ? -0.35 : 0, color: ERA }));
    }
  }
  const skirts = [];
  for (let i = 0; i < 6; i++) skirts.push(...pair((s) => P.box(0.04, 0.44, 1.08, { x: s * 1.72, y: 0.9, z: -2.9 + i * 1.1, rz: s * 0.05, color: RUBBER, surf: 'rubber' })));
  GEO = {
    gear,
    wheel: roadWheelGeometry(0.39, 0.5, 0x3a4428),
    hull: grime(merge([
      ...gear.parts,
      // the hull from its sections: lower hull between the tracks, the fender shelf over them, the
      // engine deck falling away to the rear plate, the long flat upper glacis down to the nose
      stationHull([
        [-3.38, [[0, 0.5], [1.12, 0.5], [1.12, 1.08], [1.74, 1.08], [1.74, 1.13], [1.15, 1.13], [1.1, 1.28], [0, 1.28]]],
        [-3.1, [[0, 0.45], [1.15, 0.45], [1.15, 1.08], [1.74, 1.08], [1.74, 1.13], [1.15, 1.13], [1.12, 1.36], [0, 1.37]]],
        [2.3, [[0, 0.45], [1.15, 0.45], [1.15, 1.08], [1.74, 1.08], [1.74, 1.13], [1.15, 1.13], [1.12, 1.4], [0, 1.42]]],
        [3.3, [[0, 0.6], [1.12, 0.6], [1.12, 1.0], [1.6, 1.0], [1.6, 1.04], [1.12, 1.04], [1.08, 1.02], [0, 1.02]]],
        [3.5, [[0, 0.8], [1.05, 0.8], [1.05, 0.9], [1.45, 0.9], [1.45, 0.94], [1.05, 0.94], [1.02, 0.94], [0, 0.94]]],
      ], { color: GREEN }),
      P.box(0.06, 0.05, 1.0, { y: 1.45, z: 2.85, rx: Math.atan2(0.4, 1.0), ry: 0.5, color: GREEN_DK }),  // the V splash rib
      P.box(0.06, 0.05, 1.0, { y: 1.45, z: 2.85, rx: Math.atan2(0.4, 1.0), ry: -0.5, color: GREEN_DK }),
      // engine deck louvres and the radiator grille
      P.box(1.9, 0.04, 1.3, { y: 1.38, z: -2.35, color: GREEN_DK }),
      ...[-2.9, -2.65, -2.4, -2.15, -1.9].map((z) => P.box(1.8, 0.03, 0.06, { y: 1.41, z, color: STEEL })),
      ...pair((s) => P.box(0.7, 0.05, 0.9, { x: s * 0.55, y: 1.39, z: -1.05, color: GREEN_DK })),          // engine access panels
      // headlights with their guards on the front fenders
      ...pair((s) => P.cyl(0.08, 0.08, 0.1, { x: s * 1.3, y: 1.18, z: 3.0, rx: Math.PI / 2, color: STEEL }, 10)),
      ...pair((s) => P.cyl(0.065, 0.065, 0.02, { x: s * 1.3, y: 1.18, z: 3.06, rx: Math.PI / 2, color: GLASS }, 10)),
      ...pair((s) => P.box(0.2, 0.18, 0.02, { x: s * 1.3, y: 1.2, z: 3.12, color: STEEL })),
      // driver's periscopes, tow cables along the hull sides
      ...[-0.12, 0.12].map((x) => P.box(0.12, 0.07, 0.04, { x, y: 1.46, z: 2.38, rx: 0.3, color: GLASS })),
      ...pair((s) => P.cyl(0.025, 0.025, 4.0, { x: s * 1.2, y: 1.2, z: -0.3, rx: Math.PI / 2, color: STEEL }, 6)),
      ...pair((s) => P.box(0.6, 0.06, 0.8, { x: s * 1.45, y: 1.0, z: 3.25, rx: 0.4, color: GREEN })), // front mudguards
      ...skirts,
      ...glacis,
      P.box(2.5, 0.12, 0.25, { y: 0.92, z: 3.4, color: GREEN_DK }),                           // dozer blade folded under the nose
      ...pair((s) => P.cyl(0.3, 0.3, 1.05, { x: s * 0.72, y: 1.7, z: -3.15, rz: Math.PI / 2, color: GREEN_DK }, 16)), // fuel drums…
      ...pair((s) => [-0.3, 0.3].map((d) => P.cyl(0.31, 0.31, 0.04, { x: s * 0.72 + d, y: 1.7, z: -3.15, rz: Math.PI / 2, color: GREEN_DK }, 16))).flat(), // …and their rolling hoops
      ...pair((s) => P.box(0.06, 0.5, 0.06, { x: s * 0.72, y: 1.45, z: -3.4, color: STEEL })),                      // drum brackets
      P.cyl(0.14, 0.14, 3.1, { y: 1.55, z: -3.6, rz: Math.PI / 2, color: WOOD }, 10),          // unditching log
      P.box(0.5, 0.25, 0.9, { x: -1.25, y: 1.25, z: -1.6, color: STEEL }),                    // exhaust on the left fender
      ...[0.5, 1.1, 1.7].map((z) => P.box(0.45, 0.32, 0.5, { x: 1.4, y: 1.3, z: -z, color: GREEN_DK })), // fender stowage
      P.box(0.5, 0.08, 0.45, { y: 1.44, z: 2.15, color: GREEN_DK }),                          // driver's hatch
    ]), 1.25, 0.3),
    turret: grime(merge([
      turretDome(),
      ...era,
      P.cyl(0.36, 0.4, 0.28, { x: 0.58, y: 0.92, z: -0.35, color: GREEN }, 14),                // commander's cupola (right)
      P.cyl(0.3, 0.3, 0.05, { x: 0.58, y: 1.08, z: -0.35, color: GREEN_DK }, 14),
      ...[0, 1, 2, 3, 4].map((k) => P.box(0.09, 0.06, 0.03, { x: 0.58 + Math.sin(k * 0.6 - 1.2) * 0.37, y: 1.0, z: -0.35 + Math.cos(k * 0.6 - 1.2) * 0.37, ry: k * 0.6 - 1.2, color: GLASS })), // cupola periscopes
      P.box(0.18, 0.12, 0.02, { x: -0.62, y: 1.0, z: 0.76, color: GLASS }),                  // gunner's sight window
      P.cyl(0.15, 0.15, 0.02, { x: 0.58, y: 0.62, z: 1.52, rx: Math.PI / 2, color: 0x2a2232 }, 14), // IR searchlight lens
      // 902A smoke grenade launchers, a bank either side of the mantlet
      ...pair((s) => merge([0, 1, 2, 3].map((k) => P.cyl(0.04, 0.04, 0.22, { x: s * (0.95 + k * 0.12), y: 0.7, z: 1.15 - k * 0.12, rx: -1.0, color: STEEL }, 8)))),
      P.box(0.12, 0.14, 0.4, { x: 0.58, y: 1.13, z: -0.15, color: STEEL }),                    // NSVT receiver
      P.cyl(0.025, 0.025, 1.0, { x: 0.58, y: 1.15, z: 0.45, rx: Math.PI / 2, color: STEEL }, 6),
      P.cyl(0.32, 0.32, 0.06, { x: -0.6, y: 0.83, z: -0.3, color: GREEN_DK }, 14),            // gunner's hatch
      P.box(0.3, 0.32, 0.4, { x: -0.62, y: 0.95, z: 0.55, color: GREEN_DK }),                 // gunner's sight
      P.cyl(0.18, 0.18, 0.32, { x: 0.58, y: 0.62, z: 1.35, rx: Math.PI / 2, color: STEEL }, 14), // L-4 searchlight
      P.cyl(0.08, 0.08, 1.9, { x: -0.95, y: 0.55, z: -1.7, rz: Math.PI / 2, ry: 0.3, color: GREEN_DK }, 8), // snorkel
      ...pair((s) => P.box(0.3, 0.32, 0.75, { x: s * 1.32, y: 0.32, z: -1.2, ry: -s * 0.35, color: GREEN_DK })), // turret stowage
      P.box(0.8, 0.5, 0.4, { y: 0.42, z: 1.7, color: GREEN }),                                // mantlet
      P.box(0.66, 0.4, 0.25, { y: 0.44, z: 1.95, color: 0x4d5236 }),                           // canvas mantlet cover
    ]), 0.9, 0.0, 0.4),
    marks: merge([
      ...pair((s) => P.cyl(0.18, 0.18, 0.02, { x: s * 1.52, y: 0.4, z: -0.45, rz: Math.PI / 2, ry: s * 0.25 }, 5)),
    ]),
    gun: merge([
      P.cyl(0.1, 0.13, 5.6, { z: 2.8, rx: Math.PI / 2, color: GREEN }, 14),
      ...[0.7, 1.4, 3.3, 4.1, 4.8].map((z) => P.cyl(0.15, 0.15, 0.6, { z, rx: Math.PI / 2, color: GREEN_DK }, 14)), // thermal sleeve
      ...[0.4, 1.05, 1.75, 3.0, 3.7, 4.45, 5.1].map((z) => P.cyl(0.158, 0.158, 0.05, { z, rx: Math.PI / 2, color: STEEL }, 14)), // straps
      P.cyl(0.18, 0.18, 0.55, { z: 2.35, rx: Math.PI / 2, color: GREEN }, 14),               // fume extractor
    ]),
  };
  return GEO;
}

export function buildPactT72(mats) {
  const g = geometry();
  const root = new THREE.Group();
  const hull = new THREE.Group();
  root.add(hull);
  meshAdder(hull)(g.hull, mats.body);
  const wheels = spinningWheels(hull, g.wheel, g.gear.wheels, g.gear.wheelR, mats.body);
  const turret = new THREE.Group();
  turret.position.set(0, 1.42, 0.25);
  hull.add(turret);
  const addT = meshAdder(turret);
  addT(g.turret, mats.body);
  addT(g.marks, mats.glow, false);
  const gun = new THREE.Group();
  gun.position.set(0, 0.44, 1.8);
  turret.add(gun);
  meshAdder(gun)(g.gun, mats.body);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, 5.65);
  gun.add(muzzle);

  const st = {};
  return {
    root,
    muzzle,
    animate(u, dt, t, ctx) {
      groundTilt(st, u, ctx, dt);
      hull.rotation.set(st.pitch - u.recoil * 0.03, 0, st.roll);
      hull.position.y = Math.sin(u.walkPhase * 2.1) * 0.02 * u.gait;
      turret.rotation.y = u.turretYaw - u.yaw;
      gun.position.z = 1.8 - u.recoil * 0.4;
      wheels.update(distanceDriven(u));
    },
    die(time) {
      // the classic T-72 ammunition cook-off: the turret is thrown up and off
      const k = Math.min(1, time / 0.8);
      turret.position.y = 1.42 + Math.sin(k * Math.PI) * 3 + k * -0.6;
      turret.position.x = k * 1.6;
      turret.rotation.z = k * 0.9;
    },
  };
}
