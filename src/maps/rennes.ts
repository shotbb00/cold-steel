// Rennes and the bocage (hypothetical, 1806–07: a Coalition force landed on the Breton coast, as the émigrés and the
// British had at Quiberon in 1795, marches on the capital of Brittany). Rennes stands on the Vilaine: the old town on
// the north bank round the Palais du Parlement de Bretagne, rebuilt in granite and stone after the great fire of 1720,
// with the cathedral of Saint-Pierre and the Portes Mordelaises, the last gate of the medieval walls; the low quarter
// of Toussaints across the river; the abbey of Saint-Melaine and the Thabor gardens on their hill to the north-east.
// All round it the bocage: small fields shut in by banked hedges, sunken lanes between them, granite farms and manors.
// On the map (1.0 × 1.12 km, a soft grey Breton day): the French come in from the Vitré road (+z, east), the Coalition
// from the Vannes road (−z, west). The Vilaine runs down the field from east to west a little south of the middle,
// through the town; the Pont Saint-Germain and the Pont Neuf in the town, the mill fords at Cesson above it and at the
// Moulin du Comte below. North of the river the Thabor, Saint-Laurent and Villejean; south of it the Champ de Mars,
// Chantepie and the manor of La Prévalaye.
// Not mirrored but fair: the river runs down the field between the flanks, not between the sides, and its two bridges
// and two fords lie as far from either base; the Parlement, the Thabor and the Champ de Mars — the decisive ground —
// stand across the middle, owned by neither. Cesson is traded for Bourg-l’Évêque, Saint-Laurent for Villejean,
// Chantepie for La Prévalaye, each as far from the nearer base; the sunken lanes and hedges close both halves alike
// (tools/map_fairness.py). 1806 only (`epochs`).
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
const noise = createNoise2D(1806_0035);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Vitré road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Saint-Laurent', x: -350, z: 280, owner: null, sector: 'west' },
  { id: 'C', name: 'Cesson', x: -20, z: 290, owner: null, sector: 'centre' },
  { id: 'D', name: 'Chantepie', x: 340, z: 320, owner: null, sector: 'east' },
  { id: 'E', name: 'Thabor', x: -300, z: 10, owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Parlement', x: -40, z: -10, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Champ de Mars', x: 300, z: 50, owner: null, sector: 'east' },
  { id: 'H', name: 'Villejean', x: -290, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Bourg-l’Évêque', x: -60, z: -280, owner: null, sector: 'centre' },
  { id: 'J', name: 'La Prévalaye', x: 300, z: -330, owner: null, sector: 'east' },
  { id: 'K', name: 'Vannes road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Vilaine (it flows west, −z) — north is −x
const VILAINE = [[90, 720], [62, 420], [104, 200], [72, 0], [38, -200], [82, -420], [62, -720]];
const river = createRiver({
  path: VILAINE,
  halfWidth: 11, level: 0, depth: 2.4, valley: 40,
  crossings: [
    { name: 'Pont Saint-Germain', x: 66, z: 50, kind: 'bridge', width: 8 },
    { name: 'Pont Neuf', x: 66, z: -60, kind: 'bridge', width: 8 },
    { name: 'Moulin de Cesson', x: 80, z: 290, kind: 'ford', width: 12 },
    { name: 'Moulin du Comte', x: 60, z: -300, kind: 'ford', width: 12 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
/** The river’s line without asking the river (cheap, for the height): straight between its knots. */
const riverX = (z) => {
  for (let i = 0; i < VILAINE.length - 1; i++) {
    const [ax, az] = VILAINE[i], [bx, bz] = VILAINE[i + 1];
    if (z <= az && z >= bz) return ax + (bx - ax) * (az - z) / (az - bz);
  }
  return VILAINE[0][0];
};
/** The town: the old town north of the river (−x), Toussaints south of it. */
const TOWN = { x: 10, z: 0, rx: 230, rz: 190 };
const townQ = (x, z) => Math.hypot((x - TOWN.x) / TOWN.rx, (z - TOWN.z) / TOWN.rz);
const PARLEMENT = { x: -40, z: 42 };                 // the Palais, its front on the Place
const CATHEDRAL = { x: -60, z: -110 };
const MORDELAISES = { x: -40, z: -178 };             // the gate on the Vannes road, its two drum towers
const MELAINE = { x: -330, z: 64 };                  // the abbey church by the Thabor

// the sunken lanes (chemins creux) between the hedges: worn a man’s height into the ground
const LANES = [
  [[-350, 280], [-200, 380], [-20, 450]], [[-20, 290], [-200, 200], [-300, 10]], [[340, 320], [200, 420], [20, 460]], [[-20, 290], [80, 290], [180, 260], [300, 50]],
  [[-290, -300], [-180, -400], [-20, -450]], [[-60, -280], [-220, -170], [-300, 10]], [[300, -330], [170, -420], [20, -460]], [[-60, -280], [60, -300], [170, -250], [300, 50]],
  [[-350, 280], [-400, 100], [-300, 10]], [[-290, -300], [-410, -130], [-300, 10]], [[340, 320], [420, 160], [300, 50]], [[300, -330], [420, -150], [300, 50]],
].flatMap((l) => l.slice(0, -1).map((a, i) => [a[0], a[1], l[i + 1][0], l[i + 1][1]]));
const laneD = (x, z) => {
  let best = Infinity;
  for (const [ax, az, bx, bz] of LANES) {
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
};

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Thabor’s gardens, the woods of La Prévalaye, the copses by Saint-Laurent and Chantepie
const WOODS = [[-380, 120, 50, 45, 0.2], [400, -400, 70, 55, -0.3], [-430, 420, 60, 45, 0.4], [430, 230, 55, 70, 0.1], [-420, -420, 55, 50, -0.2]];
const woods = (x, z) => {
  let k = smoothstep(0.58, 0.72, fbm(noise, x * 0.007 + 13, z * 0.007 - 5, 3)) * 0.7;   // (the bocage: copses everywhere)
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(1.05, 1.3, townQ(x, z)));
};

function height(x, z) {
  let h = fbm(noise, x * 0.0025, z * 0.0025, 3) * 3 + fbm(noise, x * 0.02 + 5, z * 0.02, 3) * 0.45 + 4;
  h += smoothstep(20, 300, Math.abs(x - riverX(z))) * 7;                           // the valley sides
  h += hill(x, z, -310, 10, 110, 9);                                                // the Thabor
  h += hill(x, z, 320, 20, 120, 8);                                                 // the rise of the Champ de Mars
  h += hill(x, z, -360, -330, 130, 4) + hill(x, z, 360, 330, 130, 4);               // (Villejean’s and Chantepie’s swells)
  const t = smoothstep(1.1, 0.8, townQ(x, z));
  h += (Math.min(h, 7) - h) * t * 0.5;                                              // (the town on the valley floor)
  h -= 1.7 * smoothstep(5, 2, laneD(x, z)) * (1 - t);                               // the sunken lanes
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 22;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  for (const p of POINTS) if (!'EF'.includes(p.id)) h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.5;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'rennes',
  armies: { nato: ['fr'], pact: ['gb', 'pr'] }, // (a British landing on the Breton coast, as at Quiberon in 1795; Prussia’s army if Britain’s cannot field here)
  name: 'Rennes',
  description: 'Rennes and the bocage of Brittany, as it might have gone in 1806–07: a Coalition army landed on the coast marches on the Breton capital — the Vilaine through the town, the Parlement, the cathedral and the Portes Mordelaises, the Thabor; banked hedges, sunken lanes and granite farms all round.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1806,
  height,
  river,
  airfields: [],
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.85,
  fields: createFields({ seed: 1806_35, cell: 50, weights: [0.42, 0.2, 0.16, 0.22] }), // the bocage: small pastures, buckwheat, apple closes

  theme: {
    // a soft grey Breton day
    fogColor: 0xaab4b4,
    fogDensity: 0.0016,
    skyTop: 0x6c7a86,
    skyHorizon: 0xbcc4c2,
    skyBottom: 0x6e766c,
    sunColor: 0xeee6d2,
    sunIntensity: 1.5,
    sunDisk: 0.12,
    clouds: 0.8,
    cloudLight: 0xd6d8d6,
    cloudDark: 0x7c848a,
    sunDir: [0.4, 0.45, -0.6],
    hemiSky: 0xc0cad0,
    hemiGround: 0x48503a,
    hemiIntensity: 1.3,
    rimColor: 0xbcc6cc,
    rimIntensity: 0.25,
    terrain: {
      grass: '#506836',
      grassAlt: '#465c30',
      dryGrass: '#7e8050',
      dirt: '#5a4c3c',
      rock: '#8a8478',
      strip: '#4a4032',
      pasture: '#52683a',
      ploughed: '#584838',
      stubble: '#8a8458',
      meadow: '#5e723c',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (townQ(x, z) < 0.95) return [0x7a7264, 0.45];                         // the streets and yards of the town
        if (laneD(x, z) < 2.6) return [0x5a4a38, 0.6];                             // the lanes’ trodden mud
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1st Company' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    // the streets kept open: over the two bridges, the Grande Rue through the old town to the Portes Mordelaises, the quays
    const street = (x, z) => Math.abs(z - 50) < 7 || Math.abs(z + 60) < 7 || Math.abs(x + 40) < 7 || Math.abs(x - 150) < 6;
    const big = [[PARLEMENT.x, PARLEMENT.z, 34], [CATHEDRAL.x, CATHEDRAL.z, 24], [MORDELAISES.x, MORDELAISES.z, 18]];

    // ---- the town: the old town north of the river (granite and timber-framed houses), Toussaints south of it
    const rr = mulberry32(1806_351);
    const taken: number[][] = [];
    for (let i = 0; i < 2400 && taken.length < 150; i++) {
      const x = TOWN.x - TOWN.rx + rr() * TOWN.rx * 2, z = TOWN.z - TOWN.rz + rr() * TOWN.rz * 2;
      if (townQ(x, z) > 0.9 || street(x, z) || wet(x, z, 9) || nearPoint(x, z, 32) || big.some(([bx, bz, r]) => Math.hypot(x - bx, z - bz) < r)
        || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 11.5)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.5 ? 2 : 3, damaged: 0 });
    }
    props.rand = mulberry32(1806_352);
    props.hall({ x: PARLEMENT.x, z: PARLEMENT.z, yaw: 0, width: 40, depth: 22, height: 11, color: 0xb6aa94, roof: 0x3e4248, door: 6, name: 'Palais du Parlement de Bretagne' });
    props.church({ x: CATHEDRAL.x, z: CATHEDRAL.z, yaw: Math.PI / 2 });                  // (Saint-Pierre, rebuilding since 1787)
    { const g = terrain.heightAt(CATHEDRAL.x, CATHEDRAL.z - 16); for (const s of [-1, 1]) props.box('stone', CATHEDRAL.x + s * 6, g + 11, CATHEDRAL.z - 16, 6, 22, 6, 0, 0x9a948a); }
    props.church({ x: 170, z: 90, yaw: 0 });                                             // (Toussaints)
    props.church({ x: MELAINE.x, z: MELAINE.z, yaw: Math.PI / 2 });                      // (the abbey of Saint-Melaine)
    props.hall({ x: MELAINE.x + 34, z: MELAINE.z + 6, yaw: Math.PI / 2, width: 30, depth: 10, height: 8, color: 0xa89c88, roof: 0x3e4248, door: 4, name: 'abbaye Saint-Melaine' });
    // the Portes Mordelaises: two drum towers over the gate, a stretch of the old wall either side
    {
      const M = MORDELAISES, g = terrain.heightAt(M.x, M.z);
      for (const s of [-1, 1]) {
        props.box('stone', M.x + s * 8, g + 6, M.z, 8, 12, 8, Math.PI / 4, 0x8a8478);
        cover.addBox({ x: M.x + s * 8, z: M.z, yaw: Math.PI / 4, length: 8, thickness: 8, height: 12 });
        props.wall({ x: M.x + s * 40, z: M.z + 6, yaw: -s * 0.15, length: 60, height: 6, thickness: 2.4 });
      }
      props.box('stone', M.x, g + 9.5, M.z, 10, 5, 6, 0, 0x8a8478);
    }

    // ---- the villages, the manors and the granite farms of the bocage
    for (const p of POINTS) if (!p.owner && 'BCDHIJ'.includes(p.id)) buildVillage(props, p, 18066 + Math.round(p.x * 3 + p.z * 7));
    props.rand = mulberry32(1806_353);
    props.church({ x: P.C.x - 40, z: P.C.z + 10, yaw: 0 });
    props.church({ x: P.I.x - 30, z: P.I.z - 36, yaw: 0 });
    props.church({ x: P.B.x + 40, z: P.B.z + 20, yaw: Math.PI / 2 });
    props.church({ x: P.H.x + 36, z: P.H.z - 26, yaw: Math.PI / 2 });
    props.hall({ x: P.J.x + 46, z: P.J.z, yaw: Math.PI / 2, width: 24, depth: 12, height: 9, color: 0x9a948a, roof: 0x3a3e44, door: 4, name: 'manoir de la Prévalaye' });
    props.hall({ x: P.D.x + 46, z: P.D.z, yaw: Math.PI / 2, width: 22, depth: 12, height: 9, color: 0x9a948a, roof: 0x3a3e44, door: 4, name: 'manoir de Chantepie' });
    props.hall({ x: P.G.x + 50, z: P.G.z, yaw: Math.PI / 2, width: 40, depth: 12, height: 8, color: 0xa49880, roof: 0x3e4248, door: 4, name: 'quartier (barracks)' });
    const kinds = ['farm', 'farm', 'fieldwall', 'hay', 'farm', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 80 && tries < 14000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 52 * 52)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 60) || woods(x, z) > 0.3 || wet(x, z, 24)
        || townQ(x, z) < 1.2 || laneD(x, z) < 16 || Math.hypot(x - MELAINE.x, z - MELAINE.z) < 50) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);

    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xcfc8b0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 24 })),
      { test: (x, z) => wet(x, z, 1.5) || townQ(x, z) < 1.05 || laneD(x, z) < 3.5 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 3600, broadleaf: 0.85, autumn: 0, forest: (x, z) => (wet(x, z, 10) ? 0.5 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    // the bocage: banked hedges round every small field
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 2600, lane: 0 });
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
