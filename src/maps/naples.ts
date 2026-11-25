// Naples, summer 1985 (the big field, 1.0 × 1.12 km; a war that did not happen): the Soviet naval infantry has come
// ashore on the Domitian beaches west of Pozzuoli and the airborne has dropped on the Quarto plain behind it, and
// together they strike for NATO’s southern headquarters — AFSOUTH in the old Collegio Ciano at Bagnoli, the home of
// the US Sixth Fleet’s staff — against the US garrison and the Marines of the fleet coming out of Naples. On the map,
// turned so the coast of the Gulf of Pozzuoli runs down the west edge: Pozzuoli and its harbour under the tufa rock of
// Rione Terra, Monte Nuovo in the north-west corner, the Solfatara’s steaming crater above the town and the wooded
// crater of Astroni inland (the Pact’s half, -z, its base at Arco Felice and its field on the Quarto plain); in the
// middle Bagnoli — the Italsider steelworks on the beach with their stacks, blast furnace sheds and long pier, the
// AFSOUTH compound behind its wall, the Agnano crater with its racecourse and spa; then the Posillipo ridge with its
// villas and lemon terraces over the sea, Fuorigrotta’s dense blocks round the stadium, the Camaldoli hill, the
// Vomero and the edge of Capodichino airfield (NATO’s half, +z). Vesuvius stands on the skyline beyond Naples.
// (Compressed: Posillipo and Pozzuoli are 6 km apart; here 600 m. Capodichino is really north-east of the city.)
// Fairness: not a mirror — the coast wanders its own way, Rione Terra is a small steep rock where Posillipo is a long
// ridge, the craters are the Pact’s and the hills NATO’s, the towns are each half’s own dice — but each side has a
// height on each flank of about the same height at the same distance from its base (Posillipo and Camaldoli against
// Rione Terra and the Astroni rim), a town at its centre point (Fuorigrotta / Pozzuoli with the Solfatara), a hill in
// its back corner (the Vomero / Monte Nuovo) and an airstrip behind its east flank (Capodichino / Quarto); the
// three middle points straddle the line — the steelworks a little nearer NATO, the Agnano crater a little nearer the
// Pact, AFSOUTH on the line itself, the Agnano rim astride it — and the points lie at about the same distances
// (measured: tools/map_fairness.py).
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const LAND = 5;
const EXT = { x: 640, z: 820 };
const noise = createNoise2D(1985_91);

// ---- the coast of the Gulf of Pozzuoli down the west edge: x < shoreX(z) is sea. Rione Terra juts out with the harbour
// tucked in south of it, the Coroglio point off Bagnoli (Nisida beyond), Capo Posillipo in the north-east of the half
const shoreX = (z: number) => -446 + 16 * Math.sin(z * 0.009 + 1) + 9 * Math.sin(z * 0.023 + 0.4)
  - 34 * Math.exp(-(((z + 315) / 45) ** 2)) + 30 * Math.exp(-(((z + 225) / 40) ** 2))
  - 22 * Math.exp(-(((z - 95) / 40) ** 2)) - 18 * Math.exp(-(((z - 400) / 70) ** 2));
const seaD = (x: number, z: number) => x - shoreX(z);
/** How cliffy the coast is (0 beach … 1 tufa cliff): Posillipo’s and Rione Terra’s, Monte Nuovo’s steep seaward flank. */
const cliffK = (z: number) => Math.max(smoothstep(160, 230, z) * smoothstep(520, 460, z), Math.exp(-(((z + 320) / 40) ** 2)),
  0.6 * Math.exp(-(((z + 465) / 55) ** 2)));

