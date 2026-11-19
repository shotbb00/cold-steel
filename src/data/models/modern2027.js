// The 2027 armour (data/units2027): the 1985 hulls carry most of today's fleets, so most of these are
// those models with what thirty years of upgrades bolted on (kit()), and the paint of 2027 — every
// part that was plain green takes its army's camouflage (RigRenderer ARMY_CAMO_2027):
//   M1A2 SEPv3    the Abrams with the CROWS remote gun on the commander's hatch, the commander's
//                 thermal viewer, and (the heavy platoons) Trophy: a launcher and radar panels each side
//   PT-91 Twardy  Poland's T-72: ERAWA reactive armour boxes on the turret and skirts, the Drawa sight
//   T-72B3(M)     Relikt / Kontakt-5 cheek blocks, the Sosna-U sight; the Russian ones under a
//                 "cope cage" against drones dropping on the roof
//   T-90M         the T-72 hull with the big welded turret's bustle, Relikt, Arena-M radar masts and
//                 launchers, a cage
//   K2            Poland's Black Panther on the Leopard 2 lines: wedged cheeks, the panoramic sight
//   M2A4          the Bradley under BRAT reactive tiles
//   BMP-2M        Berezhok: four Kornet tubes on the turret, a cage
//   Rosomak       the Polish 8×8 with the unmanned ZSSW-30 turret (30 mm, two Spikes) — and the
//                 US Stryker ATGM on the same 8×8 lines with the TOW "hammerhead" (new: vehicle())
// See render/RigRenderer.js for the model contract.
import * as THREE from 'three';
import { P, merge, pair, grime } from '../units/geometry.js';
import { meshAdder, trackedHull, planProfile } from './vehicleCommon.js';
import { truckUnit } from './truck.js';
import { vehicle, wheeled, tracked, buildNatoM3, buildPactBRDM, buildPactKonkurs, buildNatoMLRS, buildPactGrad, buildNatoTACJAM, buildPactR330, buildNatoFirefinder, buildPactARK1 } from './support.js';
import { buildNatoM109 } from './natoM109.js';
import { buildPact2S1 } from './pact2S1.js';
import { buildNatoAbrams } from './natoAbrams.js';
import { buildPactT72 } from './pactT72.js';
import { buildPactBMP2 } from './pactBMP2.js';
import { buildNatoBradley } from './natoBradley.js';
import { buildBwLeopard2 } from './armyArmour.js';

const OD = 0x4a5634;      // plain paint (camo: the army's pattern)
const ERA = 0x56603c;
const DK = 0x2e3226;
const STEEL = 0x2b2d28;
const GLASS = 0x1a1d1c;
const C = { camo: 1 };

// ---------------------------------------------------------------- the 2027 paint

const recamoed = new WeakMap();
/** A copy of `geo` with every plain painted greenish part flagged for the camouflage pattern. */
function recamo(geo) {
  let g = recamoed.get(geo);
  if (g) return g;
  g = geo.clone();
  const col = g.attributes.color, paint = g.attributes.paint;
  if (col && paint) {
    for (let i = 0; i < paint.count; i++) {
      const r = col.getX(i), gr = col.getY(i), b = col.getZ(i);
      if (paint.getX(i) === 0 && gr >= r * 0.95 && gr > b * 1.1 && gr > 0.12) paint.setX(i, 1);
    }
  }
  recamoed.set(geo, g);
  return g;
}

/**
 * A 1985 rig with 2027 kit: `hull` / `turret` / `gun` geometries added to those parts (each in its
 * part's own frame: the turret's from the rig's turret origin), `bare` hides the old turret and gun
 * (a new turret drawn in `turret` instead), and every plain green part painted in camouflage.
 */
function kit(base, describe) {
  let d = null;
  return (mats) => {
    d ??= describe();
    const rig = base(mats);
    const gun = rig.muzzle.parent, turret = gun.parent, hull = rig.root.children[0];
    rig.root.traverse((o) => { if (o.isMesh && o.material === mats.body) o.geometry = recamo(o.geometry); });
    if (d.bare) for (const o of [...turret.children, ...gun.children]) if (o.isMesh) o.visible = false;
    if (d.hull) meshAdder(hull)(d.hull, mats.body);
    if (d.turret) meshAdder(turret)(d.turret, mats.body);
    if (d.gun) meshAdder(gun)(d.gun, mats.body);
    if (d.muzzle) rig.muzzle.position.set(...d.muzzle);
    return rig;
  };
}

