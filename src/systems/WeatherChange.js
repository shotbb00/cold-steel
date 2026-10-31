// The sky moving on during a battle (single player): the weather (battle rule `changingWeather`)
// and the time of day (rule `timePasses`), data/rules.js.
//   weather  every few minutes a neighbouring weather — clear ↔ overcast ↔ rain, overcast ↔ fog
//   time     day → dusk → night → dawn → day, each lasting a few minutes of battle (a dusk
//            start reaches night after about five)
// Either is announced on the radio a minute ahead, then blended in: fog density and colour, sun
// (or moon) direction, colour and strength, sky light, the sky's colours and cloud cover, the
// exposure, the stars, the rain fading in or out with its hiss — and what matters for the fight:
// how far everyone sees (Conditions.sightFor, night sights at night), the mud in the rain, and
// at nightfall flares and the night rules. One change at a time; the other waits its turn.
import * as THREE from 'three';
import { applyConditions, WEATHER, TIMES } from '../core/Conditions.js';
import { Rain } from '../render/Weather.js';

const NEXT = {
  clear: ['overcast'],
  overcast: ['clear', 'rain', 'rain', 'fog'],
  rain: ['overcast', 'overcast', 'fog'],
  fog: ['overcast', 'clear'],
};
const NEXT_TIME = { day: 'dusk', dusk: 'night', night: 'dawn', dawn: 'day' };
const SPELL = [240, 420];      // seconds a weather lasts before the next change
const TIME_SPELL = { day: 900, dusk: 300, night: 900, dawn: 300 }; // seconds of battle each part of the day lasts
const WARNING = 60;            // seconds of radio warning before it starts to change
const TRANSITION = 75;         // seconds a weather change takes
const TIME_TRANSITION = 100;   // seconds the light takes to go (or come)
const COLOURS = ['fogColor', 'sunColor', 'hemiSky', 'hemiGround', 'skyTop', 'skyHorizon', 'skyBottom', 'cloudLight', 'cloudDark', 'rimColor'];
const NUMBERS = ['fogDensity', 'sunIntensity', 'hemiIntensity', 'clouds', 'sunDisk', 'exposure', 'rimIntensity'];
// what a theme without the value means — the same fallbacks the renderers use (GameEngine,
// sky.js); blending from 0 instead turned the screen black as daylight began to change
const UNSET = { exposure: 1.1, sunDisk: 1 };
const SAY = {
  clear: 'The cloud is breaking up — clear skies within the minute. Long sight lines.',
  overcast: 'Cloud thickening over the sector.',
  rain: 'Rain moving in from the west. Visibility will drop, the fields will turn to mud.',
  fog: 'Fog rolling up the valleys. Expect to see very little.',
};
const SAY_TIME = {
  dusk: 'The light is going — dusk within the minute. Sight lines are shortening.',
  night: 'Last light. Night is falling: flares and night sights from here on.',
  dawn: 'First light in the east. Dawn within the minute.',
  day: 'Full daylight coming up.',
};
const rand = ([a, b]) => a + Math.random() * (b - a);
const _a = new THREE.Color();
const _b = new THREE.Color();
const _d = new THREE.Vector3();
const _e = new THREE.Vector3();

export class WeatherChange {
  /** `weather` / `time`: whether each may change (the battle rules). */
  constructor(game, { weather = true, time = false } = {}) {
    this.game = game;
    this.base = game.map.theme;
    this.allow = { weather, time };
    this.from = game.conditions;            // the Conditions blended from and to
    this.to = null;
    this.kind = null;                       // 'weather' | 'time': what is changing
    this.k = 0;                             // 0 = from, 1 = to
    this.next = weather ? rand(SPELL) : Infinity;
    this.timeNext = time ? TIME_SPELL[this.from.time] ?? 900 : Infinity;
    this.phase = 'steady';                  // steady · warning · changing
    const cond = game.conditions;
    // spotting reads the live blend
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
    this.timeNext -= dt;
    if (this.phase === 'steady') {
      // whichever is due first; the other waits for it to finish
      const kind = this.timeNext <= WARNING && this.timeNext <= this.next ? 'time' : this.next <= WARNING ? 'weather' : null;
      if (kind) this.warn(kind);
    } else if (this.phase === 'warning' && (this.kind === 'time' ? this.timeNext : this.next) <= 0) {
      this.phase = 'changing';
      if (this.to.rain && !g.rain) { g.rain = new Rain(g); g.rain.intensity = 0; }
    } else if (this.phase === 'changing') {
      this.k = Math.min(1, this.k + dt / (this.kind === 'time' ? TIME_TRANSITION : TRANSITION));
      this.apply(this.k);
      if (this.k >= 1) this.settle();
    }
  }

