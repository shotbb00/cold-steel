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
import * as THREE from 'three';
import { P, merge, pair, grime } from '../units/geometry.js';
import { sideProfile, planProfile, stationHull, runningGear, roadWheelGeometry, meshAdder, distanceDriven } from './vehicleCommon.js';
import { rig, balkenkreuz } from './ww2Armour.js';

const BR = 0x5c5638;     // British tank brown-green
const BR_DK = 0x48432c;
const FR = 0x7a7454;     // French: the camouflage goes over it (render/RigRenderer.js ARMY_CAMO_1918)
const FR_DK = 0x5c5840;
const DE = 0x6a6a5a;     // German field grey, the camouflage over it
const DE_DK = 0x52524a;
const STEEL = 0x2b2d28;
const TRACK = 0x3a3a34;
const WHITE = 0xd8d6cc;
const RED = 0xa8231b;
const BLUE = 0x2a3a7a;
const C = { camo: 1 };

const cache = {};
const once = (key, make) => (cache[key] ??= make());
/** The rollers along the bottom run inside a track frame (half hidden by its plate): from z0 to z1, at ±x. */
const rollers = (x, z0, z1, n, r = 0.2) => ({ wheelR: r, wheels: pair((s) => Array.from({ length: n }, (_, i) => ({ x: s * x, y: r + 0.05, z: z0 + ((z1 - z0) * i) / (n - 1) }))).flat() });
const roller = (r = 0.2) => roadWheelGeometry(r, 0.3, STEEL);

/** Track links round a side outline [[z, y], …] at x (a rhomboid's or a track frame's edge), `phase` (0..1) of a shoe along it. */
function linksRound(outline, x, width, phase = 0) {
  const parts = [];
  for (let i = 0; i < outline.length; i++) {
    const [z0, y0] = outline[i], [z1, y1] = outline[(i + 1) % outline.length];
    const len = Math.hypot(z1 - z0, y1 - y0), n = Math.max(1, Math.round(len / 0.3)), a = Math.atan2(y1 - y0, z1 - z0);
    const nz = (y1 - y0) / len, ny = -(z1 - z0) / len;    // out of the outline (it runs counter-clockwise, z forward, y up)
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5 + phase) / n, z = z0 + (z1 - z0) * t, y = y0 + (y1 - y0) * t;
      parts.push(P.box(width + 0.14, 0.1, 0.27, { x, y: y + ny * 0.06, z: z + nz * 0.06, rx: -a, color: TRACK, surf: 'metal' }));      // the shoe
      parts.push(P.box(width + 0.14, 0.05, 0.06, { x, y: y + ny * 0.13, z: z + nz * 0.13, rx: -a, color: 0x1e1e1a, surf: 'metal' }));  // its cleat
    }
  }
  return parts;
}

/** A track frame either side: the steel plate cut to `outline` (its shoes: `running`). */
const frames = (outline, halfWidth, width, color) => pair((s) => sideProfile(outline, width, { x: s * halfWidth, color, ...C }));

const PITCH = 0.3;   // m: one track shoe
/**
 * The tracks seem to run (cheaply): the shoes round both frames in three sets a third of a shoe apart, shown in
 * turn as the tank drives — the cleats creep backward along the bottom run and forward over the top. Mounted on
 * the rig's hull, after it is built.
 */
function running(r, key, outline, halfWidth, width, mats) {
  const sets = [0, 1 / 3, 2 / 3].map((ph, i) => meshAdder(r.root.children[0])(once(`${key}:tread${i}`, () => merge(pair((s) => linksRound(outline, s * halfWidth, width, ph)).flat())), mats.body));
  const animate = r.animate;
  r.animate = (u, dt, t, ctx) => {
    animate(u, dt, t, ctx);
    const k = (3 - (Math.floor(distanceDriven(u) / (PITCH / 3)) % 3)) % 3;   // (driving forward: the phase steps back along the outline)
    sets.forEach((m, i) => { m.visible = i === k; });
  };
  return r;
}

const cross = (x, y, z, r) => balkenkreuz(x, y, z, r);
/**
 * A riveted plate body from stations [[z, bottom, half-width at the bottom, half-width at the knee,
 * knee height, half-width at the top, top], …] (vehicleCommon stationHull): vertical sides up to the
 * knee, then sloping in to the roof — a station narrower or lower than the next makes a sloped end.
 */
