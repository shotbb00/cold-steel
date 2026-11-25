// Moon Sound, 17 October 1917 (Operation Albion): the German army has landed on Ösel; to cut off the Russian
// squadron the Kaiserliche Marine sends the dreadnoughts König and Kronprinz north out of the Gulf of Riga,
// behind their minesweepers through the Russian fields, into the narrow Moon Sound between the island of Moon
// and the Estonian mainland. Admiral Bakhirev waits off Kuivastu with the old battleship Slava, the Grazhdanin,
// the cruiser Bayan and the destroyers; Slava, out-ranged, holed and drawing too much water for the dredged
// channel, is scuttled across it and the rest steam north for the Gulf of Finland.
// On the map (x east, z north): Moon in the middle-west, low and wooded, the Kuivastu pier and village on its east
// shore; the mainland down the east, the Werder peninsula (Virtsu) reaching out at the sound's southern mouth;
// Ösel in the south-west behind the Small Sound (shallows and the Orissaar causeway — no way through); Schildau
// in the northern sound, Worms and the tip of Dagö to the north-west. The sound is shallow (seven to ten metres),
// its banks awash; the Russian fields across the southern approaches, a German field across the north. Autumn.
// The Germans (pact) come up from the Gulf of Riga in the south, the Russians (nato) down from the north.
// Ships only (sea maps: no shore batteries, no land units). Fair by sailing distance (Desktop/cold-steel-map-briefs
// seapath.py / seatune.py): the one channel joins the two fleets; Kuivastu roads is as far from either home by
// it, the bank where Slava was scuttled as much nearer the Russians as the Werder narrows the Germans; the same ships a side.
import { createNoise2D, fbm } from '../world/Noise.js';
import { island, shore } from '../world/Sea.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { northSea } from './northSea.ts';

const MOON: [number, number, number, number] = [-1500, 0, 1400, 1100];          // centre x, z, half-width, half-depth
const OSEL: [number, number, number, number] = [-4200, -3200, 3200, 2300];      // a squarish island (superellipse)
const DAGO: [number, number, number, number] = [-4800, 5200, 2800, 2000];
const WORMS: [number, number, number, number] = [-900, 3300, 900, 500];
const SCHILDAU: [number, number] = [100, 1550];   // (west of the fleets' way down the sound: ships cut corners round an island in their path)
const KUIVASTU: [number, number] = [-110, -100];
const tn = createNoise2D(1917_1017);

/** The mainland's coast (x) at z: straight down the sound, falling back east to the north (Hapsal) and to the south (Pärnu bay), the Werder peninsula out at the southern mouth. */
const xE = (z: number) => 1400 + fbm(tn, z * 0.0015, 3.3, 3) * 120 + Math.max(0, z - 1400) * 0.6 + Math.max(0, -1700 - z) * 0.9
  - (Math.abs(z + 1250) < 330 ? 650 * Math.cos(((z + 1250) / 330) * Math.PI / 2) ** 0.6 : 0);

/** Metres inside an elliptical (p = 2) or squarish (p = 4) island's coast, roughly. */
const inside = ([cx, cz, rx, rz]: number[], x: number, z: number, p = 2) => (1 - (Math.abs((x - cx) / rx) ** p + Math.abs((z - cz) / rz) ** p) ** (1 / p)) * Math.min(rx, rz);

/** The banks: [x, z, half-length, half-width] — awash (2–3 m), no ship over them. */
const SHOALS: [number, number, number, number][] = [
  [480, -1000, 260, 110],    // the Werder bank off the peninsula's tip
  [-30, 600, 120, 220],     // the bank off Moon's north-east point
  [1150, 300, 120, 260],    // the mainland shallows north of Werder
  [-400, -1650, 90, 60],    // the Paternoster rocks in the southern approach
];

