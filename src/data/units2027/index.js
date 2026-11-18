// The 2027 roster (data/epoch.js): a hypothetical war in the Suwałki Gap, the US Army and the Polish
// Army against the Russian Ground Forces and the Belarusian Army. Variants, stats and models are keyed
// `nato` (US Army), `pl` (Polish Army), `pact` (Russia), `by` (Belarus) — an army without an entry
// takes its side's (data/factions.js forArmy). Like the other eras, every type keeps its 1985 id so the
// modes, maps and the AI work, and derives from its 1985 counterpart.
// Step 1: the infantry — riflemen and every team on foot, in modern kit. Step 3: the armour (tanks,
// IFVs, recon, tank destroyers). The guns, aircraft and support stand in with their 1985 selves
// until their steps (see the 2027 design notes):
// drones 4, EW and precision fires 5, the rest of the roster 6.
import { TYPES_1985 } from '../units/index.js';
import { buildModernSoldier } from '../models/modernSoldier.js';
import * as M from '../models/modern2027.js';

const T = TYPES_1985;
const men = (o = {}) => ({
  nato: () => buildModernSoldier({ army: 'us', ...o }), pl: () => buildModernSoldier({ army: 'pl', ...o }),
  pact: () => buildModernSoldier({ army: 'ru', ...o }), by: () => buildModernSoldier({ army: 'by', ...o }),
});
const derive = (base, o) => ({ ...base, ...o, stats: { ...base.stats, ...o.stats }, specialist: o.specialist ?? base.specialist });

const rifles = derive(T.rifles, {
  name: 'Infantry Squad', shortName: 'Infantry',
  models: men(),
  kitModels: { at: men({ weapon: 'at' }), smg: men({ weapon: 'smg' }) },
  variants: {
    nato: { name: 'Infantry Squad', weapon: 'M4A1 carbines, M249, M136 AT4, night vision', text: 'Nine men in plate carriers with night vision on every helmet and a radio on every team leader. They fight at night as well as by day.' },
    pl: { name: 'Drużyna zmechanizowana', weapon: 'MSBS Grot carbines, UKM-2000, Carl Gustaf', text: 'Polish mechanised infantry: the Grot rifle built at home, the Carl Gustaf for the armour, and a country that has been getting ready for this fight for years.' },
    pact: { name: 'Motor Rifle Squad', weapon: 'AK-12 rifles, PKP, RPG-7V2, RPG-26', text: 'Russian motor riflemen in Ratnik kit. Hard to break when dug in, and well used to drones overhead.' },
    by: { name: 'Motor Rifle Squad (Belarus)', weapon: 'AK-74M rifles, PKM, RPG-7', text: 'The Belarusian motor riflemen: Soviet-pattern kit, older rifles, fewer optics. Plenty of them.' },
  },
});

const atTeam = derive(T.atTeam, {
  name: 'Anti-tank Team', shortName: 'AT team',
  models: men({ weapon: 'at' }), specialistModels: men(),
  variants: {
    nato: { name: 'Javelin Team', weapon: 'FGM-148 Javelin', text: 'Fire and forget: the missile climbs and dives onto the thin roof of the tank. The gunner is already moving before it hits.' },
    pl: { name: 'Spike-LR Team', weapon: 'Spike-LR', text: 'The Israeli missile Poland builds under licence: the gunner watches its camera all the way and can pick the spot it strikes.' },
    pact: { name: 'Kornet Team', weapon: '9M133 Kornet', text: 'A laser-guided heavy missile on a tripod with a double warhead for reactive armour. It reaches a long way, but the gunner must keep his aim until it hits.' },
    by: { name: 'RPG Team', weapon: 'RPG-7V, Konkurs reloads', text: 'Old but plentiful: the RPG-7 at close range, and a few older wire-guided missiles brought up when there is time.' },
  },
});

const mgTeam = derive(T.mgTeam, {
  name: 'Machine-gun Team', shortName: 'MG team',
  models: men(), specialistModels: men({ weapon: 'mg' }),
  variants: {
    nato: { name: 'M240 Team', weapon: 'M240B, thermal sight', text: 'The medium machine gun with a thermal sight: it sees through the night and through ordinary smoke.' },
    pl: { name: 'UKM-2000 Team', weapon: 'UKM-2000P', text: 'Poland\'s own belt-fed gun in 7.62 NATO, the base of fire for the squad\'s attack.' },
    pact: { name: 'PKP Team', weapon: 'PKP Pecheneg', text: 'The PKM\'s heavier-barrelled successor: long bursts without changing barrels.' },
    by: { name: 'PKM Team', weapon: 'PKM', text: 'The old reliable belt-fed gun: no thermals, but plenty of ammunition.' },
  },
});

const CREW_TEXT = 'The crew of a knocked-out vehicle: a few men with carbines, out of the hatches.';
const crew = derive(T.crew, {
  models: men({ crew: true }),
  variants: { nato: { name: 'Crew', weapon: 'M4 carbines', text: CREW_TEXT }, pl: { name: 'Załoga', weapon: 'carbines', text: CREW_TEXT }, pact: { name: 'Crew', weapon: 'AK-12K', text: CREW_TEXT }, by: { name: 'Crew', weapon: 'AKS-74U', text: CREW_TEXT } },
});

