// The Bay of Gdańsk, 2027: Poland's coast and Russia's Kaliningrad exclave face each other across one bay.
// In the west the Hel peninsula — a sand spit thirty-five kilometres long, a few hundred metres wide —
// curves out from Władysławowo to Hel town at its tip, the shallow Puck Bay behind it, the naval port of
// Gdynia under the Kashubian cliffs and Gdańsk at the bay's head. Along the south the Vistula Spit runs
// north-east to the strait at Baltiysk (Pillau), the Baltic Fleet's home, with the shallow Vistula Lagoon
// behind it. In the east the Sambian peninsula's high coast up to Cape Taran; to the north the open sea
// and the Gdańsk Deep. The Polish Navy and the US Navy sail from Gdynia, the Baltic Fleet from Baltiysk.
// Fair: off Hel and the Vistula mouth as near Gdynia as the Gdańsk Deep and the roads off Krynica Morska are
// to Baltiysk; the northern approaches halfway; the same four ships a side. Laid out at full size (`widened`). Ships
// only — the shore batteries (NSM, Bastion-P) wait for the coastal battles.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 12000;
const HALF = 5000;
const noise = createNoise2D(2027_23);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a4c52 });

/** The Hel peninsula: from its root at Władysławowo to the tip. */
const HEL = [-4700, -1530, -2700, -200]; // (its tip well north of Gdynia: the port looks out east over open water)
/** The Kashubian shore (x) at z: Puck Bay's west side down to Gdynia's cliffs. */
const xW = (z: number) => -4700 + Math.max(0, z + 1500) * 0.4 + fbm(noise, z * 0.0015, 1.9, 3) * 140;
/** The south shore (z) at x: Gdańsk, then the Vistula Spit running north-east to Baltiysk. */
const zS = (x: number) => (x < -1420 ? 2300 : 2340 - (x + 1420) * 0.466) + fbm(noise, x * 0.0015, 3.7, 3) * 70;
const SPIT = 170;           // m: the spit's width (the lagoon behind it)
const STRAIT = 3720;        // x: the spit ends — the strait into the lagoon at Baltiysk
/** Sambia's west coast (x) at z, up to Cape Taran; its north coast (z) at x. */
const xE = (z: number) => 4090 + Math.max(0, -z - 180) * 0.07 + fbm(noise, z * 0.0015, 8.2, 3) * 100;
const zT = (x: number) => -3060 + fbm(noise, x * 0.0015, 5.5, 3) * 120;

function helDist(x: number, z: number) {
  const [ax, az, bx, bz] = HEL, dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  const bow = Math.sin(t * Math.PI) * 160; // (the spit bows out to the north-east)
  return { d: Math.hypot(x - (ax + dx * t + bow * 0.58), z - (az + dz * t - bow * 0.81)), t };
}

