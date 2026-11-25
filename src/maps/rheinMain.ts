// Rhein-Main, autumn 1985 (a war that did not happen): the Warsaw Pact’s thrust out of the Fulda Gap has come down the
// Kinzig valley past Gelnhausen and reaches the Main at Hanau, a few kilometres short of Frankfurt — NATO’s rear: the
// US V Corps’ depots, the Rhein-Main Air Base, the autobahn junctions every reinforcement passes. The US Army and the
// Bundeswehr hold the south bank; the Soviet Army and the NVA come in over the north bank. On the map, compressed:
// the Main across the middle in its big bends between Hanau and Offenbach, with only three bridges — the Kaiserlei
// bridge on the Frankfurt side (west), the Carl-Ulrich bridge between Offenbach and Fechenheim in the middle, the
// Steinheim bridge at Hanau (east). South of it (NATO, +z): Oberrad’s market gardens on the bank, Offenbach and its
// Bieberer Berg, Mühlheim, the Sachsenhäuser Berg in the Frankfurter Stadtwald with the Frankfurter Kreuz in its
// trees, the A3 across the half, Neu-Isenburg, and the edge of the Rhein-Main Air Base behind; the Spessart foothills
// on the east edge. North of it (the Pact, -z): Fechenheim and the Fechenheimer Wald, Dörnigheim on the bank, the
// Berger Rücken with Bergen-Enkheim, Hochstadt under the Hohe Straße, Hanau, the A66 across the half, the Bruchköbel
// woods and Bruchköbel; the Taunus foothills on the west edge.
// Fair, not mirrored: the Main bends its own way (south toward Oberrad, north toward Dörnigheim) and its bridges stand
// where they stand, the towns and woods are the real ones in their own places; but each side has a bank point the
// river bends away from (Oberrad for NATO, Dörnigheim for the Pact) about 100 m from the water, the centre point on the
// middle bridge straddles both banks, each half has a town (Offenbach / Hanau), an autobahn lateral, two wooded rises
// of about the same height (Sachsenhäuser and Bieberer Berg / Berger Rücken and Hohe Straße), woods of about the same
// area (the Stadtwald / the Fechenheimer and Bruchköbeler Wald), foothills on its outer flank (Spessart / Taunus) and
// an airstrip, and its points at matching distances from its base (tools/map_fairness.py).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, buildSite } from './common.js';
import { vegetation, flats } from './common2027.js';
import { farmVillage, evenThreshold, segDist } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const BX = [-340, 15, 315];   // the Main bridges: Kaiserlei, Carl-Ulrich, Steinheim
const noise = createNoise2D(1985_81);
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

/** The Main: a big bend south toward Oberrad (west), north toward Dörnigheim (east). */
const mainZ = (x: number) => 55 * Math.sin(x * Math.PI / 640) + 15 * Math.cos(x * 0.004) + 8 * Math.sin(x * 0.013 + 0.7);
const away = (x: number, z: number) => Math.abs(z - mainZ(x));
const river = createRiver({
  paths: [mainZ],
  halfWidth: 13,
  level: 0,
  depth: 2.6,
  valley: 60,
  crossings: [
    { name: 'Kaiserlei bridge', x: BX[0], kind: 'bridge', width: 8, channel: 0 },
    { name: 'Carl-Ulrich bridge', x: BX[1], kind: 'bridge', width: 9, channel: 0 },
    { name: 'Steinheim bridge', x: BX[2], kind: 'bridge', width: 8, channel: 0 },
  ],
});
const wet = (x: number, z: number, r = 0) => away(x, z) < river.halfWidth + 6 + r;

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Neu-Isenburg', 0, 470, 'centre'),
  P('B', 'Frankfurter Kreuz', -400, 300, 'west'),
  P('C', 'Offenbach', 60, 200, 'centre', { radius: 28 }),
  P('D', 'Mühlheim', 330, 262, 'east'),
  P('E', 'Oberrad', -280, 50, 'west'),
  P('F', 'Carl-Ulrich-Brücke', BX[1], mainZ(BX[1]), 'centre', { radius: 30 }),
  P('G', 'Dörnigheim', 250, -50, 'east'),
  P('H', 'Bergen-Enkheim', -290, -310, 'west'),
  P('I', 'Hochstadt', -90, -200, 'centre'),
  P('J', 'Hanau', 370, -230, 'east', { radius: 26 }),
  P('K', 'Bruchköbel', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };
