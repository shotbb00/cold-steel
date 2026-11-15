// 1918 at sea (the North Sea maps whose epochs include 1918): the Royal Navy on the `nato` side, the
// Kaiserliche Marine on the `pact` side. The same slots and rules as 1945 (data/units45/ships.js: gun
// mounts with arcs, torpedo spreads, submarines, depth charges, the sea scale), on the First War's terms:
// no radar — the night is the lookouts' and the searchlights' (the Germans' better: star shells and
// searchlight drill, Jutland's night action) — no ASDIC, only hydrophones that hear a boat close by;
// slower torpedoes that run shorter; little anti-aircraft fire; coal smoke. German rangefinders and
// shells: the tighter salvoes; British guns: the heavier ones. Battlecruisers: big guns on thin armour.
import { buildQueenElizabeth, buildBayern, buildLion, buildDerfflinger, buildCaledon, buildKonigsberg, buildVandW, buildGrossesTorpedoboot, buildFlower, buildABoot, buildEClass, buildUB3, buildCMB, buildLM, buildTroopshipRN, buildTroopshipKM } from '../models/ships1918.js';

const NAVAL = { naval: true, eyeHeight: 18, aimHeight: 4, nightSight: { nato: 0.4, pact: 0.48 }, crew: 0, breakMorale: 0, smoke: undefined, grenades: 0, lightAT: 0, fov: 6.3, burst: 1, burstInterval: 0, aimTime: 1, magSize: 9999, reloadTime: 1, antiArmor: true, tracer: 1 };
const FWD = 0;
const AFT = Math.PI;
const BEAM = Math.PI / 2;

/** Anti-aircraft fire: a 3-inch high-angle gun or two, a pom-pom, the Lewis guns — against Zeppelins and seaplanes, and little of it. */
const AA = (range, hitNear, hitFar) => ({ antiAir: { range, optical: 1, rate: 1, burst: 3, pause: 1, hitNear: hitNear * 0.3, hitFar: hitFar * 0.3 } });
const gun = (at, facing, o) => ({ at, facing, arc: 4.6, spread: 0.013, splash: 4, pierce: 0.3, shell: 760, size: 1.8, ...o });
/** Depth charges: the Type D, dropped over the stern where the hydrophones heard her. */
const DC = (o) => ({ count: 4, reload: 22, radius: 35, damage: 1000, ...o });
const SMOKE_GEN = { last: 50, cooldown: 140 };   // (funnel smoke: the stokers make it black)
/** A torpedo mount: slower and shorter-legged than 1945's. */
const torps = (at, o) => ({ at, torpedo: true, arc: 2.2, count: 2, range: 1300, speed: 18, damage: 2400, reload: 110, ...o });
const TUBES = (at, facing, o) => torps(at, { facing, arc: 0.9, ...o });

/** The sea scale, as 1945's (data/units45/ships.js RANGE). */
const RANGE = 0.55;
const SCALED = ['range', 'aggroRange', 'preferredRange', 'sight', 'sonar', 'hearing'];
const near = (o) => { const r = { ...o }; for (const k of SCALED) if (r[k]) r[k] = Math.round(r[k] * RANGE / 5) * 5; return r; };

const ship = (o) => ({
  category: 'naval', kind: 'vehicle', role: 'fighter',
  formation: { count: 1, columns: 1, spacing: 0 },
  weaponSound: 'naval', engine: 'engine.ship', tracks: 'wash',
  ...o,
  stats: near({ ...NAVAL, weapon: 'cannon', ...o.stats }),
  ...(o.factionStats && { factionStats: Object.fromEntries(Object.entries(o.factionStats).map(([k, v]) => [k, near(v)])) }),
  ...(o.mounts && { mounts: Object.fromEntries(Object.entries(o.mounts).map(([side, list]) => [side, list.map(near)])) }),
});

// ---------------------------------------------------------------- the line

const FIFTEEN_INCH = { range: 3700, reload: 30, damage: 2200, splash: 12, pierce: 0.75, shell: 800, size: 3.8, spread: 0.011 };
const THIRTY_EIGHT = { range: 3700, reload: 32, damage: 2200, splash: 12, pierce: 0.8, shell: 800, size: 3.8, spread: 0.009 };
const CASEMATE = (at, facing, o) => gun(at, facing, { range: 2000, reload: 5, damage: 200, splash: 4, pierce: 0.25, arc: 2.2, ...o });

