// Trieste, 3 November 1918 (coastal, the 1918 epoch: Italy lands, Austria-Hungary holds; 1.2 × 1.8 km).
// The Dual Monarchy was falling apart — the armistice of Villa Giusti was signed that afternoon — when the destroyer
// Audace led a little Italian squadron into the harbour of Trieste and went alongside the Molo San Carlo in front of
// the Piazza Grande; General Petitti di Roreto stepped ashore and the Bersaglieri landed behind him on the mole that
// has been called Molo Audace ever since. Here it is played as the landing it might have been: an opposed one.
// The ground, compressed: the city faces west over the gulf (the sea is toward +z, the north is −x). Along the
// waterfront the Rive, the stone quays, with their moles: in the north the Porto Vecchio — Molo III and Molo IV, the
// long stone warehouses, hydraulic cranes and the railway along the quays up to the Südbahn station; the Canal
// Grande cut into the Borgo Teresiano with Sant’Antonio at its head and the Ponte Rosso across it; the Molo San
// Carlo in front of the Piazza dell’Unità (the Municipio at its back, the palaces of the Governo and the Lloyd on its
// sides); the Molo Bersaglieri with the Stazione Marittima; in the south the Sacchetta and the long Molo Fratelli
// Bandiera with the Lanterna, the old lighthouse, at its head. Behind the old town San Giusto’s hill: the castle and
// the cathedral over the roofs. Beyond the city the karst edge (the Carso) climbs steeply onto the plateau, where
// the Strada Nuova and the other roads come up in hairpins to Opicina; north along the shore the coast road and the
// railway run past Barcola to Miramare, Maximilian’s white castle on its promontory at the edge of the map.
// The landing (systems/Landing.js `wall`): the boats come alongside the quay walls and the moles, as Audace did.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { graded } from './greatWarHelpers.ts';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2200;
const BOUNDS = { x: 600, z: 900 };
const SEED = 1918_1103;
const noise = createNoise2D(SEED);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a5a62 }); // (the Gulf of Trieste on a grey November afternoon)
const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

/** The quay face (the Rive) along the whole city; north of the Porto Vecchio the natural shore bends out toward Miramare. */
const QUAY = 380;
const DECK = 3; // (the quays and moles: clear of the swell)
const shoreZ = (x: number) => QUAY + 40 * smoothstep(-480, -600, x) + 130 * bell(x, -548, 34) + fbm(noise, x * 0.01, 4.2, 2) * 6 * smoothstep(-470, -500, x);
/** The moles out from the quay (centre x, half-width, length). */
const MOLES = [
  { x: -430, half: 24, len: 150, name: 'Molo III' },
  { x: -235, half: 24, len: 150, name: 'Molo IV' },
  { x: 0, half: 13, len: 170, name: 'Molo San Carlo' },
  { x: 140, half: 24, len: 120, name: 'Molo Bersaglieri' },
  { x: 370, half: 10, len: 190, name: 'Molo Fratelli Bandiera' },
];
const LANTERNA = { x: 370, z: QUAY + 180 };
/** The Canal Grande: between x CANAL[0] and CANAL[1], from the quay CANAL_LEN m in; bridged at the Riva and at the Ponte Rosso. */
const CANAL = [-119, -101];
const CANAL_LEN = 220;
const BRIDGES = [[3, 15], [112, 124]]; // (back from the quay)

const moleAt = (x: number, z: number) => MOLES.find((m) => Math.abs(x - m.x) <= m.half && z >= QUAY - 1 && z <= QUAY + m.len);

/** The quay walls the boats come alongside: [ax, az, bx, bz, nx, nz, half] — mole heads and sides, and the quay between them. */
const FACES: number[][] = [];
for (const m of MOLES) {
  const h = QUAY + m.len, l = m.x - m.half, r = m.x + m.half;
  FACES.push([l, h, r, h, 0, 1, 16], [l, QUAY, l, h, -1, 0, m.half], [r, QUAY, r, h, 1, 0, m.half]);
}
{
  const cuts = [...MOLES.map((m) => [m.x - m.half, m.x + m.half]), CANAL].sort((a, b) => a[0] - b[0]);
  let x0 = -470;
  for (const [a, b] of cuts) { if (a > x0) FACES.push([x0, QUAY, a, QUAY, 0, 1, 16]); x0 = b; }
  FACES.push([x0, QUAY, 600, QUAY, 0, 1, 16]);
}
/** The nearest quay wall (systems/Landing.js `alongside`): its face (half-way down the grid’s last cell) and the normal out to sea. */
function wall(x: number, z: number) {
  let best: any = null;
  for (const [ax, az, bx, bz, nx, nz, half] of FACES) {
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) best = { x: px + nx * 1.2, z: pz + nz * 1.2, nx, nz, d, half };
  }
  return best;
}

