// The Strait of Otranto, 15 May 1917: the Austro-Hungarian navy's raid on the Otranto Barrage. The barrage was a line
// of British drifters strung across the mouth of the Adriatic from Otranto toward Fano, their indicator nets out to
// catch the U-boats going south from Cattaro; at night Horthy's three scout cruisers — Novara, Saida, Helgoland — came
// down the Albanian side and sank fourteen of them, while two destroyers went for the convoy off Valona. At dawn the
// Allied cruisers out of Brindisi — HMS Dartmouth and Bristol, the Italian destroyers with them — came down the Apulian
// side and caught the raiders in the middle of the strait on their way home, until the armoured cruiser Sankt Georg came
// out to cover them. Laid out from the real strait (north up the Adriatic, z < 0): the heel of Apulia down the west
// side — the low limestone coast from Brindisi past Otranto's bay and Punta Palascìa, Italy's easternmost point, then
// south-west to Santa Maria di Leuca, where Italy ends and the Ionian opens; Albania down the east — the coast from
// Durazzo, the deep Bay of Valona, Saseno high and steep across its mouth, the Karaburun peninsula's sheer western
// cliffs closing it on the south, the Ceraunian mountains running away south-east. The drifter line lies diagonally
// across the strait from Leuca toward the Albanian shore. The Allies come down from Brindisi in the north-west; the raiders,
// their work on the drifters done, are south-east of the strait on their way home. Fair by the sailing routes
// (seapath): every zone — off Leuca, the drifter line, the open strait, off Saseno — as near one fleet as the other.
// (Its own generator, from maps/northSea.ts: the same 1918 grey sea and sides, its own ground.)
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 6000;
const HALF = 2500;
const LIMESTONE = 0xd8ccae;
const noise = createNoise2D(1917_05);
const n = (x: number, z: number, f = 0.004) => fbm(noise, x * f, z * f, 3) * 0.5 + 0.5;
const sea = createSea({ level: 0, size: SIZE, color: 0x2a4a58 });

/** Apulia's coast (x) at z: Brindisi's shore in the north, Otranto's bay, Punta Palascìa, then south-west to Leuca. */
const westX = (z: number) => {
  let x = z < -600 ? -2350 - (-600 - z) * 0.28 : -2350 - (z + 600) * 0.62;                // the shore running NNW, and SW past the cape
  x += Math.max(0, 260 - Math.abs(z + 650) * 0.9);                                         // Punta Palascìa, the easternmost point
  x -= Math.max(0, 170 - Math.abs(z + 1250)) * 1.1;                                        // Otranto's little bay, north of the cape
  if (z > 1500) x -= (z - 1500) * 3.5;                                                     // Santa Maria di Leuca: Italy ends
  return x;
};
/** The Karaburun: a narrow mountain ridge from Cape Linguetta (its tip, north-west) to the mainland in the south-east. */
const KAR0 = { x: 2500, z: -1250 }, KAR1 = { x: 3900, z: 700 };
const karDist = (x: number, z: number) => {
  const dx = KAR1.x - KAR0.x, dz = KAR1.z - KAR0.z;
  const t = Math.max(0, Math.min(1, ((x - KAR0.x) * dx + (z - KAR0.z) * dz) / (dx * dx + dz * dz)));
  return { d: Math.hypot(x - KAR0.x - dx * t, z - KAR0.z - dz * t), t, side: (x - KAR0.x) * dz - (z - KAR0.z) * dx };
};
/** Albania's mainland coast (x) at z: Durazzo's shore in the north, the Bay of Valona cut deep in, the Ceraunian coast south-east. */
const eastX = (z: number) => {
  if (z < -2300) return 2800 - (z + 2300) * 0.12;                                          // north of the bay
  if (z < -1500) { const t = (z + 2300) / 800; return 2800 + 1700 * t * t * (3 - 2 * t); }  // the bay's north shore curving in
  if (z < 500) return 4500;                                    // the bay's head (Valona at its north-east corner)
  return 3950 + (z - 500) * 0.7;                                                            // the Ceraunian coast running away
};
const SASENO = { x: 2450, z: -2050 };

