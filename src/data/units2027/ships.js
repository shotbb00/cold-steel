// 2027 at sea, the Baltic: the US Navy and the Polish Navy (`nato`, `pl`) against the Russian Baltic Fleet
// (`pact`). The 1985 slots and ids (data/units/ships85.js: the maps, the formations and the admiral carry
// over), the 1985 scale — missiles at about a third of their real speed, the sub/supersonic gap kept — and
// its systems: systems/Missiles.js (flight, seekers, chaff, the layered defence), Sensors.js, Torpedoes.js.
// Each slot is one navy's ship per army: `nato` the US Navy's, `pl` the Polish Navy's, `pact` Russia's.
// The two NATO navies sail as one task group: each fields its own ship in a slot, else its ally's where that
// makes sense — Poland the US Navy's Arleigh Burke in the destroyer slot (the group's air-defence ship), the
// US Navy Poland's Orkans in the missile-boat slot (it has no small combatants of its own in the Baltic).
// Poland has no submarine (ORP Orzeł is gone, the Orka not yet bought), no amphibious ships, no carrier (`armies`).
// What's new in the stats (systems/Missiles.js): `stealth` on a missile (NSM: the defence sees it later),
// `sprint` (Kalibr: the last run in at Mach 2.9), and the shore batteries' `antiShip` fired at sea too.
// Models: models/ships2027.js.
import * as S from '../models/ships2027.js';
import * as D from '../models/seaDrones2027.js';
import rockets from '../units/rockets.ts';

const NAVAL = { naval: true, eyeHeight: 20, aimHeight: 4, nightSight: { nato: 0.6, pact: 0.55 }, crew: 0, breakMorale: 0, smoke: undefined, grenades: 0, lightAT: 0, fov: 6.3, burst: 1, burstInterval: 0, aimTime: 1, magSize: 9999, reloadTime: 1, antiArmor: true, tracer: 1, esm: true, sight: 1600 };
const FWD = 0;
const AFT = Math.PI;
const AA = (range, hitNear, hitFar) => ({ antiAir: { range, optical: 1, rate: 2.4, burst: 6, pause: 0.4, hitNear: hitNear * 0.3, hitFar: hitFar * 0.3 } });
const RADAR = (range = 3000, height = 30) => ({ range, height });

const gun = (at, facing, o) => ({ at, facing, arc: 4.6, spread: 0.01, splash: 3, pierce: 0.3, shell: 900, size: 1.6, ...o });
const DC = (o) => ({ count: 4, reload: 16, radius: 45, damage: 1300, ...o });
const torps = (at, o) => ({ at, torpedo: true, arc: 2.2, count: 2, range: 1800, speed: 24, damage: 3000, reload: 40, ...o });
const TUBES = (at, facing, o) => torps(at, { facing, arc: 2.6, homing: true, ...o });
const ASROC = { range: 1500, speed: 24, damage: 2200, reload: 25 }; // (VL-ASROC; Paket-NK, Otvet: a homing torpedo flown or fired out to the submarine)

// the guns
const G30 = { range: 900, reload: 0.5, damage: 40, splash: 1.2, size: 0.8 };      // (Mk 46 30 mm, AK-630 on a landing ship)
const G57 = { range: 1300, reload: 0.8, damage: 70, splash: 2, size: 1 };          // (Mk 110 / Bofors 57 Mk 3: fast, programmable shells)
const G76 = { range: 1200, reload: 1, damage: 80, splash: 2, size: 1.1 };          // (OTO 76/62, AK-176MA)
const G100 = { range: 1500, reload: 1.6, damage: 140, splash: 2.5, size: 1.3 };    // (A-190)
const G5IN = { range: 1600, reload: 2.5, damage: 180, splash: 3 };                // (Mk 45 Mod 4, 5-inch/62)
const G130 = { range: 1600, reload: 2.2, damage: 220, splash: 3.5 };              // (A-192M, single 130 mm)

