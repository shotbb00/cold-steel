// Recorded sounds on top of the synthesised bank (audio/SoundBank.js). `public/sounds/sounds.json`
// maps a sound key — the same keys the game plays: 'nato.rifle', 'explosion.big', 'rotor.cobra'…
// — to one or more audio files (paths relative to public/sounds/):
//   { "nato.rifle": ["guns/m16-1.ogg", "guns/m16-2.ogg"], "explosion.big": { "files": [...], "gain": 0.8 } }
// Every shot of a key with several files picks one at random. A key without files, or whose
// files fail to load, keeps its synthesised sound, so recorded and procedural sounds mix freely
// while the library grows.
//   • loudness: each file is matched to the synthesised sound it replaces (the loudest 50 ms of
//     each), so the balance tuned into the synth bank — rifles against cannons against shells —
//     carries over whatever level the recording was made at; `gain` in the JSON trims it further
//   • loops (keys the game plays as loops: engines, tracks, rotors, wind, rain): the end is
//     crossfaded into the start so the loop doesn't click
//   • files load in the background after the synth bank, a few at a time
const LOOPS = /^(engine\.|tracks\.|rotor\.|traverse$|wind$|rain$|jet$)/;
const PEAK_WINDOW = 0.05;  // s: the loudness measure
const LOOP_FADE = 0.12;    // s: crossfade at the loop point
const PARALLEL = 4;

export class SampleBank {
  constructor(ctx, base = import.meta.env?.BASE_URL ?? './') {
    this.ctx = ctx;
    this.base = `${base}sounds/`;
    this.samples = {};     // key → [{ buffer, gain }]
    this.loaded = 0;
    this.failed = [];
  }

  /** Fetch the list and decode every file; `synth(key)` gives the synthesised buffer to match. */
  async load(synth) {
    let list;
    try {
      const res = await fetch(`${this.base}sounds.json`, { cache: 'no-cache' });
      if (!res.ok) return;
      list = await res.json();
    } catch {
      return; // no recorded sounds: the synthesised bank is all there is
    }
    const jobs = [];
    for (const [key, entry] of Object.entries(list)) {
      if (key.startsWith('_')) continue; // comments
      const files = Array.isArray(entry) ? entry : entry.files ?? [];
      const trim = Array.isArray(entry) ? 1 : entry.gain ?? 1;
      for (const file of files) jobs.push({ key, file, trim });
    }
    const next = async () => {
      while (jobs.length) {
        const job = jobs.shift();
        try {
          const res = await fetch(this.base + job.file);
          if (!res.ok) throw new Error(res.status);
          let buffer = await this.ctx.decodeAudioData(await res.arrayBuffer());
          if (LOOPS.test(job.key)) buffer = loopable(this.ctx, buffer);
          const ref = await synth(job.key);
          const gain = (ref ? clamp(peak(ref) / Math.max(1e-4, peak(buffer)), 0.01, 20) : 1) * job.trim;
          (this.samples[job.key] ??= []).push({ buffer, gain });
          this.loaded++;
        } catch (e) {
          this.failed.push(`${job.file} (${e.message ?? e})`);
        }
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, next));
    if (this.failed.length) console.warn(`[sounds] could not load: ${this.failed.join(', ')}`);
  }

  /** A recorded take for `key` (random among its files), or null. */
  pick(key) {
    const list = this.samples[key];
    return list ? list[Math.floor(Math.random() * list.length)] : null;
  }
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** RMS of the loudest PEAK_WINDOW of a buffer (all channels). */
function peak(buffer) {
  const n = Math.max(1, Math.min(buffer.length, Math.floor(PEAK_WINDOW * buffer.sampleRate)));  // short clicks: their whole length
  let best = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    let sum = 0;
    for (let i = 0; i < d.length; i++) {
      sum += d[i] * d[i];
      if (i >= n) sum -= d[i - n] * d[i - n];
      if (i >= n - 1 && sum > best) best = sum;
    }
  }
  return Math.sqrt(best / n);
}

/** Crossfade the last LOOP_FADE seconds into the start, then drop them: a seamless loop. */
function loopable(ctx, buffer) {
  const sr = buffer.sampleRate;
  const f = Math.min(Math.floor(LOOP_FADE * sr), Math.floor(buffer.length / 3));
  const len = buffer.length - f;
  const out = ctx.createBuffer(buffer.numberOfChannels, len, sr);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    dst.set(src.subarray(0, len));
    for (let i = 0; i < f; i++) {
      const k = i / f;
      dst[i] = src[i] * k + src[len + i] * (1 - k);
    }
  }
  return out;
}
