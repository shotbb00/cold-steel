// The raid on Boulogne, October 1806 (coastal, the 1806 epoch: the British land, the French hold; 1.0 × 1.8 km). On the
// night of 8 October Commodore Owen's squadron stood in off Boulogne and Congreve's rocket boats fired two hundred
// rockets into the town and the flotilla packed in the Liane; here the raid goes further, as the Admiralty half
// planned: the boats put a force ashore on the sands north of the town, at Wimereux, to burn the flotilla's second
// basin and the hutted camp of the Army of England on the plateau, while the French run down from their camps and
// batteries. On the map the Channel is the -z side (the British come from the sea; north is to the west, -x): the
// sands and dunes of the Pointe aux Oies to the north, the little Wimereux running out across the beach past the
// village and the new flotilla basin dug in 1803–04, the low chalk-and-sandstone cliffs rising south of it to the
// Pointe de la Crèche with its fort and the cove below; inland the bare, hedgeless Boulonnais downs, the camp de
// droite's streets of mud-walled thatched huts on the plateau, the Emperor's baraque and semaphore on the cliff
// edge, and the walled haute-ville of Boulogne on its spur at the back, where the French come from.
// Flipped (a French landing, src/wcampaign/battle.js flipLanding): the same sands and the cove, the British holding the
// camps and the town.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1806_1008);
const sea = createSea({ level: 0, size: SIZE, color: 0x4a6a6c }); // (the Channel in October: grey-green and short-tempered)

/** The waterline (world z; the Channel toward -z): the sands bowed into a shallow bay, straighter under the cliffs. */
export const shoreZ = (x: number) => -170 + 0.00006 * (x + 80) ** 2 + fbm(noise, x * 0.004, 2.1, 2) * 10;
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);

/** The Wimereux: its line (x at z), its half-width, and its crossings (the coast-road bridge, the mill ford, the Terlincthun ford). */
const wimX = (z: number) => -190 + 30 * Math.sin(z * 0.005 + 0.4) + 10 * Math.sin(z * 0.013);
const FORDS = [{ name: 'Wimereux bridge', z: -70 }, { name: 'Mill ford', z: 230 }, { name: 'Terlincthun ford', z: 540 }];
const fordK = (z: number) => Math.max(...FORDS.map((f) => smoothstep(26, 12, Math.abs(z - f.z))));
/** < 0 in the stream's water. */
const wim = (x: number, z: number) => Math.abs(x - wimX(z)) - (4 + 7 * smoothstep(-60, -170, z));

/** The cliffs south of the stream (0..1): from x ≈ 120 on, broken by the cove below the Pointe de la Crèche. */
const COVE = 350;
const cliffK = (x: number) => smoothstep(110, 220, x) * (1 - Math.exp(-(((x - COVE) / 55) ** 2)));

/** The heights: Boulogne's spur at the back, the plateau of the camp de droite, the cliff top of the baraque. */
const BOULOGNE = { x: 120, z: 740 };
const CAMP = { x: 40, z: 300 };
const BARAQUE = { x: 340, z: 420 };
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

function height(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) { // the bottom: a bar where the surf breaks, then shelving away (rockier and steeper off the cliffs)
    const s = -d, bar = 0.5 * Math.exp(-(((s - 40) / 14) ** 2));
    return Math.max(0.5 - s * (0.02 + 0.015 * cliffK(x)) - Math.max(0, s - 120) * 0.04 + bar, -16);
  }
  const c = cliffK(x);
  const beach = 0.5 + Math.min(d, 28) * 0.05;
  const dunes = (2.5 + fbm(noise, x * 0.012, 3.7, 2) * 2) * Math.exp(-(((d - 48) / 16) ** 2)) * (1 - c);
  // the downs: a long slope up from the dunes to the plateau, Boulogne's spur and the cliff top above the cove
  let land = 2.6 + smoothstep(60, 520, d) * 22 + fbm(noise, x * 0.004, z * 0.004, 3) * 2.5
    + hill(x, z, BOULOGNE.x, BOULOGNE.z, 150, 12) + hill(x, z, CAMP.x, CAMP.z, 160, 5) + hill(x, z, BARAQUE.x, BARAQUE.z, 120, 6);
  land += c * 20 * smoothstep(16, 36, d); // (the cliff: 20 m of sandstone over the sand)
  let h = Math.max(beach + dunes * smoothstep(15, 35, d), Math.min(land, beach + d * (0.3 + c * 1.4)));
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, Math.abs(x)) * 24 * smoothstep(60, 200, d);
  // the Wimereux: a valley cut into the downs, its bed too deep to wade but at the bridge and fords
  const b = wim(x, z);
  if (b < 110) {
    h -= 9 * smoothstep(60, 400, d) * smoothstep(110, 10, b);
    if (b < 40) {
      const bed = -0.35 - 1.3 * (1 - fordK(z));
      h += (Math.min(h, bed) - h) * smoothstep(20, 0, b);
    }
  }
  return h;
}