const sea = northSea({
  id: 'moon-sound',
  name: 'Moon Sound',
  description: 'October 1917, Operation Albion: the German dreadnoughts König and Kronprinz force the minefields into the narrow Moon Sound between the island of Moon and the Estonian mainland. The old Russian battleship Slava waits off the Kuivastu pier with the Grazhdanin and the destroyers. Shallow channels, low wooded islands, shoals.',
  seed: 1917_10,
  floor: 15,   // (the Baltic straits: shallow everywhere)
  conditions: { time: 'day', weather: 'overcast' },
  sky: { fogColor: 0xa4aaa8, fogDensity: 0.00024, skyTop: 0x5e6a74, skyHorizon: 0xbcc0ba, sunColor: 0xf0e2c4, sunIntensity: 1.5, sunDir: [0.6, 0.3, -0.5], clouds: 0.8 },
  land(x, z, n) {
    const nn = n(x, z, 0.01);
    let h = shore(x - xE(z), 14, nn, 30);                                                  // the mainland
    // (each island only near its coast or on it: past ~250 m offshore the floor is deeper than its shore — height cost)
    const isle = (r: number[], p: number, f: number, amp: number, rr: number, top: number, beach: number) => {
      const d = inside(r, x, z, p);
      if (d > -250) h = Math.max(h, island(d + (n(x, z, f) - 0.5) * amp, rr, top, nn, beach));
    };
    isle(MOON, 2, 0.006, 160, 600, 18, 30);    // Moon: low, wooded
    isle(OSEL, 4, 0.005, 200, 900, 22, 30);    // Ösel
    isle(DAGO, 4, 0.005, 200, 900, 24, 30);    // Dagö
    isle(WORMS, 2, 0.008, 120, 400, 12, 25);   // Worms
    h = Math.max(h, island(260 - Math.hypot(x - SCHILDAU[0], (z - SCHILDAU[1]) * 0.8) + (nn - 0.5) * 60, 260, 10, nn, 20)); // Schildau
    // the Small Sound between Moon and Ösel: a metre of water and the Orissaar causeway — closed to ships
    if (x < -1250 && x > -3600 && z < -800 && z > -1500) h = Math.max(h, -1.2 + (nn - 0.5) * 0.6);
    // the sound itself: seven to ten metres, the dredged channel and its banks (shoaling in over a ragged edge)
    if (x > -1400 && x < 3000 && z > -2800 && z < 3200) {
      const e = (Math.min(x + 600, 2200 - x, z + 2000, 2400 - z) + (n(x, z, 0.004) - 0.5) * 900) / 800;
      h = Math.max(h, -8.5 + (n(x, z, 0.003) - 0.5) * 3 - Math.max(0, 1 - Math.min(1, e)) * 8);
    }
    for (const [sx, sz, a, b] of SHOALS) {
      const q = Math.hypot((x - sx) / a, (z - sz) / b);
      if (q < 3) h = Math.max(h, (sx === -400 && q < 0.6 ? 3.5 : -2.4) - q * 3);         // (the Paternosters break the surface)
    }
    return h;
  },
  surface(x, z, y) {
    if (y > 2.5 && y < 4.5) return [0xa8a28a, 1];                                        // the shingle and juniper strand
    if (y > 4.5) return [fbm(tn, x * 0.004, z * 0.004, 2) > 0.1 ? 0x6e6a42 : 0x5a6440, 1];   // autumn meadows, the woods' floor
    return null;
  },
  // the Russian fields across the southern approaches (the lanes the German sweepers cut), a German field across the north
  minefields: [
    { owner: 'nato', x: 100, z: -1750, w: 2700, d: 130, count: 75, gaps: [-450, 700], gap: 150 },
    { owner: 'pact', x: 0, z: 2250, w: 3800, d: 130, count: 100, gaps: [-400, 950], gap: 150 },
  ],
  points: [
    { id: 'A', name: 'Russian squadron', x: 500, z: 2100, owner: 'nato', sector: 'centre', radius: 150 },
    { id: 'B', name: 'Werder narrows', x: 705, z: -695, owner: null, sector: 'west', radius: 160 },
    { id: 'C', name: 'Kuivastu roads', x: 447, z: -25, owner: null, sector: 'centre', radius: 170 },
    { id: 'D', name: 'Slava bank', x: 939, z: 596, owner: null, sector: 'east', radius: 160 },
    { id: 'K', name: 'Gulf of Riga', x: 300, z: -2100, owner: 'pact', sector: 'centre', radius: 150 },
  ],
  bases: { nato: { x: 500, z: 2300, entries: [-500, 0, 500] }, pact: { x: 300, z: -2300, entries: [-500, 0, 500] } },
  // a Gangut (the side's dreadnought: Slava is the Russians' second capital ship, the cruiser slot) with the Bayan and the destroyers; König's squadron: the dreadnought, a light cruiser, two destroyers
  spawns: {
    nato: [{ unit: 'battleship', x: 500, z: 2250, facing: Math.PI }, { unit: 'lightCruiser', x: 150, z: 2150, facing: Math.PI },
      { unit: 'destroyer', x: 850, z: 2100, facing: Math.PI }, { unit: 'destroyer', x: 500, z: 2000, facing: Math.PI }],
    pact: [{ unit: 'battleship', x: 300, z: -2250, facing: 0 }, { unit: 'lightCruiser', x: -50, z: -2150, facing: 0 },
      { unit: 'destroyer', x: 650, z: -2100, facing: 0 }, { unit: 'destroyer', x: 300, z: -2000, facing: 0 }],
  },
});

