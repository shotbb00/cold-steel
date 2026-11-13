// Aboukir, 8 March 1801 (coastal, the 1806 epoch: the British land, the French hold; 1.0 × 1.8 km). Abercromby's
// army rowed ashore at dawn in the flatboats of Keith's fleet, straight at Friant's French on the sand hills behind
// the beach — the bay of the Battle of the Nile three years before. To the west Aboukir point with its castle; in
// the middle the great sand hill the French held with their guns; to the east the beach runs on along the dunes
// in front of Lake Maadieh. Inland the sandy plain, palm groves, the Mandara camp and the road to Alexandria.
// Laid out like Hohwacht in a frame with the sea toward +z (`L`), then turned round: the British side (-z) is the sea.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1801_03);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a7684 }); // (the Mediterranean off Egypt: clear, green-blue over the sand)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** The waterline along the bay (local z), and Aboukir point pushing out to sea in the west. */
const POINT = { x: -430, r: 120 };
const pointK = (x: number) => Math.max(0, 1 - Math.abs(x - POINT.x) / POINT.r);
const shoreZ = (x: number) => 165 + fbm(noise, x * 0.004, 1.3, 2) * 14 + pointK(x) ** 1.5 * 150;
/** The great sand hill the French held (local frame) and Lake Maadieh behind the eastern dunes. */
const HILL = { x: 40, z: 60, r: 120, h: 17 };
const LAKE = { x: 360, z: -40, rx: 150, rz: 70 };
const lakeD = (x: number, z: number) => Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  if (d > 0) { // the bottom: a bar close in where the surf breaks, then shelving away (the boats ground 50–100 m out)
    const bar = 0.5 * Math.exp(-(((d - 45) / 14) ** 2));
    return Math.max(0.5 - d * 0.02 - Math.max(0, d - 120) * 0.04 + bar, -16);
  }
  const back = -d; // m inland of the waterline
  // the beach (25–35 m of hard wet sand, then soft), the line of sand hills behind it, then the sandy plain rising gently
  const beach = 0.5 + Math.min(back, 30) * 0.05;
  const dunes = (5 + fbm(noise, x * 0.012, 2.7, 2) * 4) * Math.exp(-(((back - 55) / 18) ** 2));
  let land = 3 + smoothstep(40, 160, back) * 3 + fbm(noise, x * 0.005, z * 0.005, 3) * 2.5;
  // the great sand hill in the middle: steep to the sea, the French line on its crest
  const hd = Math.hypot(x - HILL.x, (z - HILL.z) * 1.3);
  land += HILL.h * Math.max(0, 1 - hd / HILL.r) ** 1.6;
  let h = Math.max(beach + dunes * smoothstep(15, 35, back), Math.min(land, beach + back * 0.3));
  // Aboukir point: a low rocky promontory, the castle on its end
  const pk = pointK(x);
  if (pk > 0) h = Math.max(h, beach + (3.5 + pk * 4 + fbm(noise, x * 0.03, z * 0.03, 2) * 1.5 - Math.max(0, back - 120) * 0.02) * smoothstep(2, 22, back));
  // Lake Maadieh: a sheet of shallow water behind the eastern dunes, its reedy edge
  const ld = lakeD(x, z);
  if (ld < 1.4) h = h + (-1.0 + ld * 1.2 - h) * smoothstep(1.4, 0.8, ld);
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The tracks (local frame): along behind the dunes, up through the gap by the castle, inland to Mandara and on to Alexandria. */
function onRoadL(x: number, z: number) {
  const sz = shoreZ(x);
  if (z < sz - 85 && z > sz - 95 + Math.sin(x * 0.012) * 3 && lakeD(x, z) > 1.25 && pointK(x) < 0.3) return true; // the coast track
  if (Math.abs(x - (-300 + Math.sin(z * 0.01) * 20)) < 3 && z < sz - 40 && z > -700) return true;                 // from the castle inland
  if (Math.abs(x - (60 + Math.sin(z * 0.008) * 35)) < 3 && z < sz - 100 && z > -700) return true;                 // over the hill to Mandara
  if (Math.abs(z - (-560 + Math.sin(x * 0.005) * 25)) < 3) return true;                                           // the road to Alexandria
  return false;
}
const onRoad = (x: number, z: number) => onRoadL(x, F * z);

