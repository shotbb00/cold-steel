// Gotland, 2027 (coastal: the Baltic Fleet lands, US and Polish troops hold; 1.0 × 1.8 km). The island in the
// middle of the Baltic that NATO fears Russia would take first, to put its air defence over the whole sea: the
// west coast south of Visby. In the north the Högklint — the limestone cliff straight up from a narrow shingle
// beach, rauks (sea stacks) at its foot; in the middle Tofta strand, a long sand beach with pine woods behind it
// and the old firing range up on the heath; in the south Gnisvärd, a fishing hamlet of grey huts on the
// shingle. Inland the stony plateau: juniper heath, pine, dry-stone walls round the fields, and Västerhejde's
// stone church on the road to Visby.
// Laid out like Hohwacht (maps/hohwacht.ts) in a frame with the sea toward +z (`L`), then turned round: the
// lander's side is -z, so the sea is there (systems/Landing.js lands()).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(2027_06);
const sea = createSea({ level: 0, size: SIZE, color: 0x2e5a6a }); // (the open Baltic: clearer and bluer than Hohwacht's bay)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** The waterline (local z): a little over a hundred metres from the middle, the cliff's foot further out. */
const shoreZ = (x: number) => 160 + fbm(noise, x * 0.003, 2.1, 2) * 16 + cliffK(x) * 20;
/** The Högklint (north, -x): how much cliff there is at x (1 under the top, gone south of the beach's end). */
const cliffK = (x: number) => smoothstep(-120, -240, x);
/** Shingle instead of sand: under the cliff and at Gnisvärd. */
const shingle = (x: number) => cliffK(x) > 0.3 || x > 300;

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  if (d > 0) { // the bottom: shelving off quickly (deep water close in under the cliff), a sandbar off Tofta
    const steep = 1 + cliffK(x) * 1.5;
    const h = 0.6 - d * 0.016 * steep - Math.max(0, d - 130) * 0.045 + Math.sin(d * 0.07 + x * 0.004) * 0.3 * smoothstep(20, 60, d) * smoothstep(130, 90, d) * (1 - cliffK(x));
    return Math.max(h, -20);
  }
  const back = -d; // m inland of the waterline
  // the beach (30–40 m), a low beach ridge, the pine flats behind (4–7 m), then the old shoreline's terrace up onto the plateau (~20 m)
  const beach = 0.6 + back * 0.04;
  const ridge = 2.2 * Math.exp(-(((back - 44) / 10) ** 2)) * (0.8 + 0.4 * fbm(noise, x * 0.02, 3.3, 2));
  let land = 3.5 + smoothstep(40, 120, back) * 3 + smoothstep(260, 380, back) * 13 + Math.max(0, back - 380) * 0.012 + fbm(noise, x * 0.004, z * 0.004, 3) * 4;
  let h = Math.max(beach + ridge * smoothstep(20, 36, back), Math.min(land, beach + back * 0.25));
  // the Högklint: the plateau 24 m up straight behind a narrow beach
  const ck = cliffK(x);
  if (ck > 0) {
    const top = 24 + fbm(noise, x * 0.01, 7.1, 2) * 3 + Math.max(0, back - 80) * 0.015;
    const face = smoothstep(22, 40, back); // (limestone: sheer — no vehicle climbs it, men slowly)
    h = h + (Math.max(h, beach + (top - beach) * face) - h) * ck;
  }
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** Roads (local frame): the coast road behind the beach, a road up from each sector, the Visby road across at Västerhejde. */
function onRoadL(x: number, z: number) {
  const sz = shoreZ(x);
  if (z < sz - 75 && z > sz - 94 + Math.sin(x * 0.01) * 4 && cliffK(x) < 0.4) return true;                         // the coast road
  if (Math.abs(x - (-300 + Math.sin(z * 0.011) * 20)) < 3.5 && z < sz - 46 && z > -640) return true;                 // up behind the Högklint
  if (Math.abs(x - (40 + Math.sin(z * 0.009) * 26)) < 3.5 && z < sz - 80 && z > -640) return true;                   // up from Tofta, past the range
  if (Math.abs(x - (380 + Math.sin(z * 0.012) * 18)) < 3.5 && z < sz - 40 && z > -640) return true;                  // up from Gnisvärd
  if (Math.abs(z - (-580 + Math.sin(x * 0.006) * 26)) < 3.5) return true;                                            // the Visby road
  return false;
}
const onRoad = (x: number, z: number) => onRoadL(x, F * z);

