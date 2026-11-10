// The fighter patrol's and the recon flight's aircraft (data/air.ts FIGHTERS, RECON), built like
// aircraft.js from swept cross-sections (airKit.js), in metres, nose toward +z:
//   F-15C Eagle   the US Air Force's air superiority fighter: the wide flat body between the two
//                 engines, the square intakes beside the bubble canopy, the cropped delta wing,
//                 twin fins; Sparrows on the fuselage corners, Sidewinders under the wings
//   MiG-23MLD     the Soviet frontline fighter: the long pointed radome, the D-shaped intakes
//                 behind the cockpit, the swing wings at 45° for the patrol, the tall fin and the
//                 ventral fin; R-23s under the gloves
//   F-4 Phantom   F-4F (Luftwaffe), and as RF-4E / RF-4C the reconnaissance Phantom with the
//                 slab-sided camera nose: the intakes with their splitter plates, the outer wings
//                 bent up 12°, the tailplanes drooping 23°, the two J79 nozzles under the tail
//   MiG-21bis     the NVA's fighter: the nose intake with its shock cone, the dorsal spine, the
//                 57° delta, the tall swept fin and the ventral fin; R-60s on the wing pylons
//   MiG-25RB      the Soviet recon-bomber: very long and very fast — the huge wedge intakes, the
//                 thin shoulder wing with its droop, the two fins splayed outward, the camera
//                 windows in the nose
// (The Su-22M4R of the NVA's recon flights is the Su-22M4 of armyAircraft.js.)
// Contract: aircraft.js.
import * as THREE from 'three';
import { P, merge, pair } from '../units/geometry.js';
import { meshAdder } from './vehicleCommon.js';
import { body, surface, fin, missile } from './airKit.js';

const US_GREY = 0x7f878e;   // Compass Ghost
const SOV_GREY = 0x88908f;
const LW = 0x4e5440;        // Norm 72
const EURO = 0x3f4a35;      // Euro I green
const NVA_SILVER = 0x9fa4a3;
const MIG25 = 0xa9aeac;
const GLASS = 0x1b2126;
const DARK = 0x2a2c28;
const HOLE = 0x141414;
const WHITE = 0xd8d6cc;
const C = { camo: 1 };
const M = (parts) => merge(parts.flat(Infinity)); // (missiles come as part lists)

const point = (root, x, y, z) => {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  root.add(o);
  return o;
};

/** A national marking: a disc facing sideways (on a fin or an intake) or up (on a wing). */
const roundel = (x, y, z, r, up = false, tilt = 0) => P.cyl(r, r, 0.02, up ? { x, y, z } : { x, y, z, rz: Math.PI / 2 - tilt }, 14); // tilt: a fin leaning out

const cache = {};
/** Build (once) and mount a model from its parts: body (painted), glass, marks (the side's colour). */
function mount(key, mats, make, gun) {
  const m = (cache[key] ??= make());
  const root = new THREE.Group();
  const add = meshAdder(root);
  add(m.body, mats.body);
  if (m.marks) add(m.marks, mats.glow, false);
  return { root, gun: point(root, ...gun), pods: [], jet: true };
}

// ---------------------------------------------------------------- F-15C

