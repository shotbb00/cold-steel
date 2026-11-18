// The Suwałki Gap, late summer 2027 (a hypothetical war): the strip of Polish lake country between
// Kaliningrad and Belarus that ties the Baltic states to NATO. Moraine hills, chains of long lakes
// left by the ice, woods on the hummocks, villages with their churches and grain silos, and the
// Via Baltica highway straight up the middle. Russia attacks from the Kaliningrad border (north,
// -z) to cut the highway; NATO holds the south (+z). Three sectors like the Fulda Gap, but the
// dividers are ribbon lakes with dry isthmuses between them instead of wooded ridges. Wind
// turbines, solar fields and a power line on both sides. Not a mirror: each half has its own lakes,
// villages and woods (the Polish side's long lakes run north–south, the far side's lie aslant with its
// big lake far back on the flank), but both get two ribbon lakes splitting the sectors with a dry
// isthmus through each, one big flank lake, the same distances to their points and the same moraine
// swells, so neither side has the better ground.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createLakes } from '../world/Lakes.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const SECTOR_X = 330;
const noise = createNoise2D(2027);
/** The Via Baltica's centre line: a long gentle S-bend through both halves. */
const viaX = (z) => 18 * Math.sin(z * 0.004);

// Each half's lakes. Ribbon lakes split the sectors (x ≈ ±170) with isthmuses at the forward villages'
// row and at the border; a big lake on a flank.
const NATO_LAKES = [
  { x: -170, z: 150, rx: 32, rz: 95, rot: 0.12, depth: 5, seed: 1 },
  { x: -175, z: 425, rx: 28, rz: 68, rot: -0.1, depth: 4, seed: 2 },
  { x: 170, z: 120, rx: 30, rz: 70, rot: -0.15, depth: 4.5, seed: 3 },
  { x: 168, z: 425, rx: 26, rz: 58, rot: 0.2, depth: 4, seed: 4 },
  { x: -440, z: 120, rx: 50, rz: 85, rot: 0.3, depth: 7, seed: 5 },
  { x: 95, z: 370, rx: 22, rz: 16, rot: 0.5, depth: 2.5, seed: 6 },
];
const PACT_LAKES = [
  { x: -150, z: -215, rx: 26, rz: 112, rot: -0.28, depth: 6, seed: 7 },   // a long trough like Hańcza's, aslant
  { x: -205, z: -468, rx: 30, rz: 46, rot: 0.35, depth: 4, seed: 8 },
  { x: 190, z: -150, rx: 40, rz: 58, rot: 0.3, depth: 4.5, seed: 9 },
  { x: 140, z: -405, rx: 24, rz: 70, rot: -0.35, depth: 4, seed: 10 },
  { x: -440, z: -395, rx: 44, rz: 92, rot: 0.15, depth: 7, seed: 11 },
  { x: -70, z: -350, rx: 18, rz: 22, rot: 0.2, depth: 2.5, seed: 12 },
];
const lakes = createLakes({ lakes: [...NATO_LAKES, ...PACT_LAKES] });

function height(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  let h = 3 + fbm(noise, x * 0.004, z * 0.004, 5) * 6;                                     // the broad swells
  h += Math.max(0, ridged(noise, x * 0.011 + 40, z * 0.011, 4) - 0.35) * 9;               // moraine hummocks and kames
  h += fbm(noise, x * 0.045 + 100, z * 0.045, 3) * 0.6;                                    // bumps
  h += smoothstep(500, 620, ax) * (14 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 22); // wooded hills at the edges
  h += smoothstep(560, 680, az) * 18;
  // the highway runs level on a low embankment
  const road = 1 - smoothstep(10, 22, Math.abs(x - viaX(z)));
  h += (3 + fbm(noise, 7, z * 0.004, 3) * 4 - h) * road * 0.85;
  for (const bz of [BASE_Z, -BASE_Z]) h += (3 - h) * smoothstep(28, 15, Math.hypot(x, z - bz)); // the bases
  return lakes.carve(x, z, Math.max(1.4, h));
}

