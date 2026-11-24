// Bocche di Cattaro, summer 1918 — HYPOTHETICAL (coastal, the 1918 epoch: Italy lands with British and French ships
// behind it, Austria-Hungary holds; 1.4 × 1.8 km). The Bocche (the Bay of Kotor) was the k.u.k. Kriegsmarine’s
// southern base: the cruisers that raided the Otranto barrage and the German and Austrian U-boats that sank ships all
// over the Mediterranean came out of it. The Allies talked of shutting it from the land side all war — Italian plans
// for a landing on the Montenegrin coast, Admiral Wemyss’s and the French Admiralty’s schemes for a combined attack on
// the entrance in 1917–18 — but the forts, the minefields and the U-boats always won the argument, and it was never
// tried. This is the landing as it might have gone: a dawn assault straight in through the mouth of the bay.
// The ground: the outer bay (the Topla bay) behind its entrance. To the west the long low Oštro point (Punta d’Ostro,
// Prevlaka) with its fort on the tip; to the east the high karst of the Luštica peninsula, the battery at Rose over
// the entrance; between them, in the mouth, the round fort on Mamula island and the U-boat mines laid off it. Inside,
// along the north shore under the mountains: Igalo’s sandy beach and palms in the west, Castelnuovo (Herceg Novi)
// in the middle — Forte Mare on the water, the old town climbing to the Kanli Kula tower, the Spanish fortress
// (Španjola) above it all — then Savina’s monastery, the naval hospital at Meljine, the railway quay at Zelenika and
// the seaplane station at Kumbor, where the bay narrows to the Kumbor strait with its U-boat nets toward the inner
// bays. Stone villages, cypresses, maquis and bare karst; the road north to Trebinje is the defence’s way in.
// The sea is toward +z: the transports and the warships lie there (the north is −z).
// Both banks are built to be fought from either side (the campaign plays a landing flipped: wcampaign/battle.js).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost, buildSite } from './common.js';
import { segDist, graded } from './greatWarHelpers.ts';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2400;
const BOUNDS = { x: 700, z: 900 };
const noise = createNoise2D(1918_06);
const sea = createSea({ level: 0, size: SIZE, color: 0x245a6a }); // (the Adriatic: deep, clear, blue-green under the karst)
const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

/** The north shore of the bay (z of the waterline at x): Igalo, the old town’s spur at Forte Mare, Zelenika, pulled back at Kumbor into the strait. */
const zNExact = (x: number) => -20 + 16 * Math.sin(x * 0.0065 + 0.8) + fbm(noise, x * 0.005, 3.7, 2) * 6 + 22 * bell(x, -10, 55) - 70 * smoothstep(360, 520, x);
const ZN = Float32Array.from({ length: 2601 }, (_, i) => zNExact(i - 1300)); // (every metre across the map, read between)
const zN = (x: number) => { const f = Math.min(2599.999, Math.max(0, x + 1300)), i = Math.floor(f); return ZN[i] + (ZN[i + 1] - ZN[i]) * (f - i); };
/** World position `back` m inland of the north shore at x. */
const W = (x: number, back: number) => ({ x, z: zN(x) - back });
/** The Oštro point (west) and the Luštica peninsula (east): land within R of their spines. */
const OSTRO = [[-800, 30], [-620, 90], [-470, 170], [-300, 300]], OSTRO_R = 80;
const LUSTICA = [[820, 220], [560, 200], [430, 250], [350, 300]], LUSTICA_R = 125;
const MAMULA = { x: 70, z: 350, r: 22 };

