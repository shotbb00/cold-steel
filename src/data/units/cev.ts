// Combat engineer vehicles: a tank hull with a dozer blade and a demolition weapon. The blade
// digs vehicle positions (T: Construction 'revetment') — anything parked in one is hull down. The
// weapon is for concrete and brick: bunkers, strongpoints, held houses and trenches come first
// (`demolition`), and its blast brings houses down. NATO's M728 fires a 165 mm demolition round
// from 140 m; the Pact's IMR-2 has no gun — its crane sets charges, so it must drive right up.
import tank from './tank.ts';
import { buildNatoCEV, buildPactIMR } from '../models/support.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'cev',
  name: 'Combat Engineer Vehicle',
  shortName: 'CEV',
  category: 'armour', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 380,

  formation: { count: 1, columns: 1, spacing: 10 },

  stats: {
    ...tank.stats,
    hp: 1250,
    armor: 0.65,
    speed: 4.4,
    sight: 70,
    range: 140,
    aggroRange: 110,
    preferredRange: 90,
    fireCooldown: 14,
    aimTime: 2,
    damage: 1500,         // a building or a bunker in a couple of hits
    splash: 7,
    pierce: 0.45,
    vsArmor: 0.7,         // squash head against armour: it hurts, it rarely kills
    boltSpeed: 260,       // a slow, heavy round
    boltSize: 2.2,
    spread: 0.006,
    magSize: 30,
    antiArmor: false,
    demolition: true,
    vsStructure: 2.5,     // against bunkers and strongpoints
    dozer: true,
    smoke: { charges: 2 },
    crew: 4,
  },
  factionStats: {
    pact: { range: 16, aggroRange: 40, preferredRange: 10, fireCooldown: 18, aimTime: 3, boltSpeed: 60, spread: 0.02, tracer: 0 }, // charges from the crane
  },

  camera: { distance: 13, height: 5.5, shoulder: 2.4 },
  models: { nato: buildNatoCEV, pact: buildPactIMR },
  weaponSound: 'cannon',
  engine: 'engine.diesel',
  tracks: 'tracks.heavy',
  variants: {
    nato: { name: 'M728 CEV', weapon: '165 mm demolition gun, dozer blade', text: 'An M60 with a short 165 mm gun that throws a 30 kg demolition round. It flattens bunkers and houses from 140 m, and its blade digs your tanks in.' },
    pact: { name: 'IMR-2', weapon: 'crane with demolition charges, plough blade', text: 'A T-72 hull with a crane and a blade. It clears and digs, and razes bunkers and houses by setting charges — so it has to reach them.' },
  },
} satisfies UnitType;
