// The Warsaw Pact's Baltic ships, 1985 (the coastal maps: Hohwacht), bow toward +z, on the landing-craft rig
// (models/landingCraft45.js craft: a bow ramp that comes down when she's aground, u.rampK; she rides the
// swell till she's on the beach, u.beached):
//   Frosch I   Volksmarine tank landing ship, 98 m: a high bow with the doors and the ramp, the deckhouse aft,
//              twin 57 mm forward, twin 30 mm aft
//   Polnocny   Polish/Soviet medium landing ship, 73 m: the bridge aft, a long well deck under a hatch, two
//              twin 30 mm, the rocket launchers at the bow
//   Aist       Soviet assault hovercraft, 47 m: a black skirt, the cargo deck, two tall pylons aft with four
//              propellers, the bow ramp — she runs straight up onto the sand
//   Parchim    Volksmarine anti-submarine corvette, 72 m: a long forecastle, twin 57 mm aft, twin 30 mm, RBU
//   Osa        missile boat, 39 m: four big Termit (Styx) boxes, two twin 30 mm
//   Natya      minesweeper, 61 m: twin 30 mm fore and aft, the sweep gear on the quarterdeck
import * as THREE from 'three';
import { P, merge, grime } from '../units/geometry.js';
import { trackedHull, castTurret, stationHull } from './vehicleCommon.js';
import { vehicle, tracked } from './support.js';
import { craft } from './landingCraft45.js';
import { KIT } from './ships1945.js';

const GREY = 0x8c969c;
const DARK = 0x5a6268;
const DECK = 0x6c6a62;
const STEEL = 0x4c5458;
const BLACK = 0x1c1e20;
const GLASS = 0x2a3a44;
const RED = 0x7a2a22;

const box = (w, h, d, o) => P.box(w, h, d, { surf: 'plate', ...o });
const cyl = (rt, rb, h, o, n = 10) => P.cyl(rt, rb, h, { surf: 'plate', ...o }, n);

/**
 * A hull: straight-sided aft, then the bow lofted from the full beam to the stem in one piece — narrowing,
 * the bottom rising and the sheer lifting toward the stem, which rakes forward. `blunt`: a landing ship's
 * bow, wide enough at the stem for its bow doors and ramp. The boot topping at the waterline.
 */
function hull(L, B, fb, draft, c = GREY, blunt = false, raise = 0, boot = RED) { // (`raise`: a forecastle that much higher, lofted in with the bow; `boot`: the boot topping)
  const bowL = L * 0.22, z0 = L / 2 - bowL, h = B / 2;
  const stem = blunt ? h * 0.55 : 0.18;
  const st = (z, w, bot, sheer, flare = 1) => [z, [[0, bot], [w * 0.75, bot], [w * flare * 0.96, bot + (fb - bot) * 0.35], [w * flare, sheer - 0.05], [w * flare - 0.06, sheer], [0, sheer]]];
  return [
    box(B, fb + draft, L - bowL, { y: (fb - draft) / 2, z: -bowL / 2, color: c }),
    stationHull([
      st(z0 - 0.05, h, -draft, fb),
      st(z0 + bowL * 0.35, h * (blunt ? 0.95 : 0.88), -draft * 0.95, fb + 0.25 + raise),
      st(z0 + bowL * 0.7, h * (blunt ? 0.82 : 0.6), -draft * 0.8, fb + 0.55 + raise, 1.05),
      st(L / 2 - 0.4, stem, -draft * (blunt ? 0.6 : 0.4), fb + 0.85 + raise, 1.1),
      st(L / 2, Math.max(0.06, stem * 0.6), -draft * (blunt ? 0.5 : 0.2), fb + 0.9 + raise, 1.1),
    ], { color: c, surf: 'plate' }),
    // the forecastle's deck over it and the jackstaff at the stem
    box(h * (blunt ? 1.5 : 1.2), 0.08, bowL * 0.5, { y: fb + 0.35 + raise, z: z0 + bowL * 0.55, color: DECK, surf: 'deck' }),
    cyl(0.05, 0.06, 2.2, { y: fb + 2.0 + raise, z: L / 2 - 0.5, color: DARK }, 5),
    box(B * 1.01, 0.4, L - bowL, { y: -0.1, z: -bowL / 2, color: boot }),
    box(B - 0.4, 0.1, L - bowL - 1, { y: fb + 0.05, z: -bowL / 2, color: DECK, surf: 'deck' }),
    // the guard rails along the deck edges, their stanchions every three metres
    ...[-1, 1].flatMap((s) => [
      box(0.05, 0.05, L - bowL - 2, { x: s * (B / 2 - 0.12), y: fb + 1.0, z: -bowL / 2, color: STEEL }),
      ...Array.from({ length: Math.floor((L - bowL - 2) / 3) + 1 }, (_, k) => box(0.05, 1.0, 0.05, { x: s * (B / 2 - 0.12), y: fb + 0.5, z: -L / 2 + 1 + k * 3, color: STEEL })),
    ]),
    // portholes along both sides, the hawse pipes and anchors at the bow, bollards fore and aft
    ...[-1, 1].flatMap((s) => Array.from({ length: Math.floor((L - bowL) / 5) }, (_, k) => cyl(0.18, 0.18, 0.05, { x: s * (B / 2 + 0.01), y: fb - 0.9, z: -L / 2 + 4 + k * 5, rz: Math.PI / 2, color: GLASS }, 8))),
    ...[-1, 1].flatMap((s) => [cyl(0.35, 0.35, 0.1, { x: s * B * 0.22, y: fb - 0.7, z: L / 2 - bowL * 0.45, rz: Math.PI / 2 - s * 0.4, color: BLACK }, 10), box(0.15, 0.9, 0.5, { x: s * B * 0.24, y: fb - 1.3, z: L / 2 - bowL * 0.42, color: BLACK })]),
    ...[L / 2 - bowL - 3, -L / 2 + 3].flatMap((z) => [-1, 1].map((s) => cyl(0.18, 0.2, 0.5, { x: s * (B / 2 - 0.9), y: fb + 0.3, z, color: STEEL }, 8))),
    // the life-raft canisters in their cradles amidships
    ...[-1, 1].flatMap((s) => [0, 1, 2].map((k) => cyl(0.32, 0.32, 1.1, { x: s * (B / 2 - 0.55), y: fb + 0.4, z: -L * 0.18 + k * 1.3, rx: Math.PI / 2, color: 0xd8d4c8 }, 10))),
  ];
}
/** A twin gun turret (AK-230 / AK-725 style): a squat round house, two barrels. */
const twin = (x, y, z, r = 1.1, len = 2.6, aft = false) => [
  cyl(r, r * 1.05, r * 0.9, { x, y: y + r * 0.45, z, color: GREY }, 12),
  ...[-0.22, 0.22].map((dx) => cyl(0.06 * r * 1.6, 0.08 * r * 1.6, len, { x: x + dx * r, y: y + r * 0.6, z: z + (aft ? -1 : 1) * (len / 2 + r * 0.6), rx: Math.PI / 2, color: STEEL }, 6)),
];
const mast = (x, y, z, h, yard = 4) => [
  cyl(0.12, 0.18, h, { x, y: y + h / 2, z, color: DARK }, 6), box(yard, 0.12, 0.12, { x, y: y + h * 0.75, z, color: DARK }), box(1.4, 0.5, 0.4, { x, y: y + h + 0.2, z, color: DARK }),
  box(2.6, 0.25, 0.35, { x, y: y + h * 0.5 + 0.16, z: z + 0.4, color: DARK }),                  // the navigation radar's antenna on its platform…
  box(1.2, 0.08, 1.0, { x, y: y + h * 0.5, z: z + 0.2, color: DARK }),                    // …the platform
  ...[-1, 1].map((s) => box(0.15, 0.15, 0.15, { x: x + s * yard * 0.45, y: y + h * 0.75 - 0.15, z, color: s < 0 ? 0x8a2a20 : 0x2a6a3a })), // the side lights on the yard
  cyl(0.06, 0.06, 1.2, { x, y: y + h + 1.0, z, color: DARK }, 5),                         // the masthead whip
];
const bridge = (y, z, w, h, d, c = GREY) => [
  box(w, h, d, { y: y + h / 2, z, color: c }), box(w + 0.05, 0.6, 0.12, { y: y + h - 0.6, z: z + d / 2 + 0.03, color: GLASS }),
  ...[-1, 1].flatMap((s) => [
    box(1.4, 0.12, 1.8, { x: s * (w / 2 + 0.7), y: y + h - 1.0, z: z + d / 2 - 1.0, color: c }),     // the bridge wings…
    box(0.05, 1.0, 1.8, { x: s * (w / 2 + 1.38), y: y + h - 0.5, z: z + d / 2 - 1.0, color: c }),    // …their bulwarks
    box(0.06, 0.5, d * 0.5, { x: s * (w / 2 + 0.03), y: y + h - 0.6, z: z + d * 0.15, color: GLASS }),  // side windows
  ]),
  box(w * 0.6, 0.05, 0.05, { y: y + h + 0.9, z: z + d / 2 - 0.3, color: STEEL }),                      // the rail round the bridge roof
  ...[-1, 1].map((s) => box(0.05, 0.9, 0.05, { x: s * w * 0.28, y: y + h + 0.45, z: z + d / 2 - 0.3, color: STEEL })), // …its stanchions
  box(0.6, 0.5, 0.6, { x: w * 0.3, y: y + h + 0.25, z: z + d / 2 - 1.2, color: DARK }),                // a searchlight
];

