// 1985 warships, the open-sea maps only: the US Navy (`nato`) against the Soviet Navy (`pact`). The same
// slots as 1945 (data/units45/ships.js) so formations, damage control, the reinforcement tabs and the AI
// carry over; ranges are already the game's sea scale (5 km maps). What's new is in the stats:
//   radar   { range, height } — on unless ordered off (stack.radarOn): sees every surface ship in reach that
//           no island hides, and is heard by every enemy `esm` (systems/Sensors.js: bearing lines)
//   defence { sam, point, ciws, chaff } — the layers against missiles (systems/Missiles.js)
//   mounts with `missile`: anti-ship missiles, `load` aboard, `count` a salvo, all-round launchers
// Models: models/ships1985.js (the Iowa still her 1945 self). The carriers launch the air missions they
// have aboard (systems/AirStrike.js: stats.carrier.airGroup); the rest come in from the shore.
import { buildPerry, buildKrivak, buildSpruance, buildSovremenny, buildVirginia, buildKara, buildTiconderoga, buildSlava, buildIowa85, buildKirov, buildNimitz, buildKiev, buildTarawa, buildMoskva, buildPegasus, buildTarantul, buildLosAngeles, buildLosAngelesVLS, buildVictor, buildOscar, buildNewport, buildRopucha } from '../models/ships1985.js';

// stats.helo: she carries a helicopter (Orders 'helo') — the height of her landing pad above the water
const NAVAL = { naval: true, eyeHeight: 20, aimHeight: 4, nightSight: { nato: 0.5, pact: 0.5 }, crew: 0, breakMorale: 0, smoke: undefined, grenades: 0, lightAT: 0, fov: 6.3, burst: 1, burstInterval: 0, aimTime: 1, magSize: 9999, reloadTime: 1, antiArmor: true, tracer: 1, esm: true, sight: 1600 };
const FWD = 0;
const AFT = Math.PI;
const AA = (range, hitNear, hitFar) => ({ antiAir: { range, optical: 1, rate: 2.4, burst: 6, pause: 0.4, hitNear: hitNear * 0.3, hitFar: hitFar * 0.3 } });
const RADAR = (range = 3000, height = 30) => ({ range, height }); // (about 3 km: a fleet is heard — ESM, 7 km — long before it is seen; missiles reach further than radar)

/** A gun mount (already sea scale). */
const gun = (at, facing, o) => ({ at, facing, arc: 4.6, spread: 0.01, splash: 3, pierce: 0.3, shell: 900, size: 1.6, ...o });
const DC = (o) => ({ count: 4, reload: 16, radius: 45, damage: 1300, ...o }); // (ASW torpedoes and rockets: the 1945 pattern stands in)
const torps = (at, o) => ({ at, torpedo: true, arc: 2.2, count: 2, range: 1800, speed: 24, damage: 3000, reload: 40, ...o });
const TUBES = (at, facing, o) => torps(at, { facing, arc: 2.6, homing: true, ...o }); // (homing, wire-guided: off her bow, at a surface ship or a submarine at any depth)
const ASROC = { range: 1500, speed: 24, damage: 2200, reload: 25 }; // (ASROC, SS-N-14: a homing torpedo flown out and dropped near the submarine)

// the guns
const G76 = { range: 1200, reload: 1, damage: 80, splash: 2, size: 1.1 };
const G5IN = { range: 1500, reload: 2.5, damage: 180, splash: 3 };
const G130 = { range: 1600, reload: 2.5, damage: 260, splash: 3.5 };       // (twin AK-130 / AK-100: one mount)
const G16IN = { range: 2200, reload: 30, damage: 2400, splash: 12, pierce: 0.8, shell: 1000, size: 4 };

// the missiles (systems/Missiles.js): `speed` a third of the real one, the sub/supersonic gap kept
const MSL = (o) => ({ at: [0, 8, 0], missile: true, arc: 6.3, count: 2, reload: 8, pierce: 0.6, ...o });
const HARPOON = { count: 4, name: 'Harpoons', speed: 120, range: 4600, seeker: 1200, skim: true, damage: 2300 };
const TASM = { count: 4, name: 'Tomahawks', speed: 120, range: 5800, seeker: 1400, skim: true, damage: 2800 };
const MOSKIT = { count: 4, name: 'Moskits', speed: 280, range: 4000, seeker: 1000, skim: true, damage: 2500 };
const BAZALT = { name: 'Bazalts', speed: 225, range: 5500, seeker: 1600, alt: 40, damage: 4200, pierce: 0.7 };
const GRANIT = { name: 'Granits', speed: 250, range: 6000, seeker: 1800, alt: 45, damage: 4800, pierce: 0.7 };