export const battleship = ship({
  fleet: 'line',
  id: 'battleship', name: 'Dreadnought', shortName: 'Dreadnought', cost: 1300, limit: 1,
  names: { nato: ['Queen Elizabeth', 'Warspite', 'Valiant', 'Barham', 'Malaya'], pact: ['Bayern', 'Baden'] },
  hull: { length: 196, beam: 27.6 },
  stats: { flareRounds: 4, hp: 24000, armor: 0.68, speed: 13, accel: 0.06, turnRate: 0.05, turretRate: 0.18, radius: 14, height: 30, sight: 3400, ...AA(500, 0.12, 0.03), range: 3700, aggroRange: 3700, preferredRange: 3000, leash: 100, damage: 2200, fireCooldown: 30, spread: 0.011, boltSpeed: 800, boltSize: 3.8, splash: 12, pierce: 0.75 },
  factionStats: { pact: { hp: 25000, armor: 0.74, speed: 12, flareRounds: 8 } },   // (Bayern: Tirpitz's "a ship should stay afloat": better armour, a knot slower)
  mounts: {
    nato: [gun([0, 12, 70], FWD, FIFTEEN_INCH), gun([0, 15, 56], FWD, FIFTEEN_INCH), gun([0, 15, -48], AFT, FIFTEEN_INCH), gun([0, 12, -62], AFT, FIFTEEN_INCH),
      CASEMATE([13, 6, 20], BEAM), CASEMATE([-13, 6, 20], -BEAM), CASEMATE([13, 6, -10], BEAM), CASEMATE([-13, 6, -10], -BEAM)],
    pact: [gun([0, 12, 64], FWD, THIRTY_EIGHT), gun([0, 15, 50], FWD, THIRTY_EIGHT), gun([0, 15, -46], AFT, THIRTY_EIGHT), gun([0, 12, -60], AFT, THIRTY_EIGHT),
      CASEMATE([14, 6, 20], BEAM, { reload: 4.5 }), CASEMATE([-14, 6, 20], -BEAM, { reload: 4.5 }), CASEMATE([14, 6, -10], BEAM, { reload: 4.5 }), CASEMATE([-14, 6, -10], -BEAM, { reload: 4.5 })],
  },
  camera: { distance: 190, height: 58, shoulder: 0 },
  models: { nato: buildQueenElizabeth, pact: buildBayern },
  variants: {
    nato: { name: 'Queen Elizabeth-class battleship', weapon: '8 × 15-inch, 14 × 6-inch', text: 'The fast battleship: eight 15-inch guns on an oil-fired hull that could keep up with the battlecruisers. The heaviest shells in the North Sea.' },
    pact: { name: 'Bayern-class battleship', weapon: '8 × 38 cm, 16 × 15 cm', text: 'Germany\'s last and best dreadnought: guns to match the Queen Elizabeths, armour to outlast them, a knot slower.' },
  },
});

const THIRTEEN_FIVE = { range: 3500, reload: 28, damage: 1600, splash: 10, pierce: 0.65, shell: 800, size: 3.4, spread: 0.012 };
const THIRTY_CM = { range: 3500, reload: 26, damage: 1400, splash: 10, pierce: 0.7, shell: 800, size: 3.2, spread: 0.009 };

