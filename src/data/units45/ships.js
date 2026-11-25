// 1945 warships, the open-sea maps only (the Pacific: the US Navy on the `nato` side, the Imperial
// Japanese Navy on the `pact` side). One ship a stack. Ranges and speeds are the game's sea scale
// (the open-sea maps are ~5 km: real gun ranges of 15–40 km would cover all of it), layered so the
// bigger ship outranges the smaller.
// `mounts` per side: each gun mount fires on its own (entities/UnitStack.js updateShipWeapons) when
// the target bears within its arc — `facing` 0 over the bow, π over the stern, `arc` its full
// width; a torpedo mount (`torpedo`) fires a spread to whichever beam the target is on
// (systems/Torpedoes.js). `at`: where the shells leave, in the ship's frame (bow +z).
// `hull`: length and beam, for torpedoes and the damage parts.
// Submarines (`submarine`): surfaced, at periscope depth or deep (entities/UnitStack.js shipUpkeep);
// submerged they're seen only by a ship's `sonar` (or the periscope close by, or a torpedo shot:
// systems/VisibilitySystem.js), and deep they hear moving ships out to `hearing`. Torpedoes from
// periscope depth or the surface, the deck gun only surfaced. `depthCharges`: the escorts' answer.
import { buildTexas, buildFletcher, buildKagero, buildBuckley, buildKaibokan, buildBaltimore, buildTakao, buildIowa, buildYamato, buildGato, buildB1, buildEssex, buildShokaku, buildElcoPT, buildGyoraitei, buildCleveland, buildAgano, buildCasablanca, buildTaiyo, buildLiberty, buildMaru } from '../models/ships1945.js';
import { buildLCVP, buildLCT, buildYMS, buildDD, buildLSMR, buildLCA, buildLCT4, buildPiLB, buildMFP, buildShohatsu, buildDaihatsu } from '../models/landingCraft45.js';
import * as S from '../models/ships1945eu.js';

const NAVAL = { naval: true, eyeHeight: 18, aimHeight: 4, nightSight: { nato: 0.6, pact: 0.55 }, /* (at night: the US by radar, the Imperial Navy's lookouts with their big night glasses) */ crew: 0, breakMorale: 0, smoke: undefined, grenades: 0, lightAT: 0, fov: 6.3, burst: 1, burstInterval: 0, aimTime: 1, magSize: 9999, reloadTime: 1, antiArmor: true, tracer: 1 };
const FWD = 0;
const AFT = Math.PI;

/** Anti-aircraft fire (UnitStack.engageAir): 40 mm and 20 mm along the decks; the bigger the ship, the more of it. */
const AA = (range, hitNear, hitFar) => ({ antiAir: { range, optical: 1, rate: 2.4, burst: 6, pause: 0.4, hitNear: hitNear * 0.3, hitFar: hitFar * 0.3 } }); // (a wall of tracer — few hits: most strikes got through to drop)

/** A gun mount. */
const gun = (at, facing, o) => ({ at, facing, arc: 4.6, spread: 0.01, splash: 4, pierce: 0.3, shell: 900, size: 1.8, ...o });
/** Depth charges: a pattern dropped over a found submarine (systems/Torpedoes.js charges). */
const DC = (o) => ({ count: 5, reload: 18, radius: 40, damage: 1100, ...o });
/** A smoke generator (destroyers and escorts): a screen laid for `last` s while under way, then `cooldown` s (Orders shipSmoke). */
const SMOKE_GEN = { last: 60, cooldown: 120 };

/** A torpedo mount: a spread to the beam the target is on. */
const torps = (at, o) => ({ at, torpedo: true, arc: 2.2, count: 4, range: 1500, speed: 22, damage: 2600, reload: 90, ...o });

/**
 * The sea maps are 5 km across: the real ranges below would have the fleets shooting from one edge to the
 * other. Every gun, torpedo, sight, sonar and hearing range is taken down to this share of them (not the
 * anti-aircraft fire, nor the planes' strike radius), so ships have to close and manoeuvre.
 */
const RANGE = 0.55;
const SCALED = ['range', 'aggroRange', 'preferredRange', 'sight', 'sonar', 'hearing'];
const near = (o) => { const r = { ...o }; for (const k of SCALED) if (r[k]) r[k] = Math.round(r[k] * RANGE / 5) * 5; return r; }; // (to 5 m: shown in the unit card)

/** One warship class: the shared parts, the class's own, the two navies' mounts. */
const ship = (o) => ({
  category: 'naval', kind: 'vehicle', role: 'fighter',
  formation: { count: 1, columns: 1, spacing: 0 },
  weaponSound: 'naval', engine: 'engine.ship', tracks: 'wash', // (audio: the screws' beat, the bow wave for tracks)
  ...o,
  stats: near({ ...NAVAL, weapon: 'cannon', ...o.stats }),
  ...(o.mounts && { mounts: Object.fromEntries(Object.entries(o.mounts).map(([side, list]) => [side, list.map(near)])) }),
});

const FIVE_INCH = { range: 2400, reload: 3.5, damage: 220, splash: 4, pierce: 0.3 };
const DD_JP = { range: 2400, reload: 4.5, damage: 440, splash: 4.5, pierce: 0.3 }; // (a twin mount: both shells in one salvo)

export const frigate = ship({
  fleet: 'escort', // (the reinforcement window's tab)
  id: 'frigate', name: 'Escort', shortName: 'Escort', cost: 280,
  names: { nato: ['Buckley', 'Reuben James', 'England', 'Fogg', 'Foss', 'Gantner', 'Lee Fox', 'Amesbury', 'Bates', 'Blessman', 'Ira Jeffery', 'Fechteler'], pact: ['Etorofu', 'Matsuwa', 'Sado', 'Oki', 'Mutsure', 'Iki', 'Tsushima', 'Wakamiya', 'Hirado', 'Fukae', 'Amakusa', 'Kasado'] }, // her own name, the class's next not yet afloat (UnitStack shipName)
  hull: { length: 93, beam: 11 },
  stats: { flareRounds: 4, /* (star shells: Orders flare) */ hp: 2600, armor: 0.1, speed: 11.5, accel: 0.15, turnRate: 0.12, turretRate: 0.6, radius: 6, height: 8, sight: 2200, sonar: 950, depthCharges: DC({ count: 6, reload: 14 }), smokeGen: SMOKE_GEN, ...AA(600, 0.12, 0.03), range: 1700, aggroRange: 1700, preferredRange: 1200, leash: 50, damage: 160, fireCooldown: 3, spread: 0.012, boltSpeed: 850, boltSize: 1.4, splash: 3, pierce: 0.2 },
  mounts: {
    nato: [gun([0, 6, 38], FWD, { range: 1700, reload: 3, damage: 150 }), gun([0, 8, 31], FWD, { range: 1700, reload: 3, damage: 150 }), gun([0, 6, -26], AFT, { range: 1700, reload: 3, damage: 150 })],
    pact: [gun([0, 6, 32], FWD, { range: 1700, reload: 3, damage: 200 }), gun([0, 6, -22], AFT, { range: 1700, reload: 4, damage: 320 })], // (the aft one a twin)
  },
  camera: { distance: 80, height: 26, shoulder: 0 },
  models: { nato: buildBuckley, pact: buildKaibokan },
  variants: {
    nato: { name: 'Buckley-class destroyer escort', weapon: '3 × 3-inch/50, depth charges', text: 'The convoy escort: slower and lighter armed than a destroyer, but cheap, handy, and built to hunt submarines.' },
    pact: { name: 'Kaibōkan escort', weapon: '12 cm guns, depth charges', text: 'The Imperial Navy\'s escort ship, built in numbers late in the war to guard the convoys.' },
  },
});

export const destroyer = ship({
  fleet: 'escort', // (the reinforcement window's tab)
  id: 'destroyer', name: 'Destroyer', shortName: 'Destroyer', cost: 450,
  names: { nato: ['Johnston', 'Hoel', 'Heermann', 'Fletcher', "O'Bannon", 'Nicholas', 'Kidd', 'The Sullivans', 'Laffey', 'Aaron Ward', 'Spence', 'Charles Ausburne', 'Radford', 'Jenkins', 'Hazelwood', 'Strong'], pact: ['Yukikaze', 'Shiranui', 'Kagerō', 'Kuroshio', 'Oyashio', 'Hatsukaze', 'Natsushio', 'Amatsukaze', 'Tokitsukaze', 'Urakaze', 'Isokaze', 'Hamakaze', 'Tanikaze', 'Nowaki', 'Arashi', 'Maikaze'] }, // her own name, the class's next not yet afloat (UnitStack shipName)
  hull: { length: 115, beam: 12 },
  stats: { flareRounds: 8, /* (star shells: Orders flare) */ hp: 4200, armor: 0.2, speed: 16, accel: 0.12, turnRate: 0.09, turretRate: 0.5, radius: 7, height: 10, sight: 2600, sonar: 800, depthCharges: DC(), smokeGen: SMOKE_GEN, ...AA(700, 0.18, 0.04), range: 2400, aggroRange: 2400, preferredRange: 1600, leash: 60, damage: 220, fireCooldown: 3.5, spread: 0.012, boltSpeed: 900, boltSize: 1.8, splash: 4, pierce: 0.3 },
  mounts: {
    nato: [gun([0, 7, 48], FWD, FIVE_INCH), gun([0, 10, 41], FWD, FIVE_INCH), gun([0, 10, -20], AFT, FIVE_INCH), gun([0, 7, -38], AFT, FIVE_INCH), gun([0, 7, -47], AFT, FIVE_INCH),
      torps([0, 7, 0], { count: 5, range: 1400, speed: 22 }), torps([0, 7, -9], { count: 5, range: 1400, speed: 22 })],
    pact: [gun([0, 7.5, 45], FWD, DD_JP), gun([0, 10.5, -21], AFT, DD_JP), gun([0, 7.5, -40], AFT, DD_JP),
      torps([0, 7, -6], { count: 4, range: 2200, speed: 25, damage: 3200, reload: 120, wakeless: true }), torps([0, 7, 20], { count: 4, range: 2200, speed: 25, damage: 3200, reload: 120, wakeless: true })],
  },
  camera: { distance: 95, height: 32, shoulder: 0 },
  models: { nato: buildFletcher, pact: buildKagero },
  variants: {
    nato: { name: 'Fletcher-class destroyer', weapon: '5 × 5-inch/38, 10 torpedo tubes', text: 'The workhorse of the US Navy in the Pacific: fast, well armed, radar-directed guns. Screens the big ships, hunts submarines, makes torpedo runs.' },
    pact: { name: 'Kagerō-class destroyer', weapon: '6 × 12.7 cm, 8 Long Lance torpedoes', text: 'The fleet destroyer of the Imperial Navy: its Long Lance torpedoes reach further than any enemy\'s and leave no wake to see them coming.' },
  },
});

