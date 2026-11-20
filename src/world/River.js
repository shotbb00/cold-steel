// A river on a map, and the few places to get over it — the choke points.
//   carve(x, z, h)  the map's height function runs its ground through this: a flat floodplain
//                   along the water, the channel below it, shallow beds at fords, and each
//                   bridge as a raised stone causeway (the deck units walk on is real terrain)
//   water           { level, deep }: deeper than `deep` (m) stops anyone (UnitStack.moveBody);
//                   shallower water slows (a wading man, a tank pushing through a ford)
//   bridgeAt(x, z)  the bridge here, for engineers' demolition charges
//   blow(c)         a bridge goes: the span drops into the river (terrain dug out, mesh broken)
//   lay(x, …, z)    a bridge layer puts a steel treadway bridge across at (x, z): a new crossing
//   build(scene)    the water surface and the bridges
//
// A channel is either
//   a function z = f(x)  — the classic river across the map from side to side, between the bases (exactly as before), or
//   a course [[x, z], …] — a line of points in any direction: down a flank, round a bend and back, rising inside the
//                          map and running out at its edge (the ends are rounded: a spring, a pool). `width` per point
//                          ([x, z, halfWidth]) narrows or widens it along its course (a brook into a river).
// Crossings: { id, name, x, z?, kind: 'bridge' | 'ford', width, channel } — on a course channel (x, z) is any point at
// the water, taken to the nearest place on the channel; a bridge or ford there lies square across the flow. Each
// crossing knows its frame: (tx, tz) along the flow, (nx, nz) across it — local(c, x, z) and at(c, u, v) convert.
// Several channels (`paths`: rivers side by side, splitting the land) share one river object: every question about a
// point is answered for the channel nearest to it. Routes over the river are world/Nav.js's: bridges are raised
// terrain, so the way over is open ground.
import * as THREE from 'three';
import { smoothstep } from '../core/math.js';

const BANK = 0.9;           // floodplain height above the water
const CELL = 32;            // m: the course channels' lookup grid
const STEP = 6;             // m: a course channel resampled this fine

/**
 * One channel: `info(x, z)` → { d (to the centre line), side (±1, which bank), px, pz (the nearest point on the
 * line), tx, tz (along the flow), nx, nz (across it, toward side +1), hw (its half-width there) }.
 */
function fnChannel(f, halfWidth) {
  // the classic channel: answers exactly as the river always has (distance and side along z, bridges square to z)
  return {
    fn: f,
    info(x, z) { const pz = f(x); const dz = z - pz; return { d: Math.abs(dz), side: Math.sign(dz) || 1, px: x, pz, tx: 1, tz: 0, nx: 0, nz: 1, hw: halfWidth }; },
    zAt: (x) => f(x),
    course(step) { const out = []; for (let x = -900; x <= 900; x += step) out.push([x, f(x), 0, 1]); return out; },
  };
}