/** A cope cage: posts up from the turret's edge and a grid of bars over the roof (the gun clear in front). */
function cage({ w = 1.5, z0 = -1.6, z1 = 1.3, y0 = 0.55, y1 = 1.85 }) {
  const bars = [];
  for (const [x, z] of [[-w, z0], [w, z0], [-w, z1], [w, z1], [-w, (z0 + z1) / 2], [w, (z0 + z1) / 2]]) {
    bars.push(P.box(0.06, y1 - y0, 0.06, { x, y: (y0 + y1) / 2, z, color: DK }));
  }
  for (let k = 0; k <= 4; k++) bars.push(P.box(0.04, 0.04, z1 - z0, { x: -w + (k / 4) * 2 * w, y: y1, z: (z0 + z1) / 2, color: DK }));
  for (let k = 0; k <= 3; k++) bars.push(P.box(2 * w, 0.04, 0.04, { y: y1, z: z0 + (k / 3) * (z1 - z0), color: DK }));
  for (const s of [-1, 1]) bars.push(P.box(0.03, 0.03, Math.hypot(z1 - z0, y1 - y0), { x: s * w, y: (y0 + y1) / 2, z: (z0 + z1) / 2, rx: -Math.atan2(y1 - y0, z1 - z0), color: DK })); // braces
  return bars;
}

/** A remote weapon station on a short pedestal: sight box and a machine gun. */
const rws = (x, y, z) => [
  P.cyl(0.12, 0.14, 0.25, { x, y: y + 0.12, z, color: OD }, 10),
  P.box(0.5, 0.3, 0.55, { x, y: y + 0.38, z, color: OD }),
  P.box(0.22, 0.16, 0.05, { x: x + 0.12, y: y + 0.42, z: z + 0.29, color: GLASS }),
  P.cyl(0.025, 0.025, 1.1, { x: x - 0.1, y: y + 0.36, z: z + 0.75, rx: Math.PI / 2, color: STEEL }, 6),
];

/** Trophy, one side (s = ±1) of an Abrams turret: the launcher on its arm and two radar panels. */
const trophy = (s, x = 1.92, z = 0.55) => [
  P.box(0.14, 0.12, 0.5, { x: s * (x - 0.1), y: 0.5, z, color: OD }),
  P.box(0.42, 0.38, 0.5, { x: s * x, y: 0.72, z, color: OD }),
  P.sphere(0.2, { x: s * x, y: 0.95, z, sy: 0.6, color: OD }, 10, 6),
  P.box(0.06, 0.42, 0.5, { x: s * (x - 0.15), y: 0.42, z: z + 0.85, ry: s * -0.5, color: 0x3c4430 }),     // radar panels, front…
  P.box(0.06, 0.42, 0.5, { x: s * (x - 0.15), y: 0.42, z: z - 1.4, ry: s * 0.5, color: 0x3c4430 }),      // …and rear
];

/** A grid of reactive armour boxes on a vertical face (along z), as on hull sides. */
const tiles = (x, y, z0, z1, rows = 2, size = 0.42, color = ERA) => {
  const out = [];
  const n = Math.round((z1 - z0) / size);
  for (let r = 0; r < rows; r++) for (let k = 0; k < n; k++) out.push(P.box(0.12, size * 0.85, size * 0.92, { x, y: y - r * size * 0.92, z: z0 + (k + 0.5) * size, color }));
  return out;
};

// ---------------------------------------------------------------- tanks

const abramsKit = (withTrophy) => () => ({
  turret: grime(merge([
    ...rws(0.62, 0.98, -0.45),                                                    // CROWS on the commander's hatch
    P.cyl(0.1, 0.12, 0.35, { x: -0.3, y: 0.95, z: 0.4, color: OD }, 10),           // the commander's thermal viewer
    P.box(0.42, 0.36, 0.42, { x: -0.3, y: 1.3, z: 0.4, color: OD }),
    P.box(0.3, 0.2, 0.04, { x: -0.3, y: 1.32, z: 0.62, color: GLASS }),
    P.cyl(0.015, 0.015, 1.1, { x: -1.3, y: 1.25, z: -1.9, color: STEEL }, 5),      // radio whips
    P.cyl(0.015, 0.015, 1.1, { x: 1.3, y: 1.25, z: -1.9, color: STEEL }, 5),
    ...(withTrophy ? [...trophy(1), ...trophy(-1)] : []),
  ]), 0.9, 0, 0.3),
  hull: grime(merge([P.box(1.2, 0.5, 0.5, { x: 0.9, y: 1.62, z: -3.55, color: OD })]), 1.25, 0.3), // the under-armour auxiliary power unit at the back
});
export const buildAbramsSEPv3 = kit(buildNatoAbrams, abramsKit(false));
export const buildAbramsTrophy = kit(buildNatoAbrams, abramsKit(true));

/** T-72 turret kits (turret origin: the dome's base, roof ~0.8 up, ~1.8 m round). */
const cheeks = (color, h = 0.42) => pair((s) => P.box(0.85, h, 0.7, { x: s * 0.98, y: 0.5, z: 1.3, ry: s * 0.55, color }));
const sosna = P.box(0.42, 0.42, 0.5, { x: -0.75, y: 0.98, z: 0.55, color: OD });
const skirtsEra = (color) => pair((s) => merge(tiles(s * 1.76, 1.15, -2.2, 2.6, 1, 0.48, color)));

