// Dobro Pole, 15 September 1918: the breakthrough on the Salonika front. After a day and a night of bombardment the
// Serbian Second Army’s Šumadija and Timok divisions and the French 122nd and 17th Colonial went up at dawn against the
// Bulgarian 2nd and 3rd Divisions dug into the rock of the Moglena mountains: the Dobro Pole ridge (1,875 m), Sokol and
// Vetrenik. By evening the crests were taken, in a fortnight the Macedonian front was open and Bulgaria signed the
// armistice at Salonika on the 29th — the first of the Central Powers out of the war.
// The ground: steep rocky ridges cut by gullies over the Moglena valley; beech forest on the lower slopes, alpine
// meadow above it, bare rock on the faces. On the Entente side Floka, Kravica and Kamenik; on the Bulgarian side
// Sokol, Dobro Pole and Vetrenik. Trenches and caverns cut into the rock, wire belts, the village of Zborsko in the
// valley, the French Decauville light railway and the téléphériques bringing the guns up, and the mule tracks in long
// graded traverses — the only ground wheels will climb.
// Not mirrored but fair: each side holds one wall of the Moglena valley — a summit over the village at the same reach
// and height (Kravica against Dobro Pole), a flank height west and east (Sokol 60 m farther from its base than Floka, Vetrenik 60 m nearer than Kamenik: the leads even out, sum −19 m), each its own graded track
// from its base to every one of them and from each down to the valley floor; the walls are their own shapes (the
// valley bends, the gullies and ribs fall differently, the high ground climbs toward Kozjak in the west on both).
// Both fight for the floor and the village between the summits.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine } from './common.js';
import { segDist, evenThreshold, farmVillage } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1918_0915);
/** The floor of the Moglena valley across the middle (its own bends), and its height: a low saddle by Zborsko, falling away east. */
const vall = (x: number) => 26 * Math.sin(x * 0.0045 + 1.1) + 8 * Math.sin(x * 0.017 + 0.3) - 14;
const floorH = (x: number) => 3 + 16 * smoothstep(420, 30, Math.abs(x + 20));
const away = (x: number, z: number) => Math.abs(z - vall(x));
const north = (x: number, z: number) => z > vall(x);

/** Side ribs (+) and gullies (−) down each wall [x, z, r, h] (z squeezed: they run up and down the slope), and the summits’ domes. */
const SIDES = [[-200, 180, 85, -22], [170, 170, 90, 20], [-170, -170, 85, 22], [200, -180, 90, -24], [-40, -200, 70, -14],
  [10, 255, 90, 26], [-30, -262, 90, 26],                                   // Kravica, Dobro Pole
  [-340, 290, 70, 16], [-395, -262, 70, 16], [350, 300, 70, 12], [290, -322, 70, 12]]; // Floka, Sokol; Kamenik, Vetrenik
