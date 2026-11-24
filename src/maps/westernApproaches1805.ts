// The Western Approaches, 1805–06 (the 1806 sea battles, the campaign's `westernApproaches` zone): Allemand's
// "invisible squadron" — Majestueux and four 74s, three frigates and two brigs out of Rochefort in July 1805 — cruises
// for five months across the mouth of the Channel, takes the 50-gun Calcutta and the merchantmen she was guarding
// home from St Helena, and is never brought to action; the frigates and privateers of 1806 work the same waters
// after the convoys from the Indies and the Mediterranean, and the British cruisers and the Channel fleet's detached
// squadrons hunt them. Here the squadron and a British cruising force meet on the convoy's track. The open Atlantic
// in a grey early autumn, the long south-westerly swell; the Isles of Scilly — St Mary's with Hugh Town and Star
// Castle, St Agnes' lighthouse, Tresco, the Western Rocks and Bishop Rock — low on the north-east edge, far from
// every zone. Laid out at full size (`widened`). Fair: the homes mirrored west (the French, out in the ocean) and
// east (the British, toward the Channel); the three open zones on the line halfway between them, equally far by
// sail (seapath); the islands lie off in the corner, no zone near them or in their lee. The wind from south by
// west across the fleets' line: the French have it just abaft the beam running east, the British reach west.
// No merchantman in the 1806 roster yet (data/units1806/ships.js): the convoy is only the zone's name.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, island } from '../world/Sea.js';
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

// the Isles of Scilly in the north-east corner: [x, z, radius, height] — St Mary's, Tresco, St Martin's, Bryher, St Agnes
const ISLES = [[2500, -2350, 300, 45], [2180, -2620, 190, 38], [2560, -2780, 200, 40], [1950, -2560, 140, 34], [2150, -2150, 140, 30]] as const;
const ROCKS = [[1750, -2250], [1700, -2400], [1820, -2120], [1620, -2300]] as const;   // the Western Rocks, Bishop Rock outermost

function height(x: number, z: number) {
  let h = -110 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 16;
  for (const [ix, iz, r, t] of ISLES) {
    const d = r * (1 + fbm(noise, x * 0.004, z * 0.004, 3) * 0.25) - Math.hypot(x - ix, z - iz);
    h = Math.max(h, island(d, r, t, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 18));
  }
  for (const [rx, rz] of ROCKS) {
    const r = Math.hypot(x - rx, z - rz);
    if (r < 30) h = Math.max(h, -2 + (30 - r) / 30 * 9);
  }
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'The invisible squadron', x: -1650, z: 300, owner: 'nato', sector: 'west', radius: 170 },
  { id: 'B', name: 'Soundings', x: 0, z: -950, owner: null, sector: 'centre', radius: 200 },
  { id: 'C', name: 'The convoy’s track', x: 0, z: 300, owner: null, sector: 'centre', radius: 200 },
  { id: 'D', name: 'The Rochefort road', x: 0, z: 1550, owner: null, sector: 'centre', radius: 200 },
  { id: 'K', name: 'The Channel cruisers', x: 1650, z: 300, owner: 'pact', sector: 'east', radius: 170 },
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

  bases: { nato: { x: -1950, z: 300, entries: [-600, 0, 600] }, pact: { x: 1950, z: 300, entries: [-600, 0, 600] } },
  maxStacks: 10,
  cameraStart: { nato: { x: -1300, z: 300 }, pact: { x: 1300, z: 300 } },
  points,

  spawns: {
    nato: line(['frigate', 'cruiser', 'cruiser', 'frigate'], -1500, 300, Math.PI / 2),
    pact: line(['frigate', 'cruiser', 'cruiser', 'frigate'], 1500, 300, -Math.PI / 2),
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
    props.tower({ x: ISLES[4][0], z: ISLES[4][1] });
    props.church({ x: ISLES[1][0], z: ISLES[1][1] + 40, yaw: Math.PI / 2 });
    for (const [ix, iz] of ISLES.slice(1)) for (let i = 0; i < 5; i++) {
      const x = ix - 70 + rand() * 140, z = iz - 70 + rand() * 140;
      if (height(x, z) > 4 && height(x, z) < 30) props.house({ x, z, yaw: rand() * Math.PI, width: 6, depth: 5 });
    }
    props.finish();
    // wind-bent elms and pines in the hollows only — the islands are bare to the gales
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 120, broadleaf: 0.6, autumn: 0.3, maxY: 30, size: 0.7,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 6 || x < 1500 || z > -1900 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
