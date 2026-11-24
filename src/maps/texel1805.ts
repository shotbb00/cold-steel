// Off the Texel, 1805–06 (the 1806 sea battles, the campaign's `northSea` zone): the German Bight and the Texel
// blockade. The Batavian — from June 1806 the Kingdom of Holland's — squadron lies in the Texel roads under Den
// Helder, the last piece of Napoleon's invasion plan in the north, and waits for an easterly to carry it out
// through the Marsdiep; Admiral Russell's North Sea squadron, old 64s and frigates, keeps station off the banks
// in all weathers to stop it. Here the wind has come round into the north-east and the Dutch stand out to meet
// the blockaders. The Dutch coast along the east edge: Texel's dunes to the north, the Marsdiep running in to the
// roads, Den Helder and Fort Kijkduin on the low dune point south of it, the long straight dunes of Noord-Holland
// toward Petten, the Haaks shoals off the channel's mouth. Laid out at full size (`widened`). Fair: the homes
// mirrored west and east — the Dutch off the Marsdiep, the British out over the horizon — the three open zones
// on the line halfway between, equally far by sail from both (seapath), all far off the coast and the shoals.
// The north-north-easterly the Dutch waited for blows across the fleets' line: they have it abaft the beam running
// out, the British reach in. The Dutch ships sail as the French (data/units1806/ships.js), with their own names.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 8000;
const HALF = 3000;
const noise = createNoise2D(1806_06);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a5a5e });
// the ships' names (entities/UnitStack.js shipName): the Dutch Texel squadron, Russell's North Sea squadron
Object.assign(sea, {
  names: {
    nato: {
      battleship: ['Koninklijke Hollander'],
      cruiser: ['Brutus', 'Doggersbank', 'Haarlem', 'Utrecht', 'Wreker', 'Pluto', 'Hersteller', 'Schrikverwekker', 'Chatham'],
      frigate: ['Kenau Hasselaar', 'Pallas', 'Proserpina', 'Maria Riggersbergen', 'Rijn', 'Amphitrite', 'Utile'],
      destroyer: ['Lynx', 'Zeemeeuw', 'Atalante', 'Mercurius', 'Echo', 'Ajax'],
      ptBoat: ['Kanonneerboot 1', 'Kanonneerboot 2', 'Kanonneerboot 3', 'Kanonneerboot 4', 'Kanonneerboot 5', 'Kanonneerboot 6'],
      fireship: ['Brander 1', 'Brander 2', 'Brander 3'],
    },
    pact: {
      battleship: ['Princess Royal'],
      cruiser: ['Majestic', 'Monmouth', 'Ardent', 'Polyphemus', 'Inflexible', 'Agincourt', 'Standard', 'Texel', 'Veteran', 'Repulse'],
      frigate: ['Amethyst', 'Lapwing', 'Africaine', 'Cerberus', 'Amelia', 'Shannon', 'Aimable'],
      destroyer: ['Cruizer', 'Kite', 'Rattler', 'Scout', 'Sparkler', 'Snake'],
      ptBoat: ['Gun-boat 1', 'Gun-boat 2', 'Gun-boat 3', 'Gun-boat 4'],
      fireship: ['Prometheus', 'Comet', 'Etna'],
    },
  },
});

const GAP = { n: -900, s: -470 };                         // the Marsdiep: between Texel (north) and Den Helder (south)
/** The dune coast's line (x) at z: Texel's west shore bulging out a little to the north, Noord-Holland straight to the south. */
const coastX = (z: number) => 2450 + fbm(noise, z * 0.0011, 1.7, 3) * 70 - Math.max(0, -1400 - z) * 0.08 + Math.max(0, z - 1500) * 0.05;

function height(x: number, z: number) {
  // the shallow North Sea: deeper out west, shoaling toward the coast
  let h = -60 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 10 + Math.max(0, x - 1500) * 0.02;
  const top = 18 + fbm(noise, x * 0.004, z * 0.004, 3) * 10;   // the dunes, low
  let d = x - coastX(z);
  // the Marsdiep: a deep channel cut east through the dunes into the roads
  const flare = Math.max(0, 350 - Math.max(0, x - coastX(z))) * 0.45 + fbm(noise, x * 0.004, 5.5, 3) * 70;   // the banks wander, the mouth opens out
  const inGap = Math.min(z - GAP.n + flare, GAP.s - z + flare * 0.8);
  if (inGap > 0) d = Math.min(d, -inGap * 0.6 - 20);
  h = Math.max(h, shore(d, top, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 60));
  // the Haaks shoals: banks awash off the channel's mouth, north-west of it (well inshore of every zone)
  const r = Math.hypot((x - 2000) * 1.6, z + 1350);
  if (r < 220) h = Math.max(h, -2.5 + (220 - r) / 220 * 3.5 + fbm(noise, x * 0.02, z * 0.02, 2) * 1.5);
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Off the Marsdiep', x: 1650, z: -650, owner: 'nato', sector: 'east', radius: 170 },
  { id: 'B', name: 'Off the Texel', x: 0, z: -1950, owner: null, sector: 'centre', radius: 200 },
  { id: 'C', name: 'The blockade station', x: 0, z: -650, owner: null, sector: 'centre', radius: 200 },
  { id: 'D', name: 'Off Petten', x: 0, z: 650, owner: null, sector: 'centre', radius: 200 },
  { id: 'K', name: 'Russell’s squadron', x: -1650, z: -650, owner: 'pact', sector: 'west', radius: 170 },
];