/** The beach sectors (x) and what is up behind them (local z). */
export const SECTORS = [
  { x: -320, name: 'Högklint', inland: { name: 'Högklint', x: -320, z: -70 } },
  { x: 40, name: 'Tofta strand', inland: { name: 'Tofta range', x: 40, z: -270 } },
  { x: 370, name: 'Gnisvärd', inland: { name: 'Gnisvärd', x: 390, z: -80 } },
];
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world

const points: ControlPointDef[] = [
  { id: 'A', name: 'Landing area', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (open from the start; `opens` what is behind once taken), out to the trenches over each beach
  { id: 'B', name: 'Högklint beach', ...W(-320, shoreZ(-320) - 36), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Tofta strand', ...W(40, shoreZ(40) - 44), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Gnisvärd beach', ...W(370, shoreZ(370) - 42), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Högklint', ...W(-320, -70), owner: null, sector: 'west' },
  { id: 'F', name: 'Tofta range', ...W(40, -270), owner: null, sector: 'centre' },
  { id: 'G', name: 'Gnisvärd', ...W(390, -80), owner: null, sector: 'east' },
  { id: 'K', name: 'Västerhejde', ...W(-120, -640), owner: 'nato', sector: 'centre' },
];

export default {
  id: 'gotland-landing',
  name: 'Gotland',
  description: 'Gotland, 2027: the limestone cliff of the Högklint, Tofta\'s sand and pines, the fishing huts of Gnisvärd, the stony heath inland. The Baltic Fleet lands from the sea; US and Polish troops hold the island.',
  epochs: ['2027'],
  region: 'europe',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'NATO', pact: 'Russia' },
  armies: { nato: ['us', 'pl'], pact: ['ru'] }, // (the US Army and the Poles hold; Russian naval infantry land)
  conditions: { time: 'dawn', weather: 'clear' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.45, // (vehicles: the Högklint is no way up)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 2027,
  height,
  river: sea,
  fields: createFields({ seed: 2027, cell: 80, weights: [0.5, 0.1, 0.25, 0.15] }),

  theme: {
    fogColor: 0xb4c0c8, fogDensity: 0.0005,
    skyTop: 0x5c7ea4, skyHorizon: 0xd2d8d8, skyBottom: 0x8a9496,
    sunColor: 0xfde6c8, sunIntensity: 2.0, sunDisk: 0.45,
    clouds: 0.35, cloudLight: 0xf0eee8, cloudDark: 0x98a0a8,
    sunDir: [0.5, 0.45, -0.75],
    hemiSky: 0xc8d6e2, hemiGround: 0x5a5840, hemiIntensity: 1.25,
    rimColor: 0xd4dce2, rimIntensity: 0.22,
    terrain: {
      grass: '#6a7040', grassAlt: '#5a6438', dryGrass: '#a09a64', dirt: '#6a5e4a', rock: '#a8a290',
      pasture: '#6c7442', ploughed: '#6a5a44', stubble: '#aa9e66', meadow: '#727c44',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, sz = shoreZ(x);
        if (onRoadL(x, lz)) return [0x5a5a5c, 0.9];                                         // asphalt
        if (lz > sz + 4) return [y > 0.3 ? 0xcfc8b0 : 0xa8a28c, 1];                           // under the water
        if (lz > sz - 34) return shingle(x) ? [0xa8a49a, 1] : [0xe0d6b8, 1];                  // the beach: shingle or sand
        if (cliffK(x) > 0.3 && lz > sz - 44 && y > 3) return [0xcac4b0, 0.9];                // the Högklint's pale limestone
        if (lz > sz - 56 && !shingle(x)) return [0xc6bc92, 0.7];                             // the beach ridge, its grass
        if (y > 14 && fbm(noise, x * 0.01, lz * 0.01, 2) > 0.1) return [0x9a9670, 0.6];      // the alvar: thin turf on the limestone
        return null;                                                                        // the fields
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-200, 40, 280] }, pact: { x: 0, z: -830, entries: [-320, 40, 370] } }, // (Russia lands: its roads are the beach sectors)
  maxStacks: 24,
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what the naval infantry come in (systems/Landing.js): the men by Zubr or Ropucha, the armour by Ropucha or Zubr
    craft: { infantry: ['zubr', 'zubr', 'ropucha'], vehicle: ['ropucha', 'zubr'] },
    // what the landing may call in at sea: the Baltic Fleet's corvettes and Karakurts over the beach, a minesweeper to widen the lanes
    navy: ['frigate', 'corvette', 'ptBoat', 'alexandrit'],
    // the mines laid off the island since the crisis began, a lane left off each sector
    seaMines: { z: [520, 580], count: 60, lanes: [-320, 40, 370], lane: 80, seed: 2027 },
    // the Polish Navy's NSM battery, flown in: two launcher trucks inland that fire on the ships, then move
    forts: [{ unit: 'nsmBattery', ...W(-160, -380), facing: Math.PI }, { unit: 'nsmBattery', ...W(240, -460), facing: Math.PI }],
    // the works dug since the crisis: wire along the back of the beach, minefields and trenches over each sector
    works: [
      ...Array.from({ length: 90 }, (_, i) => { const x = -490 + i * 11; return { kind: 'wire', ...W(x, shoreZ(x) - (cliffK(x) > 0.3 ? 16 : 30)), yaw: 0 }; }),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - (cliffK(s.x) > 0.3 ? 40 : 62)) }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - (cliffK(s.x) > 0.3 ? 54 : 52)), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - (cliffK(s.x) > 0.3 ? 48 : 47)), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - (cliffK(s.x) > 0.3 ? 22 : 38)) }))),
    ],
    // the island's garrison at dawn: infantry and Javelins over each beach, drone teams and mortars behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'atTeam', 'fpvTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'fpvTeam', 'manpads', 'tankDestroyer', 'mortar', 'scouts'],
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 47 : 56)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the armoured counter-attack: the battlegroup's tanks from Visby, after four and a half minutes
    counter: { t: 270, units: ['heavyTank', 'ifv', 'heavyTank', 'ifv', 'heavyTank'], say: 'The battlegroup is coming down from Visby: tanks and IFVs, straight for the beachhead', sayOther: 'Enemy armour coming down from inland: Abrams and their IFVs' },
    // the landing's AI (ai/LandingDirector.js): the naval infantry's buying order, one Steregushchiy inshore off the focus sector
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'fpvTeam', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'manpads', 'rifles', 'tank'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 380 },
    economy: { reserves: 2100, perSector: 575, beachIncome: 0.78, defenceCp: 975, defenceIncome: 1.8 }, // (richer than Hohwacht's: the 2027 garrison's drones and Javelins hold harder — AI vs AI 2026-11-19)
    // the BTR-82As and BMPs swim in on their own, put in off the beach
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon' },
    // the first wave at dawn, in to all three sectors at once
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'ifv', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'ifv', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(2027);
    sea.build(scene, terrain);
    const at = (x: number, z: number) => { const w = W(x, z); return { ...w, y: terrain.heightAt(w.x, w.z) }; };

    // ---- the rauks: limestone stacks on the shingle under the Högklint
    for (let i = 0; i < 9; i++) {
      const x = -460 + r() * 220, z = shoreZ(x) - 4 - r() * 22;
      props.column({ ...W(x, z), radius: 1.2 + r() * 1.4, height: 4 + r() * 5 });
      if (r() < 0.6) props.boulder({ ...W(x + (r() - 0.5) * 6, z + (r() - 0.5) * 6), radius: 0.8 + r() * 1.2 });
    }
    // ---- Högklint on top: summer houses among the pines, the old lookout
    for (let i = 0; i < 10; i++) {
      const x = -440 + r() * 220, z = -50 - r() * 80;
      if (onRoadL(x, z)) continue;
      props.house({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 7 + r() * 3, depth: 6 + r() * 2, height: 3 });
    }
    props.tower({ ...W(-360, -40), concrete: false });
    // ---- Gnisvärd: the fishing huts in a row on the shingle, the hamlet up behind
    for (let i = 0; i < 12; i++) {
      const x = 330 + i * 9 + (r() - 0.5) * 2, z = shoreZ(x) - 20 - (i % 2) * 5;
      const p = at(x, z);
      props.box('plain', p.x, p.y + 1.4, p.z, 4, 2.8, 5, (r() - 0.5) * 0.2, 0x6e6a64); // a grey timber hut
      props.box('plain', p.x, p.y + 3.1, p.z, 4.4, 0.4, 5.4, (r() - 0.5) * 0.2, 0x3a3a3c);
    }
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, x = 390 + Math.cos(a) * (28 + r() * 30), z = -80 + Math.sin(a) * 24;
      if (onRoadL(x, z)) continue;
      props.townHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: 1 + (r() < 0.4 ? 1 : 0), name: 'house', damaged: 0 });
    }
    // ---- the Tofta range: the camp's sheds and the range tower on the heath
    for (let i = 0; i < 5; i++) props.hall({ ...W(10 + (i % 3) * 32, -250 - Math.floor(i / 3) * 34), yaw: 0, width: 22, depth: 10, height: 5, color: 0x8a3a2a, roof: 0x3e4044, door: 4, name: 'range shed' });
    props.tower({ ...W(110, -300), concrete: true });
    // ---- Västerhejde: farms, the stone church, houses on the Visby road
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + r() * 0.4, dd = 34 + r() * 60;
      const x = -120 + Math.cos(a) * dd, z = -640 + Math.sin(a) * dd * 0.7;
      if (onRoadL(x, z)) continue;
      if (i % 3 === 0) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, a + Math.PI / 2);
      else props.townHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: 2, name: 'house', damaged: 0 });
    }
    props.church(W(-60, -610));
    // ---- the dry-stone walls round the fields on the plateau
    for (let i = 0; i < 26; i++) {
      const x = -460 + r() * 920, z = -320 - r() * 520, yaw = r() < 0.5 ? 0 : Math.PI / 2;
      if (onRoadL(x, z)) continue;
      props.wall({ ...W(x, z), yaw, length: 30 + r() * 50, height: 1.1 });
    }
    commandPost(props, this.bases.nato, -1, 0x5a5e4c);
    props.finish();

    const land = (x: number, z: number) => F * z < shoreZ(x) - 60;
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => onRoad(x, z) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1500, broadleaf: 0.15, autumn: 0, maxY: 80,
      avoid: [...avoid, { test: (x: number, z: number) => !land(x, z) }],
      forest: (x: number, z: number) => { const lz = F * z, back = shoreZ(x) - lz; return smoothstep(0.1, 0.45, fbm(noise, x * 0.006 + 4, lz * 0.006, 2)) * 0.8 + (back > 60 && back < 240 && x > -150 && x < 300 ? 0.5 : 0); } }); // (Tofta's pine woods behind the beach)
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => F * z > shoreZ(x) - 30 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