// the missiles (systems/Missiles.js): 1985's scale — subsonic 160, Mach 2.5 about 280
const MSL = (o) => ({ at: [0, 8, 0], missile: true, arc: 6.3, count: 2, reload: 8, pierce: 0.6, ...o });
const NSM = { count: 4, name: 'NSMs', speed: 160, range: 4800, seeker: 1200, skim: true, stealth: 0.7, damage: 1900 }; // (Naval Strike Missile: shaped and coated to be seen late, an imaging seeker that picks the ship out of the chaff)
const RBS15 = { count: 2, name: 'RBS15s', speed: 165, range: 4400, seeker: 1200, skim: true, damage: 2000 };   // (RBS15 Mk3, Orkan's)
const TOMAHAWK = { count: 2, name: 'Tomahawks', speed: 160, range: 6000, seeker: 1400, skim: true, damage: 2800 }; // (Block Va Maritime Strike: the land-attack missile with a ship seeker)
const URAN = { count: 4, name: 'Kh-35Us', speed: 160, range: 4400, seeker: 1100, skim: true, damage: 1700 };  // (Uran, Bal: the Russian Harpoon)
const KALIBR = { count: 4, name: 'Kalibrs', speed: 160, sprint: 290, range: 5600, seeker: 1300, skim: true, damage: 2600 }; // (3M54: subsonic all the way, then the warhead stage breaks off at Mach 2.9 for the last 20 km)
const ONIKS = { count: 2, name: 'Oniks', speed: 270, range: 5000, seeker: 1500, alt: 30, damage: 3000, pierce: 0.7 };  // (P-800: Mach 2.5, high, down for the run in)
const ZIRCON = { count: 2, name: 'Zircons', speed: 520, range: 5800, seeker: 1800, alt: 50, damage: 3600, pierce: 0.75 }; // (3M22: hypersonic, very few aboard; little time to shoot at it — Missiles.js FAST)

// the defences: area SAMs, point SAMs, the last-ditch gun, chaff, the jammer
const SM6 = { range: 3000, channels: 6, load: 48, reload: 0.7, speed: 360, pk: 0.5, shots: 2 }; // (SPY-6 and Aegis Baseline 10: SM-2 and SM-6 — two shots at what the first missed)
const SM2 = { range: 2600, channels: 4, load: 24, reload: 1, speed: 330, pk: 0.5 };              // (Constellation: Aegis, SPY-6(V)3, SM-2 in her 32 cells)
const ESSM = { range: 1300, channels: 4, load: 24, reload: 1, speed: 320, pk: 0.5 };             // (Evolved Sea Sparrow, four to a cell)
const RAM = { range: 500, channels: 2, load: 21, reload: 1, speed: 300, pk: 0.55 };               // (Rolling Airframe Missile, Mk 49: 21 rounds)
const CAMM = { range: 1300, channels: 3, load: 24, reload: 1.2, speed: 320, pk: 0.5 };            // (Sea Ceptor: Miecznik's)
const POLIMENT = { range: 2600, channels: 8, load: 40, reload: 1, speed: 340, pk: 0.5 };          // (Poliment-Redut: four fixed faces, 32 cells)
const REDUT = { range: 2000, channels: 3, load: 16, reload: 1.5, speed: 320, pk: 0.45 };          // (Redut on the 20380: 12 cells, the Furke radar)
const PANTSIR = { range: 700, channels: 3, load: 32, reload: 1.2, speed: 300, pk: 0.45 };         // (Pantsir-M: the missiles; its guns are its CIWS)
const PHALANX = { range: 300, pk: 0.22 };   // (Block 1B)
const AK630 = { range: 260, pk: 0.18 };     // (AK-630M)
const DUET = { range: 280, pk: 0.22 };      // (AK-630M-2 Duet, Pantsir-M's twin 30 mm, Palash: two guns)
const MILLENNIUM = { range: 280, pk: 0.2 }; // (35 mm Millennium: Miecznik's)
const CHAFF = { count: 8, cooldown: 8 };
const ECM = { nato: 0.3, pact: 0.3 }; // (balance 2026-11-19, AI soaks: Russian air defence raised toward the Burke's so the Baltic Fleet isn't swept first) // (SEWIP, the TK-25 sets: a little better than 1985's)

/** One class: the shared parts and the class's own. */
const ship = (o) => ({
  category: 'naval', kind: 'vehicle', role: 'fighter',
  formation: { count: 1, columns: 1, spacing: 0 },
  weaponSound: 'naval', engine: 'engine.ship', tracks: 'wash',
  ...o,
  stats: { ...NAVAL, weapon: 'cannon', leash: 80, spread: 0.01, boltSpeed: 900, boltSize: 1.6, splash: 3, pierce: 0.3, fireCooldown: 3, ...o.stats },
});

