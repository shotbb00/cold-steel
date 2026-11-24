// The Channel off Boulogne, 1804–05 (the 1806 sea battles, the campaign's `channel` zone): the invasion flotilla
// — prames, gun-brigs, gunboats and péniches, two thousand of them — lies in the tidal harbour under the cliffs
// and the shore batteries of the Camp de Boulogne, and comes out in divisions to work along the coast; the Downs
// squadron (Lord Keith's frigates, sloops and bomb vessels) waits offshore to catch them in the open and to throw
// shells and Fulton's fire-machines into the roads (October 1804). The French coast along the east edge: the
// cliffs of Cap Gris-Nez to the north, Wimereux, the Liane's mouth and its jetties at Boulogne with the Tour
// d'Odre and the camp's huts on the heights, Fort de l'Heurt on its rock off Le Portel, the dunes toward Étaples
// to the south. The batteries and forts are only scenery (sea maps are pure sea battles). Laid out at full size
// (`widened`). Fair: the homes mirrored through the middle zone — the flotilla's off the harbour, the British
// out toward the English side — the three open zones on the line between them, equally far by sail (seapath);
// none behind the cape or the fort's rock. The wind from south by west blows up the coast, across the fleets'
// line: neither has it in his teeth. The 1806 roster has no prame, péniche or bomb vessel yet: the flotilla
// sails as gunboats and brigs (data/units1806/ships.js ptBoat, destroyer), the British as frigates and brig-sloops.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 8000;
const HALF = 3000;
const noise = createNoise2D(1804_10);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a5a5c });
// the ships' names (entities/UnitStack.js shipName): the flotilla's numbered boats, Keith's Downs squadron
Object.assign(sea, {
  names: {
    nato: {
      ptBoat: ['Chaloupe canonnière 1', 'Chaloupe canonnière 2', 'Chaloupe canonnière 3', 'Chaloupe canonnière 4', 'Chaloupe canonnière 5', 'Chaloupe canonnière 6', 'Chaloupe canonnière 7', 'Chaloupe canonnière 8'],
      destroyer: ['Brick canonnier 1', 'Brick canonnier 2', 'Brick canonnier 3', 'Brick canonnier 4', 'Brick canonnier 5', 'Brick canonnier 6'],
      frigate: ['Hortense', 'Volontaire', 'Infatigable'],
      fireship: ['Brûlot 1', 'Brûlot 2', 'Brûlot 3'],
    },
    pact: {
      frigate: ['Immortalité', 'Leda', 'Amazon', 'Castor', 'Hydra', 'Minerva'],
      destroyer: ['Harpy', 'Bloodhound', 'Archer', 'Conflict', 'Cruizer', 'Rattler', 'Starling', 'Autumn'],
      fireship: ['Catamaran 1', 'Catamaran 2', 'Catamaran 3', 'Catamaran 4'],
      ptBoat: ['Gun-boat 1', 'Gun-boat 2', 'Gun-boat 3', 'Gun-boat 4'],
      cruiser: ['Monarch', 'Leopard', 'Antelope', 'Utrecht'],
    },
  },
});

/** The French coast's line (x) at z: Cap Gris-Nez pushing out west in the north, the Liane's mouth at z ≈ 250, the dunes falling back south. */
const coastX = (z: number) => 1550 + fbm(noise, z * 0.0012, 2.9, 3) * 90 - Math.max(0, 700 - Math.abs(z + 2300)) * 0.55 + Math.max(0, z - 1600) * 0.15;
const HARBOUR = 250;                                      // z of the Liane's mouth, between its two jetties
const HEURT = [coastX(1050) - 230, 1050, 34, 6];          // Fort de l'Heurt on its rock off Le Portel: [x, z, radius, height]

function height(x: number, z: number) {
  let h = -38 + fbm(noise, x * 0.0006, z * 0.0006, 4) * 6;
  // the cliffs: high chalk and sandstone at Gris-Nez and Boulogne, the dunes lower to the south
  const top = (z < 1300 ? 120 : 45) + fbm(noise, x * 0.002, z * 0.002, 3) * 60;
  let d = x - coastX(z);
  const mouth = Math.abs(z - HARBOUR);
  if (mouth < 120) d -= 230 * (1 - (mouth / 120) ** 2);   // the Liane's mouth: the tidal harbour cut into the shore
  h = Math.max(h, shore(d, top, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, z > 1300 ? 60 : 14));
  // the two jetties running out from the harbour mouth: stone-faced timber moles just above the tide
  const cxh = coastX(HARBOUR);
  if (x > cxh - 205 && x < cxh + 30 && Math.abs(Math.abs(z - HARBOUR) - 62) < 5) h = Math.max(h, 1.4);
  const [ix, iz, r, t] = HEURT;
  h = Math.max(h, island(r - Math.hypot(x - ix, z - iz), r, t, 0.5, 6));
  return h;
}

const C = { x: -1000, z: 0 };
const points: ControlPointDef[] = [
  { id: 'A', name: 'Boulogne roads', x: 600, z: 250, owner: 'nato', sector: 'east', radius: 170 },
  { id: 'B', name: 'Towards Gris-Nez', x: -810, z: -1210, owner: null, sector: 'centre', radius: 190 },
  { id: 'C', name: 'Mid-Channel', x: C.x, z: C.z, owner: null, sector: 'centre', radius: 190 },
  { id: 'D', name: 'Off Le Portel', x: -1190, z: 1210, owner: null, sector: 'centre', radius: 190 },
  { id: 'K', name: 'The Downs squadron', x: -2600, z: -250, owner: 'pact', sector: 'west', radius: 170 },
];

