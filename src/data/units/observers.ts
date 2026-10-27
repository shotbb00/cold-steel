// Forward observers: a two-man team with binoculars and the radio. Like scouts they see far and
// are hard to find, but their job is the fire: every mortar, gun and rocket of their side that
// shoots at something within their sight lands far tighter (`observer`: scatter ×0.4) — the
// difference between a barrage on the trench and one in the field next to it.
import rifles from './vanguard.ts';
import { buildNatoSoldier } from '../models/natoSoldier.js';
import { buildPactSoldier } from '../models/pactSoldier.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'observers',
  name: 'Forward Observers',
  shortName: 'FO',
  category: 'fire', // reinforcement window section
  kind: 'infantry',
  role: 'support',
  cost: 110,

  formation: { count: 2, columns: 2, spacing: 3 },

  stats: {
    nightSight: { nato: 0.7, pact: 0.6 },
    ...rifles.stats,
    speed: 3.5,
    sight: 135,
    fov: 2.2,
    binoculars: true,
    stealth: 0.45,
    holdFire: true,
    observer: { scatter: 0.4 },   // indirect fire on what they can see: this much of the scatter
    range: 80,
    aggroRange: 0,
    preferredRange: 120,
    breakMorale: 0.4,
    stance: 'prone',
  },

  models: { nato: () => buildNatoSoldier({ scout: true, radio: true }), pact: () => buildPactSoldier({ scout: true, radio: true }) },
  weaponSound: 'rifle',
  variants: {
    nato: { name: 'FIST Team', weapon: 'M16A2, PRC-77, binoculars', text: 'Fire support team: put them where they can see the target and every mortar, howitzer and rocket you own lands on it, not near it.' },
    pact: { name: 'Artillery Observers', weapon: 'AKS-74, R-107, binoculars', text: 'The battery commander\'s eyes. Within their sight the guns are accurate; without them, they plough the fields.' },
  },
} satisfies UnitType;
