// Map registry. Add a map file shaped like fuldaGap.js and register it here;
// load it with ?map=<id>.
import fuldaGap from './fuldaGap.ts';
import werraValley from './werraValley.ts';
import hauneFulda from './hauneFulda.ts';
import huenfeld from './huenfeld.ts';
import thuringianForest from './thuringianForest.ts';
import hersfeldAirbase from './hersfeldAirbase.ts';
import monteKali from './monteKali.ts';

export const MAPS = {
  [fuldaGap.id]: fuldaGap,
  [werraValley.id]: werraValley,
  [hauneFulda.id]: hauneFulda,
  [huenfeld.id]: huenfeld,
  [thuringianForest.id]: thuringianForest,
  [hersfeldAirbase.id]: hersfeldAirbase,
  [monteKali.id]: monteKali,
};

export const DEFAULT_MAP = fuldaGap.id;

/**
 * The maps as `year` has them (data/epoch.js): a map's `ww2` gives 1945 its own description and
 * point names (no inner-German border, no Point Alpha). Called once the year is set (main.js).
 */
export function forEpoch(year) {
  for (const m of Object.values(MAPS)) {
    if (!m.ww2) continue;
    m.base ??= { description: m.description, points: Object.fromEntries((m.points ?? []).map((p) => [p.id, p.name])) };
    const w = year === '1945' ? m.ww2 : null;
    m.description = w?.description ?? m.base.description;
    for (const p of m.points ?? []) p.name = w?.points?.[p.id] ?? m.base.points[p.id];
  }
}

export function getMap(id) {
  return MAPS[id] ?? MAPS[DEFAULT_MAP];
}