export const frigate = ship({
  fleet: 'escort',
  id: 'frigate', name: 'Frigate', shortName: 'Frigate', cost: 380, armyCost: { ru: 330 }, // (balance: the Steregushchiy carries half the Constellation's missiles — Russia fields more of them)
  names: { nato: ['Constellation', 'Congress', 'Chesapeake', 'Lafayette', 'Hamilton'], pl: ['ORP Wicher', 'ORP Burza', 'ORP Huragan'], pact: ['Steregushchiy', 'Soobrazitelny', 'Boikiy', 'Stoikiy', 'Merkuriy'] },
  hull: { length: 140, beam: 18 },
  stats: { helo: 7, hp: 3600, armor: 0.05, speed: 15, accel: 0.14, turnRate: 0.1, turretRate: 0.8, radius: 7, height: 14, radar: RADAR(3200, 28), sonar: 800, depthCharges: DC(), asTorp: ASROC, ...AA(500, 0.2, 0.05),
    defence: { sam: SM2, point: RAM, chaff: CHAFF, ecm: ECM.nato }, range: 4800, aggroRange: 4800, preferredRange: 2800, damage: 70 },
  factionStats: {
    pl: { helo: 7, hp: 3400, radar: RADAR(3000, 26), defence: { sam: CAMM, ciws: MILLENNIUM, chaff: CHAFF, ecm: ECM.nato } },
    pact: { helo: 5.5, hp: 2600, speed: 14.5, accel: 0.16, turnRate: 0.12, radius: 5.5, height: 12, radar: RADAR(2800, 24), sonar: 700, defence: { sam: REDUT, ciws: AK630, chaff: CHAFF, ecm: ECM.pact }, range: 4400, aggroRange: 4400, preferredRange: 2600 },
  },
  mounts: {
    nato: [MSL({ ...NSM, at: [0, 10, -12], load: 16 }), gun([0, 9, 48], FWD, G57)],
    pl: [MSL({ ...NSM, at: [0, 10, 18], load: 8 }), gun([0, 9, 46], FWD, G57)],
    pact: [MSL({ ...URAN, at: [0, 8, -6], load: 8 }), gun([0, 8, 36], FWD, G100)],
  },
  camera: { distance: 100, height: 30, shoulder: 0 },
  models: { nato: S.buildConstellation, pl: S.buildMiecznik, pact: S.buildSteregushchiy },
  variants: {
    nato: { name: 'Constellation-class frigate', weapon: '16 NSM, SM-2, RAM, 57 mm', text: 'The new frigate on the FREMM hull: an Aegis set with the SPY-6 radar, 32 cells for Standard missiles and sixteen NSMs that come in low and hard to see.' },
    pl: { name: 'Miecznik frigate', weapon: '8 NSM, Sea Ceptor (CAMM), 57 mm, 35 mm', text: 'Poland\'s new frigate on the British Type 31 hull (the first due in 2029: here a year early) — Sea Ceptor over the group, eight NSMs, a helicopter.' },
    pact: { name: 'Steregushchiy-class corvette', weapon: '8 Kh-35U (Uran), Redut, 100 mm, AK-630M', text: 'The Baltic Fleet\'s workhorse: small and stealthy, eight Urans, a few Redut missiles for her own defence and a good sonar.' },
  },
});