/** The water: down quickly off the shingle (the launches ground a few metres out), then the deep bay. */
const seaH = (inl: number) => Math.max(-0.8 + 0.3 * Math.max(inl, -30) + 0.06 * Math.min(0, inl + 30), -26) + fbm(noise, inl * 0.02, 1.3, 2) * 0.3;
/** The ground before the roads. */
function ground(x: number, z: number) {
  const n = zN(x) - z, m = MAMULA.r - Math.hypot(x - MAMULA.x, z - MAMULA.z);
  const w = OSTRO_R + fbm(noise, x * 0.007 + 1, z * 0.007, 2) * 22 * smoothstep(320, 200, z) - segDist(OSTRO, x, z);       // (ragged coves along the point, its tip clean)
  const e = LUSTICA_R + fbm(noise, x * 0.006 + 5, z * 0.006, 2) * 32 * smoothstep(330, 220, z) - segDist(LUSTICA, x, z);
  const inl = Math.max(n, w, e, m);
  if (inl <= 0) return seaH(inl);
  let h = -Infinity;
  if (n > 0) { // the mainland: the beach, the steep rise under the mountains (Igalo flatter), the karst above
    const flat = 0.55 + 0.45 * smoothstep(-420, -220, x);
    let hn = 0.5 + Math.min(n, 14) * 0.07 + 80 * flat * smoothstep(12, 440, n) ** 1.1 + Math.max(0, n - 440) * 0.03;
    hn += (ridged(noise, x * 0.011 + 3, z * 0.011, 3) * 9 + fbm(noise, x * 0.04, z * 0.04, 2) * 1.2) * smoothstep(40, 200, n);
    hn += 10 * smoothstep(95, 0, Math.hypot(x - SPANJOLA.x, z - SPANJOLA.z)) ** 1.3; // the Spanish fortress’s hill
    hn += 14 * smoothstep(80, 0, Math.hypot(x - KUMBOR_HILL.x, z - KUMBOR_HILL.z)) ** 1.3; // the battery hill over Kumbor
    h = Math.max(h, hn);
  }
  if (w > 0) h = Math.max(h, 1 + 32 * smoothstep(0, 70, w) ** 0.8 + fbm(noise, x * 0.03, z * 0.03, 2) * 2 * smoothstep(0, 40, w)); // Oštro: a low rocky spine
  if (e > 0) h = Math.max(h, 1 + 52 * smoothstep(0, 100, e) ** 0.9 + ridged(noise, x * 0.012, z * 0.012 + 5, 3) * 6 * smoothstep(20, 80, e)); // Luštica: high karst
  if (m > 0) h = Math.max(h, 1.5 + 8 * smoothstep(0, 12, m)); // Mamula: a rock with a fort on it
  { const b = Math.hypot(x, z - BASE_Z); if (b < 50) h += (88 - h) * smoothstep(50, 26, b); } // (the defence’s base levelled)
  return h;
}
const SPANJOLA = W(-230, 290);
const KUMBOR_HILL = W(520, 150);
const BASE_Z = -850;

/** The roads (graded): the shore road, the Trebinje road down to the old town, the climbs to the Spanish fortress, the Kumbor road. */
const ROADS = [
  [W(-690, 26), W(-560, 30), W(-420, 26), W(-300, 26), W(-150, 26), W(-60, 34), W(40, 34), W(165, 26), W(300, 26), W(440, 24), W(560, 26), W(690, 26)],
  [{ x: 0, z: BASE_Z }, { x: 40, z: -680 }, { x: -30, z: -520 }, W(-10, 300), W(-10, 170), W(-60, 34)],
  [W(-150, 26), W(-200, 120), W(-260, 210), SPANJOLA],
  [W(-10, 170), W(-120, 250), SPANJOLA, { x: -280, z: -650 }, { x: 0, z: BASE_Z }],
  [W(440, 24), W(400, 160), W(330, 300), { x: 220, z: -620 }, { x: 0, z: BASE_Z }],
].map((r) => r.map((p) => [p.x, p.z]));
const ROAD_H = ROADS.map((r) => r.map(([x, z]) => Math.max(1.6, ground(x, z))));
/** (x, z)’s distance to the nearest road and that road’s height there. */
function road(x: number, z: number) {
  let best = { d: Infinity, h: 0 };
  ROADS.forEach((r, i) => { const g = graded(r, ROAD_H[i], x, z); if (g.d < best.d) best = g; });
  return best;
}
/** The ground with its roads, sampled once every 4 m (the noise, the spines and the roads are too dear to work out per call). */
const height = gridCacheSmooth((x: number, z: number) => {
  let h = ground(x, z);
  if (h < 0.4) return h;
  const g = road(x, z);
  if (g.d < 14) h += (g.h - h) * smoothstep(14, 5, g.d);
  return h;
}, BOUNDS, 4);

