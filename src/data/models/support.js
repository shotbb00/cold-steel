// The support and specialist vehicles, in the same kit as the tanks (vehicleCommon.js): each is
// a short description — hull outline, running gear or wheels, a turret / launcher that
// traverses, a weapon or launcher that elevates — and vehicle() turns it into a RigRenderer rig.
//   NATO  M113 family: M901 ITV (TOW "hammerhead"), M106 mortar carrier, M113 ambulance,
//         M48 Chaparral (on the M730 carrier) · M270 MLRS · M88 recovery vehicle · M60 AVLB · M728 CEV · M167 towed Vulcan ·
//         AN/MPQ-49 FAAR on the M561 · ADATS on the M113A2 · AN/TPQ-37 Firefinder · M60A3 with mine plough · AN/MLQ-34 TACJAM
//   Pact  BRDM-2 (KPVT turret) and 9P148 (Konkurs launcher) · BM-21 Grad on the Ural-375 ·
//         2S9 Nona · MT-LB family: 9K35 Strela-10, ambulance · BREM-1 recovery vehicle · MTU-20 · IMR-2 · ZU-23-2 · P-19 radar on the ZiL-131 · 2S6 Tunguska · ARK-1 Rys · UR-77 Meteorit · R-330 jammer
// The three family hulls (M113, MT-LB, BRDM-2) are built from their cross-sections
// (stationHull) with their common fittings, so every variant on them shares the detail.
import * as THREE from 'three';
import { P, merge, pair, grime, loft } from '../units/geometry.js';
import { sideProfile, planProfile, stationHull, trackedHull, runningGear, roadWheelGeometry, spinningWheels, distanceDriven, groundTilt, meshAdder } from './vehicleCommon.js';

const NATO = 0x4b5a35;
const NATO_DK = 0x33382a;
const PACT = 0x4a5634;
const PACT_DK = 0x3a4428;
const STEEL = 0x2b2d28;
const WHITE = 0xd8d6cc;
const RED = 0xa8231c;
const GLASS = 0x1a1d1c;
const C = { camo: 1 };

/**
 * Build a rig from a description (made once, on first use):
 *   hull: geometry · wheels: { geo, list, r } · turret: { geo, at: [x, y, z] }
 *   gun: { geo, at, pitch (fixed) | null (follows u.gunPitch) } · muzzle: [x, y, z] in the gun (or turret)
 *   marks: geometry painted in the faction's marking colour
 *   load: geometry carried on the hull that can be put down (a bridge layer's bridge): hidden
 *         once the unit has `dropped` it
 *   spin: { geo, at, rate, onTurret, always } — turns about its own up axis while the unit's
 *         `spinning` is set, or all the time (`always`): a search radar antenna
 */
export function vehicle(describe) {
  let d = null;
  return (mats) => {
    d ??= describe();
    const root = new THREE.Group();
    const hull = new THREE.Group();
    root.add(hull);
    meshAdder(hull)(d.hull, mats.body);
    if (d.marks) meshAdder(hull)(d.marks, mats.glow, false);
    const load = new THREE.Group();
    hull.add(load);
    if (d.load) meshAdder(load)(d.load, mats.body);
    const wheels = d.wheels ? spinningWheels(hull, d.wheels.geo, d.wheels.list, d.wheels.r, mats.body) : null;
    const turret = new THREE.Group();
    hull.add(turret);
    if (d.turret) {
      turret.position.set(...d.turret.at);
      meshAdder(turret)(d.turret.geo, mats.body);
    }
    const gun = new THREE.Group();
    turret.add(gun);
    if (d.gun) {
      gun.position.set(...d.gun.at);
      meshAdder(gun)(d.gun.geo, mats.body);
    }
    const spin = new THREE.Group();
    hull.add(spin);
    if (d.spin) {
      spin.position.set(...d.spin.at);
      meshAdder(spin)(d.spin.geo, mats.body);
    }
    if (d.spin?.onTurret) turret.add(spin); // a radar on the turret turns with it
    const muzzle = new THREE.Object3D();
    muzzle.position.set(...(d.muzzle ?? [0, 0, 1]));
    (d.gun ? gun : turret).add(muzzle);
    const st = {};
    const gz = d.gun?.at[2] ?? 0;
    return {
      root,
      muzzle,
      animate(u, dt, t, ctx) {
        groundTilt(st, u, ctx, dt, 3);
        hull.rotation.set(st.pitch - u.recoil * 0.02, 0, st.roll);
        if (d.turret) turret.rotation.y = u.turretYaw - u.yaw;
        if (d.gun) {
          gun.rotation.x = -(d.gun.pitch ?? Math.max(0.03, u.gunPitch ?? 0.05));
          gun.position.z = gz - u.recoil * (d.recoil ?? 0.2);
        }
        wheels?.update(distanceDriven(u));
        if (d.spin && (u.spinning || d.spin.always) && u.alive) spin.rotation.y += dt * (d.spin.rate ?? 1.5);
        load.visible = !u.dropped && !u.laying; // laid, or being laid
      },
      die(time) {
        turret.rotation.z = Math.min(0.25, time * 0.4);
        hull.rotation.x = Math.min(0.06, time * 0.1);
      },
    };
  };
}

export const tracked = (o) => {
  const gear = runningGear(o);
  return { parts: gear.parts, wheels: { geo: roadWheelGeometry(o.wheelR, o.trackWidth * 0.9, o.wheelColor), list: gear.wheels, r: gear.wheelR } };
};

/** Wheels of a wheeled vehicle (4×4, 6×6) as spinning instances. */
const wheeled = (axles, halfWidth, r) => ({
  geo: roadWheelGeometry(r, 0.34, 0x3a3f30, 0, 0.4),
  list: axles.flatMap((z) => [-1, 1].map((s) => ({ x: s * halfWidth, y: r, z }))),
  r,
});

/** A red cross on a white square, facing +x (rotate for other faces). */
const cross = (o) => [
  P.box(0.03, 0.8, 0.8, { ...o, color: WHITE }),
  P.box(0.04, 0.55, 0.16, { ...o, color: RED }),
  P.box(0.04, 0.16, 0.55, { ...o, color: RED }),
];

// ---------------------------------------------------------------- NATO: the M113 family

const m113Hull = (extra = [], { color = NATO, roof = 1.85 } = {}) => {
  const g = tracked({ halfWidth: 1.15, length: 3.9, wheels: 5, wheelR: 0.3, sprocket: 1, rollers: 0, trackWidth: 0.38, wheelColor: NATO_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      // the aluminium box: hull between the tracks, sides over them, the sloped upper front plate
      stationHull([
        [-2.42, [[0, 0.5], [0.95, 0.5], [0.95, 1.0], [1.36, 1.0], [1.36, roof - 0.05], [1.31, roof], [0, roof]]],
        [1.4, [[0, 0.45], [0.95, 0.45], [0.95, 1.0], [1.36, 1.0], [1.36, roof - 0.05], [1.31, roof], [0, roof]]],
        [2.3, [[0, 0.5], [0.95, 0.5], [0.95, 1.0], [1.36, 1.0], [1.36, 1.22], [1.31, 1.27], [0, 1.27]]],
        [2.5, [[0, 0.78], [0.92, 0.78], [0.92, 1.0], [1.32, 1.0], [1.32, 1.06], [1.28, 1.08], [0, 1.08]]],
      ], { color, ...C }),
      // rear ramp with its door, hinges and handles
      P.box(1.9, 1.15, 0.08, { y: 1.05, z: -2.45, color: NATO_DK }),
      P.box(0.6, 0.95, 0.03, { x: -0.45, y: 1.08, z: -2.5, color: color, ...C }),
      ...pair((s) => P.box(0.05, 0.1, 0.06, { x: s * 0.8, y: 0.55, z: -2.5, color: STEEL })),
      P.box(0.04, 0.16, 0.05, { x: 0.2, y: 1.1, z: -2.51, color: STEEL }),
      // trim vane folded on the front plate, driver's hatch and periscopes, exhaust grille
      P.box(2.4, 0.05, 0.55, { y: (roof + 1.27) / 2 + 0.03, z: 1.85, rx: Math.atan2(roof - 1.27, 0.9), color: NATO_DK }),
      P.box(0.6, 0.05, 0.6, { x: -0.6, y: roof + 0.02, z: 0.9, color: NATO_DK }),
      ...[-0.18, 0, 0.18].map((x) => P.box(0.12, 0.08, 0.04, { x: -0.6 + x, y: roof + 0.04, z: 1.22, color: GLASS })),
      P.box(0.05, 0.4, 0.55, { x: 1.38, y: 1.45, z: 1.75, color: STEEL }),
      ...[1.55, 1.7, 1.85, 2.0].map((z) => P.box(0.03, 0.34, 0.04, { x: 1.405, y: 1.45, z, color: NATO_DK })),
      // headlights in their brush guards, tow hooks, fender lips
      ...pair((s) => P.box(0.2, 0.14, 0.1, { x: s * 1.0, y: 1.17, z: 2.47, color: STEEL })),
      ...pair((s) => P.box(0.14, 0.09, 0.02, { x: s * 1.0, y: 1.17, z: 2.53, color: GLASS })),
      ...pair((s) => P.box(0.26, 0.2, 0.03, { x: s * 1.0, y: 1.2, z: 2.6, color: STEEL })),
      ...pair((s) => P.box(0.1, 0.1, 0.14, { x: s * 0.6, y: 0.82, z: 2.53, color: STEEL })),
      ...pair((s) => P.box(0.06, 0.05, 4.9, { x: s * 1.37, y: 1.0, z: 0.0, color: NATO_DK })),
      ...extra,
    ]), 1.2, 0.3),
  };
};

export const buildNatoITV = vehicle(() => ({
  ...m113Hull(),
  // the commander's cupola the launcher is hinged to, with its vision blocks and hatch
  turret: {
    geo: merge([
      P.cyl(0.52, 0.56, 0.3, { y: 0.15, color: NATO, ...C }, 16),
      ...[0, 1, 2, 3, 4, 5].map((k) => P.box(0.1, 0.07, 0.03, { x: Math.sin(k * 0.55 - 1.4) * 0.53, y: 0.22, z: Math.cos(k * 0.55 - 1.4) * 0.53, ry: k * 0.55 - 1.4, color: GLASS })),
      P.cyl(0.3, 0.3, 0.05, { y: 0.32, z: 0.1, color: NATO_DK }, 14),
      ...pair((s) => P.box(0.12, 0.3, 0.2, { x: s * 0.2, y: 0.42, z: -0.38, color: NATO_DK })),          // hinge brackets
    ]),
    at: [0.3, 1.85, 0.3],
  },
  gun: { // the TOW "hammerhead" raised on its arms: two square launch tubes either side of the sight
    geo: merge([
      ...pair((s) => P.box(0.1, 0.8, 0.14, { x: s * 0.2, y: 0.36, z: 0.12, rx: -0.3, color: NATO_DK })), // erecting arms
      P.box(0.46, 0.5, 0.66, { y: 0.88, z: 0.28, color: NATO, ...C }),                                   // sight housing
      P.box(0.3, 0.2, 0.02, { y: 0.93, z: 0.62, color: GLASS }),                                         // sight window
      P.box(0.2, 0.12, 0.3, { y: 1.18, z: 0.2, color: NATO_DK }),                                        // thermal sight on top
      ...pair((s) => P.box(0.3, 0.32, 1.3, { x: s * 0.39, y: 0.88, z: 0.3, color: NATO_DK })),          // launch tubes
      ...pair((s) => P.box(0.22, 0.24, 0.02, { x: s * 0.39, y: 0.88, z: 0.955, color: 0x141414 })),      // their open fronts
      ...pair((s) => P.box(0.34, 0.36, 0.05, { x: s * 0.39, y: 0.88, z: -0.36, color: NATO, ...C })),   // breech covers
      ...pair((s) => [-0.05, 0.6].map((z) => P.box(0.32, 0.34, 0.04, { x: s * 0.39, y: 0.88, z, color: NATO, ...C }))).flat(), // tube bands
    ]),
    at: [0, 0.4, -0.38],
  },
  muzzle: [0.39, 0.88, 0.97],
  marks: merge([P.box(0.02, 0.3, 0.5, { x: 1.39, y: 1.4, z: -0.6 })]),
}));

export const buildNatoM106 = vehicle(() => ({
  ...m113Hull([P.box(1.5, 0.06, 1.6, { y: 1.88, z: -1.2, rx: 0.6, color: NATO_DK })]), // roof hatch thrown open
  turret: { geo: merge([P.cyl(0.55, 0.6, 0.15, { color: STEEL }, 14)]), at: [0, 1.25, -1.1] },
  gun: { geo: merge([P.cyl(0.11, 0.13, 1.6, { z: 0.8, rx: Math.PI / 2, color: STEEL }, 10)]), at: [0, 0.2, 0], pitch: 1.05 },
  muzzle: [0, 0, 1.7],
  recoil: 0.12,
  marks: merge([P.box(0.02, 0.3, 0.5, { x: 1.375, y: 1.4, z: 0.6 })]),
}));

export const buildNatoAmbulance = vehicle(() => ({
  ...m113Hull([
    ...cross({ x: 1.39, y: 1.4, z: -0.6 }),
    ...cross({ x: -1.39, y: 1.4, z: -0.6 }),
    ...cross({ y: 1.87, z: -1.2, rz: Math.PI / 2 }),
    ...cross({ y: 1.2, z: -2.51, ry: Math.PI / 2 }),
  ], { roof: 2.05 }),
  muzzle: [0, 2, 0],
}));