export const buildPT91 = kit(buildPactT72, () => ({
  turret: grime(merge([
    ...cheeks(ERA, 0.5),
    ...pair((s) => P.box(0.7, 0.18, 0.55, { x: s * 0.75, y: 0.86, z: 0.9, ry: s * 0.3, rx: -0.25, color: ERA })), // ERAWA on the roof's front
    P.box(0.45, 0.4, 0.5, { x: 0.75, y: 0.98, z: 0.55, color: OD }),           // the Drawa sight
    P.box(0.9, 0.45, 0.6, { y: 0.48, z: -1.95, color: OD }),                     // stowage box on the turret's back
  ]), 0.9, 0, 0.3),
  hull: grime(merge([...skirtsEra(ERA)]), 1.2, 0.3),
}));

export const buildT72B3 = kit(buildPactT72, () => ({
  turret: grime(merge([...cheeks(ERA), sosna]), 0.9, 0, 0.3),
  hull: grime(merge([...skirtsEra(ERA)]), 1.2, 0.3),
}));
const t72b3m = (caged) => kit(buildPactT72, () => ({
  turret: grime(merge([...cheeks(ERA, 0.5), sosna, ...(caged ? cage({}) : [])]), 0.9, 0, 0.3),
  hull: grime(merge([...skirtsEra(ERA), P.box(2.2, 0.5, 0.8, { y: 1.62, z: -3.2, color: OD })]), 1.2, 0.3), // Relikt on the skirts, slat box at the back
}));
export const buildT72B3M = t72b3m(true);      // Russia's, under a cage
export const buildT72B3Mby = t72b3m(false);   // Belarus's

export const buildT90M = kit(buildPactT72, () => ({
  turret: grime(merge([
    ...cheeks(ERA, 0.55),
    sosna,
    P.box(2.5, 0.62, 1.1, { y: 0.42, z: -2.05, color: OD }),                     // the welded turret's bustle (the autoloader's spare rounds)
    ...pair((s) => P.cyl(0.07, 0.09, 1.2, { x: s * 0.95, y: 1.3, z: -1.75, color: OD }, 8)), // Arena-M: the radar masts…
    ...pair((s) => P.box(0.36, 0.3, 0.3, { x: s * 0.95, y: 1.95, z: -1.75, color: OD })),
    ...pair((s) => P.box(0.3, 0.45, 0.55, { x: s * 1.75, y: 0.45, z: 0.0, ry: s * 0.4, color: OD })),     // …and the launchers round the turret
    ...pair((s) => P.box(0.3, 0.45, 0.55, { x: s * 1.55, y: 0.45, z: -1.3, ry: s * -0.4, color: OD })),
    ...cage({ y1: 2.2, z0: -2.4 }),
  ]), 0.9, 0, 0.3),
  hull: grime(merge([...skirtsEra(ERA)]), 1.2, 0.3),
}));

/** K2 Black Panther on the Leopard 2's lines (turret origin at its base, 0.86 tall, front at z 1.95). */
export const buildK2 = kit(buildBwLeopard2, () => ({
  turret: grime(merge([
    ...pair((s) => P.box(1.05, 0.8, 0.9, { x: s * 1.05, y: 0.42, z: 2.2, ry: s * 0.45, color: OD, ...C })), // the wedge cheeks
    P.cyl(0.14, 0.16, 0.35, { x: 0.75, y: 1.0, z: 0.6, color: OD }, 10),           // the commander's panoramic sight
    P.box(0.45, 0.4, 0.45, { x: 0.75, y: 1.35, z: 0.6, color: OD }),
    P.box(0.32, 0.22, 0.04, { x: 0.75, y: 1.37, z: 0.84, color: GLASS }),
    ...pair((s) => P.box(0.2, 0.2, 0.2, { x: s * 1.6, y: 0.98, z: 1.3, color: DK })),  // laser warning receivers
    ...rws(-0.6, 0.86, -0.6),
  ]), 0.9, 0, 0.3),
}));

// ---------------------------------------------------------------- IFVs and the rest

/** M2A4: BRAT tiles over the hull sides and the turret's. */
export const buildBradleyA4 = kit(buildNatoBradley, () => ({
  hull: grime(merge([...pair((s) => merge(tiles(s * 1.76, 1.85, -2.9, 1.6, 2, 0.45)))]), 1.3, 0.35),
  turret: grime(merge([...pair((s) => merge(tiles(s * 1.1, 0.45, -0.8, 0.8, 1, 0.4))), P.box(0.4, 0.35, 0.45, { x: -0.5, y: 0.8, z: 0.2, color: OD })]), 0.9, 0, 0.3),
}));

