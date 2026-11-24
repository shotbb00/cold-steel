// The American Expeditionary Forces' vehicles, 1918 (data/units1918/aef.js), nose toward +z, on ww1Armour.js's kit:
//   Renault FT      the US Tank Corps' light tank (the 344th and 345th battalions at St Mihiel): the FT, its turret
//                   marked with the company's playing-card suit (here the diamond) and the Tank Corps' triangle
//   Mark V          the 301st Heavy Tank Battalion's, with the British at the Hindenburg Line: the Allied white-red-white
//                   stripes on the horns, the Tank Corps' yellow-red-blue triangle on the frames
//   Model T ambulance  the little Ford with its square box body overhanging the back, the roof carried over the driver
//   Liberty truck   the Standard B: the long bonnet, the tall radiator, the open cab under a roof, the canvas tilt
//   Dodge tourer    the staff car: open, its hood folded, the spare tyre on the side, a general's one-star flag
//   the AA lorry and the balloon winch on ww1Armour.js's, in olive drab
import { P, pair } from '../units/geometry.js';
import { sideProfile } from './vehicleCommon.js';
import { C, car, rhomboid, renaultFT, aaLorry, winch, RED_CROSS } from './ww1Armour.js';

const US = 0x56563a;      // olive drab (the camouflage over it: render/RigRenderer.js ARMY_CAMO_1918 aef)
const US_DK = 0x45452e;
const STEEL = 0x2b2d28;
const WHITE = 0xd8d6cc;
const RED = 0xa8231b;
const YELLOW = 0xc8a030;
const BLUE = 0x2a3a7a;
const LEATHER = 0x3a2a1c;
const BRASS = 0x9a7a3a;
const CANVAS = 0x8a7e5a;

/** A five-pointed star on a side (facing x), centre (x, y, z), radius r. */
const star = (x, y, z, r, color = WHITE) => sideProfile(Array.from({ length: 10 }, (_, i) => { const a = (i * Math.PI) / 5, k = i % 2 ? r * 0.4 : r; return [Math.sin(a) * k, Math.cos(a) * k]; }), 0.02, { x, y, z, color }, 0);
/** The US Tank Corps' badge on a side: a triangle, point down, split from its middle into yellow, red and blue. */
const tankCorps = (x, y, z, r) => {
  const v = [0, 1, 2].map((i) => { const a = Math.PI + (i * 2 * Math.PI) / 3; return [Math.sin(a) * r, Math.cos(a) * r]; });
  return [YELLOW, RED, BLUE].map((color, i) => sideProfile([v[i], v[(i + 1) % 3], [0, 0]].map(([zz, yy]) => [z + zz, y + yy]), 0.02, { x, color }, 0));
};
const stripes = (x, y, z) => [WHITE, RED, WHITE].map((c, i) => P.box(0.02, 0.5, 0.16, { x, y, z: z + (i - 1) * 0.17, color: c }));

// ---------------------------------------------------------------- the tanks

export const buildRenaultFTUS = renaultFT('ftUS', pair((s) => [
  P.cyl(0.14, 0.14, 0.02, { x: s * 0.535, y: 0.42, z: -0.1, rz: Math.PI / 2, color: WHITE }, 14),
  P.box(0.03, 0.13, 0.13, { x: s * 0.55, y: 0.42, z: -0.1, rx: Math.PI / 4, color: RED }),        // B Company's diamond
]).flat());

export const buildMarkVUS = rhomboid('markVUS', { color: US, dark: US_DK, marks: [
  ...pair((s) => stripes(s * 1.44, 1.9, 3.1)).flat(),
  ...pair((s) => tankCorps(s * 1.45, 1.75, -2.0, 0.42)).flat(),
] });

// ---------------------------------------------------------------- the soft-skins

const headlamps = (y, z, x = 0.35) => pair((s) => P.cyl(0.08, 0.09, 0.12, { x: s * x, y, z, rx: Math.PI / 2, color: BRASS, surf: 'metal' }, 10));

