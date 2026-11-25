// Dürenstein, 11 November 1805: Mortier had crossed to the north bank of the Danube with Gazan's division and
// marched down the Wachau toward Krems, strung out on the one road between the river and the steep vine terraces.
// Kutuzov turned on him: Miloradovich came up the road from Stein past the Rothenhof and Unterloiben, while
// Dokhturov's column climbed the hills by goat paths and came down the ravines behind the French at Dürnstein.
// Gazan's men fought in the Loiben plain all day and broke out through Dürnstein after dark, when Dupont came
// down from Weißenkirchen; Mortier himself got away by boat. The ground: the Danube along the east edge (+x) with
// the road on its thin strip of shore, and the Wachau hills coming down to it from the west not as one wall but as
// spurs, each running down to the river with a side valley (a Graben) between it and the next: the Schlossberg under
// Dürnstein’s castle reaching almost to the water, so the walled town and its abbey are squeezed onto the strip at
// its tip; the Loibenberg in the middle ending short of the road over the open Loiben plain; the Pfaffenberg over
// Stein. Vine terraces on the spurs’ sunny south faces, oak and beech woods on their crests and north faces, the
// upland behind along the west edge. The French come from the north (+z: Weißenkirchen), the Russians from the south
// (−z: Stein) — and over the spurs, as Dokhturov did. Fair, not mirrored: each side has a spur top (the castle rock,
// the Pfaffenberg), a side-valley point (the Kellerberg’s vineyards, the Rothenhof) and a point on the shore strip
// (Dürnstein, the Förthof), each as far from its own base; the Loibenberg, Oberloiben and Unterloiben between them
// are owned by neither; no one fights across the river. 1806 only (`epochs`).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 470;
const noise = createNoise2D(1805_11_11);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Weißenkirchen road', x: 40, z: 450, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Dürnstein castle', x: -140, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Dürnstein', x: 268, z: 288, owner: null, sector: 'east', radius: 28 },
  { id: 'D', name: 'Kellerberg', x: -40, z: 150, owner: null, sector: 'centre' },
  { id: 'E', name: 'Loibenberg', x: -230, z: -5, owner: null, sector: 'west' },
  { id: 'F', name: 'Oberloiben', x: 120, z: 30, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Unterloiben', x: 300, z: -10, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Pfaffenberg', x: -90, z: -315, owner: null, sector: 'west' },
  { id: 'I', name: 'Rothenhof', x: -105, z: -165, owner: null, sector: 'centre' },
  { id: 'J', name: 'Förthof', x: 290, z: -300, owner: null, sector: 'east' },
  { id: 'K', name: 'Stein', x: 40, z: -450, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Danube along the east edge, wide and grey; no bridge in the Wachau
const DANUBE = [[445, -720], [430, -420], [452, -150], [440, 120], [455, 400], [440, 720]];
const river = createRiver({ paths: [DANUBE], halfWidth: 55, level: 0, depth: 3.2, valley: 50, crossings: [] });
// the Wachau road along the river, Weißenkirchen to Stein
const roadX = (z) => 255 + 18 * Math.sin(z * 0.004 + 1.2);
const roadD = (x, z) => Math.abs(x - roadX(z));
/** The spurs of the Wachau hills, running down from the upland in the west to the river [z at the tip, tip x, height,
 *  slant (dz per m inland), half-width]: the Schlossberg under Dürnstein’s castle, reaching nearly to the water; the
 *  Loibenberg in the middle, ending short of the road over the Loiben plain; the Pfaffenberg over Stein. */
const SPURS = [[290, 205, 67, -0.08, 70], [-15, -15, 70, 0.1, 82], [-310, 185, 58, 0.06, 66]];
const spurAlong = (x, tip) => smoothstep(tip, tip - 260, x) ** 0.7;
/** 0..1 for each spur: on its crest (1) to its foot (0). */
const spurK = (x, z, s) => { const [zc, tip, , sl, w] = s; return spurAlong(x, tip) * Math.exp(-(((z - zc - sl * (x - tip)) / w) ** 2)); };
/** The upland behind the spurs (0 at its foot, 1 on top). */
const upland = (x, z) => smoothstep(-140 + 30 * Math.sin(z * 0.01), -470, x);
/** 0 on the plain and in the side valleys, 1 up on the hills. */
const slope = (x, z) => Math.max(upland(x, z), ...SPURS.map((s) => spurK(x, z, s)));
/** The vine terraces: the south face of each spur, from its foot to below the crest. */
const vines = (x, z) => Math.max(0, ...SPURS.map(([zc, tip, , sl, w]) => { const v = (zc + sl * (x - tip) - z) / w; return x < tip - 10 && x > tip - 300 && v > 0.35 && v < 1.25 ? 1 : 0; }));
/** 1 in Dürnstein's walls, 0 outside. */
const town = (x, z) => smoothstep(1.1, 0.85, Math.hypot((x - 285) / 62, (z - 290) / 56));
const nearRiver = (x, z, r) => river.project(x, z).d < river.halfWidth + r;

/** Woods (0..1): the forest on the crests and the north faces, spinneys in the side valleys, the river meadows' willows. */
const woods = (x, z) => {
  let k = smoothstep(0.55, 0.85, slope(x, z)) * (0.8 + 0.2 * fbm(noise, x * 0.01, z * 0.01, 2));
  k = Math.max(k, smoothstep(0.55, 0.7, fbm(noise, x * 0.006 + 8, z * 0.006 - 30, 3)) * 0.7);
  if (vines(x, z)) k *= 0.25;
  k = Math.min(k, 1 - town(x, z), smoothstep(8, 20, roadD(x, z)));
  for (const p of POINTS) k = Math.min(k, smoothstep(32, 56, Math.hypot(x - p.x, z - p.z)));
  return k;
};

function height(x, z) {
  let h = fbm(noise, x * 0.0026, z * 0.0026, 3) * 2.5 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.4 + 4;
  const up = upland(x, z);
  h += up * 16 + fbm(noise, x * 0.008 - 11, z * 0.008, 3) * 5 * up;                                // the upland behind
  for (const s of SPURS) { const k = spurK(x, z, s); if (k > 0.002) h += s[2] * k * (1 - 0.35 * up) + fbm(noise, x * 0.012, z * 0.012 + s[0], 2) * 5 * k; } // the spurs
  h += hill(x, z, P.B.x, P.B.z, 45, 5) + hill(x, z, P.H.x, P.H.z, 45, 4) + hill(x, z, P.E.x, P.E.z, 60, 4); // the castle rock, the Pfaffenberg’s and the Loibenberg’s tops
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  for (const p of POINTS) if (!'BEH'.includes(p.id)) h += (h * 0.5 + 2.2 - h) * smoothstep(44, 22, Math.hypot(x - p.x, z - p.z)) * 0.6;
  h += (3 - h) * town(x, z) * 0.6;
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(36, 18, Math.hypot(x - 40, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 40, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'durnstein',
  armies: { nato: ['fr'], pact: ['ru'] }, // (Mortier and Gazan's division, then Dupont's, against Kutuzov's Russians)
  name: 'Dürenstein',
  description: 'The Wachau, 11 November 1805: the narrow north bank of the Danube under steep vineyards, walled Dürnstein below its castle rock, the Loiben plain and the Rothenhof toward Stein, the Russians coming over the hills.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'overcast' }, // (a cold, misty November day on the river)
  airfields: [],
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 18051111,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1805_111, cell: 64, weights: [0.35, 0.25, 0.25, 0.15] }), // November: meadows by the river, stubble, the vines picked

  theme: {
    // a grey November day in the Danube valley, mist over the water, the hills dark
    fogColor: 0xb0b6b4,
    fogDensity: 0.0018,
    skyTop: 0x76828e,
    skyHorizon: 0xc0c4be,
    skyBottom: 0x767870,
    sunColor: 0xe6dcc8,
    sunIntensity: 1.55,
    sunDisk: 0.12,
    clouds: 0.85,
    cloudLight: 0xcacbc6,
    cloudDark: 0x7a7e84,
    sunDir: [0.55, 0.45, -0.7],
    hemiSky: 0xc0c8d0,
    hemiGround: 0x4a4436,
    hemiIntensity: 1.25,
    rimColor: 0xbcc4cc,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5e6640',
      grassAlt: '#525c3a',
      dryGrass: '#8a7a52',
      dirt: '#5a4836',
      rock: '#6a6660',
      strip: '#4e4030',
      pasture: '#5a663c',
      ploughed: '#504030',
      stubble: '#8e7e54',
      meadow: '#66703e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const rd = roadD(x, z);
        if (rd < 5) return [0x857a68, smoothstep(5, 3, rd) * 0.75];                               // the Wachau road
        const t = town(x, z);
        if (t > 0) return [0x8a8274, t * 0.45];                                                   // Dürnstein's lanes
        if (vines(x, z)) return [0x6a5a40, 0.4];                                                  // the vineyards on the spurs’ south faces, the vines bare
        return null;
      },
    },
  },

  bases: { nato: { x: 40, z: BASE_Z, entries: [-200, 0, 210] }, pact: { x: 40, z: -BASE_Z, entries: [-200, 0, 210] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 60, z: 380 }, pact: { x: 60, z: -380 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);

    // ---- Dürnstein: houses in its walls, the abbey church by the river, the town wall on the hill side
    const rr = mulberry32(1805_1111);
    const taken: number[][] = [];
    for (let i = 0; i < 36; i++) {
      const x = 285 + (rr() * 2 - 1) * 62, z = 290 + (rr() * 2 - 1) * 56;
      if (town(x, z) < 0.6 || roadD(x, z) < 8 || Math.hypot(x - P.C.x, z - P.C.z) < 15 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.PI / 2, width: 7 + rr() * 3, depth: 8, storeys: rr() < 0.6 ? 2 : 1, damaged: 0 });
    }
    props.rand = mulberry32(1805_112);
    props.church({ x: 340, z: 262, yaw: Math.PI / 2 });                                           // (the abbey, its tower over the Danube)
    for (let a = 1.75; a < 4.6; a += 0.32) props.wall({ x: 285 + Math.cos(a) * 72, z: 290 + Math.sin(a) * 64, yaw: a + Math.PI / 2, length: 18, height: 2.6 }); // (the town wall, landward)
    // the castle ruin on its rock
    props.townHouse({ x: P.B.x - 14, z: P.B.z + 6, yaw: 0.4, width: 9, depth: 9, storeys: 2, name: 'castle keep', damaged: 0.7 });
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) props.wall({ x: P.B.x + Math.cos(a) * 26, z: P.B.z + Math.sin(a) * 26, yaw: a + Math.PI / 2, length: 16, height: 2.4 });
    // the villages: Oberloiben and Unterloiben with their church, the Rothenhof's walled farm, the Förthof, the landing
    for (const p of POINTS) if (!p.owner && !'BCEH'.includes(p.id)) buildVillage(props, p, 18053 + Math.round(p.x * 3 + p.z * 7));
    props.church({ x: P.G.x - 34, z: P.G.z - 10, yaw: Math.PI / 2 });
    props.hall({ x: P.I.x + 26, z: P.I.z - 24, yaw: 0.1, width: 20, depth: 9, height: 5, color: 0x9a8a70, roof: 0x5a3a2a, door: 5, name: 'Rothenhof barn' });
    for (const [dx, dz, yaw, length] of [[0, -44, 0.1, 30], [-18, -30, Math.PI / 2, 22]] as const) props.wall({ x: P.I.x + dx, z: P.I.z + dz, yaw, length, height: 1.8 });
    props.house({ x: P.G.x + 50, z: P.G.z - 30, yaw: Math.PI / 2, width: 8, depth: 6 });          // (the boatmen's house)
    buildVillage(props, { x: 60, z: BASE_Z + 30 }, 1805_113);
    buildVillage(props, { x: 80, z: -BASE_Z - 30 }, 1805_114);
    // the vine terraces' dry-stone walls along the slope
    props.rand = mulberry32(1805_115);
    for (const [zc, tip, , sl, w] of SPURS) for (let x = tip - 30; x > tip - 290; x -= 24) for (const v of [0.45, 0.68, 0.91, 1.14]) {
      const z = zc + sl * (x - tip) - v * w;
      if (rr() < 0.4 || nearPoint(x, z, 45) || town(x, z) > 0 || Math.hypot(x - 40, z - BASE_Z) < 70 || Math.hypot(x - 40, z + BASE_Z) < 70) continue;
      props.lowWall({ x, z, yaw: -Math.atan(sl), length: 16, height: 0.9, color: 0x8a8476 });
    }

    // ---- farms, hay and walls on the plain
    const kinds = ['farm', 'hay', 'fieldwall', 'farm', 'hay', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 50 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 60 * 60)) continue;
      if (Math.hypot(x - 40, z - BASE_Z) < 60 || Math.hypot(x - 40, z + BASE_Z) < 60 || nearPoint(x, z, 55) || woods(x, z) > 0.3 || slope(x, z) > 0.3 || nearRiver(x, z, 25) || town(x, z) > 0 || roadD(x, z) < 20) continue;
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

    const avoid = [{ x: 40, z: BASE_Z, r: 30 }, { x: 40, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x, z) => nearRiver(x, z, 1.5) || town(x, z) > 0.3 || roadD(x, z) < 5 }];
    // oak and beech on the tops, a few pines, willows and poplars on the river bank
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 5600, broadleaf: 0.75, autumn: 1, forest: (x, z) => (nearRiver(x, z, 14) ? 0.5 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1800, lane: 0 });
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
