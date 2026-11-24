// Wertingen, 8 October 1805: the first fight of the Ulm campaign. The Grande Armée had swung round Mack’s flank to the
// Danube at Donauwörth; Murat’s dragoons and Oudinot’s grenadiers of Lannes’s corps came south up the Zusam valley and
// caught Auffenberg’s Austrian column at the little town of Wertingen. The Austrian grenadiers formed squares and fell
// back over the rolling Swabian country towards the woods by Prettelshofen, ridden at again and again, until the
// squares broke; few got away. The French come from the north (+z here), the Austrians from the south (−z). The Zusam
// winds through the field from the south-west to the north-east, through the town and its bridge in the middle.
// Fair, not mirrored: the Zusam crosses the field on a slant, so each side has it on one flank and five crossings lie
// along it (the Wertingen bridge in the middle, a ford and a bridge out toward each end); the Prettelshofen wood and
// its heights west of the town are traded for the Bliensbach wood and heights south-east of it, Pfaffenhofen for
// Roggden, Hohenreichen for Gottmannshofen. No `climate`: an October day, not winter.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 450;
const noise = createNoise2D(1805_08);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Donauwörth road', x: 0, z: 420, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Pfaffenhofen', x: -380, z: 290, owner: null, sector: 'west' },
  { id: 'C', name: 'Prettelshofen', x: -90, z: 230, owner: null, sector: 'centre' },
  { id: 'D', name: 'Hohenreichen', x: 300, z: 330, owner: null, sector: 'east' },
  { id: 'E', name: 'Rieblingen', x: -330, z: 10, owner: null, sector: 'west' },
  { id: 'F', name: 'Wertingen', x: -40, z: 22, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Geratshofen', x: 300, z: -90, owner: null, sector: 'east' },
  { id: 'H', name: 'Gottmannshofen', x: -360, z: -260, owner: null, sector: 'west' },
  { id: 'I', name: 'Bliensbach', x: 150, z: -210, owner: null, sector: 'centre' },
  { id: 'J', name: 'Roggden', x: 380, z: -340, owner: null, sector: 'east' },
  { id: 'K', name: 'Augsburg road', x: 0, z: -420, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Zusam, slanting through the field from the south-west to the north-east, through the town
const ZUSAM = [[-420, -660], [-320, -480], [-255, -340], [-160, -205], [-70, -95], [0, 0], [62, 105], [125, 225], [215, 350], [290, 490], [370, 660]];
const river = createRiver({
  paths: [ZUSAM],
  halfWidth: 8,
  level: 0,
  depth: 1.8,
  valley: 55,
  crossings: [
    { name: 'Biberbach bridge', x: -320, z: -480, kind: 'bridge', width: 6 },
    { name: 'Gottmannshofen ford', x: -160, z: -205, kind: 'ford', width: 12 },
    { name: 'Wertingen bridge', x: 0, z: 0, kind: 'bridge', width: 7 },
    { name: 'Hohenreichen ford', x: 125, z: 225, kind: 'ford', width: 12 },
    { name: 'Zusamaltheim bridge', x: 290, z: 490, kind: 'bridge', width: 6 },
  ],
});
const nearWater = (x, z, r) => river.project(x, z).d < river.halfWidth + r;
/** 1 in the town, 0 outside it: Wertingen on both banks of the Zusam round its bridge. */
const town = (x, z) => smoothstep(1.1, 0.85, Math.hypot(x / 85, z / 75));
const CASTLE = { x: 52, z: -36 };

/** The woods (0..1): the Prettelshofen wood, the Bliensbach wood, copses on the hilltops, alders along the Zusam. */
const woods = (x, z) => {
  let k = smoothstep(0.5, 0.64, fbm(noise, x * 0.006 - 7, z * 0.006 + 23, 3)) * 0.85;
  k = Math.max(k, smoothstep(1.05, 0.8, Math.hypot((x - P.C.x + 120) / 110, (z - P.C.z + 30) / 80)));   // (the Prettelshofen wood, west of the town)
  k = Math.max(k, smoothstep(1.05, 0.8, Math.hypot((x - P.I.x - 110) / 115, (z - P.I.z - 40) / 75)));   // (the Bliensbach wood, south-east)
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 56, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(20, 40, Math.hypot(x - c.x, z - c.z)));
  return Math.min(k, 1 - town(x, z));
};

function height(x, z) {
  let h = fbm(noise, x * 0.003, z * 0.003, 3) * 7 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.4 + 7;
  h += hill(x, z, P.C.x - 90, P.C.z - 20, 110, 6) + hill(x, z, P.B.x + 40, P.B.z + 40, 90, 4);   // the heights west of the town, by Prettelshofen
  h += hill(x, z, P.I.x + 90, P.I.z + 30, 115, 10) + hill(x, z, P.J.x - 30, P.J.z - 30, 90, 4);   // the Bliensbach heights south-east of it
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 22 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  h += (3 - h) * town(x, z) * 0.6;                                                                 // the town down in the valley
  for (const p of POINTS) if (p.id !== 'F') h += (h * 0.6 + 2.6 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (7 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'wertingen',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Murat and Lannes against Auffenberg — Austria has no units yet: Russia fights for her)
  name: 'Wertingen',
  description: 'Swabia, October 1805: the little town of Wertingen on the Zusam and its bridge, the rolling country round it with the Prettelshofen and Bliensbach woods on the hills.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180508,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1805_8, cell: 70, weights: [0.25, 0.35, 0.3, 0.1] }), // October: stubble, ploughland, the aftermath in the meadows

  theme: {
    // a grey October day, the cloud breaking now and then
    fogColor: 0xb0b6b4,
    fogDensity: 0.0016,
    skyTop: 0x6a7c90,
    skyHorizon: 0xbcc2c0,
    skyBottom: 0x80867a,
    sunColor: 0xf0e4c8,
    sunIntensity: 1.4,
    sunDisk: 0.2,
    clouds: 0.8,
    cloudLight: 0xd8dade,
    cloudDark: 0x7a828a,
    sunDir: [-0.45, 0.5, 0.55],
    hemiSky: 0xc4ccd2,
    hemiGround: 0x565238,
    hemiIntensity: 1.35,
    rimColor: 0xd0d4d8,
    rimIntensity: 0.2,
    terrain: {
      grass: '#5a6a38',
      grassAlt: '#506034',
      dryGrass: '#8a8250',
      dirt: '#5c4c38',
      rock: '#76746a',
      strip: '#4e4232',
      pasture: '#5c6c3a',
      ploughed: '#55432f',
      stubble: '#9a8e58',
      meadow: '#62723e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const t = town(x, z);
        if (t > 0) return [0x6e6252, t * 0.5];                                                     // the town’s lanes and yards
        const d = river.project(x, z).d - river.halfWidth;
        return d > 0 && d < 30 ? [0x4e5e3a, smoothstep(30, 6, d) * 0.45] : null;                  // the Zusam meadows
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 360 }, pact: { x: 0, z: -360 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const taken: number[][] = [];

    // ---- Wertingen: houses round the market on both banks, the church, the castle by the bridge
    props.rand = mulberry32(1805_1008);
    props.church({ x: P.F.x - 30, z: P.F.z + 24, yaw: Math.PI / 2 });
    taken.push([P.F.x - 30, P.F.z + 24]);
    props.hall({ x: CASTLE.x, z: CASTLE.z, yaw: 0.6, width: 22, depth: 11, height: 9, color: 0xe2dac6, roof: 0x6a3a2a, door: 3, name: 'castle' }); // (the Wertingen Schloss)
    props.box('stone', CASTLE.x - 12, terrain.heightAt(CASTLE.x - 12, CASTLE.z + 10) + 6, CASTLE.z + 10, 5, 14, 5, 0.6, 0xd8d0bc); // (its tower)
    props.cover.addBox({ x: CASTLE.x - 12, z: CASTLE.z + 10, yaw: 0.6, length: 5, thickness: 5, height: 12 });
    taken.push([CASTLE.x, CASTLE.z], [CASTLE.x - 12, CASTLE.z + 10]);
    const rr = mulberry32(1805_88);
    for (let i = 0; i < 70; i++) {
      const x = (rr() * 2 - 1) * 85, z = (rr() * 2 - 1) * 75;
      if (town(x, z) < 0.6 || nearWater(x, z, 12) || Math.hypot(x - P.F.x, z - P.F.z) < 16 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: 0.55 + (rr() < 0.5 ? 0 : Math.PI / 2), width: 7 + rr() * 3, depth: 8, storeys: rr() < 0.5 ? 2 : 1, damaged: 0 });
    }
    // ---- the villages, each a church; the mill on the Zusam by Hohenreichen
    for (const p of POINTS) if (!p.owner && p.id !== 'F') buildVillage(props, p, 18058 + Math.round(p.x * 3 + p.z * 7));
    props.rand = mulberry32(1805_81);
    for (const [q, dx, dz] of [[P.B, 28, -22], [P.D, -26, 24], [P.H, 26, 22], [P.J, -28, -20]] as const) { props.church({ x: q.x + dx, z: q.z + dz, yaw: 0 }); taken.push([q.x + dx, q.z + dz]); }
    props.hall({ x: 190, z: 255, yaw: 0.6, width: 11, depth: 8, height: 5, color: 0xd0c4a8, roof: 0x6a3a2a, door: 3, name: 'mill' });
    taken.push([190, 255]);

    // ---- farms, field walls and hay over the rolling fields
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'hay', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 86 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 100);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 60 || Math.hypot(x, z + BASE_Z) < 60 || nearPoint(x, z, 55) || woods(x, z) > 0.25 || town(x, z) > 0 || nearWater(x, z, 35) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 40)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd4d0c0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })), { test: (x, z) => nearWater(x, z, 1.5) || town(x, z) > 0.3 }];
    // beech, oak and spruce on the Swabian hills, turning
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4400, broadleaf: 0.6, autumn: 0.8, forest: (x, z) => (nearWater(x, z, 8) ? 0.45 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1800, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.8, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
        hedges.update(dt, t);
      },
    };
  },
} satisfies MapDef;
