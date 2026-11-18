// The East Shield at Kuźnica, 2027 (a hypothetical war): the Polish–Belarusian border where Poland has
// been building its "East Shield" — the five-metre steel wall along the line itself, and behind it an
// anti-tank ditch, belts of concrete dragon's teeth and steel hedgehogs, and trench lines with wire,
// broken only where the roads go through. In the middle the Kuźnica–Bruzgi road crossing with its
// terminal halls. NATO holds the Polish side (south); Russia and Belarus attack across the wall from the
// north. Not a mirror: Belarus has dug its own line on its side — a ditch further back, a belt of steel
// hedgehogs instead of the concrete teeth, its trench line deeper still, its own terminal at Bruzgi and
// wooden towers — so each side has a ditch, an obstacle belt and a trench line of the same worth in
// front of villages at the same distances. Forest and small fields.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost, trenchLine } from './common.js';
import { theme2027, modernVillage, coverSites, vegetation } from './common2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const ROADS = [-SIDE_X, 0, SIDE_X];
const DITCH_Z = 70;      // the East Shield's anti-tank ditch, this far behind the wall
const TEETH_Z = 92;      // its dragon's teeth belt
const TRENCH_Z = 135;    // its trench line
const DITCH_ZP = 96, HOGS_Z = 60, TRENCH_ZP = 158; // the Belarusian line: ditch, hedgehog belt, trenches
/** Metres from (x, z) to its side's ditch line. */
const ditchD = (z) => (z > 0 ? Math.abs(z - DITCH_Z) : Math.abs(z + DITCH_ZP));
const GAP = 13;          // half-width of the lanes left open for the roads
const noise = createNoise2D(2031);
const onRoad = (x) => ROADS.some((r) => Math.abs(x - r) < GAP);

function height(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  let h = 4 + fbm(noise, x * 0.004, z * 0.004, 5) * 6 + Math.max(0, ridged(noise, x * 0.01, z * 0.01, 3) - 0.45) * 6;
  h += smoothstep(500, 620, ax) * 16 + smoothstep(560, 680, az) * 16;
  h += (4 - h) * (1 - smoothstep(20, 60, az)) * 0.8;                                          // the cleared strip along the wall
  if (!onRoad(x)) h -= 2.6 * (1 - smoothstep(2, 3.5, ditchD(z)));                              // each side's anti-tank ditch
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return Math.max(1.4, h);
}

const pt = (id: string, name: string, x: number, z: number, sector: 'west' | 'centre' | 'east', o: { radius?: number } = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  pt('A', 'Sokółka road', 0, 470, 'centre'),
  pt('B', 'Chreptowce', -350, 300, 'west'),
  pt('C', 'Kuźnica', 40, 235, 'centre'),
  pt('D', 'Klimówka', 310, 290, 'east'),
  pt('E', 'Wołownik', -285, 195, 'west', { radius: 22 }),
  pt('F', 'Kuźnica–Bruzgi crossing', 0, 0, 'centre', { radius: 26 }),
  pt('G', 'Bruzgi forest', 360, -200, 'east', { radius: 22 }),
  pt('H', 'Akolica', -360, -255, 'west'),
  pt('I', 'Bruzgi', -45, -225, 'centre'),
  pt('J', 'Lasoŭna', 290, -345, 'east'),
  pt('K', 'Grodno road', 0, -470, 'centre'),
];

const layout = [{ unit: 'rifles', x: 12, z: 454, name: '1st Platoon' }];

