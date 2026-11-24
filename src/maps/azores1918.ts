// The Azores, summer 1918: the U-cruiser war. The big long-range boats — U 151, U 155 that had been the merchant
// submarine Deutschland, U 156, U 157 — sailed from Kiel for three-month cruises to the far Atlantic, two 15 cm deck
// guns each, and lay across the convoy routes off the Azores and the American coast, shelling what they would not
// waste a torpedo on. Against them the US and British destroyers and the old cruisers took the troop convoys and
// the coal and grain ships past the islands, and Horta's harbour on Faial, the cable station of the Atlantic, was
// where the escorts coaled and the survivors were landed.
// Open Atlantic, a long deep swell; on the eastern edge the central islands: Faial with Horta looking across the
// channel at Pico, Pico's volcano standing over everything, the long cliff ridge of São Jorge beyond. (Turned a
// quarter round and drawn closer than they lie, so all three fit the edge: Faial south, São Jorge north.)
// The convoy (the Royal Navy: no US Navy ships in the game yet — its transports bring in command points while they
// lie in a zone the convoy holds, the SeaDirector's wolf pack steers for them) comes up from the south, the U-boats
// wait in the north. A convoy scenario on westernApproaches' pattern: ships only, fair by sailing distance —
// Horta roads one fleet's mark, São Jorge the other's, the Pico channel and the troopship lane as near one fleet as
// the other by the sailing routes (cold-steel-map-briefs seapath/seatune). Laid out at full size by widenSea.
import { island } from '../world/Sea.js';
import { northSea } from './northSea.ts';

const FAIAL: [number, number, number] = [3750, -1450, 500];   // x, z, radius: the round island, the Caldeira in its top
const PICO: [number, number] = [3560, 150];                    // the volcano's summit, at the island's western end
const JORGE_Z = 1750;                                          // São Jorge's ridge, running east off the map
const HORTA: [number, number] = [4070, -1080];

