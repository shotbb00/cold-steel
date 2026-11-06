// 1945 armour, the rest of the roster (data/units45): real dimensions, nose toward +z, on the rig
// and markings of ww2Armour.js.
//   heavy tanks   M26 Pershing · IS-2 · Panther G · Tiger I (lent to the Fallschirmjäger)
//   recon         M8 Greyhound (6×6) · BA-64 (4×4) · Sd.Kfz. 234/2 Puma (8×8) · Kettenkrad
//   tank hunters  M18 Hellcat · SU-100 · Jagdpanzer IV/70 · Hetzer
//   assault       M4 dozer · ISU-152 · Brummbär · Sturmtiger
// Contract: render/RigRenderer.js.
import * as THREE from 'three';
import { P, merge, pair, grime } from '../units/geometry.js';
import { stationHull, castTurret, trackedHull, runningGear, roadWheelGeometry, meshAdder } from './vehicleCommon.js';
import { rig, skirts, whiteStar, balkenkreuz } from './ww2Armour.js';
import { vehicle, wheeled, tracked } from './support.js';
import { buildWw2Soldier } from './ww2Soldier.js';

const OD = 0x4d4f34;
const OD_DK = 0x3c3e28;
const SOV = 0x4a5a34;
const SOV_DK = 0x3a4628;
const GELB = 0x9a8a5a;
const GELB_DK = 0x7a6c44;
const STEEL = 0x2b2d28;
const WHITE = 0xd8d6cc;
const GLASS = 0x1a1d1c;
const C = { camo: 1 };

const cache = {};
const once = (key, make) => (cache[key] ??= make());

/** A gun barrel along +z from the mantlet: length L, radius r, and a muzzle brake (or none). */
const barrel = (L, r, color, brake = 'double') => merge([
  P.cyl(r, r * 1.15, L, { z: L / 2, rx: Math.PI / 2, color }, 12),
  ...(brake === 'double' ? [P.box(r * 4.2, r * 2.4, r * 5.5, { z: L + r * 1.8, color: STEEL })]
    : brake === 'round' ? [P.cyl(r * 1.9, r * 1.9, r * 5, { z: L + r * 2, rx: Math.PI / 2, color: STEEL }, 12)] : []),
]);

// ---------------------------------------------------------------- heavy tanks

export const buildUsPershing = (mats) => rig(once('m26', () => {
  const gear = runningGear({ halfWidth: 1.4, length: 4.6, wheels: 6, wheelR: 0.33, sprocket: -1, rollers: 5, trackWidth: 0.58, wheelColor: OD_DK });
  return {
    gear, wheel: roadWheelGeometry(0.33, 0.44, OD_DK),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-3.15, 1.5, 0.5], [-2.9, 1.72, 0.45], [1.8, 1.75, 0.45], [3.15, 0.95, 0.5]], { belly: 1.05, fender: 1.72, fenderY: 1.02, chamfer: 0.08 }, { color: OD, ...C }),
      P.box(3.2, 0.05, 1.5, { y: 1.75, z: -2.2, color: OD_DK }),
      ...[-1, 1].flatMap((s) => whiteStar(s * 1.73, 1.4, -0.9, 0.38)),
    ]), 1.25, 0.3),
    turret: grime(merge([
      castTurret([[1.5, 0.6, 0.55], [1.2, 1.0, 0.75], [0.3, 1.18, 0.82], [-0.8, 1.15, 0.78], [-1.6, 1.0, 0.65], [-1.95, 0.6, 0.45]], { color: OD, ...C }),
      P.cyl(0.36, 0.38, 0.24, { x: 0.5, y: 0.9, z: -0.5, color: OD, ...C }, 14),
      P.box(0.1, 0.12, 0.35, { x: 0.5, y: 1.1, z: -0.2, color: STEEL }),
      P.box(1.15, 0.65, 0.35, { y: 0.42, z: 1.55, color: OD, ...C }),
    ]), 0.9, 0.0, 0.3),
    gun: barrel(4.3, 0.07, OD),
  };
}), mats, { turretAt: [0, 1.75, 0.1], gunAt: [0, 0.42, 1.65], muzzle: 4.75 });

