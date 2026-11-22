// The Battle of Romani, 3–5 August 1916. Kress von Kressenstein’s Ottoman-German column (the 3rd Infantry Division,
// the German Pasha I machine guns and guns) marched across the northern Sinai from Katia to cut the Suez Canal, and at
// night went at the British line east of Romani: the 52nd (Lowland) Division in a chain of numbered redoubts on the
// dunes, and in the soft sand to the south the 1st and 2nd Australian Light Horse Brigades, then the New Zealand Mounted
// Rifles. The attackers took Mount Meredith and Wellington Ridge, were stopped on Mount Royston in the heat and the deep
// sand, and on the 5th fell back through Katia. It was the last Ottoman try at the canal.
// On the map: high, soft dunes everywhere — the long seif ridges, hummocks between them — and the hods, the hollows
// between the dunes whose floors are firm and flat, with date palms and wells: Romani on the British half, Katia on
// the Ottoman, Hod el Enna in the middle. The British railway and the water pipeline from Kantara run up to Romani
// station; the old caravan road from El Arish comes through the hods to Romani; each side has its line of numbered
// redoubts on the dunes, sandbags and wire. Deep sand slows everyone (soft()): men and horses less than carts, guns
// and cars; the hod floors, the railway and the tracks are firm.
// Fair, not mirrored: Wellington Ridge (west, laid east–west) has its answer in Mount Meredith (east of the Ottoman
// half, laid north-west–south-east), as high, as long, as far from its base; Mount Royston’s answer is the dune at
// Hamisah; Romani’s oasis and Katia’s are the same size at the same depth, one each flank; each side has five
// redoubts and two small hods. Hod el Enna, low ground between them all, belongs to neither. The railway gives the
// British a firm road to Romani; the Ottoman supply track to Katia does the same for them.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { arabVillage, segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const BASE_Z = 500;
const SIDE_X = 300;
const noise = createNoise2D(1916_08);

/** The railway and the pipeline from Kantara up to Romani station (nato’s half). */
const RAIL = [[-140, 620], [-170, 480], [-260, 380], [-350, 318], [-420, 290], [-470, 286]];
/** The tracks: the caravan road El Arish–Katia–Romani across the middle, each side’s track from its base to the middle,
 * each side’s lateral behind its line, the Ottoman supply track to Katia. */
const ROADS = [
  [[520, -420], [290, -310], [150, -170], [0, 0], [-150, 150], [-360, 300], [-520, 330]],
  [[0, 600], [0, 470], [40, 250], [20, 110], [0, 0]],
  [[0, -600], [0, -470], [-90, -235], [-30, -110], [0, 0]],
  [[-360, 300], [-150, 380], [0, 400], [310, 380], [310, 280]],
  [[-340, -330], [-150, -400], [0, -405], [290, -380], [290, -310]],
  [[-180, -620], [-240, -470], [-340, -330]],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((p) => segDist(p, x, z))), EXT, 2);
const railD = gridCache((x: number, z: number) => segDist(RAIL, x, z), EXT, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.2;
const onRail = (x: number, z: number) => railD(x, z) < 2.6;

/** The big dunes [x0, z0, x1, z1, half-width, height]: Wellington Ridge and Mount Meredith (the pair), Mount Royston and the Hamisah dune. */
const RIDGES = [[-410, 112, -170, 88, 62, 24], [260, 20, 390, -180, 62, 24], [310, 285, 310, 285, 110, 15], [290, -310, 290, -310, 110, 15]];
/** The hods [x, z, r]: Romani, Katia, Hod el Enna, and two small hollows each half. */
const HODS = [[-360, 300, 72], [-340, -330, 72], [0, 0, 80], [160, 470, 42], [-160, 220, 38], [-170, -470, 42], [170, -220, 38]];
const hodK = (x: number, z: number) => {
  let k = 0, n = NaN;
  for (const [hx, hz, r] of HODS) {
    const d = Math.hypot(x - hx, z - hz);
    if (d > r + 12) continue;
    if (n !== n) n = fbm(noise, x * 0.03, z * 0.03, 2) * 10;
    k = Math.max(k, smoothstep(r, r * 0.55, d + n));
  }
  return k;
};

function groundRaw(x: number, z: number) {
  let h = 4 + fbm(noise, x * 0.003, z * 0.003, 3) * 3;
  for (const [x0, z0, x1, z1, w, hh] of RIDGES) h += hh * smoothstep(w, 0, segDist([[x0, z0], [x1, z1]], x, z)) ** 1.4;
  // the seif dunes, laid north-west–south-east by the wind, hummocks of loose sand between them — not on the tracks,
  // which wind along between them (and climb the big dunes on their backs), nor on the crowns of the dune points
  const u = x * 0.8 + z * 0.6, v = -x * 0.6 + z * 0.8;
  const rd = Math.min(roadD(x, z), railD(x, z));
  let keep = smoothstep(4, 16, rd);
  for (const p of points) if (p.id !== 'A' && p.id !== 'K') keep = Math.min(keep, smoothstep(18, 40, Math.hypot(x - p.x, z - p.z)));
  h += keep * (3 + ridged(noise, u * 0.006 + 3, v * 0.018, 3) * 8 + fbm(noise, x * 0.025 + 9, z * 0.025, 2) * 1.6) + (1 - keep) * 4;
  h += (2.2 - h) * hodK(x, z);                                                                  // the hod floors: flat and firm
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(36, 18, Math.hypot(x, z - bz));
  return Math.max(h, 1);
}
const height = gridCacheSmooth(groundRaw, EXT, 2);

/** How deep the sand is, 0 (firm: hods, tracks, the railway) … 1 (a dune’s loose crest). */
const sandK = gridCache((x: number, z: number) => {
  const firm = Math.max(hodK(x, z), smoothstep(8, 3, Math.min(roadD(x, z), railD(x, z))));
  return (1 - firm) * (0.7 + 0.3 * smoothstep(6, 16, height(x, z)));
}, EXT, 4);
/** Deep sand: men and horses wade, wheels and tracks dig in. */
const soft = (x: number, z: number, foot: boolean) => 1 - sandK(x, z) * (foot ? 0.3 : 0.5);

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Pelusium', 0, 470, 'centre'),
  P('B', 'Romani', -360, 300, 'west'),
  P('C', 'No. 4 Redoubt', 40, 250, 'centre'),
  P('D', 'Mount Royston', 310, 285, 'east'),
  P('E', 'Wellington Ridge', -290, 100, 'west'),
  P('F', 'Hod el Enna', 0, 0, 'centre', { radius: 34 }),
  P('G', 'Mount Meredith', 330, -90, 'east'),
  P('H', 'Katia', -340, -330, 'west'),
  P('I', 'Abu Hamra', -90, -235, 'centre'),
  P('J', 'Hamisah', 290, -310, 'east'),
  P('K', 'Oghratina', 0, -470, 'centre'),
] as any[];

