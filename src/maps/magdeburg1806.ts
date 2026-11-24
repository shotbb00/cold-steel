// Magdeburg, October–November 1806: after Jena the great Elbe fortress, the strongest in Prussia, held 24,000 men under
// the old General von Kleist. Ney’s VI Corps came up on 25 October, drew its siege lines round the west bank — Diesdorf,
// Sudenburg, Buckau — and shelled the town; the garrison’s sorties came out against the lines, and on 11 November,
// without a breach made, Kleist surrendered the city, the citadel on the Elbe island and the Sternschanze with their
// 700 guns.
// On the map (the big field, 1.0 × 1.12 km): the French come from Ney’s camp on the Börde (south-west, +z), the
// Prussians from the Neustadt side and the Wolmirstedt road (north, −z). The Elbe runs down the east flank; the
// Stromelbe splits off it round the Werder island, and the citadel stands on the island, the Strombrücke over to it
// from the town. The walled and bastioned city in the middle, the Dom over the Domplatz and the Breiter Weg through it,
// the Sternschanze — the star fort — before its south front, the Neustadt with its entrenchments before its north
// front. Ney’s siege parallels before the French, the garrison’s covered lines before the Prussians. Fords over the
// Stromelbe onto the island at its two ends.
// Not mirrored but fair: the river runs down the flank, not between the sides, and its fords lie as far from either
// base; the city and the island citadel — the decisive ground — stand in the middle, owned by neither. The Sternschanze
// before the French centre is traded for the entrenched Neustadt before the Prussian centre, Ney’s parallels for the
// garrison’s lines, Diesdorf and Buckau for Olvenstedt and Rothensee, the Rotehorn wood at the island’s south end for
// the floodplain wood at its north end; each village is as far from the nearer base as its counterpart
// (tools/map_fairness.py). 1806 only (`epochs`); the id is `magdeburg-1806` (`magdeburg` is the 1985 map).
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
const noise = createNoise2D(1111_1806);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Halberstadt road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Diesdorf', x: -350, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Sternschanze', x: -20, z: 290, owner: null, sector: 'centre', radius: 24 },
  { id: 'D', name: 'Buckau', x: 270, z: 320, owner: null, sector: 'east' },
  { id: 'E', name: 'Bastion Cleve', x: -330, z: 10, owner: null, sector: 'west' },
  { id: 'F', name: 'Domplatz', x: 50, z: 10, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Citadel', x: 378, z: 0, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Olvenstedt', x: -350, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Neustadt', x: 20, z: -290, owner: null, sector: 'centre', radius: 24 },
  { id: 'J', name: 'Rothensee', x: 270, z: -320, owner: null, sector: 'east' },
  { id: 'K', name: 'Wolmirstedt road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Elbe down the east flank (it flows north, −z); the Stromelbe split off it round the Werder island by the town
const ELBE = [[452, 720], [446, 400], [452, 200], [450, 0], [452, -200], [446, -400], [452, -720]];
const ARM = [[450, 215], [380, 175], [322, 110], [305, 0], [322, -110], [380, -175], [450, -215]];
const river = createRiver({
  paths: [ELBE, ARM],
  halfWidth: 13, level: 0, depth: 2.8, valley: 40,
  crossings: [
    { name: 'Strombrücke', x: 305, z: 0, kind: 'bridge', width: 8, channel: 1 },
    { name: 'Zollbrücke', x: 450, z: 0, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Werder ford (south)', x: 360, z: 162, kind: 'ford', width: 10, channel: 1 },
    { name: 'Werder ford (north)', x: 360, z: -162, kind: 'ford', width: 10, channel: 1 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
const onIsland = (x, z) => Math.abs(z) < 190 && x > 330 && x < 432 && !wet(x, z, 6);
/** Inside the city’s bastioned ring. */
const CITY = { x: 60, z: 10, rx: 205, rz: 150 };
const cityQ = (x, z) => Math.hypot((x - CITY.x) / CITY.rx, (z - CITY.z) / CITY.rz);

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Rotehorn at the island’s south end, the floodplain wood at its north end, copses on the Börde’s two wings
const WOODS = [[395, 130, 40, 55, 0], [395, -130, 40, 55, 0], [-420, 150, 55, 40, 0.3], [-420, -160, 55, 40, -0.3]];
const woods = (x, z) => {
  let k = smoothstep(0.6, 0.74, fbm(noise, x * 0.006 + 13, z * 0.006 - 29, 3)) * 0.7; // (the Börde: open ploughland, few trees)
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(14, 30, Math.hypot(x - c.x, z - c.z)));
  k = Math.min(k, smoothstep(40, 60, Math.hypot(x - P.G.x, z - P.G.z)));            // (the citadel’s esplanade)
  return Math.min(k, smoothstep(1.1, 1.35, cityQ(x, z)));                            // (no wood on the glacis)
};

function height(x, z) {
  let h = fbm(noise, x * 0.0022, z * 0.0022, 3) * 3 + fbm(noise, x * 0.02 + 3, z * 0.02, 3) * 0.4 + 3;
  h += smoothstep(360, 600, z) * 12 * (0.8 + 0.2 * Math.tanh((-x - 60) / 240));     // the Börde rising behind Ney’s camp
  h += smoothstep(360, 600, -z) * 12 * (0.8 + 0.2 * Math.tanh((-x - 60) / 240));    // and towards Wolmirstedt
  h += smoothstep(150, -300, x) * 3;                                                // the plateau’s edge west of the town
  h += hill(x, z, -200, 330, 80, 3) + hill(x, z, -200, -330, 80, 3);                // (low swells either side)
  const ring = Math.exp(-(((cityQ(x, z) - 1.12) / 0.07) ** 2));                     // the glacis: a low bank round the works
  h += ring * 1.6 * smoothstep(280, 230, x);                                         // (none on the river front)
  h += (4.5 - h) * smoothstep(1.05, 0.9, cityQ(x, z)) * 0.6;                        // the town on its level ground
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, -x) * 26;
  h += smoothstep(BOUNDS.x + 20, BOUNDS.x + 160, x) * 8;                            // (the low east bank)
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 24;
  for (const p of POINTS) if (p.id !== 'F') h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'magdeburg-1806',
  armies: { nato: ['fr'], pact: ['pr'] }, // (Ney’s VI Corps against Kleist’s garrison)
  name: 'Magdeburg 1806',
  description: 'The siege of Magdeburg, October–November 1806: Ney’s lines on the west bank before the great Elbe fortress — the bastioned city round the Dom, the Sternschanze, the entrenched Neustadt and the citadel on the Werder island, the Strombrücke over to it.',
  epochs: ['1806'],
  region: 'europe',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1111,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1111, cell: 80, weights: [0.3, 0.12, 0.44, 0.14] }), // November: the Börde ploughed

  theme: {
    // a raw November day on the Elbe
    fogColor: 0xa4a8a8,
    fogDensity: 0.0016,
    skyTop: 0x6e7680,
    skyHorizon: 0xb6b8b4,
    skyBottom: 0x6c6e6a,
    sunColor: 0xe6dcc8,
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
      roads: [-300, 0, 260],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (cityQ(x, z) < 0.98 || Math.hypot(x - P.G.x, z - P.G.z) < 46) return [0x6a6050, 0.45]; // the streets and the parade
        if (onIsland(x, z)) return [0x5e7040, 0.4];                                                  // the Werder’s meadows
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 260] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 260] } },
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
    /** A square bastioned work: four curtains (a 14 m gate in each side named in `gates`: n −z, s +z, w −x, e +x), a bastion on each corner. */
    const fort = (cx, cz, S, gates: string, h = 3.2) => {
      for (const [side, x0, z0, x1, z1] of [['n', -S, -S, S, -S], ['s', -S, S, S, S], ['w', -S, -S, -S, S], ['e', S, -S, S, S]] as const) {
        if (!gates.includes(side)) { seg(cx + x0, cz + z0, cx + x1, cz + z1, h); continue; }
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, ux = Math.sign(x1 - x0) * 7, uz = Math.sign(z1 - z0) * 7;
        seg(cx + x0, cz + z0, cx + mx - ux, cz + mz - uz, h);
        seg(cx + mx + ux, cz + mz + uz, cx + x1, cz + z1, h);
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const x = cx + sx * S, z = cz + sz * S, tx = x + sx * 14, tz = z + sz * 14;
        seg(x, z - sz * 14, tx, tz, h);
        seg(x - sx * 14, z, tx, tz, h);
      }
    };
    // the streets kept open: the Breiter Weg north–south, the street from the west gate over the Strombrücke
    const street = (x, z) => Math.abs(x - P.F.x - 14) < 7 || Math.abs(z - 2) < 7;
    const gate = (x, z) => Math.abs(x - P.F.x - 14) < 12 || Math.abs(z - 2) < 12 || Math.abs(x + 80) < 11;

    // ---- the city: houses inside the ring, the Domplatz open
    const rr = mulberry32(1111_1);
    const taken: number[][] = [];
    for (let i = 0; i < 260 && taken.length < 56; i++) {
      const x = CITY.x - CITY.rx + rr() * CITY.rx * 2, z = CITY.z - CITY.rz + rr() * CITY.rz * 2;
      if (cityQ(x, z) > 0.88 || street(x, z) || wet(x, z, 12) || Math.hypot(x - P.F.x, z - P.F.z) < 34 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.5 ? 2 : 3, damaged: 0 });
    }
    props.rand = mulberry32(1111_2);
    props.church({ x: P.F.x - 26, z: P.F.z + 34, yaw: Math.PI / 2 });              // (the Dom)
    { const g = terrain.heightAt(P.F.x - 26, P.F.z + 54); props.box('stone', P.F.x - 26, g + 9, P.F.z + 54, 5, 18, 5, 0, 0x9a9080); } // (its second tower)
    props.church({ x: P.F.x - 30, z: P.F.z - 40, yaw: 0 });                        // (Unser Lieben Frauen)
    props.hall({ x: P.F.x + 44, z: P.F.z - 34, yaw: 0, width: 26, depth: 12, height: 8, color: 0x9a8a74, roof: 0x4a3a2e, door: 5, name: 'Zeughaus' });

    // ---- the ring: curtains round the town, a bastion every eighth of the way, gates where the streets go out
    const N = 72, at = (a, k = 1) => [CITY.x + Math.cos(a) * CITY.rx * k, CITY.z + Math.sin(a) * CITY.rz * k];
    for (let i = 0; i < N; i++) {
      const [x0, z0] = at((i / N) * Math.PI * 2), [x1, z1] = at(((i + 1) / N) * Math.PI * 2);
      if (gate((x0 + x1) / 2, (z0 + z1) / 2) || wet((x0 + x1) / 2, (z0 + z1) / 2, 6)) continue;
      seg(x0, z0, x1, z1, 3.2, 1);
    }
    for (let b = 0; b < 8; b++) {
      const a = (b / 8) * Math.PI * 2 + Math.PI / 8, [tx, tz] = at(a, 1.14), [lx, lz] = at(a - 0.11), [qx, qz] = at(a + 0.11);
      if (wet(tx, tz, 8) || gate(tx, tz)) continue;
      seg(lx, lz, tx, tz, 3.2);
      seg(qx, qz, tx, tz, 3.2);
    }

    // ---- the citadel on the Werder: gates to the bridge (west) and to the island’s ends
    fort(P.G.x, P.G.z, 30, 'wns');
    seg(P.E.x + 22, P.E.z - 34, P.E.x - 26, P.E.z, 2.8); seg(P.E.x - 26, P.E.z, P.E.x + 22, P.E.z + 34, 2.8); // (Bastion Cleve’s outwork: a lunette open to the town)
    props.hall({ x: P.G.x + 6, z: P.G.z - 16, yaw: 0, width: 28, depth: 10, height: 8, color: 0x9c8e78, roof: 0x4a3a2e, door: 4, name: 'casemate barracks' });

    // ---- the Sternschanze: a star of earth walls, open to the north and south; the Neustadt’s entrenchments
    const star = (cx, cz, R, r) => {
      const pts: number[][] = [];
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + Math.PI / 10, d = k % 2 ? r : R; pts.push([cx + Math.cos(a) * d, cz + Math.sin(a) * d]); }
      for (let k = 0; k < 10; k++) {
        const [x0, z0] = pts[k], [x1, z1] = pts[(k + 1) % 10];
        if (Math.abs((z0 + z1) / 2 - cz) > R * 0.6 && Math.abs((x0 + x1) / 2 - cx) < R * 0.35) continue; // (the gates)
        seg(x0, z0, x1, z1, 2.6);
      }
    };
    star(P.C.x, P.C.z, 46, 28);
    props.hall({ x: P.C.x + 14, z: P.C.z - 6, yaw: 0.3, width: 12, depth: 8, height: 4, color: 0x8a7c66, roof: 0x4a3a2e, door: 3, name: 'powder magazine' });
    for (const [dx, dz, yaw, length] of [[-46, -44, 0.35, 44], [46, -44, -0.35, 44], [-74, -6, Math.PI / 2, 40], [74, -6, Math.PI / 2, 40], [-46, 40, -0.35, 44], [46, 40, 0.35, 44]] as const) {
      props.wall({ x: P.I.x + dx, z: P.I.z + dz, yaw, length, height: 2.2, thickness: 1.2 });      // (the Neustadt’s ring of earthworks)
    }
    buildVillage(props, { x: P.I.x - 30, z: P.I.z + 6 }, 1111_8);
    buildVillage(props, { x: P.I.x + 32, z: P.I.z - 8 }, 1111_9);
    props.church({ x: P.I.x + 6, z: P.I.z + 26, yaw: 0 });                          // (St Nicolai in the Neustadt)

    // ---- Ney’s parallels before the French, the garrison’s covered lines before the Prussians: low earth banks with gaps
    for (const sz of [1, -1]) for (const [x0, x1] of [[-420, -250], [-220, -90], [70, 170]] as const) {
      const z = sz * 185 + (x0 + x1) * 0.02;
      props.wall({ x: (x0 + x1) / 2, z, yaw: 0, length: x1 - x0, height: 1.3, thickness: 1.4 });
    }
    for (const [x, z] of [[-150, 200], [120, 205], [-150, -200], [120, -205]] as const) props.sandbagRing({ x, z, radius: 6, toward: -Math.sign(z) }); // (the batteries)

    // ---- the villages, farms on the Börde
    for (const p of POINTS) if (!p.owner && !'CFGI'.includes(p.id)) buildVillage(props, p, 11116 + Math.round(p.x * 3 + p.z * 7));
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'fieldwall', 'farm'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 72 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 60) || woods(x, z) > 0.3 || wet(x, z, 30) || onIsland(x, z)
        || cityQ(x, z) < 1.35 || Math.abs(Math.abs(z) - 190) < 20) continue;
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
      { test: (x, z) => wet(x, z, 1.5) || cityQ(x, z) < 1.2 || Math.hypot(x - P.G.x, z - P.G.z) < 56 || Math.hypot(x - P.C.x, z - P.C.z) < 52 || Math.abs(Math.abs(z) - 190) < 8 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2400, forest: (x, z) => (wet(x, z, 10) || onIsland(x, z) ? 0.35 : woods(x, z) * 0.9) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x, z) => onIsland(x, z) }], count: 2000, lane: 0 });
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
