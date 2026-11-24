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
import mozhaisk from './mozhaisk.ts';
import novorossiysk from './novorossiysk.ts';
import elAlamein from './elAlamein.ts';
import midway from './midway.ts';
import savoSound from './savoSound.ts';
import surigaoStrait from './surigaoStrait.ts';
import philippineSea from './philippineSea.ts';
import atlanticConvoy from './atlanticConvoy.ts';
import maltaConvoy from './maltaConvoy.ts';
import norwegianSea from './norwegianSea.ts';
import northCape from './northCape.ts';
import ionianSea from './ionianSea.ts';
import seaOfJapan from './seaOfJapan.ts';
import trafalgar from './trafalgar.ts';
import aboukir from './aboukir.ts';
import brest from './brest.ts';
import caribbean from './caribbean.ts';
import heligolandBight from './heligolandBight.ts';
import doggerBank from './doggerBank.ts';
import doverStrait from './doverStrait.ts';
import zeebrugge from './zeebrugge.ts';
import albion from './albion.ts';
import lido from './lido.ts';
import cattaroLanding from './cattaroLanding.ts';
import balticSea from './balticSea.ts';
import giukGap from './giukGap.ts';
import openSea from './openSea.ts'; // (the campaign's quiet sea zones: open water, both wars)
import omaha from './omaha.ts';
import iwoJima from './iwoJima.ts';
import elGuettar from './elGuettar.ts';
import kasserinePass from './kasserinePass.ts';
import bobruisk from './bobruisk.ts';
import berlin from './berlin.ts';
import amiriya from './amiriya.ts';
import gazala from './gazala.ts';
import tobruk from './tobruk.ts';
import seelowHeights from './seelowHeights.ts';
import krymskaya from './krymskaya.ts';
import halbe from './halbe.ts';
import hohwacht from './hohwacht.ts';
import aboukirLanding from './aboukirLanding.ts';
import gotlandLanding from './gotlandLanding.ts';
import villersBretonneux from './villersBretonneux.ts';
import leHamel from './leHamel.ts';
import stQuentin from './stQuentin.ts';
import soissons from './soissons.ts';
import passchendaele from './passchendaele.ts';
import nieuport from './nieuport.ts';
import belleauWood from './belleauWood.ts';
import montagneDeReims from './montagneDeReims.ts';
import cote304 from './cote304.ts';
import cheminDesDames from './cheminDesDames.ts';
import cambrai from './cambrai.ts';
import vimy from './vimy.ts';
import hill70 from './hill70.ts';
import stMihiel from './stMihiel.ts';
import seicheprey from './seicheprey.ts';
import meuseArgonne from './meuseArgonne.ts';
import metz from './metz.ts';
import sedan1918 from './sedan1918.ts';
import rhine1918 from './rhine1918.ts';
import matz from './matz.ts';
import theLys from './theLys.ts';
import courtrai from './courtrai.ts';
import suwalkiGap from './suwalkiGap.ts';
import suwalkiTown from './suwalkiTown.ts';
import nemanCrossing from './nemanCrossing.ts';
import augustowCanal from './augustowCanal.ts';
import eastShield from './eastShield.ts';
import biebrzaMarshes from './biebrzaMarshes.ts';
import orzyszBase from './orzyszBase.ts';
import narvaRiver from './narvaRiver.ts';
import tapaJunction from './tapaJunction.ts';
import valgaValka from './valgaValka.ts';
import daugavpils from './daugavpils.ts';
import gotlandGap from './gotlandGap.ts';
import gulfOfFinland from './gulfOfFinland.ts';
import gdanskBay from './gdanskBay.ts';
import bornholmStrait from './bornholmStrait.ts';
import salla from './salla.ts';
import kuusamo from './kuusamo.ts';
import ivalo from './ivalo.ts';
import pasvikValley from './pasvikValley.ts';

