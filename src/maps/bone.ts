// Bône (Annaba), eastern Algeria, winter 1942–43 (1945 epoch; coastal: the Germans land, the Allies hold; 1.0 × 1.8 km).
// The landing that was talked of and never made. After Torch the First Army’s whole supply line to Tunisia ran through
// one port: Bône, its moles and quays crowded with Liberty ships and LSTs, bombed night after night from Sardinia and
// Sicily. In Rome and at Kesselring’s headquarters the idea came up more than once that winter: put the Fallschirmjäger
// and a regiment or two from Sicily and Sardinia ashore in the Gulf of Bône, in Pionierlandungsboote and the navy’s
// Marinefährprähme under destroyer and S-boat escort, take the port and the Les Salines airfield and cut the road and
// the railway to the front at a stroke. There were never the boats, the fuel nor the escorts, and it stayed a plan.
// On the map, from the gulf looking inland (the real coast faces east; here the sea is toward -z): on the right the
// Edough massif, cork oak and Aleppo pine, coming down to the sea in rock past Saint-Cloud’s little beach on the
// Corniche; the old town (the Casbah) on its hill over the sea, white flat-roofed houses and the Sidi Bou Merouane
// mosque; the port in the middle between its two moles, the quays with their cranes and warehouses, one slipway
// (the Darse’s) the only way up the quay wall for vehicles, the station and the railway inland; behind the port the
// French colonial town, the Cours Bertagna with its palms, the cathedral and the theatre. On the left the Seybouse
// coming out into the gulf, deep and muddy in winter, crossed only by the coast road bridge by its mouth and the
// Duzerville bridge inland; beyond it the dunes and the long beach at Sidi Salem, the marshy plain behind, and the
// Les Salines airfield on it. Inland Hippo Regius’ ruins under the hill of the Saint-Augustin basilica, the Route de
// Constantine and the railway running back to Duzerville, the junction toward Souk Ahras and Tunisia.
// (Compressed: the gulf’s shore from the Corniche to Sidi Salem is some 6 km, here a kilometre.)
// How it plays: three beaches, each its own way in. Saint-Cloud is small and under the Casbah’s guns, but the road
// from it climbs straight into the old town; the port is the shortest way to the town, but the men cross a narrow
// strand under the quay wall and the vehicles come up one slipway; Sidi Salem is wide open sand with dunes, the
// strongpoints few, but the airfield is far behind it across soft marsh, and the counter-attack comes over the
// Duzerville bridge. The Allied reserve (whichever army holds Bône) comes up the Route de Constantine after seven
// minutes. Not point-mirrored: one side lands, the other holds (modes/landing).
// Laid out in a frame with the sea toward +z (local) and turned half round (`W`): the Germans are the Pact, their side
// is -z, so the sea is there (systems/Landing.js: the side whose base is out at sea lands).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1942_12);
const sea = createSea({ level: 0, size: SIZE, color: 0x2c5868 }); // (the gulf in winter: grey-blue, the Seybouse’s silt off its mouth)
/** Local (sea +z, the Edough +x) → world: turned half round, so the sea is -z and nothing is mirrored. */
const W = (x: number, z: number) => ({ x: -x, z: -z });

type P2 = [number, number];
const segD = (x: number, z: number, [ax, az]: P2, [bx, bz]: P2) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const polyD = (x: number, z: number, p: P2[]) => { let d = Infinity; for (let i = 1; i < p.length; i++) d = Math.min(d, segD(x, z, p[i - 1], p[i])); return d; };

/** The waterline (local z): the gulf’s shore, the Edough’s rock pushing out past Saint-Cloud. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 3.3, 2) * 8 + 46 * smoothstep(430, 500, x);
/** The port (0..1 across x): the quays between the two moles’ roots. */
const portK = (x: number) => smoothstep(28, 42, x) * smoothstep(232, 218, x);
const SLIP = 110; // x of the Darse’s slipway up the quay wall (the port’s beach sector)
/** The moles: the Jetée Nord off the Casbah’s foot, the Jetée Sud off the station, the harbour mouth between their heads. */
const MOLES: P2[][] = [[[235, 130], [235, 362]], [[25, 130], [25, 302]]];
/** The Seybouse (its middle line, local), from out in the gulf off its mouth to the inland edge. */
const RIVER: P2[] = [[-100, 320], [-108, 150], [-118, 88], [-150, -100], [-175, -250], [-200, -420], [-232, -560], [-270, -760], [-300, -950]];
/** Its winding: a few metres either way between the bridges, none at them (88, -560: the bridges’ vertices). */
const riverD = (x: number, z: number) => polyD(x + (z < 88 && z > -776 ? 13 * Math.sin(((z - 88) * Math.PI) / 216) : 0), z, RIVER);
/** The rock under the Edough on the right, beyond Saint-Cloud (0..1). */
const rockK = (x: number) => smoothstep(440, 490, x);

