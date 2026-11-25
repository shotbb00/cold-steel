// The North Downs below Canterbury (1945 epoch, a battle that never was; the big field, 1.0 × 1.12 km): Operation Sea
// Lion carried inland. The Germans are ashore between Folkestone and Hythe and have come up over the downs toward
// Canterbury; the British 21st Army Group stands on the GHQ Line’s stop line along the Great Stour where the river cuts
// its gap through the chalk between Wye, Chilham and Chartham. The British hold the Canterbury side (+z, the cathedral’s
// Bell Harry tower on the skyline behind them), the Germans come from the coast side (-z). Across the middle runs the
// Stour in its water meadows, with three bridges: Chilham bridge under the castle on the west flank (-x), Shalmsford
// Bridge with its mill in the middle, Wye bridge on the east flank (+x). Along both banks the stop line’s hexagonal
// pillboxes and rows of anti-tank cubes at every bridgehead (the south bank’s were the forward line, overrun in the
// first rush and now German). On the British side: Harbledown on the Pilgrims’ Way, the Iron Age ramparts of Bigbury
// Camp in their woods, Chartham Hatch among its hop gardens and oast houses, Chartham with the paper mill’s halls and
// chimney under Chartham Downs, Chilham’s Norman keep and Jacobean house on their spur over the river. On the German
// side: Wye under the Wye Downs with the chalk crown cut in the scarp and the college by the church, Crundale’s church
// alone on its down, Godmersham with its church and park, Boughton Aluph among the oasts, King’s Wood’s beeches, and
// Hastingleigh up on the downs toward the coast. Flint villages and churches, beech hangers on the chalk scarps.
// (Compressed: the Stour really runs south-west to north-east, Wye upstream, Canterbury downstream; here it runs across.)
// Fair, not mirrored: the Stour crosses the middle of the field at Shalmsford, so the bridge’s point straddles both
// banks alike; each side has one flank bridge with a forward point on its own bank beside it (Chilham on its spur in the west
// for the British, Wye under its down in the east for the Germans), a high down over that flank (Chilham’s spur and
// Crundale’s down in the west, Chartham Downs and the Wye Downs in the east — the same heights at the same distance from
// the water), one big wood (Bigbury’s woods / King’s Wood), a village of hop gardens and oasts in the centre
// (Chartham Hatch / Godmersham), the same number of pillboxes and cube rows on its bank, a down behind its line, and its
// points at matching distances from its base, though not in mirrored places (measured: tools/map_fairness.py).
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, buildSite, buildVillage } from './common.js';
import { vegetation } from './common2027.js';
import { evenThreshold, segDist } from './greatWarHelpers.ts';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const W = -330, E = 330;   // the flank bridges: Chilham (west), Wye (east)
const noise = createNoise2D(1945_917);

// the Great Stour across the map, wandering in its water meadows (through the middle of the field at Shalmsford)
const stourZ = (x: number) => 14 * Math.sin(x * 0.008) + 4 * Math.sin(x * 0.021);
const river = createRiver({
  paths: [stourZ],
  halfWidth: 11,
  level: 0,
  depth: 2.6,
  valley: 44,
  crossings: [
    { name: 'Chilham bridge', x: W, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Shalmsford Bridge', x: 0, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Wye bridge', x: E, kind: 'bridge', width: 9, channel: 0 },
  ],
});
const away = (x: number, z: number) => Math.abs(z - stourZ(x));

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Harbledown', 0, 470, 'centre'),
  P('B', 'Bigbury Camp', -370, 320, 'west'),
  P('C', 'Chartham Hatch', 100, 300, 'centre', { radius: 26 }),
  P('D', 'Chartham', 360, 300, 'east', { radius: 26 }),
  P('E', 'Chilham', -390, 70, 'west', { radius: 26 }),
  P('F', 'Shalmsford Bridge', 0, stourZ(0), 'centre', { radius: 30 }),
  P('G', 'Wye', 435, -135, 'east', { radius: 26 }),
  P('H', 'Crundale', -300, -200, 'west'),
  P('I', 'Godmersham', -40, -260, 'centre', { radius: 26 }),
  P('J', 'Boughton Aluph', 390, -390, 'east'),
  P('K', 'Hastingleigh', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };
const over = (x: number) => [[x, stourZ(x) + 45], [x, stourZ(x) - 45]];   // a road straight over its bridge

