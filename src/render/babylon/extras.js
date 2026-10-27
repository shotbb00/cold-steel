// Babylon counterparts for the Three objects BabylonView can't mirror generically:
//   particles  the effect layers (combat/EffectsSystem.js): an instanced quad per layer whose
//              per-particle buffers (aPos, aColor, aSizeRot) are uploaded as thin-instance
//              attributes, drawn by the same billboard shaders (smoke: blended, fire: additive)
//   sprites    camera-facing glows (flares, distant fires): a billboard plane, additive
//   lines      LineSegments (the rain): a line-list mesh whose positions follow the Three ones
//   points     Points (stars): a point-cloud mesh
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import { Effect } from '@babylonjs/core/Materials/effect.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';

Effect.ShadersStore.csParticleVertexShader = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  attribute vec3 aPos;
  attribute vec4 aColor;
  attribute vec2 aSizeRot;
  uniform mat4 view, projection;
  uniform float fogDensity;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFog;
  void main() {
    vUv = uv;
    vColor = aColor;
    vec4 mv = view * vec4(aPos, 1.0);
    float c = cos(aSizeRot.y), s = sin(aSizeRot.y);
    vec2 q = vec2(position.x * c - position.y * s, position.x * s + position.y * c);
    mv.xy += q * aSizeRot.x;
    float d = -mv.z;
    vFog = 1.0 - exp(-fogDensity * fogDensity * d * d);
    gl_Position = projection * mv;
  }`;

Effect.ShadersStore.csSmokeFragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D map;
  uniform vec3 fogColor;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFog;
  void main() {
    vec4 t = texture2D(map, vUv);
    vec3 col = mix(vColor.rgb * t.rgb, fogColor, vFog);
    float a = t.a * vColor.a;
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
  }`;