// the rest on foot: their 1985 roles and rules, in modern kit (their own stats and texts with their steps)
const onFoot = (id, o, variants) => derive(T[id], { ...(T[id].models ? { models: men(o.models) } : {}), ...(T[id].specialistModels ? { specialistModels: men(o.specialist) } : {}), variants });
const scouts = onFoot('scouts', { models: { scout: true } }, {
  nato: { name: 'Scout Team', weapon: 'M4A1, LRAS3 thermal sight', text: 'Cavalry scouts: they find the enemy at night by his heat and call down fire on him without being seen.' },
  pl: { name: 'Zwiadowcy', weapon: 'Grot, thermal binoculars', text: 'Polish reconnaissance: small teams forward of the line who know every road and wood here.' },
  pact: { name: 'Razvedka', weapon: 'AK-12, thermal binoculars', text: 'Russian reconnaissance: a few men forward to find the line and the guns.' },
  by: { name: 'Razvedka', weapon: 'AK-74M, binoculars', text: 'Belarusian scouts: fewer thermal sights, but they know the border woods.' },
});
const sniper = onFoot('sniper', { models: { weapon: 'sniper', scout: true } }, {
  nato: { name: 'Sniper Team', weapon: 'Mk 22 ASR', text: 'A precision rifle and a spotter with a thermal scope: they pick off leaders and gunners from far off.' },
  pl: { name: 'Snajperzy', weapon: 'Bor rifle', text: 'The Polish Bor bolt-action: accurate well beyond a kilometre in the right hands.' },
  pact: { name: 'Sniper Pair', weapon: 'SVD-M, Chukavin', text: 'A marksman and his partner: the Dragunov\'s modern descendants.' },
  by: { name: 'Sniper Pair', weapon: 'SVD', text: 'The Dragunov: a marksman\'s rifle for the squad, not a sniper\'s tool.' },
});
const engineers = onFoot('engineers', {}, {
  nato: { name: 'Sappers', weapon: 'M4A1, demolition charges, mine detectors', text: 'Combat engineers: they clear mines and obstacles, blow bridges and dig positions.' },
  pl: { name: 'Saperzy', weapon: 'Grot, charges', text: 'Polish sappers: mines, obstacles and the hedgehogs on the Eastern Shield.' },
  pact: { name: 'Sappers', weapon: 'AK-12, charges, mine detectors', text: 'Russian combat engineers: they breach the minefields and lay their own.' },
  by: { name: 'Sappers', weapon: 'AK-74M, charges', text: 'Belarusian sappers: obstacles and mines along the border.' },
});
const mortar = onFoot('mortar', { specialist: { weapon: 'mortar' } }, {
  nato: { name: 'Mortar Section', weapon: 'M224 60 mm / M252 81 mm', text: 'The company\'s own artillery: quick to set up, quick to move.' },
  pl: { name: 'Moździerze', weapon: 'LMP-2017 60 mm, 98 mm', text: 'Polish mortars, the light 60 and the M-98, firing for the infantry close in front.' },
  pact: { name: 'Mortar Section', weapon: '2B14 Podnos 82 mm', text: 'The 82 mm Podnos: plentiful, light, and the first fire a Russian attack calls.' },
  by: { name: 'Mortar Section', weapon: '2B14 82 mm', text: 'The 82 mm mortar section of a Belarusian battalion.' },
});
const observers = onFoot('observers', { models: { scout: true, radio: true } }, {
  nato: { name: 'Joint Fires Observers', weapon: 'laser designator, digital radio', text: 'They mark the target with a laser and send its grid digitally: guns, rockets and aircraft strike what they see.' },
  pl: { name: 'Obserwatorzy', weapon: 'Topaz fire control', text: 'Polish forward observers on the Topaz system: a target they see goes straight to the Krabs.' },
  pact: { name: 'Artillery Spotters', weapon: 'Strelets system, rangefinder', text: 'Russian spotters with the Strelets set: a target on the screen goes up to the guns.' },
  by: { name: 'Artillery Spotters', weapon: 'radio, rangefinder', text: 'Belarusian spotters for the massed guns behind them.' },
});
const manpads = onFoot('manpads', { specialist: { weapon: 'manpads' } }, {
  nato: { name: 'Stinger Team', weapon: 'FIM-92 Stinger', text: 'The shoulder-fired missile against helicopters, low jets and the bigger drones.' },
  pl: { name: 'Piorun Team', weapon: 'Piorun', text: 'Poland\'s own Piorun: one of the best shoulder-fired missiles in the world, and fearsome against helicopters.' },
  pact: { name: 'Verba Team', weapon: '9K333 Verba', text: 'Russia\'s newest shoulder-fired missile, hard to decoy with flares.' },
  by: { name: 'Igla Team', weapon: '9K38 Igla', text: 'The older Igla: still deadly to a helicopter that comes too low.' },
});
const airAssault = onFoot('airAssault', { models: { airAssault: true } }, {
  nato: { name: 'Air Assault Infantry', weapon: 'M4A1, M249, Javelin', text: 'The 101st: infantry that comes in by helicopter behind the enemy\'s line.' },
  pl: { name: 'Aeromobilni', weapon: 'Grot, Spike', text: 'The 6th Airborne Brigade: light infantry carried forward by helicopter.' },
  pact: { name: 'VDV', weapon: 'AK-12, RPG', text: 'Russian airborne troops: elite assault infantry flown in by helicopter.' },
  by: { name: 'Special Operations Forces', weapon: 'AK-74M, RPG', text: 'Belarus\'s mobile brigades, carried forward by Mi-8.' },
});

