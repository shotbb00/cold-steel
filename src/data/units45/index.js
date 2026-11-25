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
import { buildUsPriest, buildSovM30, buildWhWespe, buildFjLeFH18, buildUsCalliope, buildSovKatyusha, buildWhPanzerwerfer, buildFjNebelwerfer, buildUsM4Mortar, buildSovPM38, buildWh2512, buildFjGrw42Lorry } from '../models/ww2Fire.js';
import { buildUsM16, buildSovM17, buildWhWirbelwind, buildFj251Flak, buildUsBofors, buildSov61K, buildWhFlak38, buildFjFlakvierling, buildUs90mm, buildSov52K, buildDeFlak36, buildFjOstwind, buildUsSCR584, buildSovRUS2, buildDeWuerzburg, buildUsM15, buildSovZSU37 } from '../models/ww2AirDefence.js';
import { buildUsWC54, buildSovGazAmb, buildWh2518, buildFjBlitzAmb, buildUsM32, buildSovT34Tractor, buildWhBergepanther, buildFjFamo, buildUsTreadway, buildSovPontoon, buildWhBrueckenleger, buildFjPontoon, buildUsT1E3, buildSovPT3, buildDeGoliath, buildUsM3Command, buildSovRadioLorry, buildWh2516, buildFjBlitzCommand, buildUsSmokeGen, buildSovSmokeGen, buildWhSmokeGen, buildFjSupply } from '../models/ww2Support.js';
import { buildUsPershing, buildSovIS2, buildWhPanther, buildFjTiger, buildUsM8, buildSovBA64, buildWhPuma, buildFjKettenkrad, buildUsHellcat, buildSovSU100, buildWhJagdpanzerIV, buildFjHetzer, buildUsM4Dozer, buildSovISU152, buildWhBrummbaer, buildFjSturmtiger } from '../models/ww2Armour2.js';

import { SHIPS_1945 } from './ships.js';
import { buildJpChiNu, buildJpHoI, buildJpHoHa, buildJpHaTo, buildJpLorryAA, buildJpLorry25, buildJpTachi6, buildJpSmoke, buildJpType88, buildJpSeri, buildJpBridge, buildJpSsKi } from '../models/jp45.js';
import { buildBrCrusader, buildBrGrant, buildBrDaimler, buildBrDeacon, buildBr25pdr, buildBrCarrier, buildBrAustinAmb, buildBrDorchester, buildBrScammell, buildBrCrusaderCS, buildBrBishop, buildBrScorpion, buildBrBoforsPortee, buildBrGL, buildBr37AA } from '../models/brit45.js';
import { buildJpChiHa, buildJpHaGo, buildJpHoNi, buildJpType91, buildJpType98, buildJpRocket, buildJpIsuzu, buildJpIsuzuAmb, buildUsLvt4 } from '../models/pacific45.js';
import { ATLANTIC_WALL, lanesForts45 } from './atlanticWall.js';
import { SOV_CRAFT_1945 } from './sovietCraft.js';
import { buildBrBofors, buildBrCrusaderAA, buildBrValentineBridge } from '../models/brit45more.js';
import brit21 from './brit21.js';
import brit14 from './brit14.js';

const T = TYPES_1985;
const men = (o = {}) => ({
  nato: () => buildWw2Soldier({ army: 'us', ...o }), sov: () => buildWw2Soldier({ army: 'sov', ...o }),
  pact: () => buildWw2Soldier({ army: 'wh', ...o }), fj: () => buildWw2Soldier({ army: 'fj', ...o }),
  usmc: () => buildWw2Soldier({ army: 'usmc', ...o }), jp: () => buildWw2Soldier({ army: 'jp', ...o }), // (the Pacific: see the end of this file)
  brit: () => buildWw2Soldier({ army: 'brit', ...o }), // (North Africa: the 8th Army)
  brit21: () => buildWw2Soldier({ army: 'brit21', ...o }), brit14: () => buildWw2Soldier({ army: 'brit14', ...o }), // (NW Europe 1944: ./brit21.js; Burma: ./brit14.js)
});
const derive = (base, o) => ({ ...base, ...o, stats: { ...base.stats, ...o.stats }, specialist: o.specialist ?? base.specialist });

const rifles = derive(T.rifles, {
  name: 'Rifle Squad', shortName: 'Rifles',
  stats: { lightAT: 0, nightSight: undefined },
  factionStats: {   // the rifles' rates: bolt actions slow, the Garand and the FG 42 quick (seconds per aimed shot, rounds a clip)
    nato: { fireCooldown: 1.3, magSize: 8, reloadTime: 2.4, playerFireInterval: 0.3 },                          // M1 Garand
    sov: { fireCooldown: 2.6, magSize: 5, reloadTime: 3.5, playerFireInterval: 1.4 },                           // Mosin-Nagant
    pact: { fireCooldown: 2.6, magSize: 5, reloadTime: 3.5, playerFireInterval: 1.4, lightAT: 1 },              // Kar98k, the Panzerfaust
    fj: { fireCooldown: 1.1, magSize: 20, reloadTime: 3, playerFireInterval: 0.15, lightAT: 1, hp: 115, breakMorale: 0.1 }, // FG 42; they hold longer
  },
  models: men(),
  // the kits (data/kits.js): bazookas for the GIs, Panzerfausts for the Germans — and for the Red Army, which used captured ones by the thousand in 1945; Thompson, PPSh, MP 40 for the assault
  kitModels: {
    at: { nato: () => buildWw2Soldier({ army: 'us', weapon: 'at' }), sov: () => buildWw2Soldier({ army: 'sov', weapon: 'pzf' }), pact: () => buildWw2Soldier({ army: 'wh', weapon: 'pzf' }), fj: () => buildWw2Soldier({ army: 'fj', weapon: 'pzf' }), usmc: () => buildWw2Soldier({ army: 'usmc', weapon: 'at' }), jp: () => buildWw2Soldier({ army: 'jp', weapon: 'at' }), brit: () => buildWw2Soldier({ army: 'brit', weapon: 'at' }) },
    smg: men({ weapon: 'smg' }),
  },
  variants: {
    nato: { name: 'Rifle Squad', weapon: 'M1 Garand, BAR', text: 'The GI rifle squad: the semi-automatic Garand gives every man more shots than the enemy, the BAR the base of fire.' },
    sov: { name: 'Rifle Section', weapon: 'Mosin-Nagant, PPSh-41, DP-28', text: 'The Red Army’s riflemen, rifles and sub-machine guns together: dangerous in the assault, many of them.' },
    pact: { name: 'Grenadier Squad', weapon: 'Kar98k, MG 42, Panzerfaust', text: 'The German infantry squad is built round its MG 42; the riflemen guard it — and one carries a Panzerfaust.' },
    fj: { name: 'Fallschirmjäger Squad', weapon: 'FG 42, Kar98k, MG 42, Panzerfaust', text: 'Paratroopers fighting on the ground: fewer, tougher and slower to break than any squad they meet.' },
  },
});

const atTeam = derive(T.atTeam, {
  models: men({ weapon: 'at' }),
  specialist: { count: 2, stats: { ...rifles.stats, lightAT: 0, weapon: undefined, splash: 0, trail: undefined, antiArmor: undefined }, armyStats: Object.fromEntries(Object.entries(rifles.factionStats).map(([k, v]) => [k, { ...v, lightAT: 0 }])) }, // the two riflemen with the squads' rifles
  specialistModels: men(),
  factionStats: { sov: { damage: T.atTeam.stats.damage * 0.6, range: 90, magSize: 5, reloadTime: 4, fireCooldown: 2, playerFireInterval: 1 } }, // the PTRS: a semi-automatic anti-tank rifle, not a rocket
  variants: {
    nato: { name: 'Bazooka Team', weapon: 'M9 bazooka, 2.36 in', text: 'The bazooka: a light rocket that stops a Panzer IV from the side — not a Panther from the front.' },
    sov: { name: 'Anti-Tank Rifle Team', weapon: 'PTRS-41, 14.5 mm', text: 'A long anti-tank rifle: no match for a tank’s front by 1945, but it opens half-tracks and tank sides.' },
    pact: { name: 'Panzerschreck Team', weapon: 'RPzB 54, 8.8 cm', text: 'The Panzerschreck: the bazooka copied and enlarged. Kills any Allied tank it hits — behind its shield, the gunner is still in the open.' },
    fj: { name: 'Panzerschreck Team', weapon: 'RPzB 54, 8.8 cm', text: 'Fallschirmjäger with the Panzerschreck: they wait for the tanks to come close.' },
  },
});

