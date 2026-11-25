// Prenzlau, 28 October 1806: Prince Hohenlohe, with what was left of the Prussian army after Jena, marched hard for
// the Oder and Stettin across the Uckermark. Murat’s cavalry — Lasalle’s and Grouchy’s horsemen, Beaumont’s dragoons —
// rode across his line of march and caught his columns before Prenzlau, at the north end of the Unteruckersee. The
// Prussian cavalry was ridden down in the suburbs, the gates were forced, and Hohenlohe, told (falsely) that he was
// surrounded by a hundred thousand men, laid down his arms with some 10,000 men and 64 guns.
// On the map (the big field, 1.0 × 1.12 km): the French come up the Boitzenburg road (south, +z), the Prussians hold
// the Pasewalk road (north, −z), the way on to Stettin. The Unteruckersee fills the east flank of the French half; the
// walled town of Prenzlau with St Mary’s great brick church stands at its north end, and the Ucker runs out of the lake
// past the town towards Pasewalk. Flat sandy country, pine woods, windmills on every rise: the Mühlenberg with its mills
// in the middle, Güstow, Blindow and Röpersdorf before the French, Klinkow on the west, Dedelow, Schönwerder and
// Ellingen before the Prussians.
// Not mirrored but fair: the lake and the river lie along the flank, never between the sides; the town and the Mühlenberg
// — the decisive ground — stand in the middle, owned by neither, the town’s south and north gates as far from either
// base. The lake shore before the French right is traded for the Ucker meadows before the Prussian right, the Blindow
// pines for the Dedelow pines, Güstow and Röpersdorf for Schönwerder and Ellingen, each village as far from the nearer
// base as its counterpart (tools/map_fairness.py). 1806 only (`epochs`).
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
const noise = createNoise2D(2810_1806);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Boitzenburg road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Blindow', x: -350, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Güstow', x: -20, z: 290, owner: null, sector: 'centre' },
  { id: 'D', name: 'Röpersdorf', x: 180, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Klinkow', x: -340, z: 20, owner: null, sector: 'west' },
  { id: 'F', name: 'Mühlenberg', x: -60, z: 10, owner: null, sector: 'centre', radius: 22 },
  { id: 'G', name: 'Prenzlau', x: 250, z: -10, owner: null, sector: 'east', radius: 28 },
  { id: 'H', name: 'Dedelow', x: -350, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Schönwerder', x: 0, z: -290, owner: null, sector: 'centre' },
  { id: 'J', name: 'Ellingen', x: 190, z: -310, owner: null, sector: 'east' },
  { id: 'K', name: 'Pasewalk road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Unteruckersee down the east flank of the French half (a broad course: [x, z, half-width]), narrowing at the town
// into the Ucker, which runs on north (−z) towards Pasewalk
const river = createRiver({
  path: [[450, 780, 130], [425, 470, 130], [415, 250, 118], [412, 120, 80], [408, 62, 26], [410, 20, 9], [420, -200, 9], [432, -450, 9], [426, -780, 9]],
  halfWidth: 9, level: 0, depth: 2.6, valley: 40,
  crossings: [
    { name: 'Ucker bridge', x: 412, z: -30, kind: 'bridge', width: 8 },
    { name: 'Ucker ford', x: 428, z: -380, kind: 'ford', width: 10 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
/** Inside Prenzlau’s wall. */
const TOWN = { x: 250, z: -10, rx: 105, rz: 88 };
const townQ = (x, z) => Math.hypot((x - TOWN.x) / TOWN.rx, (z - TOWN.z) / TOWN.rz);
const MILLS = [[-78, -4], [-40, 28], [-250, 170], [-230, -170], [110, 190], [100, -200], [-440, 30]];

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Blindow pines (French left), the Dedelow pines (Prussian left), alder carr along the lake and the Ucker
const WOODS = [[-410, 190, 80, 110, 0.15], [-410, -190, 80, 110, -0.15], [150, 400, 60, 35, 0.4], [150, -400, 60, 35, -0.4]];
const woods = (x, z) => {
  let k = smoothstep(0.58, 0.72, fbm(noise, x * 0.006 + 41, z * 0.006 + 5, 3)) * 0.7;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(14, 30, Math.hypot(x - c.x, z - c.z)));
  for (const [mx, mz] of MILLS) k = Math.min(k, smoothstep(16, 30, Math.hypot(x - mx, z - mz)));
  return Math.min(k, smoothstep(1.1, 1.35, townQ(x, z)));
};

function height(x, z) {
  let h = fbm(noise, x * 0.0026, z * 0.0026, 3) * 3 + fbm(noise, x * 0.02 + 1, z * 0.02, 3) * 0.4 + 3;
  h += smoothstep(380, 600, z) * 11 * (0.8 + 0.2 * Math.tanh((-x - 40) / 240));     // the sandy rise towards Boitzenburg
  h += smoothstep(380, 600, -z) * 11 * (0.8 + 0.2 * Math.tanh((-x - 40) / 240));    // and towards Pasewalk
  h += hill(x, z, P.F.x, P.F.z, 75, 6);                                            // the Mühlenberg
  h += hill(x, z, -250, 170, 60, 3) + hill(x, z, -230, -170, 60, 3);               // the windmill rises on the west
  h += hill(x, z, 110, 190, 55, 2.5) + hill(x, z, 100, -200, 55, 2.5);             // and either side of the town
  h += (4 - h) * smoothstep(1.1, 0.9, townQ(x, z)) * 0.6;                           // the town on its level ground
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, -x) * 24;
  h += smoothstep(BOUNDS.x + 30, BOUNDS.x + 160, x) * 10;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 22;
  for (const p of POINTS) if (!'FG'.includes(p.id)) h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'prenzlau',
  armies: { nato: ['fr'], pact: ['pr'] }, // (Murat’s cavalry against Hohenlohe’s retreating corps)
  name: 'Prenzlau',
  description: 'Prenzlau in the Uckermark, 28 October 1806: Murat’s cavalry rides across the line of Hohenlohe’s retreat to Stettin at the walled town on the north end of the Unteruckersee; flat sandy country, pine woods and windmills, the Ucker running north towards Pasewalk.',
  epochs: ['1806'],
  region: 'europe',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 2810,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 2810, cell: 80, weights: [0.32, 0.12, 0.4, 0.16] }),

  theme: {
    // a cold bright late-October morning over the lake
    fogColor: 0xb2b8bc,
    fogDensity: 0.0012,
    skyTop: 0x6c8aa6,
    skyHorizon: 0xc6ccce,
    skyBottom: 0x7a7c74,
    sunColor: 0xf2e6c8,
    sunIntensity: 1.85,
    sunDisk: 0.3,
    clouds: 0.5,
    cloudLight: 0xe0e2e0,
    cloudDark: 0x8a9298,
    sunDir: [0.55, 0.4, 0.65],
    hemiSky: 0xc8d0d8,
    hemiGround: 0x5a5040,
    hemiIntensity: 1.25,
    rimColor: 0xc0c8d0,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5e663e',
      grassAlt: '#525a38',
      dryGrass: '#9a8a5c',   // (the Uckermark’s sandy grass)
      dirt: '#7a6a4e',
      rock: '#8a806a',
      strip: '#5a4a36',
      pasture: '#5c663c',
      ploughed: '#6a5a40',   // (light sandy ploughland)
      stubble: '#9a8a58',
      meadow: '#6a7442',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 220],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (townQ(x, z) < 0.98) return [0x6e6450, 0.45];                       // the town’s streets and yards
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 220] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 220] } },
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
    const seg = (x0, z0, x1, z1, height, thickness) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height, thickness });
    // the streets kept open: the Stettiner Strasse north–south through the market, the street west to the Mühlenberg
    const street = (x, z) => Math.abs(x - P.G.x) < 7 || Math.abs(z - P.G.z) < 7;
    const gate = (x, z) => Math.abs(x - P.G.x) < 12 || Math.abs(z - P.G.z) < 12;

    // ---- Prenzlau: houses inside the wall, the market open, St Mary’s by it
    const rr = mulberry32(2810_1);
    const taken: number[][] = [];
    for (let i = 0; i < 200 && taken.length < 40; i++) {
      const x = TOWN.x - TOWN.rx + rr() * TOWN.rx * 2, z = TOWN.z - TOWN.rz + rr() * TOWN.rz * 2;
      if (townQ(x, z) > 0.86 || street(x, z) || wet(x, z, 12) || Math.hypot(x - P.G.x, z - P.G.z) < 26 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.7 ? 2 : 1, damaged: 0 });
    }
    props.rand = mulberry32(2810_2);
    { // St Mary’s: the great brick hall church and its two west towers
      const x = P.G.x + 34, z = P.G.z + 30, g = terrain.heightAt(x, z), BRICK = 0x8a4a36;
      props.hall({ x, z, yaw: 0, width: 16, depth: 30, height: 12, color: BRICK, roof: 0x5a2e24, door: 4, name: 'St Mary’s' });
      for (const dx of [-5, 5]) props.box('stone', x + dx, g + 13, z - 18, 5, 26, 5, 0, BRICK);
    }
    props.church({ x: P.G.x - 34, z: P.G.z - 34, yaw: 0 });                         // (St Nicolai)
    for (let k = 0; k < 56; k++) {                                                   // the town wall, gates where the streets go out
      const a0 = (k / 56) * Math.PI * 2, a1 = ((k + 1) / 56) * Math.PI * 2;
      const x0 = TOWN.x + Math.cos(a0) * TOWN.rx, z0 = TOWN.z + Math.sin(a0) * TOWN.rz, x1 = TOWN.x + Math.cos(a1) * TOWN.rx, z1 = TOWN.z + Math.sin(a1) * TOWN.rz;
      if (gate((x0 + x1) / 2, (z0 + z1) / 2) || wet((x0 + x1) / 2, (z0 + z1) / 2, 6)) continue;
      seg(x0, z0, x1, z1, 3.4, 0.9);
    }
    for (const [x, z] of [[TOWN.x, TOWN.z - TOWN.rz], [TOWN.x, TOWN.z + TOWN.rz], [TOWN.x - TOWN.rx, TOWN.z]]) { // the gate towers either side of each gate
      const along = z === TOWN.z ? [0, 1] : [1, 0];
      for (const s of [-1, 1]) { const tx = x + along[0] * s * 16, tz = z + along[1] * s * 16; props.box('stone', tx, terrain.heightAt(tx, tz) + 7, tz, 5, 14, 5, 0, 0x8a4a36); cover.addBox({ x: tx, z: tz, yaw: 0, length: 5, thickness: 5, height: 14 }); }
    }

    // ---- the windmills: post mills, a timber body on its trestle, four sails
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

    // ---- the villages; farms on the sandy fields; Hohenlohe’s abandoned baggage on the road north of the town
    for (const p of POINTS) if (!p.owner && !'FG'.includes(p.id)) buildVillage(props, p, 28106 + Math.round(p.x * 3 + p.z * 7));
    props.church({ x: P.C.x + 30, z: P.C.z + 22, yaw: 0 });
    props.church({ x: P.I.x - 30, z: P.I.z - 22, yaw: Math.PI });
    props.rand = mulberry32(2810_3);
    for (const [x, z] of [[220, -150], [205, -190], [180, -240], [150, -130], [-20, -150]] as const) {
      props.crates({ x, z, yaw: x * 0.1 });
      props.hayBales({ x: x + 7, z: z + 3, yaw: z * 0.1, count: 2 });
    }
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'fieldwall', 'farm'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 74 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 50) || woods(x, z) > 0.3 || wet(x, z, 30) || townQ(x, z) < 1.35
        || MILLS.some(([mx, mz]) => Math.hypot(x - mx, z - mz) < 30)) continue;
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
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 26 })), ...MILLS.map(([x, z]) => ({ x, z, r: 14 })),
      { test: (x, z) => wet(x, z, 1.5) || townQ(x, z) < 1.1 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 3000, forest: (x, z) => (wet(x, z, 12) ? 0.4 : woods(x, z) * 0.9) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1800, lane: 0 });
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
