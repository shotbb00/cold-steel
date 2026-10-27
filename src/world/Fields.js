// Farmland patchwork: a jittered-grid Voronoi of fields, each with a land use and a
// ploughing direction. One source of truth for the terrain (colour, furrows), the vegetation
// (what grows where, hedgerows along the boundaries) and anything else that wants to know.
//
//   const fields = createFields({ seed, cell });
//   fields.at(x, z) → { id, type, angle, spacing, edge, hedge, tint }
//     type    – FIELD.* land use
//     angle   – direction of the furrows / rows (radians)
//     spacing – metres between furrows
//     edge    – distance to the nearest field boundary (metres)
//     hedge   – true if that boundary carries a hedgerow
//     tint    – -1..1 per-field colour jitter
export const FIELD = Object.freeze({ PASTURE: 0, PLOUGHED: 1, STUBBLE: 2, MEADOW: 3 });

function hash(ix, iz, seed, k) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 2147483647 + k * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function createFields({ seed = 7, cell = 70, weights = [0.34, 0.26, 0.24, 0.16] } = {}) {
  const sites = new Map();
  const site = (ix, iz) => {
    const key = ix * 100003 + iz;
    let s = sites.get(key);
    if (s) return s;
    const pick = hash(ix, iz, seed, 3);
    let type = 0;
    for (let acc = 0; type < weights.length - 1; type++) {
      acc += weights[type];
      if (pick < acc) break;
    }
    s = {
      id: key,
      x: (ix + 0.15 + 0.7 * hash(ix, iz, seed, 1)) * cell,
      z: (iz + 0.15 + 0.7 * hash(ix, iz, seed, 2)) * cell,
      type,
      angle: hash(ix, iz, seed, 4) * Math.PI,
      spacing: 0.75 + hash(ix, iz, seed, 5) * 0.45,
      tint: hash(ix, iz, seed, 6) * 2 - 1,
    };
    sites.set(key, s);
    return s;
  };

  const out = { id: 0, type: 0, angle: 0, spacing: 1, edge: 0, hedge: false, tint: 0 };
  function at(x, z) {
    const cx = Math.floor(x / cell);
    const cz = Math.floor(z / cell);
    let a = null;
    let b = null;
    let da = Infinity;
    let db = Infinity;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const s = site(cx + dx, cz + dz);
        const d = (s.x - x) ** 2 + (s.z - z) ** 2;
        if (d < da) { b = a; db = da; a = s; da = d; } else if (d < db) { b = s; db = d; }
      }
    }
    // distance to the bisector between the two nearest sites = distance to the boundary
    const sep = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    out.id = a.id;
    out.type = a.type;
    out.angle = a.angle;
    out.spacing = a.spacing;
    out.tint = a.tint;
    out.edge = (db - da) / (2 * sep);
    // about half the boundaries are hedged (decided per pair of fields, so both sides agree)
    out.hedge = hash(Math.min(a.id, b.id), Math.max(a.id, b.id), seed, 9) < 0.5;
    return out;
  }

  return { at, cell };
}
