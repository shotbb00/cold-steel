// Halle and the Saale, 15–19 April 1945 (1945 only; the big field, 1.0 × 1.12 km): the US First Army’s drive into the heart
// of the Reich. The 104th “Timberwolf” Infantry Division and the 3rd Armored came in from the west, out of the Mansfeld
// country by Nietleben and the Dölauer Heide; the Wehrmacht, flak gunners and Fallschirmjäger held the Saale and the
// old town behind it, until Count Luckner talked the garrison into giving up the city and the last of them fought on in
// the south. The Americans come from the west bank (+z), the Germans hold the east bank (-z). Across the middle runs the
// Saale, the main river with the Mühlgraben split off it round the Peißnitz, the park island under the old town. Four
// bridges: the Giebichenstein bridge between the porphyry rocks of Kröllwitz and the castle rock on the north flank
// (-x), the Peißnitz bridge from the Saline onto the island and the Schieferbrücke from the island to the Altstadt in
// the middle, the Ammendorf bridge on the south flank (+x). On the American bank: Nietleben with its airfield, the pines
// of the Dölauer Heide, Passendorf, Kröllwitz on its rocks, the Saline’s boiling houses at the river, and upstream the
// Buna works at Schkopau, towers, tanks and flak. On the German bank: the Altstadt round the Marktplatz with the
// Marktkirche’s four towers and the Roter Turm, the Moritzburg on the river, the Oberburg Giebichenstein on its rock,
// Ammendorf in the Saale–Elster floodplain woods, and on the skyline the chimneys of the Leuna works with their flak
// belt. (The Saale really runs north here: the map’s -x is north, +x south toward Merseburg; Buna and Leuna, both up the
// river, are given one to each bank.)
// Fair, not mirrored: the main river bulges toward the Americans, the Mühlgraben toward the Germans, so the Peißnitz in
// the middle is one bridge from each bank; each side has one flank bridge with a forward point on its own bank beside it
// (Kröllwitz in the north for the US, Ammendorf in the south for the Germans), a rock over the north bridge (Kröllwitz’s
// for the US, the castle rock for the Germans), one chemical works with its flak (Buna south for the US, Leuna south for
// the Germans), one big wood (the Dölauer Heide north, the floodplain woods south), a town quarter at its bridgehead
// (the Saline / the Moritzburg’s streets) and a built-up centre point (Passendorf / the Marktplatz), a rise behind its
// line, and its points at matching distances from its base, though not in mirrored places (measured:
// tools/map_fairness.py). The land falls gently north with the river, alike for both halves.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, buildSite, buildVillage } from './common.js';
import { vegetation } from './common2027.js';
import { evenThreshold, segDist } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const W = -330, E = 330;   // the flank roads: Kröllwitz–Giebichenstein in the north (-x), the Merseburg road in the south (+x)
const noise = createNoise2D(1945_415);

