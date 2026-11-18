// El Guettar, 23 March 1943 (1945 only; the big field, 1.0 × 1.12 km): southern Tunisia. A broad, flat valley — the
// Gafsa–Gabès road along its floor, good tank country with sight lines over a kilometre — between two lines of rocky
// djebels. Their faces to the valley are steep rock that only men climb (`steep`); the vehicles go up by the passes
// and the gentle back slopes. The US 1st Infantry Division held the southern heights — Hill 336 ("Wop Hill") at the
// west end, the Keddab ridge with its pass in the middle, Djebel el Mcheltat far out east — and the 10th Panzer
// Division came down the valley into its minefield and under the guns and tank destroyers firing down from the hills.
// Across the valley the German side has its own djebels: Djebel Chemsi in the west, the Orbata pass a little east of
// the middle, a wadi gap to its west, and the long Djebel Berda with a lower shoulder in front of it in the east.
// Each side has its ridge (dug in on the crest, its mine belt out on the valley floor below), an oasis (El Guettar
// in the US west, Bou Hamran on the German east) and two ways up through its ridge. Not a mirror but fair: two
// peaks of about the same height each, the passes and oases as far from each base, the crests as far out.
// The US come from the south (+z).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost, trenchLine } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1943_03);

// (each ridge in its owner's frame: X, U = x, z for the US half, -x, -z for the German one; s = 1 | -1)
const frame = (x: number, z: number) => (z >= 0 ? [x, z, 1] : [-x, -z, -1]);
const RIDGES = {
  // the US heights: Hill 336 (X -250), the Keddab ridge, Djebel el Mcheltat (X 330); the Keddab pass at X 0, a wadi track at X 170
  1: {
    crest: (X: number) => 282 + Math.sin(X * 0.011) * 12 + fbm(noise, X * 0.006 + 40, 3.3, 2) * 10,
    high: (X: number) => 20 + 22 * Math.exp(-(((X + 250) / 75) ** 2)) + 16 * Math.exp(-(((X - 330) / 85) ** 2)) + 6 * Math.exp(-(((X - 60) / 70) ** 2)),
    passes: [[0, 52, 0.92], [170, 26, 0.85]],
    mines: 165,
    back: 175,
    trenches: [[-300, -200], [-120, -40], [40, 130], [280, 380]],
    posts: [-290, -250, -205, -90, 80, 300, 345],
    guns: [-260, 300, 60],
  },
  // the German heights (X = -x): Djebel Chemsi (X 275, the west), Djebel Berda (X -300, the east) with a shoulder at X -150;
  // the Orbata pass at X -70 (x 70), a wadi gap at X 130 (x -130)
  [-1]: {
    crest: (X: number) => 268 + Math.sin(X * 0.007 + 1.1) * 22 + fbm(noise, X * 0.006 - 60, 7.7, 2) * 10,
    high: (X: number) => 18 + 21 * Math.exp(-(((X - 275) / 90) ** 2)) + 20 * Math.exp(-(((X + 300) / 70) ** 2)) + 16 * Math.exp(-(((X + 150) / 70) ** 2)),
    passes: [[-70, 48, 0.92], [130, 30, 0.85]],
    mines: 150,
    back: 130,
    trenches: [[-350, -250], [-200, -110], [-20, 90], [190, 320]],
    posts: [-330, -290, -150, -10, 60, 240, 300],
    guns: [270, -290, -150],
  },
};
/** The crest line of side s's ridge (U at X). */
const crestU = (s: number, X: number) => RIDGES[s].crest(X);
/** The Gafsa–Gabès road along the valley floor. */
export const roadZ = (x: number) => 14 * Math.sin(x * 0.006) + 8 * Math.cos(x * 0.0045 + 0.6) - 6;
/** The passes through side s's ridge (0 in a pass). */
const pass = (s: number, X: number) => RIDGES[s].passes.reduce((k, [px, w, d]) => k * (1 - d * Math.exp(-(((X - px) / w) ** 2))), 1);
/** Each base's track down through its main pass to the road. */
const trackX = (z: number) => (z >= 0 ? 0 : 70 * smoothstep(-470, -330, z));
const onTrack = (x: number, z: number, w = 4.5) => Math.abs(x - trackX(z)) < w && Math.abs(z) < 540 && Math.abs(z) > Math.abs(roadZ(x)) - 2;
/** The wadis: one winding along each side of the valley, the Wadi Keddab across it east of the middle. */
const wadi = (x: number, z: number) => {
  const [X, U, s] = frame(x, z);
  const line = s > 0 ? 118 + Math.sin(X * 0.013) * 24 : 132 + Math.sin(X * 0.01 + 2) * 30;
  const along = smoothstep(16, 3, Math.abs(U - line)) * smoothstep(440, 380, Math.abs(X));
  const across = smoothstep(14, 3, Math.abs(x - 40 - 30 * Math.sin(z * 0.009 + 0.8))) * smoothstep(215, 150, Math.abs(z));
  return Math.max(along, across);
};
const OASES = [{ x: -340, z: 60, r: 62, name: 'El Guettar' }, { x: 290, z: -95, r: 54, name: 'Bou Hamran' }];
const onRoad = (x: number, z: number, w = 5) => Math.abs(z - roadZ(x)) < w && Math.abs(x) < 480;
const inOasis = (x: number, z: number, pad = 0) => OASES.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + pad);

