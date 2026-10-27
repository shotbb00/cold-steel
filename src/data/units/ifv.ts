// Infantry fighting vehicles, pairs — NATO M2 Bradley, Pact BMP-2 — carrying an eight-man
// rifle squad between them (systems/Transport.js: U unloads, right-click an IFV with infantry
// selected to board). The autocannon chews up infantry and light vehicles; an anti-tank missile
// (TOW / Konkurs, `atgm`) reaches out to 300 m against tanks, a few per vehicle with a long
// reload. Armour stops small arms and splinters, not tank rounds.
import { buildNatoBradley } from '../models/natoBradley.js';
import { buildPactBMP2 } from '../models/pactBMP2.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'ifv',
  name: 'Infantry Fighting Vehicles',
  shortName: 'IFVs',
  category: 'armour', // reinforcement window section
  kind: 'vehicle',
  role: 'frontline',
  cost: 420,             // with the squad riding inside

  formation: { count: 2, columns: 2, spacing: 10 },

  stats: {
    nightSight: { nato: 0.9, pact: 0.6 },  // Bradley thermal vs BMP-2 infrared
    hp: 820,
    armor: 0.42,
    speed: 6,
    turnRate: 1,
    turretRate: 1.4,
    radius: 1.9,
    height: 2.7,
    aimHeight: 1.4,
    eyeHeight: 2.6,
    sight: 75,
    fov: 1.8,
    range: 300,          // the missile's reach (targets beyond gunRange get only the missile)
    gunRange: 170,
    aggroRange: 130,
    preferredRange: 100,
    leash: 14,
    weapon: 'autocannon',
    fireCooldown: 0.28,
    burst: 1,
    burstInterval: 0,
    damage: 120,
    splash: 1.2,
    pierce: 0.3,
    vsArmor: 0.35,
    boltSpeed: 650,
    boltSize: 0.9,
    tracer: 0.5,
    spread: 0.008,
    magSize: 10,         // ten-round bursts
    reloadTime: 3,
    breakMorale: 0,
    antiArmor: true,     // hunts vehicles first — the missile is for them
    playerFireInterval: 0.28,
    atgm: { range: 300, damage: 650, pierce: 0.85, splash: 1.5, speed: 150, reload: 22, count: 3 },
    smoke: { charges: 2 },
    carries: { unit: 'rifles', count: 8 },
    crew: 3,
    bailChance: 0.5,
  },

  camera: { distance: 12, height: 5, shoulder: 2.2 },
  models: { nato: buildNatoBradley, pact: buildPactBMP2 },
  weaponSound: 'autocannon',
  engine: { nato: 'engine.diesel', pact: 'engine.dieselSmall' },
  tracks: 'tracks.light',
  variants: {
    nato: { name: 'M2 Bradley', weapon: '25 mm M242 Bushmaster · TOW', text: 'Carries a squad into the fight and stays to support it: the Bushmaster shreds infantry and light vehicles, the TOW kills tanks at 300 m. U unloads the squad.' },
    pact: { name: 'BMP-2', weapon: '30 mm 2A42 · 9M113 Konkurs', text: 'Fast, low and hard-hitting, its 30 mm cannon fires high into buildings and tree lines. Thin armour: keep it out of the tanks’ sights. U unloads the squad.' },
  },
} satisfies UnitType;
