// Vehicle crew: the two or three survivors who scramble out of a knocked-out tank or
// gun (systems/CrewBailout.js). Lightly armed, nervy, and they head for base first — but you
// can take them over or put them back into the line. Not purchasable (`hidden`).
import vanguard from './vanguard.ts';
import { buildNatoSoldier } from '../models/natoSoldier.js';
import { buildPactSoldier } from '../models/pactSoldier.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'crew',
  name: 'Vehicle Crew',
  shortName: 'Crew',
  kind: 'infantry',
  role: 'support',
  cost: 0,
  hidden: true,

  formation: { count: 3, columns: 3, spacing: 1.8 },

  stats: {
    ...vanguard.stats,
    range: 45,
    sight: 60,
    spread: 0.03,      // sidearms, shaky hands
    magSize: 8,
    fireCooldown: 1.4,
    aimTime: 0.6,
    breakMorale: 0.45,
    speed: 3.6,
  },

  models: {
    nato: () => buildNatoSoldier({ weapon: 'smg', crew: true }),
    pact: () => buildPactSoldier({ weapon: 'smg', crew: true }),
  },
  weaponSound: 'rifle',
} satisfies UnitType;
