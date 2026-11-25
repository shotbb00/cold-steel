// 1806 small craft and special ships (data/units1806/smallCraft.js), on the 1806 ship builders (models/ships1806.js):
//   the French invasion flotilla (Boulogne 1803–05)  the prame (a flat three-master with twelve 24-pounders), the bateau
//                        canonnier (a lug-rigged gun vessel: a 24 forward, a field gun aft, sweeps), the péniche (a long
//                        rowing boat under two lugs, a howitzer in her bow)
//   the Royal Navy        the bomb vessel (a ketch, two great mortars forward of her mainmast), the cutter (one huge
//                        gaff mainsail, a running bowsprit), the lugger (three lug sails on a low black hull)
//   the merchantmen       the East Indiaman (her painted ports, the red ensign), the French trois-mâts (the tricolour)
//   the landing boats     the French péniche and chaloupe that row a French landing in (flatboat, horseBoat for `nato`)
// Each floats with y = 0 at the waterline, bow toward +z, as the 1806 ships.
import * as THREE from 'three';
import { P, merge, loft } from '../units/geometry.js';
import { NAVY, shipOfTheLine, sailRig, landingBoat } from './ships1806.js';
import { wheel, buildFieldGun } from './napGuns.js';

const WOOD = 0x6e5236, DECKW = 0x9a8466, SAIL = 0xe6dfcb, IRON = 0x262624, BLACK = 0x1c1a17, TAN = 0xc8b48a; // (a lugger's tanned sails)
const BLUE = 0x1f3a8e, WHITE = 0xeeeeea, RED = 0xc8221e;

// ------------------------------------------------------------------ the colours (y: the flag's middle, z0: its hoist, aft along −z; k: scale)
const tricolour = (y, z0, k = 1) => [BLUE, WHITE, RED].map((color, i) => P.box(0.05, 2.4 * k, 1.33 * k, { y, z: z0 - (0.67 + i * 1.33) * k, color }));
/** The red ensign of a British merchantman: the red field, the Union in the canton. */
const redEnsign = (y, z0, k = 1) => [
  P.box(0.05, 2.4 * k, 4 * k, { y, z: z0 - 2 * k, color: 0xb8221e }),
  P.box(0.07, 1.2 * k, 2 * k, { y: y + 0.6 * k, z: z0 - 1 * k, color: 0x1f2e6e }),
  P.box(0.08, 0.3 * k, 2 * k, { y: y + 0.6 * k, z: z0 - 1 * k, color: WHITE }), P.box(0.08, 1.2 * k, 0.3 * k, { y: y + 0.6 * k, z: z0 - 1 * k, color: WHITE }),
];
/** The Dannebrog of a Danish merchantman: the plain oblong flag, no swallow tail (that is the navy's). */
const dannebrog = (y, z0, k = 1) => [
  P.box(0.05, 2.4 * k, 3.6 * k, { y, z: z0 - 1.8 * k, color: 0xc8102e }),
  P.box(0.07, 2.4 * k, 0.35 * k, { y, z: z0 - 1.25 * k, color: WHITE }), P.box(0.07, 0.35 * k, 3.6 * k, { y, z: z0 - 1.8 * k, color: WHITE }),
];

// the navies' paint for the new hulls (models/ships1806.js NAVY: band, ports, lids, stern; `flag` a builder)
Object.assign(NAVY, {
  frFlotilla: { band: 0xc8a050, port: 0x241812, lid: 0x8e3322, stern: 0x2e4a7a, flag: tricolour, pennant: BLUE },     // (the flotilla: black and yellow ochre)
  indiaman: { band: 0xd8c8a0, port: 0x1c1a17, lid: 0x1c1a17, stern: 0x3a4a5a, flag: redEnsign, pennant: 0xb8221e },  // (the buff band, her ports painted on — and a few real ones)
  merchantFR: { band: 0x8a6a3e, port: 0x241812, lid: 0x241812, stern: 0x5a4a3a, flag: tricolour, pennant: BLUE },
  merchantDK: { band: 0xd6caa4, port: 0x241812, lid: 0x241812, stern: 0x1c1a17, flag: dannebrog, pennant: 0xc8102e },
});

/** `d` (a ship's description) with more parts on her hull. */
const plus = (d, parts) => ({ ...d, fixed: merge([d.fixed, ...parts]) });