const natoLayout = [{ unit: 'rifles', x: viaX(454) - 8, z: 454, name: '1st Platoon' }];
const pactName = { '1st Platoon': '1-ya Rota' };

const points: ControlPointDef[] = [
  { id: 'A', name: 'Raczki', x: viaX(470), z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Filipów', x: -SECTOR_X, z: 340, owner: null, sector: 'west' },
  { id: 'C', name: 'Jeleniewo', x: viaX(245) + 30, z: 245, owner: null, sector: 'centre' },
  { id: 'D', name: 'Puńsk', x: 365, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Przerośl', x: -300, z: 95, owner: null, sector: 'west', radius: 22 },
  { id: 'F', name: 'Budzisko', x: viaX(-6) + 34, z: -6, owner: null, sector: 'centre', radius: 22 },
  { id: 'G', name: 'Wiżajny', x: 340, z: -95, owner: null, sector: 'east', radius: 22 },
  { id: 'H', name: 'Żytkiejmy', x: -295, z: -245, owner: null, sector: 'west' },
  { id: 'I', name: 'Dubeninki', x: viaX(-220) - 36, z: -220, owner: null, sector: 'centre' },
  { id: 'J', name: 'Gołdap', x: 300, z: -370, owner: null, sector: 'east' },
  { id: 'K', name: 'Krasnoznamensk', x: viaX(-470), z: -470, owner: 'pact', sector: 'centre' },
];

const ASPHALT = 0x3c3d3f;
const SOLAR = [[-82, 105], [420, 175], [-250, -110], [60, -150]]; // solar fields, two each side
export default {
  id: 'suwalki-gap',
  name: 'Suwałki Gap',
  epochs: ['2027'],
  description: 'Polish lake country between Kaliningrad and Belarus: three sectors split by chains of lakes, the Via Baltica up the middle. Cut it, or keep the Baltic states connected.',
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 2027,
  height,
  river: lakes,
  fields: createFields({ seed: 2027, cell: 80 }),

  theme: {
    // a fair late-summer afternoon
    fogColor: 0xa8b4bc,
    fogDensity: 0.0015,
    skyTop: 0x5a7fa6,
    skyHorizon: 0xc2cdd2,
    skyBottom: 0x7a7f78,
    sunColor: 0xfff1d8,
    sunIntensity: 2.3,
    sunDisk: 0.5,
    clouds: 0.45,
    cloudLight: 0xf2f2ee,
    cloudDark: 0x9aa2aa,
    sunDir: [-0.5, 0.62, -0.6],
    hemiSky: 0xc6d4e2,
    hemiGround: 0x4e4a36,
    hemiIntensity: 1.2,
    rimColor: 0xc8d0d8,
    rimIntensity: 0.22,
    terrain: {
      grass: '#5a6a36',
      grassAlt: '#4e6032',
      dryGrass: '#94864e',
      dirt: '#5c4a38',
      rock: '#6e6a60',
      pasture: '#5e6e38',
      ploughed: '#5a4632',
      stubble: '#a8955a',
      meadow: '#6e7a3e',
      farmX: [500, 580],
      farmZ: [560, 640],
      roads: [-SECTOR_X, SECTOR_X], // farm tracks up the side sectors
      roadZ: 540,
      surface(x, z, y) {
        const d = Math.abs(x - viaX(z));
        if (d < 8.5 && Math.abs(z) < 620) return [d < 0.6 ? 0x55575a : ASPHALT, 1]; // the dual carriageway (the median)
        if (d < 11 && Math.abs(z) < 620) return [0x7a7262, 0.8];                   // gravel shoulders
        if (y < 1.1 && lakes.q(x, z) < 1.3) return [0x5c5a3c, smoothstep(1.1, 0.7, y)]; // reedy, muddy shores
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SECTOR_X, 0, SECTOR_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SECTOR_X, 0, SECTOR_X] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: pactName[s.name] ?? s.name })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const onRoad = (x, z, r) => Math.abs(x - viaX(z)) < 12 + r;
    const wet = (x, z, m = 1.25) => lakes.q(x, z) < m;
    const rotors: any[] = [];
    /** fn(m, flip) twice from one seed: m = 1, then -1 for the mirrored copy (multiply x and z). */
    const both = (seed, fn) => { for (const m of [1, -1]) { props.rand = mulberry32(seed); fn(m, m > 0 ? 0 : Math.PI); } };

    // Villages: houses along the street, a farm shed and silos, garden walls; a church in the bigger ones.
    for (const p of points) { // each its own street plan
      props.rand = mulberry32(2700 + Math.round(p.x * 3 + p.z));
      {
        const r = props.rand, X = p.x, Z = p.z;
        const street = p.sector === 'centre' ? 0 : r() * Math.PI; // the centre villages line the highway
        const off = p.sector === 'centre' ? 20 : 0;
        const n = p.radius ? 4 : 6;
        for (let i = 0; i < n; i++) {
          const along = (i - (n - 1) / 2) * 15 + (r() - 0.5) * 3, side = i % 2 ? 1 : -1;
          const [hx, hz] = PropBuilder.local(X, Z, street, side * (off + 10 + r() * 3), along);
          if (wet(hx, hz, 1.4) || onRoad(hx, hz, 4)) continue;
          props.townHouse({ x: hx, z: hz, yaw: street + (side > 0 ? Math.PI / 2 : -Math.PI / 2), width: 9 + r() * 2, depth: 8 + r() * 2, storeys: r() < 0.5 ? 1 : 2, name: ['house', 'farmhouse', 'shop', 'house'][i % 4], damaged: 0 });
          const [gx, gz] = PropBuilder.local(X, Z, street, side * (off + 18 + r() * 2), along);
          props.lowWall({ x: gx, z: gz, yaw: street, length: 9, height: 1, color: [0x8a867c, 0x9a8a72, 0x6e6a62][Math.floor(r() * 3)] });
        }
        const [sx, sz] = PropBuilder.local(X, Z, street, -(off + 34), (r() - 0.5) * 20);
        if (!wet(sx, sz, 1.4) && !onRoad(sx, sz, 14)) {
          props.hall({ x: sx, z: sz, yaw: street + Math.PI / 2, width: 20, depth: 12, height: 6, color: 0x8a8a84, roof: 0x5a3a2e, door: 6, name: 'farm shed' });
          const [tx, tz] = PropBuilder.local(sx, sz, street, 0, 14);
          props.tanks({ x: tx, z: tz, yaw: street, count: 2, radius: 2.4, height: 11, color: 0xb8bab4 });
        }
        if (!p.radius) {
          const [cx, cz] = PropBuilder.local(X, Z, street, off + 30, (r() - 0.5) * 10);
          if (!wet(cx, cz, 1.4) && !onRoad(cx, cz, 12)) props.church({ x: cx, z: cz, yaw: street + Math.PI / 2 });
        }
        const [wx, wz] = PropBuilder.local(X, Z, street, (r() - 0.5) * 8, (r() - 0.5) * 30);
        if (!onRoad(wx, wz, 0) || p.sector !== 'centre') props.wreckCar({ x: wx, z: wz, yaw: street + r() });
      }
    }

    // Cover across the fields, each half its own.
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'wrecks', 'hay', 'fieldwall', 'roadblock'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 260 && tries < 18000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = (rand() * 2 - 1) * (bounds.z - 40);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 30 * 30)) continue;
      if (Math.hypot(x, Math.abs(z) - BASE_Z) < 40 || Math.abs(z) < 6 || nearPoint(x, z, 45) || wet(x, z, 1.5) || onRoad(x, z, 6)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
    }

    // The highway: lane lines, crash barriers in the median, and a checkpoint at the border.
    props.rand = mulberry32(77);
    for (let z = -600; z < 600; z += 12) {
      const a = { x: viaX(z), z }, b = { x: viaX(z + 6), z: z + 6 };
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      for (const o of [-4.2, 4.2]) props.box('plain', a.x + o, terrain.heightAt(a.x + o, z) + 0.02, z + 3, 0.15, 0.04, 5, yaw, 0xd8d8d0); // the dashes
      for (const o of [-8, 8]) props.box('plain', a.x + o, terrain.heightAt(a.x + o, z) + 0.02, z + 6, 0.18, 0.04, 12, yaw, 0xd8d8d0); // edge lines
      props.box('metal', a.x, terrain.heightAt(a.x, z) + 0.6, z + 6, 0.12, 0.3, 12, yaw, 0xa0a4a6);   // the median barrier
    }
    both(505, (m, flip) => {
      props.jersey({ x: (viaX(14) - 3) * m, z: 14 * m, yaw: 0.1 + flip, length: 6 });
      props.jersey({ x: (viaX(20) + 4) * m, z: 20 * m, yaw: -0.1 + flip, length: 6 });
      for (const [hx, hz] of [[-6, 6], [0, 7], [6, 6]]) props.hedgehog({ x: hx * m, z: hz * m });
    });
    // the border fence (razor wire on posts), blown open at the crossings
    const gaps = [[-14, 14], [-SECTOR_X - 14, -SECTOR_X + 14], [SECTOR_X - 14, SECTOR_X + 14], [-176, -160], [160, 176]];
    props.fence({ x0: -bounds.x - 30, x1: bounds.x + 30, z: -1.5, breaches: gaps });

    // Wind turbines on the high ground behind each side, a solar field, the power line.
    for (const [x, z, yaw] of [[-255, 445, 0.5], [250, 470, 0.5], [430, 360, 0.5], [-60, 545, 0.5], [-330, -455, 0.5], [-110, -525, 0.5], [270, -480, 0.5], [455, -300, 0.5]]) {
      rotors.push(props.windTurbine({ x, z, yaw }));
    }
    for (const [fx, fz] of SOLAR) for (let k = 0; k < 6; k++) props.solarRow({ x: fx, z: fz + (k - 2.5) * 5.5, length: 34 });
    both(909, (m) => { // a line behind each front, each on its own course
      let prev: any = null;
      for (let x = -540; x <= 540; x += 72) {
        const X = x, Z = m > 0 ? 395 + x * 0.1 : -415 + x * 0.05 + 22 * Math.sin(x * 0.008);
        if (wet(X, Z, 1.05) || onRoad(X, Z, 4) || nearPoint(X, Z, 20)) continue; // (the wires span the gap)
        const tips = props.pylon({ x: X, z: Z, yaw: Math.atan2(1, 0.1) });
        if (prev) props.wires(prev, tips);
        prev = tips;
      }
    });

    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5a3a);
    props.finish();
    lakes.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x, z) => wet(x, z, 1.02) || onRoad(x, z, 0) || SOLAR.some(([fx, fz]) => Math.abs(x - fx) < 20 && Math.abs(z - fz) < 18) }];
    // woods on the moraine hummocks (each half its own), alders on the shores, open farmland between
    const patch = (x, z) => noise(x * 0.006 + 50.3, z * 0.006 - 30.1) > 0.38 || ridged(noise, x * 0.011 + 40, z * 0.011, 4) > 0.82;
    const forest = (x, z) => {
      const v = lakes.q(x, z);
      if (v < 1.02) return -1;
      if (v < 1.3) return 0.45;
      if (Math.abs(x) > 470) return 0.75;
      return patch(x, z) ? 0.8 : 0;
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 3000, forest, autumn: 0.15 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 9000, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 3, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
        hedges.update(dt, t);
        for (const r of rotors) r.userData.spin.rotation.z -= dt * 0.9;
      },
    };
  },
} satisfies MapDef;