function courseChannel(raw, halfWidth, reach) {
  // resample the course every STEP m (straight between the given points), half-width carried along
  const pts = [];
  for (let i = 0; i < raw.length - 1; i++) {
    const [ax, az, aw = halfWidth] = raw[i], [bx, bz, bw = halfWidth] = raw[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / STEP));
    for (let k = 0; k < n; k++) { const t = k / n; pts.push([ax + (bx - ax) * t, az + (bz - az) * t, aw + (bw - aw) * t]); }
  }
  const last = raw[raw.length - 1];
  pts.push([last[0], last[1], last[2] ?? halfWidth]);
  // which segments come within `reach` of each grid cell (the floodplain's width and then some): far ground skips the work
  const grid = new Map();
  const key = (i, j) => i * 100003 + j;
  for (let s = 0; s < pts.length - 1; s++) {
    const [ax, az] = pts[s], [bx, bz] = pts[s + 1];
    const r = reach + Math.max(pts[s][2], pts[s + 1][2]);
    const i0 = Math.floor((Math.min(ax, bx) - r) / CELL), i1 = Math.floor((Math.max(ax, bx) + r) / CELL);
    const j0 = Math.floor((Math.min(az, bz) - r) / CELL), j1 = Math.floor((Math.max(az, bz) + r) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = key(i, j); let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(s); }
  }
  const FAR = { d: Infinity, side: 1, px: 0, pz: 0, tx: 1, tz: 0, nx: 0, nz: 1, hw: halfWidth };
  const info = (x, z, all = false) => {
    const segs = all ? pts.map((_, i) => i).slice(0, -1) : grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!segs) return FAR;
    let best = Infinity, bs = 0, bt = 0;
    for (const s of segs) {
      const [ax, az] = pts[s], [bx, bz] = pts[s + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const ex = x - ax - dx * t, ez = z - az - dz * t, d2 = ex * ex + ez * ez;
      if (d2 < best) { best = d2; bs = s; bt = t; }
    }
    const [ax, az, aw] = pts[bs], [bx, bz, bw] = pts[bs + 1], L = Math.hypot(bx - ax, bz - az) || 1;
    const tx = (bx - ax) / L, tz = (bz - az) / L, nx = -tz, nz = tx;
    const px = ax + (bx - ax) * bt, pz = az + (bz - az) * bt;
    const side = Math.sign((x - px) * nx + (z - pz) * nz) || 1;
    return { d: Math.sqrt(best), side, px, pz, tx, tz, nx, nz, hw: aw + (bw - aw) * bt };
  };
  return {
    pts,
    info,
    zAt: (x, z) => info(x, z ?? 0, true).pz,
    course(step) {
      const out = [];
      for (let s = 0; s < pts.length - 1; s++) {
        const [ax, az] = pts[s], [bx, bz] = pts[s + 1], L = Math.hypot(bx - ax, bz - az) || 1, tx = (bx - ax) / L, tz = (bz - az) / L;
        for (let a = 0; a < L; a += step) out.push([ax + tx * a, az + tz * a, -tz, tx]);
      }
      return out;
    },
  };
}

