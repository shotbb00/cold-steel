// Bosphorus (coastal, the 1918 epoch: the British Empire and France land, the Ottoman Empire and its German allies hold; 1.2 × 1.8 km).
// HYPOTHETICAL. On 18 March 1915 the Allied fleet failed to force the Dardanelles: three battleships went down on an
// unswept line of mines in Eren Köy Bay and de Robeck broke off the attack. This is the battle that would have come
// had it gone on and got through: the fleet steaming up the Sea of Marmara to lie off Constantinople, and the troops
// it carried — British, French and the ANZACs from Egypt — put ashore on the Marmara shore at San Stefano (Yeşilköy)
// and Makriköy west of the city, to march on the Theodosian Walls while the battleships' guns looked over the domes.
// Liman von Sanders’ Germans had already rebuilt the Straits’ defences; here they would have dug in on the bluffs
// over the beaches, with the old Krupp coastal batteries and the field guns of the city’s garrison behind.
// On the map (the sea toward +z, south; east +x): the Marmara shore along x — San Stefano’s point with its lighthouse
// and battery at the west end, the yalı villas and the station of San Stefano, the mouth of the Ayamama stream,
// Makriköy’s wooden houses round its mosque and its Greek church, the Kazlıçeşme tanneries and the Zeytinburnu works;
// the Orient Express line from Sirkeci running all along the shore behind the beach. At the east edge the southern
// end of the Theodosian Land Walls: the Marmara Tower where they meet the sea, the inner wall with its towers, the
// outer wall and the dry fosse in front, the Golden Gate opening into the Yedikule fortress and its seven towers,
// the Silivri and Mevlevihane gates further north; the Marmara sea walls going on east along the shore. Outside the
// walls the market gardens and the cypress-dark Ottoman cemeteries; inside, the old city’s wooden houses and the
// Imrahor mosque; on the skyline beyond, Hagia Sophia’s dome and the Blue Mosque’s minarets (backdrop, off the field).
// Davutpaşa barracks behind, where the Ottoman reserve comes from. A clear spring morning.
// Balance (a scenario, not a land map): the lander should take the beaches and win late, or the defence just hold.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { segDist } from './greatWarHelpers.ts';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2200;
const BOUNDS = { x: 600, z: 900 };
const EXT = { x: 620, z: 920 };
const SHORE = 460;
const noise = createNoise2D(1915_03);
const sea = createSea({ level: 0, size: SIZE, color: 0x2c6478 }); // (the Marmara: deep blue-green off the city)
const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

/** The waterline without San Stefano’s point (the railway follows it), and with it. */
const shore0 = (x: number) => SHORE + fbm(noise, x * 0.005, 2.3, 2) * 7 - 22 * bell(x, -215, 70) + 10 * bell(x, 120, 120);
const shoreZ = (x: number) => shore0(x) + 70 * bell(x, -560, 55);
/** World position of a place `back` m inland of the waterline at x. */
const W = (x: number, back: number) => ({ x, z: shoreZ(x) - back });

/** The Theodosian Land Walls: the inner wall’s line (x at z), running a little east of north from the Marmara Tower. */
const wallX = (z: number) => 400 + (SHORE - z) * 0.06;
const RAIL_BACK = 30;
const railZ = (x: number) => shore0(x) - RAIL_BACK;
/** The ways through the walls (z): the railway’s breach, the Golden Gate, the Silivri Gate, the Mevlevihane Gate. */
const GOLDEN_Z = 200, SILIVRI_Z = -220, MEVLEVI_Z = -620;
const GATES = [railZ(wallX(SHORE - 30)), GOLDEN_Z, SILIVRI_Z, MEVLEVI_Z];
const inGate = (z: number, pad = 0) => GATES.some((g) => Math.abs(z - g) < 8 + pad);
/** The Ayamama valley: its stream’s course (x at z), a dry gully up from the bay in the shore. */
const ayaX = (z: number) => -215 + 25 * Math.sin(z * 0.006);

