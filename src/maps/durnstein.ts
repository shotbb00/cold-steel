// Dürenstein, 11 November 1805: Mortier had crossed to the north bank of the Danube with Gazan's division and
// marched down the Wachau toward Krems, strung out on the one road between the river and the steep vine terraces.
// Kutuzov turned on him: Miloradovich came up the road from Stein past the Rothenhof and Unterloiben, while
// Dokhturov's column climbed the hills by goat paths and came down the ravines behind the French at Dürnstein.
// Gazan's men fought in the Loiben plain all day and broke out through Dürnstein after dark, when Dupont came
// down from Weißenkirchen; Mortier himself got away by boat. The ground: the Danube along the south (+x), the
// steep vineyards and wooded tops of the Wachau hills along the north (−x) with the Loibenberg between two
// ravines, the walled town of Dürnstein with its abbey under the castle rock, the wider Loiben plain in the middle,
// the Rothenhof and the Förthof toward Stein. The French come from the west (+z: Weißenkirchen), the Russians
// from the east (−z: Stein). Fair, not mirrored: the hills run the whole length, so each side has the same
// terraces and a hill point above it (the Dürnstein castle rock, the Pfaffenberg) and the same ravine down
// into the plain; the walled town before the French is answered by the Rothenhof's farm walls and Unterloiben;
// the Loibenberg and Oberloiben are owned by neither; no one fights across the river. 1806 only (`epochs`).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 480;
const noise = createNoise2D(1805_11_11);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Weißenkirchen road', x: 0, z: 450, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Dürnstein castle', x: -340, z: 280, owner: null, sector: 'west' },
  { id: 'C', name: 'Dürnstein', x: 70, z: 250, owner: null, sector: 'centre', radius: 28 },
  { id: 'D', name: 'Dürnstein landing', x: 300, z: 290, owner: null, sector: 'east' },
  { id: 'E', name: 'Loibenberg', x: -300, z: 10, owner: null, sector: 'west' },
  { id: 'F', name: 'Oberloiben', x: 0, z: 0, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Unterloiben', x: 250, z: -60, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Pfaffenberg', x: -320, z: -250, owner: null, sector: 'west' },
  { id: 'I', name: 'Rothenhof', x: -30, z: -270, owner: null, sector: 'centre' },
  { id: 'J', name: 'Förthof', x: 330, z: -240, owner: null, sector: 'east' },
  { id: 'K', name: 'Stein', x: 0, z: -450, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Danube along the south edge, wide and grey; no bridge in the Wachau
const DANUBE = [[445, -720], [425, -420], [450, -150], [438, 120], [455, 400], [440, 720]];
const river = createRiver({ paths: [DANUBE], halfWidth: 55, level: 0, depth: 3.2, valley: 50, crossings: [] });
// the Wachau road along the river, Weißenkirchen to Stein
const roadX = (z) => 175 + 25 * Math.sin(z * 0.004 + 1.2);
const roadD = (x, z) => Math.abs(x - roadX(z));
/** Where the hills start (x) at z: close to the river at Dürnstein and at Stein, back from it round the Loiben plain. */
const footX = (z) => -95 - 95 * Math.exp(-((z / 260) ** 2));
// the two ravines down from the tops: behind Dürnstein (Dokhturov's way down) and above the Rothenhof
const RAVINES = [140, -160];
const ravine = (x, z) => Math.max(...RAVINES.map((rz) => smoothstep(32, 8, Math.abs(z - rz - (x + 300) * 0.12)))) * smoothstep(footX(z) + 40, footX(z) - 40, x);
/** 0 on the plain, 1 up on the hills. */
const slope = (x, z) => smoothstep(footX(z), footX(z) - 250, x + fbm(noise, z * 0.005 + 4, x * 0.005, 2) * 40);
/** 1 in Dürnstein's walls, 0 outside. */
const town = (x, z) => smoothstep(1.1, 0.85, Math.hypot((x - 95) / 75, (z - 255) / 58));
const nearRiver = (x, z, r) => river.project(x, z).d < river.halfWidth + r;

/** Woods (0..1): the forest on the hilltops, spinneys in the ravines, the river meadows' willows. */
const woods = (x, z) => {
  let k = smoothstep(0.7, 0.95, slope(x, z)) * (0.8 + 0.2 * fbm(noise, x * 0.01, z * 0.01, 2));
  k = Math.max(k, smoothstep(0.55, 0.7, fbm(noise, x * 0.006 + 8, z * 0.006 - 30, 3)) * 0.7, ravine(x, z) * 0.6);
  k = Math.min(k, 1 - town(x, z), smoothstep(8, 20, roadD(x, z)));
  for (const p of POINTS) k = Math.min(k, smoothstep(32, 56, Math.hypot(x - p.x, z - p.z)));
  return k;
};

function height(x, z) {
  let h = fbm(noise, x * 0.0026, z * 0.0026, 3) * 2.5 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.4 + 4;
  h += slope(x, z) * 30 + fbm(noise, x * 0.008 - 11, z * 0.008, 3) * 4 * slope(x, z);           // the vine terraces up to the wooded tops
  h += hill(x, z, P.B.x, P.B.z, 55, 6) + hill(x, z, P.H.x, P.H.z, 60, 6) + hill(x, z, P.E.x - 20, P.E.z, 80, 9); // the castle rock, the Pfaffenberg, the Loibenberg
  h -= ravine(x, z) * 7;
  h += smoothstep(-BOUNDS.x + 30, -BOUNDS.x - 160, x) * 20 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  for (const p of POINTS) if (!'BEH'.includes(p.id)) h += (h * 0.5 + 2.2 - h) * smoothstep(44, 22, Math.hypot(x - p.x, z - p.z)) * 0.6;
  h += (3 - h) * town(x, z) * 0.6;
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(36, 18, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'durnstein',
  armies: { nato: ['fr'], pact: ['ru'] }, // (Mortier and Gazan's division, then Dupont's, against Kutuzov's Russians)
  name: 'Dürenstein',
  description: 'The Wachau, 11 November 1805: the narrow north bank of the Danube under steep vineyards, walled Dürnstein below its castle rock, the Loiben plain and the Rothenhof toward Stein, the Russians coming over the hills.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'overcast' }, // (a cold, misty November day on the river)
  airfields: [],
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 18051111,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1805_111, cell: 64, weights: [0.35, 0.25, 0.25, 0.15] }), // November: meadows by the river, stubble, the vines picked

  theme: {
    // a grey November day in the Danube valley, mist over the water, the hills dark
    fogColor: 0xb0b6b4,
    fogDensity: 0.0018,
    skyTop: 0x76828e,
    skyHorizon: 0xc0c4be,
    skyBottom: 0x767870,
    sunColor: 0xe6dcc8,
    sunIntensity: 1.55,
    sunDisk: 0.12,
    clouds: 0.85,
    cloudLight: 0xcacbc6,
    cloudDark: 0x7a7e84,
    sunDir: [0.55, 0.45, -0.7],
    hemiSky: 0xc0c8d0,
    hemiGround: 0x4a4436,
    hemiIntensity: 1.25,
    rimColor: 0xbcc4cc,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5e6640',
      grassAlt: '#525c3a',
      dryGrass: '#8a7a52',
      dirt: '#5a4836',
      rock: '#6a6660',
      strip: '#4e4030',
      pasture: '#5a663c',
      ploughed: '#504030',
      stubble: '#8e7e54',
      meadow: '#66703e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const rd = roadD(x, z);
        if (rd < 5) return [0x857a68, smoothstep(5, 3, rd) * 0.75];                               // the Wachau road
        const t = town(x, z);
        if (t > 0) return [0x8a8274, t * 0.45];                                                   // Dürnstein's lanes
        const s = slope(x, z);
        if (s > 0.15 && s < 0.75) return [0x6a5a40, 0.35];                                        // the vineyards, the vines bare
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 200] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 200] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);

    // ---- Dürnstein: houses in its walls, the abbey church by the river, the town wall on the hill side
    const rr = mulberry32(1805_1111);
    const taken: number[][] = [];
    for (let i = 0; i < 36; i++) {
      const x = 95 + (rr() * 2 - 1) * 70, z = 255 + (rr() * 2 - 1) * 52;
      if (town(x, z) < 0.6 || roadD(x, z) < 8 || Math.hypot(x - P.C.x, z - P.C.z) < 15 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.PI / 2, width: 7 + rr() * 3, depth: 8, storeys: rr() < 0.6 ? 2 : 1, damaged: 0 });
    }
    props.rand = mulberry32(1805_112);
    props.church({ x: 145, z: 235, yaw: Math.PI / 2 });                                           // (the abbey, its tower over the Danube)
    for (let a = 1.75; a < 4.6; a += 0.32) props.wall({ x: 95 + Math.cos(a) * 84, z: 255 + Math.sin(a) * 66, yaw: a + Math.PI / 2, length: 18, height: 2.6 }); // (the town wall, landward)
    // the castle ruin on its rock
    props.townHouse({ x: P.B.x - 14, z: P.B.z + 6, yaw: 0.4, width: 9, depth: 9, storeys: 2, name: 'castle keep', damaged: 0.7 });
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) props.wall({ x: P.B.x + Math.cos(a) * 26, z: P.B.z + Math.sin(a) * 26, yaw: a + Math.PI / 2, length: 16, height: 2.4 });
    // the villages: Oberloiben and Unterloiben with their church, the Rothenhof's walled farm, the Förthof, the landing
    for (const p of POINTS) if (!p.owner && !'BCEH'.includes(p.id)) buildVillage(props, p, 18053 + Math.round(p.x * 3 + p.z * 7));
    props.church({ x: P.G.x - 34, z: P.G.z - 10, yaw: Math.PI / 2 });
    props.hall({ x: P.I.x + 26, z: P.I.z - 24, yaw: 0.1, width: 20, depth: 9, height: 5, color: 0x9a8a70, roof: 0x5a3a2a, door: 5, name: 'Rothenhof barn' });
    for (const [dx, dz, yaw, length] of [[0, -44, 0.1, 30], [-18, -30, Math.PI / 2, 22]] as const) props.wall({ x: P.I.x + dx, z: P.I.z + dz, yaw, length, height: 1.8 });
    props.house({ x: P.D.x + 30, z: P.D.z - 26, yaw: Math.PI / 2, width: 8, depth: 6 });          // (the boatmen's house)
    buildVillage(props, { x: 60, z: BASE_Z + 30 }, 1805_113);
    buildVillage(props, { x: 80, z: -BASE_Z - 30 }, 1805_114);
    // the vine terraces' dry-stone walls along the slope
    props.rand = mulberry32(1805_115);
    for (let z = -520; z < 520; z += 42) {
      for (let s = 0.2; s < 0.75; s += 0.14) {
        const x = footX(z) - 250 * s;
        if (rr() < 0.45 || nearPoint(x, z, 45) || ravine(x, z) > 0.2 || Math.hypot(x, z - BASE_Z) < 70 || Math.hypot(x, z + BASE_Z) < 70) continue;
        props.lowWall({ x, z, yaw: Math.PI / 2, length: 14, height: 0.9, color: 0x8a8476 });
      }
    }

    // ---- farms, hay and walls on the plain
    const kinds = ['farm', 'hay', 'fieldwall', 'farm', 'hay', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 50 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 60 * 60)) continue;
      if (Math.hypot(x, z - BASE_Z) < 60 || Math.hypot(x, z + BASE_Z) < 60 || nearPoint(x, z, 55) || woods(x, z) > 0.3 || slope(x, z) > 0.3 || nearRiver(x, z, 25) || town(x, z) > 0 || roadD(x, z) < 20) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xc8c4b0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x, z) => nearRiver(x, z, 1.5) || town(x, z) > 0.3 || roadD(x, z) < 5 }];
    // oak and beech on the tops, a few pines, willows and poplars on the river bank
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 5600, broadleaf: 0.75, autumn: 1, forest: (x, z) => (nearRiver(x, z, 14) ? 0.5 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1800, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2, fields: this.fields });

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
