// East Anglia, summer 1985 (a war that did not happen; the big field, 1.0 × 1.12 km): the Breckland on the Norfolk–
// Suffolk border, where Britain is NATO’s aircraft carrier. Soviet airborne troops have dropped on RAF Feltwell and
// naval infantry landed on the Norfolk coast are pushing inland behind them toward the US air bases at Lakenheath and
// Mildenhall; the bases’ defence and the US reinforcements flown in hold the south. On the map, compressed: the Little
// Ouse across the middle, wandering west from Thetford through Brandon toward the fens (south toward Wangford in the
// west, north toward Santon Downham in the east), with three bridges — Wilton bridge by Hockwold (west), Brandon bridge
// (middle), the Town Bridge at Thetford (east). South of it (NATO, +z): RAF Lakenheath’s runway, tower and hardened
// aircraft shelters behind its wire, Lakenheath and Eriswell on Lakenheath Warren’s heath, Elveden with its hall and
// the war memorial column on the A11, Brandon Park’s pines, the King’s Forest, Thetford (the priory ruins) and the
// Barnham weapons store on the heath. North of it (the Pact, -z): RAF Feltwell, the airborne’s airhead, Mundford,
// Weeting and its castle ruin on Weeting Heath, the pits of the Neolithic flint mines at Grime’s Graves, the High
// Lodge and Lynford blocks of Thetford Forest, Croxton and Thetford’s overspill estates. Flint-walled villages and
// round-tower churches, straight firebreaks through the pine compartments, Scots pine rows (the Breckland “deals”)
// along the heath roads.
// Fair, not mirrored: the Ouse bends its own way and the towns, woods and heaths are each half’s own, but each side has
// a bank point the river bends away from (Hockwold for the Pact, Thetford for NATO) about 90 m from the water, the
// middle point on Brandon bridge straddles both banks, each half has a town on its east flank (Thetford / Croxton and
// the estates), a heath on its west flank (Lakenheath Warren / Weeting Heath), two pine blocks of about the same area
// (Brandon Park and the King’s Forest / High Lodge and Lynford), two rises of about the same height (Elveden and
// Barnham heath / Grime’s Graves and Croxton heath), a trunk road across it (the A11 / the A134), an air base behind
// its west flank, and its points at matching distances from its base (tools/map_fairness.py).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, buildSite } from './common.js';
import { vegetation, flats } from './common2027.js';
import { farmVillage, evenThreshold, segDist } from './greatWarHelpers.ts';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const BX = [-340, 10, 320];   // the Little Ouse bridges: Wilton (Hockwold), Brandon, Thetford Town Bridge
const noise = createNoise2D(1985_91);
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

/** The Little Ouse: south toward Wangford in the west, north toward Santon Downham in the east. */
const ouseZ = (x: number) => -46 * Math.sin(x * Math.PI / 640 + 0.15) - 8 * Math.sin(x * 0.014 + 1.2) + 14.3;
const away = (x: number, z: number) => Math.abs(z - ouseZ(x));
const river = createRiver({
  paths: [ouseZ],
  halfWidth: 10,
  level: 0,
  depth: 2.6,
  valley: 50,
  crossings: [
    { name: 'Wilton bridge', x: BX[0], kind: 'bridge', width: 7, channel: 0 },
    { name: 'Brandon bridge', x: BX[1], kind: 'bridge', width: 8, channel: 0 },
    { name: 'Thetford Town Bridge', x: BX[2], kind: 'bridge', width: 8, channel: 0 },
  ],
});
const wet = (x: number, z: number, r = 0) => away(x, z) < river.halfWidth + 6 + r;

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Lakenheath', 0, 470, 'centre'),
  P('B', 'Eriswell', -400, 300, 'west'),
  P('C', 'Elveden', 60, 200, 'centre', { radius: 28 }),
  P('D', 'Barnham', 330, 262, 'east'),
  P('E', 'Hockwold', -290, -40, 'west'),
  P('F', 'Brandon', BX[1], ouseZ(BX[1]), 'centre', { radius: 30 }),
  P('G', 'Thetford', 300, 62, 'east', { radius: 26 }),
  P('H', 'Weeting', -290, -310, 'west'),
  P('I', 'Grime’s Graves', -90, -200, 'centre'),
  P('J', 'Croxton', 370, -230, 'east', { radius: 26 }),
  P('K', 'Mundford', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };
const over = (x: number) => [[x, ouseZ(x) + 30], [x, ouseZ(x) - 30]];   // a road straight over its bridge

/** The air bases behind each west flank: RAF Lakenheath (NATO), RAF Feltwell taken by the airborne (the Pact). */
const AIRFIELDS = [
  { faction: 'nato', x: -215, z: 470, yaw: Math.PI / 2, large: true, name: 'RAF Lakenheath' },
  { faction: 'pact', x: -215, z: -470, yaw: -Math.PI / 2, large: true, name: 'RAF Feltwell' },
];
const onAirfield = (x: number, z: number, m = 0) => AIRFIELDS.some((a) => Math.abs(x - a.x) < 150 + m && z * Math.sign(a.z) > Math.abs(a.z) - 45 - m);

/** The roads: one up each sector over its bridge, the bank roads either side of Brandon, the two trunk roads. */
const ROADS = [
  [[-430, 640], [-420, 420], at('B'), [-370, 190], ...over(BX[0]), at('E'), [-330, -170], at('H'), [-420, -420], [-430, -640]],
  [[0, 640], at('A'), [30, 330], at('C'), [30, 110], ...over(BX[1]), [-40, -110], at('I'), [-40, -360], at('K'), [0, -640]],
  [[330, 640], [330, 520], at('D'), [330, 160], at('G'), ...over(BX[2]), [330, -130], at('J'), [330, -520], [330, -640]],
  [at('E'), [-150, -50], [-60, -40], [BX[1], ouseZ(BX[1]) - 30]],                   // the north bank road (Weeting Road)
  [[BX[1], ouseZ(BX[1]) + 30], [100, 40], [200, 55], at('G')],                     // the south bank road (London Road)
  [[-520, 340], at('B'), [-200, 335], at('C'), [190, 150], at('G'), [520, 40]],    // the A11: Barton Mills – Elveden – Thetford
  [[-520, -270], at('H'), at('I'), [150, -300], at('J'), [520, -190]],            // the A134 / A1065: Mundford – Thetford
];
const roadExact = (x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z)));
/** The road distance on a 2 m grid (the ground's paint and the woods ask it everywhere). */
const roadD = gridCacheSmooth(roadExact, { x: 520, z: 580 }, 2);

/** Rises [x, z, r, h]: Elveden heights and Barnham heath (NATO), Grime’s Graves and Croxton heath (the Pact). */
const RISES = [[120, 270, 60, 7], [395, 335, 50, 7.5], [-55, -235, 60, 7], [345, -320, 55, 7.5]];
/** The pine blocks of Thetford Forest [x, z, rx, rz]: Brandon Park, the King’s Forest (NATO); High Lodge, Lynford (the Pact). */
const WOODS = [[-150, 165, 105, 70], [190, 385, 130, 80], [175, -120, 110, 70], [-140, -385, 125, 85]];
/** The plantations go in by compartments (120 × 100 m, straight edges), firebreaks 8 m wide between and through them. */
const cellC = (v: number, s: number) => Math.floor((v + 2000) / s) * s - 2000 + s / 2;
const inWood = (x: number, z: number) => {
  const cx = cellC(x, 60), cz = cellC(z, 50);
  return WOODS.some(([wx, wz, rx, rz]) => ((cx - wx) / rx) ** 2 + ((cz - wz) / rz) ** 2 < 1 + fbm(noise, cx * 0.01, cz * 0.01, 2) * 0.6);
};
const firebreak = (x: number, z: number) => (x + 2000) % 120 < 8 || (z + 2000) % 100 < 8;
/** The heaths (Lakenheath Warren, Weeting Heath): open sandy grass and heather. */
const HEATHS = [[-320, 200, 150, 105], [-330, -215, 150, 100]];
const heathK = (x: number, z: number) => Math.max(...HEATHS.map(([hx, hz, rx, rz]) => smoothstep(1.05, 0.8, Math.hypot((x - hx) / rx, (z - hz) / rz))));
/** Grime’s Graves: the flint mines’ pits and spoil mounds. */
const GRAVES = { x: -95, z: -255, r: 75 };
const gravesK = (x: number, z: number) => smoothstep(GRAVES.r, GRAVES.r * 0.6, Math.hypot(x - GRAVES.x, z - GRAVES.z));