/** How far back from the quay the karst edge begins (closer to the sea behind the Porto Vecchio and Barcola). */
const edgeBack = (x: number) => 440 - 170 * smoothstep(-250, -560, x) + 40 * smoothstep(150, 450, x);
const SAN_GIUSTO = { x: 200, z: QUAY - 300 };

/** The land before the roads, the canal and the sea are cut in, sampled once (its noise is too dear for every vertex). */
const EXT = { x: 610, z: 910 };
const land = gridCacheSmooth((x: number, z: number) => {
  const back = shoreZ(x) - z;
  const nat = smoothstep(-470, -510, x); // (1: the natural shore toward Miramare)
  let h = DECK + Math.max(0, back - 25) * 0.01;
  h = h * (1 - nat) + nat * (0.5 + Math.min(back, 25) * 0.1 + Math.max(0, back - 25) * 0.015 + 5 * bell(x, -548, 40) * smoothstep(0, 30, back));
  const eb = edgeBack(x), pk = smoothstep(eb, eb + 200, back);
  h += 88 * pk + Math.max(0, back - eb - 200) * 0.012;                                                  // the Carso’s edge and the plateau
  h += (ridged(noise, x * 0.012 + 3, z * 0.012, 3) * 6 + fbm(noise, x * 0.05, z * 0.05, 2) * 0.8) * pk; // limestone ribs and dolines up there
  h += fbm(noise, x * 0.006, z * 0.006, 2) * 4 * smoothstep(80, 260, back);                            // the city’s rises (none on the waterfront)
  h += 38 * smoothstep(170, 30, Math.hypot((x - SAN_GIUSTO.x) / 1.2, z - SAN_GIUSTO.z));                 // San Giusto’s hill, its top levelled for the castle
  return h;
}, EXT, 2.5);

/** The roads up the karst edge, graded (hairpins): the road from the station, the Strada Nuova per Opicina, the road behind San Giusto. */
const ROADS = [
  [[-340, QUAY - 210], [-390, QUAY - 330], [-250, QUAY - 420], [-360, QUAY - 520], [-260, QUAY - 640], [-300, -860]],
  [[10, QUAY - 150], [60, QUAY - 400], [-130, QUAY - 500], [70, QUAY - 600], [-80, QUAY - 700], [0, -860]],
  [[310, QUAY - 20], [300, QUAY - 180], [SAN_GIUSTO.x, SAN_GIUSTO.z], [340, QUAY - 470], [210, QUAY - 590], [340, QUAY - 710], [300, -860]],
];
// (worked out on first use, not at import: every map is imported at start, and this samples a cached grid)
let ROAD_H_: number[][] | undefined;
const roadH = () => (ROAD_H_ ??= ROADS.map((r) => r.map(([x, z]) => land(x, z))));
const roadD = (x: number, z: number) => {
  let best = { d: Infinity, h: 0 };
  ROADS.forEach((r, i) => { const g = graded(r, roadH()[i], x, z); if (g.d < best.d) best = g; });
  return best;
};
const inCanal = (x: number, z: number) => x > CANAL[0] && x < CANAL[1] && QUAY - z >= 0 && QUAY - z < CANAL_LEN;

function height(x: number, z: number) {
  if (moleAt(x, z)) return DECK;
  const sz = shoreZ(x), d = z - sz;
  if (d > 0) { // the harbour: deep water right up to the quays (the ships lie alongside), shelving on the natural shore
    const nat = smoothstep(-470, -500, x);
    return Math.max(-18, (-9 - d * 0.012) * (1 - nat) + (-0.6 - d * 0.09) * nat) + fbm(noise, x * 0.01, z * 0.01, 2) * 0.4;
  }
  if (inCanal(x, z)) { const b = sz - z; return BRIDGES.some(([a, c]) => b >= a && b <= c) ? DECK : -3.5; }
  let h = land(x, z);
  const g = roadD(x, z);
  if (g.d < 12) h += (g.h - h) * smoothstep(12, 5, g.d);
  return h;
}

