// The Ionian Sea, 1985: the Sixth Fleet against the Soviet Mediterranean squadron (the 5th Eskadra) off western
// Greece. Laid out from the real waters (north at z < 0): Kefalonia, the big high island, in the north-west — Mount
// Ainos over its south-east, the Gulf of Argostoli cut into its south; Ithaca long and narrow to its north-east across
// the Ithaca channel; Zakynthos to the south across its strait, the cliffs of its west coast; the Peloponnese down the
// east edge with Cape Kyllini thrusting west at Zakynthos, Kyllini harbour under it; the mainland of Akarnania in the
// north-east, the Echinades islets off it, and the mouth of the Gulf of Patras between them. The open Ionian west and
// south. The Sixth Fleet comes in from the open sea in the west, the Eskadra up from the south-east round the
// Peloponnese. Fair by the sailing routes (seapath): every zone — south of Zakynthos, the Zakynthos channel, the
// Kefalonia strait, off the Echinades at the Gulf of Patras' mouth — as near the one fleet as the other. Bright, clear, the sea deep blue. Ships only (data/units/ships85.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 6000;
const HALF = 2500;
const noise = createNoise2D(1985_06);
const sea = createSea({ level: 0, size: SIZE, color: 0x0e4c7a });

// the islands: [x, z, radius across, radius along, turn, height]
const KEFALONIA = [-1900, -2100, 1000, 1400, 0.35, 420];
const ITHACA = [550, -2300, 320, 900, -0.2, 260];
const ZAKYNTHOS = [800, 3280, 520, 680, 0.4, 220];
const ECHINADES = [[2300, -1900, 120], [2650, -2350, 150], [2100, -2600, 90]];
/** The Peloponnese coast (x) at z: Cape Kyllini thrusting west at z ≈ 700, the coast falling away east into the Gulf of Patras north of it. */
const peloX = (z: number) => 3400 + Math.max(0, z - 2000) * 0.6 - Math.max(0, 700 - Math.abs(z - 700) * 1.1) * 1.4 + (z < -300 ? (-300 - z) ** 1.25 * 1.4 : 0);
/** Akarnania's coast (z) at x: across the north-east corner, the gulf's mouth south of it. */
const akarZ = (x: number) => -2900 + (x - 1800) * (x < 1800 ? 1.2 : 0.45);
const ell = (x: number, z: number, [cx, cz, ra, rb, turn]: number[]) => {
  const c = Math.cos(turn), s = Math.sin(turn), u = (x - cx) * c - (z - cz) * s, v = (x - cx) * s + (z - cz) * c;
  return { r: Math.hypot(u / ra, v / rb), u, v };
};

function height(x: number, z: number) {
  let h = -90 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 14;
  const wob = fbm(noise, x * 0.003, z * 0.003, 3);
  if (x > 1500) h = Math.max(h, shore(x - peloX(z) + wob * 200, 220, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 30));   // the Peloponnese
  if (x > -200 && z < -1000) h = Math.max(h, shore(akarZ(x) - z + wob * 220, 300, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 18)); // Akarnania
  for (const I of [KEFALONIA, ITHACA, ZAKYNTHOS]) {
    const e = ell(x, z, I);
    if (e.r > 1.6) continue;
    let d = (1 - e.r + wob * 0.18) * Math.min(I[2], I[3]);
    if (I === KEFALONIA && e.v > 200 && Math.abs(e.u + 150) < 520) d = Math.min(d, (Math.abs(e.u + 150) - (e.v - 200) * 0.32) * 1.5); // the Gulf of Argostoli
    const top = I[5] * (I === KEFALONIA ? 0.55 + 0.45 * Math.max(0, Math.min(1, (e.u + e.v * 0.4) / 900 + 0.5)) : 1); // Ainos in the south-east
    h = Math.max(h, island(d, Math.min(I[2], I[3]), top, fbm(noise, x * 0.012, z * 0.012, 2) * 0.5 + 0.5, I === ZAKYNTHOS && e.u < 0 ? 4 : 14));
  }
  for (const [ix, iz, r] of ECHINADES) { const d = r - Math.hypot(x - ix, z - iz) + wob * 30; if (d > -300) h = Math.max(h, island(d, r, 50, 0.5, 6)); }
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Sixth Fleet', x: -2000, z: 600, owner: 'nato', sector: 'west', radius: 150 },
  { id: 'B', name: 'South of Zakynthos', x: -770, z: 3685, owner: null, sector: 'west', radius: 170 },
  { id: 'C', name: 'Off the Echinades', x: 1290, z: -1710, owner: null, sector: 'east', radius: 160 },
  { id: 'D', name: 'The Kefalonia strait', x: 570, z: 25, owner: null, sector: 'centre', radius: 170 },
  { id: 'E', name: 'The Zakynthos channel', x: -165, z: 1877, owner: null, sector: 'centre', radius: 170 },
  { id: 'K', name: 'Eskadra', x: 1600, z: 2150, owner: 'pact', sector: 'east', radius: 150 },
];

