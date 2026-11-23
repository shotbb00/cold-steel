// Operation Albion, 12 October 1917 (coastal, the 1918 epoch: the Germans land, the Russians hold; 1.0 × 1.8 km).
// The German Army and the High Seas Fleet took the Estonian islands at the mouth of the Gulf of Riga in nine days:
// before dawn on 12 October the battleships of the III and IV Squadrons steamed into Tagga Bay on the north coast
// of Ösel (Saaremaa), silenced the Russian coastal batteries on its headlands, and the 42nd Infantry Division went
// ashore in ship’s boats and lighters towed by the torpedo boats, behind the minesweepers clearing the fields laid
// across the approach. The Russian 107th Division, worn out by the Revolution, held a few outposts and trenches.
// On the map: the shallow bay between two low headlands with limestone cliffs (pank) — Hundsort in the west,
// Ninnast in the east — each with its heavy battery in concrete on the tip; rocky shores and boulders in the
// shallows, a shingle beach at the bay’s head; Tagga manor behind it, the juniper heath, pine woods, stone-walled
// farms and windmills, and the road inland to Arensburg (the Russian base). German battleships and torpedo boats
// offshore, the minefield across the mouth of the bay with a swept lane off each sector.
// Laid out like Gotland (maps/gotlandLanding.ts) in a frame with the sea toward +z (`L`), then turned round: the
// lander (pact) is on -z, so the sea is there (systems/Landing.js lands()).
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1917_10);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a5a62 }); // (the grey autumn Baltic)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)
const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

/** The waterline (local z): the bay’s head at x 0, the two headlands out at the map’s sides. */
const shoreZ = (x: number) => 60 + fbm(noise, x * 0.006, 2.1, 2) * 10 + 290 * smoothstep(200, 470, Math.abs(x)) ** 1.3 - 40 * smoothstep(440, 500, Math.abs(x)) + 18 * bell(x, -330, 25) - 14 * bell(x, 360, 30); // (a rocky nose under each battery’s cliff, a cove beside)
/** The headlands’ limestone cliff (1 on Hundsort and Ninnast, 0 round the bay). */
const cliffK = (x: number) => smoothstep(300, 380, Math.abs(x));

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x), ck = cliffK(x);
  const d = z - sz; // + out to sea
  if (d > 0) { // the bottom: a stony shelf, a little deeper under the cliffs (the boats ground a few metres off)
    const h = -0.6 - d * (0.2 + ck * 0.25) - Math.max(0, d - 90) * 0.05 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.4 * smoothstep(10, 40, d);
    return Math.max(h, -18);
  }
  const back = -d; // m inland of the waterline
  const beach = 0.6 + back * 0.05;
  // the low limestone plateau: a few metres up behind the shore, the heath rising gently toward Arensburg
  const land = 3.6 + smoothstep(20, 160, back) * 2.5 + smoothstep(350, 750, back) * 5 + fbm(noise, x * 0.004, z * 0.004, 3) * 2.2 + fbm(noise, x * 0.03 + 5, z * 0.03, 2) * 0.4;
  let h = Math.max(beach, Math.min(land, beach + back * 0.18));
  if (ck > 0) { // the pank: a sheer face of grey limestone straight up from the shingle, the headland’s flat top behind
    const top = 9 + fbm(noise, x * 0.01, 7.1, 2) * 2;
    h += (Math.max(h, beach + (top - beach) * smoothstep(5, 14, back)) - h) * ck;
  }
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The tracks (local): the Arensburg road from the bay’s head past Tagga manor, the lane along behind the bay out to both batteries. */
const laneZ = (x: number) => -90 + 210 * (x / 440) ** 2;
const roadX = (z: number) => 10 + Math.sin(z * 0.006) * 30;
function onRoadL(x: number, z: number) {
  const sz = shoreZ(x);
  if (Math.abs(x - roadX(z)) < 3.5 && z < sz - 30) return true;              // the Arensburg road, down to the bay
  if (Math.abs(x) < 450 && Math.abs(z - laneZ(x)) < 3.5 && z < sz - 40) return true; // the battery lane
  return false;
}
const onRoad = (x: number, z: number) => onRoadL(x, F * z);
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world

