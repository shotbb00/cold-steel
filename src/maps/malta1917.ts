// The Malta Channel, 1917: the U-boat war in the central Mediterranean. Out of Cattaro and Pola the German flotilla
// and the k.u.k. boats came down past the Otranto barrage and lay across the routes from Malta to Salonika and
// Egypt; in 1917 they sank more ships in the Mediterranean than anywhere but the Western Approaches, the troopships
// Arcadian and Transylvania among them. From the spring the steamers sailed in convoy out of the Grand Harbour, the
// escorts British, French and Italian destroyers and sloops — and the eight destroyers of the Imperial Japanese
// Navy's 2nd Special Squadron, based on Malta from April 1917; on 11 June U 27 of the k.u.k. Kriegsmarine
// torpedoed Sakaki off Crete and blew her bow away. Here a troop convoy bound east comes up from Malta into the
// channel off Sicily, the U-boats waiting across its route, a torpedo-boat flotilla behind them.
// Malta and Gozo on the south-eastern edge, set NW–SE like the real islands, Comino between them, Valletta on its
// peninsula between the Grand Harbour and Marsamxett; the low south-east corner of Sicily on the north-western
// edge, Cape Passero and its little island off the point. Open sea between, deep and blue.
// A convoy scenario like maps/westernApproaches.ts: the convoy (the Royal Navy, its transports bring in command
// points while they lie in a zone the convoy holds — the SeaDirector's wolf pack steers for them) comes up from the
// south, the U-boats wait in the north. Ships only. Fair, not mirrored: turned half round the middle, Malta the
// convoy's mark and Cape Passero the U-boats', the two zones of the channel between each as near one fleet as the
// other by the sailing routes (cold-steel-map-briefs seapath). No zone behind the islands: a zone off the Grand Harbour
// routed the convoy's escorts through the Comino channels, where they circled the waypoints and never met the pack.
// Laid out at full size by widenSea.
// (The French, Italian and Japanese escorts: at sea a side fields the first navy it names — the Royal Navy here,
// the Kaiserliche Marine against it; the others are named for the world campaign's armies. No Japanese navy yet.)
import { island } from '../world/Sea.js';
import { northSea } from './northSea.ts';

const LIMESTONE = 0xd8c49a;   // Malta's globigerina, the honey-coloured stone Valletta is built of
const TERRACE = 0x8a8458;     // the terraced fields and the garigue on top
const SICILY = 0xcab98e;
const OLIVE = 0x6e7044;

/** The islands: centre, half length along the NW–SE ridge, half width, height, the ridge's angle (−0.785: NW–SE). */
const ISLANDS: [number, number, number, number, number, number][] = [
  [3300, -3000, 1000, 480, 70, -0.785],   // Malta (the Dingli cliffs on its south-west side)
  [1993, -1693, 450, 230, 45, -0.785],    // Gozo (the South Comino Channel kept wide and deep: a narrow gap stalled the ships' routes)
  [2350, -2050, 70, 45, 12, -0.785],      // Comino, close off Gozo
  [-2560, 2560, 70, 45, 10, 0],           // the Isola di Capo Passero, off the point
];
const ROT = ISLANDS.map(([, , , , , a]) => [Math.cos(a), Math.sin(a)]);
const MALTA = ISLANDS[0];
const CAPE: [number, number] = [-2700, 2600];   // Cape Passero, Sicily's south-east corner

/** A point on Malta from its own frame: u along the ridge (+ south-east), v across it (+ the north-east shore). */
const onMalta = (u: number, v: number): [number, number] => {
  const [c, s] = ROT[0];
  return [MALTA[0] + u * c - v * s, MALTA[1] + u * s + v * c];
};

