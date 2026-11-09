// Babylon material plugins for the game's own shading, ported from the Three shader injections:
//   FowPlugin    render/FogOfWar.js — what your side can't see right now is drawn darker and
//                greyer. Samples the fog-of-war grid at the pixel's world position. It runs after
//                Babylon's fog and takes the fog's share out first, so the result is the same as
//                darkening before the fog (the darkening is linear in the colour)
//   PaintPlugin  render/paint.js — four-colour camouflage on parts marked `paint.x`, mud where
//                `paint.y` is high, faint wear everywhere; in model space (plus the instance's
//                position) so the pattern sticks to the unit; the instance colour (tint, hit
//                flash) still applies
//   WindPlugin   world/Vegetation.js — grass tufts and hedgerow leaf cards sway in the wind, by
//                each instance's position (`wind.kind`: 'grass' bends from the root, 'leaf' lifts)
//   WaterPlugin  world/Sea.js — the sea's colour, clearness and surf from its depth (aDepth), waves
//                as drifting noise turned into normals
//   TerrainPlugin world/Terrain.js — large-scale variation from the ground texture sampled at
//                ~30× its scale (so the ground never looks tiled) and the furrows / crop rows of
//                the fields from the `aFurrow` attribute (strength, angle, spacing)
import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase.js';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage.js';
import { NOISE, CLIMATE } from '../paint.js';
import { SEA_TIME, SEA_STATE } from '../../world/Sea.js';

class GlslPlugin extends MaterialPluginBase {
  isCompatible(lang) {
    return lang === ShaderLanguage.GLSL;
  }
}

export class FowPlugin extends GlslPlugin {
  /** @param {object} fow  { texture (Babylon), uniforms: { fowBox, fowAmount } (Three FogOfWar) } */
  constructor(material, fow) {
    super(material, 'Fow', 200, { FOW: false });
    this.fow = fow;
    this._enable(true);
  }

  getClassName() { return 'FowPlugin'; }

  prepareDefines(defines) { defines.FOW = true; }

  getSamplers(samplers) { samplers.push('fowMap'); }

  getUniforms() {
    return {
      ubo: [{ name: 'fowBox', size: 4, type: 'vec4' }, { name: 'fowAmount', size: 1, type: 'float' }],
      fragment: '#ifdef FOW\nuniform vec4 fowBox;\nuniform float fowAmount;\n#endif\n',
    };
  }

  bindForSubMesh(ubo) {
    const b = this.fow.uniforms.fowBox.value;
    ubo.updateFloat4('fowBox', b.x, b.y, b.z, b.w);
    ubo.updateFloat('fowAmount', this.fow.uniforms.fowAmount.value);
    ubo.setTexture('fowMap', this.fow.babylonTexture);
  }

  getCustomCode(shaderType) {
    if (shaderType !== 'fragment') return null;
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: '#ifdef FOW\nuniform sampler2D fowMap;\n#endif\n',
      CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: /* glsl */ `
        #ifdef FOW
        {
          vec2 fuv = (vPositionW.xz - fowBox.xy) * fowBox.zw;
          float fv = (fuv.x < 0.0 || fuv.y < 0.0 || fuv.x > 1.0 || fuv.y > 1.0) ? 0.0 : texture2D(fowMap, fuv).r;
          float k = mix(1.0, fv, fowAmount);
          vec3 c = finalColor.rgb;
          #ifdef FOG
            vec3 fogPart = vFogColor * (1.0 - fog);
            c -= fogPart;
          #endif
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = mix(vec3(l) * vec3(0.88, 0.94, 1.08), c, 0.12 + 0.88 * k) * (0.3 + 0.7 * k); // unseen: grey, a little cold, dark
          #ifdef FOG
            c += fogPart;
          #endif
          finalColor.rgb = c;
        }
        #endif`,
    };
  }
}

export class PaintPlugin extends GlslPlugin {
  /** @param {object} paint  { colors: 4 × Three Color (linear), scale, mud (Three Color), wear } */
  constructor(material, paint) {
    super(material, 'Paint', 190, { PAINT: false, PAINT_SURF: false, PAINT_WEATHER: false, PAINT_AIR: false });
    this.paint = paint;
    this._enable(true);
  }

  getClassName() { return 'PaintPlugin'; }

  prepareDefines(defines, scene, mesh) {
    defines.PAINT = !!mesh?.isVerticesDataPresent?.('paint');
    defines.PAINT_SURF = defines.PAINT && !!this.paint.surfaces;
    defines.PAINT_WEATHER = defines.PAINT && !!this.paint.weather;
    defines.PAINT_AIR = defines.PAINT && this.paint.weather === 'air';
  }

