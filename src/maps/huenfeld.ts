// Hünfeld, autumn 1985: the little Hessian town astride the road from the Fulda Gap, and the
// Pact's first big objective. A town fight: a grid of cobbled streets lined with two-storey
// houses (almost every one can be occupied), the market square with the town hall in the
// middle, a church on each side of the old town, the railway station and goods yard on the
// west, the brickworks and the tannery with their chimneys on the east. Short sight lines,
// corners everywhere; tanks in the alleys are an RPG's dream. Open farmland and two villages
// beyond the edges of town. NATO comes in from the south (+z), the Pact from the north.
// Point-mirrored like the other maps (the streets, blocks and landmarks have a twin across
// the square), so neither side gets the better quarter.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage, commandPost, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 280;
const noise = createNoise2D(1987);

// the town: streets north–south at STREETS_X, east–west at STREETS_Z, inside |x| < TOWN_X, |z| < TOWN_Z
const TOWN_X = 180;
const TOWN_Z = 150;
const STREETS_X = [-124, -62, 0, 62, 124];
const STREETS_Z = [-140, -95, -45, 45, 95, 140];
const STREET = 4;     // half-width of a street
const SQUARE = 26;    // half-size of the market square
const RAIL_Z = 122;   // the railway along the west edge of town (and its twin on the east)

/** 1 inside the town, fading to 0 at its edge. */
const town = (x, z) => smoothstep(TOWN_X + 20, TOWN_X - 10, Math.abs(x)) * smoothstep(TOWN_Z + 20, TOWN_Z - 10, Math.abs(z));

/** 1 on a street or the square. */
function street(x, z) {
  if (Math.abs(x) < SQUARE && Math.abs(z) < SQUARE) return 1;
  let k = 0;
  for (const sx of STREETS_X) k = Math.max(k, smoothstep(STREET + 1, STREET - 0.5, Math.abs(x - sx)));
  for (const sz of STREETS_Z) k = Math.max(k, smoothstep(STREET + 1, STREET - 0.5, Math.abs(z - sz)));
  return k * town(x, z);
}

/** The railway: west of the square on the south side, mirrored on the north-east. */
const onRail = (x, z) => (x < -40 && Math.abs(z - RAIL_Z) < 5) || (x > 40 && Math.abs(z + RAIL_Z) < 5);

