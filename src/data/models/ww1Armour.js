// 1918 armour (data/epoch.js), nose toward +z, on vehicleCommon's kit and ww2Armour's rig:
//   Mark V          the rhomboid: tracks running right round the hull, the horns high in front, a 6-pdr
//                   in a sponson either side, the driver's cab, the unditching beam on its rails
//                   (also the Germans' captured Mark IV, and the A7V-U — the German rhomboid)
//   Whippet         the Medium A: long low track frames, the engine in front, the fixed fighting
//                   compartment at the back with its machine guns (also the Germans' captured one)
//   Renault FT      small, the first tank with a turret that turns all the way round, the tail skid
//   Schneider CA1   a box on a tractor's tracks, the wire-cutter beak, the short 75 in its right side
//   A7V             the German "moving fortress": a huge steel box over its tracks, the 5.7 cm in its nose
//   armoured cars   Rolls-Royce (the turret, the long bonnet), Peugeot (the 37 mm behind its shield,
//                   open), Ehrhardt (the big box with its turret)
// Contract: render/RigRenderer.js (ww2Armour.js rig).
import { P, merge, pair, grime } from '../units/geometry.js';
import { sideProfile, runningGear, roadWheelGeometry } from './vehicleCommon.js';
import { rig, balkenkreuz } from './ww2Armour.js';

const BR = 0x5c5638;     // British tank brown-green
const BR_DK = 0x48432c;
const FR = 0x7a7454;     // French: the camouflage goes over it (render/RigRenderer.js ARMY_CAMO_1918)
const FR_DK = 0x5c5840;
const DE = 0x6a6a5a;     // German field grey, the camouflage over it
const DE_DK = 0x52524a;
const STEEL = 0x2b2d28;
const TRACK = 0x2a2a26;
const WHITE = 0xd8d6cc;
const RED = 0xa8231b;
const BLUE = 0x2a3a7a;
const C = { camo: 1 };

const cache = {};
const once = (key, make) => (cache[key] ??= make());
/** The rollers along the bottom run inside a track frame (half hidden by its plate): from z0 to z1, at ±x. */
const rollers = (x, z0, z1, n, r = 0.2) => ({ wheelR: r, wheels: pair((s) => Array.from({ length: n }, (_, i) => ({ x: s * x, y: r + 0.05, z: z0 + ((z1 - z0) * i) / (n - 1) }))).flat() });
const roller = (r = 0.2) => roadWheelGeometry(r, 0.3, STEEL);

/** Track links round a side outline [[z, y], …] at x (a rhomboid's or a track frame's edge). */
function linksRound(outline, x, width) {
  const parts = [];
  for (let i = 0; i < outline.length; i++) {
    const [z0, y0] = outline[i], [z1, y1] = outline[(i + 1) % outline.length];
    const len = Math.hypot(z1 - z0, y1 - y0), n = Math.max(1, Math.round(len / 0.32)), a = Math.atan2(y1 - y0, z1 - z0);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      parts.push(P.box(width + 0.06, 0.07, 0.27, { x, y: y0 + (y1 - y0) * t, z: z0 + (z1 - z0) * t, rx: -a, color: TRACK }));
    }
  }
  return parts;
}

/** A track frame either side: the steel plate cut to `outline` and the links round its edge. */
const frames = (outline, halfWidth, width, color) => pair((s) => [
  sideProfile(outline, width, { x: s * halfWidth, color, ...C }),
  ...linksRound(outline, s * halfWidth, width),
]).flat();

const cross = (x, y, z, r) => balkenkreuz(x, y, z, r);
const stripes = (x, y, z) => [WHITE, RED, WHITE].map((c, i) => P.box(0.02, 0.5, 0.16, { x, y, z: z + (i - 1) * 0.17, color: c })); // the British recognition stripes on the horns (1918)
const roundel = (x, y, z, r) => [P.cyl(r, r, 0.02, { x, y, z, rz: Math.PI / 2, color: BLUE }, 16), P.cyl(r * 0.66, r * 0.66, 0.03, { x, y, z, rz: Math.PI / 2, color: WHITE }, 16), P.cyl(r * 0.33, r * 0.33, 0.04, { x, y, z, rz: Math.PI / 2, color: RED }, 16)];

