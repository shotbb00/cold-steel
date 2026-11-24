// Posen, November 1806 — a battle that was not fought. After Jena Davout’s III Corps marched east into Great Poland;
// Dąbrowski and Wybicki called the Poles to rise, and the insurgents and the French entered Posen in the first days of
// November to a city hung with flags. Here a Prussian column with a Russian vanguard, come down from the Netze, turns to
// take the city back before the Russians’ winter quarters on the Vistula. Late autumn: low cloud, rain, the leaves down.
// On the map (the big field, 1.0 × 1.12 km): the French and the Polish insurgents come up the Głogów road (south, +z),
// the Prussians and the Russians down the Gniezno road (north, −z). The Warta runs north down the east of the middle
// of the field through its marshy meadows: west of it the walled old town round the Stary Rynek and the Ratusz with its
// tower, the castle of Przemysł on its hill at the town’s west wall; the old arm of the river cuts off Chwaliszewo, and
// across the Warta the cathedral’s twin towers stand on Ostrów Tumski, the island the two mouths of the Cybina make.
// The Great Bridge from Chwaliszewo onto Ostrów, the Chwaliszewo bridge from the town, a bridge over each Cybina mouth
// to the east bank (Śródka and Berdychowo); fords on the Warta at Wilda and at Winiary, on the old arm and up the Cybina.
// Not mirrored but fair: the Warta runs down the field, not between the sides, and every crossing has its twin as far
// from the other base — the Wilda and the Winiary fords, the old arm’s fords, the two Cybina bridges. The castle hill,
// the market and the cathedral island — the decisive ground — lie on the line between the bases, owned by neither.
// The Św. Marcin rise is traded for the Winiary hill, Wilda for Jeżyce, Starołęka for Główna, the Dębina wood for the
// Naramowice wood, each as far from the nearer base as its counterpart (tools/map_fairness.py). 1806 only (`epochs`).
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
const noise = createNoise2D(611_1806);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Głogów road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Wilda', x: -340, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Święty Marcin', x: -90, z: 285, owner: null, sector: 'centre' },
  { id: 'D', name: 'Starołęka', x: 340, z: 320, owner: null, sector: 'east' },
  { id: 'E', name: 'Góra Przemysła', x: -300, z: 0, owner: null, sector: 'west' },
  { id: 'F', name: 'Stary Rynek', x: -130, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Ostrów Tumski', x: 255, z: 0, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Jeżyce', x: -330, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Winiary', x: -60, z: -280, owner: null, sector: 'centre' },
  { id: 'J', name: 'Główna', x: 320, z: -310, owner: null, sector: 'east' },
  { id: 'K', name: 'Gniezno road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Warta (flowing north, −z); its old arm round Chwaliszewo; the Cybina in from the east, its two mouths round Ostrów Tumski
const WARTA = [[150, 720], [146, 360], [168, 170], [176, 0], [168, -170], [146, -360], [150, -720]];
const OLDARM = [[164, 196, 8], [104, 124, 9], [88, 0, 9], [104, -124, 9], [164, -196, 8]];
const CYBINA = [[720, 14, 10], [500, 4, 10], [340, 0, 10]];
const MOUTH_N = [[340, 0, 10], [312, -78, 10], [240, -116, 10], [178, -126, 11]];
const MOUTH_S = MOUTH_N.map(([x, z, w]) => [x, -z, w]);
const river = createRiver({
  paths: [WARTA, OLDARM, CYBINA, MOUTH_N, MOUTH_S],
  halfWidth: 18, level: 0, depth: 2.6, valley: 40,
  crossings: [
    { name: 'Great Bridge', x: 176, z: 0, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Chwaliszewo bridge', x: 88, z: 0, kind: 'bridge', width: 7, channel: 1 },
    { name: 'Śródka bridge', x: 290, z: -96, kind: 'bridge', width: 7, channel: 3 },
    { name: 'Berdychowo bridge', x: 290, z: 96, kind: 'bridge', width: 7, channel: 4 },
    { name: 'Wilda ford', x: 156, z: 250, kind: 'ford', width: 14, channel: 0 },
    { name: 'Winiary ford', x: 156, z: -250, kind: 'ford', width: 14, channel: 0 },
    { name: 'Old arm ford (south)', x: 96, z: 90, kind: 'ford', width: 12, channel: 1 },
    { name: 'Old arm ford (north)', x: 96, z: -90, kind: 'ford', width: 12, channel: 1 },
    { name: 'Cybina ford', x: 440, z: 4, kind: 'ford', width: 12, channel: 2 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
/** Inside the old town’s wall; the castle hill at its west end. */
const TOWN = { x: -170, z: 0, rx: 150, rz: 130 };
const townQ = (x, z) => Math.hypot((x - TOWN.x) / TOWN.rx, (z - TOWN.z) / TOWN.rz);
const CASTLE = { x: -300, z: -50 };
const onChwal = (x, z) => x > 112 && x < 152 && Math.abs(z) < 150;
const onOstrow = (x, z) => x > 196 && x < 318 && Math.abs(z) < 100 - Math.max(0, x - 280);

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Dębina wood by the river south, the Naramowice wood north; willow brakes in the meadows; the Sołacz copse, the Łazarz copse
const WOODS = [[300, 430, 70, 45, 0.2], [300, -440, 70, 45, -0.2], [-440, -150, 55, 42, 0.3], [-440, 160, 55, 42, -0.3], [440, -180, 50, 40, 0], [440, 190, 50, 40, 0]];
const woods = (x, z) => {
  let k = smoothstep(0.62, 0.76, fbm(noise, x * 0.006 + 9, z * 0.006 - 13, 3)) * 0.7;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(18, 36, Math.hypot(x - c.x, z - c.z)));
  return Math.min(k, smoothstep(1.15, 1.4, townQ(x, z)));
};

function height(x, z) {
  let h = fbm(noise, x * 0.0024, z * 0.0024, 3) * 2.6 + fbm(noise, x * 0.02 - 4, z * 0.02, 3) * 0.35 + 3;
  h += smoothstep(80, -260, x) * 3.5;                                                  // the west bank’s terrace over the valley
  h += smoothstep(260, 480, x) * 3;                                                    // (and the east bank’s, lower)
  h += hill(x, z, CASTLE.x, CASTLE.z, 55, 6);                                          // the castle hill of Przemysł
  h += hill(x, z, P.I.x - 30, P.I.z - 20, 90, 5) + hill(x, z, P.C.x - 40, P.C.z + 25, 90, 5); // the Winiary hill; the Św. Marcin rise
  h += (h * 0.3 + 4.8 - h) * smoothstep(1.05, 0.85, townQ(x, z)) * 0.55 * (1 - smoothstep(70, 30, Math.hypot(x - CASTLE.x, z - CASTLE.z))); // the town’s level ground
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 18;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 22;
  for (const p of POINTS) if (!'EFG'.includes(p.id)) h += (h * 0.5 + 2.5 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'posen-1806',
  armies: { nato: ['fr'], pact: ['pr', 'ru'] }, // (Davout and Dąbrowski’s insurgents against a Prussian column with a Russian vanguard)
  name: 'Posen 1806',
  description: 'Great Poland, November 1806 (a battle that was not fought): Davout’s corps and Dąbrowski’s insurgents hold Posen against a Prussian–Russian column — the walled old town and the Ratusz, the castle hill of Przemysł, the Warta’s marshy islands and the cathedral on Ostrów Tumski; late autumn rain.',
  epochs: ['1806'],
  region: 'east',
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 611,
  height,
  river,
  airfields: [],
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 611, cell: 78, weights: [0.2, 0.5, 0.2, 0.1] }), // November: the stubble ploughed in, winter rye sown

  theme: {
    // a wet November day in Great Poland: low cloud, a thin rain, the light flat and brown
    fogColor: 0xa8aaa6,
    fogDensity: 0.002,
    skyTop: 0x7c848c,
    skyHorizon: 0xb6b8b4,
    skyBottom: 0x86887e,
    sunColor: 0xe0dcd0,
    sunIntensity: 1.15,
    sunDisk: 0.05,
    clouds: 0.95,
    cloudLight: 0xbcbebc,
    cloudDark: 0x6e7478,
    sunDir: [0.4, 0.4, 0.65],
    hemiSky: 0xbec4c8,
    hemiGround: 0x5a5040,
    hemiIntensity: 1.4,
    rimColor: 0xbcc2c6,
    rimIntensity: 0.15,
    terrain: {
      grass: '#5e6240',
      grassAlt: '#565c3c',
      dryGrass: '#82785a',
      dirt: '#5a4a3a',
      rock: '#7a7a74',
      strip: '#4e4232',
      pasture: '#60663f',
      ploughed: '#4e4030',
      stubble: '#7e7452',
      meadow: '#5c6444',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-340, 0, 330],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (townQ(x, z) < 0.96 || onChwal(x, z) || onOstrow(x, z) && Math.hypot(x - P.G.x, z - P.G.z) < 60) return [0x6a5e50, 0.5]; // the churned streets
        const m = smoothstep(90, 40, Math.abs(x - 165)) * smoothstep(0.45, 0.6, fbm(noise, x * 0.014 + 30, z * 0.014, 2));
        return m > 0 ? [0x46402e, m * 0.65] : null;                                                  // the marshy meadows along the Warta
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-340, 0, 330] }, pact: { x: 0, z: -BASE_Z, entries: [-340, 0, 330] } },
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
    const seg = (x0, z0, x1, z1, height, thickness = 1.1) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height, thickness });
    // the streets kept open: Wrocławska–Wroniecka through the market north–south, Wodna out to the Chwaliszewo bridge, Wielka
    const street = (x, z) => Math.abs(x - P.F.x - 4) < 7 || Math.abs(z - 2) < 7 || Math.abs(x + 230) < 6;
    const gate = (x, z) => Math.abs(x - P.F.x - 4) < 14 || Math.abs(z - 2) < 14 || Math.abs(x + 230) < 12;
    const taken: number[][] = [[CASTLE.x, CASTLE.z]];

    // ---- the old town: houses inside the wall, the Rynek open round the Ratusz; Chwaliszewo’s houses on its island
    const rr = mulberry32(611_1);
    for (let i = 0; i < 1000 && taken.length < 90; i++) {
      const x = TOWN.x - TOWN.rx + rr() * TOWN.rx * 2, z = TOWN.z - TOWN.rz + rr() * TOWN.rz * 2;
      if (townQ(x, z) > 0.86 || street(x, z) || nearPoint(x, z, 34) || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 40 || Math.hypot(x + 215, z - 62) < 22 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 11.5)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.abs(x - P.F.x) < 50 ? Math.PI / 2 : 0, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.5 ? 2 : 3, damaged: 0 });
    }
    for (let i = 0; i < 200 && taken.length < 104; i++) {
      const x = 116 + rr() * 34, z = (rr() * 2 - 1) * 140;
      if (!onChwal(x, z) || wet(x, z, 6) || Math.abs(z) < 12 || Math.abs(Math.abs(z) - 90) < 14 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 11.5)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: 0, width: 7, depth: 7, storeys: 1, damaged: 0 });
    }
    props.rand = mulberry32(611_2);
    // the Ratusz in the middle of the Rynek, its tower; the Fara (the Jesuits’ church) to the south-west
    props.hall({ x: P.F.x + 4, z: P.F.z + 2, yaw: 0, width: 16, depth: 11, height: 9, color: 0xd0c4a4, roof: 0x5a4436, door: 3, name: 'Ratusz' });
    { const g = terrain.heightAt(P.F.x + 4, P.F.z + 2); props.box('stone', P.F.x + 4, g + 15, P.F.z + 2, 4.5, 12, 4.5, 0, 0xd8ccac); props.box('metal', P.F.x + 4, g + 23, P.F.z + 2, 3, 4, 3, Math.PI / 4, 0x4a6a5e); }
    props.church({ x: -215, z: 62, yaw: 0 });
    // the castle of Przemysł on its hill: the rebuilt range, the old tower
    {
      const g0 = terrain.heightAt(CASTLE.x, CASTLE.z);
      props.hall({ x: CASTLE.x, z: CASTLE.z, yaw: Math.PI / 2, width: 30, depth: 12, height: 9, color: 0xb8a88a, roof: 0x5a3a2e, door: 3, name: 'castle' });
      props.box('stone', CASTLE.x + 4, g0 + 10, CASTLE.z - 20, 7, 20, 7, 0, 0x9a6a4e);
      cover.addBox({ x: CASTLE.x + 4, z: CASTLE.z - 20, yaw: 0, length: 7, thickness: 7, height: 18 });
    }
    // ---- the town wall: curtains round the old town with towers, open at the gates and broken where it was let fall
    const N = 64, at = (a, k = 1) => [TOWN.x + Math.cos(a) * TOWN.rx * k, TOWN.z + Math.sin(a) * TOWN.rz * k];
    for (let i = 0; i < N; i++) {
      if (i % 4 === 1) continue;                                                        // (the breaches)
      const [x0, z0] = at((i / N) * Math.PI * 2), [x1, z1] = at(((i + 1) / N) * Math.PI * 2);
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (gate(mx, mz) || Math.hypot(mx - CASTLE.x, mz - CASTLE.z) < 36) continue;
      seg(x0, z0, x1, z1, 3);
      if (i % 4 === 3) { const g = terrain.heightAt(x1, z1); props.box('stone', x1, g + 3, z1, 4, 6, 4, 0, 0x9a6a4e); }
    }

    // ---- Ostrów Tumski: the cathedral and its twin towers, the church of St Mary, the canons’ houses
    props.church({ x: P.G.x + 10, z: P.G.z - 34, yaw: Math.PI / 2 });
    { const g = terrain.heightAt(P.G.x - 4, P.G.z - 34); for (const s of [-1, 1]) { const tz = P.G.z - 34 + s * 7; props.box('stone', P.G.x - 4, g + 10, tz, 5.5, 20, 5.5, 0, 0xb0a48a); props.box('metal', P.G.x - 4, g + 21.5, tz, 4.4, 3, 4.4, Math.PI / 4, 0x4a6a5e); props.box('metal', P.G.x - 4, g + 24.5, tz, 2.4, 3, 2.4, Math.PI / 4, 0x4a6a5e); props.box('metal', P.G.x - 4, g + 27.5, tz, 0.8, 3, 0.8, 0, 0x4a6a5e); } }
    props.church({ x: P.G.x - 2, z: P.G.z + 38, yaw: 0 });
    for (const [x, z] of [[220, 60], [292, 30], [292, -40], [222, -66]] as const) props.house({ x, z, yaw: Math.PI / 2, width: 9, depth: 7 });
    // Śródka and Berdychowo beyond the Cybina mouths
    buildVillage(props, { x: 395, z: -80 }, 611_7);
    buildVillage(props, { x: 395, z: 85 }, 611_8);

    // ---- the windmills on the Winiary hill and the Św. Marcin rise; the villages; farms
    const MILLS = [[-130, -330], [-150, 330], [-430, 20], [420, -300]];
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
    for (const p of POINTS) if (!p.owner && !'EFG'.includes(p.id)) buildVillage(props, p, 6116 + Math.round(p.x * 3 + p.z * 7));
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'fieldwall', 'hay'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 70 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 56 * 56)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 60) || woods(x, z) > 0.3 || wet(x, z, 26) || onOstrow(x, z) || onChwal(x, z)
        || townQ(x, z) < 1.3 || MILLS.some(([mx, mz]) => Math.hypot(x - mx, z - mz) < 30) || Math.hypot(x - 395, Math.abs(z) - 82) < 50) continue;
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

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 26 })), ...MILLS.map(([x, z]) => ({ x, z, r: 12 })),
      { test: (x, z) => wet(x, z, 1.5) || townQ(x, z) < 1.12 || onChwal(x, z) || Math.hypot(x - P.G.x, z - P.G.z) < 58 || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 30 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2800, broadleaf: 0.6, autumn: 1, forest: (x, z) => (wet(x, z, 12) ? 0.5 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1300, lane: 0 });
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
