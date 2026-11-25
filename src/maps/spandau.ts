// Spandau and Berlin, October 1806: after Jena the road to the capital lay open. Davout’s corps marched into Berlin on
// 25 October, and the same day Lannes’ advance guard summoned the Spandau citadel — the Renaissance fortress on its
// island where the Spree runs into the Havel, the arsenal and the powder of the Prussian army behind it — and its
// commandant gave it up without a shot. Napoleon rode in to Charlottenburg the day before and slept in the palace.
// On the map (the big field, 1.0 × 1.12 km): the French come up the Potsdam road (south, +z), the Prussians from the
// Oranienburg road (north, −z). The Havel runs down the west of the field; a side arm of it rings the citadel’s
// island, and the Spree comes in from Berlin (east) and falls into that arm. The walled town of Spandau stands on
// the west bank, the Havel bridge into it from the island; the Zitadelle — a square of four bastions and the
// Juliusturm — on the island, fords onto it from both banks of the Spree. Down the Spree towards Berlin: Charlottenburg,
// the palace on the south bank, its garden and the Belvedere on the north bank, the Schlossbrücke between them; the
// Ruhleben ford half-way. The Jungfernheide woods north of the Spree on the road to Berlin, the Grunewald’s edge south.
// Not mirrored but fair: the Spree runs between the sides and the Havel down the flank, but every crossing has its twin
// as far from the other base — the island fords, the Havel fords at Pichelsdorf and Hakenfelde — and the Ruhleben ford
// and the Schlossbrücke lie on the line between. The town, the citadel and Charlottenburg — the decisive ground — stand
// on that line, owned by neither. The Grunewald and its sand hill before the French left are traded for the
// Jungfernheide and its hill before the Prussian centre, the palace for the Belvedere and the Schlossgarten, Pichelsdorf
// for Hakenfelde, Ruhleben for the Jungfernheide clearing, Lietzow for Plötzensee, each as far from the nearer base as
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
const noise = createNoise2D(2510_1806);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Potsdam road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Pichelsdorf', x: -400, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Ruhleben', x: -20, z: 280, owner: null, sector: 'centre' },
  { id: 'D', name: 'Lietzow', x: 310, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Spandau', x: -410, z: 0, owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Zitadelle', x: -218, z: 0, owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Charlottenburg', x: 260, z: 0, owner: null, sector: 'east', radius: 30 },
  { id: 'H', name: 'Hakenfelde', x: -400, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Jungfernheide', x: 20, z: -280, owner: null, sector: 'centre' },
  { id: 'J', name: 'Plötzensee', x: 310, z: -300, owner: null, sector: 'east' },
  { id: 'K', name: 'Oranienburg road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Havel down the west (it flows south, +z); its arm round the citadel island; the Spree in from Berlin (east)
const HAVEL = [[-300, -720], [-292, -400], [-286, -200], [-290, 0], [-286, 200], [-292, 400], [-300, 720]];
const ARM = [[-288, -215], [-232, -178], [-174, -108], [-152, 0], [-174, 108], [-232, 178], [-288, 215]];
const SPREE = [[720, 18], [470, 26], [260, 0], [90, -14], [-40, 4], [-150, 0]];
const river = createRiver({
  paths: [HAVEL, ARM, SPREE],
  halfWidth: 12, level: 0, depth: 2.6, valley: 36,
  crossings: [
    { name: 'Havel bridge', x: -290, z: 0, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Schlossbrücke', x: 260, z: 0, kind: 'bridge', width: 8, channel: 2 },
    { name: 'Ruhleben ford', x: 40, z: -5, kind: 'ford', width: 10, channel: 2 },
    { name: 'Citadel ford (south)', x: -200, z: 150, kind: 'ford', width: 10, channel: 1 },
    { name: 'Citadel ford (north)', x: -200, z: -150, kind: 'ford', width: 10, channel: 1 },
    { name: 'Pichelsdorf ford', x: -290, z: 330, kind: 'ford', width: 10, channel: 0 },
    { name: 'Hakenfelde ford', x: -290, z: -330, kind: 'ford', width: 10, channel: 0 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
/** On the citadel island (between the Havel and its arm). */
const onIsland = (x, z) => Math.abs(z) < 200 && x > -280 && x < -160 && !wet(x, z, 4);
/** Inside Spandau’s town wall. */
const TOWN = { x: -405, z: 0, rx: 78, rz: 118 };
const townQ = (x, z) => Math.hypot((x - TOWN.x) / TOWN.rx, (z - TOWN.z) / TOWN.rz);
const PALACE = { x: 260, z: 58 };   // Schloss Charlottenburg, south of the Spree
const BELV = { x: 300, z: -48 };    // the Belvedere in the Schlossgarten, north of it

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Grunewald’s edge (south), the Jungfernheide (north), the Schlossgarten, the Spandau forest’s and the Gatow heath’s edges
const WOODS = [[-130, 360, 150, 75, 0.25], [110, -350, 150, 75, -0.2], [250, -70, 55, 30, 0.1], [-440, -430, 70, 45, 0.2], [-440, 440, 70, 45, -0.2], [430, 180, 55, 35, 0.4]];
const woods = (x, z) => {
  let k = smoothstep(0.6, 0.74, fbm(noise, x * 0.006 + 7, z * 0.006 - 19, 3)) * 0.75; // (the Mark’s sand: pine clumps)
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(14, 30, Math.hypot(x - c.x, z - c.z)));
  k = Math.min(k, smoothstep(40, 60, Math.hypot(x - PALACE.x, z - PALACE.z)), smoothstep(12, 22, Math.hypot(x - BELV.x, z - BELV.z)));
  return Math.min(k, smoothstep(1.1, 1.4, townQ(x, z)));                            // (no wood under the walls)
};

function height(x, z) {
  let h = fbm(noise, x * 0.0024, z * 0.0024, 3) * 2.5 + fbm(noise, x * 0.02 + 3, z * 0.02, 3) * 0.4 + 3;
  h += smoothstep(360, 600, z) * 11 * (0.8 + 0.2 * Math.tanh((x + 40) / 240));      // the Teltow rising towards Potsdam
  h += smoothstep(360, 600, -z) * 11 * (0.8 + 0.2 * Math.tanh((40 - x) / 240));     // the Barnim edge towards Oranienburg
  h += hill(x, z, -150, 350, 95, 6) + hill(x, z, 120, -345, 95, 6);                 // sand hills in the Grunewald and the Jungfernheide
  h += hill(x, z, 420, 260, 80, 2.5) + hill(x, z, 420, -260, 80, 2.5);              // (low swells by Lietzow and Plötzensee)
  h += (3.6 - h) * smoothstep(1.1, 0.9, townQ(x, z)) * 0.7;                         // the town on its level ground
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 18;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 22;
  for (const p of POINTS) if (!'EF'.includes(p.id)) h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'spandau',
  armies: { nato: ['fr'], pact: ['pr'] }, // (Lannes and Davout before Berlin against the Spandau garrison)
  name: 'Spandau',
  description: 'Berlin, October 1806: the French come up to the capital and the Spandau citadel — the Renaissance fortress on its island where the Spree falls into the Havel, the walled town across the bridge, the road to Berlin through the Jungfernheide and Charlottenburg palace on the Spree.',
  epochs: ['1806'],
  region: 'europe',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 2510,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 2510, cell: 76, weights: [0.32, 0.16, 0.36, 0.16] }), // October: the sandy Mark half ploughed

  theme: {
    // a clear, cold late-October day on the Havel
    fogColor: 0xb4b8b6,
    fogDensity: 0.0013,
    skyTop: 0x6a86a8,
    skyHorizon: 0xc4c8c4,
    skyBottom: 0x74766e,
    sunColor: 0xf0dcb8,
    sunIntensity: 1.8,
    sunDisk: 0.4,
    clouds: 0.55,
    cloudLight: 0xdcdcd8,
    cloudDark: 0x80868c,
    sunDir: [0.45, 0.4, 0.7],
    hemiSky: 0xc4ccd6,
    hemiGround: 0x4e4636,
    hemiIntensity: 1.2,
    rimColor: 0xc8c0b0,
    rimIntensity: 0.3,
    terrain: {
      grass: '#5c6438',
      grassAlt: '#525a34',
      dryGrass: '#8e7e52',
      dirt: '#6a5a44',
      rock: '#7a7468',
      strip: '#54483a',
      pasture: '#58623a',
      ploughed: '#5a4a36',
      stubble: '#94845a',
      meadow: '#68723e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-400, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (townQ(x, z) < 0.98 || Math.hypot(x - P.F.x, z - P.F.z) < 30) return [0x6e6452, 0.45]; // the streets and the citadel’s yard
        if (Math.hypot(x - PALACE.x, z - PALACE.z - 26) < 34) return [0x8a8070, 0.4];                 // the palace forecourt
        if (onIsland(x, z)) return [0x5e7040, 0.35];                                                     // the island’s meadows
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-400, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-400, 0, 300] } },
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
    const seg = (x0, z0, x1, z1, height, thickness = 1.2) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height, thickness });

    // ---- the Zitadelle: four curtains with a gate in each (to the bridge, the fords and the arm), a bastion on each corner
    {
      const { x: cx, z: cz } = P.F, S = 30, h = 3.4;
      for (const [x0, z0, x1, z1] of [[-S, -S, S, -S], [-S, S, S, S], [-S, -S, -S, S], [S, -S, S, S]]) {
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, ux = Math.sign(x1 - x0) * 8, uz = Math.sign(z1 - z0) * 8;
        seg(cx + x0, cz + z0, cx + mx - ux, cz + mz - uz, h);
        seg(cx + mx + ux, cz + mz + uz, cx + x1, cz + z1, h);
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const x = cx + sx * S, z = cz + sz * S, tx = x + sx * 12, tz = z + sz * 12;
        seg(x, z - sz * 12, tx, tz, h);
        seg(x - sx * 12, z, tx, tz, h);
      }
      const g = terrain.heightAt(cx - 18, cz - 18);
      props.box('stone', cx - 18, g + 10, cz - 18, 7, 20, 7, 0, 0x9a8e7a);               // (the Juliusturm)
      props.box('stone', cx - 18, g + 20.6, cz - 18, 7.6, 1.2, 7.6, 0, 0x7e7464);
      cover.addBox({ x: cx - 18, z: cz - 18, yaw: 0, length: 7, thickness: 7, height: 20 });
      props.rand = mulberry32(2510_3);
      props.hall({ x: cx + 14, z: cz + 17, yaw: 0, width: 22, depth: 9, height: 7, color: 0x9c8e78, roof: 0x4a3a2e, door: 4, name: 'arsenal' });
    }

    // ---- Spandau: houses inside the wall, the market open, St Nicolai; gates north, south and to the Havel bridge
    const street = (x, z) => Math.abs(x - TOWN.x) < 7 || Math.abs(z) < 7;
    const rr = mulberry32(2510_1);
    const taken: number[][] = [];
    for (let i = 0; i < 220 && taken.length < 34; i++) {
      const x = TOWN.x - TOWN.rx + rr() * TOWN.rx * 2, z = TOWN.z - TOWN.rz + rr() * TOWN.rz * 2;
      if (townQ(x, z) > 0.86 || street(x, z) || wet(x, z, 10) || Math.hypot(x - P.E.x, z - P.E.z) < 30 || Math.hypot(x - P.E.x + 30, z - P.E.z - 30) < 24 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.6 ? 2 : 3, damaged: 0 });
    }
    props.rand = mulberry32(2510_2);
    props.church({ x: P.E.x - 30, z: P.E.z + 30, yaw: Math.PI / 2 });                // (St Nicolai)
    const N = 56, at = (a) => [TOWN.x + Math.cos(a) * TOWN.rx, TOWN.z + Math.sin(a) * TOWN.rz];
    for (let i = 0; i < N; i++) {
      const [x0, z0] = at((i / N) * Math.PI * 2), [x1, z1] = at(((i + 1) / N) * Math.PI * 2), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (Math.abs(mx - TOWN.x) < 12 || Math.abs(mz) < 12 || wet(mx, mz, 4)) continue;   // (the gates)
      seg(x0, z0, x1, z1, 3, 1);
    }

    // ---- Charlottenburg: the palace and its wings south of the Spree, the Belvedere in the garden north of it
    props.hall({ x: PALACE.x, z: PALACE.z + 6, yaw: 0, width: 54, depth: 13, height: 10, color: 0xd8c8a0, roof: 0x5a6a62, door: 6, name: 'Schloss Charlottenburg' });
    { const g = terrain.heightAt(PALACE.x, PALACE.z + 6); props.box('stone', PALACE.x, g + 13, PALACE.z + 6, 8, 6, 8, 0, 0xd8c8a0); props.box('metal', PALACE.x, g + 17.5, PALACE.z + 6, 6, 3, 6, Math.PI / 4, 0x5a7a6e); } // (the dome)
    props.hall({ x: PALACE.x - 34, z: PALACE.z + 30, yaw: Math.PI / 2, width: 28, depth: 9, height: 7, color: 0xd2c29c, roof: 0x5a6a62, door: 4, name: 'palace wing' });
    props.hall({ x: PALACE.x + 34, z: PALACE.z + 30, yaw: Math.PI / 2, width: 28, depth: 9, height: 7, color: 0xd2c29c, roof: 0x5a6a62, door: 4, name: 'palace wing' });
    {
      const g = terrain.heightAt(BELV.x, BELV.z);
      props.box('stone', BELV.x, g + 5, BELV.z, 8, 10, 8, 0, 0xd8ccac);
      props.box('stone', BELV.x, g + 11.5, BELV.z, 5, 3, 5, 0, 0xd0c4a4);
      props.box('metal', BELV.x, g + 14, BELV.z, 4, 2, 4, Math.PI / 4, 0x5a7a6e);
      cover.addBox({ x: BELV.x, z: BELV.z, yaw: 0, length: 8, thickness: 8, height: 10 });
    }
    buildVillage(props, { x: P.G.x - 70, z: P.G.z - 40 }, 2510_9);                 // (the gardeners’ houses by the Spree, north bank)

    // ---- the villages, farms on the sand
    for (const p of POINTS) if (!p.owner && !'EFG'.includes(p.id)) buildVillage(props, p, 25106 + Math.round(p.x * 3 + p.z * 7));
    for (const [x, z] of [[-150, 230], [130, -230]] as const) {                      // (a windmill on each side’s sand hill)
      const g = terrain.heightAt(x, z), yaw = 0.8;
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
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'fieldwall', 'farm'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 60 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 60) || woods(x, z) > 0.3 || wet(x, z, 28) || onIsland(x, z)
        || townQ(x, z) < 1.35 || Math.hypot(x - PALACE.x, z - PALACE.z) < 80 || Math.hypot(x - BELV.x, z - BELV.z) < 40) continue;
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
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 26 })),
      { test: (x, z) => wet(x, z, 1.5) || townQ(x, z) < 1.2 || Math.hypot(x - P.F.x, z - P.F.z) < 52 || Math.hypot(x - PALACE.x, z - PALACE.z - 10) < 50 || Math.hypot(x - BELV.x, z - BELV.z) < 12 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2400, forest: (x, z) => (wet(x, z, 10) || onIsland(x, z) ? 0.3 : woods(x, z) * 0.9) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x, z) => onIsland(x, z) }], count: 1400, lane: 0 });
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
