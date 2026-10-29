// A river across a map, and the few places to get over it — the choke points.
//   carve(x, z, h)  the map's height function runs its ground through this: a flat floodplain
//                   along the water, the channel below it, shallow beds at fords, and each
//                   bridge as a raised stone causeway (the deck units walk on is real terrain)
//   water           { level, deep }: deeper than `deep` (m) stops anyone (UnitStack.moveBody);
//                   shallower water slows (a wading man, a tank pushing through a ford)
//   plan(a, b)      a route from a to b over the best crossing still standing (UnitStack
//                   steers its anchor to the near end, across, and on), or null if no need
//   bridgeAt(x, z)  the bridge here, for engineers' demolition charges
//   blow(c)         a bridge goes: the span drops into the river (terrain dug out, mesh broken)
//   lay(x)          a bridge layer puts a steel treadway bridge across at x: a new crossing
//   build(scene)    the water surface and the bridges
// Crossings: { id, name, x, kind: 'bridge' | 'ford', width } — the river decides where across.
import * as THREE from 'three';
import { smoothstep } from '../core/math.js';

const BANK = 0.9;           // floodplain height above the water
const APPROACH = 9;         // metres beyond the banks where a crossing's ends are

/** @param {any} o  options, untyped until this file moves to TypeScript */
export function createRiver({ path, halfWidth = 12, level = 0, depth = 2.4, valley = 70, crossings = [] }) {
  const deck = level + BANK + 0.25;
  const river = {
    path,
    halfWidth,
    level,
    crossings: crossings.map((c, i) => ({ id: i, blown: false, ...c, z: path(c.x) })),
    water: { level, deep: 0.95 },

    carve(x, z, h) {
      const dz = Math.abs(z - path(x));
      // the floodplain: ground near the river comes down to just above the water
      const plain = level + BANK;
      const v = 1 - smoothstep(halfWidth + 6, valley, dz);
      h += (plain - h) * v;
      // the channel, shallower at fords
      let bed = level - depth;
      for (const c of this.crossings) {
        if (c.kind !== 'ford') continue;
        const k = 1 - smoothstep(c.width * 0.5, c.width * 0.5 + 10, Math.abs(x - c.x));
        bed += (level - (c.depth ?? 0.6) - bed) * k;
      }
      const ch = 1 - smoothstep(halfWidth * 0.45, halfWidth * 1.08, dz);
      h += (bed - h) * ch;
      // bridges: a level causeway across, as wide as the deck
      for (const c of this.crossings) {
        if (c.kind !== 'bridge') continue;
        const along = 1 - smoothstep(halfWidth + 4, halfWidth + 14, Math.abs(z - c.z));
        const across = 1 - smoothstep(c.width * 0.5 - 0.3, c.width * 0.5 + 0.6, Math.abs(x - c.x));
        const k = along * across;
        if (k > 0) h = Math.max(h, h + (deck - h) * k);
      }
      return h;
    },

    side(x, z) {
      return Math.sign(z - path(x)) || 1;
    },

    /** The surface at (x, z): the ground, or the water where the ground is below it. */
    surfaceAt(terrain, x, z) {
      return Math.max(terrain.heightAt(x, z), level);
    },

    /** Water depth at (x, z) on this terrain (negative = dry). */
    depthAt(terrain, x, z) {
      return level - terrain.heightAt(x, z);
    },

    /** A point on dry ground near (x, z): an order into the river goes to the nearer bank. */
    dry(p) {
      const dz = p.z - path(p.x);
      if (Math.abs(dz) > halfWidth + 2 || this.bridgeAt(p.x, p.z)) return p; // dry land, or a bridge deck
      return { x: p.x, z: path(p.x) + Math.sign(dz || 1) * (halfWidth + 4) };
    },

    /** The best way from a to b over the river (or null when they're on the same bank). */
    plan(a, b) {
      const on = this.bridgeAt(a.x, a.z);
      if (on && !on.blown) { // already on a bridge: along the deck to the end facing the goal, then on
        const sb = this.side(b.x, b.z);
        const exit = { x: on.x, z: on.z + sb * (halfWidth + 12) };
        return { crossing: on, entry: { x: on.x, z: a.z }, exit, cost: 0, target: b, entered: true };
      }
      const sa = this.side(a.x, a.z);
      const sb = this.side(b.x, b.z);
      if (sa === sb) return null;
      let best = null;
      for (const c of this.crossings) {
        if (c.blown) continue;
        const reach = halfWidth + (c.kind === 'bridge' ? 12 : APPROACH);
        const entry = { x: c.x, z: c.z + sa * reach };
        const exit = { x: c.x, z: c.z + sb * reach };
        const cost = Math.hypot(entry.x - a.x, entry.z - a.z) + reach * 2 + Math.hypot(b.x - exit.x, b.z - exit.z) + (c.kind === 'ford' ? 40 : 0);
        if (!best || cost < best.cost) best = { crossing: c, entry, exit, cost, target: b };
      }
      return best;
    },

    bridgeAt(x, z) {
      for (const c of this.crossings) {
        if (c.kind === 'bridge' && Math.abs(x - c.x) < c.width / 2 + 4 && Math.abs(z - c.z) < halfWidth + 10) return c;
      }
      return null;
    },

    // ---------------------------------------------------------------- looks

    build(scene, terrain) {
      // the water: one flat sheet along the river (the banks cover it everywhere else)
      const zs = [];
      for (let x = -520; x <= 520; x += 20) zs.push(path(x));
      const z0 = Math.min(...zs) - halfWidth - 20;
      const z1 = Math.max(...zs) + halfWidth + 20;
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(1100, z1 - z0, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x3e4f52, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.88 }),
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(0, level, (z0 + z1) / 2);
      water.receiveShadow = true;
      water.userData.noAO = true;
      scene.add(water);
      this.waterMesh = water;
      const stone = new THREE.MeshStandardMaterial({ color: 0x8a857a, roughness: 0.95 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x2c2b28, roughness: 1 });
      for (const c of this.crossings) {
        if (c.kind === 'bridge') c.mesh = this.bridgeMesh(c, stone, dark, terrain);
        if (c.mesh) scene.add(c.mesh);
        if (c.kind === 'ford') c.mesh = this.fordMarks(c, terrain);
        if (c.mesh) scene.add(c.mesh);
      }
    },

    /** A stone bridge: deck, parapets, side walls with dark arch openings, piers. */
    bridgeMesh(c, stone, dark) {
      const g = new THREE.Group();
      const L = (halfWidth + 10) * 2;
      const w = c.width;
      const bottom = level - depth - 0.2;
      const add = (geo, mat, x, y, z, parent = g) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = m.receiveShadow = true;
        parent.add(m);
        return m;
      };
      const span = new THREE.Group(); // the part over the water, which a demolition drops
      g.add(span);
      const spanL = halfWidth * 2 + 2;
      add(new THREE.BoxGeometry(w + 0.6, 0.35, spanL), stone, 0, deck + 0.02, 0, span);
      for (const sx of [-1, 1]) {
        add(new THREE.BoxGeometry(0.45, 0.95, spanL), stone, sx * (w / 2 + 0.05), deck + 0.6, 0, span);   // parapets
        add(new THREE.BoxGeometry(0.4, deck - bottom, spanL), stone, sx * (w / 2 + 0.1), (deck + bottom) / 2, 0, span); // side walls
        for (const az of [-halfWidth * 0.5, halfWidth * 0.5]) {                                             // arches
          add(new THREE.BoxGeometry(0.1, (deck - bottom) * 0.62, halfWidth * 0.7), dark, sx * (w / 2 + 0.33), bottom + (deck - bottom) * 0.31, az, span);
        }
      }
      for (const end of [-1, 1]) { // the approaches on each bank stay when the span goes
        const ez = end * (spanL / 2 + (L / 2 - spanL / 2) / 2);
        const el = L / 2 - spanL / 2;
        add(new THREE.BoxGeometry(w + 0.6, 0.35, el), stone, 0, deck + 0.02, ez);
        for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.45, 0.95, el), stone, sx * (w / 2 + 0.05), deck + 0.6, ez);
      }
      g.position.set(c.x, 0, c.z);
      c.span = span;
      c.spanL = spanL;
      return g;
    },

    /** Stepping stones and stakes marking a ford. */
    fordMarks(c, terrain) {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0x6d675c, roughness: 1 });
      for (let i = 0; i < 10; i++) {
        const x = c.x + (i % 2 ? -1 : 1) * (c.width / 2 + 0.5);
        const z = c.z - halfWidth + (i / 9) * halfWidth * 2;
        const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 5), mat);
        stake.position.set(x, Math.max(level, terrain.heightAt(x, z)) + 0.5, z);
        g.add(stake);
      }
      return g;
    },

    /**
     * A bridge layer's bridge across at x: the ground under it rises to deck height (so units
     * walk over it like any bridge), a steel treadway span on top, and a new crossing in the list
     * — routes plan over it, engineers can blow it. Returns the crossing.
     */
    lay(x, terrain, scene) {
      const width = 4.4;
      const c = { id: this.crossings.length, name: 'assault bridge', kind: 'bridge', x, z: path(x), width, blown: false, laid: true };
      this.crossings.push(c);
      const along = halfWidth + 7;
      terrain.dig(x, c.z, along + width, -1, (px, pz) => {
        const ax = 1 - smoothstep(width * 0.5 - 0.2, width * 0.5 + 0.6, Math.abs(px - x));
        const az = 1 - smoothstep(along - 3, along, Math.abs(pz - c.z));
        return ax * az * Math.max(0, deck - 0.15 - terrain.heightAt(px, pz));
      }, 0);
      const g = new THREE.Group();
      const span = this.steelSpan();
      span.position.y = deck;
      g.add(span);
      const L = along * 2;
      g.position.set(x, 0, c.z);
      scene.add(g);
      c.mesh = g;
      c.span = span;
      c.spanL = L;
      return c;
    },

    /** Length of a laid bridge, bank to bank. */
    get spanLength() {
      return (halfWidth + 7) * 2;
    },

    /** Deck height of every bridge. */
    get deck() {
      return deck;
    },

    /**
     * A bridge layer's steel span, centred on its middle with the deck at y = 0, along z: two
     * treadways on side girders, the scissors hinge in the middle, short ramps at the ends.
     * `L`: its length (a half of the scissors for the laying animation).
     */
    steelSpan(L = (halfWidth + 7) * 2) {
      const steel = new THREE.MeshStandardMaterial({ color: 0x4f5446, roughness: 0.8, metalness: 0.3 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x2c2f28, roughness: 0.9 });
      const span = new THREE.Group();
      const add = (geo, mat, px, py, pz) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(px, py, pz);
        m.castShadow = m.receiveShadow = true;
        span.add(m);
      };
      for (const sx of [-1, 1]) {
        add(new THREE.BoxGeometry(1.7, 0.22, L), steel, sx * 1.1, 0, 0);            // the two treadways
        add(new THREE.BoxGeometry(0.16, 0.7, L - 2), dark, sx * 2.05, -0.2, 0);      // side girders
      }
      add(new THREE.BoxGeometry(4.4, 0.5, 0.4), dark, 0, -0.3, 0);                   // the hinge in the middle
      for (const end of [-1, 1]) add(new THREE.BoxGeometry(4.4, 0.12, 1.6), steel, 0, -0.15, end * (L / 2 - 0.4)); // ramps onto the banks
      return span;
    },

    /** The bridge is blown: the span falls into the river (terrain and looks). */
    blow(c, terrain, scene) {
      if (c.blown || c.kind !== 'bridge') return;
      c.blown = true;
      const spanHalf = halfWidth + 1;
      const target = level - depth + 0.4;
      terrain.dig(c.x, c.z, Math.max(c.width, spanHalf * 2) + 4, deck - target, (x, z) => {
        const ax = 1 - smoothstep(c.width * 0.5 - 0.2, c.width * 0.5 + 0.8, Math.abs(x - c.x));
        const az = 1 - smoothstep(spanHalf - 2, spanHalf + 1, Math.abs(z - c.z));
        // only what is above the river bed comes down
        const h = terrain.heightAt(x, z);
        return ax * az * Math.max(0, Math.min(1, (h - target) / (deck - target)));
      }, 0.2);
      if (c.span) {
        c.span.visible = false;
        // the wreck of the span: broken slabs tilted into the water
        const stone = c.span.children[0].material;
        for (let i = 0; i < 4; i++) {
          const slab = new THREE.Mesh(new THREE.BoxGeometry(c.width * (0.6 + Math.random() * 0.4), 0.6, c.spanL / 4.5), stone);
          slab.position.set(c.x + (Math.random() - 0.5) * 2, level - 0.4 + Math.random() * 0.6, c.z + (i - 1.5) * (c.spanL / 4.2));
          slab.rotation.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.6);
          slab.castShadow = true;
          scene.add(slab);
        }
      }
    },
  };
  return river;
}
