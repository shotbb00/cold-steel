// Côte 304, 20–24 August 1917: Pétain’s answer to the mutinies — a limited attack with all the guns. The French Second
// Army (Guillaumat) goes up the left bank of the Meuse at Verdun behind a week of bombardment and takes back in four days
// what the Germans had bled for in 1916: Le Mort Homme on the first morning, the Côte de l’Oie, then Côte 304 itself.
// On the map: the two bare hills churned for over a year into one crater field, Côte 304 a long whale-back running toward
// Le Mort Homme with its twin crests, the Ravin de la Hayette cut down between them; the destroyed villages — Esnes in its
// brook’s valley, Chattancourt and Marre on the French side, Haucourt, Béthincourt and Forges on the Forges brook on the
// German; the entrances of the tunnels the Germans drove through the hills (the Kronprinz tunnel under Côte 304, the
// Gallwitz under Le Mort Homme) on their reverse slopes, the French dugouts on the other side; the Meuse along the east
// edge with the Cumières bridge to the right bank. Not mirrored but fair: each side has a hill reaching toward it from the
// middle (Côte 304 leans to the French, Le Mort Homme to the Germans, both the same height and the same reach from the
// bases), a brook of its own behind its lines with three crossings each in the same places, two trench lines each at the
// same depth, its three villages as far back; the ravine and the Meuse bridge sit on the middle line.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, shellField, buildSite } from './common.js';
import { farmVillage, segDist, evenThreshold } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SIDE_X = 300;
const noise = createNoise2D(1917_08);
const MUD = new THREE.Color(0x5a4c3c);   // churned Meuse clay and limestone

// the Meuse down the east edge; the Forges brook behind the German line, the Esnes brook behind the French (each its own wander)
const MEUSE = [[420, -640], [406, -380], [428, -140], [410, 70], [432, 300], [414, 640]];
const FORGES = [[-560, -214, 6], [-400, -226, 6], [-290, -206, 6], [-150, -224, 6], [0, -210, 6], [130, -230, 6], [270, -214, 7], [410, -200, 8]];
const ESNES = [[-560, 222, 6], [-380, 206, 6], [-250, 228, 6], [-100, 212, 6], [40, 230, 6], [190, 208, 6], [330, 224, 7], [416, 236, 8]];
/** A brook's z at x (its points run west to east). */
const brookZ = (poly: number[][], x: number) => {
  for (let i = 0; i < poly.length - 1; i++) if (x <= poly[i + 1][0]) return poly[i][1] + (poly[i + 1][1] - poly[i][1]) * (x - poly[i][0]) / (poly[i + 1][0] - poly[i][0]);
  return poly[poly.length - 1][1];
};
const XS = [-SIDE_X, 0, SIDE_X - 20];
const river = createRiver({
  paths: [MEUSE, FORGES, ESNES], halfWidth: 18, level: 0, depth: 2.6, valley: 62,
  crossings: [
    { name: 'Cumières bridge', x: 418, z: 0, kind: 'bridge', width: 7, channel: 0 },
    ...['Haucourt bridge', 'Béthincourt ford', 'Forges bridge'].map((name, i) => ({ name, x: XS[i], z: brookZ(FORGES, XS[i]), kind: i === 1 ? 'ford' : 'bridge', width: 7, channel: 1 })),
    ...['Esnes bridge', 'Hayette ford', 'Chattancourt bridge'].map((name, i) => ({ name, x: -XS[2 - i], z: brookZ(ESNES, -XS[2 - i]), kind: i === 1 ? 'ford' : 'bridge', width: 7, channel: 2 })),
  ],
});
const wetD = (x: number, z: number) => river.project(x, z).d;

// the hills [x, z, r, h]: Côte 304’s long back running east toward Le Mort Homme; Le Mort Homme’s two crests (295 and 265)
const H304 = { x: -255, z: 45 }, MORT = { x: 165, z: -40 };
const HILLS = [[H304.x, H304.z, 200, 21], [-150, 15, 150, 9], [-345, 85, 130, 7], [MORT.x, MORT.z, 175, 19], [245, -10, 120, 9], [75, -80, 140, 8]];
const HAYETTE = [[-60, 190], [-30, 60], [-10, -60], [-40, -190]];   // the ravine cut down between the hills
const hillK = (x: number, z: number) => Math.max(...[HILLS[0], HILLS[3]].map(([hx, hz, r]) => 1 - Math.hypot(x - hx, z - hz) / r));

