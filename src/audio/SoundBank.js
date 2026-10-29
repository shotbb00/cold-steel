// Procedural sound effects. Every sound is synthesised into an AudioBuffer at startup from
// filtered noise, oscillators and envelopes, so the game ships no audio files and works
// offline. Keys are "<faction>.<sound>" for faction-specific sounds (NATO: M16A2, M60,
// Carl Gustaf, 120 mm, 155 mm; Pact: AK-74, PKM, RPG-7, 125 mm, 122 mm) and plain names for
// shared ones (impacts, explosions, UI).
//
// A gunshot is layered the way a recording sounds: the supersonic crack and muzzle blast
// (a few ms of broadband noise), the body (low-passed noise + a pitched thump that gives the
// calibre its weight), and a long dark tail standing in for the echo off the hills (the
// AudioSystem's reverb adds more with distance).
const TAU = Math.PI * 2;

function makeBuffer(ctx, dur, fill) {
  const sr = ctx.sampleRate;
  const n = Math.ceil(dur * sr);
  const buf = ctx.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  fill(d, sr, n);
  // normalise to a consistent peak so volumes are set by the mixer, not the synth
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > 0) for (let i = 0; i < n; i++) d[i] *= 0.9 / peak;
  return buf;
}

/** One-pole low-pass coefficient for cutoff fc. */
const lpCoef = (fc, sr) => 1 - Math.exp((-TAU * fc) / sr);
const attack = (t, a = 0.003) => Math.min(1, t / a);

/** Simple state-variable band-pass, for resonant "body" colour. */
function bandpass(f, q, sr) {
  const k = 2 * Math.sin((Math.PI * f) / sr);
  let low = 0;
  let band = 0;
  return (x) => {
    low += k * band;
    const high = x - low - band / q;
    band += k * high;
    return band;
  };
}

/**
 * Gunshot.
 *   crack:  level of the first few ms of bright noise (supersonic crack + blast)
 *   body:   level of the low-passed blast (cutoff bodyLP, decay bodyDecay /s)
 *   thump:  level / frequency of the pitched low thump (calibre weight)
 *   bark:   resonant mid band (freq barkF) — the AK's harsher voice
 *   tail:   level / cutoff / decay of the echo tail
 */
function gunshot(ctx, {
  dur = 1.2, crack = 1, crackDecay = 900, body = 0.8, bodyLP = 1800, bodyDecay = 30,
  thump = 0.7, thumpF = 110, bark = 0, barkF = 900, tail = 0.25, tailLP = 500, tailDecay = 3.5, drive = 1.6,
}) {
  return makeBuffer(ctx, dur, (d, sr, n) => {
    let lpB = 0;
    let lpT = 0;
    let lpT2 = 0;
    const aB = lpCoef(bodyLP, sr);
    const aT = lpCoef(tailLP, sr);
    const bp = bandpass(barkF, 2.5, sr);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const w = Math.random() * 2 - 1;
      let s = crack * w * Math.exp(-t * crackDecay);
      lpB += aB * (w - lpB);
      s += body * lpB * 3 * Math.exp(-t * bodyDecay);
      if (bark) s += bark * bp(w) * 2 * Math.exp(-t * bodyDecay * 1.3);
      ph += (TAU * thumpF * (1 - Math.min(0.5, t * 4))) / sr;
      s += thump * Math.sin(ph) * Math.exp(-t * 35);
      lpT += aT * (w - lpT);
      lpT2 += aT * (lpT - lpT2);
      // the echo arrives a moment later and rolls on
      s += tail * lpT2 * 6 * Math.min(1, t / 0.06) * Math.exp(-t * tailDecay);
      d[i] = Math.tanh(s * drive * attack(t, 0.0003));
    }
  });
}

/**
 * High-explosive burst: a sharp blast front, a very deep thump, the rumble rolling away,
 * and a patter of falling earth and debris.
 */
function blast(ctx, { dur = 3, thumpF = 38, rumble = 1, rumbleDecay = 1.6, debris = 0.3, crack = 1, lp = 900 }) {
  return makeBuffer(ctx, dur, (d, sr, n) => {
    let l1 = 0;
    let l2 = 0;
    let l3 = 0;
    const a = lpCoef(lp, sr);
    const aR = lpCoef(160, sr);
    let ph = 0;
    let rattle = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const w = Math.random() * 2 - 1;
      l1 += a * (w - l1);
      l2 += aR * (w - l2);
      l3 += aR * (l2 - l3);
      let s = crack * w * Math.exp(-t * 300);
      s += l1 * 3 * Math.exp(-t * 9);
      ph += (TAU * thumpF * (1 - Math.min(0.45, t * 1.2))) / sr;
      s += 1.6 * Math.sin(ph) * Math.exp(-t * 7);
      s += rumble * l3 * 14 * Math.min(1, t / 0.08) * Math.exp(-t * rumbleDecay);
      // falling debris: sparse random ticks, densest half a second after the burst
      if (debris && t > 0.3 && Math.random() < 0.0025 * Math.exp(-((t - 0.9) ** 2) / 0.4)) rattle = 0.6 + Math.random() * 0.4;
      rattle *= 0.993;
      s += debris * rattle * w;
      d[i] = Math.tanh(s * 1.4 * attack(t, 0.0005));
    }
  });
}

/** A short mechanical click / clack (magazine, bolt, safety). */
function clack(d, sr, at, { level = 1, freq = 2500, q = 6, decay = 400, body = 0 } = {}) {
  const bp = bandpass(freq, q, sr);
  const start = Math.floor(at * sr);
  const len = Math.floor(sr * 0.06);
  for (let i = 0; i < len && start + i < d.length; i++) {
    const t = i / sr;
    const w = Math.random() * 2 - 1;
    d[start + i] += level * (bp(w) * 3 + w * 0.3) * Math.exp(-t * decay) + body * Math.sin(TAU * 180 * t) * Math.exp(-t * 90);
  }
}