export const buildNatoF15 = (mats) => mount('f15', mats, () => ({
  body: M([
    // radome and the cockpit section
    body([[9.7, 1.95, 0.04, 0.04], [9.1, 1.95, 0.32, 0.32], [7.8, 1.95, 0.55, 0.56], [6.2, 2.0, 0.66, 0.72], [4.6, 2.05, 0.72, 0.78], [3.0, 2.05, 0.8, 0.78, 2.6]], { color: US_GREY, ...C }),
    // the wide flat centre body between the engines, out to the tail
    body([[3.6, 2.15, 0.7, 0.6, 3], [1.0, 2.1, 1.3, 0.62, 3.4], [-3.0, 2.0, 1.6, 0.6, 3.6], [-6.5, 1.95, 1.5, 0.55, 3.2], [-8.8, 1.9, 1.3, 0.5, 3]], { color: US_GREY, ...C }),
    // the square intakes on either side of the cockpit, running back into the engine bays (the openings: thin and flush, inside a lip of the intake wall)
    ...pair((s) => body([[4.4, 1.8, 0.45, 0.62, 5], [3.4, 1.8, 0.55, 0.7, 5], [-1.5, 1.8, 0.55, 0.68, 4.5], [-5.0, 1.82, 0.5, 0.6, 3.5]], { x: s * 1.2, color: US_GREY, ...C })),
    ...pair((s) => P.box(0.76, 0.97, 0.004, { x: s * 1.2, y: 1.8, z: 4.403, color: HOLE })),
    // the two engines' nozzles
    ...pair((s) => P.cyl(0.52, 0.48, 0.8, { x: s * 0.68, y: 1.9, z: -9.2, rx: Math.PI / 2, color: DARK }, 14)),
    ...pair((s) => P.cyl(0.42, 0.42, 0.02, { x: s * 0.68, y: 1.9, z: -9.61, rx: Math.PI / 2, color: HOLE }, 14)),
    // the bubble canopy and its frame
    body([[6.9, 2.55, 0.05, 0.05], [6.2, 2.88, 0.42, 0.38], [5.0, 3.0, 0.45, 0.42], [4.0, 2.88, 0.38, 0.32], [3.2, 2.62, 0.2, 0.15]], { color: GLASS }),
    body([[6.25, 2.87, 0.43, 0.39], [6.15, 2.89, 0.44, 0.4]], { color: DARK }),
    // the dorsal hump behind the canopy into the body
    body([[3.6, 2.6, 0.38, 0.3], [1.0, 2.6, 0.5, 0.3], [-2.5, 2.5, 0.45, 0.2]], { color: US_GREY, ...C }),
    // the cropped delta wing, the tailplanes, the twin fins (canted out a little)
    ...pair((s) => surface([[s * 1.4, 2.0, -2.0, 3.2, 0.18], [s * 4.0, 1.98, -3.8, 2.0, 0.11], [s * 6.5, 1.96, -5.6, 1.0, 0.05]], { color: US_GREY, ...C })),
    ...pair((s) => surface([[s * 1.3, 1.9, -8.5, 1.25, 0.07], [s * 4.3, 1.88, -9.5, 0.6, 0.03]], { color: US_GREY, ...C })),
    ...pair((s) => fin([[2.3, -7.1, 1.7, 0.1, s * 1.22], [3.6, -7.8, 1.3, 0.08, s * 1.3], [5.4, -8.7, 0.7, 0.05, s * 1.4]], { color: US_GREY, ...C })),
    // AIM-7 Sparrows on the fuselage corners, AIM-9 Sidewinders on the wing pylons
    ...pair((s) => missile(s * 1.15, 1.08, -3.6, 0.0, 0.1, WHITE)),
    ...pair((s) => P.box(0.08, 0.3, 1.4, { x: s * 3.6, y: 1.8, z: -3.3, color: DARK })),
    ...pair((s) => missile(s * 3.6, 1.55, -4.6, -1.7, 0.07, WHITE)),
  ]),
  marks: M([...pair((s) => roundel(s * 1.42, 4.0, -8.0, 0.34)), ...pair((s) => roundel(s * 5.0, 2.03, -4.6, 0.36, true))]),
}), [1.7, 2.3, 2.4]);

// ---------------------------------------------------------------- MiG-23MLD

