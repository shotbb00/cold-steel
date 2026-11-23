// The landing behind Gaza, autumn 1917 (coastal, the 1918 epoch: the British Empire lands, the Ottomans and their
// German allies hold; 1.0 × 1.8 km). A battle that was planned, not fought: while Allenby made ready for the Third
// Battle of Gaza, his staff and the Royal Navy worked out a landing on the open coast north of the town — near the
// mouth of the Wadi el Hesi, below the ruins of ancient Askalon — to come down behind the Gaza line from the north
// and the sea. The boats and the troops for it were never spared, and the navy’s monitors and destroyers only
// shelled the coast and the railway while the army broke the line at Beersheba. This map plays it as it might have
// gone: the boats come in at dawn through the swell.
// On the map: the Mediterranean shore with its high sand dunes; in the north (−x) the kurkar cliff and the
// ruins of Askalon on top of it, the Crusader rampart in a broken arc, columns lying in the sand; in the middle the
// Wadi el Hesi breaking through the dunes to the sea; in the south the dunes at their highest round the weli of
// Sheikh Hasan; inland the Arab villages — Deir Sneid by its station, Beit Lahia, el-Jura, Beit Hanun — in their
// orchards and prickly-pear hedges, the railway to Gaza and the Gaza–Mejdel road. The Ottoman trenches and wire in
// the dunes over each beach, the coastal guns on the dune crests (Austrian and German crews), field guns inland.
// Laid out like Gallipoli (maps/gallipoli.ts): the sea toward +z, the beaches along x, north toward −x.
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
import { arabVillage, segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const EXT = { x: 520, z: 920 };
const noise = createNoise2D(1917_09);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a6a80 }); // (the Levantine Mediterranean: turquoise over the sand)
const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

/** The waterline: Askalon’s cliff standing out a little in the north, a shallow bight at the Wadi Hesi’s mouth. */
const shoreZ = (x: number) => 200 + fbm(noise, x * 0.005, 2.1, 2) * 8 + 26 * bell(x, -330, 110) - 18 * bell(x, 0, 60);
/** The kurkar (sandstone) cliff under Askalon: 1 in the north, gone south of the ruins. */
const cliffK = (x: number) => smoothstep(-170, -240, x);
/** The dune belt (0–1) at `back` m inland of the waterline. */
const duneK = (x: number, back: number) => smoothstep(30, 80, back) * smoothstep(340, 240, back + fbm(noise, 9, x * 0.01, 2) * 40);

/** The Wadi el Hesi, from the sea up through the dunes, past Deir Sneid, away north-east. */
const WADI = [[0, 240], [0, 190], [-15, 120], [10, 30], [-30, -60], [-75, -160], [-100, -260], [-150, -420], [-230, -620], [-300, -960]];
/** The tracks up from the beaches: Askalon’s sea gate (a gully in the cliff), the Wadi Hesi’s east bank, over a saddle in the dunes at Sheikh Hasan. */
const TRACKS = [
  [[-300, 240], [-300, 110], [-320, 60], [-300, -40], [-250, -200], [-200, -330]],
  [[15, 200], [25, 120], [35, 30], [40, -170]],
  [[310, 230], [315, 120], [320, 40], [330, -60], [250, -300], [140, -430]],
];
/** The railway to Gaza (Deir Sneid station), the Gaza–Mejdel road, the road to Beit Hanun. */
const RAIL = [[-520, -250], [-240, -228], [-80, -212], [40, -215], [200, -230], [520, -262]];
const ROADS = [
  ...TRACKS,
  [[-520, -360], [-200, -330], [40, -450], [140, -430], [520, -380]],
  [[40, -170], [40, -450], [40, -660], [40, -960]],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((p) => segDist(p, x, z))), EXT, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.2;
const wadiD = gridCache((x: number, z: number) => segDist(WADI, x, z), EXT, 2);
const railD = gridCache((x: number, z: number) => segDist(RAIL, x, z), EXT, 2);

