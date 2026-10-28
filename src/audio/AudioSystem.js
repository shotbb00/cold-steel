// Game audio: positional one-shots (Web Audio PannerNodes, listener on the camera), a wind
// bed, faction-specific weapons (M16 vs AK, M60 vs PKM, 120 mm vs 125 mm…), impacts, machine
// noise (engines, tracks, turret drives) and ambience. M toggles mute.
//
// Built to stay light on the audio thread, which is what keeps it from stuttering:
//   • Control rate: listener, machine levels and positions are updated 20 times a second,
//     not every frame, and every change goes through `set()`, which cancels what was queued
//     on that parameter first — the parameter timelines never pile up.
//   • Machines: a fixed pool of channels (engine + tracks + turret loops) is handed to the
//     nearest vehicles with hysteresis, so channels aren't torn down and rebuilt constantly.
//   • One-shots: a per-tick budget, a cap per sound, and voice stealing (the least audible
//     voice is cut) when too much is playing.
//   • Synthesis: the context is created at load (suspended until the first click or key, as
//     browsers require) and the sound bank is built a few buffers at a time in the background.
//   • Recordings (audio/SampleBank.js, public/sounds/sounds.json): where a key has recorded
//     files, a random one plays instead of the synthesised sound, matched to its loudness.
import { soundDefinitions } from './SoundBank.js';
import { SampleBank } from './SampleBank.js';
import { angleDelta, TAU } from '../core/math.js';
import { settings } from '../core/Settings.js';
import { keys } from '../core/Keys.js';

const MAX_VOICES = 40;     // simultaneous one-shots; beyond this the least audible one is cut
const MAX_PER_KEY = 5;     // instances of one sound at once (an MG burst, a barrage)
const BUDGET = 8;          // new one-shots per control tick (bursts beyond that are dropped)
const FAR = 110;           // metres beyond which shots switch to their '.far' version
// How far a sound carries: its reference distance in metres (full level inside it). A rifle shot
// fades within a few hundred metres, a howitzer is heard across the whole map.
const CARRY = {
  rifle: 8, mg: 9, aa: 12, autocannon: 14, rocket: 18, sam: 20, mortar: 26, cannon: 34, mlrs: 50, arty: 64,
  explosion: 30, 'explosion.big': 50, 'flare.pop': 20, 'smoke.pop': 10, stomp: 20,
};
const carry = (key) => CARRY[key.replace(/^(nato|pact)\./, '').replace(/\.far$/, '')] ?? 6;
const CULL = 40;           // sounds beyond this many reference distances are skipped (rifle: 320 m)
const CONTROL_DT = 0.05;   // seconds between control-rate updates (20 Hz)
const MACHINE_CHANNELS = 4;
const MACHINE_RANGE = 120;
const MACHINE_REF = 5;    // engines are far quieter than guns: they fade sooner
const ENGINE_LEVEL = { 'engine.turbine': 0.55 }; // gas turbines: a hiss, not a roar — kept well under the diesels
const WIND = 0.11;         // the wind bed; halved while the guns are talking
const BED = 0.2;           // the distant battle at its loudest
const BED_FILL = 90;       // weighted shots in the last ~20 s for the bed to be about two-thirds up
const SHOT_WEIGHT = { cannon: 3, arty: 5, mlrs: 5, mortar: 3, rocket: 2, autocannon: 1.5 };
const QUIET_FOR = 18;      // seconds without gunfire before birds come back
const BUILD_SLICE_MS = 6;  // main-thread time per background synthesis slice

/** Stereo impulse response: a few discrete early echoes, then a decaying diffuse tail. */
function makeImpulse(ctx, seconds) {
  const sr = ctx.sampleRate;
  const n = Math.floor(seconds * sr);
  const ir = ctx.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2.6) * Math.min(1, t / 0.03) * 0.5;
    }
    for (const [at, g] of [[0.045, 0.6], [0.11, 0.4], [0.19 + ch * 0.02, 0.3], [0.33, 0.2]]) {
      const i = Math.floor(at * sr);
      d[i] += g;
      d[i + 1] -= g * 0.5;
    }
  }
  return ir;
}

/** Glide a parameter to `value`, replacing anything still queued on it. */
function set(param, value, t, tau = 0.05) {
  param.cancelScheduledValues(t);
  param.setTargetAtTime(value, t, tau);
}

