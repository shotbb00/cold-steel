// The 1945 roster (data/epoch.js), phase 1: the core of each army. Each type is its 1985
// counterpart (same id, so the modes, maps and AI keep working, and the same balance — the
// playstyle stays) with the 1945 models, names, texts and a few stats on top. Variants and
// models are keyed `nato` (US Army), `sov` (Red Army), `pact` (Wehrmacht), `fj` (Fallschirmjäger).
//   noStabilizer: the gun only fires standing still (UnitStack.updateHeavyWeapon) — every 1945
//                 tank and assault gun but the Sherman with its gyrostabiliser
// Types this epoch doesn't have yet stand in through ALIAS_1945 (units/index.js typeOf).
import { TYPES_1985 } from '../units/index.js';
import { buildWw2Soldier } from '../models/ww2Soldier.js';
import { buildUsSherman, buildSovT34, buildWhPanzerIV, buildFjStuG, buildUsM3, buildWh251, buildSovStudebaker, buildFjOpelBlitz } from '../models/ww2Armour.js';

const T = TYPES_1985;
const men = (o = {}) => ({
  nato: () => buildWw2Soldier({ army: 'us', ...o }), sov: () => buildWw2Soldier({ army: 'sov', ...o }),
  pact: () => buildWw2Soldier({ army: 'wh', ...o }), fj: () => buildWw2Soldier({ army: 'fj', ...o }),
});
const derive = (base, o) => ({ ...base, ...o, stats: { ...base.stats, ...o.stats }, specialist: o.specialist ?? base.specialist });

const rifles = derive(T.rifles, {
  name: 'Rifle Squad', shortName: 'Rifles',
  stats: { lightAT: 0, nightSight: undefined },
  factionStats: { pact: { lightAT: 1 }, fj: { lightAT: 1, hp: 115, breakMorale: 0.1 } }, // the Germans' Panzerfaust; the Fallschirmjäger hold longer
  models: men(),
  variants: {
    nato: { name: 'Rifle Squad', weapon: 'M1 Garand, BAR', text: 'The GI rifle squad: the semi-automatic Garand gives every man more shots than the enemy, the BAR the base of fire.' },
    sov: { name: 'Rifle Section', weapon: 'Mosin-Nagant, PPSh-41, DP-28', text: 'The Red Army’s riflemen, rifles and sub-machine guns together: dangerous in the assault, many of them.' },
    pact: { name: 'Grenadier Squad', weapon: 'Kar98k, MG 42, Panzerfaust', text: 'The German infantry squad is built round its MG 42; the riflemen guard it — and one carries a Panzerfaust.' },
    fj: { name: 'Fallschirmjäger Squad', weapon: 'FG 42, Kar98k, MG 42, Panzerfaust', text: 'Paratroopers fighting on the ground: fewer, tougher and slower to break than any squad they meet.' },
  },
});

const atTeam = derive(T.atTeam, {
  models: men({ weapon: 'at' }),
  factionStats: { sov: { damage: T.atTeam.stats.damage * 0.6, range: 90 } }, // the PTRS: an anti-tank rifle, not a rocket
  variants: {
    nato: { name: 'Bazooka Team', weapon: 'M9 bazooka, 2.36 in', text: 'The bazooka: a light rocket that stops a Panzer IV from the side — not a Panther from the front.' },
    sov: { name: 'Anti-Tank Rifle Team', weapon: 'PTRS-41, 14.5 mm', text: 'A long anti-tank rifle: no match for a tank’s front by 1945, but it opens half-tracks and tank sides.' },
    pact: { name: 'Panzerschreck Team', weapon: 'RPzB 54, 8.8 cm', text: 'The Panzerschreck: the bazooka copied and enlarged. Kills any Allied tank it hits — behind its shield, the gunner is still in the open.' },
    fj: { name: 'Panzerschreck Team', weapon: 'RPzB 54, 8.8 cm', text: 'Fallschirmjäger with the Panzerschreck: they wait for the tanks to come close.' },
  },
});

const mgTeam = derive(T.mgTeam, {
  models: men(),
  specialistModels: men({ weapon: 'mg' }),
  variants: {
    nato: { name: 'M1919 Team', weapon: 'Browning M1919, .30 cal', text: 'The air-cooled Browning: steady, reliable fire that holds a field.' },
    sov: { name: 'Machine-Gun Team', weapon: 'DP-28, 7.62 mm', text: 'The Degtyaryov with its pan on top: the section’s fire base.' },
    pact: { name: 'MG 42 Team', weapon: 'MG 42, 7.92 mm', text: '1,200 rounds a minute — “Hitler’s buzzsaw”. Set up behind a hedge it closes a whole field.' },
    fj: { name: 'MG 42 Team', weapon: 'MG 42, 7.92 mm', text: 'The Fallschirmjäger MG: the heart of their defence.' },
  },
});

const mortar = derive(T.mortar, {
  models: men(),
  specialistModels: men({ weapon: 'mortar' }),
  variants: {
    nato: { name: '81 mm Mortar Team', weapon: 'M1 mortar, 81 mm', text: 'The battalion’s 81: high-explosive and smoke on anything your side can see.' },
    sov: { name: '82 mm Mortar Team', weapon: 'BM-37, 82 mm', text: 'The Red Army’s battalion mortar, plentiful and quick to set up.' },
    pact: { name: 'Granatwerfer Team', weapon: 'GrW 34, 8 cm', text: 'The German battalion mortar: accurate, quick, and smoke for the counter-attack.' },
    fj: { name: 'Granatwerfer Team', weapon: 'GrW 42, 12 cm', text: 'The heavy 12 cm mortar: few rounds, big bursts.' },
  },
});