const plated = (stations, opts) => stationHull(stations.map(([z, b, wb, wk, k, wt, t]) => [z, [[0, b], [wb, b], [wk, k], [wt, t], [0, t]]]), opts);
/** A row of rivet heads on a side at (x, y), from z0 to z1. */
const rivets = (x, y, z0, z1, color, step = 0.24) => {
  const n = Math.max(2, Math.round(Math.abs(z1 - z0) / step));
  return Array.from({ length: n }, (_, i) => P.box(0.035, 0.04, 0.04, { x, y, z: z0 + ((z1 - z0) * i) / (n - 1), color }));
};
const SLIT = 0x101010;
/** A vision slit on a face that looks along z (front: d = 1, rear: −1). */
const slit = (x, y, z, w, d = 1) => P.box(w, 0.045, 0.03, { x, y, z: z + d * 0.01, color: SLIT });
/** A door or hatch outline on a side (x the face), w long, h high. */
const door = (x, y, z, w, h, color) => [P.box(0.03, h, w, { x, y, z, color }), P.box(0.05, 0.06, 0.06, { x: x + Math.sign(x) * 0.02, y, z: z + w * 0.35, color: STEEL })];
const stripes = (x, y, z) => [WHITE, RED, WHITE].map((c, i) => P.box(0.02, 0.5, 0.16, { x, y, z: z + (i - 1) * 0.17, color: c })); // the British recognition stripes on the horns (1918)
const roundel = (x, y, z, r) => [P.cyl(r, r, 0.02, { x, y, z, rz: Math.PI / 2, color: BLUE }, 16), P.cyl(r * 0.66, r * 0.66, 0.03, { x, y, z, rz: Math.PI / 2, color: WHITE }, 16), P.cyl(r * 0.33, r * 0.33, 0.04, { x, y, z, rz: Math.PI / 2, color: RED }, 16)];

// ---------------------------------------------------------------- the rhomboid: Mark V, the captured Mark IV, the A7V-U

const RHOMB = [[-4.0, 1.25], [-3.55, 0.25], [-2.8, 0.0], [2.0, 0.0], [3.3, 0.55], [4.0, 1.55], [3.75, 2.35], [3.0, 2.55], [-3.3, 2.55], [-3.95, 2.0]];

const rhomboidHull = (key, { color, dark, marks, cab = true, beam = true, supply = false }) => (mats) => rig(once(key, () => ({
  gear: rollers(1.15, -2.6, 1.8, 7), wheel: roller(),
  hull: grime(merge([
    ...frames(RHOMB, 1.15, 0.55, color),
    P.box(1.8, 1.85, 5.6, { y: 1.52, z: -0.2, color, ...C }),                                        // the hull between the horns
    ...(cab ? [ // the driver's cab, its front sloped, the vision slits
      plated([[1.55, 2.44, 0.68, 0.68, 2.7, 0.6, 3.0], [2.35, 2.44, 0.68, 0.68, 2.7, 0.6, 3.0], [2.72, 2.44, 0.68, 0.66, 2.6, 0.56, 2.8]], { color, ...C }),
      slit(-0.25, 2.72, 2.7, 0.3), slit(0.25, 2.72, 2.7, 0.3),
    ] : []),
    plated([[-2.65, 2.44, 0.5, 0.5, 2.65, 0.4, 2.95], [-1.75, 2.44, 0.5, 0.5, 2.65, 0.4, 2.95]], { color, ...C }), // the rear cupola
    ...pair((sd) => [2.25, 0.62].flatMap((y) => rivets(sd * 1.44, y, -3.0, 2.4, dark))).flat(),   // the frames' rivet rows
    ...(beam ? [ // the unditching beam on its rails over the top
      ...pair((s) => P.box(0.08, 0.08, 6.0, { x: s * 0.95, y: 2.62, z: -0.4, color: STEEL })),
      P.box(2.9, 0.3, 0.3, { y: 2.85, z: -2.9, color: 0x5a4630 }),
    ] : []),
    ...(supply ? [ // the supply tank: no guns — sponson-boxes for stores, and the cargo stacked on top
      ...pair((sd) => P.box(0.6, 0.9, 2.2, { x: sd * 1.72, y: 1.2, z: 0.3, color: dark, ...C })).flat(),
      ...[[-0.4, -1.4], [0.4, -1.4], [-0.4, -0.5], [0.4, -0.5], [0, 0.4]].map(([x, z]) => P.box(0.7, 0.45, 0.8, { x, y: 2.68, z, color: 0x6a5a3a })),
      P.box(1.5, 0.35, 0.6, { y: 2.62, z: 1.0, color: 0x4a4a3a }),
    ] : []).flat(),
    ...(supply ? [] : pair((sd) => [ // the sponsons, cut back at the front and the rear so the guns can swing, a 6-pdr in each (the right one turns: the rig's gun)
      planProfile([[1.42, -0.55], [1.42, 1.55], [1.85, 1.35], [2.12, 0.95], [2.12, 0.05], [1.85, -0.35]].map(([x, z]) => [sd * x, z]), 1.15, { y: 0.72, color, ...C }),
      ...rivets(sd * 2.13, 1.8, 0.1, 0.9, dark, 0.2), ...rivets(sd * 2.13, 0.8, 0.1, 0.9, dark, 0.2),
      ...door(sd * 2.13, 1.2, 0.5, 0.5, 0.75, dark),
    ]).flat()),
    ...pair((s) => [-1.8, -0.6].map((z) => P.cyl(0.07, 0.07, 0.06, { x: s * 1.43, y: 2.0, z, rz: Math.PI / 2, color: 0x111111 }, 8))).flat(), // pistol ports
    ...marks,
  ]), 1.2, 0.3),
  turret: merge([P.box(0.42, 0.55, 0.3, { x: 0.18, color: dark, ...C })]),    // the right sponson's gun shield
  gun: merge([supply ? P.box(0.04, 0.04, 0.04, { color: dark }) : P.cyl(0.05, 0.06, 1.4, { z: 0.7, rx: Math.PI / 2, color: STEEL }, 10)]),
})), mats, { turretAt: [1.75, 1.35, 1.45], gunAt: [0.18, 0, 0.1], muzzle: 1.45, arc: 1.4, recoil: 0.15 });

