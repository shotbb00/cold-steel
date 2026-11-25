// The Black Sea Fleet's landing craft, 1943 (the coastal maps: Novorossiysk). Never bought, like the LCVP and
// the LCT (./ships.js): what the Red Army buys on a map whose `landing.craft` names these comes in one
// (systems/Landing.js launch). Models: models/sovietCraft45.js.
//   moBoat  the MO-4 "small hunter" patrol boat: a section of naval infantry over the bow, her two 45s and her
//           smoke covering the run in
//   tender  the little landing barge with a bow ramp: a vehicle, or a squad
import { lcvp, lct } from './ships.js';
import { buildMO4, buildTender } from '../models/sovietCraft45.js';

const G45 = { arc: 4.6, spread: 0.02, splash: 1.6, pierce: 0.2, shell: 760, size: 0.9, range: 450, reload: 2.2, damage: 70 }; // (21-K 45 mm)

export const moBoat = {
  ...lcvp,
  engine: 'engine.diesel',
  id: 'moBoat', name: 'Patrol Boat (MO-4)', shortName: 'MO boat',
  hull: { length: 26.9, beam: 3.9 },
  stats: { ...lcvp.stats, draft: 1.2, hp: 520, armor: 0.02, speed: 10, accel: 0.6, turnRate: 0.3, radius: 2.6, height: 3.4, eyeHeight: 4, sight: 600, stealth: 0.5,
    range: 450, aggroRange: 450, damage: 70, fireCooldown: 2.2, splash: 1.6, pierce: 0.2, boltSpeed: 760, boltSize: 0.9, smokeGen: { last: 50, cooldown: 120 } },
  mounts: { nato: [{ ...G45, at: [0, 2.5, 7.3], facing: 0 }, { ...G45, at: [0, 2.5, -9.9], facing: Math.PI }], pact: [] },
  camera: { distance: 36, height: 11, shoulder: 0 },
  models: { nato: buildMO4, sov: buildMO4, pact: buildMO4 },
  variants: {
    nato: { name: 'MO-4 patrol boat', weapon: '2 × 45 mm 21-K, 2 × DShK', text: 'The Black Sea Fleet’s wooden “small hunter”: a section of naval infantry crammed on deck, in under the guns at night, its men over the bow into the icy surf. Her two 45s and her smoke cover the run in.' },
    sov: { name: 'MO-4 patrol boat', weapon: '2 × 45 mm 21-K, 2 × DShK', text: 'The Black Sea Fleet’s wooden “small hunter”: a section of naval infantry crammed on deck, in under the guns at night, its men over the bow into the icy surf. Her two 45s and her smoke cover the run in.' },
    pact: { name: 'Patrol boat', weapon: '45 mm', text: 'A small patrol boat.' },
  },
};

export const tender = {
  ...lct,
  engine: 'engine.dieselSmall',
  id: 'tender', name: 'Landing Tender', shortName: 'Tender',
  hull: { length: 15, beam: 4.2 },
  stats: { ...lct.stats, draft: 1.0, hp: 600, armor: 0.04, speed: 6, accel: 0.5, turnRate: 0.25, radius: 3, height: 2.4, eyeHeight: 3, sight: 400 },
  camera: { distance: 34, height: 11, shoulder: 0 },
  models: { nato: buildTender, sov: buildTender, pact: buildTender },
  variants: {
    nato: { name: 'Landing tender', weapon: '—', text: 'A small steel barge with an engine and a bow ramp, built in 1942 for the Black Sea Fleet’s landings: one tank or gun, or a platoon, onto the shingle.' },
    sov: { name: 'Landing tender', weapon: '—', text: 'A small steel barge with an engine and a bow ramp, built in 1942 for the Black Sea Fleet’s landings: one tank or gun, or a platoon, onto the shingle.' },
    pact: { name: 'Landing barge', weapon: '—', text: 'A small landing barge.' },
  },
};

export const SOV_CRAFT_1945 = { moBoat, tender };
