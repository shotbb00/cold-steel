// The US Navy of 1918 (data/units1918/aef.js), at real size, bow toward +z, on ships1918.js's warship builder and the
// 1945 kit (models/ships1945.js KIT). US Navy grey; the transports in dazzle.
//   New York        Battleship Division Nine with the Grand Fleet: 175 m, ten 14-inch in five twin turrets (two forward,
//                   one amidships, two aft), the two lattice "cage" masts that marked every American dreadnought
//   Wickes          the flush-decker: 95 m, a flush deck rising to a high bow, four thin funnels, four 4-inch, twelve
//                   tubes in four triple mounts at the deck edge, her number on the bow
//   SC-1            the 110-foot submarine chaser: a wooden boat, a 3-inch forward, the Y-gun aft for depth charges
//   L-class         the L-boats at Bantry Bay: 51 m, four bow tubes, a 3-inch on the deck
//   Henderson       a Navy transport: the steamer of ships1918.js in dazzle stripes
//   San Francisco   the old protected cruiser turned minelayer for the North Sea Mine Barrage: two funnels, two
//                   masts with their fighting tops, mine rails along the after deck
import { P, merge } from '../units/geometry.js';
import { KIT } from './ships1945.js';
import { warship, uboat, steamer } from './ships1918.js';

const { box, every, strut, hull, ship, sub, bowNumber, BLACK, GLASS } = KIT;
const USN = { hull: 0x6e767c, deck: 0x857a62, upper: 0x7c848a, gun: 0x737b81, black: BLACK, boat: 0x9a9a90 };

/** A cage mast: two families of struts twisted round each other between a wide foot and a narrower head, hoops to brace them, the fire-control top. */
function cage(c, z, y, h, rb = 3, rt = 1.7) {
  const parts = [];
  const N = 10;
  for (const d of [-1, 1]) for (let i = 0; i < N; i++) {
    const a = (i * 2 * Math.PI) / N;
    parts.push(strut([Math.cos(a) * rb, y, z + Math.sin(a) * rb], [Math.cos(a + d * 1.1) * rt, y + h, z + Math.sin(a + d * 1.1) * rt], 0.07, c.upper));
  }
  for (const t of [0.3, 0.6, 0.9]) parts.push(P.torus((rb + (rt - rb) * t) * 0.84, 0.06, { y: y + h * t, z, rx: Math.PI / 2, color: c.upper }, 14));
  parts.push(P.cyl(2.2, 2, 2.2, { y: y + h + 1.1, z, color: c.upper }, 12), P.box(4, 0.5, 0.2, { y: y + h + 1.5, z: z + 2.05, color: GLASS })); // the top, its windows
  parts.push(P.cyl(0.14, 0.14, 7, { y: y + h + 5.6, z, color: c.upper }, 6), P.box(6, 0.15, 0.15, { y: y + h + 6, z, color: c.upper }));     // the pole above it, its yard
  return parts;
}

/** USS New York: 175 m, ten 14-inch/45 in five twin turrets, 5-inch casemates along the hull, two funnels between the cage masts. */
export const buildNewYork = ship(() => {
  const w = warship(USN, {
    len: 175, beam: 29, fb: 7.5, draft: 8.7, sheer: 2.2,
    turrets: [{ z: 64, w: 9, len: 14, cal: 0.36 }, { z: 51, up: 3, w: 9, len: 14, cal: 0.36 }, { z: -14, aft: true, w: 9, len: 14, cal: 0.36, arc: 3.6 },
      { z: -46, up: 3, aft: true, w: 9, len: 14, cal: 0.36 }, { z: -59, aft: true, w: 9, len: 14, cal: 0.36 }],
    casemates: [-34, 40, 7, 1.8],
    bridge: { z: 38, w: 12, d: 9, h: 6 },
    house: [[-24, 30, 13, 4]],
    casing: 4,
    funnels: [[14, 3.4, 11], [2, 3.4, 11]],
    boats: [[7, -6, 9, 1], [-7, -6, 9, -1]],
  });
  const y = 7.5 + 4;
  return { fixed: merge([w.fixed, ...cage(USN, 30, y, 26), ...cage(USN, -28, y, 22, 2.8, 1.6)]), mounts: w.mounts, torps: w.torps };
});

