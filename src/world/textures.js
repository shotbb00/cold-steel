// Procedural, seamlessly tiling detail textures (albedo variation + matching normal map),
// generated on canvases at load so the game ships no image files.
import * as THREE from 'three';
import { createNoise2D } from './Noise.js';

export function makeDetailTextures({ size = 256, seed = 1, scale = 8, octaves = 5, base = 0.85, contrast = 0.3, bump = 2.5 } = {}) {
  const noise = createNoise2D(seed);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      let amp = 1;
      let f = scale;
      let norm = 0;
      for (let o = 0; o < octaves; o++) {
        v += amp * noise((x / size) * f, (y / size) * f, f);
        norm += amp;
        amp *= 0.5;
        f *= 2;
      }
      h[y * size + x] = v / norm;
    }
  }

  const colorCanvas = document.createElement('canvas');
  const normalCanvas = document.createElement('canvas');
  colorCanvas.width = colorCanvas.height = normalCanvas.width = normalCanvas.height = size;
  const cctx = colorCanvas.getContext('2d');
  const nctx = normalCanvas.getContext('2d');
  const ci = cctx.createImageData(size, size);
  const ni = nctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const g = Math.max(0, Math.min(1, base + h[i] * contrast)) * 255;
      ci.data[i * 4] = ci.data[i * 4 + 1] = ci.data[i * 4 + 2] = g;
      ci.data[i * 4 + 3] = 255;

      const dx = h[y * size + ((x + 1) % size)] - h[y * size + ((x - 1 + size) % size)];
      const dy = h[((y + 1) % size) * size + x] - h[((y - 1 + size) % size) * size + x];
      const nx = -dx * bump;
      const ny = -dy * bump;
      const len = Math.hypot(nx, ny, 1);
      ni.data[i * 4] = (nx / len * 0.5 + 0.5) * 255;
      ni.data[i * 4 + 1] = (ny / len * 0.5 + 0.5) * 255;
      ni.data[i * 4 + 2] = (1 / len * 0.5 + 0.5) * 255;
      ni.data[i * 4 + 3] = 255;
    }
  }
  cctx.putImageData(ci, 0, 0);
  nctx.putImageData(ni, 0, 0);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const normalMap = new THREE.CanvasTexture(normalCanvas);
  for (const t of [map, normalMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
  }
  return { map, normalMap };
}
