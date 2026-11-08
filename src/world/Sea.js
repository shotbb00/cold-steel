// The open sea (a sea map's `river`: it answers the questions the game asks of water — level, how
// deep stops a man, no bridges, no fords). The surface is one big sheet at `level`; the map's
// height function makes the sea floor (deep) and the islands, reefs and sandbanks (above or just
// under it). Ships (UnitStack `naval`) need water at least world/Nav.js SHIP_DEPTH deep.
//
// The water is all shader, no moving mesh: the sea's depth is baked into the sheet once (aDepth, from
// the terrain), and per pixel that gives the colour (turquoise over the reef and the sand, blue going
// to near black over the deep), how clear it is (you see the bottom in the shallows, nothing out
// deep), and surf where it shoals to nothing. Waves are a height field of drifting noise turned into
// normals (a long swell, a cross sea, chop): the sun's glints and the sky's reflection break up on
// them. The Babylon renderer runs the same GLSL (render/babylon/plugins.js WaterPlugin).
import * as THREE from 'three';
import { NOISE } from '../render/paint.js';

/** The waves' clock: read every frame by both renderers. */
export const SEA_TIME = { get value() { return (performance.now() / 1000) % 20000; } };

const f = (v) => v.toFixed(4);
/** The water's GLSL (needs paint.js NOISE): seaHeight(p, t) in metres, seaColor(depth, p, t) → linear rgb, alpha. */
export function waterGlsl(deep) {
  return /* glsl */ `
  // dist: from the camera. The small waves fade out with it (where a pixel spans metres they would only
  // sparkle) — by distance, not by the pixel's footprint: that jumps from one triangle to the next, and the
  // normals, made from the height's screen derivatives, would show every edge of the mesh
  float seaHeight(vec2 p, float t, float dist) {
    float far = 1.0 - smoothstep(160.0, 900.0, dist);
    float mid = 1.0 - smoothstep(600.0, 3000.0, dist);
    float h = pNoise(vec3(p * 0.011 + vec2(0.012, 0.008) * t, t * 0.03)) * 4.0;        // the swell
    h += pNoise(vec3(p * 0.043 + vec2(-0.02, 0.035) * t, t * 0.07 + 1.7)) * 1.4 * mid;  // a cross sea
    h += (pNoise(vec3(p * 0.17 + vec2(0.07, -0.05) * t, t * 0.2 + 3.1)) * 0.4
        + pNoise(vec3(p * 0.6 - vec2(0.15, 0.22) * t, t * 0.5 + 5.3)) * 0.1) * far;   // chop
    return h;
  }
  vec4 seaColor(float d, vec2 p, float t, float wake) {
    vec3 shallow = vec3(0.02, 0.46, 0.42);
    vec3 mid = vec3(0.014, 0.16, 0.19);
    vec3 deep = vec3(${f(deep.r)}, ${f(deep.g)}, ${f(deep.b)});
    vec3 c = mix(shallow, mid, smoothstep(0.0, 7.0, d));
    c = mix(c, deep, smoothstep(6.0, 28.0, d));
    float a = mix(0.45, 1.0, smoothstep(0.0, 11.0, d));
    // surf: a broken, moving band of foam where it shoals to nothing (the reef, the beaches)
    float band = 1.0 - smoothstep(0.15, 1.5, d);
    float n = pNoise(vec3(p * 0.12, t * 0.35)) * 0.6 + pNoise(vec3(p * 0.5, t * 0.8 + 3.0)) * 0.4;
    float foam = band * smoothstep(0.42, 0.72, n + band * 0.25);
    // a few whitecaps out on the open sea
    float cap = smoothstep(0.86, 0.92, pNoise(vec3(p * 0.03 + vec2(0.012, 0.008) * t, t * 0.05))) * smoothstep(0.68, 0.82, pNoise(vec3(p * 0.9, t * 0.9)));
    foam = max(foam, cap * 0.28 * smoothstep(10.0, 20.0, d));
    // wakes (world/SeaFoam.js): churned, paler water, white foam through it, broken up
    float wn = pNoise(vec3(p * 0.3, t * 0.7 + 7.0)) * 0.65 + pNoise(vec3(p * 1.1, t * 1.3 + 2.0)) * 0.35;
    c = mix(c, c * 1.4 + vec3(0.02, 0.07, 0.07), smoothstep(0.03, 0.35, wake) * 0.7);
    foam = max(foam, smoothstep(0.3, 0.8, wake * (0.55 + 0.9 * wn)));
    c = mix(c, vec3(0.72, 0.78, 0.78), foam);
    return vec4(c, max(a, foam));
  }`;
}

