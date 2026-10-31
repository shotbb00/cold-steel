// Forward command posts — NATO M577, Pact BTR-60PU. Unarmed. Once parked for fifteen seconds it
// is set up: the reinforcements you call in arrive behind it instead of at your base (the post
// furthest forward, as long as no enemy is within 80 m of it — modes/shared.js makeBuyer), and
// stacks within 60 m of it are steadied as if their officer were with them. Lose it and the
// reinforcements walk from home again.
import { buildNatoM577, buildPactBTR60PU } from '../models/support.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'commandPost',
  name: 'Forward Command Post',
  shortName: 'Command post',
  category: 'support', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 260,

  formation: { count: 1, columns: 1, spacing: 10 },

  stats: {
    hp: 620,
    armor: 0.2,
    speed: 5.2,
    turnRate: 1.0,
    radius: 1.8,
    height: 2.8,
    aimHeight: 1.3,
    eyeHeight: 2.4,
    sight: 70,
    fov: 2.2,
    range: 0,
    aggroRange: 0,
    preferredRange: 0,
    leash: 10,
    weapon: 'rifle',
    fireCooldown: 1,
    burst: 1,
    burstInterval: 0,
    damage: 0,
    boltSpeed: 400,
    spread: 0.02,
    magSize: 1,
    reloadTime: 1,
    breakMorale: 0,
    crew: 4,
    bailChance: 1,
    commandPost: { deploy: 15, lead: 60, safe: 80 },
  },

  camera: { distance: 12, height: 5, shoulder: 2 },
  models: { nato: buildNatoM577, pact: buildPactBTR60PU },
  weaponSound: 'rifle',
  engine: { nato: 'engine.dieselSmall', pact: 'engine.diesel' },
  tracks: 'tracks.light',
  variants: {
    nato: { name: 'M577 command post', weapon: 'unarmed', text: 'The battalion\'s tactical operations centre on an M113. Set it up behind the front: your reinforcements report there, and the troops around it hold their nerve.' },
    pact: { name: 'BTR-60PU', weapon: 'unarmed', text: 'A regimental command post on the BTR-60. Once its antennas are up, the reinforcements come forward to it instead of to the rear.' },
  },
} satisfies UnitType;