export const destroyer = ship({
  fleet: 'escort',
  id: 'destroyer', name: 'Destroyer', shortName: 'Destroyer', cost: 620, armyCost: { ru: 560 }, // (the Gorshkov: a frigate against the Burke, fewer cells)
  names: { nato: ['Jack H. Lucas', 'Ted Stevens', 'Jeremiah Denton', 'Louis H. Wilson Jr.', 'Sam Nunn', 'William Charette'], pact: ['Admiral Gorshkov', 'Admiral Kasatonov', 'Admiral Golovko', 'Admiral Isakov'] },
  hull: { length: 150, beam: 19 },
  stats: { helo: 7, hp: 5000, armor: 0.06, speed: 15.5, accel: 0.12, turnRate: 0.09, turretRate: 0.6, radius: 8, height: 18, radar: RADAR(3600, 35), sonar: 900, depthCharges: DC(), asTorp: ASROC, ...AA(600, 0.2, 0.05),
    defence: { sam: SM6, point: ESSM, ciws: PHALANX, chaff: CHAFF, ecm: ECM.nato }, range: 6000, aggroRange: 6000, preferredRange: 3000, damage: 180 },
  factionStats: { pact: { helo: 6, hp: 4400, speed: 15, radius: 7, height: 16, radar: RADAR(3200, 30), sonar: 800, defence: { sam: POLIMENT, ciws: DUET, chaff: CHAFF, ecm: ECM.pact }, range: 5800, aggroRange: 5800, preferredRange: 3000 } },
  mounts: {
    nato: [MSL({ ...TOMAHAWK, at: [0, 10, -45], load: 8, reload: 12 }), MSL({ ...NSM, at: [0, 10, -20], load: 8 }), gun([0, 9, 56], FWD, G5IN)],
    pact: [MSL({ ...ONIKS, at: [0, 9, 30], load: 12 }), MSL({ ...ZIRCON, at: [0, 9, 30], load: 4, reload: 20 }), gun([0, 9, 52], FWD, G130)],
  },
  camera: { distance: 110, height: 34, shoulder: 0 },
  models: { nato: S.buildBurke3, pact: S.buildGorshkov },
  variants: {
    nato: { name: 'Arleigh Burke-class destroyer (Flight III)', weapon: '96 VLS: SM-6, SM-2, ESSM, Tomahawk; NSM, 5-inch, Phalanx', text: 'The SPY-6 radar sees further and tracks more than any Aegis before her: the shield of the task group, with anti-ship Tomahawks and NSMs. The Polish Navy sails with her too.' },
    pact: { name: 'Admiral Gorshkov-class frigate', weapon: '16 UKSK: Oniks, Zircon; Poliment-Redut, 130 mm', text: 'Russia\'s best surface combatant: a fixed-face radar and 32 Redut cells for her defence, Oniks and the hypersonic Zircon for the attack.' },
  },
});

export const ptBoat = ship({
  fleet: 'escort',
  id: 'ptBoat', name: 'Missile Boat', shortName: 'Missile boat', cost: 240, // (`nato`: Poland's, with the US Navy too)
  names: { nato: ['ORP Orkan', 'ORP Piorun', 'ORP Grom'], pact: ['Odintsovo', 'Sovetsk', 'Mytishchi', 'Tsiklon', 'Askold', 'Burya', 'Uragan'] },
  hull: { length: 60, beam: 10 },
  stats: { hp: 1100, armor: 0.02, speed: 18, accel: 0.3, turnRate: 0.22, turretRate: 1, radius: 4.5, height: 9, eyeHeight: 12, stealth: 0.75, smallCraft: true, radar: RADAR(2600, 14), ...AA(500, 0.18, 0.04),
    defence: { point: PANTSIR, ciws: DUET, chaff: { count: 6, cooldown: 9 }, ecm: ECM.pact }, range: 5600, aggroRange: 5600, preferredRange: 3200, leash: 50, damage: 80 },
  factionStats: { nato: { hp: 700, speed: 20, accel: 0.4, turnRate: 0.26, radius: 3.6, height: 7, eyeHeight: 9, stealth: 0.7, radar: RADAR(2400, 10), defence: { ciws: AK630, chaff: { count: 4, cooldown: 10 }, ecm: ECM.nato }, range: 4400, aggroRange: 4400, preferredRange: 3000, leash: 40 } },
  mounts: {
    nato: [MSL({ ...RBS15, at: [0, 5, -10], load: 8 }), gun([0, 5, 14], FWD, G76)],
    pact: [MSL({ ...KALIBR, at: [0, 6, -8], load: 4, count: 2 }), MSL({ ...ONIKS, at: [0, 6, -8], load: 4 }), gun([0, 6, 22], FWD, G76)],
  },
  camera: { distance: 60, height: 18, shoulder: 0 },
  models: { nato: S.buildOrkan, pact: S.buildKarakurt },
  variants: {
    nato: { name: 'Orkan-class missile boat', weapon: '8 RBS15 Mk3, 76 mm, AK-630M', text: 'The Polish Navy\'s: built in Gdańsk on an East German hull, rearmed with Swedish missiles. Small, fast and hard to see among the islands — and no defence but her gatling and chaff.' },
    pact: { name: 'Karakurt-class corvette', weapon: '8 UKSK: Kalibr, Oniks; Pantsir-M, 76 mm', text: 'A small missile ship with a cruiser\'s punch: eight Kalibrs and Oniks, and the Pantsir-M\'s missiles and guns against what comes back.' },
  },
});

