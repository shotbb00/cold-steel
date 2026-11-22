// Nieuport, 10 July 1917: Operation Strandfest. Where the Western Front met the North Sea the line ran along the Yser,
// and at its mouth the British (1st Division, who had just taken over the sector from the French) held a bridgehead on
// the far bank — in the dunes by Nieuport-Bains and in front of Lombartzyde, joined to the town by a handful of
// floating and fixed bridges they named after the bridges of London. The German Marinekorps Flandern struck first:
// a day of gas and heavy shelling broke every bridge behind the bridgehead, then at dusk the Marine storm troops went
// in with flamethrowers through the dunes and wiped the two battalions out against the river. Behind the town the
// Goose Foot (Ganzepoot), the knot of sluices where the Yser and the canals meet, had been opened in October 1914
// to let the sea into the polders, and the land inland lay drowned for four years.
// On the map: the sea down the west edge, the beach and the dunes behind it (concrete bunkers in them), the Yser
// across the middle out to its mouth between the harbour piers, the Goose Foot sluices in the centre, a canal running
// back from them into each half (the Furnes canal into the British, the Plassendale canal into the German), the ruins
// of Nieuport and Lombartzyde, the bathing resorts of Nieuport-Bains and Westende-Bains in the dunes, Ramscappelle and
// Mannekensvere on the edge of the inundation, which drowns the east flank on both sides of the river (water too deep
// to wade). The river and the canals are crossed only on the bridges: Putney Bridge (floating, in the dunes), the
// sluices at the Goose Foot, Vauxhall Bridge (floating, on the polder side), and a fixed bridge over each canal.
// Not mirrored but fair: the river is no man's land and each side holds its bank, in the same trench line at the same
// depth; both halves have the sea, the dunes and the flood on the same flanks, so neither owns the high dunes; Putney
// Bridge's point lies on the British bank and Vauxhall Bridge's on the German, each as near its own base; each side
// has a canal across one of its own wings — the British must bridge the Furnes canal to reach the dunes, the
// Germans the Plassendale canal to reach the flood side — with the same three roads from each base, one over its canal,
// a town at the same reach, the same number of bunkers.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createSea } from '../world/Sea.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, shellField } from './common.js';
import { farmVillage } from './greatWarHelpers.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const SEED = 1917_07;
const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const HW = 15;          // the Yser's half-width (wider toward its mouth)
const CW = 7;           // the canals'
const BANK = 45;        // each side's fire trench, m off the river's middle
const noise = createNoise2D(SEED);
const duneNoise = createNoise2D(SEED + 7);

/** The Yser's middle (z at x): its own bends, not a mirror. */
const mid = (x: number) => 14 * Math.sin(x * 0.0052 + 0.6) + 7 * Math.sin(x * 0.013 + 1.9) - 6;
const riverHW = (x: number) => HW + 20 * smoothstep(-360, -470, x);
/** The waterline down the west edge, and the edge of the inundation down the east. */
const shoreX = (z: number) => -448 + 6 * Math.sin(z * 0.009) + 4 * Math.sin(z * 0.023 + 1);
const floodX = (z: number) => 410 + 20 * Math.sin(z * 0.011 + 0.8) + 9 * Math.sin(z * 0.027);

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}): ControlPointDef =>
  ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const POINTS: ControlPointDef[] = [
  P('A', 'Coxyde road', 0, 470, 'centre'),
  P('B', 'Nieuport-Bains', -350, 250, 'west'),
  P('C', 'Nieuport', -30, 200, 'centre', { radius: 30 }),
  P('D', 'Ramscappelle', 310, 340, 'east'),
  P('E', 'Putney Bridge', -290, Math.round(mid(-290) + 50), 'west', { radius: 24 }),
  P('F', 'Goose Foot', 0, Math.round(mid(0)), 'centre', { radius: 24 }),
  P('G', 'Vauxhall Bridge', 250, Math.round(mid(250) - 50), 'east', { radius: 24 }),
  P('H', 'Westende-Bains', -330, -260, 'west'),
  P('I', 'Lombartzyde', 80, -200, 'centre', { radius: 30 }),
  P('J', 'Mannekensvere', 330, -330, 'east'),
  P('K', 'Westende road', 0, -470, 'centre'),
];
const at = (id: string) => { const p = POINTS.find((q) => q.id === id)!; return [p.x, p.z]; };

