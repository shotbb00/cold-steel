// Map registry. Add a map file shaped like fuldaGap.js and register it here;
// load it with ?map=<id>.
import { epoch, EPOCHS } from '../data/epoch.js';
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
import heligolandBight from './heligolandBight.ts';
import doggerBank from './doggerBank.ts';
import doverStrait from './doverStrait.ts';
import zeebrugge from './zeebrugge.ts';
import balticSea from './balticSea.ts';
import omaha from './omaha.ts';
import iwoJima from './iwoJima.ts';
import elGuettar from './elGuettar.ts';
import kasserinePass from './kasserinePass.ts';
import bobruisk from './bobruisk.ts';
import berlin from './berlin.ts';
import hohwacht from './hohwacht.ts';
import aboukirLanding from './aboukirLanding.ts';
import villersBretonneux from './villersBretonneux.ts';
import leHamel from './leHamel.ts';
import stQuentin from './stQuentin.ts';
import soissons from './soissons.ts';
import suwalkiGap from './suwalkiGap.ts';
import suwalkiTown from './suwalkiTown.ts';
import nemanCrossing from './nemanCrossing.ts';
import augustowCanal from './augustowCanal.ts';
import eastShield from './eastShield.ts';
import biebrzaMarshes from './biebrzaMarshes.ts';
import orzyszBase from './orzyszBase.ts';

import eylau from './eylau.ts';
import friedland from './friedland.ts';
import vimeiro from './vimeiro.ts';
import talavera from './talavera.ts';
import copenhagen from './copenhagen.ts';
import riga from './riga.ts';
import caporetto from './caporetto.ts';
import piave from './piave.ts';
import megiddo from './megiddo.ts';
import gallipoli from './gallipoli.ts';
import otranto from './otranto.ts';
import ardennes from './ardennes.ts';
import bocage from './bocage.ts';
import remagen from './remagen.ts';
import arnhem from './arnhem.ts';
import kohima from './kohima.ts';
import okinawa from './okinawa.ts';
import goldBeach from './goldBeach.ts';
import okinawaLanding from './okinawaLanding.ts';
import finnmark from './finnmark.ts';
import narvik from './narvik.ts';
import korea from './korea.ts';
import andoya from './andoya.ts';
export const MAPS = {
  [andoya.id]: andoya,
  [korea.id]: korea,
  [narvik.id]: narvik,
  [finnmark.id]: finnmark,
  [okinawaLanding.id]: okinawaLanding,
  [goldBeach.id]: goldBeach,
  [okinawa.id]: okinawa,
  [kohima.id]: kohima,
  [arnhem.id]: arnhem,
  [remagen.id]: remagen,
  [bocage.id]: bocage,
  [ardennes.id]: ardennes,
  [otranto.id]: otranto,
  [gallipoli.id]: gallipoli,
  [megiddo.id]: megiddo,
  [piave.id]: piave,
  [caporetto.id]: caporetto,
  [riga.id]: riga,
  [copenhagen.id]: copenhagen,
  [talavera.id]: talavera,
  [vimeiro.id]: vimeiro,
  [friedland.id]: friedland,
  [eylau.id]: eylau,
  [omaha.id]: omaha,
  [iwoJima.id]: iwoJima,
  [elGuettar.id]: elGuettar,
  [kasserinePass.id]: kasserinePass,
  [bobruisk.id]: bobruisk,
  [berlin.id]: berlin,
  [hohwacht.id]: hohwacht,
  [aboukirLanding.id]: aboukirLanding,
  [villersBretonneux.id]: villersBretonneux,
  [leHamel.id]: leHamel,
  [stQuentin.id]: stQuentin,
  [soissons.id]: soissons,
  [suwalkiGap.id]: suwalkiGap,
  [suwalkiTown.id]: suwalkiTown,
  [nemanCrossing.id]: nemanCrossing,
  [augustowCanal.id]: augustowCanal,
  [eastShield.id]: eastShield,
  [biebrzaMarshes.id]: biebrzaMarshes,
  [orzyszBase.id]: orzyszBase,
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
  [heligolandBight.id]: heligolandBight,
  [doggerBank.id]: doggerBank,
  [doverStrait.id]: doverStrait,
  [zeebrugge.id]: zeebrugge,
  [balticSea.id]: balticSea,
  [philippineSea.id]: philippineSea,
};

/**
 * The sea maps twice as wide (tester feedback 2026-11-17: room to manoeuvre — in 1985 the missiles' reach
 * brought the fleets together at once): the area each way doubled, the islands, coasts and objectives where
 * they were, and each side's home — its base, its fleet, its camera, its home point — moved outward with the
 * open sea in between. The terrain's grid and the ship routing grid grow less than the area (memory).
 */
function widenSea(m, k = 2) {
  if (m.widened || m.theatre !== 'sea') return;
  m.widened = true;
  m.size *= k;
  m.segments = Math.round((m.segments ?? 400) * 1.6);
  m.bounds = { x: m.bounds.x * k, z: m.bounds.z * k };
  if (m.navCell) m.navCell = Math.round(m.navCell * 1.5);
  if (m.river?.sea) m.river.size = m.size;
  m.camera = { ...m.camera, maxHeight: (m.camera?.maxHeight ?? 2600) * 1.6, far: (m.camera?.far ?? 9000) * 1.8 };
  const shift = {};
  for (const f of ['nato', 'pact']) {
    const b = m.bases?.[f];
    if (!b) continue;
    shift[f] = { x: b.x * (k - 1), z: b.z * (k - 1) };
    m.bases[f] = { ...b, x: b.x * k, z: b.z * k };
  }
  const move = (p, f) => (shift[f] ? { ...p, x: p.x + shift[f].x, z: p.z + shift[f].z } : p);
  for (const f of ['nato', 'pact']) {
    if (m.spawns?.[f]) m.spawns[f] = m.spawns[f].map((s) => move(s, f));
    if (m.cameraStart?.[f]) m.cameraStart[f] = move(m.cameraStart[f], f);
  }
  if (m.points) m.points = m.points.map((p) => (p.owner ? move(p, p.owner) : p));
}
for (const m of Object.values(MAPS)) widenSea(m);

