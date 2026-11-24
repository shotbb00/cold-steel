// Dunkirk, spring 1918 (coastal, the 1918 epoch: Germany lands, Britain and France hold; 1.2 × 1.8 km).
// A hypothetical battle. Dunkirk was the BEF’s supply port nearest the front in Flanders, and the German navy’s
// Flanders flotillas (the destroyers and torpedo boats out of Zeebrugge and Ostend, the U-boats of Bruges) raided
// the Dover Strait and shelled the town again and again, from the sea and with the long guns on the Belgian coast.
// During the Spring Offensive of 1918, with the Lys battle driving on Hazebrouck, the Marinekorps Flandern drew up
// plans for raids behind the Allied line. This map plays the one that was never made: a dawn landing by the
// Marinekorps’ sailors and marine infantry from the flotillas’ motor launches and ferries, to wreck the port and
// cut the British army’s supply line while the offensive breaks through inland.
// The ground, compressed: the sea is to the north (on the map toward −z, where the Germans come from), west is −x.
// The port: the long timber-and-stone West and East Jetties (the East Jetty’s head with its battery) reaching out
// to sea round the channel into the avant-port; the stone quays, the Bassin du Commerce and the Bassin de la Marine
// with their cranes and warehouses, the Leughenaer, the old watchtower over the basins; behind them the town round
// the belfry of St Eloi. East of the East Jetty the wide flat beach of Malo-les-Bains under its sea wall, the Digue
// with its promenade and slipways, the seafront villas and the Kursaal; further east the high dunes toward
// Zuydcoote and Bray-Dunes, the Fort des Dunes in them and the sanatorium beyond. Inland the Canal de Furnes across
// the whole map (four bridges), and beyond it the market gardens of Rosendaël and the railway yards of
// Coudekerque. British and French coastal batteries and anti-aircraft guns cover the port.
// Laid out like Operation Albion (maps/albion.ts): built in a frame with the sea toward +z (`F`), then turned round
// so the lander (pact) has the sea on −z (systems/Landing.js lands()). The boats come alongside the quays in the
// avant-port and run up onto the beaches (systems/Landing.js `wall`: the quay faces, else the waterline).
// A scenario, not a fair battle (MAP_BRIEF_SEA_COAST.md): balanced with AI-vs-AI runs so the landing wins late or
// the defence just holds.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2200;
const BOUNDS = { x: 600, z: 900 };
const EXT = { x: 610, z: 910 };
const SEED = 1918_0412;
const noise = createNoise2D(SEED);
const sea = createSea({ level: 0, size: SIZE, color: 0x4a5e60 }); // (the grey-green Channel off Flanders)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world

/** The shore (local z): the port’s straight quay face, the beach east of the East Jetty a little ragged. */
const SH = 300;
const DECK = 3; // (the quays and the jetties: clear of the tide)
const PORT_X = -290; // (west of this the port, east of it the beach)
const shoreZ = (x: number) => SH + (fbm(noise, x * 0.006, 4.2, 2) * 5 + 8 * smoothstep(250, 600, x)) * smoothstep(-285, -200, x);
const back = (x: number, z: number) => SH - z; // (m inland of the port’s quay line)

/** The jetties out to sea round the channel (centre x, half-width, length; a round head). */
const JETTIES = [
  { x: -500, half: 6, len: 360, head: 12, name: 'Jetée de l’Ouest' },
  { x: -300, half: 7, len: 430, head: 19, name: 'Jetée de l’Est' },
];
const inJetty = (x: number, z: number) => JETTIES.some((j) => (Math.abs(x - j.x) <= j.half && z >= SH - 1 && z <= SH + j.len) || Math.hypot(x - j.x, z - SH - j.len) <= j.head);
/** The basins behind the quays [x0, x1, back0, back1]. */
const BASINS = [
  { x0: -555, x1: -450, b0: 60, b1: 190, name: 'Bassin du Commerce' },
  { x0: -400, x1: -300, b0: 70, b1: 170, name: 'Bassin de la Marine' },
];
const inBasin = (x: number, z: number) => BASINS.some((b) => x > b.x0 && x < b.x1 && back(x, z) > b.b0 && back(x, z) < b.b1);
/** The Canal de Furnes, across the whole map behind the town; its bridges (x). */
const canalZ = (x: number) => SH - 470 + 10 * Math.sin(x * 0.004);
const BRIDGES = [-560, -410, 30, 368];
const inCanal = (x: number, z: number) => Math.abs(z - canalZ(x)) < 9;
const onBridge = (x: number) => BRIDGES.some((b) => Math.abs(x - b) < 7);

