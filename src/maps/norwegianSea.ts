// The Norwegian Sea, 1985: the Northern Fleet comes down past Lofoten to break into the Atlantic; a NATO group waits
// for it off the Norwegian coast. Laid out from the real waters (north at z < 0): the Lofoten wall — Moskenesøya,
// Flakstadøya, Vestvågøy, Austvågøy, steep bare peaks out of the sea — running from the south-west to the north-east
// across the map, cut by its narrow sounds (Nappstraumen, Gimsøystraumen); Værøy and Røst trailing off its south-west tip
// with the Moskenstraumen, the maelstrom, between Lofotodden and Værøy; behind the wall the Vestfjord, the wide sea
// between the islands and the mainland that leads north-east to Narvik; the mainland itself along the south-east edge,
// snow on the tops, a fishing village at the mouth of a fjord. The open Norwegian Sea fills the north-west. The Northern
// Fleet comes down from the north, outside the wall; NATO comes up from the south-west, past Røst. The peaks hide a ship from
// radar: wait silent in the Vestfjord, or come round the wall close. Fair by the sailing routes (seapath): the open
// sea west of the wall, Nappstraumen through it and the Vestfjord behind it, each as near one fleet as the other. Ships only (data/units/ships85.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 6000;
const HALF = 2500;
const noise = createNoise2D(1985_09);
const sea = createSea({ level: 0, size: SIZE, color: 0x23404f });

/** The Lofoten wall: from Lofotodden (its south-west tip) to Austvågøy and on into Vesterålen. */
const L0 = { x: -1300, z: 1250 }, L1 = { x: 3600, z: -3300 };
const LEN = Math.hypot(L1.x - L0.x, L1.z - L0.z);
/** the sounds through the wall, as fractions along it: [t, half-width in m] */
const SOUNDS = [[0.24, 230], [0.56, 95], [0.82, 105]];
/** Værøy and Røst off the tip, and the outer skerries: [x, z, radius, height] */
const ISLES = [[-2050, 1950, 260, 230], [-2900, 2800, 200, 40], [-3250, 2500, 110, 20]];
/** The mainland coast: a line from the south edge to the east edge, the land to its south-east. */
const M0 = { x: -700, z: 5200 }, M1 = { x: 5200, z: -300 };
const MN = (() => { const dx = M1.x - M0.x, dz = M1.z - M0.z, l = Math.hypot(dx, dz); return { x: -dz / l, z: dx / l }; })();
const FJORD = { x: 1900, z: 2950 };   // the fjord mouth on the mainland, the village at its head