/** Radio squelch: band-limited hiss, a click, and an optional roger beep. */
function radio(ctx, { dur = 0.32, beep = 0, beepF = 1000, hissF = 1800 }) {
  return makeBuffer(ctx, dur, (d, sr, n) => {
    const bp = bandpass(hissF, 1.2, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let s = 0;
      if (t < 0.16) s += bp(Math.random() * 2 - 1) * 1.2 * (t < 0.15 ? 1 : 0);
      if (beep && t > 0.17 && t < 0.17 + beep) s += Math.sin(TAU * beepF * t) * 0.5;
      d[i] = s;
    }
    clack(d, sr, 0, { level: 0.8, freq: 3000, decay: 900 });
    clack(d, sr, 0.155, { level: 0.6, freq: 2500, decay: 900 });
  });
}

/** Incoming shell: noise through a resonant band sweeping f0 → f1, swelling toward impact. */
function incoming(ctx, { dur, f0, f1, tone }) {
  return makeBuffer(ctx, dur, (d, sr, n) => {
    let ph = 0;
    let low = 0;
    let band = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const k = t / dur;
      const f = f0 * Math.pow(f1 / f0, k);
      const c = 2 * Math.sin((Math.PI * f) / sr);
      const w = Math.random() * 2 - 1;
      low += c * band;
      band += c * (w - low - band / 2.2);
      ph += (TAU * f * 0.9 * (1 + 0.01 * Math.sin(TAU * 6 * t))) / sr;
      const env = k * k * (k < 0.96 ? 1 : (1 - k) / 0.04);
      d[i] = (band + tone * Math.sin(ph)) * env;
    }
  });
}

/** Make a buffer loop seamlessly: crossfade its last `fade` seconds into its start. */
function loopify(d, sr, n, fade = 0.06) {
  const f = Math.floor(sr * fade);
  for (let i = 0; i < f; i++) {
    const k = i / f;
    d[i] = d[i] * k + d[n - f + i] * (1 - k);
  }
}

/**
 * Diesel engine (T-72's V-46, the 2S1 and M109 diesels): firing pulses at `fire` Hz, each a
 * little different, with a rough harmonic growl and exhaust rumble. Whole cycles per buffer so
 * it loops; playbackRate raises the revs.
 */
function diesel(ctx, { dur = 2, fire = 24, growl = 0.5, rough = 0.5 }) {
  return makeBuffer(ctx, dur, (d, sr, n) => {
    const cycles = Math.round(fire * dur);
    const amp = Array.from({ length: cycles + 1 }, () => 1 - rough * 0.5 + Math.random() * rough);
    let lp = 0;
    let lp2 = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const cyc = t * fire;
      const c = Math.floor(cyc);
      const pos = cyc - c;
      const w = Math.random() * 2 - 1;
      lp += lpCoef(700, sr) * (w - lp);
      lp2 += lpCoef(120, sr) * (w - lp2);
      let x = amp[c] * Math.exp(-pos * 7) * (lp * 2.2 + Math.sin(TAU * fire * 3 * t) * 0.4);
      x += growl * (Math.sin(TAU * fire * t) * 0.6 + Math.sin(TAU * fire * 2 * t) * 0.35 + Math.sin(TAU * fire * 0.5 * t) * 0.3);
      x += lp2 * 3;
      d[i] = Math.tanh(x * 1.3);
    }
    loopify(d, sr, n);
  });
}

/** Gas turbine (the Abrams' AGT1500): a high whine over a jet-like rush and a low rumble. */
function turbine(ctx, { dur = 2 }) {
  return makeBuffer(ctx, dur, (d, sr, n) => {
    const bp = bandpass(2400, 0.9, sr);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const w = Math.random() * 2 - 1;
      lp += lpCoef(150, sr) * (w - lp);
      // the whine kept low under the rush and rumble (it used to cut through everything)
      d[i] = Math.sin(TAU * 1500 * t) * 0.05 + Math.sin(TAU * 3010 * t) * 0.015 + Math.sin(TAU * 760 * t) * 0.07
        + bp(w) * 0.3 + lp * 2.4 + Math.sin(TAU * 40 * t) * 0.25;
    }
    loopify(d, sr, n);
  });
}

/** Track clatter: links slapping over the sprockets, the odd squeal, a rattle under it. */
function tracks(ctx, { dur = 1, clanks = 8, squeal = 0.3 }) {
  return makeBuffer(ctx, dur, (d, sr, n) => {
    let lp = 0;
    for (let i = 0; i < n; i++) {
      lp += lpCoef(900, sr) * (Math.random() * 2 - 1 - lp);
      d[i] = lp * 0.5;
    }
    for (let k = 0; k < clanks; k++) {
      const at = (k + 0.15 + Math.random() * 0.2) / clanks * dur * 0.97;
      clack(d, sr, at, { level: 0.8 + Math.random() * 0.4, freq: 900 + Math.random() * 1400, q: 4, decay: 120, body: 0.6 });
    }
    if (squeal) {
      const a = Math.floor(sr * dur * 0.45);
      const len = Math.floor(sr * 0.18);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        d[a + i] += squeal * Math.sin(TAU * (2300 + 500 * t / 0.18) * t) * Math.sin((Math.PI * i) / len);
      }
    }
    loopify(d, sr, n, 0.03);
  });
}

