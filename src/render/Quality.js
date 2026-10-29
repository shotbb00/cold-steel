// Graphics quality: Very low / Low / Medium / High presets that trade looks for frame rate, switchable
// any time with G, from the settings panel of the main / pause menu (core/Settings.js).
// On first run the game starts on Medium and watches the frame rate for a while: while it
// stays low it steps down a level at a time, and says so.
//
// What a preset controls:
//   resolution  – render scale against the screen (high-DPI screens are the big cost)
//   msaa        – multisampling of the scene render
//   ao / aoScale – ambient occlusion on/off and its internal resolution
//   bloom       – glow on flashes and tracers
//   shadows     – shadow map size and filtering
//   detail      – share of grass, hedgerow and ground-clutter instances drawn, and whether the
//                 trees wear their alpha-tested leaf cards (foliage) — costly on weak GPUs
//   shadows     – false: no sun shadows at all (Very low)
//   post        – false: no post-processing pass (Very low: tone mapping happens in the materials)
//   lod         – metres from the camera beyond which soldiers use their light model (0: always)
// Dynamic resolution: unless the player fixed a render scale (settings 'renderScale', 0.5–1),
// the resolution is not a fixed number but follows the frame rate — every ADJUST_EVERY seconds it
// steps down when the game runs below its target and back up toward the preset's ceiling
// (maxRes, capped by the screen's pixel density) when there is room. Calm moments are drawn
// sharp, heavy fights a little softer, and the load is what the frame rate allows either way.
// Phones (a coarse pointer) spend their budget on pixels rather than on effects hard to see on a
// small screen: no ambient occlusion, cheaper shadows, thinner grass, and a higher ceiling.
// Edges are always smoothed (FXAA where there's no MSAA, even on Very low).
//   Babylon renderer (render/babylon/BabylonView.js applyQuality) also: shadow filtering, whether
//   the shadow map is redrawn every frame, and AO only on High
//   (sun shadows and SSAO are by far its biggest costs on laptop graphics)
import * as THREE from 'three';
import { settings } from '../core/Settings.js';
import { setLodDistance } from './StackRenderer.js';
import { keys } from '../core/Keys.js';

export const QUALITY = {
  verylow: {
    label: 'Very low', resolution: 0.5, maxRes: 0.75, msaa: 0, ao: false, aoScale: 0.5, bloom: false,
    shadowSize: 512, shadowType: THREE.PCFShadowMap, detail: { grass: 0.1, hedge: 0.3, clutter: 0.15, foliage: 0 },
    shadowFilter: 'low', shadowEvery: 2, babylonAO: false, shadows: false, lod: 0,
  },
  low: {
    label: 'Low', resolution: 0.75, maxRes: 1, msaa: 0, ao: false, aoScale: 0.5, bloom: false,
    shadowSize: 1024, shadowType: THREE.PCFShadowMap, detail: { grass: 0.35, hedge: 0.5, clutter: 0.4, foliage: 1 },
    shadowFilter: 'low', shadowEvery: 2, babylonAO: false, lod: 30,
  },
  medium: {
    label: 'Medium', resolution: 1, maxRes: 1.5, msaa: 2, ao: true, aoScale: 0.5, bloom: true,
    shadowSize: 2048, shadowType: THREE.PCFShadowMap, detail: { grass: 0.65, hedge: 0.8, clutter: 0.7, foliage: 1 },
    shadowFilter: 'medium', shadowEvery: 1, babylonAO: false, lod: 45,
  },
  high: {
    label: 'High', resolution: Math.min(devicePixelRatio, 1.5), maxRes: 2, msaa: 4, ao: true, aoScale: 0.75, bloom: true,
    shadowSize: 4096, shadowType: THREE.PCFSoftShadowMap, detail: { grass: 1, hedge: 1, clutter: 1, foliage: 1 },
    shadowFilter: 'high', shadowEvery: 1, babylonAO: true, lod: 75,
  },
};
const ORDER = ['verylow', 'low', 'medium', 'high'];
const PHONE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
/** A preset as this device runs it: phones trade effects for pixels. */
function preset(level) {
  const q = { ...QUALITY[level] };
  if (PHONE) {
    Object.assign(q, { ao: false, babylonAO: false, shadowFilter: 'low', shadowSize: Math.min(q.shadowSize, 1024), maxRes: q.maxRes + 0.5 });
    q.detail = { ...q.detail, grass: q.detail.grass * 0.6, clutter: q.detail.clutter * 0.7 };
  }
  q.maxRes = Math.min(q.maxRes, devicePixelRatio);
  return q;
}
const MIN_RES = 0.5;
const STEP = 0.1;           // resolution change per adjustment
const ADJUST_EVERY = 1.5;   // seconds of frame rate behind each adjustment
const TARGET = PHONE ? 45 : 55; // fps the dynamic resolution holds
const RECOVER = 20;         // seconds after a step down before it tries that resolution again
const WATCH_FROM = 4;   // seconds after start before the frame rate counts (shaders compiling)
const WATCH_FOR = 8;    // seconds of frame rate to average
const TOO_SLOW = 32;    // fps below which the auto check steps down
const BENCH_GOAL = 40;  // the benchmark (settings 'benchmark') looks for the best level that holds this

const load = () => settings.get('quality');
const save = (level) => settings.set('quality', level);