/** Each side’s numbered redoubts on the dunes: [x, z] (the point redoubts first). */
const REDOUBTS = { nato: [[40, 250], [-420, 180], [-150, 140], [170, 160], [420, 150]], pact: [[-90, -235], [-430, -150], [-170, -160], [150, -140], [430, -170]] };

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1st Section' }];

export default {
  id: 'romani',
  name: 'Romani',
  description: '3–5 August 1916: the Ottoman-German march on the Suez Canal stopped in the Sinai dunes east of it — high, soft sand ridges (Wellington Ridge, Mount Meredith, Mount Royston), the palm hollows of Romani and Katia with their wells, the railway and water pipeline from Kantara, numbered redoubts in sandbags and wire. Deep sand slows everyone; the hod floors and the tracks are firm.',
  epochs: ['1918'],
  region: 'middleEast',
  climate: 'desert',
  armies: { nato: ['uk', 'anzac'], pact: ['ot', 'de'] }, // (the 52nd Division and the Anzac Mounted Division against Kress’s Ottoman 3rd Division and Pasha I)
  sides: { nato: 'British Empire', pact: 'Ottoman Empire' },
  conditions: { time: 'dawn', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.6,
  seed: 1916,
  height,
  soft,
  fields: createFields({ seed: 191608, cell: 80 }),

  theme: {
    // an August dawn in the Sinai: white sky, the heat already coming off the sand
    fogColor: 0xe2d6bc, fogDensity: 0.0009, skyTop: 0x84a6c8, skyHorizon: 0xece2cc, skyBottom: 0xc8b48e,
    sunColor: 0xfff0d2, sunIntensity: 2.2, sunDisk: 0.8, clouds: 0.04, cloudLight: 0xf8f2e8, cloudDark: 0xd2c8b6,
    sunDir: [-0.6, 0.38, -0.4], hemiSky: 0xdcdee2, hemiGround: 0xb09468, hemiIntensity: 1.2, rimColor: 0xf2e4c6, rimIntensity: 0.3,
    terrain: {
      grass: '#c8b07c', grassAlt: '#bea472', dryGrass: '#d4bc86', dirt: '#b08c5e', rock: '#b4a284',
      pasture: '#c4ac78', ploughed: '#a8865a', stubble: '#d2ba86', meadow: '#c2aa78',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRail(x, z)) return [0x6e6050, 0.9];
        if (onRoad(x, z)) return [0xbca47a, 0.8];                                              // the beaten track
        const hk = hodK(x, z);
        if (hk > 0.5) return [0x9c8a5c, Math.min(0.75, (hk - 0.5) * 2)];                         // the hod floor: firm, a little scrub
        const k = sandK(x, z);
        return [y > 12 ? 0xecdcb2 : 0xe2d0a2, Math.min(0.9, k)];                                  // the loose pale sand
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Takım' })),
  },

  /** Each side’s five redoubts: a ring of fire trench in the sand with its wire, a machine gun on the side toward the enemy. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      for (const [rx, rz] of REDOUBTS[f]) {
        const ring: number[][] = [];
        for (let a = 0; a <= 6; a++) ring.push([rx + 18 * Math.cos(a * Math.PI / 3), rz + 18 * Math.sin(a * Math.PI / 3)]);
        for (const w of trenchLine(ring, f, { wireAt: 14, belts: 1, gapEvery: 50 })) if (!onRoad(w.x, w.z) && !onRail(w.x, w.z)) works.push(w);
        works.push({ kind: 'mgNest', x: rx + 6, z: rz - 10 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearRedoubt = (x: number, z: number, r: number) => [...REDOUBTS.nato, ...REDOUBTS.pact].some(([rx, rz]) => Math.hypot(rx - x, rz - z) < r);
    const skip = (x: number, z: number) => roadD(x, z) < 8 || railD(x, z) < 9 || nearRedoubt(x, z, 34);

    // ---- the railway and the pipeline beside it, up to Romani station: the station, its water tanks, wagons, tents
    props.rand = mulberry32(1916_01);
    const pipe = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], len = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / len, dz = (bz - az) / len;
      for (let t = 0; t < len; t += 20) {
        const l = Math.min(20, len - t), x0 = ax + dx * t, z0 = az + dz * t;
        props.rails({ x0, z0, x1: x0 + dx * l, z1: z0 + dz * l });
        const px = x0 + dx * l / 2 + dz * 6, pz = z0 + dz * l / 2 - dx * 6;                    // (the pipe 6 m off, on the ground)
        q.setFromUnitVectors(up, new THREE.Vector3(dx, 0, dz));
        pipe.compose(new THREE.Vector3(px, terrain.heightAt(px, pz) + 0.35, pz), q, new THREE.Vector3(1, 1, 1));
        props.push('plain', new THREE.CylinderGeometry(0.3, 0.3, l, 8), pipe, 0x4a4844);
      }
    }
    props.flatHouse({ x: -315, z: 312, yaw: 0.6, width: 14, depth: 7, name: 'Romani station' });
    props.tanks({ x: -290, z: 395, yaw: 0, count: 2, radius: 3, height: 5, color: 0x5a5650 }); // (the pipeline’s reservoirs)
    for (const [x, kind, c] of [[-400, 'box', 0x6a4a34], [-412, 'open', 0x6a5a44], [-230, 'open', 0x5e5040]] as [number, string, number][]) {
      const t = RAIL.findIndex(([px]) => px < x), [ax, az] = RAIL[t - 1], [bx, bz] = RAIL[t], k = (x - ax) / (bx - ax);
      props.wagon({ x, z: az + (bz - az) * k, yaw: Math.atan2(bx - ax, bz - az), kind, color: c });
    }
    for (let i = 0; i < 10; i++) props.tent({ x: -260 + (i % 5) * 12, z: 420 + Math.floor(i / 5) * 12, yaw: 0.6, color: 0xc8b890 });

    // ---- the oases: Romani and Katia (each a few huts and wells), Hod el Enna’s well; date palms thick in every hod
    arabVillage(props, -350, -330, 6, 1916_02, (x, z) => skip(x, z) || nearPoint(x, z, 12), false);
    arabVillage(props, -390, 285, 5, 1916_03, (x, z) => skip(x, z) || nearPoint(x, z, 12), false);
    for (const [x, z] of [[-350, 285], [-330, -315], [10, 14], [150, 470], [-160, -470]]) props.flatHouse({ x, z, yaw: 0.2, width: 4, depth: 4, name: 'well-house' });
    const r = mulberry32(1916);
    for (const [hx, hz, hr] of HODS) {
      const n = Math.round(hr * 0.6);
      for (let i = 0, k = 0; i < 400 && k < n; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * hr * 0.6, x = hx + Math.cos(a) * d, z = hz + Math.sin(a) * d;
        if (skip(x, z) || nearPoint(x, z, 16) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
        k++;
        props.rand = mulberry32(i * 31 + hx);
        props.palm({ x, z, height: 6 + r() * 7 });
      }
    }

    // ---- sandbags round the dune points, rocks and wrecked carts (dead camels’ loads) over the sand
    for (const p of points) {
      if (!['C', 'D', 'E', 'G', 'I', 'J'].includes(p.id)) continue;
      props.rand = mulberry32(1918 + p.x + p.z);
      props.sandbagRing({ x: p.x + 12, z: p.z - 6, radius: 5, toward: p.z > 0 ? -1 : 1 });
      props.sandbagRing({ x: p.x - 14, z: p.z + 8, radius: 4.5, toward: p.z > 0 ? -1 : 1 });
    }
    for (let i = 0, n = 0; i < 4000 && n < 40; i++) {
      const x = (r() * 2 - 1) * 470, z = (n % 2 ? -1 : 1) * (60 + r() * 420);
      if (skip(x, z) || nearPoint(x, z, 40) || hodK(x, z) > 0.2 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45) continue;
      n++;
      buildSite(props, { kind: ['wrecks', 'rocks'][n % 2], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    commandPost(props, this.bases.nato, -1, 0xc8b890);
    commandPost(props, this.bases.pact, 1, 0xb0a07a);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => onRoad(x, z) || onRail(x, z) }];
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.3, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); },
    };
  },
} satisfies MapDef;
