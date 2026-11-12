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
import { trackedHull, castTurret } from './vehicleCommon.js';
import { vehicle, tracked } from './support.js';
import { craft } from './landingCraft45.js';

const GREY = 0x8c969c;
const DARK = 0x5a6268;
const DECK = 0x6c6a62;
const STEEL = 0x4c5458;
const BLACK = 0x1c1e20;
const GLASS = 0x2a3a44;
const RED = 0x7a2a22;

const box = (w, h, d, o) => P.box(w, h, d, { surf: 'plate', ...o });
const cyl = (rt, rb, h, o, n = 10) => P.cyl(rt, rb, h, { surf: 'plate', ...o }, n);

/** A hull: a box tapering to the bow (`bowK` of its length), the boot topping at the waterline. */
function hull(L, B, fb, draft, c = GREY) {
  const bowL = L * 0.22;
  return [
    box(B, fb + draft, L - bowL, { y: (fb - draft) / 2, z: -bowL / 2, color: c }),
    box(B * 0.62, fb + draft, bowL * 0.6, { y: (fb - draft) / 2, z: L / 2 - bowL * 0.55, color: c }),
    box(B * 0.3, fb + draft * 0.6, bowL * 0.3, { y: (fb - draft * 0.6) / 2, z: L / 2 - bowL * 0.12, color: c }),
    box(B * 1.01, 0.4, L - bowL, { y: -0.1, z: -bowL / 2, color: RED }),
    box(B - 0.4, 0.1, L - bowL - 1, { y: fb + 0.05, z: -bowL / 2, color: DECK, surf: 'deck' }),
  ];
}
/** A twin gun turret (AK-230 / AK-725 style): a squat round house, two barrels. */
const twin = (x, y, z, r = 1.1, len = 2.6, aft = false) => [
  cyl(r, r * 1.05, r * 0.9, { x, y: y + r * 0.45, z, color: GREY }, 12),
  ...[-0.22, 0.22].map((dx) => cyl(0.06 * r * 1.6, 0.08 * r * 1.6, len, { x: x + dx * r, y: y + r * 0.6, z: z + (aft ? -1 : 1) * (len / 2 + r * 0.6), rx: Math.PI / 2, color: STEEL }, 6)),
];
const mast = (x, y, z, h, yard = 4) => [cyl(0.12, 0.18, h, { x, y: y + h / 2, z, color: DARK }, 6), box(yard, 0.12, 0.12, { x, y: y + h * 0.75, z, color: DARK }), box(1.4, 0.5, 0.4, { x, y: y + h + 0.2, z, color: DARK })];
const bridge = (y, z, w, h, d) => [box(w, h, d, { y: y + h / 2, z, color: GREY }), box(w + 0.05, 0.6, 0.12, { y: y + h - 0.6, z: z + d / 2 + 0.03, color: GLASS })];

/** Frosch I: 98 × 11 m. */
export const buildFrosch = craft(() => {
  const L = 98, B = 11, fb = 4.5;
  const fixed = merge([
    ...hull(L, B, fb, 2.8),
    box(B * 0.66, 3, 14, { y: fb + 1.5, z: L / 2 - 14, color: GREY }),         // the high bow
    ...bridge(fb, -26, 9, 7, 16), ...bridge(fb + 7, -24, 6, 3, 8),
    cyl(1.2, 1.4, 5, { y: fb + 9, z: -32, color: DARK }),                        // the funnel
    ...mast(0, fb + 10, -20, 9),
    ...twin(0, fb + 3, L / 2 - 22, 1.4, 3.6), ...twin(0, fb + 7, -36, 1.1, 2.6, true),
    box(B - 1.2, 0.3, 40, { y: fb + 0.2, z: 8, color: DARK }),                  // the tank deck's hatch covers
  ]);
  const ramp = merge([box(B * 0.5, 4.5, 0.3, { y: 2.25, color: STEEL, surf: 'metal' })]);
  return { fixed, ramp, hinge: [0.6, L / 2 - 1.5], gunAt: [fb + 4, L / 2 - 20] };
});

/** Polnocny: 73 × 8.6 m. */
export const buildPolnocny = craft(() => {
  const L = 73, B = 8.6, fb = 3.2;
  const fixed = merge([
    ...hull(L, B, fb, 2),
    ...bridge(fb, -24, 7, 5, 12), ...bridge(fb + 5, -22, 5, 2.4, 6),
    ...mast(0, fb + 7.4, -20, 7),
    ...twin(0, fb + 5, -14, 0.9, 2.2), ...twin(0, fb + 5, -30, 0.9, 2.2, true),
    box(B - 2, 0.4, 30, { y: fb + 0.25, z: 8, color: DARK }),                   // the well deck's hatch
    ...[-1, 1].map((s) => box(1.6, 1.4, 2.4, { x: s * 2.4, y: fb + 0.9, z: L / 2 - 14, color: STEEL })), // the rocket launchers
  ]);
  const ramp = merge([box(B * 0.55, 3.4, 0.25, { y: 1.7, color: STEEL, surf: 'metal' })]);
  return { fixed, ramp, hinge: [0.4, L / 2 - 1.2], gunAt: [fb + 5.6, -14] };
});

/** Aist: 47 × 17.8 m. */
export const buildAist = craft(() => {
  const L = 47, B = 17.8, h = 2.2;
  const fixed = merge([
    box(B, 1.6, L, { y: 0.5, color: BLACK }),                                    // the skirt (rubber: plain — 'cloth' is for sails)
    box(B - 1, 1.2, L - 2, { y: 1.9, color: GREY }),                            // the hull on it
    box(B - 6, 3.4, L - 14, { y: h + 2.2, z: -2, color: GREY }),                // the cargo deck's covered hold
    ...bridge(h + 3.9, 10, 7, 3, 6),
    ...[-1, 1].flatMap((s) => [
      box(1.2, 9, 3, { x: s * 5.5, y: h + 6, z: -L / 2 + 6, color: GREY }),     // the pylons
      ...[0, 1].map((k) => cyl(2.4, 2.4, 0.4, { x: s * (5.5 + (k ? 2.8 : -2.8)), y: h + 8.5, z: -L / 2 + 4.5, rx: Math.PI / 2, color: DARK }, 14)), // the propellers' rings
    ]),
    ...twin(-3, h + 5.6, 4, 0.8, 1.8), ...twin(3, h + 5.6, 4, 0.8, 1.8),
  ]);
  const ramp = merge([box(B * 0.45, 3, 0.25, { y: 1.5, color: STEEL, surf: 'metal' })]);
  return { fixed, ramp, hinge: [1.2, L / 2 - 0.5], gunAt: [h + 6, 6] };
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
    ...mast(0, fb + 5.6, 8, 9, 4),
    cyl(1, 1.2, 3, { y: fb + 4, z: -1, color: DARK }),                           // the funnel
    ...twin(0, fb, 22, 0.8, 2), ...twin(0, fb + 2.6, -6, 0.8, 2, true),
    box(3, 1.4, 2.4, { y: fb + 0.7, z: -L / 2 + 8, color: DARK }),                // the sweep winch
    ...[-1, 1].map((s) => cyl(0.4, 0.4, 2.6, { x: s * 2.6, y: fb + 0.5, z: -L / 2 + 3, rx: Math.PI / 2, color: 0xb84a2a }, 8)), // the floats
  ]);
  return { fixed, ramp: null, hinge: [0, 0], gunAt: [fb + 1, 22] };
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
