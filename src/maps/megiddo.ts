// Megiddo, 19 September 1918: Allenby's last battle in Palestine. At half past four the guns opened on the Ottoman
// line across the coastal plain of Sharon; by seven the infantry was through, and the Desert Mounted Corps — British
// yeomanry, Australian light horse, Indian lancers — rode north through the gap, over the Carmel range by the Musmus
// pass and out onto the Plain of Esdraelon, past the tell of Megiddo (Armageddon) to El Afule and its airfield, sixty
// kilometres behind the front by the next morning. The Ottoman Seventh and Eighth Armies were cut off and destroyed.
// Here the coastal plain and the plain of Esdraelon meet at the tell: flat sandy ground and red earth, the orange
// groves of the Sharon villages inside their cactus hedges, stone villages with a mosque and a well, the railway with
// its stations, dry wadis, the bare foothills of the Samarian hills on the flanks. Dry and hot. Not mirrored but fair:
// each side has its own villages, groves (the same area in other places), station and wadi at the same depths; the
// tell in the middle commands the plain both ways, a gate road up each end.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { arabVillage, evenThreshold } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(1918_09);
/** The railway across each half (z of its line): the Tul Karm line on nato's, the Haifa–Afule line on pact's. */
const railZ = (x: number, z = 1) => (z > 0 ? 205 + 18 * Math.sin(x * 0.004 + 0.5) : -200 - 22 * Math.sin(x * 0.005 + 2.4));
/** A dry wadi across each half, at the same depth, each its own course. */
const wadiZ = (x: number, z = 1) => (z > 0 ? 112 + 26 * Math.sin(x * 0.011 + 1.2) : -116 - 30 * Math.sin(x * 0.008 + 4));
/** The orange groves of each half [x, z, w, d]: the same area on both, in other places. */
const GROVES = [[-230, 360, 90, 70], [-410, 250, 70, 90], [180, 380, 80, 60], [420, 330, 60, 80], [-140, 270, 60, 50],
  [160, -380, 80, 80], [420, -200, 70, 80], [-150, -390, 90, 60], [-420, -380, 60, 80], [60, -280, 60, 50]];
const inGrove = (x: number, z: number, pad = 0) => GROVES.some(([gx, gz, w, d]) => Math.abs(x - gx) < w / 2 + pad && Math.abs(z - gz) < d / 2 + pad);
const onRail = (x: number, z: number) => Math.abs(z - railZ(x, z)) < 2.4;
const wadiD = (x: number, z: number) => Math.abs(z - wadiZ(x, z));
/** The tracks: north–south from each village and the base, and the road across each half behind the railway. */
const TRACKS_X = { nato: [-360, 0, 300], pact: [-270, 0, 380] };
const onRoad = (x: number, z: number) => {
  const az = Math.abs(z);
  if (az > 60 && TRACKS_X[z > 0 ? 'nato' : 'pact'].some((rx) => Math.abs(x - rx - 10 * Math.sin(az * 0.02)) < 3)) return true;
  if (z > 0 ? Math.abs(z - 330 - 10 * Math.sin(x * 0.01)) < 3 : Math.abs(z + 320 + 14 * Math.sin(x * 0.008 + 1)) < 3) return true; // the Jaffa–Nablus road; the Jenin–Haifa road
  return false;
};
const RAMPS = [{ x: 14, z0: 28, z1: 92 }, { x: -26, z0: -28, z1: -92 }];  // the gate road up each end of the tell

function height(x: number, z: number) {
  let h = 2 + fbm(noise, x * 0.004, z * 0.004, 4) * 4 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.9;
  h += smoothstep(350 + 110 * Math.sin(z * Math.PI / 280), 560, Math.abs(x)) * (22 + ridged(noise, x * 0.008, z * 0.008, 4) * 26); // the foothills on the flanks (as much on each half)
  for (const [hx, hz, r, hh] of [[-170, 170, 150, 7], [250, -160, 160, 7], [380, 140, 120, 5], [-360, -120, 130, 5]]) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5; // each half's low rises, not twins
  h -= 2.6 * smoothstep(9, 3, wadiD(x, z));                                                            // the wadi's bed
  for (const p of points) if (p.id !== 'F') h += (2.5 - h) * smoothstep(42, 24, Math.hypot(x - p.x, z - p.z));
  for (const bz of [BASE_Z, -BASE_Z]) h += (3 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  // the tell: its flat top, steep sides of the old walls' debris, the gate road up each end
  const td = Math.hypot(x, z * 1.15) + fbm(noise, x * 0.03, z * 0.03, 2) * 6;
  const tell = 18 * smoothstep(78, 44, td);
  const R = RAMPS[z > 0 ? 0 : 1], az = Math.abs(z), a0 = Math.abs(R.z0), a1 = Math.abs(R.z1);
  const r = Math.abs(x - R.x) < 11 ? Math.max(0, 18 * (1 - (az - a0) / (a1 - a0))) * smoothstep(11, 6, Math.abs(x - R.x)) : 0;
  return Math.max(h, h * 0.2 + Math.max(tell, az > a0 - 4 && az < a1 ? r : 0));
}

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Jaffa road', 0, 470, 'centre'),
  P('B', 'Tabsor', -360, 320, 'west'),
  P('C', 'Tul Karm station', 30, 250, 'centre'),
  P('D', 'Et Tire', 300, 280, 'east'),
  P('E', 'Kakon', -300, 90, 'west'),
  P('F', 'Tell Megiddo', 0, 0, 'centre', { radius: 30 }),
  P('G', 'El Lejjun', 250, -100, 'east'),
  P('H', 'Zerin', -270, -290, 'west'),
  P('I', 'El Afule', -80, -240, 'centre'),
  P('J', 'Jenin', 380, -290, 'east'),
  P('K', 'Nazareth road', 0, -470, 'centre'),
] as any[];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1st Section' }];