import eylau from './eylau.ts';
import friedland from './friedland.ts';
import vimeiro from './vimeiro.ts';
import talavera from './talavera.ts';
import bussaco from './bussaco.ts';
import fuentesDeOnoro from './fuentesDeOnoro.ts';
import pultusk from './pultusk.ts';
import heilsberg from './heilsberg.ts';
import copenhagen from './copenhagen.ts';
import riga from './riga.ts';
import tannenberg from './tannenberg.ts';
import gorlice from './gorlice.ts';
import lutsk from './lutsk.ts';
import jakobstadt from './jakobstadt.ts';
import krevo from './krevo.ts';
import pskov from './pskov.ts';
import narva from './narva.ts';
import kiev1918 from './kiev1918.ts';
import berlin1918 from './berlin1918.ts';
import zborov from './zborov.ts';
import cracow from './cracow.ts';
import warsaw from './warsaw.ts';
import posen from './posen.ts';
import marasesti from './marasesti.ts';
import arges from './arges.ts';
import baranovichi from './baranovichi.ts';
import caporetto from './caporetto.ts';
import piave from './piave.ts';
import asiago from './asiago.ts';
import ortigara from './ortigara.ts';
import dobroPole from './dobroPole.ts';
import doiran from './doiran.ts';
import salonika from './salonika.ts';
import kajmakcalan from './kajmakcalan.ts';
import skopje from './skopje.ts';
import nis from './nis.ts';
import sofia from './sofia.ts';
import vittorioVeneto from './vittorioVeneto.ts';
import bainsizza from './bainsizza.ts';
import montello from './montello.ts';
import hermada from './hermada.ts';
import trieste1918 from './trieste1918.ts';
import tolmein from './tolmein.ts';
import tarvis from './tarvis.ts';
import vienna from './vienna.ts';
import garigliano from './garigliano.ts';
import cattaro from './cattaro.ts';
import megiddo from './megiddo.ts';
import gaza from './gaza.ts';
import beersheba from './beersheba.ts';
import damascus from './damascus.ts';
import nebiSamwil from './nebiSamwil.ts';
import romani from './romani.ts';
import magdhaba from './magdhaba.ts';
import haritan from './haritan.ts';
import gallipoli from './gallipoli.ts';
import salonikaLanding from './salonikaLanding.ts';
import gazaLanding from './gazaLanding.ts';
import portSaid from './portSaid.ts';
import samland from './samland.ts';
import taranto from './taranto.ts';
import domesnes from './domesnes.ts';
import krithia from './krithia.ts';
import chatalja from './chatalja.ts';
import bosphorus from './bosphorus.ts';
import dunkirk1918 from './dunkirk1918.ts';
import otranto from './otranto.ts';
import westernApproaches from './westernApproaches.ts';
import azores1918 from './azores1918.ts';
import premuda from './premuda.ts';
import imbros from './imbros.ts';
import levant1917 from './levant1917.ts';
import ardennes from './ardennes.ts';
import bocage from './bocage.ts';
import remagen from './remagen.ts';
import halle from './halle.ts';
import kent from './kent.ts';
import arnhem from './arnhem.ts';
import kohima from './kohima.ts';
import meiktila from './meiktila.ts';
import imphal from './imphal.ts';
import guadalcanal from './guadalcanal.ts';
import saipan from './saipan.ts';
import charanKanoa from './charanKanoa.ts';
import oahu from './oahu.ts';
import haleiwa from './haleiwa.ts';
import motoyama from './motoyama.ts';
import okinawa from './okinawa.ts';
import kyushu from './kyushu.ts';
import goldBeach from './goldBeach.ts';
import gela from './gela.ts';
import hythe from './hythe.ts';
import abuQir from './abuQir.ts';
import cassino from './cassino.ts';
import anzio from './anzio.ts';
import medjerda from './medjerda.ts';
import bone from './bone.ts';
import primosole from './primosole.ts';
import okinawaLanding from './okinawaLanding.ts';
import myebon from './myebon.ts';
import ariake from './ariake.ts';
import redBeach from './redBeach.ts';
import finnmark from './finnmark.ts';
import schwerin from './schwerin.ts';
import magdeburg from './magdeburg.ts';
import rheinMain from './rheinMain.ts';
import tartus from './tartus.ts';
import naples from './naples.ts';
import narvik from './narvik.ts';
import malselv from './malselv.ts';
import lyngen from './lyngen.ts';
import pechenga from './pechenga.ts';
import bodo from './bodo.ts';
import andenes from './andenes.ts';
import murmansk from './murmansk.ts';
import ratzeburgLakes from './ratzeburgLakes.ts';
import wesel from './wesel.ts';
import eastAnglia from './eastAnglia.ts';
import korea from './korea.ts';
import chorwonValley from './chorwonValley.ts';
import imjinRiver from './imjinRiver.ts';
import uijeongbu from './uijeongbu.ts';
import kaesong from './kaesong.ts';
import pyongyang from './pyongyang.ts';
import nampo from './nampo.ts';
import tartusLanding from './tartusLanding.ts';
import liinakhamari from './liinakhamari.ts';
import ussuri from './ussuri.ts';
import seoul from './seoul.ts';
import vladivostok from './vladivostok.ts';
import hokkaido from './hokkaido.ts';
import andoya from './andoya.ts';
import motovsky from './motovsky.ts';
import keflavik from './keflavik.ts';
import wismar from './wismar.ts';
import incheon from './incheon.ts';
import scheveningen from './scheveningen.ts';
import salerno from './salerno.ts';
import felixstowe from './felixstowe.ts';
import ishikari from './ishikari.ts';
import ofotfjord from './ofotfjord.ts';
import bodoLanding from './bodoLanding.ts';
import reykjanes from './reykjanes.ts';
import varanger from './varanger.ts';
export const MAPS = {
  [andoya.id]: andoya,
  [motovsky.id]: motovsky,
  [keflavik.id]: keflavik,
  [wismar.id]: wismar,
  [incheon.id]: incheon,
  [scheveningen.id]: scheveningen,
  [salerno.id]: salerno,
  [felixstowe.id]: felixstowe,
  [ishikari.id]: ishikari,
  [ofotfjord.id]: ofotfjord,
  [bodoLanding.id]: bodoLanding,
  [reykjanes.id]: reykjanes,
  [varanger.id]: varanger,
  [ratzeburgLakes.id]: ratzeburgLakes,
  [wesel.id]: wesel,
  [eastAnglia.id]: eastAnglia,
  [korea.id]: korea,
  [chorwonValley.id]: chorwonValley,
  [imjinRiver.id]: imjinRiver,
  [uijeongbu.id]: uijeongbu,
  [kaesong.id]: kaesong,
  [pyongyang.id]: pyongyang,
  [nampo.id]: nampo,
  [tartusLanding.id]: tartusLanding,
  [liinakhamari.id]: liinakhamari,
  [ussuri.id]: ussuri,
  [seoul.id]: seoul,
  [vladivostok.id]: vladivostok,
  [hokkaido.id]: hokkaido,
  [narvik.id]: narvik,
  [malselv.id]: malselv,
  [lyngen.id]: lyngen,
  [finnmark.id]: finnmark,
  [schwerin.id]: schwerin,
  [magdeburg.id]: magdeburg,
  [rheinMain.id]: rheinMain,
  [tartus.id]: tartus,
  [naples.id]: naples,
  [pechenga.id]: pechenga,
  [bodo.id]: bodo,
  [andenes.id]: andenes,
  [murmansk.id]: murmansk,
  [okinawaLanding.id]: okinawaLanding,
  [myebon.id]: myebon,
  [ariake.id]: ariake,
  [redBeach.id]: redBeach,
  [goldBeach.id]: goldBeach,
  [gela.id]: gela,
  [hythe.id]: hythe,
  [abuQir.id]: abuQir,
  [cassino.id]: cassino,
  [anzio.id]: anzio,
  [medjerda.id]: medjerda,
  [bone.id]: bone,
  [primosole.id]: primosole,
  [okinawa.id]: okinawa,
  [kyushu.id]: kyushu,
  [kohima.id]: kohima,
  [meiktila.id]: meiktila,
  [imphal.id]: imphal,
  [guadalcanal.id]: guadalcanal,
  [saipan.id]: saipan,
  [charanKanoa.id]: charanKanoa,
  [oahu.id]: oahu,
  [haleiwa.id]: haleiwa,
  [motoyama.id]: motoyama,
  [arnhem.id]: arnhem,
  [remagen.id]: remagen,
  [halle.id]: halle,
  [kent.id]: kent,
  [bocage.id]: bocage,
  [ardennes.id]: ardennes,
  [otranto.id]: otranto,
  [westernApproaches.id]: westernApproaches,
  [azores1918.id]: azores1918,
  [premuda.id]: premuda,
  [imbros.id]: imbros,
  [levant1917.id]: levant1917,
  [gallipoli.id]: gallipoli,
  [salonikaLanding.id]: salonikaLanding,
  [bosphorus.id]: bosphorus,
  [dunkirk1918.id]: dunkirk1918,
  [gazaLanding.id]: gazaLanding,
  [portSaid.id]: portSaid,
  [samland.id]: samland,
  [taranto.id]: taranto,
  [domesnes.id]: domesnes,
  [krithia.id]: krithia,
  [chatalja.id]: chatalja,
  [megiddo.id]: megiddo,
  [gaza.id]: gaza,
  [beersheba.id]: beersheba,
  [damascus.id]: damascus,
  [nebiSamwil.id]: nebiSamwil,
  [romani.id]: romani,
  [magdhaba.id]: magdhaba,
  [haritan.id]: haritan,
  [piave.id]: piave,
  [asiago.id]: asiago,
  [ortigara.id]: ortigara,
  [dobroPole.id]: dobroPole,
  [doiran.id]: doiran,
  [salonika.id]: salonika,
  [kajmakcalan.id]: kajmakcalan,
  [skopje.id]: skopje,
  [nis.id]: nis,
  [sofia.id]: sofia,
  [vittorioVeneto.id]: vittorioVeneto,
  [bainsizza.id]: bainsizza,
  [montello.id]: montello,
  [hermada.id]: hermada,
  [trieste1918.id]: trieste1918,
  [tolmein.id]: tolmein,
  [tarvis.id]: tarvis,
  [vienna.id]: vienna,
  [garigliano.id]: garigliano,
  [cattaro.id]: cattaro,
  [caporetto.id]: caporetto,
  [riga.id]: riga,
  [tannenberg.id]: tannenberg,
  [gorlice.id]: gorlice,
  [lutsk.id]: lutsk,
  [jakobstadt.id]: jakobstadt,
  [krevo.id]: krevo,
  [pskov.id]: pskov,
  [narva.id]: narva,
  [kiev1918.id]: kiev1918,
  [berlin1918.id]: berlin1918,
  [zborov.id]: zborov,
  [cracow.id]: cracow,
  [warsaw.id]: warsaw,
  [posen.id]: posen,
  [marasesti.id]: marasesti,
  [arges.id]: arges,
  [baranovichi.id]: baranovichi,
  [copenhagen.id]: copenhagen,
  [talavera.id]: talavera,
  [bussaco.id]: bussaco,
  [fuentesDeOnoro.id]: fuentesDeOnoro,
  [pultusk.id]: pultusk,
  [heilsberg.id]: heilsberg,
  [vimeiro.id]: vimeiro,
  [friedland.id]: friedland,
  [eylau.id]: eylau,
  [omaha.id]: omaha,
  [iwoJima.id]: iwoJima,
  [elGuettar.id]: elGuettar,
  [kasserinePass.id]: kasserinePass,
  [bobruisk.id]: bobruisk,
  [berlin.id]: berlin,
  [gazala.id]: gazala,
  [tobruk.id]: tobruk,
  [amiriya.id]: amiriya,
  [seelowHeights.id]: seelowHeights,
  [krymskaya.id]: krymskaya,
  [halbe.id]: halbe,
  [hohwacht.id]: hohwacht,
  [aboukirLanding.id]: aboukirLanding,
  [gotlandLanding.id]: gotlandLanding,
  [villersBretonneux.id]: villersBretonneux,
  [leHamel.id]: leHamel,
  [stQuentin.id]: stQuentin,
  [soissons.id]: soissons,
  [passchendaele.id]: passchendaele,
  [nieuport.id]: nieuport,
  [belleauWood.id]: belleauWood,
  [montagneDeReims.id]: montagneDeReims,
  [cote304.id]: cote304,
  [cheminDesDames.id]: cheminDesDames,
  [cambrai.id]: cambrai,
  [vimy.id]: vimy,
  [hill70.id]: hill70,
  [stMihiel.id]: stMihiel,
  [seicheprey.id]: seicheprey,
  [meuseArgonne.id]: meuseArgonne,
  [metz.id]: metz,
  [sedan1918.id]: sedan1918,
  [rhine1918.id]: rhine1918,
  [matz.id]: matz,
  [theLys.id]: theLys,
  [courtrai.id]: courtrai,
  [suwalkiGap.id]: suwalkiGap,
  [suwalkiTown.id]: suwalkiTown,
  [nemanCrossing.id]: nemanCrossing,
  [augustowCanal.id]: augustowCanal,
  [eastShield.id]: eastShield,
  [biebrzaMarshes.id]: biebrzaMarshes,
  [orzyszBase.id]: orzyszBase,
  [narvaRiver.id]: narvaRiver,
  [tapaJunction.id]: tapaJunction,
  [valgaValka.id]: valgaValka,
  [daugavpils.id]: daugavpils,
  [gotlandGap.id]: gotlandGap,
  [gulfOfFinland.id]: gulfOfFinland,
  [gdanskBay.id]: gdanskBay,
  [bornholmStrait.id]: bornholmStrait,
  [salla.id]: salla,
  [kuusamo.id]: kuusamo,
  [ivalo.id]: ivalo,
  [pasvikValley.id]: pasvikValley,
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
  [mozhaisk.id]: mozhaisk,
  [novorossiysk.id]: novorossiysk,
  [elAlamein.id]: elAlamein,
  [midway.id]: midway,
  [savoSound.id]: savoSound,
  [surigaoStrait.id]: surigaoStrait,
  [norwegianSea.id]: norwegianSea,
  [northCape.id]: northCape,
  [ionianSea.id]: ionianSea,
  [seaOfJapan.id]: seaOfJapan,
  [trafalgar.id]: trafalgar,
  [aboukir.id]: aboukir,
  [brest.id]: brest,
  [caribbean.id]: caribbean,
  [heligolandBight.id]: heligolandBight,
  [doggerBank.id]: doggerBank,
  [doverStrait.id]: doverStrait,
  [zeebrugge.id]: zeebrugge,
  [albion.id]: albion,
  [lido.id]: lido,
  [cattaroLanding.id]: cattaroLanding,
  [balticSea.id]: balticSea,
  [giukGap.id]: giukGap,
  [openSea.id]: openSea,
  [philippineSea.id]: philippineSea,
  [atlanticConvoy.id]: atlanticConvoy,
  [maltaConvoy.id]: maltaConvoy,
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
  m.widenedHere = true; // (core/GameEngine.js seaward: its homes may have moved ashore)
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
  const move = (p, f) => (shift[f] && !p.anchored ? { ...p, x: p.x + shift[f].x, z: p.z + shift[f].z } : p); // (a line at anchor stays where the map lays it: Aboukir's off the shoals)
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

/**
 * A map in winter (a campaign battle on the Eastern Front in December–February): its ground under snow — grass and fields
 * most, earth and rock less — a grey winter sky, and the winter climate (whitewash and snow smocks: render/paint.js).
 * A map that is already a winter map (or a desert) stays as it is.
 */
export function winterOf(map) {
  if (map.climate) return map;
  const mix = (c, to, k) => {
    const n = typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c;
    if (!Number.isFinite(n)) return c;
    const ch = (v, s) => Math.round(((v >> s) & 255) * (1 - k) + ((to >> s) & 255) * k);
    const out = (ch(n, 16) << 16) | (ch(n, 8) << 8) | ch(n, 0);
    return typeof c === 'string' ? `#${out.toString(16).padStart(6, '0')}` : out;
  };
  const SNOW = 0xeef0f0, HOW = { grass: 0.82, grassAlt: 0.8, dryGrass: 0.78, pasture: 0.82, meadow: 0.8, stubble: 0.75, ploughed: 0.6, dirt: 0.55, rock: 0.45, strip: 0.6 };
  const t = map.theme ?? {}, terrain = Object.fromEntries(Object.entries(t.terrain ?? {}).map(([k, v]) => [k, HOW[k] ? mix(v, SNOW, HOW[k]) : v]));
  const sky = { fogColor: 0xb6bac0, skyTop: 0x7a828c, skyHorizon: 0xc4c8cc, skyBottom: 0x80848a, hemiGround: 0x8a8c90, cloudLight: 0xcfd2d6, cloudDark: 0x7c8086 };
  const theme = { ...t, terrain, ...Object.fromEntries(Object.entries(sky).map(([k, v]) => [k, t[k] != null ? mix(t[k], v, 0.7) : t[k]])), sunIntensity: (t.sunIntensity ?? 1.6) * 0.85, clouds: Math.max(t.clouds ?? 0.5, 0.8) };
  return { ...map, climate: 'winter', theme };
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
  { id: 'europe', name: 'Western Europe' }, { id: 'baltic', name: 'Baltic States' }, { id: 'north', name: 'Northern Flank' }, { id: 'east', name: 'Eastern Front' }, { id: 'iberia', name: 'Iberia' },
  { id: 'italy', name: 'Italian Front' }, { id: 'med', name: 'Mediterranean' }, { id: 'africa', name: 'North Africa' }, { id: 'middleEast', name: 'Middle East' },
  { id: 'caribbean', name: 'Caribbean' }, { id: 'pacific', name: 'Asia & Pacific' }, { id: 'korea', name: 'Korea' },
];
export const regionOf = (m) => m.region ?? 'europe';
/** Why `map` in year `ep` has no airfields (the battle rules show the option off, with this as the hint), or null when it has them. */
export const runwayNote = (map, ep) => (ep === '1806' ? 'No aircraft in 1806.'
  : map?.theatre === 'sea' && !map.airfields?.length ? 'At sea the squadrons fly from the carriers.'
    : Array.isArray(map?.airfields) && !map.airfields.length ? 'No room for a runway on this map: the aircraft come in from the map edge.' : null);
let regionNow = 'europe';
export const region = () => regionNow;
export function setRegion(id) { regionNow = REGIONS.some((r) => r.id === id) ? id : 'europe'; }
/** The regions year `ep` has maps in, in theatre `th` (one: no row to choose from). */
// (a region's name at sea may be its own: 1806's Germany is European waters)
export const regionsFor = (ep, th) => REGIONS.map((r) => ({ ...r, name: EPOCHS[ep]?.regions?.[r.id]?.[th]?.name ?? EPOCHS[ep]?.regions?.[r.id]?.name ?? r.name })).filter((r) => Object.values(MAPS).some((m) => !m.wip && tabOf(m) === th && regionOf(m) === r.id && (m.epochs ? m.epochs.includes(ep) : !OWN_MAPS.has(ep))));
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
