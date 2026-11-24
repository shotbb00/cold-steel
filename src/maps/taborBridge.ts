// Vienna and the Tabor bridges, 13 November 1805: Vienna was given up without a fight, but the Danube bridges were not.
// North of the city the long wooden Tabor bridges ran from the Leopoldstadt over the arms and islands of the river to
// the Tabor redoubt and the village Am Spitz, primed with powder, Auersperg’s Austrians and their guns on the far end
// with orders to blow them. Murat and Lannes walked onto the bridge under a white flag with a story of an armistice,
// talked the Austrian officers round while their grenadiers came on behind, threw the powder into the river and took
// the bridges whole: the road to Brünn and the Russians lay open.
// On the map (1.0 × 1.12 km): the French come from the Leopoldstadt and the Taborstraße (south, +z), the Austrians
// hold the north bank toward the Brünn road (−z). Two arms of the Danube cross the map with the long Au island between
// them, its willow and poplar woods; the Tabor bridges cross both arms in the middle, with lesser bridges at the
// Brigittenau and the Prater on the south arm and at Jedlesee and Kagran on the north. The Augarten and the Prater
// woods on the south bank, the Tabor redoubt, Am Spitz and the Marchfeld fields on the north, the Leopoldsberg and
// the Bisamberg rising at the west edge where the river leaves the hills.
// Fair, not mirrored: the river lies between the sides, so each side crosses one arm to reach the island and
// another to reach the far bank, by bridges at the same distances; the island and its three points are owned by
// neither. The Leopoldsberg’s spur on the French side is answered by the Bisamberg on the Austrian, the Prater woods
// by the Kagran copses, the Leopoldstadt’s houses by Am Spitz and the redoubt. 1806 only (`epochs`).
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
const noise = createNoise2D(1805_1113);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Taborstraße', x: 0, z: 465, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Brigittenau', x: -360, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Augarten', x: 50, z: 285, owner: null, sector: 'centre' },
  { id: 'D', name: 'Prater', x: 290, z: 250, owner: null, sector: 'east' },
  { id: 'E', name: 'Brigittenau Au', x: -300, z: 20, owner: null, sector: 'west' },
  { id: 'F', name: 'Tabor island', x: 25, z: 0, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Lusthaus', x: 330, z: -15, owner: null, sector: 'east' },
  { id: 'H', name: 'Jedlesee', x: -320, z: -270, owner: null, sector: 'west' },
  { id: 'I', name: 'Am Spitz', x: -20, z: -280, owner: null, sector: 'centre' },
  { id: 'J', name: 'Kagran', x: 320, z: -290, owner: null, sector: 'east' },
  { id: 'K', name: 'Brünn road', x: 0, z: -465, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the two arms of the Danube across the map, the Au island between; the Tabor bridges in the middle, lesser bridges on the flanks
const SOUTH = [[-720, 150], [-400, 135], [-200, 118], [0, 128], [200, 112], [420, 125], [720, 110]];
const NORTH = [[-720, -105], [-420, -122], [-200, -110], [0, -128], [200, -118], [400, -132], [720, -115]];
const river = createRiver({
  paths: [SOUTH, NORTH], halfWidth: 22, level: 0, depth: 3.2, valley: 58,
  crossings: [
    { name: 'Tabor bridge (south arm)', x: 0, z: 128, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Tabor bridge (north arm)', x: 0, z: -128, kind: 'bridge', width: 9, channel: 1 },
    { name: 'Brigittenau bridge', x: -310, z: 128, kind: 'bridge', width: 6, channel: 0 },
    { name: 'Prater bridge', x: 330, z: 118, kind: 'bridge', width: 6, channel: 0 },
    { name: 'Jedlesee bridge', x: -330, z: -116, kind: 'bridge', width: 6, channel: 1 },
    { name: 'Kagran bridge', x: 310, z: -125, kind: 'bridge', width: 6, channel: 1 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
/** 1 on the Au island between the arms. */
const island = (x, z) => smoothstep(95, 70, Math.abs(z - 4 * Math.sin(x * 0.01)));
// the Taborstraße north over the bridges to the Brünn road; the lanes to the flank bridges
const roadX = (z) => (z > 0 ? 10 * Math.sin(z * 0.012) : -12 * Math.sin(z * 0.01));
const LANES = [[-310, 128], [330, 118], [-330, -116], [310, -125]];
const roadD = (x, z) => Math.min(Math.abs(x - roadX(z)), ...LANES.map(([lx, lz]) => (z * Math.sign(lz) > 0 && z * Math.sign(lz) < 300 ? Math.abs(x - lx) : 1e9)));
/** 1 in the Leopoldstadt’s streets (south), Am Spitz (north). */
const town = (x, z) => Math.max(smoothstep(1.1, 0.85, Math.hypot((x - 10) / 110, (z - 400) / 90)), smoothstep(1.1, 0.85, Math.hypot((x + 30) / 70, (z + 285) / 60)));

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Prater woods, the Augarten’s alleys, the Kagran copses, the Jedlesee wood under the Bisamberg
const WOODS = [[360, 330, 120, 90, 0.3], [-90, 280, 45, 60, 0], [380, -330, 100, 70, -0.3], [-260, -380, 70, 50, 0.4], [-230, 360, 60, 45, -0.3]];
/** The woods (0..1): the island’s willow and poplar Au, the named woods; the river’s scrub. */
const woods = (x, z) => {
  let k = island(x, z) * smoothstep(0.38, 0.55, fbm(noise, x * 0.008 + 13, z * 0.008 - 21, 3) * 0.5 + 0.5);
  k = Math.max(k, smoothstep(0.6, 0.72, fbm(noise, x * 0.006 + 41, z * 0.006, 3)) * 0.6);
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  k = Math.min(k, 1 - town(x, z), smoothstep(7, 18, roadD(x, z)));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  return k;
};

function height(x, z) {
  let h = fbm(noise, x * 0.003, z * 0.003, 3) * 2.2 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.35 + 3;
  h += smoothstep(-330, -520, x) * (hill(x, z, -560, 380, 220, 30) + hill(x, z, -560, -380, 220, 30)); // the Leopoldsberg’s spur, the Bisamberg
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 14 + smoothstep(BOUNDS.x - 20, BOUNDS.x + 140, x) * 8;
  h += hill(x, z, -20, -300, 60, 2.5);                                            // (the Tabor redoubt’s rise)
  h += hill(x, z, 20, 290, 60, 2.5);                                              // (the Augarten terrace)
  for (const p of POINTS) h += (h * 0.6 + 1.5 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.4;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'tabor-bridge',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Murat and Lannes against Auersperg’s Austrians; no Austrian roster yet: the Russians fight)
  name: 'Tabor Bridge',
  description: 'The Danube north of Vienna, 13 November 1805: the long wooden Tabor bridges over the river’s arms and the Au island, the Prater woods and the Leopoldstadt, Auersperg’s Austrians at the Tabor redoubt with the bridges primed to blow.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'clear' }, // (a bright, cold November morning)
  airfields: [],
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 18051113,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.85,
  fields: createFields({ seed: 1805_1113, cell: 72, weights: [0.3, 0.25, 0.27, 0.18] }), // the Marchfeld’s stubble and ploughland, the meadows by the river

  theme: {
    // a cold, bright November morning on the Danube, haze over the water
    fogColor: 0xb4bcc0,
    fogDensity: 0.0014,
    skyTop: 0x6a88a8,
    skyHorizon: 0xc8d0d2,
    skyBottom: 0x7a7e78,
    sunColor: 0xf2e4c8,
    sunIntensity: 1.9,
    sunDisk: 0.2,
    clouds: 0.45,
    cloudLight: 0xdcdedc,
    cloudDark: 0x8a9096,
    sunDir: [0.5, 0.38, 0.75],
    hemiSky: 0xc8d2dc,
    hemiGround: 0x4c4638,
    hemiIntensity: 1.25,
    rimColor: 0xc0c8d0,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5c663e',
      grassAlt: '#505a38',
      dryGrass: '#8a7a52',
      dirt: '#58483a',
      rock: '#6c6a64',
      strip: '#4c4032',
      pasture: '#5a663c',
      ploughed: '#4e3e2e',
      stubble: '#8e7e50',
      meadow: '#687242',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const rd = roadD(x, z);
        if (rd < 5) return [0x857a68, smoothstep(5, 3, rd) * 0.75];                           // the Taborstraße and the lanes
        const t = town(x, z);
        if (t > 0) return [0x8a8274, t * 0.4];                                                // the streets
        if (wet(x, z, 9) && !wet(x, z, 1)) return [0x8e8a78, 0.5];                            // the gravel banks
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
    const rr = mulberry32(1805_11131);

    // ---- the Leopoldstadt: rows of houses along the Taborstraße; Am Spitz on the north bank
    const taken: number[][] = [];
    for (let i = 0; i < 160 && taken.length < 40; i++) {
      const north = i % 3 === 2;
      const x = north ? -30 + (rr() * 2 - 1) * 65 : 10 + (rr() * 2 - 1) * 105, z = north ? -285 + (rr() * 2 - 1) * 55 : 400 + (rr() * 2 - 1) * 85;
      if (town(x, z) < 0.55 || roadD(x, z) < 9 || nearPoint(x, z, 20) || Math.hypot(x, z - BASE_Z) < 45 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.abs(x - roadX(z)) < 35 ? Math.PI / 2 : 0, width: 7 + rr() * 3, depth: 8, storeys: north ? 1 + (rr() < 0.4 ? 1 : 0) : 2 + (rr() < 0.3 ? 1 : 0), damaged: 0 });
    }
    props.rand = mulberry32(1805_11132);
    props.church({ x: 60, z: 380, yaw: Math.PI / 2 });                                         // (the Leopoldstadt’s church)
    props.church({ x: -70, z: -300, yaw: 0 });                                                 // (Floridsdorf’s chapel at Am Spitz)
    props.hall({ x: P.C.x + 40, z: P.C.z + 12, yaw: Math.PI / 2, width: 30, depth: 11, height: 8, color: 0xe0d6c0, roof: 0x5a4a3e, door: 4, name: 'Augarten palace' });
    for (const [dx, dz, yaw, length] of [[78, 0, Math.PI / 2, 60], [40, -36, 0, 70]] as const) props.wall({ x: P.C.x + dx, z: P.C.z + dz, yaw, length, height: 2.4 });
    props.hall({ x: P.G.x + 30, z: P.G.z + 16, yaw: 0.2, width: 12, depth: 12, height: 8, color: 0xe4dccc, roof: 0x4a5a5a, door: 3, name: 'Lusthaus' });
    // the Tabor redoubt: an earthwork across the bridge road’s north end, its guns trained on the bridge
    for (let a = 0.35; a < Math.PI - 0.3; a += 0.3) props.lowWall({ x: roadX(-175) + Math.cos(a) * 46, z: -175 - Math.sin(a) * 30, yaw: -a + Math.PI / 2, length: 15, height: 1.4, color: 0x6e604a });
    // a toll house and a guard house at each end of the Tabor bridges
    props.townHouse({ x: roadX(190) + 16, z: 190, yaw: 0, width: 8, depth: 7, storeys: 1, name: 'toll house', damaged: 0 });
    props.townHouse({ x: roadX(-190) - 16, z: -190, yaw: 0, width: 8, depth: 7, storeys: 1, name: 'guard house', damaged: 0 });
    props.townHouse({ x: roadX(55) + 18, z: 55, yaw: Math.PI / 2, width: 9, depth: 7, storeys: 1, name: 'bridge keeper', damaged: 0 });
    // the villages and the island’s farms
    for (const p of POINTS) if (!p.owner && !'CFI'.includes(p.id)) buildVillage(props, p, 18059 + Math.round(p.x * 3 + p.z * 7));
    buildVillage(props, { x: P.F.x + 40, z: P.F.z - 30 }, 1805_11133);
    props.church({ x: P.J.x - 28, z: P.J.z - 30, yaw: 0 });
    props.church({ x: P.H.x + 30, z: P.H.z - 28, yaw: Math.PI / 2 });
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 70 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 50) || woods(x, z) > 0.3 || wet(x, z, 30) || town(x, z) > 0 || roadD(x, z) < 14) continue;
      if (Math.abs(z + 175) < 45 && Math.abs(x) < 70) continue; // (the redoubt)
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);

    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xcfc8b0]] as const) {
      props.tent({ x: base.x - 30, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 30, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 18, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 16 })),
      { test: (x, z) => wet(x, z, 1.5) || town(x, z) > 0.3 || roadD(x, z) < 5 }];
    // willows, poplars and alders in the Au, oak and elm in the Prater
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4600, broadleaf: 0.9, autumn: 1, forest: (x, z) => (wet(x, z, 10) ? 0.55 : woods(x, z) * 0.92) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1800, lane: 0 });
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