/** BMP-2M Berezhok: two Kornet tubes each side of the turret, the new sight, a cage. */
export const buildBMP2M = kit(buildPactBMP2, () => ({
  turret: grime(merge([
    ...pair((s) => merge([0.12, 0.42].map((y) => P.cyl(0.09, 0.09, 1.3, { x: s * 1.05, y, z: 0.3, rx: Math.PI / 2, color: OD }, 10)))),
    P.box(0.4, 0.35, 0.4, { x: -0.45, y: 0.75, z: 0.3, color: OD }),
    ...cage({ w: 1.15, z0: -1.0, z1: 0.6, y0: 0.4, y1: 1.5 }),
  ]), 0.9, 0, 0.3),
}));

export const buildBradleyM3A3 = kit(buildNatoM3, () => ({}));
export const buildBRDM2M = kit(buildPactBRDM, () => ({}));
export const buildKonkursM = kit(buildPactKonkurs, () => ({}));
export const buildBMP2 = kit(buildPactBMP2, () => ({}));

/** The 8×8: Rosomak / Stryker lines — the long boxy hull, the sloped nose, eight big wheels. */
const eightByEight = (extra = []) => {
  const w = wheeled([-2.35, -1.05, 0.65, 1.95], 1.22, 0.55);
  return {
    wheels: w,
    hull: grime(merge([
      trackedHull([[-3.45, 2.1, 0.55], [-3.3, 2.2, 0.5], [1.4, 2.2, 0.5], [2.9, 1.65, 0.5], [3.45, 1.15, 0.85]], { belly: 0.95, fender: 1.48, fenderY: 1.1, chamfer: 0.12 }, { color: OD, ...C }),
      ...pair((s) => P.box(0.06, 0.06, 6.4, { x: s * 1.5, y: 1.12, color: DK })),
      ...pair((s) => P.box(0.08, 0.7, 2.6, { x: s * 1.52, y: 1.6, z: -1.6, color: OD, ...C })),            // add-on armour on the troop compartment
      P.box(1.6, 1.3, 0.06, { y: 1.45, z: -3.46, color: DK }),                                           // the rear ramp
      ...pair((s) => P.box(0.3, 0.14, 0.12, { x: s * 1.05, y: 1.35, z: 3.4, color: STEEL })),
      P.box(0.55, 0.06, 0.5, { x: -0.65, y: 2.03, z: 2.2, rx: -0.36, color: DK }),                        // the driver's hatch
      ...extra,
    ]), 1.15, 0.3),
    marks: merge([...pair((s) => P.box(0.02, 0.3, 0.5, { x: s * 1.49, y: 1.65, z: 0.4 }))]),
  };
};

/** Rosomak with the ZSSW-30: the unmanned turret, 30 mm, a Spike pod on its side. */
export const buildRosomak = vehicle(() => ({
  ...eightByEight(),
  turret: {
    geo: grime(merge([
      planProfile([[-0.75, 1.0], [0.75, 1.0], [1.05, 0.5], [1.05, -1.0], [-1.05, -1.0], [-1.05, 0.5]], 0.6, { color: OD, ...C }),
      P.box(0.5, 0.42, 0.9, { x: -1.32, y: 0.38, z: 0.0, color: OD, ...C }),                            // the Spike pod
      ...[0.28, 0.52].map((y) => P.cyl(0.08, 0.08, 0.06, { x: -1.32, y, z: 0.46, rx: Math.PI / 2, color: DK }, 10)),
      P.box(0.4, 0.35, 0.4, { x: 0.6, y: 0.8, z: 0.0, color: OD }),                                     // the panoramic sight
      P.box(0.28, 0.18, 0.04, { x: 0.6, y: 0.82, z: 0.21, color: GLASS }),
    ]), 0.6, 0, 0.3),
    at: [0, 2.2, 0.2],
  },
  gun: { geo: merge([P.cyl(0.05, 0.06, 2.3, { z: 1.15, rx: Math.PI / 2, color: STEEL }, 10), P.box(0.3, 0.3, 0.4, { z: 0.1, color: DK })]), at: [0, 0.32, 0.95], pitch: null },
  muzzle: [0, 0, 2.3],
  recoil: 0.08,
}));