// ---------------------------------------------------------------- step 3: the armour
// Per army: the side's stats are the type's (US / Russia), Poland's and Belarus's in factionStats.
// `aps`: active protection (combat/ProjectileSystem.js aps) · `cage`: a cope cage over the turret (drones, step 4).
const TROPHY = { name: 'Trophy', charges: 3, chance: 0.9 };
const ARENA = { name: 'Arena-M', charges: 2, chance: 0.8 };

const tank = derive(T.tank, {
  cost: 480,
  stats: { nightSight: { nato: 1, pact: 0.85 }, hp: 1600, armor: 0.8, damage: 460, range: 230, aggroRange: 170, preferredRange: 130, sight: 90, speed: 5.2, fireCooldown: 5.5 },
  factionStats: {
    pact: { hp: 1450, armor: 0.72, damage: 430, cage: true },
    pl: { hp: 1350, armor: 0.66, damage: 400, nightSight: 0.85, fireCooldown: 6, range: 210 },
    by: { hp: 1400, armor: 0.68, damage: 420, nightSight: 0.8, range: 210, cage: false },
  },
  models: { nato: M.buildAbramsSEPv3, pl: M.buildPT91, pact: M.buildT72B3M, by: M.buildT72B3 },
  engine: { nato: 'engine.turbine', pact: 'engine.diesel' },
  variants: {
    nato: { name: 'M1A2 SEPv3', weapon: '120 mm, CROWS .50 cal', text: 'The newest Abrams: thermal sights that see as far by night as by day, a remote machine gun the commander fires from under armour. Fast, accurate and tough from the front, thin at the back.' },
    pl: { name: 'PT-91 Twardy', weapon: '125 mm, ERAWA armour', text: 'Poland\'s own upgrade of the T-72: its ERAWA reactive armour and a modern sight. Older than the Abrams beside it, and much cheaper to lose.' },
    pact: { name: 'T-72B3M', weapon: '125 mm, Relikt armour', text: 'The modernised T-72: Relikt reactive armour, the Sosna-U thermal sight, and a cage of bars over the turret against drones dropping on the roof. Its ammunition still sits under the turret.' },
    by: { name: 'T-72B3', weapon: '125 mm, Kontakt-5', text: 'Belarus\'s T-72s, brought up to the Russian standard: a thermal sight and reactive armour on the turret, but no cage.' },
  },
});

const heavyTank = derive(T.heavyTank, {
  cost: 620,
  stats: { nightSight: { nato: 1, pact: 0.95 }, hp: 1800, armor: 0.85, damage: 480, range: 240, aggroRange: 175, preferredRange: 135, sight: 95, aps: TROPHY },
  factionStats: {
    pact: { hp: 1750, armor: 0.82, damage: 470, aps: ARENA, cage: true },
    pl: { hp: 1750, armor: 0.86, damage: 490, fireCooldown: 4.6, speed: 6.2, aps: null },
    by: { hp: 1500, armor: 0.74, damage: 440, nightSight: 0.85, aps: null, range: 215, cage: false },
  },
  models: { nato: M.buildAbramsTrophy, pl: M.buildK2, pact: M.buildT90M, by: M.buildT72B3Mby },
  engine: { nato: 'engine.turbine', pact: 'engine.diesel' },
  variants: {
    nato: { name: 'M1A2 SEPv3 Trophy', weapon: '120 mm, Trophy active protection', text: 'The Abrams with Trophy: radar panels on the turret watch for missiles and rockets, and a launcher each side shoots them down before they hit — three times, until the crew reloads it in a lull.' },
    pl: { name: 'K2 Black Panther', weapon: '120 mm L55, autoloader', text: 'Poland\'s new Korean tank: an autoloader that fires faster than any loader, a long gun, and suspension that keeps it steady on the move. No active protection yet.' },
    pact: { name: 'T-90M Proryv', weapon: '125 mm, Arena-M, Relikt', text: 'Russia\'s best tank: a new welded turret, Relikt armour, and Arena-M — radar masts and launchers that shoot down two incoming missiles. A cage over it all against drones.' },
    by: { name: 'T-72B3M', weapon: '125 mm, Relikt', text: 'The newest T-72s Belarus has: Relikt armour and a better gun, the pick of its tank battalions.' },
  },
});

