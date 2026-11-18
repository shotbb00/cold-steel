// Hünfeld, autumn 1985: the little Hessian town astride the road from the Fulda Gap, and the
// Pact's first big objective (the big field, 1.0 × 1.12 km: the old town in the middle, the
// station and the brickworks / tannery out at its edge, farmland and the home villages beyond). A town fight: a grid of cobbled streets lined with two-storey
// houses (almost every one can be occupied), the market square with the town hall in the
// middle, the Stiftskirche and St. Ulrich either side of the old town, the railway station on the
// south-west, the goods yard on the north-east, the brickworks with its chimney on the east and
// the tannery on the west. Short sight lines, corners everywhere; tanks in the alleys are an
// RPG's dream. Open farmland and two villages beyond the edges of town. NATO comes in from the
// south (+z), the Pact from the north.
// Not a mirror: the Südstadt and the Nordstadt are laid out on their own street grids (the
// streets jog where they meet at the square), the town hall faces the department store across the
// square, and each quarter's landmarks are their own buildings. Fair by value: each side has a
// church, a railway site (the station and its goods shed / the goods yard with its sheds) and a
// works (brickworks / tannery) within the same few metres of its base, the same number of street
// rows and the same street count in its half of town.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1987);

// the town: inside |x| < TOWN_X, |z| < TOWN_Z; each half its own grid of streets (north–south at
// x, east–west at z), the square in the middle
const TOWN_X = 180;
const TOWN_Z = 150;
const SOUTH = { x: [-124, -62, 0, 62, 124], z: [45, 95, 140] };   // the Südstadt
const NORTH = { x: [-138, -76, -16, 50, 116], z: [-48, -92, -134] }; // the Nordstadt
const grid = (z) => (z >= 0 ? SOUTH : NORTH);
const STREET = 4;     // half-width of a street
const SQUARE = 26;    // half-size of the market square
const RAIL_S = 122;   // the main line along the south-west edge of town
const RAIL_N = -112;  // the goods line along the north-east

/** 1 inside the town, fading to 0 at its edge. */
const town = (x, z) => smoothstep(TOWN_X + 20, TOWN_X - 10, Math.abs(x)) * smoothstep(TOWN_Z + 20, TOWN_Z - 10, Math.abs(z));

/** 1 on a street or the square. */
function street(x, z) {
  if (Math.abs(x) < SQUARE && Math.abs(z) < SQUARE) return 1;
  const g = grid(z);
  let k = 0;
  for (const sx of g.x) k = Math.max(k, smoothstep(STREET + 1, STREET - 0.5, Math.abs(x - sx)));
  for (const sz of g.z) k = Math.max(k, smoothstep(STREET + 1, STREET - 0.5, Math.abs(z - sz)));
  return k * town(x, z);
}

/** The dirt roads out of town: each half's three middle streets run on to its home village. */
function track(x, z) {
  const g = grid(z);
  let d = 1e9;
  for (const sx of [g.x[0], g.x[2], g.x[4]]) d = Math.min(d, Math.abs(x - sx * smoothstep(BASE_Z, TOWN_Z, Math.abs(z)) + Math.sin(z * 0.04 + sx) * 3));
  return smoothstep(5, 2.5, d) * (1 - town(x, z)) * smoothstep(540, 512, Math.abs(z));
}

/** The railways: the main line west of the square on the south side, the goods line on the north-east. */
const onRail = (x, z) => (x < -40 && x > -490 && Math.abs(z - RAIL_S) < 5) || (x > 40 && x < 490 && Math.abs(z - RAIL_N) < 5);

function height(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  let h = fbm(noise, x * 0.006, z * 0.006, 5) * 7 + fbm(noise, x * 0.04 + 9, z * 0.04, 3) * 0.6;
  h += smoothstep(500, 610, ax) * (14 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 22); // wooded hills at the edges
  h += smoothstep(560, 670, az) * 18;
  const t = town(x, z);
  h += (2 + fbm(noise, x * 0.004, z * 0.004, 2) * 1.2 - h) * t; // the town sits on level ground
  for (const bz of [BASE_Z, -BASE_Z]) {
    const k = smoothstep(28, 15, Math.hypot(x, z - bz));
    h += (1.2 - h) * k;
  }
  return h;
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];
const pactName = { '1st Platoon': '1-ya Rota' };

