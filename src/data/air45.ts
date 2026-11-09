// 1945 air support (data/epoch.js swaps these into systems/AirStrike.js KINDS): per kind, each
// army's own aircraft — `nato` the US Army's, `sov` the Red Army's, `pact` the Wehrmacht's, `fj`
// the Fallschirmjäger's. Phase 1: the strike run ('jet') and the fighter patrol ('cap'); no
// helicopters in this war, the paradrop and the recon flight come later.
import { buildUsP47, buildUsP51, buildSovIl2, buildSovYak3, buildWhFw190F, buildWhFw190D, buildFjJu87, buildFjBf109, buildUsC47, buildSovLi2, buildDeJu52, buildUsF5, buildSovPe2, buildFjAr234, buildUsHellcat, buildUsHelldiver, buildUsAvenger, buildJpZero, buildJpVal, buildJpJill } from './models/ww2Aircraft.js';
import type { Aircraft } from '../types.ts';

const MG50 = { rate: 26, damage: 120, splash: 0.6, vsArmor: 0.3, pierce: 0.25, speed: 880, tracer: 0.3, size: 0.8, sound: 'nato.aa' };   // eight .50 cals
const CANNON = { rate: 14, damage: 190, splash: 1.4, vsArmor: 0.5, pierce: 0.35, speed: 860, tracer: 0.35, size: 0.95, sound: 'jet.gsh30' };
const OD = { colors: [0x4d4f34, 0x45472e, 0x55573a, 0x4a4c32] as [number, number, number, number], scale: 0.8 };
const SOVG = { colors: [0x4f5a34, 0x2a2c22, 0x56603a, 0x3a4428] as [number, number, number, number], scale: 0.6 };
const RLM = { colors: [0x5a6248, 0x434a36, 0x6a7058, 0x4e5540] as [number, number, number, number], scale: 0.6 };
const GREY = { colors: [0x7a8078, 0x6a7068, 0x8a9088, 0x5f655c] as [number, number, number, number], scale: 0.7 };
const SILVER = { colors: [0xb4b7b6, 0xa9acab, 0xbfc2c1, 0xa2a5a4] as [number, number, number, number], scale: 1.2 };

const STRIKE: Record<string, Aircraft> = {
  nato: { name: 'P-47D Thunderbolt', weapon: '8 × .50 cal · HVAR rockets', text: 'The Jug: rockets into the target, then eight heavy machine guns walked through it. Tough enough to come home with holes in it.',
    model: buildUsP47, paint: OD, engineSound: 'prop', gun: MG50, rockets: { count: 6, interval: 0.25, damage: 420, splash: 3.2, vsArmor: 0.8, pierce: 0.55, speed: 260, sound: 'heli.rocket' }, hp: 8 },
  sov: { name: 'Il-2 Shturmovik', weapon: '23 mm VYa · RS-82 rockets', text: 'The flying tank: an armoured bathtub round the engine and crew, rockets and cannon low over the enemy.',
    model: buildSovIl2, paint: SOVG, engineSound: 'prop', gun: CANNON, rockets: { count: 8, interval: 0.15, damage: 260, splash: 3, vsArmor: 0.5, pierce: 0.3, speed: 240, sound: 'heli.rocket' }, hp: 10 },
  pact: { name: 'Fw 190 F-8', weapon: '2 × 20 mm MG 151 · SC 250 bomb', text: 'The Focke-Wulf as a fighter-bomber: one 250 kg bomb on the target, then the cannon.',
    model: buildWhFw190F, paint: RLM, engineSound: 'prop', gun: CANNON, rockets: { count: 1, interval: 0.1, damage: 1100, splash: 7, vsArmor: 0.9, pierce: 0.5, speed: 160, sound: 'heli.rocket' }, hp: 7 },
  fj: { name: 'Ju 87 G Stuka', weapon: '2 × 3.7 cm BK 3,7', text: 'The tank-buster Stuka: two 37 mm guns under the wings, slow and deadly to armour — and to itself when fighters are about.',
    model: buildFjJu87, paint: RLM, engineSound: 'prop', siren: 'stuka.siren', gun: { rate: 3, damage: 520, splash: 1.5, vsArmor: 1, pierce: 0.7, speed: 850, tracer: 0.6, size: 1.2, sound: 'pact.cannon' }, hp: 6 },
};
const FIGHTER: Record<string, Aircraft> = {
  nato: { name: 'P-51D Mustang', weapon: '6 × .50 cal', text: 'Long-range escort fighter: a pair circles over the spot and shoots down what comes near.', model: buildUsP51, paint: SILVER, engineSound: 'prop', gun: MG50, hp: 6, guns: true },
  sov: { name: 'Yak-3', weapon: '20 mm ShVAK · 2 × 12.7 mm', text: 'Small, light and nimble at low level, where the Red Air Force fought.', model: buildSovYak3, paint: GREY, engineSound: 'prop', gun: CANNON, hp: 5, guns: true },
  pact: { name: 'Fw 190 D-9', weapon: '2 × 20 mm · 2 × 13 mm', text: 'The long-nosed Dora: the Luftwaffe’s best piston fighter of the last winter.', model: buildWhFw190D, paint: GREY, engineSound: 'prop', gun: CANNON, hp: 6, guns: true },
  fj: { name: 'Bf 109 G-10', weapon: '30 mm MK 108 · 2 × 13 mm', text: 'The old Messerschmitt, still in the fight in its last versions.', model: buildFjBf109, paint: GREY, engineSound: 'prop', gun: CANNON, hp: 5, guns: true },
};

