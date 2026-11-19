// 2027's sea-drone tender (data/units2027/ships.js droneBoat), bow toward +z, on the 1945 / 1985 ship kits: an
// offshore supply vessel's hull, 52 × 12 m — the bridge block forward, the long open after deck with the
// explosive USVs (5.5 m, Magura V5-sized) in their cradles, the crane that swings them over the side, the
// A-frame at the stern; a remote gun on the bridge roof. The USVs in the water: systems/Drones.js.
import { P, merge } from '../units/geometry.js';
import { KIT } from './ships1945.js';
import { KIT85 } from './ships1985.js';

const { box, strut, ship, BLACK } = KIT;
const { hull, house, lattice, radome } = KIT85;
const NAVY = { hull: 0x7d848a, deck: 0x484d52, upper: 0x899096, gun: 0x899096, black: BLACK, boat: 0x899096 };
const RUS = { hull: 0x627079, deck: 0x46494c, upper: 0x71808a, gun: 0x6c7a84, black: BLACK, boat: 0x9a9e98 };
const USV = 0x3c4248;

/** One USV in its cradle on deck at (x, y, z): the low wedge hull, the hump over its engine and radio. */
export const usvParts = (x, y, z, color = USV) => [
  box(1.5, 0.55, 4.2, { x, y: y + 0.55, z: z - 0.5, color }),
  box(1.2, 0.4, 1.4, { x, y: y + 0.62, z: z + 2.1, rx: 0.25, color }),                                                  // the wedge bow
  box(0.8, 0.3, 1.2, { x, y: y + 0.95, z: z - 1.2, color: 0x2a2e32 }),
  box(1.7, 0.3, 0.3, { x, y: y + 0.15, z: z - 1.8, color: BLACK }), box(1.7, 0.3, 0.3, { x, y: y + 0.15, z: z + 0.8, color: BLACK }), // the cradle
];

const tender = (c) => ship(() => {
  const fb = 3, len = 52, beam = 12;
  const H = hull(len, beam, fb, 4.2, c, 1.4, { fittings: false });
  const deck = H.top(-5);
  const fixed = merge([
    ...H.parts,
    ...house(c, 0, fb, 14, 10, 3, 12), ...house(c, 0, fb + 3, 15, 9, 2.6, 9, 1.2),  // the bridge block
    ...lattice(c, 0, fb + 5.6, 15, 4, 2.4, [radome(0.8)]),
    ...[-12, -6, 0].flatMap((z) => [-2.6, 2.6].flatMap((x) => usvParts(x, deck, z))),                                    // six USVs on the after deck
    P.cyl(0.5, 0.6, 3, { x: 4.6, y: deck + 1.5, z: 5, color: c.upper }, 10), strut([4.6, deck + 3, 5], [1.5, deck + 6.5, -6], 0.22, c.upper), // the crane
    strut([-4.5, deck, -24], [-3, deck + 6, -25], 0.3, c.upper), strut([4.5, deck, -24], [3, deck + 6, -25], 0.3, c.upper), box(6.4, 0.5, 0.5, { y: deck + 6.1, z: -25, color: c.upper }), // the A-frame
  ]);
  return { fixed, mounts: [{ geo: merge([P.cyl(0.4, 0.45, 0.5, { y: 0.25, color: c.gun }, 10), box(0.7, 0.6, 0.9, { y: 0.8, color: c.gun }), P.cyl(0.05, 0.05, 1.6, { y: 0.85, z: 1.2, rx: Math.PI / 2, color: BLACK }, 6)]), at: [0, fb + 5.6, 11], arc: 5 }] };
});
export const buildUsvTender = tender(NAVY);
export const buildUsvTenderRu = tender(RUS);
