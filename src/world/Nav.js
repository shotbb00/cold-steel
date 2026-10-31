// Where a body of a given size can go, and the way there.
//   A grid over the map (CELL m) holding, for each cell centre, how far it is from the nearest
//   cover of any kind (vehicles are stopped by all of it), from cover too high to climb (men
//   vault the rest: CLIMB) and from deep water. A body of radius r may stand where that
//   clearance is at least r (water: WATER_CLEAR, a body may hang over a deck's edge). Bridges
//   are terrain, so they are open ground; a blown one is water again.
//   path(from, to, foot, r)    A* over the grid, pulled tight to its corners
//   visible(a, b, foot, r)     a straight walk from a to b is open
//   clearance(x, z, foot)      room round a point (how wide a formation fits)
// Cover added mid-battle (CoverMap.onAdd) and terrain changes (bridges blown or laid) update it.

export const CLIMB = 1.2;  // m: men climb over cover lower than this
const CELL = 1;            // m
const SEED = 3;            // m round cover where clearance is measured exactly (further out: propagated)
const WATER_CLEAR = 0.8;   // m a body's centre keeps from deep water
const LOW_COST = 3;        // men: a cell over a low wall costs this much more (climbing is slow)
const WALL_COST = 0.8;     // extra cost per metre closer than 1.5 m beyond the body's own clearance: keep off walls
const MAX = 200000;        // cells searched at most (then: as near as it got); a man to his place: LOCAL
export const LOCAL = 6000;
const WEIGHT = 1.15;       // a little greedy: much less searching for paths a few % longer
const SNAP = 10;           // m searched round a blocked start or goal for open ground

export class NavGrid {
  constructor(world) {
    const { bounds } = world;
    this.world = world;
    this.ox = -bounds.x;
    this.oz = -bounds.z;
    this.nx = Math.ceil((bounds.x * 2) / CELL) + 1;
    this.nz = Math.ceil((bounds.z * 2) / CELL) + 1;
    const n = this.nx * this.nz;
    this.seedAll = new Float32Array(n).fill(Infinity);
    this.seedTall = new Float32Array(n).fill(Infinity);
    this.dAll = new Float32Array(n);
    this.dTall = new Float32Array(n);
    this.dWater = new Float32Array(n);
    // A* scratch, reused (`stamp` marks what belongs to the current search)
    this.g = new Float32Array(n);
    this.f = new Float32Array(n);
    this.from = new Int32Array(n);
    this.seen = new Uint32Array(n);
    this.shut = new Uint32Array(n);
    this.stamp = 0;
    this.version = 0; // bumped on every change: routes planned before may be wrong
    for (const c of world.cover.colliders) this.seed(c);
    this.water();
    this.dirty = true;
  }

  // ---------------------------------------------------------------- building

