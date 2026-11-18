// Soissons, 18 July 1918: the Second Battle of the Marne turns. Before dawn, with no preparatory bombardment, Mangin's
// Tenth Army bursts out of the Forest of Retz (Villers-Cotterêts) behind a creeping barrage and hundreds of tanks —
// the Renault FTs in swarms, Schneiders and Saint-Chamonds — across the high plateau of ripe wheat, the ravines
// cutting it (Vierzy's above all), toward the Soissons–Château-Thierry road that fed the German salient. The
// Germans hold a thin line dug in a hurry: the war of movement is back. Not mirrored but fair (maps/westernFront.ts):
// each side has a forest edge at its back, a plateau and a ravine of its own, villages as near; Vierzy in its hollow between.
import { westernFront } from './westernFront.ts';

export default westernFront({
  id: 'soissons',
  armies: { nato: ['fr'], pact: ['de'] }, // (the French Tenth Army against the German Ninth: maps/index.js armiesOn)
  name: 'Soissons',
  description: '18 July 1918: the French burst out of the Forest of Retz with no warning barrage — Renault light tanks in swarms across ripe wheat, ravines on the plateau, a thin German line dug in a hurry. The war of movement is back.',
  seed: 191807,
  points: [
    { id: 'A', name: 'Forêt de Retz', x: 0, z: 470, owner: 'nato', sector: 'centre' },
    { id: 'B', name: 'Saint-Pierre-Aigle', x: -340, z: 330, owner: null, sector: 'west' },
    { id: 'C', name: 'Longpont', x: -90, z: 400, owner: null, sector: 'centre' },
    { id: 'D', name: 'Dommiers', x: 290, z: 300, owner: null, sector: 'east' },
    { id: 'E', name: 'Chaudun', x: -270, z: 55, owner: null, sector: 'west', radius: 24 },
    { id: 'F', name: 'Vierzy', x: 15, z: -10, owner: null, sector: 'centre', radius: 30 },
    { id: 'G', name: 'Missy-aux-Bois', x: 220, z: -60, owner: null, sector: 'east', radius: 24 },
    { id: 'H', name: 'Berzy-le-Sec', x: -270, z: -310, owner: null, sector: 'west' },
    { id: 'I', name: 'Parcy-Tigny', x: 40, z: -385, owner: null, sector: 'centre' },
    { id: 'J', name: 'Buzancy', x: 390, z: -300, owner: null, sector: 'east' },
    { id: 'K', name: 'Soissons road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
  ],
  // Vierzy down in its hollow; the Chaudun plateau answered by the Missy plateau and the rise by Parcy, the Savières ravine by the Crise's
  hills: [[30, -40, 100, -4], [-250, 150, 190, 8], [290, -110, 140, 7], [70, -200, 120, 5], [150, 250, 120, -6], [-180, -250, 120, -6]],
  woodsAt: [[-260, 490, 120], [260, -470, 110], [-270, 55, 50], [220, -60, 46]], // (the edge of the Forest of Retz; the woods over Buzancy)
  // a thin line hastily dug on each side, one belt of wire with gaps — not the trench systems of 1916
  lines: [{ z: 190, wireAt: 20, belts: 1, gapEvery: 55, seed: 71 }],
  front: 120, craters: 0.9, ridge: 7, woods: 0.9,
  ruins: [0.35, 0.12],
  town: { quarters: [[62, 2], [-14, 30]], church: { x: 44, z: -50 } },
  fields: [0.15, 0.55, 0.05, 0.25], // (mostly standing wheat: the harvest was just due)
  theme: { // a clear, hot July day after the night's storm
    fogColor: 0xb4b2a4, fogDensity: 0.0011, skyTop: 0x6a8cae, skyHorizon: 0xd0d2c8, skyBottom: 0x8a8a80,
    sunColor: 0xfff0d6, sunIntensity: 2.0, sunDisk: 0.3, clouds: 0.35, cloudLight: 0xeeeee6, cloudDark: 0x9aa0a4,
    sunDir: [0.4, 0.7, 0.4], hemiSky: 0xc8d2da, hemiGround: 0x6a6040, hemiIntensity: 1.25,
  },
  terrain: { grass: '#5e6a36', grassAlt: '#52602f', dryGrass: '#a89a5a', pasture: '#5c6a38', stubble: '#c0aa62', meadow: '#6a7440', ploughed: '#8a7a5a' },
});