/** USS Wickes (DD-75): 95 m, flush-decked, four funnels, four 4-inch/50 (forward on the bridge house, aft, two in the waist), four triple tubes. */
const WICKES = { len: 95, beam: 9.4, fb: 3.2, draft: 2.8, sheer: 2.4 };
export const buildWickes = ship(() => {
  const w = warship(USN, {
    ...WICKES, rake: 0.05,
    guns: [{ z: 33, y: 2.2, len: 4.5, cal: 0.09 }, { x: 3, z: -4, y: 1.4, len: 4.5, cal: 0.09, arc: 3 }, { x: -3, z: -4, y: 1.4, aft: true, len: 4.5, cal: 0.09, arc: 3 }, { z: -38, y: 1.8, aft: true, len: 4.5, cal: 0.09 }],
    bridge: { z: 27, w: 5.5, d: 4, h: 3.2 },
    house: [[22, 34, 4.5, 2.2], [-42, -34, 4, 1.8], [-10, 18, 3.2, 1.4]],
    funnels: [[15, 1.05, 6.5], [8.5, 1.05, 6.5], [2, 1.05, 6.5], [-4.5, 1.05, 6.5]],
    fore: { z: 23, h: 15, y: 3.2 },
    main: { z: -28, h: 9 },
    tubeMounts: [[3.3, -14, 3], [-3.3, -14, 3], [3.3, -22, 3], [-3.3, -22, 3]],
    boats: [[3.4, 20, 5, 1]],
  });
  const H = hull(WICKES.len, WICKES.beam, WICKES.fb, WICKES.draft, USN, WICKES.sheer);
  const dc = [-1, 1].map((s) => box(0.9, 1, 4, { x: s * 1.2, y: H.top(-45) + 0.5, z: -45, color: USN.gun })); // the depth-charge racks over the stern
  return { fixed: merge([w.fixed, ...bowNumber(H, '75', 2.2), ...dc]), mounts: w.mounts, torps: w.torps };
});

/** SC-1 (the 110-foot submarine chaser): 33.5 m, a wooden hull, the pilothouse, a 3-inch/23 forward, the Y-gun aft. */
export const buildSubchaser = ship(() => {
  const c = { ...USN, hull: 0x7a8288, deck: 0x8a7a5c };
  const w = warship(c, {
    len: 33.5, beam: 4.5, fb: 1.9, draft: 1.7, sheer: 1.1,
    guns: [{ z: 11.5, len: 2.2, cal: 0.05 }],
    bridge: { z: 5, w: 2.6, d: 2.2, h: 1.6 },
    house: [[-6, 2, 2.4, 1.2]],
    fore: { z: 3, h: 8 },
  });
  const y = 1.9 + 0.1;
  const ygun = [box(0.6, 0.6, 0.6, { y: y + 0.3, z: -13, color: c.gun }),
    ...[-1, 1].map((s) => P.cyl(0.16, 0.16, 1.4, { x: s * 0.5, y: y + 0.9, z: -13, rz: s * 0.7, color: c.gun }, 8)),
    ...[-1, 1].map((s) => P.cyl(0.3, 0.3, 0.6, { x: s * 1.0, y: y + 1.4, z: -13, rz: Math.PI / 2, color: BLACK }, 10))]; // the Y-gun, a charge on each arm
  return { fixed: merge([w.fixed, ...ygun]), mounts: w.mounts, torps: [] };
});

/** An L-class submarine: 51 m, four bow tubes, the 3-inch/23 on the deck forward of the tower. */
export const buildLClass = sub(() => uboat({ ...USN, hull: 0x4c5458, upper: 0x5a6266, deck: 0x40464a }, { len: 51, beam: 5.3, tower: [4.6, 2.6, 3], gunZ: 9, gunLen: 2.4 }));

/** A Navy transport (Henderson, the seized German liners), in dazzle: dark and pale bands slanting along the hull. */
const TRANSPORT = { len: 135, beam: 17, fb: 6.5 };
export const buildTransportUS = ship(() => {
  const c = { ...USN, hull: 0x5a6268, upper: 0x8a9096, funnel: 0x6a7076 };
  const s = steamer(c, { ...TRANSPORT, band: 0x1c1e20 });
  const H = hull(TRANSPORT.len, TRANSPORT.beam, TRANSPORT.fb, 6, c, 1.6);
  const stripes = [];
  for (const side of [-1, 1]) every(-56, 56, 14).forEach((z, i) => {
    const y = TRANSPORT.fb * 0.35;
    stripes.push(P.box(0.08, TRANSPORT.fb * 1.5, 5, { x: side * (H.side(z, y) + 0.05), y, z, rx: (i % 2 ? 0.7 : -0.7), color: i % 2 ? 0x2a2e32 : 0xc8ccd0 }));
  });
  return { fixed: merge([s.fixed, ...stripes]), mounts: s.mounts, torps: [] };
});

/** USS San Francisco (C-5) as a minelayer, 1918: 98 m, two funnels, two masts with their fighting tops, 5-inch guns, the mine rails aft. */
export const buildSanFrancisco = ship(() => warship({ ...USN, hull: 0x666e74 }, {
  len: 98, beam: 15, fb: 4.6, draft: 5.7, sheer: 1.2,
  guns: [{ z: 38, len: 5, cal: 0.11 }, { x: 6, z: 10, len: 5, cal: 0.11, arc: 3 }, { x: -6, z: 10, len: 5, cal: 0.11, arc: 3 }, { z: -24, aft: true, len: 5, cal: 0.11 }],
  bridge: { z: 26, w: 9, d: 6, h: 3.4 },
  house: [[-16, 20, 8, 2.2]],
  funnels: [[8, 2.1, 9], [-4, 2.1, 9]],
  fore: { z: 22, h: 20, topR: 1.4, round: true },
  main: { z: -18, h: 17, topR: 1.2, round: true },
  mineRails: [-46, -28],
  boats: [[5, 0, 7, 1], [-5, 0, 7, -1]],
}));