/** Stryker ATGM / Rosomak with Spike: the 8×8 with an elevating launcher on the roof. */
const launcher8 = (tubes) => vehicle(() => ({
  ...eightByEight(),
  turret: {
    geo: grime(merge([P.cyl(0.28, 0.32, 0.5, { y: 0.25, color: OD }, 12), P.box(0.3, 0.3, 0.3, { x: 0.5, y: 0.5, color: OD })]), 0.6, 0, 0.3),
    at: [0, 2.2, -0.9],
  },
  gun: {
    geo: merge([
      P.box(1.05, 0.55, 1.1, { color: OD, ...C }),
      ...tubes.map(([x, y]) => P.cyl(0.11, 0.11, 0.06, { x, y, z: 0.56, rx: Math.PI / 2, color: DK }, 10)),
      P.box(0.3, 0.22, 0.04, { x: 0.2, y: 0.05, z: 0.56, color: GLASS }),
    ]),
    at: [0, 0.75, 0.2], pitch: null,
  },
  muzzle: [0, 0, 0.7],
}));
export const buildStrykerATGM = launcher8([[-0.3, 0.12], [-0.3, -0.14]]);    // TOW: two tubes
export const buildRosomakSpike = launcher8([[-0.3, 0.12], [-0.3, -0.14], [0.25, -0.14]]);

// ---------------------------------------------------------------- step 5: fires and EW (the 1985 vehicles in 2027 paint until step 6)
export const buildPaladin = kit(buildNatoM109, () => ({}));
export const buildM270A2 = kit(buildNatoMLRS, () => ({}));
export const buildTruckMRL = kit(buildPactGrad, () => ({}));
export const buildZhitel = kit(buildPactR330, () => ({}));
export const buildTPQ53 = kit(buildNatoFirefinder, () => ({}));
export const buildAistyonok = kit(buildPactARK1, () => ({}));

// ---------------------------------------------------------------- step 6: the rest of the roster
/** A 1985 vehicle in 2027 paint, nothing added (one wrapper per model). */
const painted = new Map();
export const repaint = (build) => {
  if (!build) return build;
  if (!painted.has(build)) painted.set(build, kit(build, () => ({})));
  return painted.get(build);
};

/** M-SHORAD: the Stryker with the RIwP turret — 30 mm cannon, a Stinger pod and a Hellfire rail. */
export const buildMShorad = vehicle(() => ({
  ...eightByEight(),
  turret: {
    geo: grime(merge([
      planProfile([[-0.6, 0.8], [0.6, 0.8], [0.9, 0.35], [0.9, -0.8], [-0.9, -0.8], [-0.9, 0.35]], 0.55, { color: OD, ...C }),
      P.box(0.5, 0.4, 0.75, { x: 1.12, y: 0.5, z: 0.0, color: OD, ...C }),                                    // the Stinger pod
      ...[0.38, 0.62].flatMap((y) => [0.0, 0.0].map((_, k) => P.cyl(0.07, 0.07, 0.05, { x: 1.1 + k * 0.2, y, z: 0.39, rx: Math.PI / 2, color: DK }, 8))),
      P.box(0.3, 0.3, 1.1, { x: -1.03, y: 0.45, z: 0.1, color: OD, ...C }),                                   // the Hellfire rail
      P.box(0.38, 0.32, 0.4, { x: 0.35, y: 0.7, z: -0.2, color: OD }),                                       // sights
      P.box(0.26, 0.16, 0.04, { x: 0.35, y: 0.73, z: 0.0, color: GLASS }),
    ]), 0.6, 0, 0.3),
    at: [0, 2.2, 0.0],
  },
  gun: { geo: merge([P.cyl(0.05, 0.06, 2.2, { z: 1.1, rx: Math.PI / 2, color: STEEL }, 10), P.box(0.28, 0.28, 0.4, { z: 0.1, color: DK })]), at: [0, 0.3, 0.75], pitch: null },
  muzzle: [0, 0, 2.2],
  recoil: 0.06,
}));

/** Rak: the Rosomak with the 120 mm mortar turret, its long barrel up out of the roof. */
export const buildRak = vehicle(() => ({
  ...eightByEight(),
  turret: {
    geo: grime(merge([
      planProfile([[-0.85, 1.05], [0.85, 1.05], [1.15, 0.5], [1.15, -1.1], [-1.15, -1.1], [-1.15, 0.5]], 0.85, { color: OD, ...C }),
      P.box(0.4, 0.35, 0.4, { x: 0.65, y: 1.0, z: -0.4, color: OD }),
    ]), 0.8, 0, 0.3),
    at: [0, 2.2, -0.6],
  },
  gun: { geo: merge([P.cyl(0.1, 0.12, 3.0, { z: 1.4, rx: Math.PI / 2, color: OD }, 12), P.box(0.6, 0.5, 0.6, { color: DK })]), at: [0, 0.55, 0.9], pitch: 0.75 },
  muzzle: [0, 0, 2.9],
  recoil: 0.25,
}));

// ---------------------------------------------------------------- proper models: launchers, guns, air defence, EW
// (their own shapes now, not 1985 stand-ins)