// the defences: area SAMs (`channels` in the air at once), point SAMs, the last-ditch gun, chaff
const SM2 = { range: 2600, channels: 3, load: 40, reload: 1.2, speed: 330, pk: 0.5 };
const AEGIS = { ...SM2, channels: 6, load: 61, reload: 0.8, shots: 2 }; // (Aegis: a second shot at what the first missed)
const SM1 = { range: 1700, channels: 1, load: 36, reload: 2, speed: 300, pk: 0.45 };
const SEASPARROW = { range: 900, channels: 2, load: 8, reload: 2, speed: 260, pk: 0.45 };
const S300F = { range: 2800, channels: 3, load: 64, reload: 1, speed: 340, pk: 0.5 };
const SHTIL = { range: 1300, channels: 3, load: 48, reload: 1.5, speed: 280, pk: 0.45 };
const SHTORM = { range: 1800, channels: 2, load: 44, reload: 2, speed: 300, pk: 0.45 };
const OSA = { range: 800, channels: 1, load: 20, reload: 2.5, speed: 240, pk: 0.4 };
const PHALANX = { range: 280, pk: 0.2 };
const AK630 = { range: 260, pk: 0.18 };
const CHAFF = { count: 8, cooldown: 8 };

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
  id: 'frigate', name: 'Frigate', shortName: 'Frigate', cost: 300,
  names: { nato: ['Oliver Hazard Perry', 'McInerney', 'Clark', 'George Philip', 'Samuel Eliot Morison', 'Jack Williams', 'Stark', 'Taylor'], pact: ['Bditelny', 'Razumny', 'Druzhny', 'Svirepy', 'Silny', 'Storozhevoy', 'Doblestny', 'Bezukoriznenny'] },
  hull: { length: 136, beam: 14 },
  stats: { helo: 6, hp: 3000, armor: 0.05, speed: 14.5, accel: 0.14, turnRate: 0.11, turretRate: 0.8, radius: 6, height: 12, radar: RADAR(3000, 25), sonar: 600, depthCharges: DC(), asTorp: ASROC, ...AA(500, 0.2, 0.05),
    defence: { sam: SM1, ciws: PHALANX, chaff: CHAFF }, range: 4600, aggroRange: 4600, preferredRange: 2600, damage: 80 },
  factionStats: { pact: { helo: false, defence: { point: { ...OSA, channels: 2 }, chaff: CHAFF }, range: 1600, aggroRange: 1600, preferredRange: 1300, sonar: 700 } }, // (Krivak: no ship-killing missiles — her SS-N-14 are for submarines)
  mounts: {
    nato: [MSL({ ...HARPOON, at: [0, 9, 30], load: 4 }), gun([0, 12, -10], AFT, G76)],
    pact: [gun([0, 9, -45], AFT, G76), gun([0, 9, -52], AFT, G76)],
  },
  camera: { distance: 90, height: 28, shoulder: 0 },
  models: { nato: buildPerry, pact: buildKrivak },
  variants: {
    nato: { name: 'Oliver Hazard Perry-class frigate', weapon: 'Harpoon, SM-1, 76 mm, Phalanx', text: 'The convoy escort built by the dozen: one launcher for Harpoons and Standard missiles, two helicopters, a good sonar.' },
    pact: { name: 'Krivak I-class frigate', weapon: 'SS-N-14 (anti-submarine), SA-N-4, 2 × twin 76 mm', text: 'A fast, handsome sub hunter: her big launcher is for submarines only — against ships she has her guns.' },
  },
});

