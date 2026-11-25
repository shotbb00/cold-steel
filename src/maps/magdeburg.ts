// Magdeburg and the Elbe, autumn 1985 (a war that did not happen; the big field, 1.0 × 1.12 km): deep in the GDR, where
// a NATO counteroffensive down the autobahn from Helmstedt would reach the rear of the Group of Soviet Forces in Germany.
// The US Army and the Bundeswehr come from the west (+z, the Börde toward Helmstedt), the Soviet Army and the NVA hold
// the east bank (-z, toward Burg and the Fläming). The Elbe slants across the field, south-east to north-west, as it
// runs here: the Stromelbe with the Alte Elbe split off it round the Werder, the long island under the city with the
// Stadthalle and the Rotehorn park. Four Elbe bridges: the A2 autobahn bridge at Hohenwarthe on the north flank (-x),
// the Strombrücke from the Altstadt onto the Werder and the Anna-Ebert-Brücke from the Werder to Brückfeld in the
// middle, the Schönebeck bridge on the south flank (+x). The Mittelland canal comes dead straight off the Börde to the
// Rothensee ship lift and the Elbe north of the city, cutting off the Rothensee harbour corner: the A2 and the
// Glindenberg road cross it on their own bridges.
// The ground is the real ground, and not the same on both banks: on NATO’s bank the city stands on the Domfelsen’s
// step over the river and the Börde rises behind it — the Altstadt with the Dom, the Plattenbau of Neu Olvenstedt, the
// Rothensee harbour, and in the north the Letzlinger Heide, heath and pines round the Soviet garrison at Hillersleben.
// On the Pact’s bank the flat meadows of the old glacial valley, with their forests (the Biederitzer Busch, the
// Kreuzhorst), Brückfeld and the SKET works, the Plattenbau of Cracau, Pechau, Hohenwarthe at the autobahn bridge, and
// in the south the Altengrabow training area on the Fläming’s edge — its heath, trails and Soviet barracks.
// Fair by distance, not by mirrored ground: the Stromelbe bulges toward NATO, the Alte Elbe toward the Pact, so the
// Werder is one bridge from each bank; each side has one flank bridge near it, with a point on the far bank beyond it
// that it reaches first (Rothensee past the canal for the Pact, Pechau in the meadows for NATO); NATO has the Börde’s
// higher ground, the Pact the meadow forests for cover and the Fläming’s edge at its back; the points are at matching
// distances from the bases, though not in mirrored places (measured: tools/map_fairness.py).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, buildSite, buildVillage } from './common.js';
import { vegetation, flats } from './common2027.js';
import { evenThreshold, segDist } from './greatWarHelpers.ts';
import { gridCache } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const W = -330, E = 330;   // the flank bridges: the A2 at Hohenwarthe in the north (-x), the Schönebeck bridge in the south (+x)
const noise = createNoise2D(1985_81);
const EXT = { x: 640, z: 760 };