/** The canals from the Goose Foot: the Furnes canal back into the British half, the Plassendale canal into the German. */
const CANALS = [
  [[-45, mid(-45)], [-70, 120], [-150, 300], [-200, 660]],
  [[45, mid(45)], [110, -120], [200, -300], [220, -660]],
];
/** The roads: per side one over its canal to a wing, one from its town to that wing's bridge, one to the other wing; the dune road, the centre road and the east road right through. */
const ROADS = [
  [[-300, 660], [-320, 430], at('B'), [-320, 140], at('E'), [-290, mid(-290) - 45], [-315, -140], at('H'), [-315, -430], [-300, -660]],
  [[0, 660], at('A'), [-20, 330], at('C'), [-5, 90], at('F'), [10, -90], [50, -170], at('I'), [40, -370], at('K'), [0, -660]],
  [[300, 660], [310, 470], at('D'), [280, 200], [255, 110], [250, mid(250) + 45], at('G'), [270, -150], at('J'), [310, -470], [300, -660]],
  [at('A'), [-100, 410], [-210, 330], at('B')],     // over the Furnes canal
  [at('C'), [-150, 130], at('E')],
  [at('C'), [150, 240], at('D')],
  [at('K'), [150, -420], at('J')],                  // over the Plassendale canal
  [at('I'), [170, -150], at('G')],
  [at('I'), [-150, -250], at('H')],
];

/** Distance from (x, z) to the nearest of the polylines (no Math.hypot in the loop: the terrain asks this a lot). */
const minD = (polys: number[][][], x: number, z: number) => {
  let best = Infinity;
  for (const poly of polys) for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i], b = poly[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)), ex = x - a[0] - dx * t, ez = z - a[1] - dz * t;
    best = Math.min(best, ex * ex + ez * ez);
  }
  return Math.sqrt(best);
};
const roadD = (x: number, z: number) => minD(ROADS, x, z);
const canalD = (x: number, z: number) => minD(CANALS, x, z);
const riverD = (x: number, z: number) => Math.abs(z - mid(x));

/** How far into the dune belt (0..1), and each half's dunes their own height (fair share of the high ground). */
const duneK = (x: number, z: number) => { const inl = x - shoreX(z); return smoothstep(25, 55, inl) * (1 - smoothstep(170, 235, inl)); };
const DUNE_TALL = { nato: 1, pact: 1 };

/** The ground before the bridges: polder, beach and dunes, the sea, the flood, the river and canals cut into it. */
function ground(x: number, z: number) {
  let h = 2.2 + fbm(noise, x * 0.004, z * 0.004, 3) * 0.7 + fbm(noise, x * 0.03 + 5, z * 0.03, 2) * 0.15; // the polder: flat, a metre or two over the water
  const inl = x - shoreX(z);
  if (inl < 0) h = Math.max(-8, -0.6 + inl * 0.07);                                                          // the sea
  else {
    if (inl < 45) h += (0.4 + inl * 0.04 - h) * (1 - smoothstep(25, 45, inl));                              // the beach
    const k = duneK(x, z);
    if (k > 0) {
      const n = 0.5 + 0.5 * fbm(duneNoise, x * 0.011, z * 0.011, 3), ridge = Math.abs(fbm(duneNoise, x * 0.03 + 9, z * 0.022, 2));
      let d = (3 + 9 * n + 3 * (1 - ridge)) * (z > mid(x) ? DUNE_TALL.nato : DUNE_TALL.pact);
      d += 3 * smoothstep(60, 40, Math.abs(inl - 65));                                                   // the fore-dune behind the beach
      d *= smoothstep(riverHW(x) + 10, riverHW(x) + 85, riverD(x, z)) * smoothstep(5, 20, roadD(x, z));   // (the river mouth and the sanded roads lie in the dune valleys)
      h += d * k;
    }
  }
  h += (-1.4 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.2 - h) * smoothstep(floodX(z) - 12, floodX(z) + 12, x); // the inundation: drowned meadows
  const rd = riverD(x, z), hw = riverHW(x);
  h = Math.min(h, -3 + (h + 3) * smoothstep(hw - 5, hw + 7, rd));                                           // the Yser
  const cd = canalD(x, z);
  if (cd < CW + 6) h = Math.min(h, -2.5 + (h + 2.5) * smoothstep(CW - 3, CW + 5, cd));                     // the canals, between their quays
  return h;
}

