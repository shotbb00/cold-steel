// Heavy tanks, pairs — NATO M1IP Abrams (the improved turret armour), Pact T-80B (gas turbine,
// 125 mm). Tougher and harder-hitting than the line tanks, faster than they look, and well over
// the price: the hammer of an offensive, not a picket.
import { buildNatoM1IP, buildPactT80 } from '../models/heavyTanks.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'heavyTank',
  name: 'Heavy Tanks',
  shortName: 'Heavy',
  category: 'armour', // reinforcement window section
  kind: 'vehicle',
  role: 'frontline',
  cost: 560,

  formation: { count: 2, columns: 2, spacing: 11 },

  stats: {
    nightSight: { nato: 0.95, pact: 0.65 },
    hp: 1750,
    armor: 0.82,
    speed: 5.4,
    turnRate: 0.95,
    turretRate: 0.85,
    radius: 2.3,
    height: 2.5,
    aimHeight: 1.4,
    eyeHeight: 2.6,
    sight: 85,
    fov: 1.6,
    range: 215,
    aggroRange: 160,
    preferredRange: 120,
    leash: 14,
    weapon: 'cannon',
    fireCooldown: 5.6,
    burst: 1,
    burstInterval: 0,
    aimTime: 1.1,
    damage: 470,
    splash: 3.6,
    pierce: 0.62,
    boltSpeed: 640,
    boltSize: 1.7,
    tracer: 1,
    spread: 0.0035,
    magSize: 40,
    reloadTime: 8,
    breakMorale: 0,
    antiArmor: true,
    playerFireInterval: 5.6,
    smoke: { charges: 2 },
    crew: 3,
    bailChance: 0.65,
  },

  camera: { distance: 13.5, height: 5.6, shoulder: 2.4 },
  models: { nato: buildNatoM1IP, pact: buildPactT80 },
  weaponSound: 'cannon',
  engine: 'engine.turbine',       // both: AGT1500 and GTD-1000
  tracks: 'tracks.heavy',
  variants: {
    nato: { name: 'M1IP Abrams', weapon: '105 mm M68A1', text: 'The improved Abrams: a longer turret with thicker composite armour. Takes a hit that would stop anything else and answers it.' },
    pact: { name: 'T-80B', weapon: '125 mm 2A46-2', text: 'The gas-turbine tank of the Group of Soviet Forces in Germany: fast, low and hard to kill from the front. The spearhead of the operational manoeuvre group.' },
  },
} satisfies UnitType;
