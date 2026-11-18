// The 1918 roster (data/epoch.js): the Western Front in Picardy, the British and the French against
// the German Heer and its Sturmtruppen. Variants, stats and models are keyed `nato` (British Army),
// `fr` (French Army), `pact` (German Heer), `st` (Sturmtruppen). Like 1945, each type keeps a 1985
// id so the modes, maps and the AI work, and derives from its 1985 counterpart.
// Step 1: the riflemen and the machine guns; step 3 the tanks and armoured cars. Everything else stands in through ALIAS_1918 (units/index.js
// typeOf) until its step (see the 1918 design notes): tanks 3, guns and gas 4, cavalry and the rest 5.
import { TYPES_1985 } from '../units/index.js';
import { SHIPS_1918 } from './ships.js';
import { COAST_1918 } from './coast.js';
import fronts from './fronts.js';
import { buildWw1Soldier } from '../models/ww1Soldier.js';
import { buildWw1Gun } from '../models/ww1Guns.js';
import { buildCavalry, buildCavalryFoot } from '../models/napCavalry.js';
import { buildBalloonUK, buildBalloonFR, buildBalloonDE, buildSupplyTank, buildAALorryUK, buildAALorryFR, buildAALorryDE, buildAmbulanceUK, buildAmbulanceFR, buildAmbulanceDE, buildSupplyLorryFR, buildSupplyLorryDE, buildStaffCarUK, buildStaffCarFR, buildStaffCarDE, buildMarkV, buildBeuteMarkIV, buildA7VU, buildWhippet, buildBeuteWhippet, buildRenaultFT, buildSchneiderCA1, buildA7V, buildRollsRoyceAC, buildPeugeotAC, buildEhrhardtAC } from '../models/ww1Armour.js';

const T = TYPES_1985;
/** Each table key's soldier (models/ww1Soldier.js): the Western Front's four, and the other fronts' five (./fronts.js). */
const SOLDIER = { nato: 'uk', fr: 'fr', pact: 'de', st: 'st', ot: 'ot', anzac: 'anzac', it: 'it', ah: 'ah', ru: 'ru' };
const men = (o = {}) => Object.fromEntries(Object.entries(SOLDIER).map(([k, army]) => [k, () => buildWw1Soldier({ army, ...o })]));
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

// ------------------------------------------------------------------ Zeebrugge's storming parties (the coastal map: landed over the Mole's wall)
const BLUE = { nato: () => buildWw1Soldier({ army: 'uk', blue: true }), pact: () => buildWw1Soldier({ army: 'uk', blue: true }) };
const marines = derive(rifles, {
  id: 'marines', name: 'Royal Marines', shortName: 'Marines', coastal: true, armies: ['uk'], cost: (rifles.cost ?? 100) + 30,
  stats: { hp: 110, breakMorale: 0.15, raid: true },
  factionStats: { nato: { ...rifles.factionStats.nato } },
  variants: {
    nato: { name: '4th Battalion, Royal Marines', weapon: 'SMLE, Lewis guns, Mills bombs, Stokes mortars', text: 'The Royal Marine Light Infantry battalion raised for the raid: they go over Vindictive\'s brows onto the Mole and fight along it to the guns. Steadier than any other infantry under fire.' },
    pact: { name: 'Marines', weapon: '—', text: 'Marines.' },
  },
});
const sailors = derive(rifles, {
  id: 'sailors', name: 'Naval Storming Party', shortName: 'Bluejackets', coastal: true, armies: ['uk'], cost: (rifles.cost ?? 100) + 10,
  stats: { hp: 100, speed: (rifles.stats.speed ?? 2) * 1.1, range: 120, breakMorale: 0.22, grenades: 4, raid: true },
  factionStats: { nato: { ...rifles.factionStats.nato, fireCooldown: 2.2 } },
  models: BLUE,
  variants: {
    nato: { name: 'Naval storming party', weapon: 'SMLE, Lewis guns, cutlasses, bombs', text: 'Seamen from the Grand Fleet in their blue jumpers under the Army\'s tin hats: volunteers for the raid, their job to silence the Mole-head battery before the blockships come round it. Fast and fierce, not the best shots.' },
    pact: { name: 'Seamen', weapon: '—', text: 'Seamen.' },
  },
});

