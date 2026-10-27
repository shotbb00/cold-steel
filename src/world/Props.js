// Builds static map props (field walls, boulders, farm ruins, hay bales, Jersey barriers,
// tank obstacles, car wrecks, border towers and fence, command-post tents and radio masts;
// town houses, a church, factory halls and hangars, aircraft shelters, a control tower, rails and
// wagons, mine headframes and conveyors, log piles)
// and registers their colliders with the CoverMap. All geometry is batched per
// material and merged in finish(), so a whole map of props is a handful of draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeDetailTextures } from './textures.js';
import { createNoise2D } from './Noise.js';
import { mulberry32 } from '../core/math.js';
import { stationHull } from '../data/models/vehicleCommon.js';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const TILED = new Set(['stone', 'plaster']); // textured materials: their texture repeats every TILE m
const TILE = 2.2;

/** A unit box whose UVs are scaled to the box's real size, so its texture tiles instead of stretching. */
function sizedBox(sx, sy, sz) {
  const g = UNIT_BOX.clone();
  const uv = g.attributes.uv;
  // BoxGeometry faces, 4 vertices each: +x, -x (u: z, v: y), +y, -y (x, z), +z, -z (x, y)
  const dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * dims[f][0] / TILE, uv.getY(i) * dims[f][1] / TILE);
    }
  }
  return g;
}
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

/** Lumpy rock: an icosphere displaced by noise of its own vertex positions (so seams match). */
export function makeRockGeometry(seed, detail = 2) {
  const noise = createNoise2D(seed);
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const d = 1 + noise(x * 1.7 + y * 0.9, z * 1.7 - y * 1.1) * 0.24 + noise(x * 4 + 3, z * 4 + y * 3) * 0.07;
    p.setXYZ(i, x * d, Math.max(y * d, -0.4), z * d); // flattened underside sits on the ground
  }
  g.computeVertexNormals();
  return g;
}

/** Make any geometry mergeable: non-indexed with exactly position / normal / uv. */
function normalizeGeometry(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
  }
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
}

let CAR = null;

/** A 1980s hatchback, 4.1 m long, from its cross-sections, in three colour groups. */
function carGeometry() {
  const half = (yb, sill, belt, top, roofIn) => [[0, yb], [0.8, yb], [0.82, sill], [0.82, belt], [roofIn, top], [0, top]];
  const body = stationHull([
    [-2.02, half(0.42, 0.5, 0.88, 0.96, 0.72)],
    [-1.85, half(0.32, 0.45, 0.92, 1.02, 0.74)],
    [-1.55, half(0.3, 0.45, 0.92, 1.36, 0.62)],
    [0.35, half(0.3, 0.45, 0.92, 1.4, 0.62)],
    [0.95, half(0.3, 0.45, 0.9, 0.98, 0.74)],
    [1.9, half(0.32, 0.45, 0.82, 0.88, 0.72)],
    [2.05, half(0.42, 0.5, 0.74, 0.8, 0.66)],
  ]);
  const b = (sx, sy, sz, x, y, z, rx = 0, ry = 0) => {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    g.rotateX(rx).rotateY(ry).translate(x, y, z);
    return g;
  };
  const dark = mergeGeometries([
    b(0.04, 0.34, 1.55, 0.81, 1.12, -0.55),  b(0.04, 0.34, 1.55, -0.81, 1.12, -0.55),   // side windows
    b(1.2, 0.04, 0.74, 0, 1.2, 0.65, 0.61),                                               // windscreen, raked back
    b(1.15, 0.04, 0.44, 0, 1.2, -1.7, -0.85),                                             // rear hatch glass
    b(1.1, 0.22, 0.04, 0, 0.62, 2.06),                                                    // grille
    ...[-1.25, 1.3].flatMap((z) => [0.82, -0.82].map((x) => b(0.03, 0.34, 0.78, x * 0.985, 0.47, z))), // wheel arches
  ].map((g) => normalizeGeometry(g)));
  const rims = [-1.25, 1.3].flatMap((z) => [0.74, -0.74].map((x) => {
    const g = new THREE.CylinderGeometry(0.24, 0.24, 0.14, 12);
    g.rotateZ(Math.PI / 2).translate(x, 0.24, z);
    return g;
  }));
  const trim = mergeGeometries([b(1.66, 0.12, 0.12, 0, 0.45, 2.08), b(1.66, 0.12, 0.12, 0, 0.47, -2.06), ...rims].map((g) => normalizeGeometry(g)));
  return { body, dark, trim };
}

