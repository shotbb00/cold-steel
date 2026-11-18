// Remagen, 7 March 1945 (1945 only; the big field, 1.0 × 1.12 km). The Rhine gorge: the river across the middle of
// the map between steep slopes of slate and vineyards that men climb slowly and tanks crawl up (`soft`), a narrow
// terrace on each bank with its town, the riverside road and the railway, and the wooded plateau above. In the middle the Ludendorff
// Bridge — the railway bridge the 9th Armored Division found still standing that afternoon, its steel arch between
// the four stone towers — and on the far bank the Erpeler Ley, the basalt cliff over the bridge's east end with the
// railway tunnel in its foot. Out on the flanks the engineers' bridges of the days after: the treadway at Kripp and
// the heavy pontoon bridge. The quick way down to the river for vehicles is by the side valleys’ roads.
// The Americans come down from the west bank's plateau (+z), the Wehrmacht holds the east bank (-z). Point-mirrored
// like the other land maps, so neither side gets the better ground: Remagen faces Erpel, the Apollinarisberg the Ley.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, commandPost, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const SIDE = 220;      // the side valleys' roads, and the engineers' bridges at their feet (the routes stay short enough to plan)
const HW = 42;         // the Rhine's half-width (narrower than the real 270 m: the battle is on its banks)
const PLATEAU = 32;    // the plateau above the gorge
const TERRACE = 104;   // where the slope starts, from the river's middle…
const TOP = 186;       // …and where the plateau does
const RAIL = HW + 12;  // the riverside railway on each bank
const ROAD = HW + 21;  // the riverside road (Reichsstraße 9 on the west bank)
const HILL = { x: 62, a: 112, r: 46, h: 46 }; // the Apollinarisberg over Remagen; mirrored, the Erpeler Ley over the bridge
const noise = createNoise2D(1945_03);
const lerp = (a, b, k) => a + (b - a) * k;
const sym = (f) => (x, z) => (f(x, z) + f(-x, -z)) * 0.5; // point-symmetric noise
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

// an odd function: the river is point-mirrored too
const riverZ = (x) => 9 * Math.sin(x * 0.004) + 4 * Math.sin(x * 0.011);
const away = (x, z) => Math.abs(z - riverZ(x));
const hillZ = (m) => riverZ(m * HILL.x) + m * HILL.a; // (the hill's z on bank m: +1 ours, -1 theirs)
/** The spurs: a flat-topped ridge out of the plateau that ends at the terrace in a cliff (the Ley's basalt face to the Rhine). */
const HILLS = (x, z) => {
  const a = away(x, z), dx = Math.abs(x - Math.sign(z - riverZ(x)) * HILL.x);
  return HILL.h * Math.exp(-((dx / HILL.r) ** 4)) * smoothstep(HILL.a - 40, HILL.a - 16, a) * (1 - 0.35 * smoothstep(HILL.a + 40, HILL.a + 150, a));
};

const river = createRiver({
  path: riverZ,
  halfWidth: HW,
  level: 0,
  depth: 3,
  valley: 58,
  crossings: [
    { name: 'Kripp treadway', x: -SIDE, kind: 'bridge', width: 7, pontoon: true },
    { name: 'Ludendorff Bridge', x: 0, kind: 'bridge', width: 12, arch: { rise: 15, panels: 12, rails: true } }, // (two tracks and the footways)
    { name: 'Heavy pontoon bridge', x: SIDE, kind: 'bridge', width: 7, pontoon: true },
  ],
});

/** The side valleys' roads: straight down to the river, winding a little up on the plateau. */
const roadX = (rx, z) => rx + 9 * Math.sin(z * 0.012 + rx) * smoothstep(TOP, TOP + 80, away(rx, z));
const slopeStart = sym((x, z) => TERRACE + fbm(noise, x * 0.006 + 9, z * 0.006, 2) * 8);
const plateauN = sym((x, z) => fbm(noise, x * 0.004, z * 0.004, 4));
const woodsN = sym((x, z) => fbm(noise, x * 0.005 + 31, z * 0.005 - 4, 3));
const valleyK = (x, z) => {
  let k = 0;
  for (const rx of [-SIDE, 0, SIDE]) k = Math.max(k, smoothstep(36, 13, Math.abs(x - roadX(rx, z))));
  return k;
};

