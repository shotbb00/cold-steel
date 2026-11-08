// Stalingrad, winter: a city fought over street by street (1945 only; the big field, 1.0 × 1.12 km).
// Blocks of gutted apartment houses on a grid of snowed-over streets, Mamayev Kurgan in the middle
// (a long hill with the water tanks on top, overlooking everything), and the landmarks of the battle
// out in the districts: the grain elevator and the Red October works on the west, the tractor works
// and the station on the east, Pavlov's House and the Univermag either side of the hill, the
// Square of the Fallen and the Barrikady gun works north and south of it. Rubble everywhere, few
// sight lines longer than a street. The Allies (the Red Army's side) come in from the south (+z),
// the Wehrmacht from the north; point-mirrored like the other maps, so neither side gets the better
// districts — only the names differ.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage, commandPost, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const EDGE_X = 300;   // the districts' landmarks, out toward the flanks
const noise = createNoise2D(1942);

// the city: streets north–south at STREETS_X, east–west at STREETS_Z (|z| > 0 half; mirrored), inside |x| < CITY_X, |z| < CITY_Z
const CITY_X = 440;
const CITY_Z = 340;
const STREETS_X = [-400, -310, -220, -130, -45, 45, 130, 220, 310, 400];
const STREETS_Z = [50, 120, 190, 260, 330];
const STREET = 5;      // half-width of a street
const KURGAN = 105;    // the hill's radius: no houses on it

/** 1 inside the city, fading to 0 at its edge. */
const city = (x, z) => smoothstep(CITY_X + 30, CITY_X - 10, Math.abs(x)) * smoothstep(CITY_Z + 30, CITY_Z - 10, Math.abs(z));
const onKurgan = (x, z) => Math.hypot(x, z * 1.25) < KURGAN;

/** 1 on a street. */
function street(x, z) {
  if (onKurgan(x, z)) return 0;
  let k = 0;
  for (const sx of STREETS_X) k = Math.max(k, smoothstep(STREET + 1, STREET - 0.5, Math.abs(x - sx)));
  for (const sz of STREETS_Z) k = Math.max(k, smoothstep(STREET + 1, STREET - 0.5, Math.abs(Math.abs(z) - sz)));
  return k * city(x, z);
}

/** The railway: along the east of the city on the south side, mirrored on the north-west. */
const onRail = (x, z) => (x > 160 && x < 490 && Math.abs(z - 84) < 5) || (x < -160 && x > -490 && Math.abs(z + 84) < 5);

