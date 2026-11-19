// The Bornholm Strait, 2027: the Baltic's gate between its eastern and western halves. Bornholm in the
// middle — Danish, a granite island with cliffs to the north (Hammeren) and white dunes in the south
// (Dueodde), Rønne on its west shore — the Ertholmene with Christiansø's fortress to the north-east; the
// Bornholmsgat between it and the Swedish coast of Skåne (Sandhammaren) to the north-west; the Pomeranian
// coast of Poland along the south. Shoals out on the water: the Rønne Bank, the Adler Grund and the Słupsk
// Bank. The Baltic Fleet comes from the east, bound for the Danish straits; NATO bars the way from the
// Arkona Basin in the west. Fair: the Bornholmsgat and the Rønne Bank as near NATO as Christiansø and the
// water off Dueodde the Baltic Fleet, the Bornholm Basin to the south halfway; the island blocks the middle,
// so each side picks north or south of it. Laid out at full size (`widened`). Ships only.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 12000;
const HALF = 5000;
const noise = createNoise2D(2027_24);
const sea = createSea({ level: 0, size: SIZE, color: 0x284852 });

/** Bornholm: its middle and half-axes — long from Hammeren (north-west) to Dueodde (south-east). */
const BH = { x: 95, z: -340, a: 1500, b: 1110, ux: 0.523, uz: 0.852 };
const bornholm = (x: number, z: number) => {
  const dx = x - BH.x, dz = z - BH.z;
  return (1 - Math.hypot((dx * BH.ux + dz * BH.uz) / BH.a, (dx * BH.uz - dz * BH.ux) / BH.b)) * 1100;
};
const HAMMEREN = [-650, -1560];
const ERTHOLMENE = [[1420, -1880, 90], [1530, -1790, 70], [1300, -1960, 40]];
/** Skåne (z) at x: the south coast at Ystad, then it turns north past Sandhammaren. */
const zSk = (x: number) => -2560 + fbm(noise, x * 0.0015, 2.2, 3) * 150 - Math.max(0, x + 3400) * 1.6;
/** Pomerania (z) at x: Kołobrzeg's coast along the south. */
const zP = (x: number) => 4450 + fbm(noise, x * 0.0012, 9.1, 3) * 160 - Math.max(0, x - 2500) * 0.2;
// shoals: [x, z, radius, depth at the crest]
const BANKS = [[-1700, 2350, 520, -7], [-3600, 3300, 480, -6], [3300, 2700, 560, -7]]; // Rønne Bank, Adler Grund, Słupsk Bank

