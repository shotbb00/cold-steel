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
import { buildFletcher, buildKagero, buildBuckley, buildKaibokan, buildBaltimore, buildTakao, buildIowa, buildYamato, buildGato, buildB1, buildEssex, buildShokaku, buildElcoPT, buildGyoraitei, buildCleveland, buildAgano, buildCasablanca, buildTaiyo, buildLiberty, buildMaru } from '../models/ships1945.js';
import { buildLCVP, buildLCT } from '../models/landingCraft45.js';

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
  id: 'lcvp', name: 'Landing Craft (LCVP)', shortName: 'LCVP', cost: 0, hidden: true, uncapped: true,
  hull: { length: 10.9, beam: 3.3 },
  stats: { landingCraft: true, draft: 0.9, hp: 260, armor: 0.04, speed: 4.6, accel: 0.6, turnRate: 0.45, turretRate: 1, radius: 2.4, height: 2.6, eyeHeight: 3, sight: 400, smallCraft: true, stealth: 0.4,
    range: 0, aggroRange: 0, preferredRange: 0, leash: 20, damage: 0, fireCooldown: 1, spread: 0.02, boltSpeed: 800, boltSize: 0.5, splash: 0, pierce: 0 },
  mounts: { nato: [], pact: [] },
  camera: { distance: 26, height: 9, shoulder: 0 },
  models: { nato: buildLCVP, pact: buildLCVP },
  variants: {
    nato: { name: 'LCVP Higgins boat', weapon: '2 × .30 machine guns', text: 'Plywood and a steel ramp: a section of riflemen from the transports to the sand. The ramp drops, they go — straight into whatever is waiting.' },
    pact: { name: 'Landing craft', weapon: 'machine guns', text: 'A small landing craft for a section of infantry.' },
  },
});
export const lct = ship({
  id: 'lct', name: 'Tank Landing Craft (LCT)', shortName: 'LCT', cost: 0, hidden: true, uncapped: true,
  hull: { length: 36.6, beam: 9.8 },
  stats: { landingCraft: true, draft: 1.3, hp: 1100, armor: 0.08, speed: 3.6, accel: 0.3, turnRate: 0.18, turretRate: 1, radius: 5, height: 5, eyeHeight: 6, sight: 500, smallCraft: true,
    range: 0, aggroRange: 0, preferredRange: 0, leash: 30, damage: 0, fireCooldown: 1, spread: 0.02, boltSpeed: 800, boltSize: 0.5, splash: 0, pierce: 0 },
  mounts: { nato: [], pact: [] },
  camera: { distance: 60, height: 18, shoulder: 0 },
  models: { nato: buildLCT, pact: buildLCT },
  variants: {
    nato: { name: 'LCT Mk 6', weapon: '2 × 20 mm', text: 'A flat steel box with a ramp: tanks, half-tracks and guns straight onto the beach. Slow, big and an easy target on the run in.' },
    pact: { name: 'Tank landing craft', weapon: '20 mm', text: 'A landing craft for vehicles.' },
  },
});

export const SHIPS_1945 = { frigate, destroyer, cruiser, battleship, submarine, carrier, ptBoat, lightCruiser, escortCarrier, transport, lcvp, lct };