export const buildNatoChaparral = vehicle(() => ({
  ...m113Hull([P.box(2.4, 0.5, 1.6, { y: 1.95, z: 1.2, color: NATO, ...C })], { roof: 1.6 }), // the M730's cab
  turret: { geo: merge([P.box(1.2, 0.7, 1.2, { y: 0.35, color: NATO, ...C }), P.box(0.5, 0.5, 0.4, { y: 0.5, z: 0.6, color: 0x2a3a44 })]), at: [0, 1.6, -1.0] },
  gun: { // four Sidewinder-derived missiles on two rails a side
    geo: merge([
      P.box(2.4, 0.12, 0.2, { color: STEEL }),
      ...[-1, -0.6, 0.6, 1].map((x) => P.cyl(0.08, 0.08, 2.6, { x, y: 0.15, z: 0.6, rx: Math.PI / 2, color: WHITE }, 8)),
      ...[-1, -0.6, 0.6, 1].map((x) => P.cone(0.08, 0.3, { x, y: 0.15, z: 2.05, rx: Math.PI / 2, color: WHITE }, 8)),
    ]),
    at: [0, 0.75, 0],
    pitch: null,
  },
  muzzle: [0.6, 0.15, 2.2],
  marks: merge([P.box(0.02, 0.3, 0.5, { x: 1.31, y: 1.2, z: -0.8 })]),
}));

export const buildNatoMLRS = vehicle(() => {
  const g = tracked({ halfWidth: 1.3, length: 5.0, wheels: 6, wheelR: 0.31, sprocket: 1, rollers: 3, trackWidth: 0.42, wheelColor: NATO_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      // the M993 carrier: chassis with fenders, the armoured three-man cab up front
      trackedHull([[-3.4, 1.45, 0.5], [-3.1, 1.45, 0.45], [3.0, 1.45, 0.45], [3.4, 1.2, 0.6], [3.5, 1.08, 0.8]],
        { belly: 1.08, fender: 1.5, fenderY: 1.0, chamfer: 0.04 }, { color: NATO, ...C }),
      stationHull([
        [1.05, [[0, 1.4], [1.48, 1.4], [1.48, 2.32], [1.36, 2.45], [0, 2.46]]],
        [2.95, [[0, 1.4], [1.48, 1.4], [1.48, 2.32], [1.36, 2.45], [0, 2.46]]],
        [3.45, [[0, 1.4], [1.45, 1.4], [1.45, 1.55], [1.34, 1.62], [0, 1.64]]],
      ], { color: NATO, ...C }),
      ...pair((s) => P.box(0.04, 0.42, 0.9, { x: s * 1.49, y: 2.0, z: 2.2, color: GLASS })),            // cab windows
      ...[-0.75, 0, 0.75].map((x) => P.box(0.62, 0.32, 0.04, { x, y: 2.12, z: 3.1, rx: -1.1, color: GLASS })),
      ...pair((s) => P.box(0.65, 0.4, 0.04, { x: s * 0.75, y: 2.12, z: 3.14, rx: -1.1, color: NATO_DK })), // armoured louvres, raised
      ...pair((s) => P.box(0.2, 0.14, 0.1, { x: s * 1.1, y: 1.5, z: 3.45, color: STEEL })),
      ...pair((s) => P.box(0.06, 0.05, 6.8, { x: s * 1.5, y: 1.0, z: 0.0, color: NATO_DK })),
      P.box(2.4, 0.3, 0.6, { y: 1.6, z: 0.6, color: NATO_DK }),                                       // stowage behind the cab
    ]), 1.2, 0.3),
    turret: { geo: merge([P.box(2.2, 0.35, 2.2, { y: 0.17, color: NATO_DK }), ...pair((s) => P.box(0.12, 0.5, 0.9, { x: s * 1.0, y: 0.5, color: NATO_DK }))]), at: [0, 1.45, -1.4] },
    gun: { // the launcher-loader module: two pod containers, six rockets each, in the cage frame
      geo: merge([
        ...pair((s) => P.box(1.1, 1.0, 4.0, { x: s * 0.58, y: 0.55, z: 0.6, color: NATO, ...C })),
        ...pair((s) => [-0.33, 0, 0.33].flatMap((x) => [0.3, 0.78].map((y) => P.cyl(0.14, 0.14, 0.04, { x: s * 0.58 + x, y, z: 2.61, rx: Math.PI / 2, color: 0x141414 }, 10)))).flat(),
        ...[-1.3, 0.6, 2.5].flatMap((z) => [P.box(2.4, 0.07, 0.1, { y: 1.08, z, color: STEEL }), ...pair((s) => P.box(0.07, 1.05, 0.1, { x: s * 1.17, y: 0.55, z, color: STEEL }))]),
        P.box(2.4, 0.07, 3.9, { y: 1.08, z: 0.6, color: NATO_DK }),                                     // cage roof
        ...pair((s) => P.box(0.4, 0.3, 0.25, { x: s * 0.9, y: 1.25, z: -1.2, color: NATO_DK })),        // hoist housings
      ]),
      at: [0, 0.35, 0],
      pitch: 0.55,
    },
    muzzle: [0, 0.55, 2.7],
    recoil: 0.05,
    marks: merge([P.box(0.02, 0.35, 0.6, { x: 1.49, y: 1.0, z: -1.5 })]),
  };
});

export const buildNatoM88 = vehicle(() => {
  const g = tracked({ halfWidth: 1.5, length: 5.0, wheels: 6, wheelR: 0.34, sprocket: -1, rollers: 3, trackWidth: 0.6, wheelColor: NATO_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      // the tall hull, its crew compartment raised at the front with the sloped front plate
      stationHull([
        [-3.8, [[0, 0.5], [1.18, 0.5], [1.18, 1.05], [1.78, 1.05], [1.78, 1.82], [1.7, 1.9], [0, 1.9]]],
        [-0.2, [[0, 0.45], [1.18, 0.45], [1.18, 1.05], [1.78, 1.05], [1.78, 1.88], [1.7, 1.96], [0, 1.96]]],
        [0.1, [[0, 0.45], [1.18, 0.45], [1.18, 1.05], [1.78, 1.05], [1.78, 2.32], [1.68, 2.42], [0, 2.42]]],
        [2.6, [[0, 0.45], [1.18, 0.45], [1.18, 1.05], [1.78, 1.05], [1.78, 2.32], [1.68, 2.42], [0, 2.42]]],
        [3.55, [[0, 0.5], [1.18, 0.5], [1.18, 1.05], [1.78, 1.05], [1.78, 1.45], [1.68, 1.52], [0, 1.52]]],
        [3.8, [[0, 0.75], [1.15, 0.75], [1.15, 1.05], [1.72, 1.05], [1.72, 1.12], [1.62, 1.18], [0, 1.18]]],
      ], { color: NATO, ...C }),
      // the A-frame boom laid back over the deck, its cross-bar and hoist cables
      ...pair((s) => P.box(0.18, 0.18, 4.4, { x: s * 0.9, y: 2.22, z: -1.3, rx: 0.12, color: NATO_DK })),
      P.box(2.0, 0.18, 0.18, { y: 2.48, z: -3.4, color: NATO_DK }),
      ...pair((s) => P.box(0.24, 0.3, 0.3, { x: s * 0.9, y: 2.05, z: 0.85, color: STEEL })),               // boom hinges
      P.cyl(0.02, 0.02, 4.2, { y: 2.3, z: -1.2, rx: Math.PI / 2 + 0.1, color: STEEL }, 5),
      // spade / dozer blade, main winch, vision blocks, headlights, tow bar, stowage
      P.box(3.4, 0.8, 0.2, { y: 0.6, z: 3.98, rx: 0.2, color: NATO_DK }),
      ...pair((s) => P.box(0.16, 0.16, 0.8, { x: s * 1.2, y: 0.75, z: 3.55, rx: 0.4, color: STEEL })),
      P.cyl(0.45, 0.45, 1.6, { y: 1.3, z: 3.62, rz: Math.PI / 2, color: NATO_DK }, 14),
      ...[-1.1, -0.6, -0.1, 0.4].map((x) => P.box(0.18, 0.1, 0.04, { x, y: 2.28, z: 2.62, rx: 0.2, color: GLASS })),
      ...pair((s) => P.box(0.2, 0.14, 0.1, { x: s * 1.5, y: 1.42, z: 3.6, color: STEEL })),
      ...pair((s) => P.box(0.16, 0.1, 0.02, { x: s * 1.5, y: 1.42, z: 3.66, color: GLASS })),
      P.box(1.6, 0.12, 0.12, { y: 1.62, z: -3.6, color: STEEL }),
      ...pair((s) => P.box(0.9, 0.4, 1.4, { x: s * 1.2, y: 2.15, z: -2.6, color: 0x4d5236 })),
      ...pair((s) => P.box(0.06, 0.6, 6.8, { x: s * 1.8, y: 0.8, z: 0.0, color: NATO, ...C })),          // skirts
    ]), 1.2, 0.3),
    turret: {
      geo: merge([
        P.cyl(0.45, 0.5, 0.35, { color: NATO, ...C }, 14),
        ...[0, 1, 2, 3, 4].map((k) => P.box(0.1, 0.07, 0.03, { x: Math.sin(k * 0.6 - 1.2) * 0.47, y: 0.12, z: Math.cos(k * 0.6 - 1.2) * 0.47, ry: k * 0.6 - 1.2, color: GLASS })),
        P.box(0.12, 0.14, 0.4, { y: 0.32, z: 0.15, color: STEEL }),
      ]),
      at: [0.9, 2.45, 1.4],
    },
    gun: { geo: merge([P.cyl(0.024, 0.024, 1.1, { z: 0.55, rx: Math.PI / 2, color: STEEL }, 6)]), at: [0, 0.35, 0.3] },
    muzzle: [0, 0, 1.1],
    marks: merge([P.box(0.02, 0.35, 0.6, { x: 1.795, y: 1.5, z: -1.2 })]),
  };
});

// ---------------------------------------------------------------- Pact: BRDM-2 and 9P148

// BRDM-2: a long boat hull with the four road wheels set into arches in its sides (the hull
// comes down to the ground between and around them), the steep armoured windscreen with its two
// vision ports and their shutters raised, the commander's and driver's roof hatches behind it,
// the sloping engine deck at the rear with its louvres and exhausts, the belly wheels between
// the axles. The 9P148 Konkurs carrier is the same hull with the launcher on its roof.
const BRDM_ARCH = 0.62;              // half-length of a wheel arch along the hull
const brdmHull = (extra = []) => ({
  wheels: wheeled([1.45, -1.45], 0.92, 0.52),
  hull: grime(merge([
    stationHull([
      [-2.85, [[0, 0.72], [0.7, 0.72], [0.7, 1.12], [1.12, 1.12], [1.12, 1.34], [0.95, 1.55], [0, 1.56]]],
      [-2.2, [[0, 0.5], [0.7, 0.5], [0.7, 1.12], [1.17, 1.12], [1.17, 1.42], [0.98, 1.72], [0, 1.73]]],
      [1.65, [[0, 0.5], [0.7, 0.5], [0.7, 1.12], [1.17, 1.12], [1.17, 1.42], [0.98, 1.8], [0, 1.8]]],
      [2.05, [[0, 0.52], [0.7, 0.52], [0.7, 1.12], [1.15, 1.12], [1.15, 1.32], [0.98, 1.42], [0, 1.43]]],
      [2.6, [[0, 0.58], [0.68, 0.58], [0.68, 1.05], [1.08, 1.05], [1.08, 1.22], [0.94, 1.3], [0, 1.31]]],
      [2.95, [[0, 0.86], [0.55, 0.86], [0.55, 0.95], [0.88, 0.95], [0.88, 1.0], [0.78, 1.03], [0, 1.04]]],
    ], { color: PACT }),
    // the hull's lower sides around the wheel arches, and the lips over the arches
    ...pair((s) => [
      [-0.85 + 0.02, 0.85 - 0.02], [1.45 + BRDM_ARCH, 2.55], [-2.75, -1.45 - BRDM_ARCH],
    ].map(([z0, z1]) => P.box(0.06, 0.6, z1 - z0, { x: s * 1.15, y: 0.83, z: (z0 + z1) / 2, color: PACT }))).flat(),
    ...pair((s) => [1.45, -1.45].map((z) => P.box(0.12, 0.05, BRDM_ARCH * 2.1, { x: s * 1.17, y: 1.13, z, color: PACT_DK }))).flat(),
    // the steep armoured windscreen: two vision ports, their shutters raised above them
    ...pair((s) => P.box(0.62, 0.3, 0.04, { x: s * 0.42, y: 1.6, z: 1.86, rx: -0.76, color: GLASS })),
    ...pair((s) => P.box(0.7, 0.04, 0.42, { x: s * 0.42, y: 1.86, z: 1.82, rx: 0.25, color: PACT_DK })),
    ...pair((s) => P.box(0.04, 0.08, 0.3, { x: s * 0.06, y: 1.78, z: 1.75, color: STEEL })),        // shutter hinges
    // commander's and driver's hatches, periscopes
    ...pair((s) => P.cyl(0.3, 0.32, 0.06, { x: s * 0.45, y: 1.82, z: 1.15, color: PACT_DK }, 14)),
    ...pair((s) => P.box(0.12, 0.08, 0.05, { x: s * 0.45, y: 1.86, z: 1.48, rx: 0.3, color: GLASS })),
    // firing ports with their visors along the sides
    ...pair((s) => [0.35, -0.55].map((z) => P.box(0.05, 0.2, 0.22, { x: s * 1.18, y: 1.3, z, color: PACT_DK }))).flat(),
    // the engine deck: louvres, exhaust stubs, rear lights, tow hitch; headlights on the bow
    P.box(1.5, 0.05, 0.95, { y: 1.66, z: -2.45, rx: 0.33, color: PACT_DK }),
    ...[-2.15, -2.35, -2.55, -2.75].map((z) => P.box(1.4, 0.03, 0.06, { y: 1.71 - (z + 2.15) * -0.33 - 0.05, z, color: STEEL })),
    ...pair((s) => P.cyl(0.07, 0.07, 0.3, { x: s * 0.9, y: 1.25, z: -2.9, rx: Math.PI / 2, color: STEEL }, 8)),
    ...pair((s) => P.box(0.12, 0.08, 0.03, { x: s * 0.85, y: 1.38, z: -2.87, color: 0x5a1a14 })),
    P.box(0.18, 0.12, 0.2, { y: 0.8, z: -2.9, color: STEEL }),
    ...pair((s) => P.cyl(0.085, 0.085, 0.1, { x: s * 0.78, y: 1.15, z: 2.68, rx: Math.PI / 2 - 0.5, color: STEEL }, 10)),
    ...pair((s) => P.cyl(0.07, 0.07, 0.02, { x: s * 0.78, y: 1.17, z: 2.73, rx: Math.PI / 2 - 0.5, color: GLASS }, 10)),
    // belly wheels between the axles, raised; tow cable
    ...pair((s) => P.cyl(0.3, 0.3, 0.2, { x: s * 0.6, y: 0.48, z: 0.0, rz: Math.PI / 2, color: 0x1e1e1c, surf: 'rubber' }, 12)),
    P.cyl(0.025, 0.025, 2.6, { x: 1.19, y: 1.42, z: -0.4, rx: Math.PI / 2, color: STEEL }, 6),
    ...extra,
  ]), 1.0, 0.4),
});

