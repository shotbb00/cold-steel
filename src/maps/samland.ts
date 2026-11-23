// The Samland coast, East Prussia (coastal, the 1918 epoch: Russia lands, Germany holds; 1.2 × 1.8 km).
// A battle that was considered, not fought. From 1914 to 1917 the Russian Stavka and the Baltic Fleet came back
// again and again to the idea of landing on the German Baltic coast — behind the East Prussian front, at the Samland
// peninsula north of Königsberg — to draw the German reserves away from the Niemen and the Narew. The fleet’s
// minefields, the German battleships in the Baltic and the lack of transports kept it on paper, and it was the
// Germans who landed in the end, on Ösel in 1917. This map plays the Russian landing as it might have gone: the boats
// come in at dawn under the cliffs.
// On the map, compressed: the north coast of Samland facing the Baltic (the sea toward +z, the west toward +x).
// In the middle the Steilküste — wooded cliffs forty metres high straight up from a narrow beach strewn with
// boulders, cut by steep wooded gorges (the Wolfsschlucht at Warnicken is the way up for wheels); the headland of
// Brüsterort with its lighthouse. In the west (+x) Palmnicken: the amber works, the great open pit in the blue earth
// with its terraced sides, the washing house, the headframe of the old Anna shaft, the miners’ houses. In the east
// (−x) the seaside resorts: Rauschen’s villas among the pines above its beach and its gorge, and at the edge of the
// map the low dunes of Cranz with its long pier. Behind the cliffs the coastal pine forest (Warnicker Forst), then
// farmland and villages, the Samlandbahn running along the coast with its stations, Germau’s church, and in the
// south the wooded Galtgarben, the highest hill of Samland. The Germans: Landsturm trenches along the cliff top and
// over each gorge, wire at the back of the beaches, two coastal batteries on the cliffs, field guns inland.
// Laid out like Gaza Coast (maps/gazaLanding.ts): the beaches along x, three sectors with a way up each.
// A scenario, not a fair battle (MAP_BRIEF_SEA_COAST.md): balanced with AI-vs-AI runs so the landing wins late or
// the defence just holds.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { farmVillage, segDist, graded } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2200;
const BOUNDS = { x: 600, z: 900 };
const EXT = { x: 620, z: 920 };
const SEED = 1916_08;
const noise = createNoise2D(SEED);
const sea = createSea({ level: 0, size: SIZE, color: 0x3c5c66 }); // (the Baltic at dawn: grey-green)
const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

/** The waterline: Brüsterort standing out west of the middle, a shallow bay off Rauschen. */
const shoreZ = (x: number) => 220 + fbm(noise, x * 0.005, 3.3, 2) * 7 + 24 * bell(x, 175, 70) - 12 * bell(x, -330, 90);
/** The cliff top’s height: Cranz’s low dunes (−x), Rauschen, the Steilküste in the middle, Palmnicken (+x). */
const ctop = (x: number) => 5 + 15 * smoothstep(-470, -400, x) + 22 * smoothstep(-260, -170, x) - 20 * smoothstep(200, 280, x) + fbm(noise, x * 0.008, 1.7, 2) * 3;
/** The beach’s depth below the cliff: wide at Cranz and Palmnicken (the amber works’ spoil), a strip under the Steilküste. */
const bw = (x: number) => 18 + 14 * (1 - smoothstep(-260, -170, x)) + 16 * smoothstep(200, 280, x) + 10 * smoothstep(-450, -520, x);
/** The cliff face’s width (steep: men climb it, wheels go by the gorges). */
const fw = (x: number) => Math.max(8, (ctop(x) - 2) * 0.75);
const crest = (x: number) => bw(x) + fw(x);
/** A point `back` m inland of the waterline at x. */
const P = (x: number, back: number) => [x, shoreZ(x) - back];
const W = (x: number, back: number) => ({ x, z: shoreZ(x) - back });

const GALT = { x: 60, z: -690 };
const PACT_BASE = { x: 0, z: -850 };
const PIT = { x: 470, z: shoreZ(470) - 170, rx: 85, rz: 55, floor: 6 };