/** The beach sectors (x, also the craft’s lanes in through the mouth) and the place each opens. */
export const SECTORS = [
  { x: -150, name: 'Igalo', inland: SPANJOLA },
  { x: -10, name: 'Castelnuovo', inland: W(-10, 170) },
  { x: 150, name: 'Zelenika', inland: W(440, 40) },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The fleet', x: 0, z: 820, owner: 'nato', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Igalo', ...W(-150, 12), owner: null, sector: 'west', radius: 36, opens: 'E' } as any,
  { id: 'C', name: 'Castelnuovo', ...W(-10, 14), owner: null, sector: 'centre', radius: 36, opens: 'F' } as any,
  { id: 'D', name: 'Zelenika', ...W(150, 12), owner: null, sector: 'east', radius: 36, opens: 'G' } as any,
  { id: 'E', name: 'Spanish fortress', ...SPANJOLA, owner: null, sector: 'west', radius: 34 },
  { id: 'F', name: 'Kanli Kula', ...SECTORS[1].inland, owner: null, sector: 'centre', radius: 34 },
  { id: 'G', name: 'Kumbor', ...SECTORS[2].inland, owner: null, sector: 'east', radius: 36 },
  { id: 'K', name: 'Trebinje road', x: 0, z: -820, owner: 'pact', sector: 'centre' },
];
/** The old town of Castelnuovo: between the shore road and the Kanli Kula, round the spur. */
const inTown = (x: number, z: number) => Math.abs(x + 15) < 75 && zN(x) - z > 40 && zN(x) - z < 150;

