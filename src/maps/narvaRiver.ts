// Narva, 2027 (a hypothetical war): Estonia's border town on the Narva river, where NATO's eastern edge
// faces Russia across a hundred metres of water. On the Estonian bank (south) the Hermann Castle with its
// tall white tower stands on the limestone bank, Narva's Soviet-era blocks of flats behind it, the Balti
// power station's halls and chimneys on the flank; on the Russian bank (north) Ivangorod's fortress
// looks straight back at it across the Friendship Bridge, the old textile mills of Parusinka beside it.
// Upstream (east) the hydro dam holds back the Narva reservoir, which fills the whole flank; downstream
// the railway bridge. NATO holds the Estonian bank, Russia attacks from Ivangorod. Not a mirror: the
// river winds its own way, each bank is steep where the other is gentle (the glint cliff under the
// Hermann Castle, the Russian bank steep upstream), the towns and woods lie where they lie; but the
// three crossings are shared (the railway bridge, the Friendship Bridge, the dam), each side has a walled
// castle on its bank at the same distance from the bridge, an industrial flank, a town of blocks of the
// same weight (Ivangorod made as big as Narva's south-east for the game), and its villages at the same
// distances from its base.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { theme2027, modernVillage, flats, coverSites, vegetation, powerLine } from './common2027.js';
import { curtainWall } from './baltic2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(2041);
const riverZ = (x) => 12 * Math.sin(x * 0.005 + 0.6) + 7 * Math.sin(x * 0.013 + 2) - 3;
const BRIDGES = [-370, 0, 300];
const DAM = BRIDGES[2];
const river = createRiver({
  path: riverZ, halfWidth: 24, level: 0, depth: 3.4, valley: 50,
  crossings: [
    { name: 'Narva railway bridge', x: BRIDGES[0], kind: 'bridge', width: 8 },
    { name: 'Friendship Bridge', x: BRIDGES[1], kind: 'bridge', width: 12 },
    { name: 'Narva dam', x: DAM, kind: 'bridge', width: 14 },
  ],
});
const away = (x, z) => Math.abs(z - riverZ(x));
/** The reservoir above the dam (0 dry … 1 open water): it fills the east flank between the banks. */
const resK = (x, z) => smoothstep(DAM + 22, DAM + 60, x) * (1 - smoothstep(36, 46, away(x, z)));
/** How wide the climb out of the valley is (< 1: a steep bank): the Estonian glint steep downstream, the Russian bank upstream. */
const bankW = (x, z) => 1 + 0.38 * Math.tanh((z > riverZ(x) ? x - 80 : -x - 40) * 0.008) + 0.1 * Math.sin(x * 0.012 + (z > riverZ(x) ? 0 : 2));
// rises on each side, none mirrored: [x, z, radius, height]
const RISES = [[-200, 330, 70, 6], [250, 420, 60, 5], [430, 200, 50, 4], [-400, -360, 70, 6], [140, -330, 70, 5], [-180, -440, 50, 4]];

// the castles, each on its own bank at the same distance from the Friendship Bridge
const HERMANN = { x: 60, z: riverZ(60) + 96 };
const IVAN = { x: -125, z: riverZ(-125) - 100 };
const HERMANN_WALL = [[HERMANN.x - 38, HERMANN.z - 30], [HERMANN.x + 38, HERMANN.z - 30], [HERMANN.x + 38, HERMANN.z + 30], [HERMANN.x - 38, HERMANN.z + 30]];
const IVAN_WALL = [[IVAN.x - 52, IVAN.z + 26], [IVAN.x - 30, IVAN.z + 36], [IVAN.x + 40, IVAN.z + 30], [IVAN.x + 46, IVAN.z - 6], [IVAN.x + 26, IVAN.z - 36], [IVAN.x - 40, IVAN.z - 30]];
const inCastle = (x, z, r = 0) => Math.hypot(x - HERMANN.x, z - HERMANN.z) < 50 + r || Math.hypot(x - IVAN.x, z - IVAN.z) < 58 + r;

