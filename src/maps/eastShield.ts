// The East Shield at Kuźnica, 2027 (a hypothetical war): the Polish–Belarusian border where Poland has
// been building its "East Shield" — the five-metre steel wall along the line itself, and behind it an
// anti-tank ditch, belts of concrete dragon's teeth and steel hedgehogs, and trench lines with wire,
// broken only where the roads go through. In the middle the Kuźnica–Bruzgi road crossing with its
// terminal halls. NATO holds the Polish side (south); Russia and Belarus attack across the wall from the
// north. Mirrored, so the attackers find the same works — for the defence of their own side. Forest
// and small fields.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { smoothstep } from '../core/math.js';
import { buildSite, commandPost, trenchLine } from './common.js';
import { theme2027, pointsFrom, both, modernVillage, coverSites, vegetation } from './common2027.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const ROADS = [-SIDE_X, 0, SIDE_X];
const DITCH_Z = 70;      // the anti-tank ditch, this far behind the wall on each side
const TEETH_Z = 92;      // the dragon's teeth belt
const TRENCH_Z = 135;    // the trench line
const GAP = 13;          // half-width of the lanes left open for the roads
const noise = createNoise2D(2031);
const onRoad = (x) => ROADS.some((r) => Math.abs(x - r) < GAP);

function height(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  let h = 4 + fbm(noise, x * 0.004, z * 0.004, 5) * 6 + Math.max(0, ridged(noise, x * 0.01, z * 0.01, 3) - 0.45) * 6;
  h += smoothstep(500, 620, ax) * 16 + smoothstep(560, 680, az) * 16;
  h += (4 - h) * (1 - smoothstep(20, 60, az)) * 0.8;                                          // the cleared strip along the wall
  if (!onRoad(x)) h -= 2.6 * (1 - smoothstep(2, 3.5, Math.abs(az - DITCH_Z)));                 // the anti-tank ditch (both sides)
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return Math.max(1.4, h);
}

const points = pointsFrom([
  ['A', 'Sokółka road', 0, 470],
  ['B', 'Chreptowce', -SIDE_X, 330],
  ['C', 'Kuźnica', 0, 230],
  ['D', 'Klimówka', SIDE_X, 270],
  ['E', 'Wołownik', -SIDE_X, 200, { radius: 22 }],
  ['F', 'Kuźnica–Bruzgi crossing', 0, 0, { radius: 26 }],
], ['Bruzgi forest', 'Akolica', 'Bruzgi', 'Lasoŭna', 'Grodno road']);

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
        if (!onRoad(x) && Math.abs(az - DITCH_Z) < 4) return [0x5a4a36, 0.9];          // the ditch's raw earth
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
    for (const f of ['nato', 'pact'] as const) {
      const m = f === 'nato' ? 1 : -1;
      for (const [x0, x1] of [[-470, -SIDE_X - 25], [-SIDE_X + 25, -25], [25, SIDE_X - 25], [SIDE_X + 25, 470]]) {
        const pts: [number, number][] = [];
        for (let x = x0; x <= x1; x += 30) pts.push([x * m, (TRENCH_Z + 6 * Math.sin(x * 0.03)) * m]);
        works.push(...trenchLine(pts, f, { zig: 1.2, wireAt: 22, belts: 1, gapEvery: 60 }));
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x, z, r) => (Math.abs(x) < 8 + r && Math.abs(z) < 620) || Math.abs(Math.abs(z) - DITCH_Z) < 5 + r || Math.abs(z) < 40 + r;

    // the border wall: 5.5 m steel panels with razor wire, breached at the crossing and the forest tracks
    for (let x = -bounds.x - 30; x < bounds.x + 30; x += 3) {
      if (ROADS.some((r) => Math.abs(x + 1.5 - r) < 10) || [-170, 170].some((r) => Math.abs(x - r) < 5)) continue;
      const g = terrain.heightAt(x + 1.5, 0);
      props.box('metal', x + 1.5, g + 2.75, 0, 2.95, 5.5, 0.12, 0, 0x5a5e5c);
      props.box('metal', x + 1.5, g + 5.6, 0, 3, 0.35, 0.35, 0, 0x2a2c2c);
      cover.addBox({ x: x + 1.5, z: 0, yaw: Math.PI / 2, length: 0.2, thickness: 3, height: 5.5, spots: false });
    }
    // the dragon's teeth and hedgehog belts, each side
    both(props, 3101, (m, flip) => {
      const r = props.rand;
      for (let x = -470; x <= 470; x += 4.5) {
        if (onRoad(x)) continue;
        for (const dz of [0, 4.5]) {
          const X = x * m + (dz ? 2.2 : 0) * m, Z = (TEETH_Z + dz) * m, g = terrain.heightAt(X, Z);
          props.box('stone', X, g + 0.5, Z, 1.1, 1.1, 1.1, Math.PI / 4 + flip, 0x8e8c84, 0.6);
          cover.addCylinder({ x: X, z: Z, radius: 0.7, height: 1.1, spots: false });
        }
        if (r() < 0.4) props.hedgehog({ x: x * m, z: (TEETH_Z + 14) * m });
      }
      // the crossing: terminal hall, the canopy over the lanes, the booths, lorries queued on the road
      props.hall({ x: 22 * m, z: 70 * m, yaw: flip, width: 26, depth: 14, height: 6, color: 0xa8a8a2, roof: 0x5a5c60, door: 8, name: 'border terminal' });
      for (const x of [-8, 0, 8]) props.column({ x: x * m, z: 52 * m, radius: 0.35, height: 5 });
      props.box('metal', 0, terrain.heightAt(0, 52 * m) + 5.6, 52 * m, 22, 0.4, 14, 0, 0xc8c8c4);
      for (const x of [-5, 5]) props.box('plaster', x * m, terrain.heightAt(x * m, 46 * m) + 1.3, 46 * m, 2, 2.6, 2, 0, 0xd8d4c8);
      for (let i = 0; i < 6; i++) props.wreckCar({ x: (3 + (i % 2) * 4) * m, z: (110 + i * 12) * m, yaw: flip });
      for (const x of [-10, 10]) props.jersey({ x: x * m, z: 36 * m, yaw: flip, length: 6 });
      // watchtowers on the wall
      for (const x of [-420, -250, 250, 420]) props.tower({ x: x * m, z: 8 * m, concrete: true });
    });
    for (const p of points) {
      if (p.z <= 0 || p.id === 'A' || p.id === 'F') continue;
      both(props, 3150 + Math.round(p.x + p.z), (m, flip) => modernVillage(props, p, m, flip, { skip, n: 5, church: p.id === 'C' }));
    }
    coverSites(props, rand, bounds, (x, z) => z > TRENCH_Z + 30 && Math.hypot(x, z - BASE_Z) > 40 && !nearPoint(x, z, 40) && !skip(x, z, 6), 90, undefined, buildSite);
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5a3a);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x, z) => Math.abs(z) < TRENCH_Z + 30 || Math.abs(x) < 8 }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 6000, hedges: 6000, broadleaf: 0.4,
      forest: (x, z) => (Math.abs(x) > 440 || noise(x * 0.006 + 90, z * 0.006) > 0.25 || noise(-x * 0.006 + 90, -z * 0.006) > 0.25 ? 0.9 : 0),
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
