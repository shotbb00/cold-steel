// 1945 armour (data/epoch.js), real dimensions, nose toward +z, on vehicleCommon's running gear:
//   M4A3(76)W Sherman  the tall hull with its sloped glacis and rounded transmission nose, three
//                      volute bogies a side, the big cast T23 turret, the long 76 mm with its brake
//   T-34-85            the sloped hull, five big Christie wheels, the wide cast turret, the 85 mm,
//                      the fuel drums on the rear hull
//   Panzer IV H        the boxy hull, eight small wheels a side, the side skirts (Schürzen) on the
//                      hull and round the turret, the 7.5 cm L/48 with its double-baffle brake
//   StuG III G         no turret: the low casemate, the gun in its cast "Saukopf" mantlet (little
//                      traverse), the skirts
//   M3 half-track      the bonnet and cab, front wheels, a short track behind, the open armoured
//                      troop box, the .50 cal on its ring over the cab
//   Sd.Kfz. 251        the faceted armoured body, front wheels, interleaved road wheels, the
//                      MG 34 behind its shield at the front of the open compartment
// Markings in fixed colours (the white star, the Balkenkreuz, the Soviet white numbers), not
// the side colour. Contract: render/RigRenderer.js.
import * as THREE from 'three';
import { P, merge, pair, grime } from '../units/geometry.js';
import { buildWw2Soldier } from './ww2Soldier.js';
import { stationHull, castTurret, trackedHull, runningGear, roadWheelGeometry, spinningWheels, distanceDriven, groundTilt, meshAdder } from './vehicleCommon.js';

const OD = 0x4d4f34;
const OD_DK = 0x3c3e28;
const SOV = 0x4a5a34;
const SOV_DK = 0x3a4628;
const GELB = 0x9a8a5a;
const GELB_DK = 0x7a6c44;
const STEEL = 0x2b2d28;
const RUBBER = 0x1f201c;
const WHITE = 0xd8d6cc;
const BLACK = 0x161616;
const GLASS = 0x1a1d1c;
const C = { camo: 1 };

const whiteStar = (x, y, z, r, facing = 'x') => [ // the Allied white star in its circle
  P.cyl(r, r, 0.015, facing === 'x' ? { x, y, z, rz: Math.PI / 2, color: WHITE } : { x, y, z, color: WHITE }, 18),
  P.cyl(r * 0.82, r * 0.82, 0.02, facing === 'x' ? { x, y, z, rz: Math.PI / 2, color: OD } : { x, y, z, color: OD }, 18),
  ...[0, 1, 2, 3, 4].map((k) => P.box(0.012, r * 0.95, r * 0.3, facing === 'x' ? { x: x + Math.sign(x) * 0.012, y: y + Math.cos(k * 1.2566) * r * 0.35, z: z + Math.sin(k * 1.2566) * r * 0.35, rx: -k * 1.2566, color: WHITE } : { x, y, z, color: WHITE })),
];
const balkenkreuz = (x, y, z, r) => [ // white-edged black cross, on a side
  P.box(0.012, r * 2, r * 0.6, { x, y, z, color: WHITE }), P.box(0.012, r * 0.6, r * 2, { x, y, z, color: WHITE }),
  P.box(0.02, r * 1.7, r * 0.3, { x, y, z, color: BLACK }), P.box(0.02, r * 0.3, r * 1.7, { x, y, z, color: BLACK }),
];

/**
 * The rig: hull (tilting with the ground), the turret or gun mount on it turning to turretYaw
 * (`arc`: how far a casemate gun or pintle mount may traverse), the gun recoiling in it.
 */