const tank = derive(T.tank, {
  name: 'Tanks', shortName: 'Tanks',
  stats: { nightSight: undefined, noStabilizer: true, armor: 0.55, hp: 1100, range: 180, damage: 360, smoke: { charges: 1 } },
  factionStats: {
    nato: { noStabilizer: false, armor: 0.5, damage: 330, speed: 5.4 },   // Sherman: the gyrostabiliser, more but thinner
    sov: { noStabilizer: true, armor: 0.55, damage: 360, speed: 5.6 },      // T-34-85: fast, sloped armour (everything the US entry sets: stats layer side, then army)
    pact: { armor: 0.6, damage: 380 },                                       // Panzer IV H: the long 7.5 cm
    fj: { armor: 0.6, damage: 380, speed: 4.6 },                             // StuG III G: low, the same gun, no turret
  },
  models: { nato: buildUsSherman, sov: buildSovT34, pact: buildWhPanzerIV, fj: buildFjStuG },
  engine: 'engine.diesel',
  variants: {
    nato: { name: 'M4A3(76)W Sherman', weapon: '76 mm M1', text: 'The Sherman with the long 76: everywhere, reliable, and the only tank here that can fire on the move — its gyrostabiliser.' },
    sov: { name: 'T-34-85', weapon: '85 mm ZiS-S-53', text: 'Sloped armour, wide tracks, the 85 mm gun: the tank that won the war in the east. Stops to fire.' },
    pact: { name: 'Panzer IV H', weapon: '7.5 cm KwK 40 L/48', text: 'The workhorse with skirts against bazookas and a gun that kills a Sherman at long range. Stops to fire.' },
    fj: { name: 'StuG III G', weapon: '7.5 cm StuK 40 L/48', text: 'No turret, a low casemate: the gun points where the hull points. Hard to spot, deadly from ambush. Stops to fire.' },
  },
});

const ifv = derive(T.ifv, {
  name: 'Half-tracks', shortName: 'Half-tracks',
  stats: { nightSight: undefined, atgm: undefined, weapon: 'autocannon', damage: 60, vsArmor: 0.12, range: 150, gunRange: 150, armor: 0.25, hp: 600, smoke: undefined },
  factionStats: { sov: { armor: 0.05, hp: 420 }, fj: { armor: 0.05, hp: 420 } }, // the lorries: no armour at all
  models: { nato: buildUsM3, sov: buildSovStudebaker, pact: buildWh251, fj: buildFjOpelBlitz },
  engine: 'engine.dieselSmall',
  variants: {
    nato: { name: 'M3 Half-track', weapon: '.50 cal M2', text: 'Carries a squad up behind the tanks, the .50 on its ring over the cab. Its armour stops rifle fire. U unloads the squad.' },
    sov: { name: 'Studebaker US6', weapon: 'DT machine gun', text: 'The Lend-Lease lorry that put the Red Army on wheels. No armour at all: unload before the shooting starts. U unloads the squad.' },
    pact: { name: 'Sd.Kfz. 251', weapon: 'MG 34', text: 'The German half-track: the squad rides behind armour, the MG 34 behind its shield. U unloads the squad.' },
    fj: { name: 'Opel Blitz', weapon: 'MG 34', text: 'Fallschirmjäger rode lorries, not half-tracks. No armour at all. U unloads the squad.' },
  },
});

const CREW_TEXT = 'The crew of a knocked-out vehicle, making for the rear. Beside one of your knocked-out vehicles that didn2019t burn out, they man it again.';
const crew = derive(T.crew, {
  models: men({ crew: true }),
  variants: {
    nato: { name: 'Tank Crew', weapon: 'M3 sub-machine gun', text: CREW_TEXT },
    sov: { name: 'Tank Crew', weapon: 'PPS-43', text: CREW_TEXT },
    pact: { name: 'Panzerbesatzung', weapon: 'MP 40', text: CREW_TEXT },
    fj: { name: 'Besatzung', weapon: 'MP 40', text: CREW_TEXT },
  },
});

export const TYPES_1945 = {
  rifles, atTeam, mgTeam, mortar, tank, ifv, crew,
  bunker: T.bunker, strongpoint: T.strongpoint, hq: T.hq,   // the fortifications are of every war
};

/** What stands in for the types phase 1 doesn't have yet (ponytail: they get their own in phase 2). */
export const ALIAS_1945 = {
  scouts: 'rifles', sniper: 'rifles', engineers: 'rifles', airAssault: 'rifles', kampfgruppe: 'rifles', observers: 'rifles',
  heavyTank: 'tank', tankDestroyer: 'tank', cev: 'tank', reconVehicle: 'ifv', commandPost: 'ifv', ambulance: 'ifv', recovery: 'ifv',
  artillery: 'mortar', spMortar: 'mortar', rockets: 'mortar', cbRadar: 'mortar',
  aa: 'mgTeam', towedAA: 'mgTeam', manpads: 'atTeam',
};