  /** Cover `c` (a CoverMap collider) into the seeds: exact distances in the cells round it. */
  seed(c) {
    const cover = this.world.cover;
    const tall = cover._height(c) >= CLIMB;
    const r = c.r + SEED;
    const [i0, j0] = this.cellOf(c.x - r, c.z - r);
    const [i1, j1] = this.cellOf(c.x + r, c.z + r);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = j * this.nx + i;
        const d = cover._distTo(c, this.ox + i * CELL, this.oz + j * CELL);
        if (d < this.seedAll[k]) this.seedAll[k] = d;
        if (tall && d < this.seedTall[k]) this.seedTall[k] = d;
      }
    }
  }

  addCollider(c) {
    this.seed(c);
    this.dirty = true;
  }

  /** Deep water from the terrain (again: a bridge blown or laid). */
  water() {
    const d = this.dWater;
    const w = this.world.river?.water;
    const terrain = this.world.terrain;
    for (let j = 0, k = 0; j < this.nz; j++) {
      for (let i = 0; i < this.nx; i++, k++) {
        d[k] = w && w.level - terrain.heightAt(this.ox + i * CELL, this.oz + j * CELL) > w.deep ? 0 : Infinity;
      }
    }
    this.waterDirty = true;
    this.dirty = true;
  }

  /** Distance fields from the seeds: two chamfer passes each. */
  ensure() {
    if (!this.dirty) return;
    this.dAll.set(this.seedAll);
    this.dTall.set(this.seedTall);
    chamfer(this.dAll, this.nx, this.nz);
    chamfer(this.dTall, this.nx, this.nz);
    if (this.waterDirty) chamfer(this.dWater, this.nx, this.nz);
    this.waterDirty = false;
    this.dirty = false;
    this.version++;
  }

  // ---------------------------------------------------------------- queries

  cellOf(x, z) {
    const i = Math.round((x - this.ox) / CELL);
    const j = Math.round((z - this.oz) / CELL);
    return [Math.max(0, Math.min(this.nx - 1, i)), Math.max(0, Math.min(this.nz - 1, j))];
  }

  index(x, z) {
    const [i, j] = this.cellOf(x, z);
    return j * this.nx + i;
  }

  /** May a body of radius r (men: `foot`) stand in cell k? */
  open(k, foot, r) {
    return (foot ? this.dTall : this.dAll)[k] >= r && this.dWater[k] >= WATER_CLEAR;
  }

  passable(x, z, foot, r) {
    this.ensure();
    return this.open(this.index(x, z), foot, r);
  }

  /** Room round (x, z): to the nearest cover the body can't pass, or deep water. */
  clearance(x, z, foot) {
    this.ensure();
    const k = this.index(x, z);
    return Math.min((foot ? this.dTall : this.dAll)[k], this.dWater[k]);
  }

  /** A straight walk from a to b is open all the way (a's own spot aside). */
  visible(a, b, foot, r) {
    this.ensure();
    const l = Math.hypot(b.x - a.x, b.z - a.z);
    for (let s = Math.min(0.5, l); s <= l; s += 0.5) {
      if (!this.open(this.index(a.x + ((b.x - a.x) * s) / l, a.z + ((b.z - a.z) * s) / l), foot, r)) return false;
    }
    return l < 0.5 || this.open(this.index(b.x, b.z), foot, r);
  }

  /** The open cell nearest (x, z) (within SNAP m), or -1. */
  snap(x, z, foot, r) {
    const k0 = this.index(x, z);
    if (this.open(k0, foot, r)) return k0;
    const [ci, cj] = this.cellOf(x, z);
    for (let ring = 1; ring <= SNAP / CELL; ring++) {
      let best = -1;
      let bd = Infinity;
      for (let j = cj - ring; j <= cj + ring; j++) {
        for (let i = ci - ring; i <= ci + ring; i++) {
          if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== ring || i < 0 || j < 0 || i >= this.nx || j >= this.nz) continue;
          const k = j * this.nx + i;
          const d = (i - ci) ** 2 + (j - cj) ** 2;
          if (d < bd && this.open(k, foot, r)) { bd = d; best = k; }
        }
      }
      if (best >= 0) return best;
    }
    return -1;
  }

  point(k) {
    return { x: this.ox + (k % this.nx) * CELL, z: this.oz + Math.floor(k / this.nx) * CELL };
  }

  /**
   * The way from `from` to `to` for a body of radius r (men: `foot`, who climb low walls but
   * would rather not): { pts: corners then the goal, reached }. When there is no way there it
   * leads as near as it gets (reached: false); null when even the start is boxed in.
   * `max`: cells searched at most.
   */
  path(from, to, foot, r, max = MAX) {
    if (!Number.isFinite(from.x + from.z + to.x + to.z)) return null;
    this.ensure();
    if (this.visible(from, to, foot, r)) return { pts: [{ x: to.x, z: to.z }], reached: true };
    const start = this.snap(from.x, from.z, foot, r);
    const goal = this.snap(to.x, to.z, foot, r);
    if (start < 0) return null;
    const nx = this.nx;
    const d = foot ? this.dTall : this.dAll;
    const gi = goal >= 0 ? goal % nx : this.cellOf(to.x, to.z)[0];
    const gj = goal >= 0 ? Math.floor(goal / nx) : this.cellOf(to.x, to.z)[1];
    const h = (k) => {
      const dx = Math.abs((k % nx) - gi);
      const dz = Math.abs(Math.floor(k / nx) - gj);
      return (Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)) * CELL;
    };
    const stamp = ++this.stamp;
    const { g, f, seen, shut } = this;
    const heap = [start];
    g[start] = 0;
    f[start] = h(start) * WEIGHT;
    seen[start] = stamp;
    this.from[start] = -1;
    let best = start;
    let bestH = h(start);
    for (let n = 0; heap.length && n < max; n++) {
      const k = pop(heap, f);
      if (shut[k] === stamp) continue;
      shut[k] = stamp;
      const hk = h(k);
      if (hk < bestH) { bestH = hk; best = k; }
      if (k === goal) break;
      const i = k % nx;
      const j = (k - i) / nx;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= nx || nj >= this.nz) continue;
          const m = nj * nx + ni;
          if (shut[m] === stamp || !this.open(m, foot, r)) continue;
          if (di && dj && (!this.open(j * nx + ni, foot, r) || !this.open(nj * nx + i, foot, r))) continue; // no cutting corners
          let cost = (di && dj ? Math.SQRT2 : 1) * CELL * (1 + Math.max(0, r + 1.5 - d[m]) * WALL_COST);
          if (foot && this.dAll[m] < r) cost *= LOW_COST;
          const ng = g[k] + cost;
          if (seen[m] === stamp && ng >= g[m]) continue;
          seen[m] = stamp;
          g[m] = ng;
          f[m] = ng + h(m) * WEIGHT;
          this.from[m] = k;
          push(heap, m, f);
        }
      }
    }
    const cells = [];
    for (let k = best; k >= 0; k = this.from[k]) cells.push(k);
    cells.reverse();
    const reached = best === goal;
    // pull it tight: from each corner straight on as far as it stays open (and, for men, off the
    // low walls: going over one is a corner of its own, so they don't cut along it)
    const pts = [];
    let a = { x: from.x, z: from.z };
    for (let i = 0; i < cells.length - 1;) {
      let j = i + 1;
      while (j + 1 < cells.length && this.visible(a, this.point(cells[j + 1]), foot, r)) j++;
      a = this.point(cells[j]);
      pts.push(a);
      i = j;
    }
    if (reached && (!pts.length || this.visible(pts[pts.length - 1], to, foot, r))) {
      if (pts.length) pts[pts.length - 1] = { x: to.x, z: to.z };
      else pts.push({ x: to.x, z: to.z });
    }
    if (!pts.length) pts.push(this.point(best));
    return { pts, reached };
  }
}