/** The plateau behind the cliffs: rolling, rising slowly inland to the Galtgarben. */
function plat(x: number, z: number) {
  const back = shoreZ(x) - z, c = crest(x);
  return ctop(x) + Math.max(0, back - c) * 0.018 + fbm(noise, x * 0.004, z * 0.004, 3) * 3 * smoothstep(c, c + 60, back)
    + 42 * Math.exp(-((x - GALT.x) ** 2 + (z - GALT.z) ** 2) / 170 ** 2);
}
const beachH = (back: number) => 0.4 + back * 0.06;

/** The gorges (Schluchten) from the beach up to the plateau, their floors graded: the first three carry the tracks. */
const GORGES = [
  [P(-330, 22), P(-322, 70), P(-340, 120), P(-330, 165)],           // Rauschen’s gorge
  [P(0, 16), P(12, 62), P(-14, 112), P(10, 168), P(0, 222)],         // the Wolfsschlucht at Warnicken
  [P(330, 32), P(318, 82), P(334, 140)],                             // the works road at Palmnicken
  [P(-150, 16), P(-138, 58), P(-158, 96)],                           // the Kaup gorge (a footpath)
  [P(210, 16), P(222, 54), P(214, 80)],                              // by Brüsterort (a footpath)
];
const GORGE_H = GORGES.map((g) => g.map(([x, z], i) => (i === 0 ? beachH(shoreZ(x) - z) : plat(x, z))));
const gorge = (x: number, z: number) => {
  let best = { d: Infinity, h: 0 };
  GORGES.forEach((g, i) => { const r = graded(g, GORGE_H[i], x, z); if (r.d < best.d) best = r; });
  return best;
};

const TRACKS = [
  [...GORGES[0], P(-330, 240)],
  [...GORGES[1], P(0, 262)],
  [...GORGES[2], P(330, 240)],
];
const ROADS = [
  ...TRACKS,
  [P(-600, 252), P(-330, 240), P(0, 262), P(330, 240), P(600, 254)],      // the coast road
  [P(0, 262), [0, -760], [0, -880]],                                       // to Galtgarben and Königsberg
  [P(-330, 240), [-230, -420], [0, -760]],
  [P(330, 240), [230, -420], [0, -760]],
  [P(-330, 240), P(-540, 150), P(-540, 46)],                               // to Cranz and its promenade
];
/** The Samlandbahn along the coast: Cranz, Rauschen, Warnicken, Palmnicken. */
const RAIL = [P(-600, 300), P(-330, 302), P(0, 330), P(330, 312), P(600, 330)];
/** The railway’s z at x. */
const railZ = (x: number) => { for (let i = 0; i < RAIL.length - 1; i++) { const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1]; if (x <= bx || i === RAIL.length - 2) return az + (bz - az) * (x - ax) / (bx - ax); } return RAIL[0][1]; };
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((p) => segDist(p, x, z))), EXT, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.2;
const railD = gridCache((x: number, z: number) => segDist(RAIL, x, z), EXT, 2);
const gorgeD = gridCache((x: number, z: number) => Math.min(...GORGES.map((g) => segDist(g, x, z))), EXT, 2);
const pitE = (x: number, z: number) => Math.hypot((x - PIT.x) / PIT.rx, (z - PIT.z) / PIT.rz);
const inPit = (x: number, z: number) => pitE(x, z) < 1;

function groundRaw(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz; // + out to sea
  if (d > 0) { // the sandy bottom shelving off, a bar eighty metres out
    const bar = 0.8 * bell(d, 80, 18);
    return Math.max(-0.4 - d * 0.04 - Math.max(0, d - 60) * 0.06 + bar, -16);
  }
  const back = -d, b = bw(x), f = fw(x), top = plat(x, z), bt = beachH(b);
  let h: number;
  if (back < b) h = beachH(back);
  else if (back < b + f) h = bt + (top - bt) * smoothstep(0, 1, (back - b) / f);
  else h = top;
  if (x < -440) h += smoothstep(-440, -500, x) * smoothstep(b - 4, b + 20, back) * smoothstep(140, 60, back) * (1 + ridged(noise, x * 0.02, z * 0.03, 2) * 4); // Cranz’s dunes
  // the gorges: a narrow floor, steep wooded sides
  const g = gorge(x, z);
  if (g.d < 80) h = Math.min(h, g.h + Math.max(0, g.d - 4) * 0.9 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.6 * smoothstep(4, 12, g.d));
  // the open pit: four benches down into the blue earth
  const e = pitE(x, z);
  if (e < 1) {
    const q = Math.min(1, Math.max(0, (e - 0.4) / 0.6)) * 4, k = Math.floor(q) + smoothstep(0.6, 1, q - Math.floor(q));
    h = Math.min(h, PIT.floor + (h - PIT.floor) * Math.min(1, k / 4));
  }
  h += (plat(x, z) - h) * smoothstep(40, 22, Math.hypot(x - PACT_BASE.x, z - PACT_BASE.z));
  return Math.max(h, 0.4);
}
const height = gridCacheSmooth(groundRaw, EXT, 2);