export const buildSovIS2 = (mats) => rig(once('is2', () => {
  const gear = runningGear({ halfWidth: 1.28, length: 4.8, wheels: 6, wheelR: 0.33, sprocket: -1, rollers: 3, trackWidth: 0.65, wheelColor: SOV_DK });
  return {
    gear, wheel: roadWheelGeometry(0.33, 0.48, SOV_DK),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-3.35, 1.4, 0.5], [-3.0, 1.65, 0.45], [2.0, 1.65, 0.45], [3.4, 0.85, 0.5]], { belly: 1.0, fender: 1.55, fenderY: 1.0, chamfer: 0.3 }, { color: SOV, ...C }),
      ...pair((s) => [-1.0, -2.0].map((z) => P.box(0.4, 0.35, 0.6, { x: s * 1.42, y: 1.2, z, color: SOV_DK }))).flat(), // stowage boxes
    ]), 1.25, 0.3),
    turret: grime(merge([
      castTurret([[1.6, 0.55, 0.5], [1.25, 1.05, 0.75], [0.3, 1.25, 0.85], [-0.8, 1.2, 0.8], [-1.7, 0.95, 0.6], [-2.0, 0.55, 0.4]], { color: SOV, ...C }, 2.6),
      P.cyl(0.36, 0.38, 0.25, { x: -0.5, y: 0.92, z: -0.6, color: SOV, ...C }, 14),
      P.box(0.12, 0.14, 0.45, { x: 0.5, y: 0.8, z: -0.6, color: STEEL }),                     // the DShK on the loader's hatch
      P.box(0.95, 0.6, 0.4, { y: 0.4, z: 1.6, color: SOV, ...C }),
      ...pair((s) => P.box(0.012, 0.24, 0.5, { x: s * 1.26, y: 0.42, z: -0.2, color: WHITE })),
    ]), 0.9, 0.0, 0.3),
    gun: barrel(4.6, 0.08, SOV),
  };
}), mats, { turretAt: [0, 1.65, 0.3], gunAt: [0, 0.4, 1.75], muzzle: 5.1 });

/** Interleaved road wheels (Panther, Tiger): two staggered rows a side, like vehicleCommon's runningGear but overlapping. */
function interleaved(o) {
  const g = runningGear({ ...o, rollers: 0 });
  const extra = runningGear({ ...o, wheels: o.wheels - 1, length: o.length - (o.length / (o.wheels - 1)), rollers: 0 });
  for (const w of extra.wheels) w.x += Math.sign(w.x) * -0.18;
  return { ...g, wheels: [...g.wheels, ...extra.wheels] };
}

export const buildWhPanther = (mats) => rig(once('panther', () => {
  const gear = interleaved({ halfWidth: 1.42, length: 4.4, wheels: 8, wheelR: 0.43, sprocket: 1, trackWidth: 0.66, wheelColor: GELB_DK });
  return {
    gear, wheel: roadWheelGeometry(0.43, 0.2, GELB_DK),
    hull: grime(merge([
      ...gear.parts,
      // the sloped glacis and the sides sloping in over the tracks
      stationHull([
        [-3.4, [[0, 0.55], [1.0, 0.55], [1.0, 1.05], [1.75, 1.05], [1.45, 1.85], [0, 1.85]]],
        [1.6, [[0, 0.55], [1.0, 0.55], [1.0, 1.05], [1.75, 1.05], [1.45, 1.85], [0, 1.85]]],
        [3.45, [[0, 0.62], [1.0, 0.62], [1.0, 0.9], [1.6, 0.9], [1.4, 1.0], [0, 1.0]]],
      ], { color: GELB, ...C }),
      ...pair((s) => skirts(s * 1.8, 1.18, -2.8, 2.4, 0.52, 6, GELB)).flat(),
      P.box(2.0, 0.04, 1.5, { y: 1.86, z: -2.4, color: GELB_DK }),
      ...pair((s) => P.cyl(0.08, 0.08, 0.5, { x: s * 0.45, y: 1.4, z: -3.55, rx: Math.PI / 2, color: STEEL }, 8)), // the exhausts
      ...[-1, 1].flatMap((s) => balkenkreuz(s * 1.82, 1.35, -0.4, 0.26)),
    ]), 1.25, 0.3),
    turret: grime(merge([
      castTurret([[1.0, 0.75, 0.75], [0.8, 0.95, 0.8], [-1.0, 1.05, 0.8], [-2.1, 0.95, 0.72], [-2.25, 0.7, 0.6]], { color: GELB, ...C }, 4),
      P.cyl(0.33, 0.35, 0.25, { x: 0.45, y: 0.85, z: -1.0, color: GELB, ...C }, 14),          // the cupola
      P.box(0.9, 0.75, 0.45, { y: 0.4, z: 1.15, color: GELB, ...C }),                          // the "chin" mantlet
    ]), 0.9, 0.0, 0.3),
    gun: barrel(4.9, 0.055, GELB),
  };
}), mats, { turretAt: [0, 1.85, 0.0], gunAt: [0, 0.42, 1.3], muzzle: 5.35 });

