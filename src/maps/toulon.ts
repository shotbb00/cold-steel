// Toulon, September–December 1793: the royalists opened the port and the arsenal to Hood’s British and Lángara’s
// Spanish fleets, and an Allied garrison (British, Spanish, Neapolitan, Sardinian) held the town, the forts on Mont
// Faron and round the harbour against the Republic’s siege army. Captain Bonaparte, commanding the artillery, saw
// that the key was not the town but the Caire heights across the Petite Rade: guns there would close the anchorage.
// The Allies saw it too and built Fort Mulgrave, “Little Gibraltar”, on the heights; Bonaparte’s batteries (the
// Convention on the hill of Les Arènes, the Sans-Culottes, the Hommes sans Peur) pounded it, Dugommier stormed it
// in the rain on the night of 16–17 December, and the fleets left two days later, burning what they could.
// The ground, compressed: the Petite Rade along the east edge (+x), biting deep into the coalition’s half where the
// walled town of Toulon and the arsenal stand on its shore; the Caire heights with Fort Mulgrave over the water in
// the middle of the east side; La Seyne on the French side of the bay. Mont Faron, steep limestone, rises over the
// town’s west (−z, −x), the forts of Saint-Antoine at its foot; the hill of Les Arènes with the Convention battery on
// the French side (+z, −x); Fort Malbousquet on its low hill in the middle. The French come down the Ollioules road
// (+z), the coalition from the town’s Porte Royale (−z).
// Fair, not mirrored: each side has a high hill on its west flank as far from its own base (Les Arènes against Mont
// Faron, which is higher but steeper and farther out), a place on the east shore road (La Seyne against Toulon, the
// town walled and nearer its base, La Seyne nearer the Caire), and one road down the middle. Fort Mulgrave on the
// Caire and Fort Malbousquet, the middle’s two strongholds, belong to no one; Mulgrave lies a little to the French
// side of the line, Malbousquet and Saint-Antoine a little to the coalition’s.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createSea } from '../world/Sea.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 450;
const noise = createNoise2D(1793_1217);
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

