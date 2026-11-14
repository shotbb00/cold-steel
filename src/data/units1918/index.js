// The 1918 roster (data/epoch.js): the Western Front in Picardy, the British and the French against
// the German Heer and its Sturmtruppen. Variants, stats and models are keyed `nato` (British Army),
// `fr` (French Army), `pact` (German Heer), `st` (Sturmtruppen). Like 1945, each type keeps a 1985
// id so the modes, maps and the AI work, and derives from its 1985 counterpart.
// Step 1: the riflemen and the machine guns; step 3 the tanks and armoured cars. Everything else stands in through ALIAS_1918 (units/index.js
// typeOf) until its step (see the 1918 design notes): tanks 3, guns and gas 4, cavalry and the rest 5.
import { TYPES_1985 } from '../units/index.js';
import { buildWw1Soldier } from '../models/ww1Soldier.js';
import { buildWw1Gun } from '../models/ww1Guns.js';
import { buildBalloonUK, buildBalloonFR, buildBalloonDE, buildMarkV, buildBeuteMarkIV, buildA7VU, buildWhippet, buildBeuteWhippet, buildRenaultFT, buildSchneiderCA1, buildA7V, buildRollsRoyceAC, buildPeugeotAC, buildEhrhardtAC } from '../models/ww1Armour.js';

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

// ------------------------------------------------------------------ armour (step 3)
// The first tanks: slow, blind, proof against rifle bullets and not much more. Every one of them
//   breakdown: the chance a second, while it drives, that something gives (systems/Breakdowns.js):
//              it stops while the crew mends it (a supply tank close by: sooner)
//   ditch:     the chance a second, crossing a trench or a shell hole, that it bellies and sticks
// and none fires on the move with any hope of hitting (noStabilizer).
const TANK_1918 = { nightSight: undefined, smoke: undefined, noStabilizer: true, sight: 60, aggroRange: 120, preferredRange: 80, aimTime: 1.6, turnRate: 0.35, turretRate: 0.5, spread: 0.008 };
const MG_FIRE = { weapon: 'rifle', weaponSound: 'mg', antiArmor: false, damage: 60, vsArmor: 0.03, pierce: 0, splash: 0, fireCooldown: 0.12, burst: 1, magSize: 250, reloadTime: 5, boltSize: 0.5, range: 150, playerFireInterval: 0.12 };

const tank = derive(T.tank, {
  name: 'Tanks', shortName: 'Tanks',
  stats: { ...TANK_1918, hp: 900, armor: 0.4, speed: 1.9, range: 160, damage: 260, splash: 2.5, pierce: 0.35, fireCooldown: 5, reloadTime: 6, crew: 4, bailChance: 0.7, height: 2.7, radius: 2.6, breakdown: 1 / 240, ditch: 0.02 },
  factionStats: {
    nato: {},                                                                                                                    // Mark V: the 6-pounders, crosses trenches best
    fr: { hp: 520, armor: 0.35, speed: 2.4, damage: 150, splash: 1.5, fireCooldown: 3.5, crew: 2, radius: 1.5, height: 2.2, breakdown: 1 / 300, ditch: 0.06, turnRate: 0.6, turretRate: 0.9 }, // Renault FT: small, a real turret, falls into big holes
    pact: { hp: 1100, armor: 0.45, speed: 1.6, damage: 280, fireCooldown: 4.5, height: 3.3, radius: 2.8, breakdown: 1 / 200, ditch: 0.15, sight: 70 }, // A7V: thick, high, and bad over broken ground
    st: { speed: 1.7, breakdown: 1 / 200 },                                                                                      // the captured Mark IV: older, worn
  },
  armyCost: { fr: 320 },
  models: { nato: buildMarkV, fr: buildRenaultFT, pact: buildA7V, st: buildBeuteMarkIV },
  engine: 'engine.diesel',
  variants: {
    nato: { name: 'Mark V', weapon: 'two 6-pounders, four Hotchkiss MGs', text: 'The rhomboid: its tracks run right round the hull, so it climbs out of trenches the others fall into. Slow, deaf, half-blind, proof against bullets — and it breaks down. Stops to fire.' },
    fr: { name: 'Renault FT', weapon: 'Puteaux 37 mm', text: 'The first tank with a turret that turns all the way round. Small, cheap, built by the thousand: a swarm of them goes where one Mark V can\'t. Big shell holes swallow it.' },
    pact: { name: 'A7V', weapon: '5.7 cm Maxim-Nordenfelt, six MG 08', text: 'Germany\'s own tank, a steel fortress for eighteen men: thick armour, a good gun — and a belly so low that every shell hole is a trap. Only twenty were built.' },
    st: { name: 'Beutepanzer IV', weapon: 'two 6-pounders, MG 08s', text: 'A captured British Mark IV under the iron cross: there were more of these in German hands than A7Vs. Worn out before it was taken.' },
  },
});