export const cruiser = ship({
  fleet: 'line',
  id: 'cruiser', name: 'Battlecruiser', shortName: 'Battlecruiser', cost: 950, limit: 2,
  names: { nato: ['Lion', 'Princess Royal', 'Tiger', 'New Zealand'], pact: ['Derfflinger', 'Hindenburg', 'Seydlitz', 'Moltke', 'Von der Tann'] },
  hull: { length: 213, beam: 27 },
  stats: { flareRounds: 4, hp: 16000, armor: 0.42, speed: 14.5, accel: 0.07, turnRate: 0.055, turretRate: 0.2, radius: 13, height: 28, sight: 3400, ...AA(500, 0.12, 0.03), range: 3500, aggroRange: 3500, preferredRange: 2800, leash: 100, damage: 1600, fireCooldown: 28, spread: 0.012, boltSpeed: 800, boltSize: 3.4, splash: 10, pierce: 0.65 },
  factionStats: { pact: { hp: 18000, armor: 0.55, speed: 14, flareRounds: 8 } },   // (Derfflinger: smaller guns, far better protected — Jutland's lesson)
  mounts: {
    nato: [gun([0, 14, 80], FWD, THIRTEEN_FIVE), gun([0, 17, 66], FWD, THIRTEEN_FIVE), gun([0, 11, -24], AFT, { ...THIRTEEN_FIVE, arc: 4 }), gun([0, 11, -68], AFT, THIRTEEN_FIVE),
      CASEMATE([12, 7, 30], BEAM, { range: 1800, damage: 140 }), CASEMATE([-12, 7, 30], -BEAM, { range: 1800, damage: 140 })],
    pact: [gun([0, 10, 74], FWD, THIRTY_CM), gun([0, 13, 60], FWD, THIRTY_CM), gun([0, 13, -50], AFT, THIRTY_CM), gun([0, 10, -64], AFT, THIRTY_CM),
      CASEMATE([13, 5, 20], BEAM, { reload: 4.5 }), CASEMATE([-13, 5, 20], -BEAM, { reload: 4.5 }), CASEMATE([13, 5, -12], BEAM, { reload: 4.5 }), CASEMATE([-13, 5, -12], -BEAM, { reload: 4.5 })],
  },
  camera: { distance: 190, height: 56, shoulder: 0 },
  models: { nato: buildLion, pact: buildDerfflinger },
  variants: {
    nato: { name: 'Lion-class battlecruiser', weapon: '8 × 13.5-inch, 16 × 4-inch', text: 'Fisher\'s "Splendid Cat": battleship guns at cruiser speed — and cruiser armour. Fast enough to choose her fight, thin enough to lose it.' },
    pact: { name: 'Derfflinger-class battlecruiser', weapon: '8 × 30.5 cm, 12 × 15 cm', text: 'Smaller guns than the British, but a hull that took twenty heavy hits at Jutland and came home. Accurate, tough, a knot slower.' },
  },
});

// ---------------------------------------------------------------- light cruisers

const SIX_INCH = { range: 2400, reload: 7, damage: 330, splash: 5, pierce: 0.4, shell: 780, size: 2.2, spread: 0.013 };
const FIFTEEN_CM = { range: 2400, reload: 7, damage: 300, splash: 5, pierce: 0.4, shell: 780, size: 2.2, spread: 0.011 };

export const lightCruiser = ship({
  fleet: 'line',
  id: 'lightCruiser', name: 'Light Cruiser', shortName: 'Light cruiser', cost: 550, limit: 3,
  names: { nato: ['Caledon', 'Calypso', 'Caradoc', 'Cardiff', 'Ceres', 'Calliope', 'Cassandra', 'Caroline'], pact: ['Königsberg', 'Karlsruhe', 'Emden', 'Nürnberg', 'Pillau', 'Frankfurt', 'Elbing', 'Regensburg'] },
  hull: { length: 137, beam: 13 },
  stats: { flareRounds: 6, hp: 6500, armor: 0.28, speed: 15.5, accel: 0.09, turnRate: 0.075, turretRate: 0.4, radius: 9, height: 14, sight: 2800, sonar: 0, ...AA(450, 0.1, 0.02), range: 2400, aggroRange: 2400, preferredRange: 1800, leash: 70, damage: 330, fireCooldown: 7, spread: 0.013, boltSpeed: 780, boltSize: 2.2, splash: 5, pierce: 0.4 },
  factionStats: { pact: { hp: 7000, speed: 15, flareRounds: 10 } },
  mounts: {
    nato: [gun([0, 9, 56], FWD, SIX_INCH), gun([0, 11, 26], FWD, SIX_INCH), gun([0, 7, -6], AFT, { ...SIX_INCH, arc: 4 }), gun([0, 9, -42], AFT, SIX_INCH), gun([0, 7, -56], AFT, SIX_INCH),
      torps([3.5, 6, -22], { count: 4, reload: 140 })],
    pact: [gun([2.6, 9, 58], FWD, FIFTEEN_CM), gun([-2.6, 9, 58], FWD, FIFTEEN_CM), gun([5.6, 7, 22], BEAM, { ...FIFTEEN_CM, arc: 3 }), gun([-5.6, 7, 22], -BEAM, { ...FIFTEEN_CM, arc: 3 }),
      gun([5.6, 7, -20], BEAM, { ...FIFTEEN_CM, arc: 3 }), gun([-5.6, 7, -20], -BEAM, { ...FIFTEEN_CM, arc: 3 }), gun([0, 9, -50], AFT, FIFTEEN_CM), gun([0, 7, -62], AFT, FIFTEEN_CM),
      torps([3.6, 6, -30], { count: 4, reload: 140 })],
  },
  camera: { distance: 130, height: 40, shoulder: 0 },
  models: { nato: buildCaledon, pact: buildKonigsberg },
  variants: {
    nato: { name: 'C-class light cruiser', weapon: '5 × 6-inch, 8 torpedo tubes', text: 'The Harwich Force\'s cruisers: fast, every gun on the centreline to fire both ways. They lead the destroyers in and scout for the fleet.' },
    pact: { name: 'Königsberg-class light cruiser', weapon: '8 × 15 cm, 4 torpedo tubes, mines', text: 'The scouting groups\' cruiser: more guns than the British, half of them on the beam. Fast, and handy at night with her searchlights and star shells.' },
  },
});