/**
 * The rhomboid with its left sponson gun turning too (a second gun: data/units1918 LEFT_6PDR, UnitStack.updateSideGuns
 * `cannon`): it swings toward the target its own crew has picked, within the sponson's arc, and back to the front when idle.
 */
const rhomboid = (key, o) => (mats) => {
  const r = running(rhomboidHull(key, o)(mats), 'rhomb', RHOMB, 1.15, 0.55, mats);
  if (o.supply) return r;
  const left = new THREE.Group();
  left.position.set(-1.75, 1.35, 1.45);
  meshAdder(left)(once(`${key}:left`, () => merge([P.box(0.42, 0.55, 0.3, { x: -0.18, color: o.dark, ...C }), P.cyl(0.05, 0.06, 1.4, { x: -0.18, z: 0.8, rx: Math.PI / 2, color: STEEL }, 10)])), mats.body);
  r.root.children[0].add(left);
  const animate = r.animate;
  r.animate = (u, dt, t, ctx) => {
    animate(u, dt, t, ctx);
    const guns = u.stats?.sideGuns;
    const i = guns ? guns.findIndex((m) => m.cannon) : -1;
    const foe = i >= 0 ? u.side?.[i]?.foe : null;
    let want = 0;
    if (foe?.alive) {
      const b = Math.atan2(foe.pos.x - u.pos.x, foe.pos.z - u.pos.z) - u.yaw;
      const m = guns[i];
      want = Math.max(m.at - m.arc, Math.min(m.at + m.arc, Math.atan2(Math.sin(b), Math.cos(b))));
    }
    left.rotation.y += (want - left.rotation.y) * Math.min(1, dt * 1.5);
  };
  return r;
};
export const buildSupplyTank = rhomboid('supplyTank', { color: BR, dark: BR_DK, beam: false, supply: true, marks: [] });
export const buildMarkV = rhomboid('markV', { color: BR, dark: BR_DK, marks: pair((s) => stripes(s * 1.44, 1.9, 3.1)).flat() });
export const buildBeuteMarkIV = rhomboid('beuteIV', { color: DE, dark: DE_DK, cab: false, marks: [...pair((s) => cross(s * 2.17, 1.3, 0.5, 0.32)).flat(), ...pair((s) => cross(s * 1.44, 1.9, -2.2, 0.38)).flat()] });
export const buildA7VU = rhomboid('a7vu', { color: DE, dark: DE_DK, beam: false, marks: [...pair((s) => cross(s * 1.44, 1.9, -1.4, 0.42)).flat()] });

// ---------------------------------------------------------------- the Whippet (Medium A)

const WHIP = [[-3.05, 0.3], [-2.6, 0.0], [1.9, 0.0], [2.9, 0.7], [3.05, 1.25], [2.6, 1.45], [-3.0, 1.45]];

const whippet = (key, { color, dark, marks }) => (mats) => running(rig(once(key, () => ({
  gear: rollers(1.05, -2.5, 1.7, 7), wheel: roller(),
  hull: grime(merge([
    ...frames(WHIP, 1.05, 0.5, color),
    plated([[-0.3, 0.45, 0.78, 0.78, 1.25, 0.7, 1.48], [2.1, 0.45, 0.78, 0.78, 1.25, 0.7, 1.48], [2.65, 0.45, 0.72, 0.7, 1.0, 0.55, 1.15]], { color, ...C }), // the engine in front, its nose sloped
    ...[0.3, 0.7, 1.1, 1.5].map((z) => P.box(1.2, 0.04, 0.14, { y: 1.5, z, color: dark })),        // its louvres
    plated([[-2.95, 0.45, 0.82, 0.82, 2.3, 0.7, 2.62], [-2.75, 0.45, 1.0, 1.0, 2.35, 0.86, 2.72], [-0.5, 0.45, 1.0, 1.0, 2.35, 0.86, 2.72], [-0.3, 0.45, 0.82, 0.82, 2.3, 0.7, 2.62]], { color, ...C }), // the fixed fighting compartment
    ...[-0.5, 0, 0.5].map((x) => slit(x, 2.15, -0.3, 0.22)),                                       // its vision slits all round
    ...pair((sd) => [...rivets(sd * 1.01, 2.3, -2.7, -0.55, dark), ...rivets(sd * 1.01, 0.6, -2.7, -0.55, dark), ...door(sd * 1.01, 1.45, -2.2, 0.6, 1.1, dark)]).flat(),
    ...pair((s) => P.cyl(0.03, 0.03, 0.5, { x: s * 1.0, y: 2.0, z: -1.3, rz: Math.PI / 2 * s, color: STEEL }, 6)), // the side MGs
    P.cyl(0.03, 0.03, 0.5, { y: 2.0, z: -2.95, rx: Math.PI / 2, color: STEEL }, 6),                // the rear MG
    ...marks,
  ]), 1.0, 0.3),
  turret: merge([P.box(0.3, 0.3, 0.12, { color: dark })]),                                         // the front MG's ball mount
  gun: merge([P.cyl(0.03, 0.035, 0.6, { z: 0.3, rx: Math.PI / 2, color: STEEL }, 8)]),
})), mats, { turretAt: [0.3, 2.0, -0.28], gunAt: [0, 0, 0.05], muzzle: 0.62, arc: 1.2, recoil: 0.05 }), 'whip', WHIP, 1.05, 0.5, mats);