function rig(g, mats, { turretAt, gunAt, muzzle, arc = Infinity, recoil = 0.3 }) {
  const root = new THREE.Group();
  const hull = new THREE.Group();
  root.add(hull);
  meshAdder(hull)(g.hull, mats.body);
  const wheels = spinningWheels(hull, g.wheel, g.gear.wheels, g.gear.wheelR, mats.body);
  const turret = new THREE.Group();
  turret.position.set(...turretAt);
  hull.add(turret);
  meshAdder(turret)(g.turret, mats.body);
  const gun = new THREE.Group();
  gun.position.set(...gunAt);
  turret.add(gun);
  meshAdder(gun)(g.gun, mats.body);
  const mz = new THREE.Object3D();
  mz.position.set(0, 0, muzzle);
  gun.add(mz);
  const st = {};
  return {
    root,
    muzzle: mz,
    animate(u, dt, t, ctx) {
      groundTilt(st, u, ctx, dt);
      hull.rotation.set(st.pitch - u.recoil * 0.02, 0, st.roll);
      hull.position.y = Math.sin(u.walkPhase * 2.3) * 0.015 * u.gait;
      const d = Math.atan2(Math.sin(u.turretYaw - u.yaw), Math.cos(u.turretYaw - u.yaw));
      turret.rotation.y = Math.max(-arc, Math.min(arc, d));
      gun.position.z = gunAt[2] - u.recoil * recoil;
      wheels.update(distanceDriven(u));
    },
    die(time) {
      if (arc < 1) return; // a casemate: nothing comes off
      turret.rotation.z = Math.min(0.2, time * 0.5);
      turret.position.y = turretAt[1] + Math.max(0, Math.sin(Math.min(time, 0.6) * 5)) * 0.25;
    },
  };
}

const cache = {};
const once = (key, make) => (cache[key] ??= make());

// ---------------------------------------------------------------- M4A3(76)W Sherman

export const buildUsSherman = (mats) => rig(once('sherman', () => {
  const gear = runningGear({ halfWidth: 1.12, length: 4.0, wheels: 6, wheelR: 0.26, sprocket: 1, rollers: 3, trackWidth: 0.42, wheelColor: OD_DK });
  return {
    gear, wheel: roadWheelGeometry(0.26, 0.36, OD_DK),
    hull: grime(merge([
      ...gear.parts,
      ...pair((s) => [-1.35, 0, 1.35].map((z) => P.box(0.2, 0.42, 0.7, { x: s * 1.12, y: 0.55, z, color: OD_DK }))).flat(), // volute bogies
      trackedHull([[-2.95, 1.75, 0.55], [-2.7, 1.95, 0.5], [1.3, 1.98, 0.5], [2.75, 1.05, 0.55]], { belly: 0.85, fender: 1.32, fenderY: 1.02, chamfer: 0.06 }, { color: OD, ...C }),
      P.cyl(0.45, 0.45, 1.75, { y: 0.92, z: 2.75, rz: Math.PI / 2, color: OD, ...C }, 16),                   // the rounded transmission nose
      ...pair((s) => P.box(0.36, 0.14, 0.18, { x: s * 0.42, y: 2.0, z: 1.15, color: OD_DK })),               // driver's and bow gunner's hatches
      P.cyl(0.02, 0.02, 0.45, { x: 0.5, y: 1.62, z: 2.1, rx: Math.PI / 2 - 0.6, color: STEEL }, 6),        // bow MG
      P.box(1.8, 0.04, 1.2, { y: 1.77, z: -2.3, color: OD_DK }),                                              // engine deck
      ...pair((s) => P.box(0.06, 0.06, 1.2, { x: s * 1.25, y: 1.12, z: 0.3, color: STEEL })),               // track tools on the sponsons
      ...[-1, 1].flatMap((s) => whiteStar(s * 1.335, 1.55, -0.6, 0.38)),
    ]), 1.25, 0.3),
    turret: grime(merge([
      castTurret([[1.2, 0.5, 0.5], [0.95, 0.88, 0.72], [0.35, 1.02, 0.8], [-0.55, 1.0, 0.78], [-1.25, 0.85, 0.62], [-1.55, 0.52, 0.42]], { color: OD, ...C }),
      P.cyl(0.36, 0.38, 0.22, { x: 0.45, y: 0.9, z: -0.35, color: OD, ...C }, 14),                          // vision cupola
      P.box(0.1, 0.12, 0.35, { x: 0.45, y: 1.08, z: -0.1, color: STEEL }),                                    // .50 cal on the roof
      P.cyl(0.022, 0.022, 0.95, { x: 0.45, y: 1.1, z: 0.45, rx: Math.PI / 2, color: STEEL }, 6),
      P.cyl(0.28, 0.28, 0.05, { x: -0.48, y: 0.79, z: -0.35, color: OD_DK }, 14),                           // loader's hatch
      P.box(0.95, 0.6, 0.3, { y: 0.42, z: 1.25, color: OD, ...C }),                                           // mantlet
    ]), 0.9, 0.0, 0.3),
    gun: merge([
      P.cyl(0.055, 0.065, 3.9, { z: 1.95, rx: Math.PI / 2, color: OD }, 12),
      P.cyl(0.1, 0.1, 0.32, { z: 3.95, rx: Math.PI / 2, color: STEEL }, 12),                                // muzzle brake
    ]),
  };
}), mats, { turretAt: [0, 1.98, -0.2], gunAt: [0, 0.42, 1.35], muzzle: 4.1 });

