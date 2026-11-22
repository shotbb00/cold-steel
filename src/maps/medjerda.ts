// The Medjerda valley, winter 1942–43 — the Allied base in Algeria under an Axis counterstroke out of Tunisia (1945
// epoch; North Africa; the big field, 1.0 × 1.12 km). After Torch the British 1st Army and US II Corps ran their
// supplies up the one railway from Souk Ahras along the Medjerda into Tunisia; all winter the Germans and the
// Fallschirmjäger struck back down the valley and through the Tell Atlas hills at the border, in rain and mud.
// The map: the Allies come from the west (+z, Souk Ahras, the railhead), the Germans from the east (−z, Ghardimaou,
// the first Tunisian town down the line). Across the middle the Medjerda — winter-full, brown, steep-banked: only
// its crossings get anyone over — with Oued Meliz round the road bridge, its station on the railway along the
// eastern bank, the church and the whitewashed colonial houses. In the south (−x) the cork-oak and pine hills: Djebel
// Beni Salah on the Allied side, Djebel Ghorra on the German side; between them on each bank a Roman hill (Khemissa
// with Thubursicum’s ruins, Chemtou with Simitthu’s marble quarries). In the north (+x) the open wheat plain:
// the colonial farm villages Laverdure and Fernana, each with its church, the douars of Taoura and Sakiet Sidi
// Youssef by the river, olive groves round them.
// Not a mirror but fair: each side has one wooded djebel on the same flank, the same reach from its base, each its
// own shape (Beni Salah a broad round massif, Ghorra a long ridge running off the map’s edge) and within a few metres
// of the other’s height; one Roman knoll in the centre each, the same height and reach; one farm village with a
// church on the open flank each; one douar on its own bank each (Taoura; Sakiet), and Oued Meliz shared across the
// bridge. Five crossings spread along the river serve both: the Sakiet ford, the Sakiet bridge, the Oued Meliz bridge,
// the Taoura ford and the Laverdure bridge. The hills are rolling, not cliffs: wheels go everywhere, woods are cover.
// No `climate`: the Tell in winter is green and muddy, battledress and field grey.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost } from './common.js';
import { segDist, arabVillage } from './greatWarHelpers.ts';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const noise = createNoise2D(1943_01);

// ---- the Medjerda, from the north (+x) to the south (−x)
const rz = (x: number) => 6 + 20 * Math.sin(x * 0.0062 + 0.5) + 6 * Math.sin(x * 0.021 - 0.7);
const HW = 8;
const river = createRiver({
  path: rz, halfWidth: HW, level: 0, depth: 2.6, valley: 32,
  crossings: [
    { name: 'Sakiet ford', x: -430, kind: 'ford', width: 14, depth: 0.7 },
    { name: 'Sakiet bridge', x: -205, kind: 'bridge', width: 7 },
    { name: 'Oued Meliz bridge', x: 0, kind: 'bridge', width: 9 },
    { name: 'Taoura ford', x: 235, kind: 'ford', width: 14, depth: 0.7 },
    { name: 'Laverdure bridge', x: 420, kind: 'bridge', width: 7 },
  ],
});
const away = (x: number, z: number) => Math.abs(z - rz(x));
const railZ = (x: number) => rz(x) - 34; // the Souk Ahras – Tunis line, along the eastern bank

