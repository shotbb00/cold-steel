// Missile tank destroyers, pairs — NATO M901 ITV (twin TOW "hammerhead" on an M113), Pact 9P148
// (five Konkurs on a BRDM-2). Out to 360 m, a missile every ten seconds, each one able to kill
// a tank; a machine gun for infantry that comes too close. Paper armour: keep them back, hull
// down behind a crest, and let the tanks come to them.
import { buildNatoITV, buildPactKonkurs } from '../models/support.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'tankDestroyer',
  name: 'Missile Tank Destroyers',
  shortName: 'ATGM',
  category: 'armour', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 320,

  formation: { count: 2, columns: 2, spacing: 14 },

  stats: {
    nightSight: { nato: 0.9, pact: 0.6 },
    hp: 520,
    armor: 0.25,
    speed: 5.6,
    turnRate: 1.1,
    turretRate: 1.2,
    radius: 1.7,
    height: 2.6,
    aimHeight: 1.2,
    eyeHeight: 2.8,
    sight: 90,
    fov: 1.8,
    range: 360,          // the missile's reach…
    gunRange: 110,       // …the MG's
    aggroRange: 0,       // holds its position: the tanks come to it
    preferredRange: 280,
    leash: 12,
    weapon: 'rifle',
    weaponSound: 'mg',
    fireCooldown: 0.12,
    burst: 1,
    burstInterval: 0,
    damage: 70,
    pierce: 0,
    vsArmor: 0.03,
    boltSpeed: 420,
    boltSize: 0.6,
    tracer: 0.35,
    spread: 0.02,
    magSize: 30,
    reloadTime: 4,
    suppressPower: 1.8,
    breakMorale: 0,
    antiArmor: true,
    playerFireInterval: 0.12,
    atgm: { range: 360, damage: 720, pierce: 0.9, splash: 1.5, speed: 160, reload: 10, count: 10 },
    crew: 3,
    bailChance: 0.6,
  },

  camera: { distance: 11, height: 4.6, shoulder: 2 },
  models: { nato: buildNatoITV, pact: buildPactKonkurs },
  weaponSound: 'mg',
  engine: 'engine.dieselSmall',
  tracks: 'tracks.light',
  variants: {
    nato: { name: 'M901 ITV', weapon: 'Twin TOW launcher, 10 missiles', text: 'An M113 with the TOW hammerhead: a missile every ten seconds out to 360 m. Hide it behind a crest and every tank that shows itself is in trouble.' },
    pact: { name: '9P148 Konkurs', weapon: '5 × 9M113 Konkurs, 10 missiles', text: 'A BRDM-2 with a raised launcher of five Konkurs. Fast to set up, deadly at range — and dead to anything that shoots back.' },
  },
} satisfies UnitType;
