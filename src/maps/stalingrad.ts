// Stalingrad, winter: a city fought over street by street (1945 only; the big field, 1.0 × 1.12 km).
// Blocks of gutted apartment houses on snowed-over streets, Mamayev Kurgan in the middle (a long hill
// with the water tanks on top and a lower shoulder running west, overlooking everything), and the
// landmarks of the battle out in the districts. In the south (the Red Army's side, +z) the centre
// district: the grain elevator out west, Pavlov's House, the Square of the Fallen and the station on
// its railway in the east, on the old regular grid. In the north (the Wehrmacht's side) the factory
// district on its own, wider and more crooked street plan: Red October with the railway to Gumrak in the
// west, the Barrikady gun works, the Univermag by the hill and the tractor works out east. Rubble
// everywhere, few sight lines longer than a street. Not a mirror but fair: each side has one big works
// or elevator on each flank, a strongpoint by the hill and a square or works in the middle, each as far
// from its base as the other side's, and the hill's summit is the middle point.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1942);

// the city, inside |x| < CITY_X, |z| < CITY_Z: streets north–south at SX, east–west at SZ (|z|), each half its own plan
const CITY_X = 440;
const CITY_Z = 340;
const GRID = {
  1: { SX: [-400, -310, -220, -130, -45, 45, 130, 220, 310, 400], SZ: [50, 120, 190, 260, 330] },              // the centre district (z > 0)
  [-1]: { SX: [-425, -345, -255, -170, -95, -10, 80, 170, 265, 360, 430], SZ: [40, 100, 175, 240, 320] },     // the factory district (z < 0)
};
const STREET = 5;      // half-width of a street
// Mamayev Kurgan: the summit just east of the middle, a lower shoulder running west
const KURGAN = 105;    // the summit's radius
const kurganK = (x, z) => Math.hypot(x - 20, (z - 12) * 1.25) / KURGAN;
const shoulderK = (x, z) => Math.hypot((x + 105) / 75, z / 48);

/** 1 inside the city, fading to 0 at its edge. */
const city = (x, z) => smoothstep(CITY_X + 30, CITY_X - 10, Math.abs(x)) * smoothstep(CITY_Z + 30, CITY_Z - 10, Math.abs(z));
const onKurgan = (x, z) => kurganK(x, z) < 1 || shoulderK(x, z) < 1;

/** 1 on a street. */
function street(x, z) {
  if (onKurgan(x, z)) return 0;
  const G = GRID[z >= 0 ? 1 : -1];
  let k = 0;
  for (const sx of G.SX) k = Math.max(k, smoothstep(STREET + 1, STREET - 0.5, Math.abs(x - sx)));
  for (const sz of G.SZ) k = Math.max(k, smoothstep(STREET + 1, STREET - 0.5, Math.abs(Math.abs(z) - sz)));
  return k * city(x, z);
}

/** The railways: along the east of the centre district past the station; the Gumrak line slantwise past Red October. */
const gumrakZ = (x) => -60 - 0.1 * (x + 490);
const railDist = (x, z) => Math.min(x > 160 && x < 490 ? Math.abs(z - 84) : Infinity, x < -150 && x > -500 ? Math.abs(z - gumrakZ(x)) : Infinity);
const onRail = (x, z) => railDist(x, z) < 5;

