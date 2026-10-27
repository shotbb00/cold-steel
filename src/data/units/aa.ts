// Self-propelled anti-aircraft guns, pairs — NATO M163 VADS, Pact ZSU-23-4 Shilka. Their
// radar picks up enemy helicopters (systems/AirStrike.js) within `antiAir.range` and the turret
// slews onto them for lead-aimed bursts; each round has a chance to hit, falling off with
// range. Against ground targets the rapid-fire cannon shreds infantry in the open but does
// little to tanks, and the thin hull doesn't survive much in return. Keep them behind the line,
// under your assault's path.
import { buildNatoM163 } from '../models/natoM163.js';
import { buildPactShilka } from '../models/pactShilka.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'aa',
  name: 'SP Anti-Aircraft Guns',
  shortName: 'Flak',
  category: 'airdefence', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 280,

  formation: { count: 2, columns: 2, spacing: 12 },

  stats: {
    hp: 520,
    armor: 0.22,          // light: rifle fire can still hurt it a little
    speed: 5.4,
    turnRate: 1.1,
    turretRate: 2.4,      // power traverse fast enough to track a helicopter
    radius: 1.7,
    height: 2.5,
    aimHeight: 1.2,
    eyeHeight: 2.4,
    sight: 70,
    fov: 2.4,
    range: 120,           // against ground targets
    aggroRange: 100,
    preferredRange: 90,
    leash: 14,
    weapon: 'autocannon', // small muzzle flash, not a tank gun's blast
    fireCooldown: 0.09,   // rapid fire against ground targets…
    burst: 1,
    burstInterval: 0,
    damage: 90,
    splash: 0.8,
    pierce: 0.1,
    vsArmor: 0.12,
    boltSpeed: 620,
    boltSize: 0.8,
    tracer: 0.5,
    spread: 0.03,
    magSize: 24,          // …in bursts, then a pause
    reloadTime: 3.5,
    breakMorale: 0,
    playerFireInterval: 0.09,
    crew: 3,
    bailChance: 0.6,
    antiAir: {
      range: 320,         // radar pick-up and engagement range against helicopters
      rate: 14,           // rounds a second while firing
      burst: 1.3,         // seconds of fire…
      pause: 0.9,         // …then a pause
      hitNear: 0.07,      // chance a round hits at point-blank…
      hitFar: 0.012,      // …and at full range
    },
  },

  camera: { distance: 11, height: 4.5, shoulder: 2 },
  models: { nato: buildNatoM163, pact: buildPactShilka },
  weaponSound: 'aa',
  engine: 'engine.dieselSmall',
  tracks: 'tracks.light',
  variants: {
    nato: { name: 'M163 VADS', weapon: '20 mm M61 Vulcan, range-only radar', text: 'A gatling on an M113. Its radar finds enemy helicopters out to about 320 m and the Vulcan tears into them; against infantry in the open it is murderous. Keep it out of tank range.' },
    pact: { name: 'ZSU-23-4 Shilka', weapon: '4 × 23 mm 2A7, Gun Dish radar', text: 'Four radar-directed cannons that make any helicopter run a gamble — and turn any infantry caught in the open to mince. Thin armour: a tank round finishes it.' },
  },
} satisfies UnitType;