export const buildWhippet = whippet('whippet', { color: BR, dark: BR_DK, marks: pair((s) => stripes(s * 1.31, 0.9, 2.2)).flat() });
export const buildBeuteWhippet = whippet('beuteWhippet', { color: DE, dark: DE_DK, marks: pair((s) => cross(s * 1.01, 1.6, -1.6, 0.36)).flat() });

// ---------------------------------------------------------------- Renault FT

const FT = [[-1.95, 0.55], [-1.7, 0.05], [0.9, 0.05], [1.85, 0.65], [2.05, 1.05], [1.75, 1.3], [-1.3, 1.15], [-1.95, 0.95]];

export const buildRenaultFT = (mats) => running(rig(once('ft', () => ({
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
})), mats, { turretAt: [0, 1.25, 0.15], gunAt: [0, 0.4, 0.48], muzzle: 0.65, recoil: 0.08 }), 'ft', FT, 0.66, 0.36, mats);

// ---------------------------------------------------------------- Schneider CA1

export const buildSchneiderCA1 = (mats) => rig(once('ca1', () => {
  const gear = runningGear({ halfWidth: 0.72, length: 3.8, wheels: 6, wheelR: 0.18, sprocket: -1, rollers: 0, trackWidth: 0.36, wheelColor: FR_DK });
  return {
    gear, wheel: roadWheelGeometry(0.18, 0.26, FR_DK),
    hull: grime(merge([
      ...gear.parts,
      plated([[-3.0, 0.55, 0.95, 1.0, 1.9, 0.8, 2.12], [1.2, 0.55, 1.0, 1.05, 1.95, 0.85, 2.25], [2.4, 0.55, 0.8, 0.85, 1.55, 0.62, 1.88], [3.05, 0.55, 0.45, 0.5, 1.05, 0.36, 1.28]], { color: FR, ...C }), // the box, its bow tapering to a blunt nose
      P.box(0.92, 0.62, 0.05, { y: 0.88, z: 3.06, color: FR_DK, ...C }),                                // the nose plate
      P.box(0.14, 0.45, 1.25, { y: 1.0, z: 3.48, rx: -0.75, color: STEEL, surf: 'metal' }),             // the wire-cutter spur, rising ahead from the foot of the nose
      ...pair((sd) => P.box(0.04, 0.3, 0.8, { x: sd * 0.12, y: 0.85, z: 3.3, rx: -0.75, ry: sd * 0.2, color: STEEL, surf: 'metal' })), // its cheeks
      P.cyl(0.24, 0.26, 0.3, { x: -0.45, y: 2.32, z: 1.0, color: FR_DK, ...C }, 10), slit(-0.45, 2.36, 1.2, 0.2),               // the driver's cupola
      P.cyl(0.36, 0.38, 0.75, { x: 0.85, y: 1.25, z: 1.75, color: FR, ...C }, 12),                    // the gun's bulge on the right
      ...pair((sd) => [...rivets(sd * 1.0, 1.9, -2.9, 1.1, FR_DK), ...rivets(sd * 0.96, 0.7, -2.9, 1.1, FR_DK)]).flat(),
      ...pair((sd) => P.box(0.5, 1.0, 0.03, { x: sd * 0.28, y: 1.3, z: -3.02, color: FR_DK })), // the rear doors
      ...[-0.4, 0.4].map((x) => slit(x, 1.75, 2.15, 0.25)),
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
      plated([[-3.67, 1.0, 1.35, 1.45, 1.9, 1.2, 2.55], [-3.2, 0.42, 1.4, 1.53, 1.9, 1.35, 3.0], [3.2, 0.42, 1.4, 1.53, 1.9, 1.35, 3.0], [3.67, 1.05, 1.35, 1.45, 1.95, 1.2, 2.6]], { color: DE, ...C }), // the steel box over its tracks, its plates sloping in
      plated([[-0.3, 2.98, 0.78, 0.78, 3.08, 0.62, 3.45], [1.0, 2.98, 0.78, 0.78, 3.08, 0.62, 3.45], [1.3, 2.98, 0.78, 0.74, 3.05, 0.56, 3.26]], { color: DE, ...C }), // the commander's and driver's cab on top
      ...[-0.35, 0.35].map((x) => slit(x, 3.22, 1.3, 0.35)), slit(0, 3.3, -0.31, 0.5, -1),
      ...pair((sd) => [[0.72, 1.42], [1.9, 1.54], [2.85, 1.38]].flatMap(([y, x]) => rivets(sd * x, y, -3.05, 3.05, DE_DK, 0.3))).flat(),
      ...pair((sd) => door(sd * 1.53, 1.6, 1.9, 0.8, 1.3, DE_DK)).flat(),
      P.sphere(0.32, { y: 1.75, z: 3.55, sz: 0.5, color: DE_DK, ...C }, 12, 8),                       // the gun's mantlet
      ...pair((sd) => [-2.4, -1.2, 0.0, 1.2].flatMap((z) => [P.sphere(0.13, { x: sd * 1.53, y: 1.9, z, sx: 0.6, color: DE_DK }, 8, 6), P.cyl(0.035, 0.04, 0.4, { x: sd * 1.72, y: 1.9, z, rz: Math.PI / 2 * sd, color: STEEL }, 8)])).flat(), // the six machine guns in their ball mounts
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
      P.box(width * 0.8, 0.3, length * 0.95, { y: wheelR + 0.15, color: STEEL }),                     // the chassis, up to the body
      ...wheels.flatMap((w) => [-0.9, -0.45, 0, 0.45, 0.9].map((a) => P.box(0.3, 0.04, 0.32, { x: w.x, y: wheelR + Math.cos(a) * (wheelR + 0.1), z: w.z + Math.sin(a) * (wheelR + 0.1), rx: a, color: dark }))), // the mudguards, arched over each wheel
      ...pair((s) => P.box(0.28, 0.04, Math.abs(base[0] - base[1]) - wheelR * 2.2, { x: s * (track + 0.05), y: wheelR * 0.75, z: (base[0] + base[1]) / 2, color: dark })), // the running boards
      ...body,
    ]), wheelR + 0.6, 0.3),
    turret: merge(turret), gun: merge(gun),
  };
}), mats, { turretAt, gunAt, muzzle, arc, recoil: 0.05 });

