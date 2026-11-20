// Daugavpils, 2027 (a hypothetical war): Latvia's second city on the Daugava, thirty kilometres from
// the Belarusian border and not much further from Russia's. The broad river, split here by a long
// island, the old Tsarist fortress of Dinaburg on it — its brick curtain wall, barracks and arsenal —
// with three bridges onto the island from each bank; the city's Soviet blocks of flats and Church Hill on
// the north bank, Grīva's houses and blocks on the south bank, and beyond them the lakes and pine forests
// of Latgale. NATO holds the city side (south on the map, +z), Russian and Belarusian troops come up
// from the border crossing at Paternieki (north on the map). The fortress is set on an island between
// the Daugava and its old arm so that neither side starts holding it (it stands on the city bank in
// truth). Not a mirror: the two channels wind their own ways and their bridges stand at different
// places, the banks' rises, lakes and woods lie where they lie; but each side has three bridges onto the
// island, a town of the same weight across from the fortress, a big lake and a small one, and its points
// at the same distances from its base.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { createLakes } from '../world/Lakes.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { theme2027, modernVillage, flats, coverSites, vegetation, powerLine } from './common2027.js';
import { curtainWall } from './baltic2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(2044);
// the Daugava's two channels round the island: the main river on the city side, the old arm on the far side
const armN = (x) => 74 + 10 * Math.sin(x * 0.007) + 6 * Math.sin(x * 0.017 + 1);
const armS = (x) => -72 + 12 * Math.sin(x * 0.006 + 2) + 5 * Math.sin(x * 0.019);
const mid = (x) => (armN(x) + armS(x)) / 2;
const HW = 20;
const BR_N = [-330, 0, 300], BR_S = [-300, 0, 345];
const river = createRiver({
  path: armN, paths: [armN, armS], halfWidth: HW, level: 0, depth: 3.2, valley: 36,
  crossings: [
    ...BR_N.map((x, i) => ({ name: ['Railway bridge (city side)', 'Fortress bridge (city side)', 'Vienības bridge (city side)'][i], x, kind: 'bridge', width: x ? 8 : 12, channel: 0 })),
    ...BR_S.map((x, i) => ({ name: ['Railway bridge (Grīva side)', 'Fortress bridge (Grīva side)', 'Vienības bridge (Grīva side)'][i], x, kind: 'bridge', width: x ? 8 : 12, channel: 1 })),
  ],
});
const away = (x, z) => Math.min(Math.abs(z - armN(x)), Math.abs(z - armS(x)));
const onIsland = (x, z) => z < armN(x) && z > armS(x);
/** m out from the river onto a bank (0 on the island). */
const bankD = (x, z) => (z >= armN(x) ? z - armN(x) : z <= armS(x) ? armS(x) - z : 0);
const FORT = { x: 0, z: mid(0) };
const FORT_WALL = [[-92, 0], [-60, 26], [60, 26], [92, 0], [60, -26], [-60, -26]].map(([x, z]) => [FORT.x + x, mid(FORT.x + x) + z]);
const inFort = (x, z, r = 0) => Math.abs(x - FORT.x) < 95 + r && Math.abs(z - mid(x)) < 30 + r;
// the lakes: Lake Stropi and Šuņezers on the city side, the Silene lakes by the border, each its own
const lakes = createLakes({ lakes: [
  { x: 405, z: 410, rx: 45, rz: 72, rot: 0.4, depth: 5, seed: 1 },
  { x: -160, z: 320, rx: 30, rz: 22, rot: 0.2, depth: 3, seed: 2 },
  { x: -395, z: -395, rx: 45, rz: 72, rot: -0.3, depth: 5, seed: 3 },
  { x: 185, z: -340, rx: 30, rz: 22, rot: -0.6, depth: 3, seed: 4 },
] });
const RISES = [[-220, 230, 70, 6], [220, 330, 65, 8], [-420, 120, 50, 4], [-200, -380, 70, 6], [300, -190, 60, 4], [60, -440, 50, 4]];

