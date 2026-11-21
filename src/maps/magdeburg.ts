// Magdeburg and the Elbe, autumn 1985 (a war that did not happen; the big field, 1.0 × 1.12 km): deep in the GDR, where
// a NATO counteroffensive down the autobahn from Helmstedt would reach the rear of the Group of Soviet Forces in Germany.
// The US Army and the Bundeswehr come from the west (+z, the Börde toward Helmstedt), the Soviet Army and the NVA hold
// the east bank (-z, toward Burg and the Fläming). Across the middle runs the Elbe, the Stromelbe with the Alte Elbe
// split off it round the Werder, the long island under the city with the Stadthalle and the Rotehorn park. Four bridges:
// the A2 autobahn bridge at Hohenwarthe on the north flank (-x), the Strombrücke from the Altstadt onto the Werder and
// the Anna-Ebert-Brücke from the Werder to Brückfeld in the middle, the Schönebeck bridge on the south flank (+x).
// On NATO’s bank: the Altstadt with the Dom on its rock over the river, the Plattenbau estate of Neu Olvenstedt, the
// Rothensee harbour, and in the north the Letzlinger Heide — heath, sand and pines, tank trails and the Soviet garrison
// at Hillersleben. On the Pact’s bank: Brückfeld and the Plattenbau of Cracau, Pechau in the meadows, Hohenwarthe at the
// autobahn bridge, and in the south the Altengrabow training area — its own heath, pines, trails and Soviet barracks.
// Fair, not mirrored: the Stromelbe bulges toward NATO, the Alte Elbe toward the Pact, so the Werder in the middle is
// one bridge from each bank; each side has one flank bridge with a forward point on its own bank beside it (Rothensee
// in the north for NATO, Pechau in the south for the Pact), a heath with its barracks on one flank (the Letzlinger Heide
// north, Altengrabow south), a Plattenbau estate in its centre sector, a town quarter at its bridgehead (the Altstadt /
// Brückfeld), a moraine rise behind its line (the Hohe Börde, the Fläming’s edge) and its points at matching distances
// from its base, though not in mirrored places (measured: tools/map_fairness.py). The land falls gently north with the
// river, alike for both halves.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, buildSite, buildVillage } from './common.js';
import { vegetation, flats } from './common2027.js';
import { evenThreshold, segDist } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const W = -330, E = 330;   // the flank roads: the A2 in the north (-x), the road to Schönebeck in the south (+x)
const noise = createNoise2D(1985_81);

// the Stromelbe across the map, bulging toward NATO under the city; the Alte Elbe split off it round the Werder
const elbeZ = (x: number) => 32 * Math.exp(-((x / 175) ** 2)) + 9 * Math.sin(x * 0.006 + 0.8) + 5 * Math.sin(x * 0.017);
const ARM = [[-215, elbeZ(-215), 8], [-170, -6, 10], [-110, -34, 10], [-40, -44, 10], [0, -45, 10], [50, -43, 10], [115, -30, 10], [165, -8, 10], [205, elbeZ(205), 8]];
const armZ = (x: number) => { for (let i = 0; i < ARM.length - 1; i++) { const [ax, az] = ARM[i], [bx, bz] = ARM[i + 1]; if (x <= bx) return az + (bz - az) * (x - ax) / (bx - ax); } return ARM[ARM.length - 1][1]; };
const river = createRiver({
  paths: [elbeZ, ARM],
  halfWidth: 15,
  level: 0,
  depth: 2.6,
  valley: 40,
  crossings: [
    { name: 'Hohenwarthe autobahn bridge', x: W, kind: 'bridge', width: 13, channel: 0 },
    { name: 'Strombrücke', x: 0, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Anna-Ebert-Brücke', x: 0, z: armZ(0), kind: 'bridge', width: 8, channel: 1 },
    { name: 'Schönebeck bridge', x: E, kind: 'bridge', width: 8, channel: 0 },
  ],
});
/** How far from the water (either arm), roughly in z. */
const away = (x: number, z: number) => Math.min(Math.abs(z - elbeZ(x)), Math.abs(x) < 215 ? Math.abs(z - armZ(x)) : 1e9);
const onWerder = (x: number, z: number) => Math.abs(x) < 200 && z < elbeZ(x) - 15 && z > armZ(x) + 10;

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Irxleben', 0, 470, 'centre'),
  P('B', 'Letzlinger Heide', -370, 320, 'west'),
  P('C', 'Neu Olvenstedt', 100, 300, 'centre', { radius: 26 }),
  P('D', 'Ottersleben', 350, 330, 'east'),
  P('E', 'Rothensee', -390, 85, 'west'),
  P('F', 'Werder', 0, -8, 'centre', { radius: 24 }),
  P('G', 'Pechau', 435, -135, 'east'),
  P('H', 'Hohenwarthe', -300, -250, 'west'),
  P('I', 'Cracau', -40, -280, 'centre', { radius: 26 }),
  P('J', 'Altengrabow', 400, -400, 'east'),
  P('K', 'Burg', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

/** The roads: the A2 up the north flank over its bridge, the B1 through the city over both bridges, the Schönebeck road
 *  up the south flank, and the laterals behind each line and along each bank. */
const ROADS = [
  [[W, 640], [W, 520], [-345, 420], at('B'), [-360, 200], at('E'), [W, elbeZ(W) + 50], [W, elbeZ(W) - 50], [-335, -180], at('H'), [W, -520], [W, -640]],
  [[0, 640], at('A'), [40, 390], at('C'), [40, 180], [0, 110], [0, elbeZ(0) + 40], [0, armZ(0) - 40], [-30, -150], at('I'), [-30, -400], at('K'), [0, -640]],
  [[E, 640], [E, 520], at('D'), [345, 200], [E, elbeZ(E) + 50], [E, elbeZ(E) - 50], at('G'), [365, -200], at('J'), [E, -520], [E, -640]],
  [at('B'), [-150, 270], at('C'), [220, 320], at('D')],
  [at('E'), [-220, 110], [-90, 120], [0, 110], [160, 110], [345, 200]],
  [[-335, -180], [-160, -110], [0, -100], [120, -110], [260, -95], at('G')],
  [at('H'), [-220, -290], at('I'), [130, -330], at('J')],
];
const AUTOBAHN = ROADS[0];
const roadD = (x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z)));

