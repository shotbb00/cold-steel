// Dresden — a battle that was not fought in 1806, and the ground of the one that was in August 1813. In October 1806 the
// Elector’s Saxons marched with Hohenlohe; had the campaign gone the other way, the French would have come up the Elbe
// for the Saxon capital, held by its own garrison with Prussian battalions. (On 26–27 August 1813 Schwarzenberg’s
// Allies came down off these same heights from the south against Napoleon’s Guard behind the city’s old walls and
// redoubts, in pouring rain, and were thrown back — Moreau was mortally wounded by Räcknitz.)
// On the map (1.0 × 1.12 km): the French come down the Dippoldiswalde road from the heights in the south (+z), the
// Saxons and the Prussians hold the Königsbrück road in the north (−z). The Elbe runs west across the middle in its open
// meadows. On its left bank the Altstadt inside its bastioned walls: the Frauenkirche’s stone dome over the Neumarkt,
// the Zwinger’s galleries and pavilions by the west rampart, the Schloss and the Hofkirche at the bridgehead; the
// Augustusbrücke over to the Neustadt, walled and bastioned too, round its market, the Japanese Palace and the
// Dreikönigskirche. Up the Pirna road the Großer Garten, the park of the Palais in its avenues; on the heights the
// windmill village of Räcknitz, Plauen at the mouth of the Weißeritz’s gorge; across the river Pieschen in the meadows,
// the sandy Heller with its windmill, the Waldschlösschen on the bluff at the edge of the Dresdner Heide’s pines. A
// pontoon bridge below the town, the Blasewitz ferry-bridge above it, fords at low summer water at both ends.
// Not mirrored but fair: the Elbe runs between the sides and every crossing has its twin as far from the other base —
// the pontoon bridge and the ferry-bridge, the Ostra and the Johannstadt fords — with the Augustusbrücke, the decisive
// crossing, in the middle owned by neither. Each side has a walled town on its bank at the same reach (the Altstadt for
// the French, the Neustadt for the Allies), each a height in its centre third (Räcknitz, the Heller), a wooded flank
// (the Großer Garten and the Plauen gorge woods; the Heide and the Heller pines), and each village as far from the
// nearer base as its counterpart (tools/map_fairness.py). The south’s heights are a long ridge cut by the Weißeritz,
// the north’s a plateau rising east into the Heide, so the ground is not a mirror. 1806 only (`epochs`).
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import { pontoons } from './greatWarHelpers.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 490;
const noise = createNoise2D(1806_1813);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Dippoldiswalde road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Plauen', x: -330, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Räcknitz', x: 50, z: 310, owner: null, sector: 'centre' },
  { id: 'D', name: 'Großer Garten', x: 340, z: 235, owner: null, sector: 'east' },
  { id: 'E', name: 'Altstadt', x: -150, z: 125, owner: null, sector: 'west', radius: 28 },
  { id: 'F', name: 'Augustusbrücke', x: 0, z: -8, owner: null, sector: 'centre', radius: 22 },
  { id: 'G', name: 'Neustadt', x: 125, z: -140, owner: null, sector: 'east', radius: 28 },
  { id: 'H', name: 'Pieschen', x: -300, z: -205, owner: null, sector: 'west' },
  { id: 'I', name: 'Heller', x: -110, z: -320, owner: null, sector: 'centre' },
  { id: 'J', name: 'Waldschlösschen', x: 350, z: -280, owner: null, sector: 'east' },
  { id: 'K', name: 'Königsbrück road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Elbe, flowing west (−x) across the middle in a long double bend
const ELBE = [[720, 100], [500, 80], [330, 20], [160, -22], [0, -10], [-160, 18], [-330, 42], [-500, 14], [-720, -40]];
/** The Elbe’s centre line at x (cheap: for the woods and the surface, never the river lookup). */
const elbeZ = (x) => {
  for (let i = 0; i < ELBE.length - 1; i++) {
    const [ax, az] = ELBE[i], [bx, bz] = ELBE[i + 1];
    if (x <= ax && x >= bx) return az + (bz - az) * ((ax - x) / (ax - bx));
  }
  return x > 0 ? ELBE[0][1] : ELBE[ELBE.length - 1][1];
};
const river = createRiver({
  path: ELBE,
  halfWidth: 17, level: 0, depth: 2.8, valley: 44,
  crossings: [
    { name: 'Augustusbrücke', x: 0, z: -10, kind: 'bridge', width: 9 },
    { name: 'Pontoon bridge', x: -330, z: 42, kind: 'bridge', width: 7, pontoon: true },
    { name: 'Blasewitz ferry-bridge', x: 330, z: 20, kind: 'bridge', width: 7, pontoon: true },
    { name: 'Ostra ford', x: -470, z: 19, kind: 'ford', width: 14 },
    { name: 'Johannstadt ford', x: 470, z: 74, kind: 'ford', width: 14 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };

// the two walled towns: the Altstadt on the left bank, the Neustadt on the right
const ALT = { x: -130, z: 120, rx: 155, rz: 82 };
const NEU = { x: 130, z: -135, rx: 135, rz: 85 };
const q = (T, x, z) => Math.hypot((x - T.x) / T.rx, (z - T.z) / T.rz);
const inTown = (x, z) => Math.min(q(ALT, x, z), q(NEU, x, z));
const FRAUEN = { x: -105, z: 135 };     // the Frauenkirche on the Neumarkt
const ZWINGER = { x: -235, z: 98 };     // the Zwinger by the west rampart
const SCHLOSS = { x: -45, z: 92 };      // the Residenzschloss and the Hofkirche at the bridgehead
const JAPAN = { x: 40, z: -105 };       // the Japanese Palace
const GG = { x0: 240, x1: 440, z0: 165, z1: 305 }; // the Großer Garten
const inGarden = (x, z) => x > GG.x0 && x < GG.x1 && z > GG.z0 && z < GG.z1;

// the roads: the Dippoldiswalde road down off the heights to the Altstadt, the streets over the bridge, the Königsbrück
// road north out of the Neustadt with its branch to the Heller, the Pirna, Freiberg, Meißen and Bautzen roads
const ROADS = [
  [[0, 560], [0, 400], [-60, 300], [-110, 205]],
  [[-110, 205], [-150, 125], [-40, 75], [0, 22], [0, -40], [40, -78], [125, -140]],
  [[125, -140], [40, -280], [0, -400], [0, -560]], [[40, -280], [-110, -320]],
  [[20, 118], [200, 200], [340, 235], [500, 262]],
  [[-285, 118], [-330, 300], [-500, 350]],
  [[-5, -150], [-300, -205], [-500, -232]],
  [[262, -150], [360, -260], [500, -330]],
];
const roadD = (x, z) => {
  let best = 1e9;
  for (const R of ROADS) for (let i = 0; i < R.length - 1; i++) {
    const [ax, az] = R[i], [bx, bz] = R[i + 1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
};
/** The Weißeritz’s gorge, the Plauenscher Grund, coming down to the Elbe meadows west of the Altstadt (x at z). */
const gorgeX = (z) => -400 + 22 * Math.sin(z * 0.012);

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Plauen gorge woods, the copse on the Räcknitz ridge; the Dresdner Heide’s pines, the Heller’s pines
const WOODS = [[-420, 400, 70, 150, 0.1], [190, 430, 70, 40, 0.2], [400, -450, 170, 100, 0.2], [-260, -390, 90, 55, -0.3]];
const woods = (x, z) => {
  let k = smoothstep(0.62, 0.76, fbm(noise, x * 0.006 + 11, z * 0.006 - 7, 3)) * 0.7;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  if (inGarden(x, z)) k = Math.max(k, Math.abs(z - 235) < 10 || Math.abs(x - 340) < 8 ? 0 : 0.92); // (the park’s avenues kept open)
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(1.15, 1.4, inTown(x, z)), smoothstep(45, 75, Math.abs(z - elbeZ(x))), smoothstep(6, 14, roadD(x, z))); // (the Elbe meadows open)
};

function height(x, z) {
  let h = fbm(noise, x * 0.0024, z * 0.0024, 3) * 2.2 + fbm(noise, x * 0.02 + 3, z * 0.02, 3) * 0.35 + 3;
  const s = z - elbeZ(x);
  // the left bank: a terrace, then the long ridge of the south heights, Räcknitz on its crest, cut by the Weißeritz
  h += smoothstep(90, 360, s) * 7 + hill(x, z, 60, 360, 150, 5) + hill(x, z, -250, 330, 120, 3);
  h -= 6 * smoothstep(34, 8, Math.abs(x - gorgeX(z))) * smoothstep(170, 300, z);
  // the right bank: the plateau rising east into the Heide, the Heller’s sandy knoll
  h += smoothstep(110, 420, -s) * (5 + 4 * smoothstep(-200, 350, x)) + hill(x, z, -130, -340, 120, 5);
  h += hill(x, z, 380, -200, 70, 2.5);                                                 // the Waldschlösschen’s bluff
  h += (4.2 - h) * smoothstep(1.15, 0.9, inTown(x, z)) * 0.85;                         // the towns on the level terrace
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 16;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 20;
  for (const p of POINTS) if (!'EFG'.includes(p.id)) h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.5;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];
const SANDSTONE = 0xd2c6a4, COPPER = 0x5e8a72, SLATE = 0x3e4046;

export default {
  id: 'dresden',
  armies: { nato: ['fr'], pact: ['sx', 'pr'] }, // (the Grande Armée against the Saxon garrison and Prussian battalions; after Jena Saxony changes sides — the campaign sets who is there)
  name: 'Dresden',
  description: 'Dresden on the Elbe, 1806 (and the ground of August 1813): the walled Altstadt with the Frauenkirche’s dome and the Zwinger, the Augustusbrücke over to the Neustadt, the Großer Garten, and the heights of Räcknitz to the south.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'overcast' }, // (late summer, low cloud: the rain of 27 August 1813 not far off)
  airfields: [],
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 18061813,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1806_1813, cell: 72, weights: [0.32, 0.22, 0.28, 0.18] }), // late summer: stubble, ploughland, meadow

  theme: {
    // a grey late-summer day in the Elbe valley, cloud on the heights
    fogColor: 0xb0b6b4,
    fogDensity: 0.0015,
    skyTop: 0x6c7c8c,
    skyHorizon: 0xc4c8c4,
    skyBottom: 0x767a70,
    sunColor: 0xf0e2c4,
    sunIntensity: 1.7,
    sunDisk: 0.15,
    clouds: 0.75,
    cloudLight: 0xd4d6d2,
    cloudDark: 0x7e868c,
    sunDir: [0.45, 0.5, 0.7],
    hemiSky: 0xc4ccd4,
    hemiGround: 0x4c4c36,
    hemiIntensity: 1.25,
    rimColor: 0xc4ccd4,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5a6a38',
      grassAlt: '#4e5e34',
      dryGrass: '#8c8450',
      dirt: '#5a4a38',
      rock: '#7a7262',
      strip: '#4c4030',
      pasture: '#5c6c3a',
      ploughed: '#54442f',
      stubble: '#9a9058',
      meadow: '#66783c',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const t = inTown(x, z);
        if (t < 0.97) return [0x8c8070, 0.45];                                                   // the streets and squares
        if (t < 1.12) return [0x6a6248, 0.35];                                                   // the glacis
        const rd = roadD(x, z);
        if (rd < 5) return [0x857a66, smoothstep(5, 3, rd) * 0.7];                               // the chaussées
        if (inGarden(x, z) && (Math.abs(z - 235) < 9 || Math.abs(x - 340) < 7)) return [0x9a8e74, 0.5]; // the park’s avenues
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), qq = new THREE.Quaternion();
    const solid = (key, geo, x, y, z, sx, sy, sz, color) => { m4.compose(v.set(x, y, z), qq.identity(), new THREE.Vector3(sx, sy, sz)); props.push(key, geo, m4, color); };
    const taken: number[][] = [[FRAUEN.x, FRAUEN.z], [ZWINGER.x, ZWINGER.z], [SCHLOSS.x, SCHLOSS.z], [JAPAN.x, JAPAN.z]];

    // ---- the walls: a bastioned trace round each town, gates toward its roads and the bridge, breaches in places
    /** A ring of curtains between bastions round town T: `n` bastions, gaps at the angles in `gates` (radians). */
    const ring = (T, n, gates: number[]) => {
      const at = (a, k = 1) => [T.x + Math.cos(a) * T.rx * k, T.z + Math.sin(a) * T.rz * k];
      const seg = (a, b) => props.wall({ x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, yaw: -Math.atan2(b[1] - a[1], b[0] - a[0]), length: Math.hypot(b[0] - a[0], b[1] - a[1]) + 1.2, height: 3.2, thickness: 2.2 });
      const gap = (a) => gates.some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.2);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, b = ((i + 1) / n) * Math.PI * 2, w = Math.PI / n * 0.28;
        if (!gap(a)) { seg(at(a - w), at(a, 1.16)); seg(at(a, 1.16), at(a + w)); }     // the bastion’s two faces
        const mid = (a + b) / 2;
        if (!gap(mid) && i % 3 !== 1) for (let k = 0; k < 3; k++) seg(at(a + w + (b - a - 2 * w) * k / 3), at(a + w + (b - a - 2 * w) * (k + 1) / 3)); // the curtain
      }
    };
    const ang = (T, x, z) => Math.atan2((z - T.z) / T.rz, (x - T.x) / T.rx);
    ring(ALT, 10, [ang(ALT, 0, 30), ang(ALT, -240, 50),ang(ALT, -110, 205), ang(ALT, -285, 118), ang(ALT, 20, 118)]);
    ring(NEU, 9, [ang(NEU, 10, -60), ang(NEU, 70, -230), ang(NEU, -5, -150), ang(NEU, 262, -150)]);

    // ---- the town houses: the Altstadt’s and the Neustadt’s streets, tall and close
    const street = (x, z) => roadD(x, z) < 8;
    const rr = mulberry32(1806_18131);
    for (const [T, max] of [[ALT, 80], [NEU, 64]] as const) {
      for (let i = 0, k = 0; i < 1200 && k < max; i++) {
        const x = T.x + (rr() * 2 - 1) * T.rx, z = T.z + (rr() * 2 - 1) * T.rz;
        if (q(T, x, z) > 0.84 || street(x, z) || wet(x, z, 8) || nearPoint(x, z, 32) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < (tx === FRAUEN.x || tx === ZWINGER.x || tx === SCHLOSS.x || tx === JAPAN.x ? 38 : 11.5))) continue;
        taken.push([x, z]); k++;
        props.rand = mulberry32(Math.floor(rr() * 1e9));
        props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.6 ? 3 : 2, damaged: 0 });
      }
    }
    props.rand = mulberry32(1806_18132);

    // ---- the Frauenkirche: the square body, the corner stair towers, the drum and the stone bell of the dome, the lantern
    {
      const { x, z } = FRAUEN, g = terrain.heightAt(x, z);
      props.box('stone', x, g + 8, z, 24, 16, 24, 0, SANDSTONE);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        props.box('stone', x + sx * 12, g + 11, z + sz * 12, 4.4, 22, 4.4, Math.PI / 4, SANDSTONE);
        solid('stone', new THREE.ConeGeometry(1, 1, 8), x + sx * 12, g + 23.5, z + sz * 12, 2.6, 3.5, 2.6, SANDSTONE);
      }
      solid('stone', new THREE.CylinderGeometry(1, 1, 1, 20), x, g + 18.5, z, 10, 5, 10, SANDSTONE);
      solid('stone', new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), x, g + 21, z, 10, 13, 10, 0xc8bc9a);
      solid('stone', new THREE.CylinderGeometry(1, 1, 1, 12), x, g + 36, z, 2.2, 5, 2.2, SANDSTONE);
      solid('plain', new THREE.ConeGeometry(1, 1, 12), x, g + 40, z, 1.8, 3.5, 1.8, COPPER);
      cover.addBox({ x, z, yaw: 0, length: 24, thickness: 24, height: 16 });
    }
    // ---- the Zwinger: galleries round three sides of its court, the pavilions, the Kronentor; open toward the river
    {
      const { x, z } = ZWINGER, g = terrain.heightAt(x, z);
      props.hall({ x, z: z + 24, yaw: 0, width: 62, depth: 7, height: 6, color: SANDSTONE, roof: COPPER, door: 4, name: 'Zwinger gallery' });
      for (const s of [-1, 1]) {
        props.hall({ x: x + s * 31, z, yaw: Math.PI / 2, width: 40, depth: 7, height: 6, color: SANDSTONE, roof: COPPER, door: 4, name: 'Zwinger gallery' });
        props.box('stone', x + s * 31, g + 6, z - 4, 12, 12, 12, 0, SANDSTONE);                       // the Wall- and the Glockenspiel pavilion
        solid('plain', new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), x + s * 31, g + 12, z - 4, 6.5, 4, 6.5, COPPER);
        cover.addBox({ x: x + s * 31, z: z - 4, yaw: 0, length: 12, thickness: 12, height: 12 });
      }
      props.box('stone', x, g + 7, z + 28, 9, 14, 9, 0, SANDSTONE);                                    // the Kronentor
      solid('plain', new THREE.SphereGeometry(1, 12, 8), x, g + 15, z + 28, 2.2, 2.6, 2.2, 0xb89a4a);
      cover.addBox({ x, z: z + 28, yaw: 0, length: 9, thickness: 9, height: 14 });
    }
    // ---- the Residenzschloss round its court with the Hausmannsturm, the Hofkirche at the bridgehead
    {
      const { x, z } = SCHLOSS, g = terrain.heightAt(x, z);
      for (const [dx, dz, yaw, len] of [[0, -16, 0, 40], [0, 16, 0, 40], [-19, 0, Math.PI / 2, 30], [19, 0, Math.PI / 2, 30]] as const) {
        props.box('stone', x + dx, g + 6, z + dz, len, 12, 6, yaw, 0xc4b896);
        props.box('stone', x + dx, g + 12.6, z + dz, len + 0.4, 1.6, 4.2, yaw, SLATE);
        cover.addBox({ x: x + dx, z: z + dz, yaw, length: len, thickness: 6, height: 12 });
      }
      props.box('stone', x - 19, g + 17, z - 16, 7, 34, 7, 0, 0xc4b896);
      solid('plain', new THREE.ConeGeometry(1, 1, 8), x - 19, g + 37, z - 16, 3.6, 6, 3.6, COPPER);
      cover.addBox({ x: x - 19, z: z - 16, yaw: 0, length: 7, thickness: 7, height: 34 });
      props.church({ x: x + 6, z: z - 44, yaw: Math.PI / 2 + 0.6 });                                // the Hofkirche
      taken.push([x + 6, z - 44]);
    }
    // ---- the Neustadt: the Japanese Palace by the river, the Dreikönigskirche, the Blockhaus at the bridgehead
    props.hall({ x: JAPAN.x, z: JAPAN.z, yaw: 0, width: 40, depth: 22, height: 10, color: 0xd8cbb0, roof: COPPER, door: 5, name: 'Japanese Palace' });
    props.church({ x: P.G.x + 36, z: P.G.z - 30, yaw: 0 });
    props.hall({ x: 30, z: -52, yaw: 0.5, width: 16, depth: 10, height: 7, color: 0xc8bc9c, roof: SLATE, door: 3, name: 'Blockhaus' });
    taken.push([P.G.x + 36, P.G.z - 30], [30, -52]);
    // ---- the Großer Garten: the Palais in its avenues, the cavaliers’ pavilions round it
    props.hall({ x: P.D.x, z: P.D.z - 32, yaw: 0, width: 30, depth: 13, height: 11, color: 0xd6c8a6, roof: SLATE, door: 4, name: 'Palais im Großen Garten' });
    for (const [dx, dz] of [[-48, -18], [48, -18], [-48, 22], [48, 22]]) props.house({ x: P.D.x + dx, z: P.D.z + dz, yaw: 0, width: 7, depth: 7, height: 4 });
    // ---- the villages; the windmills of Räcknitz and the Heller; Plauen’s mill in the gorge; the Waldschlösschen
    for (const p of POINTS) if ('BCHIJ'.includes(p.id)) buildVillage(props, p, 18061 + Math.round(p.x * 3 + p.z * 7));
    props.church({ x: P.B.x + 30, z: P.B.z - 26, yaw: 0 });
    props.church({ x: P.H.x - 28, z: P.H.z + 26, yaw: Math.PI });
    props.hall({ x: P.B.x - 50, z: P.B.z + 30, yaw: Math.PI / 2, width: 14, depth: 8, height: 5, color: 0x9a8a70, roof: 0x5a3a2a, door: 4, name: 'Plauen mill' });
    props.hall({ x: P.J.x + 4, z: P.J.z - 36, yaw: 0, width: 22, depth: 11, height: 8, color: 0xd0c4aa, roof: SLATE, door: 4, name: 'Waldschlösschen' });
    const MILLS = [[P.C.x + 40, P.C.z + 30], [P.I.x - 36, P.I.z - 28], [-150, 360], [190, -390]];
    for (const [x, z] of MILLS) {
      const g = terrain.heightAt(x, z), yaw = (x * 7 + z * 3) % 6;
      props.box('plain', x, g + 2, z, 1.2, 4, 1.2, 0, 0x4a3c2e);
      props.box('plain', x, g + 6.5, z, 4.2, 5, 3.4, yaw, 0x7a6450);
      props.box('plain', x, g + 9.3, z, 4.4, 0.8, 3.8, yaw, 0x4a3a30, 0.25);
      const fx = Math.sin(yaw) * 2.2, fz = Math.cos(yaw) * 2.2;
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + 0.5;
        props.box('plain', x + fx + Math.cos(a) * Math.cos(yaw) * 4.5, g + 7 + Math.sin(a) * 4.5, z + fz - Math.cos(a) * Math.sin(yaw) * 4.5, 9, 1.2, 0.15, yaw, 0xcfc6b0, 0, a);
      }
      cover.addBox({ x, z, yaw, length: 4.2, thickness: 3.4, height: 8 });
    }
    // the French batteries on the heights, the Saxon redans before the Neustadt
    for (const [x, z] of [[-90, 380], [150, 360], [-180, -300], [230, -330]] as const) props.sandbagRing({ x, z, radius: 6, toward: -Math.sign(z) });

    // ---- farms, field walls and hay on the fields
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'hay', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 70 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 56 * 56)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 60) || woods(x, z) > 0.3 || Math.abs(z - elbeZ(x)) < 60 || inGarden(x, z)
        || inTown(x, z) < 1.3 || roadD(x, z) < 14 || Math.abs(x - gorgeX(z)) < 40 || MILLS.some(([mx, mz]) => Math.hypot(x - mx, z - mz) < 30)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);

    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xcfc8b0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);
    pontoons(river, scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 28 })), ...MILLS.map(([x, z]) => ({ x, z, r: 12 })),
      { x: P.D.x, z: P.D.z - 32, r: 26 }, { x: P.J.x + 4, z: P.J.z - 36, r: 18 },
      { test: (x, z) => wet(x, z, 1.5) || inTown(x, z) < 1.14 || roadD(x, z) < 5 }];
    // pines on the Heide and the Heller, beech and oak in the gorge, limes in the park
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 5000, broadleaf: 0.6, autumn: 0.2, forest: (x, z) => woods(x, z) * 0.95 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x, z) => inGarden(x, z) }], count: 1400, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.8, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
        hedges.update(dt, t);
      },
    };
  },
} satisfies MapDef;
