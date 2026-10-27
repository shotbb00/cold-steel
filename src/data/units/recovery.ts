// Armoured recovery vehicle — NATO M88, Pact BREM-1. Parks next to damaged friendly vehicles
// and repairs them (`repair`: hit points back a few tens a second; tracks blown by mines
// mended after a few seconds' work). On its own it drives to the nearest damaged vehicle close
// by (systems/Support.js). Built on a tank hull: tough, but armed only with a machine gun.
import { buildNatoM88, buildPactBREM } from '../models/support.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'recovery',
  name: 'Recovery Vehicle',
  shortName: 'Recovery',
  category: 'support', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 200,

  formation: { count: 1, columns: 1, spacing: 10 },

  stats: {
    hp: 1150,
    armor: 0.6,
    speed: 5,
    turnRate: 0.9,
    turretRate: 1.4,
    radius: 2.2,
    height: 2.8,
    aimHeight: 1.4,
    eyeHeight: 2.6,
    sight: 70,
    fov: 2,
    range: 110,
    aggroRange: 0,
    preferredRange: 60,
    leash: 14,
    weapon: 'rifle',
    weaponSound: 'mg',
    fireCooldown: 0.14,
    burst: 1,
    burstInterval: 0,
    damage: 85,
    pierce: 0.05,
    vsArmor: 0.08,
    boltSpeed: 450,
    boltSize: 0.7,
    tracer: 0.35,
    spread: 0.02,
    magSize: 25,
    reloadTime: 4,
    breakMorale: 0,
    playerFireInterval: 0.14,
    smoke: { charges: 1 },
    repair: { range: 15, rate: 30, mend: 6, seek: 150 },  // m, hp/s, seconds to mend tracks, m it looks for work
    crew: 3,
    bailChance: 0.7,
  },

  camera: { distance: 13, height: 5.5, shoulder: 2.4 },
  models: { nato: buildNatoM88, pact: buildPactBREM },
  weaponSound: 'mg',
  engine: 'engine.diesel',
  tracks: 'tracks.heavy',
  variants: {
    nato: { name: 'M88 Recovery Vehicle', weapon: '.50 cal M2, A-frame boom, winch', text: 'Brings damaged tanks back into the fight: park it alongside and the hit points come back; mine-blown tracks are mended in seconds. Left alone it goes looking for work nearby.' },
    pact: { name: 'BREM-1', weapon: 'PKT, crane, dozer blade', text: 'A T-72 hull with a crane: repairs damaged vehicles alongside and gets immobilised ones moving again. Tough, but not a fighter.' },
  },
} satisfies UnitType;