const over = (x: number) => [[x, mainZ(x) + 34], [x, mainZ(x) - 34]];   // a road straight over its bridge

/** The roads: one up each sector over its bridge, the bank roads either side of the middle bridge. */
const ROADS = [
  [[-SIDE_X, 640], [-SIDE_X, 520], [-370, 420], at('B'), [-370, 190], at('E'), [-330, 10], ...over(BX[0]), [-330, -170], at('H'), [-SIDE_X, -520], [-SIDE_X, -640]],
  [[0, 640], at('A'), [30, 330], at('C'), [30, 110], ...over(BX[1]), [-40, -110], at('I'), [-40, -360], at('K'), [0, -640]],
  [[SIDE_X, 640], [SIDE_X, 520], at('D'), [330, 160], ...over(BX[2]), at('G'), [330, -130], at('J'), [SIDE_X, -520], [SIDE_X, -640]],
  [at('E'), [-150, 70], [-60, 60], [BX[1], mainZ(BX[1]) + 34]],                      // the south bank road (Offenbacher Landstraße)
  [[BX[1], mainZ(BX[1]) - 34], [100, -40], [180, -45], at('G')],                     // the north bank road (Hanauer Landstraße)
];
/** The autobahns: the A3 across NATO’s half (Frankfurter Kreuz – Offenbacher Kreuz – Hanau), the A66 across the Pact’s. */
const AUTOBAHN = [
  [[-520, 330], at('B'), [-200, 340], [-30, 300], [200, 345], [520, 360]],
  [[-520, -270], [-300, -255], [-100, -290], [150, -300], [370, -330], [520, -320]],
];
const roadD = (x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z)));
const autoD = (x: number, z: number) => Math.min(...AUTOBAHN.map((r) => segDist(r, x, z)));

/** Wooded rises [x, z, r, h]: the Sachsenhäuser and the Bieberer Berg (NATO), the Berger Rücken and the Hohe Straße (the Pact). */
const RISES = [[-170, 210, 55, 7], [170, 380, 45, 8], [-230, -260, 60, 8], [200, -170, 40, 6.5]];
/** The woods [x, z, rx, rz]: the Frankfurter Stadtwald (NATO), the Fechenheimer and the Bruchköbeler Wald (the Pact). */
const WOODS = [[-250, 300, 150, 100], [-160, -125, 100, 60], [170, -390, 110, 65]];
const inWood = (x: number, z: number) => WOODS.some(([cx, cz, rx, rz]) => ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 < 1 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.5);

function height(x: number, z: number) {
  let h = 4 + fbm(noise, x * 0.004, z * 0.004, 5) * 4 + fbm(noise, x * 0.05 + 50, z * 0.05, 3) * 0.5;
  h += smoothstep(60, 220, away(x, z)) * (5 + ridged(noise, x * 0.008 + 3, z * 0.008, 4) * 4);       // the terraces up from the Main
  h += x * 0.007;                                                                              // the land rising east toward the Spessart (alike for both halves)
  for (const [cx, cz, r, a] of RISES) h += hill(x, z, cx, cz, r, a);
  h += smoothstep(420, 560, -x) * smoothstep(120, -60, z) * (14 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 16); // the Taunus foothills
  h += smoothstep(420, 560, x) * smoothstep(-120, 60, z) * (14 + ridged(noise, x * 0.012 - 17, z * 0.012, 4) * 16);  // the Spessart foothills
  h += smoothstep(560, 680, Math.abs(z)) * 18;
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 5 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}

/** Each side’s strip behind its west / east flank (the Rhein-Main Air Base’s edge for NATO, the Erlensee field for the Pact). */
const AIRFIELDS = [{ faction: 'nato', x: -230, z: 470, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: 230, z: -470, yaw: -Math.PI / 2, large: false }];
const onAirfield = (x: number, z: number) => AIRFIELDS.some((a) => Math.abs(x - a.x) < 150 && z * Math.sign(a.z) > Math.abs(a.z) - 45);

const OFFENBACH = { x: 70, z: 175, rx: 95, rz: 70 };
const HANAU = { x: 380, z: -215, rx: 75, rz: 70 };
const inTown = (t: any, x: number, z: number, k = 1) => ((x - t.x) / t.rx) ** 2 + ((z - t.z) / t.rz) ** 2 < k;

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Platoon' }];

