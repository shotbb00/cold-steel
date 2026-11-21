// Wesel and the Rhine, spring 1985 (a war that did not happen; the big field, 1.0 × 1.12 km): NATO’s last line on the
// Lower Rhine. The Pact’s drive over the North German Plain has reached the river at Wesel and tries to cross toward
// the Low Countries; the Bundeswehr and the US Army hold the left bank. North is -x on the map (downstream, toward Rees
// and Emmerich), south +x (upstream, the Ruhr), the left bank +z (NATO’s side, toward Xanten and Alpen), the right bank
// -z (the Pact’s, toward Schermbeck and the Münsterland). On the map: the Rhine across the middle in its slanting bend,
// split round the Büdericher Insel in front of Wesel, the Wesel road bridge over both arms and the island; the Rees
// bridge downstream and a pioneer bridge at Walsum upstream; the Lippe coming into the Rhine below Wesel (its three
// bridges: Fusternberg, Wesel, Krudenburg), the Xantener Altrhein, the old arm, coming in above Büderich (three bridges:
// Birten, Xanten, Sonsbeck); grass dykes along both banks, the flat polder fields behind them; Wesel with the
// Willibrordi-Dom and the Zitadelle, Büderich across the water, Xanten with its Dom St. Viktor and Birten’s Roman
// amphitheatre under the Fürstenberg; Schloss Diersfordt in the Diersfordter Wald, Hünxe on the Lippe, Rheinberg;
// on the southern horizon the Ruhr — the Voerde power station, the Solvay works, pithead frames and chimneys.
// Fair, not mirrored: the river bends the same way for both (each bank gets the outside of one bend), the island and
// its bridge lie in the middle, the same distance from each base, its two spans as long; each side has an old arm or a
// tributary on its own flank (NATO the Altrhein to the north, the Pact the Lippe to the south), each with three bridges
// and a forward point beyond it that the enemy reaches over a Rhine bridge (the Rees bridge into NATO’s pocket, the
// Walsum bridge into the Pact’s); each has a town on its bank of the bridge (Büderich, Wesel) of the same size, a
// height by its forward point (the Fürstenberg, the Fusternberg) and one behind its line (the Bönninghardt, the Hünxe
// heights), a forest in front and one behind (the Hees and the Leucht, the Diersfordter Wald and the Hünxer Wald), and
// its points at matching distances from its base (tools/map_fairness.py).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, buildSite } from './common.js';
import { vegetation, flats } from './common2027.js';
import { farmVillage, evenThreshold, segDist, pontoons } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1985_71);

