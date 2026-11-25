// Hohenlinden, 3 December 1800: Archduke John’s Austrians (with the Bavarians then on their side) marched west through
// the Ebersberg forest east of Munich in a snowstorm, the main column on the one chaussée from Haag through Mattenpöt,
// the others lost on the forest tracks. Moreau waited in the clearing round Hohenlinden at the forest’s west edge;
// the Austrian column came out of the trees into Grouchy’s and Ney’s fire, while Richepanse took his division into
// the forest from the south by St. Christoph and fell on the column’s rear at Mattenpöt. Jammed on the chaussée
// between the trees, the Austrians broke. The French come from the Munich side (+z here), the Coalition from Haag
// (−z). The forest fills the middle of the field; the chaussée runs through it from base to base, a forest track
// along each flank (the northern by Preisendorf and Albaching, the southern by St. Christoph that Richepanse took),
// and clearings round the villages. Fair, not mirrored: the forest’s edges lie as far from each base — the
// Hohenlinden clearing before the French matched by the Mattenpöt clearing before the Coalition, St. Christoph’s by
// Preisendorf’s, Forstern and Harthofen by Albaching and Maitenbeth — and the low rise in the forest north of the
// chaussée is traded for the one south of it. No `climate`: the snow is the theme’s, as Eylau’s.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 470;
const noise = createNoise2D(1800_12);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

