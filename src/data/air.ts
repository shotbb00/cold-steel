// Attack helicopters called in for strafing runs (systems/AirStrike.js), one per side. Add a
// type here (model in data/models/, weapons, sounds) to give a side a different machine.
//   gun     – chin gun: rounds per second, damage, splash, armour effect, tracer share
//   rockets – salvo size, damage, blast radius, armour effect
//   hp      – how many hits from ground fire it takes (each hit is 1)
import { buildNatoCobra } from './models/natoCobra.js';
import { buildPactHind, buildNvaHind } from './models/pactHind.js';
import { buildNatoA10, buildPactSu25, buildNatoUH60, buildPactMi8, buildNvaMi8 } from './models/aircraft.js';
import { buildBwPAH1, buildBwAlphaJet, buildBwUH1D, buildNvaSu22 } from './models/armyAircraft.js';
import { MERDC } from '../render/paint.js';
import { buildNatoF15, buildPactMiG23, buildBwF4F, buildBwRF4E, buildNatoRF4C, buildNvaMiG21, buildPactMiG25 } from './models/fighters.js';
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
  bw: {
    name: 'PAH-1',
    weapon: 'HOT anti-tank missiles',
    text: 'The Heeresflieger’s tank hunter: a BO-105 with six HOT missiles, fired one after another down the strafe line. No gun — every shot is a missile, deadly to armour, wasted on infantry.',
    model: buildBwPAH1,
    paint: { colors: [0x3b4a2c, 0x4d3c2a, 0x1c1c1a, 0x3b4a2c] as [number, number, number, number], scale: 0.6 },
    rotorSound: 'rotor.uh60',
    rotorSpeed: 32,
    gun: { rate: 0.9, damage: 900, splash: 2.2, vsArmor: 1, pierce: 0.8, speed: 260, tracer: 0, size: 1.2, sound: 'jet.missile' },
    hp: 6,
  },
  nva: {
    name: 'Mi-24D',
    weapon: '12.7 mm Yak-B · S-5 rockets · Falanga',
    text: 'The NVA’s Hind: the same armoured tub and rocket salvo as the Soviet machine, with the older Falanga rails at the wingtips.',
    model: buildNvaHind,
    paint: { colors: [0x4f5a36, 0x7a5d3c, 0x3c4529, 0x6b5a3a] as [number, number, number, number], scale: 0.6 },
    rotorSound: 'rotor.hind',
    rotorSpeed: 22,
    gun: { rate: 14, damage: 115, splash: 0.6, vsArmor: 0.18, pierce: 0.2, speed: 640, tracer: 0.4, size: 0.8, sound: 'heli.yakb' },
    rockets: { count: 20, interval: 0.11, damage: 200, splash: 3.2, vsArmor: 0.6, pierce: 0.35, speed: 230 },
    hp: 11,
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
  bw: {
    name: 'Alpha Jet A',
    weapon: '27 mm Mauser BK-27 · rockets',
    text: 'The Luftwaffe’s close-support jet: a rocket ripple, then the belly gun pod walked through the target. Small, quick and hard to track.',
    model: buildBwAlphaJet,
    paint: { colors: [0x4e5440, 0x5c6150, 0x3f4436, 0x60645a], scale: 0.7 },
    engineSound: 'jet',
    gun: { rate: 28, damage: 180, splash: 1.5, vsArmor: 0.55, pierce: 0.45, speed: 900, tracer: 0.35, size: 0.95, sound: 'jet.gsh30' },
    rockets: { count: 12, interval: 0.07, damage: 210, splash: 3.4, vsArmor: 0.55, pierce: 0.35, speed: 300, sound: 'heli.rocket' },
    hp: 6,
  },
  nva: {
    name: 'Su-22M4',
    weapon: '2 × 30 mm NR-30 · S-5 rockets',
    text: 'The NVA’s swing-wing fighter-bomber: wings swept back for the run, a heavy salvo from four UB-32 pods, then the two wing-root cannon.',
    model: buildNvaSu22,
    paint: { colors: [0x4f5a36, 0x7a5d3c, 0x3c4529, 0x6b5a3a] as [number, number, number, number], scale: 0.7 },
    engineSound: 'jet',
    gun: { rate: 18, damage: 200, splash: 1.6, vsArmor: 0.5, pierce: 0.4, speed: 900, tracer: 0.35, size: 0.95, sound: 'jet.gsh30' },
    rockets: { count: 24, interval: 0.05, damage: 190, splash: 3.2, vsArmor: 0.5, pierce: 0.3, speed: 300, sound: 'heli.rocket' },
    hp: 7,
  },
} satisfies PerFaction<Aircraft>;

