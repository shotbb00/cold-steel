// Time of day and weather for a battle, picked in the menu (or a mode / the campaign):
//   time:    day · dawn · dusk · night
//   weather: clear · overcast · rain · fog
// apply() turns the map's own theme (an overcast afternoon) into the chosen light and sky, and
// the result carries what the battle needs to know:
//   sightFor(stats, faction, lit)  spotting range factor (VisibilitySystem, FogOfWar): low sun
//            and weather shorten it; at night everyone is half-blind except thermal sights
//            (stats.nightSight per faction — the Abrams and Bradley see almost as by day, the
//            Pact's infrared much less); a target under a flare (lit) is seen as by day
//   mud      speed factors in the rain (vehicles bog down, men slog)
//   rain, night, clock (battle start, minutes after midnight, for the radio log)
const mix = (a, b, k) => {
  const ca = [(a >> 16) & 255, (a >> 8) & 255, a & 255];
  const cb = [(b >> 16) & 255, (b >> 8) & 255, b & 255];
  return ca.reduce((n, v, i) => (n << 8) | Math.round(v + (cb[i] - v) * k), 0);
};
const scale = (c, k) => mix(0, c, k);

export const TIMES = {
  day: { name: 'Day', clock: 14 * 60 },
  dawn: { name: 'Dawn', clock: 5 * 60 + 50 },
  dusk: { name: 'Dusk', clock: 17 * 60 + 35 },
  night: { name: 'Night', clock: 23 * 60 + 20 },
};
export const WEATHER = {
  clear: { name: 'Clear' },
  overcast: { name: 'Overcast' },
  rain: { name: 'Rain' },
  fog: { name: 'Fog' },
};
export const DEFAULT_CONDITIONS = { time: 'day', weather: 'overcast' };

const NIGHT_SIGHT = 0.45;   // without night sights

export function applyConditions(base, { time = 'day', weather = 'overcast' } = {}) {
  const t = { ...base, terrain: base.terrain };
  let sight = 1;
  let night = false;
  // ---- light
  if (time === 'dawn' || time === 'dusk') {
    const dawn = time === 'dawn';
    Object.assign(t, {
      sunDir: dawn ? [0.85, 0.16, -0.35] : [-0.85, 0.14, 0.3],
      sunColor: dawn ? 0xffb889 : 0xff9b62,
      sunIntensity: base.sunIntensity * 0.75,
      sunDisk: 0.55,
      skyTop: dawn ? 0x4b5a78 : 0x3e4466,
      skyHorizon: dawn ? 0xe6ab82 : 0xd78664,
      skyBottom: scale(base.skyBottom, 0.6),
      fogColor: dawn ? 0xa8968a : 0x8e7672,
      hemiSky: dawn ? 0xb4b4c4 : 0xa8a0b4,
      hemiGround: scale(base.hemiGround, 0.7),
      hemiIntensity: base.hemiIntensity * 0.7,
      cloudLight: dawn ? 0xe8bca0 : 0xd8987c,
      cloudDark: dawn ? 0x6a6470 : 0x584a5a,
      exposure: 1.3,
      clouds: Math.min(base.clouds ?? 0.6, 0.6),
    });
    sight = 0.8;
  } else if (time === 'night') {
    Object.assign(t, {
      // a bright moon: dark and blue, but the ground, the trees and the houses still read —
      // the darkness is in what your men can't see (shorter sight), not in the picture
      sunDir: [0.35, 0.6, 0.45],   // the moon
      sunColor: 0xa9c0ec,
      sunIntensity: 1.0,
      sunDisk: 0.15,
      skyTop: 0x0d1424,
      skyHorizon: 0x2c3a54,
      skyBottom: 0x0c0e14,
      fogColor: 0x263246,
      hemiSky: 0x6a80a8,
      hemiGround: 0x22242c,
      hemiIntensity: 1.15,
      rimColor: 0x7c8cc0,
      rimIntensity: 0.3,
      cloudLight: 0x3a4660,
      cloudDark: 0x141a26,
      clouds: Math.min(base.clouds ?? 0.6, 0.5),
      stars: true,
      exposure: 1.6,
    });
    night = true;
  }
  // ---- weather
  if (weather === 'clear') {
    Object.assign(t, { clouds: 0.3, sunDisk: Math.max(t.sunDisk ?? 0.1, 0.7), fogDensity: base.fogDensity * 0.65, sunIntensity: t.sunIntensity * 1.15 });
    sight *= 1.1;
  } else if (weather === 'rain') {
    Object.assign(t, {
      clouds: 1, sunDisk: 0, sunIntensity: t.sunIntensity * 0.6, hemiIntensity: t.hemiIntensity * 0.85,
      fogDensity: base.fogDensity * 1.6, fogColor: scale(t.fogColor, 0.82),
      skyTop: scale(t.skyTop, 0.75), skyHorizon: scale(t.skyHorizon, 0.8), cloudLight: scale(t.cloudLight ?? 0xc0c0c0, 0.72), cloudDark: scale(t.cloudDark ?? 0x707070, 0.7),
    });
    sight *= 0.75;
  } else if (weather === 'fog') {
    Object.assign(t, {
      // thick, but capped: from the command camera (~110 m up) about half the ground still shows
      clouds: 1, sunDisk: 0, fogDensity: Math.min(base.fogDensity * 3.4, 0.0075), fogColor: night ? 0x2a3546 : mix(t.fogColor, 0xc4c8c6, 0.4),
      skyHorizon: night ? t.skyHorizon : mix(t.skyHorizon, 0xc4c8c6, 0.5), sunIntensity: t.sunIntensity * 0.8,
    });
    sight *= 0.5;
  }
  const weatherSight = weather === 'clear' ? 1.1 : weather === 'rain' ? 0.75 : weather === 'fog' ? 0.5 : 1;
  return {
    time,
    weather,
    theme: t,
    night,
    rain: weather === 'rain',
    clock: TIMES[time]?.clock ?? TIMES.day.clock,
    mud: weather === 'rain' ? { vehicle: 0.78, infantry: 0.92 } : null,
    /** Spotting range factor for a spotter with `stats` of `faction` (lit: the target is under a flare). */
    sightFor(stats, faction, lit = false) {
      if (!night || lit) return night ? weatherSight : sight;
      const ns = stats.nightSight;
      const k = typeof ns === 'object' ? ns[faction] ?? NIGHT_SIGHT : ns ?? NIGHT_SIGHT;
      return k * weatherSight;
    },
  };
}