  getAttributes(attributes, scene, mesh) {
    if (mesh?.isVerticesDataPresent?.('paint')) attributes.push('paint');
  }

  getUniforms() {
    return {
      ubo: [
        { name: 'uCamo0', size: 3, type: 'vec3' }, { name: 'uCamo1', size: 3, type: 'vec3' },
        { name: 'uCamo2', size: 3, type: 'vec3' }, { name: 'uCamo3', size: 3, type: 'vec3' },
        { name: 'uMud', size: 3, type: 'vec3' }, { name: 'uCamoScale', size: 1, type: 'float' }, { name: 'uWear', size: 1, type: 'float' },
        { name: 'uClimate', size: 1, type: 'float' }, { name: 'uSmock', size: 1, type: 'float' },
        { name: 'uClimateCover', size: 1, type: 'float' }, { name: 'uClimateSmock', size: 1, type: 'float' }, { name: 'uClimateColor', size: 3, type: 'vec3' },
      ],
      fragment: '#ifdef PAINT\nuniform vec3 uCamo0, uCamo1, uCamo2, uCamo3, uMud;\nuniform float uCamoScale, uWear, uClimate, uSmock, uClimateCover, uClimateSmock;\nuniform vec3 uClimateColor;\n#endif\n',
    };
  }

  bindForSubMesh(ubo) {
    const p = this.paint;
    p.colors.forEach((c, i) => ubo.updateFloat3(`uCamo${i}`, c.r, c.g, c.b));
    ubo.updateFloat3('uMud', p.mud.r, p.mud.g, p.mud.b);
    ubo.updateFloat('uCamoScale', p.scale);
    ubo.updateFloat('uWear', p.wear);
    ubo.updateFloat('uClimate', CLIMATE.amount.value);
    ubo.updateFloat('uClimateCover', CLIMATE.cover.value);
    ubo.updateFloat('uClimateSmock', CLIMATE.smock.value);
    const cc = CLIMATE.color.value;
    ubo.updateFloat3('uClimateColor', cc.r, cc.g, cc.b);
    ubo.updateFloat('uSmock', p.smock ? 1 : 0);
  }

  getCustomCode(shaderType) {
    if (shaderType === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS: '#ifdef PAINT\nattribute vec2 paint;\nvarying vec2 vPaint;\nvarying vec3 vPaintPos;\nvarying vec3 vTint;\n#endif\n',
        CUSTOM_VERTEX_MAIN_END: /* glsl */ `
          #ifdef PAINT
            vPaint = paint;
            vPaintPos = position;
            vTint = vec3(1.0);
            #ifdef INSTANCES
              vPaintPos += world3.xyz * 0.37;
            #endif
            #if defined(INSTANCES) && defined(INSTANCESCOLOR)   // a mesh with no instances yet compiles without the colour
              vTint = instanceColor.rgb;
            #endif
          #endif`,
      };
    }
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `#ifdef PAINT\nvarying vec2 vPaint;\nvarying vec3 vPaintPos;\nvarying vec3 vTint;\n${NOISE}\n#endif\n`,
      CUSTOM_FRAGMENT_UPDATE_ALPHA: /* glsl */ `
        #ifdef PAINT
        {
          vec3 pp = vPaintPos * uCamoScale;
          float n1 = pFbm(pp);
          float n2 = pFbm(pp * 1.4 + vec3(7.1, 3.3, 1.7));
          float camoMask = pCamo(vPaint.x);
          if (camoMask > 0.01) {
            vec3 camo = uCamo0;
            camo = mix(camo, uCamo1, smoothstep(0.52, 0.56, n1));
            camo = mix(camo, uCamo3, smoothstep(0.34, 0.30, n1));
            camo = mix(camo, uCamo2, smoothstep(0.6, 0.64, n2));
            surfaceAlbedo = mix(surfaceAlbedo, camo * vTint, camoMask);
          }
          float g = clamp(vPaint.y * (0.55 + 0.9 * (n2 - 0.35)), 0.0, 1.0);
          surfaceAlbedo = mix(surfaceAlbedo, uMud * vTint, g * 0.85);
          surfaceAlbedo *= 1.0 - uWear * 0.5 + uWear * pNoise(pp * 3.7);
          #ifdef PAINT_SURF
            surfaceAlbedo = pShip(surfaceAlbedo, pSurf(vPaint.x), vPaintPos);
          #endif
          #ifdef PAINT_WEATHER
            surfaceAlbedo = pWeather(surfaceAlbedo, pSurf(vPaint.x), vPaintPos);
          #endif
          if (uClimate > 0.0) { // (render/paint.js CLIMATE: whitewash and smocks, sand paint and khaki)
            float sf = pSurf(vPaint.x);
            float paintable = (sf < 0.5 || sf > 3.5) ? 1.0 : 0.0;
            float wash = smoothstep(0.32, 0.58, pFbm(pp * 0.7 + vec3(3.1, 0.0, 5.7)));
            float k = uSmock > 0.5 ? uClimateSmock + 0.1 * wash : uClimateCover + (0.9 - uClimateCover) * wash;
            surfaceAlbedo = mix(surfaceAlbedo, uClimateColor * vTint, uClimate * paintable * k);
          }
          #ifdef PAINT_SURF
            normalW = pBumpNormal(vPositionW, normalW, pBump(pSurf(vPaint.x), vPaintPos));
          #endif
        }
        #endif`,
      CUSTOM_FRAGMENT_UPDATE_METALLICROUGHNESS: /* glsl */ `
        #ifdef PAINT
        {
          float mud = clamp(vPaint.y, 0.0, 1.0);
          #ifdef PAINT_SURF
            vec2 surfRM = pSurfRM(pSurf(vPaint.x), pNoise(vPaintPos * uCamoScale * 3.7));
            metallicRoughness = vec2(surfRM.y * (1.0 - mud), surfRM.x);
          #endif
          metallicRoughness.g = mix(metallicRoughness.g, 1.0, mud * 0.6); // mud is matte
        }
        #endif`,
    };
  }
}

