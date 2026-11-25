// The landing at Domesnes, October 1915 (coastal, the 1918 epoch: the Russians land, the Germans hold; 1.0 × 1.8 km).
// In the autumn of 1915 the German Eighth Army stood on the Courland coast of the Gulf of Riga, its left flank on the
// sea, and the Russian Twelfth Army held the Riga front. To ease the pressure on it the Baltic Fleet raided the
// Germans’ rear: in October the old battleship Slava, the gunboats and the destroyers came in round Domesnes (Cape
// Kolka, the tip of Courland between the Baltic and the gulf) and put ashore a landing party — sailors of the fleet’s
// marine detachments and infantry — on the shore by the Livonian fishing villages. They broke up the German outposts,
// took prisoners and the guns’ crews off their battery, and were back in the boats before the reserves came up: a raid,
// but it made the Germans keep troops on the coast that were wanted at Riga. This map plays it as a full landing.
// On the map: the long low sandy cape running out into the sea in the north-west (−x) with the lighthouse at its tip,
// the shallows and sandbars off it and the reef running on out under the water; the white dunes behind the beaches
// with their windswept pines; behind them the old dune ridges (kangari) in long parallel lines under the pine forest,
// boggy hollows (vīgas) between; the coast road from the cape to the gulf shore; the Livonian fishing villages —
// Kolka by its little church, Melnsils on the gulf shore, the hamlet at the lighthouse — log houses, nets drying on
// poles, boats hauled up on the sand; the road inland to Dundaga where the German reserve lies. German outposts in
// trenches on the dune crests over each beach, wire at the back of the beach, a coastal battery by the lighthouse and
// another over Melnsils, field guns in the forest.
// Laid out like the Gaza landing (maps/gazaLanding.ts): the sea toward +z, the beaches along x, the cape toward −x.
// A scenario, not a fair battle (MAP_BRIEF_SEA_COAST.md): balanced with AI-vs-AI runs so the landing wins late or
// the defence just holds. The Russian Army of 1918 has no ships of its own yet (data/units1918/ships.js: no `ru`
// variants), so the landing has no naval gunfire to call in (`navy: []`) and comes ashore in the side’s motor
// launches and ferries; its marines fight as Russian riflemen.
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

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const EXT = { x: 520, z: 920 };
const noise = createNoise2D(1915_10);
const sea = createSea({ level: 0, size: SIZE, color: 0x3e5e68 }); // (the grey autumn Baltic)
const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

/** The cape: how far out (0–1) the shore runs at x — the long flank on the gulf side, the short steep one on the Baltic side. */
const CAPE_X = -420;
const capeK = (x: number) => Math.exp(-(((x - CAPE_X) / (x > CAPE_X ? 120 : 62)) ** 2));
/** The waterline (z): the cape’s tip out at (−420, 470), a shallow bight off Kolka. */
const shoreRaw = (x: number) => 190 + fbm(noise, x * 0.005, 2.1, 2) * 6 + 280 * capeK(x) - 12 * bell(x, 10, 70);
const SHORE = Float32Array.from({ length: 1301 }, (_, i) => shoreRaw(i - 650)); // (sampled every metre: it is asked for at every height)
const shoreZ = (x: number) => { const f = Math.min(1299.999, Math.max(0, x + 650)), i = Math.floor(f), u = f - i; return SHORE[i] * (1 - u) + SHORE[i + 1] * u; };
const SLANT = Float32Array.from({ length: 1301 }, (_, i) => { const s = (shoreRaw(i - 648) - shoreRaw(i - 652)) / 4; return 1 / Math.sqrt(1 + s * s); });
/** Signed distance to the waterline (+ out to sea), measured square to the shore (the cape’s flanks run at a slant). */
const sdist = (x: number, z: number) => (z - shoreZ(x)) * SLANT[Math.round(Math.min(1300, Math.max(0, x + 650)))];
const backD = gridCache((x: number, z: number) => -sdist(x, z), EXT, 2); // m inland of the waterline
/** The reef running on out under the water from the cape’s tip (the Kolka shoals). */
const REEF = [[-420, 470], [-468, 640], [-540, 920]];

