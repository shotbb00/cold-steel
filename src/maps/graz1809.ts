// Graz, June 1809: while Napoleon gathered his army for Wagram, Broussier’s division of Macdonald’s Army of Italy laid
// siege to the Schlossberg, the fortress on its rock above Graz, held by Major Hackher’s Austrian garrison. On 25–26
// June Gyulai’s Austrian corps came down to relieve it; two battalions of the French 84th Line, cut off in the eastern
// suburb of St Leonhard, held the churchyard and the houses round it against ten times their number for a night and a
// day until Broussier broke through to them — the regiment carried “Un contre dix” on its eagle afterwards. The
// Schlossberg itself never fell; the armistice gave it up, and Napoleon had its works blown up.
// On the map (1.0 × 1.12 km): the French come up the Wildon road from the south (+z), the Austrians down the Bruck road
// from the north (−z). The Mur runs south down the west of the field; the Schlossberg rises in the middle on its east
// bank, its bastioned works round the top, the Uhrturm with its great clock and the bell tower; the walled Altstadt
// south of it round the Hauptplatz, the Mur bridge over to the Lend; the suburbs — Jakomini south of the glacis,
// Geidorf north of the rock, St Leonhard east under the Ruckerlberg with its church and walled churchyard; across the
// Mur the Gries and the Lend, Schloss Eggenberg under the Plabutsch’s wooded ridge; the Rosenberg’s woods north-east.
// Fair, not mirrored: the Mur runs down the field, not between the sides, and its two fords — the Karlau and the
// Weinzödl — lie as far from either base, with the bridge in the middle; the Schlossberg, the decisive ground, and the
// Lend opposite it stand on the middle line, owned by neither, and St Leonhard faces them across the glacis. The
// Altstadt is traded for Geidorf, Jakomini for the Leech quarter, Gries for Eggenberg, St Peter for the Rosenhain, the
// Ruckerlberg for the Rosenberg, each as far from the nearer base as its counterpart (tools/map_fairness.py). The
// Plabutsch rises in the north-west, the Ruckerlberg in the south-east, the rock off-centre by the river, so the ground
// is not a mirror. 1806 only (`epochs`).
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 490;
const noise = createNoise2D(1809_0626);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Wildon road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Gries', x: -360, z: 290, owner: null, sector: 'west' },
  { id: 'C', name: 'Jakomini', x: 70, z: 285, owner: null, sector: 'centre' },
  { id: 'D', name: 'St Peter', x: 350, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Lend', x: -350, z: 20, owner: null, sector: 'west' },
  { id: 'F', name: 'Schlossberg', x: -50, z: -15, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'St Leonhard', x: 270, z: 40, owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'Eggenberg', x: -370, z: -280, owner: null, sector: 'west' },
  { id: 'I', name: 'Geidorf', x: 20, z: -300, owner: null, sector: 'centre' },
  { id: 'J', name: 'Rosenhain', x: 320, z: -290, owner: null, sector: 'east' },
  { id: 'K', name: 'Bruck road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Mur, flowing south (+z) down the west of the field, close under the Schlossberg’s west cliff
const MUR = [[-230, -720], [-240, -460], [-210, -300], [-200, -140], [-178, 0], [-190, 140], [-215, 300], [-205, 460], [-220, 720]];
/** The Mur’s centre line at z (cheap: for the woods and the surface, never the river lookup). */
const murX = (z) => {
  for (let i = 0; i < MUR.length - 1; i++) {
    const [ax, az] = MUR[i], [bx, bz] = MUR[i + 1];
    if (z >= az && z <= bz) return ax + (bx - ax) * ((z - az) / (bz - az));
  }
  return z < 0 ? MUR[0][0] : MUR[MUR.length - 1][0];
};
const river = createRiver({
  path: MUR,
  halfWidth: 14, level: 0, depth: 2.6, valley: 40,
  crossings: [
    { name: 'Mur bridge', x: -184, z: 60, kind: 'bridge', width: 8 },
    { name: 'Karlau ford', x: -215, z: 300, kind: 'ford', width: 12 },
    { name: 'Weinzödl ford', x: -210, z: -300, kind: 'ford', width: 12 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };

/** The Schlossberg: its rock, a flat top for the works. */
const ROCK = { x: P.F.x, z: P.F.z, rx: 80, rz: 70 };
const rockQ = (x, z) => Math.hypot((x - ROCK.x) / ROCK.rx, (z - ROCK.z) / ROCK.rz);
/** The walled Altstadt south of the rock, Geidorf’s streets north of it. */
const ALT = { x: -60, z: 150, rx: 105, rz: 62 };
const GEI = { x: 0, z: -180, rx: 110, rz: 55 };
const q = (T, x, z) => Math.hypot((x - T.x) / T.rx, (z - T.z) / T.rz);
const LEONHARD = { x: P.G.x + 30, z: P.G.z - 4 }; // the church in its walled churchyard

// the roads: the Wildon road to the Altstadt, the Bruck road down through Geidorf, the streets round the rock, the
// Mur bridge to the Lend and on to Eggenberg and Gries, the road out to St Leonhard and St Peter, the Rosenhain lane
const ROADS = [
  [[0, 560], [0, 400], [70, 285], [20, 200]], [[0, -560], [0, -400], [20, -300], [10, -170], [70, -60], [60, 90]],
  [[-184, 60], [-120, 110], [20, 200]], [[-184, 60], [-350, 20], [-500, 0]], [[-350, 20], [-370, -280], [-500, -330]], [[-350, 20], [-360, 290], [-500, 340]],
  [[60, 90], [270, 40], [500, 20]], [[70, 285], [350, 300], [500, 330]], [[70, -60], [320, -290], [500, -360]],
];
const roadD = (x, z) => {
  let best = 1e9;
  for (const R of ROADS) for (let i = 0; i < R.length - 1; i++) {
    const [ax, az] = R[i], [bx, bz] = R[i + 1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
};

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Plabutsch’s beechwood, the Rosenberg’s, the Ruckerlberg’s, the Karlau’s riverside wood; the Schlossberg’s scrub
const WOODS = [[-450, -380, 80, 170, 0.1], [420, -420, 110, 90, 0.3], [440, 160, 70, 110, -0.2], [-300, 420, 70, 50, 0.4], [-90, -30, 40, 32, 0]];
const woods = (x, z) => {
  let k = smoothstep(0.6, 0.74, fbm(noise, x * 0.006 + 9, z * 0.006 - 13, 3)) * 0.7;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(p.id === 'F' ? 40 : 30, p.id === 'F' ? 60 : 52, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(1.1, 1.35, Math.min(q(ALT, x, z), q(GEI, x, z))), smoothstep(6, 14, roadD(x, z)), smoothstep(26, 40, Math.abs(x - murX(z))));
};

function height(x, z) {
  let h = fbm(noise, x * 0.0026, z * 0.0026, 3) * 2.4 + fbm(noise, x * 0.02 + 9, z * 0.02, 3) * 0.35 + 3;
  // the Graz basin: the Mur’s terrace, the eastern hills (the Ruckerlberg south-east, the Rosenberg north-east), the
  // Plabutsch ridge over Eggenberg in the north-west
  h += smoothstep(150, 480, x) * 6 + hill(x, z, 460, 230, 170, 11) + hill(x, z, 420, -420, 160, 5);
  h += hill(x, z, -520, -330, 190, 13) + smoothstep(-260, -480, x) * 2;
  h += 22 * smoothstep(1.75, 0.55, rockQ(x, z));                                                // the Schlossberg
  h += (4.2 - h) * smoothstep(1.15, 0.9, Math.min(q(ALT, x, z), q(GEI, x, z))) * 0.8;          // the town, level
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 14;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  for (const p of POINTS) if (p.id !== 'F') h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.5;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];
const STONE = 0xd4ccb6, ROOF = 0x7a4634, DARK = 0x4a3c32;

export default {
  id: 'graz-1809',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Broussier and the 84th Line against Gyulai and the Schlossberg’s garrison; no Austrian roster yet: Russia fights for her)
  name: 'Graz 1809',
  description: 'Graz, June 1809: the Schlossberg’s fortress on its rock above the town and the Mur, besieged by Broussier’s French while Gyulai’s Austrians come to relieve it, and the 84th Line holding St Leonhard’s churchyard one against ten.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'clear' }, // (late June: hot, the hills green)
  airfields: [],
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 18090626,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1809_0626, cell: 66, weights: [0.36, 0.14, 0.3, 0.2] }), // June: green corn, meadows, orchards

  theme: {
    // a hot June day in the Graz basin, haze on the hills
    fogColor: 0xbcc4c2,
    fogDensity: 0.0013,
    skyTop: 0x5884b6,
    skyHorizon: 0xcad4d8,
    skyBottom: 0x7a8474,
    sunColor: 0xfff0d2,
    sunIntensity: 2.05,
    sunDisk: 0.55,
    clouds: 0.35,
    cloudLight: 0xf0f0ee,
    cloudDark: 0x98a2ac,
    sunDir: [0.4, 0.62, 0.62],
    hemiSky: 0xc8d6e0,
    hemiGround: 0x4e5434,
    hemiIntensity: 1.25,
    rimColor: 0xd2dae0,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5a6e34',
      grassAlt: '#4e6230',
      dryGrass: '#8a8450',
      dirt: '#5c4c38',
      rock: '#7c766a',
      strip: '#4c4030',
      pasture: '#5e7038',
      ploughed: '#56462f',
      stubble: '#9a9258',
      meadow: '#687a3c',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const t = Math.min(q(ALT, x, z), q(GEI, x, z));
        if (t < 0.97) return [0x8c8272, 0.45];                                                 // the streets
        const rk = rockQ(x, z);
        if (rk < 0.75) return [0x8a8272, 0.4];                                                 // the works’ trodden top
        if (rk < 1.3) return [0x7c766a, smoothstep(1.3, 0.9, rk) * 0.35];                      // the rock’s flanks
        const rd = roadD(x, z);
        if (rd < 5) return [0x857a66, smoothstep(5, 3, rd) * 0.7];                             // the roads
        if (t < 1.25) return [0x6a6a4c, 0.3];                                                  // the glacis
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), qq = new THREE.Quaternion();
    const solid = (key, geo, x, y, z, sx, sy, sz, color, yaw = 0) => { m4.compose(v.set(x, y, z), qq.setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(sx, sy, sz)); props.push(key, geo, m4, color); };
    const seg = (a, b, height = 3, thickness = 2) => props.wall({ x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, yaw: -Math.atan2(b[1] - a[1], b[0] - a[0]), length: Math.hypot(b[0] - a[0], b[1] - a[1]) + 1, height, thickness });
    const taken: number[][] = [];

    // ---- the Schlossberg’s works: bastions round the top, gaps for the ramps up from the town and from Geidorf
    {
      const R = { x: ROCK.x, z: ROCK.z, rx: 46, rz: 40 }, n = 7;
      const at = (a, k = 1) => [R.x + Math.cos(a) * R.rx * k, R.z + Math.sin(a) * R.rz * k];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.3, b = ((i + 1) / n) * Math.PI * 2 + 0.3, w = Math.PI / n * 0.3;
        seg(at(a - w), at(a, 1.2), 3.4, 2.4); seg(at(a, 1.2), at(a + w), 3.4, 2.4);                  // a bastion
        if (i % 2 === 0) seg(at(a + w), at(b - w), 3.4, 2.4);                                          // the curtain; every other one a breach or a gate
      }
      // the Uhrturm: the square tower on the south brow, its wooden gallery, the four great clock faces, the cap
      const ux = ROCK.x + 10, uz = ROCK.z + 44, g = terrain.heightAt(ux, uz);
      props.box('stone', ux, g + 8, uz, 8, 16, 8, 0, STONE);
      props.box('plain', ux, g + 16.6, uz, 10.6, 1.2, 10.6, 0, DARK);                                  // the gallery
      props.box('plain', ux, g + 18.5, uz, 9, 3, 9, 0, 0xc8bc9c);
      for (const [dx, dz, yaw] of [[0, 4.55, 0], [0, -4.55, 0], [4.55, 0, Math.PI / 2], [-4.55, 0, Math.PI / 2]] as const) {
        solid('plain', new THREE.CylinderGeometry(1, 1, 0.2, 20), ux + dx, g + 18.6, uz + dz, 2.4, 1, 2.4, 0x2a2a2a, yaw);
        solid('plain', new THREE.CylinderGeometry(1, 1, 0.25, 20), ux + dx * 1.01, g + 18.6, uz + dz * 1.01, 2.0, 1, 2.0, 0xe6dcc4, yaw);
      }
      solid('plain', new THREE.ConeGeometry(1, 1, 4), ux, g + 22.2, uz, 7.4, 4.5, 7.4, DARK, Math.PI / 4);
      cover.addBox({ x: ux, z: uz, yaw: 0, length: 8, thickness: 8, height: 18 });
      // the bell tower (the Liesl), octagonal; the garrison’s barracks and the commandant’s house
      const bx = ROCK.x - 22, bz = ROCK.z - 18, gb = terrain.heightAt(bx, bz);
      solid('stone', new THREE.CylinderGeometry(1, 1, 1, 8), bx, gb + 9, bz, 5, 18, 5, STONE);
      solid('plain', new THREE.ConeGeometry(1, 1, 8), bx, gb + 20.5, bz, 5.6, 5, 5.6, DARK);
      cover.addBox({ x: bx, z: bz, yaw: 0, length: 9, thickness: 9, height: 18 });
      props.hall({ x: ROCK.x + 22, z: ROCK.z - 22, yaw: 0.3, width: 22, depth: 9, height: 6, color: STONE, roof: ROOF, door: 3, name: 'casemate barracks' });
      taken.push([ux, uz], [bx, bz], [ROCK.x + 22, ROCK.z - 22]);
    }
    // ---- the Altstadt: its walls on the landward side, the houses round the Hauptplatz, the cathedral and the Burg
    props.rand = mulberry32(1809_06261);
    {
      const N = 26, at = (a) => [ALT.x + Math.cos(a) * ALT.rx * 1.04, ALT.z + Math.sin(a) * ALT.rz * 1.04];
      for (let i = 0; i < N; i++) {
        if (i % 4 === 1) continue;
        const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2, A = at(a0), B = at(a1);
        const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
        if (roadD(mx, mz) < 14 || wet(mx, mz, 6) || rockQ(mx, mz) < 1.4) continue;
        seg(A, B, 3.4, 1.8);
      }
    }
    props.church({ x: 10, z: 130, yaw: 0 });                                                          // the cathedral
    props.hall({ x: 30, z: 95, yaw: 0, width: 30, depth: 12, height: 9, color: 0xd6ccb4, roof: ROOF, door: 4, name: 'the Burg' });
    props.hall({ x: -100, z: 150, yaw: Math.PI / 2, width: 20, depth: 12, height: 10, color: 0xe0d4b8, roof: ROOF, door: 4, name: 'Landhaus' });
    taken.push([10, 130], [30, 95], [-100, 150]);
    const rr = mulberry32(1809_06262);
    const town = (T, max, storeys) => {
      for (let i = 0, k = 0; i < 1000 && k < max; i++) {
        const x = T.x + (rr() * 2 - 1) * T.rx, z = T.z + (rr() * 2 - 1) * T.rz;
        if (q(T, x, z) > 0.86 || roadD(x, z) < 8 || nearPoint(x, z, 32) || wet(x, z, 8) || rockQ(x, z) < 1.35 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 12)) continue;
        taken.push([x, z]); k++;
        props.rand = mulberry32(Math.floor(rr() * 1e9));
        props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.5 ? storeys : storeys - 1, damaged: 0 });
      }
    };
    town(ALT, 56, 3);
    town(GEI, 40, 2);
    props.church({ x: 70, z: -230, yaw: Math.PI / 2 });                                               // the Leechkirche
    taken.push([70, -230]);
    // ---- St Leonhard: the church in its walled churchyard, the houses round it — the 84th’s stand
    props.church({ x: LEONHARD.x, z: LEONHARD.z, yaw: Math.PI / 2 });
    {
      const { x, z } = LEONHARD, hw = 26, hd = 20;
      seg([x - hw, z - hd], [x + hw, z - hd], 2.2, 0.9); seg([x + hw, z - hd], [x + hw, z + hd], 2.2, 0.9);
      seg([x - hw, z + hd], [x - 6, z + hd], 2.2, 0.9); seg([x + 6, z + hd], [x + hw, z + hd], 2.2, 0.9);
      seg([x - hw, z - hd], [x - hw, z - 6], 2.2, 0.9); seg([x - hw, z + 6], [x - hw, z + hd], 2.2, 0.9);
      taken.push([x, z]);
    }
    for (let i = 0, k = 0; i < 300 && k < 14; i++) {
      const a = rr() * Math.PI * 2, d = 40 + rr() * 45, x = P.G.x + Math.cos(a) * d, z = P.G.z + Math.sin(a) * d;
      if (roadD(x, z) < 8 || Math.hypot(x - LEONHARD.x, z - LEONHARD.z) < 36 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 12)) continue;
      taken.push([x, z]); k++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.house({ x, z, yaw: a + Math.PI / 2, width: 8 + rr() * 2, depth: 6.5, height: 3.6 });
    }
    // ---- the Lend and the Gries over the river: suburbs along the roads; Schloss Eggenberg under the Plabutsch
    for (const p of [P.E, P.B]) for (let i = 0, k = 0; i < 300 && k < 12; i++) {
      const a = rr() * Math.PI * 2, d = 36 + rr() * 50, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (roadD(x, z) < 8 || wet(x, z, 14) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 12)) continue;
      taken.push([x, z]); k++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.house({ x, z, yaw: a + Math.PI / 2, width: 8 + rr() * 2, depth: 7, height: 4 });
    }
    props.church({ x: P.E.x + 34, z: P.E.z - 30, yaw: 0 });                                          // Mariahilf
    props.church({ x: P.B.x - 30, z: P.B.z + 28, yaw: Math.PI });
    {
      const ex = P.H.x - 10, ez = P.H.z - 50, W = 36, g = terrain.heightAt(ex, ez);
      for (const [dx, dz, yaw, len] of [[0, -W / 2, 0, W], [-W / 2, 0, Math.PI / 2, W], [W / 2, 0, Math.PI / 2, W], [-11, W / 2, 0, 14], [11, W / 2, 0, 14]] as const) {
        props.box('stone', ex + dx, g + 6, ez + dz, len, 12, 7, yaw, 0xe2d8c2);
        props.box('stone', ex + dx, g + 12.6, ez + dz, len + 0.4, 1.6, 5, yaw, ROOF);
        cover.addBox({ x: ex + dx, z: ez + dz, yaw, length: len, thickness: 7, height: 12 });
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        props.box('stone', ex + sx * W / 2, g + 8, ez + sz * W / 2, 7, 16, 7, 0, 0xe2d8c2);
        solid('plain', new THREE.ConeGeometry(1, 1, 4), ex + sx * W / 2, g + 18, ez + sz * W / 2, 5, 4, 5, DARK, Math.PI / 4);
      }
      taken.push([ex, ez]);
    }
    // ---- the villages: Jakomini, St Peter, the Rosenhain; the French siege batteries and the Austrians’ before Geidorf
    for (const p of [P.C, P.D, P.J]) buildVillage(props, p, 18096 + Math.round(p.x * 3 + p.z * 7));
    props.church({ x: P.D.x + 30, z: P.D.z + 24, yaw: 0 });
    for (const [x, z] of [[-130, 260], [180, 230], [-110, -250], [170, -230]] as const) props.sandbagRing({ x, z, radius: 6, toward: -Math.sign(z) });

    // ---- farms, field walls and hay; orchards come with the woods
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'hay', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 64 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 56 * 56)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 60) || woods(x, z) > 0.3 || Math.abs(x - murX(z)) < 50 || Math.min(q(ALT, x, z), q(GEI, x, z)) < 1.3
        || roadD(x, z) < 14 || rockQ(x, z) < 1.6 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 30)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);

    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd8d4c4]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 28 })),
      { test: (x, z) => wet(x, z, 1.5) || Math.min(q(ALT, x, z), q(GEI, x, z)) < 1.12 || roadD(x, z) < 5 || rockQ(x, z) < 0.8 || Math.hypot(x - LEONHARD.x, z - LEONHARD.z) < 34 }];
    // beech and oak on the Plabutsch and the eastern hills, orchards round the suburbs, willows on the Mur
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 5000, broadleaf: 0.85, autumn: 0, forest: (x, z) => woods(x, z) * 0.95 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1300, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.8, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
        hedges.update(dt, t);
      },
    };
  },
} satisfies MapDef;