// ---------------------------------------------------------------- T-34-85

const sovT34 = (mats) => rig(once('t34', () => {
  const gear = runningGear({ halfWidth: 1.25, length: 4.3, wheels: 5, wheelR: 0.41, sprocket: -1, rollers: 0, trackWidth: 0.5, wheelColor: SOV_DK });
  return {
    gear, wheel: roadWheelGeometry(0.41, 0.42, SOV_DK, 0, 0.1),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-3.0, 1.45, 0.5], [-2.7, 1.62, 0.45], [1.75, 1.62, 0.45], [3.0, 0.7, 0.5]], { belly: 0.95, fender: 1.5, fenderY: 1.0, chamfer: 0.42 }, { color: SOV, ...C }),
      P.box(0.4, 0.3, 0.12, { x: -0.35, y: 1.25, z: 2.35, rx: 0.95, color: SOV_DK }),                         // driver's hatch on the glacis
      P.cyl(0.08, 0.08, 0.12, { x: 0.45, y: 1.12, z: 2.5, rx: Math.PI / 2 - 0.95, color: STEEL }, 8),       // bow MG ball
      P.box(1.9, 0.04, 1.4, { y: 1.64, z: -1.9, color: SOV_DK }),                                             // engine deck
      ...pair((s) => [-1.3, -2.3].map((z) => P.cyl(0.2, 0.2, 0.75, { x: s * 1.42, y: 1.35, z, rx: Math.PI / 2, color: SOV_DK }, 12))).flat(), // the external fuel drums
    ]), 1.25, 0.3),
    turret: grime(merge([
      castTurret([[1.45, 0.5, 0.45], [1.1, 0.95, 0.68], [0.3, 1.12, 0.74], [-0.7, 1.1, 0.72], [-1.45, 0.95, 0.6], [-1.75, 0.6, 0.42]], { color: SOV, ...C }, 3),
      P.cyl(0.34, 0.36, 0.22, { x: -0.45, y: 0.86, z: -0.6, color: SOV, ...C }, 14),                        // commander's cupola
      P.cyl(0.26, 0.26, 0.05, { x: 0.42, y: 0.76, z: -0.4, color: SOV_DK }, 14),
      P.box(0.85, 0.55, 0.35, { y: 0.4, z: 1.45, color: SOV, ...C }),                                         // mantlet
      ...pair((s) => P.box(0.012, 0.22, 0.42, { x: s * 1.13, y: 0.42, z: -0.2, color: WHITE })),            // the white turret number
    ]), 0.9, 0.0, 0.3),
    gun: merge([P.cyl(0.06, 0.07, 4.4, { z: 2.2, rx: Math.PI / 2, color: SOV }, 12)]),
  };
}), mats, { turretAt: [0, 1.62, 0.45], gunAt: [0, 0.42, 1.5], muzzle: 4.4 });

