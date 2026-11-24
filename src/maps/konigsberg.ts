// Königsberg, June 1807: while Napoleon beat Bennigsen at Friedland, Soult’s IV Corps and Murat’s cavalry marched on the
// capital of East Prussia, where Lestocq’s Prussians and Kamensky’s Russian division stood behind the earthwork ring
// thrown round the city that spring. Soult closed up from the south on 13–14 June and attacked the suburbs; after
// Friedland the garrison slipped away down the road to Labiau and Tilsit, and the French marched in on 16 June.
// On the map (the big field, 1.0 × 1.12 km): the French come up the Brandenburg road (south, +z), the Prussians and the
// Russians hold the Labiau road (north, −z). The Pregel runs west through the middle of the city in its two arms, the
// Old Pregel and the New, round the Kneiphof with its cathedral and the Lomse beyond — with the seven bridges Euler
// counted: the Krämer- and the Schmiedebrücke onto the Kneiphof from the Altstadt, the Grüne and the Köttelbrücke from
// the Vorstadt, the Honigbrücke over the cut to the Lomse, the Holz- and the Hohe Brücke from the Lomse to either bank.
// The castle on its rise over the Altstadt, the Haberberg with its church over the Vorstadt; the earthwork ring round
// the whole, open at its gates and broken in many places; the Holländer Baum (the boom where the Pregel leaves the city,
// a broad shallow) down the west, the Lomse’s gardens to the east.
// Not mirrored but fair: the Pregel runs between the sides, but its two arms and every bridge and ford lie as far from
// either base — three bridges each side onto the islands, a ford onto the Lomse from each bank, the Holländer Baum’s
// shallows between them. The Kneiphof, the Lomse and the boom — the decisive ground — stand on the river, owned by
// neither. The castle and its rise are traded for the Haberberg and its church, Ponarth for Juditten, Rosenau for
// Kalthof, the Ponarth copse for the Kalthof wood, Soult’s batteries for the Prussian redans, each as far from the
// nearer base as its counterpart (tools/map_fairness.py). 1806 only (`epochs`).
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
const noise = createNoise2D(1606_1807);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Brandenburg road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Ponarth', x: -370, z: 310, owner: null, sector: 'west' },
  { id: 'C', name: 'Haberberg', x: -20, z: 225, owner: null, sector: 'centre' },
  { id: 'D', name: 'Rosenau', x: 290, z: 330, owner: null, sector: 'east' },
  { id: 'E', name: 'Holländer Baum', x: -420, z: 4, owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Kneiphof', x: -100, z: 0, owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Lomse', x: 390, z: 0, owner: null, sector: 'east' },
  { id: 'H', name: 'Juditten', x: -320, z: -320, owner: null, sector: 'west' },
  { id: 'I', name: 'Schloss', x: 20, z: -225, owner: null, sector: 'centre' },
  { id: 'J', name: 'Kalthof', x: 300, z: -330, owner: null, sector: 'east' },
  { id: 'K', name: 'Labiau road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Pregel (it flows west, −x): the Old Pregel (north) and the New (south) come in from the east apart, close round the
// Kneiphof and meet west of it; a cut between the Kneiphof and the Lomse; one river out past the Holländer Baum
const OLD = [[720, -122], [500, -104], [300, -78], [140, -62], [0, -62], [-130, -56], [-212, -16], [-240, 0]];
const NEW = OLD.map(([x, z]) => [x, -z]);
const OUT = [[-240, 0], [-400, 6], [-560, -6], [-720, 0]];
const CUT = [[95, -62, 8], [95, 62, 8]];
const river = createRiver({
  paths: [OLD, NEW, OUT, CUT],
  halfWidth: 11, level: 0, depth: 2.6, valley: 34,
  crossings: [
    { name: 'Krämerbrücke', x: -110, z: -58, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Schmiedebrücke', x: 10, z: -62, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Köttelbrücke', x: -110, z: 58, kind: 'bridge', width: 7, channel: 1 },
    { name: 'Grüne Brücke', x: 10, z: 62, kind: 'bridge', width: 7, channel: 1 },
    { name: 'Honigbrücke', x: 95, z: 0, kind: 'bridge', width: 6, channel: 3 },
    { name: 'Holzbrücke', x: 220, z: -70, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Hohe Brücke', x: 220, z: 70, kind: 'bridge', width: 7, channel: 1 },
    { name: 'Holländer Baum', x: -420, z: 4, kind: 'ford', width: 34, channel: 2, depth: 0.3 },
    { name: 'Lomse ford (north)', x: 430, z: -96, kind: 'ford', width: 12, channel: 0 },
    { name: 'Lomse ford (south)', x: 430, z: 96, kind: 'ford', width: 12, channel: 1 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
/** Inside the earthwork ring. */
const CITY = { x: 0, z: 0, rx: 300, rz: 270 };
const cityQ = (x, z) => Math.hypot((x - CITY.x) / CITY.rx, (z - CITY.z) / CITY.rz);
const CASTLE = { x: 95, z: -215 };      // the Schloss, a square round its court, over the Altstadt
const HABER = { x: -95, z: 235 };       // the Haberberg church over the Vorstadt
/** The island the cathedral stands on, and the Lomse (east of the cut). */
const onKneiphof = (x, z) => x > -225 && x < 85 && Math.abs(z) < 48;
const onLomse = (x, z) => x > 105 && Math.abs(z) < 50 + (x - 105) * 0.1;

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Ponarth copse and the Kalthof wood; the alders out by the Brandenburg and the Labiau roads
const WOODS = [[-450, 170, 55, 40, 0.3], [450, -175, 55, 40, 0.3], [190, 430, 65, 38, 0], [-190, -430, 65, 38, 0]];
const woods = (x, z) => {
  let k = smoothstep(0.62, 0.76, fbm(noise, x * 0.006 + 17, z * 0.006 - 3, 3)) * 0.7; // (Samland’s fields: open, a few clumps)
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(1.15, 1.4, cityQ(x, z)), smoothstep(150, 190, Math.abs(z)));   // (none in the town, nor in the Pregel meadows)
};

function height(x, z) {
  let h = fbm(noise, x * 0.0022, z * 0.0022, 3) * 2.5 + fbm(noise, x * 0.02 + 3, z * 0.02, 3) * 0.35 + 3;
  const tilt = 0.7 + 0.3 * Math.tanh((-x - 60) / 220);                               // (Samland’s higher ground in the west, the Pregel’s low land east)
  h += smoothstep(80, 300, Math.abs(z)) * 4 * tilt;                                   // the ground rising from the Pregel meadows
  h += smoothstep(380, 620, Math.abs(z)) * 9 * tilt;                                  // to the plateau on either side
  h += hill(x, z, CASTLE.x - 40, CASTLE.z + 15, 85, 4) + hill(x, z, HABER.x - 20, HABER.z, 85, 4); // the castle rise; the Haberberg
  h += hill(x, z, -330, -170, 110, 2.5) + hill(x, z, -330, 170, 110, 2.5);            // (the Juditten and the Ponarth swells)
  const ring = Math.exp(-(((cityQ(x, z) - 1.06) / 0.05) ** 2));                     // the rampart’s glacis
  h += ring * 1.4;
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 18;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 22;
  for (const p of POINTS) if (!'EFG'.includes(p.id)) h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'konigsberg',
  armies: { nato: ['fr'], pact: ['pr', 'ru'] }, // (Soult and Murat against Lestocq’s Prussians and Kamensky’s Russians)
  name: 'Königsberg',
  description: 'Königsberg, June 1807: Soult and Murat close on the capital of East Prussia, held by Lestocq’s Prussians and Kamensky’s Russians behind its earthwork ring — the castle over the Altstadt, the Pregel in two arms round the Kneiphof and its cathedral, the seven bridges.',
  epochs: ['1806'],
  region: 'east',
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1606,
  height,
  river,
  airfields: [],
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1606, cell: 74, weights: [0.3, 0.3, 0.2, 0.2] }), // June: rye in the ear, meadows

  theme: {
    // a bright June day on the Pregel, a breeze off the Haff
    fogColor: 0xb8c2c4,
    fogDensity: 0.0012,
    skyTop: 0x5c84b2,
    skyHorizon: 0xc8d4da,
    skyBottom: 0x7a8478,
    sunColor: 0xfff2d6,
    sunIntensity: 2.0,
    sunDisk: 0.5,
    clouds: 0.4,
    cloudLight: 0xf0f2f2,
    cloudDark: 0x98a2ac,
    sunDir: [0.4, 0.6, 0.6],
    hemiSky: 0xc8d4e0,
    hemiGround: 0x4c5034,
    hemiIntensity: 1.25,
    rimColor: 0xd0d8e0,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5a6c36',
      grassAlt: '#4e6232',
      dryGrass: '#8a8450',
      dirt: '#5a4a38',
      rock: '#6c6a62',
      strip: '#4c4030',
      pasture: '#5c7038',
      ploughed: '#54442f',
      stubble: '#9a9258',
      meadow: '#68783c',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 10, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const q = cityQ(x, z);
        if (q < 0.97 && Math.abs(z) > 80) return [0x8a7e6c, 0.45];                                    // the streets and yards of the town
        if (onKneiphof(x, z) || (q < 0.97 && onLomse(x, z))) return [0x8a7e6c, 0.45];
        if (q > 0.99 && q < 1.13) return [0x6a5c40, 0.35];                                            // the rampart’s dug earth
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 10, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 10, 300] } },
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
    const seg = (x0, z0, x1, z1, height, thickness = 2.2) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height, thickness });
    // the streets kept open: the one over the Schmiede- and the Grüne Brücke, the one over the Krämer- and the Köttelbrücke,
    // the Holzbrücke’s and the Hohe Brücke’s, and a street along each bank
    const street = (x, z) => Math.abs(x - 10) < 7 || Math.abs(x + 110) < 6 || Math.abs(x - 220) < 6 || Math.abs(Math.abs(z) - 150) < 6;
    const taken: number[][] = [[CASTLE.x, CASTLE.z], [HABER.x, HABER.z]];
    const clear = (x, z) => !street(x, z) && !wet(x, z, 7) && !nearPoint(x, z, 34) && !taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 11.5);

    // ---- the town: the Altstadt and the Löbenicht north of the river, the Vorstadt and the Haberberg south of it, the Kneiphof
    const rr = mulberry32(1606_1);
    for (let i = 0; i < 1400 && taken.length < 150; i++) {
      const x = CITY.x - CITY.rx + rr() * CITY.rx * 2, z = CITY.z - CITY.rz + rr() * CITY.rz * 2;
      if (cityQ(x, z) > 0.86 || !clear(x, z) || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 48 || Math.hypot(x - HABER.x, z - HABER.z) < 26 || Math.hypot(x + 20, z) < 34) continue;
      if (Math.abs(z) < 75 && !onKneiphof(x, z) && !onLomse(x, z)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.abs(z) < 90 ? 0 : rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.5 ? 2 : 3, damaged: 0 });
    }
    props.rand = mulberry32(1606_2);
    // the cathedral on the Kneiphof, its west front of two towers; the Kneiphof town hall
    props.church({ x: -20, z: 0, yaw: Math.PI / 2 });
    { const g = terrain.heightAt(-44, 0); for (const s of [-1, 1]) props.box('stone', -44, g + 11, s * 7, 6, 22, 6, 0, 0x9a5a42); }
    props.hall({ x: -175, z: 0, yaw: 0, width: 20, depth: 10, height: 8, color: 0xb09878, roof: 0x5a4436, door: 4, name: 'Kneiphof Rathaus' });
    // the castle: four ranges round the court, the tall west tower
    {
      const C = CASTLE, g0 = terrain.heightAt(C.x, C.z), BRICK = 0x9a5040;
      for (const [dx, dz, yaw, len] of [[0, -24, 0, 56], [0, 24, 0, 56], [-26, 0, Math.PI / 2, 40], [26, 0, Math.PI / 2, 40]] as const) {
        props.box('stone', C.x + dx, g0 + 4, C.z + dz, len, 9, 5, yaw, BRICK);
        props.box('stone', C.x + dx, g0 + 9.4, C.z + dz, len + 0.4, 2, 3.6, yaw, 0x6a3a2c);
        cover.addBox({ x: C.x + dx, z: C.z + dz, yaw, length: len, thickness: 5, height: 8.5 });
      }
      props.box('stone', C.x - 26, g0 + 14, C.z + 22, 8, 28, 8, 0, BRICK);
      props.box('metal', C.x - 26, g0 + 30, C.z + 22, 6, 4, 6, Math.PI / 4, 0x4a5a52);
      cover.addBox({ x: C.x - 26, z: C.z + 22, yaw: 0, length: 8, thickness: 8, height: 26 });
    }
    // the Haberberg church and its hospital
    props.church({ x: HABER.x, z: HABER.z, yaw: 0 });
    { const g = terrain.heightAt(HABER.x, HABER.z - 16); props.box('stone', HABER.x, g + 12, HABER.z - 16, 6, 24, 6, 0, 0x9a5a42); }
    props.hall({ x: HABER.x + 2, z: HABER.z + 34, yaw: 0, width: 26, depth: 10, height: 6, color: 0xa89478, roof: 0x5a4436, door: 4, name: 'hospital' });
    // the Lomse: warehouses and gardens
    for (const [x, z] of [[150, -20], [150, 22], [270, -24], [270, 26]] as const) props.hall({ x, z, yaw: 0, width: 26, depth: 10, height: 9, color: 0x8a6a4e, roof: 0x4a3a2e, door: 4, name: 'Speicher' });
    buildVillage(props, P.G, 1606_7);

    // ---- the earthwork ring: a rampart round the town, redans before it, open at the gates and broken in many places
    const N = 84, at = (a, k = 1) => [CITY.x + Math.cos(a) * CITY.rx * k, CITY.z + Math.sin(a) * CITY.rz * k];
    const gate = (x, z) => Math.abs(x - 10) < 16 || Math.abs(x + 110) < 12 || Math.abs(x - 220) < 12 || Math.abs(z) < 120;
    for (let i = 0; i < N; i++) {
      if (i % 4 === 2) continue;                                                       // (the breaches and sally ports)
      const [x0, z0] = at((i / N) * Math.PI * 2), [x1, z1] = at(((i + 1) / N) * Math.PI * 2);
      if (gate((x0 + x1) / 2, (z0 + z1) / 2)) continue;
      seg(x0, z0, x1, z1, 1.8);
    }
    for (let b = 0; b < 12; b++) {
      const a = (b / 12) * Math.PI * 2 + Math.PI / 12, [tx, tz] = at(a, 1.12), [lx, lz] = at(a - 0.07), [qx, qz] = at(a + 0.07);
      if (gate(tx, tz)) continue;
      seg(lx, lz, tx, tz, 1.8);
      seg(qx, qz, tx, tz, 1.8);
    }
    // Soult’s batteries before the French, the Prussian redans before the Labiau road
    for (const [x, z] of [[-170, 360], [160, 370], [-160, -370], [170, -360]] as const) props.sandbagRing({ x, z, radius: 6, toward: -Math.sign(z) });

    // ---- the windmills on the Haberberg’s and the castle’s heights outside the ring
    const MILLS = [[-200, 330], [200, -330], [-480, 330], [480, -330]];
    for (const [x, z] of MILLS) {
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
    }
    // the boom’s blockhouses at the Holländer Baum
    for (const s of [-1, 1]) props.house({ x: P.E.x + 36, z: P.E.z + s * 34, yaw: 0, width: 7, depth: 6 });

    // ---- the villages; farms on the fields
    for (const p of POINTS) if (!p.owner && 'BDHJ'.includes(p.id)) buildVillage(props, p, 16066 + Math.round(p.x * 3 + p.z * 7));
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'fieldwall', 'hay'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 70 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 56 * 56)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 60) || woods(x, z) > 0.3 || wet(x, z, 26) || onLomse(x, z)
        || cityQ(x, z) < 1.3 || MILLS.some(([mx, mz]) => Math.hypot(x - mx, z - mz) < 30) || Math.abs(Math.abs(z) - 365) < 20) continue;
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

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 24 })), ...MILLS.map(([x, z]) => ({ x, z, r: 12 })),
      { test: (x, z) => wet(x, z, 1.5) || cityQ(x, z) < 1.14 || onLomse(x, z) && x < 330 || Math.abs(Math.abs(z) - 365) < 9 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2600, broadleaf: 0.6, autumn: 0, forest: (x, z) => (wet(x, z, 10) ? 0.45 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1200, lane: 0 });
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
