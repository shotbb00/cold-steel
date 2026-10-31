/**
 * The way round walls, buildings and deep water: A* over a coarse grid, the path pulled tight
 * to its corners. The steering in UnitStack only handles one obstacle at a time, so an L of
 * walls or a building between a unit and its goal trapped it; this finds the way out.
 */
const STEP = 2;    // m per grid cell
const MAX = 6000;  // cells searched at most (then: as close as it got)
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Waypoints [{x, z}] from `from` to `to` (the goal itself left out), or null: the straight line is clear, or no way found. */
export function findPath(world, from, to, clear, climb = 0) {
  const { cover, bounds, terrain } = world;
  const w = world.river?.water;
  const open = (x, z) => Math.abs(x) <= bounds.x && Math.abs(z) <= bounds.z && !cover.pointBlocked(x, z, clear, climb)
    && !(w && w.level - terrain.heightAt(x, z) > w.deep);
  const visible = (a, b) => {
    const l = Math.hypot(b.x - a.x, b.z - a.z);
    for (let s = 1; s < l; s++) if (!open(a.x + ((b.x - a.x) * s) / l, a.z + ((b.z - a.z) * s) / l)) return false;
    return true;
  };
  if (visible(from, to)) return null;

  const key = (i, j) => (i + 2048) * 4096 + (j + 2048);
  const si = Math.round(from.x / STEP), sj = Math.round(from.z / STEP);
  const gi = Math.round(to.x / STEP), gj = Math.round(to.z / STEP);
  const h = (i, j) => Math.hypot(i - gi, j - gj);
  const known = new Map();
  // on the half-step grid (a, b) = (2i, 2j): cell centres and the midpoints between them
  const half = (a, b) => {
    const k = key(a, b);
    let v = known.get(k);
    if (v === undefined) known.set(k, (v = open((a * STEP) / 2, (b * STEP) / 2)));
    return v;
  };
  const free = (i, j) => half(i * 2, j * 2);
  // a step is open with its midpoint too: a thin wall can stand between two open cells
  const g = new Map();
  const came = new Map();
  const shut = new Set();
  const heap = [];
  // start from the cells round about it can walk to straight (the nearest may be over a wall)
  for (let i = si - 1; i <= si + 1; i++) {
    for (let j = sj - 1; j <= sj + 1; j++) {
      const c = { x: i * STEP, z: j * STEP };
      if (!free(i, j) || !visible(from, c)) continue;
      const cost = Math.hypot(c.x - from.x, c.z - from.z) / STEP;
      g.set(key(i, j), cost);
      push(heap, [cost + h(i, j), i, j]);
    }
  }
  if (!heap.length) return null; // boxed in: the steering's sidestep and climb-over have to do
  let best = null, bestH = Infinity;
  for (let n = 0; heap.length && n < MAX; n++) {
    const [, i, j] = pop(heap);
    const k = key(i, j);
    if (shut.has(k)) continue;
    shut.add(k);
    const hk = h(i, j);
    if (hk < bestH) { bestH = hk; best = k; }
    if (hk === 0) break;
    for (const [di, dj] of DIRS) {
      const ni = i + di, nj = j + dj;
      if (!free(ni, nj) || !half(i * 2 + di, j * 2 + dj) || (di && dj && (!free(i + di, j) || !free(i, j + dj)))) continue; // no cutting corners
      const nk = key(ni, nj);
      const ng = g.get(k) + (di && dj ? Math.SQRT2 : 1);
      if (ng >= (g.get(nk) ?? Infinity)) continue;
      g.set(nk, ng);
      came.set(nk, k);
      push(heap, [ng + h(ni, nj), ni, nj]);
    }
  }

  const cells = [];
  for (let k = best; k !== undefined; k = came.get(k)) cells.push({ x: (Math.floor(k / 4096) - 2048) * STEP, z: ((k % 4096) - 2048) * STEP });
  cells.push({ x: from.x, z: from.z });
  cells.reverse();
  // no way there (a door narrower than the grid, a walled yard): leave it to the steering's climb-over
  if (bestH !== 0 && !visible(cells[cells.length - 1], to)) return null;
  if (bestH === 0) cells[cells.length - 1] = { x: to.x, z: to.z };
  // pull it tight: from each corner straight on to the furthest point still in sight
  const out = [];
  for (let a = 0; a < cells.length - 1;) {
    let b = cells.length - 1;
    while (b > a + 1 && !visible(cells[a], cells[b])) b--;
    out.push(cells[b]);
    a = b;
  }
  if (bestH === 0) out.pop(); // the goal itself: the caller heads there anyway
  return out;
}

function push(heap, e) {
  heap.push(e);
  for (let i = heap.length - 1; i > 0;) {
    const p = (i - 1) >> 1;
    if (heap[p][0] <= heap[i][0]) break;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
}

function pop(heap) {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length) {
    heap[0] = last;
    for (let i = 0; ;) {
      const l = i * 2 + 1, r = l + 1;
      let m = i;
      if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
      if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
  }
  return top;
}
