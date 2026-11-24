// Breslau, December 1806 – January 1807: after Jena Napoleon sent Jérôme with Vandamme’s IX Corps — the Bavarian
// divisions of Deroy and Minucci and the Württembergers under Seckendorff — into Silesia to take its fortresses. They
// opened the trenches before Breslau on 10 December, in frost and snow, and shelled the city from the south and west;
// the Prince of Anhalt-Pless gathered what Prussians were left in Silesia and tried to break through to it, and was
// beaten off at Strehlen. On 5 January 1807 General von Thile surrendered the city and its 6,000 men.
// On the map (the big field, 1.0 × 1.12 km): the Bavarians and the French come from the siege camp on the Schweidnitz
// road (south, +z), the Prussians of the relief from the Trebnitz side (north, −z). The Oder runs down the east flank;
// its arms split off it round two islands by the town: the Sandinsel with the Sandkirche next to the city, and beyond
// it the Dominsel with the twin-towered cathedral — the Sandbrücke onto the one, the Dombrücke from the one to the
// other, fords over the side arm at the islands’ ends. The bastioned city in the middle, the Stadtgraben round it
// frozen, the Ring with the Rathaus; the Nikolai suburb outside the west gate. The Württemberg and Bavarian siege
// parallels before the French, the garrison’s covered way and the relief’s entrenchments before the Prussians.
// Not mirrored but fair: the Oder runs down the flank, not between the sides, and the island fords lie as far from
// either base; the city and the islands — the decisive ground — stand in the middle, owned by neither. The siege
// parallels and batteries are traded for the covered way and its redoubts, Gräbschen for Pöpelwitz, Kleinburg for
// Rosenthal, Huben for Carlowitz, the copse by Gräbschen for the Oswitz wood, the floodplain wood upstream for the
// one downstream, each as far from the nearer base as its counterpart (tools/map_fairness.py). No `climate`, as Eylau:
// the winter tint would whiten the coats. 1806 only (`epochs`).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const noise = createNoise2D(1012_1806);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Schweidnitz road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Gräbschen', x: -350, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Kleinburg', x: -30, z: 290, owner: null, sector: 'centre' },
  { id: 'D', name: 'Huben', x: 250, z: 320, owner: null, sector: 'east' },
  { id: 'E', name: 'Nikolaivorstadt', x: -340, z: 0, owner: null, sector: 'west' },
  { id: 'F', name: 'Ring', x: -30, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Dominsel', x: 398, z: 0, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Pöpelwitz', x: -350, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Rosenthal', x: 30, z: -290, owner: null, sector: 'centre' },
  { id: 'J', name: 'Carlowitz', x: 250, z: -320, owner: null, sector: 'east' },
  { id: 'K', name: 'Trebnitz road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Oder down the east flank (it flows north, −z); a side arm round the islands, a cut between the Sandinsel and the Dominsel
const ODER = [[455, 720], [450, 400], [456, 200], [454, 0], [456, -200], [450, -400], [455, -720]];
const ARM = [[454, 222], [330, 178], [250, 100], [232, 0], [250, -100], [330, -178], [454, -222]];
const CUT = [[358, 190], [336, 90], [330, 0], [336, -90], [358, -190]];
const river = createRiver({
  paths: [ODER, ARM, CUT],
  halfWidth: 11, level: 0, depth: 2.6, valley: 36,
  crossings: [
    { name: 'Sandbrücke', x: 232, z: 0, kind: 'bridge', width: 8, channel: 1 },
    { name: 'Dombrücke', x: 330, z: 0, kind: 'bridge', width: 8, channel: 2 },
    { name: 'Sandinsel ford (south)', x: 272, z: 132, kind: 'ford', width: 10, channel: 1 },
    { name: 'Sandinsel ford (north)', x: 272, z: -132, kind: 'ford', width: 10, channel: 1 },
    { name: 'Dominsel ford (south)', x: 408, z: 205, kind: 'ford', width: 10, channel: 1 },
    { name: 'Dominsel ford (north)', x: 408, z: -205, kind: 'ford', width: 10, channel: 1 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
/** On one of the two islands. */
const onIsland = (x, z) => Math.abs(z) < 210 && x > 240 && x < 445 && !wet(x, z, 5) && x > 232 + (Math.abs(z) / 178) ** 2 * 90;
/** Inside the city’s bastioned ring. */
const CITY = { x: -20, z: 0, rx: 190, rz: 150 };
const cityQ = (x, z) => Math.hypot((x - CITY.x) / CITY.rx, (z - CITY.z) / CITY.rz);

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the copse by Gräbschen, the Oswitz wood, the Oder’s floodplain woods up- and downstream
const WOODS = [[-430, 160, 60, 42, 0.3], [-430, -160, 62, 42, -0.3], [390, 345, 55, 42, 0], [390, -345, 55, 42, 0]];
const woods = (x, z) => {
  let k = smoothstep(0.62, 0.76, fbm(noise, x * 0.006 + 31, z * 0.006 - 7, 3)) * 0.7; // (the Silesian plain: open fields)
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(14, 30, Math.hypot(x - c.x, z - c.z)));
  return Math.min(k, smoothstep(1.15, 1.4, cityQ(x, z)));                            // (no wood on the glacis)
};

function height(x, z) {
  let h = fbm(noise, x * 0.0022, z * 0.0022, 3) * 2.5 + fbm(noise, x * 0.02 + 3, z * 0.02, 3) * 0.35 + 3;
  h += smoothstep(360, 600, z) * 11 * (0.8 + 0.2 * Math.tanh((-x - 40) / 240));     // the plain rising towards Schweidnitz
  h += smoothstep(360, 600, -z) * 11 * (0.8 + 0.2 * Math.tanh((-x - 40) / 240));    // and to the Trebnitz hills
  h += smoothstep(120, -300, x) * 2.5;                                              // (the ground rising gently west of the Oder)
  h += hill(x, z, -180, 320, 80, 3.5) + hill(x, z, -180, -320, 80, 3.5);            // the battery swell, and the one before the covered way
  const ring = Math.exp(-(((cityQ(x, z) - 1.13) / 0.07) ** 2));                     // the glacis round the works
  h += ring * 1.6 * smoothstep(200, 160, x);                                         // (none on the river front)
  h += (4.2 - h) * smoothstep(1.05, 0.9, cityQ(x, z)) * 0.6;                        // the town on its level ground
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, -x) * 22;
  h += smoothstep(BOUNDS.x + 20, BOUNDS.x + 160, x) * 8;                            // (the low right bank)
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 22;
  for (const p of POINTS) if (p.id !== 'F') h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1. Kompanie' }];

export default {
  id: 'breslau',
  armies: { nato: ['by', 'fr'], pact: ['pr'] }, // (Vandamme’s Bavarians and Württembergers under Jérôme against Thile’s garrison and Pless’s relief)
  name: 'Breslau',
  description: 'The siege of Breslau, December 1806 – January 1807: Bavarian and Württemberg siege lines in the snow before the bastioned Silesian capital — the Ring and the Rathaus, the frozen Stadtgraben, the Oder with the Sandinsel and the cathedral on the Dominsel.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1012,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1012, cell: 82, weights: [0.3, 0.2, 0.3, 0.2] }),

  theme: {
    // hard frost under a low grey sky, the snow lying on the plain, the far side dim
    fogColor: 0xc8ccd0,
    fogDensity: 0.002,
    skyTop: 0x8c96a2,
    skyHorizon: 0xd0d4d6,
    skyBottom: 0x9ca0a4,
    sunColor: 0xe6eaf0,
    sunIntensity: 1.2,
    sunDisk: 0.05,
    clouds: 0.9,
    cloudLight: 0xd4d8dc,
    cloudDark: 0x868c94,
    sunDir: [0.35, 0.4, 0.75],
    hemiSky: 0xd2d8de,
    hemiGround: 0x969a9e,
    hemiIntensity: 1.45,
    rimColor: 0xc8d0d8,
    rimIntensity: 0.2,
    terrain: {
      grass: '#eceef0',
      grassAlt: '#e0e4e6',
      dryGrass: '#d6d4ce',
      dirt: '#9c968c',
      rock: '#b8bab8',
      strip: '#a8a49c',
      pasture: '#e8ecec',
      ploughed: '#d0cec6',
      stubble: '#dcd8d0',
      meadow: '#f0f2f3',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-340, 0, 250],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const q = cityQ(x, z);
        if (q > 1.0 && q < 1.07 && x < 190) return [0xd8e2ea, 0.8];                      // the Stadtgraben, frozen over
        if (q < 0.98 || Math.hypot(x - P.G.x, z - P.G.z) < 36) return [0xb0aca4, 0.45];   // trodden streets and the cathedral close
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-340, 0, 250] }, pact: { x: 0, z: -BASE_Z, entries: [-340, 0, 250] } },
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
    // the streets kept open: the Schweidnitzer Straße north–south, the street from the Nikolaitor to the Sandbrücke
    const street = (x, z) => Math.abs(x - P.F.x - 12) < 7 || Math.abs(z - 2) < 7;
    const gate = (x, z) => Math.abs(x - P.F.x - 12) < 12 || Math.abs(z - 2) < 12;

    // ---- the city: houses inside the ring, the Ring open round the Rathaus
    const rr = mulberry32(1012_1);
    const taken: number[][] = [];
    for (let i = 0; i < 260 && taken.length < 52; i++) {
      const x = CITY.x - CITY.rx + rr() * CITY.rx * 2, z = CITY.z - CITY.rz + rr() * CITY.rz * 2;
      if (cityQ(x, z) > 0.88 || street(x, z) || wet(x, z, 12) || Math.hypot(x - P.F.x, z - P.F.z) < 36 || Math.hypot(x - P.F.x - 60, z - P.F.z - 50) < 24 || Math.hypot(x - P.F.x + 50, z - P.F.z + 44) < 24 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.5 ? 2 : 3, damaged: rr() < 0.15 ? 1 : 0 });
    }
    props.rand = mulberry32(1012_2);
    props.hall({ x: P.F.x - 6, z: P.F.z + 22, yaw: 0, width: 22, depth: 11, height: 8, color: 0xa89478, roof: 0x5a4436, door: 4, name: 'Rathaus' });
    { const g = terrain.heightAt(P.F.x + 3, P.F.z + 22); props.box('stone', P.F.x + 3, g + 12, P.F.z + 22, 4.5, 24, 4.5, 0, 0x9a8a70); cover.addBox({ x: P.F.x + 3, z: P.F.z + 22, yaw: 0, length: 4.5, thickness: 4.5, height: 20 }); } // (its tower)
    props.church({ x: P.F.x - 50, z: P.F.z - 44, yaw: 0 });                        // (St Elisabeth)
    props.church({ x: P.F.x + 60, z: P.F.z + 50, yaw: Math.PI / 2 });              // (St Maria Magdalena)

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

    // ---- the islands: the Sandkirche on the Sandinsel, the cathedral and the bishop’s houses on the Dominsel
    props.church({ x: 290, z: -30, yaw: Math.PI / 2 });                            // (the Sandkirche)
    props.church({ x: P.G.x + 8, z: P.G.z - 34, yaw: Math.PI / 2 });              // (the cathedral)
    { const g = terrain.heightAt(P.G.x - 14, P.G.z - 40); props.box('stone', P.G.x - 14, g + 9, P.G.z - 40, 5, 18, 5, 0, 0x9a9080); } // (its second tower)
    props.church({ x: P.G.x - 4, z: P.G.z + 38, yaw: 0 });                        // (Holy Cross)
    buildVillage(props, { x: 290, z: 50 }, 1012_7);
    buildVillage(props, { x: 285, z: -95 }, 1012_8);

    // ---- the siege: the Württemberg and Bavarian parallels before the French, the covered way and the relief’s works before the Prussians
    for (const sz of [1, -1]) for (const [x0, x1] of [[-410, -250], [-210, -80], [50, 160]] as const) {
      const z = sz * 188 + (x0 + x1) * 0.02;
      props.wall({ x: (x0 + x1) / 2, z, yaw: 0, length: x1 - x0, height: 1.3, thickness: 1.4 });
    }
    for (const [x, z] of [[-150, 205], [110, 210], [-330, 200], [-150, -205], [110, -210], [-330, -200]] as const) props.sandbagRing({ x, z, radius: 6, toward: -Math.sign(z) }); // (the batteries and redoubts)

    // ---- the villages, farms in the snow
    for (const p of POINTS) if (!p.owner && !'FG'.includes(p.id)) buildVillage(props, p, 10126 + Math.round(p.x * 3 + p.z * 7));
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'fieldwall', 'farm'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 64 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 60) || woods(x, z) > 0.3 || wet(x, z, 30) || onIsland(x, z)
        || cityQ(x, z) < 1.35 || Math.abs(Math.abs(z) - 195) < 22) continue;
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
      { test: (x, z) => wet(x, z, 1.5) || cityQ(x, z) < 1.2 || Math.hypot(x - P.G.x, z - P.G.z) < 56 || Math.hypot(x - 290, z) < 70 || Math.abs(Math.abs(z) - 192) < 8 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2600, broadleaf: 0.15, autumn: 1, forest: (x, z) => (wet(x, z, 10) || onIsland(x, z) ? 0.3 : woods(x, z) * 0.9) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.7, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