export default {
  ...sea,
  region: 'east',
  // (the Russian Baltic Fleet against the Kaiserliche Marine: data/units1918/navyEast.js)
  armies: { nato: ['ru'], pact: ['de'] },
  sides: { nato: 'Russia', pact: 'Germany' },
  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.river.build(scene, terrain);
    const h = (x: number, z: number) => sea.height(x, z);
    const village = (cx: number, cz: number, count: number, r: number, yaw: number) => {
      for (let i = 0; i < count; i++) {
        const x = cx + (rand() - 0.5) * r, z = cz + (rand() - 0.5) * r;
        const y = h(x, z);
        if (y > 3 && y < 20) props.house({ x, z, yaw: yaw + (rand() - 0.5) * 0.5, width: 7 + rand() * 3, depth: 5 + rand() * 2 });
      }
    };
    // Kuivastu: the steamer pier out into the sound, the village and the inn behind it
    props.box('stone', KUIVASTU[0] + 50, 1.2, KUIVASTU[1], 110, 2.4, 9, 0, 0x7a766c);
    village(KUIVASTU[0] - 170, KUIVASTU[1], 14, 220, Math.PI / 2);
    props.church({ x: -900, z: 150, yaw: Math.PI / 2 });                  // Muhu church, inland
    village(xE(-1250) + 120, -1250, 12, 200, -Math.PI / 2);              // Werder (Virtsu) on its peninsula
    village(xE(2300) + 160, 2300, 12, 220, -Math.PI / 2);                // Rogekul on the mainland
    props.box('stone', -2200, 0.8, -1150, 9, 1.8, 760, 0, 0x7c786e);     // the Orissaar causeway across the Small Sound
    props.tower({ x: SCHILDAU[0], z: SCHILDAU[1] + 120, concrete: false });  // the Schildau light
    props.tower({ x: xE(-1250) + 40, z: -1250, concrete: false });           // the Werder light
    props.mast({ x: KUIVASTU[0] - 260, z: KUIVASTU[1] + 160, height: 24 });   // the wireless station
    props.box('metal', 1150, 0.6, 300, 22, 7, 115, 0.15, 0x3e3c38, 0, 0.35); // Slava, scuttled and settled on the bank, listing
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: 2800, z: 2800 }, lane: 0, count: 6000, broadleaf: 0.45, autumn: 0.8, maxY: 60, size: 1.2,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 4.5 || Math.hypot(x - KUIVASTU[0] + 170, z - KUIVASTU[1]) < 160 }] });
    cover.finalize({ x: 5000, z: 5000 });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
};
