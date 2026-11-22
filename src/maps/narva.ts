// Narva, early March 1918: the far end of Operation Faustschlag. After Pskov the German Eighth Army and the Northern
// Corps pushed up the Baltic railway toward Petrograd; on 4 March they reached Narva, the furthest their advance came
// on that road, and met Red Guards from Petrograd, Red Estonian detachments and Latvian riflemen east of the river
// before the Brest-Litovsk peace (3 March) froze the line. Late winter: snow on the fields and in the pine woods, the
// Narva running black between frozen edges, the falls roaring round the Kreenholm island and its red-brick textile
// mills, Hermann Castle with its tall white tower on the west bank and Ivangorod’s grey walls and towers straight
// across the water on the east, Narva’s baroque old town behind the castle, Ivangorod’s wooden houses round its
// fortress, the railway bridge to Petrograd downstream, and only the scrapes and rifle pits of a few days’ war:
// no deep trench system.
// Not mirrored but fair: the river runs between the sides (Germans on the Narva bank, south; Reds on the Ivangorod
// bank, north). Each side holds a walled fortress on its own high bank at the same reach from the town bridge between
// them (Hermann Castle, Ivangorod) — the natural answer to each other — and neither starts on the decisive ground:
// the town bridge (F), the railway bridge (E) and the Kreenholm island (G, two dam bridges, one from each bank) are
// all in the middle. Each side has a railway station on its western flank (Narva, Ivangorod), a mill quarter on its
// eastern flank by the falls (Joala, Parusinka), its town round its fortress, the same low rise behind its centre and
// pine woods of the same area.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const HW = 17;                                              // the Narva (each arm round Kreenholm)
const RAIL_X = -SIDE_X - 6;                                 // the Baltic railway to Petrograd, beside the western road
const RAIL_BRIDGE = -SIDE_X - 3;
const KX = 330;                                             // the Kreenholm island and the falls
const FALLS_X = KX - 62;
const noise = createNoise2D(1918_03);
const mid = (x: number) => 10 * Math.sin(x * 0.005 + 0.6) + 6 * Math.sin(x * 0.015 + 1) - 3;
const split = (x: number) => 62 * Math.exp(-(((x - KX) / 105) ** 2));                // the two arms round the island
const armN = (x: number) => mid(x) + split(x), armS = (x: number) => mid(x) - split(x);
const river = createRiver({
  path: armN, paths: [armN, armS], halfWidth: HW, level: 0, depth: 2.6, valley: 60,
  crossings: [
    { name: 'Railway bridge', x: RAIL_BRIDGE, kind: 'bridge', width: 13 },
    { name: 'Narva town bridge', x: 0, kind: 'bridge', width: 7 },
    { name: 'Kreenholm dam (Ivangorod arm)', x: KX, kind: 'bridge', width: 6, channel: 0 },
    { name: 'Kreenholm dam (Narva arm)', x: KX, kind: 'bridge', width: 6, channel: 1 },
  ],
});
/** m from the nearer arm's middle. */
const away = (x: number, z: number) => Math.min(Math.abs(z - armN(x)), Math.abs(z - armS(x)));
/** Each side's lateral road behind the river, and the roads from the crossings to the bases. */
const bankZ = (x: number, north: boolean) => (north ? mid(x) + 175 + 8 * Math.sin(x * 0.011) : mid(x) - 172 + 9 * Math.sin(x * 0.008 + 2));
const ROAD_X = [RAIL_BRIDGE + 3, 0, KX];
const roadD = gridCache((x: number, z: number) => {
  let d = Math.abs(z - bankZ(x, z > mid(x)));
  for (const bx of ROAD_X) d = Math.min(d, Math.abs(x - bx));
  return d;
}, { x: 700, z: 760 }, 1);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
/** The hasty positions: a line of scrapes and rifle pits each side, dug into the snow a day or two before. */
const trenchZ = (x: number, north: boolean) => (north ? mid(x) + split(x) * 0.6 + 128 + 9 * Math.sin(x * 0.017) : mid(x) - split(x) * 0.6 - 128 - 10 * Math.sin(x * 0.013 + 2));