export const buildPactMiG23 = (mats) => mount('mig23', mats, () => ({
  body: M([
    body([[8.6, 1.9, 0.03, 0.03], [7.8, 1.9, 0.28, 0.3], [6.5, 1.92, 0.48, 0.54], [5.0, 1.95, 0.55, 0.62], [3.6, 1.95, 0.6, 0.7], [0.0, 1.95, 0.85, 0.8, 2.6], [-4.0, 1.95, 0.75, 0.75, 2.4], [-7.4, 1.95, 0.55, 0.55], [-8.1, 1.95, 0.5, 0.5]], { color: SOV_GREY, ...C }),
    P.cyl(0.4, 0.4, 0.02, { y: 1.95, z: -8.11, rx: Math.PI / 2, color: HOLE }, 14),
    // the D-shaped intakes behind the cockpit, splitter plates inboard
    ...pair((s) => body([[4.1, 1.85, 0.35, 0.58, 3], [3.0, 1.85, 0.42, 0.65, 3], [-1.5, 1.88, 0.42, 0.62, 3], [-4.0, 1.9, 0.3, 0.5, 2.6]], { x: s * 0.85, color: SOV_GREY, ...C })),
    ...pair((s) => P.box(0.50, 0.88, 0.004, { x: s * 0.92, y: 1.85, z: 4.103, color: HOLE })),
    ...pair((s) => P.box(0.03, 1.1, 0.9, { x: s * 0.5, y: 1.85, z: 4.2, color: SOV_GREY })),
    // canopy, dorsal spine
    body([[6.0, 2.4, 0.05, 0.05], [5.4, 2.65, 0.34, 0.3], [4.6, 2.72, 0.36, 0.32], [4.1, 2.6, 0.25, 0.2]], { color: GLASS }),
    body([[4.5, 2.5, 0.26, 0.22], [0.0, 2.75, 0.36, 0.3], [-4.0, 2.62, 0.3, 0.24], [-6.0, 2.4, 0.15, 0.1]], { color: SOV_GREY, ...C }),
    // the fixed gloves, the swing wings at 45°
    ...pair((s) => surface([[s * 0.6, 2.25, 0.6, 2.0, 0.14], [s * 1.9, 2.22, -0.8, 1.1, 0.1]], { color: SOV_GREY, ...C })),
    ...pair((s) => surface([[s * 1.8, 2.2, -0.8, 1.35, 0.1], [s * 5.4, 2.12, -3.6, 0.55, 0.04]], { color: SOV_GREY, ...C })),
    // tailplanes, the tall fin with its dorsal fillet, the ventral fin
    ...pair((s) => surface([[s * 0.6, 1.95, -6.5, 1.1, 0.06], [s * 3.5, 1.9, -7.9, 0.5, 0.03]], { color: SOV_GREY, ...C })),
    fin([[2.6, -4.4, 1.9, 0.1], [3.2, -5.3, 1.5, 0.09], [4.9, -7.0, 0.8, 0.05], [5.05, -7.2, 0.45, 0.03]], { color: SOV_GREY, ...C }),
    fin([[1.3, -6.3, 0.9, 0.05], [0.95, -6.6, 0.8, 0.05], [0.45, -7.1, 0.5, 0.04]], { color: SOV_GREY, ...C }),
    // the GSh-23 under the belly, R-23s under the gloves, R-60s under the intakes
    P.box(0.3, 0.25, 1.4, { y: 1.15, z: 0.8, color: DARK }),
    ...pair((s) => P.box(0.1, 0.3, 1.2, { x: s * 1.5, y: 2.0, z: -0.2, color: DARK })),
    ...pair((s) => missile(s * 1.5, 1.72, -1.9, 1.7, 0.11, WHITE)),
    ...pair((s) => missile(s * 0.85, 1.08, -2.6, -0.6, 0.06, WHITE)),
  ]),
  marks: M([...pair((s) => roundel(s * 0.11, 4.0, -6.3, 0.38)), ...pair((s) => roundel(s * 4.2, 2.17, -2.8, 0.34, true))]),
}), [0, 1.15, 1.6]);

// ---------------------------------------------------------------- F-4 Phantom (F-4F, RF-4E, RF-4C)

