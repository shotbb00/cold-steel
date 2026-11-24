// Erfurt, 16 October 1806: two days after Jena–Auerstedt the wreckage of the Prussian army streamed down the roads
// into Erfurt — thousands of stragglers, wagons, the wounded Field Marshal Möllendorff and the Prince of Orange behind
// the old walls of the city and the guns of the Petersberg citadel. Murat’s cavalry came up the Weimar road on its
// heels, cut the roads round the town and summoned it; that evening the city and the citadel capitulated with some
// 10,000 men and their guns.
// On the map (the big field, 1.0 × 1.12 km): the French come up the Weimar road (south-east, +z), the Prussians hold
// the Langensalza road (north-west, −z), their way out. The Gera runs through the field lengthwise and through the
// walled city in the middle: the Fischmarkt and the merchants’ town east of the river, the Krämerbrücke over it, the
// cathedral hill (the Domberg with the Dom and St Severi) and the Petersberg with its bastioned citadel west of it.
// Fords at Daberstedt’s mill (south) and Ilversgehofen (north). Melchendorf and Dittelstedt under the Steiger on the
// French side, Ilversgehofen, Marbach and the Roter Berg on the Prussian side, the Krämpfer suburb outside the east gate.
// Not mirrored but fair: the river runs between the flanks, not between the sides, and its two fords lie as far from
// either base; the city, the Domberg and the Petersberg — the decisive ground — stand in the middle, owned by neither,
// every gate as near one side as the other. The wooded Steiger heights before the French left are traded for the Roter
// Berg and its wood before the Prussian right, Melchendorf and Dittelstedt for Ilversgehofen and Marbach, each village
// as far from the nearer base as its counterpart (tools/map_fairness.py). 1806 only (`epochs`).
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
const noise = createNoise2D(1610_1806);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Weimar road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Steiger', x: -330, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Melchendorf', x: 60, z: 280, owner: null, sector: 'centre' },
  { id: 'D', name: 'Dittelstedt', x: 350, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Petersberg', x: -270, z: 15, owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Fischmarkt', x: 40, z: -10, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Krämpfervorstadt', x: 340, z: 0, owner: null, sector: 'east' },
  { id: 'H', name: 'Marbach', x: -330, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Ilversgehofen', x: 40, z: -280, owner: null, sector: 'centre' },
  { id: 'J', name: 'Roter Berg', x: 340, z: -320, owner: null, sector: 'east' },
  { id: 'K', name: 'Langensalza road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));
const DOM = { x: -160, z: 0 }; // the Domberg: the Dom and St Severi side by side on the cathedral hill

// the Gera through the field and the city (north is −z); the Krämerbrücke in the town, the fords outside it
const river = createRiver({
  path: [[-70, -720], [-60, -470], [-95, -240], [-90, -60], [-85, 60], [-100, 240], [-70, 470], [-80, 720]],
  halfWidth: 10, level: 0, depth: 2.4, valley: 42,
  crossings: [
    { name: 'Krämerbrücke', x: -88, z: 0, kind: 'bridge', width: 8 },
    { name: 'Daberstedt ford', x: -98, z: 250, kind: 'ford', width: 10 },
    { name: 'Ilversgehofen ford', x: -94, z: -250, kind: 'ford', width: 10 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
/** Inside the city wall (an ellipse round the old town and the citadel hill). */
const CITY = { x: -90, z: 0, rx: 235, rz: 150 };
const cityQ = (x, z) => Math.hypot((x - CITY.x) / CITY.rx, (z - CITY.z) / CITY.rz);

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Steigerwald (French left), the wood on the Roter Berg’s flank (Prussian right), copses on both wings
const WOODS = [[-350, 380, 135, 80, 0.2], [380, -420, 110, 70, -0.3], [400, 160, 60, 35, 0.5], [-410, -150, 60, 35, -0.4]];
const woods = (x, z) => {
  let k = smoothstep(0.55, 0.7, fbm(noise, x * 0.006 + 23, z * 0.006 - 11, 3)) * 0.75;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(14, 30, Math.hypot(x - c.x, z - c.z)));
  return Math.min(k, smoothstep(1.05, 1.3, cityQ(x, z)));                          // (no wood in or under the walls)
};

function height(x, z) {
  let h = fbm(noise, x * 0.0024, z * 0.0024, 3) * 4 + fbm(noise, x * 0.02 + 5, z * 0.02, 3) * 0.5 + 3;
  h += smoothstep(380, 590, z) * 15 * (0.8 + 0.2 * Math.tanh((x + 60) / 240));     // the rise towards Weimar
  h += smoothstep(380, 600, -z) * 15 * (0.85 + 0.25 * Math.tanh((60 - x) / 220));  // the rise towards Langensalza
  h += hill(x, z, -330, 360, 120, 9);                                              // the Steiger heights, wooded
  h += hill(x, z, 350, -340, 95, 9);                                               // the Roter Berg
  h += hill(x, z, 230, 330, 90, 3);                                                // the swell by Dittelstedt
  h += hill(x, z, -230, -320, 90, 3);                                              // and by Marbach
  const pet = hill(x, z, P.E.x, P.E.z, 62, 13);                                    // the Petersberg: a steep flat-topped hill
  h += pet + hill(x, z, DOM.x, DOM.z, 38, 6) * (1 - pet / 13);                     // the Domberg below it
  const town = smoothstep(1.15, 0.85, cityQ(x, z)) * (1 - smoothstep(4, 9, pet + hill(x, z, DOM.x, DOM.z, 38, 6)));
  h += (4 - h) * town * 0.6;                                                       // the old town on its level terrace
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 28;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 26;
  for (const p of POINTS) if (!'EF'.includes(p.id)) h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'erfurt',
  armies: { nato: ['fr'], pact: ['pr'] }, // (Murat’s cavalry against the Prussian wreckage of Jena in the fortress)
  name: 'Erfurt',
  description: 'Erfurt, 16 October 1806: Murat’s cavalry comes up the Weimar road onto the walled city where the wreckage of the Prussian army has fled after Jena — the Gera through the town, the Krämerbrücke, the cathedral hill and the bastioned citadel on the Petersberg.',
  epochs: ['1806'],
  region: 'europe',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1610,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1610, cell: 80, weights: [0.34, 0.14, 0.36, 0.16] }), // October: ploughland and stubble

  theme: {
    // a grey mid-October afternoon
    fogColor: 0xa8aeb0,
    fogDensity: 0.0014,
    skyTop: 0x76828e,
    skyHorizon: 0xc0c2bc,
    skyBottom: 0x72746e,
    sunColor: 0xece0c6,
    sunIntensity: 1.6,
    sunDisk: 0.15,
    clouds: 0.75,
    cloudLight: 0xd2d4d0,
    cloudDark: 0x7e848a,
    sunDir: [-0.5, 0.42, 0.6],
    hemiSky: 0xc4ccd2,
    hemiGround: 0x4c4636,
    hemiIntensity: 1.25,
    rimColor: 0xbcc4cc,
    rimIntensity: 0.25,
    terrain: {
      grass: '#58623a',
      grassAlt: '#4c5634',
      dryGrass: '#887850',
      dirt: '#55463a',
      rock: '#7a7464',
      strip: '#4a3e30',
      pasture: '#56623a',
      ploughed: '#4c3d2e',
      stubble: '#8e7e4e',
      meadow: '#6a7240',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (cityQ(x, z) < 0.98) return [0x6a6050, 0.45];                       // the trodden streets and yards of the town
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
    const citadel = (x, z) => Math.abs(x - P.E.x) < 70 && Math.abs(z - P.E.z) < 70;
    // the streets kept open: the Marktstrasse from the east gate over the Krämerbrücke to the Domplatz, the north–south
    // street through the Fischmarkt, the Andreas and Brühl gates’ lane past the Domberg
    const street = (x, z) => Math.abs(z + 2) < 7 || Math.abs(x - P.F.x) < 7 || Math.abs(x + 205) < 6;
    /** A wall from (x0, z0) to (x1, z1). */
    const seg = (x0, z0, x1, z1, height, thickness) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height, thickness });
    const gate = (x, z) =>Math.abs(z + 2) < 12 || Math.abs(x - P.F.x) < 12 || Math.abs(x + 205) < 11;

    // ---- the city: houses inside the walls, the Domplatz and the Fischmarkt left open
    const rr = mulberry32(1610_1);
    const taken: number[][] = [];
    for (let i = 0; i < 260 && taken.length < 55; i++) {
      const x = CITY.x - CITY.rx + rr() * CITY.rx * 2, z = CITY.z - CITY.rz + rr() * CITY.rz * 2;
      if (cityQ(x, z) > 0.88 || street(x, z) || wet(x, z, 10) || citadel(x, z) || Math.hypot(x - DOM.x, z - DOM.z) < 42
        || Math.hypot(x - P.F.x, z - P.F.z) < 24 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.6 ? 2 : 3, damaged: 0 });
    }
    props.rand = mulberry32(1610_2);
    props.church({ x: DOM.x + 4, z: DOM.z - 24, yaw: Math.PI / 2 });              // (the Dom)
    props.church({ x: DOM.x + 4, z: DOM.z + 22, yaw: Math.PI / 2 });              // (St Severi)
    props.church({ x: P.F.x + 26, z: P.F.z + 26, yaw: 0 });                       // (the Kaufmannskirche)
    props.hall({ x: P.F.x - 24, z: P.F.z - 26, yaw: 0, width: 16, depth: 11, height: 8, color: 0x9a8a76, roof: 0x5a3a2a, door: 4, name: 'Rathaus' });

    // ---- the Petersberg citadel: four curtains with bastions at the corners, gates east (to the Domberg) and south
    const C0 = P.E, S = 52;
    for (const [dx, dz, yaw, length, gap] of [[0, -S, 0, 2 * S, 0], [0, S, 0, 2 * S, 1], [-S, 0, Math.PI / 2, 2 * S, 0], [S, 0, Math.PI / 2, 2 * S, 1]] as const) {
      const half = length / 2;
      if (!gap) { props.wall({ x: C0.x + dx, z: C0.z + dz, yaw, length, height: 3.4, thickness: 1.2 }); continue; }
      for (const s of [-1, 1]) {                                                    // (a gate in the middle of this curtain)
        const o = s * (half + 8) / 2;
        props.wall({ x: C0.x + dx + (yaw ? 0 : o), z: C0.z + dz + (yaw ? o : 0), yaw, length: half - 8, height: 3.4, thickness: 1.2 });
      }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {                           // the bastions: two faces meeting in a point
      const cx = C0.x + sx * S, cz = C0.z + sz * S, tx = cx + sx * 16, tz = cz + sz * 16;
      seg(cx, cz - sz * 16, tx, tz, 3.4, 1.2);
      seg(cx - sx * 16, cz, tx, tz, 3.4, 1.2);
    }
    props.hall({ x: C0.x - 22, z: C0.z - 26, yaw: 0, width: 24, depth: 12, height: 9, color: 0xa49276, roof: 0x4a3a2e, door: 4, name: 'Kommandantenhaus' });
    props.church({ x: C0.x + 26, z: C0.z - 28, yaw: 0 });                         // (the Peterskirche)

    // ---- the city wall round the old town, gates where the streets go out; the citadel closes the west side
    for (let k = 0; k < 64; k++) {
      const a0 = (k / 64) * Math.PI * 2, a1 = ((k + 1) / 64) * Math.PI * 2;
      const x0 = CITY.x + Math.cos(a0) * CITY.rx, z0 = CITY.z + Math.sin(a0) * CITY.rz, x1 = CITY.x + Math.cos(a1) * CITY.rx, z1 = CITY.z + Math.sin(a1) * CITY.rz;
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (gate(mx, mz) || wet(mx, mz, 8) || Math.hypot(mx - C0.x, mz - C0.z) < S + 40) continue;
      seg(x0, z0, x1, z1, 3, 0.9);
    }

    // ---- the villages and the suburb; the wreckage of Jena along the roads into the town
    for (const p of POINTS) if (!p.owner && !'EF'.includes(p.id)) buildVillage(props, p, 16106 + Math.round(p.x * 3 + p.z * 7));
    buildVillage(props, { x: P.G.x + 30, z: P.G.z + 26 }, 1610_6);
    buildVillage(props, { x: P.G.x + 28, z: P.G.z - 30 }, 1610_7);
    props.rand = mulberry32(1610_3);
    for (const [x, z] of [[20, 180], [-10, 140], [60, 120], [190, 10], [230, -14], [20, -160], [-20, -200]] as const) {
      props.crates({ x, z, yaw: x * 0.1 });                                       // (abandoned baggage, broken limbers)
      props.logPile({ x: x + 6, z: z - 4, yaw: z * 0.1, length: 5 });
    }
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'fieldwall', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 76 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 50) || woods(x, z) > 0.3 || wet(x, z, 30) || cityQ(x, z) < 1.3) continue;
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
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 26 })), { test: (x, z) => wet(x, z, 1.5) || cityQ(x, z) < 1.08 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 3200, forest: (x, z) => (wet(x, z, 10) ? 0.4 : woods(x, z) * 0.9) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 2600, lane: 0 });
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
