// The Chemin des Dames, 16 April 1917: the Nivelle Offensive. After ten days of bombardment the French Fifth and Sixth
// Armies climb out of the Aisne valley in sleet at dawn against the long, narrow limestone ridge that carries the
// Chemin des Dames road between the Aisne and the Ailette. The Germans wait under the ridge in the creuttes — the old
// quarries, the Caverne du Dragon above all — and come up behind the barrage; Craonne on its plateau and the Californie
// plateau over it change hands for weeks. East of the ridge's end, on the flat ground before Juvincourt, the French
// tanks go in for the first time: 128 Schneider CA1s of the Bossut groupement, out of the woods by Ville-aux-Bois.
// The ground: the ridge across the middle with the road along its crest, its shoulders falling to the Aisne and its
// lateral canal behind the French and to the Ailette and the Oise–Aisne canal behind the Germans (three bridges
// over each water, under each side's own entries), Hurtebise farm on the crest, the Caverne du Dragon in its north
// face, Craonne in ruins at the ridge's east end, and beyond it the plain.
// Not mirrored but fair: the crest is no man's land — each side's trench line lies the same 150 m down its own
// slope, and the three points on the ridge sit between the lines (the Caverne a little on the German side of the
// crest, Craonne a little on the French, Hurtebise on it). Each side has its own creuttes (the Caverne for the
// Germans, the Paissy caves for the French), a spur of its own to climb by and a wood of the same size behind its
// line, a village on the flat east ground as near to it as the other's (Ville-aux-Bois, Juvincourt), and two
// waters with three bridges between its base and the fight.
import * as THREE from 'three';
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
const ROADS = [-330, 0, 330];
const HW = 9;                                                // the Aisne and the canals: all about 18 m across
const noise = createNoise2D(1917_04);
/** The crest line: the Chemin des Dames road follows it. */
const cz = (x: number) => 10 * Math.sin(x * 0.005 + 0.7) + 6 * Math.sin(x * 0.013) + 4;
/** How much ridge there is at x: it ends at Craonne and the Californie plateau, the plain beyond. */
const ridgeK = (x: number) => 1 - smoothstep(300, 430, x);
const aisne = (x: number) => 418 + 10 * Math.sin(x * 0.007 + 0.3) + 5 * Math.sin(x * 0.019);
const lateral = (x: number) => 368 + 3 * Math.sin(x * 0.003);              // the Canal latéral à l’Aisne, on the north bank
const ailette = (x: number) => -405 + 11 * Math.sin(x * 0.006 - 1) + 5 * Math.sin(x * 0.021 + 2);
const oiseAisne = (x: number) => -356 - 3 * Math.sin(x * 0.0035 + 1);     // the Canal de l’Oise à l’Aisne, up the Ailette valley
const river = createRiver({
  paths: [aisne, lateral, ailette, oiseAisne], halfWidth: HW, level: 0, depth: 2.4, valley: 46,
  crossings: [
    { name: 'Bourg-et-Comin bridge', x: ROADS[0], kind: 'bridge', width: 7, channel: 0 },
    { name: 'Maizy bridge', x: ROADS[1], kind: 'bridge', width: 7, channel: 0 },
    { name: 'Berry-au-Bac bridge', x: ROADS[2], kind: 'bridge', width: 8, channel: 0 },
    { name: 'Bourg lock bridge', x: ROADS[0], kind: 'bridge', width: 7, channel: 1 },
    { name: 'Maizy canal bridge', x: ROADS[1], kind: 'bridge', width: 7, channel: 1 },
    { name: 'Berry-au-Bac canal bridge', x: ROADS[2], kind: 'bridge', width: 8, channel: 1 },
    { name: 'Chamouille bridge', x: ROADS[0], kind: 'bridge', width: 7, channel: 2 },
    { name: 'Chermizy bridge', x: ROADS[1], kind: 'bridge', width: 7, channel: 2 },
    { name: 'Corbeny bridge', x: ROADS[2], kind: 'bridge', width: 8, channel: 2 },
    { name: 'Chamouille canal bridge', x: ROADS[0], kind: 'bridge', width: 7, channel: 3 },
    { name: 'Chermizy canal bridge', x: ROADS[1], kind: 'bridge', width: 7, channel: 3 },
    { name: 'Corbeny canal bridge', x: ROADS[2], kind: 'bridge', width: 8, channel: 3 },
  ],
});
const wetD = (x: number, z: number) => river.project(x, z).d;
/** The roads: the Chemin des Dames along the crest (down off the ridge's end to Corbeny), and the three up from the bridges. */
const roadD = (x: number, z: number) => {
  let d = Math.abs(z - cz(x));
  for (const bx of ROADS) d = Math.min(d, Math.abs(x - bx - 6 * Math.sin(z * 0.012)));
  return d;
};
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
/** Each side's fire trench, 150 m down its own slope from the crest, its own wander. */
const trenchZ = (x: number, north: boolean) => (north ? cz(x) + 150 + 12 * Math.sin(x * 0.012 + 0.4) : cz(x) - 150 - 14 * Math.sin(x * 0.01 + 2.2));

