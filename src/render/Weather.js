// Falling rain around the camera: a few thousand thin streaks in a box that travels with the
// view, wind-slanted, recycled as they reach the ground; plus the hiss of it. Only made when
// the battle's conditions have rain.
import * as THREE from 'three';
import { wind } from '../world/Wind.js';

const DROPS = 3500;
const BOX = 70;           // metres around the camera
const HEIGHT = 40;
const SPEED = 18;         // m/s

export class Rain {
  constructor(game) {
    this.game = game;
    this.pos = new Float32Array(DROPS * 6);
    this.drops = new Float32Array(DROPS * 3);
    for (let i = 0; i < DROPS; i++) {
      this.drops[i * 3] = (Math.random() - 0.5) * BOX * 2;
      this.drops[i * 3 + 1] = Math.random() * HEIGHT;
      this.drops[i * 3 + 2] = (Math.random() - 0.5) * BOX * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xaab4bc, transparent: true, opacity: 0.32, depthWrite: false, fog: true }));
    this.lines.frustumCulled = false;
    this.lines.userData.noAO = true;
    game.scene.add(this.lines);
    this.loop = null;
    this.intensity = 1;   // 0…1: the rain fading in or out (systems/WeatherChange.js)
  }

  update(dt) {
    const cam = this.game.camera.position;
    const d = this.drops;
    const p = this.pos;
    const ground = this.game.terrain.heightAt(cam.x, cam.z);
    const fall = SPEED * dt;
    for (let i = 0; i < DROPS; i++) {
      const o = i * 3;
      d[o] += wind.x * dt;
      d[o + 1] -= fall;
      d[o + 2] += wind.z * dt;
      if (d[o + 1] < ground - cam.y - 5 || d[o + 1] < -HEIGHT) d[o + 1] += HEIGHT;
      // keep the box centred on the camera (wrap horizontally)
      if (d[o] > BOX) d[o] -= BOX * 2; else if (d[o] < -BOX) d[o] += BOX * 2;
      if (d[o + 2] > BOX) d[o + 2] -= BOX * 2; else if (d[o + 2] < -BOX) d[o + 2] += BOX * 2;
      const x = cam.x + d[o];
      const y = cam.y + d[o + 1] - HEIGHT * 0.3;
      const z = cam.z + d[o + 2];
      const q = i * 6;
      p[q] = x;
      p[q + 1] = y;
      p[q + 2] = z;
      p[q + 3] = x - wind.x * 0.04;
      p[q + 4] = y + SPEED * 0.045;
      p[q + 5] = z - wind.z * 0.04;
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
    // the hiss follows the listener
    this.loop ??= this.game.audio.loop('rain', cam, 0.3);
    this.loop.setPos(cam);
    this.loop.setGain?.(0.3 * this.intensity);
    this.lines.material.opacity = 0.32 * this.intensity;
    this.lines.visible = this.intensity > 0.02;
  }
}
