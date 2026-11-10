// The western Baltic, 1985: the Fehmarn Belt and the Mecklenburg Bight. NATO's coast — Fehmarn and the
// Holstein shore — along the south, the GDR's along the north: Wismar Bay where the Warsaw Pact's boats lie,
// the Darß peninsula pushing out to the east with its chalk-white cliff. A shallow sea (fifteen to twenty-five
// metres), sandbanks awash, beaches for a landing; red-roofed towns and churches on both shores, beech and
// pine woods. The missile boats' and the landing ships' battle. Ships only (data/units/ships85.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 6000;
const HALF = 2500;
const noise = createNoise2D(1985_08);
const sea = createSea({ level: 0, size: SIZE, color: 0x2c5058 });

/** NATO's shore (south, +z) and the GDR's (north, -z): z of the coast at x; Wismar Bay cuts the northern one. */
const southZ = (x: number) => 2350 + fbm(noise, x * 0.0012, 2.2, 3) * 160 + (x < -900 ? 0 : 260);
const northZ = (x: number) => -2300 + fbm(noise, x * 0.0012, 5.4, 3) * 160 - (Math.abs(x + 300) < 500 ? (500 - Math.abs(x + 300)) * 0.8 : 0) + (x > 900 ? (x - 900) * 0.45 : 0); // (the Darß out to the east)
const FEHMARN = [-1500, 1700, 420, 22];

function height(x: number, z: number) {
  let h = -22 + fbm(noise, x * 0.0007, z * 0.0007, 4) * 5;
  // sandbanks: shallow ridges, here and there awash
  const bank = fbm(noise, x * 0.0016 + 3, z * 0.0016, 3);
  if (bank > 0.45) h = Math.max(h, -6 + (bank - 0.45) * 18);
  const lo = (d: number, top: number) => shore(d, top, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 60); // low coasts, wide beaches
  h = Math.max(h, lo(z - southZ(x), 18), lo(northZ(x) - z, 24));
  h = Math.max(h, island(FEHMARN[2] - Math.hypot((x - FEHMARN[0]) * 0.6, z - FEHMARN[1]) + fbm(noise, x * 0.006, z * 0.006, 2) * 60, FEHMARN[2], FEHMARN[3], 0.5, 40));
  // the Darß cliff: the northern shore rises steeply where it juts out
  if (x > 1300) h = Math.max(h, shore(northZ(x) - z, 45, 0.7, 6));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Kiel Bay', x: 300, z: 2000, owner: 'nato', sector: 'centre', radius: 150 },
  { id: 'B', name: 'Fehmarn Belt', x: -1500, z: 1050, owner: null, sector: 'west', radius: 170 },
  { id: 'C', name: 'Kadet Channel', x: 200, z: 0, owner: null, sector: 'centre', radius: 180 },
  { id: 'D', name: 'Off the Darß', x: 1700, z: -900, owner: null, sector: 'east', radius: 160 },
  { id: 'K', name: 'Wismar Bay', x: -300, z: -1950, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'balticSea',
  name: 'Baltic Sea',
  description: 'The Fehmarn Belt and the Mecklenburg Bight: a shallow sea between NATO\'s coast and the GDR\'s, sandbanks and beaches, towns on both shores. Missile boats in close, and the landings.',
  epochs: ['1985'],
  theatre: 'sea',
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'overcast' },
  fow: 0.5,
  sides: { nato: 'NATO', pact: 'Warsaw Pact' },
  size: SIZE,
  segments: 400,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2600, near: 2, far: 9000 },
  seed: 198508,
  height,
  river: sea,

  theme: {
    fogColor: 0xa8b4b8, fogDensity: 0.00024,
    skyTop: 0x5a7690, skyHorizon: 0xc0cacc, skyBottom: 0x86989e,
    sunColor: 0xfaf0e0, sunIntensity: 1.9, sunDisk: 0.5,
    clouds: 0.6, cloudLight: 0xf0f2f2, cloudDark: 0x98a2a6,
    sunDir: [0.35, 0.6, 0.55],
    hemiSky: 0xccd6dc, hemiGround: 0x5a6a52, hemiIntensity: 1.25,
    rimColor: 0xe0e8ec, rimIntensity: 0.25,
    terrain: {
      grass: '#5e7a42', grassAlt: '#6a8448', dryGrass: '#a09a68', dirt: '#8a7a5a', rock: '#c8c4b8',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (x > 1300 && y > 8 && y < 44 && z < northZ(x) + 40) return [0xe8e6de, 1];   // the chalk cliff
        if (y > 2.5) return [fbm(noise, x * 0.004, z * 0.004, 2) > 0.1 ? 0x8a8a52 : 0x5e7a42, 1]; // fields and meadows
        return y > -0.8 ? [0xd8cca6, 1] : [0xb4a888, 1];                                 // beach sand, the banks under the water
      },
    },
  },

  bases: { nato: { x: 300, z: 2200, entries: [-700, 0, 700] }, pact: { x: -300, z: -2150, entries: [-600, 0, 600] } },
  maxStacks: 14,
  cameraStart: { nato: { x: 300, z: 2000 }, pact: { x: -300, z: -1950 } },
  points,

  spawns: {
    nato: [{ unit: 'frigate', x: 300, z: 1950, facing: Math.PI }, { unit: 'ptBoat', x: 0, z: 2050, facing: Math.PI }, { unit: 'ptBoat', x: 600, z: 2050, facing: Math.PI }, { unit: 'destroyer', x: 300, z: 2150, facing: Math.PI }],
    pact: [{ unit: 'frigate', x: -300, z: -1950, facing: 0 }, { unit: 'ptBoat', x: -600, z: -2000, facing: 0 }, { unit: 'ptBoat', x: 0, z: -2000, facing: 0 }, { unit: 'destroyer', x: -300, z: -2100, facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // towns on both shores: brick houses with red roofs round a church, a harbour mole, a lighthouse
    const town = (cx: number, cz: number, n: number, face: number) => {
      for (let i = 0; i < n; i++) {
        const x = cx + (rand() - 0.5) * 380, z = cz + (rand() - 0.5) * 220;
        const y = height(x, z);
        if (y > 2 && y < 30) props.townHouse({ x, z, yaw: face + (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 8 + rand() * 2, storeys: 2, damaged: 0 });
      }
      props.church({ x: cx, z: cz, yaw: face });
    };
    town(-300, northZ(-300) - 180, 26, 0);            // Wismar
    town(1800, northZ(1800) - 160, 12, 0);            // a Darß village behind the cliff
    town(700, southZ(700) + 170, 20, Math.PI);        // the Holstein shore
    town(FEHMARN[0] + 150, FEHMARN[1] + 60, 12, Math.PI); // Burg auf Fehmarn
    props.tower({ x: FEHMARN[0] + 380, z: FEHMARN[1] - 160, concrete: true }); // the Fehmarn light
    props.tower({ x: 2100, z: northZ(2100) - 30, concrete: true });            // the Darßer Ort light
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 1800, broadleaf: 0.55, autumn: 0, maxY: 60, size: 1.2,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 3 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