// a squadron in line abreast across its line of advance, 160 m apart
const line = (units: string[], cx: number, cz: number, facing: number) => units.map((unit, i) => {
  const k = (i - (units.length - 1) / 2) * 160;
  return { unit, x: Math.round(cx + Math.cos(facing) * k), z: Math.round(cz - Math.sin(facing) * k), facing };
});

export default {
  id: 'texel-1805',
  name: 'Off the Texel',
  description: 'Off the Texel, 1805–06: with the wind in the north-east the Dutch squadron stands out of the Marsdiep against Russell’s blockading North Sea squadron. The low dunes of Texel and Den Helder along the east edge, the grey-green shallow sea.',
  epochs: ['1806'],
  theatre: 'sea',
  region: 'europe',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'overcast' },
  wind: { from: 25, speed: 8, veer: 0.25 },   // north-north-east, the cold wind the Dutch waited for (world/Wind.js)
  fow: 0.55,
  sides: { nato: 'France and Holland', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] },
  size: SIZE,
  segments: 520,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 3500, near: 1, far: 14000 },
  seed: 180606,
  height,
  river: sea,

  theme: {
    // a North Sea day: a high pale-grey sky, a flat cold light, the shallow sea grey-green
    fogColor: 0xb4bcbc, fogDensity: 0.00024,
    skyTop: 0x76868e, skyHorizon: 0xcdd2d0, skyBottom: 0x9aa4a4,
    sunColor: 0xf0ece0, sunIntensity: 1.5, sunDisk: 0.25,
    clouds: 0.75, cloudLight: 0xeceeee, cloudDark: 0x9aa2a4,
    sunDir: [0.1, 0.55, 0.6],
    hemiSky: 0xc4ccce, hemiGround: 0x66664e, hemiIntensity: 1.25,
    rimColor: 0xe6eaea, rimIntensity: 0.2,
    terrain: {
      grass: '#6c7650', grassAlt: '#747e56', dryGrass: '#a0a074', dirt: '#8a7c5c', rock: '#a8a08a',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 12) return [0x8a8c62, 1];                       // marram grass on the dune tops
        if (y > 5) return [0xc8bc94, 1];                        // the pale dune sand
        return y > 0.5 ? [0xd8cca6, 1] : [0xa49878, 1];         // the beach, wet at the water
      },
    },
  },

  bases: { nato: { x: 1950, z: -650, entries: [-600, 0, 600] }, pact: { x: -1950, z: -650, entries: [-600, 0, 600] } },
  maxStacks: 10,
  cameraStart: { nato: { x: 1300, z: -650 }, pact: { x: -1300, z: -650 } },
  points,

  spawns: {
    nato: line(['frigate', 'cruiser', 'cruiser', 'frigate'], 1500, -650, -Math.PI / 2),
    pact: line(['frigate', 'cruiser', 'cruiser', 'frigate'], -1500, -650, Math.PI / 2),
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // Den Helder: the brick houses behind the dunes on the south side of the Marsdiep, its church, the naval yard's sheds
    for (let i = 0; i < 60; i++) {
      const z = GAP.s + 60 + rand() * 380, x = coastX(z) + 180 + rand() * 420;
      if (height(x, z) > 2 && height(x, z) < 20) props.townHouse({ x, z, yaw: (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 8, storeys: 2, damaged: 0 });
    }
    props.church({ x: coastX(-200) + 400, z: -200, yaw: 0 });
    for (let i = 0; i < 4; i++) props.flatHouse({ x: coastX(GAP.s) + 250 + i * 50, z: GAP.s + 120, yaw: 0, width: 32, depth: 14 });
    // Fort Kijkduin on the dunes west of the town, the battery at the Mok on Texel, the Texel lighthouse
    props.tower({ x: coastX(-280) + 70, z: -280 });
    props.tower({ x: coastX(GAP.n - 160) + 260, z: GAP.n - 160 });
    props.tower({ x: coastX(-2700) + 120, z: -2700 });
    // Den Hoorn and its church on Texel, the dune villages to the south (Huisduinen, Callantsoog)
    props.church({ x: coastX(-1500) + 350, z: -1500, yaw: Math.PI / 2 });
    for (const [z0, n] of [[-1500, 14], [-60, 8], [1400, 12]] as const) for (let i = 0; i < n; i++) {
      const z = z0 - 120 + rand() * 240, x = coastX(z) + 250 + rand() * 250;
      if (height(x, z) > 2 && height(x, z) < 20) props.house({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.4, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    props.finish();
    // a few poplars and willows behind the dunes, round the villages
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 200, broadleaf: 0.9, autumn: 0.2, maxY: 20, size: 0.9,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 3 || x < coastX(z) + 200 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