// ------------------------------------------------------------------ the lug-rigged boats (the lugger, the bateau canonnier, the péniche)
const halfWidth = (z, len, beam) => { // (as models/ships1806.js: a bluff bow, a full body, a narrower stern)
  const t = z / (len / 2);
  if (t > 0.45) return (beam / 2) * Math.sqrt(Math.max(0.02, 1 - ((t - 0.45) / 0.55) ** 2));
  if (t < -0.6) return (beam / 2) * (0.78 + 0.22 * (1 + (t + 0.6) / 0.4));
  return beam / 2;
};
/**
 * A lug-rigged hull. `o`: { len, beam, fb (her gunwale above the water), hull (colour), band, masts [[z, height, sail width]],
 * guns [[z, facing (0 forward, π aft), radius, length]], ports (a side: small guns along her rail), oars (a side), flag, sail, sprit }.
 */
function lugger(o) {
  const { len, beam, fb, hull = BLACK, band, masts, guns = [], ports = 0, oars = 0, flag, sail = SAIL, sprit = 0 } = o;
  const sec = (k, y, d, e, n = 12) => Array.from({ length: n + 1 }, (_, i) => { const z = -len / 2 + (i / n) * len; return [0, y, z, Math.max(0.15, halfWidth(z, len, beam) * k), d, e]; });
  const parts = [
    loft(sec(1, fb / 2 - 0.4, fb / 2 + 0.9, 2.2), { color: hull, surf: 'plate' }, 10),                       // the hull, to her gunwale
    loft(sec(0.9, fb + 0.02, 0.08, 6), { color: DECKW, surf: 'deck' }, 10),                                  // the deck (an open boat: the thwarts' level)
    ...[-1, 1].map((s) => P.box(0.12, 0.3, len * 0.72, { x: s * beam * 0.47, y: fb + 0.1, color: band })),   // the strake under her rail
    P.box(0.08, fb + 0.8, 1.2, { y: fb / 2 - 0.3, z: -len / 2 - 0.3, color: hull }),                         // the rudder
  ];
  for (const [z, facing, r, l] of guns) { // a gun on its slide, along her middle
    const dir = Math.cos(facing);
    parts.push(P.box(r * 5, r * 2.6, l * 0.75, { y: fb + r * 1.3, z, color: WOOD }), P.cyl(r * 0.85, r, l, { y: fb + r * 3, z: z + dir * l * 0.3, rx: Math.PI / 2, color: IRON }, 8));
  }
  for (const s of [-1, 1]) for (let i = 0; i < ports; i++) { // the small guns over her rail (carronades, 4-pounders)
    const z = -len * 0.3 + (i + 0.5) * (len * 0.6 / ports), hw = halfWidth(z, len, beam);
    parts.push(P.cyl(0.11, 0.14, 1.1, { x: s * (hw + 0.1), y: fb + 0.25, z, rz: Math.PI / 2, color: IRON }, 6));
  }
  if (sprit) parts.push(P.cyl(0.1, 0.16, sprit, { y: fb + 0.6, z: len / 2 + sprit * 0.35, rx: Math.PI / 2 - 0.15, color: WOOD }, 6)); // the bumkin / running bowsprit
  // the lugs: each on its yard slung across the mast, a third of it forward — they swing to leeward like a fore-and-aft sail
  const rig = masts.map(([z, h, w], i) => ({
    at: [0, fb, z], fore: true, mast: i,
    geo: merge([
      P.box(0.07, h * 0.72, w, { y: h * 0.5, z: -w * 0.22, rx: 0.06, color: sail, surf: 'cloth' }),
      P.cyl(0.08, 0.08, w * 1.1, { y: h * 0.88, z: -w * 0.22, rx: Math.PI / 2 - 0.22, color: WOOD }, 5),     // the yard, peaked up aft
    ]),
    spars: merge([P.cyl(0.1 + h * 0.008, 0.14 + h * 0.01, h, { y: fb + h / 2, z, color: WOOD }, 7)]),
  }));
  parts.push(P.cyl(0.04, 0.04, 2.2, { y: fb + 1.1, z: -len / 2 + 0.2, color: WOOD }, 4));
  const d = { fixed: merge(parts), rig, colours: merge(flag(fb + 1.9, -len / 2 + 0.2, 0.42)), len, beam, mastCount: masts.length };
  if (!oars) return d;
  // the sweeps, each pivoting at its thole (sailRig rows them when the wind gives her less)
  const DOWN = 0.4, cs = Math.cos(DOWN), sn = Math.sin(DOWN), L = Math.max(3.6, fb * 2.4 + 2.4);
  const sweep = (s) => merge([
    P.cyl(0.05, 0.05, L, { x: s * cs * L * 0.32, y: -sn * L * 0.32, rz: s * (Math.PI / 2 - DOWN), color: WOOD }, 4),
    P.box(0.05, 0.7, 0.25, { x: s * cs * L * 0.78, y: -sn * L * 0.78, rz: s * (Math.PI / 2 - DOWN), color: WOOD }),
  ]);
  const at = (i) => -len * 0.36 + i * (len * 0.68 / Math.max(1, oars - 1));
  return { ...d, oars: [-1, 1].flatMap((s) => Array.from({ length: oars }, (_, i) => ({ at: [s * halfWidth(at(i), len, beam), fb + 0.15, at(i)], side: s }))), sweep: { [-1]: sweep(-1), [1]: sweep(1) } };
}