// the paradrop (KINDS.lift; systems/AirStrike.js Sortie.paradrop): the transport flies over the
// drop zone and the stick jumps; the men land under their canopies and form up as a squad
const NOGUN = { rate: 1, damage: 0, splash: 0, vsArmor: 0, pierce: 0, speed: 600, tracer: 0, size: 0.5, sound: 'nato.mg' };
const DROP: Record<string, Aircraft> = {
  nato: { name: 'C-47 Skytrain', weapon: 'a stick of paratroopers', text: 'The Dakota: over the drop zone at a few hundred feet, the green light, and the stick is out of the door.',
    model: buildUsC47, paint: OD, engineSound: 'prop', gun: NOGUN, squad: 'airAssault', paradrop: true, hp: 7 },
  sov: { name: 'Li-2', weapon: 'a stick of Guards paratroopers', text: 'The Soviet-built DC-3, carrying a stick of the Guards airborne.',
    model: buildSovLi2, paint: SOVG, engineSound: 'prop', gun: NOGUN, squad: 'airAssault', paradrop: true, hp: 7 },
  pact: { name: 'Ju 52/3m', weapon: 'a stick of Fallschirmjäger', text: 'Tante Ju: three engines, corrugated metal, and the Fallschirmjäger jumping from the door.',
    model: buildDeJu52, paint: RLM, engineSound: 'prop', gun: NOGUN, squad: 'airAssault', paradrop: true, hp: 7 },
};

// the recon flight (KINDS.recon): one fast photo run along the line (AirStrike.photograph)
const RECON: Record<string, Aircraft> = {
  nato: { name: 'F-5 Lightning', weapon: 'cameras', text: 'The photo-reconnaissance P-38: one fast run, and the film shows where they are.', model: buildUsF5, paint: { colors: [0x6f7a86, 0x65707c, 0x79848f, 0x6a7580] as [number, number, number, number], scale: 1.2 }, engineSound: 'prop', gun: NOGUN, hp: 6 },
  sov: { name: 'Pe-2R', weapon: 'cameras', text: 'The Pe-2 dive bomber with cameras in the bomb bay: fast enough to come home with the pictures.', model: buildSovPe2, paint: GREY, engineSound: 'prop', gun: NOGUN, hp: 7 },
  pact: { name: 'Bf 109 G-8', weapon: 'cameras', text: 'The Messerschmitt with a camera behind the cockpit: a quick look over the Allied line.', model: buildFjBf109, paint: GREY, engineSound: 'prop', gun: NOGUN, hp: 5 },
  fj: { name: 'Ar 234 B Blitz', weapon: 'cameras', text: 'The jet reconnaissance bomber: too fast for any Allied fighter to catch on its run.', model: buildFjAr234, paint: GREY, engineSound: 'jet', gun: NOGUN, hp: 6 },
};

