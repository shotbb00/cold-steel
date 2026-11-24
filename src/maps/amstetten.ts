// Amstetten, 5 November 1805: Kutuzov was falling back down the Danube valley toward Vienna and Krems, and Bagration
// held the rear. East of the Ybbs, where the Vienna post road runs through the wooded hills of the Mostviertel between
// Amstetten and Blindenmarkt, his rearguard — Russian grenadiers, jägers and hussars under Bagration and Miloradovich —
// turned in the forest clearings and stopped Murat’s cavalry coming hard down the road. Oudinot’s grenadiers came up
// through the woods, and after a long afternoon of charges and bayonet work among the trees the Russians drew off in
// the dark, having bought the army its day.
// On the map (1.0 × 1.12 km): the French come down the post road from Amstetten and the Ybbs (+z), the Russians hold
// it toward Blindenmarkt (−z). The road winds through a broad belt of beech and oak wood over rolling hills, crossing
// the wooded ridge in the middle at the post-house clearing; the four-square farms of the Mostviertel (Vierkanthöfe)
// stand in their clearings, Seisenegg castle on its hill, the Url brook down a wooded dell on the west.
// Fair, not mirrored: the ridge in the middle with the post house is owned by neither and the road reaches it from
// both sides over the same rise; each side has a wooded knoll on its own half (the Eisenreichdornach wood, the
// Seisenegg hill) at the same distance, the Url dell runs the whole west flank and is crossed by the same fords at
// both ends; the clearings and farms on either half are as open and as far from their base as their counterparts.
// 1806 only (`epochs`: maps/index.js mapsFor).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 490;
const noise = createNoise2D(1805_1105);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Amstetten road', x: 0, z: 465, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Greinsfurth', x: -330, z: 290, owner: null, sector: 'west' },
  { id: 'C', name: 'Mauer', x: 40, z: 280, owner: null, sector: 'centre' },
  { id: 'D', name: 'Eisenreichdornach', x: 330, z: 220, owner: null, sector: 'east' },
  { id: 'E', name: 'Url mill', x: -310, z: -10, owner: null, sector: 'west' },
  { id: 'F', name: 'Post house', x: 10, z: 0, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Viehdorf', x: 300, z: 10, owner: null, sector: 'east' },
  { id: 'H', name: 'Hubertendorf', x: -320, z: -290, owner: null, sector: 'west' },
  { id: 'I', name: 'Matzendorf', x: -20, z: -280, owner: null, sector: 'centre' },
  { id: 'J', name: 'Seisenegg', x: 320, z: -220, owner: null, sector: 'east' },
  { id: 'K', name: 'Blindenmarkt road', x: 0, z: -465, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Url, a brook down the west flank in its wooded dell: fords at the two farms’ lanes and at the mill
const river = createRiver({
  paths: [[[-415, -720, 5], [-405, -420, 6], [-380, -200, 6], [-392, 0, 7], [-372, 200, 7], [-398, 420, 8], [-388, 720, 8]]],
  halfWidth: 7, level: 0, depth: 1.8, valley: 34,
  crossings: [
    { name: 'Url ford (Greinsfurth)', x: -380, z: 290, kind: 'ford', width: 12 },
    { name: 'Url mill bridge', x: -390, z: -10, kind: 'bridge', width: 7 },
    { name: 'Url ford (Hubertendorf)', x: -385, z: -300, kind: 'ford', width: 12 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
// the Vienna post road, winding over the hills; the lane east to Viehdorf and Seisenegg
const roadX = (z) => 30 * Math.sin(z * 0.006) - 20 * Math.sin(z * 0.013 + 1);
const roadD = (x, z) => Math.abs(x - roadX(z));
/** The farm clearings: open ground round each village and the post house (0 wood .. 1 open). */
const CLEAR = [...POINTS.filter((p) => !p.owner).map((p) => [p.x, p.z, p.id === 'F' ? 80 : 95]), [0, 470, 120], [0, -470, 120], [150, 150, 60], [-150, -150, 60], [-160, 170, 55], [160, -170, 55]];
const clearing = (x, z) => Math.max(...CLEAR.map(([cx, cz, r]) => smoothstep(r, r * 0.6, Math.hypot(x - cx, z - cz) + fbm(noise, x * 0.015, z * 0.015, 2) * 25)));

/** The woods (0..1): the wooded hills everywhere but the clearings and the road’s verges. */
const woods = (x, z) => {
  let k = smoothstep(0.32, 0.5, fbm(noise, x * 0.005 + 13, z * 0.005 - 21, 3) * 0.5 + 0.5);
  k = Math.min(k, 1 - clearing(x, z), smoothstep(6, 16, roadD(x, z)));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 50, Math.hypot(x - p.x, z - p.z)));
  return k;
};

function height(x, z) {
  let h = fbm(noise, x * 0.004, z * 0.004, 3) * 7 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.5 + 6;
  h += 9 * Math.exp(-((z / 140) ** 2)) * (1 - 0.35 * Math.exp(-((x / 90) ** 2)));   // the wooded ridge across the middle, a saddle where the road goes over
  h += hill(x, z, P.D.x + 30, P.D.z + 30, 85, 10) + hill(x, z, P.J.x + 20, P.J.z - 20, 85, 5); // the Eisenreichdornach wood, the Seisenegg hill
  h += hill(x, z, -200, 340, 130, 3);                                               // the Greinsfurth heath
  h -= smoothstep(-300, -380, x) * 6;                                                // down into the Url dell
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 140, x) * 16 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  for (const p of POINTS) if (!'DJ'.includes(p.id)) h += (h * 0.6 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.45; // farms on level ground
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'amstetten',
  armies: { nato: ['fr'], pact: ['ru'] }, // (Murat’s cavalry and Oudinot’s grenadiers against Bagration’s Russian rearguard)
  name: 'Amstetten',
  description: 'The Vienna post road east of the Ybbs, 5 November 1805: Bagration’s Russian rearguard turns on Murat and Oudinot in the wooded hills and farm clearings between Amstetten and Blindenmarkt.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'overcast' }, // (a cold, wet November day)
  airfields: [],
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 18051105,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.85,
  fields: createFields({ seed: 1805_1105, cell: 64, weights: [0.4, 0.2, 0.22, 0.18] }), // November: pasture, ploughland, stubble

  theme: {
    // a cold November afternoon in the Mostviertel, damp mist in the woods
    fogColor: 0xa8aeac,
    fogDensity: 0.002,
    skyTop: 0x6e7a86,
    skyHorizon: 0xbcc0ba,
    skyBottom: 0x6e716a,
    sunColor: 0xe2d8c4,
    sunIntensity: 1.5,
    sunDisk: 0.08,
    clouds: 0.9,
    cloudLight: 0xc6c8c4,
    cloudDark: 0x767c82,
    sunDir: [0.45, 0.4, -0.75],
    hemiSky: 0xbcc4cc,
    hemiGround: 0x484234,
    hemiIntensity: 1.25,
    rimColor: 0xb8c0c8,
    rimIntensity: 0.25,
    terrain: {
      grass: '#56603a',
      grassAlt: '#4a5434',
      dryGrass: '#82744e',
      dirt: '#534438',
      rock: '#6a6862',
      strip: '#483c2e',
      pasture: '#56623a',
      ploughed: '#4a3a2c',
      stubble: '#867650',
      meadow: '#626c3e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const rd = roadD(x, z);
        if (rd < 5) return [0x80766a, smoothstep(5, 3, rd) * 0.75];                           // the post road
        if (woods(x, z) > 0.5) return [0x4a3c2c, 0.35];                                       // fallen leaves under the beeches
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 260] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 260] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const rr = mulberry32(1805_11051);
    /** A Mostviertel four-square farm: four wings round a court, one gateway. */
    const vierkanthof = (cx, cz, yaw, s = 24) => {
      const c = Math.cos(yaw), si = Math.sin(yaw);
      const at = (u, v) => ({ x: cx + u * c + v * si, z: cz - u * si + v * c });
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ ...at(0, s / 2 - 3.5), yaw, width: s, depth: 7, storeys: 2, name: 'Vierkanthof', damaged: 0 });
      props.townHouse({ ...at(0, -s / 2 + 3.5), yaw, width: s, depth: 7, storeys: 1, name: 'Vierkanthof barn', damaged: 0 });
      props.townHouse({ ...at(s / 2 - 3.5, 0), yaw: yaw + Math.PI / 2, width: s - 14, depth: 7, storeys: 1, name: 'Vierkanthof stable', damaged: 0 });
      props.wall({ ...at(-s / 2 + 1, 0), yaw: yaw + Math.PI / 2, length: s - 16, height: 2.4 }); // (the gateway side)
    };

    // ---- the farm points: a Vierkanthof and a few cottages each; the post house on the road; Seisenegg castle
    for (const p of POINTS) {
      if (p.owner || p.id === 'F' || p.id === 'J') continue;
      const side = p.x > roadX(p.z) ? 1 : -1;
      vierkanthof(p.x + side * 40, p.z + 8, rr() * 0.5);
      buildVillage(props, { x: p.x - side * 6, z: p.z - 10 }, 18055 + Math.round(p.x * 3 + p.z * 7));
    }
    props.rand = mulberry32(1805_11052);
    props.townHouse({ x: roadX(0) + 22, z: 18, yaw: Math.PI / 2, width: 18, depth: 9, storeys: 2, name: 'post house', damaged: 0 });
    props.hall({ x: roadX(0) + 24, z: -16, yaw: Math.PI / 2, width: 16, depth: 8, height: 5, color: 0x9a8a70, roof: 0x5a3a2a, door: 5, name: 'post stables' });
    props.townHouse({ x: roadX(0) - 20, z: -4, yaw: Math.PI / 2, width: 9, depth: 7, storeys: 1, name: 'smithy', damaged: 0 });
    props.church({ x: P.C.x - 34, z: P.C.z - 26, yaw: 0 });
    props.church({ x: P.I.x + 34, z: P.I.z + 26, yaw: Math.PI });
    props.church({ x: P.J.x + 18, z: P.J.z - 14, yaw: 0.3 });                           // (the castle chapel)
    props.townHouse({ x: P.J.x - 12, z: P.J.z - 20, yaw: 0.3, width: 16, depth: 10, storeys: 3, name: 'Seisenegg castle', damaged: 0 });
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) props.wall({ x: P.J.x + Math.cos(a) * 34, z: P.J.z + Math.sin(a) * 34, yaw: a + Math.PI / 2, length: 20, height: 2.6 });
    props.hall({ x: P.E.x - 44, z: P.E.z + 16, yaw: Math.PI / 2, width: 12, depth: 8, height: 5, color: 0x9a8a70, roof: 0x5a3a2a, door: 4, name: 'Url mill' });
    // more farms in the clearings
    for (const [cx, cz, , ] of CLEAR.slice(-4)) vierkanthof(cx + 10, cz, rr() * 1.2, 22);

    // ---- hay, field walls and log piles in the clearings
    const kinds = ['hay', 'fieldwall', 'farm', 'hay', 'rocks', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 60 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 55) || woods(x, z) > 0.3 || wet(x, z, 25) || roadD(x, z) < 14) continue;
      if (CLEAR.slice(-4).some(([cx, cz]) => Math.hypot(x - cx - 10, z - cz) < 30)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (let i = 0; i < 26; i++) {                                                     // (woodcutters’ stacks by the road)
      const z = -430 + i * 34, x = roadX(z) + (i % 2 ? 11 : -11);
      if (!nearPoint(x, z, 40) && woods(x + (i % 2 ? 8 : -8), z) > 0.4) props.logPile({ x, z, yaw: 0.1 });
    }

    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xcfc8b0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.tent({ x: base.x - 34, z: base.z - toward * 12, yaw: 0.1, color: canvas });
      props.crates({ x: base.x + 16, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })),
      { test: (x, z) => wet(x, z, 1.5) || roadD(x, z) < 6 }];
    // beech and oak with some spruce and fir: the Mostviertel woods, the pear trees by the farms
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 7000, broadleaf: 0.7, autumn: 1, forest: (x, z) => (wet(x, z, 8) ? 0.5 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1600, lane: 0 });
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
