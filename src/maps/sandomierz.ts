// Sandomierz, May–June 1809: in the Austrian war Poniatowski’s Poles carried the war into Galicia and Sokolnicki
// stormed the old town on 18 May; Archduke Ferdinand’s Austrians came back up the Vistula, laid siege to it and
// Sokolnicki gave it up with the honours of war on 18 June. Four years before, in autumn 1805, Kutuzov’s Russians had
// marched south through Galicia past it to join the Austrians. Sandomierz stands on its loess escarpment over the
// left bank of the Vistula: the walled old town round its market and Renaissance town hall, the Opatów gate, the
// castle and the cathedral on the edge of the scarp, St James’s Dominicans on the hill south of the town and St Paul’s
// to the north; deep loess ravines — Queen Jadwiga’s gorge, the Pieprzówki — cut into the plateau; below, the Vistula
// and its flat right bank, the San falling in a few miles downstream.
// On the map (1.0 × 1.12 km, early summer): the French and Poles come from the Opatów road (+z), the Austrians —
// played today by the Russians — from the Zawichost road (−z). The Vistula runs down the east of the field, flowing
// to the Russian end, where the San comes in behind their base; the escarpment along its west bank with the old town
// on top in the middle, the plateau west of it, the right-bank meadows across a bridge and two shallows.
// Not mirrored but fair: the river runs down the field, not across it, so each side has the same plateau, scarp and
// low right bank before it; the walled town, the castle and the bridgehead — the decisive ground — stand in the
// middle, owned by neither. St James’s on its hill before the French is traded for St Paul’s before the Russians,
// Queen Jadwiga’s gorge for the Pieprzówki, Nadbrzezie for Wrzawy; each point as far from the nearer base as its
// counterpart (tools/map_fairness.py). The town wall has four gates, so the market can be stormed from every side.
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
const noise = createNoise2D(1809_0618);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Opatów road', x: 0, z: 430, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Kobierniki', x: -350, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'St James’s church', x: -80, z: 230, owner: null, sector: 'centre' },
  { id: 'D', name: 'Nadbrzezie', x: 390, z: 290, owner: null, sector: 'east' },
  { id: 'E', name: 'Mokoszyn', x: -290, z: 15, owner: null, sector: 'west' },
  { id: 'F', name: 'Market square', x: 50, z: -10, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Castle', x: 180, z: 25, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Dwikozy', x: -320, z: -310, owner: null, sector: 'west' },
  { id: 'I', name: 'St Paul’s church', x: -40, z: -235, owner: null, sector: 'centre' },
  { id: 'J', name: 'Wrzawy', x: 400, z: -270, owner: null, sector: 'east' },
  { id: 'K', name: 'Zawichost road', x: 0, z: -430, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Vistula down the east of the field, flowing to the Russian end (−z); the San falls in behind their base
const VISTULA = [[302, 720], [288, 400], [274, 150], [268, 0], [276, -150], [292, -400], [304, -720]];
const SAN = [[900, -560], [720, -540], [560, -520], [420, -500], [298, -470]];
const river = createRiver({
  paths: [VISTULA, SAN],
  halfWidth: 20, level: 0, depth: 3, valley: 42,
  crossings: [
    { name: 'Sandomierz bridge', x: 268, z: 10, kind: 'bridge', width: 8 },
    { name: 'Shallows at Nadbrzezie', x: 285, z: 320, kind: 'ford', width: 14 },
    { name: 'Shallows at Wrzawy', x: 287, z: -330, kind: 'ford', width: 14 },
  ],
});
/** The Vistula’s line x(z) (plain interpolation of the course: cheap enough for the height). */
const riverX = (z) => {
  for (let i = VISTULA.length - 1; i > 0; i--) {
    const [x0, z0] = VISTULA[i], [x1, z1] = VISTULA[i - 1];
    if (z <= z1) return x0 + ((x1 - x0) * (z - z0)) / (z1 - z0);
  }
  return VISTULA[0][0];
};
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };   // (props only: never in the height)
/** The old town’s walled ring round the market. */
const TOWN = { x: 45, z: -5, rx: 95, rz: 82 };
const townQ = (x, z) => Math.hypot((x - TOWN.x) / TOWN.rx, (z - TOWN.z) / TOWN.rz);
/** The loess ravines (0..1): Queen Jadwiga’s gorge south of the town, the Pieprzówki north of it, both opening on the scarp. */
const ravine = (x, z) => {
  const run = smoothstep(-170, -110, x) * smoothstep(275, 230, x);
  const a = Math.abs(z - 165 - 14 * Math.sin(x * 0.018)), b = Math.abs(z + 160 - 12 * Math.sin(x * 0.021 + 1));
  return smoothstep(18, 6, Math.min(a, b)) * run;
};