/** A heavy launcher truck: the cab, the axles, the launcher on a turntable at the back. */
function launcherTruck({ length, axles, pack, bonnet = 'cabover', cabLen = 2.0, r = 0.6, width = 2.55 }) {
  return vehicle(() => {
    const t = truckUnit({ length, width, color: OD, dark: DK, camo: 1, bonnet, body: 'flat', r, axles, cabLen, cabH: 1.5 });
    const L = t.layout, tz = L.rear + 2.0;
    return {
      wheels: wheeled(L.axles, t.track, r),
      hull: grime(merge([
        ...t.parts,
        P.box(1.9, 0.3, 2.4, { y: L.deck + 0.15, z: tz, color: DK }),                                          // the turntable's base
        ...pair((s) => P.box(0.3, 0.7, 0.3, { x: s * 1.1, y: L.deck - 0.25, z: L.rear + 0.4, color: STEEL })), // the rear jacks
      ]), 1.0, 0.4),
      turret: { geo: merge([P.cyl(0.85, 0.9, 0.3, { y: 0.15, color: DK }, 16)]), at: [0, L.deck + 0.3, tz] },
      gun: { geo: merge(pack), at: [0, 0.3, -0.6], pitch: null },
      muzzle: [0, 0.6, 3.6],
      recoil: 0.02,
      marks: merge([...pair((s) => P.box(0.02, 0.3, 0.3, { x: s * (L.hw - 0.03), y: L.deck + 0.7, z: L.cabFront - 0.6 }))]),
    };
  });
}
/** A launcher pod: a box with its tubes' or canisters' ends showing at the front (z = len). */
const pod = (x, y, w, h, len, rows, cols, r, color = OD) => [
  P.box(w, h, len, { x, y, z: len / 2, color, ...C }),
  ...Array.from({ length: rows * cols }, (_, k) => P.cyl(r, r, 0.03, { x: x - w / 2 + (w / cols) * ((k % cols) + 0.5), y: y - h / 2 + (h / rows) * (Math.floor(k / cols) + 0.5), z: len + 0.01, rx: Math.PI / 2, color: 0x141414 }, 10)),
];
const tubes = (rows, cols, r, len) => Array.from({ length: rows * cols }, (_, k) => {
  const x = (k % cols - (cols - 1) / 2) * r * 2.3, y = Math.floor(k / cols) * r * 2.3;
  return [P.cyl(r, r, len, { x, y, z: len / 2, rx: Math.PI / 2, color: OD, ...C }, 12), P.cyl(r * 0.8, r * 0.8, 0.02, { x, y, z: len + 0.01, rx: Math.PI / 2, color: 0x141414 }, 10)];
}).flat();

// Homar-K: the Korean launcher (Chunmoo) on a Jelcz 8×8 — two pods of six 239 mm rockets side by side
export const buildHomarK = launcherTruck({ length: 10.5, axles: [9.2, 7.75, 3.2, 1.75], pack: [...pod(-0.6, 0.45, 1.05, 0.9, 4.6, 2, 3, 0.13), ...pod(0.6, 0.45, 1.05, 0.9, 4.6, 2, 3, 0.13), P.box(1.6, 0.25, 4.0, { y: -0.1, z: 2.0, color: DK })] });
// Tornado-S on the MAZ-543 8×8: twelve 300 mm tubes in three rows of four
export const buildTornadoS = launcherTruck({ length: 11.5, axles: [10.0, 8.6, 4.4, 3.0], bonnet: 'square', pack: [...tubes(3, 4, 0.2, 7.0).map((g) => g.translate(0, 0, -1.2)), P.box(1.9, 0.25, 6.0, { y: -0.3, z: 2.2, color: DK }), ...[0.2, 2.4, 4.6].map((z) => P.box(2.1, 1.5, 0.12, { y: 0.45, z, color: DK }))] });
// Polonez on the MZKT-7930 8×8: two packs of four big canisters
export const buildPolonez = launcherTruck({ length: 12.0, axles: [10.6, 9.1, 4.6, 3.1], pack: [...pod(-0.62, 0.55, 1.15, 1.15, 7.2, 2, 2, 0.22), ...pod(0.62, 0.55, 1.15, 1.15, 7.2, 2, 2, 0.22), P.box(1.8, 0.3, 6.5, { y: -0.2, z: 3.2, color: DK })].map((g) => g.translate(0, 0, -1.5)) });