/** The bridges: wherever a road crosses water. Floating ones in the river (Putney, Vauxhall), the sluices at the Goose Foot, a fixed bridge over each canal. */
interface Span { ax: number; az: number; bx: number; bz: number; len: number; w: number; deck: number; kind: 'floating' | 'sluice' | 'fixed'; name: string }
const SPANS: Span[] = [];
for (const road of ROADS) {
  let start: number[] | null = null, last: number[] = road[0];
  const close = () => {
    if (!start) return;
    const len0 = Math.hypot(last[0] - start[0], last[1] - start[1]) || 1, ux = (last[0] - start[0]) / len0, uz = (last[1] - start[1]) / len0;
    const ax = start[0] - ux * 3, az = start[1] - uz * 3, bx = last[0] + ux * 3, bz = last[1] + uz * 3, mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const river = riverD(mx, mz) < riverHW(mx) + 10;
    const kind = !river ? 'fixed' : Math.abs(mx) < 60 ? 'sluice' : 'floating';
    const name = !river ? (mz > 0 ? 'Furnes canal bridge' : 'Plassendale canal bridge') : kind === 'sluice' ? 'Goose Foot sluices' : mx < 0 ? 'Putney Bridge' : 'Vauxhall Bridge';
    SPANS.push({ ax, az, bx, bz, len: Math.hypot(bx - ax, bz - az), w: kind === 'sluice' ? 30 : 9, deck: kind === 'floating' ? 0.7 : 2.4, kind, name });
    start = null;
  };
  for (let i = 0; i < road.length - 1; i++) {
    const [ax, az] = road[i], [bx, bz] = road[i + 1], len = Math.hypot(bx - ax, bz - az);
    for (let t = 0; t < len; t += 1) {
      const x = ax + (bx - ax) * t / len, z = az + (bz - az) * t / len;
      if (ground(x, z) < 0.8) { if (!start) start = [x, z]; last = [x, z]; } else close();
    }
  }
  close();
}
/** (x, z) in span s's frame: u along it from a, v across. */
const spanUV = (s: Span, x: number, z: number) => {
  const ux = (s.bx - s.ax) / s.len, uz = (s.bz - s.az) / s.len, dx = x - s.ax, dz = z - s.az;
  return [dx * ux + dz * uz, dx * uz - dz * ux];
};
const onSpan = (x: number, z: number, pad = 0) => SPANS.find((s) => { const [u, v] = spanUV(s, x, z); return u > -pad && u < s.len + pad && Math.abs(v) < s.w / 2 + pad; });

const PH = POINTS.map((p) => ground(p.x, p.z));
function height(x: number, z: number) {
  let h = ground(x, z);
  POINTS.forEach((p, i) => { if (PH[i] < 0.8) return; const d2 = (x - p.x) ** 2 + (z - p.z) ** 2; if (d2 < 2500) h += (PH[i] - h) * smoothstep(50, 24, Math.sqrt(d2)) * 0.7; });
  for (const bz of [BASE_Z, -BASE_Z]) h += (2.6 - h) * smoothstep(36, 18, Math.hypot(x, z - bz));
  for (const s of SPANS) {
    const [u, v] = spanUV(s, x, z);
    if (Math.abs(v) > s.w / 2 + 1.5 || u < -14 || u > s.len + 14) continue;
    const along = Math.max(-u, u - s.len, 0), target = along === 0 ? s.deck : s.kind === 'floating' ? -9 : s.deck - along * 0.15;
    h += (Math.max(h, target) - h) * smoothstep(s.w / 2 + 1.5, s.w / 2, Math.abs(v));
  }
  return h;
}