export const buildPactBRDM = vehicle(() => ({
  ...brdmHull(),
  // BPU-1 turret: an eight-sided cone with the 14.5 mm KPVT and coaxial PKT, the sight on its roof
  turret: {
    geo: merge([
      P.cyl(0.52, 0.7, 0.58, { y: 0.29, color: PACT }, 8),
      P.cyl(0.74, 0.74, 0.06, { y: 0.02, color: PACT_DK }, 16),
      P.box(0.16, 0.14, 0.14, { x: -0.18, y: 0.63, z: 0.2, color: PACT_DK }),
      P.box(0.12, 0.06, 0.02, { x: -0.18, y: 0.64, z: 0.28, color: GLASS }),
      P.box(0.34, 0.3, 0.2, { y: 0.32, z: 0.6, color: PACT }),                       // mantlet
    ]),
    at: [0, 1.8, 0.1],
  },
  gun: {
    geo: merge([
      P.cyl(0.075, 0.075, 0.7, { z: 0.35, rx: Math.PI / 2, color: PACT_DK }, 10),   // KPVT cooling jacket
      P.cyl(0.035, 0.04, 1.3, { z: 1.3, rx: Math.PI / 2, color: STEEL }, 8),       // barrel
      P.cyl(0.05, 0.045, 0.12, { z: 1.98, rx: Math.PI / 2, color: STEEL }, 8),     // flash hider
      P.cyl(0.02, 0.02, 0.6, { x: 0.16, z: 0.45, rx: Math.PI / 2, color: STEEL }, 6), // PKT
    ]),
    at: [0, 0.34, 0.6],
  },
  muzzle: [0, 0, 2.05],
  marks: merge([P.box(0.02, 0.3, 0.3, { x: 1.175, y: 1.27, z: -1.05 })]),
}));

export const buildPactKonkurs = vehicle(() => ({
  ...brdmHull([
    P.box(1.5, 0.08, 1.4, { y: 1.83, z: -0.3, color: PACT_DK }),                   // the launcher hatch in the roof
  ]),
  // the launcher raised out of its hatch: a pillar, the armoured cover tipped back behind it
  turret: {
    geo: merge([
      P.box(0.3, 0.45, 0.3, { y: 0.22, color: PACT_DK }),
      P.box(1.4, 0.06, 1.2, { y: 0.52, z: -0.85, rx: 1.0, color: PACT }),
    ]),
    at: [0, 1.87, -0.3],
  },
  gun: { // five 9M113 Konkurs containers side by side on their rail
    geo: merge([
      P.box(1.25, 0.08, 0.5, { y: 0.0, z: 0.1, color: STEEL }),
      ...[-0.5, -0.25, 0, 0.25, 0.5].flatMap((x) => [
        P.cyl(0.085, 0.085, 1.22, { x, y: 0.13, z: 0.3, rx: Math.PI / 2, color: 0x4f5a36 }, 10),
        P.cyl(0.092, 0.092, 0.05, { x, y: 0.13, z: 0.9, rx: Math.PI / 2, color: 0x3a4428 }, 10),
        P.cyl(0.092, 0.092, 0.05, { x, y: 0.13, z: -0.3, rx: Math.PI / 2, color: 0x3a4428 }, 10),
        P.cyl(0.065, 0.065, 0.02, { x, y: 0.13, z: 0.93, rx: Math.PI / 2, color: 0x141414 }, 10),
      ]),
    ]),
    at: [0, 0.5, 0],
  },
  muzzle: [0, 0.13, 0.95],
  marks: merge([P.box(0.02, 0.3, 0.3, { x: 1.175, y: 1.27, z: -1.05 })]),
}));

// ---------------------------------------------------------------- Pact: BM-21 Grad

export const buildPactGrad = vehicle(() => ({
  wheels: wheeled([2.0, -0.7, -1.95], 1.0, 0.55),
  hull: grime(merge([
    // Ural-375D: chassis rails, the long bonnet with its grille, the cab, round-topped fenders
    ...pair((s) => P.box(0.16, 0.25, 6.9, { x: s * 0.45, y: 0.95, z: 0.1, color: STEEL })),
    stationHull([
      [2.42, [[0, 1.15], [0.7, 1.15], [0.72, 1.7], [0.62, 1.84], [0, 1.86]]],
      [3.42, [[0, 1.15], [0.66, 1.15], [0.68, 1.66], [0.58, 1.78], [0, 1.8]]],
    ], { color: PACT }),
    P.box(1.2, 0.5, 0.04, { y: 1.42, z: 3.44, color: 0x1e1e1c }),                                      // grille
    ...[-0.45, -0.27, -0.09, 0.09, 0.27, 0.45].map((x) => P.box(0.04, 0.48, 0.03, { x, y: 1.42, z: 3.465, color: PACT_DK })),
    stationHull([
      [1.0, [[0, 1.2], [1.15, 1.2], [1.15, 2.32], [1.04, 2.52], [0, 2.54]]],
      [2.42, [[0, 1.2], [1.15, 1.2], [1.15, 2.28], [1.04, 2.46], [0, 2.48]]],
    ], { color: PACT }),
    ...pair((s) => P.box(0.86, 0.46, 0.03, { x: s * 0.5, y: 2.06, z: 2.44, rx: -0.08, color: GLASS })),  // two-piece windscreen
    ...pair((s) => P.box(0.03, 0.42, 0.7, { x: s * 1.16, y: 2.05, z: 1.95, color: GLASS })),            // door windows
    ...pair((s) => P.box(0.02, 0.05, 0.25, { x: s * 1.17, y: 1.65, z: 1.55, color: STEEL })),           // door handles
    // front fenders over the wheels, headlights on them, bumper, tow hooks
    ...pair((s) => P.box(0.48, 0.06, 1.3, { x: s * 0.98, y: 1.42, z: 2.35, color: PACT_DK })),
    ...pair((s) => P.box(0.48, 0.06, 0.45, { x: s * 0.98, y: 1.25, z: 3.1, rx: 0.5, color: PACT_DK })),
    ...pair((s) => P.box(0.48, 0.4, 0.06, { x: s * 0.98, y: 1.22, z: 1.68, color: PACT_DK })),
    ...pair((s) => P.cyl(0.11, 0.11, 0.12, { x: s * 0.95, y: 1.6, z: 2.92, rx: Math.PI / 2, color: PACT_DK }, 12)),
    ...pair((s) => P.cyl(0.09, 0.09, 0.02, { x: s * 0.95, y: 1.6, z: 2.99, rx: Math.PI / 2, color: GLASS }, 12)),
    P.box(2.3, 0.2, 0.14, { y: 1.0, z: 3.6, color: STEEL }),
    ...pair((s) => P.box(0.1, 0.12, 0.16, { x: s * 0.6, y: 0.88, z: 3.64, color: STEEL })),
    // spare wheel behind the cab, fuel tanks, rear fenders over the tandem axles, rear lights
    P.cyl(0.55, 0.55, 0.3, { y: 1.75, z: 0.72, rx: Math.PI / 2, color: 0x1e1e1c, surf: 'rubber' }, 16),
    P.cyl(0.3, 0.3, 0.32, { y: 1.75, z: 0.72, rx: Math.PI / 2, color: PACT_DK }, 12),
    ...pair((s) => P.cyl(0.22, 0.22, 0.9, { x: s * 0.85, y: 0.95, z: 0.55, rx: Math.PI / 2, color: PACT_DK }, 12)),
    ...pair((s) => P.box(0.46, 0.05, 2.15, { x: s * 1.0, y: 1.25, z: -1.32, color: PACT_DK })),
    ...pair((s) => P.box(0.46, 0.35, 0.05, { x: s * 1.0, y: 1.08, z: -2.42, color: PACT_DK })),
    ...pair((s) => P.box(0.12, 0.08, 0.04, { x: s * 0.9, y: 1.05, z: -3.38, color: 0x5a1a14 })),
    // the launcher's turntable bed
    P.box(2.0, 0.22, 3.4, { y: 1.15, z: -1.3, color: PACT_DK }),
  ]), 1.0, 0.4),
  turret: {
    geo: merge([
      P.cyl(0.8, 0.85, 0.25, { y: 0.12, color: PACT_DK }, 16),
      ...pair((s) => P.box(0.1, 0.5, 0.6, { x: s * 0.55, y: 0.45, z: 0.0, color: PACT_DK })),            // trunnion brackets
    ]),
    at: [0, 1.25, -1.3],
  },
  gun: { // the 40-tube pack: four rows of ten 122 mm tubes in their frame
    geo: merge([
      ...Array.from({ length: 10 }, (_, i) => Array.from({ length: 4 }, (_, j) => P.cyl(0.075, 0.075, 3.0, { x: -0.9 + i * 0.2, y: 0.2 + j * 0.2, z: 0.5, rx: Math.PI / 2, color: PACT }, 8))).flat(),
      ...Array.from({ length: 10 }, (_, i) => Array.from({ length: 4 }, (_, j) => P.cyl(0.055, 0.055, 0.02, { x: -0.9 + i * 0.2, y: 0.2 + j * 0.2, z: 2.0, rx: Math.PI / 2, color: 0x141414 }, 8))).flat(),
      ...[-0.85, 0.5, 1.85].flatMap((z) => [
        P.box(2.2, 0.05, 0.12, { y: 0.07, z, color: STEEL }), P.box(2.2, 0.05, 0.12, { y: 0.88, z, color: STEEL }),
        ...pair((s) => P.box(0.05, 0.85, 0.12, { x: s * 1.08, y: 0.48, z, color: STEEL })),
      ]),
      P.box(0.5, 0.25, 2.6, { y: -0.1, z: 0.5, color: PACT_DK }),                                       // cradle
    ]),
    at: [0, 0.45, 0],
    pitch: 0.6,
  },
  muzzle: [0, 0.5, 2.1],
  recoil: 0.03,
  marks: merge([P.box(0.02, 0.35, 0.35, { x: 1.165, y: 1.75, z: 1.4 })]),
}));

// ---------------------------------------------------------------- Pact: 2S9 Nona

export const buildPactNona = vehicle(() => {
  const g = tracked({ halfWidth: 1.15, length: 4.1, wheels: 6, wheelR: 0.25, sprocket: -1, rollers: 4, trackWidth: 0.32, wheelColor: PACT_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      // the long, low BTR-D hull with its pointed glacis
      trackedHull([[-2.85, 1.25, 0.5], [-2.6, 1.3, 0.45], [1.4, 1.35, 0.45], [2.6, 0.97, 0.5], [2.95, 0.92, 0.68]],
        { belly: 0.97, fender: 1.33, fenderY: 0.84, chamfer: 0.06 }, { color: PACT }),
      ...Array.from({ length: 5 }, (_, i) => P.box(2.0 - i * 0.12, 0.03, 0.05, { y: 1.31 - i * 0.075, z: 1.6 + i * 0.22, rx: 0.33, color: PACT_DK })), // glacis ribs
      P.box(0.5, 0.05, 0.45, { x: -0.4, y: 1.37, z: 1.25, color: PACT_DK }),                             // driver's hatch
      ...[-0.15, 0.15].map((x) => P.box(0.1, 0.06, 0.04, { x: -0.4 + x, y: 1.39, z: 1.5, rx: 0.3, color: GLASS })),
      ...[-2.3, -1.6].flatMap((z) => pair((s) => P.box(0.55, 0.05, 0.55, { x: s * 0.4, y: 1.33, z, color: PACT_DK }))), // roof hatches
      P.box(1.6, 0.04, 0.6, { y: 1.29, z: -2.65, color: PACT_DK }),                                     // engine louvres
      ...pair((s) => P.cyl(0.06, 0.06, 0.08, { x: s * 0.9, y: 1.02, z: 2.6, rx: Math.PI / 2 - 0.35, color: STEEL }, 10)),
      ...pair((s) => P.box(0.05, 0.05, 5.6, { x: s * 1.33, y: 0.84, z: 0.0, color: PACT_DK })),
    ]), 1.1, 0.3),
    turret: {
      geo: merge([
        stationHull([
          [0.0, [[0, -0.95], [0.75, -0.95], [1.0, -0.5], [1.0, 0.4], [0.62, 1.1], [0, 1.15]]],
          [0.58, [[0, -0.85], [0.65, -0.85], [0.85, -0.45], [0.85, 0.35], [0.5, 0.95], [0, 1.0]]],
        ], { color: PACT }, 'y'),
        P.cyl(0.26, 0.28, 0.08, { x: -0.38, y: 0.62, z: -0.2, color: PACT }, 14),                     // commander's hatch
        ...[0, 1, 2, 3].map((k) => P.box(0.08, 0.06, 0.03, { x: -0.38 + Math.sin(k * 0.5 - 0.75) * 0.27, y: 0.66, z: -0.2 + Math.cos(k * 0.5 - 0.75) * 0.27, ry: k * 0.5 - 0.75, color: GLASS })),
        P.box(0.22, 0.22, 0.25, { x: 0.4, y: 0.68, z: 0.35, color: PACT }),                           // gunner's sight
        P.box(0.16, 0.12, 0.02, { x: 0.4, y: 0.7, z: 0.48, color: GLASS }),
        ...pair((s) => merge([0, 1, 2].map((k) => P.cyl(0.045, 0.045, 0.2, { x: s * (0.78 - k * 0.1), y: 0.4, z: 0.75 - k * 0.06, rx: -0.9, rz: s * 0.35, color: STEEL }, 8)))),
        P.box(0.6, 0.42, 0.3, { y: 0.3, z: 1.05, color: PACT }),                                       // mantlet
        P.cyl(0.01, 0.01, 1.5, { x: 0.6, y: 1.2, z: -0.6, color: STEEL }, 4),                         // aerial
      ]),
      at: [0, 1.34, -0.5],
    },
    gun: { // 2A51 120 mm gun-mortar: short and fat, no muzzle brake
      geo: merge([
        P.cyl(0.12, 0.13, 1.7, { z: 0.85, rx: Math.PI / 2, color: PACT_DK }, 14),
        P.cyl(0.15, 0.15, 0.4, { z: 0.25, rx: Math.PI / 2, color: PACT }, 14),
        P.cyl(0.135, 0.135, 0.06, { z: 1.68, rx: Math.PI / 2, color: STEEL }, 14),
      ]),
      at: [0, 0.32, 1.05],
      pitch: 0.85,
    },
    muzzle: [0, 0, 1.75],
    recoil: 0.25,
    marks: merge([P.box(0.02, 0.3, 0.3, { x: 1.345, y: 1.05, z: -0.6 })]), // on the hull side, above the fender
  };
});