/** The tracks up from the beaches through the dunes: to the lighthouse road, to Kolka, to the coast road at Melnsils. */
const TRACKS = [
  [[-230, 240], [-232, 150], [-245, 95]],
  [[10, 200], [15, 100], [30, 15], [30, -150]],
  [[310, 220], [315, 100], [325, 30]],
];
/** The coast road from the lighthouse along behind the dunes to the gulf shore; the road inland to Dundaga; the forest roads. */
const COAST_ROAD = [[-395, 330], [-350, 230], [-300, 140], [-245, 95], [-120, 30], [30, 15], [180, 25], [325, 30], [520, 20]];
const ROADS = [
  ...TRACKS,
  COAST_ROAD,
  [[30, -150], [40, -400], [40, -660], [40, -960]],
  [[325, 30], [330, -60], [300, -250], [140, -420], [40, -450]],
  [[-245, 95], [-290, -120], [-270, -330], [-120, -430], [40, -450]],
];
/** Distance to the nearest of `polys`’ segments (one flat loop: it fills a grid of half a million cells). */
const nearSeg = (polys: number[][][]) => {
  const S = polys.flatMap((p) => p.slice(1).map((b, i) => [p[i][0], p[i][1], b[0] - p[i][0], b[1] - p[i][1]]));
  return (x: number, z: number) => {
    let m = Infinity;
    for (const [ax, az, dx, dz] of S) {
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))), ex = x - ax - dx * t, ez = z - az - dz * t, q = ex * ex + ez * ez;
      if (q < m) m = q;
    }
    return Math.sqrt(m);
  };
};
const roadD = gridCache(nearSeg(ROADS), EXT, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.2;
const trackD = gridCache(nearSeg(TRACKS), EXT, 2);

/** The clearings round the villages [x, z, r]: fields and pasture in the forest. */
const CLEARINGS = [[40, -150, 150], [330, -60, 120], [50, -660, 150], [-390, 345, 55], [-240, -330, 80], [210, -330, 70]];
const clearK = (x: number, z: number) => { let k = 0; for (const [cx, cz, r] of CLEARINGS) { const q = Math.hypot(x - cx, z - cz); if (q < r) k = Math.max(k, smoothstep(r, r * 0.7, q)); } return k; };

const LIGHT = { x: -395, z: 352 }; // (Domesnes lighthouse, at the cape’s tip behind the dune)
const PACT_BASE = { x: 40, z: -840 };

/** The old dune ridges (kangari) behind the coast: phase along the distance inland (sin > 0 ridge, < −0.5 a boggy hollow). */
const ridgePhase = (x: number, z: number, back: number) => (back / 72) * Math.PI * 2 + fbm(noise, x * 0.006 + 3, z * 0.006, 2) * 2.6;
const ridgeK = (back: number) => smoothstep(140, 210, back) * smoothstep(780, 560, back);
const duneK = (x: number, back: number) => (back < 18 || back > 150 ? 0 : smoothstep(18, 40, back) * smoothstep(115, 75, back + fbm(noise, 9, x * 0.01, 2) * 18));

function groundRaw(x: number, z: number) {
  const d = sdist(x, z);
  if (d > 0) { // the sandy bottom shelving off, a bar close in, a second further out; the reef off the tip
    let h = -0.5 - d * 0.045 - Math.max(0, d - 60) * 0.06 + 1.1 * bell(d, 45, 12) + 0.8 * bell(d, 105, 16);
    h = Math.max(h, -16);
    const rd = x < -300 ? segDist(REEF, x, z) : 999;
    if (rd < 70) {
      const t = Math.min(1, Math.max(0, (z - 470) / 450)), top = -0.8 - t * 1.6 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.5;
      if (top > h) h += (top - h) * smoothstep(70, 25, rd);
    }
    return h;
  }
  const back = -d;
  const tk = back < 160 ? smoothstep(26, 7, trackD(x, z)) : 0;
  const plain = 2.6 + smoothstep(250, 900, back) * 4 + fbm(noise, x * 0.004, z * 0.004, 3) * 1.6 + fbm(noise, x * 0.03 + 5, z * 0.03, 2) * 0.3;
  let h = Math.min(plain, 0.4 + back * 0.08);                                                   // up from the beach
  const dk = duneK(x, back);
  if (dk > 0) h += dk * (3 + ridged(noise, x * 0.013 + 2, z * 0.017, 3) * 7) * (1 - 0.85 * tk);  // the white dunes (saddles where the tracks cross)
  const rk = ridgeK(back);
  if (rk > 0) { // the kangari: long low ridges under the pines, the vīgas between (levelled a little where the roads run)
    const s = Math.sin(ridgePhase(x, z, back));
    h += rk * (Math.max(0, s) ** 1.5 * 3.4 - 0.5 * smoothstep(-0.4, -0.8, s)) * (1 - 0.7 * smoothstep(12, 4, roadD(x, z))) * (1 - 0.8 * clearK(x, z));
  }
  h += (4.2 - h) * smoothstep(30, 14, Math.hypot(x - LIGHT.x, z - LIGHT.z));                 // the lighthouse’s knoll
  h += (plain - h) * smoothstep(40, 22, Math.hypot(x - PACT_BASE.x, z - PACT_BASE.z));
  return Math.max(h, 0.4);
}
const height = gridCacheSmooth(groundRaw, EXT, 2);

/** The beach sectors (x) and what each opens inland. */
export const SECTORS = [
  { x: -230, name: 'Cape beach', inland: { x: LIGHT.x, z: LIGHT.z - 14 } },
  { x: 10, name: 'Kolka beach', inland: { x: 40, z: -150 } },
  { x: 310, name: 'Melnsils shore', inland: { x: 330, z: -60 } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The fleet', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Cape beach', x: -230, z: shoreZ(-230) - 36, owner: null, sector: 'west', radius: 45, opens: 'E' } as any,
  { id: 'C', name: 'Kolka beach', x: 10, z: shoreZ(10) - 40, owner: null, sector: 'centre', radius: 50, opens: 'F' } as any,
  { id: 'D', name: 'Melnsils shore', x: 310, z: shoreZ(310) - 40, owner: null, sector: 'east', radius: 50, opens: 'G' } as any,
  { id: 'E', name: 'Domesnes lighthouse', ...SECTORS[0].inland, owner: null, sector: 'west' },
  { id: 'F', name: 'Kolka', ...SECTORS[1].inland, owner: null, sector: 'centre' },
  { id: 'G', name: 'Melnsils', ...SECTORS[2].inland, owner: null, sector: 'east' },
  { id: 'K', name: 'Dundaga road', x: 40, z: -660, owner: 'pact', sector: 'centre' },
];
/** The coastal guns behind the dunes: one by the lighthouse, one over Melnsils. */
const GUNS = [{ name: 'Domesnes battery', x: -310, back: 110 }, { name: 'Melnsils battery', x: 440, back: 120 }].map((g) => ({ ...g, z: shoreZ(g.x) - g.back }));
const W = (x: number, back: number) => ({ x, z: shoreZ(x) - back });

export default {
  id: 'domesnes',
  name: 'Domesnes',
  description: 'The Russian landing at Domesnes (Cape Kolka), October 1915: the Baltic Fleet puts marines and infantry ashore behind the German flank on the Courland coast — the long sandy cape with its lighthouse, sandbars in the shallows, white dunes and windswept pines, the Livonian fishing villages with their log houses and drying nets, German outposts and a coastal battery in the dunes.',
  epochs: ['1918'],
  region: 'east',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Russia', pact: 'Germany' },
  armies: { nato: ['ru'], pact: ['de'] }, // (the Baltic Fleet’s landing party and the Twelfth Army’s infantry; the German Eighth Army’s coast guard)
  conditions: { time: 'dawn', weather: 'overcast' },
  wind: { from: 250, speed: 6, veer: 0.15 }, // (a west wind off the Baltic: the pines lean east)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  navCell: 1.5,
  steep: 0.45, // (vehicles: not over the white dunes’ faces — by the tracks)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1915,
  height,
  river: sea,
  fields: createFields({ seed: 191510, cell: 60, weights: [0.4, 0.2, 0.25, 0.15] }),
  airfields: [], // (sand, dunes and pine forest: no strip anywhere)

  theme: {
    // an October dawn on the Baltic: low grey cloud, a cold light coming up over the gulf
    fogColor: 0xa6aeb2, fogDensity: 0.0007, skyTop: 0x5a6c82, skyHorizon: 0xc4c8c4, skyBottom: 0x80888a,
    sunColor: 0xf4e0c0, sunIntensity: 1.6, sunDisk: 0.3, clouds: 0.6, cloudLight: 0xd8d8d4, cloudDark: 0x7c848a,
    sunDir: [0.45, 0.3, -0.84], hemiSky: 0xc0c8d0, hemiGround: 0x5a5840, hemiIntensity: 1.3, rimColor: 0xd0d4d6, rimIntensity: 0.22,
    terrain: {
      grass: '#7c8048', grassAlt: '#727a44', dryGrass: '#b0a068', dirt: '#806e52', rock: '#b4ac96',
      pasture: '#7e884a', ploughed: '#6e5c46', stubble: '#b8a66c', meadow: '#848a50',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const back = backD(x, z);
        if (back < -2) return [y > -1.6 ? 0xcfc6a6 : 0x4e6e74, 1];                                 // the sand under the water
        if (onRoad(x, z) && back > 20) return [0x9a8a6c, 0.85];                                    // the sandy roads
        if (back < 20) return [0xe0d6b6, 1];                                                       // the beach’s pale Baltic sand
        const dk = duneK(x, back);
        if (dk > 0.3) return [fbm(noise, x * 0.05, z * 0.05, 2) > 0.1 ? 0x9a9a6a : 0xd8cca6, Math.min(1, dk * 1.3)]; // the white dunes, marram grass in tufts
        if (clearK(x, z) > 0.5) return null;                                                       // the villages’ fields
        const rk = ridgeK(back);
        if (rk > 0.3 && Math.sin(ridgePhase(x, z, back)) < -0.5) return [0x5a6038, 0.75];          // the vīgas: wet hollows of moss and sedge
        return [0x7e7654, 0.5];                                                                   // the forest floor: needles, moss, heather
      },
    },
  },

  bases: { nato: { x: 0, z: 880, entries: SECTORS.map((s) => s.x) }, pact: { ...PACT_BASE, entries: [-270, 40, 300] } }, // (the Russians land: their ways in are the beach sectors)
  maxStacks: 24,
  cameraStart: { nato: { x: 0, z: 560 }, pact: { x: 0, z: -40 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'nato',
    // the boats: the fleet’s launches and cutters towing the boats in, the armoured cars in lighters (systems/Landing.js craft —
    // the side’s motor launches and ferries: the Russian Army has no craft of its own yet)
    craft: { infantry: ['ml'], vehicle: 'ferry' },
    launchZ: 780,
    signal: { t: 15, say: 'The boats are away from the transports — pulling for the shore under the cape', sayOther: 'Boats off Domesnes! The Russians are landing — stand to!' },
    // no naval gunfire: the Russian Army has no ships on its list (data/units1918/ships.js) — Slava and the gunboats wait for the 1918 unit batch
    navy: [],
    // the guns: the coastal battery by the lighthouse and the one over Melnsils (ships and boats), two field batteries in the forest
    forts: [
      ...GUNS.map((g) => ({ unit: 'coastBattery', name: g.name, x: g.x, z: g.z, facing: 0 })),
      { unit: 'artillery', x: 150, z: -280, facing: 0 },
      { unit: 'artillery', x: -180, z: -250, facing: 0 },
    ],
    // the outposts: trenches on the dune crests over each beach, Maxims at their ends, wire at the back of the beach (gaps at the tracks)
    works: [
      ...SECTORS.flatMap((s) => [-50, -10, 30].map((dx) => ({ kind: 'trench', ...W(s.x + dx, 58), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-30, 50].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, 52), yaw: 0 }))),
      ...Array.from({ length: 64 }, (_, i) => -300 + i * 12.5).filter((x) => TRACKS.every((t) => Math.abs(t[0][0] - x) > 16))
        .map((x) => ({ kind: 'wire', ...W(x, 26), yaw: 0 })),
      ...GUNS.flatMap((g) => [-24, 24].map((dx) => ({ kind: 'trench', ...W(g.x + dx, g.back + 26), yaw: 0 }))),
      { kind: 'trench', x: LIGHT.x + 22, z: LIGHT.z - 30, yaw: 0.6 },
    ],
    // the coast guard at dawn: a Landsturm battalion in the outposts, Maxims, a few marksmen and a mortar
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'sniper', 'rifles', 'mortar', 'rifles', 'mgTeam'],
    hold: [...SECTORS.flatMap((s) => [-50, -10, 30].map((dx) => W(s.x + dx, 64))), ...SECTORS.map((s) => s.inland)],
    // the reserve from Dundaga: Uhlans and infantry down the forest road to the coast
    counter: { t: 330, units: ['rifles', 'ifv', 'mgTeam', 'rifles', 'ifv', 'rifles'], say: 'The reserve is coming up from Dundaga — infantry and the Uhlans, straight for the beaches', sayOther: 'German cavalry and infantry on the Dundaga road!' },
    ai: { order: ['rifles', 'rifles', 'mgTeam', 'engineers', 'rifles', 'mortar', 'reconVehicle', 'rifles', 'mgTeam', 'sniper', 'rifles', 'artillery'], inshore: 420 },
    economy: { reserves: 3000, perSector: 600, beachIncome: 1.2, defenceCp: 600, defenceIncome: 0.95 },
    waves: [
      // dawn, the first wave: the fleet’s marine companies into Kolka beach, infantry on the flanks
      { t: 0, units: [
        { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'engineers', sector: 1 },
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 },
      ] },
      { t: 150, say: 'The boats are bringing in the second wave — and an Austin armoured car in a lighter', units: [{ unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 2 }, { unit: 'reconVehicle', sector: 1 }] },
      { t: 300, say: 'The third wave is in the boats — the fleet’s second marine company and the sappers', units: [{ unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'engineers', sector: 2 }, { unit: 'rifles', sector: 2 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1915);
    sea.build(scene, terrain);
    const nearPoint = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < m);
    const skip = (x: number, z: number) => roadD(x, z) < 9 || backD(x, z) < 70 || nearPoint(x, z, 12);
    const cyl = (x: number, z: number, y: number, r0: number, r1: number, h: number, color: number, key = 'stone') =>
      props.push(key, new THREE.CylinderGeometry(r0, r1, h, 16), new THREE.Matrix4().makeTranslation(x, y + h / 2, z), color);

    /** A Livonian log house: dark log walls, white window frames, a reed or plank roof. Occupiable. */
    const logHouse = (x: number, z: number, yaw: number, w: number, d: number, name = 'log house') => {
      const q = props.rand;
      const b = props.beginBuilding(name, x, z, yaw, w, d);
      const logs = new THREE.Color().setHSL(0.07, 0.28 + q() * 0.1, 0.22 + q() * 0.06).getHex();
      b.plaster = logs;
      props.shell(b, { height: 2.7, key: 'plain', color: logs, front: [(q() - 0.5) * w * 0.4], t: 0.36, bay: 2.3, frame: 0xd4dcdc, shutters: 0.4 });
      props.piece('stone', b, 0, 0.1, 0, w + 0.3, 0.45, d + 0.3, 0x5e5850);
      props.gableRoof(b, { eave: 2.7, pitch: 0.75, color: q() < 0.6 ? 0x7a6c4a : 0x5c5a54, overhang: 0.6, t: 0.36 });
      props.endBuilding();
    };
    /** Nets drying on a row of poles. */
    const nets = (x: number, z: number, yaw: number, len = 12) => {
      const g = terrain.heightAt(x, z);
      props.box('plain', x, g + 1.25, z, len, 1.5, 0.05, yaw, 0x4a463a);
      props.box('plain', x, g + 2.05, z, len + 0.4, 0.08, 0.08, yaw, 0x5a4a36);
      for (let t = -len / 2; t <= len / 2 + 0.01; t += 3) {
        const [px, pz] = PropBuilder.local(x, z, yaw, t, 0);
        props.box('plain', px, terrain.heightAt(px, pz) + 1.05, pz, 0.12, 2.1, 0.12, yaw, 0x4e3e2c);
      }
    };
    /** A fishing boat hauled up on the sand, keel up or upright. */
    const boat = (x: number, z: number, yaw: number) => {
      const g = terrain.heightAt(x, z);
      props.box('plain', x, g + 0.45, z, 1.9, 0.9, 6.2, yaw, 0x4e4234);
      props.box('plain', x, g + 0.95, z, 1.5, 0.12, 5.4, yaw, 0x6a5a44);
      cover.addBox({ x, z, yaw: yaw + Math.PI / 2, length: 6, thickness: 1.8, height: 0.9 });
    };
    const village = (cx: number, cz: number, n: number, spread: number, seed: number) => {
      props.rand = mulberry32(seed);
      const q = props.rand;
      for (let i = 0, k = 0; i < n * 4 && k < n; i++) {
        const a = q() * Math.PI * 2, dd = 16 + q() * spread, x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd;
        if (skip(x, z) || roadD(x, z) < 11 || Math.hypot(x - cx - 30, z - cz - 30) < 16) continue; // (the church’s ground at Kolka)
        k++;
        const yaw = Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + (q() - 0.5) * 0.2;
        logHouse(x, z, yaw, 7 + q() * 3, 5.5 + q() * 1.5, q() < 0.25 ? 'net shed' : 'log house');
        if (q() < 0.5) props.logPile({ x: x + Math.cos(yaw) * 7, z: z - Math.sin(yaw) * 7, yaw: yaw + Math.PI / 2, length: 4 });
      }
    };

    // ---- Domesnes lighthouse at the cape’s tip: the white tower, the lantern, the keeper’s house; the hamlet of fishermen by it
    {
      const g = terrain.heightAt(LIGHT.x, LIGHT.z + 6), lx = LIGHT.x, lz = LIGHT.z + 6;
      cyl(lx, lz, g - 0.5, 2.0, 3.0, 25, 0xe4e0d6);
      cyl(lx, lz, g + 24.5, 2.6, 2.6, 0.4, 0x2a2a2a, 'plain');
      cyl(lx, lz, g + 24.9, 1.5, 1.5, 2.6, 0xd8e0d0, 'plain');
      cyl(lx, lz, g + 27.5, 0.2, 1.9, 1.6, 0xa02a22, 'plain');
      cover.addCylinder({ x: lx, z: lz, radius: 3, height: 25 });
      props.rand = mulberry32(1915_01);
      props.house({ x: lx + 20, z: lz - 6, yaw: 0.3, width: 10, depth: 7, height: 3 });
      for (const [dx, dz, yaw] of [[-32, -40, 0.4], [34, -50, 0.2], [-10, -62, 1.7]]) logHouse(lx + dx, lz + dz, yaw, 7, 5.5, 'fisherman’s hut');
      nets(lx + 10, lz - 78, 0.5); nets(lx - 30, lz - 72, 0.4, 9);
    }
    // ---- the villages: Kolka by its church, Melnsils on the gulf shore, the hamlet on the Dundaga road
    props.church({ x: 70, z: -120, yaw: Math.PI / 2 });
    village(40, -150, 14, 70, 1915_11);
    village(330, -60, 10, 55, 1915_12);
    village(60, -630, 6, 50, 1915_13);
    village(-240, -330, 4, 40, 1915_14);
    // nets drying in rows between the villages and the dunes, boats hauled up on the beach between the landing places
    for (const [x, back, yaw] of [[-80, 95, 0.1], [-60, 100, 0.05], [90, 92, -0.1], [120, 98, 0], [200, 96, 0.08], [400, 95, -0.05], [430, 100, 0.1], [-150, 92, 0.15]]) {
      const p = W(x, back);
      if (roadD(p.x, p.z) > 8 && !nearPoint(p.x, p.z, 14)) nets(p.x, p.z, yaw);
    }
    for (const x of [-140, -128, -110, 140, 152, 168, 186, 440, 456, 470, -330, -345]) {
      const p = W(x + (r() - 0.5) * 3, 10 + r() * 6);
      if (!nearPoint(p.x, p.z, 16)) boat(p.x, p.z, (r() - 0.5) * 0.5);
    }
    // ---- the batteries: sandbagged gun pits’ posts, the gunners’ tents behind; the German camp on the Dundaga road
    for (const g of GUNS) {
      props.sandbagRing({ x: g.x + 18, z: g.z - 10, radius: 4.5, toward: 1 });
      props.sandbagRing({ x: g.x - 18, z: g.z - 12, radius: 4.5, toward: 1 });
      for (let i = 0; i < 3; i++) { const x = g.x - 20 + i * 12, z = g.z - 40; if (roadD(x, z) > 6) props.tent({ x, z, yaw: 0.1, color: 0x8a8462 }); }
    }
    for (let i = 0; i < 6; i++) props.tent({ x: -60 + (i % 3) * 10, z: -780 - Math.floor(i / 3) * 10, yaw: 0.1, color: 0x7e7a5a });
    commandPost(props, this.bases.pact, 1, 0x7a7656);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: PACT_BASE.x, z: PACT_BASE.z, r: 26 }, { x: LIGHT.x, z: LIGHT.z + 6, r: 12 },
      { test: (x: number, z: number) => onRoad(x, z) || roadD(x, z) < 5 || backD(x, z) < 34 }];
    // windswept pines on the white dunes; the pine forest on the kangari, sparse in the wet hollows, open round the villages; alder and birch in the vīgas
    const dunePines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 600, count: 600, broadleaf: 0, autumn: 0, size: 0.6, maxY: 60, avoid,
      forest: (x: number, z: number) => { const b = backD(x, z); return b < 140 ? 0.12 + 0.3 * smoothstep(60, 120, b) : -1; } });
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 600, count: 8000, broadleaf: 0.06, autumn: 0.1, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => clearK(x, z) > 0.3 }],
      forest: (x: number, z: number) => { const b = backD(x, z); if (b < 120) return -1; const s = ridgeK(b) > 0.3 ? Math.sin(ridgePhase(x, z, b)) : 0.5; return (s < -0.5 ? 0.1 : 0.75) + fbm(noise, x * 0.006 + 20, z * 0.006, 2) * 0.4 - 0.6 * clearK(x, z); } });
    const birches = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 600, count: 600, broadleaf: 1, autumn: 0.6, size: 0.7, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => clearK(x, z) > 0.3 }],
      forest: (x: number, z: number) => { const b = backD(x, z); return ridgeK(b) > 0.3 && Math.sin(ridgePhase(x, z, b)) < -0.5 ? 0.6 : (clearK(x, z) > 0.1 ? 0.1 : -1); } });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.2, fields: this.fields,
      avoid: [...avoid.slice(0, -1), { test: (x: number, z: number) => onRoad(x, z) || backD(x, z) < 24 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { dunePines.update?.(dt, t); pines.update?.(dt, t); birches.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
