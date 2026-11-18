// Berlin, the end of April 1945: the government quarter (1945 only; the big field, 1.0 × 1.12 km). The Spree runs
// east–west through the middle in its stone embankments, with three bridges over it: the Luther Bridge (west), the
// Moltke Bridge (centre, the one the Red Army stormed on the night of 28 April) and the Kronprinzen Bridge (east).
// South of the river the Wehrmacht and the Volkssturm hold "Himmler's house" (the Ministry of the Interior), the
// Kroll Opera ruins, the Königsplatz — open ground, cratered, an anti-tank ditch across it — and behind it the
// Reichstag, the key; the Zoo flak tower out east. North of the river, in Moabit, the twins of all that: the Lehrter
// prison, Lehrter Bahnhof, the Humboldthafen warehouses and the Humboldthain flak tower. Rubble streets, tram lines,
// burnt-out cars and tanks, barricades. The Red Army (nato) comes from the north (+z), the Wehrmacht from the south;
// point-mirrored like the other maps, so neither side gets the better ground — only the names differ. The defenders
// have the U-Bahn: entrances on their side joined by tunnels (systems/Caves.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, commandPost, mirrored, shellField } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 300;   // the side bridges and the flank landmarks
const noise = createNoise2D(1945_04);

// the Spree: an odd function, so the river is point-mirrored too
const riverZ = (x: number) => 12 * Math.sin(x * 0.006) + 5 * Math.sin(x * 0.015);
const river = createRiver({
  path: riverZ,
  halfWidth: 14,
  level: 0,
  depth: 3,
  valley: 26,
  crossings: [
    { name: 'Luther Bridge', x: -SIDE_X, kind: 'bridge', width: 7 },
    { name: 'Moltke Bridge', x: 0, kind: 'bridge', width: 10 },
    { name: 'Kronprinzen Bridge', x: SIDE_X, kind: 'bridge', width: 7 },
  ],
});
const fromRiver = (x: number, z: number) => Math.abs(z - riverZ(x));

// the city: streets north–south at STREETS_X, east–west at STREETS_Z (|z|; mirrored), inside |x| < CITY_X, |z| < CITY_Z
const CITY_X = 450;
const CITY_Z = 420;
const STREETS_X = [-400, -300, -215, -130, -60, 0, 60, 130, 215, 300, 400];
const STREETS_Z = [60, 130, 200, 270, 340, 410];
const STREET = 5;
const RIVERSIDE = 44;   // |z| where the first row of blocks starts (the embankment road between it and the water)

/** 1 inside the city, fading to 0 at its edge. */
const city = (x: number, z: number) => smoothstep(CITY_X + 30, CITY_X - 10, Math.abs(x)) * smoothstep(CITY_Z + 30, CITY_Z - 10, Math.abs(z));
/** The Königsplatz (south) and its twin, the Kleiner Tiergarten (north): open squares, no streets, no blocks. */
const onPlaza = (x: number, z: number) => Math.abs(x) < 75 && Math.abs(z) > 35 && Math.abs(z) < 215;
/** The open middle of each square (craters, the ditch). */
const square = (x: number, z: number) => Math.abs(x) < 70 && Math.abs(z) > 38 && Math.abs(z) < 140;

function street(x: number, z: number) {
  if (onPlaza(x, z)) return 0;
  let k = 0;
  for (const sx of STREETS_X) k = Math.max(k, smoothstep(STREET + 1, STREET - 0.5, Math.abs(x - sx)));
  for (const sz of STREETS_Z) k = Math.max(k, smoothstep(STREET + 1, STREET - 0.5, Math.abs(Math.abs(z) - sz)));
  if (Math.abs(z) < RIVERSIDE + 2 && fromRiver(x, z) > 20) k = Math.max(k, 0.8); // the embankment roads
  return k * city(x, z);
}

/** The S-Bahn behind Lehrter Bahnhof (north-east) and its twin past the Kroll Opera (south-west). */
const onRail = (x: number, z: number) => (x > 200 && x < 500 && Math.abs(z - 165) < 4) || (x < -200 && x > -500 && Math.abs(z + 165) < 4);

/** The anti-tank ditch across each square (gap in the middle for the road). */
const ditch = (x: number, z: number) => smoothstep(10, 14, Math.abs(x)) * smoothstep(62, 56, Math.abs(x)) * smoothstep(5, 1.5, Math.abs(Math.abs(z) - 100));