/**
 * The T-34-85 with the Red Army's tank riders (data/epoch.js 'riders'): while the platoon still
 * carries its squad (stack.passengers), three of them sit on each hull behind the turret, facing
 * out, legs over the side — gone once the squad is put down (U) or the tank is knocked out.
 */
export const buildSovT34 = (mats) => {
  const r = sovT34(mats);
  const hull = r.root.children[0];
  const g = (cache.rider ??= buildWw2Soldier({ army: 'sov', weapon: 'smg' }));
  const seats = [[-0.95, -0.9, -1], [-0.95, -1.95, -1], [0.95, -1.45, 1]]; // x, z, which side it faces
  const riders = seats.map(([x, z, s]) => {
    const man = new THREE.Group();
    man.position.set(x, 1.7 - g.rig.hipY, z);
    man.rotation.y = (s * Math.PI) / 2;
    const add = meshAdder(man);
    add(g.torso, mats.body);
    add(g.arms, mats.body);
    for (const side of [-1, 1]) {
      const thigh = new THREE.Group();                 // sitting: the thighs out over the edge…
      thigh.position.set(side * g.rig.hipX, g.rig.hipY, 0);
      thigh.rotation.x = -Math.PI / 2;
      man.add(thigh);
      meshAdder(thigh)(g.thigh, mats.body);
      const shin = new THREE.Group();                  // …the shins hanging down the side
      shin.position.set(side * g.rig.hipX, g.rig.hipY, g.rig.thighLen);
      man.add(shin);
      meshAdder(shin)(g.shin, mats.body);
    }
    hull.add(man);
    return man;
  });
  const animate = r.animate;
  r.animate = (u, dt, t, ctx) => {
    animate(u, dt, t, ctx);
    const n = Math.max(0, Math.min(3, (u.stack?.passengers ?? 0) - u.index * 3)); // eight men over three hulls
    riders.forEach((m, i) => { m.visible = u.alive && i < n; });
  };
  return r;
};

// ---------------------------------------------------------------- Panzer IV H

const skirts = (x, y, z0, z1, h, n, color) => {
  const out = [];
  const L = (z1 - z0) / n;
  for (let i = 0; i < n; i++) out.push(P.box(0.03, h, L * 0.97, { x, y, z: z0 + L * (i + 0.5), rz: Math.sign(x) * 0.04, color, ...C }));
  return out;
};

export const buildWhPanzerIV = (mats) => rig(once('pz4', () => {
  const gear = runningGear({ halfWidth: 1.12, length: 3.9, wheels: 8, wheelR: 0.235, sprocket: 1, rollers: 4, trackWidth: 0.4, wheelColor: GELB_DK });
  return {
    gear, wheel: roadWheelGeometry(0.235, 0.32, GELB_DK),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-2.95, 1.55, 0.45], [1.95, 1.62, 0.45], [2.25, 1.62, 0.6], [2.95, 1.0, 0.55]], { belly: 0.82, fender: 1.2, fenderY: 1.0, chamfer: 0.04 }, { color: GELB, ...C }),
      P.box(0.38, 0.14, 0.04, { x: -0.5, y: 1.48, z: 2.27, color: GLASS }),                                  // driver's visor
      P.cyl(0.07, 0.07, 0.1, { x: 0.5, y: 1.45, z: 2.27, rx: Math.PI / 2, color: STEEL }, 8),               // bow MG
      P.box(1.9, 0.04, 1.4, { y: 1.58, z: -2.0, color: GELB_DK }),
      P.cyl(0.08, 0.08, 0.5, { x: -0.4, y: 1.0, z: -3.05, rx: Math.PI / 2, color: STEEL }, 8),              // the muffler
      ...pair((s) => skirts(s * 1.47, 1.18, -2.6, 2.0, 0.65, 5, GELB)).flat(),
      ...pair((s) => P.box(0.06, 0.06, 4.6, { x: s * 1.42, y: 1.52, z: -0.3, color: STEEL })),              // the skirts' rail
      ...[-1, 1].flatMap((s) => balkenkreuz(s * 1.5, 1.18, -0.4, 0.26)),
    ]), 1.25, 0.3),
    turret: grime(merge([
      castTurret([[1.15, 0.58, 0.6], [0.95, 0.78, 0.66], [-0.6, 0.85, 0.66], [-1.25, 0.78, 0.6], [-1.35, 0.6, 0.5]], { color: GELB, ...C }, 5),
      P.cyl(0.3, 0.32, 0.25, { y: 0.84, z: -0.95, color: GELB, ...C }, 14),                                  // the cupola at the back
      ...pair((s) => skirts(s * 1.08, 0.33, -1.5, 0.75, 0.66, 3, GELB)).flat(),                               // turret skirts
      P.box(2.1, 0.66, 0.03, { y: 0.33, z: -1.55, color: GELB, ...C }),
      P.box(0.75, 0.5, 0.25, { y: 0.35, z: 1.25, color: GELB, ...C }),                                        // mantlet
    ]), 0.9, 0.0, 0.3),
    gun: merge([
      P.cyl(0.05, 0.06, 3.2, { z: 1.6, rx: Math.PI / 2, color: GELB }, 12),
      P.box(0.22, 0.13, 0.28, { z: 3.25, color: STEEL }),                                                     // double-baffle brake
    ]),
  };
}), mats, { turretAt: [0, 1.62, 0.15], gunAt: [0, 0.35, 1.3], muzzle: 3.4 });

