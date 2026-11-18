// El Alamein, the Western Desert (1945 only; the big field, 1.0 × 1.12 km): a tank battle. Open,
// rolling desert with long sight lines. Before the 8th Army lies the long, low Ruweisat Ridge (hull-down
// along its whole crest), the Deir el Shein depression with the old brigade box, the palm oasis and the
// station on the railway; before the Afrika Korps the shorter, steeper Miteiriya Ridge running slantwise,
// the Kidney Ridge knoll with its supply depot, the low rise of Point 29 and the village with the white
// mosque of Sidi Abd el Rahman. Tel el Eisa stands in the middle, the railway runs slantwise across the
// whole field, wadis cut the ground, burnt-out vehicles and old fighting positions dot it. The Allies come
// in from the south (+z), the Afrika Korps from the north. Not a mirror but fair: each side has one ridge
// across its front, a village and a strongpoint on its flanks, and its points as far from its base as
// the other side's are from theirs.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1942);
const OASIS = { x: -340, z: 170 };      // the 8th Army's oasis (B)
const MOSQUE = { x: -290, z: -105 };    // Sidi Abd el Rahman (H)
const STATION = { x: 310, z: 85 };      // El Alamein station (D)
const KIDNEY = { x: 280, z: -150 };     // Kidney Ridge (J)
// the railway, slantwise across the whole field past the station
const railZ = (x) => 30 + 0.18 * x;
const RAIL_YAW = Math.atan2(1, 0.18);
const onRail = (x, z) => Math.abs(x) < 490 && Math.abs(z - railZ(x)) < 4;
// the ridges: Ruweisat (long, low, the Allied half) and Miteiriya (shorter, a little higher, slantwise, the German half)
const ruweisatZ = (x) => 212 + 14 * Math.sin(x * 0.009);
const miteiriyaZ = (x) => -205 - (x - 115) * 0.15;
// the built-up spots, levelled: [x, z, r, height]
const FLAT = [[OASIS.x, OASIS.z, 66, 2], [MOSQUE.x, MOSQUE.z, 60, 2], [STATION.x, STATION.z, 46, 2], [KIDNEY.x + 18, KIDNEY.z + 22, 26, 6.2]];

/** A ridge along crest(x) between x0 and x1 (ends fading over 90 m), `w` m wide, `h` m high. */
const ridge = (x, z, crest, x0, x1, w, h) => h * smoothstep(x0 - 90, x0, x) * smoothstep(x1 + 90, x1, x) * Math.exp(-(((z - crest(x)) / w) ** 2));