/** The orchards [x, z, w, d] round the villages, each in its prickly-pear hedge. */
const GROVES = [[130, -140, 60, 50], [20, -95, 50, 40], [410, -30, 60, 60], [250, -110, 60, 50], [390, -140, 50, 50],
  [-440, -110, 50, 50], [-450, -310, 50, 40], [130, -640, 60, 50], [-60, -700, 50, 50]];
const inGrove = (x: number, z: number, pad = 0) => GROVES.some(([gx, gz, w, d]) => Math.abs(x - gx) < w / 2 + pad && Math.abs(z - gz) < d / 2 + pad);

const ASKALON = { x: -330, z: 140, r: 110 }; // (the Crusader rampart’s arc, open to the sea)
const PACT_BASE = { x: 40, z: -840 };

function groundRaw(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz; // + out to sea
  if (d > 0) { // the sandy bottom shelving off, a bar a hundred metres out (the boats ground short of the beach)
    const bar = 0.9 * bell(d, 90, 18) * (1 - cliffK(x) * 0.7);
    return Math.max(-0.4 - d * 0.04 - Math.max(0, d - 60) * 0.06 + bar, -16);
  }
  const back = -d;
  const tk = smoothstep(26, 8, segDist(TRACKS[0], x, z)) + smoothstep(26, 8, segDist(TRACKS[2], x, z)) + smoothstep(22, 6, segDist(TRACKS[1], x, z));
  const beach = 0.5 + back * 0.05;
  const plain = 6 + smoothstep(250, 650, back) * 5 + fbm(noise, x * 0.004, z * 0.004, 3) * 2.5 + fbm(noise, x * 0.03 + 5, z * 0.03, 2) * 0.4;
  let h = Math.min(plain, beach + back * 0.12);                                                // up from the beach onto the plain
  h += duneK(x, back) * (5 + ridged(noise, x * 0.012 + 2, z * 0.016, 3) * 16 + 4 * smoothstep(150, 380, x)) * (1 - 0.85 * Math.min(1, tk)); // the dunes (highest at Sheikh Hasan; low saddles where the tracks cross)
  const ck = cliffK(x);
  if (ck > 0) { // Askalon: the kurkar cliff straight up from a narrow beach, the ruins on top
    const top = 13 + fbm(noise, x * 0.01, 7.1, 2) * 2 + Math.min(back, 200) * 0.012;
    const face = smoothstep(14, 26, back) * (1 - Math.min(1, tk));
    h += (Math.max(h, beach + (top - beach) * face) - h) * ck;
  }
  // the Wadi el Hesi: a dry bed of stones and sand, steep banks through the dunes
  const bed = 0.6 + back * 0.01;
  const wd = segDist(WADI, x, z) + fbm(noise, x * 0.02 + 6, z * 0.02, 2) * 5;
  h += (Math.min(h, bed) - h) * smoothstep(36, 10, wd);
  h += (plain - h) * smoothstep(40, 22, Math.hypot(x - PACT_BASE.x, z - PACT_BASE.z));
  return Math.max(h, 0.4);
}
const height = gridCacheSmooth(groundRaw, EXT, 2);

/** The beach sectors (x) and what each opens inland. */
export const SECTORS = [
  { x: -310, name: 'Askalon beach', inland: { x: -330, z: 90 } },
  { x: 10, name: 'Wadi Hesi mouth', inland: { x: 40, z: -175 } },
  { x: 310, name: 'Sheikh Hasan beach', inland: { x: 330, z: -60 } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The fleet', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Askalon beach', x: -310, z: shoreZ(-310) - 22, owner: null, sector: 'west', radius: 45, opens: 'E' } as any,
  { id: 'C', name: 'Wadi Hesi mouth', x: 10, z: shoreZ(10) - 40, owner: null, sector: 'centre', radius: 50, opens: 'F' } as any,
  { id: 'D', name: 'Sheikh Hasan beach', x: 310, z: shoreZ(310) - 40, owner: null, sector: 'east', radius: 50, opens: 'G' } as any,
  { id: 'E', name: 'Askalon', ...SECTORS[0].inland, owner: null, sector: 'west' },
  { id: 'F', name: 'Deir Sneid', ...SECTORS[1].inland, owner: null, sector: 'centre' },
  { id: 'G', name: 'Beit Lahia', ...SECTORS[2].inland, owner: null, sector: 'east' },
  { id: 'K', name: 'Beit Hanun', x: 40, z: -660, owner: 'pact', sector: 'centre' },
];
/** The coastal guns on the dune crests: one north of the wadi, one at Sheikh Hasan. */
const GUNS = [{ name: 'Hesi battery', x: -130, back: 140 }, { name: 'Sheikh Hasan battery', x: 430, back: 130 }].map((g) => ({ ...g, z: shoreZ(g.x) - g.back }));
const W = (x: number, back: number) => ({ x, z: shoreZ(x) - back });