// The Elbe slants across the field from the south-east corner to the north-west one (z = 0.75 x: the river really runs
// north-west here, and the two sides face each other over it on the slant). The Stromelbe bulges toward NATO under the
// city; the Alte Elbe splits off it round the Werder.
const elbeZ = (x: number) => 0.75 * x + 30 * Math.exp(-((x / 180) ** 2)) + 8 * Math.sin(x * 0.006 + 0.8) + 4 * Math.sin(x * 0.017);
const armZ = (x: number) => {
  const k = smoothstep(150, 215, Math.abs(x));
  return (0.75 * x - 45 + 8 * Math.sin(x * 0.006 + 0.8)) * (1 - k) + elbeZ(x) * k;
};
const ELBE: number[][] = []; for (let x = -1000; x <= 1000; x += 30) ELBE.push([x, elbeZ(x)]);
const ARM: number[][] = []; for (let x = -215; x <= 215; x += 25) ARM.push([x, armZ(x), Math.abs(x) > 190 ? 8 : 10]);
// the Mittelland canal: dead straight off the Börde to the Rothensee ship lift and the Elbe north of the city
const CANAL = [[-900, 650], [-470, 170], [-300, -20], [-232, elbeZ(-232) + 14]];
const canalX = (z: number) => { const [a, b] = z > 170 ? [CANAL[0], CANAL[1]] : [CANAL[1], CANAL[2]]; return a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]); };
const river = createRiver({
  paths: [ELBE, ARM, CANAL],
  halfWidth: 15,
  level: 0,
  depth: 2.6,
  valley: 40,
  crossings: [
    { name: 'Hohenwarthe autobahn bridge', x: W, z: elbeZ(W), kind: 'bridge', width: 13, channel: 0 },
    { name: 'Strombrücke', x: 0, z: elbeZ(0), kind: 'bridge', width: 9, channel: 0 },
    { name: 'Anna-Ebert-Brücke', x: 0, z: armZ(0), kind: 'bridge', width: 8, channel: 1 },
    { name: 'Schönebeck bridge', x: E, z: elbeZ(E), kind: 'bridge', width: 8, channel: 0 },
    { name: 'A2 canal bridge', x: canalX(120), z: 120, kind: 'bridge', width: 13, channel: 2 },
    { name: 'Glindenberg canal bridge', x: canalX(-10), z: -10, kind: 'bridge', width: 8, channel: 2 },
  ],
});
/** Signed distance across the Elbe (+ on NATO’s west bank, − on the Pact’s east bank, past the Alte Elbe). */
const bankV = (x: number, z: number) => { const e = elbeZ(x); return z > e ? (z - e) * 0.8 : (z - (Math.abs(x) < 215 ? Math.min(e, armZ(x)) : e)) * 0.8; };
/** How far from the water (any channel’s centre line). */
const away = gridCache((x: number, z: number) => river.project(x, z).d, EXT, 4);
const onWerder = (x: number, z: number) => Math.abs(x) < 195 && z < elbeZ(x) - 20 && z > armZ(x) + 14;
/** A point in the river’s frame: u along the Elbe (toward the south-east), v across it (toward NATO). */
const fr = (u: number, v: number) => [0.8 * u - 0.6 * v, 0.6 * u + 0.8 * v];
const YAW = -Math.atan2(0.6, 0.8);   // (a building squared to the river)

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Irxleben', 0, 470, 'centre'),
  P('B', 'Letzlinger Heide', -380, 330, 'west'),
  P('C', 'Neu Olvenstedt', 90, 300, 'centre', { radius: 26 }),
  P('D', 'Ottersleben', 350, 335, 'east'),
  P('E', 'Rothensee', -420, -80, 'west'),
  P('F', 'Werder', 0, -8, 'centre', { radius: 24 }),
  P('G', 'Pechau', 440, 120, 'east'),
  P('H', 'Hohenwarthe', -300, -330, 'west'),
  P('I', 'Cracau', -40, -280, 'centre', { radius: 26 }),
  P('J', 'Altengrabow', 400, -400, 'east'),
  P('K', 'Burg', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };
/** d m off the channel `f` at x, square to it (+ toward NATO). */
const across = (x: number, d: number, f = elbeZ) => [x - 0.6 * d, f(x) + 0.8 * d];

/** The roads: the A2 over the canal and the Elbe at Hohenwarthe, the B1 through the city over both bridges, the
 *  Schönebeck road over the south bridge, and the laterals behind each line and along each bank. */
const ROADS = [
  [[-330, 640], [-345, 450], at('B'), [-400, 210], [canalX(120) + 25, 145], [canalX(120) - 25, 95], at('E'), across(W, 45), across(W, -45), at('H'), [-330, -520], [-330, -640]],
  [[0, 640], at('A'), [40, 390], at('C'), [40, 180], [0, 120], across(0, 40), across(0, -40, armZ), [-30, -150], at('I'), [-30, -400], at('K'), [0, -640]],
  [[330, 640], [330, 520], at('D'), across(E, 45), across(E, -45), at('G'), [400, -60], [410, -250], at('J'), [330, -520], [330, -640]],
  [at('B'), [-150, 270], at('C'), [220, 320], at('D')],
  [at('E'), [canalX(-10) - 28, -10], [canalX(-10) + 28, -10], [-200, 60], [-90, 105], [0, 120], [160, 225], at('D')],
  [at('H'), [-200, -235], [-90, -150], [0, -110], [150, -25], [300, 95], at('G')],
  [at('H'), [-200, -330], at('I'), [130, -330], at('J')],
];
const AUTOBAHN = ROADS[0];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), EXT, 2);

