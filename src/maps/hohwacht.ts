// Hohwacht Bay, Holstein, 1985 (coastal: the Warsaw Pact lands, the Bundeswehr holds; 1.0 × 1.8 km). The
// Volksmarine's and the Polish sea-landing division's real objective: the shallow bay on the West German Baltic
// coast between the Probstei and Fehmarn. Out at sea the Pact's landing ships and the Bundesmarine's mine barrier;
// then the bay's arc, curving in to Hohwacht in the middle and out again to both sides, and three very different
// ways ashore:
//   • in the west the Großer Binnensee, a lagoon a few hundred metres across shut off from the sea by a sand spit
//     (the Nehrung) — land on the spit and there is water on both sides; the way off it is round the lagoon's west
//     end, to the Todendorf air-defence range (the Bundeswehr's Flak firing range on the shore) behind it;
//   • in the middle Hohwacht itself, its holiday flats and fishermen's houses on top of the Steilküste, a clay cliff
//     sixteen metres high with a strip of shingle under it and one gully (the Strandstraße) up through it;
//   • in the east the open Sehlendorfer Strand with its campsites, the smaller Sehlendorfer Binnensee behind its
//     dunes, and Sehlendorf at the lagoon's south end.
// Inland the end moraine: a beech-wooded ridge running from Hohwacht's cliff away south-west toward Panker and the
// Pilsberg (the high ground is all on the west side of the field), the low wet meadows of the Kossau to the east,
// the Knicks (hedge banks) round every field, and Lütjenburg on its rise with the Hessenstein tower.
// Laid out in a frame with the sea toward +z (`L`), then turned round: the Pact's side is -z, so the sea is there
// (the landing comes from its base out at sea: systems/Landing.js lands()).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const EXT = { x: 560, z: 960 };
const noise = createNoise2D(1985_09);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a5a62 }); // (the western Baltic: grey-green, brackish)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** The waterline (local z): the bay's arc, deepest at Hohwacht, out to both sides. */
const shoreZ = (x: number) => 100 + 0.00045 * x * x + fbm(noise, x * 0.004, 2.1, 2) * 10;
/** The Steilküste under Hohwacht (0..1 across x) and the gully up through it. */
const cliffK = (x: number) => smoothstep(-95, -60, x) * smoothstep(165, 125, x);
const GULLY = 70;
const gullyK = (x: number) => Math.exp(-(((x - GULLY) / 16) ** 2));
/** The lagoons behind their spits: the Großer Binnensee (west) and the Sehlendorfer Binnensee (east). */
const BIG = { x: -275, z: 0, rx: 180, rz: 72 };
const SMALL = { x: 345, z: 45, rx: 110, rz: 40 };
const lagD = (L: typeof BIG, x: number, z: number) => Math.hypot((x - L.x) / L.rx, (z - L.z) / L.rz);
const lagoonD = (x: number, z: number) => Math.min(lagD(BIG, x, z), lagD(SMALL, x, z));