const EIGHT_INCH = { range: 3000, reload: 9, damage: 700, splash: 7, pierce: 0.55, shell: 950, size: 2.6, spread: 0.009 };
const TWENTY_CM = { range: 3000, reload: 10, damage: 560, splash: 7, pierce: 0.55, shell: 950, size: 2.6, spread: 0.009 };

export const cruiser = ship({
  fleet: 'line', // (the reinforcement window's tab)
  id: 'cruiser', name: 'Heavy Cruiser', shortName: 'Cruiser', cost: 750, limit: 3,
  names: { nato: ['Baltimore', 'Boston', 'Canberra', 'Quincy', 'Pittsburgh', 'Saint Paul', 'Columbus', 'Helena'], pact: ['Takao', 'Atago', 'Maya', 'Chōkai'] }, // her own name, the class's next not yet afloat (UnitStack shipName)
  hull: { length: 205, beam: 21 },
  stats: { flareRounds: 10, /* (star shells: Orders flare) */ hp: 11000, armor: 0.45, speed: 15, accel: 0.08, turnRate: 0.065, turretRate: 0.3, radius: 10, height: 16, sight: 3000, ...AA(850, 0.26, 0.06), range: 3000, aggroRange: 3000, preferredRange: 2200, leash: 80, damage: 700, fireCooldown: 9, spread: 0.009, boltSpeed: 950, boltSize: 2.6, splash: 7, pierce: 0.55 },
  mounts: {
    nato: [gun([0, 10, 74], FWD, EIGHT_INCH), gun([0, 13, 60], FWD, EIGHT_INCH), gun([0, 10, -62], AFT, EIGHT_INCH)],
    pact: [gun([0, 9, 78], FWD, TWENTY_CM), gun([0, 12, 67], FWD, TWENTY_CM), gun([0, 9, 56], FWD, TWENTY_CM), gun([0, 12, -52], AFT, TWENTY_CM), gun([0, 9, -64], AFT, TWENTY_CM),
      torps([8, 8, -8], { count: 4, range: 2200, speed: 25, damage: 3200, reload: 150, wakeless: true }), torps([-8, 8, -8], { count: 4, range: 2200, speed: 25, damage: 3200, reload: 150, wakeless: true })],
  },
  camera: { distance: 150, height: 45, shoulder: 0 },
  models: { nato: buildBaltimore, pact: buildTakao },
  variants: {
    nato: { name: 'Baltimore-class heavy cruiser', weapon: '9 × 8-inch, 12 × 5-inch', text: 'Big, fast and bristling with anti-aircraft guns: the carriers\' bodyguard and a hard hitter in a surface fight.' },
    pact: { name: 'Takao-class heavy cruiser', weapon: '10 × 20 cm, 8 Long Lance torpedoes', text: 'Heavily armed for its size, with the Long Lance as well as its guns — deadly in a night action.' },
  },
});

const SIXTEEN_INCH = { range: 4000, reload: 30, damage: 2400, splash: 12, pierce: 0.8, shell: 1000, size: 4, spread: 0.008 };
const FORTY_SIX_CM = { range: 4000, reload: 36, damage: 2900, splash: 14, pierce: 0.85, shell: 1000, size: 4.4, spread: 0.008 };
const SECONDARY = (at, facing) => gun(at, facing, { range: 2200, reload: 4, damage: 220, splash: 4, pierce: 0.3, arc: 2.6 });

export const battleship = ship({
  fleet: 'line', // (the reinforcement window's tab)
  id: 'battleship', name: 'Battleship', shortName: 'Battleship', cost: 1300, limit: 1,
  names: { nato: ['Iowa', 'New Jersey', 'Missouri', 'Wisconsin'], pact: ['Yamato', 'Musashi'] }, // her own name, the class's next not yet afloat (UnitStack shipName)
  hull: { length: 262, beam: 33 },
  stats: { flareRounds: 8, /* (star shells: Orders flare) */ hp: 26000, armor: 0.7, speed: 15, accel: 0.06, turnRate: 0.05, turretRate: 0.2, radius: 14, height: 30, sight: 3600, ...AA(950, 0.32, 0.07), range: 4000, aggroRange: 4000, preferredRange: 3000, leash: 100, damage: 2400, fireCooldown: 30, spread: 0.008, boltSpeed: 1000, boltSize: 4, splash: 12, pierce: 0.8 },
  factionStats: { pact: { hp: 30000, armor: 0.75, speed: 13.5 } },   // Yamato: the heaviest armour afloat, slower
  mounts: {
    nato: [gun([0, 13, 96], FWD, SIXTEEN_INCH), gun([0, 17, 78], FWD, SIXTEEN_INCH), gun([0, 13, -78], AFT, SIXTEEN_INCH), SECONDARY([11, 12, 20], Math.PI / 2), SECONDARY([-11, 12, 20], -Math.PI / 2), SECONDARY([11, 12, -20], Math.PI / 2), SECONDARY([-11, 12, -20], -Math.PI / 2)],
    pact: [gun([0, 14, 92], FWD, FORTY_SIX_CM), gun([0, 19, 74], FWD, FORTY_SIX_CM), gun([0, 14, -74], AFT, FORTY_SIX_CM), SECONDARY([12.5, 13, 8], Math.PI / 2), SECONDARY([-12.5, 13, 8], -Math.PI / 2)],
  },
  camera: { distance: 200, height: 60, shoulder: 0 },
  models: { nato: buildIowa, pact: buildYamato },
  variants: {
    nato: { name: 'Iowa-class battleship', weapon: '9 × 16-inch, 20 × 5-inch', text: 'The fastest battleship ever built: nine 16-inch guns, a wall of anti-aircraft fire, radar fire control.' },
    pact: { name: 'Yamato', weapon: '9 × 46 cm, 6 × 15.5 cm', text: 'The biggest battleship ever built: the heaviest guns and armour afloat. Slower than the Iowa — and there is only one.' },
  },
});

const TUBES = (at, facing, o) => torps(at, { facing, arc: 0.9, ...o }); // a submarine's bow or stern tubes: aimed with the boat

export const submarine = ship({
  fleet: 'under', // (the reinforcement window's tab)
  id: 'submarine', name: 'Submarine', shortName: 'Submarine', cost: 500, limit: 2,
  names: { nato: ['Wahoo', 'Barb', 'Flasher', 'Harder', 'Silversides', 'Gato', 'Growler', 'Guardfish', 'Trigger', 'Bonefish'], pact: ['I-19', 'I-26', 'I-17', 'I-15', 'I-21', 'I-23', 'I-25', 'I-27', 'I-28', 'I-29'] }, // her own name, the class's next not yet afloat (UnitStack shipName)
  hull: { length: 95, beam: 8.3 },
  stats: {
    submarine: { submerged: 4.2, dive: 1.4, periscope: 6, deep: 40 }, hp: 2400, armor: 0.1, speed: 10, accel: 0.1, turnRate: 0.11, turretRate: 0.6, radius: 5, height: 6, eyeHeight: 8,
    sight: 1800, hearing: 2400, range: 1600, aggroRange: 1600, preferredRange: 1100, leash: 60, damage: 180, fireCooldown: 6, spread: 0.014, boltSpeed: 800, boltSize: 1.2, splash: 3, pierce: 0.2,
  },
  mounts: {
    nato: [TUBES([0, -1, 44], 0, { count: 4, range: 1500, speed: 22, damage: 2600, reload: 50 }), TUBES([0, -1, -44], Math.PI, { count: 2, range: 1500, speed: 22, damage: 2600, reload: 60 }), gun([0, 4.5, 16], 0, { range: 1200, reload: 5, damage: 160, splash: 3, surfaced: true, arc: 5.2 })],
    pact: [TUBES([0, -1, 50], 0, { count: 6, range: 2200, speed: 25, damage: 3200, reload: 70, wakeless: true }), gun([0, 5, -16], Math.PI, { range: 1200, reload: 6, damage: 190, splash: 3, surfaced: true, arc: 5.2 })],
  },
  camera: { distance: 80, height: 22, shoulder: 0 },
  models: { nato: buildGato, pact: buildB1 },
  variants: {
    nato: { name: 'Gato-class submarine', weapon: '10 torpedo tubes, deck gun', text: 'The US fleet submarine: long range, good radar, ten tubes. Deadly from periscope depth — and helpless if a destroyer finds it.' },
    pact: { name: 'Type B1 submarine (I-boat)', weapon: '6 bow tubes (Long Lance), deck gun, floatplane', text: 'The big Japanese ocean submarine, with the oxygen torpedo and its own scout plane in a hangar on deck.' },
  },
});

