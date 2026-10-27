// Self-propelled artillery, batteries of two — NATO M109 (155 mm), Pact 2S1 Gvozdika (122 mm).
// Indirect fire: no line of sight needed, it shells anything its side has spotted between
// minRange and range, preferring clustered and dug-in targets. Shells fly real arcs, scatter
// more with distance, whistle on the way down, burst with wide splash and leave craters.
// Slow and thin-skinned: keep it well back.
import { buildNatoM109 } from '../models/natoM109.js';
import { buildPact2S1 } from '../models/pact2S1.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'artillery',
  name: 'SP Artillery Battery',
  shortName: 'Artillery',
  category: 'fire', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 380,

  formation: { count: 2, columns: 2, spacing: 10 },

  stats: {
    hp: 450,
    armor: 0.3,
    speed: 1.8,
    turnRate: 0.6,
    turretRate: 0.5,
    radius: 1.9,
    height: 2.6,
    aimHeight: 1.2,
    eyeHeight: 2.2,
    sight: 50,
    fov: 1.6,
    range: 300,
    minRange: 45,
    aggroRange: 0,        // never moves on its own to engage
    preferredRange: 200,
    leash: 12,
    weapon: 'artillery',
    indirect: true,
    gravity: 25,          // m/s² for the shell arc (game-scaled)
    scatter: 3,           // metres of scatter at the gun…
    scatterPerM: 0.03,    // …plus this much per metre of range
    fireCooldown: 7,
    burst: 1,
    burstInterval: 0,
    damage: 170,
    splash: 7,
    pierce: 0.2,
    vsArmor: 0.6,
    crater: 0.55,         // crater depth, metres
    boltSize: 1.2,
    tracer: 0,
    spread: 0,
    magSize: 4,
    reloadTime: 12,
    breakMorale: 0,
    crew: 2,
    bailChance: 0.7,
    playerFireInterval: 5,
  },

  camera: { distance: 12, height: 5, shoulder: 2 },
  models: { nato: buildNatoM109, pact: buildPact2S1 },
  weaponSound: 'arty',
  engine: 'engine.dieselSmall',
  tracks: 'tracks.light',
  variants: {
    nato: { name: 'M109 Howitzer', weapon: '155 mm howitzer', text: 'Self-propelled artillery: shells anything spotted 45–300 m out, no line of sight needed. Keep it far back.' },
    pact: { name: '2S1 Gvozdika', weapon: '122 mm howitzer', text: 'The light SP gun of a Soviet division. Lobs shells onto spotted clusters and dug-in positions.' },
  },
} satisfies UnitType;