// ---- the heights: asymmetric domes (centre, radii east/west/toward the river/back, height)
type Hill = { x: number; z: number; e: number; w: number; f: number; b: number; h: number; top: number };
const BENI: Hill = { x: -350, z: 320, e: 210, w: 250, f: 175, b: 230, h: 58, top: 0.3 };    // Djebel Beni Salah, broad and round
const GHORRA: Hill = { x: -360, z: -315, e: 170, w: 330, f: 150, b: 250, h: 60, top: 0.22 }; // Djebel Ghorra, a long ridge off the edge
const KHEMISSA: Hill = { x: 50, z: 170, e: 80, w: 75, f: 62, b: 120, h: 26, top: 0.3 };
const CHEMTOU: Hill = { x: 70, z: -170, e: 105, w: 60, f: 58, b: 110, h: 27, top: 0.3 };
const HILLS = [BENI, GHORRA, KHEMISSA, CHEMTOU];
/** A dome's share at (x, z) (0 outside, 1 on its top). `f` faces the river (toward z = 0), `b` faces away. */
function dome(H: Hill, x: number, z: number) {
  const dx = x - H.x, dz = z - H.z;
  const rx = dx > 0 ? H.e : H.w, rzz = (dz > 0) === (H.z < 0) ? H.f : H.b;
  let e = Math.hypot(dx / rx, dz / rzz);
  if (e < 1.2) e *= 1 + 0.12 * noise(x * 0.011 + H.x, z * 0.011);
  return e >= 1 ? 0 : smoothstep(1, H.top, e);
}

// ---- the points
const LAVERDURE = { x: 335, z: 262 };
const FERNANA = { x: 345, z: -262 };
const TAOURA = { x: 300, z: rz(300) + 50 };
const SAKIET = { x: -330, z: rz(-330) - 56 };
const F_PT = { x: 14, z: rz(14) - 16 };

// ---- the roads: Souk Ahras – Ghardimaou over the Oued Meliz bridge, the bank roads, the crossings' tracks
const ROADS: number[][][] = [
  [[-10, 600], [0, BASE_Z], [-40, 390], [-30, 280], [-10, 150], [0, 70], [0, rz(0)], [0, -50], [-30, -110], [-20, -250], [-30, -400], [0, -BASE_Z], [10, -600]],
  [[-35, 330], [-200, 130], [-205, 60], [-205, rz(-205)], [-205, -80]],                              // the Sakiet bridge road
  [[SAKIET.x, SAKIET.z], [-205, -80], [-110, -75], [-30, -110]],                                     // Sakiet – Oued Meliz, the eastern bank
  [[-430, 130], [-430, rz(-430)], [-430, -90], [SAKIET.x, SAKIET.z]],                               // the Sakiet ford track
  [[-200, 130], [-430, 130]],
  [[0, 70], [140, 85], [TAOURA.x, TAOURA.z], [420, 110], [420, rz(420)], [420, -110], [FERNANA.x, FERNANA.z]], // the western bank road, the Laverdure bridge
  [[0, -50], [120, -75], [235, -95], [FERNANA.x, FERNANA.z]],                                        // Oued Meliz – Fernana
  [[LAVERDURE.x, LAVERDURE.z], [235, 160], [235, rz(235)], [235, -95]],                             // the Taoura ford track
  [[0, BASE_Z], [190, 400], [LAVERDURE.x, LAVERDURE.z], [TAOURA.x, TAOURA.z]],                     // Souk Ahras – Laverdure – Taoura
  [[0, -BASE_Z], [190, -400], [FERNANA.x, FERNANA.z]],                                               // Ghardimaou – Fernana
  [[-35, 330], [-250, 340], [BENI.x, BENI.z]],                                                       // the forest track up Beni Salah
  [[-30, -250], [-250, -300], [GHORRA.x, GHORRA.z]],                                                 // and up Ghorra
  [[-10, 150], [KHEMISSA.x, KHEMISSA.z]],
  [[-20, -250], [CHEMTOU.x, CHEMTOU.z]],
];
const roadD = (x: number, z: number) => { let d = Infinity; for (const r of ROADS) d = Math.min(d, segDist(r, x, z)); return d; };

