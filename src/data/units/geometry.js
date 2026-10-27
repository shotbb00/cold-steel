// Helpers for building unit models out of primitives. A model merges its parts into a few
// geometries (torso, glow, thigh, shin) so a whole stack renders in four instanced draw
// calls. Parts carry real vertex colours (armour, cloth, trim, bone), so factions can have
// completely different palettes and silhouettes; the instance colour only adds per-soldier
// tint and hit flashes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

/**
 * Transform a primitive into model space and paint it. Pass `color` (hex) for a real colour,
 * or `shade` (grey multiplier) for parts tinted by something else (e.g. glow parts).
 * `camo: 1` marks a part for the camouflage pattern (render/paint.js); every part carries a
 * `paint` attribute (camo mask, grime) so all parts merge. `surf` is what the part is made of —
 * 'paint' (painted armour), 'metal' (bare or blackened steel), 'rubber', 'glass', 'cloth' —
 * for materials that tell them apart (paintMaterial `surfaces`); left out, it is read from the
 * colour: known glass and canvas tints are glass and cloth, dark neutral greys are metal,
 * everything else paint.
 * It rides in paint.x as camo + 2 × surface index.
 */
export const SURFACES = ['paint', 'metal', 'rubber', 'glass', 'cloth'];
const GLASS_TINTS = new Set([0x1b2126, 0x14181a, 0x1a1d1c, 0x2a3a44, 0x2a2232]);
const CLOTH_TINTS = new Set([0x4d5236, 0x5b5236]);
function surfaceOf(color, camo) {
  if (color === null || camo) return 0;
  if (GLASS_TINTS.has(color)) return 3;
  if (CLOTH_TINTS.has(color)) return 4;
  const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
  return Math.max(r, g, b) <= 0x3c && Math.max(r, g, b) - Math.min(r, g, b) <= 10 ? 1 : 0;
}

export function part(geometry, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, shade = 1, color = null, camo = 0, surf = null } = {}) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.deleteAttribute('uv');
  _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
  g.applyMatrix4(_m);
  if (color !== null) _c.set(color); else _c.setRGB(shade, shade, shade);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colors[i * 3] = _c.r;
    colors[i * 3 + 1] = _c.g;
    colors[i * 3 + 2] = _c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const paint = new Float32Array(n * 2);
  const px = camo + 2 * (surf !== null ? SURFACES.indexOf(surf) : surfaceOf(color, camo));
  for (let i = 0; i < n; i++) paint[i * 2] = px;
  g.setAttribute('paint', new THREE.BufferAttribute(paint, 2));
  return g;
}

/**
 * Bake mud / dust into a merged geometry by height: full grime at y <= `dirty`, none at
 * y >= `clean` (either order). Returns the geometry.
 */
export function grime(geo, clean, dirty, amount = 1) {
  const pos = geo.attributes.position;
  const paint = geo.attributes.paint;
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - clean) / (dirty - clean)));
    paint.setY(i, Math.max(paint.getY(i), t * t * (3 - 2 * t) * amount));
  }
  return geo;
}

export function merge(parts) {
  const g = mergeGeometries(parts, false);
  g.computeBoundingSphere();
  return g;
}

/** Shorthand primitives: P.box(w, h, d, opts), P.sphere(r, opts), … */
export const P = {
  box: (w, h, d, o) => part(new THREE.BoxGeometry(w, h, d), o),
  sphere: (r, o, ws = 10, hs = 8) => part(new THREE.SphereGeometry(r, ws, hs), o),
  cyl: (rt, rb, h, o, seg = 10) => part(new THREE.CylinderGeometry(rt, rb, h, seg), o),
  cone: (r, h, o, seg = 6) => part(new THREE.ConeGeometry(r, h, seg), o),
  capsule: (r, len, o) => part(new THREE.CapsuleGeometry(r, len, 3, 8), o),
  torus: (r, t, o, seg = 16) => part(new THREE.TorusGeometry(r, t, 5, seg), o),
  octa: (r, o) => part(new THREE.OctahedronGeometry(r), o),
};

/**
 * A smooth body swept through cross-sections: `sections` [[x, y, z, w, d, e?], …] are centres
 * along a path with half-width `w` (across, along world x where it can) and half-depth `d`,
 * and a superellipse exponent `e` (2 = ellipse, 3–4 = a rounded box; default 2.4). Ends are
 * closed. Smooth normals — bodies, limbs, helmets, magazines. `o` are part() options, plus
 * `warp(v)` to bend the vertices (THREE.Vector3, changed in place) before the normals are made.
 */
export function loft(sections, o = {}, radial = 10) {
  const n = sections.length;
  const pos = [];
  const idx = [];
  const c = new THREE.Vector3();
  const t = new THREE.Vector3();
  const ax = new THREE.Vector3();
  const az = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const [x, y, z, w, d, e = 2.4] = sections[i];
    const a = sections[Math.max(0, i - 1)];
    const b = sections[Math.min(n - 1, i + 1)];
    t.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    ax.set(1, 0, 0);
    if (Math.abs(t.x) > 0.9) ax.set(0, 0, -Math.sign(t.x));      // running sideways: across is z
    ax.addScaledVector(t, -ax.dot(t)).normalize();
    az.crossVectors(ax, t);
    c.set(x, y, z);
    for (let k = 0; k < radial; k++) {
      const ang = (k / radial) * Math.PI * 2;
      const cs = Math.cos(ang);
      const sn = Math.sin(ang);
      const u = Math.sign(cs) * Math.abs(cs) ** (2 / e) * w;
      const v = Math.sign(sn) * Math.abs(sn) ** (2 / e) * d;
      pos.push(c.x + ax.x * u + az.x * v, c.y + ax.y * u + az.y * v, c.z + ax.z * u + az.z * v);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < radial; k++) {
      const a = i * radial + k;
      const b = i * radial + ((k + 1) % radial);
      idx.push(a, a + radial, b, b, a + radial, b + radial);
    }
  }
  // end caps: a fan to each end's centre
  for (const [i, flip] of [[0, true], [n - 1, false]]) {
    const centre = pos.length / 3;
    pos.push(sections[i][0], sections[i][1], sections[i][2]);
    for (let k = 0; k < radial; k++) {
      const a = i * radial + k;
      const b = i * radial + ((k + 1) % radial);
      if (flip) idx.push(centre, a, b); else idx.push(centre, b, a);   // same winding as the sides, so the outward pass turns them all together
    }
  }
  if (o.warp) {
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.length; i += 3) {
      o.warp(v.set(pos[i], pos[i + 1], pos[i + 2]));
      pos[i] = v.x; pos[i + 1] = v.y; pos[i + 2] = v.z;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // which way round the rings go depends on the frame: make the faces point outward
  g.computeBoundingBox();
  const mid = g.boundingBox.getCenter(new THREE.Vector3());
  const nrm = g.attributes.normal;
  let out = 0;
  for (let i = 0; i < n * radial; i++) {
    out += (pos[i * 3] - mid.x) * nrm.getX(i) + (pos[i * 3 + 1] - mid.y) * nrm.getY(i) + (pos[i * 3 + 2] - mid.z) * nrm.getZ(i);
  }
  if (out < 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return part(g, o);
}

/** A limb from joint `a` to joint `b` ([x, y, z]): `radii` [[t, w, d], …] along it (t 0…1). */
export function limb(a, b, radii, o = {}, radial = 9) {
  return loft(radii.map(([t, w, d, e = 2.2]) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, w, d, e]), o, radial);
}

/** Mirror helper: returns [left, right] parts built by fn(sign) with sign -1 / +1. */
export const pair = (fn) => [fn(-1), fn(1)];
