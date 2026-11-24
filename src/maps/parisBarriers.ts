// The barrières of Paris (hypothetical, spring 1807; the real fight came on 30 March 1814, when Schwarzenberg’s
// Austrians, Russians and Prussians stormed the heights north and east of the city and Marmont and Mortier held the
// Belleville ridge and the butte of Montmartre until the city capitulated that night). Here the Coalition has come
// through Champagne and attacks the city from the north-east as it did seven years later.
// On the map (1.0 × 1.12 km, a spring morning): the French hold the faubourgs inside the wall (+z, the Porte
// Saint-Denis behind them), the Coalition comes down the Meaux road past Pantin (−z). Across the middle the wall of
// the Farmers-General, the tax wall of 1785–90: three metres of masonry with Ledoux’s toll houses at its barrières —
// the Rotonde de la Villette at the head of the new basin, the Barrière Blanche under Montmartre, those of
// Poissonnière, du Combat, Belleville and Ménilmontant. West of the field the butte of Montmartre with its windmills,
// its church and its gypsum quarries; east the long Belleville–Ménilmontant ridge, the new cemetery of Père-Lachaise
// on Mont-Louis at its south end and the Romainville plateau with its wood at its north. The Canal de l’Ourcq (being
// dug since 1802) runs from the Bassin de la Villette out past La Villette towards Pantin, the Seine at Saint-Ouen
// along the west edge.
// Not mirrored but fair: the wall runs across the field between the sides, every barrière as near one base as the
// other; Montmartre, the Rotonde and Belleville — the decisive heights and the gate — stand on it, owned by neither.
// Mont-Louis before the French right is traded for the Romainville plateau before the Coalition’s left, Monceau’s
// park for the clos of La Chapelle, the Hôpital Saint-Louis for La Villette; the canal splits the Coalition’s half,
// the faubourgs’ streets and garden walls the French one (tools/map_fairness.py). 1806 only (`epochs`).
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
const noise = createNoise2D(1814_0330);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Porte Saint-Denis', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Monceau', x: -340, z: 290, owner: null, sector: 'west' },
  { id: 'C', name: 'Hôpital Saint-Louis', x: 60, z: 270, owner: null, sector: 'centre' },
  { id: 'D', name: 'Mont-Louis', x: 360, z: 320, owner: null, sector: 'east' },
  { id: 'E', name: 'Montmartre', x: -300, z: -25, owner: null, sector: 'west', radius: 28 },
  { id: 'F', name: 'Barrière de la Villette', x: 20, z: 28, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Belleville', x: 330, z: -5, owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'La Chapelle', x: -320, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'La Villette', x: -20, z: -270, owner: null, sector: 'centre' },
  { id: 'J', name: 'Romainville', x: 350, z: -330, owner: null, sector: 'east' },
  { id: 'K', name: 'Pantin road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

/** The wall of the Farmers-General (its line across the field), and the barrières where the roads go through. */
const wallZ = (x) => 28 + 12 * Math.sin(x * 0.004 + 0.3);
const GATES = [-430, -290, -150, 20, 180, 330, 460];
const ROTONDE = { x: 20, z: 58 };       // Ledoux’s rotunda beside the gate, inside the wall
const MONT = { x: -300, z: -25 };       // the butte’s top
const HOSP = { x: 130, z: 280 };        // the Hôpital Saint-Louis: four ranges round a court

// the Seine past Saint-Ouen down the west edge, and the Canal de l’Ourcq: the Bassin de la Villette, then the cut
const SEINE = [[-548, -720, 42], [-526, -300, 42], [-534, 200, 42], [-552, 720, 42]];
const CANAL = [[40, -36, 16], [52, -150, 16], [58, -168, 6], [80, -300, 6], [104, -460, 6], [130, -720, 6]];
const river = createRiver({
  paths: [CANAL, SEINE],
  halfWidth: 6, level: 0, depth: 2.4, valley: 26,
  crossings: [
    { name: 'Pont de Flandre', x: 66, z: -215, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Écluse de la Villette', x: 86, z: -340, kind: 'bridge', width: 6, channel: 0 },
    { name: 'Pont de Pantin', x: 108, z: -480, kind: 'bridge', width: 8, channel: 0 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
/** The faubourgs: the built-up streets inside the wall. */
const inside = (x, z) => z > wallZ(x) + 6;

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the park of Monceau (French left), the cemetery’s groves on Mont-Louis (French right), the Bois de Romainville
// (Coalition left), the clos and orchards behind La Chapelle (Coalition right)
const WOODS = [[-420, 380, 70, 50, 0.3], [440, 400, 55, 60, 0.2], [440, -430, 70, 55, -0.2], [-430, -420, 60, 45, 0.4]];
const woods = (x, z) => {
  let k = smoothstep(0.64, 0.78, fbm(noise, x * 0.006 + 9, z * 0.006 - 21, 3)) * 0.6;   // (market gardens and vineyards: few trees)
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(10, 30, Math.abs(z - wallZ(x))));
};

function height(x, z) {
  let h = fbm(noise, x * 0.0024, z * 0.0024, 3) * 2.5 + fbm(noise, x * 0.02 + 5, z * 0.02, 3) * 0.4 + 4;
  h -= smoothstep(-300, -520, x) * 3;                                              // down to the Seine
  // Montmartre: a steep round butte, flat on top
  const m = Math.hypot(x - MONT.x, z - MONT.z);
  h += 26 * smoothstep(125, 45, m + fbm(noise, x * 0.015, z * 0.015, 2) * 14);
  // the Belleville–Ménilmontant ridge, long from Mont-Louis to Romainville, highest at Belleville
  const rx = x - (360 + 25 * Math.sin(z * 0.006)), across = Math.abs(rx) / (95 + 30 * smoothstep(100, 400, Math.abs(z)));
  h += 20 * Math.exp(-(across ** 2)) * (0.55 + 0.45 * Math.exp(-(((z + 5) / 260) ** 2)));
  h += hill(x, z, 420, 330, 90, 4) + hill(x, z, 410, -360, 100, 4);                // (Mont-Louis; the Romainville plateau’s brow)
  h += hill(x, z, -380, 300, 110, 2.5) + hill(x, z, -150, -330, 120, 2);           // (Monceau’s rise; the swell by La Chapelle)
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, x) * 24 + smoothstep(BOUNDS.x - 10, BOUNDS.x + 160, -x) * 6;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  for (const p of POINTS) if (!'EFG'.includes(p.id)) h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'paris-barriers',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Schwarzenberg’s Austrians and Barclay’s Russians, as in 1814; Austria’s own army is still to come)
  name: 'Paris barrières',
  description: 'The approaches to Paris, as it might have gone in 1807 (the real fight came in March 1814): the Coalition storms the heights north and east of the city — the butte of Montmartre and its windmills, the Belleville ridge, the toll houses of the Farmers-General wall, La Villette and the Canal de l’Ourcq.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1814,
  height,
  river,
  airfields: [],
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1814, cell: 60, weights: [0.36, 0.26, 0.14, 0.24] }), // spring: market gardens, vines, meadow

  theme: {
    // a clear spring morning, smoke of the city to the south
    fogColor: 0xbcc0c0,
    fogDensity: 0.0013,
    skyTop: 0x6888b0,
    skyHorizon: 0xccd2d4,
    skyBottom: 0x7c8078,
    sunColor: 0xfff0d4,
    sunIntensity: 1.9,
    sunDisk: 0.45,
    clouds: 0.45,
    cloudLight: 0xeeeeec,
    cloudDark: 0x949ca6,
    sunDir: [0.5, 0.5, 0.55],
    hemiSky: 0xc6d0dc,
    hemiGround: 0x4e4c36,
    hemiIntensity: 1.25,
    rimColor: 0xd0d6dc,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5c6c38',
      grassAlt: '#506232',
      dryGrass: '#8c8452',
      dirt: '#5e4e3a',
      rock: '#b8ae96',
      strip: '#4e4232',
      pasture: '#5e7038',
      ploughed: '#5a4832',
      stubble: '#8e8a56',
      meadow: '#6a7a3e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const m = Math.hypot(x - MONT.x, z - MONT.z);
        if (m > 55 && m < 115 && fbm(noise, x * 0.03 + 4, z * 0.03, 2) > 0.12) return [0xc4baa0, 0.6];  // the gypsum quarries in the butte’s flanks
        if (inside(x, z) && z < 500 && (Math.abs(x) < 26 || Math.abs(x + 200) < 18 || Math.abs(x - 200) < 18)) return [0x7a6e5c, 0.4]; // the faubourgs’ streets
        if (Math.abs(z - wallZ(x)) < 14) return [0x7a7058, 0.35];                                       // the boulevard along the wall
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
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
    const gateAt = (x, w) => GATES.some((g) => Math.abs(x - g) < w);
    /** A wall from (x0, z0) to (x1, z1). */
    const seg = (x0, z0, x1, z1, height, thickness = 0.9) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height, thickness });
    const windmill = (x, z) => {
      const g = terrain.heightAt(x, z), yaw = (x * 7 + z * 3) % 6;
      props.box('plain', x, g + 2, z, 1.2, 4, 1.2, 0, 0x4a3c2e);
      props.box('plain', x, g + 6.5, z, 4.2, 5, 3.4, yaw, 0x7a6450);
      props.box('plain', x, g + 9.3, z, 4.4, 0.8, 3.8, yaw, 0x4a3a30, 0.25);
      const fx = Math.sin(yaw) * 2.2, fz = Math.cos(yaw) * 2.2;
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + 0.5;
        props.box('plain', x + fx + Math.cos(a) * Math.cos(yaw) * 4.5, g + 7 + Math.sin(a) * 4.5, z + fz - Math.cos(a) * Math.sin(yaw) * 4.5, 9, 1.2, 0.15, yaw, 0xcfc6b0, 0, a);
      }
      cover.addBox({ x, z, yaw, length: 4.2, thickness: 3.4, height: 8 });
    };

    // ---- the wall of the Farmers-General, broken only at the barrières; a pair of Ledoux’s toll houses at each
    const N = 120;
    for (let i = 0; i < N; i++) {
      const x0 = -bounds.x - 20 + (i / N) * (bounds.x * 2 + 40), x1 = -bounds.x - 20 + ((i + 1) / N) * (bounds.x * 2 + 40);
      if (gateAt((x0 + x1) / 2, 11)) continue;
      seg(x0, wallZ(x0), x1, wallZ(x1), 3.2);
    }
    props.rand = mulberry32(1814_1);
    for (const gx of GATES) {
      if (gx === 20) continue;                                                     // (the Villette gate has the Rotonde)
      for (const s of [-1, 1]) props.hall({ x: gx + s * 19, z: wallZ(gx) + 11, yaw: 0, width: 9, depth: 9, height: 6, color: 0xc8bea6, roof: 0x5a5c60, door: 3, name: 'barrière (toll house)' });
    }
    // the Rotonde de la Villette: a drum on a square base, its colonnade round the top
    {
      const R = ROTONDE, g = terrain.heightAt(R.x, R.z);
      props.hall({ x: R.x, z: R.z, yaw: 0, width: 22, depth: 22, height: 7, color: 0xd0c6ae, roof: 0x5a5c60, door: 4, name: 'Rotonde de la Villette' });
      props.box('stone', R.x, g + 10.5, R.z, 15, 6, 15, Math.PI / 4, 0xd4cab2);
      props.box('stone', R.x, g + 10.5, R.z, 15, 6, 15, 0, 0xd4cab2);
      props.box('metal', R.x, g + 14, R.z, 13, 1, 13, Math.PI / 8, 0x5a5c60);
      cover.addBox({ x: R.x, z: R.z, yaw: 0, length: 15, thickness: 15, height: 13 });
    }

    // ---- Montmartre: the windmills round the top, the church of Saint-Pierre and the abbey’s ruin, a few houses
    const MILLS = [[-262, -62], [-340, -50], [-340, -5], [-262, -2], [-300, -78], [-246, -26]];
    for (const [x, z] of MILLS) windmill(x, z);
    windmill(392, -60); windmill(404, 50);                                         // (Belleville’s two mills)
    props.rand = mulberry32(1814_2);
    props.church({ x: MONT.x - 48, z: MONT.z + 28, yaw: 0.4 });
    for (const [x, z, yaw] of [[-250, 40, 0.3], [-360, -20, 1.5], [-320, 50, 0.1], [-230, -70, 0.8]] as const) props.townHouse({ x, z, yaw, width: 8, depth: 8, storeys: 2, damaged: 0 });

    // ---- Belleville on its ridge: the church, the guinguettes along the street
    props.church({ x: P.G.x + 44, z: P.G.z + 30, yaw: Math.PI / 2 });
    for (const [x, z, yaw] of [[290, -40, 0], [370, -40, 0], [300, 46, Math.PI / 2], [362, 48, 0], [270, 10, Math.PI / 2]] as const) props.townHouse({ x, z, yaw, width: 8, depth: 8, storeys: 2, damaged: 0 });

    // ---- the faubourgs inside the wall: the rows along the Faubourgs Montmartre, Saint-Denis and du Temple
    const rr = mulberry32(1814_3);
    const taken: number[][] = [[HOSP.x, HOSP.z], [ROTONDE.x, ROTONDE.z]];
    for (let i = 0; i < 2400 && taken.length < 140; i++) {
      const x = (rr() * 2 - 1) * 470, z = 70 + rr() * 440;
      if (!inside(x, z + 20) || Math.abs(x) < 9 || Math.abs(x + 200) < 9 || Math.abs(x - 200) < 9) continue;
      const roadside = Math.min(Math.abs(Math.abs(x) - 22), Math.abs(Math.abs(x + 200) - 22), Math.abs(Math.abs(x - 200) - 22)) < 10;
      if (!roadside && rr() > 0.12) continue;                                      // (between the streets: gardens and marais)
      if (nearPoint(x, z, 40) || Math.hypot(x, z - BASE_Z) < 60 || Math.abs(x - HOSP.x) < 48 && Math.abs(z - HOSP.z) < 48
        || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 12.5) || woods(x, z) > 0.3) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.5 ? 2 : 3, damaged: 0 });
    }
    // the Hôpital Saint-Louis: four long ranges round a court, its chapel
    {
      const C = HOSP, g0 = terrain.heightAt(C.x, C.z);
      for (const [dx, dz, yaw, len] of [[0, -30, 0, 66], [0, 30, 0, 66], [-32, 0, Math.PI / 2, 46], [32, 0, Math.PI / 2, 46]] as const) {
        props.box('stone', C.x + dx, g0 + 4, C.z + dz, len, 9, 6, yaw, 0xb8a48a);
        props.box('stone', C.x + dx, g0 + 9.8, C.z + dz, len + 0.4, 2.4, 4.4, yaw, 0x4a4c52);
        cover.addBox({ x: C.x + dx, z: C.z + dz, yaw, length: len, thickness: 6, height: 9 });
      }
    }
    props.church({ x: P.D.x - 40, z: P.D.z + 36, yaw: 0 });                       // (the chapel on Mont-Louis, the cemetery’s gate)
    for (let k = 0; k < 40; k++) {                                                 // (the cemetery’s first tombs)
      const x = P.D.x + 30 + (k % 8) * 6, z = P.D.z - 40 + Math.floor(k / 8) * 8;
      props.box('stone', x, terrain.heightAt(x, z) + 0.6, z, 1.2, 1.2, 0.5, 0, 0x9a968c);
    }

    // ---- the villages outside the wall; the canal’s towpath stores
    for (const p of POINTS) if (!p.owner && 'BHIJ'.includes(p.id)) buildVillage(props, p, 18146 + Math.round(p.x * 3 + p.z * 7));
    props.rand = mulberry32(1814_4);
    props.church({ x: P.I.x - 40, z: P.I.z + 20, yaw: Math.PI / 2 });
    props.church({ x: P.H.x + 40, z: P.H.z - 24, yaw: 0 });
    for (const [x, z] of [[22, -90], [22, -130], [86, -100]] as const) props.hall({ x, z, yaw: Math.PI / 2, width: 22, depth: 10, height: 7, color: 0xa09078, roof: 0x5a4436, door: 4, name: 'entrepôt' });
    for (const [x, z] of [[-40, -250], [40, -330], [-60, -320]] as const) props.townHouse({ x, z, yaw: Math.PI / 2, width: 8, depth: 8, storeys: 2, damaged: 0 });

    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'farm', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 60 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 56 * 56)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 60) || woods(x, z) > 0.3 || wet(x, z, 24)
        || Math.abs(z - wallZ(x)) < 30 || inside(x, z) && Math.min(Math.abs(x), Math.abs(x + 200), Math.abs(x - 200)) < 50
        || Math.hypot(x - MONT.x, z - MONT.z) < 110 || Math.abs(x - HOSP.x) < 60 && Math.abs(z - HOSP.z) < 60) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);

    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xcfc8b0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 24 })), ...MILLS.map(([x, z]) => ({ x, z, r: 10 })),
      { test: (x, z) => wet(x, z, 2) || Math.abs(z - wallZ(x)) < 8 || Math.abs(x - HOSP.x) < 40 && Math.abs(z - HOSP.z) < 40
        || inside(x, z) && (Math.abs(x) < 10 || Math.abs(x + 200) < 10 || Math.abs(x - 200) < 10) || Math.hypot(x - MONT.x, z - MONT.z) < 70 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 2600, broadleaf: 0.8, autumn: 0, forest: (x, z) => (wet(x, z, 10) ? 0.4 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 900, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.6, fields: this.fields });

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