export default {
  id: 'east-shield',
  name: 'East Shield',
  epochs: ['2027'],
  description: 'The Polish–Belarusian border at Kuźnica: the steel wall, the anti-tank ditch, dragon’s teeth and trench lines of the East Shield, broken only where the roads go through.',
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 2031,
  height,
  fields: createFields({ seed: 2031, cell: 64 }),

  theme: theme2027({
    clouds: 0.7, sunIntensity: 1.9, fogDensity: 0.0017,
    terrain: {
      roads: ROADS, roadZ: 560,
      surface(x, z) {
        const az = Math.abs(z);
        if (Math.abs(x) < 7 && az < 620) return [0x3c3d3f, 1];                        // the main road to the crossing
        if (az < 40) return [0x6a5c44, 0.75];                                           // the raked strip along the wall
        if (!onRoad(x) && ditchD(z) < 4) return [0x5a4a36, 0.9];                        // the ditch's raw earth
        return null;
      },
    },
  }),

  bases: { nato: { x: 0, z: BASE_Z, entries: ROADS }, pact: { x: 0, z: -BASE_Z, entries: ROADS } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  /** The trench lines with their wire, each side's own, left open where the roads go through. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) { // (each line drawn left to right as its owner faces the enemy)
      const m = f === 'nato' ? 1 : -1;
      const runs = f === 'nato' ? [[-470, -SIDE_X - 25], [-SIDE_X + 25, -25], [25, SIDE_X - 25], [SIDE_X + 25, 470]] : [[-470, -SIDE_X - 30], [-SIDE_X + 20, -40], [30, SIDE_X - 35], [SIDE_X + 20, 470]];
      for (const [x0, x1] of runs) {
        const pts: [number, number][] = [];
        for (let x = x0; x <= x1; x += 30) pts.push(f === 'nato' ? [x, TRENCH_Z + 6 * Math.sin(x * 0.03)] : [-x, -(TRENCH_ZP + 10 * Math.sin(x * 0.017 + 1) - 0.02 * x)]);
        works.push(...trenchLine(pts, f, { zig: f === 'nato' ? 1.2 : 1.6, wireAt: f === 'nato' ? 22 : 18, belts: 1, gapEvery: f === 'nato' ? 60 : 75 }));
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x, z, r) => (Math.abs(x) < 8 + r && Math.abs(z) < 620) || ditchD(z) < 5 + r || Math.abs(z) < 40 + r;

    // the border wall: 5.5 m steel panels with razor wire, breached at the crossing and the forest tracks
    for (let x = -bounds.x - 30; x < bounds.x + 30; x += 3) {
      if (ROADS.some((r) => Math.abs(x + 1.5 - r) < 10) || [-170, 170].some((r) => Math.abs(x - r) < 5)) continue;
      const g = terrain.heightAt(x + 1.5, 0);
      props.box('metal', x + 1.5, g + 2.75, 0, 2.95, 5.5, 0.12, 0, 0x5a5e5c);
      props.box('metal', x + 1.5, g + 5.6, 0, 3, 0.35, 0.35, 0, 0x2a2c2c);
      cover.addBox({ x: x + 1.5, z: 0, yaw: Math.PI / 2, length: 0.2, thickness: 3, height: 5.5, spots: false });
    }
    // the Polish side: two rows of concrete dragon's teeth, hedgehogs behind them
    props.rand = mulberry32(3101);
    for (let x = -470; x <= 470; x += 4.5) {
      if (onRoad(x)) continue;
      for (const dz of [0, 4.5]) {
        const X = x + (dz ? 2.2 : 0), Z = TEETH_Z + dz, g = terrain.heightAt(X, Z);
        props.box('stone', X, g + 0.5, Z, 1.1, 1.1, 1.1, Math.PI / 4, 0x8e8c84, 0.6);
        cover.addCylinder({ x: X, z: Z, radius: 0.7, height: 1.1, spots: false });
      }
      if (props.rand() < 0.4) props.hedgehog({ x, z: TEETH_Z + 14 });
    }
    // the Belarusian side: a deep belt of steel hedgehogs, three staggered rows, between the wall and its ditch
    for (let x = -470; x <= 470; x += 5) {
      if (onRoad(x)) continue;
      for (const [dz, dx] of [[0, 0], [5, 2.5], [10, 1]]) if (props.rand() < 0.85) props.hedgehog({ x: x + dx, z: -(HOGS_Z + dz) });
    }
    // the crossing: each side's terminal hall, the canopy over the lanes, the booths, lorries queued on the road
    props.hall({ x: 22, z: 70, yaw: 0, width: 26, depth: 14, height: 6, color: 0xa8a8a2, roof: 0x5a5c60, door: 8, name: 'border terminal' });
    props.hall({ x: -30, z: -118, yaw: Math.PI, width: 34, depth: 16, height: 7, color: 0xb4aa98, roof: 0x4e5a4e, door: 8, name: 'Bruzgi terminal' });
    for (const x of [-8, 0, 8]) props.column({ x, z: 52, radius: 0.35, height: 5 });
    props.box('metal', 0, terrain.heightAt(0, 52) + 5.6, 52, 22, 0.4, 14, 0, 0xc8c8c4);
    for (const x of [-12, -4, 4, 12]) props.column({ x, z: -78, radius: 0.4, height: 6 });
    props.box('metal', 0, terrain.heightAt(0, -78) + 6.6, -78, 30, 0.4, 12, 0, 0xb8bcc0);
    for (const x of [-5, 5]) props.box('plaster', x, terrain.heightAt(x, 46) + 1.3, 46, 2, 2.6, 2, 0, 0xd8d4c8);
    for (const x of [-9, 0, 9]) props.box('plaster', x, terrain.heightAt(x, -70) + 1.3, -70, 2, 2.6, 2, 0, 0xc8ccb8);
    for (let i = 0; i < 6; i++) props.wreckCar({ x: 3 + (i % 2) * 4, z: 110 + i * 12, yaw: 0 });
    for (let i = 0; i < 8; i++) props.wreckCar({ x: -3 - (i % 2) * 4, z: -140 - i * 11, yaw: Math.PI });
    for (const x of [-10, 10]) props.jersey({ x, z: 36, yaw: 0, length: 6 });
    for (const x of [-14, 6]) props.jersey({ x, z: -30, yaw: Math.PI + 0.2, length: 6 });
    // watchtowers on the wall (Polish concrete ones) and behind it (Belarusian timber ones)
    for (const x of [-420, -250, 250, 420]) props.tower({ x, z: 8, concrete: true });
    for (const x of [-390, -150, 190, 455]) props.tower({ x, z: -14, concrete: false });
    for (const p of points) { // each village its own
      if (p.id === 'A' || p.id === 'F' || p.id === 'K') continue;
      props.rand = mulberry32(3150 + Math.round(p.x * 3 + p.z));
      modernVillage(props, p, 1, 0, { skip, n: 5, church: p.id === 'C' || p.id === 'I' });
    }
    coverSites(props, rand, bounds, (x, z) => (z > TRENCH_Z + 30 || z < -TRENCH_ZP - 30) && Math.hypot(x, Math.abs(z) - BASE_Z) > 40 && !nearPoint(x, z, 40) && !skip(x, z, 6), 180, undefined, buildSite, false);
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5a3a);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x, z) => (z > -TRENCH_ZP - 30 && z < TRENCH_Z + 30) || Math.abs(x) < 8 }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 6000, hedges: 6000, broadleaf: 0.4,
      forest: (x, z) => (Math.abs(x) > 440 || noise(x * 0.006 + 460.6, z * 0.006 - 284.2) > 0.05 ? 0.9 : 0) // (as much forest on each half),
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