// Fighter patrol (I) and recon flight (O), systems/AirStrike.js — each army's own aircraft
// (models/fighters.js). Their weapons are the patrol's missiles (KINDS.cap aam) and the recon
// cameras; `gun` / `rockets` stay as the type needs them but are never fired.
const air = (a: PerFaction<Aircraft>, k: keyof PerFaction<Aircraft>, o: Partial<Aircraft>): Aircraft => ({ ...a[k], ...o } as Aircraft);
export const FIGHTERS = {
  nato: air(JETS, 'nato', { name: 'F-15C Eagle', weapon: 'AIM-7 Sparrow · AIM-9 Sidewinder', text: 'Air superiority: a pair circles over the spot and shoots down what comes near.', model: buildNatoF15, paint: { colors: [0x7f878e, 0x6a7279, 0x8b9398, 0x737b82], scale: 1.2 } }),
  pact: air(JETS, 'pact', { name: 'MiG-23MLD', weapon: 'R-23 · R-60', text: 'The frontline fighter of the Soviet air armies in Germany, swing wings at 45° for the patrol.', model: buildPactMiG23, paint: { colors: [0x88908f, 0x6e7775, 0x9aa1a0, 0x7b8483], scale: 1.1 } }),
  bw: air(JETS, 'bw', { name: 'F-4F Phantom II', weapon: 'AIM-9 Sidewinder · M61 cannon', text: 'The Luftwaffe’s air defence fighter, Jagdgeschwader 71 to 74.', model: buildBwF4F, paint: { colors: [0x4e5440, 0x5c6150, 0x3f4436, 0x60645a], scale: 0.7 } }),
  nva: air(JETS, 'nva', { name: 'MiG-21bis', weapon: 'R-60 · R-13M · GSh-23', text: 'The LSK/LV’s fighter: small, fast to climb, short on fuel.', model: buildNvaMiG21, paint: { colors: [0x9fa4a3, 0x8f9493, 0xaeb2b1, 0x979c9b], scale: 1.4 } }),
} satisfies PerFaction<Aircraft>;
export const RECON = {
  nato: air(JETS, 'nato', { name: 'RF-4C Phantom II', weapon: 'KS-87 cameras', text: 'Tactical reconnaissance: one fast, low photo run, and the film shows where they are.', model: buildNatoRF4C, paint: { colors: [0x3f4a35, 0x4e5a44, 0x4a4e4a, 0x353d2e], scale: 0.7 } }),
  pact: air(JETS, 'pact', { name: 'MiG-25RB', weapon: 'A-70M cameras', text: 'The fastest thing in the sky: a photo run few can catch.', model: buildPactMiG25, paint: { colors: [0xa9aeac, 0x9da2a0, 0xb4b8b6, 0xa3a8a6], scale: 1.4 } }),
  bw: air(JETS, 'bw', { name: 'RF-4E Phantom II', weapon: 'camera nose', text: 'Aufklärungsgeschwader 51 and 52: the Phantom with the camera nose.', model: buildBwRF4E, paint: { colors: [0x4e5440, 0x5c6150, 0x3f4436, 0x60645a], scale: 0.7 } }),
  nva: air(JETS, 'nva', { name: 'Su-22M4R', text: 'The Su-22 with the reconnaissance pod: one low photo run along the line.', weapon: 'KKR-1 recon pod' }),
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
  bw: {
    name: 'UH-1D',
    weapon: 'MG3 door gun · 8 men',
    text: 'The Heer’s Huey: flies a section in wherever you point, the door gunner on anyone near the landing zone. Lighter than a Black Hawk, it takes fewer hits.',
    model: buildBwUH1D,
    paint: { colors: [0x3b4a2c, 0x4d3c2a, 0x1c1c1a, 0x3b4a2c] as [number, number, number, number], scale: 0.6 },
    rotorSound: 'rotor.cobra',
    rotorSpeed: 30,
    gun: { rate: 12, damage: 90, splash: 0, vsArmor: 0.05, pierce: 0, speed: 600, tracer: 0.5, size: 0.7, sound: 'nato.mg' },
    squad: 'airAssault',
    hp: 5,
  },
  nva: {
    name: 'Mi-8T',
    weapon: 'Nose PK · UB-16 rockets · 8 men',
    text: 'The NVA’s Hip: rockets on the landing zone, then the Fallschirmjäger out of the clamshell doors.',
    model: buildNvaMi8,
    paint: { colors: [0x4f5a36, 0x7a5d3c, 0x3c4529, 0x6b5a3a] as [number, number, number, number], scale: 0.6 },
    rotorSound: 'rotor.mi8',
    rotorSpeed: 20,
    gun: { rate: 10, damage: 95, splash: 0, vsArmor: 0.05, pierce: 0, speed: 600, tracer: 0.5, size: 0.7, sound: 'pact.mg' },
    rockets: { count: 6, interval: 0.15, damage: 200, splash: 3.2, vsArmor: 0.6, pierce: 0.35, speed: 230, sound: 'heli.rocket' },
    squad: 'airAssault',
    hp: 8,
  },
} satisfies PerFaction<Aircraft>;
