// The simulation's registry: terrain, cover, every stack, plus the spatial queries AI and
// projectiles need. "Groups" are what an AI can be ordered to attack (stacks: alive /
// faction / centroid / units). "Combatants" are the individual things a shot can hit
// (units: pos / radius / height / aimHeight / alive / receiveDamage). A coarse hash of all living combatants serves
// neighbour queries (separation, suppression).
import { enemyOf } from '../data/factions.js';
import { clamp, dist2DSq } from './math.js';

const HASH_CELL = 2.5;
const hashKey = (ix, iz) => (ix + 32768) * 65536 + (iz + 32768);

export class BattleWorld {
  constructor({ bounds, terrain, cover, bases = {} }) {
    this.bounds = bounds;
    this.terrain = terrain;
    this.cover = cover;
    this.bases = bases;
    this.time = 0; // simulation clock (seconds); advanced by GameEngine.step
    this.stacks = [];
    this.byId = new Map();
    this._combatants = new Map(); // faction -> array, rebuilt once per frame
    this._hash = new Map();
  }

  addStack(stack) {
    this.stacks.push(stack);
    this.byId.set(stack.id, stack);
  }

  stackById(id) {
    return this.byId.get(id) ?? null;
  }

  /** Rebuild per-faction combatant lists and the neighbour hash. Call once per frame. */
  refresh() {
    for (const list of this._combatants.values()) list.length = 0;
    for (const list of this._hash.values()) list.length = 0;
    for (const s of this.stacks) {
      if (!s.alive) continue;
      const list = this._list(s.faction);
      for (const u of s.units) {
        if (!u.alive) continue;
        list.push(u);
        this._hashAdd(u);
      }
    }
  }

  _list(faction) {
    let list = this._combatants.get(faction);
    if (!list) {
      list = [];
      this._combatants.set(faction, list);
    }
    return list;
  }

  _hashAdd(c) {
    const k = hashKey(Math.floor(c.pos.x / HASH_CELL), Math.floor(c.pos.z / HASH_CELL));
    let list = this._hash.get(k);
    if (!list) this._hash.set(k, (list = []));
    list.push(c);
  }

  /** Living combatants (any faction) within roughly r of pos, written into out. */
  neighbors(pos, r, out) {
    out.length = 0;
    const x0 = Math.floor((pos.x - r) / HASH_CELL);
    const x1 = Math.floor((pos.x + r) / HASH_CELL);
    const z0 = Math.floor((pos.z - r) / HASH_CELL);
    const z1 = Math.floor((pos.z + r) / HASH_CELL);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const list = this._hash.get(hashKey(ix, iz));
        if (list) for (const c of list) out.push(c);
      }
    }
    return out;
  }

  combatants(faction) {
    return this._list(faction);
  }

  stacksOf(faction) {
    return this.stacks.filter((s) => s.faction === faction && s.alive);
  }

  groups(faction) {
    return this.stacksOf(faction);
  }

  /** Nearest hostile group; `filter(g)` can exclude some (e.g. squads in flight). */
  nearestEnemyGroup(pos, faction, maxDist = Infinity, filter = null) {
    let best = null;
    let bestD = maxDist * maxDist;
    for (const g of this.groups(enemyOf(faction))) {
      if (filter && !filter(g)) continue;
      const d = dist2DSq(pos, g.centroid);
      if (d < bestD) { bestD = d; best = g; }
    }
    return best;
  }

  /** Nearest hostile unit; with `spottedOnly`, only ones our side can currently see. */
  nearestEnemyCombatant(pos, faction, maxDist = Infinity, spottedOnly = false) {
    let best = null;
    let bestD = maxDist * maxDist;
    for (const c of this.combatants(enemyOf(faction))) {
      if (!c.alive || (spottedOnly && !c.spotted)) continue;
      const d = dist2DSq(pos, c.pos);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  /** Ray vs combatant spheres of `faction`. Returns { target, distance } or null. */
  raycast(origin, dir, faction, maxDist = Infinity) {
    let best = null;
    let bestT = maxDist;
    for (const c of this.combatants(faction)) {
      if (!c.alive) continue;
      const r = c.radius * 1.4;
      const ox = c.pos.x - origin.x;
      const oy = c.pos.y + c.aimHeight - origin.y;
      const oz = c.pos.z - origin.z;
      const tc = ox * dir.x + oy * dir.y + oz * dir.z;
      if (tc < 0) continue;
      const d2 = ox * ox + oy * oy + oz * oz - tc * tc;
      if (d2 > r * r) continue;
      const t = tc - Math.sqrt(r * r - d2);
      if (t < bestT) { bestT = t; best = c; }
    }
    return best ? { target: best, distance: bestT } : null;
  }

  /** Gently push overlapping stack areas apart so squads don't pile into one blob. */
  separate(dt) {
    const k = Math.min(1, dt * 2);
    const list = this.stacks.filter((s) => s.alive);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.faction !== b.faction) continue;
        // only squads crowd each other; vehicles keep distance per unit, and a squad that is
        // holding a position stays put
        if (!a.usesCover || !b.usesCover) continue;
        const aHold = a.ai?.state === 'Defend';
        const bHold = b.ai?.state === 'Defend';
        if (aHold && bHold) continue;
        let dx = b.anchor.x - a.anchor.x;
        let dz = b.anchor.z - a.anchor.z;
        let d = Math.hypot(dx, dz);
        const min = (a.footprint + b.footprint) * 0.8;
        if (d >= min) continue;
        if (d < 1e-3) { dx = 0.01; dz = 0; d = 0.01; }
        const push = (min - d) * 0.5 * k * (aHold || bHold ? 2 : 1);
        if (!aHold) a.nudge((-dx / d) * push, (-dz / d) * push);
        if (!bHold) b.nudge((dx / d) * push, (dz / d) * push);
      }
    }
  }

  clampToBounds(v) {
    v.x = clamp(v.x, -this.bounds.x, this.bounds.x);
    v.z = clamp(v.z, -this.bounds.z, this.bounds.z);
    return v;
  }
}
