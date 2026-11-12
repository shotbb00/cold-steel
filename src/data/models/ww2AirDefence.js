// 1945 air defence (data/units45): every slot a gun — there are no missiles yet.
//   SP AA          M16 (the quad .50 Maxson mount on an M3) · M17 (the same, Lend-Lease) ·
//                  Wirbelwind (four 2 cm in an open turret on a Panzer IV) · a Flak 38 on a 251
//   towed light    Bofors 40 mm · 37 mm 61-K · 2 cm Flak 38 · 2 cm Flakvierling 38
//   heavy AA       90 mm M2 · 85 mm 52-K · 8.8 cm Flak 36 (the cruciform platform, the long barrel)
//   radar          SCR-584 (the van with its dish) · RUS-2 (the lorry with its yagi array) ·
//                  Würzburg (the big parabolic dish on its stand)
//   SP AA cannon   M15 (the 37 mm and two .50s in an armoured mount) · ZSU-37 (an open turret on
//                  the SU-76 hull) · Ostwind (the 3.7 cm in an open turret on a Panzer IV)
// Towed pieces show emplaced, their tow lorry while they move. Contract: render/RigRenderer.js.
import { P, merge, pair, grime } from '../units/geometry.js';
import { trackedHull } from './vehicleCommon.js';
import { vehicle, tracked, wheeled, towTruck } from './support.js';
import { truckUnit } from './truck.js';
import { halfTrack, balkenkreuz } from './ww2Armour.js';

const OD = 0x4d4f34;
const OD_DK = 0x3c3e28;
const SOV = 0x4a5a34;
const SOV_DK = 0x3a4628;
const GELB = 0x9a8a5a;
const GELB_DK = 0x7a6c44;
const GREY = 0x55584a;
const STEEL = 0x2b2d28;
const RUBBER = 0x1f201c;
const C = { camo: 1 };

const tyre = (x, y, z, r, w) => [
  P.cyl(r, r, w, { x, y, z, rz: Math.PI / 2, color: RUBBER, surf: 'rubber' }, 14),
  P.cyl(r * 0.55, r * 0.55, w + 0.02, { x, y, z, rz: Math.PI / 2, color: STEEL }, 10),
];
/** `n` barrels side by side (and in two rows when n is 4), along +z. */
const barrels = (n, r, len, gap, color) => merge(Array.from({ length: n }, (_, k) => P.cyl(r, r, len, {
  x: ((k % (n === 4 ? 2 : n)) - ((n === 4 ? 2 : n) - 1) / 2) * gap, y: n === 4 ? (Math.floor(k / 2) - 0.5) * gap : 0, z: len / 2, rx: Math.PI / 2, color,
}, 8)));
/** The emplaced cruciform platform of a heavy AA gun: four outriggers, the levelling jacks. */
const cruciform = (color) => [
  ...[0, Math.PI / 2].map((a) => P.box(0.3, 0.2, 5.2, { y: 0.25, ry: a, color })),
  ...[0, 1, 2, 3].map((k) => P.box(0.3, 0.12, 0.3, { x: Math.sin((k * Math.PI) / 2) * 2.5, y: 0.08, z: Math.cos((k * Math.PI) / 2) * 2.5, color: STEEL })),
  P.cyl(0.6, 0.7, 0.5, { y: 0.55, color }, 14),
];
const lorryTow = (color, dark, bonnet = 'square', length = 6.2) => grime(merge(towTruck({ color, dark, length, width: 2.24, bonnet })), 1, 0.4);

// ---------------------------------------------------------------- SP AA