export class Quality {
  constructor(game) {
    this.game = game;
    const stored = load();
    this.level = QUALITY[stored] ? stored : 'medium';
    this.auto = !QUALITY[stored]; // only judge the machine when the player hasn't chosen
    this.goal = TOO_SLOW;
    this.watch = { t: 0, frames: 0, time: 0 };
    this.dyn = { t: 0, frames: 0, time: 0, cap: Infinity, capT: 0 };
    this.apply(this.level);
    if (settings.get('benchmark')) this.benchmark();   // asked for from the main menu: run it in this battle
    game.bus.on('key', ({ code }) => { if (keys.is(code, 'quality')) this.cycle(); });
    // chosen in a settings panel
    settings.on((key, value) => {
      if (key === 'quality' && QUALITY[value] && value !== this.level) {
        this.auto = false;
        this.level = value;
        this.apply(value);
      }
      if (key === 'renderScale') this.apply(this.level);
      if (key === 'benchmark' && value) this.benchmark();   // asked for from the pause menu: run it now
    });
  }

  /**
   * Find the best setting for this machine: start on High with the preset's own resolution and
   * step down a level each time the frame rate over a few seconds falls short of BENCH_GOAL fps.
   */
  benchmark() {
    settings.set('benchmark', false);
    settings.set('renderScale', null);
    this.auto = true;
    this.goal = BENCH_GOAL;
    this.benching = true;
    this.level = 'high';
    this.apply('high');
    this.watch = { t: 0, frames: 0, time: 0 };
    this.game.bus.emit('toast', 'Benchmark: testing graphics levels for a few seconds each…');
  }

  cycle() {
    const next = ORDER[(ORDER.indexOf(this.level) + 1) % ORDER.length];
    this.auto = false;
    this.set(next);
  }

  set(level, note = '') {
    this.level = level;
    save(level);
    this.apply(level);
    this.game.bus.emit('toast', `Graphics: ${QUALITY[level].label}${note} (G to change)`);
  }

  /** The fixed render scale the player chose, or null for dynamic resolution. */
  get fixedScale() {
    return settings.get('renderScale') ?? null;
  }

  apply(level) {
    const q = preset(level);
    this.q = q;
    this.res = Math.min(q.maxRes, this.fixedScale ?? q.resolution); // dynamic resolution climbs from here when there's room
    q.resolution = this.res;
    const { renderer, post, environment, scene } = this.game;
    this.setResolution(this.res);
    post.setSamples(q.msaa);
    post.ao.enabled = q.ao;
    post.ao.setScale(q.aoScale);
    post.bloom.enabled = q.bloom;

    const sun = environment.sun;
    if (sun.shadow.mapSize.x !== q.shadowSize) {
      sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
    const shadows = q.shadows !== false;
    if (renderer.shadowMap.enabled !== shadows) {
      renderer.shadowMap.enabled = shadows;
      scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    }
    if (renderer.shadowMap.type !== q.shadowType) {
      renderer.shadowMap.type = q.shadowType;
      scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    }
    this.game.babylon?.applyQuality(q); // the Babylon renderer's side of the preset
    setLodDistance(q.lod ?? 45, this.game.camera);
    scene.traverse((o) => {
      const kind = o.userData.detail;
      if (kind) o.count = Math.floor(o.userData.baseCount * (q.detail[kind] ?? 1));
    });
  }

  /** Draw at `r` render pixels per screen point (renderer, post-processing, Babylon). */
  setResolution(r) {
    const { renderer, post } = this.game;
    this.res = r;
    renderer.setPixelRatio(r);
    renderer.setSize(this.game.view.w, this.game.view.h);
    post.setPixelRatio(r);
    post.setSize(this.game.view.w, this.game.view.h);
    this.game.babylon?.setResolution?.(r);
  }

  /** Dynamic resolution: follow the frame rate between MIN_RES and the preset's ceiling. */
  adjust(dt) {
    const d = this.dyn;
    d.capT -= dt;
    if (d.capT <= 0) d.cap = Infinity;
    d.frames++;
    d.time += dt;
    if (d.time < ADJUST_EVERY) return;
    const fps = d.frames / d.time;
    d.frames = 0;
    d.time = 0;
    let r = this.res;
    if (fps < TARGET * 0.9 && r > MIN_RES) {
      d.cap = r;                 // this was too much: don't come straight back to it
      d.capT = RECOVER;
      r = Math.max(MIN_RES, r - STEP);
    } else if (fps > Math.min(TARGET * 1.12, 57) && r + STEP <= Math.min(this.q.maxRes, d.cap - 0.01)) {
      r += STEP;
    } else return;
    this.setResolution(Math.round(r * 100) / 100);
  }

  /** Called every frame with the real frame time: dynamic resolution, and the one-time automatic check. */
  update(dt) {
    if (this.fixedScale == null && dt > 0 && dt < 0.5) this.adjust(dt);
    if (!this.auto) return;
    const w = this.watch;
    w.t += dt;
    if (w.t < WATCH_FROM) return;
    w.frames++;
    w.time += dt;
    if (w.time < WATCH_FOR) return;
    const fps = w.frames / w.time;
    const i = ORDER.indexOf(this.level);
    const roomLeft = this.fixedScale == null && this.res > MIN_RES + 0.01; // dynamic resolution still has room to drop first
    if (fps < this.goal && i > 0 && roomLeft && !this.benching) {
      this.watch = { t: WATCH_FROM - 1, frames: 0, time: 0 };
    } else if (fps < this.goal && i > 0) {
      this.set(ORDER[i - 1], ` — ${Math.round(fps)} fps was too slow`);
      this.watch = { t: WATCH_FROM - 1, frames: 0, time: 0 }; // check again on the new setting
    } else {
      this.auto = false;
      save(this.level);
      if (this.benching) {
        this.benching = false;
        this.goal = TOO_SLOW;
        this.game.bus.emit('toast', `Benchmark done: ${QUALITY[this.level].label} suits this machine (${Math.round(fps)} fps)${fps < BENCH_GOAL ? ' — try a lower render scale too' : ''}`);
      }
    }
  }
}