export const destroyer = ship({
  fleet: 'escort',
  id: 'destroyer', name: 'Destroyer', shortName: 'Destroyer', cost: 520,
  names: { nato: ['Spruance', 'Paul F. Foster', 'Kinkaid', 'Hewitt', 'Elliot', 'Arthur W. Radford', 'Peterson', 'Caron'], pact: ['Sovremenny', 'Otchayanny', 'Otlichny', 'Osmotritelny', 'Bezuprechny', 'Boyevoy', 'Stoyky', 'Okrylenny'] },
  hull: { length: 172, beam: 17 },
  stats: { helo: 6.5, hp: 4600, armor: 0.05, speed: 15.5, accel: 0.12, turnRate: 0.09, turretRate: 0.6, radius: 8, height: 16, radar: RADAR(3000, 30), sonar: 900, depthCharges: DC(), asTorp: ASROC, ...AA(600, 0.2, 0.05),
    defence: { point: SEASPARROW, ciws: PHALANX, chaff: CHAFF }, range: 4600, aggroRange: 4600, preferredRange: 2600, damage: 180 },
  factionStats: { pact: { helo: 7, hp: 4800, sonar: 450, defence: { sam: SHTIL, ciws: AK630, chaff: CHAFF }, range: 4000, aggroRange: 4000, preferredRange: 2400 } },
  mounts: {
    nato: [MSL({ ...HARPOON, at: [0, 10, -40], load: 8 }), gun([0, 9, 55], FWD, G5IN), gun([0, 9, -60], AFT, G5IN)],
    pact: [MSL({ ...MOSKIT, at: [0, 9, 35], load: 8 }), gun([0, 9, 60], FWD, G130), gun([0, 9, -55], AFT, G130)],
  },
  camera: { distance: 110, height: 34, shoulder: 0 },
  models: { nato: buildSpruance, pact: buildSovremenny },
  variants: {
    nato: { name: 'Spruance-class destroyer', weapon: 'Harpoon, Sea Sparrow, 2 × 5-inch, Phalanx', text: 'The big, quiet sub hunter of the carrier screen: the best sonar afloat, Harpoons for ships, Sea Sparrow for herself.' },
    pact: { name: 'Sovremenny-class destroyer', weapon: '8 Moskit (SS-N-22), SA-N-7, 2 × twin 130 mm', text: 'Built to kill ships: eight supersonic sea-skimmers, the heaviest destroyer guns afloat and a good area SAM. A poor sonar.' },
  },
});

export const lightCruiser = ship({
  fleet: 'line',
  id: 'lightCruiser', name: 'Cruiser (escort)', shortName: 'Escort cruiser', cost: 650, limit: 3,
  names: { nato: ['Virginia', 'Texas', 'Mississippi', 'Arkansas', 'California', 'South Carolina'], pact: ['Nikolayev', 'Ochakov', 'Kerch', 'Azov', 'Petropavlovsk', 'Tashkent', 'Tallinn'] },
  hull: { length: 178, beam: 19 },
  stats: { hp: 6500, armor: 0.1, speed: 15, accel: 0.1, turnRate: 0.08, turretRate: 0.5, radius: 9, height: 18, radar: RADAR(3000, 32), sonar: 700, depthCharges: DC(), asTorp: ASROC, ...AA(700, 0.22, 0.05),
    defence: { sam: { ...SM2, channels: 2 }, ciws: PHALANX, chaff: CHAFF }, range: 4600, aggroRange: 4600, preferredRange: 2800, damage: 180 },
  factionStats: { pact: { helo: 7, sonar: 950, defence: { sam: SHTORM, point: OSA, ciws: AK630, chaff: CHAFF }, range: 1200, aggroRange: 1800, preferredRange: 1400 } }, // (Kara: the fleet's anti-submarine cruiser — her missiles are for aircraft and submarines)
  mounts: {
    nato: [MSL({ ...HARPOON, at: [0, 10, -30], load: 8 }), gun([0, 9, 60], FWD, G5IN), gun([0, 9, -60], AFT, G5IN)],
    pact: [gun([0, 10, -55], AFT, G76), gun([0, 10, -62], AFT, G76)],
  },
  camera: { distance: 120, height: 38, shoulder: 0 },
  models: { nato: buildVirginia, pact: buildKara },
  variants: {
    nato: { name: 'Virginia-class nuclear cruiser', weapon: 'Harpoon, SM-2, 2 × 5-inch, Phalanx', text: 'Nuclear powered, she keeps up with the carrier for ever: an area SAM umbrella over the group and Harpoons.' },
    pact: { name: 'Kara-class cruiser', weapon: 'SA-N-3, SA-N-4, SS-N-14, 2 × twin 76 mm', text: 'The Soviet Navy\'s big sub hunter: two area SAM systems over the group, a strong sonar — but nothing to sink a ship with but her guns.' },
  },
});