/** A half-track with an AA mount in its compartment (M16, M17, the Flak 38 on a 251). */
const aaTrack = (o, mount) => {
  const g = halfTrack(o);
  return vehicle(() => ({
    wheels: { geo: g.wheel, list: g.gear.wheels, r: g.gear.wheelR },
    hull: g.hull,
    turret: { geo: mount.turret, at: [0, o.faceted ? 1.5 : 0.97, -1.3] }, // (an M3's floor: the mount stands on it)
    gun: { geo: mount.gun, at: [0, mount.gunY ?? 0.55, 0.0], pitch: null },
    muzzle: [0, 0, mount.len],
    recoil: 0.03,
  }));
};
const maxson = (color) => ({ // the Maxson mount: four .50s round the gunner's armoured seat, on its pedestal above the half-track's sides
  turret: grime(merge([
    P.cyl(0.3, 0.38, 0.85, { y: 0.42, color: STEEL }, 12),                       // the pedestal up from the floor
    P.cyl(0.55, 0.6, 0.2, { y: 0.92, color: STEEL }, 14),                        // the turntable and the gunner's seat
    P.box(0.95, 0.6, 0.06, { y: 1.25, z: 0.32, rx: -0.2, color }),               // his armoured shield
    ...[-1, 1].map((s) => P.box(0.3, 0.32, 0.5, { x: s * 0.5, y: 1.15, z: -0.05, color: STEEL })), // the ammunition chests either side
  ]), 0.8, 0, 0.3),
  gun: barrels(4, 0.025, 1.3, 0.3, STEEL), len: 1.3, gunY: 1.25, // (the guns over the sides, not behind them)
});
export const buildUsM16 = aaTrack({ color: OD, dark: OD_DK, length: 6.2, width: 2.2, wheelZ: 2.0, trackZ: -1.6, trackLen: 2.0, faceted: false, mg: 'ring' }, maxson(OD));
export const buildSovM17 = aaTrack({ color: SOV, dark: SOV_DK, length: 6.2, width: 2.2, wheelZ: 2.0, trackZ: -1.6, trackLen: 2.0, faceted: false, mg: 'ring' }, maxson(SOV));
export const buildFj251Flak = aaTrack({ color: GELB, dark: GELB_DK, length: 5.8, width: 2.1, wheelZ: 1.9, trackZ: -1.1, trackLen: 3.0, faceted: true, mg: 'shield' }, {
  turret: grime(merge([P.cyl(0.45, 0.5, 0.25, { y: 0.12, color: STEEL }, 14), P.box(1.0, 0.5, 0.05, { y: 0.45, z: 0.35, rx: -0.2, color: GELB })]), 0.8, 0, 0.3),
  gun: merge([P.cyl(0.03, 0.03, 1.4, { z: 0.7, rx: Math.PI / 2, color: STEEL }, 8), P.box(0.18, 0.2, 0.5, { color: STEEL })]), len: 1.4,
});

/** The Panzer IV hull (Wirbelwind, Ostwind) with an open, many-sided turret. */
const pz4Flak = (gun, len) => vehicle(() => {
  const g = tracked({ halfWidth: 1.12, length: 3.9, wheels: 8, wheelR: 0.235, sprocket: 1, rollers: 4, trackWidth: 0.4, wheelColor: GELB_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-2.95, 1.55, 0.45], [1.95, 1.62, 0.45], [2.25, 1.62, 0.6], [2.95, 1.0, 0.55]], { belly: 0.82, fender: 1.2, fenderY: 1.0, chamfer: 0.04 }, { color: GELB, ...C }),
      ...[-1, 1].flatMap((s) => balkenkreuz(s * 1.22, 1.3, -0.4, 0.24)),
    ]), 1.25, 0.3),
    // the open turret: nine thin plates round it, sloped out
    turret: { geo: grime(merge(Array.from({ length: 9 }, (_, k) => {
      const a = (k / 9) * Math.PI * 2;
      return P.box(0.85, 0.75, 0.04, { x: Math.sin(a) * 0.95, y: 0.38, z: Math.cos(a) * 0.95, ry: a, rx: -0.2, color: GELB, ...C });
    })), 0.9, 0, 0.3), at: [0, 1.62, -0.1] },
    gun: { geo: gun, at: [0, 0.6, 0.1], pitch: null },
    muzzle: [0, 0, len],
    recoil: 0.05,
  };
});
export const buildWhWirbelwind = pz4Flak(barrels(4, 0.03, 1.5, 0.28, STEEL), 1.5);
export const buildFjOstwind = pz4Flak(merge([P.cyl(0.045, 0.05, 2.4, { z: 1.2, rx: Math.PI / 2, color: STEEL }, 10), P.box(0.3, 0.3, 0.7, { color: STEEL })]), 2.4);

// ---------------------------------------------------------------- towed light AA