export const carrier = ship({
  fleet: 'carrier', // (the reinforcement window's tab)
  id: 'carrier', name: 'Aircraft Carrier', shortName: 'Carrier', cost: 1200, limit: 1,
  names: { nato: ['Essex', 'Yorktown', 'Intrepid', 'Hornet', 'Franklin', 'Lexington', 'Bunker Hill', 'Wasp'], pact: ['Shōkaku', 'Zuikaku'] }, // her own name, the class's next not yet afloat (UnitStack shipName)
  hull: { length: 267, beam: 28 },
  stats: {
    carrier: { deck: 16.3, deckLen: 250, airGroup: { navCap: 4, diveBomb: 3, torpBomb: 3, navScout: 2 } }, // (deck: the flight deck's height and length, for take-off and landing) // its hangar: flights of each kind (systems/AirStrike.js: launched off her deck, rearmed when they're back, lost when shot down)
    hp: 22000, armor: 0.35, speed: 16, accel: 0.06, turnRate: 0.05, turretRate: 0.4, radius: 15, height: 32, eyeHeight: 30, sight: 3200, ...AA(950, 0.3, 0.07),
    range: 2200, aggroRange: 2200, preferredRange: 2600, leash: 100, damage: 220, fireCooldown: 4, spread: 0.012, boltSpeed: 900, boltSize: 1.8, splash: 4, pierce: 0.3,
  },
  mounts: {
    nato: [gun([15, 17, 28], FWD, FIVE_INCH), gun([15, 17, 52], FWD, FIVE_INCH), gun([15, 17, -14], AFT, FIVE_INCH), gun([15, 17, -36], AFT, FIVE_INCH)],
    pact: [gun([-14, 10, 70], FWD, DD_JP), gun([14, 10, 60], FWD, DD_JP), gun([-14, 10, -60], AFT, DD_JP), gun([14, 10, -70], AFT, DD_JP)],
  },
  camera: { distance: 220, height: 70, shoulder: 0 },
  models: { nato: buildEssex, pact: buildShokaku },
  variants: {
    nato: { name: 'Essex-class carrier', weapon: 'Hellcats, Helldivers, Avengers', text: 'The fleet carrier that won the Pacific war: her air group strikes far beyond any gun. Lose her, and the planes go with her.' },
    pact: { name: 'Shōkaku-class carrier', weapon: 'Zeros, Vals, Jills', text: 'The best carriers of the Kidō Butai: fast, with a strong air group. Thin-skinned against bombs.' },
  },
});

export const ptBoat = ship({
  fleet: 'escort', // (the reinforcement window's tab)
  id: 'ptBoat', name: 'Torpedo Boat', shortName: 'PT boat', cost: 140,
  names: { nato: ['PT-109', 'PT-131', 'PT-137', 'PT-490', 'PT-491', 'PT-493', 'PT-523', 'PT-524', 'PT-130', 'PT-132'], pact: ['Gyoraitei 14', 'Gyoraitei 15', 'Gyoraitei 16', 'Gyoraitei 17', 'Gyoraitei 18', 'Gyoraitei 19', 'Gyoraitei 20', 'Gyoraitei 21'] }, // her own name (UnitStack shipName)
  hull: { length: 24, beam: 6.3 },
  stats: { hp: 420, armor: 0, speed: 21, accel: 0.45, turnRate: 0.32, turretRate: 1, radius: 3, height: 3, eyeHeight: 4, sight: 1500, stealth: 0.6, smokeGen: SMOKE_GEN, smallCraft: true, ...AA(500, 0.12, 0.02), range: 1000, aggroRange: 1100, preferredRange: 700, leash: 40, damage: 60, fireCooldown: 1.2, spread: 0.02, boltSpeed: 800, boltSize: 0.8, splash: 1, pierce: 0.1 },
  mounts: {
    nato: [torps([0, 2, 6], { facing: FWD, arc: 0.7, count: 4, range: 1100, speed: 18, damage: 2400, reload: 9999 }), gun([0, 3, -7], AFT, { range: 1000, reload: 1.2, damage: 60, splash: 1, shell: 800, size: 0.8, arc: 5 })],
    pact: [torps([0, 2, 0], { facing: FWD, arc: 0.7, count: 2, range: 1400, speed: 22, damage: 2800, reload: 9999 }), gun([0, 2.6, -5], AFT, { range: 900, reload: 1.4, damage: 50, splash: 1, shell: 800, size: 0.8, arc: 5 })],
  },
  camera: { distance: 40, height: 12, shoulder: 0 },
  models: { nato: buildElcoPT, pact: buildGyoraitei },
  variants: {
    nato: { name: 'Elco PT boat', weapon: '4 torpedoes, 40 mm, twin .50s', text: 'Fast, small and made of plywood: in at 40 knots behind its smoke, four torpedoes, and away. Nothing armoured about it — and a rough sea slows it badly.' },
    pact: { name: 'Gyoraitei torpedo boat', weapon: '2 torpedoes, 25 mm', text: 'The Imperial Navy\'s small torpedo boat: a dash in with two torpedoes. Fragile, and lost in a rough sea.' },
  },
});

const SIX_INCH = { range: 2600, reload: 6, damage: 380, splash: 5, pierce: 0.45, shell: 920, size: 2.2, spread: 0.01 };
const FIFTEEN_CM = { range: 2600, reload: 7, damage: 340, splash: 5, pierce: 0.45, shell: 920, size: 2.2, spread: 0.01 };

export const lightCruiser = ship({
  fleet: 'line', // (the reinforcement window's tab)
  id: 'lightCruiser', name: 'Light Cruiser', shortName: 'Light cruiser', cost: 600, limit: 3,
  names: { nato: ['Cleveland', 'Columbia', 'Montpelier', 'Denver', 'Santa Fe', 'Birmingham', 'Mobile', 'Biloxi', 'Houston', 'Miami'], pact: ['Agano', 'Noshiro', 'Yahagi', 'Sakawa'] }, // her own name (UnitStack shipName)
  hull: { length: 186, beam: 20 },
  stats: { flareRounds: 10, hp: 8500, armor: 0.35, speed: 16, accel: 0.09, turnRate: 0.07, turretRate: 0.35, radius: 9, height: 14, sight: 2900, ...AA(800, 0.24, 0.05), range: 2600, aggroRange: 2600, preferredRange: 1900, leash: 70, damage: 380, fireCooldown: 6, spread: 0.01, boltSpeed: 920, boltSize: 2.2, splash: 5, pierce: 0.45 },
  mounts: {
    nato: [gun([0, 9, 66], FWD, SIX_INCH), gun([0, 12, 52], FWD, SIX_INCH), gun([0, 12, -52], AFT, SIX_INCH), gun([0, 9, -66], AFT, SIX_INCH)],
    pact: [gun([0, 8.5, 60], FWD, FIFTEEN_CM), gun([0, 11.5, 50], FWD, FIFTEEN_CM), gun([0, 8.5, -58], AFT, FIFTEEN_CM),
      torps([0, 7, -38], { count: 4, range: 2200, speed: 25, damage: 3200, reload: 140, wakeless: true }), torps([0, 7, -46], { count: 4, range: 2200, speed: 25, damage: 3200, reload: 140, wakeless: true })],
  },
  camera: { distance: 135, height: 42, shoulder: 0 },
  models: { nato: buildCleveland, pact: buildAgano },
  variants: {
    nato: { name: 'Cleveland-class light cruiser', weapon: '12 × 6-inch, 12 × 5-inch', text: 'Lighter than a heavy cruiser but quick-firing: twelve 6-inch guns throw a storm of shells at destroyers and cruisers alike.' },
    pact: { name: 'Agano-class light cruiser', weapon: '6 × 15 cm, 8 Long Lance torpedoes', text: 'The Imperial Navy\'s destroyer flotilla leader: fast, with the Long Lance — it leads the night torpedo attack.' },
  },
});

export const escortCarrier = ship({
  fleet: 'carrier', // (the reinforcement window's tab)
  id: 'escortCarrier', name: 'Escort Carrier', shortName: 'Escort carrier', cost: 650, limit: 1,
  names: { nato: ['Gambier Bay', 'Casablanca', 'Liscome Bay', 'St. Lo', 'Kalinin Bay', 'White Plains', 'Fanshaw Bay', 'Kitkun Bay'], pact: ['Taiyō', 'Un\'yō', 'Chūyō'] }, // her own name (UnitStack shipName)
  hull: { length: 156, beam: 19.9 },
  stats: {
    carrier: { escort: true, deck: 13.8, deckLen: 150, airGroup: { navCap: 3, diveBomb: 0, torpBomb: 2, navScout: 1 } }, // a small hangar: fighters, torpedo bombers, a scout
    hp: 9000, armor: 0.15, speed: 10, accel: 0.06, turnRate: 0.06, turretRate: 0.4, radius: 9, height: 22, eyeHeight: 20, sight: 2800, smokeGen: SMOKE_GEN, ...AA(800, 0.2, 0.05),
    range: 1800, aggroRange: 1800, preferredRange: 2400, leash: 80, damage: 220, fireCooldown: 5, spread: 0.012, boltSpeed: 900, boltSize: 1.8, splash: 4, pierce: 0.3,
  },
  mounts: {
    nato: [gun([0, 14, -76], AFT, { ...FIVE_INCH, range: 1800, arc: 3 })],
    pact: [gun([-12, 11, 50], FWD, DD_JP), gun([12, 11, -50], AFT, DD_JP)],
  },
  camera: { distance: 160, height: 52, shoulder: 0 },
  models: { nato: buildCasablanca, pact: buildTaiyo },
  variants: {
    nato: { name: 'Casablanca-class escort carrier', weapon: 'Wildcats, Avengers', text: 'A small, slow carrier built on a merchant hull: fighters and torpedo bombers for the convoy, and a target that can\'t take much.' },
    pact: { name: 'Taiyō-class escort carrier', weapon: 'Zeros, Jills', text: 'A liner turned carrier, flush-decked with no island: a handful of planes for the convoys.' },
  },
});

