// Combat engineers: a six-man squad that digs and wires three times as fast as line infantry,
// spots enemy minefields from close by (and rarely sets one off), and is the only unit that can
// clear mines and wire (X: click the obstacle) or blow a bridge (X: click the bridge — maps with
// rivers). Riflemen otherwise, a little shorter-ranged.
import rifles from './vanguard.ts';
import { buildNatoSoldier } from '../models/natoSoldier.js';
import { buildPactSoldier } from '../models/pactSoldier.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'engineers',
  name: 'Combat Engineers',
  shortName: 'Engineers',
  category: 'infantry', // reinforcement window section
  kind: 'infantry',
  role: 'support',
  cost: 160,

  formation: { count: 6, columns: 3, spacing: 2.4 },

  stats: {
    ...rifles.stats,
    engineer: true,       // builds ×3, clears obstacles, demolishes, finds mines
    range: 75,
    aggroRange: 70,
    preferredRange: 50,
    breakMorale: 0.22,
  },

  models: { nato: () => buildNatoSoldier(), pact: () => buildPactSoldier() },
  weaponSound: 'rifle',
  variants: {
    nato: { name: 'Combat Engineer Squad', weapon: 'M16A2, mine detector, demolition charges', text: 'Dig in three times as fast, find and lift enemy mines, cut wire, and drop a bridge in the enemy\'s face. Keep them out of the firefight.' },
    pact: { name: 'Sapper Section', weapon: 'AK-74, mine probes, explosive charges', text: 'Sappers clear the way for the assault — lanes through the minefields, gaps in the wire — and blow what the enemy needs to cross.' },
  },
} satisfies UnitType;
