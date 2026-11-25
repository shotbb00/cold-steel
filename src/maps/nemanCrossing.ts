// The Neman at Alytus, 2027 (a hypothetical war): the great river of Lithuania comes across the field in its wide
// meander belt — not cut down into a gorge here but loose on a broad floor of water meadows, swinging in loops and
// leaving its old bends behind as oxbow lakes. It comes in from the north-west, swings far south in the Alytus loop
// (an omega: the meadow inside it is the north bank's, a tongue of it reaching for the south) and back north, then
// winds out to the east. Only the southern bank has a bluff: the Dzūkija plateau breaks off in a low, steep sandy edge
// over the water, highest where the loop cuts into it under Alytus, its top under pine; the northern bank is the
// meadow floor rising gently to the farmland, with the glacial kames of the moraine standing up out of it. Three bridges:
// Alytus bridge across the bottom of the loop, Nemunaitis bridge in the west, Punia bridge in the east. Alytus stands on
// the bluff over its bridge (flats, a church), its northern quarter on the terrace across the neck; villages on both
// banks. NATO holds the south bank, Russia attacks from the north: whoever holds the bridges holds the river.
// Fairness by distance, not mirror: the loop brings the middle bridge near NATO, the river's run along the north on the
// flanks brings both flank bridges nearer Russia; each side has its town quarter, a village on each flank and a height
// (the bluff's pines for NATO, the kames over the meadows for Russia — the share of the high ground is even).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { theme2027, modernVillage, flats, coverSites, vegetation, powerLine } from './common2027.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const CACHE = { x: 580, z: 640 };
const BASE_Z = 500;
const HW = 22;
const noise = createNoise2D(2029);