const SWAY = {
  // sway = sin(t·f1 + x·kx + z·kz)·a1 + sin(t·f2 + z·kz2)·a2; offset = sway · (ax, az) · shape
  grass: { f1: 1.7, kx: 0.35, kz: 0.22, a1: 0.6, f2: 3.3, kz2: 0.9, a2: 0.25, ax: 0.16, az: 0.08, shape: 'positionUpdated.y * positionUpdated.y' },
  leaf: { f1: 1.3, kx: 0.3, kz: 0.2, a1: 0.5, f2: 2.9, kz2: 0.7, a2: 0.2, ax: 0.05, az: 0.03, shape: 'max(0.0, positionUpdated.y + 0.6)' },
};
const f = (v) => (Number.isInteger(v) ? `${v}.0` : `${v}`);

export class WindPlugin extends GlslPlugin {
  /** @param {object} wind  { kind: 'grass' | 'leaf', time: { value } (the Three uniform) } */
  constructor(material, wind) {
    WindPlugin.pending = wind; // Babylon asks for the shader code inside super(), before `this.wind` exists
    super(material, 'Wind', 180, { WIND: false });
    this.wind = wind;
    this._enable(true);
  }

  getClassName() { return 'WindPlugin'; }

  prepareDefines(defines) { defines.WIND = true; }

  getUniforms() {
    return { ubo: [{ name: 'uWindTime', size: 1, type: 'float' }], vertex: '#ifdef WIND\nuniform float uWindTime;\n#endif\n' };
  }

  bindForSubMesh(ubo) { ubo.updateFloat('uWindTime', this.wind.time.value); }

  getCustomCode(shaderType) {
    if (shaderType !== 'vertex') return null;
    const w = SWAY[(this.wind ?? WindPlugin.pending).kind] ?? SWAY.grass;
    return {
      CUSTOM_VERTEX_UPDATE_POSITION: /* glsl */ `
        #ifdef WIND
        {
          #ifdef INSTANCES
            vec2 wp = world3.xz;
          #else
            vec2 wp = vec2(0.0);
          #endif
          float sway = sin(uWindTime * ${f(w.f1)} + wp.x * ${f(w.kx)} + wp.y * ${f(w.kz)}) * ${f(w.a1)} + sin(uWindTime * ${f(w.f2)} + wp.y * ${f(w.kz2)}) * ${f(w.a2)};
          float shape = ${w.shape};
          positionUpdated.x += sway * ${f(w.ax)} * shape;
          positionUpdated.z += sway * ${f(w.az)} * shape;
        }
        #endif`,
    };
  }
}

export class WaterPlugin extends GlslPlugin {
  /** @param {object} water  { glsl } (world/Sea.js waterGlsl) */
  constructor(material, water) {
    WaterPlugin.pending = water; // (the shader code is asked for inside super())
    super(material, 'Water', 175, { WATER: false });
    this.water = water;
    this._enable(true);
  }