function phantom(color, recon) {
  const nose = recon
    ? [[9.8, 1.9, 0.14, 0.16, 3], [9.3, 1.9, 0.42, 0.45, 3.2], [7.6, 1.95, 0.6, 0.7, 3.2], [6.3, 1.95, 0.68, 0.76, 2.6]] // the camera nose
    : [[9.8, 1.95, 0.04, 0.04], [9.0, 1.95, 0.4, 0.42], [7.6, 1.95, 0.6, 0.64], [6.3, 1.95, 0.68, 0.76]];
  return {
    body: M([
      body([...nose, [5.0, 1.95, 0.72, 0.8], [3.5, 1.95, 0.78, 0.82], [0.0, 1.9, 0.95, 0.85, 2.6], [-3.0, 1.95, 0.9, 0.8, 2.6], [-5.4, 2.15, 0.62, 0.62], [-7.8, 2.4, 0.42, 0.36], [-9.4, 2.5, 0.22, 0.14]], { color, ...C }),
      ...(recon ? [...pair((s) => P.box(0.02, 0.3, 0.5, { x: s * 0.6, y: 1.8, z: 8.2, color: GLASS })), P.box(0.4, 0.02, 0.5, { y: 1.27, z: 7.6, color: GLASS })] : []), // camera windows
      // the intakes and their splitter plates, the J79 nozzles under the tail
      ...pair((s) => body([[4.6, 1.85, 0.4, 0.62, 3.2], [3.4, 1.85, 0.48, 0.7, 3.2], [-1.0, 1.82, 0.48, 0.66, 3], [-3.6, 1.78, 0.38, 0.55, 2.6]], { x: s * 1.0, color, ...C })),
      ...pair((s) => P.box(0.59, 0.92, 0.004, { x: s * 1.08, y: 1.85, z: 4.603, color: HOLE })),
      ...pair((s) => P.box(0.04, 1.3, 1.1, { x: s * 0.56, y: 1.87, z: 4.6, color })),
      ...pair((s) => P.cyl(0.46, 0.42, 1.2, { x: s * 0.58, y: 1.72, z: -5.2, rx: Math.PI / 2, color: DARK }, 14)),
      ...pair((s) => P.cyl(0.38, 0.38, 0.02, { x: s * 0.58, y: 1.72, z: -5.81, rx: Math.PI / 2, color: HOLE }, 14)),
      // the long tandem canopy, its frame
      body([[7.0, 2.55, 0.05, 0.05], [6.3, 2.85, 0.38, 0.33], [4.0, 2.98, 0.4, 0.36], [2.4, 2.82, 0.32, 0.26], [1.8, 2.6, 0.2, 0.15]], { color: GLASS }),
      ...[6.25, 4.6].map((z) => body([[z + 0.05, 2.9, 0.41, 0.36], [z - 0.05, 2.92, 0.42, 0.37]], { color: DARK })),
      // inner wing flat, outer wing bent up 12°, the dog-tooth; tailplanes drooping 23°; the fin
      ...pair((s) => surface([[s * 0.9, 1.6, -1.6, 3.0, 0.2], [s * 4.0, 1.6, -3.5, 1.75, 0.1]], { color, ...C })),
      ...pair((s) => surface([[s * 4.0, 1.6, -3.4, 1.8, 0.1], [s * 5.85, 1.99, -4.8, 0.9, 0.05]], { color, ...C })),
      ...pair((s) => surface([[s * 0.35, 2.5, -8.4, 1.1, 0.07], [s * 2.9, 1.45, -9.2, 0.5, 0.03]], { color, ...C })),
      fin([[2.6, -6.0, 1.8, 0.1], [3.2, -6.8, 1.5, 0.09], [4.9, -8.3, 0.75, 0.05], [5.1, -8.5, 0.4, 0.03]], { color, ...C }),
      // recon: a fuel tank on the centreline; fighter: four Sparrows half sunk in the belly, Sidewinders inboard
      ...(recon
        ? [body([[1.8, 0.95, 0.05, 0.05], [1.2, 0.95, 0.3, 0.3], [-2.2, 0.95, 0.3, 0.3], [-3.0, 0.95, 0.08, 0.08]], { color: WHITE }), P.box(0.08, 0.3, 1.0, { y: 1.15, z: -0.5, color: DARK })]
        : [...pair((s) => [1.2, -3.0].map((z) => missile(s * 0.55, 1.08, z - 3.6, z, 0.1, WHITE))).flat(),
          ...pair((s) => P.box(0.08, 0.3, 1.0, { x: s * 2.6, y: 1.35, z: -2.2, color: DARK })),
          ...pair((s) => missile(s * 2.6, 1.15, -3.6, -0.9, 0.07, WHITE))]),
    ]),
    marks: M([...pair((s) => roundel(s * 1.49, 1.9, 0.6, 0.32)), ...pair((s) => roundel(s * 4.9, 1.74, -3.9, 0.36, true))]),
  };
}
export const buildBwF4F = (mats) => mount('f4f', mats, () => phantom(LW, false), [0, 1.35, 8.0]);
export const buildBwRF4E = (mats) => mount('rf4e', mats, () => phantom(LW, true), [0, 1.35, 8.0]);
export const buildNatoRF4C = (mats) => mount('rf4c', mats, () => phantom(EURO, true), [0, 1.35, 8.0]);