/** A self-propelled howitzer: its hull, the big turret set back, the long barrel with its brake. */
function howitzer({ hull, wheels, turret, barrel, mount, muzzleZ, gunZ = 1.6 }) {
  return vehicle(() => {
    const g = tracked(wheels);
    return {
      wheels: g.wheels,
      hull: grime(merge([...g.parts, ...hull]), 1.1, 0.3),
      turret: { geo: grime(merge(turret), 0.9, 0, 0.3), at: mount },
      gun: { geo: merge(barrel), at: [0, 0.75, gunZ], pitch: null },
      muzzle: [0, 0, muzzleZ],
      recoil: 0.5,
    };
  });
}
const brake = (z, r) => [P.cyl(r * 1.6, r * 1.6, 0.6, { z, rx: Math.PI / 2, color: DK }, 12), ...pair((s) => P.box(0.06, r * 2.4, 0.3, { x: s * r * 1.6, z: z - 0.05, color: 0x141414 }))];
// AHS Krab: the K9 hull, the long AS-90 style turret, the 52-calibre barrel
export const buildKrab = howitzer({
  wheels: { halfWidth: 1.5, length: 5.6, wheels: 6, wheelR: 0.36, sprocket: 1, rollers: 3, trackWidth: 0.55, wheelColor: DK },
  hull: [trackedHull([[-3.6, 1.55, 0.5], [-3.4, 1.62, 0.45], [2.4, 1.62, 0.45], [3.6, 1.15, 0.6]], { belly: 1.2, fender: 1.8, fenderY: 1.05, chamfer: 0.08 }, { color: OD, ...C }), ...pair((s) => P.box(0.06, 0.55, 5.8, { x: s * 1.85, y: 0.9, color: OD, ...C }))],
  turret: [planProfile([[-1.2, 1.4], [1.2, 1.4], [1.55, 0.9], [1.55, -2.7], [-1.55, -2.7], [-1.55, 0.9]], 1.45, { color: OD, ...C }), P.box(0.5, 0.4, 0.5, { x: 0.8, y: 1.65, z: -0.4, color: OD }), ...rws(-0.7, 1.45, -0.8)],
  barrel: [P.cyl(0.13, 0.17, 8.0, { z: 4.0, rx: Math.PI / 2, color: OD, ...C }, 12), P.cyl(0.24, 0.24, 0.8, { z: 0.2, rx: Math.PI / 2, color: DK }, 12), ...brake(8.0, 0.13)],
  mount: [0, 1.62, -0.6], muzzleZ: 8.3, gunZ: 1.25,
});
// 2S19M2 Msta-SM2: the T-72-type hull, the tall box turret, the 152 mm with its fume extractor
export const buildMsta = howitzer({
  wheels: { halfWidth: 1.45, length: 5.4, wheels: 6, wheelR: 0.38, sprocket: -1, rollers: 3, trackWidth: 0.58, wheelColor: DK },
  hull: [trackedHull([[-3.5, 1.45, 0.5], [-3.3, 1.5, 0.45], [2.2, 1.5, 0.45], [3.5, 1.0, 0.65]], { belly: 1.15, fender: 1.75, fenderY: 1.0, chamfer: 0.08 }, { color: OD, ...C }), ...pair((s) => P.box(0.04, 0.45, 5.6, { x: s * 1.78, y: 0.9, color: 0x1f201c, surf: 'rubber' }))],
  turret: [planProfile([[-1.25, 1.6], [1.25, 1.6], [1.6, 1.0], [1.6, -2.9], [-1.6, -2.9], [-1.6, 1.0]], 1.6, { color: OD, ...C }), P.cyl(0.32, 0.34, 0.3, { x: 0.8, y: 1.75, z: 0.1, color: OD }, 12), P.box(0.4, 0.3, 0.4, { x: -0.8, y: 1.75, z: 0.6, color: OD })],
  barrel: [P.cyl(0.14, 0.18, 7.2, { z: 3.6, rx: Math.PI / 2, color: OD, ...C }, 12), P.cyl(0.24, 0.24, 1.0, { z: 3.4, rx: Math.PI / 2, color: OD }, 12), ...brake(7.2, 0.14)],
  mount: [0, 1.5, -0.7], muzzleZ: 7.5,
});
// 2S3M Akatsiya: the long hull, the big rounded turret far back, the 152 mm with its double brake
export const buildAkatsiya = howitzer({
  wheels: { halfWidth: 1.45, length: 5.6, wheels: 6, wheelR: 0.33, sprocket: -1, rollers: 4, trackWidth: 0.5, wheelColor: DK },
  hull: [trackedHull([[-3.6, 1.5, 0.5], [-3.4, 1.55, 0.45], [2.6, 1.55, 0.45], [3.6, 1.05, 0.6]], { belly: 1.15, fender: 1.75, fenderY: 1.0, chamfer: 0.08 }, { color: OD, ...C })],
  turret: [P.sphere(1.75, { y: 0.15, z: -0.6, sx: 1.0, sy: 0.75, sz: 1.35, color: OD, ...C }, 16, 10), P.cyl(0.3, 0.32, 0.3, { x: 0.75, y: 1.4, z: -0.2, color: OD }, 12)],
  barrel: [P.cyl(0.13, 0.17, 5.8, { z: 2.9, rx: Math.PI / 2, color: OD, ...C }, 12), P.cyl(0.22, 0.22, 0.8, { z: 3.0, rx: Math.PI / 2, color: OD }, 12), ...brake(5.8, 0.13), ...brake(5.3, 0.12)],
  mount: [0, 1.55, -0.6], muzzleZ: 6.1,
});