/** Malo’s sea wall (the Digue): the beach to 70 m, the wall, the promenade on top to 92 m; slipways down at these x. */
const DIGUE = { x0: -285, x1: 225, foot: 70, top: 75, back: 92, h: 6.5 };
const SLIPS = [-170, 30, 150];
const digueK = (x: number) => smoothstep(DIGUE.x0 - 8, DIGUE.x0, x) * smoothstep(DIGUE.x1 + 15, DIGUE.x1, x);
/** The dunes toward Zuydcoote (0–1 at `b` m back). */
const duneK = (x: number, b: number) => smoothstep(180, 260, x) * smoothstep(25, 70, b) * smoothstep(340, 260, b + fbm(noise, 7, x * 0.01, 2) * 30);
const FORT = { x: 420, b: 290, r: 46 };

/** The roads (local): through the town past the belfry, down the Digue to Malo beach, the dune track past the fort, the Furnes road, the road behind the canal. */
const ROADS = [
  [[-400, SH - 12], [-425, SH - 60], [-425, SH - 200], [-400, SH - 330], [-410, canalZ(-410)], [-380, SH - 700], [-380, -900]],
  [[30, SH - 40], [30, canalZ(30)], [20, -700], [0, -860]],
  [[340, SH - 25], [345, SH - 160], [350, SH - 300], [368, canalZ(368)], [300, -700], [0, -860]],
  [[-600, SH - 330], [-400, SH - 330], [30, SH - 300], [350, SH - 300], [600, SH - 320]],
  [[DIGUE.x0, SH - 84], [DIGUE.x1, SH - 84]],
  [[-600, -700], [600, -700]],
];
const RAIL = [[-580, SH - 30], [-570, SH - 250], [-560, canalZ(-560)], [-450, -640], [-250, -735], [320, -735]];
const SIDINGS = [-720, -750, -765].map((z) => [[-230, z], [300, z]]);
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((p) => segDist(p, x, z))), EXT, 2);
const railD = gridCache((x: number, z: number) => Math.min(segDist(RAIL, x, z), ...SIDINGS.map((p) => segDist(p, x, z))), EXT, 2);
const onRoadL = (x: number, z: number) => roadD(x, z) < 3.5;
const onRoad = (x: number, z: number) => onRoadL(x, F * z);

/** The land before the jetties, basins, canal and sea are cut in (local), sampled once: the dunes’ noise is dear. */
const land = gridCacheSmooth((x: number, z: number) => {
  const b = Math.max(0, back(x, z)), bs = Math.max(0, shoreZ(x) - z);
  const port = smoothstep(PORT_X + 10, PORT_X - 10, x);
  let h = 3.6 - smoothstep(380, 560, b) * 1.2 + fbm(noise, x * 0.004, z * 0.004, 2) * 0.6;      // the flat Flemish polder, lower beyond the canal
  const beach = Math.min(h, 0.5 + bs * 0.035);
  h = port * Math.max(DECK, h) + (1 - port) * (b < 110 ? Math.max(beach, Math.min(h, beach + Math.max(0, bs - 60) * 0.08)) : h);
  const dk = digueK(x) * (1 - port);
  if (dk > 0) { // the Digue: a stone face straight up from the sand, the promenade on top, the town just under it behind
    let dg = bs < DIGUE.foot ? beach : bs < DIGUE.top ? beach + (DIGUE.h - beach) * smoothstep(DIGUE.foot, DIGUE.top, bs) : bs < DIGUE.back ? DIGUE.h : h + (DIGUE.h - h) * smoothstep(200, DIGUE.back, bs);
    for (const s of SLIPS) { const k = smoothstep(9, 5, Math.abs(x - s)); if (k > 0 && bs > 40 && bs < DIGUE.top + 1) dg += (beach + (DIGUE.h - beach) * smoothstep(40, DIGUE.top, bs) - dg) * k; }
    h += (dg - h) * dk;
  }
  const dn = duneK(x, bs);
  if (dn > 0) { // the dunes: high, loose, with saddles where the track and the fort’s glacis are
    const track = smoothstep(26, 8, segDist(ROADS[2], x, z));
    h += dn * (3 + ridged(noise, x * 0.014 + 2, z * 0.018, 3) * 11 + 3 * smoothstep(300, 550, x)) * (1 - 0.85 * track);
  }
  const fd = Math.hypot(x - FORT.x, b - FORT.b);
  h += (6 - h) * smoothstep(FORT.r + 25, FORT.r + 5, fd);                                        // the fort’s levelled ground in the dunes
  return h;
}, EXT, 2);

