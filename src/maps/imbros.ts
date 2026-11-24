// The Battle of Imbros, 20 January 1918. At dawn the Goeben and the Breslau — Yavuz Sultan Selim and Midilli to the
// Ottoman Navy, German ships with German crews — came out of the Dardanelles past Cape Helles, round to Kusu Bay on
// Imbros, and sank the monitors Raglan and M 28 at their moorings before the destroyers Lizard and Tigress could close.
// Turning south for Mudros, the Breslau ran into the British field off the strait and sank on five mines; the Goeben
// struck three, limped back up the strait and ran aground at Nagara Point. The north Aegean between Lemnos and the
// Dardanelles, turned a quarter round so that each fleet sails up from its own end: Mudros harbour inside Lemnos at
// the south edge (the Royal Navy's Aegean base), the mouth of the Dardanelles at the north between the Gallipoli
// peninsula (Cape Helles its tip, the Gulf of Saros beyond) and the Asian shore (Kum Kale); Imbros in the middle,
// Kusu Bay on its north-west side. Each side's mines across its enemy's door with lanes through them (the British
// field off the strait, the UC-boats' field off Mudros). Ships only. Fair, not mirrored: Lemnos's harbour as deep as
// the strait's mouth, Imbros across the middle, the zones in pairs as near each fleet by the sailing routes
// (cold-steel-map-briefs seapath). Laid out at full size by widenSea.
import { shore, island } from '../world/Sea.js';
import { northSea } from './northSea.ts';

const IMBROS = { x: -900, z: 0, rx: 520, rz: 1300 };
const KUSU = { x: -1330, z: 850, r: 230 };       // the bay cut into Imbros's (north) shore near its eastern end
const MOUTH = 2850;                              // where the strait and Mudros's entrance open into the Aegean
const half = (z: number) => 1000 + Math.max(0, 3300 - Math.abs(z)) * 0.8;   // the channel's half width: wide at the mouth, 1000 inside

