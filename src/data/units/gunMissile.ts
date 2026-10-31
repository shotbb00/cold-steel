// Gun-missile air defence, pairs — NATO ADATS (on the M113A2), Pact 2S6 Tunguska. One rack of
// eight missiles that work against aircraft and armour alike (`antiAir.shared`: every missile
// fired at a tank is one fewer for a helicopter), out to 520 m in the air and 480 m on the
// ground, then a long reload. The Tunguska also carries two twin 30 mm cannons for anything on
// the ground within 160 m; the ADATS has only its missiles. Expensive, and a target for both.
import { buildNatoADATS, buildPactTunguska } from '../models/support.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'gunMissile',
  name: 'Gun-Missile Air Defence',
  shortName: 'ADATS',
  category: 'airdefence', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 420,

  formation: { count: 2, columns: 2, spacing: 12 },

  stats: {
    hp: 700,
    armor: 0.3,
    speed: 5.2,
    turnRate: 1.0,
    turretRate: 2.0,
    radius: 1.8,
    height: 3.2,
    aimHeight: 1.3,
    eyeHeight: 2.8,
    sight: 160,           // FLIR and the electro-optical sight
    fov: 2.2,
    range: 480,           // the missiles against vehicles…
    gunRange: 1,          // …and no gun (the Tunguska's are below)
    aggroRange: 300,
    preferredRange: 300,
    leash: 14,
    weapon: 'autocannon',
    fireCooldown: 99,
    burst: 1,
    burstInterval: 0,
    damage: 0,
    boltSpeed: 1,
    boltSize: 0,
    spread: 0,
    magSize: 1,
    reloadTime: 99,
    breakMorale: 0,
    crew: 3,
    bailChance: 0.6,
    atgm: { range: 480, damage: 700, pierce: 0.9, splash: 1.5, speed: 280, reload: 6, count: 8 },
    antiAir: { missile: true, shared: true, range: 520, count: 8, reload: 40, pk: 0.7, hits: 6, speed: 380, sound: 'sam' },
  },
  factionStats: {
    pact: { // 2 × twin 30 mm 2A38 against anything on the ground near it
      gunRange: 160, fireCooldown: 0.07, damage: 100, splash: 0.9, pierce: 0.2, vsArmor: 0.18, boltSpeed: 700, boltSize: 0.9,
      tracer: 0.5, spread: 0.022, magSize: 40, reloadTime: 3, weaponSound: 'aa',
    },
  },

  camera: { distance: 12, height: 5, shoulder: 2 },
  models: { nato: buildNatoADATS, pact: buildPactTunguska },
  weaponSound: 'sam',
  engine: 'engine.diesel',
  tracks: 'tracks.light',
  variants: {
    nato: { name: 'ADATS', weapon: '8 × MIM-146 missiles', text: 'Air Defence Anti-Tank System: laser beam-riding missiles that kill helicopters and tanks alike. Eight in the rack — spend them wisely.' },
    pact: { name: '2S6 Tunguska', weapon: '2 × twin 30 mm 2A38, 8 × 9M311 missiles', text: 'Radar, cannons and missiles in one turret. Missiles for whatever flies or rolls at range, the cannons for everything close.' },
  },
} satisfies UnitType;
