// Off the Texel, 1805–06 (the 1806 sea battles, the campaign's `northSea` zone): the Marsdiep and the Texel blockade.
// The Batavian — from June 1806 the Kingdom of Holland's — squadron lies in the Texel roads under Den Helder, the
// last piece of Napoleon's invasion plan in the north, and waits for an easterly to carry it out through the Marsdiep;
// Admiral Russell's North Sea squadron, old 64s and frigates, keeps station off the banks in all weathers to stop
// it. Here the wind has come round into the north-east and the Dutch stand out to meet the blockaders. Laid out from
// the real waters (north at z < 0): the Marsdiep, the deep tide race between Texel and the head of Noord-Holland,
// running in from the North Sea to the Texel roads and on north-east as the Texelstroom behind the island, the
// Wadden flats awash on either side of it; Texel's dunes along the north-east, its south-west point the Hors; Den
// Helder, Fort Kijkduin and Huisduinen on the dune head of Noord-Holland south of the channel, its straight dune coast
// away south-south-west toward Petten; in front of the mouth the Noorderhaaks, a dry sand bank, with the Molengat
// along Texel north of it and the Schulpengat along the Holland shore south of it — the three ways in. Laid out at
// full size (`widened`). Fair by the sailing routes (seapath): every zone — the Molengat, the water off the Haaks,
// the Schulpengat — as far from the Dutch, who must come out through the Marsdiep, as from the British out to the
// north-west. The north-easterly the Dutch waited for blows them out of the channel; the British beat up to them.
// The Dutch sail their own ships, the Bataafse Marine (army nl: data/units1806/westNavies.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 8000;
const HALF = 3000;
const noise = createNoise2D(1806_06);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a5a5e });
// the ships' names (entities/UnitStack.js shipName): Russell's North Sea squadron (the Dutch name their own: data/units1806/westNavies.js)
Object.assign(sea, {
  names: {
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

const GAP = { n: -650, s: 550 };                          // the Marsdiep: between Texel's south shore (north) and Den Helder (south)
/** Texel's west shore (x) at z: from the Hors, its south-west point, away north-north-east. */
const texelX = (z: number) => 760 + Math.max(0, GAP.n - z) * 0.36 + fbm(noise, z * 0.0011, 1.7, 3) * 80;
/** Texel's Marsdiep shore (z) at x: the bight at the Mok. */
const texelZ = (x: number) => GAP.n - Math.max(0, 1 - Math.abs(x - 1900) / 450) * 160 + fbm(noise, x * 0.0013, 7.7, 3) * 60;
/** Noord-Holland's North Sea shore (x) at z: from Den Helder's head away south-south-west toward Petten. */
const hollandX = (z: number) => 380 - Math.max(0, z - GAP.s) * 0.42 + fbm(noise, z * 0.0011, 4.3, 3) * 70;
/** Den Helder's Marsdiep shore (z) at x: along the town, then falling back south-east to the Balgzand flats. */
const helderZ = (x: number) => GAP.s + Math.max(0, x - 1750) * 0.75 + fbm(noise, x * 0.0013, 6.1, 3) * 60;
/** The Texelstroom: the deep channel from the roads away north-east behind Texel (z at x). */
const streamZ = (x: number) => -60 - Math.max(0, x - 1900) * 0.55;
/** The Noorderhaaks: a dry sand bank in front of the Marsdiep's mouth (> 0 on it). */
const HAAKS = { x: -420, z: -120 };
const haaks = (x: number, z: number) => {
  const u = (x - HAAKS.x) * 0.97 - (z - HAAKS.z) * 0.26, v = (x - HAAKS.x) * 0.26 + (z - HAAKS.z) * 0.97;
  return 1 - Math.hypot(u / 330, v / 900) + fbm(noise, x * 0.003, z * 0.003, 3) * 0.15;
};

function height(x: number, z: number) {
  // the shallow North Sea, shoaling toward the coast; the Marsdiep scoured deep by the tide
  let h = -22 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 5 + Math.max(0, x + 1500) * 0.003;
  if (x > 300 && z > GAP.n - 200 && z < GAP.s + 200) h -= Math.min(1, (x - 300) / 500) * 8;
  const n = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, wob = fbm(noise, x * 0.004, z * 0.004, 3);
  // the Wadden: flats awash either side of the Texelstroom
  if (x > 1950) {
    const c = Math.abs(z - streamZ(x));
    if (c > 240) h += (-1.6 + wob * 0.8 - h) * Math.min(1, (x - 1950) / 300) * Math.min(1, (c - 240) / 220);
  }
  // Texel and Noord-Holland: low dunes, the polders behind them
  const top = 16 + wob * 8;
  h = Math.max(h, shore(Math.min(x - texelX(z), texelZ(x) - z) + wob * 40, top, n, 60));
  h = Math.max(h, shore(Math.min(x - hollandX(z), z - helderZ(x)) + wob * 40, top, n, 60));
  // the Noorderhaaks: awash round its edge, dry sand in the middle
  const k = haaks(x, z);
  if (k > -0.4) {
    h += (-2.4 + wob - h) * Math.min(1, (k + 0.4) / 0.3);
    if (k > 0) h = Math.max(h, shore(k * 450, 4, n, 140));
  }
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'The Texel roads', x: 1950, z: -100, owner: 'nato', sector: 'east', radius: 170 },
  { id: 'B', name: 'The Molengat', x: 708, z: -1780, owner: null, sector: 'centre', radius: 200 },
  { id: 'C', name: 'Off the Haaks', x: 144, z: -1072, owner: null, sector: 'west', radius: 200 },
  { id: 'D', name: 'The Schulpengat', x: -813, z: 1557, owner: null, sector: 'centre', radius: 190 },
  { id: 'K', name: 'Russell’s squadron', x: -2050, z: -2050, owner: 'pact', sector: 'west', radius: 170 },
];

// a squadron in line abreast across its line of advance, 160 m apart
const line = (units: string[], cx: number, cz: number, facing: number) => units.map((unit, i) => {
  const k = (i - (units.length - 1) / 2) * 160;
  return { unit, x: Math.round(cx + Math.cos(facing) * k), z: Math.round(cz - Math.sin(facing) * k), facing };
});

export default {
  id: 'texel-1805',
  name: 'Off the Texel',
  description: 'Off the Texel, 1805–06: with the wind in the north-east the Dutch squadron stands out of the Marsdiep against Russell’s blockading North Sea squadron. Texel’s dunes and Den Helder either side of the channel, the Noorderhaaks bank in front of its mouth, the grey-green shallow sea.',
  epochs: ['1806'],
  theatre: 'sea',
  region: 'europe',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'overcast' },
  wind: { from: 25, speed: 8, veer: 0.25 },   // north-north-east, the cold wind the Dutch waited for (world/Wind.js)
  fow: 0.55,
  sides: { nato: 'France and Holland', pact: 'Britain' },
  armies: { nato: ['nl', 'fr'], pact: ['gb'] }, // (the Bataafse Marine's Texel squadron first)
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
        if (haaks(x, z) > 0 && y > 0.5) return [0xdcd0aa, 1];   // the Haaks: bare sand
        if (y > 12) return [0x8a8c62, 1];                       // marram grass on the dune tops
        if (y > 5) return [0xc8bc94, 1];                        // the pale dune sand
        return y > 0.5 ? [0xd8cca6, 1] : [0xa49878, 1];         // the beach, wet at the water
      },
    },
  },

  bases: { nato: { x: 2350, z: -280, entries: [-300, 0, 300] }, pact: { x: -2350, z: -2350, entries: [-600, 0, 600] } },
  maxStacks: 10,
  cameraStart: { nato: { x: 1500, z: -100 }, pact: { x: -1700, z: -1700 } },
  points,

  spawns: {
    nato: line(['frigate', 'cruiser', 'cruiser', 'frigate'], 1850, -80, -Math.PI / 2),
    pact: line(['frigate', 'cruiser', 'cruiser', 'frigate'], -1900, -1900, Math.PI * 0.75),
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // Den Helder: the brick houses behind the dunes on the south side of the Marsdiep, its church, the naval yard's sheds
    for (let i = 0; i < 70; i++) {
      const x = 600 + rand() * 1000, z = helderZ(x) + 90 + rand() * 380;
      if (height(x, z) > 2 && height(x, z) < 20) props.townHouse({ x, z, yaw: (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 8, storeys: 2, damaged: 0 });
    }
    props.church({ x: 1050, z: helderZ(1050) + 330, yaw: 0 });
    for (let i = 0; i < 4; i++) props.flatHouse({ x: 1350 + i * 55, z: helderZ(1350) + 70, yaw: 0, width: 34, depth: 14 });
    // Fort Kijkduin on the dunes at the head, Huisduinen under it, the battery at the Mok on Texel, a signal post up Texel's dunes
    props.tower({ x: hollandX(900) + 110, z: 900 });
    props.tower({ x: 1900, z: texelZ(1900) - 110 });
    props.tower({ x: texelX(-2500) + 130, z: -2500 });
    // Den Hoorn and its church on Texel, Huisduinen, Callantsoog down the Holland coast
    props.church({ x: texelX(-1150) + 420, z: -1150, yaw: Math.PI / 2 });
    for (const [x0, z0, n] of [[1350, -1150, 14], [560, 760, 8], [-430, 2650, 12]] as const) for (let i = 0; i < n; i++) {
      const x = x0 - 150 + rand() * 300, z = z0 - 120 + rand() * 240;
      if (height(x, z) > 2 && height(x, z) < 20) props.house({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.4, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    props.finish();
    // a few poplars and willows behind the dunes, round the villages
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 200, broadleaf: 0.9, autumn: 0.2, maxY: 20, size: 0.9,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 3 || (z < 0 ? x < texelX(z) + 200 : x < hollandX(z) + 200) || haaks(x, z) > -0.4 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
