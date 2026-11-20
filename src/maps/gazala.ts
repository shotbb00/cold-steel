// Gazala, 26 May – 21 June 1942 (1945 only; North Africa; the big field, 1.0 × 1.12 km): Rommel’s attack on the
// Gazala line. The 8th Army held the desert in brigade “boxes” — all-round positions ringed with minefields and wire —
// and the battle was fought round them: the Free French at Bir Hakeim far to the south (compressed here onto the
// Allied west flank), the Guards’ Knightsbridge box at the crossing of the desert tracks, the 150th Brigade’s box at
// Got el Ualeb that the Afrika Korps cut out of the line, and the Cauldron, the hollow in the middle where Rommel’s
// panzers stood with their backs to the minefields and beat off every attack. The Trigh Capuzzo runs slantwise across
// the field past Sidi Muftah and El Adem; the Acroma track crosses it north to south through Knightsbridge and the
// Cauldron. Two escarpment ridges, long and low like those at Sidi Rezegh, give hull-down ground: Rigel Ridge before
// the 8th Army, Sidra Ridge before the Afrika Korps. Burnt-out vehicles, sangars and old gun pits everywhere. The
// Allies come in from the south (+z), the Afrika Korps from the north. Not a mirror but fair: each side has one ridge
// (Rigel in the east, Sidra in the centre), one mined and wired box (Knightsbridge in the centre, Got el Ualeb in the
// west), one walled old fort on a wired rise at the far flank (Bir Hakeim, Bir el Harmat), and its points about as far
// from its base as the other side’s; the Cauldron and the two track villages lie between them.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { segDist, arabVillage } from './greatWarHelpers.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1942_05);

const HAKEIM = { x: -340, z: 170 };    // Bir Hakeim, the Free French fort (B)
const KNIGHTS = { x: -40, z: 240 };    // the Knightsbridge box (C)
const CAULDRON = { x: 15, z: -10 };    // the Cauldron (F)
const UALEB = { x: -270, z: -200 };    // Got el Ualeb, the 150th Brigade box (H)
const HARMAT = { x: 340, z: -150 };    // Bir el Harmat, the Italian ridotta (J)

// the Trigh Capuzzo, slantwise across the field past Sidi Muftah (E) and El Adem (G)
const capuzzoZ = (x: number) => 0.06 * x - 0.2 + 10 * Math.sin(((x + 230) * Math.PI) / 485);
const MUFTAH = { x: -230, z: capuzzoZ(-230) };
const ADEM = { x: 255, z: capuzzoZ(255) };
// the Acroma track, north to south through Knightsbridge and the Cauldron
const ACROMA = [[0, 560], [0, BASE_Z], [-25, 380], [KNIGHTS.x, KNIGHTS.z], [-20, 110], [CAULDRON.x, CAULDRON.z + 20], [60, -120], [70, -330], [0, -BASE_Z], [0, -560]];
const trackDist = (x: number, z: number) => Math.min(Math.abs(x) < 520 ? Math.abs(z - capuzzoZ(x)) : Infinity, segDist(ACROMA, x, z));
// the escarpment ridges: Rigel (Allied east) and Sidra (German centre)
const rigelZ = (x: number) => 190 + 10 * Math.sin(x * 0.011 + 1);
const sidraZ = (x: number) => -230 - 0.12 * (x - 90);
/** A ridge along crest(x) between x0 and x1 (ends fading over 90 m), `w` m wide, `h` m high. */
const ridge = (x: number, z: number, crest: (x: number) => number, x0: number, x1: number, w: number, h: number) =>
  h * smoothstep(x0 - 90, x0, x) * smoothstep(x1 + 90, x1, x) * Math.exp(-(((z - crest(x)) / w) ** 2));
// the built-up and dug-in spots, levelled: [x, z, r, height]
const FLAT = [[HAKEIM.x, HAKEIM.z, 40, 3.6], [HARMAT.x, HARMAT.z, 40, 3.6], [MUFTAH.x, MUFTAH.z + 12, 56, 1.4], [ADEM.x, ADEM.z - 12, 56, 1.4]];
const BOXES = [{ ...KNIGHTS, f: 'nato' }, { ...UALEB, f: 'pact' }];

