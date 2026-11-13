// 1806 at sea (the sea maps whose epochs include 1806): the French Navy on the `nato` side, the Royal Navy
// on the `pact` side (Prussia had no fleet: Britain takes her place at sea, as Japan took Germany's in
// 1945). Sailing ships (`stats.sail`: entities/sailing.js) — the wind drives them, and none goes closer to
// it than about 60°. The guns are broadsides: batteries along each side (`mounts`, facing ±π/2 — a deck's
// guns forward and aft, so a broadside ripples down her side), firing roundshot at what bears on that beam.
// Speeds are twice the real ones (a 74 makes 8 knots; the game's 16), the ranges the game's sea scale.
// Ids follow the other eras' ships, so the modes and the AI work: the 74 is `cruiser` (the line of battle).
import { lcvp } from '../units45/ships.js';
import { buildFlatboat, buildHorseBoat, buildSeventyFourRN, buildSeventyFourFR, buildFirstRateRN, buildFirstRateFR, buildFrigateRN, buildFrigateFR, buildBrigRN, buildBrigFR, buildFireship, buildGunboatRN, buildGunboatFR } from '../models/ships1806.js';

const SAIL = {
  naval: true, sail: true, eyeHeight: 40, aimHeight: 5, nightSight: { nato: 0.45, pact: 0.45 }, crew: 0, breakMorale: 0, smoke: undefined, grenades: 0, lightAT: 0,
  fov: 6.3, burst: 1, burstInterval: 0, aimTime: 1, magSize: 9999, reloadTime: 1, antiArmor: true, tracer: 0, esm: false,
};
const BEAM = Math.PI / 2;
/** A battery: a deck's guns on one side, forward or aft half (`at` in the ship's frame, bow +z). */
const battery = (x, y, z, o) => ({ at: [x, y, z], facing: x > 0 ? BEAM : -BEAM, arc: 1.5, spread: 0.022, splash: 2.5, pierce: 0.5, shell: 420, size: 0.7, ...o });
/** Both sides of a two-decker: the lower deck's heavy guns and the upper deck's, each forward and aft. */
const twoDecker = (beam, len, lower, upper) => [-1, 1].flatMap((s) => [
  battery(s * (beam / 2 + 1), 1.6, len * 0.15, { ...lower, lower: true }), battery(s * (beam / 2 + 1), 1.6, -len * 0.15, { ...lower, lower: true }), // (lower: shut in a gale)
  battery(s * (beam / 2 + 1), 3.9, len * 0.15, upper), battery(s * (beam / 2 + 1), 3.9, -len * 0.15, upper),
]);
const ship = (o) => ({
  category: 'naval', kind: 'vehicle', role: 'fighter',
  formation: { count: 1, columns: 1, spacing: 0 },
  weaponSound: 'arty', engine: 'engine.sail', tracks: 'wash', // (engine.sail: the creak of the hull and the wind in her rigging, public/sounds/ships)
  ...o,
  stats: { ...SAIL, weapon: 'cannon', ...o.stats },
});

const LOWER = { range: 750, reload: 30, damage: 300 };   // 32-pounders (the French 36s)
const UPPER = { range: 650, reload: 26, damage: 190 };   // 18-pounders
const DRILLED = 0.85; // the Royal Navy's gun crews: a broadside in a little less time (an edge, not a rout: tuned on AI-vs-AI battles)

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

/** A single-decker's broadside (a frigate, a brig): one battery a side forward, one aft. */
const oneDecker = (beam, len, y, guns) => [-1, 1].flatMap((s) => [battery(s * (beam / 2 + 1), y, len * 0.15, guns), battery(s * (beam / 2 + 1), y, -len * 0.15, guns)]);
/** A three-decker's: the lower, middle and upper gun decks, each forward and aft. */
const threeDecker = (beam, len, decks) => [-1, 1].flatMap((s) => decks.flatMap(([y, guns], k) => [battery(s * (beam / 2 + 1), y, len * 0.16, { ...guns, lower: k === 0 }), battery(s * (beam / 2 + 1), y, -len * 0.16, { ...guns, lower: k === 0 })]));
const drilled = (g) => ({ ...g, reload: g.reload * DRILLED });

