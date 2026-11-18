// Gallipoli, 25 April 1915 (coastal, the 1918 epoch: the British Empire lands, the Ottoman Empire holds; 1.2 × 1.8 km).
// Before dawn the boats of the Australian and New Zealand Army Corps, towed in lines by the battleships' steam
// pinnaces and cast off to row the last few hundred yards, grounded not on the open beach planned south of Hell Spit
// but a mile north, in the little cove under Ari Burnu: a strip of shingle twenty yards deep and, straight up from
// it, the scrub-covered ravines and razorback spurs of the Sari Bair range. The 3rd Brigade went up the cliffs at the
// bayonet onto Plugge's Plateau, along Russell's Top past the crumbling yellow pinnacle they named the Sphinx, over
// the Nek to Baby 700 — and there, by mid-morning, met Mustafa Kemal's 57th Regiment coming down from Chunuk Bair.
// The sea is toward +z: the transports and the warships lie there; the beaches run along x (north is −x).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { segDist, graded } from './greatWarHelpers.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2200;
const BOUNDS = { x: 600, z: 900 };
const SHORE = 520;
const noise = createNoise2D(1915_04);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a5a6c }); // (the Aegean: deep blue close inshore)
const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

/** The waterline: the shallow bite of Anzac Cove between Ari Burnu (north) and Hell Spit, North Beach beyond, Brighton Beach running south to Gaba Tepe. */
const shoreZ = (x: number) => SHORE + fbm(noise, x * 0.006, 2.1, 2) * 8 - 38 * bell(x, 10, 120) + 55 * bell(x, -185, 38) + 26 * bell(x, 185, 32) + 130 * bell(x, 560, 70);
/** World position of a place `back` m inland of the waterline at x. */
const W = (x: number, back: number) => ({ x, z: shoreZ(x) - back });

// Shrapnel Gully and Monash Valley up from the cove between the first and second ridges; the gully behind North Beach
const GULLIES = [
  [[30, 10], [-20, 120], [-60, 240], [-110, 380], [-150, 500]].map(([x, b]) => [x, SHORE - b]),
  [[-330, 20], [-360, 160], [-330, 300]].map(([x, b]) => [x, SHORE - b]),
  [[300, 10], [320, 200], [380, 420]].map(([x, b]) => [x, SHORE - b]),
];
const SPHINX = W(-215, 250);
// the heights the points stand on: their plateau tops levelled (x, back, radius)
const TOPS: [number, number, number][] = [[-70, 180, 34], [-255, 340, 30], [230, 400, 46], [-230, 560, 30], [-120, 1260, 40], [-60, 1360, 36]];

/** The hills' rise inland (before the levelled tops): cliffs straight up from the beach, the long climb to the main ridge. */
function rise(x: number, z: number) {
  const back = shoreZ(x) - z;
  const south = 1 - 0.45 * smoothstep(150, 420, x);                                          // (gentler toward Gaba Tepe)
  let h = 0.5 + Math.min(back, 18) * 0.08;                                                    // the shingle
  h += 92 * smoothstep(16, 170, back) ** 1.15 * south;                                        // the cliffs and the first ridge
  h += Math.max(0, back - 200) * 0.075 * south;                                               // up toward Chunuk Bair
  h += ridged(noise, x * 0.009 + 4, z * 0.009, 4) * 30 * smoothstep(30, 160, back) * (1 - 0.6 * smoothstep(500, 1000, back)); // the razorback spurs and their ravines (rounder up on the main ridge)
  h += fbm(noise, x * 0.04, z * 0.04, 2) * 2 * smoothstep(10, 40, back);
  for (const g of GULLIES) h -= 42 * smoothstep(40, 4, segDist(g, x, z) + fbm(noise, x * 0.02 + 6, z * 0.02, 2) * 16) * smoothstep(10, 90, back); // (winding, not ruled)
  h += 34 * smoothstep(22, 4, Math.hypot(x - SPHINX.x, z - SPHINX.z));                        // the Sphinx
  return Math.max(h, 0.6 + Math.min(back, 60) * 0.05); // (a gully's mouth: down to the shingle, never under the sea)
}
const TOP_H = TOPS.map(([x, b]) => { const p = W(x, b); return rise(p.x, p.z); });

