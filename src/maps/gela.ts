// Gela, Sicily, 10 July 1943 — Operation Husky (1945 only; coastal: the sea and the land in one battle, 1.0 × 1.8 km).
// The Allies come in from the sea (+z), the Axis holds the land (-z). The US 1st Infantry Division and Darby’s Rangers
// landed in the Gulf of Gela in the dark; the 82nd Airborne’s paratroopers came down scattered inland, some on the
// Piano Lupo crossroads; at dawn the Hermann Göring Panzer Division and the Italian Livorno Division counter-attacked
// down the roads from Niscemi and Ponte Olivo, and the cruisers Boise and Savannah broke the tanks a few hundred
// metres from the dunes. Compressed onto the map, west to east: Gela on its long hill over the beach, the town’s
// pier (blown by its own engineers that night) and the Rangers’ beach under it; the dry bed of the Fiume Gela in July;
// Yellow and Blue beaches of the 1st Division, low dunes behind the sand. Inland the Piana di Gela: stubble after
// the harvest, olive groves, vines, stone-walled masserie; the Ponte Olivo airfield up the Gela road, the Piano Lupo
// crossroads on its low rise to the east, the ground climbing gently north toward Niscemi.
// The Germans stand in for the Italian coastal divisions too: the pillboxes along the dunes are the XVIII Coastal
// Brigade’s, the two batteries inland the Italian coast artillery’s. Paratroopers are the Paradrop call (KINDS.lift).
// No `climate`: the desert repaint would put the US Army in khaki drill, and at Gela it wore olive drab; the dry
// summer is in the theme’s colours instead.
// Not point-mirrored: one side lands, the other holds (modes/landing).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 }; // (the sea runs 400 m out past the mines: room for a destroyer’s turning circle)
const noise = createNoise2D(1943_07);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a6a86 }); // (the Mediterranean in July: deep blue)

/** The waterline (z) along the Gulf of Gela. */
export const shoreZ = (x: number) => 140 + fbm(noise, x * 0.004, 1.3, 2) * 12;
/** The town’s hill: a long ridge along the coast, its seaward face steep. */
const TOWN = { x: -330, z: -100 };
/** The dry bed of the Fiume Gela (x at z). */
const riverX = (z: number) => -150 + Math.sin(z * 0.009) * 22;
const OLIVO = { x: 20, z: -330 };   // the Ponte Olivo airfield (F)
const LUPO = { x: 330, z: -270 };   // the Piano Lupo crossroads (G)
const PRIOLO = { x: 0, z: -620 };   // Casa del Priolo, on the Niscemi road (K)

/** The roads, as polylines: the coast road through Gela, the Ponte Olivo road, the beach exits, the Niscemi road. */
const ROADS: [number, number][][] = [
  [[-520, -40], [-420, -80], [TOWN.x, TOWN.z], [-220, -40], [riverX(-10), -10], [100, 0], [330, -15], [520, -30]], // the coast road (SS 115)
  [[TOWN.x, TOWN.z], [-220, -200], [OLIVO.x, OLIVO.z], [40, -600], [60, -920]],                                  // Gela – Ponte Olivo
  [[-330, 95], [TOWN.x, TOWN.z]],                                                                                  // up from the pier beach into the town
  [[10, 90], [10, -10], [OLIVO.x, OLIVO.z]],                                                                       // the Yellow beach exit
  [[330, 90], [330, -15], [LUPO.x, LUPO.z], [180, -470], [PRIOLO.x, PRIOLO.z], [-120, -920]],                      // Blue beach – Piano Lupo – Niscemi
  [[LUPO.x, LUPO.z], [520, -320]],                                                                                 // Piano Lupo – Vittoria
];
const segD = (x: number, z: number, [ax, az]: number[], [bx, bz]: number[]) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const roadD = (x: number, z: number) => { let d = Infinity; for (const r of ROADS) for (let i = 1; i < r.length; i++) d = Math.min(d, segD(x, z, r[i - 1], r[i])); return d; };
const onRoad = (x: number, z: number) => z < shoreZ(x) - 30 && roadD(x, z) < 3.5;

// level ground under the built-up spots: [x, z, r]
const FLAT = [[OLIVO.x, OLIVO.z, 120], [LUPO.x, LUPO.z, 45], [PRIOLO.x, PRIOLO.z, 60]];

