// A map function sampled once onto a grid (the 1985 northern and Korean maps): woods and soft ground are asked for
// every sight line and every man's step, and their noise is too dear to work out each time. `fn(x, z)` over
// ±ext.x, ±ext.z every `cell` m, filled on the first call; the nearest sample after that (outside: fn itself).
export function gridCache(fn, ext, cell = 4) {
  const nx = Math.ceil((2 * ext.x) / cell) + 1, nz = Math.ceil((2 * ext.z) / cell) + 1;
  let g = null;
  return (x, z) => {
    const i = Math.round((x + ext.x) / cell), j = Math.round((z + ext.z) / cell);
    if (i < 0 || j < 0 || i >= nx || j >= nz) return fn(x, z);
    if (!g) {
      g = new Float32Array(nx * nz);
      for (let b = 0; b < nz; b++) for (let a = 0; a < nx; a++) g[b * nx + a] = fn(a * cell - ext.x, b * cell - ext.z);
    }
    return g[j * nx + i];
  };
}

/** gridCache, read between the samples (bilinear): for a height or a distance, where nearest-sample steps would show in the ground. */
export function gridCacheSmooth(fn, ext, cell = 2) {
  const nx = Math.ceil((2 * ext.x) / cell) + 1, nz = Math.ceil((2 * ext.z) / cell) + 1;
  let g = null;
  return (x, z) => {
    const fx = (x + ext.x) / cell, fz = (z + ext.z) / cell, i = Math.floor(fx), j = Math.floor(fz);
    if (i < 0 || j < 0 || i >= nx - 1 || j >= nz - 1) return fn(x, z);
    if (!g) {
      g = new Float32Array(nx * nz);
      for (let b = 0; b < nz; b++) for (let a = 0; a < nx; a++) g[b * nx + a] = fn(a * cell - ext.x, b * cell - ext.z);
    }
    const u = fx - i, v = fz - j, k = j * nx + i;
    return (g[k] * (1 - u) + g[k + 1] * u) * (1 - v) + (g[k + nx] * (1 - u) + g[k + nx + 1] * u) * v;
  };
}