function height(x: number, z: number) {
  let h = -60 + fbm(noise, x * 0.0006, z * 0.0006, 3) * 10;
  if (x < -1500) {                                                                          // Apulia: low limestone, cliffs a few tens of metres
    const d = westX(z) + (n(x, z, 0.002) - 0.5) * 160 - x;
    h = Math.max(h, shore(d, 45, 0.4 + (n(x, z, 0.01) - 0.5) * 0.3, 14));
  }
  if (x > 1800) {
    // Albania: the mountains straight out of the sea
    h = Math.max(h, shore(x - eastX(z) + (n(x + 70, z, 0.002) - 0.5) * 180, 200, 0.6 + (n(x, z, 0.01) - 0.5) * 0.5, 10));
    // the Karaburun: 350 m wide at sea level, its west face sheer
    const k = karDist(x, z);
    if (k.d < 700) {
      const w = 230 + k.t * 140 + (n(x, z, 0.006) - 0.5) * 70;
      h = Math.max(h, island(w - k.d, w, 260 + k.t * 80, k.side > 0 ? 0.95 : 0.45, k.side > 0 ? 4 : 18));
    }
    // Saseno: a steep limestone island across the bay's mouth
    const s = 270 - Math.hypot((x - SASENO.x) * 1.5, z - SASENO.z) + (n(x, z, 0.02) - 0.5) * 40;
    if (s > -400) h = Math.max(h, island(s, 270, 170, 0.7, 8));
  }
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Brindisi squadron', x: -1250, z: -2050, owner: 'nato', sector: 'west', radius: 150 },
  { id: 'B', name: 'Off Leuca', x: -2350, z: 1380, owner: null, sector: 'west', radius: 170 },
  { id: 'C', name: 'The drifter line', x: -50, z: 0, owner: null, sector: 'centre', radius: 190 },
  { id: 'D', name: 'The open strait', x: 900, z: -560, owner: null, sector: 'centre', radius: 180 },
  { id: 'E', name: 'Off Saseno', x: 1930, z: -1170, owner: null, sector: 'east', radius: 170 },
  { id: 'K', name: 'Horthy’s cruisers', x: 1200, z: 2050, owner: 'pact', sector: 'east', radius: 150 },
];