// ------------------------------------------------------------------ the French invasion flotilla
/** The prame: flat-bottomed, three short masts, twelve 24-pounders on one deck — a floating battery that can cross the shoals. */
export const buildPrame = sailRig(() => shipOfTheLine({ len: 34, beam: 9.6, fb: 2.9, draft: 1.8, decks: 1, ports: 6, masts: [[10, 25], [0, 28], [-9, 20]], navy: 'frFlotilla' }));
/** The bateau canonnier: two lugs, a 24-pounder forward and a field gun aft on slides, sweeps along her sides. */
export const buildGunVessel = sailRig(() => lugger({ len: 19, beam: 5, fb: 1.3, hull: 0x4a3a2a, band: 0xc8a050, masts: [[3.6, 13, 6], [-4.2, 11, 5]], guns: [[6.5, 0, 0.26, 3], [-7, Math.PI, 0.17, 2]], oars: 6, flag: tricolour, sprit: 3 }));
/** The péniche: a long open boat, two lugs, a howitzer in her bow, eighteen oars — sixty soldiers sit between the rowers. */
export const buildPeniche = sailRig(() => lugger({ len: 18, beam: 3.6, fb: 0.9, hull: 0x5a4632, band: 0x8e3322, masts: [[3.5, 10, 4.5], [-3, 9, 4]], guns: [[7, 0, 0.22, 1.3]], oars: 9, flag: tricolour }));

// ------------------------------------------------------------------ the Royal Navy
/** The bomb vessel: a ketch (no foremast: the space forward is the mortars'), strongly built, two 13-inch mortars on their beds. */
export const buildBombVessel = sailRig(() => {
  const fb = 3.3;
  const mortar = (z, r) => [
    P.cyl(r * 1.9, r * 2.1, 0.6, { y: fb + 0.3, z, color: WOOD }, 12),                     // the bed on its turntable
    P.cyl(r * 0.95, r * 1.15, r * 3.2, { y: fb + 0.6 + r * 1.2, z: z + r * 0.7, rx: 0.7, color: IRON }, 10), // the mortar, laid at 45° forward
    P.cyl(r * 0.6, r * 0.6, 0.05, { y: fb + 0.6 + r * 2.4, z: z + r * 1.8, rx: 0.7, color: 0x080808 }, 10),  // her bore
  ];
  return plus(shipOfTheLine({ len: 32, beam: 9.6, fb, draft: 3.8, decks: 1, ports: 5, masts: [[-2.2, 31], [-10.5, 22]], navy: 'rn' }), [...mortar(4.6, 0.6), ...mortar(1.6, 0.6)]);
});
/** The cutter: one tall mast, the great gaff mainsail and a square topsail, a long running bowsprit. */
export const buildCutter = sailRig(() => shipOfTheLine({ len: 21, beam: 6.8, fb: 2.2, draft: 3, decks: 1, ports: 5, masts: [[1.5, 27]], navy: 'rn' }));
/** The lugger: three lug sails, tanned, on a low black hull; carronades along her rail. */
export const buildLugger = sailRig(() => lugger({ len: 22, beam: 6, fb: 1.8, hull: BLACK, band: 0xc8973a, masts: [[7.5, 18, 7], [0, 20, 8.5], [-8.5, 13, 5]], ports: 4, flag: (y, z0, k) => [P.box(0.05, 2.4 * k, 4 * k, { y, z: z0 - 2 * k, color: 0xe8e8e2 }), P.box(0.06, 2.4 * k, 0.5 * k, { y, z: z0 - 2 * k, color: 0xb8221e }), P.box(0.06, 0.45 * k, 4 * k, { y, z: z0 - 2 * k, color: 0xb8221e }), P.box(0.07, 1.2 * k, 2 * k, { y: y + 0.6 * k, z: z0 - 1 * k, color: 0x1f2e6e })], sail: TAN, sprit: 6 }));

// ------------------------------------------------------------------ the merchantmen
/** The East Indiaman: as big as a frigate, her single tier of ports painted to look like a man-of-war's. */
export const buildIndiaman = sailRig(() => shipOfTheLine({ len: 44, beam: 12.4, fb: 5, draft: 5.4, decks: 1, ports: 12, masts: [[13, 41], [0, 46], [-12, 32]], navy: 'indiaman' }));
/** The French trois-mâts: a merchant ship of Bordeaux or Nantes, a few guns against privateers. */
export const buildMerchantFR = sailRig(() => shipOfTheLine({ len: 36, beam: 10.4, fb: 3.8, draft: 4.6, decks: 1, ports: 4, masts: [[10.5, 34], [0, 38], [-10, 27]], navy: 'merchantFR' }));
export const buildMerchantDK = sailRig(() => shipOfTheLine({ len: 34, beam: 10, fb: 3.6, draft: 4.4, decks: 1, ports: 4, masts: [[10, 32], [0, 36], [-9.5, 25]], navy: 'merchantDK' }));

