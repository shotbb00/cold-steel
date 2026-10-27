// Map registry. Add a map file shaped like fuldaGap.js and register it here;
// load it with ?map=<id>.
import fuldaGap from './fuldaGap.ts';
import werraValley from './werraValley.ts';
import huenfeld from './huenfeld.ts';
import thuringianForest from './thuringianForest.ts';
import hersfeldAirbase from './hersfeldAirbase.ts';
import monteKali from './monteKali.ts';

export const MAPS = {
  [fuldaGap.id]: fuldaGap,
  [werraValley.id]: werraValley,
  [huenfeld.id]: huenfeld,
  [thuringianForest.id]: thuringianForest,
  [hersfeldAirbase.id]: hersfeldAirbase,
  [monteKali.id]: monteKali,
};

export const DEFAULT_MAP = fuldaGap.id;

export function getMap(id) {
  return MAPS[id] ?? MAPS[DEFAULT_MAP];
}