/** The heaths: the Letzlinger Heide (NATO’s north flank) and Altengrabow (the Pact’s south flank), each with its tank trails. */
const HEATHS = [{ x: -330, z: 330, r: 190 }, { x: 360, z: -370, r: 190 }];
const heathK = (x: number, z: number) => Math.max(...HEATHS.map((h) => smoothstep(h.r, h.r - 60, Math.hypot(x - h.x, z - h.z))));
const TRAILS = [
  [[-480, 470], [-420, 400], [-440, 300], [-380, 230], [-300, 250], [-230, 200]],
  [[-470, 230], [-400, 280], [-300, 330], [-250, 420], [-200, 470]],
  [[-260, 300], [-330, 380], [-410, 360], [-480, 330]],
  [[470, -480], [400, -505], [300, -515], [235, -460], [230, -380], [250, -280], [200, -220]],
  [[480, -250], [420, -300], [330, -280], [270, -330], [240, -440]],
  [[290, -230], [360, -260], [430, -380], [400, -480]],
];
const trailD = (x: number, z: number) => Math.min(...TRAILS.map((t) => segDist(t, x, z)));

/** The barracks: Hillersleben in the Heide, Altengrabow’s camp — a walled square of blocks and vehicle sheds each. */
const BARRACKS = [{ x: -300, z: 380, yaw: 0.25 }, { x: 330, z: -440, yaw: -0.3 }];
const inBarracks = (x: number, z: number) => BARRACKS.some((b) => Math.hypot(x - b.x, z - b.z) < 50);

/** Each side’s flat field for its airstrip behind its own line (systems/Airfields.js finds the strip there). */
const FIELDS = [{ x: 190, z0: 385, z1: 485 }, { x: -190, z0: -485, z1: -385 }];
const fieldK = (x: number, z: number) => {
  const f = FIELDS[z > 0 ? 0 : 1];
  return smoothstep(175, 150, Math.abs(x - f.x)) * smoothstep(f.z0 - 30, f.z0, z) * smoothstep(f.z1 + 30, f.z1, z);
};