function height(x, z) {
  const ax = Math.abs(x), az = Math.abs(z), d = bankD(x, z);
  let h = 2 + smoothstep(20, 120, d) * (10 + fbm(noise, x * 0.004, z * 0.004, 4) * 4);        // the banks up from the river
  for (const [cx, cz, r, a] of RISES) h += a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  h += fbm(noise, x * 0.012 + 20, z * 0.012, 4) * 2 * smoothstep(30, 120, d);
  h += x * 0.012 * smoothstep(60, 220, d);                                                       // both banks climbing east, toward the hills by Krāslava
  h += Math.max(0, ridged(noise, x * 0.011 + 40, z * 0.011, 4) - 0.5) * 6 * smoothstep(120, 260, d); // Latgale's hummocks
  h += smoothstep(500, 620, ax) * (12 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 16);
  h += smoothstep(560, 680, az) * 14;
  for (const bx of BR_N) if (z > armN(x)) h += (Math.min(h, 2 + d * 0.1) - h) * (1 - smoothstep(6, 16, Math.abs(x - bx))) * (1 - smoothstep(100, 140, d)); // the roads down to the bridges
  for (const bx of BR_S) if (z < armS(x)) h += (Math.min(h, 2 + d * 0.1) - h) * (1 - smoothstep(6, 16, Math.abs(x - bx))) * (1 - smoothstep(100, 140, d));
  if (inFort(x, z, 6)) h = 2.2;                                                                 // the fortress's level parade
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.3 + 10 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return lakes.carve(x, z, river.carve(x, z, Math.max(1.4, h)));
}

const pt = (id: string, name: string, x: number, z: number, sector: 'west' | 'centre' | 'east', o: { radius?: number } = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  pt('A', 'Rēzekne road', 0, 470, 'centre'),
  pt('B', 'Ruģeļi', -345, 300, 'west'),
  pt('C', 'Daugavpils', 80, 220, 'centre'),
  pt('D', 'Stropi', 345, 255, 'east'),
  pt('E', 'Railway bridge', -315, mid(-315), 'west', { radius: 22 }),
  pt('F', 'Daugavpils Fortress', FORT.x, FORT.z, 'centre', { radius: 28 }),
  pt('G', 'Vienības bridge', 322, mid(322), 'east', { radius: 22 }),
  pt('H', 'Kalkūni', -390, -225, 'west'),
  pt('I', 'Grīva', -110, -220, 'centre'),
  pt('J', 'Silene', 290, -320, 'east'),
  pt('K', 'Paternieki crossing', 0, -470, 'centre'),
];
const nearPt = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

const layout = [{ unit: 'rifles', x: 12, z: 454, name: '1st Platoon' }];