/** A course through these points, smoothed (Catmull-Rom, every ~8 m). */
function smoothCourse(p: number[][]) {
  const out: number[][] = [];
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(p.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / 8));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (j: number) => 0.5 * (2 * b[j] + (c[j] - a[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t2 + (3 * b[j] - a[j] - 3 * c[j] + d[j]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  out.push(p[p.length - 1]);
  return out;
}
// the Neman, west to east: in from the north-west, the Alytus loop, out to the east in its smaller bends
const NEMAN = smoothCourse([[-660, -300], [-520, -262], [-420, -198], [-330, -168], [-240, -140], [-178, -78], [-158, 12], [-170, 100], [-120, 182],
  [-20, 214], [72, 172], [92, 82], [62, 0], [92, -70], [172, -112], [262, -102], [322, -146], [400, -172], [468, -112], [510, -30], [570, 30], [680, 50]]);
// the old bends cut off: one in the meadows north of the west run, one on the south bank east of the loop
const OXBOWS = [smoothCourse([[-300, -268], [-262, -318], [-196, -322], [-160, -276]]), smoothCourse([[198, 52], [222, 118], [288, 132], [336, 92]])];
const river = createRiver({
  paths: [NEMAN, ...OXBOWS.map((c) => c.map(([x, z]) => [x, z, 13]))], halfWidth: HW, level: 0, depth: 3.2, valley: 40,
  crossings: [
    { name: 'Nemunaitis bridge', x: -375, z: -183, kind: 'bridge', width: 14 },
    { name: 'Alytus bridge', x: -22, z: 214, kind: 'bridge', width: 16 },
    { name: 'Punia bridge', x: 435, z: -142, kind: 'bridge', width: 14 },
  ],
});
function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
/** Distance to the Neman's centre line and which bank (+1 south, -1 north), exact. */
function nemanExact(x: number, z: number) {
  let best = Infinity, bi = 0;
  for (let i = 0; i < NEMAN.length - 1; i += 1) { const d = segDist(x, z, NEMAN[i], NEMAN[i + 1]); if (d < best) { best = d; bi = i; } }
  const [ax, az] = NEMAN[bi], [bx, bz] = NEMAN[bi + 1];
  const side = (bx - ax) * (z - az) - (bz - az) * (x - ax) > 0 ? 1 : -1; // (flowing east, +z on the right: the south bank)
  return best * side;
}
/** signed distance to the Neman (+ south bank, - north) on a 4 m grid */
const nemanS = gridCacheSmooth(nemanExact, CACHE, 4);
const oxD = gridCacheSmooth((x: number, z: number) => Math.min(...OXBOWS.map((c) => { let d = Infinity; for (let i = 0; i < c.length - 1; i++) d = Math.min(d, segDist(x, z, c[i], c[i + 1])); return d; })), CACHE, 4);
/** distance to any water's centre line (an oxbow's from as far out as the river's banks) */
const away = (x: number, z: number) => Math.min(Math.abs(nemanS(x, z)), oxD(x, z) + HW - 13);

const pt = (id: string, name: string, x: number, z: number, sector: 'west' | 'centre' | 'east', o: { radius?: number } = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  pt('A', 'Simnas road', 0, 470, 'centre'),
  pt('B', 'Miroslavas', -425, 215, 'west'),
  pt('C', 'Alytus (south)', -45, 315, 'centre'),
  pt('D', 'Daugai', 265, 385, 'east'),
  pt('E', 'Nemunaitis bridge', -375, -183, 'west', { radius: 22 }),
  pt('F', 'Alytus bridge', -22, 214, 'centre', { radius: 24 }),
  pt('G', 'Punia bridge', 435, -142, 'east', { radius: 22 }),
  pt('H', 'Butrimonys', -300, -350, 'west'),
  pt('I', 'Alytus (north)', 30, -215, 'centre'),
  pt('J', 'Punia', 305, -300, 'east'),
  pt('K', 'Prienai road', 0, -470, 'centre'),
];
const at = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- roads: the Simnas–Prienai road through Alytus over the loop's bridge and up the meadow tongue; the flank roads to
// the Nemunaitis and Punia bridges; the north bank's road along the terrace
const ROADS: number[][][] = [
  [[0, 640], [0, BASE_Z], [-30, 400], at('C'), [-25, 262], at('F'), [-20, 160], [-45, 60], [-35, -60], [10, -160], at('I'), [0, -380], [0, -BASE_Z], [0, -640]],
  [[0, BASE_Z], [-200, 420], at('B'), [-430, 60], [-380, -120], at('E'), [-372, -250], at('H'), [-150, -440], [0, -BASE_Z]],
  [[0, BASE_Z], [150, 440], at('D'), [400, 230], [420, 40], [405, -108], at('G'), [462, -175], [420, -260], at('J'), [150, -440], [0, -BASE_Z]],
  [[-380, -250], [-200, -230], [-35, -60]], [[420, -260], [200, -215], at('I')],                                      // the north bank's terrace road
  [[-45, 60], [60, 40]],                                                                                               // the meadow lane
];
const roadDist = gridCacheSmooth((x: number, z: number) => {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}, CACHE, 4);

// ---- the ground
/** how far back from the water the south bank's bluff stands: at the water's edge round the loop, back behind meadows elsewhere */
const bluffAt = (x: number, z: number) => HW + 10 + 110 * smoothstep(120, 330, Math.hypot((x + 40) * 0.8, z - 150)) * (0.7 + 0.3 * noise(x * 0.004, 3.1));
/** the kames on the north bank: [x, z, radius, height] */
const KAMES = [[-130, -340, 64, 23], [150, -330, 60, 22], [-430, -430, 72, 20], [420, -360, 64, 21], [-15, -110, 42, 8], [215, -225, 42, 10]];
function groundExact(x: number, z: number) {
  const s = nemanS(x, z), d = Math.abs(s), ox = oxD(x, z);
  let h: number;
  if (s > 0) {                                                                                  // the south bank: meadow, then the bluff up to the plateau
    const b = bluffAt(x, z);
    h = 1.2 + 11 * smoothstep(b, b + 30, d) + 3 * fbm(noise, x * 0.006, z * 0.006, 3) * smoothstep(b, b + 80, d);
  } else {                                                                                      // the north bank: the meadow floor rising gently to the fields
    h = 1.2 + 6.5 * smoothstep(HW + 40, HW + 320, d) + 1.5 * fbm(noise, x * 0.006 + 40, z * 0.006, 3) * smoothstep(HW + 30, HW + 120, d);
    for (const [kx, kz, r, a] of KAMES) h += a * Math.exp(-Math.pow(((x - kx) ** 2 + (z - kz) ** 2) / (r * r), 1.3));
  }
  h += 0.5 * fbm(noise, x * 0.03, z * 0.03, 2);
  h += (1.1 - h) * smoothstep(HW + 45, HW + 10, ox + HW - 13) * 0.8;                           // the oxbows lie in their own hollows
  // the roads down the bluff: a cutting
  h += (Math.min(h, 1.2 + Math.max(0, d - HW - 10) * 0.12) - h) * smoothstep(16, 6, roadDist(x, z));
  h += smoothstep(BOUNDS.x - 10, BOUNDS.x + 110, Math.abs(x)) * 8 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 6;
  return h;
}
/** Each side's strip on its own bank behind its base (the plateau's fields, the northern terrace). Tower 55 m off the strip. */
const AIRFIELDS = [
  { faction: 'nato', x: -250, z: 470, yaw: Math.PI / 2, large: false, name: 'Alytus strip' },
  { faction: 'pact', x: 220, z: -470, yaw: -Math.PI / 2, large: false, name: 'Prienai strip' },
];
/** How far outside the strips' ground: < 0 inside. */
const airD = (x: number, z: number) => Math.max(Math.abs(x - (z > 0 ? -250 : 220)) - 150, Math.abs(Math.abs(z) - 497) - 58);
const AIR_H = [groundExact(-250, 497), groundExact(220, -497)];
const ground = gridCacheSmooth((x: number, z: number) => { const h = groundExact(x, z); return h + ((z > 0 ? AIR_H[0] : AIR_H[1]) - h) * smoothstep(24, 0, airD(x, z)); }, CACHE, 2);
const BASE_H = [groundExact(0, BASE_Z), groundExact(0, -BASE_Z)];
function height(x: number, z: number) {
  let h = ground(x, z);
  h += (BASE_H[0] - h) * smoothstep(28, 15, Math.hypot(x, z - BASE_Z));
  h += (BASE_H[1] - h) * smoothstep(28, 15, Math.hypot(x, z + BASE_Z));
  return river.carve(x, z, Math.max(1.2, h));
}
/** the Dzūkija pines on the south plateau (sand), patchy */
const pinesK = gridCache((x: number, z: number) => {
  const s = nemanS(x, z);
  if (s <= 0) return 0;
  return smoothstep(bluffAt(x, z) + 10, bluffAt(x, z) + 40, s) * smoothstep(0.05, 0.25, noise(x * 0.006 + 300.5, z * 0.006 - 77.2) + 0.15);
}, CACHE, 4);

const layout = [{ unit: 'rifles', x: 12, z: 454, name: '1st Platoon' }];

export default {
  id: 'neman-crossing',
  name: 'Neman Crossing',
  epochs: ['2027'],
  description: 'The Neman loose on its water meadows at Alytus: the great Alytus loop, oxbow lakes, a sandy bluff under pine on the south bank only — and three bridges. Hold them, blow them, or lay your own.',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 2029,
  height,
  airfields: AIRFIELDS,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  fields: createFields({ seed: 2029, cell: 76 }),

  theme: theme2027({
    fogDensity: 0.0017, clouds: 0.6, sunIntensity: 2.0,
    terrain: {
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (roadDist(x, z) < 4) return [0x3c3d3f, 1];                                               // asphalt
        const a = away(x, z);
        if (a < HW + 4 && y < 1.6) return [0x8a7e5e, 0.6];                                         // sand at the water
        if (y < 2.4 && a < 260) return [noise(x * 0.02, z * 0.02) > 0.2 ? 0x6e7a40 : 0x5e6c3a, 0.75 * smoothstep(2.4, 1.8, y)]; // the water meadows
        const s = nemanS(x, z);
        if (s > 0 && Math.abs(s - bluffAt(x, z) - 17) < 15) return [0xa08e64, 0.45];                // the bluff's sandy face
        return null;
      },
    },
  }),

  bases: { nato: { x: 0, z: BASE_Z, entries: [-40, 0, 40] }, pact: { x: 0, z: -BASE_Z, entries: [-40, 0, 40] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const wet = (x: number, z: number, r = 0) => away(x, z) < HW + 6 + r;
    const skip = (x: number, z: number, r: number) => wet(x, z, r) || roadDist(x, z) < 6 + r || airD(x, z) < 10 + r;

    // Alytus on the bluff over its bridge (flats along the edge, houses behind), the northern quarter across the neck
    props.rand = mulberry32(2901);
    const r = props.rand;
    for (const [x, z] of [[-130, 290], [-90, 345], [40, 300], [80, 345], [-150, 360], [20, 380], [120, 290], [-60, 395],
      [-60, -300], [80, -310], [-30, -360], [110, -250], [-90, -230], [60, -380]]) {
      if (!skip(x, z, 14) && !nearPoint(x, z, 30)) flats(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, storeys: 4 + Math.floor(r() * 3), width: 36, depth: 11 });
    }
    for (let i = 0; i < 40; i++) {
      const north = i % 2, x = (north ? 30 : -45) + (r() - 0.5) * 260, z = north ? -245 + (r() - 0.5) * 180 : 330 + (r() - 0.5) * 150;
      if (!skip(x, z, 6) && !nearPoint(x, z, 12)) props.townHouse({ x, z, yaw: r() * 3, width: 9, depth: 9, storeys: 2, damaged: 0 });
    }
    props.church({ x: 25, z: 262, yaw: 0 });
    props.church({ x: -20, z: -300, yaw: Math.PI });
    // villages on the flanks, each its own
    for (const p of points) {
      if ('ACFIKEG'.includes(p.id)) continue;
      props.rand = mulberry32(2950 + Math.round(p.x * 3 + p.z));
      modernVillage(props, p, 1, 0, { skip, church: p.id === 'B' || p.id === 'J' });
    }
    // the bridgeheads: barricades and hedgehogs either end
    props.rand = mulberry32(2977);
    for (const c of river.crossings) for (const end of [1, -1]) {
      const yaw = river.yawOf(c) + (end > 0 ? 0 : Math.PI);
      const j1 = river.at(c, -7 * end, end * (HW + 26)), j2 = river.at(c, 8 * end, end * (HW + 30));
      props.jersey({ x: j1.x, z: j1.z, yaw: yaw + Math.PI / 2 + 0.2, length: 5 });
      props.jersey({ x: j2.x, z: j2.z, yaw: yaw + Math.PI / 2 - 0.15, length: 4 });
      for (const du of [-14, 14]) { const q = river.at(c, du, end * (HW + 34)); if (!nearPoint(q.x, q.z, 6)) props.hedgehog({ x: q.x, z: q.z }); }
    }
    coverSites(props, rand, bounds, (x, z) => away(x, z) > HW + 30 && Math.hypot(x, Math.abs(z) - BASE_Z) > 40 && !nearPoint(x, z, 40) && !skip(x, z, 8), 240, undefined, buildSite, false);
    const rotors = [[-450, 390], [300, 500], [-260, -500], [440, -470]].map(([x, z]) => props.windTurbine({ x, z, yaw: 0.5 }));
    // a power line behind each front (each its own course; the other half of each call is skipped)
    powerLine(props, 2988, (x) => 445 + x * 0.04, (x, z) => z < 0 || nearPoint(x, z, 25) || skip(x, z, 6));
    powerLine(props, 2989, (x) => 410 + x * 0.06 + 18 * Math.sin(x * 0.01), (x, z) => z > 0 || nearPoint(x, z, 25) || skip(x, z, 6));
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5a3a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 10 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: HW + 14 })), { test: (x: number, z: number) => wet(x, z, -4) || roadDist(x, z) < 6 || airD(x, z) < 12 }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 5200, broadleaf: 0.4,
      noHedge: (x: number, z: number) => away(x, z) < 200 && terrain.heightAt(x, z) < 2.6,
      forest: (x: number, z: number) => {
        const a = away(x, z);
        if (a < HW + 2) return -1;
        if (a < HW + 16) return 0.6;                                                            // alder and willow along the water
        if (pinesK(x, z) > 0.3) return 0.85;                                                    // the Dzūkija pines
        const s = nemanS(x, z);
        if (s > 0 && Math.abs(s - bluffAt(x, z) - 17) < 16) return 0.7;                         // the bluff's wooded face
        for (const [kx, kz, kr] of KAMES) if (Math.hypot(x - kx, z - kz) < kr * 0.7) return 0.6; // birch on the kames
        return 0;
      },
    });
    return {
      buildings: props.buildings,
      update(dt, t) { update(dt, t); for (const q of rotors) q.userData.spin.rotation.z -= dt * 0.9; },
    };
  },
} satisfies MapDef;