/** Distance from (x, z) to the segment a–b. */
function seg(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
/** The end moraine: from Hohwacht's cliff away south-west toward Panker. */
const RIDGE = [[-40, 30], [-200, -260], [-470, -560]];
const ridgeD = (x: number, z: number) => Math.min(seg(x, z, RIDGE[0], RIDGE[1]), seg(x, z, RIDGE[1], RIDGE[2]));

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  if (d > 0) { // the bottom: a sandbar close in, then shelving away (the landing ships' water a couple of hundred metres out)
    const h = 0.6 - d * 0.014 - Math.max(0, d - 140) * 0.045 + Math.sin(d * 0.06 + x * 0.003) * 0.3 * smoothstep(20, 60, d) * smoothstep(140, 100, d);
    return Math.max(h, -18);
  }
  const back = -d; // m inland of the waterline
  const beach = 0.6 + Math.min(back, 30) * 0.05;
  const n = fbm(noise, x * 0.004, z * 0.004, 3);
  // the land: low and rolling, the moraine ridge up the west side, the Kossau meadows low in the east, Lütjenburg's rise
  let land = 3 + smoothstep(30, 120, back) * 2.5 + n * 3.5
    + 26 * Math.exp(-((ridgeD(x, z) / 120) ** 2)) * (0.85 + 0.3 * fbm(noise, x * 0.01, z * 0.01, 2)) * smoothstep(-40, 60, -z + 60)
    + 16 * Math.max(0, 1 - Math.hypot(x - 150, z + 720) / 260) ** 1.4
    - 2.2 * smoothstep(120, 320, x) * smoothstep(-60, -200, z) * smoothstep(-760, -600, z);
  // the dunes behind the open sand
  const dune = 2.6 * Math.exp(-(((back - 40) / 10) ** 2)) * (0.8 + 0.4 * fbm(noise, x * 0.02, 3.3, 2));
  let h = Math.max(beach + dune * smoothstep(18, 32, back) * (1 - cliffK(x)), Math.min(land, beach + back * 0.22));
  // the Steilküste: the land sixteen metres up straight behind a strip of shingle, the gully up through it
  const ck = cliffK(x) * smoothstep(240, 150, back); // (the cliff top falls back into the moraine inland)
  if (ck > 0) {
    const top = 15 + fbm(noise, x * 0.01, 7.1, 2) * 2.5;
    const face = smoothstep(18, 32, back); // (the face: steep — no vehicle climbs it, men slowly)
    let c = Math.max(h, beach + (top - beach) * face);
    c += (Math.min(c, beach + Math.max(0, back - 8) * 0.13) - c) * gullyK(x); // (the gully: 1 in 8)
    h += (c - h) * ck;
  }
  // the lagoons: a sheet of shallow water behind the spits, reeds round them
  const ld = lagoonD(x, z);
  if (ld < 1.4) h = h + (-1.4 + ld * 1.15 - h) * smoothstep(1.4, 1.05, ld);
  return h;
}
const heightC = gridCacheSmooth((x: number, z: number) => heightL(x, F * z), EXT, 2);
const height = (x: number, z: number) => heightC(x, z);

/** The roads (local frame), as polylines. */
const ROADS: number[][][] = [
  [[-470, 75], [-455, -80], [-400, -230], [-300, -480], [-150, -640], [150, -720]],     // off the spit's west end, past the range, to Lütjenburg
  [[GULLY, 108], [55, 40], [25, -85], [-20, -240], [40, -480], [150, -720]],            // up the gully, through Hohwacht, over the moraine
  [[200, 135], [240, -10], [370, -70], [330, -320], [250, -560], [150, -720]],         // off the Sehlendorfer Strand, through Sehlendorf
  [[-455, -80], [-250, -110], [-90, -40], [25, -85], [130, 20], [240, -10]],            // the coast road behind the lagoons
  [[-500, -600], [-150, -640], [150, -720], [500, -660]],                               // across, at Lütjenburg
];
const roadD = (x: number, z: number) => { let d = Infinity; for (const r of ROADS) for (let i = 1; i < r.length; i++) d = Math.min(d, seg(x, z, r[i - 1], r[i])); return d; };
const roadC = gridCache((x: number, z: number) => roadD(x, F * z), BOUNDS, 2);
const onRoad = (x: number, z: number) => roadC(x, z) < 3.5;
const onRoadL = (x: number, z: number) => onRoad(x, F * z);

/** The beach sectors (x), how deep their positions sit (m back from the waterline), and the places behind them (local z). */
export const SECTORS = [
  { x: -265, name: 'Binnensee spit', depth: 0.55, inland: { name: 'Todendorf range', x: -400, z: -235 } },
  { x: GULLY, name: 'Hohwacht gully', depth: 1.1, inland: { name: 'Hohwacht', x: 25, z: -85 } },
  { x: 205, name: 'Sehlendorfer Strand', depth: 1, inland: { name: 'Sehlendorf', x: 385, z: -75 } },
];
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world

