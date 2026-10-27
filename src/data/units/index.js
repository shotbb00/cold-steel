// Unit type registry. To add a type: create a file next to these with the same shape
// (kind, formation, stats, models per faction, weaponSound, cost) and register it below.
// Maps and modes refer to types by id.
import rifles from './vanguard.ts';
import atTeam from './atTeam.ts';
import mgTeam from './mgTeam.ts';
import tank from './tank.ts';
import artillery from './artillery.ts';
import crew from './crew.ts';
import aa from './aa.ts';
import mortar from './mortar.ts';
import ifv from './ifv.ts';
import scouts from './scouts.ts';
import engineers from './engineers.ts';
import reconVehicle from './reconVehicle.ts';
import tankDestroyer from './tankDestroyer.ts';
import heavyTank from './heavyTank.ts';
import rockets from './rockets.ts';
import spMortar from './spMortar.ts';
import observers from './observers.ts';
import manpads from './manpads.ts';
import sam from './sam.ts';
import recovery from './recovery.ts';
import ambulance from './ambulance.ts';
import airAssault from './airAssault.ts';
import { bunker, strongpoint, hq } from './fortifications.ts';

export const UNIT_TYPES = {
  [rifles.id]: rifles,
  [atTeam.id]: atTeam,
  [mgTeam.id]: mgTeam,
  [tank.id]: tank,
  [artillery.id]: artillery,
  [scouts.id]: scouts,
  [engineers.id]: engineers,
  [ifv.id]: ifv,
  [mortar.id]: mortar,
  [aa.id]: aa,
  [reconVehicle.id]: reconVehicle,
  [tankDestroyer.id]: tankDestroyer,
  [heavyTank.id]: heavyTank,
  [rockets.id]: rockets,
  [spMortar.id]: spMortar,
  [observers.id]: observers,
  [manpads.id]: manpads,
  [sam.id]: sam,
  [recovery.id]: recovery,
  [ambulance.id]: ambulance,
  [airAssault.id]: airAssault,
  [crew.id]: crew,
  [bunker.id]: bunker,
  [strongpoint.id]: strongpoint,
  [hq.id]: hq,
};

export function getUnitType(id) {
  const type = UNIT_TYPES[id];
  if (!type) throw new Error(`Unknown unit type "${id}"`);
  return type;
}
