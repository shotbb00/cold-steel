// Menu music: a slow, dark synth piece played live with Web Audio — no files, no loop seam.
// A low drone that never stops; minor pads that swell in and fade into the next chord, so there is
// never a gap; a muffled heartbeat bass; a sparse bell melody that changes every time round; a
// distant war drum every few bars; all in a long cold reverb. C minor, 60 BPM, an eight-bar
// phrase (Cm · Cm · A♭ · A♭ · Fm · Fm · D♭ · G) that runs on for as long as the menu is open.
// Starts as soon as the menu loads; a browser that holds sound back until the page is used
// (most do, for a site you haven't played much) gets it on the first click or key. Fades out when
// a battle is deployed. Volume: settings 'music' × 'volume'.
import { settings } from '../core/Settings.js';

const BPM = 60;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const LOOKAHEAD = 1.5;   // seconds scheduled ahead: survives a throttled background tab
const PHRASE = [         // pad voicings (MIDI), one chord per bar
  [48, 55, 60, 63], [48, 55, 60, 63], [44, 51, 56, 60], [44, 51, 56, 60],
  [41, 48, 53, 56], [41, 48, 53, 56], [49, 53, 56, 61], [43, 50, 55, 59],
];
// bell phrases: [beat in the bar pair, MIDI note] — one picked at random every two bars
const MOTIFS = [
  [[0, 75], [2.5, 74], [3, 72], [6, 67]],
  [[1, 72], [3, 75], [4, 79], [7, 78]],
  [[0, 79], [1.5, 75], [4, 74], [5, 72], [6.5, 70]],
  [[2, 67], [4, 68], [6, 67]],
  [],                                   // silence counts too
];
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/** A long, dark stereo reverb tail. */
function impulse(ctx, seconds) {
  const n = Math.floor(seconds * ctx.sampleRate);
  const ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      lp += 0.25 * (Math.random() * 2 - 1 - lp); // darker tail
      d[i] = lp * Math.exp((-3 * i) / n) * 2.2;
    }
  }
  return ir;
}

export class MenuMusic {
  constructor() {
    this.ctx = null;
    this.bar = 0;
    this.next = 0;
    this.unlock = () => (this.ctx ? this.ctx.resume() : this.start());
    window.addEventListener('pointerdown', this.unlock);
    window.addEventListener('keydown', this.unlock);
    this.off = settings.on((key) => { if ((key === 'music' || key === 'volume') && this.out) this.out.gain.setTargetAtTime(this.level, this.ctx.currentTime, 0.3); });
    this.start(); // right away, if the browser lets us
  }

  get level() {
    return 0.5 * (settings.get('music') ?? 0.6) * settings.get('volume');
  }