/** The beach sectors (x) and what each opens inland. */
export const SECTORS = [
  { x: -330, name: 'Rauschen beach', inland: W(-330, 240) },
  { x: 0, name: 'Wolfsschlucht', inland: W(0, 262) },
  { x: 330, name: 'Palmnicken beach', inland: W(330, 240) },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The Baltic Fleet', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Rauschen beach', ...W(-330, 18), owner: null, sector: 'west', radius: 45, opens: 'E' } as any,
  { id: 'C', name: 'Wolfsschlucht', ...W(0, 14), owner: null, sector: 'centre', radius: 45, opens: 'F' } as any,
  { id: 'D', name: 'Palmnicken beach', ...W(330, 20), owner: null, sector: 'east', radius: 45, opens: 'G' } as any,
  { id: 'E', name: 'Rauschen', ...SECTORS[0].inland, owner: null, sector: 'west' },
  { id: 'F', name: 'Warnicken', ...SECTORS[1].inland, owner: null, sector: 'centre' },
  { id: 'G', name: 'Palmnicken', ...SECTORS[2].inland, owner: null, sector: 'east' },
  { id: 'K', name: 'Galtgarben', x: 0, z: -760, owner: 'pact', sector: 'centre' },
];
/** The coastal batteries on the cliff top: at Brüsterort and east of Rauschen. */
const GUNS = [{ name: 'Batterie Brüsterort', x: 140, back: 95 }, { name: 'Batterie Rauschen', x: -220, back: 90 }].map((g) => ({ ...g, z: shoreZ(g.x) - g.back }));
const nearGorge = (x: number, z: number, m: number) => gorgeD(x, z) < m;
/** The trenches along the cliff top over each sector (not in a gorge). */
const TRENCHES = SECTORS.flatMap((s) => [-70, -40, 40, 70].map((dx) => W(s.x + dx, crest(s.x + dx) + 7))).filter((p) => !nearGorge(p.x, p.z, 20));

