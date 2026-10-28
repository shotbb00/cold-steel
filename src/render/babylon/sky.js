// The sky dome in Babylon: the same gradient, sun glow and drifting cloud deck as the Three
// version in world/Environment.js (same GLSL), on a sphere that stays centred on the camera.
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import { Effect } from '@babylonjs/core/Materials/effect.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

Effect.ShadersStore.csSkyVertexShader = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  uniform mat4 worldViewProjection;
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }`;

Effect.ShadersStore.csSkyFragmentShader = /* glsl */ `
  precision highp float;
  uniform vec3 top, horizon, bottom, sunColor, aurora, sunDir;
  uniform float time, sunDisk, clouds;
  uniform vec3 cloudLight, cloudDark;
  varying vec3 vDir;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int k = 0; k < 6; k++) { v += a * vnoise(p); p = p * 2.03 + 17.0; a *= 0.5; }
    return v;
  }
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = h > 0.0 ? mix(horizon, top, pow(smoothstep(0.0, 0.75, h), 0.7)) : mix(horizon, bottom, smoothstep(0.0, -0.25, h));
    float s = max(dot(d, sunDir), 0.0);
    float dens = 0.0;
    if (clouds > 0.0 && h > 0.0) {
      vec2 cp = d.xz / (h + 0.1) * 1.3 + vec2(time * 0.006, time * 0.0025);
      float c = fbm(cp);
      dens = smoothstep(0.62 - clouds * 0.45, 0.85 - clouds * 0.3, c) * smoothstep(0.0, 0.18, h);
      float lit = smoothstep(0.35, 0.8, fbm(cp * 1.7 + 4.0)) * 0.7 + pow(s, 6.0) * 0.3;
      col = mix(col, mix(cloudDark, cloudLight, lit), dens);
    }
    col += sunColor * (pow(s, 900.0) * 8.0 * sunDisk + pow(s, 18.0) * 0.35 * sunDisk + pow(s, 3.0) * 0.08) * (1.0 - dens * 0.85);
    float band = smoothstep(0.2, 0.4, h) * smoothstep(0.75, 0.42, h);
    float wave = 0.5 + 0.5 * sin(atan(d.z, d.x) * 5.0 + time * 0.12 + sin(h * 16.0 + time * 0.25));
    col += aurora * band * wave * 0.12;
    // the colours are display values (the Three sky wrote them straight to the screen); Babylon's
    // post-processing converts linear to display, so hand it linear
    gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)), 1.0);
  }`;

const hex = (h) => Color3.FromHexString(`#${(h >>> 0).toString(16).padStart(6, '0')}`).toLinearSpace();

export function createSky(scene, theme) {
  const mat = new ShaderMaterial('sky', scene, { vertex: 'csSky', fragment: 'csSky' }, {
    attributes: ['position'],
    uniforms: ['worldViewProjection', 'top', 'horizon', 'bottom', 'sunColor', 'aurora', 'sunDir', 'time', 'sunDisk', 'clouds', 'cloudLight', 'cloudDark'],
  });
  // the Three sky shader works in the scene's colour values as written: keep them as they are
  const lin = (h) => { const c = hex(h); return c.toGammaSpace(); };
  mat.setColor3('top', lin(theme.skyTop));
  mat.setColor3('horizon', lin(theme.skyHorizon));
  mat.setColor3('bottom', lin(theme.skyBottom));
  mat.setColor3('sunColor', lin(theme.sunColor));
  mat.setColor3('aurora', lin(theme.aurora ?? 0));
  mat.setColor3('cloudLight', lin(theme.cloudLight ?? 0xd8d8d4));
  mat.setColor3('cloudDark', lin(theme.cloudDark ?? 0x8a8e92));
  mat.setFloat('sunDisk', theme.sunDisk ?? 1);
  mat.setFloat('clouds', theme.clouds ?? 0);
  mat.setVector3('sunDir', new Vector3(...theme.sunDir).normalize());
  mat.setFloat('time', 0);
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  const dome = MeshBuilder.CreateSphere('sky', { diameter: 1800, segments: 24, sideOrientation: Mesh.BACKSIDE }, scene);
  dome.material = mat;
  dome.infiniteDistance = true;   // always centred on the camera
  dome.applyFog = false;
  dome.isPickable = false;
  dome.renderingGroupId = 0;
  return {
    mesh: dome,
    update(time) {
      mat.setFloat('time', time);
    },
    /** New colours and cloud cover (the weather changing: systems/WeatherChange.js). */
    set(theme) {
      mat.setColor3('top', lin(theme.skyTop));
      mat.setColor3('horizon', lin(theme.skyHorizon));
      mat.setColor3('bottom', lin(theme.skyBottom));
      mat.setColor3('sunColor', lin(theme.sunColor));
      mat.setColor3('cloudLight', lin(theme.cloudLight ?? 0xd8d8d4));
      mat.setColor3('cloudDark', lin(theme.cloudDark ?? 0x8a8e92));
      mat.setFloat('sunDisk', theme.sunDisk ?? 1);
      mat.setFloat('clouds', theme.clouds ?? 0);
    },
  };
}