/** A light AA gun emplaced: its carriage (cross or four wheels), the gun on its pedestal, the seats. */
const lightAA = ({ color, gun, len, wheels4, tow }) => vehicle(() => ({
  hull: grime(merge([
    ...(wheels4 ? pair((s) => [-1.4, 1.4].flatMap((z) => tyre(s * 0.85, 0.45, z, 0.45, 0.2))).flat() : [...[0, Math.PI / 2].map((a) => P.box(0.18, 0.14, 2.6, { y: 0.35, ry: a, color }))]),
    P.box(wheels4 ? 1.6 : 0.6, 0.15, wheels4 ? 3.4 : 0.6, { y: 0.45, color }),
    P.cyl(0.25, 0.32, 0.5, { y: 0.7, color }, 12),
  ]), 1, 0.3),
  turret: { geo: grime(merge([P.box(0.9, 0.4, 0.8, { y: 0.2, color }), ...pair((s) => P.box(0.3, 0.06, 0.3, { x: s * 0.6, y: 0.35, z: -0.4, color: STEEL }))]), 0.8, 0, 0.3), at: [0, 0.95, 0] },
  gun: { geo: gun, at: [0, 0.5, 0.1], pitch: null },
  muzzle: [0, 0, len],
  recoil: 0.06,
  tow: { geo: tow, hitch: wheels4 ? 3.0 : 1.2 },
}));
export const buildUsBofors = lightAA({ color: OD, wheels4: true, len: 2.6, gun: merge([P.cyl(0.05, 0.055, 2.6, { z: 1.3, rx: Math.PI / 2, color: STEEL }, 10), P.box(0.35, 0.4, 0.8, { color: OD })]), tow: lorryTow(OD, OD_DK) });
export const buildSov61K = lightAA({ color: SOV, wheels4: true, len: 2.6, gun: merge([P.cyl(0.045, 0.05, 2.6, { z: 1.3, rx: Math.PI / 2, color: STEEL }, 10), P.box(0.35, 0.4, 0.8, { color: SOV })]), tow: lorryTow(SOV, SOV_DK) });
export const buildWhFlak38 = lightAA({ color: GREY, wheels4: false, len: 1.6, gun: merge([P.cyl(0.03, 0.03, 1.6, { z: 0.8, rx: Math.PI / 2, color: STEEL }, 8), P.box(0.2, 0.25, 0.6, { color: STEEL }), P.box(1.0, 0.5, 0.04, { y: 0.1, z: 0.3, color: GREY })]), tow: lorryTow(GELB, GELB_DK, 'round', 6.0) });
export const buildFjFlakvierling = lightAA({ color: GREY, wheels4: false, len: 1.6, gun: merge([barrels(4, 0.03, 1.6, 0.32, STEEL), P.box(1.2, 0.6, 0.04, { y: 0.0, z: 0.25, color: GREY })]), tow: lorryTow(GELB, GELB_DK, 'round', 6.0) });

// ---------------------------------------------------------------- heavy AA guns

const heavyAA = (color, len, dark, bonnet) => vehicle(() => ({
  hull: grime(merge(cruciform(color)), 1, 0.3),
  turret: { geo: grime(merge([P.box(1.2, 0.8, 1.6, { y: 0.4, color }), P.box(2.0, 1.1, 0.05, { y: 0.9, z: 0.8, rx: -0.1, color })]), 0.8, 0, 0.3), at: [0, 0.8, 0] },
  gun: { geo: merge([P.cyl(0.07, 0.085, len, { z: len / 2 - 0.3, rx: Math.PI / 2, color }, 12), P.box(0.45, 0.45, 1.6, { z: 0.1, color: dark })]), at: [0, 0.95, -0.2], pitch: null },
  muzzle: [0, 0, len - 0.3],
  recoil: 0.5,
  tow: { geo: lorryTow(color === GREY ? GELB : color, dark, bonnet), hitch: 3.4 },
}));
export const buildUs90mm = heavyAA(OD, 4.8, OD_DK, 'square');
export const buildSov52K = heavyAA(SOV, 4.7, SOV_DK, 'square');
export const buildDeFlak36 = heavyAA(GREY, 4.9, 0x44473a, 'round');

// ---------------------------------------------------------------- radar

