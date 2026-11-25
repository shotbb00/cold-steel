// The Azores, 1917–18: the U-cruiser war. On the morning of 4 July 1917 U 155 — the merchant submarine
// Deutschland that had run the blockade to Baltimore, now with two 15 cm deck guns — surfaced off Ponta Delgada
// on São Miguel and shelled the town and the harbour behind its long breakwater; the American collier Orion,
// lying in the harbour, and the Portuguese battery on the mole fired back until she dived and drew off. The US
// Navy made Ponta Delgada its base in the islands that year, and through 1918 the big long-range boats (U 151,
// U 155, U 156, U 157) lay across the convoy routes past the Azores, shelling what they would not waste a torpedo on.
// The real waters, turned half round so São Miguel's south coast faces the open sea of the map: the island along
// the near edge — the Sete Cidades caldera and its lakes at the west end, Ponta da Ferraria under it, Ponta Delgada
// and its breakwater, the cinder cones and the Lagoa do Fogo massif east of the town, Vila Franca do Campo and its
// drowned crater islet further east — and Santa Maria, the old dry island, drawn closer than its 80 km off the
// far edge. Open Atlantic between, a long deep swell.
// The convoy (the Royal Navy: no US Navy ships in the game yet — its transports bring in command points while they
// lie in a zone the convoy holds, the SeaDirector's wolf pack steers for them) comes in from the west round the
// Ferraria; the U-cruisers come from the east-south-east. Fair by the sailing routes (cold-steel-map-briefs
// seapath): every zone lies on the line between the homes, from Ponta Delgada's harbour mouth out past U 155's
// gun line and the convoy lane to Santa Maria — each as near one fleet as the other. Ships only. Laid out at full
// size by widenSea (maps/index.js): the places below are the widened ones.
import { island } from '../world/Sea.js';
import { northSea } from './northSea.ts';

/** The homes as widenSea leaves them (it doubles a base and moves that side's home zone and ships by half of it). */
const BASES = { nato: { x: 3623, z: -1242 }, pact: { x: -3623, z: 1242 } };
const HOME = { nato: [3500, -1200], pact: [-3500, 1200] } as const;
const LINE: [number, number] = [-0.946, 0.324];   // nato's home toward pact's
/** A ship `ahead` m toward the enemy's home and `right` m across, round the side's home. */
const ship = (f: 'nato' | 'pact', unit: string, ahead: number, right: number) => {
  const k = f === 'nato' ? 1 : -1, [hx, hz] = HOME[f], fx = LINE[0] * k, fz = LINE[1] * k;
  const x = hx + fx * ahead + fz * right, z = hz + fz * ahead - fx * right;
  return { unit, x: x - BASES[f].x / 2, z: z - BASES[f].z / 2, facing: Math.atan2(fx, fz) };
};
const PD: [number, number] = [-926, -3060];       // Ponta Delgada's harbour
const SETE: [number, number] = [-100, -3950];     // the Sete Cidades caldera
const FOGO: [number, number] = [-2700, -4150];    // Lagoa do Fogo
const ILHEU: [number, number] = [-4000, -2790];   // Vila Franca's islet
const MARIA: [number, number, number, number] = [1500, 3950, 1050, 560];   // Santa Maria: centre, half length, half width

/** São Miguel's south shore (z) at x: the Sete Cidades massif bulging out, a bay east of the town. */
const shoreZ = (x: number) => -3050 + 160 * Math.exp(-(((x - 150) / 520) ** 2)) - 110 * Math.exp(-(((x + 1900) / 600) ** 2)) + 60 * Math.exp(-(((x + 3300) / 400) ** 2));
/** The rounded west end: the Ferraria at its foot. */
const westX = (z: number) => 400 + 480 * Math.sqrt(Math.max(0, 1 - ((z + 4300) / 1300) ** 2));
/** A crater: a rim `top` high at `rim` m round (cx, cz), a lake in the bowl. */
const crater = (x: number, z: number, cx: number, cz: number, rim: number, top: number) => {
  const r = Math.hypot(x - cx, z - cz);
  return r < rim * 0.82 ? -6 + (r / rim) * 4 : top * Math.exp(-(((r - rim) / (rim * 0.6)) ** 2));
};

