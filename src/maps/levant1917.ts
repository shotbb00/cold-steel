// The Levant coast, autumn 1917: the sea flank of Allenby's advance. While the army broke the Gaza–Beersheba line,
// the British and French squadron off the coast — the monitors and old cruisers that shelled Gaza for a week before
// the third battle, the destroyers screening them, the seaplane carriers that came after Ben-my-Chree (sunk off
// Castellorizo in January) flying their Shorts over the Turkish lines — kept the army's flank and its supply ships
// coming up from Port Said. Against them the U-boats the Germans worked out of Beirut and Haifa, and the torpedo
// boats; on 1 November 1917 UC 38 torpedoed the monitor M 15 and the destroyer Staunch off Gaza. Here the squadron
// comes up the coast from the south, the U-boats and torpedo boats down it from the north.
// The Palestinian coast along the eastern edge, low sand and kurkar ridges with the orange groves behind: Jaffa's
// old town on its hill above the reef that makes its harbour in the south; in the north Mount Carmel's ridge running
// out to its cape, the Stella Maris light on it, Haifa under the mountain on the bay and Acre across it. Shoals off
// the coast, the open sea to the west. Land only: no shore guns, no troops — ships only.
// Fair, not mirrored: Jaffa's water the squadron's mark, Carmel's the U-boats', the Caesarea coast and the open sea
// between, each as near one fleet as the other by the sailing routes (cold-steel-map-briefs seapath). Laid out at
// full size by widenSea; the land is drawn where it stands on the widened map.
import { shore } from '../world/Sea.js';
import { northSea } from './northSea.ts';

const SAND = 0xd8c69c;    // the coastal dunes
const KURKAR = 0xb49a6c;  // the sandstone ridges behind them
const GROVE = 0x5c6e36;   // the orange groves round Jaffa, the Sharon's fields
const MAQUIS = 0x5a6440;  // Carmel's oak and pine scrub
const ROCK = 0x9a8c72;    // the limestone on Carmel's top

/** The coastline from south to north (z rising): the land to the east of it. Carmel's cape, then Haifa bay, then Acre. */
const COAST: [number, number][] = [
  [3150, -6500], [3200, -2600], [3020, -2330], [3020, -2230], [3200, -2000], [3300, 0], [3280, 1200],
  [2660, 2330], [3800, 2600], [4020, 3350], [3380, 3950], [3420, 6500],
];
const JAFFA: [number, number] = [3090, -2280];
const CAPE: [number, number] = [2700, 2330];          // Carmel's cape, the Stella Maris on it
const RIDGE: [number, number, number, number] = [2760, 2320, 4800, 500];   // Carmel's crest, the cape to the south-east
/** The shoals: x, z, half-width, half-length, crest depth (−2: a ship goes round). */
const SHOALS: [number, number, number, number, number][] = [
  [2560, -1450, 160, 420, -2],   // off Jaffa to the north, the sands off the Yarkon's mouth
  [2580, 1000, 160, 420, -2],    // off Tantura and Dor, south of the cape
];