const G32 = { range: 750, reload: 30, damage: 300 }, G24 = { range: 720, reload: 28, damage: 240 }, G12 = { range: 600, reload: 22, damage: 140 };
export const battleship = ship({
  fleet: 'line',
  id: 'battleship', name: 'First Rate (100 guns)', shortName: 'First rate', cost: 1400, limit: 1,
  names: { nato: ['Impérial', 'Austerlitz', 'Océan', 'Commerce de Marseille', 'Majestueux'], pact: ['Victory', 'Royal Sovereign', 'Britannia', 'Ville de Paris', 'Hibernia'] },
  hull: { length: 57, beam: 16 },
  stats: { flagship: true, hp: 10500, armor: 0.3, speed: 7.4, accel: 0.04, turnRate: 0.055, turretRate: 1, radius: 10, height: 26, sight: 3200, range: 750, aggroRange: 900, preferredRange: 280, leash: 80, damage: 300, fireCooldown: 30, spread: 0.022, boltSpeed: 420, boltSize: 0.75, splash: 2.5, pierce: 0.5 },
  factionStats: { nato: { hp: 11000, speed: 7.8 } },
  mounts: {
    nato: threeDecker(16.4, 60, [[2.3, { ...G32, damage: 330 }], [4.6, G24], [6.9, G12]]),
    pact: threeDecker(16, 57, [[2.3, drilled(G32)], [4.6, drilled(G24)], [6.9, drilled(G12)]]),
  },
  camera: { distance: 85, height: 30, shoulder: 0 },
  models: { nato: buildFirstRateFR, pact: buildFirstRateRN },
  variants: {
    nato: { name: 'Océan-class 118', weapon: '32 × 36-pdr, 34 × 24-pdr, 34 × 12-pdr', text: "The biggest ships afloat: three gun decks and the admiral's flag. Slow and heavy — but her broadside crushes a 74, and while she fights near them the fleet's crews hold on longer." },
    pact: { name: '100-gun first rate', weapon: '30 × 32-pdr, 28 × 24-pdr, 42 × 12-pdr', text: "The flagship: Victory's kind, three decks of guns, the admiral on her quarterdeck. Where her flag flies the squadron holds out longer." },
  },
});

export const frigate = ship({
  fleet: 'escort',
  id: 'frigate', name: 'Frigate (38)', shortName: 'Frigate', cost: 400,
  names: { nato: ['Hortense', 'Hermione', 'Rhin', 'Cornélie', 'Thémis', 'Uranie', 'Pallas', 'Furieuse'], pact: ['Euryalus', 'Naiad', 'Phoebe', 'Sirius', 'Pallas', 'Amazon', 'Shannon', 'Indefatigable'] },
  hull: { length: 46, beam: 12 },
  stats: { hp: 3200, armor: 0.15, speed: 10, accel: 0.07, turnRate: 0.09, turretRate: 1, radius: 7, height: 18, sight: 3600, range: 650, aggroRange: 800, preferredRange: 320, leash: 80, damage: 180, fireCooldown: 24, spread: 0.022, boltSpeed: 420, boltSize: 0.6, splash: 2, pierce: 0.4 },
  factionStats: { nato: { speed: 10.6 } },
  mounts: { nato: oneDecker(12.4, 48, 3, { range: 650, reload: 24, damage: 180 }), pact: oneDecker(12, 46, 3, drilled({ range: 650, reload: 24, damage: 180 })) },
  camera: { distance: 65, height: 22, shoulder: 0 },
  models: { nato: buildFrigateFR, pact: buildFrigateRN },
  variants: {
    nato: { name: 'Pallas-class frigate', weapon: '28 × 18-pdr, 12 × 8-pdr', text: 'The eyes of the fleet: fast and weatherly, one gun deck of 18-pounders. She scouts, carries the signals, and takes on anything her size — never a ship of the line.' },
    pact: { name: '38-gun frigate', weapon: '28 × 18-pdr, 14 × 32-pdr carronades', text: 'The frigate: fast, handy, out ahead of the line to see — and to fight her own kind ship to ship.' },
  },
});

