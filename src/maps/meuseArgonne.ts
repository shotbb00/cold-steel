// Meuse-Argonne, 26 September – October 1918 (1918 only; the Western Front; the big field, 1.0 × 1.12 km). The AEF’s
// largest battle: Pershing’s First Army goes north out of the old Verdun lines in the fog of 26 September, between the
// Argonne Forest and the Meuse, against the German Fifth Army. The 79th Division is held up a day under Montfaucon, the
// bare butte the Crown Prince watched Verdun from; in the Argonne the 77th fights ravine by ravine and Whittlesey’s
// “Lost Battalion” is cut off for five days in the Charlevaux ravine; in October the Americans grind up the Aire valley
// past Exermont and against the Kriemhilde Stellung — the Hindenburg Line’s last belt of wire and concrete machine-gun
// posts on the Romagne heights — and take the Côte Dame Marie on 14 October and Cunel beyond it.
// On the map: the Argonne down the west edge, a rough wooded plateau cut by ravines, the Charlevaux ravine across its
// middle with the mill at its foot; the Aire below the forest’s edge, Varennes on it on the American side (south, +z),
// Exermont on the German; Montfaucon’s bare butte in the middle with its ruined village and concrete observation post;
// the Romagne heights with the Côte Dame Marie to the east of it; Cuisy, Nantillois, Romagne and Cunel in the open
// country; the Meuse down the east edge with the heights of the right bank beyond and the Brieulles bridge.
// Not mirrored but fair (as cote304.ts): each side has a bare height reaching toward it from the middle — Montfaucon
// leans to the Americans, the Côte Dame Marie to the Germans, the same height, size and reach from the bases — each its
// own ruined farm hamlet and observation post on top. The Argonne and its Charlevaux ravine and the Meuse run down the
// flanks through both halves; each side has its own forest ravine at the same depth, an Aire bridge and an Aire ford in
// the same places, two trench lines at the same depth with the same wire and four concrete machine-gun posts each
// (the Kriemhilde Stellung for the Germans, the old French front of 1916 for the Americans), three villages as far
// back, woods of the same area behind its lines and an airfield at the same spot.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, shellField, buildSite } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, segDist, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SEED = 1918_09;
const noise = createNoise2D(SEED);
const MUD = new THREE.Color(0x56483a);   // churned clay of the Meuse uplands

/** A north–south path’s x at z (its points run north to south). */
const xAt = (poly: number[][], z: number) => {
  for (let i = 0; i < poly.length - 1; i++) if (z <= poly[i + 1][1]) return poly[i][0] + (poly[i + 1][0] - poly[i][0]) * (z - poly[i][1]) / (poly[i + 1][1] - poly[i][1]);
  return poly[poly.length - 1][0];
};

// ---- the Meuse down the east edge; the Aire under the Argonne’s edge, the whole length of the field
const MEUSE = [[432, -640], [420, -380], [440, -140], [426, 80], [444, 300], [428, 640]];
const AIRE = [[-250, -640], [-232, -420], [-252, -200], [-238, 0], [-254, 200], [-236, 420], [-250, 640]];
const river = createRiver({
  paths: [MEUSE, AIRE], halfWidth: 15, level: 0, depth: 2.6, valley: 58,
  crossings: [
    { name: 'Brieulles bridge', x: xAt(MEUSE, 0), z: 0, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Varennes bridge', x: xAt(AIRE, 300), z: 300, kind: 'bridge', width: 7, channel: 1 },
    { name: 'Apremont ford', x: xAt(AIRE, 110), z: 110, kind: 'ford', width: 7, channel: 1 },
    { name: 'Châtel-Chéhéry ford', x: xAt(AIRE, -110), z: -110, kind: 'ford', width: 7, channel: 1 },
    { name: 'Fléville bridge', x: xAt(AIRE, -300), z: -300, kind: 'bridge', width: 7, channel: 1 },
  ],
});
const wetD = (x: number, z: number) => river.project(x, z).d;

// ---- the points
const MONT = { x: 20, z: 60 }, DAME = { x: 250, z: -60 };
const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points: ControlPointDef[] = [
  P('A', 'Avocourt', 0, 470, 'centre'),
  P('B', 'Varennes', -185, 305, 'west'),
  P('C', 'Cuisy', -20, 320, 'centre'),
  P('D', 'Nantillois', 290, 300, 'east'),
  P('E', 'Charlevaux ravine', -380, 2, 'west', { radius: 26 }),
  P('F', 'Montfaucon', MONT.x, MONT.z, 'centre', { radius: 30 }),
  P('G', 'Côte Dame Marie', DAME.x, DAME.z, 'east', { radius: 30 }),
  P('H', 'Exermont', -180, -300, 'west'),
  P('I', 'Romagne', -10, -320, 'centre'),
  P('J', 'Cunel', 300, -290, 'east'),
  P('K', 'Landres-et-St-Georges', 0, -470, 'centre'),
];

// ---- the Argonne: a rough wooded plateau west of the Aire, its edge ragged; the ravines cut into it
const argonne = (x: number, z: number) => smoothstep(-250, -290, x + fbm(noise, x * 0.01 + 5, z * 0.01, 2) * 30);
const GULLIES: [number[][], number, number][] = [
  [[[-540, 25], [-450, 2], [-380, 10], [-310, -2], [-250, 4]], 7, 15],   // the Charlevaux ravine, down to the Aire
  [[[-520, 250], [-420, 232], [-320, 255], [-262, 240]], 5, 12],         // the Américains’ own: the Ravin de la Fontaine-aux-Charmes
  [[[-520, -245], [-410, -268], [-330, -246], [-262, -258]], 5, 12],     // the Germans’ own: the ravine under Grandpré’s woods
];
// the heights [x, z, r, h]: Montfaucon and the Côte Dame Marie; the Cuisy rise and the Romagne rise behind each front
const HILLS = [[MONT.x, MONT.z, 175, 22], [DAME.x, DAME.z, 175, 22], [-30, 340, 140, 5], [20, -345, 140, 5]];
const hillK = (x: number, z: number) => Math.max(...HILLS.slice(0, 2).map(([hx, hz, r]) => 1 - Math.hypot(x - hx, z - hz) / r));

// each side's airfield behind its east flank (the tower 55 m off the 240 × 32 m strip), graded flat and kept clear
const AIR = [{ faction: 'nato', x: 190, z: 425, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: 190, z: -425, yaw: -Math.PI / 2, large: false }];
const airD = (x: number, z: number) => Math.min(...AIR.map((a) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52))));