// ---- the ground: the valley floor, the hills, the Tell rising behind; cached (the noise is dear), the river cut live
function ground0(x: number, z: number) {
  let h = 2.6 + fbm(noise, x * 0.005, z * 0.005, 3) * 2.2;
  h += smoothstep(360, 560, Math.abs(z)) * 9 * (0.75 + 0.25 * Math.sin(x * 0.008));   // the Tell rising behind each side
  for (const H of [BENI, GHORRA]) {
    const k = dome(H, x, z);
    if (k > 0) h += H.h * k + ridged(noise, x * 0.01 + 3, z * 0.01, 3) * 18 * k * (1 - k);   // spurs and ravines on the flanks
  }
  h += KHEMISSA.h * dome(KHEMISSA, x, z) + CHEMTOU.h * dome(CHEMTOU, x, z);
  for (const [px, pz, r] of [[0, BASE_Z, 34], [0, -BASE_Z, 34], [LAVERDURE.x, LAVERDURE.z, 60], [FERNANA.x, FERNANA.z, 60]]) {
    const d = Math.hypot(x - px, z - pz);
    if (d < r + 30) h += (3 - h) * 0.6 * smoothstep(r + 30, r, d);   // the villages and the bases on the level
  }
  return h;
}
const cached = gridCacheSmooth(ground0, { x: BOUNDS.x + 20, z: BOUNDS.z + 20 }, 2.5);
const height = (x: number, z: number) => river.carve(x, z, cached(x, z));

const inTown = (x: number, z: number) => Math.hypot((x - 5) / 95, (z - rz(x)) / 75) < 1;
const woods0 = (x: number, z: number) => fbm(noise, x * 0.009 + 21, z * 0.009 - 7, 2);
const hillK = (x: number, z: number) => Math.max(dome(BENI, x, z), dome(GHORRA, x, z));

