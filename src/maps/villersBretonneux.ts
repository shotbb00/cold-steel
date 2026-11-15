// Villers-Bretonneux, Picardy, April 1918: the last ridge before Amiens. The German spring offensive
// ran out of breath here; on 24 April they took the town with tanks — the first tank-against-tank
// fight in history, A7Vs against British Mark IVs at Cachy — and that night the Australians took it
// back. Two trench systems face each other across a crater field: a front line with two belts of wire
// and a support line behind it on each side, the town on its low ridge in no man's land between them,
// shot to ruins, Hangard Wood and Monument Wood shredded to stumps. (maps/westernFront.ts)
import { westernFront } from './westernFront.ts';

export default westernFront({
  id: 'villers-bretonneux',
  name: 'Villers-Bretonneux',
  description: 'April 1918, the last ridge before Amiens: two trench systems face each other across a crater field, the ruined town between them. Wire in front of every line, woods shot to stumps — and the first tank-against-tank fight in history.',
  seed: 1918,
  points: [
    { id: 'A', name: 'Bois l\'Abbé', x: 0, z: 470, owner: 'nato', sector: 'centre' },
    { id: 'B', name: 'Cachy', x: -300, z: 320, owner: null, sector: 'west' },
    { id: 'C', name: 'Bois d\'Aquenne', x: 0, z: 330, owner: null, sector: 'centre' },
    { id: 'D', name: 'Fouilloy', x: 300, z: 320, owner: null, sector: 'east' },
    { id: 'E', name: 'Hangard Wood', x: -330, z: 30, owner: null, sector: 'west', radius: 24 },
    { id: 'F', name: 'Villers-Bretonneux', x: 0, z: 0, owner: null, sector: 'centre', radius: 30 },
    { id: 'G', name: 'Monument Wood', x: 330, z: -30, owner: null, sector: 'east', radius: 24 },
    { id: 'H', name: 'Hangard', x: -300, z: -320, owner: null, sector: 'west' },
    { id: 'I', name: 'Marcelcave', x: 0, z: -330, owner: null, sector: 'centre' },
    { id: 'J', name: 'Warfusée', x: 300, z: -320, owner: null, sector: 'east' },
    { id: 'K', name: 'Lamotte', x: 0, z: -470, owner: 'pact', sector: 'centre' },
  ],
  lines: [{ z: 150, wireAt: 26, belts: 2, seed: 11 }, { z: 255, wireAt: 18, belts: 1, gapEvery: 60, seed: 23 }],
  front: 150, craters: 3.2, ridge: 4.5,
  town: { quarters: [[48, 10], [-20, 46]], church: { x: 6, z: -26 } },
});
