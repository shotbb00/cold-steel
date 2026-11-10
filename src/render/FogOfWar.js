// Fog of war you can see: everything outside what your side currently watches is drawn darker
// and greyer — the ground, trees, houses, vehicles — in the command view and in direct control.
//   • about every 0.2 s each of your units casts rays across its view cone out to its sight range
//     (VisibilitySystem's rules: stats.sight / fov, binoculars when still, the 12 m all-round
//     awareness, smoke screens). A cell is lit if a man standing there would show over the
//     terrain between — ridges and hollows cast real "sight shadows"
//   • the work is spread over frames (≤ ~1.5 ms each) into a fresh grid, swapped in when done;
//     the shown grid (256², covering the play area) fades toward it so the fog drifts rather
//     than flickers, and goes to the GPU as a small texture (filtered: soft edges)
//   • every lit material samples it at its world position just before scene fog (shader
//     injection, swept up again as new materials appear). UI decals (toneMapped: false), the
//     sky and particles are left alone.
// It's a picture of your units' view, not of the rules' exact result (target posture and
// cover aren't counted): enemies outside it are hidden, enemies inside may still be prone in cover.
import { airEyes } from '../systems/VisibilitySystem.js';
import * as THREE from 'three';

const N = 256;
const INTERVAL = 0.2;       // seconds between fresh pictures (at least)
const BUDGET_MS = 1.5;      // per frame
const SWEEP_PER_FRAME = 300; // scene objects checked for new materials per frame
const AWARE = 12;            // metres seen all round (as in VisibilitySystem)
const TARGET_H = 1.2;        // the height that has to show over the terrain
const SHIP_H = 6;           // at sea: a ship's upperworks that have to show over an island
const FADE = 5;              // per second toward the new picture
const PATCHED = Symbol('fow');

export class FogOfWar {
  constructor(game) {
    this.game = game;
    const b = game.world.bounds;
    this.half = Math.max(b.x, b.z) + 30;
    this.cell = (this.half * 2) / N;
    this.target = new Float32Array(N * N);  // the latest finished picture
    this.next = new Float32Array(N * N);    // the one being built
    this.cur = new Float32Array(N * N);     // what's shown (fading toward target)
    this.queue = [];                        // views still to cast for `next`
    this.data = new Uint8Array(N * N);
    this.texture = new THREE.DataTexture(this.data, N, N, THREE.RedFormat, THREE.UnsignedByteType);
    this.texture.magFilter = this.texture.minFilter = THREE.LinearFilter;
    this.texture.needsUpdate = true;
    this.uniforms = {
      fowMap: { value: this.texture },
      fowBox: { value: new THREE.Vector4(-this.half, -this.half, 1 / (this.half * 2), 1 / (this.half * 2)) },
      fowAmount: { value: 1 },
    };
    this.timer = 0;
    this.sweepT = 0;
    this.first = true;
    this.patchScene();
    this.compute();
  }

  /** How well (0..1) your side sees the ground at (x, z) right now. */
  at(x, z) {
    const ix = Math.floor((x + this.half) / this.cell);
    const iz = Math.floor((z + this.half) / this.cell);
    if (ix < 0 || iz < 0 || ix >= N || iz >= N) return 0;
    return this.cur[iz * N + ix];
  }

  update(dt, force = false) {
    // at night the dark is already doing much of the job: unseen ground is dimmed less
    this.uniforms.fowAmount.value = this.game.visibility.enabled === false ? 0 : (this.game.conditions?.night ? 0.6 : 1) * (this.game.map.fow ?? 1); // (a sea map: lighter — most of a 5 km sea is out of sight)
    this.timer -= dt;
    if (force) this.compute();
    else if (this.queue.length) this.work();
    else if (this.timer <= 0) {
      this.timer = INTERVAL;
      this.begin();
      this.work();
    }
    const k = this.first || force ? 1 : Math.min(1, dt * FADE);
    this.first = false;
    const { cur, target, data } = this;
    if (k > 0) {
      for (let i = 0; i < cur.length; i++) {
        const v = cur[i] + (target[i] - cur[i]) * k;
        cur[i] = v;
        data[i] = v * 255;
      }
      this.texture.needsUpdate = true;
    }
    this.sweepT -= dt;
    this.sweepStep();
  }

  // ---------------------------------------------------------------- what we see

  /** All at once (start of battle, tests). */
  compute() {
    this.begin();
    while (this.queue.length) this.work(Infinity);
  }