/** Frosch I: 98 × 11 m. */
export const buildFrosch = craft(() => {
  const L = 98, B = 11, fb = 4.5;
  const fixed = merge([
    ...hull(L, B, fb, 2.8, GREY, true, 3),                                      // (the high forecastle lofted with the bow)
    ...bridge(fb, -26, 9, 7, 16), ...bridge(fb + 7, -24, 6, 3, 8),
    cyl(1.2, 1.4, 5, { y: fb + 9, z: -32, color: DARK }),                        // the funnel
    ...mast(0, fb + 10, -20, 9),
    ...twin(0, fb + 3.3, L / 2 - 11, 1.4, 3.6), ...twin(0, fb + 7, -33.4, 1.1, 2.6, true),
    box(B - 1.2, 0.3, 40, { y: fb + 0.2, z: 8, color: DARK }),                  // the tank deck's hatch covers
  ]);
  const ramp = merge([box(B * 0.5, 4.5, 0.3, { y: 2.25, color: STEEL, surf: 'metal' })]);
  return { fixed, ramp, hinge: [0.6, L / 2 - 1.5], gunAt: [fb + 4.3, L / 2 - 9] };
});

/** Polnocny: 73 × 8.6 m. */
export const buildPolnocny = craft(() => {
  const L = 73, B = 8.6, fb = 3.2;
  const fixed = merge([
    ...hull(L, B, fb, 2, GREY, true),
    ...bridge(fb, -24, 7, 5, 12), ...bridge(fb + 5, -22, 5, 2.4, 6),
    ...mast(0, fb + 7.4, -20, 7),
    ...twin(0, fb, -14, 0.9, 2.2), ...twin(0, fb + 5, -30, 0.9, 2.2, true),     // (the forward pair on the deck before the bridge)
    box(B - 2, 0.4, 30, { y: fb + 0.25, z: 8, color: DARK }),                   // the well deck's hatch
    ...[-1, 1].map((s) => box(1.6, 1.4, 2.4, { x: s * 2.4, y: fb + 0.9, z: L / 2 - 14, color: STEEL })), // the rocket launchers
  ]);
  const ramp = merge([box(B * 0.55, 3.4, 0.25, { y: 1.7, color: STEEL, surf: 'metal' })]);
  return { fixed, ramp, hinge: [0.4, L / 2 - 1.2], gunAt: [fb + 0.6, -14] };
});