export default {
  id: 'rhein-main',
  name: 'Rhein-Main',
  description: 'Hesse, autumn 1985: the Pact’s thrust out of the Fulda Gap reaches the Main between Hanau and Offenbach, at Frankfurt’s door. Three bridges over the river, the towns on both banks, the Frankfurter Stadtwald and the autobahn junctions, the Rhein-Main Air Base behind.',
  epochs: ['1985'],
  region: 'europe',
  armies: { nato: ['us', 'bw'], pact: ['sov', 'nva'] }, // (the US V Corps and the Bundeswehr against the Soviet 8th Guards Army and the NVA)
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1985_81,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIRFIELDS,
  fields: createFields({ seed: 1985_81, cell: 70 }),

  theme: {
    // a grey October day over the Main
    fogColor: 0xa8acaa, fogDensity: 0.0017, skyTop: 0x6a7480, skyHorizon: 0xbec2bc, skyBottom: 0x747670,
    sunColor: 0xece2cc, sunIntensity: 1.7, sunDisk: 0.2, clouds: 0.7, cloudLight: 0xd0d2cc, cloudDark: 0x7e848a,
    sunDir: [0.4, 0.55, 0.7], hemiSky: 0xc4ccd2, hemiGround: 0x4c4834, hemiIntensity: 1.25, rimColor: 0xbcc4ca, rimIntensity: 0.22,
    terrain: {
      grass: '#58643a', grassAlt: '#4c5834', dryGrass: '#8a7c52', dirt: '#5a4a3a', rock: '#6e6a62', strip: '#4a3e30',
      pasture: '#56623a', ploughed: '#4e3e2e', stubble: '#9a8854', meadow: '#66703e',
      farmX: [520, 600], farmZ: [580, 660], roads: [],
      surface(x: number, z: number) {
        if (Math.abs(z) > 545) return null;
        const a = autoD(x, z);
        if (a < 6) return [a > 0.4 && a < 0.9 ? 0x8a8a84 : 0x56565a, 0.92];                // the autobahn’s two carriageways
        if (roadD(x, z) < 3.5) return [0x6e6c66, 0.9];                                      // tarmac
        if (inTown(OFFENBACH, x, z, 0.8) || inTown(HANAU, x, z, 0.8)) return [0x6a665e, 0.35]; // the towns’ yards and pavements
        if (wet(x, z, 4) && !wet(x, z, -4)) return [0x6e7048, 0.6];                         // the river meadows
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
    const nearBridge = (x: number, z: number, r: number) => river.crossings.some((c: any) => Math.abs(x - c.x) < r && Math.abs(z - c.z) < 45);
    const skip = (x: number, z: number) => onAirfield(x, z) || wet(x, z, 3) || roadD(x, z) < 9 || autoD(x, z) < 12 || nearBridge(x, z, 18);
    const placed: number[][] = [];
    const free = (x: number, z: number, r: number) => !skip(x, z) && placed.every(([qx, qz, qr]) => Math.hypot(qx - x, qz - z) > qr + r);

    // ---- the two towns: Offenbach (NATO’s half) round the Stadtkirche, Hanau (the Pact’s) round St. Marien, each a high-rise estate
    for (const [t, seed, church, estate] of [[OFFENBACH, 1, [40, 190], [150, 150]], [HANAU, 2, [400, -200], [300, -175]]] as any[]) {
      props.rand = mulberry32(1985_82 + seed);
      props.church({ x: church[0], z: church[1], yaw: 0.1 }); placed.push([church[0], church[1], 14]);
      const pt = points.find((p) => inTown(t, p.x, p.z));
      if (pt) placed.push([pt.x, pt.z, 13]);                                                   // (the market square)
      for (const k of [0, 1]) {
        const x = estate[0] + k * 34, z = estate[1] + (k ? 24 : 0);
        if (!free(x, z, 17)) continue;
        placed.push([x, z, 17]);
        flats(props, { x, z, yaw: k ? Math.PI / 2 : 0, storeys: 6, width: 30, depth: 11, name: 'high-rise block' });
      }
      for (let gx = t.x - t.rx; gx <= t.x + t.rx; gx += 17) for (let gz = t.z - t.rz; gz <= t.z + t.rz; gz += 17) {
        const x = gx + (props.rand() - 0.5) * 3, z = gz + (props.rand() - 0.5) * 3;
        if (!inTown(t, x, z) || props.rand() < 0.25 || !free(x, z, 7)) continue;
        placed.push([x, z, 7]);
        props.townHouse({ x, z, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, width: 9 + props.rand() * 4, depth: 9, storeys: 2 + Math.floor(props.rand() * 3), damaged: 0.1 });
      }
    }
    // ---- the middle bridge’s two ends: the Offenbach harbour’s warehouses south, Fechenheim’s works north
    props.rand = mulberry32(1985_85);
    for (const [x, z, name] of [[70, mainZ(70) + 52, 'harbour warehouse'], [-55, mainZ(-55) - 50, 'Fechenheim works']] as any[]) {
      if (!free(x, z, 15)) continue;
      placed.push([x, z, 15]);
      props.hall({ x, z, yaw: 0, width: 28, depth: 12, height: 7, color: 0x7a5a48, name });
    }
    // ---- the villages and suburbs
    for (const p of points) {
      if ('CFJ'.includes(p.id)) continue;
      if (p.id === 'B') continue;
      farmVillage(props, p.x, p.z, 'AK'.includes(p.id) ? 6 : 9, 1985_90 + Math.round(p.x * 3 + p.z * 7), (x, z) => !free(x, z, 8), 1.2);
    }
    // ---- the Frankfurter Kreuz: the interchange in the trees, a motorway services and the wrecks of a convoy
    props.rand = mulberry32(1985_86);
    for (const [x, z, yaw] of [[-380, 318, 0.3], [-420, 306, 2.1], [-395, 282, 1.2]]) if (!onAirfield(x, z)) props.wreckCar({ x, z, yaw });
    if (free(-440, 275, 12)) { placed.push([-440, 275, 12]); props.hall({ x: -440, z: 275, yaw: 0, width: 20, depth: 10, height: 5, color: 0x8a8070, name: 'motorway services' }); }
    for (const [x, z] of [[-360, 300], [-430, 330]]) props.jersey({ x, z, yaw: 1.4, length: 6 });

    // ---- the air bases’ edges: hardened shelters beside each strip
    props.rand = mulberry32(1985_87);
    for (const [x, z, yaw] of [[-440, 470, Math.PI / 2], [-440, 520, Math.PI / 2], [445, -480, -Math.PI / 2], [445, -525, -Math.PI / 2]]) {
      if (free(x, z, 16)) { placed.push([x, z, 16]); props.aircraftShelter({ x, z, yaw }); }
    }

    // ---- cover: farmsteads, walls, hay, wrecks, as many on each half, each half its own dice
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'wrecks', 'hay', 'fieldwall', 'roadblock'];
    for (const side of [1, -1]) {
      for (let tries = 0, n = 0; n < 120 && tries < 9000; tries++) {
        const x = (rand() * 2 - 1) * (bounds.x - 20), z = side * (10 + rand() * (bounds.z - 30));
        if (Math.sign(z - mainZ(x)) !== side) continue;
        if (Math.hypot(x, z - side * BASE_Z) < 45 || nearPoint(x, z, 40) || !free(x, z, 12) || wet(x, z, 8) || inTown(OFFENBACH, x, z, 1.3) || inTown(HANAU, x, z, 1.3)) continue;
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
      { test: (x: number, z: number) => wet(x, z, -4) || roadD(x, z) < 5 || autoD(x, z) < 8 || onAirfield(x, z) }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.006 + 70, z * 0.006, 3);
    const tN = 0.3, tP = evenThreshold(wood, tN, (x, z) => z > mainZ(x));   // (copses: each half its own, the same in area)
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4200, hedges: 5000, autumn: 0.5, broadleaf: 0.65,
      forest: (x: number, z: number) => {
        if (wet(x, z, -5)) return -1;
        if (inTown(OFFENBACH, x, z) || inTown(HANAU, x, z)) return 0.04;                       // the towns’ park trees
        if (inWood(x, z)) return 0.88;                                                         // the Stadtwald, the Fechenheimer and Bruchköbeler Wald
        if ((x < -450 && z < 0) || (x > 450 && z > 0)) return 0.8;                             // the Taunus and the Spessart foothills
        if (wet(x, z, 4)) return 0.45;                                                         // willows on the banks
        return wood(x, z) > (z > mainZ(x) ? tN : tP) ? 0.85 : 0;
      },
      noHedge: (x: number, z: number) => inTown(OFFENBACH, x, z, 1.2) || inTown(HANAU, x, z, 1.2),
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