function heightL(x: number, z: number) {
  if (inJetty(x, z)) return DECK;
  const sz = shoreZ(x), d = z - sz; // + out to sea
  if (d > 0) { // the sea: the dredged port approach deep up to the quays, the beach’s sand shelving off east of the East Jetty
    const port = smoothstep(-270, -300, x);
    const sand = Math.max(-0.4 - d * 0.09 - Math.max(0, d - 60) * 0.03, -14);
    return port * Math.max(-8 - d * 0.004, -12) + (1 - port) * sand + fbm(noise, x * 0.01, z * 0.01, 2) * 0.3;
  }
  if (inBasin(x, z)) return -7;
  if (inCanal(x, z) && !onBridge(x)) return -2.5;
  return land(x, z);
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The quay faces the boats come alongside (local): [ax, az, bx, bz, nx, nz, half] — the jetties’ heads and sides, the quay between. */
const FACES: number[][] = [];
for (const j of JETTIES) {
  const h = SH + j.len, l = j.x - j.half, r = j.x + j.half;
  FACES.push([j.x - j.head, h + j.head * 0.7, j.x + j.head, h + j.head * 0.7, 0, 1, j.head], [l, SH, l, h, -1, 0, j.half], [r, SH, r, h, 1, 0, j.half]);
}
FACES.push([-600, SH, -506, SH, 0, 1, 16], [-494, SH, -307, SH, 0, 1, 16]);
/** The nearest wall (systems/Landing.js `alongside`), in world coordinates: a quay face in the port, the waterline on the beaches. */
function wall(wx: number, wz: number) {
  const x = wx, z = F * wz;
  let best: any = null;
  if (x > -275) { const sz = shoreZ(x); best = { x, z: sz, nx: 0, nz: 1, d: Math.abs(z - sz), half: 20 }; } // (the beach: they jump down into the shallows and wade the last metres)
  else for (const [ax, az, bx, bz, nx, nz, half] of FACES) {
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) best = { x: px + nx * 1.2, z: pz + nz * 1.2, nx, nz, d, half };
  }
  return { ...best, z: F * best.z, nz: F * best.nz };
}

const inDunkirk = (x: number, z: number) => x < PORT_X && back(x, z) > 200 && back(x, z) < 455;
const inMalo = (x: number, z: number) => x >= PORT_X && x < 230 && back(x, z) > DIGUE.back + 2 && back(x, z) < 440;

/** The landing’s three ways in (x) and what each opens ashore (local). */
export const SECTORS = [
  { x: -400, name: 'Avant-port', inland: { x: -400, z: SH - 330 } },
  { x: 40, name: 'Malo beach', inland: { x: 40, z: SH - 230 } },
  { x: 340, name: 'Zuydcoote dunes', inland: { x: FORT.x, z: SH - FORT.b } },
];