function height(x: number, z: number) {
  const ax = Math.abs(x), az = Math.abs(z);
  let h = fbm(noise, x * 0.0045 + 7, z * 0.0045 - 3, 4) * 4.5;                                 // the long swell of the desert
  h += ridged(noise, x * 0.03 + 4, z * 0.016, 3) * 1.3;                                          // dune ripples, the other way than at Alamein
  h += ridge(x, z, rigelZ, 160, 440, 34, 9.5) * (0.82 + 0.18 * Math.sin(x * 0.015));          // Rigel Ridge
  h += ridge(x, z, sidraZ, -60, 250, 34, 9.5) * (0.82 + 0.18 * Math.sin(x * 0.013 + 1.5));     // Sidra Ridge
  for (const b of BOXES) h += 3 * Math.max(0, 1 - Math.hypot(x - b.x, z - b.z) / 90) ** 1.2;    // each box on its low rise
  h -= 4.2 * smoothstep(130, 25, Math.hypot((x - CAULDRON.x) * 0.9, z - CAULDRON.z));           // the Cauldron
  h -= 3 * smoothstep(12, 0, Math.abs(x + 120 - 30 * Math.sin(z * 0.012))) * smoothstep(60, 140, z) * smoothstep(420, 340, z);   // a wadi west of Knightsbridge
  h -= 3 * smoothstep(12, 0, Math.abs(x - 190 - 26 * Math.sin(z * 0.014 + 1))) * smoothstep(-60, -140, z) * smoothstep(-420, -340, z); // and one east of Sidra
  h += smoothstep(500, 620, ax) * 18 + smoothstep(560, 680, az) * 12;                           // the escarpment beyond the edges
  for (const bz of [BASE_Z, -BASE_Z]) h += (1.5 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  for (const [fx, fz, fr, fh] of FLAT) h += (fh - h) * smoothstep(fr, fr - 20, Math.hypot(x - fx, z - fz));
  return h;
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Acroma', x: -30, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Bir Hakeim', x: HAKEIM.x, z: HAKEIM.z, owner: null, sector: 'west' },
  { id: 'C', name: 'Knightsbridge', x: KNIGHTS.x, z: KNIGHTS.z, owner: null, sector: 'centre' },
  { id: 'D', name: 'Rigel Ridge', x: 300, z: rigelZ(300), owner: null, sector: 'east' },
  { id: 'E', name: 'Sidi Muftah', x: MUFTAH.x, z: MUFTAH.z, owner: null, sector: 'west' },
  { id: 'F', name: 'The Cauldron', x: CAULDRON.x, z: CAULDRON.z, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'El Adem', x: ADEM.x, z: ADEM.z, owner: null, sector: 'east' },
  { id: 'H', name: 'Got el Ualeb', x: UALEB.x, z: UALEB.z, owner: null, sector: 'west' },
  { id: 'I', name: 'Sidra Ridge', x: 90, z: sidraZ(90), owner: null, sector: 'centre' },
  { id: 'J', name: 'Bir el Harmat', x: HARMAT.x, z: HARMAT.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Rotonda Segnali', x: -30, z: -470, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'gazala',
  armies: { nato: ['brit'], pact: ['wh'] }, // (the British 8th Army against the Afrika Korps)
  sides: { nato: 'Britain', pact: 'Germany' },
  name: 'Gazala',
  description: 'Libya, May–June 1942: the Gazala line. Open desert cut by two low escarpment ridges, brigade boxes ringed with mines and wire, the Cauldron in the middle and the Trigh Capuzzo across it. Hold the boxes, win the Cauldron.',
  epochs: ['1945'],
  region: 'africa', // (the menu’s North Africa: maps/index.js REGIONS)
  climate: 'desert',   // sand paint and khaki drill (render/paint.js CLIMATE)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1942,
  height,
  fields: createFields({ seed: 1942, cell: 80 }),

  theme: {
    // a hot, windy afternoon, dust in the air
    fogColor: 0xd8c4a0,
    fogDensity: 0.0008,
    skyTop: 0x84a4c4,
    skyHorizon: 0xe4d6ba,
    skyBottom: 0xb4a080,
    sunColor: 0xfff0d0,
    sunIntensity: 2.3,
    sunDisk: 0.8,
    clouds: 0.1,
    cloudLight: 0xf4efe4,
    cloudDark: 0xc8bfae,
    sunDir: [-0.4, 0.78, 0.4],
    hemiSky: 0xd8dde4,
    hemiGround: 0xa08860,
    hemiIntensity: 1.2,
    rimColor: 0xf0e0c0,
    rimIntensity: 0.3,
    terrain: {
      grass: '#d4b27a',
      grassAlt: '#c8a46a',
      dryGrass: '#dec08a',
      dirt: '#ac865a',
      rock: '#967a58',
      pasture: '#d0ae76',
      ploughed: '#c49e68',
      stubble: '#d8b880',
      meadow: '#ccaa72',
      farmX: [0, 1],     // no farmland
      farmZ: [0, 1],
      roads: [],         // (the tracks are painted below)
      roadZ: 0,
      surface(x: number, z: number) {
        const td = trackDist(x, z);
        if (td < 3.5) return [0x9c7e58, 0.75];                                    // the tracks, worn by the columns
        if (td < 6) return [0xa88a62, 0.35];
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.25 ? [0xb89a6a, Math.min(0.45, (scrub - 0.25) * 2)] : null; // gravel patches
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-130, 0, 130] }, pact: { x: 0, z: -BASE_Z, entries: [-130, 0, 130] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  /** Each box its owner’s: a ring of minefields (gaps where the tracks come in) inside a ring of wire; wire round the two forts. */
  battlefield() {
    const works: any[] = [];
    const ring = (c: { x: number; z: number }, f: string, kind: string, R: number, step: number) => {
      const n = Math.round((2 * Math.PI * R) / step);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, x = c.x + Math.cos(a) * R, z = c.z + Math.sin(a) * R;
        if (trackDist(x, z) < 14 || i % 7 === 3) continue;  // (the tracks, and a gap now and then for the patrols)
        works.push({ kind, x, z, yaw: Math.PI / 2 - a, faction: f });
      }
    };
    for (const b of BOXES) { ring(b, b.f, 'mines', 62, 15); ring(b, b.f, 'wire', 78, 10.2); }
    ring(HAKEIM, 'nato', 'wire', 48, 10.2);
    ring(HARMAT, 'pact', 'wire', 48, 10.2);
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1942);
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const STONE = 0xb49a70;

    // ---- the two old forts on their rises: Bir Hakeim (Allied west) and the ridotta at Bir el Harmat (German east)
    const fort = (c: { x: number; z: number }, yaw: number, toward: number) => {
      for (let s = 0; s < 4; s++) {
        const a = yaw + (s * Math.PI) / 2, [mx, mz] = PropBuilder.local(c.x, c.z, a, 0, 16);
        for (const t of [-10, 10]) { // (each wall in two halves: a gate in the middle)
          const [wx, wz] = PropBuilder.local(mx, mz, a, t, 0);
          props.lowWall({ x: wx, z: wz, yaw: a, length: 12, height: 2.2, color: 0xc0a47a });
        }
      }
      props.flatHouse({ x: c.x + 5, z: c.z - 4, yaw, width: 8, depth: 6, name: 'blockhouse' });
      props.column({ x: c.x - 6, z: c.z + 6, radius: 1.4, height: 0.9 }); // the well (the “bir”)
      for (const [lx, lz] of [[-26, 18], [24, 22], [26, -20], [-22, -24]]) {
        const [x, z] = PropBuilder.local(c.x, c.z, yaw, lx, lz);
        props.sandbagRing({ x, z, radius: 4.5, toward });
      }
    };
    fort(HAKEIM, 0.2, -1);
    fort(HARMAT, -0.35, 1);

    // ---- the boxes: gun pits, dugouts, a sangar ring and the stores inside the minefields
    const box = (c: { x: number; z: number }, toward: number, canvas: number, seed: number) => {
      const br = mulberry32(seed);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + br() * 0.4, d = 30 + br() * 14;
        const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
        if (trackDist(x, z) < 8) continue;
        props.sandbagRing({ x, z, radius: 4 + br() * 1.5, toward });
      }
      for (let i = 0; i < 4; i++) {
        const a = br() * Math.PI * 2, x = c.x + Math.cos(a) * 46, z = c.z + Math.sin(a) * 46;
        if (trackDist(x, z) < 8) continue;
        props.lowWall({ x, z, yaw: Math.PI / 2 - a, length: 10, height: 1.2, color: STONE });
      }
      for (const [lx, lz, y] of [[14, -12, 0.3], [-16, 12, -0.4]]) {
        if (trackDist(c.x + lx, c.z + lz) > 8) props.tent({ x: c.x + lx, z: c.z + lz, yaw: y, color: canvas });
      }
      for (let k = 0; k < 4; k++) if (trackDist(c.x + 20 + k * 3, c.z + 16) > 8) props.crates({ x: c.x + 20 + k * 3, z: c.z + 16, yaw: k });
    };
    box(KNIGHTS, -1, 0xb8a078, 61);
    box(UALEB, 1, 0xa89870, 62);

    // ---- the track villages: Sidi Muftah with its marabout (west), El Adem with its fuel dump (east)
    const onTrack = (x: number, z: number) => trackDist(x, z) < 12;
    arabVillage(props, MUFTAH.x, MUFTAH.z + 12, 8, 71, onTrack, true);
    arabVillage(props, ADEM.x, ADEM.z - 12, 7, 72, onTrack, false);
    props.hall({ x: ADEM.x + 34, z: ADEM.z - 36, yaw: 0.1, width: 20, depth: 11, height: 5, color: 0xb09a74, roof: 0x8a7a5a, name: 'fuel dump' });
    props.tanks({ x: ADEM.x + 4, z: ADEM.z - 50, yaw: 0, count: 2, radius: 3, height: 5, color: 0xb4a888 });

    // ---- the ridges: stone sangars along both crests (hull-down scrapes)
    for (let x = 170; x < 440; x += 50) props.lowWall({ x: x + r() * 12, z: rigelZ(x) + 6, yaw: (r() - 0.5) * 0.4, length: 7 + r() * 5, height: 1.0, color: STONE });
    for (let x = -50; x < 250; x += 50) props.lowWall({ x: x + r() * 12, z: sidraZ(x) - 6, yaw: -0.12 + (r() - 0.5) * 0.4, length: 7 + r() * 5, height: 1.0, color: STONE });

    // ---- the Cauldron: the wrecks of the failed attacks lie thick in the hollow
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, d = 36 + r() * 70, x = CAULDRON.x + Math.cos(a) * d, z = CAULDRON.z + Math.sin(a) * d;
      if (trackDist(x, z) < 9) continue;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.wreckCar({ x, z, yaw: props.rand() * 6.28 });
    }

    // ---- the desert: burnt-out vehicles, old positions, boulders, all over the field
    const town = (x: number, z: number) => [HAKEIM, HARMAT, MUFTAH, ADEM, KNIGHTS, UALEB].some((t) => Math.hypot(x - t.x, z - t.z) < 90);
    for (let i = 0; i < 180; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 30);
      const z = (r() * 2 - 1) * (BASE_Z - 70);
      if (near(x, z, 45) || trackDist(x, z) < 9 || town(x, z) || Math.abs(x) < 20) continue;
      const kind = r();
      props.rand = mulberry32(Math.floor(r() * 1e9));
      if (kind < 0.25) props.wreckCar({ x, z, yaw: props.rand() * 6.28 });
      else if (kind < 0.37) props.aircraftWreck({ x, z, yaw: props.rand() * 6, scale: 0.6 });
      else if (kind < 0.6) props.sandbagRing({ x, z, radius: 4 + props.rand() * 2, toward: z > 0 ? -1 : 1 });
      else if (kind < 0.75) props.lowWall({ x, z, yaw: props.rand() * 3, length: 6 + props.rand() * 8, height: 1.1, color: STONE });
      else for (let k = 0; k < 3; k++) props.boulder({ x: x + (props.rand() - 0.5) * 8, z: z + (props.rand() - 0.5) * 8, radius: 0.8 + props.rand() * 1.4 });
    }
    const sites: any[] = [];
    for (let tries = 0; sites.length < 55 && tries < 6000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = (rand() * 2 - 1) * (bounds.z - 30);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 40 * 40) || near(x, z, 50) || town(x, z) || trackDist(x, z) < 12 || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
      sites.push({ x, z, kind: r() < 0.5 ? 'rocks' : 'wrecks', yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    commandPost(props, this.bases.nato, -1, 0xb8a078);
    commandPost(props, this.bases.pact, 1, 0xa89870);
    props.finish();
    cover.finalize(bounds);
    // camel-thorn scrub, thin
    const avoid = [{ x: 0, z: BASE_Z, r: 22 }, { x: 0, z: -BASE_Z, r: 22 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })), { test: (x: number, z: number) => trackDist(x, z) < 5 }];
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.35, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); },
    };
  },
} satisfies MapDef;
