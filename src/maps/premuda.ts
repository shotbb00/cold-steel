// Premuda, dawn on 10 June 1918: the k.u.k. Flotte's last sortie. Horthy meant to fall on the Otranto Barrage with
// the whole dreadnought squadron; Szent István and Tegetthoff, out of Pola with their destroyer and torpedo boats,
// steamed south through the night down the outside of the Dalmatian islands. Off Premuda at half past three two
// Italian MAS boats on patrol out of Ancona — Luigi Rizzo's MAS 15 and MAS 21 — slipped in between the escorts;
// two of Rizzo's torpedoes hit Szent István, she rolled over at six and the raid was called off.
// The northern Dalmatian islands, set NW–SE like the real ones: the long ridge of Lošinj and little Ilovik on the
// north (the Austro-Hungarian side), Silba and Olib inshore, Premuda alone in the middle facing the open Adriatic,
// Ist, Molat and the long ridge of Dugi Otok on the south (the Italian side), the channels and reefs between.
// White limestone, maquis and olive terraces, the villages by their coves. Ships only (sea maps: no shore batteries).
// Fair by sailing distance (Desktop/cold-steel-map-briefs seapath.py / seatune.py): the Premuda bank, the Premuda channel
// and the Olib passage each as near the one fleet's home as the other's by the routes round the islands. Each home's
// straight line to each zone keeps clear of the islands (a route round a cape close in left the AI's ships circling
// its corner points: they never got there), the islands are steep-to, and no gap between them is a narrow one.
import { island } from '../world/Sea.js';
import { northSea } from './northSea.ts';

const LIMESTONE = 0xd6d0c0;
const MAQUIS = 0x5e6a3c;

/** The islands: centre, half length along the NW–SE ridge, half width, height, the ridge's angle (−0.7: NW–SE). */
const ISLANDS: [number, number, number, number, number, number][] = [
  [-2700, 3700, 1700, 380, 90, -0.7],   // Lošinj (its southern half)
  [-1450, 2550, 420, 150, 30, -0.7],    // Ilovik (all but joined to Lošinj's tip: no way through)
  [1000, 1150, 800, 170, 35, -1.0],     // Silba
  [2700, 1500, 650, 260, 30, -0.7],     // Olib
  [-750, 250, 900, 150, 40, -0.7],      // Premuda
  [1000, -1100, 480, 160, 50, -0.7],    // Ist
  [3200, -1900, 1000, 260, 50, -0.7],   // Molat
  [3600, -3600, 1800, 400, 110, -0.7],  // Dugi Otok (its north end)
];
const ROT = ISLANDS.map(([, , , , , a]) => [Math.cos(a), Math.sin(a)]);

/** The reefs: awash shoals off Premuda's south-west side (the Premuda bank) and off Ilovik. */
const SHOALS: [number, number, number, number][] = [[-1050, -250, 160, 60], [-1700, 1800, 180, 70]];