const ifv = derive(T.ifv, {
  cost: 440,
  stats: { nightSight: { nato: 1, pact: 0.85 }, hp: 900, armor: 0.46, atgm: { range: 320, damage: 700, pierce: 0.88, splash: 1.5, speed: 160, reload: 20, count: 3 } },
  factionStats: {
    pact: { atgm: { range: 350, damage: 760, pierce: 0.9, splash: 1.5, speed: 170, reload: 14, count: 4 }, cage: true },
    pl: { hp: 760, armor: 0.38, speed: 7.5, damage: 130, nightSight: 0.95, atgm: { range: 340, damage: 720, pierce: 0.9, splash: 1.5, speed: 150, reload: 18, count: 2 } },
    by: { hp: 820, armor: 0.42, nightSight: 0.6, cage: false, atgm: { range: 300, damage: 650, pierce: 0.85, splash: 1.5, speed: 150, reload: 22, count: 3 } },
  },
  models: { nato: M.buildBradleyA4, pl: M.buildRosomak, pact: M.buildBMP2M, by: M.buildBMP2 },
  variants: {
    nato: { name: 'M2A4 Bradley', weapon: '25 mm Bushmaster · TOW-2B', text: 'The Bradley today: reactive tiles on its sides, a stronger engine, thermal sights. The TOW-2B flies over a tank and fires down into its roof. U unloads the squad.' },
    pl: { name: 'KTO Rosomak', weapon: '30 mm ZSSW-30 · Spike-LR', text: 'The Polish 8×8 with an unmanned turret: fast on roads, quiet, and the Spikes kill tanks. Its armour is thinner than a tracked vehicle\'s. U unloads the squad.' },
    pact: { name: 'BMP-2M Berezhok', weapon: '30 mm 2A42 · Kornet, AGS-30', text: 'The old BMP-2 with a new turret kit: four Kornet missiles on the turret sides, a thermal sight, a cage over the top. U unloads the squad.' },
    by: { name: 'BMP-2', weapon: '30 mm 2A42 · 9M113 Konkurs', text: 'The BMP-2 as it was: low and fast, a hard-hitting cannon, thin armour, and no thermal sight. U unloads the squad.' },
  },
});

const reconVehicle = derive(T.reconVehicle, {
  stats: { nightSight: { nato: 1, pact: 0.75 }, sight: 140 },
  factionStats: { pl: { nightSight: 0.85 }, by: { nightSight: 0.6 } },
  models: { nato: M.buildBradleyM3A3, pl: M.buildBRDM2M, pact: M.buildBRDM2M, by: M.buildBRDM2M },
  variants: {
    nato: { name: 'M3A3 Bradley CFV', weapon: '25 mm Bushmaster · TOW-2B', text: 'The cavalry\'s Bradley: scouts and extra radios in place of the squad. It sees by its targets\' heat and calls fire down on them.' },
    pl: { name: 'BRDM-2M-98 ZT', weapon: '14.5 mm KPVT, thermal sight', text: 'The old scout car, rebuilt in Poland with a thermal sight and new radios: quick, small and easy to hide.' },
    pact: { name: 'BRDM-2M', weapon: '14.5 mm KPVT', text: 'The four-wheeled scout car the Russian recon companies still drive: fast, amphibious and thin-skinned.' },
    by: { name: 'BRDM-2', weapon: '14.5 mm KPVT', text: 'Belarus\'s scout car: as it was in 1985.' },
  },
});

const tankDestroyer = derive(T.tankDestroyer, {
  stats: { nightSight: { nato: 1, pact: 0.7 }, hp: 600, speed: 7, atgm: { range: 360, damage: 720, pierce: 0.9, splash: 1.5, speed: 160, reload: 9, count: 10 } },
  factionStats: {
    pl: { nightSight: 0.95, atgm: { range: 380, damage: 740, pierce: 0.9, splash: 1.5, speed: 150, reload: 8, count: 8 } },
    pact: { hp: 520, speed: 6.5, atgm: { range: 330, damage: 700, pierce: 0.9, splash: 1.5, speed: 160, reload: 10, count: 10 } },
    by: { hp: 520, speed: 6.5, nightSight: 0.6, atgm: { range: 320, damage: 680, pierce: 0.88, splash: 1.5, speed: 150, reload: 11, count: 10 } },
  },
  models: { nato: M.buildStrykerATGM, pl: M.buildRosomakSpike, pact: M.buildKonkursM, by: M.buildKonkursM },
  variants: {
    nato: { name: 'M1134 Stryker ATGM', weapon: 'TOW-2B', text: 'The 8×8 Stryker with the TOW launcher on its roof: it waits hull-down and kills tanks from far off. Its armour is for bullets, not tank rounds.' },
    pl: { name: 'Rosomak Spike', weapon: 'Spike-LR', text: 'The Rosomak with a Spike launcher: the gunner watches the missile\'s camera and picks where it strikes.' },
    pact: { name: '9P148 Konkurs-M', weapon: '9M113M Konkurs-M', text: 'The old tank hunter on the BRDM-2, its missiles upgraded with a second warhead for reactive armour.' },
    by: { name: '9P148 Konkurs', weapon: '9M113 Konkurs', text: 'Belarus\'s tank hunters on the BRDM-2: wire-guided missiles from the 1980s.' },
  },
});

// ---------------------------------------------------------------- step 4: drones (systems/Drones.js)
const RECON_DRONE = { kind: 'recon', range: 380, every: 40 };
scouts.stats = { ...scouts.stats, drone: RECON_DRONE };
observers.stats = { ...observers.stats, drone: { ...RECON_DRONE, range: 450 } };