/** The roads (local polylines). */
const ROADS: P2[][] = [
  [[-520, 96], [-330, 94], [-250, 93], [-118, 88], [0, 84], [SLIP, 80], [235, 86], [330, 98], [420, 102], [520, 96]], // the coast road: Sidi Salem – the Seybouse bridge – the quays – the Corniche
  [[SLIP, 80], [SLIP, -60], [60, -200], [0, -400], [-60, -640], [-40, -910]],                                       // the Route de Constantine: up the Cours Bertagna and on to Duzerville
  [[-250, 93], [-248, -110], [-262, -330], [-310, -545], [-232, -560], [-160, -575], [-60, -640]],                  // to Les Salines, and on over the Duzerville bridge
  [[235, 86], [268, 35], [295, -15]],                                                                              // up into the Casbah from the quays
  [[390, 100], [350, 35], [295, -15]],                                                                             // up into the Casbah from Saint-Cloud
  [[295, -15], [200, -60], [SLIP, -60]],                                                                           // the Casbah to the Cours Bertagna
  [[40, -250], [-25, -290]],                                                                                       // up to the basilica
];
const roadD = (x: number, z: number) => { let d = Infinity; for (const r of ROADS) d = Math.min(d, polyD(x, z, r)); return d; };
/** The railway: Bône station by the Jetée Sud, inland to Duzerville and on toward Souk Ahras and Tunisia. */
const RAIL: P2[] = [[60, 70], [30, -60], [-10, -300], [-100, -620], [-130, -910]];
const railD = (x: number, z: number) => polyD(x, z, RAIL);

/** The Casbah’s hill over the sea (0..1 at its top) and Hippo Regius’ basilica hill. */
const CASBAH = { x: 300, back: 170 };
const casbahE = (x: number, back: number) => Math.hypot((x - CASBAH.x) / 115, (back - CASBAH.back) / (back < CASBAH.back ? 100 : 130));
const HIPPO = { x: -30, z: -300 };
/** The Edough massif: rising inland and to the right, 80 m and more in the far corner. */
function edough(x: number, back: number) {
  const t = (x - 220) / 260 + (back - 520) / 560;
  if (t <= 0) return 0;
  return 85 * Math.pow(smoothstep(0, 1.3, t), 1.2) + ridged(noise, x * 0.01 + 3, back * 0.01, 2) * 9 * smoothstep(0, 0.5, t);
}

const AIR = { x: -370, z: -200 };                 // the Les Salines airfield’s tower (local): the strip runs along z 55 m to its left
const onStrip = (x: number, z: number, m = 0) => Math.abs(x + 315) < 16 + m && z > -320 - m && z < -80 + m;
const G_PT = { x: -245, z: -110 }, K_PT = { x: -60, z: -640 };

/** The Seybouse plain’s marsh and wet meadows (0..1): soft going, reeds. Not on the roads, the airfield or the points. */
function marshRaw(x: number, z: number) {
  const back = shoreZ(x) - z;
  if (back < 110 || z < -890) return 0;
  let m = smoothstep(-0.05, 0.25, fbm(noise, x * 0.006 + 11, z * 0.006, 2)) * smoothstep(-60, -170, x);
  const rd = riverD(x, z);
  m = Math.max(m, 0.8 * smoothstep(58, 26, rd) * smoothstep(0, -60, x + 60));
  m *= smoothstep(6, 14, roadD(x, z)) * smoothstep(4, 10, railD(x, z));
  m *= 1 - (1 - smoothstep(40, 80, Math.abs(x + 315))) * (1 - smoothstep(-60, -20, z)) * (1 - smoothstep(-340, -380, z)); // (the airfield: drained)
  m *= smoothstep(40, 70, Math.hypot(x - G_PT.x, z - G_PT.z)) * smoothstep(50, 80, Math.hypot(x - K_PT.x, z - K_PT.z));
  return Math.max(0, m);
}
const marshC = gridCacheSmooth(marshRaw, BOUNDS, 4);
const marshN = gridCache(marshRaw, BOUNDS, 4);