// ---- the water: the Rhine’s centre line, its bow round the island, the old arm and the Lippe
const rz = (x: number) => 115 * Math.tanh(x / 260) + 7 * Math.sin(x * 0.011 + 0.4);
const bow = (x: number) => 55 * (1 - smoothstep(70, 180, Math.abs(x)));
const RHINE: number[][] = [], SOUTH_ARM: number[][] = [];
for (let x = -840; x <= 840; x += 20) RHINE.push([x, rz(x) + bow(x)]);
for (let x = -190; x <= 190; x += 10) SOUTH_ARM.push([x, rz(x) - bow(x)]);
const ALTRHEIN = [[-240, rz(-240), 14], [-222, 40, 9], [-262, 170, 9], [-245, 300, 9], [-280, 420, 9], [-268, 660, 9]];
const LIPPE = [[245, rz(245), 14], [228, -30, 9], [262, -170, 9], [236, -310, 9], [268, -430, 9], [252, -660, 9]];
const river = createRiver({
  paths: [RHINE, SOUTH_ARM, ALTRHEIN, LIPPE],
  halfWidth: 20,
  level: 0,
  depth: 2.6,
  valley: 60,
  crossings: [
    { name: 'Rees bridge', x: -330, z: rz(-330), kind: 'bridge', width: 8, channel: 0 },
    { name: 'Wesel Rhine bridge (Büderich span)', x: 0, z: rz(0) + 55, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Wesel Rhine bridge (Wesel span)', x: 0, z: rz(0) - 55, kind: 'bridge', width: 9, channel: 1 },
    { name: 'Walsum pioneer bridge', x: 340, z: rz(340), kind: 'bridge', width: 6, channel: 0, pontoon: true },
    { name: 'Sonsbeck bridge', x: -277, z: 470, kind: 'bridge', width: 7, channel: 2 },
    { name: 'Xanten bridge', x: -245, z: 300, kind: 'bridge', width: 7, channel: 2 },
    { name: 'Birten bridge', x: -226, z: 60, kind: 'bridge', width: 7, channel: 2 },
    { name: 'Lippe bridge Wesel', x: 237, z: -305, kind: 'bridge', width: 8, channel: 3 },
    { name: 'Fusternberg bridge', x: 233, z: -55, kind: 'bridge', width: 7, channel: 3 },
    { name: 'Krudenburg bridge', x: 265, z: -470, kind: 'bridge', width: 7, channel: 3 },
  ],
});
const CR = river.crossings;
/** Over crossing i: the road’s two ends either side, the first on side s (+1: the channel’s left, toward its normal). */
const over = (i: number, s: number) => {
  const c = CR[i], L = c.channel < 2 ? 36 : 28;
  return [[c.x + c.nx * L * s, c.z + c.nz * L * s], [c.x - c.nx * L * s, c.z - c.nz * L * s]];
};
/** Near some water (a cheap box first: river.project searches every course point when far from them all). */
const nearWater = (x: number, z: number) => Math.abs(z - rz(x)) < bow(x) + 102 || (x > -310 && x < -190 && z > -130) || (x > 190 && x < 310 && z < 130);
const FAR = { ci: -1, d: Infinity, hw: 0 };
const proj = (x: number, z: number) => (nearWater(x, z) ? river.project(x, z) : FAR);
const wet = (x: number, z: number, m = 6) => { const p = proj(x, z); return p.d < p.hw + m; };

// ---- the points
const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Alpen', -40, 468, 'centre'),
  P('B', 'Xanten', -400, 300, 'west', { radius: 26 }),
  P('C', 'Büderich', -90, 260, 'centre', { radius: 26 }),
  P('D', 'Rheinberg', 310, 380, 'east'),
  P('E', 'Birten', -440, 40, 'west'),
  P('F', 'Büdericher Insel', 12, 6, 'centre', { radius: 24 }),
  P('G', 'Fusternberg', 390, -60, 'east'),
  P('H', 'Diersfordt', -330, -350, 'west'),
  P('I', 'Wesel', 110, -280, 'centre', { radius: 28 }),
  P('J', 'Hünxe', 380, -300, 'east'),
  P('K', 'Schermbeck', 35, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

/** The roads: one up each sector from edge to edge over its Rhine bridge, the laterals, and the roads over the side streams. */
const ROADS = [
  [[-330, 660], at('B'), at('E'), ...over(0, 1), at('H'), [-330, -660]],
  [[0, 660], at('A'), at('C'), [-40, 150], ...over(1, 1), at('F'), ...over(2, 1), [70, -150], at('I'), at('K'), [0, -660]],
  [[330, 660], at('D'), ...over(3, 1), at('G'), at('J'), [330, -660]],
  [at('B'), ...over(5, 1), at('C'), [150, 320], at('D')],                       // Xanten – Büderich – Rheinberg
  [at('A'), [-150, 480], ...over(4, -1), [-355, 520]],                            // Alpen – Sonsbeck
  [at('E'), ...over(6, 1), [-120, 120], [-40, 150]],                              // Birten – Büderich along the dyke
  [at('H'), [-150, -300], at('I'), ...over(7, -1), at('J')],                      // Diersfordt – Wesel – Hünxe
  [at('K'), [150, -480], ...over(9, -1), [345, -520]],                            // Schermbeck – Krudenburg
  [at('G'), ...over(8, 1), [140, -120], [70, -150]],                              // Fusternberg – Wesel
];
const roadD = (x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z)));