// ---------------------------------------------------------------- the rhomboid: Mark V, the captured Mark IV, the A7V-U

const RHOMB = [[-4.0, 1.25], [-3.55, 0.25], [-2.8, 0.0], [2.0, 0.0], [3.3, 0.55], [4.0, 1.55], [3.75, 2.35], [3.0, 2.55], [-3.3, 2.55], [-3.95, 2.0]];

const rhomboid = (key, { color, dark, marks, cab = true, beam = true }) => (mats) => rig(once(key, () => ({
  gear: rollers(1.15, -2.6, 1.8, 7), wheel: roller(),
  hull: grime(merge([
    ...frames(RHOMB, 1.15, 0.55, color),
    P.box(1.8, 1.85, 5.6, { y: 1.52, z: -0.2, color, ...C }),                                        // the hull between the horns
    ...(cab ? [P.box(1.3, 0.55, 1.0, { y: 2.72, z: 2.1, color, ...C }), P.box(0.9, 0.12, 0.05, { y: 2.8, z: 2.62, color: 0x111111 })] : []), // the driver's cab, its vision slit
    P.box(1.0, 0.5, 0.9, { y: 2.7, z: -2.2, color, ...C }),                                          // the rear cupola
    ...(beam ? [ // the unditching beam on its rails over the top
      ...pair((s) => P.box(0.08, 0.08, 6.0, { x: s * 0.95, y: 2.62, z: -0.4, color: STEEL })),
      P.box(2.9, 0.3, 0.3, { y: 2.85, z: -2.9, color: 0x5a4630 }),
    ] : []),
    ...pair((s) => [ // the sponsons, a 6-pdr in each (the right one turns: the rig's gun)
      P.box(0.8, 1.15, 1.9, { x: s * 1.75, y: 1.3, z: 0.5, color, ...C }),
      P.box(0.55, 0.8, 0.6, { x: s * 1.75, y: 1.3, z: -0.75, color: dark, ...C }),
    ]).flat(),
    P.cyl(0.05, 0.06, 1.4, { x: -2.05, y: 1.35, z: 1.9, rx: Math.PI / 2, color: STEEL }, 10),       // the left sponson's 6-pdr (fixed here)
    ...pair((s) => [-1.8, -0.6].map((z) => P.cyl(0.07, 0.07, 0.06, { x: s * 1.43, y: 2.0, z, rz: Math.PI / 2, color: 0x111111 }, 8))).flat(), // pistol ports
    ...marks,
  ]), 1.2, 0.3),
  turret: merge([P.box(0.42, 0.55, 0.3, { x: 0.18, color: dark, ...C })]),    // the right sponson's gun shield
  gun: merge([P.cyl(0.05, 0.06, 1.4, { z: 0.7, rx: Math.PI / 2, color: STEEL }, 10)]),
})), mats, { turretAt: [1.75, 1.35, 1.45], gunAt: [0.18, 0, 0.1], muzzle: 1.45, arc: 1.4, recoil: 0.15 });

export const buildMarkV = rhomboid('markV', { color: BR, dark: BR_DK, marks: pair((s) => stripes(s * 1.44, 1.9, 3.1)).flat() });
export const buildBeuteMarkIV = rhomboid('beuteIV', { color: DE, dark: DE_DK, cab: false, marks: [...pair((s) => cross(s * 2.17, 1.3, 0.5, 0.32)).flat(), ...pair((s) => cross(s * 1.44, 1.9, -2.2, 0.38)).flat()] });
export const buildA7VU = rhomboid('a7vu', { color: DE, dark: DE_DK, beam: false, marks: [...pair((s) => cross(s * 1.44, 1.9, -1.4, 0.42)).flat()] });

// ---------------------------------------------------------------- the Whippet (Medium A)

const WHIP = [[-3.05, 0.3], [-2.6, 0.0], [1.9, 0.0], [2.9, 0.7], [3.05, 1.25], [2.6, 1.45], [-3.0, 1.45]];