export const buildFjTiger = (mats) => rig(once('tiger', () => {
  const gear = interleaved({ halfWidth: 1.45, length: 4.2, wheels: 8, wheelR: 0.4, sprocket: 1, trackWidth: 0.72, wheelColor: GELB_DK });
  return {
    gear, wheel: roadWheelGeometry(0.4, 0.2, GELB_DK),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-3.15, 1.85, 0.5], [2.2, 1.85, 0.5], [2.35, 1.85, 0.75], [3.15, 1.15, 0.6]], { belly: 0.9, fender: 1.82, fenderY: 1.05, chamfer: 0.03 }, { color: GELB, ...C }),
      P.box(0.5, 0.14, 0.05, { x: -0.55, y: 1.68, z: 2.38, color: GLASS }),
      P.box(2.0, 0.04, 1.5, { y: 1.86, z: -2.2, color: GELB_DK }),
      ...pair((s) => P.box(0.4, 0.6, 0.45, { x: s * 1.2, y: 1.25, z: -3.25, color: STEEL })),           // the air cleaners on the rear plate
      ...[-1, 1].flatMap((s) => balkenkreuz(s * 1.84, 1.5, -1.6, 0.26)),
    ]), 1.25, 0.3),
    turret: grime(merge([
      // the horseshoe: wide, near-vertical sides curving round the back
      castTurret([[1.05, 1.1, 0.85], [0.7, 1.35, 0.88], [-0.9, 1.35, 0.88], [-1.6, 1.15, 0.85], [-1.85, 0.7, 0.75]], { color: GELB, ...C }, 6),
      P.cyl(0.35, 0.37, 0.28, { x: -0.6, y: 0.95, z: -0.8, color: GELB, ...C }, 14),
      P.box(1.55, 0.85, 0.3, { y: 0.45, z: 1.15, color: GELB, ...C }),                          // the flat mantlet
      ...pair((s) => P.box(0.3, 0.12, 0.12, { x: s * 1.05, y: 0.75, z: 1.05, color: STEEL })), // smoke dischargers
    ]), 0.9, 0.0, 0.3),
    gun: barrel(4.3, 0.07, GELB),
  };
}), mats, { turretAt: [0, 1.85, 0.2], gunAt: [0, 0.45, 1.3], muzzle: 4.75 });

// ---------------------------------------------------------------- recon

/** An armoured car from its cross-sections on `axles` (spinning wheels), with an open or closed turret. */
const armouredCar = ({ stations, axles, halfTrack, r, color, dark, turret, gun, gunAt, muzzle, marks = [] }) => vehicle(() => ({
  wheels: wheeled(axles, halfTrack, r),
  hull: grime(merge([stationHull(stations, { color, ...C }), ...marks]), 1.0, 0.35),
  turret: { geo: merge(turret), at: turret.at ?? [0, 0, 0] },
  gun: { geo: gun, at: gunAt, pitch: null },
  muzzle,
  recoil: 0.12,
}));

export const buildUsM8 = (() => {
  const t = [castTurret([[0.85, 0.8, 0.6], [0.4, 0.92, 0.62], [-0.6, 0.9, 0.6], [-0.95, 0.6, 0.5]], { color: OD, ...C }, 3)];
  t.at = [0, 1.62, 0.1];
  return armouredCar({
    stations: [
      [-2.5, [[0, 0.55], [1.15, 0.55], [1.25, 1.3], [1.0, 1.62], [0, 1.62]]],
      [1.4, [[0, 0.55], [1.15, 0.55], [1.25, 1.3], [1.0, 1.62], [0, 1.62]]],
      [2.5, [[0, 0.65], [1.0, 0.65], [1.05, 1.0], [0.85, 1.2], [0, 1.2]]],
    ],
    axles: [1.6, -0.4, -1.6], halfTrack: 1.12, r: 0.5, color: OD, dark: OD_DK, turret: t,
    gun: barrel(1.6, 0.04, OD, 'none'), gunAt: [0, 0.35, 0.8], muzzle: [0, 0, 1.6],
    marks: [...[-1, 1].flatMap((s) => whiteStar(s * 1.26, 1.05, -0.6, 0.3))],
  });
})();

