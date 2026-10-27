// Heightfield terrain. Heights are sampled once from the map's height(x, z) function into a
// grid; the mesh uses the same grid, so heightAt() (bilinear) matches what you see.
// Shading: vertex colours carry the land (farm fields from world/Fields.js, worn tracks,
// the border strip, rock on slopes); a small shader adds what vertices can't — furrows and
// crop rows per pixel (with matching normal ripple), and a large-scale variation sampled from
// the detail texture so the ground never looks tiled.
// Also provides the ray / line-of-sight queries used by aiming, picking and unit AI.
import * as THREE from 'three';
import { makeDetailTextures } from './textures.js';
import { createNoise2D } from './Noise.js';
import { smoothstep } from '../core/math.js';
import { FIELD } from './Fields.js';

const EARTH = new THREE.Color(0x3d2f24); // freshly turned soil

export class Terrain {
  /**
   * @param {object} o
   * @param {number} o.size      edge length in metres (square, centred on the origin)
   * @param {number} o.segments  grid resolution
   * @param {(x:number, z:number) => number} o.height
   * @param {object} o.palette   colours: grass, grassAlt, dryGrass, dirt, rock, strip? (border strip along z = 0),
   *                             pasture / ploughed / stubble / meadow (with `fields`),
   *                             surface?(x, z, y) → [hex, amount] | null (a map's paved or bare ground)
   * @param {object} [o.fields]  farmland layout (world/Fields.js)
   */
  constructor({ size, segments = 300, height, palette, fields = null }) {
    this.fields = fields;
    this.size = size;
    this.segments = segments;
    this.half = size / 2;
    this.cell = size / segments;
    this.n = segments + 1;
    const n = this.n;
    this.heights = new Float32Array(n * n);
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        this.heights[iz * n + ix] = height(-this.half + ix * this.cell, -this.half + iz * this.cell);
      }
    }
    this.mesh = this.buildMesh(palette);
  }

  heightAt(x, z) {
    const s = this.segments;
    let fx = (x + this.half) / this.cell;
    let fz = (z + this.half) / this.cell;
    if (fx < 0) fx = 0; else if (fx > s - 1e-4) fx = s - 1e-4;
    if (fz < 0) fz = 0; else if (fz > s - 1e-4) fz = s - 1e-4;
    const ix = fx | 0;
    const iz = fz | 0;
    const tx = fx - ix;
    const tz = fz - iz;
    const n = this.n;
    const h = this.heights;
    const i = iz * n + ix;
    const a = h[i] + (h[i + 1] - h[i]) * tx;
    const b = h[i + n] + (h[i + n + 1] - h[i + n]) * tx;
    return a + (b - a) * tz;
  }

  normalAt(x, z, out) {
    const e = 0.75;
    return out.set(
      this.heightAt(x - e, z) - this.heightAt(x + e, z),
      2 * e,
      this.heightAt(x, z - e) - this.heightAt(x, z + e),
    ).normalize();
  }

  /** March a ray against the heightfield. Returns the hit point (in `out`) or null. */
  raycast(origin, dir, maxDist = 600, out = new THREE.Vector3()) {
    const step = 1;
    if (origin.y < this.heightAt(origin.x, origin.z)) return null;
    for (let t = step; t <= maxDist; t += step) {
      const y = origin.y + dir.y * t;
      if (y < this.heightAt(origin.x + dir.x * t, origin.z + dir.z * t)) {
        let lo = t - step;
        let hi = t;
        for (let k = 0; k < 10; k++) {
          const mid = (lo + hi) / 2;
          const my = origin.y + dir.y * mid;
          if (my < this.heightAt(origin.x + dir.x * mid, origin.z + dir.z * mid)) hi = mid; else lo = mid;
        }
        return out.copy(origin).addScaledVector(dir, hi);
      }
    }
    return null;
  }

  /** True when the straight line a→b stays above the ground (by `lift` metres). */
  lineOfSight(ax, ay, az, bx, by, bz, lift = 0.25) {
    const dist = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(4, Math.ceil(dist / 3));
    for (let i = 1; i < steps; i++) {
      const k = i / steps;
      const x = ax + (bx - ax) * k;
      const z = az + (bz - az) * k;
      if (ay + (by - ay) * k < this.heightAt(x, z) + lift) return false;
    }
    return true;
  }

  /**
   * Lower the ground around (cx, cz): `shape(x, z)` returns 0..1, the share of `depth` to remove
   * at that point (0 outside the hole). Used for trenches and shell craters. Updates the height
   * grid (so units, LOS and bolts feel it), the mesh, its normals and colours (fresh earth).
   */
  dig(cx, cz, radius, depth, shape, scorch = 0.7) {
    const { segments: s, n, cell, half } = this;
    const ix0 = Math.max(0, Math.floor((cx - radius + half) / cell));
    const ix1 = Math.min(s, Math.ceil((cx + radius + half) / cell));
    const iz0 = Math.max(0, Math.floor((cz - radius + half) / cell));
    const iz1 = Math.min(s, Math.ceil((cz + radius + half) / cell));
    const geo = this.mesh.geometry;
    const pos = geo.attributes.position;
    const col = geo.attributes.color;
    const fur = geo.attributes.aFurrow;
    for (let iz = iz0; iz <= iz1; iz++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        const k = shape(-half + ix * cell, -half + iz * cell);
        if (k <= 0) continue;
        const i = iz * n + ix;
        this.heights[i] -= depth * k;
        pos.setY(i, this.heights[i]);
        const t = Math.min(1, k * scorch);
        col.setXYZ(i, col.getX(i) + (EARTH.r - col.getX(i)) * t, col.getY(i) + (EARTH.g - col.getY(i)) * t, col.getZ(i) + (EARTH.b - col.getZ(i)) * t);
        fur.setX(i, fur.getX(i) * (1 - Math.min(1, k * 2))); // dug ground has no furrows
      }
    }
    this.updateNormals(ix0 - 1, ix1 + 1, iz0 - 1, iz1 + 1);
    // upload only the touched rows
    const offset = Math.max(0, iz0 - 1) * n * 3;
    const count = (Math.min(s, iz1 + 1) - Math.max(0, iz0 - 1) + 1) * n * 3;
    for (const a of [pos, col, geo.attributes.normal, fur]) {
      const stride = a.itemSize;
      a.clearUpdateRanges?.();
      if (a.addUpdateRange) a.addUpdateRange((offset / 3) * stride, (count / 3) * stride);
      else {
        a.updateRange.offset = (offset / 3) * stride;
        a.updateRange.count = (count / 3) * stride;
      }
      a.needsUpdate = true;
    }
  }

  /** Recompute vertex normals from the height grid (central differences) in a window. */
  updateNormals(ix0, ix1, iz0, iz1) {
    const { segments: s, n, cell, heights: h } = this;
    const nrm = this.mesh.geometry.attributes.normal;
    for (let iz = Math.max(0, iz0); iz <= Math.min(s, iz1); iz++) {
      for (let ix = Math.max(0, ix0); ix <= Math.min(s, ix1); ix++) {
        const i = iz * n + ix;
        const hl = h[iz * n + Math.max(0, ix - 1)];
        const hr = h[iz * n + Math.min(s, ix + 1)];
        const hd = h[Math.max(0, iz - 1) * n + ix];
        const hu = h[Math.min(s, iz + 1) * n + ix];
        const nx = hl - hr;
        const ny = 2 * cell;
        const nz = hd - hu;
        const len = Math.hypot(nx, ny, nz);
        nrm.setXYZ(i, nx / len, ny / len, nz / len);
      }
    }
  }

  buildMesh(palette) {
    const geo = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    geo.rotateX(-Math.PI / 2); // rows now run from z = -half to +half, matching the height grid
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, this.heights[i]);
    geo.computeVertexNormals();

    // Vertex colours from slope, height and noise: grass, dry patches, dirt, worn paths, rock.
    const nrm = geo.attributes.normal;
    const noise = createNoise2D(91);
    const col = (k) => new THREE.Color(palette[k]);
    const grassA = col('grass');
    const grassB = col('grassAlt');
    const dry = col('dryGrass');
    const dirt = col('dirt');
    const rock = col('rock');
    const strip = palette.strip ? col('strip') : null;
    const fieldColor = {
      [FIELD.PASTURE]: col(palette.pasture ? 'pasture' : 'grass'),
      [FIELD.PLOUGHED]: col(palette.ploughed ? 'ploughed' : 'dirt'),
      [FIELD.STUBBLE]: col(palette.stubble ? 'stubble' : 'dryGrass'),
      [FIELD.MEADOW]: col(palette.meadow ? 'meadow' : 'grassAlt'),
    };
    const fields = this.fields;
    // layout knobs (map theme.terrain): where farmland gives way to the wooded edges, and the
    // dirt tracks running north–south (x offsets) and how far they reach
    const farmX = palette.farmX ?? [170, 230];
    const farmZ = palette.farmZ ?? [240, 300];
    const roads = palette.roads ?? [0];
    const roadZ = palette.roadZ ?? 118;
    const c = new THREE.Color();
    const fc = new THREE.Color();
    const colors = new Float32Array(pos.count * 3);
    const furrows = new Float32Array(pos.count * 3); // strength, angle, spacing
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const ny = nrm.getY(i);
      const n1 = noise(x * 0.04, z * 0.04) * 0.5 + 0.5;
      const n2 = noise(x * 0.13 + 50, z * 0.13) * 0.5 + 0.5;
      const n3 = noise(x * 0.012 - 20, z * 0.012 + 7) * 0.5 + 0.5;
      c.copy(grassA).lerp(grassB, n1);
      c.lerp(dry, smoothstep(0.55, 0.8, n3) * 0.7);
      let furrow = 0;
      let angle = 0;
      let spacing = 1;
      if (fields) {
        // farm fields fade out toward the wooded ridges at the edge of the map
        const farm = smoothstep(farmX[1], farmX[0], Math.abs(x)) * smoothstep(farmZ[1], farmZ[0], Math.abs(z));
        const f = fields.at(x, z);
        fc.copy(fieldColor[f.type]).offsetHSL(f.tint * 0.015, f.tint * 0.04, f.tint * 0.025);
        if (f.type !== FIELD.PLOUGHED) fc.lerp(dry, smoothstep(0.6, 0.85, n3) * 0.35);
        const margin = smoothstep(2.5, 0.6, f.edge); // grassy headland along every boundary
        fc.lerp(grassB, margin * 0.8);
        c.lerp(fc, farm);
        const rows = f.type === FIELD.PLOUGHED ? 1 : f.type === FIELD.STUBBLE ? 0.55 : f.type === FIELD.MEADOW ? 0.18 : 0;
        furrow = rows * farm * smoothstep(2.5, 4.5, f.edge);
        angle = f.angle;
        spacing = f.spacing * (f.type === FIELD.PLOUGHED ? 1 : 1.6);
      }
      c.lerp(dirt, smoothstep(0.66, 0.88, n2) * 0.6);
      let track = 0;
      for (const rx of roads) track = Math.max(track, smoothstep(9, 2.5, Math.abs(x - rx + Math.sin(z * 0.045 + rx) * 7)) * smoothstep(roadZ, roadZ - 28, Math.abs(z)));
      c.lerp(dirt, track * 0.55);
      const rockK = Math.min(1, smoothstep(0.9, 0.72, ny) + smoothstep(14, 28, y) * 0.75);
      c.lerp(rock, rockK);
      let stripK = 0;
      if (palette.strip) {
        stripK = smoothstep(5, 2.5, Math.abs(z + Math.sin(x * 0.03) * 1.5));
        c.lerp(strip, stripK * 0.85 * (0.8 + n2 * 0.4)); // ploughed border strip
      }
      // the map's own surfaces: streets, runways, spoil heaps — [hex colour, 0..1] or null
      const surf = palette.surface?.(x, z, y);
      if (surf && surf[1] > 0) {
        c.lerp(fc.set(surf[0]).multiplyScalar(0.92 + n1 * 0.16), surf[1]);
        furrow *= 1 - surf[1];
      }
      c.multiplyScalar(0.9 + n2 * 0.2);
      furrow *= (1 - track) * (1 - rockK);
      if (stripK > furrow) { furrow = stripK * 0.8; angle = 0; spacing = 0.7; } // the strip is harrowed along the border
      furrows[i * 3] = furrow;
      furrows[i * 3 + 1] = angle;
      furrows[i * 3 + 2] = spacing;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aFurrow', new THREE.BufferAttribute(furrows, 3));

    const { map, normalMap } = makeDetailTextures({ seed: 5, scale: 8, base: 0.82, contrast: 0.32, bump: 3 });
    map.repeat.set(this.size / 7, this.size / 7);
    normalMap.repeat.copy(map.repeat);
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, map, normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.96, metalness: 0,
    });
    mat.userData.terrain = true; // render/babylon/plugins.js TerrainPlugin
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 aFurrow;\nvarying vec3 vFurrow;\nvarying vec2 vWorldXZ;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFurrow = aFurrow;\nvWorldXZ = (modelMatrix * vec4(position, 1.0)).xz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vFurrow;\nvarying vec2 vWorldXZ;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          // large-scale variation from the same texture at ~30x the scale: breaks up tiling
          float macro = texture2D(map, vMapUv * 0.033).r * 0.6 + texture2D(map, vMapUv * 0.0071 + 0.37).r * 0.4;
          diffuseColor.rgb *= 0.82 + (macro - 0.8) * 1.3;
          // furrows / crop rows: ridges lit, troughs shaded
          vec2 fdir = vec2(cos(vFurrow.y), sin(vFurrow.y));
          float fu = dot(vWorldXZ, fdir) / max(0.3, vFurrow.z) * 6.2831853;
          float ridge = sin(fu);
          float fk = clamp(vFurrow.x, 0.0, 1.0);
          diffuseColor.rgb *= 1.0 + fk * (ridge * 0.16 - 0.04);`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          vec3 fview = normalize((viewMatrix * vec4(fdir.x, 0.0, fdir.y, 0.0)).xyz);
          normal = normalize(normal - fview * cos(fu) * 0.45 * fk);`);
    };
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return mesh;
  }
}
