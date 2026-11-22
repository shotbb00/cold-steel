// Pskov, 24 February 1918: Operation Faustschlag. The Brest-Litovsk talks broke down, the armistice ran out on the 18th,
// and the German Eighth Army walked into a Russia whose old army had gone home: Pskov fell almost without a shot, its
// garrison and the commissars gone up the Petrograd line in the night. North of the town the Germans met the first
// Red Guard detachments and Latvian riflemen sent down from Petrograd — the skirmishes later kept as the birthday of the
// Red Army, 23 February. Late winter: snow on the fields, the Velikaya frozen hard enough for men on the marked ice
// roads, the Pskov Krom — the Kremlin's white walls and towers on its rock where the Pskova runs into the Velikaya, the
// Trinity Cathedral's gold dome over it — wooden suburbs with onion-domed churches, the Snetogorsky and Mirozhsky
// monasteries upriver and down, the railway station and the Riga line's bridge, birch woods, and only the scrapes and
// rifle pits a few days' war allows: no deep trench system, the war was mobile again.
// Not mirrored but fair: the frozen river runs between the sides; the Krom stands on the island between the Pskova's
// mouth and the Velikaya (F), in neither side's hands, one bridge to each bank under its gates. Each side has a
// monastery on its western bank (Snetogorsky, Mirozhsky), a wooden suburb at the same reach in the centre (Okolny Gorod,
// Promezhitsy), a station on the railway on its eastern flank (Pskov station, Kresty halt) and a river-bank quarter by a
// crossing (Zapskovye, Zavelichye); the western ice road and the eastern railway bridge serve both banks alike; the same
// low rise behind each centre point and woods of the same area.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, evenThreshold } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const HW = 16;                                              // the Velikaya, frozen (each arm round the Krom)
const RAIL_X = SIDE_X + 5;                                  // the Riga–Pskov–Petrograd line, beside the eastern road
const noise = createNoise2D(1918_02);
const mid = (x: number) => 12 * Math.sin(x * 0.005 + 0.4) + 7 * Math.sin(x * 0.017) - 5;
const split = (x: number) => 72 * Math.exp(-((x / 140) ** 2));                   // the Pskova's mouth (north) and the Velikaya (south) round the Krom
const armN = (x: number) => mid(x) + split(x), armS = (x: number) => mid(x) - split(x);
const river = createRiver({
  path: armN, paths: [armN, armS], halfWidth: HW, level: 0, depth: 2.2, valley: 60,
  crossings: [
    // (the arms run together on the flanks: an ice road is marked on both, so the bed is shallow right across)
    { name: 'Mirozh ice road', x: -SIDE_X, kind: 'ford', width: 24, channel: 0 },
    { name: 'Mirozh ice road', x: -SIDE_X, kind: 'ford', width: 24, channel: 1 },
    { name: 'Krom bridge (Pskova)', x: 0, kind: 'bridge', width: 6, channel: 0 },
    { name: 'Olginsky bridge (Velikaya)', x: 0, kind: 'bridge', width: 6, channel: 1 },
    { name: 'Railway bridge', x: SIDE_X + 2, kind: 'bridge', width: 13 },
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
/** The hasty positions: a line of scrapes and rifle pits each side, dug into the snow a few days before. */
const trenchZ = (x: number, north: boolean) => (north ? mid(x) + split(x) * 0.6 + 105 + 9 * Math.sin(x * 0.017) : mid(x) - split(x) * 0.6 - 105 - 10 * Math.sin(x * 0.013 + 2));

/** One low rise a side behind its centre point [x, z, r, h], and a gentler swell on each other flank. */
const RISES = [[100, 300, 160, 6], [-280, 380, 150, 3], [-40, -300, 170, 6.2], [390, -300, 140, 3.2]];
const KROM = { x: 0, z: mid(0) };
function height(x: number, z: number) {
  const d = away(x, z);
  let h = 1.2 + smoothstep(25, 130, d) * (3.4 + fbm(noise, x * 0.004 + (z > mid(x) ? 0 : 40), z * 0.004, 4) * 3.5);
  h += fbm(noise, x * 0.015 + 9, z * 0.015, 3) * 0.8 * smoothstep(40, 140, d);
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += 2.4 * smoothstep(62, 20, Math.hypot((x - KROM.x) * 0.8, z - KROM.z));                // the Krom's rock
  h += smoothstep(BASE_Z - 70 + 40 * Math.sin(x * 0.008 + 1), 640, Math.abs(z)) * 8 + smoothstep(440 + 50 * Math.sin(z * Math.PI / 280), 600, Math.abs(x)) * 12;
  for (const bx of [-SIDE_X, 0, SIDE_X]) h += (Math.min(h, 1.3 + d * 0.05) - h) * (1 - smoothstep(5, 18, Math.abs(x - bx))) * (1 - smoothstep(90, 140, d));
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Petrograd road', 0, 470, 'centre'),
  P('B', 'Snetogorsky Monastery', -360, 300, 'west'),
  P('C', 'Okolny Gorod', 100, 268, 'centre', { radius: 28 }),
  P('D', 'Pskov station', 300, 320, 'east'),
  P('E', 'Zapskovye', -190, Math.round(mid(-190) + 72), 'west', { radius: 24 }),
  P('F', 'Pskov Krom', 0, Math.round(mid(0)), 'centre', { radius: 30 }),
  P('G', 'Zavelichye', 200, Math.round(mid(200) - 70), 'east', { radius: 24 }),
  P('H', 'Mirozhsky Monastery', -330, -300, 'west'),
  P('I', 'Promezhitsy', -40, -262, 'centre', { radius: 28 }),
  P('J', 'Kresty halt', 300, -320, 'east'),
  P('K', 'Ostrov road', 0, -470, 'centre'),
] as any[];
/** The Krom's wall: a blunt triangle on its rock, its point (the Persi) to the east where the rivers meet. */
const WALL = [[-44, -32], [34, -34], [58, 2], [30, 34], [-44, 32]].map(([x, z]) => [KROM.x + x, KROM.z + z]);
const inKrom = (x: number, z: number, r = 0) => x > KROM.x - 44 - r && x < KROM.x + 58 + r && Math.abs(z - KROM.z) < 34 + r;
/** The monasteries: walled, each with its onion-domed church. */
const MONASTERIES = [{ x: points[1].x + 40, z: points[1].z - 30 }, { x: points[7].x - 40, z: points[7].z + 34 }];
const CHURCHES = [{ x: points[2].x - 40, z: points[2].z + 26 }, { x: points[8].x + 42, z: points[8].z - 22 },
  { x: points[4].x + 30, z: points[4].z + 34 }, { x: points[6].x - 34, z: points[6].z - 30 }];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'pskov',
  name: 'Pskov',
  description: 'February 1918, Operation Faustschlag: the German Eighth Army takes Pskov almost unopposed and meets the first Red Guard detachments north of the town. Snow on the fields, the Velikaya frozen with ice roads and two bridges, the white Krom and the Trinity Cathedral on their rock, wooden suburbs, monasteries and the station, scrapes dug in the snow.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de'] }, // (the Red Guards and Latvian riflemen fight as the Russian army; the German Eighth Army)
  sides: { nato: 'Russia', pact: 'Germany' },
  climate: 'winter',   // whitewash and snow smocks (render/paint.js CLIMATE)
  conditions: { time: 'day', weather: 'overcast' }, // (grey late-February days, the snow still lying)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1918_02,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191802, cell: 80, weights: [0.3, 0.35, 0.1, 0.25] as any }),

  theme: {
    // low grey cloud over the snow
    fogColor: 0xc0c4c8, fogDensity: 0.0018, skyTop: 0x868c94, skyHorizon: 0xc8ccd0, skyBottom: 0x8a8e92,
    sunColor: 0xe2e6ec, sunIntensity: 1.25, sunDisk: 0.04, clouds: 0.95, cloudLight: 0xcaced2, cloudDark: 0x82888e,
    sunDir: [0.4, 0.4, 0.7], hemiSky: 0xd2d8e0, hemiGround: 0x8c9096, hemiIntensity: 1.45, rimColor: 0xc0c8d2, rimIntensity: 0.2,
    terrain: {
      grass: '#eceeee', grassAlt: '#e0e4e6', dryGrass: '#d6d4cc', dirt: '#9a948a', rock: '#b6b8b6', strip: '#8a847a',
      pasture: '#e8ebeb', ploughed: '#d0cec6', stubble: '#dcd8ce', meadow: '#f0f2f2',
      farmX: [460, 600], farmZ: [520, 640], roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x8e8a82, 0.85];                                     // the roads: snow trodden to slush
        if (Math.abs(x - RAIL_X) < 2.5) return [0x6e6a64, 0.7];                          // the railway's cinder bed
        if (y < 1.6 && away(x, z) < HW + 10) return [0xd6dde2, 0.8];                    // snow drifted on the frozen banks
        if (inKrom(x, z, -2)) return [0xc8c4bc, 0.5];                                   // the Krom's trodden yard
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

  /** Each side's hasty line: stretches of scrapes and rifle pits with gaps between, a little wire, an MG at each road. No shelling to speak of. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato')]);   // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 16, belts: 1, gapEvery: 30 })) {
        if (roadD(w.x, w.z) < 8 || Math.abs(w.x - RAIL_X) < 6 || away(w.x, w.z) < HW + 10) continue;
        const stretch = Math.sin(w.x * s * 0.045) > -0.1;                              // (dug in stretches, the same share each side)
        if (!stretch || (w.kind === 'wire' && Math.sin(w.x * s * 0.11) < 0.3)) continue; // (a little wire, not belts)
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
    const holy = [...MONASTERIES.map((m) => ({ ...m, r: 34 })), ...CHURCHES.map((c) => ({ ...c, r: 20 }))];
    const skip = (x: number, z: number) => wet(x, z, 8) || roadD(x, z) < 8 || trenchBand(x, z) || railD(x) < 9 || inKrom(x, z, 10)
      || holy.some((c) => Math.hypot(c.x - x, c.z - z) < c.r);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const WHITE = 0xe6e2d8, GOLD = 0xc8a850, SHINGLE = 0x4e4034;
    /** An onion dome on a drum at (x, y, z): `r` its radius. */
    const onion = (x: number, y: number, z: number, r: number, color: number) => {
      m4.compose(v.set(x, y, z), q.identity(), one); props.push('plaster', new THREE.CylinderGeometry(r * 0.75, r * 0.75, r * 1.6, 12), m4, WHITE);
      m4.compose(v.set(x, y + r * 1.6, z), q.identity(), v.clone().set(r, r * 1.2, r)); props.push('plain', new THREE.SphereGeometry(1, 12, 8), m4, color);
      m4.compose(v.set(x, y + r * 3, z), q.identity(), one); props.push('plain', new THREE.ConeGeometry(r * 0.38, r * 1.2, 8), m4, color);
      props.box('metal', x, y + r * 3.9, z, 0.15, 1.6, 0.15, 0, GOLD);
      props.box('metal', x, y + r * 4.1, z, 0.9, 0.12, 0.12, 0, GOLD);
    };
    /** A whitewashed Orthodox church: the town church's nave and belfry, an onion dome over the nave. */
    const orthodox = (x: number, z: number, yaw: number, dome: number) => {
      props.church({ x, z, yaw });
      onion(x, terrain.heightAt(x, z) + 10, z, 2.2, dome);
    };

    // ---- the Pskov Krom: the white wall on its rock, round towers with shingle roofs, gates on the bridge road
    props.rand = mulberry32(1510);
    for (let i = 0; i < WALL.length; i++) {
      const [x0, z0] = WALL[i], [x1, z1] = WALL[(i + 1) % WALL.length];
      const L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(z0 - z1, x1 - x0);
      for (let t = 0; t < L; t += 4) {
        const x = x0 + (x1 - x0) * (t + 2) / L, z = z0 + (z1 - z0) * (t + 2) / L;
        if (Math.abs(x - KROM.x) < 6) continue;                                        // (the gates on the road)
        const g = terrain.heightAt(x, z), hh = 6.5;
        props.box('plaster', x, g + hh / 2 - 0.4, z, 4.1, hh + 0.8, 1.8, yaw, WHITE);
        props.box('plaster', x, g + hh + 0.5, z, 4.1, 0.9, 0.6, yaw, 0xdcd8ce);           // the parapet
        cover.addBox({ x, z, yaw, length: 4.1, thickness: 1.8, height: hh });
      }
    }
    for (const [tx, tz, r, hh] of [...WALL.map(([x, z]) => [x, z, 4.2, 11]), [KROM.x - 6, KROM.z + 33, 3.4, 10], [KROM.x - 6, KROM.z - 33, 3.4, 10],
      [KROM.x + 6, KROM.z + 33, 3.4, 10], [KROM.x + 6, KROM.z - 33, 3.4, 10]]) {
      const g = terrain.heightAt(tx, tz);
      m4.compose(v.set(tx, g + hh / 2 - 0.5, tz), q.identity(), one); props.push('plaster', new THREE.CylinderGeometry(r, r * 1.08, hh + 1, 14), m4, WHITE);
      m4.compose(v.set(tx, g + hh + 1.9, tz), q.identity(), one); props.push('plain', new THREE.ConeGeometry(r * 1.2, 5, 14), m4, SHINGLE);
      cover.addCylinder({ x: tx, z: tz, radius: r, height: hh, spots: false });
    }
    // the Trinity Cathedral: a white cube of a church, its gold dome on a tall drum, the belfry beside it
    {
      const x = KROM.x + 22, z = KROM.z + 2, yaw = 0;
      const b = props.beginBuilding('Trinity Cathedral', x, z, yaw, 18, 14);
      b.plaster = WHITE;
      props.shell(b, { height: 11, key: 'plaster', color: WHITE, front: [0], left: [3], t: 0.8, bay: 3.4, sill: 2.2, head: 7.5, frame: 0xb8b0a0 });
      props.gableRoof(b, { eave: 11, pitch: 0.5, color: 0x5a6a64, t: 0.8 });
      props.endBuilding();
      const g = b.ground;
      onion(x, g + 15, z, 3.6, GOLD);
      for (const [dx, dz] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) onion(x + dx, g + 13, z + dz, 1.5, GOLD);
      const bx = KROM.x - 16, bz = KROM.z - 12, bg = terrain.heightAt(bx, bz);
      props.box('plaster', bx, bg + 9, bz, 5, 18, 5, 0, WHITE);
      props.box('metal', bx, bg + 14.5, bz, 5.1, 1.6, 1, 0, 0x2a2622);
      onion(bx, bg + 18, bz, 1.6, GOLD);
      cover.addBox({ x: bx, z: bz, yaw: 0, length: 5, thickness: 5, height: 18 });
    }
    // the Krom's yard: the old prikaz chambers, a log store, sledges' firewood
    props.rand = mulberry32(1918);
    props.townHouse({ x: KROM.x - 26, z: KROM.z + 16, yaw: 0, width: 12, depth: 8, storeys: 2, damaged: 0 });
    props.logPile({ x: KROM.x + 30, z: KROM.z - 14, yaw: 0.4, length: 7 });
    props.crates({ x: KROM.x - 20, z: KROM.z - 22, yaw: 0.2 });

    // ---- the monasteries: Snetogorsky on the north bank, Mirozhsky on the south, each walled in white
    MONASTERIES.forEach((m, i) => {
      props.rand = mulberry32(1300 + i);
      orthodox(m.x, m.z, i ? 0 : Math.PI, i ? GOLD : 0x3e6a8a);
      for (const [dx, dz, yaw, L] of [[0, 26, 0, 52], [0, -26, 0, 52], [26, 0, Math.PI / 2, 52], [-26, 0, Math.PI / 2, 52]]) {
        for (let t = -L / 2 + 2; t < L / 2; t += 4) {
          const x = m.x + dx + (yaw ? 0 : t), z = m.z + dz + (yaw ? t : 0);
          if (Math.abs(t) < 4 && Math.abs(dz) > 0) continue;                         // (the holy gates)
          props.lowWall({ x, z, yaw, length: 4.1, height: 2.6, color: WHITE });
        }
      }
      props.house({ x: m.x + 14, z: m.z + (i ? -15 : 15), yaw: 0, width: 9, depth: 6 });
    });

    // ---- the parish churches with their onion domes, the suburbs of log houses round them
    CHURCHES.forEach((c, i) => orthodox(c.x, c.z, i % 2 ? 0 : Math.PI, [0x3e6a8a, 0x4a7a5c, 0x4a7a5c, 0x3e6a8a][i]));
    for (const [p, n, seed] of [[points[2], 22, 1], [points[8], 22, 2], [points[4], 12, 3], [points[6], 12, 4]] as const) {
      props.rand = mulberry32(1918_0 + seed);
      for (let i = 0, k = 0; k < n && i < 500; i++) {
        const a = props.rand() * Math.PI * 2, d = 20 + props.rand() * 60, x = p.x + Math.cos(a) * d * 1.3, z = p.z + Math.sin(a) * d * 0.9;
        if (skip(x, z) || Math.hypot(x - p.x, z - p.z) < 14) continue;
        props.house({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2, width: 7 + props.rand() * 2, depth: 6 });
        k++;
      }
    }
    // merchants' stone houses by the Krom's bridges, a few each bank
    for (const s of [1, -1]) {
      props.rand = mulberry32(1700 + s);
      for (const dx of [-30, 26]) {
        const x = dx * s, z = (s > 0 ? armN(x) : armS(x)) + 48 * s;
        if (!skip(x, z)) props.townHouse({ x, z, yaw: s > 0 ? Math.PI : 0, width: 10, depth: 8, storeys: 2, damaged: 0 });
      }
    }
    // the farms round the monasteries and on the far fields
    for (const p of points) {
      if (!'BHDJ'.includes(p.id)) continue;
      farmVillage(props, p.x, p.z, 5, 1918 * 10 + Math.round(p.x * 3 + p.z * 7), skip, 1.15);
    }
    // Pskov station on the north bank, Kresty halt on the south: the station building, goods wagons on the line
    for (const s of [points[3], points[9]]) {
      const north = s.z > 0;
      props.hall({ x: RAIL_X - 18, z: s.z, yaw: Math.PI / 2, width: 24, depth: 9, height: 6, color: north ? 0x8a6a50 : 0x7a6a58, name: 'railway station' });
      props.wagon({ x: RAIL_X, z: s.z + (north ? 40 : -40), yaw: 0, kind: 'box' });
      props.wagon({ x: RAIL_X, z: s.z + (north ? 52 : -52), yaw: 0, kind: 'box', color: 0x4e3a2a });
    }
    for (let z = -560; z < 560; z += 20) props.rails({ x0: RAIL_X, z0: z, x1: RAIL_X, z1: z + 20 });
    // sledges' firewood, hay ricks and fences over each side's fields
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    for (let tries = 0, n = 0; n < 100 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x, z - mid(x)) < 140 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    for (const s of [1, -1]) for (const bx of [-220, 140, 420]) {
      props.rand = mulberry32(1949 + s * 7 + bx);
      const x = bx * s, z = trenchZ(x, s > 0) + 26 * s;
      if (!skip(x, z)) props.logPile({ x, z, yaw: props.rand() * 0.6, length: 6 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);
    // the Velikaya frozen over: the water sheet becomes ice under snow
    for (const o of scene.children) {
      const mat = (o as any).material;
      if (mat?.userData?.waterSurface && !mat.userData.ice) {
        Object.assign(mat, { transparent: false, opacity: 1, roughness: 0.55, metalness: 0.05 });
        mat.color.set(0xcfd9df);
        mat.userData.ice = true;
      }
    }

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) || railD(x) < 5 || inKrom(x, z, 6) || holy.some((c) => Math.hypot(c.x - x, c.z - z) < c.r * 0.8) }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
    const tN = 0.15, tP = evenThreshold(wood, tN, (x, z) => z > mid(x));   // (birch woods, the same area each side)
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3000, hedges: 900, autumn: 1, broadleaf: 0.55,
      forest: (x: number, z: number) => {
        if (wet(x, z, 3)) return -1;
        if (trenchBand(x, z)) return 0.03;
        if (away(x, z) < 45) return 0.2;                                      // willows along the banks
        if (Math.hypot(x - points[2].x, z - points[2].z) < 90 || Math.hypot(x - points[8].x, z - points[8].z) < 90) return 0.05; // (the suburbs)
        return Math.abs(x) > 470 || wood(x, z) > (z > mid(x) ? tN : tP) ? 0.85 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