const heavyTank = derive(T.heavyTank, {
  name: 'Fast Tanks', shortName: 'Fast tanks',
  stats: { ...TANK_1918, ...MG_FIRE, hp: 700, armor: 0.3, speed: 3.6, crew: 3, bailChance: 0.7, height: 2.75, radius: 2.4, breakdown: 1 / 300, ditch: 0.08, aggroRange: 130 },
  factionStats: {
    nato: {},                                                                                                                   // Whippet: four Hotchkiss MGs, fast
    fr: { weapon: 'cannon', weaponSound: undefined, antiArmor: true, damage: 300, vsArmor: 1, pierce: 0.3, splash: 3, fireCooldown: 6, magSize: 40, reloadTime: 6, boltSize: 1.4, range: 140, playerFireInterval: 6, hp: 800, speed: 2.2, ditch: 0.12, breakdown: 1 / 220 }, // Schneider CA1: the short 75
    pact: { weapon: 'cannon', weaponSound: undefined, antiArmor: true, damage: 270, vsArmor: 1, pierce: 0.35, splash: 2.5, fireCooldown: 5, magSize: 40, reloadTime: 6, boltSize: 1.4, range: 160, playerFireInterval: 5, hp: 1300, armor: 0.45, speed: 1.8, ditch: 0.03 }, // A7V-U: the German rhomboid
    st: {},                                                                                                                     // the captured Whippet
  },
  models: { nato: buildWhippet, fr: buildSchneiderCA1, pact: buildA7VU, st: buildBeuteWhippet },
  engine: 'engine.diesel',
  variants: {
    nato: { name: 'Medium A Whippet', weapon: 'four Hotchkiss machine guns', text: 'Twice as fast as a Mark V: the tank to go through the gap and run down the guns and the reserves behind it. Machine guns only.' },
    fr: { name: 'Schneider CA1', weapon: 'Blockhaus Schneider 75 mm', text: 'A box on a tractor\'s tracks, the short 75 in its right side and a beak to cut wire. Overhangs front and back: it bellies in trenches.' },
    pact: { name: 'A7V-U', weapon: 'two 5.7 cm guns', text: 'The German answer to the rhomboid, built in 1918 — one prototype, here the tank they would have built in numbers. It crosses trenches like a Mark V.' },
    st: { name: 'Beute-Whippet', weapon: 'Hotchkiss and MG 08', text: 'A captured Whippet, turned round against its makers: fast, machine guns only.' },
  },
});

const reconVehicle = derive(T.reconVehicle, {
  name: 'Armoured Cars', shortName: 'Armoured cars',
  stats: { ...MG_FIRE, nightSight: undefined, smoke: undefined, hp: 320, armor: 0.15, speed: 7, sight: 90, breakdown: 1 / 400, ditch: 0.35 }, // (wheels: hopeless off the roads in a crater field)
  factionStats: {
    fr: { weapon: 'cannon', weaponSound: undefined, antiArmor: true, damage: 150, vsArmor: 1, pierce: 0.3, splash: 1.5, fireCooldown: 3, magSize: 40, reloadTime: 5, boltSize: 1, playerFireInterval: 3 }, // Peugeot: the 37 mm
  },
  models: { nato: buildRollsRoyceAC, fr: buildPeugeotAC, pact: buildEhrhardtAC, st: buildEhrhardtAC },
  engine: 'engine.dieselSmall',
  variants: {
    nato: { name: 'Rolls-Royce Armoured Car', weapon: 'Vickers machine gun', text: 'A Silver Ghost chassis in armour: fast and reliable on roads, useless in a crater field. For the open ground behind the line.' },
    fr: { name: 'Peugeot AC', weapon: 'Puteaux 37 mm', text: 'An open armoured car with the 37 mm behind a shield: quick, light, and it needs the roads.' },
    pact: { name: 'Ehrhardt E-V/4', weapon: 'three MG 08', text: 'A big four-wheel-drive armoured car with a turret: built for the east and for the streets — keep it out of the shell holes.' },
    st: { name: 'Ehrhardt E-V/4', weapon: 'three MG 08', text: 'A big four-wheel-drive armoured car with a turret: built for the east and for the streets — keep it out of the shell holes.' },
  },
});