const points: ControlPointDef[] = [
  { id: 'A', name: 'Landing area', ...W(-190, 750), owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the place behind once taken)
  { id: 'B', name: 'Binnensee spit', ...W(-265, shoreZ(-265) - 24), owner: null, sector: 'west', radius: 45, opens: 'E' },
  { id: 'C', name: 'Hohwacht gully', ...W(GULLY, shoreZ(GULLY) - 30), owner: null, sector: 'centre', radius: 45, opens: 'F' },
  { id: 'D', name: 'Sehlendorfer Strand', ...W(205, shoreZ(205) - 44), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Todendorf range', ...W(-400, -235), owner: null, sector: 'west' },
  { id: 'F', name: 'Hohwacht', ...W(25, -85), owner: null, sector: 'centre' },
  { id: 'G', name: 'Sehlendorf', ...W(385, -75), owner: null, sector: 'east' },
  { id: 'K', name: 'Lütjenburg', ...W(150, -700), owner: 'nato', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - F * z) < r); // (local x, z)

/** The beech woods: on the moraine, round Lütjenburg's rise, never on a road, a point or the shore. */
const woodsK = (x: number, z: number) => Math.max(smoothstep(160, 60, ridgeD(x, z)) * smoothstep(-0.2, 0.25, fbm(noise, x * 0.008 + 4, z * 0.008, 2)),
  smoothstep(0.25, 0.5, fbm(noise, x * 0.006 + 40, z * 0.006, 2)) * 0.7) * smoothstep(shoreZ(x) - 90, shoreZ(x) - 140, z) * (lagoonD(x, z) > 1.3 ? 1 : 0);

export default {
  id: 'hohwacht',
  name: 'Hohwacht Bay',
  description: 'Holstein, 1985: the bay\'s arc, the Großer Binnensee behind its sand spit, Hohwacht on its clay cliff with one gully up, the Sehlendorfer Strand, the moraine ridge and the Knicks inland. The Warsaw Pact lands from the sea; the Bundeswehr holds the coast.',
  epochs: ['1985'],
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Bundeswehr', pact: 'Warsaw Pact' },
  armies: { nato: ['bw'], pact: ['nva', 'sov'] }, // (the Bundeswehr defends; the NVA and Soviet naval infantry land)
  conditions: { time: 'dawn', weather: 'overcast' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.45, // (vehicles: the cliff at Hohwacht is no way up but by the gully)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  river: sea,
  fields: createFields({ seed: 1985, cell: 70, weights: [0.4, 0.15, 0.3, 0.15] }),

  theme: {
    fogColor: 0xa6b0b4, fogDensity: 0.0006,
    skyTop: 0x6f8094, skyHorizon: 0xc8cccc, skyBottom: 0x828a8e,
    sunColor: 0xf2e8d6, sunIntensity: 1.6, sunDisk: 0.2,
    clouds: 0.7, cloudLight: 0xdadcd8, cloudDark: 0x8a9298,
    sunDir: [0.4, 0.5, -0.75],
    hemiSky: 0xc8d2d8, hemiGround: 0x4e5638, hemiIntensity: 1.3,
    rimColor: 0xd0d8dc, rimIntensity: 0.2,
    terrain: {
      grass: '#5a6c3c', grassAlt: '#4e6036', dryGrass: '#8e8a58', dirt: '#5c4e3c', rock: '#7a6a52',
      pasture: '#5c6c3c', ploughed: '#5a4834', stubble: '#90865a', meadow: '#68763e',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, sz = shoreZ(x);
        if (onRoad(x, z)) return [0x55555a, 0.9];                                          // asphalt
        if (lz > sz + 4) return [y > 0.3 ? 0xd8ccaa : 0xb0a486, 1];                          // the sand under the water
        const ld = lagoonD(x, lz);
        if (ld < 1.0) return [0x6a6a50, 1];                                                 // the lagoon's muddy bottom
        if (ld < 1.3) return [0x6a7448, 0.85];                                              // the reeds round the lagoons
        if (cliffK(x) > 0.3 && gullyK(x) < 0.5 && lz > sz - 34 && y > 2.5) return [0x8a7458, 0.9]; // the clay cliff's face
        if (lz > sz - 30) return [cliffK(x) > 0.5 ? 0xa89c86 : 0xddd0ae, 1];                 // the beach (shingle under the cliff)
        if (lz > sz - 52 && cliffK(x) < 0.5) return [0xc2b78c, 0.7];                        // the dunes, marram grass
        if (lz < -200 && x > 150 && lz > -620 && y < 3.2) return [0x5e7442, 0.6];          // the Kossau meadows, wet
        return null;                                                                       // the fields, the Knicks
      },
    },
  },

  bases: { nato: { x: 100, z: 840, entries: [-400, 10, 385] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the Pact lands: its roads are the beach sectors)
  maxStacks: 20,
  cameraStart: { nato: { x: 0, z: 0 }, pact: { x: -100, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what the Pact's land troops come in (systems/Landing.js): the naval infantry by hovercraft or Polnocny, vehicles by Frosch or Polnocny
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['frosch', 'polnocny'] },
    // what the landing may call in at sea: the Volksmarine's escorts (the Tarantul is the ptBoat slot)
    navy: ['parchim', 'osa', 'natya', 'ptBoat'],
    // the Bundesmarine's mine barrier across the bay, a lane left off each sector (dan buoys) for the sweepers to widen
    seaMines: { z: [500, 560], count: 60, lanes: SECTORS.map((s) => s.x), lane: 70, seed: 1985 },
    // the coastal missile battery inland: two launcher trucks that fire on the ships, then move (systems/Landing.js batteries)
    forts: [{ unit: 'coastMissile', ...W(-170, -380), facing: Math.PI }, { unit: 'coastMissile', ...W(300, -470), facing: Math.PI }],
    // prepared positions, no concrete: wire along the back of the sand, minefields, MG nests and trenches over each sector
    // (on the spit all squeezed in before the lagoon; at Hohwacht up on the cliff top either side of the gully)
    works: [
      ...Array.from({ length: 90 }, (_, i) => { const x = -490 + i * 11; return cliffK(x) > 0.5 && gullyK(x) < 0.3 ? null : { kind: 'wire', ...W(x, shoreZ(x) - (lagD(BIG, x, shoreZ(x) - 20) < 1.3 ? 14 : cliffK(x) > 0.3 ? 12 : 26)), yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 52 * s.depth) }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - (s.depth > 1 ? 44 : 48 * s.depth + 8)), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - (s.depth > 1 ? 40 : 44 * s.depth + 6)), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 22 * s.depth) }))),
    ],
    // the defence at dawn: Heimatschutz (the territorial army's reservists) over each sector and in the villages
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'Heimatschutzzug' },
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - (s.depth > 1 ? 44 : 44 * s.depth + 6)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the armoured counter-attack: the division's reserve, down from Lütjenburg after four and a half minutes
    counter: { t: 220, units: ['heavyTank', 'ifv', 'heavyTank', 'ifv', 'heavyTank'], say: 'The division\'s reserve is coming up from Lütjenburg: Leopards and Marders, straight for the beachhead', sayOther: 'Enemy armour coming down from Lütjenburg: Leopard 2s and Marders' },
    // the landing's AI (ai/LandingDirector.js): the naval infantry's buying order, two Parchims inshore off the focus sector
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'pt76', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'parchim', gunships: 1, sweeper: 'natya', heavy: null, inshore: 380 },
    // no concrete to hold the beach: a poorer landing, a richer defence than Omaha's (modes/landing.js economy)
    economy: { reserves: 1400, perSector: 400, beachIncome: 0.55, defenceCp: 1700, defenceIncome: 3 },
    // the amphibious vehicles swim in on their own, put in off the beach: BMPs, BTRs and BRDMs, the PT-76s
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon', pt76: 'swimPT76' },
    // the first wave at dawn, in to all three sectors at once
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'pt76', sector: 2 }, { unit: 'tank', sector: 2 }, { unit: 'ifv', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985);
    sea.build(scene, terrain);
    const free = (x: number, z: number, rr: number) => roadD(x, z) > 6 + rr && !nearPoint(x, z, 16 + rr) && lagoonD(x, z) > 1.35 && z < shoreZ(x) - 40 - rr;

    // ---- Hohwacht on the cliff top: holiday flats and old fishermen's houses, a church
    for (let i = 0; i < 40; i++) {
      const x = -60 + r() * 210, z = shoreZ(x) - 50 - r() * 170;
      if (!free(x, z, 5)) continue;
      const big = r() < 0.3;
      props.townHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: big ? 16 : 8 + r() * 3, depth: big ? 10 : 8 + r() * 2, storeys: big ? 4 : 2, name: big ? 'holiday flats' : 'house', damaged: 0 });
    }
    props.church(W(-40, -40));
    // the campsites behind the Sehlendorfer Strand: caravans and tents in rows
    for (const cx of [130, 245]) for (let i = 0; i < 18; i++) {
      const x = cx + (i % 6) * 13 + (r() - 0.5) * 3, z = shoreZ(cx) - 70 - Math.floor(i / 6) * 12;
      if (!free(x, z, 2)) continue;
      const w = W(x, z);
      if (r() < 0.6) props.box('plain', w.x, terrain.heightAt(w.x, w.z) + 1.2, w.z, 2.3, 2.3, 6, r() * 0.3, r() < 0.5 ? 0xe8e4d8 : 0xc8c0a8); // a caravan
      else props.tent({ ...w, yaw: r() * 3, color: [0x5a7a9a, 0xb86a3a, 0x6a8a4a][Math.floor(r() * 3)] });
    }
    // ---- the Todendorf range: the firing line's sheds, the radar mast, gun pits facing the sea
    for (const [x, z, w] of [[-430, -280, 30], [-360, -300, 22], [-450, -190, 18]] as [number, number, number][]) if (free(x, z, 10)) props.hall({ ...W(x, z), yaw: 0, width: w, depth: 12, height: 5, color: 0x7a7e6a, roof: 0x4a4e44, door: 6, name: 'range building' });
    props.mast({ ...W(-330, -270), height: 24 });
    for (const x of [-470, -430, -390, -350]) props.sandbagRing({ ...W(x, -150), radius: 4.5, toward: -F });
    // ---- Sehlendorf at the lagoon's end, the farms on the moraine, Lütjenburg
    for (const [cx, cz, n, spread] of [[385, -75, 12, 50], [-230, -380, 6, 40], [60, -360, 6, 40], [150, -700, 22, 90]] as [number, number, number, number][]) {
      for (let i = 0, k = 0; i < n * 3 && k < n; i++) {
        const a = r() * Math.PI * 2, dd = 26 + r() * spread, x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (!free(x, z, 6) || Math.abs(x) > 480) continue;
        k++;
        if (k % 3 === 0) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, a + Math.PI / 2);
        else props.townHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: 2, name: 'house', damaged: 0 });
      }
    }
    props.church(W(190, -660));
    props.tower({ ...W(260, -760), concrete: false }); // the Hessenstein tower on its rise
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const land = (x: number, z: number) => F * z < shoreZ(x) - 60 && lagoonD(x, F * z) > 1.3;
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 16 })), { test: (x: number, z: number) => roadC(x, z) < 6 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 2600, broadleaf: 0.9, autumn: 0.25, maxY: 80,
      avoid: [...avoid, { test: (x: number, z: number) => !land(x, z) }],
      forest: (x: number, z: number) => woodsK(x, F * z) * 0.9 }); // the beech woods
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, count: 14000, lane: 0,
      avoid: [...avoid, { test: (x: number, z: number) => !land(x, z) }] }); // the Knicks
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => F * z > shoreZ(x) - 30 || lagoonD(x, F * z) < 1 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); hedges.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