/** Ground height (sea toward +z). */
function height(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  if (d > 0) return Math.max(-0.7 - d * 0.15 - Math.max(0, d - 50) * 0.06, -22) + fbm(noise, x * 0.01, z * 0.01, 2) * 0.4; // a sandy shelf: the boats ground a few metres off
  const back = -d;
  let h = 0.5 + Math.min(back, 22) * 0.06;                                                         // the sand
  const bluff = 6 + 6 * smoothstep(-450, -100, x) + 3 * bell(x, 260, 160);                      // (low at San Stefano, higher toward the walls)
  h += bluff * smoothstep(22, 80, back);                                                           // the low bluff behind the beach
  h += Math.max(0, back - 80) * 0.02;                                                              // the long rise inland
  h += fbm(noise, x * 0.004, z * 0.004, 3) * 5 * smoothstep(80, 260, back);                       // rolling ground
  h -= 8 * smoothstep(70, 12, Math.abs(x - ayaX(z))) * smoothstep(12, 140, back);                 // the Ayamama’s gully
  const dw = wallX(z) - x;                                                                         // + outside (west of) the inner wall
  if (dw < 0) h += 14 * smoothstep(0, 260, -dw);                                                   // the old city climbing toward the Seventh Hill
  else if (dw > 10 && dw < 28 && back > 40 && !inGate(z, 2)) h -= 4.5 * smoothstep(10, 12.5, dw) * smoothstep(28, 25.5, dw); // the dry fosse (causeways at the gates)
  const dr = Math.abs(z - railZ(x));
  if (dr < 7) h += (2.4 - h) * smoothstep(7, 3, dr);                                              // the railway’s ledge along the shore
  return h;
}

/** The beach sectors (x) and what each opens inland. */
const GG = { x: wallX(GOLDEN_Z) - 30, z: GOLDEN_Z };
export const SECTORS = [
  { x: -380, name: 'San Stefano beach', inland: W(-400, 190) },
  { x: -30, name: 'Makriköy beach', inland: W(-60, 230) },
  { x: 270, name: 'Kazlıçeşme beach', inland: GG },
];
const SILIVRI = { x: wallX(SILIVRI_Z) - 32, z: SILIVRI_Z };

const points: ControlPointDef[] = [
  { id: 'A', name: 'The fleet', ...W(0, -340), owner: 'nato', sector: 'centre', radius: 90 },
  { id: 'B', name: 'San Stefano beach', ...W(-380, 10), owner: null, sector: 'west', radius: 34, opens: 'E' } as any,
  { id: 'C', name: 'Makriköy beach', ...W(-30, 10), owner: null, sector: 'centre', radius: 34, opens: 'F' } as any,
  { id: 'D', name: 'Kazlıçeşme beach', ...W(270, 10), owner: null, sector: 'east', radius: 34, opens: 'G' } as any,
  { id: 'E', name: 'San Stefano station', ...SECTORS[0].inland, owner: null, sector: 'west', radius: 34 },
  { id: 'F', name: 'Makriköy', ...SECTORS[1].inland, owner: null, sector: 'centre', radius: 38 },
  { id: 'G', name: 'The Golden Gate', ...GG, owner: null, sector: 'east', radius: 30 },
  { id: 'H', name: 'Silivri Gate', ...SILIVRI, owner: null, sector: 'east', radius: 30 },
  { id: 'K', name: 'Davutpaşa barracks', x: -40, z: -840, owner: 'pact', sector: 'centre' },
];
const at = (id: string) => points.find((p) => p.id === id)!;

/** The roads: the coast road from San Stefano through Makriköy to the Golden Gate, the roads north to Davutpaşa, the road outside the walls. */
const ROADS = [
  [[-620, 296], [at('E').x, at('E').z], [-230, 255], [at('F').x, at('F').z], [130, 225], [GG.x, GG.z], [wallX(GOLDEN_Z) + 4, GOLDEN_Z]],
  [[at('E').x, at('E').z], [-380, 0], [-250, -400], [-90, -760], [-40, -840]],
  [[at('F').x, at('F').z], [-30, -100], [-60, -500], [-40, -840]],
  [[GG.x, GG.z], [wallX(0) - 40, 0], [SILIVRI.x, SILIVRI.z], [wallX(-420) - 40, -420], [wallX(MEVLEVI_Z) - 40, MEVLEVI_Z], [150, -760], [-40, -840]],
  [[SILIVRI.x, SILIVRI.z], [wallX(SILIVRI_Z) + 30, SILIVRI_Z]],
  [[wallX(MEVLEVI_Z) - 40, MEVLEVI_Z], [wallX(MEVLEVI_Z) + 30, MEVLEVI_Z]],
  [[SECTORS[0].x, shoreZ(-380) - 22], [at('E').x, at('E').z]], [[SECTORS[1].x, shoreZ(-30) - 22], [at('F').x, at('F').z]], [[SECTORS[2].x, shoreZ(270) - 22], [200, 230]],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), EXT, 2);
