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
import midway from './midway.ts';
import savoSound from './savoSound.ts';
import surigaoStrait from './surigaoStrait.ts';
import philippineSea from './philippineSea.ts';
import norwegianSea from './norwegianSea.ts';
import northCape from './northCape.ts';
import ionianSea from './ionianSea.ts';
import trafalgar from './trafalgar.ts';
import aboukir from './aboukir.ts';
import brest from './brest.ts';
import caribbean from './caribbean.ts';
import balticSea from './balticSea.ts';
import omaha from './omaha.ts';
import hohwacht from './hohwacht.ts';
import aboukirLanding from './aboukirLanding.ts';

export const MAPS = {
  [omaha.id]: omaha,
  [hohwacht.id]: hohwacht,
  [aboukirLanding.id]: aboukirLanding,
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
  [midway.id]: midway,
  [savoSound.id]: savoSound,
  [surigaoStrait.id]: surigaoStrait,
  [norwegianSea.id]: norwegianSea,
  [northCape.id]: northCape,
  [ionianSea.id]: ionianSea,
  [trafalgar.id]: trafalgar,
  [aboukir.id]: aboukir,
  [brest.id]: brest,
  [caribbean.id]: caribbean,
  [balticSea.id]: balticSea,
  [philippineSea.id]: philippineSea,
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

/**
 * Where the battle is fought (the menu's second picker, under the years): on land, at sea — and,
 * later, on a coast (landings: land and sea together). A map's `theatre` (land unless it says).
 */
export const THEATRES = [{ id: 'land', name: 'Land' }, { id: 'sea', name: 'Sea' }, { id: 'coastal', name: 'Coastal' }];
let theatreNow = 'land';
export const theatre = () => theatreNow;
export function setTheatre(id) { theatreNow = THEATRES.some((t) => t.id === id && !t.soon) ? id : 'land'; }
/** Does year `ep` have any map in theatre `th`? (the picker greys out the empty ones) */
export const hasTheatre = (ep, th) => Object.values(MAPS).some((m) => !m.wip && (m.theatre ?? 'land') === th && (!m.epochs || m.epochs.includes(ep)));

/** The maps an epoch can fight on (a map's `epochs` limits it, e.g. Jena is 1806 only) in the chosen theatre, its own maps first. */
export function mapsFor(ep, th = theatreNow) {
  if (!hasTheatre(ep, th)) th = 'land'; // (a year with no sea yet: its land)
  const all = Object.values(MAPS).filter((m) => !m.wip && (m.theatre ?? 'land') === th && (!m.epochs || m.epochs.includes(ep))); // (wip: not offered yet)
  return [...all.filter((m) => m.epochs), ...all.filter((m) => !m.epochs)];
}

/** `id` if `ep` has that map, else the epoch's first map. */
export const mapIn = (id, ep) => (mapsFor(ep).some((m) => m.id === id) ? id : mapsFor(ep)[0].id);