/** The land behind the beaches: the plain, the town rising toward the hills, the Edough, the two hills, the marsh lower. */
function landH(x: number, z: number) {
  const back = shoreZ(x) - z;
  let h = 2.5 + Math.max(0, back - 100) * 0.002 + fbm(noise, x * 0.005, z * 0.005, 3) * 0.8;
  h += 5 * smoothstep(-20, 260, x) * smoothstep(60, 320, back);                                       // the town climbing toward the Edough
  h += edough(x, back);
  const ce = casbahE(x, back);
  if (ce < 1) h += 19 * smoothstep(1, 0.3, ce) + fbm(noise, x * 0.03, z * 0.03, 2) * 1.2 * smoothstep(1, 0.5, ce);
  const he = Math.hypot((x - HIPPO.x) / 105, (z - HIPPO.z) / 95);
  if (he < 1) h += 22 * smoothstep(1, 0.3, he);
  h -= 0.9 * marshRaw(x, z);
  return h;
}
const landC = gridCacheSmooth(landH, BOUNDS, 2);
const BASE_H = landH(0, -830);

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz;
  let h: number;
  if (d > 0) { // the bottom: shelving off the sand, deeper out; the harbour dredged between the moles; rock off the Edough
    h = 0.5 - d * 0.035 - Math.max(0, d - 110) * 0.06 + rockK(x) * Math.max(0, 2.5 - d * 0.04) * (0.6 + noise(x * 0.05, z * 0.05));
    if (x > 30 && x < 230 && z < 372) h = Math.min(h, Math.max(0.4 - d * 0.15, -7));
    h = Math.max(h, -18);
  } else {
    const back = -d;
    // the sand (36 m), the dunes at Sidi Salem, then the land
    const beach = 0.5 + Math.min(back, 36) * 0.045;
    const dk = smoothstep(-140, -190, x);
    const dune = dk > 0 ? (1.2 + ridged(noise, x * 0.02 + 7, z * 0.03, 2) * 1.8) * dk * smoothstep(30, 46, back) * smoothstep(105, 75, back) : 0;
    const t = smoothstep(36, 100, back);
    h = (beach + dune) * (1 - t) + landC(x, z) * t;
    // the Edough’s rock coming down to the sea past Saint-Cloud
    const rk = rockK(x);
    if (rk > 0) h = Math.max(h, h + rk * Math.min(back * 0.32, 18));
    // the port: a strand under a 3 m quay wall, the quays, one slipway up the wall
    const pk = portK(x);
    if (pk > 0) {
      let q = back < 28 ? 0.4 + back * 0.03 : back < 30 ? 1.24 + (back - 28) * 0.98 : 3.2 + (Math.max(3.2, landC(x, z)) - 3.2) * smoothstep(70, 200, back);
      q += (Math.min(q, 0.4 + back * 0.09) - q) * smoothstep(16, 8, Math.abs(x - SLIP)); // (the slipway: 1 in 11)
      h += (q - h) * pk * smoothstep(240, 180, back);
    }
  }
  // the moles: 2.6 m of masonry on a rubble mound
  let md = Infinity;
  for (const m of MOLES) md = Math.min(md, segD(x, z, m[0], m[1]));
  if (md < 14) h = Math.max(h, md < 6 ? 2.6 : 2.6 + ((md - 6) / 8) * (h - 2.6));
  // the Seybouse: 2 m of brown water between muddy banks, out through the sand into the gulf; crossed only at the bridges
  if (d < 60) {
    const rd = riverD(x, z);
    if (rd < 24 && (d > 0 || roadD(x, z) >= 8)) h = Math.min(h, rd < 10 ? -2.2 : -2.2 + ((rd - 10) / 14) * (h + 2.2));
  }
  // the defence’s base inland: flat
  h += (BASE_H - h) * smoothstep(60, 25, Math.hypot(x, z + 830));
  return h;
}
const height = (x: number, z: number) => heightL(-x, -z);