const droneTeam = (o) => derive(T.scouts, {
  category: o.category, role: 'support', cost: o.cost,
  formation: { count: 3, columns: 3, spacing: 3 },
  models: men({ radio: true }),
  stats: { drone: o.drone, sight: 120, binoculars: false },
  variants: o.variants,
});
const fpvTeam = { ...droneTeam({
  category: 'infantry', cost: 180,
  drone: { kind: 'fpv', count: 8, every: 12, range: 520 },
  variants: {
    nato: { name: 'FPV Drone Team', weapon: 'FPV strike drones, M4A1', text: 'Three soldiers with goggles and a crate of racing drones with warheads strapped on. Anything the side has spotted within half a kilometre, they fly into — through the roof of a tank, into a trench.' },
    pl: { name: 'Zespół FPV', weapon: 'FPV drones, Grot', text: 'Polish drone operators, trained on what Ukraine learned: cheap, fast, and deadly to anything that stops in the open.' },
    pact: { name: 'FPV Drone Team', weapon: 'FPV strike drones, AK-12', text: 'Russian FPV crews: they hunt along the front for vehicles and dug-in men the scouts have found. A cage or a jammer is the best answer.' },
    by: { name: 'FPV Drone Team', weapon: 'FPV drones, AK-74M', text: 'Belarus’s first drone crews, flying Russian-made FPVs.' },
  },
}), id: 'fpvTeam', name: 'FPV Drone Team', shortName: 'FPV' };
const loiterTeam = { ...droneTeam({
  category: 'fire', cost: 300,
  drone: { kind: 'lancet', count: 4, every: 35, range: 1200 },
  variants: {
    nato: { name: 'Switchblade 600 Team', weapon: 'Switchblade 600 loitering munitions', text: 'A tube-launched loitering munition: it flies out a kilometre and more, circles until it finds a vehicle or a gun, and dives onto it with a tank-killing warhead.' },
    pl: { name: 'Warmate Team', weapon: 'Warmate loitering munitions', text: 'Poland’s own loitering munition: it hunts over the enemy’s rear for guns and vehicles and dives onto them.' },
    pact: { name: 'Lancet Team', weapon: 'ZALA Lancet-3', text: 'The Lancet: launched from a rail, it flies far behind the line, finds an artillery piece or an armoured vehicle and dives onto it. The terror of guns that stay in one place.' },
    by: { name: 'Lancet Team', weapon: 'ZALA Lancet', text: 'Lancets bought from Russia: few, and saved for the best targets.' },
  },
}), id: 'loiterTeam', name: 'Loitering Munition Team', shortName: 'Loiter' };

// ---------------------------------------------------------------- step 5: precision fires and EW
// `guided` { k, share, gps | laser }: that share of the shells or rockets steer in — scatter × k — a
// GPS round not where an enemy jammer covers the target, a laser round only where an observer sees it
// (UnitStack.lob) · `scoot`: located by a radar or a drone, the battery drives off to a new spot
// (systems/Support.js) · `droneJam`: a trench jammer — drones close by lose their link (systems/Drones.js).
const SCOOT = { dist: 80, every: 30 };
const artillery = derive(T.artillery, {
  cost: 420,
  stats: { range: 340, guided: { k: 0.12, share: 0.35, gps: true }, scoot: SCOOT },
  factionStats: {
    pact: { damage: 190, splash: 7.5, guided: { k: 0.15, share: 0.25, laser: true } },
    pl: { range: 360, fireCooldown: 6 },
    by: { damage: 175, guided: null },
  },
  models: { nato: M.buildPaladin, pl: M.buildKrab, pact: M.buildMsta, by: M.buildAkatsiya },
  variants: {
    nato: { name: 'M109A7 Paladin', weapon: '155 mm · Excalibur', text: 'The newest Paladin: fires within a minute of stopping and drives off before the answer lands. A third of its shells are Excalibur — GPS-guided, landing within a few metres, unless a jammer covers the target.' },
    pl: { name: 'AHS Krab', weapon: '155 mm L52', text: 'Poland’s own howitzer, long-barrelled and quick: proven in Ukraine. Shoots far, shoots fast, and moves off when found.' },
    pact: { name: '2S19M2 Msta-SM2', weapon: '152 mm · Krasnopol', text: 'Russia’s main self-propelled gun. Some of its shells are laser-guided Krasnopols — deadly accurate where an observer or a drone marks the target.' },
    by: { name: '2S3M Akatsiya', weapon: '152 mm', text: 'The Belarusian army’s older 152 mm: plenty of shells, no guided ones.' },
  },
});

const rockets = derive(T.rockets, {
  cost: 520,
  stats: { range: 520, magSize: 6, damage: 210, splash: 7, scatter: 8, reloadTime: 70, fireCooldown: 0.8, guided: { k: 0.1, share: 1, gps: true }, scoot: SCOOT },
  factionStats: {
    pact: { magSize: 12, damage: 170, splash: 7, fireCooldown: 0.5, scatter: 10, armor: 0.1, hp: 420, speed: 6, reloadTime: 80, guided: { k: 0.12, share: 0.6, gps: true } },
    pl: { magSize: 12, damage: 160, fireCooldown: 0.5, guided: { k: 0.15, share: 0.5, gps: true } },
    by: { magSize: 8, damage: 220, splash: 7.5, fireCooldown: 0.9, armor: 0.1, hp: 420, speed: 6, guided: { k: 0.12, share: 1, gps: true } },
  },
  models: { nato: M.buildM270A2, pl: M.buildHomarK, pact: M.buildTornadoS, by: M.buildPolonez },
  variants: {
    nato: { name: 'M270A2 MLRS', weapon: '6 × GMLRS guided rockets', text: 'Six GPS-guided rockets, each landing within metres of its aim from far beyond the front. A command post, a battery, a bridge — gone. A jammer over the target throws them off.' },
    pl: { name: 'Homar-K', weapon: '12 × 239 mm rockets, half guided', text: 'Poland’s new Korean launcher on a Jelcz truck: a dozen heavy rockets, half of them guided.' },
    pact: { name: '9K515 Tornado-S', weapon: '12 × 300 mm rockets, part guided', text: 'Russia’s heavy launcher: a dozen 300 mm rockets, many of them steered by satellite — a carpet with a sharp edge.' },
    by: { name: 'Polonez', weapon: '8 × 301 mm guided rockets', text: 'Belarus’s own long-range launcher, built with Chinese help: eight big guided rockets.' },
  },
});