function height(x, z) {
  const ax = Math.abs(x), az = Math.abs(z), w = bankW(x, z), d = away(x, z) / w;
  let h = 2 + smoothstep(30, 110, d) * (14 + fbm(noise, x * 0.004, z * 0.004, 4) * 4);       // the limestone plateau over the river
  for (const [cx, cz, r, a] of RISES) h += a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  h += fbm(noise, x * 0.012 + 20, z * 0.012, 4) * 2 * smoothstep(40, 120, d);              // swells
  h += x * 0.012 * smoothstep(60, 220, d);                                                  // both banks climbing upstream (east), toward the reservoir
  h += smoothstep(500, 620, ax) * (12 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 16);
  h += smoothstep(560, 680, az) * 14;
  for (const c of [HERMANN, IVAN]) h += (14 + 2 - h) * smoothstep(64, 48, Math.hypot(x - c.x, z - c.z)) * 0.9; // each castle's level yard
  for (const bx of BRIDGES) h += (Math.min(h, 2 + d * 0.11) - h) * (1 - smoothstep(6, 16, Math.abs(x - bx))) * (1 - smoothstep(110, 150, d)); // the roads down to the crossings
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.3 + 12 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  h = river.carve(x, z, Math.max(1.4, h));
  return h + (-3.4 - h) * resK(x, z);
}

const pt = (id: string, name: string, x: number, z: number, sector: 'west' | 'centre' | 'east', o: { radius?: number } = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  pt('A', 'Tallinn road', 0, 470, 'centre'),
  pt('B', 'Balti power station', -345, 290, 'west'),
  pt('C', 'Hermann Castle', HERMANN.x, HERMANN.z, 'centre', { radius: 26 }),
  pt('D', 'Kulgu', 310, 320, 'east'),
  pt('E', 'Railway bridge', BRIDGES[0], riverZ(BRIDGES[0]), 'west', { radius: 22 }),
  pt('F', 'Friendship Bridge', 0, riverZ(0), 'centre', { radius: 24 }),
  pt('G', 'Narva dam', DAM, riverZ(DAM), 'east', { radius: 22 }),
  pt('H', 'Parusinka', -370, -262, 'west'),
  pt('I', 'Ivangorod Fortress', IVAN.x, IVAN.z, 'centre', { radius: 26 }),
  pt('J', 'Kuzemkino', 285, -335, 'east'),
  pt('K', 'Kingisepp road', 0, -470, 'centre'),
];

const layout = [{ unit: 'rifles', x: 12, z: 454, name: '1st Platoon' }];