/** Soft going: the sand, the stream's mud. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 34) return foot ? 0.85 : 0.6;
  if (wim(x, z) < 8) return foot ? 0.7 : 0.45;
  return 1;
}

/** Distance from (x, z) to the segment a–b. */
const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};

/** The beach sectors (x) and what lies inland behind each. */
export const SECTORS = [
  { x: -370, name: 'Pointe aux Oies', inland: { name: 'Wimereux', x: -290, z: 150 } },
  { x: -20, name: 'The flotilla basin', inland: { name: 'Camp de droite', x: CAMP.x, z: CAMP.z } },
  { x: COVE, name: 'Pointe de la Crèche', inland: { name: 'The Emperor’s baraque', x: BARAQUE.x, z: BARAQUE.z } },
];
const WIM = SECTORS[0].inland;

/** The roads: the coast road (Ambleteuse – Wimereux bridge – along the cliff top to Boulogne), the camp streets' road, the cove's track. */
const ROADS: number[][] = [
  [-520, -60, wimX(-70), -70], [wimX(-70), -70, 120, -40], [120, -40, 300, 30], [300, 30, 520, 80],
  [WIM.x, WIM.z, wimX(-70), -70], [WIM.x, WIM.z, wimX(230), 230], [wimX(230), 230, CAMP.x, CAMP.z],
  [-20, -40, CAMP.x, CAMP.z], [CAMP.x, CAMP.z, BOULOGNE.x, BOULOGNE.z], [BOULOGNE.x, BOULOGNE.z, 0, 900],
  [COVE, shoreZ(COVE) + 30, 300, 30], [300, 30, BARAQUE.x, BARAQUE.z], [BARAQUE.x, BARAQUE.z, BOULOGNE.x, BOULOGNE.z],
  [WIM.x, WIM.z, -360, 600], [-360, 600, wimX(540), 540], [wimX(540), 540, BOULOGNE.x, BOULOGNE.z], [BOULOGNE.x, BOULOGNE.z, 480, 820],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));

