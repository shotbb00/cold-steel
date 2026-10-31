// Babylon.js draws the game. The simulation and the model builders still describe the world as
// a Three.js scene graph (meshes, instanced meshes, lights, the camera) — this view mirrors that
// graph into a Babylon scene every frame and renders it with Babylon:
//   geometry   BufferGeometry → Babylon vertex data (once per geometry; re-uploaded when an
//              attribute's version changes, e.g. the terrain after a shell crater)
//   materials  MeshStandardMaterial → PBRMaterial, MeshBasicMaterial → unlit PBR; colour,
//              opacity and emissive follow the Three material every frame
//   instancing InstancedMesh → thin instances (matrices and per-instance colours)
//   lights     hemisphere, directional (the sun casts shadows: one map over the Three sun's
//              shadow box, which follows where the camera looks — as in world/Environment.js), point
//   camera     the Three camera's world matrix and field of view
//   atmosphere exponential fog, the sky dome's shader (render/babylon/sky.js), ACES tone
//              mapping with the map's exposure; the sky also lights the scene (a reflection
//              probe of the dome as the environment: sky-coloured ambient and reflections)
//   post       ambient occlusion (SSAO2), bloom, MSAA or FXAA — set by the quality presets
//              (render/Quality.js → applyQuality)
// The scene uses Babylon's right-handed mode, so Three's coordinates and column-major matrices
// carry over unchanged. Objects the bridge can't draw yet (Three ShaderMaterials other than
// the sky, points, lines, sprites) are skipped and listed once in the console.
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline.js';
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline.js';
import { ReflectionProbe } from '@babylonjs/core/Probes/reflectionProbe.js';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture.js';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3, Matrix, Quaternion } from '@babylonjs/core/Maths/math.vector.js';
// side-effect registrations: thin instances, shadows, the rendering pipeline manager
import '@babylonjs/core/Meshes/thinInstanceMesh.js';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js';
import '@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent.js';
import '@babylonjs/core/Rendering/depthRendererSceneComponent.js';
import '@babylonjs/core/Rendering/prePassRendererSceneComponent.js';
import '@babylonjs/core/Rendering/geometryBufferRendererSceneComponent.js';
import { createSky } from './sky.js';
import { createSight } from './sight.js';
import { particleLayer, sprite, lines, points } from './extras.js';
import { FowPlugin, PaintPlugin, WindPlugin, TerrainPlugin } from './plugins.js';

/** Vertex attributes the bridge maps to Babylon's own; anything else goes over under its own name. */
const STANDARD = new Set(['position', 'normal', 'uv', 'color']);

// Light units. Three's physical lights divide every light by π in the diffuse term; Babylon's
// PBR divides the punctual ones (sun, point lights) but not the hemisphere light. Measured on the
// same frame against the Three renderer (shadow contrast, brightness): punctual lights ×π, the
// hemisphere ÷π give the same balance of sun and shade; the sky environment adds a little soft
// fill on top, and the exposure comes down to keep the overall brightness.
const PUNCTUAL = Math.PI;
const HEMI = 1 / Math.PI;
const ENV = 0.2;
const EXPOSURE = 0.72;
const POINT_REF = 50; // m: where a gentler-than-square point light is matched (systems/Flares.js)

const _m = Matrix.Identity();
const _pos = new Vector3();
const _rot = new Quaternion();
const _scl = new Vector3();
const c3 = (c, out = new Color3()) => out.set(c.r, c.g, c.b);