/** The Riva along the quay and the coast road on to Miramare. */
const onRiva = (x: number, z: number) => { const b = shoreZ(x) - z; return b > 3 && b < 20; };
const onRoad = (x: number, z: number) => onRiva(x, z) || roadD(x, z).d < 4.5;
const PIAZZA = { x0: -50, x1: 70, b0: 22, b1: 150 };
const inPiazza = (x: number, z: number) => { const b = QUAY - z; return x > PIAZZA.x0 && x < PIAZZA.x1 && b > PIAZZA.b0 && b < PIAZZA.b1; };
const inCity = (x: number, z: number) => { const b = shoreZ(x) - z; return x > -480 && b > 0 && b < edgeBack(x) - 10; };

/** The landing’s three ways in (x) and what each opens ashore. */
export const SECTORS = [
  { x: -330, name: 'Porto Vecchio', inland: { x: -340, z: QUAY - 210 } },
  { x: 0, name: 'Molo San Carlo', inland: { x: 10, z: QUAY - 80 } },
  { x: 290, name: 'La Lanterna', inland: { x: SAN_GIUSTO.x, z: SAN_GIUSTO.z } },
];

const points: (ControlPointDef & { opens?: string })[] = [
  { id: 'A', name: 'The Italian squadron', x: 0, z: 820, owner: 'nato', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Porto Vecchio', x: -330, z: QUAY - 22, owner: null, sector: 'west', radius: 34, opens: 'E' },
  { id: 'C', name: 'Molo San Carlo', x: 0, z: QUAY + 80, owner: null, sector: 'centre', radius: 26, opens: 'F' },
  { id: 'D', name: 'La Lanterna', x: 300, z: QUAY - 22, owner: null, sector: 'east', radius: 34, opens: 'G' },
  { id: 'E', name: 'Stazione Meridionale', ...SECTORS[0].inland, owner: null, sector: 'west', radius: 40 },
  { id: 'F', name: 'Piazza dell’Unità', ...SECTORS[1].inland, owner: null, sector: 'centre', radius: 40 },
  { id: 'G', name: 'San Giusto', ...SECTORS[2].inland, owner: null, sector: 'east', radius: 36 },
  { id: 'K', name: 'Opicina', x: 0, z: -800, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'trieste-1918',
  name: 'Trieste 1918',
  description: 'Trieste, 3 November 1918: the destroyer Audace leads the Italian ships into the harbour to land Bersaglieri on the Molo San Carlo as Austria-Hungary collapses. The moles and quays of the Porto Vecchio, the Piazza dell’Unità facing the sea, the Canal Grande, the Lanterna, San Giusto’s castle on its hill and the steep karst edge behind the city.',
  epochs: ['1918'],
  region: 'italy',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Italy', pact: 'Austria-Hungary' },
  armies: { nato: ['it'], pact: ['ah'] },
  airfields: [], // (systems/Airfields.js: a city, its quays and the karst — the squadrons fly from Venice and Prosecco)
  conditions: { time: 'day', weather: 'overcast' },
  size: SIZE,
  segments: 900,
  bounds: BOUNDS,
  navCell: 1.5,
  steep: 0.5, // (the karst edge: men scramble up it, wheels take the hairpin roads)
  camera: { maxHeight: 1000, near: 1, far: 7000 },
  seed: SEED,
  height,
  river: sea,
  fields: createFields({ seed: SEED, cell: 70, weights: [0.6, 0.05, 0.1, 0.25] as any }),

  theme: {
    // a grey afternoon in early November: low cloud over the karst, a flat light on the sea
    fogColor: 0xa8adb0, fogDensity: 0.0006, skyTop: 0x6a7684, skyHorizon: 0xc0c4c4, skyBottom: 0x8a9090,
    sunColor: 0xf0e4d0, sunIntensity: 1.6, sunDisk: 0.15, clouds: 0.6, cloudLight: 0xd4d6d8, cloudDark: 0x7a8088,
    sunDir: [0.35, 0.45, 0.8], hemiSky: 0xc8d0d8, hemiGround: 0x7a7462, hemiIntensity: 1.35, rimColor: 0xd8dce0, rimIntensity: 0.2,
    terrain: {
      grass: '#6a6c48', grassAlt: '#62663e', dryGrass: '#8e865a', dirt: '#7a6c54', rock: '#8a8670',
      pasture: '#6e7246', ploughed: '#7a6650', stubble: '#9a8c60', meadow: '#727a4a',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (moleAt(x, z)) return [0x9e9a8e, 1];                                                    // the moles’ Istrian stone
        const sz = shoreZ(x);
        if (z > sz + 1 || inCanal(x, z) && y < 1) return [y > -2 ? 0x8a8676 : 0x4e5a58, 1];        // under the water
        if (inPiazza(x, z)) return [0xc0b8a6, 1];                                                    // the piazza’s pale paving
        if (onRiva(x, z) || (x > -480 && sz - z < 26)) return [0x8e8a80, 1];                       // the quays and the Riva
        if (roadD(x, z).d < 4) return [0x8a8274, 0.9];                                               // the roads up the karst
        if (inCity(x, z)) return [0x9a9488, 0.85];                                                   // the city’s streets and yards
        const g = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
        if (g > 0.45) return [0xb0aa98, Math.min(0.9, (g - 0.45) * 3)];                             // the karst edge’s bare limestone
        if (sz - z < 25) return [0xa8a294, 0.95];                                                    // the rocks along the shore toward Miramare
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 870, entries: SECTORS.map((s) => s.x) }, pact: { x: 0, z: -860, entries: [-300, 0, 300] } }, // (Italy lands: its ways in are the quays)
  maxStacks: 24,
  cameraStart: { nato: { x: 0, z: 640 }, pact: { x: 40, z: 160 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'nato',
    wall,
    // the Italian army has no landing boats of its own (data/units1918/ships.js): the side’s motor launches and ferries stand in for
    // the destroyers’ boats and the steamers that brought the Bersaglieri and the Carabinieri
    craft: { infantry: ['ml', 'ml', 'ferry'], vehicle: 'ferry' },
    launchZ: 820,
    signal: { t: 15, say: 'Audace is going in to the Molo San Carlo — Bersaglieri, stand by to land', sayOther: 'Italian destroyers in the harbour — they are making for the Molo San Carlo!' },
    // the Regia Marina: the destroyers (Audace, Ardito, Fuciliere), an esploratore, the MAS boats
    navy: ['destroyer', 'lightCruiser', 'ptBoat'],
    // the harbour’s guns: the battery by the Lanterna over the harbour mouth, the heavy guns up on the karst edge
    forts: [
      { unit: 'moleBattery', x: LANTERNA.x, z: LANTERNA.z - 40, facing: 0 },
      { unit: 'coastBattery', x: -250, z: QUAY - 590, facing: 0 },
      { unit: 'coastBattery', x: 460, z: QUAY - 520, facing: 0 },
    ],
    names: { moleBattery: 'Hafenbatterie', coastBattery: 'Küstenbatterie' },
    // the harbour defences: wire across the Molo San Carlo and along the Rive, MG posts in front of the Piazza, trenches on San Giusto
    works: [
      ...[-10, -3, 4, 11].map((o) => ({ kind: 'wire', x: o, z: QUAY + 40, yaw: 0 })),
      { kind: 'mgNest', x: -24, z: QUAY - 26, yaw: 0 }, { kind: 'mgNest', x: 40, z: QUAY - 26, yaw: 0 },
      { kind: 'mgNest', x: -300, z: QUAY - 40, yaw: 0 }, { kind: 'mgNest', x: -360, z: QUAY - 40, yaw: 0 },
      { kind: 'mgNest', x: 270, z: QUAY - 36, yaw: 0 }, { kind: 'mgNest', x: 330, z: QUAY - 36, yaw: 0 },
      ...[-380, -362, -298, -280, -40, -22, 40, 58, 252, 270, 330, 348].map((x) => ({ kind: 'wire', x, z: QUAY - 14, yaw: 0 })), // (gaps for the streets)
      ...[-30, -10, 10, 30].map((dx) => ({ kind: 'trench', x: SAN_GIUSTO.x + dx, z: SAN_GIUSTO.z + 34, yaw: 0 })),
    ],
    // the garrison: k.u.k. infantry and the Landsturm, the harbour’s MGs, a field battery on San Giusto
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'sniper', 'rifles', 'mortar', 'rifles', 'artillery'],
    hold: [...points.filter((p) => p.opens).map((p) => ({ x: p.x, z: p.z < QUAY ? p.z - 10 : QUAY - 20 })), ...SECTORS.map((s) => s.inland)],
    counter: { t: 300, units: ['stormTroops', 'rifles', 'mgTeam', 'rifles', 'mountainGun'], say: 'The Sturmbataillon is coming down from Opicina to throw them back into the sea', sayOther: 'Austrian storm troops coming down the Strada Nuova from Opicina!' },
    ai: { order: ['rifles', 'stormTroops', 'mgTeam', 'rifles', 'mortar', 'rifles', 'sniper', 'mgTeam', 'stormTroops', 'rifles', 'reconVehicle', 'rifles'], gunship: 'destroyer', gunships: 1, heavy: 'lightCruiser', inshore: 420 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 800, defenceIncome: 1.4 },
    waves: [
      // Audace’s Bersaglieri onto the Molo San Carlo; the other ships’ parties onto the Porto Vecchio and the Sacchetta
      { t: 0, units: [
        { unit: 'rifles', sector: 1, craft: 'ferry', dx: 0, name: 'Bersaglieri (Audace)' }, { unit: 'rifles', sector: 1, name: 'Bersaglieri I' }, { unit: 'mgTeam', sector: 1 },
        { unit: 'rifles', sector: 0, name: 'Bersaglieri II' }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 2, name: 'Bersaglieri III' },
      ] },
      { t: 150, say: 'The steamers are bringing in more Bersaglieri and the Carabinieri', units: [{ unit: 'rifles', sector: 0, name: 'Carabinieri' }, { unit: 'stormTroops', sector: 1 }, { unit: 'rifles', sector: 2, name: 'Bersaglieri IV' }] },
      { t: 330, say: 'A mountain battery and the Arditi are coming ashore', units: [{ unit: 'mountainGun', sector: 1 }, { unit: 'stormTroops', sector: 2 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(SEED);
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const STONE = 0xc4bca8, WARE = 0xb0a088, ROOF = 0x7a4a36, SLATE = 0x4a4c4e, IRON = 0x5a4a3e;
    const taken: number[][] = [];
    const free = (x: number, z: number, rad: number) => taken.every(([tx, tz, tr]) => Math.hypot(tx - x, tz - z) > tr + rad);
    const take = (x: number, z: number, rad: number) => taken.push([x, z, rad]);
    const nearPoint = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d + (p.radius ?? 30) * 0.6);
    const clear = (x: number, z: number, rad: number) => free(x, z, rad) && !nearPoint(x, z, rad) && !onRoad(x, z) && roadD(x, z).d > rad + 4 && !inPiazza(x, z) && !(x > CANAL[0] - rad - 3 && x < CANAL[1] + rad + 3 && QUAY - z < CANAL_LEN + rad);

    // ---- the Porto Vecchio: long stone warehouses on the moles and behind the quay, hydraulic cranes along the edges, the quay railway
    for (const m of MOLES.slice(0, 2)) {
      props.hall({ x: m.x, z: QUAY + m.len / 2 + 5, yaw: 0, width: m.half * 2 - 14, depth: m.len - 40, height: 13, color: WARE, roof: SLATE, door: 6, name: 'Magazzino' });
      take(m.x, QUAY + m.len / 2, m.half);
    }
    const crane = (x: number, z: number, yaw: number) => {
      const y = g(x, z), c = Math.cos(yaw), s = Math.sin(yaw);
      for (const [ax, az] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) props.box('metal', x + ax, y + 4, z + az, 0.5, 8, 0.5, 0, IRON);
      props.box('metal', x, y + 8.3, z, 5, 0.6, 5, 0, IRON);
      props.box('metal', x, y + 11, z, 1.6, 5, 1.6, 0, IRON);
      props.box('metal', x + s * 6, y + 13.5, z + c * 6, 0.7, 0.7, 14, yaw, IRON); // (the jib out over the water)
      cover.addCylinder({ x, z, radius: 1.2, height: 10 });
      take(x, z, 5);
    };
    for (const x of [-460, -405, -290, -270, -215]) crane(x, QUAY - 6, 0);
    for (const m of MOLES.slice(0, 2)) for (const s of [-1, 1]) for (const t of [40, 110]) crane(m.x + s * (m.half - 4), QUAY + t, s * Math.PI / 2);
    for (const [x, b] of [[-430, 70], [-430, 120], [-250, 70], [-250, 120], [-460, 175], [-270, 175]] as [number, number][]) {
      props.hall({ x, z: QUAY - b, yaw: 0, width: 46, depth: 26, height: 12, color: WARE, roof: SLATE, door: 6, name: 'Magazzino' });
      take(x, QUAY - b, 24);
    }
    props.rails({ x0: -470, z0: QUAY - 30, x1: -380, z1: QUAY - 30 });
    props.rails({ x0: -280, z0: QUAY - 30, x1: -205, z1: QUAY - 30 });
    for (const [x, z, yaw] of [[-445, QUAY - 30, Math.PI / 2], [-240, QUAY - 30, Math.PI / 2]] as [number, number, number][]) props.wagon({ x, z, yaw, kind: 'box' });
    // the Südbahn: the station, the line north along the shore past Barcola
    props.hall({ x: -340, z: QUAY - 268, yaw: 0, width: 80, depth: 26, height: 15, color: 0xc8b898, roof: SLATE, door: 10, name: 'Stazione Meridionale' });
    take(-340, QUAY - 268, 42);
    props.rails({ x0: -380, z0: QUAY - 240, x1: -470, z1: QUAY - 70 });
    props.rails({ x0: -470, z0: QUAY - 70, x1: -600, z1: shoreZ(-600) - 45 });
    props.wagon({ x: -520, z: shoreZ(-520) - 48, yaw: Math.atan2(-130, 15), kind: 'open' });

    // ---- the Canal Grande: its quays’ bollards, the Ponte Rosso’s parapets, Sant’Antonio Taumaturgo at its head
    for (const [a, c] of BRIDGES) for (const s of [-1, 1]) props.box('stone', (CANAL[0] + CANAL[1]) / 2, DECK + 0.5, QUAY - (a + c) / 2 + s * ((c - a) / 2 + 0.3), CANAL[1] - CANAL[0] + 4, 1, 0.5, 0, STONE);
    props.church({ x: -110, z: QUAY - CANAL_LEN - 24, yaw: Math.PI });
    for (let i = 0; i < 6; i++) props.column({ x: -122 + i * 4.8, z: QUAY - CANAL_LEN - 8, radius: 0.8, height: 11 }); // (its portico)
    take(-110, QUAY - CANAL_LEN - 24, 22);
    for (let b = 30; b < CANAL_LEN; b += 26) for (const x of [CANAL[0] - 2, CANAL[1] + 2]) props.column({ x, z: QUAY - b, radius: 0.3, height: 0.8 });

    // ---- the Piazza dell’Unità: the Municipio and its clock tower at the back, the palaces of the Governo and the Lloyd on its sides
    props.hall({ x: 10, z: QUAY - PIAZZA.b1 - 14, yaw: 0, width: 80, depth: 24, height: 18, color: 0xd8ccb2, roof: SLATE, door: 8, name: 'Palazzo del Municipio' });
    props.box('stone', 10, g(10, QUAY - PIAZZA.b1 - 4) + 25, QUAY - PIAZZA.b1 - 4, 7, 14, 7, 0, 0xd0c4aa);
    props.hall({ x: PIAZZA.x1 + 18, z: QUAY - 60, yaw: Math.PI / 2, width: 60, depth: 30, height: 18, color: 0xc8bca2, roof: SLATE, door: 6, name: 'Palazzo del Governo' });
    props.hall({ x: PIAZZA.x1 + 18, z: QUAY - 125, yaw: Math.PI / 2, width: 50, depth: 30, height: 18, color: 0xcab89a, roof: SLATE, door: 6, name: 'Palazzo Stratti' });
    props.hall({ x: PIAZZA.x0 - 22, z: QUAY - 70, yaw: Math.PI / 2, width: 70, depth: 32, height: 18, color: 0xc2b498, roof: SLATE, door: 6, name: 'Palazzo del Lloyd' });
    take(10, QUAY - PIAZZA.b1 - 14, 40); take(PIAZZA.x1 + 18, QUAY - 90, 40); take(PIAZZA.x0 - 22, QUAY - 70, 36);
    for (const x of [-40, 60]) for (const b of [40, 90, 140]) props.column({ x, z: QUAY - b, radius: 0.25, height: 4.5 }); // (gas lamps)
    // the Molo San Carlo: its bollards and the lamps along it
    for (let t = 20; t < 170; t += 18) for (const s of [-1, 1]) props.column({ x: s * 11.5, z: QUAY + t, radius: 0.35, height: 0.8 });
    // the Molo Bersaglieri and the Stazione Marittima
    props.hall({ x: 140, z: QUAY + 62, yaw: 0, width: 34, depth: 90, height: 14, color: 0xc4b89e, roof: SLATE, door: 8, name: 'Stazione Marittima' });
    take(140, QUAY + 62, 24);

    // ---- the Lanterna on the head of the Molo Fratelli Bandiera; the Sacchetta’s sheds
    props.column({ x: LANTERNA.x, z: LANTERNA.z, radius: 3.2, height: 33 });
    props.box('stone', LANTERNA.x, DECK + 34, LANTERNA.z, 5, 3, 5, 0, 0x6a6a64);
    props.box('stone', LANTERNA.x, DECK + 2, LANTERNA.z, 10, 4, 10, 0, STONE); // (the fort at its foot)
    for (const x of [410, 450, 500, 550]) { props.hall({ x, z: QUAY - 40, yaw: 0, width: 30, depth: 18, height: 7, color: 0x9a8a72, roof: ROOF, door: 6, name: 'shed' }); take(x, QUAY - 40, 16); }

    // ---- San Giusto: the castle on the hilltop, the cathedral beside it
    {
      const cx = SAN_GIUSTO.x + 10, cz = SAN_GIUSTO.z - 30;
      const b = props.beginBuilding('castle', cx, cz, 0.15, 34, 24);
      b.plaster = 0xa8a090;
      props.shell(b, { height: 9, key: 'stone', color: 0xa8a090, t: 1.4, bay: 3.5, sill: 4.5, head: 6, frame: 0x7a7468, front: [], back: [2] });
      props.piece('stone', b, 0, 9.3, 0, 34.6, 0.6, 24.6, 0x9a9282);
      props.endBuilding();
      for (const [dx, dz] of [[-19, -13], [19, 13]]) { const x = cx + dx, z = cz + dz; props.box('stone', x, g(x, z) + 6, z, 9, 12, 9, 0.15, 0x9e9686); cover.addBox({ x, z, yaw: 0.15, length: 9, thickness: 9, height: 12 }); } // (the bastions)
      props.church({ x: SAN_GIUSTO.x - 40, z: SAN_GIUSTO.z - 8, yaw: 0 });
      take(cx, cz, 26); take(SAN_GIUSTO.x - 40, SAN_GIUSTO.z - 8, 18);
    }

    // ---- the city: the Borgo Teresiano’s grid of blocks north of the canal, the old town’s lanes up San Giusto’s slopes
    for (let x = -300; x <= -140; x += 40) for (let b = 50; b <= 300; b += 40) {
      const z = QUAY - b;
      if (!clear(x, z, 15) || b > edgeBack(x) - 30) continue;
      for (const [dx, dz] of [[-8, -7], [8, -7], [-8, 7], [8, 7]]) props.townHouse({ x: x + dx, z: z + dz, yaw: 0, width: 14, depth: 12, storeys: 3 + (r() < 0.4 ? 1 : 0), damaged: 0 });
      take(x, z, 18);
    }
    for (let i = 0, n = 0; i < 3000 && n < 110; i++) {
      const x = -40 + r() * 400, z = QUAY - 30 - r() * 400;
      const slope = Math.hypot(g(x + 3, z) - g(x - 3, z), g(x, z + 3) - g(x, z - 3)) / 6;
      if (slope > 0.3 || !inCity(x, z) || !clear(x, z, 7)) continue;
      props.townHouse({ x, z, yaw: (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.3, width: 8 + r() * 4, depth: 9 + r() * 3, storeys: 2 + Math.floor(r() * 3), damaged: 0 });
      take(x, z, 7); n++;
    }
    // Barcola: villas along the coast road
    for (let i = 0, n = 0; i < 400 && n < 10; i++) {
      const x = -600 + r() * 110, z = shoreZ(x) - 30 - r() * 60;
      if (Math.abs(x + 548) < 50 || !clear(x, z, 6)) continue;
      props.house({ x, z, yaw: 0, width: 9, depth: 8, height: 6 }); take(x, z, 7); n++;
    }

    // ---- Miramare: Maximilian’s white castle on its promontory
    {
      const cx = -548, cz = shoreZ(-548) - 40;
      const b = props.beginBuilding('castle', cx, cz, Math.PI / 2, 26, 16);
      b.plaster = 0xe8e4da;
      props.shell(b, { height: 10, key: 'stone', color: 0xe8e4da, t: 1, bay: 3, sill: 3, head: 5, frame: 0xb0aa9c, front: [1], back: [] });
      props.piece('stone', b, 0, 10.3, 0, 26.6, 0.6, 16.6, 0x9a9890);
      props.endBuilding();
      props.box('stone', cx, g(cx, cz + 14) + 9, cz + 14, 7, 18, 7, 0, 0xe4e0d4); // (its tower toward the sea)
      take(cx, cz, 24);
    }

    // ---- the karst: dry-stone walls and boulders, Opicina’s houses and church, the obelisk at the top of the Strada Nuova
    for (let i = 0; i < 360; i++) {
      const x = (r() * 2 - 1) * 580, z = QUAY - edgeBack(x) - 220 - r() * 700;
      if (z < -880 || !clear(x, z, 4) || Math.hypot(x, z + 860) < 40) continue;
      if (r() < 0.45) props.boulder({ x, z, radius: 0.6 + r() * 1.3 });
      else props.lowWall({ x, z, yaw: r() * 3, length: 6 + r() * 8, height: 1.0, color: 0xb0aa9c });
    }
    for (let i = 0, n = 0; i < 600 && n < 22; i++) {
      const a = r() * Math.PI * 2, d = 50 + r() * 110, x = Math.cos(a) * d * 1.4, z = -800 + Math.sin(a) * d * 0.6;
      if (!clear(x, z, 7) || Math.hypot(x, z + 860) < 40) continue;
      props.townHouse({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 3, depth: 8 + r() * 2, storeys: 2, damaged: 0 }); take(x, z, 8); n++;
    }
    props.church({ x: 120, z: -770, yaw: 0 });
    props.column({ x: -70, z: QUAY - 712, radius: 1.2, height: 14 });
    commandPost(props, this.bases.pact, 1, 0x6a6c58);
    props.finish();

    // trees: black pines planted on the karst edge, Miramare’s park, scrub and sumac on the plateau
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 16 })), { x: 0, z: -860, r: 36 },
      { test: (x: number, z: number) => onRoad(x, z) || inCity(x, z) || shoreZ(x) - z < 22 || !free(x, z, 2) }];
    const forest = (x: number, z: number) => {
      const back = shoreZ(x) - z, eb = edgeBack(x);
      const edge = back > eb - 10 && back < eb + 230 ? 0.55 : 0;
      const park = Math.hypot(x + 548, z - (shoreZ(-548) - 60)) < 70 ? 0.8 : 0;
      return Math.max(edge, park, smoothstep(0.15, 0.5, fbm(noise, x * 0.007 + 9, z * 0.007, 2)) * 0.45);
    };
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 1500, broadleaf: 0.2, autumn: 0.3, maxY: 200, size: 0.75, forest });
    const scrub = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 1600, broadleaf: 1, autumn: 0.6, maxY: 200, size: 0.4, forest: (x: number, z: number) => (shoreZ(x) - z > edgeBack(x) ? 0.35 : 0) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.2, fields: this.fields,
      avoid: [{ test: (x: number, z: number) => onRoad(x, z) || inCity(x, z) || shoreZ(x) - z < 25 || !!moleAt(x, z) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { pines.update(dt, t); scrub.update(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
