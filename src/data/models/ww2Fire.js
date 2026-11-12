// 1945 fire support (data/units45), real dimensions, nose toward +z:
//   artillery   M7 Priest (the 105 mm on a Sherman hull, the machine-gun "pulpit") · 122 mm M-30
//               (towed, split trail, behind a Studebaker) · Wespe (the 10.5 cm on a Panzer II
//               hull) · 10.5 cm leFH 18 (towed, behind an Opel Blitz)
//   rockets     T34 Calliope (the 60-tube box over a Sherman's turret) · BM-13 Katyusha (the
//               rails on a Studebaker) · Panzerwerfer 42 (the ten tubes on the armoured Maultier)
//               · Nebelwerfer 41 (the six tubes on their carriage, towed)
//   SP mortars  M4 mortar carrier and Sd.Kfz. 251/2 (the mortar in a half-track) · 120 mm PM-38
//               (towed) · 12 cm GrW 42 on an Opel Blitz
// Towed pieces show emplaced, their tow vehicle while they move (support.js vehicle: tow).
// Contract: render/RigRenderer.js.
import { P, merge, pair, grime } from '../units/geometry.js';
import { stationHull, trackedHull } from './vehicleCommon.js';
import { vehicle, tracked, wheeled, towTruck } from './support.js';
import { truckUnit } from './truck.js';
import { halfTrack, whiteStar, balkenkreuz } from './ww2Armour.js';

const OD = 0x4d4f34;
const OD_DK = 0x3c3e28;
const SOV = 0x4a5a34;
const SOV_DK = 0x3a4628;
const GELB = 0x9a8a5a;
const GELB_DK = 0x7a6c44;
const GREY = 0x55584a;      // the Luftwaffe field units' guns: field grey
const STEEL = 0x2b2d28;
const RUBBER = 0x1f201c;
const C = { camo: 1 };

const tyre = (x, y, z, r, w) => [
  P.cyl(r, r, w, { x, y, z, rz: Math.PI / 2, color: RUBBER, surf: 'rubber' }, 14),
  P.cyl(r * 0.55, r * 0.55, w + 0.02, { x, y, z, rz: Math.PI / 2, color: STEEL }, 10),
];
/** A towed gun's split trail, spread when emplaced, the spades at its ends. */
const trail = (len, spread, color) => pair((s) => [
  P.box(0.14, 0.16, len, { x: s * Math.sin(spread) * len / 2, y: 0.25, z: -Math.cos(spread) * len / 2, ry: -s * spread, color }),
  P.box(0.4, 0.3, 0.08, { x: s * Math.sin(spread) * len, y: 0.12, z: -Math.cos(spread) * len, ry: -s * spread, color: STEEL }),
]).flat();
/** n × m launch tubes, a box of them along +z. */
const tubes = (cols, rows, r, len, gap, color) => merge(Array.from({ length: cols * rows }, (_, k) => P.cyl(r, r, len, {
  x: ((k % cols) - (cols - 1) / 2) * gap, y: (Math.floor(k / cols) - (rows - 1) / 2) * gap, z: len / 2, rx: Math.PI / 2, color,
}, 8)));
const shermanGear = () => tracked({ halfWidth: 1.12, length: 4.0, wheels: 6, wheelR: 0.26, sprocket: 1, rollers: 3, trackWidth: 0.42, wheelColor: OD_DK });

// ---------------------------------------------------------------- artillery

export const buildUsPriest = vehicle(() => {
  const g = shermanGear();
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-2.95, 1.75, 0.55], [1.3, 1.85, 0.5], [2.75, 1.05, 0.55]], { belly: 0.85, fender: 1.32, fenderY: 1.02, chamfer: 0.06 }, { color: OD, ...C }),
      P.box(1.75, 0.62, 0.1, { y: 0.78, z: 2.62, rx: 0.46, color: OD, ...C }),
      // the open fighting compartment: thin walls round it
      ...pair((s) => P.box(0.05, 0.75, 3.2, { x: s * 1.3, y: 2.2, z: -0.4, color: OD, ...C })),
      P.box(2.6, 0.75, 0.05, { y: 2.2, z: -2.0, color: OD, ...C }),
      P.cyl(0.42, 0.42, 0.9, { x: 0.75, y: 2.3, z: 1.0, color: OD, ...C }, 14),          // the "pulpit"
      P.box(0.1, 0.12, 0.6, { x: 0.75, y: 2.78, z: 1.2, color: STEEL }),                  // its .50
      ...[-1, 1].flatMap((s) => whiteStar(s * 1.335, 1.45, -1.2, 0.36)),
    ]), 1.25, 0.3),
    turret: { geo: merge([P.box(0.7, 0.4, 0.8, { y: 0.2, color: OD_DK })]), at: [-0.35, 1.85, 0.6] },
    gun: { geo: merge([P.cyl(0.07, 0.08, 2.5, { z: 1.25, rx: Math.PI / 2, color: OD }, 12), P.box(0.4, 0.35, 0.9, { z: 0.2, color: OD_DK })]), at: [0, 0.35, 0.3], pitch: null },
    muzzle: [0, 0, 2.5],
    recoil: 0.4,
  };
});