// the Ottoman supply track from Boghali over the main ridge, past the 400 Plateau and down by Gaba Tepe to Brighton Beach:
// graded, the one way for wheels between the beaches and the heights
const TRACK = [[-60, -840], [40, -620], [150, -400], [250, -160], [230, 120], [330, 300], [400, 420], [330, 500]];
const TRACK_H = TRACK.map(([x, z], i) => (i === 4 ? TOP_H[2] : i === TRACK.length - 1 ? 1.2 : i === 0 ? TOP_H[5] : rise(x, z)));
function height(x: number, z: number) {
  const d = z - shoreZ(x); // + out to sea
  if (d > 0) return Math.max(-0.8 - d * 0.32 - Math.max(0, d - 60) * 0.05, -26) + fbm(noise, x * 0.01, z * 0.01, 2) * 0.5; // deep water close in: the boats ground a few metres off
  let h = rise(x, z);
  TOPS.forEach(([tx, tb, r], i) => { const p = W(tx, tb); h += (TOP_H[i] - h) * smoothstep(r + 30, r, Math.hypot(x - p.x, z - p.z)); });
  const g = graded(TRACK, TRACK_H, x, z);
  if (g.d < 14) h += (g.h - h) * smoothstep(14, 5, g.d);
  return h;
}

/** The beach sectors (x) and the height each opens. */
export const SECTORS = [
  { x: -330, name: 'North Beach', inland: W(-255, 340) },
  { x: 0, name: 'Anzac Cove', inland: W(-70, 180) },
  { x: 330, name: 'Brighton Beach', inland: W(230, 400) },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The transports', ...W(0, -340), owner: 'nato', sector: 'centre', radius: 90 },
  { id: 'B', name: 'North Beach', ...W(-330, 10), owner: null, sector: 'west', radius: 34, opens: 'E' } as any,
  { id: 'C', name: 'Anzac Cove', ...W(0, 9), owner: null, sector: 'centre', radius: 34, opens: 'F' } as any,
  { id: 'D', name: 'Brighton Beach', ...W(330, 11), owner: null, sector: 'east', radius: 34, opens: 'G' } as any,
  { id: 'E', name: 'Russell\'s Top', ...SECTORS[0].inland, owner: null, sector: 'west', radius: 32 },
  { id: 'F', name: 'Plugge\'s Plateau', ...SECTORS[1].inland, owner: null, sector: 'centre', radius: 34 },
  { id: 'G', name: '400 Plateau', ...SECTORS[2].inland, owner: null, sector: 'east', radius: 44 },
  { id: 'H', name: 'Baby 700', ...W(-230, 560), owner: null, sector: 'west', radius: 30 },
  { id: 'K', name: 'Chunuk Bair', ...W(-120, 1260), owner: 'pact', sector: 'centre' },
];
const MANDA = { ...W(380, 470) }; // (the Ottoman reserve's bivouac behind the 400 Plateau)

