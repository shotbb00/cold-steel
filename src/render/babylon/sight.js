// Vehicle and night sights in direct control (systems/PlayerControl.js, key N): a post-process
// over the finished frame.
//   thermal   white-hot: the world a cool grey, living things and engines glowing, sensor noise,
//             a faint scan line — the Abrams' and Bradleys' thermal sights
//   ir        green and grainy: active infrared on Pact vehicles, image intensifiers on scouts and
//             observers — brightens the dark, but nothing glows
// Heat comes from the units' own materials: while thermal is on, BabylonView.syncMaterial gives
// the paint materials of soldiers, vehicles and aircraft a glow; terrain and buildings stay cool.
import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess.js';
import { Effect } from '@babylonjs/core/Materials/effect.js';

Effect.ShadersStore.coldSteelSightFragmentShader = /* glsl */ `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform float mode;      // 1 thermal, 2 ir
uniform float time;
uniform vec2 res;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 c = texture2D(textureSampler, vUV).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float n = hash(floor(vUV * res * 0.5) + floor(time * 30.0)) - 0.5;
  vec2 d = vUV - 0.5;
  float vig = 1.0 - smoothstep(0.35, 0.75, length(d * vec2(res.x / res.y, 1.0)) * 0.9);
  vec3 o;
  if (mode < 1.5) {
    // white-hot: lift the cool world into a narrow grey band, let the hot things clip white
    float t = 0.16 + pow(clamp(l, 0.0, 1.0), 0.8) * 0.5 + smoothstep(0.82, 1.0, l) * 0.4;
    t += n * 0.05 + sin(vUV.y * res.y * 1.4 + time * 4.0) * 0.008;
    o = vec3(t);
  } else {
    // amplified light: much brighter, green, grainy, a soft bloom of the brightest
    float t = clamp(pow(l * 3.2, 0.75) + n * 0.12, 0.0, 1.2);
    o = vec3(0.22, 1.0, 0.36) * t * 0.85;
  }
  gl_FragColor = vec4(o * vig, 1.0);
}`;

export function createSight(view) {
  let pp = null;
  let mode = null;
  return {
    get mode() { return mode; },
    /** 'thermal', 'ir' or null (off). */
    set(next) {
      if (next === mode) return;
      mode = next;
      view.heat = mode === 'thermal'; // BabylonView.syncMaterial lights the units
      if (!mode) { pp?.dispose(view.camera); pp = null; return; }
      if (!pp) {
        pp = new PostProcess('sight', 'coldSteelSight', ['mode', 'time', 'res'], null, 1, view.camera);
        pp.onApply = (fx) => {
          fx.setFloat('mode', mode === 'thermal' ? 1 : 2);
          fx.setFloat('time', performance.now() / 1000);
          fx.setFloat2('res', pp.width, pp.height);
        };
      }
    },
  };
}