/** The Petite Rade: water that stops, as a river’s does (a land battle — gaeta.ts). */
const bay = { ...createSea({ level: 0, size: 1600, color: 0x2a6278 }), sea: false };

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Ollioules road', x: 0, z: 440, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Les Arènes', x: -310, z: 290, owner: null, sector: 'west' },
  { id: 'C', name: 'Sans-Culottes battery', x: -10, z: 240, owner: null, sector: 'centre' },
  { id: 'D', name: 'La Seyne', x: 290, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Fort Saint-Antoine', x: -320, z: -30, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Fort Malbousquet', x: -30, z: 0, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Fort Mulgrave', x: 280, z: 70, owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'Mont Faron', x: -280, z: -290, owner: null, sector: 'west' },
  { id: 'I', name: 'Arsenal', x: 90, z: -240, owner: null, sector: 'centre', radius: 26 },
  { id: 'J', name: 'Toulon', x: 230, z: -360, owner: null, sector: 'east', radius: 30 },
  { id: 'K', name: 'Porte Royale', x: 0, z: -440, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

/** The bay’s shore down the east side, deepest into the coalition’s half (the Petite Rade under the town). */
const eastX = (z: number) => 480 - 215 * Math.exp(-(((z + 200) / 200) ** 2)) + fbm(noise, 5.3, z * 0.006, 2) * 12;
/** How far from the water (m; < 0 in it). */
const inland = (x: number, z: number) => eastX(z) - x;

/** Distance from (x, z) to the segment a–b. */
const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
/** The roads: the Ollioules road down the middle past Malbousquet to the arsenal and the town, the shore road, the track along Faron’s foot. */
const ROADS: number[][] = [
  [0, 560, P.A.x, P.A.z], [P.A.x, P.A.z, P.C.x, P.C.z], [P.C.x, P.C.z, P.F.x, P.F.z], [P.F.x, P.F.z, P.I.x, P.I.z], [P.I.x, P.I.z, P.K.x, P.K.z], [P.K.x, P.K.z, 0, -560],
  [P.A.x, P.A.z, P.D.x, P.D.z], [P.D.x, P.D.z, P.G.x, P.G.z], [P.G.x, P.G.z, P.I.x, P.I.z], [P.I.x, P.I.z, P.J.x, P.J.z], [P.J.x, P.J.z, P.K.x, P.K.z],
  [P.A.x, P.A.z, P.B.x, P.B.z], [P.B.x, P.B.z, P.E.x, P.E.z], [P.E.x, P.E.z, P.H.x, P.H.z], [P.H.x, P.H.z, P.K.x, P.K.z],
  [P.E.x, P.E.z, P.F.x, P.F.z], [P.F.x, P.F.z, P.G.x, P.G.z], [P.C.x, P.C.z, P.B.x, P.B.z],
];
const roadDist = (x: number, z: number) => { let b = 1e9; for (const [ax, az, bx, bz] of ROADS) b = Math.min(b, seg(x, z, ax, az, bx, bz)); return b; };

/** The town’s enceinte: an oval of bastioned wall round Toulon, open to the harbour. */
const TOWN = { x: P.J.x + 10, z: P.J.z - 10, rx: 92, rz: 78 };
const townR = (x: number, z: number) => Math.hypot((x - TOWN.x) / TOWN.rx, (z - TOWN.z) / TOWN.rz);

function height(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) return Math.max(-12, -0.6 + d * 0.08);                                             // the bay, shelving off
  let h = 4 + fbm(noise, x * 0.003, z * 0.003, 3) * 3 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.5;
  h += hill(x, z, -330, -380, 160, 48) + hill(x, z, -230, -300, 80, 8);                        // Mont Faron, its steep face over the town
  h += hill(x, z, -350, 330, 150, 44) + hill(x, z, -250, 290, 80, 9);                          // Les Arènes and its spur
  h += hill(x, z, P.G.x + 25, P.G.z + 5, 110, 24);                                              // the Caire heights
  h += hill(x, z, P.F.x, P.F.z, 85, 9) + hill(x, z, P.E.x, P.E.z, 70, 7);                       // Malbousquet’s hill; Saint-Antoine’s
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, -x) * 14;                                      // (the hills going on west, to Six-Fours and Le Revest)
  for (const p of POINTS) if ('DIJ'.includes(p.id)) h += (Math.max(3, h * 0.6) - h) * smoothstep(p.radius ?? 40 + 20, 18, Math.hypot(x - p.x, z - p.z)) * 0.6;
  h += (Math.max(3, h * 0.5) - h) * smoothstep(1.25, 0.9, townR(x, z)) * 0.7;                  // (the town on its low shore)
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return Math.min(h, 0.6 + d * (h > 14 ? 0.8 : 0.12));                                          // the quays and strands, or rock where the Caire comes down
}