export const buildRollsRoyceAC = car('rr', {
  color: BR, dark: BR_DK, length: 4.9, width: 1.9, wheelR: 0.45, track: 0.85, base: [1.55, -1.35],
  body: [
    plated([[0.5, 0.72, 0.48, 0.48, 1.15, 0.38, 1.42], [2.15, 0.72, 0.46, 0.46, 1.1, 0.32, 1.28], [2.3, 0.72, 0.44, 0.44, 1.05, 0.3, 1.2]], { color: BR, ...C }), // the long armoured bonnet, tapering to the radiator
    ...[-0.18, 0.18].map((x) => P.box(0.3, 0.36, 0.03, { x, y: 0.97, z: 2.32, color: BR_DK })),     // the radiator doors
    plated([[-1.75, 0.72, 0.82, 0.82, 1.35, 0.66, 1.62], [0.5, 0.72, 0.86, 0.86, 1.4, 0.72, 1.72]], { color: BR, ...C }), // the fighting compartment, its sides sloping in
    slit(0, 1.5, 0.5, 0.5), ...pair((sd) => door(sd * 0.85, 1.1, -0.6, 0.7, 0.6, BR_DK)).flat(),
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
    plated([[0.65, 0.72, 0.46, 0.46, 1.1, 0.36, 1.35], [2.15, 0.72, 0.44, 0.44, 1.05, 0.3, 1.2]], { color: FR, ...C }), // the bonnet
    plated([[-1.9, 0.72, 0.8, 0.8, 1.2, 0.7, 1.42], [0.65, 0.72, 0.84, 0.84, 1.25, 0.76, 1.5]], { color: FR, ...C }), // the open body, its sides sloping in
    P.box(1.4, 0.05, 2.4, { y: 1.44, z: -0.6, color: 0x1e1e1a }),                                     // (open: dark inside)
    P.cyl(0.1, 0.14, 0.35, { y: 1.55, z: -0.9, color: STEEL, surf: 'metal' }, 8),                     // the pedestal, on the floor of the body
    ...pair((s) => roundel(s * 0.86, 1.1, -0.6, 0.18)).flat(),
  ],
  turret: [P.cyl(0.14, 0.14, 0.12, { y: 0.06, color: STEEL, surf: 'metal' }, 8), P.box(0.24, 0.24, 0.55, { y: 0.24, color: STEEL, surf: 'metal' }), P.box(0.9, 0.62, 0.06, { y: 0.36, z: 0.3, color: FR, ...C })], // the swivel, the cradle, the gun shield
  gun: [P.cyl(0.045, 0.05, 0.75, { z: 0.38, rx: Math.PI / 2, color: STEEL }, 10)],                    // the 37 mm
  turretAt: [0, 1.72, -0.9], gunAt: [0, 0.3, 0.1], muzzle: 0.78,
});

