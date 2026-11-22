// Unit type registry. To add a type: create a file next to these with the same shape
// (kind, formation, stats, models per faction, weaponSound, cost) and register it below.
// Maps and modes refer to types by id.
import rifles from './vanguard.ts';
import { BALTIC_85 } from './baltic85.js';
import atTeam from './atTeam.ts';
import mgTeam from './mgTeam.ts';
import tank from './tank.ts';
import artillery from './artillery.ts';
import crew from './crew.ts';
import aa from './aa.ts';
import towedAA from './towedAA.ts';
import airRadar from './airRadar.ts';
import gunMissile from './gunMissile.ts';
import mortar from './mortar.ts';
import ifv from './ifv.ts';
import scouts from './scouts.ts';
import sniper from './sniper.ts';
import engineers from './engineers.ts';
import reconVehicle from './reconVehicle.ts';
import tankDestroyer from './tankDestroyer.ts';
import heavyTank from './heavyTank.ts';
import cev from './cev.ts';
import rockets from './rockets.ts';
import spMortar from './spMortar.ts';
import observers from './observers.ts';
import cbRadar from './cbRadar.ts';
import manpads from './manpads.ts';
import sam from './sam.ts';
import recovery from './recovery.ts';
import ambulance from './ambulance.ts';
import bridgeLayer from './bridgeLayer.ts';
import mineClear from './mineClear.ts';
import jammer from './jammer.ts';
import commandPost from './commandPost.ts';
import airAssault from './airAssault.ts';
import kampfgruppe from './kampfgruppe.ts';
import { bunker, strongpoint, hq } from './fortifications.ts';
import { SHIPS_1985 } from './ships85.js';
import armies85 from './armies85.js';
import { ARMIES, armyHas } from '../factions.js';

export const UNIT_TYPES = {
  [rifles.id]: rifles,
  [atTeam.id]: atTeam,
  [mgTeam.id]: mgTeam,
  [tank.id]: tank,
  [artillery.id]: artillery,
  [scouts.id]: scouts,
  [sniper.id]: sniper,
  [engineers.id]: engineers,
  [ifv.id]: ifv,
  [mortar.id]: mortar,
  [aa.id]: aa,
  [towedAA.id]: towedAA,
  [airRadar.id]: airRadar,
  [gunMissile.id]: gunMissile,
  [reconVehicle.id]: reconVehicle,
  [tankDestroyer.id]: tankDestroyer,
  [heavyTank.id]: heavyTank,
  [cev.id]: cev,
  [rockets.id]: rockets,
  [spMortar.id]: spMortar,
  [observers.id]: observers,
  [cbRadar.id]: cbRadar,
  [manpads.id]: manpads,
  [sam.id]: sam,
  [recovery.id]: recovery,
  [ambulance.id]: ambulance,
  [bridgeLayer.id]: bridgeLayer,
  [mineClear.id]: mineClear,
  [jammer.id]: jammer,
  [commandPost.id]: commandPost,
  [airAssault.id]: airAssault,
  [kampfgruppe.id]: kampfgruppe,
  [crew.id]: crew,
  [bunker.id]: bunker,
  [strongpoint.id]: strongpoint,
  [hq.id]: hq,
  ...SHIPS_1985,   // the open-sea maps' warships (./ships85.js)
  ...BALTIC_85,    // the coastal maps' Pact ships and landing craft (./baltic85.js)
};

armies85(UNIT_TYPES); // the Northern Flank's and Korea's armies: Norway, the Marines, the ROK Army, the KPA (./armies85.js)

/** The 1985 roster as built here; data/epoch.js swaps UNIT_TYPES between this and 1945's. */
export const TYPES_1985 = { ...UNIT_TYPES };
/** The epoch's stand-ins for types it doesn't have (data/epoch.js): 'scouts' → 'rifles' … */
export const ALIAS = {};

/** The type for `id` in this epoch, or its stand-in, or undefined. */
export const typeOf = (id) => UNIT_TYPES[id] ?? UNIT_TYPES[ALIAS[id]];

export function getUnitType(id) {
  const type = typeOf(id);
  if (!type) throw new Error(`Unknown unit type "${id}"`);
  return type;
}

/** The same role, by type id, when an army lacks a type and names no stand-in of its own: the first of these it fields. */
const ROLE = {
  tank: ['heavyTank', 'tankDestroyer', 'reconVehicle'], heavyTank: ['tank', 'tankDestroyer'], tankDestroyer: ['tank', 'atTeam'], ddTank: ['tank'], pt76: ['reconVehicle', 'tank'],
  reconVehicle: ['scouts'], cev: ['engineers'], mineClear: ['engineers'],
  aa: ['gunMissile', 'towedAA', 'sam', 'manpads'], gunMissile: ['aa', 'towedAA', 'manpads'], towedAA: ['aa', 'gunMissile', 'manpads'], sam: ['aa', 'towedAA', 'manpads'],
  rockets: ['artillery'], spMortar: ['mortar'], mortar: ['spMortar'],
  atTeam: ['rifles'], sniper: ['scouts'], observers: ['scouts'], airAssault: ['rifles'], stormTroops: ['rifles'], kampfgruppe: ['rifles'], marines: ['rifles'], sailors: ['rifles'],
  frigate: ['destroyer', 'ptBoat'], destroyer: ['frigate'], lightCruiser: ['cruiser', 'destroyer'], cruiser: ['lightCruiser', 'destroyer'],
  battleship: ['oldBattleship', 'cruiser'], oldBattleship: ['battleship', 'cruiser'], carrier: ['escortCarrier'], escortCarrier: ['carrier'], missileSub: ['submarine'],
};

/**
 * What `army` puts on the field for type `id` (every spawn goes through here: GameEngine.spawnStack): `id` if the army fields it
 * (data/factions.js armyHas), else its stand-in from its own roster — the army's (`standIn` on its ARMIES entry, data/epoch.js;
 * null: none), else the first of ROLE[id] it fields — else null: no such unit. Fortifications and the hidden service types
 * (crews, landing craft, loose horses) are the map's or the mode's: as they are.
 */
export function standInFor(id, army) {
  const t = typeOf(id);
  if (!t || !ARMIES[army] || t.hidden || t.stats?.structure || armyHas(t, army)) return t ? id : null;
  const own = ARMIES[army].standIn ?? {};
  const pick = t.id in own ? [own[t.id]] : ROLE[t.id] ?? [];
  return pick.find((s) => s && UNIT_TYPES[s] && armyHas(UNIT_TYPES[s], army)) ?? null;
}