export const cruiser = ship({
  fleet: 'line',
  id: 'cruiser', name: 'Missile Cruiser', shortName: 'Cruiser', cost: 850, limit: 2,
  names: { nato: ['Ticonderoga', 'Yorktown', 'Vincennes', 'Valley Forge', 'Thomas S. Gates'], pact: ['Slava', 'Marshal Ustinov', 'Chervona Ukraina'] },
  hull: { length: 173, beam: 17 },
  stats: { helo: 6.5, hp: 7500, armor: 0.1, speed: 15.5, accel: 0.1, turnRate: 0.08, turretRate: 0.5, radius: 9, height: 20, radar: RADAR(3400, 35), sonar: 800, depthCharges: DC(), asTorp: ASROC, ...AA(700, 0.22, 0.05),
    defence: { sam: AEGIS, ciws: PHALANX, chaff: CHAFF }, range: 4600, aggroRange: 4600, preferredRange: 2800, damage: 180 },
  factionStats: { pact: { helo: 7.5, hp: 8000, sonar: 500, defence: { sam: S300F, point: OSA, ciws: AK630, chaff: CHAFF }, range: 5500, aggroRange: 5500, preferredRange: 3200 } },
  mounts: {
    nato: [MSL({ ...HARPOON, at: [0, 10, -45], load: 8 }), gun([0, 9, 60], FWD, G5IN), gun([0, 9, -62], AFT, G5IN)],
    pact: [MSL({ ...BAZALT, at: [0, 10, 30], load: 12, count: 4, reload: 12 }), gun([0, 10, 66], FWD, G130)],
  },
  camera: { distance: 120, height: 40, shoulder: 0 },
  models: { nato: buildTiconderoga, pact: buildSlava },
  variants: {
    nato: { name: 'Ticonderoga-class Aegis cruiser', weapon: 'Aegis, SM-2, Harpoon, 2 × 5-inch, Phalanx', text: 'The Aegis radar tracks a hundred targets and guides six missiles at once: the shield of the carrier group against a saturating raid.' },
    pact: { name: 'Slava-class missile cruiser', weapon: '16 Bazalt (SS-N-12), S-300F, twin 130 mm', text: 'Sixteen big supersonic missiles in tubes along her sides — built to break through a carrier group\'s defences in one salvo.' },
  },
});

export const battleship = ship({
  fleet: 'line',
  id: 'battleship', name: 'Capital Ship', shortName: 'Capital ship', cost: 1400, limit: 1,
  names: { nato: ['Iowa', 'New Jersey', 'Missouri', 'Wisconsin'], pact: ['Kirov', 'Frunze', 'Kalinin'] },
  hull: { length: 262, beam: 33 },
  stats: { hp: 14000, armor: 0.7, speed: 15.5, accel: 0.06, turnRate: 0.05, turretRate: 0.2, radius: 14, height: 30, radar: RADAR(3400, 40), ...AA(800, 0.22, 0.05),
    defence: { ciws: PHALANX, chaff: CHAFF }, range: 5800, aggroRange: 5800, preferredRange: 2200, damage: 2400, splash: 12, pierce: 0.8 },
  factionStats: { pact: { helo: 9, hp: 14000, armor: 0.5, sonar: 800, depthCharges: DC(), asTorp: ASROC, defence: { sam: { ...S300F, channels: 6, load: 96 }, point: { ...OSA, channels: 2 }, ciws: AK630, chaff: CHAFF }, range: 6000, aggroRange: 6000, preferredRange: 3500, damage: 260 } },
  mounts: {
    nato: [MSL({ ...TASM, at: [0, 14, -40], load: 8 }), MSL({ ...HARPOON, at: [0, 14, -60], load: 16 }), gun([0, 13, 96], FWD, G16IN), gun([0, 17, 78], FWD, G16IN), gun([0, 13, -78], AFT, G16IN), gun([11, 12, 10], Math.PI / 2, G5IN), gun([-11, 12, 10], -Math.PI / 2, G5IN)],
    pact: [MSL({ ...GRANIT, at: [0, 12, 70], load: 20, count: 8, reload: 15 }), gun([0, 12, -90], AFT, G130)],
  },
  camera: { distance: 200, height: 60, shoulder: 0 },
  models: { nato: buildIowa85, pact: buildKirov },
  variants: {
    nato: { name: 'Iowa-class battleship (1985)', weapon: '9 × 16-inch, Tomahawk, Harpoon, Phalanx', text: 'Brought back from reserve: the old armour shrugs off missiles that would sink a cruiser, and the 16-inch guns still hit hardest — if she gets close. No missile defence but her guns and chaff.' },
    pact: { name: 'Kirov-class battlecruiser', weapon: '20 Granit (SS-N-19), S-300F, SA-N-4, 130 mm', text: 'The biggest surface warship since the war, nuclear powered: twenty huge Granits, a dense air defence. Built to fight a carrier group on her own.' },
  },
});