function height(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  let h = fbm(noise, x * 0.005, z * 0.005, 5) * 4 + fbm(noise, x * 0.05 + 3, z * 0.05, 2) * 0.35;
  h += smoothstep(500, 620, ax) * 16 + smoothstep(560, 680, az) * 14; // the steppe rising beyond the edges
  h += (1.5 - h) * city(x, z) * 0.85;                                  // the city sits on level ground
  // Mamayev Kurgan: a long, smooth hill (east–west), the summit at the middle
  const k = Math.hypot(x / 1.0, z * 1.25) / KURGAN;
  h += 20 * Math.max(0, 1 - k * k) ** 1.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (1.2 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return h;
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Volga landing', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Grain elevator', x: -EDGE_X, z: 104, owner: null, sector: 'west' },
  { id: 'C', name: 'Square of the Fallen', x: 0, z: 150, owner: null, sector: 'centre' },
  { id: 'D', name: 'Station Stalingrad-1', x: EDGE_X, z: 70, owner: null, sector: 'east' },
  { id: 'E', name: "Pavlov's House", x: -165, z: 30, owner: null, sector: 'west' },
  { id: 'F', name: 'Mamayev Kurgan', x: 0, z: 0, owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Univermag', x: 165, z: -30, owner: null, sector: 'east' },
  { id: 'H', name: 'Red October', x: -EDGE_X, z: -70, owner: null, sector: 'west' },
  { id: 'I', name: 'Barrikady', x: 0, z: -150, owner: null, sector: 'centre' },
  { id: 'J', name: 'Tractor works', x: EDGE_X, z: -104, owner: null, sector: 'east' },
  { id: 'K', name: 'Gumrak', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'stalingrad',
  name: 'Stalingrad',
  description: 'A ruined city in the snow: gutted blocks on every street, Mamayev Kurgan in the middle, the grain elevator, the tractor works and Pavlov\'s House. A fight from house to house.',
  epochs: ['1945'],
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
    const clear = (x, z, hw, hd) => landmarks.push([x, z, hw, hd], [-x, -z, hw, hd]);
    const block = (x, z, sx, sy, sz, yaw, color) => { // a solid concrete mass (silo tower): seen from afar, cover at its foot
      props.box('stone', x, terrain.heightAt(x, z) + sy / 2, z, sx, sy, sz, yaw, color);
      cover.addBox({ x, z, yaw, length: sx, thickness: sz, height: sy });
    };

    // ---- the landmarks: the same footprints both sides (fair), each its own kind of building
    // west: the grain elevator (south-west) / Red October (north-west, its twin's place on the east is the tractor works)
    props.hall({ x: -EDGE_X, z: 90, yaw: Math.PI, width: 30, depth: 12, height: 8, color: 0x9c968a, name: 'grain elevator' });
    props.tanks({ x: -EDGE_X, z: 112, yaw: 0, count: 4, radius: 3.2, height: 24, color: 0xb0aca2 });
    block(-EDGE_X - 28, 100, 10, 34, 10, 0, 0xa8a49a);
    props.hall({ x: EDGE_X, z: -90, yaw: 0, width: 34, depth: 14, height: 9, color: 0x7a5a48, name: 'tractor works' });
    props.hall({ x: EDGE_X + 28, z: -116, yaw: Math.PI / 2, width: 22, depth: 12, height: 7, color: 0x6e5444, name: 'assembly hall' });
    props.chimney({ x: EDGE_X - 24, z: -116, height: 34 });
    props.hall({ x: -EDGE_X, z: -84, yaw: 0, width: 34, depth: 16, height: 10, color: 0x6e4a3a, name: 'Red October works' });
    props.chimney({ x: -EDGE_X - 18, z: -60, height: 30 });
    props.chimney({ x: -EDGE_X + 18, z: -60, height: 30 });
    props.townHouse({ x: EDGE_X, z: 58, yaw: Math.PI, width: 22, depth: 11, storeys: 2, name: 'railway station', damaged: 1 });
    props.rails({ x0: 160, z0: 84, x1: 510, z1: 84 });
    props.rails({ x0: -510, z0: -84, x1: -160, z1: -84 });
    for (const [x, kind, c] of [[230, 'box', 0x5a3426], [242, 'open', 0x4a4038], [380, 'tank', 0x2a2a2a], [392, 'box', 0x4a3a2a]] as [number, string, number][]) {
      props.wagon({ x, z: 84, yaw: Math.PI / 2, kind, color: c });
      props.wagon({ x: -x, z: -84, yaw: Math.PI / 2, kind, color: c });
    }
    // either side of the hill: Pavlov's House / the Univermag
    props.ruinBlock({ x: -165, z: 46, yaw: 0, width: 26, depth: 12, storeys: 4, ruin: 0.25, name: "Pavlov's House" });
    props.ruinBlock({ x: 165, z: -46, yaw: Math.PI, width: 26, depth: 12, storeys: 4, ruin: 0.25, name: 'Univermag' });
    // the Square of the Fallen (a low wall round it, the fountain) / the Barrikady gun works
    props.lowWall({ x: 0, z: 172, yaw: 0, length: 34, height: 1 });
    props.lowWall({ x: -17, z: 150, yaw: Math.PI / 2, length: 30, height: 1 });
    props.column({ x: 0, z: 150, radius: 2.2, height: 1.2 });
    props.hall({ x: 0, z: -164, yaw: 0, width: 30, depth: 14, height: 8, color: 0x6a5446, name: 'Barrikady works' });
    clear(-EDGE_X, 100, 36, 22);
    clear(EDGE_X, -100, 44, 26);   // (its twin: Red October, above)
    clear(EDGE_X, 62, 14, 10);
    clear(-165, 46, 16, 9);
    clear(0, 158, 22, 22);
    clear(0, -164, 18, 10);
    // Mamayev Kurgan: the water tanks on the summit, dugouts and wire on its slopes
    props.tanks({ x: 0, z: -10, yaw: 0, count: 2, radius: 4, height: 6, color: 0x7a7c78 });
    mirrored(props, 77, (m) => {
      props.sandbagRing({ x: -40 * m, z: 22 * m, radius: 5, toward: m });
      props.sandbagRing({ x: 48 * m, z: 30 * m, radius: 5, toward: m });
      props.logBarricade({ x: -18 * m, z: 52 * m, yaw: 0.2, length: 8 });
    });

    // ---- the blocks: rows of gutted apartment houses along every street (our half, mirrored)
    const blocked = (x, z, hw, hd) => landmarks.some(([lx, lz, lw, ld]) => Math.abs(x - lx) < hw + lw + 2 && Math.abs(z - lz) < hd + ld + 2)
      || Math.hypot(x, z * 1.25) < KURGAN + Math.max(hw, hd) || onRail(x, z) || Math.abs(Math.abs(z) - 84) < 10 && Math.abs(x) > 150
      || points.some((p) => Math.hypot(p.x - x, p.z - z) < 14 + Math.max(hw, hd));
    const r = mulberry32(1942);
    for (let i = 0; i + 1 < STREETS_X.length; i++) {
      const x0 = STREETS_X[i] + STREET + 3;
      const x1 = STREETS_X[i + 1] - STREET - 3;
      for (let j = -1; j + 1 < STREETS_Z.length; j++) {
        const z0 = (j < 0 ? 8 : STREETS_Z[j]) + STREET + 3;
        const z1 = STREETS_Z[j + 1] - STREET - 3;
        // rows of blocks along both long sides, house by house with a lane now and then; the outskirts thinner
        const outskirts = Math.abs(x0 + x1) / 2 > 355 || z1 > 270;
        const rows = [];
        for (const zEdge of [z0, z1]) {
          let x = x0;
          while (x < x1 - 12) {
            const w = Math.min(x1 - x, 16 + r() * 12);
            const d = 10 + r() * 3;
            const cx = x + w / 2;
            const cz = zEdge === z0 ? z0 + d / 2 : z1 - d / 2;
            x += w + 2 + r() * 3;
            if (w < 10 || r() < (outskirts ? 0.5 : 0.12) || blocked(cx, cz, w / 2, d / 2)) continue;
            rows.push({ cx, cz, w, d, yaw: zEdge === z0 ? 0 : Math.PI });
          }
        }
        // and one across a short end of the bigger blocks, between the rows
        const across = z1 - z0 - 2 * 13 - 6;
        if (across >= 12 && !outskirts && r() < 0.6) {
          const left = r() < 0.5;
          const d = 10 + r() * 2;
          const cx = left ? x0 + d / 2 : x1 - d / 2;
          const cz = (z0 + z1) / 2;
          if (!blocked(cx, cz, d / 2, across / 2)) rows.push({ cx, cz, w: across, d, yaw: left ? -Math.PI / 2 : Math.PI / 2 });
        }
        for (const h of rows) {
          const seed = Math.floor(r() * 1e9);
          const storeys = 2 + Math.floor(r() * 4);
          const ruin = 0.2 + r() * 0.45;
          mirrored(props, seed, (m, flip) => props.ruinBlock({ x: h.cx * m, z: h.cz * m, yaw: h.yaw + flip, width: h.w, depth: h.d, storeys, ruin }));
        }
      }
    }
    // rubble, wrecks and barricades in the streets and yards, mirrored
    for (let i = 0; i < 110; i++) {
      const x = (r() * 2 - 1) * (CITY_X - 10);
      const z = 10 + r() * (CITY_Z - 15);
      if (blocked(x, z, 2, 2)) continue;
      const seed = Math.floor(r() * 1e9);
      const onStreet = street(x, z) > 0.3;
      const kind = onStreet ? (r() < 0.35 ? 'wreck' : r() < 0.6 ? 'barricade' : 'rubble') : (r() < 0.6 ? 'rubble' : 'wall');
      mirrored(props, seed, (m, flip) => {
        if (kind === 'wreck') props.wreckCar({ x: x * m, z: z * m, yaw: props.rand() * 3 + flip });
        else if (kind === 'barricade') props.rand() < 0.5 ? props.logBarricade({ x: x * m, z: z * m, yaw: props.rand() * 3, length: 5 + props.rand() * 3 }) : props.hedgehog({ x: x * m, z: z * m });
        else if (kind === 'wall') props.lowWall({ x: x * m, z: z * m, yaw: (props.rand() < 0.5 ? 0 : Math.PI / 2) + flip, length: 4 + props.rand() * 6, height: 1.3, color: 0x6a645c });
        else for (let k = 0; k < 3; k++) props.rubble(x * m + (props.rand() - 0.5) * 5, z * m + (props.rand() - 0.5) * 5, 0.4 + props.rand() * 0.6, true);
      });
    }

    // ---- outside the city: the suburbs by each base, a little cover on the steppe, the command posts
    buildVillage(props, points[0], 9420, 1);
    buildVillage(props, { x: -points[0].x, z: -points[0].z }, 9420, -1);
    const kinds = ['fieldwall', 'rocks', 'wrecks', 'fieldwall', 'farm'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 50 && tries < 6000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = 30 + rand() * (bounds.z - 40);
      if (city(x, z) > 0 || sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 30 * 30)) continue;
      if (Math.hypot(x, z - BASE_Z) < 40 || points.some((p) => Math.hypot(x - p.x, z - p.z) < 40)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }
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
