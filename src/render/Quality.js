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
// The render-scale setting (settings 'renderScale', 0.5–1) overrides the preset's resolution.
//   Babylon renderer (render/babylon/BabylonView.js applyQuality) also: shadow filtering, whether
//   the shadow map is redrawn every frame, and AO only on High
//   (sun shadows and SSAO are by far its biggest costs on laptop graphics)
import * as THREE from 'three';
import { settings } from '../core/Settings.js';
import { setLodDistance } from './StackRenderer.js';

export const QUALITY = {
  verylow: {
    label: 'Very low', resolution: 0.5, msaa: 0, ao: false, aoScale: 0.5, bloom: false,
    shadowSize: 512, shadowType: THREE.PCFShadowMap, detail: { grass: 0.1, hedge: 0.3, clutter: 0.15, foliage: 0 },
    shadowFilter: 'low', shadowEvery: 2, babylonAO: false, shadows: false, post: false, lod: 0,
  },
  low: {
    label: 'Low', resolution: 0.75, msaa: 0, ao: false, aoScale: 0.5, bloom: false,
    shadowSize: 1024, shadowType: THREE.PCFShadowMap, detail: { grass: 0.35, hedge: 0.5, clutter: 0.4, foliage: 1 },
    shadowFilter: 'low', shadowEvery: 2, babylonAO: false, lod: 30,
  },
  medium: {
    label: 'Medium', resolution: 1, msaa: 2, ao: true, aoScale: 0.5, bloom: true,
    shadowSize: 2048, shadowType: THREE.PCFShadowMap, detail: { grass: 0.65, hedge: 0.8, clutter: 0.7, foliage: 1 },
    shadowFilter: 'medium', shadowEvery: 1, babylonAO: false, lod: 45,
  },
  high: {
    label: 'High', resolution: Math.min(devicePixelRatio, 1.5), msaa: 4, ao: true, aoScale: 0.75, bloom: true,
    shadowSize: 4096, shadowType: THREE.PCFSoftShadowMap, detail: { grass: 1, hedge: 1, clutter: 1, foliage: 1 },
    shadowFilter: 'high', shadowEvery: 1, babylonAO: true, lod: 75,
  },
};
const ORDER = ['verylow', 'low', 'medium', 'high'];
const WATCH_FROM = 4;   // seconds after start before the frame rate counts (shaders compiling)
const WATCH_FOR = 8;    // seconds of frame rate to average
const TOO_SLOW = 32;    // fps below which the auto check steps down

const load = () => settings.get('quality');
const save = (level) => settings.set('quality', level);

export class Quality {
  constructor(game) {
    this.game = game;
    const stored = load();
    this.level = QUALITY[stored] ? stored : 'medium';
    this.auto = !QUALITY[stored]; // only judge the machine when the player hasn't chosen
    this.watch = { t: 0, frames: 0, time: 0 };
    this.apply(this.level);
    game.bus.on('key', ({ code }) => { if (code === 'KeyG') this.cycle(); });
    // chosen in a settings panel
    settings.on((key, value) => {
      if (key === 'quality' && QUALITY[value] && value !== this.level) {
        this.auto = false;
        this.level = value;
        this.apply(value);
      }
      if (key === 'renderScale') this.apply(this.level);
    });
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

  apply(level) {
    const q = { ...QUALITY[level], resolution: settings.get('renderScale') ?? QUALITY[level].resolution };
    const { renderer, post, environment, scene } = this.game;
    renderer.setPixelRatio(q.resolution);
    renderer.setSize(innerWidth, innerHeight);
    post.setPixelRatio(q.resolution);
    post.setSamples(q.msaa);
    post.setSize(innerWidth, innerHeight);
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

  /** Called every frame with the real frame time: the one-time automatic check. */
  update(dt) {
    if (!this.auto) return;
    const w = this.watch;
    w.t += dt;
    if (w.t < WATCH_FROM) return;
    w.frames++;
    w.time += dt;
    if (w.time < WATCH_FOR) return;
    const fps = w.frames / w.time;
    const i = ORDER.indexOf(this.level);
    if (fps < TOO_SLOW && i > 0) {
      this.set(ORDER[i - 1], ` — ${Math.round(fps)} fps was too slow`);
      this.watch = { t: WATCH_FROM - 1, frames: 0, time: 0 }; // check again on the new setting
    } else {
      this.auto = false;
      save(this.level);
    }
  }
}