const points: (ControlPointDef & { opens?: string })[] = [
  { id: 'A', name: 'The Flanders flotilla', ...W(0, 800), owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Avant-port', ...W(-400, SH - 26), owner: null, sector: 'west', radius: 34, opens: 'E' },
  { id: 'C', name: 'Malo beach', ...W(40, shoreZ(40) - 40), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Zuydcoote dunes', ...W(340, shoreZ(340) - 38), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Belfry of St Eloi', ...W(SECTORS[0].inland.x, SECTORS[0].inland.z), owner: null, sector: 'west', radius: 40 },
  { id: 'F', name: 'Malo-les-Bains', ...W(SECTORS[1].inland.x, SECTORS[1].inland.z), owner: null, sector: 'centre', radius: 40 },
  { id: 'G', name: 'Fort des Dunes', ...W(FORT.x, SH - FORT.b), owner: null, sector: 'east', radius: 40 },
  { id: 'K', name: 'Coudekerque yards', ...W(0, -790), owner: 'nato', sector: 'centre' },
];
const B = (x: number, b: number) => W(x, shoreZ(x) - b); // (x, m back from the waterline) → world

export default {
  id: 'dunkirk-1918',
  name: 'Dunkirk 1918',
  description: 'Dunkirk in the spring of 1918, as it might have gone: the Marinekorps Flandern lands from the Flanders flotillas to cut the BEF’s supply port during the German offensive. The long jetties and the avant-port, the basins with their cranes and warehouses, the Leughenaer and the belfry of St Eloi, the wide beach of Malo-les-Bains under its sea wall and villas, the dunes toward Zuydcoote with the Fort des Dunes, the Canal de Furnes and the railway yards.',
  epochs: ['1918'],
  region: 'europe',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Britain and France', pact: 'Germany' },
  armies: { nato: ['uk', 'fr'], pact: ['de', 'st'] },
  airfields: [], // (systems/Airfields.js: a port, a town, a beach and dunes — the RNAS flies from St Pol, off the map)
  conditions: { time: 'dawn', weather: 'overcast' },
  wind: { from: 330, speed: 5, veer: 0.1 }, // (a north-westerly off the Channel)
  size: SIZE,
  segments: 900,
  bounds: BOUNDS,
  navCell: 1.5,
  steep: 0.45, // (vehicles: not up the Digue’s face nor the dunes — by the slipways and the track)
  camera: { maxHeight: 1000, near: 1, far: 7000 },
  seed: SEED,
  height,
  river: sea,
  fields: createFields({ seed: SEED, cell: 60, weights: [0.45, 0.2, 0.15, 0.2] as any }),

  theme: {
    // a grey April dawn on the Flemish coast: low cloud, the light coming up flat over the polders
    fogColor: 0xa4aaac, fogDensity: 0.0006, skyTop: 0x5e6c7c, skyHorizon: 0xc4c6c2, skyBottom: 0x868c8a,
    sunColor: 0xf2e2c8, sunIntensity: 1.6, sunDisk: 0.25, clouds: 0.6, cloudLight: 0xd6d8d8, cloudDark: 0x788088,
    sunDir: [0.5, 0.32, 0.8], hemiSky: 0xc4ccd4, hemiGround: 0x6a6a52, hemiIntensity: 1.3, rimColor: 0xd4d8da, rimIntensity: 0.22,
    terrain: {
      grass: '#5e6a3e', grassAlt: '#566238', dryGrass: '#8c8a5c', dirt: '#6e604a', rock: '#9a9482',
      pasture: '#627040', ploughed: '#6a5a44', stubble: '#9a8e62', meadow: '#66743e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, wz: number, y: number) {
        const z = F * wz, sz = shoreZ(x), b = back(x, z), bs = sz - z;
        if (inJetty(x, z)) return [0x8e8a7e, 1];                                                    // the jetties’ planking and stone
        if (z > sz + 1) return [y > -2 ? 0xb4aa8c : 0x4a5856, 1];                                  // under the water
        if ((inBasin(x, z) || inCanal(x, z)) && y < 1) return [0x4a5450, 1];
        if (onRoadL(x, z)) return [0x84806e, 0.9];                                                   // the roads, the promenade
        if (railD(x, z) < 2.4) return [0x6a6256, 0.9];                                               // the railway’s ballast
        if (x < PORT_X && b < 200) return [0x8e8a80, 1];                                             // the quays
        if (digueK(x) > 0.5 && bs > DIGUE.foot && bs < DIGUE.back + 1) return [0xb2aa9c, 1];        // the Digue’s face and promenade
        if (x >= PORT_X && bs < 70) return [bs < 10 ? 0xb8ac8a : 0xd8cca8, 1];                      // Malo’s sand, wet at the water’s edge
        if (inDunkirk(x, z) || inMalo(x, z)) return [0x948e82, 0.8];                                 // the streets and yards
        const dn = duneK(x, bs);
        if (dn > 0.25) return [0xd4c89e, Math.min(1, dn * 1.3)];                                    // the dunes’ pale sand
        return null;                                                                                 // the market gardens, the fields
      },
    },
  },

  bases: { nato: { ...W(0, -860), entries: [-380, 20, 300] }, pact: { ...W(0, 860), entries: SECTORS.map((s) => s.x) } }, // (the Germans land: their ways in are the sectors)
  maxStacks: 24,
  cameraStart: { nato: { ...W(0, SH - 200) }, pact: { ...W(0, 620) } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    wall,
    // the German army has no landing boats of its own (data/units1918/ships.js): the side’s motor launches and ferries stand in for
    // the flotillas’ boats and the harbour craft taken at Zeebrugge and Ostend
    craft: { infantry: ['ml', 'ml', 'ferry'], vehicle: 'ferry' },
    launchZ: 820,
    signal: { t: 15, say: 'The torpedo boats cast off the launches — the Marinekorps goes in under the smoke', sayOther: 'Boats off the jetties and Malo! The Germans are landing — stand to!' },
    // the Flanders flotillas: the torpedo boats (S 53, V 69 …), the A-boats, the LM motor boats — no big ships in the Flanders bases
    navy: ['destroyer', 'frigate', 'ptBoat'],
    // the guns: the battery on the East Jetty’s head, the French battery in the dunes, the Royal Marine Artillery’s behind Malo,
    // the anti-aircraft guns by the port and a field battery at Rosendaël
    forts: [
      { unit: 'moleBattery', ...W(JETTIES[1].x, SH + JETTIES[1].len), facing: Math.PI, name: 'Batterie de la Jetée' },
      { unit: 'coastBattery', ...B(530, 190), facing: Math.PI, name: 'Batterie de Zuydcoote' },
      { unit: 'coastBattery', ...W(-200, SH - 320), facing: Math.PI, name: 'RMA battery' },
      { unit: 'aa', ...W(-530, SH - 210), facing: Math.PI },
      { unit: 'artillery', ...W(120, SH - 560), facing: Math.PI },
    ],
    works: [
      // the avant-port: wire across the quay (gaps for the streets) and the jetties’ roots, Maxims on the quay
      ...[-480, -466, -452, -380, -366, -352, -338].map((x) => ({ kind: 'wire', ...W(x, SH - 12), yaw: 0 })),
      ...JETTIES.map((j) => ({ kind: 'wire', ...W(j.x, SH + 30), yaw: 0 })),
      { kind: 'mgNest', ...W(-445, SH - 30), yaw: 0 }, { kind: 'mgNest', ...W(-355, SH - 30), yaw: 0 },
      // Malo: wire along the beach under the Digue (gaps at the slipways), Maxims on the promenade, a trench across the main street
      ...Array.from({ length: 44 }, (_, i) => -270 + i * 11).filter((x) => SLIPS.every((s) => Math.abs(s - x) > 12)).map((x) => ({ kind: 'wire', ...B(x, 55), yaw: 0 })),
      { kind: 'mgNest', ...B(-60, 86), yaw: 0 }, { kind: 'mgNest', ...B(120, 86), yaw: 0 },
      ...[-10, 10, 50, 70].map((x) => ({ kind: 'trench', ...B(x, 100), yaw: 0 })),
      // the dunes: trenches and Maxims on the first dune crest, wire on the beach (a gap at the track)
      ...[290, 310, 375, 395, 420].map((x) => ({ kind: 'trench', ...B(x, 72), yaw: 0 })),
      { kind: 'mgNest', ...B(270, 64), yaw: 0 }, { kind: 'mgNest', ...B(440, 64), yaw: 0 },
      ...Array.from({ length: 30 }, (_, i) => 240 + i * 11).filter((x) => Math.abs(x - 340) > 14).map((x) => ({ kind: 'wire', ...B(x, 30), yaw: 0 })),
      // the fort’s glacis
      ...[-24, 0, 24].map((dx) => ({ kind: 'trench', ...W(FORT.x + dx, SH - FORT.b + FORT.r + 14), yaw: 0 })),
    ],
    // the garrison: British base troops and French territorials at the port, the Maxims, the gunners
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'sniper', 'rifles', 'mortar', 'rifles', 'mgTeam'],
    hold: [
      W(-445, SH - 40), W(-355, SH - 40), B(-60, 96), B(120, 96), B(20, 110), B(300, 80), B(400, 80),
      ...SECTORS.map((s) => W(s.inland.x, s.inland.z)), W(FORT.x, SH - FORT.b),
    ],
    // the reserve from Coudekerque: a British battalion off the trains, the armoured cars, a tank from the Tank Corps’ depot
    counter: { t: 180, units: ['rifles', 'mgTeam', 'reconVehicle', 'rifles', 'tank', 'rifles'], say: 'The reserve is coming up from the yards at Coudekerque — over the canal bridges and into them!', sayOther: 'British infantry and armoured cars coming over the canal from Coudekerque!' },
    ai: { order: ['rifles', 'rifles', 'mgTeam', 'engineers', 'rifles', 'mortar', 'rifles', 'mgTeam', 'sniper', 'rifles', 'artillery', 'rifles'], gunship: 'destroyer', gunships: 1, heavy: null, inshore: 420 },
    economy: { reserves: 2000, perSector: 400, beachIncome: 0.7, defenceCp: 800, defenceIncome: 1.4 }, // (AI vs AI 2026-11-24: the landing wins late or the port just holds)
    waves: [
      // dawn, the first wave: the Matrosen into the avant-port, the marine infantry onto Malo beach and the dunes
      { t: 0, units: [
        { unit: 'rifles', sector: 0, name: 'Matrosen-Regiment 1' }, { unit: 'rifles', sector: 0, name: 'Matrosen-Regiment 2' }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 1, name: 'Marine-Infanterie 1' }, { unit: 'rifles', sector: 1, name: 'Marine-Infanterie 2' }, { unit: 'mgTeam', sector: 1 }, { unit: 'engineers', sector: 1, name: 'Marine-Pioniere' },
        { unit: 'rifles', sector: 2, name: 'Marine-Infanterie 3' }, { unit: 'mgTeam', sector: 2 },
      ] },
      { t: 150, say: 'The ferries are bringing in the second wave — the Marine-Sturmabteilung and the trench mortars', units: [{ unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 2 }, { unit: 'mortar', sector: 1 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(SEED);
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, F * z); // (local)
    const BRICK = 0x8a5a44, STONE = 0xb4ac9a, WARE = 0x9a7e66, SLATE = 0x45484c, IRON = 0x4e4640, TILE = 0x8a4e3a;
    const taken: number[][] = [];
    const free = (x: number, z: number, rad: number) => taken.every(([tx, tz, tr]) => Math.hypot(tx - x, tz - z) > tr + rad);
    const take = (x: number, z: number, rad: number) => taken.push([x, z, rad]);
    const nearPoint = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - F * z) < d + (p.radius ?? 30) * 0.6);
    const clear = (x: number, z: number, rad: number) => free(x, z, rad) && !nearPoint(x, z, rad) && roadD(x, z) > rad + 4 && railD(x, z) > rad + 3 && !inBasin(x, z) && Math.abs(z - canalZ(x)) > rad + 12;
    const cyl = (x: number, z: number, y: number, r0: number, r1: number, h: number, color: number, key = 'stone') => {
      const w = W(x, z);
      props.push(key, new THREE.CylinderGeometry(r0, r1, h, 16), new THREE.Matrix4().makeTranslation(w.x, y + h / 2, w.z), color);
    };
    for (const p of [...ROADS[3], ...SECTORS.map((s) => [s.inland.x, s.inland.z])]) take(p[0], p[1], 6);
    take(-200, SH - 320, 40); take(-530, SH - 210, 14); take(120, SH - 560, 34); // (the batteries’ ground)

    // ---- the jetties: lamp posts along them, the light on the West Jetty’s head, the battery’s sandbags on the East Jetty’s
    for (const j of JETTIES) for (let t = 20; t < j.len; t += 24) for (const s of [-1, 1]) props.column({ ...W(j.x + s * (j.half - 0.8), SH + t), radius: 0.3, height: t % 48 < 24 ? 0.8 : 3.5 });
    { const j = JETTIES[0]; cyl(j.x, SH + j.len, DECK, 2.2, 3, 14, 0xd8d0c0); cyl(j.x, SH + j.len, DECK + 14, 1.6, 1.6, 2.5, 0x8a2e26, 'plain'); }
    { const j = JETTIES[1]; props.sandbagRing({ ...W(j.x, SH + j.len - 22), radius: 6, toward: F }); }

    // ---- the port: cranes along the quays and the basins, warehouses behind, the quay railway, the Leughenaer
    const crane = (x: number, z: number, nx: number, nz: number) => { // (local; its jib out over the water toward n)
      const y = g(x, z), w = W(x, z), dx = nx, dz = F * nz;
      for (const [ax, az] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) props.box('metal', w.x + ax, y + 4, w.z + az, 0.5, 8, 0.5, 0, IRON);
      props.box('metal', w.x, y + 8.3, w.z, 5, 0.6, 5, 0, IRON);
      props.box('metal', w.x, y + 11, w.z, 1.6, 5, 1.6, 0, IRON);
      props.box('metal', w.x + dx * 6, y + 13.5, w.z + dz * 6, 0.7, 0.7, 14, Math.atan2(dx, dz), IRON);
      cover.addCylinder({ x: w.x, z: w.z, radius: 1.2, height: 10 });
      take(x, z, 5);
    };
    for (const x of [-590, -560, -530, -470, -340, -320]) crane(x, SH - 7, 0, 1);
    for (const bs of BASINS) for (let x = bs.x0 + 20; x < bs.x1 - 10; x += 45) crane(x, SH - bs.b1 - 6, 0, 1);
    for (const [x, b, w] of [[-530, 30, 50], [-330, 214, 50], [-490, 252, 36]] as number[][]) {
      if (!clear(x, SH - b, 12)) continue;
      props.hall({ ...W(x, SH - b), yaw: 0, width: w, depth: 22, height: 11, color: WARE, roof: SLATE, door: 6, name: 'warehouse' });
      take(x, SH - b, w / 2);
    }
    for (const bs of BASINS) { // the quays between the basins and the sea: long sheds
      const x = (bs.x0 + bs.x1) / 2, b = (bs.b0 + 20) / 2 + 12;
      if (clear(x, SH - b, 10)) { props.hall({ ...W(x, SH - b), yaw: 0, width: bs.x1 - bs.x0 - 30, depth: 16, height: 9, color: 0xa08a70, roof: SLATE, door: 6, name: 'transit shed' }); take(x, SH - b, (bs.x1 - bs.x0) / 2 - 10); }
    }
    for (let i = 0; i < RAIL.length - 1; i++) { const a = W(RAIL[i][0], RAIL[i][1]), c = W(RAIL[i + 1][0], RAIL[i + 1][1]); props.rails({ x0: a.x, z0: a.z, x1: c.x, z1: c.z }); }
    for (const [x, b] of [[-575, 120], [-572, 170]] as number[][]) props.wagon({ ...W(x, SH - b), yaw: 0, kind: 'box' });
    for (let i = 0; i < 26; i++) { // crates and coal on the quays (the BEF’s stores)
      const x = -600 + r() * 300, b = 16 + r() * 36;
      if (!clear(x, SH - b, 3) || x > -506 && x < -494) continue;
      props.crates({ ...W(x, SH - b), yaw: r() * 3 }); take(x, SH - b, 3);
    }
    // the Leughenaer: the round brick watchtower of the old walls over the Bassin du Commerce
    { const x = -470, b = 212; cyl(x, SH - b, g(x, SH - b), 4.4, 5, 28, BRICK); cyl(x, SH - b, g(x, SH - b) + 28, 2.4, 2.4, 4, 0x6a4a3a); cover.addCylinder({ ...W(x, SH - b), radius: 5, height: 28 }); take(x, SH - b, 8); }

    // ---- the town: the belfry of St Eloi and its church, the brick streets round them
    {
      const x = -355, b = 350, y = g(x, SH - b), w = W(x, SH - b);
      props.box('stone', w.x, y + 24, w.z, 10, 48, 10, 0, BRICK);
      props.box('stone', w.x, y + 50, w.z, 8, 4, 8, 0, 0x9a8a72);
      props.push('plain', new THREE.ConeGeometry(4.6, 9, 4), new THREE.Matrix4().compose(new THREE.Vector3(w.x, y + 56.5, w.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 4, 0)), new THREE.Vector3(1, 1, 1)), 0x3a4a48);
      cover.addBox({ x: w.x, z: w.z, yaw: 0, length: 10, thickness: 10, height: 48 });
      take(x, SH - b, 9);
      props.church({ ...W(-345, SH - 390), yaw: 0 }); take(-345, SH - 390, 16);
    }
    for (let x = -590; x <= -300; x += 34) for (let b = 240; b <= 450; b += 34) {
      const z = SH - b;
      if (!clear(x, z, 14)) continue;
      for (const [dx, dz] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) props.townHouse({ ...W(x + dx, z + dz), yaw: 0, width: 12, depth: 11, storeys: 2 + (r() < 0.5 ? 1 : 0), damaged: r() < 0.25 ? 0.3 : 0 }); // (some shelled: the raids of 1917)
      take(x, z, 17);
    }

    // ---- Malo: the parapet and lamps along the Digue, the Kursaal and the villas facing the sea, the streets behind
    for (let x = DIGUE.x0 + 6; x < DIGUE.x1 - 4; x += 12) {
      if (SLIPS.some((s) => Math.abs(s - x) < 11)) continue;
      props.lowWall({ ...B(x, DIGUE.top + 0.6), yaw: 0, length: 11, height: 0.9, color: 0xa8a092 });
      if (Math.round(x / 12) % 3 === 0) props.column({ ...B(x, DIGUE.top + 3), radius: 0.2, height: 4.2 });
    }
    props.hall({ ...B(-90, 112), yaw: 0, width: 56, depth: 24, height: 13, color: 0xe0d6c0, roof: TILE, door: 8, name: 'Kursaal' }); take(-90, shoreZ(-90) - 112, 30);
    for (let x = DIGUE.x0 + 12; x < DIGUE.x1 - 6; x += 17) {
      const bs = 104 + (r() < 0.5 ? 0 : 3), z = shoreZ(x) - bs;
      if (!clear(x, z, 7)) continue;
      props.townHouse({ ...W(x, z), yaw: 0, width: 11 + r() * 3, depth: 10, storeys: 3, name: 'villa', damaged: 0 }); take(x, z, 8);
    }
    props.church({ ...W(85, SH - 255), yaw: 0 }); take(85, SH - 255, 16); // (Notre-Dame-du-Sacré-Cœur, Malo)
    for (let i = 0, n = 0; i < 4000 && n < 150; i++) {
      const x = PORT_X + r() * (230 - PORT_X), z = SH - 125 - r() * 320;
      if (!inMalo(x, z) || !clear(x, z, 7)) continue;
      const big = r() < 0.3;
      if (big) props.townHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9 + r() * 3, depth: 9 + r() * 2, storeys: 2 + Math.floor(r() * 2), name: 'villa', damaged: 0 });
      else props.house({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 3, depth: 7 + r() * 2, height: 5 + r() * 2 });
      take(x, z, 8); n++;
    }

    // ---- the Fort des Dunes: the ramparts round its parade, the casemates, the gate toward the track
    {
      const n = 10;
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
        if (Math.abs(Math.cos(am) + 1) < 0.2) continue; // (the gate on the west)
        const ax = FORT.x + Math.cos(a0) * FORT.r, az = SH - FORT.b + Math.sin(a0) * FORT.r, bx = FORT.x + Math.cos(a1) * FORT.r, bz = SH - FORT.b + Math.sin(a1) * FORT.r;
        const mx = (ax + bx) / 2, mz = (az + bz) / 2, w = W(mx, mz), len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, F * (bz - az)) - Math.PI / 2;
        props.box('stone', w.x, g(mx, mz) + 1.6, w.z, len + 1, 3.2, 4, yaw, 0x8a8a78);
        cover.addBox({ x: w.x, z: w.z, yaw, length: len + 1, thickness: 4, height: 3.2 });
      }
      for (const [dx, db] of [[-12, 14], [14, 10], [6, -18]]) props.hall({ ...W(FORT.x + dx, SH - FORT.b - db), yaw: 0, width: 14, depth: 8, height: 4, color: 0x9a9480, roof: 0x5a6a48, door: 3, name: 'casemate' });
      take(FORT.x, SH - FORT.b, FORT.r + 6);
    }
    // the sanatorium of Zuydcoote among the dunes, and the villas of Bray-Dunes along the edge of them
    if (clear(540, SH - 390, 30)) { props.hall({ ...W(540, SH - 390), yaw: 0, width: 70, depth: 20, height: 14, color: 0xd8ccb4, roof: TILE, door: 6, name: 'Sanatorium' }); take(540, SH - 390, 38); }
    for (let i = 0, n = 0; i < 400 && n < 10; i++) {
      const x = 460 + r() * 130, z = SH - 260 - r() * 160;
      if (!clear(x, z, 7)) continue;
      props.house({ ...W(x, z), yaw: 0, width: 9, depth: 8, height: 6 }); take(x, z, 8); n++;
    }
    // the gun positions: sandbags round the batteries and the anti-aircraft gun
    for (const [x, z] of [[-200, SH - 300], [-230, SH - 340], [-530, SH - 196], [530, shoreZ(530) - 170]]) props.sandbagRing({ ...W(x, z), radius: 5, toward: F });

    // ---- the Canal de Furnes: the bridges’ parapets
    for (const bx of BRIDGES) for (const s of [-1, 1]) { const cz = canalZ(bx), w = W(bx + s * 7.5, cz); props.box('stone', w.x, Math.max(g(bx, cz - 12), g(bx, cz + 12)) + 0.5, w.z, 0.6, 1, 20, 0, STONE); }

    // ---- beyond the canal: the market gardens of Rosendaël, the railway yards of Coudekerque
    for (const sd of SIDINGS) { const a = W(sd[0][0], sd[0][1]), c = W(sd[1][0], sd[1][1]); props.rails({ x0: a.x, z0: a.z, x1: c.x, z1: c.z }); }
    for (let i = 0; i < 18; i++) {
      const sd = SIDINGS[i % 3], x = -200 + r() * 480;
      if (Math.abs(x) < 40) continue;
      props.wagon({ ...W(x, sd[0][1]), yaw: Math.PI / 2, kind: r() < 0.6 ? 'box' : 'open' });
    }
    props.hall({ ...W(220, -790), yaw: 0, width: 60, depth: 20, height: 10, color: BRICK, roof: SLATE, door: 8, name: 'engine shed' }); take(220, -790, 32);
    props.hall({ ...W(-160, -790), yaw: 0, width: 40, depth: 16, height: 8, color: WARE, roof: SLATE, door: 6, name: 'goods shed' }); take(-160, -790, 22);
    for (let i = 0, n = 0; i < 900 && n < 26; i++) {
      const x = -580 + r() * 1160, z = SH - 520 - r() * 440;
      if (z > -680 && z < -800 || !clear(x, z, 12) || Math.hypot(x, z + 860) < 50) continue;
      props.house({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9, depth: 7, height: 5 });
      props.lowWall({ ...W(x + 14, z), yaw: Math.PI / 2, length: 18, height: 1.6, color: BRICK }); // (a garden wall)
      take(x, z, 14); n++;
    }
    for (let i = 0; i < 6; i++) props.tent({ ...W(-60 + (i % 3) * 10, -840 - Math.floor(i / 3) * 10), yaw: 0.1, color: 0x7a7656 });
    commandPost(props, this.bases.nato, -1, 0x7a7656);
    props.finish();

    // trees: the gardens in Malo and the town, poplars along the canal and the roads beyond it, scrub and sea buckthorn in the dunes
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 16 })), { x: this.bases.nato.x, z: this.bases.nato.z, r: 30 },
      { test: (x: number, z: number) => { const lz = F * z; return onRoad(x, z) || railD(x, lz) < 5 || inCanal(x, lz) || inBasin(x, lz) || lz > shoreZ(x) - 95 || x < PORT_X && back(x, lz) < 210 || !free(x, lz, 2); } }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, avoid, count: 1500, broadleaf: 0.9, autumn: 0.15, maxY: 40, size: 0.75,
      forest: (x: number, z: number) => { const lz = F * z, cd = Math.abs(lz - canalZ(x)); return (cd > 12 && cd < 22 ? 0.9 : 0) + (inMalo(x, lz) ? 0.18 : 0) + (lz < canalZ(x) ? 0.12 + Math.max(0, fbm(noise, x * 0.006 + 9, lz * 0.006, 2)) * 0.6 : 0); } });
    const scrub = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, avoid, count: 900, broadleaf: 1, autumn: 0.3, maxY: 40, size: 0.3,
      forest: (x: number, z: number) => { const lz = F * z; return duneK(x, shoreZ(x) - lz) > 0.3 ? 0.35 : 0; } });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.2, fields: this.fields,
      avoid: [{ test: (x: number, z: number) => { const lz = F * z; return onRoad(x, z) || inDunkirk(x, lz) || inMalo(x, lz) || lz > shoreZ(x) - 72 || x < PORT_X && back(x, lz) < 210 || inJetty(x, lz); } }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); scrub.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