export class BabylonView {
  /**
   * @param {HTMLElement} container  where the canvas goes
   * @param {object} three  { scene, camera } — the Three.js scene graph to mirror
   * @param {object} opts  { exposure, theme }
   */
  constructor(container, three, { exposure = 1.1, theme = null } = {}) {
    this.three = three;
    const canvas = (this.canvas = document.createElement('canvas'));
    canvas.className = 'babylon-canvas';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;touch-action:none';
    container.appendChild(canvas);
    this.engine = new Engine(canvas, false, { preserveDrawingBuffer: false, stencil: true, powerPreference: 'high-performance' }, true);
    const scene = (this.scene = new Scene(this.engine));
    scene.useRightHandedSystem = true;   // Three's coordinates and matrices, unchanged
    scene.skipPointerMovePicking = true; // the game does its own picking (terrain ray, stacks)
    scene.detachControl();               // …and its own input: Babylon's pointer handling would preventDefault the mousedowns
    scene.autoClear = true;
    const ip = scene.imageProcessingConfiguration;
    ip.toneMappingEnabled = true;
    ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    ip.exposure = exposure * EXPOSURE;

    this.camera = new FreeCamera('camera', new Vector3(0, 10, 0), scene);
    this.camera.rotationQuaternion = new Quaternion();
    this.camera.inputs.clear();          // CameraManager drives the Three camera; we copy it

    this.meshes = new Map();     // Three object → { mesh, versions }
    this.geometries = new WeakMap();
    this.materials = new WeakMap();
    this.materialList = [];      // [Three material, Babylon material] — for the sights (sight.js)
    this.textures = new WeakMap();
    this.lights = new Map();
    this.extras = new Map();     // Three object → a native counterpart (particles, sprites, lines, points)
    this.spriteMaterials = new WeakMap();
    this.unsupported = new Set();
    this.frame = 0;
    this.shadowGen = null;
    this.shadowSize = 2048;
    if (theme) {
      this.sky = createSky(scene, theme);
      // the sky lights the world: render the dome once into a cube and use it as the environment
      const probe = new ReflectionProbe('skyProbe', 128, scene, true, true);
      probe.renderList.push(this.sky.mesh);
      probe.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
      scene.environmentTexture = probe.cubeTexture;
      this.probe = probe;
    }

    this.ssao = new SSAO2RenderingPipeline('ssao', scene, { ssaoRatio: 0.5, blurRatio: 1 }, [this.camera], false);
    Object.assign(this.ssao, { radius: 2.2, totalStrength: 1.1, base: 0.12, samples: 12, maxZ: 220, minZAspect: 0.5, expensiveBlur: false });
    this.ssaoOn = true;

    this.pipeline = new DefaultRenderingPipeline('post', true, scene, [this.camera]);
    this.pipeline.fxaaEnabled = true;
    this.pipeline.bloomEnabled = true;
    this.pipeline.bloomThreshold = 0.85;
    this.pipeline.bloomWeight = 0.35;
    this.pipeline.bloomKernel = 48;
    this.pipeline.bloomScale = 0.5;
    this.pipeline.imageProcessingEnabled = true;
    this.postOn = true;
  }

  resize() {
    this.engine.resize();
  }

  /** The weather changed the sky (systems/WeatherChange.js): new colours, and the sky light re-rendered. */
  /** Direct-control sight over the view: 'thermal', 'ir' or null (render/babylon/sight.js). */
  setSight(mode) {
    this.sight ??= createSight(this);
    this.sight.set(mode);
  }

  /** The tone-mapping exposure (time passing: night is exposed brighter). */
  setExposure(exposure) {
    this.scene.imageProcessingConfiguration.exposure = exposure * EXPOSURE;
  }

  setSky(theme, relight = false) {
    this.sky?.set(theme);
    if (relight) this.probe?.cubeTexture.resetRefreshCounter();
  }

  /** A render/Quality.js preset: resolution, anti-aliasing, AO, bloom, shadow map size. */
  applyQuality(q) {
    this.setResolution(q.resolution);
    this.pipeline.samples = q.msaa > 0 ? q.msaa : 1;
    this.pipeline.fxaaEnabled = !(q.msaa > 0);
    this.pipeline.bloomEnabled = q.bloom;
    const ao = q.babylonAO ?? q.ao;
    const mgr = this.scene.postProcessRenderPipelineManager;
    if (ao && !this.ssaoOn) mgr.attachCamerasToRenderPipeline('ssao', this.camera);
    if (!ao && this.ssaoOn) mgr.detachCamerasFromRenderPipeline('ssao', this.camera);
    this.ssaoOn = ao;
    // Very low: no post-processing pass at all (one full-screen copy fewer — weak laptop GPUs
    // are short of memory bandwidth); tone mapping then happens in the materials themselves
    const post = q.post !== false;
    if (post !== this.postOn) {
      if (post) mgr.attachCamerasToRenderPipeline('post', this.camera);
      else mgr.detachCamerasFromRenderPipeline('post', this.camera);
      this.scene.imageProcessingConfiguration.applyByPostProcess = post;
      this.postOn = post;
    }
    this.shadowSize = q.shadowSize;
    this.shadowQuality = q;
    this.tuneShadows();
  }

