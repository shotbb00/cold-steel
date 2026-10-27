// Self-propelled mortars, pairs — NATO M106 (4.2 in mortar in an M113), Pact 2S9 Nona (120 mm
// gun-mortar in a turret). Indirect fire 35–230 m like the mortar team, but armoured, mobile
// and ready to fire the moment it stops; smoke (K) and illumination (L) rounds too.
import { buildNatoM106, buildPactNona } from '../models/support.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'spMortar',
  name: 'SP Mortars',
  shortName: 'SP Mortar',
  category: 'fire', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 300,

  formation: { count: 2, columns: 2, spacing: 10 },

  stats: {
    hp: 520,
    armor: 0.28,
    speed: 5.6,
    turnRate: 1,
    turretRate: 0.9,
    radius: 1.7,
    height: 2.4,
    aimHeight: 1.2,
    eyeHeight: 2.4,
    sight: 60,
    fov: 1.8,
    range: 230,
    minRange: 35,
    aggroRange: 0,
    preferredRange: 160,
    leash: 12,
    weapon: 'artillery',
    indirect: true,
    gravity: 25,
    scatter: 2.5,
    scatterPerM: 0.03,
    fireCooldown: 3.2,
    burst: 1,
    burstInterval: 0,
    damage: 155,
    splash: 5,
    pierce: 0.15,
    vsArmor: 0.4,
    crater: 0.35,
    boltSize: 0.9,
    tracer: 0,
    spread: 0,
    magSize: 10,
    reloadTime: 9,
    breakMorale: 0,
    muzzleKind: 'mortar',
    weaponSound: 'mortar',
    smokeRounds: 6,
    flareRounds: 4,
    crew: 3,
    bailChance: 0.6,
    playerFireInterval: 3.2,
  },
  // per-side differences on top of `stats`
  factionStats: {
    pact: { damage: 175, splash: 5.5, muzzleKind: 'artillery', armor: 0.3, range: 250 },
  },

  camera: { distance: 11, height: 4.6, shoulder: 2 },
  models: { nato: buildNatoM106, pact: buildPactNona },
  weaponSound: 'mortar',
  engine: 'engine.dieselSmall',
  tracks: 'tracks.light',
  variants: {
    nato: { name: 'M106 Mortar Carrier', weapon: 'M30 4.2 in (107 mm) mortar', text: 'The battalion\'s mortar on tracks: fires the moment it stops, smoke (K) and illumination (L) on call, and drives off before the counter-fire lands.' },
    pact: { name: '2S9 Nona', weapon: '120 mm 2A51 gun-mortar', text: 'An airborne gun-mortar in a turret: heavy bombs on anything spotted 35–250 m out, smoke and illumination too.' },
  },
} satisfies UnitType;