export const buildSovM30 = vehicle(() => ({
  hull: grime(merge([...trail(3.2, 0.42, SOV_DK), ...pair((s) => tyre(s * 0.95, 0.55, 0.1, 0.55, 0.22)).flat(), P.box(1.6, 0.12, 0.2, { y: 0.55, z: 0.1, color: SOV_DK })]), 1, 0.3),
  turret: { geo: grime(merge([P.box(1.6, 0.9, 0.06, { y: 0.75, z: 0.55, rx: -0.12, color: SOV }), P.box(0.45, 0.8, 1.2, { y: 0.35, color: SOV_DK })]), 0.8, 0, 0.3), at: [0, 0.45, 0] }, // (the carriage down to the axle)
  gun: { geo: merge([P.box(0.4, 0.38, 1.4, { color: SOV_DK }), P.cyl(0.075, 0.085, 3.0, { z: 1.8, rx: Math.PI / 2, color: SOV }, 12)]), at: [0, 0.75, 0.1], pitch: 0.4 },
  muzzle: [0, 0, 3.3],
  recoil: 0.5,
  tow: { geo: grime(merge(towTruck({ color: SOV, dark: SOV_DK, length: 6.2, width: 2.24 })), 1, 0.4), hitch: 3.6 },   // a Studebaker
}));

export const buildWhWespe = vehicle(() => {
  const g = tracked({ halfWidth: 0.95, length: 3.2, wheels: 5, wheelR: 0.3, sprocket: 1, rollers: 4, trackWidth: 0.3, wheelColor: GELB_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-2.4, 1.25, 0.45], [1.6, 1.3, 0.45], [2.4, 0.85, 0.5]], { belly: 0.7, fender: 1.1, fenderY: 0.95, chamfer: 0.04 }, { color: GELB, ...C }),
      // the open rear compartment, its sloped thin walls
      ...pair((s) => P.box(0.04, 0.75, 2.4, { x: s * 1.0, y: 1.65, z: -0.9, rz: s * 0.15, color: GELB, ...C })),
      P.box(2.0, 0.75, 0.04, { y: 1.65, z: 0.3, rx: 0.2, color: GELB, ...C }),
      ...[-1, 1].flatMap((s) => balkenkreuz(s * 1.12, 1.15, -1.0, 0.2)),
    ]), 1.25, 0.3),
    turret: { geo: merge([P.box(0.55, 0.35, 0.7, { y: 0.15, color: GELB_DK })]), at: [0, 1.4, -0.8] },
    gun: { geo: merge([P.cyl(0.06, 0.07, 2.6, { z: 1.3, rx: Math.PI / 2, color: GELB }, 12), P.box(0.28, 0.16, 0.3, { z: 2.7, color: STEEL })]), at: [0, 0.35, 0.3], pitch: null },
    muzzle: [0, 0, 2.85],
    recoil: 0.35,
  };
});

export const buildFjLeFH18 = vehicle(() => ({
  hull: grime(merge([...trail(2.8, 0.4, GREY), ...pair((s) => tyre(s * 0.9, 0.6, 0.05, 0.6, 0.18)).flat()]), 1, 0.3),
  turret: { geo: grime(merge([P.box(1.7, 0.95, 0.05, { y: 0.8, z: 0.45, rx: -0.1, color: GREY }), P.box(0.4, 0.5, 1.1, { y: 0.55, color: STEEL })]), 0.8, 0, 0.3), at: [0, 0.4, 0] },
  gun: { geo: merge([P.box(0.35, 0.32, 1.2, { color: STEEL }), P.cyl(0.06, 0.07, 2.6, { z: 1.6, rx: Math.PI / 2, color: GREY }, 12)]), at: [0, 0.8, 0.1], pitch: 0.38 },
  muzzle: [0, 0, 2.9],
  recoil: 0.45,
  tow: { geo: grime(merge(towTruck({ color: GELB, dark: GELB_DK, length: 6.0, width: 2.26, bonnet: 'round' })), 1, 0.4), hitch: 3.1 }, // an Opel Blitz
}));