export const corvette = ship({
  fleet: 'escort',
  id: 'corvette', name: 'Missile Corvette', shortName: 'Corvette', cost: 280, armies: ['ru'],
  names: { pact: ['Zeleny Dol', 'Serpukhov', 'Vyshny Volochyok', 'Orekhovo-Zuyevo', 'Ingushetiya', 'Grad'] },
  hull: { length: 74, beam: 11 },
  stats: { hp: 1300, armor: 0.02, speed: 14, accel: 0.25, turnRate: 0.18, turretRate: 1, radius: 5, height: 10, eyeHeight: 13, stealth: 0.8, smallCraft: true, radar: RADAR(2600, 14), ...AA(500, 0.18, 0.04),
    defence: { ciws: DUET, chaff: { count: 6, cooldown: 9 }, ecm: ECM.pact }, range: 5600, aggroRange: 5600, preferredRange: 3400, leash: 50, damage: 140 },
  mounts: { pact: [MSL({ ...KALIBR, at: [0, 7, -6], load: 8 }), gun([0, 7, 26], FWD, G100)] },
  camera: { distance: 64, height: 20, shoulder: 0 },
  models: { pact: S.buildBuyanM, nato: S.buildBuyanM },
  variants: {
    pact: { name: 'Buyan-M corvette', weapon: '8 Kalibr, 100 mm, AK-630M-2 Duet', text: 'A river-sea gunboat with eight Kalibrs in her middle: she fires from far back, then hides. A weak air defence — keep her out of reach.' },
  },
});

export const submarine = ship({
  fleet: 'under',
  id: 'submarine', name: 'Attack Submarine', shortName: 'Submarine', cost: 650, limit: 2, armies: ['us', 'ru'],
  names: { nato: ['Oklahoma', 'Arizona', 'Barb', 'Tang', 'Wahoo', 'Idaho'], pact: ['Petropavlovsk-Kamchatsky', 'Volkhov', 'Magadan', 'Ufa', 'Mozhaysk', 'Yakutsk'] },
  hull: { length: 120, beam: 10 },
  stats: {
    submarine: { submerged: 7, dive: 2, periscope: 6, deep: 60 }, passive: 2800, hp: 3200, armor: 0.15, speed: 12.5, accel: 0.1, turnRate: 0.1, turretRate: 0.6, radius: 5, height: 8, eyeHeight: 10, esm: true,
    sight: 1400, hearing: 3400, range: 6000, aggroRange: 6000, preferredRange: 1600, leash: 60, damage: 0, fireCooldown: 6,
  },
  factionStats: { pact: { submarine: { submerged: 5, dive: 1.6, periscope: 6, deep: 40 }, passive: 2200, hp: 2000, speed: 9, accel: 0.08, radius: 4.5, hearing: 2600, range: 5600, aggroRange: 5600, preferredRange: 1400 } }, // (a diesel boat: slow under water, but quiet on her batteries in the shallow Baltic)
  mounts: {
    nato: [TUBES([0, -1, 55], 0, { count: 2, range: 2000, reload: 30 }), MSL({ ...TOMAHAWK, at: [0, 1, 45], load: 8, count: 2, reload: 20 })],
    pact: [TUBES([0, -1, 32], 0, { count: 2, range: 1800, reload: 30, wakeless: true }), MSL({ ...KALIBR, at: [0, 1, 28], load: 4, count: 2, reload: 20 })],
  },
  camera: { distance: 90, height: 24, shoulder: 0 },
  models: { nato: S.buildVirginia, pact: S.buildKilo },
  variants: {
    nato: { name: 'Virginia-class submarine (Block V)', weapon: 'Mk 48 ADCAP, Tomahawk (Maritime Strike)', text: 'The quietest hunter afloat, her bow and the Virginia Payload Module full of Tomahawks: she finds the fleet, fires from periscope depth, and is gone.' },
    pact: { name: 'Improved Kilo-class submarine', weapon: 'torpedoes, Kalibr', text: 'Project 636.3: a diesel boat, slow and short-legged but very quiet on her batteries — and four Kalibrs fired from her torpedo tubes.' },
  },
});