/** Pines, holm oak and garrigue on the hills (0..1). */
const woods = (x: number, z: number) => {
  if (inland(x, z) < 25 || townR(x, z) < 1.2) return 0;
  let k = smoothstep(0.45, 0.62, fbm(noise, x * 0.007 + 17, z * 0.007 - 5, 3)) * 0.8;
  k = Math.max(k, smoothstep(150, 80, Math.hypot(x + 330, z + 380)) * 0.7, smoothstep(140, 80, Math.hypot(x + 350, z - 330)) * 0.7); // (the hillsides)
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 62, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(4, 10, roadDist(x, z)));
};

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'toulon',
  armies: { nato: ['fr'], pact: ['gb', 'au', 'ru'] }, // (Dugommier’s siege army against Hood’s and Lángara’s garrison: the British first, the Austrians and Russians behind)
  name: 'Toulon',
  description: 'The siege of Toulon, autumn 1793: the walled town and the arsenal on the Petite Rade under Mont Faron, Fort Malbousquet on its hill, and across the bay Fort Mulgrave, “Little Gibraltar”, on the Caire heights where Bonaparte’s batteries won the siege.',
  epochs: ['1806'],
  region: 'italy',
  airfields: [], // (hills, forts and a harbour town: no strip; 1806 has no aircraft)
  conditions: { time: 'day', weather: 'clear' }, // (a bright December day, the mistral blowing)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 179312,
  height,
  steep: 0.55,
  river: bay,
  woods: (x: number, z: number) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1793_12, cell: 58, weights: [0.3, 0.25, 0.25, 0.2] }),

  theme: {
    // a hard bright December day in Provence, the mistral clearing the sky
    fogColor: 0xc4ccd4, fogDensity: 0.0008,
    skyTop: 0x4a7ec0, skyHorizon: 0xd0dae2, skyBottom: 0x868a7c,
    sunColor: 0xfff0da, sunIntensity: 1.8, sunDisk: 0.45,
    clouds: 0.15, cloudLight: 0xf4f4f0, cloudDark: 0xa4acb4,
    sunDir: [0.5, 0.45, -0.6],
    hemiSky: 0xc8d6e2, hemiGround: 0x5e5a42, hemiIntensity: 1.25,
    rimColor: 0xdce2e8, rimIntensity: 0.25,
    terrain: {
      grass: '#6a7444', grassAlt: '#606a3e', dryGrass: '#958a5a', dirt: '#7e6448', rock: '#b0aa9c',
      pasture: '#6c7444', ploughed: '#7c5c42', stubble: '#a09262', meadow: '#6a7642',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (d < 0) return [y > -1.5 ? 0xc4b898 : 0x7a8274, 1];                                    // the sand under the water
        if (d < 20 && y < 2.5) return [0xd4c8a4, 1];                                              // the strands and quays
        if (d < 30) return [0xa8a290, 0.8];                                                       // the rocks along the shore
        if (roadDist(x, z) < 3) return [0xbaa682, 0.8];                                           // the roads, white with dust
        if (townR(x, z) < 1) return [0x9e9686, 0.8];                                              // the town’s paving
        if (y > 30) return [0xb4ae9e, smoothstep(30, 45, y) * 0.7];                               // Faron’s bare limestone
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-250, 0, 250] }, pact: { x: 0, z: -BASE_Z, entries: [-250, 0, 150] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1st Company' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    bay.build(scene, terrain);
    const nearPoint = (x: number, z: number, r: number) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const taken: number[][] = [];
    const STONE = 0xcabea4, PLINTH = 0x9c9078;
    const stoneWall = (x: number, z: number, yaw: number, len: number, h = 5) => {
      const g = terrain.heightAt(x, z);
      props.box('stone', x, g + h / 2 - 0.9, z, len, h, 3, yaw, STONE);
      props.box('stone', x, g - 0.4, z, len + 0.3, 1.6, 3.6, yaw, PLINTH);
      props.cover.addBox({ x, z, yaw, length: len, thickness: 3, height: h - 1 });
    };

    // ---- Toulon: the bastioned enceinte round the town, open where the roads come in (the Porte de France, the Porte Royale, the shore gate) and on the harbour
    for (let a = 0; a < Math.PI * 2; a += 0.12) {
      const x = TOWN.x + Math.cos(a) * TOWN.rx, z = TOWN.z + Math.sin(a) * TOWN.rz;
      if (inland(x, z) < 12 || roadDist(x, z) < 9) continue;
      const tx = -Math.sin(a) * TOWN.rx, tz = Math.cos(a) * TOWN.rz;
      stoneWall(x, z, Math.atan2(-tz, tx), 0.12 * Math.hypot(tx, tz) + 0.6);
    }
    for (const a of [0.6, 1.6, 2.5, 3.4, 4.3]) { // the bastions
      const x = TOWN.x + Math.cos(a) * (TOWN.rx + 6), z = TOWN.z + Math.sin(a) * (TOWN.rz + 6);
      if (inland(x, z) < 16 || roadDist(x, z) < 12) continue;
      const g = terrain.heightAt(x, z);
      props.box('stone', x, g + 1.8, z, 11, 5.6, 11, a + Math.PI / 4, STONE);
      props.cover.addBox({ x, z, yaw: a + Math.PI / 4, length: 11, thickness: 11, height: 4.5 });
    }
    props.rand = mulberry32(1793_0827);
    props.church({ x: P.J.x + 24, z: P.J.z - 18, yaw: Math.PI / 2 });                         // Sainte-Marie, the cathedral
    taken.push([P.J.x + 24, P.J.z - 18]);
    const rr = mulberry32(17931);
    for (let i = 0, n = 0; i < 400 && n < 46; i++) {
      const a = rr() * Math.PI * 2, d = 0.25 + rr() * 0.6;
      const x = TOWN.x + Math.cos(a) * TOWN.rx * d, z = TOWN.z + Math.sin(a) * TOWN.rz * d;
      if (inland(x, z) < 14 || roadDist(x, z) < 6 || Math.hypot(x - P.J.x, z - P.J.z) < 14 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 11)) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: (rr() < 0.5 ? 0 : Math.PI / 2) + (rr() - 0.5) * 0.08, width: 7 + rr() * 2, depth: 8, storeys: rr() < 0.6 ? 3 : 2, damaged: 0.1 });
    }
    // ---- the arsenal: the long ropewalk and the store halls along the shore, slipways into the water, hulks and the fleet in the Rade
    props.rand = mulberry32(1793_0901);
    for (const [dx, dz, w, d, yaw, name] of [[60, 20, 60, 12, 0.35, 'the ropewalk'], [50, -30, 30, 16, 0.35, 'the mast store'], [-10, 40, 24, 14, 1.92, 'the powder store']] as const) {
      const x = P.I.x + dx, z = P.I.z + dz;
      props.hall({ x, z, yaw, width: w, depth: d, height: 7, color: 0xb8a88c, roof: 0x8a4a34, door: 6, name });
      taken.push([x, z]);
    }
    for (const [z, len, m] of [[-130, 46, 3], [-215, 40, 3], [-300, 34, 2], [-60, 30, 2]] as const) { // ships at anchor: hull and masts
      const x = eastX(z) + 70;
      props.box('plain', x, 0.8, z, 10, 3.2, len, 0.15, 0x3a2e24);
      for (let k = 0; k < m; k++) props.box('plain', x, 13, z - len * 0.3 + k * len * 0.3, 0.6, 24, 0.6, 0, 0x4a3a2a);
    }

    // ---- Fort Malbousquet: the square fort on its hill, a gate in every face, the magazine off the centre
    const fortRing = (c: { x: number; z: number }, half: number, h: number, yaw0 = 0) => {
      for (let side = 0; side < 4; side++) {
        const a = yaw0 + side * Math.PI / 2, nx = Math.cos(a), nz = Math.sin(a);
        for (let t = -half + 6; t <= half - 6; t += 12) {
          if (Math.abs(t) < 8) continue; // (the gate)
          stoneWall(c.x + nx * half - nz * t, c.z + nz * half + nx * t, -a + Math.PI / 2, 12.2, h);
        }
        const bx = c.x + (nx - nz) * half, bz = c.z + (nz + nx) * half, g = terrain.heightAt(bx, bz); // corner bastion
        props.box('stone', bx, g + h / 2 - 0.6, bz, 9, h, 9, -a + Math.PI / 4, STONE);
        props.cover.addBox({ x: bx, z: bz, yaw: -a + Math.PI / 4, length: 9, thickness: 9, height: h - 1 });
      }
    };
    fortRing(P.F, 34, 4.4, 0.1);
    props.townHouse({ x: P.F.x + 14, z: P.F.z - 15, yaw: 0.1, width: 12, depth: 8, storeys: 1, name: 'the magazine', damaged: 0 });
    taken.push([P.F.x + 14, P.F.z - 15]);
    // ---- Fort Saint-Antoine: a smaller stone redoubt at Faron’s foot
    fortRing(P.E, 24, 3.8, -0.3);
    // ---- Fort Mulgrave: the earth redoubt and its outworks on the Caire, banks open on three sides
    for (let a = 0; a < Math.PI * 2; a += 0.2) {
      if (Math.abs(Math.sin(a * 1.5)) < 0.22) continue; // (the sally gaps: north-west, south-west, east)
      const x = P.G.x + Math.cos(a) * 40, z = P.G.z + Math.sin(a) * 34;
      props.wall({ x, z, yaw: Math.atan2(-Math.cos(a) * 34, -Math.sin(a) * 40) + Math.PI / 2, length: 9, height: 1.8, thickness: 2.2 });
    }
    props.box('stone', P.G.x - 16, terrain.heightAt(P.G.x - 16, P.G.z + 12) + 1.4, P.G.z + 12, 8, 3, 6, 0.2, 0x8a7a5c); // (the blockhouse)
    taken.push([P.G.x - 16, P.G.z + 12]);
    // ---- Bonaparte’s batteries: epaulements of earth and gabions facing Mulgrave and Malbousquet
    for (const [bx, bz, yaw] of [[P.C.x + 50, P.C.z - 40, -0.6], [P.D.x - 60, P.D.z - 70, 0.3], [P.B.x + 60, P.B.z - 50, -0.3], [P.C.x - 40, P.C.z - 50, 0.1]] as const)
      for (let k = -1; k <= 1; k++) props.wall({ x: bx + Math.cos(yaw) * k * 9, z: bz - Math.sin(yaw) * k * 9, yaw, length: 8, height: 1.4, thickness: 1.6 });
    // ---- Fort Faron’s tower on the summit, the Croix-Faron chapel; La Seyne, the windmill on Les Arènes
    const T = { x: -330, z: -380 };
    props.cover.addCylinder({ x: T.x, z: T.z, radius: 7, height: 8, spots: false });
    props.column({ x: T.x, z: T.z, radius: 7, height: 8 });
    props.church({ x: P.H.x + 30, z: P.H.z + 20, yaw: 0 });
    const W = { x: P.B.x - 34, z: P.B.z + 26 };
    props.column({ x: W.x, z: W.z, radius: 3.2, height: 9 });
    props.cover.addCylinder({ x: W.x, z: W.z, radius: 3.2, height: 9, spots: false });
    taken.push([T.x, T.z], [P.H.x + 30, P.H.z + 20], [W.x, W.z]);
    for (const p of [P.D, P.H, P.B]) buildVillage(props, p, 17935 + Math.round(p.x * 3 + p.z * 7));
    // fishing boats drawn up below La Seyne
    for (let i = 0; i < 5; i++) { const z = 250 + i * 14, x = eastX(z) - 10; props.box('plain', x, terrain.heightAt(x, z) + 0.4, z, 5, 0.6, 1.6, 0.2, 0x5a4434); }

    // ---- terraces, field walls and bastides
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 50 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (inland(x, z) < 40 || Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 60) || roadDist(x, z) < 12 || woods(x, z) > 0.3
        || townR(x, z) < 1.4 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 40)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd8d2c0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...taken.map(([x, z]) => ({ x, z, r: 10 })), { test: (x: number, z: number) => roadDist(x, z) < 5 || inland(x, z) < 20 || townR(x, z) < 1.15 }];
    // Aleppo pines, holm oaks, olives and cypresses
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 2800, broadleaf: 0.45, autumn: 0, maxY: 90, forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.2, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => inland(x, z) < 24 }] });

    return {
      buildings: props.buildings,
      update(dt: number, t: number) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
