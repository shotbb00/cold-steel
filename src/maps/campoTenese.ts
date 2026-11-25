// Campo Tenese, 9 March 1806: the high plateau of Campotenese, a thousand metres up in the Pollino massif on the
// road from Naples down into Calabria. General Damas had dug the last of the Neapolitan field army in across the
// southern end of the plain, in front of the defile that falls to Morano and Castrovillari, with redoubts and an
// abatis in the snow. Reynier came over from Rotonda through the Mercure valley; while his columns marched straight
// up the road, his light infantry climbed round through the snow on the mountain flanks, and the Neapolitans broke
// and ran for the defile, leaving their guns. The French come from the north (+z), the coalition holds the south
// (−z) — the Neapolitans have no army of their own in the game, so the British and the Russians stand in for them.
// The real ground: the plain of Campotenese is a high karst basin — the road climbs up onto it from the Mercure valley
// in the north and falls off it again down the defile to Morano in the south, so the snowfield in the middle is the high
// ground of the road and both sides come up out of a valley. The Serra del Prete and the Pollino behind it wall the
// whole east side, highest toward the north-east; the Palanuda–Caramolo block stands out of the south-west with the
// plain running round its north end.
// Fair by distance, not by shape: each side's points are as far from its base as the other's (tools/map_fairness.py);
// the Pollino's height before the French is traded for the Palanuda block before the coalition. Each flank has a high
// track (the way Reynier's voltigeurs went). No `climate`: the winter tint whitens the coats as at Eylau.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 450;
const noise = createNoise2D(1806_03);
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Rotonda road', x: 0, z: 420, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Mormanno track', x: -275, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Il Fortino', x: -90, z: 230, owner: null, sector: 'centre' },
  { id: 'D', name: 'Piano Ruggio', x: 190, z: 350, owner: null, sector: 'east' },
  { id: 'E', name: 'Palanuda spur', x: -290, z: 90, owner: null, sector: 'west' },
  { id: 'F', name: 'Campotenese', x: 0, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Serra del Prete spur', x: 245, z: -150, owner: null, sector: 'east' },
  { id: 'H', name: 'Caramolo track', x: -250, z: -310, owner: null, sector: 'west' },
  { id: 'I', name: 'Damas’s redoubts', x: 150, z: -205, owner: null, sector: 'centre' },
  { id: 'J', name: 'Colle del Dragone', x: 250, z: -340, owner: null, sector: 'east' },
  { id: 'K', name: 'Morano road', x: 0, z: -420, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

/** The foot of the Serra del Prete and the Pollino behind it, the whole east side, closer in toward the north-east. */
const eastX = (z: number) => 250 + 45 * Math.sin(z * 0.006 + 0.5) - 60 * smoothstep(-100, 400, z) + 14 * Math.sin(z * 0.019);
/** The Palanuda–Caramolo block standing out of the south-west, an island of mountain with the plain round its north end. */
const PAL = { x: -440, z: -220, rx: 190, rz: 280 };
const palIn = (x: number, z: number) => (1 - Math.hypot((x - PAL.x) / PAL.rx, (z - PAL.z) / PAL.rz)) * 200 - 40 + fbm(noise, x * 0.006 - 7, z * 0.006, 2) * 30;
/** How far up out of the plain (m beyond the foot of the nearer mountain; < 0 on the plain). */
const sideOf = (x: number, z: number) => Math.max(x - eastX(z), palIn(x, z));
/** The two spurs thrown out onto the plain (x, z, r, height): the Palanuda's north spur, the Serra del Prete's. */
const SPURS = [[-300, 85, 100, 16], [285, -150, 130, 14]];

/** Beech and Bosnian pine on the mountainsides, a few copses on the plain (0..1). */
const woods = (x: number, z: number) => {
  const side = sideOf(x, z);
  let k = smoothstep(-40, 30, side) * smoothstep(0.25, 0.45, fbm(noise, x * 0.008 + 3, z * 0.008, 3) + 0.2);
  k = Math.max(k, smoothstep(0.55, 0.7, fbm(noise, x * 0.006 + 31, z * 0.006 - 9, 3)) * 0.7);
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 58, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(4, 10, roadDist(x, z)));
};

/** Distance from (x, z) to the segment a–b. */
const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
/** The post road down the middle (Rotonda – Campotenese – Morano), and the tracks out to the flanks. */
const ROADS: number[][] = [
  [0, 560, P.A.x, P.A.z], [P.A.x, P.A.z, P.C.x, P.C.z], [P.C.x, P.C.z, P.F.x, P.F.z], [P.F.x, P.F.z, P.I.x, P.I.z], [P.I.x, P.I.z, P.K.x, P.K.z], [P.K.x, P.K.z, 0, -560],
  [P.A.x, P.A.z, P.B.x, P.B.z], [P.B.x, P.B.z, P.E.x, P.E.z], [P.E.x, P.E.z, P.F.x, P.F.z],
  [P.A.x, P.A.z, P.D.x, P.D.z], [P.D.x, P.D.z, P.G.x, P.G.z],
  [P.K.x, P.K.z, P.J.x, P.J.z], [P.J.x, P.J.z, P.G.x, P.G.z], [P.G.x, P.G.z, P.F.x, P.F.z],
  [P.K.x, P.K.z, P.H.x, P.H.z], [P.H.x, P.H.z, P.E.x, P.E.z],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));

