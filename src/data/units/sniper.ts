// Sniper team: a marksman and his spotter. The rifle reaches three times as far as a squad's,
// one aimed shot every few seconds, and he picks his man — the platoon leader first (the
// platoon loses its steadiness with him), then mortar and MG crews and observers. Each shot
// gives away little (`quietShot`), both are hard to spot, and the spotter's binoculars find the
// targets. Useless against vehicles; caught in the open by a squad they don't last.
import scouts from './scouts.ts';
import { buildNatoSoldier } from '../models/natoSoldier.js';
import { buildPactSoldier } from '../models/pactSoldier.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'sniper',
  name: 'Sniper Team',
  shortName: 'Snipers',
  category: 'infantry', // reinforcement window section
  kind: 'infantry',
  role: 'support',
  cost: 160,

  formation: { count: 2, columns: 2, spacing: 2.5 },

  // the spotter: binoculars, hidden, quiet unless found (the scouts' stats)
  stats: { ...scouts.stats, sight: 220, stealth: 0.55, preferredRange: 220 }, // 275 m through the binoculars, standing still

  // the marksman
  specialist: {
    count: 1,
    stats: {
      holdFire: false,
      marksman: true,
      quietShot: 0.35,
      range: 320,
      fireCooldown: 5,
      aimTime: 2.4,
      burst: 1,
      burstInterval: 0,
      damage: 160,
      boltSpeed: 760,
      spread: 0.0018,
      tracer: 0,
      magSize: 10,
      reloadTime: 4,
      vsArmor: 0.01,
    },
  },

  models: { nato: () => buildNatoSoldier({ scout: true }), pact: () => buildPactSoldier({ scout: true }) },
  specialistModels: { nato: () => buildNatoSoldier({ weapon: 'sniper', scout: true }), pact: () => buildPactSoldier({ weapon: 'sniper', scout: true }) },
  weaponSound: 'rifle',
  variants: {
    nato: { name: 'Sniper Team', weapon: 'M21 sniper rifle, M16A2, binoculars', text: 'A marksman with an M21 and his spotter. From 300 m he takes the platoon leader first, then the crews; the platoon he leaves behind wavers.' },
    pact: { name: 'Snaiperskaya Para', weapon: 'SVD Dragunov, AK-74, binoculars', text: 'The company sniper and an observer. The SVD reaches across the field; officers, gunners and radio men fall before the others know where the shots come from.' },
  },
} satisfies UnitType;