function height(x: number, z: number) {
  let h = 7 + fbm(noise, x * 0.004, z * 0.004, 4) * 3 + fbm(noise, x * 0.045 + 50, z * 0.045, 2) * 0.4;
  h += smoothstep(50, 210, away(x, z)) * (4 + ridged(noise, x * 0.008 + 3, z * 0.008, 3) * 3);   // up out of the Ouse valley
  h += x * 0.004;                                                                                  // the Breckland rising east toward Thetford (alike for both halves)
  for (const [cx, cz, r, a] of RISES) h += hill(x, z, cx, cz, r, a);
  const g = gravesK(x, z);
  if (g > 0) {                                                                                    // the filled shafts: a pit in each 16 m cell, its spoil ring round it
    const i = Math.floor(x / 16), j = Math.floor(z / 16), hsh = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    const jx = (hsh - Math.floor(hsh)) * 6 - 3, jz = ((hsh * 7.13) - Math.floor(hsh * 7.13)) * 6 - 3;
    const d = Math.hypot(x - (i + 0.5) * 16 - jx, z - (j + 0.5) * 16 - jz);
    h += g * (0.8 * Math.exp(-(((d - 6) / 1.8) ** 2)) - 2.2 * smoothstep(5, 0, d));
  }
  h += smoothstep(560, 690, Math.abs(z)) * 14;
  for (const a of AIRFIELDS) {                                                                    // the runway, aprons and shelters graded flat
    const k = smoothstep(190, 160, Math.abs(x - a.x)) * smoothstep(110, 85, Math.abs(z - (a.z + Math.sign(a.z) * 30)));
    if (k > 0) h += (10 - h) * k;
  }
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 6 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}

const THETFORD = { x: 335, z: 95, rx: 80, rz: 55 };
const CROXTON = { x: 385, z: -255, rx: 75, rz: 58 };
const BRANDON = { x: 10, z: 0, rx: 105, rz: 80 };
const inTown = (t: any, x: number, z: number, k = 1) => ((x - t.x) / t.rx) ** 2 + ((z - t.z) / t.rz) ** 2 < k;

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Platoon' }];

