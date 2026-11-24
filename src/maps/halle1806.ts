// Halle, 17 October 1806: three days after Jena, Bernadotte’s I Corps caught the Prussian reserve under Duke Eugen of
// Württemberg, which had come up too late for the battle, at Halle on the Saale. The Prussians held the town and the
// long covered causeway that crosses the Saale meadows on its west side — the bridge over the Saale, the bridge over
// the Mühlgraben, the Klaustor in the town wall — with guns and jägers. Dupont’s division stormed the bridges at the
// run, burst through the gate and fought through the streets to the market, and Württemberg’s battalions, turned out
// of the town, were broken on the open ground to the east on the road to Dessau.
// On the map (the big field, 1.0 × 1.12 km): the French come from the west bank (the Lauchstädt road, +z), the
// Prussians hold the east bank (the Dessau road, −z). The Saale crosses the middle; the Mühlgraben splits off it under
// the town round the meadows island, and the causeway runs over both bridges straight into the Klaustor. Fords at
// Kröllwitz under its porphyry crags (north, −x) and at Böllberg (south, +x). On the west bank the pines of the
// Dölauer Heide, Passendorf and Angersdorf; on the east bank the walled town with its market church, Giebichenstein
// on its rock, the Galgenberg, Glaucha and Böllberg among the floodplain woods. (The Saale runs north here: −x is north.)
// Not mirrored but fair: the causeway’s two bridges put the meadows island in the middle, one bridge from each bank,
// and the two fords lie on opposite flanks at matching distances; the walled town before the Prussian centre is traded
// for the Dölauer Heide and the bigger village of Passendorf before the French, the Giebichenstein rock and the Galgenberg
// for the Kröllwitz crags and the rise of the Lauchstädt plateau, the floodplain woods by Böllberg for the Heide’s
// edge; each village is as far from the nearer base as its counterpart (tools/map_fairness.py). 1806 only (`epochs`).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const noise = createNoise2D(1710_1806);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Lauchstädt road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Dölauer Heide', x: -360, z: 320, owner: null, sector: 'west' },
  { id: 'C', name: 'Passendorf', x: 110, z: 270, owner: null, sector: 'centre', radius: 26 },
  { id: 'D', name: 'Angersdorf', x: 350, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Kröllwitz', x: -400, z: 95, owner: null, sector: 'west' },
  { id: 'F', name: 'Pulverweiden', x: 10, z: -4, owner: null, sector: 'centre', radius: 20 },
  { id: 'G', name: 'Böllberg', x: 400, z: -120, owner: null, sector: 'east' },
  { id: 'H', name: 'Giebichenstein', x: -310, z: -230, owner: null, sector: 'west' },
  { id: 'I', name: 'Halle market', x: -30, z: -250, owner: null, sector: 'centre', radius: 28 },
  { id: 'J', name: 'Glaucha', x: 360, z: -360, owner: null, sector: 'east' },
  { id: 'K', name: 'Dessau road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Saale across the map; the Mühlgraben split off it under the town round the meadows island (the Pulverweiden)
const saaleZ = (x) => 40 + 10 * Math.sin(x * 0.006 + 0.3) + 4 * Math.sin(x * 0.021);
const ARM = [[-240, saaleZ(-240), 6], [-190, -10, 8], [-120, -40, 8], [-40, -48, 8], [40, -46, 8], [120, -36, 8], [180, -12, 8], [225, saaleZ(225), 6]];
const armZ = (x) => { for (let i = 0; i < ARM.length - 1; i++) { const [ax, az] = ARM[i], [bx, bz] = ARM[i + 1]; if (x <= bx) return az + (bz - az) * (x - ax) / (bx - ax); } return ARM[ARM.length - 1][1]; };
const river = createRiver({
  paths: [saaleZ, ARM],
  halfWidth: 13, level: 0, depth: 2.6, valley: 40,
  crossings: [
    { name: 'Hohe Brücke', x: 10, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Klausbrücke', x: 10, z: armZ(10), kind: 'bridge', width: 8, channel: 1 },
    { name: 'Kröllwitz ford', x: -360, kind: 'ford', width: 10, channel: 0 },
    { name: 'Böllberg ford', x: 360, kind: 'ford', width: 10, channel: 0 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
const onIsland = (x, z) => Math.abs(x) < 220 && z < saaleZ(x) - 15 && z > armZ(x) + 10;

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Dölauer Heide (west bank, north), the floodplain woods by Böllberg (east bank, south), willows on the island’s ends
const WOODS = [[-380, 330, 125, 85, 0.25], [300, -190, 95, 50, -0.5], [-200, 8, 30, 14, 0.3], [190, 12, 28, 14, -0.3]];
const woods = (x, z) => {
  let k = smoothstep(0.55, 0.7, fbm(noise, x * 0.006 - 17, z * 0.006 + 41, 3)) * 0.75;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(14, 30, Math.hypot(x - c.x, z - c.z)));
  k = Math.min(k, smoothstep(8, 20, Math.abs(x - 10)) + smoothstep(60, 80, z) + smoothstep(-90, -70, -z)); // (the causeway lane kept open)
  return Math.min(k, smoothstep(140, 170, Math.hypot((x - P.I.x) * 0.8, z - P.I.z + 10)));               // (no wood in the town)
};

function height(x, z) {
  let h = fbm(noise, x * 0.0024, z * 0.0024, 3) * 4 + fbm(noise, x * 0.02 + 9, z * 0.02, 3) * 0.5 + 3;
  h += smoothstep(380, 590, z) * 17 * (0.8 + 0.2 * Math.tanh((x + 100) / 240));    // the Lauchstädt plateau behind the French
  h += smoothstep(360, 600, -z) * 17 * (0.85 + 0.3 * Math.tanh((x - 100) / 200));  // the rise towards the Dessau road
  h += hill(x, z, -410, 140, 55, 8);                                               // Kröllwitz’s porphyry crags over the ford
  h += hill(x, z, -330, -120, 50, 8);                                              // the Giebichenstein rock
  h += hill(x, z, -180, -380, 85, 5);                                              // the Galgenberg
  h += hill(x, z, 220, 380, 110, 4);                                               // the swell by Angersdorf
  const town = smoothstep(150, 90, Math.hypot((x - P.I.x) * 0.8, z - P.I.z - 10)); // the old town’s terrace, a little above the river
  h += (5 - h) * town * 0.6;
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 28;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 26;
  for (const p of POINTS) if (p.id !== 'I' && p.id !== 'F') h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'halle-1806',
  armies: { nato: ['fr'], pact: ['pr'] }, // (Bernadotte against Württemberg’s Prussian reserve)
  name: 'Halle 1806',
  description: 'Halle on the Saale, 17 October 1806: Bernadotte’s men storm the covered causeway over the Saale meadows and its two bridges into the walled town, held by Württemberg’s Prussian reserve; fords at Kröllwitz and Böllberg on the flanks.',
  epochs: ['1806'],
  region: 'europe',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1710,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1710, cell: 80, weights: [0.34, 0.16, 0.34, 0.16] }),

  theme: {
    // a clear, cold October morning
    fogColor: 0xb4bcc0,
    fogDensity: 0.0012,
    skyTop: 0x6a8aa8,
    skyHorizon: 0xc8d0d0,
    skyBottom: 0x78807a,
    sunColor: 0xf4e8cc,
    sunIntensity: 1.9,
    sunDisk: 0.35,
    clouds: 0.45,
    cloudLight: 0xe4e6e4,
    cloudDark: 0x8e969c,
    sunDir: [0.5, 0.45, -0.7],
    hemiSky: 0xc8d2dc,
    hemiGround: 0x4c4636,
    hemiIntensity: 1.25,
    rimColor: 0xc4ccd4,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5a643c',
      grassAlt: '#4e5836',
      dryGrass: '#8a7a52',
      dirt: '#56463a',
      rock: '#7a5e54',     // (the red Halle porphyry)
      strip: '#4c3f30',
      pasture: '#58643c',
      ploughed: '#4e3e2f',
      stubble: '#90804f',
      meadow: '#687440',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (onIsland(x, z)) return [0x5e7040, 0.5];                         // the island’s wet meadows
        if (Math.abs(x - 10) < 3.5 && z < 70 && z > -80) return [0x6a5a46, 0.8]; // the causeway
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);

    // ---- Halle: the walled old town between the Klaustor and the market — streets kept open from the gate to the market
    const rr = mulberry32(1710_1);
    const taken: number[][] = [];
    const street = (x, z) => Math.abs(x - 10 - (z + 80) * 0.235) < 7 || Math.abs(z - P.I.z) < 6 || Math.hypot(x - P.I.x, z - P.I.z) < 20;
    for (let i = 0; i < 140 && taken.length < 40; i++) {
      const x = -125 + rr() * 200, z = -95 - rr() * 215;
      if (street(x, z) || wet(x, z, 12) || Math.hypot((x - P.I.x) * 0.8, z - P.I.z) > 125 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.7 ? 2 : 3, damaged: 0 });
    }
    props.rand = mulberry32(1710_2);
    props.church({ x: P.I.x + 28, z: P.I.z - 24, yaw: Math.PI / 2 });                // (the Marktkirche)
    props.hall({ x: -150, z: -105, yaw: 0.2, width: 22, depth: 14, height: 8, color: 0x9a8a74, roof: 0x5a3a2a, door: 4, name: 'Moritzburg' });
    // the town wall along the river front, the Klaustor gap where the causeway comes in
    for (const [x, z, yaw, length] of [[-70, -88, 0.05, 130], [75, -90, -0.1, 110], [-150, -190, Math.PI / 2 + 0.2, 70], [140, -200, Math.PI / 2 - 0.2, 80]] as const) {
      props.wall({ x, z, yaw, length, height: 3 });
    }
    // Giebichenstein: the castle on its rock
    props.hall({ x: -330, z: -132, yaw: 0.4, width: 16, depth: 10, height: 6, color: 0x8a7464, roof: 0x4a3428, door: 3, name: 'castle' });

    // ---- the villages; Passendorf the bigger; farms, walls and hay
    for (const p of POINTS) if (!p.owner && !'FI'.includes(p.id)) buildVillage(props, p, 17106 + Math.round(p.x * 3 + p.z * 7));
    buildVillage(props, { x: P.C.x + 34, z: P.C.z + 24 }, 1710_6);
    buildVillage(props, { x: P.C.x - 36, z: P.C.z - 18 }, 1710_7);
    props.rand = mulberry32(1710_3);
    props.church({ x: P.C.x - 4, z: P.C.z + 32, yaw: 0 });
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'fieldwall', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 80 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 50) || woods(x, z) > 0.3 || wet(x, z, 30) || onIsland(x, z)
        || Math.hypot((x - P.I.x) * 0.8, z - P.I.z) < 150) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);

    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xcfc8b0]] as const) {
      props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.tent({ x: base.x - 14, z: base.z - toward * 9, yaw: 0.1, color: canvas });
      props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 26 })), { test: (x, z) => wet(x, z, 1.5) || Math.hypot((x - P.I.x) * 0.8, z - P.I.z) < 130 || (Math.abs(x - 10) < 6 && z < 80 && z > -90) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 3400, forest: (x, z) => (wet(x, z, 10) || onIsland(x, z) ? 0.35 : woods(x, z) * 0.9) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x, z) => onIsland(x, z) }], count: 2600, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.6, fields: this.fields });

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
