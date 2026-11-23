// Salonika Bay, October 1915 (coastal, the 1918 epoch: France and Britain land, Bulgaria and Germany hold; 1.2 × 1.8 km).
// On 5 October 1915 the first French and British troops of the Armée d’Orient and the 10th (Irish) Division came ashore
// at Salonika to go to the help of Serbia, then being overrun by the Austrians, the Germans and the Bulgarians. In history
// the landing was unopposed: Greece was neutral, its prime minister Venizelos had invited the Allies, and the troops
// marched off the quays past Greek sentries and the cafés of the waterfront. Here it is played as the landing that might
// have been: an opposed one, with Bulgarian and German troops holding the city.
// The ground: the waterfront along the Thermaic Gulf — in the west the harbour, its mole and the customs pier, the
// railway station behind them; the quays in the middle, stretches of the old Byzantine sea walls along them; the White
// Tower on the shore in the east and, beyond it, the Kalamaria shore with its villas. The city climbs the hill behind:
// the minarets and the Byzantine churches (Hagios Dimitrios, the Rotunda), the Upper Town inside the walls, the
// Eptapyrgio citadel at the top. West of the city the flat Vardar plain and its marshy delta.
// The sea is toward +z: the transports and the warships lie there; the waterfront runs along x (west is −x).
import * as THREE from 'three';
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
const SHORE = 440;
const noise = createNoise2D(1915_10);
const sea = createSea({ level: 0, size: SIZE, color: 0x2c5e70 }); // (the Thermaic Gulf: calm and blue in the autumn)

/** The waterline: the city's straight quays, the delta pushing out in the west, the Kalamaria shore bending out to the south-east. */
const shoreZ = (x: number) => SHORE + fbm(noise, x * 0.005, 2.3, 2) * 4 + 55 * smoothstep(260, 600, x) + 70 * smoothstep(-460, -600, x);
/** World position of a place `back` m inland of the waterline at x. */
const W = (x: number, back: number) => ({ x, z: shoreZ(x) - back });

// ---- the harbour: the mole out from the shore in the west and its arm back east, the customs pier on the east side of the basin (the mouth between, off the quays)
const HARBOUR_Z = 590;
const MOLE = [
  { a: [-500, shoreZ(-500) - 8], b: [-500, HARBOUR_Z], half: 6 },
  { a: [-500, HARBOUR_Z], b: [-440, HARBOUR_Z], half: 6 },
  { a: [-290, shoreZ(-290) - 6], b: [-290, shoreZ(-290) + 110], half: 5 },
];
const DECK = 2.2;
const onMole = (x: number, z: number) => MOLE.some((m) => segDist([m.a, m.b], x, z) <= m.half);

/** How far the Upper Town's hill rises at x: none on the Vardar plain, gentler toward Kalamaria. */
const hillK = (x: number) => smoothstep(-430, -200, x) * (1 - 0.5 * smoothstep(260, 560, x));
const EPTA = W(-40, 1240); // the Eptapyrgio, at the top of the walls

/** The ground before the levelled tops and the roads. */
function rise(x: number, z: number) {
  const back = shoreZ(x) - z;
  let h = 0.6 + 2.8 * smoothstep(0, 40, back);                                                    // the quays and the strand (above the swell's reach inland)
  const k = hillK(x);
  h += 112 * smoothstep(80, 1300, back) ** 1.25 * k;                                              // the city up the hill
  h += ridged(noise, x * 0.006 + 2, z * 0.006, 3) * 12 * smoothstep(150, 600, back) * k;          // the ravines down from the citadel
  h += 16 * smoothstep(120, 0, Math.hypot(x - EPTA.x, (z - EPTA.z) * 1.3)) ** 1.4;                // the citadel's knoll
  h += fbm(noise, x * 0.03, z * 0.03, 2) * 0.6 * smoothstep(20, 60, back);
  h += 2 * smoothstep(-420, -600, x) * smoothstep(60, 200, back);                                 // (the plain: just above the marsh)
  return h;
}

