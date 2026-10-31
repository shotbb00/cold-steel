// Air search radars — NATO AN/MPQ-49 FAAR, Pact P-19. Unarmed, but the eyes of your air defence:
// once it has stood still for ten seconds (the antenna turns), every enemy aircraft that comes on
// station within 900 m is reported on the radio with its bearing, towed AA guns within 380 m get
// their full reach instead of what the gunner can see, and every other air defence unit there
// reaches a fifth further. The enemy's gunners go for it first.
import { buildNatoFAAR, buildPactP19 } from '../models/support.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'airRadar',
  name: 'Air Search Radar',
  shortName: 'Radar',
  category: 'airdefence', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 180,

  formation: { count: 1, columns: 1, spacing: 10 },

  stats: {
    hp: 380,
    armor: 0.05,
    speed: 6,
    turnRate: 1.0,
    radius: 1.6,
    height: 3.4,
    aimHeight: 1.4,
    eyeHeight: 2.4,
    sight: 60,
    fov: 2.2,
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
    airRadar: { cover: 380, detect: 900, deploy: 10 },
  },

  camera: { distance: 12, height: 5, shoulder: 2 },
  models: { nato: buildNatoFAAR, pact: buildPactP19 },
  weaponSound: 'rifle',
  engine: 'engine.dieselSmall',
  variants: {
    nato: { name: 'AN/MPQ-49 FAAR', weapon: 'unarmed', text: 'The Forward Area Alerting Radar on a Gama Goat. Parked, it warns of every helicopter coming in and guides your Vulcans and Chaparrals onto it.' },
    pact: { name: 'P-19 Danube', weapon: 'unarmed', text: 'A search radar on a ZiL-131. Once its antenna turns, no NATO helicopter arrives unannounced, and the regiment\'s ZU-23s and Strelas see it coming.' },
  },
} satisfies UnitType;