export default {
  id: 'ionianSea',
  name: 'Ionian Sea',
  description: 'The Sixth Fleet against the Soviet Mediterranean squadron off western Greece: Kefalonia, Ithaca and Zakynthos high out of the sea, Cape Kyllini and the mouth of the Gulf of Patras. Bright and clear — nowhere to hide but behind the land.',
  epochs: ['1985'],
  theatre: 'sea',
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  fow: 0.5,
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  size: SIZE,
  segments: 400,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2600, near: 2, far: 9000 },
  seed: 198506,
  height,
  river: sea,

  theme: {
    fogColor: 0xc4d4e2, fogDensity: 0.00016,
    skyTop: 0x3b72b4, skyHorizon: 0xcadcea, skyBottom: 0x7aa4c6,
    sunColor: 0xfff2dc, sunIntensity: 2.5, sunDisk: 0.9,
    clouds: 0.15, cloudLight: 0xffffff, cloudDark: 0xc4ccd6,
    sunDir: [0.4, 0.8, 0.35],
    hemiSky: 0xd6e6f4, hemiGround: 0x8a7a60, hemiIntensity: 1.35,
    rimColor: 0xf0f4f8, rimIntensity: 0.3,
    terrain: {
      grass: '#7a7a48', grassAlt: '#86804e', dryGrass: '#b0a070', dirt: '#b8a580', rock: '#bcb4a2',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 120) return [0xc4bcaa, 1];                        // pale limestone on the heights
        if (y > 3) return [fbm(noise, x * 0.02, z * 0.02, 2) > 0 ? 0x7a7a4a : 0xa89c74, 1]; // maquis and dry grass
        return y > -0.6 ? [0xd8ccaa, 1] : [0xb8ad8c, 1];          // the beaches
      },
    },
  },

  bases: { nato: { x: -2300, z: 600, entries: [-200, 0, 200] }, pact: { x: 1700, z: 2300, entries: [-500, 0, 500] } },
  maxStacks: 12,
  cameraStart: { nato: { x: -2100, z: 600 }, pact: { x: 1550, z: 2100 } },
  points,

  spawns: {
    nato: [{ unit: 'cruiser', x: -2050, z: 600, facing: Math.PI / 2 }, { unit: 'destroyer', x: -2150, z: 400, facing: Math.PI / 2 }, { unit: 'frigate', x: -2150, z: 800, facing: Math.PI / 2 }],
    pact: [{ unit: 'cruiser', x: 1500, z: 2050, facing: -2.4 }, { unit: 'destroyer', x: 1750, z: 2050, facing: -2.4 }, { unit: 'frigate', x: 1500, z: 2300, facing: -2.4 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // Kyllini: white flat-roofed houses round the harbour under the cape, a domed church, the mole
    const at = (cx: number, cz: number, spread: number, n: number, lo: number, hi: number, put: (x: number, z: number) => void) => {
      for (let i = 0, k = 0; i < n * 20 && k < n; i++) { const x = cx + (rand() - 0.5) * spread, z = cz + (rand() - 0.5) * spread, y = height(x, z); if (y > lo && y < hi) { k++; put(x, z); } }
    };
    const ky = peloX(1150);
    at(ky + 250, 1150, 500, 36, 2, 70, (x, z) => props.flatHouse({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.3, width: 7 + rand() * 4, depth: 6 + rand() * 3, storeys: 1 + Math.floor(rand() * 2), dome: rand() < 0.08 }));
    at(ky + 300, 1200, 300, 1, 4, 60, (x, z) => props.church({ x, z, yaw: Math.PI / 2 }));
    props.box('stone', ky - 40, 1, 1200, 10, 2, 220, 0.2, 0xb8b0a0); // the mole
    // Argostoli on its gulf, Vathy on Ithaca, Zakynthos town on its east shore; lights on the capes
    at(KEFALONIA[0] - 200, KEFALONIA[1] + 900, 600, 30, 2, 60, (x, z) => props.flatHouse({ x, z, yaw: rand() * Math.PI, width: 7 + rand() * 3, depth: 6 + rand() * 2, storeys: 1 + Math.floor(rand() * 2) }));
    at(ITHACA[0], ITHACA[1], 500, 12, 2, 50, (x, z) => props.flatHouse({ x, z, yaw: rand() * Math.PI, width: 7, depth: 6, storeys: 1 }));
    at(ZAKYNTHOS[0] + 350, ZAKYNTHOS[1] - 150, 500, 24, 2, 50, (x, z) => props.flatHouse({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.4, width: 7 + rand() * 3, depth: 6, storeys: 2 }));
    at(KEFALONIA[0] - 700, KEFALONIA[1] + 1100, 400, 1, 3, 25, (x, z) => props.tower({ x, z, concrete: true }));
    at(ZAKYNTHOS[0] - 200, ZAKYNTHOS[1] - 600, 400, 1, 3, 25, (x, z) => props.tower({ x, z, concrete: true }));
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF * 2, z: HALF * 2 }, lane: 0, count: 4000, broadleaf: 1, autumn: 0, maxY: 260, size: 0.9,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 4 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
