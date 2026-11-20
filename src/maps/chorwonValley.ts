// The Chorwon Valley, autumn 1985 (the big field, 1.0 × 1.12 km): the old invasion road to Seoul, south of the DMZ —
// the war that never came, the North Korean invasion of 1985, breaking through where it came in 1950. The valley floor
// is the Chorwon lava plain: flat rice paddies, harvested (soft: vehicles wallow, map.soft), between the steep wooded
// ridges of the Iron Triangle — Goam-san and Sniper Ridge in the south, White Horse Hill and Triangle Hill in the
// north. Across the middle the Hantan has cut its gorge 9 m down into the basalt: sheer walls (map.steep: men climb,
// vehicles cannot) with two bridges (Seungil, Taebong) and the ford under the Goseokjeong pavilion, a road cut down to
// each. The ROK's defence lines lie across the valley floor: in the south a concrete anti-tank wall with its drop-block
// gates over the roads, in the north a belt of dragon's teeth the KPA has already broken through; both block tanks
// everywhere but the road gaps. Every point is on a road and the roads keep to the valleys (the ridges are for men).
// South Korea (with the US 2nd Infantry Division) holds the south (+z), the KPA comes from the north.
// Fairness: not a mirror — the gorge bends its own way, the bridges and the ford are not opposite one another, the
// ridges' spurs, roads and villages are each half's own — but each side has two dug-in hills on its flanks of the same
// height, a road to each crossing, one obstacle line with gaps at its roads across its half of the valley floor, and
// its points at about the same distances (measured: tools/map_fairness.py). No runway: the paddies are cut up by the
// walls, the teeth and the gorge (airfields: [], the aircraft come in from the map edge).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildVillage, commandPost } from './common.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const PLAIN = 9;        // the lava plain's level; the Hantan's gorge is cut down from it to the water (0)
const HW = 11;          // the Hantan's half-width
const noise = createNoise2D(1985_41);

// ---- the Hantan in its gorge, across the middle
const chan = (x: number) => 6 + 22 * Math.sin(x * 0.0055 + 0.8) + 9 * Math.sin(x * 0.014 + 2);
const CROSS = [
  { name: 'Seungil bridge', x: -30, kind: 'bridge', width: 14 },
  { name: 'Taebong bridge', x: 270, kind: 'bridge', width: 14 },
  { name: 'Goseokjeong ford', x: -300, kind: 'ford', width: 18 },
];
const river = createRiver({ paths: [chan], halfWidth: HW, level: 0, depth: 2.6, valley: HW + 8, crossings: CROSS.map((c) => ({ ...c, channel: 0 })) });
const cz = (x: number) => Math.round(chan(x));