export const carrier = ship({
  fleet: 'carrier',
  id: 'carrier', name: 'Aircraft Carrier', shortName: 'Carrier', cost: 1300, limit: 1,
  names: { nato: ['Nimitz', 'Dwight D. Eisenhower', 'Carl Vinson', 'Theodore Roosevelt'], pact: ['Kiev', 'Minsk', 'Novorossiysk'] },
  hull: { length: 330, beam: 40 },
  stats: { carrier: { deck: 19.4, deckLen: 300, airGroup: { seaCap: 3, seaStrike: 3, aew: 1 } }, // her air wing (systems/AirStrike.js: off her deck, rearmed aboard)
    hp: 22000, armor: 0.3, speed: 16, accel: 0.06, turnRate: 0.045, turretRate: 0.4, radius: 16, height: 34, eyeHeight: 32, radar: RADAR(3200, 45), ...AA(700, 0.2, 0.05),
    defence: { point: SEASPARROW, ciws: PHALANX, chaff: CHAFF }, range: 300, aggroRange: 2000, preferredRange: 3500, damage: 0 },
  factionStats: { pact: { helo: 16.4, carrier: { deck: 16.4, deckLen: 180, deckZ: -50, airGroup: { seaCap: 2, seaStrike: 2 } }, hp: 15000, armor: 0.2, sonar: 700, defence: { sam: SHTORM, point: OSA, ciws: AK630, chaff: CHAFF }, range: 5500, aggroRange: 5500, preferredRange: 3500 } }, // (the Kiev: her Yak-38s)
  mounts: {
    nato: [],
    pact: [MSL({ ...BAZALT, at: [0, 12, 100], load: 8, count: 4, reload: 12 })],
  },
  camera: { distance: 240, height: 75, shoulder: 0 },
  models: { nato: buildNimitz, pact: buildKiev },
  variants: {
    nato: { name: 'Nimitz-class carrier', weapon: 'air wing, Sea Sparrow, Phalanx', text: 'Ninety aircraft and a city of six thousand: the heart of the battle group. Everything else is there to keep her afloat.' },
    pact: { name: 'Kiev-class aviation cruiser', weapon: 'Yak-38, Ka-25, 8 Bazalt, SA-N-3', text: 'Half carrier, half cruiser: a few jump jets and helicopters forward of a heavy missile battery.' },
  },
});

export const escortCarrier = ship({
  fleet: 'carrier',
  id: 'escortCarrier', name: 'Helicopter Carrier', shortName: 'Helo carrier', cost: 700, limit: 1,
  names: { nato: ['Tarawa', 'Saipan', 'Belleau Wood', 'Nassau', 'Peleliu'], pact: ['Moskva', 'Leningrad'] },
  hull: { length: 250, beam: 32 },
  stats: { helo: 20.4, hp: 13000, armor: 0.1, speed: 12, accel: 0.06, turnRate: 0.05, turretRate: 0.4, radius: 13, height: 30, eyeHeight: 28, radar: RADAR(3000, 40), sonar: 600, ...AA(600, 0.2, 0.05),
    defence: { point: SEASPARROW, ciws: PHALANX, chaff: CHAFF }, range: 1500, aggroRange: 1500, preferredRange: 3200, damage: 180 },
  factionStats: { pact: { helo: 12.4, hp: 10000, sonar: 900, depthCharges: DC(), asTorp: ASROC, defence: { sam: SHTORM, ciws: AK630, chaff: CHAFF } } },
  mounts: {
    nato: [gun([10, 18, 90], FWD, G5IN), gun([-10, 18, -90], AFT, G5IN)],
    pact: [gun([8, 14, -30], AFT, G76)],
  },
  camera: { distance: 200, height: 65, shoulder: 0 },
  models: { nato: buildTarawa, pact: buildMoskva },
  variants: {
    nato: { name: 'Tarawa-class amphibious assault ship', weapon: 'Harriers, helicopters, Sea Sparrow', text: 'A Marine battalion, its helicopters and a few Harriers: a small carrier of her own.' },
    pact: { name: 'Moskva-class helicopter cruiser', weapon: 'Ka-25, SA-N-3, SS-N-14', text: 'A cruiser forward, a helicopter deck aft: the hunter-killer of the Soviet Navy\'s first carrier groups.' },
  },
});

