// Quiberon, June–July 1795 (coastal, the 1806 epoch: the British land, the French hold; 1.0 × 1.8 km). On 27 June
// 1795 Warren's squadron put the émigré regiments of Puisaye and d'Hervilly ashore on the beach of Carnac, in British
// pay and British red, with muskets for the chouans who came down out of the heath to meet them; they took the Fort
// Penthièvre on the isthmus of the Quiberon peninsula, and Hoche shut them in from his entrenched lines on the
// heights of Sainte-Barbe and stormed the fort on the night of 20 July.
// The real ground, the bay of Quiberon to the south (-z): down the whole west flank the narrow sandy isthmus of
// Penthièvre runs south off the map toward Quiberon, the open Atlantic beyond it, the bay inside it, and the Fort
// Penthièvre on its granite knoll across it; at its root Plouharnel, then the creek of the Anse du Pô and Carnac's
// long beach curving away east. Two landing places, nothing alike: the short Plouharnel strand in the bay's inner
// corner, from where the way to the fort runs south down the isthmus, and Carnac's open beach. Inland the low granite
// heath of the Morbihan, pines and gorse, walled fields, the rows of standing stones of the Ménec and Kermario
// alignments, Carnac round Saint-Cornély, and Hoche's camp and lines on the heights at the back on the Auray road,
// where the Republic's troops come from.
// Flipped (a French landing, src/wcampaign/battle.js flipLanding): the same two beaches, the British in the fort and
// the town.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost, buildVillage } from './common.js';
import { coastline, shoreFrame, waterlineZ } from './coastLine.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1795_0627);
const sea = createSea({ level: 0, size: SIZE, color: 0x2e6478 }); // (the Atlantic in the shelter of the bay: blue-grey)

/** The shore (m from the waterline, + ashore): the Atlantic beyond the west edge, the isthmus running on south off the map down the west flank, the bay's inner corner under Plouharnel, Carnac's beach. */
const D0 = coastline([
  [-1200, 300], [-560, 240], [-520, 40], [-505, -300], [-500, -1300], [-300, -1300], [-300, -420], [-285, -250], [-250, -160], [-190, -110],
  [-120, -95], [60, -120], [250, -150], [500, -175], [1200, -200],
]);
const wob = (x: number, z: number) => fbm(noise, x * 0.006, z * 0.006, 2) * 6;
const D = (x: number, z: number) => D0(x, z) + wob(x, z);
const Dr = (x: number, z: number) => D0.raw(x, z) + wob(x, z); // (uncached: for placing things at load)

/** The Anse du Pô: a tidal creek winding up from the bay between Plouharnel and Carnac (x at z); mud fordable at two places; < 0 in its water. */
const creekX = (z: number) => 30 + 30 * Math.sin(z * 0.006 + 0.3) + 0.1 * z;
const FORDS = [{ name: 'The causeway', z: 0 }, { name: 'Le Pô ford', z: 260 }];
const fordK = (z: number) => Math.max(...FORDS.map((f) => smoothstep(26, 12, Math.abs(z - f.z))));
const creek = (x: number, z: number) => (z < -140 ? 99 : Math.abs(x - creekX(z)) - (5 + 10 * smoothstep(40, -110, z)) * smoothstep(420, 300, z) + 40 * smoothstep(360, 460, z));

/** The heights: Hoche's lines at the back, the fort's knoll on the isthmus, the low ridge of the alignments. */
const BARBE = { x: 120, z: 730 };
const FORT = { x: -400, z: -430 };
const PLOU = { x: -330, z: 70 };
const CARNAC = { x: 260, z: 210 };
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