// ---------------------------------------------------------------- rockets

export const buildUsCalliope = vehicle(() => {
  const g = shermanGear();
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-2.95, 1.75, 0.55], [-2.7, 1.95, 0.5], [1.3, 1.98, 0.5], [2.75, 1.05, 0.55]], { belly: 0.85, fender: 1.32, fenderY: 1.02, chamfer: 0.06 }, { color: OD, ...C }),
      P.box(1.75, 0.62, 0.1, { y: 0.78, z: 2.62, rx: 0.46, color: OD, ...C }),
      ...[-1, 1].flatMap((s) => whiteStar(s * 1.335, 1.55, -0.6, 0.38)),
    ]), 1.25, 0.3),
    // the turret, the rocket box on its frame over it
    turret: { geo: grime(merge([
      P.cyl(1.0, 1.05, 0.75, { y: 0.37, color: OD, ...C }, 16),
      ...pair((s) => P.box(0.08, 1.4, 0.1, { x: s * 0.9, y: 1.05, z: -0.3, color: STEEL })),   // the frame posts on the turret…
      P.box(1.9, 0.08, 0.12, { y: 1.72, z: -0.3, color: STEEL }),                            // …and its cross-member
    ]), 0.9, 0.0, 0.3), at: [0, 1.98, -0.2] },
    gun: { geo: merge([tubes(10, 4, 0.076, 2.9, 0.15, OD), tubes(6, 2, 0.076, 2.9, 0.15, OD).translate(0, -0.3, 0)]), at: [0, 1.88, -0.9], pitch: 0.25 },
    muzzle: [0, 0, 2.9],
    recoil: 0.02,
  };
});

export const buildSovKatyusha = vehicle(() => {
  const t = truckUnit({ length: 6.2, width: 2.24, color: SOV, dark: SOV_DK, bonnet: 'square', body: 'flat', r: 0.48, axles: [4.9, 1.75, 0.6] });
  const L = t.layout;
  return {
    wheels: wheeled(L.axles, t.track, 0.48),
    hull: grime(merge(t.parts), 1.0, 0.4),
    turret: { geo: merge([P.box(1.6, 0.25, 0.8, { y: 0.12, color: SOV_DK })]), at: [0, L.deck + 0.1, L.rear + 1.2] },
    gun: { geo: merge(Array.from({ length: 8 }, (_, k) => P.box(0.12, 0.08, 4.4, { x: (k - 3.5) * 0.2, y: 0.05, z: 1.9, color: SOV_DK }))), at: [0, 0.4, -0.4], pitch: 0.3 },
    muzzle: [0, 0.1, 4.1],
    recoil: 0.02,
  };
});

export const buildWhPanzerwerfer = (mats) => {
  // the Maultier: the armoured body on an Opel's front wheels and a short track
  const g = halfTrack({ color: GELB, dark: GELB_DK, length: 6.0, width: 2.2, wheelZ: 2.0, trackZ: -1.3, trackLen: 2.4, faceted: true, mg: 'shield' });
  return vehicle(() => ({
    wheels: { geo: g.wheel, list: g.gear.wheels, r: g.gear.wheelR },
    hull: g.hull,
    turret: { geo: merge([P.box(1.4, 0.2, 1.2, { y: 0.1, color: GELB_DK })]), at: [0, 1.72, -1.2] },
    gun: { geo: tubes(5, 2, 0.122, 1.5, 0.24, GELB_DK), at: [0, 0.28, -0.6], pitch: 0.4 },
    muzzle: [0, 0, 1.5],
    recoil: 0.02,
  }))(mats);
};

export const buildFjNebelwerfer = vehicle(() => ({
  hull: grime(merge([...pair((s) => tyre(s * 0.85, 0.5, 0.0, 0.5, 0.16)).flat(), P.box(1.75, 0.1, 0.1, { y: 0.5, color: STEEL }), P.box(0.12, 0.12, 2.3, { y: 0.4, z: -1.1, rx: 0.12, color: GREY }), P.box(0.4, 0.06, 0.4, { y: 0.2, z: -2.2, color: STEEL })]), 1, 0.3),
  turret: { geo: merge([P.box(0.6, 0.3, 0.6, { y: 0.2, color: GREY })]), at: [0, 0.5, 0.0] },
  // the six tubes in their ring
  gun: { geo: merge(Array.from({ length: 6 }, (_, k) => P.cyl(0.1, 0.1, 1.3, { x: Math.cos((k * Math.PI) / 3) * 0.24, y: Math.sin((k * Math.PI) / 3) * 0.24, z: 0.4, rx: Math.PI / 2, color: GREY }, 10))), at: [0, 0.45, 0.1], pitch: 0.45 },
  muzzle: [0, 0, 1.1],
  recoil: 0.02,
  tow: { geo: grime(merge(towTruck({ color: GELB, dark: GELB_DK, length: 6.0, width: 2.26, bonnet: 'round' })), 1, 0.4), hitch: 2.4 },
}));