// ---------------------------------------------------------------- flotillas and escorts

const FOUR_INCH = { range: 1900, reload: 4, damage: 160, splash: 3.5, pierce: 0.25, shell: 750, size: 1.5 };
const EIGHT_EIGHT = { range: 1800, reload: 3.5, damage: 130, splash: 3, pierce: 0.2, shell: 750, size: 1.4 };

export const destroyer = ship({
  fleet: 'escort',
  id: 'destroyer', name: 'Destroyer', shortName: 'Destroyer', cost: 400,
  names: { nato: ['Vendetta', 'Valentine', 'Vanoc', 'Vimy', 'Wakeful', 'Walker', 'Whitley', 'Winchester', 'Valorous', 'Velox', 'Venturous', 'Verdun', 'Wessex', 'Wolfhound'], pact: ['S 53', 'S 54', 'V 43', 'V 44', 'G 101', 'G 102', 'S 113', 'V 70', 'B 97', 'B 98', 'H 145', 'S 63'] },
  hull: { length: 95, beam: 9 },
  stats: { flareRounds: 4, hp: 3000, armor: 0.12, speed: 16, accel: 0.13, turnRate: 0.1, turretRate: 0.55, radius: 6, height: 9, sight: 2400, sonar: 500, depthCharges: DC(), smokeGen: SMOKE_GEN, ...AA(400, 0.08, 0.02), range: 1900, aggroRange: 1900, preferredRange: 1300, leash: 60, damage: 160, fireCooldown: 4, spread: 0.013, boltSpeed: 750, boltSize: 1.5, splash: 3.5, pierce: 0.25 },
  factionStats: { pact: { hp: 2600, flareRounds: 8 } },
  mounts: {
    nato: [gun([0, 7, 38], FWD, FOUR_INCH), gun([0, 9, 28], FWD, FOUR_INCH), gun([0, 8, -30], AFT, FOUR_INCH), gun([0, 6, -40], AFT, FOUR_INCH),
      torps([0, 5, -6], { count: 3 }), torps([0, 5, -20], { count: 3 })],
    pact: [gun([0, 6, 34], FWD, EIGHT_EIGHT), gun([0, 5, -2], AFT, { ...EIGHT_EIGHT, arc: 3.6 }), gun([0, 5, -36], AFT, EIGHT_EIGHT),
      torps([2.2, 5, 4], { count: 1, range: 1500, speed: 19 }), torps([-2.2, 5, 4], { count: 1, range: 1500, speed: 19 }), torps([0, 5, -16], { count: 2, range: 1500, speed: 19 }), torps([0, 5, -26], { count: 2, range: 1500, speed: 19 })],
  },
  camera: { distance: 85, height: 28, shoulder: 0 },
  models: { nato: buildVandW, pact: buildGrossesTorpedoboot },
  variants: {
    nato: { name: 'V and W-class destroyer', weapon: '4 × 4-inch, 6 torpedo tubes', text: 'The best destroyer of the war: four guns superfiring at both ends, two triple tubes. Screens the line, hunts U-boats, makes the torpedo attack.' },
    pact: { name: 'Large torpedo boat (S 53 type)', weapon: '3 × 8.8 cm, 6 torpedo tubes', text: 'The High Seas Fleet\'s destroyer: lighter guns than the British, more torpedoes reaching further. Her trade is the night attack in flotillas.' },
  },
});

