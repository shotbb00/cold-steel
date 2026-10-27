// SAM vehicles, pairs — NATO M48 Chaparral (Sidewinder derivative on an M730), Pact 9K35
// Strela-10 (on an MT-LB). Missiles at any enemy aircraft within 600 m: four on the rails,
// reloaded from inside. No gun at all — they need the line in front of them.
import { buildNatoChaparral, buildPactStrela } from '../models/support.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'sam',
  name: 'SAM Vehicles',
  shortName: 'SAM',
  category: 'airdefence', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 330,

  formation: { count: 2, columns: 2, spacing: 14 },

  stats: {
    hp: 480,
    armor: 0.22,
    speed: 5.6,
    turnRate: 1.1,
    turretRate: 2.2,
    radius: 1.8,
    height: 2.8,
    aimHeight: 1.3,
    eyeHeight: 2.6,
    sight: 70,
    fov: 2.4,
    range: 1,             // no ground weapon
    aggroRange: 0,
    preferredRange: 150,
    leash: 14,
    weapon: 'rifle',
    fireCooldown: 99,
    burst: 1,
    burstInterval: 0,
    damage: 0,
    boltSpeed: 1,
    boltSize: 0,
    spread: 0,
    magSize: 1,
    reloadTime: 99,
    breakMorale: 0,
    crew: 3,
    bailChance: 0.6,
    antiAir: { missile: true, range: 600, count: 4, reload: 16, pk: 0.62, hits: 6, speed: 300, sound: 'sam' },
  },

  camera: { distance: 11, height: 4.6, shoulder: 2 },
  models: { nato: buildNatoChaparral, pact: buildPactStrela },
  weaponSound: 'sam',
  engine: 'engine.dieselSmall',
  tracks: 'tracks.light',
  variants: {
    nato: { name: 'M48 Chaparral', weapon: '4 × MIM-72 missiles', text: 'Heat-seeking missiles out to 600 m: no helicopter or jet makes a run over its sector unchallenged. No gun — keep it behind the line.' },
    pact: { name: '9K35 Strela-10', weapon: '4 × 9M37 missiles', text: 'The regiment\'s missile umbrella on an MT-LB. Four ready rounds and more inside; helpless against anything on the ground.' },
  },
} satisfies UnitType;
