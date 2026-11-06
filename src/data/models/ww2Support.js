// 1945 support vehicles (data/units45), real dimensions, nose toward +z:
//   ambulances      Dodge WC54 · GAZ ambulance · Sd.Kfz. 251/8 · Opel Blitz ambulance
//   recovery        M32 (a Sherman with its A-frame boom) · T-34 recovery tractor (turretless, a
//                   jib) · Bergepanther (the Panther hull, the wooden box, the crane) · Sd.Kfz. 9 Famo
//   bridges         the treadway lorry · the pontoon lorries · Brückenleger IV (its bridge on the hull)
//   mine clearing   T1E3 "Aunt Jemima" (the Sherman with two big roller sets) · the T-34 with PT-3
//                   rollers · Goliath (the little remote demolition carrier)
//   command posts   M3 · radio lorry · Sd.Kfz. 251/6 (the bedstead antenna) · Opel Blitz — each
//                   puts its mast up once set up
//   smoke / supply  smoke generator lorries (US, Red Army, Wehrmacht) · the Fallschirmjäger's
//                   supply lorry, crates stacked in the back
// Contract: render/RigRenderer.js (support.js vehicle()).
import { P, merge, pair, grime } from '../units/geometry.js';
import { trackedHull, stationHull } from './vehicleCommon.js';
import { vehicle, tracked, wheeled, cross } from './support.js';
import { truckUnit } from './truck.js';
import { halfTrack, whiteStar, balkenkreuz, crane } from './ww2Armour.js';

const OD = 0x4d4f34;
const OD_DK = 0x3c3e28;
const SOV = 0x4a5a34;
const SOV_DK = 0x3a4628;
const GELB = 0x9a8a5a;
const GELB_DK = 0x7a6c44;
const STEEL = 0x2b2d28;
const WOOD = 0x5a4632;
const C = { camo: 1 };

const ARMY = {
  us: { color: OD, dark: OD_DK },
  sov: { color: SOV, dark: SOV_DK },
  de: { color: GELB, dark: GELB_DK },
};
/** A lorry of `army` with what it carries: `extra(L)` parts on it, `load` (dropped: a bridge), `deploy` (a mast once set up). */
const lorry = (army, o, { extra = () => [], load = null, deploy = null, muzzle = [0, 2.5, 0] } = {}) => vehicle(() => {
  const { color, dark } = ARMY[army];
  const t = truckUnit({ color, dark, camo: army === 'de' ? 1 : 0, ...o });
  const L = t.layout;
  return {
    wheels: wheeled(L.axles, t.track, o.r),
    hull: grime(merge([...t.parts, ...extra(L)]), 1, 0.4),
    ...(load ? { load: merge(load(L)) } : {}),
    ...(deploy ? { deploy: { geo: merge(deploy(L).parts), at: deploy(L).at } } : {}),
    muzzle,
  };
});
const DODGE = { length: 4.9, width: 1.95, bonnet: 'square', r: 0.42, axles: [3.8, 0.9] };
const GAZ = { length: 5.3, width: 2.0, bonnet: 'round', r: 0.42, axles: [4.2, 1.1] };
const STUDEBAKER = { length: 6.2, width: 2.24, bonnet: 'square', r: 0.48, axles: [4.9, 1.75, 0.6] };
const GMC = { length: 6.9, width: 2.24, bonnet: 'square', r: 0.48, axles: [5.4, 1.9, 0.75] };
const BLITZ = { length: 6.0, width: 2.26, bonnet: 'round', r: 0.48, axles: [4.75, 1.2] };