export const DEFAULT_MAP = fuldaGap.id;

/**
 * The maps as `year` has them (data/epoch.js): a map's `ww2` gives 1945 its own description and
 * point names (no inner-German border, no Point Alpha). Called once the year is set (main.js).
 */
export function forEpoch(year) {
  for (const m of Object.values(MAPS)) {
    if (!m.ww2) continue;
    m.base ??= { description: m.description, points: Object.fromEntries((m.points ?? []).map((p) => [p.id, p.name])) };
    const w = Number(year) < 1985 ? m.ww2 : null; // (no inner-German border before 1945 either)
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
const tabOf = (m) => m.theatre ?? 'land';
/**
 * Inside a theatre, the scenario's region (the menu's row under Land / Sea / Coastal, shown when a year has maps in more
 * than one): Western Europe (unless a map says otherwise), the Eastern Front (Stalingrad), North Africa (El Alamein), Asia & the
 * Pacific (Iwo Jima, Midway — where Japan and the Marines fight: data/factions.js armiesFrom).
 */
export const REGIONS = [
  { id: 'europe', name: 'Western Europe' }, { id: 'north', name: 'Northern Flank' }, { id: 'east', name: 'Eastern Front' }, { id: 'iberia', name: 'Iberia' },
  { id: 'italy', name: 'Italian Front' }, { id: 'med', name: 'Mediterranean' }, { id: 'africa', name: 'North Africa' }, { id: 'middleEast', name: 'Middle East' },
  { id: 'caribbean', name: 'Caribbean' }, { id: 'pacific', name: 'Asia & Pacific' }, { id: 'korea', name: 'Korea' },
];
export const regionOf = (m) => m.region ?? 'europe';
let regionNow = 'europe';
export const region = () => regionNow;
export function setRegion(id) { regionNow = REGIONS.some((r) => r.id === id) ? id : 'europe'; }
/** The regions year `ep` has maps in, in theatre `th` (one: no row to choose from). */
export const regionsFor = (ep, th) => REGIONS.map((r) => ({ ...r, name: EPOCHS[ep]?.regions?.[r.id]?.[th]?.name ?? EPOCHS[ep]?.regions?.[r.id]?.name ?? r.name })) // (a region's name at sea may be its own: 1806's Germany is European waters).filter((r) => Object.values(MAPS).some((m) => !m.wip && tabOf(m) === th && regionOf(m) === r.id && (m.epochs ? m.epochs.includes(ep) : !OWN_MAPS.has(ep))));
/** The region in force for year `ep` in theatre `th`: the one picked, if that theatre has maps there, else its first. */
export const regionIn = (ep, th) => { const rs = regionsFor(ep, th); return rs.some((r) => r.id === regionNow) ? regionNow : rs[0]?.id ?? 'europe'; };
let theatreNow = 'land';
export const theatre = () => theatreNow;
export function setTheatre(id) { theatreNow = THEATRES.some((t) => t.id === id && !t.soon) ? id : 'land'; }
/** Does year `ep` have any map in theatre `th`? (the picker greys out the empty ones) */
export const hasTheatre = (ep, th) => Object.values(MAPS).some((m) => !m.wip && tabOf(m) === th && (m.epochs ? m.epochs.includes(ep) : !OWN_MAPS.has(ep)));
/** Years that fight only on maps made for them (1918: the Western Front, nothing in Hesse). */
const OWN_MAPS = new Set(['1918', '2027']);

/**
 * The armies a map is fought by in war `ep` (each side's list; null: any): a map's `armies` is either one set
 * ({ nato, pact } — for the one war it is made for: Omaha) or one per war ({ 1945: { nato, pact }, … } — the Hesse
 * maps: the US Army against the Wehrmacht in 1945, open in 1985's war that never was).
 */
export function armiesOn(map, ep = epoch()) {
  const a = map?.armies;
  if (!a) return null;
  return a[ep] ?? (a.nato || a.pact ? a : null);
}

/** A map's line in the menu: its description. */
export const mapAbout = (m) => m?.description ?? '';

/** The maps an epoch can fight on (a map's `epochs` limits it, e.g. Jena is 1806 only) in the chosen theatre, its own maps first. */
export function mapsFor(ep, th = theatreNow) {
  if (!hasTheatre(ep, th)) th = 'land'; // (a year with no sea yet: its land)
  const reg = regionIn(ep, th);
  const all = Object.values(MAPS).filter((m) => !m.wip && tabOf(m) === th && regionOf(m) === reg && (m.epochs ? m.epochs.includes(ep) : !OWN_MAPS.has(ep))); // (wip: not offered yet)
  return [...all.filter((m) => m.epochs), ...all.filter((m) => !m.epochs)];
}

/** `id` if `ep` has that map, else the epoch's first map. */
export const mapIn = (id, ep) => (mapsFor(ep).some((m) => m.id === id) ? id : mapsFor(ep)[0].id);
