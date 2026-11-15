// The Dogger Bank, 24 January 1915: open sea in the middle of the North Sea, no land in sight — the
// shallow bank where the fishing fleets worked. Hipper's battlecruisers out on a raid, Beatty's waiting for
// them on a clear winter morning; a stern chase at full speed, the big guns at the longest ranges of the war.
// No cover anywhere: speed, range and the light decide it.
import { northSea } from './northSea.ts';

export default northSea({
  id: 'doggerBank',
  name: 'Dogger Bank',
  description: 'January 1915, open sea in the middle of the North Sea: no land, no cover, a clear winter morning. The battlecruisers meet at long range — speed and gunnery decide it.',
  seed: 1915_01,
  floor: 18,   // (the bank: shallow, the swell short and steep)
  conditions: { time: 'day', weather: 'clear' },
  sky: { fogDensity: 0.00022, sunDir: [0.3, 0.3, 0.8], sunIntensity: 1.8, clouds: 0.45, skyHorizon: 0xc4ccd2 },
  points: [
    { id: 'A', name: 'Beatty\'s squadron', x: 0, z: -2050, owner: 'nato', sector: 'centre', radius: 150 },
    { id: 'B', name: 'The Tail End', x: -1250, z: -150, owner: null, sector: 'west', radius: 180 },
    { id: 'C', name: 'Dogger Bank', x: 0, z: 0, owner: null, sector: 'centre', radius: 200 },
    { id: 'D', name: 'The Outer Silver Pit', x: 1250, z: 150, owner: null, sector: 'east', radius: 180 },
    { id: 'K', name: 'Hipper\'s squadron', x: 0, z: 2100, owner: 'pact', sector: 'centre', radius: 150 },
  ],
  spawns: {
    nato: [{ unit: 'cruiser', x: 0, z: -2200, facing: 0 }, { unit: 'lightCruiser', x: -400, z: -2050, facing: 0 }, { unit: 'destroyer', x: 400, z: -2050, facing: 0 }],
    pact: [{ unit: 'cruiser', x: 0, z: 2200, facing: Math.PI }, { unit: 'lightCruiser', x: -400, z: 2050, facing: Math.PI }, { unit: 'destroyer', x: 400, z: 2050, facing: Math.PI }],
  },
});