/** The heaths: the Letzlinger Heide (NATO’s north flank) and Altengrabow (the Pact’s south flank), each with its tank trails. */
const HEATHS = [{ x: -330, z: 340, r: 180 }, { x: 360, z: -370, r: 190 }];
const heathK = (x: number, z: number) => Math.max(...HEATHS.map((h) => smoothstep(h.r, h.r - 60, Math.hypot(x - h.x, z - h.z))));
const TRAILS = [
  [[-480, 470], [-420, 400], [-440, 300], [-380, 250], [-300, 260], [-230, 220]],
  [[-450, 250], [-400, 290], [-300, 330], [-250, 420], [-200, 470]],
  [[-260, 300], [-330, 380], [-410, 360], [-480, 330]],
  [[470, -480], [400, -505], [300, -515], [235, -460], [230, -380], [250, -280], [200, -220]],
  [[480, -250], [420, -300], [330, -280], [270, -330], [240, -440]],
  [[290, -230], [360, -260], [430, -380], [400, -480]],
];
const trailD = (x: number, z: number) => Math.min(...TRAILS.map((t) => segDist(t, x, z)));

/** The barracks: Hillersleben in the Heide, Altengrabow’s camp — a walled square of blocks and vehicle sheds each. */
const BARRACKS = [{ x: -300, z: 390, yaw: 0.25 }, { x: 330, z: -440, yaw: -0.3 }];
const inBarracks = (x: number, z: number) => BARRACKS.some((b) => Math.hypot(x - b.x, z - b.z) < 50);

/** Each side’s flat field for its airstrip behind its own line (systems/Airfields.js finds the strip there). */
const FIELDS = [{ x: 190, z0: 385, z1: 485 }, { x: -190, z0: -485, z1: -385 }];
const fieldK = (x: number, z: number) => {
  const f = FIELDS[z > 0 ? 0 : 1];
  return smoothstep(175, 150, Math.abs(x - f.x)) * smoothstep(f.z0 - 30, f.z0, z) * smoothstep(f.z1 + 30, f.z1, z);
};

