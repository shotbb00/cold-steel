// The 2027 roster (data/epoch.js): a hypothetical war in the Suwałki Gap, the US Army and the Polish
// Army against the Russian Ground Forces and the Belarusian Army. Variants, stats and models are keyed
// `nato` (US Army), `pl` (Polish Army), `pact` (Russia), `by` (Belarus) — an army without an entry
// takes its side's (data/factions.js forArmy). Like the other eras, every type keeps its 1985 id so the
// modes, maps and the AI work, and derives from its 1985 counterpart.
// Step 1: the infantry — riflemen and every team on foot, in modern kit. The vehicles, guns, aircraft
// and support stand in with their 1985 selves until their steps (see the 2027 design notes): armour 3,
// drones 4, EW and precision fires 5, the rest of the roster 6.
import { TYPES_1985 } from '../units/index.js';
import { buildModernSoldier } from '../models/modernSoldier.js';

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

export const TYPES_2027 = {
  ...TYPES_1985,
  rifles, atTeam, mgTeam, crew, scouts, sniper, engineers, mortar, observers, manpads, airAssault,
};
/** No stand-ins: every 1985 type serves until its own step replaces it. */
export const ALIAS_2027 = {};
