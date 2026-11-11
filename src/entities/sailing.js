// Under sail (1806 ships, `stats.sail`): the wind drives her, and how well depends on where it comes from.
// A square-rigger can't sail closer than NO_GO to the wind (about 60°): head to wind she loses her way
// ("in irons") and only drifts round. Reaching across it she is fast; best with it on her quarter; dead
// before it a little slower (the after sails blanket the fore). The wind is world/Wind.js (the map's).
// A goal to windward is reached by tacking: close-hauled on one tack, then over onto the other when that
// one points closer to the goal (UnitStack.driveAlongHull asks sailCourse for her heading).
import { wind } from '../world/Wind.js';

export const NO_GO = (60 * Math.PI) / 180;   // radians off the wind she can't sail inside
const CLOSE = NO_GO + 0.1;                   // close-hauled: as near the wind as she sails well
const FLIP = 0.45;                           // radians the other tack must gain on this one before she goes about
const BEST_WIND = 7;                         // m/s: the breeze her speed is rated for (a fresh breeze)

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
/** The heading the wind comes from (the game's heading: atan2(x, z), as u.yaw). */
export const windFrom = () => Math.atan2(-wind.x, -wind.z);

/** How far off the wind a heading is, signed: + the wind on her starboard bow side, − on her port side. 0 = head to wind, ±π = dead before it. */
export const offWind = (yaw) => wrap(windFrom() - yaw);

/**
 * Her speed under sail as a share of her best, at heading `yaw`: nothing worth having inside NO_GO (she
 * drifts, a tenth), rising to the most with the wind on her quarter (≈120° off), a little less dead before it.
 * The breeze scales it (a calm all but stops her; a gale gives her more, up to 1.3).
 */
export function sailFactor(yaw) {
  const b = Math.abs(offWind(yaw));
  let k;
  if (b < NO_GO) k = 0.1;
  else if (b < Math.PI / 2) k = 0.45 + 0.4 * ((b - NO_GO) / (Math.PI / 2 - NO_GO));          // close-hauled 0.45 → abeam 0.85
  else if (b < (2 * Math.PI) / 3) k = 0.85 + 0.15 * ((b - Math.PI / 2) / (Math.PI / 6));     // abeam → on the quarter 1.0
  else k = 1 - 0.2 * ((b - (2 * Math.PI) / 3) / (Math.PI / 3));                              // → dead before it 0.8
  return k * Math.min(1.3, Math.max(0.05, wind.speed / BEST_WIND));
}

/**
 * The heading to steer for a goal on bearing `want`: straight for it unless that's inside NO_GO — then
 * close-hauled on the tack she's on (u.tack: +1 the wind on her starboard side, −1 on her port), going about
 * onto the other when it points at the goal by FLIP better.
 */
export function sailCourse(u, want) {
  const from = windFrom();
  const off = wrap(from - want);
  if (Math.abs(off) >= CLOSE) { u.tack = Math.sign(off) || u.tack || 1; return want; }
  u.tack ??= Math.sign(off) || 1;
  const on = wrap(from - u.tack * CLOSE), other = wrap(from + u.tack * CLOSE);
  if (Math.abs(wrap(other - want)) + FLIP < Math.abs(wrap(on - want))) { u.tack = -u.tack; return other; }
  return on;
}
