// The rest of the Imperial Japanese Army's 1945 roster (data/units45: the Pacific), nose toward +z:
//   buildJpChiNu    Type 3 Chi-Nu: the bigger hull, the big hexagonal turret, the long 75 mm
//   buildJpHoI      Type 2 Ho-I: the same turret with the short 75 mm support gun
//   buildJpHoHa     Type 1 Ho-Ha: the riveted half-track
//   buildJpHaTo     Type 4 Ha-To: the 300 mm mortar in an open box on a lengthened tracked hull
//   buildJpLorryAA  Type 98 20 mm on an Isuzu bed · buildJpLorry25 the Navy's triple 25 mm on one
//   buildJpType88   Type 88 75 mm AA gun on its cross · buildJpTachi6 the early-warning radar lorry
//   buildJpSeri     Type 1 Seri recovery (Chi-Ha hull, a crane) · buildJpBridge the Chi-Ha bridge-layer
//   buildJpSsKi     Type 1 SS engineer vehicle with its mine plough · buildJpSmoke the smoke lorry
import { P, merge, pair, grime } from '../units/geometry.js';
import { trackedHull, castTurret, runningGear, roadWheelGeometry } from './vehicleCommon.js';
import { rig, halfTrack, crane } from './ww2Armour.js';
import { vehicle, tracked, wheeled } from './support.js';
import { truckUnit } from './truck.js';
import { heavyAA } from './ww2AirDefence.js';

const JP = 0x6f6a44, JP_DK = 0x56522f, STEEL = 0x2b2d28, WHITE = 0xe6e2d6;
const C = { camo: 1 };
const cache = {};
const once = (key, make) => (cache[key] ??= make());
const ISUZU = { length: 5.4, width: 1.9, bonnet: 'square', r: 0.42, axles: [4.2, 1.0] };

/** The Chi-Ha's running gear and hull (vehicle() contract: support.js tracked). */
const CHIHA_GEAR = { halfWidth: 0.98, length: 3.7, wheels: 6, wheelR: 0.26, sprocket: 1, rollers: 2, trackWidth: 0.33, wheelColor: JP_DK };
const chiHaHull = () => trackedHull([[-2.75, 1.5, 0.45], [1.6, 1.55, 0.45], [2.0, 1.4, 0.55], [2.75, 0.95, 0.6]], { belly: 0.72, fender: 1.15, fenderY: 0.98, chamfer: 0.05 }, { color: JP, ...C });
const exhausts = () => pair((s) => P.cyl(0.08, 0.08, 0.7, { x: s * 0.75, y: 1.6, z: -2.55, color: STEEL }, 8));

// ---------------------------------------------------------------- Chi-Nu, Ho-I: the Chi-He hull, the hexagonal turret

const chiNu = (key, gunLen, gunR) => (mats) => rig(once(key, () => {
  const gear = runningGear({ halfWidth: 1.05, length: 3.9, wheels: 6, wheelR: 0.27, sprocket: 1, rollers: 3, trackWidth: 0.36, wheelColor: JP_DK });
  return {
    gear, wheel: roadWheelGeometry(0.27, 0.3, JP_DK),
    hull: grime(merge([
      ...gear.parts,
      trackedHull([[-2.85, 1.55, 0.45], [-1.2, 1.66, 0.45], [1.75, 1.68, 0.45], [2.15, 1.5, 0.55], [2.85, 0.95, 0.6]], { belly: 0.74, fender: 1.2, fenderY: 1.0, chamfer: 0.05 }, { color: JP, ...C }),
      P.cyl(0.06, 0.06, 0.2, { x: -0.5, y: 1.5, z: 2.2, rx: Math.PI / 2 - 0.5, color: STEEL }, 8),        // the bow MG in the glacis
      P.box(1.0, 0.3, 1.0, { y: 1.8, z: -2.0, color: JP_DK }),                                             // the engine deck
      ...exhausts(),
      ...pair((s) => P.box(0.02, 0.26, 0.26, { x: s * 1.21, y: 1.32, z: -0.6, color: WHITE })),
    ]), 1.25, 0.3),
    turret: grime(merge([
      castTurret([[0.95, 0.72, 0.7], [0.6, 0.82, 0.8], [-0.75, 0.82, 0.8], [-1.3, 0.68, 0.72]], { color: JP, ...C }, 4),
      P.cyl(0.25, 0.27, 0.2, { x: -0.3, y: 0.82, z: -0.35, color: JP, ...C }, 12),                         // the cupola
      P.box(0.6, 0.45, 0.24, { y: 0.38, z: 1.02, color: JP, ...C }),                                        // the mantlet
    ]), 0.9, 0.0, 0.3),
    gun: merge([P.cyl(gunR * 0.85, gunR, gunLen, { z: gunLen / 2, rx: Math.PI / 2, color: JP_DK }, 10)]),
  };
}), mats, { turretAt: [0, 1.68, -0.1], gunAt: [0, 0.38, 1.1], muzzle: gunLen + 0.05 });
export const buildJpChiNu = chiNu('chinu', 2.9, 0.055);
export const buildJpHoI = chiNu('hoi', 1.3, 0.075);