function height(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz;
  if (d > 0) { // the sea floor: shelving off quickly (the boats ground a few tens of metres out), a false bar further out (it stranded the LSTs), then deep water
    let h = 0.5 - d * 0.04 + 0.5 * Math.exp(-(((d - 130) / 20) ** 2));
    h -= Math.max(0, d - 170) * 0.1;
    return Math.max(h, -16);
  }
  const back = -d; // m inland of the waterline
  // the beach (sand, 30–40 m), the dunes behind it (low, wind-ripped), then the plain — or the town’s hill
  const beach = 0.5 + back * 0.05;
  const dune = (1.5 + ridged(noise, x * 0.02 + 7, z * 0.03, 2) * 2.6) * smoothstep(30, 50, back) * smoothstep(120, 80, back);
  const t = smoothstep(50, 140, back);
  let h = (beach + dune) * (1 - t) + plain(x, z) * t;
  // the dry bed of the Fiume Gela: a gravel floor, banks a few metres high (crossable anywhere in July), out to the sea through the dunes
  const rd = Math.abs(x - riverX(z));
  if (rd < 40) h += (Math.max(0.4, Math.min(h - 3, 0.6 + back * 0.03)) - h) * smoothstep(40, 8, rd);
  for (const [fx, fz, fr] of FLAT) { const k = smoothstep(fr, fr * 0.6, Math.hypot(x - fx, z - fz)); if (k > 0) h += (plain(fx, fz) - h) * k; }
  return h;
}
/** The land behind the dunes: the plain rising gently north toward Niscemi, Piano Lupo’s low rise, Gela’s hill. */
function plain(x: number, z: number) {
  let h = 5.5 + Math.max(0, -z) * 0.012 + smoothstep(-480, -860, z) * 12 + fbm(noise, x * 0.004, z * 0.004, 3) * 2.5;
  h += 8 * Math.max(0, 1 - Math.hypot(x - LUPO.x, z - LUPO.z) / 150) ** 1.2;
  const e = Math.hypot((x - TOWN.x) / 210, (z - TOWN.z) / (z > TOWN.z ? 110 : 150)); // (a long ridge along the coast, its top a plateau, steeper to the sea)
  return h + 22 * smoothstep(1, 0.55, e) + fbm(noise, x * 0.02, z * 0.02, 2) * 1.2 * smoothstep(1, 0.6, e);
}

/** The beach sectors, west to east: the Rangers under Gela, then the 1st Division’s Yellow and Blue. */
export const SECTORS = [{ x: -330, name: 'Gela pier' }, { x: 10, name: 'Yellow Beach' }, { x: 330, name: 'Blue Beach' }];
const beachPt = (x: number) => shoreZ(x) - 32;

