// The Gulf of Finland, 2027: its eastern end, the Baltic Fleet's front door. The gulf narrows toward
// Kronstadt on Kotlin Island, St Petersburg's sea fortress, its forts on their islets round it and the
// shallow Neva Bay behind. The Finnish skerry coast along the north, closing in as the Karelian Isthmus;
// along the south the Estonian shore, Narva Bay, and the Kurgalsky peninsula with Luga Bay (Ust-Luga)
// behind it. Out in the gulf the islands the Red Army and the Finns fought over: tall wooded Gogland
// (Suursaari), Bolshoy Tyuters, low Moshchny (Lavansaari) and Seskar, Someri and the Vaindlo rock. NATO comes
// in from the west, the Baltic Fleet out from the Kronstadt roads. Fair: Gogland and Tyuters as near NATO
// as Moshchny and Narva Bay the Baltic Fleet, the open gulf between them halfway; the islands give both
// sides rock to hide behind; the same four ships a side. Laid out at full size (`widened`). Ships only — the shore
// batteries wait for the coastal battles.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 12000;
const HALF = 5000;
const noise = createNoise2D(2027_22);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a4a50 });

/** The north shore (z) at x: Finland's skerry coast, then the Karelian Isthmus closing in toward Kronstadt. */
const zN = (x: number) => -3500 + fbm(noise, x * 0.0011, 2.7, 3) * 260 + Math.max(0, x - 1500) * 0.45;
/** The south shore (z) at x: Narva Bay cuts in, the Kurgalsky peninsula juts out, then it closes in too. */
const zS = (x: number) => 3300 + fbm(noise, x * 0.0011, 6.1, 3) * 200 - Math.max(0, x - 2300) * 0.4
  + (Math.abs(x - 700) < 900 ? (900 - Math.abs(x - 700)) * 0.5 : 0) - (Math.abs(x - 2000) < 450 ? (450 - Math.abs(x - 2000)) * 1.6 : 0);
// the islands: [x, z, radius, height, stretch north–south]
const GOGLAND = [-2000, -1900, 600, 140, 1.8]; // (north of the line from NATO's home to the zones: its fleet sails past, not into, the island)
const ISLES = [[-1000, 850, 220, 25, 1], [850, -650, 300, 12, 1.3], [2400, -500, 350, 8, 1.1], [-300, -2500, 120, 18, 1], [-3100, 1900, 60, 8, 1]]; // Bolshoy Tyuters, Moshchny, Seskar, Someri, Vaindlo
const KOTLIN = [4750, -250];
const FORTS = [[4450, 350], [4500, -750], [4980, 300]];

