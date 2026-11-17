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

export const TYPES_2027 = {
  ...TYPES_1985,
  rifles, atTeam, mgTeam, crew, scouts, sniper, engineers, mortar, observers, manpads, airAssault,
  tank, heavyTank, ifv, reconVehicle, tankDestroyer,
  fpvTeam, loiterTeam,
};
/** No stand-ins: every 1985 type serves until its own step replaces it. */
export const ALIAS_2027 = {};