// ------------------------------------------------------------------ the French landing boats (a French landing: flatboat, horseBoat for `nato`)
const boatFlag = (floor, len) => tricolour(floor + 2.0, -len / 2 + 0.1, 0.42);
/** The flotilla's péniche as a landing boat: the masts struck, the yellow-ochre strake, the tricolour aft. */
export const buildPenicheBoat = sailRig(() => {
  const d = landingBoat({ len: 12, beam: 3, oarsASide: 6, paint: 0xc8a050, flag: boatFlag(0.3, 12) });
  return plus(d, [P.cyl(0.08, 0.1, 9, { x: 0.35, y: 1.05, z: -0.3, rx: Math.PI / 2, color: WOOD }, 5), P.box(0.3, 0.25, 7, { x: 0.35, y: 1.2, z: -0.3, color: SAIL, surf: 'cloth' })]); // (her mast and lug lowered along the thwarts)
});
/** The chaloupe: the big boat for the guns and horses, a 6-pounder in her bow. */
export const buildChaloupeBoat = sailRig(() => {
  const d = landingBoat({ len: 15, beam: 4.4, oarsASide: 8, gun: true, paint: 0x8e3322, flag: boatFlag(0.3, 15) });
  return plus(d, [P.cyl(0.1, 0.12, 11, { x: -0.5, y: 1.05, z: -0.4, rx: Math.PI / 2, color: WOOD }, 5)]);
});

// ------------------------------------------------------------------ Congreve's rockets (ashore: data/units1806/smallCraft.js rocketTroop)
/**
 * The rocket car of the Royal Horse Artillery's rocket troop (1805–06): a light two-wheeled car with the rocket chests,
 * the iron trough laid up on its frame, a rocket in it with its long stick. A `make` for models/napGuns.js buildFieldGun.
 */
function rocketCar(army) {
  const wood = 0x5a6670; // (the Royal Artillery's grey-blue)
  const g = [
    ...wheel(0.55, 0.55, wood), ...wheel(-0.55, 0.55, wood),
    P.cyl(0.04, 0.04, 1.15, { y: 0.55, rz: Math.PI / 2, color: IRON }),
    P.box(0.9, 0.4, 0.7, { y: 0.85, z: -0.1, color: wood }),                          // the rocket chest
    P.box(0.94, 0.05, 0.74, { y: 1.07, z: -0.1, color: 0x3a2a1a }),
    ...[-1, 1].map((s) => P.box(0.06, 0.06, 1.9, { x: s * 0.16, y: 0.4, z: -1.1, rx: -0.22, color: wood })), // the trail
  ];
  const frame = [
    ...[-1, 1].map((s) => P.box(0.04, 0.04, 2.6, { x: s * 0.09, z: 1.1, color: IRON })),  // the trough's rails
    ...Array.from({ length: 5 }, (_, i) => P.box(0.2, 0.03, 0.03, { z: 0.1 + i * 0.5, color: IRON })),
    P.cyl(0.075, 0.075, 0.55, { z: 2.2, rx: Math.PI / 2, color: 0x3a3a36 }, 8),         // the rocket: the iron case…
    P.cone(0.075, 0.22, { z: 2.58, rx: Math.PI / 2, color: 0x3a3a36 }, 8),              // …its cone…
    P.cyl(0.02, 0.02, 2.6, { y: 0.06, z: 0.75, rx: Math.PI / 2, color: 0x9a8058 }, 4),  // …and the guide stick down the trough
  ];
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.1 });
  const mesh = (geo) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
  const group = new THREE.Group();
  group.add(mesh(merge(g)));
  const barrel = new THREE.Group(); // (the trough: buildFieldGun lays it up, `elevate`, and turns it a little)
  barrel.position.set(0, 1.12, -0.3);
  barrel.add(mesh(merge(frame)));
  const muzzle = new THREE.Object3D();
  muzzle.position.z = 2.7;
  barrel.add(muzzle);
  group.add(barrel);
  return { group, barrel, muzzle, trail: 1.9, elevate: 0.55 };
}
/** The rocket troop's car, its team and gunners (models/napGuns.js buildFieldGun). */
export const buildRocketTroop = (army = 'gb') => buildFieldGun({ army, make: rocketCar });