// ---------------------------------------------------------------- Pact: the MT-LB family

const mtlbHull = (extra = [], roof = 1.55) => {
  const g = tracked({ halfWidth: 1.25, length: 4.6, wheels: 6, wheelR: 0.28, sprocket: 1, rollers: 0, trackWidth: 0.35, wheelColor: PACT_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      // the low flat hull: belly between the tracks, sides over them, the sloped nose
      stationHull([
        [-3.22, [[0, 0.5], [1.03, 0.5], [1.03, 0.98], [1.45, 0.98], [1.45, roof - 0.05], [1.4, roof], [0, roof]]],
        [1.8, [[0, 0.45], [1.03, 0.45], [1.03, 0.98], [1.45, 0.98], [1.45, roof - 0.05], [1.4, roof], [0, roof]]],
        [2.95, [[0, 0.55], [1.03, 0.55], [1.03, 0.98], [1.45, 0.98], [1.45, 1.1], [1.4, 1.12], [0, 1.12]]],
        [3.2, [[0, 0.82], [1.0, 0.82], [1.0, 0.95], [1.4, 0.95], [1.4, 0.98], [1.36, 1.0], [0, 1.0]]],
      ], { color: PACT }),
      ...pair((s) => P.box(0.7, 0.8, 0.08, { x: s * 0.5, y: 1.0, z: -3.25, color: PACT_DK })),       // rear doors
      ...pair((s) => P.box(0.04, 0.16, 0.05, { x: s * 0.22, y: 1.05, z: -3.3, color: STEEL })),
      // cab windows (driver and commander), roof hatches, headlights, the exhaust on the left
      ...pair((s) => P.box(0.45, 0.2, 0.04, { x: s * 0.55, y: roof - 0.12, z: 1.85, rx: 0.2, color: GLASS })),
      ...[-2.2, -1.1].flatMap((z) => pair((s) => P.box(0.7, 0.05, 0.75, { x: s * 0.45, y: roof + 0.02, z, color: PACT_DK }))),
      ...pair((s) => P.cyl(0.07, 0.07, 0.1, { x: s * 1.1, y: 1.15, z: 3.0, rx: Math.PI / 2 - 0.6, color: STEEL }, 10)),
      P.box(0.12, 0.25, 0.7, { x: -1.47, y: 1.3, z: 0.9, color: STEEL }),
      ...pair((s) => P.box(0.06, 0.05, 6.3, { x: s * 1.46, y: 0.98, z: -0.1, color: PACT_DK })),
      ...extra,
    ]), 1.1, 0.3),
  };
};

export const buildPactStrela = vehicle(() => ({
  ...mtlbHull(),
  turret: { geo: merge([P.cyl(0.6, 0.65, 0.5, { y: 0.25, color: PACT }, 12)]), at: [0, 1.55, -0.6] },
  gun: { // four boxy missile containers on the turret's arms
    geo: merge([
      P.box(2.2, 0.15, 0.25, { color: STEEL }),
      ...[-0.9, -0.55, 0.55, 0.9].map((x) => P.box(0.3, 0.3, 2.2, { x, y: 0.22, z: 0.5, color: PACT_DK })),
    ]),
    at: [0, 0.75, 0],
    pitch: null,
  },
  muzzle: [0.55, 0.22, 1.65],
  marks: merge([P.box(0.02, 0.3, 0.3, { x: 1.465, y: 1.2, z: 0.6 })]),
}));

export const buildPactAmbulance = vehicle(() => ({
  ...mtlbHull([
    P.box(2.6, 0.6, 3.0, { y: 1.85, z: -1.5, color: PACT }),
    ...cross({ x: 1.48, y: 1.25, z: -1.4 }),
    ...cross({ x: -1.48, y: 1.25, z: -1.4 }),
    ...cross({ y: 2.16, z: -1.5, rz: Math.PI / 2 }),
  ]),
  muzzle: [0, 2, 0],
}));

// ---------------------------------------------------------------- Pact: BREM-1

export const buildPactBREM = vehicle(() => {
  const g = tracked({ halfWidth: 1.45, length: 4.9, wheels: 6, wheelR: 0.36, sprocket: -1, rollers: 3, trackWidth: 0.58, wheelColor: PACT_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      // the T-72 hull (fender shelf, flat glacis), the boxy crew superstructure in place of the turret
      trackedHull([[-3.4, 1.3, 0.5], [-3.1, 1.38, 0.45], [2.3, 1.42, 0.45], [3.3, 1.02, 0.6], [3.5, 0.94, 0.8]],
        { belly: 1.15, fender: 1.74, fenderY: 1.08, chamfer: 0.05 }, { color: PACT }),
      stationHull([
        [-1.6, [[0, 1.4], [1.0, 1.4], [1.0, 2.25], [0.85, 2.4], [0, 2.4]]],
        [0.4, [[0, 1.4], [1.0, 1.4], [1.0, 2.25], [0.85, 2.4], [0, 2.4]]],
        [0.9, [[0, 1.4], [1.0, 1.4], [1.0, 1.8], [0.85, 1.9], [0, 1.9]]],
      ], { color: PACT }),
      ...[-0.6, -0.2, 0.2, 0.6].map((x) => P.box(0.14, 0.08, 0.04, { x, y: 2.1, z: 0.66, rx: 0.8, color: GLASS })),
      // crane jib stowed along the right, its pedestal; dozer blade; stowage platform; fuel drums
      P.cyl(0.3, 0.35, 0.4, { x: 1.25, y: 1.62, z: 1.9, color: PACT_DK }, 12),
      P.box(0.25, 0.25, 4.2, { x: 1.25, y: 1.95, z: -0.2, rx: 0.08, color: PACT_DK }),
      P.box(0.14, 0.3, 0.14, { x: 1.25, y: 1.8, z: -2.3, color: STEEL }),
      P.box(3.5, 0.7, 0.2, { y: 0.62, z: 3.65, rx: 0.2, color: PACT_DK }),
      ...pair((s) => P.box(0.14, 0.14, 0.8, { x: s * 1.2, y: 0.8, z: 3.25, rx: 0.4, color: STEEL })),
      P.box(2.0, 0.08, 1.4, { y: 1.42, z: -2.5, color: STEEL }),
      ...[-0.8, 0.8].map((x) => P.box(0.05, 0.4, 1.4, { x, y: 1.62, z: -2.5, color: STEEL })),
      P.box(1.4, 0.4, 1.0, { x: -0.3, y: 1.66, z: -2.5, color: 0x4d5236 }),
      ...pair((s) => P.cyl(0.3, 0.3, 1.0, { x: s * 0.72, y: 1.7, z: -3.25, rz: Math.PI / 2, color: PACT_DK }, 16)),
      ...pair((s) => P.box(0.04, 0.44, 6.4, { x: s * 1.72, y: 0.88, z: -0.2, color: 0x1f201c, surf: 'rubber' })), // rubber skirts
      ...pair((s) => P.cyl(0.08, 0.08, 0.1, { x: s * 1.3, y: 1.18, z: 3.0, rx: Math.PI / 2, color: STEEL }, 10)),
    ]), 1.2, 0.3),
    turret: { // the commander's cupola with the NSVT
      geo: merge([
        P.cyl(0.4, 0.45, 0.3, { color: PACT }, 14),
        ...[0, 1, 2, 3].map((k) => P.box(0.09, 0.06, 0.03, { x: Math.sin(k * 0.6 - 0.9) * 0.42, y: 0.1, z: Math.cos(k * 0.6 - 0.9) * 0.42, ry: k * 0.6 - 0.9, color: GLASS })),
        P.box(0.12, 0.14, 0.4, { y: 0.28, z: 0.1, color: STEEL }),
      ]),
      at: [-0.5, 2.42, -0.6],
    },
    gun: { geo: merge([P.cyl(0.025, 0.025, 1.2, { z: 0.6, rx: Math.PI / 2, color: STEEL }, 6)]), at: [0, 0.3, 0.2] },
    muzzle: [0, 0, 1.2],
    marks: merge([P.box(0.02, 0.3, 0.3, { x: 1.005, y: 2.0, z: -0.8 })]),
  };
});

// ---------------------------------------------------------------- NATO: M3 Bradley CFV

/** The cavalry Bradley: no firing ports, the TOW box on the turret's left, extra stowage. */
export const buildNatoM3 = vehicle(() => {
  const g = tracked({ halfWidth: 1.4, length: 4.6, wheels: 6, wheelR: 0.31, sprocket: 1, rollers: 3, trackWidth: 0.5, wheelColor: NATO_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      // the Bradley hull (as natoBradley.js): chamfered upper edges, long upper glacis, short lower one
      stationHull([
        [-3.2, [[0, 0.5], [1.15, 0.5], [1.15, 1.15], [1.64, 1.15], [1.64, 1.7], [1.44, 1.93], [0, 1.93]]],
        [1.5, [[0, 0.45], [1.15, 0.45], [1.15, 1.15], [1.64, 1.15], [1.64, 1.72], [1.44, 1.95], [0, 1.95]]],
        [2.75, [[0, 0.45], [1.15, 0.45], [1.15, 1.15], [1.64, 1.15], [1.64, 1.45], [1.46, 1.53], [0, 1.53]]],
        [3.15, [[0, 0.75], [1.15, 0.75], [1.15, 1.12], [1.6, 1.12], [1.6, 1.3], [1.44, 1.36], [0, 1.37]]],
        [3.3, [[0, 0.98], [1.1, 0.98], [1.1, 1.1], [1.54, 1.1], [1.54, 1.22], [1.4, 1.27], [0, 1.28]]],
      ], { color: NATO, ...C }),
      P.box(0.05, 0.35, 0.7, { x: 1.66, y: 1.5, z: 1.9, color: STEEL }),                                // exhaust grille
      ...[1.65, 1.8, 1.95, 2.1].map((z) => P.box(0.03, 0.3, 0.04, { x: 1.685, y: 1.5, z, color: NATO_DK })),
      ...pair((s) => P.box(0.06, 0.62, 5.6, { x: s * 1.68, y: 0.9, z: -0.1, color: NATO, ...C })),     // side skirts
      ...pair((s) => P.box(0.08, 0.05, 5.6, { x: s * 1.7, y: 1.32, z: -0.1, color: NATO_DK })),
      P.box(2.6, 0.06, 0.9, { y: 1.66, z: 2.35, rx: 0.32, color: NATO_DK }),                            // trim vane, folded on the glacis
      P.box(2.2, 1.35, 0.06, { y: 1.25, z: -3.2, color: NATO_DK }),                                     // ramp
      P.box(1.3, 0.45, 0.8, { x: -0.7, y: 2.15, z: -2.4, color: 0x4d5236 }),                            // scouts' kit on the roof
      P.cyl(0.25, 0.25, 1.4, { x: 0.6, y: 2.2, z: -2.4, rz: Math.PI / 2, color: 0x56583e }, 10),       // bedroll
      P.box(0.55, 0.1, 0.55, { x: -0.8, y: 1.98, z: 1.1, color: NATO_DK }),                             // driver's hatch
    ]), 1.25, 0.3),
    turret: {
      geo: grime(merge([
        planProfile([[-0.9, 1.25], [0.9, 1.25], [1.1, 0.6], [1.1, -1.0], [-1.1, -1.0], [-1.1, 0.6]], 0.85, { color: NATO, ...C }),
        P.box(0.6, 0.6, 1.25, { x: -1.45, y: 0.55, z: -0.05, color: NATO, ...C }),                     // TOW box…
        ...pair((s) => P.cyl(0.13, 0.13, 0.04, { x: -1.45 + s * 0.15, y: 0.55, z: 0.6, rx: Math.PI / 2, color: 0x1e1e1c }, 10)), // …two tubes
        P.box(0.35, 0.4, 0.4, { x: 0.65, y: 1.05, z: 0.4, color: NATO_DK }),                            // ISU sight
        P.cyl(0.32, 0.34, 0.15, { x: 0.45, y: 0.9, z: -0.45, color: NATO_DK }, 12),                     // commander's hatch
        ...pair((s) => P.box(0.18, 0.22, 0.4, { x: s * 1.0, y: 0.75, z: 0.9, ry: s * 0.4, color: NATO_DK })), // smoke dischargers
        P.box(1.8, 0.35, 0.5, { y: 0.4, z: -1.2, color: NATO_DK }),                                     // bustle stowage
      ]), 0.9, 0, 0.4),
      at: [0.2, 1.95, 0.15],
    },
    gun: {
      geo: merge([
        P.box(0.4, 0.35, 0.5, { color: NATO }),
        P.cyl(0.05, 0.06, 2.3, { z: 1.4, rx: Math.PI / 2, color: STEEL }, 8),
        P.cyl(0.08, 0.08, 0.3, { z: 2.5, rx: Math.PI / 2, color: STEEL }, 8),                          // flash hider
        P.cyl(0.03, 0.03, 0.9, { x: 0.25, z: 0.6, rx: Math.PI / 2, color: STEEL }, 6),                 // coax
      ]),
      at: [0.15, 0.5, 1.2],
    },
    muzzle: [0, 0, 2.7],
    recoil: 0.1,
    marks: merge([P.box(0.02, 0.32, 0.55, { x: 1.66, y: 1.65, z: -1.8 })]),
  };
});