export const escortCarrier = ship({
  fleet: 'carrier',
  id: 'escortCarrier', name: 'Amphibious Assault Ship', shortName: 'Assault ship', cost: 850, limit: 1, armies: ['us'],
  names: { nato: ['America', 'Tripoli', 'Bougainville'] },
  hull: { length: 257, beam: 32 },
  stats: { helo: 19.5, carrier: { deck: 19.5, deckLen: 250, airGroup: { seaCap: 2, seaStrike: 2 } }, // (her F-35Bs: systems/AirStrike.js — off her deck, rearmed aboard)
    hp: 14000, armor: 0.1, speed: 12.5, accel: 0.06, turnRate: 0.05, turretRate: 0.4, radius: 13, height: 32, eyeHeight: 30, radar: RADAR(3200, 42), sonar: 0, ...AA(600, 0.2, 0.05),
    defence: { point: { ...ESSM, channels: 2, load: 16 }, ciws: PHALANX, chaff: CHAFF, ecm: ECM.nato }, range: 300, aggroRange: 2000, preferredRange: 3500, damage: 0 },
  mounts: { nato: [] },
  camera: { distance: 200, height: 65, shoulder: 0 },
  models: { nato: S.buildAmerica },
  variants: {
    nato: { name: 'America-class amphibious assault ship', weapon: 'F-35B, MV-22, helicopters; ESSM, RAM, Phalanx', text: 'No well deck: all hangar, a small carrier with F-35Bs aboard. Precious — everything else is there to keep her afloat.' },
  },
});

export const transport = ship({
  fleet: 'under',
  id: 'transport', name: 'Landing Ship', shortName: 'Landing ship', cost: 300, hidden: true, armies: ['us', 'ru'], // (for the coastal battles, later: no beach to land on at sea)
  names: { nato: ['San Antonio', 'New Orleans', 'Mesa Verde', 'Green Bay', 'Arlington'], pact: ['Ivan Gren', 'Pyotr Morgunov'] },
  hull: { length: 180, beam: 26 },
  stats: { landing: true, helo: 13, hp: 7000, armor: 0.05, speed: 11, accel: 0.06, turnRate: 0.06, turretRate: 0.6, radius: 11, height: 24, radar: RADAR(2800, 30), ...AA(500, 0.15, 0.03),
    defence: { point: RAM, chaff: CHAFF, ecm: ECM.nato }, range: 900, aggroRange: 900, preferredRange: 800, damage: 40 },
  factionStats: { pact: { helo: 8.5, hp: 4500, radius: 8, height: 16, defence: { ciws: AK630, chaff: CHAFF, ecm: ECM.pact } } },
  mounts: { nato: [gun([0, 14, 70], FWD, G30), gun([0, 14, -80], AFT, G30)], pact: [gun([0, 9, 48], FWD, G30)] },
  camera: { distance: 140, height: 44, shoulder: 0 },
  models: { nato: S.buildSanAntonio, pact: S.buildIvanGren },
  variants: {
    nato: { name: 'San Antonio-class amphibious transport dock', weapon: 'RAM, 2 × 30 mm', text: 'A Marine battalion, its vehicles and landing craft in her well deck; the enclosed masts hide her radars.' },
    pact: { name: 'Ivan Gren-class landing ship', weapon: 'AK-630M, 30 mm', text: 'Naval infantry and their armour, straight onto the beach through her bow doors.' },
  },
});

// ---------------------------------------------------------------- the shore's missiles (placed by the map; never bought)
// Launcher trucks hidden ashore (the map's `spawns`): they fire on ships in reach, the biggest first, then drive to
// a new hide (systems/Missiles.js batteries) — shoot and scoot; nothing against the land.
const battery = (o) => ({
  ...rockets, hidden: true, cost: 0, armies: undefined, factionStats: undefined,
  formation: { count: 2, columns: 2, spacing: 30 },
  ...o,
  stats: { ...rockets.stats, range: 0, minRange: 0, preferredRange: 0, damage: 0, sight: 300, stealth: 0.8, hp: 420, ...o.stats },
});

