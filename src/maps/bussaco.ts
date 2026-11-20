// Bussaco, 27 September 1810: Wellington's British and Portuguese on the Serra do Buçaco, a long bare ridge of
// heather and rock across Masséna's road to Coimbra, the Carmelite convent at its northern end inside the walled
// wood. At dawn, in mist, Reynier's columns climbed out of the valley at Santo António do Cântaro and Ney's from
// Moura and Sula up the road to the convent; they reached the crest blown and in disorder, and the line and the
// Light Division, lying in the hollow behind the crest, threw them back down. The French come from the east (+z),
// the allies hold the west (−z). Fair, not mirrored: the long, narrow Bussaco ridge with its saddle where the
// road crosses is traded for the French counter-ridge — the broad Moura heights and the spur Sula stands on,
// as high — and the walled wood round the convent for the pine-filled side ravines that cover the French
// climb (the covered approaches). The valley and its brook run across the middle, owned by no one, with the
// mill and Santo António on either side of it about as far out; both crests are neutral points, as far from
// each base as the other, so neither side starts on the decisive ground.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const noise = createNoise2D(1810_09);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Mortágua road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Moura', x: -370, z: 320, owner: null, sector: 'west' },
  { id: 'C', name: 'Sula', x: -120, z: 230, owner: null, sector: 'centre' },
  { id: 'D', name: 'Moura heights', x: 250, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'The valley mill', x: -300, z: 80, owner: null, sector: 'west' },
  { id: 'F', name: 'Sula brook', x: -30, z: 10, owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Santo António do Cântaro', x: 260, z: -60, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Bussaco convent', x: -230, z: -290, owner: null, sector: 'west', radius: 26 },
  { id: 'I', name: 'Cruz Alta', x: 140, z: -250, owner: null, sector: 'centre' },
  { id: 'J', name: 'Palheiros', x: 410, z: -325, owner: null, sector: 'east' },
  { id: 'K', name: 'Luso road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the brook in the valley bottom: a stony gully, crossable anywhere, slowly
const brookZ = (x) => 18 * Math.sin(x * 0.005 + 0.4) + 7 * Math.sin(x * 0.017) + 12;
const gully = (x, z) => smoothstep(15, 5, Math.abs(z - brookZ(x)));
// the Bussaco ridge's crest line, and the walled wood round the convent
const crestZ = (x) => -262 + 22 * Math.sin(x * 0.004 + 1.2);
const WOOD = { x: -255, z: -320, rx: 120, rz: 72 };
const inWood = (x, z) => Math.hypot((x - WOOD.x) / WOOD.rx, (z - WOOD.z) / WOOD.rz);
/** Distance from (x, z) to the segment a–b. */
const seg = (x, z, ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
// the side ravines down from the French heights, full of pines: the covered ways down to the valley
const RAVINES = [[-230, 300, -250, 110], [130, 300, 150, 90], [380, 260, 400, 60]];
/** Pines and scrub oak (0..1). */
const pines = (x, z) => {
  let k = smoothstep(0.5, 0.64, fbm(noise, x * 0.007 + 13, z * 0.007 - 5, 3)) * 0.7;
  k = Math.max(k, smoothstep(1.02, 0.9, inWood(x, z)));                                       // (the walled wood: dense)
  for (const [ax, az, bx, bz] of RAVINES) k = Math.max(k, smoothstep(48, 26, seg(x, z, ax, az, bx, bz)) * 0.9);
  k = Math.max(k, smoothstep(90, 50, Math.hypot(x - P.D.x - 70, z - P.D.z - 60)) * 0.8);    // (pines behind the Moura heights' top)
  k *= smoothstep(30, 60, Math.abs(z - crestZ(x))) * (1 - smoothstep(1.1, 0.9, inWood(x, z))) + smoothstep(1.1, 0.9, inWood(x, z)); // (the crest bare heather, but for the wood)
  for (const p of POINTS) k = Math.min(k, smoothstep(26, 50, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, 1 - gully(x, z));
};

function height(x, z) {
  let h = fbm(noise, x * 0.003, z * 0.003, 4) * 5 + fbm(noise, x * 0.03 + 9, z * 0.03, 2) * 0.5 + 4;
  const rz = (z - crestZ(x)) / 72;                                                          // the Bussaco ridge: long, narrow, a saddle where the road crosses
  h += 21 * Math.exp(-rz * rz) * (1 - 0.4 * Math.exp(-(((x + 40) / 60) ** 2))) + ridged(noise, x * 0.008, z * 0.008, 3) * 3 * Math.exp(-rz * rz * 0.6);
  h += hill(x, z, P.D.x, P.D.z, 120, 22) + hill(x, z, P.D.x + 90, P.D.z + 70, 100, 9);     // the Moura heights: broad and round, higher ground behind
  h += hill(x, z, P.C.x - 40, P.C.z + 60, 110, 19) + hill(x, z, -330, 380, 90, 9);         // the spur Sula stands on, and the hill behind Moura
  h += 9 * Math.exp(-(((z - 300) / 90) ** 2));                                              // the French counter-ridge between them
  for (const [ax, az, bx, bz] of RAVINES) h -= smoothstep(30, 8, seg(x, z, ax, az, bx, bz)) * 3.5;
  h -= gully(x, z) * 2.8;
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, Math.abs(x)) * 30 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 24;
  for (const p of POINTS) if ('BEFGJ'.includes(p.id)) h += (h * 0.6 + 1.6 - h) * smoothstep(40, 20, Math.hypot(x - p.x, z - p.z)) * 0.5; // (villages on level ground)
  for (const bz of [BASE_Z, -BASE_Z]) h += (7 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return h;
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'bussaco',
  armies: { nato: ['fr'], pact: ['gb'] }, // (Masséna's Armée de Portugal against Wellington's British and Portuguese)
  name: 'Bussaco',
  description: 'Portugal, September 1810: the long bare Bussaco ridge with the convent in its walled wood, the deep valley below, the French climbing from Moura and Sula through the morning mist.',
  epochs: ['1806'],
  region: 'iberia',
  conditions: { time: 'dawn', weather: 'fog' }, // (the attack went in at first light, in the mist off the valley)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 181009,
  height,
  woods: (x, z) => pines(x, z) * 0.75,
  fields: createFields({ seed: 1810, cell: 64, weights: [0.25, 0.15, 0.35, 0.25] }), // September: stubble, the maize in

  theme: {
    // an early autumn morning in the Beira hills: the mist lifting off the valley, the light soft
    fogColor: 0xc8ccc4,
    fogDensity: 0.0014,
    skyTop: 0x6a92bc,
    skyHorizon: 0xd6dcd8,
    skyBottom: 0x8e907c,
    sunColor: 0xffecd0,
    sunIntensity: 1.9,
    sunDisk: 0.6,
    clouds: 0.25,
    cloudLight: 0xf2f2ee,
    cloudDark: 0xa8aeb2,
    sunDir: [0.3, 0.5, 0.8],
    hemiSky: 0xccd8e2,
    hemiGround: 0x5e5a3c,
    hemiIntensity: 1.25,
    rimColor: 0xdce2e6,
    rimIntensity: 0.25,
    terrain: {
      grass: '#6c7040',
      grassAlt: '#62683c',
      dryGrass: '#9c8c58',
      dirt: '#7e6446',
      rock: '#8e8676',
      strip: '#6e563a',
      pasture: '#76783e',
      ploughed: '#7c5e40',
      stubble: '#ad9a60',
      meadow: '#70763e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const g = gully(x, z);
        if (g > 0.3) return [0x8e8668, (g - 0.3) * 1.2];                                   // the brook's stony bed
        const c = Math.exp(-(((z - crestZ(x)) / 55) ** 2)) * smoothstep(0.9, 1.1, inWood(x, z));
        return c > 0.2 ? [0x6e5a5a, (c - 0.2) * 0.5] : null;                                // the heather on the ridge, going brown
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1st Company' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const taken: number[][] = [];

    // ---- the Carmelite convent in its clearing: the church, the cloister walls, the cells
    props.rand = mulberry32(1810_27);
    props.church({ x: P.H.x - 4, z: P.H.z - 30, yaw: 0 });
    for (const [dx, dz, yaw] of [[-16, -42, 0], [8, -42, 0], [-28, -30, Math.PI / 2], [20, -30, Math.PI / 2]] as const) props.wall({ x: P.H.x + dx, z: P.H.z + dz, yaw, length: 14, height: 2.2 });
    props.house({ x: P.H.x + 26, z: P.H.z - 14, yaw: Math.PI / 2, width: 12, depth: 6 });
    taken.push([P.H.x - 4, P.H.z - 30], [P.H.x + 26, P.H.z - 14]);
    // the wall round the wood: a stretch at a time along its edge, the gates open where the roads go in
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const x = WOOD.x + Math.cos(a) * WOOD.rx * 1.04, z = WOOD.z + Math.sin(a) * WOOD.rz * 1.04;
      if (i % 9 === 4 || Math.abs(x) > BOUNDS.x - 20) continue;                           // (the gates)
      const tx = -Math.sin(a) * WOOD.rx, tz = Math.cos(a) * WOOD.rz;
      props.wall({ x, z, yaw: -Math.atan2(tz, tx), length: 15, height: 2 });
    }
    // Cruz Alta: the stone cross on the crest
    props.column({ x: P.I.x + 18, z: P.I.z - 10, radius: 0.5, height: 4 });

    // ---- the villages: Moura and Sula of stone houses up their streets, Palheiros, the hamlet at Santo António, the mill
    for (const [q, n, seed] of [[P.B, 14, 1810_1], [P.C, 12, 1810_2], [P.G, 8, 1810_3]] as const) {
      const rr = mulberry32(seed);
      for (let i = 0; i < n; i++) {
        const a = rr() * Math.PI * 2, d = 18 + rr() * 30;
        const x = q.x + Math.cos(a) * d, z = q.z + Math.sin(a) * d;
        if (Math.abs(x) > BOUNDS.x - 20 || gully(x, z) > 0 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 11)) continue;
        taken.push([x, z]);
        props.rand = mulberry32(Math.floor(rr() * 1e9));
        props.house({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + rr() * 3, depth: 6 });
      }
    }
    props.rand = mulberry32(27091810);
    props.church({ x: P.B.x + 6, z: P.B.z + 8, yaw: Math.PI / 2 });
    taken.push([P.B.x + 6, P.B.z + 8]);
    for (const p of [P.J, P.E]) buildVillage(props, p, 18109 + Math.round(p.x * 3 + p.z * 7));
    props.house({ x: P.F.x + 26, z: brookZ(P.F.x + 26) + 18, yaw: 0.2, width: 8, depth: 6 }); // (the miller's house by the brook)
    // the French guns' epaulements on the Moura heights, the allied guns' on the crest by Cruz Alta: low earth banks
    for (const [q, yaw] of [[P.D, 0.15], [P.I, -0.1]] as const) for (let k = -1; k <= 1; k++) props.wall({ x: q.x + k * 16, z: q.z + (q.z > 0 ? -22 : 22), yaw, length: 10, height: 0.9 });

    // ---- terraced fields, stone walls and hay across the slopes
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 80 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 55) || pines(x, z) > 0.3 || gully(x, z) > 0 || inWood(x, z) < 1.15) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd8d2c0]] as const) {
      props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...taken.map(([x, z]) => ({ x, z, r: 8 })), { test: (x, z) => gully(x, z) > 0.4 }];
    // maritime pines and cork oaks; the convent wood thick with cedars and oaks
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 3200, broadleaf: 0.35, autumn: 0.1, maxY: 70, forest: (x, z) => pines(x, z) * 0.9 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1600, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2, fields: this.fields });

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