/** A mast that goes up once the post is set up (support.js deploy). */
const mast = (at) => ({ parts: [P.cyl(0.04, 0.05, 7, { y: 3.5, color: STEEL }, 6), P.box(1.2, 0.04, 0.04, { y: 6.8, color: STEEL })], at });
/** Smoke generator kit on a bed: the fog-oil drums, the generator, its exhaust. */
const smokeKit = (L) => [
  ...[-0.55, 0, 0.55].map((x) => P.cyl(0.28, 0.28, 0.9, { x, y: L.deck + 0.45, z: L.rear + 0.7, color: 0x3a3c32 }, 12)),
  P.box(1.1, 0.8, 1.2, { y: L.deck + 0.4, z: L.rear + 2.0, color: STEEL }),
  P.cyl(0.1, 0.12, 1.1, { x: 0.4, y: L.deck + 1.25, z: L.rear + 2.2, color: 0x222220 }, 8),
];

// ---------------------------------------------------------------- ambulances

const redCrosses = (L, hw) => [...pair((s) => cross({ x: s * (hw + 0.01), y: L.deck + 0.95, z: L.rear + 1.3 })).flat(), ...cross({ y: L.top + 0.02, z: L.rear + 1.3, rz: Math.PI / 2 })];
export const buildUsWC54 = lorry('us', { ...DODGE, body: 'box', bodyH: 1.7 }, { extra: (L) => redCrosses(L, L.hw) });
export const buildSovGazAmb = lorry('sov', { ...GAZ, body: 'box', bodyH: 1.7 }, { extra: (L) => redCrosses(L, L.hw) });
export const buildFjBlitzAmb = lorry('de', { ...BLITZ, body: 'box', bodyH: 1.9 }, { extra: (L) => redCrosses(L, L.hw) });
export const buildWh2518 = (mats) => {
  const g = halfTrack({ color: GELB, dark: GELB_DK, length: 5.8, width: 2.1, wheelZ: 1.9, trackZ: -1.1, trackLen: 3.0, faceted: true, mg: 'shield' });
  return vehicle(() => ({
    wheels: { geo: g.wheel, list: g.gear.wheels, r: g.gear.wheelR },
    hull: merge([g.hull, ...pair((s) => cross({ x: s * 1.06, y: 1.4, z: -1.2 })).flat()]),
    muzzle: [0, 2, 0],
  }))(mats);
};

// ---------------------------------------------------------------- recovery

const shermanGear = () => tracked({ halfWidth: 1.12, length: 4.0, wheels: 6, wheelR: 0.26, sprocket: 1, rollers: 3, trackWidth: 0.42, wheelColor: OD_DK });
const shermanHull = () => [
  trackedHull([[-2.95, 1.75, 0.55], [-2.7, 1.95, 0.5], [1.3, 1.98, 0.5], [2.75, 1.05, 0.55]], { belly: 0.85, fender: 1.32, fenderY: 1.02, chamfer: 0.06 }, { color: OD, ...C }),
  P.box(1.75, 0.62, 0.1, { y: 0.78, z: 2.62, rx: 0.46, color: OD, ...C }),
];
const t34Gear = () => tracked({ halfWidth: 1.25, length: 4.3, wheels: 5, wheelR: 0.41, sprocket: -1, rollers: 0, trackWidth: 0.5, wheelColor: SOV_DK });
const t34Hull = () => trackedHull([[-3.0, 1.45, 0.5], [-2.7, 1.62, 0.45], [1.75, 1.62, 0.45], [3.0, 0.7, 0.5]], { belly: 0.95, fender: 1.5, fenderY: 1.0, chamfer: 0.42 }, { color: SOV, ...C });