// a division in line abreast across its line of advance, 150 m apart
const line = (units: string[], cx: number, cz: number, facing: number) => units.map((unit, i) => {
  const k = (i - (units.length - 1) / 2) * 150;
  return { unit, x: Math.round(cx + Math.cos(facing) * k), z: Math.round(cz - Math.sin(facing) * k), facing };
});
const WEST = Math.atan2(-1900, -300), EAST = WEST + Math.PI; // (the line between the homes)

export default {
  id: 'channel-1805',
  name: 'The Boulogne Flotilla',
  description: 'Off Boulogne, 1804–05: the invasion flotilla’s gunboats and brigs come out from under the cliffs and the batteries of the Camp de Boulogne; the Downs squadron’s frigates and sloops wait offshore. The French coast from Cap Gris-Nez to Le Portel to the east.',
  epochs: ['1806'],
  theatre: 'sea',
  region: 'europe',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 190, speed: 7, veer: 0.3 },     // south by west, up the coast (world/Wind.js)
  fow: 0.5,
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] },
  size: SIZE,
  segments: 520,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 3500, near: 1, far: 14000 },
  seed: 180410,
  height,
  river: sea,

  theme: {
    // a bright Channel day, the chalk white in the sun, the water green-grey over the sand
    fogColor: 0xb4c4cc, fogDensity: 0.00018,
    skyTop: 0x4f7ca8, skyHorizon: 0xc8d6e0, skyBottom: 0x8aa4b6,
    sunColor: 0xfff2de, sunIntensity: 1.9, sunDisk: 0.55,
    clouds: 0.45, cloudLight: 0xf4f6f8, cloudDark: 0xa0acb6,
    sunDir: [-0.4, 0.55, 0.4],
    hemiSky: 0xcad6e2, hemiGround: 0x5a6450, hemiIntensity: 1.25,
    rimColor: 0xeef2f6, rimIntensity: 0.25,
    terrain: {
      grass: '#647444', grassAlt: '#6e7c4a', dryGrass: '#9a9466', dirt: '#7a6c52', rock: '#c8c2b0',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 25) return [0x667446, 1];                        // the downs behind the cliffs, the camp's ground
        if (y > 4) return z > 1300 ? [0xc8b88a, 1] : [0xbab4a2, 1]; // the dunes to the south, the chalk and sandstone faces
        return y > 0.5 ? [0xc8b890, 1] : [0xa89a76, 1];          // the beach, the sand at the water
      },
    },
  },

  bases: { nato: { x: 900, z: 300, entries: [-500, 0, 500] }, pact: { x: -2900, z: -300, entries: [-600, 0, 600] } },
  maxStacks: 10,
  cameraStart: { nato: { x: 400, z: 200 }, pact: { x: -2400, z: -200 } },
  points,

  spawns: {
    nato: line(['ptBoat', 'destroyer', 'ptBoat', 'ptBoat', 'destroyer', 'ptBoat'], 450, 230, WEST),
    pact: line(['destroyer', 'frigate', 'destroyer'], -2450, -230, EAST),
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const cx = (z: number, k: number) => coastX(z) + k;
    // Boulogne: the old town on the hill, the lower town on the quays of the Liane, the two wooden jetties running out
    for (let i = 0; i < 70; i++) {
      const z = HARBOUR - 420 + rand() * 840, x = cx(z, 80 + rand() * 420);
      if (Math.abs(z - HARBOUR) < 80 || height(x, z) < 3) continue;
      props.townHouse({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.3, width: 8 + rand() * 4, depth: 9, storeys: 2 + Math.floor(rand() * 2), damaged: 0 });
    }
    props.church({ x: cx(HARBOUR - 300, 420), z: HARBOUR - 300, yaw: Math.PI / 2 });
    for (const side of [-1, 1]) props.lowWall({ x: coastX(HARBOUR) - 90, z: HARBOUR + side * 62, yaw: 0, length: 220, height: 2.4, color: 0x6a5a44 });
    // the Tour d'Odre on the cliff north of the harbour, the signal posts along Gris-Nez
    props.tower({ x: cx(HARBOUR - 700, 90), z: HARBOUR - 700 });
    for (const z of [-2300, -1500]) props.tower({ x: cx(z, 120), z });
    // the Camp de Boulogne: rows of the army's huts on the downs behind the cliffs, north of the town
    for (let r = 0; r < 6; r++) for (let i = 0; i < 14; i++) {
      const z = -1300 + i * 55, x = cx(z, 420 + r * 45);
      if (height(x, z) > 20) props.flatHouse({ x, z, yaw: Math.PI / 2, width: 12, depth: 5 });
    }
    // the coast batteries (scenery): earthwork rings on the cliff tops at Wimereux, la Crèche and Le Portel
    for (const z of [-900, -300, 800]) for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3; props.lowWall({ x: cx(z, 70) + Math.cos(a) * 22, z: z + Math.sin(a) * 22, yaw: a + Math.PI / 2, length: 22, height: 1.8, color: 0x7a6a4a });
    }
    // Fort de l'Heurt: a round stone fort on its rock
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; props.lowWall({ x: HEURT[0] + Math.cos(a) * 20, z: HEURT[1] + Math.sin(a) * 20, yaw: a + Math.PI / 2, length: 16, height: 3, color: 0x8a8478 }); }
    // Le Portel's fishermen's houses, Wimereux's
    for (let i = 0; i < 24; i++) {
      const z = (i < 12 ? 950 : -800) + rand() * 300, x = cx(z, 60 + rand() * 200);
      if (height(x, z) > 3 && height(x, z) < 60) props.house({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.5, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 500, broadleaf: 0.7, autumn: 0.2, maxY: 200, size: 1,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 10 || (Math.abs(z - HARBOUR) < 600 && x < coastX(z) + 550) || (z > -1400 && z < -500 && x < coastX(z) + 720) }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
