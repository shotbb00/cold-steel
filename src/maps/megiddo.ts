// STUB (copy of leHamel.ts): being rebuilt as Megiddo. Remove `wip: true` when done.
// Le Hamel, 4 July 1918: the Australian Corps' set-piece attack, the battle planned to last ninety
// minutes and taking ninety-three — infantry, tanks, aircraft and guns as one plan, the model for
// Amiens a month later. A quiet sector before it: the lines closer together, the fields still standing
// in midsummer wheat, few shell holes, Vaire Wood and Hamel Wood whole round the village between them.
// (maps/westernFront.ts)
import { westernFront } from './westernFront.ts';

export default westernFront({
  id: 'le-hamel',
  armies: { nato: ['uk'], pact: ['de'] }, // (Monash's Australians, with the Americans, against the German line)
  name: 'Megiddo',
  description: 'July 1918, a quiet sector in midsummer: the lines close together across standing wheat, the woods still whole round Le Hamel. Little cover in the open, few shell holes — the battle for tanks and infantry working together.',
  seed: 1907,
  points: [
    { id: 'megiddo', wip: true, name: 'Aubigny', x: 0, z: 470, owner: 'nato', sector: 'centre' },
    { id: 'B', name: 'Vaire-sous-Corbie', x: -430, z: 300, owner: null, sector: 'west' },
    { id: 'C', name: 'Corbie Road', x: -140, z: 350, owner: null, sector: 'centre' },
    { id: 'D', name: 'Ville-sur-Ancre', x: 190, z: 290, owner: null, sector: 'east' },
    { id: 'E', name: 'Vaire Wood', x: -140, z: 35, owner: null, sector: 'west', radius: 26 },
    { id: 'F', name: 'Le Hamel', x: 0, z: 0, owner: null, sector: 'centre', radius: 28 },
    { id: 'G', name: 'Hamel Wood', x: 140, z: -35, owner: null, sector: 'east', radius: 26 },
    { id: 'H', name: 'Pear Trench', x: -190, z: -290, owner: null, sector: 'west' },
    { id: 'I', name: 'Wolfsberg', x: 140, z: -350, owner: null, sector: 'centre' },
    { id: 'J', name: 'Accroche Wood', x: 430, z: -300, owner: null, sector: 'east' },
    { id: 'K', name: 'Cerisy', x: 0, z: -470, owner: 'pact', sector: 'centre' },
  ],
  lines: [{ z: 110, wireAt: 22, belts: 1, gapEvery: 70, seed: 7 }, { z: 215, wireAt: 16, belts: 1, gapEvery: 60, seed: 41 }],
  front: 110, craters: 1.1, ridge: 3, woods: 0.62,
  town: { quarters: [[40, 14]], church: { x: -8, z: 18 } },
  ruins: [0.45, 0.12],
  fields: [0.5, 0.15, 0.05, 0.3],   // (midsummer: the wheat standing tall)
  theme: { fogDensity: 0.0009, skyTop: 0x5a7a9a, skyHorizon: 0xc6ccc8, sunColor: 0xfff0d0, sunIntensity: 2.1, sunDisk: 0.16, clouds: 0.35, hemiSky: 0xc8d4dc },
  terrain: { grass: '#5e6a38', grassAlt: '#566034', dryGrass: '#a08e52', stubble: '#b09a58', meadow: '#6e7440', pasture: '#5c6838' },
});