// ---------------------------------------------------------------- StuG III G

export const buildFjStuG = (mats) => rig(once('stug', () => {
  const gear = runningGear({ halfWidth: 1.15, length: 3.6, wheels: 6, wheelR: 0.27, sprocket: 1, rollers: 3, trackWidth: 0.4, wheelColor: GELB_DK });
  return {
    gear, wheel: roadWheelGeometry(0.27, 0.34, GELB_DK),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-2.7, 1.3, 0.45], [2.25, 1.32, 0.45], [2.75, 0.95, 0.55]], { belly: 0.82, fender: 1.25, fenderY: 0.98, chamfer: 0.04 }, { color: GELB, ...C }),
      // the casemate: sloped front and sides, flat roof
      stationHull([
        [-1.3, [[0, 1.3], [1.05, 1.3], [0.92, 1.95], [0, 1.95]]],
        [1.05, [[0, 1.3], [1.05, 1.3], [0.92, 1.95], [0, 1.95]]],
        [1.65, [[0, 1.3], [1.05, 1.3], [0.92, 1.6], [0, 1.6]]],
      ], { color: GELB, ...C }),
      P.cyl(0.3, 0.32, 0.2, { x: -0.5, y: 2.05, z: -0.6, color: GELB, ...C }, 14),                           // cupola
      P.box(0.35, 0.1, 0.3, { x: 0.45, y: 2.0, z: -0.3, color: STEEL }),                                       // MG shield
      ...pair((s) => skirts(s * 1.47, 1.15, -2.3, 1.7, 0.62, 5, GELB)).flat(),
      ...[-1, 1].flatMap((s) => balkenkreuz(s * 1.5, 1.15, -0.4, 0.24)),
    ]), 1.25, 0.3),
    // the gun mount: the cast "Saukopf" mantlet
    turret: grime(merge([castTurret([[0.55, 0.12, 0.28], [0.3, 0.3, 0.36], [0.0, 0.34, 0.38]], { color: GELB, ...C }, 2.4)]), 0.9, 0.0, 0.3),
    gun: merge([
      P.cyl(0.05, 0.06, 3.2, { z: 1.6, rx: Math.PI / 2, color: GELB }, 12),
      P.box(0.22, 0.13, 0.28, { z: 3.25, color: STEEL }),
    ]),
  };
}), mats, { turretAt: [0, 1.38, 1.6], gunAt: [0, 0.14, 0.3], muzzle: 3.4, arc: 0.2 });

// ---------------------------------------------------------------- the half-tracks