const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 7 + fbm(noise, x * 0.003, z * 0.003, 3) * 4 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.5;
  for (const [hx, hz, r, hh] of HILLS) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.4;
  h += argonne(x, z) * (7 + fbm(noise, x * 0.018 + 11, z * 0.018, 3) * 3);   // the forest plateau, broken ground
  for (const [line, depth, width] of GULLIES) h -= depth * Math.exp(-((segDist(line, x, z) / width) ** 2));
  h += smoothstep(420 + 40 * Math.sin(x * 0.008), 600, Math.abs(z)) * 10;     // (the edges rise: as much on each half)
  h += smoothstep(455, 520, x) * 24;                                          // the heights of the Meuse on the right bank
  for (const bz of [BASE_Z, -BASE_Z]) h += (10 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  h += (9 - h) * smoothstep(30, 6, airD(x, z));
  return h;
}, { x: 700, z: 760 }, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

/** How churned the ground is (0..1): the band between the two trench systems. */
const churn = (z: number) => 1 - smoothstep(150, 260, Math.abs(z));
/** Each side’s trench lines: the front line with two belts of wire, the support line behind (each its own wander). */
const LINES = [{ z: 140, wireAt: 18, belts: 2, seed: 23 }, { z: 200, wireAt: 14, belts: 1, seed: 59 }];
const linePts = (z: number, faction: 'nato' | 'pact', seed: number) => {
  const r = mulberry32(faction === 'nato' ? seed : seed * 31 + 7), pts: number[][] = [], ph = r() * 6;
  for (let x = -480; x <= 480; x += 40) pts.push([x, z + (r() - 0.5) * 12 + 8 * Math.sin(x * 0.011 + ph)]);
  return faction === 'nato' ? pts : pts.map(([x, zz]) => [-x, -zz]);   // (walked east to west: its front faces south)
};
/** The front line’s z at x for a side (to set the concrete posts just behind it). */
const frontZ = (f: 'nato' | 'pact', x: number) => {
  const pts = linePts(LINES[0].z, f, LINES[0].seed).sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < pts.length - 1; i++) if (x <= pts[i + 1][0]) return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
  return pts[pts.length - 1][1];
};
// the concrete machine-gun posts, four a side, 12 m behind the front line
const POSTS = [
  ...[-380, -150, 90, 330].map((x) => [x, frontZ('nato', x) + 12]),
  ...[-330, -90, 150, 360].map((x) => [x, frontZ('pact', x) - 12]),
];
const trenchBand = (z: number) => LINES.some((l) => Math.abs(Math.abs(z) - l.z) < 30);