/** The roads: the Chilham road up the west flank, the Stone Street–Canterbury road over Shalmsford Bridge, the Wye road
 *  up the east flank, the Pilgrims’ Way and the valley lanes across. */
const ROADS = [
  [[W, 640], [W, 520], [-345, 420], at('B'), [-360, 200], at('E'), ...over(W), at('H'), [-320, -360], [W, -520], [W, -640]],
  [[0, 640], at('A'), [40, 390], at('C'), [40, 180], [0, 110], ...over(0), [-20, -150], at('I'), [-30, -400], at('K'), [0, -640]],
  [[E, 640], [E, 520], [345, 410], at('D'), [345, 200], ...over(E), at('G'), [365, -230], at('J'), [E, -520], [E, -640]],
  [at('B'), [-150, 270], at('C'), [220, 320], at('D')],                                  // the Pilgrims’ Way
  [at('E'), [-220, 120], [-90, 125], [0, stourZ(0) + 45]],                               // the north bank lane
  [[0, stourZ(0) - 45], [120, -60], [260, -95], at('G')],                                // the south bank lane
  [at('H'), [-180, -250], at('I'), [130, -320], at('J')],
];
const roadD = gridCacheSmooth((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);

/** The chalk downs [x, z, r, h], flat-topped with steep scarps: Chilham’s spur and Crundale’s down over the west flank,
 *  Chartham Downs and the Wye Downs over the east, the downs behind each line, Bigbury’s low hill. */
const DOWNS = [[-395, 95, 85, 11], [-300, -195, 85, 9.5], [430, 215, 90, 8.5], [430, -215, 90, 8.5], [-230, 480, 130, 8], [230, -440, 120, 8], [-380, 320, 70, 4], [-40, -250, 80, 3], [110, 280, 80, 3]];
const downK = (x: number, z: number) => { let k = 0; for (const [hx, hz, r] of DOWNS) k = Math.max(k, smoothstep(r, r * 0.5, Math.hypot(x - hx, z - hz))); return k; };
/** The two big woods: Bigbury’s woods round the camp (British, west), King’s Wood’s beeches (German, centre-east). */
const WOODS = [{ x: -380, z: 330, r: 125 }, { x: 250, z: -205, r: 115 }];
const bigWood = (x: number, z: number) => WOODS.some((w) => Math.hypot(x - w.x, z - w.z) < w.r);
/** The hop gardens [x, z, w, d], three a side, by the centre villages. */
const HOPS = [[170, 360, 44, 32], [-60, 340, 40, 30], [200, 230, 40, 30], [-150, -300, 44, 32], [60, -330, 40, 30], [-160, -215, 40, 28]];
const inHops = (x: number, z: number, m = 0) => HOPS.some(([hx, hz, w, d]) => Math.abs(x - hx) < w / 2 + m && Math.abs(z - hz) < d / 2 + m);

/** Each side’s flat field for its airstrip on the downs behind its line. */
const FIELDS = [{ x: -180, z0: 385, z1: 485 }, { x: -180, z0: -485, z1: -385 }];
const fieldK = (x: number, z: number) => {
  const f = FIELDS[z > 0 ? 0 : 1];
  return smoothstep(175, 150, Math.abs(x - f.x)) * smoothstep(f.z0 - 30, f.z0, z) * smoothstep(f.z1 + 30, f.z1, z);
};

function height(x: number, z: number) {
  let h = 4 + fbm(noise, x * 0.0035, z * 0.0035, 4) * 3.2 + fbm(noise, x * 0.02 + 9, z * 0.02, 2) * 0.6;
  h += smoothstep(45, 300, away(x, z)) * 7;                                               // the valley sides up toward the downs
  for (const [hx, hz, r, hh] of DOWNS) { const d = Math.hypot(x - hx, z - hz); if (d < r) h += hh * smoothstep(r, r * 0.5, d); }
  h += smoothstep(BASE_Z - 60, 660, Math.abs(z)) * 8;
  h += smoothstep(480, 620, Math.abs(x)) * 10;
  h += (9 - h) * fieldK(x, z);                                                             // the airstrip fields
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 5 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

/** The chalk crown cut in the Wye Downs’ scarp in 1902 (a band and three points), facing the valley. */
const CROWN = { x: 508, z: -200 };
const inCrown = (x: number, z: number) => {
  const u = x - CROWN.x, v = CROWN.z - z;   // v up the slope
  if (Math.abs(u) > 24 || v < -3 || v > 16) return false;
  if (v < 3) return Math.abs(u) < 20;
  return [-16, 0, 16].some((s) => Math.abs(u - s) < (16 - v) * 0.45);
};

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Platoon' }];

export default {
  id: 'kent',
  name: 'The North Downs',
  description: 'The invasion of England that never came: the Germans have come up from the Kent coast and meet the GHQ Line’s stop line on the Great Stour below Canterbury. Chalk downs with beech hangers, the Stour’s three bridges, hop gardens and oast houses, flint villages and churches, pillboxes and anti-tank cubes.',
  epochs: ['1945'],
  region: 'europe',
  sides: { nato: 'Britain', pact: 'Germany' },
  armies: { nato: ['brit21'], pact: ['wh', 'fj'] }, // (the home army on the stop line against the Wehrmacht and the Fallschirmjäger dropped ahead of it)
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1945_917,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1945_917, cell: 64 }),

  theme: {
    // a soft late-summer day over the Weald’s edge, high cumulus
    fogColor: 0xb4bcb8, fogDensity: 0.0015, skyTop: 0x5a7ea4, skyHorizon: 0xc6ccc8, skyBottom: 0x7a7e72,
    sunColor: 0xf6ecd4, sunIntensity: 1.95, sunDisk: 0.3, clouds: 0.55, cloudLight: 0xeeeeea, cloudDark: 0x868c94,
    sunDir: [0.4, 0.62, 0.55], hemiSky: 0xc6d0d8, hemiGround: 0x4e4c36, hemiIntensity: 1.3, rimColor: 0xc0c8ce, rimIntensity: 0.22,
    terrain: {
      grass: '#56693a', grassAlt: '#4b5c33', dryGrass: '#88805a', dirt: '#6a5c48', rock: '#a4a284', strip: '#4e4434',
      pasture: '#5a6d3c', ploughed: '#6e604c', stubble: '#9a8e60', meadow: '#5e7242',
      farmX: [460, 600], farmZ: [540, 660], roads: [W, 0, E], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (roadD(x, z) < 3.2) return [0x6c6862, 0.9];                                      // the lanes’ tarmac
        if (inCrown(x, z)) return [0xe6e2d6, 0.95];                                        // the Wye crown
        if (inHops(x, z)) return [0x5e5040, 0.7];                                          // the hop gardens’ bare earth
        const k = downK(x, z);
        if (k > 0.2 && k < 0.8 && fbm(noise, x * 0.03 + 40, z * 0.03, 2) > 0.1) return [0xb8b49c, 0.45]; // chalk showing on the scarps
        if (y < 1.6 && away(x, z) < 30) return [0x5e7444, 0.6];                            // the water meadows
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [W, 0, E] }, pact: { x: 0, z: -BASE_Z, entries: [W, 0, E] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const crossingNear = (x: number, z: number, r: number) => river.crossings.some((c: any) => Math.hypot(x - c.x, z - c.z) < r);
    const skip = (x: number, z: number) => fieldK(x, z) > 0.01 || away(x, z) < 26 || roadD(x, z) < 8 || crossingNear(x, z, 30);
    const placed: number[][] = [];
    const free = (x: number, z: number, r: number) => !skip(x, z) && placed.every(([qx, qz, qr]) => Math.hypot(qx - x, qz - z) > qr + r);
    const quarter = (x0: number, x1: number, z0: number, z1: number, seed: number, keep: number, clear = 18) => {
      const r = mulberry32(seed);
      for (let gx = x0; gx <= x1; gx += 17) for (let gz = z0; gz <= z1; gz += 17) {
        const x = gx + (r() - 0.5) * 3, z = gz + (r() - 0.5) * 3;
        if (r() > keep || !free(x, z, 7) || nearPoint(x, z, clear) || inHops(x, z, 6)) continue;
        placed.push([x, z, 7]);
        props.townHouse({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 4, depth: 8, storeys: 2, damaged: 0.15 });
      }
    };
    const solid = (x: number, z: number, sx: number, sy: number, sz: number, color: number, y0 = terrain.heightAt(x, z) - 0.5, yaw = 0) => {
      props.box('stone', x, y0 + sy / 2, z, sx, sy, sz, yaw, color);
      cover.addBox({ x, z, yaw, length: sx, thickness: sz, height: sy });
    };
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
    const cone = (x: number, z: number, y: number, r: number, h: number, color: number, sides = 4, key = 'stone') => {
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
      props.push(key, new THREE.ConeGeometry(r, h, sides), _m.compose(new THREE.Vector3(x, y + h / 2, z), _q, _s), color);
    };
    const drum = (x: number, z: number, r: number, h: number, color: number, sides = 14) => {
      const g = terrain.heightAt(x, z) - 0.6;
      _q.identity();
      props.push('stone', new THREE.CylinderGeometry(r, r * 1.04, h, sides), _m.compose(new THREE.Vector3(x, g + h / 2, z), _q, _s), color);
      cover.addBox({ x, z, yaw: 0, length: r * 1.6, thickness: r * 1.6, height: h });
      return g + h;
    };
    /** An oast house: the round brick kiln with its conical roof and white cowl, the stowage barn beside it. */
    const oast = (x0: number, z0: number, yaw: number, kilns = 1) => {
      let ks: number[][] = [], bx = 0, bz = 0, ok = false;
      for (let d = 0; d <= 48 && !ok; d += 8) for (let a = 0; a < 8 && !ok; a++) {   // the first free spot near the asked one
        const x = x0 + Math.cos(a * Math.PI / 4) * d, z = z0 + Math.sin(a * Math.PI / 4) * d;
        ks = []; for (let i = 0; i < kilns; i++) ks.push(PropBuilder.local(x, z, yaw, -4 - i * 7.5, 0));
        [bx, bz] = PropBuilder.local(x, z, yaw, 6, 0);
        ok = free(bx, bz, 7) && ks.every(([kx, kz]) => free(kx, kz, 4)) && !nearPoint(x, z, 20);
      }
      if (!ok) return;
      props.townHouse({ x: bx, z: bz, yaw, width: 12, depth: 7, storeys: 2, damaged: 0.1, name: 'oast barn' });
      for (const [kx, kz] of ks) {
        const top = drum(kx, kz, 3.2, 7.5, 0x8e4e38);
        cone(kx, kz, top - 0.1, 3.6, 5, 0x5e3a2c, 14, 'plain');
        cone(kx, kz, top + 4.6, 0.9, 1.8, 0xe8e4da, 6, 'plain');               // the white cowl
        placed.push([kx, kz, 4]);
      }
      placed.push([bx, bz, 7]);
    };
    /** A hop garden: poles in rows, the wire along the top, the bines up their strings. */
    const hopGarden = ([cx, cz, w, d]: number[]) => {
      for (let lz = -d / 2; lz <= d / 2; lz += 4) {
        for (let lx = -w / 2; lx <= w / 2; lx += 4) {
          const x = cx + lx, z = cz + lz;
          if (skip(x, z)) continue;
          const g = terrain.heightAt(x, z);
          props.box('plain', x, g + 2.6, z, 0.16, 5.6, 0.16, 0, 0x6a5a44);
          if (lx + 4 <= w / 2 && !skip(x + 4, z)) {
            const g2 = terrain.heightAt(x + 4, z), gm = Math.min(g, g2);
            props.box('plain', x + 2, gm + 2.4, z, 2.6, 3.8, 0.45, 0, 0x4e6a30);  // the bines
            props.box('metal', x + 2, (g + g2) / 2 + 5.3, z, 4, 0.04, 0.04, 0, 0x2a2a28);
          }
        }
      }
      placed.push([cx, cz, Math.max(w, d) / 2]);
    };
    /** A Type 24 pillbox: six concrete sides, a slab roof, a dark loophole band. */
    const pillbox = (x: number, z: number, yaw: number) => {
      const g = terrain.heightAt(x, z) - 0.4;
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      props.push('stone', new THREE.CylinderGeometry(2.7, 2.8, 2.3, 6), _m.compose(new THREE.Vector3(x, g + 1.15, z), _q, _s), 0x9c988c);
      props.push('metal', new THREE.CylinderGeometry(2.72, 2.72, 0.32, 6), _m.compose(new THREE.Vector3(x, g + 1.55, z), _q, _s), 0x1e1e1c);
      props.push('stone', new THREE.CylinderGeometry(3.0, 3.0, 0.35, 6), _m.compose(new THREE.Vector3(x, g + 2.45, z), _q, _s), 0x8e8a80);
      cover.addBox({ x, z, yaw, length: 4.6, thickness: 4.6, height: 2.5 });
      placed.push([x, z, 5]);
    };
    /** A row of anti-tank cubes from x0 to x1 at the bank offset. */
    const cubes = (x0: number, x1: number, side: number) => {
      for (let x = x0; x <= x1; x += 2.2) {
        const z = stourZ(x) + side * 22, g = terrain.heightAt(x, z);
        if (roadD(x, z) < 6) continue;
        props.box('stone', x, g + 0.45, z, 1.3, 1.5, 1.3, 0.1 * Math.sin(x), 0xa6a294);
        cover.addBox({ x, z, yaw: 0, length: 1.6, thickness: 1.4, height: 1.2 });
      }
    };
    const church = (x: number, z: number, yaw: number) => { if (free(x, z, 13)) { props.church({ x, z, yaw }); placed.push([x, z, 13]); } };

    // ---- the stop line: pillboxes along both banks, cube rows at every bridgehead (the same on each bank)
    props.rand = mulberry32(1945_918);
    for (const side of [1, -1]) {
      for (const x of [-440, -250, -140, 140, 250, 440]) pillbox(x, stourZ(x) + side * 32, side > 0 ? Math.PI : 0);
      for (const bx of [W, 0, E]) {
        pillbox(bx - 24, stourZ(bx - 24) + side * 34, 0); pillbox(bx + 24, stourZ(bx + 24) + side * 34, 0);
        cubes(bx - 44, bx - 8, side); cubes(bx + 8, bx + 44, side);
      }
    }
    // ---- Shalmsford: the mill and the mill house at the bridge, one each bank
    props.hall({ x: 34, z: stourZ(34) + 30, yaw: 0, width: 16, depth: 10, height: 8, color: 0x8a6a56, door: 4, name: 'Shalmsford mill' }); placed.push([34, stourZ(34) + 30, 11]);
    props.townHouse({ x: -34, z: stourZ(-34) - 30, yaw: 0, width: 12, depth: 9, storeys: 2, name: 'mill house', damaged: 0.15 }); placed.push([-34, stourZ(-34) - 30, 9]);
    // ---- Chilham: the Norman keep and the Jacobean house on the spur, the square’s houses round them
    {
      const [ex, ez] = at('E');
      const top = drum(ex - 30, ez + 8, 5.2, 13, 0x9a9282, 8);
      props.box('stone', ex - 30, top + 0.6, ez + 8, 7.4, 1.2, 7.4, Math.PI / 8, 0x8e8676);
      placed.push([ex - 30, ez + 8, 7]);
      props.hall({ x: ex + 8, z: ez + 34, yaw: 0, width: 30, depth: 12, height: 9, color: 0x9a5a44, roof: 0x4a3c36, door: 4, name: 'Chilham Castle' });
      placed.push([ex + 8, ez + 34, 17]);
      church(ex + 36, ez - 18, Math.PI / 2);
      quarter(ex - 60, ex + 60, ez - 60, ez + 10, 1945_919, 0.45, 22);
    }
    // ---- Wye: the college and the church, the village round them; the paper mill at Chartham across the field
    {
      const [gx, gz] = at('G');
      props.hall({ x: gx - 40, z: gz + 28, yaw: 0, width: 28, depth: 12, height: 8, color: 0x8e8070, roof: 0x4a4440, door: 4, name: 'Wye College' });
      placed.push([gx - 40, gz + 28, 16]);
      church(gx + 30, gz + 30, 0);
      quarter(gx - 60, gx + 50, gz - 50, gz + 10, 1945_920, 0.45, 22);
      const [dx, dz] = at('D');
      for (const [x, z, w] of [[dx - 45, dz - 30, 28], [dx - 40, dz + 25, 22]]) if (free(x, z, w / 2 + 2)) { props.hall({ x, z, yaw: 0, width: w, depth: 12, height: 8, color: 0x7e6a5a, name: 'Chartham paper mill' }); placed.push([x, z, w / 2 + 3]); }
      if (free(dx - 70, dz, 4)) { props.chimney({ x: dx - 70, z: dz, height: 30 }); placed.push([dx - 70, dz, 4]); }
      church(dx + 34, dz + 26, 0);
      quarter(dx - 20, dx + 60, dz - 60, dz + 10, 1945_921, 0.45, 22);
    }
    // ---- Godmersham: the church, the park’s house; Chartham Hatch’s cottages; Crundale’s church alone on its down
    {
      const [ix, iz] = at('I');
      church(ix + 34, iz + 22, 0);
      props.townHouse({ x: ix - 10, z: iz - 46, yaw: 0, width: 26, depth: 12, storeys: 3, name: 'Godmersham Park', damaged: 0.1 }); placed.push([ix - 10, iz - 46, 15]);
      quarter(ix - 60, ix + 60, iz - 20, iz + 50, 1945_922, 0.45, 24);
      const [cx, cz] = at('C');
      church(cx - 34, cz - 24, 0);
      quarter(cx - 60, cx + 60, cz - 50, cz + 20, 1945_923, 0.45, 24);
      const [hx, hz] = at('H');
      church(hx + 22, hz - 26, Math.PI / 2);
      const [jx, jz] = at('J');
      church(jx - 30, jz + 26, 0);
    }
    // ---- hop gardens and oast houses, three gardens and five kilns a side
    HOPS.forEach(hopGarden);
    for (const [x, z, yaw, n] of [[60, 380, 0, 2], [250, 300, Math.PI / 2, 1], [-120, 270, 0, 2], [-60, -380, 0, 2], [180, -300, Math.PI / 2, 1], [-230, -280, 0, 2]]) oast(x, z, yaw, n);
    // ---- Bigbury Camp’s ramparts in the woods
    {
      const [bx, bz] = at('B');
      for (let a = 0; a < Math.PI * 2; a += 0.26) {
        const x = bx + Math.cos(a) * 46, z = bz + Math.sin(a) * 40;
        if (roadD(x, z) < 6) continue;
        props.lowWall({ x, z, yaw: -a, length: 11, height: 1.3, color: 0x5e5a40 });
      }
    }
    // ---- the villages at the homes; Canterbury Cathedral’s Bell Harry tower on the skyline behind the British
    for (const p of points) if ('AK'.includes(p.id)) buildVillage(props, p, 1945_930 + Math.round(p.x * 3 + p.z * 7), 1);
    {
      const x = 170, z = 690, g = terrain.heightAt(x, z) - 1;
      props.box('stone', x - 40, g + 14, z, 80, 28, 22, 0, 0xb0a890);                      // the nave
      props.box('stone', x, g + 38, z, 14, 76, 14, 0, 0xb4ac94);                           // Bell Harry
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cone(x + sx * 6, z + sz * 6, g + 76, 1.2, 8, 0xb4ac94);
      props.box('stone', x - 82, g + 28, z, 12, 56, 26, 0, 0xb0a890);                      // the west towers
    }

    // ---- farmsteads, field walls, hay and wrecks over the fields, each half its own dice
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay', 'wrecks', 'roadblock'];
    for (const side of [1, -1]) {
      for (let tries = 0, n = 0; n < 55 && tries < 6000; tries++) {
        const x = (rand() * 2 - 1) * (bounds.x - 20), z = side * (60 + rand() * (bounds.z - 90));
        if (Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 45) || !free(x, z, 12) || bigWood(x, z) || inHops(x, z, 10)) continue;
        placed.push([x, z, 12]);
        buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
      }
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...river.crossings.map((c: any) => ({ x: c.x, z: c.z, r: river.halfWidth + 16 })),
      ...placed.map(([x, z, r]) => ({ x, z, r: r + 2 })),
      { test: (x: number, z: number) => away(x, z) < 16 || roadD(x, z) < 6 || fieldK(x, z) > 0.01 || inHops(x, z, 3) || inCrown(x, z) }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.006 + 70, z * 0.006, 3);
    const tN = 0.16, tP = evenThreshold(wood, tN, (x, z) => z > 0);   // (each half its own copses, the same in area)
    const village = (x: number, z: number) => points.some((p) => 'CDEGI'.includes(p.id) && Math.hypot(x - p.x, z - p.z) < 75);
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4200, hedges: 1400, autumn: 0.12, broadleaf: 0.85,
      forest: (x: number, z: number) => {
        if (away(x, z) < 16) return -1;
        if (village(x, z)) return 0.04;                                                    // gardens and orchards
        if (bigWood(x, z)) return wood(x + 300, z) > -0.25 ? 0.88 : 0.05;                  // Bigbury’s woods, King’s Wood
        const k = downK(x, z);
        if (k > 0.25 && k < 0.75) return wood(x - 200, z) > -0.05 ? 0.8 : 0.02;           // the beech hangers on the scarps
        if (away(x, z) < 50) return wood(x, z + 90) > 0.1 ? 0.5 : 0.02;                    // willows and alders along the Stour
        return x < -480 || x > 480 || wood(x, z) > (z > 0 ? tN : tP) ? 0.85 : 0;
      },
      noHedge: (x: number, z: number) => village(x, z) || bigWood(x, z) || inHops(x, z, 4),
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