/** Turret traverse: hydraulic / electric drive whine with a hum. */
function traverse(ctx, { dur = 1, f = 420 }) {
  return makeBuffer(ctx, dur, (d, sr, n) => {
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      lp += lpCoef(3000, sr) * (Math.random() * 2 - 1 - lp);
      d[i] = Math.sin(TAU * f * t) * 0.5 + Math.sin(TAU * f * 2 * t) * 0.25 + Math.sin(TAU * f * 3 * t) * 0.1 + Math.sin(TAU * 100 * t) * 0.3 + lp * 0.15;
    }
    loopify(d, sr, n);
  });
}

/** A carrion crow far off: three harsh caws. */
function crow(ctx) {
  return makeBuffer(ctx, 1.4, (d, sr, n) => {
    const bp = bandpass(1300, 3, sr);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const k = (t % 0.42) / 0.26;
      if (k > 1 || t > 1.26) continue;
      const f = 520 - 120 * k;
      ph += (TAU * f) / sr;
      const saw = ((ph / TAU) % 1) * 2 - 1;
      d[i] = bp(saw + (Math.random() * 2 - 1) * 0.4) * Math.sin(Math.PI * k);
    }
  });
}

/** Small birds in a hedge: a handful of quick chirps. */
function birds(ctx) {
  return makeBuffer(ctx, 1.6, (d, sr) => {
    for (let c = 0; c < 6; c++) {
      const at = c * 0.22 + Math.random() * 0.08 + (c > 3 ? 0.3 : 0);
      const f0 = 3200 + Math.random() * 1500;
      const len = Math.floor(sr * (0.05 + Math.random() * 0.04));
      const start = Math.floor(at * sr);
      let ph = 0;
      for (let i = 0; i < len && start + i < d.length; i++) {
        const k = i / len;
        ph += (TAU * f0 * (1 + 0.4 * Math.sin(Math.PI * k))) / sr;
        d[start + i] += Math.sin(ph) * Math.sin(Math.PI * k);
      }
    }
  });
}

/**
 * A boot coming down: a soft thud plus some surface noise — `rustle` for grass, `grit` for
 * the crunch of soil and stones. Variants keep a walk from sounding like a metronome.
 */
function step(ctx, { thud = 1, thudLP = 260, rustle = 0.3, rustleHP = 1500, grit = 0, dur = 0.2 }) {
  return makeBuffer(ctx, dur, (d, sr, n) => {
    let lp = 0;
    let hp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const w = Math.random() * 2 - 1;
      lp += lpCoef(thudLP, sr) * (w - lp);
      hp += lpCoef(rustleHP, sr) * (w - hp);
      let x = thud * lp * 2.5 * Math.exp(-t * 40) + rustle * (w - hp) * Math.exp(-t * 16) * Math.min(1, t / 0.01);
      if (grit && Math.random() < 0.004 * Math.exp(-t * 20)) x += grit * w * 3; // little stones
      d[i] = x;
    }
  });
}

/**
 * Helicopter rotor loop: a blade-slap pulse `bladeHz` times a second (whole pulses per buffer so
 * it loops), each a thump and a burst of low noise, over a turbine whine and air rush.
 */
function rotor(ctx, { dur = 2, bladeHz, thumpF = 70, slap = 1, whineHz = 1200, whine = 0.08 }) {
  return makeBuffer(ctx, dur, (d, sr, n) => {
    const pulses = Math.round(bladeHz * dur);
    const period = n / pulses;
    let lp = 0;
    let rush = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const k = (i % period) / sr;                 // seconds since the last blade passed
      const w = Math.random() * 2 - 1;
      lp += lpCoef(420, sr) * (w - lp);
      rush += lpCoef(1800, sr) * (w - rush);
      let x = slap * Math.exp(-k * 38) * (lp * 3 + Math.sin(TAU * thumpF * k) * 0.8);
      x += Math.sin(TAU * whineHz * t) * whine + Math.sin(TAU * whineHz * 2.02 * t) * whine * 0.4;
      x += rush * 0.35;
      d[i] = Math.tanh(x * 1.2);
    }
    loopify(d, sr, n, 0.03);
  });
}

/** Seamlessly looping wind: low-passed noise with a periodic gust envelope. */
function wind(ctx, dur) {
  return makeBuffer(ctx, dur, (d, sr, n) => {
    let lp = 0;
    let lp2 = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const gust = 0.55 + 0.3 * Math.sin((TAU * t) / dur) + 0.15 * Math.sin((TAU * 3 * t) / dur + 1);
      const a = lpCoef(250 + 500 * gust, sr);
      lp += a * (Math.random() * 2 - 1 - lp);
      lp2 += a * (lp - lp2);
      d[i] = lp2 * gust;
    }
    const fade = Math.floor(sr * 0.05); // smooth the loop seam
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[i] = d[i] * k + d[n - fade + i] * (1 - k);
    }
  });
}

/** Rocket launch: a hard pop (or a recoilless boom), then the motor's roaring hiss receding. */
/** A rotary cannon's burst: `hz` rounds a second fused into one buzzing roar, a rolling tail. */
function brrrt(ctx, { hz, dur, lp = 1000, thumpF = 50 }) {
  return makeBuffer(ctx, dur + 1.2, (d, sr, n) => {
    let f = 0;
    let low = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const on = t < dur ? 1 : Math.exp(-(t - dur) * 3);
      const w = Math.random() * 2 - 1;
      f += lpCoef(lp, sr) * (w - f);
      low += lpCoef(120, sr) * (w - low);
      const ph = (t * hz) % 1;
      const pulse = Math.exp(-ph * 9);                       // each round's crack
      const body = Math.sin(TAU * thumpF * t) * pulse;
      d[i] = Math.tanh((f * (0.4 + pulse * 1.2) + body * 0.9) * (t < dur ? 1 : 0.2) * 1.6 + low * 2.4 * on);
    }
  });
}

