// The Caribbean, 1804–06 (the 1806 sea battles): the St Lucia Channel between Martinique and St Lucia, in the
// Windward Islands. In 1804 the Royal Navy landed guns on Diamond Rock, a sheer pinnacle off Martinique's south-west
// corner, commissioned it "HMS Diamond Rock", and from it watched the approaches to Fort-Royal for seventeen months,
// until Villeneuve's fleet retook it in June 1805; after Trafalgar the frigates and privateers went on fighting over
// the same channel. Laid out from the real waters (north at z < 0): Martinique across the north — Mont Pelée's green
// slopes, the Pitons du Carbet, the Bay of Fort-Royal cut deep into its west coast, the south coast running away to the
// east past Le Diamant, with Diamond Rock off it; St Lucia in the south-east — Gros Islet bay and Pigeon Island at its
// north end, the two Pitons on its west coast; between them the channel, the Atlantic to windward (east), the
// Caribbean to leeward (west). The trade wind steady from the east, falling away now and then to a flat calm (the
// map's wind has `lulls`): the sails hang, and the oared gunboats get their chance. The French come out of Fort-Royal,
// the British out of Gros Islet bay. Fair by the sailing routes (seapath): every zone in the channel as near the one
// squadron as the other — the windward mouth, Diamond Rock, the leeward roads and the open Caribbean.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 5600;
const HALF = 2000;
const noise = createNoise2D(1806_02);
const sea = createSea({ level: 0, size: SIZE, color: 0x0e5a86 });

/** Martinique's south coast (z) at x, and its west coast (x) at z, the Bay of Fort-Royal cut into it. */
const southZ = (x: number) => -1150 - Math.max(0, x + 500) * 0.4;
const westX = (z: number) => -1500 + Math.max(0, -2300 - z) * 0.18 + Math.max(0, 1 - Math.abs(z + 2650) / 450) * 1300;
const DIAMOND = { x: -1050, z: -700 };
const PELEE = { x: -300, z: -3700 }, CARBET = { x: 300, z: -2900 };
/** St Lucia: its north tip at Gros Islet, its west coast running south past the Pitons. */
const lucX = (z: number) => 950 + Math.max(0, z - 2350) * 0.22;
const lucZ = (x: number) => 2350 + Math.max(0, x - 1100) * 0.35;
const PITONS = [[1700, 3550, 110, 260], [1780, 3800, 120, 240]];
const PIGEON = { x: 850, z: 2400 };

function height(x: number, z: number) {
  let h = -55 + fbm(noise, x * 0.0006, z * 0.0006, 4) * 10;
  const wob = fbm(noise, x * 0.003, z * 0.003, 3);
  const nn = fbm(noise, x * 0.012, z * 0.012, 2) * 0.5 + 0.5;
  if (z < -600) {
    const d = Math.min(southZ(x) - z, x - westX(z)) + wob * 140;
    if (d > -300) {
      h = Math.max(h, shore(d, 140, nn, 16));
      for (const [px, pz, r, t] of [[PELEE.x, PELEE.z, 1400, 420], [CARBET.x, CARBET.z, 900, 300]]) {
        const k = Math.hypot(x - px, z - pz);
        if (d > 40 && k < r) h += Math.pow(1 - k / r, 1.6) * t * Math.min(1, (d - 40) / 300);   // Mont Pelée and the Pitons du Carbet
      }
    }
  }
  if (z > 1800 && x > 400) {
    const d = Math.min(x - lucX(z), z - lucZ(x)) + wob * 120;
    if (d > -300) h = Math.max(h, shore(d, 160, nn, 14));
    for (const [px, pz, r, t] of PITONS) h = Math.max(h, island(r - Math.hypot(x - px, z - pz), r, t, 0.9, 3));   // the Pitons, sheer
    h = Math.max(h, island(110 - Math.hypot(x - PIGEON.x, z - PIGEON.z) + wob * 20, 110, 60, 0.7, 6));     // Pigeon Island
  }
  // Diamond Rock: 175 m of sheer basalt out of the sea, a ledge of reef round its foot
  const dr = Math.hypot(x - DIAMOND.x, z - DIAMOND.z);
  if (dr < 300) h = Math.max(h, island(80 - dr, 80, 175, 0.95, 2), -2.2 + Math.max(0, 140 - dr) / 140 * 1.5);
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Fort-Royal squadron', x: -1150, z: -1350, owner: 'nato', sector: 'west', radius: 150 },
  { id: 'B', name: 'The windward mouth', x: 467, z: -1242, owner: null, sector: 'east', radius: 170 },
  { id: 'C', name: 'Diamond Rock', x: -704, z: -469, owner: null, sector: 'centre', radius: 170 },
  { id: 'D', name: 'The leeward roads', x: -2050, z: 400, owner: null, sector: 'west', radius: 170 },
  { id: 'E', name: 'The open Caribbean', x: -3300, z: 1030, owner: null, sector: 'west', radius: 170 },
  { id: 'K', name: 'Gros Islet squadron', x: 100, z: 1200, owner: 'pact', sector: 'east', radius: 150 },
];

