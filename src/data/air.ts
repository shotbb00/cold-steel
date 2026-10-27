// Attack helicopters called in for strafing runs (systems/AirStrike.js), one per side. Add a
// type here (model in data/models/, weapons, sounds) to give a side a different machine.
//   gun     – chin gun: rounds per second, damage, splash, armour effect, tracer share
//   rockets – salvo size, damage, blast radius, armour effect
//   hp      – how many hits from ground fire it takes (each hit is 1)
import { buildNatoCobra } from './models/natoCobra.js';
import { buildPactHind } from './models/pactHind.js';
import { buildNatoA10, buildPactSu25, buildNatoUH60, buildPactMi8 } from './models/aircraft.js';
import { MERDC } from '../render/paint.js';
import type { Aircraft, PerFaction } from '../types.ts';

export const AIRCRAFT = {
  nato: {
    name: 'AH-1S Cobra',
    weapon: '20 mm M197 · 2.75 in rockets',
    text: 'The attack helicopter: a rocket salvo on the approach, then the chin gun walked along the strafe line. Flak and missiles are its enemies.',
    model: buildNatoCobra,
    paint: { colors: MERDC as [number, number, number, number], scale: 0.7 }, // render/paint.js: the four MERDC colours
    rotorSound: 'rotor.cobra',
    rotorSpeed: 30,      // rad/s (two blades: the deep "whop")
    gun: { rate: 11, damage: 140, splash: 1.6, vsArmor: 0.35, pierce: 0.3, speed: 620, tracer: 0.4, size: 0.9, sound: 'heli.m197' },
    rockets: { count: 14, interval: 0.16, damage: 240, splash: 3.6, vsArmor: 0.7, pierce: 0.45, speed: 240 },
    hp: 8,
  },
  pact: {
    name: 'Mi-24 Hind',
    weapon: '12.7 mm Yak-B · S-5 rockets',
    text: 'The "flying tank": armoured tub, a heavy rocket salvo and the four-barrel nose gun. Takes more hits than the Cobra before it goes down.',
    model: buildPactHind,
    paint: { colors: [0x4f5a36, 0x8a7a55, 0x3c4529, 0x9a8a60], scale: 0.6 }, // green and sand
    rotorSound: 'rotor.hind',
    rotorSpeed: 22,
    gun: { rate: 14, damage: 115, splash: 0.6, vsArmor: 0.18, pierce: 0.2, speed: 640, tracer: 0.4, size: 0.8, sound: 'heli.yakb' },
    rockets: { count: 20, interval: 0.11, damage: 200, splash: 3.2, vsArmor: 0.6, pierce: 0.35, speed: 230 },
    hp: 11,              // the "flying tank": armoured cockpit and tub
  },
} satisfies PerFaction<Aircraft>;

// Ground-attack jets for the gun run (the second support power, J): fast and low along the
// line, one long gun burst walked through the target plus a few rockets / missiles, then gone.
// Missile air defence (data/units/manpads.js, sam.js) can catch them; flak hardly can.

export const JETS = {
  nato: {
    name: 'A-10A Thunderbolt',
    weapon: '30 mm GAU-8 Avenger · AGM-65 Maverick',
    text: 'Two Mavericks at the nearest vehicles, then one long burst of the GAU-8 walked through the target. Built around the gun and armoured like a tank.',
    model: buildNatoA10,
    paint: { colors: [0x4d5547, 0x3a4038, 0x5c6455, 0x454d40], scale: 0.8 },
    engineSound: 'jet',
    gun: { rate: 32, damage: 230, splash: 1.8, vsArmor: 0.9, pierce: 0.6, speed: 900, tracer: 0.3, size: 1, sound: 'jet.gau8' },
    rockets: { count: 2, interval: 0.6, damage: 700, splash: 3, vsArmor: 1, pierce: 0.8, speed: 260, sound: 'jet.missile' }, // AGM-65 Mavericks
    hp: 9,               // the titanium bathtub
  },
  pact: {
    name: 'Su-25 Grach',
    weapon: '30 mm GSh-30-2 · S-8 rockets',
    text: 'The "Rook": a ripple of sixteen S-8 rockets, then the twin-barrel cannon. Fast and low — flak barely tracks it.',
    model: buildPactSu25,
    paint: { colors: [0x55603c, 0x8a7a55, 0x3f4a2c, 0x9a8a60], scale: 0.65 },
    engineSound: 'jet',
    gun: { rate: 26, damage: 190, splash: 1.5, vsArmor: 0.6, pierce: 0.45, speed: 880, tracer: 0.35, size: 0.95, sound: 'jet.gsh30' },
    rockets: { count: 16, interval: 0.06, damage: 220, splash: 3.6, vsArmor: 0.6, pierce: 0.35, speed: 300, sound: 'heli.rocket' }, // S-8 salvo
    hp: 8,
  },
} satisfies PerFaction<Aircraft>;

// Air assault (P): a transport helicopter flies a squad in, lands it on the spot, and leaves.
// Shot down before it touches down, the squad goes with it.
export const LIFT = {
  nato: {
    name: 'UH-60A Black Hawk',
    weapon: '2 × M60 door guns · 8 men',
    text: 'Flies an air assault squad wherever you point, door gunners on anyone near the landing zone. Shot down before it lands, the squad goes with it.',
    model: buildNatoUH60,
    paint: { colors: [0x3c4530, 0x2f3626, 0x46503a, 0x353d2b], scale: 0.7 },
    rotorSound: 'rotor.uh60',
    rotorSpeed: 26,
    gun: { rate: 9, damage: 95, splash: 0, vsArmor: 0.05, pierce: 0, speed: 600, tracer: 0.5, size: 0.7, sound: 'nato.mg' }, // M60 door guns
    squad: 'airAssault',
    hp: 6,
  },
  pact: {
    name: 'Mi-8 Hip',
    weapon: 'Nose PK · UB-32 rockets · 8 men',
    text: 'The workhorse: rockets on the landing zone, then the VDV section out of the clamshell doors. Big, tough and loud.',
    model: buildPactMi8,
    paint: { colors: [0x4f5a36, 0x8a7a55, 0x3c4529, 0x9a8a60], scale: 0.6 },
    rotorSound: 'rotor.mi8',
    rotorSpeed: 20,
    gun: { rate: 10, damage: 95, splash: 0, vsArmor: 0.05, pierce: 0, speed: 600, tracer: 0.5, size: 0.7, sound: 'pact.mg' },
    rockets: { count: 8, interval: 0.15, damage: 200, splash: 3.2, vsArmor: 0.6, pierce: 0.35, speed: 230, sound: 'heli.rocket' }, // prep the LZ
    squad: 'airAssault',
    hp: 8,
  },
} satisfies PerFaction<Aircraft>;
