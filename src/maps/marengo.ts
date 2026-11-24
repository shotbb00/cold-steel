// Marengo, 14 June 1800: Melas came out of Alessandria at dawn over the Bormida bridges and through the bridgehead
// onto the flat plain beyond, where Bonaparte, thinking the Austrians would not fight, had his army spread thin.
// Victor’s line held all morning behind the Fontanone — a stream in a ditch with steep banks, crossed at a few
// places — round the farm of Marengo, while Ott’s column came round the north by Castel Ceriolo; by afternoon the
// French were driven back east past the vineyards on the road to San Giuliano. Then Desaix came up, Kellermann’s
// cavalry struck the Austrian column in the flank by the Vigna Santa, and the day turned. The Austrians come from
// the west (−z: the bridgehead before the Bormida, the bridges to Alessandria behind it), the French from the east
// (+z: San Giuliano on the Tortona road). The Fontanone runs across the middle from north (−x, toward the Po) to south
// (+x), the post road down the middle over its bridge at Marengo; the plain rises very slightly toward the
// Apennine foothills in the south. Cascine, vineyards, wheat ready for harvest.
// Fair, not mirrored: the Fontanone runs slantwise across the field, so Pederbona in the north lies on the Austrian
// bank and Stortigliona in the south on the French — one farm on the stream for each, each as far from its base;
// Marengo itself sits on both banks round its bridge and belongs to no one. Castel Ceriolo for Frugarolo; Cascina
// Grossa on the road for La Ventolina; the vineyard knoll of the Vigna Santa for the rise at La Barbotta, as high.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 450;
const noise = createNoise2D(1800_0614);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
// the Fontanone: slantwise across the middle, north (−x) on the French side of the line, south on the Austrian
const fontZ = (x) => -0.2 * x + 14 * Math.sin(x * 0.012 + 0.7) + 6 * Math.sin(x * 0.031);