/** Soft ground (world/Nav.js, UnitStack): the dune sand drags at wheels, the churned strip by the river at everything; worked out once per 4 m cell. */
const SC = 4, SNX = Math.ceil((BOUNDS.x + 60) * 2 / SC), SNZ = Math.ceil((BOUNDS.z + 60) * 2 / SC);
let softV: Float32Array | null = null, softF: Float32Array | null = null;
const churnK = (x: number, z: number) => 1 - smoothstep(90, 170, riverD(x, z));
function softGrid() {
  const V = new Float32Array(SNX * SNZ), F = new Float32Array(SNX * SNZ);
  for (let j = 0; j < SNZ; j++) for (let i = 0; i < SNX; i++) {
    const x = -BOUNDS.x - 60 + (i + 0.5) * SC, z = -BOUNDS.z - 60 + (j + 0.5) * SC, k = j * SNX + i;
    if (roadD(x, z) < 4.5 || onSpan(x, z)) { V[k] = F[k] = 1; continue; }
    const sand = smoothstep(15, 50, x - shoreX(z)) * (1 - smoothstep(200, 240, x - shoreX(z))), c = churnK(x, z);
    V[k] = Math.max(0.3, 1 - 0.4 * sand - 0.3 * c - 0.1);
    F[k] = Math.max(0.6, 1 - 0.15 * sand - 0.15 * c);
  }
  softV = V; softF = F;
}
function soft(x: number, z: number, foot: boolean) {
  if (!softV) softGrid();
  const i = Math.floor((x + BOUNDS.x + 60) / SC), j = Math.floor((z + BOUNDS.z + 60) / SC);
  if (i < 0 || j < 0 || i >= SNX || j >= SNZ) return 1;
  return (foot ? softF! : softV!)[j * SNX + i];
}

/** The bunkers (concrete MEBUs and the British dune shelters): five on each half, in the dunes and behind each bank. */
const BUNKERS = [
  [-392, 118], [-345, 150], [-222, 98], [-130, 100], [120, 98],
  [-385, -108], [-318, -140], [-228, -92], [-100, -98], [190, -118],
];