export default {
  id: 'daugavpils',
  name: 'Daugavpils',
  epochs: ['2027'],
  region: 'baltic',
  armies: { nato: ['us', 'pl'], pact: ['ru', 'by'] }, // (NATO's forward battlegroup in Latvia against Russian and Belarusian troops from the border)
  description: 'Latgale, 2027: the Daugava at Daugavpils, the old fortress on its island between three bridges each side, the city’s Soviet blocks and Grīva across the water, lakes and pine forest toward the Belarusian border.',
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 2044,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  fields: createFields({ seed: 2044, cell: 76 }),

  theme: theme2027({
    clouds: 0.5, sunIntensity: 2.2, fogDensity: 0.0016,
    terrain: {
      roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x, z, y) {
        if (Math.abs(x) < 6 && Math.abs(z) < 620 && away(x, z) > HW - 2) return [0x3c3d3f, 1];          // the road through the fortress
        if (inFort(x, z, -4)) return [0x7a7262, 0.6];                                                     // the parade ground
        if (y < 1.6 && (away(x, z) < 50 || onIsland(x, z))) return [0x5e5a40, 0.65];                      // the water meadows
        if (y < 1.1 && lakes.q(x, z) < 1.3) return [0x5c5a3c, smoothstep(1.1, 0.7, y)];
        return null;
      },
    },
  }),

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
    const wet = (x, z, r = 0) => away(x, z) < HW + 6 + r || lakes.q(x, z) < 1.3;
    const skip = (x, z, r) => wet(x, z, r) || (Math.abs(x) < 9 + r && away(x, z) > HW) || inFort(x, z, r);

    // Dinaburg: the curtain wall with its gates to the bridges and along the island, the barracks and the arsenal inside
    props.rand = mulberry32(4401);
    curtainWall(props, cover, terrain, FORT_WALL, { h: 5.5, t: 3, tower: 9, towerH: 8, color: 0x9a5a44, gate: 9,
      gates: [[FORT.x, mid(FORT.x) + 26], [FORT.x, mid(FORT.x) - 26], [FORT.x - 92, mid(FORT.x - 92)], [FORT.x + 92, mid(FORT.x + 92)]] });
    for (const [x, z, w, yaw] of [[-48, 10, 40, 0], [44, 12, 36, 0], [-44, -12, 30, 0], [42, -12, 40, 0]]) props.flatHouse({ x: FORT.x + x, z: mid(FORT.x + x) + z, yaw, width: w, depth: 9, storeys: 2, name: x < 0 && z > 0 ? 'Arsenal' : 'fortress barracks' });
    // the island's road out to the flank bridges, the bridgeheads' barricades
    props.rand = mulberry32(4402);
    for (const c of river.crossings) for (const end of [1, -1]) {
      const z = c.z + end * (HW + 24); if (c.x === 0 && onIsland(c.x, z)) continue;
      const flip = end > 0 ? 0 : Math.PI;
      props.jersey({ x: c.x - 8 * end, z, yaw: 0.2 + flip, length: 5 });
      for (const dx of [-14, 14]) props.hedgehog({ x: c.x + dx, z: z + 6 * end });
    }
    // the city and Grīva, each across from the fortress: blocks of flats, houses, churches (each its own streets)
    for (const [s, seed] of [[1, 4411], [-1, 4412]]) {
      props.rand = mulberry32(seed);
      const r = props.rand;
      for (let n = 0, i = 0; n < 13 && i < 400; i++) {
        const x = (r() - 0.5) * 500, z = s * (140 + r() * 210);
        if (skip(x, z, 16) || nearPt(x, z, 38) || bankD(x, z) < 50) continue;
        flats(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, storeys: 4 + Math.floor(r() * 2), width: 34 + r() * 18, depth: 12 });
        n++;
      }
      for (let n = 0, i = 0; n < 18 && i < 400; i++) {
        const x = (r() - 0.5) * 320, z = s * (120 + r() * 150);
        if (skip(x, z, 7) || nearPt(x, z, 26) || bankD(x, z) < 40) continue;
        props.townHouse({ x, z, yaw: r() * 3, width: 9, depth: 9, storeys: 2, damaged: 0 });
        n++;
      }
    }
    for (const [x, z, yaw] of [[95, 195, 0], [120, 230, Math.PI / 2]]) props.church({ x, z, yaw }); // Church Hill
    for (const [x, z, yaw] of [[-110, -190, Math.PI], [-150, -245, -Math.PI / 2]]) props.church({ x, z, yaw }); // Grīva's churches
    // villages on the other points, each its own
    for (const p of points) {
      if (!'BDHJ'.includes(p.id)) continue;
      props.rand = mulberry32(4450 + Math.round(p.x * 3 + p.z));
      modernVillage(props, p, 1, 0, { skip, church: true });
    }
    coverSites(props, rand, bounds, (x, z) => !wet(x, z, 20) && Math.hypot(x, Math.abs(z) - BASE_Z) > 40 && !nearPt(x, z, 42) && !skip(x, z, 8), 220, undefined, buildSite, false);
    powerLine(props, 4488, (x) => 405 + x * 0.05, (x, z) => z < 0 || nearPt(x, z, 25) || skip(x, z, 6));
    powerLine(props, 4489, (x) => 415 - x * 0.07 + 15 * Math.sin(x * 0.01), (x, z) => z > 0 || nearPt(x, z, 25) || skip(x, z, 6));
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5a3a);
    props.finish();
    river.build(scene, terrain);
    lakes.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: HW + 14 })), { test: (x, z) => wet(x, z, -4) || Math.abs(x) < 7 || inFort(x, z, 4) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 5500, hedges: 3500, broadleaf: 0.3,
      forest: (x, z) => {
        if (away(x, z) < HW + 2 || lakes.q(x, z) < 1.02) return -1;
        if (lakes.q(x, z) < 1.3) return 0.45;
        if (onIsland(x, z)) return Math.abs(x) > 150 && !river.crossings.some((c) => Math.abs(x - c.x) < 40) ? 0.55 : 0; // willows on the island's ends
        if (Math.abs(x) > 460) return 0.85;
        return noise(x * 0.006 + 702.2, z * 0.006 - 415.5) > 0.2 ? 0.85 : 0;                         // Latgale's pine forest (as much on each side)
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