// ------------------------------------------------------------------ armour (step 3)
// The first tanks: slow, blind, proof against rifle bullets and not much more. Every one of them
//   breakdown: the chance a second, while it drives, that something gives (systems/Breakdowns.js):
//              it stops while the crew mends it (a supply tank close by: sooner)
//   ditch:     the chance a second, crossing a trench or a shell hole, that it bellies and sticks
// and none fires on the move with any hope of hitting (noStabilizer).
// sideGuns (UnitStack.updateSideGuns): the machine guns in the sponsons, the hull and the cab, each covering its own sector
const MKV_MGS = [{ at: Math.PI / 2, arc: 1.1, range: 140, damage: 60, rate: 8, burst: 10 }, { at: -Math.PI / 2, arc: 1.1, range: 140, damage: 60, rate: 8, burst: 10 }, { at: 0, arc: 0.5, range: 140, damage: 60, rate: 8, burst: 10, y: 2.2 }, { at: Math.PI, arc: 0.8, range: 140, damage: 60, rate: 8, burst: 10 }];
const WHIP_MGS = [{ at: Math.PI / 2, arc: 1.0, range: 140, damage: 60, rate: 8, burst: 10, y: 2.0 }, { at: -Math.PI / 2, arc: 1.0, range: 140, damage: 60, rate: 8, burst: 10, y: 2.0 }, { at: Math.PI, arc: 0.9, range: 140, damage: 60, rate: 8, burst: 10, y: 2.0 }]; // (the Whippet's other three Hotchkiss, round the compartment)
/** The rhomboids' left sponson gun (the right one is the main gun): a second 6-pounder of its own, covering the left side. */
const LEFT_6PDR = { cannon: { splash: 2.5, pierce: 0.35 }, at: -Math.PI / 2, arc: 1.3, range: 160, damage: 200, rate: 1, burst: 1, pause: 5, y: 1.35, out: 2.1 };
const TANK_1918 = { nightSight: undefined, smoke: undefined, noStabilizer: true, sight: 60, aggroRange: 120, preferredRange: 80, aimTime: 1.6, turnRate: 0.35, turretRate: 0.5, spread: 0.008 };
const MG_FIRE = { weapon: 'rifle', weaponSound: 'mg', antiArmor: false, damage: 60, vsArmor: 0.03, pierce: 0, splash: 0, fireCooldown: 0.12, burst: 1, magSize: 250, reloadTime: 5, boltSize: 0.5, range: 150, playerFireInterval: 0.12 };