// ---- roads: a coast road, a centre road and an inland road from base to base, laterals each half its own
const ROADS: number[][][] = [
  [[0, 560], [0, 470], [30, 360], [40, 255], [10, 120], [25, 0], [-25, -120], [40, -255], [-10, -380], [0, -470], [0, -560]], // centre: Via Terracina – Via Campi Flegrei
  [[0, 470], [-200, 430], [-340, 300], [-375, 180], [-280, 40], [-330, -130], [-340, -300], [-210, -430], [0, -470]],        // coast: Via Posillipo – Coroglio – Via Napoli
  [[0, 470], [170, 425], [290, 300], [305, 150], [250, -35], [340, -170], [290, -300], [170, -420], [0, -470]],              // inland: Camaldoli – Agnano – Astroni
  [[-340, 300], [-150, 290], [40, 255]], [[-340, -300], [-150, -255], [40, -255]],                                          // laterals: Via Manzoni, Pozzuoli’s Via Solfatara
  [[-280, 40], [-120, 20], [25, 0], [140, -20], [250, -35]],                                                                 // across the middle: Via Coroglio, Via Nuova Agnano
];
function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function roadDistExact(x: number, z: number) {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}
const roadDist = gridCacheSmooth(roadDistExact, EXT, 2);
// the Cumana railway along the coast, Fuorigrotta – Bagnoli – Pozzuoli (decoration: level crossings)
const RAIL = [[-70, 580], [-95, 400], [-70, 290], [-170, 160], [-345, 95], [-385, -40], [-300, -190], [-250, -330], [-150, -450], [-160, -580]];
const railDist = (x: number, z: number) => { let d = Infinity; for (let i = 0; i < RAIL.length - 1; i++) d = Math.min(d, segDist(x, z, RAIL[i], RAIL[i + 1])); return d; };

