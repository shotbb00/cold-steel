// Instanced vegetation: trees — spruce and autumn broadleaf — which also become thin cover,
// hedgerows along field boundaries (world/Fields.js), then grass tufts with wind that follow
// the land use (pasture, long meadow grass, straw stubble, bare ploughland), bushes and
// pebbles / clods. Trees go in before cover.finalize() so
// their trunks can block cover spots; ground cover goes in after so it avoids every collider.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createNoise2D } from './Noise.js';
import { makeRockGeometry } from './Props.js';
import { TAU } from '../core/math.js';
import { FIELD } from './Fields.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _n = new THREE.Vector3();
const _c = new THREE.Color();
const Y_AXIS = new THREE.Vector3(0, 1, 0);

function isFree(cover, avoid, x, z, r) {
  for (const a of avoid) {
    if (a.test) { if (a.test(x, z)) return false; continue; } // a map rule (e.g. "not in the river")
    if ((x - a.x) ** 2 + (z - a.z) ** 2 < a.r * a.r) return false;
  }
  return !cover.pointBlocked(x, z, r);
}

/**
 * Tag an instanced mesh as optional detail: render/Quality.js thins it out on lower settings by
 * drawing fewer instances (they were placed in random order, so any prefix is an even sample).
 */
function detail(mesh, kind) {
  mesh.userData.detail = kind;
  mesh.userData.baseCount = mesh.count;
  return mesh;
}

function instanced(geo, mat, count, { cast = true, receive = true } = {}) {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

// ---- tree geometry (unit tree: 1 m tall, scaled per instance). Vertex colours carry the shading
// a crown has in reality — dark inside and underneath, lighter at the tips — and the instance
// colour tints it (species, autumn).

const shade = (g, fn) => {
  const p = g.attributes.position;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) c.fill(fn(p.getX(i), p.getY(i), p.getZ(i)), i * 3, i * 3 + 3);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
};

/** A tapering trunk with a little root flare. */
function trunkGeometry() {
  const pts = [[0.3, 0], [0.22, 0.04], [0.17, 0.15], [0.12, 0.6], [0.07, 1]].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 7);
  g.deleteAttribute('uv');
  return g;
}

/**
 * Spruce: four tiers of drooping branches up the stem to a spire. Each tier is a skirt whose rim
 * alternates long and short branch tips, the long ones hanging lower, and closes back to the
 * stem underneath, so the tree has a ragged outline and a dark underside.
 */
function spruceGeometry() {
  const tiers = [];
  const N = 12;
  const T = 4;
  for (let t = 0; t < T; t++) {
    const k = t / T;
    const base = 0.14 + k * 0.62;
    const top = base + 0.32 - k * 0.05;
    const r = 0.78 * (1 - k * 0.72);
    const pos = [];
    const rim = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + t * 0.4;
      const long = i % 2 === 0;
      const rr = r * (long ? 1 : 0.7);
      rim.push([Math.cos(a) * rr, base - (long ? 0.05 : 0.0), Math.sin(a) * rr]);
    }
    const apex = [0, top, 0];
    const under = [0, base + 0.07, 0];
    for (let i = 0; i < N; i++) {
      const a = rim[i], b = rim[(i + 1) % N];
      pos.push(...apex, ...b, ...a);    // upper face
      pos.push(...under, ...a, ...b);   // underside back to the stem
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    // soften: lean every normal outward from the stem so the tier lights as a rounded mass
    const nrm = g.attributes.normal, p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      _n.set(p.getX(i), 0, p.getZ(i));
      const out = _n.length();
      _n.normalize().multiplyScalar(0.7).add(_p.set(nrm.getX(i), nrm.getY(i), nrm.getZ(i)).multiplyScalar(0.6)).normalize();
      if (out < 1e-4) _n.set(0, nrm.getY(i) > 0 ? 1 : -1, 0);
      nrm.setXYZ(i, _n.x, _n.y, _n.z);
    }
    tiers.push(shade(g, (x, y, z) => {
      const out = Math.hypot(x, z) / Math.max(0.05, r);
      return y < base + 0.06 && out < 0.5 ? 0.3 : 0.42 + out * 0.3 + k * 0.1;
    }));
  }
  // the spire above the top tier
  tiers.push(shade(new THREE.ConeGeometry(0.06, 0.14, 5).translate(0, 1.0, 0).toNonIndexed(), () => 1.0));
  tiers.forEach((g) => g.deleteAttribute('uv'));
  return mergeGeometries(tiers);
}

