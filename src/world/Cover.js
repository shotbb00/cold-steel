// Cover system. Every cover object is a collider (oriented box or vertical cylinder) that
//   * blocks laser bolts (segmentHit),
//   * blocks movement (resolveCircle), and
//   * owns "cover spots": places to crouch, each protecting against threats from one direction.
// Soldiers claim spots so two never squeeze into the same one. A spatial grid keeps
// queries cheap as maps grow.
const SPOT_OFFSET = 0.8;   // metres from the cover surface
const SPOT_SPACING = 1.35; // metres between spots along a wall

let _tmin = 0;
let _tmax = 1;
function slab(a0, a1, lo, hi) {
  const d = a1 - a0;
  if (Math.abs(d) < 1e-9) return a0 >= lo && a0 <= hi;
  let t1 = (lo - a0) / d;
  let t2 = (hi - a0) / d;
  if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
  if (t1 > _tmin) _tmin = t1;
  if (t2 < _tmax) _tmax = t2;
  return _tmin <= _tmax;
}

/** Segment p0→p1 vs oriented box; returns entry t in 0..1 or -1. */
function segBox(c, p0, p1) {
  const ax = p0.x - c.x;
  const az = p0.z - c.z;
  const bx = p1.x - c.x;
  const bz = p1.z - c.z;
  _tmin = 0;
  _tmax = 1;
  if (!slab(ax * c.cos - az * c.sin, bx * c.cos - bz * c.sin, -c.hx, c.hx)) return -1;
  if (!slab(p0.y, p1.y, c.y, c.top)) return -1;
  if (!slab(ax * c.sin + az * c.cos, bx * c.sin + bz * c.cos, -c.hz, c.hz)) return -1;
  return _tmin;
}

/** Segment vs vertical cylinder; returns entry t in 0..1 or -1. */
function segCyl(c, p0, p1) {
  const fx = p0.x - c.x;
  const fz = p0.z - c.z;
  const dx = p1.x - p0.x;
  const dz = p1.z - p0.z;
  const cc = fx * fx + fz * fz - c.r * c.r;
  let t;
  if (cc <= 0) {
    t = 0;
  } else {
    const a = dx * dx + dz * dz;
    if (a < 1e-9) return -1;
    const b = 2 * (fx * dx + fz * dz);
    const disc = b * b - 4 * a * cc;
    if (disc < 0) return -1;
    t = (-b - Math.sqrt(disc)) / (2 * a);
    if (t < 0 || t > 1) return -1;
  }
  const y = p0.y + (p1.y - p0.y) * t;
  return y < c.y || y > c.top ? -1 : t;
}

export class CoverMap {
  constructor(terrain, cellSize = 8) {
    this.terrain = terrain;
    this.cell = cellSize;
    this.colliders = [];
    this.spots = [];
    this.colGrid = new Map();
    this.spotGrid = new Map();
    this.finalized = false;
    this._stamp = 1;
    this._colList = [];
    this._spotList = [];
  }

  // ---------------------------------------------------------------- spatial grid

  _key(ix, iz) {
    return (ix + 4096) * 8192 + (iz + 4096);
  }

  _insert(grid, item, x, z, r) {
    const c = this.cell;
    for (let ix = Math.floor((x - r) / c); ix <= Math.floor((x + r) / c); ix++) {
      for (let iz = Math.floor((z - r) / c); iz <= Math.floor((z + r) / c); iz++) {
        const k = this._key(ix, iz);
        let list = grid.get(k);
        if (!list) grid.set(k, (list = []));
        list.push(item);
      }
    }
  }