/** The Ford Model T ambulance: 3.9 m, the narrow Ford bonnet, the box body wider than the cab and hanging over the back, the roof over the driver. */
export const buildFordAmbulance = car('fordAmbUS', {
  color: US, dark: US_DK, length: 3.9, width: 1.5, wheelR: 0.38, track: 0.66, base: [1.2, -1.15],
  body: [
    P.box(0.6, 0.46, 0.8, { y: 0.98, z: 1.42, color: US, ...C }),                                     // the bonnet
    P.box(0.62, 0.56, 0.06, { y: 1.0, z: 1.84, color: 0x1e1e1a }), P.cyl(0.03, 0.03, 0.06, { y: 1.31, z: 1.84, color: BRASS }, 6), // the radiator, its cap
    ...headlamps(1.05, 1.86, 0.4),
    P.box(1.0, 0.5, 0.1, { y: 1.1, z: 1.0, color: US, ...C }),                                        // the dash
    P.box(1.2, 0.06, 0.9, { y: 0.8, z: 0.55, color: US_DK }), P.box(1.1, 0.3, 0.42, { y: 1.0, z: 0.35, color: LEATHER }), // the floor, the seat
    P.box(1.62, 1.5, 2.0, { y: 1.6, z: -0.95, color: US, ...C }),                                      // the box body, for four stretchers
    P.box(1.68, 0.06, 2.95, { y: 2.38, z: -0.5, color: US_DK }),                                       // the roof, carried forward over the driver
    ...pair((s) => P.box(0.04, 1.5, 0.04, { x: s * 0.62, y: 1.62, z: 0.95, color: US_DK })),          // its front posts
    P.box(1.5, 1.32, 0.03, { y: 1.6, z: -1.97, color: 0x2a2a22 }),                                     // the canvas flap at the back
    ...pair((s) => RED_CROSS(s * 0.82, 1.7, -0.95)).flat(), ...RED_CROSS(0, 1.75, -1.98, 'z'),
  ],
  turret: [P.box(0.1, 0.1, 0.1, { color: US_DK })], gun: [P.box(0.04, 0.04, 0.04, { color: US_DK })], turretAt: [0, 1.3, -0.9], gunAt: [0, 0, 0], muzzle: 0.1,
});

/** The Liberty truck (Standard B, 3-ton): 6.6 m, the long bonnet and tall radiator, the open cab under its roof, the cargo bed under a canvas tilt, a white star on the bonnet. */
export const buildLibertyTruck = car('libertyUS', {
  color: US, dark: US_DK, length: 6.6, width: 2.1, wheelR: 0.5, track: 0.88, base: [2.35, -1.65],
  body: [
    P.box(0.86, 0.66, 1.5, { y: 1.3, z: 2.45, color: US, ...C }),                                      // the bonnet
    ...pair((s) => star(s * 0.44, 1.32, 2.45, 0.2)),
    P.box(0.98, 0.98, 0.12, { y: 1.36, z: 3.26, color: 0x26261f }), P.box(1.02, 0.14, 0.18, { y: 1.88, z: 3.26, color: US, ...C }), // the radiator, its header tank
    P.box(1.9, 0.12, 0.12, { y: 0.62, z: 3.4, color: STEEL }),                                          // the bumper
    ...headlamps(1.45, 3.3, 0.6),
    P.box(1.3, 0.55, 0.16, { y: 1.5, z: 1.72, color: US, ...C }),                                      // the cowl
    P.box(2.0, 0.08, 1.2, { y: 1.04, z: 1.1, color: US_DK }), P.box(1.8, 0.4, 0.45, { y: 1.3, z: 0.78, color: LEATHER }), // the cab floor, the bench
    P.box(2.0, 1.3, 0.06, { y: 1.72, z: 0.52, color: US, ...C }),                                      // the cab's back
    ...pair((s) => [0.56, 1.75].map((z) => P.box(0.06, 1.62, 0.06, { x: s * 0.97, y: 1.95, z, color: US_DK }))).flat(),
    P.box(2.1, 0.06, 1.55, { y: 2.78, z: 1.12, color: US, ...C }),                                     // the roof
    P.box(2.1, 0.14, 3.7, { y: 1.22, z: -1.38, color: US_DK }),                                        // the bed
    ...pair((s) => P.box(0.06, 0.5, 3.7, { x: s * 1.03, y: 1.52, z: -1.38, color: 0x5a4a34 })),       // its sides
    P.box(2.1, 0.5, 0.06, { y: 1.52, z: -3.2, color: 0x5a4a34 }),                                      // the tailboard
    P.box(2.08, 0.75, 3.55, { y: 2.12, z: -1.42, color: CANVAS }),                                     // the canvas tilt over its bows
    P.cyl(1.04, 1.04, 3.55, { y: 2.48, z: -1.42, rx: Math.PI / 2, sz: 0.42, color: CANVAS }, 14),
    P.box(1.8, 1.0, 0.03, { y: 2.1, z: -3.2, color: 0x2a2a22 }),                                       // (open at the back: dark inside)
  ],
  turret: [P.box(0.1, 0.1, 0.1, { color: US_DK })], gun: [P.box(0.04, 0.04, 0.04, { color: US_DK })], turretAt: [0, 2.0, -1.4], gunAt: [0, 0, 0], muzzle: 0.1,
});