/** The beach sectors (x) and what is up behind them (local z). */
export const SECTORS = [
  { x: -270, name: 'Hundsort shore', inland: { name: 'Hundsort battery', x: -380, z: 130 } },
  { x: 0, name: 'Tagga Bay', inland: { name: 'Tagga manor', x: 50, z: -200 } },
  { x: 270, name: 'Ninnast shore', inland: { name: 'Ninnast battery', x: 380, z: 130 } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Landing area', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Hundsort shore', ...W(-270, shoreZ(-270) - 32), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Tagga Bay', ...W(0, shoreZ(0) - 34), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Ninnast shore', ...W(270, shoreZ(270) - 32), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Hundsort battery', ...W(-380, 130), owner: null, sector: 'west' },
  { id: 'F', name: 'Tagga manor', ...W(50, -200), owner: null, sector: 'centre' },
  { id: 'G', name: 'Ninnast battery', ...W(380, 130), owner: null, sector: 'east' },
  { id: 'K', name: 'Arensburg road', ...W(40, -640), owner: 'nato', sector: 'centre' },
];
const BATTERIES = [{ name: 'Hundsort battery', x: -440, z: 290 }, { name: 'Ninnast battery', x: 440, z: 290 }];

export default {
  id: 'albion',
  name: 'Operation Albion',
  description: 'Tagga Bay, Ösel, 12 October 1917, at dawn: the German fleet silences the Russian batteries on the Hundsort and Ninnast headlands and the 42nd Division lands in boats and lighters — rocky shores, low limestone cliffs, juniper heath and stone-walled farms, the road inland to Arensburg.',
  epochs: ['1918'],
  region: 'east',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Russia', pact: 'Germany' },
  armies: { nato: ['ru'], pact: ['de', 'st'] },
  conditions: { time: 'dawn', weather: 'overcast' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.45, // (vehicles: the pank is no way up; the battery lane climbs onto the headlands)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1917,
  height,
  river: sea,
  fields: createFields({ seed: 1917, cell: 70, weights: [0.45, 0.15, 0.25, 0.15] }),

  theme: {
    // an October dawn on the Baltic: low grey cloud, a pale light coming up over the island
    fogColor: 0xa8b0b4, fogDensity: 0.0006,
    skyTop: 0x5e7086, skyHorizon: 0xc8ccc8, skyBottom: 0x848c8c,
    sunColor: 0xf6e2c4, sunIntensity: 1.7, sunDisk: 0.3,
    clouds: 0.55, cloudLight: 0xdcdcd8, cloudDark: 0x80888e,
    sunDir: [0.55, 0.35, -0.75],
    hemiSky: 0xc4ccd4, hemiGround: 0x5c5a44, hemiIntensity: 1.3,
    rimColor: 0xd0d4d6, rimIntensity: 0.22,
    terrain: {
      grass: '#646a40', grassAlt: '#5a6238', dryGrass: '#9a8c5c', dirt: '#6a5c48', rock: '#a8a492',
      pasture: '#66703e', ploughed: '#5e5040', stubble: '#a49460', meadow: '#6c7442',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, sz = shoreZ(x);
        if (onRoadL(x, lz)) return [0x8a7c62, 0.85];                                        // the gravel tracks
        if (lz > sz + 3) return [y > -1.5 ? 0xb4ae98 : 0x7e8478, 1];                        // the stony bottom
        if (lz > sz - 22) return [fbm(noise, x * 0.05, lz * 0.05, 2) > 0.15 ? 0xd0c4a2 : 0xa8a496, 1]; // the shingle, sand in the coves
        if (cliffK(x) > 0.3 && lz > sz - 16 && y > 2) return [0xcac4b0, 0.95];             // the pank’s pale limestone
        if (fbm(noise, x * 0.008 + 3, lz * 0.008, 2) > 0.05) return [0x5a6440, 0.55];       // the juniper heath on thin soil (alvar)
        return null;                                                                       // the fields
      },
    },
  },

  bases: { nato: { x: 60, z: 830, entries: [-300, 60, 360] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the Germans land: their roads are the beach sectors)
  maxStacks: 24,
  cameraStart: { nato: { x: 0, z: 120 }, pact: { x: 0, z: -300 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    // the 42nd Division’s boats and lighters, towed in by the torpedo boats (systems/Landing.js craft: the German side’s launches and ferries)
    craft: { infantry: ['ml'], vehicle: 'ferry' },
    signal: { t: 15, say: 'The torpedo boats are casting off the tows — the boats pull for Tagga Bay', sayOther: 'Boats in the bay! The Germans are landing — stand to!' },
    // what the landing may call in at sea: the torpedo boats inshore, the battleships against the batteries, the M-boats in the fields
    navy: ['destroyer', 'battleship', 'lightCruiser', 'minesweeper'],
    // the Russian field laid across the mouth of the bay; the swept lanes off each sector
    seaMines: { z: [470, 530], count: 50, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1917 },
    // the batteries on the headlands (heavy naval guns in concrete, firing on ships)
    forts: BATTERIES.map((b) => ({ unit: 'coastBattery', name: b.name, ...W(b.x, b.z), facing: Math.PI })),
    // a few outposts: trenches and Maxims over each landing place, wire across the bay’s head, posts round the batteries
    works: [
      ...SECTORS.flatMap((s) => [-40, 0, 40].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - 52), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - 46), yaw: 0 }))),
      ...Array.from({ length: 12 }, (_, i) => { const x = -66 + i * 12; return { kind: 'wire', ...W(x, shoreZ(x) - 26), yaw: 0 }; }),
      ...BATTERIES.flatMap((b) => [-30, 30].map((dx) => ({ kind: 'trench', ...W(b.x * 0.86 + dx, b.z - 110), yaw: 0 }))),
    ],
    // the Russian 107th Division’s outposts: Mosins and Maxims over the beaches, the gunners at the batteries, scouts on the heath
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'sniper', 'rifles', 'mortar', 'scouts', 'rifles'],
    hold: [...SECTORS.flatMap((s) => [-40, -22, 22, 40].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 46 : 52)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the reserve from Arensburg: Cossacks and Austin armoured cars down the road, a battalion behind them
    counter: { t: 360, units: ['ifv', 'reconVehicle', 'rifles', 'ifv', 'rifles'], say: 'The reserve is coming up from Arensburg — Cossacks and armoured cars, straight for the bay', sayOther: 'Cossacks and armoured cars on the Arensburg road!' },
    ai: { order: ['rifles', 'rifles', 'mgTeam', 'engineers', 'rifles', 'mortar', 'rifles', 'mgTeam', 'sniper', 'rifles', 'artillery', 'scouts'], gunship: 'destroyer', gunships: 1, sweeper: 'minesweeper', heavy: 'battleship', inshore: 380 },
    economy: { reserves: 2200, perSector: 600, beachIncome: 1.15, defenceCp: 750, defenceIncome: 1.2 },
    waves: [
      // 05:30, the first wave: the 131st Infantry Regiment’s companies in the boats, into all three landing places
      { t: 0, units: [
        { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'engineers', sector: 1 },
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 },
      ] },
      { t: 150, say: 'The lighters are bringing in the second wave — the 138th Regiment and the cyclists', units: [{ unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 2 }, { unit: 'mortar', sector: 1 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1917);
    sea.build(scene, terrain);
    const at = (x: number, z: number) => { const w = W(x, z); return { ...w, y: terrain.heightAt(w.x, w.z) }; };
    const nearPoint = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - F * z) < m);
    const clear = (x: number, z: number, m = 10) => !onRoadL(x, z) && !onRoadL(x + 6, z) && !onRoadL(x - 6, z) && !nearPoint(x, z, m) && z < shoreZ(x) - 30;
    const cyl = (x: number, z: number, y: number, r0: number, r1: number, h: number, color: number, key = 'stone') => {
      const w = W(x, z);
      props.push(key, new THREE.CylinderGeometry(r0, r1, h, 14), new THREE.Matrix4().makeTranslation(w.x, y + h / 2, w.z), color);
    };
    const CONCRETE = 0x9a968a, STONE = 0xa6a090, TIMBER = 0x5e5040;

    // ---- the batteries on the headlands: the concrete magazines and shelters behind the guns, a range-finder tower, the gunners’ huts
    for (const b of BATTERIES) {
      const s = Math.sign(b.x);
      for (const dx of [-26, 0, 26]) { const p = at(b.x - s * 20 + dx * 0.4, b.z - 40 + dx * 0.3); props.box('stone', p.x, p.y + 1.4, p.z, 10, 2.8, 7, 0, CONCRETE); }
      props.tower({ ...W(b.x - s * 50, b.z - 30), concrete: true });
      for (let i = 0; i < 3; i++) props.house({ ...W(b.x - s * (40 + i * 14), b.z - 90), yaw: 0, width: 9, depth: 5, height: 2.8 });
      props.lowWall({ ...W(b.x, b.z - 22), yaw: 0, length: 40, height: 1.4, color: CONCRETE });
    }
    // ---- the shore: limestone boulders on the shingle and in the shallows (kept out of the boat lanes), the fishermen’s huts and boats at the bay’s head
    for (let i = 0; i < 220; i++) {
      const x = -490 + r() * 980, z = shoreZ(x) + 20 - r() * 34;
      if (SECTORS.some((s) => Math.abs(s.x - x) < 70) || nearPoint(x, z, 30)) continue;
      props.boulder({ ...W(x, z), radius: 0.6 + r() * 1.6 });
    }
    for (let i = 0; i < 6; i++) {
      const x = 90 + i * 14 + (r() - 0.5) * 4, p = at(x, shoreZ(x) - 20 - (i % 2) * 6);
      props.box('plain', p.x, p.y + 1.3, p.z, 4.5, 2.6, 6, (r() - 0.5) * 0.3, 0x5e5a52);
      props.box('plain', p.x, p.y + 2.9, p.z, 5, 0.4, 6.6, (r() - 0.5) * 0.3, 0x3a3634);
    }
    // ---- Tagga manor: the manor house, its barns and the stone wall round the yard
    const mx = 50, mz = -200;
    for (const dx of [-52, -40, -28]) props.townHouse({ ...W(mx + dx, mz - 10), yaw: 0, width: 12, depth: 12, storeys: 2, name: 'manor house', damaged: 0 });
    props.hall({ ...W(mx + 48, mz - 24), yaw: Math.PI / 2, width: 30, depth: 10, height: 6, color: 0xa69c88, roof: 0x5a4a3a, door: 5, name: 'barn' });
    props.hall({ ...W(mx - 30, mz - 56), yaw: 0, width: 22, depth: 9, height: 5, color: 0xa69c88, roof: 0x5a4a3a, door: 4, name: 'stable' });
    for (const [x, z, yaw, len] of [[mx - 70, mz + 20, Math.PI / 2, 70], [mx + 70, mz + 10, Math.PI / 2, 60], [mx - 30, mz - 80, 0, 60]] as [number, number, number, number][]) props.wall({ ...W(x, z), yaw, length: len, height: 1.3 });
    // ---- the farms on the heath with their dry-stone walls, the windmills on the rises
    const MILLS = [[-200, -300], [230, -380], [-90, -560]];
    for (let i = 0; i < 16; i++) { // a farmstead: the low stone house under its thatch, the barn, the yard wall
      const x = -450 + r() * 900, z = -60 - r() * 760, yaw = Math.round(r() * 3) * (Math.PI / 2);
      if (!clear(x, z, 30) || !clear(x + 16, z) || !clear(x, z - 16) || Math.hypot(x - mx, z - mz) < 90 || MILLS.some(([a, b]) => Math.hypot(x - a, z - b) < 30)) continue;
      props.house({ ...W(x, z), yaw, width: 9 + r() * 3, depth: 6, height: 2.8 });
      props.hall({ ...W(x + 14 * Math.cos(yaw), z - 14 * Math.sin(yaw)), yaw, width: 12, depth: 7, height: 4, color: 0x8a8070, roof: 0x6a6048, door: 3, name: 'barn' });
      props.wall({ ...W(x - 6 * Math.sin(yaw), z - 9 * Math.cos(yaw)), yaw, length: 22, height: 1.2 });
    }
    for (let i = 0; i < 46; i++) {
      const x = -470 + r() * 940, z = 40 - r() * 860, yaw = r() < 0.5 ? 0 : Math.PI / 2;
      if (!clear(x, z, 24) || !clear(x + 20, z) || !clear(x, z - 20)) continue;
      props.wall({ ...W(x, z), yaw, length: 20 + r() * 40, height: 1.1 });
    }
    for (const [x, z] of MILLS) { // the windmills: a stone tower, the timber cap, four sails
      if (!clear(x, z, 20)) continue;
      const p = at(x, z);
      cyl(x, z, p.y, 2.4, 3.6, 9, STONE);
      cyl(x, z, p.y + 9, 0.4, 2.6, 2.4, TIMBER, 'plain');
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + 0.4, s = Math.sin(a), c = Math.cos(a);
        props.box('plain', p.x + c * 5, p.y + 10 + s * 5, p.z + F * 3, 1.4, 10, 0.2, 0, 0xcfc6b4, 0, -a + Math.PI / 2);
      }
      cover.addCylinder({ x: p.x, z: p.z, radius: 3.6, height: 9 });
    }
    // ---- the Russian camp on the Arensburg road
    for (let i = 0; i < 6; i++) props.tent({ ...W(-60 + (i % 3) * 10, -700 - Math.floor(i / 3) * 10), yaw: 0.1, color: 0x8a8462 });
    commandPost(props, this.bases.nato, -1, 0x7a7656);
    props.finish();

    const land = (x: number, z: number) => F * z < shoreZ(x) - 40;
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => onRoad(x, z) || !land(x, z) || Math.hypot(x - mx, F * z - mz) < 60 }];
    // juniper: dense knee- to head-high bushes over the heath; pine woods inland and on the headlands’ backs
    const juniper = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 2600, broadleaf: 0, autumn: 0, size: 0.28, maxY: 60, avoid,
      forest: (x: number, z: number) => 0.3 + fbm(noise, x * 0.008 + 3, F * z * 0.008, 2) });
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1100, broadleaf: 0.1, autumn: 0.2, maxY: 60, avoid,
      forest: (x: number, z: number) => { const lz = F * z; return smoothstep(0.1, 0.4, fbm(noise, x * 0.005 + 9, lz * 0.005, 2)) * (shoreZ(x) - lz > 120 ? 0.9 : 0.2); } });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.6, fields: this.fields,
      avoid: [...avoid.slice(0, -1), { test: (x: number, z: number) => onRoad(x, z) || F * z > shoreZ(x) - 26 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { juniper.update?.(dt, t); pines.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