export const frigate = ship({
  fleet: 'escort',
  id: 'frigate', name: 'Escort', shortName: 'Escort', cost: 260,
  names: { nato: ['Arabis', 'Buttercup', 'Lavender', 'Poppy', 'Primrose', 'Wallflower', 'Snapdragon', 'Lychnis', 'Gentian', 'Crocus'], pact: ['A 26', 'A 27', 'A 40', 'A 41', 'A 42', 'A 43', 'A 46', 'A 47', 'A 58', 'A 59'] },
  hull: { length: 81, beam: 10 },
  stats: { flareRounds: 2, hp: 2200, armor: 0.08, speed: 10, accel: 0.14, turnRate: 0.12, turretRate: 0.6, radius: 6, height: 8, sight: 2000, sonar: 650, depthCharges: DC({ count: 6, reload: 16 }), smokeGen: SMOKE_GEN, ...AA(400, 0.08, 0.02), range: 1800, aggroRange: 1800, preferredRange: 1200, leash: 50, damage: 170, fireCooldown: 4.5, spread: 0.014, boltSpeed: 750, boltSize: 1.4, splash: 3, pierce: 0.2 },
  factionStats: { pact: { hp: 1300, speed: 13, sonar: 450, flareRounds: 4, depthCharges: DC({ count: 2, reload: 24 }) } },   // (the A-boat: small, quick, a torpedo — and a couple of charges)
  mounts: {
    nato: [gun([0, 7, 30], FWD, { range: 1800, reload: 4.5, damage: 170 }), gun([0, 6, -32], AFT, { range: 1800, reload: 4.5, damage: 170 })],
    pact: [gun([0, 4, 18], FWD, EIGHT_EIGHT), gun([0, 4, -18], AFT, EIGHT_EIGHT), torps([0, 3, -8], { count: 1, range: 1300 })],
  },
  camera: { distance: 75, height: 24, shoulder: 0 },
  models: { nato: buildFlower, pact: buildABoot },
  variants: {
    nato: { name: 'Flower-class sloop', weapon: '2 × 4.7-inch, depth charges', text: 'Built like a merchantman for the convoys: slow, but she carries the most depth charges and listens longest on her hydrophones. The U-boat\'s hunter.' },
    pact: { name: 'A-class coastal torpedo boat', weapon: '2 × 8.8 cm, a torpedo tube', text: 'The Flanders flotillas\' small boat: quick and cheap, with a torpedo for a raid in the dark and a gun for the drifters.' },
  },
});

export const submarine = ship({
  fleet: 'under',
  id: 'submarine', name: 'Submarine', shortName: 'Submarine', cost: 450, limit: 2,
  names: { nato: ['E 34', 'E 35', 'E 45', 'E 46', 'E 51', 'E 52', 'E 54', 'E 55'], pact: ['UB 88', 'UB 110', 'UB 112', 'UB 116', 'UB 123', 'UB 124', 'UB 125', 'UB 128'] },
  hull: { length: 55, beam: 6.9 },
  stats: {
    submarine: { submerged: 3.4, dive: 1.1, periscope: 5, deep: 30 }, hp: 1600, armor: 0.08, speed: 8.5, accel: 0.1, turnRate: 0.12, turretRate: 0.6, radius: 4, height: 5, eyeHeight: 6,
    sight: 1600, hearing: 1600, range: 1400, aggroRange: 1400, preferredRange: 1000, leash: 60, damage: 140, fireCooldown: 6, spread: 0.016, boltSpeed: 750, boltSize: 1.1, splash: 3, pierce: 0.2,
  },
  factionStats: { pact: { speed: 8, hearing: 1800 } },
  mounts: {
    nato: [TUBES([0, -1, 26], 0, { count: 2, range: 1200, damage: 2200, reload: 60 }), TUBES([0, -1, -26], Math.PI, { count: 1, range: 1200, damage: 2200, reload: 70 }), gun([0, 3, 8], 0, { range: 1100, reload: 5, damage: 120, splash: 2.5, surfaced: true, arc: 5.2 })],
    pact: [TUBES([0, -1, 26], 0, { count: 4, range: 1300, damage: 2400, reload: 60 }), TUBES([0, -1, -26], Math.PI, { count: 1, range: 1300, damage: 2400, reload: 70 }), gun([0, 3, 7.5], 0, { range: 1200, reload: 4.5, damage: 140, splash: 3, surfaced: true, arc: 5.2 })],
  },
  camera: { distance: 60, height: 18, shoulder: 0 },
  models: { nato: buildEClass, pact: buildUB3 },
  variants: {
    nato: { name: 'E-class submarine', weapon: '5 torpedo tubes, 12-pounder', text: 'The Royal Navy\'s patrol boat: she lies off the German bases and waits for a big ship to come out. Slow submerged, and blind but for the periscope.' },
    pact: { name: 'UB III U-boat', weapon: '5 torpedo tubes, 8.8 cm', text: 'The U-boat that nearly starved Britain: four bow tubes, a deck gun for the small fry. Submerged only the hydrophones hear her — and only close by.' },
  },
});