const whippet = (key, { color, dark, marks }) => (mats) => rig(once(key, () => ({
  gear: rollers(1.05, -2.5, 1.7, 7), wheel: roller(),
  hull: grime(merge([
    ...frames(WHIP, 1.05, 0.5, color),
    P.box(1.55, 1.0, 2.6, { y: 0.95, z: 1.2, color, ...C }),                                         // the engine in front
    P.box(1.5, 0.08, 1.6, { y: 1.5, z: 1.4, color: dark }),                                          // its louvres
    P.box(2.0, 2.2, 2.6, { y: 1.55, z: -1.6, color, ...C }),                                         // the fixed fighting compartment
    P.box(1.9, 0.08, 2.4, { y: 2.68, z: -1.6, color: dark }),
    ...pair((s) => P.cyl(0.03, 0.03, 0.5, { x: s * 1.0, y: 2.0, z: -1.3, rz: Math.PI / 2 * s, color: STEEL }, 6)), // the side MGs
    P.cyl(0.03, 0.03, 0.5, { y: 2.0, z: -2.95, rx: Math.PI / 2, color: STEEL }, 6),                // the rear MG
    ...marks,
  ]), 1.0, 0.3),
  turret: merge([P.box(0.3, 0.3, 0.12, { color: dark })]),                                         // the front MG's ball mount
  gun: merge([P.cyl(0.03, 0.035, 0.6, { z: 0.3, rx: Math.PI / 2, color: STEEL }, 8)]),
})), mats, { turretAt: [0.3, 2.0, -0.28], gunAt: [0, 0, 0.05], muzzle: 0.62, arc: 1.2, recoil: 0.05 });

export const buildWhippet = whippet('whippet', { color: BR, dark: BR_DK, marks: pair((s) => stripes(s * 1.31, 0.9, 2.2)).flat() });
export const buildBeuteWhippet = whippet('beuteWhippet', { color: DE, dark: DE_DK, marks: pair((s) => cross(s * 1.01, 1.6, -1.6, 0.36)).flat() });

// ---------------------------------------------------------------- Renault FT

const FT = [[-1.95, 0.55], [-1.7, 0.05], [0.9, 0.05], [1.85, 0.65], [2.05, 1.05], [1.75, 1.3], [-1.3, 1.15], [-1.95, 0.95]];

export const buildRenaultFT = (mats) => rig(once('ft', () => ({
  gear: rollers(0.66, -1.5, 0.8, 5, 0.17), wheel: roller(0.17),
  hull: grime(merge([
    ...frames(FT, 0.66, 0.36, FR),
    sideProfile([[-1.8, 0.35], [-1.8, 1.2], [0.4, 1.3], [1.6, 0.95], [1.6, 0.35]], 0.96, { color: FR, ...C }), // the hull between the tracks, the glacis sloping to the nose
    P.box(0.7, 0.4, 0.06, { y: 1.05, z: 1.25, rx: -0.55, color: FR_DK }),                            // the driver's front hatch
    ...pair((s) => P.box(0.06, 0.12, 0.9, { x: s * 0.3, y: 0.62, z: -2.2, color: FR_DK })),        // the tail skid
    P.box(0.66, 0.06, 0.12, { y: 0.62, z: -2.6, color: FR_DK }),
  ]), 0.7, 0.2),
  turret: grime(merge([
    P.cyl(0.5, 0.55, 0.72, { y: 0.36, color: FR, ...C }, 8),                                       // the octagonal turret
    P.sphere(0.24, { y: 0.8, sy: 0.6, color: FR_DK }, 10, 6),                                        // the mushroom vent on top
    ...pair((s) => roundel(s * 0.53, 0.42, -0.1, 0.12)).flat(),
  ]), 0.5, 0.0, 0.3),
  gun: merge([P.cyl(0.045, 0.05, 0.62, { z: 0.31, rx: Math.PI / 2, color: STEEL }, 10)]),           // the short Puteaux 37 mm
})), mats, { turretAt: [0, 1.25, 0.15], gunAt: [0, 0.4, 0.48], muzzle: 0.65, recoil: 0.08 });

// ---------------------------------------------------------------- Schneider CA1