// each where its quarter puts it, at matching distances from the two bases (tools/map_fairness.py)
const points: ControlPointDef[] = [
  { id: 'A', name: 'Mackenzell', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Bahnhof', x: -312, z: 112, owner: null, sector: 'west' },
  { id: 'C', name: 'Südstadt', x: 0, z: 140, owner: null, sector: 'centre' },
  { id: 'D', name: 'Ziegelei', x: 288, z: 56, owner: null, sector: 'east' },
  { id: 'E', name: 'Stiftskirche', x: -110, z: 12, owner: null, sector: 'west' },
  { id: 'F', name: 'Marktplatz', x: 0, z: 0, owner: null, sector: 'centre', radius: 20 },
  { id: 'G', name: 'St. Ulrich', x: 102, z: -42, owner: null, sector: 'east' },
  { id: 'H', name: 'Gerberei', x: -262, z: -98, owner: null, sector: 'west' },
  { id: 'I', name: 'Nordstadt', x: -16, z: -128, owner: null, sector: 'centre' },
  { id: 'J', name: 'Güterbahnhof', x: 352, z: -72, owner: null, sector: 'east' },
  { id: 'K', name: 'Molzbach', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'huenfeld',
  armies: { 1945: { nato: ['us'], pact: ['wh', 'fj'] } }, // (spring 1945 in Hesse and Thuringia: the US Army against the Wehrmacht and the last Fallschirmjäger — maps/index.js armiesOn)
  name: 'Hünfeld',
  description: 'A town fight: cobbled streets, houses you can occupy on every corner, the market square, two churches, the station and the brickworks. Short sight lines; tanks beware.',
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1987,
  height,
  fields: createFields({ seed: 1987, cell: 60 }),

  theme: {
    // a grey, still October afternoon
    fogColor: 0xa4a8a6,
    fogDensity: 0.002,
    skyTop: 0x6e7680,
    skyHorizon: 0xbcbeb8,
    skyBottom: 0x70726c,
    sunColor: 0xeae2cc,
    sunIntensity: 1.6,
    sunDisk: 0.1,
    clouds: 0.8,
    cloudLight: 0xcacbc6,
    cloudDark: 0x7a7e82,
    sunDir: [0.5, 0.55, 0.65],
    hemiSky: 0xc4cad0,
    hemiGround: 0x4a463a,
    hemiIntensity: 1.3,
    rimColor: 0xb8c0c8,
    rimIntensity: 0.25,
    terrain: {
      grass: '#55613a',
      grassAlt: '#4b5734',
      dryGrass: '#84764e',
      dirt: '#54463a',
      rock: '#6a6862',
      pasture: '#56633a',
      ploughed: '#4b3c2e',
      stubble: '#8a7a4e',
      meadow: '#66703e',
      farmX: [520, 600],
      farmZ: [580, 660],
      roads: [],             // (the roads are the map's own: track() below)
      surface(x, z) {
        if (onRail(x, z)) return [0x4e4a44, 0.9];                             // ballast
        const s = street(x, z);
        if (s > 0) return [Math.abs(x) < SQUARE && Math.abs(z) < SQUARE ? 0x77726a : 0x5f5c56, s * 0.95]; // the square, cobbles
        const t = town(x, z);
        if (t > 0) return [0x4a4e36, t * 0.45];                               // trodden yards and gardens
        const r = track(x, z);
        return r > 0 ? [0x54463a, r * 0.6] : null;                            // dirt roads
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-124, 0, 124] }, pact: { x: 0, z: -BASE_Z, entries: [-138, -16, 116] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: pactName[s.name] ?? s.name })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const landmarks: any[] = [];   // footprints the street-filling houses keep clear of: [x, z, half-w, half-d]
    const clear = (x, z, hw, hd) => landmarks.push([x, z, hw, hd]);
    props.rand = mulberry32(1201);

    // ---- the square: the town hall on its south side, the department store facing it on the north
    props.townHouse({ x: 0, z: SQUARE + 9, yaw: 0, width: 22, depth: 11, storeys: 3, name: 'town hall', damaged: 0 });
    props.townHouse({ x: -6, z: -SQUARE - 8, yaw: Math.PI, width: 26, depth: 10, storeys: 3, name: 'department store', damaged: 0.1 });
    clear(0, SQUARE + 9, 12, 7);
    clear(-6, -SQUARE - 8, 14, 6);
    for (const [x, z, yaw] of [[-6, -6, 0.4], [8, 9, 2.1], [-9, 12, 1.3], [12, -14, 2.8], [-15, 3, 0.9]]) props.wreckCar({ x, z, yaw });
    props.jersey({ x: 14, z: -12, yaw: 0.4, length: 6 });
    props.jersey({ x: -16, z: 15, yaw: 2.6, length: 6 });

    // ---- the Südstadt (NATO's half): the Stiftskirche, the station, the brickworks
    props.church({ x: -93, z: 6, yaw: 0 });
    props.lowWall({ x: -93, z: 38, yaw: 0, length: 24 });                     // churchyard wall
    clear(-93, 6, 6, 18);
    // station: the building, the main line, a siding by the platform, wagons, the goods shed
    props.townHouse({ x: -312, z: RAIL_S - 14, yaw: 0, width: 20, depth: 10, storeys: 2, name: 'railway station', damaged: 0 });
    props.rails({ x0: -510, z0: RAIL_S, x1: -42, z1: RAIL_S });
    props.rails({ x0: -390, z0: RAIL_S + 7, x1: -250, z1: RAIL_S + 7 });
    for (const [x, kind, c] of [[-362, 'box', 0x5a3426], [-350, 'box', 0x4a3a2a], [-282, 'tank', 0x2a2a2a], [-270, 'open', 0x4a4038], [-258, 'box', 0x5a3426]] as [number, string, number][]) {
      props.wagon({ x, z: RAIL_S + (kind === 'tank' ? 0 : 7), yaw: Math.PI / 2, kind, color: c });
    }
    props.hall({ x: -357, z: RAIL_S - 16, yaw: 0, width: 22, depth: 12, height: 6, color: 0x6e5444, name: 'goods shed' });
    clear(-312, RAIL_S - 14, 11, 6);
    clear(-357, RAIL_S - 16, 12, 7);
    // the brickworks: the drying hall, the kiln house, the chimney, the yard wall and stacked bricks
    props.hall({ x: 288, z: 70, yaw: 0, width: 30, depth: 16, height: 7.5, color: 0x7a4a38, name: 'brickworks' });
    props.hall({ x: 322, z: 40, yaw: Math.PI / 2, width: 18, depth: 11, height: 6, color: 0x6e4a3a, name: 'kiln house' });
    props.chimney({ x: 308, z: 54, height: 32 });
    props.lowWall({ x: 288, z: 38, yaw: 0, length: 30, height: 1.6 });
    for (let k = 0; k < 3; k++) props.crates({ x: 264 + k * 5, z: 46, yaw: k });
    clear(288, 70, 16, 9);
    clear(322, 40, 7, 10);

    // ---- the Nordstadt (the Pact's half): St. Ulrich, the goods yard, the tannery
    props.church({ x: 84, z: -66, yaw: -Math.PI / 2 });                      // the nave east–west, the tower to the west
    props.lowWall({ x: 84, z: -80, yaw: 0, length: 24 });                       // churchyard wall
    clear(84, -66, 23, 6);
    // the goods yard: the goods line and two sidings full of wagons, the big shed, the freight office, the signal box
    props.rails({ x0: 42, z0: RAIL_N, x1: 510, z1: RAIL_N });
    props.rails({ x0: 260, z0: RAIL_N + 7, x1: 440, z1: RAIL_N + 7 });
    props.rails({ x0: 300, z0: RAIL_N + 14, x1: 410, z1: RAIL_N + 14 });
    for (const [x, kind, c, dz] of [[276, 'open', 0x4a4038, 7], [289, 'open', 0x4a4038, 7], [302, 'box', 0x5a3426, 7], [398, 'tank', 0x2a2a2a, 7], [411, 'tank', 0x2a2a2a, 7],
      [318, 'box', 0x4a3a2a, 14], [331, 'box', 0x5a3426, 14], [385, 'open', 0x4a4038, 14], [440, 'box', 0x5a3426, 0]] as [number, string, number, number][]) {
      props.wagon({ x, z: RAIL_N + dz, yaw: Math.PI / 2, kind, color: c });
    }
    props.hall({ x: 372, z: -78, yaw: Math.PI, width: 28, depth: 12, height: 7, color: 0x6a5242, name: 'goods shed' });
    props.townHouse({ x: 322, z: -78, yaw: Math.PI, width: 12, depth: 8, storeys: 2, name: 'freight office' });
    props.townHouse({ x: 262, z: RAIL_N - 12, yaw: 0, width: 7, depth: 6, storeys: 2, name: 'signal box', damaged: 0 });
    props.lowWall({ x: 352, z: -92, yaw: 0, length: 16, height: 1.3 });         // the loading ramp's edge
    clear(372, -78, 15, 7);
    clear(322, -78, 7, 5);
    // the tannery: the tan house, its long drying sheds, a lower chimney, the yard wall round the pits
    props.hall({ x: -262, z: -114, yaw: Math.PI, width: 24, depth: 12, height: 6, color: 0x6a5040, name: 'tannery' });
    props.hall({ x: -230, z: -86, yaw: Math.PI / 2, width: 18, depth: 8, height: 5, color: 0x5e4a3a, name: 'drying shed' });
    props.townHouse({ x: -294, z: -84, yaw: Math.PI / 2, width: 11, depth: 8, storeys: 2, name: "tanner's house" });
    props.chimney({ x: -246, z: -126, height: 22 });
    props.lowWall({ x: -262, z: -70, yaw: 0, length: 28, height: 1.6 });
    for (const [x, z] of [[-270, -94], [-256, -94]]) props.lowWall({ x, z, yaw: 0, length: 6, height: 0.8 }); // the pits' kerbs
    for (let k = 0; k < 3; k++) props.crates({ x: -284 + k * 4, z: -104, yaw: k * 0.7 });

    // ---- the houses: rows facing the east–west streets, block by block, each half on its own grid
    const blocked = (x, z, hw, hd) => landmarks.some(([lx, lz, lw, ld]) => Math.abs(x - lx) < hw + lw + 1.5 && Math.abs(z - lz) < hd + ld + 1.5)
      || (Math.abs(x) < SQUARE + 6 && Math.abs(z) < SQUARE + 6) || onRail(x, z)
      || (Math.abs(z - RAIL_S) < 12 && x < -40) || (Math.abs(z - RAIL_N) < 12 && x > 40);
    const r = mulberry32(4242);
    for (const [g, s] of [[SOUTH, 1], [NORTH, -1]] as const) {
      const [z1, z2, z3] = g.z;
      const rows: any[] = [];
      for (let i = 0; i + 1 < g.x.length; i++) {
        const x0 = g.x[i] + STREET + 1.5;
        const x1 = g.x[i + 1] - STREET - 1.5;
        // both sides of the blocks between the east–west streets, and the inner row toward the square
        for (const [zEdge, dir] of [[z1, s], [z2, -s], [z2, s], [z3, -s], [z1, -s]]) rows.push({ x0, x1, z: zEdge + dir * (STREET + 1.5), dir });
      }
      for (const row of rows) {
        let x = row.x0;
        while (x < row.x1 - 6) {
          const w = 7 + r() * 3.5;
          const d = 8 + r() * 2;
          const cx = x + w / 2;
          const cz = row.z + row.dir * d / 2;
          x += w + 1 + r() * 3;
          if (cx + w / 2 > row.x1 || r() < 0.3) continue;             // a yard, a gap, a lane
          if (blocked(cx, cz, w / 2, d / 2)) continue;
          props.rand = mulberry32(Math.floor(r() * 1e9));
          // the door faces the street: front (+z local) toward it
          props.townHouse({ x: cx, z: cz, yaw: row.dir > 0 ? Math.PI : 0, width: w, depth: d, storeys: r() < 0.25 ? 3 : 2 });
        }
      }
      // garden walls and rubble in the blocks' backyards
      for (let i = 0; i < 70; i++) {
        const x = (r() * 2 - 1) * (TOWN_X - 10);
        const z = s * (10 + r() * (TOWN_Z - 15));
        if (street(x, z) > 0.1 || blocked(x, z, 2, 2)) continue;
        const kind = r();
        if (kind < 0.5) props.lowWall({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, length: 6 + r() * 6, height: 1.2 });
        else if (kind < 0.75) props.wreckCar({ x, z, yaw: r() * 6 });
        else for (let k = 0; k < 4; k++) props.rubble(x + (r() - 0.5) * 4, z + (r() - 0.5) * 4, 0.4 + r() * 0.4);
      }
      // barricades across some street ends at the edge of town
      for (const sx of g.x) if (r() < 0.8) props.jersey({ x: sx + (r() - 0.5) * 2, z: s * (TOWN_Z + 6), yaw: (r() - 0.5) * 0.4, length: 6 });
    }

    // ---- outside town: the two home villages, farm cover (as much on each half), the command posts
    buildVillage(props, points[0], 9500, 1);
    buildVillage(props, points[10], 9611, 1);
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'hay', 'wrecks'];
    const sites: any[] = [];
    for (const s of [1, -1]) {
      let n = 0;
      for (let tries = 0; n < 100 && tries < 8000; tries++) {
        const x = (rand() * 2 - 1) * (bounds.x - 20);
        const z = s * (30 + rand() * (bounds.z - 40));
        if (town(x, z) > 0 || sites.some((q) => (q.x - x) ** 2 + (q.z - z) ** 2 < 28 * 28) || onRail(x, z) || Math.abs(z - (s > 0 ? RAIL_S : RAIL_N)) < 14 || track(x, z) > 0) continue;
        if (Math.hypot(x, z - s * BASE_Z) < 40 || points.some((p) => Math.hypot(x - p.x, z - p.z) < 40)) continue;
        sites.push({ x, z, kind: kinds[n++ % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
      }
    }
    for (const q of sites) buildSite(props, q, q.x, q.z, q.yaw);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 22 }, { x: 0, z: -BASE_Z, r: 22 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 10 })),
      { test: (x, z) => street(x, z) > 0.05 || onRail(x, z) || track(x, z) > 0.2 }];
    // a few garden trees in town, woods on the edge hills
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 1500,
      forest: (x, z) => (town(x, z) > 0.5 ? 0.05 : Math.max(0, (Math.abs(x) - 460) / 60)),
    });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x, z) => town(x, z) > 0.2 }], count: 9000, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.6, fields: this.fields });

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
