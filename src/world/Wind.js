// The wind over the battlefield: one vector (m/s, the way it blows — smoke drifts with it) for drifting
// smoke screens, dust and rain, and at sea for the sails (entities/sailing.js). It veers slowly as a
// function of the battle clock — so a multiplayer host and client agree without sending it — and blows
// harder in bad weather. A map can set its own (`wind`: { from, speed, veer }): the sea's real wind,
// the westerly off Trafalgar, rather than the light airs over a land battle.
const STRENGTH = { clear: 1.1, overcast: 1.8, rain: 2.8, fog: 0.35 }; // m/s
const HEADING = 0.37; // radians from +x: mostly west → east, toward the Pact side

export const wind = { x: 1, z: 0.4, speed: 1.1 };

let base = null; // a map's own: { to (radians from +x, the way it blows), speed (m/s), veer (radians it swings either way) }

/** A map's own wind (or null: the land's light airs). `from`: the compass bearing it blows from, in degrees (0 = from the north, −z). */
export function setWind(w) {
  const to = (from) => Math.atan2(Math.cos((from * Math.PI) / 180), -Math.sin((from * Math.PI) / 180));
  base = w ? { to: to(w.from), speed: w.speed ?? 7, veer: w.veer ?? 0.35, lulls: !!w.lulls, shift: w.shift ? { t: w.shift.t, to: to(w.shift.from), over: w.shift.over ?? 60 } : null } : null; // (shift: at t it swings round to blow from `shift.from`, over `over` s — Zeebrugge's)
}

export function updateWind(t, weather) {
  if (base) { // the sea's wind: steady, a slow veer and gusts
    const sk = base.shift ? Math.min(1, Math.max(0, (t - base.shift.t) / base.shift.over)) : 0;
    const a = base.to + Math.atan2(Math.sin((base.shift?.to ?? base.to) - base.to), Math.cos((base.shift?.to ?? base.to) - base.to)) * sk + base.veer * Math.sin(t / 260) + base.veer * 0.3 * Math.sin(t / 61);
    const k = weather === 'rain' ? 1.6 : weather === 'fog' ? 0.45 : weather === 'overcast' ? 1.15 : 1;
    const lull = base.lulls ? 0.12 + 0.88 * Math.min(1, Math.max(0, (Math.sin(t / 150 + 1) + 0.5 * Math.sin(t / 47)) * 0.9 + 0.55)) : 1; // (the trades fall away to a calm now and then: sail drifts, oars row)
    wind.speed = base.speed * k * lull * (0.88 + 0.12 * Math.sin(t / 37) + 0.05 * Math.sin(t / 9));
    wind.x = Math.cos(a) * wind.speed;
    wind.z = Math.sin(a) * wind.speed;
    return;
  }
  const a = HEADING + 0.7 * Math.sin(t / 190) + 0.25 * Math.sin(t / 47);
  wind.speed = (STRENGTH[weather] ?? STRENGTH.clear) * (0.85 + 0.25 * Math.sin(t / 71));
  wind.x = Math.cos(a) * wind.speed;
  wind.z = Math.sin(a) * wind.speed;
}