export const buildEhrhardtAC = car('ehrhardt', {
  color: DE, dark: DE_DK, length: 5.6, width: 2.0, wheelR: 0.5, track: 0.95, base: [1.8, -1.7],
  body: [
    plated([[-2.8, 0.8, 0.92, 0.95, 1.7, 0.78, 2.25], [0.9, 0.8, 0.95, 0.98, 1.75, 0.82, 2.35]], { color: DE, ...C }),              // the hull
    plated([[0.9, 0.8, 0.7, 0.7, 1.4, 0.55, 1.7], [2.55, 0.8, 0.66, 0.66, 1.3, 0.48, 1.52], [2.8, 0.8, 0.62, 0.6, 1.2, 0.42, 1.35]], { color: DE, ...C }), // the armoured bonnet
    P.box(0.9, 0.3, 0.04, { y: 1.95, z: 0.92, rx: -0.3, color: DE_DK }), slit(0, 2.0, 0.93, 0.6),                                       // the driver's visor
    ...[-0.25, 0, 0.25].map((x) => P.box(0.12, 0.42, 0.03, { x, y: 1.05, z: 2.82, color: DE_DK })),                                      // the radiator louvres
    ...pair((s) => [-1.4, 0.2].map((z) => P.cyl(0.06, 0.06, 0.3, { x: s * 1.05, y: 1.8, z, rz: Math.PI / 2, color: STEEL }, 8))).flat(),
    ...pair((s) => cross(s * 1.01, 1.4, -0.6, 0.32)).flat(),
  ],
  turret: [P.cyl(0.6, 0.65, 0.55, { y: 0.27, color: DE, ...C }, 12)],
  gun: [P.cyl(0.05, 0.05, 0.6, { z: 0.3, rx: Math.PI / 2, color: STEEL }, 8)],                       // an MG 08
  turretAt: [0, 2.32, -0.7], gunAt: [0, 0.3, 0.6], muzzle: 0.62,
});

// ---------------------------------------------------------------- the kite balloon and its winch lorry

const BALLOON_Y = 40;   // m: the observers' basket, on its cable (data/units1918 eyeHeight)
const balloonParts = (color, kind) => [
  P.cyl(0.015, 0.015, BALLOON_Y - 4, { y: BALLOON_Y / 2 + 0.3, z: -0.8, color: 0x222222 }, 4),                     // the cable
  P.sphere(1, { y: BALLOON_Y + 3, z: -0.8, sx: 3.6, sy: 3.4, sz: 9, color, ...C }, 16, 10),                          // the envelope (Caquot)
  ...[0, 2.09, 4.19].map((a) => P.sphere(1, { x: Math.sin(a) * 2.6, y: BALLOON_Y + 3 + Math.cos(a) * 2.6, z: -8.5, sx: 1.1, sy: 1.1, sz: 2.4, color, ...C }, 10, 6)), // the three tail lobes
  P.box(0.9, 0.9, 0.9, { y: BALLOON_Y - 1.5, z: -0.8, color: 0x6a5a3a }),                                         // the observers' basket
  ...(kind === 'de' ? [] : [P.cyl(1.1, 1.1, 0.03, { x: 3.55, y: BALLOON_Y + 3, z: -0.8, rz: Math.PI / 2, color: kind === 'fr' ? 0xa8231c : 0x22325c }, 16)]),
];
const winch = (key, color, dark, kind) => car(key, {
  color, dark, length: 5.8, width: 2.0, wheelR: 0.45, track: 0.85, base: [1.9, -1.7],
  body: [
    P.box(0.82, 0.55, 1.35, { y: 1.05, z: 2.05, color, ...C }),                                                         // the bonnet
    P.cyl(0.41, 0.41, 1.35, { y: 1.32, z: 2.05, rx: Math.PI / 2, sx: 1, sy: 0.45, color, ...C }, 12),                   // its rounded top
    P.box(0.86, 0.78, 0.08, { y: 1.1, z: 2.76, color: 0x26261f }), P.box(0.88, 0.08, 0.1, { y: 1.52, z: 2.76, color: 0x9a7a3a, surf: 'metal' }), // the radiator, its brass top
    P.box(1.7, 0.08, 1.2, { y: 0.78, z: 0.85, color: dark }),                                                           // the cab floor
    P.box(1.5, 0.35, 0.45, { y: 1.0, z: 0.55, color: 0x3a2c1e }),                                                       // the bench seat
    P.box(1.75, 1.2, 0.06, { y: 1.4, z: 0.3, color, ...C }),                                                            // the cab's back
    ...pair((s) => [0.32, 1.42].map((z) => P.box(0.05, 1.5, 0.05, { x: s * 0.85, y: 1.55, z, color: dark }))).flat(),   // the roof posts
    P.box(1.85, 0.05, 1.35, { y: 2.32, z: 0.87, color, ...C }),                                                         // the roof
    P.box(1.9, 0.12, 3.3, { y: 0.92, z: -1.4, color: dark }),                                                           // the bed
    ...pair((s) => P.box(0.05, 0.3, 3.3, { x: s * 0.93, y: 1.12, z: -1.4, color })),                                   // its sides
    ...pair((s) => [-0.6, -2.0].map((z) => P.box(0.08, 1.0, 0.08, { x: s * 0.7, y: 1.45, z, rx: z < -1 ? 0.35 : -0.35, color: STEEL }))).flat(), // the winch's A-frames
    P.cyl(0.42, 0.42, 1.2, { y: 1.6, z: -1.3, rz: Math.PI / 2, color: 0x3a3a34, surf: 'metal' }, 16),                 // the winch drum
    ...pair((s) => P.cyl(0.5, 0.5, 0.05, { x: s * 0.62, y: 1.6, z: -1.3, rz: Math.PI / 2, color: dark }, 16)),          // its flanges
    P.cyl(0.18, 0.18, 0.1, { y: 2.25, z: -0.8, rz: Math.PI / 2, color: STEEL, surf: 'metal' }, 12),                    // the pulley the cable leaves by
    ...balloonParts(kind === 'de' ? 0x9a9a88 : 0xb8b49a, kind),
  ],
  turret: [P.box(0.2, 0.2, 0.2, { color: dark })], gun: [P.box(0.05, 0.05, 0.05, { color: dark })],
  turretAt: [0, 1.9, -0.8], gunAt: [0, 0, 0], muzzle: 0.1,
});
export const buildBalloonUK = winch('balloonUK', BR, BR_DK, 'uk');
export const buildBalloonFR = winch('balloonFR', FR, FR_DK, 'fr');
export const buildBalloonDE = winch('balloonDE', DE, DE_DK, 'de');

