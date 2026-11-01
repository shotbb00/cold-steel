// A military lorry from a few numbers, in parts (geometry.js parts), built from the tail (z = 0)
// forward to the bumper (z = length), on the ground (y = 0). The towing trucks (support.js
// towTruck) and the trucks units drive (LARS, RM-70, the radars, ambulances, jammers) share it.
//   bonnet   'round'  Ural / GAZ / ZiL: the long rounded bonnet ahead of the cab, the wings over the wheels
//            'square' M35 / Unimog: a shorter, flat-sided bonnet
//            'cabover' MAN / W50 / Tatra: the cab over the engine, nothing ahead of it
//   body     'cargo'  the bed with planked sides and the canvas tilt over its bows
//            'box'    a box body (shelter, ambulance, workshop) with its door and ladder at the back
//            'flat'   just the bed (a launcher, a crane on it)
//            'none'   the chassis behind the cab bare
//   axles    the wheels' z (the front one under the cab or bonnet); r their radius
//   tyres    draw the wheels (false when the vehicle kit spins its own: support.js wheeled)
//   armour   an armoured cab: sloped front plate, slits instead of windows (RM-70)
import { P, merge, pair, loft } from '../units/geometry.js';
import { stationHull } from './vehicleCommon.js';

const STEEL = 0x2b2d28;
const RUBBER = 0x1f201c;
const GLASS = 0x1a1d1c;
const CANVAS = 0x5a5c42;
const LAMP = 0x9a9a88;