/** Three crossed cards through the stem carrying a painted spruce silhouette (spruceTexture). */
function spruceCardGeometry() {
  const cards = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.PlaneGeometry(2.0, 0.98).translate(0, 0.56, 0).rotateY((i * Math.PI) / 3 + 0.3);
    const nrm = g.attributes.normal, p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {               // light it like a cone, not a flat card
      _n.set(p.getX(k), 0.45, p.getZ(k)).normalize();
      nrm.setXYZ(k, _n.x, _n.y, _n.z);
    }
    cards.push(g);
  }
  return mergeGeometries(cards);
}

/**
 * A spruce in silhouette (procedural canvas, pale so the instance colour tints it): the stem
 * and tiers of drooping branches, each drawn as a fishbone of needles, narrowing to the top.
 */
function spruceTexture(rand, w = 256, h = 128) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  g.lineCap = 'round';
  const tone = () => `hsl(${70 + rand() * 30},${10 + rand() * 12}%,${55 + rand() * 30}%)`;
  for (let row = 0; row < 26; row++) {
    const y = h * (0.9 - row * 0.032);                    // branch roots up the stem
    const reach = (w / 2) * (1 - row / 27) * (0.85 + rand() * 0.2);
    for (const side of [-1, 1]) {
      const len = reach * (0.75 + rand() * 0.3);
      const droop = len * (0.18 + rand() * 0.12);
      g.strokeStyle = tone();
      g.lineWidth = 1.3;
      g.beginPath();
      g.moveTo(w / 2, y);
      g.quadraticCurveTo(w / 2 + side * len * 0.6, y - droop * 0.2, w / 2 + side * len, y + droop);
      g.stroke();
      for (let k = 0; k < 14; k++) {                      // needles along the branch
        const t = 0.15 + k / 16;
        const bx = w / 2 + side * len * t, by = y + droop * t * t;
        g.strokeStyle = tone();
        g.lineWidth = 1;
        for (const up of [-1, 1]) {
          g.beginPath();
          g.moveTo(bx, by);
          g.lineTo(bx + side * 3 * (0.6 + rand()), by + up * (2.5 + rand() * 2.5));
          g.stroke();
        }
      }
    }
  }
  g.strokeStyle = 'hsl(30,25%,38%)';
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(w / 2, h);
  g.lineTo(w / 2, h * 0.02);
  g.stroke();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// lumps of a broadleaf crown, unit space: [x, y, z, radius]
const LUMPS = [[0, 0.74, 0, 0.3], [0.24, 0.66, 0.08, 0.22], [-0.22, 0.68, -0.1, 0.23], [0.06, 0.66, -0.25, 0.21], [-0.08, 0.64, 0.24, 0.21], [0.14, 0.86, 0.1, 0.2], [-0.12, 0.88, -0.05, 0.19]];

/** Broadleaf crown: seven lumps of foliage, their normals blended toward the crown's centre. */
function crownGeometry() {
  const parts = LUMPS.map(([x, y, z, r], i) => {
    const g = makeRockGeometry(900 + i * 13, 0).scale(r, r * 0.85, r);
    g.deleteAttribute('uv');
    const ng = g.index ? g.toNonIndexed() : g;
    ng.translate(x, y, z);
    ng.computeVertexNormals();
    const p = ng.attributes.position, nrm = ng.attributes.normal;
    for (let k = 0; k < p.count; k++) {
      _n.set(p.getX(k), p.getY(k) - 0.72, p.getZ(k)).normalize().multiplyScalar(0.75).add(_p.set(nrm.getX(k), nrm.getY(k), nrm.getZ(k)).multiplyScalar(0.4)).normalize();
      nrm.setXYZ(k, _n.x, _n.y, _n.z);
    }
    return shade(ng, (vx, vy, vz) => 0.35 + Math.min(0.35, Math.hypot(vx, vz) * 0.8 + (vy - 0.6) * 0.7));
  });
  return mergeGeometries(parts);
}

