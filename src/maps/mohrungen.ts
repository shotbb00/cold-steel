// Mohrungen, 25 January 1807: Bennigsen’s winter offensive came west through the East Prussian lake country, and
// Bernadotte’s I Corps stood in its way before the little walled town of Mohrungen (Morąg), where Herder was born and
// is remembered in the brick parish church. Markov’s Russian vanguard held the Georgenthal heights north of the town,
// with the Georgenthal wood behind it; Bernadotte attacked across the snow and the frozen lakes and drove it back,
// while Anrep’s cossacks and hussars swept round into Mohrungen itself and took the French baggage until Dupont’s
// men cleared the streets again. Anrep fell.
// On the map (1.0 × 1.12 km, deep snow), turned 45° so the sides come in on their real roads: the French up the
// Saalfeld road from the south-west (+z), the Russians down the Liebstadt road from the north-east (−z). The Oberland
// lake district’s long glacial lakes and the wooded moraine ridges between them run north–south, so they lie slantwise
// across the field: the Narien lake down the east flank, the Mohrunger See past the town’s east gate, the Röthloff lake
// west of it, the Pfarrersee on the west flank, all frozen hard enough to bear horses. Mohrungen stands between its two
// lakes inside its old town wall — the Herder church over the market, the Rathaus, the Dohna castle on the lake side.
// The Georgenthal heights, where Markov stood, are the moraine ridge between the Mohrunger See and the Narien lake,
// the Georgenthal wood along the next ridge west; the Reichau heights are the ridge behind the Röthloff lake, the
// Waltersdorf wood on the low ridge by the Saalfeld road.
// Fair by distance, not by mirrored ground: every ridge and lake runs across both halves; the Georgenthal heights
// before the Russians answer the Reichau heights before the French, the Georgenthal wood the Waltersdorf wood, the
// Narien lake shore the Pfarrersee shore; each point is as far from the nearer base as its counterpart
// (tools/map_fairness.py). No `climate`, as at Eylau: 1807 fought in its coloured coats.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const TOWN = 78;    // the town wall’s radius
const noise = createNoise2D(1807_0125);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Saalfeld road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Himmelforth', x: -350, z: 330, owner: null, sector: 'west' },
  { id: 'C', name: 'Reichau heights', x: -95, z: 245, owner: null, sector: 'centre' },
  { id: 'D', name: 'Waltersdorf wood', x: 260, z: 330, owner: null, sector: 'east' },
  { id: 'E', name: 'Narien lake', x: 300, z: -10, owner: null, sector: 'east', radius: 24 },
  { id: 'F', name: 'Herder church', x: -20, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Pfarrersfeldchen', x: -345, z: 5, owner: null, sector: 'west' },
  { id: 'H', name: 'Georgenthal wood', x: -230, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Georgenthal heights', x: 70, z: -245, owner: null, sector: 'centre' },
  { id: 'J', name: 'Reichertswalde', x: 360, z: -320, owner: null, sector: 'east' },
  { id: 'K', name: 'Liebstadt road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// The field is turned 45°: the Saalfeld road comes in from the south-west (+z), the Liebstadt road from the north-east
// (−z), and the Oberland’s long glacial lakes and the moraine ridges between them, all running north–south, lie
// slantwise across it. In c = x − z (across the grain; NATO’s base at −500, the Pact’s at +500) and s = x + z (along it):
/** The lakes [c, s0, s1, half-width]: the Narien lake down the east flank, the Mohrunger See past the town’s east gate,
 *  the Röthloff lake west of the town, the Pfarrersee on the west flank. */
const LAKES = [[400, 150, 820, 46], [175, -330, 240, 36], [-205, -200, 400, 30], [-430, -820, -250, 40]];
/** The moraine ridges [c, s0, s1, half-width, height]: the Georgenthal heights between the Mohrunger See and the Narien
 *  lake, the Reichau heights behind the Röthloff lake, the low wooded ridge by Waltersdorf, the one by the Georgenthal wood. */
const RIDGES = [[305, -560, 60, 48, 8.5], [-330, -40, 520, 46, 7.5], [60, 380, 760, 60, 4.5], [-60, -760, -330, 60, 4.5]];
const SQ = Math.SQRT1_2;
/** Distance (m) from (x, z) to a band [c, s0, s1] of the grain. */
const bandD = (x, z, c, s0, s1) => Math.hypot((x - z - c) * SQ, Math.max(0, s0 - x - z, x + z - s1) * SQ);
/** 1 on the ice, 0 off it. */
function ice(x, z) {
  let k = 0;
  const wob = fbm(noise, x * 0.02, z * 0.02, 2) * 9;
  for (const [c, s0, s1, hw] of LAKES) k = Math.max(k, smoothstep(hw + 6, hw - 6, bandD(x, z, c, s0, s1) + wob));
  return k;
}
/** 1 inside the town wall, 0 outside it. */
const town = (x, z) => smoothstep(TOWN + 8, TOWN - 8, Math.hypot(x, z));
/** The woods (0..1): the Georgenthal wood, the Waltersdorf wood, fir and birch copses on the ridges. */
const woods = (x, z) => {
  let k = smoothstep(0.4, 0.55, fbm(noise, x * 0.006 + 31, z * 0.006 - 8, 3)) * 0.85;
  k = Math.max(k, smoothstep(75, 45, bandD(x, z, -60, -700, -380)));                 // (the Georgenthal wood, along its ridge)
  k = Math.max(k, smoothstep(75, 45, bandD(x, z, 60, 420, 760)));                    // (the Waltersdorf wood, along its ridge)
  k = Math.min(k, smoothstep(14, 28, Math.hypot(x - P.H.x, z - P.H.z)), smoothstep(14, 28, Math.hypot(x - P.D.x, z - P.D.z))); // (a forester’s clearing)
  for (const p of POINTS) if (p.id !== 'D' && p.id !== 'H') k = Math.min(k, smoothstep(32, 56, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(TOWN + 10, TOWN + 40, Math.hypot(x, z)), 1 - ice(x, z));
};

function height(x, z) {
  let h = fbm(noise, x * 0.0025, z * 0.0025, 3) * 3 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.4 + 3;
  for (const [c, s0, s1, hw, a] of RIDGES) h += a * Math.exp(-((bandD(x, z, c, s0, s1) / hw) ** 2));
  for (const [c, s0, s1, hw] of LAKES) h -= 3 * Math.exp(-((bandD(x, z, c, s0, s1) / (hw + 50)) ** 2)); // (the lakes’ troughs)
  h += hill(x, z, -10, 0, 75, 1.5);                                                   // the town’s low rise between its lakes
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 20 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 16;
  h += (4 - h) * town(x, z) * 0.6;                                                    // the streets level inside the wall
  for (const p of POINTS) if (!'CFI'.includes(p.id)) h += (h * 0.5 + 1.5 - h) * smoothstep(40, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  h = Math.max(h, 1.2);
  const k = ice(x, z);
  if (k > 0) h += (0.6 - h) * k;                                                      // the lakes: flat ice in a hollow
  return h;
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'mohrungen',
  armies: { nato: ['fr'], pact: ['ru'] }, // (Bernadotte’s I Corps against Markov’s vanguard and Anrep’s cavalry)
  name: 'Mohrungen',
  description: 'East Prussia, 25 January 1807: Bernadotte against the Russian vanguard round the little walled town of Mohrungen — the Herder church over the market, the Dohna castle, frozen lakes and fir woods in deep snow.',
  epochs: ['1806'],
  region: 'east',
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180701,
  height,
  airfields: [],
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1807_25, cell: 84, weights: [0.3, 0.2, 0.3, 0.2] }),

  theme: {
    // a hard January day: low white sky, snow lying deep, the cold light flat
    fogColor: 0xd0d6dc,
    fogDensity: 0.0019,
    skyTop: 0x8e98a4,
    skyHorizon: 0xd4dade,
    skyBottom: 0xa0a6ac,
    sunColor: 0xe6ecf2,
    sunIntensity: 1.15,
    sunDisk: 0.05,
    clouds: 0.9,
    cloudLight: 0xd4d8dc,
    cloudDark: 0x8a9298,
    sunDir: [0.35, 0.4, 0.75],
    hemiSky: 0xd6dce4,
    hemiGround: 0x9a9ea2,
    hemiIntensity: 1.45,
    rimColor: 0xc8d0d8,
    rimIntensity: 0.22,
    terrain: {
      grass: '#eceff2',
      grassAlt: '#e2e6ea',
      dryGrass: '#d8d6d0',
      dirt: '#9c968c',
      rock: '#b8bab8',
      pasture: '#eaedee',
      ploughed: '#d4d2ca',
      stubble: '#dedbd2',
      meadow: '#f0f2f4',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const k = ice(x, z);
        if (k > 0.05) return [0xd6e0e8, Math.min(1, k * 1.6) * 0.85];      // the ice, swept bare in places
        const t = town(x, z);
        if (t > 0) return [0xb0aca4, t * 0.5];                              // trodden streets and yards
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    /** A wall from (x0, z0) to (x1, z1). */
    const seg = (x0, z0, x1, z1, height, thickness = 1) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height, thickness, color: 0x8a5a48 });
    // the four streets out of the market: to Saalfeld (+z), Liebstadt (−z), Preußisch Holland (−x) and the lake gate (+x)
    const street = (x, z) => Math.abs(x) < 7 || Math.abs(z) < 7;

    // ---- Mohrungen: the brick town wall with four gates and its towers, houses down the streets
    props.rand = mulberry32(1807_0125);
    const N = 60;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      const x0 = Math.cos(a0) * TOWN, z0 = Math.sin(a0) * TOWN, x1 = Math.cos(a1) * TOWN, z1 = Math.sin(a1) * TOWN;
      if (Math.abs((x0 + x1) / 2) < 11 || Math.abs((z0 + z1) / 2) < 11) continue;      // (the gates)
      seg(x0, z0, x1, z1, 3.4);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.cos(a) * (TOWN + 1), z = Math.sin(a) * (TOWN + 1), g = terrain.heightAt(x, z);
      props.box('stone', x, g + 3.5, z, 5, 7, 5, -a, 0x8a5a48);                              // (the wall towers)
      props.box('stone', x, g + 7.6, z, 5.6, 1.2, 5.6, -a, 0x5a3a2a);
    }
    props.church({ x: -22, z: -20, yaw: 0 });                                                // (St Peter and Paul, Herder’s church)
    props.hall({ x: 16, z: 18, yaw: 0, width: 14, depth: 9, height: 7, color: 0x9a6a52, roof: 0x5a3a2a, door: 3, name: 'Rathaus' });
    props.hall({ x: 52, z: -30, yaw: Math.PI / 2, width: 22, depth: 10, height: 8, color: 0x8a5a46, roof: 0x4a3226, door: 4, name: 'Dohna castle' });
    props.townHouse({ x: -24, z: 22, yaw: 0, width: 8, depth: 6, storeys: 1, damaged: 0 });                             // (Herder’s birthplace, the school house)
    const taken: number[][] = [[-22, -20, 20], [-20, 0, 14], [16, 18, 12], [52, -30, 16], [-24, 22, 8]];
    const rr = mulberry32(1807_251);
    for (let i = 0; i < 220 && taken.length < 40; i++) {
      const a = rr() * Math.PI * 2, d = 26 + rr() * (TOWN - 36), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (street(x, z) || taken.some(([tx, tz, r]) => Math.hypot(x - tx, z - tz) < r + 7)) continue;
      taken.push([x, z, 6]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.abs(x) > Math.abs(z) ? Math.PI / 2 : 0, width: 7 + rr() * 2, depth: 8, storeys: rr() < 0.6 ? 2 : 1, damaged: 0 });
    }

    // ---- the villages; Markov’s battery’s breastwork on the Georgenthal heights, the French guns’ on the Reichau heights
    for (const p of POINTS) if (!p.owner && !'CDEFHI'.includes(p.id)) buildVillage(props, p, 18071 + Math.round(p.x * 3 + p.z * 7));
    props.rand = mulberry32(1807_3);
    for (const [p, s] of [[P.I, 1], [P.C, -1]] as const) for (let k = -2; k <= 2; k++) props.wall({ x: p.x + k * 13, z: p.z + s * 22, yaw: 0, length: 8, height: 0.9, color: 0x8a8070 });
    for (const [p, s] of [[P.H, 1], [P.D, -1]] as const) { props.townHouse({ x: p.x + s * 10, z: p.z + 8, yaw: 0.3, width: 7, depth: 6, storeys: 1, damaged: 0 }); props.logPile({ x: p.x - s * 8, z: p.z - 6, yaw: 1.1, length: 6 }); } // (the foresters’ lodges)
    props.townHouse({ x: P.E.x - 14, z: P.E.z - 22, yaw: 0.6, width: 6, depth: 5, storeys: 1, damaged: 0 });              // (the fishers’ huts on the lake shores)
    props.logPile({ x: P.E.x + 16, z: P.E.z - 18, yaw: 1.2, length: 6 });
    props.townHouse({ x: P.G.x + 20, z: P.G.z - 14, yaw: 2.6, width: 7, depth: 6, storeys: 1, damaged: 0 });
    props.townHouse({ x: P.G.x - 16, z: P.G.z + 18, yaw: 0.4, width: 8, depth: 6, storeys: 1, damaged: 0 });

    // ---- farms, field walls and hay in the snow
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'farm'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 80 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 60 * 60)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 55) || woods(x, z) > 0.3 || ice(x, z) > 0 || ice(x + 25, z) > 0 || ice(x - 25, z) > 0 || ice(x, z + 25) > 0 || ice(x, z - 25) > 0 || Math.hypot(x, z) < TOWN + 30) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xc8c4b0]] as const) {
      props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), { test: (x, z) => ice(x, z) > 0 || Math.hypot(x, z) < TOWN + 6 }];
    // firs and bare birches
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4400, broadleaf: 0.1, autumn: 1, forest: (x, z) => woods(x, z) * 0.95 });
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