export const buildSovBA64 = (() => {
  const t = [castTurret([[0.4, 0.42, 0.42], [0, 0.48, 0.42], [-0.4, 0.42, 0.4]], { color: SOV, ...C }, 6)];
  t.at = [0, 1.45, -0.2];
  return armouredCar({
    stations: [
      [-1.8, [[0, 0.5], [0.72, 0.5], [0.76, 0.95], [0.55, 1.45], [0, 1.45]]],
      [0.6, [[0, 0.5], [0.72, 0.5], [0.76, 0.95], [0.55, 1.45], [0, 1.45]]],
      [1.85, [[0, 0.6], [0.55, 0.6], [0.6, 0.85], [0.35, 1.05], [0, 1.05]]],
    ],
    axles: [1.1, -1.05], halfTrack: 0.66, r: 0.42, color: SOV, dark: SOV_DK, turret: t,
    gun: merge([P.cyl(0.02, 0.02, 0.7, { z: 0.35, rx: Math.PI / 2, color: STEEL }, 6)]), gunAt: [0, 0.22, 0.4], muzzle: [0, 0, 0.72],
  });
})();

export const buildWhPuma = (() => {
  const t = [castTurret([[0.75, 0.55, 0.45], [0.4, 0.75, 0.55], [-0.6, 0.78, 0.55], [-1.0, 0.55, 0.45]], { color: GELB, ...C }, 3),
    castTurret([[1.05, 0.12, 0.2], [0.85, 0.24, 0.28], [0.6, 0.26, 0.3]], { color: GELB, ...C }, 2.4)];          // the "Saukopf" mantlet
  t.at = [0, 1.62, 0.2];
  return armouredCar({
    stations: [
      [-3.3, [[0, 0.65], [0.95, 0.65], [1.15, 1.15], [0.85, 1.62], [0, 1.62]]],
      [2.4, [[0, 0.65], [0.95, 0.65], [1.15, 1.15], [0.85, 1.62], [0, 1.62]]],
      [3.4, [[0, 0.8], [0.6, 0.8], [0.75, 1.05], [0.5, 1.2], [0, 1.2]]],
    ],
    axles: [2.3, 0.95, -0.95, -2.3], halfTrack: 1.0, r: 0.55, color: GELB, dark: GELB_DK, turret: t,
    gun: barrel(2.4, 0.04, GELB, 'double'), gunAt: [0, 0.22, 1.0], muzzle: [0, 0, 2.6],
    marks: [...[-1, 1].flatMap((s) => balkenkreuz(s * 1.16, 1.1, -1.5, 0.2))],
  });
})();

/** Kettenkrad: the tracked motorcycle — a front wheel and forks, the short track, two men on it. */
export const buildFjKettenkrad = vehicle(() => {
  const g = tracked({ halfWidth: 0.42, length: 1.3, wheels: 4, wheelR: 0.2, sprocket: 1, rollers: 0, trackWidth: 0.18, wheelColor: GELB_DK });
  const man = buildWw2Soldier({ army: 'fj', weapon: 'smg' });
  const seated = (x, z, rx = 0) => {
    const parts = [man.torso.clone(), man.arms.clone()];
    for (const side of [-1, 1]) {
      parts.push(man.thigh.clone().rotateX(-Math.PI / 2).translate(side * man.rig.hipX, man.rig.hipY, 0));
      parts.push(man.shin.clone().translate(side * man.rig.hipX, man.rig.hipY, man.rig.thighLen));
    }
    return merge(parts.map((p) => (p.index ? p.toNonIndexed() : p))).translate(x, 0.95 - man.rig.hipY, z);
  };
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      stationHull([[-1.0, [[0, 0.4], [0.45, 0.4], [0.5, 0.75], [0, 0.8]]], [0.6, [[0, 0.4], [0.45, 0.4], [0.5, 0.75], [0, 0.8]]], [1.0, [[0, 0.5], [0.2, 0.5], [0.2, 0.8], [0, 0.85]]]], { color: GELB, ...C }),
      P.cyl(0.3, 0.3, 0.12, { y: 0.3, z: 1.45, rz: Math.PI / 2, color: 0x1f201c }, 14),                    // the front wheel
      ...pair((s) => P.box(0.03, 0.75, 0.05, { x: s * 0.08, y: 0.65, z: 1.35, rx: 0.35, color: STEEL })), // the forks
      P.box(0.6, 0.03, 0.03, { y: 1.0, z: 1.27, color: STEEL }), P.box(0.04, 0.35, 0.04, { y: 0.85, z: 1.27, color: STEEL }), // handlebars on their stem
      seated(0, 0.45), seated(0, -0.55),
    ]), 1.0, 0.35),
    turret: { geo: merge([P.box(0.02, 0.02, 0.02, { color: STEEL })]), at: [0, 1.2, 0.6] },
    muzzle: [0, 0.1, 0.5],
  };
});