function height(x: number, z: number) {
  let h = -55 + fbm(noise, x * 0.0006, z * 0.0006, 4) * 14 - Math.max(0, 1 - Math.hypot(x - 1800, z - 400) / 2500) * 30; // the Bornholm Deep to its east
  const n = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5;
  const wob = fbm(noise, x * 0.004, z * 0.004, 2) * 90;
  for (const [bx, bz, r, top] of BANKS) h = Math.max(h, top - Math.max(0, 250 - (r - Math.hypot(x - bx, z - bz) + wob)) * 0.12); // (sloping up from the deep)
  h = Math.max(h, island(bornholm(x, z) + wob, 900, 110, n, 20 + Math.max(0, z + 340) * 0.04)); // granite in the north, beaches in the south
  h = Math.max(h, island(300 - Math.hypot(x - HAMMEREN[0], z - HAMMEREN[1]) + wob * 0.4, 300, 80, 0.9, 4)); // Hammeren's cliffs
  for (const [ex, ez, r] of ERTHOLMENE) h = Math.max(h, island(r - Math.hypot(x - ex, z - ez), r, 22, 0.6, 4));
  h = Math.max(h, shore(zSk(x) - z, 35, n, 40), shore(z - zP(x), 30, n, 50));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Arkona Basin', x: -3950, z: -300, owner: 'nato', sector: 'centre', radius: 150 },
  { id: 'B', name: 'Bornholmsgat', x: -1900, z: -2100, owner: null, sector: 'west', radius: 180 },
  { id: 'C', name: 'Rønne Bank', x: -1500, z: 1800, owner: null, sector: 'east', radius: 170 },
  { id: 'D', name: 'Christiansø', x: 2000, z: -1950, owner: null, sector: 'west', radius: 170 },
  { id: 'E', name: 'Off Dueodde', x: 1400, z: 1900, owner: null, sector: 'east', radius: 170 },
  { id: 'F', name: 'Bornholm Basin', x: -100, z: 2600, owner: null, sector: 'centre', radius: 190 },
  { id: 'K', name: 'Słupsk Furrow', x: 3950, z: 0, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'bornholmStrait',
  name: 'Bornholm Strait',
  description: 'The Baltic\'s gate: Bornholm\'s granite in the middle, the Bornholmsgat to Sweden north of it, the Polish coast to the south. The Baltic Fleet comes from the east for the Danish straits; NATO bars the way.',
  epochs: ['2027'],
  region: 'europe',
  theatre: 'sea',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  fow: 0.5,
  sides: { nato: 'NATO', pact: 'Russia' },
  armies: { nato: ['us', 'pl'], pact: ['ru'] },
  size: SIZE,
  segments: 640,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 4200, near: 2, far: 16000 },
  seed: 202724,
  height,
  river: sea,

  theme: {
    fogColor: 0xb0bcc4, fogDensity: 0.00015,
    skyTop: 0x5478a0, skyHorizon: 0xc4d0d8, skyBottom: 0x8a9ca8,
    sunColor: 0xfff2e0, sunIntensity: 2, sunDisk: 0.5,
    clouds: 0.45, cloudLight: 0xf2f4f6, cloudDark: 0x9ca6ae,
    sunDir: [0.45, 0.55, 0.5],
    hemiSky: 0xccd6de, hemiGround: 0x5a6650, hemiIntensity: 1.25,
    rimColor: 0xe4eaee, rimIntensity: 0.25,
    terrain: {
      grass: '#5e7a44', grassAlt: '#688248', dryGrass: '#a49e6c', dirt: '#86765a', rock: '#8a7a70',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 12 && y < 70 && Math.abs(x) < 2000 && z < -900 && fbm(noise, x * 0.015, z * 0.015, 2) > -0.1) return [0x8a7268, 1]; // red-grey granite of the north cliffs
        if (y > 2.5) return [fbm(noise, x * 0.004, z * 0.004, 2) > 0.1 ? 0x8a8a52 : 0x5e7a44, 1];
        return y > -0.8 ? [0xeae4cc, 1] : [0xbcb092, 1];                                    // Dueodde's white sand
      },
    },
  },

  bases: { nato: { x: -4300, z: -300, entries: [-800, 0, 800] }, pact: { x: 4300, z: 0, entries: [-800, 0, 800] } },
  maxStacks: 14,
  cameraStart: { nato: { x: -3900, z: -300 }, pact: { x: 3900, z: 0 } },
  points,

  spawns: {
    nato: [{ unit: 'destroyer', x: -4150, z: -300, facing: Math.PI / 2 }, { unit: 'frigate', x: -3950, z: -600, facing: Math.PI / 2 }, { unit: 'ptBoat', x: -3850, z: -50, facing: Math.PI / 2 }, { unit: 'ptBoat', x: -3950, z: 200, facing: Math.PI / 2 }],
    pact: [{ unit: 'destroyer', x: 4150, z: 0, facing: -Math.PI / 2 }, { unit: 'frigate', x: 3950, z: 300, facing: -Math.PI / 2 }, { unit: 'ptBoat', x: 3850, z: -250, facing: -Math.PI / 2 }, { unit: 'ptBoat', x: 3950, z: -500, facing: -Math.PI / 2 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const town = (cx: number, cz: number, n: number, rx: number, rz: number, face: number) => {
      for (let i = 0; i < n; i++) {
        const x = cx + (rand() - 0.5) * rx, z = cz + (rand() - 0.5) * rz;
        const y = height(x, z);
        if (y > 2 && y < 60) props.townHouse({ x, z, yaw: face + (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 8 + rand() * 2, storeys: 2, damaged: 0 });
      }
      props.church({ x: cx, z: cz, yaw: face });
    };
    town(-800, -60, 30, 260, 460, -Math.PI / 2);               // Rønne
    town(1050, -300, 12, 160, 260, Math.PI / 2);               // Svaneke
    town(-150, -1250, 10, 260, 160, 0);                        // Allinge-Sandvig under Hammeren
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; props.lowWall({ x: 400 + Math.cos(a) * 14, z: -900 + Math.sin(a) * 14, yaw: a + Math.PI / 2, length: 11, height: 6, color: 0xb8b0a0 }); } // Østerlars, the round church
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; props.lowWall({ x: 1420 + Math.cos(a) * 40, z: -1880 + Math.sin(a) * 40, yaw: a + Math.PI / 2, length: 32, height: 5, color: 0x8a7a70 }); } // Christiansø's tower and ramparts
    town(-3700, zSk(-3700) - 220, 26, 700, 220, 0);            // Ystad
    town(3200, zP(3200) + 260, 22, 600, 200, Math.PI);         // Darłowo
    town(-2600, zP(-2600) + 260, 24, 600, 200, Math.PI);       // Kołobrzeg
    props.tower({ x: HAMMEREN[0] - 150, z: HAMMEREN[1] - 150, concrete: true }); // Hammeren light
    props.tower({ x: 880, z: 900, concrete: true });           // Dueodde light
    props.tower({ x: -3250, z: zSk(-3250) - 40, concrete: true }); // Sandhammaren
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 3000, broadleaf: 0.5, autumn: 0.2, maxY: 150, size: 1.2,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 3 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