/** The beach sectors (x) and what lies up behind them (local z). */
export const SECTORS = [
  { x: -300, name: 'Castle beach', inland: { name: 'Aboukir castle', x: -430, z: 230 } },
  { x: 30, name: 'The sand hill', inland: { name: 'Mandara', x: 60, z: -360 } },
  { x: 330, name: 'Lake beach', inland: { name: 'The Maadieh dunes', x: 330, z: -160 } },
];
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world

const points: ControlPointDef[] = [
  { id: 'A', name: 'The fleet\'s anchorage', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` what lies behind once taken)
  { id: 'B', name: 'Castle beach', ...W(-300, shoreZ(-300) - 40), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'The sand hill', ...W(30, shoreZ(30) - 70), owner: null, sector: 'centre', radius: 55, opens: 'F' },
  { id: 'D', name: 'Lake beach', ...W(330, shoreZ(330) - 44), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Aboukir castle', ...W(-430, 230), owner: null, sector: 'west' },
  { id: 'F', name: 'Mandara', ...W(60, -360), owner: null, sector: 'centre' },
  { id: 'G', name: 'The Maadieh dunes', ...W(330, -160), owner: null, sector: 'east' },
  { id: 'K', name: 'The Alexandria road', ...W(-150, -640), owner: 'nato', sector: 'centre' },
];

export default {
  id: 'aboukir-landing',
  name: 'Aboukir 1801',
  description: 'Egypt, 8 March 1801: at dawn the British army rows ashore in the fleet\'s flatboats, straight at the French on the sand hills. Aboukir castle on its point, Lake Maadieh behind the dunes, the road to Alexandria inland.',
  epochs: ['1806'],
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] },
  conditions: { time: 'dawn', weather: 'clear' },
  wind: { from: 290, speed: 3, veer: 0.15 }, // (8 March 1801: a light air off the sea after a week of gales — the frigates can work in)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5, // (vehicles and guns: the face of the great sand hill is no way up)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1801,
  height,
  river: sea,
  fields: createFields({ seed: 1801, cell: 80 }),

  theme: {
    // dawn over the desert: a pale, hazy sky, the low sun from the land
    fogColor: 0xd8c8aa, fogDensity: 0.0006,
    skyTop: 0x7e9cbc, skyHorizon: 0xead8bc, skyBottom: 0xb8a68a,
    sunColor: 0xffe2b8, sunIntensity: 1.9, sunDisk: 0.8,
    clouds: 0.12, cloudLight: 0xf4ece0, cloudDark: 0xc8bca8,
    sunDir: [0.45, 0.35, -0.8],
    hemiSky: 0xd8dde4, hemiGround: 0xa08860, hemiIntensity: 1.2,
    rimColor: 0xf0e0c0, rimIntensity: 0.3,
    terrain: {
      grass: '#d8b880', grassAlt: '#ccaa70', dryGrass: '#e2c690', dirt: '#b08a5c', rock: '#9a7e5a',
      pasture: '#d4b47c', ploughed: '#c8a46c', stubble: '#dcbe86', meadow: '#d0b078',
      farmX: [0, 1], farmZ: [0, 1], // (no farmland: the desert)
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, sz = shoreZ(x);
        if (onRoadL(x, lz)) return [0xb89c72, 0.8];                                          // the beaten tracks
        if (lz > sz + 4) return [y > 0.2 ? 0xe4d6b4 : 0xc4b490, 1];                            // the sand under the water
        if (lz > sz - 30) return [0xead9b4, 1];                                               // the beach
        if (pointK(x) > 0.3 && lz > sz - 160) return [0xa8906a, 0.8];                          // the point's rock
        if (lakeD(x, lz) < 1.25) return [0x8a8a5a, 0.8];                                      // reeds round the lake
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.25 ? [0xb89a6a, Math.min(0.45, (scrub - 0.25) * 2)] : null;           // gravel and scrub between the sand hills
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-200, 60, 280] }, pact: { x: 0, z: -830, entries: [-300, 30, 330] } }, // (the British land: their roads are the beach sectors)
  maxStacks: 26, // (the landing brings its boats' loads, seamen and guns: a little more room than a land battle)
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // the fleet's boats (systems/Landing.js): the foot in flatboats, the guns and horses in the launches
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    // the surf over the bar (the swell left by a week of gales): an open boat may broach and fill — more so in worse weather; rough seas also hold the later waves back
    surf: 0.3, // (the transports anchored a mile out: here the boats are put in the water half a kilometre off)
    // the dawn signal: the first boats lie in line until the flagship's gun, then all pull for the shore together
    signal: { t: 25, say: 'The signal gun from the flagship — every boat pulls for the shore', sayOther: 'A gun from the British flagship: the boats are coming in, all together' },
    // what the landing may call in at sea: frigates and brig-sloops inshore to cover the boats with their broadsides
    navy: ['frigate', 'destroyer'],
    // the coast's guns: the castle's battery on the point, two earthwork batteries along the sand hills, all laid on the bay
    // with their furnaces (heated shot); and Friant's field guns on the crest of the great sand hill (canister into the boats)
    forts: [
      { unit: 'shoreBattery', ...W(-395, shoreZ(-395) - 16), facing: Math.PI },
      { unit: 'shoreBattery', ...W(170, shoreZ(170) - 45), facing: Math.PI },
      { unit: 'shoreBattery', ...W(450, shoreZ(450) - 40), facing: Math.PI },
      { unit: 'artillery', ...W(10, 92), facing: Math.PI }, { unit: 'artillery', ...W(75, 88), facing: Math.PI },
    ],
    // the entrenchments on the sand hills over each beach, an abatis along the back of the sand in front of them (in 1806 the wire is drawn as felled trees)
    works: [
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - 58), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-50, -38, -26, 26, 38, 50, -14, 14].map((dx) => ({ kind: 'wire', ...W(s.x + dx, shoreZ(s.x + dx) - 34), yaw: 0 }))),
    ],
    // Friant's foot at dawn: in the entrenchments over each beach, in Mandara and the dunes behind
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mgTeam', 'rifles', 'mortar', 'reconVehicle'],
    names: { reconVehicle: 'Hussards de piquet' },
    // the cavalry counter-charge: the dragoons and hussars from the Alexandria road, down onto the beach while the boats are still coming in
    counter: { t: 120, units: ['ifv', 'reconVehicle', 'ifv', 'tank'], say: 'The dragoons are going in — charge them on the beach before they form!', sayOther: 'French cavalry coming down the sand hills — form square!' },
    hold: [...SECTORS.flatMap((s) => [-30, 30].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - 60))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the British AI (ai/LandingDirector.js): what it buys next, a frigate inshore off the focus sector
    ai: { order: ['rifles', 'mgTeam', 'marines', 'rifles', 'atTeam', 'artillery', 'rifles', 'sailors', 'sniper', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 800, defenceIncome: 1.4 },
    waves: [
      // the first wave (the reserve brigades and the Guards' flank companies, the 23rd and 28th, the 40th's light companies, the 42nd)
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'marines', sector: 0 },
        { unit: 'atTeam', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'guard', sector: 2 },
      ] },
      // the guns and their seamen, then the horses
      { t: 150, say: 'The launches are coming in with the guns, the seamen to haul them', units: [{ unit: 'artillery', sector: 1 }, { unit: 'sailors', sector: 1 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'The dragoons\' horses are coming ashore', units: [{ unit: 'reconVehicle', sector: 2 }, { unit: 'artillery', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1801);
    sea.build(scene, terrain);

    // ---- Aboukir castle on its point: a square of curtain walls, the round tower, barracks inside
    const C = W(-440, shoreZ(-440) - 30);
    // (sandstone boxes: the Props wall is timber and its tower is the 1985 border's)
    const STONE = 0xc8ae84, g0 = terrain.heightAt(C.x, C.z);
    for (const [dx, dz, yaw] of [[0, -22, 0], [0, 22, 0], [-22, 0, Math.PI / 2], [22, 0, Math.PI / 2]] as [number, number, number][]) {
      for (const k of [-1, 0, 1]) {
        const x = C.x + dx + (yaw ? 0 : k * 14.5), z = C.z + dz + (yaw ? k * 14.5 : 0);
        const foot = Math.min(...[-7, 0, 7].map((m) => terrain.heightAt(x + (yaw ? 0 : m), z + (yaw ? m : 0)))) - 1.5; // (down to the lowest ground under it)
        props.box('stone', x, (foot + g0 + 5.7) / 2, z, 15, g0 + 5.7 - foot, 2.2, yaw, STONE);
        for (let m = -6; m <= 6; m += 2.4) props.box('stone', x + (yaw ? 0 : m), g0 + 6.1, z + (yaw ? m : 0), 1.1, 0.9, 2.2, yaw, STONE); // merlons
        props.cover.addBox({ x, z, yaw, length: 15, thickness: 2.2, height: 5.5 });
      }
    }
    // the bastions at the corners, the old round keep on the seaward one
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = C.x + sx * 22, z = C.z + sz * 22, foot = terrain.heightAt(x, z) - 1.5;
      props.box('stone', x, (foot + g0 + 6.8) / 2, z, 7, g0 + 6.8 - foot, 7, Math.PI / 4, STONE);
    }
    const keep = W(-440, shoreZ(-440) - 12);
    const kf = terrain.heightAt(keep.x, keep.z) - 1.5;
    props.box('stone', keep.x, (kf + g0 + 12) / 2, keep.z, 9, g0 + 12 - kf, 9, 0, 0xbca27a);
    props.box('stone', keep.x, g0 + 12.5, keep.z, 10, 1, 10, 0, 0xb09670);
    props.cover.addCylinder({ x: keep.x, z: keep.z, radius: 5, height: 12, spots: false });
    props.flatHouse({ x: C.x + 4, z: C.z - 6, yaw: 0, width: 16, depth: 8, storeys: 2, name: 'barracks' });
    props.flatHouse({ x: C.x - 6, z: C.z + 8, yaw: Math.PI / 2, width: 10, depth: 7, name: 'magazine' });
    // the village of Aboukir on the neck of the point, with its mosque
    props.flatHouse({ ...W(-330, 150), yaw: 0, width: 12, depth: 10, name: 'mosque', dome: true });
    for (let i = 0; i < 12; i++) {
      const x = -380 + r() * 110, z = 110 + r() * 80;
      if (onRoadL(x, z)) continue;
      props.flatHouse({ ...W(x, z), yaw: Math.round(r() * 3) * (Math.PI / 2), width: 6 + r() * 4, depth: 5 + r() * 3, storeys: r() < 0.25 ? 2 : 1 });
      if (r() < 0.5) props.lowWall({ ...W(x + 5, z + 4), yaw: r() < 0.5 ? 0 : Math.PI / 2, length: 6 + r() * 6, height: 1.6, color: 0xc4a87a });
    }
    // Mandara: the French camp inland — mud-brick houses, a well, palms; the Maadieh dunes' fishing huts by the lake
    for (const [cx, cz, n] of [[60, -360, 12], [330, -160, 6]] as [number, number, number][]) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r() * 0.5, dd = 16 + r() * 22;
        const x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (onRoadL(x, z) || lakeD(x, z) < 1.2) continue;
        props.flatHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 6 + r() * 4, depth: 5 + r() * 3 });
      }
    }
    // date palms: groves inland and along the lake, a few on the point
    for (let i = 0; i < 220; i++) {
      const grove = [[60, -330], [330, -110], [-220, -200], [-380, 140], [200, -480]][i % 5];
      const x = grove[0] + (r() - 0.5) * 140, z = grove[1] + (r() - 0.5) * 100;
      if (onRoadL(x, z) || lakeD(x, z) < 1.1 || z > shoreZ(x) - 70) continue;
      props.palm({ ...W(x, z), height: 7 + r() * 6 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const land = (x: number, z: number) => F * z < shoreZ(x) - 60 && lakeD(x, F * z) > 1.3;
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => onRoad(x, z) }];
    const scrub = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 220, broadleaf: 0.2, autumn: 0.6, maxY: 40,
      avoid: [...avoid, { test: (x: number, z: number) => !land(x, z) }],
      forest: (x: number, z: number) => smoothstep(0.35, 0.6, fbm(noise, x * 0.008 + 9, z * 0.008, 2)) * 0.4 }); // (tamarisk and scrub: thin)
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.35, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => F * z > shoreZ(x) - 30 || lakeD(x, F * z) < 1 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { scrub.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
