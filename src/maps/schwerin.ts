// Schwerin, autumn 1985 (a war that did not happen): NATO’s counterstroke into the GDR — the Bundeswehr and the US Army
// come down the Wismar road into Mecklenburg, the NVA and the Soviet Army hold the Bezirk capital and counter-attack
// from the south. The ground: the Mecklenburg lowland, flat to gently rolling moraine, big LPG fields, brick villages
// and beech and pine woods, and everywhere lakes. On the map: the Schweriner See along the whole east edge (water,
// nobody crosses it), the Wismar–Schwerin road (the F 106) and the railway running down its west shore through
// Wickendorf; the old town of Schwerin in the middle with the Dom and the Pfaffenteich, the palace on its island in
// the Burgsee joined to the Schlossgarten by its causeway; the Ziegelsee arm north of the town, the Lankower and
// Medeweger See north-west, the Ostorfer See, the Faule See and the Neumühler See south; the Plattenbau estates of
// Lankow and the Großer Dreesch at Zippendorf.
// NATO holds the north (+z, toward Wismar), the Warsaw Pact the south (-z, toward Crivitz). Fairness: not a mirror —
// the big lake runs the length of the east edge for both, each half has its own four lakes of about the same total
// area (NATO: the Medeweger, Lankower See, Pfaffenteich and the Ziegelsee arm; the Pact: the Neumühler, Ostorfer,
// Faule See and the Burgsee), its own moraine rises of the same height, the same three roads up its sectors and
// three laterals, a Plattenbau estate on its side of the town, and its points at matching distances from its base
// (tools/map_fairness.py). The town itself, the decisive ground, sits in the middle on its low rise between the lakes.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createLakes } from '../world/Lakes.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, buildSite } from './common.js';
import { vegetation, flats } from './common2027.js';
import { farmVillage, evenThreshold, segDist } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(1985_53);

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Lübstorf', 0, 470, 'centre'),
  P('B', 'Groß Trebbow', -360, 285, 'west'),
  P('C', 'Medewege', 60, 228, 'centre'),
  P('D', 'Wickendorf', 300, 300, 'east'),
  P('E', 'Lankow', -270, 82, 'west', { radius: 24 }),
  P('F', 'Schwerin', -30, -4, 'centre', { radius: 30 }),
  P('G', 'Schlossgarten', 330, -92, 'east', { radius: 24 }),
  P('H', 'Neumühle', -300, -262, 'west'),
  P('I', 'Krebsförden', -80, -240, 'centre'),
  P('J', 'Zippendorf', 350, -310, 'east'),
  P('K', 'Görries', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

/** The roads: one up each sector from base edge to base edge (the east one is the F 106 from Wismar), and three laterals. */
const ROADS = [
  [[-SIDE_X, 640], [-SIDE_X, 520], at('B'), at('E'), at('H'), [-SIDE_X, -520], [-SIDE_X, -640]],
  [[0, 640], at('A'), [20, 360], at('C'), [30, 120], at('F'), [-60, -120], at('I'), [-20, -380], at('K'), [0, -640]],
  [[SIDE_X, 640], [SIDE_X, 520], at('D'), [315, 120], at('G'), at('J'), [SIDE_X, -520], [SIDE_X, -640]],
  [at('B'), [-150, 262], at('C'), [180, 270], at('D')],
  [at('E'), [-150, 30], at('F'), [130, -30], [260, -60], at('G')],
  [at('H'), [-190, -255], at('I'), [130, -280], at('J')],
];
const roadD = (x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z)));
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
/** The railway: down from Bad Kleinen along the lake shore to the Hauptbahnhof, then south-west toward Ludwigslust. */
const RAIL = [[395, 640], [390, 260], [340, 140], [200, 60], [60, 40], [-120, 30], [-230, -100], [-250, -300], [-262, -640]];
const railD = (x: number, z: number) => segDist(RAIL, x, z);

