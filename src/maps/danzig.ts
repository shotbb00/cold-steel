// Danzig, March–May 1807: Lefebvre’s X Corps — French, Poles, Saxons and Badeners, with Chasseloup’s engineers —
// laid siege to the old Hanseatic city, held by Kalckreuth with Prussians and Russians. The French opened their
// trenches before the Hagelsberg and the Bischofsberg, the two fortified heights west of the town; they cut the
// city off from the sea by taking the Holm island between the arms of the Vistula, beat off the Russian relief
// that Kamensky landed at Weichselmünde on 15 May, and on 24 May, with the breach ready before the Hagelsberg,
// Kalckreuth capitulated with the honours of war.
// On the map (1.0 × 1.12 km, a raw spring): the French come from their camp on the Praust road (south, +z), the
// garrison and its relief from Neufahrwasser and the sea (north, −z). The bastioned city in the middle — the
// Marienkirche over the Langer Markt, the Rathaus, the Artushof — with the Vistula down the east flank to the sea,
// its arm split round the Holm island and the Holm redoubt on it, a bridge over to it from the city, fords at its
// two ends; Weichselmünde’s square fort by the river mouth at the north edge. West of the city the two fortified
// heights, the Bischofsberg to the south and the Hagelsberg to the north, the Stolzenberg plateau behind.
// Lefebvre’s parallels before the French, the garrison’s covered way before the Prussians.
// Not mirrored but fair: the river runs down the flank, not between the sides, and its fords lie as far from either
// base; the city and the Holm — the decisive ground — stand in the middle, owned by neither. The Bischofsberg before
// the French is traded for the Hagelsberg before the Prussians (the same height, the same works), Weichselmünde’s
// fort for the French redoubt at Ohra, Schidlitz for Langfuhr, the parallels for the covered way; each point as
// far from the nearer base as its counterpart (tools/map_fairness.py).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const noise = createNoise2D(1807_0524);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Praust road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Schidlitz', x: -370, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Bischofsberg', x: -130, z: 230, owner: null, sector: 'centre', radius: 24 },
  { id: 'D', name: 'Ohra redoubt', x: 260, z: 320, owner: null, sector: 'east' },
  { id: 'E', name: 'Stolzenberg', x: -330, z: 30, owner: null, sector: 'west' },
  { id: 'F', name: 'Langer Markt', x: 60, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Holm redoubt', x: 385, z: -10, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Langfuhr', x: -330, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Hagelsberg', x: -140, z: -240, owner: null, sector: 'centre', radius: 24 },
  { id: 'J', name: 'Weichselmünde', x: 330, z: -370, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Neufahrwasser', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Vistula down the east flank, flowing north (−z) to the sea; its arm split round the Holm island
const WEICHSEL = [[456, 720], [448, 400], [454, 200], [452, 0], [456, -200], [448, -420], [440, -720]];
const ARM = [[452, 210], [392, 175], [334, 110], [318, 0], [334, -110], [392, -175], [454, -210]];
const river = createRiver({
  paths: [WEICHSEL, ARM],
  halfWidth: 13, level: 0, depth: 2.8, valley: 40,
  crossings: [
    { name: 'Holm bridge', x: 318, z: 0, kind: 'bridge', width: 8, channel: 1 },
    { name: 'Holm ford (south)', x: 372, z: 162, kind: 'ford', width: 10, channel: 1 },
    { name: 'Holm ford (north)', x: 372, z: -162, kind: 'ford', width: 10, channel: 1 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };   // (props only: never in the height)
/** On the Holm, between the arms (a plain box: the island’s extent). */
const onHolm = (x, z) => Math.abs(z) < 170 && x > 345 && x < 438;
/** Inside the city’s bastioned ring. */
const CITY = { x: 70, z: 0, rx: 175, rz: 140 };
const cityQ = (x, z) => Math.hypot((x - CITY.x) / CITY.rx, (z - CITY.z) / CITY.rz);

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Olivaer Wald on the wooded heights behind Langfuhr, the Stolzenberg’s copses, the Holm’s willows
const WOODS = [[-430, -180, 60, 90, 0.2], [-430, 180, 55, 70, -0.3], [-250, 140, 40, 30, 0.6], [-240, -130, 40, 30, -0.4]];
const woods = (x, z) => {
  let k = smoothstep(0.58, 0.72, fbm(noise, x * 0.006 + 19, z * 0.006 - 7, 3)) * 0.7;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 55, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(14, 30, Math.hypot(x - c.x, z - c.z)));
  k = Math.min(k, smoothstep(40, 60, Math.hypot(x - P.G.x, z - P.G.z)));
  return Math.min(k, smoothstep(1.1, 1.35, cityQ(x, z)));                            // (no wood on the glacis)
};

function height(x, z) {
  let h = fbm(noise, x * 0.0022, z * 0.0022, 3) * 3 + fbm(noise, x * 0.02 + 3, z * 0.02, 3) * 0.4 + 3;
  h += smoothstep(-60, -380, x) * 7;                                                // the Stolzenberg plateau, west of the town
  h += hill(x, z, P.C.x, P.C.z, 75, 11) + hill(x, z, P.C.x - 60, P.C.z + 20, 60, 4);  // the Bischofsberg
  h += hill(x, z, P.I.x, P.I.z, 75, 11) + hill(x, z, P.I.x - 55, P.I.z - 30, 60, 4);  // the Hagelsberg
  h += smoothstep(380, 600, z) * 9 + smoothstep(380, 600, -z) * 6;                   // the rise behind the French camp, the dunes by the sea
  const ring = Math.exp(-(((cityQ(x, z) - 1.12) / 0.07) ** 2));                     // the glacis: a low bank round the works
  h += ring * 1.6 * smoothstep(290, 240, x);
  h += (4 - h) * smoothstep(1.05, 0.9, cityQ(x, z)) * 0.7;                          // the town on its level ground
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, -x) * 26;
  h += smoothstep(BOUNDS.x + 20, BOUNDS.x + 160, x) * 6;                            // (the low Nehrung)
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 22;
  for (const p of POINTS) if (!'CFI'.includes(p.id)) h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6;
  for (const p of [P.C, P.I]) h += (h * 0.9 + 1 - h) * smoothstep(40, 22, Math.hypot(x - p.x, z - p.z)) * 0.6;   // (the forts’ level terrepleins)
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'danzig',
  armies: { nato: ['fr'], pact: ['pr', 'ru'] }, // (Lefebvre’s X Corps against Kalckreuth’s Prussians and Kamensky’s Russians)
  name: 'Danzig',
  description: 'The siege of Danzig, March–May 1807: Lefebvre’s trenches before the walled Hanseatic city — the Hagelsberg and Bischofsberg forts on the heights west of it, the Holm between the arms of the Vistula, Weichselmünde by the sea.',
  epochs: ['1806'],
  region: 'east',
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180705,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  airfields: [],
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1807_05, cell: 78, weights: [0.32, 0.18, 0.32, 0.18] }), // spring: young green, fresh ploughland

  theme: {
    // a cool Baltic spring: grey-blue sky off the sea, a thin haze, the trees just leafing
    fogColor: 0xb4bcc0,
    fogDensity: 0.0014,
    skyTop: 0x6a86a4,
    skyHorizon: 0xc6d0d4,
    skyBottom: 0x7a8278,
    sunColor: 0xf6eedc,
    sunIntensity: 1.7,
    sunDisk: 0.3,
    clouds: 0.6,
    cloudLight: 0xe2e6e8,
    cloudDark: 0x86909a,
    sunDir: [0.45, 0.5, 0.7],
    hemiSky: 0xc4d0dc,
    hemiGround: 0x4c5038,
    hemiIntensity: 1.3,
    rimColor: 0xc8d2dc,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5e7040',
      grassAlt: '#526438',
      dryGrass: '#8a8458',
      dirt: '#5a4a38',
      rock: '#6e6a62',
      strip: '#4a3e30',
      pasture: '#627440',
      ploughed: '#4e3e2e',
      stubble: '#867a54',
      meadow: '#6c7e44',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (cityQ(x, z) < 0.98) return [0x6a6050, 0.45];                              // the streets
        if (onHolm(x, z)) return [0x5e7444, 0.4];                                       // the Holm’s wet meadows
        if (Math.hypot(x - P.C.x, z - P.C.z) < 44 || Math.hypot(x - P.I.x, z - P.I.z) < 44) return [0x6a6248, 0.4]; // (the forts’ bare earth)
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0] } },
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
    /** A wall from (x0, z0) to (x1, z1). */
    const seg = (x0, z0, x1, z1, height, thickness = 1.2) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height, thickness });
    /** A square bastioned work: four curtains (a 14 m gate in each side named in `gates`: n −z, s +z, w −x, e +x), a bastion on each corner. */
    const fort = (cx, cz, S, gates: string, h = 3.2) => {
      for (const [side, x0, z0, x1, z1] of [['n', -S, -S, S, -S], ['s', -S, S, S, S], ['w', -S, -S, -S, S], ['e', S, -S, S, S]] as const) {
        if (!gates.includes(side)) { seg(cx + x0, cz + z0, cx + x1, cz + z1, h); continue; }
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, ux = Math.sign(x1 - x0) * 7, uz = Math.sign(z1 - z0) * 7;
        seg(cx + x0, cz + z0, cx + mx - ux, cz + mz - uz, h);
        seg(cx + mx + ux, cz + mz + uz, cx + x1, cz + z1, h);
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const x = cx + sx * S, z = cz + sz * S, tx = x + sx * 12, tz = z + sz * 12;
        seg(x, z - sz * 12, tx, tz, h);
        seg(x - sx * 12, z, tx, tz, h);
      }
    };
    // the streets kept open: the Langgasse east–west to the Holm bridge, the street north–south past the market
    const street = (x, z) => Math.abs(x - P.F.x) < 7 || Math.abs(z) < 7;
    const gate = (x, z) => Math.abs(x - P.F.x) < 12 || Math.abs(z) < 12;

    // ---- the city: tall gabled houses inside the ring, the Langer Markt open
    const rr = mulberry32(1807_051);
    const taken: number[][] = [];
    for (let i = 0; i < 280 && taken.length < 56; i++) {
      const x = CITY.x - CITY.rx + rr() * CITY.rx * 2, z = CITY.z - CITY.rz + rr() * CITY.rz * 2;
      if (cityQ(x, z) > 0.86 || street(x, z) || Math.hypot(x - P.F.x, z - P.F.z) < 34 || Math.hypot(x - P.F.x + 20, z - P.F.z + 52) < 30 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 9, storeys: rr() < 0.4 ? 2 : 3, damaged: rr() < 0.15 ? 1 : 0 }); // (some shelled)
    }
    props.rand = mulberry32(1807_052);
    props.church({ x: P.F.x - 20, z: P.F.z - 52, yaw: Math.PI / 2 });                                      // (the Marienkirche)
    { const g = terrain.heightAt(P.F.x - 20, P.F.z - 74); props.box('stone', P.F.x - 20, g + 13, P.F.z - 74, 10, 26, 10, 0, 0x8a5a46); } // (its great brick tower)
    props.hall({ x: P.F.x + 30, z: P.F.z + 26, yaw: 0, width: 14, depth: 10, height: 9, color: 0x9a6a52, roof: 0x3e4a42, door: 4, name: 'Rathaus' });
    props.hall({ x: P.F.x - 34, z: P.F.z + 26, yaw: 0, width: 18, depth: 10, height: 8, color: 0xb0a48c, roof: 0x4a3a2e, door: 5, name: 'Artushof' });
    props.hall({ x: P.F.x + 120, z: P.F.z - 40, yaw: Math.PI / 2, width: 22, depth: 10, height: 10, color: 0x8a5a46, roof: 0x4a3226, door: 4, name: 'the Crane gate' }); // (the Krantor on the Mottlau)

    // ---- the ring: curtains, eight bastions, gates where the streets go out
    const N = 72, at = (a, k = 1) => [CITY.x + Math.cos(a) * CITY.rx * k, CITY.z + Math.sin(a) * CITY.rz * k];
    for (let i = 0; i < N; i++) {
      const [x0, z0] = at((i / N) * Math.PI * 2), [x1, z1] = at(((i + 1) / N) * Math.PI * 2);
      if (gate((x0 + x1) / 2, (z0 + z1) / 2)) continue;
      seg(x0, z0, x1, z1, 3.4, 1);
    }
    for (let b = 0; b < 8; b++) {
      const a = (b / 8) * Math.PI * 2 + Math.PI / 8, [tx, tz] = at(a, 1.14), [lx, lz] = at(a - 0.11), [qx, qz] = at(a + 0.11);
      if (gate(tx, tz)) continue;
      seg(lx, lz, tx, tz, 3.4);
      seg(qx, qz, tx, tz, 3.4);
    }

    // ---- the two fortified heights: a bastioned work on each crest, open toward the town
    fort(P.C.x, P.C.z, 26, 'en');
    fort(P.I.x, P.I.z, 26, 'es');
    for (const p of [P.C, P.I]) props.hall({ x: p.x + 4, z: p.z - Math.sign(p.z) * 8, yaw: 0, width: 14, depth: 7, height: 4, color: 0x8a7c66, roof: 0x4a3a2e, door: 3, name: 'casemate' });
    // ---- the Holm redoubt; Weichselmünde’s square fort and its round tower; the French redoubt at Ohra
    fort(P.G.x, P.G.z, 20, 'wns', 2.6);
    fort(P.J.x, P.J.z, 28, 'wse');
    { const g = terrain.heightAt(P.J.x, P.J.z - 6); props.box('stone', P.J.x, g + 7, P.J.z - 6, 9, 14, 9, 0.4, 0x8a5a48); props.box('stone', P.J.x, g + 14.6, P.J.z - 6, 10, 1.2, 10, 0.4, 0x5a3a2a); } // (the old lighthouse tower)
    const star = (cx, cz, R, r) => {
      const pts: number[][] = [];
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + Math.PI / 10, d = k % 2 ? r : R; pts.push([cx + Math.cos(a) * d, cz + Math.sin(a) * d]); }
      for (let k = 0; k < 10; k++) {
        const [x0, z0] = pts[k], [x1, z1] = pts[(k + 1) % 10];
        if (Math.abs((z0 + z1) / 2 - cz) > R * 0.6 && Math.abs((x0 + x1) / 2 - cx) < R * 0.35) continue; // (the gates)
        seg(x0, z0, x1, z1, 2.4);
      }
    };
    star(P.D.x, P.D.z, 42, 26);
    buildVillage(props, { x: P.D.x + 60, z: P.D.z + 10 }, 1807_053);

    // ---- Lefebvre’s parallels before the French, the garrison’s covered way before the Prussians; the batteries
    for (const sz of [1, -1]) for (const [x0, x1] of [[-300, -200], [-70, 40], [140, 230]] as const) {
      const z = sz * 175 + (x0 + x1) * 0.03 * sz;
      props.wall({ x: (x0 + x1) / 2, z, yaw: 0, length: x1 - x0, height: 1.3, thickness: 1.4 });
    }
    for (const [x, z] of [[-150, 160], [180, 190], [-160, -160], [190, -190]] as const) props.sandbagRing({ x, z, radius: 6, toward: -Math.sign(z) });

    // ---- the suburbs and villages, farms on the plateau
    for (const p of POINTS) if (!p.owner && !'CDFGIJ'.includes(p.id)) buildVillage(props, p, 18075 + Math.round(p.x * 3 + p.z * 7));
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'fieldwall', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 64 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 65) || woods(x, z) > 0.3 || wet(x, z, 30) || onHolm(x, z)
        || cityQ(x, z) < 1.35 || Math.abs(Math.abs(z) - 178) < 22) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xcfc8b0]] as const) {
      props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.tent({ x: base.x - 14, z: base.z - toward * 9, yaw: 0.1, color: canvas });
      props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 26 })),
      { test: (x, z) => wet(x, z, 1.5) || cityQ(x, z) < 1.2 || [P.C, P.I, P.G, P.J, P.D].some((p) => Math.hypot(x - p.x, z - p.z) < 52) || Math.abs(Math.abs(z) - 178) < 10 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2600, broadleaf: 0.6, autumn: 0, forest: (x, z) => (wet(x, z, 10) || onHolm(x, z) ? 0.3 : woods(x, z) * 0.9) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x, z) => onHolm(x, z) }], count: 1400, lane: 0 });
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
