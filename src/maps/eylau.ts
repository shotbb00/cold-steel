// Eylau, 8 February 1807: Preußisch Eylau in East Prussia, in the snow. Bennigsen's Russians on the
// low ridge east of the town with their great battery — some seventy heavy guns — and the French coming
// up from the west through the town, its church and its walled churchyard on the rise. A blizzard blew
// into Augereau's columns, they lost their way in the snow and walked into the Russian guns; then Murat
// led eighty squadrons through the Russian centre. The frozen ponds and lakes round the town bore men and
// horses. The French come from the west (+z), the Russians hold the east (−z). Point-mirrored for a fair
// fight: the Russian ridge has its twin in the Ziegelhof heights in front of the French, each frozen lake
// its twin; the town and its church stand at the centre, owned by neither. No `climate`: the winter tint
// whitens the soldiers' clothing (snow smocks), and 1807 fought in its coloured coats.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const TOWN = 80;    // Eylau's radius
const noise = createNoise2D(1807_02);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
const mirror = (x, z): [number, number] => (z < 0 || (z === 0 && x < 0) ? [-x, -z] : [x, z]);

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Landsberg road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Tenknitten', x: -390, z: 330, owner: null, sector: 'west' },
  { id: 'C', name: 'Ziegelhof', x: -110, z: 245, owner: null, sector: 'centre' },
  { id: 'D', name: 'Rothenen', x: 210, z: 375, owner: null, sector: 'east' },
  { id: 'E', name: 'Waschkeiten lake', x: -265, z: 105, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Eylau church', x: 0, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Serpallen', x: 265, z: -105, owner: null, sector: 'east', radius: 22 },
  { id: 'H', name: 'Schmoditten', x: -210, z: -375, owner: null, sector: 'west' },
  { id: 'I', name: 'Great battery', x: 110, z: -245, owner: null, sector: 'centre' },
  { id: 'J', name: 'Kutschitten', x: 390, z: -330, owner: null, sector: 'east' },
  { id: 'K', name: 'Anklappen', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the frozen lakes (our half; each has its twin): beside Tenknitten and the long one north of the town
const LAKES = [[-300, 190, 70, 34, 0.5], [-170, 395, 50, 26, -0.4]];
/** 1 on the ice, 0 off it. */
function ice(x, z) {
  const [ax, az] = mirror(x, z);
  let k = 0;
  for (const [cx, cz, rx, rz, a] of LAKES) {
    const dx = ax - cx, dz = az - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
    k = Math.max(k, smoothstep(1.05, 0.85, Math.hypot(u, v) + fbm(noise, ax * 0.03, az * 0.03, 2) * 0.12));
  }
  return k;
}
/** 1 in the town, 0 outside it. */
const town = (x, z) => smoothstep(TOWN + 15, TOWN - 15, Math.hypot(x, z));
/** Birch and fir copses (0..1), the same on both halves. */
const copse = (x, z) => {
  const [ax, az] = mirror(x, z);
  let k = smoothstep(0.36, 0.52, fbm(noise, ax * 0.006 + 40, az * 0.006 - 12, 3));
  k = Math.max(k, smoothstep(70, 40, Math.hypot(ax - 330, az - 180)) * 0.85); // (the wood by Rothenen)
  k = Math.min(k, 1 - town(x, z), 1 - ice(x, z));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 55, Math.hypot(x - p.x, z - p.z)));
  return k;
};