/** Rises [x, z, r, h]: the Hohe Börde behind NATO, the Fläming’s edge behind the Pact, the Domfelsen and the Cracau terrace. */
const RISES = [[-210, 500, 140, 12.5], [240, -430, 110, 7], [-70, 115, 55, 3.5], [60, -120, 55, 3.5], [-120, 250, 80, 4], [140, -250, 80, 4]];
function height(x: number, z: number) {
  let h = 5 + fbm(noise, x * 0.0035, z * 0.0035, 4) * 3.5 + fbm(noise, x * 0.02 + 9, z * 0.02, 3) * 0.7;
  h += smoothstep(50, 260, away(x, z)) * 4;                                                 // up out of the Elbe valley
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  const hk = heathK(x, z);
  if (hk > 0) h += hk * (ridged(noise, x * 0.012 + 40, z * 0.012, 3) * 4 - 1);             // the heath’s sandy swells and dunes
  h += x * 0.004;                                                                          // the land falls north, with the Elbe (alike for both)
  h += smoothstep(BASE_Z - 60, 660, Math.abs(z)) * 8;
  h += smoothstep(480, 620, Math.abs(x)) * 10;
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
    const quarter = (x0: number, x1: number, z0: number, z1: number, seed: number, keep: number) => {
      const r = mulberry32(seed);
      for (let gx = x0; gx <= x1; gx += 17) for (let gz = z0; gz <= z1; gz += 17) {
        const x = gx + (r() - 0.5) * 3, z = gz + (r() - 0.5) * 3;
        if (r() > keep || !free(x, z, 7) || nearPoint(x, z, 18)) continue;
        placed.push([x, z, 7]);
        props.townHouse({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9 + r() * 4, depth: 9, storeys: 2 + Math.floor(r() * 3), damaged: 0.1 });
      }
    };

    // ---- the Altstadt on NATO’s bank: the Dom on its rock over the river, the old town round the Breiter Weg
    props.rand = mulberry32(1985_82);
    props.church({ x: -70, z: 112, yaw: Math.PI / 2 }); placed.push([-70, 112, 15]);               // the Dom
    props.church({ x: 70, z: 135, yaw: 0 }); placed.push([70, 135, 14]);                           // the Johanniskirche
    quarter(-170, 150, 80, 175, 1985_83, 0.6);
    // ---- Brückfeld on the Pact’s bank, the same size
    props.church({ x: 85, z: -120, yaw: 0.1 }); placed.push([85, -120, 14]);
    props.hall({ x: -70, z: -125, yaw: 0, width: 30, depth: 14, height: 7, color: 0x7a5a48, name: 'SKET works hall' }); placed.push([-70, -125, 18]);
    quarter(-160, 160, -175, -80, 1985_84, 0.6);
    // ---- the Werder: the Stadthalle and the Albinmüller tower in the Rotehorn park
    props.hall({ x: 75, z: -6, yaw: 0.05, width: 30, depth: 14, height: 9, color: 0x8a5040, roof: 0x5a4c44, name: 'Stadthalle' });
    props.mast({ x: 52, z: -14, height: 22 });
    for (const [x, z] of [[-60, -4], [-95, -10], [-130, -14]]) props.townHouse({ x, z, yaw: 0, width: 10, depth: 9, storeys: 3, damaged: 0.1 });
    for (const s of [1, -1]) {                                                                        // barricades at both bridgeheads on the island
      const z = s > 0 ? elbeZ(0) - 22 : armZ(0) + 17;
      props.jersey({ x: -7, z, yaw: 0.15, length: 5 });
      props.jersey({ x: 7, z, yaw: -0.15, length: 5 });
    }
    // ---- Rothensee harbour (cranes and sheds) and Pechau’s farms
    props.hall({ x: -440, z: 50, yaw: Math.PI / 2, width: 28, depth: 12, height: 8, color: 0x6e6a60, name: 'harbour shed' }); placed.push([-440, 50, 16]);
    props.tanks({ x: -420, z: 130, count: 3, radius: 4, height: 7 }); placed.push([-420, 130, 12]);
    props.hall({ x: 440, z: -130, yaw: 0.1, width: 30, depth: 12, height: 6, color: 0x7a6a58, name: 'LPG barn' }); placed.push([440, -130, 16]);

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
    const town = (x: number, z: number) => (Math.abs(x) < 175 && Math.abs(z) > 75 && Math.abs(z) < 180);
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4200, hedges: 1400, autumn: 0.5, broadleaf: 0.45,
      forest: (x: number, z: number) => {
        if (away(x, z) < 20) return -1;
        if (town(x, z)) return 0.03;                                                     // the city’s street trees
        if (onWerder(x, z)) return x < 40 && x > -50 ? 0.05 : 0.6;                     // the Rotehorn park
        if (away(x, z) < 70 && Math.abs(x) > 230) return 0.55;                          // the Elbe’s floodplain woods
        const hk = heathK(x, z);
        if (hk > 0.3) return wood(x + 300, z) > 0.0 ? 0.85 : 0.04;                      // the heath’s pine stands
        return x < -480 || x > 480 || wood(x, z) > (z > 0 ? tN : tP) ? 0.85 : 0;
      },
      noHedge: (x: number, z: number) => town(x, z) || heathK(x, z) > 0.2 || onWerder(x, z),
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
