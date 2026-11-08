// Foam on the sea (world/Sea.js `foam`): a grid of bytes over the map, one texel ~6 m, that the water
// shader reads by world position and breaks up with noise. Here it is written: eight times a second
// every texel fades a little (a wake lasts half a minute), and what moves on the water stamps into it —
//   a ship under way: churned water off the stern, all along the way it went (so the trail curves with
//                     her turns), wider and whiter the faster she goes; a bow wave
//   a submarine:      the same on the surface, a thin feather behind the periscope just under it, a
//                     boil of foam where she dives or surfaces
//   a torpedo:        its bubble track (not the Japanese oxygen torpedoes: they ran wakeless)
// Only what the player can see leaves foam (an unseen ship's wake would give her away).
const TICK = 0.125;

export class SeaFoam {
  constructor(game, sea) {
    this.game = game;
    this.f = sea.foam;
    this.acc = 0;
    this.last = new Map();   // unit → { x, z, depth } at the last tick
  }

  update(dt) {
    const f = this.f;
    if (!f) return;
    this.acc += dt;
    if (this.acc < TICK) return;
    const step = this.acc;
    this.acc = 0;
    const d = f.data;
    for (let i = 0; i < d.length; i++) if (d[i]) d[i]--;
    const seen = new Set();
    for (const s of this.game.world.stacks) {
      if (!s.alive || !s.stats.naval) continue;
      const len = Math.max(30, (s.footprint ?? 20) * 1.8);
      for (const u of s.units) {
        if (!u.alive) continue;
        seen.add(u);
        const was = this.last.get(u);
        const depth = u.depth ?? 0;
        this.last.set(u, { x: u.pos.x, z: u.pos.z, depth });
        if (!was || u.visible === false) continue;
        const v = Math.hypot(u.vel?.x ?? 0, u.vel?.z ?? 0);
        const fx = Math.sin(u.yaw), fz = Math.cos(u.yaw);
        if (s.stats.submarine && Math.abs(depth - was.depth) / step > 0.25 && Math.min(depth, was.depth) < 6) this.stamp(u.pos.x, u.pos.z, len * 0.35, 230); // diving, surfacing
        if (v < 0.6) continue;
        const k = Math.min(1, v / 9);
        if (depth < 1) {
          const back = len * 0.45;
          const r = Math.max(5, len * 0.07) * (0.7 + k * 0.6);
          this.line(was.x - fx * back, was.z - fz * back, u.pos.x - fx * back, u.pos.z - fz * back, r, 120 + 120 * k);   // off the stern
          this.stamp(u.pos.x + fx * len * 0.45, u.pos.z + fz * len * 0.45, r * 0.7, 90 * k);                               // the bow wave
        } else if (depth < 4) {
          this.line(was.x, was.z, u.pos.x, u.pos.z, 3, 90);   // the periscope's feather
        }
      }
    }
    for (const u of this.last.keys()) if (!seen.has(u)) this.last.delete(u);
    for (const t of this.game.torpedoes?.list ?? []) {
      if (t.wakeless) continue;
      this.line(t.x - t.dx * t.speed * step, t.z - t.dz * t.speed * step, t.x, t.z, 2.5, 140);
    }
    f.texture.needsUpdate = true;
  }

  /** A soft disc of foam: radius `r` m, `v` (0…255) at its middle. */
  stamp(x, z, r, v) {
    const f = this.f;
    const k = f.n * f.box.z;           // texels per metre
    const cx = (x - f.box.x) * k - 0.5;
    const cz = (z - f.box.y) * k - 0.5;
    const rr = Math.max(0.8, r * k);
    const d = f.data;
    for (let j = Math.max(0, Math.floor(cz - rr)); j <= Math.min(f.n - 1, Math.ceil(cz + rr)); j++) {
      for (let i = Math.max(0, Math.floor(cx - rr)); i <= Math.min(f.n - 1, Math.ceil(cx + rr)); i++) {
        const q = ((i - cx) ** 2 + (j - cz) ** 2) / (rr * rr);
        if (q >= 1) continue;
        const w = v * (1 - q);
        const idx = j * f.n + i;
        if (w > d[idx]) d[idx] = w;
      }
    }
  }

  /** Foam all along a→b. */
  line(ax, az, bx, bz, r, v) {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / (1 / (this.f.n * this.f.box.z))));
    if (n > 200) return; // (a teleport, not a passage)
    for (let i = 0; i <= n; i++) this.stamp(ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n, r, v);
  }
}
