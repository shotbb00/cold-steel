// The Dover Strait at night, 20–21 April 1917 (and the raid of February 1918): the Channel at its narrowest,
// the white cliffs of Dover along the west, the dunes and Cap Gris-Nez along the east, the Varne bank in the
// middle. The Flanders flotillas come down from Zeebrugge in the dark to break the Dover barrage; the Dover
// Patrol's destroyers come out of the harbour after them — Broke and Swift ramming and boarding at close range.
import { shore } from '../world/Sea.js';
import { northSea } from './northSea.ts';

const CHALK = 0xe2e0d4;

export default northSea({
  id: 'doverStrait',
  name: 'Dover Strait',
  description: 'The Channel at its narrowest, at night: the white cliffs of Dover on one side, the French dunes on the other. The Flanders flotillas raid down the strait in the dark; the Dover Patrol comes out after them.',
  seed: 1917_04,
  floor: 32,
  conditions: { time: 'night', weather: 'clear' },
  land(x, z, n) {
    // England along the west: the chalk cliffs, high and sheer, the harbour cut into them south of the middle
    const west = -2050 + (n(x, z, 0.002) - 0.5) * 160 + (Math.abs(z + 700) < 180 ? -(180 - Math.abs(z + 700)) * 0.9 : 0);
    let h = shore(west - x, 110, 0.75 + (n(x, z, 0.01) - 0.5) * 0.4, 6);
    // France along the east: low dunes, Cap Gris-Nez a blunt headland north of the middle
    const east = 2100 + (n(x + 50, z, 0.002) - 0.5) * 180 - Math.max(0, 260 - Math.abs(z - 600) * 0.5);
    h = Math.max(h, shore(x - east, 40, 0.2 + (n(x, z, 0.01) - 0.5) * 0.2, 50));
    // the Varne and the Ridge: sandbanks lying along the strait, awash at low water
    for (const [bx, bz, len] of [[-350, -150, 700], [500, 500, 600]]) h = Math.max(h, -3 - Math.hypot((x - bx) / 110, (z - bz) / (len / 2)) * 4);
    return h;
  },
  surface(x, z, y) {
    if (x < 0 && y > 6) return [y > 40 ? 0x6a7a48 : CHALK, 1];   // the chalk face, the downs on top
    if (x > 0 && y > 3) return [0xbcb08a, 1];                     // the dunes
    return null;
  },
  points: [
    { id: 'A', name: 'Dover Patrol', x: -600, z: -2050, owner: 'nato', sector: 'centre', radius: 150 },
    { id: 'B', name: 'Dover', x: -1550, z: -550, owner: null, sector: 'west', radius: 160 },
    { id: 'C', name: 'The Varne', x: 0, z: 100, owner: null, sector: 'centre', radius: 170 },
    { id: 'D', name: 'Cap Gris-Nez', x: 1550, z: 650, owner: null, sector: 'east', radius: 160 },
    { id: 'K', name: 'Flanders flotillas', x: 600, z: 2100, owner: 'pact', sector: 'centre', radius: 150 },
  ],
  bases: { nato: { x: -600, z: -2300, entries: [-500, 0, 500] }, pact: { x: 600, z: 2300, entries: [-500, 0, 500] } },
  spawns: {
    nato: [{ unit: 'destroyer', x: -600, z: -2200, facing: 0 }, { unit: 'destroyer', x: -900, z: -2050, facing: 0 }, { unit: 'frigate', x: -300, z: -2050, facing: 0 }, { unit: 'ptBoat', x: -600, z: -1850, facing: 0 }],
    pact: [{ unit: 'destroyer', x: 600, z: 2200, facing: Math.PI }, { unit: 'destroyer', x: 900, z: 2050, facing: Math.PI }, { unit: 'frigate', x: 300, z: 2050, facing: Math.PI }, { unit: 'ptBoat', x: 600, z: 1850, facing: Math.PI }],
  },
  decorate(props, height, rand) {
    // Dover: the harbour's breakwaters, the town in the gap, the castle on the cliff
    props.box('stone', -1980, 1.5, -620, 10, 3, 420, 0.25, 0x7a786e);
    props.box('stone', -1880, 1.5, -900, 10, 3, 300, -0.5, 0x7a786e);
    for (let i = 0; i < 30; i++) {
      const x = -2300 + rand() * 250, z = -820 + rand() * 240;
      const y = height(x, z);
      if (y > 2 && y < 25) props.townHouse({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 8, storeys: 2, damaged: 0 });
    }
    props.church({ x: -2250, z: -420, yaw: Math.PI / 2 });                  // (the castle's church on the heights)
    props.tower({ x: 2130, z: 620, concrete: false });                     // the Gris-Nez light
    props.tower({ x: -2120, z: -1500, concrete: false });                  // the South Foreland light
  },
});