/** A radar on its vehicle: `spin` the antenna turning once it is set up. */
export const buildUsSCR584 = vehicle(() => {
  const t = truckUnit({ length: 6.6, width: 2.4, color: OD, dark: OD_DK, bonnet: 'square', body: 'box', r: 0.5, axles: [5.2, 1.9, 0.8] });
  return {
    wheels: wheeled(t.layout.axles, t.track, 0.5),
    hull: grime(merge(t.parts), 1, 0.4),
    muzzle: [0, 3, 0],
    spin: { geo: merge([P.cyl(1.0, 0.4, 0.4, { y: 0.6, rx: Math.PI / 2 - 0.4, color: 0x8a8c80 }, 18), P.box(0.15, 0.6, 0.15, { y: 0.2, color: STEEL })]), at: [0, t.layout.top + 0.1, t.layout.rear + 1.5], rate: 1.4 },
  };
});
export const buildSovRUS2 = vehicle(() => {
  const t = truckUnit({ length: 6.2, width: 2.24, color: SOV, dark: SOV_DK, bonnet: 'square', body: 'box', r: 0.48, axles: [4.9, 1.75, 0.6] });
  return {
    wheels: wheeled(t.layout.axles, t.track, 0.48),
    hull: grime(merge(t.parts), 1, 0.4),
    muzzle: [0, 3, 0],
    spin: { geo: merge([P.box(0.1, 2.2, 0.1, { y: 1.1, color: STEEL }), P.box(3.0, 0.08, 0.08, { y: 2.2, color: STEEL }), ...Array.from({ length: 6 }, (_, k) => P.box(0.04, 0.04, 1.0, { x: -1.25 + k * 0.5, y: 2.2, z: 0.3, color: STEEL }))]), at: [0, t.layout.top, t.layout.rear + 1.2], rate: 1.0 },
  };
});
export const buildDeWuerzburg = vehicle(() => ({
  hull: grime(merge([...cruciform(GREY), P.box(0.6, 1.4, 0.6, { y: 1.3, color: GREY }), P.box(1.6, 1.2, 1.2, { x: 1.4, y: 0.7, z: -1.2, color: GREY })]), 1, 0.3), // the stand and the operators' cabin
  muzzle: [0, 3, 0],
  spin: { geo: merge([P.cyl(1.6, 0.25, 0.5, { y: 0.5, z: 0.3, rx: Math.PI / 2 - 0.25, color: 0x8a8c80 }, 20), P.cyl(0.03, 0.03, 0.9, { y: 0.5, z: 0.9, rx: Math.PI / 2, color: STEEL }, 4)]), at: [0, 2.0, 0], rate: 0.9 },
}));

// ---------------------------------------------------------------- SP AA cannon

export const buildUsM15 = aaTrack({ color: OD, dark: OD_DK, length: 6.2, width: 2.2, wheelZ: 2.0, trackZ: -1.6, trackLen: 2.0, faceted: false, mg: 'ring' }, {
  turret: grime(merge([P.box(1.6, 0.9, 1.4, { y: 0.45, color: OD, ...C })]), 0.8, 0, 0.3),           // the armoured mount
  gun: merge([P.cyl(0.045, 0.05, 2.2, { z: 1.1, rx: Math.PI / 2, color: STEEL }, 10), ...pair((s) => P.cyl(0.025, 0.025, 1.4, { x: s * 0.35, y: -0.1, z: 0.7, rx: Math.PI / 2, color: STEEL }, 8))]), len: 2.2,
});
export const buildSovZSU37 = vehicle(() => {
  const g = tracked({ halfWidth: 1.1, length: 3.4, wheels: 6, wheelR: 0.28, sprocket: 1, rollers: 3, trackWidth: 0.3, wheelColor: SOV_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-2.5, 1.35, 0.45], [1.6, 1.4, 0.45], [2.5, 0.85, 0.5]], { belly: 0.8, fender: 1.35, fenderY: 0.95, chamfer: 0.08 }, { color: SOV, ...C }),
      // the open box at the back, its sloped walls
      ...pair((s) => P.box(0.04, 0.85, 2.4, { x: s * 1.25, y: 1.75, z: -1.0, rz: s * 0.12, color: SOV, ...C })),
      P.box(2.4, 0.85, 0.04, { y: 1.75, z: 0.2, rx: 0.15, color: SOV, ...C }),
    ]), 1.25, 0.3),
    turret: { geo: merge([P.box(0.6, 0.3, 0.6, { y: 0.15, color: SOV_DK })]), at: [0, 1.4, -1.0] },
    gun: { geo: merge([P.cyl(0.045, 0.05, 2.4, { z: 1.2, rx: Math.PI / 2, color: STEEL }, 10)]), at: [0, 0.45, 0.1], pitch: null },
    muzzle: [0, 0, 2.4],
    recoil: 0.05,
  };
});