function height(x: number, z: number) {
  const [X, U, s] = frame(x, z);
  let h = 2 + fbm(noise, x * 0.005, z * 0.005, 3) * 2.2 + fbm(noise, x * 0.04, z * 0.04, 2) * 0.4; // the valley floor: flat gravel, a slight swell
  // the ridge: a steep rock face to the valley, a long gentle slope back, broken crest, the passes cut through it
  const c = crestU(s, X);
  const face = smoothstep(c - 66, c - 6, U);
  const back = 1 - 0.8 * smoothstep(c + 12, c + RIDGES[s].back, U); // (the German back slopes shorter)
  const rough = 1 + ridged(noise, x * 0.03 + 7, z * 0.03, 3) * 0.12 * face;
  h += RIDGES[s].high(X) * pass(s, X) * Math.min(face, back) * rough;
  h -= 2.4 * wadi(x, z);
  h += smoothstep(430, 560, Math.abs(x)) * 34 + smoothstep(560, 680, Math.abs(z)) * 12; // the djebels beyond the edges
  h += 0.6 * smoothstep(6, 2, Math.abs(z - roadZ(x))) * smoothstep(480, 440, Math.abs(x));   // the road on its low embankment
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  for (const o of OASES) h += (2.2 - h) * smoothstep(o.r, o.r - 20, Math.hypot(x - o.x, z - o.z)); // the oasis: level
  return h;
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

/** A point on side s's crest at X (U: in front of it by `fwd` m), in world coordinates. */
const hill = (s: number, X: number, fwd = 0) => ({ x: X * s, z: (crestU(s, X) - fwd) * s });
const points: ControlPointDef[] = [
  { id: 'A', name: 'Gafsa track', x: -30, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Hill 336', ...hill(1, -250), owner: null, sector: 'west' },
  { id: 'C', name: 'Keddab pass', ...hill(1, 0, 20), owner: null, sector: 'centre' },
  { id: 'D', name: 'Djebel el Mcheltat', ...hill(1, 330), owner: null, sector: 'east' },
  { id: 'E', name: 'El Guettar', x: OASES[0].x, z: OASES[0].z, owner: null, sector: 'west' },
  { id: 'F', name: 'Gafsa–Gabès road', x: 25, z: roadZ(25), owner: null, sector: 'centre' },
  { id: 'G', name: 'Bou Hamran', x: OASES[1].x, z: OASES[1].z, owner: null, sector: 'east' },
  { id: 'H', name: 'Djebel Chemsi', ...hill(-1, 275), owner: null, sector: 'west' },
  { id: 'I', name: 'Orbata pass', ...hill(-1, -70, 20), owner: null, sector: 'centre' },
  { id: 'J', name: 'Djebel Berda', ...hill(-1, -300), owner: null, sector: 'east' },
  { id: 'K', name: 'Gabès track', x: -30, z: -470, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'el-guettar',
  name: 'El Guettar',
  description: '23 March 1943, southern Tunisia: a wide open valley between rocky djebels. Hold your ridge, its passes and the oasis; the panzers come across the valley floor into the minefields under the guns on the heights.',
  epochs: ['1945'],
  region: 'africa', // (the menu's North Africa: maps/index.js REGIONS)
  climate: 'desert', // sand paint and khaki drill (render/paint.js CLIMATE)
  sides: { nato: 'United States', pact: 'Germany' },
  armies: { nato: ['us'], pact: ['wh'] },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  steep: 0.5, // (vehicles: the djebels' faces are for men only — the passes and the back slopes for the rest)
  seed: 1943,
  height,
  fields: createFields({ seed: 1943, cell: 80 }),

  theme: {
    // a clear, cool March morning in the Tunisian steppe: pale sky, grey-ochre rock, long shadows off the djebels
    fogColor: 0xd2cbbc,
    fogDensity: 0.0006,
    skyTop: 0x6f98c4,
    skyHorizon: 0xdcd8cc,
    skyBottom: 0xb0a690,
    sunColor: 0xfff2dc,
    sunIntensity: 2.2,
    sunDisk: 0.8,
    clouds: 0.25,
    cloudLight: 0xf2f0ea,
    cloudDark: 0xbcb8ae,
    sunDir: [0.55, 0.62, 0.35],
    hemiSky: 0xd4dbe2,
    hemiGround: 0x988a70,
    hemiIntensity: 1.15,
    rimColor: 0xe8e0cc,
    rimIntensity: 0.3,
    terrain: {
      grass: '#c9b691',
      grassAlt: '#bcab88',
      dryGrass: '#d6c6a0',
      dirt: '#a48e6c',
      rock: '#7e796e',
      pasture: '#c4b18a',
      ploughed: '#b8a27c',
      stubble: '#d0bf98',
      meadow: '#c2b08a',
      farmX: [0, 1], // no farmland
      farmZ: [0, 1],
      roads: [],      // (each base's track down through its pass is painted below)
      roadZ: 540,
      surface(x: number, z: number) {
        if (onRoad(x, z, 4.5) || onTrack(x, z)) return [0x8c8070, 0.85];               // the road and the tracks: graded gravel
        if (inOasis(x, z, -6)) return [0x9a8c62, 0.55];                               // the oasis: watered, darker
        const w = wadi(x, z);
        if (w > 0.3) return [0xb4a890, w * 0.7];                                      // the wadis: pale stones
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.25 ? [0xa8987a, Math.min(0.4, (scrub - 0.25) * 2)] : null;  // gravel and grey scrub
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-130, 0, 130] }, pact: { x: 0, z: -BASE_Z, entries: [-130, 0, 130] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0 })),
  },

  /** Each side dug in on its crest over the hills, its mine belt on the valley floor below (gaps for the road and the pass tracks). */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const m = f === 'nato' ? 1 : -1, R = RIDGES[m];
      for (const [x0, x1] of R.trenches) { // (left to right as the owner faces the valley)
        const pts: [number, number][] = [];
        for (let X = x0; X <= x1; X += 20) pts.push([X * m, (crestU(m, X) - 14) * m]);
        works.push(...trenchLine(pts, f, { zig: 1, belts: 0 }));
      }
      for (let X = -420; X <= 420; X += 34) {
        if (R.passes.some(([px, w]) => Math.abs(X - px) < w * 0.6)) continue; // (the pass tracks)
        const U = R.mines + Math.sin(X * 0.02 + m) * 8;
        works.push({ kind: 'mines', x: X * m, z: U * m, yaw: 0, faction: f });
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1943);
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const slope = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    /** A burnt-out tank: hull, turret, gun (scorched dark), a track thrown. */
    const hulk = (x: number, z: number, yaw: number, color: number) => {
      const g = terrain.heightAt(x, z), fx = Math.sin(yaw), fz = Math.cos(yaw);
      props.box('metal', x, g + 0.9, z, 3, 1.5, 6, yaw, color);
      props.box('metal', x - fz * 0.2, g + 2, z + fx * 0.2, 2.1, 0.9, 2.6, yaw + 0.4, color);
      props.box('metal', x + fx * 2.4, g + 2, z + fz * 2.4, 0.18, 0.18, 3, yaw + 0.4, 0x2a2826);
      props.box('metal', x + fz * 2, g + 0.2, z - fx * 2, 0.5, 0.35, 5, yaw + 0.3, 0x2a2826);
      cover.addBox({ x, z, yaw, length: 6, thickness: 3, height: 1.8 });
    };

    // ---- the two oases: El Guettar, round among its palms, and Bou Hamran, strung out along the road — flat-roofed
    // houses, the mosque, the palm grove, garden walls, the well (the same number of houses and walls: the same cover)
    OASES.forEach((o, k) => {
      const R = mulberry32(3103 + k), cx = o.x, cz = o.z, sx = k ? 1.5 : 1, sz = k ? 0.65 : 1;
      props.flatHouse({ x: cx + (k ? -14 : 4), z: cz + (k ? 6 : -10), yaw: k ? Math.PI / 2 : 0, width: 11, depth: 9, name: 'mosque', dome: true });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + R() * 0.4, d = 17 + R() * 12;
        const x = cx + Math.cos(a) * d * sx, z = cz + Math.sin(a) * d * sz;
        props.flatHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 6 + R() * 4, depth: 5 + R() * 3, storeys: R() < 0.2 ? 2 : 1 });
      }
      props.column({ x: cx - 6, z: cz + 4, radius: 1.4, height: 0.9 }); // the well
      for (let i = 0; i < 70; i++) {
        const a = R() * Math.PI * 2, d = 34 + R() * 26;
        const x = cx + Math.cos(a) * d * (k ? 1.2 : 1), z = cz + Math.sin(a) * d * (k ? 0.8 : 1), h = 7 + R() * 5;
        if (onRoad(x, z, 6)) continue;
        props.palm({ x, z, height: h });
      }
      for (let i = 0; i < 6; i++) { // the gardens' mud walls among the palms
        const a = (i / 6) * Math.PI * 2 + R(), d = 40 + R() * 14;
        const x = cx + Math.cos(a) * d * (k ? 1.2 : 1), z = cz + Math.sin(a) * d * (k ? 0.8 : 1), yaw = a + Math.PI / 2;
        if (!onRoad(x, z, 8)) props.lowWall({ x, z, yaw, length: 10 + R() * 8, height: 1.4, color: 0xb4a07a });
      }
    });

    // ---- the road: telegraph poles along it
    for (let x = -470; x <= 470; x += 38) {
      const z = roadZ(x) + 9;
      if (inOasis(x, z, 4)) continue;
      const g = terrain.heightAt(x, z);
      props.box('plain', x, g + 3.5, z, 0.22, 7, 0.22, 0, 0x5a4a38);
      props.box('plain', x, g + 6.6, z, 1.6, 0.12, 0.12, 0, 0x5a4a38);
    }

    // ---- each side's ridge: positions on the crest (sandbagged gun pits, a few tents behind), boulders on the rock face
    for (const m of [1, -1]) {
      const R = mulberry32(3104 + m), D = RIDGES[m], flip = m > 0 ? 0 : Math.PI;
      for (const X of D.posts) props.sandbagRing({ x: X * m, z: (crestU(m, X) - 4) * m, radius: 4.5, toward: m });
      for (const X of D.guns) { // the gun lines on the back slopes, below the crest
        for (let k = 0; k < 3; k++) props.sandbagRing({ x: (X + (k - 1) * 18) * m, z: (crestU(m, X) + 50 + (k % 2) * 6) * m, radius: 4, toward: m });
        props.tent({ x: (X + 30) * m, z: (crestU(m, X) + 80) * m, yaw: 0.2 + flip, color: 0xa89a78 });
        props.crates({ x: (X - 30) * m, z: (crestU(m, X) + 74) * m, yaw: R() });
      }
      for (let i = 0; i < 140; i++) { // the rock face and the crest: boulders and scree
        const X = (R() * 2 - 1) * 440, U = crestU(m, X) - 60 + R() * 90, rad = 0.8 + R() * 2.4;
        if (pass(m, X) < 0.5 || near(X * m, U * m, 18)) continue;
        props.boulder({ x: X * m, z: U * m, radius: rad });
      }
    }

    // ---- the valley floor: burnt-out tanks and trucks, old sangars, stones
    for (let i = 0; i < 140; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = (r() * 2 - 1) * 200;
      if (near(x, z, 40) || onRoad(x, z, 8) || inOasis(x, z, 10) || Math.abs(x) < 30 || wadi(x, z) > 0.1) continue;
      if (Math.abs(Math.abs(z) - RIDGES[z >= 0 ? 1 : -1].mines) < 14) continue;
      const kind = r();
      const R = (props.rand = mulberry32(Math.floor(r() * 1e9)));
      if (kind < 0.22) hulk(x, z, R() * 6.28, R() < 0.5 ? 0x4a4436 : 0x6a6450);
      else if (kind < 0.42) props.wreckCar({ x, z, yaw: R() * 6.28 });
      else if (kind < 0.62) props.lowWall({ x, z, yaw: R() * 3, length: 5 + R() * 6, height: 1.1, color: 0xa49a84 }); // a stone sangar
      else for (let k = 0; k < 3; k++) props.boulder({ x: x + (R() - 0.5) * 8, z: z + (R() - 0.5) * 8, radius: 0.7 + R() * 1.2 });
    }
    // ---- behind the ridges: rocks and wrecks among the scrub (not on the steep faces)
    const sites: any[] = [];
    for (let tries = 0; sites.length < 44 && tries < 6000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 30);
      if (Math.abs(z) < 30 || sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 40 * 40) || near(x, z, 45) || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || inOasis(x, z, 10) || onRoad(x, z, 10) || onTrack(x, z, 10) || slope(x, z) > 0.3) continue;
      sites.push({ x, z, kind: r() < 0.6 ? 'rocks' : 'wrecks', yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    commandPost(props, this.bases.nato, -1, 0xa89a78);
    commandPost(props, this.bases.pact, 1, 0x9a9070);
    props.finish();
    cover.finalize(bounds);
    // thin camel-thorn and esparto scrub, none on the road
    const avoid = [{ x: 0, z: BASE_Z, r: 24 }, { x: 0, z: -BASE_Z, r: 24 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })), { test: (x: number, z: number) => onRoad(x, z, 6) || onTrack(x, z, 5) }];
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.45, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); },
    };
  },
} satisfies MapDef;
