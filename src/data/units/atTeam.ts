// Anti-tank team: three men with shoulder-fired launchers — NATO Carl Gustaf, Pact RPG-7.
// Slow rockets with a smoke trail, a long aim and a reload after every shot, but a shaped
// charge that defeats tank armour (especially from the side or rear). They hunt vehicles
// first and can still blast infantry in cover.
import rifles from './vanguard.ts';
import { buildNatoSoldier } from '../models/natoSoldier.js';
import { buildPactSoldier } from '../models/pactSoldier.js';
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

  models: { nato: () => buildNatoSoldier({ weapon: 'at' }), pact: () => buildPactSoldier({ weapon: 'at' }) },
  weaponSound: 'rocket',
  variants: {
    nato: { name: 'Anti-Tank Team', weapon: 'Carl Gustaf M2, 84 mm', text: 'Three men and a recoilless rifle. Slow to aim, one shot per reload, but a hit in the flank stops a T-72.' },
    pact: { name: 'RPG Team', weapon: 'RPG-7, 85 mm', text: 'The RPG-7: light, everywhere, deadly from the side. Keep tanks out of their reach or keep them busy.' },
  },
} satisfies UnitType;
