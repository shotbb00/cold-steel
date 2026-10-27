// Illumination flares for night battles: a mortar fires one (L, or the AI when its troops are
// under fire in the dark); it bursts high over the target with a flash and a puff of smoke, then
// drifts down under its parachute for half a minute, swinging and drifting with the wind, lighting
// the ground for ~110 m around. Anyone standing in that light is seen as by day
// (Conditions.sightFor, VisibilitySystem, FogOfWar).
// What you see: the white canopy and its shroud lines over the burning candle, a hot white core
// with a wide halo in the night air, a long trail of white smoke left hanging above it as it
// sinks, sparks dripping off the candle; the magnesium flickers, and in its last seconds it
// gutters out orange.
// Two real lights are made once and handed to the two newest flares (adding lights at run time
// would recompile every shader); older flares still glow, they just don't light the ground.
import * as THREE from 'three';

const LIFE = 32;            // seconds
const FALL = 2.6;           // m/s under the parachute at most…
const BURN_OUT = 18;        // …slower when it bursts low: it burns out this high above the ground, never on it
const CLEAR = 12;           // and drifting over a rise it stays at least this high
const RADIUS = 110;         // metres of usable light on the ground
const WHITE = new THREE.Color(0xfff1d6);
const EMBER = new THREE.Color(0xff9a48);

function glow(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [t, col] of stops) grad.addColorStop(t, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** Parachute, shroud lines and candle, made once; each flare gets its own group of meshes. */
function parachuteGeometry() {
  const canopy = new THREE.SphereGeometry(1.6, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.42);
  canopy.scale(1, 0.7, 1).translate(0, 2.6, 0);
  const lines = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const top = new THREE.Vector3(Math.cos(a) * 1.55, 2.6 + 0.25, Math.sin(a) * 1.55);
    const bottom = new THREE.Vector3(0, 0.35, 0);
    const len = top.distanceTo(bottom);
    const g = new THREE.CylinderGeometry(0.012, 0.012, len, 3);
    g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bottom).normalize()));
    g.translate(0, 0.35, 0);
    lines.push(g);
  }
  const candle = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8).translate(0, 0.1, 0);
  return { canopy, lines, candle };
}

