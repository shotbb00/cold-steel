// Lakes: still water in hollows (the Suwałki lake district). Same face as world/River.js — the
// engine asks `world.river` for `water`, `level`, `dry()` — but no channel and nothing to bridge:
// `path` is far away, so the bridge layer finds no river (and isn't offered: `lake`).
//   lakes  [{ x, z, rx, rz, rot = 0, depth = 4, seed = 0 }]: wobbly ellipses
//   carve(x, z, h)  shore flattened to just above the water, the bed sinking toward the middle
import * as THREE from 'three';
import { smoothstep } from '../core/math.js';

const SHORE = 0.6; // m the shoreline ground stands above the water
const BASIN = 60;  // m over which the land around a lake slopes down to its shore

export function createLakes({ lakes, level = 0 }) {
  /** Normalised distance from lake L's middle (1 = its shore), with a ragged outline. */
  const q = (L, x, z) => {
    const c = Math.cos(L.rot ?? 0), s = Math.sin(L.rot ?? 0);
    const dx = x - L.x, dz = z - L.z;
    const lx = (dx * c - dz * s) / L.rx, lz = (dx * s + dz * c) / L.rz;
    const a = Math.atan2(lz, lx), sd = L.seed ?? 0;
    return Math.hypot(lx, lz) * (1 + 0.1 * Math.sin(3 * a + sd) + 0.06 * Math.sin(5 * a + 2.3 * sd));
  };
  const nearest = (x, z) => {
    let best = null, bq = Infinity;
    for (const L of lakes) { const v = q(L, x, z); if (v < bq) { bq = v; best = L; } }
    return [best, bq];
  };
  return {
    lake: true,
    lakes,
    level,
    water: { level, deep: 0.95 },
    halfWidth: 0,
    channels: [],
    crossings: [],
    deck: level + 1.5,
    spanLength: 30,
    path: () => 1e6, channelAt: () => 0, side: () => 1, bridgeAt: () => null, blow() {}, lay() {},

    /** How far into lake water (x, z) is: < 1 inside, 1 on the shore. */
    q: (x, z) => nearest(x, z)[1],

    carve(x, z, h) {
      for (const L of lakes) {
        const v = q(L, x, z), m = Math.hypot(x - L.x, z - L.z) * (1 - 1 / Math.max(v, 1e-9)); // metres out from the shore (q scales with the radius; the guard: no NaN at a lake's very middle)
        if (m > BASIN) continue;
        h += (level + SHORE - h) * (1 - smoothstep(0, BASIN, m)) ** 1.6;      // the land slopes down to the water
        if (v < 1) h = Math.min(h, level + SHORE - ((L.depth ?? 4) + SHORE) * smoothstep(1, 0.55, v)); // the bed
      }
      return h;
    },

    surfaceAt(terrain, x, z) { return Math.max(terrain.heightAt(x, z), level); },
    depthAt(terrain, x, z) { return level - terrain.heightAt(x, z); },

    /** An order into a lake goes to the nearest shore. */
    dry(p) {
      const [L, v] = nearest(p.x, p.z);
      if (!L || v > 1.05) return p;
      const k = 1.12 / Math.max(v, 0.05);
      return { x: L.x + (p.x - L.x) * k, z: L.z + (p.z - L.z) * k };
    },

    build(scene) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x3a4c52, roughness: 0.24, metalness: 0.3, transparent: true, opacity: 0.9 });
      mat.userData.waterSurface = true; // (drawn first among the see-through: smoke over a lake covers it)
      for (const L of lakes) {
        const r = Math.max(L.rx, L.rz) * 1.3 + 10; // the shore ground covers the sheet's corners
        const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), mat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(L.x, level, L.z);
        m.receiveShadow = true;
        m.userData.noAO = true;
        scene.add(m);
      }
    },
  };
}