// the shelves the points stand on (levelled: a square, a churchyard, the station yard) (x, back, radius)
const TOPS: [number, number, number][] = [[-400, 330, 34], [-20, 440, 34], [260, 400, 32], [-40, 1240, 36]];
const TOP_H = TOPS.map(([x, b]) => { const p = W(x, b); return rise(p.x, p.z); });
function shelved(x: number, z: number) {
  let h = rise(x, z);
  TOPS.forEach(([tx, tb, r], i) => { const p = W(tx, tb); h += (TOP_H[i] - h) * smoothstep(r + 28, r, Math.hypot(x - p.x, z - p.z)); });
  return h;
}

// ---- the streets for wheels (x, back): graded between their nodes
const R = (pts: number[][]) => pts.map(([x, b]) => { const p = W(x, b); return [p.x, p.z]; });
const ROADS = [
  R([[-40, 1330], [-40, 1240], [-10, 1050], [-60, 850], [-20, 640], [-20, 440], [0, 220], [0, 6]]),       // the Langadas road down through the Upper Town to the quays
  R([[-300, 1330], [-360, 1000], [-410, 700], [-400, 330], [-380, 6]]),                                  // the Monastir road past the station to the harbour
  R([[260, 1330], [300, 950], [280, 650], [260, 400], [330, 8]]),                                         // down the east walls to the White Tower
  R([[-600, 300], [-400, 330], [-200, 410], [-20, 440], [120, 430], [260, 400], [420, 330], [600, 260]]), // the Via Egnatia across the city
  R([[-500, 14], [-200, 14], [330, 18], [450, 30], [600, 40]]),                                           // the waterfront and the Kalamaria road
];
const ROAD_H = ROADS.map((r) => r.map(([x, z]) => shelved(x, z)));
const roadD = (x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z)));

/** The delta's lagoons and marsh west of the station (soft ground; the pools under water). */
const marsh = (x: number, z: number) => smoothstep(-450, -540, x) * smoothstep(-0.1, 0.25, fbm(noise, x * 0.012 + 7, z * 0.012, 2)) * smoothstep(-500, -100, z);

function height(x: number, z: number) {
  if (onMole(x, z)) return DECK;                                                                 // the mole and the pier: stone sheer to the water
  const d = z - shoreZ(x); // + out to sea
  if (d > 0) return Math.max(-0.8 - d * 0.25 - Math.max(0, d - 60) * 0.05, -18) + fbm(noise, x * 0.01, z * 0.01, 2) * 0.4; // deep water a few metres off the quays
  let h = shelved(x, z);
  for (let i = 0; i < ROADS.length; i++) {
    const g = graded(ROADS[i], ROAD_H[i], x, z);
    if (g.d < 14) h += (g.h - h) * smoothstep(14, 5, g.d);
  }
  const m = marsh(x, z);
  if (m > 0.6 && roadD(x, z) > 8) h = Math.min(h, 3.2 - (m - 0.6) * 20);                          // the lagoons (under water at the wettest)
  return h;
}