/** Rises [x, z, r, h]: the Hohe Börde behind NATO, the Fläming’s edge behind the Pact. */
const RISES = [[-200, 520, 170, 5], [230, -480, 230, 17], [420, -250, 120, 6], [-120, 250, 80, 3]];
function height(x: number, z: number) {
  let h = 4 + fbm(noise, x * 0.0035, z * 0.0035, 4) * 2.2 + fbm(noise, x * 0.02 + 9, z * 0.02, 3) * 0.6;
  const v = bankV(x, z);
  if (v > 0) h += 5 * smoothstep(30, 110, v) + 2 * smoothstep(160, 520, v);               // west bank: the Domfelsen’s step up onto the Börde, rising on
  else h -= 0.8 * smoothstep(-20, -200, v);                                               // east bank: the flat meadows of the old glacial valley
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  const hk = heathK(x, z);
  if (hk > 0) h += hk * (ridged(noise, x * 0.012 + 40, z * 0.012, 3) * 4 - 1);             // the heath’s sandy swells and dunes
  h += smoothstep(BASE_Z - 60, 660, Math.abs(z)) * 6;
  h += smoothstep(480, 620, Math.abs(x)) * 8;
  h += (6 - h) * fieldK(x, z);                                                              // the airstrip fields
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 5 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Platoon' }];

export default {
  id: 'magdeburg',
  name: 'Magdeburg and the Elbe',
  description: 'The GDR, autumn 1985: NATO’s counteroffensive reaches the Elbe at Magdeburg. The Werder between the river’s arms, the Dom over the Altstadt, Plattenbau estates, the A2 autobahn bridge, and the Letzlinger Heide and Altengrabow heaths with their Soviet barracks.',
  epochs: ['1985'],
  region: 'europe',
  armies: { nato: ['us', 'bw'], pact: ['sov', 'nva'] }, // (the US Army and the Bundeswehr against the Group of Soviet Forces and the NVA)
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1985_81,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1985_81, cell: 90, weights: [0.25, 0.35, 0.3, 0.1] as any }), // (the Börde’s big collective-farm fields)

  theme: {
    // a hazy grey autumn day over the Börde
    fogColor: 0xa8aca6, fogDensity: 0.0017, skyTop: 0x6a7480, skyHorizon: 0xbebfb6, skyBottom: 0x74746c,
    sunColor: 0xeee2c8, sunIntensity: 1.7, sunDisk: 0.18, clouds: 0.7, cloudLight: 0xd2d2cc, cloudDark: 0x7e8288,
    sunDir: [0.5, 0.55, 0.6], hemiSky: 0xc4ccd2, hemiGround: 0x504a36, hemiIntensity: 1.25, rimColor: 0xbcc4ca, rimIntensity: 0.22,
    terrain: {
      grass: '#5a643a', grassAlt: '#4e5834', dryGrass: '#8e7e52', dirt: '#5c4c3a', rock: '#6e6a62', strip: '#4a3e30',
      pasture: '#58623a', ploughed: '#4a3a2c', stubble: '#9a8854', meadow: '#66703e',
      farmX: [460, 600], farmZ: [540, 660], roads: [W, 0, E], roadZ: 560,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (segDist(AUTOBAHN, x, z) < 6) return [0x77756e, 0.9];                            // the autobahn’s concrete
        if (rd < 3.5) return [0x6a6862, 0.9];                                               // tarmac and cobbles
        if (inBarracks(x, z)) return [0x7a7466, 0.6];                                       // the barracks’ parade grounds
        const hk = heathK(x, z);
        if (hk > 0) {
          if (trailD(x, z) < 4) return [0xb09c70, 0.9 * hk];                                // the tank trails’ churned sand
          const n = fbm(noise, x * 0.03 + 20, z * 0.03, 2);
          return [n > 0.1 ? 0x6a5650 : 0x9a8a5e, (0.55 + Math.abs(n) * 0.4) * hk];         // heather and open sand
        }
        if (y < 1.6 && away(x, z) < 34) return [0x7a7a50, 0.6];                             // the reedy banks
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const crossingNear = (x: number, z: number, r: number) => river.crossings.some((c: any) => Math.hypot(x - c.x, z - c.z) < r);
    const skip = (x: number, z: number) => fieldK(x, z) > 0.01 || away(x, z) < 34 || roadD(x, z) < 9 || crossingNear(x, z, 36);
    const placed: number[][] = [];
    const free = (x: number, z: number, r: number) => !skip(x, z) && placed.every(([qx, qz, qr]) => Math.hypot(qx - x, qz - z) > qr + r);
    /** A town quarter squared to the river: a 17 m grid over u0..u1 along the Elbe and v0..v1 across it. */
    const quarter = (u0: number, u1: number, v0: number, v1: number, seed: number, keep: number) => {
      const r = mulberry32(seed);
      for (let gu = u0; gu <= u1; gu += 17) for (let gv = v0; gv <= v1; gv += 17) {
        const [x, z] = fr(gu + (r() - 0.5) * 3, gv + (r() - 0.5) * 3);
        if (r() > keep || !free(x, z, 7) || nearPoint(x, z, 18) || onWerder(x, z)) continue;
        placed.push([x, z, 7]);
        props.townHouse({ x, z, yaw: YAW + (r() < 0.5 ? 0 : Math.PI / 2), width: 9 + r() * 4, depth: 9, storeys: 2 + Math.floor(r() * 3), damaged: 0.1 });
      }
    };
    /** The nearest free spot to (u, v) in the river frame, for a building of radius r (taken). */
    const spot = (u: number, v: number, r: number) => {
      for (let k = 0; k < 60; k++) {
        const a = k * 2.4, d = k * 4, [x, z] = fr(u + Math.cos(a) * d, v + Math.sin(a) * d);
        if (free(x, z, r) && !nearPoint(x, z, r + 14)) { placed.push([x, z, r]); return { x, z }; }
      }
      const [x, z] = fr(u, v); return { x, z };
    };

    // ---- the Altstadt on NATO’s bank: the Dom on its rock over the river, the old town along the Breiter Weg
    props.rand = mulberry32(1985_82);
    props.church({ ...spot(-80, 80, 15), yaw: YAW + Math.PI / 2 });                                 // the Dom
    props.church({ ...spot(60, 110, 14), yaw: YAW });                                               // the Johanniskirche
    quarter(-210, 150, 66, 165, 1985_83, 0.6);
    // ---- Brückfeld on the Pact’s bank, the same size, and the SKET heavy-engineering works
    props.church({ ...spot(-170, -100, 14), yaw: YAW + 0.1 });
    props.hall({ ...spot(60, -150, 18), yaw: YAW, width: 30, depth: 14, height: 7, color: 0x7a5a48, name: 'SKET works hall' });
    props.hall({ ...spot(140, -120, 18), yaw: YAW, width: 34, depth: 16, height: 9, color: 0x6e5a4a, name: 'SKET rolling mill' });
    quarter(-200, 170, -165, -70, 1985_84, 0.6);
    // ---- the Werder: the Stadthalle and the Albinmüller tower in the Rotehorn park
    const mid = (x: number) => (elbeZ(x) + armZ(x)) / 2;
    props.hall({ x: 75, z: mid(75), yaw: YAW, width: 30, depth: 14, height: 9, color: 0x8a5040, roof: 0x5a4c44, name: 'Stadthalle' });
    props.mast({ x: 50, z: mid(50) - 6, height: 22 });
    for (const x of [-60, -95, -130]) props.townHouse({ x, z: mid(x), yaw: YAW, width: 10, depth: 9, storeys: 3, damaged: 0.1 });
    for (const [d, f] of [[-24, elbeZ], [20, armZ]] as const) {                                       // barricades at both bridgeheads on the island
      const [x, z] = across(0, d, f);
      props.jersey({ x: x - 7 * 0.8, z: z - 7 * 0.6, yaw: YAW + Math.PI / 2 + 0.15, length: 5 });
      props.jersey({ x: x + 7 * 0.8, z: z + 7 * 0.6, yaw: YAW + Math.PI / 2 - 0.15, length: 5 });
    }
    // ---- Rothensee: the harbour basin’s sheds and tanks, the ship lift at the canal’s end; Pechau’s farms
    props.hall({ ...spot(-460, -150, 16), yaw: YAW, width: 28, depth: 12, height: 8, color: 0x6e6a60, name: 'harbour shed' });
    props.tanks({ ...spot(-470, -60, 12), count: 3, radius: 4, height: 7 });
    { const z = -75, x = canalX(z) + 34, yaw = -Math.atan2(CANAL[2][1] - CANAL[1][1], CANAL[2][0] - CANAL[1][0]);
      props.hall({ x, z, yaw, width: 24, depth: 14, height: 16, color: 0x7a7468, roof: 0x4c4a46, name: 'Rothensee ship lift' }); placed.push([x, z, 18]); }
    props.hall({ ...spot(470, 60, 16), yaw: 0.1, width: 30, depth: 12, height: 6, color: 0x7a6a58, name: 'LPG barn' });

    // ---- the Plattenbau estates: Neu Olvenstedt (NATO), Cracau (the Pact)
    for (const [px, pz, seed] of [[...at('C'), 1], [...at('I'), 2]]) {
      const r = mulberry32(1985_85 + seed);
      for (let i = 0, n = 0; n < 4 && i < 80; i++) {
        const a = r() * Math.PI * 2, d = 42 + r() * 30, x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d;
        if (!free(x, z, 18)) continue;
        placed.push([x, z, 18]);
        flats(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, storeys: 5 + Math.floor(r() * 2), width: 30, depth: 11, name: 'Plattenbau' });
        n++;
      }
    }

    // ---- the Soviet barracks: blocks round a parade ground, vehicle sheds, a wall
    for (const [i, b] of BARRACKS.entries()) {
      const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
      const L = (u: number, v: number) => ({ x: b.x + u * c + v * s, z: b.z - u * s + v * c });
      for (const [u, v, w, d, kind] of [[-28, -24, 30, 11, 'block'], [-28, 24, 30, 11, 'block'], [26, -26, 26, 12, 'shed'], [26, 22, 26, 12, 'shed']] as any[]) {
        const q = L(u, v);
        if (kind === 'block') props.flatHouse({ x: q.x, z: q.z, yaw: b.yaw + Math.PI / 2, width: w, depth: d, storeys: 3, name: i ? 'Altengrabow barracks' : 'Hillersleben barracks' });
        else props.hall({ x: q.x, z: q.z, yaw: b.yaw + Math.PI / 2, width: w, depth: d, height: 6, color: 0x6a6a5a, name: 'vehicle shed' });
      }
      for (const [u0, v0, u1, v1] of [[-50, -50, 50, -50], [-50, 50, 50, 50], [-50, -50, -50, 50]]) {
        const a = L(u0, v0), e = L(u1, v1);
        props.lowWall({ x: (a.x + e.x) / 2, z: (a.z + e.z) / 2, yaw: Math.atan2(e.x - a.x, e.z - a.z), length: Math.hypot(e.x - a.x, e.z - a.z) - 12, height: 1.8 });
      }
      placed.push([b.x, b.z, 55]);
    }

    // ---- the villages
    for (const p of points) if (!'CFI'.includes(p.id)) buildVillage(props, p, 1985_86 + Math.round(p.x * 3 + p.z * 7), 1);

    // ---- farmsteads, field walls, hay and wrecks over the fields, each half its own dice
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay', 'wrecks', 'roadblock'];
    for (const side of [1, -1]) {
      for (let tries = 0, n = 0; n < 70 && tries < 6000; tries++) {
        const x = (rand() * 2 - 1) * (bounds.x - 20), z = side * (60 + rand() * (bounds.z - 90));
        if (Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 45) || !free(x, z, 12) || onWerder(x, z) || heathK(x, z) > 0.3) continue;
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
      { test: (x: number, z: number) => away(x, z) < 20 || roadD(x, z) < 6 || trailD(x, z) < 5 || fieldK(x, z) > 0.01 || inBarracks(x, z) }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.006 + 70, z * 0.006, 3);
    const tN = 0.12, tP = evenThreshold(wood, tN, (x, z) => z > 0);   // (each half its own woods, the same in area)
    const town = (x: number, z: number) => { const u = 0.8 * x + 0.6 * z, v = -0.6 * x + 0.8 * z; return u > -215 && u < 175 && ((v > 60 && v < 170) || (v < -60 && v > -170)); };
    const meadowWood = (x: number, z: number) => fbm(noise, x * 0.008 - 40, z * 0.008 + 15, 3);
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4200, hedges: 1400, autumn: 0.5, broadleaf: 0.45,
      forest: (x: number, z: number) => {
        if (away(x, z) < 20) return -1;
        if (town(x, z)) return 0.03;                                                     // the city’s street trees
        if (onWerder(x, z)) return x < 40 && x > -50 ? 0.05 : 0.6;                     // the Rotehorn park
        if (away(x, z) < 70 && Math.abs(x) > 230) return 0.55;                          // the Elbe’s floodplain woods
        const v = bankV(x, z);
        if (v < -40 && v > -300 && meadowWood(x, z) > -0.05) return 0.85;              // the Biederitzer Busch and the Kreuzhorst: the east bank’s meadow forests
        const hk = heathK(x, z);
        if (hk > 0.3) return wood(x + 300, z) > 0.0 ? 0.85 : 0.04;                      // the heath’s pine stands
        return x < -480 || x > 480 || wood(x, z) > (z > 0 ? tN : tP) ? 0.85 : 0;
      },
      noHedge: (x: number, z: number) => town(x, z) || heathK(x, z) > 0.2 || onWerder(x, z),
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
