// Rain squalls at sea (the open-sea maps, overcast or rain): grey curtains of rain a few hundred metres
// across that drift over the map with the wind. Inside one a lookout sees a third as far — a ship can
// hide in it, or be ambushed out of it (VisibilitySystem.isSeen: `inside`). How many there are follows
// the weather (it can change mid-battle: systems/WeatherChange.js); new ones drift in from the upwind
// edge, old ones blow out at the other.
import * as THREE from 'three';
import { SEA_STATE } from '../world/Sea.js';

const PER_WEATHER = { clear: 1, overcast: 3, rain: 5, fog: 0 };
const WIND = { x: 3.2, z: 1.4 };       // m/s, the way they drift
const R = [320, 620];                  // their radius, m
const HEIGHT = 340;
// the sea state by the weather (GameEngine.seaState: the waves, the ships' roll, the guns' spread)
const SEA_BY_WEATHER = { clear: 1, overcast: 1.35, rain: 1.8, fog: 0.85 };

export class Squalls {
  constructor(game) {
    this.game = game;
    this.list = [];
    // the rain: a few big soft billboards a squall (no hard silhouette from any side) — from the side a grey
    // curtain heaviest low down, from above a dark smudge on the water; lit, so it's dark at night
    const c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    const g = c.getContext('2d');
    const img = g.createImageData(64, 128);
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 64; x++) {
        const u = (x + 0.5) / 32 - 1, v = (y + 0.5) / 64 - 1;                  // -1…1 across, top…bottom
        const edge = Math.max(0, 1 - (u * u + (v * 0.8) ** 2));                // a soft ellipse
        const low = 0.35 + 0.65 * ((y + 0.5) / 128);                            // heavier where the rain falls
        const streak = 0.85 + 0.15 * Math.sin(x * 1.9 + Math.sin(y * 0.11) * 2); // a hint of falling streaks
        const i = (y * 64 + x) * 4;
        img.data[i + 3] = Math.round(255 * edge * edge * low * streak);
      }
    }
    // the colour baked in (a day grey, a night near-black: the renderer may not tint billboards)
    const make = (r, gr, bl) => {
      for (let i = 0; i < img.data.length; i += 4) { img.data[i] = r; img.data[i + 1] = gr; img.data[i + 2] = bl; }
      g.putImageData(img, 0, 0);
      const cc = document.createElement('canvas');
      cc.width = 64; cc.height = 128;
      cc.getContext('2d').drawImage(c, 0, 0);
      return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cc), color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }); // (black: the Babylon renderer adds the texture to the colour — render/babylon/extras.js sprite)
    };
    this.mats = { day: make(112, 122, 130), night: make(24, 30, 36) };
    this.mat = this.mats[game.conditions?.night ? 'night' : 'day'];
    this.half = Math.max(game.world.bounds.x, game.world.bounds.z);
    SEA_STATE.value = SEA_BY_WEATHER[game.conditions?.weather] ?? 1;
    const n = PER_WEATHER[game.conditions?.weather] ?? 0;
    for (let i = 0; i < n; i++) this.spawn((Math.random() * 2 - 1) * this.half, (Math.random() * 2 - 1) * this.half);
  }

  spawn(x, z) {
    const r = R[0] + Math.random() * (R[1] - R[0]);
    const mesh = new THREE.Group(); // (a squall: several billboards spread over it)
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(this.mat);
      const a = Math.random() * Math.PI * 2, k = Math.sqrt(Math.random()) * r * 0.55;
      const h = HEIGHT * (0.75 + Math.random() * 0.4);
      sp.scale.set(r * (1.1 + Math.random() * 0.5), h, 1);
      sp.position.set(Math.cos(a) * k, h * 0.42, Math.sin(a) * k);
      mesh.add(sp);
    }
    mesh.position.set(x, this.game.world.river?.level ?? 0, z);
    this.game.scene.add(mesh);
    this.list.push({ x, z, r, mesh });
  }

  /** How much of a squall (x, z) is in: 0 out of it, 1 deep inside. */
  inside(x, z) {
    let k = 0;
    for (const s of this.list) {
      const d = Math.hypot(x - s.x, z - s.z);
      if (d < s.r) k = Math.max(k, Math.min(1, (s.r - d) / (s.r * 0.35)));
    }
    return k;
  }

  update(dt) {
    const target = SEA_BY_WEATHER[this.game.conditions?.weather] ?? 1;
    SEA_STATE.value += (target - SEA_STATE.value) * Math.min(1, dt * 0.05); // (the sea gets up, or goes down, over a minute or two)
    const want = PER_WEATHER[this.game.conditions?.weather] ?? 0;
    const night = !!this.game.conditions?.night; // (billboards aren't lit: dark grey at night)
    if (this.night !== night) { // (dusk to night: the curtains go dark)
      this.night = night;
      this.mat = this.mats[night ? 'night' : 'day'];
      for (const sq of this.list) for (const sp of sq.mesh.children) sp.material = this.mat;
    }
    const edge = this.half + R[1];
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i];
      s.x += WIND.x * dt;
      s.z += WIND.z * dt;
      s.mesh.position.x = s.x;
      s.mesh.position.z = s.z;
      if (s.x > edge || s.z > edge || this.list.length > want) { // (blown out of the map, or the weather cleared)
        if (s.x > edge || s.z > edge || Math.random() < dt * 0.02) { s.mesh.removeFromParent(); this.list.splice(i, 1); }
      }
    }
    if (this.list.length < want && Math.random() < dt * 0.05) this.spawn(-edge + Math.random() * 200, (Math.random() * 2 - 1) * this.half); // a new one from upwind
  }
}
