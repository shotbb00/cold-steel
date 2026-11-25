// The Baltic, 1807–08 (the 1806 sea battles, the campaign's `baltic` zone): the Gulf of Danzig. In the spring of 1807
// the French besiege Danzig and the Royal Navy's sloops (Dauntless) try to run powder up the Vistula to the garrison;
// after Copenhagen (September 1807) Denmark goes over to France and the Gunboat War begins: the Danish kanonbåde — open
// boats with a long 24-pounder and sweeps — row out in the summer calms against the British frigates and brig-sloops
// escorting the Baltic convoys, and lay their guns on a helpless stern. Laid out from the real gulf (north at z < 0):
// the Hela peninsula, a low sand spit with its pines, its fishing village and its light at the tip, running south-east
// from the mainland at Großendorf, with the Putziger Wiek closed behind it; the clay cliffs of Rixhöft and Oxhöft on the
// west; the bay's south shore with Zoppot and Danzig's spires; the Vistula's mouth and the star fort of Weichselmünde;
// and the Frische Nehrung, the long Vistula spit, running away north-east toward Pillau with the Haff behind it. The
// open Baltic to the north. The gunboats lie in Danzig roads under the French guns; the convoy and its escort come in
// from the open sea in the north-east. Laid out at full size (`widened`). Fair by the sailing routes (seapath): every zone —
// the convoy route off Rixhöft, the water off Hela's tip, the Pillau road along the Nehrung — as near the gunboats as
// the escort. The wind light from the north, dying to a calm now and then (`lulls`): then the sails hang and the
// oared gunboats row. The Danes (`dk`: the French hulls' stats under the Danish flag, data/units1806/ships.js) sail
// their gunboats, brigs and a frigate.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 8000;
const HALF = 3000;
const noise = createNoise2D(1807_08);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a5658 });
// the ships' names (entities/UnitStack.js shipName): the Danish gunboat flotilla, Saumarez's Baltic squadron
Object.assign(sea, {
  names: {
    nato: {
      battleship: ['Prinds Christian Frederik'],
      cruiser: ['Prinds Christian Frederik', 'Dithmarschen', 'Hjælperen'],
      frigate: ['Najaden', 'Lougen', 'Fylla', 'Venus'],
      destroyer: ['Sarpen', 'Glommen', 'Alsen', 'Langeland', 'Kiel', 'Ørnen', 'Søormen', 'Delphinen'],
      ptBoat: ['Kanonbåd Stubbekjøbing', 'Kanonbåd Nakskov', 'Kanonbåd Aalborg', 'Kanonbåd Odense', 'Kanonbåd Kallundborg', 'Kanonbåd Svendborg', 'Kanonbåd Middelfart', 'Kanonbåd Faaborg', 'Kanonbåd Assens', 'Kanonbåd Ribe'],
      fireship: ['Brander 1', 'Brander 2', 'Brander 3'],
    },
    pact: {
      battleship: ['Victory'],
      cruiser: ['Africa', 'Dictator', 'Stately', 'Ruby', 'Superb', 'Centaur'],
      frigate: ['Tartar', 'Euryalus', 'Cerberus', 'Minerva', 'Salsette', 'Dryad'],
      destroyer: ['Dauntless', 'Turbulent', 'Thrasher', 'Forward', 'Exertion', 'Cruizer', 'Bold', 'Wrangler'],
      ptBoat: ['Gun-boat 1', 'Gun-boat 2', 'Gun-boat 3', 'Gun-boat 4', 'Gun-boat 5', 'Gun-boat 6'],
      fireship: ['Prometheus', 'Comet', 'Etna'],
    },
  },
});