const PALACE = { x: 200, z: -128, r: 24 };
const LAKES: any[] = [
  { x: 640, z: 0, rx: 215, rz: 600, rot: 0, depth: 8, seed: 1, name: 'Schweriner See' },
  // NATO's half
  { x: -140, z: 380, rx: 50, rz: 28, rot: 0.2, depth: 4, seed: 2, name: 'Medeweger See' },
  { x: -170, z: 150, rx: 26, rz: 55, rot: -0.3, depth: 4, seed: 3, name: 'Lankower See' },
  { x: -60, z: 85, rx: 20, rz: 32, rot: 0.1, depth: 2.5, seed: 4, name: 'Pfaffenteich' },
  { x: 190, z: 150, rx: 30, rz: 80, rot: -0.5, depth: 4, seed: 5, name: 'Ziegelsee' },
  // the Pact's half
  { x: -160, z: -372, rx: 50, rz: 28, rot: -0.2, depth: 4, seed: 6, name: 'Neumühler See' },
  { x: -130, z: -120, rx: 26, rz: 62, rot: 0.25, depth: 4, seed: 7, name: 'Ostorfer See' },
  { x: 130, z: -400, rx: 50, rz: 28, rot: 0.3, depth: 4, seed: 8, name: 'Faule See' },
  { x: PALACE.x, z: PALACE.z, rx: 60, rz: 44, rot: 0, depth: 4, seed: 9, name: 'Burgsee' },
];
const water = createLakes({ lakes: LAKES });
const wet = (x: number, z: number, m = 1.15) => water.q(x, z) < m;
/** The palace island and its causeway east to the Schlossgarten. */
const islandK = (x: number, z: number) => Math.max(smoothstep(PALACE.r + 3, PALACE.r - 3, Math.hypot(x - PALACE.x, z - PALACE.z)),
  smoothstep(6, 3.5, Math.abs(z - PALACE.z)) * smoothstep(PALACE.x, PALACE.x + 4, x) * smoothstep(PALACE.x + 90, PALACE.x + 80, x));

/** Moraine rises [x, z, r, h]: each half two of its own, the town on a low one in the middle. */
const RISES = [[-280, 410, 150, 10], [150, 340, 110, 8], [-90, -380, 120, 9], [250, -440, 120, 9], [-30, 0, 90, 4]];
function height(x: number, z: number) {
  let h = 5 + fbm(noise, x * 0.0035, z * 0.0035, 4) * 4 + fbm(noise, x * 0.015 + 9, z * 0.015, 3) * 1.0;
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += smoothstep(440, 600, -x) * (10 + ridged(noise, x * 0.01, z * 0.01, 3) * 10);   // the wooded hills west of the map
  h += smoothstep(BASE_Z - 60, 660, Math.abs(z)) * 10;
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 5 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  h = water.carve(x, z, Math.max(1.6, h));
  const k = islandK(x, z);
  if (k > 0) h += (1.7 - h) * k;
  return h;
}

/** Each side's field strip behind its own flank (tower here, the runway 55 m further out along x: systems/Airfields.js). */
const AIRFIELDS = [{ faction: 'nato', x: -230, z: 470, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: 230, z: -470, yaw: -Math.PI / 2, large: false }];
const onAirfield = (x: number, z: number) => AIRFIELDS.some((a) => Math.abs(x - a.x) < 150 && z * Math.sign(a.z) > Math.abs(a.z) - 45);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Platoon' }];