// ---------------------------------------------------------------- bridge layers

/**
 * The folded scissors bridge a bridge layer carries: two treadway halves lying one on the
 * other along the hull, the hinge at the front, girders along the sides.
 */
const scissors = ({ y, length, width, color, dark }) => merge([
  ...[0, 1].map((k) => P.box(width, 0.24, length, { y: y + k * 0.26, color: k ? color : dark, ...C })),
  ...pair((s) => P.box(0.12, 0.5, length, { x: s * (width / 2 - 0.06), y: y + 0.13, color: dark })),
  P.box(0.3, 0.5, width * 0.18, { y: y + 0.13, z: length / 2 + 0.1, color: STEEL }),                  // the hinge
  P.box(width * 0.06, 0.52, 0.35, { y: y + 0.13, z: length / 2 + 0.1, color: STEEL }),
  ...[-0.3, 0.1, 0.5].map((f) => P.box(width - 0.2, 0.04, 0.12, { y: y + 0.4, z: f * length, color: STEEL })), // deck cleats, on the top half (its top at y + 0.38)
]);

/** M60 AVLB: an M60 hull carrying an 18 m scissors bridge, the launcher arm at the front. */
export const buildNatoAVLB = vehicle(() => {
  const g = tracked({ halfWidth: 1.45, length: 4.9, wheels: 6, wheelR: 0.33, sprocket: -1, rollers: 3, trackWidth: 0.6, wheelColor: NATO_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.3, 1.45, 0.5], [-3.0, 1.55, 0.45], [2.4, 1.6, 0.45], [3.3, 1.1, 0.6], [3.5, 0.98, 0.8]],
        { belly: 1.15, fender: 1.72, fenderY: 1.1, chamfer: 0.05 }, { color: NATO, ...C }),
      // the low launcher cab where the turret would be, the hydraulic arm and its cylinders
      stationHull([[-0.6, [[0, 1.55], [0.9, 1.55], [0.9, 1.95], [0.75, 2.05], [0, 2.05]]], [1.0, [[0, 1.55], [0.9, 1.55], [0.9, 1.95], [0.75, 2.05], [0, 2.05]]]], { color: NATO, ...C }),
      ...pair((s) => P.box(0.22, 0.22, 1.6, { x: s * 0.75, y: 1.75, z: 2.6, rx: 0.25, color: NATO_DK })),
      ...pair((s) => P.cyl(0.09, 0.09, 1.2, { x: s * 0.75, y: 1.5, z: 2.9, rx: Math.PI / 2 + 0.5, color: STEEL }, 8)),
      P.box(2.6, 0.18, 0.3, { y: 1.3, z: 3.55, color: NATO_DK }),                                    // the front spade
      ...pair((s) => P.box(0.2, 0.14, 0.1, { x: s * 1.45, y: 1.25, z: 3.45, color: STEEL })),
      ...pair((s) => P.box(0.06, 0.55, 6.6, { x: s * 1.75, y: 0.85, z: 0.0, color: NATO, ...C })),   // side skirts
    ]), 1.2, 0.3),
    load: grime(scissors({ y: 2.1, length: 9.4, width: 3.8, color: NATO, dark: NATO_DK }), 1.2, 0.3),
    marks: merge([P.box(0.02, 0.3, 0.6, { x: 1.77, y: 1.3, z: -1.2 })]),
  };
});

/** MTU-20: a T-55 hull with its 20 m bridge, the two halves folded on the deck. */
export const buildPactMTU = vehicle(() => {
  const g = tracked({ halfWidth: 1.4, length: 4.6, wheels: 5, wheelR: 0.4, sprocket: -1, rollers: 0, trackWidth: 0.58, wheelColor: PACT_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.2, 1.35, 0.5], [-2.9, 1.45, 0.45], [2.2, 1.5, 0.45], [3.1, 1.0, 0.6], [3.3, 0.92, 0.8]],
        { belly: 1.1, fender: 1.66, fenderY: 1.05, chamfer: 0.05 }, { color: PACT }),
      ...pair((s) => P.box(0.2, 0.5, 6.0, { x: s * 1.25, y: 1.75, z: -0.2, color: PACT_DK })),       // the launching rails
      ...pair((s) => P.cyl(0.1, 0.1, 1.4, { x: s * 0.9, y: 1.6, z: 2.5, rx: Math.PI / 2 + 0.4, color: STEEL }, 8)),
      ...pair((s) => P.cyl(0.3, 0.3, 1.0, { x: s * 0.72, y: 1.7, z: -3.0, rz: Math.PI / 2, color: PACT_DK }, 16)), // fuel drums
      ...pair((s) => P.cyl(0.08, 0.08, 0.1, { x: s * 1.2, y: 1.12, z: 3.0, rx: Math.PI / 2, color: STEEL }, 10)),
    ]), 1.2, 0.3),
    load: grime(scissors({ y: 2.05, length: 9.8, width: 3.4, color: PACT, dark: PACT_DK }), 1.2, 0.3),
    marks: merge([P.box(0.02, 0.3, 0.3, { x: 1.67, y: 1.3, z: -0.8 })]),
  };
});


// ---------------------------------------------------------------- NATO: M728 CEV

/** M728 combat engineer vehicle: an M60A1 with the short 165 mm demolition gun, the A-frame boom
 *  laid back over the turret, the M9 dozer blade on the front. */
export const buildNatoCEV = vehicle(() => {
  const g = tracked({ halfWidth: 1.45, length: 4.9, wheels: 6, wheelR: 0.33, sprocket: -1, rollers: 3, trackWidth: 0.6, wheelColor: NATO_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.3, 1.45, 0.5], [-3.0, 1.55, 0.45], [2.4, 1.6, 0.45], [3.3, 1.1, 0.6], [3.5, 0.98, 0.8]],
        { belly: 1.15, fender: 1.72, fenderY: 1.1, chamfer: 0.05 }, { color: NATO, ...C }),
      // the dozer blade on its push arms and lift rams
      loft([[0, 0.25, 3.95, 1.85, 0.06, 6], [0, 0.65, 3.85, 1.85, 0.09, 6], [0, 1.05, 3.92, 1.85, 0.07, 6]], { color: NATO_DK }, 4),
      ...pair((s) => P.box(0.16, 0.16, 1.4, { x: s * 1.5, y: 0.55, z: 3.2, rx: 0.12, color: STEEL })),
      ...pair((s) => P.cyl(0.07, 0.07, 1.0, { x: s * 0.9, y: 1.05, z: 3.4, rx: Math.PI / 2 - 0.7, color: STEEL }, 8)),
      ...pair((s) => P.box(0.2, 0.14, 0.1, { x: s * 1.45, y: 1.3, z: 3.42, color: STEEL })),            // headlight guards
      P.cyl(0.32, 0.32, 1.2, { y: 1.35, z: -3.25, rz: Math.PI / 2, color: NATO_DK }, 12),               // the boom winch at the rear
      ...pair((s) => P.box(0.06, 0.55, 6.6, { x: s * 1.75, y: 0.85, z: 0.0, color: NATO, ...C })),     // side skirts
      P.box(1.0, 0.35, 0.8, { x: -1.0, y: 1.75, z: -2.4, color: 0x4d5236 }),                           // stowage on the deck
    ]), 1.2, 0.3),
    turret: {
      geo: grime(merge([
        // the cast M60A1 turret: long narrow nose, flat sides, bustle
        planProfile([[-0.55, 1.65], [0.55, 1.65], [1.2, 0.7], [1.25, -1.1], [0.9, -1.5], [-0.9, -1.5], [-1.25, -1.1], [-1.2, 0.7]], 0.75, { color: NATO, ...C }),
        P.cyl(0.42, 0.45, 0.32, { x: 0.55, y: 0.9, z: -0.3, color: NATO_DK }, 14),                       // M19 cupola…
        P.box(0.1, 0.1, 0.55, { x: 0.55, y: 1.1, z: -0.1, color: STEEL }),                               // …and its .50
        // the A-frame boom: hinged at the turret's cheeks, laid back over the roof and bustle
        ...pair((s) => P.box(0.16, 0.16, 3.6, { x: s * 0.85, y: 0.95, z: -0.55, rx: 0.1, color: NATO_DK })),
        P.box(1.9, 0.16, 0.16, { y: 0.77, z: -2.3, color: NATO_DK }),
        ...pair((s) => P.box(0.26, 0.3, 0.3, { x: s * 0.95, y: 0.55, z: 1.2, color: STEEL })),
        P.cyl(0.02, 0.02, 3.2, { y: 1.05, z: -0.6, rx: Math.PI / 2 + 0.1, color: STEEL }, 5),
        P.box(1.6, 0.3, 0.5, { y: 0.45, z: -1.8, color: 0x4d5236 }),                                    // bustle rack
      ]), 0.8, 0, 0.4),
      at: [0, 1.62, 0.1],
    },
    gun: {
      geo: merge([
        P.box(0.6, 0.5, 0.35, { z: 0.1, color: NATO, ...C }),                                           // mantlet
        P.cyl(0.13, 0.13, 1.35, { z: 0.85, rx: Math.PI / 2, color: NATO_DK }, 14),                     // the stubby M135 barrel
        P.cyl(0.155, 0.155, 0.14, { z: 1.55, rx: Math.PI / 2, color: STEEL }, 14),                     // muzzle ring
      ]),
      at: [0, 0.4, 1.55],
    },
    muzzle: [0, 0, 1.65],
    recoil: 0.35,
    marks: merge([P.box(0.02, 0.3, 0.6, { x: 1.77, y: 1.3, z: -1.2 })]),
  };
});

// ---------------------------------------------------------------- Pact: IMR-2

/** IMR-2 obstacle-clearing vehicle: a T-72 hull, the V-plough blade in front, and on the turret
 *  ring the armoured operator's cab and the telescopic crane jib with its grab. */
export const buildPactIMR = vehicle(() => {
  const g = tracked({ halfWidth: 1.45, length: 4.9, wheels: 6, wheelR: 0.36, sprocket: -1, rollers: 3, trackWidth: 0.58, wheelColor: PACT_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.4, 1.3, 0.5], [-3.1, 1.38, 0.45], [2.3, 1.42, 0.45], [3.3, 1.02, 0.6], [3.5, 0.94, 0.8]],
        { belly: 1.15, fender: 1.74, fenderY: 1.08, chamfer: 0.05 }, { color: PACT }),
      // the universal blade: two halves in a V (it ploughs a lane or pushes as a dozer)
      ...pair((s) => P.box(1.95, 0.95, 0.14, { x: s * 0.92, y: 0.62, z: 3.55, ry: s * 0.32, rx: 0.15, color: PACT_DK })), // apex forward
      ...pair((s) => P.box(0.14, 0.14, 1.5, { x: s * 1.35, y: 0.62, z: 3.05, rx: 0.15, color: STEEL })),
      ...pair((s) => P.cyl(0.07, 0.07, 1.0, { x: s * 0.7, y: 1.05, z: 3.25, rx: Math.PI / 2 - 0.6, color: STEEL }, 8)),
      ...pair((s) => P.cyl(0.3, 0.3, 1.0, { x: s * 0.72, y: 1.7, z: -3.25, rz: Math.PI / 2, color: PACT_DK }, 16)), // fuel drums
      ...pair((s) => P.box(0.04, 0.44, 6.4, { x: s * 1.72, y: 0.88, z: -0.2, color: 0x1f201c, surf: 'rubber' })),  // rubber skirts
      P.box(1.6, 0.35, 0.9, { x: 0.3, y: 1.6, z: -2.2, color: 0x4d5236 }),                             // stowage
    ]), 1.2, 0.3),
    turret: {
      geo: grime(merge([
        P.cyl(0.85, 0.9, 0.3, { color: PACT }, 16),                                                   // the rotating platform
        // the operator's armoured cab on the left, its vision slots and searchlight
        stationHull([[-0.2, [[0, 0.15], [0.55, 0.15], [0.55, 1.05], [0.45, 1.15], [0, 1.15]]], [1.0, [[0, 0.15], [0.55, 0.15], [0.55, 0.85], [0.45, 0.95], [0, 0.95]]]], { color: PACT }),
        ...[-0.25, 0, 0.25].map((x) => P.box(0.14, 0.07, 0.03, { x: x - 0.0, y: 0.82, z: 1.0, rx: 0.5, color: GLASS })),
        P.cyl(0.09, 0.09, 0.12, { x: 0.35, y: 1.2, z: 0.6, rx: Math.PI / 2, color: STEEL }, 10),
        P.box(0.55, 0.5, 0.6, { x: 0.55, y: 0.45, z: -0.4, color: PACT_DK }),                           // crane slewing gear
      ]), 0.8, 0, 0.4),
      at: [-0.45, 1.45, 0.2],
    },
    gun: { // the jib: two telescoping box sections and the grab hanging from its end
      geo: merge([
        P.box(0.34, 0.34, 3.2, { z: 1.4, color: PACT_DK }),
        P.box(0.24, 0.24, 1.6, { z: 3.3, color: PACT }),
        P.box(0.18, 0.18, 0.5, { y: -0.15, z: 4.1, rx: 1.2, color: STEEL }),
        ...pair((s) => P.box(0.06, 0.45, 0.14, { x: s * 0.12, y: -0.5, z: 4.25, rz: s * 0.25, color: STEEL })), // the grab's jaws
        P.cyl(0.08, 0.08, 1.1, { y: -0.25, z: 0.7, rx: Math.PI / 2 - 0.35, color: STEEL }, 8),       // luffing ram
      ]),
      at: [0.55, 0.75, -0.2],
      pitch: 0.12,
    },
    muzzle: [0, -0.6, 4.3],
    recoil: 0,
    marks: merge([P.box(0.02, 0.3, 0.3, { x: 1.76, y: 1.2, z: -0.8 })]),
  };
});