// the fortresses, each on its own high bank at the same reach from the town bridge
const IVAN = { x: 74, z: mid(74) + 74 };                   // Ivangorod (east bank: north here)
const HERMANN = { x: -100, z: mid(-100) - 66 };              // Hermann Castle (west bank: south here)
/** Ivangorod's wall: a long irregular ring of curtain wall on its hill. */
const IVAN_WALL = [[-46, -26], [-14, -36], [36, -32], [50, -6], [42, 30], [-6, 38], [-44, 24]].map(([x, z]) => [IVAN.x + x, IVAN.z + z]);
const IVAN_GATES = [[IVAN.x - 45, IVAN.z], [IVAN.x + 20, IVAN.z + 34]];
/** Hermann Castle: the square convent, its outer bailey toward the old town. */
const HERM_WALL = [[-36, -34], [36, -34], [38, 30], [-36, 32]].map(([x, z]) => [HERMANN.x + x, HERMANN.z + z]);
const HERM_GATES = [[HERMANN.x + 37, HERMANN.z], [HERMANN.x - 10, HERMANN.z - 34]];
const inCastle = (x: number, z: number, r = 0) => (Math.abs(x - IVAN.x - 2) < 50 + r && Math.abs(z - IVAN.z) < 38 + r)
  || (Math.abs(x - HERMANN.x) < 38 + r && Math.abs(z - HERMANN.z) < 34 + r);