// ---------------------------------------------------------------- MiG-21bis

export const buildNvaMiG21 = (mats) => mount('mig21', mats, () => ({
  body: M([
    body([[7.4, 1.9, 0.42, 0.42], [6.5, 1.9, 0.5, 0.52], [4.0, 1.9, 0.55, 0.6], [0.0, 1.9, 0.6, 0.62], [-4.0, 1.9, 0.55, 0.56], [-6.8, 1.9, 0.48, 0.48], [-7.3, 1.9, 0.45, 0.45]], { color: NVA_SILVER, ...C }),
    P.cyl(0.36, 0.36, 0.02, { y: 1.9, z: 7.39, rx: Math.PI / 2, color: HOLE }, 14),       // the intake
    P.cyl(0.05, 0.3, 0.9, { y: 1.9, z: 7.55, rx: Math.PI / 2, color: 0x8a8a80 }, 12),     // its shock cone
    P.cyl(0.4, 0.4, 0.02, { y: 1.9, z: -7.31, rx: Math.PI / 2, color: HOLE }, 14),        // the nozzle
    P.cyl(0.012, 0.012, 1.4, { y: 2.3, z: 8.0, rx: Math.PI / 2, color: DARK }, 4),        // the pitot boom
    // canopy, dorsal spine
    body([[5.6, 2.35, 0.05, 0.05], [5.1, 2.6, 0.32, 0.3], [4.3, 2.66, 0.33, 0.32], [3.8, 2.55, 0.25, 0.2]], { color: GLASS }),
    body([[4.0, 2.5, 0.25, 0.22], [2.5, 2.62, 0.32, 0.28], [-1.0, 2.6, 0.3, 0.25], [-5.5, 2.35, 0.15, 0.12]], { color: NVA_SILVER, ...C }),
    // the delta, the tailplanes, the fin and the ventral fin
    ...pair((s) => surface([[s * 0.5, 1.8, -2.0, 2.4, 0.14], [s * 3.58, 1.75, -4.9, 0.35, 0.03]], { color: NVA_SILVER, ...C })),
    ...pair((s) => surface([[s * 0.5, 1.82, -6.0, 0.9, 0.06], [s * 2.6, 1.8, -6.9, 0.35, 0.03]], { color: NVA_SILVER, ...C })),
    fin([[2.4, -4.2, 1.5, 0.09], [3.0, -4.9, 1.3, 0.08], [4.5, -6.4, 0.6, 0.05], [4.6, -6.55, 0.35, 0.03]], { color: NVA_SILVER, ...C }),
    fin([[1.4, -5.8, 0.7, 0.05], [0.9, -6.1, 0.55, 0.04], [0.7, -6.4, 0.4, 0.03]], { color: NVA_SILVER, ...C }),
    // the GSh-23 pack under the belly, R-60s on the pylons
    P.box(0.3, 0.22, 1.2, { y: 1.25, z: -0.6, color: DARK }),
    ...pair((s) => P.box(0.08, 0.3, 1.0, { x: s * 2.2, y: 1.6, z: -3.4, color: DARK })),
    ...pair((s) => missile(s * 2.2, 1.4, -4.4, -2.1, 0.07, WHITE)),
  ]),
  marks: M([...pair((s) => roundel(s * 0.1, 3.5, -5.5, 0.34)), ...pair((s) => roundel(s * 2.6, 1.79, -4.3, 0.3, true))]),
}), [0, 1.25, 0.1]);

