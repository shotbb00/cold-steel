// Heilsberg, 10 June 1807: Bennigsen waited in a fortified camp on the Alle in front of the town of Heilsberg and
// its red-brick castle — a line of earthwork redoubts on the low heights, the guns behind them, the bridges at his
// back. Murat's cavalry and Soult's corps came up the valley from Guttstadt in the afternoon and threw themselves
// at the works: Saint-Hilaire's men took the second redoubt and were thrown out of it by the Russian Guard,
// Murat's squadrons charged and were charged in turn, and Lannes' attack at ten at night failed in the dark and
// the rain. The French come from the south (+z here), the Russians hold the heights before the town and the river
// (−z). Fair, not mirrored: the two Russian redoubts are traded for Soult's grand battery in its epaulement on the
// Bewernick heights and the walled churchyard at Altkirch, each as far from its own base; the Russians' low ridge
// for the Bewernick heights, as high; the Konegen wood on the Russian left for the Altkirch wood on the French
// right — opposite flanks again. Lawden and the villages between are open to both. The Alle runs only behind the
// Russian base (its bridges are their way in): no one fights across it.
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
const noise = createNoise2D(1807_0610);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Guttstadt road', x: 0, z: 420, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Launau', x: -370, z: 310, owner: null, sector: 'west' },
  { id: 'C', name: 'Bewernick heights', x: -110, z: 250, owner: null, sector: 'centre' },
  { id: 'D', name: 'Altkirch', x: 240, z: 320, owner: null, sector: 'east' },
  { id: 'E', name: 'Grossendorf', x: -310, z: 50, owner: null, sector: 'west' },
  { id: 'F', name: 'Lawden', x: 60, z: -20, owner: null, sector: 'centre' },
  { id: 'G', name: 'Langwiese', x: 290, z: -55, owner: null, sector: 'east' },
  { id: 'H', name: 'First redoubt', x: -250, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Second redoubt', x: 120, z: -250, owner: null, sector: 'centre' },
  { id: 'J', name: 'Konegen', x: 390, z: -340, owner: null, sector: 'east' },
  { id: 'K', name: 'Heilsberg', x: 0, z: -420, owner: 'pact', sector: 'centre', radius: 26 },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Alle behind the Russian camp: the town bridge and the two bridges Bennigsen threw across for the camp
const alleZ = (x) => -530 - 0.05 * x + 14 * Math.sin(x * 0.005 + 2);
const river = createRiver({
  path: alleZ,
  halfWidth: 13,
  level: 0,
  depth: 2.6,
  valley: 50,
  crossings: [
    { name: 'Camp bridge', x: -300, kind: 'bridge', width: 6 },
    { name: 'Heilsberg bridge', x: 0, kind: 'bridge', width: 8 },
    { name: 'Camp bridge', x: 300, kind: 'bridge', width: 6 },
  ],
});
const CASTLE = { x: -70, z: -468 };
/** The woods (0..1): the Konegen wood on the Russian left, the Altkirch wood on the French right, copses. */
const woods = (x, z) => {
  let k = smoothstep(0.52, 0.66, fbm(noise, x * 0.006 - 14, z * 0.006 + 3, 3)) * 0.8;
  k = Math.max(k, smoothstep(1.05, 0.8, Math.hypot((x - P.J.x + 40) / 110, (z - P.J.z - 90) / 80)));    // (the Konegen wood)
  k = Math.max(k, smoothstep(1.05, 0.8, Math.hypot((x - P.D.x - 70) / 110, (z - P.D.z + 70) / 80)));    // (the Altkirch wood)
  for (const p of POINTS) k = Math.min(k, smoothstep(32, 56, Math.hypot(x - p.x, z - p.z)));
  return k;
};

function height(x, z) {
  let h = fbm(noise, x * 0.0026, z * 0.0026, 3) * 4.5 + fbm(noise, x * 0.02 + 5, z * 0.02, 3) * 0.4 + 6;
  h += 7 * Math.exp(-(((z + 275 - x * 0.08) / 80) ** 2)) * smoothstep(-500, -380, x) * smoothstep(330, 200, x); // the low heights the redoubts stand on
  h += hill(x, z, P.H.x, P.H.z, 70, 4) + hill(x, z, P.I.x, P.I.z, 70, 4);
  h += hill(x, z, P.C.x, P.C.z, 120, 11) + 5 * Math.exp(-(((z - 270) / 80) ** 2)) * smoothstep(-520, -400, x) * smoothstep(220, 80, x); // the Bewernick heights, and the rise along the French front
  h += hill(x, z, P.D.x - 20, P.D.z + 40, 90, 4);
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 24 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, z) * 20;
  for (const p of POINTS) if (!'CHI'.includes(p.id)) h += (h * 0.6 + 2.4 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'heilsberg',
  armies: { nato: ['fr'], pact: ['ru'] }, // (Murat, Soult and Lannes against Bennigsen)
  name: 'Heilsberg',
  description: 'East Prussia, June 1807: Bennigsen’s camp of earthwork redoubts on the heights before Heilsberg and its castle on the Alle, Murat’s and Soult’s attacks coming up the valley from Guttstadt.',
  epochs: ['1806'],
  region: 'east',
  conditions: { time: 'dusk', weather: 'overcast' }, // (the fighting went on into the night, in rain)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180761,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1807_10, cell: 70, weights: [0.3, 0.35, 0.1, 0.25] }), // June: green rye and meadows

  theme: {
    // a heavy June evening in Ermland, cloud coming over, the light going yellow-grey
    fogColor: 0xb4b8b0,
    fogDensity: 0.0014,
    skyTop: 0x6c7c90,
    skyHorizon: 0xc8ccc4,
    skyBottom: 0x7c806e,
    sunColor: 0xffe2b8,
    sunIntensity: 1.6,
    sunDisk: 0.3,
    clouds: 0.7,
    cloudLight: 0xe2e2dc,
    cloudDark: 0x848c94,
    sunDir: [-0.6, 0.4, 0.5],
    hemiSky: 0xc4ccd4,
    hemiGround: 0x4a4c34,
    hemiIntensity: 1.3,
    rimColor: 0xd8d4cc,
    rimIntensity: 0.25,
    terrain: {
      grass: '#56683a',
      grassAlt: '#4c6036',
      dryGrass: '#8a8452',
      dirt: '#5c4c3a',
      rock: '#6e6c64',
      strip: '#4e4232',
      pasture: '#5a6c3a',
      ploughed: '#56462f',
      stubble: '#968e58',
      meadow: '#62743e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        for (const q of [P.H, P.I, P.C]) if (Math.hypot(x - q.x, z - q.z) < 36) return [0x6a5a40, 0.5]; // (the works' dug earth)
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 360 }, pact: { x: 0, z: -360 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearWater = (x, z, r) => Math.abs(z - alleZ(x)) < river.halfWidth + r;

    // ---- Heilsberg: town houses round the base and down to the bridge, the church, the castle of the bishops of Ermland
    const rr = mulberry32(1807_0610);
    const taken: number[][] = [];
    for (let i = 0; i < 40; i++) {
      const a = rr() * Math.PI * 2, d = 40 + rr() * 50;
      const x = Math.cos(a) * d * 1.3, z = P.K.z + Math.sin(a) * d * 0.7;
      if (Math.abs(x) < 8 || Math.hypot(x, z + BASE_Z) < 38 || nearWater(x, z, 18) || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 34 || nearPoint(x, z, 16) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue; // (the street down to the bridge)
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.abs(x) < 40 ? Math.PI / 2 : 0, width: 7 + rr() * 3, depth: 8, storeys: rr() < 0.6 ? 2 : 1, damaged: 0 });
    }
    props.rand = mulberry32(10061807);
    props.church({ x: 60, z: P.K.z + 30, yaw: 0 });
    taken.push([60, P.K.z + 30]);
    // the castle: a square of red-brick ranges round the courtyard, the tall corner tower
    const C = CASTLE, g0 = terrain.heightAt(C.x, C.z), BRICK = 0x9a4a36;
    for (const [dx, dz, yaw] of [[0, -14, 0], [0, 14, 0], [-14, 0, Math.PI / 2], [14, 0, Math.PI / 2]] as const) {
      props.box('stone', C.x + dx, g0 + 3, C.z + dz, 30, 7, 4, yaw, BRICK);
      props.box('stone', C.x + dx, g0 + 7.4, C.z + dz, 30.4, 1.8, 3.2, yaw, 0x6a3a2c);
      props.cover.addBox({ x: C.x + dx, z: C.z + dz, yaw, length: 30, thickness: 4, height: 6.5 });
    }
    props.box('stone', C.x - 14, g0 + 8, C.z + 14, 7, 18, 7, 0, BRICK);
    props.cover.addBox({ x: C.x - 14, z: C.z + 14, yaw: 0, length: 7, thickness: 7, height: 16 });
    taken.push([C.x, C.z]);

    // ---- the redoubts: earth walls on three sides, open at the back; Soult's battery in its epaulement; Altkirch's churchyard
    props.rand = mulberry32(1807_61);
    for (const q of [P.H, P.I]) {
      for (const [dx, dz, yaw, length] of [[0, 20, 0, 34], [-17, 4, Math.PI / 2, 26], [17, 4, Math.PI / 2, 26]] as const) props.wall({ x: q.x + dx, z: q.z + dz, yaw, length, height: 1.6 });
      for (const s of [-1, 1]) props.wall({ x: q.x + s * 34, z: q.z + 26, yaw: s * 0.25, length: 16, height: 1.2 }); // (the flèches at the sides)
    }
    for (const [dx, dz, yaw, length] of [[0, -20, 0, 34], [-17, -4, Math.PI / 2, 26], [17, -4, Math.PI / 2, 26]] as const) props.wall({ x: P.C.x + dx, z: P.C.z + dz, yaw, length, height: 1.6 });
    for (const s of [-1, 1]) props.wall({ x: P.C.x + s * 34, z: P.C.z - 26, yaw: -s * 0.25, length: 16, height: 1.2 });
    props.church({ x: P.D.x + 4, z: P.D.z - 30, yaw: Math.PI / 2 });
    for (const [dx, dz, yaw, length] of [[4, -50, 0, 34], [-16, -30, Math.PI / 2, 36], [24, -30, Math.PI / 2, 36]] as const) props.wall({ x: P.D.x + dx, z: P.D.z + dz, yaw, length, height: 1.6 });
    taken.push([P.D.x + 4, P.D.z - 30]);
    for (const p of POINTS) if (!p.owner && 'BDEFGJ'.includes(p.id)) buildVillage(props, p, 18076 + Math.round(p.x * 5 + p.z * 3));

    // ---- farms, walls and hay
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'fieldwall', 'farm'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 88 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 100);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 60 || Math.hypot(x, z + BASE_Z) < 100 || nearPoint(x, z, 60) || woods(x, z) > 0.25 || nearWater(x, z, 50) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 40)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xc8c4b0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      { x: CASTLE.x, z: CASTLE.z, r: 30 }, ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })), { test: (x, z) => nearWater(x, z, 1.5) || Math.hypot(x * 0.75, z - P.K.z) < 75 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4200, broadleaf: 0.7, autumn: 0, forest: (x, z) => (nearWater(x, z, 12) ? 0.5 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 2800, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.4, fields: this.fields });

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
