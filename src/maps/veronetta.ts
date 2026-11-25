// Verona, 18 October 1805: the Adige was the frontier — the old city on the right bank was French (the Kingdom of
// Italy), Veronetta on the left bank and the castle of San Pietro on its hill were Austrian. Before dawn Masséna’s
// sappers blew the barricade on the broken Castelvecchio bridge, Gardanne’s grenadiers crossed on planks under fire
// and took Veronetta street by street and the gates beyond, and the Austrians went back on Caldiero. The French hold
// the old city (+z: Piazza Brà, the Cittadella walls), the Austrians Veronetta (−z: its Venetian walls and the Porta
// Vescovo). The Adige winds across the middle in its bends; the hills — the Torricelle and Castel San Pietro on the
// left bank, the Quinzano heights on the right — rise along the north (−x) edge on both banks.
// Fair, not mirrored: the castle of San Pietro on its hill over the river is traded for the Quinzano heights, as high
// and as far from their base; Castelvecchio by its bridge on the French bank for the quay of Santa Maria in Organo on
// the Austrian bank; San Zeno’s and San Fermo’s churches for San Nazaro and San Paolo. Five bridges, Castelvecchio’s to
// the Navi, spread evenly over the river; Ponte Pietra in the middle belongs to no one. Each side has its own walls
// before its base with the same gates.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 450;
const WALL_Z = 365;
const GATES = [-300, -150, 0, 150, 300];
const noise = createNoise2D(1805_1018);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
const adigeZ = (x) => 60 * Math.sin(x * 0.0075 - 0.4) + 15 * Math.sin(x * 0.02);

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Piazza Brà', x: 0, z: 425, owner: 'nato', sector: 'centre', radius: 26 },
  { id: 'B', name: 'Quinzano heights', x: -330, z: 285, owner: null, sector: 'west' },
  { id: 'C', name: 'San Zeno', x: -110, z: 230, owner: null, sector: 'centre' },
  { id: 'D', name: 'San Fermo', x: 250, z: 265, owner: null, sector: 'east' },
  { id: 'E', name: 'Castelvecchio', x: -340, z: 45, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Ponte Pietra', x: 0, z: Math.round(adigeZ(0)), owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Santa Maria in Organo', x: 335, z: 0, owner: null, sector: 'east' },
  { id: 'H', name: 'Castel San Pietro', x: -270, z: -285, owner: null, sector: 'west' },
  { id: 'I', name: 'San Nazaro', x: 115, z: -245, owner: null, sector: 'centre' },
  { id: 'J', name: 'San Paolo', x: 360, z: -300, owner: null, sector: 'east' },
  { id: 'K', name: 'Porta Vescovo', x: 0, z: -425, owner: 'pact', sector: 'centre', radius: 26 },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

const river = createRiver({
  path: adigeZ,
  halfWidth: 16,
  level: 0,
  depth: 3,
  valley: 34,
  crossings: [
    { name: 'Ponte San Giorgio', x: -440, kind: 'bridge', width: 6 },
    { name: 'Ponte di Castelvecchio', x: -290, kind: 'bridge', width: 7 },
    { name: 'Ponte Pietra', x: 0, kind: 'bridge', width: 8 },
    { name: 'Ponte Nuovo', x: 190, kind: 'bridge', width: 7 },
    { name: 'Ponte delle Navi', x: 400, kind: 'bridge', width: 7 },
  ],
});
const BRIDGE_X = river.crossings.map((c) => c.x);
/** The streets: up from each bridge, through each gate, and along the quays. */
const hillsK = (x) => smoothstep(-300, -490, x);
const onStreet = (x, z, w = 4) => hillsK(x) < 0.3 && (
  (Math.abs(z) < WALL_Z && BRIDGE_X.some((bx) => Math.abs(x - bx) < w)) || (Math.abs(z) > WALL_Z - 20 && Math.abs(z) < BASE_Z && GATES.some((g) => Math.abs(x - g) < w))
  || Math.abs(Math.abs(z - adigeZ(x)) - (river.halfWidth + 12)) < w);

