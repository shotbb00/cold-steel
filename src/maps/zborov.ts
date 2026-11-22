// Zborov, 2 July 1917: the Kerensky offensive. On the heights west of Zborov in eastern Galicia the Czechoslovak
// Rifle Brigade — Czech and Slovak volunteers and deserters fighting in the Russian army, here the Russian side (nato,
// army 'ru') — goes over the top at dawn after a two-day bombardment against the Austro-Hungarian 19th Infantry
// Division (pact, army 'ah') and its deep trench lines, wired and dug in through a year of static war. In a few hours
// the brigade broke through three lines, took Hill 392 ‘Mogila’ and some three thousand prisoners — the founding battle
// of the Czechoslovak legions. The ground: rolling, open Podolian farmland of ripening wheat and sunflowers, the Strypa
// winding through marshy meadows with a mill pond above Zborov, the little town astride the river with its Greek-
// Catholic church, villages of wooden houses with onion-domed wooden churches, the Lemberg–Tarnopol railway crossing
// the valley on its own bridge, and the two hills: the Lysa Hora over the Russian lines, Mogila over the Austrian.
// Not mirrored but fair: the Strypa runs between the sides; each holds a bank with two trench lines at the same depth
// from the water (wire before both), one named hill of the same height at the same reach from its base (Lysa Hora
// north, Mogila south) and a lesser rise on its east flank; a ford on each flank with a point on each side's bank
// (Korostiatyn on the north by the west ford, Ozerna on the south by the east ford), the town bridge and the railway
// bridge in the middle open to both; the mill pond sits on the river line, as much in the way of either; each half
// its own woods of the same area.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite, shellField } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, evenThreshold, segDist } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const RAIL_X = 100;                                         // the railway bridge
const HW = 10;                                              // the Strypa: a small, slow river
const noise = createNoise2D(1917_07);
const mid = (x: number) => 16 * Math.sin(x * 0.0055 + 0.6) + 8 * Math.sin(x * 0.019 - 1) - 4;
const POND = [[-200, mid(-200), 22], [-130, mid(-130), 22]];  // the mill pond above Zborov (its ends rounded)
const river = createRiver({
  path: mid, paths: [mid, POND], halfWidth: HW, level: 0, depth: 2.4, valley: 80,
  crossings: [
    { name: 'Korostiatyn ford', x: -SIDE_X, kind: 'ford', width: 14 },
    { name: 'Zborov bridge', x: 0, kind: 'bridge', width: 7 },
    { name: 'Zborov railway bridge', x: RAIL_X, kind: 'bridge', width: 6 },
    { name: 'Ozerna ford', x: SIDE_X, kind: 'ford', width: 14 },
  ],
});
const pondD = (x: number, z: number) => segDist(POND, x, z) - 12;   // (as far from the pond's edge as from a river this wide)
const away = (x: number, z: number) => Math.min(Math.abs(z - mid(x)), pondD(x, z));
/** The Lemberg–Tarnopol railway: down from the north, square over its bridge, away to the south. */
const RM = mid(RAIL_X);
const RAIL = [[250, 570], [180, 280], [118, 120], [RAIL_X, RM + 40], [RAIL_X, RM - 40], [120, -120], [190, -280], [260, -570]];
const railD = (x: number, z: number) => segDist(RAIL, x, z);
/** The valley road along each bank, the roads from the crossings up over the heights to each base. */
const bankZ = (x: number, north: boolean) => (north ? mid(x) + 52 + 6 * Math.sin(x * 0.011) : mid(x) - 55 + 8 * Math.sin(x * 0.008 + 2));
const roadD = (x: number, z: number) => {
  let d = Math.abs(z - bankZ(x, z > mid(x)));
  for (const bx of [-SIDE_X, 0, SIDE_X]) d = Math.min(d, Math.abs(x - bx));
  return d;
};
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
/** Each side's two lines: the fire trench on the forward slope, the support line behind on the crest, each its own wander. */
const trenchZ = (x: number, north: boolean, line: number) => {
  const m = mid(x) * (line ? 0.5 : 0.8);
  return north ? m + (line ? 215 : 110) + 9 * Math.sin(x * 0.015 + line) : m - (line ? 212 : 112) - 10 * Math.sin(x * 0.012 + 2 + line);
};