function halfTrack({ color, dark, length, width, wheelZ, trackZ, trackLen, faceted, mg }) {
  const gear = runningGear({ halfWidth: width / 2 - 0.25, length: trackLen, wheels: faceted ? 6 : 4, wheelR: faceted ? 0.3 : 0.25, sprocket: 1, rollers: 0, trackWidth: 0.3, wheelColor: dark });
  for (const p of gear.parts) p.translate(0, 0, trackZ);
  for (const w of gear.wheels) w.z += trackZ;
  const hw = width / 2;
  const tail = -length / 2;
  const body = faceted
    // the 251: the troop box with its lower plates sloping out and upper plates sloping in; in
    // front of it the sloped scuttle and the narrow armoured engine bonnet, its near-upright
    // front plate with the radiator louvres, mudguards over the front wheels
    ? merge([
      stationHull([
        [tail, [[0, 0.65], [hw - 0.2, 0.65], [hw, 1.15], [hw - 0.18, 1.75], [0, 1.75]]],
        [0.25, [[0, 0.65], [hw - 0.2, 0.65], [hw, 1.15], [hw - 0.18, 1.75], [0, 1.75]]],
        [0.75, [[0, 0.72], [0.55, 0.72], [0.62, 1.05], [0.5, 1.5], [0, 1.55]]],
        [1.25, [[0, 0.75], [0.55, 0.75], [0.62, 1.05], [0.48, 1.42], [0, 1.45]]],
        [length / 2 - 0.12, [[0, 0.8], [0.5, 0.8], [0.56, 1.0], [0.42, 1.22], [0, 1.25]]],
        [length / 2, [[0, 0.82], [0.48, 0.82], [0.53, 1.0], [0.4, 1.19], [0, 1.22]]],
      ], { color, ...C }),
      ...[0.88, 0.96, 1.04, 1.12].map((y) => P.box(0.7, 0.025, 0.02, { y, z: length / 2 + 0.01, color: dark })),     // radiator louvres
      ...pair((s) => P.box(0.2, 0.06, 0.035, { x: s * 0.42, y: 1.42, z: 0.95, rx: -0.9, color: dark })),             // driver's vision flaps
      ...pair((s) => P.box(0.36, 0.04, 1.25, { x: s * (hw - 0.17), y: 0.98, z: wheelZ - 0.05, color, ...C })),       // mudguards
      ...pair((s) => P.box(0.36, 0.04, 0.4, { x: s * (hw - 0.17), y: 0.88, z: wheelZ + 0.72, rx: 0.5, color, ...C })),
      ...pair((s) => P.box(0.18, 0.06, 1.0, { x: s * (hw - 0.3), y: 0.92, z: wheelZ - 0.6, rz: s * 0.4, color: dark })), // the mudguard stays to the hull
      P.box(0.95, 0.08, 0.1, { y: 0.55, z: wheelZ, color: STEEL }),                                                   // front axle
    ])
    : merge([
      P.box(width, 0.15, length * 0.55, { y: 0.9, z: tail + length * 0.275, color, ...C }),                         // troop floor
      ...pair((s) => P.box(0.06, 1.0, length * 0.55, { x: s * hw, y: 1.4, z: tail + length * 0.275, color, ...C })), // armoured sides
      P.box(width, 1.0, 0.06, { y: 1.4, z: tail, color, ...C }),
      P.box(width * 0.9, 0.85, 1.2, { y: 1.35, z: tail + length * 0.55 + 0.6, color, ...C }),                     // cab
      P.box(width * 0.85, 0.35, 0.06, { y: 1.95, z: tail + length * 0.55 + 1.2, rx: -0.3, color: dark }),        // armoured windscreen
      P.box(1.0, 0.7, length * 0.3, { y: 1.15, z: length / 2 - length * 0.15, color, ...C }),                    // bonnet
      ...pair((s) => P.box(0.5, 0.06, 1.1, { x: s * (hw - 0.2), y: 1.05, z: wheelZ, rx: 0.1, color: dark })),    // front wings
      P.box(width * 0.9, 0.3, 0.15, { y: 0.75, z: length / 2, color: STEEL }),                                    // the roller bumper
    ]);
  return {
    gear,
    wheel: roadWheelGeometry(faceted ? 0.3 : 0.25, 0.28, dark),
    hull: grime(merge([...gear.parts, body, P.box(width * 0.8, 0.12, length * 0.5, { y: 0.6, color: STEEL }),
      // the steered front wheels: road tyres, much bigger than the track's wheels (static: ponytail, they don't spin)
      ...pair((s) => P.cyl(0.46, 0.46, 0.26, { x: s * (hw - 0.17), y: 0.46, z: wheelZ, rz: Math.PI / 2, color: RUBBER, surf: 'rubber' }, 16)),
      ...pair((s) => P.cyl(0.24, 0.24, 0.28, { x: s * (hw - 0.17), y: 0.46, z: wheelZ, rz: Math.PI / 2, color: dark }, 12))]), 1.0, 0.3),
    turret: merge(mg === 'shield'
      ? [P.box(0.55, 0.4, 0.04, { y: 0.15, z: 0.2, color: dark }), P.box(0.07, 0.1, 0.4, { y: 0.1, color: STEEL })]   // MG 34 behind its shield
      : [P.cyl(0.6, 0.6, 0.06, { y: 0.0, color: STEEL }, 16), P.box(0.12, 0.14, 0.45, { y: 0.15, color: STEEL })]),   // the ring mount, the .50 cal
    gun: merge([P.cyl(0.022, 0.022, mg === 'shield' ? 0.6 : 1.0, { z: 0.4, rx: Math.PI / 2, color: STEEL }, 6)]),
  };
}