  /** The preset's shadow settings on the cascaded shadow generator (once it exists). */
  tuneShadows() {
    const gen = this.shadowGen;
    const q = this.shadowQuality;
    if (!gen || !q) return;
    gen.getLight().shadowEnabled = q.shadows !== false;   // Very low: no sun shadows
    const map = gen.getShadowMap();
    if (map.getSize().width !== q.shadowSize) map.resize(q.shadowSize);
    gen.filteringQuality = { low: ShadowGenerator.QUALITY_LOW, medium: ShadowGenerator.QUALITY_MEDIUM, high: ShadowGenerator.QUALITY_HIGH }[q.shadowFilter] ?? ShadowGenerator.QUALITY_MEDIUM;
    map.refreshRate = q.shadowEvery ?? 1;
  }

  /** The fog-of-war grid (render/FogOfWar.js): every lit material darkens what isn't seen. */
  setFogOfWar(fow) {
    const t = fow.texture;
    fow.babylonTexture = RawTexture.CreateRTexture(t.image.data, t.image.width, t.image.height, this.scene, false, false, Texture.BILINEAR_SAMPLINGMODE, Engine.TEXTURETYPE_UNSIGNED_BYTE);
    fow.babylonTexture.wrapU = fow.babylonTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
    this.fow = fow;
    this.fowVersion = t.version;
  }

  setPixelRatio(r) {
    this.engine.setHardwareScalingLevel(1 / Math.max(0.25, r));
  }

  /**
   * Render at r pixels per screen point. (No sharpen pass: it drew dark seams beside thin bright
   * lines — every tracer — on high-density screens.)
   */
  setResolution(r) {
    this.setPixelRatio(r);
  }

  // ---------------------------------------------------------------- per frame

  render(time = 0) {
    const { scene: tScene, camera: tCam } = this.three;
    tScene.updateMatrixWorld();
    tCam.updateMatrixWorld();
    this.frame++;
    this.syncAtmosphere(tScene);
    this.syncCamera(tCam);
    tScene.traverseVisible((o) => {
      if (o.isLight) this.syncLight(o);
      else if (o.userData.babylon === 'particles' || o.isSprite || o.isLineSegments || o.isPoints) this.syncExtra(o);
      else if (o.isMesh) this.syncMesh(o);
      else if (o.isLine) this.skip(o.type);
    });
    // what wasn't visited this frame is hidden (removed from the scene or made invisible)
    for (const [o, rec] of this.meshes) {
      if (rec.frame === this.frame) continue;
      if (!o.parent) { this.dropMesh(o, rec); continue; }
      if (rec.mesh.isEnabled()) rec.mesh.setEnabled(false);
    }
    for (const [o, rec] of this.lights) {
      if (rec.frame !== this.frame) rec.light.intensity = 0;
    }
    for (const [o, rec] of this.extras) {
      if (rec.frame === this.frame) continue;
      if (!o.parent) { rec.mesh.dispose(false, false); this.extras.delete(o); continue; }
      if (rec.mesh.isEnabled()) rec.mesh.setEnabled(false);
    }
    this.sky?.update(time, tCam);
    if (this.fow && this.fow.texture.version !== this.fowVersion) {
      this.fow.babylonTexture.update(this.fow.texture.image.data);
      this.fowVersion = this.fow.texture.version;
    }
    scene_render(this.scene);
  }

  syncAtmosphere(tScene) {
    const s = this.scene;
    const bg = tScene.background;
    if (bg?.isColor) s.clearColor = new Color4(bg.r, bg.g, bg.b, 1);
    const fog = tScene.fog;
    if (fog) {
      s.fogMode = fog.isFogExp2 ? Scene.FOGMODE_EXP2 : Scene.FOGMODE_LINEAR;
      s.fogDensity = fog.density ?? 0;
      s.fogStart = fog.near ?? 0;
      s.fogEnd = fog.far ?? 1000;
      c3(fog.color, s.fogColor).toGammaSpaceToRef(s.fogColor);
    } else s.fogMode = Scene.FOGMODE_NONE;
  }

