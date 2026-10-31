// Electronic warfare jammers — NATO AN/MLQ-34 TACJAM, Pact R-330. Unarmed. Parked for ten seconds
// with the mast up, it jams the other side's radio nets within 160 m (systems/Jamming.js): air
// strikes and gas called in there come 8 s late and up to 25 m off the mark, forward observers
// there lose their fire-direction bonus, radars there go blind. But a transmitter is easy to find:
// while it jams, the enemy sees it on the map.
import { buildNatoTACJAM, buildPactR330 } from '../models/support.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'jammer',
  name: 'EW Jammer',
  shortName: 'Jammer',
  category: 'support', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 200,

  formation: { count: 1, columns: 1, spacing: 10 },

  stats: {
    hp: 450,
    armor: 0.1,
    speed: 5,
    turnRate: 0.9,
    radius: 1.7,
    height: 3.4,
    aimHeight: 1.4,
    eyeHeight: 2.4,
    sight: 60,
    fov: 2.0,
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
    crew: 3,
    bailChance: 1,
    jammer: { radius: 160, deploy: 10 },
  },

  camera: { distance: 13, height: 5.5, shoulder: 2 },
  models: { nato: buildNatoTACJAM, pact: buildPactR330 },
  weaponSound: 'rifle',
  engine: 'engine.dieselSmall',
  tracks: 'tracks.light',
  variants: {
    nato: { name: 'AN/MLQ-34 TACJAM', weapon: 'unarmed', text: 'A tactical jammer on a tracked carrier. Parked with its mast up, it smothers the Pact radio nets around it: their air strikes come late and wide, their observers and radars go deaf and blind.' },
    pact: { name: 'R-330 jammer', weapon: 'unarmed', text: 'A radio-electronic combat station on a Ural. It turns NATO\'s helicopters and artillery calls into guesswork — and every NATO direction-finder knows where it is.' },
  },
} satisfies UnitType;