function height(x: number, z: number) {
  let h = 8 + fbm(noise, x * 0.003, z * 0.003, 3) * 4 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.5;
  for (const [hx, hz, r, hh] of HILLS) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.4;
  h -= 6 * (1 - smoothstep(10, 40, segDist(HAYETTE, x, z)));
  h += smoothstep(420 + 40 * Math.sin(x * 0.008), 600, Math.abs(z)) * 10;   // (the edges rise: as much on each half)
  h += smoothstep(420, 560, -x) * 22;                                        // the woods of Avocourt rising to the west
  h += smoothstep(445, 520, x) * 24;                                         // the right bank’s heights over the Meuse
  for (const bz of [BASE_Z, -BASE_Z]) h += (12 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Bois Bourrus', 0, 470, 'centre'),
  P('B', 'Esnes', -330, 310, 'west'),
  P('C', 'Chattancourt', 70, 330, 'centre'),
  P('D', 'Marre', 300, 300, 'east'),
  P('E', 'Côte 304', H304.x, H304.z, 'west', { radius: 30 }),
  P('F', 'Ravin de la Hayette', -30, -5, 'centre', { radius: 26 }),
  P('G', 'Le Mort Homme', MORT.x, MORT.z, 'east', { radius: 30 }),
  P('H', 'Haucourt', -345, -305, 'west'),
  P('I', 'Béthincourt', -20, -325, 'centre'),
  P('J', 'Forges', 310, -275, 'east'),
  P('K', 'Montfaucon road', 0, -470, 'centre'),
] as any[];

/** How churned the ground is (0..1): the whole fought-over band across both hills. */
const churn = (z: number) => 1 - smoothstep(170, 290, Math.abs(z));
/** Each side’s trench lines: the front line on its hill’s near slope, the support line behind (a small wander of its own). */
const LINES = [{ z: 95, wireAt: 18, belts: 2, seed: 17 }, { z: 145, wireAt: 14, belts: 1, seed: 53 }];
const linePts = (z: number, faction: 'nato' | 'pact', seed: number) => {
  const r = mulberry32(faction === 'nato' ? seed : seed * 31 + 7), pts: number[][] = [], ph = r() * 6;
  for (let x = -480; x <= 480; x += 40) pts.push([x, z + (r() - 0.5) * 12 + 8 * Math.sin(x * 0.011 + ph)]);
  return faction === 'nato' ? pts : pts.map(([x, zz]) => [-x, -zz]);
};
/** The tunnel mouths: the Germans’ on the reverse slopes (Kronprinz under Côte 304, Gallwitz under Le Mort Homme), the French dugouts facing them. */
const MOUTHS = [[-235, -118, 0], [-295, -110, 0], [140, -150, 0], [205, -145, 0], [-250, 135, Math.PI], [-185, 128, Math.PI], [150, 120, Math.PI], [215, 128, Math.PI]];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1re Section' }];

export default {
  id: 'cote-304',
  name: 'Côte 304',
  description: 'August 1917, the left bank of the Meuse at Verdun: Côte 304 and Le Mort Homme, two bare hills churned into one crater field, the Ravin de la Hayette between them, destroyed villages on the brooks behind each line, the Germans’ tunnel mouths on the reverse slopes and the Meuse along the east edge.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['fr'], pact: ['de'] }, // (Guillaumat’s Second Army against the German Fifth: maps/index.js armiesOn)
  sides: { nato: 'France', pact: 'Germany' },
  conditions: { time: 'dawn', weather: 'clear' }, // (the attack went in at 04:40 on 20 August, a hot clear summer)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1917_08,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  // each side's airfield behind its brook, clear of the water (the strip 55 m behind the tower: systems/Airfields.js)
  airfields: [{ faction: 'nato', x: -135, z: 300, yaw: Math.PI / 2 }, { faction: 'pact', x: 175, z: -300, yaw: -Math.PI / 2 }],
  fields: createFields({ seed: 191708, cell: 80, weights: [0.3, 0.3, 0.1, 0.3] as any }),

  theme: {
    // a hot, dusty August morning, the haze of the guns over the hills
    fogColor: 0xaea896, fogDensity: 0.0014, skyTop: 0x6a86a4, skyHorizon: 0xcac6b6, skyBottom: 0x80786a,
    sunColor: 0xfff0d4, sunIntensity: 1.9, sunDisk: 0.25, clouds: 0.35, cloudLight: 0xeae6dc, cloudDark: 0x948e88,
    sunDir: [0.5, 0.6, 0.5], hemiSky: 0xc4ccd2, hemiGround: 0x5c5240, hemiIntensity: 1.25, rimColor: 0xd0d0cc, rimIntensity: 0.25,
    terrain: {
      grass: '#5c6438', grassAlt: '#525a32', dryGrass: '#8e8454', dirt: '#5e5040', rock: '#a29c8a', strip: '#4e4232',
      pasture: '#5a6436', ploughed: '#76685a', stubble: '#9a8c5a', meadow: '#646e3c',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-SIDE_X, 0, SIDE_X], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        if (y < 1.6 && wetD(x, z) < 30) return [0x4e5a32, 0.7];                 // reed and wet meadow along the water
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** The crater field over both hills, the villages in ruins, the trench lines and wire, the mud. */
  battlefield(game: any) {
    const dens = (x: number, z: number) => (wetD(x, z) < 64 ? 0 : (1 - smoothstep(95, 130, z)) * 4 + churn(z) * 1.6 + 0.12); // (none in the valleys: no holes below the water)
    const blasts = [...shellField(1917_08, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(1917_09, BOUNDS, dens).filter((b) => b[1] < 0)]; // (each half its own)
    const ruins = game.buildings.list.filter((b: any) => mulberry32(b.index * 7 + 1917)() < (Math.abs(b.z) < 380 ? 0.95 : 0.4)).map((b: any) => b.index);
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      for (const l of LINES) for (const w of trenchLine(linePts(l.z, f, l.seed), f, { wireAt: l.wireAt, belts: l.belts, gapEvery: 60 })) if (wetD(w.x, w.z) > 60) works.push(w);
      const s = f === 'nato' ? 1 : -1;
      for (const x of [-260, -40, 170]) works.push({ kind: 'mgNest', x: x * s, z: (LINES[0].z - 6) * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    const paint = (terrain: any) => {
      for (let z = -BOUNDS.z; z <= BOUNDS.z; z += 16) for (let x = -BOUNDS.x; x <= BOUNDS.x; x += 16) {
        const k = churn(z) * (0.75 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.5) * (wetD(x, z) < 40 ? 0.3 : 1);
        if (k > 0.05) terrain.dig(x, z, 14, 0, (px: number, pz: number) => Math.max(0, 1 - Math.hypot(px - x, pz - z) / 14), Math.min(1, k) * 0.9, MUD);
      }
    };
    return { blasts, ruins, works, paint };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const trenchBand = (z: number) => LINES.some((l) => Math.abs(Math.abs(z) - l.z) < 30);
    const skip = (x: number, z: number) => wetD(x, z) < 34 || trenchBand(z);

    // the destroyed villages, Esnes’ and Béthincourt’s churches
    for (const p of points) {
      if (['A', 'K', 'E', 'F', 'G'].includes(p.id)) continue;
      const big = p.id === 'B' || p.id === 'I';
      farmVillage(props, p.x, p.z, big ? 9 : 6, 1917 * 10 + Math.round(p.x * 3 + p.z * 7), skip, big ? 1.3 : 1);
    }
    props.rand = mulberry32(304);
    props.church({ x: -300, z: 330, yaw: 0.3 });
    props.church({ x: -50, z: -345, yaw: Math.PI - 0.2 });
    // Cumières by the bridge on the left bank (a few walls left), a ruin across on the right bank
    for (const [x, z] of [[350, -30], [345, 30], [366, 52], [470, -20]]) props.house({ x, z, yaw: Math.PI / 2 + props.rand() * 0.4, width: 8, depth: 6 });
    // the tunnel mouths: a concrete portal dug into the slope, the dark gallery, sandbags either side
    for (const [x, z, yaw] of MOUTHS) {
      const y = terrain.heightAt(x, z), s = yaw ? 1 : -1;
      props.box('plain', x, y + 1.3, z, 5.2, 2.8, 1.2, yaw, 0x8e8a80);
      props.box('plain', x, y + 1.0, z + 0.4 * s, 2.2, 2.0, 0.6, yaw, 0x0c0b0a);
      props.box('plain', x, y + 2.9, z - 1.5 * s, 6.0, 0.5, 4.0, yaw, 0x7a766c);
      props.sandbagRing({ x, z: z + 5 * s, radius: 4, toward: -s });
    }
    // farmsteads, field walls and hay on the quiet ground behind each side’s lines (each half its own)
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks'];
    for (let tries = 0, n = 0; n < 70 && tries < 8000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (n % 2 ? -1 : 1) * (300 + rand() * (bounds.z - 340));
      if (Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || nearPoint(x, z, 50) || skip(x, z) || x > 380) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0xcfc8b0);
    commandPost(props, this.bases.pact, 1, 0xb8b4a0);
    props.finish();
    river.build(scene, terrain);

    // the woods: shot to stumps on the hills, whole behind the lines (Bois Bourrus, Bois de Forges); each half the same wooded area
    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...MOUTHS.map(([x, z]) => ({ x, z, r: 8 })), { test: (x: number, z: number) => wetD(x, z) < 22 }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.007 + 40, z * 0.007 - 12, 3);
    const tN = 0.18, tP = evenThreshold((x, z) => (Math.abs(z) > 250 ? wood(x, z) : -9), tN, (x, z) => z > 0);
    const forest = (x: number, z: number) => {
      if (wetD(x, z) < 24) return -1;
      if (Math.abs(z) < 260) return trenchBand(z) ? 0 : 0.012 * (1 - hillK(x, z));   // (a stump here and there)
      return wood(x, z) > (z > 0 ? tN : tP) || x < -460 || x > 470 ? 0.85 : 0.02;
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2600, forest, autumn: 0.05, broadleaf: 0.85 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (_x: number, z: number) => Math.abs(z) < 330 }], count: 1400, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: [...avoid, { test: (_x: number, z: number) => Math.random() < churn(z) * 0.92 }], density: 2.6, fields: this.fields }); // (hardly a blade of grass on the hills)
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); hedges.update(dt, t); },
    };
  },
} satisfies MapDef;
