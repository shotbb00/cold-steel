// The 1918 roster (data/epoch.js): the Western Front in Picardy, the British and the French against
// the German Heer and its Sturmtruppen. Variants, stats and models are keyed `nato` (British Army),
// `fr` (French Army), `pact` (German Heer), `st` (Sturmtruppen). Like 1945, each type keeps a 1985
// id so the modes, maps and the AI work, and derives from its 1985 counterpart.
// Step 1: the riflemen and the machine guns. Everything else stands in through ALIAS_1918 (units/index.js
// typeOf) until its step (see the 1918 design notes): tanks 3, guns and gas 4, cavalry and the rest 5.
import { TYPES_1985 } from '../units/index.js';
import { buildWw1Soldier } from '../models/ww1Soldier.js';

const T = TYPES_1985;
const men = (o = {}) => ({
  nato: () => buildWw1Soldier({ army: 'uk', ...o }), fr: () => buildWw1Soldier({ army: 'fr', ...o }),
  pact: () => buildWw1Soldier({ army: 'de', ...o }), st: () => buildWw1Soldier({ army: 'st', ...o }),
});
const derive = (base, o) => ({ ...base, ...o, stats: { ...base.stats, ...o.stats }, specialist: o.specialist ?? base.specialist });

const rifles = derive(T.rifles, {
  name: 'Infantry Section', shortName: 'Infantry',
  stats: { lightAT: 0, nightSight: undefined, smoke: undefined },
  kitModels: undefined,   // (no kits to pick up yet)
  factionStats: {   // bolt actions (seconds per aimed shot, rounds a load): the SMLE's ten and its quick bolt, the Lebel's slow tube, the Gew 98's five
    nato: { fireCooldown: 1.9, magSize: 10, reloadTime: 4, playerFireInterval: 0.9 },
    fr: { fireCooldown: 2.6, magSize: 8, reloadTime: 6, playerFireInterval: 1.4 },
    pact: { fireCooldown: 2.4, magSize: 5, reloadTime: 3.5, playerFireInterval: 1.3 },
    st: { fireCooldown: 0.9, magSize: 32, reloadTime: 4, playerFireInterval: 0.12, range: 70, grenades: 4, hp: 110, breakMorale: 0.12 }, // the MP 18 and the grenades: short range, hard men
  },
  models: { ...men(), st: () => buildWw1Soldier({ army: 'st', weapon: 'smg' }) },
  variants: {
    nato: { name: 'Infantry Section', weapon: 'SMLE Mk III, Lewis gun, Mills bombs', text: 'The British section of 1918: riflemen with the quick-firing Lee-Enfield round their Lewis gun, bombers with Mills grenades.' },
    fr: { name: 'Poilus', weapon: 'Lebel 1886, Chauchat, VB grenades', text: 'The French infantry in horizon blue: the long Lebel and its needle bayonet, the Chauchat automatic rifle for the assault.' },
    pact: { name: 'Infanteriegruppe', weapon: 'Gewehr 98, MG 08/15, Stielhandgranaten', text: 'The German Gruppe of 1918, built round its light machine gun: the riflemen carry its ammunition and guard it.' },
    st: { name: 'Stoßtrupp', weapon: 'MP 18, Karabiner 98 AZ, Stielhandgranaten', text: 'The storm troops: sub-machine guns and sacks of grenades, trained to slip past the strongpoints and fight through the trenches at close quarters.' },
  },
});

const mgTeam = derive(T.mgTeam, {
  specialist: { ...T.mgTeam.specialist, armyStats: {
    nato: { burst: 10, burstInterval: 0.11, fireCooldown: 2.2, magSize: 47, reloadTime: 5 },    // Lewis: the 47-round pan
    fr: { burst: 6, burstInterval: 0.25, fireCooldown: 2.4, magSize: 20, reloadTime: 4, spread: 0.05 }, // Chauchat: slow, the 20-round half-moon, not accurate
    pact: { burst: 14, burstInterval: 0.12, fireCooldown: 2.0, magSize: 100, reloadTime: 6 },  // MG 08/15: the belt drum, the water jacket keeps it firing
    st: { burst: 14, burstInterval: 0.12, fireCooldown: 2.0, magSize: 100, reloadTime: 6 },
  } },
  models: men(),
  specialistModels: men({ weapon: 'mg' }),
  variants: {
    nato: { name: 'Lewis Gun Team', weapon: 'Lewis gun, .303', text: 'The Lewis: light enough to go over the top with the riflemen, the fire that carries the attack forward.' },
    fr: { name: 'Fusiliers-mitrailleurs', weapon: 'Chauchat 1915, 8 mm', text: 'The Chauchat team: walking fire in the assault. Light and crude — it jams, and it hits little at range.' },
    pact: { name: 'MG 08/15 Team', weapon: 'MG 08/15, 7.92 mm', text: 'The light version of the Maxim: water-cooled, heavy for one man, and it fires as long as there is a belt.' },
    st: { name: 'MG 08/15 Team', weapon: 'MG 08/15, 7.92 mm', text: 'The storm battalion\'s machine guns: they pin the strongpoint while the Stoßtrupp works round it.' },
  },
});

export const TYPES_1918 = {
  rifles, mgTeam,
  bunker: T.bunker, strongpoint: T.strongpoint, hq: T.hq,   // the fortifications are of every war
};

/** What stands in for the types not built yet: the riflemen (ponytail: each gets its own in its step). */
export const ALIAS_1918 = Object.fromEntries(Object.keys(T).filter((id) => !TYPES_1918[id]).map((id) => [id, 'rifles']));