export const buildSchneiderCA1 = (mats) => rig(once('ca1', () => {
  const gear = runningGear({ halfWidth: 0.72, length: 3.8, wheels: 6, wheelR: 0.18, sprocket: -1, rollers: 0, trackWidth: 0.36, wheelColor: FR_DK });
  return {
    gear, wheel: roadWheelGeometry(0.18, 0.26, FR_DK),
    hull: grime(merge([
      ...gear.parts,
      sideProfile([[-3.0, 0.55], [-3.0, 2.0], [-2.3, 2.3], [1.4, 2.3], [3.1, 0.95], [3.0, 0.55]], 2.0, { color: FR, ...C }),
      P.box(0.12, 0.5, 0.9, { y: 0.55, z: 3.3, rx: 0.5, color: STEEL }),                              // the wire-cutter beak
      ...pair((s) => P.box(0.06, 0.1, 0.9, { x: s * 0.5, y: 0.7, z: -3.4, color: FR_DK })),          // the tail rails
      ...[0.9, -0.95].map((x) => P.sphere(0.22, { x, y: 1.75, z: -0.6, sy: 0.9, color: FR_DK }, 10, 6)), // the MG domes
      ...pair((s) => roundel(s * 1.02, 1.6, -1.6, 0.18)).flat(),
    ]), 1.0, 0.3),
    turret: merge([P.box(0.4, 0.5, 0.25, { color: FR_DK, ...C })]),
    gun: merge([P.cyl(0.07, 0.075, 0.8, { z: 0.4, rx: Math.PI / 2, color: STEEL }, 10)]),            // the short Blockhaus 75
  };
}), mats, { turretAt: [0.75, 1.15, 1.8], gunAt: [0, 0, 0.1], muzzle: 0.9, arc: 0.6, recoil: 0.12 });

// ---------------------------------------------------------------- A7V

export const buildA7V = (mats) => rig(once('a7v', () => {
  const gear = runningGear({ halfWidth: 0.8, length: 4.6, wheels: 7, wheelR: 0.2, sprocket: -1, rollers: 0, trackWidth: 0.5, wheelColor: DE_DK });
  return {
    gear, wheel: roadWheelGeometry(0.2, 0.3, DE_DK),
    hull: grime(merge([
      ...gear.parts,
      sideProfile([[-3.67, 0.55], [-3.67, 2.3], [-3.2, 3.0], [3.2, 3.0], [3.67, 2.3], [3.67, 0.55], [3.0, 0.42], [-3.0, 0.42]], 3.06, { color: DE, ...C }), // the steel box, overhanging its tracks
      P.box(1.4, 0.48, 1.3, { y: 3.22, z: 0.4, color: DE, ...C }),                                    // the commander's and driver's cab on top
      P.box(1.2, 0.1, 0.05, { y: 3.3, z: 1.06, color: 0x111111 }),
      ...pair((s) => [-2.4, -1.2, 0.0, 1.2].map((z) => P.cyl(0.07, 0.08, 0.35, { x: s * 1.55, y: 1.9, z, rz: Math.PI / 2 * s, color: STEEL }, 8))).flat(), // the six machine guns along the sides
      ...pair((s) => cross(s * 1.54, 2.2, -1.9, 0.4)).flat(),
    ]), 1.3, 0.3),
    turret: merge([P.box(0.6, 0.6, 0.2, { color: DE_DK, ...C })]),
    gun: merge([P.cyl(0.055, 0.065, 0.95, { z: 0.47, rx: Math.PI / 2, color: STEEL }, 10)]),         // the 5.7 cm Maxim-Nordenfelt
  };
}), mats, { turretAt: [0, 1.75, 3.62], gunAt: [0, 0, 0.1], muzzle: 1.05, arc: 0.8, recoil: 0.12 });

// ---------------------------------------------------------------- armoured cars

const car = (key, { color, dark, length, width, wheelR, track, base, body, turret, gun, turretAt, gunAt, muzzle, arc = Infinity }) => (mats) => rig(once(key, () => {
  const wheels = [];
  for (const z of base) for (const s of [-1, 1]) wheels.push({ x: s * track, y: wheelR, z });
  return {
    gear: { wheels, wheelR }, wheel: roadWheelGeometry(wheelR, 0.16, 0x2a2a24, 0, 0.3),
    hull: grime(merge([
      P.box(width * 0.9, 0.18, length, { y: wheelR + 0.05, color: STEEL }),                           // the chassis
      ...pair((s) => P.box(0.3, 0.06, length * 0.9, { x: s * (width / 2), y: wheelR + 0.35, color: dark })), // the running boards / mudguards
      ...body,
    ]), wheelR + 0.6, 0.3),
    turret: merge(turret), gun: merge(gun),
  };
}), mats, { turretAt, gunAt, muzzle, arc, recoil: 0.05 });