function height(x, z) {
  const a = away(x, z);
  const ax = Math.abs(x);
  let h = 2.3 + plateauN(x, z) * 0.6;                                        // the terrace
  const P = PLATEAU + plateauN(x, z) * 7;
  h += smoothstep(slopeStart(x, z), TOP, a) * (P - 2.3);                      // the gorge's slopes: steep slate
  h += smoothstep(TOP, TOP + 120, a) * plateauN(x * 2.3, z * 2.3) * 5;       // the plateau rolls
  h = Math.max(h, HILLS(x, z)); // the Apollinarisberg; the Ley
  h += smoothstep(460, 600, ax) * 12;                                        // the wooded edges
  // the side valleys: each road comes down at an easy grade, cut into the slope
  const ramp = 2.3 + (P - 2.3) * smoothstep(TERRACE - 25, TOP + 150, a);
  const v = valleyK(x, z) * smoothstep(TERRACE - 40, TERRACE - 10, a);
  if (v > 0) h = lerp(h, Math.min(h, ramp), v);
  for (const bz of [BASE_Z, -BASE_Z]) h += (P + 1 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}

/** Metres from the nearest road's middle: the side valleys' roads and the riverside roads. */
function roadDist(x, z) {
  let d = Math.abs(away(x, z) - ROAD);
  for (const rx of [-SIDE, 0, SIDE]) if (away(x, z) > HW + 8) d = Math.min(d, Math.abs(x - roadX(rx, z)));
  return d;
}

// ---- the control points (our half, mirrored: G mirrors E … K mirrors A)
const zAt = (x, a) => riverZ(x) + a;
const HALF: [string, string, number, number, string][] = [
  ['A', 'Meckenheim road', 0, 470, 'centre'],
  ['B', 'Birresdorf', -310, 300, 'west'],
  ['C', 'Remagen', 182, zAt(182, 78), 'east'],
  ['D', 'Apollinarisberg', HILL.x, hillZ(1), 'centre'],
  ['E', 'Kripp', -330, zAt(-330, 76), 'west'],
];
const MIRROR_NAMES = { E: ['G', 'Unkel'], D: ['H', 'Erpeler Ley'], C: ['I', 'Erpel'], B: ['J', 'Orsberg'], A: ['K', 'Kalenborn'] };
const flipSector = (s) => (s === 'west' ? 'east' : s === 'east' ? 'west' : 'centre');
const points: ControlPointDef[] = [
  ...HALF.map(([id, name, x, z, sector]) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : null, sector } as ControlPointDef)),
  { id: 'F', name: 'Ludendorff Bridge', x: 0, z: 0, owner: null, sector: 'centre', radius: 34 }, // (on the deck: whoever holds it stands on the bridge)
  ...HALF.map(([id, , x, z, sector]) => ({ id: MIRROR_NAMES[id][0], name: MIRROR_NAMES[id][1], x: -x, z: -z, owner: id === 'A' ? 'pact' : null, sector: flipSector(sector) } as ControlPointDef)),
].sort((a, b) => a.id.localeCompare(b.id)) as ControlPointDef[];

// ---- the bridges' looks: the Ludendorff Bridge's steel arch over its span, the engineers' treadways on floats
const STEEL = new THREE.MeshStandardMaterial({ color: 0x3c3f3d, roughness: 0.7, metalness: 0.45 });
/** Bars from a to b ([x, y, z]), merged into one mesh. */
function bars(list: [number[], number[], number][]) {
  const geos = list.map(([a, b, t]) => {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const g = new THREE.BoxGeometry(t, d.length(), t);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
    g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    return g;
  });
  const m = new THREE.Mesh(mergeGeometries(geos), STEEL);
  m.castShadow = m.receiveShadow = true;
  return m;
}
/** A two-hinged steel arch over the span (deck at y = deck), its trusses either side of the track, braced overhead. */
function steelArch(L, w, deck, rise, panels) {
  const list: [number[], number[], number][] = [];
  const top = (z) => deck + 0.6 + rise * (1 - (2 * z / L) ** 2);
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 + 0.35);
    for (let i = 0; i < panels; i++) {
      const z0 = -L / 2 + (L * i) / panels, z1 = z0 + L / panels;
      list.push([[x, top(z0), z0], [x, top(z1), z1], 0.7]);                     // the arch rib
      list.push([[x, deck + 0.5, z0], [x, deck + 0.5, z1], 0.55]);               // the deck girder
      list.push([[x, deck + 0.5, i < panels / 2 ? z0 : z1], [x, top(i < panels / 2 ? z1 : z0), i < panels / 2 ? z1 : z0], 0.22]); // diagonals
      if (i > 0) list.push([[x, deck + 0.5, z0], [x, top(z0), z0], 0.26]);       // verticals
    }
  }
  for (let i = 1; i < panels; i++) {
    const z = -L / 2 + (L * i) / panels;
    if (top(z) - deck > 7) list.push([[-(w / 2 + 0.35), top(z), z], [w / 2 + 0.35, top(z), z], 0.3]); // overhead bracing (clear of the trains)
  }
  return bars(list);
}
/**
 * Steel bridges on a river (world/River.js): a crossing with `arch: { rise, panels, rails }` keeps the stone causeway and gets a
 * steel arch over its span (it falls with the span when blown); one with `pontoon` is a treadway on floats instead. (Arnhem too.)
 */
