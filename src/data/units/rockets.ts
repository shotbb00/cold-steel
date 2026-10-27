// Rocket artillery, single launchers — NATO M270 MLRS (twelve 227 mm rockets), Pact BM-21 Grad
// (forty 122 mm on a Ural truck). Indirect, 90–450 m: it ripples its whole load onto a spotted
// cluster in a few seconds — a wide, scattered carpet that wrecks infantry in the open and
// rattles everything else — then needs most of a minute to reload. The launch gives it away.
import { buildNatoMLRS, buildPactGrad } from '../models/support.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'rockets',
  name: 'Rocket Artillery',
  shortName: 'Rockets',
  category: 'fire', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 420,

  formation: { count: 1, columns: 1, spacing: 10 },

  stats: {
    hp: 420,
    armor: 0.2,
    speed: 4.2,
    turnRate: 0.7,
    turretRate: 0.5,
    radius: 2.1,
    height: 3,
    aimHeight: 1.4,
    eyeHeight: 2.6,
    sight: 50,
    fov: 1.6,
    range: 450,
    minRange: 90,
    aggroRange: 0,
    preferredRange: 320,
    leash: 12,
    weapon: 'artillery',
    indirect: true,
    gravity: 25,
    scatter: 9,           // a carpet, not a point
    scatterPerM: 0.035,
    fireCooldown: 0.45,   // the ripple…
    burst: 1,
    burstInterval: 0,
    damage: 150,
    splash: 6,
    pierce: 0.2,
    vsArmor: 0.55,
    crater: 0.4,
    boltSize: 1,
    tracer: 0,
    trail: true,          // rockets: a smoke trail all the way
    spread: 0,
    magSize: 12,
    reloadTime: 50,       // …then the long reload
    breakMorale: 0,
    muzzleKind: 'rocket',
    weaponSound: 'mlrs',
    crew: 3,
    bailChance: 0.7,
    playerFireInterval: 0.45,
  },
  // per-side differences on top of `stats`
  factionStats: {
    pact: { magSize: 20, damage: 115, splash: 5, fireCooldown: 0.25, scatter: 11, armor: 0.08, hp: 340, speed: 5.4, reloadTime: 55 },
  },

  camera: { distance: 13, height: 5.5, shoulder: 2 },
  models: { nato: buildNatoMLRS, pact: buildPactGrad },
  weaponSound: 'mlrs',
  engine: 'engine.diesel',
  tracks: 'tracks.light',
  variants: {
    nato: { name: 'M270 MLRS', weapon: '12 × 227 mm rockets', text: 'Twelve rockets in under six seconds onto anything spotted 90–450 m out. Devastating on a massed assault — then a long reload, and every gun on the map knows where it is.' },
    pact: { name: 'BM-21 Grad', weapon: '40 × 122 mm rockets (20 per salvo)', text: 'A rolling carpet of rockets over a whole position, from a truck. Thin-skinned and slow to reload — fire, then move.' },
  },
} satisfies UnitType;