/** Leaf cards over the crown's lumps, facing out, for a ragged, leafy silhouette. */
function crownCardGeometry() {
  const cards = [];
  LUMPS.forEach(([x, y, z, r], i) => {
    const size = r * 2.7;
    for (let j = 0; j < 3; j++) {
      const g = new THREE.PlaneGeometry(size, size * 0.9);
      if (j === 2) g.rotateX(-Math.PI / 2 + 0.35);                     // one laid over the top of the lump
      g.rotateY(Math.atan2(x, z) + j * Math.PI * 0.5 + i).translate(x * 1.15, y + (j === 2 ? r * 0.5 : 0.04), z * 1.15);
      const nrm = g.attributes.normal, p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        _n.set(p.getX(k), p.getY(k) - 0.72, p.getZ(k)).normalize();
        nrm.setXYZ(k, _n.x, _n.y, _n.z);
      }
      cards.push(g);
    }
  });
  return mergeGeometries(cards);
}

/**
 * @param {object} o  { scene, terrain, cover, rand, area:{x,z}, lane: half-width of the battle lane, avoid:[{x,z,r}], count }
 *   Returns { update(dt, t) } (the wind in the leaf cards).
 */
/** @param {any} o  options, untyped until this file moves to TypeScript */
export function plantTrees({ scene, terrain, cover, rand, area, lane = 48, avoid = [], count = 260, broadleaf = 0.55, autumn = 0.7, forest = null }) {
  const trunks = instanced(trunkGeometry(), new THREE.MeshStandardMaterial({ color: 0x3b2e25, roughness: 1 }), count);
  const spruces = instanced(spruceGeometry(), new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.9 }), count);
  const spruceCardMat = new THREE.MeshStandardMaterial({ map: spruceTexture(rand), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95, color: 0xffffff });
  const spruceCards = instanced(spruceCardGeometry(), spruceCardMat, count, { cast: false });
  spruceCards.userData.noAO = true;
  const leaves = instanced(crownGeometry(), new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.92 }), count);
  // ragged leafy edges round each broadleaf crown: alpha-tested cards that sway in the wind
  const time = { value: 0 };
  const cardMat = new THREE.MeshStandardMaterial({ map: leafTexture(rand, 256, true), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.95, color: 0xffffff });
  cardMat.userData.wind = { kind: 'leaf', time };
  cardMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 wp = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      #else
        vec2 wp = vec2(0.0);
      #endif
      float sway = sin(uTime * 1.1 + wp.x * 0.3 + wp.y * 0.2) * 0.5 + sin(uTime * 2.3 + wp.y * 0.7) * 0.2;
      transformed.x += sway * 0.012 * position.y;
      transformed.z += sway * 0.008 * position.y;`);
  };
  const cards = instanced(crownCardGeometry(), cardMat, count, { cast: false });
  cards.userData.noAO = true;
  let ks = 0;
  let kl = 0;

  let k = 0;
  for (let tries = 0; k < count && tries < count * 30; tries++) {
    const x = (rand() * 2 - 1) * (area.x + 70);
    const z = (rand() * 2 - 1) * (area.z + 40);
    const inLane = Math.abs(x) < lane && Math.abs(z) < area.z;
    const wood = forest?.(x, z) ?? 0;          // 0..1: a forest the map wants here (ridges, copses)
    if (inLane && rand() > 0.06 + wood) continue; // the battle lane stays mostly open
    const y = terrain.heightAt(x, z);
    terrain.normalAt(x, z, _n);
    if (_n.y < 0.78 || y > 32) continue;
    if (!isFree(cover, avoid, x, z, 2)) continue;

    const H = 5 + rand() * 7;
    const w = 0.8 + rand() * 0.5;
    const yaw = rand() * TAU;
    _q.setFromAxisAngle(Y_AXIS, yaw);
    const leafy = rand() < broadleaf;
    _m.compose(_p.set(x, y - 0.2, z), _q, _s.set(w, H * (leafy ? 0.75 : 0.7), w));
    trunks.setMatrixAt(k, _m);
    if (leafy) {
      const R = H * (0.55 + rand() * 0.2) * w;
      _m.compose(_p.set(x, y - 0.2, z), _q, _s.set(R, H, R));
      leaves.setMatrixAt(kl, _m);
      // oak, beech and birch turning: rust, gold and a few still green
      const a = rand();
      if (a < autumn * 0.45) _c.setHSL(0.05 + rand() * 0.03, 0.55, 0.22 + rand() * 0.06);
      else if (a < autumn) _c.setHSL(0.1 + rand() * 0.03, 0.6, 0.26 + rand() * 0.08);
      else _c.setHSL(0.2 + rand() * 0.06, 0.35, 0.16 + rand() * 0.05);
      cards.setMatrixAt(kl, _m);
      cards.setColorAt(kl, _c);
      leaves.setColorAt(kl++, _c);
    } else {
      _m.compose(_p.set(x, y - 0.2, z), _q, _s.set(H * 0.42 * w, H, H * 0.42 * w));
      spruces.setMatrixAt(ks, _m);
      _c.setHSL(0.3 + rand() * 0.06, 0.3 + rand() * 0.1, 0.09 + rand() * 0.04);
      spruceCards.setMatrixAt(ks, _m);
      spruceCards.setColorAt(ks, _c);
      spruces.setColorAt(ks++, _c);
    }
    if (inLane) cover.addCylinder({ x, z, radius: 0.32 * w, height: 4 });
    k++;
  }
  trunks.count = k;
  spruces.count = spruceCards.count = ks;
  leaves.count = cards.count = kl;
  scene.add(trunks, spruces, spruceCards, leaves, cards);
  return {
    update(dt, t) {
      time.value = t;
    },
  };
}

/** @param {any} o  options, untyped until this file moves to TypeScript */
export function growGround({ scene, terrain, cover, rand, area, palette, avoid = [], density = 1, fields = null }) {
  const noise = createNoise2D(77);
  const uniforms = { uTime: { value: 0 } };
  const ext = { x: area.x + 35, z: area.z + 25 };
  const randomPoint = () => [(rand() * 2 - 1) * ext.x, (rand() * 2 - 1) * ext.z];

  // ---- grass tufts with a wind sway injected into the standard shader
  const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 });
  grassMat.userData.wind = { kind: 'grass', time: uniforms.uTime }; // render/babylon/plugins.js WindPlugin
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 wp = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      #else
        vec2 wp = vec2(0.0);
      #endif
      float sway = sin(uTime * 1.7 + wp.x * 0.35 + wp.y * 0.22) * 0.6 + sin(uTime * 3.3 + wp.y * 0.9) * 0.25;
      float bend = position.y * position.y;
      transformed.x += sway * 0.16 * bend;
      transformed.z += sway * 0.08 * bend;`);
  };
  const GRASS = Math.round(16000 * density);
  const grass = instanced(makeTuftGeometry(rand), grassMat, GRASS, { cast: false });
  const grassBase = new THREE.Color(palette.grass);
  const meadowBase = new THREE.Color(palette.meadow ?? palette.grassAlt);
  const strawBase = new THREE.Color(palette.stubble ?? palette.dryGrass).offsetHSL(0, 0.05, 0.08);
  let k = 0;
  for (let tries = 0; k < GRASS && tries < GRASS * 6; tries++) {
    const [x, z] = randomPoint();
    terrain.normalAt(x, z, _n);
    if (_n.y < 0.86) continue;
    const clump = noise(x * 0.08, z * 0.08);
    let base = grassBase;
    let tall = 1;
    let wide = 1;
    if (fields) {
      const f = fields.at(x, z);
      const headland = f.edge < 2.5;
      if (f.type === FIELD.PLOUGHED && !headland) continue;          // bare turned earth
      if (f.type === FIELD.STUBBLE && !headland) { base = strawBase; tall = 0.4; wide = 0.7; }
      else if (f.type === FIELD.MEADOW || headland) { base = meadowBase; tall = 1.45; }
      else if (clump < -0.1 && rand() > 0.12) continue;               // grazed pasture: patchy
    } else if (clump < -0.1 && rand() > 0.12) continue;
    if (!isFree(cover, avoid, x, z, 0.35)) continue;
    const y = terrain.heightAt(x, z);
    _q.setFromAxisAngle(Y_AXIS, rand() * TAU);
    _m.compose(_p.set(x, y - 0.03, z), _q, _s.set((0.8 + rand() * 0.6) * wide, (0.4 + rand() * 0.4 + clump * 0.2) * tall, (0.8 + rand() * 0.6) * wide));
    grass.setMatrixAt(k, _m);
    _c.copy(base).offsetHSL((rand() - 0.5) * 0.05, (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.08 + 0.04);
    grass.setColorAt(k, _c);
    k++;
  }
  grass.count = k;
  grass.userData.noAO = true; // thin blades add nothing to AO but cost a whole extra pass
  scene.add(detail(grass, 'grass'));

  // ---- bushes
  const BUSH = Math.round(260 * density);
  const bushes = instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), BUSH);
  k = 0;
  for (let tries = 0; k < BUSH && tries < BUSH * 10; tries++) {
    const [x, z] = randomPoint();
    if (!isFree(cover, avoid, x, z, 1.1)) continue;
    const s = 0.35 + rand() * 0.55;
    _q.setFromAxisAngle(Y_AXIS, rand() * TAU);
    _m.compose(_p.set(x, terrain.heightAt(x, z) + s * 0.25, z), _q, _s.set(s * (1 + rand() * 0.5), s * 0.65, s));
    bushes.setMatrixAt(k, _m);
    if (rand() < 0.35) bushes.setColorAt(k, _c.setHSL(0.07 + rand() * 0.04, 0.3, 0.11 + rand() * 0.04)); // bramble, turning
    else bushes.setColorAt(k, _c.setHSL(0.22 + rand() * 0.08, 0.35, 0.09 + rand() * 0.05));
    k++;
  }
  bushes.count = k;
  scene.add(detail(bushes, 'clutter'));

  // ---- pebbles
  const PEB = Math.round(700 * density);
  const pebbles = instanced(makeRockGeometry(42, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), PEB, { cast: false });
  k = 0;
  for (let tries = 0; k < PEB && tries < PEB * 5; tries++) {
    const [x, z] = randomPoint();
    if (!isFree(cover, avoid, x, z, 0.2)) continue;
    const s = 0.08 + rand() * rand() * 0.45;
    _q.setFromAxisAngle(Y_AXIS, rand() * TAU);
    _m.compose(_p.set(x, terrain.heightAt(x, z), z), _q, _s.set(s, s * 0.6, s * (0.8 + rand() * 0.4)));
    pebbles.setMatrixAt(k, _m);
    const clod = fields && fields.at(x, z).type === FIELD.PLOUGHED;
    pebbles.setColorAt(k, clod ? _c.setHSL(0.07, 0.25, 0.16 + rand() * 0.06) : _c.setHSL(0.08, 0.06, 0.3 + rand() * 0.2)); // earth clods on ploughland
    k++;
  }
  pebbles.count = k;
  pebbles.userData.noAO = true;
  scene.add(detail(pebbles, 'clutter'));

  return {
    update(dt, t) {
      uniforms.uTime.value = t;
    },
  };
}

