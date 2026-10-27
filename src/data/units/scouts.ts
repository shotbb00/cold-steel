// Recon scouts: a two-man team with binoculars. They see far (150 m, a quarter more while
// standing still) and are hard to spot (`stealth`), and they hold their fire unless they've been
// found or the enemy is right on top of them (`holdFire`) — so they can sit in a hedgerow and
// watch. What they spot, your mortars, artillery and helicopters can hit. Weak in a fight.
import rifles from './vanguard.ts';
import { buildNatoSoldier } from '../models/natoSoldier.js';
import { buildPactSoldier } from '../models/pactSoldier.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'scouts',
  name: 'Recon Scouts',
  shortName: 'Scouts',
  category: 'infantry', // reinforcement window section
  kind: 'infantry',
  role: 'support',
  cost: 100,

  formation: { count: 2, columns: 2, spacing: 3 },

  stats: {
    nightSight: { nato: 0.7, pact: 0.65 }, // night-vision goggles
    ...rifles.stats,
    speed: 3.7,
    sight: 150,
    fov: 2.4,
    binoculars: true,
    stealth: 0.5,
    holdFire: true,
    range: 80,
    aggroRange: 0,        // never engages on its own
    preferredRange: 120,
    breakMorale: 0.4,     // they slip away rather than die in place
    stance: 'prone',
  },

  models: { nato: () => buildNatoSoldier({ scout: true }), pact: () => buildPactSoldier({ scout: true }) },
  weaponSound: 'rifle',
  variants: {
    nato: { name: 'LRRP Scout Team', weapon: 'M16A2, binoculars', text: 'Two men who see everything and are seen by nobody. Push them forward into a hedgerow: what they spot, your mortars, guns and Cobras can hit.' },
    pact: { name: 'Razvedka Team', weapon: 'AKS-74, binoculars', text: 'Divisional reconnaissance: they find the NATO positions before the regiments run into them. Keep them alive and keep them still.' },
  },
} satisfies UnitType;
