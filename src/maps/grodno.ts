// Grodno and the Niemen (hypothetical, summer 1807; the real fight came in June 1812, when Jérôme’s Westphalians
// and Poniatowski’s Poles came up to the town Platov’s Cossacks had just left). Grodno stands on the high right bank
// of the Niemen: the Old Castle of Vytautas and Báthory on its bluff over the river, Augustus III’s New Castle beside
// it, the Jesuits’ Fara over the market, the Bernardine monastery and the little Kalozha church of SS Boris and Gleb
// on the edge of the scarp; one bridge at the foot of the castle hill to the low left bank and the Zaniemański
// suburb; meadows and pine and spruce woods of Lithuania round about.
// On the map (1.0 × 1.12 km, a summer day): the French come from the Białystok road (+z), the Russians from the Vilna
// road (−z). The Niemen runs down the west of the field from the Russian end to the French one, bowed east under the
// town; the right bank is the high plateau with the town in the middle, the left bank low meadow and woods. The
// bridge below the castle, a ford at Łosośna above the town, one at Pyshki below it.
// Not mirrored but fair: the river runs down the field, not across it, so each side has the same two banks before it
// and the bluff runs as far into each half; the castle, the market and the bridgehead suburb — the decisive ground —
// stand in the middle, owned by neither, and the two fords lie as far from either base. The Kalozha church on the
// scarp before the French is traded for the Bernardine monastery before the Russians, the Pyshki woods for the
// Łosośna woods, Dziewiatówka for Wiercieliszki; each as far from the nearer base as its counterpart
// (tools/map_fairness.py). The castle has a gate on each side, so it can be stormed from the town, the scarp and both ends.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 460;
const noise = createNoise2D(1807_0712);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Białystok road', x: 0, z: 430, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Pyshki', x: -370, z: 310, owner: null, sector: 'west' },
  { id: 'C', name: 'Kalozha church', x: -20, z: 235, owner: null, sector: 'centre' },
  { id: 'D', name: 'Dziewiatówka', x: 290, z: 280, owner: null, sector: 'east' },
  { id: 'E', name: 'Zaniemań suburb', x: -260, z: 15, owner: null, sector: 'west' },
  { id: 'F', name: 'Old Castle', x: 25, z: -20, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Fara market', x: 260, z: 10, owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'Łosośna', x: -350, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Bernardine monastery', x: -40, z: -225, owner: null, sector: 'centre' },
  { id: 'J', name: 'Wiercieliszki', x: 320, z: -280, owner: null, sector: 'east' },
  { id: 'K', name: 'Vilna road', x: 0, z: -430, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Niemen, flowing from the Russian end (−z) to the French (+z), bowed east under the town
const NIEMEN = [[-270, -700], [-205, -500], [-145, -300], [-108, -130], [-92, 0], [-106, 130], [-142, 300], [-200, 500], [-265, 700]];
const river = createRiver({
  paths: [NIEMEN],
  halfWidth: 17,
  level: 0,
  depth: 3,
  valley: 40,
  crossings: [
    { name: 'Grodno bridge', x: -93, z: -40, kind: 'bridge', width: 8 },
    { name: 'Łosośna ford', x: -145, z: -300, kind: 'ford', width: 14 },
    { name: 'Pyshki ford', x: -142, z: 300, kind: 'ford', width: 14 },
  ],
});
/** The river’s line x(z): plain interpolation of the course (cheap enough for the height). */
const riverX = (z) => {
  for (let i = 0; i < NIEMEN.length - 1; i++) {
    const [x0, z0] = NIEMEN[i], [x1, z1] = NIEMEN[i + 1];
    if (z <= z1) return x0 + ((x1 - x0) * (z - z0)) / (z1 - z0);
  }
  return NIEMEN[NIEMEN.length - 1][0];
};
const wet = (x, z, m = 0) => Math.abs(x - riverX(z)) < river.halfWidth + m;
/** The Old Castle’s walled ring round F. */
const CASTLE = { x: P.F.x, z: P.F.z, rx: 42, rz: 36 };
const castleQ = (x, z) => Math.hypot((x - CASTLE.x) / CASTLE.rx, (z - CASTLE.z) / CASTLE.rz);
/** The town on the plateau, from the castle east to beyond the market. */
const TOWN = { x: 165, z: 0, rx: 140, rz: 105 };
const town = (x, z) => smoothstep(1.1, 0.85, Math.hypot((x - TOWN.x) / TOWN.rx, (z - TOWN.z) / TOWN.rz));

/** 1 inside an ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz) => smoothstep(1.1, 0.75, Math.hypot((x - cx) / rx, (z - cz) / rz) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
// the Pyshki woods and the Łosośna woods on the left bank, the spruce woods out on the plateau’s east edge
const WOODS = [[-420, 380, 110, 85], [-420, -390, 105, 90], [440, 140, 70, 110], [430, -150, 70, 100]];
const woods = (x, z) => {
  let k = smoothstep(0.5, 0.66, fbm(noise, x * 0.006 + 11, z * 0.006 - 5, 3)) * 0.75;
  for (const [cx, cz, rx, rz] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 55, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(16, 32, Math.hypot(x - c.x, z - c.z)));
  return Math.min(k, 1 - town(x, z), smoothstep(1.2, 1.6, castleQ(x, z)));
};

function height(x, z) {
  let h = fbm(noise, x * 0.0025, z * 0.0025, 3) * 3 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.4 + 4;
  const rx = riverX(z);
  h += smoothstep(rx + 30, rx + 62, x) * 15;                                         // the right-bank plateau and its scarp
  h += smoothstep(-230, -470, x) * 4;                                                // the left bank rising to the woods
  h += hill(x, z, P.F.x - 8, P.F.z, 46, 3);                                          // the castle hill
  h += hill(x, z, P.C.x + 20, P.C.z, 60, 2) + hill(x, z, P.I.x + 25, P.I.z, 60, 2);  // (the scarp’s two shoulders)
  h += (19 - h) * town(x, z) * 0.5;                                                  // the town on its level ground
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 22 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  for (const p of POINTS) if (!'CFGI'.includes(p.id)) h += (h * 0.7 + 2 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (18 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'grodno',
  armies: { nato: ['fr'], pact: ['ru'] }, // (the Grande Armée’s right wing against the Russian Second Army)
  name: 'Grodno',
  description: 'Lithuania, a hypothetical summer 1807 (the real fight came in 1812): Grodno on the high right bank of the Niemen — the Old and New Castles on the bluff, the one bridge to the low left bank, meadows and Lithuanian woods.',
  epochs: ['1806'],
  region: 'east',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180712,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  airfields: [],
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1807_12, cell: 74, weights: [0.32, 0.28, 0.22, 0.18] }), // July: rye, flax, meadow

  theme: {
    // a warm Lithuanian summer day, high cloud
    fogColor: 0xb8c2bc,
    fogDensity: 0.0012,
    skyTop: 0x5c84b0,
    skyHorizon: 0xc8d4d8,
    skyBottom: 0x7a8476,
    sunColor: 0xfff0d4,
    sunIntensity: 1.95,
    sunDisk: 0.45,
    clouds: 0.4,
    cloudLight: 0xeef0f0,
    cloudDark: 0x98a2aa,
    sunDir: [0.5, 0.55, 0.6],
    hemiSky: 0xc8d4e0,
    hemiGround: 0x4c5034,
    hemiIntensity: 1.25,
    rimColor: 0xd0d8e0,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5a6c36',
      grassAlt: '#4e6232',
      dryGrass: '#8a8450',
      dirt: '#5a4a38',
      rock: '#6c6a62',
      strip: '#4c4030',
      pasture: '#5c7038',
      ploughed: '#54442f',
      stubble: '#9a9258',
      meadow: '#66783c',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-330, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (castleQ(x, z) < 0.95) return [0x7a6e5a, 0.45];                          // the castle courtyard
        const t = town(x, z);
        if (t > 0) return [0x7a6c56, t * 0.4];                                       // streets and yards
        if (x < riverX(z) - 20 && x > riverX(z) - 70) return [0x5e7444, 0.35];       // (the wet meadows on the left bank)
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-330, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-330, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 370 }, pact: { x: 0, z: -370 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    /** A wall from (x0, z0) to (x1, z1). */
    const seg = (x0, z0, x1, z1, height, thickness = 1.2) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height, thickness });

    // ---- the Old Castle: a curtain wall round the hilltop, a gate on each side (to the bridge, the town and both ends)
    const N = 40, at = (a, k = 1) => [CASTLE.x + Math.cos(a) * CASTLE.rx * k, CASTLE.z + Math.sin(a) * CASTLE.rz * k];
    const gate = (a) => [0, Math.PI / 2, Math.PI, Math.PI * 1.5].some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.2);
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      if (gate((a0 + a1) / 2)) continue;
      const [x0, z0] = at(a0), [x1, z1] = at(a1);
      seg(x0, z0, x1, z1, 4, 1.4);
    }
    for (const a of [Math.PI / 4, (Math.PI * 3) / 4, (Math.PI * 5) / 4, (Math.PI * 7) / 4]) {                // (the corner towers)
      const [tx, tz] = at(a), g = terrain.heightAt(tx, tz);
      props.box('stone', tx, g + 4.5, tz, 6, 9, 6, a, 0x9a8a72);
      props.box('stone', tx, g + 9.4, tz, 6.6, 0.8, 6.6, a, 0x5a3a2a);
    }
    props.rand = mulberry32(1807_121);
    props.hall({ x: CASTLE.x - 4, z: CASTLE.z - 20, yaw: 0, width: 28, depth: 9, height: 8, color: 0xb0a088, roof: 0x5a3a2a, door: 4, name: 'Báthory’s palace' });
    props.hall({ x: CASTLE.x + 22, z: CASTLE.z + 18, yaw: Math.PI / 2, width: 12, depth: 8, height: 5, color: 0x9a8a72, roof: 0x4a3a2a, door: 3, name: 'castle barracks' });
    // the New Castle on the next spur north of it, open to the scarp walk
    props.hall({ x: CASTLE.x + 10, z: CASTLE.z + 72, yaw: 0, width: 40, depth: 12, height: 9, color: 0xd0c4a8, roof: 0x5a4a3e, door: 6, name: 'New Castle' });

    // ---- the town: streets from the castle gate to the market and across it, houses between, the Fara on the market
    const street = (x, z) => Math.abs(z - P.F.z) < 7 || Math.abs(z - P.G.z) < 7 || Math.abs(x - P.G.x) < 7 || Math.abs(x - 130) < 6;
    const taken: number[][] = [[P.G.x, P.G.z, 30], [P.G.x + 6, P.G.z - 40, 16], [CASTLE.x + 10, CASTLE.z + 72, 26]];
    const rr = mulberry32(1807_122);
    for (let i = 0; i < 320 && taken.length < 46; i++) {
      const x = TOWN.x - TOWN.rx + rr() * TOWN.rx * 2, z = TOWN.z - TOWN.rz + rr() * TOWN.rz * 2;
      if (town(x, z) < 0.6 || street(x, z) || castleQ(x, z) < 1.35 || taken.some(([tx, tz, r]) => Math.hypot(x - tx, z - tz) < r + 7)) continue;
      taken.push([x, z, 6]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      if (rr() < 0.55) props.townHouse({ x, z, yaw: Math.abs(z - P.G.z) < 40 ? 0 : Math.PI / 2, width: 7 + rr() * 2, depth: 8, storeys: rr() < 0.4 ? 2 : 1, damaged: 0 });
      else props.house({ x, z, yaw: Math.abs(z - P.G.z) < 40 ? 0 : Math.PI / 2, width: 7 + rr() * 2, depth: 6 });   // (the wooden houses of the Jewish quarter and the outskirts)
    }
    props.rand = mulberry32(1807_123);
    props.church({ x: P.G.x + 6, z: P.G.z - 40, yaw: 0 });                                                          // (the Fara)
    props.hall({ x: P.G.x - 34, z: P.G.z + 28, yaw: 0, width: 20, depth: 9, height: 6, color: 0xc0b498, roof: 0x5a3a2a, door: 4, name: 'Jesuit college' });

    // ---- the scarp churches: Kalozha before the French, the Bernardine monastery before the Russians
    props.church({ x: P.C.x - 26, z: P.C.z + 4, yaw: Math.PI / 2 });
    props.church({ x: P.I.x + 4, z: P.I.z - 30, yaw: 0 });
    props.hall({ x: P.I.x + 34, z: P.I.z - 22, yaw: Math.PI / 2, width: 22, depth: 9, height: 6, color: 0xb8ac94, roof: 0x5a3a2a, door: 3, name: 'Bernardine monastery' });
    props.logPile({ x: P.C.x + 22, z: P.C.z - 18, yaw: 0.6, length: 7 });

    // ---- the bridgehead suburb and the villages, wooden and low
    for (const p of POINTS) if (!p.owner && !'CFGI'.includes(p.id)) buildVillage(props, p, 18077 + Math.round(p.x * 3 + p.z * 7));
    buildVillage(props, { x: P.E.x + 70, z: P.E.z - 50 }, 1807_124);
    for (const [x, z, yaw] of [[-125, -72, 0.2], [-125, -8, -0.2]] as const) props.wall({ x, z, yaw, length: 12, height: 1.4, thickness: 1.4 }); // (the bridgehead breastwork)

    // ---- farms, field walls, hay
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'farm', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 76 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 55) || woods(x, z) > 0.3 || wet(x, z, 40) || town(x, z) > 0 || castleQ(x, z) < 2.4) continue;
      const rx = riverX(z);
      if (x > rx + 22 && x < rx + 70) continue;                                                                     // (not on the scarp face)
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xc8c4b0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x - 14, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x - 20, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })),
      { test: (x, z) => wet(x, z, 1.5) || town(x, z) > 0.3 || castleQ(x, z) < 2.2 || Math.hypot(x - P.C.x + 26, z - P.C.z) < 18 || Math.hypot(x - P.I.x - 18, z - P.I.z + 28) < 28 }];
    // pine, spruce and birch; willows on the banks
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 3400, broadleaf: 0.35, autumn: 0, forest: (x, z) => (wet(x, z, 10) ? 0.45 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