// the Saale across the map, bulging toward the Americans under the old town; the Mühlgraben split off it round the Peißnitz
const saaleZ = (x: number) => 30 * Math.exp(-((x / 170) ** 2)) + 8 * Math.sin(x * 0.007 + 0.4) + 4 * Math.sin(x * 0.019);
const ARM = [[-210, saaleZ(-210), 7], [-165, -8, 9], [-105, -34, 9], [-40, -42, 9], [0, -44, 9], [55, -41, 9], [115, -28, 9], [160, -6, 9], [200, saaleZ(200), 7]];
const armZ = (x: number) => { for (let i = 0; i < ARM.length - 1; i++) { const [ax, az] = ARM[i], [bx, bz] = ARM[i + 1]; if (x <= bx) return az + (bz - az) * (x - ax) / (bx - ax); } return ARM[ARM.length - 1][1]; };
const river = createRiver({
  paths: [saaleZ, ARM],
  halfWidth: 13,
  level: 0,
  depth: 2.6,
  valley: 38,
  crossings: [
    { name: 'Giebichenstein bridge', x: W, kind: 'bridge', width: 10, channel: 0 },
    { name: 'Peißnitz bridge', x: 0, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Schieferbrücke', x: 0, z: armZ(0), kind: 'bridge', width: 8, channel: 1 },
    { name: 'Ammendorf bridge', x: E, kind: 'bridge', width: 9, channel: 0 },
  ],
});
/** How far from the water (either arm), roughly in z. */
const away = (x: number, z: number) => Math.min(Math.abs(z - saaleZ(x)), Math.abs(x) < 210 ? Math.abs(z - armZ(x)) : 1e9);
const onIsland = (x: number, z: number) => Math.abs(x) < 195 && z < saaleZ(x) - 14 && z > armZ(x) + 9;

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Nietleben', 0, 470, 'centre'),
  P('B', 'Dölauer Heide', -370, 320, 'west'),
  P('C', 'Passendorf', 100, 300, 'centre', { radius: 26 }),
  P('D', 'Buna works', 360, 300, 'east', { radius: 28 }),
  P('E', 'Kröllwitz', -390, 85, 'west'),
  P('F', 'Peißnitz', 0, -8, 'centre', { radius: 24 }),
  P('G', 'Ammendorf', 435, -135, 'east'),
  P('H', 'Giebichenstein', -300, -200, 'west'),
  P('I', 'Marktplatz', -40, -260, 'centre', { radius: 26 }),
  P('J', 'Leuna works', 390, -390, 'east', { radius: 28 }),
  P('K', 'Reideburg', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

/** The roads: the Kröllwitz road up the north flank over the Giebichenstein bridge, the Eisleben road through the Saline
 *  and over both middle bridges into the Altstadt, the Merseburg road up the south flank, and the laterals. */
const ROADS = [
  [[W, 640], [W, 520], [-345, 420], at('B'), [-360, 200], at('E'), [W, saaleZ(W) + 50], [W, saaleZ(W) - 50], at('H'), [-320, -360], [W, -520], [W, -640]],
  [[0, 640], at('A'), [40, 390], at('C'), [40, 180], [0, 110], [0, saaleZ(0) + 40], [0, armZ(0) - 40], [-20, -150], at('I'), [-30, -400], at('K'), [0, -640]],
  [[E, 640], [E, 520], [345, 410], at('D'), [345, 200], [E, saaleZ(E) + 50], [E, saaleZ(E) - 50], at('G'), [365, -230], at('J'), [E, -520], [E, -640]],
  [at('B'), [-150, 270], at('C'), [220, 320], at('D')],
  [at('E'), [-220, 110], [-90, 120], [0, 110], [160, 110], [345, 200]],
  [[-330, -120], [-160, -105], [0, -100], [120, -110], [260, -95], at('G')],
  [at('H'), [-180, -250], at('I'), [130, -320], at('J')],
];
const roadD = (x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z)));

/** The two chemical works: Buna (the US bank) and Leuna (the German), each round its point. */
const WORKS = [{ x: 360, z: 300, r: 115 }, { x: 390, z: -390, r: 115 }];
const inWorks = (x: number, z: number) => WORKS.some((w) => Math.hypot(x - w.x, z - w.z) < w.r);
/** The two big woods: the Dölauer Heide’s pines (US, north), the Saale–Elster floodplain woods (German, south). */
const WOODS = [{ x: -380, z: 330, r: 135 }, { x: 250, z: -205, r: 125 }];
const bigWood = (x: number, z: number) => WOODS.some((w) => Math.hypot(x - w.x, z - w.z) < w.r);

/** Each side’s flat field for its airstrip behind its own line: Nietleben’s Fliegerhorst, and the German one by Reideburg. */
const FIELDS = [{ x: -180, z0: 385, z1: 485 }, { x: -180, z0: -485, z1: -385 }];
const fieldK = (x: number, z: number) => {
  const f = FIELDS[z > 0 ? 0 : 1];
  return smoothstep(175, 150, Math.abs(x - f.x)) * smoothstep(f.z0 - 30, f.z0, z) * smoothstep(f.z1 + 30, f.z1, z);
};

/** Rises [x, z, r, h]: Kröllwitz’s porphyry rocks and the castle rock of Giebichenstein over the north bridge, the old
 *  town’s hill and Passendorf’s, the heights behind each line. */
