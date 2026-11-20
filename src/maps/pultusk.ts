// Pułtusk, 26 December 1806: Lannes' V Corps, alone and wading through the Polish mud, found Bennigsen's Russians
// drawn up before the town of Pułtusk, the Narew and its bridge behind them, the old bishops' castle on the river
// bank. Sleet and snow squalls blew all day; the guns sank to their axles, men lost their shoes in the clay.
// Lannes attacked along the whole front — Claparède's brigade into the Mosin wood on the Russian right, Suchet's
// men up against the batteries before Szyszki — and was held, then pushed back, until Gudin's division came in
// at dusk on his left; both sides claimed the day. The French come from the west (+z here), the Russians hold the
// town and the river (−z). Fair, not mirrored: the town and its castle on the Russians' left are traded for
// Kleszewo's walled manor and the hamlet beside it on the French left; the big Mosin wood on the Russian right for
// the Popławy wood on the French right — the woods sit on opposite flanks, each before the other side's town;
// the low rise by Szyszki for the one by Strzegocin. The Narew runs down the east flank past the town and the castle
// (a course river: world/River.js), from the Russian end of the field to the French — the same water on both sides'
// flank, the town bridge to the Popławy bank by the Russian end, a ford by the French. No `climate`: wet ground and
// sleet, not a snowfield.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 450;
const noise = createNoise2D(1806_12);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Nasielsk road', x: 0, z: 420, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Kleszewo manor', x: -380, z: 300, owner: null, sector: 'west', radius: 24 },
  { id: 'C', name: 'Strzegocin', x: -100, z: 240, owner: null, sector: 'centre' },
  { id: 'D', name: 'Popławy wood', x: 240, z: 310, owner: null, sector: 'east' },
  { id: 'E', name: 'Ponikiew', x: -310, z: 90, owner: null, sector: 'west' },
  { id: 'F', name: 'Trzciniec', x: 40, z: -15, owner: null, sector: 'centre' },
  { id: 'G', name: 'Białowieża', x: 300, z: -45, owner: null, sector: 'east' },
  { id: 'H', name: 'Mosin wood', x: -260, z: -290, owner: null, sector: 'west' },
  { id: 'I', name: 'Szyszki', x: 120, z: -260, owner: null, sector: 'centre' },
  { id: 'J', name: 'Pułtusk', x: 330, z: -330, owner: null, sector: 'east', radius: 30 },
  { id: 'K', name: 'Narew road', x: 0, z: -420, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Narew down the east flank, past the castle and the town: the town bridge over to the Popławy bank, a ford below
const NAREW = [[455, -640], [432, -500], [408, -360], [412, -210], [440, -50], [428, 110], [404, 270], [418, 430], [452, 640]];
const river = createRiver({
  paths: [NAREW],
  halfWidth: 15,
  level: 0,
  depth: 2.8,
  valley: 60,
  crossings: [
    { name: 'Pułtusk bridge', x: 408, z: -330, kind: 'bridge', width: 8 },
    { name: 'Ford by Kacice', x: 410, z: 300, kind: 'ford', width: 12 },
  ],
});
const CASTLE = { x: 362, z: -425 };
/** 1 in the town, 0 outside it: the long market running down to the castle and the river. */
const town = (x, z) => smoothstep(1.1, 0.85, Math.hypot((x - P.J.x - 15) / 55, (z - P.J.z + 50) / 110));
/** The woods (0..1): the Mosin wood, the Popławy wood, copses of birch and pine, alders along the Narew. */
const woods = (x, z) => {
  let k = smoothstep(0.5, 0.64, fbm(noise, x * 0.006 + 5, z * 0.006 + 17, 3)) * 0.8;
  k = Math.max(k, smoothstep(1.05, 0.8, Math.hypot((x - P.H.x + 30) / 150, (z - P.H.z - 10) / 95)));    // (the Mosin wood: big, on the Russian right)
  k = Math.max(k, smoothstep(1.05, 0.8, Math.hypot((x - P.D.x - 40) / 140, (z - P.D.z + 10) / 95)));    // (the Popławy wood, on the French right)
  k = Math.min(k, smoothstep(14, 28, Math.hypot(x - P.H.x, z - P.H.z)), smoothstep(14, 28, Math.hypot(x - P.D.x, z - P.D.z))); // (a clearing, a forester's lodge)
  for (const p of POINTS) if (p.id !== 'D' && p.id !== 'H') k = Math.min(k, smoothstep(32, 56, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, 1 - town(x, z), smoothstep(40, 70, Math.hypot(x - CASTLE.x, z - CASTLE.z)));
};

function height(x, z) {
  let h = fbm(noise, x * 0.0025, z * 0.0025, 3) * 4.5 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.4 + 6;
  h += hill(x, z, P.I.x - 30, P.I.z - 20, 120, 7) + hill(x, z, P.I.x - 160, P.I.z + 10, 90, 4);   // the low rise by Szyszki, where the Russian batteries stood
  h += hill(x, z, P.C.x + 20, P.C.z + 20, 115, 7) + hill(x, z, P.C.x + 150, P.C.z + 40, 90, 4);   // the rise by Strzegocin
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 22 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  h += (2.4 - h) * town(x, z) * 0.6;                                                                // the town on the low ground by the river
  for (const p of POINTS) if (p.id !== 'J') h += (h * 0.6 + 2.4 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'pultusk',
  armies: { nato: ['fr'], pact: ['ru'] }, // (Lannes against Bennigsen)
  name: 'Pułtusk',
  description: 'Poland, December 1806: the town of Pułtusk and its castle on the Narew behind the Russian line, the Mosin and Popławy woods on the flanks, the fields a sea of mud under sleet.',
  epochs: ['1806'],
  region: 'east',
  conditions: { time: 'day', weather: 'rain' }, // (sleet and snow squalls all day: the mud)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180612,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1806_26, cell: 80, weights: [0.15, 0.55, 0.15, 0.15] }), // December: ploughland turned to clay

  theme: {
    // a dark winter day on the Narew: low cloud, sleet driving across, the light grey and failing early
    fogColor: 0xa4a8a6,
    fogDensity: 0.0022,
    skyTop: 0x7a8088,
    skyHorizon: 0xb4b8b6,
    skyBottom: 0x84867e,
    sunColor: 0xd8dcdc,
    sunIntensity: 1.0,
    sunDisk: 0,
    clouds: 1,
    cloudLight: 0xb8bcbc,
    cloudDark: 0x6c7276,
    sunDir: [0.4, 0.4, 0.6],
    hemiSky: 0xbcc4ca,
    hemiGround: 0x5a5244,
    hemiIntensity: 1.45,
    rimColor: 0xb8c0c6,
    rimIntensity: 0.15,
    terrain: {
      grass: '#5c6040',
      grassAlt: '#545a3c',
      dryGrass: '#7e7656',
      dirt: '#5a4a3a',
      rock: '#7a7a74',
      strip: '#4e4232',
      pasture: '#5e6442',
      ploughed: '#4e4030',
      stubble: '#7a7050',
      meadow: '#5a6244',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const t = town(x, z);
        if (t > 0) return [0x6a5e50, t * 0.55];                                                    // the town's churned streets
        const s = smoothstep(0.55, 0.7, fbm(noise, x * 0.02 - 4, z * 0.02 + 9, 2));
        if (s > 0) return [0xc8ccc8, s * 0.55];                                                    // slush lying in the furrows
        const m = smoothstep(0.5, 0.62, fbm(noise, x * 0.012 + 30, z * 0.012, 2));
        return m > 0 ? [0x463a2e, m * 0.6] : null;                                                 // standing water and mud
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 360 }, pact: { x: 0, z: -360 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearWater = (x, z, r) => river.project(x, z).d < river.halfWidth + r;

    // ---- Pułtusk: town houses round the long market, the collegiate church, the bishops' castle on the river bank
    const rr = mulberry32(1806_1226);
    const taken: number[][] = [];
    for (let i = 0; i < 70; i++) {
      const x = P.J.x + 15 + (rr() * 2 - 1) * 60, z = P.J.z - 50 + (rr() * 2 - 1) * 115;
      if (town(x, z) < 0.6 || Math.abs(x - P.J.x - 15) < 13 || Math.abs(x) > BOUNDS.x - 18 || nearWater(x, z, 25) || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 34 || Math.hypot(x - P.J.x, z - P.J.z) < 14) continue; // (the market down the middle)
      if (taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 12)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.PI / 2, width: 7 + rr() * 3, depth: 8, storeys: rr() < 0.6 ? 2 : 1, damaged: 0 });
    }
    props.rand = mulberry32(26121806);
    props.church({ x: P.J.x + 15, z: P.J.z + 40, yaw: Math.PI / 2 });                             // (the collegiate church at the head of the market)
    taken.push([P.J.x + 15, P.J.z + 40]);
    // the castle: a curtain wall round the courtyard, the bishops' house along one side, a tower
    const C = CASTLE, g0 = terrain.heightAt(C.x, C.z);
    for (const [dx, dz, yaw] of [[0, -16, 0], [0, 16, 0], [-16, 0, Math.PI / 2], [16, 0, Math.PI / 2]] as const) {
      for (const k of [-1, 1]) if (!(dz > 0 && k > 0)) {                                         // (the gate on the town side)
        const x = C.x + dx + (yaw ? 0 : k * 8), z = C.z + dz + (yaw ? k * 8 : 0);
        props.box('stone', x, g0 + 1.6, z, 15.5, 4.4, 1.6, yaw, 0xc8bca6);
        props.cover.addBox({ x, z, yaw, length: 15.5, thickness: 1.6, height: 3.6 });
      }
    }
    props.hall({ x: C.x, z: C.z - 6, yaw: 0, width: 26, depth: 9, height: 7, color: 0xd2c8b2, roof: 0x7a3a2a, door: 3, name: 'castle' });
    props.box('stone', C.x - 16, g0 + 5, C.z + 16, 6, 12, 6, 0, 0xc8bca6);
    props.cover.addBox({ x: C.x - 16, z: C.z + 16, yaw: 0, length: 6, thickness: 6, height: 10 });
    taken.push([C.x, C.z]);

    // ---- Kleszewo: the manor and its walled yard, the hamlet beside it; the villages; a forester's lodge in each wood
    props.hall({ x: P.B.x + 4, z: P.B.z + 26, yaw: 0, width: 20, depth: 10, height: 6, color: 0xd8d0bc, roof: 0x6a4030, door: 4, name: 'manor' });
    for (const [dx, dz, yaw, length] of [[4, 44, 0, 36], [-20, 28, Math.PI / 2, 30], [28, 28, Math.PI / 2, 30]] as const) props.wall({ x: P.B.x + dx, z: P.B.z + dz, yaw, length, height: 1.8 });
    taken.push([P.B.x + 4, P.B.z + 26]);
    buildVillage(props, { x: P.B.x + 70, z: P.B.z - 30 }, 1806_71);
    for (const p of POINTS) if (!p.owner && 'CEFGI'.includes(p.id)) buildVillage(props, p, 18062 + Math.round(p.x * 3 + p.z * 7));
    for (const q of [P.D, P.H]) {
      props.house({ x: q.x + 6, z: q.z - 4, yaw: 0.4, width: 7, depth: 6 });
      props.logPile({ x: q.x - 8, z: q.z + 6, yaw: 1.1, length: 7 });
      taken.push([q.x + 6, q.z - 4]);
    }
    // the Russian batteries' breastworks before Szyszki, the French guns' before Strzegocin
    for (const [q, s] of [[P.I, 1], [P.C, -1]] as const) for (let k = -2; k <= 2; k++) if (k) props.wall({ x: q.x + k * 14, z: q.z + s * 26, yaw: 0, length: 10, height: 0.9 });

    // ---- farms, fences, hay and log piles in the mud
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'hay', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 84 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 100);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 60 || Math.hypot(x, z + BASE_Z) < 90 || nearPoint(x, z, 55) || woods(x, z) > 0.25 || town(x, z) > 0 || nearWater(x, z, 50) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 40)) continue;
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

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      { x: CASTLE.x, z: CASTLE.z, r: 30 }, ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })), { test: (x, z) => nearWater(x, z, 1.5) || town(x, z) > 0.3 }];
    // bare birches, oaks and alders, dark pines
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4400, broadleaf: 0.55, autumn: 1, forest: (x, z) => (nearWater(x, z, 12) ? 0.45 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 2000, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.4, fields: this.fields });

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