// ---- the woods: the Argonne dense; Bois de Montfaucon and de Malancourt behind the Americans, Bois de Romagne and de Cunel behind the Germans
const wn = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
const open = (x: number, z: number) => Math.abs(z) > 240 && x > -230 ? wn(x, z) : -9;
const T_N = 0.3, T_P = evenThreshold(open, T_N, (_x, z) => z > 0);
const woodField = gridCache((x: number, z: number) => {
  if (wetD(x, z) < 22 || airD(x, z) < 18) return 0;
  const a = argonne(x, z);
  if (a > 0.5) return trenchBand(z) ? 0.3 : 1;
  if (hillK(x, z) > 0) return 0;                       // the heights shelled bare
  return open(x, z) > (z > 0 ? T_N : T_P) && Math.abs(Math.abs(z) - BASE_Z) > 50 ? 0.85 : 0;
}, { x: 520, z: 580 }, 4);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Platoon, 308th Infantry' }];

export default {
  id: 'meuse-argonne',
  name: 'Meuse-Argonne',
  description: 'September–October 1918, the AEF’s largest battle: the dense Argonne Forest and its ravines on the west flank, the bare butte of Montfaucon with its ruined village and observation post in the middle, the Aire valley, the Kriemhilde Stellung’s wire and concrete on the Romagne heights, and the Meuse down the east flank.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['aef', 'fr'], pact: ['de'] }, // (Pershing’s First Army with the French Fourth on its left, against the German Fifth Army; aef has no units yet: fr fights for it)
  sides: { nato: 'United States', pact: 'Germany' },
  conditions: { time: 'dawn', weather: 'fog' }, // (zero hour 05:30 on 26 September, in thick fog)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: SEED, cell: 80, weights: [0.35, 0.3, 0.05, 0.3] as any }),
  woods: (x: number, z: number) => woodField(x, z) * 0.85,

  theme: {
    // a grey, damp autumn morning, the mist lying in the valleys
    fogColor: 0x9a9e9c, fogDensity: 0.0017, skyTop: 0x687480, skyHorizon: 0xb4b6ae, skyBottom: 0x6a6a62,
    sunColor: 0xe8dcc4, sunIntensity: 1.45, sunDisk: 0.1, clouds: 0.8, cloudLight: 0xc6c8c4, cloudDark: 0x6e747a,
    sunDir: [-0.45, 0.45, 0.7], hemiSky: 0xbcc4ca, hemiGround: 0x4e4636, hemiIntensity: 1.25, rimColor: 0xbcc4cc, rimIntensity: 0.25,
    terrain: {
      grass: '#58603a', grassAlt: '#4c5634', dryGrass: '#857a50', dirt: '#5c4e3e', rock: '#8c887a', strip: '#4c3f30',
      pasture: '#56603a', ploughed: '#6e6050', stubble: '#9a8a58', meadow: '#606a3c',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-150, 0, 300], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        if (y < 1.6 && wetD(x, z) < 30) return [0x4e5a32, 0.7];                 // reed and wet meadow along the water
        if (argonne(x, z) > 0.6) return [0x48462f, 0.5];                          // leaf litter under the forest
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-150, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-150, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug, Infanterie-Regiment 254' })),
  },

  /** The trench systems and wire, machine-gun nests, the band between them shelled, the villages in ruins, the mud. */
  battlefield(game: any) {
    const dens = (x: number, z: number) => (wetD(x, z) < 60 ? 0 : churn(z) * 1.8 + hillK(x, z) * 1.2 + 0.1);
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(SEED + 1, BOUNDS, dens).filter((b) => b[1] < 0)]; // (each half its own)
    const ruins = game.buildings.list.filter((b: any) => b.name !== 'pillbox' && mulberry32(b.index * 7 + SEED)() < (Math.abs(b.z) < 380 ? 0.9 : 0.35)).map((b: any) => b.index);
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      for (const l of LINES) for (const w of trenchLine(linePts(l.z, f, l.seed), f, { wireAt: l.wireAt, belts: l.belts, gapEvery: 60 })) if (wetD(w.x, w.z) > 50) works.push(w);
      const s = f === 'nato' ? 1 : -1;
      for (const x of f === 'nato' ? [-260, 0, 210] : [-210, 40, 260]) works.push({ kind: 'mgNest', x, z: frontZ(f, x) + 6 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    const paint = (terrain: any) => {
      for (let z = -BOUNDS.z; z <= BOUNDS.z; z += 16) for (let x = -BOUNDS.x; x <= BOUNDS.x; x += 16) {
        const k = churn(z) * (0.7 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.5) * (wetD(x, z) < 40 || argonne(x, z) > 0.5 ? 0.3 : 0.85);
        if (k > 0.05) terrain.dig(x, z, 14, 0, (px: number, pz: number) => Math.max(0, 1 - Math.hypot(px - x, pz - z) / 14), Math.min(1, k) * 0.9, MUD);
      }
    };
    return { blasts, ruins, works, paint };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearPost = (x: number, z: number, r: number) => POSTS.some(([px, pz]) => Math.hypot(px - x, pz - z) < r);
    const skip = (x: number, z: number) => wetD(x, z) < 34 || trenchBand(z) || airD(x, z) < 25 || nearPost(x, z, 14);
    const concrete = 0x8a877c;

    // the concrete machine-gun posts: a low box of reinforced concrete, firing slits all round, the door at the back
    for (const [x, z] of POSTS) {
      props.rand = mulberry32(Math.round(x * 13 + z));
      const b = props.beginBuilding('pillbox', x, z, (z > 0 ? Math.PI : 0) + (props.rand() - 0.5) * 0.4, 7, 6);
      b.plaster = concrete;
      props.shell(b, { height: 2.1, key: 'stone', color: concrete, t: 0.9, bay: 2.3, sill: 1.15, head: 1.45, frame: 0x6e6b62, front: [], back: [1.6] });
      props.piece('stone', b, 0, 2.45, 0, 7.4, 0.7, 6.4, 0x7e7b70);
      props.piece('plain', b, 0, 2.85, 0.4, 6.2, 0.25, 4.8, 0x4e4434);
      props.endBuilding();
    }

    // the villages, ruined by the end; Montfaucon and the farm on the Côte Dame Marie hamlets on their heights
    for (const p of points) {
      if (['A', 'K', 'E'].includes(p.id)) continue;
      const big = p.id === 'B' || p.id === 'I';
      farmVillage(props, p.x, p.z, big ? 9 : 7, SEED * 10 + Math.round(p.x * 3 + p.z * 7), skip, big ? 1.3 : 1.1);
    }
    props.rand = mulberry32(SEED + 3);
    props.church({ x: -150, z: 335, yaw: 0.2 });                  // Varennes
    props.church({ x: 25, z: -350, yaw: Math.PI - 0.2 });         // Romagne
    props.church({ x: MONT.x - 30, z: MONT.z + 28, yaw: 0.3 });   // Montfaucon’s church on the summit
    // the observation posts: Montfaucon’s concrete tower in a ruined house (the Crown Prince’s), its twin on the Côte Dame Marie
    for (const [x, z, yaw] of [[MONT.x + 30, MONT.z - 20, Math.PI], [DAME.x - 30, DAME.z + 20, 0]]) {
      const y = terrain.heightAt(x, z), s = yaw ? 1 : -1;
      props.box('plain', x, y + 2.4, z, 4.2, 4.8, 4.2, yaw, concrete);
      props.box('plain', x, y + 4.0, z - 2.12 * s, 3.0, 0.45, 0.1, yaw, 0x0c0b0a);      // the vision slit, toward the enemy
      props.box('plain', x, y + 4.95, z, 4.8, 0.3, 4.8, yaw, 0x7a766c);
      props.sandbagRing({ x: x + 6, z: z + 5 * s, radius: 3.5, toward: -s });
    }
    // the Charlevaux mill at the foot of the ravine, where the Lost Battalion held the slope above
    props.house({ x: -330, z: 2, yaw: 0.1, width: 9, depth: 7 });
    // the boulders of the Argonne ravines
    props.rand = mulberry32(SEED + 4);
    for (let i = 0, n = 0; n < 220 && i < 6000; i++) {
      const x = -500 + props.rand() * 250, z = (props.rand() * 2 - 1) * 540;
      const g = Math.min(...GULLIES.map(([l]) => segDist(l, x, z)));
      if (argonne(x, z) < 0.6 || g > 30 || nearPoint(x, z, 10) || trenchBand(z)) continue;
      props.boulder({ x, z, radius: 0.7 + props.rand() * 1.8 }); n++;
    }
    // farmsteads, field walls and hay in the open country behind each side’s lines (each half its own)
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks'];
    for (let tries = 0, n = 0; n < 70 && tries < 8000; tries++) {
      const x = -220 + rand() * 620, z = (n % 2 ? -1 : 1) * (240 + rand() * (bounds.z - 280));
      if (Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || nearPoint(x, z, 50) || skip(x, z) || x > 400 || woodField(x, z) > 0.3) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...POSTS.map(([x, z]) => ({ x, z, r: 8 })), { test: (x: number, z: number) => wetD(x, z) < 22 || airD(x, z) < 12 }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 7000, hedges: 1200, autumn: 0.35, broadleaf: 0.85,
      noHedge: (x: number, z: number) => Math.abs(z) < 260 || argonne(x, z) > 0.3,
      forest: (x: number, z: number) => {
        if (wetD(x, z) < 22) return -1;
        const k = woodField(x, z);
        if (k > 0.2) return k;
        return Math.abs(z) < 260 ? 0.01 * (1 - Math.max(0, hillK(x, z))) : 0;   // (a stump here and there)
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