/** Aist: 47 × 17.8 m. */
export const buildAist = craft(() => {
  const L = 47, B = 17.8, h = 2.2;
  const fixed = merge([
    box(B, 1.6, L, { y: 0.5, color: BLACK }),                                    // the skirt (rubber: plain — 'cloth' is for sails)
    box(B - 1, 1.2, L - 2, { y: 1.9, color: GREY }),                            // the hull on it
    box(B - 6, 3.4, L - 14, { y: h + 1.9, z: -2, color: GREY }),                // the cargo deck's covered hold
    ...bridge(h + 3.6, 10, 7, 3, 6),
    ...[-1, 1].flatMap((s) => [
      box(1.2, 9, 3, { x: s * 5.5, y: h + 6, z: -L / 2 + 6, color: GREY }),     // the pylons
      ...[0, 1].map((k) => cyl(2.4, 2.4, 0.4, { x: s * (5.5 + (k ? 2.8 : -2.8)), y: h + 8.5, z: -L / 2 + 4.5, rx: Math.PI / 2, color: DARK }, 14)), // the propellers' rings
    ]),
    ...twin(-3, h + 3.6, 4, 0.8, 1.8), ...twin(3, h + 3.6, 4, 0.8, 1.8),
  ]);
  const ramp = merge([box(B * 0.45, 3, 0.25, { y: 1.5, color: STEEL, surf: 'metal' })]);
  return { fixed, ramp, hinge: [1.2, L / 2 - 0.5], gunAt: [h + 4.2, 6] };
});

/** Parchim: 72 × 9.4 m. */
export const buildParchim = craft(() => {
  const L = 72, B = 9.4, fb = 3.6;
  const fixed = merge([
    ...hull(L, B, fb, 2.6),
    box(B * 0.9, 2.4, 30, { y: fb + 1.2, z: 6, color: GREY }),                  // the long deckhouse
    ...bridge(fb + 2.4, 12, 7, 3.6, 8),
    ...mast(0, fb + 6, 8, 10, 5),
    box(2.4, 2.4, 2.4, { y: fb + 7.5, z: 8, color: DARK }),                      // the radar's dome
    ...twin(0, fb, -24, 1.3, 3), ...twin(0, fb + 2.4, -8, 0.8, 2, true),
    ...[-1, 1].map((s) => box(1.4, 1, 1.6, { x: s * 2.6, y: fb + 0.5, z: 24, color: STEEL })), // the RBU launchers
  ]);
  return { fixed, ramp: null, hinge: [0, 0], gunAt: [fb + 1.6, -24] };
});

/** Osa: 39 × 7.6 m. */
export const buildOsa = craft(() => {
  const L = 39, B = 7.6, fb = 2.2;
  const fixed = merge([
    ...hull(L, B, fb, 1.8),
    ...bridge(fb, 6, 4.4, 2.6, 7),
    ...mast(0, fb + 2.6, 4, 5, 3),
    ...[-1, 1].flatMap((s) => [-6, -14].map((z) => box(1.6, 1.6, 8, { x: s * 2.6, y: fb + 1.2, z, rx: -0.12, color: GREY }))), // the four missile boxes
    ...twin(0, fb, 13, 0.75, 1.8), ...twin(0, fb, -L / 2 + 4, 0.75, 1.8, true),
  ]);
  return { fixed, ramp: null, hinge: [0, 0], gunAt: [fb + 1, 14] };
});

/** Natya: 61 × 10 m. */
export const buildNatya = craft(() => {
  const L = 61, B = 10, fb = 3.4;
  const fixed = merge([
    ...hull(L, B, fb, 2.4),
    box(B * 0.8, 2.6, 22, { y: fb + 1.3, z: 6, color: GREY }),
    ...bridge(fb + 2.6, 12, 6, 3, 6),
    ...mast(0, fb + 5.6, 10, 9, 4),                                              // (on the bridge)
    cyl(1, 1.2, 3, { y: fb + 4, z: -1, color: DARK }),                           // the funnel
    ...twin(0, fb, 22, 0.8, 2), ...twin(0, fb + 2.6, -4.6, 0.8, 2, true),
    box(3, 1.4, 2.4, { y: fb + 0.7, z: -L / 2 + 8, color: DARK }),                // the sweep winch
    ...[-1, 1].map((s) => cyl(0.4, 0.4, 2.6, { x: s * 2.6, y: fb + 0.5, z: -L / 2 + 3, rx: Math.PI / 2, color: 0xb84a2a }, 8)), // the floats
  ]);
  return { fixed, ramp: null, hinge: [0, 0], gunAt: [fb + 1, 22] };
});

// ---------------------------------------------------------------- the Volksmarine's and the KPA navy's own (data/units/baltic85.js nva/kpa)

const FLOAT = 0xb84a2a;
/** A light twin 25 mm or 14.5 mm (2M-3, ZPU-2 style): a low pedestal with its shield, two thin barrels. */
const light = (x, y, z, aft = false, len = 1.8) => [
  cyl(0.45, 0.55, 0.5, { x, y: y + 0.25, z, color: GREY }, 10),
  box(1.3, 0.7, 0.08, { x, y: y + 0.85, z: z + (aft ? -0.45 : 0.45), rx: aft ? 0.15 : -0.15, color: GREY }),
  ...[-0.18, 0.18].map((dx) => cyl(0.05, 0.06, len, { x: x + dx, y: y + 0.85, z: z + (aft ? -1 : 1) * (len / 2 + 0.3), rx: Math.PI / 2, color: STEEL }, 6)),
];

/** Kondor II (Projekt 89.2), the Volksmarine's coastal minesweeper: 56.7 × 7.8 m — the high forecastle running back past
 *  the bridge, the superstructure with the mast and the squat funnel, three twin 25 mm (one forward, two aft), the long
 *  low quarterdeck with the sweep winch, the cable reels, the stern gallows and the floats. */