export default {
  id: 'east-anglia',
  name: 'East Anglia',
  description: 'The Breckland on the Norfolk–Suffolk border, summer 1985: Soviet airborne and naval infantry push inland toward the US air bases that make Britain NATO’s aircraft carrier. The Little Ouse and its bridges at Brandon and Thetford, the pine blocks and firebreaks of Thetford Forest, sandy heath, flint villages, RAF Lakenheath’s hardened shelters.',
  epochs: ['1985'],
  region: 'europe',
  armies: { nato: ['us'], pact: ['sov'] }, // (the US bases’ defence and reinforcements against Soviet airborne and naval infantry)
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1985_91,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIRFIELDS,
  fields: createFields({ seed: 1985_91, cell: 80 }),

  theme: {
    // a hazy dry summer day over the Breckland
    fogColor: 0xb4b8b0, fogDensity: 0.0013, skyTop: 0x5a7898, skyHorizon: 0xc8ccc4, skyBottom: 0x7a7c70,
    sunColor: 0xf4ead2, sunIntensity: 2.0, sunDisk: 0.35, clouds: 0.45, cloudLight: 0xe2e2dc, cloudDark: 0x8a9096,
    sunDir: [0.45, 0.6, 0.55], hemiSky: 0xc8d2dc, hemiGround: 0x5a5438, hemiIntensity: 1.25, rimColor: 0xc4ccd2, rimIntensity: 0.22,
    terrain: {
      grass: '#66703e', grassAlt: '#5a6636', dryGrass: '#9a8c5c', dirt: '#6a5a44', rock: '#7a766c', strip: '#5a4c38',
      pasture: '#64703c', ploughed: '#6a5640', stubble: '#b09e66', meadow: '#6e7a40',
      farmX: [520, 600], farmZ: [580, 660], roads: [],
      surface(x: number, z: number) {
        if (Math.abs(z) > 545) return null;
        if (roadD(x, z) < 3.6) return [0x6e6c66, 0.9];                                      // tarmac
        if (inTown(THETFORD, x, z, 0.8) || inTown(CROXTON, x, z, 0.8) || inTown(BRANDON, x, z, 0.6)) return [0x6e6a62, 0.35];
        if (wet(x, z, 4) && !wet(x, z, -4)) return [0x66703e, 0.6];                         // the water meadows
        if (inWood(x, z)) return firebreak(x, z) ? [0x7a7048, 0.6] : [0x4a4630, 0.75];       // pine needles under the compartments, sandy rides
        if (gravesK(x, z) > 0.3) return [0x8e8a6a, 0.55];                                   // the pits’ chalk and flint spoil under thin turf
        const hk = heathK(x, z);
        if (hk > 0.5) return [fbm(noise, x * 0.03, z * 0.03, 2) > 0.1 ? 0x6a5a48 : 0xa2925e, 0.5 * hk]; // heather and sandy grass
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-330, 0, 330] }, pact: { x: 0, z: -BASE_Z, entries: [-330, 0, 330] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearBridge = (x: number, z: number, r: number) => river.crossings.some((c: any) => Math.abs(x - c.x) < r && Math.abs(z - c.z) < 45);
    const skip = (x: number, z: number) => onAirfield(x, z, 10) || wet(x, z, 3) || roadD(x, z) < 9 || nearBridge(x, z, 18);
    const placed: number[][] = [];
    const free = (x: number, z: number, r: number) => !skip(x, z) && placed.every(([qx, qz, qr]) => Math.hypot(qx - x, qz - z) > qr + r);
    const FLINT = 0x5e5c58;
    const town = (t: any, n: number, seed: number, storeys = 2) => {
      props.rand = mulberry32(seed);
      for (let i = 0, k = 0; k < n && i < n * 30; i++) {
        const x = t.x + (props.rand() * 2 - 1) * t.rx, z = t.z + (props.rand() * 2 - 1) * t.rz;
        if (!inTown(t, x, z) || !free(x, z, 7)) continue;
        placed.push([x, z, 7]);
        props.townHouse({ x, z, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, width: 8 + props.rand() * 4, depth: 9, storeys: storeys + Math.floor(props.rand() * 2), damaged: 0.1 });
        if (props.rand() < 0.35 && free(x + 7, z + 6, 2)) props.lowWall({ x: x + 7, z: z + 6, yaw: Math.PI / 2, length: 6 + props.rand() * 4, height: 1.5, color: FLINT }); // a flint garden wall
        k++;
      }
    };
    const church = (x: number, z: number, yaw: number) => { if (free(x, z, 14)) { placed.push([x, z, 14]); props.church({ x, z, yaw }); } };
    for (const p of points) if ('CFGJ'.includes(p.id)) placed.push([p.x, p.z, 12]);   // (the squares)

    // ---- Brandon on both banks of its bridge: St Peter’s south, the timber yard north, flint terraces
    props.rand = mulberry32(1985_92);
    church(-60, 62, 0.2);
    if (free(70, -62, 15)) { placed.push([70, -62, 15]); props.hall({ x: 70, z: -62, yaw: 0, width: 26, depth: 12, height: 7, color: 0x7a6650, name: 'timber yard' }); }
    town(BRANDON, 34, 1985_93);
    // ---- Thetford (NATO’s east): St Cuthbert’s, the priory ruins, the old town round the Town Bridge
    props.rand = mulberry32(1985_94);
    church(360, 120, 0.1);
    for (const [dx, dz, yaw, len] of [[0, 0, 0, 22], [0, 14, 0, 22], [-11, 7, Math.PI / 2, 14], [11, 7, Math.PI / 2, 10]]) props.lowWall({ x: 255 + dx, z: 125 + dz, yaw, length: len, height: 3.2, color: FLINT });
    placed.push([255, 132, 18]);
    town(THETFORD, 30, 1985_95);
    // ---- Croxton and Thetford’s overspill estates (the Pact’s east): the London council blocks, the village church
    props.rand = mulberry32(1985_96);
    church(350, -275, -0.2);
    for (const [x, z, yaw] of [[420, -270, 0], [410, -215, Math.PI / 2]]) if (free(x, z, 17)) { placed.push([x, z, 17]); flats(props, { x, z, yaw, storeys: 4, width: 28, depth: 10, name: 'council flats' }); }
    town(CROXTON, 28, 1985_97);
    // ---- Elveden: the hall’s domed bulk, the estate church, the war memorial column at the crossroads on the A11
    props.rand = mulberry32(1985_98);
    if (free(110, 225, 18)) { placed.push([110, 225, 18]); props.townHouse({ x: 110, z: 225, yaw: 0.1, width: 26, depth: 14, storeys: 3, name: 'Elveden Hall', damaged: 0 }); }
    church(15, 228, -0.3);
    props.column({ x: 95, z: 170, radius: 1.5, height: 30 }); placed.push([95, 170, 6]);
    // ---- Weeting: the castle’s flint shell on the heath’s edge, the village
    for (const [dx, dz, yaw, len] of [[0, -9, 0, 18], [0, 9, 0, 12], [-9, 0, Math.PI / 2, 18], [9, 2, Math.PI / 2, 12]]) props.lowWall({ x: -250 + dx, z: -340 + dz, yaw, length: len, height: 3.5, color: FLINT });
    placed.push([-250, -340, 16]);
    // ---- Grime’s Graves: the custodian’s hut, flint spoil
    if (free(-50, -265, 8)) { placed.push([-50, -265, 8]); props.townHouse({ x: -50, z: -265, yaw: 0.3, width: 7, depth: 6, storeys: 1, name: 'custodian’s hut', damaged: 0 }); }
    for (let k = 0; k < 7; k++) { const a = k * 0.9, d = 30 + (k % 3) * 14, x = GRAVES.x + Math.cos(a) * d, z = GRAVES.z + Math.sin(a) * d; if (free(x, z, 6)) { placed.push([x, z, 6]); buildSite(props, { kind: 'rocks', seed: 1985_99 + k }, x, z, a); } }
    // ---- the villages: Lakenheath, Mundford, Eriswell, Barnham, Hockwold, Weeting
    for (const p of points) {
      if ('CFGJI'.includes(p.id)) continue;
      farmVillage(props, p.x, p.z, 'AK'.includes(p.id) ? 6 : 9, 1985_100 + Math.round(p.x * 3 + p.z * 7), (x, z) => !free(x, z, 8), 1.2);
    }
    church(-262, -8, 0.4); church(-372, 322, -0.2);                                      // Hockwold’s and Eriswell’s round-tower churches

    // ---- RAF Lakenheath: hardened aircraft shelters beyond the runway’s west end, the base’s wire
    props.rand = mulberry32(1985_101);
    for (const [x, z, yaw] of [[-440, 440, Math.PI / 2], [-440, 485, Math.PI / 2], [-440, 530, Math.PI / 2]]) if (free(x, z, 16)) { placed.push([x, z, 16]); props.aircraftShelter({ x, z, yaw }); }
    props.fence({ x0: -360, x1: -70, z: 418, breaches: [[-225, -205]] });
    // ---- Barnham: the old weapons store’s bunkers behind their own wire on the heath
    for (const [x, z] of [[400, 285], [420, 240]]) if (free(x, z, 10)) { placed.push([x, z, 10]); props.hall({ x, z, yaw: 0.2, width: 14, depth: 10, height: 4, color: 0x7e7a70, door: 4, name: 'weapons store bunker' }); }
    // ---- RAF Feltwell, the airborne’s airhead: the old hangars’ revetments, dug-in tents and crates, a downed transport
    props.rand = mulberry32(1985_102);
    for (const [x, z, yaw] of [[-440, -440, -Math.PI / 2], [-440, -485, -Math.PI / 2], [-440, -530, -Math.PI / 2]]) if (free(x, z, 16)) { placed.push([x, z, 16]); props.aircraftShelter({ x, z, yaw }); }
    for (const [x, z, yaw] of [[60, -420, 0.3], [78, -436, 1.2], [50, -446, 2.0]]) if (free(x, z, 4)) { placed.push([x, z, 4]); props.tent({ x, z, yaw }); }
    for (const [x, z] of [[66, -404], [38, -430]]) if (free(x, z, 3)) { placed.push([x, z, 3]); props.crates({ x, z, yaw: 0.4 }); }
    if (free(120, -470, 18)) { placed.push([120, -470, 18]); props.aircraftWreck({ x: 120, z: -470, yaw: 0.7, scale: 1.3 }); }
    if (free(-120, 390, 18)) { placed.push([-120, 390, 18]); props.aircraftWreck({ x: -120, z: 390, yaw: 2.3 }); }

    // ---- cover: farmsteads, flint walls, hay, wrecks, as many on each half, each half its own dice
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'wrecks', 'hay', 'fieldwall', 'roadblock'];
    for (const side of [1, -1]) {
      for (let tries = 0, n = 0; n < 110 && tries < 9000; tries++) {
        const x = (rand() * 2 - 1) * (bounds.x - 20), z = side * (10 + rand() * (bounds.z - 30));
        if (Math.sign(z - ouseZ(x)) !== side) continue;
        if (Math.hypot(x, z - side * BASE_Z) < 45 || nearPoint(x, z, 40) || !free(x, z, 12) || wet(x, z, 8) || inWood(x, z)
          || inTown(THETFORD, x, z, 1.3) || inTown(CROXTON, x, z, 1.3) || inTown(BRANDON, x, z, 1.2)) continue;
        placed.push([x, z, 12]);
        buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
      }
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...river.crossings.map((c: any) => ({ x: c.x, z: c.z, r: river.halfWidth + 16 })),
      { test: (x: number, z: number) => wet(x, z, -4) || roadD(x, z) < 5 || onAirfield(x, z, 15) }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.006 + 70, z * 0.006, 3);
    const tN = 0.38, tP = evenThreshold(wood, tN, (x, z) => z > ouseZ(x));   // (shelter belts and copses: each half its own, the same in area)
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 8500, hedges: 2500, autumn: 0.05, broadleaf: 0.25,
      forest: (x: number, z: number) => {
        if (wet(x, z, -5)) return -1;
        if (inTown(THETFORD, x, z) || inTown(CROXTON, x, z) || inTown(BRANDON, x, z)) return 0.04;   // the towns’ gardens
        if (inWood(x, z)) return firebreak(x, z) ? 0 : 0.92;                                         // Thetford Forest’s compartments and rides
        if (wet(x, z, 4)) return 0.45;                                                                // alders and willows on the banks
        const hk = heathK(x, z);
        if (hk > 0.5) { const r = roadD(x, z); return r > 8 && r < 12 && fbm(noise, x * 0.05, z * 0.05, 1) > -0.2 ? 0.9 : 0.03; } // the pine “deals” along the heath roads
        return wood(x, z) > (z > ouseZ(x) ? tN : tP) ? 0.85 : 0;
      },
      noHedge: (x: number, z: number) => inTown(THETFORD, x, z, 1.2) || inTown(CROXTON, x, z, 1.2) || inTown(BRANDON, x, z, 1.1) || heathK(x, z) > 0.4 || inWood(x, z),
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