export const transport = ship({
  fleet: 'under', // (the reinforcement window's tab)
  id: 'transport', name: 'Transport', shortName: 'Transport', cost: 220,
  names: { nato: ['SS Jeremiah O\'Brien', 'SS John W. Brown', 'SS Robert E. Peary', 'SS Stephen Hopkins', 'SS Patrick Henry', 'SS Booker T. Washington'], pact: ['Kinugasa Maru', 'Sado Maru', 'Hirokawa Maru', 'Yamaura Maru', 'Nagara Maru', 'Arizona Maru'] }, // her own name (UnitStack shipName)
  hull: { length: 135, beam: 17.3 },
  stats: { landing: true, hp: 7000, armor: 0.1, speed: 8.5, accel: 0.05, turnRate: 0.05, turretRate: 0.4, radius: 8, height: 14, sight: 2200, ...AA(500, 0.1, 0.02), range: 1600, aggroRange: 1600, preferredRange: 1400, leash: 60, damage: 120, fireCooldown: 6, spread: 0.014, boltSpeed: 800, boltSize: 1.4, splash: 3, pierce: 0.2 },
  mounts: {
    nato: [gun([0, 9, -64], AFT, { range: 1600, reload: 6, damage: 120, splash: 3, arc: 4 })],
    pact: [gun([0, 9, -62], AFT, { range: 1500, reload: 6, damage: 110, splash: 3, arc: 4 })],
  },
  camera: { distance: 110, height: 36, shoulder: 0 },
  models: { nato: buildLiberty, pact: buildMaru },
  variants: {
    nato: { name: 'Liberty ship transport', weapon: 'one 4-inch gun, 20 mm', text: 'Troops and stores for the islands: barely armed and slow — but the landing parties she carries hold a zone, and bring in command points while they hold it.' },
    pact: { name: 'Maru army transport', weapon: 'one gun, landing barges', text: 'The Imperial Army\'s troopship with its landing barges: slow and soft, but the men aboard hold a zone and bring in command points.' },
  },
});

/**
 * Landing craft (the coastal maps: systems/Landing.js). Never bought: a land unit bought by the side that
 * lands comes in one, chosen by what it is — a squad in a Higgins boat, a vehicle in an LCT. They run in,
 * ground, drop the ramp and back off; sunk on the way in, what they carried is lost. `draft`: how far
 * up the sand she runs (the depth she grounds in).
 */
export const lcvp = ship({
  engine: 'engine.dieselSmall', // (her Gray diesel)
  id: 'lcvp', name: 'Landing Craft (LCVP)', shortName: 'LCVP', cost: 0, hidden: true, uncapped: true,
  hull: { length: 10.9, beam: 3.3 },
  stats: { landingCraft: true, draft: 0.9, hp: 260, armor: 0.04, speed: 9, accel: 0.8, /* (twice her 9 knots: the sea maps' scale) */ turnRate: 0.45, turretRate: 1, radius: 2.4, height: 2.6, eyeHeight: 3, sight: 400, smallCraft: true, stealth: 0.4,
    range: 0, aggroRange: 0, preferredRange: 0, leash: 20, damage: 0, fireCooldown: 1, spread: 0.02, boltSpeed: 800, boltSize: 0.5, splash: 0, pierce: 0 },
  mounts: { nato: [], pact: [] },
  camera: { distance: 26, height: 9, shoulder: 0 },
  models: { nato: buildLCVP, pact: buildLCVP, brit: buildLCA, wh: buildPiLB, jp: buildShohatsu },
  // each navy's own boat at her own size (entities/UnitStack.js armyType; the hold where the riders sit: systems/Landing.js board)
  armyType: {
    brit: { shortName: 'LCA', hull: { length: 12.6, beam: 3.0 }, hold: { y: 0.47, z: [-3.4, 4.2], w: 1.9, cols: 3 } },
    wh: { shortName: 'Pi-Boot', hull: { length: 15.5, beam: 4.5 }, hold: { y: 0.57, z: [-3.4, 5.6], w: 2.8, cols: 3 } },
    jp: { shortName: 'Shōhatsu', hull: { length: 10.6, beam: 2.4 }, hold: { y: 0.46, z: [-2.8, 3.6], w: 1.4, cols: 2 } },
  },
  factionStats: { brit: { armor: 0.08 } }, // (the LCA's armoured sides)
  variants: {
    nato: { name: 'LCVP Higgins boat', weapon: '2 × .30 machine guns', text: 'Plywood and a steel ramp: a section of riflemen from the transports to the sand. The ramp drops, they go — straight into whatever is waiting.' },
    pact: { name: 'Landing craft', weapon: 'machine guns', text: 'A small landing craft for a section of infantry.' },
    brit: { name: 'Landing Craft Assault (LCA)', weapon: 'Bren gun', text: 'Armoured sides, a low deck and a ramp: a platoon of riflemen run in from the landing ships, crouched below the gunwales.' },
    wh: { name: 'Pionierlandungsboot', weapon: 'MG 34', text: 'The engineers’ landing boat: a section of Grenadiers from the barges offshore to the shingle, the bow gate down and out.' },
    jp: { name: 'Shōhatsu landing barge', weapon: 'Type 96 LMG', text: 'The small sister of the Daihatsu: a squad of infantry run in over the reef edge and off the bow ramp.' },
  },
});
export const lct = ship({
  engine: 'engine.diesel',
  id: 'lct', name: 'Tank Landing Craft (LCT)', shortName: 'LCT', cost: 0, hidden: true, uncapped: true,
  hull: { length: 36.6, beam: 9.8 },
  stats: { landingCraft: true, draft: 1.3, hp: 1100, armor: 0.08, speed: 7, accel: 0.45, turnRate: 0.18, turretRate: 1, radius: 5, height: 5, eyeHeight: 6, sight: 500, smallCraft: true,
    range: 0, aggroRange: 0, preferredRange: 0, leash: 30, damage: 0, fireCooldown: 1, spread: 0.02, boltSpeed: 800, boltSize: 0.5, splash: 0, pierce: 0 },
  mounts: { nato: [], pact: [] },
  camera: { distance: 60, height: 18, shoulder: 0 },
  models: { nato: buildLCT, pact: buildLCT, brit: buildLCT4, wh: buildMFP, jp: buildDaihatsu },
  armyType: {
    brit: { shortName: 'LCT Mk 4', hull: { length: 57, beam: 11.8 }, hold: { y: 1.0, z: [-16, 20], w: 0, cols: 1 }, camera: { distance: 80, height: 22, shoulder: 0 } },
    wh: { shortName: 'MFP', hull: { length: 47, beam: 6.6 }, hold: { y: 1.06, z: [-6, 18], w: 0, cols: 1 }, camera: { distance: 70, height: 20, shoulder: 0 } },
    jp: { shortName: 'Daihatsu', hull: { length: 14.9, beam: 3.4 }, hold: { y: 0.53, z: [-3, 4.5], w: 2.2, cols: 3, vehicles: 1 }, camera: { distance: 32, height: 11, shoulder: 0 } },
  },
  factionStats: { wh: { hp: 1400 }, jp: { hp: 500, radius: 2.6, height: 2.6, eyeHeight: 3 } }, // (the MFP: bigger and armed; the Daihatsu: a 15 m barge)
  variants: {
    nato: { name: 'LCT Mk 6', weapon: '2 × 20 mm', text: 'A flat steel box with a ramp: tanks, half-tracks and guns straight onto the beach. Slow, big and an easy target on the run in.' },
    pact: { name: 'Tank landing craft', weapon: '20 mm', text: 'A landing craft for vehicles.' },
    brit: { name: 'LCT Mk 4', weapon: '2 × 20 mm Oerlikon', text: 'A long, thin-skinned box with a ramp: Churchills and carriers straight onto the beach.' },
    wh: { name: 'Marinefährprahm', weapon: '7.5 cm, 2 cm flak', text: 'The navy’s ferry barge: built for Sea Lion’s heirs, armed like a small gunboat, she grounds and drops her ramp for a tank or guns.' },
    jp: { name: 'Daihatsu landing barge', weapon: '2 × 7.7 mm', text: 'The Imperial Army’s workhorse barge: a bow ramp and a twin keel that slides up the sand, for a light tank or seventy men.' },
  },
});

// one Royal Navy for all three British armies; the Fallschirmjäger come in the Wehrmacht's boats
for (const t of [lcvp, lct]) for (const [a, b] of [['brit21', 'brit'], ['brit14', 'brit'], ['fj', 'wh']]) for (const k of ['variants', 'models', 'armyType', 'factionStats']) if (t[k][b]) t[k][a] = t[k][b];

