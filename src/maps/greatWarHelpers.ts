// What the 1917–18 maps away from the Western Front share (Riga, Caporetto, Piave, Megiddo): distance to a
// road's polyline, the engineers' pontoon bridges over a river, and villages — farmsteads round a lane in Europe,
// flat-roofed mud-brick houses round a well in Palestine. Everything takes its own seed so a map can build
// point-mirrored copies that come out alike.
import * as THREE from 'three';
import { mulberry32 } from '../core/math.js';
import { buildSite } from './common.js';

/** Distance from (x, z) to a polyline [[x, z], …]. */
export function segDist(poly: number[][], x: number, z: number) {
  let best = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, az] = poly[i], [bx, bz] = poly[i + 1];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

/** A graded road along a polyline: (x, z)'s distance to it and the road's height there, laid straight between the heights `hs` at its corners. */
export function graded(poly: number[][], hs: number[], x: number, z: number) {
  let best = { d: Infinity, h: 0 };
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, az] = poly[i], [bx, bz] = poly[i + 1], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best.d) best = { d, h: hs[i] + (hs[i + 1] - hs[i]) * t };
  }
  return best;
}

/**
 * The river's bridges as the pioneers built them (call after river.build): a timber deck on a row of pontoon boats
 * moored across the current instead of the stone arches. The causeway under it (world/River.js) is what units walk
 * on; the deck is the `span` a demolition drops (River.blow reads its first child's material).
 */
export function pontoons(river: any, scene: THREE.Scene) {
  const timber = new THREE.MeshStandardMaterial({ color: 0x6a5840, roughness: 0.95 });
  const hull = new THREE.MeshStandardMaterial({ color: 0x3c3a34, roughness: 0.9 });
  for (const c of river.crossings) {
    if (c.kind !== 'bridge' || !c.pontoon) continue;
    if (c.mesh) scene.remove(c.mesh);
    const g = new THREE.Group(), span = new THREE.Group();
    const L = (river.halfWidth + 10) * 2, w = c.width, deck = river.deck;
    const add = (parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      parent.add(m);
    };
    add(span, timber, 0, deck + 0.05, 0, w, 0.25, L);                                     // the chesses (deck planks)
    for (const sx of [-1, 1]) add(span, timber, sx * (w / 2 - 0.1), deck + 0.35, 0, 0.18, 0.35, L); // the ribands along the edges
    for (let z = -river.halfWidth + 2; z <= river.halfWidth - 2; z += 5.5) {               // the boats, bows upstream
      add(span, hull, 0, river.level + 0.15, z, w + 3, 1.0, 1.9);
      add(span, timber, 0, (river.level + deck) / 2 + 0.2, z, w - 0.6, deck - river.level, 0.25); // the trestle on her
    }
    g.add(span);
    g.position.set(c.x, 0, c.z);
    scene.add(g);
    c.mesh = g;
    c.span = span;
    c.spanL = L;
  }
}

/** A European village round (x, z): farmsteads and garden walls (common.js buildSite), `skip(x, z)` keeps them off water and roads. */
export function farmVillage(props: any, x: number, z: number, n: number, seed: number, skip: (x: number, z: number) => boolean, spread = 1) {
  const r = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.6, d = (14 + r() * 26) * spread;
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    const site = { kind: i % 3 === 2 ? 'fieldwall' : 'farm', seed: Math.floor(r() * 1e9) };
    if (!skip(px, pz)) buildSite(props, site, px, pz, a + Math.PI / 2);
  }
}

/** An Arab village round (x, z): flat-roofed mud-brick houses, some of two storeys, garden walls, a well; a mosque if `mosque`. */
export function arabVillage(props: any, x: number, z: number, n: number, seed: number, skip: (x: number, z: number) => boolean, mosque = true) {
  props.rand = mulberry32(seed);
  const r = props.rand, placed: number[][] = [];
  if (mosque) { props.flatHouse({ x: x + 6, z: z - 22, yaw: 0, width: 11, depth: 9, name: 'mosque', dome: true }); placed.push([x + 6, z - 22, 9]); }
  for (let i = 0; i < n * 2 && placed.length < n + (mosque ? 1 : 0); i++) {
    const a = r() * Math.PI * 2, d = 16 + r() * 26;
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    if (skip(px, pz) || placed.some(([qx, qz, qr]) => Math.hypot(qx - px, qz - pz) < qr + 7)) continue;
    placed.push([px, pz, 6]);
    props.flatHouse({ x: px, z: pz, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 6 + r() * 4, depth: 5 + r() * 3, storeys: r() < 0.2 ? 2 : 1 });
    if (r() < 0.5) props.lowWall({ x: px + 5, z: pz + 4, yaw: r() < 0.5 ? 0 : Math.PI / 2, length: 6 + r() * 6, height: 1.6, color: 0xb8a07a });
  }
  props.column({ x: x - 4, z: z + 3, radius: 1.3, height: 0.9 }); // the well
}