const mgTeam = derive(T.mgTeam, {
  specialist: { ...T.mgTeam.specialist, armyStats: {
    nato: { burst: 10, burstInterval: 0.11, fireCooldown: 2.2 },                            // M1919: ~550 rounds a minute
    sov: { burst: 8, burstInterval: 0.1, fireCooldown: 2.2, magSize: 47, reloadTime: 5 },   // DP-28: the 47-round pan
    pact: { burst: 16, burstInterval: 0.05, fireCooldown: 2.0, playerFireInterval: 0.05 },  // MG 42: ~1,200 a minute
    fj: { burst: 16, burstInterval: 0.05, fireCooldown: 2.0, playerFireInterval: 0.05 },
  } },
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
  stats: { nightSight: undefined, noStabilizer: true, armor: 0.55, hp: 1100, range: 180, damage: 360, smoke: { charges: 1 }, sideGuns: [{ turret: true, at: 0, arc: 0.18, range: 160, damage: 60, rate: 10, burst: 12, y: 2.0, out: 2.2 }, { at: 0, arc: 0.45, range: 130, damage: 60, rate: 9, burst: 10, y: 1.4, out: 2.4 }] }, // (the coaxial and the bow machine guns: UnitStack.updateSideGuns)
  factionStats: {
    nato: { noStabilizer: false, armor: 0.5, damage: 330, speed: 5.4, fireCooldown: 6 },   // Sherman: the gyrostabiliser, more but thinner
    sov: { noStabilizer: true, armor: 0.55, damage: 360, speed: 5.6, fireCooldown: 8, carries: { unit: 'rifles', count: 8 } }, // (Tank riders: data/epoch.js)      // T-34-85: fast, sloped armour (everything the US entry sets: stats layer side, then army)
    pact: { armor: 0.6, damage: 380, fireCooldown: 6.5 },                    // Panzer IV H: the long 7.5 cm
    fj: { armor: 0.6, damage: 380, speed: 4.6, fireCooldown: 7, traverse: 0.17, sideGuns: [{ at: 0, arc: 1.2, range: 140, damage: 70, rate: 10, burst: 10, y: 2.2, out: 0.5 }] },            // StuG III G: low, the same gun, no turret (the loader's MG behind its shield on the roof)
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

/** The DD Sherman (the coastal maps, the US Army only): bought for the landing, it swims in on its own screen (systems/Landing.js) instead of riding an LCT. */
const ddTank = {
  ...tank, id: 'ddTank', name: 'DD Tanks', shortName: 'DD tanks', cost: (tank.cost ?? 400) - 40, dd: true, coastal: true, armies: ['us'],
  variants: { nato: { name: 'M4A1 DD Sherman', weapon: '75 mm M3', text: 'The Duplex Drive Sherman: launched offshore, it swims in on a canvas screen and lands with the first infantry. Cheaper and quicker than waiting for an LCT — but a rough sea swamps it, and it goes down with its crew.' } },
};

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

// (factionStats layer side, then army: `sov` sets every key `nato` sets, `fj` every key `pact` sets)
const heavyTank = derive(T.heavyTank, {
  name: 'Heavy Tanks', shortName: 'Heavy tanks',
  stats: { nightSight: undefined, noStabilizer: true, smoke: { charges: 1 }, armor: 0.78, hp: 1650, damage: 450, range: 210, sideGuns: [{ turret: true, at: 0, arc: 0.18, range: 160, damage: 60, rate: 10, burst: 12, y: 2.0, out: 2.2 }, { at: 0, arc: 0.45, range: 130, damage: 60, rate: 9, burst: 10, y: 1.4, out: 2.4 }] },
  factionStats: {
    nato: { armor: 0.7, damage: 430, fireCooldown: 7, speed: 5.4 },                // M26: the 90 mm, quick for a heavy
    sov: { armor: 0.74, damage: 540, fireCooldown: 16, speed: 4.8, sideGuns: [{ turret: true, at: 0, arc: 0.18, range: 160, damage: 60, rate: 10, burst: 12, y: 2.0, out: 2.2 }] },                  // IS-2: the 122 mm, two-piece rounds: slow to load (no bow gunner)
    pact: { armor: 0.8, damage: 470, speed: 5.2, fireCooldown: 7 },                   // Panther: the long 7.5 cm, the sloped front
    fj: { armor: 0.8, damage: 480, speed: 4.2, fireCooldown: 8 },                     // Tiger I: thick, slow, the 8.8
  },
  models: { nato: buildUsPershing, sov: buildSovIS2, pact: buildWhPanther, fj: buildFjTiger },
  engine: 'engine.diesel',
  variants: {
    nato: { name: 'M26 Pershing', weapon: '90 mm M3', text: 'The heavy tank that finally matched the Panther: the 90 mm and armour to take a hit. Stops to fire.' },
    sov: { name: 'IS-2', weapon: '122 mm D-25T', text: 'The breakthrough tank: a 122 mm shell wrecks whatever it hits, but the next one takes a while. Stops to fire.' },
    pact: { name: 'Panther G', weapon: '7.5 cm KwK 42 L/70', text: 'Fast, sloped, and the long 7.5 cm that pierces any Allied tank at range. Stops to fire.' },
    fj: { name: 'Tiger I (attached)', weapon: '8.8 cm KwK 36 L/56', text: 'Lent by a heavy tank battalion for the operation: slow, thick-skinned, the 8.8 that kills at any range. Stops to fire.' },
  },
});

const reconVehicle = derive(T.reconVehicle, {
  name: 'Recon Vehicles', shortName: 'Recon',
  stats: { nightSight: undefined, smoke: undefined },
  factionStats: {
    nato: { weapon: 'autocannon', damage: 110 },                                                                    // M8: the 37 mm
    sov: { weapon: 'rifle', weaponSound: 'mg', damage: 70, vsArmor: 0.03, pierce: 0, splash: 0, fireCooldown: 0.12, armor: 0.15, hp: 380, speed: 8 },  // BA-64: a DT machine gun
    pact: { damage: 220, vsArmor: 0.5, pierce: 0.4, splash: 1.4, fireCooldown: 1.8 },                               // Puma: the 5 cm
    fj: { weapon: 'rifle', weaponSound: 'mg', damage: 60, vsArmor: 0.02, pierce: 0, splash: 0, fireCooldown: 0.15, armor: 0, hp: 220, speed: 8.5, radius: 1.0, height: 1.3 }, // Kettenkrad: the crew's MP 40s
  },
  models: { nato: buildUsM8, sov: buildSovBA64, pact: buildWhPuma, fj: buildFjKettenkrad },
  engine: 'engine.dieselSmall',
  variants: {
    nato: { name: 'M8 Greyhound', weapon: '37 mm M6', text: 'The cavalry’s armoured car: fast on roads, sees far, the little 37 mm for anything lighter than a tank.' },
    sov: { name: 'BA-64', weapon: 'DT machine gun', text: 'A small four-wheeled armoured car: scouts ahead, sees, and gets out of the way.' },
    pact: { name: 'Sd.Kfz. 234/2 Puma', weapon: '5 cm KwK 39', text: 'Eight wheels, a turret and a real gun: the best armoured car of the war.' },
    fj: { name: 'Kettenkrad', weapon: 'MP 40', text: 'The tracked motorcycle: no armour at all, but it gets two men anywhere and quick.' },
  },
});

const tankDestroyer = derive(T.tankDestroyer, {
  name: 'Tank Destroyers', shortName: 'Tank hunters', weaponSound: 'cannon',
  stats: {
    nightSight: undefined, atgm: undefined, gunRange: undefined, weaponSound: undefined, suppressPower: undefined, noStabilizer: true,
    weapon: 'cannon', range: 240, aggroRange: 0, preferredRange: 180, fireCooldown: 6, aimTime: 1.1, damage: 460, pierce: 0.65, splash: 3,
    boltSpeed: 650, boltSize: 1.5, tracer: 1, spread: 0.004, magSize: 40, reloadTime: 8, playerFireInterval: 6, hp: 900, armor: 0.5, speed: 5.6, turretRate: 0.6,
  },
  factionStats: {
    nato: { armor: 0.25, hp: 700, speed: 7.5, turretRate: 1.0, fireCooldown: 6 },          // M18: thin and the fastest thing on tracks
    sov: { armor: 0.55, hp: 950, speed: 5.6, turretRate: 0.6, fireCooldown: 9, traverse: 0.14 },           // SU-100: the gun in the hull
    pact: { armor: 0.6, hp: 950, speed: 5.0, damage: 480, fireCooldown: 7, traverse: 0.19 },               // Jagdpanzer IV/70: low, the long gun
    fj: { armor: 0.55, hp: 800, speed: 5.2, damage: 420, fireCooldown: 7, traverse: 0.14 },                // Hetzer: small, low, hard to spot
  },
  models: { nato: buildUsHellcat, sov: buildSovSU100, pact: buildWhJagdpanzerIV, fj: buildFjHetzer },
  engine: 'engine.diesel', tracks: 'tracks.heavy',
  variants: {
    nato: { name: 'M18 Hellcat', weapon: '76 mm M1', text: 'Built for speed: shoot from the flank, move before they answer. Its open turret stops little. Stops to fire.' },
    sov: { name: 'SU-100', weapon: '100 mm D-10S', text: 'A T-34 hull with a 100 mm in the front plate: kills a Panther from the front. The hull aims the gun. Stops to fire.' },
    pact: { name: 'Jagdpanzer IV/70', weapon: '7.5 cm PaK 42 L/70', text: 'Low and sloped, the Panther’s gun in a casemate: an ambusher. Stops to fire.' },
    fj: { name: 'Hetzer', weapon: '7.5 cm PaK 39 L/48', text: 'Small, low and well sloped: hard to see, hard to hit, deadly from cover. Stops to fire.' },
  },
});

const cev = derive(T.cev, {
  name: 'Assault Guns', shortName: 'Assault',
  stats: { noStabilizer: true, nightSight: undefined, smoke: { charges: 1 } },
  factionStats: {
    nato: { dozer: true, damage: 900, vsStructure: 2, fireCooldown: 6 },                                    // M4 dozer: the blade, the 75 mm
    sov: { dozer: false, damage: 1700, vsStructure: 2.6, splash: 7.5, fireCooldown: 20, traverse: 0.09 },  // ISU-152: the "beast killer"
    pact: { dozer: false, damage: 1500, fireCooldown: 18, traverse: 0.17 },                                                   // Brummbär: the 15 cm
    fj: { dozer: false, damage: 2600, splash: 10, fireCooldown: 40, range: 160, traverse: 0.17 },           // Sturmtiger: a 38 cm rocket
  },
  models: { nato: buildUsM4Dozer, sov: buildSovISU152, pact: buildWhBrummbaer, fj: buildFjSturmtiger },
  engine: 'engine.diesel',
  variants: {
    nato: { name: 'M4 Dozer', weapon: '75 mm M3, dozer blade', text: 'A Sherman with a blade: digs vehicle positions, clears obstacles, and still fires its 75. Stops to fire.' },
    sov: { name: 'ISU-152', weapon: '152 mm ML-20S', text: 'The “beast killer”: a 152 mm howitzer on the IS hull. Buildings fall, bunkers open. Stops to fire.' },
    pact: { name: 'Brummbär', weapon: '15 cm StuH 43', text: 'A heavy howitzer in a box on a Panzer IV: for the house fight and the bunker. Stops to fire.' },
    fj: { name: 'Sturmtiger', weapon: '38 cm RW 61', text: 'One rocket-propelled shell takes a building down. Slow to reload: the crane lifts each round in. Stops to fire.' },
  },
});

const artillery = derive(T.artillery, {
  name: 'Artillery', shortName: 'Artillery',
  stats: { nightSight: undefined },
  factionStats: { // the towed guns: unhitched and laid before they fire; all of them swing only so far on their mounts or trails (M7 ±23°, M-30 ±25°, Wespe ±17°, leFH 18 ±28°)
    nato: { traverse: 0.4 }, sov: { towed: { deploy: 18 }, traverse: 0.43 }, pact: { traverse: 0.3 }, fj: { towed: { deploy: 16 }, traverse: 0.49 },
  },
  models: { nato: buildUsPriest, sov: buildSovM30, pact: buildWhWespe, fj: buildFjLeFH18 },
  engine: 'engine.diesel',
  variants: {
    nato: { name: 'M7 Priest', weapon: '105 mm M2A1 howitzer', text: 'The 105 on a Sherman chassis, keeping up with the armour; the machine gun in its "pulpit".' },
    sov: { name: '122 mm M-30', weapon: '122 mm howitzer, towed', text: 'The divisional howitzer behind a Lend-Lease Studebaker: unhitched and laid, it fires all day.' },
    pact: { name: 'Wespe', weapon: '10.5 cm leFH 18/2', text: 'The light field howitzer on a Panzer II hull, its crew in the open box at the back.' },
    fj: { name: '10.5 cm leFH 18', weapon: '10.5 cm howitzer, towed', text: 'The standard German field howitzer behind an Opel Blitz: unhitched and laid before it fires.' },
  },
});

const rockets = derive(T.rockets, {
  name: 'Rocket Artillery', shortName: 'Rockets',
  stats: { nightSight: undefined },
  factionStats: {
    nato: { armor: 0.5, hp: 1000, magSize: 12, weaponSound: 'mlrs' },                                                         // Calliope: on a Sherman
    sov: { armor: 0.05, hp: 400, magSize: 16, damage: 100, splash: 5, fireCooldown: 0.2, scatter: 14, weaponSound: 'katyusha', traverse: 0.1 },  // Katyusha: sixteen rails, a lorry
    pact: { magSize: 10, damage: 130, fireCooldown: 1.2, weaponSound: 'nebelwerfer' },   // (a rocket every ~1.2 s, as the real ones fired)                                               // Panzerwerfer 42: ten tubes
    fj: { magSize: 6, damage: 140, fireCooldown: 1.2, towed: { deploy: 12 }, armor: 0, hp: 250, weaponSound: 'nebelwerfer' },        // Nebelwerfer 41: six, towed
  },
  models: { nato: buildUsCalliope, sov: buildSovKatyusha, pact: buildWhPanzerwerfer, fj: buildFjNebelwerfer },
  engine: 'engine.diesel',
  variants: {
    nato: { name: 'T34 Calliope', weapon: '60 × 4.5 in rockets', text: 'Sixty rocket tubes over a Sherman’s turret: one long ripple, then a long reload.' },
    sov: { name: 'BM-13 Katyusha', weapon: '16 × 132 mm rockets', text: '"Stalin’s organ": a ripple of rockets howling onto a whole field, from the back of a Studebaker.' },
    pact: { name: 'Panzerwerfer 42', weapon: '10 × 15 cm rockets', text: 'The Nebelwerfer’s tubes on the armoured Maultier half-track: fire, and move before the answer comes.' },
    fj: { name: 'Nebelwerfer 41', weapon: '6 × 15 cm rockets, towed', text: 'The "moaning minnie": six tubes on a light carriage, towed into place.' },
  },
});

const spMortar = derive(T.spMortar, {
  name: 'Heavy Mortars', shortName: 'Heavy mortars',
  stats: { nightSight: undefined },
  factionStats: {
    sov: { towed: { deploy: 10 }, damage: 175, splash: 5.5, range: 250 },          // 120 mm PM-38: towed
    fj: { damage: 190, splash: 6, range: 240 },                                     // 12 cm GrW 42 on a lorry
  },
  models: { nato: buildUsM4Mortar, sov: buildSovPM38, pact: buildWh2512, fj: buildFjGrw42Lorry },
  engine: 'engine.dieselSmall',
  variants: {
    nato: { name: 'M4 Mortar Carrier', weapon: '81 mm M1 mortar', text: 'The battalion’s 81 in a half-track: fires from inside, moves on.' },
    sov: { name: '120 mm PM-38', weapon: '120 mm mortar, towed', text: 'The regimental heavy mortar: so good the Germans copied it. Unhitched in moments.' },
    pact: { name: 'Sd.Kfz. 251/2', weapon: '8 cm GrW 34', text: 'The half-track with its mortar inside: smoke and high explosive close behind the attack.' },
    fj: { name: '12 cm GrW 42', weapon: '12 cm mortar on an Opel Blitz', text: 'The heavy mortar the Germans copied from the Soviets, carried on a lorry.' },
  },
});

const observers = derive(T.observers, {
  models: men({ scout: true, radio: true }),
  variants: {
    nato: { name: 'Forward Observers', weapon: 'M1 carbine, SCR-300, binoculars', text: 'Put them where they can see, and every gun and mortar you own lands on the target.' },
    sov: { name: 'Artillery Observers', weapon: 'PPSh-41, RBM radio, binoculars', text: 'The battery’s eyes in the front line: within their sight the guns hit.' },
    pact: { name: 'Artilleriebeobachter', weapon: 'MP 40, Feldfu, binoculars', text: 'Within their sight the guns are accurate; without them, they plough the fields.' },
    fj: { name: 'Artilleriebeobachter', weapon: 'MP 40, Feldfu, binoculars', text: 'Within their sight the guns are accurate; without them, they plough the fields.' },
  },
});

/** Sound ranging (the counter-battery radar of 1945): microphones out, every gun that fires within reach is plotted. */
const cbRadar = derive(T.observers, {
  id: 'cbRadar', name: 'Sound Ranging Team', shortName: 'Sound ranging', category: 'fire', cost: 200,
  formation: { count: 3, columns: 3, spacing: 4 },
  stats: { observer: undefined, cbRadar: { range: 450, arc: 6.3, deploy: 25 } },   // listens all round, takes longer to lay out
  models: men({ radio: true }),
  variants: {
    nato: { name: 'Sound Ranging Team', weapon: 'microphones, plotting board', text: 'Three listening posts: when an enemy gun fires, its bang is timed at each and the gun is plotted on the map for your artillery. Needs 25 s to lay out.' },
    sov: { name: 'Sound Ranging Team', weapon: 'microphones, plotting board', text: 'The listening posts: every enemy gun that fires within reach is plotted for your artillery. Needs 25 s to lay out.' },
    pact: { name: 'Schallmesstrupp', weapon: 'microphones, plotting board', text: 'The sound-ranging troop: every enemy gun that fires within reach is plotted for your artillery. Needs 25 s to lay out.' },
    fj: { name: 'Schallmesstrupp', weapon: 'microphones, plotting board', text: 'The sound-ranging troop: every enemy gun that fires within reach is plotted for your artillery. Needs 25 s to lay out.' },
  },
});

// air defence: guns only (no missiles yet). Without a radar of their own the gunners see by eye
// (`optical`: a share of the reach) unless an air search radar covers them (AirStrike.radarCovers)
const aa = derive(T.aa, {
  name: 'Self-propelled AA', shortName: 'SP AA',
  stats: { nightSight: undefined, antiAir: { range: 260, optical: 0.7, rate: 12, burst: 1.4, pause: 0.9, hitNear: 0.06, hitFar: 0.012 } },
  factionStats: {
    nato: { armor: 0.2, hp: 600 },                    // M16: the quad .50 on an M3
    sov: { armor: 0.2, hp: 600 },                     // M17: the same, Lend-Lease
    pact: { armor: 0.55, hp: 1100, speed: 4.8 },      // Wirbelwind: on a Panzer IV
    fj: { armor: 0.25, hp: 650, speed: 6 },           // a Flak 38 on a 251
  },
  models: { nato: buildUsM16, sov: buildSovM17, pact: buildWhWirbelwind, fj: buildFj251Flak },
  engine: 'engine.dieselSmall',
  variants: {
    nato: { name: 'M16 MGMC', weapon: '4 × .50 cal (Maxson mount)', text: 'The "meat chopper": four heavy machine guns on a half-track. Against low aircraft and infantry in the open alike.' },
    sov: { name: 'M17 MGMC', weapon: '4 × .50 cal', text: 'The quad .50 half-track, Lend-Lease: the Red Army’s best answer to low-flying aircraft.' },
    pact: { name: 'Flakpanzer IV Wirbelwind', weapon: '4 × 2 cm Flak 38', text: 'Four 2 cm cannon in an open turret on a Panzer IV: keeps the Jabos off the column.' },
    fj: { name: 'Sd.Kfz. 251/17', weapon: '2 cm Flak 38', text: 'A 2 cm Flak on the half-track’s rear deck: light, quick, the crew in the open.' },
  },
});

const towedAA = derive(T.towedAA, {
  name: 'Towed AA', shortName: 'Towed AA',
  stats: { nightSight: undefined },
  factionStats: {
    nato: { antiAir: { range: 320, optical: 0.65, rate: 2.2, burst: 3, pause: 1, hitNear: 0.14, hitFar: 0.04 } },   // Bofors: slow, hard-hitting
    sov: { antiAir: { range: 300, optical: 0.65, rate: 2.4, burst: 3, pause: 1, hitNear: 0.13, hitFar: 0.035 } },   // 61-K: the Bofors’ Soviet cousin
    pact: { antiAir: { range: 240, optical: 0.65, rate: 7, burst: 1.5, pause: 1, hitNear: 0.06, hitFar: 0.012 } },  // Flak 38: one 2 cm
    fj: { antiAir: { range: 240, optical: 0.65, rate: 14, burst: 1.5, pause: 1, hitNear: 0.06, hitFar: 0.012 } },   // Flakvierling: four
  },
  models: { nato: buildUsBofors, sov: buildSov61K, pact: buildWhFlak38, fj: buildFjFlakvierling },
  variants: {
    nato: { name: 'Bofors 40 mm', weapon: '40 mm M1', text: 'The Bofors on its four-wheeled carriage: slow clips of heavy shells that bring an aircraft down with one hit.' },
    sov: { name: '37 mm 61-K', weapon: '37 mm 61-K', text: 'The Soviet 37 mm, the Bofors’ cousin: steady fire over the front line.' },
    pact: { name: '2 cm Flak 38', weapon: '2 cm Flak 38', text: 'The light Flak on its cross: quick to set up, a stream of small shells.' },
    fj: { name: '2 cm Flakvierling 38', weapon: '4 × 2 cm Flak 38', text: 'Four 2 cm barrels on one mount: a wall of shells no low aircraft flies through twice.' },
  },
});

/** The heavy AA guns: long reach against aircraft, and against tanks (the 88 above all). */
const sam = derive(T.sam, {
  name: 'Heavy AA Gun', shortName: 'Heavy Flak', weaponSound: 'cannon', cost: 360,
  stats: {
    nightSight: undefined, towed: { deploy: 25 }, hp: 600, armor: 0.1, turretRate: 0.6,
    antiAir: { range: 650, optical: 0.8, rate: 0.5, burst: 8, pause: 0.1, hitNear: 0.3, hitFar: 0.1 },
    weapon: 'cannon', range: 320, aggroRange: 280, preferredRange: 250, damage: 480, pierce: 0.7, splash: 3, fireCooldown: 5, aimTime: 1,
    antiArmor: true, boltSpeed: 720, boltSize: 1.5, tracer: 1, spread: 0.003, magSize: 40, reloadTime: 6, playerFireInterval: 5, noStabilizer: true,
  },
  factionStats: {},
  models: { nato: buildUs90mm, sov: buildSov52K, pact: buildDeFlak36, fj: buildDeFlak36 },
  variants: {
    nato: { name: '90 mm M2', weapon: '90 mm M2 gun', text: 'The heavy AA gun on its cruciform mount: reaches far up — and its shells go through tank armour too.' },
    sov: { name: '85 mm 52-K', weapon: '85 mm 52-K', text: 'The heavy AA gun whose barrel went into the T-34-85: deadly to aircraft and tanks alike.' },
    pact: { name: '8.8 cm Flak 36', weapon: '8.8 cm Flak 36', text: 'The 88: built to shoot down bombers, feared most for what it does to tanks at a kilometre.' },
    fj: { name: '8.8 cm Flak 36', weapon: '8.8 cm Flak 36', text: 'The Luftwaffe’s own 88, with the Fallschirmjäger: aircraft or tanks, it kills both.' },
  },
});

const manpads = derive(T.manpads, {
  name: 'AA Machine-Gun Team', shortName: 'AA MG', weaponSound: 'mg',
  specialist: { count: 1, stats: { antiAir: { range: 220, optical: 1, rate: 9, burst: 1.5, pause: 1, hitNear: 0.05, hitFar: 0.01 } } },
  models: men(),
  specialistModels: men({ weapon: 'mg' }),
  variants: {
    nato: { name: 'AA .50 Team', weapon: 'M2 .50 cal on an AA tripod', text: 'A heavy machine gun pointed at the sky: no aircraft flies low over them unpunished.' },
    sov: { name: 'DShK Team', weapon: 'DShK 12.7 mm on its AA mount', text: 'The heavy DShK on its tall tripod: the infantry’s own umbrella.' },
    pact: { name: 'Fla-MG Team', weapon: 'MG 42 on the AA tripod', text: 'The MG 42 on its anti-aircraft tripod: a stream of bullets across a strafing run.' },
    fj: { name: 'Fla-MG Team', weapon: 'MG 42 on the AA tripod', text: 'The MG 42 on its anti-aircraft tripod: a stream of bullets across a strafing run.' },
  },
});

const airRadar = derive(T.airRadar, {
  name: 'Air Search Radar', shortName: 'Radar',
  stats: { nightSight: undefined, airRadar: { cover: 380, detect: 800, deploy: 15 } },
  factionStats: {},
  models: { nato: buildUsSCR584, sov: buildSovRUS2, pact: buildDeWuerzburg, fj: buildDeWuerzburg },
  variants: {
    nato: { name: 'SCR-584', weapon: 'unarmed', text: 'The gun-laying radar in its van: warns of aircraft coming and guides your AA guns onto them.' },
    sov: { name: 'RUS-2', weapon: 'unarmed', text: 'The early-warning radar on its lorry: no aircraft arrives unannounced.' },
    pact: { name: 'Würzburg', weapon: 'unarmed', text: 'The big dish of the Würzburg: it finds the aircraft and puts the Flak onto them.' },
    fj: { name: 'Würzburg', weapon: 'unarmed', text: 'The big dish of the Würzburg: it finds the aircraft and puts the Flak onto them.' },
  },
});

const gunMissile = derive(T.gunMissile, {
  name: 'SP AA Cannon', shortName: 'AA cannon', weaponSound: 'autocannon',
  stats: {
    nightSight: undefined, atgm: undefined, gunRange: undefined,
    antiAir: { range: 300, optical: 0.75, rate: 2.5, burst: 3, pause: 1, hitNear: 0.14, hitFar: 0.04 },
    range: 160, damage: 120, splash: 1, vsArmor: 0.3, pierce: 0.25, fireCooldown: 0.4, magSize: 8, reloadTime: 3,
  },
  factionStats: {
    nato: { armor: 0.2, hp: 600 },                    // M15: the 37 mm and two .50s on an M3
    sov: { armor: 0.25, hp: 650 },                    // ZSU-37: on the SU-76 hull
    pact: { armor: 0.55, hp: 1100, speed: 4.8 },      // Ostwind: the 3.7 cm on a Panzer IV
    fj: { armor: 0.55, hp: 1100, speed: 4.8 },
  },
  models: { nato: buildUsM15, sov: buildSovZSU37, pact: buildFjOstwind, fj: buildFjOstwind },
  engine: 'engine.dieselSmall',
  variants: {
    nato: { name: 'M15 CGMC', weapon: '37 mm M1A2, 2 × .50 cal', text: 'A 37 mm cannon and two heavy machine guns in an armoured mount on a half-track.' },
    sov: { name: 'ZSU-37', weapon: '37 mm 61-K', text: 'The 37 mm in an open box on the SU-76 hull: keeps up with the tanks.' },
    pact: { name: 'Flakpanzer IV Ostwind', weapon: '3.7 cm Flak 43', text: 'The 3.7 cm in an open turret on a Panzer IV: heavier shells than the Wirbelwind, fewer of them.' },
    fj: { name: 'Flakpanzer IV Ostwind', weapon: '3.7 cm Flak 43', text: 'The 3.7 cm in an open turret on a Panzer IV: heavier shells than the Wirbelwind, fewer of them.' },
  },
});

const scouts = derive(T.scouts, {
  models: men({ scout: true }),
  variants: {
    nato: { name: 'I&R Scouts', weapon: 'M1 carbine, binoculars', text: 'The regiment’s Intelligence and Reconnaissance platoon: two men who see far and are seen by nobody.' },
    sov: { name: 'Razvedchiki', weapon: 'PPS-43, binoculars', text: 'The scouts who go out at night and come back with what the enemy has, and where.' },
    pact: { name: 'Aufklärer', weapon: 'MP 40, binoculars', text: 'Reconnaissance: they find the Allied positions before the attack runs into them.' },
    fj: { name: 'Aufklärer', weapon: 'FG 42, binoculars', text: 'Fallschirmjäger scouts: far forward, hidden, watching.' },
  },
});

const sniper = derive(T.sniper, {
  models: men({ scout: true }),
  specialistModels: men({ weapon: 'sniper', scout: true }),
  variants: {
    nato: { name: 'Sniper Team', weapon: 'M1903A4 Springfield', text: 'A marksman and his spotter: officers, crews and observers first, from three times a squad’s reach.' },
    sov: { name: 'Sniper Pair', weapon: 'Mosin-Nagant with PU scope', text: 'The Red Army’s snipers, the best of the war: patient, hidden, deadly at long range.' },
    pact: { name: 'Scharfschützen', weapon: 'Kar98k with ZF 39', text: 'The Kar98k with its scope: one shot, then the next position.' },
    fj: { name: 'Scharfschützen', weapon: 'FG 42 with ZF 4', text: 'The Fallschirmjäger marksman with the scoped FG 42: quick follow-up shots.' },
  },
});

/** Engineers: dig, wire, clear and blow as in 1985 — and one man of each squad carries a flamethrower. */
const engineers = derive(T.engineers, {
  models: men({ engineer: true }),
  specialist: { count: 1, stats: {
    range: 32, aggroRange: 40, preferredRange: 20, damage: 75, splash: 2.2, fireCooldown: 0.07, burst: 1, burstInterval: 0,
    boltSpeed: 32, boltSize: 1.4, tracer: 1, spread: 0.05, magSize: 40, reloadTime: 7, vsStructure: 3, suppressPower: 3,
    ignite: 0.6, vsArmor: 0.15, aimTime: 0.3, playerFireInterval: 0.07, weaponSound: 'flame',
  } },
  specialistModels: men({ weapon: 'flame', engineer: true }),
  variants: {
    nato: { name: 'Combat Engineers', weapon: 'M1 Garand, M2-2 flamethrower, demolition charges', text: 'They dig, wire and clear mines three times as fast — and the flamethrower burns out bunkers and houses.' },
    sov: { name: 'Assault Sappers', weapon: 'PPSh-41, ROKS-3 flamethrower, steel breastplates', text: 'The assault engineer brigades in their steel breastplates: first into the enemy’s strongpoints, with fire and explosives.' },
    pact: { name: 'Pioniere', weapon: 'Kar98k, Flammenwerfer 41, charges', text: 'German combat engineers: mines, wire, demolitions, and the flamethrower for the bunker fight.' },
    fj: { name: 'Fallschirm-Pioniere', weapon: 'MP 40, Flammenwerfer 41, charges', text: 'The paratroop engineers: blow it, burn it, hold it.' },
  },
});

// support: as in 1985 (heal, repair, bridgeLayer, minePlough / lineCharge, commandPost) — the
// jammer's slot holds the smoke generators and the Fallschirmjäger's supply lorry
const lorryStats = { nightSight: undefined, armor: 0.05, hp: 380 };
const ambulance = derive(T.ambulance, {
  stats: lorryStats,
  factionStats: { pact: { armor: 0.25, hp: 600 }, fj: { armor: 0.05, hp: 380 } },        // the 251/8 has armour
  models: { nato: buildUsWC54, sov: buildSovGazAmb, pact: buildWh2518, fj: buildFjBlitzAmb },
  engine: 'engine.dieselSmall',
  variants: {
    nato: { name: 'Dodge WC54', weapon: 'unarmed', text: 'The field ambulance: wounded men near it are patched up and go back to the line.' },
    sov: { name: 'GAZ ambulance', weapon: 'unarmed', text: 'The medical lorry: wounded men near it are patched up and go back to the line.' },
    pact: { name: 'Sd.Kfz. 251/8', weapon: 'unarmed', text: 'The armoured ambulance half-track: it can go where the fighting is to fetch the wounded.' },
    fj: { name: 'Opel Blitz Sanka', weapon: 'unarmed', text: 'The ambulance lorry: wounded men near it are patched up and go back to the line.' },
  },
});

const recovery = derive(T.recovery, {
  stats: { nightSight: undefined },
  factionStats: { fj: { armor: 0.1, hp: 500 } },
  models: { nato: buildUsM32, sov: buildSovT34Tractor, pact: buildWhBergepanther, fj: buildFjFamo },
  engine: 'engine.diesel',
  variants: {
    nato: { name: 'M32 Recovery Vehicle', weapon: 'A-frame boom, winch, .50 cal', text: 'A Sherman with a boom and winch: mends tracks, hauls knocked-out vehicles back into running order.' },
    sov: { name: 'T-34 recovery tractor', weapon: 'jib, winch', text: 'A turretless T-34 with a jib: gets damaged tanks moving again behind the line.' },
    pact: { name: 'Bergepanther', weapon: 'crane, winch', text: 'The Panther hull with a crane and a spade: the only thing that could drag a Tiger.' },
    fj: { name: 'Sd.Kfz. 9 Famo', weapon: 'crane, winch', text: 'The biggest German half-track tractor, with its crane: field repairs and recovery.' },
  },
});

const bridgeLayer = derive(T.bridgeLayer, {
  stats: { nightSight: undefined },
  factionStats: { nato: { armor: 0.05, hp: 450 }, sov: { armor: 0.05, hp: 450 }, fj: { armor: 0.05, hp: 450 } },
  models: { nato: buildUsTreadway, sov: buildSovPontoon, pact: buildWhBrueckenleger, fj: buildFjPontoon },
  variants: {
    nato: { name: 'Treadway Bridge Lorry', weapon: 'treadway bridge', text: 'The engineers’ treadway on a lorry: a bridge over the river where none stood.' },
    sov: { name: 'Pontoon Lorry', weapon: 'pontoon bridge', text: 'The pontoon sections on a Studebaker: a crossing in minutes.' },
    pact: { name: 'Brückenleger IV', weapon: 'bridge on a Panzer IV', text: 'A Panzer IV carrying its bridge: it lays it across the gap and backs off.' },
    fj: { name: 'Brückengerät', weapon: 'pontoon bridge', text: 'The engineers’ pontoon sections on an Opel Blitz: a crossing in minutes.' },
  },
});

const mineClear = derive(T.mineClear, {
  stats: { nightSight: undefined, noStabilizer: true },
  factionStats: {
    sov: { minePlough: true },
    // Goliath: blows a lane through a minefield, or — driven up to a tank, a bunker, a held house — goes off against it
    pact: { minePlough: false, lineCharge: { count: 1, range: 110 }, hp: 150, armor: 0.1, speed: 3, radius: 0.8, height: 0.7, range: 1, weapon: 'rifle', damage: 0,
      aggroRange: 45, preferredRange: 0, antiArmor: true, goliath: { trigger: 3.5, radius: 6, damage: 1800 }, stealth: 0.5, sight: 50, sideGuns: undefined },
    fj: { minePlough: false, lineCharge: { count: 1, range: 110 }, hp: 150, armor: 0.1, speed: 3, radius: 0.8, height: 0.7, range: 1, weapon: 'rifle', damage: 0,
      aggroRange: 45, preferredRange: 0, antiArmor: true, goliath: { trigger: 3.5, radius: 6, damage: 1800 }, stealth: 0.5, sight: 50, sideGuns: undefined },
  },
  armyCost: { wh: 120, fj: 120 },   // the Goliath: cheap — it is used up
  models: { nato: buildUsT1E3, sov: buildSovPT3, pact: buildDeGoliath, fj: buildDeGoliath },
  variants: {
    nato: { name: 'T1E3 Mine Exploder', weapon: 'roller discs, 75 mm', text: '"Aunt Jemima": a Sherman pushing two great sets of steel discs that set off the mines ahead of it.' },
    sov: { name: 'T-34 with PT-3', weapon: 'mine rollers, 85 mm', text: 'Heavy rollers on arms ahead of the tracks: lane after lane through the minefields.' },
    pact: { name: 'Goliath', weapon: '100 kg demolition charge', text: 'The little remote-controlled carrier on its cable. Into a minefield it blows a lane; driven up to a tank, a bunker or a held house it goes off against it. Small, low and hard to spot — and used up.' },
    fj: { name: 'Goliath', weapon: '100 kg demolition charge', text: 'The little remote-controlled carrier on its cable. Into a minefield it blows a lane; driven up to a tank, a bunker or a held house it goes off against it. Small, low and hard to spot — and used up.' },
  },
});

const commandPost = derive(T.commandPost, {
  stats: { nightSight: undefined },
  factionStats: { nato: { armor: 0.25, hp: 600 }, sov: { armor: 0.05, hp: 380 }, pact: { armor: 0.25, hp: 600 }, fj: { armor: 0.05, hp: 380 } },
  models: { nato: buildUsM3Command, sov: buildSovRadioLorry, pact: buildWh2516, fj: buildFjBlitzCommand },
  variants: {
    nato: { name: 'M3 Command Half-track', weapon: 'radios, mast', text: 'The battalion command post: set it up behind the front and the reinforcements report there.' },
    sov: { name: 'Radio Lorry', weapon: 'radios, mast', text: 'The command post on a lorry: once its mast is up, the reinforcements come forward to it.' },
    pact: { name: 'Sd.Kfz. 251/6', weapon: 'radios, frame antenna', text: 'The command half-track with its bedstead antenna: the reinforcements come forward to it.' },
    fj: { name: 'Gefechtsstand', weapon: 'radios, mast', text: 'The command post on an Opel Blitz: once its mast is up, the reinforcements come forward to it.' },
  },
});

/** The jammer's slot: a smoke generator (screens the front ahead of it), the Fallschirmjäger's supply lorry. */
const jammer = derive(T.jammer, {
  name: 'Smoke Generator', shortName: 'Smoke',
  stats: { ...lorryStats, jammer: undefined, smokeGen: { deploy: 8, every: 6, ahead: 20, radius: 14, duration: 28 } },
  factionStats: {
    fj: { smokeGen: undefined, supply: { deploy: 4, radius: 60, restock: 0.25 } },
  },
  models: { nato: buildUsSmokeGen, sov: buildSovSmokeGen, pact: buildWhSmokeGen, fj: buildFjSupply },
  variants: {
    nato: { name: 'Smoke Generator', weapon: 'M2 smoke generator, fog oil', text: 'Set up, it keeps a smoke screen standing 20 m in front of it for as long as it stays: turn it toward the enemy.' },
    sov: { name: 'Smoke Generator', weapon: 'smoke apparatus', text: 'Set up, it keeps a smoke screen standing 20 m in front of it for as long as it stays: turn it toward the enemy.' },
    pact: { name: 'Nebeltruppe', weapon: 'smoke generator', text: 'Set up, it keeps a smoke screen standing 20 m in front of it for as long as it stays: turn it toward the enemy.' },
    fj: { name: 'Supply Lorry', weapon: 'ammunition, men', text: 'A mobile supply point: squads within 60 m can take in new men (Refill) and get their grenades and Panzerfausts back four times faster.' },
  },
});

// the paradrop's stick (KINDS.lift; airOnly: never bought on the ground)
const airAssault = derive(T.airAssault, {
  models: { nato: () => buildWw2Soldier({ army: 'us' }), sov: () => buildWw2Soldier({ army: 'sov', weapon: 'smg' }), pact: () => buildWw2Soldier({ army: 'fj' }), fj: () => buildWw2Soldier({ army: 'fj' }) },
  specialistModels: { nato: () => buildWw2Soldier({ army: 'us', weapon: 'mg' }), sov: () => buildWw2Soldier({ army: 'sov', weapon: 'mg' }), pact: () => buildWw2Soldier({ army: 'fj', weapon: 'mg' }), fj: () => buildWw2Soldier({ army: 'fj', weapon: 'mg' }) }, // (not 1985's)
  stats: { lightAT: 0, nightSight: undefined },
  factionStats: { pact: { lightAT: 1 }, fj: { lightAT: 1 } },
  variants: {
    nato: { name: 'Paratroopers', weapon: 'M1 carbines, M1 Garand, bazooka', text: 'The 101st and the 82nd: dropped behind the line, lightly armed, hard to dislodge once down.' },
    sov: { name: 'Guards Paratroopers', weapon: 'PPSh-41, DP-28', text: 'The Guards airborne: few drops, but hard men when they come down.' },
    pact: { name: 'Fallschirmjäger', weapon: 'FG 42, MG 42', text: 'The Luftwaffe’s paratroopers in their own role: out of the Ju 52 over the target.' },
    fj: { name: 'Fallschirmjäger', weapon: 'FG 42, MG 42', text: 'The Luftwaffe’s paratroopers in their own role: out of the Ju 52 over the target.' },
  },
});

// ---------------------------------------------------------------- the Pacific (Iwo Jima, February 1945)
// Two more armies (data/epoch.js): the US Marine Corps on the Allied side — the US Army's types wherever the
// Marines have nothing of their own — and the Imperial Japanese Army on the other, which fields only the types
// written for it here (`own` in data/epoch.js: no Panthers for Japan). Each: its model, its stats over its side's
// (factionStats layer the side, then the army), its name and text, its own price (armyCost: the Japanese tanks
// were light and cheap).
const pacific = (t, army, { model, stats, variant, cost }) => {
  if (model) t.models = { ...t.models, [army]: model };
  if (stats) t.factionStats = { ...t.factionStats, [army]: { ...t.factionStats?.[army === 'jp' ? 'pact' : 'nato'], ...stats } };
  if (cost) t.armyCost = { ...t.armyCost, [army]: Math.round(t.cost * cost) };
  t.variants = { ...t.variants, [army]: variant };
};
// the Imperial Japanese Army
pacific(rifles, 'jp', { stats: { fireCooldown: 2.6, magSize: 5, reloadTime: 3.5, playerFireInterval: 1.4, lightAT: 0, grenades: 3 }, cost: 0.9,
  variant: { name: 'Rifle Squad', weapon: 'Arisaka Type 99, Type 96 LMG, knee mortar', text: 'The Imperial Army’s rifle squad: the long Arisaka, the light machine gun, and grenades by the dozen. They fight from holes and caves to the last man.' } });
pacific(atTeam, 'jp', { stats: { range: 14, damage: Math.round(T.atTeam.stats.damage * 1.6), magSize: 1, reloadTime: 22, fireCooldown: 2, boltSpeed: 18, trail: false, splash: 2.5 }, cost: 0.75,
  variant: { name: 'Lunge-Mine Team', weapon: 'Type 99 lunge mine, satchel charges', text: 'No bazooka: men who rush the tank with a shaped charge on a pole, or a satchel under its tracks. They must get within a few metres — and they will try.' } });
pacific(mgTeam, 'jp', { stats: { burst: 8, burstInterval: 0.13, fireCooldown: 2.4 }, cost: 0.9,
  variant: { name: 'Type 92 HMG Team', weapon: 'Type 92 heavy machine gun, 7.7 mm', text: 'The “woodpecker”: slow, steady, strip-fed bursts from a dug-in nest that covers every way up the beach.' } });
pacific(mortar, 'jp', { variant: { name: 'Mortar Team', weapon: 'Type 97 81 mm mortar', text: 'Mortars registered on every terrace of the beach long before the landing: they know the range to the metre.' } });
pacific(scouts, 'jp', { variant: { name: 'Scouts', weapon: 'Arisaka Type 99, binoculars', text: 'Lookouts in the rocks: they see the enemy coming and stay hidden.' } });
pacific(sniper, 'jp', { variant: { name: 'Sniper', weapon: 'Arisaka Type 97 with scope', text: 'A marksman in a spider hole: one shot, then the lid closes.' } });
pacific(engineers, 'jp', { variant: { name: 'Engineers', weapon: 'Arisaka, Type 93 flamethrower, demolition charges', text: 'They dug the island’s tunnels and caves; in battle they wire, mine and burn.' } });
pacific(observers, 'jp', { variant: { name: 'Artillery Observers', weapon: 'Arisaka, field telephone', text: 'In a cave on the heights with a view of the whole beach: wherever they look, the guns land.' } });
pacific(crew, 'jp', { variant: { name: 'Tank Crew', weapon: 'Type 14 pistol', text: CREW_TEXT } });
pacific(tank, 'jp', { model: buildJpChiHa, stats: { armor: 0.35, hp: 850, damage: 230, range: 160, fireCooldown: 4, speed: 5.0 }, cost: 0.62,
  variant: { name: 'Type 97 Shinhōtō Chi-Ha', weapon: '47 mm Type 1', text: 'The Imperial Army’s medium tank with the new turret and the long 47 mm: deadly to amtracs, outclassed by any Sherman. On Iwo Jima they were dug in to their turrets.' } });
pacific(reconVehicle, 'jp', { model: buildJpHaGo, stats: { weapon: 'cannon', damage: 120, vsArmor: 0.6, pierce: 0.35, splash: 1, fireCooldown: 2.5, armor: 0.15, hp: 520 }, cost: 0.75,
  variant: { name: 'Type 95 Ha-Go', weapon: '37 mm Type 94', text: 'The light tank: quick, thinly armoured, its little 37 mm for infantry and amtracs.' } });
pacific(tankDestroyer, 'jp', { model: buildJpHoNi, stats: { armor: 0.3, hp: 800, speed: 4.8, damage: 380, fireCooldown: 6.5, traverse: 0.18 }, cost: 0.8,
  variant: { name: 'Type 1 Ho-Ni I', weapon: '75 mm Type 90 field gun', text: 'A field gun behind a shield on the Chi-Ha’s chassis: an ambusher that kills a Sherman from the side. Stops to fire.' } });
pacific(artillery, 'jp', { model: buildJpType91, stats: { towed: { deploy: 18 }, traverse: 0.45 }, cost: 0.9,
  variant: { name: 'Type 91 10 cm Howitzer', weapon: '105 mm Type 91', text: 'The divisional howitzer, towed into a cave mouth: it fires, and is pulled back in before the counter-fire comes.' } });
pacific(rockets, 'jp', { model: buildJpRocket, stats: { magSize: 4, damage: 240, splash: 9, fireCooldown: 3, scatter: 22, armor: 0.05, hp: 380 }, cost: 0.8,
  variant: { name: 'Type 4 20 cm Rocket Launcher', weapon: '4 × 20 cm rockets', text: 'Huge, inaccurate rockets that fell on Iwo Jima’s beaches like crashing freight cars.' } });
pacific(towedAA, 'jp', { model: buildJpType98, stats: { antiAir: { range: 240, optical: 0.65, rate: 6, burst: 1.5, pause: 1, hitNear: 0.06, hitFar: 0.012 } },
  variant: { name: 'Type 98 20 mm AA', weapon: '20 mm Type 98', text: 'The light AA gun: against low aircraft — and, lowered, against men on the beach.' } });
pacific(ambulance, 'jp', { model: buildJpIsuzuAmb, variant: { name: 'Medical Lorry', weapon: 'unarmed', text: 'An Isuzu lorry with a red cross: patches up the wounded nearby.' } });
pacific(commandPost, 'jp', { model: buildJpIsuzu, variant: { name: 'Command Post', weapon: 'field telephones', text: 'The battalion’s headquarters in a lorry: nearby squads hold longer and react faster.' } });
// …and the rest of its roster (models/jp45.js): every 1945 type but the DD tank (a landing army's)
pacific(ifv, 'jp', { model: buildJpHoHa, stats: { armor: 0.15, hp: 480 }, cost: 0.85,
  variant: { name: 'Type 1 Ho-Ha', weapon: 'Type 97 7.7 mm MGs', text: 'The Army’s armoured half-track, built in small numbers: a squad rides up behind riveted plate. U unloads the squad.' } });
airAssault.specialistModels = { ...airAssault.specialistModels, jp: () => buildWw2Soldier({ army: 'teishin', weapon: 'mg' }) }; // (the Type 99 LMG — not the Fallschirmjäger's MG 42)
pacific(airAssault, 'jp', { model: () => buildWw2Soldier({ army: 'teishin' }),
  variant: { name: 'Teishin Paratroopers', weapon: 'Type 100 SMG, Type 99 rifle', text: 'The raiding paratroopers who took the Palembang oil fields: dropped onto the objective, lightly armed, they hold to the last.' } });
pacific(heavyTank, 'jp', { model: buildJpChiNu, stats: { armor: 0.5, hp: 1150, damage: 330, range: 190, fireCooldown: 5, speed: 4.6 }, cost: 0.7,
  variant: { name: 'Type 3 Chi-Nu', weapon: 'Type 3 75 mm', text: 'The last medium tank Japan built, held back to defend the home islands: at last a gun that can kill a Sherman. Stops to fire.' } });
pacific(cev, 'jp', { model: buildJpHoI, stats: { damage: 750, vsStructure: 2, splash: 5, fireCooldown: 7, traverse: 0.3, armor: 0.45, hp: 1000 }, cost: 0.7,
  variant: { name: 'Type 2 Ho-I', weapon: 'Type 99 75 mm short gun', text: 'The support tank: a short 75 in the turret, high explosive into bunkers and houses ahead of the infantry. Stops to fire.' } });
pacific(spMortar, 'jp', { model: buildJpHaTo, stats: { damage: 420, splash: 10, range: 260, armor: 0.2, hp: 700 }, cost: 1.1,
  variant: { name: 'Type 4 Ha-To', weapon: '300 mm Type 4 mortar', text: 'A huge mortar in an open box on a lengthened tracked hull, a handful built at the war’s end: few rounds, each one a crater.' } });
pacific(cbRadar, 'jp', { variant: { name: 'Sound Ranging Team', weapon: 'microphones, plotting board', text: 'The field artillery’s listening posts: every enemy gun that fires within reach is plotted for your guns.' } });
pacific(aa, 'jp', { model: buildJpLorryAA, stats: { ...lorryStats, antiAir: { ...aa.stats.antiAir, rate: 6, burst: 1.5, pause: 1 } }, cost: 0.75,
  variant: { name: 'Type 98 on an Isuzu', weapon: 'Type 98 20 mm', text: 'The 20 mm AA cannon on a lorry bed: it keeps the strafing fighters off the column. Unarmoured.' } });
pacific(gunMissile, 'jp', { model: buildJpLorry25, stats: { armor: 0.05, hp: 400 }, cost: 0.8,
  variant: { name: 'Type 96 25 mm on a lorry', weapon: '3 × Type 96 25 mm', text: 'The Navy’s triple 25 mm — the light AA gun of every island garrison — bolted to a lorry bed. Unarmoured.' } });
pacific(sam, 'jp', { model: buildJpType88, stats: { damage: 400, range: 300 }, cost: 0.85,
  variant: { name: 'Type 88 75 mm AA Gun', weapon: 'Type 88 75 mm', text: 'The Army’s heavy AA gun on its cross: it reaches the bombers — and on Iwo Jima and Okinawa it was turned on the Shermans.' } });
pacific(manpads, 'jp', { variant: { name: 'AA MG Team', weapon: 'Type 92 HMG on its AA mount', text: 'The heavy machine gun turned to the sky: low fliers pay for their strafing run.' } });
pacific(airRadar, 'jp', { model: buildJpTachi6, variant: { name: 'Tachi-6 Radar', weapon: 'unarmed', text: 'The Army’s early-warning radar, its aerials on a turning mast: warns of aircraft coming and guides the AA guns onto them.' } });
pacific(recovery, 'jp', { model: buildJpSeri, variant: { name: 'Type 1 Seri', weapon: 'crane, winch', text: 'The recovery vehicle on the Chi-Ha’s hull, a crane where the turret was: it gets knocked-out tanks moving again.' } });
pacific(bridgeLayer, 'jp', { model: buildJpBridge, variant: { name: 'Chi-Ha Bridge-Layer', weapon: 'bridge on a Chi-Ha', text: 'A Chi-Ha hull carrying its bridge, built in small numbers for the engineers: it lays it across the gap and backs off.' } });
pacific(mineClear, 'jp', { model: buildJpSsKi, variant: { name: 'Type 1 SS Engineer Vehicle', weapon: 'mine plough, charges', text: 'The engineers’ armoured vehicle: it ploughs a lane through the minefield and blows what stands in the way.' } });
pacific(jammer, 'jp', { model: buildJpSmoke, variant: { name: 'Smoke Lorry', weapon: 'smoke generator, smoke candles', text: 'Set up, it keeps a smoke screen standing 20 m in front of it for as long as it stays: turn it toward the enemy’s guns.' } });
// the Marines: their own names; the LVT amtrac in the half-track's place
pacific(rifles, 'usmc', { variant: { name: 'Marine Rifle Squad', weapon: 'M1 Garand, BAR, Thompson', text: 'A Marine rifle squad of three fire teams, each round its BAR: built for the assault from the sea.' } });
pacific(mgTeam, 'usmc', { variant: { name: 'Marine MG Team', weapon: 'Browning M1919, .30 cal', text: 'The air-cooled Browning, carried up the terraces to hold what the riflemen took.' } });
pacific(engineers, 'usmc', { variant: { name: 'Assault Engineers', weapon: 'M2-2 flamethrower, satchel charges', text: 'Iwo Jima’s cave-busters: the flamethrower into the opening, the satchel charge after it.' } });
pacific(tank, 'usmc', { variant: { name: 'M4A3 Sherman (Marines)', weapon: '75 mm M3', text: 'The Marines’ Shermans, wooden planks on their sides against magnetic mines: they blast pillboxes point-blank for the riflemen.' } });
// the Zippo in the heavy tank's place (the Marines had no Pershings on Iwo Jima): the 75's barrel swapped for a flame gun
pacific(heavyTank, 'usmc', { model: buildUsSherman, cost: 0.85,
  stats: { armor: 0.5, hp: 1150, speed: 5.2, noStabilizer: false, range: 70, aggroRange: 100, preferredRange: 40, damage: 90, splash: 2.6, fireCooldown: 0.08, burst: 1, burstInterval: 0,
    boltSpeed: 34, boltSize: 1.6, tracer: 1, spread: 0.05, magSize: 60, reloadTime: 12, vsStructure: 3, suppressPower: 3, ignite: 0.7, vsArmor: 0.15, pierce: 0, weaponSound: 'flame', antiArmor: false },
  variant: { name: 'M4A3R3 Zippo', weapon: 'flame gun, .30 cal', text: 'A Sherman with a flame gun in place of its 75: it drives up to the pillbox and burns it out from 60 metres. Useless against tanks — keep it with the riflemen, away from the 47s.' } });
pacific(ifv, 'usmc', { model: buildUsLvt4, stats: { armor: 0.2, hp: 700, speed: 4.6 }, variant: { name: 'LVT-4 Water Buffalo', weapon: '.30 and .50 cal', text: 'The amphibian tractor: swims in from the ships and climbs the beach with a squad in its open hold. U unloads them over the stern ramp.' } });

// ---------------------------------------------------------------- North Africa: the British 8th Army (El Alamein)
// Its own roster (data/epoch.js `own`): its infantry in khaki drill, its own desert vehicles in Light Stone
// (models/brit45.js) — and the American-built ones it fought in, the Shermans that came for Second Alamein, the Bofors.
const brit = (t, o) => pacific(t, 'brit', o);
brit(rifles, { stats: { fireCooldown: 1.9, magSize: 10, reloadTime: 3, playerFireInterval: 0.9 },
  variant: { name: 'Rifle Section', weapon: 'Lee-Enfield No. 1, Bren gun', text: 'The 8th Army’s infantry section: ten rifles round the Bren gun — the fastest bolt action of the war, a light machine gun that never jams.' } });
brit(atTeam, { variant: { name: 'Boys Anti-Tank Rifle Team', weapon: 'Boys .55 in anti-tank rifle', text: 'A long anti-tank rifle that kicks like a mule: it opens armoured cars and half-tracks, and a tank only from the side.' } });
brit(mgTeam, { stats: { burst: 12, burstInterval: 0.1, fireCooldown: 2.0 }, variant: { name: 'Vickers MG Team', weapon: 'Vickers .303 machine gun', text: 'The water-cooled Vickers on its tripod: it fires all day and covers a whole front of desert.' } });
brit(mortar, { variant: { name: '3-inch Mortar Team', weapon: 'Ordnance ML 3-inch mortar', text: 'The battalion’s mortars: high explosive and smoke on anything the section can see.' } });
brit(scouts, { variant: { name: 'Scouts', weapon: 'Lee-Enfield, binoculars', text: 'A patrol out in front at night: they find the minefield gaps and the enemy’s posts.' } });
brit(sniper, { variant: { name: 'Sniper', weapon: 'Lee-Enfield No. 4 (T)', text: 'A marksman with the scoped Enfield, hidden in the scrub.' } });
brit(engineers, { variant: { name: 'Royal Engineers', weapon: 'Lee-Enfield, mine detectors, flamethrower', text: 'The sappers who cleared the lanes through the Devil’s Gardens with mine detectors and bayonets — and burn out the strongpoints.' } });
brit(observers, { variant: { name: 'Forward Observation Officer', weapon: 'Lee-Enfield, wireless set', text: 'The gunners’ officer up with the infantry: where he looks, the 25-pounders and the Priests land.' } });
brit(crew, { variant: { name: 'Tank Crew', weapon: 'Thompson', text: CREW_TEXT } });
brit(tank, { model: buildBrCrusader, stats: { armor: 0.45, hp: 950, damage: 300, speed: 6.2, fireCooldown: 4.5 }, cost: 0.85,
  variant: { name: 'Crusader III', weapon: '6-pdr (57 mm)', text: 'The fast British cruiser tank: low and quick across the sand, the new 6-pounder at last a match for the Panzer III — thin armour, and an engine the desert wears out.' } });
brit(heavyTank, { model: buildBrGrant, stats: { armor: 0.6, hp: 1350, damage: 360, range: 190, fireCooldown: 6, speed: 4.8, traverse: 0.26 }, cost: 0.85,
  variant: { name: 'M3 Grant', weapon: '75 mm M2 in the sponson, 37 mm in the turret', text: 'The American tall tank with the 75 mm low in its side: the first British tank that could fire high explosive back at the anti-tank guns. It must turn its hull to bring the big gun round.' } });
brit(reconVehicle, { model: buildBrDaimler, stats: { weapon: 'cannon', damage: 140, vsArmor: 0.6, pierce: 0.4, splash: 1, fireCooldown: 2.4 }, cost: 0.9,
  variant: { name: 'Daimler Armoured Car', weapon: '2-pdr (40 mm)', text: 'The reconnaissance regiments’ armoured car: fast on the desert tracks, a small turret with the 2-pounder.' } });
brit(tankDestroyer, { model: buildBrDeacon, stats: { armor: 0.15, hp: 650, speed: 6.5, damage: 330, fireCooldown: 4.5 }, cost: 0.75,
  variant: { name: 'Deacon', weapon: '6-pdr on an AEC Matador', text: 'A 6-pounder behind a shield on the back of an armoured lorry: hit, and drive off before the answer comes. Soft-skinned underneath.' } });
brit(artillery, { model: buildBr25pdr, stats: { towed: { deploy: 14 }, traverse: 6.3 }, cost: 0.9,
  variant: { name: '25-pounder', weapon: 'Ordnance QF 25-pdr', text: 'The British field gun of the whole war, on its round platform that lets it swing all the way round: the Lightfoot barrage was nine hundred of them.' } });
brit(ifv, { model: buildBrCarrier, stats: { armor: 0.15, hp: 420, speed: 6.4, weapon: 'rifle', damage: 32, range: 120, gunRange: 120, vsArmor: 0.05 }, cost: 0.8,
  variant: { name: 'Universal Carrier', weapon: 'Bren gun', text: 'The little open tracked carrier: it brings a section and its Bren up under cover of the dust. U puts them down.' } });
brit(recovery, { model: buildBrScammell, variant: { name: 'Scammell Pioneer', weapon: 'crane, winch', text: 'The heavy recovery lorry: it gets knocked-out tanks moving again behind the line.' } });
brit(towedAA, { model: buildBrBofors, variant: { name: 'Bofors 40 mm', weapon: '40 mm Bofors', text: 'The light AA gun of every British army on its own four-wheeled carriage, the outriggers out and no shield: clips of heavy shells against the Stukas, laid by the "Stiffkey stick" sight.' } });
brit(ambulance, { model: buildBrAustinAmb, variant: { name: 'Austin K2 Ambulance', weapon: 'unarmed', text: 'The “Katy”: the field ambulance of the desert — patches up the wounded nearby.' } });
brit(commandPost, { model: buildBrDorchester, variant: { name: 'Dorchester Command Vehicle', weapon: 'wireless sets', text: 'The armoured command vehicle — “Dorchester” after the hotel: brigade headquarters on wheels. Nearby squads hold longer and react faster.' } });
brit(cev, { model: buildBrCrusaderCS, stats: { dozer: false, armor: 0.45, hp: 950, speed: 6.2, damage: 650, vsStructure: 1.8, splash: 4, fireCooldown: 5 }, cost: 0.75,
  variant: { name: 'Crusader II CS', weapon: '3-inch howitzer', text: 'The close-support Crusader in the squadron headquarters: a short howitzer in place of the gun, for high explosive onto the anti-tank screen and smoke to cover the squadron. Stops to fire.' } });
brit(spMortar, { model: buildBrBishop, stats: { armor: 0.4, hp: 900, speed: 3.4, damage: 230, splash: 6, range: 270, fireCooldown: 4, muzzleKind: 'artillery', traverse: 0.07 }, cost: 1.0,
  variant: { name: 'Bishop', weapon: 'Ordnance QF 25-pdr', text: 'A 25-pounder in a tall steel box on a Valentine, rushed out for Second Alamein: slow and clumsy, but a field gun that keeps up with the infantry. It turns its hull to lay the gun.' } });
brit(cbRadar, { variant: { name: 'Sound Ranging Troop', weapon: 'microphones, plotting board', text: 'The Royal Artillery’s survey gunners: a line of microphones across the desert times every enemy gun’s bang, and the gun is plotted for the 25-pounders. Needs 25 s to lay out.' } });
brit(sam, { model: buildBr37AA, variant: { name: '3.7-inch AA Gun', weapon: 'QF 3.7-inch AA', text: 'The heavy AA gun of the base areas and the ports, brought up to cover the Alamein line: it reaches far up — and its shells go through a tank too.' } });
brit(manpads, { variant: { name: 'AA Bren Team', weapon: 'Bren gun on its AA tripod', text: 'The section’s Bren on its tall anti-aircraft tripod: every company had them up against the Stukas and the strafing 109s.' } });
brit(airRadar, { model: buildBrGL, variant: { name: 'GL Mk II', weapon: 'unarmed', text: 'The gun-laying radar with the heavy AA, its aerials turning on the cabin roof: it finds the raiders and puts the 3.7s onto them.' } });
brit(gunMissile, { model: buildBrBoforsPortee, stats: { armor: 0.05, hp: 400 }, cost: 0.8,
  variant: { name: 'Bofors Portée', weapon: '40 mm Bofors', text: 'The Bofors carried on a lorry bed and fired from it: no unhitching, it keeps up with the column across the desert. Unarmoured.' } });
brit(mineClear, { model: buildBrScorpion, stats: { armor: 0.72, hp: 1300, speed: 2.6, damage: 180, range: 160, fireCooldown: 3 }, cost: 0.85,
  variant: { name: 'Matilda Scorpion', weapon: 'flail, 2-pdr', text: 'An old Matilda with chains on a spinning drum out in front: on the first night of Alamein the Scorpions beat lanes through the Devil’s Gardens — slowly, in their own dust.' } });
brit(aa, { model: buildBrCrusaderAA, stats: { armor: 0.45, hp: 950, speed: 6.2, antiAir: { ...aa.stats.antiAir, range: 300, rate: 2.2, burst: 3, pause: 1, hitNear: 0.14, hitFar: 0.04 } }, cost: 1.0,
  variant: { name: 'Crusader AA Mk I', weapon: '40 mm Bofors', text: 'A Crusader the desert had worn out, its turret off and a Bofors in a tall open-topped box in its place: built in 1943 for the armoured regiments, it brings the light AA gun along with the tanks. Slow clips of heavy shells — one hit brings a Stuka down.' } });
brit(bridgeLayer, { model: buildBrValentineBridge, stats: { armor: 0.6, hp: 1150, speed: 3.6 },
  variant: { name: 'Valentine Bridgelayer', weapon: '30 ft scissors bridge', text: 'A Valentine with no turret and a scissors bridge folded on its back: it swings the bridge up over its nose and unfolds it across the anti-tank ditch or the wadi, then backs off — the tanks cross under fire.' } });
// (nothing in the other slots: no airborne at Alamein — the SAS raided by lorry and jeep after its one parachute drop failed in 1941;
//  no rocket launchers, and the smoke came from the 25-pounders’ and the mortars’ smoke shells)

export const TYPES_1945 = {
  rifles, atTeam, mgTeam, mortar, tank, ddTank, ifv, crew, airAssault, heavyTank, reconVehicle, tankDestroyer, cev,
  artillery, rockets, spMortar, observers, cbRadar,
  aa, towedAA, sam, manpads, airRadar, gunMissile,
  scouts, sniper, engineers,
  ambulance, recovery, bridgeLayer, mineClear, commandPost, jammer,
  ...lanesForts45(T),   // the fortifications are of every war (Japan's own: ./atlanticWall.js)
  ...SHIPS_1945,   // the open-sea maps' warships (./ships.js)
  ...ATLANTIC_WALL, // the coastal maps' fixed defences (./atlanticWall.js)
  ...SOV_CRAFT_1945, // the Black Sea Fleet's landing craft (./sovietCraft.js: Novorossiysk)
};

/** What stands in for the types phase 1 doesn't have yet (ponytail: they get their own in phase 2). */
brit21(TYPES_1945); // the 21st Army Group's roster (./brit21.js)
brit14(TYPES_1945); // the 14th Army's (./brit14.js)

export const ALIAS_1945 = {
  kampfgruppe: 'rifles',
};
