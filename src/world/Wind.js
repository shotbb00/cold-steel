// The wind over the battlefield: one vector (m/s) for drifting smoke screens, gas, dust and
// rain. It veers slowly as a function of the battle clock — so a multiplayer host and client
// agree without sending it — and blows harder in bad weather.
const STRENGTH = { clear: 1.1, overcast: 1.8, rain: 2.8, fog: 0.35 }; // m/s
const HEADING = 0.37; // radians from +x: mostly west → east, toward the Pact side

export const wind = { x: 1, z: 0.4, speed: 1.1 };

export function updateWind(t, weather) {
  const a = HEADING + 0.7 * Math.sin(t / 190) + 0.25 * Math.sin(t / 47);
  wind.speed = (STRENGTH[weather] ?? STRENGTH.clear) * (0.85 + 0.25 * Math.sin(t / 71));
  wind.x = Math.cos(a) * wind.speed;
  wind.z = Math.sin(a) * wind.speed;
}
