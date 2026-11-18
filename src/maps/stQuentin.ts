// St Quentin, 21 March 1918: the first morning of the German spring offensive, Operation Michael. In
// thick fog after a five-hour hurricane bombardment the storm troops came through the British Fifth
// Army's forward zone — not a continuous trench but a chain of redoubts, Manchester Hill among them,
// each a square of trench in its wire meant to hold out on its own — and went round them. Here both
// sides hold such a zone: a thin outpost line, then redoubts on the rises behind it. Not mirrored but fair: each
// side has two big redoubts on hills at the same reach from its base, Manchester Hill answered by the rise over
// Pontru, and two small ones between. Open rolling downs between them, the fog low over everything. (maps/westernFront.ts)
import { westernFront } from './westernFront.ts';

export default westernFront({
  id: 'st-quentin',
  armies: { nato: ['uk'], pact: ['st', 'de'] }, // (Operation Michael: the storm troops against the British Fifth Army)
  name: 'St Quentin',
  description: 'March 1918 at dawn, in thick fog: no continuous trench line but redoubts — squares of trench in their own wire — on the rises behind a thin outpost line. Hold them, or go round them as the storm troops did.',
  seed: 1921,
  points: [
    { id: 'A', name: 'Holnon', x: 0, z: 470, owner: 'nato', sector: 'centre' },
    { id: 'B', name: 'Manchester Hill', x: -380, z: 310, owner: null, sector: 'west', radius: 26, village: false },
    { id: 'C', name: 'Savy Wood', x: -40, z: 380, owner: null, sector: 'centre' },
    { id: 'D', name: 'Enghien Redoubt', x: 250, z: 300, owner: null, sector: 'east', radius: 26, village: false },
    { id: 'E', name: 'Fayet', x: -250, z: 50, owner: null, sector: 'west' },
    { id: 'F', name: 'Francilly-Selency', x: 10, z: -10, owner: null, sector: 'centre', radius: 26 },
    { id: 'G', name: 'Gricourt', x: 230, z: -50, owner: null, sector: 'east' },
    { id: 'H', name: 'Fresnoy-le-Petit', x: -220, z: -290, owner: null, sector: 'west', radius: 26, village: false },
    { id: 'I', name: 'Ste Hélène', x: 100, z: -400, owner: null, sector: 'centre' },
    { id: 'J', name: 'Pontru', x: 360, z: -280, owner: null, sector: 'east', radius: 26, village: false },
    { id: 'K', name: 'St Quentin', x: 0, z: -470, owner: 'pact', sector: 'centre' },
  ],
  lines: [{ z: 140, wireAt: 20, belts: 1, gapEvery: 50, seed: 3 }],   // the thin outpost line
  // each side's battle zone: two big redoubts on the rises at its points, two small ones between (nato's z > 0)
  redoubts: [{ x: -380, z: 310, size: 24 }, { x: 250, z: 300, size: 24 }, { x: -150, z: 245, size: 16 }, { x: 90, z: 230, size: 16 },
    { x: -220, z: -290, size: 24 }, { x: 360, z: -280, size: 24 }, { x: -40, z: -235, size: 16 }, { x: 180, z: -205, size: 16 }],
  // Manchester Hill answered by the rise over Pontru and the Omignon; the low Savy ridge by the one west of St Quentin
  hills: [[-380, 310, 130, 6], [360, -280, 140, 6], [-60, 290, 170, 6], [160, -330, 170, 6], [-300, -60, 170, 5], [320, 80, 150, 5]],
  woodsAt: [[-40, 380, 60], [100, -400, 55]], // (Savy Wood; the wood by Ste Hélène)
  front: 140, craters: 1.8, ridge: 2, woods: 0.4,
  ruins: [0.7, 0.3],
  theme: { fogColor: 0xb4b8b6, fogDensity: 0.0042, skyTop: 0x9aa0a4, skyHorizon: 0xc0c2c0, sunIntensity: 1.2, sunDisk: 0.05, clouds: 0.9, hemiIntensity: 1.35 },
});