/** [x, z, r, h]: the Lysa Hora and the Perepelnyky rise on the north; Hill 392 ‘Mogila’ and the Hodiv rise on the south. */
const RISES = [[-150, 245, 130, 13], [280, 330, 150, 6], [90, -250, 130, 13], [390, -330, 150, 6]];
function marshAt(x: number, z: number) { return smoothstep(0.2, 0.42, fbm(noise, x * 0.007 + 30, z * 0.007, 3)) * (1 - smoothstep(55, 95, away(x, z))); }
function height(x: number, z: number) {
  const d = away(x, z), north = z > mid(x);
  const n = fbm(noise, x * 0.004 + (north ? 0 : 40), z * 0.004, 4);
  // the valley floor, then the long Podolian slopes up to each side's crest and a little down behind it
  const crest = north ? 170 + 35 * Math.sin(x * 0.007 + 1) : 230 + 30 * Math.sin(x * 0.0055 + 3.6);   // (the north slope shorter and steeper, the south long and gentle)
  let h = 1.4 + smoothstep(35, crest, d) * (north ? 11.3 + n * 9 : 11 + n * 9) - smoothstep(crest + 60, crest + 220, d) * 3;
  h += fbm(noise, x * 0.015 + 9, z * 0.015, 3) * 1.2 * smoothstep(40, 140, d);
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += smoothstep(BASE_Z - 70 + 40 * Math.sin(x * 0.008 + 1), 640, Math.abs(z)) * 7 + smoothstep(440 + 50 * Math.sin(z * Math.PI / 280), 600, Math.abs(x)) * 14;
  h += (1.2 - h) * marshAt(x, z) * 0.8;                     // the wet meadows down to the water
  // the ramps down to each crossing, the bases' ground
  for (const bx of [-SIDE_X, 0, RAIL_X, SIDE_X]) h += (Math.min(h, 1.3 + d * 0.06) - h) * (1 - smoothstep(5, 18, Math.abs(x - bx))) * (1 - smoothstep(90, 150, d));
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 8 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Tarnopol road', 0, 470, 'centre'),
  P('B', 'Tsetsiv', -360, 320, 'west'),
  P('C', 'Lysa Hora', -150, 245, 'centre', { radius: 26 }),
  P('D', 'Perepelnyky', 280, 330, 'east'),
  P('E', 'Korostiatyn', -SIDE_X + 40, Math.round(mid(-SIDE_X + 40) + 80), 'west', { radius: 24 }),
  P('F', 'Zborov', 0, Math.round(mid(0)), 'centre', { radius: 32 }),
  P('G', 'Ozerna', SIDE_X - 40, Math.round(mid(SIDE_X - 40) - 82), 'east', { radius: 24 }),
  P('H', 'Presivtsi', -320, -310, 'west'),
  P('I', 'Hill 392 ‘Mogila’', 90, -250, 'centre', { radius: 26 }),
  P('J', 'Hodiv', 380, -280, 'east'),
  P('K', 'Lemberg road', 0, -470, 'centre'),
] as any[];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

/** A Galician wooden church (tserkva): three log frames in a row, the middle one tallest, each under an onion dome and a cross. */
function tserkva(props: any, x: number, z: number, yaw: number) {
  const g = props.terrain.heightAt(x, z), logs = 0x5c4630, roof = 0x3c463a, dome = 0x4e6a58;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  for (const [lz, w, h] of [[-6.5, 5, 5], [0, 7, 6.5], [6.5, 5, 5]]) {
    const [px, pz] = PropBuilder.local(x, z, yaw, 0, lz);
    props.box('plain', px, g + h / 2, pz, w, h + 0.4, w, yaw, logs);
    props.box('plain', px, g + h + 0.4, pz, w + 1.2, 0.5, w + 1.2, yaw, roof);           // the shingled skirt roof
    const t = w * 0.62, th = h * 0.35;
    props.box('plain', px, g + h + 0.6 + th / 2, pz, t, th, t, yaw, logs);              // the drum
    const r = w * 0.36, top = g + h + 0.6 + th;
    m.compose(new THREE.Vector3(px, top + r * 1.1, pz), q, new THREE.Vector3(1, 1.3, 1));
    props.push('plain', new THREE.SphereGeometry(r, 10, 8), m, dome);                    // the onion
    m.compose(new THREE.Vector3(px, top + r * 2.6, pz), q, new THREE.Vector3(1, 1, 1));
    props.push('plain', new THREE.ConeGeometry(r * 0.45, r * 1.4, 8), m, dome);          // its point
    props.box('metal', px, top + r * 3.6, pz, 0.12, 1.4, 0.12, yaw, 0xb09a5a);           // the cross
    props.box('metal', px, top + r * 3.75, pz, 0.8, 0.12, 0.12, yaw, 0xb09a5a);
  }
  props.cover.addBox({ x, z, yaw, length: 7, thickness: 18, height: 6 });
}

