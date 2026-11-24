// Civita Castellana, 4 December 1798: Ferdinand of Naples sent Mack’s army north to throw the French out of Rome;
// Championnet drew his few divisions back behind the Tiber valley, and Macdonald held Civita Castellana, the old
// Faliscan town on its tufa crag between the gorges of the Treja and its brooks, with the Via Flaminia running
// through it. Mack’s Neapolitans came at it in several columns from the south and over the plateau; each was held at
// the ravines and broken by counter-attacks, and the Neapolitan offensive collapsed into the retreat that ended
// with the French in Naples a month later.
// The ground, compressed: the town on its long crag in the middle of the map, between two deep wooded gorges cut
// into the tufa plateau — the Rio Maggiore to the north (+z) and the Treja to the south (−z) — that close in on each
// other to the east, where the Forte Sangallo guards the crag’s neck. The Via Flaminia comes down from the north over
// the Ponte Clementino, through the town and out over the Ponte Terrano to Nepi and Rome. Every way over a gorge is a
// lane cut down into the tufa (the Faliscan “vie cave”) to a bridge or a ford on the stream. The French come from
// the north (+z: the road from Borghetto and Otricoli), the Neapolitans from the south (−z: the road from Rome).
// Fair, not mirrored: each side has one gorge between it and the crag, each with a bridge on the Flaminia and two
// fords at the ends, the same lanes cut down to them; each half has a village on its west (Corchiano, Castel
// Sant’Elia) and a hill on its east (Borghetto’s castle hill against Monte Soratte’s flank, which is higher but
// farther out), and a farm on the Flaminia. The crag — the Vignale, the town and the fort — belongs to no one.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const BASE_Z = 450;
const PLATEAU = 16;                                                              // the tufa table over the streams
const noise = createNoise2D(1798_1204);
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

/** The two gorges: the crag between them narrowing to the east. */
const mid = (x: number) => 8 * Math.sin(x * 0.005);
const half = (x: number) => 125 - 0.05 * (x + 500);
const zN = (x: number) => mid(x) + half(x) + 6 * Math.sin(x * 0.02 + 1);        // the Rio Maggiore
const zS = (x: number) => mid(x) - half(x) + 7 * Math.sin(x * 0.017 + 2);       // the Treja
const gorgeD = (x: number, z: number) => Math.min(Math.abs(z - zN(x)), Math.abs(z - zS(x)));