// ---------------------------------------------------------------- tank hunters

export const buildUsHellcat = (mats) => rig(once('m18', () => {
  const gear = runningGear({ halfWidth: 1.18, length: 3.9, wheels: 5, wheelR: 0.33, sprocket: 1, rollers: 4, trackWidth: 0.36, wheelColor: OD_DK });
  return {
    gear, wheel: roadWheelGeometry(0.33, 0.3, OD_DK),
    hull: grime(merge([
      ...gear.parts,
      stationHull([
        [-2.7, [[0, 0.5], [0.9, 0.5], [0.9, 0.95], [1.45, 0.95], [1.3, 1.6], [0, 1.6]]],
        [1.6, [[0, 0.5], [0.9, 0.5], [0.9, 0.95], [1.45, 0.95], [1.3, 1.6], [0, 1.6]]],
        [2.75, [[0, 0.6], [0.9, 0.6], [0.9, 0.85], [1.3, 0.85], [1.2, 0.95], [0, 0.95]]],
      ], { color: OD, ...C }),
      ...[-1, 1].flatMap((s) => whiteStar(s * 1.39, 1.25, -0.8, 0.33)),
    ]), 1.25, 0.3),
    turret: grime(merge([
      // the open-topped turret: thin walls round an empty middle
      ...pair((s) => P.box(0.06, 0.6, 2.2, { x: s * 0.95, y: 0.3, z: -0.1, rz: s * 0.25, color: OD, ...C })),
      P.box(1.9, 0.6, 0.06, { y: 0.3, z: -1.2, color: OD, ...C }),
      P.box(1.5, 0.55, 0.06, { y: 0.28, z: 1.0, rx: 0.4, color: OD, ...C }),
      P.box(0.7, 0.5, 0.35, { y: 0.3, z: 1.15, color: OD, ...C }),
      P.box(0.1, 0.12, 0.4, { x: -0.8, y: 0.6, z: -1.0, color: STEEL }),                 // the .50 on the ring
    ]), 0.9, 0.0, 0.3),
    gun: barrel(3.6, 0.055, OD, 'double'),
  };
}), mats, { turretAt: [0, 1.6, 0.0], gunAt: [0, 0.32, 1.3], muzzle: 4.0 });