/** The beach sectors (local x, left to right as the boats see them): Sidi Salem, the port, Saint-Cloud. In world x they run the other way. */
export const SECTORS = [{ x: 390, name: 'Saint-Cloud beach' }, { x: SLIP, name: 'Port of Bône' }, { x: -330, name: 'Sidi Salem beach' }];
const PL: Record<string, P2> = { // the points, local
  A: [0, 770], B: [390, shoreZ(390) - 34], C: [SLIP, shoreZ(SLIP) - 40], D: [-330, shoreZ(-330) - 34],
  E: [295, -15], F: [SLIP, -60], G: [G_PT.x, G_PT.z], K: [K_PT.x, K_PT.z],
};
const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', ...W(...PL.A), owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the place behind once taken)
  { id: 'B', name: 'Saint-Cloud beach', ...W(...PL.B), owner: null, sector: 'west', radius: 45, opens: 'E' },
  { id: 'C', name: 'Port of Bône', ...W(...PL.C), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Sidi Salem beach', ...W(...PL.D), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'The Casbah', ...W(...PL.E), owner: null, sector: 'west' },
  { id: 'F', name: 'Cours Bertagna', ...W(...PL.F), owner: null, sector: 'centre' },
  { id: 'G', name: 'Les Salines airfield', ...W(...PL.G), owner: null, sector: 'east' },
  { id: 'K', name: 'Duzerville', ...W(...PL.K), owner: 'nato', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => Object.values(PL).some(([px, pz]) => Math.hypot(px - x, pz - z) < r);

/** The coast defences (local): a strongpoint over each beach, the Darse’s on the quay; two coast batteries. */
const FORTS_L = [
  { unit: 'wn', x: 345, z: shoreZ(345) - 62, name: 'Saint-Cloud strongpoint' },
  { unit: 'wn', x: 48, z: shoreZ(48) - 46, name: 'Darse strongpoint' },
  { unit: 'wn', x: -415, z: shoreZ(-415) - 62, name: 'Sidi Salem strongpoint' },
  { unit: 'battery', x: 455, z: shoreZ(455) - 110, name: 'Fort Génois battery' },
  { unit: 'battery', x: 25, z: -350, name: 'Hippone battery' },
];
const BK = (x: number, b: number) => W(x, shoreZ(x) - b);
/** Where the wire runs along the top of each beach (local x → m back), none across the river mouth, the moles or the rock. */
const wireBack = (x: number) => (x > 438 || Math.abs(x + 110) < 34 || Math.abs(x - 25) < 10 || Math.abs(x - 235) < 10 ? 0 : portK(x) > 0.5 ? (Math.abs(x - SLIP) < 13 ? 0 : 22) : 40);
/** Woods (local): cork oak and pine on the Edough, scrub on its rocks; off the roads and the points. */
const woodsK = (x: number, z: number) => {
  const back = shoreZ(x) - z;
  return Math.max(smoothstep(6, 18, edough(x, back)), rockK(x) * smoothstep(20, 40, back)) * smoothstep(5, 12, roadD(x, z)) * (nearPoint(x, z, 30) ? 0 : 1);
};
const woodsC = gridCache(woodsK, BOUNDS);
/** The French town behind the port, and the old town on its hill. */
const townK = (x: number, back: number) => smoothstep(-10, 10, x) * smoothstep(255, 235, x) * smoothstep(95, 110, back) * smoothstep(345, 320, back) * (casbahE(x, back) < 1.05 ? 0 : 1);
const oldK = (x: number, back: number) => (casbahE(x, back) < 0.95 ? 1 : 0);

export default {
  id: 'bone',
  name: 'Bône',
  description: 'Eastern Algeria, winter 1942–43, the Axis landing that was never made: the port of Bône between its moles, the Casbah on its hill and the French town behind the quays, Saint-Cloud under the cork-oak Edough, the Seybouse’s mouth and the marshy plain with the Les Salines airfield. The Germans land from Sicily and Sardinia; the Allies hold their supply port.',
  epochs: ['1945'],
  region: 'africa', // (North Africa: the British 8th Army’s roster is tied to it — data/factions.js armiesFrom)
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Allies', pact: 'Germany' },
  armies: { nato: ['us', 'brit'], pact: ['wh', 'fj'] }, // (the First Army’s base troops and the US forces in the port against the Wehrmacht and the Fallschirmjäger)
  conditions: { time: 'dawn', weather: 'overcast' }, // (a grey January dawn over the gulf)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  airfields: [{ faction: 'nato', ...W(AIR.x, AIR.z), yaw: 0, large: false }], // (Les Salines, on the plain behind Sidi Salem: the strip along the coast-to-inland line)
  steep: 0.45, // (vehicles: the quay wall and the Edough’s rock are no way up — the slipway and the roads are)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1942,
  height,
  river: sea,
  soft(x: number, z: number, foot: boolean) {
    const lx = -x, lz = -z;
    const m = marshN(lx, lz);
    return m <= 0.05 ? 1 : 1 - m * (foot ? 0.3 : 0.55);
  },
  woods: (x: number, z: number) => woodsC(-x, -z) * 0.85,
  fields: createFields({ seed: 1942, cell: 60, weights: [0.4, 0.25, 0.15, 0.2] as any }), // (January: winter wheat coming up, ploughland, the vineyards bare)

  theme: {
    // a grey winter dawn over the gulf, low cloud on the Edough, the light coming up over the sea
    fogColor: 0xa8aca6, fogDensity: 0.0008,
    skyTop: 0x5e6e80, skyHorizon: 0xc8c2b2, skyBottom: 0x6a6a60,
    sunColor: 0xf2dcc0, sunIntensity: 1.5, sunDisk: 0.15,
    clouds: 0.75, cloudLight: 0xd2d0c8, cloudDark: 0x6a7076,
    sunDir: [0.3, 0.35, -0.8],
    hemiSky: 0xbcc4c8, hemiGround: 0x50523e, hemiIntensity: 1.3,
    rimColor: 0xd8d2c6, rimIntensity: 0.22,
    terrain: {
      grass: '#5a723c', grassAlt: '#506a36', dryGrass: '#847e52', dirt: '#6a5038', rock: '#7c7464',
      pasture: '#5e7a3c', ploughed: '#5e4632', stubble: '#8a8054', meadow: '#62803e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lx = -x, lz = -z, sz = shoreZ(lx), back = sz - lz;
        const pk = portK(lx);
        if (back > 30 && roadD(lx, lz) < (townK(lx, back) > 0.5 || pk > 0.5 ? 5 : 3.4)) return [0x6e6a62, 0.88];      // tarmac and setts
        if (back > 6 && railD(lx, lz) < 3) return [0x4e4640, 0.9];                                                   // ballast
        let md = Infinity;
        for (const m of MOLES) md = Math.min(md, segD(lx, lz, m[0], m[1]));
        if (md < 7 && y > 1.5) return [0x9a968a, 1];                                                                 // the moles’ masonry
        if (back < -3) return [y > -1.5 ? 0xa89a7a : 0x7a7060, 1];                                                    // the sand under the water
        if (riverD(lx, lz) < 26 && y < 1.8) return [0x5e5040, 0.95];                                                  // the Seybouse’s mud banks
        if (pk > 0.5 && back < 29) return [0x8a806a, 1];                                                              // the strand under the quay: gravel and sand
        if (pk > 0.5 && back < 190) return [0x8e8a80, 0.95];                                                          // the quays’ concrete
        if (rockK(lx) > 0.4 && back < 90 && y > 2) return [0x7a7262, 0.8];                                            // the Edough’s rock
        if (back < 38) return [0xcabc96, 1];                                                                          // the sand
        if (back < 100 && lx < -140) return [0xc0b08a, 0.55 + Math.max(0, fbm(noise, lx * 0.05, lz * 0.05, 2)) * 0.4]; // the dunes: sand, marram, lentisk
        if (onStrip(lx, lz, 14)) return [0x7e7e56, 0.8];                                                              // the airfield’s grass
        if (oldK(lx, back) > 0.5) return [0xa89e88, 0.7];                                                            // the Casbah’s lanes
        if (townK(lx, back) > 0.5) return [0x8e887a, 0.6];                                                           // the town’s yards and squares
        const m = marshN(lx, lz);
        if (m > 0.35) { const k = noise(lx * 0.05, lz * 0.05); return [k > 0.2 ? 0x6e7448 : k > -0.3 ? 0x5a6a44 : 0x4a5a48, Math.min(1, m * 1.1)]; } // reeds, rushes, standing water
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [90, -20, -360].map((x) => -x) }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => -s.x) } }, // (the Germans land: their roads are the beach sectors)
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 60 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // the landing craft: Pionierlandungsboote for the men, Marinefährprähme for the vehicles (data/units45/ships.js lcvp, lct)
    craft: { infantry: 'lcvp', vehicle: 'lct' },
    // what the landing may call in at sea: the destroyers, the minesweepers, the S-boats (no capital ship: the Italian fleet stayed in port)
    navy: ['destroyer', 'minesweeper', 'ptBoat'],
    // the Royal Navy’s defensive minefield across the gulf, lanes swept ahead of the boats
    seaMines: { z: [480, 540], count: 50, lanes: SECTORS.map((s) => -s.x), lane: 80, seed: 1942_12 },
    forts: FORTS_L.map((f) => ({ unit: f.unit, ...W(f.x, f.z), facing: Math.PI, name: f.name })),
    names: { wn: 'Strongpoint', battery: 'Coast battery' },
    // wire along the top of each beach and along the strand under the quay, tank traps in the slipway, mines, trenches and MG posts over each beach
    works: [
      ...Array.from({ length: 92 }, (_, i) => { const x = -500 + i * 11, b = wireBack(x); return b ? { kind: 'wire', ...BK(x, b), yaw: 0 } : null; }).filter(Boolean),
      ...[-12, -4, 4, 12].map((dx) => ({ kind: 'tankTraps', ...BK(SLIP + dx, 22), yaw: 0 })),
      ...SECTORS.flatMap((s, i) => [-38, 38].map((dx) => ({ kind: 'mines', ...BK(s.x + dx, i === 1 ? 52 : 62) }))),
      ...SECTORS.flatMap((s, i) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...BK(s.x + dx, i === 1 ? 48 : 56), yaw: 0 }))),
      ...SECTORS.flatMap((s, i) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...BK(s.x + dx, i === 1 ? 42 : 48), yaw: 0 }))),
      ...[-16, 16].map((dz) => ({ kind: 'trench', ...W(-140, 88 + dz), yaw: Math.PI / 2 })), // (the coast road bridge’s town end)
    ],
    // the defence at dawn: the base troops and the port’s garrison over each beach, the AA round the port, men in the towns and on the airfield
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'atTeam', 'mortar', 'rifles', 'atTeam', 'towedAA', 'sam', 'mgTeam', 'scouts', 'tankDestroyer'],
    hold: [
      ...SECTORS.flatMap((s, i) => [-45, -22, 22, 45].map((dx) => BK(s.x + dx, (i === 1 ? 44 : 50) + (Math.abs(dx) < 30 ? 0 : 8)))),
      W(-150, 88), W(...PL.E), W(...PL.F), W(...PL.G),
    ],
    // the counter-attack: the reserve from Duzerville up the Route de Constantine and over the Duzerville bridge
    counter: { t: 420, units: ['tank', 'ifv', 'heavyTank', 'rifles', 'tankDestroyer', 'ifv'], say: 'The reserve is coming up from Duzerville: tanks and carriers on the Route de Constantine and over the Seybouse', sayOther: 'Enemy armour coming up from Duzerville, along the Constantine road and over the Seybouse bridge' },
    // the landing’s AI (ai/LandingDirector.js): two destroyers inshore; no AI sweeper (one working beside a lane holds the boats: as Hythe)
    ai: { order: ['rifles', 'rifles', 'engineers', 'rifles', 'mgTeam', 'tank', 'rifles', 'atTeam', 'mortar', 'rifles', 'tank', 'engineers'], gunship: 'destroyer', gunships: 2, sweeper: null, heavy: null },
    economy: { reserves: 3000, perSector: 900, beachIncome: 1.2, defenceCp: 700, defenceIncome: 1.1 },
    // the first wave at dawn, onto all three beaches at once
    waves: [{ t: 0, say: 'Dawn: the first wave is going in — Saint-Cloud, the port, Sidi Salem', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'engineers', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1942_12);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(-x, -z); // (local)
    const PI = Math.PI;
    const placed: number[][] = [];
    const flat = (x: number, z: number, rr: number, k = 0.3) => {
      const hs = [heightL(x - rr, z), heightL(x + rr, z), heightL(x, z - rr), heightL(x, z + rr), heightL(x, z)];
      return Math.max(...hs) - Math.min(...hs) < rr * k;
    };
    const free = (x: number, z: number, rr: number, minBack = 40, k = 0.3) =>
      roadD(x, z) > rr + 4 && railD(x, z) > rr + 4 && riverD(x, z) > rr + 26 && !nearPoint(x, z, rr + 14)
      && FORTS_L.every((f) => Math.hypot(f.x - x, f.z - z) > rr + 22) && shoreZ(x) - z > minBack && heightL(x, z) > 1
      && !onStrip(x, z, rr + 30) && Math.hypot(x - AIR.x, z - AIR.z) > rr + 70
      && flat(x, z, rr, k) && placed.every(([qx, qz, qr]) => Math.hypot(qx - x, qz - z) > qr + rr) && Math.hypot(x, z + 830) > 50;
    const take = (x: number, z: number, rr: number) => { placed.push([x, z, rr]); };
    /** A colonial house, whitewashed under red tiles (townHouse with its plaster drawn pale: as the Medjerda’s). */
    const white = (o: any) => { const base = props.rand; let k = 0; props.rand = () => (k < 3 ? [0.3, 0, 1][k++] : base()); props.townHouse(o); props.rand = base; };

    // ---- the moles: a lighthouse on each head, bollards along the Jetée Nord
    for (const m of MOLES) {
      const [hx, hz] = m[1], p = W(hx, hz), y = g(hx, hz);
      props.box('stone', p.x, y + 5, p.z, 2.6, 10, 2.6, 0, 0xe6e2d8);
      props.box('metal', p.x, y + 10.8, p.z, 3, 1.6, 3, 0, m === MOLES[0] ? 0xa83228 : 0x2a6a3a);
      cover.addBox({ x: p.x, z: p.z, yaw: 0, length: 2.6, thickness: 2.6, height: 10 });
    }
    // ---- the quays: portal cranes, warehouses behind, a coaster sunk alongside after the raids, the station and its yard
    const crane = (x: number, z: number) => {
      const y = g(x, z), p = W(x, z), red = 0x6a4a3a;
      for (const [ax, az] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) props.box('metal', p.x + ax, y + 4, p.z + az, 0.6, 8, 0.6, 0, red);
      props.box('metal', p.x, y + 8.4, p.z, 7.4, 0.8, 7.4, 0, red);
      props.box('metal', p.x, y + 12.8, p.z, 2.2, 8, 2.2, 0, red);
      props.box('metal', p.x, y + 17.8, p.z + 0.5, 4, 3, 5.5, 0, 0x8a8a7a);
      props.box('metal', p.x, y + 19, p.z - 9.5, 0.9, 0.9, 20, 0, red); // (the jib out over the water)
      cover.addCylinder({ x: p.x, z: p.z, radius: 1.4, height: 12 });
      take(x, z, 6);
    };
    for (const x of [60, 85, 140, 170, 200]) crane(x, shoreZ(x) - 36);
    for (const [x, w] of [[70, 36], [160, 40], [205, 26]] as [number, number][]) {
      const z = shoreZ(x) - 112;
      if (!free(x, z, w / 2, 60)) continue;
      props.hall({ ...W(x, z), yaw: 0, width: w, depth: 16, height: 8, color: 0x9a907c, roof: 0x5a4a40, door: 8, name: 'warehouse' });
      take(x, z, w / 2 + 2);
    }
    for (let i = 0; i < 5; i++) { const x = 128 + i * 7, z = shoreZ(x) - 52; if (free(x, z, 3, 30)) { props.crates({ ...W(x, z), yaw: r() }); take(x, z, 3); } }
    { const x = 55, z = 45; if (free(x, z, 12, 60)) { white({ ...W(x, z), yaw: PI / 2, width: 26, depth: 10, storeys: 2, name: 'Bône station', damaged: 0.1 }); take(x, z, 14); } }
    for (let i = 0; i < 46; i++) { const t0 = i / 46, t1 = (i + 1) / 46; const a = railAt(t0), b = railAt(t1); props.rails({ x0: -a[0], z0: -a[1], x1: -b[0], z1: -b[1] }); }
    for (const [t, kind, c] of [[0.05, 'box', 0x6a4a36], [0.07, 'box', 0x5e4232], [0.09, 'tank', 0x3a3a34], [0.6, 'open', 0x5a4a3a]] as [number, string, number][]) {
      const a = railAt(t), b = railAt(t + 0.002);
      props.wagon({ x: -a[0], z: -a[1], yaw: Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])), kind, color: c });
    }

    // ---- the Seybouse bridges: a deck and parapets over each crossing
    for (const [bx, bz] of [[-118, 88], [-232, -560]] as P2[]) {
      const p = W(bx, bz), y = Math.max(g(bx - 20, bz), g(bx + 20, bz), 2.2);
      props.box('stone', p.x, y - 0.2, p.z, 40, 0.6, 9, 0, 0x8a8478);
      for (const s of [-1, 1]) props.box('stone', p.x, y + 0.6, p.z + s * 4.3, 40, 1, 0.5, 0, 0x9a9282);
      for (const s of [-1, 1]) props.box('stone', p.x + s * 9, y - 2.4, p.z, 2.2, 4, 8, 0, 0x7a7466);
    }

    // ---- the Casbah: white flat-roofed houses packed on the hill, the mosque and its minaret, a stretch of the old wall
    { const x = CASBAH.x + 15, z = shoreZ(CASBAH.x) - CASBAH.back - 10, p = W(x, z), y = g(x, z);
      props.flatHouse({ ...p, yaw: 0, width: 16, depth: 16, storeys: 1, name: 'Sidi Bou Merouane mosque', dome: true });
      props.box('stone', p.x + 10, y + 9, p.z + 6, 3, 18, 3, 0, 0xe8e2d4); props.box('stone', p.x + 10, y + 18.6, p.z + 6, 3.8, 1.2, 3.8, 0, 0x5a7a5a);
      take(x, z, 14); }
    for (let i = 0; i < 500; i++) {
      const x = CASBAH.x + (r() * 2 - 1) * 110, z = shoreZ(CASBAH.x) - CASBAH.back + (r() * 2 - 1) * 110;
      const back = shoreZ(x) - z;
      if (oldK(x, back) < 0.5 || !free(x, z, 4.5, 70, 0.7)) continue; // (the hill’s slopes: houses stepped up them)
      props.flatHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : PI / 2, width: 6 + r() * 3, depth: 6 + r() * 3, storeys: r() < 0.4 ? 2 : 1, name: 'house' });
      take(x, z, 5);
    }
    for (let a = -0.6; a < 1.2; a += 0.12) {
      const x = CASBAH.x + Math.cos(a) * 112, z = shoreZ(CASBAH.x) - CASBAH.back - Math.sin(a) * 120;
      if (roadD(x, z) < 6 || nearPoint(x, z, 30)) continue;
      props.lowWall({ ...W(x, z), yaw: -a, length: 15, height: 2.6, color: 0xc8bea6 });
    }

    // ---- the French town: whitewashed blocks on the grid, the Cours Bertagna’s palms, the cathedral, the theatre, the town hall
    { const x = 60, z = -110; if (free(x, z, 12)) { props.church({ ...W(x, z), yaw: PI }); take(x, z, 13); } }
    { const x = 160, z = -100; if (free(x, z, 13)) { white({ ...W(x, z), yaw: PI / 2, width: 24, depth: 14, storeys: 3, name: 'the theatre', damaged: 0 }); take(x, z, 15); } }
    { const x = 150, z = 20; if (free(x, z, 12, 60)) { white({ ...W(x, z), yaw: PI / 2, width: 22, depth: 12, storeys: 3, name: 'the town hall', damaged: 0.05 }); take(x, z, 14); } }
    for (let z = 60; z > -70; z -= 13) for (const s of [-1, 1]) props.palm({ ...W(SLIP + s * 8, z + (r() - 0.5) * 2), height: 8 + r() * 3 });
    for (let x = 0; x <= 250; x += 17) for (let z = 60; z > -220; z -= 16) {
      const hx = x + (r() - 0.5) * 3, hz = z + (r() - 0.5) * 3, back = shoreZ(hx) - hz;
      if (townK(hx, back) < 0.5 || r() < 0.18 || !free(hx, hz, 6.5, 100)) continue;
      white({ ...W(hx, hz), yaw: r() < 0.8 ? 0 : PI / 2, width: 9 + r() * 3, depth: 9, storeys: 2 + (r() < 0.5 ? 1 : 0), name: 'apartment house', damaged: 0.08 });
      take(hx, hz, 7);
    }
    // ---- Saint-Cloud: villas along the Corniche behind the beach
    for (let i = 0; i < 26; i++) {
      const x = 330 + r() * 120, z = shoreZ(x) - 60 - r() * 120;
      if (!free(x, z, 6, 55)) continue;
      white({ ...W(x, z), yaw: r() < 0.5 ? 0 : PI / 2, width: 10, depth: 9, storeys: 2, name: 'villa', damaged: 0 });
      take(x, z, 8);
    }
    // ---- Sidi Salem: fishermen’s houses behind the dunes
    for (let i = 0; i < 18; i++) {
      const x = -260 - r() * 200, z = shoreZ(x) - 110 - r() * 50;
      if (!free(x, z, 5, 100)) continue;
      props.flatHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : PI / 2, width: 7, depth: 6, storeys: 1, name: 'fisherman’s house' });
      take(x, z, 6);
    }
    // ---- Hippo Regius: the basilica on its hill, the Roman ruins at its foot
    { const x = HIPPO.x - 10, z = HIPPO.z + 10; props.church({ ...W(x, z), yaw: PI / 2 }); take(x, z, 14); } // (on the hill’s top: placed first, before the free() checks)
    for (let i = 0; i < 22; i++) {
      const x = HIPPO.x + 40 + r() * 110, z = HIPPO.z + 60 + r() * 70;
      if (!free(x, z, 3)) continue;
      if (r() < 0.55) props.column({ ...W(x, z), radius: 0.5, height: 2 + r() * 4 }); else props.lowWall({ ...W(x, z), yaw: r() < 0.5 ? 0 : PI / 2, length: 6 + r() * 10, height: 0.8 + r() * 1.2, color: 0xb8a888 });
      take(x, z, 3);
    }
    // ---- Les Salines: wrecks of aircraft caught on the ground, AA pits round the field
    for (const [x, z] of [[-420, -120], [-430, -260], [-250, -300]] as P2[]) if (free(x, z, 6, 0)) { props.aircraftWreck({ ...W(x, z), yaw: r() * 6, scale: 0.9 }); take(x, z, 8); }
    for (const [x, z] of [[-215, -60], [-420, -340], [-200, -250]] as P2[]) if (free(x, z, 6, 0)) { props.sandbagRing({ ...W(x, z), radius: 6, toward: 1 }); take(x, z, 7); }
    // ---- AA round the port
    for (const [x, z] of [[20, -20], [250, -60], [-40, 20]] as P2[]) if (free(x, z, 6, 0)) { props.sandbagRing({ ...W(x, z), radius: 6, toward: 1 }); take(x, z, 7); }
    // ---- Duzerville: the village round the junction, its church; farms and their eucalyptus out on the plain
    { const x = K_PT.x + 50, z = K_PT.z - 30; if (free(x, z, 12)) { props.church({ ...W(x, z), yaw: PI / 2 }); take(x, z, 13); } }
    for (let i = 0; i < 70; i++) {
      const a = r() * PI * 2, dd = 40 + r() * 80, x = K_PT.x + Math.cos(a) * dd, z = K_PT.z + Math.sin(a) * dd * 0.8;
      if (!free(x, z, 6)) continue;
      white({ ...W(x, z), yaw: r() < 0.7 ? 0 : PI / 2, width: 9, depth: 8, storeys: r() < 0.3 ? 2 : 1, name: 'house', damaged: 0 });
      take(x, z, 7);
    }
    for (let i = 0; i < 40; i++) {
      const x = -480 + r() * 600, z = -150 - r() * 720;
      if (marshN(x, z) > 0.2 || edough(x, shoreZ(x) - z) > 4 || !free(x, z, 10)) continue;
      buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, -x, -z, r() * 3);
      props.rand = r;
      take(x, z, 16);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    props.finish();

    const avoid = [
      { x: this.bases.nato.x, z: this.bases.nato.z, r: 32 },
      ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => { const lx = -x, lz = -z, back = shoreZ(lx) - lz; return roadD(lx, lz) < 6 || railD(lx, lz) < 5 || riverD(lx, lz) < 24 || back < 40 || onStrip(lx, lz, 30) || townK(lx, back) > 0.3 || oldK(lx, back) > 0.5 || (portK(lx) > 0.3 && back < 200) || placed.some(([qx, qz, qr]) => Math.hypot(qx - lx, qz - lz) < qr); } },
    ];
    // cork oak and Aleppo pine on the Edough
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 600, count: 4200, broadleaf: 0.55, autumn: 0, maxY: 140, avoid,
      forest: (x: number, z: number) => woodsK(-x, -z) * 0.95 });
    // eucalyptus along the roads on the plain, tamarisk and willow along the Seybouse
    const rows = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 600, count: 500, broadleaf: 1, autumn: 0, size: 0.9, maxY: 30,
      avoid: [...avoid, { test: (x: number, z: number) => marshN(-x, -z) > 0.6 }],
      forest: (x: number, z: number) => { const lx = -x, lz = -z, rd = roadD(lx, lz), wd = riverD(lx, lz); return (lx < 200 && shoreZ(lx) - lz > 160 ? smoothstep(12, 8, rd) * 0.6 : 0) + smoothstep(36, 27, wd) * 0.5; } });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.6, fields: this.fields,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => { const lx = -x, lz = -z, back = shoreZ(lx) - lz; return back < 38 || (portK(lx) > 0.3 && back < 190) || townK(lx, back) > 0.4 || oldK(lx, back) > 0.5 || onStrip(lx, lz, 20) || riverD(lx, lz) < 24; } }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); rows.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;

/** A point along the railway (local), t 0..1 by length. */
function railAt(t: number): P2 {
  const lens = RAIL.slice(1).map((p, i) => Math.hypot(p[0] - RAIL[i][0], p[1] - RAIL[i][1]));
  let d = t * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) { const k = Math.min(1, d / lens[i]); return [RAIL[i][0] + (RAIL[i + 1][0] - RAIL[i][0]) * k, RAIL[i][1] + (RAIL[i + 1][1] - RAIL[i][1]) * k]; }
    d -= lens[i];
  }
  return RAIL[RAIL.length - 1];
}