export default {
  id: 'zborov',
  name: 'Zborov',
  description: '2 July 1917, the Kerensky offensive: the Czechoslovak Brigade of the Russian army storms the deep Austro-Hungarian trench lines on the heights by Zborov in Galicia. Open Podolian wheat and sunflower fields, the Strypa in marshy meadows with a mill pond, Hill 392 and the Lysa Hora, the Lemberg–Tarnopol railway over its bridge.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['ah'] }, // (the Czechoslovak Rifle Brigade fights as the Russian army; the k.u.k. 19th Infantry Division)
  sides: { nato: 'Russia', pact: 'Austria-Hungary' },
  conditions: { time: 'dawn', weather: 'clear' }, // (the assault went in at five on a hot July morning)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1917_07,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1917_07, cell: 85, weights: [0.15, 0.2, 0.4, 0.25] as any }),  // (stubble: the ripening wheat; meadow: sunflowers)

  theme: {
    // a hot, hazy July dawn over the Podolian upland
    fogColor: 0xc0b8a6, fogDensity: 0.0012, skyTop: 0x6a8cb4, skyHorizon: 0xd8d0c0, skyBottom: 0x8a8678,
    sunColor: 0xffe2b8, sunIntensity: 1.9, sunDisk: 0.3, clouds: 0.25, cloudLight: 0xf2ece2, cloudDark: 0x9c9ca0,
    sunDir: [0.65, 0.4, 0.35], hemiSky: 0xc8ccd4, hemiGround: 0x5e5638, hemiIntensity: 1.25, rimColor: 0xd0ccc4, rimIntensity: 0.25,
    terrain: {
      grass: '#5e6c36', grassAlt: '#54632f', dryGrass: '#a49656', dirt: '#5a4a38', rock: '#88847a', strip: '#4a3e2e',
      pasture: '#5c6c36', ploughed: '#4e4232', stubble: '#b8a458', meadow: '#7c8232',   // (black earth, wheat, sunflowers)
      farmX: [460, 600], farmZ: [520, 640], roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (railD(x, z) < 2.6) return [0x6e665a, 0.9];                                   // the ballast
        if (onRoad(x, z)) return [0x6a5a46, 0.85];                                       // dirt roads
        if (y < 1.6 && away(x, z) < HW + 12) return [0x7a7a52, 0.85];                     // the reedy banks
        const m = marshAt(x, z);
        if (m > 0.3) return [0x4e5a30, Math.min(0.85, m)];                                 // wet meadow and sedge
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** Each side's two lines (three belts of wire before the fire trench, one before the support line), MG posts at the crossings, the bombardment's craters. */
  battlefield(game: any) {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      for (const line of [0, 1]) {
        const pts: number[][] = [];
        for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato', line)]);   // (left to right as its owner looks)
        for (const w of trenchLine(pts, f, { wireAt: line ? 18 : 22, belts: line ? 1 : 3, gapEvery: line ? 50 : 70 })) {
          if (roadD(w.x, w.z) < 8 || railD(w.x, w.z) < 6) continue;
          works.push(w);
        }
        for (const bx of [-SIDE_X, 0, SIDE_X]) works.push({ kind: 'mgNest', x: bx + 15 * s, z: trenchZ(bx + 15 * s, f === 'nato', line) - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
      }
    }
    const dens = (x: number, z: number) => { const dz = Math.abs(z) - 115; return 0.9 * Math.exp(-((dz / 45) ** 2)) + 0.03; };
    const blasts = [...shellField(1917, { x: 500, z: 560 }, dens).filter((b: number[]) => b[1] >= 0), ...shellField(1918, { x: 500, z: 560 }, dens).filter((b: number[]) => b[1] < 0)]
      .filter((b: number[]) => away(b[0], b[1]) > HW + 12 && !onRoad(b[0], b[1]) && railD(b[0], b[1]) > 6 && points.every((p) => Math.hypot(p.x - b[0], p.z - b[1]) > 32));
    const r = mulberry32(1917);
    const ruins = game.buildings.list.filter((b: any) => Math.hypot(b.x, b.z - mid(b.x)) < 100 && r() < 0.25).map((b: any) => b.index);
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, r = 0) => away(x, z) < HW + 6 + r;
    const trenchBand = (x: number, z: number) => [0, 1].some((l) => Math.abs(z - trenchZ(x, z > mid(x), l)) < (l ? 22 : 34));
    const skip = (x: number, z: number) => wet(x, z, 8) || roadD(x, z) < 8 || railD(x, z) < 9 || trenchBand(x, z) || marshAt(x, z) > 0.4;

    // Zborov astride the Strypa: town houses round the bridge, the Greek-Catholic church on the north bank, the town hall on the south
    const church = { x: 36, z: mid(36) + 52 }, hall = { x: -34, z: mid(-34) - 50 };
    props.rand = mulberry32(1917_1);
    for (let i = 0, n = 0; n < 26 && i < 500; i++) {
      const a = props.rand() * Math.PI * 2, d = 22 + props.rand() * 62, x = Math.cos(a) * d * 1.3, z = mid(x) + Math.sin(a) * d;
      if (wet(x, z, 10) || roadD(x, z) < 7 || railD(x, z) < 10 || Math.hypot(x - church.x, z - church.z) < 18 || Math.hypot(x - hall.x, z - hall.z) < 14) continue;
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2, width: 7 + props.rand() * 3, depth: 8, storeys: 1 + (props.rand() < 0.4 ? 1 : 0), damaged: 0.15 });
      n++;
    }
    props.church({ x: church.x, z: church.z, yaw: 0.05 });
    props.townHouse({ x: hall.x, z: hall.z, yaw: Math.PI, width: 12, depth: 10, storeys: 2, name: 'town hall', damaged: 0.1 });
    // the water mill at the foot of the pond, its log pile across the water
    props.townHouse({ x: -100, z: mid(-100) - 24, yaw: 0, width: 9, depth: 8, storeys: 2, name: 'water mill', damaged: 0.1 });
    props.logPile({ x: -104, z: mid(-104) + 24, yaw: 0.2, length: 7 });
    // Zborov station by the line on the north bank, a halt and a few wagons on the south
    const st = { x: 165, z: 200 };
    props.townHouse({ x: st.x, z: st.z, yaw: Math.atan2(RAIL[2][0] - RAIL[1][0], RAIL[2][1] - RAIL[1][1]) + Math.PI / 2, width: 14, depth: 8, storeys: 2, name: 'railway station', damaged: 0.1 });
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 20));
      for (let k = 0; k < n; k++) props.rails({ x0: ax + ((bx - ax) * k) / n, z0: az + ((bz - az) * k) / n, x1: ax + ((bx - ax) * (k + 1)) / n, z1: az + ((bz - az) * (k + 1)) / n });
    }
    const sy = Math.atan2(RAIL[6][0] - RAIL[5][0], RAIL[6][1] - RAIL[5][1]);
    for (const t of [0.35, 0.55]) props.wagon({ x: RAIL[5][0] + (RAIL[6][0] - RAIL[5][0]) * t, z: RAIL[5][1] + (RAIL[6][1] - RAIL[5][1]) * t, yaw: sy, kind: 'box', color: 0x4e3a2a });
    props.flatHouse({ x: 172, z: -210, yaw: sy + Math.PI / 2, width: 8, depth: 6, name: 'railway halt' });
    // the villages of wooden houses, an onion-domed wooden church in each (two a side)
    for (const p of points) {
      if ('AKF'.includes(p.id)) continue;
      const hill = p.id === 'C' || p.id === 'I';
      farmVillage(props, p.x, p.z, hill ? 3 : 7, 1917 * 10 + Math.round(p.x * 3 + p.z * 7), skip, hill ? 1.3 : 1.1);
    }
    for (const [x, z, yaw] of [[-336, 344, 0.2], [302, 352, -0.3], [-298, -332, Math.PI + 0.3], [404, -300, Math.PI - 0.2]]) tserkva(props, x, z, yaw);
    // the war crosses on the two hills
    for (const [x, z] of [[-130, 262], [110, -265]]) { props.box('plain', x, terrain.heightAt(x, z) + 1.6, z, 0.25, 3.2, 0.25, 0, 0x4a3a2a); props.box('plain', x, terrain.heightAt(x, z) + 2.4, z, 1.6, 0.2, 0.2, 0, 0x4a3a2a); }
    // farmsteads, haystacks and field walls over each half's fields
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    for (let tries = 0, n = 0; n < 120 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x, z - mid(x)) < 130 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z) || Math.hypot(x - st.x, z - st.z) < 20) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: st.x, z: st.z, r: 16 },
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) || railD(x, z) < 5 || Math.hypot(x * 0.77, z - mid(x)) < 95 }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
    const tN = 0.24, tP = evenThreshold(wood, tN, (x, z) => z > mid(x));   // (small woods only: the upland is open fields)
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 2400, hedges: 1000, autumn: 0, broadleaf: 0.8,
      forest: (x: number, z: number) => {
        if (wet(x, z, 3)) return -1;
        if (trenchBand(x, z)) return 0.03;
        if (marshAt(x, z) > 0.4) return 0.2;                                  // willow and alder in the wet meadows
        if (away(x, z) < 45) return 0.25;                                     // willows along the Strypa
        return Math.abs(x) > 470 || wood(x, z) > (z > mid(x) ? tN : tP) ? 0.85 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
