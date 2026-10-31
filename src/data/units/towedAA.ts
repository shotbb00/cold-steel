// Towed anti-aircraft guns, pairs — NATO M167 Vulcan, Pact ZU-23-2. Cheap, small and low: hard to
// spot while they sit still, easy to dig in (a CEV's vehicle position takes one), and the crew can
// only push them a short way at walking pace. No search radar: the gunner sees a helicopter at
// about two-thirds of the self-propelled guns' range — a friendly air search radar gives them the
// whole reach. Against ground targets they shred infantry and trucks; anything heavier, or a few
// rifle hits on the exposed crew, finishes them.
import { buildNatoM167, buildPactZU23 } from '../models/support.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'towedAA',
  name: 'Towed AA Guns',
  shortName: 'Towed AA',
  category: 'airdefence', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 160,

  formation: { count: 2, columns: 2, spacing: 10 },

  stats: {
    hp: 320,
    armor: 0,             // an open mount: every hit counts
    speed: 1.2,           // pushed by its crew
    turnRate: 0.6,
    turretRate: 1.8,      // hand-cranked
    radius: 1.3,
    height: 1.6,
    aimHeight: 0.9,
    eyeHeight: 1.4,
    sight: 60,
    fov: 2.6,
    stealth: 0.6,         // low and small
    range: 130,
    aggroRange: 110,
    preferredRange: 90,
    leash: 10,
    weapon: 'autocannon',
    fireCooldown: 0.08,
    burst: 1,
    burstInterval: 0,
    damage: 95,
    splash: 0.8,
    pierce: 0.15,
    vsArmor: 0.15,
    boltSpeed: 650,
    boltSize: 0.8,
    tracer: 0.5,
    spread: 0.028,
    magSize: 50,
    reloadTime: 6,        // new boxes by hand
    breakMorale: 0,
    playerFireInterval: 0.08,
    crew: 2,
    bailChance: 1,
    antiAir: {
      range: 300,
      optical: 0.65,      // without an air search radar: 195 m
      rate: 12,
      burst: 1.2,
      pause: 1.1,
      hitNear: 0.06,
      hitFar: 0.01,
    },
  },

  camera: { distance: 8, height: 3.5, shoulder: 1.5 },
  models: { nato: buildNatoM167, pact: buildPactZU23 },
  weaponSound: 'aa',
  variants: {
    nato: { name: 'M167 Vulcan', weapon: '20 mm M61 Vulcan, range-only radar', text: 'The Vulcan on a two-wheeled carriage. Cheap, small and easy to hide or dig in, but slow to move and the crew sits in the open.' },
    pact: { name: 'ZU-23-2', weapon: '2 × 23 mm 2A14', text: 'Two 23 mm cannons on a light carriage: the gun every motor-rifle regiment had. Murderous against helicopters that come too close, and against infantry in the open.' },
  },
} satisfies UnitType;