/** A DD Sherman swimming in on its canvas screen (systems/Landing.js: never bought — a `dd` tank bought on a coastal map comes as one). */
export const ddCraft = ship({
  engine: 'engine.dieselSmall', // (the Sherman's engine driving her propellers)
  id: 'ddCraft', name: 'DD Tank (swimming)', shortName: 'DD tank', cost: 0, hidden: true, uncapped: true,
  hull: { length: 6, beam: 3 },
  stats: { landingCraft: true, dd: true, draft: 1.1, hp: 300, armor: 0.02, speed: 4, accel: 0.5, turnRate: 0.25, turretRate: 1, radius: 2.4, height: 1.6, eyeHeight: 2, sight: 300, smallCraft: true, stealth: 0.5,
    range: 0, aggroRange: 0, preferredRange: 0, leash: 20, damage: 0, fireCooldown: 1, spread: 0.02, boltSpeed: 800, boltSize: 0.5, splash: 0, pierce: 0 },
  mounts: { nato: [], pact: [] },
  camera: { distance: 18, height: 6, shoulder: 0 },
  models: { nato: buildDD, pact: buildDD },
  variants: { nato: { name: 'DD Sherman, swimming', weapon: '— (afloat)', text: 'A Sherman on a canvas screen, driven by two propellers: it swims in with the first wave. A wave over the screen and it sinks like a stone.' }, pact: { name: 'Swimming tank', weapon: '—', text: 'A swimming tank.' } },
});

/** A motor minesweeper (the coastal maps only: `coastal`): where she steams the sea mines are cut (systems/Landing.js sweeping). */
export const minesweeper = ship({
  fleet: 'escort', coastal: true,
  id: 'minesweeper', name: 'Minesweeper', shortName: 'Minesweeper', cost: 200, limit: 3,
  names: { nato: ['YMS-247', 'YMS-304', 'YMS-305', 'YMS-347', 'YMS-348', 'YMS-349', 'YMS-350', 'YMS-375'], pact: ['M 1', 'M 2', 'M 3'] },
  hull: { length: 41, beam: 7.5 },
  stats: { sweeper: 40, hp: 900, armor: 0.04, speed: 6, accel: 0.25, turnRate: 0.14, turretRate: 0.8, radius: 4, height: 6, eyeHeight: 8, sight: 1200, ...AA(500, 0.1, 0.02),
    range: 1500, aggroRange: 1500, preferredRange: 1000, leash: 40, damage: 90, fireCooldown: 4, spread: 0.014, boltSpeed: 750, boltSize: 1.2, splash: 2.5, pierce: 0.15 },
  mounts: { nato: [gun([0, 4, 16], FWD, { range: 1500, reload: 4, damage: 90, splash: 2.5, shell: 750, size: 1.2, arc: 4 })], pact: [gun([0, 4, 16], FWD, { range: 1500, reload: 4, damage: 90, splash: 2.5, shell: 750, size: 1.2, arc: 4 })] },
  camera: { distance: 70, height: 20, shoulder: 0 },
  models: { nato: buildYMS, pact: buildYMS },
  variants: {
    nato: { name: 'YMS motor minesweeper', weapon: 'one 3-inch gun, 20 mm', text: 'A wooden minesweeper with her sweep streamed astern: where she goes, the moored mines are cut and the water is safe for the boats. Slow and soft — keep her out of reach of the battery.' },
    pact: { name: 'Minensucher', weapon: 'one gun', text: 'A minesweeper.' },
  },
});

/**
 * LSM(R) rocket ship (the coastal maps: Iwo Jima): her racks fire `rockets.count` 5-inch rockets in a ripple, `every` s
 * apart, onto targets ashore only (`shore`) — a long arc, a wide pattern — then a long reload. Her own 5-inch aft.
 */
export const lsmr = ship({
  fleet: 'escort', coastal: true,
  id: 'lsmr', name: 'Rocket Ship', shortName: 'LSM(R)', cost: 380, limit: 2,
  names: { nato: ['LSM(R)-188', 'LSM(R)-189', 'LSM(R)-190', 'LSM(R)-191', 'LSM(R)-192', 'LSM(R)-193', 'LSM(R)-194', 'LSM(R)-195'], pact: ['—'] },
  hull: { length: 62, beam: 10.5 },
  stats: { hp: 1800, armor: 0.06, speed: 6.5, accel: 0.2, turnRate: 0.11, turretRate: 0.7, radius: 6, height: 9, eyeHeight: 10, sight: 1400, ...AA(500, 0.1, 0.02),
    range: 1900, aggroRange: 1900, preferredRange: 1200, leash: 40, damage: 220, fireCooldown: 4, spread: 0.012, boltSpeed: 800, boltSize: 1.6, splash: 4, pierce: 0.3 },
  mounts: {
    nato: [
      { at: [0, 4, 0], facing: 0, arc: 6.3, shore: true, range: 1900, reload: 75, damage: 150, splash: 6, scatter: 45, rockets: { count: 48, every: 0.06, speed: 190 } },
      gun([0, 4, -26], AFT, { ...FIVE_INCH, range: 1500, arc: 4 }),
    ],
    pact: [gun([0, 4, -26], AFT, { ...FIVE_INCH, range: 1500, arc: 4 })],
  },
  camera: { distance: 90, height: 26, shoulder: 0 },
  models: { nato: buildLSMR, pact: buildLSMR },
  variants: {
    nato: { name: 'LSM(R) rocket ship', weapon: '5-inch rockets in ripples, one 5-inch gun', text: 'A landing ship full of rocket launchers: she runs in close, and a ripple of fifty rockets falls on the beach and the first terraces at once — then a long reload. Shore targets only; soft, keep her away from the coast guns.' },
    pact: { name: 'Rocket ship', weapon: 'rockets', text: 'A rocket ship.' },
  },
});

/** The old battleship offshore (the coastal maps only): ten 14-inch guns on the batteries and the strongpoints inland. */
const FOURTEEN_INCH = { range: 3000, reload: 26, damage: 1400, splash: 10, pierce: 0.6, shell: 760, size: 3, spread: 0.008 };
export const oldBattleship = ship({
  fleet: 'line', coastal: true,
  id: 'oldBattleship', name: 'Old Battleship', shortName: 'Battleship', cost: 1100, limit: 1,
  names: { nato: ['Texas', 'Arkansas', 'Nevada'], pact: ['Schleswig-Holstein'] },
  hull: { length: 174, beam: 29 },
  stats: { hp: 13000, armor: 0.42, speed: 7, accel: 0.05, turnRate: 0.045, turretRate: 0.18, radius: 13, height: 30, eyeHeight: 34, sight: 3000, ...AA(700, 0.2, 0.05),
    range: 3000, aggroRange: 3000, preferredRange: 2600, leash: 80, damage: 1400, fireCooldown: 26, spread: 0.008, boltSpeed: 760, boltSize: 3, splash: 10, pierce: 0.6 },
  mounts: {
    nato: [gun([0, 14, 64], FWD, FOURTEEN_INCH), gun([0, 17, 50], FWD, FOURTEEN_INCH), gun([0, 13, -14], AFT, { ...FOURTEEN_INCH, arc: 4 }), gun([0, 16, -50], AFT, FOURTEEN_INCH), gun([0, 13, -64], AFT, FOURTEEN_INCH)],
    pact: [gun([0, 12, 50], FWD, { ...FOURTEEN_INCH, damage: 900 }), gun([0, 12, -50], AFT, { ...FOURTEEN_INCH, damage: 900 })],
  },
  camera: { distance: 150, height: 48, shoulder: 0 },
  models: { nato: buildTexas, pact: buildTexas },
  variants: {
    nato: { name: 'New York-class battleship', weapon: '10 × 14-inch, 5-inch casemate guns', text: 'Thirty years old and slow, but her ten 14-inch guns reach the batteries inland and break the strongpoints on the bluffs. Find her targets for her: what nobody has seen, she can\'t hit.' },
    pact: { name: 'Old battleship', weapon: '11-inch guns', text: 'An old battleship.' },
  },
});

// ---------------------------------------------------------------- the Atlantic and the Mediterranean
// The Royal Navy (the British armies `brit`, `brit21`, `brit14`: `own`, so at sea each fields only the classes given
// it here) and the Kriegsmarine (the Wehrmacht `wh`). Each class in a navy's slot: her names, model, variant, the
// mounts and the stats over her side's (as 1918's navy(): data/units1918/ships.js). Models: models/ships1945eu.js.

/** Ship type `t` in the navy of `armies`: her names, model, variant, mounts, stats (on the sea scale) and price. */
const navy = (t, armies, { names, model, variant, stats, mounts, cost }) => {
  for (const army of [].concat(armies)) {
    t.names = { ...t.names, [army]: names };
    t.models = { ...t.models, [army]: model };
    t.variants = { ...t.variants, [army]: variant };
    if (stats) t.factionStats = { ...t.factionStats, [army]: near(stats) };
    if (mounts) t.mounts = { ...t.mounts, [army]: mounts.map(near) };
    if (cost) t.armyCost = { ...t.armyCost, [army]: cost };
  }
};
const RN = ['brit', 'brit21', 'brit14'];
const RN_SHIPS = ['HMS Afridi', 'HMS Cossack', 'HMS Ashanti', 'HMS Bedouin', 'HMS Eskimo', 'HMS Somali', 'HMS Tartar', 'HMS Nubian', 'HMS Sikh', 'HMS Zulu', 'HMS Maori', 'HMS Punjabi', 'HMS Matabele', 'HMS Mashona', 'HMS Gurkha', 'HMS Mohawk'];
const TWIN_47 = { range: 2300, reload: 4.5, damage: 360, splash: 4, pierce: 0.3 };      // (4.7-inch twin: both shells in one salvo)
const TWIN_525 = { range: 2500, reload: 5, damage: 340, splash: 4.5, pierce: 0.4, shell: 920, size: 2, spread: 0.01 };
const EIGHT_RN = { range: 3000, reload: 10, damage: 620, splash: 7, pierce: 0.5, shell: 950, size: 2.6, spread: 0.009 };
const FOURTEEN_Q = { range: 3900, reload: 30, damage: 2600, splash: 12, pierce: 0.75, shell: 1000, size: 3.6, spread: 0.008 }; // (a quadruple turret: four shells)
const FOUR_FIVE = { range: 2200, reload: 4, damage: 300, splash: 4, pierce: 0.3, arc: 4 };