// ---------------------------------------------------------------- towed AA guns (with their gunner)

/** A seated gunner facing +z (helmet and kit in the side's colours), for the open gun mounts. */
const gunner = ({ x = 0, y = 0, z = 0, cloth, helmet, skin = 0xb38f74 }) => [
  P.box(0.36, 0.5, 0.26, { x, y: y + 0.52, z, rx: 0.12, color: cloth, ...C }),                     // trunk, leaning in
  P.sphere(0.11, { x, y: y + 0.9, z: z + 0.06, color: skin }, 10, 8),                               // head
  P.sphere(0.135, { x, y: y + 0.97, z: z + 0.05, sy: 0.75, color: helmet }, 10, 6),                 // helmet
  ...pair((s) => P.box(0.12, 0.13, 0.42, { x: x + s * 0.1, y: y + 0.27, z: z + 0.22, color: cloth, ...C })),  // thighs, seated
  ...pair((s) => P.box(0.11, 0.42, 0.12, { x: x + s * 0.1, y: y + 0.03, z: z + 0.42, color: cloth, ...C })),  // shins
  ...pair((s) => P.box(0.09, 0.09, 0.4, { x: x + s * 0.2, y: y + 0.6, z: z + 0.25, rx: 0.3, color: cloth, ...C })), // arms to the handwheels
];

/** M167 towed Vulcan: the six-barrel 20 mm on a two-wheeled carriage, levelling jacks down,
 *  the gunner in his seat behind the gun with the range-only radar dish beside him. */
export const buildNatoM167 = vehicle(() => ({
  hull: grime(merge([
    P.box(0.9, 0.32, 2.2, { y: 0.55, color: NATO, ...C }),                                           // carriage
    ...pair((s) => P.cyl(0.33, 0.33, 0.22, { x: s * 0.72, y: 0.33, z: -0.25, rz: Math.PI / 2, color: 0x1f201c, surf: 'rubber' }, 16)), // wheels
    ...pair((s) => P.cyl(0.14, 0.14, 0.24, { x: s * 0.72, y: 0.33, z: -0.25, rz: Math.PI / 2, color: NATO_DK }, 10)),
    P.box(0.14, 0.12, 1.3, { y: 0.48, z: 1.65, rx: 0.12, color: NATO_DK }),                           // tow bar…
    P.cyl(0.07, 0.07, 0.1, { y: 0.4, z: 2.3, color: STEEL }, 8),                                      // …and its lunette
    ...[[-0.5, 1.0], [0.5, 1.0], [-0.5, -1.05], [0.5, -1.05]].map(([x, z]) => P.box(0.1, 0.55, 0.1, { x, y: 0.28, z, color: STEEL })), // jacks
    ...[[-0.5, 1.0], [0.5, 1.0], [-0.5, -1.05], [0.5, -1.05]].map(([x, z]) => P.box(0.22, 0.03, 0.22, { x, y: 0.02, z, color: STEEL })),
  ]), 1, 0.3),
  turret: {
    geo: grime(merge([
      P.cyl(0.5, 0.52, 0.16, { color: NATO, ...C }, 18),                                              // mount ring
      P.box(0.4, 0.08, 0.36, { y: 0.32, z: -0.5, color: NATO_DK }),                                   // seat…
      P.box(0.4, 0.4, 0.06, { y: 0.52, z: -0.7, rx: -0.15, color: NATO_DK }),                         // …and its back
      ...gunner({ y: 0.36, z: -0.52, cloth: 0x4b5331, helmet: 0x4d5733 }),
      P.box(0.5, 0.5, 0.62, { x: 0.52, y: 0.42, z: 0.0, color: NATO_DK }),                            // linked-ammunition drum
      P.cyl(0.18, 0.18, 0.05, { x: -0.55, y: 0.8, z: -0.2, rx: Math.PI / 2 - 0.3, color: STEEL }, 14), // VPS-2 range-only radar dish
      P.box(0.1, 0.4, 0.1, { x: -0.55, y: 0.55, z: -0.2, color: STEEL }),
    ]), 0.8, 0, 0.3),
    at: [0, 0.72, 0],
  },
  gun: {
    geo: merge([
      P.box(0.3, 0.3, 0.8, { z: 0.25, color: NATO_DK }),                                              // gun housing
      ...[0, 1, 2, 3, 4, 5].map((k) => P.cyl(0.02, 0.02, 1.45, { x: Math.cos(k * Math.PI / 3) * 0.075, y: Math.sin(k * Math.PI / 3) * 0.075, z: 1.35, rx: Math.PI / 2, color: STEEL }, 6)),
      P.cyl(0.11, 0.11, 0.06, { z: 1.9, rx: Math.PI / 2, color: STEEL }, 12),                         // muzzle clamp
      P.cyl(0.11, 0.11, 0.06, { z: 1.2, rx: Math.PI / 2, color: STEEL }, 12),                         // mid clamp
      P.box(0.12, 0.16, 0.24, { x: 0.18, y: 0.18, z: -0.05, color: GLASS }),                          // the gyro lead sight
    ]),
    at: [0, 0.55, 0.15],
  },
  muzzle: [0, 0, 2.0],
  recoil: 0.04,
  marks: merge([P.box(0.02, 0.2, 0.4, { x: 0.455, y: 0.6, z: 0.4 })]),
}));

/** ZU-23-2: twin 23 mm 2A14 cannons on their light carriage, the wheels swung up off the ground
 *  and the three jacks down, ammunition boxes either side of the cradle, the gunner on the left. */
export const buildPactZU23 = vehicle(() => ({
  hull: grime(merge([
    P.box(1.0, 0.22, 1.5, { y: 0.42, color: PACT }),                                                 // carriage
    ...pair((s) => P.box(0.12, 0.12, 1.1, { x: s * 0.55, y: 0.36, z: 0.2, ry: s * 0.5, color: PACT_DK })), // trails
    ...pair((s) => P.cyl(0.34, 0.34, 0.2, { x: s * 0.9, y: 0.5, z: -0.35, rz: Math.PI / 2, color: 0x1f201c, surf: 'rubber' }, 16)), // wheels, lifted
    ...pair((s) => P.cyl(0.13, 0.13, 0.22, { x: s * 0.9, y: 0.5, z: -0.35, rz: Math.PI / 2, color: PACT_DK }, 10)),
    ...[[0, 1.1], [-0.6, -0.8], [0.6, -0.8]].map(([x, z]) => P.box(0.1, 0.45, 0.1, { x, y: 0.22, z, color: STEEL })), // jacks
    ...[[0, 1.1], [-0.6, -0.8], [0.6, -0.8]].map(([x, z]) => P.cyl(0.13, 0.13, 0.03, { x, y: 0.02, z, color: STEEL }, 10)),
  ]), 1, 0.3),
  turret: {
    geo: grime(merge([
      P.cyl(0.62, 0.62, 0.12, { color: PACT }, 18),                                                   // the traversing platform
      P.box(0.36, 0.07, 0.34, { x: -0.48, y: 0.3, z: -0.45, color: PACT_DK }),                       // gunner's seat
      ...gunner({ x: -0.48, y: 0.33, z: -0.47, cloth: 0x6f6a4a, helmet: 0x4a5634 }),
      ...pair((s) => P.cyl(0.11, 0.11, 0.03, { x: -0.48 + s * 0.25, y: 0.62, z: -0.05, rz: Math.PI / 2, color: STEEL }, 12)), // traverse / elevation handwheels
      P.box(0.12, 0.5, 0.12, { x: 0.35, y: 0.3, z: -0.1, color: PACT_DK }),                          // the cradle's upright
    ]), 0.8, 0, 0.3),
    at: [0, 0.54, 0],
  },
  gun: {
    geo: merge([
      P.box(0.62, 0.24, 0.9, { z: 0.15, color: PACT_DK }),                                            // cradle with both receivers
      ...pair((s) => P.box(0.2, 0.32, 0.44, { x: s * 0.44, y: 0.04, z: 0.1, color: PACT })),          // 50-round boxes
      ...pair((s) => P.cyl(0.035, 0.03, 2.0, { x: s * 0.16, z: 1.5, rx: Math.PI / 2, color: STEEL }, 8)), // barrels
      ...pair((s) => P.cyl(0.05, 0.05, 0.14, { x: s * 0.16, z: 2.55, rx: Math.PI / 2, color: STEEL }, 8)), // flash hiders
      P.box(0.1, 0.18, 0.14, { x: -0.3, y: 0.22, z: -0.1, color: GLASS }),                           // ZAP-23 sight
    ]),
    at: [0.05, 0.42, 0.05],
  },
  muzzle: [0, 0, 2.6],
  recoil: 0.05,
  marks: merge([P.box(0.02, 0.16, 0.3, { x: 0.505, y: 0.48, z: 0.2 })]),
}));


// ---------------------------------------------------------------- air search radars

/** The FAAR antenna: a flat rectangular array on its pedestal, the IFF bar on top. */
const faarAntenna = (color, dark) => merge([
  P.cyl(0.16, 0.2, 0.5, { y: 0.25, color: dark }, 10),
  P.box(2.2, 0.75, 0.12, { y: 0.9, z: 0.1, rx: -0.2, color }),
  ...[-0.8, -0.4, 0, 0.4, 0.8].map((x) => P.box(0.04, 0.7, 0.03, { x, y: 0.9, z: 0.18, rx: -0.2, color: dark })),
  P.box(2.0, 0.12, 0.1, { y: 1.38, z: 0.15, color: dark }),
  P.box(0.3, 0.3, 0.4, { y: 0.55, z: -0.25, color: dark }),
]);

/** AN/MPQ-49 Forward Area Alerting Radar on an M561 Gama Goat: the articulated 6×6 — open cab
 *  and front unit, the rear unit with the radar shelter — the antenna on its mast at the back. */
export const buildNatoFAAR = vehicle(() => ({
  wheels: wheeled([1.45, 0.0, -1.45], 0.95, 0.38),
  hull: grime(merge([
    // front unit: low hull, the open cab with its windscreen frame and canvas top
    stationHull([[0.35, [[0, 0.55], [0.95, 0.55], [0.98, 1.15], [0, 1.15]]], [2.3, [[0, 0.6], [0.92, 0.6], [0.92, 1.05], [0, 1.08]]]], { color: NATO, ...C }),
    P.box(1.8, 0.05, 1.1, { y: 1.9, z: 1.3, color: 0x4f5238 }),                                     // canvas top
    ...pair((s) => P.box(0.05, 0.8, 0.05, { x: s * 0.88, y: 1.5, z: 1.85, color: NATO_DK })),
    P.box(1.75, 0.5, 0.04, { y: 1.45, z: 1.85, rx: -0.15, color: GLASS }),                          // windscreen
    ...pair((s) => P.box(0.4, 0.3, 0.4, { x: s * 0.45, y: 1.2, z: 0.8, color: NATO_DK })),          // seats
    // the articulation joint, rear unit with its shelter, and the antenna mast
    P.cyl(0.18, 0.18, 0.4, { y: 0.8, z: 0.15, rx: Math.PI / 2, color: STEEL }, 10),
    stationHull([[-2.4, [[0, 0.6], [0.92, 0.6], [0.92, 1.1], [0, 1.1]]], [-0.05, [[0, 0.55], [0.95, 0.55], [0.95, 1.12], [0, 1.12]]]], { color: NATO, ...C }),
    P.box(1.7, 1.0, 1.9, { y: 1.62, z: -1.3, color: NATO, ...C }),                                  // radar and plotting shelter
    P.box(0.5, 0.8, 0.03, { x: 0.86, y: 1.6, z: -1.0, color: NATO_DK }),                            // its door
    P.cyl(0.08, 0.1, 1.2, { y: 2.7, z: -1.9, color: STEEL }, 8),                                    // the mast
    P.box(0.5, 0.3, 0.5, { x: -0.6, y: 2.25, z: -0.6, color: NATO_DK }),                            // generator
    P.cyl(0.4, 0.4, 1.4, { x: -0.65, y: 2.25, z: -1.6, rx: Math.PI / 2, color: 0x56583e }, 10),     // cable reels
  ]), 1.0, 0.3),
  spin: { geo: faarAntenna(NATO, NATO_DK), at: [0, 3.25, -1.9], rate: 1.6 },
  marks: merge([P.box(0.02, 0.3, 0.45, { x: 0.96, y: 0.85, z: 1.3 })]),
}));

/** P-19 'Danube' (1RL134) on a ZiL-131: the rounded-bonnet 6×6 cab, the van body with the
 *  operators' cabin, and on its roof the two stacked Yagi arrays turning together. */