/** One water sheet at the sea's level over the map (the sea, the river, the canals and the flood): water that stops, as a river's does. */
const water = {
  ...createSea({ level: 0, size: 1600 }),
  sea: false,
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x52625c, roughness: 0.25, metalness: 0.2, transparent: true, opacity: 0.85 });
    mat.userData.waterSurface = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000, 1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    m.userData.noAO = true;
    scene.add(m);
  },
};

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'nieuport',
  name: 'Nieuport',
  description: 'July 1917, Operation Strandfest: where the trenches met the North Sea, the Yser mouth between the dunes, the ruins of Nieuport and Lombartzyde, the Goose Foot sluices, and the flooded polders on the inland flank. The river and the canals are crossed only on the bridges.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['uk'], pact: ['de', 'st'] }, // (the British 1st Division against the Marinekorps Flandern and its storm troops)
  conditions: { time: 'dusk', weather: 'clear' }, // (the Marines went in at half past seven in the evening, after a day of shelling)
  airfields: [],                                  // (systems/Airfields.js: dunes, drowned polder and shell holes — the squadrons fly from Dunkirk)
  size: 1600, segments: 640, bounds: BOUNDS, seed: SEED,
  height,
  soft,
  river: water,
  fields: createFields({ seed: SEED, cell: 72, weights: [0.55, 0.1, 0.05, 0.3] as any }),
  theme: {
    // a summer evening on the Flemish coast: sea haze, a pale sky, the sun low over the water
    fogColor: 0xb4b6ae, fogDensity: 0.0015, skyTop: 0x6a86a2, skyHorizon: 0xd8cfb8, skyBottom: 0x8a8a7e,
    sunColor: 0xffdcb0, sunIntensity: 1.7, sunDisk: 0.3, clouds: 0.45, cloudLight: 0xeee2cc, cloudDark: 0x7e8690,
    sunDir: [-0.85, 0.3, 0.2], hemiSky: 0xc4ccd4, hemiGround: 0x6a6448, hemiIntensity: 1.3, rimColor: 0xe0c8a8, rimIntensity: 0.3,
    terrain: {
      grass: '#5c6a38', grassAlt: '#526034', dryGrass: '#9a9460', dirt: '#6a5a44', rock: '#a29a86', strip: '#5a4a36',
      pasture: '#5a6a36', ploughed: '#6e6048', stubble: '#a49660', meadow: '#627040',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-300, 0, 300], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        const s = onSpan(x, z);
        if (s) return [s.kind === 'floating' ? 0x5c4a34 : 0x7a766c, 0.95];                       // the decks (the planks themselves: decorate)
        if (y < 0.4) return [0x4a4636, 0.95];                                                    // under the water: grey silt
        const inl = x - shoreX(z);
        if (inl < 45) return [y < 1 ? 0xb0a283 : 0xd6caa6, 0.95];                                 // the beach, wet below the tide line
        const rd = roadD(x, z);
        if (rd < 3.2) return [inl < 240 ? 0xbcae8a : 0x8a7c62, 0.9];                                // sanded dune roads, cobbled polder roads
        if (canalD(x, z) < CW + 4) return [0x8a8478, 0.9];                                       // the canal quays
        const n = fbm(noise, x * 0.03, z * 0.03, 2), k = duneK(x, z);
        if (k > 0.1) return [n > 0.15 ? 0xd2c49c : 0xc2b68e, Math.min(0.95, k * 1.2)]; // the dunes' sand through the marram
        const c = churnK(x, z);
        if (c > 0) return [n > 0.1 ? 0x544636 : 0x605040, Math.min(0.9, c * (0.65 + n * 0.4))];   // shell-churned ground along the river
        return null;
      },
    },
  },
  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points: POINTS,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** A week of shelling: craters thickest along the river, each side's trench and wire along its bank, the towns in ruins. */
  battlefield(game: any) {
    const dens = (x: number, z: number) => 2.4 * (1 - smoothstep(60, 140, riverD(x, z))) + 0.9 * churnK(x, z) + 0.06;
    const nearB = (x: number, z: number, r: number) => BUNKERS.some(([bx, bz]) => Math.hypot(bx - x, bz - z) < r);
    const keep = (b: number[]) => roadD(b[0], b[1]) > b[2] * 0.5 + 5 && !onSpan(b[0], b[1], 6) && ground(b[0], b[1]) > 1.2 && canalD(b[0], b[1]) > CW + 8
      && !nearB(b[0], b[1], b[2] * 0.5 + 6) && Math.hypot(b[0], Math.abs(b[1]) - BASE_Z) > 50;
    const clamp = (b: number[]) => [b[0], b[1], b[2], Math.max(0.2, Math.min(b[3], height(b[0], b[1]) - 0.4))];
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(SEED + 1, BOUNDS, dens).filter((b) => b[1] < 0)].filter(keep).map(clamp);
    const ruins = game.buildings.list.filter((b: any) => b.name !== 'bunker' && Math.abs(b.z) < 400 && mulberry32(b.index * 7 + SEED)() < (riverD(b.x, b.z) < 280 ? 0.92 : 0.6)).map((b: any) => b.index);
    const works: any[] = [];
    const clear = (w: any) => roadD(w.x, w.z) > 8 && !onSpan(w.x, w.z, 8) && ground(w.x, w.z) > 1 && canalD(w.x, w.z) > CW + 6 && !nearB(w.x, w.z, 8);
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1, pts: number[][] = [];
      for (let x = -470; x <= 470; x += 24) pts.push([x * s, mid(x * s) + BANK * s]);                       // (left to right as its owner looks)
      works.push(...trenchLine(pts, f, { wireAt: 16, belts: 1, gapEvery: 50 }).filter(clear));
    }
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearB = (x: number, z: number, r: number) => BUNKERS.some(([bx, bz]) => Math.hypot(bx - x, bz - z) < r);
    const wet = (x: number, z: number) => ground(x, z) < 1.2 || canalD(x, z) < CW + 7 || riverD(x, z) < riverHW(x) + 8;
    const skip = (x: number, z: number) => roadD(x, z) < 9 || wet(x, z) || nearB(x, z, 14) || !!onSpan(x, z, 10);
    const concrete = 0x8a877c;

    // the bunkers: low boxes of reinforced concrete, slits all round, sand banked over them
    for (const [x, z] of BUNKERS) {
      props.rand = mulberry32(Math.round(x * 13 + z));
      const b = props.beginBuilding('bunker', x, z, (props.rand() - 0.5) * 0.5 + (z > 0 ? Math.PI : 0), 7, 6);
      b.plaster = concrete;
      props.shell(b, { height: 2.1, key: 'stone', color: concrete, t: 0.9, bay: 2.3, sill: 1.15, head: 1.45, frame: 0x6e6b62, front: [], back: [1.6] });
      props.piece('stone', b, 0, 2.45, 0, 7.4, 0.7, 6.4, 0x7e7b70);
      props.piece('plain', b, 0, 2.85, 0.4, 6.2, 0.25, 4.8, 0xbcb08c);
      props.endBuilding();
    }

    // Nieuport: rows of brick town houses round the market, the Templars' tower, the cloth hall's church — all shot to pieces
    const town = (cx: number, cz: number, r: number, seed: number, storeys: number) => {
      props.rand = mulberry32(seed);
      for (let gx = -4; gx <= 4; gx++) for (let gz = -4; gz <= 4; gz++) {
        const x = cx + gx * 15 + (props.rand() - 0.5) * 4, z = cz + gz * 14 + (props.rand() - 0.5) * 4;
        if (Math.hypot(x - cx, z - cz) > r || Math.hypot(x - cx, z - cz) < 16 || skip(x, z)) continue;
        props.townHouse({ x, z, yaw: (props.rand() < 0.5 ? 0 : Math.PI / 2) + (props.rand() - 0.5) * 0.08, width: 7 + props.rand() * 2, depth: 8, storeys: storeys + (props.rand() < 0.3 ? 1 : 0), damaged: 0.6 });
      }
    };
    town(at('C')[0], at('C')[1], 62, SEED + 11, 2);
    props.rand = mulberry32(SEED + 3);
    {
      const [cx, cz] = at('C'), tx = cx + 22, tz = cz - 24, tg = terrain.heightAt(tx, tz);              // the Templars' tower: a broken stump of brick
      props.box('stone', tx, tg + 5, tz, 6, 10, 6, 0.2, 0x8a5a44, 0.03, -0.02);
      props.box('stone', tx + 1, tg + 11, tz - 0.6, 3, 2.4, 3.4, 0.5, 0x7e5442, 0.15, 0.1);
      cover.addBox({ x: tx, z: tz, yaw: 0.2, length: 6, thickness: 6, height: 10 });
      props.church({ x: cx - 30, z: cz + 30, yaw: Math.PI / 2 });
      for (let i = 0; i < 10; i++) props.rubble(cx + (props.rand() - 0.5) * 70, cz + (props.rand() - 0.5) * 70, 0.4 + props.rand() * 0.6);
    }
    // the bathing resorts in the dunes: seaside villas
    town(at('B')[0], at('B')[1], 46, SEED + 12, 2);
    town(at('H')[0], at('H')[1], 46, SEED + 13, 2);
    // Lombartzyde and the polder villages
    farmVillage(props, at('I')[0], at('I')[1], 10, SEED + 21, skip, 1.4);
    town(at('I')[0], at('I')[1], 34, SEED + 14, 1);
    props.rand = mulberry32(SEED + 22);
    props.church({ x: at('I')[0] + 30, z: at('I')[1] - 28, yaw: 0.2 });
    farmVillage(props, at('D')[0], at('D')[1], 7, SEED + 23, skip, 1.1);
    farmVillage(props, at('J')[0], at('J')[1], 7, SEED + 24, skip, 1.1);
    props.rand = mulberry32(SEED + 25);
    props.church({ x: at('D')[0] - 26, z: at('D')[1] + 24, yaw: Math.PI });
    props.church({ x: at('J')[0] + 24, z: at('J')[1] - 26, yaw: 0 });
    // drowned farms out in the inundation, the water to the window sills (each half its own)
    for (const [x, z, yaw] of [[455, 230, 0.3], [470, 60, 1.2], [450, -150, 2.1], [462, -360, 0.7]]) props.house({ x, z, yaw, width: 9, depth: 7 });

    // the Goose Foot: stone sluice piers across the river under the road, the gates between them, the lock-keeper's house
    {
      const s = SPANS.find((q) => q.kind === 'sluice');
      if (s) {
        const yaw = Math.atan2(s.bx - s.ax, s.bz - s.az);
        for (let u = 4; u < s.len - 3; u += 5.5) {
          const x = s.ax + (s.bx - s.ax) * u / s.len, z = s.az + (s.bz - s.az) * u / s.len;
          for (const side of [-1, 1]) props.box('stone', x + Math.cos(yaw) * side * (s.w / 2 + 0.6), 1.2, z - Math.sin(yaw) * side * (s.w / 2 + 0.6), 2.2, 4.4, 1.6, yaw, 0x8e887a);
          for (const side of [-1, 1]) props.box('plain', x + Math.cos(yaw) * side * (s.w / 2 + 0.4), 3.2, z - Math.sin(yaw) * side * (s.w / 2 + 0.4), 1.2, 0.5, 4, yaw, 0x3e3a32); // the gate winches
        }
        for (const side of [-1, 1]) props.box('stone', (s.ax + s.bx) / 2 + Math.cos(yaw) * side * (s.w / 2 - 0.4), 2.9, (s.az + s.bz) / 2 - Math.sin(yaw) * side * (s.w / 2 - 0.4), 0.5, 1, s.len, yaw, 0x9a9486); // parapets
        props.rand = mulberry32(SEED + 31);
        props.townHouse({ x: 30, z: mid(30) + 40, yaw: 0, width: 8, depth: 7, storeys: 2, name: 'lock-keeper’s house', damaged: 1 });
      }
    }
    // the bridges: floating ones a plank deck on a row of boats, the canal bridges stone with iron rails
    for (const s of SPANS) {
      if (s.kind === 'sluice') continue;
      const yaw = Math.atan2(s.bx - s.ax, s.bz - s.az), cx = (s.ax + s.bx) / 2, cz = (s.az + s.bz) / 2;
      if (s.kind === 'floating') {
        for (let u = 3; u < s.len - 2; u += 4.5) {
          const x = s.ax + (s.bx - s.ax) * u / s.len, z = s.az + (s.bz - s.az) * u / s.len;
          props.box('plain', x, 0.25, z, s.w + 2.4, 0.9, 1.9, yaw, 0x3c3a34);
        }
        props.box('plain', cx, s.deck + 0.1, cz, s.w - 1, 0.2, s.len, yaw, 0x6a5840);
        for (const side of [-1, 1]) props.box('plain', cx + Math.cos(yaw) * side * (s.w / 2 - 0.8), s.deck + 0.45, cz - Math.sin(yaw) * side * (s.w / 2 - 0.8), 0.16, 0.5, s.len, yaw, 0x4e4030);
      } else {
        for (const side of [-1, 1]) props.box('stone', cx + Math.cos(yaw) * side * (s.w / 2 - 0.3), s.deck + 0.5, cz - Math.sin(yaw) * side * (s.w / 2 - 0.3), 0.5, 1, s.len, yaw, 0x8e887a);
      }
    }
    // the harbour piers out from the river mouth: timber jetties on piles
    for (const side of [-1, 1]) {
      const x0 = shoreX(mid(-450)) + 20, z = mid(-470) + side * (riverHW(-470) + 2);
      props.box('plain', x0 - 40, 2.6, z, 90, 0.4, 4, 0, 0x5a4a38);
      for (let x = x0 - 82; x <= x0 + 2; x += 6) props.box('plain', x, -1.5, z, 0.5, 8, 0.5, 0, 0x3e3226);
    }
    // stores and wreckage behind each line (each half its own dice)
    for (const s of [1, -1]) {
      props.rand = mulberry32(SEED + (s > 0 ? 41 : 57));
      for (let n = 0, i = 0; n < 16 && i < 600; i++) {
        const x = (props.rand() * 2 - 1) * 380, z = s * (130 + props.rand() * 260);
        if (skip(x, z) || POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < 40) || duneK(x, z) > 0.3) continue;
        props.crates({ x, z, yaw: props.rand() * 3 });
        if (n % 3 === 0) props.logPile({ x: x + 4, z: z + 3, yaw: props.rand() * 3, length: 5 });
        n++;
      }
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    water.build(scene);

    // trees: none in the dunes or the shelled strip; poplar rows and willows along the polder roads in the rear
    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 24 })),
      { test: (x: number, z: number) => roadD(x, z) < 6 || wet(x, z) || nearB(x, z, 8) || duneK(x, z) > 0.05 || x - shoreX(z) < 60 || !!onSpan(x, z, 6) }];
    const bare = { test: (x: number, z: number) => churnK(x, z) > 0.3 };
    const rows = (x: number, z: number) => smoothstep(14, 8, roadD(x, z)) * 0.55 + smoothstep(0.2, 0.45, fbm(noise, x * 0.007 + 40, z * 0.007 - 12, 3)) * 0.5;
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid: [...avoid, bare], lane: bounds.x - 10, count: 900, autumn: 0, broadleaf: 0.95, forest: rows });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x: number, z: number) => churnK(x, z) > 0.2 }], count: 500, lane: 0 });
    const ground2 = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: [{ test: (x: number, z: number) => wet(x, z) || roadD(x, z) < 4 || x - shoreX(z) < 40 || (duneK(x, z) > 0.3 && Math.random() < 0.6) || Math.random() < churnK(x, z) * 0.8 }], density: 2, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground2.update(dt, t); trees.update(dt, t); hedges.update(dt, t); },
    };
  },
} satisfies MapDef;
