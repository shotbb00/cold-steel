// MANPADS team: three men, one with the launcher — NATO FIM-92 Stinger, Pact 9K32 Strela-2.
// A heat-seeking missile at any enemy aircraft within 420 m (systems/AirStrike.js missile): a
// good chance to hit a helicopter, less against a jet, three missiles then a long reload. The
// others are riflemen. Cheap, hides anywhere — and makes every air strike a gamble.
import rifles from './vanguard.ts';
import { buildNatoSoldier } from '../models/natoSoldier.js';
import { buildPactSoldier } from '../models/pactSoldier.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'manpads',
  name: 'MANPADS Team',
  shortName: 'MANPADS',
  category: 'airdefence', // reinforcement window section
  kind: 'infantry',
  role: 'support',
  cost: 170,

  formation: { count: 3, columns: 3, spacing: 2.6 },

  stats: { ...rifles.stats, aggroRange: 70, preferredRange: 70, breakMorale: 0.25 },

  specialist: {
    count: 1,
    stats: {
      antiAir: { missile: true, range: 420, count: 3, reload: 14, pk: 0.55, hits: 5, speed: 240, sound: 'sam' },
    },
  },

  models: { nato: () => buildNatoSoldier(), pact: () => buildPactSoldier() },
  specialistModels: { nato: () => buildNatoSoldier({ weapon: 'manpads' }), pact: () => buildPactSoldier({ weapon: 'manpads' }) },
  weaponSound: 'rifle',
  variants: {
    nato: { name: 'Stinger Team', weapon: 'FIM-92 Stinger, M16A2', text: 'Fire-and-forget missiles at any enemy helicopter or jet within 420 m. Three shots, then a long reload: hide them under the path the enemy\'s air will take.' },
    pact: { name: 'Strela Team', weapon: '9K32 Strela-2, AK-74', text: 'The Strela chases the hot engine of anything that flies low over the line. Cheap, everywhere, and the reason NATO pilots fly scared.' },
  },
} satisfies UnitType;
