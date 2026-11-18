// STUB (copy of soissons.ts): being rebuilt as Piave. Remove `wip: true` when done.
// Soissons, 18 July 1918: the Second Battle of the Marne turns. Before dawn, with no preparatory bombardment, Mangin's
// Tenth Army bursts out of the Forest of Retz (Villers-Cotterêts) behind a creeping barrage and hundreds of tanks —
// the Renault FTs in swarms, Schneiders and Saint-Chamonds — across the high plateau of ripe wheat, the ravines
// cutting it (Vierzy's above all), toward the Soissons–Château-Thierry road that fed the German salient. The
// Germans hold a thin line dug in a hurry: the war of movement is back. Point-mirrored (maps/westernFront.ts): each
// side has its forest edge, its villages on the plateau, the ravine village of Vierzy between them.
import { westernFront } from './westernFront.ts';

export default westernFront({
  id: 'piave', wip: true,
  armies: { nato: ['fr'], pact: ['de'] }, // (the French Tenth Army against the German Ninth: maps/index.js armiesOn)
  name: 'Piave',
  description: '18 July 1918: the French burst out of the Forest of Retz with no warning barrage — Renault light tanks in swarms across ripe wheat, ravines on the plateau, a thin German line dug in a hurry. The war of movement is back.',
  seed: 191807,
  points: [
    { id: 'A', name: 'Forêt de Retz', x: 0, z: 470, owner: 'nato', sector: 'centre' },
    { id: 'B', name: 'Saint-Pierre-Aigle', x: -370, z: 300, owner: null, sector: 'west' },
    { id: 'C', name: 'Longpont', x: -70, z: 390, owner: null, sector: 'centre' },
    { id: 'D', name: 'Dommiers', x: 280, z: 320, owner: null, sector: 'east' },
    { id: 'E', name: 'Chaudun', x: -260, z: 70, owner: null, sector: 'west', radius: 24 },
    { id: 'F', name: 'Vierzy', x: 0, z: 0, owner: null, sector: 'centre', radius: 30 },
    { id: 'G', name: 'Missy-aux-Bois', x: 260, z: -70, owner: null, sector: 'east', radius: 24 },
    { id: 'H', name: 'Berzy-le-Sec', x: -280, z: -320, owner: null, sector: 'west' },
    { id: 'I', name: 'Parcy-Tigny', x: 70, z: -390, owner: null, sector: 'centre' },
    { id: 'J', name: 'Buzancy', x: 370, z: -300, owner: null, sector: 'east' },
    { id: 'K', name: 'Soissons road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
  ],
  // a thin line hastily dug on each side, one belt of wire with gaps — not the trench systems of 1916
  lines: [{ z: 190, wireAt: 20, belts: 1, gapEvery: 55, seed: 71 }],
  front: 120, craters: 0.9, ridge: 7, woods: 0.9,
  ruins: [0.35, 0.12],
  town: { quarters: [[46, 14], [-24, 44]], church: { x: 8, z: -24 } },
  fields: [0.15, 0.55, 0.05, 0.25], // (mostly standing wheat: the harvest was just due)
  theme: { // a clear, hot July day after the night's storm
    fogColor: 0xb4b2a4, fogDensity: 0.0011, skyTop: 0x6a8cae, skyHorizon: 0xd0d2c8, skyBottom: 0x8a8a80,
    sunColor: 0xfff0d6, sunIntensity: 2.0, sunDisk: 0.3, clouds: 0.35, cloudLight: 0xeeeee6, cloudDark: 0x9aa0a4,
    sunDir: [0.4, 0.7, 0.4], hemiSky: 0xc8d2da, hemiGround: 0x6a6040, hemiIntensity: 1.25,
  },
  terrain: { grass: '#5e6a36', grassAlt: '#52602f', dryGrass: '#a89a5a', pasture: '#5c6a38', stubble: '#c0aa62', meadow: '#6a7440', ploughed: '#8a7a5a' },
});
