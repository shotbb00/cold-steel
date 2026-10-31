// Counter-battery radars — NATO AN/TPQ-37 Firefinder, Pact ARK-1 Rys. Unarmed. Parked for twelve
// seconds and faced toward the enemy (it watches a sector of about 90° in front), it tracks every
// shell, bomb and rocket fired from inside that sector within 500 m back to the gun: the gun shows
// on the map for 25 seconds, the radio calls out where, and your own mortars and artillery take
// it before anything else (systems/CounterBattery.js). The enemy's guns must keep moving — or die.
import { buildNatoFirefinder, buildPactARK1 } from '../models/support.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'cbRadar',
  name: 'Counter-Battery Radar',
  shortName: 'CB radar',
  category: 'fire', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 220,

  formation: { count: 1, columns: 1, spacing: 10 },

  stats: {
    hp: 450,
    armor: 0.05,
    speed: 5.5,
    turnRate: 0.8,
    radius: 1.8,
    height: 3.6,
    aimHeight: 1.4,
    eyeHeight: 2.4,
    sight: 60,
    fov: 1.8,
    range: 0,
    aggroRange: 0,
    preferredRange: 0,
    leash: 10,
    weapon: 'rifle',
    fireCooldown: 1,
    burst: 1,
    burstInterval: 0,
    damage: 0,
    boltSpeed: 400,
    spread: 0.02,
    magSize: 1,
    reloadTime: 1,
    breakMorale: 0,
    crew: 4,
    bailChance: 1,
    cbRadar: { range: 500, arc: 1.6, deploy: 12 },
  },
  factionStats: {
    pact: { hp: 620, armor: 0.2, speed: 4.6 }, // the MT-LBu is armoured, the M35 is a truck
  },

  camera: { distance: 13, height: 5.5, shoulder: 2 },
  models: { nato: buildNatoFirefinder, pact: buildPactARK1 },
  weaponSound: 'rifle',
  engine: 'engine.dieselSmall',
  variants: {
    nato: { name: 'AN/TPQ-37 Firefinder', weapon: 'unarmed', text: 'A phased-array radar that sees shells in flight and plots the gun that fired them. Park it facing the enemy: every battery that opens fire in its sector is handed to your guns.' },
    pact: { name: 'ARK-1 Rys', weapon: 'unarmed', text: 'An artillery reconnaissance radar on the MT-LBu. It watches the sky in front of it and gives the regiment\'s guns the NATO batteries\' positions.' },
  },
} satisfies UnitType;