function slope(x: number, z: number) {
  const a = away(x, z), n = north(x, z);
  const crest = n ? 275 + 22 * Math.sin(x * 0.009 + 2) : 270 + 25 * Math.sin(x * 0.007 + 0.5);
  const k = smoothstep(70, 300, a);
  let h = floorH(x) + 2 * smoothstep(20, 60, a);
  h += 92 * smoothstep(60, crest, a);                                                       // the wall up to the crest
  h -= 32 * smoothstep(crest + 20, crest + 240, a);                                          // and down its back to the base
  h += ridged(noise, x * (n ? 0.011 : 0.009) + 3, z * (n ? 0.011 : 0.009), 4) * 24 * k;     // ribs and gullies in the rock
  for (const [sx, sz, r, sh] of SIDES) h += sh * smoothstep(r, 0, Math.hypot(x - sx, (z - sz) * 0.7)) ** 1.4;
  h += smoothstep(-400, -540, x) * 45 * k;                                                   // the crags toward Kozjak, west on both walls
  h -= 0.05 * x;                                                                             // (the ground falls east, down the Moglenica)
  h += fbm(noise, x * 0.03, z * 0.03, 2) * 1.2;
  return h;
}

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Dragomanci', 30, 465, 'centre'),
  P('B', 'Floka', -340, 290, 'west', { radius: 24 }),
  P('C', 'Kravica', 10, 255, 'centre', { radius: 24 }),
  P('D', 'Kamenik', 350, 300, 'east', { radius: 24 }),
  P('E', 'Moglena gully', -300, Math.round(vall(-300) - 20), 'west', { radius: 26 }),
  P('F', 'Zborsko', -20, Math.round(vall(-20)), 'centre', { radius: 30 }),
  P('G', 'Decauville railhead', 300, Math.round(vall(300) + 22), 'east', { radius: 26 }),
  P('H', 'Sokol', -395, -262, 'west', { radius: 24 }),
  P('I', 'Dobro Pole', -30, -262, 'centre', { radius: 24 }),
  P('J', 'Vetrenik', 290, -322, 'east', { radius: 24 }),
  P('K', 'Kozjak road', 25, -465, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

// the shelves each point and base stands on (flattened, so a gun can unlimber there)
const SHELVES = [[0, BASE_Z, 36], [0, -BASE_Z, 36], ...points.filter((p) => !p.owner).map((p) => [p.x, p.z, p.id === 'F' ? 34 : 22])];
const SHELF_H = SHELVES.map(([x, z]) => slope(x, z));
/** The mule tracks, each from shelf to shelf, graded straight between their heights: from each base to its three heights, and from each height down its own traverse and one bend to the floor. */
const TRACKS = [
  [[0, BASE_Z], [-45, 440], [45, 385], [-30, 320], at('C')],
  [[0, BASE_Z], [-130, 475], [-250, 410], at('B')],
  [[0, BASE_Z], [130, 470], [250, 420], at('D')],
  [at('C'), [-110, 150], at('F')],
  [at('B'), [-440, 150], at('E')],
  [at('D'), [180, 170], at('G')],
  [[0, -BASE_Z], [50, -445], [-45, -380], [35, -320], at('I')],
  [[0, -BASE_Z], [-125, -470], [-245, -415], at('H')],
  [[0, -BASE_Z], [125, -480], [245, -400], at('J')],
  [at('I'), [100, -150], at('F')],
  [at('H'), [-210, -160], at('E')],
  [at('J'), [450, -150], at('G')],
];
/** The track along the valley floor, E – Zborsko – G (the floor is gentle: not graded). */
const FLOOR = [at('E'), ...Array.from({ length: 19 }, (_, i) => [-270 + i * 30, vall(-270 + i * 30)]), at('G')];
/** How far along each track (m) its corners are. */
const TRACK_S = TRACKS.map((t) => t.reduce((s: number[], p, i) => (i ? [...s, s[i - 1] + Math.hypot(p[0] - t[i - 1][0], p[1] - t[i - 1][1])] : [0]), []));
const nearestShelf = ([x, z]: number[]) => SHELVES.reduce((b, s, i) => (Math.hypot(s[0] - x, s[1] - z) < Math.hypot(SHELVES[b][0] - x, SHELVES[b][1] - z) ? i : b), 0);
const TRACK_H = TRACKS.map((t) => [SHELF_H[nearestShelf(t[0])], SHELF_H[nearestShelf(t[t.length - 1])]]);
/** The tracks’ boxes (padded), so a vertex far from a track skips it. */
const TRACK_BOX = TRACKS.map((t) => [Math.min(...t.map((p) => p[0])) - 32, Math.max(...t.map((p) => p[0])) + 32, Math.min(...t.map((p) => p[1])) - 32, Math.max(...t.map((p) => p[1])) + 32]);
function trackD(x: number, z: number) {
  let d = segDist(FLOOR, x, z);
  TRACKS.forEach((t, i) => { const b = TRACK_BOX[i]; if (x > b[0] && x < b[1] && z > b[2] && z < b[3]) d = Math.min(d, segDist(t, x, z)); });
  return d;
}
const onRoad = (x: number, z: number) => trackD(x, z) < 3.2;

function height(x: number, z: number) {
  let h = slope(x, z);
  SHELVES.forEach(([sx, sz, r], i) => { h += (SHELF_H[i] - h) * smoothstep(r + 26, r, Math.hypot(x - sx, z - sz)); });
  TRACKS.forEach((t, i) => {
    const b = TRACK_BOX[i]; if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) return;
    // the legs as near as the nearest vote their own grade (shared on a hairpin’s bisector): no step where two legs meet; past its ends a track is the shelf’s
    const [h0, h1] = TRACK_H[i], S = TRACK_S[i], L = S[S.length - 1], D: number[] = [], G: number[] = [];
    let W = 0, H = 0, M = 0, dmin = Infinity;
    for (let j = 0; j < t.length - 1; j++) {
      const [ax, az] = t[j], [bx, bz] = t[j + 1], l = S[j + 1] - S[j];
      const u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (l * l)));
      D[j] = (j === 0 && u === 0) || (j === t.length - 2 && u === 1) ? Infinity : Math.hypot(x - ax - (bx - ax) * u, z - az - (bz - az) * u); G[j] = h0 + (h1 - h0) * (S[j] + u * l) / L;
      dmin = Math.min(dmin, D[j]);
    }
    if (dmin >= 30) return;
    for (let j = 0; j < D.length; j++) { const w = smoothstep(dmin + 6, dmin, D[j]) + 1e-6; W += w; H += w * G[j]; }
    M = smoothstep(30, 6, dmin) ** 0.7;                                                   // (wide, sloping banks: no walls along the cuts)
    if (W > 0) h += (H / W - h) * M;
  });
  return h;
}

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1re Section' }];

