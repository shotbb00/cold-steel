// Hameln, November 1806: the fortress on the Weser, the strongest in Hanover, held some 10,000 Prussians under the aged
// General von Schöler when the army fell apart at Jena. Savary came up with a weak French and Dutch division, drew a
// thin blockade round the place and talked the council of war into surrender: on 20 November 1806 Hameln capitulated,
// the town and the forts on the Klüt with their guns, without a shot at the walls. (A year before, in the winter of
// 1805, the British, Russian and Swedish landing on the Weser had marched past it towards the Ems.)
// On the map (the big field, 1.0 × 1.12 km): the French come down the Pyrmont road (south, +z), the Prussians from the
// Hanover road (north, −z). The Weser runs down the field lengthwise and splits round the Werder at the town: the
// Weserbrücke over the main arm, the Pfortmühle and its weir over the mill arm, the walled and bastioned town on the
// east bank round the market and the Münster. On the west bank the Klüt, the steep wooded hill the Hanoverians crowned
// with forts, Fort George on its top; the Weser hills behind it and beyond the town. Fords at Ohr (upstream) and
// Wehrbergen (downstream).
// Not mirrored but fair: the river runs between the flanks, not between the sides, and its two fords lie as far from
// either base; the town and the Klüt — the decisive ground — stand on the middle line, owned by neither, the bridge and
// the weir between them. Ohr for Wehrbergen, Tündern for Fischbeck, Klein Berkel for Afferde, the wood on the Ohr
// heights for the one on the Wehrbergen heights, each as far from the nearer base as its counterpart
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
const noise = createNoise2D(2011_1806);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Pyrmont road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Ohr', x: -340, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Tündern', x: 70, z: 290, owner: null, sector: 'centre' },
  { id: 'D', name: 'Klein Berkel', x: 340, z: 310, owner: null, sector: 'east' },
  { id: 'E', name: 'Fort George', x: -300, z: 0, owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Hameln', x: 110, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Ostertor', x: 360, z: 0, owner: null, sector: 'east' },
  { id: 'H', name: 'Wehrbergen', x: -340, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Fischbeck', x: 70, z: -290, owner: null, sector: 'centre' },
  { id: 'J', name: 'Afferde', x: 340, z: -310, owner: null, sector: 'east' },
  { id: 'K', name: 'Hanover road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));
const KLUT = { x: -300, z: 0 };

// the Weser down the field (it flows north, −z); the mill arm round the Werder by the town
const WESER = [[-60, 720], [-75, 420], [-95, 200], [-92, 0], [-95, -200], [-75, -420], [-60, -720]];
const MILL = [[-93, 170], [-40, 100], [-24, 0], [-40, -100], [-93, -170]];
const river = createRiver({
  paths: [WESER, MILL],
  halfWidth: 12, level: 0, depth: 2.6, valley: 34,
  crossings: [
    { name: 'Weserbrücke', x: -92, z: 0, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Pfortmühle weir', x: -24, z: 0, kind: 'bridge', width: 7, channel: 1 },
    { name: 'Ohr ford', x: -82, z: 300, kind: 'ford', width: 10, channel: 0 },
    { name: 'Wehrbergen ford', x: -82, z: -300, kind: 'ford', width: 10, channel: 0 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
const onWerder = (x, z) => Math.abs(z) < 160 && x > -82 && x < -30 && !wet(x, z, 3);
/** Inside the town wall (the east bank, its west side on the mill arm). */
const TOWN = { x: 110, z: 0, rx: 122, rz: 118 };
const townQ = (x, z) => Math.hypot((x - TOWN.x) / TOWN.rx, (z - TOWN.z) / TOWN.rz);

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Klüt’s wooded west flank, the woods on the Ohr and Wehrbergen heights, the Weser hills east of the town
const WOODS = [[-430, 0, 60, 150, 0], [-430, 360, 70, 60, 0.3], [-430, -360, 70, 60, -0.3], [440, 160, 50, 70, 0.2], [440, -160, 50, 70, -0.2]];
const woods = (x, z) => {
  let k = smoothstep(0.6, 0.74, fbm(noise, x * 0.006 - 17, z * 0.006 + 5, 3)) * 0.75;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(14, 30, Math.hypot(x - c.x, z - c.z)));
  k = Math.min(k, smoothstep(60, 85, Math.hypot(x - KLUT.x, z - KLUT.z)));          // (the forts’ field of fire kept clear)
  return Math.min(k, smoothstep(1.1, 1.35, townQ(x, z)));                            // (no wood under the walls)
};

function height(x, z) {
  let h = fbm(noise, x * 0.0024, z * 0.0024, 3) * 3 + fbm(noise, x * 0.02 + 3, z * 0.02, 3) * 0.4 + 3;
  h += smoothstep(360, 600, z) * 14 * (0.8 + 0.2 * Math.tanh((x - 60) / 240));      // the road climbing towards Pyrmont
  h += smoothstep(360, 600, -z) * 14 * (0.8 + 0.2 * Math.tanh((x - 60) / 240));     // and towards Hanover
  const k = hill(x, z, KLUT.x, KLUT.z, 110, 26);                                    // the Klüt: a steep hill over the west bank,
  h += Math.min(k, 21) + Math.max(0, k - 21) * 0.2;                                 // its top levelled for the forts
  h += smoothstep(-330, -470, x) * 12;                                              // the Weser hills behind it
  h += hill(x, z, -360, 330, 90, 7) + hill(x, z, -360, -330, 90, 7);                // the Ohr and Wehrbergen heights
  h += hill(x, z, 460, 0, 120, 9);                                                  // (the hills east of the town)
  h += (4 - h) * smoothstep(1.05, 0.88, townQ(x, z)) * 0.65;                        // the town on its terrace
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 26;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 24;
  for (const p of POINTS) if (!'EF'.includes(p.id)) h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'hameln',
  armies: { nato: ['fr'], pact: ['pr', 'ru'] }, // (Savary’s blockade against Schöler’s Prussians; the Russians of the 1805 Weser landing as the Coalition’s second)
  name: 'Hameln',
  description: 'Hameln on the Weser, November 1806: the French close on the Hanoverian fortress — the walled town on the east bank, the Weserbrücke and the Pfortmühle weir over the Werder, the forts on the steep Klüt across the river, the Weser hills round it.',
  epochs: ['1806'],
  region: 'europe',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 2011,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 2011, cell: 78, weights: [0.32, 0.14, 0.4, 0.14] }), // November: the valley ploughed

  theme: {
    // a grey November day in the Weser valley
    fogColor: 0xa8acaa,
    fogDensity: 0.0016,
    skyTop: 0x6c7480,
    skyHorizon: 0xb8bab6,
    skyBottom: 0x6c6e6a,
    sunColor: 0xe4dac6,
    sunIntensity: 1.5,
    sunDisk: 0.1,
    clouds: 0.8,
    cloudLight: 0xcacccc,
    cloudDark: 0x767c82,
    sunDir: [0.4, 0.35, 0.75],
    hemiSky: 0xc0c8d0,
    hemiGround: 0x4a4436,
    hemiIntensity: 1.25,
    rimColor: 0xb8c0c8,
    rimIntensity: 0.25,
    terrain: {
      grass: '#56603a',
      grassAlt: '#4a5434',
      dryGrass: '#847650',
      dirt: '#544538',
      rock: '#6e6a62',
      strip: '#483c2e',
      pasture: '#545e38',
      ploughed: '#4a3a2c',
      stubble: '#867650',
      meadow: '#66703e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-340, 0, 340],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (townQ(x, z) < 0.98) return [0x6a6050, 0.45];                                       // the streets
        if (Math.hypot(x - KLUT.x, z - KLUT.z) < 44) return [0x6c6448, 0.4];                     // the forts’ trodden yard
        if (onWerder(x, z)) return [0x5e7040, 0.4];                                               // the Werder’s meadows
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-340, 0, 340] }, pact: { x: 0, z: -BASE_Z, entries: [-340, 0, 340] } },
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

    // ---- Fort George on the Klüt: four curtains with a gate in each, a bastion on each corner; outworks down its flanks
    {
      const { x: cx, z: cz } = KLUT, S = 28, h = 3.2;
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
      props.rand = mulberry32(2011_3);
      props.hall({ x: cx + 10, z: cz - 14, yaw: 0, width: 20, depth: 9, height: 6, color: 0x8e826c, roof: 0x4a3a2e, door: 4, name: 'casemate barracks' });
      for (const sz of [1, -1]) {                                                    // (Fort Wilhelm and the lunettes on the slopes: open to the fort)
        seg(cx + 40, cz + sz * 70, cx + 70, cz + sz * 92, 2.6); seg(cx + 70, cz + sz * 92, cx + 100, cz + sz * 70, 2.6);
      }
    }

    // ---- Hameln: houses inside the wall, the market open, the Münster by the river; gates south, north, east and to the weir
    const street = (x, z) => Math.abs(x - TOWN.x) < 7 || Math.abs(z) < 7;
    const gate = (x, z) => Math.abs(x - TOWN.x) < 12 || Math.abs(z) < 12;
    const rr = mulberry32(2011_1);
    const taken: number[][] = [];
    for (let i = 0; i < 240 && taken.length < 40; i++) {
      const x = TOWN.x - TOWN.rx + rr() * TOWN.rx * 2, z = TOWN.z - TOWN.rz + rr() * TOWN.rz * 2;
      if (townQ(x, z) > 0.86 || street(x, z) || wet(x, z, 12) || Math.hypot(x - P.F.x, z - P.F.z) < 32 || Math.hypot(x - P.F.x + 60, z - P.F.z - 52) < 24 || Math.hypot(x - P.F.x - 26, z - P.F.z + 36) < 24 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.5 ? 2 : 3, damaged: 0 });
    }
    props.rand = mulberry32(2011_2);
    props.church({ x: P.F.x - 60, z: P.F.z + 52, yaw: Math.PI / 2 });              // (the Münster St Bonifatius)
    props.church({ x: P.F.x + 26, z: P.F.z - 36, yaw: 0 });                        // (the Marktkirche)
    props.hall({ x: P.F.x + 6, z: P.F.z + 30, yaw: 0, width: 24, depth: 10, height: 9, color: 0xb0987a, roof: 0x5a3c30, door: 4, name: 'Hochzeitshaus' });
    const N = 60, at = (a, k = 1) => [TOWN.x + Math.cos(a) * TOWN.rx * k, TOWN.z + Math.sin(a) * TOWN.rz * k];
    for (let i = 0; i < N; i++) {
      const [x0, z0] = at((i / N) * Math.PI * 2), [x1, z1] = at(((i + 1) / N) * Math.PI * 2), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (gate(mx, mz) || wet(mx, mz, 5)) continue;
      seg(x0, z0, x1, z1, 3.2, 1);
    }
    for (let b = 0; b < 8; b++) {
      const a = (b / 8) * Math.PI * 2 + Math.PI / 8, [tx, tz] = at(a, 1.16), [lx, lz] = at(a - 0.13), [qx, qz] = at(a + 0.13);
      if (wet(tx, tz, 8) || gate(tx, tz)) continue;
      seg(lx, lz, tx, tz, 3.2);
      seg(qx, qz, tx, tz, 3.2);
    }
    // the Pfortmühle on the Werder by the weir, its wheel-house on the arm
    props.hall({ x: -48, z: 22, yaw: Math.PI / 2, width: 16, depth: 9, height: 7, color: 0x9a8a72, roof: 0x4a3a2e, door: 3, name: 'Pfortmühle' });
    buildVillage(props, { x: P.G.x, z: P.G.z + 4 }, 2011_9);                       // (the Ostertor suburb)

    // ---- the villages, farms in the valley
    for (const p of POINTS) if (!p.owner && !'EFG'.includes(p.id)) buildVillage(props, p, 20116 + Math.round(p.x * 3 + p.z * 7));
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'fieldwall', 'farm'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 64 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 60) || woods(x, z) > 0.3 || wet(x, z, 28) || onWerder(x, z)
        || townQ(x, z) < 1.35 || Math.hypot(x - KLUT.x, z - KLUT.z) < 120) continue;
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
      { test: (x, z) => wet(x, z, 1.5) || townQ(x, z) < 1.2 || Math.hypot(x - KLUT.x, z - KLUT.z) < 60 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2800, forest: (x, z) => (wet(x, z, 10) || onWerder(x, z) ? 0.35 : woods(x, z) * 0.9) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x, z) => onWerder(x, z) }], count: 1600, lane: 0 });
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