const sea = northSea({
  id: 'premuda',
  name: 'Premuda',
  description: 'June 1918, dawn among the Dalmatian islands: the Austro-Hungarian dreadnoughts steam south past Premuda to break the Otranto Barrage. Two Italian MAS boats are waiting in the islands — Rizzo\'s MAS 15 sank Szent István here.',
  seed: 1918_0610,
  floor: 55,
  conditions: { time: 'dawn', weather: 'clear' },
  sky: { fogColor: 0xc8b8a8, fogDensity: 0.00024, skyTop: 0x5a78a0, skyHorizon: 0xe8c8a0, sunColor: 0xffd8a8, sunIntensity: 1.7, sunDir: [0.8, 0.18, 0.3], clouds: 0.25 },
  land(x, z, n) {
    let h = -Infinity;
    for (let i = 0; i < ISLANDS.length; i++) {
      const [cx, cz, hl, hw, top] = ISLANDS[i], [c, s] = ROT[i];
      const dx = x - cx, dz = z - cz, u = dx * c + dz * s, v = -dx * s + dz * c;
      if (Math.abs(u) > hl + 160 || Math.abs(v) > hw + 160) continue;
      const d = hw - Math.hypot((u * hw) / hl, v) + (n(x, z, 0.012) - 0.5) * hw * 0.3;   // metres inside the coast, a ragged one
      h = Math.max(h, d > 0 ? island(d, hw, top, n(x + 40, z, 0.01)) : -1.5 + d * 0.35);   // (steep-to under water, as the Dalmatian limestone is: deep a ship's length off)
    }
    for (const [sx, sz, a, b] of SHOALS) {
      const q = Math.hypot((x - sx) / a, (z - sz) / b);
      if (q < 3) h = Math.max(h, -2.5 - q * 5);
    }
    return h;
  },
  surface(x, z, y) {
    if (y > 3) return [y > 8 ? MAQUIS : LIMESTONE, 1];   // the white rock shore, maquis and olive terraces above
    return null;
  },
  points: [
    { id: 'A', name: 'Ancona flotilla', x: 0, z: -2050, owner: 'nato', sector: 'centre', radius: 150 },
    { id: 'B', name: 'Premuda bank', x: -2000, z: 0, owner: null, sector: 'west', radius: 170 },
    { id: 'C', name: 'Premuda channel', x: 300, z: -5, owner: null, sector: 'centre', radius: 160 },
    { id: 'D', name: 'Olib passage', x: 2400, z: 0, owner: null, sector: 'east', radius: 160 },
    { id: 'K', name: 'Pola squadron', x: 0, z: 2100, owner: 'pact', sector: 'centre', radius: 150 },
  ],
  bases: { nato: { x: 0, z: -2300, entries: [-500, 0, 500] }, pact: { x: 0, z: 2300, entries: [-500, 0, 500] } },
  // Rizzo's MAS boats with an Italian scout and destroyers; Szent István's escort: a scout cruiser and the destroyers.
  // (Neither navy has its dreadnoughts yet — no Tegetthoff or Dante Alighieri variant, the 1918 unit batch: a battleship
  // here would come as a light cruiser, data/units/index.js standInFor. The k.u.k. torpedo boats come as destroyers.)
  spawns: {
    nato: [{ unit: 'lightCruiser', x: -200, z: -2200, facing: 0 }, { unit: 'lightCruiser', x: 200, z: -2200, facing: 0 }, { unit: 'destroyer', x: -400, z: -2050, facing: 0 }, { unit: 'destroyer', x: 400, z: -2050, facing: 0 },
      { unit: 'ptBoat', x: -250, z: -1900, facing: 0 }, { unit: 'ptBoat', x: 250, z: -1900, facing: 0 }],
    pact: [{ unit: 'lightCruiser', x: 0, z: 2200, facing: Math.PI }, { unit: 'destroyer', x: -400, z: 2050, facing: Math.PI }, { unit: 'destroyer', x: 400, z: 2050, facing: Math.PI }],
  },
  decorate(props, height, rand) {
    // the villages by their coves: Premuda's, Silba's, Olib's, Molat's
    for (const [vx, vz] of [[-680, 280], [950, 1100], [2650, 1550], [3150, -1880]]) {
      for (let i = 0; i < 14; i++) {
        const x = vx + (rand() - 0.5) * 160, z = vz + (rand() - 0.5) * 120;
        const y = height(x, z);
        if (y > 2 && y < 30) props.flatHouse({ x, z, yaw: -0.7 + (rand() - 0.5) * 0.4, width: 6 + rand() * 3, depth: 6, storeys: 1 + (rand() < 0.4 ? 1 : 0) });
      }
    }
    props.church({ x: 990, z: 1110, yaw: -0.7 });                 // Silba's church
    props.tower({ x: -1380, z: 780, concrete: false });           // the light on Premuda's north-west point
    props.tower({ x: 680, z: -840, concrete: false });           // the Ist light
  },
});

export default {
  ...sea,
  region: 'med',
  armies: { nato: ['it'], pact: ['ah'] }, // (the Regia Marina's MAS boats against the k.u.k. Kriegsmarine)
  sides: { nato: 'Italy', pact: 'Austria-Hungary' },
};