/** The T-34 hull with a casemate in the front right, its gun in the plate (SU-100) — or the big ISU's on the IS hull. */
export const buildSovSU100 = (mats) => rig(once('su100', () => {
  const gear = runningGear({ halfWidth: 1.25, length: 4.3, wheels: 5, wheelR: 0.41, sprocket: -1, rollers: 0, trackWidth: 0.5, wheelColor: SOV_DK });
  return {
    gear, wheel: roadWheelGeometry(0.41, 0.42, SOV_DK, 0, 0.1),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-3.0, 1.45, 0.5], [-2.7, 1.62, 0.45], [-0.2, 1.62, 0.45]], { belly: 0.95, fender: 1.5, fenderY: 1.0, chamfer: 0.42 }, { color: SOV, ...C }),
      // the casemate: the glacis carried on up, sloped sides
      stationHull([
        [-0.25, [[0, 0.45], [0.95, 0.45], [1.5, 1.0], [1.1, 2.25], [0, 2.25]]],
        [1.3, [[0, 0.45], [0.95, 0.45], [1.5, 1.0], [1.1, 2.25], [0, 2.25]]],
        [3.0, [[0, 0.5], [0.95, 0.5], [1.5, 0.9], [1.15, 1.0], [0, 1.0]]],
      ], { color: SOV, ...C }),
      P.cyl(0.32, 0.34, 0.22, { x: 0.6, y: 2.35, z: 0.4, color: SOV, ...C }, 14),
      ...pair((s) => P.box(0.012, 0.25, 0.5, { x: s * 1.3, y: 1.8, z: 0.5, color: WHITE })),
    ]), 1.25, 0.3),
    turret: merge([castTurret([[0.45, 0.3, 0.35], [0.2, 0.42, 0.42], [0.0, 0.45, 0.45]], { color: SOV, ...C }, 2.4)]),
    gun: barrel(4.6, 0.065, SOV, 'none'),
  };
}), mats, { turretAt: [0.3, 1.6, 2.15], gunAt: [0, 0.1, 0.3], muzzle: 4.9, arc: 0.15 });

export const buildWhJagdpanzerIV = (mats) => rig(once('jp4', () => {
  const gear = runningGear({ halfWidth: 1.12, length: 3.9, wheels: 8, wheelR: 0.235, sprocket: 1, rollers: 4, trackWidth: 0.4, wheelColor: GELB_DK });
  return {
    gear, wheel: roadWheelGeometry(0.235, 0.32, GELB_DK),
    hull: grime(merge([
      ...gear.parts,
      // low: the sloped front plates meeting at a point, sloped sides, a flat roof
      stationHull([
        [-2.95, [[0, 0.45], [0.82, 0.45], [0.82, 1.0], [1.4, 1.0], [1.1, 1.85], [0, 1.85]]],
        [1.0, [[0, 0.45], [0.82, 0.45], [0.82, 1.0], [1.4, 1.0], [1.1, 1.85], [0, 1.85]]],
        [2.95, [[0, 0.55], [0.82, 0.55], [0.82, 0.95], [1.3, 0.95], [1.1, 1.0], [0, 1.0]]],
      ], { color: GELB, ...C }),
      ...pair((s) => skirts(s * 1.47, 1.15, -2.6, 1.9, 0.6, 5, GELB)).flat(),
      ...[-1, 1].flatMap((s) => balkenkreuz(s * 1.5, 1.15, -0.6, 0.24)),
    ]), 1.25, 0.3),
    turret: merge([castTurret([[0.45, 0.25, 0.32], [0.2, 0.36, 0.38], [0.0, 0.38, 0.4]], { color: GELB, ...C }, 2.4)]),
    gun: barrel(4.4, 0.055, GELB, 'none'),
  };
}), mats, { turretAt: [-0.2, 1.4, 1.85], gunAt: [0, 0.08, 0.3], muzzle: 4.7, arc: 0.18 });

export const buildFjHetzer = (mats) => rig(once('hetzer', () => {
  const gear = runningGear({ halfWidth: 1.05, length: 3.0, wheels: 4, wheelR: 0.39, sprocket: 1, rollers: 1, trackWidth: 0.35, wheelColor: GELB_DK });
  return {
    gear, wheel: roadWheelGeometry(0.39, 0.3, GELB_DK),
    hull: grime(merge([
      ...gear.parts,
      // all plates sloped: the long nose, the narrow roof
      stationHull([
        [-2.4, [[0, 0.45], [0.85, 0.45], [1.3, 0.95], [0.85, 1.75], [0, 1.75]]],
        [0.6, [[0, 0.45], [0.85, 0.45], [1.3, 0.95], [0.85, 1.85], [0, 1.85]]],
        [2.45, [[0, 0.5], [0.85, 0.5], [1.2, 0.85], [0.7, 0.95], [0, 0.95]]],
      ], { color: GELB, ...C }),
      P.box(0.2, 0.25, 0.4, { x: -0.3, y: 1.98, z: -0.4, color: STEEL }),                           // the remote MG on the roof
      ...[-1, 1].flatMap((s) => balkenkreuz(s * 1.2, 1.25, -1.2, 0.2)),
    ]), 1.25, 0.3),
    turret: merge([castTurret([[0.4, 0.25, 0.3], [0.15, 0.35, 0.36], [0.0, 0.36, 0.38]], { color: GELB, ...C }, 2.4)]),
    gun: barrel(2.6, 0.05, GELB, 'double'),
  };
}), mats, { turretAt: [0.35, 1.3, 1.75], gunAt: [0, 0.08, 0.3], muzzle: 2.95, arc: 0.18 });