const railD = (x: number, z: number) => Math.abs(z - railZ(x));
/** The Yedikule fortress behind the Golden Gate: its curtain from the land wall round to the land wall (dx east of the wall, dz from the gate). */
const YK = [[0, -62], [75, -80], [120, 0], [75, 80], [0, 62]];
const inYedikule = (x: number, z: number, pad = 0) => { const dx = x - wallX(GOLDEN_Z), dz = z - GOLDEN_Z; return dx > -pad && dx < 125 + pad && Math.abs(dz) < 85 + pad; };
/** Outside the walls: the market gardens (south) and the cemeteries (north), both in the band before the fosse. */
const bostan = (x: number, z: number) => { const dw = wallX(z) - x; return dw > 34 && dw < 150 && z > 60 && z < shoreZ(x) - 60 && roadD(x, z) > 6; };
const cemetery = (x: number, z: number) => { const dw = wallX(z) - x; return dw > 34 && dw < 140 && z < -20 && z > -880 && !inGate(z, 22) && roadD(x, z) > 6; };

const HS = { x: 930, z: 250 }, BM = { x: 880, z: 330 }; // (Hagia Sophia and the Blue Mosque, on the skyline far beyond the walls)

export default {
  id: 'bosphorus',
  name: 'Bosphorus',
  description: 'Hypothetical, 1915: the fleet has forced the Dardanelles and lies off Constantinople. British, French and ANZAC troops land on the Marmara shore at San Stefano and Makriköy, west of the Theodosian Walls — low bluffs, wooden suburbs and the Orient Express line along the beach, the Golden Gate and Yedikule ahead, Hagia Sophia on the skyline.',
  epochs: ['1918'],
  theatre: 'coastal',
  region: 'middleEast',
  modes: ['landing'],
  sides: { nato: 'British Empire and France', pact: 'Ottoman Empire' },
  armies: { nato: ['uk', 'fr', 'anzac'], pact: ['ot', 'de'] }, // (the Mediterranean Expeditionary Force and the French Corps; the Ottoman garrison and Liman von Sanders’ Germans)
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 30, speed: 3, veer: 0.1 }, // (the poyraz, a light north-easter down the Bosphorus)
  airfields: [], // (a landing on a suburban shore under the city walls: no strip laid out here)
  size: SIZE,
  segments: 900,
  bounds: BOUNDS,
  navCell: 1.5,
  steep: 0.5, // (the fosse’s sides: wheels keep to the causeways at the gates)
  overwatch: true,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1915,
  height,
  river: sea,
  fields: createFields({ seed: 191503, cell: 70 }),

  theme: {
    // a clear spring morning on the Marmara: the sun over the city, a light haze on the water
    fogColor: 0xc4ccd2, fogDensity: 0.00045, skyTop: 0x5a86b8, skyHorizon: 0xdcdcd4, skyBottom: 0x8e969a,
    sunColor: 0xfff0d8, sunIntensity: 2.0, sunDisk: 0.7, clouds: 0.2, cloudLight: 0xf6f2ea, cloudDark: 0xaab0b4,
    sunDir: [0.65, 0.5, 0.2], hemiSky: 0xd4dce4, hemiGround: 0x7a7458, hemiIntensity: 1.25, rimColor: 0xf0e4c8, rimIntensity: 0.3,
    terrain: {
      grass: '#748048', grassAlt: '#6a7642', dryGrass: '#a49c6c', dirt: '#8a7454', rock: '#b0a48a',
      pasture: '#74804a', ploughed: '#7e6448', stubble: '#aaa070', meadow: '#7c884e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const sz = shoreZ(x);
        if (z > sz + 2) return [y > -1.5 ? 0xc0b490 : 0x5a7a80, 1];                               // the sand under the water, then deep
        const dw = wallX(z) - x;
        if (z > sz - 20 && dw > 0) return [0xd2c4a0, 1];                                             // the beach
        if (railD(x, z) < 2.6) return [0x4a443c, 0.9];                                              // the ballast
        if (roadD(x, z) < 3.4) return [0xa8946e, 0.85];                                             // the dusty roads
        if (dw > -6 && dw < 9 && z < sz - 4) return [0x9c9078, 0.9];                                // the terrace between the walls
        if (dw >= 10 && dw < 28 && !inGate(z, 2)) return [0x6e7244, 0.8];                           // the fosse’s floor, grassed
        if (dw < -6) return [0x8e8068, 0.55];                                                        // the old city’s lanes and yards
        if (bostan(x, z)) return [Math.floor(x / 4) % 2 ? 0x667a44 : 0x76684c, 0.7];              // the market gardens’ rows
        if (cemetery(x, z)) return [0x5c6a40, 0.7];                                                  // the cemeteries’ grass under the cypresses
        const scrub = fbm(noise, x * 0.04 + 9, z * 0.04, 2);
        return scrub > 0.25 ? [0x5c6640, Math.min(0.5, (scrub - 0.25) * 2)] : null;
      },
    },
  },

  bases: { nato: { x: 0, z: 880, entries: SECTORS.map((s) => s.x) }, pact: { x: -40, z: -840, entries: [-380, -40, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 640 }, pact: { x: 0, z: 100 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'nato',
    // the transports’ boats in tows behind the steam pinnaces, the motor lighters for the guns (systems/Landing.js craft)
    craft: { infantry: ['ml'], vehicle: 'ferry' },
    launchZ: 760,
    signal: { t: 15, say: 'The tows are casting off — the boats pull for the shore under the guns of the fleet', sayOther: 'Boats off San Stefano and Makriköy! The fleet is landing troops — stand to!' },
    navy: ['destroyer', 'battleship', 'lightCruiser'],
    // the guns: the Krupp battery on San Stefano point and the one by the Marmara Tower (ships only), German field guns inland
    forts: [
      { unit: 'coastBattery', ...W(-560, 45), facing: 0, name: 'San Stefano battery' },
      { unit: 'coastBattery', x: wallX(SHORE) + 70, z: shoreZ(wallX(SHORE) + 70) - 60, facing: 0, name: 'Yedikule battery' },
      { unit: 'artillery', ...W(-250, 430), facing: 0 },
      { unit: 'artillery', ...W(150, 560), facing: 0 },
    ],
    // the German-dug line along the bluff tops over each beach, MG nests on the flanks, wire along the top of the sand
    works: [
      ...SECTORS.flatMap((s) => [-48, -30, -12, 12, 30, 48].map((dx) => ({ kind: 'trench', ...W(s.x + dx, 92), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-62, 62].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, 76), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-80, -60, -40, -20, 20, 40, 60, 80].map((dx) => ({ kind: 'wire', ...W(s.x + dx, 20), yaw: 0 }))), // (a gap where the track comes up)
      // before the Golden Gate: a trench across the road, MGs on the causeway’s flanks
      ...[-36, -18, 18, 36].map((dz) => ({ kind: 'trench', x: GG.x - 40, z: GG.z + dz, yaw: -Math.PI / 2 })),
      { kind: 'mgNest', x: GG.x - 22, z: GG.z - 26, yaw: -Math.PI / 2 }, { kind: 'mgNest', x: GG.x - 22, z: GG.z + 26, yaw: -Math.PI / 2 },
    ],
    // the city’s garrison: Ottoman infantry and German machine-gun companies over the beaches, more in the suburbs
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'artillery', 'rifles', 'sniper', 'rifles', 'mgTeam', 'mortar', 'rifles'],
    counter: { t: 260, units: ['rifles', 'rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam'], say: 'The reserve is coming down from Davutpaşa — drive them back into the sea!', sayOther: 'Turkish columns coming down from the barracks at Davutpaşa — they’re making for Makriköy!' },
    hold: [...SECTORS.map((s) => s.inland), ...SECTORS.flatMap((s) => [-40, 40].map((dx) => W(s.x + dx, 95))), SILIVRI],
    ai: { order: ['rifles', 'rifles', 'mgTeam', 'rifles', 'sniper', 'mortar', 'rifles', 'mgTeam', 'artillery', 'rifles'], gunship: 'destroyer', gunships: 1, heavy: 'battleship', inshore: 540 },
    economy: { reserves: 2500, perSector: 850, beachIncome: 1.1, defenceCp: 800, defenceIncome: 1.2 }, // (richer than Gallipoli’s: the open suburbs and the walls hold — AI vs AI 2026-11-23)
    waves: [
      // the covering force, in to all three beaches at once
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 },
      ] },
      { t: 120, say: 'The second wave is coming in — the French on the right', units: [{ unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }] },
      { t: 300, say: 'The lighters are bringing in the guns — the ANZACs land behind them', units: [{ unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 2 }, { unit: 'artillery', sector: 1 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1915_03);
    sea.build(scene, terrain);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const nearPoint = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const placed: number[][] = [];
    const free = (x: number, z: number, d: number) => !placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + d);
    const nearWorks = (x: number, z: number) => SECTORS.some((s) => Math.abs(x - s.x) < 95 && Math.abs(shoreZ(x) - z - 60) < 50);
    const skip = (x: number, z: number) => roadD(x, z) < 8 || railD(x, z) < 8 || z > shoreZ(x) - 26 || steepAt(x, z) > 0.3 || Math.abs(wallX(z) - x) < 32 || nearWorks(x, z);
    const M = (x: number, y: number, z: number, sy = 1) => new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeScale(1, sy, 1));
    const cyl = (x: number, z: number, r0: number, r1: number, h: number, color: number, y0?: number, solid = true) => {
      const y = y0 ?? terrain.heightAt(x, z) - 0.3;
      props.push('stone', new THREE.CylinderGeometry(r0, r1, h, 14), M(x, y + h / 2, z), color);
      if (solid) cover.addCylinder({ x, z, radius: r1, height: h });
    };
    const dome = (x: number, y: number, z: number, rad: number, color: number, sy = 0.7) => props.push('metal', new THREE.SphereGeometry(rad, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(x, y, z, sy), color);
    const minaret = (x: number, z: number, h = 17, y0?: number, solid = true) => {
      cyl(x, z, 0.7 * h / 17, 0.9 * h / 17, h, 0xe6e0d0, y0, solid);
      const y = (y0 ?? terrain.heightAt(x, z) - 0.3) + h;
      props.push('stone', new THREE.CylinderGeometry(1.4 * h / 17, 1.1 * h / 17, 0.5, 12), M(x, y - h * 0.2, z), 0xe6e0d0); // (the şerefe)
      props.push('metal', new THREE.ConeGeometry(0.85 * h / 17, 3.5 * h / 17, 12), M(x, y + 1.75 * h / 17, z), 0x7a8288);
    };
    const mosque = (x: number, z: number, yaw = 0) => {
      if (!free(x, z, 12)) return;
      props.flatHouse({ x, z, yaw, width: 12, depth: 10, name: 'mosque', dome: true });
      minaret(x + 8.5, z + 5);
      placed.push([x, z, 12]);
    };
    /** Ottoman wooden houses round (cx, cz): timber frames on stone, two storeys, the street’s yaw. */
    const houses = (cx: number, cz: number, rx: number, rz: number, n: number, seed: number, ok: (x: number, z: number) => boolean = () => true) => {
      props.rand = mulberry32(seed);
      for (let i = 0, k = 0; i < n * 8 && k < n; i++) {
        const x = cx + (props.rand() * 2 - 1) * rx, z = cz + (props.rand() * 2 - 1) * rz;
        if (skip(x, z) || !ok(x, z) || nearPoint(x, z, 14) || !free(x, z, 7)) continue;
        placed.push([x, z, 7]); k++;
        props.townHouse({ x, z, yaw: (props.rand() < 0.5 ? 0 : Math.PI / 2) + (props.rand() - 0.5) * 0.2, width: 7 + props.rand() * 3, depth: 7 + props.rand() * 2, storeys: props.rand() < 0.65 ? 2 : 1, damaged: 0.05 });
      }
    };
    /** A rampart along a polyline in 8 m pieces on their own ground: limestone with red-brick bands, open at `gap`. */
    const rampart = (poly: number[][], h: number, t: number, gap: (x: number, z: number) => boolean, color = 0xbcae92) => {
      for (let i = 0; i < poly.length - 1; i++) {
        const [ax, az] = poly[i], [bx, bz] = poly[i + 1], l = Math.hypot(bx - ax, bz - az), yaw = -Math.atan2(bz - az, bx - ax);
        const n = Math.max(1, Math.round(l / 8)), pl = l / n;
        for (let k = 0; k < n; k++) {
          const x = ax + ((bx - ax) * (k + 0.5)) / n, z = az + ((bz - az) * (k + 0.5)) / n;
          if (gap(x, z) || Math.abs(x) > 598 || Math.abs(z) > 898) continue;
          const g = Math.min(terrain.heightAt(x, z), terrain.heightAt(x + (bx - ax) / n / 2, z + (bz - az) / n / 2), terrain.heightAt(x - (bx - ax) / n / 2, z - (bz - az) / n / 2)) - 1;
          props.box('stone', x, g + (h + 1) / 2, z, pl + 0.05, h + 1, t, yaw, color);
          for (const f of [0.35, 0.7]) props.box('stone', x, g + 1 + h * f, z, pl + 0.07, 0.55, t + 0.08, yaw, 0x9a5a44);
          cover.addBox({ x, z, yaw, length: pl, thickness: t, height: h });
        }
      }
    };
    const tower = (x: number, z: number, s: number, h: number, color = 0xb8aa8e) => {
      const g = terrain.heightAt(x, z) - 1;
      props.box('stone', x, g + (h + 1) / 2, z, s, h + 1, s, 0, color);
      props.box('stone', x, g + h * 0.6, z, s + 0.1, 0.6, s + 0.1, 0, 0x9a5a44);
      cover.addBox({ x, z, yaw: 0, length: s, thickness: s, height: h });
    };

    // ---- the Land Walls: inner wall and towers, the outer wall before it, open at the gates and the railway’s breach
    const sea0 = shoreZ(wallX(SHORE)) - 5;
    const innerLine = [[wallX(sea0), sea0], [wallX(-900), -900]];
    rampart(innerLine, 9, 4, (x, z) => inGate(z));
    rampart([[wallX(sea0 - 18) - 7, sea0 - 18], [wallX(-900) - 7, -900]], 3.6, 2, (x, z) => inGate(z));
    for (let z = sea0 - 40; z > -900; z -= 55) if (!inGate(z, 8) && Math.abs(z - GOLDEN_Z) > 70) tower(wallX(z), z, 9, 14);
    tower(wallX(sea0), sea0, 12, 17); // (the Marmara Tower, where the land walls meet the sea)
    // the Marmara sea walls along the shore east of it
    const seaLine: number[][] = [];
    for (let x = wallX(sea0); x <= 600; x += 8) seaLine.push([x, shoreZ(x) - 5]);
    rampart(seaLine, 7, 3, () => false);
    for (let i = 7; i < seaLine.length; i += 7) tower(seaLine[i][0], seaLine[i][1] - 3, 8, 11);
    // the Golden Gate: two marble pylons either side of the arch; behind it the Yedikule fortress, its curtain and seven towers
    const gx = wallX(GOLDEN_Z);
    for (const s of [-1, 1]) tower(gx, GOLDEN_Z + s * 15, 12, 16, 0xe2dccc);
    const yk = YK.map(([dx, dz]) => [gx + dx, GOLDEN_Z + dz]);
    rampart(yk, 10, 4, (x, z) => Math.hypot(x - (gx + 98), z - (GOLDEN_Z - 40)) < 8); // (the inner gate to the city on its north-east side)
    for (const [x, z] of yk) cyl(x, z, 6, 6.5, 20, 0xc0b296);
    cyl(gx + 120, GOLDEN_Z, 6, 6.5, 22, 0xc0b296);
    for (const [x, z] of yk.slice(1, 4)) props.push('metal', new THREE.ConeGeometry(6.6, 6, 14), M(x, terrain.heightAt(x, z) + 22.7, z), 0x7a8288);
    // the Imrahor mosque (the old Stoudios church) and the old city’s wooden houses inside the walls
    placed.push([gx + 60, GOLDEN_Z, 90]);
    mosque(gx + 90, 360);
    const inside = (x: number, z: number) => x - wallX(z) > 14 && !inYedikule(x, z, 10) && x < 590 && z < shoreZ(x) - 40;
    props.rand = mulberry32(1915_31);
    for (let i = 0, k = 0; i < 900 && k < 70; i++) {
      const z = -880 + props.rand() * (shoreZ(500) - 40 + 880), x = wallX(z) + 14 + props.rand() * 180;
      if (!inside(x, z) || railD(x, z) < 8 || roadD(x, z) < 8 || !free(x, z, 6)) continue;
      placed.push([x, z, 6]); k++;
      props.townHouse({ x, z, yaw: (props.rand() < 0.5 ? 0 : Math.PI / 2) + (props.rand() - 0.5) * 0.3, width: 7 + props.rand() * 3, depth: 7 + props.rand() * 3, storeys: props.rand() < 0.7 ? 2 : 1, damaged: 0.05 });
    }
    mosque(wallX(-400) + 80, -400);

    // ---- the skyline beyond the walls: Hagia Sophia and the Blue Mosque (backdrop: no cover, off the field)
    {
      const y = terrain.heightAt(HS.x, HS.z) + 18;
      props.push('stone', new THREE.BoxGeometry(62, 26, 70), M(HS.x, y - 13 + 26, HS.z), 0xc88a62);
      props.push('stone', new THREE.CylinderGeometry(17, 17, 6, 24), M(HS.x, y + 29, HS.z), 0xc88a62);
      dome(HS.x, y + 32, HS.z, 17.5, 0x8a8e8c, 0.5);
      for (const s of [-1, 1]) dome(HS.x, y + 26, HS.z + s * 18, 12, 0x8a8e8c, 0.55);
      for (const [dx, dz] of [[-34, -38], [34, -38], [-34, 38], [34, 38]]) minaret(HS.x + dx, HS.z + dz, 52, y - 4, false);
      const b = terrain.heightAt(BM.x, BM.z) + 14;
      props.push('stone', new THREE.BoxGeometry(56, 22, 56), M(BM.x, b + 11, BM.z), 0xdcd6c8);
      dome(BM.x, b + 26, BM.z, 16, 0x6e7c8a, 0.6);
      for (const [dx, dz] of [[-17, 0], [17, 0], [0, -17], [0, 17]]) dome(BM.x + dx, b + 22, BM.z + dz, 10, 0x6e7c8a, 0.6);
      for (const [dx, dz] of [[-17, -17], [17, -17], [-17, 17], [17, 17]]) dome(BM.x + dx, b + 22, BM.z + dz, 6, 0x6e7c8a, 0.6);
      for (const [dx, dz] of [[-32, -32], [32, -32], [-32, 32], [32, 32], [-48, -10], [-48, 10]]) minaret(BM.x + dx, BM.z + dz, 56, b - 2, false);
      // the roofs of the old city between (low boxes, a few domes)
      const rr = mulberry32(1915_77);
      for (let i = 0; i < 160; i++) {
        const x = 620 + rr() * 420, z = -300 + rr() * 640;
        if (z > shoreZ(x) - 30 || Math.hypot(x - HS.x, z - HS.z) < 55 || Math.hypot(x - BM.x, z - BM.z) < 50) continue;
        const g = terrain.heightAt(x, z), w = 8 + rr() * 8, d = 8 + rr() * 8, h = 6 + rr() * 5;
        props.push('plaster', new THREE.BoxGeometry(w, h, d), M(x, g + h / 2, z), new THREE.Color().setHSL(0.08, 0.2, 0.55 + rr() * 0.2).getHex());
        props.push('metal', new THREE.BoxGeometry(w + 0.8, 0.6, d + 0.8), M(x, g + h + 0.3, z), 0x8a4a34);
      }
    }

    // ---- San Stefano: the point with its lighthouse and battery, the yalı villas along the shore, the station
    const lh = W(-575, 30);
    cyl(lh.x, lh.z, 1.4, 1.9, 13, 0xf0ece0);
    props.push('metal', new THREE.ConeGeometry(1.8, 2.2, 10), M(lh.x, terrain.heightAt(lh.x, lh.z) + 13.8, lh.z), 0xa03028);
    placed.push([lh.x, lh.z, 6]);
    for (const dx of [-20, 18]) { const p = W(-560 + dx, 60); props.box('stone', p.x, terrain.heightAt(p.x, p.z) + 0.9, p.z, 7, 2.2, 5, 0, 0x8e8c84); cover.addBox({ x: p.x, z: p.z, yaw: 0, length: 7, thickness: 5, height: 2 }); placed.push([p.x, p.z, 6]); } // (the German concrete shelters by the battery)
    const E = at('E');
    props.flatHouse({ x: E.x + 30, z: railZ(E.x + 30) - 14, yaw: 0, width: 18, depth: 9, storeys: 2, name: 'San Stefano station' });
    placed.push([E.x + 30, railZ(E.x + 30) - 14, 12]);
    houses(-400, SHORE - 120, 150, 90, 22, 1915_11, (x, z) => Math.abs(x - ayaX(z)) > 30);
    mosque(-470, SHORE - 230);
    props.church({ x: -330, z: SHORE - 250, yaw: 0 }); placed.push([-330, SHORE - 250, 14]); // (the church of San Stefano’s Levantines)
    // ---- Makriköy: wooden houses round the mosque and the Greek church, the station on the line
    const F = at('F');
    houses(F.x, F.z, 140, 80, 30, 1915_12, (x, z) => Math.abs(x - ayaX(z)) > 30);
    mosque(F.x + 55, F.z - 50);
    if (free(F.x - 70, F.z + 40, 12)) { props.church({ x: F.x - 70, z: F.z + 40, yaw: 0 }); placed.push([F.x - 70, F.z + 40, 14]); }
    props.flatHouse({ x: F.x + 20, z: railZ(F.x + 20) - 14, yaw: 0, width: 16, depth: 8, storeys: 1, name: 'Makriköy station' });
    // ---- Kazlıçeşme and the Zeytinburnu works: the tanneries’ sheds and the armaments works’ halls, a chimney
    for (const [x, back, w] of [[120, 120, 30], [165, 165, 24], [100, 175, 22]] as number[][]) {
      const p = W(x, back);
      if (!free(p.x, p.z, w / 2)) continue;
      props.hall({ x: p.x, z: p.z, yaw: 0, width: w, depth: 14, height: 7, color: 0x8a6a52, name: 'Zeytinburnu works' });
      placed.push([p.x, p.z, w / 2 + 2]);
    }
    { const p = W(140, 145); props.chimney({ x: p.x, z: p.z, height: 26 }); placed.push([p.x, p.z, 3]); }
    houses(230, SHORE - 160, 60, 40, 8, 1915_13);
    // ---- Davutpaşa barracks behind: the long barrack block, the parade ground, tents
    props.flatHouse({ x: 70, z: -790, yaw: 0, width: 60, depth: 14, storeys: 2, name: 'Davutpaşa barracks' });
    for (let i = 0; i < 6; i++) props.tent({ x: -140 + (i % 3) * 9, z: -800 - Math.floor(i / 3) * 9, yaw: 0.1, color: 0xb0a482 });
    commandPost(props, this.bases.pact, 1, 0xa89c7a);
    // ---- the railway: the Orient Express line along the shore, through the breach into the city; wagons at the stations
    for (let x = -600; x < 598; x += 30) { const x1 = Math.min(598, x + 30); props.rails({ x0: x, z0: railZ(x), x1, z1: railZ(x1) }); }
    props.wagon({ x: E.x + 60, z: railZ(E.x + 60), yaw: Math.PI / 2 });
    props.wagon({ x: E.x + 75, z: railZ(E.x + 75), yaw: Math.PI / 2, kind: 'open' });
    // ---- the cemeteries outside the walls: turbaned headstones under the cypresses
    for (let i = 0; i < 900; i++) {
      const z = -880 + r() * 860, x = wallX(z) - 34 - r() * 110;
      if (!cemetery(x, z) || !free(x, z, 1)) continue;
      props.column({ x, z, radius: 0.18, height: 0.9 + r() * 0.6 });
    }
    // ---- boulders and stones on the beaches’ flanks (none in front of the sectors)
    for (let i = 0; i < 40; i++) {
      const x = -580 + r() * 980, p = W(x, 4 + r() * 12);
      if (SECTORS.some((s) => Math.abs(s.x - x) < 90) || nearPoint(p.x, p.z, 30)) continue;
      props.boulder({ x: p.x, z: p.z, radius: 0.5 + r() * 0.9 });
    }
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...placed.map(([x, z, pr]) => ({ x, z, r: pr + 2 })),
      { test: (x: number, z: number) => z > shoreZ(x) - 24 || roadD(x, z) < 5 || railD(x, z) < 6 || Math.abs(wallX(z) - x) < 30 || inYedikule(x, z, 6) || bostan(x, z) }];
    // the cypresses: dark over the cemeteries, here and there in the villages’ yards
    const cypress = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 1400, broadleaf: 0, autumn: 0, size: 0.75, maxY: 200, avoid,
      forest: (x: number, z: number) => (cemetery(x, z) ? 0.9 : x > wallX(z) ? 0.15 : -1) });
    // plane trees and fig and mulberry in the gardens; stone pines and scrub on the open ground
    const planes = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 1800, broadleaf: 1, autumn: 0, size: 0.6, maxY: 200, avoid,
      forest: (x: number, z: number) => (x > wallX(z) - 30 ? 0.1 : 0.25 + fbm(noise, x * 0.012 + 3, z * 0.012, 2)) });
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 400, broadleaf: 0, autumn: 0, size: 0.9, maxY: 200, avoid,
      forest: (x: number, z: number) => (x < -250 && fbm(noise, x * 0.008, z * 0.008, 2) > 0.1 ? 0.5 : 0) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.2, fields: this.fields, avoid });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { cypress.update(dt, t); planes.update(dt, t); pines.update(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