  _query(grid, x, z, r, out) {
    out.length = 0;
    const stamp = ++this._stamp;
    const c = this.cell;
    for (let ix = Math.floor((x - r) / c); ix <= Math.floor((x + r) / c); ix++) {
      for (let iz = Math.floor((z - r) / c); iz <= Math.floor((z + r) / c); iz++) {
        const list = grid.get(this._key(ix, iz));
        if (!list) continue;
        for (const item of list) {
          if (item._q !== stamp) {
            item._q = stamp;
            out.push(item);
          }
        }
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- building

  /** Wall-like cover. yaw rotates local +x (the wall's length) like Object3D.rotation.y. */
  addBox({ x, z, yaw = 0, length, thickness, height, spots = true }) {
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const hx = length / 2;
    const hz = thickness / 2;
    const ground = this.terrain.heightAt(x, z);
    const c = { type: 'box', x, z, y: ground - 0.6, top: ground + height, cos, sin, hx, hz, r: Math.hypot(hx, hz), spots: 0 };
    this.colliders.push(c);
    this._insert(this.colGrid, c, x, z, c.r);
    if (spots) {
      const n = Math.max(1, Math.floor(length / SPOT_SPACING));
      for (let i = 0; i < n; i++) {
        const lx = -hx + (i + 0.5) * (length / n);
        for (const side of [-1, 1]) {
          const lz = side * (hz + SPOT_OFFSET);
          // protect direction points from the spot through the wall
          this._addSpot(x + lx * cos + lz * sin, z - lx * sin + lz * cos, -side * sin, -side * cos, c);
        }
      }
    }
    return c;
  }

  /** Rock / column / trunk cover. */
  addCylinder({ x, z, radius, height, spots = true }) {
    const ground = this.terrain.heightAt(x, z);
    const c = { type: 'cyl', x, z, y: ground - 0.6, top: ground + height, r: radius, spots: 0 };
    this.colliders.push(c);
    this._insert(this.colGrid, c, x, z, radius);
    if (spots) {
      const ring = radius + SPOT_OFFSET;
      const n = Math.max(4, Math.round((Math.PI * 2 * ring) / SPOT_SPACING));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + 0.3;
        const dx = Math.cos(a);
        const dz = Math.sin(a);
        this._addSpot(x + dx * ring, z + dz * ring, -dx, -dz, c);
      }
    }
    return c;
  }

  _addSpot(x, z, dirX, dirZ, collider, omni = false) {
    this.spots.push({ x, y: 0, z, dirX, dirZ, collider, height: 0, occupant: null, omni });
  }

  /** Drop spots that ended up inside other cover or off the map, then index them. */
  finalize(bounds) {
    this.bounds = bounds;
    this.finalizeFrom(0);
    this.finalized = true;
  }

  /** Validate and index spots from `start` on (used again for structures built mid-battle). */
  finalizeFrom(start) {
    const b = this.bounds;
    const keep = this.spots.slice(0, start);
    for (let i = start; i < this.spots.length; i++) {
      const s = this.spots[i];
      if (Math.abs(s.x) > b.x || Math.abs(s.z) > b.z) continue;
      if (!s.omni && this.pointBlocked(s.x, s.z, 0.45)) continue;
      s.y = this.terrain.heightAt(s.x, s.z);
      s.height = s.collider.top - s.y;
      if (s.height < 0.8) continue; // too low to hide behind
      s.collider.spots++;
      keep.push(s);
      this._insert(this.spotGrid, s, s.x, s.z, 0);
    }
    this.spots = keep;
  }

  /** A wall-like structure built during the battle (sandbags). */
  addStructureBox(opts) {
    const start = this.spots.length;
    const c = this.addBox(opts);
    this.finalizeFrom(start);
    return c;
  }

  /**
   * Trench positions along a dug line: they shelter from every direction (`omni`), with the
   * parapet `collider` deciding how high the cover reaches.
   */
  addTrenchSpots({ x, z, yaw, length, collider, spacing = 1.3 }) {
    const start = this.spots.length;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const n = Math.max(1, Math.floor(length / spacing));
    for (let i = 0; i < n; i++) {
      const lx = -length / 2 + (i + 0.5) * (length / n);
      this._addSpot(x + lx * cos, z - lx * sin, sin, cos, collider, true);
    }
    this.finalizeFrom(start);
  }

  // ---------------------------------------------------------------- queries

  _distTo(c, x, z) {
    const dx = x - c.x;
    const dz = z - c.z;
    if (c.type === 'cyl') return Math.max(0, Math.hypot(dx, dz) - c.r);
    const lx = dx * c.cos - dz * c.sin;
    const lz = dx * c.sin + dz * c.cos;
    const ex = lx - Math.max(-c.hx, Math.min(c.hx, lx));
    const ez = lz - Math.max(-c.hz, Math.min(c.hz, lz));
    return Math.hypot(ex, ez);
  }

  /** Height of collider c above the ground it stands on. */
  _height(c) {
    return c.top - c.y - 0.6;
  }

  /** `climb`: cover lower than this doesn't count (infantry vaults it). */
  pointBlocked(x, z, margin = 0, climb = 0) {
    for (const c of this._query(this.colGrid, x, z, margin, this._colList)) {
      if (climb && this._height(c) < climb) continue;
      if (this._distTo(c, x, z) < margin) return true;
    }
    return false;
  }

  /** How high the cover lower than `climb` under a circle reaches above the ground (0: none). */
  climbHeight(x, z, radius, climb) {
    let h = 0;
    for (const c of this._query(this.colGrid, x, z, radius, this._colList)) {
      const ch = this._height(c);
      if (ch < climb && ch > h && this._distTo(c, x, z) < radius) h = ch;
    }
    return h;
  }

  /** Push a circle (unit footprint) out of any cover it overlaps (`climb`: but over cover lower than that). Mutates pos. */
  resolveCircle(pos, radius, climb = 0) {
    for (const c of this._query(this.colGrid, pos.x, pos.z, radius, this._colList)) {
      if (climb && this._height(c) < climb) continue;
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      if (c.type === 'cyl') {
        const min = c.r + radius;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 1e-3;
        pos.x = c.x + (dx / d) * min;
        pos.z = c.z + (dz / d) * min;
        continue;
      }
      const lx = dx * c.cos - dz * c.sin;
      const lz = dx * c.sin + dz * c.cos;
      const ex = lx - Math.max(-c.hx, Math.min(c.hx, lx));
      const ez = lz - Math.max(-c.hz, Math.min(c.hz, lz));
      const d2 = ex * ex + ez * ez;
      if (d2 >= radius * radius) continue;
      let px;
      let pz;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        px = (ex / d) * (radius - d);
        pz = (ez / d) * (radius - d);
      } else {
        const ox = c.hx - Math.abs(lx);
        const oz = c.hz - Math.abs(lz);
        if (ox < oz) { px = Math.sign(lx || 1) * (ox + radius); pz = 0; } else { px = 0; pz = Math.sign(lz || 1) * (oz + radius); }
      }
      pos.x += px * c.cos + pz * c.sin;
      pos.z += -px * c.sin + pz * c.cos;
    }
  }

  /** First cover hit along p0→p1 (t in 0..1) or -1. `ignore` skips one collider. */
  segmentHit(p0, p1, ignore = null) {
    const mx = (p0.x + p1.x) / 2;
    const mz = (p0.z + p1.z) / 2;
    const r = Math.hypot(p1.x - p0.x, p1.z - p0.z) / 2 + 0.1;
    let best = Infinity;
    let hit = null;
    for (const c of this._query(this.colGrid, mx, mz, r, this._colList)) {
      if (c === ignore) continue;
      const t = c.type === 'box' ? segBox(c, p0, p1) : segCyl(c, p0, p1);
      if (t >= 0 && t < best) { best = t; hit = c; }
    }
    this.lastHit = hit;
    return hit ? best : -1;
  }

  /** How well a spot shields from a threat at (x, z): 1 = squarely behind cover, <0 = exposed. */
  protection(spot, x, z) {
    const tx = x - spot.x;
    const tz = z - spot.z;
    const d = Math.hypot(tx, tz) || 1;
    const p = (tx * spot.dirX + tz * spot.dirZ) / d;
    return spot.omni ? Math.max(0.75, p) : p; // a trench covers you from every side
  }

  /**
   * Best free spot near `center` (within `leash`) that shields `unit` from `threat`,
   * preferring spots close to the unit and within weapon `range` of the threat.
   */
  findSpot(unit, threat, center, leash, range) {
    let best = null;
    let bestScore = Infinity;
    for (const s of this._query(this.spotGrid, center.x, center.z, leash, this._spotList)) {
      if (s.occupant && s.occupant !== unit && s.occupant.alive) continue;
      const cx = s.x - center.x;
      const cz = s.z - center.z;
      const dc2 = cx * cx + cz * cz;
      if (dc2 > leash * leash) continue;
      const tx = threat.x - s.x;
      const tz = threat.z - s.z;
      const dt = Math.hypot(tx, tz);
      if (dt < 2) continue;
      const protect = s.omni ? Math.max(0.75, (tx * s.dirX + tz * s.dirZ) / dt) : (tx * s.dirX + tz * s.dirZ) / dt;
      if (protect < 0.45) continue;
      let score = Math.hypot(s.x - unit.pos.x, s.z - unit.pos.z) + Math.sqrt(dc2) * 0.35 - protect * 4;
      if (s.height > 1.9) score -= 0.5; // full cover is nicer
      if (s.omni) score -= 2;           // and a trench is nicest
      const g = unit.stack?.garrison;
      if (g) score += s.interior === g ? -6 : 5; // a garrison stays inside its walls
      if (dt > range) score += (dt - range) * 1.5;
      if (dt < range * 0.35) score += (range * 0.35 - dt) * 1.5;
      if (score < bestScore) { bestScore = score; best = s; }
    }
    return best;
  }

  claim(spot, unit) {
    if (unit.coverSpot && unit.coverSpot !== spot) this.release(unit);
    spot.occupant = unit;
    unit.coverSpot = spot;
  }

  release(unit) {
    const s = unit.coverSpot;
    if (s && s.occupant === unit) s.occupant = null;
    unit.coverSpot = null;
    unit.atCover = false; // (a unit under direct control never recomputes it)
  }

  /**
   * A cover object to move a whole stack to: within `maxHop` of `from`, near `ideal` distance
   * from `target`, and (when still far away) making at least `minAdvance` metres of progress.
   * Returns a point on our side of it, or null.
   */
  findCoverArea(from, target, { ideal, maxHop = 30, minAdvance = 6 } = {}) {
    const dFT = Math.hypot(target.x - from.x, target.z - from.z);
    let best = null;
    let bestScore = Infinity;
    for (const c of this.colliders) {
      if (c.spots < 2) continue;
      const dF = Math.hypot(c.x - from.x, c.z - from.z);
      if (dF > maxHop) continue;
      const dT = Math.hypot(c.x - target.x, c.z - target.z);
      if (dFT > ideal + 4 && dFT - dT < minAdvance) continue;
      if (dT < ideal * 0.45) continue;
      const score = Math.abs(dT - ideal) + dF * 0.35 + this.rand01(c) * 2;
      if (score < bestScore) { bestScore = score; best = c; }
    }
    if (!best) return null;
    const ox = from.x - best.x;
    const oz = from.z - best.z;
    const d = Math.hypot(ox, oz) || 1;
    const back = best.r + 1.5;
    return { x: best.x + (ox / d) * back, z: best.z + (oz / d) * back };
  }

  /** Stable per-collider jitter so equally good options don't all pick the same one. */
  rand01(c) {
    if (c._rnd === undefined) c._rnd = Math.random();
    return c._rnd;
  }
}
