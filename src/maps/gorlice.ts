// Gorlice–Tarnów, 2 May 1915: Mackensen's Eleventh Army — German and Austro-Hungarian corps side by side — opens
// the great breakthrough of the Eastern Front. Four hours of hurricane bombardment by more than seven hundred guns
// and heavy mortars smash the Russian Third Army's trenches on the ridges round Gorlice; by evening the line is
// broken and the Russians are falling back out of Galicia. The ground: the Carpathian foothills — the small oil town
// of Gorlice on the Ropa river with its stone bridge, its church and its oil derricks (Glinik and Mariampol were
// among the first oil fields in the world), wooded ridges running east–west above the valley, the Pustki hill and
// its cemetery held by the Russians, the Wiatrówki heights opposite. Not mirrored but fair: each side holds a ridge
// over the Ropa with a trench line on its forward slope and one named hill on it at the same reach from its base,
// the town astride the river in the middle (its bridge between), a ford on each flank with a point on each side's
// bank (Glinik's oil wells on the north, Zagórzany on the south), each ridge as wooded and as high as the other.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite, shellField } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, evenThreshold } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const HW = 12;                                              // the Ropa: a quick foothill river
const noise = createNoise2D(1915_05);
const mid = (x: number) => 14 * Math.sin(x * 0.006 + 1) + 9 * Math.sin(x * 0.017 - 0.5) - 6;
const river = createRiver({
  path: mid, halfWidth: HW, level: 0, depth: 2.2, valley: 60,
  crossings: [
    { name: 'Glinik ford', x: -SIDE_X, kind: 'ford', width: 14 },
    { name: 'Gorlice bridge', x: 0, kind: 'bridge', width: 7 },
    { name: 'Zagórzany ford', x: SIDE_X, kind: 'ford', width: 14 },
  ],
});
const away = (x: number, z: number) => Math.abs(z - mid(x));
/** The valley road along each bank, the roads up from the crossings over the ridges to each base. */
const bankZ = (x: number, north: boolean) => (north ? mid(x) + 46 + 6 * Math.sin(x * 0.011) : mid(x) - 50 + 8 * Math.sin(x * 0.008 + 2));
const roadD = (x: number, z: number) => {
  const north = z > mid(x);
  let d = Math.abs(z - bankZ(x, north));
  for (const bx of [-SIDE_X, 0, SIDE_X]) d = Math.min(d, Math.abs(x - bx));
  return d;
};
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
/** Each side's line on the forward slope of its ridge, its own wander. */
const trenchZ = (x: number, north: boolean) => (north ? mid(x) + 118 + 12 * Math.sin(x * 0.013 + 0.4) : mid(x) - 112 - 14 * Math.sin(x * 0.01 + 2.2));

/** The named hills on each ridge [x, z, r, h]: Pustki and the Staszkówka ridge on the north; Wiatrówki and the Ropica heights on the south. */
const RISES = [[80, 245, 120, 12], [-340, 300, 150, 7], [330, 260, 120, 5], [-200, 215, 100, -6], [-110, -245, 120, 12], [380, -260, 150, 7], [-230, -330, 120, 5], [130, -225, 110, -6]]; // (and a side valley cut into each ridge)
function height(x: number, z: number) {
  const d = away(x, z), north = z > mid(x);
  const n = fbm(noise, x * 0.004 + (north ? 0 : 40), z * 0.004, 4);
  // the valley floor, then each side's ridge rising behind its bank (each its own crest line) and falling a little behind
  const crest = north ? 175 + 25 * Math.sin(x * 0.007 + 1) : 170 + 25 * Math.sin(x * 0.0065 + 3.6);
  let h = 1.6 + smoothstep(30, crest, d) * (17 + n * 10) - smoothstep(crest + 40, crest + 180, d) * 5;
  h += fbm(noise, x * 0.016 + 9, z * 0.016, 3) * 1.8 * smoothstep(40, 140, d);
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += smoothstep(BASE_Z - 70 + 40 * Math.sin(x * 0.008 + 1), 640, Math.abs(z)) * 8 + smoothstep(440 + 50 * Math.sin(z * Math.PI / 280), 600, Math.abs(x)) * 22;
  // the side valleys the roads climb by, the bases' ground
  for (const bx of [-SIDE_X, 0, SIDE_X]) h += (Math.min(h, 2 + d * 0.06) - h) * (1 - smoothstep(6, 40, Math.abs(x - bx))) * 0.55 * (1 - smoothstep(260, 420, d));
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 12 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Biecz road', 0, 470, 'centre'),
  P('B', 'Staszkówka', -360, 320, 'west'),
  P('C', 'Pustki Hill', 80, 245, 'centre', { radius: 26 }),
  P('D', 'Strzeszyn', 320, 300, 'east'),
  P('E', 'Glinik', -SIDE_X + 40, Math.round(mid(-SIDE_X + 40) + 78), 'west', { radius: 24 }),
  P('F', 'Gorlice', 0, Math.round(mid(0)), 'centre', { radius: 32 }),
  P('G', 'Zagórzany', SIDE_X - 40, Math.round(mid(SIDE_X - 40) - 84), 'east', { radius: 24 }),
  P('H', 'Ropica', -230, -330, 'west'),
  P('I', 'Wiatrówki Hill', -110, -245, 'centre', { radius: 26 }),
  P('J', 'Sękowa', 380, -260, 'east'),
  P('K', 'Grybów road', 0, -470, 'centre'),
] as any[];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

