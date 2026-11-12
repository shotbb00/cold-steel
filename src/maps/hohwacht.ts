// Hohwacht Bay, Holstein, 1985 (coastal: the Warsaw Pact lands, the Bundeswehr holds; 1.0 × 1.8 km). The
// Volksmarine's and the Polish sea-landing division's real objective: a long sandy bay on the West German
// Baltic coast. Out at sea the Pact's landing ships and the mine barrier off the beach; then a narrow beach
// with hardly any tide (the Baltic), low dunes and the campsites behind them. In the west the steep clay cliff
// (Steilküste) at Hohwacht with the village on top of it; in the east the Sehlendorfer Binnensee, a reedy lagoon
// behind the dunes, and Sehlendorf at its end. Inland the rolling Holstein farmland boxed in by Knicks (the
// hedge banks), beech woods, and Lütjenburg on its hill with the Hessenstein tower.
// Laid out like Omaha in a frame with the sea toward +z (`L`), then turned round: the Pact's side is -z, so the
// sea is there (the landing comes from its base out at sea: systems/Landing.js lands()).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_09);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a5a62 }); // (the western Baltic: grey-green, brackish)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** The waterline along the bay (local z): the beach a little over a hundred metres from the middle of the map. */
const shoreZ = (x: number) => 160 + fbm(noise, x * 0.003, 2.1, 2) * 18;
/** The cliff at Hohwacht (west): how much of it there is at x (1 under the village, gone east of the lagoon's mouth). */
const cliffK = (x: number) => smoothstep(-80, -220, x);
/** The lagoon behind the dunes (east): its middle and its reach. */
const LAGOON = { x: 230, z: 70, rx: 170, rz: 45 };
const lagoonD = (x: number, z: number) => Math.hypot((x - LAGOON.x) / LAGOON.rx, (z - LAGOON.z) / LAGOON.rz);

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  if (d > 0) { // the bottom: a sandbar or two close in, then shelving away (the landing ships' water a couple of hundred metres out)
    let h = 0.6 - d * 0.014 - Math.max(0, d - 140) * 0.045 + Math.sin(d * 0.06 + x * 0.003) * 0.3 * smoothstep(20, 60, d) * smoothstep(140, 100, d);
    return Math.max(h, -18);
  }
  const back = -d; // m inland of the waterline
  // the beach (30–40 m of sand), the dunes (low ridges, 3–5 m), then the land behind: 6–10 m and rolling, rising inland
  const beach = 0.6 + back * 0.04;
  const dune = 3.2 * Math.exp(-(((back - 48) / 12) ** 2)) * (0.8 + 0.4 * fbm(noise, x * 0.02, 3.3, 2));
  let land = 4 + smoothstep(40, 140, back) * 5 + Math.max(0, back - 140) * 0.025 + fbm(noise, x * 0.004, z * 0.004, 3) * 6;
  // Lütjenburg's hill (the Hessenstein) far inland, to the east
  land += 22 * Math.max(0, 1 - Math.hypot(x - 260, z + 640) / 260) ** 1.5;
  let h = Math.max(beach + dune * smoothstep(20, 40, back), Math.min(land, beach + back * 0.25));
  // the cliff at Hohwacht: the land 18 m up straight behind a narrow beach
  const ck = cliffK(x);
  if (ck > 0) {
    const top = 19 + fbm(noise, x * 0.01, 7.1, 2) * 3 + Math.max(0, back - 80) * 0.02;
    const face = smoothstep(26, 46, back); // (the face: steep — no vehicle climbs it, men slowly)
    h = h + (Math.max(h, beach + (top - beach) * face) - h) * ck;
  }
  // the lagoon: a sheet of shallow water behind the dunes, reeds round it
  const ld = lagoonD(x, z);
  if (ld < 1.4) h = h + (-1.2 + ld * 1.5 - h) * smoothstep(1.4, 0.8, ld);
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** Lanes and roads (local frame): the coast road behind the dunes, a road up through Hohwacht, the road inland to Lütjenburg. */
function onRoadL(x: number, z: number) {
  const sz = shoreZ(x);
  if (z < sz - 70 && z > sz - 90 + Math.sin(x * 0.01) * 4 && lagoonD(x, z) > 1.25 && cliffK(x) < 0.4) return true;    // the coast road
  if (Math.abs(x - (-300 + Math.sin(z * 0.012) * 18)) < 3.5 && z < sz - 30 && z > -650) return true;                    // through Hohwacht, inland
  if (Math.abs(x - (40 + Math.sin(z * 0.009) * 30)) < 3.5 && z < sz - 80 && z > -650) return true;                      // the middle road, to Lütjenburg
  if (Math.abs(z - (-560 + Math.sin(x * 0.006) * 30)) < 3.5) return true;                                               // across, at Lütjenburg
  return false;
}
const onRoad = (x: number, z: number) => onRoadL(x, F * z);