export const destroyer = ship({
  fleet: 'escort',
  id: 'destroyer', name: 'Brig-Sloop', shortName: 'Brig', cost: 200,
  names: { nato: ['Argus', 'Furet', 'Observateur', 'Lynx', 'Abeille', 'Cygne', 'Diligent', 'Espiègle'], pact: ['Pickle', 'Entreprenante', 'Weazle', 'Racoon', 'Cruizer', 'Snake', 'Rover', 'Sparrowhawk'] },
  hull: { length: 30, beam: 9 },
  stats: { masts: 2, hp: 1300, armor: 0.05, speed: 10.5, accel: 0.09, turnRate: 0.13, turretRate: 1, radius: 5, height: 13, sight: 3000, range: 450, aggroRange: 600, preferredRange: 220, leash: 80, damage: 90, fireCooldown: 18, spread: 0.025, boltSpeed: 400, boltSize: 0.45, splash: 1.5, pierce: 0.3 },
  mounts: { nato: oneDecker(9, 30, 1.8, { range: 450, reload: 18, damage: 90 }), pact: oneDecker(9, 30, 1.8, drilled({ range: 450, reload: 18, damage: 90 })) },
  camera: { distance: 45, height: 16, shoulder: 0 },
  models: { nato: buildBrigFR, pact: buildBrigRN },
  variants: {
    nato: { name: 'Abeille-class brig', weapon: '16 × 24-pdr carronades', text: 'A two-masted brig: cheap, quick, short-ranged carronades. She carries signals, chases gunboats, takes struck ships in hand.' },
    pact: { name: 'Cruizer-class brig-sloop', weapon: '16 × 32-pdr carronades, 2 × 6-pdr', text: "The Navy's most numerous warship: a brig with smashing carronades at close range — and nothing to stand against a frigate." },
  },
});

export const fireship = ship({
  fleet: 'under',
  id: 'fireship', name: 'Fireship', shortName: 'Fireship', cost: 150,
  names: { nato: ['Brûlot 1', 'Brûlot 2', 'Brûlot 3', 'Brûlot 4'], pact: ['Prometheus', 'Tisiphone', 'Comet', 'Lightning', 'Thais', 'Etna'] },
  hull: { length: 30, beam: 9 },
  stats: { masts: 2, fireship: true, hp: 1100, armor: 0.05, speed: 9.5, accel: 0.08, turnRate: 0.12, turretRate: 1, radius: 5, height: 13, sight: 2800, range: 60, aggroRange: 0, preferredRange: 0, leash: 0, damage: 0, fireCooldown: 999 },
  mounts: { nato: [], pact: [] },
  camera: { distance: 45, height: 16, shoulder: 0 },
  models: { nato: buildFireship, pact: buildFireship },
  variants: {
    nato: { name: 'Brûlot', weapon: 'pitch, tar and powder', text: 'An old brig filled with everything that burns: sent down the wind onto the enemy line, her crew lighting her and pulling away in the boat. What she touches burns.' },
    pact: { name: 'Fireship', weapon: 'combustibles', text: "A hulk crammed with tar barrels and powder: steer her onto an enemy and she sets him ablaze — an anchored line's nightmare." },
  },
});