export class Flares {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.enabled = !!game.conditions?.night;
    if (!this.enabled) return;
    this.lights = [0, 1].map(() => {
      const l = new THREE.PointLight(0xfff1d6, 0, 260, 1.4);
      game.scene.add(l);
      return l;
    });
    this.geo = parachuteGeometry();
    this.canopyMat = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.9, side: THREE.DoubleSide });
    this.lineMat = new THREE.MeshStandardMaterial({ color: 0x8a867a, roughness: 1 });
    this.candleMat = new THREE.MeshStandardMaterial({ color: 0x5a5a55, emissive: 0xffe8c0, emissiveIntensity: 2, roughness: 0.6 });
    this.coreTex = glow([[0, 'rgba(255,255,250,1)'], [0.25, 'rgba(255,245,215,0.85)'], [0.6, 'rgba(255,225,170,0.25)'], [1, 'rgba(255,215,150,0)']]);
    this.haloTex = glow([[0, 'rgba(255,240,210,0.5)'], [0.4, 'rgba(255,225,180,0.14)'], [1, 'rgba(255,210,150,0)']]);
  }

  /** A flare bursting at (x, y, z). */
  add(x, y, z) {
    if (!this.enabled) return;
    const g = this.game;
    const rig = new THREE.Group();
    const swing = new THREE.Group();                   // pendulum: pivots at the canopy
    swing.position.y = 2.6;
    rig.add(swing);
    const hang = new THREE.Group();
    hang.position.y = -2.6;
    swing.add(hang);
    hang.add(new THREE.Mesh(this.geo.canopy, this.canopyMat));
    for (const l of this.geo.lines) hang.add(new THREE.Mesh(l, this.lineMat));
    hang.add(new THREE.Mesh(this.geo.candle, this.candleMat));
    const sprite = (tex, s, opacity) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false, opacity }));
      sp.scale.setScalar(s);
      hang.add(sp);
      return sp;
    };
    const halo = sprite(this.haloTex, 70, 0.22);
    const core = sprite(this.coreTex, 5, 1);
    g.scene.add(rig);
    // sink so it burns out before it reaches the ground
    const fall = Math.min(FALL, Math.max(0.5, (y - g.terrain.heightAt(x, z) - BURN_OUT) / LIFE));
    const f = { x, y, z, t: 0, fall, rig, swing, core, halo, phase: Math.random() * 6, smokeAt: 0, sparkAt: 0, intensity: 0, color: WHITE.clone() };
    this.list.push(f);
    // the burst: a flash and a puff where the shell opened
    g.effects?.flashLight?.(new THREE.Vector3(x, y, z), 40, 120, 0.25);
    for (let k = 0; k < 6; k++) {
      g.effects?.smoke.spawn(x, y + 1, z, { vx: (Math.random() - 0.5) * 3, vy: Math.random() * 1.5, vz: (Math.random() - 0.5) * 3, size: 1.2, grow: 3, life: 6, alpha: 0.4, color: 0xa8a49c, drag: 1.5, wind: 1 });
    }
    g.audio.play('flare.pop', { x, y, z }, { volume: 0.9 });
    g.netEvent('flare', Math.round(x), Math.round(y), Math.round(z));
  }

  /** Is (x, z) under a burning flare's light? */
  lit(x, z) {
    for (const f of this.list) if ((x - f.x) ** 2 + (z - f.z) ** 2 < RADIUS * RADIUS && f.t < LIFE - 3) return true;
    return false;
  }

  update(dt) {
    if (!this.enabled) return;
    const g = this.game;
    const terrain = g.terrain;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.t += dt;
      const ground = terrain.heightAt(f.x, f.z);
      f.y = Math.max(ground + CLEAR, f.y - f.fall * dt);
      f.x += (Math.sin(f.t * 0.3 + f.phase) * 1.2 + 0.6) * dt;    // drifting with the wind
      f.z += Math.sin(f.t * 0.21 + f.phase * 2) * 0.5 * dt;
      f.rig.position.set(f.x, f.y, f.z);
      f.swing.rotation.set(Math.sin(f.t * 1.1 + f.phase) * 0.14, f.t * 0.4, Math.sin(f.t * 1.7 + f.phase) * 0.2);
      // burning: up in a second, a steady magnesium flicker, guttering out orange at the end
      const end = Math.max(0, Math.min(1, (LIFE - f.t) / 4));
      const k = f.t < 1 ? f.t : end;
      const flicker = 0.88 + Math.sin(f.t * 23 + f.phase) * 0.06 + Math.sin(f.t * 37.3) * 0.04 + Math.sin(f.t * 7.1) * 0.03;
      f.intensity = k * flicker;
      f.color.copy(WHITE).lerp(EMBER, 1 - end);
      f.core.material.color.copy(f.color);
      f.halo.material.color.copy(f.color);
      f.core.scale.setScalar(2.5 + 3 * f.intensity);
      f.halo.scale.setScalar(22 + 26 * f.intensity);
      f.halo.material.opacity = 0.16 * f.intensity;
      // the trail of white smoke it leaves hanging as it sinks, and sparks dripping off the candle
      const cx = f.x, cy = f.y + 0.1, cz = f.z;
      if (g.effects && f.intensity > 0.05) {
        f.smokeAt -= dt;
        if (f.smokeAt <= 0) {
          f.smokeAt = 0.14;
          g.effects.smoke.spawn(cx, cy, cz, { vx: (Math.random() - 0.5) * 0.3, vy: 0.5, vz: (Math.random() - 0.5) * 0.3, size: 0.9, grow: 4, life: 9 + Math.random() * 3, alpha: 0.3, color: 0xd8d4cc, drag: 0.6, wind: 1 });
        }
        f.sparkAt -= dt;
        if (f.sparkAt <= 0) {
          f.sparkAt = 0.08 + Math.random() * 0.15;
          g.effects.fire.spawn(cx, cy - 0.2, cz, { vx: (Math.random() - 0.5) * 1.5, vy: -1 - Math.random() * 2, vz: (Math.random() - 0.5) * 1.5, size: 0.12, grow: 0, life: 0.5 + Math.random() * 0.6, color: 0xffd890, bright: 3, gravity: 9.8, drag: 0.2 });
        }
      }
      if (f.t >= LIFE) {
        f.rig.removeFromParent();
        f.core.material.dispose();
        f.halo.material.dispose();
        this.list.splice(i, 1);
      }
    }
    // the two real lights go to the two newest flares
    const newest = this.list.slice(-2);
    this.lights.forEach((l, i) => {
      const f = newest[i];
      l.intensity = f ? f.intensity * 2600 : 0;
      if (f) {
        l.position.set(f.x, f.y, f.z);
        l.color.copy(f.color);
      }
    });
  }
}

export const FLARE_RADIUS = RADIUS;
