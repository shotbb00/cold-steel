// The Dogger Bank, 24 January 1915: open sea in the middle of the North Sea, no land in sight. Hipper's
// battlecruisers came out to raid the bank's fishing fleets; Beatty's, warned by Room 40, met them at dawn at the
// bank's south-eastern edge, and Hipper turned for home. A stern chase south-east at full speed, the big guns at
// the longest ranges of the war: Blücher, last in the German line, was battered to a stop and sunk; Lion took a
// shell in her feed tanks and fell out, and a false periscope report turned the British away — Hipper got home.
// The field lies along the line of the chase, corner to corner: the British come from the north-west off the bank,
// the Germans flee toward the south-east and the Bight. The bank is the shallow half of the map on the British
// side (13 m of water over it), shoaling to the Tail End at its eastern tip (7 m, the short steep sea of the
// shallows); the German half is the deeper water off the bank, the Outer Silver Pit's trough at its southern
// edge (80 m). No cover anywhere: speed, range and the light decide it.
// Fair by the sailing routes (cold-steel-map-briefs seapath): open water, so every zone lies on the line square
// across the chase, as near one squadron as the other — the Tail End, the water where Blücher fell behind and
// sank, and the edge of the Silver Pit. Laid out at full size by widenSea (maps/index.js): the places below are
// the widened ones.
import { northSea } from './northSea.ts';

/** The homes as widenSea leaves them (it doubles a base and moves that side's home zone and ships by half of it). */
const BASES = { nato: { x: -4420, z: -1290 }, pact: { x: 3120, z: 4290 } };
const at = (f: 'nato' | 'pact', x: number, z: number) => ({ x: x - BASES[f].x / 2, z: z - BASES[f].z / 2 });
const CHASE: [number, number] = [0.8, 0.6];                  // the line of the chase, north-west to south-east
const HEAD = Math.atan2(CHASE[0], CHASE[1]);                 // (a ship's facing: 0 is +z)
const TAIL: [number, number] = [-2077, 3429];                // the Tail End of the bank
const PIT: [number, number] = [1015, -751];                  // the edge of the Outer Silver Pit
const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** A side's three ships round its home: the flagship astern, the others either side across the line. */
const squadron = (f: 'nato' | 'pact', x: number, z: number, units: string[]) => {
  const k = f === 'nato' ? 1 : -1, face = f === 'nato' ? HEAD : HEAD + Math.PI;
  return units.map((unit, i) => {
    const across = [0, -400, 400][i], back = i ? 0 : 150;
    return { unit, ...at(f, x - CHASE[0] * back * k - CHASE[1] * across, z - CHASE[1] * back * k + CHASE[0] * across), facing: face };
  });
};

export default northSea({
  id: 'doggerBank',
  name: 'Dogger Bank',
  description: 'January 1915, open sea in the middle of the North Sea: Beatty\'s battlecruisers come off the shallow bank after Hipper\'s, and the Germans run south-east for home. No land, no cover, a clear winter morning — speed and gunnery at the longest ranges decide it.',
  seed: 1915_01,
  floor: 80,   // (the Outer Silver Pit's trough: the rest of the bed is raised by land below)
  conditions: { time: 'day', weather: 'clear' },
  sky: { fogDensity: 0.00022, sunDir: [-0.55, 0.25, -0.75], sunIntensity: 1.7, clouds: 0.35, skyHorizon: 0xc8ced2, sunColor: 0xffe8c8 },   // (the low winter sun in the south-east, ahead of the chase)
  land(x, z, n) {
    const c = x * CHASE[0] + z * CHASE[1];                                   // along the chase (+ south-east)
    const bank = smooth(1300, -300, c + (n(x, z, 0.0015) - 0.5) * 900);     // the bank's south-eastern edge: a long ragged slope
    let h = -38 + bank * 25 + (n(x + 300, z, 0.003) - 0.5) * 3;              // 38 m off the bank, 13 m on it
    const t = Math.hypot((x - TAIL[0]) * 0.8, z - TAIL[1]);
    h = Math.max(h, -7 - smooth(0, 1300, t) * 6 + (n(x, z, 0.01) - 0.5) * 1.2);   // the Tail End: the shoalest of it, 7 m
    const p = Math.hypot((x - PIT[0]) * 0.55, (z - PIT[1]) * 1.1 + (x - PIT[0]) * 0.4);
    return h - (1 - smooth(300, 1500, p)) * 40;                              // the Silver Pit: a steep-sided trough, 80 m
  },
  // the British field off the bank's edge behind Beatty, the German one across the way home to the Bight (each side knows its gap)
  minefields: [
    { owner: 'nato', x: -3300, z: -350, w: 1100, d: 100, count: 36, yaw: 0.93, gaps: [120], gap: 160 },
    { owner: 'pact', x: 2100, z: 3350, w: 1100, d: 100, count: 36, yaw: 0.93, gaps: [-100], gap: 160 },
  ],
  bases: {
    nato: { x: BASES.nato.x / 2, z: BASES.nato.z / 2, entries: [-400, 0, 400] },
    pact: { x: BASES.pact.x / 2, z: BASES.pact.z / 2, entries: [-400, 0, 400] },
  },
  points: [
    { id: 'A', name: 'Beatty\'s battlecruisers', ...at('nato', -4300, -1200), owner: 'nato', sector: 'west', radius: 150 },
    { id: 'B', name: 'The Tail End', x: TAIL[0], z: TAIL[1], owner: null, sector: 'west', radius: 200 },
    { id: 'C', name: 'Where Blücher fell', x: -472, z: 1259, owner: null, sector: 'centre', radius: 190 },
    { id: 'D', name: 'The Outer Silver Pit', x: PIT[0], z: PIT[1], owner: null, sector: 'east', radius: 190 },
    { id: 'K', name: 'Hipper\'s battlecruisers', ...at('pact', 3000, 4200), owner: 'pact', sector: 'east', radius: 150 },
  ],
  spawns: {
    nato: squadron('nato', -4300, -1200, ['cruiser', 'lightCruiser', 'destroyer']),
    pact: squadron('pact', 3000, 4200, ['cruiser', 'lightCruiser', 'destroyer']),
  },
});