export default {
  id: 'megiddo',
  name: 'Megiddo',
  description: '19 September 1918, at dawn: the plain where the Sharon meets Esdraelon — orange groves, stone villages, the railway and its stations, dry wadis, and in the middle the tell of Megiddo. Break the line and let the cavalry through.',
  epochs: ['1918'],
  region: 'middleEast',
  climate: 'desert',
  armies: { nato: ['uk', 'anzac'], pact: ['ot'] }, // (Allenby's British, Indian and Australian divisions against the Ottoman Seventh and Eighth Armies: maps/index.js armiesOn)
  sides: { nato: 'British Empire', pact: 'Ottoman Empire' },
  conditions: { time: 'dawn', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.6, // (the tell's debris slopes: wheels take the gate road)
  seed: 1918,
  height,
  fields: createFields({ seed: 191809, cell: 80 }),

  theme: {
    // a hot, white September morning, dust in the air
    fogColor: 0xd8ccb2, fogDensity: 0.0009, skyTop: 0x7a9cc2, skyHorizon: 0xe6dcc6, skyBottom: 0xb8a888,
    sunColor: 0xfff0d0, sunIntensity: 2.2, sunDisk: 0.8, clouds: 0.08, cloudLight: 0xf6f0e6, cloudDark: 0xccc2b2,
    sunDir: [0.5, 0.45, -0.5], hemiSky: 0xd8dce2, hemiGround: 0x9a8460, hemiIntensity: 1.2, rimColor: 0xf0e2c4, rimIntensity: 0.3,
    terrain: {
      grass: '#a8946a', grassAlt: '#9c8a60', dryGrass: '#c2ac7a', dirt: '#9a7652', rock: '#a49680',
      pasture: '#a89468', ploughed: '#94704e', stubble: '#c8b07c', meadow: '#a8966a',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRail(x, z)) return [0x6a5e50, 0.9];
        if (onRoad(x, z)) return [0xc8b48c, 0.85];                                         // the dusty tracks
        if (wadiD(x, z) < 8) return [0xd6ccb4, 0.85];                                       // the wadi's pale stones
        if (inGrove(x, z, 2)) return [0x7e5a3c, 0.7];                                       // the groves' red earth, irrigated
        if (Math.hypot(x, z * 1.15) < 78) return [0xb8a688, 0.6];                           // the tell's ancient rubble
        if (y > 14) return [0xb4a07a, 0.5];
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.22 ? [0x8c8456, Math.min(0.4, (scrub - 0.22) * 2)] : null;          // thorn and thistle
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Takım' })),
  },

  /** Each side's line of trenches along the far bank of its wadi (wire thin: the Ottoman line was shallow), sangars on the tell. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -460; x <= 460; x += 30) pts.push([x * s, wadiZ(x * s, s) + 22 * s]);   // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 30, belts: 1, gapEvery: 40 })) if (!onRoad(w.x, w.z)) works.push(w);
      for (const dx of s > 0 ? [-20, 22] : [-34, 12]) works.push({ kind: 'mgNest', x: dx, z: 30 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => onRoad(x, z) || onRoad(x + 6, z) || onRoad(x - 6, z) || onRail(x, z) || onRail(x, z + 6) || onRail(x, z - 6) || wadiD(x, z) < 12 || inGrove(x, z, 4);

    // the villages: stone and mud-brick, a mosque, a well, garden walls
    for (const p of points) {
      if (!['B', 'D', 'E', 'G', 'H', 'J'].includes(p.id)) continue;
      arabVillage(props, p.x, p.z, p.id === 'E' || p.id === 'G' ? 7 : 10, 1809 + Math.round(p.x * 3 + p.z * 7), skip);
    }
    // the railway across each half: rails, the station with its water tower and goods shed, wagons in the siding (each its own)
    for (const [s, sx, gx, tx, wagons] of [[1, 28, -40, 60, [[-80, 'box', 0x6a4a34], [-92, 'box', 0x5a3e2c], [110, 'open', 0x6a5a44]]],
      [-1, -70, 10, -110, [[60, 'open', 0x6a5a44], [-150, 'box', 0x6a4a34], [-162, 'box', 0x5a3e2c], [-174, 'open', 0x5e5040]]]] as [number, number, number, number, [number, string, number][]][]) {
      const flip = s > 0 ? 0 : Math.PI, rz = (x: number) => railZ(x, s);
      props.rand = mulberry32(1811 + s);
      for (let x = -540; x < 540; x += 30) props.rails({ x0: x, z0: rz(x), x1: x + 30, z1: rz(x + 30) });
      props.flatHouse({ x: sx, z: rz(sx) + 16 * s, yaw: flip, width: 16, depth: 8, storeys: 2, name: 'station' });
      props.hall({ x: gx, z: rz(gx) + 20 * s, yaw: flip, width: 18, depth: 10, height: 5, color: 0xa89878, roof: 0x6a6660, door: 6, name: 'goods shed' });
      props.tanks({ x: tx, z: rz(tx) + 14 * s, yaw: flip, count: 1, radius: 2.2, height: 8, color: 0x5a5048 });
      for (const [x, kind, c] of wagons) props.wagon({ x, z: rz(x), yaw: Math.atan2(1, rz(x + 1) - rz(x)), kind, color: c });
    }
    // the groves: cactus hedges (prickly pear) round them, a well-house in each
    {
      const m = 1;
      props.rand = mulberry32(1812);
      for (const [gx, gz, w, d] of GROVES) {
        for (const [lx, lz, len, alongX] of [[0, d / 2, w, 1], [0, -d / 2, w, 1], [w / 2, 0, d, 0], [-w / 2, 0, d, 0]] as number[][]) {
          for (let t = -len / 2 + 6; t < len / 2 - 4; t += 12) {
            if (Math.abs(t) < 5) continue;                                                     // (the gate)
            const x = (gx + lx + (alongX ? t : 0)) * m, z = (gz + lz + (alongX ? 0 : t)) * m;
            if (!onRoad(x, z)) props.lowWall({ x, z, yaw: alongX ? 0 : Math.PI / 2, length: 10, height: 1.7, color: 0x5e6e3c });
          }
        }
        props.flatHouse({ x: (gx + w / 4) * m, z: (gz - d / 4) * m, yaw: 0, width: 5, depth: 4, name: 'well-house' });
      }
    }
    // the tell: the excavators' trench across its top (Schumacher, 1903), fallen ashlars and sangars of the defenders
    props.rand = mulberry32(1813);
    for (const [x, z, yaw, length] of [[-16, 8, 0.3, 14], [22, -6, 1.4, 10], [8, 18, 1.1, 9], [-24, -14, 0.2, 12]]) props.lowWall({ x, z, yaw, length, height: 1.25, color: 0xb4a688 });
    for (let i = 0; i < 12; i++) props.boulder({ x: (props.rand() - 0.5) * 70, z: (props.rand() - 0.5) * 70, radius: 0.8 + props.rand() });
    // boulders, sangars and wrecked carts on the plain
    const r = mulberry32(1918);
    for (let i = 0, n = 0; i < 4000 && n < 80; i++) {
      const x = (r() * 2 - 1) * 470, z = (n % 2 ? -1 : 1) * (30 + r() * 480);   // (each half its own)
      if (skip(x, z) || nearPoint(x, z, 40) || Math.hypot(x, z) < 90 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45) continue;
      n++;
      buildSite(props, { kind: ['rocks', 'fieldwall', 'rocks', 'wrecks'][Math.floor(n / 2) % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    for (let i = 0; i < 140; i++) {
      const x = (r() * 2 - 1) * 480, z = (i % 2 ? -1 : 1) * (20 + r() * 520);
      if (skip(x, z) || nearPoint(x, z, 20)) continue;
      props.rand = mulberry32(i);
      props.palm({ x, z, height: 7 + r() * 5 });
    }
    commandPost(props, this.bases.nato, -1, 0xb0a07a);
    commandPost(props, this.bases.pact, 1, 0xa09474);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => onRoad(x, z) || onRail(x, z) || wadiD(x, z) < 4 }];
    // the orange trees in their rows of the groves (small, dark, glossy), olives and carobs scattered over the rest
    const tP = evenThreshold((x, z) => fbm(noise, x * 0.01 + 20, z * 0.01, 2), 0.3, (x, z) => z > 0);   // (the olives as thick on each half)
    const oranges = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1500, broadleaf: 1, autumn: 0, size: 0.5, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => !inGrove(x, z, -3) }], forest: (x: number, z: number) => (inGrove(x, z) ? 1 : -1) });
    const olives = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 260, broadleaf: 1, autumn: 0.1, size: 0.7, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => inGrove(x, z, 6) || Math.hypot(x, z * 1.15) < 80 }],
      forest: (x: number, z: number) => (fbm(noise, x * 0.01 + 20, z * 0.01, 2) > (z > 0 ? 0.3 : tP) ? 0.4 : 0.02) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.5, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); oranges.update(dt, t); olives.update(dt, t); },
    };
  },
} satisfies MapDef;