function rocket(ctx, { boom = 1, thumpF = 70, motor = 0.8, motorDur = 0.9, dur = 1.8 }) {
  return makeBuffer(ctx, dur, (d, sr, n) => {
    let l1 = 0;
    let l2 = 0;
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const w = Math.random() * 2 - 1;
      l1 += lpCoef(2500, sr) * (w - l1);
      l2 += lpCoef(500, sr) * (w - l2);
      let s = boom * (w * Math.exp(-t * 200) + l1 * 2.5 * Math.exp(-t * 14));
      ph += (TAU * thumpF * (1 - Math.min(0.5, t * 3))) / sr;
      s += boom * 1.2 * Math.sin(ph) * Math.exp(-t * 20);
      // motor: whooshing hiss that swells in, then fades as it flies off (Doppler-ish darkening)
      const m = t > 0.05 && t < motorDur ? Math.sin((Math.PI * (t - 0.05)) / (motorDur - 0.05)) : 0;
      s += motor * m * (l1 * (1 - t / motorDur) + l2 * 2) * 1.5;
      s += l2 * 2 * 0.3 * Math.min(1, t / 0.1) * Math.exp(-t * 2.5); // echo
      d[i] = Math.tanh(s * 1.5 * attack(t, 0.0004));
    }
  });
}

/**
 * The sound definitions: key → () => AudioBuffer. Building every buffer at once takes a
 * second or two of main-thread time, so AudioSystem builds them a few at a time while the
 * game loads (most urgent first: the order below).
 */