// the post road, Alessandria to Tortona, down the middle over the Fontanone at Marengo
const roadX = (z) => 14 * Math.sin(z * 0.005 + 0.4) + 7 * Math.sin(z * 0.013) - 6;

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'San Giuliano', x: 0, z: 425, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Castel Ceriolo', x: -350, z: 270, owner: null, sector: 'west' },
  { id: 'C', name: 'Cascina Grossa', x: -90, z: 230, owner: null, sector: 'centre' },
  { id: 'D', name: 'Vigna Santa', x: 240, z: 285, owner: null, sector: 'east' },
  { id: 'E', name: 'Pederbona', x: -320, z: 20, owner: null, sector: 'west' },
  { id: 'F', name: 'Marengo', x: Math.round(roadX(0)), z: Math.round(fontZ(roadX(0))), owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Stortigliona', x: 330, z: -10, owner: null, sector: 'east' },
  { id: 'H', name: 'La Barbotta', x: -215, z: -285, owner: null, sector: 'west' },
  { id: 'I', name: 'La Ventolina', x: 140, z: -235, owner: null, sector: 'centre' },
  { id: 'J', name: 'Frugarolo road', x: 365, z: -335, owner: null, sector: 'east' },
  { id: 'K', name: 'Bormida bridgehead', x: 0, z: -425, owner: 'pact', sector: 'centre', radius: 26 },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

const ROAD_BRIDGE = { x: P.F.x, z: P.F.z };
// the Fontanone (channel 0): a narrow deep stream in a steep ditch; the Bormida (channel 1) behind the bridgehead
const river = createRiver({
  path: fontZ,
  paths: [fontZ, [[-720, -506, 24], [-380, -514, 24], [-120, -503, 24], [160, -518, 24], [420, -508, 24], [720, -515, 24]]],
  halfWidth: 4.5,
  level: 0,
  depth: 2.4,
  valley: 13,
  crossings: [
    { name: 'Marengo bridge', x: ROAD_BRIDGE.x, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Pederbona ford', x: -400, kind: 'ford', width: 12, channel: 0 },
    { name: 'Spinetta ford', x: -200, kind: 'ford', width: 12, channel: 0 },
    { name: 'Lungavilla ford', x: 190, kind: 'ford', width: 12, channel: 0 },
    { name: 'Stortigliona ford', x: 410, kind: 'ford', width: 12, channel: 0 },
    { name: 'Bormida bridge', x: -130, z: -505, kind: 'bridge', width: 7, channel: 1 },
    { name: 'pontoon bridge', x: 190, z: -515, kind: 'bridge', width: 6, channel: 1 },
  ],
});
const fontD = (x, z) => Math.abs(z - fontZ(x));
const roadSeg = (x, z, a, b) => { // distance to a straight lane a→b
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
};
// the lanes: Marengo to Castel Ceriolo, Marengo to Frugarolo
const onRoad = (x, z, w = 4) => Math.abs(x - roadX(z)) < w || roadSeg(x, z, P.F, P.B) < w * 0.75 || roadSeg(x, z, P.F, P.J) < w * 0.75;

// the vineyards: the same number on each half, each from its own seed (the Vigna Santa’s on its knoll among them)
const VINES: { x: number; z: number; yaw: number }[] = [{ x: P.D.x + 55, z: P.D.z - 50, yaw: 0.15 }, { x: P.H.x - 55, z: P.H.z + 50, yaw: -0.2 }];
for (const s of [1, -1]) {
  const r = mulberry32(s > 0 ? 1800_61 : 1800_83);
  for (let i = 0, n = 0; i < 4000 && n < 6; i++) {
    const x = (r() * 2 - 1) * 430, z = s * (70 + r() * 320), yaw = (r() - 0.5) * 0.5;
    if (POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < 62) || VINES.some((v) => Math.hypot(v.x - x, v.z - z) < 80) || onRoad(x, z, 30) || fontD(x, z) < 45) continue;
    VINES.push({ x, z, yaw }); n++;
  }
}
const vineAt = (x, z, m = 0) => VINES.some((v) => {
  const dx = x - v.x, dz = z - v.z, c = Math.cos(v.yaw), s = Math.sin(v.yaw);
  return Math.abs(dx * c - dz * s) < 22 + m && Math.abs(dx * s + dz * c) < 16 + m;
});

/** The woods (0..1): a few copses on the open plain, willows along the Fontanone, poplars by the road. */
const woods = (x, z) => {
  let k = smoothstep(0.58, 0.7, fbm(noise, x * 0.006 + 9, z * 0.006 - 17, 3)) * 0.6;
  k = Math.max(k, smoothstep(1.05, 0.8, Math.hypot((x + 140) / 60, (z - 340) / 45)), smoothstep(1.05, 0.8, Math.hypot((x - 120) / 60, (z + 345) / 45))); // (a copse behind each line)
  for (const p of POINTS) k = Math.min(k, smoothstep(32, 56, Math.hypot(x - p.x, z - p.z)));
  if (onRoad(x, z, 10) || vineAt(x, z, 4)) return 0;
  return k;
};

function height(x, z) {
  let h = fbm(noise, x * 0.0026, z * 0.0026, 3) * 1.6 + fbm(noise, x * 0.02 + 5, z * 0.02, 3) * 0.3 + 4.5;
  h += 1.6 * (x / 500);                                                                        // (the plain rising very slightly south, to the Apennines)
  h += hill(x, z, P.D.x + 30, P.D.z - 25, 90, 3.1) + hill(x, z, P.H.x - 25, P.H.z + 20, 90, 6.4); // the Vigna Santa knoll; the rise at La Barbotta
  h += hill(x, z, P.B.x - 20, P.B.z + 20, 70, 2) + hill(x, z, P.J.x + 20, P.J.z - 20, 70, 1.6);  // (Castel Ceriolo’s and Frugarolo’s low swells)
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 10 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, z) * 12;
  for (const p of POINTS) if (!'DH'.includes(p.id)) h += (h * 0.6 + 2 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (4.5 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(2.4, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'marengo',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Bonaparte’s Army of the Reserve against Melas; the Austrians have no units yet: the Russians stand in)
  name: 'Marengo',
  description: 'Piedmont, 14 June 1800: the flat Alessandria plain between the Bormida bridgehead and San Giuliano — the Fontanone in its steep-banked ditch, the farm of Marengo at its bridge, Castel Ceriolo, the vineyards and cascine where Desaix and Kellermann turned the day.',
  epochs: ['1806'],
  region: 'italy',
  airfields: [], // (1806 has no aircraft)
  conditions: { time: 'day', weather: 'clear' }, // (a hot June day on the plain)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180006,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1800_14, cell: 68, weights: [0.12, 0.46, 0.27, 0.15] }), // (June: the wheat ripe and some of it cut, meadows, maize)

  theme: {
    // a hot clear June day on the Alessandria plain, dust over the road, the Apennines blue in the haze
    fogColor: 0xd4d2c4,
    fogDensity: 0.0011,
    skyTop: 0x4a7cc0,
    skyHorizon: 0xdcdcd0,
    skyBottom: 0x8e8a70,
    sunColor: 0xfff0d0,
    sunIntensity: 2.1,
    sunDisk: 0.55,
    clouds: 0.2,
    cloudLight: 0xf6f4ee,
    cloudDark: 0xa8acb0,
    sunDir: [0.3, 0.7, 0.3],
    hemiSky: 0xcfdae6,
    hemiGround: 0x5e5838,
    hemiIntensity: 1.25,
    rimColor: 0xe4e0d4,
    rimIntensity: 0.25,
    terrain: {
      grass: '#66743a',
      grassAlt: '#5e6c36',
      dryGrass: '#a49656',
      dirt: '#6e5c40',
      rock: '#8a8270',
      strip: '#5a4c34',
      pasture: '#687638',
      ploughed: '#6a5438',
      stubble: '#b8a462',
      meadow: '#6c7a3c',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (onRoad(x, z)) return [0xa89676, 0.75];                                                  // the post road and the lanes, dusty
        if (vineAt(x, z)) return [0x806848, 0.5];                                                    // the vineyards’ worked soil
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 360 }, pact: { x: 0, z: -360 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearWater = (x, z, r) => river.project(x, z).d < river.project(x, z).hw + r;
    const taken: number[][] = [];

    // ---- Marengo: the big farm by the bridge and the houses along the road on both banks; San Giuliano at the east end
    const street = (c, n, spread, seed, d0 = 14) => {
      const rr = mulberry32(seed);
      for (let i = 0; i < n * 4 && n > 0; i++) {
        const z = c.z + (rr() * 2 - 1) * spread, side = rr() < 0.5 ? -1 : 1, x = roadX(z) + side * (d0 + rr() * 22);
        if (onRoad(x, z, 9) || nearWater(x, z, 9) || Math.hypot(x, z - BASE_Z) < 38 || Math.hypot(x, z + BASE_Z) < 38 || nearPoint(x, z, 12) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 14)) continue;
        taken.push([x, z]); n--;
        props.rand = mulberry32(Math.floor(rr() * 1e9));
        props.townHouse({ x, z, yaw: Math.PI / 2, width: 7 + rr() * 3, depth: 8, storeys: rr() < 0.4 ? 2 : 1, damaged: 0 });
      }
    };
    props.rand = mulberry32(14061800);
    const farm = { x: roadX(P.F.z + 45) + 34, z: P.F.z + 45 };                                     // the farm of Marengo: its court and barns
    props.townHouse({ x: farm.x, z: farm.z, yaw: 0.05, width: 20, depth: 10, storeys: 2, name: 'Cascina Marengo', damaged: 0 });
    props.townHouse({ x: farm.x + 16, z: farm.z - 18, yaw: Math.PI / 2 + 0.05, width: 16, depth: 8, storeys: 1, name: 'the barn', damaged: 0 });
    props.wall({ x: farm.x - 4, z: farm.z - 26, yaw: 0.05, length: 26, height: 2.2, thickness: 0.8 });
    taken.push([farm.x, farm.z], [farm.x + 16, farm.z - 18]);
    street(P.F, 12, 75, 1800_301);
    street(P.A, 10, 60, 1800_302, 40);
    props.rand = mulberry32(14061801);
    props.church({ x: roadX(P.A.z - 25) - 30, z: P.A.z - 25, yaw: Math.PI / 2 });
    for (const [dx, dz, yaw, length] of [[0, -18, 0, 24], [-12, -6, Math.PI / 2, 24], [12, -6, Math.PI / 2, 24]] as const) props.wall({ x: roadX(P.A.z - 25) - 30 + dx, z: P.A.z - 25 + dz, yaw, length, height: 1.6 }); // (San Giuliano’s churchyard)
    taken.push([roadX(P.A.z - 25) - 30, P.A.z - 25]);

    // ---- Castel Ceriolo: the castle’s square tower and the church among its houses; Frugarolo’s church on its road
    const tw = { x: P.B.x - 30, z: P.B.z + 10 }, g0 = terrain.heightAt(tw.x, tw.z);
    props.box('stone', tw.x, g0 + 7, tw.z, 8, 16, 8, 0, 0xa86a4c);
    props.cover.addBox({ x: tw.x, z: tw.z, yaw: 0, length: 8, thickness: 8, height: 14 });
    for (const [dx, dz, yaw] of [[0, -14, 0], [0, 14, 0], [14, 0, Math.PI / 2]] as const) {
      props.box('stone', tw.x + dx, g0 + 2, tw.z + dz, 26, 4.5, 2, yaw, 0xa06446);
      props.cover.addBox({ x: tw.x + dx, z: tw.z + dz, yaw, length: 26, thickness: 2, height: 4 });
    }
    taken.push([tw.x, tw.z]);
    props.church({ x: P.B.x + 32, z: P.B.z - 14, yaw: 0 });
    props.church({ x: P.J.x - 32, z: P.J.z + 14, yaw: Math.PI });
    taken.push([P.B.x + 32, P.B.z - 14], [P.J.x - 32, P.J.z + 14]);

    // ---- the bridgehead: the Austrian earthwork before the Bormida bridges, open at the gorge, gaps for the roads
    for (let a = -1.15; a <= 1.16; a += 0.23) {
      const x = Math.sin(a) * 120, z = -BASE_Z + Math.cos(a) * 62 - 12;
      if ([-300, 0, 300].some((e) => Math.abs(x - e) < 22)) continue;
      props.wall({ x, z, yaw: Math.atan2(62 * Math.sin(a), 120 * Math.cos(a)), length: 26, height: 1.5, thickness: 1.4 });
    }

    // ---- the cascine at the points: farm courts round the yard
    for (const p of POINTS) if ('CDEGHI'.includes(p.id)) buildVillage(props, p, 18006 + Math.round(p.x * 5 + p.z * 3));

    // ---- the vineyards: low rows of vines on their stakes
    for (const v of VINES) {
      for (let lz = -14; lz <= 14; lz += 3.5) for (let lx = -16; lx <= 16; lx += 10.6) {
        const x = v.x + lx * Math.cos(v.yaw) + lz * Math.sin(v.yaw), z = v.z - lx * Math.sin(v.yaw) + lz * Math.cos(v.yaw);
        props.box('plain', x, terrain.heightAt(x, z) + 0.6, z, 10, 1.2, 0.7, v.yaw, 0x5a6a2a);
      }
    }

    // ---- farms, walls and hay across the plain
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'hay'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 80 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 100);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 70 || Math.hypot(x, z + BASE_Z) < 120 || nearPoint(x, z, 60) || woods(x, z) > 0.25 || nearWater(x, z, 30) || onRoad(x, z, 24) || vineAt(x, z, 14)
        || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 40)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd0ccbc]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 14 })), { test: (x, z) => nearWater(x, z, 1.5) || onRoad(x, z, 5) || vineAt(x, z, 2) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2400, broadleaf: 0.9, autumn: 0.05, maxY: 40,
      forest: (x, z) => (nearWater(x, z, 9) ? 0.5 : onRoad(x, z, 8) ? 0.22 : woods(x, z) * 0.95) }); // (willows along the Fontanone and the Bormida, poplars on the road)
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1300, lane: 0 }); // (the mulberry and maple rows between the fields)
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.3, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
        hedges.update(dt, t);
      },
    };
  },
} satisfies MapDef;