export const buildPactP19 = vehicle(() => ({
  wheels: wheeled([2.1, -0.95, -2.2], 1.0, 0.5),
  hull: grime(merge([
    ...pair((s) => P.box(0.16, 0.22, 6.6, { x: s * 0.45, y: 0.9, z: -0.1, color: STEEL })),
    // ZiL-131: rounded bonnet and wings, the cab
    loft([[0, 1.1, 2.4, 0.78, 0.4, 3], [0, 1.2, 3.0, 0.74, 0.38, 3], [0, 1.15, 3.45, 0.66, 0.32, 3]], { color: PACT }, 12),
    P.box(1.2, 0.42, 0.04, { y: 1.15, z: 3.5, color: 0x1e1e1c }),                                    // grille
    stationHull([[1.25, [[0, 1.15], [1.1, 1.15], [1.1, 2.2], [0.98, 2.38], [0, 2.4]]], [2.45, [[0, 1.15], [1.1, 1.15], [1.1, 2.15], [0.98, 2.32], [0, 2.34]]]], { color: PACT }),
    ...pair((s) => P.box(0.84, 0.44, 0.03, { x: s * 0.5, y: 1.98, z: 2.46, rx: -0.1, color: GLASS })),
    ...pair((s) => P.box(0.03, 0.4, 0.62, { x: s * 1.11, y: 1.95, z: 1.95, color: GLASS })),
    ...pair((s) => P.box(0.5, 0.06, 1.4, { x: s * 0.98, y: 1.35, z: 2.55, color: PACT_DK })),          // wings
    ...pair((s) => P.cyl(0.1, 0.1, 0.1, { x: s * 0.82, y: 1.45, z: 3.3, rx: Math.PI / 2, color: GLASS }, 10)),
    P.box(2.3, 0.18, 0.14, { y: 0.92, z: 3.62, color: STEEL }),
    // the van body (KUNG) with door, ladder and air conditioner
    P.box(2.3, 1.85, 3.6, { y: 2.08, z: -1.15, color: PACT }),
    P.box(0.6, 1.2, 0.04, { x: 0.5, y: 1.9, z: -2.96, color: PACT_DK }),
    ...[0, 1, 2, 3].map((k) => P.box(0.4, 0.03, 0.05, { x: 0.5, y: 0.75 + k * 0.25, z: -3.05, color: STEEL })),
    P.box(0.5, 0.35, 0.5, { x: -0.6, y: 3.15, z: 0.3, color: PACT_DK }),
    ...pair((s) => P.box(0.46, 0.05, 2.3, { x: s * 1.0, y: 1.2, z: -1.45, color: PACT_DK })),
    P.cyl(0.14, 0.17, 0.35, { y: 3.18, z: -1.5, color: STEEL }, 10),                                 // the antenna turntable
  ]), 1.0, 0.4),
  spin: {
    geo: merge([
      P.cyl(0.08, 0.08, 1.4, { y: 0.7, color: STEEL }, 8),
      ...[0.55, 1.25].flatMap((y) => [
        P.box(3.0, 0.08, 0.08, { y, color: STEEL }),                                                // the array's boom
        ...[-1.3, -0.78, -0.26, 0.26, 0.78, 1.3].flatMap((x) => [
          P.box(0.03, 0.03, 0.8, { x, y, z: 0.35, color: STEEL }),                                  // Yagi director rods
          P.box(0.05, 0.25, 0.05, { x, y, z: -0.05, color: PACT_DK }),
        ]),
      ]),
      P.box(3.1, 0.75, 0.04, { y: 0.9, z: -0.15, color: PACT_DK }),                                 // reflector screen
    ]),
    at: [0, 3.35, -1.5],
    rate: 1.2,
  },
  marks: merge([P.box(0.02, 0.35, 0.35, { x: 1.16, y: 2.1, z: -0.5 })]),
}));


// ---------------------------------------------------------------- gun-missile air defence

/** ADATS on the M113A2: the turret with its FLIR / laser head, two banks of four missile tubes
 *  that elevate together, and the search radar turning on its mast at the back. */
export const buildNatoADATS = vehicle(() => ({
  ...m113Hull([
    ...pair((s) => P.box(0.06, 0.6, 3.6, { x: s * 1.4, y: 1.3, z: 0.0, color: NATO, ...C })),        // add-on side skirts
  ]),
  turret: {
    geo: grime(merge([
      P.cyl(0.85, 0.9, 0.25, { y: 0.12, color: NATO, ...C }, 16),
      P.box(0.9, 0.95, 1.4, { y: 0.72, z: 0.0, color: NATO, ...C }),                                  // the electronics housing
      P.box(0.55, 0.42, 0.25, { y: 0.88, z: 0.75, color: NATO_DK }),                                   // electro-optical head…
      ...pair((s) => P.cyl(0.11, 0.11, 0.05, { x: s * 0.13, y: 0.88, z: 0.89, rx: Math.PI / 2, color: GLASS }, 12)), // …its FLIR and TV windows
      P.cyl(0.06, 0.08, 0.6, { y: 1.45, z: -0.55, color: STEEL }, 8),                                  // radar mast
    ]), 0.8, 0, 0.3),
    at: [0, 1.85, -0.5],
  },
  gun: { // two banks of four tubes, either side of the housing
    geo: merge([
      ...pair((s) => P.box(0.12, 0.12, 0.6, { x: s * 0.52, color: STEEL })),                         // trunnions
      ...pair((s) => [0, 1].flatMap((i) => [0, 1].map((j) => P.cyl(0.1, 0.1, 2.2, { x: s * (0.78 + i * 0.22), y: -0.05 + j * 0.22, z: 0.4, rx: Math.PI / 2, color: NATO_DK }, 10)))).flat(),
      ...pair((s) => P.box(0.5, 0.5, 0.05, { x: s * 0.89, y: 0.06, z: 1.5, color: STEEL })),          // the tube banks' front frames
    ]),
    at: [0, 0.75, 0.1],
  },
  spin: {
    geo: merge([P.box(1.3, 0.35, 0.08, { y: 0.15, color: NATO_DK }), P.box(1.2, 0.06, 0.25, { y: 0.35, z: -0.06, color: STEEL })]),
    at: [0, 1.75, -0.55],
    rate: 2.4,
    onTurret: true,
    always: true,
  },
  muzzle: [0.89, 0.06, 1.55],
  marks: merge([P.box(0.02, 0.3, 0.5, { x: 1.43, y: 1.3, z: -0.8 })]),
}));

/** 2S6 Tunguska: the GM-352 chassis, the big turret with the search radar folding up at the back
 *  and the tracking radar in front, a twin 30 mm 2A38 either side with four missile tubes above. */
export const buildPactTunguska = vehicle(() => {
  const g = tracked({ halfWidth: 1.45, length: 5.4, wheels: 6, wheelR: 0.33, sprocket: -1, rollers: 3, trackWidth: 0.5, wheelColor: PACT_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.5, 1.5, 0.5], [-3.2, 1.6, 0.45], [2.5, 1.62, 0.45], [3.45, 1.15, 0.6], [3.6, 1.02, 0.8]],
        { belly: 1.12, fender: 1.65, fenderY: 1.05, chamfer: 0.05 }, { color: PACT }),
      ...pair((s) => P.box(0.04, 0.5, 6.6, { x: s * 1.66, y: 0.85, z: -0.1, color: 0x1f201c, surf: 'rubber' })), // rubber skirts
      P.box(0.6, 0.05, 0.6, { x: -0.7, y: 1.66, z: 2.4, color: PACT_DK }),                           // driver's hatch
      ...pair((s) => P.box(0.18, 0.12, 0.1, { x: s * 1.2, y: 1.35, z: 3.35, color: STEEL })),
    ]), 1.2, 0.3),
    turret: {
      geo: grime(merge([
        stationHull([
          [-1.7, [[0, 0], [1.25, 0], [1.3, 0.75], [1.15, 1.0], [0, 1.02]]],
          [1.0, [[0, 0], [1.3, 0], [1.35, 0.85], [1.2, 1.08], [0, 1.1]]],
          [1.6, [[0, 0.1], [1.1, 0.1], [1.15, 0.7], [1.0, 0.85], [0, 0.88]]],
        ], { color: PACT }),
        P.cyl(0.45, 0.45, 0.65, { y: 0.75, z: 1.75, rx: Math.PI / 2, color: PACT_DK }, 16),             // tracking radar housing…
        P.cyl(0.38, 0.38, 0.04, { y: 0.75, z: 2.09, rx: Math.PI / 2, color: 0x2a2f26 }, 16),            // …and its dish face
        P.box(0.35, 0.5, 0.5, { x: 0.8, y: 1.25, z: 0.5, color: PACT_DK }),                             // optical sight
        P.box(0.3, 0.5, 0.3, { y: 1.3, z: -1.35, color: STEEL }),                                       // radar pedestal
      ]), 0.8, 0, 0.3),
      at: [0, 1.62, -0.6],
    },
    gun: { // either side: the twin cannon and above it the pod of four 9M311 missiles
      geo: merge([
        ...pair((s) => P.box(0.3, 0.38, 1.2, { x: s * 1.58, color: PACT_DK })),                          // gun housings
        ...pair((s) => [0, 1].map((i) => P.cyl(0.035, 0.035, 2.2, { x: s * (1.52 + i * 0.13), y: -0.05, z: 1.6, rx: Math.PI / 2, color: STEEL }, 8))).flat(),
        ...pair((s) => [0, 1].map((i) => P.cyl(0.055, 0.055, 0.14, { x: s * (1.52 + i * 0.13), y: -0.05, z: 2.7, rx: Math.PI / 2, color: STEEL }, 8))).flat(),
        ...pair((s) => [0, 1].flatMap((i) => [0, 1].map((j) => P.cyl(0.09, 0.09, 2.0, { x: s * (1.5 + i * 0.2), y: 0.32 + j * 0.2, z: 0.5, rx: Math.PI / 2, color: PACT }, 10)))).flat(),
      ]),
      at: [0, 0.55, 0.2],
    },
    spin: {
      geo: merge([
        P.box(1.9, 0.8, 0.12, { y: 0.4, rx: -0.15, color: PACT_DK }),                                  // the search antenna
        ...[-0.6, -0.2, 0.2, 0.6].map((x) => P.box(0.04, 0.75, 0.05, { x, y: 0.4, z: 0.07, rx: -0.15, color: STEEL })),
      ]),
      at: [0, 1.55, -1.35],
      rate: 2,
      onTurret: true,
      always: true,
    },
    muzzle: [1.65, 0.42, 1.55],
    marks: merge([P.box(0.02, 0.3, 0.3, { x: 1.69, y: 1.3, z: -1.0 })]),
  };
});


// ---------------------------------------------------------------- counter-battery radars

/** AN/TPQ-37 Firefinder: the M35 2½-ton truck with the operations shelter, and the big phased-array
 *  antenna standing up on its own trailer behind, tilted back and facing forward over the cab. */
export const buildNatoFirefinder = vehicle(() => ({
  wheels: wheeled([1.95, -0.55, -1.65], 0.95, 0.5),
  hull: grime(merge([
    ...pair((s) => P.box(0.15, 0.22, 5.6, { x: s * 0.42, y: 0.88, z: 0.2, color: STEEL })),
    // M35: flat-topped bonnet, the cab with its canvas top, wide front fenders
    stationHull([[2.15, [[0, 1.05], [0.62, 1.05], [0.62, 1.62], [0, 1.64]]], [3.3, [[0, 1.05], [0.6, 1.05], [0.6, 1.55], [0, 1.57]]]], { color: NATO, ...C }),
    P.box(1.15, 0.5, 0.04, { y: 1.3, z: 3.33, color: 0x1e1e1c }),                                    // grille
    ...pair((s) => P.box(0.55, 0.05, 1.3, { x: s * 0.88, y: 1.32, z: 2.6, color: NATO_DK })),
    stationHull([[1.05, [[0, 1.1], [1.0, 1.1], [1.0, 1.85], [0, 1.85]]], [2.15, [[0, 1.1], [1.0, 1.1], [1.0, 1.8], [0, 1.8]]]], { color: NATO, ...C }),
    P.box(2.0, 0.55, 1.1, { y: 2.12, z: 1.6, color: 0x4f5238 }),                                     // canvas cab top
    P.box(1.9, 0.5, 0.04, { y: 2.0, z: 2.17, rx: -0.1, color: GLASS }),
    ...pair((s) => P.box(0.03, 0.4, 0.6, { x: s * 1.01, y: 1.95, z: 1.6, color: GLASS })),
    P.box(2.3, 0.18, 0.14, { y: 0.95, z: 3.45, color: STEEL }),
    // the S-280 operations shelter on the bed, its door and air conditioner
    P.box(2.15, 1.75, 2.6, { y: 2.05, z: -0.65, color: NATO, ...C }),
    P.box(0.7, 1.2, 0.04, { x: -0.4, y: 1.9, z: -1.96, color: NATO_DK }),
    P.box(0.6, 0.4, 0.4, { x: 0.6, y: 3.1, z: 0.2, color: NATO_DK }),
    // the antenna trailer behind: drawbar, the array on its pedestal, tilted back to look out over the cab
    P.box(0.12, 0.12, 1.2, { y: 0.75, z: -2.4, color: STEEL }),
    P.box(1.8, 0.35, 1.6, { y: 0.8, z: -3.6, color: NATO, ...C }),
    ...pair((s) => P.cyl(0.42, 0.42, 0.25, { x: s * 1.0, y: 0.42, z: -3.6, rz: Math.PI / 2, color: 0x1f201c, surf: 'rubber' }, 14)),
    P.box(0.4, 0.9, 0.4, { y: 1.4, z: -3.6, color: NATO_DK }),
    P.box(3.0, 2.2, 0.25, { y: 2.85, z: -3.5, rx: -0.38, color: NATO_DK }),                          // the phased array…
    ...[-1.2, -0.6, 0, 0.6, 1.2].map((x) => P.box(0.05, 2.1, 0.04, { x, y: 2.86, z: -3.36, rx: -0.38, color: STEEL })), // …its rows of elements
    ...[-0.7, 0, 0.7].map((y) => P.box(2.9, 0.05, 0.04, { y: 2.85 + y * Math.cos(0.38), z: -3.36 + y * Math.sin(0.38), rx: -0.38, color: STEEL })),
  ]), 1.0, 0.3),
  marks: merge([P.box(0.02, 0.35, 0.5, { x: 1.08, y: 2.1, z: -0.6 })]),
}));

/** ARK-1 Rys on the MT-LBu: the taller command hull, the large rectangular antenna raised on the roof
 *  facing forward, the generator box and whip aerials. */
