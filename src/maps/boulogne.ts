// The Camp de Boulogne attacked from inland (hypothetical, 1805–07). From 1803 the Army of England lay in its hutted
// camps on the cliffs round Boulogne — the camp de droite on the plateau north of the town towards Wimereux, the camp de
// gauche on the heights of Outreau south of the Liane — streets of mud-walled, thatched huts with gardens, the flotilla’s
// prames and gunboats packed into the Liane basin, lying on the mud at low water, the Emperor’s baraque on the cliff by
// the ruined Tour d’Odre. Here a Coalition army that has broken into France comes for the camp and the flotilla from
// the Saint-Omer road.
// On the map (1.0 × 1.12 km, a grey Channel day): the French come up from Pont-de-Briques (+z, south), where the
// Emperor kept his château; the Coalition comes down the Saint-Omer road (−z, north-east). The Channel along the west
// edge under the cliffs; the Liane comes down the field from Pont-de-Briques past Saint-Léonard, the brook of the
// Denacre valley comes down from the north, and they meet below the town and run out west through the harbour to the
// sea. The haute-ville on its spur in the middle within its thirteenth-century ramparts, the belfry and the castle in
// the corner, the cathedral a ruin since 1798; the basse-ville and the quays below it; the flotilla on the mud.
// Not mirrored but fair: the Liane and the Denacre brook run down the west of the field, each through one half, each
// with a bridge and a ford as far from its base; the harbour, the haute-ville and Saint-Martin — the decisive ground —
// lie across the middle, owned by neither. The camp de gauche at Outreau is traded for the camp de droite on the
// northern plateau, Mont Lambert for the heights of La Capelle, Saint-Léonard for Terlincthun and the Grande Armée’s
// column; each as far from the nearer base as its counterpart (tools/map_fairness.py). 1806 only (`epochs`).
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
const noise = createNoise2D(1805_0803);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Pont-de-Briques', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Camp d’Outreau', x: -350, z: 290, owner: null, sector: 'west' },
  { id: 'C', name: 'Saint-Léonard', x: 40, z: 275, owner: null, sector: 'centre' },
  { id: 'D', name: 'Mont Lambert', x: 330, z: 320, owner: null, sector: 'east' },
  { id: 'E', name: 'Port', x: -370, z: 14, owner: null, sector: 'west', radius: 28 },
  { id: 'F', name: 'Haute-Ville', x: 70, z: -12, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Saint-Martin', x: 345, z: 20, owner: null, sector: 'east' },
  { id: 'H', name: 'Camp de droite', x: -340, z: -305, owner: null, sector: 'west' },
  { id: 'I', name: 'Terlincthun', x: 10, z: -285, owner: null, sector: 'centre' },
  { id: 'J', name: 'La Capelle', x: 350, z: -310, owner: null, sector: 'east' },
  { id: 'K', name: 'Saint-Omer road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Liane from the south, the Denacre brook from the north, the harbour where they meet, out to the Channel
const LIANE = [[-180, 720, 10], [-192, 420, 10], [-160, 170, 10], [-172, 22, 12]];
const DENACRE = [[-226, -720, 8], [-200, -430, 8], [-152, -210, 8], [-172, 22, 10]];
const HARBOUR = [[-172, 22, 12], [-250, 14, 14], [-320, 12, 24], [-440, 14, 28], [-520, 10, 44]];
const SEA = [[-640, -720, 128], [-632, 0, 128], [-640, 720, 128]];
const river = createRiver({
  paths: [LIANE, DENACRE, HARBOUR, SEA],
  halfWidth: 9, level: 0, depth: 2.4, valley: 34,
  crossings: [
    { name: 'Pont de Saint-Léonard', x: -165, z: 250, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Gué de Pont-de-Briques', x: -190, z: 440, kind: 'ford', width: 12, channel: 0 },
    { name: 'Pont du Denacre', x: -158, z: -240, kind: 'bridge', width: 8, channel: 1 },
    { name: 'Gué de Wimille', x: -204, z: -450, kind: 'ford', width: 12, channel: 1 },
    { name: 'Pont de Service', x: -236, z: 15, kind: 'bridge', width: 8, channel: 2 },
    { name: 'the basin at low water', x: -370, z: 13, kind: 'ford', width: 44, channel: 2, depth: 0.3 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
/** The streams’ line without asking the river (cheap, for the height): the Liane and the Denacre, then the harbour. */
const streamX = (z) => (z > 22 ? (z > 170 ? -160 - 32 * smoothstep(170, 420, z) : -172 + 12 * smoothstep(22, 170, z)) : z > -210 ? -172 + 20 * smoothstep(22, -210, z) : -152 - 48 * smoothstep(-210, -430, z));
const valleyD = (x, z) => Math.min(Math.abs(x - streamX(z)), x < -172 ? Math.abs(z - 14) : Infinity);
/** The haute-ville’s ramparts: a rectangle round the spur. */
const HV = { x: 70, z: -12, hx: 105, hz: 82 };
const inHV = (x, z, m = 0) => Math.abs(x - HV.x) < HV.hx + m && Math.abs(z - HV.z) < HV.hz + m;
const CASTLE = { x: HV.x + HV.hx - 18, z: HV.z - HV.hz + 18 };   // the castle in the north-east corner
const ODRE = { x: -452, z: -110 };                                // the ruined Tour d’Odre on the cliff
const COLUMN = { x: 60, z: -310 };                                // the Grande Armée’s column, begun 1804

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the woods of the Liane valley (Hesdin-l’Abbé side) and of the Denacre; copses on Mont Lambert and by La Capelle
const WOODS = [[160, 420, 70, 45, 0.2], [-60, -440, 75, 45, -0.2], [440, 200, 50, 70, 0.1], [440, -170, 55, 65, -0.1]];
const woods = (x, z) => {
  let k = smoothstep(0.62, 0.76, fbm(noise, x * 0.006 + 31, z * 0.006 - 7, 3)) * 0.6;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(-420, -380, x), 1 - (inHV(x, z, 30) ? 1 : 0));    // (the cliff tops are bare, the wind off the sea)
};

const terrace = 13; // (the old town on one level within its walls)

function height(x, z) {
  let h = fbm(noise, x * 0.0022, z * 0.0022, 3) * 3 + fbm(noise, x * 0.02 + 5, z * 0.02, 3) * 0.4 + 9;
  h += smoothstep(-200, 400, x) * 3;                                                // the plateau rising inland
  h += hill(x, z, 380, 330, 130, 6) + hill(x, z, 400, -340, 130, 5.5);              // Mont Lambert; the heights of La Capelle
  h += hill(x, z, HV.x, HV.z, 120, 3);                                              // the spur the haute-ville stands on
  // the valleys: the Liane’s and the Denacre’s broad floors, the harbour’s
  const vd = valleyD(x, z);
  h = 2 + (h - 2) * smoothstep(14, 150 + 40 * fbm(noise, x * 0.004, z * 0.004, 2), vd);
  // the cliffs: the plateau breaks off over the beach
  h = 1.4 + (h - 1.4) * smoothstep(-492, -455, x + fbm(noise, z * 0.01, 3, 2) * 10);
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, x) * 20;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 14;
  for (const p of POINTS) if (!'EF'.includes(p.id)) h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.3;
  if (inHV(x, z, 6)) h += (terrace - h) * smoothstep(6, -10, Math.max(Math.abs(x - HV.x) - HV.hx, Math.abs(z - HV.z) - HV.hz));
  return river.carve(x, z, Math.max(1.4, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'boulogne',
  armies: { nato: ['fr'], pact: ['pr', 'ru'] }, // (the Army of England in its camps against a Coalition army come over the Somme)
  name: 'Boulogne',
  description: 'The Camp de Boulogne attacked from inland, as it might have gone in 1805–07: the hutted camps of the Army of England on the plateaus north and south of the town, the Liane basin with the flotilla on the mud, the walled haute-ville, the Tour d’Odre and the Emperor’s baraque on the cliffs over the Channel.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1805,
  height,
  river,
  airfields: [],
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1805, cell: 76, weights: [0.4, 0.2, 0.22, 0.18] }), // the camps’ trodden pasture, wheat, the soldiers’ gardens

  theme: {
    // a grey, bright Channel day, the wind off the sea
    fogColor: 0xb4bcc0,
    fogDensity: 0.0013,
    skyTop: 0x6a7e94,
    skyHorizon: 0xc6ccd0,
    skyBottom: 0x768078,
    sunColor: 0xf6eedc,
    sunIntensity: 1.7,
    sunDisk: 0.25,
    clouds: 0.7,
    cloudLight: 0xe6e8ea,
    cloudDark: 0x8a929c,
    sunDir: [-0.45, 0.5, 0.55],
    hemiSky: 0xc4ced8,
    hemiGround: 0x4a4c38,
    hemiIntensity: 1.25,
    rimColor: 0xc8d0d8,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5a6a3a',
      grassAlt: '#4e5e34',
      dryGrass: '#88845a',
      dirt: '#5c4e3c',
      rock: '#a49c88',
      strip: '#4c4232',
      pasture: '#5a6a3c',
      ploughed: '#56463a',
      stubble: '#90885a',
      meadow: '#66763e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (x < -476) return [0xc8bc98, 0.8];                                                    // the beach under the cliffs
        if (inHV(x, z, -4)) return [0x7e7262, 0.45];                                              // the streets of the haute-ville
        if (Math.abs(P.B.x - x) < 120 && Math.abs(P.B.z - z) < 110 || Math.abs(P.H.x - x) < 120 && Math.abs(P.H.z - z) < 110) return [0x6c6448, 0.35]; // the camps’ trodden ground
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
    /** A wall from (x0, z0) to (x1, z1). */
    const seg = (x0, z0, x1, z1, height, thickness = 1.4) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height, thickness });
    // the haute-ville’s four gates: the Porte des Dunes (west, to the harbour), the Porte Neuve (north), the Porte de
    // Calais (east), the Porte des Degrés (south); the streets between them kept open
    const street = (x, z) => Math.abs(z - HV.z) < 7 || Math.abs(x - HV.x) < 7;

    // ---- the ramparts
    const W = 8;
    for (const [x0, z0, x1, z1] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) {
      const ax = HV.x + x0 * HV.hx, az = HV.z + z0 * HV.hz, bx = HV.x + x1 * HV.hx, bz = HV.z + z1 * HV.hz;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
      seg(ax, az, mx - ux * W, mz - uz * W, 5);                                       // (each side broken by its gate)
      seg(mx + ux * W, mz + uz * W, bx, bz, 5);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {                             // the round corner towers
      const x = HV.x + sx * HV.hx, z = HV.z + sz * HV.hz, g = terrain.heightAt(x, z);
      props.box('stone', x, g + 3.5, z, 8, 7, 8, Math.PI / 4, 0x9a9282);
      cover.addBox({ x, z, yaw: Math.PI / 4, length: 8, thickness: 8, height: 7 });
    }
    // the castle: a square keep-ring of the counts of Boulogne in the corner, its towers
    {
      const C = CASTLE, g0 = terrain.heightAt(C.x, C.z);
      for (const [dx, dz, yaw, len] of [[0, -14, 0, 30], [0, 14, 0, 30], [-14, 0, Math.PI / 2, 30], [14, 0, Math.PI / 2, 30]] as const) {
        props.box('stone', C.x + dx, g0 + 4, C.z + dz, len, 8, 3, yaw, 0x8e8676);
        cover.addBox({ x: C.x + dx, z: C.z + dz, yaw, length: len, thickness: 3, height: 8 });
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) props.box('stone', C.x + sx * 14, g0 + 5.5, C.z + sz * 14, 6, 11, 6, 0, 0x8a8272);
    }
    // inside: the belfry and the town hall, the cathedral’s ruin, the houses
    props.rand = mulberry32(1805_2);
    {
      const bx = HV.x - 30, bz = HV.z + 34, g = terrain.heightAt(bx, bz);
      props.box('stone', bx, g + 12, bz, 7, 24, 7, 0, 0x9a9080);
      props.box('metal', bx, g + 26, bz, 5, 4, 5, Math.PI / 4, 0x3a3c42);
      cover.addBox({ x: bx, z: bz, yaw: 0, length: 7, thickness: 7, height: 24 });
      props.hall({ x: HV.x - 52, z: HV.z + 30, yaw: 0, width: 22, depth: 11, height: 8, color: 0xb0a088, roof: 0x4a4c50, door: 4, name: 'Hôtel de ville' });
    }
    for (let k = 0; k < 14; k++) {                                                    // (Notre-Dame, pulled down from 1798: walls and heaps)
      const x = HV.x + 34 + (k % 7) * 6 - 18, z = HV.z - 42 + Math.floor(k / 7) * 16;
      if (k % 3) props.rubble(x, z, 1.2 + (k % 4) * 0.4); else props.box('stone', x, terrain.heightAt(x, z) + 2.5, z, 2, 5 + k % 5, 1.6, 0, 0x9a9080);
    }
    const rr = mulberry32(1805_1);
    const taken: number[][] = [];
    for (let i = 0; i < 600 && taken.length < 46; i++) {
      const x = HV.x - HV.hx + 12 + rr() * (HV.hx * 2 - 24), z = HV.z - HV.hz + 12 + rr() * (HV.hz * 2 - 24);
      if (street(x, z) || Math.hypot(x - P.F.x, z - P.F.z) < 30 || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 30 || Math.abs(x - HV.x - 34) < 26 && Math.abs(z - HV.z + 34) < 18
        || Math.abs(x - HV.x + 40) < 26 && Math.abs(z - HV.z - 32) < 14 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 12.5)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.6 ? 2 : 3, damaged: 0 });
    }
    // the basse-ville: the Grande Rue down to the quays, the fishermen’s houses round the harbour
    for (let i = 0; i < 900 && taken.length < 110; i++) {
      const x = -150 + rr() * 180, z = -60 + rr() * 140;
      if (inHV(x, z, 14) || wet(x, z, 12) || Math.abs(z - HV.z) < 7 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 12.5) || nearPoint(x, z, 34)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2, depth: 8, storeys: 2 + (rr() < 0.4 ? 1 : 0), damaged: 0 });
    }
    // the quays: the naval stores along the harbour, the flotilla lying in the basin
    props.rand = mulberry32(1805_3);
    for (const [x, z] of [[-300, 50], [-300, -24], [-420, 58], [-420, -30]] as const) props.hall({ x, z, yaw: 0, width: 26, depth: 10, height: 7, color: 0x8a7a64, roof: 0x4a3a2e, door: 4, name: 'magasin de la Marine' });
    for (let k = 0; k < 14; k++) {
      const x = -280 - k * 15, z = 13 + ((k * 7) % 3 - 1) * 9, yaw = 1.45 + (k % 3) * 0.1;
      if (Math.hypot(x - P.E.x, z - P.E.z) < 34) continue;
      const g = terrain.heightAt(x, z), y = Math.max(g, 0) + 0.3;
      const L = k % 4 === 0 ? 24 : 15;                                                // (a prame among the gunboats)
      props.box('plain', x, y, z, 3.4 + (L > 20 ? 2 : 0), 1.4, L, yaw, 0x4a3a2a);
      props.box('plain', x, y + 0.8, z, 3 + (L > 20 ? 2 : 0), 0.2, L - 1, yaw, 0x8a7a5a);
      props.box('plain', x, y + 6, z, 0.25, 11, 0.25, 0, 0x3a2e24);
      if (L > 20) props.box('plain', x + Math.sin(yaw) * 6, y + 5, z + Math.cos(yaw) * 6, 0.25, 9, 0.25, 0, 0x3a2e24);
    }

    // ---- the hutted camps: streets of mud-walled, thatched huts, each with its garden; the colonels’ huts at the head
    const hut = (x, z, yaw, w = 5, d = 9) => {
      const g = terrain.heightAt(x, z);
      props.box('plain', x, g + 1.1, z, w, 2.2, d, yaw, 0x9a8c70);
      for (const s of [-1, 1]) props.box('plain', x + s * w * 0.27, g + 3.05, z, w * 0.62, 0.3, d + 0.6, yaw, 0x9a8048, 0, s * -0.7); // (the thatch)
      props.box('plain', x, g + 2.3, z + d / 2 + 0.05, w * 0.9, 0.6, 0.1, yaw, 0x8a7c62);
      cover.addBox({ x, z, yaw, length: w, thickness: d, height: 2.6 });
    };
    const camp = (c, sgn) => {
      for (let row = 0; row < 5; row++) for (let k = 0; k < 9; k++) {
        const x = c.x - 100 + row * 50 + (k % 2) * 6, z = c.z + sgn * (-96 + k * 24);
        if (Math.hypot(x - c.x, z - c.z) < 36 || wet(x, z, 14) || x < -470 || terrain.heightAt(x, z) < 6) continue;
        hut(x, z, 0);
      }
      const g = terrain.heightAt(c.x + 60, c.z);
      props.box('plain', c.x + 60, g + 4, c.z + sgn * 40, 0.3, 8, 0.3, 0, 0x5a4a3a);   // (the camp’s flagstaff)
    };
    camp(P.B, 1);
    camp(P.H, -1);

    // ---- the cliffs: the Tour d’Odre’s ruin and the Emperor’s baraque, the batteries over the sea
    {
      const g = terrain.heightAt(ODRE.x, ODRE.z);
      props.box('stone', ODRE.x, g + 3, ODRE.z, 9, 6, 9, 0.4, 0x8a7a66);
      props.box('stone', ODRE.x + 2, g + 7, ODRE.z - 1, 5, 4, 6, 0.4, 0x8a7a66);
      cover.addBox({ x: ODRE.x, z: ODRE.z, yaw: 0.4, length: 9, thickness: 9, height: 7 });
      props.hall({ x: ODRE.x + 40, z: ODRE.z - 20, yaw: 0, width: 14, depth: 8, height: 4, color: 0x9a8a6e, roof: 0x5a5c5e, door: 3, name: 'the Emperor’s baraque' });
    }
    for (const [x, z] of [[-455, -200], [-455, 160], [-452, 330], [-455, -380]] as const) props.sandbagRing({ x, z, radius: 6, toward: 0 });
    // Terlincthun: the Grande Armée’s column, its plinth just risen, scaffolding round it
    {
      const g = terrain.heightAt(COLUMN.x, COLUMN.z);
      props.box('stone', COLUMN.x, g + 3, COLUMN.z, 10, 6, 10, 0, 0xb4aa94);
      props.box('stone', COLUMN.x, g + 9, COLUMN.z, 5, 6, 5, 0, 0xb4aa94);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) props.box('plain', COLUMN.x + sx * 6, g + 6, COLUMN.z + sz * 6, 0.3, 12, 0.3, 0, 0x5a4a3a);
      cover.addBox({ x: COLUMN.x, z: COLUMN.z, yaw: 0, length: 10, thickness: 10, height: 6 });
      for (const [x, z] of [[COLUMN.x + 18, COLUMN.z + 6], [COLUMN.x - 16, COLUMN.z - 10]] as const) props.logPile({ x, z, yaw: 0.3, length: 6 });
    }
    // Pont-de-Briques: the Emperor’s château behind the French
    props.hall({ x: 70, z: 520, yaw: 0, width: 26, depth: 12, height: 9, color: 0xc0b49a, roof: 0x4a4c52, door: 4, name: 'château de Pont-de-Briques' });

    // ---- the villages; farms on the plateau
    for (const p of POINTS) if (!p.owner && 'CDGIJ'.includes(p.id)) buildVillage(props, p, 18056 + Math.round(p.x * 3 + p.z * 7));
    props.rand = mulberry32(1805_4);
    props.church({ x: P.C.x + 40, z: P.C.z - 20, yaw: 0 });
    props.church({ x: P.G.x - 44, z: P.G.z + 20, yaw: Math.PI / 2 });
    props.church({ x: P.J.x - 40, z: P.J.z - 24, yaw: 0 });
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'hay', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 56 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 56 * 56)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 60) || woods(x, z) > 0.3 || wet(x, z, 24) || x < -440
        || inHV(x, z, 40) || x < 40 && Math.abs(z) < 90 || Math.abs(P.B.x - x) < 130 && Math.abs(P.B.z - z) < 120 || Math.abs(P.H.x - x) < 130 && Math.abs(P.H.z - z) < 120) continue;
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
      { test: (x, z) => wet(x, z, 2) || x < -440 || inHV(x, z, 12) || x < 40 && x > -160 && Math.abs(z) < 80
        || Math.abs(P.B.x - x) < 130 && Math.abs(P.B.z - z) < 120 || Math.abs(P.H.x - x) < 130 && Math.abs(P.H.z - z) < 120 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 2400, broadleaf: 0.85, autumn: 0, forest: (x, z) => (wet(x, z, 10) ? 0.35 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1100, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.6, fields: this.fields });

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
