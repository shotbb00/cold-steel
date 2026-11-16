// Vertex colours as four bytes (RGBA, normalized) instead of three floats: a third of the memory, in the
// game's arrays and on the graphics card alike (Babylon draws straight from the same array). Plain
// painted colours don't need more. Four, not three: Metal (iPhones) wants every vertex stream on a
// four-byte stride, or ANGLE keeps a converted copy. Writers keep using setXYZ / getX — three.js scales them.
import * as THREE from 'three';

export function packColors(geo) {
  const c = geo?.attributes.color;
  if (!c || c.array instanceof Uint8Array) return geo;
  const out = new Uint8Array(c.count * 4);
  const b = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  for (let i = 0; i < c.count; i++) {
    out[i * 4] = b(c.getX(i));
    out[i * 4 + 1] = b(c.getY(i));
    out[i * 4 + 2] = b(c.getZ(i));
    out[i * 4 + 3] = 255;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(out, 4, true));
  return geo;
}
