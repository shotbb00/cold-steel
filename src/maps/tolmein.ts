// The Tolmein bridgehead, 1917: the one place below Flitsch where Austria-Hungary held on to the west bank of the
// Isonzo through eleven battles. Its hills over the river — Santa Maria, Santa Lucia (Most na Soči) at the Idrijca's
// mouth, Mengore behind — were tunnelled with caverns and wrapped in wire, and the Italians never cleared them; in
// October 1917 the German Alpenkorps and the storm battalions came down the valley road and the Wochein railway into
// Tolmein, and out of this bridgehead the Caporetto offensive broke the Italian line on the 24th.
// The ground: the Isonzo green and fast over its gravel across the middle, the Tolminka coming in out of its gorge to
// the town of Tolmein on its terrace (the castle hill, Kozlov rob, over it, Mrzli vrh's wall behind) and the Idrijca
// coming in at Santa Lucia, where the railway bridge crosses; Volzana and Ciginj on their terraces, Poljubinj under the
// Bučenica; beech woods turning on the slopes, the mountains closing the valley on both sides.
// Not mirrored but fair: each side holds one bank and has a tributary on one flank (the Italians the Idrijca on the
// east, the Austrians the Tolminka on the west) with its own bridge and ford, a big height beyond it at the same reach
// (Mengore; Kozlov rob), a second height or the town in the centre, and the same three Isonzo crossings to fight for:
// Tolmein bridge, the Modrejce ford, Santa Lucia bridge. The mountain walls are craggier to the west on both sides.
// (The Idrijca really joins from the Tolmein bank: it is turned to the Italian bank here so each side has a river to
// cross on its flank.)
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { segDist, farmVillage, evenThreshold } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1917_05);
/** The Isonzo across the middle, west (upstream, Kobarid) to east (downstream, Kanal). */
const iso = (x: number) => 22 * Math.sin(x * 0.0065 + 0.4) + 9 * Math.sin(x * 0.018 + 1.3) - 5;
/** The Tolminka down out of its gorge on the Austrian side into the Isonzo; the Idrijca on the Italian side ([x, z, half-width]). */
const TOLMINKA = [[-240, iso(-240), 8], [-225, -70, 7], [-200, -150, 6.5], [-215, -240, 6], [-190, -330, 6], [-205, -430, 5.5], [-180, -540, 5.5], [-175, -640, 5.5]];
const IDRIJCA = [[275, iso(275), 9], [290, 80, 8], [265, 170, 7], [285, 260, 7], [255, 350, 6.5], [275, 450, 6], [250, 560, 6], [250, 650, 6]];
const bankZ = (x: number, n: boolean) => (n ? iso(x) + 55 : iso(x) - 55 - 5 * Math.sin(x * 0.013 + 1)); // the valley road along each bank
const river = createRiver({
  path: iso, paths: [iso, TOLMINKA, IDRIJCA], halfWidth: 14, level: 0, depth: 2.6, valley: 40,
  crossings: [
    { name: 'Tolmein bridge', x: -342, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Modrejce ford', x: 20, kind: 'ford', width: 16, depth: 0.7, channel: 0 },
    { name: 'Santa Lucia bridge', x: 318, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Tolminka bridge', x: -228, z: bankZ(-228, false), kind: 'bridge', width: 7, channel: 1 },
    { name: 'Zatolmin ford', x: -190, z: -335, kind: 'ford', width: 14, depth: 0.6, channel: 1 },
    { name: 'Idrijca bridge', x: 284, z: bankZ(284, true), kind: 'bridge', width: 7, channel: 2 },
    { name: 'Bača ford', x: 256, z: 348, kind: 'ford', width: 14, depth: 0.6, channel: 2 },
  ],
});
const away = (x: number, z: number) => Math.abs(z - iso(x));
const tribD = (x: number, z: number) => Math.min(segDist(TOLMINKA, x, z), segDist(IDRIJCA, x, z));
const north = (x: number, z: number) => z > iso(x);

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Kolovrat road', 0, 470, 'centre'),
  P('B', 'Volzana', -300, 320, 'west'),
  P('C', 'Santa Maria', -30, 232, 'centre', { radius: 24 }),
  P('D', 'Mengore', 385, 318, 'east', { radius: 24 }),
  P('E', 'Tolmein bridge', -342, Math.round(iso(-342)), 'west', { radius: 26 }),
  P('F', 'Modrejce ford', 20, Math.round(iso(20)), 'centre', { radius: 26 }),
  P('G', 'Santa Lucia', 318, Math.round(iso(318)), 'east', { radius: 26 }),
  P('H', 'Kozlov rob', -330, -370, 'west', { radius: 24 }),
  P('I', 'Tolmein', -70, -220, 'centre', { radius: 30 }),
  P('J', 'Bučenica', 350, -280, 'east', { radius: 24 }),
  P('K', 'Mrzli vrh road', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

/** The roads: each side's trunk through its centre over the ford, the bridge roads, the laterals behind each line. */
const ROADS = [
  [[0, BASE_Z], [15, 400], at('C'), [5, 150], [20, iso(20) + 40], [20, iso(20) - 40], [-25, -120], at('I'), [-25, -370], [0, -BASE_Z]],
  [[0, BASE_Z], [-150, 430], at('B'), [-330, 180], [-342, iso(-342) + 40], [-342, iso(-342) - 40], [-345, -150], at('H')],
  [[0, -BASE_Z], [150, -430], at('J'), [340, -150], [318, iso(318) - 40], [318, iso(318) + 40], [370, 180], at('D')],
  [at('B'), [-160, 280], at('C'), [130, 300], [256, 348], at('D')],
  [at('H'), [-190, -335], at('I'), [150, -260], at('J')],
  [[0, BASE_Z], [150, 430], [256, 348]], [[0, -BASE_Z], [-120, -440], [-190, -335]],
];
/** The roads' segments with their boxes (it's asked for every vertex: far ones skipped). */
const SEGS = ROADS.flatMap((r) => r.slice(1).map((b, i) => { const a = r[i]; return [a[0], a[1], b[0], b[1], Math.min(a[0], b[0]) - 4, Math.max(a[0], b[0]) + 4, Math.min(a[1], b[1]) - 4, Math.max(a[1], b[1]) + 4]; }));
const onRoad = (x: number, z: number) => {
  let d = Math.abs(z - bankZ(x, north(x, z)));
  if (d > 3.5) for (const [ax, az, bx, bz, x0, x1, z0, z1] of SEGS) {
    if (x < x0 || x > x1 || z < z0 || z > z1) continue;
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return d < 3.5 ? 3.5 - d : 0;
};
/** The Wochein railway: over Santa Lucia bridge, up the Isonzo on the Tolmein bank and down it toward Kanal on the other. */
const RAIL = [[[322, iso(318) - 30], [420, -95], [520, -150]], [[322, iso(318) + 30], [420, iso(420) + 75], [520, iso(520) + 85]]];
const railD = (x: number, z: number) => Math.min(...RAIL.map((l) => segDist(l, x, z)));

/** The heights [x, z, r, h]: Santa Maria, Mengore and two shoulders over the Italian bank; Kozlov rob, Bučenica and two over the Tolmein one. */
const HILLS = [[-30, 232, 130, 38], [385, 318, 130, 48], [-430, 430, 100, 20], [130, 380, 85, 17],
  [-330, -370, 125, 48], [350, -280, 135, 38], [440, -450, 100, 20], [140, -330, 90, 24]];
const warp = (x: number, z: number) => 1 + 0.25 * fbm(noise, x * 0.012 + 50, z * 0.012, 2);
function raw(x: number, z: number) {
  const n = north(x, z), td = tribD(x, z);
  const a = Math.min(away(x, z), td * 1.5);
  let h = 1.4 + smoothstep(16, 70, a) * 2.6 + smoothstep(70, 260, a) * 7;              // the gravel terraces, the valley floor rising
  const cut = smoothstep(14, 170, td);                                                   // (the tributaries' gorges cut through all of it)
  for (const [hx, hz, r, hh] of HILLS) {
    const d = (Math.hypot(x - hx, z - hz) / r) * warp(x, z);
    h += hh * Math.exp(-d * d) * (0.9 + 0.2 * fbm(noise, x * 0.014 + hx, z * 0.014, 2)) * cut;
  }
  // the mountain walls closing the valley: Kolovrat over the Italians, Mrzli vrh over Tolmein (craggier to the west on both)
  const w = smoothstep(500, 720, away(x, z));
  h += w * (n ? 92 : 95) * (1 - 0.4 * x / 500) * (0.75 + 0.5 * ridged(noise, x * (n ? 0.009 : 0.012) + 7, z * (n ? 0.009 : 0.012), 3)) * cut;
  h += smoothstep(480, 620, Math.abs(x)) * 30 * (0.6 + 0.4 * fbm(noise, x * 0.02, z * 0.02, 2));  // the valley's bends closing it up and down stream
  h += fbm(noise, x * 0.03, z * 0.03, 2) * 1.4;
  return h;
}
const PADS = [[0, BASE_Z, 30], [0, -BASE_Z, 30]].map(([x, z, r]) => [x, z, r, raw(x, z)]);
function height(x: number, z: number) {
  let h = raw(x, z);
  for (const [px, pz, r, ph] of PADS) h += (ph - h) * smoothstep(r + 16, r, Math.hypot(x - px, z - pz));
  return river.carve(x, z, h);
}

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1ª Squadra' }];

export default {
  id: 'tolmein',
  name: 'Tolmein',
  description: 'The Tolmein bridgehead, 1917: the Isonzo where the Tolminka and the Idrijca come in, Tolmein under its castle hill, the caverned hills of Santa Maria and Santa Lucia, the railway bridge and the mountains closing the valley. Hold your bank, your height and your flank river; fight for the three crossings.',
  epochs: ['1918'],
  region: 'italy',
  airfields: [], // (a narrow valley cut by three rivers: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['it'], pact: ['ah', 'st'] }, // (the Italian Second Army against the k.u.k. garrison and the German storm troops of the Fourteenth Army)
  sides: { nato: 'Italy', pact: 'Central Powers' },
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  overwatch: true,
  camera: { maxHeight: 560, far: 3000 },
  seed: 1917,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191705, cell: 60, weights: [0.45, 0.2, 0.05, 0.3] as any }),

  theme: {
    // a grey October day in the valley, cloud on the mountains
    fogColor: 0xa4aaa8, fogDensity: 0.0016, skyTop: 0x66727c, skyHorizon: 0xb4b8b4, skyBottom: 0x6a6c66,
    sunColor: 0xe6dccc, sunIntensity: 1.5, sunDisk: 0.1, clouds: 0.85, cloudLight: 0xc4c8c8, cloudDark: 0x646a6e,
    sunDir: [-0.35, 0.62, 0.45], hemiSky: 0xb8c0c4, hemiGround: 0x4e4a3a, hemiIntensity: 1.3, rimColor: 0xbcc4ca, rimIntensity: 0.2,
    terrain: {
      grass: '#58663a', grassAlt: '#4e5c34', dryGrass: '#8c7e50', dirt: '#5e5040', rock: '#8e8c84', strip: '#4a4032',
      pasture: '#5c6a3a', ploughed: '#6a5c48', stubble: '#9a8c58', meadow: '#64723e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z) > 0) return [0x8a8070, 0.9];                                       // the roads (limestone grit)
        if ((away(x, z) < 30 || tribD(x, z) < 15) && y < 2.2) return [0xc4c0b0, 0.95];     // the rivers' pale gravel
        if (y > 30) {
          const g = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
          if (g > 0.7) return [0x9a978c, Math.min(1, (g - 0.7) * 3)];                        // limestone crags
        }
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-60, 0, 60] }, pact: { x: 0, z: -BASE_Z, entries: [-60, 0, 60] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -330 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Schwarm' })),
  },

  /** Each side's line along its bank (wire toward the river, gaps at the roads, none across the rivers or towns), MG posts on its heights. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) { const X = x * s; pts.push([X, s > 0 ? iso(X) + 150 + 12 * Math.sin(X * 0.021) : iso(X) - 150 - 14 * Math.sin(X * 0.017 + 1)]); } // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 18, belts: 2, gapEvery: 60 })) if (onRoad(w.x, w.z) === 0 && onRoad(w.x + 5, w.z) === 0 && onRoad(w.x - 5, w.z) === 0 && tribD(w.x, w.z) > 22) works.push(w);
      for (const id of s > 0 ? ['B', 'C', 'D'] : ['H', 'I', 'J']) { const p = points.find((q) => q.id === id); for (const dx of [-11, 11]) works.push({ kind: 'mgNest', x: p.x + dx, z: p.z - 16 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f }); }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const lineZ = (x: number, n: boolean) => (n ? iso(x) + 150 : iso(x) - 150);
    const skip = (x: number, z: number) => away(x, z) < 28 || tribD(x, z) < 18 || railD(x, z) < 7 || onRoad(x, z) > 0 || onRoad(x + 6, z) > 0 || onRoad(x - 6, z) > 0 || onRoad(x, z + 6) > 0 || onRoad(x, z - 6) > 0
      || steepAt(x, z) > 0.3 || Math.abs(z - lineZ(x, north(x, z))) < 34;

    // Tolmein on its terrace between the Tolminka and the trunk road: stone houses, the church; Santa Lucia in the angle of the Idrijca
    const town = (seed: number, n: number, x0: number, x1: number, z0: number, z1: number) => {
      const r = (props.rand = mulberry32(seed));
      for (let i = 0; i < n * 3; i++) {
        const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
        if (skip(x, z) || nearPoint(x, z, 12)) continue;
        props.townHouse({ x, z, yaw: (r() < 0.5 ? 0 : Math.PI / 2) + r() * 0.2, width: 7 + r() * 3, depth: 8 + r() * 2, storeys: r() < 0.35 ? 3 : 2, damaged: 0.2 });
        if (--n <= 0) break;
      }
    };
    town(17051, 40, -190, 30, -280, -175);
    town(17052, 20, 290, 470, 30, 140);
    props.church({ x: -96, z: -246, yaw: Math.PI });
    props.church({ x: 405, z: iso(405) + 112, yaw: 0 });
    props.church({ x: -6, z: 250, yaw: 0 });                         // the pilgrims' church on Santa Maria
    props.hall({ x: 380, z: iso(380) + 44, yaw: 0.1, width: 16, depth: 8, height: 5, color: 0x9a8a72, roof: 0x6a3a2a, door: 3, name: 'station' }); // Santa Lucia station
    // the ruined castle on Kozlov rob
    props.hall({ x: -312, z: -380, yaw: 0.3, width: 14, depth: 12, height: 8, color: 0x8e8a80, roof: 0x5a5650, door: 3, name: 'castle' });
    props.rand = mulberry32(1709);
    for (let i = 0; i < 6; i++) { const a = i * 1.05; props.lowWall({ x: -312 + Math.cos(a) * 20, z: -380 + Math.sin(a) * 18, yaw: a + Math.PI / 2, length: 10, height: 2.2, color: 0x8e8a80 }); }
    // villages: Volzana and Ciginj on the Italian bank, Zatolmin and Poljubinj on the other
    for (const [x, z, n, seed] of [[-300, 320, 7, 1], [-170, 150, 5, 2], [-280, -260, 5, 3], [210, -150, 6, 4]]) farmVillage(props, x, z, n, 17060 + seed, skip, 0.9);
    props.church({ x: -276, z: 340, yaw: 0 });
    // the caverns in the heights' river faces: dark mouths in a rock face, sandbags before them
    for (const [x, z, f] of [[-60, 172, 1], [10, 178, 1], [360, 250, 1], [-350, -300, -1], [-300, -305, -1], [330, -210, -1]]) {
      const y = terrain.heightAt(x, z), yaw = f > 0 ? 0 : Math.PI;
      props.box('rock', x, y + 1.6, z, 7, 3.6, 3, yaw, 0x86847a);
      props.box('plain', x, y + 1.1, z - 1.55 * f, 2.2, 2.0, 0.2, yaw, 0x1a1a18);
      props.sandbagRing({ x, z: z - 6 * f, radius: 3, toward: -f });
    }
    // the railway: rails up to the bridge on each bank
    for (const l of RAIL) for (let i = 0; i < l.length - 1; i++) props.rails({ x0: l[i][0], z0: l[i][1], x1: l[i + 1][0], z1: l[i + 1][1] });
    props.wagon({ x: 440, z: iso(440) + 78, yaw: Math.atan2(100, 10), kind: 'box' });
    // rocks and old walls over the slopes, field sites on the terraces (each side its own)
    const r = mulberry32(1717);
    for (let i = 0; i < 480; i++) {
      const x = (r() * 2 - 1) * 480, z = (i % 2 ? -1 : 1) * (40 + r() * 500);
      if (nearPoint(x, z, 30) || onRoad(x, z) > 0 || away(x, z) < 30 || tribD(x, z) < 18 || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
      if (r() < 0.7) props.boulder({ x, z, radius: 1 + r() * 2 });
      else props.lowWall({ x, z, yaw: r() * 3, length: 5 + r() * 5, height: 1.2, color: 0x9a968c });
    }
    for (let i = 0, n = 0; i < 4000 && n < 44; i++) {
      const s = n % 2 ? -1 : 1, x = (r() * 2 - 1) * 460, z = iso(x) + s * (30 + r() * 220);
      if (skip(x, z) || nearPoint(x, z, 45)) continue;
      n++;
      buildSite(props, { kind: ['hay', 'fieldwall', 'farm', 'fieldwall'][Math.floor(n / 2) % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })), ...river.crossings.map((c: any) => ({ x: c.x, z: c.z, r: 32 })),
      { test: (x: number, z: number) => away(x, z) < 22 || tribD(x, z) < 12 || onRoad(x, z) > 0 || railD(x, z) < 4 }];
    // beech woods on the heights and the walls in their October colours, pine higher; the valley floor and terraces open
    const wood0 = (x: number, z: number) => fbm(noise, x * 0.006 + 40, z * 0.006, 3) + smoothstep(20, 60, terrain.heightAt(x, z)) * 0.4;
    const tP = evenThreshold(wood0, 0.1, north);   // (each side its own woods, as much on each)
    const wood = (x: number, z: number) => wood0(x, z) - (north(x, z) ? 0.1 : tP);
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 5000, broadleaf: 0.75, autumn: 0.75, maxY: 200,
      forest: (x: number, z: number) => { const a = Math.min(away(x, z), tribD(x, z) * 1.5); if (a < 110) return a > 50 && wood(x, z) > 0.15 ? 0.35 : 0; return wood(x, z) > 0 ? 0.85 : 0.15; },
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.2, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
