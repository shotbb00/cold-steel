// An airfield (tester feedback 2026-11-17): where a side's regular squadrons are based on land and coastal
// maps (and on an island at sea) — systems/Airfields.js places it and lays its runway; systems/AirStrike.js
// launches from it and recovers to it exactly as from a carrier (stats.carrier: the runway as her deck, its
// `airGroup` the hangar). It cannot be destroyed, only put out of action: below CLOSED of its strength no
// flight takes off until sappers or an engineer vehicle have repaired it (systems/Support.js). The unit is
// its control tower; the runway and the hangars are the map's (props). Not for sale (hidden).
import { P, merge, pair, grime } from './geometry.js';
import { vehicle } from '../models/support.js';

export const CLOSED = 0.6; // below this share of its strength the runway is shut

const CONCRETE = 0x8e8c86, DARK = 0x3a3c3e, GLASS = 0x1b2126, ORANGE = 0xc86a2a;
const buildTower = vehicle(() => ({
  hull: grime(merge([
    P.box(6, 7, 6, { y: 3.5, color: CONCRETE }),                                   // the tower
    P.box(7.2, 2.4, 7.2, { y: 8.2, color: GLASS }),                                // the glazed cab
    P.box(7.6, 0.4, 7.6, { y: 9.6, color: DARK }),
    P.cyl(0.08, 0.08, 4, { x: 2.5, y: 11.6, color: DARK }, 6),                       // antennas
    P.box(1.6, 0.2, 0.2, { x: 2.5, y: 13.4, color: DARK }),
    P.box(14, 3.2, 8, { x: -11, y: 1.6, color: CONCRETE }),                         // the operations block
    ...pair((s) => P.box(0.3, 1.2, 2.4, { x: -11 + s * 7.1, y: 1.0, z: 0, color: DARK })),
    P.cyl(0.06, 0.06, 6, { x: 12, y: 3, color: DARK }, 6),                           // the windsock's mast…
    P.cyl(0.35, 0.15, 1.8, { x: 12.9, y: 5.8, rz: Math.PI / 2, color: ORANGE }, 8),   // …and its sock
  ]), 4, 0, 0.25),
}));

export const AIRFIELD = {
  id: 'airfield',
  name: 'Airfield',
  shortName: 'Airfield',
  kind: 'vehicle',
  hidden: true,
  cost: 0,
  category: 'support',
  formation: { count: 1, columns: 1, spacing: 10 },
  stats: {
    structure: true, airfield: true, indestructible: true,
    speed: 0, turnRate: 0, fov: 6.3, eyeHeight: 10, sight: 160, aggroRange: 0, preferredRange: 0, leash: 0, breakMorale: 0, stance: 'stand',
    hp: 5000, armor: 0.55, radius: 14, height: 10, aimHeight: 4, range: 0, damage: 0, fireCooldown: 1, magSize: 1, reloadTime: 1,
    carrier: { land: true, deck: 0.3, deckLen: 240, slots: 1, airGroup: {} }, // (set per airfield when it is placed)
  },
  models: { nato: buildTower, pact: buildTower },
  variants: {
    nato: { name: 'Airfield', weapon: 'unarmed', text: 'Where your squadrons are based: they take off from its runway and land on it to rearm. Shell or bomb it hard enough and the runway is shut until sappers repair it. Select it to launch its squadrons.' },
    pact: { name: 'Airfield', weapon: 'unarmed', text: 'Where your squadrons are based: they take off from its runway and land on it to rearm. Shell or bomb it hard enough and the runway is shut until sappers repair it. Select it to launch its squadrons.' },
  },
};
