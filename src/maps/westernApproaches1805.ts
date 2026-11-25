// The Western Approaches, 1805–06 (the 1806 sea battles, the campaign's `westernApproaches` zone): Allemand's
// "invisible squadron" — Majestueux and four 74s, three frigates and two brigs out of Rochefort in July 1805 — cruises
// for five months across the mouth of the Channel, takes the 50-gun Calcutta and the merchantmen she was guarding
// home from St Helena, and is never brought to action; the frigates and privateers of 1806 work the same waters
// after the convoys from the Indies and the Mediterranean, and the British cruisers and the Channel fleet's detached
// squadrons hunt them. Here the squadron and a British cruising force meet off the Isles of Scilly, the landfall of
// every homeward convoy. Laid out from the real isles (north at z < 0), the archipelago in the north of the map: St
// Mary's with Hugh Town and Star Castle, Tresco, Bryher and Samson round St Mary's Road and its sands, St Martin's,
// St Agnes and Gugh, the Eastern Isles; the Western Rocks and Bishop Rock off to the south-west, St Mary's Sound and
// Crow Sound into the road; the Seven Stones reef out toward Land's End, whose last cliffs just show in the north-east
// corner. The open Atlantic south and west in a grey early autumn, the long south-westerly swell. The French come up
// from the south-west (from Rochefort), the British down from the north-east (from the Channel). Laid out at full size
// (`widened`). Fair by the sailing routes (seapath): every zone — Broad Sound off the Western Rocks, the water south of
// St Mary's on the convoy's track, the Soundings out to the south — as near the one squadron as the other. The wind from
// south by west: the French have it on the quarter coming up, the British beat down to them. The British start with
// two homeward Indiamen behind their line (data/units1806/smallCraft.js merchant: while she lies in a zone of theirs
// her cargo brings in command points), the French with two more brigs to go after them.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 8000;
const HALF = 3000;
const noise = createNoise2D(1805_09);
const sea = createSea({ level: 0, size: SIZE, color: 0x26485c });
// the ships' names (entities/UnitStack.js shipName): Allemand's Rochefort squadron and the 1806 raiders, the British cruisers
Object.assign(sea, {
  names: {
    nato: {
      battleship: ['Majestueux'],
      cruiser: ['Magnanime', 'Jemmapes', 'Lion', 'Suffren', 'Calcutta', 'Patriote', 'Régulus', 'Vétéran'],
      frigate: ['Armide', 'Gloire', 'Thétis', 'Infatigable', 'Minerve', 'Indienne', 'Revanche', 'Valeureuse'],
      destroyer: ['Sylphe', 'Palinure', 'Lynx', 'Bacchante', 'Phaéton', 'Voltigeur'],
      ptBoat: ['Corsaire 1', 'Corsaire 2', 'Corsaire 3', 'Corsaire 4', 'Corsaire 5', 'Corsaire 6'],
      fireship: ['Brûlot 1', 'Brûlot 2', 'Brûlot 3'],
    },
    pact: {
      battleship: ['Hibernia'],
      cruiser: ['Calcutta', 'Mars', 'Centaur', 'Monarch', 'Bellona', 'Theseus', 'Courageux', 'Hero', 'Achille'],
      frigate: ['Amazon', 'Indefatigable', 'Loire', 'Doris', 'Iris', 'Blanche', 'Naiad', 'Révolutionnaire'],
      destroyer: ['Ranger', 'Wolverine', 'Cyane', 'Atalante', 'Scorpion', 'Childers'],
      ptBoat: ['Gun-boat 1', 'Gun-boat 2', 'Gun-boat 3', 'Gun-boat 4'],
      fireship: ['Prometheus', 'Comet', 'Etna'],
    },
  },
});

// the Isles of Scilly, laid out as they lie (north at z < 0): [x, z, radius, height, stretch] — St Mary's, Tresco,
// Bryher, Samson, St Martin's, St Agnes and Gugh, the Eastern Isles; the road between them shoal and sand
const ISLES = [[350, -650, 470, 48, 1], [-450, -1350, 320, 40, 1.4], [-850, -1100, 210, 34, 1.5], [-700, -700, 170, 36, 1], [300, -1550, 300, 38, 0.6], [-450, -50, 220, 34, 1], [850, -1150, 80, 20, 1], [1000, -950, 70, 18, 1]] as const;
// the Western Rocks and Bishop Rock outermost, the Seven Stones reef to the north-east
const ROCKS = [[-1050, -250], [-1200, -100], [-950, 50], [-1300, -380], [-1550, -150], [1950, -2150], [2050, -2250], [2150, -2150], [2000, -2050]] as const;
const ROAD = { x: -200, z: -800, r: 520 };                    // St Mary's Road: the anchorage inside the isles, shoal round its edge
const LANDS_END = { x: 3400, z: -3300 };                      // Cornwall's last cliffs, just in the north-east corner