export function soundDefinitions(ctx) {
  return {
    // --- small arms
    // M16A2 (5.56 mm): sharp, bright crack, lighter body
    'nato.rifle': () => gunshot(ctx, { crack: 1.1, crackDecay: 1100, body: 0.7, bodyLP: 2400, bodyDecay: 38, thump: 0.5, thumpF: 140, tail: 0.25, tailLP: 650, tailDecay: 3.8 }),
    // AK-74 (5.45 mm): a harsher mid-range bark, a touch more body
    'pact.rifle': () => gunshot(ctx, { crack: 1, crackDecay: 900, body: 0.8, bodyLP: 1700, bodyDecay: 30, thump: 0.6, thumpF: 120, bark: 0.6, barkF: 850, tail: 0.27, tailLP: 550, tailDecay: 3.5, drive: 1.9 }),
    // M60 (7.62 mm NATO): heavier, deeper thump
    'nato.mg': () => gunshot(ctx, { dur: 0.9, crack: 1, crackDecay: 800, body: 0.9, bodyLP: 1500, bodyDecay: 30, thump: 0.95, thumpF: 95, tail: 0.22, tailLP: 450, tailDecay: 4.2, drive: 1.8 }),
    // PKM (7.62x54R): deep and snarling
    'pact.mg': () => gunshot(ctx, { dur: 0.9, crack: 0.95, crackDecay: 750, body: 1, bodyLP: 1300, bodyDecay: 28, thump: 1, thumpF: 85, bark: 0.5, barkF: 700, tail: 0.22, tailLP: 420, tailDecay: 4.2, drive: 2.1 }),

    // --- launchers
    'nato.rocket': () => rocket(ctx, { boom: 1.3, thumpF: 60, motor: 0.4, motorDur: 0.6 }),   // Carl Gustaf: recoilless, a huge boom
    'pact.rocket': () => rocket(ctx, { boom: 0.8, thumpF: 85, motor: 1, motorDur: 1.1 }),     // RPG-7: pop, then the sustainer roars

    // --- tank guns and howitzers
    'nato.cannon': () => gunshot(ctx, { dur: 3, crack: 1.2, crackDecay: 350, body: 1.2, bodyLP: 900, bodyDecay: 9, thump: 1.6, thumpF: 50, tail: 0.7, tailLP: 260, tailDecay: 1.4, drive: 2.2 }),
    'pact.cannon': () => gunshot(ctx, { dur: 3, crack: 1.1, crackDecay: 300, body: 1.3, bodyLP: 750, bodyDecay: 8, thump: 1.7, thumpF: 44, bark: 0.3, barkF: 500, tail: 0.75, tailLP: 230, tailDecay: 1.3, drive: 2.4 }),
    'nato.arty': () => gunshot(ctx, { dur: 3.6, crack: 1, crackDecay: 250, body: 1.3, bodyLP: 600, bodyDecay: 6, thump: 1.8, thumpF: 36, tail: 0.9, tailLP: 200, tailDecay: 1, drive: 2.4 }),
    'pact.arty': () => gunshot(ctx, { dur: 3.4, crack: 1, crackDecay: 280, body: 1.2, bodyLP: 680, bodyDecay: 7, thump: 1.7, thumpF: 42, tail: 0.85, tailLP: 220, tailDecay: 1.1, drive: 2.4 }),
    'arty.distant': () => blast(ctx, { dur: 2.6, thumpF: 30, rumble: 1.2, rumbleDecay: 1.4, debris: 0, crack: 0.1, lp: 250 }),

    // --- incoming and explosions
    // incoming shells: the tearing rush of air of a shell coming down — band-passed noise
    // sweeping down and swelling, a faint wavering tone underneath, cut off just before impact.
    // Three variants so a barrage doesn't repeat itself.
    // a falling shell: a low rush of air sliding down, no pure tone (the old 2–3 kHz whistle grated)
    'incoming.0': () => incoming(ctx, { dur: 1.0, f0: 1100, f1: 320, tone: 0 }),
    'incoming.1': () => incoming(ctx, { dur: 0.8, f0: 900, f1: 380, tone: 0 }),
    'incoming.2': () => incoming(ctx, { dur: 1.1, f0: 1250, f1: 280, tone: 0.02 }),
    'incoming.big': () => incoming(ctx, { dur: 2.3, f0: 1500, f1: 180, tone: 0.05 }), // a howitzer shell tearing down
    explosion: () => blast(ctx, { dur: 2.6, thumpF: 46, rumble: 0.9, rumbleDecay: 1.9, debris: 0.25, lp: 1100 }),
    'explosion.big': () => blast(ctx, { dur: 4, thumpF: 32, rumble: 1.3, rumbleDecay: 1.1, debris: 0.35, lp: 800 }),

    // --- impacts
    'impact.ground': () => makeBuffer(ctx, 0.25, (d, sr, n) => {  // a dull thup and a spray of grit
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        lp += lpCoef(900, sr) * (Math.random() * 2 - 1 - lp);
        d[i] = lp * 3 * Math.exp(-t * 30) + Math.sin(TAU * 120 * t) * Math.exp(-t * 60) * 0.6 + (Math.random() * 2 - 1) * 0.15 * Math.exp(-t * 18);
      }
    }),
    'impact.stone': () => makeBuffer(ctx, 0.3, (d, sr, n) => {    // hard crack of a round on stone or brick
      const bp = bandpass(2600, 3, sr);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const w = Math.random() * 2 - 1;
        d[i] = w * Math.exp(-t * 250) + bp(w) * 2 * Math.exp(-t * 40) + (Math.random() * 2 - 1) * 0.1 * Math.exp(-t * 12);
      }
    }),
    'impact.armor': () => makeBuffer(ctx, 0.45, (d, sr, n) => {   // the clang of a bullet off steel plate
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        let s = (Math.random() * 2 - 1) * Math.exp(-t * 300);
        for (const [f, a, k] of [[1150, 1, 14], [1870, 0.7, 18], [2730, 0.5, 22], [4100, 0.3, 30]]) s += a * Math.sin(TAU * f * t) * Math.exp(-t * k);
        d[i] = s;
      }
    }),
    'impact.flesh': () => makeBuffer(ctx, 0.15, (d, sr, n) => {
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        lp += lpCoef(500, sr) * (Math.random() * 2 - 1 - lp);
        d[i] = lp * 3 * Math.exp(-t * 40) + Math.sin(TAU * 90 * t) * Math.exp(-t * 50);
      }
    }),
    // a round glancing off: a short, mostly noisy zing (the old 0.7 s pure 3.4 kHz whine grated)
    ricochet: () => makeBuffer(ctx, 0.32, (d, sr, n) => {
      let ph = 0;
      let band = 0;
      let low = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const k = t / 0.32;
        const f = 1900 - 900 * k;
        ph += (TAU * f * (1 + 0.04 * Math.sin(TAU * 23 * t))) / sr;
        const c = 2 * Math.sin((Math.PI * f) / sr);       // noise through a band around the zing
        const w = Math.random() * 2 - 1;
        low += c * band;
        band += c * (w - low - band / 1.5);
        const env = Math.min(1, t / 0.006) * (1 - k) ** 2.2;
        d[i] = (Math.sin(ph) * 0.35 + band * 0.9) * env + w * 0.4 * Math.exp(-t * 220);
      }
    }),
    // a round passing close by: the sharp N-wave crack of the shock front, then a hiss
    snap: () => makeBuffer(ctx, 0.18, (d, sr, n) => {
      const nw = Math.floor(sr * 0.0006);
      let hp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        let s = i < nw ? 1 - (2 * i) / nw : 0;
        const w = Math.random() * 2 - 1;
        hp += lpCoef(2500, sr) * (w - hp);
        s += (w - hp) * 0.5 * Math.exp(-t * 35);
        d[i] = s;
      }
    }),

    // --- soldiers
    // magazine out, magazine in, bolt release
    'nato.reload': () => makeBuffer(ctx, 1.1, (d, sr) => {
      clack(d, sr, 0.0, { level: 0.6, freq: 1800, decay: 300 });
      clack(d, sr, 0.55, { level: 1, freq: 2200, decay: 250, body: 0.3 });
      clack(d, sr, 0.88, { level: 1, freq: 3200, decay: 350 });
    }),
    // AK: rock the mag out and in, then rack the charging handle back and forward
    'pact.reload': () => makeBuffer(ctx, 1.25, (d, sr) => {
      clack(d, sr, 0.0, { level: 0.7, freq: 1500, decay: 280, body: 0.3 });
      clack(d, sr, 0.5, { level: 1, freq: 1700, decay: 220, body: 0.5 });
      clack(d, sr, 0.95, { level: 0.8, freq: 2600, decay: 300 });
      clack(d, sr, 1.06, { level: 1, freq: 2300, decay: 300, body: 0.3 });
    }),
    death: () => makeBuffer(ctx, 0.5, (d, sr, n) => {  // a body hitting the ground, gear rattling
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        lp += lpCoef(400, sr) * (Math.random() * 2 - 1 - lp);
        d[i] = lp * 3 * Math.exp(-t * 18) + Math.sin(TAU * 70 * t) * Math.exp(-t * 25) * 0.6;
      }
      clack(d, sr, 0.05, { level: 0.25, freq: 2000, decay: 200 });
    }),
    'nato.radio': () => radio(ctx, { beep: 0.06, beepF: 1200, hissF: 2000 }),
    'pact.radio': () => radio(ctx, { beep: 0.1, beepF: 800, hissF: 1500 }),
    // objective taken / a new offensive: a longer transmission with a double tone
    'nato.horn': () => radio(ctx, { dur: 0.7, beep: 0.4, beepF: 1200, hissF: 2000 }),
    'pact.horn': () => radio(ctx, { dur: 0.8, beep: 0.5, beepF: 700, hissF: 1500 }),


    // --- far away: what's left of a shot after a kilometre of hills — a dull thump and a
    // long rolling echo (AudioSystem switches to these beyond ~110 m)
    'nato.rifle.far': () => gunshot(ctx, { dur: 1.6, crack: 0.05, crackDecay: 500, body: 0.6, bodyLP: 650, bodyDecay: 18, thump: 0.7, thumpF: 95, tail: 0.6, tailLP: 380, tailDecay: 2.3 }),
    'pact.rifle.far': () => gunshot(ctx, { dur: 1.6, crack: 0.05, crackDecay: 500, body: 0.65, bodyLP: 600, bodyDecay: 17, thump: 0.75, thumpF: 88, bark: 0.25, barkF: 600, tail: 0.6, tailLP: 350, tailDecay: 2.2 }),
    'nato.mg.far': () => gunshot(ctx, { dur: 1.3, crack: 0.05, crackDecay: 500, body: 0.7, bodyLP: 550, bodyDecay: 18, thump: 0.9, thumpF: 75, tail: 0.5, tailLP: 320, tailDecay: 2.6 }),
    'pact.mg.far': () => gunshot(ctx, { dur: 1.3, crack: 0.05, crackDecay: 500, body: 0.75, bodyLP: 500, bodyDecay: 17, thump: 0.95, thumpF: 70, tail: 0.5, tailLP: 300, tailDecay: 2.6 }),
    'nato.cannon.far': () => gunshot(ctx, { dur: 4, crack: 0.03, crackDecay: 300, body: 1, bodyLP: 300, bodyDecay: 5, thump: 1.6, thumpF: 34, tail: 1.1, tailLP: 170, tailDecay: 0.9, drive: 2 }),
    'pact.cannon.far': () => gunshot(ctx, { dur: 4, crack: 0.03, crackDecay: 300, body: 1, bodyLP: 280, bodyDecay: 5, thump: 1.6, thumpF: 31, tail: 1.1, tailLP: 160, tailDecay: 0.9, drive: 2 }),
    'nato.arty.far': () => gunshot(ctx, { dur: 4.5, crack: 0.02, crackDecay: 250, body: 1, bodyLP: 240, bodyDecay: 4, thump: 1.7, thumpF: 28, tail: 1.2, tailLP: 140, tailDecay: 0.7, drive: 2 }),
    'pact.arty.far': () => gunshot(ctx, { dur: 4.5, crack: 0.02, crackDecay: 250, body: 1, bodyLP: 260, bodyDecay: 4, thump: 1.7, thumpF: 30, tail: 1.2, tailLP: 150, tailDecay: 0.7, drive: 2 }),
    'explosion.far': () => blast(ctx, { dur: 4, thumpF: 30, rumble: 1.3, rumbleDecay: 0.9, debris: 0, crack: 0.05, lp: 300 }),
    'explosion.big.far': () => blast(ctx, { dur: 5, thumpF: 26, rumble: 1.5, rumbleDecay: 0.7, debris: 0, crack: 0.05, lp: 260 }),

    // --- machines (looped; AudioSystem drives rate and level from speed and turret motion)
    'engine.diesel': () => diesel(ctx, { fire: 24, growl: 0.55, rough: 0.55 }),
    'engine.dieselSmall': () => diesel(ctx, { fire: 30, growl: 0.4, rough: 0.4 }),
    'engine.turbine': () => turbine(ctx, {}),
    'tracks.heavy': () => tracks(ctx, { clanks: 8, squeal: 0.35 }),
    'tracks.light': () => tracks(ctx, { clanks: 10, squeal: 0.2 }),
    traverse: () => traverse(ctx, { f: 420 }),

    // --- SP anti-aircraft guns: one round each, fired 14 times a second it becomes the burst
    'nato.aa': () => gunshot(ctx, { dur: 0.45, crack: 1.1, crackDecay: 900, body: 0.8, bodyLP: 1800, bodyDecay: 34, thump: 0.8, thumpF: 90, tail: 0.18, tailLP: 450, tailDecay: 5, drive: 2 }),   // M61 Vulcan
    'pact.aa': () => gunshot(ctx, { dur: 0.5, crack: 1, crackDecay: 800, body: 0.9, bodyLP: 1500, bodyDecay: 30, thump: 0.9, thumpF: 78, bark: 0.35, barkF: 650, tail: 0.2, tailLP: 420, tailDecay: 5, drive: 2.2 }), // 2A7 23 mm
    'nato.aa.far': () => gunshot(ctx, { dur: 1.2, crack: 0.05, crackDecay: 500, body: 0.7, bodyLP: 550, bodyDecay: 18, thump: 0.9, thumpF: 72, tail: 0.5, tailLP: 320, tailDecay: 2.6 }),
    'pact.aa.far': () => gunshot(ctx, { dur: 1.2, crack: 0.05, crackDecay: 500, body: 0.75, bodyLP: 500, bodyDecay: 17, thump: 0.95, thumpF: 68, tail: 0.5, tailLP: 300, tailDecay: 2.6 }),

    // --- IFV autocannons
    'nato.autocannon': () => gunshot(ctx, { dur: 0.8, crack: 1.1, crackDecay: 700, body: 1, bodyLP: 1300, bodyDecay: 24, thump: 1.1, thumpF: 70, tail: 0.3, tailLP: 380, tailDecay: 3.5, drive: 2 }),   // M242 25 mm
    'pact.autocannon': () => gunshot(ctx, { dur: 0.9, crack: 1.1, crackDecay: 650, body: 1.1, bodyLP: 1150, bodyDecay: 22, thump: 1.2, thumpF: 62, bark: 0.3, barkF: 600, tail: 0.32, tailLP: 350, tailDecay: 3.3, drive: 2.2 }), // 2A42 30 mm
    'nato.autocannon.far': () => gunshot(ctx, { dur: 1.4, crack: 0.04, crackDecay: 500, body: 0.8, bodyLP: 450, bodyDecay: 15, thump: 1, thumpF: 60, tail: 0.6, tailLP: 280, tailDecay: 2.2 }),
    'pact.autocannon.far': () => gunshot(ctx, { dur: 1.4, crack: 0.04, crackDecay: 500, body: 0.85, bodyLP: 420, bodyDecay: 14, thump: 1.05, thumpF: 55, tail: 0.6, tailLP: 260, tailDecay: 2.2 }),

    // --- mortars and smoke
    'nato.mortar': () => gunshot(ctx, { dur: 1.4, crack: 0.3, crackDecay: 400, body: 1, bodyLP: 520, bodyDecay: 12, thump: 1.5, thumpF: 55, tail: 0.45, tailLP: 300, tailDecay: 2.5, drive: 1.8 }),
    'pact.mortar': () => gunshot(ctx, { dur: 1.4, crack: 0.3, crackDecay: 380, body: 1, bodyLP: 480, bodyDecay: 11, thump: 1.6, thumpF: 50, tail: 0.45, tailLP: 280, tailDecay: 2.4, drive: 1.9 }),
    'smoke.pop': () => blast(ctx, { dur: 1.4, thumpF: 70, rumble: 0.2, rumbleDecay: 3, debris: 0, crack: 0.5, lp: 1400 }),

    // --- attack helicopters (systems/AirStrike.js)
    'rotor.cobra': () => rotor(ctx, { bladeHz: 11, thumpF: 62, slap: 1.2, whineHz: 1350, whine: 0.06 }),   // two blades: deep whop
    'rotor.hind': () => rotor(ctx, { bladeHz: 20, thumpF: 80, slap: 0.75, whineHz: 1100, whine: 0.09 }),   // five blades, twin turbines
    'heli.m197': () => gunshot(ctx, { dur: 0.7, crack: 1.1, crackDecay: 700, body: 1, bodyLP: 1400, bodyDecay: 26, thump: 1, thumpF: 72, tail: 0.25, tailLP: 400, tailDecay: 4, drive: 2 }),
    'heli.yakb': () => gunshot(ctx, { dur: 0.6, crack: 1.1, crackDecay: 800, body: 0.9, bodyLP: 1600, bodyDecay: 30, thump: 0.9, thumpF: 85, bark: 0.4, barkF: 700, tail: 0.22, tailLP: 420, tailDecay: 4, drive: 2.1 }),
    'heli.rocket': () => rocket(ctx, { boom: 0.45, thumpF: 95, motor: 1.1, motorDur: 0.7, dur: 1.2 }),
    'rotor.uh60': () => rotor(ctx, { bladeHz: 17, thumpF: 70, slap: 0.9, whineHz: 1500, whine: 0.07 }),     // four blades
    'rotor.mi8': () => rotor(ctx, { bladeHz: 16, thumpF: 58, slap: 0.85, whineHz: 950, whine: 0.1 }),      // five big blades, slow
    // ground-attack jets: the gun is one long tearing burp, not single shots
    'jet.gau8': () => brrrt(ctx, { hz: 65, dur: 1.6, lp: 900, thumpF: 48 }),   // GAU-8: the "BRRRT"
    'jet.gsh30': () => brrrt(ctx, { hz: 50, dur: 1.4, lp: 1100, thumpF: 56 }), // GSh-30-2
    'jet.missile': () => rocket(ctx, { boom: 0.3, thumpF: 80, motor: 1.4, motorDur: 1.1, dur: 1.6 }),

    // --- rocket artillery and SAMs: a launch per rocket; a salvo is a ripple of these
    'nato.mlrs': () => rocket(ctx, { boom: 0.9, thumpF: 60, motor: 1.5, motorDur: 1.3, dur: 2.2 }),
    'pact.mlrs': () => rocket(ctx, { boom: 0.8, thumpF: 70, motor: 1.3, motorDur: 1.0, dur: 1.9 }),
    'nato.sam': () => rocket(ctx, { boom: 0.6, thumpF: 75, motor: 1.6, motorDur: 1.6, dur: 2.2 }),
    'pact.sam': () => rocket(ctx, { boom: 0.55, thumpF: 80, motor: 1.5, motorDur: 1.4, dur: 2.0 }),

    // --- ambience and foley
    crow: () => crow(ctx),
    birds: () => birds(ctx),
    'step.0': () => step(ctx, { thud: 1, rustle: 0.25 }),                       // grass
    'step.1': () => step(ctx, { thud: 0.8, thudLP: 320, rustle: 0.4, rustleHP: 2200 }), // long grass
    'step.2': () => step(ctx, { thud: 0.9, rustle: 0.15, grit: 0.5 }),          // soil and stones
    'step.3': () => step(ctx, { thud: 1.1, thudLP: 200, rustle: 0.1, dur: 0.16 }), // soft earth

    // --- player & UI
    ready: () => makeBuffer(ctx, 0.12, (d, sr) => clack(d, sr, 0, { level: 1, freq: 3000, decay: 400 })),
    hurt: () => makeBuffer(ctx, 0.35, (d, sr, n) => {
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        lp += lpCoef(400, sr) * (Math.random() * 2 - 1 - lp);
        d[i] = lp * Math.exp(-t * 12) + Math.sin(TAU * 55 * t * (1 - t * 2)) * Math.exp(-t * 28);
      }
    }),
    click: () => makeBuffer(ctx, 0.04, (d, sr) => clack(d, sr, 0, { level: 1, freq: 2800, decay: 900 })),
    order: () => radio(ctx, { dur: 0.2, beep: 0.03, beepF: 1300, hissF: 2200 }),
    whoosh: () => makeBuffer(ctx, 0.7, (d, sr, n) => {
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const k = t / 0.7;
        lp += lpCoef(300 + 2200 * Math.sin(Math.PI * k), sr) * (Math.random() * 2 - 1 - lp);
        d[i] = lp * Math.sin(Math.PI * k);
      }
    }),
    wind: () => wind(ctx, 8),

    // --- the war around the map (systems/Ambience.js) and the weather
    jet: () => makeBuffer(ctx, 3, (d, sr, n) => {        // a low jet: turbine roar, rumble, a thin whine
      let lp = 0;
      let low = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const w = Math.random() * 2 - 1;
        lp += lpCoef(1100, sr) * (w - lp);
        low += lpCoef(110, sr) * (w - low);
        const whine = Math.sin(TAU * (2900 + 40 * Math.sin(TAU * 0.5 * t)) * t) * 0.05;
        const buzz = Math.sin(TAU * 185 * t) * 0.08 + Math.sin(TAU * 370 * t) * 0.04;
        d[i] = Math.tanh((lp * 1.6 + low * 3 + whine + buzz) * 1.3);
      }
      loopify(d, sr, n, 0.08);
    }),
    rain: () => makeBuffer(ctx, 4, (d, sr, n) => {       // steady hiss with drops ticking on helmets and leaves
      let lp = 0;
      let hp = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        lp += lpCoef(5200, sr) * (w - lp);
        hp += lpCoef(900, sr) * (lp - hp);
        d[i] = (lp - hp) * 0.5;
      }
      for (let k = 0; k < 260; k++) {                     // individual drops
        const at = Math.floor(Math.random() * (n - sr * 0.02));
        const f = 1800 + Math.random() * 3000;
        const a = 0.15 + Math.random() * 0.5;
        for (let j = 0; j < sr * 0.012; j++) d[at + j] += Math.sin(TAU * f * (j / sr)) * Math.exp(-j / (sr * 0.002)) * a;
      }
      loopify(d, sr, n, 0.1);
    }),
    'flare.pop': () => makeBuffer(ctx, 1.2, (d, sr, n) => { // illumination round bursting overhead, then the hiss of the burn
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const w = Math.random() * 2 - 1;
        lp += lpCoef(t < 0.05 ? 3000 : 1400, sr) * (w - lp);
        d[i] = lp * (t < 0.05 ? 1.5 : 0.25 * Math.exp(-(t - 0.05) * 1.5)) + Math.sin(TAU * 90 * t) * Math.exp(-t * 30) * 0.8;
      }
    }),
    // the rest of the front: far guns thudding and rolling, MG fire too far to make out (a loop)
    'battle.bed': () => makeBuffer(ctx, 12, (d, sr, n) => {
      let lp = 0;
      for (let i = 0; i < n; i++) {               // the low roll of it all
        lp += lpCoef(70, sr) * (Math.random() * 2 - 1 - lp);
        d[i] = lp * 2;
      }
      for (let k = 0; k < 34; k++) {              // single far thumps, each with its long roll
        const at = Math.floor(Math.random() * (n - sr * 2.5));
        const f = 28 + Math.random() * 26;
        const a = 0.3 + Math.random() * 0.7;
        let r = 0;
        for (let j = 0; j < sr * 2.5; j++) {
          const t = j / sr;
          r += lpCoef(160, sr) * (Math.random() * 2 - 1 - r);
          d[at + j] += (Math.sin(TAU * f * t) * Math.exp(-t * 7) + r * 3 * Math.exp(-t * 1.6)) * a * Math.min(1, t / 0.02);
        }
      }
      for (let k = 0; k < 7; k++) {               // a burst of something automatic, far off
        const at = Math.floor(Math.random() * (n - sr * 3));
        const rate = 7 + Math.random() * 5;
        let m = 0;
        for (let j = 0; j < sr * (0.8 + Math.random() * 1.5); j++) {
          const t = j / sr;
          m += lpCoef(380, sr) * (Math.random() * 2 - 1 - m);
          d[at + j] += m * Math.exp(-((t * rate) % 1) * 9) * 0.9;
        }
      }
      loopify(d, sr, n, 0.5);
    }),
    // a grass fire: a low roar with sharp crackles and pops (a loop)
    fire: () => makeBuffer(ctx, 4, (d, sr, n) => {
      let lp = 0;
      for (let i = 0; i < n; i++) {
        lp += lpCoef(500, sr) * (Math.random() * 2 - 1 - lp);
        d[i] = lp * 1.6;
      }
      for (let k = 0; k < 420; k++) {
        const at = Math.floor(Math.random() * (n - sr * 0.01));
        const a = Math.random() ** 3 * 1.4;
        for (let j = 0; j < sr * 0.006; j++) d[at + j] += (Math.random() * 2 - 1) * Math.exp(-j / (sr * 0.0012)) * a;
      }
      loopify(d, sr, n, 0.1);
    }),
    // breathing through a gas mask: a rasping intake through the filter, the valve, a slow exhale
    breath: () => makeBuffer(ctx, 3.6, (d, sr, n) => {
      const inhale = bandpass(1100, 2.5, sr);
      const exhale = bandpass(520, 2, sr);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const w = Math.random() * 2 - 1;
        const a = t < 1.2 ? Math.sin(Math.PI * t / 1.2) ** 1.5 : 0;
        const b = t > 1.5 && t < 3.1 ? Math.sin(Math.PI * (t - 1.5) / 1.6) ** 2 : 0;
        d[i] = inhale(w) * a * 0.9 + exhale(w) * b * 0.6;
        const v = t - 1.32; // the exhale valve clicking open
        if (v > 0 && v < 0.03) d[i] += Math.sin(TAU * 900 * v) * Math.exp(-v * 180) * 0.5;
      }
      loopify(d, sr, n, 0.15);
    }),
  };
}
