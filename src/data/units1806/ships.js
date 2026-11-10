// 1806 at sea (the sea maps whose epochs include 1806): the French Navy on the `nato` side, the Royal Navy
// on the `pact` side (Prussia had no fleet: Britain takes her place at sea, as Japan took Germany's in
// 1945). Sailing ships (`stats.sail`: entities/sailing.js) — the wind drives them, and none goes closer to
// it than about 60°. The guns are broadsides: batteries along each side (`mounts`, facing ±π/2 — a deck's
// guns forward and aft, so a broadside ripples down her side), firing roundshot at what bears on that beam.
// Speeds are twice the real ones (a 74 makes 8 knots; the game's 16), the ranges the game's sea scale.
// Ids follow the other eras' ships, so the modes and the AI work: the 74 is `cruiser` (the line of battle).
import { buildSeventyFourRN, buildSeventyFourFR } from '../models/ships1806.js';

const SAIL = {
  naval: true, sail: true, eyeHeight: 40, aimHeight: 5, nightSight: { nato: 0.45, pact: 0.45 }, crew: 0, breakMorale: 0, smoke: undefined, grenades: 0, lightAT: 0,
  fov: 6.3, burst: 1, burstInterval: 0, aimTime: 1, magSize: 9999, reloadTime: 1, antiArmor: true, tracer: 0, esm: false,
};
const BEAM = Math.PI / 2;
/** A battery: a deck's guns on one side, forward or aft half (`at` in the ship's frame, bow +z). */
const battery = (x, y, z, o) => ({ at: [x, y, z], facing: x > 0 ? BEAM : -BEAM, arc: 1.5, spread: 0.022, splash: 2.5, pierce: 0.5, shell: 420, size: 0.7, ...o });
/** Both sides of a two-decker: the lower deck's heavy guns and the upper deck's, each forward and aft. */
const twoDecker = (beam, len, lower, upper) => [-1, 1].flatMap((s) => [
  battery(s * (beam / 2 + 1), 1.6, len * 0.15, lower), battery(s * (beam / 2 + 1), 1.6, -len * 0.15, lower),
  battery(s * (beam / 2 + 1), 3.9, len * 0.15, upper), battery(s * (beam / 2 + 1), 3.9, -len * 0.15, upper),
]);
const ship = (o) => ({
  category: 'naval', kind: 'vehicle', role: 'fighter',
  formation: { count: 1, columns: 1, spacing: 0 },
  weaponSound: 'arty', engine: undefined, tracks: 'wash',
  ...o,
  stats: { ...SAIL, weapon: 'cannon', ...o.stats },
});

const LOWER = { range: 750, reload: 30, damage: 300 };   // 32-pounders (the French 36s)
const UPPER = { range: 650, reload: 26, damage: 190 };   // 18-pounders
const DRILLED = 0.8; // the Royal Navy's gun crews: a broadside in four fifths of the time

export const cruiser = ship({
  fleet: 'line',
  id: 'cruiser', name: 'Ship of the Line (74)', shortName: '74', cost: 700,
  names: {
    nato: ['Redoutable', 'Fougueux', 'Pluton', 'Algésiras', 'Aigle', 'Achille', 'Berwick', 'Neptune', 'Héros', 'Intrépide', 'Scipion', 'Duguay-Trouin', 'Mont-Blanc', 'Swiftsure'],
    pact: ['Bellerophon', 'Colossus', 'Achilles', 'Mars', 'Revenge', 'Leviathan', 'Conqueror', 'Minotaur', 'Spartiate', 'Defence', 'Defiance', 'Thunderer', 'Orion', 'Tonnant'],
  },
  hull: { length: 52, beam: 14.6 },
  stats: { hp: 6000, armor: 0.25, speed: 8.2, accel: 0.05, turnRate: 0.07, turretRate: 1, radius: 9, height: 22, sight: 3000, range: 750, aggroRange: 900, preferredRange: 300, leash: 80, damage: 300, fireCooldown: 30, spread: 0.022, boltSpeed: 420, boltSize: 0.7, splash: 2.5, pierce: 0.5 },
  factionStats: { nato: { hp: 6400, speed: 8.8 } }, // (the French 74: bigger, finer lined — faster)
  mounts: {
    nato: twoDecker(15.2, 55, { ...LOWER, damage: 330 }, UPPER),
    pact: twoDecker(14.6, 52, { ...LOWER, reload: LOWER.reload * DRILLED }, { ...UPPER, reload: UPPER.reload * DRILLED }),
  },
  camera: { distance: 75, height: 26, shoulder: 0 },
  models: { nato: buildSeventyFourFR, pact: buildSeventyFourRN },
  variants: {
    nato: { name: 'Téméraire-class 74', weapon: '28 × 36-pdr, 30 × 18-pdr, 16 × 8-pdr', text: 'The French 74: bigger and faster than the British, with heavy guns — but her crews are less drilled, and she was built to fight from to leeward, firing high into the rigging.' },
    pact: { name: '74-gun third rate', weapon: '28 × 32-pdr, 28 × 18-pdr, 18 × 9-pdr', text: 'The backbone of the Royal Navy\'s line: two gun decks of black and ochre, crews drilled to fire a broadside faster than anyone afloat.' },
  },
});

export const SHIPS_1806 = { cruiser };