function height(x: number, z: number) {
  let h = -110 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 16;
  const nn = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5;
  // the shelf the isles stand on, shoaling toward them
  const shelf = Math.hypot((x + 100) / 1.2, z + 800);
  if (shelf < 2000) h = Math.max(h, -14 - Math.max(0, shelf - 900) * 0.09 + fbm(noise, x * 0.003, z * 0.003, 2) * 4);
  if (Math.hypot(x - ROAD.x, z - ROAD.z) < ROAD.r) h = Math.max(h, -6 + fbm(noise, x * 0.006, z * 0.006, 2) * 2.5);  // the road's sands
  for (const [ix, iz, r, t, k] of ISLES) {
    const d = r * (1 + fbm(noise, x * 0.004, z * 0.004, 3) * 0.3) - Math.hypot(x - ix, (z - iz) / k);
    if (d > -300) h = Math.max(h, island(d, r, t, nn, 18));
  }
  for (const [rx, rz] of ROCKS) {
    const r = Math.hypot(x - rx, z - rz);
    if (r < 60) h = Math.max(h, -3 + (60 - r) / 60 * 9);
  }
  const le = Math.hypot(x - LANDS_END.x, z - LANDS_END.z);
  if (le < 1100) h = Math.max(h, shore(800 - le + fbm(noise, x * 0.004, z * 0.004, 2) * 120, 70, nn, 6));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'The invisible squadron', x: -2150, z: 2250, owner: 'nato', sector: 'west', radius: 170 },
  { id: 'B', name: 'Broad Sound', x: -1650, z: -1680, owner: null, sector: 'west', radius: 200 },
  { id: 'C', name: 'South of St Mary’s', x: 460, z: 860, owner: null, sector: 'centre', radius: 200 },
  { id: 'D', name: 'Soundings', x: 1830, z: 2170, owner: null, sector: 'east', radius: 200 },
  { id: 'K', name: 'The Channel cruisers', x: 2300, z: -1450, owner: 'pact', sector: 'east', radius: 170 },
];

// a squadron in line abreast across its line of advance, 160 m apart
const line = (units: string[], cx: number, cz: number, facing: number) => units.map((unit, i) => {
  const k = (i - (units.length - 1) / 2) * 160;
  return { unit, x: Math.round(cx + Math.cos(facing) * k), z: Math.round(cz - Math.sin(facing) * k), facing };
});

export default {
  id: 'western-approaches-1805',
  name: 'Western Approaches',
  description: 'The Western Approaches, 1805–06: Allemand’s “invisible squadron” and the French raiders meet the British cruisers on the track of a homeward convoy. The open Atlantic under a grey autumn sky, the Isles of Scilly low on the north-east edge.',
  epochs: ['1806'],
  theatre: 'sea',
  region: 'europe',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'overcast' },
  wind: { from: 195, speed: 9, veer: 0.3 },   // south by west, a fresh Atlantic breeze under the cloud (world/Wind.js)
  fow: 0.55,
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] },
  size: SIZE,
  segments: 520,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 3500, near: 1, far: 14000 },
  seed: 180509,
  height,
  river: sea,

  theme: {
    // the Atlantic in September: low grey cloud, a cold light, the sea slate green-blue
    fogColor: 0xa8b4bc, fogDensity: 0.00022,
    skyTop: 0x6a7c8a, skyHorizon: 0xc2cad0, skyBottom: 0x8c98a2,
    sunColor: 0xeee8dc, sunIntensity: 1.5, sunDisk: 0.2,
    clouds: 0.8, cloudLight: 0xe4e8ec, cloudDark: 0x8e98a2,
    sunDir: [-0.3, 0.55, 0.5],
    hemiSky: 0xbcc6ce, hemiGround: 0x545c4a, hemiIntensity: 1.25,
    rimColor: 0xe2e8ec, rimIntensity: 0.2,
    terrain: {
      grass: '#5c6c44', grassAlt: '#64744a', dryGrass: '#8a8a5c', dirt: '#6a604c', rock: '#8a867c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 22) return [0x6e6a4a, 1];                       // heather and bracken on the downs
        if (y > 5) return [0x5c6c40, 1];                        // the little walled bulb fields
        return y > 0.5 ? [0xd2c6a4, 1] : [0x9a8e74, 1];         // white shell sand, wet at the water
      },
    },
  },

  bases: { nato: { x: -2350, z: 2450, entries: [-400, 0, 400] }, pact: { x: 2500, z: -1650, entries: [-400, 0, 300] } },
  maxStacks: 10,
  cameraStart: { nato: { x: -1800, z: 1900 }, pact: { x: 1950, z: -1150 } },
  points,

  spawns: {
    nato: [...line(['frigate', 'cruiser', 'cruiser', 'frigate'], -1950, 2050, 2.36), ...line(['destroyer', 'destroyer'], -2200, 2300, 2.36)],
    pact: [...line(['frigate', 'cruiser', 'cruiser', 'frigate'], 2050, -1250, -0.9), ...line(['merchant', 'merchant'], 2350, -1550, -0.9)], // (the convoy from St Helena)
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const [mx, mz] = ISLES[0];
    // St Mary's: Hugh Town's granite cottages on the isthmus, Star Castle on the Garrison above it, the church
    for (let i = 0; i < 40; i++) {
      const x = mx - 180 + rand() * 160, z = mz - 60 + rand() * 140;
      if (height(x, z) > 3 && height(x, z) < 35) props.house({ x, z, yaw: (rand() - 0.5) * 0.6, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    props.tower({ x: mx - 210, z: mz + 120 });
    props.church({ x: mx + 60, z: mz + 40, yaw: 0 });
    // St Agnes' lighthouse, the Tresco abbey ruins and a few farms on the off-islands
    props.tower({ x: ISLES[5][0], z: ISLES[5][1] });
    props.tower({ x: ROCKS[4][0], z: ROCKS[4][1] });                       // (Bishop Rock: the light was not built until 1858 — a daymark beacon then)
    props.church({ x: ISLES[1][0], z: ISLES[1][1] + 40, yaw: Math.PI / 2 });
    for (const [ix, iz] of ISLES.slice(1)) for (let i = 0; i < 5; i++) {
      const x = ix - 70 + rand() * 140, z = iz - 70 + rand() * 140;
      if (height(x, z) > 4 && height(x, z) < 30) props.house({ x, z, yaw: rand() * Math.PI, width: 6, depth: 5 });
    }
    props.finish();
    // wind-bent elms and pines in the hollows only — the islands are bare to the gales
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 120, broadleaf: 0.6, autumn: 0.3, maxY: 30, size: 0.7,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 6 || z > 300 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