// NASAMS: the launcher of six AMRAAM canisters (two rows of three) on a 6×6 truck
export const buildNASAMS = launcherTruck({ length: 8.0, axles: [6.8, 2.6, 1.3], bonnet: 'square', cabLen: 1.8, r: 0.55,
  pack: [...pod(0, 0.55, 1.5, 0.9, 4.0, 2, 3, 0.16), P.box(1.2, 0.2, 3.5, { y: 0.0, z: 1.8, color: DK })] });
// Narew: the iLauncher on a Jelcz — CAMM canisters stood up on end at the back
export const buildNarew = vehicle(() => {
  const t = truckUnit({ length: 9.5, width: 2.55, color: OD, dark: DK, camo: 1, bonnet: 'cabover', body: 'flat', r: 0.6, axles: [8.2, 6.8, 2.6, 1.3], cabLen: 2.0, cabH: 1.5 });
  const L = t.layout;
  return {
    wheels: wheeled(L.axles, t.track, 0.6),
    hull: grime(merge([...t.parts, P.box(2.2, 0.4, 3.6, { y: L.deck + 0.2, z: L.rear + 2.0, color: DK })]), 1.0, 0.4),
    turret: { geo: merge([P.box(0.6, 0.3, 0.6, { y: 0.15, color: DK })]), at: [0, L.deck + 0.4, L.rear + 2.0] },
    gun: { geo: merge([P.box(2.2, 0.25, 1.3, { y: -0.05, color: DK }), ...Array.from({ length: 8 }, (_, k) => [P.cyl(0.2, 0.2, 3.4, { x: (k % 4 - 1.5) * 0.48, y: 1.7, z: (Math.floor(k / 4) - 0.5) * 0.5, color: OD, ...C }, 12), P.cyl(0.17, 0.17, 0.02, { x: (k % 4 - 1.5) * 0.48, y: 3.41, z: (Math.floor(k / 4) - 0.5) * 0.5, color: 0x141414 }, 10)]).flat()]), at: [0, 0.3, 0], pitch: 0 },
    muzzle: [0, 3.5, 0],
    recoil: 0,
    marks: merge([...pair((s) => P.box(0.02, 0.3, 0.3, { x: s * (L.hw - 0.03), y: L.deck + 0.7, z: L.cabFront - 0.6 }))]),
  };
});

/** A jammer's telescopic masts with their antennas (up once set up). */
const masts = (at, n = 2) => ({
  geo: merge(Array.from({ length: n }, (_, k) => {
    const x = (k - (n - 1) / 2) * 1.0;
    return [P.cyl(0.08, 0.12, 4.5, { x, y: 2.25, color: STEEL }, 8), P.box(1.2, 0.08, 0.08, { x, y: 4.4, color: STEEL }), P.box(0.9, 0.06, 0.06, { x, y: 4.1, color: STEEL }), P.box(0.6, 0.05, 0.05, { x, y: 3.8, color: STEEL }), P.cyl(0.25, 0.25, 0.1, { x, y: 4.52, color: DK }, 10)];
  }).flat()),
  at,
});
// Terrestrial Layer System on the Stryker: the 8×8 with its equipment boxes and two masts
export const buildTLS = vehicle(() => ({
  ...eightByEight([P.box(2.2, 0.6, 2.4, { y: 2.5, z: -1.4, color: OD, ...C }), P.box(0.5, 0.35, 0.5, { x: 0.8, y: 2.36, z: 0.6, color: OD }), ...pair((s) => P.cyl(0.006, 0.006, 2.4, { x: s * 1.2, y: 3.4, z: -2.8, color: STEEL }, 4))]),
  deploy: masts([0, 2.8, -1.4]),
}));
// Przebiśnieg: the jamming van on a Jelcz, its masts
export const buildPrzebisnieg = vehicle(() => {
  const t = truckUnit({ length: 8.5, width: 2.5, color: OD, dark: DK, camo: 1, bonnet: 'cabover', body: 'box', r: 0.55, axles: [7.3, 2.6, 1.3], cabLen: 1.9, cabH: 1.45, bodyH: 2.2 });
  const L = t.layout;
  return {
    wheels: wheeled(L.axles, t.track, 0.55),
    hull: grime(merge([...t.parts, P.box(0.8, 0.45, 0.6, { y: L.deck + 2.45, z: L.rear + 3.6, color: DK })]), 1.0, 0.4),
    deploy: masts([0, L.deck + 2.2, L.rear + 1.2]),
    marks: merge([...pair((s) => P.box(0.02, 0.3, 0.3, { x: s * (L.hw - 0.03), y: L.deck + 0.7, z: L.cabFront - 0.6 }))]),
  };
});

// (the coastal missile launchers at sea: models/ships2027.js)
export { launcherTruck, pod };