function height(x, z) {
  const [ax, az] = mirror(x, z);
  let h = fbm(noise, ax * 0.0025, az * 0.0025, 3) * 4 + fbm(noise, ax * 0.02 + 7, az * 0.02, 3) * 0.4;
  h += hill(ax, az, P.C.x, P.C.z, 95, 9);                                            // the Ziegelhof heights (and the Russian ridge, their twin)
  h += hill(ax, az, P.C.x + 60, P.C.z - 30, 60, 3);
  h += hill(ax, az, 0, 0, 70, 3);                                                     // the rise the church and churchyard stand on
  h += smoothstep(390, 560, az) * 10;
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 26 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, az) * 22;
  const k = ice(x, z);
  if (k > 0) h += (0.6 - h) * k + fbm(noise, ax * 0.02, az * 0.02, 2) * 0.1 * (1 - k); // the lakes: flat ice in a hollow
  for (const p of POINTS) if (!'CEI'.includes(p.id)) h += (h * 0.5 + 1.5 - h) * smoothstep(40, 20, Math.hypot(x - p.x, z - p.z)) * 0.5; // villages on level ground
  return h;
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'eylau',
  armies: { nato: ['fr'], pact: ['ru'] }, // (Napoleon against Bennigsen's Russians — L'Estocq's Prussians came late in the day)
  name: 'Eylau',
  description: 'East Prussia, February 1807: the town, its church and churchyard on the rise, frozen lakes and the Russian great battery on the ridge, in driving snow. Mirrored to keep it fair.',
  epochs: ['1806'],
  region: 'east',
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180702,
  height,
  woods: (x, z) => copse(x, z) * 0.8,
  fields: createFields({ seed: 1807, cell: 84, weights: [0.3, 0.2, 0.3, 0.2] }),

  theme: {
    // the blizzard: snow driving across the field, the light flat and white, the far side lost in it
    fogColor: 0xd2d6da,
    fogDensity: 0.0026,
    skyTop: 0x9aa0a8,
    skyHorizon: 0xd6dadc,
    skyBottom: 0xa4a8ac,
    sunColor: 0xe2e8ee,
    sunIntensity: 1.05,
    sunDisk: 0,
    clouds: 1,
    cloudLight: 0xd2d6da,
    cloudDark: 0x8a9096,
    sunDir: [0.3, 0.45, 0.75],
    hemiSky: 0xd6dce2,
    hemiGround: 0x9a9ea2,
    hemiIntensity: 1.5,
    rimColor: 0xc8d0d8,
    rimIntensity: 0.2,
    terrain: {
      grass: '#eef0f2',
      grassAlt: '#e4e8ea',
      dryGrass: '#dad8d2',
      dirt: '#a09a90',
      rock: '#bcbebc',
      pasture: '#ecefef',
      ploughed: '#d6d4cc',
      stubble: '#e0ddd4',
      meadow: '#f2f4f5',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const k = ice(x, z);
        if (k > 0.05) return [0xdce4ea, Math.min(1, k * 1.6) * 0.85];                         // the ice, swept bare in places
        const t = town(x, z);
        if (t > 0) return [0xb4b0a8, t * 0.45];                           // trodden streets and yards
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);

    // ---- Eylau: the church on its rise, the walled churchyard east of it, houses down the streets
    props.rand = mulberry32(18070208);
    props.church({ x: -10, z: 14, yaw: Math.PI / 2 });
    const yard = [[18, -2, 0], [18, -26, 0], [6, -14, Math.PI / 2], [30, -14, Math.PI / 2]] as const; // (the churchyard wall, a gap in each side)
    for (const [x, z, yaw] of yard) props.wall({ x, z, yaw, length: 10, height: 1.3, color: 0x8a8478 });
    for (let i = 0; i < 9; i++) props.boulder({ x: 12 + (i % 3) * 5, z: -8 - Math.floor(i / 3) * 5, radius: 0.35 }); // the graves under the snow
    const taken: number[][] = [[-10, 14, 16], [18, -14, 15]];
    const rr = mulberry32(1807);
    for (const a0 of [0.3, 1.9, 3.4, 5.0]) { // the streets out of the market (mirrored pairs)
      for (let d = 32; d < TOWN; d += 11 + rr() * 4) {
        for (const side of [-1, 1]) {
          if (rr() < 0.3) continue;
          const x = Math.cos(a0) * d - Math.sin(a0) * side * 10, z = Math.sin(a0) * d + Math.cos(a0) * side * 10, w = 7 + rr() * 2; // (a row each side of the street)
          if (taken.some(([tx, tz, r]) => Math.hypot(x - tx, z - tz) < r + 7) || taken.some(([tx, tz, r]) => Math.hypot(-x - tx, -z - tz) < r + 7)) continue;
          taken.push([x, z, 6], [-x, -z, 6]);
          const seed = Math.floor(rr() * 1e9);
          mirrored(props, seed, (m, flip) => props.townHouse({ x: x * m, z: z * m, yaw: a0 + Math.PI / 2 + flip, width: w, depth: 8, storeys: 2, damaged: 0 }));
        }
      }
    }

    // ---- the villages; the great battery's emplacement on the ridge (and its twin on the Ziegelhof)
    for (const p of POINTS) {
      if (p.z < 0 || (p.z === 0 && p.x <= 0) || p.id === 'E') continue;
      const seed = 18072 + Math.round(p.x * 3 + p.z);
      buildVillage(props, p, seed, 1);
      buildVillage(props, { x: -p.x, z: -p.z }, seed, -1);
    }
    mirrored(props, 1807_3, (m, flip) => {
      const q = { x: P.I.x * m, z: P.I.z * m };
      for (let k = -2; k <= 2; k++) props.wall({ x: q.x + k * 14 * m, z: q.z + 12 * m, yaw: flip, length: 9, height: 0.9, color: 0x8a8070 }); // the gun line's breastwork
      props.house({ x: q.x - 30 * m, z: q.z - 22 * m, yaw: flip + 0.3, width: 9, depth: 6 });
    });
    // a fisher's hut and boats drawn up on the lake shores
    mirrored(props, 1807_4, (m, flip) => {
      props.house({ x: -240 * m, z: 150 * m, yaw: flip + 0.6, width: 6, depth: 5 });
      props.logPile({ x: -232 * m, z: 140 * m, yaw: flip + 1.2, length: 6 });
    });

    // ---- farms, field walls and hay in the snow
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'farm'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 40 && tries < 6000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = 20 + rand() * (bounds.z - 80);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 60 * 60)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || nearPoint(x, z, 50) || copse(x, z) > 0.3 || ice(x, z) > 0 || ice(x + 25, z) > 0 || ice(x - 25, z) > 0 || town(x, z) > 0) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }
    // each army's bivouac behind its base
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xc8c4b0]] as const) {
      props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), { test: (x, z) => ice(x, z) > 0 || town(x, z) > 0.3 }];
    // firs and bare birches
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4200, broadleaf: 0.1, autumn: 1, forest: (x, z) => copse(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.6, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