/** The Dodge Brothers tourer, the AEF's staff car (Pershing rode in a Cadillac, his officers in these): open, the hood folded, the spare on the side, a general's red flag with its star. */
export const buildDodgeStaffCar = car('dodgeUS', {
  color: US, dark: US_DK, length: 4.3, width: 1.7, wheelR: 0.38, track: 0.72, base: [1.35, -1.25],
  body: [
    P.box(0.7, 0.5, 1.25, { y: 1.0, z: 1.38, color: US, ...C }),                                       // the bonnet
    P.box(0.72, 0.6, 0.06, { y: 1.0, z: 2.02, color: 0x26261f }), ...headlamps(1.1, 2.05, 0.42),
    P.box(1.55, 0.62, 2.5, { y: 1.0, z: -0.55, color: US, ...C }),                                     // the open body
    P.box(1.4, 0.05, 2.3, { y: 1.32, z: -0.55, color: 0x1e1a14 }),
    ...[0.2, -1.05].map((z) => P.box(1.35, 0.36, 0.42, { y: 1.42, z, color: LEATHER })),             // the seats' backs
    P.box(1.5, 0.32, 0.4, { y: 1.45, z: -1.85, rx: 0.3, color: 0x2a2a24 }),                            // the folded hood
    P.box(1.35, 0.45, 0.04, { y: 1.58, z: 0.7, rx: -0.15, color: 0x9ab0b8 }),                          // the windscreen
    P.torus(0.33, 0.07, { x: 0.86, y: 1.0, z: 0.55, ry: Math.PI / 2, color: 0x1e1e1a }, 14),            // the spare tyre on the running board
    P.cyl(0.01, 0.01, 0.6, { x: -0.62, y: 1.5, z: 1.95, color: STEEL }, 4),
    P.box(0.01, 0.18, 0.28, { x: -0.62, y: 1.72, z: 1.82, color: RED }), star(-0.615, 1.72, 1.82, 0.06), // the brigadier's flag
  ],
  turret: [P.box(0.1, 0.1, 0.1, { color: US_DK })], gun: [P.box(0.04, 0.04, 0.04, { color: US_DK })], turretAt: [0, 1.3, -0.5], gunAt: [0, 0, 0], muzzle: 0.1,
});

export const buildAALorryUS = aaLorry('aaUS', US, US_DK);        // the French 75 on its auto-canon mount: the AEF's anti-aircraft batteries
export const buildBalloonUS = winch('balloonUS', US, US_DK, 'us'); // the Air Service's balloon companies flew French Caquots