export default {
  id: 'samland',
  name: 'Samland Coast',
  description: 'A Russian landing on the Samland coast north of Königsberg, as the Stavka considered it but never tried: boats at dawn onto the narrow beaches under the wooded cliffs of the Steilküste and up its gorges, the amber works of Palmnicken with their open pit, the resorts of Rauschen and Cranz, against Landsturm trenches on the cliff top and German coastal batteries.',
  epochs: ['1918'],
  region: 'east',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Russia', pact: 'Germany' },
  armies: { nato: ['ru'], pact: ['de'] }, // (a Baltic Fleet landing force; the Landsturm and a reserve division from Königsberg)
  conditions: { time: 'dawn', weather: 'overcast' },
  wind: { from: 350, speed: 4, veer: 0.1 }, // (a northerly off the sea)
  size: SIZE,
  segments: 900,
  bounds: BOUNDS,
  navCell: 1.5,
  steep: 0.45, // (vehicles: not up the cliffs nor the gorges’ sides — by the gorge roads)
  camera: { maxHeight: 1000, near: 1, far: 7000 },
  seed: SEED,
  height,
  river: sea,
  fields: createFields({ seed: SEED, cell: 80, weights: [0.25, 0.25, 0.3, 0.2] as any }),

  theme: {
    // a grey late-summer dawn on the Baltic: the light coming up over Cranz, low cloud over the sea
    fogColor: 0xb4bcbe, fogDensity: 0.0007, skyTop: 0x66788a, skyHorizon: 0xd6d0c4, skyBottom: 0x8a8e88,
    sunColor: 0xffe2c0, sunIntensity: 1.6, sunDisk: 0.35, clouds: 0.5, cloudLight: 0xe8e2d8, cloudDark: 0x8a9098,
    sunDir: [-0.82, 0.28, 0.4], hemiSky: 0xc8d0d8, hemiGround: 0x5a5a40, hemiIntensity: 1.3, rimColor: 0xf0dcc0, rimIntensity: 0.3,
    terrain: {
      grass: '#5e6c3a', grassAlt: '#566432', dryGrass: '#a49862', dirt: '#6e5e46', rock: '#9a8c70',
      pasture: '#607040', ploughed: '#7a6a50', stubble: '#c2ac6a', meadow: '#687440',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const back = shoreZ(x) - z;
        if (back < -2) return [y > -1.5 ? 0xcfc4a2 : 0x4a6a70, 1];                               // the sand under the water
        if (inPit(x, z)) return [0x5c6864, 1];                                                  // the pit’s blue earth
        if (onRoad(x, z) && back > bw(x) - 4) return [0x9a8a66, 0.85];                          // the sand roads and gorge tracks
        if (railD(x, z) < 2.4) return [0x5a5248, 0.9];                                           // the railway’s ballast
        if (back < bw(x)) return [0xdcd0ac, 1];                                                 // the beach
        if (back < crest(x) && x > -440) { const v = fbm(noise, x * 0.02 + 30, z * 0.05, 2); return v > 0.05 ? null : [0xb8a27c, Math.min(0.9, (0.05 - v) * 4)]; } // the cliff face: bare sand and clay, grown over in places
        if (gorgeD(x, z) < 5) return [0x6e5e44, 0.8];                                            // the gorge floors
        if (x < -440 && back < 140) return [0xd4c8a0, 0.7 * smoothstep(-440, -500, x)];         // Cranz’s dunes
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 880, entries: SECTORS.map((s) => s.x) }, pact: { ...PACT_BASE, entries: [-330, 0, 330] } }, // (Russia lands: its ways in are the beach sectors)
  maxStacks: 24,
  cameraStart: { nato: { x: 0, z: 600 }, pact: { x: 0, z: -60 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'nato',
    // the Russian army has no landing boats of its own yet (data/units1918/ships.js): the side’s motor launches and ferries
    // stand in for the fleet’s cutters, the minesweepers’ boats and the requisitioned steamers
    craft: { infantry: ['ml'], vehicle: 'ferry' },
    launchZ: 780,
    signal: { t: 15, say: 'The boats are away from the transports — pull for the beaches under the cliffs', sayOther: 'Russian boats off Warnicken! They are landing — stand to!' },
    // what the landing would call in: the Noviks inshore, a cruiser of the Bogatyr class, the old battleship Slava
    // (none on the Russian list yet: the Baltic Fleet is built in the 1918 unit batch)
    navy: ['destroyer', 'lightCruiser', 'battleship'],
    forts: [
      ...GUNS.map((g) => ({ unit: 'coastBattery', name: g.name, x: g.x, z: g.z, facing: 0 })),
      { unit: 'artillery', x: -130, z: shoreZ(-130) - 420, facing: 0 },
      { unit: 'artillery', x: 180, z: shoreZ(180) - 430, facing: 0 },
    ],
    // the Landsturm’s trenches on the cliff top, MGs over each gorge, wire at the back of the beaches (gaps at the gorges)
    works: [
      ...TRENCHES.map((p) => ({ kind: 'trench', ...p, yaw: 0 })),
      ...SECTORS.flatMap((s) => [-28, 28].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, crest(s.x + dx) + 3), yaw: 0 }))).filter((p) => !nearGorge(p.x, p.z, 10)),
      ...SECTORS.map((s, i) => ({ kind: 'mgNest', x: GORGES[i][2][0] + 9, z: GORGES[i][2][1], yaw: 0 })),
      ...Array.from({ length: 82 }, (_, i) => -450 + i * 11).filter((x) => GORGES.every((g) => Math.abs(g[0][0] - x) > 16))
        .map((x) => ({ kind: 'wire', ...W(x, bw(x) - 5), yaw: 0 })),
      ...GUNS.flatMap((g) => [-26, 26].map((dx) => ({ kind: 'trench', ...W(g.x + dx, g.back + 26), yaw: 0 }))),
    ],
    // the coast’s garrison at dawn: Landsturm battalions on the cliff, their machine guns, gunners and a few marksmen
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'sniper', 'rifles', 'mortar', 'rifles', 'mgTeam'],
    hold: [...TRENCHES.map((p) => ({ x: p.x, z: p.z - 6 })), ...SECTORS.map((s) => s.inland)],
    // the reserve from Königsberg by the Galtgarben road: infantry and armoured cars
    counter: { t: 270, units: ['rifles', 'reconVehicle', 'mgTeam', 'rifles', 'rifles', 'mortar'], say: 'The reserve is coming up from Königsberg past the Galtgarben — infantry and armoured cars for the cliffs', sayOther: 'German infantry and armoured cars on the Galtgarben road!' },
    ai: { order: ['rifles', 'rifles', 'mgTeam', 'engineers', 'rifles', 'mortar', 'reconVehicle', 'rifles', 'mgTeam', 'sniper', 'rifles', 'artillery'], gunship: 'destroyer', gunships: 1, heavy: 'battleship', inshore: 420 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 800, defenceIncome: 1.4 },
    waves: [
      // dawn, the first wave: naval infantry and a regiment of the Baltic division into the Wolfsschlucht, a company on each flank
      { t: 0, units: [
        { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'engineers', sector: 1 },
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 },
      ] },
      { t: 150, say: 'The steamers are bringing in the second wave — and an Austin armoured car in a ferry', units: [{ unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 2 }, { unit: 'reconVehicle', sector: 1 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(SEED);
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const slope = (x: number, z: number) => Math.hypot(g(x + 3, z) - g(x - 3, z), g(x, z + 3) - g(x, z - 3)) / 6;
    const taken: number[][] = [];
    const free = (x: number, z: number, rad: number) => taken.every(([tx, tz, tr]) => Math.hypot(tx - x, tz - z) > tr + rad);
    const take = (x: number, z: number, rad: number) => taken.push([x, z, rad]);
    const nearPoint = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < m);
    const clear = (x: number, z: number, rad: number) => free(x, z, rad) && !nearPoint(x, z, rad + 8) && roadD(x, z) > rad + 4 && railD(x, z) > rad + 4
      && gorgeD(x, z) > rad + 14 && !inPit(x, z) && pitE(x, z) > 1.15 && shoreZ(x) - z > crest(x) + rad && slope(x, z) < 0.22;

    // ---- Cranz: the long pier (Seesteg) on its piles, the Kurhaus and the villas along the promenade
    {
      const px = -540, z0 = shoreZ(px) - 6, len = 170, deckY = 2.6;
      props.box('plain', px, deckY, z0 + len / 2, 4.5, 0.4, len, 0, 0x7a6448);
      for (let t = 4; t < len; t += 8) for (const s of [-1, 1]) {
        const z = z0 + t, bot = Math.min(g(px + s * 1.9, z), 0) - 0.5;
        props.box('plain', px + s * 1.9, (deckY + bot) / 2, z, 0.35, deckY - bot, 0.35, 0, 0x4a3c2c);
      }
      for (let t = 6; t < len; t += 10) for (const s of [-1, 1]) props.box('plain', px + s * 2.1, deckY + 0.6, z0 + t, 0.12, 1, 0.12, 0, 0x6a5a44); // (the railing posts)
      props.box('plain', px, deckY + 2, z0 + len - 6, 10, 3.4, 10, 0, 0xe0d8c8);   // (the pavilion at its head)
      props.box('plain', px, deckY + 4, z0 + len - 6, 11, 0.5, 11, 0, 0x5a3a2c);
      props.hall({ x: -577, z: shoreZ(-577) - 70, yaw: 0, width: 40, depth: 16, height: 9, color: 0xe4dccc, roof: 0x6a3a2a, door: 6, name: 'Kurhaus Cranz' });
      take(-577, shoreZ(-577) - 70, 24);
    }
    props.rand = mulberry32(SEED + 1);
    for (let i = 0, n = 0; i < 400 && n < 18; i++) {
      const x = -600 + r() * 150, z = shoreZ(x) - 60 - r() * 120;
      if (!clear(x, z, 6)) continue;
      props.townHouse({ x, z, yaw: (r() - 0.5) * 0.3, width: 9 + r() * 3, depth: 9 + r() * 2, storeys: 2 + (r() < 0.4 ? 1 : 0), name: 'villa', damaged: 0 }); take(x, z, 8); n++;
    }
    // fishing boats drawn up on Cranz’s beach
    for (let i = 0; i < 6; i++) { const x = -600 + i * 9, z = shoreZ(x) - 12 - r() * 8; props.box('plain', x, g(x, z) + 0.5, z, 2, 1, 6.5, 0.3 + r() * 0.3, 0x4a4036); }

    // ---- Rauschen: the villas among the pines above the beach, the church, the station
    for (let i = 0, n = 0; i < 1200 && n < 34; i++) {
      const x = -440 + r() * 230, z = shoreZ(x) - crest(x) - 10 - r() * 260;
      if (!clear(x, z, 6)) continue;
      props.townHouse({ x, z, yaw: (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.4, width: 9 + r() * 4, depth: 9 + r() * 3, storeys: 2 + (r() < 0.5 ? 1 : 0), name: 'villa', damaged: 0 }); take(x, z, 8); n++;
    }
    props.church({ x: -290, z: shoreZ(-290) - 210, yaw: 0.1 }); take(-290, shoreZ(-290) - 210, 14);

    // ---- Warnicken: the forester’s village behind the forest; Brüsterort’s lighthouse and keeper’s house on the headland
    farmVillage(props, SECTORS[1].inland.x, SECTORS[1].inland.z - 10, 6, SEED + 3, (x, z) => !clear(x, z, 4), 1.1);
    take(SECTORS[1].inland.x, SECTORS[1].inland.z - 10, 45);
    {
      const { x, z } = W(175, crest(175) + 18);
      props.column({ x, z, radius: 2.4, height: 26 });
      props.box('stone', x, g(x, z) + 27, z, 3.6, 2.4, 3.6, 0, 0x3a3a36);
      props.house({ x: x + 12, z: z - 10, yaw: 0, width: 9, depth: 7, height: 4 });
      take(x, z, 16);
    }

    // ---- Palmnicken: the amber works — the washing house by the pit, the old Anna shaft’s headframe, the conveyor, the miners’ houses
    {
      const wx = 400, wz = PIT.z - 80;
      props.hall({ x: wx, z: wz, yaw: 0.1, width: 40, depth: 22, height: 12, color: 0xa8846a, roof: 0x4a4c4e, door: 8, name: 'Bernsteinwerk' });
      props.hall({ x: wx + 40, z: wz - 30, yaw: 0.1, width: 26, depth: 16, height: 8, color: 0x9a7a62, roof: 0x4a4c4e, door: 6, name: 'works shed' });
      props.headframe({ x: 540, z: PIT.z - 90, yaw: 0, height: 26 });
      props.conveyor({ x0: PIT.x - 20, z0: PIT.z - 20, y0: PIT.floor + 2 - g(PIT.x - 20, PIT.z - 20), x1: wx + 14, z1: wz + 8, y1: 10 });
      take(wx, wz, 26); take(wx + 40, wz - 30, 16); take(540, PIT.z - 90, 12);
      // spoil heaps and boulders round the pit’s rim
      for (let i = 0; i < 30; i++) {
        const a = r() * Math.PI * 2, x = PIT.x + Math.cos(a) * PIT.rx * 1.2, z = PIT.z + Math.sin(a) * PIT.rz * 1.25;
        if (onRoad(x, z) || nearPoint(x, z, 14)) continue;
        props.boulder({ x, z, radius: 0.8 + r() * 1.5 });
      }
    }
    for (let i = 0, n = 0; i < 1200 && n < 26; i++) {
      const x = 240 + r() * 220, z = shoreZ(x) - 180 - r() * 140;
      if (!clear(x, z, 6)) continue;
      props.townHouse({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 3, depth: 8 + r() * 2, storeys: 2, damaged: 0 }); take(x, z, 7); n++;
    }
    props.church({ x: 300, z: shoreZ(300) - 200, yaw: -0.1 }); take(300, shoreZ(300) - 200, 14);

    // ---- the coastal batteries: sandbagged posts and the gunners’ tents
    for (const b of GUNS) {
      props.sandbagRing({ x: b.x + 18, z: b.z - 10, radius: 4.5, toward: 1 });
      props.sandbagRing({ x: b.x - 18, z: b.z - 12, radius: 4.5, toward: 1 });
      for (let i = 0; i < 3; i++) props.tent({ x: b.x - 20 + i * 12, z: b.z - 40, yaw: 0.1, color: 0x6e6a56 });
      take(b.x, b.z - 20, 30);
    }

    // ---- boulders on the beaches under the cliffs (the glacier’s erratics), clear of the gorge mouths
    for (let i = 0; i < 90; i++) {
      const x = -440 + r() * 700, z = shoreZ(x) - 3 - r() * (bw(x) - 6);
      if (gorgeD(x, z) < 20 || nearPoint(x, z, 10)) continue;
      props.boulder({ x, z, radius: 0.5 + r() * 1.3 });
    }

    // ---- the Samlandbahn: the rails, the stations, wagons on the sidings
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 30);
      for (let k = 0; k < n; k++) props.rails({ x0: ax + (bx - ax) * k / n, z0: az + (bz - az) * k / n, x1: ax + (bx - ax) * (k + 1) / n, z1: az + (bz - az) * (k + 1) / n });
    }
    for (const [x, name, w] of [[-360, 'Bahnhof Rauschen', 26], [40, 'Haltepunkt Warnicken', 12], [360, 'Bahnhof Palmnicken', 22], [-570, 'Bahnhof Cranz', 22]] as [number, string, number][]) {
      const z = railZ(x) - 11;
      props.hall({ x, z, yaw: 0, width: w, depth: 9, height: 6, color: 0xb88a6a, roof: 0x5a3a30, door: 3, name });
      take(x, z, w / 2 + 2);
    }
    for (const x of [-300, -286]) props.wagon({ x, z: railZ(x), yaw: Math.PI / 2, kind: 'box' });

    // ---- the farm villages inland, Germau’s church, the lookout on the Galtgarben
    for (const [x, z, n, seed] of [[-230, -380, 7, 5], [250, -400, 7, 6], [-110, -610, 8, 7], [380, -650, 5, 8], [-420, -640, 5, 9]] as number[][]) {
      farmVillage(props, x, z, n, SEED + seed, (px, pz) => !clear(px, pz, 4));
      take(x, z, 40);
    }
    props.church({ x: -100, z: -640, yaw: 0.2 });
    { const x = GALT.x, z = GALT.z; props.box('stone', x, g(x, z) + 7, z, 4, 14, 4, 0, 0x8a8478); props.box('stone', x, g(x, z) + 14.5, z, 5, 1, 5, 0, 0x6a665e); take(x, z, 8); }
    commandPost(props, this.bases.pact, 1, 0x6a6a52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: PACT_BASE.x, z: PACT_BASE.z, r: 30 },
      { test: (x: number, z: number) => onRoad(x, z) || railD(x, z) < 5 || pitE(x, z) < 1.1 || shoreZ(x) - z < bw(x) + 2 || gorgeD(x, z) < 4 || !free(x, z, 2) }];
    // the coastal pine forest along the cliff top (the Warnicker Forst thickest), pine woods inland, the Galtgarben wooded
    const pineF = (x: number, z: number) => {
      const back = shoreZ(x) - z, c = crest(x);
      if (back < c) return x > -440 ? 0.25 : -1;                                        // (a few on the cliff face)
      const band = back < c + 200 ? (Math.abs(x) < 200 ? 0.85 : 0.55) : 0;
      const galt = Math.hypot(x - GALT.x, z - GALT.z) < 150 ? 0.7 : 0;
      return Math.max(band, galt, smoothstep(0.18, 0.45, fbm(noise, x * 0.006 + 11, z * 0.006, 2)) * 0.7);
    };
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 2600, broadleaf: 0.15, autumn: 0.1, size: 0.8, maxY: 200, forest: pineF });
    // beech and alder down the gorges, a few in the villages
    const beech = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 900, broadleaf: 1, autumn: 0.15, size: 0.7, maxY: 200,
      forest: (x: number, z: number) => (gorgeD(x, z) < 34 ? 0.9 : -1) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1, fields: this.fields,
      avoid: [{ test: (x: number, z: number) => onRoad(x, z) || pitE(x, z) < 1.05 || shoreZ(x) - z < bw(x) + 1 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { pines.update?.(dt, t); beech.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