/** Air absorption: far sounds lose their top end. */
const airCutoff = (dist) => 16000 * Math.pow(0.1, Math.min(1, dist / 150));

export class AudioSystem {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.muted = false;
    this.bank = {};
    this.playing = [];  // { src, gain, key, start, level }
    this.lastPlay = new Map();
    this.budget = BUDGET;
    this.controlT = 0;
    this.channels = [];
    this.lastLoud = -Infinity;
    this.nextAmbient = 0;
    this.lastStep = 0;
    this.listenerPos = { x: 0, y: 0, z: 0 };

    this.init();
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    const bus = game.bus;
    bus.on('key', ({ code }) => { if (keys.is(code, 'mute')) this.toggleMute(); });
    bus.on('unit:death', ({ unit, stack }) => { if (stack.usesCover) this.play('death', unit.pos, { volume: 0.5 }); });
    bus.on('player:down', () => this.play('hurt', null, { volume: 1 }));
    bus.on('player:reloaded', () => this.play('ready', null, { volume: 0.3 }));
    bus.on('point:captured', ({ owner }) => this.play(`${owner}.horn`, null, { volume: 0.5, throttle: 1 }));
    bus.on('selection', () => this.play('click', null, { volume: 0.4, throttle: 0.05 }));
    bus.on('order', () => this.play('order', null, { volume: 0.5 }));
    bus.on('view', () => this.play('whoosh', null, { volume: 0.35 }));
    bus.on('wave', ({ faction }) => this.play(`${faction}.horn`, null, { volume: 0.6 }));
    bus.on('built', () => { if (!game.net?.isClient) this.play('order', null, { volume: 0.3 }); }); // a client gets the host's
  }

  /** Create the context and mix bus now (suspended), and start building the sound bank. */
  init() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = (this.ctx = new Ctx());

    // Gentle bus compression with a fast release: a big blast must not duck everything else
    // into silence.
    const comp = new DynamicsCompressorNode(ctx, { threshold: -8, knee: 14, ratio: 3, attack: 0.004, release: 0.09 });
    this.master = new GainNode(ctx, { gain: this.masterLevel });
    settings.on((key) => { if (key === 'volume') set(this.master.gain, this.masterLevel, ctx.currentTime, 0.05); });
    this.master.connect(comp).connect(ctx.destination);

    // Valley echo on a send bus: distant sounds get more of it.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = makeImpulse(ctx, 2.4);
    this.reverbIn = new GainNode(ctx, { gain: 0.6 });
    this.reverbIn.connect(this.reverb).connect(this.master);

    // Everything outside reaches you through this: walls muffle it when you're indoors.
    this.outdoor = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 20000, Q: 0.5 });
    this.outdoor.connect(this.master);
    // A small room: the hard slap of a shot fired inside a house.
    this.room = ctx.createConvolver();
    this.room.buffer = makeImpulse(ctx, 0.45);
    this.roomIn = new GainNode(ctx, { gain: 0.9 });
    this.roomIn.connect(this.room).connect(this.master);
    this.indoors = false;
    this.intensity = 0; // how hard the battle is going: weighted shots, fading over ~20 s

    this.buildBank(soundDefinitions(ctx));
    // recorded sounds, matched to the synthesised ones (so they load once those are built)
    this.samples = new SampleBank(ctx);
    this.samples.load((key) => this.synthesised(key));
  }

  /** The synthesised buffer for `key`, once the background build has made it (null if none). */
  synthesised(key) {
    if (this.bank[key] || this.ready) return Promise.resolve(this.bank[key] ?? null);
    return new Promise((resolve) => {
      const wait = () => (this.bank[key] || this.ready ? resolve(this.bank[key] ?? null) : setTimeout(wait, 100));
      wait();
    });
  }

  /** What to play for `key`: a recorded take if there is one, else the synthesised buffer. */
  sound(key) {
    const take = this.samples?.pick(key);
    if (take) return take;
    const buffer = this.bank[key];
    return buffer ? { buffer, gain: 1 } : null;
  }

  /** Synthesise the bank a few buffers at a time so the page never freezes. */
  buildBank(defs) {
    const queue = Object.entries(defs);
    const step = () => {
      const t0 = performance.now();
      while (queue.length && performance.now() - t0 < BUILD_SLICE_MS) {
        const [key, make] = queue.shift();
        this.bank[key] = make();
        if (key === 'wind') this.startWind();
      }
      if (queue.length) setTimeout(step, 0);
      else this.ready = true;
    };
    setTimeout(step, 0);
  }

  startWind() {
    const ctx = this.ctx;
    const wind = new AudioBufferSourceNode(ctx, { buffer: this.bank.wind, loop: true }); // (synthesised: it starts before recordings load)
    this.windGain = new GainNode(ctx, { gain: WIND });
    wind.connect(this.windGain).connect(this.outdoor);
    wind.start();
  }

  unlock() {
    if (this.ctx && this.ctx.state === 'suspended' && !this.game.paused) this.ctx.resume();
  }

  get masterLevel() {
    return this.muted ? 0 : 0.85 * settings.get('volume');
  }

  get running() {
    return !!this.ctx && !this.muted && this.ctx.state === 'running';
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) set(this.master.gain, this.masterLevel, this.ctx.currentTime, 0.03);
    this.game.bus.emit('toast', this.muted ? 'Sound muted (M)' : 'Sound on (M)');
  }

  distanceTo(pos) {
    const l = this.listenerPos;
    return Math.hypot(pos.x - l.x, pos.y - l.y, pos.z - l.z);
  }

  // ---------------------------------------------------------------- one-shots

  /**
   * Play a sound. With `pos` it is spatialised in the world; without, it plays straight
   * (the player's own gun, UI). `throttle` limits how often one key can retrigger.
   */
  play(key, pos = null, { volume = 1, rate = 1, throttle = 0.025, room = 0 } = {}) {
    if (!this.running || this.budget <= 0) return;
    const ctx = this.ctx;
    const dist = pos ? this.distanceTo(pos) : 0;
    const ref = carry(key);
    if (dist > ref * CULL) return;
    if (pos && dist > FAR && (this.bank[`${key}.far`] || this.samples?.samples[`${key}.far`])) key = `${key}.far`; // a distant thump and echo
    const take = this.sound(key);
    if (!take) return; // not built yet
    const now = ctx.currentTime;
    if (now - (this.lastPlay.get(key) ?? -1) < throttle) return;
    // how loud this will be here — used to decide what to cut when too much is playing
    const level = volume * ref / (ref + this.rolloff * Math.max(0, dist - ref));
    if (!this.makeRoom(key, level, now)) return;
    this.lastPlay.set(key, now);
    this.budget--;

    const src = new AudioBufferSourceNode(ctx, { buffer: take.buffer, playbackRate: rate * (0.93 + Math.random() * 0.14) });
    const gain = new GainNode(ctx, { gain: volume * take.gain });
    src.connect(gain);
    const nodes = [src, gain];
    if (pos) {
      const air = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: airCutoff(dist), Q: 0.5 });
      const panner = new PannerNode(ctx, {
        panningModel: 'equalpower', distanceModel: 'inverse', refDistance: ref, maxDistance: 3000, rolloffFactor: this.rolloff,
        positionX: pos.x, positionY: pos.y + 1.2, positionZ: pos.z,
      });
      const send = new GainNode(ctx, { gain: 0.12 + 0.4 * Math.min(1, dist / 90) });
      gain.connect(air).connect(panner).connect(this.outdoor);
      panner.connect(send).connect(this.reverbIn);
      nodes.push(air, panner, send);
      if (room) { // fired inside a building: the walls slap it back
        const slap = new GainNode(ctx, { gain: room });
        panner.connect(slap).connect(this.roomIn);
        nodes.push(slap);
      }
    } else {
      const send = new GainNode(ctx, { gain: this.indoors ? 0.04 : 0.1 });
      gain.connect(this.master);
      gain.connect(send).connect(this.reverbIn);
      nodes.push(send);
      if (this.indoors) { // your own shot in a room
        const slap = new GainNode(ctx, { gain: 0.6 });
        gain.connect(slap).connect(this.roomIn);
        nodes.push(slap);
      }
    }
    const voice = { src, gain, key, start: now, level };
    this.playing.push(voice);
    src.onended = () => {
      const i = this.playing.indexOf(voice);
      if (i >= 0) this.playing.splice(i, 1);
      for (const node of nodes) node.disconnect();
    };
    src.start();
  }

  /**
   * Voice stealing: keep at most MAX_PER_KEY of one sound and MAX_VOICES overall by fading
   * out the least audible (quiet and old) voice. Returns false if the new sound is itself
   * the least audible and should be skipped.
   */
  makeRoom(key, level, now) {
    const score = (v) => v.level / (1 + (now - v.start) * 2); // older tails count for less
    let oldest = null;
    let same = 0;
    for (const v of this.playing) {
      if (v.key !== key) continue;
      same++;
      if (!oldest || v.start < oldest.start) oldest = v;
    }
    if (same >= MAX_PER_KEY) this.cut(oldest);
    if (this.playing.length < MAX_VOICES) return true;
    let worst = null;
    for (const v of this.playing) if (!worst || score(v) < score(worst)) worst = v;
    if (!worst || score(worst) > level) return false;
    this.cut(worst);
    return true;
  }

  cut(v) {
    const t = this.ctx.currentTime;
    set(v.gain.gain, 0, t, 0.015); // quick fade, no click
    v.src.stop(t + 0.08);
    const i = this.playing.indexOf(v);
    if (i >= 0) this.playing.splice(i, 1);
  }

  /** Weapon discharge, flavoured by faction and weapon kind. */
  weapon(faction, kind, pos, indoors = false) {
    this.lastLoud = this.game.world.time;
    this.intensity += SHOT_WEIGHT[kind] ?? 1;
    const volume = { cannon: 0.85, arty: 0.85, mlrs: 0.85, sam: 0.7, rocket: 0.75, mg: 0.55, rifle: 0.55, aa: 0.6, mortar: 0.7, autocannon: 0.65 }[kind] ?? 0.55;
    this.play(`${faction}.${kind}`, pos, { volume, throttle: kind === 'cannon' ? 0.06 : 0.02, room: indoors ? 0.5 : 0 });
  }

  // ---------------------------------------------------------------- loops

  /**
   * A positional looping sound. Returns { setPos(p), setRate(r), setGain(g), stop() } —
   * call the setters at control rate, not per frame. A silent stub when audio can't play.
   */
  loop(key, pos, volume = 1, ref = 10) {
    const ctx = this.ctx;
    const stub = { setPos() {}, setRate() {}, setGain() {}, stop() {} };
    const take = ctx ? this.sound(key) : null;
    if (!take) return stub;
    const buffer = take.buffer;
    const k = take.gain; // a recording's loudness match applies to every level set on the loop
    const src = new AudioBufferSourceNode(ctx, { buffer, loop: true });
    const gain = new GainNode(ctx, { gain: 0 });
    const air = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: airCutoff(this.distanceTo(pos)), Q: 0.5 });
    const panner = new PannerNode(ctx, {
      panningModel: 'equalpower', distanceModel: 'inverse', refDistance: ref, maxDistance: 500, rolloffFactor: 1.3,
      positionX: pos.x, positionY: pos.y + 1, positionZ: pos.z,
    });
    const send = new GainNode(ctx, { gain: 0.2 });
    src.connect(gain).connect(air).connect(panner).connect(this.outdoor);
    panner.connect(send).connect(this.reverbIn);
    src.start(0, Math.random() * buffer.duration); // machines don't all run in phase
    if (volume) set(gain.gain, volume * k, ctx.currentTime, 0.1);
    const self = this;
    // only touch a parameter when its value has really changed
    const last = { x: pos.x, y: pos.y, z: pos.z, cut: 0, rate: 1, gain: volume };
    return {
      setPos(p) {
        const t = ctx.currentTime;
        if (Math.abs(p.x - last.x) + Math.abs(p.y - last.y) + Math.abs(p.z - last.z) > 0.25) {
          last.x = p.x;
          last.y = p.y;
          last.z = p.z;
          set(panner.positionX, p.x, t);
          set(panner.positionY, p.y + 1, t);
          set(panner.positionZ, p.z, t);
        }
        const cut = airCutoff(self.distanceTo(p));
        if (Math.abs(cut - last.cut) > last.cut * 0.08) {
          last.cut = cut;
          set(air.frequency, cut, t, 0.1);
        }
      },
      setRate(r) {
        if (Math.abs(r - last.rate) < 0.01) return;
        last.rate = r;
        set(src.playbackRate, r, ctx.currentTime, 0.15);
      },
      setGain(g) {
        if (Math.abs(g - last.gain) < 0.01) return;
        last.gain = g;
        set(gain.gain, g * k, ctx.currentTime, 0.1);
      },
      stop() {
        set(gain.gain, 0, ctx.currentTime, 0.08);
        src.stop(ctx.currentTime + 0.5);
        src.onended = () => [src, gain, air, panner, send].forEach((n) => n.disconnect());
      },
    };
  }

  // ---------------------------------------------------------------- machines

  /**
   * Engines, tracks and turret drives: a fixed pool of channels goes to the nearest
   * vehicles. A channel keeps its vehicle until it dies, drives out of range, or another is
   * clearly closer — no flicker at the boundary. Revs and clatter follow speed, the traverse
   * whine follows turret motion.
   */
  updateMachines(dt) {
    const near = [];
    for (const s of this.game.world.stacks) {
      if (s.usesCover || !s.type.engine) continue;
      for (const u of s.units) {
        if (!u.alive) continue;
        const d = this.distanceTo(u.pos);
        if (d < MACHINE_RANGE) near.push({ u, s, d });
      }
    }
    near.sort((a, b) => a.d - b.d);
    const assigned = new Set();
    // release channels whose vehicle is gone or well out of range
    for (const ch of this.channels) {
      if (!ch.u.alive || this.distanceTo(ch.u.pos) > MACHINE_RANGE * 1.15) this.release(ch);
      else assigned.add(ch.u);
    }
    for (const n of near) {
      if (assigned.has(n.u)) continue;
      if (this.channels.length < MACHINE_CHANNELS) {
        this.assign(n);
        assigned.add(n.u);
        continue;
      }
      // swap out the farthest channel only if this one is clearly closer
      const far = this.channels.reduce((a, b) => (a.d > b.d ? a : b));
      if (n.d < far.d * 0.7) {
        this.release(far);
        this.assign(n);
        assigned.add(n.u);
      }
    }
    for (const ch of this.channels) {
      const u = ch.u;
      ch.d = this.distanceTo(u.pos);
      const k = Math.min(1, Math.hypot(u.vel.x, u.vel.z) / ch.s.stats.speed);
      const busy = u.cooldown > 0 || !!u.target; // the gunner's foot on it in a fight
      ch.engine.setRate(0.8 + 0.5 * k + (busy ? 0.05 : 0));
      ch.engine.setGain((0.16 + 0.24 * k) * ch.level);
      ch.tracks.setRate(0.45 + 1.05 * k);
      ch.tracks.setGain(k > 0.05 ? 0.1 + 0.28 * k : 0);
      const turn = dt > 0 ? Math.abs(angleDelta(ch.turretYaw, u.turretYaw)) / dt : 0;
      ch.turretYaw = u.turretYaw;
      ch.turret.setGain(Math.min(0.22, turn * 0.35));
      ch.engine.setPos(u.pos);
      ch.tracks.setPos(u.pos);
      ch.turret.setPos(u.pos);
    }
  }

  assign({ u, s, d }) {
    const e = s.type.engine;
    const key = typeof e === 'string' ? e : e[s.faction];
    this.channels.push({
      u, s, d,
      engine: this.loop(key, u.pos, 0, MACHINE_REF),
      level: ENGINE_LEVEL[key] ?? 1,
      tracks: this.loop(s.type.tracks ?? 'tracks.heavy', u.pos, 0, MACHINE_REF),
      turret: this.loop('traverse', u.pos, 0, MACHINE_REF),
      turretYaw: u.turretYaw,
    });
  }

  release(ch) {
    ch.engine.stop();
    ch.tracks.stop();
    ch.turret.stop();
    this.channels.splice(this.channels.indexOf(ch), 1);
  }

  // ---------------------------------------------------------------- ambience, foley

  /** Lulls get their sounds back: birds in the hedges, a crow somewhere over the fields. */
  updateAmbience(now) {
    if (now - this.lastLoud < QUIET_FOR || now < this.nextAmbient) return;
    this.nextAmbient = now + 6 + Math.random() * 12;
    const a = Math.random() * TAU;
    const r = 20 + Math.random() * 45;
    const l = this.listenerPos;
    const crowCall = Math.random() < 0.35;
    this.play(crowCall ? 'crow' : 'birds', { x: l.x + Math.cos(a) * r, y: this.game.terrain.heightAt(l.x, l.z) + 4, z: l.z + Math.sin(a) * r },
      { volume: crowCall ? 0.55 : 0.35, throttle: 3 });
  }

  /**
   * Footsteps of the soldier you control: only some footfalls are heard (more when running),
   * each from a random surface variant at its own pitch and level, never twice in a row the
   * same — a background texture, not a click track.
   */
  updateSteps() {
    const u = this.game.player.unit;
    if (!u || !u.alive || !u.stack.usesCover) return;
    const fall = Math.floor(u.walkPhase / Math.PI);
    if (fall === this.lastStep) return;
    this.lastStep = fall;
    if (u.gait < 0.3 || Math.random() > (u.run ? 0.5 : 0.3)) return;
    const prone = u.prone > 0.5;
    let v = Math.floor(Math.random() * 4);
    if (v === this.lastStepVariant) v = (v + 1) % 4;
    this.lastStepVariant = v;
    this.play(`step.${v}`, null, {
      volume: (u.run ? 0.22 : 0.14) * (prone ? 0.6 : 1) * (0.7 + Math.random() * 0.6),
      rate: (prone ? 0.7 : 1) * (0.85 + Math.random() * 0.3),
      throttle: 0.25,
    });
  }

  // ---------------------------------------------------------------- per frame

  update(dt = 1 / 60) {
    if (!this.ctx) return;
    this.updateListenerPos();
    this.updateSteps();
    this.controlT += dt;
    if (this.controlT < CONTROL_DT) return;
    const step = this.controlT;
    this.controlT = 0;
    this.budget = BUDGET;
    if (!this.running) return;
    this.updateListener();
    if (this.windGain) set(this.windGain.gain, this.game.world.time - this.lastLoud < QUIET_FOR ? WIND * 0.5 : WIND, this.ctx.currentTime, 1.5);
    this.updateBed(step);
    this.updateIndoors();
    this.updateMachines(step);
    this.updateAmbience(this.game.world.time);
  }

  /** The rest of the front: a far rumble of guns that swells as the fighting here grows. */
  updateBed(dt) {
    this.intensity *= Math.exp(-dt / 20);
    if (!this.bed && this.bank['battle.bed']) {
      const src = new AudioBufferSourceNode(this.ctx, { buffer: this.bank['battle.bed'], loop: true });
      this.bed = new GainNode(this.ctx, { gain: 0 });
      src.connect(this.bed).connect(this.outdoor);
      src.start();
    }
    if (this.bed) set(this.bed.gain, BED * (1 - Math.exp(-this.intensity / BED_FILL)), this.ctx.currentTime, 2);
  }

  /** Inside a building (the soldier you control): the battle outside is muffled by the walls. */
  updateIndoors() {
    const u = this.game.player.unit;
    const inside = !!u?.alive && u.atCover && !!u.coverSpot?.interior;
    if (inside === this.indoors) return;
    this.indoors = inside;
    set(this.outdoor.frequency, inside ? 1300 : 20000, this.ctx.currentTime, 0.12);
  }

  /** Distance falloff: from above in the command view the whole field is heard more evenly. */
  get rolloff() { return 1.2 - 0.45 * (this.game.cameraManager?.blend ?? 0); }

  /** Where the "ears" are: the camera, or hovering over the battlefield in the command view. */
  updateListenerPos() {
    const cam = this.game.camera;
    const cm = this.game.cameraManager;
    const look = cm.lookTarget;
    const b = cm.blend;
    this.listenerPos.x = cam.position.x + (look.x - cam.position.x) * b;
    this.listenerPos.y = cam.position.y + (look.y + 20 - cam.position.y) * b;
    this.listenerPos.z = cam.position.z + (look.z - cam.position.z) * b;
  }

  updateListener() {
    const { x, y, z } = this.listenerPos;
    const fwd = this.game.camera.getWorldDirection(this._fwd ??= this.game.camera.position.clone());
    const L = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (L.positionX) {
      set(L.positionX, x, t, 0.03);
      set(L.positionY, y, t, 0.03);
      set(L.positionZ, z, t, 0.03);
      set(L.forwardX, fwd.x, t, 0.03);
      set(L.forwardY, fwd.y, t, 0.03);
      set(L.forwardZ, fwd.z, t, 0.03);
      L.upX.value = 0;
      L.upY.value = 1;
      L.upZ.value = 0;
    } else {
      L.setPosition(x, y, z);
      L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
    }
  }
}