const jammer = derive(T.jammer, {
  stats: { jammer: { radius: 230, deploy: 8 } },
  models: { nato: M.buildTLS, pl: M.buildPrzebisnieg, pact: M.buildZhitel, by: M.buildZhitel },
  variants: {
    nato: { name: 'Terrestrial Layer System', weapon: 'unarmed', text: 'Electronic warfare on a Stryker. Parked with its masts up it fills a wide circle with noise: enemy drones in it drop out of the sky or go blind, GPS-guided shells and rockets aimed into it go wide, observers’ and radars’ links fail. And every direction-finder knows where it is.' },
    pl: { name: 'Przebiśnieg', weapon: 'unarmed', text: 'Poland’s jamming system on Jelcz trucks: drones, radios and satellite navigation all go quiet around it.' },
    pact: { name: 'R-330Zh Zhitel', weapon: 'unarmed', text: 'The Russian jammer that blinds satellite navigation and radio links: drones lose their way, guided rockets stray, observers go deaf.' },
    by: { name: 'R-934B', weapon: 'unarmed', text: 'A Belarusian jamming station: older, but it still drowns out drones and radios around it.' },
  },
});

const cbRadar = derive(T.cbRadar, {
  stats: { cbRadar: { range: 650, arc: 2.4, deploy: 8 } },
  models: { nato: M.buildTPQ53, pl: M.buildTPQ53, pact: M.buildAistyonok, by: M.buildAistyonok },
  variants: {
    nato: { name: 'AN/TPQ-53', weapon: 'unarmed', text: 'A counter-fire radar that sees shells, rockets and drones in flight and plots the guns that fired them, wider and further than the old Firefinder. Paired with guided shells, a battery that fires twice from the same spot dies there.' },
    pl: { name: 'Liwiec', weapon: 'unarmed', text: 'Poland’s counter-battery radar: it tracks incoming shells back to their guns.' },
    pact: { name: '1L271 Aistyonok', weapon: 'unarmed', text: 'A light Russian counter-battery radar: it finds mortars and guns as they fire.' },
    by: { name: '1L219 Zoopark', weapon: 'unarmed', text: 'The Zoopark radar: it plots enemy batteries for the Belarusian guns.' },
  },
});

engineers.stats = { ...engineers.stats, droneJam: { radius: 55 } };

// ---------------------------------------------------------------- step 6: the rest of the roster
// The 1985 machines that serve on (or their nearest lookalikes) in 2027 paint, under today's names.
const R = M.repaint;
const m85 = (id) => T[id].models;
const restyle = (id, models, variants, o = {}) => derive(T[id], { ...o, models, variants });

const aa = restyle('aa', { nato: M.buildMShorad, pl: R(m85('aa').pact), pact: R(m85('aa').pact), by: R(m85('aa').pact) }, {
  nato: { name: 'M-LIDS', weapon: '30 mm XM914, drone jammer', text: 'The counter-drone Stryker: a radar that finds small drones, a jammer that cuts their link within a hundred metres, and a 30 mm cannon with proximity rounds for the rest.' },
  pl: { name: 'ZSU-23-4MP Biała', weapon: '4 × 23 mm, Grom', text: 'Poland’s modernised Shilka: a new radar and thermal sight, Grom missiles beside the guns. A wall of 23 mm against helicopters and drones.' },
  pact: { name: 'ZSU-23-4M4 Shilka-M4', weapon: '4 × 23 mm, Igla', text: 'The old Shilka rebuilt: a digital fire control and a missile pair. Its four barrels still tear up anything low and slow — drones above all.' },
  by: { name: 'ZSU-23-4 Shilka', weapon: '4 × 23 mm', text: 'Belarus’s Shilkas, as they were: radar-laid quad 23 mm.' },
}, { factionStats: { nato: { droneJam: { radius: 110 } } } });

const gunMissile = restyle('gunMissile', { nato: M.buildMShorad, pl: R(m85('gunMissile').nva), pact: R(m85('gunMissile').pact), by: R(m85('gunMissile').nva) }, {
  nato: { name: 'M-SHORAD', weapon: '30 mm, Stinger, Hellfire', text: 'The Stryker air-defence turret: Stingers for helicopters and jets, Hellfires for tanks, a 30 mm cannon for the rest.' },
  pl: { name: 'Osa-AKM-P1 Żądło', weapon: '9M33 missiles', text: 'Poland’s modernised Osa: a radar and six missiles on an amphibious six-wheeler.' },
  pact: { name: '2S6M1 Tunguska-M1', weapon: '2 × 30 mm, 9M311 missiles', text: 'Guns and missiles on one tracked chassis: it guards the tank regiments against helicopters, jets and drones alike.' },
  by: { name: 'Osa-AKM', weapon: '9M33 missiles', text: 'The Belarusian Osa: an older wheeled missile system.' },
});