function height(x: number, z: number) {
  const d = D(x, z);
  if (d < 0) { // the bottom: a sand bar, then shelving into the bay; the Atlantic deeper off the isthmus
    const s = -d, bar = 0.5 * Math.exp(-(((s - 45) / 14) ** 2));
    return Math.max(0.5 - s * 0.02 - Math.max(0, s - 120) * 0.04 * (1 + smoothstep(-480, -540, x)) + bar, -16);
  }
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const dunes = (3 + fbm(noise, x * 0.012, 3.7, 2) * 2.2) * Math.exp(-(((d - 52) / 18) ** 2));
  // the heath: low and rolling, granite knolls, rising gently to Hoche's heights; the isthmus a low spine of sand and rock
  const isth = smoothstep(-100, -220, z) * smoothstep(-250, -320, x);
  let land = 2.6 + smoothstep(60, 400, d) * 4 * (1 - isth) + fbm(noise, x * 0.005, z * 0.005, 3) * 2.2
    + smoothstep(380, 820, z) * 18 * (1 + fbm(noise, x * 0.004 + 7, z * 0.004, 2) * 0.3)
    + hill(x, z, BARBE.x, BARBE.z, 180, 9) + hill(x, z, FORT.x, FORT.z, 60, 7) + hill(x, z, 120, 380, 150, 4);
  let h = Math.max(beach + dunes * smoothstep(15, 35, d), Math.min(land, beach + d * 0.3));
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, x) * 22 * smoothstep(60, 200, d) + smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, -x) * 10 * smoothstep(60, 200, d) * smoothstep(-100, 100, z);
  // the creek: mud flats too soft and deep to cross but at the fords
  const b = creek(x, z);
  if (b < 40) {
    const bed = -0.3 - 1.2 * (1 - fordK(z));
    h += (Math.min(h, bed) - h) * smoothstep(22, 0, b);
  }
  return h;
}

/** Soft going: the beach sand, the creek's mud and saltings. */
function soft(x: number, z: number, foot: boolean) {
  const d = D(x, z);
  if (d >= 0 && d < 35) return foot ? 0.85 : 0.6;
  if (creek(x, z) < 14) return foot ? 0.65 : 0.4;
  return 1;
}

const segD = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};

/** The two landing places: where the shore is, and the way inland. */
const beachAt = (x: number) => { const z = waterlineZ(Dr, x); return { x, z, ...shoreFrame(Dr, x, z + 4) }; };
const PLB = beachAt(-170);
const CARB = beachAt(260);
const up = (b: ReturnType<typeof beachAt>, along: number, inl: number) => ({ x: b.x + b.tx * along + b.nx * inl, z: b.z + b.tz * along + b.nz * inl });

/** The roads: the isthmus road from the fort up to Plouharnel, over the causeway, along to Carnac, up to Hoche's lines and Auray. */
const ROADS: number[][] = [
  [FORT.x, FORT.z, -400, -820], [FORT.x, FORT.z, -400, -150], [-400, -150, PLOU.x, PLOU.z], [PLOU.x, PLOU.z, -170, -40], [-170, -40, creekX(0) - 10, 0], [creekX(0) + 10, 0, CARNAC.x, CARNAC.z],
  [CARNAC.x, CARNAC.z, 270, -100], [-170, -40, -170, -100], [CARNAC.x, CARNAC.z, 300, 500], [300, 500, BARBE.x, BARBE.z], [BARBE.x, BARBE.z, 120, 900],
  [PLOU.x, PLOU.z, -150, 290], [-150, 290, creekX(260), 260], [creekX(260), 260, 150, 320], [150, 320, CARNAC.x, CARNAC.z],
  [PLOU.x, PLOU.z, -360, 420], [-360, 420, -200, 620], [-200, 620, BARBE.x, BARBE.z], [300, 500, 480, 700],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => segD(x, z, ax, az, bx, bz)));