  start() {
    if (this.ctx || this.stopped) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = (this.ctx = new Ctx());
    const t = ctx.currentTime;
    this.out = new GainNode(ctx, { gain: 0 });
    this.out.gain.setTargetAtTime(this.level, t, 2.5); // a slow fade in
    this.out.connect(new DynamicsCompressorNode(ctx, { threshold: -16, ratio: 3 })).connect(ctx.destination);
    // dry and wet: everything also goes into the reverb
    this.bus = new GainNode(ctx, { gain: 1 });
    this.bus.connect(this.out);
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx, 6);
    this.bus.connect(verb).connect(new GainNode(ctx, { gain: 0.55 })).connect(this.out);
    // the drone: low C on two detuned saws and a sine, through a filter that breathes, forever
    const droneF = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 220, Q: 3 });
    const droneG = new GainNode(ctx, { gain: 0.09 });
    droneF.connect(droneG).connect(this.bus);
    for (const [type, det] of [['sawtooth', -7], ['sawtooth', 6], ['sine', 0]]) {
      const o = new OscillatorNode(ctx, { type, frequency: hz(36), detune: det });
      o.connect(droneF);
      o.start(t);
    }
    const lfo = new OscillatorNode(ctx, { frequency: 0.05 });
    lfo.connect(new GainNode(ctx, { gain: 120 })).connect(droneF.frequency);
    lfo.start(t);
    // the pads share one slowly sweeping filter
    this.padF = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 700, Q: 1.5 });
    const lfo2 = new OscillatorNode(ctx, { frequency: 0.031 });
    lfo2.connect(new GainNode(ctx, { gain: 350 })).connect(this.padF.frequency);
    lfo2.start(t);
    this.padF.connect(this.bus);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.next = t + 0.2;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 250);
    if (ctx.state === 'suspended') ctx.resume(); // allowed without a click where the browser trusts the site
    ctx.onstatechange = () => {
      if (ctx.state !== 'running') return;
      window.removeEventListener('pointerdown', this.unlock);
      window.removeEventListener('keydown', this.unlock);
    };
  }

  /** Fade out and let the battle have the speakers. */
  stop() {
    this.stopped = true;
    this.off?.();
    window.removeEventListener('pointerdown', this.unlock);
    window.removeEventListener('keydown', this.unlock);
    if (!this.ctx) return;
    clearInterval(this.timer);
    this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    setTimeout(() => this.ctx.close(), 2000);
  }

  schedule() {
    while (this.next < this.ctx.currentTime + LOOKAHEAD) {
      this.playBar(this.next, this.bar);
      this.next += BAR;
      this.bar++;
    }
  }

  playBar(t, bar) {
    const chord = PHRASE[bar % PHRASE.length];
    const changes = bar === 0 || chord !== PHRASE[(bar - 1) % PHRASE.length];
    // pads: each chord swells over two seconds and is still fading when the next one arrives
    if (changes) {
      const held = chord === PHRASE[(bar + 1) % PHRASE.length] ? BAR * 2 : BAR;
      for (const m of chord) for (const det of [-6, 7]) this.tone('sawtooth', hz(m), t, held + 0.5, 0.022, this.padF, 2.2, 2.5, det);
    }
    // the heartbeat: a muffled double pulse on the root, every beat from the third bar
    if (bar >= 2) {
      for (let b = 0; b < 4; b++) {
        const at = t + b * BEAT;
        const f = new BiquadFilterNode(this.ctx, { type: 'lowpass', frequency: 180 + (bar % 8) * 25, Q: 6 });
        f.connect(this.bus);
        this.tone('square', hz(chord[0] - 12), at, 0.12, 0.09, f, 0.01, 0.08);
        this.tone('square', hz(chord[0] - 12), at + 0.22, 0.1, 0.05, f, 0.01, 0.08);
      }
    }
    // the bell: a fresh motif every two bars, from the fifth bar on
    if (bar >= 4 && bar % 2 === 0) {
      for (const [beat, m] of pick(MOTIFS)) {
        const at = t + beat * BEAT;
        this.tone('sine', hz(m), at, 0.05, 0.05, this.bus, 0.005, 1.6);
        this.tone('triangle', hz(m + 12), at, 0.03, 0.012, this.bus, 0.005, 0.8); // its glassy overtone
      }
    }
    // the war drum, far off, at the start of every fourth bar
    if (bar % 4 === 0 && bar >= 8) this.drum(t);
    if (bar % 8 === 6 && bar >= 8) this.drum(t + BEAT * 3.5, 0.6);
  }

  /** One note: attack, hold for `dur`, then an exponential release `release` (time constant). */
  tone(type, f, t, dur, peak, dest, attack, release, detune = 0) {
    const ctx = this.ctx;
    const o = new OscillatorNode(ctx, { type, frequency: f, detune });
    const g = new GainNode(ctx, { gain: 0 });
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setTargetAtTime(0, t + attack + dur, release / 3);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + attack + dur + release * 2.5);
  }

  /** A deep drum a long way off: a pitched thud and a little noise, mostly reverb. */
  drum(t, level = 1) {
    const ctx = this.ctx;
    const o = new OscillatorNode(ctx, { frequency: 70 });
    o.frequency.exponentialRampToValueAtTime(38, t + 0.4);
    const g = new GainNode(ctx, { gain: 0 });
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35 * level, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + 1.5);
    const n = new AudioBufferSourceNode(ctx, { buffer: this.noise });
    const nf = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 400 });
    const ng = new GainNode(ctx, { gain: 0 });
    ng.gain.setValueAtTime(0.12 * level, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    n.connect(nf).connect(ng).connect(this.bus);
    n.start(t);
    n.stop(t + 0.6);
  }
}
