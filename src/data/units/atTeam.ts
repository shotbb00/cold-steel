// Anti-tank team: a gunner with a shoulder-fired launcher — NATO Carl Gustaf, Pact RPG-7 — and two
// riflemen covering him (members 0 and 1, the `specialist`s: their rifles override the launcher).
// Slow rockets with a smoke trail, a long aim and a reload after every shot, but a shaped
// charge that defeats tank armour (especially from the side or rear). They hunt vehicles
// first; at men only in a house, a trench or close by (UnitStack.pickTarget).
import rifles from './vanguard.ts';
import { buildNatoSoldier } from '../models/natoSoldier.js';
import { buildPactSoldier } from '../models/pactSoldier.js';
import { buildBwSoldier } from '../models/bwSoldier.js';
import { buildNvaSoldier } from '../models/nvaSoldier.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'atTeam',
  name: 'Anti-Tank Team',
  shortName: 'AT Team',
  category: 'infantry', // reinforcement window section
  kind: 'infantry',
  role: 'support',
  cost: 170,

  formation: { count: 3, columns: 3, spacing: 3 },

  stats: {
    ...rifles.stats,
    grenades: 1,
    sight: 70,
    range: 130,
    aggroRange: 120,
    preferredRange: 80,
    weapon: 'rocket',
    fireCooldown: 3,
    aimTime: 2.2,
    damage: 520,
    splash: 2.5,
    pierce: 0.75,         // shaped charge
    vsArmor: 1,
    boltSpeed: 140,
    boltSize: 1.4,
    tracer: 1,
    trail: true,          // smoke trail behind the rocket
    spread: 0.01,
    magSize: 1,
    reloadTime: 6,
    stance: 'crouch',     // can't fire lying down (backblast)
    breakMorale: 0.22,
    antiArmor: true,
    playerFireInterval: 1,
  },

  specialist: { count: 2, stats: { ...rifles.stats, lightAT: 0, weapon: undefined, splash: 0, trail: undefined, antiArmor: undefined } },
  specialistModels: { nato: () => buildNatoSoldier(), pact: () => buildPactSoldier(), bw: () => buildBwSoldier(), nva: () => buildNvaSoldier() },
  models: { nato: () => buildNatoSoldier({ weapon: 'at' }), pact: () => buildPactSoldier({ weapon: 'at' }),
    bw: () => buildBwSoldier({ weapon: 'at' }), nva: () => buildNvaSoldier({ weapon: 'at' }) },
  weaponSound: 'rocket',
  variants: {
    bw: { name: 'Panzerfaust Team', weapon: 'Panzerfaust 44 "Lanze"', text: 'The Lanze: a light rocket launcher every squad carries. Short reach, but a side shot at a T-72 in a village street ends it.' },
    nva: { name: 'RPG-7 Team', weapon: 'RPG-7, 85 mm', text: 'The RPG-7, East German issue: light, everywhere, deadly from the flank. Keep tanks away from their hedges.' },
    nato: { name: 'Anti-Tank Team', weapon: 'Carl Gustaf M2, 84 mm', text: 'Three men and a recoilless rifle. Slow to aim, one shot per reload, but a hit in the flank stops a T-72.' },
    pact: { name: 'RPG Team', weapon: 'RPG-7, 85 mm', text: 'The RPG-7: light, everywhere, deadly from the side. Keep tanks out of their reach or keep them busy.' },
  },
} satisfies UnitType;