export default {
  id: 'narva-river',
  name: 'Narva',
  epochs: ['2027'],
  region: 'baltic',
  armies: { nato: ['us', 'pl'], pact: ['ru'] }, // (NATO's forward battlegroup in Estonia against the Russian Army coming over from Ivangorod)
  description: 'Estonia’s border town on the Narva river, 2027: the Hermann Castle and Ivangorod’s fortress face each other over the Friendship Bridge, Soviet blocks behind them, the hydro dam and its reservoir upstream.',
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 2041,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  fields: createFields({ seed: 2041, cell: 72 }),

  theme: theme2027({
    fogDensity: 0.0018, clouds: 0.65, sunIntensity: 1.9,
    terrain: {
      roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x, z, y) {
        if (Math.abs(x) < 6 && Math.abs(z) < 620 && away(x, z) > 22) return [0x3c3d3f, 1];       // the Tallinn–St Petersburg road over the bridge
        if (inCastle(x, z, -6)) return [0x8a8676, 0.7];                                           // the castle yards' cobbles
        if (y < 1.6 && away(x, z) < 60 && resK(x, z) < 0.5) return [0x5e5a40, 0.7];               // the river meadows
        return null;
      },
    },
  }),

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x, z, r = 0) => away(x, z) < river.halfWidth + 6 + r || resK(x, z) > 0.05;
    const skip = (x, z, r) => wet(x, z, r) || (Math.abs(x) < 9 + r && away(x, z) > 20) || inCastle(x, z, r);

    // the Hermann Castle: the convent block round its court, Tall Hermann at its corner, the bailey wall
    // with a gate toward the bridge road and one toward the town
    props.rand = mulberry32(4101);
    props.flatHouse({ x: HERMANN.x + 14, z: HERMANN.z - 15, yaw: 0, width: 22, depth: 16, storeys: 3, name: 'Hermann Castle' });
    { const tx = HERMANN.x - 10, tz = HERMANN.z - 14, g = terrain.heightAt(tx, tz);
      props.box('stone', tx, g + 13, tz, 9, 28, 9, 0, 0xd8d4c8);
      props.box('metal', tx, g + 28, tz, 7, 3, 7, Math.PI / 4, 0x4a5a52);
      cover.addBox({ x: tx, z: tz, length: 9, thickness: 9, height: 26, spots: false }); }
    curtainWall(props, cover, terrain, HERMANN_WALL, { gates: [[HERMANN.x - 38, HERMANN.z + 4], [HERMANN.x + 6, HERMANN.z + 30]], color: 0xc8c2b0 });
    // Ivangorod: a bigger, lower enclosure with more towers, the barracks and the Assumption church in it
    props.flatHouse({ x: IVAN.x - 6, z: IVAN.z + 8, yaw: 0.1, width: 30, depth: 12, storeys: 2, name: 'Ivangorod barracks' });
    props.church({ x: IVAN.x + 14, z: IVAN.z - 14, yaw: 0.2 });
    curtainWall(props, cover, terrain, IVAN_WALL, { h: 6.5, gates: [[IVAN.x + 43, IVAN.z + 12], [IVAN.x - 7, IVAN.z - 33]], color: 0xa8a090, tower: 8 });

    // Narva's blocks of flats behind the castle and Ivangorod's behind the fortress (each its own streets)
    for (const [s, seed] of [[1, 4111], [-1, 4112]]) {
      props.rand = mulberry32(seed);
      const r = props.rand;
      for (let n = 0, i = 0; n < 15 && i < 400; i++) {
        const x = (r() - 0.5) * 520, z = s * (150 + r() * 210) + riverZ(x);
        if (skip(x, z, 16) || nearPoint(x, z, 40) || Math.abs(x) < 24) continue;
        flats(props, { x, z, yaw: r() < 0.5 ? 0.05 * s : Math.PI / 2, storeys: 4 + Math.floor(r() * 2), width: 34 + r() * 16, depth: 11 });
        n++;
      }
      for (let n = 0, i = 0; n < 14 && i < 300; i++) {
        const x = (r() - 0.5) * 300, z = s * (130 + r() * 120) + riverZ(x);
        if (skip(x, z, 7) || nearPoint(x, z, 28)) continue;
        props.townHouse({ x, z, yaw: r() * 3, width: 9, depth: 9, storeys: 2, damaged: 0 });
        n++;
      }
    }
    // the industry on each west flank: the Balti power station, the Parusinka mills
    props.rand = mulberry32(4121);
    for (const [x, z, yaw] of [[-300, 250, 0.2], [-395, 330, 0.2], [-290, 340, 1.7]]) props.hall({ x, z, yaw, width: 34, depth: 18, height: 10, color: 0x8a8a84, roof: 0x4a4c4e, door: 8, name: 'power station hall' });
    for (const [x, z] of [[-330, 230], [-345, 228]]) props.chimney({ x, z, height: 40 });
    for (const [x, z, yaw] of [[-310, -250, 2.9], [-400, -320, 2.9], [-300, -330, 1.4]]) props.hall({ x, z, yaw, width: 34, depth: 18, height: 10, color: 0x8a5a48, roof: 0x4a4c4e, door: 8, name: 'textile mill' });
    for (const [x, z] of [[-385, -245], [-370, -243]]) props.chimney({ x, z, height: 34 });
    // villages on the other points, each its own
    for (const p of points) {
      if (!'DJ'.includes(p.id)) continue;
      props.rand = mulberry32(4150 + Math.round(p.x * 3 + p.z));
      modernVillage(props, p, 1, 0, { skip, church: true });
    }
    // the dam's power house, on the Estonian end, and the Russian sluice house opposite
    props.hall({ x: DAM - 40, z: riverZ(DAM) + 105, yaw: 0, width: 30, depth: 14, height: 9, color: 0xa8a8a2, roof: 0x5a5c60, door: 6, name: 'Narva power house' });
    props.hall({ x: DAM - 42, z: riverZ(DAM) - 110, yaw: Math.PI, width: 26, depth: 14, height: 8, color: 0x9e9e96, roof: 0x5a5c60, door: 6, name: 'sluice house' });
    // the bridgeheads: Estonia's dragon's teeth at its end of the Friendship Bridge, Russian hedgehogs and blocks at the other;
    // jersey barriers at the other crossings
    props.rand = mulberry32(4177);
    const fz = riverZ(0);
    for (const x of [-24, -19, -14, -9, 9, 14, 19, 24]) for (const dz of [0, 4.5]) {
      const X = x + (dz ? 2.2 : 0), Z = fz + 50 + dz, g = terrain.heightAt(X, Z);
      props.box('stone', X, g + 0.5, Z, 1.1, 1.1, 1.1, Math.PI / 4, 0x8e8c84, 0.6);
      cover.addCylinder({ x: X, z: Z, radius: 0.7, height: 1.1, spots: false });
    }
    for (const dx of [-20, -13, 13, 20]) props.hedgehog({ x: dx, z: fz - 48 });
    props.jersey({ x: -7, z: fz - 56, yaw: Math.PI + 0.2, length: 5 });
    for (const c of river.crossings) {
      if (c.x === 0) continue;
      for (const end of [1, -1]) {
        const z = c.z + end * (river.halfWidth + 26), flip = end > 0 ? 0 : Math.PI;
        props.jersey({ x: c.x - 9 * end, z, yaw: 0.2 + flip, length: 5 });
        for (const dx of [-15, 15]) props.hedgehog({ x: c.x + dx, z: z + 8 * end });
      }
    }
    coverSites(props, rand, bounds, (x, z) => away(x, z) > river.halfWidth + 30 && !wet(x, z, 10) && Math.hypot(x, Math.abs(z) - BASE_Z) > 40 && !nearPoint(x, z, 40) && !skip(x, z, 8), 220, undefined, buildSite, false);
    // a power line behind each front (the Baltic grid's old link to Russia), each its own course
    powerLine(props, 4188, (x) => 410 + x * 0.06, (x, z) => z < 0 || nearPoint(x, z, 25) || skip(x, z, 6));
    powerLine(props, 4189, (x) => 405 + x * 0.07 + 16 * Math.sin(x * 0.011), (x, z) => z > 0 || nearPoint(x, z, 25) || skip(x, z, 6));
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5a3a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 10 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })), { test: (x, z) => wet(x, z, -4) || Math.abs(x) < 7 || inCastle(x, z, 4) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, hedges: 4000, broadleaf: 0.5,
      forest: (x, z) => {
        const d = away(x, z);
        if (d < river.halfWidth + 2 || resK(x, z) > 0.02) return -1;
        if (d < 110 * bankW(x, z) && Math.abs(x) > 150 && !river.crossings.some((c) => Math.abs(x - c.x) < 40)) return 0.8; // the wooded banks
        return Math.abs(x) > 470 ? 0.75 : noise(x * 0.007 + 811.4, z * 0.007 - 377.8) > 0.3 ? 0.75 : 0; // (as much wood on each side)
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