/** The coast defences: one pillbox nest on a flank of each beach, in the dunes; the two coast batteries inland. */
const FORTS = [
  ...SECTORS.map((s, i) => { const x = s.x + (i === 1 ? -80 : 80); return { unit: 'wn', x, z: shoreZ(x) - 58, facing: 0 }; }),
  { unit: 'battery', x: -120, z: -460, facing: 0 }, { unit: 'battery', x: 420, z: -420, facing: 0 },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  // the beach sectors (open from the start; `opens` the objective inland once taken)
  { id: 'B', name: 'Gela pier', x: -330, z: beachPt(-330), owner: null, sector: 'west', radius: 45, opens: 'E' },
  { id: 'C', name: 'Yellow Beach', x: 10, z: beachPt(10), owner: null, sector: 'centre', radius: 45, opens: 'F' },
  { id: 'D', name: 'Blue Beach', x: 330, z: beachPt(330), owner: null, sector: 'east', radius: 45, opens: 'G' },
  { id: 'E', name: 'Gela', x: TOWN.x, z: TOWN.z, owner: null, sector: 'west' },
  { id: 'F', name: 'Ponte Olivo airfield', x: OLIVO.x, z: OLIVO.z, owner: null, sector: 'centre' },
  { id: 'G', name: 'Piano Lupo', x: LUPO.x, z: LUPO.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Casa del Priolo', x: PRIOLO.x, z: PRIOLO.z, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'gela',
  name: 'Gela',
  description: 'Sicily, 10 July 1943, Operation Husky: the beaches of the Gulf of Gela under the town on its hill, low dunes and Italian pillboxes, the dry Fiume Gela, stubble, olive groves and stone-walled farms inland — Ponte Olivo airfield and the Piano Lupo crossroads. The Allies land from the sea; the Hermann Göring Division counter-attacks from Niscemi.',
  epochs: ['1945'],
  region: 'africa', // (the North Africa & Mediterranean theatre: maps/index.js REGIONS)
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Allies', pact: 'Germany' },
  armies: { nato: ['brit', 'us'], pact: ['wh'] }, // (the British 8th Army and the US Seventh Army against the Hermann Göring Division and the Italian coast divisions: maps/index.js armiesOn)
  conditions: { time: 'day', weather: 'clear' }, // (a hot, clear July morning)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.45,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1943,
  height,
  river: sea,
  fields: createFields({ seed: 1943, cell: 64, weights: [0.12, 0.2, 0.55, 0.13] }), // (July: most of the wheat already cut)

  theme: {
    // a hot, clear morning: hard light, a pale haze over the plain
    fogColor: 0xd6d2c2, fogDensity: 0.0005,
    skyTop: 0x4a82bc, skyHorizon: 0xe6e0cc, skyBottom: 0xa8a28a,
    sunColor: 0xfff2d8, sunIntensity: 2.4, sunDisk: 0.9,
    clouds: 0.08, cloudLight: 0xf6f2ea, cloudDark: 0xc8c4ba,
    sunDir: [0.35, 0.75, 0.55],
    hemiSky: 0xd4dce6, hemiGround: 0x9a8a60, hemiIntensity: 1.2,
    rimColor: 0xf0e2c6, rimIntensity: 0.28,
    terrain: {
      grass: '#8e8a50', grassAlt: '#7e7e48', dryGrass: '#c2ad70', dirt: '#a68658', rock: '#b8a482',
      pasture: '#9a9458', ploughed: '#9a7850', stubble: '#ccb474', meadow: '#8a8a50',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const sz = shoreZ(x), back = sz - z;
        if (onRoad(x, z)) return [0xb4a07c, 0.9];                                              // white dust roads
        if (back < -3) return [y > -0.6 ? 0xd8caa2 : 0xa49a80, 1];                             // the sand under the water, the bar
        if (back < 40) return [0xe2d4ac, 1];                                                   // the beach
        if (back < 105) return [0xd6c696, 0.6 + Math.max(0, fbm(noise, x * 0.05, z * 0.05, 2)) * 0.4]; // the dunes: sand, marram, a little scrub
        if (Math.abs(x - riverX(z)) < 12) return [0xbcae90, 0.9];                              // the gravel of the dry river bed
        if (Math.hypot(x - OLIVO.x, z - OLIVO.z) < 110) return [0xbca870, 0.75];              // the airfield’s burnt grass
        return null;                                                                           // the fields
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors)
           pact: { x: 0, z: -720, entries: [-250, 0, 250] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -150 } },
  points,

  landing: {
    // the coast defences (data/units45/atlanticWall.js): one pillbox nest on a flank of each beach in the dunes (the Italian
    // coast line was thin), two coast batteries inland
    forts: FORTS,
    // wire along the top of the beach, mines in the dunes before each exit, tank traps across each exit road
    works: [
      ...Array.from({ length: 86 }, (_, i) => { const x = -470 + i * 11; return { kind: 'wire', x, z: shoreZ(x) - 40, yaw: 0 }; }),
      ...SECTORS.flatMap((s) => [{ kind: 'mines', x: s.x - 32, z: shoreZ(s.x - 32) - 62 }, { kind: 'mines', x: s.x + 32, z: shoreZ(s.x + 32) - 62 }, { kind: 'tankTraps', x: s.x, z: shoreZ(s.x) - 80 }]),
    ],
    // mines across the gulf, swept lanes off the three beaches
    seaMines: { z: [520, 590], count: 50, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1943 },
    // what the landing may call in at sea: the destroyers inshore, the minesweepers, the light cruisers (Boise, Savannah)
    navy: ['destroyer', 'minesweeper', 'lightCruiser'],
    // the defence at H-hour: in the dunes over each beach, in Gela, at Ponte Olivo and Piano Lupo
    hold: [
      ...SECTORS.flatMap((s) => [-50, 50].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) - 105 }))), // (behind the dunes)
      { x: TOWN.x + 40, z: TOWN.z + 20 }, { x: OLIVO.x, z: OLIVO.z + 20 }, { x: LUPO.x, z: LUPO.z + 20 },
    ],
    // the morning’s counter-attack: the Hermann Göring Division’s Panzers down the Niscemi and Ponte Olivo roads
    counter: { t: 300, units: ['tank', 'heavyTank', 'tank', 'ifv', 'heavyTank', 'rifles'], say: 'The Hermann Göring Division is coming down from Niscemi: Panzers and grenadiers, straight for the beaches', sayOther: 'Enemy armour coming down the Niscemi road: Panzers making for the beaches' },
    // the landing’s AI (ai/LandingDirector.js): no DD tanks at Sicily; the two destroyers inshore. No minesweeper or cruiser of its
    // own: the 8th Army has no ships on its list yet, and the director would wait for one it can’t buy (the player can call them)
    ai: { order: ['rifles', 'rifles', 'engineers', 'rifles', 'mgTeam', 'tank', 'rifles', 'atTeam', 'mortar', 'rifles', 'tank', 'atTeam'], gunship: 'destroyer', gunships: 2, sweeper: 'minesweeper', heavy: 'lightCruiser' },
    // a richer landing than Omaha’s (no bluffs to hold it on the sand, but open dunes the pillboxes see over): AI vs AI 2026-11-20
    economy: { reserves: 2700, perSector: 800, beachIncome: 1.2, defenceCp: 700, defenceIncome: 1.15 },
    // H-hour: the Rangers into Gela, the 26th and 16th RCTs onto Yellow and Blue
    waves: [{ t: 0, say: 'H-hour: the Rangers and the 1st Division are going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'engineers', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'tank', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 }, { unit: 'atTeam', sector: 2 },
    ] }],
  },

  spawns: {
    nato: [{ unit: 'destroyer', x: -170, z: 850, facing: Math.PI / 2 }, { unit: 'destroyer', x: 170, z: 860, facing: -Math.PI / 2 }], // (between the lanes: clear of the boats launching off each sector)
    pact: [],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1943);
    sea.build(scene, terrain);
    const nearPoint = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const nearFort = (x: number, z: number) => FORTS.some((f) => Math.hypot(f.x - x, f.z - z) < 40);
    const clear = (x: number, z: number, w = 9) => roadD(x, z) > w && !nearFort(x, z);

    // ---- Gela on its hill: flat-roofed houses packed along the ridge, the Chiesa Madre on the square
    props.church({ x: TOWN.x + 26, z: TOWN.z - 22, yaw: Math.PI / 2 });
    for (let i = 0; i < 170; i++) {
      const x = TOWN.x + (r() * 2 - 1) * 150, z = TOWN.z + (r() * 2 - 1) * 55;
      if (!clear(x, z, 8) || Math.hypot(x - TOWN.x, z - TOWN.z) < 22 || Math.hypot(x - TOWN.x - 26, z - TOWN.z + 22) < 16) continue;
      const yaw = Math.round(Math.atan2(TOWN.z - z, TOWN.x - x) / (Math.PI / 2)) * (Math.PI / 2);
      if (r() < 0.75) props.flatHouse({ x, z, yaw, width: 7 + r() * 4, depth: 7 + r() * 3, storeys: r() < 0.45 ? 2 : 1, name: 'house' });
      else props.townHouse({ x, z, yaw, width: 8 + r() * 3, depth: 9, storeys: 2, name: 'town house', damaged: 0.2 });
    }
    for (let i = 0; i < 6; i++) props.palm({ x: TOWN.x - 60 + i * 24 + r() * 6, z: TOWN.z + 66 + r() * 8, height: 8 + r() * 3 });

    // ---- the pier west of the Rangers’ beach: blown in the middle the night of the landing
    for (let s = 6; s < 170; s += 6) {
      if (s > 78 && s < 102) continue; // (the gap the Italian engineers blew)
      const x = -420, z = shoreZ(-420) + s;
      props.box('plain', x, 1.6, z, 6, 0.5, 6.2, 0, 0x7a6a56);
      for (const k of [-1, 1]) props.box('plain', x + k * 2.6, -1.5, z, 0.5, 6, 0.5, 0, 0x5a5048);
    }

    // ---- Ponte Olivo: the hangars, the wrecks of the Axis aircraft caught on the ground, blast pens
    props.timberHangar({ x: OLIVO.x - 60, z: OLIVO.z - 55, yaw: 0 });
    props.timberHangar({ x: OLIVO.x + 50, z: OLIVO.z - 60, yaw: 0 });
    for (let i = 0; i < 5; i++) props.aircraftWreck({ x: OLIVO.x - 80 + i * 40 + r() * 10, z: OLIVO.z + 30 + r() * 30, yaw: r() * 6, scale: 0.9 });
    for (const k of [-1, 1]) props.sandbagRing({ x: OLIVO.x + k * 95, z: OLIVO.z + 5, radius: 9, toward: 1 });

    // ---- Piano Lupo: the crossroads, a strongpoint and a farm on it; Casa del Priolo up the Niscemi road
    props.sandbagRing({ x: LUPO.x - 28, z: LUPO.z + 26, radius: 5, toward: 1 });
    buildSite(props, { kind: 'farm', seed: 7310 }, LUPO.x + 30, LUPO.z - 34, 0.2);
    buildSite(props, { kind: 'farm', seed: 7311 }, PRIOLO.x + 40, PRIOLO.z + 30, 1.4);
    commandPost(props, this.bases.pact, 1, 0x9a8a62);

    // ---- the masserie out on the plain: stone farmhouses behind their walls
    for (let i = 0; i < 24; i++) {
      const x = (r() * 2 - 1) * 460, z = -40 - r() * 760;
      if (!clear(x, z, 14) || nearPoint(x, z, 75) || Math.abs(x - riverX(z)) < 40 || Math.hypot(x - TOWN.x, z - TOWN.z) < 200 || Math.hypot(x, z + 720) < 70) continue;
      if (r() < 0.6) {
        const yaw = r() * 3;
        props.flatHouse({ x, z, yaw, width: 10 + r() * 4, depth: 7, storeys: r() < 0.5 ? 2 : 1, name: 'masseria' });
        const L = (lx: number, lz: number) => PropBuilder.local(x, z, yaw, lx, lz);
        for (const [lx, lz, ry] of [[0, 12, 0], [-14, 0, Math.PI / 2], [14, 0, Math.PI / 2]]) { const [wx, wz] = L(lx, lz); props.lowWall({ x: wx, z: wz, yaw: yaw + ry, length: 22, height: 1.4, color: 0xb0a080 }); }
      } else buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    // the dry-stone walls along the fields
    for (let i = 0; i < 70; i++) {
      const x = (r() * 2 - 1) * 470, z = -30 - r() * 800, yaw = r() < 0.5 ? 0 : Math.PI / 2, len = 20 + r() * 40;
      const ex = x + Math.cos(yaw) * len / 2, ez = z - Math.sin(yaw) * len / 2, sx = x - Math.cos(yaw) * len / 2, sz2 = z + Math.sin(yaw) * len / 2;
      if (!clear(x, z, 4 + len / 2) || nearPoint(x, z, 40 + len / 2) || Math.hypot(x - TOWN.x, z - TOWN.z) < 190 || Math.hypot(x - OLIVO.x, z - OLIVO.z) < 140 || Math.abs(x - riverX(z)) < 20 + len / 2) continue;
      if (Math.hypot(ex, ez + 720) < 60 || Math.hypot(sx, sz2 + 720) < 60) continue;
      props.lowWall({ x, z, yaw, length: len, height: 1.2, color: 0xb4a684 });
    }
    // boulders and the odd fishing boat drawn up on the sand
    for (let i = 0; i < 8; i++) {
      const x = -480 + r() * 960, z = shoreZ(x) - 10 - r() * 14;
      if (SECTORS.some((s) => Math.abs(s.x - x) < 60)) continue;
      props.box('plain', x, terrain.heightAt(x, z) + 0.35, z, 1.6, 0.7, 5, 0.3 + r(), 0x3a5a7a);
    }
    props.finish();

    const avoid = [
      { x: this.bases.pact.x, z: this.bases.pact.z, r: 30 },
      ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => onRoad(x, z) || nearFort(x, z) || Math.hypot(x - OLIVO.x, z - OLIVO.z) < 130 },
    ];
    const inland = (x: number, z: number) => z < shoreZ(x) - 105;
    // the olive groves: low, grey-green, in patches over the plain; a few carobs and eucalyptus along the river bed
    const olives = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1700, broadleaf: 1, autumn: 0, size: 0.55, maxY: 80,
      avoid: [...avoid, { test: (x: number, z: number) => !inland(x, z) || Math.hypot((x - TOWN.x) / 160, (z - TOWN.z) / 70) < 1 }],
      forest: (x: number, z: number) => smoothstep(0.15, 0.4, fbm(noise, x * 0.007 + 3, z * 0.007, 2)) * 0.8 + smoothstep(30, 14, Math.abs(x - riverX(z))) * 0.5 });
    // scrub on the dunes
    const scrub = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 500, broadleaf: 1, autumn: 0, size: 0.3, maxY: 40,
      avoid: [...avoid, { test: (x: number, z: number) => { const b = shoreZ(x) - z; return b < 50 || b > 110; } }],
      forest: (x: number, z: number) => 0.3 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.5 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.8, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => z > shoreZ(x) - 45 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { olives.update?.(dt, t); scrub.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