  syncCamera(tCam) {
    const cam = this.camera;
    Matrix.FromArrayToRef(tCam.matrixWorld.elements, 0, _m);
    _m.decompose(_scl, _rot, _pos);
    cam.position.copyFrom(_pos);
    cam.rotationQuaternion.copyFrom(_rot);
    cam.fov = (tCam.fov * Math.PI) / 180;
    cam.minZ = tCam.near;
    cam.maxZ = tCam.far;
  }

  /** Objects with a native counterpart: effect layers, sprites, rain lines, stars. */
  syncExtra(o) {
    let rec = this.extras.get(o);
    if (!rec) {
      rec = o.userData.babylon === 'particles' ? particleLayer(this, o.userData.layer)
        : o.isSprite ? sprite(this, o)
          : o.isLineSegments ? lines(this, o)
            : points(this, o);
      this.extras.set(o, rec);
    }
    rec.frame = this.frame;
    if (!rec.mesh.isEnabled()) rec.mesh.setEnabled(true);
    rec.update();
  }

  // ---------------------------------------------------------------- lights

  syncLight(o) {
    let rec = this.lights.get(o);
    if (!rec) {
      let light = null;
      if (o.isHemisphereLight) {
        light = new HemisphericLight(`hemi${o.id}`, new Vector3(0, 1, 0), this.scene);
      } else if (o.isDirectionalLight) {
        light = new DirectionalLight(`sun${o.id}`, new Vector3(0, -1, 0), this.scene);
        if (o.castShadow && !this.shadowGen) this.makeShadows(light, o);
      } else if (o.isPointLight) {
        light = new PointLight(`point${o.id}`, new Vector3(), this.scene);
      } else if (o.isAmbientLight) {
        light = new HemisphericLight(`ambient${o.id}`, new Vector3(0, 1, 0), this.scene);
      }
      if (!light) return this.skip(o.type);
      rec = { light };
      this.lights.set(o, rec);
    }
    rec.frame = this.frame;
    const L = rec.light;
    c3(o.color, L.diffuse);
    L.intensity = o.intensity;
    if (o.isHemisphereLight) {
      c3(o.groundColor, L.groundColor);
      L.intensity *= HEMI;
    }
    if (o.isAmbientLight) L.groundColor.copyFrom(L.diffuse);
    if (o.isDirectionalLight) {
      const p = o.getWorldPosition(new o.position.constructor());
      const t = o.target.getWorldPosition(new o.position.constructor());
      L.direction.set(t.x - p.x, t.y - p.y, t.z - p.z).normalize();
      // the shadow box moved (the camera looks elsewhere): redraw the map this frame even when the
      // preset redraws it only every other frame, or shadows sit one frame off and flicker
      const moved = L.position.x !== p.x || L.position.y !== p.y || L.position.z !== p.z;
      L.position.set(p.x, p.y, p.z);
      if (moved && L === this.shadowGen?.getLight()) this.shadowGen.getShadowMap().resetRefreshCounter();
      L.specular.copyFrom(L.diffuse);
      L.intensity *= PUNCTUAL;
    }
    if (o.isPointLight) {
      const p = o.getWorldPosition(new o.position.constructor());
      L.position.set(p.x, p.y, p.z);
      L.range = o.distance || 1e4;
      // Babylon's PBR point lights fall off with the square of the distance; Three's can be
      // gentler (`decay` < 2, the flares). Match them at a typical distance (a flare over the field)
      L.intensity *= PUNCTUAL * (o.decay === 2 ? 1 : Math.pow(POINT_REF, 2 - o.decay));
    }
  }

  makeShadows(light, o) {
    // the Three sun's shadow camera: an orthographic box around the focus (world/Environment.js
    // moves the sun with where the camera looks) — one map, drawn once a frame
    const sc = o.shadow.camera;
    light.autoUpdateExtends = false;
    light.autoCalcShadowZBounds = false;
    light.orthoLeft = sc.left;
    light.orthoRight = sc.right;
    light.orthoTop = sc.top;
    light.orthoBottom = sc.bottom;
    light.shadowMinZ = sc.near;
    light.shadowMaxZ = sc.far;
    light.shadowOrthoScale = 0;   // exactly that box (Babylon pads it 10 % a side by default), so its texels match the snapping
    const gen = new ShadowGenerator(this.shadowSize, light);
    gen.usePercentageCloserFiltering = true;
    gen.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
    gen.bias = 0.0006;
    gen.normalBias = 0.02;
    this.shadowGen = gen;
    this.tuneShadows();
  }