/** The ways over: [x, channel, kind, name]. */
const XINGS: [number, number, 'bridge' | 'ford', string][] = [
  [30, 0, 'bridge', 'Ponte Clementino'], [-300, 0, 'ford', 'Corchiano ford'], [215, 0, 'ford', 'Borghetto ford'],
  [-60, 1, 'bridge', 'Ponte Terrano'], [-260, 1, 'ford', 'Sant’Elia ford'], [350, 1, 'ford', 'Sant’Oreste ford'],
];
const river = createRiver({
  path: zN,
  paths: [zN, zS],
  halfWidth: 5,
  level: 0,
  depth: 1.6,
  valley: 30,
  crossings: XINGS.map(([x, channel, kind, name]) => ({ name, x, kind, width: kind === 'bridge' ? 8 : 10, channel })),
});
const RAMP = 78;                                                                 // (how far each cut lane runs back from the stream)
const fz = (c: number) => (c ? zS : zN);

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Borghetto road', x: 0, z: 440, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Corchiano', x: -320, z: 290, owner: null, sector: 'west' },
  { id: 'C', name: 'Gallese road', x: -60, z: 250, owner: null, sector: 'centre' },
  { id: 'D', name: 'Borghetto', x: 300, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Il Vignale', x: -320, z: 10, owner: null, sector: 'west' },
  { id: 'F', name: 'Civita Castellana', x: -20, z: 5, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Forte Sangallo', x: 290, z: 5, owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'Castel Sant’Elia', x: -350, z: -290, owner: null, sector: 'west' },
  { id: 'I', name: 'Nepi road', x: 80, z: -265, owner: null, sector: 'centre' },
  { id: 'J', name: 'Sant’Oreste', x: 340, z: -310, owner: null, sector: 'east' },
  { id: 'K', name: 'Rome road', x: 0, z: -440, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

/** The lane down to crossing i, either side: [[x, top], [x, bottom]] (bottom = past the stream on the far bank). */
const lane = (i: number) => { const [x, c] = XINGS[i], z = fz(c)(x); return [[x, z + RAMP + 4], [x, z - RAMP - 4]]; };
const at = (id: string) => [P[id].x, P[id].z];
/** The roads (polylines): the Flaminia down the middle, the west and east tracks, the lane along the crag. */
const ROADS: number[][][] = [
  [[0, 560], at('A'), at('C'), ...lane(0), at('F'), ...lane(3), at('I'), at('K'), [0, -560]],
  [at('A'), at('B'), ...lane(1), at('E'), ...lane(4), at('H'), at('K')],
  [at('A'), at('D'), ...lane(2), at('G'), ...lane(5), at('J'), at('K')],
  [at('E'), at('F'), at('G')],
  [at('B'), at('C')], [at('H'), at('I')],
];
const segD = (r: number[][], x: number, z: number) => {
  let b = 1e9;
  for (let i = 0; i < r.length - 1; i++) {
    const [ax, az] = r[i], [bx, bz] = r[i + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    b = Math.min(b, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return b;
};
const roadDist = (x: number, z: number) => { let b = 1e9; for (const r of ROADS) b = Math.min(b, segD(r, x, z)); return b; };

/** The ground, sampled once every 2 m: the tufa table, the hills, the cut lanes, then the gorges. */
const land = gridCacheSmooth((x: number, z: number) => {
  let h = PLATEAU + fbm(noise, x * 0.003, z * 0.003, 3) * 2.5 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.4;
  h += hill(x, z, 380, -420, 140, 40) + hill(x, z, 300, -380, 70, 8);                          // Monte Soratte’s flank
  h += hill(x, z, 360, 390, 130, 40) + hill(x, z, -400, 400, 130, 12);                         // Borghetto’s castle hill; the rise to Corchiano
  h += hill(x, z, P.E.x - 20, P.E.z, 90, 4);                                                    // the Vignale
  for (const bz of [BASE_Z, -BASE_Z]) h += (PLATEAU + 1 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  for (const [cx, c] of XINGS) {                                                                // the cut lanes down to the stream
    const k = 1 - smoothstep(4, 10, Math.abs(x - cx));
    if (k <= 0) continue;
    const ramp = 1 + Math.max(0, Math.abs(z - fz(c)(cx)) - 10) * 0.22;
    if (ramp < h) h += (ramp - h) * k;
  }
  return river.carve(x, z, h);
}, EXT, 2);
const height = (x: number, z: number) => land(x, z);

/** The woods (0..1): oak and hazel down every gorge wall, chestnut copses on the plateau. */
const woods = (x: number, z: number) => {
  const g = gorgeD(x, z);
  let k = smoothstep(0.55, 0.7, fbm(noise, x * 0.006 + 9, z * 0.006 - 17, 3)) * 0.7;
  k = Math.max(k, smoothstep(36, 26, g) * smoothstep(6, 9, g) * 0.95);
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 58, Math.hypot(x - p.x, z - p.z)));
  for (const [cx] of XINGS) k = Math.min(k, smoothstep(8, 14, Math.abs(x - cx)));
  return Math.min(k, smoothstep(5, 11, roadDist(x, z)));
};
const TOWN = { x: P.F.x, z: P.F.z, rx: 95, rz: 62 };
const townR = (x: number, z: number) => Math.hypot((x - TOWN.x) / TOWN.rx, (z - TOWN.z) / TOWN.rz);

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'civita-castellana',
  armies: { nato: ['fr'], pact: ['gb', 'ru'] }, // (Macdonald’s division against Mack’s Neapolitans: no Neapolitan army yet — the British stand in, the Russians behind)
  name: 'Civita Castellana',
  description: 'Civita Castellana, 4 December 1798: the old town on its tufa crag between the wooded gorges of the Treja and the Rio Maggiore, the Forte Sangallo at its neck, the Via Flaminia crossing the Ponte Clementino — Macdonald’s French against Mack’s Neapolitans.',
  epochs: ['1806'],
  region: 'italy',
  airfields: [], // (a plateau cut by gorges: no strip; 1806 has no aircraft)
  conditions: { time: 'day', weather: 'overcast' }, // (a grey December day in the Roman Campagna)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 179812,
  height,
  steep: 0.5, // (wheels keep to the cut lanes down the gorges; men climb the walls)
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: (x: number, z: number) => woods(x, z) * 0.85,
  fields: createFields({ seed: 1798_04, cell: 62, weights: [0.3, 0.25, 0.25, 0.2] }), // (December: ploughland, stubble, pasture, olive and vine)

  theme: {
    // a grey, mild December day: low cloud over the Campagna, the tufa warm brown-red
    fogColor: 0xbcc0bc, fogDensity: 0.0012,
    skyTop: 0x7a8a9c, skyHorizon: 0xc8ccc8, skyBottom: 0x84846e,
    sunColor: 0xf2e8d8, sunIntensity: 1.4, sunDisk: 0.1,
    clouds: 0.75, cloudLight: 0xdcdcda, cloudDark: 0x8a9098,
    sunDir: [0.3, 0.5, -0.5],
    hemiSky: 0xc4ccd2, hemiGround: 0x5c5640, hemiIntensity: 1.35,
    rimColor: 0xd6d8da, rimIntensity: 0.2,
    terrain: {
      grass: '#62703e', grassAlt: '#5a6838', dryGrass: '#8c8456', dirt: '#7a5a42', rock: '#9a7a5e',
      pasture: '#667440', ploughed: '#74543c', stubble: '#9a8c5c', meadow: '#64743e',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (roadDist(x, z) < 3) return [0xa08a6a, 0.8];                                           // the roads and cut lanes
        if (townR(x, z) < 1 && gorgeD(x, z) > 30) return [0x9a8a78, 0.75];                       // the town’s paving
        const g = gorgeD(x, z);
        if (g > 7 && g < 32 && y > 3 && y < PLATEAU - 1.5) return [0x9a6c4c, 0.75];               // the tufa walls, red-brown
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-250, 0, 250] }, pact: { x: 0, z: -BASE_Z, entries: [-250, 0, 250] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1st Company' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const taken: number[][] = [];
    const STONE = 0xa88a70, PLINTH = 0x8a6e56;
    const stoneWall = (x: number, z: number, yaw: number, len: number, h = 4.5) => {
      const g = terrain.heightAt(x, z);
      props.box('stone', x, g + h / 2 - 0.9, z, len, h, 2.4, yaw, STONE);
      props.box('stone', x, g - 0.4, z, len + 0.3, 1.6, 3, yaw, PLINTH);
      props.cover.addBox({ x, z, yaw, length: len, thickness: 2.4, height: h - 1 });
    };
    const free = (x: number, z: number, r = 12) => roadDist(x, z) > 7 && gorgeD(x, z) > 34 && !taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < r);

    // ---- Civita Castellana: the town wall along the crag’s edges, open where the roads come in (west, north, south, east); the Duomo, the houses
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      const x = TOWN.x + Math.cos(a) * TOWN.rx, z = TOWN.z + Math.sin(a) * TOWN.rz;
      if (gorgeD(x, z) < 31 || roadDist(x, z) < 9) continue;
      const tx = -Math.sin(a) * TOWN.rx, tz = Math.cos(a) * TOWN.rz;
      stoneWall(x, z, Math.atan2(-tz, tx), 0.1 * Math.hypot(tx, tz) + 0.6);
    }
    props.rand = mulberry32(1798_1201);
    props.church({ x: P.F.x + 30, z: P.F.z + 16, yaw: Math.PI / 2 });                          // the Duomo, Santa Maria Maggiore
    taken.push([P.F.x + 30, P.F.z + 16]);
    const rr = mulberry32(17981);
    for (let i = 0, n = 0; i < 500 && n < 44; i++) {
      const a = rr() * Math.PI * 2, d = 0.25 + rr() * 0.65;
      const x = TOWN.x + Math.cos(a) * TOWN.rx * d, z = TOWN.z + Math.sin(a) * TOWN.rz * d;
      if (!free(x, z, 11) || Math.hypot(x - P.F.x, z - P.F.z) < 14) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: (rr() < 0.5 ? 0 : Math.PI / 2) + (rr() - 0.5) * 0.1, width: 7 + rr() * 2, depth: 8, storeys: rr() < 0.5 ? 3 : 2, damaged: 0.1 });
    }
    // ---- the Forte Sangallo: the pentagon across the crag’s neck, a gate in every face, the round keep off the centre
    for (let s = 0; s < 5; s++) {
      const a0 = s * Math.PI * 2 / 5 + 0.3, a1 = a0 + Math.PI * 2 / 5, R = 36;
      const x0 = P.G.x + Math.cos(a0) * R, z0 = P.G.z + Math.sin(a0) * R, x1 = P.G.x + Math.cos(a1) * R, z1 = P.G.z + Math.sin(a1) * R;
      const yaw = -Math.atan2(z1 - z0, x1 - x0);
      for (const t of [0.17, 0.83]) { const wx = x0 + (x1 - x0) * t, wz = z0 + (z1 - z0) * t; if (roadDist(wx, wz) > 10) stoneWall(wx, wz, yaw, 13, 5.5); } // (the middle third open: the gate; open too where a road comes in)
      if (roadDist(x0, z0) < 12) continue;
      const g = terrain.heightAt(x0, z0);
      props.box('stone', x0, g + 2.2, z0, 9, 6.4, 9, a0 + Math.PI / 4, STONE);                  // the corner bastion
      props.cover.addBox({ x: x0, z: z0, yaw: a0 + Math.PI / 4, length: 9, thickness: 9, height: 5.5 });
    }
    const KP = { x: P.G.x + 5, z: P.G.z - 21 }; // (clear of the roads in from both fords)
    props.column({ x: KP.x, z: KP.z, radius: 7, height: 12 });
    props.cover.addCylinder({ x: KP.x, z: KP.z, radius: 7, height: 12, spots: false });
    taken.push([KP.x, KP.z]);
    // ---- Borghetto’s castle ruin on its hill; Sant’Oreste on Soratte’s flank, Castel Sant’Elia’s basilica, Corchiano; the Vignale’s chapel
    const BC = { x: P.D.x + 40, z: P.D.z + 40 }, g0 = terrain.heightAt(BC.x, BC.z);
    props.box('stone', BC.x, g0 + 6, BC.z, 8, 14, 8, 0.2, 0x9a8670);
    props.cover.addBox({ x: BC.x, z: BC.z, yaw: 0.2, length: 8, thickness: 8, height: 12 });
    for (const [dx, dz, yaw, len] of [[0, -14, 0.2, 24], [14, 2, Math.PI / 2 + 0.2, 20]] as const) props.wall({ x: BC.x + dx, z: BC.z + dz, yaw, length: len, height: 2.6, thickness: 1.2 });
    taken.push([BC.x, BC.z]);
    props.church({ x: P.H.x - 30, z: P.H.z - 16, yaw: 0 });
    props.church({ x: P.E.x - 34, z: P.E.z + 10, yaw: Math.PI / 2 });
    taken.push([P.H.x - 30, P.H.z - 16], [P.E.x - 34, P.E.z + 10]);
    for (const p of [P.B, P.H, P.J, P.C, P.I]) buildVillage(props, p, 17985 + Math.round(p.x * 3 + p.z * 7));

    // ---- farms, field walls and hay on the plateau
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 60 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 60 || Math.hypot(x, z + BASE_Z) < 60 || nearPoint(x, z, 60) || woods(x, z) > 0.25 || !free(x, z, 40) || gorgeD(x, z) < 45 || townR(x, z) < 1.3) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd4d0c0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 16 })),
      { test: (x: number, z: number) => gorgeD(x, z) < 7 || roadDist(x, z) < 5 || (townR(x, z) < 1.05 && gorgeD(x, z) > 30) }];
    // oak, hazel and holm oak down the gorges; chestnut, olive and umbrella pine on the plateau
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 3600, broadleaf: 0.75, autumn: 0.3, maxY: 70, forest: (x: number, z: number) => woods(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.6, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt: number, t: number) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