// ---------------------------------------------------------------- Ho-Ha

export const buildJpHoHa = (mats) => rig(once('hoha', () => halfTrack({ color: JP, dark: JP_DK, length: 6.1, width: 2.1, wheelZ: 2.0, trackZ: -1.2, trackLen: 3.0, faceted: true, mg: 'shield' })), mats, { turretAt: [0, 1.75, 0.6], gunAt: [0, 0.15, 0.1], muzzle: 0.7, recoil: 0.02 });

// ---------------------------------------------------------------- Ha-To

export const buildJpHaTo = vehicle(() => {
  const g = tracked({ ...CHIHA_GEAR, length: 4.0 });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-2.9, 1.4, 0.45], [2.0, 1.45, 0.45], [2.9, 0.95, 0.6]], { belly: 0.72, fender: 1.15, fenderY: 0.98, chamfer: 0.05 }, { color: JP, ...C }),
      P.box(1.6, 0.6, 0.06, { y: 1.75, z: 2.0, rx: -0.2, color: JP, ...C }),                               // the low open box: its front plate…
      ...pair((s) => P.box(0.06, 0.6, 3.2, { x: s * 0.95, y: 1.75, z: 0.4, color: JP, ...C })),          // …and sides
      ...exhausts(),
    ]), 1.25, 0.3),
    turret: { geo: merge([P.box(1.2, 0.1, 1.2, { y: 0.05, color: STEEL }), P.box(0.3, 0.5, 0.3, { y: 0.3, z: -0.4, color: STEEL })]), at: [0, 1.45, -0.6] },
    gun: { geo: merge([P.cyl(0.2, 0.2, 2.0, { z: 1.0, rx: Math.PI / 2, color: JP_DK }, 14), P.cyl(0.26, 0.26, 0.2, { z: 0.15, rx: Math.PI / 2, color: STEEL }, 14)]), at: [0, 0.55, -0.4], pitch: 1.05 },
    muzzle: [0, 0, 2.0],
    recoil: 0.15,
  };
});

// ---------------------------------------------------------------- the lorries: AA, radar, smoke