const BASE_H = 13;
function height(x: number, z: number) {
  // the plateau floor: a few metres of swell under the snow
  let h = 36 + fbm(noise, x * 0.003, z * 0.003, 3) * 3 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.4;
  const rg = ridged(noise, x * 0.005, z * 0.005, 3);
  h += smoothstep(-50, 180, x - eastX(z)) * (32 + 14 * smoothstep(-200, 450, z) + rg * 30);   // the Serra del Prete, the Pollino rising behind it to the north-east
  h += smoothstep(-50, 180, palIn(x, z)) * (48 + rg * 30);                                    // the Palanuda and Caramolo
  for (const [cx, cz, r, a] of SPURS) h += hill(x, z, cx, cz, r, a);
  h += hill(x, z, P.C.x, P.C.z, 70, 4) + hill(x, z, P.I.x, P.I.z, 70, 4);        // the low knolls the blockhouse and the redoubts stand on
  h -= smoothstep(150, 560, z) * (26 + 14 * smoothstep(200, -300, x));          // the road falls north off the plateau toward the Mercure valley and Rotonda
  h -= smoothstep(220, 560, -z) * (22 + 12 * smoothstep(-200, 300, x));         // and south down the defile to Morano
  for (const p of POINTS) if ('BDFHJ'.includes(p.id)) h += (h * 0.7 + 3 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5; // (level ground at the farms)
  for (const bz of [BASE_Z, -BASE_Z]) h += (BASE_H - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return Math.max(1.5, h);
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'campo-tenese',
  armies: { nato: ['fr'], pact: ['gb', 'ru'] }, // (Reynier against Damas's Neapolitans: no Neapolitan army yet — the British stand in; the map names them, so they field in Italy)
  name: 'Campo Tenese',
  description: 'Calabria, March 1806: the snowbound plateau of Campotenese high in the Pollino massif, the post road across it, the Neapolitan redoubts before the defile to Morano, the Pollino walling the east and the Palanuda standing out of the south-west.',
  epochs: ['1806'],
  region: 'italy',
  airfields: [],
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180603,
  height,
  steep: 0.6,
  woods: (x: number, z: number) => woods(x, z) * 0.85,
  fields: createFields({ seed: 1806_3, cell: 90, weights: [0.5, 0.1, 0.2, 0.2] }), // (high pasture under the snow)

  theme: {
    // a grey March day on the mountain: snow lying, low cloud on the peaks
    fogColor: 0xd0d4d8, fogDensity: 0.0018,
    skyTop: 0x8e98a4, skyHorizon: 0xd2d6da, skyBottom: 0xa2a6aa,
    sunColor: 0xe6ecf2, sunIntensity: 1.2, sunDisk: 0,
    clouds: 0.9, cloudLight: 0xd6dade, cloudDark: 0x8a9298,
    sunDir: [0.35, 0.5, 0.7],
    hemiSky: 0xd6dce2, hemiGround: 0x9a9ea2, hemiIntensity: 1.45,
    rimColor: 0xc8d0d8, rimIntensity: 0.2,
    terrain: {
      grass: '#eceff1', grassAlt: '#e2e6e8', dryGrass: '#d8d6d0', dirt: '#9a948a', rock: '#a8aaa8',
      pasture: '#eaedee', ploughed: '#d4d2ca', stubble: '#dedbd2', meadow: '#f0f2f3',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number) {
        if (roadDist(x, z) < 3) return [0xb0aaa0, 0.6];                                       // the trodden road through the snow
        const side = sideOf(x, z);
        const rock = smoothstep(80, 160, side) * smoothstep(0.1, 0.4, fbm(noise, x * 0.02 + 5, z * 0.02, 2) + 0.2);
        return rock > 0.05 ? [0x8e908e, rock * 0.6] : null;                                    // grey limestone through the snow, high up
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1st Company' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const taken: number[][] = [];

    // ---- Campotenese: the posthouse and the hamlet along the road, its chapel
    props.rand = mulberry32(1806_0309);
    props.church({ x: P.F.x - 30, z: P.F.z + 14, yaw: 0 });
    taken.push([P.F.x - 30, P.F.z + 14]);
    props.hall({ x: P.F.x + 22, z: P.F.z - 8, yaw: Math.PI / 2, width: 18, depth: 8, height: 4, color: 0x9a8a72, roof: 0x5a4a3a, door: 4, name: 'posthouse' });
    taken.push([P.F.x + 22, P.F.z - 8]);
    const rr = mulberry32(18063);
    for (let i = 0; i < 12; i++) {
      const a = rr() * Math.PI * 2, d = 26 + rr() * 30;
      const x = P.F.x + Math.cos(a) * d, z = P.F.z + Math.sin(a) * d;
      if (roadDist(x, z) < 8 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.house({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + rr() * 3, depth: 6 });
    }
    // ---- the masserie and shepherds' huts out on the flanks
    for (const p of [P.B, P.D, P.H, P.J]) buildVillage(props, p, 18064 + Math.round(p.x * 3 + p.z * 7));
    // ---- Damas's redoubts before the defile: earth banks and an abatis; Il Fortino's old stone blockhouse and its wall
    props.rand = mulberry32(1806_0310);
    for (let k = -2; k <= 2; k++) props.wall({ x: P.I.x + k * 15, z: P.I.z + 24 + Math.abs(k) * 4, yaw: k * 0.12, length: 11, height: 1.1 });
    for (let k = -3; k <= 3; k++) props.logBarricade({ x: P.I.x + k * 13, z: P.I.z + 42 + Math.abs(k) * 4, yaw: k * 0.1, length: 8 });
    props.house({ x: P.C.x, z: P.C.z - 18, yaw: 0, width: 10, depth: 10, height: 4.5 });
    for (const [dx, dz, yaw] of [[-18, -32, 0], [18, -32, 0], [-30, -18, Math.PI / 2]] as const) props.wall({ x: P.C.x + dx, z: P.C.z + dz, yaw, length: 14, height: 1.6 });
    taken.push([P.I.x, P.I.z + 30], [P.C.x, P.C.z - 18]);

    // ---- stone field walls, hay barns and rocks across the plain
    const kinds = ['fieldwall', 'hay', 'rocks', 'farm', 'fieldwall', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 60 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 60 * 60)) continue;
      if (sideOf(x, z) > -20 || Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 55) || roadDist(x, z) < 12 || woods(x, z) > 0.3) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd8d2c0]] as const) {
      props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...taken.map(([x, z]) => ({ x, z, r: 10 })), { test: (x: number, z: number) => roadDist(x, z) < 5 }];
    // bare beeches and dark Bosnian pines
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 3600, broadleaf: 0.45, autumn: 1, maxY: 140, forest: (x: number, z: number) => woods(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.5, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt: number, t: number) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