export const buildUsM3 = (mats) => {
  const r = rig(once('m3', () => halfTrack({ color: OD, dark: OD_DK, length: 6.2, width: 2.2, wheelZ: 2.0, trackZ: -1.6, trackLen: 2.0, faceted: false, mg: 'ring' })), mats, { turretAt: [0, 2.05, 0.8], gunAt: [0, 0.15, 0.1], muzzle: 0.9, recoil: 0.02 });
  return r;
};
export const buildWh251 = (mats) => rig(once('251', () => halfTrack({ color: GELB, dark: GELB_DK, length: 5.8, width: 2.1, wheelZ: 1.9, trackZ: -1.1, trackLen: 3.0, faceted: true, mg: 'shield' })), mats, { turretAt: [0, 1.75, 0.6], gunAt: [0, 0.15, 0.1], muzzle: 0.7, recoil: 0.02 });

// ---------------------------------------------------------------- the lorries that carry the squads

import { vehicle, wheeled } from './support.js';
import { truckUnit } from './truck.js';

/** A canvas-topped lorry (the Red Army's Lend-Lease Studebaker US6, the Opel Blitz) with a pintle MG on the cab. */
const lorry = (o) => vehicle(() => {
  const t = truckUnit(o);
  const L = t.layout;
  return {
    wheels: wheeled(L.axles, t.track, o.r),
    hull: grime(merge(t.parts), 1.0, 0.4),
    turret: { geo: merge([P.box(0.08, 0.3, 0.08, { y: 0.15, color: STEEL }), P.box(0.08, 0.1, 0.4, { y: 0.32, color: STEEL })]), at: [0.4, L.cabTop + 0.02, L.cabRear + 0.6] },
    gun: { geo: merge([P.cyl(0.02, 0.02, 0.6, { z: 0.3, rx: Math.PI / 2, color: STEEL }, 6)]), at: [0, 0.32, 0.15], pitch: 0.03 },
    muzzle: [0, 0, 0.62],
  };
});
export const buildSovStudebaker = lorry({ length: 6.2, width: 2.24, color: SOV, dark: SOV_DK, bonnet: 'square', body: 'cargo', r: 0.48, axles: [4.9, 1.75, 0.6] });
export const buildFjOpelBlitz = lorry({ length: 6.0, width: 2.26, color: GELB, dark: GELB_DK, camo: 1, bonnet: 'round', body: 'cargo', r: 0.48, axles: [4.75, 1.2] });