const CREW_TEXT = 'The crew of a knocked-out tank: a few men with pistols and a machine gun pulled from the wreck.';
const crew = derive(T.crew, {
  models: men({ crew: true }),
  variants: { nato: { name: 'Tank Crew', weapon: 'revolvers, a Lewis', text: CREW_TEXT }, fr: { name: 'Équipage', weapon: 'pistols', text: CREW_TEXT }, pact: { name: 'Besatzung', weapon: 'pistols, an MG 08', text: CREW_TEXT }, st: { name: 'Besatzung', weapon: 'pistols', text: CREW_TEXT } },
});

// ------------------------------------------------------------------ fire (step 4)
// The guns: quick-firing, horse-drawn (the 1806 team and limber: models/ww1Guns.js), firing indirect —
// what an observer or a balloon sees, they hit (the 1985 artillery rules). kind 'gun': limbered to move,
// unlimbered (towed.deploy) to fire. The gunners stand in the open.
const GUN_1918 = { nightSight: undefined, armor: 0.05, crew: 0, turnRate: 0.6, radius: 1.8, height: 1.8, eyeHeight: 1.7, aimHeight: 1, breakMorale: 0.25, noStabilizer: true, smokeRounds: 4 };
const gunsOf = (size) => ({ nato: () => buildWw1Gun({ army: 'uk', size }), fr: () => buildWw1Gun({ army: 'fr', size }), pact: () => buildWw1Gun({ army: 'de', size }), st: () => buildWw1Gun({ army: 'st', size }) });

const artillery = derive(T.artillery, {
  kind: 'gun', name: 'Field Guns', shortName: 'Field guns', cost: 300, weaponSound: 'arty',
  formation: { count: 2, columns: 2, spacing: 9 },
  stats: { ...GUN_1918, hp: 300, speed: 2.8, range: 330, preferredRange: 220, damage: 150, splash: 6, crater: 0.5, fireCooldown: 4, magSize: 6, reloadTime: 8, towed: { deploy: 20 }, traverse: 0.1 },
  factionStats: { st: { range: 240, damage: 130, towed: { deploy: 10 }, speed: 3.2 } },   // the infantry gun: lighter, shorter, quick into action
  models: gunsOf('field'),
  variants: {
    nato: { name: '18-pounder', weapon: '18-pdr QF, 84 mm', text: 'The British field gun: shrapnel to sweep the wire and the open, high explosive for the trenches. Horses bring it up; unlimbered, it fires as fast as the crew can load.' },
    fr: { name: 'Canon de 75', weapon: '75 mm mle 1897', text: 'The famous 75: the first gun that stayed laid as it fired, its recoil taken by oil and air — fifteen rounds a minute from a good crew.' },
    pact: { name: '7.7 cm FK 16', weapon: '7.7 cm field gun', text: 'The German field gun of 1916, longer than the old one: it reaches further and hits the enemy batteries back.' },
    st: { name: '7.7 cm Infanteriegeschütz', weapon: '7.7 cm infantry gun', text: 'A light gun that goes forward with the storm battalion: shorter reach, but into action in moments, close behind the assault.' },
  },
});