export default {
  id: 'dobro-pole',
  name: 'Dobro Pole',
  description: 'September 1918 in the Moglena mountains of Macedonia: Serbian and French troops storm the Bulgarian positions cut into the rock of the Dobro Pole ridge, Sokol and Vetrenik, across the valley and the village of Zborsko from Kravica. Beech forest below, alpine meadow and rock above; wheels keep to the graded mule tracks.',
  epochs: ['1918'],
  region: 'balkans', // (the Salonika front)
  airfields: [], // (no flat ground in the mountains: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['serb', 'fr'], pact: ['bg', 'de'] }, // (the Serbian Second Army and the French colonials against the Bulgarian Eleventh Army)
  sides: { nato: 'Serbia and France', pact: 'Bulgaria' },
  conditions: { time: 'dawn', weather: 'clear' },
  size: 1700,
  segments: 720,
  bounds: { x: 500, z: 560 },
  steep: 0.6, // (wheels and horses keep to the mule tracks, the shelves and the valley floor; men climb anywhere)
  overwatch: true,
  camera: { maxHeight: 620, far: 3200 },
  seed: 19180915,
  height,
  fields: createFields({ seed: 191809, cell: 60, weights: [0.35, 0.15, 0.05, 0.45] as any }),

  theme: {
    // a clear September dawn after the bombardment: haze of smoke in the valley, the sun low over the Vardar
    fogColor: 0xb8b4a8, fogDensity: 0.0013, skyTop: 0x5c7a98, skyHorizon: 0xd2cabc, skyBottom: 0x7e7c72,
    sunColor: 0xffdcb4, sunIntensity: 1.6, sunDisk: 0.25, clouds: 0.3, cloudLight: 0xf0ece4, cloudDark: 0x908a80,
    sunDir: [0.6, 0.38, -0.3], hemiSky: 0xc8ccd0, hemiGround: 0x5a5444, hemiIntensity: 1.3, rimColor: 0xdcd4c8, rimIntensity: 0.25,
    terrain: {
      grass: '#5e6a3e', grassAlt: '#566238', dryGrass: '#94884e', dirt: '#6e5e48', rock: '#a29c90', strip: '#504432',
      pasture: '#66703e', ploughed: '#6e5c44', stubble: '#a0925c', meadow: '#74783e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x9a8e7a, 0.9];                                          // the mule tracks
        const a = away(x, z);
        if (a < 60) return null;                                                             // the valley’s fields and meadows
        const g = Math.hypot(slope(x + 2, z) - slope(x - 2, z), slope(x, z + 2) - slope(x, z - 2)) / 4;
        if (g > 0.55) return [0xa29c90, Math.min(1, 0.6 + (g - 0.55) * 2)];                // the bare rock faces
        if (g > 0.32) return [0xb0a898, 0.7];                                                // scree
        if (a > 175) return [0x8e8a5a, 0.65];                                                 // the alpine meadow, dried by summer
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-60, 0, 60] }, pact: { x: 0, z: -BASE_Z, entries: [-60, 0, 60] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -330 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Rota' })),
  },

  /** The forward line cut into each wall’s face over the valley (wire below it, gaps where the mule tracks go), the summits’ MG posts. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -470; x <= 470; x += 30) { const X = x * s; pts.push([X, s > 0 ? vall(X) + 155 + 14 * Math.sin(X * 0.018) : vall(X) - 150 - 12 * Math.sin(X * 0.021 + 2)]); } // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 18, belts: 1, gapEvery: 50 })) if (trackD(w.x, w.z) > 10) works.push(w);
      for (const id of s > 0 ? ['B', 'C', 'D'] : ['H', 'I', 'J']) { const p = points.find((q) => q.id === id); for (const dx of [-16, -8, 8, 16]) { const x = p.x + dx, z = p.z - 14 * s; if (trackD(x, z) > 9 && works.filter((w) => w.kind === 'mgNest' && Math.hypot(w.x - p.x, w.z - p.z) < 30).length < 2) works.push({ kind: 'mgNest', x, z, yaw: f === 'nato' ? Math.PI : 0, faction: f }); } }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const clear = (x: number, z: number, r = 8) => trackD(x, z) > r && steepAt(x, z) < 0.25;

    // Zborsko: farmsteads round the village shelf on the valley floor; a hamlet in the gully
    const [fx, fz] = at('F'), [ex, ez] = at('E');
    for (const dx of [-70, 0, 70]) farmVillage(props, fx + dx, vall(fx + dx), 7, 191815 + dx, (x, z) => !clear(x, z, 8) || Math.hypot(x - fx, z - fz) < 16, 1.1); // (strung along the floor)
    farmVillage(props, ex, ez, 4, 191816, (x, z) => !clear(x, z, 8) || Math.hypot(x - ex, z - ez) < 14, 0.9);
    // shepherds’ huts and shelters on the shelves of the heights and the bases
    props.rand = mulberry32(1809);
    for (const [x, z] of [[-316, 306], [-362, 280], [36, 240], [326, 316], [-412, -250], [-4, -280], [312, -336], [-30, 482], [34, -482], [276, vall(276) + 40]]) if (clear(x, z, 7)) props.house({ x, z, yaw: props.rand() * 3, width: 7, depth: 5, height: 2.6 });
    // the téléphériques that carried the guns and shells up: timber posts and the cable to each summit
    const cableway = (ax: number, az: number, bx: number, bz: number) => {
      const n = Math.max(2, Math.round(Math.hypot(bx - ax, bz - az) / 45));
      let prev: any = null;
      for (let i = 0; i <= n; i++) {
        let x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n;
        if (trackD(x, z) < 5) { x += 7; z += 4; }
        const g = terrain.heightAt(x, z), top = { x, y: g + 7, z };
        props.beam('plain', { x, y: g - 0.5, z }, top, 0.32, 0x5a4a38);
        props.beam('plain', { x: x - 1.2, y: g + 6.6, z }, { x: x + 1.2, y: g + 6.6, z }, 0.2, 0x5a4a38);
        if (prev) props.wires([prev], [top]);
        prev = top;
      }
    };
    cableway(-28, 470, 30, 262); cableway(28, -470, -50, -278); cableway(330, 60, 360, 282); cableway(-280, -30, -385, -270);
    // the Decauville: the French 60 cm railway laid along the track from the railhead up the Kamenik traverse, wagons at the railhead
    const dec = [at('G'), [180, 170], at('D')];
    for (let i = 0; i < dec.length - 1; i++) props.rails({ x0: dec[i][0], z0: dec[i][1], x1: dec[i + 1][0], z1: dec[i + 1][1] });
    { const [gx, gz] = at('G'); props.crates({ x: gx + 18, z: gz + 10, yaw: 0.4 }); props.crates({ x: gx - 20, z: gz + 12, yaw: 1.2 }); }
    // rock everywhere, smashed by the bombardment; dry-stone sangars (each wall its own)
    const r = mulberry32(1815);
    for (let i = 0; i < 700; i++) {
      const x = (r() * 2 - 1) * 480, z = (i % 2 ? -1 : 1) * (20 + r() * 520), big = r();
      if (nearPoint(x, z, 28) || trackD(x, z) < 7 || Math.hypot(x, Math.abs(z) - BASE_Z) < 40 || away(x, z) < 60) continue;
      if (big < 0.8) props.boulder({ x, z, radius: 0.8 + r() * 2.2 });
      else if (steepAt(x, z) < 0.35) props.lowWall({ x, z, yaw: r() * 3, length: 4 + r() * 4, height: 1.2, color: 0x9e988c });
    }
    // rock sangars round the summits; the cavern mouths’ sandbag screens below the Bulgarian crests and the Serbian start lines
    for (const id of ['B', 'C', 'D', 'H', 'I', 'J']) {
      const [px, pz] = at(id), s = pz > 0 ? -1 : 1;
      for (const dx of [-22, 22]) if (trackD(px + dx, pz + 18 * s) > 9) props.lowWall({ x: px + dx, z: pz + 18 * s, yaw: 0.2 * dx / 22, length: 7, height: 1.3, color: 0xa29c90 });
      if (trackD(px - 30, pz + 26 * s) > 9) props.sandbagRing({ x: px - 30, z: pz + 26 * s, radius: 3.5, toward: s });
    }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      { test: (x: number, z: number) => trackD(x, z) < 5 }];
    // beech forest on the lower slopes (not on the valley fields), as much on each wall; the meadow and rock above open (no tree past the band, the edges’ sprinkle too)
    const wood0 = (x: number, z: number) => fbm(noise, x * 0.009 + 40, z * 0.009, 3);
    const lower = (x: number, z: number) => { const a = away(x, z); return a > 55 && a < 175; };
    const tP = evenThreshold((x, z) => (lower(x, z) ? wood0(x, z) : -9), -0.1, north);
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid: [...avoid, { test: (x: number, z: number) => away(x, z) > 175 }], count: 4200, broadleaf: 0.9, autumn: 0.15, maxY: 400,
      forest: (x: number, z: number) => (!lower(x, z) ? (away(x, z) < 55 ? 0.03 : 0) : wood0(x, z) > (north(x, z) ? -0.1 : tP) ? 0.8 : 0.08),
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.6, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
