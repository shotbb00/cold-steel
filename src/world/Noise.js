// Seeded 2D gradient (Perlin-style) noise plus fBm / ridged helpers for terrain and textures.
// `period` makes the lattice wrap, which is how the detail textures tile seamlessly.
import { mulberry32 } from '../core/math.js';

const GX = [1, -1, 1, -1, 1.4142, -1.4142, 0, 0];
const GZ = [1, 1, -1, -1, 0, 0, 1.4142, -1.4142];
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

export function createNoise2D(seed = 1) {
  const rand = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  /** Roughly -1..1. */
  return function noise(x, y, period = 256) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const x0 = ((xi % period) + period) % period;
    const y0 = ((yi % period) + period) % period;
    const x1 = (x0 + 1) % period;
    const y1 = (y0 + 1) % period;
    const h00 = perm[perm[x0 & 255] + (y0 & 255)] & 7;
    const h10 = perm[perm[x1 & 255] + (y0 & 255)] & 7;
    const h01 = perm[perm[x0 & 255] + (y1 & 255)] & 7;
    const h11 = perm[perm[x1 & 255] + (y1 & 255)] & 7;
    const n00 = GX[h00] * xf + GZ[h00] * yf;
    const n10 = GX[h10] * (xf - 1) + GZ[h10] * yf;
    const n01 = GX[h01] * xf + GZ[h01] * (yf - 1);
    const n11 = GX[h11] * (xf - 1) + GZ[h11] * (yf - 1);
    const u = fade(xf);
    const v = fade(yf);
    const a = n00 + u * (n10 - n00);
    const b = n01 + u * (n11 - n01);
    return (a + v * (b - a)) * 0.9;
  };
}

/** Fractal Brownian motion: layered octaves, roughly -1..1. */
export function fbm(noise, x, y, octaves = 5, lacunarity = 2, gain = 0.5) {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Ridged multifractal: sharp crests, 0..1. Good for mountain ranges. */
export function ridged(noise, x, y, octaves = 5) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    let n = 1 - Math.abs(noise(x * freq, y * freq));
    n *= n;
    sum += n * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}