  getClassName() { return 'WaterPlugin'; }

  prepareDefines(defines, scene, mesh) { defines.WATER = !!mesh?.isVerticesDataPresent?.('aDepth'); }

  getAttributes(attributes, scene, mesh) { if (mesh?.isVerticesDataPresent?.('aDepth')) attributes.push('aDepth'); }

  getUniforms() {
    return { ubo: [{ name: 'uSeaTime', size: 1, type: 'float' }, { name: 'uSeaState', size: 1, type: 'float' }, { name: 'foamBox', size: 4, type: 'vec4' }], fragment: '#ifdef WATER\nuniform float uSeaTime;\nuniform float uSeaState;\nuniform vec4 foamBox;\n#endif\n' };
  }

  getSamplers(samplers) { samplers.push('foamMap'); }

  bindForSubMesh(ubo) {
    ubo.updateFloat('uSeaTime', SEA_TIME.value);
    ubo.updateFloat('uSeaState', SEA_STATE.value);
    const b = this.water.foam.box;
    ubo.updateFloat4('foamBox', b.x, b.y, b.z, b.w);
    ubo.setTexture('foamMap', this.water.babylonFoam);
  }

  getCustomCode(shaderType) {
    if (shaderType === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS: '#ifdef WATER\nattribute float aDepth;\nvarying float vDepth;\n#endif\n',
        CUSTOM_VERTEX_MAIN_END: '#ifdef WATER\nvDepth = aDepth;\n#endif\n',
      };
    }
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `#ifdef WATER\nvarying float vDepth;\nuniform sampler2D foamMap;\n${NOISE}\n${(this.water ?? WaterPlugin.pending).glsl}\n#endif\n`,
      CUSTOM_FRAGMENT_UPDATE_ALPHA: /* glsl */ `
        #ifdef WATER
        {
          vec2 fuv = (vPositionW.xz - foamBox.xy) * foamBox.zw;
          float wake = (fuv.x < 0.0 || fuv.y < 0.0 || fuv.x > 1.0 || fuv.y > 1.0) ? 0.0 : texture2D(foamMap, fuv).r;
          vec4 sea = seaColor(vDepth, vPositionW.xz, uSeaTime, wake);
          surfaceAlbedo = sea.rgb;
          alpha *= sea.a;
          normalW = pBumpNormal(vPositionW, normalW, seaHeight(vPositionW.xz, uSeaTime, length(vEyePosition.xyz - vPositionW)));
        }
        #endif`,
    };
  }
}

export class TerrainPlugin extends GlslPlugin {
  constructor(material) {
    super(material, 'Terrain', 170, { TERRAIN: false });
    this._enable(true);
  }

  getClassName() { return 'TerrainPlugin'; }

  prepareDefines(defines, scene, mesh) {
    defines.TERRAIN = !!mesh?.isVerticesDataPresent?.('aFurrow');
  }

  getAttributes(attributes, scene, mesh) {
    if (mesh?.isVerticesDataPresent?.('aFurrow')) attributes.push('aFurrow');
  }

  getCustomCode(shaderType) {
    if (shaderType === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS: '#ifdef TERRAIN\nattribute vec3 aFurrow;\nvarying vec3 vFurrow;\n#endif\n',
        CUSTOM_VERTEX_MAIN_END: '#ifdef TERRAIN\nvFurrow = aFurrow;\n#endif\n',
      };
    }
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: '#ifdef TERRAIN\nvarying vec3 vFurrow;\n#endif\n',
      CUSTOM_FRAGMENT_UPDATE_ALPHA: /* glsl */ `
        #if defined(TERRAIN) && defined(ALBEDO)
        {
          // large-scale variation from the same texture at ~30x the scale: breaks up tiling
          float macro = texture2D(albedoSampler, vAlbedoUV * 0.033).r * 0.6 + texture2D(albedoSampler, vAlbedoUV * 0.0071 + 0.37).r * 0.4;
          surfaceAlbedo *= 0.82 + (macro - 0.8) * 1.3;
          // furrows / crop rows: ridges lit, troughs shaded
          vec2 fdir = vec2(cos(vFurrow.y), sin(vFurrow.y));
          float fu = dot(vPositionW.xz, fdir) / max(0.3, vFurrow.z) * 6.2831853;
          float fk = clamp(vFurrow.x, 0.0, 1.0);
          surfaceAlbedo *= 1.0 + fk * (sin(fu) * 0.16 - 0.04);
        }
        #endif`,
    };
  }
}