export const buildKondor = craft(() => {
  const L = 56.7, B = 7.8, fb = 2.4, fc = 1.8, z0 = L / 2 - L * 0.22;
  const fixed = merge([
    ...hull(L, B, fb, 2.2, GREY, false, fc),
    box(B * 0.97, fc, z0 + 8, { y: fb + fc / 2, z: (z0 - 8) / 2, color: GREY }),     // the forecastle deck, back past the bridge
    box(B * 0.9, 0.08, z0 + 8, { y: fb + fc + 0.04, z: (z0 - 8) / 2, color: DECK, surf: 'deck' }),
    box(B * 0.7, 2.4, 13, { y: fb + fc + 1.2, z: 2, color: GREY }),                 // the superstructure
    ...bridge(fb + fc + 2.4, 5.5, 5, 2.6, 4.5),
    ...mast(0, fb + fc + 5, 4, 8, 3.4),
    cyl(0.8, 1, 2.2, { y: fb + fc + 3.4, z: -2.5, color: DARK }),                   // the funnel
    ...light(0, fb + fc, 15), ...light(0, fb + fc + 2.4, -3.9, true), ...light(0, fb + fc, -6.6, true),
    box(2.6, 1.3, 2.4, { y: fb + 0.65, z: -L / 2 + 10, color: DARK }),               // the sweep winch
    ...[-1, 1].map((s) => cyl(0.65, 0.65, 0.9, { x: s * 2.5, y: fb + 0.75, z: -L / 2 + 14, rz: Math.PI / 2, color: STEEL }, 10)), // the cable reels
    ...[-1, 1].map((s) => box(0.25, 3, 0.25, { x: s * 2.4, y: fb + 1.5, z: -L / 2 + 1.4, color: STEEL })), box(5, 0.25, 0.25, { y: fb + 3, z: -L / 2 + 1.4, color: STEEL }), // the gallows
    ...[-1, 1].map((s) => cyl(0.35, 0.35, 2.2, { x: s * 2.3, y: fb + 0.4, z: -L / 2 + 5, rx: Math.PI / 2, color: FLOAT }, 8)), // the floats
  ]);
  return { fixed, ramp: null, hinge: [0, 0], gunAt: [fb + fc + 1, 15] };
});

/** Yukto I, the KPA navy's small wooden minesweeper: 24 × 4.4 m — a low hull, the wheelhouse forward of amidships with its
 *  pole mast, a 37 mm forward, a twin 14.5 mm aft, the sweep reel and a float on the stern. */
export const buildYukto = craft(() => {
  const L = 24, B = 4.4, fb = 1.5;
  const fixed = merge([
    ...hull(L, B, fb, 1.1, GREY, false, 0.4),
    box(2.8, 1.5, 5, { y: fb + 0.75, z: 1.2, color: GREY }),                        // the deckhouse
    box(2.4, 1.2, 2.4, { y: fb + 2.1, z: 2.4, color: GREY }),                       // the wheelhouse on it…
    box(2.45, 0.45, 0.08, { y: fb + 2.3, z: 3.62, color: GLASS }), ...[-1, 1].map((s) => box(0.06, 0.4, 1.6, { x: s * 1.22, y: fb + 2.3, z: 2.6, color: GLASS })), // …its windows
    ...mast(0, fb + 2.7, 1.8, 4, 1.8),
    cyl(0.22, 0.26, 1.2, { y: fb + 2.1, z: -0.6, color: DARK }, 8),                 // the exhaust
    // the 37 mm on the foredeck: the pedestal, the shield, the long barrel
    cyl(0.35, 0.45, 0.6, { y: fb + 0.3, z: 6, color: GREY }, 10),
    box(1.1, 0.8, 0.08, { y: fb + 1, z: 6.35, rx: -0.15, color: GREY }), ...[-1, 1].map((s) => box(0.06, 0.7, 0.6, { x: s * 0.55, y: fb + 0.95, z: 6.1, color: GREY })),
    cyl(0.05, 0.07, 2.6, { y: fb + 1.0, z: 6.4 + 1.3, rx: Math.PI / 2, color: STEEL }, 6),
    ...light(0, fb, -4.5, true, 1.4),
    cyl(0.5, 0.5, 1.4, { y: fb + 0.6, z: -8.3, rz: Math.PI / 2, color: STEEL }, 10),  // the sweep reel
    cyl(0.28, 0.28, 1.6, { x: 1.2, y: fb + 0.35, z: -10.4, rx: Math.PI / 2, color: FLOAT }, 8), // a float
  ]);
  return { fixed, ramp: null, hinge: [0, 0], gunAt: [fb + 1, 7] };
});

/** Kong Bang, the KPA's assault hovercraft: 21 × 8.4 m — the skirt, the troop cabin with its rows of windows, the
 *  wheelhouse on top with a twin 14.5 mm, two ducted propellers on pylons aft with the rudders behind, a small bow ramp. */
export const buildKongBang = craft(() => {
  const L = 21, B = 8.4, h = 1.8;
  const fixed = merge([
    box(B, 1.3, L, { y: 0.45, color: BLACK }),                                       // the skirt
    box(B - 0.8, 0.8, L - 1.4, { y: 1.5, color: GREY }),                           // the buoyancy hull
    box(B - 3, 2.1, L - 8, { y: h + 1.05, z: 1.2, color: GREY }),                  // the troop cabin
    ...[-1, 1].flatMap((s) => [-2, -0.4, 1.2, 2.8, 4.4].map((z) => box(0.06, 0.45, 0.9, { x: s * (B / 2 - 1.47), y: h + 1.4, z, color: GLASS }))),
    box(2.8, 1.2, 2.6, { y: h + 2.7, z: 4.4, color: GREY }),                       // the wheelhouse
    box(2.85, 0.45, 0.08, { y: h + 2.9, z: 5.73, color: GLASS }),
    ...light(0, h + 3.3, 4, false, 1.2),
    cyl(0.06, 0.06, 2.4, { x: -1, y: h + 4.5, z: 3.6, color: DARK }, 5),           // the whip aerial
    ...[-1, 1].flatMap((s) => [
      box(0.5, 2.6, 1, { x: s * 2.2, y: h + 1.3, z: -L / 2 + 2.6, color: GREY }),    // the pylons
      cyl(1.55, 1.55, 0.9, { x: s * 2.2, y: h + 3.1, z: -L / 2 + 2.2, rx: Math.PI / 2, color: GREY }, 16), // the ducts…
      cyl(1.4, 1.4, 0.95, { x: s * 2.2, y: h + 3.1, z: -L / 2 + 2.2, rx: Math.PI / 2, color: BLACK }, 16), // …their throats
      box(0.08, 2.4, 0.8, { x: s * 2.2, y: h + 3.1, z: -L / 2 + 1.1, color: DARK }), // the rudders
    ]),
  ]);
  const ramp = merge([box(B * 0.4, 1.8, 0.2, { y: 0.9, color: STEEL, surf: 'metal' })]);
  return { fixed, ramp, hinge: [1.1, L / 2 - 0.3], gunAt: [h + 4.1, 5] };
});