export default {
  id: 'gaza-landing',
  name: 'Gaza Coast',
  description: 'The landing planned behind Gaza in autumn 1917, as it might have gone: boats at dawn onto the Mediterranean shore north of the town — high sand dunes, Askalon’s ruins on the cliff, the mouth of the Wadi Hesi — against Ottoman trenches and coastal guns in the dunes, Arab villages in their orchards and cactus hedges inland, the railway to Gaza.',
  epochs: ['1918'],
  region: 'middleEast',
  climate: 'desert',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'British Empire', pact: 'Ottoman Empire' },
  armies: { nato: ['uk', 'anzac'], pact: ['ot', 'de'] }, // (XXI Corps and the Anzac Mounted Division; the Ottoman Eighth Army and the German Asia Corps)
  conditions: { time: 'dawn', weather: 'clear' },
  wind: { from: 280, speed: 4, veer: 0.1 }, // (a westerly off the sea: the November swell on the bar)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  navCell: 1.5,
  steep: 0.45, // (vehicles: not up Askalon’s cliff nor the dunes’ faces — by the tracks and the wadi)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1917,
  height,
  river: sea,
  fields: createFields({ seed: 191709, cell: 80 }),

  theme: {
    // a clear November dawn on the coast: the sun coming up over the land, the sea still grey-blue
    fogColor: 0xd2ccba, fogDensity: 0.0006, skyTop: 0x7298c0, skyHorizon: 0xe8dcc4, skyBottom: 0xb0a488,
    sunColor: 0xffe6c4, sunIntensity: 1.9, sunDisk: 0.7, clouds: 0.15, cloudLight: 0xf6eee2, cloudDark: 0xc0b8aa,
    sunDir: [0.3, 0.32, -0.88], hemiSky: 0xd6dce4, hemiGround: 0x9c8a66, hemiIntensity: 1.2, rimColor: 0xf0e0c4, rimIntensity: 0.3,
    terrain: {
      grass: '#a8966c', grassAlt: '#9c8c62', dryGrass: '#c4b07e', dirt: '#9c7a56', rock: '#b09a78',
      pasture: '#a8966a', ploughed: '#96744f', stubble: '#c8b282', meadow: '#a8986c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const sz = shoreZ(x), back = sz - z;
        if (back < -2) return [y > -1.5 ? 0xd2c6a0 : 0x4e8a94, 1];                               // the sand under the water
        if (onRoad(x, z) && back > 20) return [0xc8b48c, 0.85];                                    // the tracks
        if (railD(x, z) < 2.4) return [0x8a7a62, 0.9];                                             // the railway’s ballast
        if (back < 20) return [0xe2d4aa, 1];                                                       // the beach
        if (cliffK(x) > 0.3 && back < 30 && y > 3) return [0xc4986a, 0.95];                       // the kurkar cliff’s ochre sandstone
        if (wadiD(x, z) < 12) return [0xd0c4a6, 0.85];                                            // the wadi’s stones and sand
        if (duneK(x, back) > 0.25) return [0xe6d6a8, Math.min(1, duneK(x, back) * 1.3)];        // the dunes’ pale loose sand
        if (inGrove(x, z, 2)) return [0x7e5c3e, 0.7];                                            // the orchards’ red earth
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.22 ? [0x8c8458, Math.min(0.4, (scrub - 0.22) * 2)] : null;
      },
    },
  },

  bases: { nato: { x: 0, z: 880, entries: SECTORS.map((s) => s.x) }, pact: { ...PACT_BASE, entries: [-300, 40, 330] } }, // (the British land: their ways in are the beach sectors)
  maxStacks: 24,
  cameraStart: { nato: { x: 0, z: 560 }, pact: { x: 0, z: -40 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'nato',
    // the boats: ship’s cutters and lighters towed in by the motor launches, the tanks and guns in ferries (systems/Landing.js craft)
    craft: { infantry: ['ml'], vehicle: 'ferry' },
    launchZ: 780,
    signal: { t: 15, say: 'The tows are casting off — the boats pull for the shore through the swell', sayOther: 'Boats off the Wadi Hesi! The English are landing — stand to!' },
    // what the landing may call in at sea: the destroyers inshore, a cruiser, the monitor Raglan’s big guns (the battleship)
    navy: ['destroyer', 'lightCruiser', 'battleship'],
    // the guns: heavy coastal guns on the dune crests (ships only) and two Ottoman field batteries inland
    forts: [
      ...GUNS.map((g) => ({ unit: 'coastBattery', name: g.name, x: g.x, z: g.z, facing: 0 })),
      { unit: 'artillery', x: 150, z: -270, facing: 0 },
      { unit: 'artillery', x: -190, z: -300, facing: 0 },
    ],
    // the trenches in the dunes over each beach, Maxims at their ends, wire along the back of the beach (gaps at the tracks)
    works: [
      ...SECTORS.flatMap((s) => [-50, -10, 30].map((dx) => ({ kind: 'trench', ...W(s.x + dx, cliffK(s.x) > 0.3 ? 34 : 70), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-30, 50].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, cliffK(s.x) > 0.3 ? 30 : 62), yaw: 0 }))),
      ...Array.from({ length: 86 }, (_, i) => -470 + i * 11).filter((x) => cliffK(x) < 0.3 && TRACKS.every((t) => Math.abs(t[0][0] - x) > 16) && Math.abs(x) > 24)
        .map((x) => ({ kind: 'wire', ...W(x, 28), yaw: 0 })),
      ...GUNS.flatMap((g) => [-26, 26].map((dx) => ({ kind: 'trench', ...W(g.x + dx * 0.9, g.back + 30), yaw: 0 }))),
    ],
    // the coast’s garrison at dawn: an Ottoman regiment in the dunes, the German machine-gun company, gunners and snipers
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'sniper', 'rifles', 'mortar', 'rifles', 'mgTeam'],
    hold: [...SECTORS.flatMap((s) => [-50, -10, 30].map((dx) => W(s.x + dx, cliffK(s.x) > 0.3 ? 40 : 76))), ...SECTORS.map((s) => s.inland)],
    // the reserve from Beit Hanun: the 7th Division’s battalions and the Süvari, down the roads to the coast
    counter: { t: 270, units: ['rifles', 'reconVehicle', 'mgTeam', 'rifles', 'reconVehicle', 'rifles'], say: 'The reserve is coming down from Beit Hanun — infantry and the cavalry, straight for the beaches', sayOther: 'Turkish cavalry and infantry coming down the Beit Hanun road!' },
    ai: { order: ['rifles', 'rifles', 'mgTeam', 'engineers', 'rifles', 'mortar', 'tank', 'rifles', 'mgTeam', 'sniper', 'rifles', 'artillery'], gunship: 'destroyer', gunships: 1, heavy: 'battleship', inshore: 420 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 800, defenceIncome: 1.4 },
    waves: [
      // dawn, the first wave: two battalions of the 52nd (Lowland) Division into the wadi’s mouth, a company each on the flanks
      { t: 0, units: [
        { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'engineers', sector: 1 },
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 },
      ] },
      { t: 150, say: 'The lighters are bringing in the second wave — and a tank in a ferry', units: [{ unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 2 }, { unit: 'tank', sector: 1 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1917);
    sea.build(scene, terrain);
    const nearPoint = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < m);
    const skip = (x: number, z: number) => roadD(x, z) < 8 || wadiD(x, z) < 22 || railD(x, z) < 8 || inGrove(x, z, 4) || z > shoreZ(x) - 60;
    const SAND = 0xc4a678;

    // ---- Askalon: the Crusader rampart in a broken arc on the cliff top, its towers’ stumps, columns and capitals in the sand
    props.rand = mulberry32(1917_01);
    for (let a = -1.75; a <= 1.75; a += 0.11) {
      const x = ASKALON.x + ASKALON.r * Math.sin(a), z = ASKALON.z - ASKALON.r * Math.cos(a);
      if (roadD(x, z) < 8 || props.rand() < 0.22 || z > shoreZ(x) - 28) continue;                   // (breaches; the sea gate’s track)
      props.wall({ x, z, yaw: -a, length: 11, height: 1.2 + props.rand() * 1.6, thickness: 1.4 });
      if (Math.abs(a * 100) % 55 < 11) props.box('stone', x, terrain.heightAt(x, z) + 2, z, 6, 4 + props.rand() * 3, 6, -a, SAND); // a tower’s stump
    }
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, d = r() * (ASKALON.r - 20), x = ASKALON.x + Math.cos(a) * d, z = ASKALON.z + Math.sin(a) * d;
      if (roadD(x, z) < 5 || nearPoint(x, z, 12) || z > shoreZ(x) - 30) continue;
      if (r() < 0.55) props.column({ x, z, radius: 0.4 + r() * 0.3, height: 0.8 + r() * 3 });
      else props.wall({ x, z, yaw: r() * 3, length: 3 + r() * 5, height: 0.8 + r() * 0.8 });
    }
    // boulders of kurkar fallen from the cliff onto the beach under Askalon (clear of the sea gate)
    for (let i = 0; i < 50; i++) {
      const x = -500 + r() * 320, z = shoreZ(x) - 4 - r() * 10;
      if (Math.abs(x + 300) < 24) continue;
      props.boulder({ x, z, radius: 0.6 + r() * 1.4 });
    }

    // ---- the villages: Deir Sneid by its station, Beit Lahia, el-Jura by Askalon, Beit Hanun on the road to Gaza
    for (const [x, z, n, mosque, seed] of [[60, -150, 9, true, 11], [340, -40, 9, true, 12], [-410, -180, 7, true, 13], [50, -640, 7, false, 14]] as [number, number, number, boolean, number][]) {
      arabVillage(props, x, z, n, 1917_00 + seed, (px, pz) => skip(px, pz) || nearPoint(px, pz, 10), mosque);
    }
    // the weli of Sheikh Hasan on the dune crest; sandbagged posts round the coastal guns
    props.rand = mulberry32(1917_02);
    { const p = W(370, 110); props.flatHouse({ x: p.x, z: p.z, yaw: 0.2, width: 6, depth: 6, name: 'weli', dome: true }); }
    for (const g of GUNS) {
      props.sandbagRing({ x: g.x + 18, z: g.z - 10, radius: 4.5, toward: 1 });
      props.sandbagRing({ x: g.x - 18, z: g.z - 12, radius: 4.5, toward: 1 });
      for (let i = 0; i < 3; i++) props.tent({ x: g.x - 20 + i * 12, z: g.z - 40, yaw: 0.1, color: 0xb8a882 });
    }

    // ---- the railway: the rails (a timber trestle over the wadi), Deir Sneid station, wagons on the siding
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 30);
      for (let k = 0; k < n; k++) {
        const x0 = ax + (bx - ax) * k / n, z0 = az + (bz - az) * k / n, x1 = ax + (bx - ax) * (k + 1) / n, z1 = az + (bz - az) * (k + 1) / n;
        if (wadiD((x0 + x1) / 2, (z0 + z1) / 2) < 30) continue;
        props.rails({ x0, z0, x1, z1 });
      }
    }
    { // the trestle: where the line meets the wadi, a deck on timber piers at the banks’ height
      const wx = -88, wz = -213.5, ux = 160 / Math.hypot(160, 16), uz = 16 / Math.hypot(160, 16), yaw = Math.atan2(ux, uz);
      const deckY = Math.max(terrain.heightAt(wx - ux * 32, wz - uz * 32), terrain.heightAt(wx + ux * 32, wz + uz * 32));
      props.box('plain', wx, deckY + 0.3, wz, 3.2, 0.5, 66, yaw, 0x5a4a36);
      for (let t = -30; t <= 30; t += 10) {
        const x = wx + ux * t, z = wz + uz * t, g = terrain.heightAt(x, z);
        if (deckY - g > 0.4) props.box('plain', x, (deckY + g) / 2, z, 2.6, deckY - g, 0.6, yaw, 0x4a3c2c);
      }
    }
    props.hall({ x: 40, z: -200, yaw: Math.PI / 2 + 0.02, width: 8, depth: 22, height: 5, color: 0xd0c0a0, roof: 0x8a5a3a, door: 3, name: 'Deir Sneid station' });
    for (const [x, kind] of [[120, 'box'], [134, 'box'], [148, 'open']] as [number, string][]) props.wagon({ x, z: -215 - (x - 40) * 15 / 160, yaw: Math.atan2(160, -15), kind, color: 0x6a4a32 });

    // ---- the prickly-pear hedges round each orchard (a gate in each side)
    const cactus = (x: number, z: number, yaw: number) => { if (!onRoad(x, z) && railD(x, z) > 4 && !nearPoint(x, z, 10)) props.lowWall({ x, z, yaw, length: 10, height: 1.9, color: 0x5e6e3c }); };
    for (const [gx, gz, w, d] of GROVES) {
      for (const [lx, lz, len, alongX] of [[0, d / 2, w, 1], [0, -d / 2, w, 1], [w / 2, 0, d, 0], [-w / 2, 0, d, 0]] as number[][]) {
        for (let t = -len / 2 + 6; t < len / 2 - 4; t += 12) {
          if (Math.abs(t) < 5) continue;
          cactus(gx + lx + (alongX ? t : 0), gz + lz + (alongX ? 0 : t), alongX ? 0 : Math.PI / 2);
        }
      }
    }
    // ---- palms by the villages and along the wadi; the Ottoman camp at Beit Hanun
    for (let i = 0, n = 0; i < 600 && n < 120; i++) {
      const x = (r() * 2 - 1) * 480, z = 120 - r() * 980;
      const byWadi = wadiD(x, z) > 18 && wadiD(x, z) < 40, byVillage = inGrove(x, z, 14) && !inGrove(x, z, 2);
      if (!(byWadi || byVillage) || skip(x, z) && !byWadi || roadD(x, z) < 6 || railD(x, z) < 6 || nearPoint(x, z, 12) || z > shoreZ(x) - 60) continue;
      n++;
      props.rand = mulberry32(i);
      props.palm({ x, z, height: 7 + r() * 6 });
    }
    for (let i = 0; i < 6; i++) props.tent({ x: -60 + (i % 3) * 10, z: -780 - Math.floor(i / 3) * 10, yaw: 0.1, color: 0xb0a07a });
    commandPost(props, this.bases.pact, 1, 0xa09474);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: PACT_BASE.x, z: PACT_BASE.z, r: 26 },
      { test: (x: number, z: number) => onRoad(x, z) || railD(x, z) < 4 || wadiD(x, z) < 8 || z > shoreZ(x) - 40 }];
    // fruit trees in the orchards (figs, oranges, apricots); tamarisk and broom on the plain, a few in the dunes
    const orchards = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 900, broadleaf: 1, autumn: 0.1, size: 0.55, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => !inGrove(x, z, -3) }], forest: (x: number, z: number) => (inGrove(x, z) ? 1 : -1) });
    const scrub = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 700, broadleaf: 1, autumn: 0.15, size: 0.32, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => inGrove(x, z, 6) }],
      forest: (x: number, z: number) => { const back = shoreZ(x) - z; return (duneK(x, back) > 0.4 ? 0.06 : 0.2) + (wadiD(x, z) < 30 ? 0.5 : 0) + Math.max(0, fbm(noise, x * 0.01 + 20, z * 0.01, 2)) * 0.5; } });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.6, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => duneK(x, shoreZ(x) - z) > 0.5 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { orchards.update?.(dt, t); scrub.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