Effect.ShadersStore.csFireFragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D map;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFog;
  void main() {
    vec4 t = texture2D(map, vUv);
    gl_FragColor = vec4(vColor.rgb * t.a * vColor.a * (1.0 - vFog), 1.0);
  }`;

function quad(scene, name) {
  const mesh = new Mesh(name, scene);
  const vd = new VertexData();
  vd.positions = [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
  vd.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
  vd.indices = [0, 1, 2, 0, 2, 3];
  vd.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
  vd.applyToMesh(mesh);
  return mesh;
}

/** One effects layer (combat/EffectsSystem.js ParticleLayer) drawn natively. */
export function particleLayer(view, layer) {
  const scene = view.scene;
  const additive = layer.additive;
  const mesh = quad(scene, additive ? 'fire' : 'smoke');
  const max = layer.max;
  // thin instances need their matrices; the shader places each quad from aPos itself
  const identity = new Float32Array(max * 16);
  for (let i = 0; i < max; i++) { identity[i * 16] = identity[i * 16 + 5] = identity[i * 16 + 10] = identity[i * 16 + 15] = 1; }
  mesh.thinInstanceSetBuffer('matrix', identity, 16, true);
  mesh.thinInstanceRegisterAttribute('aPos', 3);
  mesh.thinInstanceRegisterAttribute('aColor', 4);
  mesh.thinInstanceRegisterAttribute('aSizeRot', 2);
  mesh.thinInstanceSetBuffer('aPos', layer.aPos.array, 3, false);
  mesh.thinInstanceSetBuffer('aColor', layer.aColor.array, 4, false);
  mesh.thinInstanceSetBuffer('aSizeRot', layer.aSizeRot.array, 2, false);
  mesh.thinInstanceCount = 0;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.isPickable = false;
  mesh.alphaIndex = additive ? 3 : 2;
  const mat = new ShaderMaterial(mesh.name, scene, { vertex: 'csParticle', fragment: additive ? 'csFire' : 'csSmoke' }, {
    attributes: ['position', 'uv', 'aPos', 'aColor', 'aSizeRot'],
    uniforms: ['view', 'projection', 'fogDensity', 'fogColor'],
    samplers: ['map'],
    needAlphaBlending: true,
  });
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  mat.alphaMode = additive ? Engine.ALPHA_ONEONE : Engine.ALPHA_COMBINE;
  const tex = view.texture(layer.material.uniforms.map.value);
  if (tex) mat.setTexture('map', tex);
  mesh.material = mat;
  return {
    mesh,
    update() {
      const n = layer.geo.instanceCount;
      mesh.thinInstanceCount = n;
      if (n) {
        mesh.thinInstanceBufferUpdated('aPos');
        mesh.thinInstanceBufferUpdated('aColor');
        mesh.thinInstanceBufferUpdated('aSizeRot');
      }
      mat.setFloat('fogDensity', scene.fogMode === 2 ? scene.fogDensity : 0); // Scene.FOGMODE_EXP2
      mat.setColor3('fogColor', scene.fogColor.toLinearSpace()); // scene.fogColor is gamma space
    },
  };
}

/** A camera-facing glow (THREE.Sprite): an additive billboard plane. */
export function sprite(view, o) {
  const scene = view.scene;
  const mesh = quad(scene, `sprite${o.id}`);
  mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
  mesh.rotationQuaternion = null;
  mesh.isPickable = false;
  mesh.alphaIndex = 4;
  const tm = o.material;
  let mat = view.spriteMaterials.get(tm);
  if (!mat) {
    mat = new StandardMaterial(`spriteMat${tm.id}`, scene);
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    mat.disableDepthWrite = true;
    if (tm.map) {
      mat.emissiveTexture = view.texture(tm.map);
      mat.opacityTexture = mat.emissiveTexture;
    }
    mat.alphaMode = tm.blending === 2 ? Engine.ALPHA_ADD : Engine.ALPHA_COMBINE;
    view.spriteMaterials.set(tm, mat);
  }
  mesh.material = mat;
  mesh.applyFog = tm.fog !== false;
  return {
    mesh,
    update() {
      const w = o.matrixWorld.elements;
      mesh.position.set(w[12], w[13], w[14]);
      mesh.scaling.set(o.scale.x, o.scale.y, 1);
      mat.emissiveColor.set(tm.color.r, tm.color.g, tm.color.b);
      mat.alpha = tm.opacity ?? 1;
    },
  };
}

/** LineSegments (the rain): a line list whose positions follow the Three geometry. */
export function lines(view, o) {
  const scene = view.scene;
  const mesh = new Mesh(`lines${o.id}`, scene);
  const pos = o.geometry.attributes.position;
  const idx = new Uint32Array(pos.count);
  for (let i = 0; i < pos.count; i++) idx[i] = i;
  const vd = new VertexData();
  vd.positions = pos.array;
  vd.indices = idx;
  vd.applyToMesh(mesh, true);
  const tm = o.material;
  const mat = new StandardMaterial(`linesMat${o.id}`, scene);
  mat.disableLighting = true;
  mat.emissiveColor = new Color3(tm.color.r, tm.color.g, tm.color.b);
  mat.alpha = tm.opacity ?? 1;
  mat.fillMode = Material.LineListDrawMode;
  mat.disableDepthWrite = tm.depthWrite === false;
  mesh.material = mat;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.isPickable = false;
  let version = pos.version;
  return {
    mesh,
    update() {
      if (pos.version !== version) {
        mesh.updateVerticesData(VertexBuffer.PositionKind, pos.array, false, false);
        version = pos.version;
      }
      mat.alpha = tm.opacity ?? 1;
    },
  };
}

/** Points (the stars): a point cloud. */
export function points(view, o) {
  const scene = view.scene;
  const mesh = new Mesh(`points${o.id}`, scene);
  const pos = o.geometry.attributes.position;
  const vd = new VertexData();
  vd.positions = pos.array;
  vd.indices = Uint32Array.from({ length: pos.count }, (_, i) => i); // Babylon draws nothing without them
  vd.applyToMesh(mesh);
  const tm = o.material;
  const mat = new StandardMaterial(`pointsMat${o.id}`, scene);
  mat.disableLighting = true;
  mat.emissiveColor = new Color3(tm.color.r, tm.color.g, tm.color.b);
  mat.alpha = Math.min(1, (tm.opacity ?? 1) * 1.8); // the Three stars skipped tone mapping: brighter to match
  mat.pointsCloud = true;
  mat.pointSize = (tm.size ?? 1) * 1.3;
  mat.disableDepthWrite = true;
  mesh.material = mat;
  mesh.applyFog = tm.fog !== false;
  mesh.infiniteDistance = true;
  mesh.isPickable = false;
  return { mesh, update() {} };
}