export function steelBridges(river) {
  const stoneBridge = river.bridgeMesh;
  river.bridgeMesh = (c, stone, dark) => {
    if (!c.pontoon) {
      const g = stoneBridge.call(river, c, stone, dark);
      if (c.arch) {
        c.span.add(steelArch(c.spanL, c.width, river.deck, c.arch.rise, c.arch.panels));
        if (c.arch.rails) for (const sx of [-0.72, 0.72]) c.span.add(bars([[[sx, river.deck + 0.3, -c.spanL / 2], [sx, river.deck + 0.3, c.spanL / 2], 0.14]]));
      }
      return g;
    }
    // a pontoon bridge: steel deck plates on a row of floats every 6 m, a hand line along each side
    const g = new THREE.Group();
    const L = (river.halfWidth + 10) * 2;
    const span = new THREE.Group();
    span.position.y = river.deck;
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x4f5446, roughness: 0.8, metalness: 0.3 });
    const floatMat = new THREE.MeshStandardMaterial({ color: 0x3a3e34, roughness: 0.85 });
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; span.add(m); };
    add(new THREE.BoxGeometry(c.width + 0.6, 0.3, L), deckMat, 0, 0.05, 0);
    for (let z = -river.halfWidth - 2; z <= river.halfWidth + 2; z += 6) add(new THREE.BoxGeometry(c.width + 2.4, 1, 4.2), floatMat, 0, river.level + 0.15 - river.deck, z);
    for (const sx of [-1, 1]) {
      add(new THREE.BoxGeometry(0.06, 0.06, L), floatMat, sx * (c.width / 2 + 0.2), 1, 0);
      for (let z = -L / 2 + 1; z < L / 2; z += 4) add(new THREE.BoxGeometry(0.08, 1, 0.08), floatMat, sx * (c.width / 2 + 0.2), 0.5, z);
    }
    g.add(span);
    g.position.set(c.x, 0, c.z);
    c.span = span;
    c.spanL = L;
    return g;
  };
  return river;
}
steelBridges(river);

