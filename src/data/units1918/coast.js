// Zeebrugge's fixed guns (the 1918 coastal map: placed by the map, modes/landing.js `forts`; never bought), as the
// Atlantic Wall's (data/units45/atlanticWall.js): structures that never move nor break, found by eye or by their fire.
//   moleBattery   three 10.5 cm naval guns on the Mole's head: the ships first (`seaward`), then the men on the Mole —
//                 the battery the storming parties were landed to silence before the blockships came round it
//   coastBattery  two heavy naval guns behind the dunes: ships only (`shipsOnly`), slow, big — the destroyers and
//                 the monitors have to find and silence them
import { buildMoleGun, buildCoastGun } from '../models/coast1918.js';

const FIXED = { structure: true, concealed: true, stealth: 0.55, speed: 0, turnRate: 0, fov: 6.3, eyeHeight: 2.2, aggroRange: 0, preferredRange: 0, leash: 0, breakMorale: 0, stance: 'stand' };

export const moleBattery = {
  id: 'moleBattery', name: 'Mole Battery', shortName: 'Mole guns', kind: 'vehicle', category: 'fire', hidden: true, cost: 700,
  formation: { count: 3, columns: 3, spacing: 14 },
  weaponSound: 'cannon',
  stats: {
    ...FIXED, hp: 1500, armor: 0.45, radius: 3.2, height: 2.6, aimHeight: 1.3, sight: 1300, seaward: true,
    range: 1300, weapon: 'cannon', turretRate: 0.6, fireCooldown: 1, magSize: 1, reloadTime: 6, damage: 260, splash: 3.5, pierce: 0.5,
    boltSpeed: 700, boltSize: 1.4, tracer: 0.6, spread: 0.012, antiArmor: true, vsArmor: 1,
  },
  models: { nato: buildMoleGun(), pact: buildMoleGun() },
  variants: {
    nato: { name: 'Mole battery', weapon: '3 × 10.5 cm', text: 'Naval guns on the Mole\'s head.' },
    pact: { name: 'Molenkopfbatterie', weapon: '3 × 10.5 cm SK L/45', text: 'Three naval guns behind their shields on the lighthouse extension, laid across the harbour mouth: every ship that comes round the Mole-head passes under them at a few hundred metres. Silence them before the blockships go in.' },
  },
};

export const coastBattery = {
  id: 'coastBattery', name: 'Coastal Battery', shortName: 'Battery', kind: 'vehicle', category: 'fire', hidden: true, cost: 900,
  formation: { count: 2, columns: 2, spacing: 30 },
  weaponSound: 'navalHeavy',
  stats: {
    ...FIXED, hp: 4000, armor: 0.7, radius: 7, height: 4, aimHeight: 2.5, sight: 2200, shipsOnly: true,
    range: 2000, weapon: 'cannon', turretRate: 0.2, fireCooldown: 28, magSize: 60, reloadTime: 28,
    damage: 1100, splash: 9, pierce: 0.6, boltSpeed: 650, boltSize: 2.6, tracer: 0, spread: 0.018, antiArmor: true, vsArmor: 1,
  },
  models: { nato: buildCoastGun(), pact: buildCoastGun() },
  variants: {
    nato: { name: 'Coastal battery', weapon: '2 × 28 cm', text: 'Heavy guns in open emplacements, laid on the sea.' },
    pact: { name: 'Küstenbatterie', weapon: '2 × 28 cm SK L/40', text: 'Heavy naval guns on turntables behind the dunes, firing on ships only: slow, but one shell breaks a destroyer\'s back. Find them for the monitors.' },
  },
};

export const COAST_1918 = { moleBattery, coastBattery };
