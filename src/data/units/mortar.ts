// Mortar team: three men — the gunner on the tube, two riflemen humping rounds. Light
// indirect fire at company level (40–180 m): no line of sight needed, it drops bombs on
// anything its side has spotted, preferring clustered and dug-in troops. The tube has to be
// set up first (stationary ~4 s). It also carries smoke bombs: select it, press K and click to
// screen a crossing or blind an MG nest. NATO M29A1 81 mm, Pact 2B14 Podnos 82 mm.
import rifles from './vanguard.ts';
import { buildNatoSoldier } from '../models/natoSoldier.js';
import { buildPactSoldier } from '../models/pactSoldier.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'mortar',
  name: 'Mortar Team',
  shortName: 'Mortar',
  category: 'fire', // reinforcement window section
  kind: 'infantry',
  role: 'support',
  cost: 190,

  formation: { count: 3, columns: 3, spacing: 2.4 },

  stats: { ...rifles.stats, sight: 70, preferredRange: 120, aggroRange: 90, breakMorale: 0.25 },

  specialist: {
    count: 1,
    stats: {
      weapon: 'artillery',
      indirect: true,
      minRange: 40,
      range: 180,
      gravity: 25,
      scatter: 2.5,         // metres at the tube…
      scatterPerM: 0.035,   // …plus this much per metre
      fireCooldown: 4.5,
      burst: 1,
      burstInterval: 0,
      aimTime: 1.2,
      damage: 150,
      splash: 4.5,
      pierce: 0.15,
      vsArmor: 0.35,
      crater: 0.3,
      boltSize: 0.8,
      tracer: 0,
      magSize: 8,           // bombs at hand before the ammo bearers bring more
      reloadTime: 8,
      stance: 'crouch',
      deployTime: 4,
      muzzleKind: 'mortar',
      weaponSound: 'mortar',
      smokeRounds: 6,       // smoke bombs carried
      flareRounds: 4,       // illumination rounds (night battles: L)
      playerFireInterval: 4,
    },
  },

  models: { nato: () => buildNatoSoldier(), pact: () => buildPactSoldier() },
  specialistModels: { nato: () => buildNatoSoldier({ weapon: 'mortar' }), pact: () => buildPactSoldier({ weapon: 'mortar' }) },
  weaponSound: 'rifle',
  variants: {
    nato: { name: 'Mortar Team', weapon: 'M29A1, 81 mm', text: 'Company fire support. Drops bombs on anything your side can see 40–180 m out, no line of sight needed — and lays smoke (K) when you need to cross open ground.' },
    pact: { name: 'Mortar Team', weapon: '2B14 Podnos, 82 mm', text: 'The battalion mortar: shells spotted positions and screens the assault with smoke. Fragile up close — keep it behind the line.' },
  },
} satisfies UnitType;