// ---------------------------------------------------------------- SP mortars

/** A half-track with the mortar in its compartment, firing over the side walls. */
const mortarTrack = (o, color) => {
  const g = halfTrack(o);
  return vehicle(() => ({
    wheels: { geo: g.wheel, list: g.gear.wheels, r: g.gear.wheelR },
    hull: g.hull,
    turret: { geo: merge([P.box(0.5, 0.06, 0.5, { y: 0.03, color: STEEL })]), at: [0, 1.0, -1.4] },
    gun: { geo: merge([P.cyl(0.05, 0.06, 1.5, { z: 0.75, rx: Math.PI / 2, color }, 12), P.cyl(0.07, 0.07, 0.12, { z: 0.15, rx: Math.PI / 2, color: STEEL }, 10)]), at: [0, 0.3, -0.3], pitch: 1.15 }, // (the tube's mouth up over the sides)
    muzzle: [0, 0, 1.5],
    recoil: 0.08,
  }));
};
export const buildUsM4Mortar = mortarTrack({ color: OD, dark: OD_DK, length: 6.2, width: 2.2, wheelZ: 2.0, trackZ: -1.6, trackLen: 2.0, faceted: false, mg: 'ring' }, OD_DK);
export const buildWh2512 = mortarTrack({ color: GELB, dark: GELB_DK, length: 5.8, width: 2.1, wheelZ: 1.9, trackZ: -1.1, trackLen: 3.0, faceted: true, mg: 'shield' }, GELB_DK);

export const buildSovPM38 = vehicle(() => ({
  hull: grime(merge([P.box(0.6, 0.08, 0.6, { y: 0.04, z: -0.3, color: STEEL }), P.box(0.08, 0.08, 0.85, { y: 0.22, z: 0.05, rx: -0.4, color: STEEL }), ...pair((s) => tyre(s * 0.7, 0.4, 0.4, 0.38, 0.18)).flat(), P.box(1.4, 0.08, 0.1, { y: 0.4, z: 0.4, color: SOV_DK })]), 1, 0.3),
  turret: { geo: grime(merge(pair((s) => P.box(0.05, 0.9, 0.05, { x: s * 0.35, y: 0.4, z: 0.55, rz: s * 0.3, rx: -0.3, color: STEEL }))), 0.6, 0, 0.3), at: [0, 0.1, 0] },
  gun: { geo: merge([P.cyl(0.07, 0.08, 1.95, { z: 0.85, rx: Math.PI / 2, color: SOV }, 12)]), at: [0, 0.0, -0.3], pitch: 0.95 },
  muzzle: [0, 0, 1.85],
  recoil: 0.1,
  tow: { geo: grime(merge(towTruck({ color: SOV, dark: SOV_DK, length: 6.2, width: 2.24 })), 1, 0.4), hitch: 1.2 },
}));

export const buildFjGrw42Lorry = vehicle(() => {
  const t = truckUnit({ length: 6.0, width: 2.26, color: GELB, dark: GELB_DK, camo: 1, bonnet: 'round', body: 'flat', r: 0.48, axles: [4.75, 1.2] });
  const L = t.layout;
  return {
    wheels: wheeled(L.axles, t.track, 0.48),
    hull: grime(merge([...t.parts, P.box(0.7, 0.06, 0.7, { y: L.deck + 0.03, z: L.rear + 1.4, color: STEEL })]), 1.0, 0.4),
    turret: { geo: merge(pair((s) => P.box(0.05, 0.9, 0.05, { x: s * 0.35, y: 0.4, z: 0.55, rz: s * 0.3, rx: -0.3, color: STEEL }))), at: [0, L.deck + 0.05, L.rear + 1.4] },
    gun: { geo: merge([P.cyl(0.065, 0.075, 1.85, { z: 0.9, rx: Math.PI / 2, color: GREY }, 12)]), at: [0, 0.1, -0.3], pitch: 0.95 },
    muzzle: [0, 0, 1.85],
    recoil: 0.1,
  };
});