const RISES = [[-395, 100, 72, 10.5], [-300, -190, 72, 10.5], [-50, -240, 90, 4], [110, 275, 90, 4], [-230, 480, 130, 8], [230, -440, 120, 8]];
function height(x: number, z: number) {
  let h = 5 + fbm(noise, x * 0.0035, z * 0.0035, 4) * 3.5 + fbm(noise, x * 0.02 + 9, z * 0.02, 3) * 0.7;
  h += smoothstep(50, 260, away(x, z)) * 4;                                                 // up out of the Saale valley
  for (const [hx, hz, r, hh] of RISES) { const d = Math.hypot(x - hx, z - hz); if (d < r) h += hh * smoothstep(r, 0, d) ** 1.5; }
  h += x * 0.004;                                                                          // the land falls north (-x), with the Saale (alike for both)
  h += smoothstep(BASE_Z - 60, 660, Math.abs(z)) * 8;
  h += smoothstep(480, 620, Math.abs(x)) * 10;
  h += (6 - h) * fieldK(x, z);                                                              // the airstrip fields
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 5 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Platoon' }];

export default {
  id: 'halle',
  name: 'Halle and the Saale',
  description: 'April 1945: the US First Army reaches the Saale at Halle. The Peißnitz between the river’s arms, the Marktkirche’s four towers and the Moritzburg over the old town, the castle rock of Giebichenstein, and the Buna and Leuna chemical works with their flak.',
  epochs: ['1945'],
  region: 'europe',
  sides: { nato: 'United States', pact: 'Germany' },
  armies: { nato: ['us'], pact: ['wh', 'fj'] }, // (the 104th Infantry and 3rd Armored Divisions against the Wehrmacht, the flak and the Fallschirmjäger)
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1945_415,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1945_415, cell: 72 }),

  theme: {
    // a bright, hazy April day over the Saale, smoke from the works on the horizon
    fogColor: 0xaeb2ac, fogDensity: 0.0016, skyTop: 0x5f7c9a, skyHorizon: 0xc2c6be, skyBottom: 0x76786e,
    sunColor: 0xf2e8d2, sunIntensity: 1.9, sunDisk: 0.3, clouds: 0.5, cloudLight: 0xe0e0da, cloudDark: 0x80868c,
    sunDir: [0.45, 0.6, 0.55], hemiSky: 0xc4ccd2, hemiGround: 0x4e4a36, hemiIntensity: 1.3, rimColor: 0xbcc4ca, rimIntensity: 0.22,
    terrain: {
      grass: '#55663a', grassAlt: '#4a5a34', dryGrass: '#7e7650', dirt: '#5a4a38', rock: '#6e5a50', strip: '#4a3e30',
      pasture: '#58683a', ploughed: '#4e3c2c', stubble: '#7e7450', meadow: '#5e7040',
      farmX: [460, 600], farmZ: [540, 660], roads: [W, 0, E], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (roadD(x, z) < 3.5) return [0x6a6660, 0.9];                                      // cobbles and tarmac
        if (inWorks(x, z)) return [0x5e5a52, 0.55];                                         // the works’ cinders and concrete
        for (const [hx, hz, r, hh] of RISES) if (hh >= 10 && Math.hypot(x - hx, z - hz) < r * 0.45) return [0x7a5a4c, 0.7]; // the red porphyry
        if (y < 1.6 && away(x, z) < 30) return [0x6e7448, 0.6];                             // the reedy banks
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [W, 0, E] }, pact: { x: 0, z: -BASE_Z, entries: [W, 0, E] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const crossingNear = (x: number, z: number, r: number) => river.crossings.some((c: any) => Math.hypot(x - c.x, z - c.z) < r);
    const skip = (x: number, z: number) => fieldK(x, z) > 0.01 || away(x, z) < 32 || roadD(x, z) < 9 || crossingNear(x, z, 36);
    const placed: number[][] = [];
    const free = (x: number, z: number, r: number) => !skip(x, z) && placed.every(([qx, qz, qr]) => Math.hypot(qx - x, qz - z) > qr + r);
    const quarter = (x0: number, x1: number, z0: number, z1: number, seed: number, keep: number, clear = 18) => {
      const r = mulberry32(seed);
      for (let gx = x0; gx <= x1; gx += 17) for (let gz = z0; gz <= z1; gz += 17) {
        const x = gx + (r() - 0.5) * 3, z = gz + (r() - 0.5) * 3;
        if (r() > keep || !free(x, z, 7) || nearPoint(x, z, clear)) continue;
        placed.push([x, z, 7]);
        props.townHouse({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9 + r() * 4, depth: 9, storeys: 2 + Math.floor(r() * 3), damaged: 0.25 });
      }
    };
    /** A solid mass (tower, wall) with its cover. */
    const solid = (x: number, z: number, sx: number, sy: number, sz: number, color: number, y0 = terrain.heightAt(x, z) - 0.5, yaw = 0) => {
      props.box('stone', x, y0 + sy / 2, z, sx, sy, sz, yaw, color);
      cover.addBox({ x, z, yaw, length: sx, thickness: sz, height: sy });
    };
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4), _s = new THREE.Vector3(1, 1, 1);
    /** A pointed spire or a round tower’s body, sat at height y. */
    const cone = (x: number, z: number, y: number, r: number, h: number, color: number, sides = 4) => {
      props.push('stone', new THREE.ConeGeometry(r, h, sides), _m.compose(new THREE.Vector3(x, y + h / 2, z), _q, _s), color);
    };
    const drum = (x: number, z: number, r: number, h: number, color: number) => {
      const g = terrain.heightAt(x, z) - 0.5;
      props.push('stone', new THREE.CylinderGeometry(r, r * 1.05, h, 14), _m.compose(new THREE.Vector3(x, g + h / 2, z), _q, _s), color);
      cover.addBox({ x, z, yaw: 0, length: r * 1.6, thickness: r * 1.6, height: h });
      return g + h;
    };
    /** A flak gun in its sandbag ring, the barrel up toward the bombers. */
    const flak = (x: number, z: number, toward: number) => {
      props.sandbagRing({ x, z, radius: 4.5, toward });
      const g = terrain.heightAt(x, z);
      props.box('metal', x, g + 0.7, z, 2.2, 1.0, 2.2, 0, 0x3e4036);
      props.box('metal', x, g + 1.6, z, 1.2, 1.0, 1.4, 0, 0x3a3c32);
      props.box('metal', x, g + 2.6, z + toward * 1.6, 0.22, 0.22, 4.4, 0, 0x2a2c28, -0.75 * toward);
      placed.push([x, z, 7]);
    };

    // ---- the Saline on the US bank: the boiling houses and their chimney at the river, the streets behind
    props.rand = mulberry32(1945_416);
    for (const [x, z, w] of [[-75, 92, 30], [-30, 100, 24], [55, 96, 28]]) { props.hall({ x, z, yaw: 0, width: w, depth: 12, height: 7, color: 0x8a6a54, name: 'Saline boiling house' }); placed.push([x, z, w / 2 + 3]); }
    props.chimney({ x: -48, z: 120, height: 28 }); placed.push([-48, 120, 4]);
    quarter(-170, 150, 80, 175, 1945_417, 0.6);
    // ---- the old town on the German bank: the Moritzburg on the river, streets up to the Marktplatz
    {
      const mx = -120, mz = -132, hw = 28, hd = 22, wall = 0x8e8274;
      for (const s of [-1, 1]) {
        solid(mx, mz + s * hd, 2 * hw - 10, 8, 1.6, wall);                                   // the curtain walls (a gate in each long side’s gap: the towers stand apart)
        solid(mx + s * hw, mz - 8, 1.6, 8, hd - 6, wall);
        solid(mx + s * hw, mz + 12, 1.6, 8, hd - 14, wall);
      }
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cone(mx + sx * hw, mz + sz * hd, drum(mx + sx * hw, mz + sz * hd, 4.6, 14, 0x86796a), 5.4, 7, 0x4e4a46, 14);
      props.ruinBlock({ x: mx - 12, z: mz - 4, yaw: Math.PI / 2, width: 30, depth: 9, storeys: 3, ruin: 0.45, name: 'Moritzburg west wing' }); // (a ruin since 1637)
      props.townHouse({ x: mx + 12, z: mz - 10, yaw: 0, width: 14, depth: 9, storeys: 3, name: 'Moritzburg museum wing', damaged: 0.3 });
      placed.push([mx, mz, 38]);
    }
    {
      // the Marktkirche: the nave between its two pairs of towers, the Blue Towers’ spires west, the Hausmann towers’ bridge east
      const [px, pz] = at('I'), cx = px - 4, cz = pz - 46;
      props.hall({ x: cx, z: cz, yaw: 0, width: 34, depth: 18, height: 15, color: 0x9a8c78, roof: 0x5a5048, door: 4, name: 'Marktkirche' });
      for (const sz of [-1, 1]) {
        const tz = cz + sz * 6.5;
        solid(cx - 21, tz, 7, 34, 7, 0x968872); cone(cx - 21, tz, terrain.heightAt(cx - 21, tz) + 33.5, 5.2, 14, 0x4a5a5a);   // the Blue Towers
        solid(cx + 21, tz, 7, 30, 7, 0x968872); cone(cx + 21, tz, terrain.heightAt(cx + 21, tz) + 29.5, 4.6, 6, 0x5a5048);    // the Hausmann towers
      }
      props.box('stone', cx + 21, terrain.heightAt(cx + 21, cz) + 25, cz, 3, 2.4, 6, 0, 0x8e806c);                              // their bridge
      solid(px + 34, pz - 18, 7, 38, 7, 0x8a5a48); cone(px + 34, pz - 18, terrain.heightAt(px + 34, pz - 18) + 37.5, 5.4, 12, 0x4a5a58); // the Roter Turm
      placed.push([cx, cz, 30], [px + 34, pz - 18, 7]);
    }
    quarter(-175, 160, -180, -78, 1945_418, 0.6);
    quarter(-150, 80, -320, -200, 1945_419, 0.55, 32);  // round the Marktplatz
    quarter(20, 180, 240, 360, 1945_420, 0.5, 32);      // Passendorf’s streets, the same size
    // ---- the Peißnitz: the Peißnitzhaus in the park, a flak battery, barricades at both bridgeheads
    props.townHouse({ x: 70, z: -4, yaw: 0, width: 16, depth: 11, storeys: 3, name: 'Peißnitzhaus', damaged: 0.2 });
    for (const [x, z] of [[-60, -6], [-95, -12]]) props.townHouse({ x, z, yaw: 0, width: 10, depth: 9, storeys: 2, name: 'park house', damaged: 0.2 });
    flak(-140, -14, 1); flak(125, -10, 1);
    for (const s of [1, -1]) {
      const z = s > 0 ? saaleZ(0) - 21 : armZ(0) + 16;
      props.logBarricade({ x: -8, z, yaw: Math.PI / 2 + 0.15, length: 5 });
      props.logBarricade({ x: 8, z, yaw: Math.PI / 2 - 0.15, length: 5 });
    }
    // ---- Giebichenstein: the Oberburg’s ruins and keep on the castle rock; Kröllwitz’s houses on its rocks
    {
      const [hx, hz] = at('H');
      props.ruinBlock({ x: hx + 26, z: hz + 14, yaw: 0.4, width: 24, depth: 9, storeys: 2, ruin: 0.55, name: 'Oberburg Giebichenstein' });
      drum(hx - 22, hz + 20, 4.2, 18, 0x7e6a5a);
      solid(hx + 4, hz + 34, 30, 3.5, 1.2, 0x7a6658, undefined, 0.2);
      placed.push([hx + 26, hz + 14, 16], [hx - 22, hz + 20, 6], [hx + 4, hz + 34, 16]);
    }
    // ---- the works: Buna on the US bank, Leuna on the German — halls, cracking towers, tank farms, chimneys on the skyline, flak
    for (const [i, w] of WORKS.entries()) {
      const r = mulberry32(1945_421 + i), toward = i ? 1 : -1, name = i ? 'Leuna works' : 'Buna works';
      for (let k = 0, n = 0; n < 9 && k < 200; k++) {
        const a = r() * Math.PI * 2, d = 40 + r() * 70, x = w.x + Math.cos(a) * d, z = w.z + Math.sin(a) * d;
        if (Math.abs(x) > 470 || !free(x, z, 15)) continue;
        placed.push([x, z, 15]);
        props.hall({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 24 + r() * 12, depth: 14, height: 9 + r() * 4, color: i ? 0x7a5e4c : 0x6e6458, name: name + ' hall' });
        n++;
      }
      for (let k = 0, n = 0; n < 7 && k < 200; k++) {
        const a = r() * Math.PI * 2, d = 35 + r() * 75, x = w.x + Math.cos(a) * d, z = w.z + Math.sin(a) * d;
        if (Math.abs(x) > 480 || !free(x, z, 4)) continue;
        placed.push([x, z, 4]);
        props.chimney({ x, z, height: 38 + r() * 14 });
        n++;
      }
      for (let k = 0, n = 0; n < 4 && k < 200; k++) {
        const a = r() * Math.PI * 2, d = 40 + r() * 65, x = w.x + Math.cos(a) * d, z = w.z + Math.sin(a) * d;
        if (Math.abs(x) > 470 || !free(x, z, 13)) continue;
        placed.push([x, z, 13]);
        if (n === 0) props.tanks({ x, z, yaw: 0, count: 1, radius: 10, height: 16, color: 0x7a7a72 }); // the gasometer
        else props.tanks({ x, z, yaw: r() * Math.PI, count: 3, radius: 3.5, height: 7 });
        n++;
      }
      for (let k = 0, n = 0; n < 6 && k < 300; k++) {
        const a = (n / 6) * Math.PI * 2 + r() * 0.4, d = 100 + r() * 30, x = w.x + Math.cos(a) * d, z = w.z + Math.sin(a) * d;
        if (Math.abs(x) > 480 || Math.abs(z) > 530 || !free(x, z, 7)) continue;
        flak(x, z, toward);
        n++;
      }
    }
    // a heavy battery by the Mühlgraben, one at Nietleben’s edge (each side’s rear)
    flak(-190, -330, 1); flak(-160, 330, -1);

    // ---- the villages; the forester’s house in the Heide
    for (const p of points) if ('ACEGK'.includes(p.id)) buildVillage(props, p, 1945_430 + Math.round(p.x * 3 + p.z * 7), 1);
    props.house({ x: -345, z: 300, yaw: 0.3, width: 10, depth: 8 }); placed.push([-345, 300, 9]);

    // ---- farmsteads, field walls, hay and wrecks over the fields, each half its own dice
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay', 'wrecks', 'roadblock'];
    for (const side of [1, -1]) {
      for (let tries = 0, n = 0; n < 60 && tries < 6000; tries++) {
        const x = (rand() * 2 - 1) * (bounds.x - 20), z = side * (60 + rand() * (bounds.z - 90));
        if (Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 45) || !free(x, z, 12) || onIsland(x, z) || inWorks(x, z) || bigWood(x, z)) continue;
        placed.push([x, z, 12]);
        buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
      }
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...river.crossings.map((c: any) => ({ x: c.x, z: c.z, r: river.halfWidth + 16 })),
      ...placed.map(([x, z, r]) => ({ x, z, r: r + 2 })),
      { test: (x: number, z: number) => away(x, z) < 18 || roadD(x, z) < 6 || fieldK(x, z) > 0.01 || inWorks(x, z) }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.006 + 70, z * 0.006, 3);
    const tN = 0.14, tP = evenThreshold(wood, tN, (x, z) => z > 0);   // (each half its own woods, the same in area)
    const town = (x: number, z: number) => (Math.abs(x) < 180 && Math.abs(z) > 70 && Math.abs(z) < 185) || (x > -160 && x < 90 && z < -190 && z > -330) || (x > 10 && x < 190 && z > 230 && z < 370);
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4200, hedges: 1200, autumn: 0.05, broadleaf: 0.55,
      forest: (x: number, z: number) => {
        if (away(x, z) < 18) return -1;
        if (town(x, z)) return 0.03;                                                      // the town’s gardens and squares
        if (onIsland(x, z)) return Math.abs(x) < 40 ? 0.05 : 0.6;                         // the Peißnitz park
        if (bigWood(x, z)) return wood(x + 300, z) > -0.25 ? 0.88 : 0.05;                 // the Heide’s pines, the floodplain woods
        if (away(x, z) < 60 && Math.abs(x) > 230) return 0.5;                             // the Saale’s banks
        return x < -480 || x > 480 || wood(x, z) > (z > 0 ? tN : tP) ? 0.85 : 0;
      },
      noHedge: (x: number, z: number) => town(x, z) || onIsland(x, z) || inWorks(x, z) || bigWood(x, z),
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