function height(x: number, z: number) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  let h = fbm(noise, x * 0.005, z * 0.005, 4) * 3 + fbm(noise, x * 0.05 + 3, z * 0.05, 2) * 0.3;
  h += smoothstep(500, 620, ax) * 14 + smoothstep(560, 680, az) * 12;   // the ground rising beyond the edges
  h += (1.6 - h) * city(x, z) * 0.9;                                    // the city on level ground
  h -= ditch(x, z) * 2.2;
  for (const bz of [BASE_Z, -BASE_Z]) h += (1.4 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Moabit', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Humboldthain flak tower', x: -SIDE_X, z: 150, owner: null, sector: 'west' },
  { id: 'C', name: 'Lehrter prison', x: 0, z: 150, owner: null, sector: 'centre', radius: 26 },
  { id: 'D', name: 'Lehrter Bahnhof', x: SIDE_X, z: 100, owner: null, sector: 'east' },
  { id: 'E', name: 'Humboldthafen', x: -165, z: 55, owner: null, sector: 'west' },
  { id: 'F', name: 'Moltke Bridge', x: 0, z: 0, owner: null, sector: 'centre', radius: 32 }, // reaches both bridgeheads
  { id: 'G', name: "Himmler's house", x: 165, z: -55, owner: null, sector: 'east' },
  { id: 'H', name: 'Kroll Opera', x: -SIDE_X, z: -100, owner: null, sector: 'west' },
  { id: 'I', name: 'Reichstag', x: 0, z: -150, owner: null, sector: 'centre', radius: 26 },
  { id: 'J', name: 'Zoo flak tower', x: SIDE_X, z: -150, owner: null, sector: 'east' },
  { id: 'K', name: 'Tiergarten', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

/** The U-Bahn entrances (systems/Caves.js): the defenders' tunnels under the government quarter. */
const CAVES = [
  { name: 'U-Bahn Königsplatz', x: -55, z: -60 },
  { name: 'U-Bahn Reichstag', x: 55, z: -222 },
  { name: "U-Bahn Himmler's house", x: 224, z: -69 },
  { name: 'U-Bahn Kroll Opera', x: -206, z: -139 },
  { name: 'U-Bahn Zoo', x: 224, z: -209 },
  { name: 'U-Bahn Tiergarten', x: -121, z: -279 },
  { name: 'U-Bahn Brandenburger Tor', x: 69, z: -349 },
  { name: 'U-Bahn Potsdamer Platz', x: 309, z: -349 },
];

export default {
  id: 'berlin',
  name: 'Berlin',
  description: 'April 1945, the government quarter: the Spree and the Moltke Bridge, the cratered Königsplatz, Himmler\'s house, the Kroll Opera and the Reichstag. The last fight, from house to house and through the U-Bahn.',
  epochs: ['1945'],
  region: 'east', // (the menu's Eastern Front: maps/index.js REGIONS)
  sides: { nato: 'Soviet Union', pact: 'Germany' },
  armies: { nato: ['sov'], pact: ['wh', 'fj'] }, // (the 9th Fallschirmjäger Division fought in Berlin too)
  airfields: [], // (no runway in the government quarter: the air comes in from the map edge — systems/Airfields.js)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1945,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1945, cell: 70 }),

  theme: {
    // an overcast spring day, the city burning: brown smoke hanging over everything
    fogColor: 0x9a948a,
    fogDensity: 0.0022,
    skyTop: 0x6a6c6e,
    skyHorizon: 0xaaa298,
    skyBottom: 0x6e6a64,
    sunColor: 0xf0e2c8,
    sunIntensity: 1.25,
    sunDisk: 0.04,
    clouds: 0.92,
    cloudLight: 0xb8b2a8,
    cloudDark: 0x5e5a56,
    sunDir: [0.45, 0.5, 0.7],
    hemiSky: 0xc4c2ba,
    hemiGround: 0x5a564c,
    hemiIntensity: 1.35,
    rimColor: 0xc8c0b4,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5a6040',
      grassAlt: '#50563a',
      dryGrass: '#7a7250',
      dirt: '#5a5044',
      rock: '#76726a',
      pasture: '#5c683c',
      ploughed: '#4e4236',
      stubble: '#7c7250',
      meadow: '#66743e',
      farmX: [520, 600],
      farmZ: [580, 660],
      roads: [-SIDE_X, 0, SIDE_X],   // the roads from each base to the bridges
      roadZ: 540,
      surface(x: number, z: number) {
        if (onRail(x, z)) return [0x4a4640, 0.9];                                   // ballast
        const s = street(x, z);
        if (s > 0) return [0x55524c, s * 0.95];                                      // cobbles and rubble dust
        if (square(x, z)) return [0x5e5446, 0.8];                                   // the churned-up square
        const c = city(x, z);
        return c > 0 && fromRiver(x, z) > 20 ? [0x7a7268, c * 0.85] : null;          // rubble-strewn yards
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  // the shelling of the last ten days: the squares ploughed up, a crater here and there in the streets
  battlefield() {
    const blasts = shellField(1945_0430, { x: 500, z: CITY_Z }, (x: number, z: number) =>
      fromRiver(x, z) < 30 ? 0 : square(x, z) && ditch(x, z) < 0.05 ? 2.2 : street(x, z) > 0.6 ? 0.12 : 0);
    return { blasts, ruins: [], works: [] };
  },

  caves: { owner: 'pact', list: CAVES },

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const landmarks: number[][] = [];   // footprints the blocks keep clear of: [x, z, half-w, half-d]
    const clear = (x: number, z: number, hw: number, hd: number) => landmarks.push([x, z, hw, hd], [-x, -z, hw, hd]);
    const solid = (x: number, z: number, sx: number, sy: number, sz: number, color: number, y0 = terrain.heightAt(x, z)) => {
      props.box('stone', x, y0 + sy / 2, z, sx, sy, sz, 0, color);
      cover.addBox({ x, z, yaw: 0, length: sx, thickness: sz, height: sy });
    };
    /** A burnt-out tank: hull, turret, gun (cover). */
    const wreckTank = (x: number, z: number, yaw: number) => {
      const g = terrain.heightAt(x, z);
      const P = (lx: number, ly: number, lz: number, sx: number, sy: number, sz: number, c: number) => {
        const [wx, wz] = PropBuilder.local(x, z, yaw, lx, lz);
        props.box('metal', wx, g + ly, wz, sx, sy, sz, yaw, c);
      };
      P(0, 0.75, 0, 3.1, 1.3, 6.4, 0x34312c);
      P(0, 1.8, -0.4, 2.2, 0.9, 2.6, 0x2c2a26);
      P(0, 1.85, 2.4, 0.18, 0.18, 3.2, 0x22201e);
      for (const lx of [-1.6, 1.6]) P(lx, 0.5, 0, 0.5, 1, 6.6, 0x1e1c1a);
      cover.addBox({ x, z, yaw, length: 3.2, thickness: 6.4, height: 2.2 });
    };
    /** Tram lines: two rails in short straight pieces (purely visual). */
    const tram = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 6), yaw = Math.atan2(x1 - x0, z1 - z0);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, cx = x0 + (x1 - x0) * t, cz = z0 + (z1 - z0) * t;
        if (onPlaza(cx, cz) || fromRiver(cx, cz) < 22) continue;
        for (const o of [-0.72, 0.72]) {
          const [wx, wz] = PropBuilder.local(cx, cz, yaw, o, 0);
          props.box('metal', wx, terrain.heightAt(wx, wz) + 0.04, wz, 0.12, 0.1, len / n, yaw, 0x3a3836);
        }
      }
    };

    // ---- the Reichstag (south) and the Lehrter prison (north): the big blocks behind each square
    const RZ = 185;
    props.ruinBlock({ x: 0, z: -RZ, yaw: Math.PI, width: 60, depth: 32, storeys: 4, ruin: 0.18, name: 'Reichstag' });
    for (const [tx, tz] of [[-30, -16], [30, -16], [-30, 16], [30, 16]]) solid(tx, -RZ + tz, 10, 20, 10, 0x8a847a); // the corner towers
    {
      const g = terrain.heightAt(0, -RZ) + 12.4;
      for (let i = 0; i < 5; i++) {                       // the dome: its burnt-out steel skeleton, ring by ring
        const a0 = (i / 5) * (Math.PI / 2), a1 = ((i + 1) / 5) * (Math.PI / 2);
        const r = 10 * Math.cos(a0), y = g + 9 * Math.sin(a0), y1 = g + 9 * Math.sin(a1), r1 = 10 * Math.cos(a1);
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          props.box('metal', Math.sin(a) * r, y, -RZ + Math.cos(a) * r, (2 * Math.PI * r) / 16, 0.25, 0.25, a + Math.PI / 2, 0x2e2c2a);
          props.box('metal', Math.sin(a) * (r + r1) / 2, (y + y1) / 2, -RZ + Math.cos(a) * (r + r1) / 2, 0.25, y1 - y + 0.3, 0.25, a, 0x2e2c2a);
        }
      }
      props.box('stone', 0, g - 0.5, -RZ, 22, 1.4, 22, 0, 0x7a746a); // the drum under it
    }
    for (let i = 0; i < 6; i++) props.column({ x: -12.5 + i * 5, z: -RZ + 19, radius: 0.8, height: 10 }); // the portico
    props.ruinBlock({ x: 0, z: RZ, yaw: 0, width: 60, depth: 32, storeys: 3, ruin: 0.3, name: 'Lehrter prison' });
    for (const [tx, tz] of [[-30, -16], [30, -16], [-30, 16], [30, 16]]) solid(tx, RZ + tz, 8, 13, 8, 0x6e5446);
    clear(0, RZ, 36, 22);

    // ---- the flak towers: Humboldthain (north-west) and the Zoo (south-east), solid concrete with a gun on each corner
    for (const m of [-1, 1]) {
      const fx = 335 * m, fz = -195 * m;
      solid(fx, fz, 34, 30, 34, 0x8c8a84);
      const top = terrain.heightAt(fx, fz) + 30;
      for (const [cx, cz] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
        props.box('stone', fx + cx, top + 2.5, fz + cz, 9, 5, 9, 0, 0x84827c);
        props.box('metal', fx + cx, top + 5.6, fz + cz, 1.6, 1.2, 1.6, 0, 0x3a3c36);
        props.box('metal', fx + cx, top + 6.4, fz + cz + 2.2, 0.25, 0.25, 4, 0, 0x2a2c28, -0.6);
      }
    }
    clear(335, -195, 20, 20);

    // ---- Himmler's house (south-east of the bridge) / the Humboldthafen warehouses (its twin, north-west)
    props.ruinBlock({ x: 165, z: -88, yaw: Math.PI, width: 44, depth: 18, storeys: 4, ruin: 0.15, name: 'Ministry of the Interior' });
    props.hall({ x: -165, z: 88, yaw: Math.PI, width: 40, depth: 18, height: 8, color: 0x6e5a4a, name: 'Humboldthafen warehouse' });
    for (const [x, z] of [[-140, 66], [-188, 68], [-176, 64]]) props.crates({ x, z, yaw: 0.3 });
    clear(165, -88, 24, 11);

    // ---- the Kroll Opera ruins (south-west) / Lehrter Bahnhof and the S-Bahn (north-east)
    props.ruinBlock({ x: -SIDE_X, z: -135, yaw: 0, width: 44, depth: 24, storeys: 3, ruin: 0.5, name: 'Kroll Opera' });
    props.ruinBlock({ x: -SIDE_X - 18, z: -122, yaw: 0, width: 10, depth: 8, storeys: 5, ruin: 0.3, name: 'Kroll Opera stage tower' });
    props.hall({ x: SIDE_X, z: 133, yaw: Math.PI, width: 50, depth: 20, height: 12, color: 0x7a6650, name: 'Lehrter Bahnhof' });
    props.rails({ x0: 200, z0: 165, x1: 510, z1: 165 });
    props.rails({ x0: -510, z0: -165, x1: -200, z1: -165 });
    for (const [x, c] of [[250, 0x4a3a2a], [380, 0x3a3a36], [392, 0x5a3426]] as [number, number][]) {
      props.wagon({ x, z: 165, yaw: Math.PI / 2, kind: 'box', color: c });
      props.wagon({ x: -x, z: -165, yaw: Math.PI / 2, kind: 'box', color: c });
    }
    clear(-SIDE_X, -133, 27, 15);

    // ---- the squares: craters (battlefield), the ditch, barricades, guns' sandbag rings, wrecks
    mirrored(props, 4501, (m) => {
      props.sandbagRing({ x: -38 * m, z: -78 * m, radius: 5, toward: m });
      props.sandbagRing({ x: 42 * m, z: -122 * m, radius: 5, toward: m });
      props.sandbagRing({ x: 0 * m, z: -138 * m, radius: 6, toward: m });
      for (let i = 0; i < 6; i++) props.hedgehog({ x: (i < 3 ? -30 + i * 6 : 18 + (i - 3) * 6) * m, z: -112 * m });
      props.logBarricade({ x: -64 * m, z: -50 * m, yaw: 0.2, length: 8 });
      props.logBarricade({ x: 60 * m, z: -60 * m, yaw: -0.3, length: 7 });
      for (const [x, z, y] of [[-30, -60, 0.6], [25, -90, 2.2], [-48, -128, 1.4]]) wreckTank(x * m, z * m, y);
      props.wreckCar({ x: 52 * m, z: -40 * m, yaw: 1.1 });
      // the embankment at the Moltke Bridge: barricades at the south end, a burnt tank on the north end
      props.logBarricade({ x: -9 * m, z: -36 * m, yaw: 0, length: 6 });
      props.logBarricade({ x: 10 * m, z: -40 * m, yaw: 0.1, length: 6 });
    });
    // the embankment walls along the water (gaps at the bridges)
    for (let x = -490; x < 490; x += 8) {
      if (river.crossings.some((c) => Math.abs(x + 4 - c.x) < 12)) continue;
      for (const s of [-1, 1]) {
        const cx = x + 4, cz = riverZ(cx) + s * (river.halfWidth + 3.5);
        props.box('stone', cx, terrain.heightAt(cx, cz) + 0.3, cz, 8.1, 1.4, 0.6, -Math.atan2(riverZ(x + 8) - riverZ(x), 8), 0x6e6a62);
      }
    }

    // ---- the blocks: rows of gutted apartment houses along every street (our half, mirrored)
    const blocked = (x: number, z: number, hw: number, hd: number) => landmarks.some(([lx, lz, lw, ld]) => Math.abs(x - lx) < hw + lw + 2 && Math.abs(z - lz) < hd + ld + 2)
      || (Math.abs(x) < 75 + hw && Math.abs(z) < 215 + hd) || onRail(x, z) || (Math.abs(Math.abs(z) - 165) < 8 + hd && Math.abs(x) > 190)
      || fromRiver(x, z) < 30 + Math.max(hw, hd)
      || points.some((p) => Math.hypot(p.x - x, p.z - z) < 16 + Math.max(hw, hd))
      || CAVES.some((c) => Math.hypot(c.x - x, c.z - z) < 10 + Math.max(hw, hd) || Math.hypot(c.x + x, c.z + z) < 10 + Math.max(hw, hd));
    const r = mulberry32(1945);
    for (let i = 0; i + 1 < STREETS_X.length; i++) {
      const x0 = STREETS_X[i] + STREET + 3;
      const x1 = STREETS_X[i + 1] - STREET - 3;
      for (let j = -1; j + 1 < STREETS_Z.length; j++) {
        const z0 = (j < 0 ? RIVERSIDE : STREETS_Z[j]) + STREET + 3;
        const z1 = STREETS_Z[j + 1] - STREET - 3;
        const outskirts = Math.abs(x0 + x1) / 2 > 380 || z1 > 380;
        const rows: any[] = [];
        for (const zEdge of [z0, z1]) {
          let x = x0;
          while (x < x1 - 12) {
            const w = Math.min(x1 - x, 16 + r() * 12);
            const d = 10 + r() * 3;
            const cx = x + w / 2;
            const cz = zEdge === z0 ? z0 + d / 2 : z1 - d / 2;
            x += w + 2 + r() * 3;
            if (w < 10 || r() < (outskirts ? 0.5 : 0.12) || blocked(cx, cz, w / 2, d / 2)) continue;
            rows.push({ cx, cz, w, d, yaw: zEdge === z0 ? 0 : Math.PI });
          }
        }
        const across = z1 - z0 - 2 * 13 - 6;
        if (across >= 12 && !outskirts && r() < 0.6) {
          const left = r() < 0.5;
          const d = 10 + r() * 2;
          const cx = left ? x0 + d / 2 : x1 - d / 2;
          const cz = (z0 + z1) / 2;
          if (!blocked(cx, cz, d / 2, across / 2)) rows.push({ cx, cz, w: across, d, yaw: left ? -Math.PI / 2 : Math.PI / 2 });
        }
        for (const h of rows) {
          const seed = Math.floor(r() * 1e9);
          const storeys = 3 + Math.floor(r() * 3);   // Berlin's five-storey Mietskasernen, most shot down to fewer
          const ruin = 0.15 + r() * 0.45;
          mirrored(props, seed, (m, flip) => props.ruinBlock({ x: h.cx * m, z: h.cz * m, yaw: h.yaw + flip, width: h.w, depth: h.d, storeys, ruin }));
        }
      }
    }

    // ---- tram lines along Invalidenstraße (|z| = 130) and the cross street at |x| = 215, a burnt tram or two on them
    mirrored(props, 4502, (m) => {
      tram(-440 * m, 130 * m, 440 * m, 130 * m);
      tram(-215 * m, 40 * m, -215 * m, 410 * m);
      props.wagon({ x: -250 * m, z: 130 * m, yaw: Math.PI / 2, kind: 'box', color: 0x4a2a22 });
      props.wagon({ x: -215 * m, z: 300 * m, yaw: 0.05, kind: 'box', color: 0x3e2a24 });
    });

    // rubble, wrecks and barricades in the streets and yards, mirrored
    for (let i = 0; i < 130; i++) {
      const x = (r() * 2 - 1) * (CITY_X - 10);
      const z = RIVERSIDE + r() * (CITY_Z - RIVERSIDE - 10);
      if (blocked(x, z, 2, 2)) continue;
      const seed = Math.floor(r() * 1e9);
      const onStreet = street(x, z) > 0.3;
      const kind = onStreet ? (r() < 0.3 ? 'wreck' : r() < 0.45 ? 'tank' : r() < 0.7 ? 'barricade' : 'rubble') : (r() < 0.6 ? 'rubble' : 'wall');
      mirrored(props, seed, (m, flip) => {
        if (kind === 'wreck') props.wreckCar({ x: x * m, z: z * m, yaw: props.rand() * 3 + flip });
        else if (kind === 'tank') wreckTank(x * m, z * m, props.rand() * 3 + flip);
        else if (kind === 'barricade') props.rand() < 0.5 ? props.logBarricade({ x: x * m, z: z * m, yaw: props.rand() * 3, length: 5 + props.rand() * 3 }) : props.hedgehog({ x: x * m, z: z * m });
        else if (kind === 'wall') props.lowWall({ x: x * m, z: z * m, yaw: (props.rand() < 0.5 ? 0 : Math.PI / 2) + flip, length: 4 + props.rand() * 6, height: 1.3, color: 0x6a645c });
        else for (let k = 0; k < 3; k++) props.rubble(x * m + (props.rand() - 0.5) * 5, z * m + (props.rand() - 0.5) * 5, 0.4 + props.rand() * 0.6, true);
      });
    }

    // ---- outside the city: a little cover by the bases, the command posts
    const kinds = ['fieldwall', 'rocks', 'wrecks', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 24 && tries < 4000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = 30 + rand() * (bounds.z - 40);
      if (city(x, z) > 0 || sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 30 * 30)) continue;
      if (Math.hypot(x, z - BASE_Z) < 40 || points.some((p) => Math.hypot(x - p.x, z - p.z) < 40)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x5a5c48);
    commandPost(props, this.bases.pact, 1, 0x6a6a5a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 22 }, { x: 0, z: -BASE_Z, r: 22 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...CAVES.map((c) => ({ x: c.x, z: c.z, r: 8 })),
      { test: (x: number, z: number) => street(x, z) > 0.05 || onRail(x, z) || fromRiver(x, z) < 20 || square(x, z) }];
    // the shot-up trees of the Tiergarten (south) and the Humboldthain park (north), a few in the yards
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 700,
      forest: (x: number, z: number) => (Math.abs(z) > 360 && Math.abs(x) < 300 ? 0.35 : city(x, z) > 0.5 ? 0.02 : Math.max(0, (Math.abs(x) - 470) / 80)),
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: [...avoid, { test: (x: number, z: number) => city(x, z) > 0.3 && Math.abs(z) < 360 }], density: 0.8, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt: number, t: number) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