function height(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  let h = fbm(noise, x * 0.006, z * 0.006, 5) * 7 + fbm(noise, x * 0.04 + 9, z * 0.04, 3) * 0.6;
  h += smoothstep(300, 410, ax) * (14 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 22); // wooded hills at the edges
  h += smoothstep(330, 440, az) * 18;
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

const points: ControlPointDef[] = [
  { id: 'A', name: 'Mackenzell', x: 0, z: 236, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Bahnhof', x: -150, z: 104, owner: null, sector: 'west' },
  { id: 'C', name: 'Südstadt', x: 0, z: 100, owner: null, sector: 'centre' },
  { id: 'D', name: 'Ziegelei', x: 152, z: 70, owner: null, sector: 'east' },
  { id: 'E', name: 'Stiftskirche', x: -93, z: 20, owner: null, sector: 'west' },
  { id: 'F', name: 'Marktplatz', x: 0, z: 0, owner: null, sector: 'centre', radius: 20 },
  { id: 'G', name: 'St. Ulrich', x: 93, z: -20, owner: null, sector: 'east' },
  { id: 'H', name: 'Gerberei', x: -152, z: -70, owner: null, sector: 'west' },
  { id: 'I', name: 'Nordstadt', x: 0, z: -100, owner: null, sector: 'centre' },
  { id: 'J', name: 'Güterbahnhof', x: 150, z: -104, owner: null, sector: 'east' },
  { id: 'K', name: 'Molzbach', x: 0, z: -236, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'huenfeld',
  name: 'Hünfeld',
  description: 'A town fight: cobbled streets, houses you can occupy on every corner, the market square, two churches, the station and the brickworks. Short sight lines; tanks beware.',
  size: 1000,
  segments: 600,
  bounds: { x: 300, z: 310 },
  seed: 1987,
  height,
  fields: createFields({ seed: 1987, cell: 60 }),

  theme: {
    // a grey, still October afternoon
    fogColor: 0xa4a8a6,
    fogDensity: 0.0026,
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
      farmX: [320, 400],
      farmZ: [350, 430],
      roads: [-124, 0, 124],
      roadZ: 300,
      surface(x, z) {
        if (onRail(x, z)) return [0x4e4a44, 0.9];                             // ballast
        const s = street(x, z);
        if (s > 0) return [Math.abs(x) < SQUARE && Math.abs(z) < SQUARE ? 0x77726a : 0x5f5c56, s * 0.95]; // the square, cobbles
        const t = town(x, z);
        return t > 0 ? [0x4a4e36, t * 0.45] : null;                          // trodden yards and gardens
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-124, 0, 124] }, pact: { x: 0, z: -BASE_Z, entries: [-124, 0, 124] } },
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 190 }, pact: { x: 0, z: -190 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: pactName[s.name] ?? s.name })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const landmarks: any[] = [];   // footprints the street-filling houses keep clear of: [x, z, half-w, half-d]
    const clear = (x, z, hw, hd) => landmarks.push([x, z, hw, hd], [-x, -z, hw, hd]);

    // ---- landmarks, mirrored: the town hall on the square, a church on each side of the old town,
    // the station and goods yard, the brickworks / tannery
    mirrored(props, 1201, (m, flip) => {
      props.townHouse({ x: 0, z: (SQUARE + 9) * m, yaw: flip, width: 22, depth: 11, storeys: 3, name: 'town hall', damaged: 0 });
      props.church({ x: -93 * m, z: 4 * m, yaw: flip });
      props.lowWall({ x: -93 * m, z: 38 * m, yaw: 0, length: 24 });                             // churchyard wall
      for (const [x, z] of [[-6, -6], [8, 9], [-9, 12]]) props.wreckCar({ x: x * m, z: z * m, yaw: x + flip }); // the square
      props.jersey({ x: 14 * m, z: -12 * m, yaw: 0.4, length: 6 });
      // station: the building, platforms, the track, wagons in the goods yard
      props.townHouse({ x: -150 * m, z: (RAIL_Z - 14) * m, yaw: flip, width: 20, depth: 10, storeys: 2, name: 'railway station', damaged: 0 });
      props.rails({ x0: -310 * m, z0: RAIL_Z * m, x1: -42 * m, z1: RAIL_Z * m });
      props.rails({ x0: -230 * m, z0: (RAIL_Z + 7) * m, x1: -90 * m, z1: (RAIL_Z + 7) * m });
      const wagons: [number, string, number][] = [[-200, 'box', 0x5a3426], [-188, 'box', 0x4a3a2a], [-120, 'tank', 0x2a2a2a], [-108, 'open', 0x4a4038], [-96, 'box', 0x5a3426]];
      for (const [x, kind, c] of wagons) {
        props.wagon({ x: x * m, z: (RAIL_Z + (kind === 'tank' ? 0 : 7)) * m, yaw: Math.PI / 2, kind, color: c });
      }
      props.hall({ x: -195 * m, z: (RAIL_Z - 16) * m, yaw: flip, width: 22, depth: 12, height: 6, color: 0x6e5444, name: 'goods shed' });
      // the brickworks (east) / tannery (west): halls, a chimney, yard walls
      props.hall({ x: 152 * m, z: 82 * m, yaw: flip, width: 30, depth: 16, height: 7.5, color: 0x7a4a38, name: 'brickworks' });
      props.hall({ x: 186 * m, z: 52 * m, yaw: Math.PI / 2 + flip, width: 18, depth: 11, height: 6, color: 0x6e4a3a, name: 'kiln house' });
      props.chimney({ x: 172 * m, z: 66 * m, height: 32 });
      props.lowWall({ x: 152 * m, z: 50 * m, yaw: 0, length: 30, height: 1.6 });
      for (let k = 0; k < 3; k++) props.crates({ x: (128 + k * 5) * m, z: 58 * m, yaw: k });
    });
    clear(0, SQUARE + 9, 12, 7);
    clear(-93, 4, 6, 18);
    clear(-150, RAIL_Z - 14, 11, 6);
    clear(-195, RAIL_Z - 16, 12, 7);
    clear(152, 82, 16, 9);
    clear(186, 52, 7, 10);
    clear(172, 66, 3, 3);

    // ---- the houses: rows facing the east–west streets, block by block (our half, mirrored)
    const blocked = (x, z, hw, hd) => landmarks.some(([lx, lz, lw, ld]) => Math.abs(x - lx) < hw + lw + 1.5 && Math.abs(z - lz) < hd + ld + 1.5)
      || (Math.abs(x) < SQUARE + 6 && Math.abs(z) < SQUARE + 6) || onRail(x, z) || Math.abs(z - RAIL_Z) < 12 && x < -40;
    const r = mulberry32(4242);
    const rows: any[] = [];
    for (let i = 0; i + 1 < STREETS_X.length; i++) {
      const x0 = STREETS_X[i] + STREET + 1.5;
      const x1 = STREETS_X[i + 1] - STREET - 1.5;
      // rows along the south side of z = 45, both sides of the block 45..95, 95..140; z > 0 only
      for (const [zEdge, dir] of [[45, 1], [95, -1], [95, 1], [140, -1]]) rows.push({ x0, x1, z: zEdge + dir * (STREET + 1.5), dir });
      rows.push({ x0, x1, z: 45 - STREET - 1.5, dir: -1 }); // the middle row's south edge
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
        const seed = Math.floor(r() * 1e9);
        const storeys = r() < 0.25 ? 3 : 2;
        // the door faces the street: front (+z local) toward it
        mirrored(props, seed, (m, flip) => props.townHouse({ x: cx * m, z: cz * m, yaw: (row.dir > 0 ? Math.PI : 0) + flip, width: w, depth: d, storeys }));
      }
    }
    // garden walls and rubble in the blocks' backyards, mirrored
    for (let i = 0; i < 70; i++) {
      const x = (r() * 2 - 1) * (TOWN_X - 10);
      const z = 10 + r() * (TOWN_Z - 15);
      if (street(x, z) > 0.1 || blocked(x, z, 2, 2) || onRail(x, z)) continue;
      const seed = Math.floor(r() * 1e9);
      const kind = r() < 0.5 ? 'wall' : r() < 0.5 ? 'wreck' : 'rubble';
      mirrored(props, seed, (m, flip) => {
        if (kind === 'wall') props.lowWall({ x: x * m, z: z * m, yaw: (props.rand() < 0.5 ? 0 : Math.PI / 2) + flip, length: 6 + props.rand() * 6, height: 1.2 });
        else if (kind === 'wreck') props.wreckCar({ x: x * m, z: z * m, yaw: props.rand() * 3 + flip });
        else for (let k = 0; k < 4; k++) props.rubble(x * m + (props.rand() - 0.5) * 4, z * m + (props.rand() - 0.5) * 4, 0.4 + props.rand() * 0.4);
      });
    }
    // barricades across some street ends at the edge of town
    for (const sx of STREETS_X) {
      mirrored(props, 300 + sx, (m) => props.jersey({ x: sx * m, z: (TOWN_Z + 6) * m, yaw: 0, length: 6 }));
    }

    // ---- outside town: the two home villages, farm cover, the command posts
    buildVillage(props, points[0], 9500, 1);
    buildVillage(props, { x: 0, z: -236 }, 9500, -1);
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'hay', 'wrecks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 34 && tries < 5000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = 30 + rand() * (bounds.z - 40);
      if (town(x, z) > 0 || sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 24 * 24)) continue;
      if (Math.hypot(x, z - BASE_Z) < 34 || Math.hypot(x, z - 236) < 34) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 22 }, { x: 0, z: -BASE_Z, r: 22 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 10 })),
      { test: (x, z) => street(x, z) > 0.05 || onRail(x, z) }];
    // a few garden trees in town, woods on the edge hills
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 1100,
      forest: (x, z) => (town(x, z) > 0.5 ? 0.05 : Math.max(0, (Math.abs(x) - 260) / 60)),
    });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x, z) => town(x, z) > 0.2 }], count: 5000, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 3.6, fields: this.fields });

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