export const ptBoat = ship({
  fleet: 'escort',
  id: 'ptBoat', name: 'Motor Torpedo Boat', shortName: 'Motor boat', cost: 120,
  names: { nato: ['CMB 4', 'CMB 7', 'CMB 24', 'CMB 31', 'CMB 62', 'CMB 79', 'CMB 86', 'CMB 88'], pact: ['LM 1', 'LM 4', 'LM 8', 'LM 12', 'LM 16', 'LM 20', 'LM 22', 'LM 26'] },
  hull: { length: 16.8, beam: 3.4 },
  stats: { hp: 300, armor: 0, speed: 20, accel: 0.45, turnRate: 0.3, turretRate: 1, radius: 3, height: 2.5, eyeHeight: 3, sight: 1300, stealth: 0.6, smallCraft: true, ...AA(350, 0.06, 0.01), range: 700, aggroRange: 800, preferredRange: 500, leash: 40, damage: 30, fireCooldown: 1.5, spread: 0.025, boltSpeed: 700, boltSize: 0.6, splash: 0.8, pierce: 0.05 },
  factionStats: { pact: { speed: 17, hp: 260 } },
  mounts: {
    nato: [torps([0, 1.5, -4], { facing: FWD, arc: 0.6, count: 1, range: 1000, speed: 18, damage: 2200, reload: 9999 }), gun([0, 2.4, 0], AFT, { range: 700, reload: 1.5, damage: 30, splash: 0.8, shell: 700, size: 0.6, arc: 6 })],
    pact: [torps([0, 1.5, 3], { facing: FWD, arc: 0.6, count: 1, range: 1000, speed: 18, damage: 2200, reload: 9999 }), gun([0, 2.4, 0], AFT, { range: 700, reload: 1.5, damage: 30, splash: 0.8, shell: 700, size: 0.6, arc: 6 })],
  },
  camera: { distance: 34, height: 10, shoulder: 0 },
  models: { nato: buildCMB, pact: buildLM },
  variants: {
    nato: { name: 'Coastal Motor Boat', weapon: 'a torpedo, Lewis guns', text: 'A planing hull from Thornycroft at 40 knots: in under the guns, the torpedo slides out tail first over the stern, and she swerves away before it overtakes her.' },
    pact: { name: 'LM boat', weapon: 'a torpedo, a machine gun', text: 'A motor boat driven by Zeppelin engines, out of Zeebrugge: one torpedo and a dash in the dark. Fragile, and helpless in a rough sea.' },
  },
});

export const transport = ship({
  fleet: 'under',
  id: 'transport', name: 'Transport', shortName: 'Transport', cost: 220,
  names: { nato: ['SS Mona\'s Isle', 'SS King Orry', 'SS Royal Edward', 'SS Viper', 'SS Duchess of Argyll', 'SS Princess Victoria'], pact: ['SS Corsica', 'SS Bahia Castillo', 'SS Cassel', 'SS Coburg', 'SS Plauen', 'SS Wittekind'] },
  hull: { length: 125, beam: 16 },
  stats: { landing: true, hp: 6000, armor: 0.08, speed: 8, accel: 0.05, turnRate: 0.05, turretRate: 0.4, radius: 8, height: 14, sight: 2000, ...AA(300, 0.05, 0.01), range: 1400, aggroRange: 1400, preferredRange: 1200, leash: 60, damage: 100, fireCooldown: 6, spread: 0.016, boltSpeed: 700, boltSize: 1.3, splash: 3, pierce: 0.15 },
  mounts: {
    nato: [gun([0, 9, -55], AFT, { range: 1400, reload: 6, damage: 100, splash: 3, arc: 4 })],
    pact: [gun([0, 9, -53], AFT, { range: 1400, reload: 6, damage: 100, splash: 3, arc: 4 })],
  },
  camera: { distance: 105, height: 34, shoulder: 0 },
  models: { nato: buildTroopshipRN, pact: buildTroopshipKM },
  variants: {
    nato: { name: 'Troopship', weapon: 'one 12-pounder', text: 'A cross-Channel steamer taken up for trooping: soft and slow, but the landing party she carries holds a zone and brings in command points.' },
    pact: { name: 'Truppentransporter', weapon: 'one 8.8 cm', text: 'A Norddeutscher Lloyd liner in grey, as off Ösel in 1917: the troops aboard hold a zone and bring in command points.' },
  },
});

export const SHIPS_1918 = { battleship, cruiser, lightCruiser, destroyer, frigate, submarine, ptBoat, transport };