/** @param {{ level?: number, size: number, color?: number }} o  color: the deep water */
export function createSea({ level = 0, size, color = 0x1f4a5e }) {
  return {
    sea: true,
    level,
    water: { level, deep: 0.95 },
    crossings: [],
    channels: [],
    halfWidth: 0,
    channelAt: () => 0,
    path: () => Infinity,          // (no river line anywhere)
    side: () => 1,
    dry: (p) => p,
    bridgeAt: () => null,
    blow() {},
    lay() { return null; },

    /** The sheet over the map (its depth from `terrain`), and the open ocean round it out past the far plane. */
    build(scene, terrain = null) {
      const deep = new THREE.Color(color);
      // the foam grid (world/SeaFoam.js writes it), over the map
      const N = 1024;
      const data = new Uint8Array(N * N);
      const texture = new THREE.DataTexture(data, N, N, THREE.RedFormat);
      texture.magFilter = texture.minFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      this.foam = { texture, data, n: N, box: new THREE.Vector4(-size / 2, -size / 2, 1 / size, 1 / size) };
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0, transparent: true });
      const glsl = waterGlsl(deep);
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uSeaTime = SEA_TIME;
        sh.uniforms.uFoam = { value: this.foam.texture };
        sh.uniforms.uFoamBox = { value: this.foam.box };
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nattribute float aDepth;\nvarying float vDepth;\nvarying vec3 vSeaW;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDepth = aDepth;\nvSeaW = (modelMatrix * vec4(position, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', `#include <common>\nuniform float uSeaTime;\nuniform sampler2D uFoam;\nuniform vec4 uFoamBox;\nvarying float vDepth;\nvarying vec3 vSeaW;\n${NOISE}\n${glsl}`)
          .replace('#include <color_fragment>', '#include <color_fragment>\nvec2 fuv = (vSeaW.xz - uFoamBox.xy) * uFoamBox.zw;\nfloat wake = (fuv.x < 0.0 || fuv.y < 0.0 || fuv.x > 1.0 || fuv.y > 1.0) ? 0.0 : texture2D(uFoam, fuv).r;\nvec4 sea = seaColor(vDepth, vSeaW.xz, uSeaTime, wake);\ndiffuseColor.rgb = sea.rgb;\ndiffuseColor.a *= sea.a;')
          .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = pBumpNormal(-vViewPosition, normal, seaHeight(vSeaW.xz, uSeaTime, length(vViewPosition)));');
      };
      mat.customProgramCacheKey = () => `sea:${color}`;
      mat.userData.water = { glsl, foam: this.foam };   // (render/babylon/BabylonView.js → WaterPlugin)
      const depthOf = (x, z) => (terrain ? Math.max(0, level - terrain.heightAt(x, z)) : 60);
      // the map: a grid fine enough for the reef and the beaches (~25 m)
      const n = 240;
      const inner = new THREE.PlaneGeometry(size, size, n, n);
      inner.rotateX(-Math.PI / 2);
      const p = inner.attributes.position;
      inner.setAttribute('aDepth', new THREE.BufferAttribute(Float32Array.from({ length: p.count }, (_, i) => depthOf(p.getX(i), p.getZ(i))), 1));
      // the ocean round it: a frame out to 30 km, all deep
      const R = 30000;
      const h = size / 2;
      const ring = new THREE.Shape([new THREE.Vector2(-R, -R), new THREE.Vector2(R, -R), new THREE.Vector2(R, R), new THREE.Vector2(-R, R)]);
      ring.holes.push(new THREE.Path([new THREE.Vector2(-h, -h), new THREE.Vector2(-h, h), new THREE.Vector2(h, h), new THREE.Vector2(h, -h)]));
      const outer = new THREE.ShapeGeometry(ring);
      outer.rotateX(-Math.PI / 2);
      outer.setAttribute('aDepth', new THREE.BufferAttribute(new Float32Array(outer.attributes.position.count).fill(60), 1));
      for (const g of [inner, outer]) {
        const water = new THREE.Mesh(g, mat);
        water.position.y = level;
        water.receiveShadow = true;
        water.userData.noAO = true;
        water.renderOrder = 1;   // (after the sea floor and the hulls under it)
        scene.add(water);
        this.waterMesh ??= water;
      }
    },
  };
}