export const ptBoat = ship({
  fleet: 'escort',
  id: 'ptBoat', name: 'Missile Boat', shortName: 'Missile boat', cost: 200,
  names: { nato: ['Pegasus', 'Hercules', 'Taurus', 'Aquila', 'Aries', 'Gemini'], pact: ['R-47', 'R-60', 'R-71', 'R-109', 'R-187', 'R-239', 'R-291', 'R-442'] },
  hull: { length: 45, beam: 9 },
  stats: { hp: 450, armor: 0, speed: 24, accel: 0.4, turnRate: 0.28, turretRate: 1, radius: 3.5, height: 6, eyeHeight: 8, stealth: 0.7, smallCraft: true, radar: RADAR(2200, 10), ...AA(400, 0.15, 0.03),
    defence: { chaff: { count: 4, cooldown: 10 } }, range: 4600, aggroRange: 4600, preferredRange: 3000, leash: 40, damage: 80 },
  factionStats: { pact: { hp: 500, speed: 20, defence: { ciws: AK630, chaff: { count: 4, cooldown: 10 } }, range: 4000, aggroRange: 4000, preferredRange: 2800 } },
  mounts: {
    nato: [MSL({ ...HARPOON, at: [0, 4, -12], load: 8 }), gun([0, 5, 10], FWD, G76)],
    pact: [MSL({ ...MOSKIT, at: [0, 4, -5], load: 4, count: 2 }), gun([0, 5, 14], FWD, G76)],
  },
  camera: { distance: 50, height: 15, shoulder: 0 },
  models: { nato: buildPegasus, pact: buildTarantul },
  variants: {
    nato: { name: 'Pegasus-class hydrofoil', weapon: '8 Harpoon, 76 mm', text: 'Up on her foils at nearly 50 knots, eight Harpoons: a small, fast, hard-to-see threat — and no armour or defence at all.' },
    pact: { name: 'Tarantul III missile corvette', weapon: '4 Moskit (SS-N-22), 76 mm, AK-630', text: 'Four of the destroyers\' supersonic missiles on a small fast hull: the coastal navy\'s sting.' },
  },
});

export const submarine = ship({
  fleet: 'under',
  id: 'submarine', name: 'Attack Submarine', shortName: 'Submarine', cost: 600, limit: 2,
  names: { nato: ['Los Angeles', 'Dallas', 'Houston', 'Providence', 'Bremerton', 'Jacksonville'], pact: ['K-524', 'K-502', 'K-388', 'K-138', 'K-255', 'K-292'] },
  hull: { length: 110, beam: 10 },
  stats: {
    submarine: { submerged: 7, dive: 2, periscope: 6, deep: 60 }, passive: 2600, hp: 3000, armor: 0.15, speed: 12, accel: 0.1, turnRate: 0.1, turretRate: 0.6, radius: 5, height: 8, eyeHeight: 10, esm: true,
    sight: 1400, hearing: 3200, range: 4600, aggroRange: 4600, preferredRange: 1600, leash: 60, damage: 0, fireCooldown: 6,
  },
  factionStats: { pact: { range: 1800, aggroRange: 1800, preferredRange: 1300, passive: 2000, hearing: 2600 } }, // (the Victor: a good hunter, not as quiet or as sharp-eared as the Los Angeles)
  mounts: {
    nato: [TUBES([0, -1, 50], 0, { count: 2, range: 1800, reload: 30 }), MSL({ ...HARPOON, at: [0, 1, 40], load: 4, count: 2, reload: 20 })],
    pact: [TUBES([0, -1, 50], 0, { count: 2, range: 1800, reload: 30, wakeless: true })],
  },
  camera: { distance: 90, height: 24, shoulder: 0 },
  models: { nato: buildLosAngeles, pact: buildVictor },
  variants: {
    nato: { name: 'Los Angeles-class attack submarine', weapon: 'Mk 48 torpedoes, sub-Harpoon', text: 'Fast, quiet, a superb sonar: she hunts submarines and ships alike — and fires Harpoons from her tubes at periscope depth.' },
    pact: { name: 'Victor III-class attack submarine', weapon: '53 cm and 65 cm torpedoes', text: 'The quietest Soviet hunter yet: she trails carrier groups and their submarines. Torpedoes only against ships.' },
  },
});

