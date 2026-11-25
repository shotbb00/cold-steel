// The Baltic, 1807–08 (the 1806 sea battles, the campaign's `baltic` zone): off Danzig and the Hela peninsula. In the
// spring of 1807 the French besiege Danzig and the Royal Navy's sloops (Dauntless) try to run powder up the Vistula to
// the garrison; after Copenhagen (September 1807) Denmark goes over to France and the Gunboat War begins: the Danish
// kanonbåde — open boats with a long 24-pounder and sweeps — row out in the summer calms against the British
// frigates and brig-sloops escorting the Baltic convoys, and lay their guns on a helpless stern. Here they meet
// in the Gulf of Danzig. The low Baltic coast along the south edge — sand, dunes and pinewoods, Danzig's spires
// and the fort of Weichselmünde at the Vistula's mouth in the south-east — and the Hela peninsula, a long low
// sand spit with its pines, its fishing village and its light at the tip, running out east from the south-west
// corner with the bay behind it. Laid out at full size (`widened`). Fair: the homes mirrored west and east, the
// three open zones on the line between them, equally far by sail from both (seapath); the one off Hela is out in
// front of the tip, not behind the spit in the bay. The wind light from the north, across the fleets' line, and
// falling to a calm now and then (`lulls`): then the sails hang and the oared gunboats row. The Danes (`dk`: the
// French hulls' stats under the Danish flag, data/units1806/ships.js) sail their gunboats, brigs and a frigate.
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

/** The mainland coast's line (z) at x: low, with the bay of Danzig curving south in the east. */
const coastZ = (x: number) => 2450 + fbm(noise, x * 0.0011, 4.1, 3) * 110 + Math.max(0, x - 600) * 0.12;
/** The Hela spit: from the mainland in the south-west out east to its tip. */
const HEL0 = { x: -3600, z: 2550 }, HEL1 = { x: 350, z: 1500 };
const helaDist = (x: number, z: number) => {
  const dx = HEL1.x - HEL0.x, dz = HEL1.z - HEL0.z;
  const t = Math.max(0, Math.min(1, ((x - HEL0.x) * dx + (z - HEL0.z) * dz) / (dx * dx + dz * dz)));
  return { d: Math.hypot(x - HEL0.x - dx * t, z - HEL0.z - dz * t), t };
};
const DANZIG = { x: 2300, z: coastZ(2300) };

function height(x: number, z: number) {
  let h = -32 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 6;
  // the mainland: low dunes and the moraine behind them, the clay cliff at Oxhöft a little higher
  h = Math.max(h, shore(z - coastZ(x), 30 + fbm(noise, x * 0.002, z * 0.002, 3) * 20, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 70));
  // Hela: a sand spit 250 m wide (wider at the tip), its dunes ten metres at most
  const { d, t } = helaDist(x, z);
  const w = 110 + t * 60 + fbm(noise, x * 0.004, z * 0.004, 2) * 25;
  h = Math.max(h, shore(w - d, 8, 0.5, 50));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'The kanonbåde', x: -1650, z: -300, owner: 'nato', sector: 'west', radius: 170 },
  { id: 'B', name: 'The open Baltic', x: 0, z: -1450, owner: null, sector: 'centre', radius: 200 },
  { id: 'C', name: 'The convoy route', x: 0, z: -350, owner: null, sector: 'centre', radius: 200 },
  { id: 'D', name: 'Off Hela', x: 0, z: 750, owner: null, sector: 'centre', radius: 190 },
  { id: 'K', name: 'The convoy escort', x: 1650, z: -300, owner: 'pact', sector: 'east', radius: 170 },
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

  bases: { nato: { x: -1950, z: -300, entries: [-600, 0, 600] }, pact: { x: 1950, z: -300, entries: [-600, 0, 600] } },
  maxStacks: 10,
  cameraStart: { nato: { x: -1300, z: -300 }, pact: { x: 1300, z: -300 } },
  points,

  spawns: {
    nato: line(['ptBoat', 'ptBoat', 'destroyer', 'ptBoat', 'ptBoat', 'frigate'], -1500, -330, Math.PI / 2),
    pact: [...line(['destroyer', 'frigate', 'destroyer', 'frigate'], 1500, -330, -Math.PI / 2), ...line(['merchant', 'merchant'], 1750, -330, -Math.PI / 2)], // (the convoy: data/units1806/smallCraft.js merchant)
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // Hela: the fishing village and its church near the tip, the light on the point
    const tip = { x: HEL1.x - 90, z: HEL1.z + 30 };
    props.tower({ x: tip.x + 40, z: tip.z - 10 });
    props.church({ x: tip.x - 260, z: tip.z + 80, yaw: 0.3 });
    for (let i = 0; i < 18; i++) {
      const k = 0.08 + rand() * 0.12, x = HEL1.x - (HEL1.x - HEL0.x) * k + (rand() - 0.5) * 40, z = HEL1.z - (HEL1.z - HEL0.z) * k + (rand() - 0.5) * 90;
      if (height(x, z) > 2) props.house({ x, z, yaw: 0.3 + (rand() - 0.5) * 0.4, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    // Danzig: the Hanseatic town behind the Vistula's mouth, St Mary's tower over it; Weichselmünde's star fort on the mouth
    for (let i = 0; i < 70; i++) {
      const x = DANZIG.x - 380 + rand() * 760, z = coastZ(x) + 260 + rand() * 420;
      if (height(x, z) > 3) props.townHouse({ x, z, yaw: (rand() - 0.5) * 0.3, width: 8 + rand() * 4, depth: 9, storeys: 3 + Math.floor(rand() * 2), damaged: 0 });
    }
    props.church({ x: DANZIG.x, z: coastZ(DANZIG.x) + 480, yaw: 0 });
    props.church({ x: DANZIG.x - 250, z: coastZ(DANZIG.x - 250) + 600, yaw: 0 });
    const wm = { x: DANZIG.x - 650, z: coastZ(DANZIG.x - 650) + 70 };
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; props.lowWall({ x: wm.x + Math.cos(a) * 45, z: wm.z + Math.sin(a) * 45, yaw: a + Math.PI / 2, length: 36, height: 3.5, color: 0x8a6a52 }); }
    props.tower({ x: wm.x, z: wm.z });
    // fishing hamlets along the shore (Oxhöft, Zoppot)
    for (let i = 0; i < 26; i++) {
      const x = -1400 + rand() * 2600, z = coastZ(x) + 90 + rand() * 160;
      if (height(x, z) > 3 && height(x, z) < 40) props.house({ x, z, yaw: (rand() - 0.5) * 0.6, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    props.church({ x: 600, z: coastZ(600) + 220, yaw: 0 });
    props.finish();
    // the pinewoods on Hela and along the dunes
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 900, broadleaf: 0.15, autumn: 0, maxY: 80, size: 1,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 3 || Math.hypot(x - DANZIG.x, z - DANZIG.z - 450) < 520 || Math.hypot(x - HEL1.x + 200, z - HEL1.z) < 260 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