// ---------------------------------------------------------------- lorries and the staff car (the support of 1918)

/** A 1918 lorry's front: bonnet, radiator, the open cab under its roof (the winch lorry's, the AA lorry's, the ambulance's, the supply lorry's). */
const lorryFront = (color, dark) => [
  P.box(0.82, 0.55, 1.35, { y: 1.05, z: 2.05, color, ...C }),
  P.cyl(0.41, 0.41, 1.35, { y: 1.32, z: 2.05, rx: Math.PI / 2, sx: 1, sy: 0.45, color, ...C }, 12),
  P.box(0.86, 0.78, 0.08, { y: 1.1, z: 2.76, color: 0x26261f }), P.box(0.88, 0.08, 0.1, { y: 1.52, z: 2.76, color: 0x9a7a3a, surf: 'metal' }),
  P.box(1.7, 0.08, 1.2, { y: 0.78, z: 0.85, color: dark }),
  P.box(1.5, 0.35, 0.45, { y: 1.0, z: 0.55, color: 0x3a2c1e }),
  P.box(1.75, 1.2, 0.06, { y: 1.4, z: 0.3, color, ...C }),
  ...pair((s) => [0.32, 1.42].map((z) => P.box(0.05, 1.5, 0.05, { x: s * 0.85, y: 1.55, z, color: dark }))).flat(),
  P.box(1.85, 0.05, 1.35, { y: 2.32, z: 0.87, color, ...C }),
  P.box(1.9, 0.12, 3.3, { y: 0.92, z: -1.4, color: dark }),
];
const lorry = (key, color, dark, load, { turret = [P.box(0.1, 0.1, 0.1, { color: dark })], gun = [P.box(0.04, 0.04, 0.04, { color: dark })], turretAt = [0, 1.9, -1.4], gunAt = [0, 0, 0], muzzle = 0.1 } = {}) =>
  car(key, { color, dark, length: 5.8, width: 2.0, wheelR: 0.45, track: 0.85, base: [1.9, -1.7], body: [...lorryFront(color, dark), ...load], turret, gun, turretAt, gunAt, muzzle });

const RED_CROSS = (x, y, z, face = 'x') => [face === 'x' ? P.box(0.02, 0.62, 0.62, { x, y, z, color: 0xe8e4da }) : P.box(0.62, 0.62, 0.02, { x, y, z, color: 0xe8e4da }),
  ...[[0.42, 0.13], [0.13, 0.42]].map(([a, b]) => (face === 'x' ? P.box(0.03, a, b, { x, y, z, color: 0xb02020 }) : P.box(b, a, 0.03, { x, y, z, color: 0xb02020 })))];