export const ptBoat = ship({
  fleet: 'under', // (with the fireships: small craft for a calm or a dark night)
  id: 'ptBoat', name: 'Gunboat', shortName: 'Gunboat', cost: 120,
  names: { nato: ['Canonnière 1', 'Canonnière 2', 'Canonnière 3', 'Canonnière 4', 'Canonnière 5', 'Canonnière 6'], pact: ['Gunboat 1', 'Gunboat 2', 'Gunboat 3', 'Gunboat 4', 'Gunboat 5', 'Gunboat 6'] },
  hull: { length: 18, beam: 4.6 },
  stats: { masts: 1, oars: 0.45, smallCraft: true, stealth: 0.6, hp: 500, armor: 0, speed: 7, accel: 0.15, turnRate: 0.3, turretRate: 1, radius: 3, height: 7, eyeHeight: 6, sight: 2200, range: 800, aggroRange: 900, preferredRange: 450, leash: 80, damage: 280, fireCooldown: 30, spread: 0.02, boltSpeed: 430, boltSize: 0.6, splash: 2.5, pierce: 0.5 },
  mounts: { nato: [{ ...battery(0, 1.8, 9, { range: 800, reload: 30, damage: 280 }), facing: 0, arc: 0.9 }], pact: [{ ...battery(0, 1.8, 9, drilled({ range: 800, reload: 30, damage: 280 })), facing: 0, arc: 0.9 }] },
  camera: { distance: 30, height: 10, shoulder: 0 },
  models: { nato: buildGunboatFR, pact: buildGunboatRN },
  variants: {
    nato: { name: 'Chaloupe canonnière', weapon: '1 × 24-pdr', text: "An open boat with one long gun in her bow and sweeps along her sides: in a calm she rows where ships can't sail, and lays her gun on a helpless stern." },
    pact: { name: 'Gunboat', weapon: '1 × 24-pdr', text: 'A big rowing boat with a heavy gun forward: worthless in a breeze, deadly in a calm.' },
  },
});

/**
 * The landing boats (the coastal battle, Aboukir 1801: systems/Landing.js). Never bought: what the British buy for the
 * land comes ashore in them — the foot in a flatboat (fifty men, rowed by the fleet's seamen), the guns and horses in
 * the launches. Rowed, not sailed (no `sail`: they go where they're steered, whatever the wind).
 */
const boat = (o) => ({ ...lcvp, engine: 'engine.oars', ...o, stats: { ...lcvp.stats, rowed: true, ...o.stats }, mounts: { nato: [], pact: [] } }); // (`rowed`: open boats — the surf can fill them: systems/Landing.js)
export const flatboat = boat({
  id: 'flatboat', name: 'Flatboat', shortName: 'Flatboat',
  hull: { length: 12, beam: 3 },
  stats: { draft: 0.6, hp: 450, armor: 0, speed: 6.5, accel: 0.6, turnRate: 0.5, radius: 2.2, height: 1.6, eyeHeight: 2, stealth: 0.5 },
  camera: { distance: 26, height: 9, shoulder: 0 },
  models: { nato: buildFlatboat, pact: buildFlatboat },
  variants: {
    nato: { name: 'Flatboat', weapon: 'none', text: 'An open, flat-bottomed boat: fifty soldiers sitting packed between the rowers.' },
    pact: { name: 'Flatboat', weapon: 'none', text: 'The fleet\'s flatboats: fifty soldiers sit packed on the floor while the seamen pull. When she grounds they go over the bow into the surf, muskets held high.' },
  },
});
export const horseBoat = boat({
  id: 'horseBoat', name: 'Launch', shortName: 'Launch',
  hull: { length: 15, beam: 4.4 },
  stats: { draft: 0.8, hp: 320, armor: 0, speed: 4.6, accel: 0.45, turnRate: 0.35, radius: 3, height: 1.8, eyeHeight: 2.2 },
  camera: { distance: 32, height: 11, shoulder: 0 },
  models: { nato: buildHorseBoat, pact: buildHorseBoat },
  variants: {
    nato: { name: 'Launch', weapon: 'carronade', text: 'A ship\'s launch: guns and horses.' },
    pact: { name: 'Ship\'s launch', weapon: 'carronade', text: 'The big boats of the ships of the line: the field guns and their teams, the dragoons\' horses, swum or slung ashore.' },
  },
});

export const SHIPS_1806 = { cruiser, battleship, frigate, destroyer, fireship, ptBoat, flatboat, horseBoat };