export default {
  id: 'gallipoli',
  name: 'Gallipoli',
  description: 'ANZAC Cove, 25 April 1915, at dawn: the boats ground under the cliffs of the Sari Bair range — a strip of shingle, then scrub-choked ravines straight up to Plugge\'s Plateau, Russell\'s Top, the Sphinx and the Nek. Take the heights before the Ottoman reserves come down from Chunuk Bair.',
  epochs: ['1918'],
  theatre: 'coastal',
  region: 'middleEast',
  modes: ['landing'],
  sides: { nato: 'British Empire', pact: 'Ottoman Empire' },
  armies: { nato: ['anzac', 'uk'], pact: ['ot'] },
  conditions: { time: 'dawn', weather: 'clear' },
  wind: { from: 250, speed: 2, veer: 0.1 }, // (a flat calm before dawn: the tows came in on a glassy sea)
  size: SIZE,
  segments: 900,
  bounds: BOUNDS,
  navCell: 1.5,
  steep: 0.5, // (the ravines: men scramble up through the scrub; wheels take the gentler slopes toward Gaba Tepe)
  overwatch: true,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1915,
  height,
  river: sea,
  fields: createFields({ seed: 1915, cell: 80 }),

  theme: {
    // first light over the peninsula: the sun not up yet behind the hills, the sea pale
    fogColor: 0xb8bcc0, fogDensity: 0.0006, skyTop: 0x6c86a4, skyHorizon: 0xe4d4bc, skyBottom: 0x8a8a7e,
    sunColor: 0xffe2bc, sunIntensity: 1.8, sunDisk: 0.6, clouds: 0.2, cloudLight: 0xf4e8dc, cloudDark: 0xa8a8a4,
    sunDir: [0.2, 0.3, -0.9], hemiSky: 0xd0d8e0, hemiGround: 0x7a6e50, hemiIntensity: 1.25, rimColor: 0xf0dcc0, rimIntensity: 0.3,
    terrain: {
      grass: '#6e7448', grassAlt: '#646c40', dryGrass: '#a0946a', dirt: '#a08458', rock: '#c8b48a',
      pasture: '#6c7446', ploughed: '#8a7452', stubble: '#a49668', meadow: '#727a4a',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const sz = shoreZ(x);
        if (z > sz + 2) return [y > -1.5 ? 0xb8ac8c : 0x5a7478, 1];                              // the shingle shelf, then deep water
        if (z > sz - 16) return [0xb0a48a, 1];                                                    // the shingle beach
        const g = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
        if (g > 0.85) return [0xd2b884, Math.min(1, (g - 0.85) * 2.5)];                           // the bare yellow clay of the cliffs
        if (Math.hypot(x - SPHINX.x, z - SPHINX.z) < 16) return [0xd6bc88, 1];                    // the Sphinx
        const scrub = fbm(noise, x * 0.05 + 9, z * 0.05, 2);
        if (graded(TRACK, TRACK_H, x, z).d < 3.5) return [0xa89070, 0.85];                      // the track
        return [0x4e5a34, 0.7 + Math.max(0, scrub) * 0.3];                                       // holly-oak and thyme scrub over everything
      },
    },
  },

  bases: { nato: { x: 0, z: 880, entries: SECTORS.map((s) => s.x) }, pact: { x: -60, z: -840, entries: [-300, -60, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 640 }, pact: { x: -80, z: 0 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // the tows: the battleships' boats behind their steam pinnaces, then the destroyers' (systems/Landing.js craft)
    craft: { infantry: ['ml'], vehicle: 'ferry' },
    launchZ: 780,
    signal: { t: 15, say: 'The tows are casting off — the boats pull for the shore', sayOther: 'Boats under the cliffs at Ari Burnu! Stand to!' },
    navy: ['destroyer', 'battleship', 'lightCruiser'],
    // the guns: the battery at Gaba Tepe enfilading the beaches, the field guns on the third ridge
    forts: [
      { unit: 'artillery', ...W(540, 150), facing: 0.6 },
      { unit: 'artillery', ...W(120, 900), facing: 0 },
    ],
    // a few trenches and an MG on each height over the beaches (one company held the whole stretch), wire on Brighton Beach
    works: [
      ...[-24, -8, 8, 24].map((dx) => ({ kind: 'trench', ...W(-70 + dx, 165), yaw: 0 })),
      ...[-16, 0, 16].map((dx) => ({ kind: 'trench', ...W(-255 + dx, 325), yaw: 0 })),
      ...[-30, -14, 2, 18, 34].map((dx) => ({ kind: 'trench', ...W(230 + dx, 380), yaw: 0 })),
      { kind: 'mgNest', ...W(-190, 70), yaw: 0 }, { kind: 'mgNest', ...W(190, 60), yaw: 0 }, { kind: 'mgNest', ...W(-230, 545), yaw: 0 },
      ...[250, 270, 290, 310, 380, 400, 420].map((x) => ({ kind: 'wire', ...W(x, 28), yaw: 0 })), // (a gap where the track comes down)
    ],
    // the Ottoman 27th Regiment's covering company at dawn; the 57th coming down from Chunuk Bair
    defence: ['rifles', 'mgTeam', 'rifles', 'sniper', 'rifles', 'mgTeam', 'rifles', 'artillery', 'rifles', 'sniper'],
    counter: { t: 240, units: ['rifles', 'rifles', 'mgTeam', 'rifles', 'rifles'], say: 'The 57th Regiment is coming down from Chunuk Bair — "I do not order you to attack, I order you to die."', sayOther: 'Turkish reinforcements coming over Battleship Hill — they\'re making for Baby 700!' },
    hold: [...SECTORS.map((s) => s.inland), W(-230, 560)],
    ai: { order: ['rifles', 'rifles', 'mgTeam', 'rifles', 'sniper', 'mortar', 'rifles', 'mgTeam', 'artillery', 'rifles'], gunship: 'destroyer', gunships: 1, heavy: 'battleship', inshore: 500 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 800, defenceIncome: 1.4 },
    waves: [
      // 04:30, the covering force: the 3rd Australian Brigade (9th, 10th, 11th, 12th Battalions), bunched into the cove
      { t: 0, units: [
        { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 },
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 1 },
      ] },
      { t: 120, say: 'The destroyers are bringing in the second wave — the 1st and 2nd Brigades', units: [{ unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }] },
      { t: 300, say: 'The New Zealanders and an Indian mountain battery are coming ashore', units: [{ unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'artillery', sector: 1 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1915);
    sea.build(scene, terrain);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);

    // the fishermen's hut on North Beach; the Ottoman look-out post on Ari Burnu; boulders fallen from the cliffs onto the shingle
    const hut = W(-400, 14);
    props.house({ x: hut.x, z: hut.z, yaw: 0.1, width: 7, depth: 5, height: 2.6 });
    const post = W(-185, 30);
    props.sandbagRing({ x: post.x, z: post.z, radius: 3.5, toward: 1 });
    for (let i = 0; i < 40; i++) {
      const x = -560 + r() * 1120, p = W(x, 6 + r() * 10);
      if (!near(p.x, p.z, 26)) props.boulder({ x: p.x, z: p.z, radius: 0.6 + r() * 1.2 });
    }
    // the Ottoman bivouac and the battery's dug-outs behind the 400 Plateau; the reserve's camp under Chunuk Bair
    for (let i = 0; i < 6; i++) props.tent({ x: MANDA.x + (i % 3) * 9, z: MANDA.z - Math.floor(i / 3) * 9, yaw: 0.1, color: 0xb8ac8c });
    for (let i = 0; i < 5; i++) props.tent({ x: -120 + i * 10, z: this.bases.pact.z + 60, yaw: 0, color: 0xb0a482 });
    commandPost(props, this.bases.pact, 1, 0xa89c7a);
    // sangars and rocks up the ravines
    for (let i = 0; i < 160; i++) {
      const x = (r() * 2 - 1) * 560, p = W(x, 40 + r() * 1100);
      if (near(p.x, p.z, 20) || steepAt(p.x, p.z) > 0.9) continue;
      if (r() < 0.7) props.boulder({ x: p.x, z: p.z, radius: 0.8 + r() * 1.6 });
      else props.lowWall({ x: p.x, z: p.z, yaw: r() * 3, length: 4 + r() * 4, height: 1.1, color: 0xa89878 });
    }
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => z > shoreZ(x) - 18 || Math.hypot(x - SPHINX.x, z - SPHINX.z) < 14 }];
    // the scrub: dense, chest-high holly-oak and arbutus over every slope (men vanish in it), a few stunted pines on the crests
    const scrub = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 5200, broadleaf: 1, autumn: 0, size: 0.32, maxY: 400, avoid,
      forest: (x: number, z: number) => (z > shoreZ(x) - 20 ? -1 : 0.5 + fbm(noise, x * 0.02 + 3, z * 0.02, 2)) });
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 300, broadleaf: 0, autumn: 0, size: 0.8, maxY: 400, avoid,
      forest: (x: number, z: number) => (shoreZ(x) - z > 300 && fbm(noise, x * 0.008, z * 0.008, 2) > 0.2 ? 0.5 : 0) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.4, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => z > shoreZ(x) - 20 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { scrub.update(dt, t); pines.update(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