/** Hantae, the KPA navy's medium landing ship: 48 × 6.6 m — the blunt bow with its doors and ramp, the open tank deck
 *  under its hatches, the bridge block aft with the funnel and mast, four twin 25 mm round the bridge. */
export const buildHantae = craft(() => {
  const L = 48, B = 6.6, fb = 2.6;
  const fixed = merge([
    ...hull(L, B, fb, 1.6, GREY, true, 0.8),
    ...bridge(fb, -16.5, 5, 3.4, 8), ...bridge(fb + 3.4, -15.5, 3.6, 2, 4.4),
    ...mast(0, fb + 5.4, -14.5, 5, 2.8),
    cyl(0.6, 0.7, 2, { x: 1.2, y: fb + 4.4, z: -19, color: DARK }, 8),            // the funnel
    box(B - 1.6, 0.3, 22, { y: fb + 0.15, z: 4, color: DARK }),                    // the tank deck's hatches
    ...[-1, 1].map((s) => box(0.15, 0.5, 22, { x: s * (B / 2 - 0.8), y: fb + 0.25, z: 4, color: GREY })), // their coamings
    ...light(-1.6, fb, -10.3), ...light(1.6, fb, -10.3), ...light(0, fb + 3.4, -20.2, true), ...light(0, fb, -22.4, true),
  ]);
  const ramp = merge([box(B * 0.55, 2.6, 0.22, { y: 1.3, color: STEEL, surf: 'metal' })]);
  return { fixed, ramp, hinge: [0.4, L / 2 - 1], gunAt: [fb + 0.9, -10] };
});

// ---------------------------------------------------------------- the swimmers

const OLIVE = 0x4a5636;
const OLIVE_DK = 0x37422a;

/** PT-76: the long flat boat hull with its water-jet ports at the stern, six big road wheels, the
 *  flat-sided round turret with the 76 mm D-56T and its slotted muzzle brake. */
export const buildPT76 = vehicle(() => {
  const g = tracked({ halfWidth: 1.4, length: 5.6, wheels: 6, wheelR: 0.36, sprocket: -1, rollers: 0, trackWidth: 0.36, wheelColor: OLIVE_DK });
  return {
    wheels: g.wheels,
    hull: grime(merge([
      ...g.parts,
      trackedHull([[-3.8, 1.5, 0.5], [-3.6, 1.55, 0.45], [1.6, 1.6, 0.45], [3.2, 1.2, 0.55], [3.85, 0.85, 0.75]],
        { belly: 1.25, fender: 1.6, fenderY: 1.0, chamfer: 0.1 }, { color: OLIVE }),
      P.box(1.9, 0.06, 0.5, { y: 1.3, z: 3.1, rx: -0.6, color: OLIVE_DK }),                                // the trim vane, folded on the glacis
      ...[-1, 1].map((s) => P.cyl(0.2, 0.2, 0.08, { x: s * 0.6, y: 0.75, z: -3.8, rx: Math.PI / 2, color: 0x1f201c }, 12)), // water-jet ports
      P.box(1.6, 0.05, 1.6, { y: 1.57, z: -2.5, color: OLIVE_DK }),                                        // engine deck
      P.box(0.5, 0.06, 0.45, { x: -0.5, y: 1.62, z: 2.2, color: OLIVE_DK }),                               // driver's hatch
    ]), 1.1, 0.3),
    turret: {
      geo: grime(merge([
        castTurret([[1.1, 0.75, 0.35], [0.9, 0.95, 0.58], [0.3, 1.0, 0.62], [-0.5, 0.98, 0.6], [-1.0, 0.85, 0.5], [-1.15, 0.6, 0.3]], { color: OLIVE }, 2.2),
        P.cyl(0.32, 0.34, 0.16, { x: -0.4, y: 0.66, z: -0.2, color: OLIVE_DK }, 14),                        // the big commander's hatch
        P.box(0.5, 0.3, 0.25, { y: 0.3, z: 1.15, color: OLIVE }),                                           // mantlet
      ]), 0.6, 0, 0.4),
      at: [0, 1.6, 0.6],
    },
    gun: {
      geo: merge([
        P.cyl(0.06, 0.07, 3.4, { z: 1.7, rx: Math.PI / 2, color: OLIVE }, 12),
        P.cyl(0.1, 0.1, 0.35, { z: 3.4, rx: Math.PI / 2, color: OLIVE_DK }, 12),                             // muzzle brake
      ]),
      at: [0, 0.3, 1.2],
      pitch: 0,
    },
    muzzle: [0, 0, 3.6],
    recoil: 0.25,
    marks: merge([...[-1, 1].map((s) => P.box(0.02, 0.22, 0.55, { x: s * 1.42, y: 1.35, z: 0 }))]),
  };
});

const FLAT = { terrain: { normalAt: (x, z, n) => n.set(0, 1, 0) } }; // (afloat: level)

/** An amphibious vehicle afloat (systems/Landing.js, a map's `landing.swim`): its own model, low in the water. */
export function afloat(build, sink) {
  return (mats) => {
    const rig = build(mats);
    const root = new THREE.Group();
    rig.root.position.y = -sink;
    root.add(rig.root);
    return { ...rig, root, animate: (u, dt, t) => rig.animate?.({ ...u, vel: { x: 0, z: 0 }, recoil: u.recoil ?? 0, turretYaw: u.turretYaw ?? u.yaw }, dt, t, FLAT) };
  };
}

// ---------------------------------------------------------------- 2027: the Baltic Fleet's landing ships (Gotland)