const tank = derive(T.tank, {
  name: 'Tanks', shortName: 'Tanks',
  stats: { ...TANK_1918, hp: 900, armor: 0.4, speed: 1.9, range: 160, damage: 200, splash: 2.5, pierce: 0.35, fireCooldown: 5, reloadTime: 6, crew: 4, bailChance: 0.7, height: 2.7, radius: 2.6, breakdown: 1 / 240, ditch: 0.02, traverse: 1.4, sideGuns: [...MKV_MGS, LEFT_6PDR] }, // (traverse: the sponson's arc — beyond it the hull swings round; two 6-pounders, each lighter than the A7V's gun)
  factionStats: {
    nato: {},                                                                                                                    // Mark V: the 6-pounders, crosses trenches best
    fr: { hp: 520, armor: 0.35, speed: 2.4, damage: 150, splash: 1.5, fireCooldown: 3.5, crew: 2, radius: 1.5, height: 2.2, breakdown: 1 / 300, ditch: 0.06, turnRate: 0.6, turretRate: 0.9, traverse: undefined, sideGuns: undefined }, // Renault FT: small, a real turret, falls into big holes
    pact: { hp: 1100, armor: 0.45, speed: 1.6, damage: 280, fireCooldown: 4.5, height: 3.3, radius: 2.8, breakdown: 1 / 200, ditch: 0.15, sight: 70, traverse: 0.8, sideGuns: [{ at: Math.PI / 2, arc: 0.9, range: 140, damage: 60, rate: 8, burst: 10 }, { at: Math.PI / 2, arc: 0.9, range: 140, damage: 60, rate: 8, burst: 10 }, { at: -Math.PI / 2, arc: 0.9, range: 140, damage: 60, rate: 8, burst: 10 }, { at: -Math.PI / 2, arc: 0.9, range: 140, damage: 60, rate: 8, burst: 10 }, { at: Math.PI, arc: 0.8, range: 140, damage: 60, rate: 8, burst: 10 }, { at: Math.PI, arc: 0.8, range: 140, damage: 60, rate: 8, burst: 10 }] }, // (the six MG 08s: two a side, two in the tail) // A7V: thick, high, and bad over broken ground
    st: { hp: 900, armor: 0.4, speed: 1.7, damage: 200, fireCooldown: 5, height: 2.7, radius: 2.6, sight: 60, breakdown: 1 / 200, ditch: 0.02, traverse: 1.4, sideGuns: [...MKV_MGS, LEFT_6PDR] }, // (the Sturmtruppen ride on the German Army's numbers: a Mark IV's own, not the A7V's)                                                                                      // the captured Mark IV: older, worn
  },
  armyCost: { fr: 320 },
  models: { nato: buildMarkV, fr: buildRenaultFT, pact: buildA7V, st: buildBeuteMarkIV },
  engine: 'engine.diesel',
  variants: {
    nato: { name: 'Mark V', weapon: 'two 6-pounders (one in each sponson, each on its own), four Hotchkiss MGs', text: 'The rhomboid: its tracks run right round the hull, so it climbs out of trenches the others fall into. Slow, deaf, half-blind, proof against bullets — and it breaks down. Stops to fire.' },
    fr: { name: 'Renault FT', weapon: 'Puteaux 37 mm', text: 'The first tank with a turret that turns all the way round. Small, cheap, built by the thousand: a swarm of them goes where one Mark V can\'t. Big shell holes swallow it.' },
    pact: { name: 'A7V', weapon: '5.7 cm Maxim-Nordenfelt, six MG 08', text: 'Germany\'s own tank, a steel fortress for eighteen men: thick armour, a good gun — and a belly so low that every shell hole is a trap. Only twenty were built.' },
    st: { name: 'Beutepanzer IV', weapon: 'two 6-pounders, MG 08s', text: 'A captured British Mark IV under the iron cross: there were more of these in German hands than A7Vs. Worn out before it was taken.' },
  },
});

