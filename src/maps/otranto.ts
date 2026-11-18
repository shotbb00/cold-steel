// The Strait of Otranto, 15 May 1917: the Austro-Hungarian navy's raid on the Otranto Barrage. The barrage was a line
// of British drifters strung across the mouth of the Adriatic, their indicator nets out to catch the U-boats going
// south from Cattaro; at night Horthy's three scout cruisers — Novara, Saida, Helgoland — came down and sank fourteen
// of them, while two destroyers went for the convoy off Albania. At dawn the Allied cruisers out of Brindisi — HMS
// Dartmouth and Bristol, the Italian destroyers with them — caught the raiders on their way home, and the cruisers
// fought it out in the middle of the strait until the Austro-Hungarian armoured cruiser Sankt Georg came out to cover
// them. The open Adriatic: the low limestone coast of Apulia on the west, Otranto's castle and harbour; the mountains of
// Albania on the east, the Karaburun cliffs and the island of Saseno off Valona. Fair: each side's fleet the same,
// its home the same distance from the drifter line; Otranto as near the Allies as Saseno the raiders.
import { shore, island } from '../world/Sea.js';
import { northSea } from './northSea.ts';

const LIMESTONE = 0xd8ccae;

const sea = northSea({
  id: 'otranto',
  name: 'Otranto Strait',
  description: 'May 1917, at night: the mouth of the Adriatic between Apulia and Albania, a line of drifters and their nets across it. The Austro-Hungarian cruisers come down from Cattaro to break the barrage; the Allied cruisers come out of Brindisi to cut them off.',
  seed: 1917_05,
  floor: 60,
  conditions: { time: 'night', weather: 'clear' },
  sky: { fogColor: 0x8ea0b0, fogDensity: 0.00026, skyTop: 0x4a6a90, skyHorizon: 0xb8c4cc, sunColor: 0xfff2dc, sunIntensity: 1.9, clouds: 0.3 },
  land(x, z, n) {
    // Apulia along the west: low limestone cliffs, Otranto's bay cut into them a little south of the middle
    const west = -2100 + (n(x, z, 0.002) - 0.5) * 180 + (Math.abs(z + 300) < 160 ? -(160 - Math.abs(z + 300)) * 0.8 : 0);
    let h = shore(west - x, 45, 0.4 + (n(x, z, 0.01) - 0.5) * 0.3, 12);
    // Albania along the east: the mountains straight out of the sea (the Karaburun), Valona bay behind Saseno to the north
    const east = 2150 + (n(x + 70, z, 0.002) - 0.5) * 200 + (z > 400 && z < 1300 ? 220 * Math.sin(((z - 400) / 900) * Math.PI) : 0);
    h = Math.max(h, shore(x - east, 180, 0.6 + (n(x, z, 0.01) - 0.5) * 0.5, 8));
    // Saseno: a steep island off the mouth of the bay
    h = Math.max(h, island(150 - Math.hypot((x - 1750) * 1.6, z - 820) + (n(x, z, 0.02) - 0.5) * 30, 150, 60));
    return h;
  },
  surface(x, z, y) {
    if (x < 0 && y > 4) return [y > 30 ? 0x7a7a4a : LIMESTONE, 1];      // the white cliffs, olive groves and maquis on top
    if (x > 0 && y > 6) return [y > 90 ? 0x8a8676 : 0x6a6a44, 1];      // maquis up the Albanian mountains, bare rock above
    return null;
  },
  // the barrage: the drifters' mine nets right across the strait (gaps for the patrols); the field the U-boats laid off Otranto
  minefields: [
    { owner: 'nato', x: 0, z: 0, w: 4000, d: 120, count: 90, gaps: [-900, 300, 1200], gap: 150 },
    { owner: 'pact', x: -1500, z: -700, w: 600, d: 100, count: 22 },
    { owner: 'nato', x: 1500, z: 700, w: 600, d: 100, count: 22 },
  ],
  points: [
    { id: 'A', name: 'Brindisi squadron', x: 0, z: -2050, owner: 'nato', sector: 'centre', radius: 150 },
    { id: 'B', name: 'Otranto', x: -1650, z: -450, owner: null, sector: 'west', radius: 160 },
    { id: 'C', name: 'The drifter line', x: 0, z: 0, owner: null, sector: 'centre', radius: 180 },
    { id: 'D', name: 'Saseno', x: 1550, z: 440, owner: null, sector: 'east', radius: 160 },
    { id: 'K', name: 'Cattaro squadron', x: 0, z: 2100, owner: 'pact', sector: 'centre', radius: 150 },
  ],
  bases: { nato: { x: 0, z: -2300, entries: [-500, 0, 500] }, pact: { x: 0, z: 2300, entries: [-500, 0, 500] } },
  spawns: {
    nato: [{ unit: 'lightCruiser', x: -200, z: -2200, facing: 0 }, { unit: 'lightCruiser', x: 200, z: -2200, facing: 0 }, { unit: 'destroyer', x: -450, z: -2050, facing: 0 }, { unit: 'destroyer', x: 450, z: -2050, facing: 0 }],
    pact: [{ unit: 'lightCruiser', x: 200, z: 2200, facing: Math.PI }, { unit: 'lightCruiser', x: -200, z: 2200, facing: Math.PI }, { unit: 'destroyer', x: 450, z: 2050, facing: Math.PI }, { unit: 'destroyer', x: -450, z: 2050, facing: Math.PI }],
  },
  decorate(props, height, rand) {
    // Otranto: the town on its headland round the Aragonese castle, the cathedral, the harbour mole
    for (let i = 0; i < 40; i++) {
      const x = -2250 + rand() * 260, z = -460 + rand() * 300;
      const y = height(x, z);
      if (y > 2 && y < 40) props.flatHouse({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 7, storeys: 2 });
    }
    props.church({ x: -2240, z: -250, yaw: Math.PI / 2 });
    props.box('stone', -2060, 1.5, -380, 10, 3, 260, 0.4, 0xb0a890);       // the harbour mole
    props.tower({ x: -2150, z: -1200, concrete: false });                   // the Punta Palascìa light
    props.tower({ x: 1750, z: 760, concrete: false });                      // the Saseno light
    props.mast({ x: 1720, z: 840, height: 24 });                           // the Italian wireless station on Saseno
  },
});

export default {
  ...sea,
  region: 'med',
  armies: { nato: ['uk', 'it'], pact: ['ah'] }, // (the Royal Navy's drifters and cruisers with the Regia Marina against the k.u.k. Kriegsmarine: maps/index.js armiesOn)
  sides: { nato: 'Allies', pact: 'Austria-Hungary' },
};