function height(x: number, z: number) {
  let h = -75 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 12;
  // the mainland: the coast's line pushed about by the noise, a fjord cut in at FJORD
  const fj = Math.hypot(x - FJORD.x, z - FJORD.z);
  const m = (x - M0.x) * MN.x + (z - M0.z) * MN.z + fbm(noise, x * 0.0012, z * 0.0012, 3) * 260 - Math.max(0, 420 - fj) * 1.6;
  if (m > -400) h = Math.max(h, shore(m, 320 + fbm(noise, x * 0.002, z * 0.002, 2) * 80, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 25));
  // the Lofoten wall: islands 500–800 m wide, peaks to 300 m, the sounds between them
  const dx = L1.x - L0.x, dz = L1.z - L0.z;
  const t = ((x - L0.x) * dx + (z - L0.z) * dz) / (LEN * LEN);
  if (t > -0.15 && t < 1.15) {
    const tc = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - L0.x - dx * tc, z - L0.z - dz * tc);
    let w = 260 + 140 * Math.sin(Math.min(1, t * 4) * Math.PI / 2) + fbm(noise, x * 0.004, z * 0.004, 2) * 120;
    for (const [st, hw] of SOUNDS) { const g = Math.abs(t - st) * LEN; if (g < hw * 1.8) w = Math.min(w, (g - hw) * 3); }
    if (w > 0 && d < w + 400) h = Math.max(h, island(w - d, w, 300, fbm(noise, x * 0.014, z * 0.014, 2) * 0.5 + 0.5, 6));
  }
  for (const [ix, iz, r, top] of ISLES) {
    const d = r - Math.hypot(x - ix, z - iz) + fbm(noise, x * 0.006, z * 0.006, 2) * 50;
    if (d > -400) h = Math.max(h, island(d, r, top, fbm(noise, x * 0.014, z * 0.014, 2) * 0.5 + 0.5, 8));
  }
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Carrier group', x: -2100, z: 1150, owner: 'nato', sector: 'west', radius: 150 },
  { id: 'B', name: 'Open Norwegian Sea', x: -2400, z: -1050, owner: null, sector: 'west', radius: 180 },
  { id: 'C', name: 'Nappstraumen', x: -168, z: 239, owner: null, sector: 'centre', radius: 150 },
  { id: 'D', name: 'The Vestfjord', x: 1670, z: 1175, owner: null, sector: 'east', radius: 180 },
  { id: 'K', name: 'Northern Fleet', x: -250, z: -2200, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'norwegianSea',
  name: 'Norwegian Sea',
  description: 'The Northern Fleet comes south past Lofoten to break into the Atlantic; a NATO group waits off the Norwegian coast. Open ocean to the west, the peaks and the fjord to the east — hide behind the rock, or be seen.',
  epochs: ['1985'],
  theatre: 'sea',
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'overcast' },
  fow: 0.5,
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  size: SIZE,
  segments: 400,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2600, near: 2, far: 9000 },
  seed: 198509,
  height,
  river: sea,

  theme: {
    fogColor: 0x9aa8b2, fogDensity: 0.00026,
    skyTop: 0x5d7286, skyHorizon: 0xb4bec6, skyBottom: 0x7c8c98,
    sunColor: 0xf0eee8, sunIntensity: 1.6, sunDisk: 0.3,
    clouds: 0.75, cloudLight: 0xe8ecef, cloudDark: 0x8a96a0,
    sunDir: [-0.4, 0.55, 0.6],
    hemiSky: 0xc4ccd4, hemiGround: 0x4c5a62, hemiIntensity: 1.2,
    rimColor: 0xdde4ea, rimIntensity: 0.25,
    terrain: {
      grass: '#5a6648', grassAlt: '#66704f', dryGrass: '#8a8a6a', dirt: '#6f6a5c', rock: '#77736c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 170) return [0xe4e8ea, 1];                       // snow on the tops
        if (y > 60) return [0x6d6a62, 1];                        // bare grey rock
        return y > 2 ? [0x56603f, 1] : [0x47433c, 1];            // heather and moss above the dark wet rock of the shore
      },
    },
  },

  bases: { nato: { x: -2200, z: 1350, entries: [-500, 0, 500] }, pact: { x: -250, z: -2400, entries: [-700, 0, 700] } },
  maxStacks: 12,
  cameraStart: { nato: { x: -1900, z: 900 }, pact: { x: -150, z: -1900 } },
  points,

  spawns: {
    nato: [{ unit: 'cruiser', x: -1950, z: 950, facing: 2.65 }, { unit: 'destroyer', x: -2250, z: 1000, facing: 2.65 }, { unit: 'frigate', x: -1850, z: 1250, facing: 2.65 }],
    pact: [{ unit: 'cruiser', x: -300, z: -2000, facing: -0.49 }, { unit: 'destroyer', x: 0, z: -2150, facing: -0.49 }, { unit: 'frigate', x: -550, z: -2200, facing: -0.49 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // the fishing village at the head of the fjord, and the lights on Lofotodden and Værøy
    for (let i = 0, k = 0; i < 400 && k < 18; i++) {
      const x = FJORD.x + 150 + rand() * 500, z = FJORD.z - 250 + rand() * 500, y = height(x, z);
      if (y > 3 && y < 40) { k++; props.house({ x, z, yaw: Math.PI / 4 + (rand() - 0.5) * 0.4, width: 7 + rand() * 3, depth: 6 + rand() * 2 }); }
    }
    for (const [cx, cz] of [[L0.x - 200, L0.z + 120], [ISLES[0][0] + 150, ISLES[0][1] - 180]]) {
      for (let i = 0; i < 200; i++) {
        const x = cx + (rand() - 0.5) * 240, z = cz + (rand() - 0.5) * 240, y = height(x, z);
        if (y > 3 && y < 20) { props.tower({ x, z, concrete: true }); break; }
      }
    }
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 1600, broadleaf: 0, autumn: 0, maxY: 110, size: 1.4,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 6 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