/** Metres inside the coastline (negative: out at sea). */
function coastD(x: number, z: number) {
  let best = Infinity, cx = 0;
  for (let i = 0; i < COAST.length - 1; i++) {
    const [ax, az] = COAST[i], [bx, bz] = COAST[i + 1];
    if (z >= az && z <= bz) cx = ax + ((z - az) / (bz - az)) * (bx - ax);
    const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  return x > cx ? best : -best;
}

/** How far from Carmel's crest line, and along it (0 at the cape, 1 at the far end). */
function ridgeAt(x: number, z: number) {
  const [ax, az, bx, bz] = RIDGE, vx = bx - ax, vz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(x - ax - vx * t, z - az - vz * t);
}

const sea = northSea({
  id: 'levant-1917',
  name: 'Levant Coast 1917',
  description: 'Autumn 1917, off the coast of Palestine: the British and French squadron — monitors, cruisers, destroyers, a seaplane carrier — shells Gaza and guards Allenby\'s flank, and the U-boats and torpedo boats from Haifa and Beirut come down the coast for it. Jaffa on its hill in the south, Mount Carmel and Haifa bay in the north, shoals along the shore.',
  seed: 1917_1101,
  floor: 70,
  conditions: { time: 'day', weather: 'clear' },
  sky: { fogColor: 0xc2ccd2, fogDensity: 0.00017, skyTop: 0x4c7cb4, skyHorizon: 0xd2dade, sunColor: 0xfff0d6, sunIntensity: 2.1, clouds: 0.15, sunDir: [-0.5, 0.55, -0.4] },
  land(x, z, n) {
    if (x < 1850) return -Infinity;   // (the open sea: the shelf and the shoals are under the floor long before here)
    const d = coastD(x, z) + (n(x, z, 0.006) - 0.5) * 60;
    let h = shore(d, 30, 0.3 + (n(x, z, 0.01) - 0.5) * 0.3, 40);   // the dunes and the kurkar ridge behind the beach
    if (d > 0) {
      const r = ridgeAt(x, z);   // Mount Carmel, steep on its sea side
      if (r < 700) h += (1 - r / 700) ** 1.6 * 190 * Math.min(1, d / 160) * (0.8 + n(x, z, 0.012) * 0.4);
      const j = Math.hypot(x - JAFFA[0] - 60, z - JAFFA[1]);   // Jaffa's hill
      if (j < 160) h += (1 - j / 160) * 22;
    } else {
      // Jaffa's reef: the line of rocks off the town that shelters its boat harbour
      if (z > -2420 && z < -2120 && d > -110 && d < -60) h = Math.max(h, 0.4 + n(x, z, 0.05) * 1.2);
      for (const [sx, sz, w, l, top] of SHOALS) {
        const bank = Math.hypot((x - sx) / w, (z - sz) / l);
        if (bank < 4) h = Math.max(h, top - Math.max(0, bank - 1) * w * 0.16);
      }
    }
    return h;
  },
  surface(x, z, y) {
    if (y < 3) return null;
    if (ridgeAt(x, z) < 600 && y > 14) return [y > 110 ? ROCK : MAQUIS, 1];
    if (y < 8) return [SAND, 1];
    return [z < 0 && y < 30 && (x + z * 0.3) % 300 > 120 ? GROVE : KURKAR, 1];
  },
  points: [
    { id: 'A', name: 'The squadron', x: 0, z: -2050, owner: 'nato', sector: 'centre', radius: 160 },
    { id: 'B', name: 'Off Jaffa', x: 2000, z: -2000, owner: null, sector: 'east', radius: 180 },
    { id: 'C', name: 'Off Caesarea', x: 2100, z: 0, owner: null, sector: 'centre', radius: 180 },
    { id: 'D', name: 'Off Mount Carmel', x: 2000, z: 2000, owner: null, sector: 'east', radius: 180 },
    { id: 'E', name: 'The open sea', x: -1600, z: 0, owner: null, sector: 'west', radius: 180 },
    { id: 'K', name: 'U-boat flotilla', x: 0, z: 2050, owner: 'pact', sector: 'centre', radius: 160 },
  ],
  spawns: {
    // the destroyers ahead, a sloop astern; the cruisers are bought (started with one the squadron outweighed the
    // flotilla in the AI soaks: it lost 0-1 ships to their 3) — the monitor and the seaplane carrier: none built yet
    // (each fleet's first ship the same distance out: the routing tools measure from her)
    nato: [{ unit: 'destroyer', x: 0, z: -1950, facing: 0 },
      { unit: 'destroyer', x: -400, z: -2050, facing: 0 }, { unit: 'frigate', x: 400, z: -2300, facing: 0 }],
    // the U-boats ahead, the torpedo boats behind
    pact: [{ unit: 'destroyer', x: 0, z: 1950, facing: Math.PI }, { unit: 'destroyer', x: 0, z: 2250, facing: Math.PI },
      { unit: 'submarine', x: -700, z: 1850, facing: Math.PI }, { unit: 'submarine', x: 700, z: 1850, facing: Math.PI },
      { unit: 'frigate', x: -400, z: 2300, facing: Math.PI }, { unit: 'frigate', x: 400, z: 2300, facing: Math.PI }],
  },
  decorate(props, height, rand) {
    // Jaffa: the old town stacked up its hill, the Great Mosque's dome, St Peter's, the light; palms along the shore
    for (let i = 0; i < 60; i++) {
      const x = JAFFA[0] + rand() * 220, z = JAFFA[1] - 150 + rand() * 300;
      const y = height(x, z);
      if (y > 3 && y < 40) props.flatHouse({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.4, width: 7 + rand() * 3, depth: 7, storeys: 1 + (rand() < 0.5 ? 1 : 0), dome: rand() < 0.08 });
    }
    props.church({ x: JAFFA[0] + 70, z: JAFFA[1] + 30, yaw: Math.PI / 2 });
    props.flatHouse({ x: JAFFA[0] + 110, z: JAFFA[1] - 60, yaw: 0, width: 14, depth: 14, dome: true, name: 'mosque' });
    props.tower({ x: JAFFA[0] + 20, z: JAFFA[1] - 110, concrete: false });   // the Jaffa light
    for (let i = 0; i < 24; i++) {
      const x = 3260 + rand() * 300, z = -2700 + rand() * 1000;
      if (height(x, z) > 3) props.palm({ x, z, height: 8 + rand() * 5 });
    }
    // Haifa on the bay under Carmel, the German Colony's red roofs; the Stella Maris and its light on the cape
    for (let i = 0; i < 50; i++) {
      const x = 3050 + rand() * 650, z = 2280 + rand() * 220;
      const y = height(x, z);
      if (y > 3 && y < 35) props.flatHouse({ x, z, yaw: 0.25 + (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 7, storeys: 1 + (rand() < 0.4 ? 1 : 0), dome: rand() < 0.05 });
    }
    for (let i = 0; i < 12; i++) {
      const x = 2980 + rand() * 120, z = 2330 + rand() * 80;
      if (height(x, z) > 3) props.house({ x, z, yaw: 0.25, width: 8 + rand() * 2, depth: 7 });
    }
    props.church({ x: CAPE[0] + 90, z: CAPE[1] - 40, yaw: 0.4 });            // the Stella Maris monastery
    props.tower({ x: CAPE[0] + 40, z: CAPE[1] - 10, concrete: false });     // its light
    props.mast({ x: 3300, z: 2380, height: 24 });                           // the wireless station
    // Acre across the bay: the walled town on its point, al-Jazzar's mosque
    for (let i = 0; i < 40; i++) {
      const x = 3420 + rand() * 200, z = 3900 + rand() * 180;
      const y = height(x, z);
      if (y > 3 && y < 30) props.flatHouse({ x, z, yaw: (rand() - 0.5) * 0.4, width: 7 + rand() * 3, depth: 7, storeys: 2, dome: rand() < 0.06 });
    }
    props.flatHouse({ x: 3540, z: 4000, yaw: 0, width: 16, depth: 16, dome: true, name: 'mosque' });
    props.tower({ x: 3480, z: 3900, concrete: false });                     // the Acre light on the sea wall
  },
});

export default {
  ...sea,
  region: 'med',
  // (the Royal Navy with the Marine nationale against the Kaiserliche Marine's U-boats and torpedo boats and the
  // Ottoman navy: at sea each side fields the first navy it names, maps/index.js armiesOn — the Ottomans have no ships yet)
  armies: { nato: ['uk', 'fr'], pact: ['de', 'ot'] },
  sides: { nato: 'Allies', pact: 'Central Powers' },
};