function height(x: number, z: number) {
  let h = -60 + fbm(noise, x * 0.0006, z * 0.0006, 4) * 14 - Math.max(0, -z - 1000) * 0.012; // deeper to the north: the Gdańsk Deep
  const n = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5;
  const [ax, az, bx, bz] = HEL;
  if (x < bx - 200 && (bx - ax) * (z - az) - (bz - az) * (x - ax) > 0) h = Math.max(h, -3 + fbm(noise, x * 0.004, z * 0.004, 2) * 2 - Math.max(0, x + 3500 + fbm(noise, z * 0.002, 4.1, 3) * 400) * 0.035 - Math.max(0, z - 350) * 0.05); // Puck Bay behind Hel: shallow sand
  const hel = helDist(x, z);
  h = Math.max(h, shore(60 + 200 * hel.t ** 5 - hel.d, 14, n, 40));          // the Hel spit, dunes and pines, Hel town broad at the tip
  h = Math.max(h, shore(xW(z) - x, 45, n, 30));                              // the Kashubian coast: Gdynia's cliff (Orłowo)
  const s = z - zS(x);
  if (x < -1300) h = Math.max(h, shore(s, 30, n, 40));                       // Gdańsk
  else {
    if (x < STRAIT) h = Math.max(h, shore(Math.min(s, SPIT - s), 22, n, 30)); // the Vistula Spit (it ends at the strait)
    if (s > (x < STRAIT ? SPIT : 0) && s < 1100) h = Math.max(h, -2.4);       // the Vistula Lagoon: no ship floats in it
    if (s >= 1100) h = Math.max(h, shore(s - 1100, 40, n, 20));               // the Elbląg upland behind it
  }
  h = Math.max(h, shore(Math.min(x - xE(z), z - zT(x)), 60, n, 15));         // Sambia: the high coast, Cape Taran
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Gdynia roads', x: -2800, z: 800, owner: 'nato', sector: 'centre', radius: 150 },
  { id: 'B', name: 'Off Hel', x: -1400, z: -600, owner: null, sector: 'west', radius: 170 },
  { id: 'C', name: 'Vistula mouth', x: -700, z: 1500, owner: null, sector: 'east', radius: 170 },
  { id: 'D', name: 'Gdańsk Deep', x: 1050, z: -1780, owner: null, sector: 'west', radius: 190 },
  { id: 'E', name: 'Off Krynica Morska', x: 1385, z: -430, owner: null, sector: 'east', radius: 170 },
  { id: 'F', name: 'Northern approaches', x: -500, z: -2750, owner: null, sector: 'centre', radius: 180 },
  { id: 'K', name: 'Baltiysk roads', x: 3150, z: -550, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'gdanskBay',
  name: 'Bay of Gdańsk',
  description: 'Poland against Kaliningrad across one bay: the Hel peninsula and Gdynia in the west, the Vistula Spit and Baltiysk, the Baltic Fleet\'s home, in the east. Close water, short ranges, two navies at their front doors.',
  epochs: ['2027'],
  region: 'europe',
  theatre: 'sea',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'overcast' },
  fow: 0.5,
  sides: { nato: 'NATO', pact: 'Russia' },
  armies: { nato: ['pl', 'us'], pact: ['ru'] }, // (the Polish Navy's own waters: at sea a side fields its first army)
  size: SIZE,
  segments: 640,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 4200, near: 2, far: 16000 },
  seed: 202723,
  height,
  river: sea,

  theme: {
    fogColor: 0xa8b2b6, fogDensity: 0.00017,
    skyTop: 0x5c7288, skyHorizon: 0xbfc8cc, skyBottom: 0x86969c,
    sunColor: 0xf8eee0, sunIntensity: 1.8, sunDisk: 0.4,
    clouds: 0.6, cloudLight: 0xeef0f2, cloudDark: 0x96a0a6,
    sunDir: [0.4, 0.55, 0.5],
    hemiSky: 0xc8d2d8, hemiGround: 0x58664e, hemiIntensity: 1.25,
    rimColor: 0xe0e6ea, rimIntensity: 0.25,
    terrain: {
      grass: '#5e7642', grassAlt: '#68804a', dryGrass: '#a49c6c', dirt: '#8a7a5a', rock: '#a89c86',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 2.5 && y < 9 && (helDist(x, z).d < 400 || (x > -1300 && x < STRAIT && z - zS(x) < SPIT + 40))) return [0xd8ceaa, 1]; // the spits' dunes
        if (y > 2.5) return [fbm(noise, x * 0.004, z * 0.004, 2) > 0.1 ? 0x868a54 : 0x5e7642, 1];
        return y > -0.8 ? [0xe0d6b2, 1] : [0xb8ac8c, 1];
      },
    },
  },

  bases: { nato: { x: -3100, z: 1000, entries: [-500, 0, 500] }, pact: { x: 3500, z: -600, entries: [-600, 0, 600] } },
  maxStacks: 14,
  cameraStart: { nato: { x: -2750, z: 850 }, pact: { x: 3100, z: -550 } },
  points,

  spawns: {
    nato: [{ unit: 'destroyer', x: -3050, z: 950, facing: Math.PI / 2 }, { unit: 'frigate', x: -2800, z: 700, facing: Math.PI / 2 }, { unit: 'ptBoat', x: -2750, z: 1100, facing: Math.PI / 2 }, { unit: 'ptBoat', x: -2550, z: 900, facing: Math.PI / 2 }],
    pact: [{ unit: 'destroyer', x: 3450, z: -600, facing: -Math.PI / 2 }, { unit: 'frigate', x: 3200, z: -850, facing: -Math.PI / 2 }, { unit: 'ptBoat', x: 3250, z: -350, facing: -Math.PI / 2 }, { unit: 'ptBoat', x: 3000, z: -550, facing: -Math.PI / 2 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const town = (cx: number, cz: number, n: number, rx: number, rz: number, face: number) => {
      for (let i = 0; i < n; i++) {
        const x = cx + (rand() - 0.5) * rx, z = cz + (rand() - 0.5) * rz;
        const y = height(x, z);
        if (y > 2 && y < 50) props.townHouse({ x, z, yaw: face + (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 8 + rand() * 2, storeys: 3, damaged: 0 });
      }
      props.church({ x: cx, z: cz, yaw: face });
    };
    town(xW(1100) - 260, 1100, 40, 360, 700, Math.PI / 2);   // Gdynia
    for (let i = 0; i < 6; i++) props.hall({ x: xW(600) - 120, z: 450 + i * 60, yaw: Math.PI / 2, width: 24, depth: 12, height: 10, color: 0x8a8478, roof: 0x5a5650, door: 6, name: 'naval shed' }); // the naval port
    town(-2600, zS(-2600) + 320, 46, 900, 300, Math.PI);       // Gdańsk
    town(-2820, -150, 12, 160, 160, 0);                          // Hel town at the tip
    town(-3800, -1000, 8, 200, 120, 0);                         // Jastarnia on the spit
    town(1350, zS(1350) + 80, 8, 260, 60, Math.PI);             // Krynica Morska
    town(xE(-60) + 260, -60, 30, 380, 300, -Math.PI / 2);        // Baltiysk
    for (let i = 0; i < 6; i++) props.hall({ x: xE(-230 + i * 55) + 70, z: -230 + i * 55, yaw: -Math.PI / 2, width: 24, depth: 12, height: 10, color: 0x8a8478, roof: 0x5a5650, door: 6, name: 'naval shed' });
    props.tower({ x: -2640, z: -230, concrete: true });          // Hel light
    props.tower({ x: xE(-260) + 30, z: -260, concrete: true });  // Baltiysk light
    props.tower({ x: xE(-3000) + 80, z: -3000, concrete: true }); // Cape Taran light
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 3000, broadleaf: 0.3, autumn: 0.3, maxY: 90, size: 1.2,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 3 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
