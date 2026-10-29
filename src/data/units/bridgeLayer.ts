// Armoured bridge layer — NATO M60 AVLB, Pact MTU-20. Carries one scissors bridge: select it,
// X, click the river, and it drives to the near bank and lays a new crossing in about twenty
// seconds (systems/Construction.js 'span', world/River.js lay()). The bridge is a crossing like
// any other: everyone can use it, routes plan over it, engineers can blow it. Unarmed; only on
// maps with a river (`needsRiver`).
import { buildNatoAVLB, buildPactMTU } from '../models/support.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'bridgeLayer',
  name: 'Bridge Layer',
  shortName: 'Bridge layer',
  category: 'support', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 240,
  needsRiver: true,

  formation: { count: 1, columns: 1, spacing: 10 },

  stats: {
    hp: 1000,
    armor: 0.55,
    speed: 5,
    turnRate: 0.9,
    turretRate: 0,
    radius: 2.2,
    height: 2.8,
    aimHeight: 1.4,
    eyeHeight: 2.4,
    sight: 60,
    fov: 2,
    range: 1,             // unarmed
    aggroRange: 0,
    preferredRange: 40,
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
    smoke: { charges: 1 },
    bridgeLayer: true,
    crew: 2,
    bailChance: 0.7,
  },

  camera: { distance: 13, height: 5.5, shoulder: 2.4 },
  models: { nato: buildNatoAVLB, pact: buildPactMTU },
  weaponSound: 'rifle',
  engine: 'engine.diesel',
  tracks: 'tracks.heavy',
  variants: {
    nato: { name: 'M60 AVLB', weapon: 'Unarmed · 18 m scissors bridge', text: 'An M60 hull carrying a folding bridge. Drive it to the river bank and it unfolds a crossing in seconds: a new way over where the enemy isn\'t waiting. One bridge per vehicle.' },
    pact: { name: 'MTU-20', weapon: 'Unarmed · 20 m bridge', text: 'A T-55 chassis with a bridge on its back. It lays a crossing over the river from the bank in moments, for the tanks behind it. One bridge per vehicle.' },
  },
} satisfies UnitType;