/** Ropucha (Project 775): 112 × 15 m — the long high-sided tank landing ship, bow doors and ramp, the big block aft. */
export const buildRopuchaL = craft(() => {
  const L = 112, B = 15, fb = 5;
  const fixed = merge([
    ...hull(L, B, fb, 3.4, GREY, true, 1.5),
    ...bridge(fb, -24, 12, 7, 24), ...bridge(fb + 7, -20, 9, 3.2, 12),         // the superstructure, the bridge on it
    box(10, 3, 8, { y: fb + 4.5, z: -40, color: GREY }),                        // the after deckhouse
    ...mast(0, fb + 10.2, -16, 10),
    cyl(1.4, 1.6, 4, { x: 3.5, y: fb + 9, z: -30, color: DARK }), cyl(1.4, 1.6, 4, { x: -3.5, y: fb + 9, z: -30, color: DARK }), // the twin funnels
    ...twin(0, fb + 7, -9.6, 1.3, 3.4), ...twin(0, fb + 3, -43, 1.3, 3.4, true), // twin 57 mm fore and aft of the block
    box(B - 2, 0.3, 50, { y: fb + 0.2, z: 18, color: DARK }),                   // the tank deck's hatch covers
    ...[-1, 1].map((s) => box(1.8, 1.4, 3, { x: s * 3, y: fb + 2.2, z: L / 2 - 13, color: STEEL })), // the Grad-M launchers on the forecastle
  ]);
  const ramp = merge([box(B * 0.45, 5, 0.3, { y: 2.5, color: STEEL, surf: 'metal' })]);
  return { fixed, ramp, hinge: [0.7, L / 2 - 1.5], gunAt: [fb + 8, -8] };
});

/** Zubr (Project 12322): 57 × 25.6 m — the biggest hovercraft afloat: the vehicle deck down the middle between two long
 *  side houses, the bridge across the front, three huge ducted propellers on pylons aft, the blower intakes on top. */
export const buildZubr = craft(() => {
  const L = 57, B = 25.6, h = 2.4;
  const fixed = merge([
    box(B, 1.8, L, { y: 0.6, color: BLACK }),                                    // the skirt
    box(B - 1, 1.3, L - 2, { y: 2.1, color: GREY }),                            // the buoyancy hull
    ...[-1, 1].flatMap((s) => [
      box(6, 5, L - 12, { x: s * 8.8, y: h + 3.3, z: -2, color: GREY }),         // the side houses: crew, engines, troops
      ...[-14, 0, 14].map((z) => cyl(1.6, 1.6, 0.4, { x: s * 8.8, y: h + 5.9, z, color: DARK }, 14)), // the blowers' intakes
    ]),
    box(11.6, 0.2, L - 10, { y: h + 0.9, z: 0, color: DECK, surf: 'deck' }),    // the vehicle deck
    ...bridge(h + 5.8, 14, 17.6, 2.6, 5),                                       // the bridge across the front, on the houses
    ...[-1, 0, 1].flatMap((k) => [
      box(1, 8, 2.4, { x: k * 8, y: h + 8, z: -L / 2 + 6, color: GREY }),         // the pylons
      cyl(2.9, 2.9, 1.6, { x: k * 8, y: h + 10, z: -L / 2 + 5.5, rx: Math.PI / 2, color: DARK }, 16), // the propeller ducts
      cyl(2.6, 2.6, 0.1, { x: k * 8, y: h + 10, z: -L / 2 + 6.32, rx: Math.PI / 2, color: BLACK }, 16),
    ]),
    ...twin(-8.8, h + 5.8, 6, 0.9, 2), ...twin(8.8, h + 5.8, 6, 0.9, 2),        // the AK-630s on the houses
  ]);
  const ramp = merge([box(11, 3.2, 0.25, { y: 1.6, color: STEEL, surf: 'metal' })]);
  return { fixed, ramp, hinge: [h + 0.9, L / 2 - 0.5], gunAt: [h + 6.4, 6] };
});

/** Alexandrit (Project 12700): 62 × 10 m minesweeper with a fibreglass hull — the long high superstructure forward with the
 *  enclosed mast on it, the 30 mm on the bow, the open quarterdeck aft with the sweep gear and the crane for the mine drones. */
export const buildAlexandrit = craft(() => {
  const L = 62, B = 10.2, fb = 3.6;
  const fixed = merge([
    ...hull(L, B, fb, 2.6),
    box(B * 0.86, 3, 26, { y: fb + 1.5, z: 5, color: GREY }),                      // the superstructure, a deck high
    ...bridge(fb + 3, 13, 7.4, 3, 7),
    box(2.6, 6, 2.6, { y: fb + 9, z: 8, color: GREY }), ...mast(0, fb + 12, 8, 5, 3), // the enclosed mast, a pole on it
    cyl(0.9, 1.1, 2.4, { y: fb + 4.2, z: -4, color: DARK }),                       // the funnel
    ...twin(0, fb, 22, 0.8, 2),                                                    // the AK-306 on the bow
    box(3, 1.4, 2.4, { y: fb + 0.7, z: -L / 2 + 9, color: DARK }),                  // the sweep winch
    box(0.4, 5, 0.4, { x: 3.2, y: fb + 2.5, z: -L / 2 + 13, color: STEEL }), box(0.3, 0.3, 6, { x: 3.2, y: fb + 5, z: -L / 2 + 10.5, rx: 0.4, color: STEEL }), // the crane
    box(1.2, 0.9, 3.4, { x: -2.6, y: fb + 0.45, z: -L / 2 + 12, color: 0xe0a020 }),  // a mine-hunting drone in its cradle
    ...[-1, 1].map((s) => cyl(0.4, 0.4, 2.6, { x: s * 2.6, y: fb + 0.5, z: -L / 2 + 3, rx: Math.PI / 2, color: 0xb84a2a }, 8)), // the floats
  ]);
  return { fixed, ramp: null, hinge: [0, 0], gunAt: [fb + 1, 22] };
});

