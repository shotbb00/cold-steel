// The Atlantic Wall, 1944 (the coastal maps: placed by the map, modes/landing.js; never bought). Fixed
// fortifications like data/units/fortifications.ts (structure: never move, never break, always known),
// at the ranges of a beach and its bluffs:
//   wn       a Widerstandsnest: an 88 in a flanking casemate (its embrasure along the beach: craft, tanks,
//            men) and two Tobruk MG pits (the MG 42's long bursts: men pinned on the sand)
//   battery  a coastal battery: two 155 mm guns in casemates inland — ships only (`shipsOnly`): the
//            destroyers have to find and silence it
import { buildMgPit } from '../models/fortifications.js';
import { buildCasemate } from '../models/atlanticWall.js';

const FIXED = { structure: true, speed: 0, turnRate: 0, fov: 6.3, eyeHeight: 2.2, aggroRange: 0, preferredRange: 0, leash: 0, breakMorale: 0, stance: 'stand' };

const TOBRUK = {
  ...FIXED, hp: 1000, armor: 0.62, radius: 2.3, height: 1.4, aimHeight: 0.9, sight: 600,
  range: 380, weapon: 'rifle', weaponSound: 'mg', turretRate: 1.8, fireCooldown: 0.1, magSize: 50, reloadTime: 5, // (the MG 42: a long ripping burst, then the barrel change)
  damage: 32, boltSpeed: 700, boltSize: 0.7, tracer: 0.3, spread: 0.034, suppressPower: 2.6, vsArmor: 0.03, pierce: 0,
};
const EIGHTY_EIGHT = {
  ...FIXED, hp: 2400, armor: 0.78, radius: 4, height: 3.4, aimHeight: 1.5, sight: 1000, flanking: true,
  range: 900, weapon: 'cannon', weaponSound: 'cannon', turretRate: 0.5, fireCooldown: 8, magSize: 60, reloadTime: 8,
  damage: 380, splash: 3, pierce: 0.6, boltSpeed: 800, boltSize: 1.6, tracer: 1, spread: 0.004, antiArmor: true, vsArmor: 1,
};
const ONE_FIVE_FIVE = {
  ...FIXED, hp: 4200, armor: 0.88, radius: 6, height: 5, aimHeight: 2.5, sight: 1800, shipsOnly: true,
  range: 1500, weapon: 'cannon', weaponSound: 'navalHeavy', turretRate: 0.25, fireCooldown: 28, magSize: 60, reloadTime: 28, // (slow and none too accurate against a ship under way: a few minutes to sink a destroyer that stays in reach)
  damage: 600, splash: 8, pierce: 0.5, boltSpeed: 600, boltSize: 2.4, tracer: 0, spread: 0.02, antiArmor: true, vsArmor: 1,
};

export const wn = {
  id: 'wn', name: 'Widerstandsnest', shortName: 'WN', kind: 'vehicle', hidden: true, cost: 700,
  formation: { count: 3, columns: 3, spacing: 14 },
  stats: TOBRUK,
  specialist: { count: 1, stats: EIGHTY_EIGHT },
  models: { nato: buildMgPit('nato'), pact: buildMgPit('pact') },
  specialistModels: { nato: buildCasemate(1, 5.2, 0.7)(), pact: buildCasemate(1, 5.2, 0.7)() },
  weaponSound: 'mg',
  variants: {
    nato: { name: 'Strongpoint', weapon: '88 mm in a casemate, 2 MGs', text: 'A gun casemate and two MG pits.' },
    pact: { name: 'Widerstandsnest', weapon: '8.8 cm PaK 43 in an H677 casemate, 2 × MG 42 in Tobruks', text: 'A resistance nest of the Atlantic Wall: the 88 in its casemate fires along the beach, not out to sea, so the ships can\'t see into it; the MG 42s in their Tobruks sweep the sand. Concrete: tank guns, the destroyers\' 5-inch and the engineers\' charges bring it down.' },
  },
};

export const battery = {
  id: 'battery', name: 'Coastal Battery', shortName: 'Battery', kind: 'vehicle', hidden: true, cost: 900,
  formation: { count: 2, columns: 2, spacing: 26 },
  stats: ONE_FIVE_FIVE,
  models: { nato: buildCasemate(1.5, 8, 1.2)(), pact: buildCasemate(1.5, 8, 1.2)() },
  weaponSound: 'navalHeavy',
  variants: {
    nato: { name: 'Coastal battery', weapon: '2 × 155 mm', text: 'Heavy guns in casemates, laid on the sea.' },
    pact: { name: 'Küstenbatterie', weapon: '2 × 15.5 cm K 418(f) in casemates', text: 'The coastal battery inland: two heavy guns that fire on ships only — the destroyers and the landing craft out at sea. Find it and silence it, or the boats will burn on the way in.' },
  },
};

export const ATLANTIC_WALL = { wn, battery };