const points: ControlPointDef[] = [
  { id: 'A', name: 'Vomero', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Posillipo', x: -340, z: 300, owner: null, sector: 'west', radius: 24 },
  { id: 'C', name: 'Fuorigrotta', x: 40, z: 255, owner: null, sector: 'centre', radius: 28 },
  { id: 'D', name: 'Camaldoli', x: 290, z: 300, owner: null, sector: 'east', radius: 24 },
  { id: 'E', name: 'Italsider', x: -280, z: 40, owner: null, sector: 'west', radius: 30 },
  { id: 'F', name: 'AFSOUTH', x: 25, z: 0, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Agnano', x: 250, z: -35, owner: null, sector: 'east', radius: 28 },
  { id: 'H', name: 'Rione Terra', x: -340, z: -300, owner: null, sector: 'west', radius: 24 },
  { id: 'I', name: 'Solfatara', x: 40, z: -255, owner: null, sector: 'centre', radius: 26 },
  { id: 'J', name: 'Astroni', x: 290, z: -300, owner: null, sector: 'east', radius: 26 },
  { id: 'K', name: 'Arco Felice', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// the hills [x, z, rx, rz, height]: Posillipo’s ridge and Camaldoli (NATO), Rione Terra and Monte Nuovo (the Pact),
// the Vomero over NATO’s back corner, the hills behind the east edge (Capodimonte, Monte Barbaro)
const HILLS = [[-350, 320, 65, 140, 21], [290, 300, 75, 75, 23], [-345, -300, 50, 55, 22], [-380, -465, 55, 55, 24],
  [-250, 500, 70, 55, 12], [470, 380, 70, 110, 20], [470, -380, 70, 110, 20]];
// the craters [x, z, rim radius, rim width, rim height, floor]: Agnano astride the middle, the Solfatara over Pozzuoli,
// Astroni inland (wooded, steep inside)
const CRATERS = [[260, -30, 112, 26, 13, -1.5], [40, -255, 58, 17, 10, -1], [290, -300, 78, 22, 22, -2.5]];
// the two airstrips (systems/Airfields.js lays them): the edge of Capodichino behind NATO, the Quarto plain behind the Pact
const AIRFIELDS = [
  { faction: 'nato', x: 215, z: 470, yaw: Math.PI / 2, large: false, name: 'Capodichino' },
  { faction: 'pact', x: 215, z: -470, yaw: -Math.PI / 2, large: false, name: 'Quarto strip' },
];
const onAirfield = (x: number, z: number, m = 0) => x > 75 - m && x < 355 + m && Math.abs(z) > 440 - m && Math.abs(z) < 552 + m;
const airK = (x: number, z: number) => smoothstep(30, 0, Math.max(75 - x, x - 355, 440 - Math.abs(z), Math.abs(z) - 552, 0));

/** The smooth, dear part of the ground (noise, hills, craters), sampled once onto a 4 m grid. */
const hillsH = gridCacheSmooth((x: number, z: number) => {
  let h = LAND + fbm(noise, x * 0.005, z * 0.005, 3) * 2.2;
  for (const [hx, hz, rx, rz, a] of HILLS) {
    const d2 = ((x - hx) / rx) ** 2 + ((z - hz) / rz) ** 2;
    if (d2 < 9) h += a * Math.exp(-d2) * (0.86 + 0.28 * ridged(noise, x * 0.018 + hx, z * 0.018, 2));
  }
  for (const [cx, cz, R, w, a, floor] of CRATERS) {
    const d = Math.hypot(x - cx, z - cz) * (1 + 0.06 * noise(x * 0.01 + cx, z * 0.01));
    if (d > R + 3 * w) continue;
    const cut = smoothstep(5, 28, roadDistExact(x, z)); // (the roads come in through notches in the rims)
    h += a * Math.exp(-(((d - R) / w) ** 2)) * (0.6 + 0.4 * cut) + floor * smoothstep(R, R * 0.6, d);
  }
  // the hills behind the north and south edges
  return h + smoothstep(BOUNDS.z - 10, BOUNDS.z + 120, Math.abs(z)) * 24 * smoothstep(-460, -380, x);
}, EXT, 4);

function height(x: number, z: number) {
  let h = hillsH(x, z);
  // the airstrips and the bases: graded
  h += (LAND - h) * airK(x, z);
  for (const bz of [BASE_Z, -BASE_Z]) h += (LAND - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  // the coast: a beach (Bagnoli, Pozzuoli) or a tufa cliff (Posillipo, Rione Terra), then the sea bottom
  const sd = seaD(x, z);
  const slope = sd > 0 ? 0.08 + 0.55 * cliffK(z) : 0.09;
  h = Math.min(h, 0.6 + sd * slope);
  return Math.max(h, -14);
}

/** The towns (ellipses): Fuorigrotta and the Vomero (NATO), Pozzuoli and Arco Felice (the Pact), Bagnoli in the middle. */
const TOWNS = [{ x: 60, z: 235, rx: 150, rz: 85 }, { x: -130, z: 425, rx: 100, rz: 60 }, { x: -170, z: -290, rx: 125, rz: 90 },
  { x: -150, z: -430, rx: 95, rz: 55 }, { x: -120, z: 40, rx: 100, rz: 55 }];
const townE = (x: number, z: number) => Math.min(...TOWNS.map((t) => Math.hypot((x - t.x) / t.rx, (z - t.z) / t.rz)));
const STEEL = { x: -330, z: 40, w: 90, d: 120 };   // the Italsider works on the beach
const HQ = { x: 25, z: 0, w: 70, d: 56 };          // the AFSOUTH compound
const inRect = (q: { x: number, z: number, w: number, d: number }, x: number, z: number, m: number) => Math.abs(x - q.x) < q.w / 2 + m && Math.abs(z - q.z) < q.d / 2 + m;
const TRACK = { x: 255, z: -30, rx: 62, rz: 34 };  // the Agnano racecourse on the crater floor
const trackE = (x: number, z: number) => Math.hypot((x - TRACK.x) / TRACK.rx, (z - TRACK.z) / TRACK.rz);

/** The lemon terraces and villas on the hill flanks (between the foot and the top). */
const terraceK = (x: number, z: number, y: number) => smoothstep(8, 12, y) * smoothstep(30, 24, y) * smoothstep(8, 16, roadDist(x, z)) * (townE(x, z) > 1 ? 1 : 0);
const craterIn = (x: number, z: number) => CRATERS.some(([cx, cz, R]) => Math.hypot(x - cx, z - cz) < R + 30);
/** Woods: holm oak and chestnut on Camaldoli, Astroni’s rim, Monte Nuovo’s pines, the hills behind the edges. */
const woodsK = (x: number, z: number) => {
  if (seaD(x, z) < 20 || roadDist(x, z) < 6 || nearPoint(x, z, 26) || onAirfield(x, z, 20) || townE(x, z) < 1.05) return 0;
  const y = height(x, z);
  const astroni = Math.hypot(x - 290, z + 300) > 40 && Math.hypot(x - 290, z + 300) < 115 ? 0.9 : 0;
  return Math.max(astroni, smoothstep(14, 22, y) * 0.85, smoothstep(0.32, 0.5, fbm(noise, x * 0.008 + 40, z * 0.008, 2)) * 0.6);
};
const woodsC = gridCache(woodsK, BOUNDS);

const vesuvius = (scene: any) => { // the volcano on the skyline beyond Naples (haze-blue, out past the fog): Somma’s shoulder, the cone
  const prof = [[0, 400], [80, 395], [140, 330], [260, 220], [420, 110], [620, 30], [760, 0]].map(([r, y]) => new THREE.Vector2(r, y));
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshBasicMaterial({ color: 0x8d9aab, fog: false, side: THREE.DoubleSide }));
  mesh.position.set(1550, -10, 1650);
  scene.add(mesh);
};

const bay = {
  ...createSea({ level: 0, size: 1600 }),
  sea: false, // (water that stops, as a river’s does: a land battle — world/Sea.js answers the rest)
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a5a72, roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.9 });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1), mat);
    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;
    water.userData.noAO = true;
    scene.add(water);
  },
};

