// The Hermada, May–August 1917: the Tenth and Eleventh Battles of the Isonzo on the Carso. The Italian Third Army
// (the Duke of Aosta’s) ground east over the barren Karst plateau toward Trieste: in May and June it took Jamiano and
// the Flondar trench line and got into Medeazza at the foot of Monte Hermada, then lost most of it again to
// Boroević’s counter-attacks; in August it came again and again stopped under the Hermada — the last height before
// Trieste, honeycombed with caverns and galleries, which it never took.
// The ground: grey limestone, burnt grass and stunted scrub, a few black pines, low dry-stone walls round every
// patch of soil, and dolines (karst sinkholes) everywhere — the men lived in them; trenches blasted into the rock
// with stone and sandbag parapets. Down the west edge the Adriatic: the low coastal strip below the karst’s edge,
// the Timavo welling up out of the rock at San Giovanni and running a short way to the sea between the reed marshes
// (the Lisert on the Italian bank, the Locavaz on the Austrian), Duino with its castle on a rock over the sea, the
// Südbahn railway to Trieste along the foot of the karst. On the plateau: Quota 144 and Monte Cosich over the
// Italian half, Monte Hermada over the Austrian, Flondar between them, Jamiano, Medeazza and Ceroglie.
// Not mirrored but fair: each side has a height of the same height and size at the same reach from its base (Quota
// 144 against the Hermada), a coastal hump with a village by the sea (Quota 12 in the Lisert, Duino on its rock), a
// village on its east flank, a lateral road along its half, a trunk road through its height to Flondar, and the
// coast road and railway down its own coastal strip; the marsh lies on both banks of the Timavo, and neither side
// holds the springs (San Giovanni) or the middle of the plateau. Dolines and walls are each half’s own dice.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createSea } from '../world/Sea.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite, shellField } from './common.js';
import { farmVillage, evenThreshold } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const SEED = 1917_0812;
const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const noise = createNoise2D(SEED);
/** The waterline down the west edge; inland distance from it. */
const shoreX = (z: number) => -445 + 8 * Math.sin(z * 0.008) + 5 * Math.sin(z * 0.021 + 1);
const inland = (x: number, z: number) => x - shoreX(z);
/** The Timavo: from its springs at San Giovanni (x ≈ -255) west to the sea; its middle (z at x) and half-width. */
const tim = (x: number) => -8 + 9 * Math.sin(x * 0.025 + 1);
const timHW = (x: number) => (9 + 10 * smoothstep(-380, -460, x)) * smoothstep(-248, -268, x);
const timD = (x: number, z: number) => (x > -248 ? Infinity : Math.abs(z - tim(x)));

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Doberdò road', 0, 470, 'centre'),
  P('B', 'Quota 12', -355, 300, 'west'),
  P('C', 'Quota 144', -60, 260, 'centre', { radius: 24 }),
  P('D', 'Jamiano', 330, 290, 'east', { radius: 24 }),
  P('E', 'San Giovanni', -232, -6, 'west', { radius: 24 }),
  P('F', 'Flondar', 20, 0, 'centre', { radius: 30 }),
  P('G', 'Medeazza', 330, -40, 'east', { radius: 24 }),
  P('H', 'Duino', -370, -300, 'west'),
  P('I', 'Monte Hermada', 60, -230, 'centre', { radius: 24 }),
  P('J', 'Ceroglie', 370, -270, 'east', { radius: 24 }),
  P('K', 'Sistiana road', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

/** The heights [x, z, r, h]: Quota 144, Monte Cosich; Monte Hermada and its eastern shoulder; the humps of Quota 12 and Duino’s rock. */
const HILLS = [[-60, 260, 150, 34], [230, 390, 100, 10], [60, -230, 150, 34], [-170, -400, 100, 10], [-405, 305, 60, 16], [-405, -310, 60, 16]];
/** The Südbahn along the foot of the karst. */
const RAIL = [[-300, 600], [-305, 330], [-300, 150], [-298, -150], [-292, -330], [-285, -600]];
/** The roads: the coast road, the trunk from each base through its height to Flondar, the lateral across each half, the middle road from the springs, the flank roads to Medeazza. */
const ROADS = [
  [[-385, 600], [-362, 420], at('B'), [-345, 160], [-342, 70], [-342, -80], [-355, -170], at('H'), [-385, -430], [-395, -600]],
  [[0, BASE_Z], [12, 390], at('C'), [-20, 130], at('F')],
  [[0, -BASE_Z], [-14, -380], at('I'), [40, -120], at('F')],
  [at('B'), [-210, 300], at('C'), [140, 300], at('D'), [500, 300]],
  [at('H'), [-170, -270], at('I'), [220, -280], at('J'), [500, -270]],
  [[-342, 60], [-280, 34], at('E'), [-130, 15], at('F'), [180, -15], at('G'), [500, -30]],
  [at('E'), [-280, -48], [-342, -70]],
  [at('D'), [350, 130], at('G')], [at('J'), [360, -150], at('G')],
  RAIL,
];
const SEGS = ROADS.flatMap((r) => r.slice(1).map((b, i) => { const a = r[i]; return [a[0], a[1], b[0], b[1], Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])]; }));
function roadD(x: number, z: number, cap = 30) {
  let best = cap;
  for (const [ax, az, bx, bz, x0, x1, z0, z1] of SEGS) {
    if (x < x0 - best || x > x1 + best || z < z0 - best || z > z1 + best) continue;
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
const railD = (x: number, z: number) => { let b = Infinity; for (let i = 0; i < RAIL.length - 1; i++) { const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); b = Math.min(b, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return b; };

/** The reed marsh on both banks of the Timavo’s lower course (the Lisert, the Locavaz): 0..1. */
const marshK = (x: number, z: number) => {
  const inl = inland(x, z), d = Math.abs(z - tim(Math.min(x, -260)));
  return smoothstep(25, 45, inl) * (1 - smoothstep(120, 150, inl)) * smoothstep(14, 28, d) * (1 - smoothstep(140, 180, d));
};
/** The karst plateau above its edge: 0..1. */
const plateauK = (x: number, z: number) => smoothstep(150, 270, inland(x, z));

/** Dolines on the plateau (each half its own dice; kept off the points, roads and bases). */
const DOLINES: number[][] = [];
for (const s of [1, -1]) {
  const r = mulberry32(SEED + (s > 0 ? 3 : 7));
  for (let i = 0, n = 0; i < 400 && n < 42; i++) {
    const x = (r() * 2 - 1) * 480, z = s * (20 + r() * 500), rad = 7 + r() * 9;
    if (inland(x, z) < 300 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 45) || roadD(x, z) < rad + 8 || Math.hypot(x, Math.abs(z) - BASE_Z) < 60) continue;
    DOLINES.push([x, z, rad, 2 + r() * 2.6]); n++;
  }
}

function height(x: number, z: number) {
  const inl = inland(x, z);
  if (inl < 0) return Math.max(-8, -0.8 + inl * 0.08);                                         // the Adriatic
  const pk = plateauK(x, z);
  let h = 1.2 + Math.min(inl, 200) * 0.012 + fbm(noise, x * 0.01, z * 0.01, 2) * 0.6;
  h += 36 * pk;                                                                               // the karst’s edge and the plateau
  h += (ridged(noise, x * 0.014 + 3, z * 0.014, 3) * 5 + fbm(noise, x * 0.05, z * 0.05, 2) * 0.8) * pk; // limestone ribs and hollows
  if (inl < 30) h += (0.3 + inl * 0.03 - h) * (1 - smoothstep(10, 30, inl));                   // the pebble shore
  const mk = marshK(x, z);
  if (mk > 0) {
    const n = fbm(noise, x * 0.04 + 11, z * 0.04, 2);
    h += (0.35 + 0.2 * n - h) * mk;                                                            // the marsh
    h -= 0.85 * mk * smoothstep(0.2, 0.35, n);                                                 // its pools (wadeable)
  }
  for (const [hx, hz, hr, hh] of HILLS) { const d = Math.hypot(x - hx, (z - hz) * 1.15); if (d < hr) h += hh * smoothstep(hr, 0, d) ** 1.4; }
  for (const [dx, dz, dr, dd] of DOLINES) { if (Math.abs(x - dx) > dr || Math.abs(z - dz) > dr) continue; const d = Math.hypot(x - dx, z - dz); if (d < dr) h -= dd * smoothstep(dr, 0, d) ** 1.5; }
  for (const bz of [BASE_Z, -BASE_Z]) { const b = Math.hypot(x, z - bz); if (b < 34) h += (42 - h) * smoothstep(34, 18, b); }
  const hw = timHW(x), td = timD(x, z);
  if (hw > 0 && td < hw + 8) h = Math.min(h, -2.2 + (h + 2.2) * smoothstep(hw - 3, hw + 6, td)); // the Timavo
  if (inl > 20) { const rd = roadD(x, z, 8); if (rd < 6) h = Math.max(h, (td < hw + 8 ? 1.3 : 0.9) * smoothstep(6, 4, rd)); } // causeways over the marsh, bridges over the Timavo
  return h;
}

/** The marsh drags at everything off its causeways. */
const soft = (x: number, z: number, foot: boolean) => { const mk = marshK(x, z); return mk < 0.05 || roadD(x, z, 6) < 4.5 ? 1 : 1 - mk * (foot ? 0.35 : 0.6); };

/** One water sheet at the sea’s level (the Adriatic, the Timavo, the marsh pools). */
const water = {
  ...createSea({ level: 0, size: 1600 }),
  sea: false,
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3e6a72, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.86 });
    mat.userData.waterSurface = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000, 1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    m.userData.noAO = true;
    scene.add(m);
  },
};

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1ª Squadra' }];