export default {
  id: 'otranto',
  name: 'Otranto Strait',
  description: 'May 1917, at night: the mouth of the Adriatic between the heel of Apulia and the Albanian mountains, a line of drifters and their nets across it from Leuca. The Austro-Hungarian cruisers, the drifters sunk, make for home past Saseno; the Allied cruisers come down from Brindisi to cut them off.',
  epochs: ['1918'],
  theatre: 'sea',
  region: 'med',
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'night', weather: 'clear' },
  fow: 0.5,
  armies: { nato: ['uk', 'it'], pact: ['ah'] }, // (the Royal Navy's drifters and cruisers with the Regia Marina against the k.u.k. Kriegsmarine: maps/index.js armiesOn)
  sides: { nato: 'Allies', pact: 'Austria-Hungary' },
  size: SIZE,
  segments: 400,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2400, near: 2, far: 9000 },
  seed: 191705,
  height,
  river: sea,

  theme: {
    fogColor: 0x8ea0b0, fogDensity: 0.00026, skyTop: 0x4a6a90, skyHorizon: 0xb8c4cc, skyBottom: 0x76848e,
    sunColor: 0xfff2dc, sunIntensity: 1.9, sunDisk: 0.3, clouds: 0.3, cloudLight: 0xdfe3e6, cloudDark: 0x7e8a94,
    sunDir: [0.5, 0.45, -0.6], hemiSky: 0xbcc6ce, hemiGround: 0x4c5650, hemiIntensity: 1.2, rimColor: 0xd4dce4, rimIntensity: 0.25,
    terrain: {
      grass: '#5e6c48', grassAlt: '#667250', dryGrass: '#8a8462', dirt: '#6e6450', rock: '#7c7870',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (x < 0 && y > 4) return [y > 30 ? 0x7a7a4a : LIMESTONE, 1];   // the white cliffs, olive groves and maquis on top
        if (x > 0 && y > 6) return [y > 150 ? 0x8a8676 : 0x6a6a44, 1];   // maquis up the Albanian mountains, bare rock above
        if (y < -0.6) return [0x6e6a58, 1];                               // the shingle below the tide line
        if (y < 2.5) return [0xcabe98, Math.min(1, (2.5 - y) / 2)];       // the beach
        return [0x5e6c48, 1];
      },
    },
  },

  bases: { nato: { x: -1350, z: -2250, entries: [-500, 0, 500] }, pact: { x: 1300, z: 2250, entries: [-500, 0, 500] } },
  maxStacks: 12,
  cameraStart: { nato: { x: -1050, z: -1750 }, pact: { x: 1000, z: 1750 } },
  points,
  // the barrage: the drifters' mine nets strung across the strait from Leuca toward the Albanian shore, gaps where the
  // patrols pass (the zones); the fields the U-boats laid off Otranto and toward Leuca
  minefields: [
    { owner: 'nato', x: -50, z: 0, w: 5600, d: 120, count: 34, yaw: 0.535, gaps: [-2700, 0, 1100, 2300], gap: 440 },
    { owner: 'pact', x: -1850, z: -1350, w: 600, d: 100, count: 22, yaw: 1.2 },
    { owner: 'pact', x: -1300, z: 1500, w: 600, d: 100, count: 12, yaw: 0.5 },
  ],
  spawns: {
    nato: [{ unit: 'lightCruiser', x: -1350, z: -1950, facing: 0.535 }, { unit: 'lightCruiser', x: -1050, z: -2100, facing: 0.535 }, { unit: 'destroyer', x: -1450, z: -1750, facing: 0.535 }, { unit: 'destroyer', x: -800, z: -2000, facing: 0.535 }],
    pact: [{ unit: 'lightCruiser', x: 1300, z: 1950, facing: -2.6 }, { unit: 'lightCruiser', x: 1000, z: 2100, facing: -2.6 }, { unit: 'destroyer', x: 1450, z: 1750, facing: -2.6 }, { unit: 'destroyer', x: 800, z: 2000, facing: -2.6 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // Otranto: the town on its headland round the Aragonese castle, the cathedral, the harbour mole in the little bay
    const ox = westX(-1250);
    for (let i = 0; i < 40; i++) {
      const x = ox - 340 + rand() * 300, z = -1450 + rand() * 300;
      const y = height(x, z);
      if (y > 2 && y < 40) props.flatHouse({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 7, storeys: 2 });
    }
    props.church({ x: ox - 260, z: -1180, yaw: Math.PI / 2 });
    props.box('stone', ox + 20, 1.5, -1250, 10, 3, 240, 0.4, 0xb0a890);               // the harbour mole
    props.tower({ x: westX(-650) - 40, z: -650, concrete: false });                     // the Punta Palascìa light
    props.tower({ x: westX(1500) - 60, z: 1500, concrete: false });                     // the light on the Leuca cape
    props.church({ x: westX(1400) - 220, z: 1400, yaw: Math.PI / 2 });                  // (the sanctuary of Santa Maria di Leuca)
    props.tower({ x: SASENO.x - 120, z: SASENO.z + 120, concrete: false });             // the Saseno light
    props.mast({ x: SASENO.x + 40, z: SASENO.z - 40, height: 24 });                    // the Italian wireless station on Saseno
    props.tower({ x: KAR0.x + 90, z: KAR0.z + 60, concrete: false });                   // the Cape Linguetta light
    // Valona at the head of the bay
    for (let i = 0; i < 30; i++) {
      const x = 4400 + rand() * 400, z = -1750 + rand() * 400;
      const y = height(x, z);
      if (y > 2 && y < 50) props.flatHouse({ x, z, yaw: (rand() - 0.5) * 0.4, width: 7 + rand() * 3, depth: 7, storeys: 1 + Math.floor(rand() * 2) });
    }
    props.finish();
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update() {} };
  },
} satisfies MapDef;