  // ---------------------------------------------------------------- meshes

  syncMesh(o) {
    let rec = this.meshes.get(o);
    if (!rec) {
      rec = this.makeMesh(o);
      if (!rec) return;
      this.meshes.set(o, rec);
    }
    rec.frame = this.frame;
    const mesh = rec.mesh;
    if (!mesh.isEnabled()) mesh.setEnabled(true);
    // the transform, only when it changed
    const e = o.matrixWorld.elements;
    const last = rec.matrix;
    let moved = false;
    for (let i = 0; i < 16; i++) if (last[i] !== e[i]) { moved = true; break; }
    if (moved) {
      last.set(e);
      Matrix.FromArrayToRef(e, 0, _m);
      _m.decompose(mesh.scaling, mesh.rotationQuaternion, mesh.position);
    }
    this.syncGeometry(o, rec);
    if (o.isInstancedMesh) this.syncInstances(o, rec);
    if (o.material !== rec.tm) {               // swapped (a wreck turns black)
      rec.tm = o.material;
      rec.material = this.material(Array.isArray(o.material) ? o.material[0] : o.material);
      mesh.material = rec.material;
    }
    this.syncMaterial(o.material, rec.material);
  }

  makeMesh(o) {
    const geo = o.geometry;
    const tm = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!geo?.attributes?.position || !tm) return null;
    if (o.userData?.babylon === 'native') return null; // drawn by a Babylon counterpart (the sky)
    if (tm.isShaderMaterial || tm.isRawShaderMaterial) {
      this.skip(`ShaderMaterial (${o.name || o.type})`);
      return null;
    }
    const mesh = new Mesh(o.name || `m${o.id}`, this.scene);
    mesh.rotationQuaternion = new Quaternion();
    this.applyGeometry(mesh, geo);
    const material = this.material(tm);
    mesh.material = material;
    mesh.useVertexColors = !!tm.vertexColors;
    mesh.hasVertexAlpha = false;
    mesh.receiveShadows = !!o.receiveShadow;
    mesh.applyFog = tm.fog !== false;
    if (o.castShadow && this.shadowGen) this.shadowGen.addShadowCaster(mesh, false);
    if (o.frustumCulled === false || o.isInstancedMesh) mesh.alwaysSelectAsActiveMesh = true;
    const rec = { mesh, material, tm: o.material, matrix: new Float32Array(16).fill(NaN), versions: {}, instanceVersion: -1, colorVersion: -1, count: -1 };
    this.snapshotVersions(geo, rec);
    if (o.isInstancedMesh) this.syncInstances(o, rec, true);
    return rec;
  }

  dropMesh(o, rec) {
    rec.mesh.dispose(false, false); // shared materials and textures stay for the others
    this.meshes.delete(o);
  }

  /** Copy a Three geometry's attributes into a Babylon mesh. */
  applyGeometry(mesh, geo) {
    const pos = geo.attributes.position;
    const vd = new VertexData();
    vd.positions = pos.array;
    if (geo.attributes.normal) vd.normals = geo.attributes.normal.array;
    if (geo.attributes.uv) vd.uvs = geo.attributes.uv.array;
    if (geo.index) vd.indices = geo.index.array;
    else {
      const n = pos.count;
      const idx = new Uint32Array(n);
      for (let i = 0; i < n; i++) idx[i] = i;
      vd.indices = idx;
    }
    if (!geo.attributes.normal) {
      const normals = new Float32Array(pos.array.length);
      VertexData.ComputeNormals(vd.positions, vd.indices, normals);
      vd.normals = normals;
    }
    vd.applyToMesh(mesh, true);
    const col = geo.attributes.color;
    if (col) mesh.setVerticesData(VertexBuffer.ColorKind, toRGBA(col), true, 4);
    // the game's own attributes (paint, aFurrow…) keep their names: the plugins read them
    for (const [name, a] of Object.entries(geo.attributes)) {
      if (!STANDARD.has(name) && !a.isInstancedBufferAttribute) mesh.setVerticesData(name, a.array, true, a.itemSize);
    }
  }

  snapshotVersions(geo, rec) {
    for (const [k, a] of Object.entries(geo.attributes)) rec.versions[k] = a.version;
  }

  /** Re-upload attributes the game changed (terrain craters and trenches, morphing decals). */
  syncGeometry(o, rec) {
    const geo = o.geometry;
    const mesh = rec.mesh;
    if (geo !== rec.geometry) {
      if (rec.geometry) this.applyGeometry(mesh, geo);
      rec.geometry = geo;
      this.snapshotVersions(geo, rec);
      return;
    }
    const a = geo.attributes;
    if (a.position.version !== rec.versions.position) {
      mesh.updateVerticesData(VertexBuffer.PositionKind, a.position.array, false, false);
      rec.versions.position = a.position.version;
      mesh.refreshBoundingInfo();
    }
    if (a.normal && a.normal.version !== rec.versions.normal) {
      mesh.updateVerticesData(VertexBuffer.NormalKind, a.normal.array, false, false);
      rec.versions.normal = a.normal.version;
    }
    if (a.color && a.color.version !== rec.versions.color) {
      mesh.updateVerticesData(VertexBuffer.ColorKind, toRGBA(a.color), false, false);
      rec.versions.color = a.color.version;
    }
    for (const [name, attr] of Object.entries(a)) {
      if (STANDARD.has(name) || attr.version === rec.versions[name]) continue;
      mesh.updateVerticesData(name, attr.array, false, false);
      rec.versions[name] = attr.version;
    }
  }

  syncInstances(o, rec, force = false) {
    const mesh = rec.mesh;
    const im = o.instanceMatrix;
    if (force || im.version !== rec.instanceVersion) {
      if (rec.instanceVersion < 0) mesh.thinInstanceSetBuffer('matrix', im.array, 16, false);
      else mesh.thinInstanceBufferUpdated('matrix');
      rec.instanceVersion = im.version;
    }
    const ic = o.instanceColor;
    if (ic && (force || ic.version !== rec.colorVersion)) {
      rec.instanceColors ??= new Float32Array(ic.count * 4);
      const src = ic.array;
      const dst = rec.instanceColors;
      for (let i = 0, j = 0; i < ic.count; i++, j += 3) {
        dst[i * 4] = src[j]; dst[i * 4 + 1] = src[j + 1]; dst[i * 4 + 2] = src[j + 2]; dst[i * 4 + 3] = 1;
      }
      if (rec.colorVersion < 0) mesh.thinInstanceSetBuffer('color', dst, 4, false);
      else mesh.thinInstanceBufferUpdated('color');
      rec.colorVersion = ic.version;
    }
    if (o.count !== rec.count) {
      // at 0 instances Babylon turns instancing off, and its vertex-colour mixing still reads the
      // instance colour (a shader that won't compile): keep one instance and hide the mesh instead
      // (the soldiers' near / far meshes empty out all the time — render/StackRenderer.js)
      mesh.thinInstanceCount = Math.max(1, o.count);
      rec.hidden = o.count === 0;
      rec.count = o.count;
    }
    if (rec.hidden !== undefined) mesh.isVisible = !rec.hidden;
  }

  // ---------------------------------------------------------------- materials

  material(tm) {
    let m = this.materials.get(tm);
    if (m) return m;
    m = new PBRMaterial(tm.name || `mat${tm.id}`, this.scene);
    m.metallic = tm.metalness ?? 0;
    m.roughness = tm.roughness ?? 1;
    m.unlit = !!tm.isMeshBasicMaterial;
    m.backFaceCulling = tm.side === 0;                 // THREE.FrontSide
    m.sideOrientation = tm.side === 1 ? Material.ClockWiseSideOrientation : Material.CounterClockWiseSideOrientation; // BackSide flips
    m.disableDepthWrite = tm.depthWrite === false;
    if (tm.depthTest === false) m.depthFunction = 519; // Constants.ALWAYS: drawn over whatever is in front (ground overlays)
    m.maxSimultaneousLights = 8; // hemisphere, sun, rim, two explosion flashes, two flares
    m.environmentIntensity = ENV;

    m.directIntensity = 1;
    m.useAmbientOcclusionFromMetallicTextureRed = false;
    if (tm.map) m.albedoTexture = this.texture(tm.map);
    if (tm.normalMap) {
      m.bumpTexture = this.texture(tm.normalMap);
      m.bumpTexture.level = tm.normalScale?.x ?? 1;
    }
    if (tm.alphaTest > 0) {
      m.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHATEST;
      m.alphaCutOff = tm.alphaTest;
      if (m.albedoTexture) m.albedoTexture.hasAlpha = true;
    } else if (tm.transparent) {
      m.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
      if (m.albedoTexture) m.useAlphaFromAlbedoTexture = true;
    }
    if (tm.blending === 2) m.alphaMode = Engine.ALPHA_ADD; // THREE.AdditiveBlending
    if (tm.userData?.paint) new PaintPlugin(m, tm.userData.paint);
    if (tm.userData?.wind) new WindPlugin(m, tm.userData.wind);
    if (tm.userData?.terrain) new TerrainPlugin(m);
    if (this.fow && tm.fog !== false && tm.toneMapped !== false) new FowPlugin(m, this.fow);
    this.materials.set(tm, m);
    this.materialList.push([tm, m]);
    this.syncMaterial(tm, m);
    return m;
  }

  /** The things the game changes on its materials at run time: colour, emissive, opacity. */
  syncMaterial(tm, m) {
    if (Array.isArray(tm)) tm = tm[0];
    if (tm.color) {
      c3(tm.color, m.albedoColor);
      if (m.unlit) m.emissiveColor.copyFrom(m.albedoColor);
    }
    if (tm.emissive) {
      const k = tm.emissiveIntensity ?? 1;
      m.emissiveColor.set(tm.emissive.r * k, tm.emissive.g * k, tm.emissive.b * k);
    }
    if (this.heat && tm.userData?.paint) m.emissiveColor.set(0.5, 0.5, 0.5); // thermal: soldiers, vehicles, aircraft glow (sight.js)
    m.alpha = tm.opacity ?? 1;
  }

  texture(tt) {
    let t = this.textures.get(tt);
    if (t) return t;
    const img = tt.image;
    if (img && (img instanceof HTMLCanvasElement || img instanceof HTMLImageElement || (typeof OffscreenCanvas !== 'undefined' && img instanceof OffscreenCanvas))) {
      const dt = new DynamicTexture(`tex${tt.id}`, { width: img.width, height: img.height }, this.scene, true);
      dt.getContext().drawImage(img, 0, 0);
      dt.update(tt.flipY !== false);
      t = dt;
    } else if (img?.data) {
      t = RawTexture.CreateRGBATexture(toRGBA8(img), img.width, img.height, this.scene, true, tt.flipY !== false);
    } else {
      this.skip('texture without an image');
      return null;
    }
    t.wrapU = tt.wrapS === 1000 ? Texture.WRAP_ADDRESSMODE : Texture.CLAMP_ADDRESSMODE; // THREE.RepeatWrapping
    t.wrapV = tt.wrapT === 1000 ? Texture.WRAP_ADDRESSMODE : Texture.CLAMP_ADDRESSMODE;
    t.uScale = tt.repeat?.x ?? 1;
    t.vScale = tt.repeat?.y ?? 1;
    t.anisotropicFilteringLevel = 8;
    this.textures.set(tt, t);
    return t;
  }

  skip(what) {
    if (this.unsupported.has(what)) return;
    this.unsupported.add(what);
    console.info(`[babylon] not drawn yet: ${what}`);
  }

  dispose() {
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
    this.canvas.remove();
  }
}

/** The scene's render, with the shadow casters list kept current. */
function scene_render(scene) {
  scene.render();
}

/** Three colour attributes are RGB (sometimes RGBA); Babylon wants RGBA. */
function toRGBA(attr) {
  if (attr.itemSize === 4) return attr.array;
  const n = attr.count;
  const src = attr.array;
  const out = new Float32Array(n * 4);
  for (let i = 0, j = 0; i < n; i++, j += 3) {
    out[i * 4] = src[j]; out[i * 4 + 1] = src[j + 1]; out[i * 4 + 2] = src[j + 2]; out[i * 4 + 3] = 1;
  }
  return out;
}

/** A DataTexture's pixels as 8-bit RGBA. */
function toRGBA8(img) {
  const n = img.width * img.height;
  const src = img.data;
  if (src.length === n * 4 && src instanceof Uint8Array) return src;
  const out = new Uint8Array(n * 4);
  const ch = src.length / n;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 4; k++) out[i * 4 + k] = k < ch ? src[i * ch + k] : 255;
  }
  return out;
}