const points: ControlPointDef[] = [
  { id: 'A', name: 'Owen’s squadron', x: 0, z: -770, owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` what lies behind once taken)
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 42, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) + 48, owner: null, sector: 'centre', radius: 55, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) + 38, owner: null, sector: 'east', radius: 45, opens: 'G' },
  { id: 'E', name: WIM.name, x: WIM.x, z: WIM.z, owner: null, sector: 'west' },
  { id: 'F', name: SECTORS[1].inland.name, x: CAMP.x, z: CAMP.z, owner: null, sector: 'centre' },
  { id: 'G', name: SECTORS[2].inland.name, x: BARAQUE.x, z: BARAQUE.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Boulogne', x: BOULOGNE.x, z: BOULOGNE.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const FORT = { x: COVE + 75, z: shoreZ(COVE + 75) + 52 }; // the Fort de la Crèche: a stone battery on the point over the cove
const BASIN = { x: -95, z: shoreZ(-95) + 40 };           // the flotilla basin: a walled pool off the stream behind the sand

/** Copses in the valley and on the slopes; the downs themselves bare (0..1). */
const woods = (x: number, z: number) => {
  const d = inland(x, z);
  if (d < 90) return 0;
  let k = smoothstep(0.5, 0.68, fbm(noise, x * 0.006 + 11, z * 0.006 - 3, 3)) * (0.3 + 0.4 * smoothstep(300, 600, d));
  const b = wim(x, z);
  if (b > 10 && b < 30 && fordK(z) < 0.3) k = Math.max(k, 0.6);
  for (const p of points) k = Math.min(k, smoothstep(40, 75, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'boulogne-raid',
  name: 'Boulogne 1806',
  description: 'The Channel coast, October 1806: Owen’s boats and Congreve’s rockets come for the Boulogne flotilla and land on the sands at Wimereux. The dunes, the stream and the flotilla basin, the Crèche fort over its cove, the hutted camp on the downs, Boulogne on its spur.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'europe',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] }, // (Soult's corps in the camps against a raid from the Downs squadron)
  airfields: [],
  conditions: { time: 'day', weather: 'overcast' }, // (an October day, low cloud off the Channel)
  wind: { from: 260, speed: 6, veer: 0.2 }, // (a westerly, onshore: the boats run in with it)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1806_1008,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.7,
  fields: createFields({ seed: 1806_10, cell: 80, weights: [0.35, 0.2, 0.3, 0.15] }), // October: ploughed, stubble and grazed downland

  theme: {
    // a grey Channel day: low, bright cloud, cold light
    fogColor: 0xa8b0b2, fogDensity: 0.0007,
    skyTop: 0x7a8a98, skyHorizon: 0xc0c6c8, skyBottom: 0x8a8e88,
    sunColor: 0xe8e8e0, sunIntensity: 1.5, sunDisk: 0.2,
    clouds: 0.75, cloudLight: 0xd8dadc, cloudDark: 0x8a9096,
    sunDir: [-0.4, 0.55, -0.6],
    hemiSky: 0xb8c4cc, hemiGround: 0x6a6a56, hemiIntensity: 1.25,
    rimColor: 0xd8dce0, rimIntensity: 0.2,
    terrain: {
      grass: '#6e7a4a', grassAlt: '#667244', dryGrass: '#94905e', dirt: '#7a6648', rock: '#9a948a',
      pasture: '#76824e', ploughed: '#6e5a40', stubble: '#aa9a6a', meadow: '#6a7a46',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z), c = cliffK(x);
        if (d < 0) return [y > -1.2 ? (c > 0.3 ? 0x8a8676 : 0xc4ba9a) : 0x6e7470, 1];  // the sand (rock under the cliffs) under the water
        if (d < 30) return [c > 0.5 ? 0xb0a68c : 0xd8ccaa, 1];                          // the beach (shingle under the cliffs)
        if (c > 0.3 && d < 50) return [0xa89a7c, 0.9];                                   // the cliff face
        if (wim(x, z) < 9) return [0x5e5440, 0.9];                                      // the stream's mud
        if (roadDist(x, z) < 3) return [0x9a8a6c, 0.8];                                 // the chalky roads
        if (d < 70) return [0xbcb490, 0.6];                                             // the dunes and marram
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-300, 0, 300] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the British land: their roads are the beach sectors)
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -140 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    // the squadron's boats: the foot in flatboats, the guns in the launches
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.3, // (a Channel swell on the sands: some boats broach)
    signal: { t: 25, say: 'Rockets away from the boats — and every flatboat pulls for the sands', sayOther: 'Fire-arrows over the flotilla and boats on the sands at Wimereux: the English are landing!' },
    // Owen's frigates and sloops close in to cover the boats
    navy: ['frigate', 'destroyer'],
    // the coast's guns: the Crèche fort over the cove, the battery at the basin, a field battery behind the north dunes
    forts: [
      { unit: 'shoreBattery', x: FORT.x, z: FORT.z, facing: Math.PI },
      { unit: 'shoreBattery', x: BASIN.x + 40, z: BASIN.z + 12, facing: Math.PI },
      { unit: 'artillery', x: -330, z: shoreZ(-330) + 95, facing: Math.PI },
    ],
    // the coast-guard trenches behind the dunes and the cliff path, stakes along the back of the sand
    works: [
      ...SECTORS.flatMap((s) => [-40, 0, 40].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 60, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-40, -26, -12, 12, 26, 40].map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 34, yaw: 0 }))),
    ],
    // the coast guard and the camp's pickets
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    names: { reconVehicle: 'Chasseurs à cheval de la côte' },
    // the camps turn out: Soult's battalions come down off the plateau
    counter: { t: 150, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery'], say: 'The générale is beating in every camp — down to the shore, at the double!', sayOther: 'French columns pouring out of the hutted camps — form on the sand!' },
    hold: [...SECTORS.flatMap((s) => [-30, 30].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 60 }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'marines', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2200, perSector: 600, beachIncome: 0.75, defenceCp: 650, defenceIncome: 0.8 },
    waves: [
      // the first wave: the marines of the squadron, a battalion from the Downs, the 95th's riflemen
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'sniper', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'marines', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'rifles', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'atTeam', sector: 2 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns, and seamen to burn the boats in the basin', units: [{ unit: 'artillery', sector: 1 }, { unit: 'sailors', sector: 1 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'The second battalion is coming ashore', units: [{ unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 1 }, { unit: 'artillery', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1806_1009);
    sea.build(scene, terrain);
    const near = (x: number, z: number, rr: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < rr);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 4 + rr && wim(x, z) > 12 + rr && inland(x, z) > 70 + rr;

    // ---- the Fort de la Crèche: a low stone horseshoe battery on the point
    {
      const g = terrain.heightAt(FORT.x, FORT.z), STONE = 0xb8b0a0;
      for (const [dx, dz, w, dd, yaw] of [[0, -9, 22, 2.2, 0], [-11, 0, 2.2, 18, 0.2], [11, 0, 2.2, 18, -0.2]] as const) {
        props.box('stone', FORT.x + dx, g + 1.2, FORT.z + dz, w, 3.2, dd, yaw, STONE);
        props.cover.addBox({ x: FORT.x + dx, z: FORT.z + dz, yaw, length: w, thickness: dd, height: 2.6 });
      }
      props.box('stone', FORT.x, g + 1.8, FORT.z + 10, 9, 3.6, 6, 0, 0x9a9282); // the guardhouse
    }
    // ---- the flotilla basin: stone quays round a pool behind the sand, gunboats lying in it on the mud
    {
      const g = terrain.heightAt(BASIN.x, BASIN.z);
      for (const [dx, dz, w, dd] of [[0, -14, 46, 1.6], [0, 14, 46, 1.6], [-23, 0, 1.6, 28], [23, 0, 1.6, 28]] as const)
        props.box('stone', BASIN.x + dx, g + 0.4, BASIN.z + dz, w, 1.6, dd, 0, 0x8a8478);
      for (let i = 0; i < 5; i++) props.box('plain', BASIN.x - 16 + i * 8, g + 0.6, BASIN.z + (i % 2 ? 4 : -4), 2.6, 1.2, 12, 0.05 * (i - 2), 0x4a3a2c);
      for (let i = 0; i < 5; i++) props.box('plain', BASIN.x - 16 + i * 8, g + 5.5, BASIN.z + (i % 2 ? 4 : -4), 0.25, 9, 0.25, 0, 0x3a2e24); // their masts
    }
    // ---- Wimereux and Boulogne; the church in each; the haute-ville's walls round the spur
    for (const [p, seed] of [[P.E, 18101], [P.K, 18102]] as const) buildVillage(props, p, seed);
    props.rand = mulberry32(1806_1010);
    props.church({ x: P.E.x - 34, z: P.E.z + 28, yaw: Math.PI / 2 });
    props.church({ x: P.K.x + 40, z: P.K.z + 30, yaw: 0.2 });
    for (let i = 0; i < 18; i++) { // (the ramparts: segments round the haute-ville, gaps where the roads come in)
      const a = (i / 18) * Math.PI * 2;
      const x = P.K.x + Math.cos(a) * 85, z = P.K.z + Math.sin(a) * 70;
      if (roadDist(x, z) < 9) continue;
      props.wall({ x, z, yaw: a + Math.PI / 2, length: 24, height: 4.5, thickness: 2.2 });
    }
    for (let i = 0; i < 26; i++) { // town houses inside the walls
      const a = r() * Math.PI * 2, rr = 32 + r() * 40;
      const x = P.K.x + Math.cos(a) * rr * 0.95, z = P.K.z + Math.sin(a) * rr * 0.8;
      if (roadDist(x, z) < 7 || Math.hypot(x - P.K.x - 40, z - P.K.z - 30) < 18) continue;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: Math.atan2(z - P.K.z, x - P.K.x) + Math.PI / 2, width: 7 + r() * 3, depth: 8, storeys: 2, damaged: 0 });
    }
    // ---- the camp de droite: streets of low thatched huts on the plateau, the parade ground clear in the middle
    for (let row = -3; row <= 3; row++) for (let col = -5; col <= 5; col++) {
      const x = CAMP.x + col * 20 + (row % 2) * 6, z = CAMP.z + row * 24;
      if (Math.hypot(x - CAMP.x, z - CAMP.z) < 34 || roadDist(x, z) < 7 || r() < 0.15) continue;
      const g = terrain.heightAt(x, z);
      props.box('plain', x, g + 0.9, z, 11, 2.2, 4.6, 0, 0xbcae8a);                       // mud walls, whitewashed
      for (const s of [-1, 1]) props.box('plain', x, g + 2.55, z + s * 1.25, 11.6, 0.3, 3.1, 0, 0x8a7848, s * 0.6); // the thatch
      props.cover.addBox({ x, z, yaw: 0, length: 11, thickness: 4.6, height: 2.2 });
    }
    // ---- the Emperor's baraque and the semaphore on the cliff edge
    props.rand = mulberry32(1806_1011);
    props.townHouse({ x: BARAQUE.x + 30, z: BARAQUE.z - 22, yaw: 0.1, width: 16, depth: 7, storeys: 1, name: 'the Emperor’s baraque', damaged: 0 });
    props.mast({ x: BARAQUE.x - 26, z: BARAQUE.z - 30, height: 12 });
    for (let i = 0; i < 6; i++) props.tent({ x: BARAQUE.x - 40 + i * 14, z: BARAQUE.z + 38, yaw: 0, color: 0xd8d0b8 }); // the Guard's tents
    // farms on the downs, their walls
    for (let i = 0, n = 0; i < 400 && n < 16; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = 60 + r() * 640;
      if (!free(x, z, 10) || near(x, z, 90) || Math.hypot(x - CAMP.x, z - CAMP.z) < 160 || Math.hypot(x - P.K.x, z - P.K.z) < 110) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: r() * Math.PI, width: 9 + r() * 4, depth: 7, storeys: 1, name: 'farmhouse', damaged: 0 });
      if (r() < 0.6) props.lowWall({ x: x + 10, z: z + 6, yaw: r() * Math.PI, length: 10 + r() * 8, height: 1.1, color: 0x8a867a });
    }
    // fishing boats drawn up on the sand north of the stream
    for (let i = 0; i < 4; i++) props.box('plain', -260 + i * 9, terrain.heightAt(-260 + i * 9, shoreZ(-260) + 16) + 0.4, shoreZ(-260 + i * 9) + 16, 1.6, 0.6, 5, 0.3, 0x4a3c30);
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: FORT.x, z: FORT.z, r: 18 }, { x: BASIN.x, z: BASIN.z, r: 30 },
      { x: CAMP.x, z: CAMP.z, r: 130 }, { x: P.K.x, z: P.K.z, r: 95 },
      { test: (x: number, z: number) => roadDist(x, z) < 5 || wim(x, z) < 10 || inland(x, z) < 70 }];
    // copses of beech and ash in the valley, a few elms by the farms
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 700, broadleaf: 0.85, autumn: 0.5, maxY: 80,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.9, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => inland(x, z) < 32 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