const sea = northSea({
  id: 'azores-1918',
  name: 'Azores 1918',
  description: '1917–18, off Ponta Delgada on São Miguel: a convoy and its escorts come in past the Ferraria while the long-range U-cruisers that shelled the town wait across the route. Deep blue swell, the crater lakes of Sete Cidades above the harbour, Santa Maria on the horizon.',
  seed: 1918_07,
  floor: 120,   // (mid-ocean: the islands rise out of the abyss)
  conditions: { time: 'day', weather: 'clear' },
  sky: { fogColor: 0xa8bccb, fogDensity: 0.00016, skyTop: 0x4a74a0, skyHorizon: 0xc0d2de, sunIntensity: 1.9, clouds: 0.5, sunDir: [-0.5, 0.55, -0.4] },
  land(x, z, n) {
    let h = -Infinity;
    if (z < -2500) {
      // São Miguel
      const r = (n(x, z, 0.012) - 0.5) * 80;
      const d = Math.min(shoreZ(x) - z, westX(z) - x) + r;
      if (d > -400) {
        h = d > 0 ? island(d, 600, 45, n(x + 40, z, 0.01)) : -1.5 + d * 0.25;
        if (d > 0) {
          const k = Math.min(1, d / 150);
          h += k * Math.max(0, crater(x, z, SETE[0], SETE[1], 430, 150) - 20);                       // Sete Cidades' rim
          h += k * Math.max(0, crater(x, z, FOGO[0], FOGO[1], 300, 190) - 20);                       // the Água de Pau massif
          for (const [cx, cz, t] of [[-1500, -3800, 55], [-2050, -3450, 45], [-1150, -4350, 60], [-3500, -3650, 50]]) h += k * t * Math.exp(-((Math.hypot(x - cx, z - cz) / 160) ** 2));   // the cinder cones
          if (Math.hypot(x - SETE[0], z - SETE[1]) < 430 * 0.82) h = crater(x, z, SETE[0], SETE[1], 430, 150);   // the twin lakes in the caldera
          if (Math.hypot(x - FOGO[0], z - FOGO[1]) < 300 * 0.82) h = crater(x, z, FOGO[0], FOGO[1], 300, 190);   // Lagoa do Fogo
        }
      }
      // Vila Franca's islet: a drowned crater ring, its lagoon open to the sea by a gap
      const di = Math.hypot(x - ILHEU[0], z - ILHEU[1]);
      if (di < 220) {
        const ring = 45 - Math.abs(di - 80) + (n(x, z, 0.03) - 0.5) * 12;
        const gap = Math.atan2(z - ILHEU[1], x - ILHEU[0]) > 1.2 && Math.atan2(z - ILHEU[1], x - ILHEU[0]) < 1.7;
        h = Math.max(h, gap ? -2 : ring > 0 ? Math.min(14, 1 + ring * 0.6) : -1.5 + ring * 0.2);
      }
      return h;
    }
    // Santa Maria: higher to the east (Pico Alto), the dry west end
    const [mx, mz, ml, mw] = MARIA;
    const dm = mw - Math.hypot(((x - mx) * mw) / ml, z - mz) + (n(x, z, 0.012) - 0.5) * 60;
    if (dm > -400) h = dm > 0 ? island(dm, mw, 60 + 50 * Math.min(1, Math.max(0, (mx - x) / ml + 0.5)), n(x + 90, z, 0.01)) : -1.5 + dm * 0.25;
    return h;
  },
  surface(x, z, y) {
    if (y < 3) return null;
    if (y < 0 || (z < -2500 && (Math.hypot(x - SETE[0], z - SETE[1]) < 340 || Math.hypot(x - FOGO[0], z - FOGO[1]) < 240))) return [0x3e4a34, 1];   // the crater walls' laurel woods
    if (z > 2000 && x > MARIA[0] - 200) return [y > 40 ? 0x8a7a4a : 0xa47a52, 1];   // Santa Maria's dry west: red clay, stubble
    return [y > 140 ? 0x4e6a3a : 0x5c7a3c, 1];                                    // the pastures and the hydrangea hedges; heather higher up
  },
  bases: {
    nato: { x: BASES.nato.x / 2, z: BASES.nato.z / 2, entries: [-400, 0, 400] },
    pact: { x: BASES.pact.x / 2, z: BASES.pact.z / 2, entries: [-400, 0, 400] },
  },
  points: [
    { id: 'A', name: 'The convoy', x: HOME.nato[0] - BASES.nato.x / 2, z: HOME.nato[1] - BASES.nato.z / 2, owner: 'nato', sector: 'east', radius: 160 },
    { id: 'B', name: 'Off Ponta Delgada', x: -924, z: -2696, owner: null, sector: 'west', radius: 170 },
    { id: 'C', name: 'U 155\'s gun line', x: -444, z: -1296, owner: null, sector: 'centre', radius: 180 },
    { id: 'D', name: 'The convoy lane', x: 211, z: 615, owner: null, sector: 'centre', radius: 190 },
    { id: 'E', name: 'Off Santa Maria', x: 1028, z: 2999, owner: null, sector: 'east', radius: 180 },
    { id: 'K', name: 'U-cruiser station', x: HOME.pact[0] - BASES.pact.x / 2, z: HOME.pact[1] - BASES.pact.z / 2, owner: 'pact', sector: 'west', radius: 160 },
  ],
  spawns: {
    // the transports in three columns, the destroyer ahead, the sloop astern (westernApproaches' tested convoy)
    nato: [ship('nato', 'destroyer', 100, 0), ship('nato', 'merchant', -200, -300), ship('nato', 'merchant', -100, 0), ship('nato', 'merchant', -200, 300), ship('nato', 'frigate', -350, 0)],
    // (each fleet's first ship the same distance out: the routing tools measure from her)
    // the U-cruisers and a UB boat, torpedo boats behind
    pact: [ship('pact', 'destroyer', 100, 0), ship('pact', 'destroyer', -200, 0),
      ship('pact', 'cruiserSub', 200, -700), ship('pact', 'cruiserSub', 200, 700), ship('pact', 'submarine', 300, 0), // (two U-cruisers: over the type's limit, the map's own)
      ship('pact', 'frigate', -250, -400)],
  },
  decorate(props, height, rand) {
    const houses = (n: number, x0: number, x1: number, z0: number, z1: number, storeys = 1) => {
      for (let i = 0; i < n; i++) {
        const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0), y = height(x, z);
        if (y > 3 && y < 45) props.flatHouse({ x, z, yaw: (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 7, storeys: storeys + (rand() < 0.35 ? 1 : 0) });
      }
    };
    // Ponta Delgada: the white town along the shore, the Matriz, the São Brás fort, the breakwater, the cable station
    houses(55, PD[0] - 420, PD[0] + 380, PD[1] - 260, PD[1] - 20, 1);
    props.church({ x: PD[0] - 40, z: PD[1] - 120, yaw: 0 });
    props.tower({ x: PD[0] + 330, z: PD[1] - 40, concrete: false });                       // Forte de São Brás
    props.box('stone', PD[0] - 150, 1.6, PD[1] + 70, 10, 3.2, 420, Math.PI / 2, 0x4a4844);  // the breakwater, black basalt
    props.mast({ x: PD[0] - 300, z: PD[1] - 200, height: 26 });                            // the cable and wireless station
    houses(18, ILHEU[0] - 200, ILHEU[0] + 150, -3250, -3110, 1);                          // Vila Franca do Campo
    props.church({ x: ILHEU[0] - 30, z: -3200, yaw: 0 });
    props.tower({ x: westX(-4300) - 60, z: -4300, concrete: false });                     // the Ferraria light
    houses(14, MARIA[0] + 650, MARIA[0] + 950, MARIA[1] - 200, MARIA[1] + 150, 1);         // Vila do Porto on Santa Maria
    props.tower({ x: MARIA[0] - 850, z: MARIA[1] - 250, concrete: false });              // Ponta do Castelo light
  },
});

export default {
  ...sea,
  region: 'europe', // (at sea: the mid-Atlantic)
  armies: { nato: ['uk', 'aef'], pact: ['de'] }, // (the Royal Navy and the US Navy: data/units1918/aef.js)
  sides: { nato: 'Britain and the United States', pact: 'Germany' },
};
