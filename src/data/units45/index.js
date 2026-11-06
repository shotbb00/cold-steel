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
import { buildUsPershing, buildSovIS2, buildWhPanther, buildFjTiger, buildUsM8, buildSovBA64, buildWhPuma, buildFjKettenkrad, buildUsHellcat, buildSovSU100, buildWhJagdpanzerIV, buildFjHetzer, buildUsM4Dozer, buildSovISU152, buildWhBrummbaer, buildFjSturmtiger } from '../models/ww2Armour2.js';

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
    sov: { noStabilizer: true, armor: 0.55, damage: 360, speed: 5.6, carries: { unit: 'rifles', count: 8 } }, // (Tank riders: data/epoch.js)      // T-34-85: fast, sloped armour (everything the US entry sets: stats layer side, then army)
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

// (factionStats layer side, then army: `sov` sets every key `nato` sets, `fj` every key `pact` sets)
const heavyTank = derive(T.heavyTank, {
  name: 'Heavy Tanks', shortName: 'Heavy tanks',
  stats: { nightSight: undefined, noStabilizer: true, smoke: { charges: 1 }, armor: 0.78, hp: 1650, damage: 450, range: 210 },
  factionStats: {
    nato: { armor: 0.7, damage: 430, fireCooldown: 5.6, speed: 5.4 },                // M26: the 90 mm, quick for a heavy
    sov: { armor: 0.74, damage: 540, fireCooldown: 9, speed: 4.8 },                  // IS-2: the 122 mm, two-piece rounds: slow to load
    pact: { armor: 0.8, damage: 470, speed: 5.2 },                                    // Panther: the long 7.5 cm, the sloped front
    fj: { armor: 0.8, damage: 480, speed: 4.2 },                                      // Tiger I: thick, slow, the 8.8
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
    nato: { armor: 0.25, hp: 700, speed: 7.5, turretRate: 1.0 },          // M18: thin and the fastest thing on tracks
    sov: { armor: 0.55, hp: 950, speed: 5.6, turretRate: 0.6 },           // SU-100: the gun in the hull
    pact: { armor: 0.6, hp: 950, speed: 5.0, damage: 480 },               // Jagdpanzer IV/70: low, the long gun
    fj: { armor: 0.55, hp: 800, speed: 5.2, damage: 420 },                // Hetzer: small, low, hard to spot
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
    nato: { dozer: true, damage: 900, vsStructure: 2 },                                    // M4 dozer: the blade, the 75 mm
    sov: { dozer: false, damage: 1700, vsStructure: 2.6, splash: 7.5, fireCooldown: 16 },  // ISU-152: the "beast killer"
    pact: { dozer: false, damage: 1500 },                                                   // Brummbär: the 15 cm
    fj: { dozer: false, damage: 2600, splash: 10, fireCooldown: 26, range: 160 },           // Sturmtiger: a 38 cm rocket
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
  factionStats: { sov: { towed: { deploy: 18 } }, fj: { towed: { deploy: 16 } } },   // the towed guns: unhitched and laid before they fire
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
    nato: { armor: 0.5, hp: 1000, magSize: 12 },                                                         // Calliope: on a Sherman
    sov: { armor: 0.05, hp: 400, magSize: 16, damage: 100, splash: 5, fireCooldown: 0.2, scatter: 14 },  // Katyusha: sixteen rails, a lorry
    pact: { magSize: 10, damage: 130, fireCooldown: 0.6 },                                               // Panzerwerfer 42: ten tubes
    fj: { magSize: 6, damage: 140, fireCooldown: 0.7, towed: { deploy: 12 }, armor: 0, hp: 250 },        // Nebelwerfer 41: six, towed
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
    ignite: 0.6, vsArmor: 0.15, aimTime: 0.3, playerFireInterval: 0.07, weaponSound: 'mg',
  } },
  specialistModels: men({ weapon: 'flame', engineer: true }),
  variants: {
    nato: { name: 'Combat Engineers', weapon: 'M1 Garand, M2-2 flamethrower, demolition charges', text: 'They dig, wire and clear mines three times as fast — and the flamethrower burns out bunkers and houses.' },
    sov: { name: 'Assault Sappers', weapon: 'PPSh-41, ROKS-3 flamethrower, steel breastplates', text: 'The assault engineer brigades in their steel breastplates: first into the enemy’s strongpoints, with fire and explosives.' },
    pact: { name: 'Pioniere', weapon: 'Kar98k, Flammenwerfer 41, charges', text: 'German combat engineers: mines, wire, demolitions, and the flamethrower for the bunker fight.' },
    fj: { name: 'Fallschirm-Pioniere', weapon: 'MP 40, Flammenwerfer 41, charges', text: 'The paratroop engineers: blow it, burn it, hold it.' },
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

export const TYPES_1945 = {
  rifles, atTeam, mgTeam, mortar, tank, ifv, crew, airAssault, heavyTank, reconVehicle, tankDestroyer, cev,
  artillery, rockets, spMortar, observers, cbRadar,
  aa, towedAA, sam, manpads, airRadar, gunMissile,
  scouts, sniper, engineers,
  bunker: T.bunker, strongpoint: T.strongpoint, hq: T.hq,   // the fortifications are of every war
};

/** What stands in for the types phase 1 doesn't have yet (ponytail: they get their own in phase 2). */
export const ALIAS_1945 = {
  kampfgruppe: 'rifles',
  commandPost: 'ifv', ambulance: 'ifv', recovery: 'ifv',
};