navy(frigate, RN, { names: ['HMS Rother', 'HMS Spey', 'HMS Exe', 'HMS Jed', 'HMS Tay', 'HMS Swale', 'HMS Itchen', 'HMS Lagan', 'HMS Mourne', 'HMS Ness', 'HMS Test', 'HMS Nadder'], model: S.buildRiver,
  stats: { hp: 2700, armor: 0.1, speed: 11, sonar: 1100, depthCharges: DC({ count: 8, reload: 12, radius: 45, damage: 1200 }), range: 1700, aggroRange: 1700, preferredRange: 1200, damage: 150 },
  mounts: [gun([0, 7, 36], FWD, { range: 1700, reload: 3, damage: 150 }), gun([0, 5, -30], AFT, { range: 1700, reload: 3, damage: 150 })],
  variant: { name: 'River-class frigate', weapon: '2 × 4-inch, Hedgehog, depth charges', text: 'The Atlantic escort: twice a corvette\'s range and speed, the Type 271 radar in its lantern and the Hedgehog that throws its bombs ahead while the asdic still holds the U-boat. Built in dozens to close the gap in mid-ocean.' } });
navy(destroyer, RN, { names: RN_SHIPS, model: S.buildTribal,
  stats: { hp: 4000, armor: 0.2, speed: 16, sonar: 850, range: 2300, aggroRange: 2300, preferredRange: 1600, damage: 360, fireCooldown: 4.5 },
  mounts: [gun([0, 7, 44], FWD, TWIN_47), gun([0, 10, 37], FWD, TWIN_47), gun([0, 10, -21], AFT, TWIN_47), gun([0, 7, -34], AFT, TWIN_47), torps([0, 6, -13], { count: 4, range: 1400, speed: 22 })],
  variant: { name: 'Tribal-class destroyer', weapon: '8 × 4.7-inch in twins, 4 torpedo tubes', text: 'Built for a gun fight: eight 4.7-inch guns in four twin gunhouses, more than any British destroyer before them. Cossack took the Altmark\'s prisoners off in a Norwegian fjord; Tribals finished the Bismarck off with torpedoes in the night.' } });
navy(lightCruiser, RN, { names: ['HMS Dido', 'HMS Euryalus', 'HMS Naiad', 'HMS Phoebe', 'HMS Sirius', 'HMS Charybdis', 'HMS Cleopatra', 'HMS Hermione', 'HMS Argonaut', 'HMS Scylla'], model: S.buildDido,
  stats: { hp: 7400, armor: 0.3, speed: 16.5, ...AA(950, 0.32, 0.07), range: 2500, aggroRange: 2500, preferredRange: 1800, damage: 340, fireCooldown: 5 },
  mounts: [gun([0, 9, 58], FWD, TWIN_525), gun([0, 11.5, 50], FWD, TWIN_525), gun([0, 14, 41], FWD, TWIN_525), gun([0, 11.5, -45], AFT, TWIN_525), gun([0, 9, -55], AFT, TWIN_525),
    torps([5.4, 7, -26], { count: 3 }), torps([-5.4, 7, -26], { count: 3 })],
  variant: { name: 'Dido-class light cruiser', weapon: '10 × 5.25-inch in twins, 6 torpedo tubes', text: 'An anti-aircraft cruiser: dual-purpose 5.25-inch turrets, three stepped up forward, that fire at ships and aircraft alike. Didos fought the Malta convoys through — Charybdis and Sirius sailed with Pedestal.' } });
navy(cruiser, RN, { names: ['HMS Kent', 'HMS Berwick', 'HMS Cumberland', 'HMS Suffolk', 'HMS Norfolk', 'HMS Dorsetshire', 'HMS London', 'HMS Devonshire', 'HMS Sussex', 'HMS Shropshire'], model: S.buildCounty,
  stats: { hp: 10500, armor: 0.35, speed: 15.5, range: 3000, aggroRange: 3000, preferredRange: 2200, damage: 620, fireCooldown: 10 },
  mounts: [gun([0, 11, 72], FWD, EIGHT_RN), gun([0, 14, 60], FWD, EIGHT_RN), gun([0, 14, -62], AFT, EIGHT_RN), gun([0, 11, -74], AFT, EIGHT_RN), torps([7, 10, -40], { count: 4 }), torps([-7, 10, -40], { count: 4 })],
  variant: { name: 'County-class heavy cruiser', weapon: '8 × 8-inch, 8 × 4-inch, torpedoes', text: 'A treaty cruiser: high-sided for the oceans of the Empire, three tall funnels, and the armour of a light cruiser. Norfolk and Suffolk shadowed Bismarck through the Denmark Strait on their radar; Dorsetshire torpedoed her.' } });
navy(battleship, RN, { names: ['HMS King George V', 'HMS Prince of Wales', 'HMS Duke of York', 'HMS Anson', 'HMS Howe'], model: S.buildKGV,
  stats: { hp: 25000, armor: 0.72, speed: 14.5, range: 3900, aggroRange: 3900, preferredRange: 3000, damage: 2600, fireCooldown: 30 },
  mounts: [gun([0, 14, 76], FWD, FOURTEEN_Q), gun([0, 18, 60], FWD, { ...FOURTEEN_Q, damage: 1300 }), gun([0, 14, -76], AFT, FOURTEEN_Q),
    SECONDARY([11, 15, 24], Math.PI / 2), SECONDARY([-11, 15, 24], -Math.PI / 2), SECONDARY([11, 15, -36], Math.PI / 2), SECONDARY([-11, 15, -36], -Math.PI / 2)],
  variant: { name: 'King George V-class battleship', weapon: '10 × 14-inch, 16 × 5.25-inch', text: 'Ten 14-inch guns in two quadruple turrets and a twin, the heaviest armour belt of any British battleship. King George V shot Bismarck to a wreck on 27 May 1941; Duke of York sank Scharnhorst off the North Cape at night, by radar.' } });
navy(carrier, RN, { names: ['HMS Illustrious', 'HMS Victorious', 'HMS Formidable', 'HMS Indomitable'], model: S.buildIllustrious,
  stats: { carrier: { deck: 15.6, deckLen: 215, airGroup: { navCap: 3, diveBomb: 2, torpBomb: 3, navScout: 1 } }, hp: 21000, armor: 0.5, speed: 15, range: 2200, aggroRange: 2200, preferredRange: 2600, damage: 300, fireCooldown: 4 }, // (an armoured box: a smaller air group than an Essex, but bombs that would sink a US carrier bounce off her deck)
  mounts: [gun([19, 14, 72], FWD, FOUR_FIVE), gun([-19, 14, 72], FWD, FOUR_FIVE), gun([19, 14, -80], AFT, FOUR_FIVE), gun([-19, 14, -80], AFT, FOUR_FIVE)],
  variant: { name: 'Illustrious-class armoured carrier', weapon: 'Sea Hurricanes, Albacores, Swordfish', text: 'A carrier built for the narrow seas, within reach of land-based bombers: her hangar an armoured box. Illustrious\'s Swordfish crippled the Italian fleet at Taranto; Victorious\'s torpedoed Bismarck; Indomitable and Victorious covered Pedestal.' } });
navy(submarine, RN, { names: ['HMS Triton', 'HMS Thunderbolt', 'HMS Torbay', 'HMS Truant', 'HMS Turbulent', 'HMS Taku', 'HMS Tally-Ho', 'HMS Trenchant', 'HMS Tigris', 'HMS Thrasher'], model: S.buildTClass,
  stats: { submarine: { submerged: 4, dive: 1.4, periscope: 6, deep: 40 }, hp: 2200, speed: 9.5, radius: 4.5, height: 5.5, range: 1600, aggroRange: 1600, preferredRange: 1100, damage: 160 },
  mounts: [TUBES([0, -1, 40], 0, { count: 6, range: 1500, speed: 22, damage: 2600, reload: 60 }), TUBES([0, -1, -40], Math.PI, { count: 1, range: 1500, speed: 22, damage: 2600, reload: 70 }), gun([0, 4.5, 12], 0, { range: 1200, reload: 5, damage: 160, splash: 3, surfaced: true, arc: 5.2 })],
  variant: { name: 'T-class submarine', weapon: '11 torpedo tubes, 4-inch', text: 'Ten tubes forward — the heaviest bow salvo of any submarine of the war — and one aft. Out of Malta and Alexandria the T-boats sank the convoys to Rommel\'s army.' } });
navy(ptBoat, RN, { names: ['MTB 102', 'MTB 74', 'MTB 34', 'MTB 218', 'MTB 237', 'MTB 241', 'MTB 260', 'MTB 266'], model: S.buildVosperMTB,
  stats: { hp: 380, speed: 20 },
  mounts: [torps([0, 2, 1], { facing: FWD, arc: 0.7, count: 2, range: 1100, speed: 18, damage: 2400, reload: 9999 }), gun([0, 3, -6], AFT, { range: 1000, reload: 1.2, damage: 55, splash: 1, shell: 800, size: 0.8, arc: 5 })],
  variant: { name: 'Vosper motor torpedo boat', weapon: '2 torpedoes, twin .5s', text: 'Coastal Forces\' plywood boats: in at 39 knots on three Packard engines, two torpedoes, out again. They fought the S-boats in the Channel by night and ran the narrows of the Mediterranean.' } });