/** The spurs and knolls [x, z, r, h]: the Paissy and Oulches spurs south; the Ailles and Vauclair spurs north; the Californie plateau. */
const RISES = [[-190, 170, 110, 7], [140, 160, 100, 6], [-90, -165, 110, 7], [230, -150, 90, 5], [-400, -170, 100, 6], [-420, 150, 90, 5], [310, 10, 95, 6],
  [70, 260, 90, -4], [-260, -270, 90, -4]]; // (a dry valley cut into each side's slope)
function height(x: number, z: number) {
  const d = z - cz(x), north = d > 0;
  const n = fbm(noise, x * 0.004 + (north ? 0 : 40), z * 0.004, 4);
  // the ridge: a narrow plateau, its limestone shoulders falling steeply, then the long slopes to the valleys
  const plateau = 24 * ridgeK(x) * (0.7 * smoothstep(175, 55, Math.abs(d)) + 0.3 * smoothstep(320, 120, Math.abs(d)));
  let h = 2 + n * 3 + plateau + fbm(noise, x * 0.018 + 9, z * 0.018, 3) * 1.2;
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += smoothstep(BASE_Z - 40 + 30 * Math.sin(x * 0.008 + 1), 640, Math.abs(z)) * 8 + smoothstep(440 + 50 * Math.sin(z * Math.PI / 280), 600, Math.abs(x)) * 22;
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 3 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Beaurieux', 0, 470, 'centre'),
  P('B', 'Vendresse', -380, 280, 'west'),
  P('C', 'Paissy', -80, 300, 'centre'),
  P('D', 'La Ville-aux-Bois', 300, 290, 'east'),
  P('E', 'Caverne du Dragon', -240, Math.round(cz(-240) - 45), 'west', { radius: 26 }),
  P('F', 'Hurtebise', 20, Math.round(cz(20)), 'centre', { radius: 28 }),
  P('G', 'Craonne', 300, Math.round(cz(300) + 50), 'east', { radius: 30 }),
  P('H', 'Chermizy', -340, -300, 'west'),
  P('I', 'Ailles', 50, -310, 'centre'),
  P('J', 'Juvincourt', 350, -270, 'east'),
  P('K', 'Laon road', 0, -470, 'centre'),
] as any[];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

/** A creutte: a quarry mouth cut in the limestone face, its dark entrance, spoil and boulders before it. `out` the way it faces (±1 in z). */
function creutte(props: any, x: number, z: number, out: number) {
  const g = props.terrain.heightAt(x, z), yaw = out > 0 ? 0 : Math.PI;
  props.box('stone', x, g + 1.6, z - out * 1.2, 7.5, 3.8, 3.2, yaw, 0xb8ae96);        // the dressed face over the mouth
  props.box('plain', x, g + 1.1, z + out * 0.45, 3.2, 2.4, 0.2, yaw, 0x14120e);        // the dark mouth
  props.box('plain', x - 2.2, g + 0.6, z + out * 1.6, 1.4, 1.2, 2.6, yaw, 0x7a6a50);   // sandbag baffle
  for (let i = 0; i < 5; i++) props.boulder({ x: x + (props.rand() - 0.5) * 12, z: z + out * (3 + props.rand() * 5), radius: 0.6 + props.rand() * 0.8 });
  props.cover.addBox({ x, z: z - out * 1.2, yaw, length: 7.5, thickness: 3.2, height: 3.5 });
}