// ---------------------------------------------------------------- assault

export const buildUsM4Dozer = (mats) => rig(once('m4dozer', () => {
  const gear = runningGear({ halfWidth: 1.12, length: 4.0, wheels: 6, wheelR: 0.26, sprocket: 1, rollers: 3, trackWidth: 0.42, wheelColor: OD_DK });
  return {
    gear, wheel: roadWheelGeometry(0.26, 0.36, OD_DK),
    hull: grime(merge([
      ...gear.parts,
      ...pair((s) => [-1.35, 0, 1.35].map((z) => P.box(0.2, 0.42, 0.7, { x: s * 1.12, y: 0.55, z, color: OD_DK }))).flat(),
      trackedHull([[-2.95, 1.75, 0.55], [-2.7, 1.95, 0.5], [1.3, 1.98, 0.5], [2.75, 1.05, 0.55]], { belly: 0.85, fender: 1.32, fenderY: 1.02, chamfer: 0.06 }, { color: OD, ...C }),
      P.cyl(0.45, 0.45, 1.75, { y: 0.92, z: 2.75, rz: Math.PI / 2, color: OD, ...C }, 16),
      // the dozer blade on its push arms
      P.box(3.3, 0.95, 0.1, { y: 0.6, z: 3.85, rx: -0.15, color: OD_DK }),
      ...pair((s) => P.box(0.12, 0.15, 1.6, { x: s * 1.2, y: 0.7, z: 3.0, rx: 0.15, color: STEEL })),
      ...[-1, 1].flatMap((s) => whiteStar(s * 1.335, 1.55, -0.6, 0.38)),
    ]), 1.25, 0.3),
    turret: grime(merge([
      castTurret([[1.1, 0.5, 0.5], [0.85, 0.85, 0.7], [0.2, 0.98, 0.76], [-0.6, 0.95, 0.74], [-1.2, 0.8, 0.58], [-1.45, 0.5, 0.4]], { color: OD, ...C }),
      P.cyl(0.33, 0.35, 0.2, { x: 0.45, y: 0.86, z: -0.35, color: OD, ...C }, 14),
      P.box(0.85, 0.5, 0.28, { y: 0.4, z: 1.15, color: OD, ...C }),
    ]), 0.9, 0.0, 0.3),
    gun: barrel(2.3, 0.05, OD, 'none'),                                                               // the short 75 mm
  };
}), mats, { turretAt: [0, 1.98, -0.2], gunAt: [0, 0.4, 1.25], muzzle: 2.35 });

export const buildSovISU152 = (mats) => rig(once('isu152', () => {
  const gear = runningGear({ halfWidth: 1.28, length: 4.8, wheels: 6, wheelR: 0.33, sprocket: -1, rollers: 3, trackWidth: 0.65, wheelColor: SOV_DK });
  return {
    gear, wheel: roadWheelGeometry(0.33, 0.48, SOV_DK),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-3.35, 1.4, 0.5], [-3.0, 1.62, 0.45], [-0.9, 1.62, 0.45]], { belly: 1.0, fender: 1.55, fenderY: 1.0, chamfer: 0.3 }, { color: SOV, ...C }),
      // the big casemate: tall, its sides sloping in, right to the nose
      stationHull([
        [-0.95, [[0, 0.45], [1.0, 0.45], [1.55, 1.0], [1.2, 2.45], [0, 2.45]]],
        [2.0, [[0, 0.45], [1.0, 0.45], [1.55, 1.0], [1.2, 2.45], [0, 2.45]]],
        [3.35, [[0, 0.5], [1.0, 0.5], [1.5, 0.9], [1.2, 1.05], [0, 1.05]]],
      ], { color: SOV, ...C }),
      P.cyl(0.33, 0.35, 0.22, { x: -0.6, y: 2.55, z: 0.3, color: SOV, ...C }, 14),
      P.box(0.12, 0.14, 0.45, { x: 0.6, y: 2.5, z: 0.3, color: STEEL }),                             // the DShK
    ]), 1.25, 0.3),
    turret: merge([castTurret([[0.55, 0.42, 0.45], [0.25, 0.55, 0.55], [0.0, 0.58, 0.58]], { color: SOV, ...C }, 2.4)]),
    gun: barrel(2.9, 0.1, SOV, 'round'),                                                              // the 152 mm ML-20S, its big brake
  };
}), mats, { turretAt: [0.25, 1.75, 2.75], gunAt: [0, 0.1, 0.35], muzzle: 3.4, arc: 0.15, recoil: 0.5 });