/** 1 inside an ellipse, fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz) => smoothstep(1.1, 0.75, Math.hypot((x - cx) / rx, (z - cz) / rz) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
// the oak and pine woods out on the plateau’s west edge, the willows on the right bank
const WOODS = [[-430, 160, 70, 100], [-430, -170, 70, 100], [440, 60, 60, 120], [450, -110, 50, 80]];
const woods = (x, z) => {
  let k = smoothstep(0.52, 0.68, fbm(noise, x * 0.006 + 41, z * 0.006 - 3, 3)) * 0.7;
  for (const [cx, cz, rx, rz] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz));
  k = Math.max(k, ravine(x, z) * 0.7);                                               // (scrub and acacia in the ravines)
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 55, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(16, 32, Math.hypot(x - c.x, z - c.z)));
  return Math.min(k, smoothstep(1.15, 1.5, townQ(x, z)));
};

function height(x, z) {
  let h = fbm(noise, x * 0.0028, z * 0.0028, 3) * 3.5 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.4 + 4;
  const rx = riverX(z);
  h += smoothstep(rx - 26, rx - 70, x) * 16;                                          // the loess plateau and its scarp over the Vistula
  h += hill(x, z, P.C.x, P.C.z, 70, 4) + hill(x, z, P.I.x, P.I.z, 70, 4);            // St James’s hill and St Paul’s
  h += (21 - h) * smoothstep(1.15, 0.9, townQ(x, z)) * 0.6;                           // the old town on its level hilltop
  h -= ravine(x, z) * 8;                                                              // the ravines
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 22 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  for (const p of POINTS) if (!'CFGI'.includes(p.id)) h += (h * 0.8 + 1.5 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (18 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'sandomierz',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Poniatowski’s Poles under French colours against Archduke Ferdinand; Russia until Austria’s army is built)
  name: 'Sandomierz',
  description: 'Galicia, May–June 1809: the walled old town of Sandomierz on its loess escarpment over the Vistula — the market and town hall, the castle and cathedral on the scarp, St James’s and St Paul’s, deep loess ravines — stormed by the Poles and besieged by the Austrians.',
  epochs: ['1806'],
  region: 'east',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180906,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  airfields: [],
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1809_06, cell: 70, weights: [0.3, 0.3, 0.22, 0.18] }), // June: corn, orchards, meadow

  theme: {
    // early summer in Little Poland: warm light, hazy, loess dust
    fogColor: 0xc4c4b4,
    fogDensity: 0.0013,
    skyTop: 0x6288b4,
    skyHorizon: 0xd0d6d4,
    skyBottom: 0x84846e,
    sunColor: 0xfff0d0,
    sunIntensity: 2.0,
    sunDisk: 0.5,
    clouds: 0.3,
    cloudLight: 0xf0f0ee,
    cloudDark: 0x9ea6ac,
    sunDir: [0.55, 0.55, -0.6],
    hemiSky: 0xccd6e0,
    hemiGround: 0x5a5436,
    hemiIntensity: 1.25,
    rimColor: 0xd4dae0,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5e6e36',
      grassAlt: '#526232',
      dryGrass: '#9a8e58',
      dirt: '#8a7450',
      rock: '#a89470',
      strip: '#6e5a3e',
      pasture: '#607238',
      ploughed: '#7a6244',
      stubble: '#a89a60',
      meadow: '#6a7a3c',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (townQ(x, z) < 0.98) return [0x8a7a5e, 0.45];                              // the streets
        const r = ravine(x, z);
        if (r > 0.3) return [0xb09a6a, r * 0.6];                                     // the bare loess walls of the ravines
        const rx = riverX(z);
        if (x > rx - 66 && x < rx - 28) return [0x9a8a5c, 0.3];                      // (the scarp face)
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0] } },
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

    // ---- the town wall: a gate on each side — the Opatów gate west, the gates to the castle, St James’s and St Paul’s
    const N = 64, at = (a) => [TOWN.x + Math.cos(a) * TOWN.rx, TOWN.z + Math.sin(a) * TOWN.rz];
    const gate = (a) => [0, Math.PI / 2, Math.PI, Math.PI * 1.5].some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.12);
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      if (gate((a0 + a1) / 2)) continue;
      const [x0, z0] = at(a0), [x1, z1] = at(a1);
      seg(x0, z0, x1, z1, 3.6, 1.2);
    }
    { const [gx, gz] = at(Math.PI), g = terrain.heightAt(gx - 6, gz); for (const s of [-1, 1]) props.box('stone', gx - 6, g + 7, gz + s * 9, 7, 14, 5, 0, 0xb4a07c); props.box('stone', gx - 6, g + 13, gz, 7, 3, 13, 0, 0xb4a07c); } // (the Opatów gate’s tower)

    // ---- the old town: the market with the town hall in the middle, streets out to the four gates, houses between
    props.rand = mulberry32(1809_061);
    props.hall({ x: P.F.x + 18, z: P.F.z + 20, yaw: 0, width: 16, depth: 9, height: 8, color: 0xd4c8a8, roof: 0x7a3a28, door: 4, name: 'town hall' });
    { const g = terrain.heightAt(P.F.x + 18, P.F.z + 28); props.box('stone', P.F.x + 18, g + 10, P.F.z + 28, 4.5, 20, 4.5, 0, 0xd0c4a4); } // (its tower; the market open round the point)
    const street = (x, z) => Math.abs(z - TOWN.z) < 7 || Math.abs(x - TOWN.x) < 7;
    const taken: number[][] = [[P.F.x, P.F.z, 34]];
    const rr = mulberry32(1809_062);
    for (let i = 0; i < 320 && taken.length < 46; i++) {
      const x = TOWN.x - TOWN.rx + rr() * TOWN.rx * 2, z = TOWN.z - TOWN.rz + rr() * TOWN.rz * 2;
      if (townQ(x, z) > 0.82 || street(x, z) || taken.some(([tx, tz, r]) => Math.hypot(x - tx, z - tz) < r + 7)) continue;
      taken.push([x, z, 6]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.abs(x - TOWN.x) < Math.abs(z - TOWN.z) ? Math.PI / 2 : 0, width: 7 + rr() * 2, depth: 9, storeys: rr() < 0.5 ? 2 : 1, damaged: rr() < 0.12 ? 1 : 0 }); // (some knocked about in the storm)
    }

    // ---- the castle on the scarp edge and the cathedral beside it
    props.rand = mulberry32(1809_063);
    props.hall({ x: P.G.x + 6, z: P.G.z + 22, yaw: Math.PI / 2, width: 30, depth: 11, height: 10, color: 0xc8b898, roof: 0x7a3a28, door: 4, name: 'Sandomierz castle' });
    { const g = terrain.heightAt(P.G.x - 18, P.G.z + 30); props.box('stone', P.G.x - 18, g + 7, P.G.z + 30, 8, 14, 8, 0, 0xb4a07c); }   // (the castle’s tower)
    seg(P.G.x - 26, P.G.z - 22, P.G.x - 8, P.G.z - 22, 2.4); seg(P.G.x + 8, P.G.z - 22, P.G.x + 26, P.G.z - 22, 2.4);                  // (the outer bailey wall, a gate in it)
    props.church({ x: P.G.x - 40, z: P.G.z + 58, yaw: Math.PI / 2 });                                                                 // (the cathedral)
    props.hall({ x: P.G.x - 60, z: P.G.z + 88, yaw: 0, width: 18, depth: 8, height: 6, color: 0xb8a888, roof: 0x5a3a2a, door: 3, name: 'Długosz house' });

    // ---- St James’s and its Dominicans before the French, St Paul’s before the Russians
    props.church({ x: P.C.x + 4, z: P.C.z + 30, yaw: 0 });
    props.hall({ x: P.C.x + 36, z: P.C.z + 20, yaw: Math.PI / 2, width: 22, depth: 9, height: 6, color: 0x9a5a44, roof: 0x5a3a2a, door: 3, name: 'Dominican priory' }); // (brick)
    props.church({ x: P.I.x - 6, z: P.I.z - 30, yaw: 0 });
    for (const [p, s] of [[P.C, 1], [P.I, -1]] as const) { seg(p.x - 30, p.z - s * 24, p.x - 8, p.z - s * 24, 1.8); seg(p.x + 8, p.z - s * 24, p.x + 30, p.z - s * 24, 1.8); } // (churchyard walls)

    // ---- villages, the right-bank hamlets, farms and orchards’ walls
    for (const p of POINTS) if (!p.owner && !'CFGI'.includes(p.id)) buildVillage(props, p, 18096 + Math.round(p.x * 3 + p.z * 7));
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'fieldwall', 'hay'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 76 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 60) || woods(x, z) > 0.3 || wet(x, z, 30) || townQ(x, z) < 1.3 || ravine(x, z) > 0) continue;
      const rx = riverX(z);
      if (x > rx - 80 && x < rx - 20) continue;                                                                                     // (not on the scarp face)
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
      { test: (x, z) => wet(x, z, 1.5) || townQ(x, z) < 1.12 || Math.hypot(x - P.G.x + 20, z - P.G.z - 40) < 62 || Math.hypot(x - P.C.x - 16, z - P.C.z - 20) < 34 || Math.hypot(x - P.I.x + 6, z - P.I.z + 30) < 22 }];
    // oak, lime, pine; willows by the river
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 3200, broadleaf: 0.7, autumn: 0, forest: (x, z) => (wet(x, z, 12) ? 0.45 : woods(x, z) * 0.95) });
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