export const missileSub = ship({
  fleet: 'under',
  id: 'missileSub', name: 'Missile Submarine', shortName: 'Missile sub', cost: 1100, limit: 1,
  names: { nato: ['Chicago', 'Key West', 'Oklahoma City', 'Louisville'], pact: ['K-525', 'K-206', 'K-148'] },
  hull: { length: 154, beam: 18 },
  stats: {
    submarine: { submerged: 6, dive: 1.6, periscope: 6, deep: 50 }, passive: 1800, hp: 6500, armor: 0.25, speed: 10, accel: 0.07, turnRate: 0.07, turretRate: 0.5, radius: 8, height: 10, eyeHeight: 12, esm: true,
    sight: 1400, hearing: 2600, range: 6000, aggroRange: 6000, preferredRange: 3500, leash: 80, damage: 0, fireCooldown: 6,
  },
  factionStats: { nato: { hp: 3200, armor: 0.15, speed: 12, accel: 0.1, turnRate: 0.1, radius: 5, height: 8, eyeHeight: 10, passive: 2600, hearing: 3200, range: 5800, aggroRange: 5800 } }, // (the Los Angeles with her VLS: the attack boat, twelve Tomahawks in the bow)
  mounts: {
    pact: [MSL({ ...GRANIT, at: [0, 2, 20], load: 24, count: 8, reload: 15 }), TUBES([0, -1, 70], 0, { count: 2, range: 1800, reload: 40 })],
    nato: [MSL({ ...TASM, at: [0, 2, 36], load: 12, count: 4, reload: 15 }), TUBES([0, -1, 50], 0, { count: 2, range: 1800, reload: 30 })],
  },
  camera: { distance: 120, height: 30, shoulder: 0 },
  models: { pact: buildOscar, nato: buildLosAngelesVLS },
  variants: {
    nato: { name: 'Los Angeles-class (VLS) submarine', weapon: '12 Tomahawk (TASM), Mk 48 torpedoes', text: 'The Flight II boat: twelve vertical tubes in her bow, anti-ship Tomahawks fired from periscope depth at what the fleet has found — then gone, an attack submarine again.' },
    pact: { name: 'Oscar-class cruise missile submarine', weapon: '24 Granit (SS-N-19), torpedoes', text: 'A carrier killer: twenty-four Granits fired from periscope depth, far beyond what the carrier group sees. Find her before she fires.' },
  },
});

export const transport = ship({
  fleet: 'under',
  id: 'transport', name: 'Landing Ship', shortName: 'Landing ship', cost: 260, hidden: true, // (for the coastal battles, soon: no beach to land on at sea)
  names: { nato: ['Newport', 'Manitowoc', 'Sumter', 'Fresno', 'Peoria', 'Frederick'], pact: ['BDK-91', 'BDK-98', 'BDK-101', 'BDK-181', 'BDK-200', 'BDK-232'] },
  hull: { length: 160, beam: 21 },
  stats: { landing: true, hp: 5000, armor: 0.05, speed: 10, accel: 0.06, turnRate: 0.06, turretRate: 0.6, radius: 9, height: 16, radar: RADAR(2600, 22), ...AA(500, 0.15, 0.03),
    defence: { ciws: PHALANX, chaff: CHAFF }, range: 1200, aggroRange: 1200, preferredRange: 1000, damage: 80 },
  factionStats: { pact: { hp: 4500, defence: { chaff: CHAFF } } },
  mounts: {
    nato: [gun([0, 12, 40], FWD, G76)],
    pact: [gun([0, 10, 50], FWD, G76)],
  },
  camera: { distance: 120, height: 38, shoulder: 0 },
  models: { nato: buildNewport, pact: buildRopucha },
  variants: {
    nato: { name: 'Newport-class tank landing ship', weapon: '20 mm Phalanx', text: 'Marines and their tanks: soft and slow, but a landing party ashore holds a zone and brings in command points.' },
    pact: { name: 'Ropucha-class landing ship', weapon: '2 × twin 57 mm', text: 'Naval infantry and their armour for the beach: the men aboard hold a zone and bring in command points.' },
  },
});

export const SHIPS_1985 = { frigate, destroyer, lightCruiser, cruiser, battleship, carrier, escortCarrier, ptBoat, submarine, missileSub, transport };