export class PropBuilder {
  constructor({ scene, terrain, cover, seed = 99 }) {
    this.scene = scene;
    this.terrain = terrain;
    this.cover = cover;
    this.rand = mulberry32(seed);
    this.batches = new Map(); // material key (#group) -> geometries
    this.group = null;        // a building being built: its parts get their own meshes
    this.buildings = [];
    this.materials = new Map();
    this.lights = [];
    this.rockGeos = [0, 1, 2, 3].map((i) => makeRockGeometry(500 + i));

    const stone = makeDetailTextures({ seed: 11, scale: 4, base: 0.78, contrast: 0.45, bump: 4 });
    this.materials.set('stone', new THREE.MeshStandardMaterial({ vertexColors: true, map: stone.map, normalMap: stone.normalMap, roughness: 0.93 }));
    this.materials.set('rock', new THREE.MeshStandardMaterial({ vertexColors: true, map: stone.map, normalMap: stone.normalMap, roughness: 0.95 }));
    this.materials.set('metal', new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.35, roughness: 0.6 }));
    this.materials.set('plain', new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); // wood, canvas, hay, tiles
    const plaster = makeDetailTextures({ seed: 23, scale: 3, base: 0.9, contrast: 0.16, bump: 1.2 });
    this.materials.set('plaster', new THREE.MeshStandardMaterial({ vertexColors: true, map: plaster.map, normalMap: plaster.normalMap, normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.92 }));
  }

  material(key) {
    return this.materials.get(key);
  }

  /** Add a transformed copy of `geo` (tinted via vertex colour) to a material batch. */
  push(key, geo, matrix, color = 0xffffff) {
    const g = normalizeGeometry(geo);
    g.applyMatrix4(matrix);
    _c.set(color);
    const colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = _c.r;
      colors[i + 1] = _c.g;
      colors[i + 2] = _c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const k = this.group ? `${key}#${this.group.id}` : key;
    if (!this.batches.has(k)) this.batches.set(k, []);
    this.batches.get(k).push(g);
  }

  box(key, x, y, z, sx, sy, sz, yaw = 0, color = 0xffffff, rx = 0, rz = 0) {
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, yaw, rz)), _s.set(sx, sy, sz));
    this.push(key, TILED.has(key) ? sizedBox(sx, sy, sz) : UNIT_BOX, _m, color);
  }

  /** Local (lx, lz) in a frame at (x, z) rotated by yaw → world [x, z]. */
  static local(x, z, yaw, lx, lz) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return [x + lx * c + lz * s, z - lx * s + lz * c];
  }

  stoneTint() {
    const r = this.rand();
    return new THREE.Color().setHSL(0.08 + r * 0.04, 0.08 + r * 0.06, 0.42 + this.rand() * 0.12).getHex();
  }

  // ---------------------------------------------------------------- cover props

  /** Chest-high ruined masonry wall. */
  wall({ x, z, yaw, length, height = 1.35, thickness = 0.62 }) {
    const r = this.rand;
    const n = Math.max(2, Math.round(length / 0.9));
    const bl = length / n;
    for (let i = 0; i < n; i++) {
      const lx = -length / 2 + (i + 0.5) * bl;
      const [wx, wz] = PropBuilder.local(x, z, yaw, lx, 0);
      const g = this.terrain.heightAt(wx, wz);
      const h = height * (0.82 + r() * 0.28);
      const split = 0.45 + r() * 0.15;
      const lower = h * split + 0.35;
      this.box('stone', wx, g - 0.35 + lower / 2, wz, bl * 0.97, lower, thickness, yaw + (r() - 0.5) * 0.05, this.stoneTint());
      this.box('stone', wx + (r() - 0.5) * 0.06, g + h * split + (h * (1 - split)) / 2, wz,
        bl * (0.84 + r() * 0.12), h * (1 - split), thickness * (0.82 + r() * 0.12), yaw + (r() - 0.5) * 0.14, this.stoneTint(), (r() - 0.5) * 0.08);
    }
    for (let k = 0; k < 3; k++) {
      const side = r() < 0.5 ? -1 : 1;
      const [rx, rz] = PropBuilder.local(x, z, yaw, (r() - 0.5) * length, side * (thickness / 2 + 0.35 + r() * 0.7));
      this.rubble(rx, rz, 0.15 + r() * 0.22);
    }
    this.cover.addBox({ x, z, yaw, length, thickness, height: height * 0.9 });
  }

  boulder({ x, z, radius }) {
    const r = this.rand;
    const g = this.terrain.heightAt(x, z);
    const sy = 0.55 + r() * 0.35;
    _m.compose(
      _p.set(x, g + radius * sy * 0.4, z),
      _q.setFromEuler(_e.set((r() - 0.5) * 0.3, r() * Math.PI * 2, (r() - 0.5) * 0.3)),
      _s.set(radius * (0.9 + r() * 0.25), radius * sy, radius * (0.8 + r() * 0.3)),
    );
    const tint = new THREE.Color().setHSL(0.07 + r() * 0.05, 0.06, 0.36 + r() * 0.12).getHex();
    this.push('rock', this.rockGeos[Math.floor(r() * 4)], _m, tint);
    const height = radius * sy * 1.35;
    if (height >= 0.9) this.cover.addCylinder({ x, z, radius: radius * 0.85, height });
  }

  /** Small loose stones, purely visual. */
  rubble(x, z, size) {
    const r = this.rand;
    _m.compose(
      _p.set(x, this.terrain.heightAt(x, z) + size * 0.2, z),
      _q.setFromEuler(_e.set(r() * 3, r() * 3, r() * 3)),
      _s.set(size, size * (0.5 + r() * 0.4), size * (0.8 + r() * 0.4)),
    );
    this.push('rock', this.rockGeos[Math.floor(r() * 4)], _m, this.stoneTint());
  }

  /** Broken stone column (high cover). */
  column({ x, z, radius = 0.55, height = 3 }) {
    const r = this.rand;
    const g = this.terrain.heightAt(x, z);
    this.box('stone', x, g + 0.1, z, radius * 2.7, 0.5, radius * 2.7, r() * Math.PI, this.stoneTint());
    _m.compose(_p.set(x, g + 0.35 + height / 2, z), _q.setFromEuler(_e.set((r() - 0.5) * 0.06, r() * 3, (r() - 0.5) * 0.06)), _s.set(1, 1, 1));
    this.push('stone', new THREE.CylinderGeometry(radius * 0.88, radius, height, 10), _m, this.stoneTint());
    // a fallen drum lying beside it
    const a = r() * Math.PI * 2;
    const fx = x + Math.cos(a) * (radius * 2.2);
    const fz = z + Math.sin(a) * (radius * 2.2);
    _m.compose(_p.set(fx, this.terrain.heightAt(fx, fz) + radius * 0.75, fz), _q.setFromEuler(_e.set(Math.PI / 2, a, 0)), _s.set(1, 1, 1));
    this.push('stone', new THREE.CylinderGeometry(radius * 0.85, radius * 0.85, 0.9 + r() * 0.6, 10), _m, this.stoneTint());
    this.cover.addCylinder({ x, z, radius: radius + 0.05, height: height + 0.35 });
  }

  /** Sloped box helper: a box at local (lx, ly, lz) of a frame at (x, z, yaw), on the ground. */
  part(key, x, z, yaw, lx, ly, lz, sx, sy, sz, color, ryaw = 0, rx = 0, rz = 0) {
    const [wx, wz] = PropBuilder.local(x, z, yaw, lx, lz);
    this.box(key, wx, this.terrain.heightAt(wx, wz) + ly, wz, sx, sy, sz, yaw + ryaw, color, rx, rz);
  }

  /**
   * A shelled farmhouse: smoke-stained whitewashed walls with their windows and doors, falling
   * away from the surviving end into a breach where the shell came in (ragged masonry along
   * the broken tops), the roof still on over the west end, its charred rafters and ridge beam
   * running on over the burnt-out rest, fallen tiles, a dropped beam and rubble inside and
   * out. Each wall bay is cover.
   */
  house({ x, z, yaw, width = 9, depth = 7, height = 3.2 }) {
    const r = this.rand;
    const names = ['farmhouse', 'barn', 'farmstead', 'cottage', 'mill house'];
    const b = this.beginBuilding(names[this.buildings.length % names.length], x, z, yaw, width, depth);
    // weathered, smoke-stained whitewash
    const plaster = new THREE.Color().setHSL(0.09, 0.1 + r() * 0.06, 0.48 + r() * 0.1).getHex();
    b.plaster = plaster;
    const roofed = r() < 0.75;
    const keepTo = -width / 2 + width * (0.35 + r() * 0.25); // the roofed part runs from the west gable to here
    const t = 0.45;
    const opts = { height, t, color: plaster, bay: 2.3, frame: 0xa8a090 };
    // the collapse: the walls fall away smoothly from the surviving end into a breach
    const breach = (r() - 0.2) * width * 0.5;
    const seed = r() * 100;
    const profile = (side) => (along) => {
      const n = Math.sin(along * 0.9 + seed + side) * 0.5 + Math.sin(along * 2.3 + seed * 1.7 + side) * 0.25;
      const toBreach = Math.min(1, Math.abs(along - breach) / (width * 0.3));
      return Math.max(0.35, height * (0.25 + 0.55 * toBreach + 0.2 * n));
    };
    const keep = roofed ? [-width / 2 - 1, keepTo] : null;
    this.buildingWall(b, 0, depth / 2, width, 0, { ...opts, doors: [width * 0.3], ruin: 1, keep, profile: profile(0) });
    this.buildingWall(b, 0, -depth / 2, width, 0, { ...opts, doors: [-width * 0.2], ruin: 1, keep, profile: profile(2) });
    this.buildingWall(b, width / 2, 0, depth, Math.PI / 2, { ...opts, ruin: 1, profile: (along) => profile(4)(along) * 0.8 });
    this.buildingWall(b, -width / 2, 0, depth, Math.PI / 2, { ...opts, ruin: 1, keep: roofed ? [-depth, depth] : null, profile: profile(6) });
    this.piece('stone', b, 0, 0.1, 0, width + 0.3, 0.4, depth + 0.3, 0x6a645a);                 // plinth
    const pitch = 0.62;
    const line = depth / 2 + t / 2;
    const rafter = (line + 0.45) / Math.cos(pitch);
    if (roofed) {
      // the surviving roof over the west end, then its charred rafters running on over the burnt-out rest
      this.gableRoof(b, { eave: height, pitch, t, span: [-width / 2 - 0.45, keepTo], gables: -1, color: 0x6a3024 });
      for (let xr = keepTo + 0.5; xr < width / 2 - 0.3; xr += 0.9) {
        if (r() < 0.3) continue;                                    // burnt through
        for (const side of [-1, 1]) {
          const len = rafter * (r() < 0.4 ? 0.4 + r() * 0.4 : 1);  // some snapped off
          const zc = side * (line + 0.45 - (len * Math.cos(pitch)) / 2);
          const yc = height + Math.tan(pitch) * (line - Math.abs(zc)) + 0.05;
          this.piece('plain', b, xr, yc, zc, 0.12, 0.14, len, 0x2a1f18, 0, side * pitch);
        }
      }
      this.piece('plain', b, (keepTo + width / 2) / 2 - 0.4, height + Math.tan(pitch) * line, 0, width / 2 - keepTo - 0.6, 0.16, 0.16, 0x2a1f18); // ridge beam
    }
    // inside: fallen tiles, a dropped beam, heaps of rubble — most of it where the breach is
    for (let k = 0; k < 4; k++) {
      const lx = breach + (r() - 0.5) * width * 0.4, lz = (r() - 0.5) * depth * 0.6;
      this.piece('plain', b, lx, 0.32 + r() * 0.1, lz, 1.2 + r(), 0.08, 0.9 + r() * 0.6, 0x5e2a20, r() * 3, (r() - 0.5) * 0.5, (r() - 0.5) * 0.4);
    }
    this.piece('plain', b, breach, 0.55, 0, 0.18, 0.18, depth * 0.9, 0x2a1f18, 0.4, 0.25, 0);
    this.endBuilding();
    for (let k = 0; k < 12; k++) {
      const near = k < 8;
      const [rx, rz] = PropBuilder.local(x, z, yaw, near ? breach + (r() - 0.5) * width * 0.5 : (r() - 0.5) * width * 0.8, (r() - 0.5) * depth * (near ? 1.3 : 0.8));
      this.rubble(rx, rz, 0.25 + r() * (near ? 0.55 : 0.3));
    }
  }

  /** Round hay bales left in a field, sometimes stacked. */
  hayBales({ x, z, yaw, count = 3 }) {
    const r = this.rand;
    for (let i = 0; i < count; i++) {
      const [bx, bz] = PropBuilder.local(x, z, yaw, (i - (count - 1) / 2) * 1.8 + (r() - 0.5) * 0.4, (r() - 0.5) * 0.8);
      const g = this.terrain.heightAt(bx, bz);
      _m.compose(_p.set(bx, g + 0.72, bz), _q.setFromEuler(_e.set(0, yaw + (r() - 0.5) * 0.3, Math.PI / 2)), _s.set(1, 1, 1));
      this.push('plain', new THREE.CylinderGeometry(0.75, 0.75, 1.3, 14), _m, new THREE.Color().setHSL(0.11, 0.42, 0.42 + r() * 0.1).getHex());
    }
    this.cover.addBox({ x, z, yaw, length: count * 1.8, thickness: 1.3, height: 1.4 });
  }

  /** Concrete Jersey barriers in a staggered row (low cover: lie behind them). */
  jersey({ x, z, yaw, length = 6 }) {
    const n = Math.max(1, Math.round(length / 3));
    for (let i = 0; i < n; i++) {
      const lx = -length / 2 + (i + 0.5) * (length / n);
      const tilt = (this.rand() - 0.5) * 0.12;
      const grey = new THREE.Color().setHSL(0.1, 0.04, 0.55 + this.rand() * 0.08).getHex();
      this.part('stone', x, z, yaw, lx, 0.15, 0, 2.9, 0.3, 0.62, grey, tilt);
      this.part('stone', x, z, yaw, lx, 0.55, 0, 2.9, 0.6, 0.26, grey, tilt);
    }
    this.cover.addBox({ x, z, yaw, length, thickness: 0.62, height: 0.95 });
  }

  /** Czech hedgehog anti-tank obstacle: three crossed steel beams (no infantry cover). */
  hedgehog({ x, z }) {
    const g = this.terrain.heightAt(x, z);
    const yaw = this.rand() * Math.PI;
    const rust = new THREE.Color().setHSL(0.05, 0.35, 0.18 + this.rand() * 0.05).getHex();
    for (const [rx, rz] of [[0.95, 0], [-0.95, 0], [0, 0.95]]) {
      this.box('metal', x, g + 0.62, z, 0.14, 1.9, 0.14, yaw + (rz ? Math.PI / 2 : 0), rust, rx, rz ? 0.95 : 0);
    }
    this.cover.addCylinder({ x, z, radius: 0.7, height: 1.2, spots: false });
  }

  /** A burnt-out civilian car, pushed off the road. */
  wreckCar({ x, z, yaw }) {
    const r = this.rand;
    CAR ??= carGeometry();
    // burnt out (charred, rusting) or just abandoned in its faded paint: Trabant beige, Lada red, VW blue
    const burnt = r() < 0.6;
    const paint = burnt ? [0x3a2a22, 0x4a3324, 0x2c2826][Math.floor(r() * 3)] : [0x9a9070, 0x7a3428, 0x3a5068, 0x5a6a4a][Math.floor(r() * 4)];
    const sunk = (r() - 0.5) * 0.12;                                  // settled on a flat or a missing wheel
    _m.compose(_p.set(x, this.terrain.heightAt(x, z) - 0.04, z), _q.setFromEuler(_e.set((r() - 0.5) * 0.05, yaw, sunk)), _s.set(1, 1, 1));
    this.push('metal', CAR.body, _m, paint);
    this.push('metal', CAR.dark, _m, burnt ? 0x141210 : 0x1c2024);    // window holes or glass, grille, wheel arches
    this.push('metal', CAR.trim, _m, burnt ? 0x2a2420 : 0x6a6a64);    // bumpers, rims
    this.cover.addBox({ x, z, yaw, length: 1.7, thickness: 4.1, height: 1.3 });
  }

  /** Border watchtower: concrete shaft with an observation cab (East) or a wooden OP (West). */
  tower({ x, z, concrete = true }) {
    const g = this.terrain.heightAt(x, z);
    if (concrete) {
      this.box('stone', x, g + 4.5, z, 1.3, 9, 1.3, 0, 0x8d8a80);
      this.box('stone', x, g + 10.2, z, 3.2, 2.4, 3.2, 0.2, 0x8a877c);
      this.box('metal', x, g + 10.4, z, 3.3, 0.7, 3.3, 0.2, 0x1e2226);  // window band
      this.box('stone', x, g + 11.55, z, 3.6, 0.3, 3.6, 0.2, 0x6e6b62);
    } else {
      for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
        this.box('plain', x + dx, g + 4, z + dz, 0.25, 8, 0.25, 0, 0x4a3a2a, dz * 0.04, -dx * 0.04);
      }
      this.box('plain', x, g + 8.6, z, 3.4, 1.4, 3.4, 0, 0x5a4a36);
      this.box('plain', x, g + 9.9, z, 3.8, 0.25, 3.8, 0, 0x3e4430);
    }
    this.cover.addCylinder({ x, z, radius: 1.3, height: 9, spots: false });
  }

  /** A run of border fence: posts and wire, with breaches blown through it. Visual only. */
  /** @param {any} o  options, untyped until this file moves to TypeScript */
  fence({ x0, x1, z, breaches = [] }) {
    for (let x = x0; x <= x1; x += 3.2) {
      if (breaches.some(([a, b]) => x > a && x < b)) continue;
      const g = this.terrain.heightAt(x, z);
      this.box('stone', x, g + 1.2, z, 0.14, 2.4, 0.14, 0, 0x7d7a72);
      for (const h of [0.6, 1.3, 2.0]) this.box('metal', x + 1.6, g + h, z, 3.2, 0.03, 0.03, 0, 0x55575a);
    }
  }

  /** Command-post tent: canvas ridge tent with a door flap. */
  tent({ x, z, yaw, color = 0x4e5236 }) {
    for (const side of [-1, 1]) this.part('plain', x, z, yaw, side * 1.05, 1.05, 0, 0.08, 2.6, 4.4, color, 0, 0, side * 0.7);
    this.part('plain', x, z, yaw, 0, 0.9, 2.2, 1.2, 1.8, 0.05, 0x3a3d28);
    this.cover.addBox({ x, z, yaw, length: 3, thickness: 4.4, height: 1.9, spots: false });
  }

  /** Stack of ammunition / ration crates. */
  crates({ x, z, yaw }) {
    const r = this.rand;
    for (let i = 0; i < 4; i++) {
      const lx = (i % 2) * 1.1 - 0.55;
      const ly = i < 2 ? 0.3 : 0.9;
      this.part('plain', x, z, yaw, lx, ly, (r() - 0.5) * 0.2, 1, 0.6, 0.7, 0x4a5032, (r() - 0.5) * 0.2);
    }
    this.cover.addBox({ x, z, yaw, length: 2.2, thickness: 0.8, height: 1.2 });
  }

  /** Radio mast with guy wires (visual, a landmark for the command post). */
  mast({ x, z, height = 14 }) {
    const g = this.terrain.heightAt(x, z);
    this.box('metal', x, g + height / 2, z, 0.16, height, 0.16, 0, 0x6a6c66);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      const len = Math.hypot(height * 0.7, 5);
      const ang = Math.atan2(5, height * 0.7);
      this.box('metal', x + Math.cos(a) * 2.5, g + height * 0.35, z + Math.sin(a) * 2.5, 0.025, len, 0.025, -a + Math.PI / 2, 0x3a3a3a, 0, ang);
    }
    this.box('metal', x, g + height - 0.4, z, 1.6, 0.05, 0.05, 0, 0x6a6c66);
    this.cover.addCylinder({ x, z, radius: 0.3, height, spots: false });
  }

  /** Ring of sandbags around a command post, with an opening toward the rear. */
  sandbagRing({ x, z, radius = 6, toward = 1 }) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (Math.sin(a) * -toward > 0.97) continue; // opening at the rear
      const sx = x + Math.cos(a) * radius;
      const sz = z + Math.sin(a) * radius;
      const len = (Math.PI * 2 * radius) / n;
      const g = this.terrain.heightAt(sx, sz);
      for (let row = 0; row < 3; row++) {
        this.box('plain', sx, g + 0.15 + row * 0.27, sz, len * 0.95, 0.27, 0.55, -a + Math.PI / 2 + (row % 2) * 0.05, new THREE.Color().setHSL(0.12, 0.25, 0.38 + this.rand() * 0.06).getHex());
      }
      this.cover.addBox({ x: sx, z: sz, yaw: -a + Math.PI / 2, length: len, thickness: 0.55, height: 0.95 });
    }
  }

  // ---------------------------------------------------------------- town, airfield and mine
  // Intact-ish buildings for the newer maps. Anything with walls and a roof registers as a
  // building (systems/Buildings.js): infantry can occupy it, high explosive brings it down.

  /** Start a building: its parts go into their own meshes (for the collapse), on flat ground. */
  beginBuilding(name, x, z, yaw, w, d) {
    const b = { id: this.buildings.length, name, x, z, yaw, w, d, ground: this.terrain.heightAt(x, z), colliders: [], meshes: [] };
    this.buildings.push(b);
    this.group = b;
    return b;
  }

  endBuilding() {
    this.group = null;
  }

  /** A box in a building's frame, on its floor level (not following the terrain). */
  piece(key, b, lx, ly, lz, sx, sy, sz, color, ryaw = 0, rx = 0, rz = 0) {
    const [wx, wz] = PropBuilder.local(b.x, b.z, b.yaw, lx, lz);
    this.box(key, wx, b.ground + ly, wz, sx, sy, sz, b.yaw + ryaw, color, rx, rz);
  }

  /**
   * One wall of a building as a facade, along local (cx, cz) in direction ry: `storeys` floors,
   * bays of about `bay` m each with a window per floor (the wall below it, piers either side,
   * the band above), doors on the ground floor at the `doors` offsets along the wall. Each bay
   * is cover: low at a ground-floor window (fire out over the sill), full where it's solid.
   * `ruin` 0..1: the share of bays shot down to rubble height, except within `keep` [a, b] (along
   * the wall) — the part a surviving roof rests on. The top is exactly `height`: the roof sits on it.
   */
  /** @param {any} b @param {number} cx @param {number} cz @param {number} len @param {number} ry @param {any} o */
  buildingWall(b, cx, cz, len, ry, {
    height, storeys = 1, t = 0.4, color, key = 'plaster', doors = [], bay = 2.6, windows = true, ruin = 0, keep = null,
    sill = 0.95, head = 2.25, frame = 0xd8d0bc, shutters = 0, profile = null,
  }) {
    const r = this.rand;
    const sh = height / storeys;
    const n = Math.max(1, Math.round(len / bay));
    const bw = len / n;
    const ow = Math.min(1.15, bw * 0.48);
    const pier = (bw - ow) / 2;
    const dx = Math.cos(ry);
    const dz = -Math.sin(ry);
    const nx = -dz;                                  // outward normal (for a wall on the +z side: +z)
    const nz = dx;
    const out = Math.sign(cx * nx + cz * nz) || 1;   // which way is outside
    const at = (along, off = 0) => [cx + dx * along + nx * off * out, cz + dz * along + nz * off * out];
    for (let i = 0; i < n; i++) {
      const along = -len / 2 + (i + 0.5) * bw;
      const [lx, lz] = at(along);
      const door = doors.some((d) => Math.abs(d - along) < bw / 2);
      const kept = keep && along > keep[0] && along < keep[1];
      // a ruin's wall: the collapse profile along it (a smooth slope down into a breach), else a
      // random height per bay
      const top = kept ? height : profile ? Math.min(height, profile(along)) : ruin && r() < ruin ? 0.5 + r() * 1.6 : height;
      if (top < height - 0.05) this.brokenEdge(b, lx, lz, ry, top, bw, t, color);
      // the piers, both sides of the opening
      for (const side of [-1, 1]) {
        const [px, pz] = at(along + side * (ow / 2 + pier / 2));
        this.piece(key, b, px, top / 2, pz, pier + 0.01, top, t, color, ry);
      }
      // floor by floor: below the opening, above it (doors: the ground floor's opening reaches the floor)
      for (let st = 0; st < storeys; st++) {
        const y0 = st * sh;
        if (y0 >= top) break;
        const y1 = Math.min(top, y0 + sh);
        const isDoor = door && st === 0;
        const o0 = isDoor ? y0 : y0 + sill;
        const o1 = y0 + Math.min(isDoor ? 2.3 : head, sh - 0.45);
        if (!windows && !isDoor) {
          this.piece(key, b, lx, (y0 + y1) / 2, lz, ow + 0.01, y1 - y0, t, color, ry);
          continue;
        }
        if (o0 > y0) this.piece(key, b, lx, (y0 + Math.min(o0, y1)) / 2, lz, ow + 0.01, Math.min(o0, y1) - y0, t, color, ry);
        if (y1 > o1) this.piece(key, b, lx, (o1 + y1) / 2, lz, ow + 0.01, y1 - o1, t, color, ry);
        if (y1 < o1) continue;                       // shot away above here
        if (!isDoor) {
          const [sx, sz] = at(along, t / 2 + 0.04);
          this.piece('stone', b, sx, o0 - 0.05, sz, ow + 0.24, 0.1, 0.18, frame, ry);           // sill
          if (shutters && r() < shutters) {
            const c = r() < 0.5 ? 0x3e5232 : 0x5a3c2a;
            for (const side of [-1, 1]) {
              const [hx, hz] = at(along + side * (ow / 2 + 0.3), t / 2 + 0.05);
              this.piece('plain', b, hx, (o0 + o1) / 2, hz, 0.56, o1 - o0, 0.06, c, ry);
            }
          }
        } else {
          const [fx, fz] = at(along, 0);
          this.piece('plain', b, fx, (o0 + o1) / 2, fz, ow * 0.9, o1 - o0 - 0.05, 0.08, 0x3e2e22, ry, 0, 0); // the door itself, ajar-dark
        }
      }
      if (door) continue;                            // the doorway is the way in, not cover
      const [wx, wz] = PropBuilder.local(b.x, b.z, b.yaw, lx, lz);
      const solid = top < height ? Math.min(top, 2.4) : windows ? Math.min(sill + 0.05, 2.4) : Math.min(top, 2.4);
      b.colliders.push(this.cover.addBox({ x: wx, z: wz, yaw: b.yaw + ry, length: bw, thickness: t, height: solid }));
    }
  }

  /** The ragged top of a shot-down stretch of wall: rough lumps of masonry instead of a clean cut. */
  brokenEdge(b, lx, lz, ry, top, w, t, color) {
    const r = this.rand;
    for (let k = 0; k < 2; k++) {
      const off = (k - 0.5) * w * 0.45;
      const [ax, az] = [lx + Math.cos(ry) * off, lz - Math.sin(ry) * off];
      const [wx, wz] = PropBuilder.local(b.x, b.z, b.yaw, ax, az);
      _m.compose(_p.set(wx, b.ground + top - 0.05, wz), _q.setFromEuler(_e.set((r() - 0.5) * 0.5, b.yaw + ry + (r() - 0.5) * 0.4, (r() - 0.5) * 0.5)),
        _s.set(w * (0.28 + r() * 0.15), 0.22 + r() * 0.25, t * (0.55 + r() * 0.2)));
      this.push('rock', this.rockGeos[Math.floor(r() * 4)], _m, color);
    }
  }

  /** Four walls around the building's w × d footprint (options as buildingWall; doors per side). */
  /** @param {any} b @param {any} o */
  shell(b, { front = [0], back = [], left = [], right = [], ...opts }) {
    const { w, d } = b;
    this.buildingWall(b, 0, d / 2, w, 0, { ...opts, doors: front });
    this.buildingWall(b, 0, -d / 2, w, 0, { ...opts, doors: back });
    this.buildingWall(b, w / 2, 0, d, Math.PI / 2, { ...opts, doors: right });
    this.buildingWall(b, -w / 2, 0, d, Math.PI / 2, { ...opts, doors: left });
  }

  /**
   * A pitched roof over the footprint, ridge along local x, resting exactly on walls `t` thick
   * whose tops are at `eave`: tiles from the eaves (with overhang) up to the ridge, a ridge cap,
   * and the gable triangles closing the ends. `sides`: which slopes ([1] = only the +z one,
   * a ruin's surviving half), `span`: the x range it covers, `gables`: ±1 to close only one end.
   */
  gableRoof(b, { eave, pitch = 0.62, color = 0x6a3024, overhang = 0.45, t = 0.4, sides = [-1, 1], span = null, gables = 0, chimney = false }) {
    const { w, d } = b;
    const [x0, x1] = span ?? [-w / 2 - overhang, w / 2 + overhang];
    const len = x1 - x0;
    const mx = (x0 + x1) / 2;
    const tan = Math.tan(pitch);
    const line = d / 2 + t / 2;                      // the roof line passes over the walls' outer edges
    const reach = line + overhang;                   // eaves to ridge, measured flat
    const rise = tan * line;
    const th = 0.16;
    for (const side of sides) {
      const zc = (side * reach) / 2;
      const yc = eave + tan * (line - reach / 2) + th / (2 * Math.cos(pitch));
      this.piece('plain', b, mx, yc, zc, len, th, reach / Math.cos(pitch) + 0.04, color, 0, side * pitch);
    }
    if (sides.length === 2) this.piece('plain', b, mx, eave + rise + 0.1, 0, len, 0.16, 0.34, 0x3a2a22);     // ridge cap
    // gable ends: triangles of wall, a hair inside the roof
    const tri = new THREE.Shape(sides.length === 2
      ? [new THREE.Vector2(-line, 0), new THREE.Vector2(line, 0), new THREE.Vector2(0, rise)]
      : [new THREE.Vector2(0, 0), new THREE.Vector2(line, 0), new THREE.Vector2(0, rise)]);
    const gable = new THREE.ExtrudeGeometry(tri, { depth: t * 0.9, bevelEnabled: false });
    gable.translate(0, 0, -t * 0.45);
    gable.scale(0.985, 0.97, 1);
    gable.rotateY(-Math.PI / 2);                     // shape x → building +z, extrusion → building x
    for (const end of [-1, 1]) {
      if (gables && end !== gables) continue;
      const ex = end < 0 ? Math.max(x0 + overhang, -w / 2) : Math.min(x1 - overhang, w / 2);
      const [wx, wz] = PropBuilder.local(b.x, b.z, b.yaw, ex, 0);
      _m.compose(_p.set(wx, b.ground + eave, wz), _q.setFromEuler(_e.set(0, b.yaw, 0)), _s.set(1, 1, 1));
      this.push('plaster', gable, _m, b.plaster ?? 0xb8ad98);
    }
    if (chimney) {
      const cx = w * 0.22;
      this.piece('stone', b, cx, eave + rise * 0.6, -0.6, 0.7, rise + 1.4, 0.7, 0x6a4034);
      this.piece('stone', b, cx, eave + rise + 1.0, -0.6, 0.85, 0.15, 0.85, 0x4a3028);
    }
  }

  /** German town house: storeys of plaster with windows and shutters, a tiled gable roof, a chimney. */
  townHouse({ x, z, yaw, width = 8, depth = 9, storeys = 2, name = 'town house', damaged = 0.15 }) {
    const r = this.rand;
    const b = this.beginBuilding(name, x, z, yaw, width, depth);
    const h = storeys * 3.1;
    const plaster = new THREE.Color().setHSL(0.08 + r() * 0.06, 0.15 + r() * 0.15, 0.6 + r() * 0.14).getHex();
    b.plaster = plaster;
    const t = 0.4;
    this.shell(b, { height: h, storeys, t, color: plaster, front: [(r() - 0.5) * width * 0.4], back: [(r() - 0.5) * width * 0.4], shutters: 0.55 });
    for (let s = 1; s < storeys; s++) this.piece('plain', b, 0, s * 3.1, 0, width - t, 0.2, depth - t, 0x5a4a3c); // floors
    this.piece('stone', b, 0, 0.1, 0, width + 0.24, 0.5, depth + 0.24, 0x6e665c);                                  // plinth
    this.piece('stone', b, 0, h - 0.12, 0, width + 0.12, 0.2, depth + 0.12, 0xa89c88);                              // cornice
    const tiles = r() < 0.7 ? 0x6a3024 : 0x3a3c40;
    if (damaged && r() < damaged) {
      // a shell went through: one slope only partly there
      this.gableRoof(b, { eave: h, t, color: tiles, sides: [-1], chimney: true });
      this.gableRoof(b, { eave: h, t, color: tiles, sides: [1], span: [-width / 2 - 0.45, width * 0.05], gables: -1 });
    } else {
      this.gableRoof(b, { eave: h, t, color: tiles, chimney: true });
    }
    this.endBuilding();
    return b;
  }

  /** The town church: a stone nave, a square tower with a slate spire. */
  church({ x, z, yaw }) {
    const b = this.beginBuilding('church', x, z, yaw, 9, 18);
    const stone = 0x9a9080;
    b.plaster = stone;
    this.shell(b, { height: 7, key: 'stone', color: stone, front: [0], left: [3], t: 0.7, bay: 3.2, sill: 1.8, head: 5.6, frame: 0x8a8070 });
    this.gableRoof(b, { eave: 7, pitch: 0.85, color: 0x3a3c42, t: 0.7 });
    this.endBuilding();
    // the tower in front of the nave (cover and a landmark, not occupiable)
    const [tx, tz] = PropBuilder.local(x, z, yaw, 0, 9 + 2.6);
    const g = this.terrain.heightAt(tx, tz);
    this.box('stone', tx, g + 8, tz, 4.6, 16, 4.6, yaw, stone);
    this.box('metal', tx, g + 13, tz, 4.7, 1.2, 0.9, yaw, 0x1e2226); // belfry openings
    _m.compose(_p.set(tx, g + 19.5, tz), _q.setFromEuler(_e.set(0, yaw + Math.PI / 4, 0)), _s.set(1, 1, 1));
    this.push('plain', new THREE.ConeGeometry(3.4, 7, 4), _m, 0x3a3c42);
    this.cover.addBox({ x: tx, z: tz, yaw, length: 4.6, thickness: 4.6, height: 16 });
  }

  /**
   * A big hall — factory shed, warehouse or aircraft hangar: tall walls, a wide door on the
   * front (`door` m), a shallow roof with skylights. Occupiable.
   */
  hall({ x, z, yaw, width = 24, depth = 16, height = 7, color = 0x7a5a48, roof = 0x4a4c4e, door = 8, name = 'factory hall' }) {
    const b = this.beginBuilding(name, x, z, yaw, width, depth);
    const front = [];
    for (let o = -door / 2 + 0.8; o <= door / 2 - 0.8; o += 1.2) front.push(o);
    this.shell(b, { height, key: 'stone', color, front, back: [width * 0.3], t: 0.5, bay: 4, sill: Math.max(1.2, height - 3.2), head: height - 0.8, frame: 0x6a6a64 });
    this.piece('metal', b, 0, height + 0.5, 0, width + 0.6, 0.25, depth + 0.6, roof, 0, 0, 0.05);
    for (let k = -1; k <= 1; k++) this.piece('metal', b, k * width * 0.3, height + 0.75, 0, width * 0.12, 0.3, depth * 0.7, 0x8a9aa0); // skylights
    this.endBuilding();
    return b;
  }

  /** A factory chimney: a tall brick stack (landmark; cover at its foot). */
  chimney({ x, z, height = 30 }) {
    const g = this.terrain.heightAt(x, z);
    _m.compose(_p.set(x, g + height / 2, z), _q.identity(), _s.set(1, 1, 1));
    this.push('stone', new THREE.CylinderGeometry(0.9, 1.6, height, 12), _m, 0x7a4a38);
    this.box('stone', x, g + 0.8, z, 4, 1.6, 4, 0, 0x6e4636);
    this.cover.addCylinder({ x, z, radius: 1.6, height: 3 });
  }

  /** A hardened aircraft shelter: a concrete half-barrel, open at the front. */
  aircraftShelter({ x, z, yaw }) {
    const g = this.terrain.heightAt(x, z);
    const R = 11;
    const L = 30;
    // the half cylinder with z ≥ 0 tipped forward: its axis along the shelter, the arch above ground
    _m.compose(_p.set(x, g, z), _q.setFromEuler(_e.set(-Math.PI / 2, yaw, 0, 'YXZ')), _s.set(1, 1, 1));
    const arch = new THREE.CylinderGeometry(R, R, L, 18, 1, true, -Math.PI / 2, Math.PI);
    this.push('stone', arch, _m, 0x8e8b82);
    // the inside face: the same arch a little smaller, its triangles and normals turned inward
    const inner = arch.clone().scale((R - 0.3) / R, 1, (R - 0.3) / R);
    const idx = inner.index.array;
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    const nrm = inner.attributes.normal;
    for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, -nrm.getX(i), -nrm.getY(i), -nrm.getZ(i));
    this.push('stone', inner, _m, 0x6e6b64);
    const [bx, bz] = PropBuilder.local(x, z, yaw, 0, -L / 2 + 0.6);
    this.box('stone', bx, g + R / 2, bz, R * 2, R, 1.2, yaw, 0x86837a);              // back wall
    const [fx, fz] = PropBuilder.local(x, z, yaw, 0, L / 2 - 0.4);
    this.box('metal', fx, g + 0.4, fz, R * 2, 0.8, 0.6, yaw, 0x55585a);              // door track
    for (const side of [-1, 1]) {                                                    // the arch: cover along both sides
      const [sx, sz] = PropBuilder.local(x, z, yaw, side * (R - 1.2), 0);
      this.cover.addBox({ x: sx, z: sz, yaw: yaw + Math.PI / 2, length: L, thickness: 2.2, height: 5 });
    }
    this.cover.addBox({ x: bx, z: bz, yaw, length: R * 2, thickness: 1.2, height: 6 });
  }

  /** The airfield control tower: a two-storey block with the glazed cab on top. Occupiable. */
  controlTower({ x, z, yaw }) {
    const b = this.beginBuilding('control tower', x, z, yaw, 12, 9);
    this.shell(b, { height: 6.4, storeys: 2, color: 0xb8b4a8, front: [2], back: [-3] });
    this.piece('stone', b, 0, 6.5, 0, 12.4, 0.3, 9.4, 0x8e8a80);
    this.piece('stone', b, -2, 8.2, 0, 6, 3.4, 6, 0xb8b4a8);
    this.piece('metal', b, -2, 11.2, 0, 7, 2.6, 7, 0x24303a);   // the glazed cab
    this.piece('stone', b, -2, 12.65, 0, 7.6, 0.3, 7.6, 0x6e6b62);
    this.endBuilding();
  }

  /** A jet caught on the ground: burnt out on its gear (cover, not a unit). */
  aircraftWreck({ x, z, yaw, scale = 1 }) {
    const g = this.terrain.heightAt(x, z);
    const s = scale;
    const P = (lx, ly, lz, sx, sy, sz, c, ry = 0, rx = 0, rz = 0) => {
      const [wx, wz] = PropBuilder.local(x, z, yaw, lx * s, lz * s);
      this.box('metal', wx, g + ly * s, wz, sx * s, sy * s, sz * s, yaw + ry, c, rx, rz);
    };
    P(0, 1.6, 0, 1.6, 1.6, 14, 0x2e302c, 0, 0.04);              // fuselage
    P(0, 1.3, 0.5, 11, 0.25, 3.2, 0x3a3c38, 0, 0, 0.06);         // wing
    P(0, 3.2, -6, 0.2, 2.8, 2, 0x34362f);                        // fin
    P(0, 1.8, -6, 4.4, 0.18, 1.6, 0x3a3c38);                     // tailplane
    P(3.6, 0.6, 0.6, 1.6, 0.18, 2.4, 0x262624, 0.4, 0, 0.5);     // a broken-off wing tip
    this.cover.addBox({ x, z, yaw, length: 1.8 * s, thickness: 13 * s, height: 1.6 * s });
  }

  /** A row of fuel / storage tanks (cover; a landmark). */
  tanks({ x, z, yaw, count = 3, radius = 3.5, height = 6, color = 0x9a9a92 }) {
    for (let i = 0; i < count; i++) {
      const [tx, tz] = PropBuilder.local(x, z, yaw, (i - (count - 1) / 2) * (radius * 2 + 2), 0);
      const g = this.terrain.heightAt(tx, tz);
      _m.compose(_p.set(tx, g + height / 2, tz), _q.identity(), _s.set(1, 1, 1));
      this.push('metal', new THREE.CylinderGeometry(radius, radius, height, 16), _m, color);
      this.cover.addCylinder({ x: tx, z: tz, radius, height });
    }
  }

  /** Railway track from (x0, z0) to (x1, z1): two rails on sleepers (visual). */
  rails({ x0, z0, x1, z1 }) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const yaw = Math.atan2(x1 - x0, z1 - z0);
    for (let t = 0; t < len; t += 0.9) {
      const x = x0 + ((x1 - x0) * t) / len;
      const z = z0 + ((z1 - z0) * t) / len;
      this.box('plain', x, this.terrain.heightAt(x, z) + 0.06, z, 2.6, 0.12, 0.24, yaw, 0x3a3026);
    }
    for (const side of [-0.72, 0.72]) {
      for (let t = 0; t < len; t += 6) {
        const l = Math.min(6, len - t);
        const [x, z] = PropBuilder.local(x0 + ((x1 - x0) * (t + l / 2)) / len, z0 + ((z1 - z0) * (t + l / 2)) / len, yaw, side, 0);
        this.box('metal', x, this.terrain.heightAt(x, z) + 0.2, z, 0.1, 0.14, l, yaw, 0x4a4844);
      }
    }
  }

  /** A goods wagon standing on the track: box car, tank car or open potash car (cover). */
  wagon({ x, z, yaw, color = 0x5a3426, kind = 'box' }) {
    const g = this.terrain.heightAt(x, z);
    const P = (lx, ly, lz, sx, sy, sz, c, key = 'metal') => {
      const [wx, wz] = PropBuilder.local(x, z, yaw, lx, lz);
      this.box(key, wx, g + ly, wz, sx, sy, sz, yaw, c);
    };
    P(0, 0.75, 0, 2.6, 0.3, 11, 0x24221e);
    for (const lz of [-3.6, 3.6]) for (const lx of [-0.72, 0.72]) P(lx, 0.45, lz, 0.2, 0.8, 0.8, 0x1e1c1a);
    if (kind === 'box') P(0, 2.2, 0, 2.8, 2.7, 10.4, color, 'plain');
    else if (kind === 'tank') {
      _m.compose(_p.set(x, g + 2.1, z), _q.setFromEuler(_e.set(Math.PI / 2, yaw, 0, 'YXZ')), _s.set(1, 1, 1));
      this.push('metal', new THREE.CylinderGeometry(1.3, 1.3, 10, 14), _m, color);
    } else {
      P(0, 1.5, 0, 2.8, 1.2, 10.4, color, 'plain');
      P(0, 2.15, 0, 2.5, 0.3, 10, 0xd8d4cc, 'rock'); // heaped with salt
    }
    this.cover.addBox({ x, z, yaw, length: 2.8, thickness: 11, height: kind === 'open' ? 2 : 3.4 });
  }

  /** A mine headframe (Förderturm): a steel tower over the shaft, sheave wheels on top. */
  headframe({ x, z, yaw, height = 34 }) {
    const g = this.terrain.heightAt(x, z);
    const steel = 0x5a3e30;
    const L = (lx, lz) => PropBuilder.local(x, z, yaw, lx, lz);
    for (const [lx, lz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
      const [px, pz] = L(lx, lz);
      this.box('metal', px, g + height / 2, pz, 0.6, height, 0.6, yaw, steel);
    }
    for (let y = 6; y < height; y += 6) {
      for (const lz of [-3, 3]) {
        const [px, pz] = L(0, lz);
        this.box('metal', px, g + y, pz, 6.4, 0.35, 0.35, yaw, steel);
      }
      for (const lx of [-3, 3]) {
        const [px, pz] = L(lx, 0);
        this.box('metal', px, g + y, pz, 0.35, 0.35, 6.4, yaw, steel);
      }
    }
    const [sx, sz] = L(0, -8); // the raking strut back to the winding house
    this.box('metal', sx, g + height * 0.45, sz, 0.8, height, 0.8, yaw, steel, -0.42);
    this.box('metal', x, g + height + 0.3, z, 7, 0.6, 7, yaw, steel);
    for (const lx of [-1.6, 1.6]) {
      const [wx, wz] = L(lx, 0);
      _m.compose(_p.set(wx, g + height + 3.4, wz), _q.setFromEuler(_e.set(0, yaw + Math.PI / 2, 0)), _s.set(1, 1, 1));
      this.push('metal', new THREE.TorusGeometry(3, 0.22, 6, 24), _m, 0x3a2a22);
    }
    this.cover.addBox({ x, z, yaw, length: 7, thickness: 7, height: 3 });
  }

  /** A conveyor bridge on legs from (x0, z0), y0 above the ground, to (x1, z1), y1. Visual. */
  conveyor({ x0, z0, y0 = 6, x1, z1, y1 = 20 }) {
    const g0 = this.terrain.heightAt(x0, z0) + y0;
    const g1 = this.terrain.heightAt(x1, z1) + y1;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const yaw = Math.atan2(x1 - x0, z1 - z0);
    const pitch = Math.atan2(g1 - g0, len);
    this.box('metal', (x0 + x1) / 2, (g0 + g1) / 2, (z0 + z1) / 2, 2.6, 2.4, Math.hypot(len, g1 - g0), yaw, 0x7a7c74, -pitch);
    for (let t = 0.15; t < 1; t += 0.22) {
      const x = x0 + (x1 - x0) * t;
      const z = z0 + (z1 - z0) * t;
      const top = g0 + (g1 - g0) * t;
      const gg = this.terrain.heightAt(x, z);
      this.box('metal', x, (gg + top) / 2, z, 0.5, top - gg, 0.5, yaw, 0x5a5c56);
      this.cover.addCylinder({ x, z, radius: 0.5, height: 3, spots: false });
    }
  }

  /** Low wall along a street or yard (cover). */
  lowWall({ x, z, yaw, length, height = 1.1, color = 0x8a867c }) {
    const g = this.terrain.heightAt(x, z);
    this.box('stone', x, g + height / 2 - 0.1, z, length, height + 0.2, 0.35, yaw, color);
    this.cover.addBox({ x, z, yaw, length, thickness: 0.35, height });
  }

  /** Stacked logs from forestry work (cover). */
  logPile({ x, z, yaw, length = 8 }) {
    const g = this.terrain.heightAt(x, z);
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 4 - row; i++) {
        const [lx, lz] = PropBuilder.local(x, z, yaw, (i - (3 - row) / 2) * 0.62, 0);
        _m.compose(_p.set(lx, g + 0.3 + row * 0.52, lz), _q.setFromEuler(_e.set(Math.PI / 2, yaw, 0, 'YXZ')), _s.set(1, 1, 1));
        this.push('plain', new THREE.CylinderGeometry(0.3, 0.3, length, 8), _m, new THREE.Color().setHSL(0.07, 0.35, 0.3 + this.rand() * 0.08).getHex());
      }
    }
    this.cover.addBox({ x, z, yaw: yaw + Math.PI / 2, length, thickness: 2.4, height: 1.5 });
  }

  /** A hunter's high seat (Hochsitz) at a forest edge: a landmark. */
  highSeat({ x, z, yaw }) {
    const g = this.terrain.heightAt(x, z);
    for (const [lx, lz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
      const [px, pz] = PropBuilder.local(x, z, yaw, lx, lz);
      this.box('plain', px, g + 2.2, pz, 0.15, 4.4, 0.15, yaw, 0x4a3a2a);
    }
    this.box('plain', x, g + 4.8, z, 1.9, 1.2, 1.9, yaw, 0x54442e);
    this.box('plain', x, g + 5.6, z, 2.2, 0.15, 2.2, yaw, 0x3e3426);
  }

  /** Merge every batch into one mesh per material and add them to the scene. */
  finish() {
    for (const [k, geos] of this.batches) {
      const [key, group] = k.split('#');
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), this.material(key));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      if (group !== undefined) this.buildings[+group].meshes.push(mesh);
    }
    this.batches.clear();
  }
}
