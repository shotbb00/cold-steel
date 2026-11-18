// Megiddo, 19 September 1918: Allenby's last battle in Palestine. At half past four the guns opened on the Ottoman
// line across the coastal plain of Sharon; by seven the infantry was through, and the Desert Mounted Corps — British
// yeomanry, Australian light horse, Indian lancers — rode north through the gap, over the Carmel range by the Musmus
// pass and out onto the Plain of Esdraelon, past the tell of Megiddo (Armageddon) to El Afule and its airfield, sixty
// kilometres behind the front by the next morning. The Ottoman Seventh and Eighth Armies were cut off and destroyed.
// Here the coastal plain and the plain of Esdraelon meet at the tell: flat sandy ground and red earth, the orange
// groves of the Sharon villages inside their cactus hedges, stone villages with a mosque and a well, the railway with
// its stations, dry wadis, the bare foothills of the Samarian hills on the flanks. Dry and hot. Point-mirrored to keep
// it fair: each side has its villages, groves, station and wadi; the tell in the middle commands the plain both ways.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { pointsFrom, both } from './common2027.js';
import { arabVillage } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(1918_09);
const half = (x: number, z: number) => (z > 0 ? [x, z] : [-x, -z]);
const railZ = (x: number) => 205 + 18 * Math.sin(x * 0.004 + 0.5);        // the railway across each half
const wadiZ = (x: number) => 112 + 26 * Math.sin(x * 0.011 + 1.2);       // a dry wadi across each half
/** The orange groves (north half; mirrored): [x, z, w, d]. */
const GROVES = [[-230, 360, 90, 70], [-410, 250, 70, 90], [180, 380, 80, 60], [420, 330, 60, 80], [-140, 270, 60, 50]];
const inGrove = (x: number, z: number, pad = 0) => { const [ax, az] = half(x, z); return GROVES.some(([gx, gz, w, d]) => Math.abs(ax - gx) < w / 2 + pad && Math.abs(az - gz) < d / 2 + pad); };
const onRail = (x: number, z: number) => { const [ax, az] = half(x, z); return Math.abs(az - railZ(ax)) < 2.4; };
const wadiD = (x: number, z: number) => { const [ax, az] = half(x, z); return Math.abs(az - wadiZ(ax)); };
/** The tracks: north–south from each village and the base, and the one round the tell's foot to its gate. */
const onRoad = (x: number, z: number) => {
  const [ax, az] = half(x, z);
  if (az > 60 && [-SIDE_X, 0, SIDE_X].some((rx) => Math.abs(ax - rx - 10 * Math.sin(az * 0.02)) < 3)) return true;
  if (Math.abs(az - 330 - 10 * Math.sin(ax * 0.01)) < 3) return true;                                   // the Jaffa–Nablus road across
  return false;
};
const RAMP = { x: 14, z0: 28, z1: 92 };                                    // the gate road up the tell (and its mirror)

function height(x: number, z: number) {
  const [ax, az] = half(x, z);
  const plain = (a: number, b: number) => fbm(noise, a * 0.004, b * 0.004, 4) * 2.2 + fbm(noise, a * 0.02 + 7, b * 0.02, 2) * 0.5;
  let h = 2 + plain(x, z) + plain(-x, -z);
  h += smoothstep(360, 540, Math.abs(x)) * (22 + ridged(noise, ax * 0.008, az * 0.008, 4) * 26);      // the foothills on the flanks
  h -= 2.6 * smoothstep(9, 3, wadiD(x, z));                                                            // the wadi's bed
  for (const [fx, fz] of [[-SIDE_X, 300], [0, 260], [SIDE_X, 300], [-SIDE_X + 20, 80]]) h += (2.5 - h) * smoothstep(42, 24, Math.hypot(ax - fx, az - fz));
  h += (3 - h) * smoothstep(30, 16, Math.hypot(ax, az - BASE_Z));
  // the tell: its flat top, steep sides of the old walls' debris, the gate road up each end
  const td = Math.hypot(x, z * 1.15) + fbm(noise, x * 0.03, z * 0.03, 2) * 6;
  const tell = 18 * smoothstep(78, 44, td);
  const r = Math.abs(ax - RAMP.x) < 11 ? Math.max(0, 18 * (1 - (az - RAMP.z0) / (RAMP.z1 - RAMP.z0))) * smoothstep(11, 6, Math.abs(ax - RAMP.x)) : 0;
  return Math.max(h, h * 0.2 + Math.max(tell, az > RAMP.z0 - 4 && az < RAMP.z1 ? r : 0));
}

const points = pointsFrom([
  ['A', 'Jaffa road', 0, 470],
  ['B', 'Tabsor', -SIDE_X, 300],
  ['C', 'Tul Karm station', 0, 245],
  ['D', 'Et Tire', SIDE_X, 300],
  ['E', 'Kakon', -SIDE_X + 20, 80],
  ['F', 'Tell Megiddo', 0, 0, { radius: 30 }],
], ['El Lejjun', 'Zerin', 'El Afule', 'Jenin', 'Nazareth road']);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1st Section' }];