/** The woods (0..1): cypresses and gardens up the hills, a few gardens in town, plane trees by the river. */
const woods = (x, z) => {
  let k = hillsK(x) * smoothstep(-0.25, 0.2, fbm(noise, x * 0.01 + 4, z * 0.01 - 9, 2)) * 0.8;
  k = Math.max(k, smoothstep(0.6, 0.72, fbm(noise, x * 0.008 - 30, z * 0.008, 3)) * 0.5);
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 50, Math.hypot(x - p.x, z - p.z)));
  return onStreet(x, z, 8) ? 0 : k;
};

function height(x, z) {
  let h = fbm(noise, x * 0.003, z * 0.003, 3) * 2.5 + fbm(noise, x * 0.02 + 5, z * 0.02, 3) * 0.3 + 5;
  h += hillsK(x) * (16 + fbm(noise, x * 0.005 + 11, z * 0.005, 3) * 8);                          // the hills along the north, both banks
  h += hill(x, z, P.H.x, P.H.z, 80, 10) + hill(x, z, P.B.x, P.B.z, 80, 10);                    // Castel San Pietro’s hill; the Quinzano heights
  h += smoothstep(470, 640, -x) * 40 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 20;
  for (const p of POINTS) if (!'BH'.includes(p.id)) h += (h * 0.6 + 2.4 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (5 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'veronetta',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Masséna against the Austrian garrison; the Austrians have no units yet: the Russians stand in)
  name: 'Verona',
  description: 'Verona, 18 October 1805: Masséna forces the Adige — the old city on the right bank, Veronetta and the castle of San Pietro on its hill on the left, the river’s bends and five bridges, the Venetian walls.',
  epochs: ['1806'],
  region: 'italy',
  airfields: [], // (a walled city on a river: no strip; 1806 has no aircraft)
  conditions: { time: 'dawn', weather: 'clear' }, // (the crossing went in before first light)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180518,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1805_18, cell: 60, weights: [0.4, 0.25, 0.15, 0.2] }), // (gardens and orchards inside the walls, pasture outside)

  theme: {
    // an October dawn over the Adige, mist on the water, the brick and tufa catching the light
    fogColor: 0xc8c0b4,
    fogDensity: 0.0014,
    skyTop: 0x6a86aa,
    skyHorizon: 0xe6d2b8,
    skyBottom: 0x8a8070,
    sunColor: 0xffd8a8,
    sunIntensity: 1.6,
    sunDisk: 0.5,
    clouds: 0.3,
    cloudLight: 0xf2e6dc,
    cloudDark: 0x98989c,
    sunDir: [0.7, 0.3, -0.5],
    hemiSky: 0xcad0d8,
    hemiGround: 0x5a5240,
    hemiIntensity: 1.3,
    rimColor: 0xe8d8c4,
    rimIntensity: 0.3,
    terrain: {
      grass: '#5e6a3a',
      grassAlt: '#566438',
      dryGrass: '#8e8656',
      dirt: '#6a5a44',
      rock: '#8a8274',
      strip: '#54483a',
      pasture: '#5e6c3c',
      ploughed: '#5a4832',
      stubble: '#9a8c58',
      meadow: '#667440',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (onStreet(x, z)) return [0x9a8c74, 0.8];                                                 // the streets and quays
        if (Math.abs(z) > 300 || Math.abs(z - adigeZ(x)) < 300) return [0x7e7460, 0.35 * smoothstep(-200, 0, x)]; // (the town’s trodden ground)
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearWater = (x, z, r) => Math.abs(z - adigeZ(x)) < river.halfWidth + r;
    const taken: number[][] = [];
    const g = (x, z) => terrain.heightAt(x, z);

    // ---- the churches, the two castles
    props.rand = mulberry32(18101805);
    for (const q of [P.C, P.D, P.I, P.J]) { props.church({ x: q.x + 30, z: q.z + 6, yaw: Math.PI / 2 }); taken.push([q.x + 30, q.z + 6]); }
    const castle = (C, s, BRICK) => { // (a square of brick ranges round a court, the keep at one corner)
      const g0 = g(C.x, C.z);
      for (const [dx, dz, yaw] of [[0, -s, 0], [0, s, 0], [-s, 0, Math.PI / 2], [s, 0, Math.PI / 2]] as const) {
        props.box('stone', C.x + dx, g0 + 2.5, C.z + dz, 2 * s + 2, 6, 3.5, yaw, BRICK);
        props.cover.addBox({ x: C.x + dx, z: C.z + dz, yaw, length: 2 * s + 2, thickness: 3.5, height: 5.5 });
      }
      props.box('stone', C.x - s, g0 + 7, C.z - s, 7, 16, 7, 0, BRICK);
      props.cover.addBox({ x: C.x - s, z: C.z - s, yaw: 0, length: 7, thickness: 7, height: 14 });
      taken.push([C.x, C.z]);
    };
    castle({ x: P.E.x - 42, z: P.E.z + 14 }, 13, 0x9a4a36);   // Castelvecchio, red brick, by its bridge
    castle({ x: P.H.x - 36, z: P.H.z - 10 }, 12, 0xb8a888);   // Castel San Pietro, pale stone on its hill
    for (const q of [P.B]) for (const [dx, dz, yaw, length] of [[0, -20, 0, 30], [-15, -6, Math.PI / 2, 26], [15, -6, Math.PI / 2, 26]] as const) props.wall({ x: q.x + dx, z: q.z + dz, yaw, length, height: 1.4 }); // (the battery’s walls on Quinzano)

    // ---- the town: houses in blocks on both banks, the streets up from the bridges left open
    const rr = mulberry32(1805_181);
    let houses = 0; // ponytail: capped at 360 town houses for load time and draw calls
    for (let x = -460; x <= 470; x += 17) for (let z = -400; z <= 400; z += 15) {
      if (houses >= 360) break;
      const jx = x + (rr() - 0.5) * 6, jz = z + (rr() - 0.5) * 5, w = 7 + rr() * 3;
      const dRiver = Math.abs(jz - adigeZ(jx));
      if (rr() > 0.62 - dRiver / 600 || hillsK(jx) > 0.35 || dRiver < river.halfWidth + 20 || onStreet(jx, jz, 11) || nearPoint(jx, jz, 30)
        || Math.abs(Math.abs(jz) - WALL_Z) < 22 || Math.hypot(jx, Math.abs(jz) - BASE_Z) < 70 || taken.some(([tx, tz]) => Math.hypot(jx - tx, jz - tz) < 19)) continue;
      taken.push([jx, jz]); houses++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x: jx, z: jz, yaw: rr() < 0.7 ? 0 : Math.PI / 2, width: w, depth: 8, storeys: rr() < 0.6 ? 3 : 2, damaged: 0 });
    }
    // ---- the walls before each base: the Cittadella’s and Veronetta’s, the same gates in each
    for (const s of [1, -1]) for (let x = -320; x < 480; x += 36) {
      const cx = x + 18;
      if (GATES.some((gx) => Math.abs(cx - gx) < 30)) continue;
      props.wall({ x: cx, z: s * WALL_Z, yaw: 0, length: 36, height: 2.6, thickness: 1.4 });
    }
    for (const p of POINTS) if ('EG'.includes(p.id)) buildVillage(props, p, 18051 + Math.round(p.x * 3 + p.z * 5));
    // ---- the hills: a few farms among the gardens
    const sites: any[] = [];
    for (let tries = 0; sites.length < 26 && tries < 6000; tries++) {
      const x = -470 + rand() * 240, z = (rand() * 2 - 1) * 420;
      if (sites.some((s) => Math.hypot(s.x - x, s.z - z) < 55) || nearPoint(x, z, 55) || nearWater(x, z, 40) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 35) || Math.abs(Math.abs(z) - WALL_Z) < 30) continue;
      sites.push({ x, z, kind: ['farm', 'fieldwall', 'hay'][sites.length % 3], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd0ccbc]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })), ...taken.map(([x, z]) => ({ x, z, r: 10 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })), { test: (x, z) => nearWater(x, z, 2) || onStreet(x, z, 5) || Math.abs(Math.abs(z) - WALL_Z) < 4 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2600, broadleaf: 0.6, autumn: 0.5, maxY: 60,
      forest: (x, z) => (nearWater(x, z, 9) ? 0.35 : woods(x, z) * 0.95) }); // (plane trees on the quays)
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.8, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