const sea = northSea({
  id: 'azores-1918',
  name: 'Azores 1918',
  description: 'Summer 1918, the Atlantic off the central Azores: a convoy and its escorts come past Faial and Horta harbour while the long-range U-cruisers wait across the route. Deep blue swell, Pico\'s volcano over the islands on the eastern edge.',
  seed: 1918_07,
  floor: 120,   // (mid-ocean: the islands rise out of the abyss)
  conditions: { time: 'day', weather: 'clear' },
  sky: { fogColor: 0xa8bccb, fogDensity: 0.00016, skyTop: 0x4a74a0, skyHorizon: 0xc0d2de, sunIntensity: 1.9, clouds: 0.45, sunDir: [-0.4, 0.6, 0.55] },
  land(x, z, n) {
    if (x < 2300) return -Infinity;   // (the open ocean: the islands' slopes are under the floor long before here)
    let h = -Infinity;
    // Faial: a round island, the Caldeira's bowl sunk in its top
    const df = Math.hypot(x - FAIAL[0], z - FAIAL[1]);
    h = Math.max(h, island(FAIAL[2] - df + (n(x, z, 0.02) - 0.5) * 50, FAIAL[2], 380, n(x, z, 0.01), 14) - Math.max(0, 160 - df) * 0.9);
    // Pico: a long island east from the volcano, the cone rising out of it
    const dp2 = 470 - Math.hypot(Math.max(0, PICO[0] - 120 - x), z - 150 - (x - 3500) * 0.04) + (n(x, z, 0.02) - 0.5) * 40;
    if (dp2 > -800) {
      let p = island(dp2, 470, 220, n(x, z, 0.01), 12);
      const r = Math.hypot(x - PICO[0], z - PICO[1]);
      if (dp2 > 0 && r < 900) p += 1050 * (1 - r / 900) ** 1.6 - (r < 40 ? 30 : 0);   // the cone, Piquinho's crater at the top
      h = Math.max(h, p);
    }
    // São Jorge: a long narrow ridge, sheer cliffs both sides
    const dj = 240 - Math.hypot(Math.max(0, 3250 - x), z - JORGE_Z - (n(x, z, 0.008) - 0.5) * 120);
    if (dj > -800) h = Math.max(h, island(dj, 240, 300, n(x, z, 0.01), 8));
    return h;
  },
  surface(x, z, y) {
    if (y > 650) return [0x4a4440, 1];                       // Pico's bare black lava
    if (y > 3) return [y > 260 ? 0x4e6a3a : 0x5c7a3c, 1];    // the pastures and the hydrangea hedges; heather higher up
    return null;
  },
  points: [
    { id: 'A', name: 'The convoy', x: 0, z: -2050, owner: 'nato', sector: 'centre', radius: 160 },
    { id: 'B', name: 'Horta roads', x: 2750, z: -1335, owner: null, sector: 'east', radius: 180 },
    { id: 'C', name: 'Under Pico', x: 2450, z: 0, owner: null, sector: 'east', radius: 180 },
    { id: 'D', name: 'The troopship lane', x: -1250, z: 0, owner: null, sector: 'west', radius: 180 },
    { id: 'E', name: 'Off São Jorge', x: 2750, z: 1335, owner: null, sector: 'east', radius: 180 },
    { id: 'K', name: 'U-cruiser station', x: 0, z: 2050, owner: 'pact', sector: 'centre', radius: 160 },
  ],
  spawns: {
    // the transports in three columns, the destroyer ahead, the sloop astern (westernApproaches' tested convoy)
    nato: [{ unit: 'destroyer', x: 0, z: -1950, facing: 0 },
      { unit: 'merchant', x: -300, z: -2250, facing: 0 }, { unit: 'merchant', x: 0, z: -2150, facing: 0 }, { unit: 'merchant', x: 300, z: -2250, facing: 0 }, { unit: 'frigate', x: 0, z: -2400, facing: 0 }],
    // (each fleet's first ship the same distance out: the routing tools measure from her)
    // the U-cruisers and a UB boat, torpedo boats behind
    pact: [{ unit: 'destroyer', x: 0, z: 1950, facing: Math.PI }, { unit: 'destroyer', x: 0, z: 2250, facing: Math.PI },
      { unit: 'cruiserSub', x: -700, z: 1850, facing: Math.PI }, { unit: 'cruiserSub', x: 700, z: 1850, facing: Math.PI }, { unit: 'submarine', x: 0, z: 1750, facing: Math.PI }, // (two U-cruisers: over the type's limit, the map's own)
      { unit: 'frigate', x: -400, z: 2300, facing: Math.PI }],
  },
  decorate(props, height, rand) {
    // Horta: the white houses up the slope from the bay, the church, the harbour mole, the cable station's mast
    for (let i = 0; i < 26; i++) {
      const x = HORTA[0] - 110 + rand() * 120, z = HORTA[1] - 80 + rand() * 120;
      const y = height(x, z);
      if (y > 3 && y < 45) props.flatHouse({ x, z, yaw: Math.PI / 4 + (rand() - 0.5) * 0.4, width: 7 + rand() * 3, depth: 7, storeys: 1 + (rand() < 0.4 ? 1 : 0) });
    }
    props.church({ x: HORTA[0] - 60, z: HORTA[1] - 20, yaw: Math.PI / 4 });
    props.box('stone', HORTA[0] + 40, 1.5, HORTA[1] - 70, 9, 3, 220, Math.PI / 4, 0xa09c90);   // the harbour mole
    props.mast({ x: HORTA[0] - 120, z: HORTA[1] - 60, height: 26 });                            // the cable and wireless station
    props.tower({ x: FAIAL[0] - 470, z: FAIAL[1] - 60, concrete: false });                     // Ponta dos Capelinhos light
    // Pico's shore villages among the black lava walls of the vineyards
    for (let i = 0; i < 14; i++) {
      const x = 3500 + rand() * 1600, z = rand() < 0.5 ? -250 + rand() * 60 : 520 + rand() * 60;
      const y = height(x, z);
      if (y > 3 && y < 40) props.house({ x, z, yaw: (rand() - 0.5) * 0.4, width: 7, depth: 6 });
    }
    props.tower({ x: 3290, z: JORGE_Z, concrete: false });                                     // São Jorge's western light
  },
});

export default {
  ...sea,
  region: 'europe', // (at sea: the mid-Atlantic)
  armies: { nato: ['uk', 'aef'], pact: ['de'] }, // (the Royal Navy and the US Navy: data/units1918/aef.js)
  sides: { nato: 'Britain and the United States', pact: 'Germany' },
};