const heavyTank = derive(T.heavyTank, {
  name: 'Fast Tanks', shortName: 'Fast tanks',
  stats: { ...TANK_1918, ...MG_FIRE, hp: 700, armor: 0.3, speed: 3.6, crew: 3, bailChance: 0.7, height: 2.75, radius: 2.4, breakdown: 1 / 300, ditch: 0.08, aggroRange: 130, traverse: 1.2, sideGuns: WHIP_MGS }, // (the Whippet's other three Hotchkiss, round the compartment)
  factionStats: {
    nato: {},                                                                                                                   // Whippet: four Hotchkiss MGs, fast
    fr: { weapon: 'cannon', weaponSound: undefined, antiArmor: true, damage: 300, vsArmor: 1, pierce: 0.3, splash: 3, fireCooldown: 6, magSize: 40, reloadTime: 6, boltSize: 1.4, range: 140, playerFireInterval: 6, hp: 800, speed: 2.2, ditch: 0.12, breakdown: 1 / 220, traverse: 0.6, sideGuns: [{ at: Math.PI / 2, arc: 1.2, range: 140, damage: 60, rate: 8, burst: 10 }, { at: -Math.PI / 2, arc: 1.2, range: 140, damage: 60, rate: 8, burst: 10 }] }, // Schneider CA1: the short 75, a Hotchkiss in each side dome
    pact: { weapon: 'cannon', weaponSound: undefined, antiArmor: true, damage: 210, vsArmor: 1, pierce: 0.35, splash: 2.5, fireCooldown: 5, magSize: 40, reloadTime: 6, boltSize: 1.4, range: 160, playerFireInterval: 5, hp: 1300, armor: 0.45, speed: 1.8, ditch: 0.03, traverse: 1.4, sideGuns: [...MKV_MGS, { ...LEFT_6PDR, damage: 210 }] }, // A7V-U: the German rhomboid, a 5.7 cm in each sponson
    st: { ...MG_FIRE, hp: 700, armor: 0.3, speed: 3.6, ditch: 0.08, traverse: 1.2, sideGuns: WHIP_MGS },  // (the Whippet's own, not the A7V-U's)                                                                                                                     // the captured Whippet
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
    pact: { sideGuns: [{ at: Math.PI / 2, arc: 1.1, range: 140, damage: 60, rate: 8, burst: 10, y: 1.8 }, { at: -Math.PI / 2, arc: 1.1, range: 140, damage: 60, rate: 8, burst: 10, y: 1.8 }] }, // Ehrhardt: the turret's MG and one in each side
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
const gunsOf = (size) => Object.fromEntries(Object.entries(SOLDIER).map(([k, army]) => [k, () => buildWw1Gun({ army, size })]));

const artillery = derive(T.artillery, {
  kind: 'gun', name: 'Field Guns', shortName: 'Field guns', cost: 300, weaponSound: 'arty', engine: undefined, tracks: undefined, // (horse-drawn: none of the 1985 gun's diesel or tracks)
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
  kind: 'gun', name: 'Heavy Howitzers', shortName: 'Howitzers', cost: 380, weaponSound: 'arty', engine: undefined, tracks: undefined,
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
  kind: 'gun', name: 'Heavy Trench Mortars', shortName: 'Heavy mortars', cost: 280, weaponSound: 'mortar', engine: undefined, tracks: undefined,
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

// ------------------------------------------------------------------ the rest of the roster (step 5)

// cavalry (the IFV slot; 1806's horses and charge: kind 'cavalry', UnitStack.startCharge / unhorse): carbines at a distance,
// the sword and the lance at the charge — deadly against men caught in the open, slaughtered by machine guns
const RIDERS = { nato: 'uk18', fr: 'fr18', pact: 'de18', st: 'st18', ot: 'ot18', anzac: 'anzac18', it: 'it18', ah: 'ah18', ru: 'ru18' };
const mounts = (mounted = true) => Object.fromEntries(Object.entries(RIDERS).map(([k, army]) => [k, () => buildCavalry({ army, kind: 'medium', mounted })]));
const HORSE_18 = {
  armor: 0, turnRate: 2.6, turretRate: 3, radius: 0.85, height: 2.6, eyeHeight: 2.5, aimHeight: 1.6, fov: 2.6, nightSight: undefined,
  aggroRange: 110, preferredRange: 60, fireCooldown: 2.2, aimTime: 0.6, burst: 1, burstInterval: 0, spread: 0.05, boltSpeed: 500,
  boltSize: 0.5, tracer: 0, magSize: 5, reloadTime: 5, weapon: 'rifle', vsArmor: 0.05, pierce: 0, breakMorale: 0.25, noStabilizer: false,
};
const ifv = {
  id: 'ifv', category: 'cavalry', kind: 'cavalry', role: 'frontline', weaponSound: 'rifle', name: 'Cavalry', shortName: 'Cavalry', cost: 260,
  formation: { count: 10, columns: 5, spacing: 2.8 },
  stats: { ...HORSE_18, hp: 150, speed: 5, sight: 140, range: 100, damage: 90, cavalry: { chargeSpeed: 11, shock: 0.3, sabre: 115, reach: 2.8 } },
  factionStats: { nato: { cavalry: { chargeSpeed: 11, shock: 0.32, sabre: 125, reach: 3.3 } }, fr: { cavalry: { chargeSpeed: 11, shock: 0.3, sabre: 115, reach: 2.8 } }, pact: { cavalry: { chargeSpeed: 11, shock: 0.32, sabre: 125, reach: 3.3 } }, st: { cavalry: { chargeSpeed: 11, shock: 0.3, sabre: 115, reach: 2.8 }, range: 110, damage: 95 } },
  models: mounts(),
  variants: {
    nato: { name: 'Lancers', weapon: 'lance, 1908 sword, SMLE', text: 'British cavalry of 1918: they fight on foot with the rifle as often as they charge — but through a gap in the line, over open ground, the lance still decides. Machine guns cut them down.' },
    fr: { name: 'Dragons', weapon: 'sword, Berthier carbine', text: 'The French dragoons in horizon blue: mounted infantry with a sword, quick to plug a gap or to ride through one.' },
    pact: { name: 'Ulanen', weapon: 'lance, Karabiner 98 AZ', text: 'The German lancers, their steel-tubed lances: in 1918 few were left mounted — kept for the breakthrough.' },
    st: { name: 'Kavallerie-Schützen', weapon: 'Karabiner 98 AZ, sword', text: 'Cavalry turned riflemen: they ride up behind the storm troops and fight on foot or in the saddle.' },
  },
};
const looseHorse = {
  id: 'looseHorse', name: 'Loose horse', shortName: 'Horse', hidden: true, uncapped: true, category: 'other', kind: 'cavalry', role: 'support', cost: 0,
  formation: { count: 1, columns: 1, spacing: 1 },
  stats: { ...HORSE_18, hp: 90, speed: 2, sight: 60, fov: 6.2, range: 1, damage: 0, reloadTime: 1, weapon: undefined, loose: true, breakMorale: undefined },
  models: mounts(false),
  variants: { nato: { name: 'Loose horse', text: 'Its rider is down: it bolts from the fire and wanders.' } },
};
const dismounted = {
  id: 'dismounted', name: 'Dismounted troopers', shortName: 'On foot', hidden: true, uncapped: true, category: 'other', kind: 'infantry', role: 'support', cost: 0,
  formation: { count: 1, columns: 1, spacing: 1.5 },
  stats: { ...T.rifles.stats, lightAT: 0, smoke: undefined, nightSight: undefined, speed: 1.6, range: 90, damage: 70, fireCooldown: 2.4, magSize: 5, reloadTime: 4, breakMorale: 0.5, dismounted: true },
  weaponSound: 'rifle',
  models: Object.fromEntries(Object.entries(RIDERS).map(([k, army]) => [k, () => buildCavalryFoot({ army, kind: 'medium' })])),
  variants: { nato: { name: 'Dismounted troopers', text: 'His horse went down: he looks for another, or makes his way back.' } },
};

// anti-tank: the British and French rifle grenade (a light bomb off the rifle's cup: weak against armour), the German Tankgewehr (a giant single-shot rifle: the first anti-tank rifle)
const atTeam = derive(T.atTeam, {
  models: men({ weapon: 'at' }),
  specialist: { count: 2, stats: { ...rifles.stats, lightAT: 0, weapon: undefined, splash: 0, trail: undefined, antiArmor: undefined }, armyStats: Object.fromEntries(Object.entries(rifles.factionStats).map(([k, v]) => [k, { ...v, lightAT: 0, grenades: 0 }])) },
  specialistModels: men(),
  stats: { lightAT: 0, nightSight: undefined, smoke: undefined, damage: 230, range: 80, splash: 2.5, vsArmor: 0.55, pierce: 0.3, trail: false, boltSpeed: 60, reloadTime: 6 },
  factionStats: { pact: { weapon: 'rifle', damage: 190, range: 110, splash: 0, vsArmor: 1, pierce: 0.55, boltSpeed: 700, boltSize: 0.6, magSize: 1, reloadTime: 4, fireCooldown: 3, weaponSound: 'rifle' } },
  variants: {
    nato: { name: 'Rifle Grenadiers', weapon: 'SMLE with No. 36 rifle grenades', text: 'Mills bombs fired from a cup on the rifle: a light bomb at a hundred yards, enough for a machine-gun post — a tank shrugs them off unless it is hit just right.' },
    fr: { name: 'Grenadiers VB', weapon: 'Lebel with Viven-Bessières grenades', text: 'The VB rifle grenade: fired straight from the Lebel\'s cup, a bomb into the next trench. Against tanks only at the weak spots.' },
    pact: { name: 'Tankgewehr', weapon: 'Mauser T-Gewehr M1918, 13.2 mm', text: 'The first anti-tank rifle: a Mauser grown to 16 kilos, its bullet through a Mark V\'s side. The kick breaks collarbones.' },
    st: { name: 'Tankgewehr', weapon: 'Mauser T-Gewehr M1918, 13.2 mm', text: 'The first anti-tank rifle: a Mauser grown to 16 kilos, its bullet through a Mark V\'s side. The kick breaks collarbones.' },
  },
});

const sniper = derive(T.sniper, {
  models: men({ scout: true }),
  specialistModels: men({ weapon: 'sniper', scout: true }),
  variants: {
    nato: { name: 'Sniper Pair', weapon: 'SMLE with Aldis scope', text: 'A sniper and his observer behind a steel loophole: officers and machine-gunners first.' },
    fr: { name: 'Tireurs d\'élite', weapon: 'Lebel with APX scope', text: 'The French marksmen: patient, hidden in the ruins, deadly to anyone who looks over the parapet.' },
    pact: { name: 'Scharfschützen', weapon: 'Gewehr 98 with Zielfernrohr', text: 'The German snipers, the first to be organised: a scoped Mauser and a steel plate to shoot through.' },
    st: { name: 'Scharfschützen', weapon: 'Gewehr 98 with Zielfernrohr', text: 'The German snipers, the first to be organised: a scoped Mauser and a steel plate to shoot through.' },
  },
});

const scouts = derive(T.scouts, {
  models: men({ scout: true }),
  variants: {
    nato: { name: 'Trench Raiders', weapon: 'revolvers, clubs, Mills bombs', text: 'Out by night across no man\'s land: they see what the enemy holds and slip back before dawn.' },
    fr: { name: 'Corps francs', weapon: 'pistols, knives, grenades', text: 'The French raiding parties: volunteers who go out ahead of the line to find the enemy.' },
    pact: { name: 'Patrouille', weapon: 'Pistole 08, Stielhandgranaten', text: 'The night patrol: two men who crawl to the enemy wire and come back with what they saw.' },
    st: { name: 'Stoßtrupp-Späher', weapon: 'MP 18, binoculars', text: 'The storm troops\' scouts: they find the gaps in the enemy line for the assault to pour through.' },
  },
});

// engineers: dig, wire and clear as ever — and the German pioneers' Flammenwerfer, the weapon of 1918's trench fight
const FLAME = { range: 30, aggroRange: 38, preferredRange: 18, damage: 75, splash: 2.2, fireCooldown: 0.07, burst: 1, burstInterval: 0, boltSpeed: 30, boltSize: 1.4, tracer: 1, spread: 0.05, magSize: 40, reloadTime: 8, vsStructure: 3, suppressPower: 3, ignite: 0.6, vsArmor: 0.15, aimTime: 0.3, playerFireInterval: 0.07, weaponSound: 'flame' };
const engineers = derive(T.engineers, {
  models: men(),
  specialist: { count: 1, stats: FLAME, armyStats: { nato: { ...rifles.stats, ...rifles.factionStats.nato, ignite: undefined, weaponSound: undefined }, fr: { ...rifles.stats, ...rifles.factionStats.fr, ignite: undefined, weaponSound: undefined } } },
  specialistModels: { nato: () => buildWw1Soldier({ army: 'uk' }), fr: () => buildWw1Soldier({ army: 'fr' }), pact: () => buildWw1Soldier({ army: 'de', weapon: 'flame' }), st: () => buildWw1Soldier({ army: 'st', weapon: 'flame' }) },
  variants: {
    nato: { name: 'Royal Engineers', weapon: 'SMLE, picks, wire', text: 'Sappers: they dig, put up wire and clear it three times as fast as the infantry.' },
    fr: { name: 'Sapeurs', weapon: 'Lebel, picks, wire', text: 'The French engineers: trenches, wire, demolitions — and clearing the enemy\'s wire before an attack.' },
    pact: { name: 'Pioniere', weapon: 'Gewehr 98, Kleif flamethrower', text: 'German pioneers with the small flamethrower: a jet of burning oil into the dugout ends the fight for a trench.' },
    st: { name: 'Flammenwerfer-Trupp', weapon: 'Wechselapparat flamethrower, grenades', text: 'The Guard Reserve Pioneers\' flamethrower troop, the spearhead of the storm battalions: they burn out the strongpoint the others go round.' },
  },
});

/** Wire cutters (the mine-clearing slot): an engineer team with Bangalore torpedoes — a tube of explosive pushed under the wire blows a lane through it (the line charge: X). */
const mineClear = derive(T.engineers, {
  id: 'mineClear', name: 'Wire Cutters', shortName: 'Wire cutters', category: 'support', cost: 160,
  formation: { count: 4, columns: 4, spacing: 2.4 },
  stats: { lineCharge: { count: 3, range: 60 } },
  models: men(),
  specialist: undefined,
  variants: {
    nato: { name: 'Bangalore Team', weapon: 'Bangalore torpedoes, wire cutters', text: 'Sappers with lengths of pipe packed with explosive: pushed under the enemy wire and fired, they blow a lane for the assault (X). Three charges.' },
    fr: { name: 'Équipe de pétards', weapon: 'Bangalore torpedoes, cisailles', text: 'Engineers with Bangalore torpedoes: a lane through the wire where the attack will go (X). Three charges.' },
    pact: { name: 'Drahtschneider', weapon: 'gestreckte Ladungen, Drahtscheren', text: 'Pioneers with long charges and wire cutters: a lane through the enemy\'s wire before the storm (X). Three charges.' },
    st: { name: 'Drahtschneider', weapon: 'gestreckte Ladungen, Drahtscheren', text: 'Pioneers with long charges and wire cutters: a lane through the enemy\'s wire before the storm (X). Three charges.' },
  },
});

// air defence: guns pointed up — no radar, by eye
const aa = derive(T.aa, {
  name: 'AA Lorry', shortName: 'AA gun', weaponSound: 'arty',
  stats: { nightSight: undefined, armor: 0.05, hp: 380, speed: 5.5, antiAir: { range: 300, optical: 1, rate: 1.2, burst: 1, pause: 1.5, hitNear: 0.16, hitFar: 0.03 }, range: 0, damage: 0 },
  models: { nato: buildAALorryUK, fr: buildAALorryFR, pact: buildAALorryDE, st: buildAALorryDE },
  engine: 'engine.dieselSmall',
  variants: {
    nato: { name: '13-pounder AA', weapon: '13-pdr 9 cwt on a lorry', text: 'A field gun on a high mount on a Thornycroft lorry, laid at the sky: shrapnel bursts round the enemy aircraft.' },
    fr: { name: 'Autocanon de 75', weapon: '75 mm on a De Dion lorry', text: 'The 75 on an anti-aircraft mount on its lorry: the first real AA gun.' },
    pact: { name: 'K-Flak', weapon: '7.7 cm K-Flak on a lorry', text: 'The Kraftwagen-Flak: a 7.7 cm on a lorry, quick to wherever the enemy\'s aircraft are.' },
    st: { name: 'K-Flak', weapon: '7.7 cm K-Flak on a lorry', text: 'The Kraftwagen-Flak: a 7.7 cm on a lorry, quick to wherever the enemy\'s aircraft are.' },
  },
});
const manpads = derive(T.manpads, {
  name: 'AA Machine-Gun Team', shortName: 'AA MG', weaponSound: 'mg',
  specialist: { count: 1, stats: { antiAir: { range: 200, optical: 1, rate: 8, burst: 1.5, pause: 1, hitNear: 0.05, hitFar: 0.01 } } },
  models: men(),
  specialistModels: men({ weapon: 'mg' }),
  variants: {
    nato: { name: 'Lewis AA Team', weapon: 'Lewis gun on a post mount', text: 'A Lewis gun on a post, pointed at the sky: the infantry\'s answer to the low-flying Junkers.' },
    fr: { name: 'Hotchkiss AA Team', weapon: 'Hotchkiss on an AA tripod', text: 'The Hotchkiss on its high tripod: a stream of bullets across a strafing run.' },
    pact: { name: 'Fla-MG Trupp', weapon: 'MG 08 on an AA mount', text: 'The MG 08 on its anti-aircraft mount: keeps the British contact patrols off the trench.' },
    st: { name: 'Fla-MG Trupp', weapon: 'MG 08 on an AA mount', text: 'The MG 08 on its anti-aircraft mount: keeps the British contact patrols off the trench.' },
  },
});

const LORRY_18 = { nightSight: undefined, armor: 0.05, hp: 360, speed: 5.5 };
const ambulance = derive(T.ambulance, {
  stats: LORRY_18,
  models: { nato: buildAmbulanceUK, fr: buildAmbulanceFR, pact: buildAmbulanceDE, st: buildAmbulanceDE },
  engine: 'engine.dieselSmall',
  variants: {
    nato: { name: 'Motor Ambulance', weapon: 'unarmed', text: 'A Ford Model T ambulance of the RAMC: wounded men near it are patched up and go back to the line.' },
    fr: { name: 'Ambulance automobile', weapon: 'unarmed', text: 'The French motor ambulance, many of them driven by American volunteers: wounded men near it go back to the line.' },
    pact: { name: 'Sanitätskraftwagen', weapon: 'unarmed', text: 'The German motor ambulance: the wounded patched up near it go back to the line.' },
    st: { name: 'Sanitätskraftwagen', weapon: 'unarmed', text: 'The German motor ambulance: the wounded patched up near it go back to the line.' },
  },
});
/** The supply tank (Britain) and the ammunition lorries: they mend tanks near them, and a broken-down or ditched tank close by gets going three times sooner (systems/Breakdowns.js). */
const recovery = derive(T.recovery, {
  stats: { ...LORRY_18 },
  factionStats: { nato: { armor: 0.4, hp: 850, speed: 1.9, breakdown: 1 / 300, ditch: 0.02 } },
  models: { nato: buildSupplyTank, fr: buildSupplyLorryFR, pact: buildSupplyLorryDE, st: buildSupplyLorryDE },
  engine: 'engine.diesel',
  variants: {
    nato: { name: 'Supply Tank', weapon: 'unarmed — stores, petrol, a workshop', text: 'An old Mark IV with its guns out and its sponsons full of stores: it follows the fighting tanks across the crater field, mends them and gets the broken-down ones going.' },
    fr: { name: 'Camion de munitions', weapon: 'unarmed', text: 'The ammunition and workshop lorry: tanks near it are mended, and a broken-down FT gets going sooner.' },
    pact: { name: 'Munitionskraftwagen', weapon: 'unarmed', text: 'The ammunition and workshop lorry: tanks near it are mended and got going again.' },
    st: { name: 'Munitionskraftwagen', weapon: 'unarmed', text: 'The ammunition and workshop lorry: tanks near it are mended and got going again.' },
  },
});
const commandPost = derive(T.commandPost, {
  stats: { ...LORRY_18, hp: 260, speed: 7 },
  models: { nato: buildStaffCarUK, fr: buildStaffCarFR, pact: buildStaffCarDE, st: buildStaffCarDE },
  engine: 'engine.dieselSmall',
  variants: {
    nato: { name: 'Brigade Headquarters', weapon: 'staff car, field telephones', text: 'The brigadier\'s staff car and his signallers: where it stops, the telephone lines run out and the reinforcements report there.' },
    fr: { name: 'Poste de commandement', weapon: 'staff car, telephones', text: 'The colonel\'s command post: once set up, the reinforcements come forward to it.' },
    pact: { name: 'Gefechtsstand', weapon: 'Stabswagen, Fernsprecher', text: 'The regiment\'s battle headquarters: the reinforcements come forward to it.' },
    st: { name: 'Gefechtsstand', weapon: 'Stabswagen, Fernsprecher', text: 'The storm battalion\'s headquarters, close behind the assault: the reinforcements come forward to it.' },
  },
});

mineClear.specialist = undefined;      // (the wire cutters: no flamethrower among them)
mineClear.specialistModels = undefined;
const FRONTS = fronts({ rifles, mgTeam, artillery, spMortar, rockets, mortar, observers, ifv, looseHorse, dismounted, reconVehicle, crew, atTeam, sniper, scouts, engineers, mineClear, aa, manpads, ambulance, commandPost }); // Italy, the east, the Middle East (./fronts.js)

export const TYPES_1918 = {
  rifles, mgTeam, marines, sailors, tank, heavyTank, reconVehicle, crew,
  artillery, spMortar, rockets, mortar, observers, cbRadar, airRadar,
  ifv, looseHorse, dismounted, atTeam, sniper, scouts, engineers, mineClear, aa, manpads, ambulance, recovery, commandPost,
  bunker: T.bunker, strongpoint: T.strongpoint, hq: T.hq,   // the fortifications are of every war
  ...SHIPS_1918,   // the North Sea maps' warships (./ships.js)
  ...COAST_1918,   // Zeebrugge's fixed guns (./coast.js)
  ...FRONTS,       // the assault troops and the mountain guns
};

/** What stands in for the types not built yet: the riflemen (ponytail: each gets its own in its step). */
export const ALIAS_1918 = Object.fromEntries(Object.keys(T).filter((id) => !TYPES_1918[id]).map((id) => [id, 'rifles']));