const spMortar = derive(T.spMortar, {
  kind: 'gun', name: 'Heavy Howitzers', shortName: 'Howitzers', cost: 380, weaponSound: 'arty',
  formation: { count: 2, columns: 2, spacing: 10 },
  stats: { ...GUN_1918, hp: 380, speed: 2.2, range: 430, minRange: 80, preferredRange: 300, damage: 260, splash: 9, crater: 0.9, scatter: 4, fireCooldown: 9, magSize: 4, reloadTime: 16, towed: { deploy: 35 }, traverse: 0.08, muzzleKind: 'artillery', smokeRounds: 0 },
  factionStats: { st: { range: 380, damage: 210, splash: 8, towed: { deploy: 25 } } },   // the 10.5 cm light field howitzer
  models: gunsOf('heavy'),
  variants: {
    nato: { name: '6-inch Howitzer', weapon: 'BL 6-inch 26 cwt', text: 'The heavy howitzer that broke the German trenches in 1918: shells that dig the dugouts in, from far behind the line.' },
    fr: { name: '155 mm Schneider', weapon: '155 C mle 1917', text: 'The French heavy howitzer: a big shell at a steep angle, into the trenches.' },
    pact: { name: '15 cm sFH 13', weapon: '15 cm heavy field howitzer', text: 'The German heavy howitzer: the backbone of the hurricane bombardments of 1918.' },
    st: { name: '10.5 cm leFH 16', weapon: '10.5 cm light field howitzer', text: 'The light field howitzer that follows the storm troops: a lighter shell, sooner into action.' },
  },
});

const rockets = derive(T.rockets, {
  kind: 'gun', name: 'Heavy Trench Mortars', shortName: 'Heavy mortars', cost: 280, weaponSound: 'mortar',
  formation: { count: 1, columns: 1, spacing: 10 },
  stats: { ...GUN_1918, hp: 260, speed: 1.6, range: 230, minRange: 40, preferredRange: 160, damage: 380, splash: 11, crater: 1.3, scatter: 6, scatterPerM: 0.05, fireCooldown: 20, magSize: 1, reloadTime: 20, towed: { deploy: 30 }, traverse: 0.15, muzzleKind: 'mortar', trail: false, smokeRounds: 0 },
  factionStats: { st: { damage: 240, splash: 8, crater: 0.8, fireCooldown: 10, reloadTime: 10 } }, // the medium Minenwerfer
  models: gunsOf('mortar'),
  variants: {
    nato: { name: '9.45-inch Mortar', weapon: '9.45 in trench mortar', text: 'The "Flying Pig": a huge bomb that tumbles slowly over and lands with a blast that flattens wire, dugouts and men. Short reach, slow to fire.' },
    fr: { name: 'Mortier de 240', weapon: '240 mm trench mortar', text: 'The French heavy trench mortar: one bomb at a time, each one a crater.' },
    pact: { name: 'Schwerer Minenwerfer', weapon: '25 cm trench mortar', text: 'The heavy Minenwerfer: its bombs come down almost straight on the trench, and nothing in it survives.' },
    st: { name: 'Mittlerer Minenwerfer', weapon: '17 cm trench mortar', text: 'The medium Minenwerfer: lighter bombs, faster, carried forward behind the storm troops.' },
  },
});

const mortar = derive(T.mortar, {
  models: men(),
  specialistModels: men({ weapon: 'mortar' }),
  stats: { lightAT: 0, nightSight: undefined, smoke: undefined },
  variants: {
    nato: { name: 'Stokes Mortar Team', weapon: '3-inch Stokes mortar', text: 'The Stokes: a plain tube on a baseplate, a bomb every few seconds into the next trench.' },
    fr: { name: 'Crapouillot', weapon: '58 mm trench mortar', text: 'The "little toad": the French trench mortar, lobbing its winged bombs over into the German line.' },
    pact: { name: 'Leichter Minenwerfer', weapon: '7.58 cm leMW', text: 'The light Minenwerfer: it can fire flat as well as high, and goes forward with the infantry.' },
    st: { name: 'Leichter Minenwerfer', weapon: '7.58 cm leMW', text: 'The storm battalion\'s own mortars: they shell the strongpoint while the Stoßtrupp works round it.' },
  },
});