const sea = northSea({
  id: 'imbros',
  name: 'Imbros',
  description: 'January 1918, the north Aegean at dawn: the Goeben and the Breslau come out of the Dardanelles to raid the monitors at Imbros; the British destroyers and cruisers come up from Mudros. Minefields with lanes off both harbours, Imbros between.',
  seed: 1918_01,
  floor: 70,
  conditions: { time: 'dawn', weather: 'clear' },
  sky: { fogColor: 0xa8b0b8, fogDensity: 0.00022, skyTop: 0x5a7090, skyHorizon: 0xd8c8b0, sunColor: 0xffe2c0, sunIntensity: 1.6, clouds: 0.35, sunDir: [0.2, 0.25, 0.9] },
  land(x, z, n) {
    const wob = (n(x, z, 0.003) - 0.5) * 160;
    let h = -Infinity;
    // Imbros: a long hilly island across the middle (Mt Ilyas), Kusu Bay bitten out of its north shore
    const e = Math.hypot((x - IMBROS.x) / IMBROS.rx, (z - IMBROS.z) / IMBROS.rz);
    if (e < 1.6) {
      const d = Math.min(IMBROS.rx * (1 - e) + wob * 0.5, Math.hypot(x - KUSU.x, z - KUSU.z) - KUSU.r);
      h = island(d, IMBROS.rx, 230, n(x, z, 0.01), 14);
    }
    if (Math.abs(z) < MOUTH - 250) return h;
    const w = half(z) + wob * 0.3, az = Math.abs(z) - MOUTH + wob * 0.4;
    if (z > 0) {
      // the Gallipoli peninsula (Cape Helles its tip at the mouth, the Gulf of Saros beyond it) and the Asian shore
      h = Math.max(h, shore(Math.min(-x - w, x + 3300 + wob, az), 160, n(x, z, 0.01), 18));
      h = Math.max(h, shore(Math.min(x - w, az - 60), 120, n(x, z, 0.01), 22));
    } else {
      // Lemnos: Mudros harbour between its two halves, the entrance at the mouth
      h = Math.max(h, shore(Math.min(-x - w, x + 3300 + wob, az), 110, n(x, z, 0.01), 18));
      h = Math.max(h, shore(Math.min(x - w, 3300 - x + wob, az - 60), 110, n(x, z, 0.01), 22));
    }
    return h;
  },
  surface(x, z, y) {
    if (y > 4) return [y > 70 ? 0x8a8270 : 0x7a7a52, 1];     // maquis and scrub, bare limestone on the heights
    return null;
  },
  minefields: [
    { owner: 'nato', x: 0, z: 2700, w: 1600, d: 110, count: 36, gaps: [-350, 300], gap: 140 },   // the British deep field off the strait: the Breslau's grave
    { owner: 'pact', x: 0, z: -2700, w: 1600, d: 110, count: 36, gaps: [-350, 300], gap: 140 },  // the UC-boats' field off Mudros
  ],
  points: [
    { id: 'A', name: 'Mudros', x: 0, z: -2050, owner: 'nato', sector: 'centre', radius: 150 },
    { id: 'B', name: 'Off Lemnos', x: 1300, z: -2250, owner: null, sector: 'east', radius: 170 },
    { id: 'C', name: 'North of Imbros', x: -1700, z: -850, owner: null, sector: 'west', radius: 170 },
    { id: 'D', name: 'The destroyer patrol', x: 600, z: 0, owner: null, sector: 'centre', radius: 180 },
    { id: 'E', name: 'Kusu Bay', x: -1500, z: 850, owner: null, sector: 'west', radius: 170 },
    { id: 'F', name: 'Off Kum Kale', x: 1300, z: 2250, owner: null, sector: 'east', radius: 170 },
    { id: 'K', name: 'The Dardanelles', x: 0, z: 2100, owner: 'pact', sector: 'centre', radius: 150 },
  ],
  bases: { nato: { x: 0, z: -2300, entries: [-300, 0, 300] }, pact: { x: 0, z: 2300, entries: [-300, 0, 300] } },
  spawns: {
    // (each fleet's first ship the same distance out: the routing tools measure from her)
    nato: [{ unit: 'cruiser', x: 0, z: -2200, facing: 0 }, { unit: 'lightCruiser', x: 0, z: -2400, facing: 0 },
      { unit: 'destroyer', x: -300, z: -2050, facing: 0 }, { unit: 'destroyer', x: 300, z: -2050, facing: 0 }],
    pact: [{ unit: 'cruiser', x: 0, z: 2200, facing: Math.PI }, { unit: 'lightCruiser', x: 0, z: 2400, facing: Math.PI },
      { unit: 'destroyer', x: 300, z: 2050, facing: Math.PI }, { unit: 'destroyer', x: -300, z: 2050, facing: Math.PI }],
  },
  decorate(props, height, rand) {
    // Kastro above Kusu Bay, the Greek village on its hill; the British camp and wireless at Kephalo, the island's east tip
    for (let i = 0; i < 26; i++) {
      const x = -1250 + rand() * 200, z = 1050 + rand() * 220;
      const y = height(x, z);
      if (y > 4 && y < 90) props.flatHouse({ x, z, yaw: (rand() - 0.5) * 0.5, width: 6 + rand() * 3, depth: 6, storeys: 1 });
    }
    props.church({ x: -1180, z: 1150, yaw: 0 });
    props.mast({ x: -820, z: 1240, height: 24 });                 // the Kephalo wireless station
    props.tower({ x: -950, z: 1290, concrete: false });           // the Kephalo light
    props.tower({ x: -1330, z: MOUTH + 90, concrete: false });    // Cape Helles light
    props.tower({ x: 1350, z: MOUTH + 120, concrete: false });     // Kum Kale's fort
    // Mudros: the town on the harbour's shore, the base's huts
    for (let i = 0; i < 30; i++) {
      const x = 1100 + rand() * 260, z = -3900 + rand() * 500;
      const y = height(x, z);
      if (y > 3 && y < 60) props.flatHouse({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 6, storeys: 1 });
    }
    props.church({ x: 1200, z: -3650, yaw: Math.PI / 2 });
  },
});

// the ships' own names here (UnitStack shipName): the Abercrombie monitors and the destroyers of the Aegean squadron;
// the Goeben and the Breslau under their German names (stand-ins: the battlecruiser and light cruiser slots)
(sea.river as { names?: unknown }).names = {
  nato: { cruiser: ['Raglan', 'Abercrombie', 'Havelock', 'Roberts'], destroyer: ['Lizard', 'Tigress', 'Racoon', 'Basilisk', 'Harpy', 'Beagle', 'Foxhound', 'Grasshopper'] },
  pact: { cruiser: ['Goeben'], lightCruiser: ['Breslau'] },
};

export default {
  ...sea,
  region: 'med', // (at sea: the Aegean)
  armies: { nato: ['uk'], pact: ['de', 'ot'] }, // (the Royal Navy's Aegean squadron against the Mittelmeerdivision: German ships in Ottoman service, the German navy's slots — 'ot' has no ships)
  sides: { nato: 'Britain', pact: 'Germany & Ottoman Empire' },
};