const MERCHANT = { model: S.buildMerchantRN, variant: { name: 'Merchantman', weapon: 'one 4-inch gun, 20 mm', text: 'A cargo ship of the convoy, a Merchant Navy crew and a few naval gunners: slow and soft. While she lies in a zone of yours her cargo brings in command points — lose her and the convoy has failed.' } };
navy(transport, 'brit', { ...MERCHANT, names: ['MV Melbourne Star', 'MV Brisbane Star', 'MV Rochester Castle', 'MV Port Chalmers', 'SS Ohio', 'MV Dorset', 'MV Waimarama', 'MV Deucalion', 'MV Glenorchy', 'MV Wairangi'] }); // (Pedestal's)
navy(transport, ['brit21', 'brit14'], { ...MERCHANT, names: ['SS Assyrian', 'SS Empire Miniver', 'SS Beatus', 'SS Fiscus', 'SS Creekirk', 'SS Scoresby', 'SS Empire Brigade', 'SS Sedgepool', 'SS Clintonia', 'SS Shirak', 'SS Wandby', 'SS Ruperra'] }); // (the North Atlantic's: SC 7 and HX 79, October 1940)

// the Kriegsmarine, for the Wehrmacht and the Fallschirmjäger alike (one nation, one navy): no carrier — Graf Zeppelin
// was launched in 1938 and never commissioned — and no rocket ship (the slots below `armies` keep both armies out of:
// no Japanese or American ship in a German's slot)
const KM_ARMIES = ['wh', 'fj'];
const NOT_KM = ['us', 'sov', 'usmc', 'brit', 'brit21', 'brit14', 'jp'];
for (const t of [carrier, escortCarrier, lsmr]) t.armies = NOT_KM;
const FIFTEEN_DD = { range: 2500, reload: 7.5, damage: 440, splash: 5, pierce: 0.4, shell: 920, size: 2, spread: 0.01 };   // (the twin turret: both shells)
const TWENTY_KM = { range: 3100, reload: 9, damage: 640, splash: 7, pierce: 0.55, shell: 950, size: 2.6, spread: 0.0085 }; // (German rangefinders: the tightest salvoes)
const THIRTY_EIGHT = { range: 4000, reload: 26, damage: 1500, splash: 11, pierce: 0.75, shell: 1000, size: 3.8, spread: 0.0075 };
navy(destroyer, KM_ARMIES, { names: ['Z 23', 'Z 24', 'Z 25', 'Z 26', 'Z 27', 'Z 28', 'Z 29', 'Z 30', 'Z 31', 'Z 32', 'Z 33', 'Z 34', 'Z 37', 'Z 38', 'Z 39'], model: S.buildNarvik, cost: 480,
  stats: { hp: 4400, armor: 0.2, speed: 16, sonar: 700, range: 2500, aggroRange: 2500, preferredRange: 1800, damage: 440, fireCooldown: 7.5 }, // (balance, AI soaks 2026-11-20: the heavy guns slow and wet — they lost the Biscay fight)
  mounts: [gun([0, 8, 48], FWD, FIFTEEN_DD), gun([0, 10.5, -24], AFT, { ...FIFTEEN_DD, damage: 220, reload: 6 }), gun([0, 8, -38], AFT, { ...FIFTEEN_DD, damage: 220, reload: 6 }), gun([0, 8, -48], AFT, { ...FIFTEEN_DD, damage: 220, reload: 6 }),
    torps([0, 8, 5], { count: 4, range: 1500, reload: 110 }), torps([0, 6, -16], { count: 4, range: 1500, reload: 110 })],
  variant: { name: 'Zerstörer 1936A (Narvik)', weapon: '5 × 15 cm (twin forward), 8 torpedo tubes', text: 'The Narvik class: a light cruiser\'s 15 cm guns on a destroyer — heavy shells that outranged any British destroyer, but a wet, slow-firing gun in a seaway. Numbered, not named: Z 23 to Z 39.' } });
navy(cruiser, KM_ARMIES, { names: ['Admiral Hipper', 'Prinz Eugen', 'Blücher'], model: S.buildHipper,
  stats: { hp: 11500, armor: 0.45, speed: 16, range: 3100, aggroRange: 3100, preferredRange: 2300, damage: 640, fireCooldown: 9 },
  mounts: [gun([0, 10, 74], FWD, TWENTY_KM), gun([0, 13, 62], FWD, TWENTY_KM), gun([0, 13, -58], AFT, TWENTY_KM), gun([0, 10, -70], AFT, TWENTY_KM),
    torps([8.6, 8, -36], { count: 6, range: 1500, reload: 140 }), torps([-8.6, 8, -36], { count: 6, range: 1500, reload: 140 })],
  variant: { name: 'Admiral Hipper-class heavy cruiser', weapon: '8 × 20.3 cm, 12 × 10.5 cm, 12 torpedo tubes', text: 'Big, fast and well armed, the Atlantic bow and the tower bridge of the big ships. Prinz Eugen sailed with Bismarck and fired the first hits on Hood; Hipper fell on the Arctic convoys.' } });
navy(battleship, KM_ARMIES, { names: ['Bismarck', 'Tirpitz'], model: S.buildBismarck,
  stats: { hp: 27000, armor: 0.72, speed: 15, range: 4000, aggroRange: 4000, preferredRange: 3000, damage: 3000, fireCooldown: 26 },
  mounts: [gun([0, 15, 90], FWD, THIRTY_EIGHT), gun([0, 19, 74], FWD, THIRTY_EIGHT), gun([0, 19, -70], AFT, THIRTY_EIGHT), gun([0, 15, -86], AFT, THIRTY_EIGHT),
    SECONDARY([11.5, 11, 30], Math.PI / 2), SECONDARY([-11.5, 11, 30], -Math.PI / 2), SECONDARY([11.5, 11, -46], Math.PI / 2), SECONDARY([-11.5, 11, -46], -Math.PI / 2)],
  variant: { name: 'Bismarck-class battleship', weapon: '8 × 38 cm, 12 × 15 cm, 16 × 10.5 cm', text: 'Anton, Bruno, Caesar, Dora: four twin 38 cm turrets and a wide, steady hull. Bismarck sank Hood in the Denmark Strait with her fifth salvo; three days later a Swordfish\'s torpedo jammed her rudders and the Home Fleet caught her. Tirpitz lay in the Norwegian fjords and held half the Home Fleet in Scapa Flow.' } });
navy(submarine, KM_ARMIES, { names: ['U 47', 'U 99', 'U 100', 'U 96', 'U 552', 'U 201', 'U 556', 'U 73', 'U 81', 'U 331', 'U 557', 'U 559', 'U 371', 'U 205'], model: S.buildTypeVII, cost: 380,
  stats: { submarine: { submerged: 3.8, dive: 1.8, periscope: 6, deep: 40 }, hp: 1700, armor: 0.08, speed: 9, radius: 3.5, height: 5, eyeHeight: 7, hearing: 2600, range: 1600, aggroRange: 1600, preferredRange: 1100, damage: 200 }, // (she dived in under 30 s; the GHG hydrophones heard a convoy far beyond sight)
  mounts: [TUBES([0, -1, 30], 0, { count: 4, range: 1500, speed: 22, damage: 2600, reload: 45 }), TUBES([0, -1, -32], Math.PI, { count: 1, range: 1500, speed: 22, damage: 2600, reload: 60 }), gun([0, 4, 9], 0, { range: 1300, reload: 4, damage: 200, splash: 3, surfaced: true, arc: 5.2 })],
  variant: { name: 'Type VIIC U-boat', weapon: '5 torpedo tubes, 8.8 cm, 2 cm', text: 'The Atlantic\'s wolf: some 570 of them were built, more than any other submarine. They hunted in packs, closed the convoys on the surface at night, fired, dived. Cheap and quick to bring in — and in 1943 the escorts\' radar, Hedgehogs and aircraft turned the hunters into the hunted.' } });
navy(ptBoat, KM_ARMIES, { names: ['S 30', 'S 36', 'S 58', 'S 59', 'S 38', 'S 100', 'S 54', 'S 61'], model: S.buildSBoot,
  stats: { hp: 620, speed: 21, radius: 3.5, height: 3.5, eyeHeight: 4.5, range: 1100, aggroRange: 1200, preferredRange: 800 },
  mounts: [torps([0, 2, 12], { facing: FWD, arc: 0.7, count: 2, range: 1400, speed: 22, damage: 2600, reload: 120 }), gun([0, 3, -12], AFT, { range: 1000, reload: 1, damage: 55, splash: 1, shell: 800, size: 0.8, arc: 5 })],
  variant: { name: 'Schnellboot (S 38 class)', weapon: '2 torpedo tubes and 2 reloads, 2 cm', text: 'The E-boat: a round-bilged diesel boat, bigger and more seaworthy than any British MTB, at 40 knots. S 30, S 36, S 58 and S 59 tore into Pedestal\'s merchantmen off Cape Bon in the night of 13 August 1942.' } });

