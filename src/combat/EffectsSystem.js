// Battlefield effects: camera-facing soft particles in two pooled layers, plus a few pooled
// point lights for flashes.
//   smoke – normal blending: smoke, dust, dirt sprays, debris clods (fade in, grow, fade out)
//   fire  – additive: muzzle flashes, fireballs, sparks, burning wrecks (darken as they die)
// Particles have velocity, drag and gravity, so dirt thrown up by a shell falls back down and
// smoke drifts off with the wind. Emitters keep knocked-out vehicles burning for a while.
//
// API (used by projectiles, units and renderers):
//   impact(pos, surface, size)        – a bullet hitting 'ground' | 'stone' | 'armor' | 'flesh'
//   dust(pos, size)                   – a puff of dust (vehicle tracks, digging)
//   muzzle(pos, dir, size, weapon)    – flash and smoke at a muzzle ('rifle' | 'cannon' | 'rocket' | 'artillery')
//   explosion(pos, size, opts)        – HE burst: flash, fireball, dirt column, debris, smoke
//   trail(pos, dir)                   – one step of a rocket's smoke trail
//   burn(pos, duration, size)         – keep a wreck burning and smoking
import * as THREE from 'three';
import { wind } from '../world/Wind.js';

const MAX_SMOKE = 3000;
const MAX_FIRE = 1500;
const _p = new THREE.Vector3();
const _v = new THREE.Vector3();
const _c = new THREE.Color();
const rnd = (a, b) => a + Math.random() * (b - a);

/** Soft puff texture: radial falloff broken up by a little value noise (procedural canvas). */
function puffTexture(size = 64, hard = false) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const img = g.createImageData(size, size);
  const lumps = Array.from({ length: 7 }, () => [rnd(0.3, 0.7) * size, rnd(0.3, 0.7) * size, rnd(0.18, 0.32) * size]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) * 2;
      let a = Math.max(0, 1 - r);
      a = hard ? Math.min(1, a * 3) : a * a * (3 - 2 * a);
      let lump = 0;
      for (const [lx, ly, lr] of lumps) lump += Math.max(0, 1 - Math.hypot(x - lx, y - ly) / lr);
      a *= hard ? 1 : 0.55 + 0.45 * Math.min(1, lump);
      const shade = hard ? 255 : 200 + 55 * Math.min(1, lump) * (1 - dy); // lit from above
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = shade;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const VERT = /* glsl */ `
  attribute vec3 aPos;
  attribute vec4 aColor;
  attribute vec2 aSizeRot;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFog;
  uniform float fogDensity;
  void main() {
    vUv = uv;
    vColor = aColor;
    vec4 mvPosition = viewMatrix * vec4(aPos, 1.0);
    float c = cos(aSizeRot.y), s = sin(aSizeRot.y);
    vec2 q = vec2(position.x * c - position.y * s, position.x * s + position.y * c);
    mvPosition.xy += q * aSizeRot.x;
    float d = -mvPosition.z;
    vFog = 1.0 - exp(-fogDensity * fogDensity * d * d);
    gl_Position = projectionMatrix * mvPosition;
  }`;