// ---- the ground: polder flat, a few moraine heights, grass dykes along the Rhine
/** [x, z, r, h]: NATO the Fürstenberg, the Hees, the Bönninghardt; the Pact the Fusternberg, the Diersfordt terrace, the Hünxe heights. */
const RISES = [[-410, 90, 60, 8], [-330, 190, 100, 3.5], [270, 545, 100, 10], [405, -95, 55, 7.5], [-270, -220, 110, 4], [430, -490, 100, 9.5]];
/** The flat fields kept open for each side’s airstrip (systems/Airfields.js finds them). */
const FIELDS = [[150, 430], [-150, -430]];
const fieldK = (x: number, z: number) => Math.max(...FIELDS.map(([fx, fz]) => smoothstep(170, 140, Math.abs(x - fx)) * smoothstep(60, 40, Math.abs(z - fz))));
/** The dyke along each bank of the Rhine (its two arms, not the side streams): 0..1 across its crest. */
const dykeK = (x: number, z: number) => { const p = proj(x, z); return p.ci > 1 || p.ci < 0 ? 0 : Math.exp(-(((p.d - 70) / 6) ** 2)); };

function height(x: number, z: number) {
  let h = 3 + fbm(noise, x * 0.003, z * 0.003, 4) * 1.6 + fbm(noise, x * 0.02 + 9, z * 0.02, 2) * 0.4;
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += smoothstep(570, 690, Math.abs(z)) * 12;                                   // the low heights beyond each base
  h += (3 - h) * fieldK(x, z);
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 2 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  h = river.carve(x, z, Math.max(1.4, h));
  const k = dykeK(x, z);
  return k > 0.01 ? h + 2.6 * k * (1 - 0.7 * smoothstep(9, 3, roadD(x, z))) : h;  // (the roads cut a ramp through the dyke)
}

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1. Zug' }];

