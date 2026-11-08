// Map registry. Add a map file shaped like fuldaGap.js and register it here;
// load it with ?map=<id>.
import fuldaGap from './fuldaGap.ts';
import werraValley from './werraValley.ts';
import hauneFulda from './hauneFulda.ts';
import huenfeld from './huenfeld.ts';
import thuringianForest from './thuringianForest.ts';
import hersfeldAirbase from './hersfeldAirbase.ts';
import monteKali from './monteKali.ts';
import jena from './jena.ts';
import auerstedt from './auerstedt.ts';
import stalingrad from './stalingrad.ts';
import elAlamein from './elAlamein.ts';

export const MAPS = {
  [fuldaGap.id]: fuldaGap,
  [werraValley.id]: werraValley,
  [hauneFulda.id]: hauneFulda,
  [huenfeld.id]: huenfeld,
  [thuringianForest.id]: thuringianForest,
  [hersfeldAirbase.id]: hersfeldAirbase,
  [monteKali.id]: monteKali,
  [jena.id]: jena,
  [auerstedt.id]: auerstedt,
  [stalingrad.id]: stalingrad,
  [elAlamein.id]: elAlamein,
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
    const w = year !== '1985' ? m.ww2 : null; // (no inner-German border before 1945 either)
    m.description = w?.description ?? m.base.description;
    for (const p of m.points ?? []) p.name = w?.points?.[p.id] ?? m.base.points[p.id];
  }
}

export function getMap(id) {
  return MAPS[id] ?? MAPS[DEFAULT_MAP];
}

/** The maps an epoch can fight on (a map's `epochs` limits it, e.g. Jena is 1806 only), its own maps first. */
export function mapsFor(ep) {
  const all = Object.values(MAPS).filter((m) => !m.epochs || m.epochs.includes(ep));
  return [...all.filter((m) => m.epochs), ...all.filter((m) => !m.epochs)];
}

/** `id` if `ep` has that map, else the epoch's first map. */
export const mapIn = (id, ep) => (mapsFor(ep).some((m) => m.id === id) ? id : mapsFor(ep)[0].id);