  /** A minute ahead: pick what comes and say so on the radio. */
  warn(kind) {
    const g = this.game;
    const now = this.from;
    let time = now.time;
    let weather = now.weather;
    if (kind === 'time') time = NEXT_TIME[time] ?? 'day';
    else {
      const options = NEXT[weather] ?? ['overcast'];
      weather = options[Math.floor(Math.random() * options.length)];
    }
    this.to = applyConditions(this.base, { time, weather });
    this.kind = kind;
    this.k = 0;
    this.phase = 'warning';
    // the other change waits until this one is through
    if (kind === 'time') this.next = Math.max(this.next, WARNING + TIME_TRANSITION + 30);
    else this.timeNext = Math.max(this.timeNext, WARNING + TRANSITION + 30);
    const line = kind === 'time' ? SAY_TIME[time] : SAY[weather] ?? `${WEATHER[weather].name} coming in.`;
    g.radio?.add(line, 'weather');
    g.bus.emit(kind === 'time' ? 'time:warning' : 'weather:warning', { to: kind === 'time' ? time : weather });
  }

  /** The scene at blend k between the two conditions. */
  apply(k) {
    const g = this.game;
    const a = this.from.theme;
    const b = this.to.theme;
    const t = {};
    for (const key of NUMBERS) {
      const from = a[key] ?? UNSET[key] ?? 0;
      t[key] = from + ((b[key] ?? UNSET[key] ?? 0) - from) * k;
    }
    for (const key of COLOURS) {
      if (a[key] == null || b[key] == null) { t[key] = b[key] ?? a[key]; continue; }
      t[key] = _a.set(a[key]).lerp(_b.set(b[key]), k).getHex();
    }
    _d.set(...(a.sunDir ?? [0, 1, 0])).normalize();
    _e.set(...(b.sunDir ?? [0, 1, 0])).normalize();
    _d.lerp(_e, k).normalize();
    t.sunDir = [_d.x, _d.y, _d.z];
    const scene = g.scene;
    if (scene.fog) {
      scene.fog.density = t.fogDensity;
      scene.fog.color.set(t.fogColor);
    }
    if (scene.background?.isColor) scene.background.set(t.fogColor);
    const env = g.environment;
    env.sun.intensity = t.sunIntensity;
    env.sun.color.set(t.sunColor);
    if (this.kind === 'time') env.setSunDir?.(t.sunDir);
    if (env.hemi) {
      env.hemi.intensity = t.hemiIntensity;
      env.hemi.color.set(t.hemiSky);
      env.hemi.groundColor.set(t.hemiGround);
    }
    if (env.rim && t.rimColor != null) {
      env.rim.color.set(t.rimColor);
      env.rim.intensity = t.rimIntensity;
    }
    if (env.stars) env.stars.visible = (this.from.night ? 1 - k : 0) + (this.to.night ? k : 0) > 0.5;
    if (t.exposure) {
      if (g.renderer) g.renderer.toneMappingExposure = t.exposure;
      g.babylon?.setExposure?.(t.exposure);
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
    // night rules switch half-way through the dusk (or the dawn)
    this.setNight(k < 0.5 ? this.from.night : this.to.night);
  }

  /** Night or not, for everything that asks: flares, the night colours of the HUD, fog of war. */
  setNight(night) {
    const g = this.game;
    if (g.conditions.night === night) return;
    g.conditions.night = night;
    if (g.flares) g.flares.enabled = night;
    document.body.classList.toggle('night', night);
  }

  /** The new conditions are in: they become the ones to change from next time. */
  settle() {
    const g = this.game;
    const cond = g.conditions;
    const to = this.to;
    const kind = this.kind;
    this.from = to;
    this.sightFrom = to.sightFor.bind(to);
    this.to = null;
    this.kind = null;
    this.k = 0;
    cond.weather = to.weather;
    cond.time = to.time;
    cond.rain = to.rain;
    cond.mud = to.mud;
    this.setNight(to.night);
    g.babylon?.setSky(to.theme, true);
    if (g.rain && !to.rain) g.rain.intensity = 0;
    this.phase = 'steady';
    if (kind === 'time') {
      this.timeNext = TIME_SPELL[to.time] ?? 900;
      // the battle clock jumps on to the new part of the day (always forward; past midnight wraps)
      const radio = g.radio;
      const target = TIMES[to.time]?.clock;
      if (radio && target != null) radio.clock += (((target - (radio.clock + g.time / 60)) % 1440) + 1440) % 1440;
    }
    else this.next = this.allow.weather ? rand(SPELL) : Infinity;
    g.bus.emit(kind === 'time' ? 'time:changed' : 'weather:changed', { weather: to.weather, time: to.time, name: TIMES[to.time]?.name });
  }
}