export function truck({
  length = 6.5, width = 2.4, color, dark, camo = 0, bonnet = 'round', body = 'cargo',
  axles = null, r = 0.5, tyres = true, armour = false, cabLen = 1.6, cabH = 1.3, bodyH = 1.9,
}) {
  const C = camo ? { camo: 1 } : {};
  const hw = width / 2;
  const railY = r + 0.3;                    // the chassis rails' centre
  const deck = railY + 0.3;                 // the top of the subframe: floors start here
  const nose = bonnet === 'cabover' ? 0 : bonnet === 'round' ? 1.45 : 1.0;
  const cabFront = length - 0.15 - nose;    // the cab's front face
  const cabRear = cabFront - cabLen;
  const cabTop = deck + cabH;
  axles ??= [length - 0.75 - (bonnet === 'cabover' ? 0.15 : 0.35), 1.85, 0.75];
  const parts = [];
  const add = (...p) => parts.push(...p);

  // ---- chassis: rails, crossmembers, the subframe, bumper, hooks
  add(...pair((s) => P.box(0.15, 0.24, length - 0.2, { x: s * 0.42, y: railY, z: length / 2, color: STEEL })));
  for (const z of [0.15, ...axles, length - 0.3]) add(P.box(0.84, 0.12, 0.12, { y: railY, z, color: STEEL }));
  add(P.box(width * 0.72, 0.16, length - 0.6, { y: railY + 0.2, z: length / 2 - 0.1, color: dark }));
  add(P.box(width - 0.1, 0.2, 0.14, { y: railY, z: length - 0.08, color: STEEL }));                   // the front bumper
  add(...pair((s) => P.box(0.08, 0.14, 0.18, { x: s * 0.6, y: railY - 0.12, z: length + 0.02, color: STEEL }))); // tow hooks
  add(P.box(0.9, 0.16, 0.12, { y: railY - 0.06, z: 0.06, color: STEEL }), P.box(0.14, 0.14, 0.3, { y: railY - 0.1, z: -0.1, color: STEEL })); // rear crossmember, pintle hook
  add(...pair((s) => P.box(0.14, 0.08, 0.06, { x: s * 0.42, y: railY + 0.16, z: 0.11, color: 0x6a2a20 }))); // tail lamps on the rails' ends

  // ---- wheels, axles hung from the rails, arches over them
  for (const z of axles) {
    add(P.cyl(0.075, 0.075, width - 0.45, { y: r, z, rz: Math.PI / 2, color: STEEL }, 8));
    add(P.sphere(0.17, { y: r, z, sy: 0.8, color: STEEL }, 10, 6));
    add(...pair((s) => P.box(0.14, railY - r + 0.05, 0.16, { x: s * 0.42, y: (railY + r) / 2, z, color: STEEL })));
    if (tyres) {
      add(...pair((s) => P.cyl(r, r, 0.32, { x: s * (hw - 0.22), y: r, z, rz: Math.PI / 2, color: RUBBER, surf: 'rubber' }, 16)));
      add(...pair((s) => P.cyl(r * 0.5, r * 0.5, 0.34, { x: s * (hw - 0.22), y: r, z, rz: Math.PI / 2, color: dark }, 12))); // the hubs
    }
    const front = z === axles[0];
    if (!(front && bonnet === 'round')) { // (the round bonnet's wings make their own)
      // the mudguard: a flat top and a sloped piece front and back, on a bracket to the frame
      const top = r * 2 + 0.08;
      add(...pair((s) => P.box(0.5, 0.05, r * 1.3, { x: s * (hw - 0.22), y: top, z, color: dark })));
      add(...pair((s) => P.box(0.5, 0.05, r * 0.7, { x: s * (hw - 0.22), y: top - r * 0.3, z: z + r * 0.85, rx: 0.8, color: dark })));
      add(...pair((s) => P.box(0.5, 0.05, r * 0.7, { x: s * (hw - 0.22), y: top - r * 0.3, z: z - r * 0.85, rx: -0.8, color: dark })));
      add(...pair((s) => P.box(Math.max(0.05, hw - 0.5 - 0.42), 0.08, 0.1, { x: s * ((hw - 0.47 + 0.42) / 2), y: top - 0.04, z, color: STEEL })));
    }
  }

  // ---- the bonnet and its wings
  if (bonnet === 'round') {
    const z0 = cabFront, z1 = length - 0.15;
    add(loft([[0, deck - 0.05, z0, 0.62, 0.62, 2.6], [0, deck - 0.05, z0 + nose * 0.6, 0.6, 0.56, 2.6], [0, deck - 0.05, z1, 0.55, 0.42, 2.4]], { color, ...C, warp: (v) => { if (v.y < deck - 0.05) v.y = deck - 0.05; } }, 14));
    add(P.box(1.05, 0.5, 0.05, { y: deck + 0.2, z: z1 + 0.02, color: GLASS }));                       // the grille…
    for (const x of [-0.4, -0.24, -0.08, 0.08, 0.24, 0.4]) add(P.box(0.04, 0.48, 0.04, { x, y: deck + 0.2, z: z1 + 0.04, color: dark }));
    // the rounded wings over the front wheels, the headlights set into them
    add(...pair((s) => loft([[s * (hw - 0.25), deck - 0.15, axles[0] - r * 1.1, 0.27, 0.05, 2], [s * (hw - 0.25), deck + 0.12, axles[0], 0.27, 0.22, 2], [s * (hw - 0.25), deck - 0.1, axles[0] + r * 1.15, 0.27, 0.12, 2]], { color, ...C }, 10)));
    add(...pair((s) => P.box(0.16, 0.5, 0.5, { x: s * (hw - 0.45), y: deck - 0.15, z: axles[0], color: dark }))); // inner wing to the frame
    add(...pair((s) => P.cyl(0.11, 0.11, 0.1, { x: s * (hw - 0.55), y: deck + 0.08, z: z1 - 0.1, rx: Math.PI / 2, color: dark }, 12)));
    add(...pair((s) => P.cyl(0.085, 0.085, 0.02, { x: s * (hw - 0.55), y: deck + 0.08, z: z1 - 0.04, rx: Math.PI / 2, color: LAMP }, 12)));
  } else if (bonnet === 'square') {
    const z0 = cabFront, z1 = length - 0.15;
    add(stationHull([[z0, [[0, deck - 0.05], [0.6, deck - 0.05], [0.6, deck + 0.5], [0.52, deck + 0.58], [0, deck + 0.6]]],
      [z1, [[0, deck - 0.05], [0.58, deck - 0.05], [0.58, deck + 0.44], [0.5, deck + 0.52], [0, deck + 0.54]]]], { color, ...C }));
    add(P.box(1.0, 0.44, 0.04, { y: deck + 0.22, z: z1 + 0.02, color: GLASS }));
    for (const x of [-0.36, -0.18, 0, 0.18, 0.36]) add(P.box(0.04, 0.42, 0.03, { x, y: deck + 0.22, z: z1 + 0.04, color: dark }));
    add(...pair((s) => P.cyl(0.1, 0.1, 0.1, { x: s * 0.45, y: deck + 0.05, z: z1 + 0.02, rx: Math.PI / 2, color: dark }, 12)));   // the headlights in the bonnet front
    add(...pair((s) => P.cyl(0.08, 0.08, 0.02, { x: s * 0.45, y: deck + 0.05, z: z1 + 0.08, rx: Math.PI / 2, color: LAMP }, 12)));
  }

  // ---- the cab
  const ch = cabTop - 0.12;
  add(stationHull([[cabRear, [[0, deck], [hw - 0.05, deck], [hw - 0.05, ch - 0.1], [hw - 0.17, cabTop], [0, cabTop]]],
    [cabFront, [[0, deck], [hw - 0.05, deck], [hw - 0.05, ch - 0.1], [hw - 0.17, cabTop - (armour ? 0.35 : 0.02)], [0, cabTop - (armour ? 0.35 : 0.02)]]]], { color, ...C }));
  if (bonnet === 'cabover') { // the cab's own front: grille low down, the lamps, a step
    add(P.box(width - 0.5, 0.3, 0.04, { y: deck + 0.3, z: cabFront + 0.01, color: GLASS }));
    for (const x of [-0.6, -0.3, 0, 0.3, 0.6]) add(P.box(0.04, 0.28, 0.03, { x, y: deck + 0.3, z: cabFront + 0.03, color: dark }));
    add(...pair((s) => P.cyl(0.1, 0.1, 0.05, { x: s * (hw - 0.35), y: deck + 0.15, z: cabFront + 0.02, rx: Math.PI / 2, color: LAMP }, 12)));
  }
  if (armour) { // sloped front plate and vision slits (the RM-70's cab)
    add(P.box(width - 0.12, 0.05, 0.75, { y: cabTop - 0.2, z: cabFront - 0.25, rx: 0.5, color, ...C }));
    add(...[-0.45, 0.45].map((x) => P.box(0.6, 0.04, 0.1, { x, y: cabTop - 0.2, z: cabFront - 0.2, rx: 0.5, color: GLASS })));
    add(...pair((s) => P.box(0.03, 0.1, 0.45, { x: s * (hw - 0.03), y: deck + cabH * 0.65, z: cabFront - 0.6, color: GLASS })));
  } else {
    // the split windscreen and its pillars, the side windows, the door seams and handles
    add(...pair((s) => P.box(hw - 0.22, cabH * 0.38, 0.03, { x: s * (hw / 2 - 0.02), y: deck + cabH * 0.7, z: cabFront + 0.005, color: GLASS })));
    add(P.box(0.06, cabH * 0.42, 0.04, { y: deck + cabH * 0.7, z: cabFront + 0.01, color }));
    add(...pair((s) => P.box(0.03, cabH * 0.34, cabLen * 0.42, { x: s * (hw - 0.04), y: deck + cabH * 0.7, z: cabFront - cabLen * 0.32, color: GLASS })));
    add(...pair((s) => P.box(0.02, cabH * 0.95, 0.02, { x: s * (hw - 0.04), y: deck + cabH / 2, z: cabFront - cabLen * 0.6, color: dark })));
    add(...pair((s) => P.box(0.03, 0.03, 0.12, { x: s * (hw - 0.02), y: deck + cabH * 0.45, z: cabFront - cabLen * 0.55, color: STEEL })));
  }
  // mirrors on their arms, the step under each door, the cab's roof light
  add(...pair((s) => P.box(0.3, 0.03, 0.03, { x: s * (hw + 0.1), y: deck + cabH * 0.75, z: cabFront - 0.1, color: STEEL })));
  add(...pair((s) => P.box(0.04, 0.26, 0.16, { x: s * (hw + 0.25), y: deck + cabH * 0.75, z: cabFront - 0.1, color: GLASS })));
  add(...pair((s) => P.box(0.3, 0.05, 0.4, { x: s * (hw - 0.17), y: deck - 0.15, z: cabFront - cabLen * 0.55, color: STEEL })));
  add(...pair((s) => P.box(0.05, 0.22, 0.06, { x: s * (hw - 0.32), y: deck - 0.06, z: cabFront - cabLen * 0.55, color: STEEL })));
  // fuel tank under the right door, battery box under the left, the exhaust stack behind the cab
  add(P.cyl(0.24, 0.24, 1.0, { x: hw - 0.42, y: railY - 0.05, z: cabRear - 0.45, rx: Math.PI / 2, color: dark }, 12));
  add(P.box(0.4, 0.35, 0.5, { x: -(hw - 0.45), y: railY - 0.02, z: cabRear - 0.4, color: dark }));
  add(P.cyl(0.06, 0.06, 1.3, { x: -(hw - 0.35), y: cabTop - 0.2, z: cabRear - 0.08, color: STEEL }, 8));
  add(P.box(0.3, 0.06, 0.06, { x: -(hw - 0.52), y: cabTop - 0.8, z: cabRear - 0.08, color: STEEL }));

  // ---- behind the cab
  const bodyFront = cabRear - 0.12;
  const bodyLen = bodyFront - 0.05;
  if (body === 'cargo' || body === 'flat') {
    add(P.box(width, 0.1, bodyLen, { y: deck + 0.03, z: bodyLen / 2 + 0.05, color: dark }));           // the bed
    if (body === 'cargo') {
      add(...pair((s) => P.box(0.05, 0.5, bodyLen, { x: s * (hw - 0.02), y: deck + 0.33, z: bodyLen / 2 + 0.05, color, ...C })));
      add(P.box(width, 0.5, 0.05, { y: deck + 0.33, z: 0.07, color, ...C }), P.box(width, 0.5, 0.05, { y: deck + 0.33, z: bodyFront - 0.02, color, ...C }));
      for (const y of [deck + 0.2, deck + 0.42]) add(...pair((s) => P.box(0.06, 0.025, bodyLen, { x: s * (hw + 0.005), y, z: bodyLen / 2 + 0.05, color: dark }))); // the planks
      // the canvas tilt over its bows: rounded on top, its ribs standing proud
      const tiltY = deck + 0.58;
      const tiltH = Math.max(0.8, cabTop + 0.2 - tiltY);
      add(loft(Array.from({ length: 6 }, (_, i) => [0, tiltY, 0.07 + (bodyLen - 0.05) * (i / 5), hw - 0.03, tiltH, 3.2]), { color: CANVAS, warp: (v) => { if (v.y < tiltY) v.y = tiltY; } }, 16));
      for (let i = 1; i < 4; i++) add(loft([[0, tiltY, 0.07 + (bodyLen * i) / 4 - 0.04, hw - 0.01, tiltH + 0.02, 3.2], [0, tiltY, 0.07 + (bodyLen * i) / 4 + 0.04, hw - 0.01, tiltH + 0.02, 3.2]], { color: 0x4f5238, warp: (v) => { if (v.y < tiltY) v.y = tiltY; } }, 16));
      add(P.cyl(r * 0.95, r * 0.95, 0.28, { y: deck + 0.62 + r, z: bodyFront + 0.06, color: RUBBER, surf: 'rubber' }, 14)); // spare wheel behind the cab
    }
  } else if (body === 'box') {
    const top = deck + bodyH;
    add(stationHull([[0.05, [[0, deck], [hw + 0.02, deck], [hw + 0.02, top - 0.1], [hw - 0.08, top], [0, top]]],
      [bodyFront, [[0, deck], [hw + 0.02, deck], [hw + 0.02, top - 0.1], [hw - 0.08, top], [0, top]]]], { color, ...C }));
    add(P.box(0.9, bodyH * 0.85, 0.04, { x: -0.35, y: deck + bodyH * 0.45, z: 0.03, color: dark }));    // the rear door…
    add(P.box(0.04, 0.04, 0.12, { x: 0.05, y: deck + bodyH * 0.45, z: 0.0, color: STEEL }));             // …its handle
    add(...[0.15, 0.35, 0.55].map((y) => P.box(0.5, 0.04, 0.06, { x: -0.35, y: deck - y, z: -0.02, color: STEEL }))); // the ladder…
    add(...pair((s) => P.box(0.04, 0.65, 0.04, { x: -0.35 + s * 0.25, y: deck - 0.33, z: -0.02, color: STEEL }))); // …its rails
    add(...pair((s) => P.box(0.03, 0.3, 0.5, { x: s * (hw + 0.035), y: deck + bodyH * 0.65, z: bodyFront * 0.6, color: GLASS }))); // side windows
    add(P.box(0.5, 0.12, 0.5, { y: top + 0.06, z: bodyFront * 0.5, color: dark }));                       // a roof vent
  }
  // where things are, for whoever puts something on it (a launcher, an antenna, red crosses)
  parts.layout = { deck, cabFront, cabRear, cabTop, bodyFront, top: deck + bodyH, hw, axles };
  return parts;
}

/**
 * A truck centred on its unit for the vehicle kit, whose own wheels (support.js wheeled) spin:
 * { geo, layout (z centred), wheels: the axles' z and the track for wheeled() }.
 */
export function truckUnit(o) {
  const parts = truck({ ...o, tyres: false });
  const L = o.length ?? 6.5;
  const lay = parts.layout;
  const zc = (z) => z - L / 2;
  return {
    parts: parts.map((g) => g.translate(0, 0, -L / 2)),
    layout: { ...lay, cabFront: zc(lay.cabFront), cabRear: zc(lay.cabRear), bodyFront: zc(lay.bodyFront), rear: zc(0.05), axles: lay.axles.map(zc) },
    track: lay.hw - 0.22,
  };
}
