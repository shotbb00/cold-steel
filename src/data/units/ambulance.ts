// Field ambulance — NATO M113 ambulance, Pact MT-LB medical. Wounded infantry near it are patched
// up (`heal`: hit points back over time), so a squad pulled back next to it returns to the line
// whole. Unarmed and marked with the red cross: enemy gunners pick other targets while there
// are any (`medical`). On its own it drives toward wounded men close by (systems/Support.js).
import { buildNatoAmbulance, buildPactAmbulance } from '../models/support.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'ambulance',
  name: 'Field Ambulance',
  shortName: 'Ambulance',
  category: 'support', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 140,

  formation: { count: 1, columns: 1, spacing: 10 },

  stats: {
    hp: 460,
    armor: 0.25,
    speed: 6,
    turnRate: 1.1,
    turretRate: 0,
    radius: 1.8,
    height: 2.6,
    aimHeight: 1.3,
    eyeHeight: 2.4,
    sight: 60,
    fov: 2.2,
    range: 1,             // unarmed
    aggroRange: 0,
    preferredRange: 40,
    leash: 14,
    weapon: 'rifle',
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
    medical: true,
    heal: { range: 18, rate: 9, seek: 120 },  // m, hp/s per man, m it looks for wounded
    crew: 2,
    bailChance: 0.8,
  },

  camera: { distance: 11, height: 4.6, shoulder: 2 },
  models: { nato: buildNatoAmbulance, pact: buildPactAmbulance },
  weaponSound: 'rifle',
  engine: 'engine.dieselSmall',
  tracks: 'tracks.light',
  variants: {
    nato: { name: 'M113 Ambulance', weapon: 'Unarmed · red cross', text: 'Wounded men near it are patched up and go back to the line. Unarmed: the enemy shoots at other things first, but don\'t push your luck.' },
    pact: { name: 'MT-LB Medical', weapon: 'Unarmed · red cross', text: 'The battalion aid post on tracks. Pull a shot-up section back beside it and it comes back whole.' },
  },
} satisfies UnitType;