// ---- roads: up each sector to its crossing (straight over it), the laterals each half its own
const ROADS: number[][][] = [
  [[0, 530], [10, 400], [70, 245], [-10, 150], [-30, 85], [-30, -35], [-60, -130], [-30, -260], [-10, -400], [0, -530]], // Route 87: Galmal – Seungil bridge – Dongsong – Woljeong-ri
  [[0, 470], [-180, 420], [-330, 300], [-310, 160], [-300, 45], [-300, -80], [-335, -170], [-350, -300], [-200, -420], [0, -470]], // the west road over the ford
  [[0, 470], [180, 420], [320, 320], [295, 180], [270, 75], [270, -35], [250, -75], [300, -200], [330, -330], [180, -430], [0, -470]], // the Gimhwa road over the Taebong bridge
  [[-330, 300], [70, 245]], [[70, 245], [320, 320]],            // south: behind the wall
  [[-300, 45], [-30, 85]], [[-30, 85], [270, 75]],              // south: along the gorge
  [[-300, -80], [-50, -105]], [[-50, -105], [250, -75]],        // north: along the gorge
  [[-350, -300], [-30, -260]], [[-30, -260], [330, -330]],      // north: behind the teeth
];
function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function roadDist(x: number, z: number) {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Galmal', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Goam-san', x: -330, z: 300, owner: null, sector: 'west', radius: 24 },
  { id: 'C', name: 'Jitaeri', x: 70, z: 245, owner: null, sector: 'centre' },
  { id: 'D', name: 'Sniper Ridge', x: 320, z: 320, owner: null, sector: 'east', radius: 24 },
  { id: 'E', name: 'Goseokjeong', x: -282, z: 58, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Seungil bridge', x: -14, z: cz(-30) + 48, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Gimhwa', x: 262, z: -110, owner: null, sector: 'east', radius: 28 },
  { id: 'H', name: 'White Horse Hill', x: -350, z: -300, owner: null, sector: 'west', radius: 24 },
  { id: 'I', name: 'Dongsong', x: -30, z: -260, owner: null, sector: 'centre' },
  { id: 'J', name: 'Triangle Hill', x: 330, z: -330, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Woljeong-ri', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
// the dug-in hills on each side's flanks: [x, z, radius, height]
const HILLS = [[-330, 300, 72, 24], [320, 320, 68, 24], [-350, -300, 70, 24], [330, -330, 72, 24]];
const BIG_HILLS = { nato: [[-330, 300], [320, 320]], pact: [[-350, -300], [330, -330]] };

// ---- the obstacle lines across the valley floor
const WALL_Z = (x: number) => 175 + 10 * Math.sin(x * 0.009 + 0.5);    // the ROK's concrete anti-tank wall
const TEETH_Z = (x: number) => -175 - 12 * Math.sin(x * 0.011 + 2.1);  // the dragon's teeth (north)

/** Low ground (0): along the roads, round the points and bases; 1 up on the ridges. */
function lowD(x: number, z: number) {
  let d = roadDist(x, z) - 14;
  for (const p of points) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - 60);
  for (const bz of [BASE_Z, -BASE_Z]) d = Math.min(d, Math.hypot(x, z - bz) - 70);
  return d;
}
/** The Iron Triangle's ridges: along both sides of the valley (each its own line) and the spurs out into it. */
function mass(x: number, z: number) {
  const west = smoothstep(260, 400, -x + 40 * Math.sin(z * 0.006 + 1.2) + 20 * Math.sin(z * 0.017));
  const east = smoothstep(270, 410, x + 35 * Math.sin(z * 0.007 + 0.3) + 25 * Math.cos(z * 0.015));
  const spurs = smoothstep(0.12, 0.38, fbm(noise, x * 0.004 + 71.3, z * 0.004 - 33.9, 3));
  return Math.max(west, east, spurs * 0.55); // (the spurs lower than the ridges)
}
const mountK = (x: number, z: number) => mass(x, z) * smoothstep(10, 90, lowD(x, z));
function hillH(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) h += a * Math.exp(-((x - hx) ** 2 + (z - hz) ** 2) / (r * r));
  return h;
}
/** The rice paddies: the flat valley floor, away from ridges, hills, roads and the gorge. */
function paddyK(x: number, z: number) {
  if (roadDist(x, z) < 8 || Math.abs(z - chan(x)) < HW + 20 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 40)) return 0;
  return smoothstep(0.08, 0.02, mountK(x, z)) * smoothstep(2, 0.5, hillH(x, z)) * smoothstep(BOUNDS.x + 5, BOUNDS.x - 30, Math.abs(x));
}

function height(x: number, z: number) {
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  let h = PLAIN + n * 1.6 + hillH(x, z);
  const mk = mountK(x, z);
  if (mk > 0) h += mk * (24 + ridged(noise, x * 0.008 + 3, z * 0.008, 4) * 52) * (x < 0 ? 1 + 0.5 * Math.sin(z * 0.005 - 2.2) : 1 + 0.25 * Math.sin(z * 0.005 + 0.9)); // (the west ridge highest in the north, the east one in the south)
  const pk = paddyK(x, z);
  if (pk > 0) h += (PLAIN + Math.round(n * 5) * 0.3 - h) * pk;                      // the paddies: terraced flats
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, Math.abs(x)) * (25 + ridged(noise, x * 0.01, z * 0.01, 3) * 30);
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 18;
  for (const bz of [BASE_Z, -BASE_Z]) h += (PLAIN - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  // the gorge: sheer basalt walls down to the water, a road cut down to each crossing
  const dz = Math.abs(z - chan(x));
  const near = CROSS.some((c) => Math.abs(x - c.x) < 60);
  const w = HW + 9 + (near ? (1 - smoothstep(10, 24, roadDist(x, z))) * 70 : 0);
  h = 0.9 + (h - 0.9) * smoothstep(HW + 2, w, dz);
  return river.carve(x, z, h);
}

const paddyC = gridCache((x: number, z: number) => paddyK(x, z), BOUNDS);
const soft = (x: number, z: number, foot: boolean) => { const pk = paddyC(x, z); return pk <= 0.05 ? 1 : 1 - pk * (foot ? 0.25 : 0.5); };
/** Oak, pine and chestnut on the ridges and the hills' flanks. */
const woodsK = (x: number, z: number) => Math.max(smoothstep(0.08, 0.3, mountK(x, z)), smoothstep(6, 14, hillH(x, z)) * 0.7)
  * smoothstep(4, 12, roadDist(x, z)) * (points.some((p) => Math.hypot(p.x - x, p.z - z) < 28) ? 0 : 1);