const sea = northSea({
  id: 'malta-1917',
  name: 'Malta Channel 1917',
  description: '1917, the channel between Malta and Sicily: a troop convoy bound for Salonika and Egypt comes out of the Grand Harbour under British, French, Italian and Japanese destroyers. The German and Austro-Hungarian U-boats from Cattaro wait across its route off Cape Passero.',
  seed: 1917_0611,
  floor: 90,   // (the channel is deep: a hundred fathoms and more between the islands and Sicily)
  conditions: { time: 'day', weather: 'clear' },
  sky: { fogColor: 0xb4c4d0, fogDensity: 0.00018, skyTop: 0x4a76ae, skyHorizon: 0xcad6de, sunColor: 0xfff4e0, sunIntensity: 2.0, clouds: 0.2, sunDir: [0.4, 0.6, -0.5] },
  land(x, z, n) {
    let h = -Infinity;
    for (let i = 0; i < ISLANDS.length; i++) {
      const [cx, cz, hl, hw, top] = ISLANDS[i], [c, s] = ROT[i];
      const dx = x - cx, dz = z - cz, u = dx * c + dz * s, v = -dx * s + dz * c;
      if (Math.abs(u) > hl + 200 || Math.abs(v) > hw + 200) continue;
      let d = hw - Math.hypot((u * hw) / hl, v) + (n(x, z, 0.012) - 0.5) * hw * 0.25;   // metres inside the coast, a ragged one
      if (i === 0) {
        // the Grand Harbour and Marsamxett cut into the north-east shore, Valletta's peninsula (Sciberras) between them
        if (v > 0 && Math.abs(u - 170) < 55) d = Math.min(d, (v - (hw - 280)) * -1 - 8);
        if (v > 0 && Math.abs(u + 40) < 40) d = Math.min(d, (v - (hw - 200)) * -1 - 8);
      }
      h = Math.max(h, d > 0 ? island(d, hw, top, n(x + 40, z, 0.01)) : -1.5 + d * 0.3);   // (steep-to: deep a few lengths off)
    }
    // Sicily's south-east corner: the coast west-north-west from the cape toward Pozzallo, north-north-east toward Syracuse
    if (x < -1500 && z > 2000) {
      const east = CAPE[0] + (z - CAPE[1]) * 0.3 - x, south = z - CAPE[1] - (CAPE[0] - x) * 0.25;
      const d = Math.min(east, south) + (n(x, z, 0.006) - 0.5) * 90;
      h = Math.max(h, d > 0 ? island(Math.min(d, 900), 900, 120, n(x + 90, z, 0.008), 20) : -1.5 + d * 0.15);
    }
    return h;
  },
  surface(x, z, y) {
    if (x > 0 && y > 3) return [y > 14 ? TERRACE : LIMESTONE, 1];   // the pale stone cliffs, the terraces above
    if (x < 0 && y > 3) return [y > 10 ? OLIVE : SICILY, 1];       // the limestone shore, the olive groves and almonds inland
    return null;
  },
  points: [
    { id: 'A', name: 'The convoy', x: 0, z: -2050, owner: 'nato', sector: 'centre', radius: 160 },
    { id: 'B', name: 'Off Gozo', x: 1350, z: -1500, owner: null, sector: 'east', radius: 180 },
    { id: 'C', name: 'The Malta route', x: 1250, z: 0, owner: null, sector: 'east', radius: 180 },
    { id: 'D', name: 'The Sicilian channel', x: -1250, z: 0, owner: null, sector: 'west', radius: 180 },
    { id: 'E', name: 'Off Cape Passero', x: -1900, z: 1570, owner: null, sector: 'west', radius: 180 },
    { id: 'K', name: 'U-boat patrol line', x: 0, z: 2050, owner: 'pact', sector: 'centre', radius: 160 },
  ],
  spawns: {
    // the troopships in three columns, the destroyer ahead, the sloop astern (the drifters and the rest are bought:
    // westernApproaches' AI soaks — started with them the convoy outweighed the pack)
    nato: [{ unit: 'destroyer', x: 0, z: -1950, facing: 0 },
      { unit: 'transport', x: -300, z: -2250, facing: 0 }, { unit: 'transport', x: 0, z: -2150, facing: 0 }, { unit: 'transport', x: 300, z: -2250, facing: 0 }, { unit: 'frigate', x: 0, z: -2400, facing: 0 }],
    // (each fleet's first ship the same distance out: the routing tools measure from her)
    pact: [{ unit: 'destroyer', x: 0, z: 1950, facing: Math.PI }, { unit: 'destroyer', x: 0, z: 2250, facing: Math.PI },
      { unit: 'submarine', x: -700, z: 1850, facing: Math.PI }, { unit: 'submarine', x: 700, z: 1850, facing: Math.PI }, { unit: 'submarine', x: 0, z: 1750, facing: Math.PI }, // (a third boat over the type's limit: with two the convoy lost nothing)
      { unit: 'frigate', x: -400, z: 2300, facing: Math.PI }, { unit: 'frigate', x: 400, z: 2300, facing: Math.PI }],
  },
  decorate(props, height, rand) {
    // Valletta on Sciberras between the two harbours: flat-roofed stone houses, St John's, Fort St Elmo's light at the point
    const [c, s] = ROT[0];
    for (let i = 0; i < 60; i++) {
      const [x, z] = onMalta(15 + rand() * 100, MALTA[3] - 240 + rand() * 220);
      const y = height(x, z);
      if (y > 3 && y < 50) props.flatHouse({ x, z, yaw: Math.atan2(c, s) + (rand() - 0.5) * 0.2, width: 8 + rand() * 3, depth: 8, storeys: 2 + (rand() < 0.4 ? 1 : 0) });
    }
    const church = onMalta(65, MALTA[3] - 130);
    props.church({ x: church[0], z: church[1], yaw: Math.atan2(c, s) });
    const elmo = onMalta(65, MALTA[3] - 25);
    props.tower({ x: elmo[0], z: elmo[1], concrete: false });         // Fort St Elmo's light
    const mdina = onMalta(-300, -150);
    for (let i = 0; i < 16; i++) {                                     // Mdina on its hill
      const x = mdina[0] + (rand() - 0.5) * 120, z = mdina[1] + (rand() - 0.5) * 120;
      if (height(x, z) > 10) props.flatHouse({ x, z, yaw: (rand() - 0.5) * 0.5, width: 7 + rand() * 3, depth: 7, storeys: 2 });
    }
    const mast = onMalta(-500, 250);
    props.mast({ x: mast[0], z: mast[1], height: 26 });               // the naval wireless station
    props.tower({ x: 1723, z: -1463, concrete: false });              // the Gozo light at Giordan
    for (let i = 0; i < 14; i++) {                                     // Victoria's citadel on Gozo
      const x = 1993 + (rand() - 0.5) * 110, z = -1693 + (rand() - 0.5) * 110;
      if (height(x, z) > 6) props.flatHouse({ x, z, yaw: (rand() - 0.5) * 0.5, width: 7, depth: 7, storeys: 2 });
    }
    // Sicily: Portopalo by the cape, the light on the Isola di Capo Passero, a Spanish watchtower up the coast
    for (let i = 0; i < 22; i++) {
      const x = -2950 + rand() * 220, z = 2700 + rand() * 160;
      const y = height(x, z);
      if (y > 3 && y < 40) props.flatHouse({ x, z, yaw: (rand() - 0.5) * 0.4, width: 7 + rand() * 2, depth: 7, storeys: 1 + (rand() < 0.4 ? 1 : 0) });
    }
    props.church({ x: -2860, z: 2800, yaw: 0 });
    props.tower({ x: -2560, z: 2560, concrete: false });              // the Capo Passero light
    props.tower({ x: -2480, z: 3300, concrete: false });              // a coast watchtower toward Marzamemi
  },
});

export default {
  ...sea,
  region: 'med',
  // (the convoy's escorts — the Royal Navy, the Marine nationale, the Regia Marina — against the German flotilla and
  // the k.u.k. boats out of Cattaro: at sea each side fields the first navy it names, maps/index.js armiesOn)
  armies: { nato: ['uk', 'fr', 'it'], pact: ['de', 'ah'] },
  sides: { nato: 'Allies', pact: 'Central Powers' },
};
