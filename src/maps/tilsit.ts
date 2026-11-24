// Tilsit and the Niemen, June 1807 — a battle that was not fought. After Friedland Bennigsen fell back over the Niemen
// at Tilsit and burned the bridge behind him; Murat’s cavalry rode into the town on 19 June, and on the 25th Napoleon
// and Alexander met on a raft moored in the middle of the river, a white pavilion on it with the eagles and the double
// eagle, and made the peace. Here the Russians and the Prussians turn and fight for the crossing before the peace.
// On the map (the big field, 1.0 × 1.12 km): the French come up the Insterburg road (south, +z), the Russians and the
// last Prussians hold the road out to Heinrichswalde (north, −z). The Niemen — broad, slow, the colour of tea — runs
// down the east of the field with the Lithuanian bank beyond it: Übermemel’s fishing houses on the water meadows, the
// Engelsberg rising behind. Tilsit lies on its terrace over the river, unwalled — the long Hohe Straße parallel to the
// water, the Deutsche Kirche’s spire, the stump of the Teutonic Knights’ castle by the river — with the boat bridge from
// the town to Übermemel and the raft of the meeting moored mid-river upstream of it. Fords at the low water of June
// up- and downstream; villages, rye and meadows on the terrace west of the town.
// Not mirrored but fair: the Niemen runs down the flank, not between the sides; the bridge stands half-way between the
// bases and its fords as far from either. The town, the Lithuanian bank and the meadows — the decisive ground — lie on
// the line between them, owned by neither. Senteinen is traded for Splitter, Stolbeck for Kallwen, the Jakobsruh park by
// the river for the Ballgarden alders, the Stadtheide’s edge for the Splitter wood, each as far from the nearer base as
// its counterpart (tools/map_fairness.py). 1806 only (`epochs`).
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
const noise = createNoise2D(2506_1807);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Insterburg road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Senteinen', x: -380, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Stolbeck', x: -50, z: 285, owner: null, sector: 'centre' },
  { id: 'D', name: 'Jakobsruh', x: 215, z: 320, owner: null, sector: 'east' },
  { id: 'E', name: 'Schwedenfeld', x: -380, z: 0, owner: null, sector: 'west' },
  { id: 'F', name: 'Tilsit', x: 110, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Übermemel', x: 420, z: 0, owner: null, sector: 'east' },
  { id: 'H', name: 'Splitter', x: -340, z: -315, owner: null, sector: 'west' },
  { id: 'I', name: 'Kallwen', x: 10, z: -285, owner: null, sector: 'centre' },
  { id: 'J', name: 'Ballgarden', x: 215, z: -300, owner: null, sector: 'east' },
  { id: 'K', name: 'Heinrichswalde road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Niemen down the east (it flows north here, −z), broad; the boat bridge from the town, fords up- and downstream
const NIEMEN = [[302, 720], [296, 400], [284, 170], [292, 0], [284, -170], [296, -400], [302, -720]];
const river = createRiver({
  paths: [NIEMEN],
  halfWidth: 34, level: 0, depth: 2.8, valley: 80,
  crossings: [
    { name: 'Tilsit boat bridge', x: 292, z: 0, kind: 'bridge', width: 8 },
    { name: 'Niemen ford (upstream)', x: 290, z: 290, kind: 'ford', width: 14 },
    { name: 'Niemen ford (downstream)', x: 290, z: -290, kind: 'ford', width: 14 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
/** The town on its terrace (unwalled). */
const TOWN = { x: 110, z: 0, rx: 130, rz: 165 };
const townQ = (x, z) => Math.hypot((x - TOWN.x) / TOWN.rx, (z - TOWN.z) / TOWN.rz);
const RAFT = { x: 290, z: 70 };
const CASTLE = { x: 215, z: -95 };   // the stump of the Ordensburg by the river

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Jakobsruh park and the Ballgarden alders by the river; the Stadtheide’s edge and the Splitter wood on the west
const WOODS = [[230, 400, 60, 45, 0.3], [235, -390, 60, 42, -0.2], [-440, 140, 60, 48, 0.2], [-420, -160, 62, 46, -0.3], [-180, 430, 50, 32, 0], [-160, -430, 52, 32, 0]];
const woods = (x, z) => {
  let k = smoothstep(0.62, 0.76, fbm(noise, x * 0.006 - 11, z * 0.006 + 5, 3)) * 0.7;  // (open fields, a few clumps)
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(24, 44, Math.hypot(x - c.x, z - c.z)));
  return Math.min(k, smoothstep(1.1, 1.35, townQ(x, z)));                              // (none in the town)
};

function height(x, z) {
  let h = fbm(noise, x * 0.0024, z * 0.0024, 3) * 2.4 + fbm(noise, x * 0.02 + 5, z * 0.02, 3) * 0.35 + 3;
  h += smoothstep(320, 60, x) * 4.5;                                                   // the terrace the town stands on, over the meadows
  h += hill(x, z, -200, 190, 90, 3) + hill(x, z, -220, -160, 100, 3.2);                // (swells on the terrace)
  h += smoothstep(BOUNDS.x - 60, BOUNDS.x + 140, x) * 26;                              // the Engelsberg rising behind the Lithuanian bank
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, -x) * 18;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 22;
  h += (h * 0.4 + 4.6 - h) * smoothstep(1.05, 0.8, townQ(x, z)) * 0.6;                  // the town on its level ground
  for (const p of POINTS) if (!'FG'.includes(p.id)) h += (h * 0.5 + 2.5 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'tilsit',
  armies: { nato: ['fr'], pact: ['ru', 'pr'] }, // (Murat and the Grande Armée against Bennigsen’s rearguard and Lestocq’s Prussians)
  name: 'Tilsit',
  description: 'Tilsit, June 1807 (a battle that was not fought): the town on its terrace over the broad Niemen, the boat bridge to the Lithuanian bank and Übermemel, the raft of the emperors’ meeting moored mid-river, rye and meadows round it.',
  epochs: ['1806'],
  region: 'east',
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 2506,
  height,
  river,
  airfields: [],
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 2506, cell: 72, weights: [0.28, 0.32, 0.18, 0.22] }), // late June: rye in the ear, the hay coming in

  theme: {
    // midsummer on the Niemen, high cloud
    fogColor: 0xbcc6c6,
    fogDensity: 0.0011,
    skyTop: 0x5a86b6,
    skyHorizon: 0xccd8dc,
    skyBottom: 0x7c8678,
    sunColor: 0xfff4da,
    sunIntensity: 2.05,
    sunDisk: 0.5,
    clouds: 0.3,
    cloudLight: 0xf2f4f4,
    cloudDark: 0x9ca6ae,
    sunDir: [-0.45, 0.6, 0.55],
    hemiSky: 0xc8d6e2,
    hemiGround: 0x4c5234,
    hemiIntensity: 1.25,
    rimColor: 0xd0d8e0,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5c6e36',
      grassAlt: '#506432',
      dryGrass: '#8c8650',
      dirt: '#5a4a38',
      rock: '#6c6a62',
      strip: '#4c4030',
      pasture: '#5e7238',
      ploughed: '#54442f',
      stubble: '#9c9458',
      meadow: '#6a7a3c',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-340, 0, 220],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (townQ(x, z) < 0.95) return [0x8a7e6c, 0.45];                              // the streets and yards of the town
        if (x > 250 && x < 345 && Math.abs(z) > 30) return [0x6c7c44, 0.35];          // (the water meadows, lusher)
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-340, 0, 220] }, pact: { x: 0, z: -BASE_Z, entries: [-340, 0, 220] } },
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
    // the streets kept open: the Hohe Straße along the river, the Deutsche Straße behind it, the street down to the bridge
    const street = (x, z) => Math.abs(x - 150) < 7 || Math.abs(x - 60) < 6 || Math.abs(z) < 7 || Math.abs(z - 100) < 6 || Math.abs(z + 100) < 6;
    const taken: number[][] = [[CASTLE.x, CASTLE.z]];

    // ---- Tilsit: town houses along its streets, the Deutsche Kirche and its spire, the Rathaus on the market
    const rr = mulberry32(2506_1);
    for (let i = 0; i < 1200 && taken.length < 110; i++) {
      const x = TOWN.x - TOWN.rx + rr() * TOWN.rx * 2, z = TOWN.z - TOWN.rz + rr() * TOWN.rz * 2;
      if (townQ(x, z) > 0.9 || street(x, z) || wet(x, z, 24) || nearPoint(x, z, 34) || Math.hypot(x - 70, z - 52) < 24 || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 34 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 11.5)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.abs(x - 150) < 22 || Math.abs(x - 60) < 20 ? Math.PI / 2 : 0, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.55 ? 2 : 3, damaged: 0 });
    }
    props.rand = mulberry32(2506_2);
    props.church({ x: 70, z: 52, yaw: 0 });                                         // (the Deutsche Kirche)
    { const g = terrain.heightAt(70, 34); props.box('stone', 70, g + 14, 34, 6, 28, 6, 0, 0xd8d0bc); props.box('metal', 70, g + 30, 34, 4.6, 4, 4.6, Math.PI / 4, 0x5a7a6e); props.box('metal', 70, g + 34, 34, 3, 4, 3, Math.PI / 4, 0x5a7a6e); props.box('metal', 70, g + 39, 34, 1.4, 6, 1.4, Math.PI / 4, 0x5a7a6e); } // (its tall spire)
    props.hall({ x: 110, z: -30, yaw: 0, width: 20, depth: 10, height: 8, color: 0xc8b898, roof: 0x5a4436, door: 4, name: 'Rathaus' });
    // the stump of the Ordensburg by the river: broken walls round its court, a low tower
    {
      const C = CASTLE, g0 = terrain.heightAt(C.x, C.z), BRICK = 0x8e4a38;
      for (const [dx, dz, yaw, len, ht] of [[0, -16, 0, 30, 5], [-16, 0, Math.PI / 2, 26, 3.5], [16, 4, Math.PI / 2, 18, 4.5]] as const) {
        props.box('stone', C.x + dx, g0 + ht / 2, C.z + dz, len, ht, 2.4, yaw, BRICK);
        cover.addBox({ x: C.x + dx, z: C.z + dz, yaw, length: len, thickness: 2.4, height: ht });
      }
      props.box('stone', C.x - 14, g0 + 6, C.z - 14, 7, 12, 7, 0, BRICK);
      cover.addBox({ x: C.x - 14, z: C.z - 14, yaw: 0, length: 7, thickness: 7, height: 12 });
      props.rubble(C.x + 8, C.z + 12, 3);
    }
    // ---- the raft of the meeting, moored mid-river: the deck, the two white pavilions, the flagstaffs
    {
      const y = river.level + 0.35;
      props.box('plain', RAFT.x, y, RAFT.z, 30, 0.7, 20, 0, 0x7a6450);
      props.box('plain', RAFT.x, y + 3.4, RAFT.z + 2, 14, 6, 9, 0, 0xf0ece0);
      props.box('plain', RAFT.x, y + 7.2, RAFT.z + 2, 15, 1.6, 10, 0, 0xd8d2c0, 0.2);
      props.box('plain', RAFT.x, y + 2.4, RAFT.z - 7, 7, 4, 4, 0, 0xf0ece0);
      for (const s of [-1, 1]) props.box('plain', RAFT.x + s * 13, y + 5, RAFT.z + 8, 0.3, 10, 0.3, 0, 0x4a3c2e);
      props.box('plain', RAFT.x - 13, y + 9, RAFT.z + 8 + 1.2, 0.1, 1.6, 2.4, 0, 0x2a3c8a);   // (the tricolour’s blue)
      props.box('plain', RAFT.x + 13, y + 9, RAFT.z + 8 + 1.2, 0.1, 1.6, 2.4, 0, 0xe8e4d8);   // (the Russian white)
      for (const s of [-1, 1]) props.box('plain', RAFT.x + s * 16, y + 0.2, RAFT.z - 9, 1, 0.5, 1, 0, 0x3a2e22); // (the mooring piles)
    }
    // ---- Übermemel: the fishing houses on the Lithuanian bank, boats drawn up on the shore
    buildVillage(props, P.G, 2506_7);
    for (const [x, z, yaw] of [[372, -60, 0.2], [380, 52, -0.1], [460, -40, 1.3], [455, 58, 1.6]] as const) props.house({ x, z, yaw, width: 8, depth: 6 });
    for (const [x, z] of [[340, -30], [342, 22], [338, 110]] as const) props.box('plain', x, terrain.heightAt(x, z) + 0.4, z, 2.2, 0.8, 8, 0.1, 0x5a4636);

    // ---- the windmills on the terrace; the villages; farms on the fields
    const MILLS = [[-120, 380], [-90, -390], [-470, 30], [-200, 20]];
    for (const [x, z] of MILLS) {
      const g = terrain.heightAt(x, z), yaw = (x * 7 + z * 3) % 6;
      props.box('plain', x, g + 2, z, 1.2, 4, 1.2, 0, 0x4a3c2e);
      props.box('plain', x, g + 6.5, z, 4.2, 5, 3.4, yaw, 0x7a6450);
      props.box('plain', x, g + 9.3, z, 4.4, 0.8, 3.8, yaw, 0x4a3a30, 0.25);
      const fx = Math.sin(yaw) * 2.2, fz = Math.cos(yaw) * 2.2;
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + 0.5;
        props.box('plain', x + fx + Math.cos(a) * Math.cos(yaw) * 4.5, g + 7 + Math.sin(a) * 4.5, z + fz - Math.cos(a) * Math.sin(yaw) * 4.5, 9, 1.2, 0.15, yaw, 0xcfc6b0, 0, a);
      }
      cover.addBox({ x, z, yaw, length: 4.2, thickness: 3.4, height: 8 });
    }
    for (const p of POINTS) if (!p.owner && !'FG'.includes(p.id)) buildVillage(props, p, 25066 + Math.round(p.x * 3 + p.z * 7));
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'hay', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 72 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 56 * 56)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 60) || woods(x, z) > 0.3 || wet(x, z, 30) || x > 330
        || townQ(x, z) < 1.25 || MILLS.some(([mx, mz]) => Math.hypot(x - mx, z - mz) < 30)) continue;
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

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 46 })), ...MILLS.map(([x, z]) => ({ x, z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 8 })),
      { test: (x, z) => wet(x, z, 2) || townQ(x, z) < 1.0 || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 30 || Math.hypot(x - P.G.x, z - P.G.z) < 60 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2800, broadleaf: 0.65, autumn: 0, forest: (x, z) => (wet(x, z, 14) ? 0.4 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1400, lane: 0 });
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
