// Main battle tanks, platoons of three — NATO M1 Abrams, Pact T-72B. A big gun that kills
// tanks (best from the flank) and shreds infantry with its blast, thick directional armour
// (front > side > rear — flank them), short sight when buttoned up, never break. Knocked-out
// tanks may leave a surviving crew.
import { buildNatoAbrams } from '../models/natoAbrams.js';
import { buildPactT72 } from '../models/pactT72.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'tank',
  name: 'Main Battle Tanks',
  shortName: 'Tanks',
  category: 'armour', // reinforcement window section
  kind: 'vehicle',
  role: 'frontline',
  cost: 450, // command points (Frontline mode)

  formation: { count: 3, columns: 3, spacing: 10 },

  stats: {
    nightSight: { nato: 0.95, pact: 0.6 }, // M1 thermal sight vs the T-72's infrared
    hp: 1400,
    armor: 0.75,          // frontal; sides take 0.7x of this, rear 0.35x
    speed: 5,
    turnRate: 0.9,        // hull, rad/s
    turretRate: 0.8,      // turret traverse, rad/s
    radius: 2.2,
    height: 2.5,
    aimHeight: 1.4,
    eyeHeight: 2.6,
    sight: 80,            // buttoned up: short and narrow
    fov: 1.6,
    range: 200,
    aggroRange: 150,
    preferredRange: 110,
    leash: 14,
    weapon: 'cannon',
    fireCooldown: 6,
    burst: 1,
    burstInterval: 0,
    aimTime: 1.2,
    damage: 420,
    splash: 3.5,          // metres
    pierce: 0.55,
    boltSpeed: 600,
    boltSize: 1.6,
    tracer: 1,
    spread: 0.004,
    magSize: 40,
    reloadTime: 8,
    breakMorale: 0,
    antiArmor: true,
    playerFireInterval: 6,
    smoke: { charges: 2 },  // grenade-launcher salvos per platoon (popped when hit, or K)
    crew: 3,              // up to this many may bail out when it's knocked out
    bailChance: 0.6,
  },

  camera: { distance: 13, height: 5.5, shoulder: 2.4 },
  models: { nato: buildNatoAbrams, pact: buildPactT72 },
  weaponSound: 'cannon',
  engine: { nato: 'engine.turbine', pact: 'engine.diesel' }, // AGT1500 gas turbine vs V-84 diesel
  tracks: 'tracks.heavy',
  variants: {
    nato: { name: 'M1 Abrams', weapon: '120 mm smoothbore', text: 'Gas-turbine main battle tank with composite armour. Fast, accurate at long range, thin at the rear.' },
    pact: { name: 'T-72B', weapon: '125 mm smoothbore', text: 'Low, tough and numerous, with reactive armour bricks. Its ammunition sits under the turret — a penetration often ends in a cook-off.' },
  },
} satisfies UnitType;