/**
 * Leaf texture (procedural canvas): hundreds of small leaves in greens, olives and autumn
 * browns with a few twigs, on transparency — for alpha-tested foliage cards. `neutral` makes
 * them pale and unsaturated, for cards tinted per instance (the trees' autumn colours).
 */
function leafTexture(rand, size = 256, neutral = false) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(58,44,30,0.9)';
  for (let i = 0; i < 7; i++) {                          // twigs
    g.lineWidth = 0.8 + rand() * 1.2;
    g.beginPath();
    let x = rand() * size;
    let y = size;
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (rand() - 0.5) * 60; y -= 30 + rand() * 50; g.lineTo(x, y); }
    g.stroke();
  }
  const leafColor = () => {
    const r = rand();
    if (neutral) return `hsl(${40 + rand() * 30},${8 + rand() * 12}%,${62 + rand() * 30}%)`;   // pale: the instance colour tints it
    if (r < 0.62) return `hsl(${80 + rand() * 30},${28 + rand() * 18}%,${28 + rand() * 16}%)`;  // greens
    if (r < 0.88) return `hsl(${45 + rand() * 18},${32 + rand() * 18}%,${32 + rand() * 14}%)`;  // olive, yellowing
    return `hsl(${12 + rand() * 16},${42 + rand() * 18}%,${30 + rand() * 12}%)`;                // autumn brown / red
  };
  for (let i = 0; i < 4200; i++) {
    const x = rand() * size;
    const y = rand() * size;
    // dense toward the middle, ragged at the edges
    const d = Math.hypot(x - size / 2, y - size / 2) / (size / 2);
    if (d > 0.98 || rand() < d ** 3 * 0.9) continue;
    g.save();
    g.translate(x, y);
    g.rotate(rand() * Math.PI * 2);
    g.fillStyle = leafColor();
    g.beginPath();
    g.ellipse(0, 0, 2.5 + rand() * 3, 1.3 + rand() * 1.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.18)';                     // a little self-shadow on one side
    g.beginPath();
    g.ellipse(0, 1, 3, 1, 0, 0, Math.PI);
    g.fill();
    g.restore();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Hedgerows: hawthorn, blackthorn and bramble along about half the field boundaries, with
 * gaps. Each shrub is a dark inner core plus crossed, alpha-tested leaf cards that sway in the
 * wind. Purely visual (they don't stop bullets), thinned out in the middle of the battle lane.
 * Returns { update(dt, t) }.
 */
/** @param {any} o  options, untyped until this file moves to TypeScript */
export function plantHedgerows({ scene, terrain, cover, rand, fields, area, avoid = [], count = 3200, lane = 60 }) {
  // the core: a cluster of small dark masses that fills the gaps between the cards
  const lumps = [[0, 0.5, 0, 0.3], [0.25, 0.4, 0.08, 0.22], [-0.23, 0.43, -0.09, 0.23], [0.05, 0.72, 0.04, 0.2]];
  const coreGeo = mergeGeometries(lumps.map(([x, y, z, r], i) => {
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.rotateY(i * 1.7).translate(x, y - 0.5, z);
    g.deleteAttribute('uv');
    return g;
  }));
  const core = instanced(coreGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), count);

  // the cards: five upright quads fanned around the axis and two tilted ones, normals pointing out from the
  // shrub's centre so it lights like a rounded mass rather than flat planes
  const cards = [];
  for (let i = 0; i < 5; i++) cards.push(new THREE.PlaneGeometry(1.6 - (i % 2) * 0.3, 1.35 - (i % 2) * 0.25).rotateY((i * Math.PI) / 5).translate(0, 0.1 + (i % 2) * 0.08, 0));
  for (let i = 0; i < 2; i++) cards.push(new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2 + 0.5).rotateY(i * Math.PI + 0.7).translate(0, 0.35, 0));
  const cardGeo = mergeGeometries(cards);
  const pos = cardGeo.attributes.position;
  const nor = cardGeo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    _n.set(pos.getX(i), pos.getY(i) - 0.0, pos.getZ(i)).normalize();
    _n.y = _n.y * 0.6 + 0.4;
    _n.normalize();
    nor.setXYZ(i, _n.x, _n.y, _n.z);
  }
  const uniforms = { uTime: { value: 0 } };
  const leafMat = new THREE.MeshStandardMaterial({
    map: leafTexture(rand), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.95, color: 0xffffff,
  });
  leafMat.userData.wind = { kind: 'leaf', time: uniforms.uTime };
  leafMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 wp = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      #else
        vec2 wp = vec2(0.0);
      #endif
      float sway = sin(uTime * 1.3 + wp.x * 0.3 + wp.y * 0.2) * 0.5 + sin(uTime * 2.9 + wp.y * 0.7) * 0.2;
      float lift = max(0.0, position.y + 0.6);
      transformed.x += sway * 0.05 * lift;
      transformed.z += sway * 0.03 * lift;`);
  };
  const leaves = instanced(cardGeo, leafMat, count);
  leaves.userData.noAO = true; // alpha cut-outs would show up as solid quads in the AO pass

  const gaps = createNoise2D(55);
  let k = 0;
  for (let tries = 0; k < count && tries < count * 40; tries++) {
    const x = (rand() * 2 - 1) * (area.x + 60);
    const z = (rand() * 2 - 1) * (area.z + 30);
    const f = fields.at(x, z);
    if (!f.hedge || f.edge > 0.8) continue;
    if (gaps(x * 0.05, z * 0.05) < -0.35) continue;                  // gateways and gaps
    if (Math.abs(x) < lane && Math.abs(z) < area.z && rand() < 0.55) continue;
    terrain.normalAt(x, z, _n);
    if (_n.y < 0.8) continue;
    if (!isFree(cover, avoid, x, z, 0.7)) continue;
    const s = 0.75 + rand() * 0.7;
    _q.setFromEuler(_e.set((rand() - 0.5) * 0.15, rand() * TAU, (rand() - 0.5) * 0.15));
    _m.compose(_p.set(x, terrain.heightAt(x, z) + s * 0.55, z), _q, _s.set(s * (0.9 + rand() * 0.4), s * (0.8 + rand() * 0.6), s));
    core.setMatrixAt(k, _m);
    leaves.setMatrixAt(k, _m);
    core.setColorAt(k, _c.setHSL(0.2 + rand() * 0.05, 0.3, 0.05 + rand() * 0.02)); // shadowed interior
    leaves.setColorAt(k, _c.setHSL(0.15 + rand() * 0.1, 0.15, 0.85 + rand() * 0.3)); // slight per-shrub variation
    k++;
  }
  core.count = leaves.count = k;
  leaves.castShadow = false; // thousands of alpha cards in the shadow map cost more than they show; the core casts
  scene.add(detail(core, 'hedge'), detail(leaves, 'hedge'));
  return {
    update(dt, t) {
      uniforms.uTime.value = t;
    },
  };
}

/** A tuft of thin leaning blades; vertex colour darkens toward the root. */
function makeTuftGeometry(rand) {
  const pos = [];
  const col = [];
  const nor = [];
  for (let b = 0; b < 7; b++) {
    const a = rand() * TAU;
    const r = rand() * 0.18;
    const w = 0.035 + rand() * 0.03;
    const h = 0.6 + rand() * 0.5;
    const lean = 0.12 + rand() * 0.25;
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    const dx = Math.cos(a + Math.PI / 2) * w;
    const dz = Math.sin(a + Math.PI / 2) * w;
    pos.push(cx - dx, 0, cz - dz, cx + dx, 0, cz + dz, cx + Math.cos(a) * lean, h, cz + Math.sin(a) * lean);
    col.push(0.45, 0.48, 0.4, 0.45, 0.48, 0.4, 1.15, 1.12, 0.92);
    nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