/** The gorge's slopes and the spurs' faces: a speed factor (1 firm). (Not `steep`: that would close the bridges' decks to tanks too.) */
function soft(x: number, z: number, foot: boolean) {
  if (roadDist(x, z) < 6) return 1;
  const a = away(x, z), ss = slopeStart(x, z);
  const slope = smoothstep(ss + 5, ss + 22, a) * (1 - smoothstep(TOP - 22, TOP - 5, a)) * (1 - valleyK(x, z));
  const dx = Math.abs(x - Math.sign(z - riverZ(x)) * HILL.x);
  const face = Math.exp(-((dx / HILL.r) ** 4)) * smoothstep(HILL.a - 44, HILL.a - 36, a) * (1 - smoothstep(HILL.a - 20, HILL.a - 12, a));
  const k = Math.max(slope, face);
  return 1 - k * (foot ? 0.3 : 0.5); // (no more: a heavier toll and the routes round it grow too long to plan)
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

export default {
  id: 'remagen',
  name: 'Remagen',
  description: 'March 1945, the Rhine gorge: the Ludendorff Bridge still standing between its stone towers, steep vineyards and the Erpeler Ley over it, the towns on their narrow terraces. Vehicles come down by the side valleys. Mirrored to keep it fair.',
  epochs: ['1945'],
  region: 'europe',
  sides: { nato: 'United States', pact: 'Germany' },
  armies: { nato: ['us'], pact: ['wh'] }, // (the 9th Armored Division against the Wehrmacht's bridge guard and what came to retake it)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1945_03,
  height,
  river,
  soft, // (the slate slopes and the Ley's face: men climb slowly, tanks crawl — the side valleys' roads are the quick way)
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => (away(x, z) > TOP + 30 && woodsN(x, z) > 0.12 ? 0.8 : 0),
  fields: createFields({ seed: 1945_03, cell: 66 }),

  theme: {
    // a raw, overcast March afternoon in the gorge: low cloud on the hills, the river grey
    fogColor: 0xa4aaac, fogDensity: 0.0019,
    skyTop: 0x6c767e, skyHorizon: 0xb8bcbc, skyBottom: 0x6e706c,
    sunColor: 0xe2e0d6, sunIntensity: 1.6, sunDisk: 0.06,
    clouds: 0.9, cloudLight: 0xc4c6c4, cloudDark: 0x70767a,
    sunDir: [0.35, 0.5, -0.78],
    hemiSky: 0xbcc6cc, hemiGround: 0x48443a, hemiIntensity: 1.45,
    rimColor: 0xb4bcc4, rimIntensity: 0.22,
    terrain: {
      grass: '#58623a', grassAlt: '#4c5634', dryGrass: '#7c704e', dirt: '#56483a', rock: '#56544e',
      pasture: '#5a6438', ploughed: '#4e3e30', stubble: '#7e7052', meadow: '#5e6a3c',
      farmX: [430, 500], farmZ: [540, 600], roads: [], roadZ: 0, // (no default tracks: the roads are painted below)
      surface(x, z, y) {
        const a = away(x, z);
        if (a > HW + 6 && a < TERRACE + 20 && Math.abs(a - RAIL) < 2.2) return [0x47433e, 0.9];   // ballast
        const rd = roadDist(x, z);
        if (rd < 3.6 && a > HW + 4) return [0x6c665c, 0.85];                                     // the roads
        if (a < TERRACE - 4) return a < HW + 8 ? null : [0x5c6040, 0.55];                          // the terrace's gardens and verges
        if ((a < TOP - 6 && valleyK(x, z) < 0.5) || HILLS(x, z) > 9) return [noise(x * 0.05, z * 0.05) > 0 ? 0x4a4642 : 0x5a4c3c, 0.85];      // the slate slopes and the vineyards' soil
        return y > 12 ? [0x58623a, 0.75] : null;                                                  // the plateau's grass (not rock)
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE, 0, SIDE] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE, 0, SIDE] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const flat = (x, z, r) => { // the footprint level enough for a house
      const hs = [[r, 0], [-r, 0], [0, r], [0, -r]].map(([dx, dz]) => terrain.heightAt(x + dx, z + dz));
      return Math.max(...hs) - Math.min(...hs) < 1.3;
    };

    /** A stone tower of the Ludendorff Bridge: dark basalt, slit windows on three floors, battlements. Occupiable. */
    const bridgeTower = (x, z, yaw) => {
      const b = props.beginBuilding('bridge tower', x, z, yaw, 6.6, 6.6);
      const stone = 0x4e4a46;
      b.plaster = stone;
      props.shell(b, { height: 13.5, storeys: 3, key: 'stone', color: stone, t: 0.9, bay: 2.2, sill: 1.5, head: 2.6, frame: 0x34302c, upper: true, front: [0] });
      for (let s = 1; s < 3; s++) props.piece('plain', b, 0, s * 4.5, 0, 5.6, 0.25, 5.6, 0x4a4038);
      props.piece('stone', b, 0, 13.6, 0, 6.9, 0.4, 6.9, 0x45413c);
      for (let i = 0; i < 4; i++) {
        for (const s of [-1, 1]) {
          const o = -2.6 + i * 1.75;
          props.piece('stone', b, o, 14.4, s * 3.1, 0.9, 1.2, 0.6, stone);   // battlements
          props.piece('stone', b, s * 3.1, 14.4, o, 0.6, 1.2, 0.9, stone);
        }
      }
      props.piece('stone', b, 0, 0.25, 0, 7.4, 0.8, 7.4, 0x5e5850); // plinth
      props.endBuilding();
    };

    // ---- the bridgeheads: the four towers, the railway on and off the bridge
    const lud = river.crossings[1];
    mirrored(props, 1945_0307, (m, flip) => {
      for (const sx of [-1, 1]) bridgeTower(sx * 10.9 * m, lud.z + (HW + 15) * m, flip);
      props.rails({ x0: 0, z0: lud.z + (HW + 10) * m, x1: 0, z1: lud.z + (HW + 24) * m });
    });

    // ---- the riverside railway and road on each bank; the tunnel into the Ley
    props.rand = mulberry32(31);
    for (const m of [1, -1]) {
      for (let x = -560; x < 560; x += 20) props.rails({ x0: x, z0: riverZ(x) + m * RAIL, x1: x + 20, z1: riverZ(x + 20) + m * RAIL });
    }
    {
      // the bridge's line on the east bank runs straight into the cliff: the tunnel mouth where the ground rises
      const cx = -HILL.x, cz = hillZ(-1), x0 = 0, z0 = lud.z - (HW + 24);
      let t = 0;
      for (; t < 1; t += 0.01) if (terrain.heightAt(lerp(x0, cx, t), lerp(z0, cz, t)) > 8) break;
      const px = lerp(x0, cx, t), pz = lerp(z0, cz, t), yaw = Math.atan2(x0 - cx, z0 - cz);
      props.rails({ x0, z0, x1: px, z1: pz });
      const g = terrain.heightAt(px, pz);
      const P = (lx, ly, lz, sx, sy, sz, c) => { const [wx, wz] = PropBuilder.local(px, pz, yaw, lx, lz); props.box('stone', wx, g + ly, wz, sx, sy, sz, yaw, c); };
      P(0, 3, -2, 15, 13, 5, 0x5a5650);      // the portal's masonry, sunk into the rock
      P(0, 3.4, 0.6, 6, 6.6, 0.4, 0x141414);  // the dark mouth
      P(0, 7.4, 0.7, 7.4, 1.2, 0.6, 0x6a6660); // the arch's keystone course
      for (const s of [-1, 1]) P(s * 5.6, 6, 0.5, 1.4, 12, 1.2, 0x625e58);
      cover.addBox({ x: px, z: pz, yaw, length: 15, thickness: 4, height: 9 });
      // and on the west bank the bridge's line swings into the riverside railway
      props.rails({ x0: 0, z0: lud.z + HW + 24, x1: 60, z1: zAt(60, RAIL) });
    }

    // ---- Remagen on its terrace (and, mirrored, Erpel): two rows of houses along the riverside road, a church, the station
    mirrored(props, 1945_0308, (m, flip) => {
      const r = props.rand;
      for (const [row, yaw] of [[ROAD + 9, Math.PI], [ROAD + 25, 0]] as [number, number][]) {
        for (let x = 100 + r() * 4; x < 335; x += 11 + r() * 5) {
          const a = row + (r() - 0.5) * 2, z = zAt(x, a), w = 8 + r() * 3, d = 8 + r() * 2;
          if (r() < 0.12 || nearPoint(x * m, z * m, 15) || Math.abs(x - 140) < 22 || Math.abs(x - 270) < 11 || Math.abs(x - SIDE) < 14 || !flat(x * m, z * m, 5) || a + d / 2 > slopeStart(x, z) - 2) continue;
          props.townHouse({ x: x * m, z: z * m, yaw: yaw + flip, width: w, depth: d, storeys: r() < 0.6 ? 2 : 3, name: m > 0 ? 'house in Remagen' : 'house in Erpel', damaged: 0.3 });
        }
      }
      props.church({ x: 130 * m, z: zAt(130, ROAD + 13) * m, yaw: Math.PI / 2 + flip });
      props.townHouse({ x: 270 * m, z: zAt(270, ROAD + 10) * m, yaw: Math.PI + flip, width: 18, depth: 8, storeys: 2, name: 'station', damaged: 0.2 });
      for (const [x, kind, c] of [[90, 'box', 0x5a3426], [102, 'open', 0x4a4038], [114, 'box', 0x4e3a2a], [-80, 'tank', 0x2a2a2a]] as [number, string, number][]) {
        props.wagon({ x: x * m, z: zAt(x, RAIL) * m, yaw: Math.PI / 2, kind, color: c });
      }
      // the riverside: a quay wall's low parapet, a barricade on the road at the town's end
      for (let x = 100; x < 335; x += 14) if (Math.abs(x - SIDE) > 14) props.lowWall({ x: x * m, z: zAt(x, HW + 6.5) * m, yaw: flip, length: 10, height: 0.9, color: 0x6e6a62 });
      props.logBarricade({ x: 104 * m, z: zAt(104, ROAD) * m, yaw: Math.PI / 2 + flip, length: 6 });
      // the riverside village out on the flank (Kripp; Unkel) and the hamlet on the plateau (Birresdorf; Orsberg)
      for (const [px, pa, n] of [[-330, 76, 6], [-310, 300, 6]]) {
        const pz = pa > 200 ? pa : zAt(px, pa);
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + r() * 0.5, d = 16 + r() * 10;
          const x = px + Math.cos(ang) * d, z = pz + Math.sin(ang) * d;
          if (roadDist(x, z) < 8 || !flat(x * m, z * m, 5) || away(x, z) < ROAD + 5) continue;
          if (pa > 200) props.house({ x: x * m, z: z * m, yaw: ang + Math.PI / 2 + flip, width: 8 + r() * 3, depth: 6 + r() * 2 });
          else props.townHouse({ x: x * m, z: z * m, yaw: ang + Math.PI / 2 + flip, width: 8, depth: 8, storeys: 2, name: 'house', damaged: 0.2 });
        }
      }
    });
    // the hilltops: the Apollinariskirche on its hill over Remagen; on the Ley, the flak position and its trenches
    props.church({ x: HILL.x, z: hillZ(1) + 26, yaw: Math.PI });
    props.rand = mulberry32(88);
    props.sandbagRing({ x: -HILL.x + 6, z: hillZ(-1) - 22, radius: 6, toward: 1 });
    for (const [dx, dz] of [[-14, 6], [13, 8], [0, -14]]) props.sandbagRing({ x: -HILL.x + dx, z: hillZ(-1) + dz, radius: 3.5, toward: 1 });

    // ---- the vineyards: rows of stakes along the contour, dry-stone terrace walls, on the slopes where the ground is not wood
    const vines = sym((x, z) => fbm(noise, x * 0.008 - 13, z * 0.008 + 5, 2));
    const slopeBand = (x, z) => { const a = away(x, z); return a > slopeStart(x, z) + 4 && a < TOP - 4; };
    props.rand = mulberry32(1945_0309);
    for (const m of [1, -1]) {
      for (let x = -490; x < 490; x += 9) {
        for (let a = TERRACE - 6; a < TOP; a += 3) {
          const z = zAt(x, a) * m, wx = x * m;
          if (!slopeBand(wx, z) || vines(wx, z) < -0.05 || valleyK(wx, z) > 0.05 || nearPoint(wx, z, 26)) continue;
          const yaw = Math.atan2(1, (riverZ(x + 1) - riverZ(x - 1)) / 2) + (m < 0 ? Math.PI : 0) - Math.PI / 2;
          if (Math.round(a) % 15 < 3 && Math.round(x / 9) % 2 === 0) { props.lowWall({ x: wx, z, yaw, length: 8, height: 1.0, color: 0x5a5650 }); continue; } // a terrace wall
          props.box('plain', wx, terrain.heightAt(wx, z) + 0.45, z, 7, 0.95, 0.07, yaw, 0x7a6a52);
        }
      }
    }

    // ---- farms and cover up on the plateau (mirrored), the command posts
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'wrecks', 'hay', 'farm'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 70 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = 30 + rand() * (bounds.z - 50);
      if (away(x, z) < TOP + 15 || z < 0 || sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 30 * 30)) continue;
      if (Math.hypot(x, z - BASE_Z) < 45 || nearPoint(x, z, 34) || roadDist(x, z) < 10) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x, z) => away(x, z) < ROAD + 4 || roadDist(x, z) < 7 }];
    // woods on the plateau and the steep ground the vines leave; scrub on the Ley; a few trees in the gardens
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 6000, broadleaf: 0.6, autumn: 0.15, maxY: 70,
      forest: (x, z) => {
        const a = away(x, z);
        if (a < ROAD + 4 || nearPoint(x, z, 26) || roadDist(x, z) < 8) return -1;
        if (a < TERRACE) return 0.02;
        if (slopeBand(x, z)) return vines(x, z) < -0.05 ? 0.55 : -1;
        if (Math.abs(x) > 470) return 0.9;
        return woodsN(x, z) > 0.12 ? 0.85 : -0.03;
      },
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.5, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