/** The waterfront sectors (x) and what each opens inland. */
export const SECTORS = [
  { x: -380, name: 'The harbour', inland: W(-400, 330) },
  { x: 0, name: 'The quays', inland: W(-20, 440) },
  { x: 330, name: 'White Tower', inland: W(260, 400) },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The transports', ...W(0, -360), owner: 'nato', sector: 'centre', radius: 90 },
  { id: 'B', name: 'The harbour', ...W(-380, 10), owner: null, sector: 'west', radius: 34, opens: 'E' } as any,
  { id: 'C', name: 'The quays', ...W(0, 10), owner: null, sector: 'centre', radius: 34, opens: 'F' } as any,
  { id: 'D', name: 'White Tower', ...W(330, 12), owner: null, sector: 'east', radius: 34, opens: 'G' } as any,
  { id: 'E', name: 'Railway station', ...SECTORS[0].inland, owner: null, sector: 'west', radius: 34 },
  { id: 'F', name: 'Hagios Dimitrios', ...SECTORS[1].inland, owner: null, sector: 'centre', radius: 34 },
  { id: 'G', name: 'The Rotunda', ...SECTORS[2].inland, owner: null, sector: 'east', radius: 32 },
  { id: 'K', name: 'Eptapyrgio', ...EPTA, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'salonika-landing',
  name: 'Salonika Bay',
  description: 'Salonika, October 1915: the Armée d’Orient and the British come ashore on the quays of the Thermaic Gulf — the harbour and its mole, the White Tower, the city climbing to the Eptapyrgio, the Vardar marshes in the west. Unopposed in history; here the Bulgarians and the Germans hold the city.',
  epochs: ['1918'],
  theatre: 'coastal',
  region: 'italy', // (no Balkans region in 1918: the Salonika front's, as salonika.ts — bg has no roster yet and falls back to de)
  modes: ['landing'],
  airfields: [], // (the city, the hill and the delta marsh: no flat dry strip — the aircraft come in from the map edge)
  sides: { nato: 'France and Britain', pact: 'Bulgaria and Germany' },
  armies: { nato: ['fr', 'uk'], pact: ['bg', 'de'] }, // (the Armée d’Orient and the 10th (Irish) Division against the Bulgarians and the German Eleventh Army)
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 200, speed: 2, veer: 0.1 },
  size: SIZE,
  segments: 900,
  bounds: BOUNDS,
  navCell: 1.5,
  steep: 0.5,
  overwatch: true,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 191510,
  height,
  soft(x: number, z: number, foot: boolean) {
    const m = marsh(x, z);
    if (m < 0.05 || roadD(x, z) < 5) return 1;
    return 1 - m * (foot ? 0.3 : 0.6);
  },
  river: sea,
  fields: createFields({ seed: 191510, cell: 70, weights: [0.3, 0.2, 0.2, 0.3] as any }),

  theme: {
    // an October morning on the gulf: clear, a little haze over the delta, Olympus faint across the water
    fogColor: 0xc4c8c8, fogDensity: 0.0006, skyTop: 0x5a80aa, skyHorizon: 0xdcd8cc, skyBottom: 0x8a8a80,
    sunColor: 0xfff0d8, sunIntensity: 1.9, sunDisk: 0.35, clouds: 0.18, cloudLight: 0xf4f0e8, cloudDark: 0xa4a49c,
    sunDir: [0.4, 0.6, 0.5], hemiSky: 0xd0d6dc, hemiGround: 0x6e6450, hemiIntensity: 1.3, rimColor: 0xe4dccc, rimIntensity: 0.22,
    terrain: {
      grass: '#7a7444', grassAlt: '#6c6c3e', dryGrass: '#aa9a62', dirt: '#8a7050', rock: '#b0a690',
      pasture: '#7a7642', ploughed: '#86704e', stubble: '#ae9c64', meadow: '#7c7a46',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onMole(x, z)) return [0xa8a294, 1];                                                    // the mole's dressed stone
        const sz = shoreZ(x);
        if (z > sz + 2) return [y > -1.5 ? 0xb4aa8c : 0x587078, 1];                                // the shelf, then deep water
        const back = sz - z;
        if (back < 22 && x > -520 && x < 420) return [0x9c968a, 1];                                // the quays' paving
        if (back < 18) return [0xccbe98, 1];                                                       // the strand
        if (roadD(x, z) < 3.6) return [0x9a8e78, 0.9];                                             // the streets
        const m = marsh(x, z);
        if (m > 0.2) return [noise(x * 0.05, z * 0.05) > 0 ? 0x6c7842 : 0x56663c, Math.min(0.85, m)]; // reeds
        const g = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
        if (g > 0.5) return [0xb0a690, Math.min(1, 0.6 + (g - 0.5) * 2)];
        if (hillK(x) > 0.3 && back > 60 && back < 1150) return [0xa8987a, 0.55];                  // the city's dusty lanes and yards
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 880, entries: SECTORS.map((s) => s.x) }, pact: { x: -40, z: -860, entries: [-300, -40, 260] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 620 }, pact: { x: -40, z: 0 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'nato',
    // the transports' boats and lighters, towed in by the steam pinnaces (systems/Landing.js craft: the Entente's launches and ferries — no French boats of their own yet)
    craft: { infantry: ['ml'], vehicle: 'ferry' },
    launchZ: 790,
    signal: { t: 15, say: 'The pinnaces are casting off the tows — the boats pull for the quays', sayOther: 'Boats coming in off the transports — they are making for the quays! Stand to!' },
    navy: ['destroyer', 'battleship', 'lightCruiser'],
    // the guns: a heavy battery on each flank of the bay (Kalamaria and the Vardar mouth), field guns in the Upper Town
    forts: [
      { unit: 'coastBattery', ...W(560, 110), facing: -0.4 },
      { unit: 'coastBattery', ...W(-560, 120), facing: 0.4 },
      { unit: 'artillery', ...W(120, 760), facing: 0 },
    ],
    // barricades across the waterfront streets, Maxims in the houses along the quays and on the mole, wire on the strand by the White Tower
    works: [
      ...[-24, 0, 24].map((dx) => ({ kind: 'trench', ...W(-380 + dx, 70), yaw: 0 })),
      ...[-30, -10, 10, 30].map((dx) => ({ kind: 'trench', ...W(dx, 80), yaw: 0 })),
      ...[-20, 0, 20].map((dx) => ({ kind: 'trench', ...W(330 + dx, 75), yaw: 0 })),
      { kind: 'mgNest', ...W(-460, 40), yaw: 0 }, { kind: 'mgNest', ...W(-150, 50), yaw: 0 }, { kind: 'mgNest', ...W(160, 50), yaw: 0 }, { kind: 'mgNest', ...W(420, 55), yaw: 0 },
      { kind: 'mgNest', x: -500, z: HARBOUR_Z - 40, yaw: 0 },
      ...[270, 290, 370, 390].map((x) => ({ kind: 'wire', ...W(x, 30), yaw: 0 })), // (a gap where the street comes down to the tower)
    ],
    // the city's garrison: Bulgarian infantry with German Maxims and gunners; the reserve marching down from the citadel
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'sniper', 'rifles', 'mgTeam', 'mortar', 'rifles', 'sniper', 'rifles'],
    counter: { t: 260, units: ['rifles', 'rifles', 'mgTeam', 'rifles', 'rifles'], say: 'The reserve is coming down from the Eptapyrgio — throw them back into the sea!', sayOther: 'Enemy reserves coming down through the Upper Town!' },
    hold: [...SECTORS.map((s) => s.inland), W(-380, 70), W(0, 80), W(330, 75)],
    ai: { order: ['rifles', 'rifles', 'mgTeam', 'rifles', 'mortar', 'rifles', 'sniper', 'mgTeam', 'artillery', 'rifles'], gunship: 'destroyer', gunships: 1, heavy: 'battleship', inshore: 650 },
    economy: { reserves: 2000, perSector: 700, beachIncome: 0.85, defenceCp: 800, defenceIncome: 1.4 }, // (AI v AI: the defence just held Hagios Dimitrios at 0.7)
    waves: [
      // the first boats: the 156th Division's battalions and the 10th (Irish) Division's, onto the quays and the harbour
      { t: 0, units: [
        { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 },
        { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 },
      ] },
      { t: 140, say: 'The lighters are bringing in the second wave — the Irish battalions and the Zouaves', units: [{ unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 2 }, { unit: 'mortar', sector: 1 }] },
      { t: 320, say: 'A mountain battery of 65s is coming ashore at the harbour', units: [{ unit: 'rifles', sector: 2 }, { unit: 'artillery', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const r = mulberry32(1915);
    props.rand = r;
    const m4 = new THREE.Matrix4();
    const cyl = (x: number, y: number, z: number, r0: number, r1: number, h: number, c: number, seg = 12) => props.push('stone', new THREE.CylinderGeometry(r0, r1, h, seg), m4.makeTranslation(x, y + h / 2, z), c);
    const dome = (x: number, y: number, z: number, rad: number, c: number) => props.push('plain', new THREE.SphereGeometry(rad, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m4.makeTranslation(x, y, z), c);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const nearPoint = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const placed: number[][] = [];
    const free = (x: number, z: number, d: number) => !placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < d);
    const land = (x: number, z: number, m = 24) => z < shoreZ(x) - m && marsh(x, z) < 0.2;
    const clear = (x: number, z: number, rr = 8) => land(x, z) && roadD(x, z) > rr && !nearPoint(x, z, 30) && steepAt(x, z) < 0.3 && free(x, z, 10);
    const STONE = 0xa89c86, WALL = 0x9a8a72, BRICK = 0x9a6a4e;
    const minaret = (x: number, z: number, h = 18) => {
      const g = terrain.heightAt(x, z);
      cyl(x, g, z, 1.0, 1.25, h, 0xe8e2d2, 10); cyl(x, g + h * 0.78, z, 1.7, 1.7, 0.5, 0xd8d0bc, 10);
      props.push('plain', new THREE.ConeGeometry(1.15, 3.2, 10), m4.makeTranslation(x, g + h + 1.6, z), 0x6a6e72);
      placed.push([x, z]);
    };

    // ---- the harbour: the mole's lighthouse, bollards and sheds; warehouses and the customs house along the quays; caiques moored
    const head = { x: -440, z: HARBOUR_Z };
    props.tower({ x: head.x - 4, z: head.z, concrete: false });
    for (let z = shoreZ(-500) + 20; z < HARBOUR_Z - 20; z += 46) props.hall({ x: -500, z, yaw: 0, width: 7, depth: 22, height: 4.5, color: 0x8a7a64, roof: 0x5a4a3e, door: 3, name: 'mole shed' });
    for (const [x, b, w] of [[-470, 34, 26], [-330, 32, 22], [-250, 34, 30]] as number[][]) { const p = W(x, b); if (roadD(p.x, p.z) > 14) { props.hall({ x: p.x, z: p.z, yaw: 0, width: w, depth: 14, height: 8, color: BRICK, roof: 0x6a3a2a, door: 6, name: 'warehouse' }); placed.push([p.x, p.z]); } }
    { const p = W(-290, 30); props.hall({ x: p.x, z: p.z - 4, yaw: 0, width: 18, depth: 12, height: 9, color: 0xc8bca0, roof: 0x6a3a2a, door: 4, name: 'customs house' }); placed.push([p.x, p.z]); }
    for (let i = 0; i < 6; i++) props.crates({ x: -430 + i * 18, z: shoreZ(-430 + i * 18) - 14, yaw: r() * 3 });
    // ---- the railway station behind the harbour, the line out west across the plain toward the Vardar and Monastir
    const st = W(-400, 330);
    props.hall({ x: st.x + 46, z: st.z + 6, yaw: Math.PI / 2, width: 34, depth: 12, height: 8, color: 0xb8a888, roof: 0x5a4e46, door: 6, name: 'railway station' });
    placed.push([st.x + 46, st.z + 6], [st.x + 46, st.z + 26], [st.x + 46, st.z - 14]);
    const RAIL = [[st.x + 64, st.z + 40], [st.x + 64, st.z - 40], [st.x + 10, st.z - 90], [-600, st.z - 140]];
    for (let i = 0; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });
    for (const dz of [-20, 0, 20]) props.wagon({ x: st.x + 64, z: st.z + dz, yaw: 0, kind: dz ? 'box' : 'open' });
    props.hall({ x: st.x - 60, z: st.z - 110, yaw: 0.3, width: 28, depth: 12, height: 7, color: 0x8a6a52, name: 'goods shed' }); placed.push([st.x - 60, st.z - 110]);

    // ---- the sea walls: ruined Byzantine stretches along the quays (gaps off the landing places and the streets)
    for (let x = -260; x < 290; x += 9) {
      if (Math.abs(x) < 60 || roadD(x, shoreZ(x) - 6) < 7 || r() < 0.15) continue;
      const p = W(x, 6);
      props.lowWall({ x: p.x, z: p.z, yaw: 0, length: 8.6, height: 2 + r() * 1.4, color: WALL });
    }
    // ---- the land walls: from the harbour and from the White Tower up the hill to the Eptapyrgio, square towers along them
    const walls = [[[-300, 40], [-250, 400], [-200, 800], [-110, 1200]], [[300, 40], [200, 420], [140, 800], [30, 1200]]];
    for (const wl of walls) {
      const pts = R(wl);
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bz - az, bx - ax);
        for (let t = 5; t < len; t += 10) {
          const x = ax + (bx - ax) * t / len, z = az + (bz - az) * t / len;
          if (roadD(x, z) < 9 || nearPoint(x, z, 40)) continue;
          props.lowWall({ x, z, yaw: -yaw, length: 10.4, height: 4.5, color: WALL });
          if (Math.round(t) % 70 === 5) { const g = terrain.heightAt(x, z); props.box('stone', x, g + 3.5, z, 5, 7, 5, -yaw, 0x928066); }
          placed.push([x, z]);
        }
      }
    }
    // ---- the Eptapyrgio: seven towers round the citadel's walls, a gate south toward the city and north toward the hills
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.25, x = EPTA.x + Math.cos(a) * 46, z = EPTA.z + Math.sin(a) * 40;
      if (roadD(x, z) < 8) continue;
      const g = terrain.heightAt(x, z);
      props.box('stone', x, g + 5, z, 7, 10, 7, a, 0x9a8a70);
    }
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2, x = EPTA.x + Math.cos(a) * 46, z = EPTA.z + Math.sin(a) * 40;
      if (roadD(x, z) < 9) continue;
      props.lowWall({ x, z, yaw: -(a + Math.PI / 2), length: 10.6, height: 5, color: WALL });
    }

    // ---- the White Tower on the shore
    { const p = W(330, 40), x = p.x + 30, z = p.z, g = terrain.heightAt(x, z);
      cyl(x, g - 0.5, z, 7.2, 7.6, 21, 0xece6d6, 20); cyl(x, g + 20.5, z, 7.8, 7.8, 1.2, 0xdcd4c2, 20); cyl(x, g + 21.5, z, 3.6, 3.8, 5, 0xece6d6, 14);
      props.push('plain', new THREE.ConeGeometry(4.2, 2.4, 14), m4.makeTranslation(x, g + 27.7, z), 0x7a6a5a);
      props.cover.addCylinder({ x, z, radius: 7.4, height: 20 });
      placed.push([x, z]); }
    // ---- Hagios Dimitrios: the long basilica, red-tiled, behind its square
    { const p = W(-20, 440), x = p.x, z = p.z - 50;
      props.hall({ x, z, yaw: 0, width: 22, depth: 44, height: 11, color: 0xb8946e, roof: 0x8a4a32, door: 4, name: 'Hagios Dimitrios' });
      props.box('stone', x, terrain.heightAt(x, z + 26) + 9, z + 26, 5, 18, 5, 0, 0xb08c68);
      placed.push([x, z], [x, z + 20], [x, z - 20]); }
    // ---- the Rotunda: the round Roman church with its dome, the minaret the Ottomans added; the Arch of Galerius below it
    { const p = W(260, 400), x = p.x + 44, z = p.z - 8, g = terrain.heightAt(x, z);
      cyl(x, g, z, 12, 12, 14, 0xb08a6a, 24); dome(x, g + 14, z, 12, 0x9a5a3e);
      props.cover.addCylinder({ x, z, radius: 12, height: 14 });
      minaret(x + 15, z + 4, 20); placed.push([x, z]);
      const a = W(230, 330); for (const dx of [-7, 7]) { const ag = terrain.heightAt(a.x + dx, a.z); props.box('stone', a.x + dx, ag + 5, a.z, 4, 10, 6, 0, 0xb09a7c); } }
    // ---- the other Byzantine churches and the mosques' minarets over the roofs
    for (const [x, b] of [[-200, 260], [90, 300], [-120, 620], [140, 560]]) { const p = W(x, b); if (clear(p.x, p.z, 10)) { props.flatHouse({ x: p.x, z: p.z, yaw: 0, width: 12, depth: 12, name: 'church', dome: true }); placed.push([p.x, p.z]); } }
    for (const [x, b] of [[-260, 180], [-90, 330], [60, 240], [200, 250], [-160, 520], [40, 700], [-60, 960], [180, 820]]) { const p = W(x, b); if (land(p.x, p.z) && roadD(p.x, p.z) > 6 && free(p.x, p.z, 8)) minaret(p.x, p.z); }

    // ---- the city: tall stone houses along the waterfront, the crowded tiled and flat roofs up the hill (thinner toward the citadel)
    for (let i = 0; i < 1400; i++) {
      const x = -330 + r() * 820, back = 30 + r() * 1080, p = W(x, back);
      const dense = 1 - 0.55 * smoothstep(300, 1100, back) - 0.6 * smoothstep(360, 480, x);
      if (r() > dense || !clear(p.x, p.z, 7)) continue;
      placed.push([p.x, p.z]);
      const yaw = (r() < 0.8 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.15;
      if (back < 110) props.townHouse({ x: p.x, z: p.z, yaw, width: 9 + r() * 4, depth: 9, storeys: 3, damaged: 0 });
      else if (r() < 0.55) props.townHouse({ x: p.x, z: p.z, yaw, width: 7 + r() * 3, depth: 8, storeys: r() < 0.5 ? 2 : 1, damaged: 0 });
      else props.flatHouse({ x: p.x, z: p.z, yaw, width: 7 + r() * 3, depth: 6 + r() * 2, storeys: r() < 0.3 ? 2 : 1 });
    }
    // ---- Kalamaria: villas in their gardens along the shore road, garden walls
    for (let i = 0; i < 160; i++) {
      const x = 400 + r() * 190, back = 40 + r() * 280, p = W(x, back);
      if (!clear(p.x, p.z, 8) || !free(p.x, p.z, 22)) continue;
      placed.push([p.x, p.z]);
      props.townHouse({ x: p.x, z: p.z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 10 + r() * 3, depth: 10, storeys: 2, damaged: 0, name: 'villa' });
      props.lowWall({ x: p.x, z: p.z + 12, yaw: 0, length: 18, height: 1.6, color: 0xc8bca0 });
    }
    // ---- the plain: a few farms and reed huts toward the Vardar
    for (let i = 0; i < 40; i++) {
      const x = -590 + r() * 160, z = -700 + r() * 1080;
      if (!clear(x, z, 8) || !free(x, z, 30)) continue;
      placed.push([x, z]); props.house({ x, z, yaw: r() * 3, width: 8, depth: 6, height: 3 });
    }
    // the defenders' camp before the citadel
    for (let i = 0; i < 6; i++) props.tent({ x: -100 + (i % 3) * 10, z: -880 + Math.floor(i / 3) * 10, yaw: 0, color: 0x8a8466 });
    commandPost(props, this.bases.pact, 1, 0x6a6c56);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => z > shoreZ(x) - 20 || roadD(x, z) < 5 || onMole(x, z) || !free(x, z, 7) }];
    // cypresses and plane trees in the courtyards, olive groves above the city, willows and tamarisk on the delta
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 2400, broadleaf: 0.7, autumn: 0.25, size: 0.6, maxY: 200, avoid,
      forest: (x: number, z: number) => { const back = shoreZ(x) - z; return marsh(x, z) > 0.4 ? 0.2 : back > 1000 ? 0.3 + 0.3 * fbm(noise, x * 0.01, z * 0.01, 2) : x > 380 ? 0.35 : 0.12; } });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.0, fields: this.fields, avoid });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