/** A Galician oil derrick: a tall timber pyramid over the well, its engine shed beside it. */
function derrick(props: any, x: number, z: number, yaw: number) {
  const g = props.terrain.heightAt(x, z), H = 15, b = 2.2, t = 0.45, lean = Math.atan2(b - t, H), wood = 0x5a4632;
  const c = Math.cos(yaw), s = Math.sin(yaw), L = (lx: number, lz: number) => [x + lx * c + lz * s, z - lx * s + lz * c];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const [px, pz] = L(sx * (b + t) / 2, sz * (b + t) / 2);
    props.box('plain', px, g + H / 2, pz, 0.28, H + 0.3, 0.28, yaw, wood, -sz * lean, sx * lean);
  }
  for (const y of [3.5, 7, 10.5]) {
    const w = 2 * (b - (b - t) * (y / H));
    for (const sz of [-1, 1]) { const [px, pz] = L(0, sz * w / 2); props.box('plain', px, g + y, pz, w, 0.18, 0.18, yaw, wood); }
    for (const sx of [-1, 1]) { const [px, pz] = L(sx * w / 2, 0); props.box('plain', px, g + y, pz, 0.18, 0.18, w, yaw, wood); }
  }
  props.box('plain', x, g + H + 0.2, z, 1.2, 0.4, 1.2, yaw, wood);
  const [hx, hz] = L(4.2, 0);
  props.box('plain', hx, g + 1.3, hz, 3.4, 2.6, 4.2, yaw, 0x6a5440);
  props.box('plain', hx, g + 2.75, hz, 3.8, 0.3, 4.6, yaw, 0x3a3a36);
  props.cover.addBox({ x, z, yaw, length: 4.4, thickness: 4.4, height: 2 });
}