// ---------------------------------------------------------------- MiG-25RB

export const buildPactMiG25 = (mats) => mount('mig25', mats, () => ({
  body: M([
    // the long nose with the cameras, the centre body over the engines
    body([[11.6, 2.0, 0.05, 0.06], [10.5, 2.0, 0.4, 0.42], [8.5, 2.05, 0.6, 0.62], [6.5, 2.1, 0.66, 0.7], [3.0, 2.15, 0.75, 0.62, 3], [-6.0, 2.2, 0.62, 0.5, 3], [-10.5, 2.2, 0.35, 0.3]], { color: MIG25, ...C }),
    ...[9.6, 8.9, 8.2].map((z) => P.box(0.3, 0.02, 0.35, { y: 1.39, z, color: GLASS })),
    // the huge wedge intakes, running back into the engine nacelles and the nozzles
    ...pair((s) => body([[5.6, 1.95, 0.6, 0.85, 5], [3.0, 1.95, 0.75, 0.95, 5], [-4.0, 1.95, 0.8, 0.92, 4], [-9.0, 2.0, 0.75, 0.8, 3], [-12.0, 2.0, 0.68, 0.68, 2.4]], { x: s * 1.05, color: MIG25, ...C })),
    ...pair((s) => P.box(0.97, 1.34, 0.004, { x: s * 1.1, y: 1.95, z: 5.603, color: HOLE })),
    ...pair((s) => P.cyl(0.58, 0.58, 0.02, { x: s * 1.05, y: 2.0, z: -12.01, rx: Math.PI / 2, color: HOLE }, 14)),
    // the small canopy
    body([[7.6, 2.7, 0.05, 0.05], [7.0, 2.95, 0.35, 0.3], [6.3, 2.98, 0.37, 0.3], [5.7, 2.85, 0.28, 0.2]], { color: GLASS }),
    // the thin shoulder wing drooping out, the tailplanes, the two fins splayed out and the ventral fins
    ...pair((s) => surface([[s * 1.6, 2.75, -2.8, 3.0, 0.15], [s * 7.0, 2.4, -6.4, 1.1, 0.05]], { color: MIG25, ...C })),
    ...pair((s) => surface([[s * 1.7, 2.0, -10.5, 1.2, 0.07], [s * 4.6, 1.95, -11.6, 0.55, 0.03]], { color: MIG25, ...C })),
    ...pair((s) => fin([[2.8, -8.6, 1.9, 0.1, s * 1.3], [4.0, -9.5, 1.5, 0.09, s * 1.48], [5.9, -11.0, 0.75, 0.05, s * 1.75]], { color: MIG25, ...C })),
    ...pair((s) => fin([[1.3, -9.4, 1.0, 0.06, s * 1.4], [0.9, -9.8, 0.9, 0.06, s * 1.48], [0.4, -10.3, 0.6, 0.05, s * 1.55]], { color: MIG25, ...C })),
  ]),
  marks: M([...pair((s) => roundel(s * 1.6, 4.3, -9.9, 0.42, false, s * 0.14)), ...pair((s) => roundel(s * 5.5, 2.52, -5.2, 0.42, true))]),
}), [0, 1.2, 4.0]);
