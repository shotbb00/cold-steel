// The Western Approaches, summer 1917: the U-boat war at its height. In April the U-boats sank 860,000 tons and
// Britain had six weeks of grain left; in May the Admiralty gave in and sailed the first ocean convoys home from
// Gibraltar and Hampton Roads. Here, two hundred miles out where the escorts met them, the steamers come in on
// their columns — the destroyers ahead and on the wings, a Flower-class sloop astern, the armed drifters and
// trawlers of the auxiliary patrol round the edges with their hydrophones — and the UB and UC boats out of
// Flanders and the big U-cruisers from Wilhelmshaven wait across the route, a torpedo boat flotilla behind them.
// Open Atlantic, a long grey swell off the shelf; no land but the marks the ships steered by: the Isles of Scilly
// low on the eastern edge, Bishop Rock's light at their western end, and in the west the Fastnet, Ireland's
// teardrop, a lone rock with its new granite tower.
// The convoy (the Royal Navy, its transports: they bring in command points while they lie in a zone the convoy
// holds — the SeaDirector's wolf pack steers for them) comes up from the south, the U-boats wait in the north.
// Ships only. Fair, not mirrored: turned half round the middle, one mark nearer each fleet (the Scillies the
// convoy's, the Fastnet the U-boats'), the Sole Bank and the convoy route the two middle zones, each as near one
// fleet as the other by the sailing routes (cold-steel-map-briefs seapath). Laid out at full size by widenSea.
import { island } from '../world/Sea.js';
import { northSea } from './northSea.ts';

const SCILLY: [number, number, number][] = [   // the isles: x, z, radius — St Mary's, Tresco, St Martin's, St Agnes, Bryher
  [3950, -1800, 150], [3800, -1560, 110], [4080, -1500, 95], [3780, -1960, 70], [3640, -1620, 70],
];
const BISHOP: [number, number] = [3380, -1980];  // Bishop Rock, out on its own to the west of the isles
const FASTNET: [number, number] = [-3700, 1850];

const sea = northSea({
  id: 'western-approaches',
  name: 'Western Approaches',
  description: 'Summer 1917, the Atlantic off the Scillies and the Fastnet: a convoy of steamers in its columns, destroyers, sloops and drifters round it, comes in through the U-boats waiting across its route. Open sea and a long swell, only the lighthouses on the rocks in sight.',
  seed: 1917_06,
  floor: 95,   // (the edge of the shelf: deep, the swell long)
  conditions: { time: 'day', weather: 'overcast' },
  sky: { fogColor: 0x98a4aa, fogDensity: 0.00021, skyTop: 0x56687a, skyHorizon: 0xb0bcc2, sunIntensity: 1.5, clouds: 0.8, sunDir: [0.3, 0.45, 0.65] },
  land(x, z, n) {
    let h = -Infinity;
    if (x > -2900 && x < 2600) return h;   // (the open sea between: the rocks' slopes are under the floor long before here)
    for (const [cx, cz, r] of SCILLY) h = Math.max(h, island(r - Math.hypot(x - cx, (z - cz) * 1.2) + (n(x, z, 0.02) - 0.5) * 40, r, 28, n(x, z, 0.01), 12));
    h = Math.max(h, island(14 - Math.hypot(x - BISHOP[0], z - BISHOP[1]), 14, 9, 0.6, 3));        // Bishop Rock: barely room for the tower
    h = Math.max(h, island(30 - Math.hypot(x - FASTNET[0], (z - FASTNET[1]) * 1.6), 30, 30, 0.8, 4)); // the Fastnet, 30 m of slate
    return h;
  },
  surface(x, z, y) {
    if (y > 3) return [x < 0 || y > 22 ? 0x7a786e : 0x6a7a4a, 1];   // slate and granite; the isles' turf and bulb fields
    return null;
  },
  points: [
    { id: 'A', name: 'The convoy', x: 0, z: -2050, owner: 'nato', sector: 'centre', radius: 160 },
    { id: 'B', name: 'Off the Scillies', x: 2750, z: -1335, owner: null, sector: 'east', radius: 180 },
    { id: 'C', name: 'The convoy route', x: 1250, z: 0, owner: null, sector: 'east', radius: 180 },
    { id: 'D', name: 'Great Sole Bank', x: -1250, z: 0, owner: null, sector: 'west', radius: 180 },
    { id: 'E', name: 'Off the Fastnet', x: -2750, z: 1335, owner: null, sector: 'west', radius: 180 },
    { id: 'K', name: 'U-boat patrol line', x: 0, z: 2050, owner: 'pact', sector: 'centre', radius: 160 },
  ],
  spawns: {
    // the steamers in three columns, the destroyer ahead, the sloop astern, the drifters on the wings
    nato: [{ unit: 'destroyer', x: 0, z: -1950, facing: 0 },
      { unit: 'transport', x: -300, z: -2250, facing: 0 }, { unit: 'transport', x: 0, z: -2150, facing: 0 }, { unit: 'transport', x: 300, z: -2250, facing: 0 }, { unit: 'frigate', x: 0, z: -2400, facing: 0 }],
      // (the drifters and trawlers are bought: started with them the convoy outweighed the pack in the AI soaks)
    // (each fleet's first ship the same distance out: the routing tools measure from her)
    pact: [{ unit: 'destroyer', x: 0, z: 1950, facing: Math.PI }, { unit: 'destroyer', x: 0, z: 2250, facing: Math.PI },
      { unit: 'submarine', x: -700, z: 1850, facing: Math.PI }, { unit: 'submarine', x: 700, z: 1850, facing: Math.PI },
      // the Flanders A-boats (balance: the convoy's drifters outweighed a bare pack in the AI soaks)
      { unit: 'frigate', x: -400, z: 2300, facing: Math.PI }, { unit: 'frigate', x: 400, z: 2300, facing: Math.PI }],
  },
  decorate(props, height, rand) {
    // St Mary's: Hugh Town's granite cottages on the isthmus, the church; the Daymark on St Martin's
    for (let i = 0; i < 18; i++) {
      const x = 3880 + rand() * 140, z = -1830 + rand() * 90;
      const y = height(x, z);
      if (y > 3 && y < 30) props.house({ x, z, yaw: (rand() - 0.5) * 0.4, width: 7 + rand() * 2, depth: 6 });
    }
    props.church({ x: 3990, z: -1760, yaw: 0 });
    props.tower({ x: 4100, z: -1470, concrete: false });     // the St Martin's daymark
    props.tower({ x: BISHOP[0], z: BISHOP[1], concrete: false });   // the Bishop Rock light
    props.tower({ x: FASTNET[0], z: FASTNET[1], concrete: false }); // the Fastnet light
    props.mast({ x: 3820, z: -1600, height: 22 });           // the naval wireless station
  },
});

export default {
  ...sea,
  region: 'europe', // (at sea: the North Atlantic)
  armies: { nato: ['uk'], pact: ['de'] }, // (the Royal Navy's escorts and drifters against the Kaiserliche Marine's U-boats: maps/index.js armiesOn)
  sides: { nato: 'Britain', pact: 'Germany' },
};