const ambulanceBody = (color) => [
  P.box(1.9, 1.5, 3.0, { y: 1.75, z: -1.45, color, ...C }),                                                         // the box body
  ...pair((s) => RED_CROSS(s * 0.96, 1.85, -1.5)).flat(), ...RED_CROSS(0, 2.0, -2.96, 'z'),
];
const supplyLoad = [
  ...pair((s) => P.box(0.05, 0.35, 3.3, { x: s * 0.93, y: 1.12, z: -1.4, color: 0x5a4a34 })),
  ...[[-0.45, -0.4], [0.45, -0.4], [-0.45, -1.4], [0.45, -1.4], [-0.45, -2.4], [0.45, -2.4], [0, -0.9]].map(([x, z], i) => P.box(0.75, 0.5, 0.85, { x, y: 1.25 + (i === 6 ? 0.5 : 0), z, color: i % 2 ? 0x6a5a3a : 0x5a4e34 })), // crates of shells
];
/** The AA lorry: a field gun on a high pedestal on the bed, laid up at the sky (the 13-pounder, the auto-canon de 75, the K-Flak). */
const aaLorry = (key, color, dark) => lorry(key, color, dark, [
  ...pair((s) => P.box(0.05, 0.3, 3.3, { x: s * 0.93, y: 1.1, z: -1.4, color: dark })),
  P.cyl(0.25, 0.4, 0.7, { y: 1.35, z: -1.4, color: STEEL, surf: 'metal' }, 10),
], {
  turret: [P.cyl(0.35, 0.35, 0.2, { y: 0.1, color: STEEL, surf: 'metal' }, 12), P.box(0.5, 0.45, 0.9, { y: 0.4, color, ...C }), P.box(1.0, 0.7, 0.05, { y: 0.55, z: 0.5, rx: -0.4, color, ...C })],
  gun: [P.cyl(0.06, 0.07, 2.4, { y: 0.85, z: 0.75, rx: Math.PI / 2 - 0.9, color: STEEL, surf: 'metal' }, 10)],   // laid up at about 50°
  turretAt: [0, 1.7, -1.4], gunAt: [0, 0.2, 0], muzzle: 1.5,
});
export const buildAALorryUK = aaLorry('aaUK', BR, BR_DK);
export const buildAALorryFR = aaLorry('aaFR', FR, FR_DK);
export const buildAALorryDE = aaLorry('aaDE', DE, DE_DK);
export const buildAmbulanceUK = lorry('ambUK', BR, BR_DK, ambulanceBody(BR));
export const buildAmbulanceFR = lorry('ambFR', FR, FR_DK, ambulanceBody(FR));
export const buildAmbulanceDE = lorry('ambDE', DE, DE_DK, ambulanceBody(DE));
export const buildSupplyLorryFR = lorry('supFR', FR, FR_DK, supplyLoad);
export const buildSupplyLorryDE = lorry('supDE', DE, DE_DK, supplyLoad);

/** The staff car: an open tourer, its hood folded, a pennant on the wing — the command post of 1918, wherever the general is. */
const staffCar = (key, color, dark, flag) => car(key, {
  color, dark, length: 4.4, width: 1.7, wheelR: 0.4, track: 0.72, base: [1.3, -1.2],
  body: [
    P.box(0.75, 0.5, 1.3, { y: 1.0, z: 1.3, color, ...C }),                                                          // the bonnet
    P.box(0.78, 0.6, 0.06, { y: 1.0, z: 1.97, color: 0x26261f }),
    P.box(1.55, 0.55, 2.4, { y: 0.98, z: -0.5, color, ...C }),                                                       // the open body
    P.box(1.4, 0.05, 2.2, { y: 1.26, z: -0.5, color: 0x1e1a14 }),                                                    // (open: the seats inside)
    ...[0.25, -1.0].map((z) => P.box(1.35, 0.35, 0.45, { y: 1.35, z, color: 0x3a2a1c })),                          // the seats' backs
    P.box(1.5, 0.3, 0.35, { y: 1.4, z: -1.75, rx: 0.3, color: 0x2a2a24 }),                                         // the folded hood
    P.box(1.3, 0.4, 0.04, { y: 1.5, z: 0.65, rx: -0.2, color: 0x9ab0b8 }),                                          // the windscreen
    P.cyl(0.01, 0.01, 0.6, { x: 0.6, y: 1.5, z: 1.9, color: STEEL }, 4), P.box(0.01, 0.16, 0.25, { x: 0.6, y: 1.72, z: 1.78, color: flag }), // the pennant
  ],
  turret: [P.box(0.1, 0.1, 0.1, { color: dark })], gun: [P.box(0.04, 0.04, 0.04, { color: dark })],
  turretAt: [0, 1.3, -0.5], gunAt: [0, 0, 0], muzzle: 0.1,
});
export const buildStaffCarUK = staffCar('staffUK', BR, BR_DK, 0xb02020);
export const buildStaffCarFR = staffCar('staffFR', FR, FR_DK, 0x22325c);
export const buildStaffCarDE = staffCar('staffDE', DE, DE_DK, 0x161616);
