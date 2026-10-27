// Procedural paint for unit materials, applied per pixel in the standard shader:
//   camo     – a four-colour woodland pattern (M81 BDU cloth, MERDC on vehicles) on parts whose
//              camo mask is 1 (data/units/geometry.js: part option `camo`)
//   grime    – mud and dust where `paint.y` is high (baked from height: boots, lower hulls,
//              running gear — geometry.js `grime()`), broken up by noise
//   wear     – a faint mottling everywhere so flat-coloured parts don't look like plastic
//   surfaces – (option `surfaces`, vehicles and aircraft) each part's material from its surface
//              class (geometry.js `surf`): painted armour, bare steel, rubber, glass, canvas get
//              their own roughness and metalness, and a fine bump in model space — the mottle
//              of cast and rolled armour, the weave of canvas
// paint.x carries camo mask + 2 × surface index. The pattern is in model space (plus each
// instance's position for instanced infantry), so it sticks to the unit as it moves. The
// instance colour (personal tint, hit flash, death darkening) still applies on top.
// The Babylon renderer runs the same GLSL (render/babylon/plugins.js PaintPlugin).
import * as THREE from 'three';

export const WOODLAND = [0x56603b, 0x5b4630, 0x22231d, 0x8a7d57]; // green, brown, black, sand
export const MERDC = [0x4c5a36, 0x5d4a33, 0x262624, 0x857a58];

export const NOISE = /* glsl */ `
  float pHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float pNoise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(pHash(i), pHash(i + vec3(1, 0, 0)), f.x), mix(pHash(i + vec3(0, 1, 0)), pHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(pHash(i + vec3(0, 0, 1)), pHash(i + vec3(1, 0, 1)), f.x), mix(pHash(i + vec3(0, 1, 1)), pHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float pFbm(vec3 p) { return pNoise(p) * 0.6 + pNoise(p * 2.1 + 5.3) * 0.3 + pNoise(p * 4.3 + 9.1) * 0.1; }
  // paint.x = camo mask + 2 × surface (0 paint, 1 metal, 2 rubber, 3 glass, 4 cloth)
  float pSurf(float px) { return floor(px * 0.5 + 0.01); }
  float pCamo(float px) { return px - 2.0 * pSurf(px); }
  // roughness, metalness of a surface; n (0…1) varies the roughness a little
  vec2 pSurfRM(float s, float n) {
    vec2 rm = s < 0.5 ? vec2(0.62, 0.14) : s < 1.5 ? vec2(0.4, 0.62) : s < 2.5 ? vec2(0.9, 0.0) : s < 3.5 ? vec2(0.06, 0.0) : vec2(0.96, 0.0);
    rm.x = clamp(rm.x + (n - 0.5) * 0.18, 0.04, 1.0);
    return rm;
  }
  // fine relief in metres, in model space
  float pBump(float s, vec3 p) {
    if (s < 0.5) return pFbm(p * 6.0) * 0.003 + pNoise(p * 29.0) * 0.0005;   // cast and rolled armour
    if (s < 1.5) return pNoise(p * 37.0) * 0.0004;
    if (s > 3.5) return pNoise(p * vec3(70.0, 70.0, 9.0)) * 0.0007;          // canvas
    return 0.0;
  }
  // bump by screen derivatives: pos and n in the same space
  vec3 pBumpNormal(vec3 pos, vec3 n, float h) {
    vec3 dpdx = dFdx(pos), dpdy = dFdy(pos);
    vec3 r1 = cross(dpdy, n), r2 = cross(n, dpdx);
    float det = dot(dpdx, r1);
    vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
    return normalize(abs(det) * n - g);
  }`;

/**
 * @param {THREE.MeshStandardMaterial} mat  a vertexColors material used with geometry.js parts
 * @param {object} o  { colors: 4 hex (camo), scale: pattern frequency per metre, mud: hex, wear,
 *                      surfaces: per-part roughness / metalness / relief from `surf` }
 */
export function paintMaterial(mat, { colors = WOODLAND, scale = 6, mud = 0x4a3d2c, wear = 0.14, surfaces = false } = {}) {
  const uniforms = {
    uCamo: { value: colors.map((c) => new THREE.Color(c)) },
    uCamoScale: { value: scale },
    uMud: { value: new THREE.Color(mud) },
    uWear: { value: wear },
  };
  if (surfaces) mat.defines = { ...mat.defines, PAINT_SURF: '' };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec2 paint;
        varying vec2 vPaint;
        varying vec3 vPaintPos;
        varying vec3 vTint;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vPaint = paint;
        vPaintPos = position;
        vTint = vec3(1.0);
        #ifdef USE_INSTANCING
          vPaintPos += instanceMatrix[3].xyz * 0.37;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vTint = instanceColor;
        #endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uCamo[4];
        uniform float uCamoScale, uWear;
        uniform vec3 uMud;
        varying vec2 vPaint;
        varying vec3 vPaintPos;
        varying vec3 vTint;
        ${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 pp = vPaintPos * uCamoScale;
        float n1 = pFbm(pp);
        float n2 = pFbm(pp * 1.4 + vec3(7.1, 3.3, 1.7));
        float camoMask = pCamo(vPaint.x);
        if (camoMask > 0.01) {
          vec3 camo = uCamo[0];
          camo = mix(camo, uCamo[1], smoothstep(0.52, 0.56, n1));
          camo = mix(camo, uCamo[3], smoothstep(0.34, 0.30, n1));
          camo = mix(camo, uCamo[2], smoothstep(0.6, 0.64, n2));
          diffuseColor.rgb = mix(diffuseColor.rgb, camo * vTint, camoMask);
        }
        float g = clamp(vPaint.y * (0.55 + 0.9 * (n2 - 0.35)), 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, uMud * vTint, g * 0.85);
        diffuseColor.rgb *= 1.0 - uWear * 0.5 + uWear * pNoise(pp * 3.7);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        #ifdef PAINT_SURF
          vec2 surfRM = pSurfRM(pSurf(vPaint.x), pNoise(pp * 3.7));
          roughnessFactor = surfRM.x;
        #endif
        roughnessFactor = mix(roughnessFactor, 1.0, clamp(vPaint.y, 0.0, 1.0) * 0.6); // mud is matte`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        #ifdef PAINT_SURF
          metalnessFactor = surfRM.y * (1.0 - clamp(vPaint.y, 0.0, 1.0));
        #endif`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        #ifdef PAINT_SURF
          normal = pBumpNormal(-vViewPosition, normal, pBump(pSurf(vPaint.x), vPaintPos));
        #endif`);
  };
  mat.customProgramCacheKey = () => `paint:${colors.join(',')}:${scale}:${surfaces}`;
  // the same paint for the Babylon renderer (render/babylon/plugins.js PaintPlugin)
  mat.userData.paint = { colors: uniforms.uCamo.value, scale, mud: uniforms.uMud.value, wear, surfaces };
  return mat;
}