export default {
  id: 'hermada',
  name: 'Hermada',
  description: 'May–August 1917, the Tenth and Eleventh Isonzo: the Italian Third Army on the barren Karst plateau before Trieste — grey limestone, dolines and stone walls, Flondar and Medeazza under Monte Hermada, the Timavo springs and the Lisert marshes by the sea, Duino’s castle on its rock.',
  epochs: ['1918'],
  region: 'italy',
  airfields: [], // (systems/Airfields.js: dolines, stone walls and marsh — the squadrons fly from Aquileia and Prosecco)
  armies: { nato: ['it'], pact: ['ah'] }, // (the Italian Third Army against Boroević’s Fifth Army)
  sides: { nato: 'Italy', pact: 'Austria-Hungary' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  soft,
  river: water,
  fields: createFields({ seed: SEED, cell: 60, weights: [0.6, 0.05, 0.1, 0.25] as any }),

  theme: {
    // a hot Karst summer: white glare off the limestone, a hazy sea
    fogColor: 0xc4c6c0, fogDensity: 0.0013, skyTop: 0x5f86ae, skyHorizon: 0xd2d6d2, skyBottom: 0x8a8a80,
    sunColor: 0xfff0d8, sunIntensity: 1.7, sunDisk: 0.3, clouds: 0.25, cloudLight: 0xf2f2ee, cloudDark: 0x9aa2aa,
    sunDir: [0.4, 0.75, 0.3], hemiSky: 0xc8d4e0, hemiGround: 0x7a7660, hemiIntensity: 1.3, rimColor: 0xe8e4d8, rimIntensity: 0.25,
    terrain: {
      grass: '#6a6a44', grassAlt: '#62663e', dryGrass: '#8e865a', dirt: '#7a6c54', rock: '#7c7a5c', // (the plateau’s 40 m all count as ‘high’ to world/Terrain.js: its scrubby grey-olive karst, the bare limestone in surface())
      pasture: '#76784a', ploughed: '#7e6a50', stubble: '#ae9e66', meadow: '#7c8250',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (y < 0.25) return [0x5a5648, 0.95];                                                    // under the water
        const inl = inland(x, z);
        if (inl < 30 && y < 2.5) return [0xbab4a4, 0.95];                                                    // the pebble shore
        if (railD(x, z) < 3) return [0x5e5850, 0.95];                                             // the railway’s ballast
        if (roadD(x, z, 4) < 3.2) return [0xc0b8a4, 0.9];                                         // the white limestone roads
        const mk = marshK(x, z);
        if (mk > 0.2) return [0x5a6440, Math.min(0.9, mk)];                                       // reeds and rushes
        for (const [dx, dz, dr] of DOLINES) if (Math.abs(x - dx) < dr && Math.abs(z - dz) < dr && Math.hypot(x - dx, z - dz) < dr * 0.5) return [0x7a5a3e, 0.6]; // the red earth in the dolines’ bottoms
        const pk = plateauK(x, z);
        if (pk > 0.2) { const n = fbm(noise, x * 0.035 + 7, z * 0.035, 2); if (n > 0.05) return [n > 0.3 ? 0xb2aea2 : 0x9a968a, Math.min(0.8, pk * (n + 0.1) * 2)]; } // bare limestone
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-60, 0, 60] }, pact: { x: 0, z: -BASE_Z, entries: [-60, 0, 60] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 360 }, pact: { x: 0, z: -360 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Schwarm' })),
  },

  /** Each side’s fire trench across its half (zig-zagged, wire in front, gaps at the roads), MG posts on its height; months of shelling in between. */
  battlefield(game: any) {
    const dry = (x: number, z: number) => height(x, z) > 1 && marshK(x, z) < 0.2;
    const keep = (b: number[]) => roadD(b[0], b[1]) > b[2] * 0.5 + 5 && dry(b[0], b[1]) && points.every((p) => Math.hypot(p.x - b[0], p.z - b[1]) > 20) && Math.hypot(b[0], Math.abs(b[1]) - BASE_Z) > 60;
    const dens = (x: number, z: number) => 1.6 * (1 - smoothstep(60, 220, Math.abs(z))) + 0.05;
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(SEED + 1, BOUNDS, dens).filter((b) => b[1] < 0)]
      .filter(keep).map((b) => [b[0], b[1], b[2], Math.max(0.2, Math.min(b[3], 1.4))]);
    const ruins = game.buildings.list.filter((b: any) => b.name !== 'castle' && Math.abs(b.z) < 330 && mulberry32(b.index * 7 + SEED)() < 0.7).map((b: any) => b.index);
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1, n = s > 0;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 24) { const X = x * s; pts.push([X, s * (125 + 10 * Math.sin(X * (n ? 0.019 : 0.023) + (n ? 0 : 1.3)))]); } // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { zig: 2.5, wireAt: 18, belts: 1, gapEvery: 50 })) if (roadD(w.x, w.z) > 9 && dry(w.x, w.z) && inland(w.x, w.z) > 35 && points.every((p) => Math.hypot(p.x - w.x, p.z - w.z) > 28)) works.push(w);
      for (const id of n ? ['B', 'C', 'D'] : ['H', 'I', 'J']) { const p = points.find((q) => q.id === id); for (const dx of [-12, 12]) works.push({ kind: 'mgNest', x: p.x + dx, z: p.z - 16 * s, yaw: n ? Math.PI : 0, faction: f }); }
    }
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number) => height(x, z) < 1 || marshK(x, z) > 0.15 || timD(x, z) < timHW(x) + 8;
    const skip = (x: number, z: number) => roadD(x, z) < 9 || wet(x, z) || inland(x, z) < 30 || DOLINES.some(([dx, dz, dr]) => Math.hypot(x - dx, z - dz) < dr + 4);
    const stone = 0xb0aa9c;

    // the karst villages: stone houses round their wells — Jamiano, Medeazza, Ceroglie, the huts on Quota 12, Flondar’s farms
    for (const [id, n, sp] of [['D', 8, 1.1], ['G', 8, 1.1], ['J', 8, 1.1], ['B', 4, 0.9], ['F', 5, 1.2]] as [string, number, number][]) { const [x, z] = at(id); farmVillage(props, x, z, n, SEED + Math.round(x * 3 + z * 7), skip, sp); }
    props.rand = mulberry32(SEED + 21);
    props.church({ x: at('D')[0] - 30, z: at('D')[1] + 30, yaw: Math.PI });
    props.church({ x: at('G')[0] + 28, z: at('G')[1] - 30, yaw: 0 });
    // San Giovanni in Tuba: the church by the springs
    props.church({ x: at('E')[0] + 22, z: at('E')[1] + 26, yaw: Math.PI / 2 });
    // Duino: the village by the sea and the castle on its rock — curtain walls, the keep, the old ruin below
    {
      const [hx, hz] = at('H');
      farmVillage(props, hx + 20, hz - 10, 7, SEED + 31, skip, 1);
      const cx = hx - 34, cz = hz - 24, g = terrain.heightAt(cx, cz);
      const b = props.beginBuilding('castle', cx, cz, 0.3, 22, 18);
      b.plaster = stone;
      props.shell(b, { height: 7, key: 'stone', color: stone, t: 1.2, bay: 3, sill: 3.5, head: 4.6, frame: 0x7a7468, front: [], back: [2] });
      props.piece('stone', b, 0, 7.3, 0, 22.6, 0.6, 18.6, 0x9e988a);
      props.endBuilding();
      props.box('stone', cx + 8, g + 10, cz - 6, 7, 20, 7, 0.3, 0xa8a294);
      cover.addBox({ x: cx + 8, z: cz - 6, yaw: 0.3, length: 7, thickness: 7, height: 20 });
      props.box('stone', cx - 30, terrain.heightAt(cx - 30, cz - 26) + 4, cz - 26, 6, 8, 6, 0.1, 0x8e887a, 0.04, -0.03); // the old castle’s broken tower
    }
    // the railway: the track, a few wagons left on it, the station hut at San Giovanni
    for (let i = 0; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });
    props.wagon({ x: -303, z: 230, yaw: Math.atan2(5, -180), kind: 'box' });
    props.wagon({ x: -295, z: -240, yaw: Math.atan2(6, -180), kind: 'open' });
    props.house({ x: -315, z: -110, yaw: 0, width: 9, depth: 6, height: 3.4 });
    // the bridges over the Timavo: stone parapets where the coast road and the railway cross
    for (const bx of [-342, -299]) { const z0 = tim(bx), hw = timHW(bx) + 4; for (const s of [-1, 1]) props.box('stone', bx + s * 3.6, 1.8, z0, 0.5, 1, hw * 2, 0, 0x9a9486); }
    // caverns in the heights’ flanks (the Hermada’s galleries, Quota 144’s answer): dark mouths with a sandbag wall
    for (const id of ['C', 'I']) {
      const [px, pz] = at(id), s = pz > 0 ? -1 : 1;
      for (const dx of [-40, 35]) {
        const x = px + dx, z = pz + s * 40, g = terrain.heightAt(x, z);
        props.box('stone', x, g + 1.4, z, 4.5, 3, 2.5, 0, 0x2a2824);
        props.sandbagRing({ x, z: z + s * 4, radius: 3, toward: s });
      }
    }
    // dry-stone walls round the patches of soil, loose limestone, sangars (each half its own dice)
    for (const s of [1, -1]) {
      const r = mulberry32(SEED + (s > 0 ? 41 : 57));
      for (let i = 0; i < 420; i++) {
        const x = (r() * 2 - 1) * 480, z = s * (15 + r() * 520), big = r();
        if (nearPoint(x, z, 30) || skip(x, z) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
        if (big < 0.45) props.boulder({ x, z, radius: 0.6 + r() * 1.4 });
        else props.lowWall({ x, z, yaw: r() * 3, length: 6 + r() * 8, height: 1.0, color: stone });
      }
      for (let i = 0, n = 0; i < 2000 && n < 14; i++) {
        const x = (r() * 2 - 1) * 460, z = s * (160 + r() * 300);
        if (skip(x, z) || nearPoint(x, z, 45)) continue;
        n++;
        buildSite(props, { kind: ['fieldwall', 'rocks', 'farm', 'fieldwall'][n % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
      }
    }
    // the stone parapets in front of each fire trench (rock that would not take a spade)
    for (const s of [1, -1]) for (let x = -470; x <= 470; x += 22) {
      const z = s * (125 + 10 * Math.sin(x * (s > 0 ? 0.019 : 0.023) + (s > 0 ? 0 : 1.3))) - s * 7;
      if (skip(x, z) || nearPoint(x, z, 30)) continue;
      props.lowWall({ x, z, yaw: Math.PI / 2, length: 9, height: 0.9, color: 0xa29c8e });
    }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();
    water.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      { test: (x: number, z: number) => roadD(x, z) < 6 || wet(x, z) || inland(x, z) < 35 }];
    // stunted scrub (sumac, hornbeam, juniper) and a few black pines; thicker on the coastal slope, bare in no man’s land
    const scrub0 = (x: number, z: number) => fbm(noise, x * 0.008 + 40, z * 0.008, 3);
    const north = (x: number, z: number) => z > 0;
    const tP = evenThreshold(scrub0, 0.1, north);
    const forest = (x: number, z: number) => {
      const front = 1 - smoothstep(90, 200, Math.abs(z)), w = scrub0(x, z) - (z > 0 ? 0 : tP - 0.1);
      return (w > 0.1 ? 0.5 : 0.08) * (1 - 0.85 * front) + (inland(x, z) < 260 && inland(x, z) > 140 ? 0.25 : 0);
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 2600, broadleaf: 0.7, autumn: 0.1, maxY: 120, size: 0.55, forest });
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 260, broadleaf: 0, autumn: 0, maxY: 120, size: 0.85, forest: (x: number, z: number) => forest(x, z) * 0.6 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: [{ test: (x: number, z: number) => roadD(x, z) < 4 || height(x, z) < 0.3 || inland(x, z) < 25 }], density: 1.6, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); pines.update(dt, t); },
    };
  },
} satisfies MapDef;