export const buildPactARK1 = vehicle(() => ({
  ...mtlbHull([
    P.box(2.7, 0.45, 3.4, { y: 1.78, z: -1.4, color: PACT }),                                          // the raised rear superstructure
    P.box(0.9, 0.5, 0.8, { x: -0.7, y: 2.25, z: -2.6, color: PACT_DK }),                               // generator
    ...pair((s) => P.cyl(0.006, 0.006, 2.2, { x: s * 1.1, y: 3.1, z: -2.9, color: STEEL }, 4)),        // aerials
    P.box(0.5, 0.8, 0.5, { y: 2.4, z: -0.9, color: PACT_DK }),                                          // antenna mast
    P.box(3.1, 1.7, 0.2, { y: 3.45, z: -0.85, rx: -0.3, color: PACT_DK }),                              // the antenna…
    ...[-1.2, -0.6, 0, 0.6, 1.2].map((x) => P.box(0.05, 1.6, 0.04, { x, y: 3.45, z: -0.73, rx: -0.3, color: STEEL })),
    P.box(3.0, 0.08, 0.06, { y: 4.25, z: -0.62, rx: -0.3, color: STEEL }),
  ], 1.7),
  marks: merge([P.box(0.02, 0.3, 0.3, { x: 1.465, y: 1.3, z: 0.6 })]),
}));


// ---------------------------------------------------------------- mine clearing

/** M60A3 with a track-width mine plough: the cast turret and its 105 mm gun with the bore evacuator,
 *  and in front of each track a plough unit of tines that lifts the mines to the side. */
export const buildNatoPlough = vehicle(() => {
  const g = tracked({ halfWidth: 1.45, length: 4.9, wheels: 6, wheelR: 0.33, sprocket: -1, rollers: 3, trackWidth: 0.6, wheelColor: NATO_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.3, 1.45, 0.5], [-3.0, 1.55, 0.45], [2.4, 1.6, 0.45], [3.3, 1.1, 0.6], [3.5, 0.98, 0.8]],
        { belly: 1.15, fender: 1.72, fenderY: 1.1, chamfer: 0.05 }, { color: NATO, ...C }),
      // the plough: two blades ahead of the tracks, their tines raking into the ground, the frame and lift arms
      ...pair((s) => P.box(0.85, 0.55, 0.12, { x: s * 1.45, y: 0.35, z: 4.15, ry: s * 0.3, rx: 0.35, color: NATO_DK })),
      ...pair((s) => [0, 1, 2, 3, 4].map((k) => P.box(0.06, 0.4, 0.08, { x: s * (1.1 + k * 0.17), y: 0.12, z: 4.3 + k * 0.05 * s * s, rx: 0.7, color: STEEL }))).flat(),
      ...pair((s) => P.box(0.14, 0.14, 1.2, { x: s * 1.45, y: 0.6, z: 3.55, rx: 0.25, color: STEEL })),
      P.box(2.6, 0.14, 0.14, { y: 0.75, z: 3.65, color: STEEL }),
      ...pair((s) => P.cyl(0.07, 0.07, 0.9, { x: s * 0.8, y: 1.05, z: 3.4, rx: Math.PI / 2 - 0.6, color: STEEL }, 8)),
      ...pair((s) => P.box(0.06, 0.55, 6.6, { x: s * 1.75, y: 0.85, z: 0.0, color: NATO, ...C })),
    ]), 1.2, 0.3),
    turret: {
      geo: grime(merge([
        planProfile([[-0.55, 1.65], [0.55, 1.65], [1.2, 0.7], [1.25, -1.1], [0.9, -1.5], [-0.9, -1.5], [-1.25, -1.1], [-1.2, 0.7]], 0.75, { color: NATO, ...C }),
        P.cyl(0.42, 0.45, 0.32, { x: 0.55, y: 0.9, z: -0.3, color: NATO_DK }, 14),
        P.box(0.1, 0.1, 0.55, { x: 0.55, y: 1.1, z: -0.1, color: STEEL }),
        P.box(0.5, 0.35, 0.4, { x: -0.6, y: 0.85, z: 0.3, color: NATO_DK }),                            // the AN/VSG-2 thermal sight box
        P.box(1.8, 0.35, 0.55, { y: 0.45, z: -1.7, color: 0x4d5236 }),                                  // bustle rack
        ...pair((s) => P.box(0.18, 0.2, 0.35, { x: s * 1.15, y: 0.55, z: 0.75, ry: s * 0.4, color: NATO_DK })), // smoke dischargers
      ]), 0.8, 0, 0.4),
      at: [0, 1.62, 0.1],
    },
    gun: {
      geo: merge([
        P.box(0.6, 0.45, 0.3, { z: 0.1, color: NATO, ...C }),
        P.cyl(0.075, 0.07, 4.0, { z: 2.2, rx: Math.PI / 2, color: NATO_DK }, 12),
        P.cyl(0.11, 0.11, 0.5, { z: 2.6, rx: Math.PI / 2, color: NATO_DK }, 12),                       // bore evacuator
      ]),
      at: [0, 0.4, 1.55],
    },
    muzzle: [0, 0, 4.2],
    marks: merge([P.box(0.02, 0.3, 0.6, { x: 1.77, y: 1.3, z: -1.2 })]),
  };
});

/** UR-77 Meteorit: the 2S1 chassis, its armoured launcher box at the back raised for firing, the
 *  two line-charge hose containers and the PKT in the commander's hatch. */
export const buildPactUR77 = vehicle(() => {
  const g = tracked({ halfWidth: 1.4, length: 5.3, wheels: 7, wheelR: 0.3, sprocket: 1, rollers: 0, trackWidth: 0.4, wheelColor: PACT_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      stationHull([
        [-3.4, [[0, 0.5], [1.05, 0.5], [1.05, 1.0], [1.48, 1.0], [1.48, 1.62], [1.4, 1.68], [0, 1.68]]],
        [2.2, [[0, 0.45], [1.05, 0.45], [1.05, 1.0], [1.48, 1.0], [1.48, 1.62], [1.4, 1.68], [0, 1.68]]],
        [3.2, [[0, 0.6], [1.05, 0.6], [1.05, 1.0], [1.45, 1.0], [1.45, 1.15], [1.4, 1.18], [0, 1.2]]],
        [3.45, [[0, 0.85], [1.0, 0.85], [1.0, 0.98], [1.4, 0.98], [1.4, 1.02], [1.36, 1.04], [0, 1.05]]],
      ], { color: PACT }),
      ...pair((s) => P.box(0.45, 0.2, 0.04, { x: s * 0.6, y: 1.5, z: 2.3, rx: 0.4, color: GLASS })),   // driver's and commander's vision blocks
      P.cyl(0.32, 0.35, 0.2, { x: 0.6, y: 1.78, z: 1.6, color: PACT_DK }, 12),                          // commander's cupola…
      P.box(0.08, 0.1, 0.6, { x: 0.6, y: 1.95, z: 1.85, color: STEEL }),                                 // …and the PKT
      ...pair((s) => P.cyl(0.07, 0.07, 0.1, { x: s * 1.15, y: 1.2, z: 3.25, rx: Math.PI / 2 - 0.6, color: STEEL }, 10)),
      ...pair((s) => P.box(0.06, 0.05, 6.8, { x: s * 1.49, y: 1.0, z: -0.1, color: PACT_DK })),
    ]), 1.1, 0.3),
    turret: {
      geo: merge([P.box(2.4, 0.2, 2.6, { y: 0.1, color: PACT_DK })]),                                   // the launcher's base on the roof
      at: [0, 1.68, -1.6],
    },
    gun: { // the armoured box with the two hose containers and the rocket ramps, raised to fire
      geo: merge([
        P.box(2.5, 0.7, 2.8, { y: 0.35, z: 0.9, color: PACT }),
        ...pair((s) => P.box(0.9, 0.5, 2.5, { x: s * 0.62, y: 0.82, z: 0.9, color: PACT_DK })),           // hose containers
        ...pair((s) => P.box(0.2, 0.2, 1.2, { x: s * 0.62, y: 1.15, z: 2.2, color: STEEL })),            // rocket ramps
        ...pair((s) => P.cyl(0.1, 0.1, 0.8, { x: s * 0.62, y: 1.3, z: 2.4, rx: Math.PI / 2, color: 0x8a8a7a }, 8)), // the rockets
      ]),
      at: [0, 0.2, -1.3],
      pitch: 0.22,
    },
    muzzle: [0.62, 1.3, 2.9],
    marks: merge([P.box(0.02, 0.3, 0.3, { x: 1.49, y: 1.3, z: 0.6 })]),
  };
});


// ---------------------------------------------------------------- electronic warfare

/** A log-periodic jamming antenna: the boom and its dipoles shortening toward the tip, on a mast head. */
const logPeriodic = (color, n = 7, len = 1.8) => [
  P.box(0.06, 0.06, len, { z: len / 2 - 0.2, color }),
  ...Array.from({ length: n }, (_, k) => P.box(1.6 - (k * 1.1) / n, 0.03, 0.03, { z: -0.1 + (k * len) / n, color })),
];

/** AN/MLQ-34 TACJAM on the M1015: the M548-family tracked carrier, its small armoured cab, the big
 *  equipment shelter, and the telescopic mast raised with the jamming antennas. */
export const buildNatoTACJAM = vehicle(() => {
  const g = tracked({ halfWidth: 1.2, length: 4.4, wheels: 5, wheelR: 0.3, sprocket: 1, rollers: 0, trackWidth: 0.38, wheelColor: NATO_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      stationHull([[-2.6, [[0, 0.5], [0.95, 0.5], [0.95, 1.0], [1.35, 1.0], [1.35, 1.25], [0, 1.25]]], [2.4, [[0, 0.5], [0.95, 0.5], [0.95, 1.0], [1.35, 1.0], [1.35, 1.25], [0, 1.25]]], [2.75, [[0, 0.75], [0.95, 0.75], [0.95, 1.0], [1.32, 1.0], [1.32, 1.1], [0, 1.12]]]], { color: NATO, ...C }),
      P.box(2.5, 0.95, 1.2, { y: 1.72, z: 1.85, color: NATO, ...C }),                                // cab
      P.box(2.2, 0.4, 0.04, { y: 1.85, z: 2.46, rx: -0.15, color: GLASS }),
      P.box(2.6, 1.6, 3.0, { y: 2.05, z: -0.75, color: NATO, ...C }),                                 // the equipment shelter
      P.box(0.7, 1.1, 0.04, { x: 0.5, y: 1.85, z: -2.26, color: NATO_DK }),
      P.box(0.7, 0.4, 0.5, { x: -0.7, y: 3.05, z: 0.2, color: NATO_DK }),                             // air conditioner
      P.cyl(0.14, 0.18, 3.6, { y: 4.6, z: -1.8, color: STEEL }, 10),                                  // the raised mast
      ...pair((s) => P.cyl(0.006, 0.006, 2.6, { x: s * 1.1, y: 4.1, z: -2.0, color: STEEL }, 4)),     // whip antennas
      ...pair((s) => P.box(0.06, 0.06, 0.4, { x: s * 1.3, y: 1.12, z: 2.3, color: STEEL })),
    ]), 1.0, 0.3),
    spin: { geo: merge([P.box(0.3, 0.3, 0.3, { color: NATO_DK }), ...logPeriodic(STEEL).map((g2) => g2)]), at: [0, 6.5, -1.8], rate: 0.25 },
    marks: merge([P.box(0.02, 0.3, 0.5, { x: 1.31, y: 2.1, z: -0.6 })]),
  };
});

/** R-330 jamming station on a Ural-4320: the cab, the KUNG van, two telescopic masts with their
 *  log-periodic antennas, the generator trailer hitched behind. */
export const buildPactR330 = vehicle(() => ({
  wheels: wheeled([2.0, -0.7, -1.95], 1.0, 0.55),
  hull: grime(merge([
    ...pair((s) => P.box(0.16, 0.25, 6.6, { x: s * 0.45, y: 0.95, z: 0.1, color: STEEL })),
    stationHull([[2.35, [[0, 1.15], [0.72, 1.15], [0.74, 1.72], [0.64, 1.86], [0, 1.88]]], [3.35, [[0, 1.15], [0.68, 1.15], [0.7, 1.68], [0.6, 1.8], [0, 1.82]]]], { color: PACT }),
    P.box(1.2, 0.5, 0.04, { y: 1.42, z: 3.37, color: 0x1e1e1c }),
    stationHull([[1.0, [[0, 1.2], [1.15, 1.2], [1.15, 2.32], [1.04, 2.52], [0, 2.54]]], [2.35, [[0, 1.2], [1.15, 1.2], [1.15, 2.28], [1.04, 2.46], [0, 2.48]]]], { color: PACT }),
    ...pair((s) => P.box(0.86, 0.46, 0.03, { x: s * 0.5, y: 2.06, z: 2.37, rx: -0.08, color: GLASS })),
    ...pair((s) => P.box(0.48, 0.06, 1.3, { x: s * 0.98, y: 1.42, z: 2.3, color: PACT_DK })),
    P.box(2.3, 0.2, 0.14, { y: 1.0, z: 3.5, color: STEEL }),
    P.box(2.4, 2.0, 3.8, { y: 2.2, z: -1.1, color: PACT }),                                             // the KUNG
    P.box(0.6, 1.2, 0.04, { x: -0.5, y: 2.0, z: -3.01, color: PACT_DK }),
    ...pair((s) => P.cyl(0.12, 0.15, 3.0, { x: s * 0.8, y: 4.7, z: -2.2, color: STEEL }, 10)),          // the two masts
    ...pair((s) => P.box(0.46, 0.05, 2.3, { x: s * 1.0, y: 1.25, z: -1.4, color: PACT_DK })),
    P.box(0.12, 0.12, 1.2, { y: 0.75, z: -3.6, color: STEEL }),                                          // the generator trailer behind
    P.box(1.5, 0.9, 1.6, { y: 1.15, z: -4.8, color: PACT_DK }),
    ...pair((s) => P.cyl(0.38, 0.38, 0.22, { x: s * 0.85, y: 0.38, z: -4.8, rz: Math.PI / 2, color: 0x1f201c, surf: 'rubber' }, 14)),
    // the two antennas on the mast heads, one pointing each way across the front
    ...pair((s) => logPeriodic(STEEL, 6, 1.5).map((g2) => g2.clone().rotateY(s * 0.6).translate(s * 0.8, 6.3, -2.2))).flat(),
  ]), 1.0, 0.4),
  marks: merge([P.box(0.02, 0.35, 0.35, { x: 1.21, y: 2.2, z: -0.5 })]),
}));