// the Kriegsmarine's escort, light cruiser and merchantman, and the coastal maps' sweeper and old battleship
const TEN_FIVE = { range: 1700, reload: 3.5, damage: 150 };
navy(frigate, KM_ARMIES, { names: ['T 22', 'T 23', 'T 24', 'T 25', 'T 26', 'T 27', 'T 28', 'T 29', 'T 30', 'T 31', 'T 32', 'T 33', 'T 34', 'T 35', 'T 36'], model: S.buildElbing, cost: 300,
  stats: { hp: 2500, armor: 0.1, speed: 13.5, sonar: 700, depthCharges: DC({ count: 4, reload: 18 }), range: 1700, aggroRange: 1700, preferredRange: 1200, damage: 150, fireCooldown: 3.5 }, // (33 knots: as fast as a destroyer, lighter armed)
  mounts: [gun([0, 7, 39], FWD, TEN_FIVE), gun([0, 9, 32], FWD, TEN_FIVE), gun([0, 9, -26], AFT, TEN_FIVE), gun([0, 6, -37], AFT, TEN_FIVE),
    torps([0, 7, 3], { count: 3, range: 1500, reload: 110 }), torps([0, 6, -18], { count: 3, range: 1500, reload: 110 })],
  variant: { name: 'Flottentorpedoboot 1939 (Elbing)', weapon: '4 × 10.5 cm, 6 torpedo tubes, depth charges', text: 'The fleet torpedo boat: a small destroyer in all but name, fast, with six tubes and four 10.5 cm. T 24 and T 27 fought the Channel nights of 1944; she escorts the convoys and goes in with torpedoes.' } });
const T15 = { range: 2600, reload: 8.5, damage: 600, splash: 5, pierce: 0.45, shell: 920, size: 2.2, spread: 0.01 };   // (the triple turret: all three shells)
navy(lightCruiser, KM_ARMIES, { names: ['Leipzig', 'Nürnberg'], model: S.buildLeipzig, cost: 580,
  stats: { hp: 7800, armor: 0.3, speed: 16, range: 2600, aggroRange: 2600, preferredRange: 1900, damage: 600, fireCooldown: 8.5 },
  mounts: [gun([0, 10, 60], FWD, T15), gun([0, 12, -50], AFT, T15), gun([0, 9.5, -62], AFT, T15), torps([6, 7, -38], { count: 3, range: 1500, reload: 130 }), torps([-6, 7, -38], { count: 3, range: 1500, reload: 130 })],
  variant: { name: 'Leipzig-class light cruiser', weapon: '9 × 15 cm in triples, 12 torpedo tubes', text: 'Three triple 15 cm turrets, two of them aft, and diesels for a long cruise beside her turbines. Leipzig and Nürnberg screened the fleet in the North Sea and the Baltic; Nürnberg came through the war.' } });
navy(transport, KM_ARMIES, { names: ['Ankara', 'Reichenfels', 'Menes', 'Ruhr', 'Ithaka', 'Kreta', 'Sparta', 'Tinos'], model: S.buildHansa, // (German freighters on Rommel's supply run)
  mounts: [gun([0, 8, -55], AFT, { range: 1500, reload: 5, damage: 110, splash: 3, arc: 4 })],
  variant: { name: 'Hansa-type freighter', weapon: 'one 10.5 cm, 2 cm flak', text: 'The standard German cargo ship, built in yards across occupied Europe: slow and soft, a few navy gunners aboard. While she lies in a zone of yours her cargo brings in command points.' } });
const SWEEP_GUN = (at, facing, o) => gun(at, facing, { range: 1500, reload: 4, damage: 90, splash: 2.5, shell: 750, size: 1.2, arc: 4, ...o });
navy(minesweeper, KM_ARMIES, { names: ['M 261', 'M 264', 'M 265', 'M 266', 'M 267', 'M 272', 'M 273', 'M 274'], model: S.buildM40,
  stats: { hp: 1100, damage: 120, fireCooldown: 4 },
  mounts: [SWEEP_GUN([0, 6, 20], FWD, { damage: 120 }), SWEEP_GUN([0, 4, -16], AFT, { damage: 120 })],
  variant: { name: 'Minensuchboot 1940', weapon: '2 × 10.5 cm, 3.7 cm, 2 cm', text: 'The coal-burning fleet minesweeper, a 10.5 cm fore and aft: she cuts the moored mines ahead of the barges with her sweep streamed astern. Sturdier than any Allied motor sweeper, but still slow — keep her out of the coast guns\' reach.' } });
navy(oldBattleship, KM_ARMIES, { names: ['Schleswig-Holstein', 'Schlesien'], model: S.buildSchleswig, cost: 800,
  stats: { hp: 9500, armor: 0.32, speed: 6.5, range: 2800, aggroRange: 2800, preferredRange: 2400, damage: 900, fireCooldown: 26 },
  mounts: [gun([0, 12, 42], FWD, { ...FOURTEEN_INCH, range: 2800, damage: 900 }), gun([0, 10, -40], AFT, { ...FOURTEEN_INCH, range: 2800, damage: 900 }), SECONDARY([11, 5, 4], Math.PI / 2), SECONDARY([-11, 5, 4], -Math.PI / 2)],
  variant: { name: 'Schleswig-Holstein (old battleship)', weapon: '4 × 28 cm, 15 cm casemate guns', text: 'A pre-dreadnought of 1908, kept as a training ship: two twin 28 cm turrets and a casemate battery. She fired the war\'s first shots on the Westerplatte; offshore her heavy shells still reach the batteries and strongpoints inland — given someone to spot for her.' } });

// the Royal Navy's coastal ships: the fleet minesweeper, and the LCT(R) in the LSM(R)'s slot
const ALGERINE = {
  model: S.buildAlgerine, stats: { hp: 1200, speed: 6.5, damage: 110 },
  mounts: [SWEEP_GUN([0, 7.5, 22], FWD, { damage: 110 }), gun([0, 6, -10], AFT, { range: 900, reload: 1.2, damage: 30, splash: 1, shell: 800, size: 0.7, arc: 4 })],
  variant: { name: 'Algerine-class minesweeper', weapon: 'one 4-inch, 20 mm', text: 'The Royal Navy\'s fleet minesweeper: steel, steam and a long forecastle, the 4-inch forward and the sweep gear on her quarterdeck. Algerines swept the lanes in to Sicily and Normandy ahead of the landing craft.' },
};
navy(minesweeper, 'brit', { ...ALGERINE, names: ['HMS Cadmus', 'HMS Circe', 'HMS Espiegle', 'HMS Fantome', 'HMS Hebe', 'HMS Mutine', 'HMS Rinaldo', 'HMS Rosario'] }); // (the 12th Flotilla's, Sicily 1943)
navy(minesweeper, ['brit21', 'brit14'], { ...ALGERINE, names: ['HMS Fly', 'HMS Hound', 'HMS Hydra', 'HMS Orestes', 'HMS Pelorus', 'HMS Pique', 'HMS Ready', 'HMS Rattlesnake'] }); // (Algerines off Normandy)
navy(lsmr, RN, { names: ['LCT(R) 334', 'LCT(R) 362', 'LCT(R) 368', 'LCT(R) 405', 'LCT(R) 423', 'LCT(R) 439', 'LCT(R) 448', 'LCT(R) 452'], model: S.buildLCTR, cost: 340,
  stats: { hp: 1100, armor: 0.05, speed: 5.5, radius: 5, height: 6, eyeHeight: 7, range: 1700, aggroRange: 1700, preferredRange: 1100, damage: 30, fireCooldown: 1.2 },
  mounts: [
    { at: [0, 4, 0], facing: 0, arc: 6.3, shore: true, range: 1700, reload: 110, damage: 130, splash: 6, scatter: 55, rockets: { count: 64, every: 0.04, speed: 180 } }, // (her whole load in one ripple, a wide pattern — then a long wait)
    gun([0, 4, -22], AFT, { range: 900, reload: 1.2, damage: 30, splash: 1, shell: 800, size: 0.7, arc: 4 }),
  ],
  variant: { name: 'LCT(R) rocket craft', weapon: 'some 1,000 5-inch rocket projectors, 2 × 20 mm', text: 'A tank landing craft with her deck plated over and packed with rocket projectors: she runs in, and in half a minute her whole load falls on the beach defences at once — then nothing more until she has reloaded. Shore targets only; thin-skinned.' } });

// the Imperial Navy's fleet minesweeper (the Pacific's landing maps)
navy(minesweeper, 'jp', { names: ['W-1', 'W-2', 'W-3', 'W-4', 'W-5', 'W-6'], model: S.buildW1,
  stats: { hp: 1100, speed: 6.5, damage: 110 },
  mounts: [SWEEP_GUN([0, 6, 28], FWD, { damage: 110 }), SWEEP_GUN([0, 6, -11], AFT, { damage: 110, arc: 3.4 }), SWEEP_GUN([0, 4, -22], AFT, { damage: 110 })],
  variant: { name: 'W-1-class minesweeper', weapon: '3 × 12 cm, machine guns', text: 'The Imperial Navy\'s fleet minesweeper of the 1920s: two funnels, three 12 cm guns and the sweep gear aft. W-boats cleared the anchorages for every landing from Hong Kong to the Philippines.' } });

export const SHIPS_1945 = { frigate, destroyer, cruiser, battleship, submarine, carrier, ptBoat, lightCruiser, escortCarrier, transport, lcvp, lct, minesweeper, oldBattleship, ddCraft, lsmr };
// (the Imperial Navy's ships under the Imperial Japanese Army's name too: the Pacific's sea maps field `jp`, which is `own`)
for (const t of Object.values(SHIPS_1945)) if (t.variants?.pact) t.variants.jp ??= t.variants.pact;