const points: ControlPointDef[] = [
  { id: 'A', name: 'Souk Ahras', x: 0, z: BASE_Z - 30, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Djebel Beni Salah', x: BENI.x, z: BENI.z, owner: null, sector: 'west', radius: 24 },
  { id: 'C', name: 'Khemissa', x: KHEMISSA.x, z: KHEMISSA.z, owner: null, sector: 'centre', radius: 22 },
  { id: 'D', name: 'Laverdure', x: LAVERDURE.x, z: LAVERDURE.z, owner: null, sector: 'east' },
  { id: 'E', name: 'Sakiet Sidi Youssef', x: SAKIET.x, z: SAKIET.z, owner: null, sector: 'west' },
  { id: 'F', name: 'Oued Meliz', x: F_PT.x, z: F_PT.z, owner: null, sector: 'centre', radius: 34 }, // (beside the road at the east end of the bridge, reaching over the river)
  { id: 'G', name: 'Taoura', x: TAOURA.x, z: TAOURA.z, owner: null, sector: 'east' },
  { id: 'H', name: 'Djebel Ghorra', x: GHORRA.x, z: GHORRA.z, owner: null, sector: 'west', radius: 24 },
  { id: 'I', name: 'Chemtou', x: CHEMTOU.x, z: CHEMTOU.z, owner: null, sector: 'centre', radius: 22 },
  { id: 'J', name: 'Fernana', x: FERNANA.x, z: FERNANA.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Ghardimaou', x: 0, z: -BASE_Z + 30, owner: 'pact', sector: 'centre' },
];

const layout = [{ unit: 'rifles', x: 12, z: BASE_Z - 20, name: '1st Platoon' }];

export default {
  id: 'medjerda',
  name: 'The Medjerda Valley',
  description: 'The Algerian–Tunisian border, winter 1942–43: the Axis strikes back at the Allied base round Souk Ahras. The winter-full Medjerda and its few crossings, Oued Meliz round the bridge and the railway, cork-oak and pine djebels, Roman hills, wheat plains, whitewashed colonial villages and olive groves.',
  epochs: ['1945'],
  region: 'africa', // (the menu’s North Africa: maps/index.js REGIONS)
  sides: { nato: 'Allies', pact: 'Germany' },
  armies: { nato: ['us', 'brit'], pact: ['wh', 'fj'] }, // (US II Corps and the British 1st Army against the 5th Panzer Army and its Fallschirmjäger)
  conditions: { time: 'day', weather: 'overcast' }, // (a wet January day in the Tell)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  overwatch: true,
  camera: { maxHeight: 620, far: 3200 },
  seed: 1943,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: (x: number, z: number) => (away(x, z) < 30 || inTown(x, z) ? 0 : hillK(x, z) > 0.12 ? 0.6 : smoothstep(0.1, 0.35, woods0(x, z)) * 0.4),
  fields: createFields({ seed: 194301, cell: 60, weights: [0.45, 0.3, 0.1, 0.15] as any }),

  theme: {
    // a grey, wet January day: low cloud on the djebels
    fogColor: 0xa2a69e, fogDensity: 0.0014, skyTop: 0x657280, skyHorizon: 0xb2b6ae, skyBottom: 0x6a6c64,
    sunColor: 0xece6d4, sunIntensity: 1.5, sunDisk: 0.08, clouds: 0.85, cloudLight: 0xc4c6c0, cloudDark: 0x62686c,
    sunDir: [0.4, 0.6, 0.55], hemiSky: 0xbac2c4, hemiGround: 0x4e5040, hemiIntensity: 1.3, rimColor: 0xc4c6c0, rimIntensity: 0.22,
    terrain: {
      grass: '#58703a', grassAlt: '#4f6834', dryGrass: '#7e7c50', dirt: '#5e4c3a', rock: '#7a7464',
      pasture: '#5e7a3c', ploughed: '#5a4636', stubble: '#8a8054', meadow: '#62803e',   // winter wheat coming up green, ploughed mud
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (Math.abs(z - railZ(x)) < 3) return [0x5a4e44, 0.9];                              // ballast
        const rd = roadD(x, z);
        if (rd < 3.4) return [0x7a6a54, 0.9];                                                // muddy roads
        if (inTown(x, z) && away(x, z) > HW + 4) return [0x8a7e6c, 0.6];
        if (away(x, z) < HW + 6 && y < 1.6) return [0x5a4a38, 0.9];                          // the Medjerda's red-brown mud banks
        const k = hillK(x, z);
        if (k > 0.1) { const n = fbm(noise, x * 0.03 + 7, z * 0.03, 2); return [n > 0 ? 0x3e4c2a : 0x6a5a40, (0.35 + Math.abs(n) * 0.5) * Math.min(1, k * 3)]; } // leaf litter, needles, red earth
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-250, 0, 250] }, pact: { x: 0, z: -BASE_Z, entries: [-250, 0, 250] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -330 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 3, z) - terrain.heightAt(x - 3, z), terrain.heightAt(x, z + 3) - terrain.heightAt(x, z - 3)) / 6;
    const clear = (x: number, z: number, r: number) => roadD(x, z) > r + 4 && away(x, z) > HW + r + 6 && Math.abs(z - railZ(x)) > r + 4 && steepAt(x, z) < 0.22;
    /** A colonial house, whitewashed under red tiles (townHouse with its plaster drawn pale). */
    const white = (o: any) => { const base = props.rand; let k = 0; props.rand = () => (k < 3 ? [0.3, 0, 1][k++] : base()); props.townHouse(o); props.rand = base; };

    // ---- the railway along the eastern bank, Oued Meliz station, wagons in the siding
    for (let x = -520; x < 520; x += 20) props.rails({ x0: x, z0: railZ(x), x1: x + 20, z1: railZ(x + 20) });
    const yawAt = (x: number) => Math.atan2(1, (railZ(x + 1) - railZ(x - 1)) / 2);
    props.rand = mulberry32(4301);
    white({ x: -60, z: railZ(-60) - 11, yaw: yawAt(-60) - Math.PI / 2, width: 16, depth: 8, storeys: 2, name: 'Oued Meliz station', damaged: 0.2 });
    props.hall({ x: -100, z: railZ(-100) - 12, yaw: yawAt(-100), width: 20, depth: 9, height: 5, color: 0xb0a48c, roof: 0x7a4a36, door: 5, name: 'goods shed' });
    for (const [x, kind, c] of [[-150, 'box', 0x6a4a36], [-164, 'box', 0x5e4232], [-178, 'tank', 0x3a3a34], [160, 'open', 0x5a4a3a], [380, 'box', 0x6a4a36]] as [number, string, number][]) {
      props.wagon({ x, z: railZ(x), yaw: yawAt(x), kind, color: c });
    }

    // ---- Oued Meliz: whitewashed houses on both banks round the bridge, the church, sandbags at the bridgeheads
    props.rand = mulberry32(4302);
    {
      const r = props.rand, placed: number[][] = [];
      props.church({ x: 60, z: rz(60) + 32, yaw: 0.1 }); placed.push([60, rz(60) + 32, 12]);
      for (let gx = -90; gx <= 100; gx += 16) {
        for (let gz = -70; gz <= 70; gz += 15) {
          const x = gx + (r() - 0.5) * 4, z = rz(gx) + gz + (r() - 0.5) * 4;
          const w = 8 + r() * 3, d = 7 + r() * 2, hw = Math.max(w, d) / 2;
          if (!inTown(x, z) || r() < 0.3 || !clear(x, z, hw) || nearPoint(x, z, 8 + hw) || placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + hw)) continue;
          placed.push([x, z, hw]);
          white({ x, z, yaw: yawAt(x) - Math.PI / 2 + (z > rz(x) ? Math.PI : 0) + (r() - 0.5) * 0.1, width: w, depth: d, storeys: r() < 0.4 ? 2 : 1, name: 'colonial house', damaged: 0.25 });
        }
      }
      props.sandbagRing({ x: 14, z: rz(14) + HW + 14, radius: 4.5, toward: -1 });
      props.sandbagRing({ x: -14, z: rz(-14) - HW - 14, radius: 4.5, toward: 1 });
    }

    // ---- the colonial farm villages, each round its church: Laverdure (Allied) and Fernana (German)
    const village = (cx: number, cz: number, n: number, spread: number, seed: number, church: boolean) => {
      const r = (props.rand = mulberry32(seed));
      const placed: number[][] = [];
      if (church && clear(cx + 20, cz - 26, 10)) { props.church({ x: cx + 20, z: cz - 26, yaw: 0.2 }); placed.push([cx + 20, cz - 26]); }
      for (let i = 0; i < n * 8 && placed.length < n; i++) {
        const a = r() * Math.PI * 2, dist = 16 + r() * spread, x = cx + Math.cos(a) * dist, z = cz + Math.sin(a) * dist;
        const w = 8 + r() * 3, d = 7 + r() * 2;
        if (!clear(x, z, w / 2) || nearPoint(x, z, 10 + w / 2) || placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 14)) continue;
        placed.push([x, z]);
        white({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + (r() - 0.5) * 0.2, width: w, depth: d, storeys: r() < 0.4 ? 2 : 1, name: 'farmhouse', damaged: 0.15 });
        if (r() < 0.5) { const [wx, wz] = PropBuilder.local(x, z, a, 0, 9); if (clear(wx, wz, 6)) props.lowWall({ x: wx, z: wz, yaw: a, length: 12, height: 1.3, color: 0xd8d2c4 }); }
      }
    };
    village(LAVERDURE.x, LAVERDURE.z, 10, 42, 4303, true);
    village(FERNANA.x, FERNANA.z, 10, 42, 4304, true);
    village(-70, BASE_Z - 40, 4, 30, 4305, false);   // Souk Ahras's edge
    village(70, -BASE_Z + 40, 4, 30, 4306, false);   // Ghardimaou's edge
    // ---- the douars by the river: Taoura (Allied bank) and Sakiet Sidi Youssef (German bank)
    const skip = (x: number, z: number) => !clear(x, z, 6) || nearPoint(x, z, 12);
    arabVillage(props, TAOURA.x, TAOURA.z, 8, 4307, skip, true);
    arabVillage(props, SAKIET.x, SAKIET.z, 8, 4308, skip, true);

    // ---- the Roman hills: Thubursicum's columns and walls on Khemissa, Simitthu's marble quarry on Chemtou
    props.rand = mulberry32(4309);
    for (const [lx, lz] of [[-14, -10], [-8, -10], [-2, -10], [4, -10], [-14, 10], [4, 10]]) props.column({ x: KHEMISSA.x + lx - 6, z: KHEMISSA.z + lz + 22, radius: 0.6, height: 4 + props.rand() * 3 });
    for (const [lx, lz, y, L] of [[-30, 0, 0, 24], [18, -16, Math.PI / 2, 18], [24, 16, 0.2, 14]] as number[][]) props.lowWall({ x: KHEMISSA.x + lx, z: KHEMISSA.z + lz, yaw: y, length: L, height: 1.6, color: 0xb8ae98 });
    for (const [lx, lz, y, L] of [[30, 6, 0.4, 22], [-6, -26, 1.2, 16], [36, -20, 0.1, 12]] as number[][]) props.lowWall({ x: CHEMTOU.x + lx, z: CHEMTOU.z + lz, yaw: y, length: L, height: 2.6, color: 0xd4c8b0 }); // quarry faces
    for (let k = 0; k < 10; k++) props.boulder({ x: CHEMTOU.x + 20 + (props.rand() - 0.5) * 40, z: CHEMTOU.z - 28 + (props.rand() - 0.5) * 20, radius: 1 + props.rand() * 1.4 });
    props.sandbagRing({ x: KHEMISSA.x - 14, z: KHEMISSA.z - 14, radius: 4.5, toward: -1 });
    props.sandbagRing({ x: CHEMTOU.x + 12, z: CHEMTOU.z + 12, radius: 4.5, toward: 1 });
    // observation posts on the djebels
    props.sandbagRing({ x: BENI.x + 18, z: BENI.z - 14, radius: 5, toward: -1 });
    props.sandbagRing({ x: GHORRA.x + 18, z: GHORRA.z + 14, radius: 5, toward: 1 });

    // ---- lone farms in the wheat plain, their walls
    const r = mulberry32(4310);
    for (let i = 0, n = 0; i < 3000 && n < 36; i++) {
      const x = (r() * 2 - 1) * 470, z = (n % 2 ? -1 : 1) * (40 + r() * 470);
      if (!clear(x, z, 8) || nearPoint(x, z, 45) || inTown(x, z) || hillK(x, z) > 0.05 || Math.hypot(x, Math.abs(z) - BASE_Z) < 50) continue;
      n++;
      const yaw = r() * 3;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      white({ x, z, yaw, width: 10 + r() * 3, depth: 7, storeys: r() < 0.5 ? 1 : 2, name: 'colonial farm', damaged: 0.2 });
      const [wx, wz] = PropBuilder.local(x, z, yaw, 0, 9);
      if (clear(wx, wz, 8)) props.lowWall({ x: wx, z: wz, yaw, length: 16, height: 1.3, color: 0xd4cec0 });
      if (r() < 0.4) props.hayBales({ x: x + 12, z: z + 4, yaw, count: 3 });
    }
    commandPost(props, this.bases.nato, -1, 0x5e5e44);
    commandPost(props, this.bases.pact, 1, 0x56584a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => away(x, z) < HW + 5 || roadD(x, z) < 5.5 || Math.abs(z - railZ(x)) < 5 || inTown(x, z) }];
    // cork oak and Aleppo pine on the djebels and the knolls
    const forest = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 7000, broadleaf: 0.6, autumn: 0.05, size: 0.8, maxY: 90,
      forest: (x: number, z: number) => { const k = hillK(x, z); return k < 0.08 ? 0 : Math.min(0.85, 0.35 + k + woods0(x * 2, z * 2) * 0.4); },
    });
    // olive groves round the villages and in the plain, willows and poplars along the river
    const olives = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4000, broadleaf: 1, autumn: 0, size: 0.55, maxY: 40,
      forest: (x: number, z: number) => {
        if (hillK(x, z) > 0.08) return 0;
        const o = smoothstep(0.12, 0.35, woods0(x, z)) * 0.5;
        const v = [LAVERDURE, FERNANA, TAOURA, SAKIET].some((p) => { const d = Math.hypot(x - p.x, z - p.z); return d > 60 && d < 110; }) ? 0.35 : 0;
        return Math.max(o, v, smoothstep(HW + 14, HW + 7, away(x, z)) * 0.5);
      },
    });
    cover.finalize(bounds);
    const grow = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { grow.update(dt, t); forest.update?.(dt, t); olives.update?.(dt, t); },
    };
  },
} satisfies MapDef;