const FRAG_SMOKE = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 fogColor;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFog;
  void main() {
    vec4 t = texture2D(map, vUv);
    vec3 col = mix(vColor.rgb * t.rgb, fogColor, vFog);
    gl_FragColor = vec4(col, t.a * vColor.a);
    if (gl_FragColor.a < 0.004) discard;
  }`;

const FRAG_FIRE = /* glsl */ `
  uniform sampler2D map;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFog;
  void main() {
    vec4 t = texture2D(map, vUv);
    gl_FragColor = vec4(vColor.rgb * t.a * vColor.a * (1.0 - vFog), 1.0);
  }`;

/** One pooled billboard layer: structure-of-arrays sim + an instanced quad. */
class ParticleLayer {
  constructor(scene, max, { additive, texture }) {
    this.max = max;
    this.n = 0;
    this.additive = additive;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.t = new Float32Array(max);
    this.life = new Float32Array(max);
    this.size = new Float32Array(max);
    this.grow = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.rot = new Float32Array(max);
    this.spin = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.wind = new Float32Array(max);

    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aSizeRot = new THREE.InstancedBufferAttribute(new Float32Array(max * 2), 2).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aPos', this.aPos);
    geo.setAttribute('aColor', this.aColor);
    geo.setAttribute('aSizeRot', this.aSizeRot);
    geo.instanceCount = 0;
    this.geo = geo;

    const fog = scene.fog;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        fogColor: { value: fog ? fog.color : new THREE.Color() },
        fogDensity: { value: fog?.density ?? 0 },
      },
      vertexShader: VERT,
      fragmentShader: additive ? FRAG_FIRE : FRAG_SMOKE,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 3 : 2;
    this.mesh.userData.babylon = 'particles'; // render/babylon/extras.js draws the layer natively
    this.mesh.userData.layer = this;
    scene.add(this.mesh);
  }

  /**
   * o: { vx, vy, vz, size, grow, life, alpha, color (hex or Color), drag, gravity, wind, spin }
   * Oldest particles are recycled when the pool is full.
   */
  spawn(x, y, z, o) {
    let i = this.n;
    if (i >= this.max) i = Math.floor(Math.random() * this.max); else this.n++;
    const i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = o.vx ?? 0; this.vel[i3 + 1] = o.vy ?? 0; this.vel[i3 + 2] = o.vz ?? 0;
    _c.set(o.color ?? 0xffffff);
    if (o.bright) _c.multiplyScalar(o.bright);
    this.col[i3] = _c.r; this.col[i3 + 1] = _c.g; this.col[i3 + 2] = _c.b;
    this.t[i] = 0;
    this.life[i] = o.life ?? 1;
    this.size[i] = o.size ?? 1;
    this.grow[i] = o.grow ?? 1;
    this.alpha[i] = o.alpha ?? 1;
    this.rot[i] = Math.random() * 6.283;
    this.spin[i] = o.spin ?? rnd(-0.6, 0.6);
    this.drag[i] = o.drag ?? 1;
    this.grav[i] = o.gravity ?? 0;
    this.wind[i] = o.wind ?? 0;
  }

  update(dt) {
    let n = this.n;
    const { pos, vel, t, life } = this;
    for (let i = n - 1; i >= 0; i--) {
      t[i] += dt;
      if (t[i] >= life[i]) { this.kill(i, --n); continue; }
      const i3 = i * 3;
      const k = Math.max(0, 1 - this.drag[i] * dt);
      vel[i3] *= k; vel[i3 + 1] = vel[i3 + 1] * k - this.grav[i] * dt; vel[i3 + 2] *= k;
      const w = this.wind[i] * dt;
      pos[i3] += vel[i3] * dt + wind.x * w;
      pos[i3 + 1] += vel[i3 + 1] * dt;
      pos[i3 + 2] += vel[i3 + 2] * dt + wind.z * w;
      this.rot[i] += this.spin[i] * dt;
    }
    this.n = n;

    const P = this.aPos.array;
    const C = this.aColor.array;
    const S = this.aSizeRot.array;
    for (let i = 0; i < n; i++) {
      const p = t[i] / life[i];
      const i3 = i * 3;
      const i4 = i * 4;
      P[i3] = pos[i3]; P[i3 + 1] = pos[i3 + 1]; P[i3 + 2] = pos[i3 + 2];
      let a;
      let shade = 1;
      if (this.additive) {
        a = this.alpha[i] * (1 - p) * (1 - p);
        shade = 1 - p * 0.55; // cools toward red
        C[i4] = this.col[i3]; C[i4 + 1] = this.col[i3 + 1] * shade; C[i4 + 2] = this.col[i3 + 2] * shade * shade;
      } else {
        a = this.alpha[i] * Math.min(1, p * 8) * (1 - p) ** 1.4;
        C[i4] = this.col[i3]; C[i4 + 1] = this.col[i3 + 1]; C[i4 + 2] = this.col[i3 + 2];
      }
      C[i4 + 3] = a;
      S[i * 2] = this.size[i] * (1 + this.grow[i] * Math.sqrt(p));
      S[i * 2 + 1] = this.rot[i];
    }
    this.geo.instanceCount = n;
    this.aPos.needsUpdate = this.aColor.needsUpdate = this.aSizeRot.needsUpdate = true;
  }

  /** Move the last live particle into slot i. */
  kill(i, last) {
    if (i === last) return;
    const i3 = i * 3;
    const l3 = last * 3;
    for (const arr of [this.pos, this.vel, this.col]) {
      arr[i3] = arr[l3]; arr[i3 + 1] = arr[l3 + 1]; arr[i3 + 2] = arr[l3 + 2];
    }
    for (const arr of [this.t, this.life, this.size, this.grow, this.alpha, this.rot, this.spin, this.drag, this.grav, this.wind]) arr[i] = arr[last];
  }
}

// Palette
const DIRT = 0x5b4a36;
const DIRT_DARK = 0x3a2f24;
const DUST = 0x8a7a62;
const STONE_DUST = 0x9a958c;
const SMOKE_GREY = 0x6b6862;
const SMOKE_BLACK = 0x2a2725;
const FIRE = 0xffa040;
const FLASH = 0xffe2a8;
const SPARK = 0xffc060;
const BLOOD = 0x5a1410;

export class EffectsSystem {
  constructor(scene, bus) {
    this.scene = scene;
    this.smoke = new ParticleLayer(scene, MAX_SMOKE, { additive: false, texture: puffTexture(64) });
    this.fire = new ParticleLayer(scene, MAX_FIRE, { additive: true, texture: puffTexture(32, true) });
    this.emitters = [];
    // A few pooled point lights for muzzle blasts and explosions (fixed count: no shader recompiles).
    this.lights = Array.from({ length: 2 }, () => { // every light costs every lit pixel, even when off
      const l = new THREE.PointLight(0xffb060, 0, 30, 2);
      l.userData = { t: 1, life: 1, peak: 0 };
      scene.add(l);
      return l;
    });
    this.nextLight = 0;
  }

  flashLight(pos, peak, range, life = 0.12) {
    const l = this.lights[this.nextLight++ % this.lights.length];
    l.position.copy(pos);
    l.position.y += 1;
    l.distance = range;
    l.userData.t = 0;
    l.userData.life = life;
    l.userData.peak = peak;
  }

  /** A bullet striking something. */
  impact(pos, surface = 'ground', size = 1) {
    const S = this.smoke;
    if (surface === 'armor') {
      for (let i = 0; i < 5; i++) {
        this.fire.spawn(pos.x, pos.y, pos.z, {
          vx: rnd(-5, 5), vy: rnd(1, 6), vz: rnd(-5, 5), size: rnd(0.04, 0.08), grow: 0, life: rnd(0.15, 0.4),
          color: SPARK, bright: 3, gravity: 9, drag: 0.5,
        });
      }
      S.spawn(pos.x, pos.y, pos.z, { size: 0.3 * size, grow: 2, life: 0.6, alpha: 0.4, color: STONE_DUST, wind: 0.5 });
      return;
    }
    if (surface === 'flesh') {
      S.spawn(pos.x, pos.y, pos.z, { size: 0.2, grow: 1.5, life: 0.35, alpha: 0.5, color: BLOOD });
      return;
    }
    const stone = surface === 'stone';
    // a little spurt of dirt / grit thrown up and back, plus a lingering puff
    for (let i = 0; i < 4; i++) {
      S.spawn(pos.x, pos.y + 0.05, pos.z, {
        vx: rnd(-0.8, 0.8), vy: rnd(1.5, 4) * size, vz: rnd(-0.8, 0.8), size: rnd(0.07, 0.14) * size, grow: 0.5,
        life: rnd(0.5, 0.8), alpha: 0.9, color: stone ? STONE_DUST : DIRT, gravity: 9, drag: 1.5, spin: 0,
      });
    }
    S.spawn(pos.x, pos.y + 0.15, pos.z, {
      vy: rnd(0.3, 0.8), size: 0.35 * size, grow: 3, life: rnd(1, 1.8), alpha: 0.55,
      color: stone ? STONE_DUST : DUST, drag: 1.5, wind: 0.6,
    });
    if (stone && Math.random() < 0.35) {
      this.fire.spawn(pos.x, pos.y, pos.z, { vx: rnd(-4, 4), vy: rnd(1, 4), vz: rnd(-4, 4), size: 0.05, grow: 0, life: 0.2, color: SPARK, bright: 3, gravity: 9 });
    }
  }

  /** Dust kicked up by tracks, digging, a body hitting the ground. */
  dust(pos, size = 1) {
    this.smoke.spawn(pos.x + rnd(-0.3, 0.3) * size, pos.y + 0.2, pos.z + rnd(-0.3, 0.3) * size, {
      vy: rnd(0.2, 0.6), size: 0.4 * size, grow: 2.5, life: rnd(1.2, 2), alpha: 0.35, color: DUST, drag: 1, wind: 0.8,
    });
  }

  /** Muzzle flash (short, directional) and the puff of propellant smoke. */
  muzzle(pos, dir, size = 1, weapon = 'rifle') {
    const F = this.fire;
    const S = this.smoke;
    if (weapon === 'cannon' || weapon === 'artillery') {
      const big = weapon === 'artillery' ? 1.4 : 1;
      F.spawn(pos.x, pos.y, pos.z, { size: 2.2 * big, grow: 0.8, life: 0.09, color: FLASH, bright: 2.5 });
      for (let i = 1; i <= 3; i++) {
        F.spawn(pos.x + dir.x * i * 0.8, pos.y + dir.y * i * 0.8, pos.z + dir.z * i * 0.8, { size: (1.2 - i * 0.2) * big, grow: 0.5, life: 0.08, color: FIRE, bright: 3 });
      }
      this.flashLight(pos, 220 * big, 30 * big, 0.12);
      // the blast cloud: forward plume plus dust thrown up around the vehicle
      for (let i = 0; i < 8; i++) {
        const f = rnd(2, 9);
        S.spawn(pos.x, pos.y, pos.z, {
          vx: dir.x * f + rnd(-1, 1), vy: dir.y * f + rnd(0, 1), vz: dir.z * f + rnd(-1, 1),
          size: rnd(0.8, 1.3) * big, grow: 3, life: rnd(2.5, 4), alpha: 0.55, color: SMOKE_GREY, drag: 1.6, wind: 1,
        });
      }
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * 6.283;
        S.spawn(pos.x + Math.cos(a) * 2, pos.y - 1.6, pos.z + Math.sin(a) * 2, {
          vx: Math.cos(a) * 4, vy: 0.4, vz: Math.sin(a) * 4, size: 1.2 * big, grow: 2, life: 2.5, alpha: 0.3, color: DUST, drag: 1.4, wind: 1,
        });
      }
      return;
    }
    if (weapon === 'mortar') {
      // a dull pop and a puff straight up out of the tube
      F.spawn(pos.x, pos.y, pos.z, { size: 0.5, grow: 0.5, life: 0.06, color: FLASH, bright: 2 });
      for (let i = 0; i < 4; i++) {
        S.spawn(pos.x, pos.y, pos.z, { vx: dir.x * 3 + rnd(-0.5, 0.5), vy: dir.y * 3 + rnd(0, 1), vz: dir.z * 3 + rnd(-0.5, 0.5), size: rnd(0.4, 0.7), grow: 3, life: rnd(2, 3), alpha: 0.4, color: STONE_DUST, drag: 1.6, wind: 1 });
      }
      return;
    }
    if (weapon === 'rocket') {
      F.spawn(pos.x, pos.y, pos.z, { size: 0.7, grow: 1, life: 0.12, color: FLASH, bright: 3 });
      // backblast
      for (let i = 0; i < 7; i++) {
        const f = rnd(3, 9);
        S.spawn(pos.x - dir.x * 1.2, pos.y - dir.y * 1.2, pos.z - dir.z * 1.2, {
          vx: -dir.x * f + rnd(-1, 1), vy: rnd(0, 1.2), vz: -dir.z * f + rnd(-1, 1),
          size: rnd(0.5, 0.8), grow: 3, life: rnd(2, 3.5), alpha: 0.5, color: STONE_DUST, drag: 1.8, wind: 1,
        });
      }
      this.flashLight(pos, 80, 18, 0.1);
      return;
    }
    // small arms: a quick star of flame along the bore, a wisp of smoke
    F.spawn(pos.x, pos.y, pos.z, { size: 0.28 * size, grow: 0.3, life: 0.045, color: FLASH, bright: 3, spin: 0 });
    F.spawn(pos.x + dir.x * 0.25, pos.y + dir.y * 0.25, pos.z + dir.z * 0.25, { size: 0.2 * size, grow: 0.2, life: 0.04, color: FIRE, bright: 3 });
    if (Math.random() < 0.5) {
      S.spawn(pos.x + dir.x * 0.3, pos.y, pos.z + dir.z * 0.3, {
        vx: dir.x * 1.2, vy: 0.3, vz: dir.z * 1.2, size: 0.15, grow: 3, life: 1.2, alpha: 0.18, color: STONE_DUST, drag: 2, wind: 0.6,
      });
    }
  }

  /**
   * High-explosive burst. `size` ~1 is a tank round or rocket, ~2 a 155 mm shell. Ground
   * bursts throw a column of dark earth and clods; air bursts / vehicle hits skip the dirt.
   */
  explosion(pos, size = 1, { ground = true, fire = 1, soot = !ground } = {}) {
    const F = this.fire;
    const S = this.smoke;
    const k = Math.sqrt(size);
    // flash and fireball
    F.spawn(pos.x, pos.y + 0.8 * size, pos.z, { size: 4.5 * size, grow: 0.4, life: 0.08, color: FLASH, bright: 2.5 });
    for (let i = 0; i < 8 * fire; i++) {
      F.spawn(pos.x + rnd(-0.8, 0.8) * size, pos.y + rnd(0.4, 1.6) * size, pos.z + rnd(-0.8, 0.8) * size, {
        vx: rnd(-3, 3) * size, vy: rnd(2, 6) * size, vz: rnd(-3, 3) * size, size: rnd(1.5, 2.6) * size, grow: 1,
        life: rnd(0.25, 0.55), color: FIRE, bright: 2, drag: 4,
      });
    }
    this.flashLight(pos, 350 * size * size, 35 * size, 0.25);
    if (ground) {
      // the dirt column: fast dark plumes fanning upward, then falling back
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * 6.283;
        const out = rnd(0.5, 3.5) * size;
        S.spawn(pos.x + Math.cos(a) * 0.5, pos.y + 0.6 * size, pos.z + Math.sin(a) * 0.5, {
          vx: Math.cos(a) * out, vy: rnd(8, 18) * k, vz: Math.sin(a) * out, size: rnd(1.4, 2.4) * size, grow: 2,
          life: rnd(1.8, 3), alpha: 0.95, color: i % 2 ? DIRT : DIRT_DARK, gravity: 7, drag: 1, wind: 0.3,
        });
      }
      // clods and stones
      for (let i = 0; i < 24 * size; i++) {
        const a = Math.random() * 6.283;
        const out = rnd(2, 10) * size;
        S.spawn(pos.x, pos.y + 0.4, pos.z, {
          vx: Math.cos(a) * out, vy: rnd(6, 16) * k, vz: Math.sin(a) * out, size: rnd(0.12, 0.3) * k, grow: 0,
          life: rnd(1.4, 2.4), alpha: 1, color: DIRT_DARK, gravity: 14, drag: 0.2, spin: rnd(-6, 6),
        });
      }
      // the shock ring of dust rolling out along the ground
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * 6.283 + rnd(-0.2, 0.2);
        S.spawn(pos.x + Math.cos(a) * size, pos.y + 0.6 * size, pos.z + Math.sin(a) * size, {
          vx: Math.cos(a) * 9 * size, vy: 0.4, vz: Math.sin(a) * 9 * size, size: 1.8 * size, grow: 2.5,
          life: rnd(2.5, 3.5), alpha: 0.45, color: DUST, drag: 1.8, wind: 1,
        });
      }
    }
    // the smoke left hanging over it, drifting off downwind
    for (let i = 0; i < 10; i++) {
      S.spawn(pos.x + rnd(-1.5, 1.5) * size, pos.y + rnd(1, 3) * size, pos.z + rnd(-1.5, 1.5) * size, {
        vx: rnd(-0.6, 0.6), vy: rnd(1.5, 3), vz: rnd(-0.6, 0.6), size: rnd(2.5, 4) * size, grow: 2.5,
        life: rnd(8, 14), alpha: 0.55, color: soot ? SMOKE_BLACK : SMOKE_GREY, drag: 0.7, wind: 1, // black: a vehicle hit
      });
    }
  }

  /** One step of a rocket's exhaust: a hot core and a puff of white-grey smoke. */
  trail(pos, dir) {
    this.fire.spawn(pos.x - dir.x * 0.4, pos.y - dir.y * 0.4, pos.z - dir.z * 0.4, { size: 0.35, grow: 0, life: 0.05, color: FIRE, bright: 4 });
    this.smoke.spawn(pos.x - dir.x * 0.6, pos.y, pos.z - dir.z * 0.6, {
      vx: rnd(-0.3, 0.3), vy: rnd(0, 0.4), vz: rnd(-0.3, 0.3), size: 0.3, grow: 3, life: rnd(1.5, 2.5), alpha: 0.45, color: 0xb8b4ac, drag: 1, wind: 0.8,
    });
  }

  /** Keep a wreck burning: flames at the hull, a black column drifting downwind. */
  burn(pos, duration = 40, size = 1) {
    this.emitters.push({ kind: 'burn', pos: new THREE.Vector3(pos.x, pos.y, pos.z), t: 0, duration, size, acc: 0 });
  }

  /** A smoke screen: dense white billows filling `radius` for `duration` seconds (systems/Smoke.js). */
  screen(pos, radius, duration) {
    const e = { kind: 'screen', pos: new THREE.Vector3(pos.x, pos.y, pos.z), t: 0, duration, size: radius, acc: 0 };
    this.emitters.push(e);
    for (let i = 0; i < 10; i++) {  // the initial burst
      const a = Math.random() * 6.283;
      this.smoke.spawn(pos.x, pos.y + 1, pos.z, {
        vx: Math.cos(a) * radius * 0.9, vy: rnd(0.5, 2), vz: Math.sin(a) * radius * 0.9, size: rnd(2.5, 4), grow: 2.5,
        life: rnd(10, 16), alpha: 0.85, color: 0xd8d6d0, drag: 1.2, wind: 0.3,
      });
    }
    return e; // the smoke system moves it with its drifting cloud
  }

  /** Keep a smoke screen full: billows spread over its radius, thinning near the end. */
  updateScreen(e, dt) {
    const left = e.duration - e.t;
    const k = Math.min(1, left / 14);
    e.acc += dt * 12 * k;
    while (e.acc >= 1) {
      e.acc -= 1;
      const a = Math.random() * 6.283;
      const r = Math.sqrt(Math.random()) * e.size * 0.8;
      this.smoke.spawn(e.pos.x + Math.cos(a) * r, e.pos.y + rnd(0.5, 4.5), e.pos.z + Math.sin(a) * r, {
        vx: rnd(-0.4, 0.4), vy: rnd(0.4, 1.3), vz: rnd(-0.4, 0.4), size: rnd(3.5, 5.5), grow: 1.6,
        life: rnd(9, 13), alpha: 0.75 * k + 0.1, color: 0xd6d4cd, drag: 0.6, wind: 0.35,
      });
    }
  }

  update(dt) {
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i];
      e.t += dt;
      if (e.t > e.duration) { this.emitters.splice(i, 1); continue; }
      if (e.kind === 'screen') { this.updateScreen(e, dt); continue; }
      const k = 1 - e.t / e.duration;  // dies down over time
      e.acc += dt * (4 + 8 * k);
      while (e.acc >= 1) {
        e.acc -= 1;
        const s = e.size;
        this.smoke.spawn(e.pos.x + rnd(-0.8, 0.8) * s, e.pos.y + 0.5, e.pos.z + rnd(-0.8, 0.8) * s, {
          vx: rnd(-0.3, 0.3), vy: rnd(2, 3.5) * s, vz: rnd(-0.3, 0.3), size: rnd(0.8, 1.3) * s, grow: 4,
          life: rnd(6, 10), alpha: 0.35 + 0.35 * k, color: SMOKE_BLACK, drag: 0.4, wind: 2.2,
        });
        if (Math.random() < k) {
          this.fire.spawn(e.pos.x + rnd(-0.7, 0.7) * s, e.pos.y + rnd(0, 0.5), e.pos.z + rnd(-0.7, 0.7) * s, {
            vy: rnd(1, 2.5), size: rnd(0.5, 0.9) * s, grow: 0.3, life: rnd(0.4, 0.8), color: FIRE, bright: 2.2, drag: 1,
          });
        }
      }
    }
    this.smoke.update(dt);
    this.fire.update(dt);
    for (const l of this.lights) {
      const d = l.userData;
      d.t += dt;
      l.intensity = d.t < d.life ? d.peak * (1 - d.t / d.life) ** 2 : 0;
    }
  }
}