/** An Isuzu lorry: `extra(L)` on its bed, optionally an AA `mount` turning on it or a radar `spin`. */
const isuzu = ({ body = 'flat', extra = () => [], mount = null, spin = null }) => vehicle(() => {
  const t = truckUnit({ color: JP, dark: JP_DK, camo: 0, ...ISUZU, body, bodyH: 1.6 });
  const L = t.layout;
  return {
    wheels: wheeled(L.axles, t.track, ISUZU.r),
    hull: grime(merge([...t.parts, ...extra(L)]), 1, 0.4),
    ...(mount ? {
      turret: { geo: grime(merge([P.cyl(0.35, 0.4, 0.4, { y: 0.2, color: JP }, 12), P.box(0.8, 0.25, 0.6, { y: 0.5, color: JP }), ...pair((s) => P.box(0.26, 0.05, 0.26, { x: s * 0.5, y: 0.6, z: -0.35, color: STEEL }))]), 0.8, 0, 0.3), at: [0, L.deck, L.rear + 1.1] },
      gun: { geo: mount.gun, at: [0, 0.75, 0.1], pitch: null }, muzzle: [0, 0, mount.len], recoil: 0.04,
    } : { muzzle: [0, 2.5, 0] }),
    ...(spin ? { spin: { geo: spin, at: [0, L.top, L.rear + 1.0], rate: 0.8 } } : {}),
  };
});
const tubes = (n, r, len, gap) => merge([...Array.from({ length: n }, (_, k) => P.cyl(r, r, len, { x: (k - (n - 1) / 2) * gap, z: len / 2, rx: Math.PI / 2, color: STEEL }, 8)), P.box(n * gap + 0.1, 0.24, 0.6, { color: STEEL })]);
export const buildJpLorryAA = isuzu({ mount: { gun: tubes(1, 0.028, 1.5, 0.2), len: 1.5 } });
export const buildJpLorry25 = isuzu({ mount: { gun: tubes(3, 0.032, 1.9, 0.26), len: 1.9 } });
export const buildJpTachi6 = isuzu({ body: 'box', spin: merge([
  P.box(0.1, 2.4, 0.1, { y: 1.2, color: STEEL }),                                                         // the mast
  P.box(2.6, 1.2, 0.05, { y: 2.6, color: STEEL, }),                                                       // the aerial frame…
  ...Array.from({ length: 4 }, (_, k) => P.box(0.04, 0.04, 0.9, { x: -0.975 + k * 0.65, y: 2.6, z: 0.45, color: 0x8a8c80 })), // …its dipole rods
]) });
export const buildJpSmoke = isuzu({ extra: (L) => [
  ...[-0.5, 0, 0.5].map((x) => P.cyl(0.26, 0.26, 0.85, { x, y: L.deck + 0.43, z: L.rear + 0.7, color: 0x3a3c32 }, 12)),
  P.box(1.0, 0.75, 1.1, { y: L.deck + 0.38, z: L.rear + 1.9, color: STEEL }),
  P.cyl(0.1, 0.12, 1.0, { x: 0.35, y: L.deck + 1.2, z: L.rear + 2.1, color: 0x222220 }, 8),
] });

// ---------------------------------------------------------------- Type 88

export const buildJpType88 = heavyAA(JP, 3.6, JP_DK, 'square');

// ---------------------------------------------------------------- the engineers' Chi-Ha hulls

const engineerHull = (parts, rest = {}) => vehicle(() => {
  const g = tracked(CHIHA_GEAR);
  return { wheels: g.wheels, hull: grime(merge([...g.parts, chiHaHull(), ...exhausts(), ...parts]), 1.25, 0.3), muzzle: [0, 2.5, 0], ...rest };
});
export const buildJpSeri = engineerHull([
  P.cyl(0.65, 0.65, 0.1, { y: 1.6, z: 0.1, color: JP_DK }, 16),                                              // the turret ring, plated over
  ...crane(0.5, 1.45, 3.0, 1.3, 1.5, 0.35, STEEL),                                                            // the crane
  P.box(1.0, 0.4, 1.0, { y: 1.75, z: -1.7, color: JP_DK }),
]);
export const buildJpBridge = engineerHull([P.box(0.5, 0.3, 0.5, { y: 1.7, z: 1.0, color: STEEL })], {
  load: merge([...pair((s) => P.box(0.75, 0.22, 8.0, { x: s * 0.55, y: 1.78, z: 0, color: JP_DK }))]),     // the bridge: dropped across the gap
});
export const buildJpSsKi = engineerHull([
  P.box(1.7, 0.75, 2.6, { y: 1.9, z: -0.2, color: JP, ...C }),                                               // the boxy superstructure
  P.cyl(0.06, 0.06, 0.2, { x: 0.4, y: 2.0, z: 1.15, rx: Math.PI / 2, color: STEEL }, 8),
  P.box(2.3, 0.6, 0.1, { y: 0.4, z: 3.3, rx: -0.4, color: STEEL }),                                          // the mine plough…
  ...pair((s) => P.box(0.1, 0.12, 1.0, { x: s * 0.8, y: 0.75, z: 2.85, rx: 0.4, color: STEEL })),           // …on its arms
]);