const sam = restyle('sam', { nato: M.buildNASAMS, pl: M.buildNarew, pact: R(m85('sam').pact), by: R(m85('sam').pact) }, {
  nato: { name: 'NASAMS', weapon: 'AMRAAM launchers', text: 'A trailer launcher of radar-guided missiles: it reaches helicopters, jets and the bigger drones far beyond any shoulder-fired missile.' },
  pl: { name: 'Narew (CAMM)', weapon: 'CAMM missiles', text: 'Poland’s new short-range shield: British CAMM missiles that cover the brigade against jets, helicopters and cruise missiles.' },
  pact: { name: '9K35M3 Strela-10M3', weapon: '9M333 missiles', text: 'The tracked short-range missile system of the motor rifle regiments, with a better seeker than its old self.' },
  by: { name: 'Strela-10M2', weapon: '9M37 missiles', text: 'Belarus’s Strela-10: an older seeker on the same tracked carrier.' },
});

const towedAA = restyle('towedAA', { nato: R(m85('towedAA').pact), pl: R(m85('towedAA').pact), pact: R(m85('towedAA').pact), by: R(m85('towedAA').pact) }, {
  nato: { name: 'ZUR-23-2KG Jodek-G', weapon: '2 × 23 mm, Grom', text: 'Polish twin 23 mm guns with Grom missiles, lent to the US brigade’s air defence: cheap, quick to set up, deadly to drones.' },
  pl: { name: 'ZUR-23-2KG Jodek-G', weapon: '2 × 23 mm, Grom', text: 'The modernised twin 23 mm with a thermal sight and Grom missiles on the mount — the backbone of Polish short-range air defence.' },
  pact: { name: 'ZU-23-2', weapon: '2 × 23 mm', text: 'The towed twin 23 mm, often mounted on an MT-LB or a truck: still the commonest gun against drones.' },
  by: { name: 'ZU-23-2', weapon: '2 × 23 mm', text: 'The towed twin 23 mm of the Belarusian army.' },
});

const airRadar = restyle('airRadar', { nato: R(m85('airRadar').nato), pl: R(m85('airRadar').pact), pact: R(m85('airRadar').pact), by: R(m85('airRadar').pact) }, {
  nato: { name: 'AN/MPQ-64 Sentinel', weapon: 'unarmed', text: 'The air-defence radar: it sees helicopters, jets and drones far out and hands them to every launcher and gun around it.' },
  pl: { name: 'Soła', weapon: 'unarmed', text: 'Poland’s mobile 3D radar: the eyes of the brigade’s air defence.' },
  pact: { name: 'Podlet-K1', weapon: 'unarmed', text: 'A low-altitude search radar: it picks out drones and helicopters hugging the ground.' },
  by: { name: 'P-19', weapon: 'unarmed', text: 'The old P-19 on its truck, still watching the sky.' },
});

const spMortar = restyle('spMortar', { nato: R(m85('spMortar').nato), pl: M.buildRak, pact: R(m85('spMortar').pact), by: R(m85('spMortar').pact) }, {
  nato: { name: 'M1064A3 Mortar Carrier', weapon: '120 mm M121 mortar', text: 'The heavy mortar on its M113: fires the moment it stops, smoke and illumination on call, and drives off before the answer lands.' },
  pl: { name: 'M120K Rak', weapon: '120 mm turret mortar, APR-120', text: 'A 120 mm mortar in a turret on the Rosomak: it fires on the move-stop, some of its bombs laser-guided onto what an observer marks.' },
  pact: { name: '2S34 Hosta', weapon: '120 mm 2A80 gun-mortar', text: 'The modernised Nona: heavy bombs on anything spotted, smoke and illumination too.' },
  by: { name: '2S9 Nona-S', weapon: '120 mm 2A51 gun-mortar', text: 'The airborne gun-mortar of the Belarusian mobile brigades.' },
}, { factionStats: { pl: { guided: { k: 0.15, share: 0.25, laser: true }, magSize: 12 } } });

const ambulance = restyle('ambulance', { nato: R(m85('ambulance').nato), pl: R(m85('ambulance').bw), pact: R(m85('ambulance').pact), by: R(m85('ambulance').pact) }, {
  nato: { name: 'AMPV Medical', weapon: 'unarmed', text: 'The armoured ambulance that replaced the M113: it patches up the wounded close behind the line.' },
  pl: { name: 'Sanitarka', weapon: 'unarmed', text: 'A Polish field ambulance: wounded infantry nearby are treated and back in the fight sooner.' },
  pact: { name: 'MT-LB Medical', weapon: 'unarmed', text: 'The tracked ambulance of the motor rifle battalion.' },
  by: { name: 'MT-LB Medical', weapon: 'unarmed', text: 'The Belarusian tracked ambulance.' },
});