/** @param {any} o  options, untyped until this file moves to TypeScript */
export function createRiver({ path, paths = [path], halfWidth = 12, level = 0, depth = 2.4, valley = 70, crossings = [] }) {
  const deck = level + BANK + 0.25;
  const chans = paths.map((p) => (typeof p === 'function' ? fnChannel(p, halfWidth) : courseChannel(p, halfWidth, valley + 20)));
  /** The channel nearest (x, z) and what it says about the point. */
  const near = (x, z, full = false) => {
    let ci = 0, I = chans[0].info(x, z, full);
    for (let i = 1; i < chans.length; i++) { const J = chans[i].info(x, z, full); if (J.d < I.d) { ci = i; I = J; } }
    return !full && I.d === Infinity ? near(x, z, true) : { ci, I }; // (out past a course channel's grid: the whole course searched — rare, never in carve)
  };
  /** carve's own lookup: far ground (beyond every course channel's reach) is left alone without the full search. */
  const nearCarve = (x, z) => {
    let ci = 0, I = chans[0].info(x, z);
    for (let i = 1; i < chans.length; i++) { const J = chans[i].info(x, z); if (J.d < I.d) { ci = i; I = J; } }
    return { ci, I };
  };
  /** A crossing's place and frame on its channel. */
  const frame = (c) => {
    const ch = chans[c.channel ?? 0];
    const I = ch.fn ? ch.info(c.x, ch.fn(c.x)) : ch.info(c.x, c.z ?? 0, true);
    return { x: I.px, z: I.pz, tx: I.tx, tz: I.tz, nx: I.nx, nz: I.nz, hw: I.hw };
  };
  const river = {
    channels: paths,
    channelAt: (x, z) => (z == null ? 0 : near(x, z).ci),
    /** The water's centre line at x — of the channel nearest to (x, z). (A course channel: the nearest point's z.) */
    path: (x, z) => { const ch = chans[z == null ? 0 : near(x, z).ci]; return ch.fn ? ch.fn(x) : ch.info(x, z ?? 0, true).pz; },
    /** Where (x, z) is against the nearest channel: { ci, d, side, px, pz, tx, tz, nx, nz, hw }. */
    project(x, z) { const { ci, I } = near(x, z); return { ci, ...I }; },
    /** Points along channel `ci` every `step` m: [x, z, nx, nz] (the water's centre, the way across). */
    course: (ci, step = 8) => chans[ci].course(step),
    halfWidth,
    level,
    crossings: crossings.map((c, i) => { const c0 = { id: i, blown: false, channel: 0, ...c }; return { ...c0, ...frame(c0) }; }),
    water: { level, deep: 0.95 },

    /** (x, z) in crossing c's frame: u along the flow (across the deck's width), v across the river (along the span). */
    local(c, x, z) { const dx = x - c.x, dz = z - c.z; return { u: dx * (c.tx ?? 1) + dz * (c.tz ?? 0), v: dx * (c.nx ?? 0) + dz * (c.nz ?? 1) }; },
    /** The world point u along the flow, v across the river from crossing c. */
    at(c, u, v) { return { x: c.x + u * (c.tx ?? 1) + v * (c.nx ?? 0), z: c.z + u * (c.tz ?? 0) + v * (c.nz ?? 1) }; },
    /** The yaw that turns a model's +z across the river at crossing c (bridges, spans, charges). */
    yawOf(c) { return Math.atan2(c.nx ?? 0, c.nz ?? 1); },

    carve(x, z, h) {
      const { ci, I } = nearCarve(x, z);
      if (I.d === Infinity) return h; // (far from every course channel)
      const hw = I.hw, dz = I.d;
      // the floodplain: ground near the river comes down to just above the water
      const plain = level + BANK;
      const v = 1 - smoothstep(hw + 6, valley - halfWidth + hw, dz);
      h += (plain - h) * v;
      // the channel, shallower at fords
      let bed = level - depth;
      for (const c of this.crossings) {
        if (c.kind !== 'ford' || c.channel !== ci) continue;
        const k = 1 - smoothstep(c.width * 0.5, c.width * 0.5 + 10, Math.abs(this.local(c, x, z).u));
        bed += (level - (c.depth ?? 0.6) - bed) * k;
      }
      const ch = 1 - smoothstep(hw * 0.45, hw * 1.08, dz);
      h += (bed - h) * ch;
      // bridges: a level causeway across, as wide as the deck
      for (const c of this.crossings) {
        if (c.kind !== 'bridge') continue;
        const L = this.local(c, x, z);
        const along = 1 - smoothstep(halfWidth + 4, halfWidth + 14, Math.abs(L.v));
        const across = 1 - smoothstep(c.width * 0.5 - 0.3, c.width * 0.5 + 0.6, Math.abs(L.u));
        const k = along * across;
        if (k > 0) h = Math.max(h, h + (deck - h) * k);
      }
      return h;
    },

    side(x, z) {
      return near(x, z).I.side;
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
      const I = near(p.x, p.z).I;
      if (I.d > I.hw + 2 || this.bridgeAt(p.x, p.z)) return p; // dry land, or a bridge deck
      return { x: I.px + I.nx * I.side * (I.hw + 4), z: I.pz + I.nz * I.side * (I.hw + 4) };
    },

    bridgeAt(x, z) {
      for (const c of this.crossings) {
        if (c.kind !== 'bridge') continue;
        const L = this.local(c, x, z);
        if (Math.abs(L.u) < c.width / 2 + 4 && Math.abs(L.v) < halfWidth + 10) return c;
      }
      return null;
    },

    // ---------------------------------------------------------------- looks

    build(scene, terrain) {
      // the water: a flat sheet along each channel (the banks cover it everywhere else)
      const waterMat = new THREE.MeshStandardMaterial({ color: 0x3e4f52, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.88 });
      chans.forEach((ch) => {
        let water;
        if (ch.fn) {
          const zs = [];
          for (let x = -820; x <= 820; x += 20) zs.push(ch.fn(x)); // (past the edge of the big maps' terrain)
          const z0 = Math.min(...zs) - halfWidth - 20;
          const z1 = Math.max(...zs) + halfWidth + 20;
          water = new THREE.Mesh(new THREE.PlaneGeometry(1100, z1 - z0, 1, 1), waterMat);
          water.rotation.x = -Math.PI / 2;
          water.position.set(0, level, (z0 + z1) / 2);
        } else water = new THREE.Mesh(this.ribbon(ch), waterMat); // a course: a ribbon along it, wider than the banks
        water.receiveShadow = true;
        water.userData.noAO = true;
        scene.add(water);
        this.waterMesh ??= water;
      });
      const stone = new THREE.MeshStandardMaterial({ color: 0x8a857a, roughness: 0.95 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x2c2b28, roughness: 1 });
      for (const c of this.crossings) {
        if (c.kind === 'bridge') c.mesh = this.bridgeMesh(c, stone, dark, terrain);
        if (c.mesh) scene.add(c.mesh);
        if (c.kind === 'ford') c.mesh = this.fordMarks(c, terrain);
        if (c.mesh) scene.add(c.mesh);
      }
    },

    /** The water sheet of a course channel: a flat strip along its points, out past the banks, round at the ends. */
    ribbon(ch) {
      const pos = [], idx = [];
      const P = ch.pts;
      for (let i = 0; i < P.length; i++) {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L, w = P[i][2] + 20;
        pos.push(P[i][0] + nx * w, level, P[i][1] + nz * w, P[i][0] - nx * w, level, P[i][1] - nz * w);
        if (i) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
      }
      for (const end of [0, P.length - 1]) { // a disc at each end: the water reaches round the rounded banks there
        const base = pos.length / 3, [ex, ez, ew] = P[end], r = ew + 20, n = 16;
        pos.push(ex, level, ez);
        for (let k = 0; k <= n; k++) { const a = (k / n) * Math.PI * 2; pos.push(ex + Math.cos(a) * r, level, ez + Math.sin(a) * r); }
        for (let k = 0; k < n; k++) idx.push(base, base + 2 + k, base + 1 + k);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      for (let i = 0, nrm = g.attributes.normal; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0); // (flat water: straight up, whichever way a triangle wound)
      return g;
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
      g.rotation.y = this.yawOf(c); // (square across the flow)
      c.span = span;
      c.spanL = spanL;
      return g;
    },

    /** Stepping stones and stakes marking a ford. */
    fordMarks(c, terrain) {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0x6d675c, roughness: 1 });
      for (let i = 0; i < 10; i++) {
        const { x, z } = this.at(c, (i % 2 ? -1 : 1) * (c.width / 2 + 0.5), -halfWidth + (i / 9) * halfWidth * 2);
        const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 5), mat);
        stake.position.set(x, Math.max(level, terrain.heightAt(x, z)) + 0.5, z);
        g.add(stake);
      }
      return g;
    },

    /**
     * A bridge layer's bridge across at x (on the channel nearest (x, z)): the ground under it rises to deck height (so
     * units walk over it like any bridge), a steel treadway span on top, and a new crossing in the list — routes plan
     * over it, engineers can blow it. Returns the crossing.
     */
    lay(x, terrain, scene, z = null) {
      const width = 4.4;
      const channel = z == null ? 0 : near(x, z).ci;
      const c0 = { id: this.crossings.length, name: 'assault bridge', kind: 'bridge', x, z, channel, width, blown: false, laid: true };
      const c = { ...c0, ...frame(c0) };
      this.crossings.push(c);
      const along = halfWidth + 7;
      terrain.dig(c.x, c.z, along + width, -1, (px, pz) => {
        const L = this.local(c, px, pz);
        const ax = 1 - smoothstep(width * 0.5 - 0.2, width * 0.5 + 0.6, Math.abs(L.u));
        const az = 1 - smoothstep(along - 3, along, Math.abs(L.v));
        return ax * az * Math.max(0, deck - 0.15 - terrain.heightAt(px, pz));
      }, 0);
      const g = new THREE.Group();
      const span = this.steelSpan();
      span.position.y = deck;
      g.add(span);
      const L = along * 2;
      g.position.set(c.x, 0, c.z);
      g.rotation.y = this.yawOf(c);
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
        const L = this.local(c, x, z);
        const ax = 1 - smoothstep(c.width * 0.5 - 0.2, c.width * 0.5 + 0.8, Math.abs(L.u));
        const az = 1 - smoothstep(spanHalf - 2, spanHalf + 1, Math.abs(L.v));
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
          const p = this.at(c, (Math.random() - 0.5) * 2, (i - 1.5) * (c.spanL / 4.2));
          slab.position.set(p.x, level - 0.4 + Math.random() * 0.6, p.z);
          slab.rotation.set((Math.random() - 0.5) * 0.9, this.yawOf(c) + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.6);
          slab.castShadow = true;
          scene.add(slab);
        }
      }
    },
  };
  return river;
}