export const nsmBattery = battery({
  id: 'nsmBattery', name: 'Coastal Missile Battery (NSM)', shortName: 'NSM battery',
  stats: { antiShip: { ...NSM, count: 2, load: 8, reload: 45 } },
  models: { nato: S.buildNsmLauncher, pl: S.buildNsmLauncher },
  variants: { nato: { name: 'NSM Coastal Defence System', weapon: '2 × 4 NSM on Jelcz trucks', text: 'The Polish Navy\'s coastal missile unit (MJR): launchers hidden in the coastal woods, their radar and fire control on other trucks — NSMs out to 185 km, seen late.' } },
});

export const bastionBattery = battery({
  id: 'bastionBattery', name: 'Coastal Missile Battery (Bastion)', shortName: 'Bastion',
  stats: { hp: 520, antiShip: { ...ONIKS, count: 2, load: 4, reload: 60 } },
  models: { pact: S.buildBastion, nato: S.buildBastion },
  variants: { pact: { name: 'K300P Bastion-P', weapon: '2 × 2 Oniks on MZKT-7930', text: 'Two big launchers stood up on end: supersonic Oniks at the biggest ship in reach, then back into the woods of the Kaliningrad coast.' } },
});

export const balBattery = battery({
  id: 'balBattery', name: 'Coastal Missile Battery (Bal)', shortName: 'Bal',
  stats: { antiShip: { ...URAN, count: 4, load: 16, reload: 50 } },
  models: { pact: S.buildBal, nato: S.buildBal },
  variants: { pact: { name: '3K60 Bal', weapon: '2 × 8 Kh-35U on MZKT-7930', text: 'Eight Urans to a launcher, fired in salvos: a cheaper, shorter-ranged sister of the Bastion, many missiles at once to swamp the defence.' } },
});

// ---------------------------------------------------------------- sea drones (systems/Drones.js `usv`)
// A support ship with explosive USVs on her after deck — the Black Sea's lesson (Magura V5 and the like),
// hypothetical in the Baltic of 2027 for both sides: she stays back and puts a swarm in the water at any
// enemy ship found within reach; low, fast and small, they swamp the guns — a jammer throws them off.
export const droneBoat = ship({
  fleet: 'escort',
  id: 'droneBoat', name: 'Sea Drone Tender', shortName: 'USV tender', cost: 260, limit: 2,
  hull: { length: 52, beam: 12 },
  stats: { hp: 1400, armor: 0.01, speed: 8, accel: 0.12, turnRate: 0.12, turretRate: 1, radius: 6, height: 11, eyeHeight: 12, radar: RADAR(2200, 14), ...AA(400, 0.12, 0.03),
    drone: { kind: 'usv', count: 6, salvo: 3, every: 30, range: 5000 },
    defence: { chaff: { count: 4, cooldown: 10 }, ecm: ECM.nato }, range: 900, aggroRange: 900, preferredRange: 3000, leash: 60, damage: 30 },
  factionStats: { pact: { defence: { chaff: { count: 4, cooldown: 10 }, ecm: ECM.pact } } },
  mounts: { nato: [gun([0, 9, 11], FWD, G30)], pact: [gun([0, 9, 11], FWD, G30)] },
  camera: { distance: 70, height: 22, shoulder: 0 },
  models: { nato: D.buildUsvTender, pact: D.buildUsvTenderRu },
  variants: {
    nato: { name: 'USV tender', weapon: '6 explosive USVs (Magura V5-type), 30 mm', text: 'An offshore supply ship with sea drones on her after deck: three at a time over the side, 40 knots low across the water at the enemy ship her radar or your drones and aircraft have found. A heavy-torpedo hit each — if they get through.' },
    pact: { name: 'USV tender', weapon: '6 explosive USVs, 30 mm', text: 'A supply ship with explosive sea drones aboard, three to a swarm: they run in low and fast at the ships that have been found, too small and quick for most of the guns.' },
  },
});

export const SHIPS_2027 = { frigate, destroyer, ptBoat, corvette, submarine, escortCarrier, transport, nsmBattery, bastionBattery, balBattery, droneBoat };
/** The 1985 classes with no 2027 counterpart in the Baltic (no cruisers, no supercarrier): a map that still names one gets the nearest that sails. */
export const SHIP_ALIAS_2027 = { lightCruiser: 'destroyer', cruiser: 'destroyer', battleship: 'destroyer', carrier: 'escortCarrier', missileSub: 'submarine' };