// ---------------------------------------------------------------- NATO's 1985 boats (the landings: Wismar, Nampo …)
//   LCU-1610   US Navy utility landing craft, 41 m: the open well between the wing walls, bow ramp and stern gate
//              (drive-through), the deckhouse and pilothouse on the starboard wing, haze grey, her number on the bows
//   Type 520   Bundesmarine landing craft (Barbe class), 40 m: the same well but the stern closed, the deckhouse and
//              bridge across it, two 20 mm on the corners, the lighter German grey and a black pennant number
//   Type 521   Bundesmarine LCM, 24 m: a small open well, the ramp, the wheelhouse on the raised stern
//   Aggressive US Navy ocean minesweeper (MSO), 52 m of wood: the deckhouse and the tall mast forward, 40 mm on
//              the bow, the big open sweep deck aft with the cable reel, the gallows and the floats
//   Lindau     Bundesmarine coastal minesweeper (Type 320/331), 47 m of wood: the bridge forward, the raked funnel,
//              40 mm on the foredeck, the sweep gear aft
const USG = 0x7f868c, US_DECK = 0x4c5156, BMG = 0x858c91, BM_DECK = 0x55595d, WHITE = 0xe8e8e0, NATO_FLOAT = 0xd0502a;
/** A number on both sides at the deck edge `x` out (white on the US Navy, black on the Bundesmarine), read bow-to-stern from either side. */
const sideNumber = (text, x, y0, z0, h, color) => [-1, 1].flatMap((s) => KIT.numerals(text, h, (u, v, du, dv) => box(0.06, dv, du, { x: s * (x + 0.03), y: y0 + v, z: s > 0 ? z0 - u : z0 + u - text.length * h * 0.83, color })));
/** A single 40 mm Bofors on its open mount, the shield, the barrel up a little. */
const bofors = (x, y, z, c) => [cyl(0.6, 0.7, 0.5, { x, y: y + 0.25, z, color: c }, 10), box(1.4, 1, 1.1, { x, y: y + 1, z, color: c }), cyl(0.07, 0.09, 2.8, { x, y: y + 1.2, z: z + 1.8, rx: Math.PI / 2 - 0.15, color: STEEL }, 6)];
/** A light gun (20 mm, .50) on a pedestal. */
const pintle = (x, y, z, c) => [cyl(0.14, 0.2, 1, { x, y: y + 0.5, z, color: c }, 6), box(0.5, 0.4, 0.8, { x, y: y + 1.1, z, color: c }), cyl(0.04, 0.05, 1.5, { x, y: y + 1.2, z: z + 1, rx: Math.PI / 2 - 0.2, color: BLACK }, 5)];
/** An open ramped craft's hull: the flat bottom, the wing walls, the well deck; `gate`: a stern gate (drive-through). Walls' top at fb + 0.8. */
function wellCraft(L, B, fb, c, deck, gate = false, t = 0.7) {
  const wall = fb + 0.8;
  return [
    box(B, 0.9, L - 0.6, { y: 0.45, z: -0.3, color: c }),
    box(B * 1.01, 0.3, L - 0.6, { y: 0.05, z: -0.3, color: BLACK }),                                   // the boot topping
    ...[-1, 1].map((s) => box(t, wall, L - 0.6, { x: s * (B / 2 - t / 2), y: wall / 2, z: -0.3, color: c })),
    box(B - t * 2, 0.12, L - 1.2, { y: 0.92, z: -0.3, color: deck, surf: 'deck' }),
    ...[-1, 1].flatMap((s) => [L / 2 - 3, 0, -L / 2 + 3].map((z) => cyl(0.18, 0.2, 0.45, { x: s * (B / 2 - t / 2), y: wall + 0.22, z, color: STEEL }, 8))), // bollards
    ...(gate ? [box(B - t * 2, wall - 0.9, 0.25, { y: 0.9 + (wall - 0.9) / 2, z: -L / 2 + 0.15, color: DARK })] : []),
  ];
}
const wellRamp = (B, wall, t) => merge([box(B - t * 2 - 0.2, wall - 0.6, 0.25, { y: (wall - 0.6) / 2, color: STEEL, surf: 'metal' }), ...[0.25, 0.5, 0.75].map((k) => box(B - t * 2 - 0.3, 0.08, 0.15, { y: (wall - 0.6) * k, z: -0.15, color: DARK, surf: 'metal' }))]);

/** LCU-1610: 41 × 9 m. */
export const buildLCU1610 = craft(() => {
  const L = 41, B = 9, fb = 2.4, wall = fb + 0.8, sx = -(B / 2 - 1.4); // (starboard: -x)
  const fixed = merge([
    ...wellCraft(L, B, fb, USG, US_DECK, true),
    box(2.8, wall + 1.7, 13, { x: sx, y: 0.9 + (wall + 1.7) / 2, z: -L / 2 + 7.5, color: USG }),     // the deckhouse on the starboard wing
    box(2.6, 2.2, 4, { x: sx, y: wall + 2.6 + 1.1, z: -L / 2 + 4.5, color: USG }),                    // the pilothouse
    box(2.65, 0.6, 0.1, { x: sx, y: wall + 4, z: -L / 2 + 6.55, color: GLASS }),
    ...[-1, 1].map((s) => box(0.1, 0.6, 2.4, { x: sx + s * 1.33, y: wall + 4, z: -L / 2 + 5, color: GLASS })),
    cyl(0.08, 0.1, 4, { x: sx, y: wall + 6.8, z: -L / 2 + 4, color: DARK }, 6), box(2, 0.2, 0.3, { x: sx, y: wall + 7.4, z: -L / 2 + 4.3, color: DARK }), // the mast, the radar
    ...pintle(sx + 0.8, wall + 2.6, -L / 2 + 10, USG), ...pintle(sx - 0.8, wall + 2.6, -L / 2 + 12, USG), // the .50s
    ...[0, 1].map((k) => cyl(0.25, 0.25, 1.8, { x: B / 2 - 0.35, y: wall + 0.9, z: -L / 2 + 2 + k * 0.9, color: BLACK }, 8)), // the exhausts, on the port wall
    box(0.9, 0.9, 6, { x: B / 2 - 0.9, y: wall + 0.2, z: -L / 2 + 5, color: USG }),                  // the port wing's lockers
    ...sideNumber('1614', B / 2, wall - 1.8, L / 2 - 3, 1.2, WHITE),
  ]);
  return { fixed, ramp: wellRamp(B, wall, 0.7), hinge: [0.8, L / 2 - 0.6], gunAt: [wall + 3.8, -L / 2 + 11] };
});

