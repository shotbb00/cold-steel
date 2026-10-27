// Machine-gun team: three men around one general-purpose MG — NATO M60, Pact PKM. The gunner
// has to set the gun up — stationary, prone or in cover, ~2 s — before it's accurate; then it
// fires long bursts whose near misses pin whole squads. The other two carry rifles. Member 0
// is the gunner (`specialist` overrides his stats).
import vanguard from './vanguard.ts';
import { buildNatoSoldier } from '../models/natoSoldier.js';
import { buildPactSoldier } from '../models/pactSoldier.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'mgTeam',
  name: 'Machine-Gun Team',
  shortName: 'MG Team',
  category: 'infantry', // reinforcement window section
  kind: 'infantry',
  role: 'support',
  cost: 170,

  formation: { count: 3, columns: 3, spacing: 2.6 },

  stats: { ...vanguard.stats, sight: 75, preferredRange: 65, aggroRange: 100, breakMorale: 0.25 },

  specialist: {
    count: 1,
    stats: {
      range: 110,
      fireCooldown: 2.2,
      burst: 12,
      burstInterval: 0.09,
      aimTime: 0.6,
      damage: 110,
      boltSpeed: 380,
      spread: 0.02,
      tracer: 0.25,        // every fourth round
      magSize: 100,
      reloadTime: 7,
      stance: 'prone',
      deployTime: 1.8,     // seconds stationary before the gun is set up
      suppressPower: 3.5,  // near misses rattle 3.5x harder than a rifle's
      vsArmor: 0.03,
      playerFireInterval: 0.09,
      weaponSound: 'mg',
    },
  },

  models: { nato: () => buildNatoSoldier(), pact: () => buildPactSoldier() },
  specialistModels: { nato: () => buildNatoSoldier({ weapon: 'mg' }), pact: () => buildPactSoldier({ weapon: 'mg' }) },
  weaponSound: 'rifle',
  variants: {
    nato: { name: 'M60 Machine-Gun Team', weapon: 'M60, 7.62 mm', text: 'A gunner and two riflemen. Once the gun is set up, its long bursts pin whole squads to the ground.' },
    pact: { name: 'PKM Machine-Gun Team', weapon: 'PKM, 7.62x54R', text: 'The PKM covers every Soviet advance. Suppress it or flank it — walking into it is not an option.' },
  },
} satisfies UnitType;