export const buildUsM32 = vehicle(() => {
  const g = shermanGear();
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts, ...shermanHull(),
      P.box(1.9, 0.9, 1.9, { y: 2.4, z: -0.3, color: OD, ...C }),                                     // the fixed turret
      ...pair((s) => P.box(0.12, 0.12, 3.6, { x: s * 0.8, y: 2.6, z: 1.6, rx: -0.55, color: STEEL })),   // the A-frame boom, folded forward
      P.box(1.7, 0.12, 0.12, { y: 3.55, z: 3.05, color: STEEL }),
      ...[-1, 1].flatMap((s) => whiteStar(s * 1.335, 1.55, -0.9, 0.36)),
    ]), 1.25, 0.3),
    muzzle: [0, 3, 0],
  };
});
export const buildSovT34Tractor = vehicle(() => {
  const g = t34Gear();
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts, t34Hull(),
      P.cyl(0.9, 0.9, 0.12, { y: 1.68, z: 0.45, color: SOV_DK }, 16),                                  // the turret ring, plated over
      ...crane(0.8, 1.6, 3.2, 1.6, 1.6, 0.35, STEEL),                                                    // the jib
      P.box(1.2, 0.5, 1.6, { y: 1.9, z: -1.8, color: WOOD }),                                           // stowage on the deck
    ]), 1.25, 0.3),
    muzzle: [0, 2.5, 0],
  };
});
export const buildWhBergepanther = vehicle(() => {
  const g = tracked({ halfWidth: 1.42, length: 4.4, wheels: 8, wheelR: 0.43, sprocket: 1, rollers: 0, trackWidth: 0.66, wheelColor: GELB_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      stationHull([
        [-3.4, [[0, 0.55], [1.0, 0.55], [1.0, 1.05], [1.75, 1.05], [1.45, 1.85], [0, 1.85]]],
        [1.6, [[0, 0.55], [1.0, 0.55], [1.0, 1.05], [1.75, 1.05], [1.45, 1.85], [0, 1.85]]],
        [3.45, [[0, 0.62], [1.0, 0.62], [1.0, 0.9], [1.6, 0.9], [1.4, 1.0], [0, 1.0]]],
      ], { color: GELB, ...C }),
      ...pair((s) => P.box(0.06, 0.8, 2.6, { x: s * 1.25, y: 2.25, z: -0.3, color: WOOD })),             // the wooden box walls
      P.box(2.5, 0.8, 0.06, { y: 2.25, z: -1.6, color: WOOD }),
      ...crane(-0.9, 1.8, 3.4, 1.4, 1.8, 0.4, STEEL),                                                   // the crane
      ...[-1, 1].flatMap((s) => balkenkreuz(s * 1.75, 1.45, -1.0, 0.24)),
    ]), 1.25, 0.3),
    muzzle: [0, 2.5, 0],
  };
});
export const buildFjFamo = (mats) => {
  const g = halfTrack({ color: GELB, dark: GELB_DK, length: 8.3, width: 2.6, wheelZ: 3.0, trackZ: -1.4, trackLen: 4.0, faceted: false, mg: 'ring' });
  return vehicle(() => ({
    wheels: { geo: g.wheel, list: g.gear.wheels, r: g.gear.wheelR },
    hull: merge([g.hull, ...crane(0, 0.95, 2.6, -3.6, -1.9, 0.5, STEEL)]), // the crane at the back
    muzzle: [0, 2.5, 0],
  }))(mats);
};

// ---------------------------------------------------------------- bridges