  /** Start a fresh picture: the views to cast. */
  begin() {
    const g = this.game;
    this.next.fill(0);
    this.queue.length = 0;
    const seen = new Set();
    for (const s of g.world.stacks) {
      if (!s.alive || s.faction !== g.playerFaction) continue;
      for (const u of s.units) {
        if (!u.alive) continue;
        const facing = s.usesCover ? u.yaw : u.turretYaw;
        // squads bunch up and look the same way: one cast for near-identical views
        const key = `${Math.round(u.pos.x / 3)},${Math.round(u.pos.z / 3)},${Math.round(facing / 0.3)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        this.queue.push([u, facing]);
      }
    }
    for (const e of airEyes(g, g.playerFaction)) this.queue.push([e, 0]); // (your aircraft in the air: views of their own)
    if (!this.queue.length) this.target.fill(0);
  }

  /** Cast views for up to `budget` ms; when the last one is done, the new picture goes up. */
  work(budget = BUDGET_MS) {
    const t0 = performance.now();
    while (this.queue.length) {
      const [u, facing] = this.queue.pop();
      if (u.alive) this.cast(u, facing);
      if (this.queue.length && performance.now() - t0 > budget) return; // (the last one done: the picture goes up now, or the next begin() threw it away)
    }
    this.markLocated();
    const done = this.target;
    this.target = this.next;
    this.next = done;
  }

  /** An enemy everyone can see for now (her own searchlight, a recon photo, a counter-battery fix: VisibilitySystem `located`): clear ground round her, so she isn't drawn in the dark. */
  markLocated() {
    const g = this.game, { cell, half, next: t } = this;
    for (const s of g.world.stacks) {
      if (!s.alive || s.faction === g.playerFaction) continue;
      for (const u of s.units) {
        if (!u.alive || !(u.locatedUntil > g.time || (u.radarUntil > g.time && u.spotted))) continue;
        const r = Math.max(40, (s.type.hull?.length ?? 0) * 0.7), n = Math.ceil(r / cell);
        const cx = Math.floor((u.pos.x + half) / cell), cz = Math.floor((u.pos.z + half) / cell);
        for (let dz = -n; dz <= n; dz++) for (let dx = -n; dx <= n; dx++) {
          const ix = cx + dx, iz = cz + dz;
          if (ix < 0 || iz < 0 || ix >= N || iz >= N || (dx * dx + dz * dz) * cell * cell > r * r) continue;
          t[iz * N + ix] = 1;
        }
      }
    }
  }

  /** Mark what unit `u`, looking along `facing`, can see. */
  cast(u, facing) {
    const { cell, half, next: t } = this;
    const terrain = this.game.terrain;
    const sea = this.game.world.river?.sea ? this.game.world.river.level : -Infinity; // (at sea the ground is the water: the sea floor's hills cast no sight shadows over it)
    const smoke = this.game.smoke;
    const smoky = smoke?.clouds?.length > 0;
    const st = u.stats;
    const cond = this.game.conditions;
    const flares = this.game.flares;
    const base = (st.sight ?? 100) * (st.binoculars && !u.moving ? 1.25 : 1);
    const range = (base * (cond ? cond.sightFor(st, u.faction, false) : 1) + TARGET_H * 4) * 1.1; // (a little past the spotting range, VisibilitySystem.isSeen: what your men spot is drawn, not left in the dark)
    // under a flare's light the night range doesn't apply
    const litRange = flares?.list.length ? base * cond.sightFor(st, u.faction, true) + TARGET_H * 4 : range;
    const far = Math.max(range, litRange);
    const fov = st.fov ?? 2.1;
    const eye = u.pos.y + (st.eyeHeight ?? 1.5);
    const mark = (x, z, v) => {
      const ix = Math.floor((x + half) / cell);
      const iz = Math.floor((z + half) / cell);
      if (ix < 0 || iz < 0 || ix >= N || iz >= N) return false;
      const i = iz * N + ix;
      if (v > t[i]) t[i] = v;
      return true;
    };
    // a ship at sea: all round, rays over the ground's height a cell (seaGround, sampled once: terrain samples
    // over kilometres a ray would be a frame's budget many times over) — the high islands hide what's behind
    if (sea > -Infinity && st.naval) {
      if ((u.depth ?? 0) > 9) return; // (deep down: blind)
      const G = (this.seaGround ??= Float32Array.from({ length: N * N }, (_, k) => Math.max(sea, terrain.heightAt((k % N + 0.5) * cell - half, (Math.floor(k / N) + 0.5) * cell - half))));
      const rays = Math.ceil((Math.PI * 2 * range) / (cell * 1.1));
      for (let i = 0; i < rays; i++) {
        const a = (Math.PI * 2 * i) / rays, sx = Math.sin(a), sz = Math.cos(a);
        let maxSlope = -Infinity;
        for (let d = cell * 0.9; d <= range; d += cell * 0.9) {
          const ix = Math.floor((u.pos.x + sx * d + half) / cell), iz = Math.floor((u.pos.z + sz * d + half) / cell);
          if (ix < 0 || iz < 0 || ix >= N || iz >= N) break;
          const k = iz * N + ix, ground = G[k];
          if ((ground + SHIP_H - eye) / d >= maxSlope) { const v = Math.min(1, (range - d) / 10 + 0.15); if (v > t[k]) t[k] = v; }
          const slope = (ground + 0.2 - eye) / d;
          if (slope > maxSlope) maxSlope = slope;
        }
      }
      return;
    }
    // all-round awareness
    const r = Math.ceil(AWARE / cell);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if ((dx * dx + dz * dz) * cell * cell <= AWARE * AWARE) mark(u.pos.x + dx * cell, u.pos.z + dz * cell, 1);
      }
    }
    // rays across the cone; a cell is seen if a man there would show over everything nearer
    const rays = Math.max(8, Math.ceil((fov * far) / (cell * 1.1)));
    const step = cell * 0.9;
    for (let i = 0; i < rays; i++) {
      const a = facing - fov / 2 + (fov * (i + 0.5)) / rays;
      const sx = Math.sin(a);
      const sz = Math.cos(a);
      let maxSlope = -Infinity;
      for (let d = step; d <= far; d += step) {
        const x = u.pos.x + sx * d;
        const z = u.pos.z + sz * d;
        if (smoky && smoke.inside(x, z)) break;
        const ground = Math.max(sea, terrain.heightAt(x, z));
        const reach = d <= range ? range : flares.lit(x, z) ? litRange : 0;
        if (reach && (ground + TARGET_H - eye) / d >= maxSlope) {
          if (!mark(x, z, Math.min(1, (reach - d) / 10 + 0.15))) break;
        }
        const slope = (ground + 0.2 - eye) / d;
        if (slope > maxSlope) maxSlope = slope;
      }
    }
  }

  // ---------------------------------------------------------------- shading

  /** Teach every lit material in the scene to darken what we can't see. */
  patchScene() {
    this.game.scene.traverse((o) => this.patchObject(o));
  }

  patchObject(o) {
    const m = o.material;
    if (!m) return;
    if (Array.isArray(m)) m.forEach((x) => this.patch(x));
    else this.patch(m);
  }

  /**
   * New materials keep appearing (new unit types, wrecks, structures): walk the scene for them
   * every couple of seconds, a few hundred objects a frame so the walk never shows as a hitch.
   */
  sweepStep() {
    if (!this.walk) {
      if (this.sweepT > 0) return;
      this.walk = [this.game.scene];
    }
    for (let n = 0; n < SWEEP_PER_FRAME && this.walk.length; n++) {
      const o = this.walk.pop();
      this.patchObject(o);
      for (const c of o.children) this.walk.push(c);
    }
    if (!this.walk.length) {
      this.walk = null;
      this.sweepT = 2;
    }
  }

  patch(m) {
    if (m[PATCHED] || m.isShaderMaterial || m.fog === false || m.toneMapped === false) return;
    m[PATCHED] = true;
    const before = m.onBeforeCompile;
    const key = m.customProgramCacheKey();
    const uniforms = this.uniforms;
    m.onBeforeCompile = function (shader, renderer) {
      before?.call(this, shader, renderer);
      if (!shader.vertexShader.includes('#include <fog_vertex>') || !shader.fragmentShader.includes('#include <fog_fragment>')) return;
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = `varying vec2 vFowXZ;\n${shader.vertexShader}`.replace('#include <fog_vertex>', `#include <fog_vertex>
        {
          vec4 fw = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            fw = instanceMatrix * fw;
          #endif
          fw = modelMatrix * fw;
          vFowXZ = fw.xz;
        }`);
      shader.fragmentShader = `uniform sampler2D fowMap;\nuniform vec4 fowBox;\nuniform float fowAmount;\nvarying vec2 vFowXZ;\n${shader.fragmentShader}`
        .replace('#include <fog_fragment>', `{
          vec2 fuv = ( vFowXZ - fowBox.xy ) * fowBox.zw;
          float fv = ( fuv.x < 0.0 || fuv.y < 0.0 || fuv.x > 1.0 || fuv.y > 1.0 ) ? 0.0 : texture2D( fowMap, fuv ).r;
          float k = mix( 1.0, fv, fowAmount );
          vec3 c = gl_FragColor.rgb;
          float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
          c = mix( vec3( l ) * vec3( 0.88, 0.94, 1.08 ), c, 0.12 + 0.88 * k ); // unseen: grey, a little cold
          gl_FragColor.rgb = c * ( 0.3 + 0.7 * k );                            // … and dark
        }
        #include <fog_fragment>`);
    };
    m.customProgramCacheKey = () => `${key}|fow`;
    m.needsUpdate = true;
  }
}