export const buildRollsRoyceAC = car('rr', {
  color: BR, dark: BR_DK, length: 4.9, width: 1.9, wheelR: 0.45, track: 0.85, base: [1.55, -1.35],
  body: [
    P.box(0.95, 0.75, 1.7, { y: 1.05, z: 1.4, color: BR, ...C }),                                     // the long armoured bonnet
    P.box(0.9, 0.2, 0.06, { y: 1.15, z: 2.27, color: 0x1a1a18 }),                                     // the radiator doors
    P.box(1.7, 1.0, 2.2, { y: 1.2, z: -0.6, color: BR, ...C }),                                       // the fighting compartment
    P.box(1.5, 0.12, 1.0, { y: 0.85, z: -2.05, color: BR_DK }),                                       // the open tender at the back
    ...pair((s) => P.cyl(0.42, 0.42, 0.14, { x: s * 0.6, y: 1.25, z: -2.1, rz: Math.PI / 2, color: 0x2a2a24 }, 14)), // spare wheels
  ],
  turret: [P.cyl(0.62, 0.66, 0.5, { y: 0.25, color: BR, ...C }, 14)],
  gun: [P.cyl(0.05, 0.05, 0.7, { z: 0.35, rx: Math.PI / 2, color: STEEL }, 8), P.box(0.12, 0.2, 0.3, { z: 0.05, color: STEEL })], // the Vickers in its armoured jacket
  turretAt: [0, 1.7, -0.6], gunAt: [0, 0.25, 0.6], muzzle: 0.72,
});

export const buildPeugeotAC = car('peugeot', {
  color: FR, dark: FR_DK, length: 4.8, width: 1.8, wheelR: 0.45, track: 0.8, base: [1.5, -1.4],
  body: [
    P.box(0.9, 0.7, 1.5, { y: 1.0, z: 1.45, color: FR, ...C }),
    P.box(1.7, 0.75, 2.6, { y: 1.05, z: -0.6, color: FR, ...C }),                                     // the open body
    P.cyl(0.1, 0.12, 0.6, { y: 1.6, z: -0.9, color: STEEL }, 8),                                      // the pedestal
    ...pair((s) => roundel(s * 0.86, 1.1, -0.6, 0.18)).flat(),
  ],
  turret: [P.box(0.9, 0.7, 0.06, { y: 0.15, z: 0.3, color: FR, ...C })],                              // the gun shield
  gun: [P.cyl(0.045, 0.05, 0.75, { z: 0.38, rx: Math.PI / 2, color: STEEL }, 10)],                    // the 37 mm
  turretAt: [0, 1.95, -0.9], gunAt: [0, 0.1, 0.3], muzzle: 0.78,
});

export const buildEhrhardtAC = car('ehrhardt', {
  color: DE, dark: DE_DK, length: 5.6, width: 2.0, wheelR: 0.5, track: 0.9, base: [1.8, -1.7],
  body: [
    sideProfile([[-2.8, 0.85], [-2.8, 2.1], [-2.3, 2.35], [1.4, 2.35], [2.8, 1.55], [2.8, 0.85]], 2.0, { color: DE, ...C }),
    ...pair((s) => [-1.4, 0.2].map((z) => P.cyl(0.06, 0.06, 0.3, { x: s * 1.05, y: 1.8, z, rz: Math.PI / 2, color: STEEL }, 8))).flat(),
    ...pair((s) => cross(s * 1.01, 1.4, -0.6, 0.32)).flat(),
  ],
  turret: [P.cyl(0.6, 0.65, 0.55, { y: 0.27, color: DE, ...C }, 12)],
  gun: [P.cyl(0.05, 0.05, 0.6, { z: 0.3, rx: Math.PI / 2, color: STEEL }, 8)],                       // an MG 08
  turretAt: [0, 2.35, -0.5], gunAt: [0, 0.3, 0.6], muzzle: 0.62,
});