const observers = derive(T.observers, {
  models: men({ scout: true, radio: true }),
  variants: {
    nato: { name: 'Forward Observation Officer', weapon: 'revolver, field telephone, binoculars', text: 'An artillery officer up with the infantry, a telephone wire running back to the guns: what he sees, the guns hit.' },
    fr: { name: 'Observateurs', weapon: 'pistol, telephone, binoculars', text: 'The artillery\'s observers in the front line: within their sight the 75s hit.' },
    pact: { name: 'Artilleriebeobachter', weapon: 'Pistole, Feldfernsprecher, Scherenfernrohr', text: 'The artillery observer with his scissors telescope and his telephone: within his sight the guns are accurate.' },
    st: { name: 'Artilleriebeobachter', weapon: 'Pistole, Feldfernsprecher', text: 'The observers who go forward with the storm troops and bring the guns along behind them.' },
  },
});

/** Sound ranging (1918 invented it): microphones out, every gun that fires within reach is plotted. */
const cbRadar = derive(T.observers, {
  id: 'cbRadar', name: 'Sound Ranging Section', shortName: 'Sound ranging', category: 'fire', cost: 200,
  formation: { count: 3, columns: 3, spacing: 4 },
  stats: { observer: undefined, cbRadar: { range: 450, arc: 6.3, deploy: 25 } },
  models: men({ radio: true }),
  variants: {
    nato: { name: 'Sound Ranging Section', weapon: 'Bull-Tucker microphones', text: 'The new science of 1918: a line of microphones times the bang of each German gun, and the plot puts your guns on it. Needs 25 s to lay out.' },
    fr: { name: 'Section de repérage', weapon: 'microphones, plotting board', text: 'Sound ranging: every enemy gun that fires within reach is plotted for your artillery. Needs 25 s to lay out.' },
    pact: { name: 'Schallmesstrupp', weapon: 'microphones, plotting board', text: 'The sound-ranging troop: every enemy gun that fires within reach is plotted for your artillery. Needs 25 s to lay out.' },
    st: { name: 'Schallmesstrupp', weapon: 'microphones, plotting board', text: 'The sound-ranging troop: every enemy gun that fires within reach is plotted for your artillery. Needs 25 s to lay out.' },
  },
});

/** The kite balloon (the air-radar slot): two observers in a basket forty metres up on a cable from a winch lorry — they see over every hill, and what they see the guns hit. Hauled down to move. */
const airRadar = derive(T.airRadar, {
  name: 'Observation Balloon', shortName: 'Balloon', category: 'fire', cost: 220,
  stats: { airRadar: undefined, observer: { scatter: 0.5 }, sight: 330, fov: 6.3, eyeHeight: 40, speed: 3.2, hp: 260, armor: 0.02, height: 3 },
  models: { nato: buildBalloonUK, fr: buildBalloonFR, pact: buildBalloonDE, st: buildBalloonDE },
  engine: 'engine.dieselSmall',
  variants: {
    nato: { name: 'Kite Balloon Section', weapon: 'telephone, binoculars', text: 'A Caquot balloon on its winch lorry: two observers forty metres up see far over the enemy line and talk the guns onto it. A prize for enemy fighters.' },
    fr: { name: 'Ballon Caquot', weapon: 'telephone, binoculars', text: 'The French observation balloon: from its basket the whole sector is laid out for the 75s.' },
    pact: { name: 'Fesselballon', weapon: 'Fernsprecher, Fernglas', text: 'The "Drachen": a tethered balloon over the German line, its observers directing the guns onto everything that moves.' },
    st: { name: 'Fesselballon', weapon: 'Fernsprecher, Fernglas', text: 'The "Drachen": a tethered balloon over the German line, its observers directing the guns onto everything that moves.' },
  },
});

export const TYPES_1918 = {
  rifles, mgTeam, tank, heavyTank, reconVehicle, crew,
  artillery, spMortar, rockets, mortar, observers, cbRadar, airRadar,
  bunker: T.bunker, strongpoint: T.strongpoint, hq: T.hq,   // the fortifications are of every war
};

/** What stands in for the types not built yet: the riflemen (ponytail: each gets its own in its step). */
export const ALIAS_1918 = Object.fromEntries(Object.keys(T).filter((id) => !TYPES_1918[id]).map((id) => [id, 'rifles']));