// the Pacific (the open-sea maps): what the carriers launch — `nato` the US Navy's, `pact` the Imperial Navy's
const SEA_BLUE = { colors: [0x2e3d52, 0x2a384c, 0x334459, 0x283548] as [number, number, number, number], scale: 0.8 };
const IJN_GREEN = { colors: [0x3c4a34, 0x36432f, 0x43523a, 0x323e2c] as [number, number, number, number], scale: 0.8 };
const BOMB = { interval: 0.1, splash: 7, vsArmor: 1, pierce: 0.6, speed: 170, sound: 'heli.rocket' };
const NAV_FIGHTER: Record<string, Aircraft> = {
  nato: { name: 'F6F Hellcat', weapon: '6 × .50 cal', text: 'The Navy’s workhorse fighter: rugged and fast, it cleared the Pacific sky.', model: buildUsHellcat, paint: SEA_BLUE, engineSound: 'prop', gun: MG50, hp: 7, guns: true },
  pact: { name: 'A6M Zero', weapon: '2 × 20 mm · 2 × 7.7 mm', text: 'The Zero: nimble and long-ranged, but no armour and no self-sealing tanks.', model: buildJpZero, paint: IJN_GREEN, engineSound: 'prop', gun: CANNON, hp: 4, guns: true },
};
const DIVE: Record<string, Aircraft> = {
  nato: { name: 'SB2C Helldiver', weapon: '1,000 lb bomb', text: 'The dive bomber: down at seventy degrees, the bomb onto the deck, out low over the water.', model: buildUsHelldiver, paint: SEA_BLUE, engineSound: 'prop', gun: MG50, rockets: { count: 1, damage: 1700, ...BOMB }, hp: 7 },
  pact: { name: 'D3A Val', weapon: '250 kg bomb', text: 'The fixed-gear dive bomber that sank more Allied warships than any other aircraft.', model: buildJpVal, paint: IJN_GREEN, engineSound: 'prop', gun: CANNON, rockets: { count: 1, damage: 1300, ...BOMB }, hp: 5 },
};
const TORP: Record<string, Aircraft> = {
  nato: { name: 'TBM Avenger', weapon: 'Mark 13 aerial torpedo', text: 'The torpedo bomber: low and level at the ship, the fish dropped close in.', model: buildUsAvenger, paint: SEA_BLUE, engineSound: 'prop', gun: MG50, hp: 8, torpedo: { count: 1, speed: 18, range: 1300, damage: 2600 } },
  pact: { name: 'B6N Jill', weapon: 'Type 91 aerial torpedo', text: 'The Kate’s successor: faster, and the Type 91 torpedo ran true.', model: buildJpJill, paint: IJN_GREEN, engineSound: 'prop', gun: CANNON, hp: 6, torpedo: { count: 1, speed: 20, range: 1400, damage: 2600 } },
};
const NAV_SCOUT: Record<string, Aircraft> = {
  nato: { name: 'TBM Avenger (search)', weapon: 'radar and cameras', text: 'An Avenger flying search: a long leg out, and what it sees shows on the plot.', model: buildUsAvenger, paint: SEA_BLUE, engineSound: 'prop', gun: NOGUN, hp: 8 },
  pact: { name: 'B6N Jill (search)', weapon: 'cameras', text: 'A carrier attack plane flying search for the fleet.', model: buildJpJill, paint: IJN_GREEN, engineSound: 'prop', gun: NOGUN, hp: 6 },
};

/** Per support kind: the aircraft table (data/epoch.js), keyed by side (nato, pact) and army (sov, fj). */
export const AIR_1945 = { jet: STRIKE, cap: FIGHTER, lift: DROP, recon: RECON, navCap: NAV_FIGHTER, diveBomb: DIVE, torpBomb: TORP, navScout: NAV_SCOUT };