const recovery = restyle('recovery', { nato: R(m85('recovery').nato), pl: R(m85('recovery').pact), pact: R(m85('recovery').pact), by: R(m85('recovery').pact) }, {
  nato: { name: 'M88A2 Hercules', weapon: 'unarmed', text: 'The heavy recovery vehicle: tows wrecked Abrams back and repairs damaged vehicles nearby.' },
  pl: { name: 'WZT-3M', weapon: 'unarmed', text: 'The Polish T-72-based recovery tank: repairs the PT-91s and drags the wrecks away.' },
  pact: { name: 'BREM-1M', weapon: 'unarmed', text: 'The recovery vehicle on the T-72 hull: mends tracks and engines close behind the tanks.' },
  by: { name: 'BREM-1', weapon: 'unarmed', text: 'The Belarusian T-72 recovery vehicle.' },
});

const bridgeLayer = restyle('bridgeLayer', { nato: R(m85('bridgeLayer').nato), pl: R(m85('bridgeLayer').nva), pact: R(m85('bridgeLayer').pact), by: R(m85('bridgeLayer').pact) }, {
  nato: { name: 'M1074 Joint Assault Bridge', weapon: 'scissors bridge', text: 'A scissors bridge laid from an armoured hull in minutes across a river or a gap — the way over for the tanks.' },
  pl: { name: 'BLG-67M2', weapon: 'scissors bridge', text: 'The Polish tank bridge: unfolds across a river in a few minutes.' },
  pact: { name: 'MTU-72', weapon: 'bridge', text: 'The bridge layer on the T-72 hull: one span across a river for the tanks.' },
  by: { name: 'MTU-72', weapon: 'bridge', text: 'The Belarusian bridge layer on the T-72 hull.' },
});

const cev = restyle('cev', { nato: R(m85('cev').nato), pl: R(m85('cev').pact), pact: R(m85('cev').pact), by: R(m85('cev').pact) }, {
  nato: { name: 'M1150 Assault Breacher', weapon: 'line charges, plough', text: 'The engineers’ tank: it ploughs through minefields and fires line charges to clear a lane through wire and obstacles.' },
  pl: { name: 'MID-M', weapon: 'dozer blade, crane', text: 'The Polish engineer tank: it clears obstacles and digs positions under fire.' },
  pact: { name: 'IMR-3M', weapon: 'dozer, crane', text: 'The armoured engineer vehicle on the T-90 hull: it clears rubble, obstacles and mines.' },
  by: { name: 'IMR-2', weapon: 'dozer, crane', text: 'The older armoured engineer vehicle of the Belarusian army.' },
});

const mineClear = restyle('mineClear', { nato: R(m85('mineClear').nato), pl: R(m85('mineClear').nva), pact: R(m85('mineClear').pact), by: R(m85('mineClear').pact) }, {
  nato: { name: 'M1A1 with mine plough', weapon: 'mine plough', text: 'An Abrams with a plough on its nose: it turns the mines out of a lane for the tanks behind it.' },
  pl: { name: 'PT-91 with KMT-7', weapon: 'mine roller', text: 'A Polish tank pushing mine rollers: a lane through the minefield for the rest.' },
  pact: { name: 'UR-77 Meteorit', weapon: 'line charges', text: 'Rockets drag explosive hoses across a minefield and blow a lane through it — and through anything else in the way.' },
  by: { name: 'UR-77 Meteorit', weapon: 'line charges', text: 'The Belarusian mine-clearing vehicle with its line charges.' },
});

const commandPost = restyle('commandPost', { nato: R(m85('commandPost').nato), pl: R(m85('commandPost').bw), pact: R(m85('commandPost').pact), by: R(m85('commandPost').pact) }, {
  nato: { name: 'M1068A3 command post', weapon: 'unarmed', text: 'The battalion command post: radios, maps and the digital net that ties drones, guns and units together.' },
  pl: { name: 'Stanowisko dowodzenia', weapon: 'unarmed', text: 'A Polish wheeled command post, the brigade’s battle management on board.' },
  pact: { name: 'R-149MA1 command post', weapon: 'unarmed', text: 'The command and staff vehicle of a Russian battalion: its radios carry the orders — and give it away.' },
  by: { name: 'BTR-80 KShM', weapon: 'unarmed', text: 'The Belarusian command post on the BTR-80.' },
});

// Poland's Territorial Defence (doctrine 'kampf'): local volunteers that don't count against the cap
const kampfgruppe = derive(T.kampfgruppe, {
  armies: ['pl'], cost: 70,
  models: men({ army: 'pl' }),
  variants: {
    pl: { name: 'Obrona Terytorialna', weapon: 'Grot rifles, Piorun, Javelin', text: 'The Territorial Defence Force: weekend soldiers who live where they fight. Lighter than the regulars and quicker to give ground, but cheap — and they don’t count against your unit cap.' },
  },
});

export const TYPES_2027 = {
  ...TYPES_1985,
  rifles, atTeam, mgTeam, crew, scouts, sniper, engineers, mortar, observers, manpads, airAssault,
  tank, heavyTank, ifv, reconVehicle, tankDestroyer,
  fpvTeam, loiterTeam,
  artillery, rockets, jammer, cbRadar,
  aa, gunMissile, sam, towedAA, airRadar, spMortar, ambulance, recovery, bridgeLayer, cev, mineClear, commandPost, kampfgruppe,
};
/** No stand-ins: every 1985 type serves until its own step replaces it. */
export const ALIAS_2027 = {};