/** Treadway or pontoon sections on a bed: hidden once the bridge is down (support.js load). */
const treadway = (L, color) => [
  ...pair((s) => P.box(0.9, 0.18, 4.6, { x: s * 0.55, y: L.deck + 0.35, z: L.rear + 2.2, color })),
  ...pair((s) => P.box(0.9, 0.18, 4.6, { x: s * 0.55, y: L.deck + 0.55, z: L.rear + 2.2, color })),
];
const pontoon = (L, color) => [
  P.box(1.9, 0.75, 4.6, { y: L.deck + 0.45, z: L.rear + 2.2, color }),
  P.box(1.7, 0.04, 4.4, { y: L.deck + 0.83, z: L.rear + 2.2, color: STEEL }),
];
export const buildUsTreadway = lorry('us', { ...GMC, body: 'flat' }, { load: (L) => treadway(L, OD_DK) });
export const buildSovPontoon = lorry('sov', { ...STUDEBAKER, body: 'flat' }, { load: (L) => pontoon(L, SOV_DK) });
export const buildFjPontoon = lorry('de', { ...BLITZ, body: 'flat' }, { load: (L) => pontoon(L, GELB_DK) });
export const buildWhBrueckenleger = vehicle(() => {
  const g = tracked({ halfWidth: 1.12, length: 3.9, wheels: 8, wheelR: 0.235, sprocket: 1, rollers: 4, trackWidth: 0.4, wheelColor: GELB_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([...g.parts,
      trackedHull([[-2.95, 1.55, 0.45], [1.95, 1.62, 0.45], [2.25, 1.62, 0.6], [2.95, 1.0, 0.55]], { belly: 0.82, fender: 1.2, fenderY: 1.0, chamfer: 0.04 }, { color: GELB, ...C }),
      ...[-1, 1].flatMap((s) => balkenkreuz(s * 1.22, 1.3, -0.4, 0.24))]), 1.25, 0.3),
    load: merge([...pair((s) => P.box(0.8, 0.25, 9.0, { x: s * 0.6, y: 1.74, z: 0.0, color: GELB_DK })), P.box(0.3, 0.6, 0.3, { y: 1.75, z: 2.5, color: STEEL })]),
    muzzle: [0, 2, 0],
  };
});

// ---------------------------------------------------------------- mine clearing

/** Mine-exploder rollers ahead of the tracks: a set of heavy discs a side on their arms. */
const rollers = (z, x, color, discs = 5, r = 0.65) => pair((s) => [
  P.cyl(0.08, 0.08, discs * 0.17 + 0.12, { x: s * x, y: r, z, rz: Math.PI / 2, color: STEEL }, 8), // the axle through the discs
  ...Array.from({ length: discs }, (_, k) => P.cyl(r, r, 0.1, { x: s * x + (k - (discs - 1) / 2) * 0.17, y: r, z, rz: Math.PI / 2, color }, 14)),
  P.box(0.12, 0.12, 2.0, { x: s * x, y: 0.95, z: z - 1.0, rx: 0.3, color: STEEL }),
]).flat();
export const buildUsT1E3 = vehicle(() => {
  const g = shermanGear();
  return {
    wheels: g.wheels,
    hull: grime(merge([...g.parts, ...shermanHull(), ...rollers(4.4, 1.0, 0x3a3c32, 5, 1.0), ...[-1, 1].flatMap((s) => whiteStar(s * 1.335, 1.55, -0.6, 0.38))]), 1.25, 0.3),
    turret: { geo: merge([P.cyl(0.95, 1.0, 0.75, { y: 0.37, color: OD, ...C }, 16)]), at: [0, 1.98, -0.2] },
    gun: { geo: merge([P.cyl(0.05, 0.06, 2.4, { z: 1.2, rx: Math.PI / 2, color: OD }, 10)]), at: [0, 0.4, 0.9], pitch: 0.05 },
    muzzle: [0, 0, 2.4],
  };
});
export const buildSovPT3 = vehicle(() => {
  const g = t34Gear();
  return {
    wheels: g.wheels,
    hull: grime(merge([...g.parts, t34Hull(), ...rollers(4.3, 1.25, 0x2e3528, 3, 0.55)]), 1.25, 0.3),
    turret: { geo: merge([P.cyl(1.0, 1.1, 0.7, { y: 0.35, color: SOV, ...C }, 16)]), at: [0, 1.62, 0.45] },
    gun: { geo: merge([P.cyl(0.06, 0.07, 4.2, { z: 2.1, rx: Math.PI / 2, color: SOV }, 10)]), at: [0, 0.42, 0.85], pitch: 0.05 },
    muzzle: [0, 0, 4.2],
  };
});
export const buildDeGoliath = vehicle(() => {
  const g = tracked({ halfWidth: 0.42, length: 1.2, wheels: 4, wheelR: 0.12, sprocket: 1, rollers: 0, trackWidth: 0.18, wheelColor: GELB_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([...g.parts, stationHull([[-0.75, [[0, 0.1], [0.3, 0.1], [0.32, 0.55], [0, 0.6]]], [0.6, [[0, 0.1], [0.3, 0.1], [0.32, 0.55], [0, 0.6]]], [0.8, [[0, 0.15], [0.2, 0.15], [0.22, 0.3], [0, 0.32]]]], { color: GELB, ...C }),
      P.cyl(0.05, 0.05, 0.6, { y: 0.35, z: -1.0, rx: Math.PI / 2, color: 0x222222 }, 6)]), 1, 0.3),        // the cable drum's lead
    muzzle: [0, 0.5, 0.8],
  };
});

