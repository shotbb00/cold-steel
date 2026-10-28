// Weather that changes during a battle (battle rule `changingWeather`, data/rules.js; single
// player only). Every few minutes the sky moves on to a neighbouring weather — clear ↔ overcast
// ↔ rain, overcast ↔ fog — announced on the radio a minute ahead, then blended over TRANSITION
// seconds: fog density and colour, sun and sky light, the sky's colours and cloud cover (both
// renderers; the Babylon sky light is re-rendered as it goes), the rain fading in or out with its
// hiss, and what matters for the fight — how far everyone sees (Conditions.sightFor) and the mud
// that slows vehicles in the rain. The time of day stays as the battle started.
import * as THREE from 'three';
import { applyConditions, WEATHER } from '../core/Conditions.js';
import { Rain } from '../render/Weather.js';

const NEXT = {
  clear: ['overcast'],
  overcast: ['clear', 'rain', 'rain', 'fog'],
  rain: ['overcast', 'overcast', 'fog'],
  fog: ['overcast', 'clear'],
};
const SPELL = [240, 420];      // seconds a weather lasts before the next change
const WARNING = 60;            // seconds of radio warning before it starts to change
const TRANSITION = 75;         // seconds it takes to change
const COLOURS = ['fogColor', 'sunColor', 'hemiSky', 'hemiGround', 'skyTop', 'skyHorizon', 'skyBottom', 'cloudLight', 'cloudDark'];
const NUMBERS = ['fogDensity', 'sunIntensity', 'hemiIntensity', 'clouds', 'sunDisk'];
const SAY = {
  clear: 'The cloud is breaking up — clear skies within the minute. Long sight lines.',
  overcast: 'Cloud thickening over the sector.',
  rain: 'Rain moving in from the west. Visibility will drop, the fields will turn to mud.',
  fog: 'Fog rolling up the valleys. Expect to see very little.',
};
const rand = ([a, b]) => a + Math.random() * (b - a);
const _a = new THREE.Color();
const _b = new THREE.Color();

export class WeatherChange {
  constructor(game) {
    this.game = game;
    this.base = game.map.theme;
    this.time = game.conditions.time;
    this.from = game.conditions;            // the Conditions blended from and to
    this.to = null;
    this.k = 0;                             // 0 = from, 1 = to
    this.next = rand(SPELL);
    this.phase = 'steady';                  // steady · warning · changing
    const cond = game.conditions;
    // spotting and mud read the live blend
    this.sightFrom = cond.sightFor.bind(cond);
    cond.sightFor = (stats, faction, lit) => {
      const a = this.sightFrom(stats, faction, lit);
      return this.to ? a + (this.to.sightFor(stats, faction, lit) - a) * this.k : a;
    };
  }

  update(dt) {
    const g = this.game;
    if (g.ended) return;
    this.next -= dt;
    if (this.phase === 'steady' && this.next <= WARNING) {
      const now = this.from.weather;
      const options = NEXT[now] ?? ['overcast'];
      const to = options[Math.floor(Math.random() * options.length)];
      this.to = applyConditions(this.base, { time: this.time, weather: to });
      this.k = 0;
      this.phase = 'warning';
      g.radio?.add(SAY[to] ?? `${WEATHER[to].name} coming in.`, 'weather');
      g.bus.emit('weather:warning', { to });
    } else if (this.phase === 'warning' && this.next <= 0) {
      this.phase = 'changing';
      if (this.to.rain && !g.rain) { g.rain = new Rain(g); g.rain.intensity = 0; }
    } else if (this.phase === 'changing') {
      this.k = Math.min(1, this.k + dt / TRANSITION);
      this.apply(this.k);
      if (this.k >= 1) this.settle();
    }
  }

  /** The scene at blend k between the two weathers. */
  apply(k) {
    const g = this.game;
    const a = this.from.theme;
    const b = this.to.theme;
    const t = {};
    for (const key of NUMBERS) t[key] = (a[key] ?? 0) + ((b[key] ?? 0) - (a[key] ?? 0)) * k;
    for (const key of COLOURS) {
      if (a[key] == null || b[key] == null) { t[key] = b[key] ?? a[key]; continue; }
      t[key] = _a.set(a[key]).lerp(_b.set(b[key]), k).getHex();
    }
    const scene = g.scene;
    if (scene.fog) {
      scene.fog.density = t.fogDensity;
      scene.fog.color.set(t.fogColor);
    }
    if (scene.background?.isColor) scene.background.set(t.fogColor);
    const env = g.environment;
    env.sun.intensity = t.sunIntensity;
    env.sun.color.set(t.sunColor);
    if (env.hemi) {
      env.hemi.intensity = t.hemiIntensity;
      env.hemi.color.set(t.hemiSky);
      env.hemi.groundColor.set(t.hemiGround);
    }
    const u = env.sky?.uniforms;
    if (u) {
      for (const key of ['top', 'horizon', 'bottom']) u[key].value.set(t[`sky${key[0].toUpperCase()}${key.slice(1)}`]);
      u.sunColor.value.set(t.sunColor);
      u.cloudLight.value.set(t.cloudLight);
      u.cloudDark.value.set(t.cloudDark);
      u.clouds.value = t.clouds;
      u.sunDisk.value = t.sunDisk;
    }
    // the Babylon sky, and its light on the scene every couple of seconds
    this.relightT = (this.relightT ?? 0) - 1;
    const relight = this.relightT <= 0;
    if (relight) this.relightT = 120;
    g.babylon?.setSky(t, relight);
    // rain fading in or out
    if (g.rain) g.rain.intensity = (this.from.rain ? 1 : 0) + ((this.to.rain ? 1 : 0) - (this.from.rain ? 1 : 0)) * k;
    // mud: the fields soften as the rain goes on, dry off after it
    const cond = g.conditions;
    cond.mud = this.to.mud && k > 0.4 ? this.to.mud : this.from.mud && k < 0.6 ? this.from.mud : null;
  }

  /** The new weather is in: it becomes the one to change from next time. */
  settle() {
    const g = this.game;
    const cond = g.conditions;
    const to = this.to;
    this.from = to;
    this.sightFrom = to.sightFor.bind(to);
    this.to = null;
    this.k = 0;
    cond.weather = to.weather;
    cond.rain = to.rain;
    cond.mud = to.mud;
    g.babylon?.setSky(to.theme, true);
    if (g.rain && !to.rain) g.rain.intensity = 0;
    this.phase = 'steady';
    this.next = rand(SPELL);
    g.bus.emit('weather:changed', { weather: to.weather });
  }
}