function height(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  let h = fbm(noise, x * 0.005 + 8, z * 0.005 + 77, 5) * 4 + fbm(noise, x * 0.05 + 3, z * 0.05, 2) * 0.35;
  h += smoothstep(500, 620, ax) * 16 + smoothstep(560, 680, az) * 14; // the steppe rising beyond the edges
  h += (1.5 - h) * city(x, z) * 0.85;                                  // the city sits on level ground
  // Mamayev Kurgan: a long, smooth hill (east–west), the summit at the middle, the shoulder lower
  const k = kurganK(x, z), s = shoulderK(x, z);
  h += Math.max(20 * Math.max(0, 1 - k * k) ** 1.5, 9 * Math.max(0, 1 - s * s) ** 1.5);
  for (const bz of [BASE_Z, -BASE_Z]) h += (1.2 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return h;
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Volga landing', x: -30, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Grain elevator', x: -320, z: 120, owner: null, sector: 'west' },
  { id: 'C', name: 'Square of the Fallen', x: 20, z: 170, owner: null, sector: 'centre' },
  { id: 'D', name: 'Station Stalingrad-1', x: 285, z: 65, owner: null, sector: 'east' },
  { id: 'E', name: "Pavlov's House", x: -150, z: 40, owner: null, sector: 'west' },
  { id: 'F', name: 'Mamayev Kurgan', x: 20, z: 12, owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Univermag', x: 185, z: -20, owner: null, sector: 'east' },
  { id: 'H', name: 'Red October', x: -270, z: -110, owner: null, sector: 'west' },
  { id: 'I', name: 'Barrikady', x: 40, z: -140, owner: null, sector: 'centre' },
  { id: 'J', name: 'Tractor works', x: 305, z: -150, owner: null, sector: 'east' },
  { id: 'K', name: 'Gumrak', x: -30, z: -470, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'stalingrad',
  armies: { nato: ['sov'], pact: ['wh'] }, // (the Red Army against the Wehrmacht)
  sides: { nato: 'Soviet Union', pact: 'Germany' },
  name: 'Stalingrad',
  description: 'A ruined city in the snow: gutted blocks on every street, Mamayev Kurgan in the middle, the grain elevator, the tractor works and Pavlov\'s House. A fight from house to house.',
  epochs: ['1945'],
  region: 'east', // (the menu's Eastern Front: maps/index.js REGIONS)
  climate: 'winter',   // whitewash and snow smocks (render/paint.js CLIMATE)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1942,
  height,
  fields: createFields({ seed: 1942, cell: 70 }),

  theme: {
    // a grey winter day, snow on the ground and smoke over the city
    fogColor: 0xb6bac0,
    fogDensity: 0.0018,
    skyTop: 0x7a828c,
    skyHorizon: 0xc4c8cc,
    skyBottom: 0x80848a,
    sunColor: 0xe8ecf0,
    sunIntensity: 1.3,
    sunDisk: 0.05,
    clouds: 0.9,
    cloudLight: 0xcfd2d6,
    cloudDark: 0x7c8086,
    sunDir: [0.4, 0.45, 0.7],
    hemiSky: 0xd0d6de,
    hemiGround: 0x8a8c90,
    hemiIntensity: 1.4,
    rimColor: 0xc0c8d2,
    rimIntensity: 0.25,
    terrain: {
      grass: '#f0f2f2',
      grassAlt: '#e4e8ea',
      dryGrass: '#d6d4cc',
      dirt: '#9a948a',
      rock: '#c4c6c6',
      pasture: '#eceeee',
      ploughed: '#cfccc4',
      stubble: '#dcd8ce',
      meadow: '#f4f6f6',
      farmX: [520, 600],
      farmZ: [580, 660],
      roads: [-130, 0, 130],
      roadZ: 540,
      surface(x, z) {
        if (onRail(x, z)) return [0x4e4a44, 0.9];                                   // ballast
        const s = street(x, z);
        if (s > 0) return [0x8c8880, s * 0.8];                                       // trodden, sooty snow on the streets
        const c = city(x, z);
        return c > 0 && !onKurgan(x, z) ? [0xb4b0a8, c * 0.4] : null;                 // rubble-strewn yards
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-130, 0, 130] }, pact: { x: 0, z: -BASE_Z, entries: [-130, 0, 130] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0 })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const landmarks: any[] = [];   // footprints the blocks keep clear of: [x, z, half-w, half-d]
    const clear = (x, z, hw, hd) => landmarks.push([x, z, hw, hd]);
    const block = (x, z, sx, sy, sz, yaw, color) => { // a solid concrete mass (silo tower): seen from afar, cover at its foot
      props.box('stone', x, terrain.heightAt(x, z) + sy / 2, z, sx, sy, sz, yaw, color);
      cover.addBox({ x, z, yaw, length: sx, thickness: sz, height: sy });
    };

    // ---- the landmarks, each its own kind of building at its own place (a big mass on each flank of each district)
    // the centre district: the grain elevator (west), the station on its railway (east)
    props.hall({ x: -320, z: 104, yaw: Math.PI, width: 30, depth: 12, height: 8, color: 0x9c968a, name: 'grain elevator' });
    props.tanks({ x: -320, z: 126, yaw: 0, count: 4, radius: 3.2, height: 24, color: 0xb0aca2 });
    block(-348, 114, 10, 34, 10, 0, 0xa8a49a);
    clear(-322, 114, 36, 22);
    props.townHouse({ x: 285, z: 58, yaw: Math.PI, width: 22, depth: 11, storeys: 2, name: 'railway station', damaged: 1 });
    props.flatHouse({ x: 318, z: 60, yaw: Math.PI, width: 9, depth: 7, name: 'goods office' });
    clear(295, 60, 26, 10);
    props.rails({ x0: 160, z0: 84, x1: 510, z1: 84 });
    for (const [x, kind, c] of [[230, 'box', 0x5a3426], [242, 'open', 0x4a4038], [380, 'tank', 0x2a2a2a], [392, 'box', 0x4a3a2a]] as [number, string, number][]) {
      props.wagon({ x, z: 84, yaw: Math.PI / 2, kind, color: c });
    }
    // the factory district: Red October by the Gumrak line (west), the tractor works (east)
    props.hall({ x: -270, z: -124, yaw: 0, width: 34, depth: 16, height: 10, color: 0x6e4a3a, name: 'Red October works' });
    props.hall({ x: -236, z: -150, yaw: Math.PI / 2, width: 20, depth: 12, height: 7, color: 0x664438, name: 'rolling mill' });
    props.chimney({ x: -288, z: -100, height: 30 });
    props.chimney({ x: -252, z: -100, height: 30 });
    clear(-262, -130, 34, 30);
    props.rails({ x0: -500, z0: gumrakZ(-500), x1: -150, z1: gumrakZ(-150) });
    for (const [x, kind, c] of [[-200, 'box', 0x5a3426], [-212, 'open', 0x4a4038], [-420, 'tank', 0x2a2a2a]] as [number, string, number][]) {
      props.wagon({ x, z: gumrakZ(x), yaw: Math.atan2(1, -0.1), kind, color: c });
    }
    props.hall({ x: 305, z: -165, yaw: 0, width: 34, depth: 14, height: 9, color: 0x7a5a48, name: 'tractor works' });
    props.hall({ x: 336, z: -138, yaw: Math.PI / 2, width: 22, depth: 12, height: 7, color: 0x6e5444, name: 'assembly hall' });
    props.chimney({ x: 280, z: -140, height: 34 });
    clear(312, -152, 44, 26);
    // by the hill: Pavlov's House (the centre district) / the Univermag (the factory district)
    props.ruinBlock({ x: -150, z: 56, yaw: 0, width: 26, depth: 12, storeys: 4, ruin: 0.25, name: "Pavlov's House" });
    props.ruinBlock({ x: 190, z: -38, yaw: Math.PI, width: 30, depth: 14, storeys: 4, ruin: 0.3, name: 'Univermag' });
    clear(-150, 56, 16, 9);
    clear(190, -38, 18, 10);
    // the Square of the Fallen (a low wall round it, the fountain) / the Barrikady gun works
    props.lowWall({ x: 20, z: 192, yaw: 0, length: 34, height: 1 });
    props.lowWall({ x: 3, z: 170, yaw: Math.PI / 2, length: 30, height: 1 });
    props.column({ x: 20, z: 170, radius: 2.2, height: 1.2 });
    clear(20, 178, 22, 22);
    props.hall({ x: 40, z: -156, yaw: 0, width: 30, depth: 14, height: 8, color: 0x6a5446, name: 'Barrikady works' });
    props.hall({ x: 72, z: -176, yaw: Math.PI / 2, width: 16, depth: 10, height: 6, color: 0x5e4a3e, name: 'gun shop' });
    clear(50, -162, 30, 18);
    // Mamayev Kurgan: the water tanks on the summit, dugouts and wire on its slopes and on the shoulder
    props.tanks({ x: 22, z: 0, yaw: 0, count: 2, radius: 4, height: 6, color: 0x7a7c78 });
    for (const [x, z, t] of [[-22, 24, -1], [66, 30, -1], [50, -28, 1], [-8, -36, 1], [-110, 18, -1], [-96, -20, 1]]) props.sandbagRing({ x, z, radius: 5, toward: t });
    props.logBarricade({ x: 4, z: 52, yaw: 0.2, length: 8 });
    props.logBarricade({ x: 40, z: -54, yaw: -0.3, length: 8 });

    // ---- the blocks: rows of gutted apartment houses along every street, each district on its own grid
    const blocked = (x, z, hw, hd) => landmarks.some(([lx, lz, lw, ld]) => Math.abs(x - lx) < hw + lw + 2 && Math.abs(z - lz) < hd + ld + 2)
      || kurganK(x, z) < 1 + Math.max(hw, hd) / KURGAN || shoulderK(x, z) < 1 + Math.max(hw, hd) / 48 || railDist(x, z) < 10 + Math.min(hw, hd)
      || points.some((p) => Math.hypot(p.x - x, p.z - z) < 14 + Math.max(hw, hd));
    const r = mulberry32(1942);
    for (const sg of [1, -1]) {
      const { SX, SZ } = GRID[sg];
      for (let i = 0; i + 1 < SX.length; i++) {
        const x0 = SX[i] + STREET + 3;
        const x1 = SX[i + 1] - STREET - 3;
        for (let j = -1; j + 1 < SZ.length; j++) {
          const z0 = (j < 0 ? 8 : SZ[j]) + STREET + 3;  // (in |z|)
          const z1 = SZ[j + 1] - STREET - 3;
          // rows of blocks along both long sides, house by house with a lane now and then; the outskirts thinner
          const outskirts = Math.abs(x0 + x1) / 2 > 355 || z1 > 270;
          const rows = [];
          for (const zEdge of [z0, z1]) {
            let x = x0;
            while (x < x1 - 12) {
              const w = Math.min(x1 - x, 16 + r() * 12);
              const d = 10 + r() * 3;
              const cx = x + w / 2;
              const cz = (zEdge === z0 ? z0 + d / 2 : z1 - d / 2) * sg;
              x += w + 2 + r() * 3;
              if (w < 10 || r() < (outskirts ? 0.5 : 0.12) || blocked(cx, cz, w / 2, d / 2)) continue;
              rows.push({ cx, cz, w, d, yaw: (zEdge === z0) === (sg > 0) ? 0 : Math.PI });
            }
          }
          // and one across a short end of the bigger blocks, between the rows
          const across = z1 - z0 - 2 * 13 - 6;
          if (across >= 12 && !outskirts && r() < 0.6) {
            const left = r() < 0.5;
            const d = 10 + r() * 2;
            const cx = left ? x0 + d / 2 : x1 - d / 2;
            const cz = ((z0 + z1) / 2) * sg;
            if (!blocked(cx, cz, d / 2, across / 2)) rows.push({ cx, cz, w: across, d, yaw: left ? -Math.PI / 2 : Math.PI / 2 });
          }
          for (const h of rows) {
            props.rand = mulberry32(Math.floor(r() * 1e9));
            props.ruinBlock({ x: h.cx, z: h.cz, yaw: h.yaw, width: h.w, depth: h.d, storeys: 2 + Math.floor(r() * 4), ruin: 0.2 + r() * 0.45 });
          }
        }
      }
    }
    // rubble, wrecks and barricades in the streets and yards
    for (let i = 0; i < 220; i++) {
      const x = (r() * 2 - 1) * (CITY_X - 10);
      const z = (r() * 2 - 1) * (CITY_Z - 15);
      if (blocked(x, z, 2, 2)) continue;
      const onStreet = street(x, z) > 0.3;
      const kind = onStreet ? (r() < 0.35 ? 'wreck' : r() < 0.6 ? 'barricade' : 'rubble') : (r() < 0.6 ? 'rubble' : 'wall');
      const R = (props.rand = mulberry32(Math.floor(r() * 1e9)));
      if (kind === 'wreck') props.wreckCar({ x, z, yaw: R() * 6.28 });
      else if (kind === 'barricade') R() < 0.5 ? props.logBarricade({ x, z, yaw: R() * 3, length: 5 + R() * 3 }) : props.hedgehog({ x, z });
      else if (kind === 'wall') props.lowWall({ x, z, yaw: R() < 0.5 ? 0 : Math.PI / 2, length: 4 + R() * 6, height: 1.3, color: 0x6a645c });
      else for (let k = 0; k < 3; k++) props.rubble(x + (R() - 0.5) * 5, z + (R() - 0.5) * 5, 0.4 + R() * 0.6, true);
    }

    // ---- outside the city: the suburbs by each base, a little cover on the steppe, the command posts
    buildVillage(props, points[0], 9420, 1);
    buildVillage(props, points[points.length - 1], 9421, -1);
    const kinds = ['fieldwall', 'rocks', 'wrecks', 'fieldwall', 'farm'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 100 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = (rand() * 2 - 1) * (bounds.z - 30);
      if (city(x, z) > 0 || sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 30 * 30)) continue;
      if (Math.hypot(x, Math.abs(z) - BASE_Z) < 40 || points.some((p) => Math.hypot(x - p.x, z - p.z) < 40) || railDist(x, z) < 8) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    commandPost(props, this.bases.nato, -1, 0x6a6c5a);
    commandPost(props, this.bases.pact, 1, 0x6a6a5a);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 22 }, { x: 0, z: -BASE_Z, r: 22 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x, z) => street(x, z) > 0.05 || onRail(x, z) }];
    // bare, burnt trees in the city, a few more out on the steppe's edges
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 500,
      forest: (x, z) => (city(x, z) > 0.5 ? 0.02 : Math.max(0, (Math.abs(x) - 470) / 80)),
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: [...avoid, { test: (x, z) => city(x, z) > 0.3 }], density: 0.8, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