export default {
  id: 'cattaro-landing',
  name: 'Bocche di Cattaro',
  description: 'A landing that was never tried: an Allied dawn assault through the mouth of the Bocche di Cattaro, the k.u.k. navy’s U-boat and cruiser base — past the forts on Punta d’Ostro, Mamula and Luštica, onto Igalo’s beach, the quays of Castelnuovo under the Spanish fortress and the railway quay at Zelenika, then up to Kumbor’s seaplane station.',
  epochs: ['1918'],
  theatre: 'coastal',
  region: 'italy',
  modes: ['landing'],
  airfields: [], // (systems/Airfields.js: a steep shore under the mountains and pitted karst — no runway fits)
  sides: { nato: 'Italy', pact: 'Austria-Hungary' },
  armies: { nato: ['it', 'uk'], pact: ['ah'] }, // (the Italians land; the British and French ships of the Otranto command behind them)
  conditions: { time: 'dawn', weather: 'clear' },
  wind: { from: 20, speed: 3, veer: 0.15 }, // (the bura’s last breath off the mountains at dawn)
  size: SIZE,
  segments: 900,
  bounds: BOUNDS,
  navCell: 1.5,
  steep: 0.5, // (men climb the karst anywhere; wheels keep to the roads up from the shore)
  overwatch: true,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1918,
  height,
  river: sea,
  fields: createFields({ seed: 1918, cell: 70, weights: [0.6, 0.05, 0.1, 0.25] as any }),

  theme: {
    // first light over the Bocche: the sun behind Orjen, the bay still in shadow, the sea pale under a clear sky
    fogColor: 0xb8c2c8, fogDensity: 0.0006, skyTop: 0x5e80a8, skyHorizon: 0xe6d6c0, skyBottom: 0x88907e,
    sunColor: 0xffe2bc, sunIntensity: 1.8, sunDisk: 0.6, clouds: 0.2, cloudLight: 0xf4e8dc, cloudDark: 0xa4a8a8,
    sunDir: [0.5, 0.3, -0.8], hemiSky: 0xd0d8e0, hemiGround: 0x6e6a52, hemiIntensity: 1.25, rimColor: 0xf0dcc0, rimIntensity: 0.3,
    terrain: {
      grass: '#66703f', grassAlt: '#5c663a', dryGrass: '#9a9064', dirt: '#8a7656', rock: '#a8a496',
      pasture: '#6a7444', ploughed: '#7a6648', stubble: '#a09464', meadow: '#707a46',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (y < -1.5) return [0x3e6a70, 1];                                                        // deep water
        if (y < 0.3) return [0xb4ae98, 1];                                                         // the shelf
        if (y < 1.6 && zN(x) - z < 16) return x < -100 && x > -460 ? [0xd8ccaa, 1] : [0xb0aa9a, 1]; // Igalo’s sand; shingle and quays elsewhere
        if (road(x, z).d < 3.4) return [0xbab2a0, 0.9];                                            // the white limestone roads
        if (inTown(x, z)) return [0x9c968a, 0.85];                                                 // the town’s stairs and paving
        const g = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
        if (g > 0.7) return [0xb8b2a2, Math.min(1, (g - 0.7) * 2.5)];                              // bare limestone faces
        const n = fbm(noise, x * 0.035 + 7, z * 0.035, 2);
        if (y > 40 && n > 0.1) return [n > 0.35 ? 0xb2aea2 : 0x9a968a, Math.min(0.8, (n + 0.1) * 1.6)]; // the karst showing through
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 860, entries: SECTORS.map((s) => s.x) }, pact: { x: 0, z: BASE_Z, entries: [-280, 0, 280] } },
  maxStacks: 30, // (the launches count while they are on a run: 26 left the landing at its cap with CP to spare)
  cameraStart: { nato: { x: 0, z: 620 }, pact: { x: 0, z: -160 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'nato',
    // the Italian army has no landing boats of its own (data/units1918/ships.js): the side’s motor launches and ferries stand in
    // for the destroyers’ boats and the requisitioned steamers
    craft: { infantry: ['ml'], vehicle: 'ferry' }, // (the men in the fast launches: a slow ferry in the mouth is the forts' target practice)
    launchZ: 640,
    signal: { t: 15, say: 'The flagship’s gun — the launches go in through the mouth, past Mamula', sayOther: 'Boats in the mouth of the Bocche! The forts are opening fire — stand to!' },
    // the Regia Marina’s destroyers, an esploratore and the MAS boats (what the Italians can field: ships.js `it`)
    navy: ['destroyer', 'lightCruiser', 'ptBoat'],
    // the mines laid across the approach to the entrance, the swept lanes off each beach
    seaMines: { z: [400, 470], count: 50, lanes: SECTORS.map((s) => s.x), lane: 55, seed: 1918 },
    forts: [
      { unit: 'coastBattery', x: -320, z: 290, facing: 0.2, name: 'Fort Punta d’Ostro' },   // (on the point’s tip, over the mouth)
      { unit: 'coastBattery', x: 400, z: 250, facing: -0.3, name: 'Batterie Rose' },         // (Luštica’s height over the entrance)
      { unit: 'moleBattery', x: MAMULA.x, z: MAMULA.z, facing: 0, name: 'Fort Mamula' },     // (the round fort in the mouth)
      { unit: 'artillery', ...W(-140, 430), facing: 0 },                                     // the field guns up behind the town
      { unit: 'artillery', ...W(300, 330), facing: 0 },
    ],
    // the beach defences: wire along the waterline (gaps at the slipways), trenches and MG posts over each beach
    works: [
      ...SECTORS.flatMap((s) => [-60, -45, -30, 30, 45, 60].map((dx) => ({ kind: 'wire', ...W(s.x + dx, 6), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-50, -25, 0, 25, 50].map((dx) => ({ kind: 'trench', ...W(s.x + dx, 48), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, 40), yaw: 0 }))),
      { kind: 'mgNest', ...W(-260, 60), yaw: 0 }, { kind: 'mgNest', ...W(300, 50), yaw: 0 }, // (flanking the beaches from the shore)
      ...[-20, 0, 20].map((dx) => ({ kind: 'trench', ...W(-10 + dx, 160), yaw: 0 })),        // under the Kanli Kula
      ...[-20, 20].map((dx) => ({ kind: 'trench', ...W(-230 + dx, 270), yaw: 0 })),               // under the Spanish fortress
    ],
    // the k.u.k. garrison of the Bocche: Landsturm and naval infantry along the shore, the reserve up in the town
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mortar', 'rifles', 'sniper'],
    counter: { t: 300, units: ['stormTroops', 'rifles', 'mgTeam', 'rifles'], say: 'The reserve battalion is coming down the Trebinje road — throw them back into the bay', sayOther: 'Austrian reserves coming down from the mountain road — they are making for the beaches!' },
    hold: [...SECTORS.flatMap((s) => [-40, 0, 40].map((dx) => W(s.x + dx, 45))), ...SECTORS.map((s) => s.inland)],
    ai: { order: ['rifles', 'rifles', 'mgTeam', 'rifles', 'mortar', 'rifles', 'rifles', 'mgTeam', 'sniper', 'rifles', 'rifles', 'mountainGun'], // (rifles and MGs: the squads the assaults are made of — the Arditi come in with the waves)
          gunship: 'destroyer', gunships: 0, heavy: null, inshore: 150 }, // (no destroyer sent inshore: the mouth is too narrow — crossing between the lanes past Mamula she hung there, and every launch within 110 m of her waited for good: systems/Landing.js)
    economy: { reserves: 3400, perSector: 700, beachIncome: 2.4, defenceCp: 500, defenceIncome: 0.65 },
    waves: [
      // dawn: the first wave in through the swept lanes to all three beaches at once
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'stormTroops', sector: 1 }, { unit: 'mgTeam', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 },
      ] },
      { t: 150, say: 'The second wave is coming in — Bersaglieri and the Arditi', units: [{ unit: 'stormTroops', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }] },
      { t: 330, say: 'A mountain battery is coming ashore', units: [{ unit: 'rifles', sector: 1 }, { unit: 'mountainGun', sector: 1 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1918_06);
    sea.build(scene, terrain);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const placed: number[][] = [];
    const free = (x: number, z: number, rr: number) => !placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + rr);
    const dry = (x: number, z: number) => terrain.heightAt(x, z) > 1.2;
    const ok = (x: number, z: number, rr: number) => dry(x, z) && road(x, z).d > rr + 4 && free(x, z, rr) && steepAt(x, z) < 0.45;
    const put = (x: number, z: number, rr: number) => placed.push([x, z, rr]);
    const STONE = 0xb4ae9e, ROOF = 0x9a5a3e;

    // ---- the forts: casemated stone with a glacis wall (Oštro, Rose, the Spanish fortress), a round fort on Mamula
    const fort = (x: number, z: number, yaw: number, name: string, w = 22) => {
      props.hall({ x, z, yaw, width: w, depth: 10, height: 4.6, color: 0x9a9486, roof: 0x5c5e56, door: 4, name });
      const [tx, tz] = PropBuilder.local(x, z, yaw, w / 2 + 3, -2);
      props.box('stone', tx, terrain.heightAt(tx, tz) + 4, tz, 7, 8, 7, yaw, 0x8e897e);
      cover.addBox({ x: tx, z: tz, yaw, length: 7, thickness: 7, height: 8 });
      const [wx, wz] = PropBuilder.local(x, z, yaw, 0, 12);
      props.wall({ x: wx, z: wz, yaw, length: w + 6, height: 1.6, thickness: 0.9 });
      put(x, z, w / 2 + 6);
    };
    fort(-345, 262, 0.2, 'Fort Punta d’Ostro', 20);
    fort(420, 220, -0.3, 'Batterie Rose', 18);
    fort(SPANJOLA.x - 18, SPANJOLA.z - 26, 0, 'Spanish fortress (Španjola)', 26);
    for (let i = 0; i < 18; i++) { // Mamula: the ring of casemates round the island
      const a = (i / 18) * Math.PI * 2, x = MAMULA.x + Math.cos(a) * 14, z = MAMULA.z + Math.sin(a) * 14;
      props.wall({ x, z, yaw: -a + Math.PI / 2, length: 5.4, height: 5, thickness: 2 });
    }
    // ---- Castelnuovo: Forte Mare on the water, the old town packed up the slope, the Kanli Kula tower, churches
    {
      const fm = W(-60, 8);
      for (const [dx, dz, yaw, len] of [[0, 0, 0, 30], [-15, -10, Math.PI / 2, 20], [15, -10, Math.PI / 2, 20]] as number[][]) props.wall({ x: fm.x + dx, z: fm.z + dz, yaw, length: len, height: 5, thickness: 2.2 });
      put(fm.x, fm.z - 8, 18);
      const kk = W(-10, 170);
      props.tower({ x: kk.x + 22, z: kk.z + 8, concrete: false });
      put(kk.x + 22, kk.z + 8, 6);
      const ch = W(-50, 110);
      if (ok(ch.x, ch.z, 9)) { props.church({ x: ch.x, z: ch.z, yaw: 0 }); put(ch.x, ch.z, 10); }
      props.rand = mulberry32(1918_61);
      for (let i = 0, n = 0; i < 600 && n < 46; i++) {
        const x = -90 + r() * 150, z = zN(x) - 40 - r() * 110;
        if (!inTown(x, z) || near(x, z, 24) || !ok(x, z, 6)) continue;
        n++; put(x, z, 6);
        props.townHouse({ x, z, yaw: (r() < 0.6 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.2, width: 7 + r() * 2, depth: 8 + r() * 2, storeys: r() < 0.5 ? 3 : 2, damaged: 0 });
      }
    }
    // ---- the villages along the shore: Igalo (palms), Topla, Savina’s monastery, Meljine’s hospital, Zelenika, Kumbor, Rose on Luštica
    const village = (x0: number, x1: number, b0: number, b1: number, n: number, seed: number) => {
      const q = mulberry32(seed);
      props.rand = q;
      for (let i = 0, k = 0; i < n * 30 && k < n; i++) {
        const x = x0 + q() * (x1 - x0), z = zN(x) - b0 - q() * (b1 - b0);
        if (near(x, z, 22) || !ok(x, z, 6)) continue;
        k++; put(x, z, 6);
        if (q() < 0.65) props.townHouse({ x, z, yaw: (q() < 0.5 ? 0 : Math.PI / 2) + (q() - 0.5) * 0.3, width: 7 + q() * 2, depth: 7 + q() * 2, storeys: q() < 0.3 ? 2 : 1, damaged: 0 });
        else props.house({ x, z, yaw: q() * 3, width: 8 + q() * 2, depth: 6, height: 3.2 });
      }
    };
    village(-300, -110, 32, 90, 14, 61);  // Igalo
    village(-110, -80, 30, 70, 4, 62);    // Topla
    village(120, 230, 34, 90, 11, 63);    // Zelenika
    village(400, 520, 40, 110, 9, 64);    // Kumbor
    village(-520, -330, 40, 160, 6, 65);  // Sutorina’s hamlets
    for (let i = 0; i < 16; i++) { const x = -330 + r() * 230, p = W(x, 18 + r() * 8); if (ok(p.x, p.z, 2)) { props.palm({ x: p.x, z: p.z, height: 7 + r() * 4 }); put(p.x, p.z, 2); } } // Igalo’s promenade
    { const s = W(70, 115); if (ok(s.x, s.z, 9)) { props.church({ x: s.x, z: s.z, yaw: 0.2 }); put(s.x, s.z, 10); } } // Savina
    { const h = W(105, 50); if (ok(h.x, h.z, 14)) { props.hall({ x: h.x, z: h.z, yaw: 0, width: 26, depth: 11, height: 7, color: 0xd2c8b0, roof: ROOF, door: 4, name: 'k.u.k. Marinespital Meljine' }); put(h.x, h.z, 15); } }
    // Zelenika: the end of the Bosnian narrow-gauge line from Mostar — the station, its sidings and wagons on the quay
    { const st = W(200, 46); props.hall({ x: st.x, z: st.z, yaw: 0, width: 20, depth: 9, height: 6, color: 0xc8b48e, roof: ROOF, door: 4, name: 'Zelenika station' }); put(st.x, st.z, 13);
      const a = W(120, 24), b = W(260, 24); props.rails({ x0: a.x, z0: a.z - 6, x1: b.x, z1: b.z - 6 });
      for (let i = 0; i < 4; i++) { const w = W(150 + i * 14, 30); props.wagon({ x: w.x, z: w.z, yaw: Math.PI / 2 }); } }
    // Kumbor: the seaplane station — the hangars on the shore, the slipway down into the water
    for (let i = 0; i < 2; i++) { const hg = W(470 + i * 36, 22); props.timberHangar({ x: hg.x, z: hg.z, yaw: Math.PI }); put(hg.x, hg.z, 18); }
    { const sl = W(488, 4); props.box('stone', sl.x, 0.2, sl.z + 6, 14, 1.2, 26, 0, 0x8e8a80); }
    // Rose on Luštica’s tip, and the Oštro lighthouse
    for (let i = 0; i < 7; i++) { const x = 330 + r() * 90, z = 190 + r() * 60; if (ok(x, z, 6) && terrain.heightAt(x, z) < 20) { props.townHouse({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 7, depth: 7, storeys: 1, damaged: 0 }); put(x, z, 6); } }
    props.column({ x: -262, z: 330, radius: 2, height: 11 });
    // the anti-submarine nets across the Kumbor strait: a line of floats from shore to shore (and the boom’s guard boat)
    for (let z = zN(620) + 4; z < 120; z += 5) if (terrain.heightAt(620, z) < -1) props.box('plain', 620, 0.2, z, 1.6, 0.6, 1.6, 0, 0x3a3a36);
    // the Austrian guns’ pits and the trenches’ sangars up the karst; dry-stone walls round the terraces and olive plots
    commandPost(props, this.bases.pact, 1, 0x6a6e58);
    for (let i = 0; i < 520; i++) {
      const x = (r() * 2 - 1) * 680, z = -880 + r() * 1200;
      if (!ok(x, z, 3) || near(x, z, 26) || inTown(x, z) || Math.hypot(x, z - BASE_Z) < 50) continue;
      if (r() < 0.45) props.boulder({ x, z, radius: 0.6 + r() * 1.4 });
      else props.lowWall({ x, z, yaw: r() * 3, length: 6 + r() * 9, height: 1.0, color: STONE });
    }
    for (let i = 0, n = 0; i < 1500 && n < 14; i++) {
      const x = (r() * 2 - 1) * 640, z = -820 + r() * 600;
      if (!ok(x, z, 10) || near(x, z, 45)) continue;
      n++; put(x, z, 10);
      buildSite(props, { kind: ['farm', 'fieldwall', 'rocks', 'farm'][n % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), ...placed.map(([x, z, pr]) => ({ x, z, r: pr + 2 })),
      { test: (x: number, z: number) => terrain.heightAt(x, z) < 1.4 || road(x, z).d < 6 || inTown(x, z) }];
    // the maquis (holm oak, myrtle, laurel) on every slope, thicker up the mountainside; Aleppo pines on Luštica and the hills; cypresses round the villages
    const scrub = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 6000, broadleaf: 1, autumn: 0, size: 0.4, maxY: 200, avoid,
      forest: (x: number, z: number) => 0.3 + fbm(noise, x * 0.012 + 3, z * 0.012, 2) + (zN(x) - z > 120 ? 0.2 : 0) });
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 1000, broadleaf: 0, autumn: 0, size: 0.8, maxY: 200, avoid,
      forest: (x: number, z: number) => (fbm(noise, x * 0.008 + 11, z * 0.008, 2) > 0.1 ? 0.6 : 0.05) });
    const homes = [[-200, 60], [-95, 50], [175, 60], [460, 75], [-30, 100], [80, 100]].map(([x, b]) => W(x, b));
    const cypresses = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 320, broadleaf: 0, autumn: 0, size: 0.7, maxY: 200, avoid,
      forest: (x: number, z: number) => (homes.some((h) => Math.hypot(h.x - x, h.z - z) < 90) ? 1 : -1) });
    cover.finalize(bounds);
    const grass = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.4, fields: this.fields,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 1.6 || road(x, z).d < 4 || inTown(x, z) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { scrub.update(dt, t); pines.update(dt, t); cypresses.update(dt, t); grass.update(dt, t); },
    };
  },
} satisfies MapDef;