export default {
  id: 'naples',
  name: 'Naples',
  description: 'Naples, summer 1985: Soviet naval infantry and paratroopers strike from Pozzuoli for AFSOUTH at Bagnoli, NATO’s southern headquarters. The Campi Flegrei craters, the Italsider steelworks on the beach, the Posillipo ridge and its lemon terraces, Fuorigrotta’s blocks, Vesuvius on the skyline.',
  epochs: ['1985'],
  region: 'europe',
  airfields: AIRFIELDS,
  armies: { nato: ['us'], pact: ['sov'] }, // (AFSOUTH’s US garrison and the Sixth Fleet’s Marines ashore, against the Soviet naval infantry and airborne)
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  camera: { far: 3200 },
  seed: 1985_91,
  height,
  river: bay,
  woods: (x: number, z: number) => woodsC(x, z),

  theme: {
    // a hot, hazy July day over the gulf
    fogColor: 0xc8ccc8, fogDensity: 0.0011,
    skyTop: 0x4a78b4, skyHorizon: 0xd4dade, skyBottom: 0x8a8a78,
    sunColor: 0xfff0d4, sunIntensity: 2.2, sunDisk: 0.45,
    clouds: 0.2, cloudLight: 0xf6f4ee, cloudDark: 0xa4a8ac,
    sunDir: [0.3, 0.75, 0.5],
    hemiSky: 0xccd6e2, hemiGround: 0x6a6040, hemiIntensity: 1.3,
    rimColor: 0xd8dadc, rimIntensity: 0.2,
    terrain: {
      grass: '#7a7a3e', grassAlt: '#6e7038', dryGrass: '#a49660', dirt: '#7a6648', rock: '#9a8e72',
      pasture: '#76783c', ploughed: '#6e5a40', stubble: '#a49660', meadow: '#7e823e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const sd = seaD(x, z);
        if (sd < 2) return [y > -3 ? 0xb0a080 : 0x6a6450, 1];                                       // the sand under the water
        if (onAirfield(x, z)) return [0x8a8668, 0.6];                                              // the airfield’s cut grass
        if (roadDist(x, z) < (townE(x, z) < 1 ? 5 : 4.5)) return [0x6c6a66, 0.9];                  // asphalt
        if (railDist(x, z) < 3) return [0x524c44, 0.9];                                            // ballast
        if (sd < 34 && y < 3.5) return [0x8e8070, 0.9];                                            // Bagnoli’s grey-brown volcanic sand
        if (inRect(STEEL, x, z, 0)) return [0x5e5a54, 0.85];                                       // the works’ slag and concrete
        if (inRect(HQ, x, z, 0)) return [Math.abs(x - HQ.x) < 8 || Math.abs(z - HQ.z) < 6 ? 0x9a948a : 0x6a7a3a, 0.8]; // the HQ’s lawns and drive
        if (Math.abs(trackE(x, z) - 1) < 0.12) return [0x8a7458, 0.9];                             // the racecourse
        if (Math.hypot(x - 40, z + 255) < 38) return [noise(x * 0.08, z * 0.08) > 0.2 ? 0xd6d0a8 : 0xb8b49a, 0.9]; // the Solfatara’s sulphur-white floor
        if (townE(x, z) < 1) return [0x948a7a, 0.65];                                              // streets and courtyards
        const t = terraceK(x, z, y);
        if (t > 0.3 && !craterIn(x, z)) return [Math.sin(y * 2.2) > 0.4 ? 0x7a6a50 : 0x4e6a2e, t * 0.75]; // lemon terraces: walls and the green of the groves
        if (y > 24) return [0xa89c7c, smoothstep(24, 34, y) * smoothstep(0.1, 0.5, noise(x * 0.03, z * 0.03)) * 0.7]; // bare tufa
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
    pact: [{ unit: 'rifles', x: 0, z: -BASE_Z + 18, name: '1-ya Rota', facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    bay.build(scene);
    vesuvius(scene);
    const slopeOk = (x: number, z: number, r: number) => {
      const a = terrain.heightAt(x - r, z), b = terrain.heightAt(x + r, z), c = terrain.heightAt(x, z - r), d = terrain.heightAt(x, z + r);
      return Math.max(a, b, c, d) - Math.min(a, b, c, d) < 0.35 * r + 0.8;
    };
    const free = (x: number, z: number, r: number) => roadDist(x, z) > 6 + r && railDist(x, z) > 5 + r && seaD(x, z) > 14 + r
      && !nearPoint(x, z, 16 + r) && !onAirfield(x, z, r + 10) && Math.hypot(x, Math.abs(z) - BASE_Z) > 50 + r
      && !inRect(STEEL, x, z, r + 3) && !inRect(HQ, x, z, r + 3) && trackE(x, z) > 1.25 && slopeOk(x, z, r + 2);

    // ---- the Cumana railway
    for (let i = 0; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });

    // ---- the Italsider works on Bagnoli beach: blast-furnace sheds, rolling mill, stacks, gas holders, the long pier
    props.rand = mulberry32(1985_92);
    props.hall({ x: -345, z: 85, yaw: Math.PI / 2, width: 50, depth: 22, height: 14, color: 0x6a5244, roof: 0x4a4440, door: 10, name: 'rolling mill' });
    props.hall({ x: -310, z: -5, yaw: Math.PI / 2, width: 40, depth: 20, height: 18, color: 0x5e4a40, roof: 0x3e3a38, door: 8, name: 'blast furnace shed' });
    props.hall({ x: -360, z: 10, yaw: 0, width: 24, depth: 14, height: 9, color: 0x7a6a5a, roof: 0x4a4c4e, door: 8, name: 'steelworks shop' });
    for (const [cx, cz, hh] of [[-325, 30, 48], [-318, 50, 44], [-300, 75, 40]]) props.chimney({ x: cx, z: cz, height: hh });
    props.tanks({ x: -365, z: -35, yaw: 0, count: 3, radius: 6, height: 10, color: 0x8a8a84 });
    props.conveyor({ x0: -350, z0: -20, x1: -310, z1: -5, y0: 3, y1: 16 });
    const pz = 20, py = 1.6; // the pier straight out into the gulf (beyond the field’s west edge)
    for (let x = shoreX(pz) + 6; x > -640; x -= 18) props.box('stone', x, -4, pz, 2.4, 11, 2.4, 0, 0x7a7870);
    props.box('plain', (shoreX(pz) - 640) / 2, py, pz, 640 + shoreX(pz), 0.8, 9, 0, 0x6e6c66);

    // ---- AFSOUTH: the compound wall, the Collegio Ciano’s long arcaded block, its wings, the flag masts
    for (const [dx, dz, len, yaw] of [[0, -HQ.d / 2, HQ.w, 0], [0, HQ.d / 2, HQ.w, 0], [-HQ.w / 2, 0, HQ.d, Math.PI / 2], [HQ.w / 2, 0, HQ.d, Math.PI / 2]] as const) {
      const n = Math.round(len / 8);
      for (let i = 0; i < n; i++) {
        const t = -len / 2 + (i + 0.5) * (len / n), x = HQ.x + dx + (yaw ? 0 : t), z = HQ.z + dz + (yaw ? t : 0);
        if (roadDist(x, z) < 8) continue; // (the gates where the roads come in)
        props.lowWall({ x, z, yaw, length: len / n + 0.2, height: 2.4, color: 0xb0a48a });
      }
    }
    props.flatHouse({ x: HQ.x - 2, z: HQ.z - 17, yaw: 0, width: 40, depth: 10, storeys: 4, name: 'AFSOUTH headquarters' });
    for (const s of [-1, 1]) props.flatHouse({ x: HQ.x + s * 25, z: HQ.z + 12, yaw: Math.PI / 2, width: 18, depth: 9, storeys: 3, name: 'staff block' });
    for (const s of [-3, -1, 1, 3]) props.mast({ x: HQ.x + s * 3, z: HQ.z - 6, height: 9 });

    // ---- Agnano: the racecourse’s grandstand, the spa on the crater floor
    props.hall({ x: TRACK.x, z: TRACK.z - TRACK.rz - 14, yaw: 0, width: 36, depth: 9, height: 7, color: 0xc8beaa, roof: 0x5a5c5e, door: 0, name: 'grandstand' });
    props.flatHouse({ x: 175, z: -75, yaw: 0.3, width: 22, depth: 12, storeys: 2, name: 'Terme di Agnano' });

    // ---- Pozzuoli harbour under Rione Terra: the moles, the fish quay, a ferry; the Serapeum’s columns by the quay
    for (let i = 0; i < 18; i++) props.boulder({ x: shoreX(-250) - 10 - i * 4.4, z: -250 - i * 1.5, radius: 2.4 });
    for (let i = 0; i < 12; i++) props.boulder({ x: shoreX(-200) - 8 - i * 4.4, z: -200 + i * 2, radius: 2.2 });
    props.box('plain', shoreX(-225) - 40, 1.2, -228, 22, 4, 7, 0.1, 0xe8e6e0); // (the Procida ferry, tied up)
    for (let i = 0; i < 6; i++) props.column({ x: -265 + (i % 3) * 5, z: -232 + Math.floor(i / 3) * 6, radius: 0.6, height: 6 });
    props.church({ x: -350, z: -282, yaw: 0.2 }); // the cathedral on the Rione Terra
    // ---- Fuorigrotta’s stadium (San Paolo), the Mostra d’Oltremare’s halls between it and the HQ
    props.hall({ x: 120, z: 175, yaw: 0, width: 46, depth: 30, height: 12, color: 0xb4ac9a, roof: 0x6a6c6e, door: 6, name: 'Stadio San Paolo' });
    props.hall({ x: -40, z: 135, yaw: 0.2, width: 28, depth: 14, height: 8, color: 0xc4b89c, roof: 0x5a5c5e, door: 6, name: 'Mostra d’Oltremare' });

    // ---- the towns, each half its own dice: dense blocks of four- and five-storey palazzi, two-storey houses on the edges
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_93 + m);
      const r = props.rand;
      for (let gx = -460; gx <= 460; gx += 17) for (let gz = 0; gz <= 540; gz += 16) {
        const x = gx + (r() - 0.5) * 3, z = gz * m + (r() - 0.5) * 3;
        const e = townE(x, z);
        if (e > 1 || r() < 0.18 || !free(x, z, 6)) continue;
        const yaw = r() < 0.5 ? 0 : Math.PI / 2;
        if (e < 0.7 && r() < 0.35) props.ruinBlock({ x, z, yaw, width: 14, depth: 10, storeys: 5, ruin: 0, name: 'palazzo' });
        else props.flatHouse({ x, z, yaw, width: 10 + r() * 3, depth: 9 + r() * 2, storeys: e < 0.7 ? 3 + Math.floor(r() * 3) : 2, name: e < 0.7 ? 'palazzo' : 'house' });
      }
      // villas and farmhouses among the lemon terraces, a terrace wall every few metres down the slope
      for (let i = 0; i < 900; i++) {
        const x = (r() * 2 - 1) * 480, z = m * (20 + r() * 520);
        const y = height(x, z);
        if (terraceK(x, z, y) < 0.6 || craterIn(x, z)) continue;
        if (r() < 0.1) { if (free(x, z, 6)) props.flatHouse({ x, z, yaw: r() * Math.PI, width: 10, depth: 8, storeys: 2, name: 'villa' }); continue; }
        if (!free(x, z, 3)) continue;
        const gx = height(x + 2, z) - height(x - 2, z), gz = height(x, z + 2) - height(x, z - 2);
        props.lowWall({ x, z, yaw: Math.atan2(gz, -gx) + Math.PI / 2, length: 7, height: 1.1, color: 0x9a8a6c });
      }
    }
    // ---- the airfields’ edges: shelters off each strip’s end
    props.rand = mulberry32(1985_94);
    for (const m of [1, -1]) props.aircraftShelter({ x: 400, z: m * 500, yaw: -Math.PI / 2 });
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || railDist(x, z) < 5 || seaD(x, z) < 8 || townE(x, z) < 1 || onAirfield(x, z, 10)
        || inRect(STEEL, x, z, 6) || inRect(HQ, x, z, 2) || Math.abs(trackE(x, z) - 1) < 0.2 || Math.hypot(x - 40, z + 255) < 40 },
    ];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 5000, broadleaf: 0.75, autumn: 0, maxY: 80,
      forest: (x: number, z: number) => {
        const w = woodsC(x, z);
        if (w > 0.05) return w;
        return terraceK(x, z, height(x, z)) > 0.5 && !craterIn(x, z) ? 0.35 : 0; // (the lemon groves)
      } });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: avoid.slice(0, -1), density: 1.5 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