/** The beach sectors (x) and the villages up behind them (local z). */
export const SECTORS = [
  { x: -320, name: 'Hohwacht', inland: { name: 'Hohwacht', x: -320, z: -60 } },
  { x: 20, name: 'Seestrand', inland: { name: 'Neudorf', x: 30, z: -240 } },
  { x: 330, name: 'Sehlendorf', inland: { name: 'Sehlendorf', x: 360, z: -90 } },
];
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world

const points: ControlPointDef[] = [
  { id: 'A', name: 'Landing area', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the village behind once taken)
  // (each out to the dunes or the cliff path: the trenches over the beach are in it — take them to take the sector)
  { id: 'B', name: 'Hohwacht beach', ...W(-320, shoreZ(-320) - 40), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Seestrand', ...W(20, shoreZ(20) - 44), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Sehlendorf beach', ...W(330, shoreZ(330) - 44), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Hohwacht', ...W(-320, -60), owner: null, sector: 'west' },
  { id: 'F', name: 'Neudorf', ...W(30, -240), owner: null, sector: 'centre' },
  { id: 'G', name: 'Sehlendorf', ...W(360, -90), owner: null, sector: 'east' },
  { id: 'K', name: 'Lütjenburg', ...W(200, -640), owner: 'nato', sector: 'centre' },
];

export default {
  id: 'hohwacht',
  name: 'Hohwacht Bay',
  description: 'Holstein, 1985: a sandy Baltic bay, the clay cliff at Hohwacht, the lagoon behind the dunes, the Knicks and woods inland. The Warsaw Pact lands from the sea; the Bundeswehr holds the coast.',
  epochs: ['1985'],
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Bundeswehr', pact: 'Warsaw Pact' },
  armies: { nato: ['bw'], pact: ['nva', 'sov'] }, // (the Bundeswehr defends; the NVA and Soviet naval infantry land)
  conditions: { time: 'dawn', weather: 'overcast' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.45, // (vehicles: the cliff at Hohwacht is no way up)
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
        if (onRoadL(x, lz)) return [0x55555a, 0.9];                                        // asphalt
        if (lz > sz + 4) return [y > 0.3 ? 0xd8ccaa : 0xb0a486, 1];                          // the sand under the water
        if (lz > sz - 34) return [0xddd0ae, 1];                                             // the beach
        if (lz > sz - 62 && cliffK(x) < 0.5) return [0xc2b78c, 0.7];                        // the dunes, marram grass
        if (cliffK(x) > 0.3 && lz > sz - 52 && y > 3) return [0x8a7458, 0.85];              // the clay cliff's face
        if (lagoonD(x, lz) < 1.25) return [0x6a7448, 0.8];                                  // the reeds round the lagoon
        return null;                                                                       // the fields, the Knicks
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-200, 40, 260] }, pact: { x: 0, z: -830, entries: [-320, 20, 330] } }, // (the Pact lands: its roads are the beach sectors)
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what the Pact's land troops come in (systems/Landing.js): the naval infantry by hovercraft or Polnocny, vehicles by Frosch or Polnocny
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['frosch', 'polnocny'] },
    // what the landing may call in at sea: the Volksmarine's escorts (the Tarantul is the ptBoat slot)
    navy: ['parchim', 'osa', 'natya', 'ptBoat'],
    // the Bundesmarine's mine barrier across the bay, a lane left off each sector (dan buoys) for the sweepers to widen
    seaMines: { z: [520, 580], count: 60, lanes: [-320, 20, 330], lane: 80, seed: 1985 },
    // the coastal missile battery inland: two launcher trucks that fire on the ships, then move (systems/Landing.js batteries)
    forts: [{ unit: 'coastMissile', ...W(-150, -300), facing: Math.PI }, { unit: 'coastMissile', ...W(200, -420), facing: Math.PI }],
    // prepared positions, no concrete: wire along the back of the beach, minefields and trenches on the dunes over each sector
    works: [
      ...Array.from({ length: 90 }, (_, i) => { const x = -490 + i * 11; return { kind: 'wire', ...W(x, shoreZ(x) - (cliffK(x) > 0.3 ? 18 : 30)), yaw: 0 }; }),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - (cliffK(s.x) > 0.3 ? 40 : 64)) }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - (cliffK(s.x) > 0.3 ? 58 : 52)), yaw: 0 }))),
    ],
    // the defence at dawn: Heimatschutz (the territorial army's reservists) in the trenches over each sector and in the villages
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'Heimatschutzzug' },
    hold: [...SECTORS.flatMap((s) => [-45, 45].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - 56))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the armoured counter-attack: the division's reserve, down from inland after four and a half minutes
    counter: { t: 270, units: ['heavyTank', 'ifv', 'heavyTank', 'ifv', 'heavyTank'], say: 'The division\'s reserve is coming up: Leopards and Marders, straight for the beachhead', sayOther: 'Enemy armour coming down from inland: Leopard 2s and Marders' },
    // the landing's AI (ai/LandingDirector.js): the naval infantry's buying order, two Parchims inshore off the focus sector
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'pt76', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'parchim', gunships: 1, heavy: null, inshore: 380 },
    // no concrete to hold the beach: a poorer landing, a richer defence than Omaha's (modes/landing.js economy)
    economy: { reserves: 1800, perSector: 500, beachIncome: 0.6, defenceCp: 1000, defenceIncome: 2 },
    // the amphibious vehicles swim in on their own, put in off the beach: BMPs, BTRs and BRDMs, the PT-76s
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon', pt76: 'swimPT76' },
    // the first wave at dawn, in to all three sectors at once
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'pt76', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 }, { unit: 'ifv', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985);
    sea.build(scene, terrain);

    // ---- Hohwacht on the cliff top: holiday flats and old fishermen's houses, a church; a stair down the cliff
    for (let i = 0; i < 16; i++) {
      const x = -420 + r() * 220, z = -40 - r() * 90;
      if (onRoadL(x, z)) continue;
      props.townHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 4, depth: 8 + r() * 3, storeys: r() < 0.4 ? 3 : 2, name: 'holiday flats', damaged: 0 });
    }
    props.church(W(-260, -120));
    // the campsites behind the dunes: caravans and tents in rows
    for (const cx of [-90, 120]) for (let i = 0; i < 18; i++) {
      const x = cx + (i % 6) * 14 + (r() - 0.5) * 3, z = shoreZ(cx) - 95 - Math.floor(i / 6) * 12;
      if (lagoonD(x, z) < 1.3 || onRoadL(x, z)) continue;
      if (r() < 0.6) props.box('plain', W(x, z).x, terrain.heightAt(W(x, z).x, W(x, z).z) + 1.2, W(x, z).z, 2.3, 2.3, 6, r() * 0.3, r() < 0.5 ? 0xe8e4d8 : 0xc8c0a8); // a caravan
      else props.tent({ ...W(x, z), yaw: r() * 3, color: [0x5a7a9a, 0xb86a3a, 0x6a8a4a][Math.floor(r() * 3)] });
    }
    // Sehlendorf at the lagoon's end, Neudorf inland: brick farms and houses
    for (const [cx, cz, n] of [[360, -90, 9], [30, -240, 10], [200, -640, 16]] as [number, number, number][]) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r() * 0.4, dd = 30 + r() * (n > 12 ? 70 : 34);
        const x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (onRoadL(x, z) || lagoonD(x, z) < 1.2) continue;
        if (i % 3 === 0) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, a + Math.PI / 2);
        else props.townHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: 2, name: 'house', damaged: 0 });
      }
    }
    props.church(W(220, -600));
    props.tower({ ...W(270, -660), concrete: false }); // the Hessenstein tower on its hill
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const land = (x: number, z: number) => F * z < shoreZ(x) - 70 && lagoonD(x, F * z) > 1.3;
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => onRoad(x, z) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1400, broadleaf: 0.9, autumn: 0.25, maxY: 80,
      avoid: [...avoid, { test: (x: number, z: number) => !land(x, z) }],
      forest: (x: number, z: number) => smoothstep(0.2, 0.5, fbm(noise, x * 0.006 + 4, z * 0.006, 2)) * 0.85 }); // the beech woods
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, count: 16000, lane: 0,
      avoid: [...avoid, { test: (x: number, z: number) => !land(x, z) }] }); // the Knicks
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => F * z > shoreZ(x) - 30 || lagoonD(x, F * z) < 1 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); hedges.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