export default {
  id: 'schwerin',
  name: 'Schwerin',
  description: 'Mecklenburg, autumn 1985: NATO’s counterstroke down the Wismar road into the GDR. Schwerin’s old town and palace between its lakes, the Schweriner See along the east, villages, LPG fields and beech woods of the lowland.',
  epochs: ['1985'],
  region: 'europe',
  armies: { nato: ['bw', 'us'], pact: ['nva', 'sov'] }, // (the Bundeswehr and the US Army against the NVA and the Soviet Army)
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1985,
  height,
  river: water,
  airfields: AIRFIELDS,
  fields: createFields({ seed: 1985_53, cell: 90, weights: [0.25, 0.35, 0.3, 0.1] as any }), // (big collective-farm fields)

  theme: {
    // an overcast autumn day over Mecklenburg
    fogColor: 0xa4aaa8, fogDensity: 0.0016, skyTop: 0x6c7680, skyHorizon: 0xbcc0ba, skyBottom: 0x747670,
    sunColor: 0xece2cc, sunIntensity: 1.7, sunDisk: 0.15, clouds: 0.75, cloudLight: 0xd0d2cc, cloudDark: 0x7e848a,
    sunDir: [-0.4, 0.55, 0.7], hemiSky: 0xc4ccd2, hemiGround: 0x4c4834, hemiIntensity: 1.25, rimColor: 0xbcc4ca, rimIntensity: 0.22,
    terrain: {
      grass: '#58643a', grassAlt: '#4c5834', dryGrass: '#8a7c52', dirt: '#5a4a3a', rock: '#6e6a62', strip: '#4a3e30',
      pasture: '#56623a', ploughed: '#4e3e2e', stubble: '#9a8854', meadow: '#66703e',
      farmX: [460, 600], farmZ: [540, 660], roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x6e6c66, 0.9];                                         // tarmac and cobbles
        if (railD(x, z) < 3) return [0x5a5248, 0.9];                                      // the railway ballast
        if (islandK(x, z) > 0.5 && !wet(x, z, 0.6)) return [0x8a8070, 0.7];               // the palace terraces and causeway
        if (y < 1.5 && wet(x, z, 1.4)) return [0x7a7a52, 0.7];                            // the reedy shore
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => onAirfield(x, z) || wet(x, z, 1.35) || roadD(x, z) < 9 || railD(x, z) < 8 || islandK(x, z) > 0.05;
    const placed: number[][] = [];
    const free = (x: number, z: number, r: number) => !skip(x, z) && placed.every(([qx, qz, qr]) => Math.hypot(qx - x, qz - z) > qr + r);

    // ---- Schwerin: the Dom, the old town's blocks round the Markt and the Pfaffenteich, the palace on its island
    props.rand = mulberry32(1985_54);
    props.church({ x: -78, z: -36, yaw: 0.1 }); placed.push([-78, -36, 14]);           // the Dom
    placed.push([-30, -4, 14]);                                                            // the Markt
    props.hall({ x: -150, z: 48, yaw: 0, width: 26, depth: 10, height: 6, color: 0x8a5a44, name: 'Hauptbahnhof' }); placed.push([-150, 48, 15]);
    for (let gx = -150; gx <= 100; gx += 17) for (let gz = -90; gz <= 120; gz += 17) {
      const x = gx + (props.rand() - 0.5) * 3, z = gz + (props.rand() - 0.5) * 3;
      if (Math.hypot((x + 30) / 1.25, z - 10) > 105 || props.rand() < 0.3 || !free(x, z, 7)) continue;
      placed.push([x, z, 7]);
      props.townHouse({ x, z, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, width: 9 + props.rand() * 4, depth: 9, storeys: 2 + Math.floor(props.rand() * 3), damaged: 0.1 });
    }
    props.townHouse({ x: PALACE.x, z: PALACE.z - 4, yaw: 0, width: 24, depth: 14, storeys: 4, name: 'Schwerin Palace', damaged: 0 });
    props.church({ x: PALACE.x, z: PALACE.z + 11, yaw: Math.PI / 2 });                    // the palace chapel and its gilt dome

    // ---- the Plattenbau estates: Lankow on NATO's side of the town, the Großer Dreesch above Zippendorf on the Pact's
    for (const [px, pz, seed] of [[-270, 82, 1], [350, -310, 2]]) {
      const r = mulberry32(1985_60 + seed);
      for (let i = 0, n = 0; n < 3 && i < 60; i++) {
        const a = r() * Math.PI * 2, d = 40 + r() * 30, x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d;
        if (!free(x, z, 18) || wet(x, z, 1.6)) continue;
        placed.push([x, z, 18]);
        flats(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, storeys: 5, width: 30, depth: 11, name: 'Plattenbau' });
        n++;
      }
    }
    // ---- the villages, an LPG's barns by each sector's outer village
    for (const p of points) {
      if (p.id === 'F') continue;
      farmVillage(props, p.x, p.z, 'ABDHJK'.includes(p.id) ? 6 : 8, 1985_70 + Math.round(p.x * 3 + p.z * 7), (x, z) => !free(x, z, 8), 1.2);
    }
    for (const [x, z] of [[-395, 330], [285, 345], [-345, -300], [395, -350]]) if (free(x, z, 16)) props.hall({ x, z, yaw: 0.1, width: 30, depth: 12, height: 6, color: 0x7a6a58, name: 'LPG barn' });

    // ---- the railway, its station wagons by the Hauptbahnhof
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [x0, z0] = RAIL[i], [x1, z1] = RAIL[i + 1];
      props.rails({ x0, z0: Math.max(-560, Math.min(560, z0)), x1, z1: Math.max(-560, Math.min(560, z1)) });
    }
    for (const k of [0, 1, 2]) props.wagon({ x: -95 + k * 13, z: 30 + (25 + k * 13) / 18, yaw: Math.PI / 2 - 0.055, kind: k === 1 ? 'tank' : 'open', color: k === 1 ? 0x3e3e38 : 0x5a3426 });

    // ---- farmsteads, field walls and hay over the fields, each half its own
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay', 'wrecks'];
    for (let tries = 0, n = 0; n < 130 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || !free(x, z, 12) || wet(x, z, 1.7)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();
    water.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z, 1.05) || roadD(x, z) < 5 || railD(x, z) < 4 || islandK(x, z) > 0.05 }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.006 + 70, z * 0.006, 3);
    const tN = 0.02, tP = evenThreshold(wood, tN, (x, z) => z > 0);   // (each half its own woods, the same in area)
    const town = (x: number, z: number) => Math.hypot((x + 30) / 1.25, z - 10) < 120;
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4200, hedges: 1500, autumn: 0.55, broadleaf: 0.6,
      forest: (x: number, z: number) => {
        if (wet(x, z, 1.05)) return -1;
        if (town(x, z)) return 0.04;                                                   // the town's park trees
        return x < -470 || wood(x, z) > (z > 0 ? tN : tP) ? 0.88 : 0;                  // the beech and pine woods
      },
      noHedge: (x: number, z: number) => town(x, z),
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