export default {
  id: 'megiddo',
  name: 'Megiddo',
  description: '19 September 1918, at dawn: the plain where the Sharon meets Esdraelon — orange groves, stone villages, the railway and its stations, dry wadis, and in the middle the tell of Megiddo. Break the line and let the cavalry through. Mirrored to keep it fair.',
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
      for (let x = -460; x <= 460; x += 30) pts.push([x * s, (wadiZ(x) + 22) * s]);
      for (const w of trenchLine(pts, f, { wireAt: 30, belts: 1, gapEvery: 40 })) if (!onRoad(w.x, w.z)) works.push(w);
      for (const dx of [-20, 20]) works.push({ kind: 'mgNest', x: dx * s, z: 30 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
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
      arabVillage(props, p.x, p.z, p.id === 'E' || p.id === 'G' ? 7 : 10, 1809 + Math.round(Math.abs(p.x) * 3 + Math.abs(p.z)), skip);
    }
    // the railway across each half: rails, the station with its water tower and goods shed, wagons in the siding
    both(props, 1811, (m, flip) => {
      for (let x = -540; x < 540; x += 30) props.rails({ x0: x * m, z0: railZ(x) * m, x1: (x + 30) * m, z1: railZ(x + 30) * m });
      props.flatHouse({ x: 28 * m, z: (railZ(28) + 16) * m, yaw: flip, width: 16, depth: 8, storeys: 2, name: 'station' });
      props.hall({ x: -40 * m, z: (railZ(-40) + 20) * m, yaw: flip, width: 18, depth: 10, height: 5, color: 0xa89878, roof: 0x6a6660, door: 6, name: 'goods shed' });
      props.tanks({ x: 60 * m, z: (railZ(60) + 14) * m, yaw: flip, count: 1, radius: 2.2, height: 8, color: 0x5a5048 });
      for (const [x, kind, c] of [[-80, 'box', 0x6a4a34], [-92, 'box', 0x5a3e2c], [110, 'open', 0x6a5a44]] as [number, string, number][]) {
        props.wagon({ x: x * m, z: railZ(x) * m, yaw: Math.atan2(1, railZ(x + 1) - railZ(x)) + flip, kind, color: c });
      }
    });
    // the groves: cactus hedges (prickly pear) round them, a well-house in each
    both(props, 1812, (m) => {
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
    });
    // the tell: the excavators' trench across its top (Schumacher, 1903), fallen ashlars and sangars of the defenders
    both(props, 1813, (m) => {
      props.lowWall({ x: -16 * m, z: 8 * m, yaw: 0.3, length: 14, height: 1.3, color: 0xb4a688 });
      props.lowWall({ x: 22 * m, z: -6 * m, yaw: 1.4, length: 10, height: 1.2, color: 0xb4a688 });
      for (let i = 0; i < 6; i++) props.boulder({ x: (props.rand() - 0.5) * 70 * m, z: (props.rand() * 30 + 8) * m, radius: 0.8 + props.rand() });
    });
    // boulders, sangars and wrecked carts on the plain
    const r = mulberry32(1918);
    for (let i = 0, n = 0; i < 4000 && n < 40; i++) {
      const x = (r() * 2 - 1) * 470, z = 30 + r() * 480;
      if (skip(x, z) || nearPoint(x, z, 40) || Math.hypot(x, z) < 90 || Math.hypot(x, z - BASE_Z) < 45) continue;
      n++;
      const s = { kind: ['rocks', 'fieldwall', 'rocks', 'wrecks'][n % 4], seed: Math.floor(r() * 1e9) }, yaw = r() * 3;
      buildSite(props, s, x, z, yaw);
      buildSite(props, s, -x, -z, yaw + Math.PI);
    }
    for (let i = 0; i < 70; i++) {
      const x = (r() * 2 - 1) * 480, z = 20 + r() * 520;
      if (skip(x, z) || nearPoint(x, z, 20)) continue;
      const h = 7 + r() * 5;
      both(props, i, (m) => props.palm({ x: x * m, z: z * m, height: h }));
    }
    commandPost(props, this.bases.nato, -1, 0xb0a07a);
    commandPost(props, this.bases.pact, 1, 0xa09474);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => onRoad(x, z) || onRail(x, z) || wadiD(x, z) < 4 }];
    // the orange trees in their rows of the groves (small, dark, glossy), olives and carobs scattered over the rest
    const oranges = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1500, broadleaf: 1, autumn: 0, size: 0.5, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => !inGrove(x, z, -3) }], forest: (x: number, z: number) => (inGrove(x, z) ? 1 : -1) });
    const olives = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 260, broadleaf: 1, autumn: 0.1, size: 0.7, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => inGrove(x, z, 6) || Math.hypot(x, z * 1.15) < 80 }],
      forest: (x: number, z: number) => { const [ax, az] = half(x, z); return fbm(noise, ax * 0.01 + 20, az * 0.01, 2) > 0.3 ? 0.4 : 0.02; } });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.5, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); oranges.update(dt, t); olives.update(dt, t); },
    };
  },
} satisfies MapDef;
