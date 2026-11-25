// A coastline drawn as a line of points from the west edge to the east (the sea on its -z side; it may turn and run
// down a flank, as the Elbe does at Cuxhaven), rounded off (Chaikin), and its signed distance — m, + ashore, - at
// sea — sampled once onto a grid (gridCacheSmooth): the 1806 landing maps that are not one straight shore.
import { gridCacheSmooth } from './gridCache.js';

export function coastline(pts, ext = { x: 1000, z: 1000 }, { smooth = 3, cell = 8 } = {}) {
  let p = pts;
  for (let k = 0; k < smooth; k++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, az] = p[i], [bx, bz] = p[i + 1];
      q.push([0.75 * ax + 0.25 * bx, 0.75 * az + 0.25 * bz], [0.25 * ax + 0.75 * bx, 0.25 * az + 0.75 * bz]);
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  const first = p[0], last = p[p.length - 1];
  const poly = [...p, [4000, last[1]], [4000, -1e5], [-4000, -1e5], [-4000, first[1]]]; // (the sea: closed round the far -z)
  const inSea = (x, z) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i], [xj, zj] = poly[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
    }
    return c;
  };
  const raw = (x, z) => {
    let d = Infinity;
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, az] = p[i], dx = p[i + 1][0] - ax, dz = p[i + 1][1] - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      const e = (x - ax - dx * t) ** 2 + (z - az - dz * t) ** 2;
      if (e < d) d = e;
    }
    d = Math.sqrt(d);
    return inSea(x, z) ? -d : d;
  };
  return Object.assign(gridCacheSmooth(raw, ext, cell), { raw }); // (`raw`: worked out each time — for the few points a map places at load, before the grid is wanted)
}

/** At (x, z) by the shore: the unit normal pointing inland (n) and the tangent along it (t), from the distance's slope. */
export function shoreFrame(D, x, z) {
  const e = 6, gx = D(x + e, z) - D(x - e, z), gz = D(x, z + e) - D(x, z - e), l = Math.hypot(gx, gz) || 1;
  return { nx: gx / l, nz: gz / l, tx: gz / l, tz: -gx / l, yaw: Math.atan2(gx / l, gz / l) }; // (yaw: a work's long side along the shore — Props/Construction turn x by -yaw)
}

/** Where the waterline crosses the line x = x0 coming in from the sea (-z). */
export function waterlineZ(D, x0, from = -900, to = 900) {
  for (let z = from; z < to; z += 2) if (D(x0, z) >= 0) return z;
  return to;
}
