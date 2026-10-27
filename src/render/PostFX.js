// Post-processing chain:
//   render → ambient occlusion (GTAO: contact shadows under units and props, in trenches and
//   crevices) → bloom (only flashes and tracers are bright enough) → tone mapping / sRGB →
//   colour grade (slightly muted, cool shadows / warm highlights, gentle contrast, vignette,
//   faint film grain).
// Toggles: B bloom, O ambient occlusion.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

/**
 * GTAO at reduced resolution (`scale`, set by render/Quality.js) — AO is soft anyway — that
 * ignores smoke, sky, tracers, decals and foliage cards (transparent, custom-shader or `userData.noAO`). */
class FieldAOPass extends GTAOPass {
  setSize(width, height) {
    this.fullSize = [width, height];
    const k = this.scale ?? 0.5;
    super.setSize(Math.max(1, Math.round(width * k)), Math.max(1, Math.round(height * k)));
  }

  setScale(k) {
    this.scale = k;
    if (this.fullSize) this.setSize(...this.fullSize);
  }

  overrideVisibility() {
    const cache = this._visibilityCache;
    this.scene.traverse((o) => {
      cache.set(o, o.visible);
      const m = o.material;
      if (o.isPoints || o.isLine || o.userData.noAO || (m && (m.transparent || m.isShaderMaterial))) o.visible = false;
    });
  }
}

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    saturation: { value: 0.86 },
    contrast: { value: 1.06 },
    shadows: { value: new THREE.Vector3(-0.012, 0.0, 0.018) },   // cool the darks
    highlights: { value: new THREE.Vector3(0.018, 0.008, -0.012) }, // warm the lights
    vignette: { value: 0.32 },
    grain: { value: 0.018 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time, saturation, contrast, vignette, grain;
    uniform vec3 shadows, highlights;
    varying vec2 vUv;
    float rand(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, saturation);
      col = (col - 0.5) * contrast + 0.5;
      col += shadows * (1.0 - smoothstep(0.0, 0.5, l)) + highlights * smoothstep(0.5, 1.0, l);
      float d = distance(vUv, vec2(0.5));
      col *= 1.0 - vignette * smoothstep(0.3, 0.85, d);
      col += (rand(vUv * 1000.0 + time) - 0.5) * grain;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
    }`,
};

export function createPostFX(renderer, scene, camera) {
  const w = innerWidth;
  const h = innerHeight;
  const target = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));

  const ao = new FieldAOPass(scene, camera, Math.round(w / 2), Math.round(h / 2));
  ao.scale = 0.5;
  ao.updateGtaoMaterial({ radius: 1.4, distanceExponent: 1.5, thickness: 1.5, scale: 1.1, samples: 12, distanceFallOff: 1 });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
  ao.blendIntensity = 0.85;
  composer.addPass(ao);

  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.28, 0.35, 0.95); // only flashes and tracers bloom
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  return {
    composer,
    bloom,
    ao,
    grade,
    render(t) {
      grade.uniforms.time.value = t % 100;
      composer.render();
    },
    setSize(width, height) {
      composer.setSize(width, height);
    },
    setPixelRatio(pr) {
      composer.setPixelRatio(pr);
    },
    /** MSAA samples on the scene render target (0 = off). */
    setSamples(n) {
      for (const t of [composer.renderTarget1, composer.renderTarget2]) {
        if (t.samples === n) continue;
        t.samples = n;
        t.dispose();
      }
    },
  };
}