/** The beach sectors (x) and what lies inland behind each. */
export const SECTORS = [
  { x: PLB.x, name: 'Plouharnel strand', inland: { name: 'Fort Penthièvre', ...FORT } },
  { x: CARB.x, name: 'Carnac beach', inland: { name: 'Carnac', ...CARNAC } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Warren’s squadron', x: 120, z: -760, owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` what lies behind once taken)
  { id: 'B', name: SECTORS[0].name, ...up(PLB, 0, 44), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, ...up(CARB, 0, 46), owner: null, sector: 'east', radius: 60, opens: 'F' },
  { id: 'E', name: 'Fort Penthièvre', x: FORT.x, z: FORT.z, owner: null, sector: 'west' },
  { id: 'F', name: 'Carnac', x: CARNAC.x, z: CARNAC.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Hoche’s camp', x: BARBE.x, z: BARBE.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
/** The alignments: rows of standing stones running east–west across the heath north of Carnac. */
const STONES = { x0: 80, x1: 360, z: 420, rows: 9, gap: 6 };

/** Pines and gorse in clumps on the heath, the saltings' reeds bare (0..1). */
const woods = (x: number, z: number) => {
  const d = D(x, z);
  if (d < 80 || (x < -280 && z < -120)) return 0;
  let k = smoothstep(0.45, 0.64, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.35 + 0.45 * smoothstep(250, 600, z));
  if (creek(x, z) < 30) k = 0;
  if (x > STONES.x0 - 20 && x < STONES.x1 + 20 && Math.abs(z - STONES.z) < 45) k = 0;
  for (const p of points) k = Math.min(k, smoothstep(40, 70, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'quiberon',
  name: 'Quiberon 1795',
  description: 'Brittany, June 1795: Warren’s boats put the émigré regiments ashore to take the Penthièvre fort on the Quiberon isthmus. The isthmus running south down the bay’s west side with the fort on its knoll, Plouharnel strand and the Anse du Pô, Carnac’s beach and town, the standing stones on the heath and Hoche’s lines at the back.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'europe',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] }, // (Hoche's Army of the Coasts of Brest against the émigrés in British pay, landed by the Royal Navy)
  airfields: [],
  conditions: { time: 'day', weather: 'overcast' }, // (a grey Breton June: drizzle off the Atlantic)
  wind: { from: 240, speed: 5, veer: 0.2 },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1795_0627,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.75,
  fields: createFields({ seed: 1795_6, cell: 60, weights: [0.3, 0.3, 0.2, 0.2] }), // small walled fields, rye and buckwheat, heath pasture

  theme: {
    // a soft Atlantic day: low silver cloud, green-grey light
    fogColor: 0xb4bcbc, fogDensity: 0.0006,
    skyTop: 0x6e86a0, skyHorizon: 0xc8d0d0, skyBottom: 0x8a9086,
    sunColor: 0xf2eedc, sunIntensity: 1.6, sunDisk: 0.3,
    clouds: 0.6, cloudLight: 0xe4e6e6, cloudDark: 0x98a0a4,
    sunDir: [-0.35, 0.6, -0.55],
    hemiSky: 0xc0ccd4, hemiGround: 0x6a6c50, hemiIntensity: 1.25,
    rimColor: 0xe0e2e0, rimIntensity: 0.25,
    terrain: {
      grass: '#6a7a44', grassAlt: '#62723e', dryGrass: '#8e8a54', dirt: '#7a6a4c', rock: '#8e8c84',
      pasture: '#728246', ploughed: '#7a644a', stubble: '#a69868', meadow: '#6a8244',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = D(x, z);
        if (d < 0) return [y > -1.2 ? 0xccc2a2 : 0x7e8a84, 1];   // the sand under the water
        if (d < 32) return [0xdcd0ae, 1];                       // the beach
        const b = creek(x, z);
        if (b < 8) return [0x5a5442, 0.95];                     // the creek's mud
        if (b < 26) return [0x7a7a4a, 0.7];                     // the saltings: samphire and sea-lavender
        if (roadDist(x, z) < 3) return [0xa69a7a, 0.8];         // the sandy tracks
        if (d < 75) return [0xc4ba92, 0.6];                     // the dunes and marram
        const heath = smoothstep(0.4, 0.6, fbm(noise, x * 0.006 + 40, z * 0.006, 2));
        return heath > 0.05 ? [0x6a5a48, heath * 0.5] : null;   // the heather and gorse of the landes
      },
    },
  },

  bases: { nato: { x: 100, z: 660, entries: [-330, 100, 380] }, pact: { x: 120, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the émigrés land: their roads are the beach sectors)
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 300 }, pact: { x: -100, z: -250 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    // the squadron's boats: the regiments in flatboats, the guns and stores in the launches
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.2, // (the bay is sheltered: a little swell on the sand)
    signal: { t: 25, say: 'Warren’s signal: the boats pull for Carnac beach and Plouharnel strand — the chouans are waiting on the dunes', sayOther: 'English sails in the bay and boats full of émigrés: they are landing at Carnac and Plouharnel!' },
    // Warren's frigates close in to cover the boats
    navy: ['frigate', 'destroyer'],
    // the coast's guns: the Penthièvre fort's sea battery, a battery on Carnac point, the field guns behind Carnac beach
    forts: [
      { unit: 'shoreBattery', name: 'Fort Penthièvre', x: FORT.x + 45, z: FORT.z - 30, facing: Math.PI },
      { unit: 'shoreBattery', ...up(CARB, 150, 45), facing: Math.PI },
      { unit: 'artillery', ...up(CARB, -110, 100), facing: Math.PI },
    ],
    // the coast guard's trenches behind the dunes, stakes along the back of the sand
    works: [
      ...[-24, 24].map((dx) => ({ kind: 'trench', ...up(PLB, dx, 60), yaw: PLB.yaw })),
      ...[-30, -16, 16, 30].map((dx) => ({ kind: 'wire', ...up(PLB, dx, 24), yaw: PLB.yaw })),
      ...[-50, 0, 50].map((dx) => ({ kind: 'trench', ...up(CARB, dx, 66), yaw: CARB.yaw })),
      ...[-48, -32, -16, 16, 32, 48].map((dx) => ({ kind: 'wire', ...up(CARB, dx, 36), yaw: CARB.yaw })),
    ],
    // the fort's garrison and the coast guard; the rest in the villages
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle', 'rifles', 'rifles', 'mgTeam'],
    names: { reconVehicle: 'Chasseurs de l’Armée des Côtes' },
    // Hoche comes down from his lines
    counter: { t: 160, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery', 'rifles', 'mgTeam'], say: 'Hoche is marching down from his lines — drive them into the sea!', sayOther: 'Republican columns coming down off the heights!' },
    hold: [...[-20, 20].map((dx) => up(PLB, dx, 60)), ...[-30, 30].map((dx) => up(CARB, dx, 66)), FORT, CARNAC, PLOU],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'marines', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2200, perSector: 700, beachIncome: 0.8, defenceCp: 1100, defenceIncome: 1.6 },
    waves: [
      // the first wave: the émigré regiments of Hervilly, du Dresnay and Hector, the Loyal-Émigrant
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'guard', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'sniper', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'atTeam', sector: 1 },
      ] },
      { t: 150, say: 'The launches bring in the guns, and the marines of the squadron', units: [{ unit: 'artillery', sector: 1 }, { unit: 'marines', sector: 0 }, { unit: 'rifles', sector: 1 }] },
      { t: 300, say: 'Sombreuil’s division is coming ashore', units: [{ unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'artillery', sector: 1 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1795_0628);
    sea.build(scene, terrain);
    const near = (x: number, z: number, rr: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < rr);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 4 + rr && creek(x, z) > 26 + rr && D(x, z) > 80 + rr;

    // ---- Fort Penthièvre: a granite star-fort on its knoll across the isthmus, the point in its yard (walls round it, never on it)
    {
      const g = terrain.heightAt(FORT.x, FORT.z), STONE = 0x9a968a, R = 40;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8, x = FORT.x + Math.cos(a) * R, z = FORT.z + Math.sin(a) * R;
        if (roadDist(x, z) < 8 || D(x, z) < 8) continue; // (the gates; nothing in the sea)
        props.wall({ x, z, yaw: a + Math.PI / 2, length: 28, height: 4.5, thickness: 3 });
      }
      for (const [dx, dz] of [[-20, 14], [18, 18]]) props.townHouse({ x: FORT.x + dx, z: FORT.z + dz, yaw: 0, width: 12, depth: 6, storeys: 1, name: 'barrack', damaged: 0 });
      props.box('stone', FORT.x + 45, g + 1.4, FORT.z - 44, 18, 3.4, 2.4, 0.4, STONE); // the sea battery's parapet
    }
    // ---- Plouharnel and Carnac; Saint-Cornély's church; a hamlet behind Hoche's lines
    for (const [p, seed] of [[PLOU, 17951], [P.F, 17952], [P.K, 17953]] as const) buildVillage(props, p, seed);
    props.rand = mulberry32(1795_0629);
    props.church({ x: CARNAC.x + 36, z: CARNAC.z + 28, yaw: 0.1 });
    props.church({ x: PLOU.x + 34, z: PLOU.z + 30, yaw: Math.PI / 2 });
    for (const [c, n] of [[CARNAC, 14], [PLOU, 8]] as const) for (let i = 0; i < n; i++) { // granite cottages, unharmed
      const a = r() * Math.PI * 2, rr = 34 + r() * 36, x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr;
      if (roadDist(x, z) < 7 || D(x, z) < 60 || creek(x, z) < 20 || near(x, z, 30)) continue;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: Math.atan2(z - c.z, x - c.x) + Math.PI / 2, width: 8 + r() * 3, depth: 6, storeys: 1, name: 'cottage', damaged: 0 });
    }
    // ---- Hoche's lines: an earthwork across the heights in front of his camp
    for (let i = -6; i <= 6; i++) {
      const x = BARBE.x + i * 26, z = BARBE.z - 90 + Math.abs(i) * 6;
      if (roadDist(x, z) < 8) continue;
      props.wall({ x, z, yaw: -Math.sign(i) * 0.23, length: 24, height: 1.8, thickness: 3.5 });
    }
    // ---- the alignments: rows of grey menhirs, tall at the west end, dwindling east
    for (let row = 0; row < STONES.rows; row++) for (let x = STONES.x0; x < STONES.x1; x += 7 + r() * 5) {
      const z = STONES.z - 24 + row * STONES.gap + (x - STONES.x0) * 0.05, t = 1 - (x - STONES.x0) / (STONES.x1 - STONES.x0);
      if (roadDist(x, z) < 4) continue;
      const hgt = 0.8 + t * 2.4 + r() * 0.8;
      props.box('stone', x, terrain.heightAt(x, z) + hgt / 2 - 0.2, z, 0.9 + r() * 0.5, hgt, 0.6 + r() * 0.4, r() * 0.6, 0x8a8a84);
    }
    // farms on the heath and their dry-stone walls
    for (let i = 0, n = 0; i < 500 && n < 16; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = 0 + r() * 720;
      if (!free(x, z, 10) || near(x, z, 80) || (x > STONES.x0 - 30 && x < STONES.x1 + 30 && Math.abs(z - STONES.z) < 50)) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: r() * Math.PI, width: 9 + r() * 3, depth: 6, storeys: 1, name: 'farm', damaged: 0 });
      props.lowWall({ x: x + 12, z: z + 6, yaw: r() * Math.PI, length: 12 + r() * 10, height: 1.1, color: 0x8a8880 });
      props.lowWall({ x: x - 8, z: z - 12, yaw: r() * Math.PI, length: 10 + r() * 10, height: 1.1, color: 0x8a8880 });
    }
    // fishermen's boats on the Carnac sand
    for (let i = 0; i < 4; i++) { const q = up(CARB, 60 + i * 9, 16); props.box('plain', q.x, terrain.heightAt(q.x, q.z) + 0.4, q.z, 1.6, 0.6, 5, 0.3, 0x4a3c30); }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: FORT.x, z: FORT.z, r: 56 },
      { test: (x: number, z: number) => roadDist(x, z) < 5 || creek(x, z) < 22 || D(x, z) < 75 || (x > STONES.x0 - 10 && x < STONES.x1 + 10 && Math.abs(z - STONES.z) < 35) }];
    // maritime pines and gorse brakes on the heath, a few oaks by the farms
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 1100, broadleaf: 0.35, autumn: 0, maxY: 80,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.9, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => D(x, z) < 34 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
