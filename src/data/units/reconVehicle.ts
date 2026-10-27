// Armoured reconnaissance, pairs — NATO M3 Bradley CFV, Pact BRDM-2. Fast, far-seeing (130 m,
// thermal sights on the Bradley) and a little hard to spot; they find the enemy for the guns
// and the helicopters, and fight light things. The M3 keeps two TOWs for a tank that finds it
// first; the BRDM-2 has only its 14.5 mm KPVT and its speed.
import { buildNatoM3, buildPactBRDM } from '../models/support.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'reconVehicle',
  name: 'Armoured Recon',
  shortName: 'Recon',
  category: 'armour', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 240,

  formation: { count: 2, columns: 2, spacing: 12 },

  stats: {
    nightSight: { nato: 0.9, pact: 0.55 },
    hp: 640,
    armor: 0.35,
    speed: 7.6,
    turnRate: 1.2,
    turretRate: 1.6,
    radius: 1.8,
    height: 2.6,
    aimHeight: 1.3,
    eyeHeight: 2.6,
    sight: 130,
    fov: 2.2,
    binoculars: true,     // a quarter further while it sits still
    stealth: 0.2,
    range: 170,
    aggroRange: 80,
    preferredRange: 130,
    leash: 16,
    weapon: 'autocannon',
    fireCooldown: 0.3,
    burst: 1,
    burstInterval: 0,
    damage: 110,
    splash: 1,
    pierce: 0.25,
    vsArmor: 0.3,
    boltSpeed: 650,
    boltSize: 0.85,
    tracer: 0.5,
    spread: 0.009,
    magSize: 10,
    reloadTime: 3,
    breakMorale: 0,
    playerFireInterval: 0.3,
    smoke: { charges: 2 },
    crew: 2,
    bailChance: 0.6,
  },
  // per-side differences on top of `stats`
  factionStats: {
    nato: { range: 300, gunRange: 170, atgm: { range: 300, damage: 650, pierce: 0.85, splash: 1.5, speed: 150, reload: 22, count: 2 } },
    pact: { damage: 95, fireCooldown: 0.2, magSize: 14, pierce: 0.2, vsArmor: 0.25, speed: 8.2, armor: 0.22, hp: 520 },
  },

  camera: { distance: 11, height: 4.6, shoulder: 2 },
  models: { nato: buildNatoM3, pact: buildPactBRDM },
  weaponSound: 'autocannon',
  engine: { nato: 'engine.diesel', pact: 'engine.dieselSmall' },
  tracks: 'tracks.light',
  variants: {
    nato: { name: 'M3 Bradley CFV', weapon: '25 mm M242 · 2 TOW', text: 'The cavalry\'s eyes: thermal sights out to 130 m, fast and quiet. Find the enemy, call the guns, keep the TOWs for the tank that finds you.' },
    pact: { name: 'BRDM-2', weapon: '14.5 mm KPVT', text: 'A quick four-wheeled scout car: sees far, runs faster, and its heavy machine gun shreds infantry and trucks. Never let it meet a tank.' },
  },
} satisfies UnitType;