/** Two-pass chamfer distance (orthogonal CELL, diagonal √2·CELL) over `d`, seeded in place. */
function chamfer(d, nx, nz) {
  const D = CELL * Math.SQRT2;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      let v = d[k];
      if (i > 0 && d[k - 1] + CELL < v) v = d[k - 1] + CELL;
      if (j > 0) {
        if (d[k - nx] + CELL < v) v = d[k - nx] + CELL;
        if (i > 0 && d[k - nx - 1] + D < v) v = d[k - nx - 1] + D;
        if (i < nx - 1 && d[k - nx + 1] + D < v) v = d[k - nx + 1] + D;
      }
      d[k] = v;
    }
  }
  for (let j = nz - 1; j >= 0; j--) {
    for (let i = nx - 1; i >= 0; i--) {
      const k = j * nx + i;
      let v = d[k];
      if (i < nx - 1 && d[k + 1] + CELL < v) v = d[k + 1] + CELL;
      if (j < nz - 1) {
        if (d[k + nx] + CELL < v) v = d[k + nx] + CELL;
        if (i < nx - 1 && d[k + nx + 1] + D < v) v = d[k + nx + 1] + D;
        if (i > 0 && d[k + nx - 1] + D < v) v = d[k + nx - 1] + D;
      }
      d[k] = v;
    }
  }
}

// binary heap of cell indices, ordered by f[]
function push(heap, k, f) {
  heap.push(k);
  for (let i = heap.length - 1; i > 0;) {
    const p = (i - 1) >> 1;
    if (f[heap[p]] <= f[heap[i]]) break;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
}

function pop(heap, f) {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length) {
    heap[0] = last;
    for (let i = 0; ;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let m = i;
      if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l;
      if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
  }
  return top;
}