/** One low rise a side behind its centre point [x, z, r, h], and a gentler swell on each other flank. */
const RISES = [[-170, 330, 150, 5.5], [260, 410, 140, 3.4], [150, -330, 155, 5.6], [-280, -400, 140, 3.3]];
const ground = gridCacheSmooth((x: number, z: number) => {
  const d = away(x, z);
  let h = 1.2 + smoothstep(25, 120, d) * (4.2 + fbm(noise, x * 0.004 + (z > mid(x) ? 0 : 40), z * 0.004, 4) * 3.2);
  h += fbm(noise, x * 0.015 + 9, z * 0.015, 3) * 0.8 * smoothstep(40, 140, d);
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  for (const c of [IVAN, HERMANN]) h += (8.5 - h) * smoothstep(80, 48, Math.hypot(x - c.x, z - c.z));   // each fortress's level yard on the bluff
  h += smoothstep(BASE_Z - 70 + 40 * Math.sin(x * 0.008 + 1), 640, Math.abs(z)) * 8 + smoothstep(440 + 50 * Math.sin(z * Math.PI / 280), 600, Math.abs(x)) * 12;
  for (const bx of ROAD_X) h += (Math.min(h, 1.3 + d * 0.05) - h) * (1 - smoothstep(5, 18, Math.abs(x - bx))) * (1 - smoothstep(90, 140, d));
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return Math.max(1.4, h);
}, { x: 700, z: 760 }, 3);
const height = (x: number, z: number) => river.carve(x, z, ground(x, z));

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Yamburg road', 0, 470, 'centre'),
  P('B', 'Ivangorod station', -310, 300, 'west'),
  P('C', 'Ivangorod Fortress', IVAN.x, Math.round(IVAN.z), 'centre', { radius: 30 }),
  P('D', 'Parusinka', 250, 300, 'east'),
  P('E', 'Railway bridge', RAIL_BRIDGE + 3, Math.round(mid(RAIL_BRIDGE)), 'west', { radius: 22 }),
  P('F', 'Narva town bridge', 0, Math.round(mid(0)), 'centre', { radius: 24 }),
  P('G', 'Kreenholm', KX + 50, Math.round(mid(KX + 50)), 'east', { radius: 30 }),
  P('H', 'Narva station', -290, -310, 'west'),
  P('I', 'Hermann Castle', HERMANN.x, Math.round(HERMANN.z), 'centre', { radius: 30 }),
  P('J', 'Joala', 340, -330, 'east'),
  P('K', 'Reval road', 0, -470, 'centre'),
] as any[];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'narva',
  name: 'Narva',
  description: 'March 1918, the far end of Operation Faustschlag: the German advance up the Baltic railway reaches Narva and meets Red Guards and Red Estonian detachments across the river on the road to Petrograd. Snow and pine woods, the Narva between frozen edges, the falls round the Kreenholm mills, Hermann Castle facing Ivangorod across the town bridge, the railway bridge, scrapes dug in the snow.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de'] }, // (the Red Guards, Red Estonians and Latvian riflemen fight as the Russian army; the German Northern Corps)
  sides: { nato: 'Russia', pact: 'Germany' },
  climate: 'winter',   // whitewash and snow smocks (render/paint.js CLIMATE)
  conditions: { time: 'day', weather: 'overcast' }, // (grey early-March days, the snow still lying)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1918_03,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191803, cell: 80, weights: [0.3, 0.35, 0.1, 0.25] as any }),

  theme: {
    // low grey cloud over the snow
    fogColor: 0xbec2c8, fogDensity: 0.0018, skyTop: 0x848a94, skyHorizon: 0xc6cad0, skyBottom: 0x888c92,
    sunColor: 0xe2e6ec, sunIntensity: 1.25, sunDisk: 0.04, clouds: 0.95, cloudLight: 0xcaced2, cloudDark: 0x80868e,
    sunDir: [0.4, 0.4, 0.7], hemiSky: 0xd2d8e0, hemiGround: 0x8c9096, hemiIntensity: 1.45, rimColor: 0xc0c8d2, rimIntensity: 0.2,
    terrain: {
      grass: '#eceeee', grassAlt: '#e0e4e6', dryGrass: '#d6d4cc', dirt: '#9a948a', rock: '#b6b8b6', strip: '#8a847a',
      pasture: '#e8ebeb', ploughed: '#d0cec6', stubble: '#dcd8ce', meadow: '#f0f2f2',
      farmX: [460, 600], farmZ: [520, 640], roads: ROAD_X, roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x8e8a82, 0.85];                                     // the roads: snow trodden to slush
        if (Math.abs(x - RAIL_X) < 2.5) return [0x6e6a64, 0.7];                          // the railway's cinder bed
        if (y < 1.6 && away(x, z) < HW + 10) return [0xd6dde2, 0.8];                    // snow drifted on the banks
        if (inCastle(x, z, -3)) return [0xc4c0b8, 0.5];                                 // the fortress yards, trodden
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
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
        if (roadD(w.x, w.z) < 8 || Math.abs(w.x - RAIL_X) < 6 || away(w.x, w.z) < HW + 12 || inCastle(w.x, w.z, 10)) continue;
        const stretch = Math.sin(w.x * s * 0.045) > -0.1;
        if (!stretch || (w.kind === 'wire' && Math.sin(w.x * s * 0.11) < 0.3)) continue;
        works.push(w);
      }
      for (const bx of ROAD_X) works.push({ kind: 'mgNest', x: bx + 15 * s, z: trenchZ(bx + 15 * s, f === 'nato') - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, r = 0) => away(x, z) < HW + 6 + r;
    const trenchBand = (x: number, z: number) => Math.abs(z - trenchZ(x, z > mid(x))) < 26;
    const railD = (x: number) => Math.abs(x - RAIL_X);
    const MILLS: { x: number; z: number; w: number; d: number }[] = [];
    const inMill = (x: number, z: number, r = 0) => MILLS.some((m) => Math.abs(x - m.x) < m.w / 2 + r && Math.abs(z - m.z) < m.d / 2 + r);
    const skip = (x: number, z: number) => wet(x, z, 8) || roadD(x, z) < 8 || trenchBand(x, z) || railD(x) < 9 || inCastle(x, z, 10) || inMill(x, z, 6);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const WHITE = 0xe6e2d8, GOLD = 0xc8a850, SHINGLE = 0x4e4034, LIME = 0xc2bdb0, GREY = 0xa8a49a, BRICK = 0x8a3c2c;

    /** A curtain wall round `poly`, gaps at `gates`, `hh` high. */
    const curtain = (poly: number[][], gates: number[][], hh: number, color: number, cap: number) => {
      for (let i = 0; i < poly.length; i++) {
        const [x0, z0] = poly[i], [x1, z1] = poly[(i + 1) % poly.length];
        const L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(z0 - z1, x1 - x0);
        for (let t = 0; t < L - 1; t += 4) {
          const x = x0 + (x1 - x0) * (t + 2) / L, z = z0 + (z1 - z0) * (t + 2) / L;
          if (gates.some(([gx, gz]) => Math.hypot(x - gx, z - gz) < 5)) continue;
          const g = terrain.heightAt(x, z);
          props.box('plaster', x, g + hh / 2 - 0.6, z, 4.1, hh + 1.2, 2.2, yaw, color);
          props.box('plaster', x, g + hh + 0.5, z, 4.1, 0.9, 0.7, yaw, cap);            // the parapet
          cover.addBox({ x, z, yaw, length: 4.1, thickness: 2.2, height: hh });
        }
      }
    };
    const roundTower = (x: number, z: number, r: number, hh: number, color: number, roof = SHINGLE) => {
      const g = terrain.heightAt(x, z);
      m4.compose(v.set(x, g + hh / 2 - 0.6, z), q.identity(), one); props.push('plaster', new THREE.CylinderGeometry(r, r * 1.1, hh + 1.2, 14), m4, color);
      m4.compose(v.set(x, g + hh + 2.1, z), q.identity(), one); props.push('plain', new THREE.ConeGeometry(r * 1.2, 5.4, 14), m4, roof);
      cover.addCylinder({ x, z, radius: r, height: hh, spots: false });
    };
    const squareTower = (x: number, z: number, s: number, hh: number, color: number, roof = SHINGLE, yaw = 0) => {
      const g = terrain.heightAt(x, z);
      props.box('plaster', x, g + hh / 2 - 0.6, z, s, hh + 1.2, s, yaw, color);
      m4.compose(v.set(x, g + hh + 2, z), q.setFromAxisAngle(v.clone().set(0, 1, 0), yaw + Math.PI / 4), one);
      props.push('plain', new THREE.ConeGeometry(s * 0.75, 4.5, 4), m4, roof);
      q.identity();
      cover.addBox({ x, z, yaw, length: s, thickness: s, height: hh });
    };
    const onion = (x: number, y: number, z: number, r: number, color: number) => {
      m4.compose(v.set(x, y, z), q.identity(), one); props.push('plaster', new THREE.CylinderGeometry(r * 0.75, r * 0.75, r * 1.6, 12), m4, WHITE);
      m4.compose(v.set(x, y + r * 1.6, z), q.identity(), v.clone().set(r, r * 1.2, r)); props.push('plain', new THREE.SphereGeometry(1, 12, 8), m4, color);
      m4.compose(v.set(x, y + r * 3, z), q.identity(), one); props.push('plain', new THREE.ConeGeometry(r * 0.38, r * 1.2, 8), m4, color);
      props.box('metal', x, y + r * 3.9, z, 0.15, 1.6, 0.15, 0, GOLD);
      props.box('metal', x, y + r * 4.1, z, 0.9, 0.12, 0.12, 0, GOLD);
    };

    // ---- Ivangorod: the long grey ring on its hill, round and square towers with shingle caps
    props.rand = mulberry32(1492);
    curtain(IVAN_WALL, IVAN_GATES, 7.5, GREY, 0x9a968c);
    IVAN_WALL.forEach(([x, z], i) => (i % 2 ? squareTower(x, z, 8, 12, GREY) : roundTower(x, z, 4.6, 12, GREY)));
    roundTower(IVAN_GATES[0][0], IVAN_GATES[0][1] + 7, 3.4, 10, GREY); roundTower(IVAN_GATES[0][0], IVAN_GATES[0][1] - 7, 3.4, 10, GREY);   // (the gate towers either side, along the wall)
    roundTower(IVAN_GATES[1][0] - 7, IVAN_GATES[1][1] + 1, 3.4, 10, GREY); roundTower(IVAN_GATES[1][0] + 7, IVAN_GATES[1][1] - 1, 3.4, 10, GREY);
    // inside: the Assumption church with its dome, the old barracks, a powder store
    {
      const x = IVAN.x + 14, z = IVAN.z - 6;
      props.church({ x, z, yaw: Math.PI / 2 });
      onion(x, terrain.heightAt(x, z) + 10, z, 2.2, 0x3e6a8a);
      props.townHouse({ x: IVAN.x - 22, z: IVAN.z + 14, yaw: 0, width: 14, depth: 8, storeys: 2, damaged: 0, name: 'barracks' });
      props.townHouse({ x: IVAN.x - 18, z: IVAN.z - 18, yaw: 0, width: 9, depth: 7, storeys: 1, damaged: 0, name: 'powder store' });
      props.crates({ x: IVAN.x + 30, z: IVAN.z + 18, yaw: 0.3 });
    }

    // ---- Hermann Castle: the square convent house round its court, Tall Hermann at the corner, the bailey wall
    props.rand = mulberry32(1256);
    curtain(HERM_WALL, HERM_GATES, 7, LIME, 0xd0ccc0);
    for (const [x, z] of HERM_WALL) roundTower(x, z, 4.2, 11, LIME);
    {
      const x = HERMANN.x - 10, z = HERMANN.z + 18;                                  // (on the river side of the yard: the point's middle stays open)
      const b = props.beginBuilding('Hermann Castle convent', x, z, 0, 22, 14);
      b.plaster = LIME;
      props.shell(b, { height: 12, key: 'plaster', color: LIME, front: [0], left: [3], t: 0.9, bay: 3.6, sill: 3, head: 7.5, frame: 0xa8a090 });
      props.gableRoof(b, { eave: 12, pitch: 0.55, color: 0x7a3a2a, t: 0.8 });
      props.endBuilding();
      // Tall Hermann: the keep, a white square tower over everything
      const tx = x - 17, tz = z, g = terrain.heightAt(tx, tz);
      props.box('plaster', tx, g + 15, tz, 9, 30, 9, 0, 0xe2ded2);
      props.box('plaster', tx, g + 30.6, tz, 10.4, 1.4, 10.4, 0, 0xcfcabc);          // the machicolated top
      m4.compose(v.set(tx, g + 33.5, tz), q.setFromAxisAngle(v.clone().set(0, 1, 0), Math.PI / 4), one);
      props.push('plain', new THREE.ConeGeometry(6.8, 5, 4), m4, 0x5a4a3a);
      q.identity();
      cover.addBox({ x: tx, z: tz, yaw: 0, length: 9, thickness: 9, height: 30 });
      props.logPile({ x: HERMANN.x + 20, z: HERMANN.z - 20, yaw: 0.2, length: 7 });
    }

    // ---- Kreenholm: the red-brick mill blocks on the island, a chimney; the falls in both arms above them
    props.rand = mulberry32(1857);
    for (const [dx, dz, w, d, hh, yaw] of [[-40, 0, 46, 18, 15, 0], [10, 16, 30, 14, 13, 0], [20, -18, 26, 12, 11, 0]]) {
      const x = KX + dx, z = mid(KX + dx) + dz;
      props.hall({ x, z, yaw, width: w, depth: d, height: hh, color: BRICK, roof: 0x4a4644, door: 6, name: 'Kreenholm mill' });
      MILLS.push({ x, z, w, d });
    }
    props.chimney({ x: KX - 11, z: mid(KX - 11), height: 36 });
    // the falls: a limestone ledge across each arm, white water tumbling over it
    for (const arm of [armN, armS]) {
      const zc = arm(FALLS_X);
      for (let t = -HW + 1; t < HW; t += 2.5) {
        props.box('plain', FALLS_X, -0.4, zc + t, 3.2, 1.6, 2.6, 0, 0x6e6c66);
        props.box('plain', FALLS_X - 2.4, 0.15, zc + t, 2.2, 0.5, 2.4, 0, 0xf2f4f6);
        props.box('plain', FALLS_X - 5.5, 0.06, zc + t + (t % 5) * 0.3, 4, 0.12, 2.4, 0, 0xe4eaee);
      }
    }
    // the mill quarters on each bank: Parusinka's linen mill (Reds), the Joala mill and workers’ barracks (Germans)
    for (const p of [points[3], points[9]]) {
      const s = p.z > 0 ? 1 : -1;
      props.rand = mulberry32(1860 + s);
      const x = p.x + 30, z = p.z - 30 * s;
      props.hall({ x, z, yaw: 0, width: 34, depth: 15, height: 12, color: BRICK, roof: 0x4a4644, door: 6, name: 'mill' });
      MILLS.push({ x, z, w: 34, d: 15 });
      props.chimney({ x: x + 22, z: z + 4 * s, height: 26 });
      for (const dx of (s > 0 ? [-34, -16] : [-50, -32])) props.townHouse({ x: p.x + dx, z: p.z + 22 * s, yaw: 0, width: 14, depth: 8, storeys: 2, damaged: 0, name: 'workers’ barracks' });
    }

    // ---- the towns: Narva's baroque stone old town behind Hermann Castle, Ivangorod's houses round its fortress
    props.rand = mulberry32(1700);
    for (let i = 0, k = 0; k < 18 && i < 600; i++) {
      const x = HERMANN.x - 30 + (props.rand() * 2 - 1) * 95, z = HERMANN.z - 60 - props.rand() * 70;
      if (skip(x, z) || Math.hypot(x - points[8].x, z - points[8].z) < 50) continue;
      props.townHouse({ x, z, yaw: Math.round(props.rand()) * (Math.PI / 2), width: 9 + props.rand() * 3, depth: 9, storeys: 2 + Math.round(props.rand()), damaged: 0 });
      k++;
    }
    props.church({ x: HERMANN.x - 90, z: HERMANN.z - 40, yaw: 0 });                    // St John's
    props.rand = mulberry32(1701);
    for (let i = 0, k = 0; k < 18 && i < 600; i++) {
      const x = IVAN.x + 30 + (props.rand() * 2 - 1) * 95, z = IVAN.z + 60 + props.rand() * 70;
      if (skip(x, z) || Math.hypot(x - points[2].x, z - points[2].z) < 50) continue;
      if (k % 3) props.house({ x, z, yaw: Math.round(props.rand()) * (Math.PI / 2), width: 8 + props.rand() * 2, depth: 7 });
      else props.townHouse({ x, z, yaw: Math.round(props.rand()) * (Math.PI / 2), width: 9, depth: 9, storeys: 2, damaged: 0 });
      k++;
    }
    { const x = IVAN.x + 100, z = IVAN.z + 30; if (!skip(x, z)) { props.church({ x, z, yaw: Math.PI }); onion(x, terrain.heightAt(x, z) + 10, z, 2.2, GOLD); } }
    // stations on the Petrograd line: Narva (Germans), Ivangorod (Reds); goods wagons on the track
    for (const s of [points[1], points[7]]) {
      const north = s.z > 0;
      props.hall({ x: RAIL_X + 18, z: s.z, yaw: Math.PI / 2, width: 24, depth: 9, height: 6, color: north ? 0x8a6a50 : 0x7a6a58, name: 'railway station' });
      props.wagon({ x: RAIL_X, z: s.z + (north ? 40 : -40), yaw: 0, kind: 'box' });
      props.wagon({ x: RAIL_X, z: s.z + (north ? 52 : -52), yaw: 0, kind: 'box', color: 0x4e3a2a });
    }
    for (let z = -560; z < 560; z += 20) props.rails({ x0: RAIL_X, z0: z, x1: RAIL_X, z1: z + 20 });
    // the farms on the far fields
    for (const p of points) if ('BHDJ'.includes(p.id)) farmVillage(props, p.x, p.z, 4, 1918 * 10 + Math.round(p.x * 3 + p.z * 7), skip, 1.2);
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    for (let tries = 0, n = 0; n < 90 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x, z - mid(x)) < 150 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    for (const s of [1, -1]) for (const bx of [-220, 150, 420]) {
      const x = bx * s, z = trenchZ(x, s > 0) + 26 * s;
      if (!skip(x, z)) props.logPile({ x, z, yaw: 0.3 * s, length: 6 });
    }
    // the frozen edges: shelves of snowy ice out from both banks of each arm, open black water in the middle
    for (const arm of [armN, armS]) for (let x = -520; x < 520; x += 4) {
      if (ROAD_X.some((bx) => Math.abs(x - bx) < 10) || Math.abs(x - FALLS_X) < 12) continue;
      if (arm === armS && split(x) < 2) continue;                                       // (one channel where the arms run together)
      for (const s of [1, -1]) {
        const w = 3.5 + 3 * (0.5 + 0.5 * Math.sin(x * 0.07 + s * 2 + (arm === armN ? 0 : 5))) + 2 * fbm(noise, x * 0.05, s * 9, 2);
        const zEdge = arm(x) + s * HW;
        if (split(x) > 2 && split(x) < HW + 2 && (arm === armN ? s < 0 : s > 0)) continue;  // (no shelf where the arms meet)
        const slope = (arm(x + 1) - arm(x - 1)) / 2;
        if (Math.abs(slope) > 1.2) continue;                                            // (the island's tips: no shelf on the sharp curve)
        const yaw = -Math.atan(slope), c = Math.cos(yaw);
        props.box('plain', x, 0.05, zEdge - s * (w / 2) / c, 4.2 / c, 0.14, w + 1, yaw, 0xdde4e8);
      }
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) || railD(x) < 5 || inCastle(x, z, 6) || inMill(x, z, 4) }];
    const wn = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
    const tN = 0.15, tP = evenThreshold(wn, tN, (x, z) => z > mid(x));    // (pine woods, the same area each side)
    const forest = gridCache((x: number, z: number) => {
      if (wet(x, z, 3)) return -1;
      if (trenchBand(x, z)) return 0.03;
      if (away(x, z) < 45) return 0.15;                                     // alders along the banks
      if (Math.hypot(x - IVAN.x - 30, z - IVAN.z - 90) < 110 || Math.hypot(x - HERMANN.x + 30, z - HERMANN.z + 90) < 110) return 0.03; // (the towns)
      return Math.abs(x) > 470 || wn(x, z) > (z > mid(x) ? tN : tP) ? 0.85 : 0;
    }, { x: 520, z: 580 }, 4);
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3000, hedges: 700, autumn: 1, broadleaf: 0.15,
      forest,
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