/** Type 520 (Barbe class): 40 × 8.8 m. */
export const buildType520 = craft(() => {
  const L = 40, B = 8.8, fb = 2.4, wall = fb + 0.8, zs = -L / 2 + 3.5;
  const fixed = merge([
    ...wellCraft(L, B, fb, BMG, BM_DECK),
    box(B, wall, 7, { y: wall / 2, z: -L / 2 + 3.5, color: BMG }),                                    // the closed stern
    box(6.2, 2.4, 6, { y: wall + 1.2, z: zs, color: BMG }),                                          // the deckhouse across it
    ...bridge(wall + 2.4, zs + 0.6, 4.4, 2.2, 3.6, BMG),
    ...mast(0, wall + 4.6, zs - 0.4, 5, 3),
    ...[-1, 1].flatMap((s) => [...pintle(s * 3.5, wall, -L / 2 + 6.4, BMG), cyl(0.28, 0.28, 2, { x: s * 2.4, y: wall + 1, z: -L / 2 + 0.8, color: BLACK }, 8)]), // the 20 mm, the exhausts
    ...sideNumber('760', B / 2, wall - 1.8, L / 2 - 3, 1.2, BLACK),
  ]);
  return { fixed, ramp: wellRamp(B, wall, 0.7), hinge: [0.8, L / 2 - 0.6], gunAt: [wall + 1.3, -L / 2 + 7] };
});

/** LCM Type 521: 23.6 × 6.4 m. */
export const buildLCM521 = craft(() => {
  const L = 23.6, B = 6.4, fb = 1.6, wall = fb + 0.8;
  const fixed = merge([
    ...wellCraft(L, B, fb, BMG, BM_DECK, false, 0.5),
    box(B, wall + 0.3, 5, { y: (wall + 0.3) / 2, z: -L / 2 + 2.5, color: BMG }),                     // the raised stern
    box(2.4, 1.9, 2.2, { y: wall + 0.3 + 0.95, z: -L / 2 + 2.4, color: BMG }),                      // the wheelhouse
    box(2.45, 0.5, 0.1, { y: wall + 1.7, z: -L / 2 + 3.52, color: GLASS }),
    cyl(0.05, 0.06, 2.4, { y: wall + 3.4, z: -L / 2 + 2, color: DARK }, 5),
    ...[-1, 1].map((s) => cyl(0.16, 0.16, 1.4, { x: s * 2.4, y: wall + 0.9, z: -L / 2 + 0.8, color: BLACK }, 6)),
    ...sideNumber('12', B / 2, wall - 1.4, L / 2 - 2, 0.9, BLACK),
  ]);
  return { fixed, ramp: wellRamp(B, wall, 0.5), hinge: [0.7, L / 2 - 0.5], gunAt: [wall + 1.5, -L / 2 + 4] };
});

/** The sweep deck aft: the cable reel, the winch, the gallows over the stern, the floats, the otter boards. */
const sweepDeck = (L, B, fb, c) => [
  cyl(1.1, 1.1, B * 0.4, { y: fb + 1.2, z: -L / 2 + 11, rz: Math.PI / 2, color: DARK }, 14),
  ...[-1, 1].map((s) => box(0.3, 1.6, 2.4, { x: s * B * 0.22, y: fb + 0.8, z: -L / 2 + 11, color: c })),
  box(2.4, 1.2, 2, { y: fb + 0.6, z: -L / 2 + 14, color: STEEL }),
  ...[-1, 1].map((s) => box(0.3, 4.2, 0.3, { x: s * B * 0.3, y: fb + 2.1, z: -L / 2 + 1.4, color: c })), box(B * 0.6 + 0.3, 0.3, 0.3, { y: fb + 4.2, z: -L / 2 + 1.4, color: c }), // the gallows
  ...[-1, 1].map((s) => cyl(0.45, 0.45, 2.6, { x: s * (B / 2 - 1), y: fb + 0.5, z: -L / 2 + 5, rx: Math.PI / 2, color: NATO_FLOAT }, 8)),
  ...[-1, 1].map((s) => box(0.4, 0.8, 1.6, { x: s * (B / 2 - 1), y: fb + 0.4, z: -L / 2 + 8, color: 0x3a3a34 })),
];

/** Aggressive-class MSO: 52 × 10.9 m. */
export const buildAggressive = craft(() => {
  const L = 52, B = 10.9, fb = 3.4;
  const fixed = merge([
    ...hull(L, B, fb, 3.2, USG, false, 0, BLACK),
    box(B * 0.72, 2.6, 18, { y: fb + 1.3, z: 6, color: USG }),
    ...bridge(fb + 2.6, 12, 6.4, 2.8, 5, USG),
    ...mast(0, fb + 5.4, 10, 11, 5),
    cyl(1.1, 1.3, 4, { y: fb + 4.6, z: 0, color: USG }), cyl(1.12, 1.12, 0.6, { y: fb + 6.4, z: 0, color: BLACK }), // the funnel
    box(0.3, 5, 0.3, { x: -3.4, y: fb + 2.5, z: -4.5, color: STEEL }), box(0.25, 0.25, 6, { x: -3.4, y: fb + 5, z: -7.2, rx: 0.5, color: STEEL }), // the boom
    ...bofors(0, fb + 0.35, 19, USG),
    ...sweepDeck(L, B, fb, USG),
    ...sideNumber('488', B / 2, fb - 2.2, L * 0.28 - 2, 1.5, WHITE),
  ]);
  return { fixed, ramp: null, hinge: [0, 0], gunAt: [fb + 1.6, 21] };
});

/** Lindau-class minesweeper: 47.5 × 8.3 m. */
export const buildLindau = craft(() => {
  const L = 47.5, B = 8.3, fb = 3;
  const fixed = merge([
    ...hull(L, B, fb, 2.6, BMG, false, 0, BLACK),
    box(B * 0.74, 2.4, 14, { y: fb + 1.2, z: 2, color: BMG }),
    ...bridge(fb + 2.4, 6.5, 5.6, 2.6, 5, BMG),
    ...mast(0, fb + 5, 5, 8, 4),
    cyl(0.75, 0.95, 4.4, { y: fb + 4.4, z: -3.2, rx: -0.18, color: BMG }), cyl(0.78, 0.78, 0.6, { y: fb + 6.5, z: -3.6, rx: -0.18, color: BLACK }), // the raked funnel
    ...bofors(0, fb, 12.5, BMG),
    ...sweepDeck(L, B, fb, BMG),
    ...sideNumber('1072', B / 2, fb - 1.9, L * 0.28 - 2, 1.2, BLACK),
  ]);
  return { fixed, ramp: null, hinge: [0, 0], gunAt: [fb + 1.3, 14.5] };
});
