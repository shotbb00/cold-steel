// Air assault squad: eight men flown in by helicopter (systems/AirStrike.js, kind 'lift': P) —
// NATO 101st Airborne (air assault), Pact VDV. Not bought on the ground (`airOnly`): it arrives
// where you land it, behind a ridge or on the objective, and fights like a rifle squad with
// sharper discipline.
import rifles from './vanguard.ts';
import { buildNatoSoldier } from '../models/natoSoldier.js';
import { buildPactSoldier } from '../models/pactSoldier.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'airAssault',
  name: 'Air Assault Squad',
  shortName: 'Air Assault',
  category: 'infantry',
  kind: 'infantry',
  role: 'frontline',
  airOnly: true,
  cost: 150,

  formation: { count: 8, columns: 4, spacing: 2.4 },

  stats: { ...rifles.stats, speed: 3.5, breakMorale: 0.14, aimTime: 0.8 },

  models: { nato: () => buildNatoSoldier({ airAssault: true }), pact: () => buildPactSoldier({ airAssault: true }) },
  weaponSound: 'rifle',
  variants: {
    nato: { name: 'Air Assault Squad', weapon: 'M16A2 · by UH-60 (P)', text: 'The 101st: a Black Hawk lands eight men wherever you point (P) — on the objective, behind the enemy, on a bridge. Lose the helicopter before it lands and you lose them too.' },
    pact: { name: 'VDV Section', weapon: 'AKS-74 · by Mi-8 (P)', text: 'Soviet airborne troops landed by a Hip, rockets clearing the landing zone first. Hard men, dropped where the enemy isn\'t looking.' },
  },
} satisfies UnitType;