export const buildWhBrummbaer = (mats) => rig(once('brummbaer', () => {
  const gear = runningGear({ halfWidth: 1.12, length: 3.9, wheels: 8, wheelR: 0.235, sprocket: 1, rollers: 4, trackWidth: 0.4, wheelColor: GELB_DK });
  return {
    gear, wheel: roadWheelGeometry(0.235, 0.32, GELB_DK),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-2.95, 1.55, 0.45], [1.95, 1.62, 0.45], [2.25, 1.62, 0.6], [2.95, 1.0, 0.55]], { belly: 0.82, fender: 1.2, fenderY: 1.0, chamfer: 0.04 }, { color: GELB, ...C }),
      // the tall boxy casemate with its sloped front plate
      stationHull([
        [-1.3, [[0, 1.55], [1.15, 1.55], [1.0, 2.55], [0, 2.55]]],
        [1.3, [[0, 1.55], [1.15, 1.55], [1.0, 2.55], [0, 2.55]]],
        [2.1, [[0, 1.55], [1.15, 1.55], [1.0, 1.75], [0, 1.75]]],
      ], { color: GELB, ...C }),
      ...pair((s) => skirts(s * 1.47, 1.18, -2.6, 2.0, 0.65, 5, GELB)).flat(),
      ...[-1, 1].flatMap((s) => balkenkreuz(s * 1.5, 1.18, -0.6, 0.24)),
    ]), 1.25, 0.3),
    turret: merge([P.sphere(0.36, { color: GELB, ...C }, 12, 8)]),                                    // the ball mount
    gun: barrel(1.0, 0.1, GELB, 'none'),                                                              // the short 15 cm StuH 43
  };
}), mats, { turretAt: [0, 2.0, 1.95], gunAt: [0, 0, 0.2], muzzle: 1.2, arc: 0.15, recoil: 0.4 });

export const buildFjSturmtiger = (mats) => rig(once('sturmtiger', () => {
  const gear = interleaved({ halfWidth: 1.45, length: 4.2, wheels: 8, wheelR: 0.4, sprocket: 1, trackWidth: 0.72, wheelColor: GELB_DK });
  return {
    gear, wheel: roadWheelGeometry(0.4, 0.2, GELB_DK),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-3.15, 1.85, 0.5], [3.15, 1.85, 0.5]], { belly: 0.9, fender: 1.82, fenderY: 1.05, chamfer: 0.03 }, { color: GELB, ...C }),
      // the huge sloped casemate over the front half
      stationHull([
        [-0.6, [[0, 1.85], [1.4, 1.85], [1.25, 2.85], [0, 2.85]]],
        [2.0, [[0, 1.85], [1.4, 1.85], [1.25, 2.85], [0, 2.85]]],
        [3.15, [[0, 1.85], [1.4, 1.85], [1.2, 1.95], [0, 1.95]]],
      ], { color: GELB, ...C }),
      P.box(0.12, 0.55, 0.12, { x: 1.2, y: 3.1, z: 0.0, color: STEEL }),                                // the loading crane
      P.box(0.1, 0.1, 1.0, { x: 1.2, y: 3.35, z: 0.4, color: STEEL }),
      ...[-1, 1].flatMap((s) => balkenkreuz(s * 1.84, 1.5, -1.8, 0.26)),
    ]), 1.25, 0.3),
    turret: merge([P.sphere(0.5, { color: GELB, ...C }, 12, 8)]),
    gun: barrel(0.9, 0.2, GELB, 'none'),                                                              // the 38 cm rocket mortar
  };
}), mats, { turretAt: [0.25, 2.35, 2.55], gunAt: [0, 0, 0.2], muzzle: 1.1, arc: 0.12, recoil: 0.2 });
