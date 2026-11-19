// 2027's support aircraft (data/epoch.js air → systems/AirStrike.js KINDS), keyed like the ground
// roster: `nato` US Army / USAF, `pl` Poland, `pact` Russia, `by` Belarus. Each flies the airframe of
// the 1985 tables nearest to it in shape (the A-10 and the Su-25 still serve; the Apache, Mi-28 and
// Mi-35 are tandem gunships like the Cobra and the Hind; the FA-50 a light jet like the Alpha Jet).
// The gunships carry anti-tank missiles in place of most of the rockets.
import { AIRCRAFT, JETS, FIGHTERS, RECON, LIFT } from './air.ts';
import { buildApache, buildMi28, buildF16, buildFA50, buildSu35, buildSu24 } from './models/aircraft2027.js';
import { AIR_2027_SEA } from './air27sea.js';
const flanker = { colors: [0x5f6f7a, 0x7a8a96, 0x4a5862, 0x6c7c88], scale: 1.2 };

const grey = { colors: [0x6e7479, 0x5f656a, 0x7a8085, 0x666c71], scale: 0.9 };
const ru = { colors: [0x5a6650, 0x6f7a62, 0x4c5744, 0x7c8670], scale: 0.7 };
const hellfire = { count: 4, interval: 0.7, damage: 800, splash: 2.2, vsArmor: 1, pierce: 0.85, speed: 300, sound: 'jet.missile' };
const ataka = { count: 4, interval: 0.8, damage: 760, splash: 2.2, vsArmor: 1, pierce: 0.82, speed: 280, sound: 'jet.missile' };


const heli = {
  nato: { ...AIRCRAFT.nato, model: buildApache, name: 'AH-64E Apache Guardian', weapon: '30 mm M230 · Hellfire', text: 'The gunship: a radar on the mast finds the tanks, four Hellfires go out one after another, then the 30 mm chain gun walked through the target. Air defence and drones-turned-hunters are its enemies.', rockets: hellfire, hp: 9 },
  pl: { ...AIRCRAFT.nato, model: buildApache, name: 'AH-64E Apache (Poland)', weapon: '30 mm M230 · Hellfire', text: 'Poland’s new Apaches: Hellfires for the armour, the chain gun for the rest.', rockets: hellfire, hp: 9 },
  pact: { ...AIRCRAFT.pact, model: buildMi28, name: 'Mi-28NM Havoc', weapon: '30 mm 2A42 · Ataka · S-8', text: 'The Night Hunter: an armoured gunship with a radar over its rotor, Ataka missiles for the tanks and a 30 mm cannon. Tough, and well armed.', rockets: ataka, paint: ru },
  by: { ...AIRCRAFT.pact, name: 'Mi-35M', weapon: '23 mm GSh-23V · Shturm · S-8', text: 'The modernised Hind of the Belarusian air force: a fixed twin cannon, missiles and rockets, and the armoured tub.' },
};

const jet = {
  nato: { ...JETS.nato, name: 'A-10C Thunderbolt II', weapon: '30 mm GAU-8 · AGM-65 Maverick', text: 'The Warthog’s last years: a pair of Mavericks at the nearest vehicles, then the GAU-8 walked through the target. Armoured like a tank — but a modern SAM is another matter.' },
  pl: { ...JETS.bw, model: buildFA50, name: 'FA-50PL', weapon: '20 mm · rockets', text: 'Poland’s light Korean fighter in the attack role: quick, small, a rocket ripple and a gun pass.', paint: grey },
  pact: { ...JETS.pact, name: 'Su-25SM3', weapon: '30 mm GSh-30-2 · S-8 rockets', text: 'The upgraded Rook: a new sight, an electronic self-protection suite, and the same ripple of rockets and twin cannon.' },
  by: { ...JETS.pact, name: 'Su-25', weapon: '30 mm GSh-30-2 · S-8 rockets', text: 'Belarus’s Rooks: rockets, then the twin cannon, low and fast.' },
};

const cap = {
  nato: { ...FIGHTERS.nato, name: 'F-15EX Eagle II', weapon: 'AIM-120 AMRAAM · AIM-9X', text: 'The new Eagle: a pair circles over the spot and shoots down anything that comes near — helicopters, jets, the bigger drones.' },
  pl: { ...FIGHTERS.nato, model: buildF16, paint: grey, name: 'F-16C Jastrząb', weapon: 'AIM-120 · AIM-9X', text: 'The Polish F-16s on air patrol over the brigade.' },
  pact: { ...FIGHTERS.pact, model: buildSu35, paint: flanker, name: 'Su-35S', weapon: 'R-77 · R-73', text: 'Russia’s air superiority fighter on patrol over the front.' },
  by: { ...FIGHTERS.pact, model: buildSu35, paint: flanker, name: 'Su-30SM2', weapon: 'R-77 · R-73', text: 'Belarus’s newest fighters on air patrol.' },
};

const recon = {
  nato: { ...RECON.nato, name: 'F-16C with recon pod', weapon: 'DB-110 pod', text: 'One fast, low run with a reconnaissance pod: what it photographs, your guns and drones can hit.', model: buildF16, paint: grey },
  pl: { ...RECON.nato, name: 'F-16C with DB-110', weapon: 'DB-110 pod', text: 'A Polish F-16 with the reconnaissance pod: one photo run along the line.', model: buildF16, paint: grey },
  pact: { ...RECON.pact, name: 'Su-24MR', weapon: 'recon pods', text: 'The swing-wing reconnaissance bomber: one fast photo run along the line.', model: buildSu24, paint: ru },
  by: { ...RECON.pact, name: 'Su-24MR', weapon: 'recon pods', text: 'A reconnaissance run along the line.', model: buildSu24, paint: ru },
};

const lift = {
  nato: { ...LIFT.nato, name: 'UH-60M Black Hawk', weapon: '2 × M240 door guns · 8 men', text: 'Flies an air assault squad wherever you point, door gunners on anyone near the landing zone. Drones and shoulder-fired missiles make every landing a gamble.' },
  pl: { ...LIFT.nato, name: 'S-70i Black Hawk', weapon: 'door guns · 8 men', text: 'Poland’s Black Hawks, built in Mielec: they fly the airmobile infantry forward.' },
  pact: { ...LIFT.pact, name: 'Mi-8AMTSh Terminator', weapon: 'PKT · S-8 rockets · 8 men', text: 'The armed assault Hip: rockets on the landing zone, then the VDV out of the doors.' },
  by: { ...LIFT.pact, name: 'Mi-8MTV-5', weapon: 'PKT · rockets · 8 men', text: 'The Belarusian Hip: rockets on the landing zone, then the squad.' },
};

export const AIR_2027 = { heli, jet, lift, cap, recon, ...AIR_2027_SEA }; // (at sea: ./air27sea.js)