export default {
  id: 'caribbean',
  name: 'The Caribbean',
  description: 'The St Lucia Channel, 1804–06: Martinique’s green mountains and Fort-Royal to the north, St Lucia and the Pitons to the south, Diamond Rock — “HMS Diamond Rock” — sheer out of the channel. The trade wind from the east, and now and then a dead calm, when the gunboats row out.',
  epochs: ['1806'],
  theatre: 'sea',
  armies: { nato: ['fr'], pact: ['gb'] }, // (the Royal Navy, not the side's default Prussians)
  region: 'caribbean',
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 85, speed: 7, veer: 0.15, lulls: true },   // the trades, easterly — with calms
  fow: 0.5,
  sides: { nato: 'France', pact: 'Britain' },
  size: SIZE,
  segments: 360,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2200, near: 1, far: 8000 },
  seed: 180602,
  height,
  river: sea,

  theme: {
    fogColor: 0xb8d8e8, fogDensity: 0.00015,
    skyTop: 0x2f7ac0, skyHorizon: 0xc0e2f2, skyBottom: 0x86b8d0,
    sunColor: 0xfff6e0, sunIntensity: 2.2, sunDisk: 0.7,
    clouds: 0.3, cloudLight: 0xffffff, cloudDark: 0xb0c4d0,
    sunDir: [0.2, 0.75, 0.3],
    hemiSky: 0xd2e8f4, hemiGround: 0x4a6a48, hemiIntensity: 1.3,
    rimColor: 0xf2f8fc, rimIntensity: 0.25,
    terrain: {
      grass: '#3e7a3a', grassAlt: '#4a8842', dryGrass: '#8aa060', dirt: '#8a7454', rock: '#7a7060',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 6) return [0x3a7836, 1];                         // the rainforest green
        return y > 0.5 ? [0xe8dcb4, 1] : [0xd8caa0, 1];          // white coral sand
      },
    },
  },

  bases: { nato: { x: -1450, z: -1350, entries: [-500, 0, 500] }, pact: { x: 0, z: 1500, entries: [-600, -150, 300] } },
  maxStacks: 10,
  cameraStart: { nato: { x: -1000, z: -1150 }, pact: { x: 0, z: 1000 } },
  points,

  spawns: {
    nato: [{ unit: 'cruiser', x: -1300, z: -1050, facing: 0.46 }, { unit: 'frigate', x: -1000, z: -1250, facing: 0.46 }, { unit: 'cruiser', x: -1100, z: -1550, facing: 0.46 }, { unit: 'ptBoat', x: -900, z: -1000, facing: 0.46 }],
    pact: [{ unit: 'cruiser', x: -100, z: 1150, facing: -2.68 }, { unit: 'frigate', x: 150, z: 1000, facing: -2.68 }, { unit: 'cruiser', x: 300, z: 1250, facing: -2.68 }, { unit: 'destroyer', x: -150, z: 1350, facing: -2.68 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const at = (cx: number, cz: number, sx: number, sz: number, n: number, lo: number, hi: number, put: (x: number, z: number) => void) => {
      for (let i = 0, k = 0; i < n * 25 && k < n; i++) { const x = cx + (rand() - 0.5) * sx, z = cz + (rand() - 0.5) * sz, y = height(x, z); if (y > lo && y < hi) { k++; put(x, z); } }
    };
    // Fort-Royal round the bay's head, Fort Saint-Louis on its point; Le Diamant on the south coast; Gros Islet's village
    at(westX(-2650) + 250, -2650, 400, 700, 30, 2, 40, (x, z) => props.flatHouse({ x, z, yaw: rand() * Math.PI, width: 6 + rand() * 3, depth: 5 + rand() * 2 }));
    at(westX(-2200) + 60, -2200, 120, 120, 1, 3, 40, (x, z) => props.tower({ x, z }));
    at(-900, southZ(-900) - 120, 500, 160, 10, 2, 40, (x, z) => props.flatHouse({ x, z, yaw: (rand() - 0.5) * 0.4, width: 6 + rand() * 2, depth: 5 }));
    at(lucX(2700) + 150, 2700, 260, 400, 14, 2, 40, (x, z) => props.flatHouse({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.4, width: 6 + rand() * 2, depth: 5 }));
    props.tower({ x: PIGEON.x, z: PIGEON.z });                                                  // the British signal station on Pigeon Island
    for (let i = 0; i < 700; i++) {
      const x = (rand() * 2 - 1) * HALF * 2, z = (rand() * 2 - 1) * HALF * 2, y = height(x, z);
      if (y > 1 && y < 25) props.palm({ x, z, height: 7 + rand() * 6 });
    }
    props.finish();
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update() {} };
  },
} satisfies MapDef;