export default {
  id: 'gorlice',
  name: 'Gorlice',
  description: 'May 1915, the Carpathian foothills: the oil town of Gorlice and its derricks on the Ropa, Russian trenches on the wooded ridges above it, the German and Austro-Hungarian guns opening the greatest bombardment the east had seen.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de', 'ah'] }, // (the Russian Third Army against Mackensen's Eleventh — German and k.u.k. corps — : maps/index.js armiesOn)
  sides: { nato: 'Russia', pact: 'Central Powers' },
  conditions: { time: 'dawn', weather: 'clear' }, // (the guns opened at six on a fine spring morning)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1915,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1915, cell: 70, weights: [0.35, 0.3, 0.1, 0.25] as any }),
  airfields: [], // (no level ground for a strip among the ridges and the valley: the aircraft come in from the map edge)

  theme: {
    // a clear May morning in the foothills
    fogColor: 0xaab4b4, fogDensity: 0.0013, skyTop: 0x6a88aa, skyHorizon: 0xc4ccc8, skyBottom: 0x747a72,
    sunColor: 0xffe8c8, sunIntensity: 1.8, sunDisk: 0.25, clouds: 0.4, cloudLight: 0xe8e8e4, cloudDark: 0x8a9096,
    sunDir: [0.6, 0.45, 0.4], hemiSky: 0xc4ccd4, hemiGround: 0x4e4a38, hemiIntensity: 1.25, rimColor: 0xc4ccd2, rimIntensity: 0.25,
    terrain: {
      grass: '#58703a', grassAlt: '#4e6634', dryGrass: '#8a8858', dirt: '#6a5844', rock: '#86827a', strip: '#4e4232',
      pasture: '#5a7238', ploughed: '#6e5a46', stubble: '#8e8a58', meadow: '#64763e',
      farmX: [460, 600], farmZ: [520, 640], roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x7a6a54, 0.85];                                   // the clay roads
        if (y < 1.4 && away(x, z) < HW + 8) return [0x8a8676, 0.9];                  // the shingle by the water
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

  /** The two ridges' trench lines (two belts of wire, gaps at the roads), shell holes of the bombardment along each, Gorlice half burnt. */
  battlefield(game: any) {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato')]);   // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 20, belts: 2, gapEvery: 60 })) if (roadD(w.x, w.z) > 8) works.push(w);
      for (const bx of [-SIDE_X, 0, SIDE_X]) works.push({ kind: 'mgNest', x: bx + 16 * s, z: trenchZ(bx + 16 * s, f === 'nato') - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    const dens = (x: number, z: number) => { const dz = Math.abs(z) - 115; return 1.1 * Math.exp(-((dz / 50) ** 2)) + 0.04; };
    const blasts = [...shellField(1915, { x: 500, z: 560 }, dens).filter((b: number[]) => b[1] >= 0), ...shellField(1916, { x: 500, z: 560 }, dens).filter((b: number[]) => b[1] < 0)]
      .filter((b: number[]) => away(b[0], b[1]) > HW + 10 && !onRoad(b[0], b[1]) && points.every((p) => Math.hypot(p.x - b[0], p.z - b[1]) > 30));
    const r = mulberry32(1915);
    const ruins = game.buildings.list.filter((b: any) => Math.hypot(b.x, b.z - mid(b.x)) < 110 && r() < 0.3).map((b: any) => b.index);
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, r = 0) => away(x, z) < HW + 6 + r;
    const trenchBand = (x: number, z: number) => Math.abs(z - trenchZ(x, z > mid(x))) < 28;
    const skip = (x: number, z: number) => wet(x, z, 8) || roadD(x, z) < 8 || trenchBand(x, z);

    // Gorlice astride the Ropa: town houses on both banks round the bridge, the parish church on the north bank, the town hall on the south
    props.rand = mulberry32(1915_1);
    for (let i = 0, n = 0; n < 26 && i < 400; i++) {
      const a = props.rand() * Math.PI * 2, d = 22 + props.rand() * 62, x = Math.cos(a) * d * 1.3, z = mid(0) + Math.sin(a) * d;
      if (wet(x, z, 10) || roadD(x, z) < 7 || Math.abs(x - 34) + Math.abs(z - (mid(34) + 52)) < 22 || Math.abs(x + 30) + Math.abs(z - (mid(-30) - 48)) < 20) continue;
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2, width: 7 + props.rand() * 3, depth: 8, storeys: 1 + (props.rand() < 0.5 ? 1 : 0), damaged: 0.2 });
      n++;
    }
    props.church({ x: 34, z: mid(34) + 52, yaw: 0.05 });
    props.townHouse({ x: -30, z: mid(-30) - 48, yaw: Math.PI, width: 12, depth: 10, storeys: 2, name: 'town hall', damaged: 0.1 });
    // the oil wells: Glinik and Mariampol on the north bank, the Sękowa and Ropica wells on the south (as many each side)
    const wells = [[-SIDE_X + 40, mid(-SIDE_X + 40) + 78, 1], [-170, mid(-170) + 70, 1], [SIDE_X - 40, mid(SIDE_X - 40) - 84, 1], [180, mid(180) - 70, 1]];
    for (const [wx, wz, many] of wells) {
      const r = mulberry32(Math.round(wx * 7 + wz * 3) + 77);
      for (let k = 0, n = 0; n < (many ? 6 : 2) && k < 60; k++) {
        const x = wx + (r() - 0.5) * 90, z = wz + (r() - 0.5) * 70;
        if (skip(x, z) || Math.hypot(x - wx, z - wz) < 14) continue;
        derrick(props, x, z, 0); n++;   // (yaw 0: the legs' lean is set in world axes)
      }
      props.tanks({ x: wx + 30, z: wz + (wz > 0 ? 24 : -24), yaw: 0.3, count: 2, radius: 3, height: 5, color: 0x5a564e });
    }
    // the villages on the ridges and in the side valleys
    for (const p of points) {
      if ('AKF'.includes(p.id)) continue;
      const hill = p.id === 'C' || p.id === 'I';
      farmVillage(props, p.x, p.z, hill ? 4 : 7, 1915 * 10 + Math.round(p.x * 3 + p.z * 7), skip, hill ? 1.3 : 1);
    }
    // the war cemetery chapels on Pustki and Wiatrówki
    props.rand = mulberry32(1931);
    props.church({ x: 102, z: 262, yaw: 0.3 });
    props.church({ x: -134, z: -262, yaw: Math.PI + 0.3 });
    // farmsteads, field walls, hay and log piles over each side's fields
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'hay'];
    for (let tries = 0, n = 0; n < 120 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x, z - mid(x)) < 130 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) || Math.hypot(x * 0.77, z - mid(x)) < 95 }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.006 + 70, z * 0.006, 3) + 0.25 * smoothstep(120, 260, away(x, z)); // (beech and fir on the ridges)
    const tN = 0.12, tP = evenThreshold(wood, tN, (x, z) => z > mid(x));
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3800, hedges: 2200, autumn: 0, broadleaf: 0.6,
      forest: (x: number, z: number) => {
        if (wet(x, z, 3)) return -1;
        if (trenchBand(x, z)) return 0.04;
        if (away(x, z) < 45) return 0.2;                                     // willows along the Ropa
        return Math.abs(x) > 470 || wood(x, z) > (z > mid(x) ? tN : tP) ? 0.85 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