/** The chaussée Munich–Haag: x along it at z. */
const roadX = (z) => 28 * Math.sin(z * 0.005 + 0.4) + 6 * Math.sin(z * 0.017);
/** The forest tracks down each flank. */
const trackN = (z) => -330 + 30 * Math.sin(z * 0.007 + 1);
const trackS = (z) => 320 + 26 * Math.sin(z * 0.006 - 0.5);

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Munich road', x: roadX(440), z: 440, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Forstern', x: -380, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Hohenlinden', x: roadX(250) + 18, z: 250, owner: null, sector: 'centre', radius: 28 },
  { id: 'D', name: 'Harthofen', x: 300, z: 310, owner: null, sector: 'east' },
  { id: 'E', name: 'Preisendorf', x: trackN(60), z: 60, owner: null, sector: 'west' },
  { id: 'F', name: 'The chaussée', x: roadX(-10), z: -10, owner: null, sector: 'centre' },
  { id: 'G', name: 'St. Christoph', x: trackS(-120), z: -120, owner: null, sector: 'east' },
  { id: 'H', name: 'Albaching', x: -330, z: -260, owner: null, sector: 'west' },
  { id: 'I', name: 'Mattenpöt', x: roadX(-235) - 14, z: -235, owner: null, sector: 'centre', radius: 26 },
  { id: 'J', name: 'Maitenbeth', x: 400, z: -290, owner: null, sector: 'east' },
  { id: 'K', name: 'Haag road', x: roadX(-440), z: -440, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

/** 1 on the chaussée or a track, 0 off it. */
const onRoad = (x, z) => Math.max(smoothstep(7, 4, Math.abs(x - roadX(z))), smoothstep(4.5, 2.5, Math.abs(x - trackN(z))) * smoothstep(-470, -420, z) * smoothstep(470, 420, z),
  smoothstep(4.5, 2.5, Math.abs(x - trackS(z))) * smoothstep(-470, -420, z) * smoothstep(470, 420, z));
/** The Ebersberg forest (0..1): a band across the middle of the field, its edges ragged, the clearings round the villages. */
const woods = (x, z) => {
  const edge = fbm(noise, x * 0.008 + 3, z * 0.008 - 11, 3) * 60;
  let k = smoothstep(300, 250, z + 10 + edge) * smoothstep(-320, -270, z - 10 + edge);     // (the forest band: Hohenlinden’s edge to Mattenpöt’s)
  k = Math.max(k * (0.75 + 0.25 * smoothstep(0.35, 0.55, fbm(noise, x * 0.02, z * 0.02 + 5, 2))), smoothstep(0.56, 0.68, fbm(noise, x * 0.006 - 31, z * 0.006 + 8, 3)) * 0.8); // (copses out in the fields)
  for (const p of POINTS) k = Math.min(k, smoothstep('CI'.includes(p.id) ? 60 : 34, 'CI'.includes(p.id) ? 95 : 62, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, 1 - smoothstep(0.2, 0.6, onRoad(x, z) + smoothstep(14, 9, Math.abs(x - roadX(z)))));
};

function height(x, z) {
  let h = fbm(noise, x * 0.0025, z * 0.0025, 3) * 4 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.4 + 6;
  h += hill(x, z, -170, 60, 120, 6) + hill(x, z, 190, -90, 120, 6);                       // a low rise in the forest each side of the chaussée
  h += hill(x, z, P.B.x + 40, P.B.z - 20, 90, 4) + hill(x, z, P.J.x - 30, P.J.z + 30, 90, 4);
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 22 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  for (const p of POINTS) h += (h * 0.6 + 2.4 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(30, 16, Math.hypot(x - roadX(bz), z - bz));
  const r = smoothstep(8, 4, Math.abs(x - roadX(z)));
  return h + (h * 0.94 + 0.35 - h) * r;                                                    // (the chaussée on a low embankment, smoothed)
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'hohenlinden',
  armies: { nato: ['fr', 'by'], pact: ['au', 'ru'] }, // (Moreau against Archduke John — Austria has no units yet: Russia fights for her)
  name: 'Hohenlinden',
  description: 'Bavaria, December 1800: the dense Ebersberg forest east of Munich in a snowstorm, the one chaussée through it from Mattenpöt to the clearing at Hohenlinden, forest tracks down each flank.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180012,
  height,
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1800_3, cell: 80, weights: [0.3, 0.2, 0.3, 0.2] }),

  theme: {
    // a snowstorm in the forest: the light flat and white, the trees fading into it
    fogColor: 0xd0d4d8,
    fogDensity: 0.0026,
    skyTop: 0x989ea6,
    skyHorizon: 0xd4d8da,
    skyBottom: 0xa2a6aa,
    sunColor: 0xe0e6ec,
    sunIntensity: 1.05,
    sunDisk: 0,
    clouds: 1,
    cloudLight: 0xd0d4d8,
    cloudDark: 0x888e94,
    sunDir: [0.3, 0.45, 0.75],
    hemiSky: 0xd4dae0,
    hemiGround: 0x989ca0,
    hemiIntensity: 1.5,
    rimColor: 0xc8d0d8,
    rimIntensity: 0.2,
    terrain: {
      grass: '#eceff1',
      grassAlt: '#e2e6e8',
      dryGrass: '#d8d6d0',
      dirt: '#9e988e',
      rock: '#babcba',
      pasture: '#eaedee',
      ploughed: '#d4d2ca',
      stubble: '#dedbd2',
      meadow: '#f0f2f3',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [], // (the chaussée and the forest tracks are this map’s own: onRoad)
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const r = onRoad(x, z);
        if (r > 0.05) return [0x8e887e, r * 0.75];                                               // the chaussée and the tracks, trodden to slush
        const f = woods(x, z);
        return f > 0.5 ? [0xc6cac6, (f - 0.5) * 0.9] : null;                                     // less snow under the trees, needles and earth
      },
    },
  },

  bases: { nato: { x: roadX(BASE_Z), z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: roadX(-BASE_Z), z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const taken: number[][] = [];

    // ---- Hohenlinden: the church and the post house by the chaussée, farms round the clearing; Mattenpöt: the inn and a few farms
    props.rand = mulberry32(1800_1203);
    props.church({ x: P.C.x + 26, z: P.C.z + 20, yaw: 0 });
    props.hall({ x: roadX(P.C.z - 30) - 20, z: P.C.z - 30, yaw: 0, width: 18, depth: 9, height: 6, color: 0xd8d0bc, roof: 0x6a4030, door: 4, name: 'post house' });
    taken.push([P.C.x + 26, P.C.z + 20], [roadX(P.C.z - 30) - 20, P.C.z - 30]);
    const rr = mulberry32(1800_12);
    for (const [q, n] of [[P.C, 10], [P.I, 5]] as const) {
      for (let i = 0; i < n * 3 && n > 0; i++) {
        const a = rr() * Math.PI * 2, d = 30 + rr() * 34;
        const x = q.x + Math.cos(a) * d, z = q.z + Math.sin(a) * d;
        if (Math.abs(x - roadX(z)) < 12 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 15)) continue;
        taken.push([x, z]);
        props.rand = mulberry32(Math.floor(rr() * 1e9));
        props.house({ x, z, yaw: Math.atan2(z - q.z, x - q.x) + Math.PI / 2, width: 8 + rr() * 2, depth: 6 });
      }
    }
    props.hall({ x: roadX(P.I.z + 16) + 18, z: P.I.z + 16, yaw: 0, width: 14, depth: 8, height: 5, color: 0xcfc6b0, roof: 0x5a3a2a, door: 3, name: 'inn' });
    taken.push([roadX(P.I.z + 16) + 18, P.I.z + 16]);
    // ---- the villages in their clearings; foresters’ lodges and log piles on the tracks; the forester’s house at the chaussée
    for (const p of POINTS) if (!p.owner && !'CFI'.includes(p.id)) buildVillage(props, p, 18003 + Math.round(p.x * 3 + p.z * 7));
    props.rand = mulberry32(1800_5);
    props.house({ x: P.F.x + 20, z: P.F.z - 8, yaw: 0, width: 7, depth: 6 });
    props.logPile({ x: P.F.x - 16, z: P.F.z + 10, yaw: 0, length: 8 });
    props.logPile({ x: P.F.x - 16, z: P.F.z - 14, yaw: 0, length: 7 });
    taken.push([P.F.x + 20, P.F.z - 8], [P.F.x - 16, P.F.z - 2]);
    for (const z of [-200, -60, 120, 210]) {
      for (const [t, s] of [[trackN, 1], [trackS, -1]] as const) { props.logPile({ x: t(z) + s * 9, z, yaw: 0, length: 6 }); taken.push([t(z) + s * 9, z]); }
    }

    // ---- farms, field walls and hay out in the fields before the forest
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'farm', 'hay'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 60 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x - P.A.x, z - BASE_Z) < 60 || Math.hypot(x - P.K.x, z + BASE_Z) < 60 || nearPoint(x, z, 55) || woods(x, z) > 0.2 || Math.abs(x - roadX(z)) < 20 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 40)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd4d0c0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();

    const avoid = [{ x: this.bases.nato.x, z: BASE_Z, r: 30 }, { x: this.bases.pact.x, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      { test: (x, z) => onRoad(x, z) > 0.05 || Math.abs(x - roadX(z)) < 9 }];
    // the Ebersberg forest: spruce and fir, some beech, bare; a lane of trees along the chaussée
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 10000, broadleaf: 0.2, autumn: 1, forest: (x, z) => Math.max(woods(x, z) * 0.97, smoothstep(16, 12, Math.abs(x - roadX(z))) * smoothstep(9, 11, Math.abs(x - roadX(z))) * 0.4) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.6, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