export default {
  id: 'wesel',
  name: 'Wesel and the Rhine',
  description: 'The Lower Rhine, spring 1985: NATO’s last line, where the Pact’s drive over the North German Plain tries to cross toward the Low Countries. The Rhine at Wesel split round the Büdericher Insel, its bridges, the Lippe mouth, Xanten and the Diersfordter Wald, dykes and flat polder fields, the Ruhr’s chimneys on the horizon.',
  epochs: ['1985'],
  region: 'europe',
  armies: { nato: ['bw', 'us'], pact: ['sov', 'nva'] }, // (the Bundeswehr and the US Army against the Soviet Army and the NVA)
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1985_71,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1985_71, cell: 80 }),

  theme: {
    // a grey spring day over the Lower Rhine, haze toward the Ruhr
    fogColor: 0xa8aeb0, fogDensity: 0.0014, skyTop: 0x6a7682, skyHorizon: 0xc0c4c0, skyBottom: 0x767a74,
    sunColor: 0xeee6d2, sunIntensity: 1.8, sunDisk: 0.2, clouds: 0.7, cloudLight: 0xd4d6d2, cloudDark: 0x80868c,
    sunDir: [0.5, 0.55, 0.6], hemiSky: 0xc4ccd4, hemiGround: 0x4c4a36, hemiIntensity: 1.25, rimColor: 0xbcc4ca, rimIntensity: 0.22,
    terrain: {
      grass: '#5a6a3a', grassAlt: '#4e5e34', dryGrass: '#8a7e54', dirt: '#5a4a3a', rock: '#6e6a62', strip: '#4a3e30',
      pasture: '#5e6e3c', ploughed: '#54422f', stubble: '#9a8a58', meadow: '#6a763e',
      farmX: [520, 600], farmZ: [580, 660], roads: [],
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.8) return [0x6c6a64, 0.9];                                      // tarmac
        if (dykeK(x, z) > 0.35) return [0x6c7a44, 0.5];                            // the dyke’s mown grass
        if (y < 1.4 && wet(x, z, 8)) return [0x7a7650, 0.6];                       // the shingle and reeds of the banks
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-330, 0, 330] }, pact: { x: 0, z: -BASE_Z, entries: [-330, 0, 330] } },
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
    const nearBridge = (x: number, z: number) => CR.some((c) => Math.hypot(x - c.x, z - c.z) < 50);
    const skip = (x: number, z: number) => wet(x, z, 8) || roadD(x, z) < 9 || dykeK(x, z) > 0.12 || fieldK(x, z) > 0.01 || nearBridge(x, z);
    const placed: number[][] = [];
    const free = (x: number, z: number, r: number) => !skip(x, z) && placed.every(([qx, qz, qr]) => Math.hypot(qx - x, qz - z) > qr + r);
    /** A town in the ellipse (cx, cz, rx, rz): n town houses, 2–4 storeys. */
    const town = (cx: number, cz: number, rx: number, rzz: number, n: number, seed: number, storeys = 2) => {
      const r = mulberry32(seed);
      for (let i = 0, k = 0; k < n && i < n * 30; i++) {
        const x = cx + (r() * 2 - 1) * rx, z = cz + (r() * 2 - 1) * rzz;
        if (((x - cx) / rx) ** 2 + ((z - cz) / rzz) ** 2 > 1 || !free(x, z, 7)) continue;
        placed.push([x, z, 7]);
        props.townHouse({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 4, depth: 9, storeys: storeys + Math.floor(r() * 2), damaged: 0.1 });
        k++;
      }
    };
    props.rand = mulberry32(1985_72);

    // ---- Wesel (the Pact’s bank): the Willibrordi-Dom, the Zitadelle’s brick walls, the rebuilt town to the bridge
    props.church({ x: 85, z: -235, yaw: 0.3 }); placed.push([85, -235, 15]);
    placed.push([110, -280, 12]);
    for (const [dx, dz, yaw] of [[0, -18, 0], [0, 18, 0], [-18, 0, Math.PI / 2], [18, 0, Math.PI / 2]]) props.lowWall({ x: 165 + dx, z: -165 + dz, yaw, length: 30, height: 2.4, color: 0x8a5a44 });
    placed.push([165, -165, 22]);
    for (const [x, z, yaw] of [[30, -150, 0.4], [150, -250, 0.4]]) if (free(x, z, 16)) { placed.push([x, z, 16]); flats(props, { x, z, yaw, storeys: 4, width: 26, depth: 10, name: 'block of flats' }); }
    town(75, -195, 105, 85, 40, 1985_73);
    // ---- Büderich (NATO’s bank) across the water: its church, the same size of town to its end of the bridge
    props.church({ x: -100, z: 225, yaw: -0.4 }); placed.push([-100, 225, 15]);
    placed.push([-90, 260, 12]);
    for (const [x, z, yaw] of [[-20, 175, 0.4], [-150, 280, -0.3]]) if (free(x, z, 16)) { placed.push([x, z, 16]); flats(props, { x, z, yaw, storeys: 4, width: 26, depth: 10, name: 'block of flats' }); }
    town(-70, 200, 105, 85, 40, 1985_74);
    // ---- Xanten: the Dom St. Viktor, the Klever Tor, the old town
    props.church({ x: -420, z: 325, yaw: 0 }); placed.push([-420, 325, 15]);
    props.townHouse({ x: -360, z: 345, yaw: 0, width: 9, depth: 9, storeys: 4, name: 'Klever Tor', damaged: 0 }); placed.push([-360, 345, 8]);
    town(-395, 300, 62, 52, 18, 1985_75);
    // ---- Birten under the Fürstenberg: the Roman amphitheatre’s ring, the village
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; props.lowWall({ x: -470 + Math.cos(a) * 22, z: 70 + Math.sin(a) * 16, yaw: -a, length: 9, height: 1.5, color: 0x9a8a70 }); }
    placed.push([-470, 70, 26]);
    town(-430, 30, 40, 35, 8, 1985_76);
    // ---- Rheinberg, Hünxe, Fusternberg: small towns with their churches
    for (const [x, z, n, seed] of [[310, 380, 14, 77], [380, -300, 14, 78], [390, -60, 10, 79]]) {
      props.church({ x: x + 18, z: z + 14, yaw: 0.2 }); placed.push([x + 18, z + 14, 14], [x, z, 10]);
      town(x, z, 50, 45, n, 1985_00 + seed);
    }
    // ---- Schloss Diersfordt in its wood, and the village of Flüren by it
    props.townHouse({ x: -305, z: -330, yaw: 0.2, width: 22, depth: 12, storeys: 3, name: 'Schloss Diersfordt', damaged: 0 }); placed.push([-305, -330, 16]);
    town(-345, -360, 45, 40, 12, 1985_80);
    // ---- the island: Fort Blücher’s old earthworks and a few farm buildings
    for (const [dx, dz, yaw] of [[-30, 14, 0.4], [40, -10, 0.4]]) props.lowWall({ x: 12 + dx, z: 6 + dz, yaw, length: 16, height: 1.8, color: 0x7a7060 });
    // ---- the villages at the homes and on the polders
    for (const p of points) if ('AK'.includes(p.id)) farmVillage(props, p.x, p.z, 7, 1985_81 + p.z, (x, z) => !free(x, z, 8), 1.2);

    // ---- the Ruhr on the southern horizon (past the map’s edge): the Voerde power station on the right bank, the
    // Solvay works on the left, pithead frames and chimneys
    props.rand = mulberry32(1985_82);
    for (const [x, z, h] of [[640, -170, 120], [660, -130, 120], [620, 230, 80], [700, 40, 90], [740, -380, 70], [720, 420, 70]]) props.chimney({ x, z, height: h });
    props.hall({ x: 610, z: -150, yaw: Math.PI / 2, width: 70, depth: 30, height: 28, color: 0x6e6a64, name: 'Voerde power station' });
    props.hall({ x: 600, z: 270, yaw: Math.PI / 2, width: 60, depth: 26, height: 16, color: 0x7a6a58, name: 'Solvay works' });
    props.tanks({ x: 640, z: 320, yaw: Math.PI / 2, count: 4, radius: 6, height: 12 });
    for (const [x, z] of [[620, -330], [660, 420], [690, -40]]) props.headframe({ x, z, yaw: Math.PI / 2, height: 42 });
    props.hall({ x: 650, z: -420, yaw: 0, width: 40, depth: 20, height: 12, color: 0x6a5a4a, name: 'colliery' });

    // ---- farmsteads, field walls and hay over the polders, each half its own dice
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay', 'wrecks'];
    for (let tries = 0, n = 0; n < 130 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 55) || !free(x, z, 12)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();
    river.build(scene, terrain);
    pontoons(river, scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...CR.map((c) => ({ x: c.x, z: c.z, r: 40 })),
      { test: (x: number, z: number) => wet(x, z, 3) || roadD(x, z) < 5 || fieldK(x, z) > 0.01 || dykeK(x, z) > 0.3 }];
    // the named forests (the Hees and the Leucht, the Diersfordter Wald and the Hünxer Wald) and copses, each half the same in area
    const FORESTS = [[-330, 175, 85], [210, 520, 80], [-250, -200, 95], [440, -470, 75]];
    const wood = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3) + Math.max(...FORESTS.map(([fx, fz, r]) => smoothstep(r, r * 0.5, Math.hypot(x - fx, z - fz))));
    const tN = 0.35, tP = evenThreshold(wood, tN, (x, z) => z > 0);
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3800, hedges: 1600, autumn: 0.1, broadleaf: 0.7,
      forest: (x: number, z: number) => {
        if (wet(x, z, 2)) return -1;
        if (wet(x, z, 14)) return 0.35;                                            // willows and poplars on the banks
        return wood(x, z) > (z > 0 ? tN : tP) ? 0.85 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