const woodsC = gridCache(woodsK, BOUNDS);
const bund = (x: number, z: number) => {
  const u = x + z * 0.1, v = z - x * 0.07;
  return Math.min(Math.abs(((u % 30) + 30) % 30 - 15), Math.abs(((v % 22) + 22) % 22 - 11)) > 13.8;
};
const onObstacle = (x: number, z: number) => roadDist(x, z) < 10 || mountK(x, z) > 0.05 || hillH(x, z) > 4;

export default {
  id: 'chorwon-valley',
  name: 'Chorwon Valley',
  description: 'The Iron Triangle, autumn 1985: the North Korean invasion comes down the old road to Seoul. Harvested paddies on the lava plain between steep wooded ridges, the Hantan in its basalt gorge, the ROK’s anti-tank wall and dragon’s teeth across the valley.',
  epochs: ['1985'],
  region: 'korea',
  airfields: [], // (no strip on the paddies between the walls, the teeth and the gorge: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['rok', 'us'], pact: ['kpa'] }, // (the ROK Army's 6th Division and the US 2nd Infantry Division against the Korean People's Army)
  sides: { nato: 'South Korea', pact: 'North Korea' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985,
  height,
  steep: 0.6, // (the gorge's walls and the ridges: vehicles keep to the roads)
  soft,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: (x: number, z: number) => woodsC(x, z) * 0.85,

  theme: {
    // a cold clear autumn morning, the ridges turning
    fogColor: 0xb8bec2, fogDensity: 0.0011,
    skyTop: 0x4a74a6, skyHorizon: 0xccd2d6, skyBottom: 0x7a7e74,
    sunColor: 0xffecd2, sunIntensity: 1.9, sunDisk: 0.4,
    clouds: 0.3, cloudLight: 0xf0f0ec, cloudDark: 0x9aa0a8,
    sunDir: [0.45, 0.45, 0.75],
    hemiSky: 0xc4d0de, hemiGround: 0x5a4e36, hemiIntensity: 1.25,
    rimColor: 0xd0d6dc, rimIntensity: 0.22,
    terrain: {
      grass: '#6c6a3a', grassAlt: '#5e6236', dryGrass: '#a49058', dirt: '#6a5038', rock: '#4e4c4a',
      pasture: '#6a6a3a', ploughed: '#5a4632', stubble: '#b49c5e', meadow: '#7a7444',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (roadDist(x, z) < 4) return [0x8a8070, 0.85];                                     // the road
        const dz = Math.abs(z - chan(x));
        if (dz < HW + 12 && y > 1.6) return [0x3a3836, 0.85];                                 // the gorge's black basalt walls
        const pk = paddyC(x, z);
        if (pk > 0.3) {
          if (bund(x, z)) return [0x5e5a36, 0.8];                                            // the bunds, grassed
          return [noise(x * 0.05, z * 0.05) > 0.5 ? 0x5a5a48 : 0xb8a066, pk * 0.85];          // rice stubble, a few fields still wet
        }
        if (y > PLAIN + 30) return [0x5a5652, smoothstep(0.1, 0.5, noise(x * 0.03, z * 0.03)) * 0.6]; // rock on the crests
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-40, 0, 40] }, pact: { x: 0, z: -BASE_Z, entries: [-40, 0, 40] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon', facing: Math.PI }],
    pact: [{ unit: 'rifles', x: 0, z: -BASE_Z + 18, name: '1st Platoon', facing: 0 }],
  },

  // trenches and MG nests round each side's flank hills (the ROK's dug for years, the KPA's dug overnight)
  battlefield() {
    const works: any[] = [];
    for (const [f, m] of [['nato', 1], ['pact', -1]] as const) {
      for (const [hx, hz] of BIG_HILLS[f]) {
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2 + (m > 0 ? 0.4 : 0.9), x = hx + Math.cos(ang) * 30, z = hz + Math.sin(ang) * 30;
          if (roadDist(x, z) < 6) continue;
          works.push({ kind: a % 2 ? 'mgNest' : 'trench', x, z, yaw: Math.atan2(Math.cos(ang), Math.sin(ang)), faction: f });
        }
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    river.build(scene, terrain);
    props.rand = mulberry32(1985_42);

    // ---- the anti-tank wall: 3 m of concrete across the valley floor, a drop-block gate over each road through it
    const gates: number[] = [];
    for (let x = -490; x <= 490; x += 6) {
      const z = WALL_Z(x);
      if (onObstacle(x, z)) { if (roadDist(x, z) < 10 && !gates.some((g) => Math.abs(g - x) < 30)) gates.push(x); continue; }
      const g = Math.min(terrain.heightAt(x - 3, z), terrain.heightAt(x + 3, z));
      const yaw = Math.atan2(WALL_Z(x + 3) - WALL_Z(x - 3), 6);
      props.box('stone', x, g + 1.3, z, 6.1, 3.2, 1.4, -yaw, 0x9a978e);
      cover.addBox({ x, z, yaw: -yaw, length: 6.1, thickness: 1.4, height: 3, spots: false });
    }
    for (const gx of gates) { // (the blocks wait on top, charged to drop onto the road)
      let best = gx;
      for (let dx = -12; dx <= 12; dx++) if (roadDist(gx + dx, WALL_Z(gx + dx)) < roadDist(best, WALL_Z(best))) best = gx + dx;
      const z = WALL_Z(best), g = terrain.heightAt(best, z);
      for (const s of [-1, 1]) { props.box('stone', best + s * 7.5, g + 3, z, 2.2, 6.4, 2.2, 0, 0x9a978e); cover.addBox({ x: best + s * 7.5, z, yaw: 0, length: 2.2, thickness: 2.2, height: 6, spots: false }); }
      props.box('stone', best, g + 6.6, z, 17, 1.6, 2.2, 0, 0x8e8b82);
    }
    // ---- the dragon's teeth: two staggered rows of concrete pyramids, gaps at the roads
    for (let x = -490; x <= 490; x += 4.5) {
      for (const dz of [0, 4.5]) {
        const X = x + (dz ? 2.2 : 0), Z = TEETH_Z(X) - dz;
        if (onObstacle(X, Z)) continue;
        props.box('stone', X, terrain.heightAt(X, Z) + 0.5, Z, 1.2, 1.2, 1.2, Math.PI / 4, 0x8e8c84, 0.6);
        cover.addCylinder({ x: X, z: Z, radius: 0.75, height: 1.1, spots: false });
      }
    }

    // ---- Goseokjeong: the pavilion on the gorge's rim over the ford
    { const x = -262, z = 40, g = terrain.heightAt(x, z);
      for (const [dx, dz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) props.box('plain', x + dx, g + 1.6, z + dz, 0.4, 3.2, 0.4, 0, 0x8a2e22);
      props.box('plain', x, g + 3.4, z, 7.4, 0.5, 7.4, 0, 0x3e5a4e);
      props.box('plain', x, g + 3.9, z, 5, 0.6, 5, 0, 0x2e3a36); }
    // ---- Galmal (new Chorwon) and Gimhwa: low town houses on a grid either side of the road
    for (const [px, pz, n, seed] of [[0, 430, 10, 1], [262, -110, 14, 2]] as const) {
      const r = mulberry32(1985_43 + seed);
      for (let i = 0; i < n * 2; i++) {
        const x = px + (r() - 0.5) * 140, z = pz + (r() - 0.5) * 90;
        if (roadDist(x, z) < 10 || Math.hypot(x - px, z - pz) < 18 || Math.hypot(x, Math.abs(z) - BASE_Z) < 40 || mountK(x, z) > 0.05) continue;
        props.flatHouse({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 4, depth: 7 + r() * 2, storeys: r() < 0.3 ? 2 : 1, name: 'house' });
      }
    }
    // ---- the villages round the other points, farmsteads and straw stacks out on the paddies (each half its own dice)
    for (const p of points) if ('CIBDHJ'.includes(p.id)) buildVillage(props, p, 9700 + Math.round(p.x * 3 + p.z), 1);
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_44 + m);
      const r = props.rand;
      for (let i = 0; i < 60; i++) {
        const x = (r() * 2 - 1) * 460, z = (40 + r() * 440) * m;
        if (paddyC(x, z) < 0.5 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 40) || Math.abs(z - WALL_Z(x)) < 14 || Math.abs(z - TEETH_Z(x)) < 14) continue;
        if (r() < 0.25) props.house({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9, depth: 6, height: 2.8 });
        else props.hayBales({ x, z, yaw: r(), count: 2 + Math.floor(r() * 3) });
      }
      for (const [hx, hz] of BIG_HILLS[m > 0 ? 'nato' : 'pact']) props.mast({ x: hx + 9 * m, z: hz - 7 * m, height: 10 });
      for (const c of river.crossings) props.sandbagRing({ x: c.x + (r() < 0.5 ? -15 : 15), z: c.z + m * (HW + 24 + r() * 10), radius: 4.5, toward: -m });
    }
    // pylons down the valley (the line to Seoul)
    for (let z = -440; z <= 440; z += 110) { const x = 150 + 30 * Math.sin(z * 0.004); if (roadDist(x, z) > 12 && Math.abs(z - chan(x)) > HW + 20 && mountK(x, z) < 0.05) props.pylon({ x, z, yaw: 0, height: 26 }); }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || paddyC(x, z) > 0.2 || Math.abs(z - chan(x)) < HW + 4 || Math.abs(z - WALL_Z(x)) < 5 || Math.abs(z - TEETH_Z(x)) < 8 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 6500, broadleaf: 0.6, autumn: 0.9, maxY: 140,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: avoid.slice(0, -1), density: 2 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