export default {
  id: 'chemin-des-dames',
  name: 'Chemin des Dames',
  description: 'April 1917, the Nivelle Offensive: the long limestone ridge of the Chemin des Dames between the Aisne and the Ailette, Germans waiting in the quarries under it, Craonne in ruins at its end — and on the flat ground before Juvincourt the first French tanks.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['fr'], pact: ['de'] }, // (Mazel’s Fifth and Mangin’s Sixth Armies against von Boehn’s Seventh: maps/index.js armiesOn)
  sides: { nato: 'France', pact: 'Germany' },
  conditions: { time: 'dawn', weather: 'overcast' }, // (zero hour 06:00, 16 April, in sleet and low cloud)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1917,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: [], // (no level ground behind either line for a strip: the ridge, the Aisne and the Ailette with their canals — the aircraft come in from the map edge)
  fields: createFields({ seed: 1917, cell: 76, weights: [0.3, 0.35, 0.1, 0.25] as any }),

  theme: {
    // a raw April dawn: low cloud, sleet showers, the chalk-grey light of the Aisne
    fogColor: 0x9ca2a4, fogDensity: 0.0017, skyTop: 0x687078, skyHorizon: 0xb4b6b0, skyBottom: 0x66675f,
    sunColor: 0xdcd6ca, sunIntensity: 1.35, sunDisk: 0.06, clouds: 0.85, cloudLight: 0xbcc0be, cloudDark: 0x6a7078,
    sunDir: [0.5, 0.45, -0.6], hemiSky: 0xbcc4ca, hemiGround: 0x4e4a3c, hemiIntensity: 1.3, rimColor: 0xbcc4cc, rimIntensity: 0.25,
    terrain: {
      grass: '#5a6440', grassAlt: '#4f5a38', dryGrass: '#7e7856', dirt: '#6a5e4a', rock: '#a8a290', strip: '#54483a',
      pasture: '#58643c', ploughed: '#7e7464', stubble: '#8a8058', meadow: '#626c42',
      farmX: [460, 600], farmZ: [520, 640], roads: ROADS, roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x8e8672, 0.85];                                    // the chalky roads
        const d = Math.abs(z - cz(x));
        if (d < 135 && ridgeK(x) > 0.3) {                                             // the crest shelled to bare limestone
          const k = fbm(noise, x * 0.03, z * 0.03, 2);
          if (k > 0.05 - (135 - d) / 300) return [0x8a8070, 0.95];
        }
        if (y < 1.4 && wetD(x, z) < HW + 7) return [0x7a7466, 0.9];                  // the towpaths and banks
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: ROADS }, pact: { x: 0, z: -BASE_Z, entries: ROADS } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** Each side’s trench line on its slope (two belts of wire, gaps at the roads), the ridge cratered by ten days of shelling, the villages in ruins. */
  battlefield(game: any) {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato')]);   // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { zig: 1.5, wireAt: 22, belts: 2, gapEvery: 60 })) if (roadD(w.x, w.z) > 8) works.push(w);
      for (const bx of ROADS) works.push({ kind: 'mgNest', x: bx + 16 * s, z: trenchZ(bx + 16 * s, f === 'nato') - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    const dens = (x: number, z: number) => { const d = Math.abs(z - cz(x)); return 1.4 * (1 - smoothstep(120, 190, d)) + 0.5 * Math.exp(-(((d - 150) / 40) ** 2)) + 0.05; };
    const blasts = [...shellField(1917, { x: 500, z: 560 }, dens).filter((b: number[]) => b[1] >= cz(b[0])), ...shellField(1918, { x: 500, z: 560 }, dens).filter((b: number[]) => b[1] < cz(b[0]))]
      .filter((b: number[]) => wetD(b[0], b[1]) > HW + 10 && !onRoad(b[0], b[1]) && points.every((p) => Math.hypot(p.x - b[0], p.z - b[1]) > 30));
    const r = mulberry32(1917);
    const ruins = game.buildings.list.filter((b: any) => r() < (Math.abs(b.z - cz(b.x)) < 200 ? 0.9 : 0.3)).map((b: any) => b.index);
    const MUD = new THREE.Color(0x6e6452);   // churned limestone and clay
    const paint = (terrain: any) => {
      for (let z = -380; z <= 380; z += 16) for (let x = -500; x <= 500; x += 16) {
        const d = Math.abs(z - cz(x)), k = (1 - smoothstep(110, 170, d)) * (0.6 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.5);
        if (k > 0.05) terrain.dig(x, z, 14, 0, (px: number, pz: number) => Math.max(0, 1 - Math.hypot(px - x, pz - z) / 14), Math.min(1, k) * 0.85, MUD);
      }
    };
    return { blasts, ruins, works, paint };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, r = 0) => wetD(x, z) < HW + 6 + r;
    const trenchBand = (x: number, z: number) => Math.abs(z - trenchZ(x, z > cz(x))) < 28;
    const skip = (x: number, z: number) => wet(x, z, 8) || roadD(x, z) < 8 || trenchBand(x, z);

    // Craonne on the slope under the Californie plateau: stone houses round its church, all shot to pieces
    props.rand = mulberry32(1917_1);
    const G = points[6];
    for (let i = 0, n = 0; n < 16 && i < 300; i++) {
      const a = props.rand() * Math.PI * 2, d = 16 + props.rand() * 40, x = G.x + Math.cos(a) * d * 1.3, z = G.z + Math.sin(a) * d;
      if (skip(x, z) || Math.hypot(x - G.x - 10, z - G.z + 20) < 16) continue;
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2, width: 7 + props.rand() * 3, depth: 8, storeys: 1 + (props.rand() < 0.4 ? 1 : 0), damaged: 0.6 });
      n++;
    }
    props.church({ x: G.x + 10, z: G.z - 20, yaw: 0.1 });
    // Hurtebise farm on the crest, astride the road
    const F = points[5];
    buildSite(props, { kind: 'farm', seed: 1917_2 }, F.x - 22, F.z + 14, 0);
    buildSite(props, { kind: 'farm', seed: 1917_3 }, F.x + 20, F.z - 15, Math.PI);
    buildSite(props, { kind: 'fieldwall', seed: 1917_4 }, F.x + 26, F.z + 18, 0.2);
    // the creuttes: the Caverne du Dragon in the north face (the Germans’), the Paissy caves in the south face (the French)
    props.rand = mulberry32(1917_5);
    for (const [x, out] of [[-280, -1], [-250, -1], [-215, -1], [-130, 1], [-100, 1], [-70, 1]] as const) {
      const z = cz(x) + out * 78;
      if (!trenchBand(x, z) && !onRoad(x, z)) creutte(props, x, z, out);
    }
    // the villages on the slopes and in the valleys, Ville-aux-Bois and Juvincourt on the plain
    for (const p of points) {
      if ('AKEFG'.includes(p.id)) continue;
      farmVillage(props, p.x, p.z, 7, 1917 * 10 + Math.round(p.x * 3 + p.z * 7), skip);
    }
    // farmsteads, field walls, hay and rocks over each side's ground behind its line
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'hay'];
    for (let tries = 0, n = 0; n < 100 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.abs(z - cz(x)) < 190 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) }];
    // the woods: Beaumarais behind the French line, Vauclair behind the German, others of each side's own shape (as much on each)
    const NAMED = [[200, 240, 80], [-150, -235, 80]];
    const wood = (x: number, z: number) => {
      let k = fbm(noise, x * 0.006 + 70, z * 0.006, 3);
      for (const [wx, wz, r] of NAMED) k = Math.max(k, 0.6 * smoothstep(r, r * 0.5, Math.hypot(x - wx, z - wz)));
      return k;
    };
    const tN = 0.22, tP = evenThreshold(wood, tN, (x, z) => z > cz(x));
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3200, hedges: 1800, autumn: 0.1, broadleaf: 0.8,
      forest: (x: number, z: number) => {
        if (wet(x, z, 3)) return -1;
        if (trenchBand(x, z)) return 0.03;
        const d = Math.abs(z - cz(x));
        if (d < 170 && ridgeK(x) > 0.3) return 0.04;                         // the crest: stumps
        if (wetD(x, z) < 34) return 0.25;                                    // poplars along the water
        return Math.abs(x) > 470 || wood(x, z) > (z > cz(x) ? tN : tP) ? 0.8 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