/** Hela: the sand spit from the mainland at Großendorf (north-west) out south-east to its tip off Danzig. */
const HEL0 = { x: -2650, z: -280 }, HEL1 = { x: -150, z: 950 };
const helaDist = (x: number, z: number) => {
  const dx = HEL1.x - HEL0.x, dz = HEL1.z - HEL0.z;
  const t = Math.max(0, Math.min(1, ((x - HEL0.x) * dx + (z - HEL0.z) * dz) / (dx * dx + dz * dz)));
  return { d: Math.hypot(x - HEL0.x - dx * t, z - HEL0.z - dz * t), t };
};
/** The Frische Nehrung: the Vistula spit from the river's mouth north-east toward Pillau, the Haff behind it. */
const NEH0 = { x: 750, z: 2620 }, NEH1 = { x: 3400, z: 1250 };
const nehDist = (x: number, z: number) => {
  const dx = NEH1.x - NEH0.x, dz = NEH1.z - NEH0.z;
  const t = Math.max(0, Math.min(1, ((x - NEH0.x) * dx + (z - NEH0.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - NEH0.x - dx * t, z - NEH0.z - dz * t);
};
/** The bay's south shore (z) at x: Zoppot, Danzig in the bight, the Vistula's mouth at Weichselmünde. */
const coastZ = (x: number) => 2480 + fbm(noise, x * 0.0011, 4.1, 3) * 110 + Math.max(0, 1 - Math.abs(x + 100) / 1400) * 160 + Math.min(0, x + 100) * 0.16;
const DANZIG = { x: -100, z: coastZ(-100) };
const MOUTH = { x: 650, z: coastZ(650) };

function height(x: number, z: number) {
  let h = -32 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 6;
  const wob = fbm(noise, x * 0.002, z * 0.002, 3);
  const n = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5;
  // Pomerania and the west shore of the Putziger Wiek: the clay cliffs at Rixhöft and Oxhöft, the moraine behind
  const oxh = Math.max(0, 380 - Math.abs(z - 1250) * 0.7);                                  // the Oxhöft headland
  h = Math.max(h, shore(Math.min(-2520 + Math.max(0, z + 330) * 0.22 + oxh - x, z + 330) + wob * 140, 70, n, 12));
  // the bay's south shore, low dunes in front of the town
  if (x < 900) h = Math.max(h, shore(z - coastZ(x) + wob * 90, 30, n, 60));
  // the Vistula's mouth: a channel through the dunes
  if (Math.abs(x - MOUTH.x) < 90 && z < MOUTH.z + 400) h = Math.min(h, -2 - (90 - Math.abs(x - MOUTH.x)) * 0.05);
  // the Frische Nehrung, and the Frisches Haff behind it, too shallow for anything but a fishing boat; the Elbing upland beyond
  const ne = nehDist(x, z);
  if (x > 500) {
    const behind = (x - NEH0.x) * (NEH1.z - NEH0.z) - (z - NEH0.z) * (NEH1.x - NEH0.x) < 0;
    if (behind) h = Math.max(h, -2.5 + wob * 0.6, shore(z - 3000 - (x - 900) * 0.05 + wob * 80, 40, n, 30));
    h = Math.max(h, shore(160 + wob * 25 - ne, 12, 0.5, 50));
  }
  // Hela: a sand spit 250 m wide (wider at the tip), its dunes ten metres at most
  const { d, t } = helaDist(x, z);
  const w = 110 + t * 70 + wob * 25;
  if (d < w + 300) h = Math.max(h, shore(w - d, 8, 0.5, 50));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'The kanonbåde', x: 600, z: 1900, owner: 'nato', sector: 'centre', radius: 170 },
  { id: 'B', name: 'Off Hela', x: -120, z: -226, owner: null, sector: 'centre', radius: 190 },
  { id: 'C', name: 'The convoy route', x: -1785, z: -251, owner: null, sector: 'west', radius: 200 },
  { id: 'D', name: 'The Pillau road', x: 2330, z: 132, owner: null, sector: 'east', radius: 190 },
  { id: 'K', name: 'The convoy escort', x: 1700, z: -1900, owner: 'pact', sector: 'east', radius: 170 },
];

// a division in line abreast across its line of advance, 150 m apart
const line = (units: string[], cx: number, cz: number, facing: number) => units.map((unit, i) => {
  const k = (i - (units.length - 1) / 2) * 150;
  return { unit, x: Math.round(cx + Math.cos(facing) * k), z: Math.round(cz - Math.sin(facing) * k), facing };
});

export default {
  id: 'baltic-1807',
  name: 'The Gulf of Danzig',
  description: 'The Baltic, 1807–08: the Danish gunboats row out in the summer calm against the British frigates and brig-sloops escorting a convoy. The low sandy coast, Danzig’s spires and the long pinewood spit of Hela to the south.',
  epochs: ['1806'],
  theatre: 'sea',
  region: 'europe',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 355, speed: 5, veer: 0.25, lulls: true },   // a light northerly off the sea, dying to a calm now and then (world/Wind.js)
  fow: 0.5,
  sides: { nato: 'Denmark', pact: 'Britain' },
  armies: { nato: ['dk', 'fr'], pact: ['gb'] }, // (the Royal Danish Navy: maps/index.js armiesOn)
  size: SIZE,
  segments: 520,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 3500, near: 1, far: 14000 },
  seed: 180708,
  height,
  river: sea,

  theme: {
    // a pale Baltic summer: a high hazy sky, the light white, the water grey-green over the sand
    fogColor: 0xc0ccd2, fogDensity: 0.0002,
    skyTop: 0x6a90b4, skyHorizon: 0xd4dee4, skyBottom: 0x9cb0bc,
    sunColor: 0xfff6e8, sunIntensity: 1.8, sunDisk: 0.5,
    clouds: 0.35, cloudLight: 0xf6f8fa, cloudDark: 0xaab4bc,
    sunDir: [0.3, 0.6, 0.5],
    hemiSky: 0xd0dce6, hemiGround: 0x6a6a50, hemiIntensity: 1.25,
    rimColor: 0xeef2f6, rimIntensity: 0.25,
    terrain: {
      grass: '#6a7444', grassAlt: '#727a4a', dryGrass: '#a49a6a', dirt: '#8a7a5a', rock: '#a09a88',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (helaDist(x, z).d < 260 && z < coastZ(x) - 120) return y > 3 ? [0xc8bc94, 1] : [0xd8cca4, 1]; // Hela: all sand and dune
        if (y > 12) return [0x667044, 1];                        // the moraine fields behind the coast
        if (y > 3) return [0xbcae84, 1];                         // the dunes
        return y > 0.5 ? [0xd6caa0, 1] : [0xb0a27c, 1];          // the white beach, wet sand at the water
      },
    },
  },

  bases: { nato: { x: 600, z: 2150, entries: [-450, 0, 300] }, pact: { x: 1900, z: -2150, entries: [-600, 0, 600] } },
  maxStacks: 10,
  cameraStart: { nato: { x: 500, z: 1700 }, pact: { x: 1550, z: -1700 } },
  points,

  spawns: {
    nato: line(['ptBoat', 'ptBoat', 'destroyer', 'ptBoat', 'ptBoat', 'frigate'], 550, 1900, Math.PI),
    pact: [...line(['destroyer', 'frigate', 'destroyer', 'frigate'], 1650, -1800, -Math.PI / 4), ...line(['merchant', 'merchant'], 1850, -2050, -Math.PI / 4)], // (the convoy: data/units1806/smallCraft.js merchant)
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const at = (cx: number, cz: number, sx: number, sz: number, n: number, lo: number, hi: number, put: (x: number, z: number) => void) => {
      for (let i = 0, k = 0; i < n * 25 && k < n; i++) { const x = cx + (rand() - 0.5) * sx, z = cz + (rand() - 0.5) * sz, y = height(x, z); if (y > lo && y < hi) { k++; put(x, z); } }
    };
    // Hela: the fishing village and its church near the tip, the light on the point
    const dx = HEL1.x - HEL0.x, dz = HEL1.z - HEL0.z;
    props.tower({ x: HEL1.x - dx * 0.02, z: HEL1.z - dz * 0.02 });
    at(HEL1.x - dx * 0.12, HEL1.z - dz * 0.12, 260, 200, 1, 2, 12, (x, z) => props.church({ x, z, yaw: 0.45 }));
    at(HEL1.x - dx * 0.15, HEL1.z - dz * 0.15, 420, 300, 18, 2, 12, (x, z) => props.house({ x, z, yaw: 0.45 + (rand() - 0.5) * 0.4, width: 6 + rand() * 3, depth: 5 + rand() * 2 }));
    // Danzig: the Hanseatic town behind the shore, St Mary's tower over it
    at(DANZIG.x, DANZIG.z + 450, 760, 420, 70, 3, 60, (x, z) => props.townHouse({ x, z, yaw: (rand() - 0.5) * 0.3, width: 8 + rand() * 4, depth: 9, storeys: 3 + Math.floor(rand() * 2), damaged: 0 }));
    props.church({ x: DANZIG.x, z: DANZIG.z + 480, yaw: 0 });
    props.church({ x: DANZIG.x - 250, z: DANZIG.z + 600, yaw: 0 });
    // Weichselmünde's star fort on the Vistula's east bank, at the mouth
    const wm = { x: MOUTH.x + 230, z: MOUTH.z + 60 };
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; props.lowWall({ x: wm.x + Math.cos(a) * 45, z: wm.z + Math.sin(a) * 45, yaw: a + Math.PI / 2, length: 36, height: 3.5, color: 0x8a6a52 }); }
    props.tower({ x: wm.x, z: wm.z });
    // Zoppot on the south shore; Gdingen and Oxhöft under the west cliffs; Rixhöft's light on its cliff; fishermen on the Nehrung
    at(-1300, coastZ(-1300) + 160, 600, 200, 18, 3, 40, (x, z) => props.house({ x, z, yaw: (rand() - 0.5) * 0.6, width: 6 + rand() * 3, depth: 5 + rand() * 2 }));
    props.church({ x: -1300, z: coastZ(-1300) + 260, yaw: 0 });
    at(-2700, 1200, 200, 1600, 22, 3, 50, (x, z) => props.house({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.6, width: 6 + rand() * 3, depth: 5 + rand() * 2 }));
    at(-2700, -500, 300, 200, 1, 20, 90, (x, z) => props.tower({ x, z }));
    at(2000, 1950, 500, 400, 10, 2, 12, (x, z) => props.house({ x, z, yaw: -0.48 + (rand() - 0.5) * 0.4, width: 6 + rand() * 2, depth: 5 }));
    props.finish();
    // the pinewoods on Hela and along the dunes
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 900, broadleaf: 0.15, autumn: 0, maxY: 80, size: 1,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 3 || Math.hypot(x - DANZIG.x, z - DANZIG.z - 450) < 520 || Math.hypot(x - HEL1.x + 300, z - HEL1.z + 150) < 300 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
