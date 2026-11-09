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
    // the curtain: lit (so it's dark at night), thickest low down where the rain is, fading out up into the cloud
    const c = document.createElement('canvas');
    c.width = 4; c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0.95)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 128);
    const tex = new THREE.CanvasTexture(c);
    this.mat = new THREE.MeshStandardMaterial({ color: 0x6a747c, map: tex, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, roughness: 1, metalness: 0 });
    this.mat.userData.matte = true;
    this.geo = new THREE.CylinderGeometry(1, 1, HEIGHT, 28, 1, true).translate(0, HEIGHT / 2, 0);
    this.half = Math.max(game.world.bounds.x, game.world.bounds.z);
    SEA_STATE.value = SEA_BY_WEATHER[game.conditions?.weather] ?? 1;
    const n = PER_WEATHER[game.conditions?.weather] ?? 0;
    for (let i = 0; i < n; i++) this.spawn((Math.random() * 2 - 1) * this.half, (Math.random() * 2 - 1) * this.half);
  }

  spawn(x, z) {
    const r = R[0] + Math.random() * (R[1] - R[0]);
    const mesh = new THREE.Mesh(this.geo, this.mat);
    mesh.scale.set(r, 1, r);
    mesh.position.set(x, this.game.world.river?.level ?? 0, z);
    mesh.userData.noAO = true;
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