// ---------------------------------------------------------------- command posts

export const buildUsM3Command = (mats) => {
  const g = halfTrack({ color: OD, dark: OD_DK, length: 6.2, width: 2.2, wheelZ: 2.0, trackZ: -1.6, trackLen: 2.0, faceted: false, mg: 'ring' });
  return vehicle(() => ({ wheels: { geo: g.wheel, list: g.gear.wheels, r: g.gear.wheelR }, hull: g.hull, deploy: { geo: merge(mast().parts), at: [0.6, 0.97, -2.4] }, muzzle: [0, 2, 0] }))(mats);
};
export const buildSovRadioLorry = lorry('sov', { ...GAZ, body: 'box', bodyH: 1.7 }, { deploy: (L) => mast([0.6, L.top, L.rear + 0.4]) });
export const buildWh2516 = (mats) => {
  const g = halfTrack({ color: GELB, dark: GELB_DK, length: 5.8, width: 2.1, wheelZ: 1.9, trackZ: -1.1, trackLen: 3.0, faceted: true, mg: 'shield' });
  return vehicle(() => ({
    wheels: { geo: g.wheel, list: g.gear.wheels, r: g.gear.wheelR },
    hull: merge([g.hull, ...pair((s) => P.box(0.05, 0.05, 2.6, { x: s * 0.9, y: 2.2, z: -1.0, color: STEEL })), ...[-2.2, 0.2].map((z) => P.box(1.85, 0.05, 0.05, { y: 2.2, z, color: STEEL })),
      ...pair((s) => [-2.2, 0.2].map((z) => P.box(0.05, 0.5, 0.05, { x: s * 0.9, y: 1.97, z, color: STEEL }))).flat()]), // the "bedstead" antenna on its posts
    deploy: { geo: merge(mast().parts), at: [0.6, 1.6, -2.4] },
    muzzle: [0, 2, 0],
  }))(mats);
};
export const buildFjBlitzCommand = lorry('de', { ...BLITZ, body: 'box', bodyH: 1.9 }, { deploy: (L) => mast([0.6, L.top, L.rear + 0.4]) });

// ---------------------------------------------------------------- smoke generators, the supply lorry

export const buildUsSmokeGen = lorry('us', { ...GMC, body: 'flat' }, { extra: smokeKit });
export const buildSovSmokeGen = lorry('sov', { ...STUDEBAKER, body: 'flat' }, { extra: smokeKit });
export const buildWhSmokeGen = lorry('de', { ...BLITZ, body: 'flat' }, { extra: smokeKit });
export const buildFjSupply = lorry('de', { ...BLITZ, body: 'cargo' }, {
  extra: (L) => [...Array.from({ length: 6 }, (_, k) => P.box(0.55, 0.45, 0.7, { x: (k % 2 - 0.5) * 0.65, y: L.deck + 0.25 + Math.floor(k / 4) * 0.45, z: L.rear + 0.45 + (Math.floor(k / 2) % 2) * 0.8, color: 0x4a4c34 }))], // ammunition crates at the tail
});
