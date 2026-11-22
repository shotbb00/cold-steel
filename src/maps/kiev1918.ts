// Kiev, early March 1918: after Brest-Litovsk the German and Austro-Hungarian armies march into Ukraine for the Central
// Rada and retake Kiev from the Red Guards — the city Muravyov’s men had shelled and stormed in January, the Arsenal
// workers’ rising crushed in the same weeks. No front to speak of: Red detachments falling back street by street behind
// barricades, the railways the only lines that mattered. On the map: the Dnieper, wide and grey, its ice breaking up
// into floes round Trukhaniv Island; the Nicholas chain bridge under the wooded bluffs; the Kiev Pechersk Lavra with its
// golden domes and the Great Bell Tower; St Andrew’s Church on its hill over Podil; the Arsenal’s brick halls; Khreshchatyk;
// Nikolskaya Slobodka and the Darnitsa railway yards on the flat left bank; the Struve railway bridge; Kiev station;
// late-winter snow lying in patches on the mud. Scrapes and barricades, no deep trench system.
// Not mirrored but fair: the river runs between the sides and splits round Trukhaniv Island (F), in neither side’s hands,
// one bridge to each bank. The real city stands on the high right bank alone; here the bluffs are cut the same each
// side — the west reach of the Dnieper runs between two equal wooded heights, the Lavra’s (B) on the north bank and
// St Andrew’s (H) on the south, the chain bridge between them; the east reach is flat on both banks, each with a
// railway point on the Struve line (Darnitsa yards, Kiev station). Each side has a town point at the same reach in the
// centre (Arsenal, Khreshchatyk) on the same low rise and a river quarter by the island (Nikolskaya Slobodka, Podil);
// the woods are cut to the same area each side.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, evenThreshold } from './greatWarHelpers.ts';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const HW = 22;                                              // the Dnieper (each arm round Trukhaniv Island)
const RAIL_X = SIDE_X + 5;                                  // the Darnitsa–Kiev line over the Struve bridge
const BLUFF_H = 13;                                         // the wooded bluffs over the west reach, both banks alike
const noise = createNoise2D(1918_03);
const mid = (x: number) => 12 * Math.sin(x * 0.005 + 0.4) + 7 * Math.sin(x * 0.017) - 5;
const split = (x: number) => 72 * Math.exp(-((x / 140) ** 2));                   // the two arms round Trukhaniv Island
const armN = (x: number) => mid(x) + split(x), armS = (x: number) => mid(x) - split(x);
const river = createRiver({
  path: armN, paths: [armN, armS], halfWidth: HW, level: 0, depth: 2.4, valley: 60,
  crossings: [
    { name: 'Nicholas chain bridge', x: -SIDE_X, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Nicholas chain bridge', x: -SIDE_X, kind: 'bridge', width: 7, channel: 1 },
    { name: 'Trukhaniv bridge', x: 0, kind: 'bridge', width: 6, channel: 0 },
    { name: 'Podil pontoon bridge', x: 0, kind: 'bridge', width: 6, channel: 1 },
    { name: 'Struve railway bridge', x: SIDE_X + 2, kind: 'bridge', width: 13 },
  ],
});
/** m from the nearer arm's middle. */
const away = (x: number, z: number) => Math.min(Math.abs(z - armN(x)), Math.abs(z - armS(x)));
/** Each side's lateral road behind the river, the roads from the crossings to the bases. */
const bankZ = (x: number, north: boolean) => (north ? mid(x) + 170 + 8 * Math.sin(x * 0.01) : mid(x) - 168 + 10 * Math.sin(x * 0.007 + 2));
const roadD = (x: number, z: number) => {
  let d = Math.abs(z - bankZ(x, z > mid(x)));
  for (const bx of [-SIDE_X, 0, SIDE_X]) d = Math.min(d, Math.abs(x - bx));
  return d;
};
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
/** The hasty positions: a line of scrapes and rifle pits each side, dug into the thawing ground. */
const trenchZ = (x: number, north: boolean) => (north ? mid(x) + split(x) * 0.6 + 105 + 9 * Math.sin(x * 0.017) : mid(x) - split(x) * 0.6 - 105 - 10 * Math.sin(x * 0.013 + 2));
/** The west reach's bluffs: 0 at the water, full from 120 m back; gone east of x = -130. */
const bluffK = (x: number, z: number) => (1 - smoothstep(-280, -130, x)) * smoothstep(38, 120, away(x, z));
const bluffFace = (x: number, z: number) => x < -150 && away(x, z) > 34 && away(x, z) < 118;

/** One low rise a side behind its centre point [x, z, r, h]. */
const RISES = [[100, 300, 160, 5], [-40, -300, 170, 5.2]];
/** Each side's airfield on the flat east fields behind its lines: the tower at (x, z), the strip 55 m behind it (systems/Airfields.js). */
const AIR = [{ faction: 'nato', x: 190, z: 400, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: 190, z: -400, yaw: -Math.PI / 2, large: false }];
const padK = (x: number, z: number) => smoothstep(150, 128, Math.abs(x - 190)) * smoothstep(62, 44, Math.abs(Math.abs(z) - 430));
const ground = gridCacheSmooth((x: number, z: number) => {
  const d = away(x, z);
  let h = 1.2 + smoothstep(25, 130, d) * (3.4 + fbm(noise, x * 0.004 + (z > mid(x) ? 0 : 40), z * 0.004, 4) * 3.5);
  h += fbm(noise, x * 0.015 + 9, z * 0.015, 3) * 0.8 * smoothstep(40, 140, d);
  h += BLUFF_H * bluffK(x, z);
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += 1.0 * smoothstep(1, 0.3, Math.hypot(x / 120, (z - mid(x)) / 40));                 // Trukhaniv Island's sand
  h += smoothstep(BASE_Z - 70 + 40 * Math.sin(x * 0.008 + 1), 640, Math.abs(z)) * 8 + smoothstep(440 + 50 * Math.sin(z * Math.PI / 280), 600, Math.abs(x)) * 12;
  for (const bx of [-SIDE_X, 0, SIDE_X]) h += (Math.min(h, 1.3 + d * 0.06) - h) * (1 - smoothstep(5, 18, Math.abs(x - bx))) * (1 - smoothstep(150, 220, d)); // (the descents to the bridges)
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  h += (5.5 - h) * padK(x, z);                                                                   // (the airfields levelled)
  return h;
}, { x: 640, z: 700 }, 4);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Brovary road', 0, 470, 'centre'),
  P('B', 'Pechersk Lavra', -360, 300, 'west'),
  P('C', 'Arsenal', 100, 268, 'centre', { radius: 28 }),
  P('D', 'Darnitsa yards', 300, 320, 'east'),
  P('E', 'Nikolskaya Slobodka', -190, Math.round(mid(-190) + 72), 'west', { radius: 24 }),
  P('F', 'Trukhaniv Island', 0, Math.round(mid(0)), 'centre', { radius: 30 }),
  P('G', 'Podil', 200, Math.round(mid(200) - 70), 'east', { radius: 24 }),
  P('H', 'St Andrew’s Church', -330, -300, 'west'),
  P('I', 'Khreshchatyk', -40, -262, 'centre', { radius: 28 }),
  P('J', 'Kiev station', 300, -320, 'east'),
  P('K', 'Zhitomir road', 0, -470, 'centre'),
] as any[];
/** The Lavra's walled precinct, toward the river from B; St Andrew's terrace, toward the river from H. */
const LAVRA = { x: points[1].x + 45, z: points[1].z - 30, w: 64, d: 52 };
const ANDREW = { x: points[7].x + 40, z: points[7].z + 30 };
const inLavra = (x: number, z: number, r = 0) => Math.abs(x - LAVRA.x) < LAVRA.w / 2 + r && Math.abs(z - LAVRA.z) < LAVRA.d / 2 + r;
const TOWNS = [{ x: points[2].x, z: points[2].z, r: 70 }, { x: points[8].x, z: points[8].z, r: 70 }];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'kiev-1918',
  name: 'Kiev 1918',
  description: 'March 1918: after Brest-Litovsk the Germans and Austro-Hungarians retake Kiev from the Red Guards. The Dnieper breaking up its ice round Trukhaniv Island, the chain bridge under wooded bluffs, the golden domes of the Pechersk Lavra and St Andrew’s Church, the Arsenal, Podil and the Darnitsa railway yards, snow patches on the mud and barricades in the streets.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de', 'ah'] }, // (the Red Guards fight as the Russian army; the German and Austro-Hungarian columns)
  sides: { nato: 'Russia', pact: 'Central Powers' },
  conditions: { time: 'day', weather: 'overcast' }, // (raw early-March days, the thaw begun)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1918_03,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191803, cell: 80, weights: [0.3, 0.35, 0.1, 0.25] as any }),

  theme: {
    // low grey thaw sky
    fogColor: 0xb4b8b8, fogDensity: 0.0017, skyTop: 0x7c848c, skyHorizon: 0xc0c4c4, skyBottom: 0x868a88,
    sunColor: 0xe6e6e0, sunIntensity: 1.3, sunDisk: 0.05, clouds: 0.9, cloudLight: 0xc6caca, cloudDark: 0x7a8084,
    sunDir: [0.4, 0.45, 0.7], hemiSky: 0xccd2d6, hemiGround: 0x7e7c70, hemiIntensity: 1.4, rimColor: 0xc0c6cc, rimIntensity: 0.2,
    terrain: {
      grass: '#7c7a5c', grassAlt: '#86825e', dryGrass: '#9a9070', dirt: '#6a5a46', rock: '#8a8478', strip: '#6a5c4a',
      pasture: '#807e5e', ploughed: '#5e5040', stubble: '#948a6a', meadow: '#7a7c5a',
      farmX: [460, 600], farmZ: [520, 640], roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x5e5042, 0.9];                                       // the roads: churned mud
        if (Math.abs(x - RAIL_X) < 2.5) return [0x4e4a44, 0.7];                          // the railway's cinder bed
        if (inLavra(x, z, -2)) return [0xa8a294, 0.5];                                   // the Lavra's yard
        const s = fbm(noise, x * 0.018 + 31, z * 0.018, 3) + (y - 4) * 0.012;               // late snow lying in patches, more on the heights
        if (s > 0.3) return [0xe4e8ea, Math.min(0.85, (s - 0.3) * 6)];
        if (y < 1.7 && away(x, z) < HW + 10) return [0x6a6050, 0.7];                    // the muddy banks
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
  airfields: AIR,
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** Each side's hasty line: stretches of scrapes and rifle pits with gaps, a little wire, an MG at each road. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato')]);
      for (const w of trenchLine(pts, f, { wireAt: 16, belts: 1, gapEvery: 30 })) {
        if (roadD(w.x, w.z) < 8 || Math.abs(w.x - RAIL_X) < 6 || away(w.x, w.z) < HW + 10 || bluffFace(w.x, w.z)) continue;
        const stretch = Math.sin(w.x * s * 0.045) > -0.1;
        if (!stretch || (w.kind === 'wire' && Math.sin(w.x * s * 0.11) < 0.3)) continue;
        works.push(w);
      }
      for (const bx of [-SIDE_X, 0, SIDE_X]) works.push({ kind: 'mgNest', x: bx + 15 * s, z: trenchZ(bx + 15 * s, f === 'nato') - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, r = 0) => away(x, z) < HW + 6 + r;
    const trenchBand = (x: number, z: number) => Math.abs(z - trenchZ(x, z > mid(x))) < 26;
    const railD = (x: number) => Math.abs(x - RAIL_X);
    const yardD = (x: number, z: number) => (Math.abs(Math.abs(z) - 320) < 95 ? Math.min(railD(x), Math.abs(x - RAIL_X - 7), Math.abs(x - RAIL_X - 14)) : railD(x));
    const holy = [{ x: LAVRA.x, z: LAVRA.z, r: 44 }, { x: ANDREW.x, z: ANDREW.z, r: 30 }];
    const skip = (x: number, z: number) => padK(x, z) > 0 || wet(x, z, 8) || roadD(x, z) < 8 || trenchBand(x, z) || yardD(x, z) < 9 || inLavra(x, z, 8)
      || holy.some((c) => Math.hypot(c.x - x, c.z - z) < c.r);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const WHITE = 0xe6e2d8, GOLD = 0xd0b050, GREEN = 0x4a8a76, BRICK = 0x8a4a36;
    /** An onion dome on a drum at (x, y, z): `r` its radius. */
    const onion = (x: number, y: number, z: number, r: number, color: number, drum = WHITE) => {
      m4.compose(v.set(x, y, z), q.identity(), one); props.push('plaster', new THREE.CylinderGeometry(r * 0.75, r * 0.75, r * 1.6, 12), m4, drum);
      m4.compose(v.set(x, y + r * 1.6, z), q.identity(), v.clone().set(r, r * 1.2, r)); props.push('plain', new THREE.SphereGeometry(1, 12, 8), m4, color);
      m4.compose(v.set(x, y + r * 3, z), q.identity(), one); props.push('plain', new THREE.ConeGeometry(r * 0.38, r * 1.2, 8), m4, GOLD);
      props.box('metal', x, y + r * 3.9, z, 0.15, 1.6, 0.15, 0, GOLD);
      props.box('metal', x, y + r * 4.1, z, 0.9, 0.12, 0.12, 0, GOLD);
    };

    // ---- the Kiev Pechersk Lavra: the white precinct wall, the Dormition Cathedral's gold domes, the Great Bell Tower
    props.rand = mulberry32(1051);
    for (const [dx, dz, yaw, L] of [[0, LAVRA.d / 2, 0, LAVRA.w], [0, -LAVRA.d / 2, 0, LAVRA.w], [LAVRA.w / 2, 0, Math.PI / 2, LAVRA.d], [-LAVRA.w / 2, 0, Math.PI / 2, LAVRA.d]]) {
      for (let t = -L / 2 + 2; t < L / 2; t += 4) {
        const x = LAVRA.x + dx + (yaw ? 0 : t), z = LAVRA.z + dz + (yaw ? t : 0);
        if (Math.abs(t) < 5) continue;                                                 // (the Holy Gates, one in each wall)
        props.lowWall({ x, z, yaw, length: 4.1, height: 2.8, color: WHITE });
      }
    }
    {
      const x = LAVRA.x - 8, z = LAVRA.z - 4;
      const b = props.beginBuilding('Dormition Cathedral', x, z, 0, 18, 14);
      b.plaster = WHITE;
      props.shell(b, { height: 11, key: 'plaster', color: WHITE, front: [0], left: [3], t: 0.8, bay: 3.4, sill: 2.2, head: 7.5, frame: 0xb8b0a0 });
      props.gableRoof(b, { eave: 11, pitch: 0.4, color: 0x5a7a6a, t: 0.8 });
      props.endBuilding();
      const g = b.ground;
      onion(x, g + 15, z, 3.6, GOLD);
      for (const [dx, dz] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) onion(x + dx, g + 13, z + dz, 1.5, GOLD);
      // the Great Bell Tower: four tiers, white and green, a gold dome on top
      const bx = LAVRA.x + 18, bz = LAVRA.z + 12, bg = terrain.heightAt(bx, bz);
      let y = bg - 0.5;
      for (const [w, hh, c] of [[9, 10, WHITE], [7.4, 8, 0xd8d4c4], [6, 7, WHITE], [4.6, 6, 0xd8d4c4]] as const) {
        props.box('plaster', bx, y + hh / 2, bz, w, hh, w, 0, c);
        props.box('plain', bx, y + hh - 0.3, bz, w + 0.6, 0.5, w + 0.6, 0, GREEN);
        props.box('metal', bx, y + hh * 0.6, bz, w + 0.05, hh * 0.3, 1.2, 0, 0x2a2622);
        y += hh;
      }
      onion(bx, y, bz, 2.2, GOLD);
      cover.addBox({ x: bx, z: bz, yaw: 0, length: 9, thickness: 9, height: 12 });
      props.townHouse({ x: LAVRA.x - 14, z: LAVRA.z + 16, yaw: 0, width: 14, depth: 7, storeys: 2, name: 'monks’ cells', damaged: 0 });
      props.crates({ x: LAVRA.x + 20, z: LAVRA.z - 14, yaw: 0.3 });
    }

    // ---- St Andrew's Church on its terrace over Podil: turquoise and white, green domes, gold crosses
    {
      props.rand = mulberry32(1754);
      const { x, z } = ANDREW;
      for (const [dx, dz, yaw, L] of [[0, 20, 0, 40], [0, -20, 0, 40], [20, 0, Math.PI / 2, 40], [-20, 0, Math.PI / 2, 40]]) {
        for (let t = -L / 2 + 2; t < L / 2; t += 4) {
          if (Math.abs(t) < 5 && dz) continue;                                             // (the stairs up, front and back)
          props.lowWall({ x: x + dx + (yaw ? 0 : t), z: z + dz + (yaw ? t : 0), yaw, length: 4.1, height: 2.4, color: 0xc8c0b0 });
        }
      }
      const TURQ = 0x7ab4c0;
      const b = props.beginBuilding('St Andrew’s Church', x, z, 0, 14, 14);
      b.plaster = TURQ;
      props.shell(b, { height: 10, key: 'plaster', color: TURQ, front: [0], back: [0], left: [0], t: 0.8, bay: 3.4, sill: 2.4, head: 7.6, frame: 0xf0ece4 });
      props.gableRoof(b, { eave: 10, pitch: 0.35, color: GREEN, t: 0.8 });
      props.endBuilding();
      const g = b.ground;
      onion(x, g + 13, z, 3.4, GREEN, TURQ);
      for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
        props.box('plaster', x + dx, g + 6.5, z + dz, 2.4, 13, 2.4, 0, TURQ);
        onion(x + dx, g + 13, z + dz, 1.3, GREEN, TURQ);
      }
      // the houses down Andriyivskyi descent
      for (const [hx, hz, yaw] of [[-36, 6, 0], [-34, -14, 0], [26, 26, Math.PI / 2], [-14, 30, 0], [34, -12, Math.PI / 2]]) {
        if (!skip(x + hx, z + hz)) props.townHouse({ x: x + hx, z: z + hz, yaw, width: 9, depth: 8, storeys: 2, damaged: 0.05 });
      }
    }

    // ---- the Arsenal (north bank): brick halls, its chimney, workers' houses
    {
      props.rand = mulberry32(1764);
      const p = points[2];
      for (const [dx, dz, yaw, w] of [[-40, 34, 0, 30], [36, 36, 0, 26], [-44, -30, Math.PI / 2, 22], [42, -32, Math.PI / 2, 22]]) {
        if (!skip(p.x + dx, p.z + dz)) props.hall({ x: p.x + dx, z: p.z + dz, yaw, width: w, depth: 14, height: 8, color: BRICK, name: 'Arsenal workshop' });
      }
      props.chimney({ x: p.x + 4, z: p.z + 52, height: 28 });
    }
    // ---- Khreshchatyk (south bank): three-storey blocks along the street
    {
      props.rand = mulberry32(1797);
      const p = points[8];
      for (const side of [1, -1]) for (let x = p.x - 72; x <= p.x + 72; x += 13) {
        const z = p.z + side * 22;
        if (Math.abs(x - p.x) < 14 || skip(x, z)) continue;
        props.townHouse({ x, z, yaw: side > 0 ? Math.PI : 0, width: 11, depth: 9, storeys: 3, damaged: 0.1 });
      }
    }
    // ---- the river quarters: Nikolskaya Slobodka (north), Podil (south)
    for (const [p, seed, stone] of [[points[4], 1, false], [points[6], 2, true]] as const) {
      props.rand = mulberry32(1918_30 + seed);
      for (let i = 0, k = 0; k < 10 && i < 500; i++) {
        const a = props.rand() * Math.PI * 2, d = 20 + props.rand() * 50, x = p.x + Math.cos(a) * d * 1.3, z = p.z + Math.sin(a) * d * 0.9;
        if (skip(x, z) || Math.hypot(x - p.x, z - p.z) < 14) continue;
        const yaw = Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2;
        if (stone) props.townHouse({ x, z, yaw, width: 9, depth: 8, storeys: 2, damaged: 0.05 });
        else props.house({ x, z, yaw, width: 8 + props.rand() * 2, depth: 6 });
        k++;
      }
      const s = p.z > mid(p.x) ? 1 : -1;
      for (const dx of [-24, 24]) {
        const x = p.x + dx, z = p.z - 26 * s;
        if (!skip(x, z)) props.hall({ x, z, yaw: 0, width: 18, depth: 9, height: 5, color: stone ? 0x8a7a64 : 0x6a5a48, name: 'riverside warehouse' });
      }
    }
    // ---- the railway: Darnitsa yards (north), Kiev station (south), sidings and wagons the same each side
    for (let z = -560; z < 560; z += 20) props.rails({ x0: RAIL_X, z0: z, x1: RAIL_X, z1: z + 20 });
    for (const s of [points[3], points[9]]) {
      const north = s.z > 0, k = north ? 1 : -1;
      for (const dx of [7, 14]) for (let z = s.z - 80; z < s.z + 80; z += 20) props.rails({ x0: RAIL_X + dx, z0: z, x1: RAIL_X + dx, z1: z + 20 });
      props.hall({ x: RAIL_X - 18, z: s.z, yaw: Math.PI / 2, width: north ? 26 : 30, depth: 10, height: north ? 7 : 6.5, color: north ? 0x7a5a46 : 0xc8b480, name: north ? 'engine shed' : 'railway station' });
      props.hall({ x: RAIL_X - 18, z: s.z + 44 * k, yaw: Math.PI / 2, width: 20, depth: 9, height: 5, color: 0x6e5a48, name: 'goods shed' });
      props.rand = mulberry32(1918 + k);
      for (const [dx, dz, kind] of [[0, 40, 'box'], [7, -30, 'box'], [7, -16, 'tank'], [14, 10, 'box'], [14, 24, 'open'], [14, -48, 'box'], [0, -56, 'box'], [7, 54, 'box']] as const) {
        props.wagon({ x: RAIL_X + dx, z: s.z + dz * k, yaw: 0, kind, color: [0x5a3426, 0x4e3a2a, 0x3e3a34][Math.floor(props.rand() * 3)] });
      }
    }
    // ---- Trukhaniv Island: boat sheds, a landing stage's timber
    props.rand = mulberry32(1918_4);
    for (const [x, dz] of [[-60, 8], [52, -6], [-24, -14]]) props.house({ x, z: mid(x) + dz, yaw: 0, width: 8, depth: 5 });
    props.logPile({ x: 30, z: mid(30) + 12, yaw: 0.2, length: 7 });
    props.crates({ x: -36, z: mid(-36) + 14, yaw: 0.5 });

    // ---- barricades: carts, doors and logs across the streets round the towns, the same number each side
    for (const t of TOWNS) {
      props.rand = mulberry32(1918_5 + Math.round(t.z));
      for (let i = 0, k = 0; k < 9 && i < 300; i++) {
        const a = props.rand() * Math.PI * 2, d = 26 + props.rand() * 40, x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
        if (skip(x, z) || roadD(x, z) < 10) continue;
        props.logBarricade({ x, z, yaw: a + Math.PI / 2, length: 5 + props.rand() * 3 });
        k++;
      }
    }
    // the farms on the far fields
    for (const p of points) if ('DJ'.includes(p.id)) farmVillage(props, p.x - 70, p.z, 4, 1918 * 10 + Math.round(p.z * 7), skip, 1.1);
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    for (let tries = 0, n = 0; n < 90 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x, z - mid(x)) < 140 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z) || bluffFace(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    // ---- the ice breaking up: floes drifting down both arms (none at the bridges)
    props.rand = mulberry32(1918_6);
    for (let i = 0, n = 0; n < 140 && i < 2000; i++) {
      const x = (props.rand() * 2 - 1) * 560, arm = props.rand() < 0.5 ? armN : armS, z = arm(x) + (props.rand() * 2 - 1) * (HW - 5);
      if ([-SIDE_X, 0, SIDE_X + 2].some((bx) => Math.abs(x - bx) < 16) || terrain.heightAt(x, z) > -0.4) continue;
      const s = 1.5 + props.rand() * 4.5;
      props.box('plain', x, 0.04, z, s, 0.16, s * (0.5 + props.rand() * 0.6), props.rand() * Math.PI, 0xdfe6ea);
      n++;
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);
    // the Dnieper in thaw: grey, cold water
    for (const o of scene.children) {
      const mat = (o as any).material;
      if (mat?.userData?.waterSurface && !mat.userData.thaw) { mat.color?.lerp(new THREE.Color(0x8a9496), 0.5); mat.userData.thaw = true; }
    }

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) || yardD(x, z) < 5 || inLavra(x, z, 6) || holy.some((c) => Math.hypot(c.x - x, c.z - z) < c.r * 0.8) }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
    const tN = 0.15, tP = evenThreshold(wood, tN, (x, z) => z > mid(x));
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3000, hedges: 900, autumn: 1, broadleaf: 0.7,
      forest: (x: number, z: number) => {
        if (wet(x, z, 3)) return -1;
        if (trenchBand(x, z) || padK(x, z) > 0) return 0.03;
        if (TOWNS.some((t) => Math.hypot(x - t.x, z - t.z) < t.r + 20)) return 0.04;
        if (bluffFace(x, z) && Math.abs(x + SIDE_X) > 14) return 0.8;                           // the wooded bluffs (the road cut down to the chain bridge kept clear)
        if (away(x, z) < 45) return 0.2;                                                     // willows along the banks and on the island
        return Math.abs(x) > 470 || wood(x, z) > (z > mid(x) ? tN : tP) ? 0.8 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