function height(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  let h = fbm(noise, x * 0.004, z * 0.004, 4) * 5;                                       // the long swell of the desert
  h += ridged(noise, x * 0.018 + 11, z * 0.03, 3) * 1.6;                                // dune ripples, across the wind
  h += ridge(x, z, ruweisatZ, -430, 160, 40, 9) * (0.78 + 0.22 * Math.sin(x * 0.012)); // Ruweisat: low and long
  h += ridge(x, z, miteiriyaZ, -170, 330, 30, 10.5) * (0.8 + 0.2 * Math.sin(x * 0.017 + 2)); // Miteiriya: shorter, steeper
  h += 6.5 * Math.max(0, 1 - Math.hypot((x - KIDNEY.x) / 80, (z - KIDNEY.z) / 42)) ** 1.2; // Kidney Ridge
  h += 3.5 * Math.max(0, 1 - Math.hypot(x - 200, z + 50) / 55) ** 1.3;                 // Point 29, a low rise
  h += 5 * Math.max(0, 1 - Math.hypot(x - 50, z + 340) / 65) ** 1.3;                  // Tel el Aqqaqir's low mound, before the German base
  h += 11 * Math.max(0, 1 - Math.hypot((x - 10) / 90, (z - 18) / 55)) ** 1.6;          // Tel el Eisa, long along the railway
  h -= 3.2 * smoothstep(80, 10, Math.hypot(x + 170, (z - 35) * 1.2));                    // the Deir el Shein depression
  h -= 3.5 * smoothstep(14, 0, Math.abs(z - 330 - 40 * Math.sin(x * 0.007 + 0.5))) * smoothstep(120, 40, x); // a wadi behind Ruweisat, west
  h -= 3.5 * smoothstep(13, 0, Math.abs(z + 320 - x * 0.08 - 26 * Math.sin(x * 0.011))) * smoothstep(-140, -60, x); // and one behind Miteiriya, east
  h += smoothstep(500, 620, ax) * 18 + smoothstep(560, 680, az) * 12;                   // the escarpment beyond the edges
  for (const bz of [BASE_Z, -BASE_Z]) h += (1.5 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  for (const [fx, fz, fr, fh] of FLAT) h += (fh - h) * smoothstep(fr, fr - 22, Math.hypot(x - fx, z - fz)); // level ground under the buildings
  return h;
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Alam Halfa', x: -30, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Oasis', x: OASIS.x, z: OASIS.z, owner: null, sector: 'west' },
  { id: 'C', name: 'Ruweisat Ridge', x: -70, z: ruweisatZ(-70), owner: null, sector: 'centre' },
  { id: 'D', name: 'El Alamein station', x: STATION.x, z: STATION.z, owner: null, sector: 'east' },
  { id: 'E', name: 'Deir el Shein', x: -170, z: 35, owner: null, sector: 'west' },
  { id: 'F', name: 'Tel el Eisa', x: 20, z: -5, owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Point 29', x: 200, z: -50, owner: null, sector: 'east' },
  { id: 'H', name: 'Sidi Abd el Rahman', x: MOSQUE.x, z: MOSQUE.z, owner: null, sector: 'west' },
  { id: 'I', name: 'Miteiriya Ridge', x: 115, z: miteiriyaZ(115), owner: null, sector: 'centre' },
  { id: 'J', name: 'Kidney Ridge', x: KIDNEY.x, z: KIDNEY.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Tel el Aqqaqir', x: -30, z: -470, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'el-alamein',
  armies: { nato: ['brit'], pact: ['wh', 'fj'] }, // (the British 8th Army against the Afrika Korps — and the Ramcke Brigade's Fallschirmjäger)
  sides: { nato: 'Britain', pact: 'Germany' },
  name: 'El Alamein',
  description: 'The Western Desert: open ground and long sight lines, two ridges for hull-down tanks, an oasis village, the station and the mosque. A tank battle.',
  epochs: ['1945'],
  region: 'africa', // (the menu's North Africa: maps/index.js REGIONS)
  climate: 'desert',   // sand paint and khaki drill (render/paint.js CLIMATE)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1943,
  height,
  fields: createFields({ seed: 1943, cell: 80 }),

  theme: {
    // a hot, hazy afternoon: a white sky low down, hard light
    fogColor: 0xdccbaa,
    fogDensity: 0.0007,
    skyTop: 0x7da2c8,
    skyHorizon: 0xe6dcc4,
    skyBottom: 0xb8a888,
    sunColor: 0xfff0d4,
    sunIntensity: 2.3,
    sunDisk: 0.9,
    clouds: 0.15,
    cloudLight: 0xf4efe4,
    cloudDark: 0xc8bfae,
    sunDir: [0.35, 0.8, 0.45],
    hemiSky: 0xd8dde4,
    hemiGround: 0xa08860,
    hemiIntensity: 1.2,
    rimColor: 0xf0e0c0,
    rimIntensity: 0.3,
    terrain: {
      grass: '#d8b880',
      grassAlt: '#ccaa70',
      dryGrass: '#e2c690',
      dirt: '#b08a5c',
      rock: '#9a7e5a',
      pasture: '#d4b47c',
      ploughed: '#c8a46c',
      stubble: '#dcbe86',
      meadow: '#d0b078',
      farmX: [0, 1],     // no farmland
      farmZ: [0, 1],
      roads: [-130, 0, 130],
      roadZ: 540,
      surface(x, z) {
        if (onRail(x, z)) return [0x6a5a48, 0.9];                                 // ballast
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.25 ? [0xb89a6a, Math.min(0.45, (scrub - 0.25) * 2)] : null; // gravel patches between the dunes
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-130, 0, 130] }, pact: { x: 0, z: -BASE_Z, entries: [-130, 0, 130] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0 })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1943);
    const near = (x, z, d) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);

    // ---- the oasis (Allied west) and Sidi Abd el Rahman with its mosque (German west): villages of flat-roofed houses
    const village = (cx, cz, n, seed, mosque, spread) => {
      const vr = mulberry32(seed);
      if (mosque) props.flatHouse({ x: cx + 6, z: cz + 14, yaw: Math.PI, width: 12, depth: 10, name: 'mosque', dome: true });
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + vr() * 0.5;
        const d = 18 + vr() * spread;
        const x = cx + Math.cos(a) * d * (mosque ? 1.3 : 1);
        const z = cz + Math.sin(a) * d * (mosque ? 0.8 : 1);
        if (onRail(x, z) || Math.abs(z - railZ(x)) < 10) continue;
        props.flatHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + vr() * 4, depth: 6 + vr() * 3, storeys: vr() < 0.25 ? 2 : 1 });
        if (vr() < 0.6) props.lowWall({ x: x + 5, z: z + 4, yaw: vr() < 0.5 ? 0 : Math.PI / 2, length: 6 + vr() * 6, height: 1.6, color: 0xc4a87a });
      }
    };
    village(OASIS.x, OASIS.z, 7, 31, false, 14);
    village(MOSQUE.x, MOSQUE.z, 10, 32, true, 18);   // (a bigger village, no palm grove: the same cover as the oasis)
    for (let i = 0; i < 30; i++) { // the oasis palms and the well
      const a = r() * Math.PI * 2;
      const d = 30 + r() * 26;
      props.palm({ x: OASIS.x + Math.cos(a) * d, z: OASIS.z + Math.sin(a) * d * 0.8, height: 7 + r() * 4 });
    }
    props.column({ x: OASIS.x + 4, z: OASIS.z + 4, radius: 1.4, height: 0.9 });
    for (let i = 0; i < 7; i++) props.palm({ x: MOSQUE.x - 40 + r() * 20, z: MOSQUE.z - 30 + r() * 24, height: 6 + r() * 4 }); // a few by the mosque's well
    // the station on the railway (Allied east)
    props.flatHouse({ x: STATION.x - 2, z: railZ(STATION.x - 2) - 14, yaw: RAIL_YAW - Math.PI / 2, width: 18, depth: 9, storeys: 2, name: 'railway station' });
    props.flatHouse({ x: STATION.x + 26, z: railZ(STATION.x + 26) - 12, yaw: RAIL_YAW - Math.PI / 2, width: 9, depth: 7, name: 'goods office' });
    props.flatHouse({ x: STATION.x - 30, z: railZ(STATION.x - 30) + 14, yaw: RAIL_YAW + Math.PI / 2, width: 8, depth: 7, name: 'water tower house', storeys: 2 });
    props.rails({ x0: -500, z0: railZ(-500), x1: 500, z1: railZ(500) });
    for (const [x, kind, c] of [[250, 'box', 0x8a6a48], [262, 'tank', 0x3a3a34], [400, 'open', 0x7a6248], [-180, 'box', 0x7a5a40], [-420, 'open', 0x6a5440]] as [number, string, number][]) {
      props.wagon({ x, z: railZ(x), yaw: RAIL_YAW, kind, color: c });
    }
    // Kidney Ridge (German east): the supply depot on its back, dugouts on its crest
    props.hall({ x: KIDNEY.x + 18, z: KIDNEY.z + 22, yaw: 0.3, width: 24, depth: 12, height: 5, color: 0xb09a74, roof: 0x8a7a5a, name: 'supply depot' });
    props.tanks({ x: KIDNEY.x + 44, z: KIDNEY.z + 8, yaw: Math.PI / 2, count: 2, radius: 3, height: 5, color: 0xb4a888 });
    for (let k = 0; k < 6; k++) props.crates({ x: KIDNEY.x - 8 + k * 4, z: KIDNEY.z + 40, yaw: k });
    for (const [x, z] of [[-30, -6], [0, -14], [34, -2]]) props.sandbagRing({ x: KIDNEY.x + x, z: KIDNEY.z + z, radius: 5, toward: 1 });
    // Deir el Shein (Allied): the 18th Indian Brigade's old box in the depression — rings and a sangar wall round its rim
    for (const [x, z] of [[-200, 18], [-178, 60], [-140, 28], [-160, 4]]) props.sandbagRing({ x, z, radius: 5, toward: -1 });
    for (const [x, z, y] of [[-215, 46, 0.8], [-126, 50, -0.6], [-190, -12, 0.2]]) props.lowWall({ x, z, yaw: y, length: 14, height: 1.2, color: 0xb49a70 });
    props.tent({ x: -150, z: 64, yaw: 0.3, color: 0xb8a078 });
    // Point 29 (German): a low rise with gun pits and a dug-in observation post
    for (const [x, z] of [[184, -36], [222, -58], [196, -76]]) props.sandbagRing({ x, z, radius: 4.5, toward: 1 });
    props.lowWall({ x: 205, z: -30, yaw: 0.4, length: 12, height: 1.2, color: 0xb49a70 });
    props.lowWall({ x: 170, z: -64, yaw: 1.6, length: 10, height: 1.2, color: 0xb49a70 });
    // Tel el Eisa: positions round the crest
    for (const [x, z] of [[-18, 30], [36, 34], [44, -2], [-20, -10]]) props.sandbagRing({ x, z, radius: 6, toward: z > 10 ? -1 : 1 });
    // the ridges: stone sangars along the crests (hull-down scrapes)
    for (let x = -400; x < 150; x += 52) props.lowWall({ x: x + r() * 14, z: ruweisatZ(x) + 6, yaw: (r() - 0.5) * 0.4, length: 7 + r() * 5, height: 1.0, color: 0xb49a70 });
    for (let x = -150; x < 320; x += 48) props.lowWall({ x: x + r() * 12, z: miteiriyaZ(x) - 6, yaw: -0.15 + (r() - 0.5) * 0.4, length: 7 + r() * 5, height: 1.0, color: 0xb49a70 });

    // ---- the desert: burnt-out vehicles, old positions, boulders and scrub, all over the field
    const town = (x, z) => [OASIS, MOSQUE, STATION, KIDNEY].some((t) => Math.hypot(x - t.x, z - t.z) < 70);
    for (let i = 0; i < 180; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 30);
      const z = (r() * 2 - 1) * (BASE_Z - 70);
      if (near(x, z, 45) || onRail(x, z) || Math.abs(z - railZ(x)) < 8 || town(x, z) || Math.abs(x) < 20) continue;
      const kind = r();
      props.rand = mulberry32(Math.floor(r() * 1e9));
      if (kind < 0.25) props.wreckCar({ x, z, yaw: props.rand() * 6.28 });
      else if (kind < 0.4) props.aircraftWreck({ x, z, yaw: props.rand() * 6, scale: 0.6 });
      else if (kind < 0.6) props.sandbagRing({ x, z, radius: 4 + props.rand() * 2, toward: z > 0 ? -1 : 1 });
      else if (kind < 0.75) props.lowWall({ x, z, yaw: props.rand() * 3, length: 6 + props.rand() * 8, height: 1.1, color: 0xb49a70 }); // a stone sangar
      else for (let k = 0; k < 3; k++) props.boulder({ x: x + (props.rand() - 0.5) * 8, z: z + (props.rand() - 0.5) * 8, radius: 0.8 + props.rand() * 1.4 });
    }
    const sites: any[] = [];
    for (let tries = 0; sites.length < 60 && tries < 6000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = (rand() * 2 - 1) * (bounds.z - 30);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 40 * 40) || near(x, z, 50) || town(x, z) || Math.abs(z - railZ(x)) < 10 || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
      sites.push({ x, z, kind: r() < 0.5 ? 'rocks' : 'wrecks', yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    commandPost(props, this.bases.nato, -1, 0xb8a078);
    commandPost(props, this.bases.pact, 1, 0xa89870);
    props.finish();
    cover.finalize(bounds);
    // camel-thorn scrub, thin
    const avoid = [{ x: 0, z: BASE_Z, r: 22 }, { x: 0, z: -BASE_Z, r: 22 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })), { test: (x, z) => onRail(x, z) }];
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.35, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) { ground.update(dt, t); },
    };
  },
} satisfies MapDef;