function height(x: number, z: number) {
  let h = -38 + fbm(noise, x * 0.0006, z * 0.0006, 4) * 10;
  h = Math.max(h, -3.2 + fbm(noise, x * 0.003, z * 0.003, 2) * 1.5 - Math.max(0, 4750 + fbm(noise, z * 0.002, 7.7, 3) * 350 - x) * 0.06); // Neva Bay behind Kotlin: three metres of water
  const n = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5;
  const wob = fbm(noise, x * 0.006, z * 0.006, 2) * 60;
  h = Math.max(h, shore(zN(x) - z, 40, n, 20), shore(z - zS(x), 26, n, 45));
  // the skerries off the Finnish coast: bare granite humps
  if (x < 1500 && z < zN(x) + 650 && fbm(noise, x * 0.004, z * 0.004, 3) > 0.5) h = Math.max(h, 1.5 + fbm(noise, x * 0.02, z * 0.02, 2) * 5);
  const [gx, gz, gr, gt, gs] = GOGLAND;
  h = Math.max(h, island(gr - Math.hypot((x - gx) * gs, z - gz) + wob, gr, gt, n, 10)); // Gogland: steep, wooded, four summits
  for (const [ix, iz, r, top, s] of ISLES) h = Math.max(h, island(r - Math.hypot((x - ix) * s, z - iz) + wob * 0.5, r, top, 0.4, 25));
  h = Math.max(h, island(130 - Math.hypot((x - KOTLIN[0]) * 0.3, z - KOTLIN[1]) + wob * 0.3, 130, 9, 0.3, 20)); // Kotlin: long and low
  for (const [fx, fz] of FORTS) h = Math.max(h, island(28 - Math.hypot(x - fx, z - fz), 28, 7, 0.5, 4));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'NATO squadron', x: -3950, z: 300, owner: 'nato', sector: 'centre', radius: 150 },
  { id: 'B', name: 'Gogland Reach', x: -645, z: -1307, owner: null, sector: 'west', radius: 170 },
  { id: 'C', name: 'Bolshoy Tyuters', x: -800, z: 1400, owner: null, sector: 'east', radius: 170 },
  { id: 'D', name: 'Mid-gulf', x: -200, z: 150, owner: null, sector: 'centre', radius: 190 },
  { id: 'E', name: 'Moshchny', x: 545, z: -1447, owner: null, sector: 'west', radius: 170 },
  { id: 'F', name: 'Narva Bay', x: 405, z: 1351, owner: null, sector: 'east', radius: 170 },
  { id: 'K', name: 'Kronstadt roads', x: 3550, z: 200, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'gulfOfFinland',
  name: 'Gulf of Finland',
  description: 'The gulf\'s eastern end: the Baltic Fleet sails from Kronstadt past the islands — Gogland, Tyuters, Moshchny, Seskar — between the Finnish skerries and the Estonian shore. NATO comes in from the west.',
  epochs: ['2027'],
  region: 'europe',
  theatre: 'sea',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'overcast' },
  fow: 0.5,
  sides: { nato: 'NATO', pact: 'Russia' },
  armies: { nato: ['us', 'pl'], pact: ['ru'] },
  size: SIZE,
  segments: 640,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 4200, near: 2, far: 16000 },
  seed: 202722,
  height,
  river: sea,

  theme: {
    // a cold grey autumn day on the gulf
    fogColor: 0xa0aab2, fogDensity: 0.00018,
    skyTop: 0x5a6c80, skyHorizon: 0xb8c0c6, skyBottom: 0x808e98,
    sunColor: 0xf0ece4, sunIntensity: 1.6, sunDisk: 0.3,
    clouds: 0.75, cloudLight: 0xe6eaee, cloudDark: 0x8c96a0,
    sunDir: [-0.35, 0.5, 0.65],
    hemiSky: 0xc0cad2, hemiGround: 0x4e5a4c, hemiIntensity: 1.2,
    rimColor: 0xdce2e8, rimIntensity: 0.25,
    terrain: {
      grass: '#556844', grassAlt: '#5e7048', dryGrass: '#8e8a62', dirt: '#6e6656', rock: '#8a8278',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 1.2 && y < 9 && z < zN(x) + 650 && x < 1500) return [0x8e8076, 1];    // pink-grey granite of the skerries
        if (y > 105) return [0x7e786c, 1];                                              // Gogland's bare tops
        if (y > 2.5) return [fbm(noise, x * 0.004, z * 0.004, 2) > 0.15 ? 0x6e7650 : 0x4e6440, 1];
        return y > -0.8 ? [0xd0c6a2, 1] : [0xaea284, 1];
      },
    },
  },

  bases: { nato: { x: -4300, z: 300, entries: [-800, 0, 800] }, pact: { x: 3900, z: 200, entries: [-700, 0, 700] } },
  maxStacks: 14,
  cameraStart: { nato: { x: -3900, z: 300 }, pact: { x: 3500, z: 200 } },
  points,

  spawns: {
    nato: [{ unit: 'destroyer', x: -4150, z: 300, facing: Math.PI / 2 }, { unit: 'frigate', x: -3950, z: 0, facing: Math.PI / 2 }, { unit: 'ptBoat', x: -3850, z: 550, facing: Math.PI / 2 }, { unit: 'ptBoat', x: -3950, z: 800, facing: Math.PI / 2 }],
    pact: [{ unit: 'destroyer', x: 3750, z: 200, facing: -Math.PI / 2 }, { unit: 'frigate', x: 3550, z: 500, facing: -Math.PI / 2 }, { unit: 'ptBoat', x: 3450, z: -50, facing: -Math.PI / 2 }, { unit: 'ptBoat', x: 3550, z: -300, facing: -Math.PI / 2 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const town = (cx: number, cz: number, n: number, rx: number, rz: number, face: number, church = true) => {
      for (let i = 0; i < n; i++) {
        const x = cx + (rand() - 0.5) * rx, z = cz + (rand() - 0.5) * rz;
        const y = height(x, z);
        if (y > 2 && y < 40) props.townHouse({ x, z, yaw: face + (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 8 + rand() * 2, storeys: 2, damaged: 0 });
      }
      if (church) props.church({ x: cx, z: cz, yaw: face });
    };
    // Kronstadt: the naval cathedral among the town's blocks on the island's east end
    town(KOTLIN[0] + 120, KOTLIN[1], 26, 360, 140, 0, false);
    props.church({ x: KOTLIN[0] + 60, z: KOTLIN[1] + 10, yaw: Math.PI / 2 });
    for (const [fx, fz] of FORTS) for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; props.lowWall({ x: fx + Math.cos(a) * 18, z: fz + Math.sin(a) * 18, yaw: a + Math.PI / 2, length: 19, height: 4, color: 0x8a8478 }); }
    town(-2600, zS(-2600) + 200, 16, 420, 200, Math.PI);   // an Estonian village on the coast road
    town(1950, zS(1950) + 260, 10, 200, 260, Math.PI);     // Ust-Luga on the Kurgalsky shore
    town(-1700, zN(-1700) - 220, 14, 400, 200, 0);         // Kotka's suburbs on the Finnish shore
    for (let i = 0; i < 6; i++) props.house({ x: GOGLAND[0] + 120 + rand() * 60, z: GOGLAND[1] - 120 + rand() * 240, yaw: Math.PI / 2, width: 7, depth: 6 }); // Suurkylä, Gogland's harbour village
    props.tower({ x: GOGLAND[0], z: GOGLAND[1] - 520, concrete: true });   // Gogland's north light
    props.tower({ x: -1000, z: 700, concrete: true });                       // Tyuters light
    props.tower({ x: 2400, z: -800, concrete: true });                       // Seskar light
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 3200, broadleaf: 0.2, autumn: 0.5, maxY: 150, size: 1.25,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 3 || (x > 4300 && Math.abs(z - KOTLIN[1]) < 200) }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
