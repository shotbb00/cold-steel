// Atmosphere shared by every map: sun + sky light with shadows, a sky dome with sun glow
// (theme.sunDisk scales it down for overcast skies), a drifting cloud layer (theme.clouds =
// cover 0..1, cloudLight / cloudDark colours), fog, and optional extras a theme can
// switch on: faint aurora (theme.aurora), stars (theme.stars), a ringed planet (theme.planetDir).
// The ground itself is built by Terrain from the map's height function.
import * as THREE from 'three';

export function buildEnvironment(scene, theme, shadowExtent = 140) {
  scene.background = new THREE.Color(theme.fogColor);
  scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);

  // ---- lights
  const hemi = new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, theme.hemiIntensity);
  scene.add(hemi);
  const sunDir = new THREE.Vector3(...theme.sunDir).normalize();
  const sun = new THREE.DirectionalLight(theme.sunColor, theme.sunIntensity);
  sun.position.copy(sunDir).multiplyScalar(220);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -shadowExtent;
  sc.right = sc.top = shadowExtent;
  sc.near = 20;
  sc.far = 500;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(theme.rimColor, theme.rimIntensity);
  rim.position.set(-sunDir.x * 100, 40, -sunDir.z * 100);
  scene.add(rim);

  // ---- sky dome
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(theme.skyTop) },
      horizon: { value: new THREE.Color(theme.skyHorizon) },
      bottom: { value: new THREE.Color(theme.skyBottom) },
      sunColor: { value: new THREE.Color(theme.sunColor) },
      aurora: { value: new THREE.Color(theme.aurora ?? 0x000000) },
      sunDisk: { value: theme.sunDisk ?? 1 },
      clouds: { value: theme.clouds ?? 0 },
      cloudLight: { value: new THREE.Color(theme.cloudLight ?? 0xd8d8d4) },
      cloudDark: { value: new THREE.Color(theme.cloudDark ?? 0x8a8e92) },
      sunDir: { value: sunDir },
      time: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
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
          // a flat cloud deck seen in perspective, drifting with the wind
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
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat);
  sky.renderOrder = -10;
  sky.userData.babylon = 'native'; // render/babylon/sky.js draws it under Babylon
  scene.add(sky);

  // ---- stars, faint, only high up where the sky is dark (built always: time can pass into night)
  let stars = null;
  {
  const starPos = [];
  for (let i = 0; i < 1200; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = 0.35 + Math.random() * 0.63;
    const r = 850;
    starPos.push(Math.cos(u) * Math.sqrt(1 - v * v) * r, v * r, Math.sin(u) * Math.sqrt(1 - v * v) * r);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.45, depthWrite: false,
  }));
  stars.visible = !!theme.stars;
  scene.add(stars);
  }

  // ---- a ringed planet over the horizon
  let body = null;
  if (theme.planetDir) {
  const planetDir = new THREE.Vector3(...theme.planetDir).normalize();
  const planet = new THREE.Group();
  planet.position.copy(planetDir).multiplyScalar(780);
  body = new THREE.Mesh(
    new THREE.SphereGeometry(70, 48, 32),
    new THREE.MeshStandardMaterial({ color: theme.planetColor, roughness: 1, fog: false }),
  );
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(95, 150, 96),
    new THREE.MeshBasicMaterial({ color: theme.planetRing, transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false, depthWrite: false }),
  );
  ring.rotation.set(1.25, 0.3, 0.2);
  planet.add(body, ring);
  scene.add(planet);
  }

  // the shadow camera's own axes (it looks down -sunDir with world up), for texel snapping
  const lightRight = new THREE.Vector3();
  const lightUp = new THREE.Vector3();
  const axes = () => {
    lightRight.crossVectors(new THREE.Vector3(0, 1, 0), sunDir).normalize();
    lightUp.crossVectors(sunDir, lightRight);
  };
  axes();
  const centre = new THREE.Vector3();

  return {
    sun,
    hemi,
    rim,
    stars,
    /** Move the sun (or moon) to [x, y, z] (time passing: systems/WeatherChange.js). */
    setSunDir(dir) {
      sunDir.set(...dir).normalize();
      axes();
      rim.position.set(-sunDir.x * 100, 40, -sunDir.z * 100);
    },
    sky: skyMat,   // its uniforms change with the weather (systems/WeatherChange.js)
    /** `focus` (where the camera looks) keeps the sharp shadow area under the action. */
    update(dt, t, focus = null) {
      if (focus) {
        // move the shadow box in whole shadow-map texels, measured across the light: then every
        // texel keeps covering the same patch of ground and shadow edges stay put as the camera
        // glides (a world-space grid shifts the texels and makes the edges crawl and pop)
        const texel = (sc.right - sc.left) / sun.shadow.mapSize.x;
        centre.set(focus.x, 0, focus.z);
        const u = centre.dot(lightRight), v = centre.dot(lightUp);
        centre.addScaledVector(lightRight, Math.round(u / texel) * texel - u)
          .addScaledVector(lightUp, Math.round(v / texel) * texel - v);
        sun.target.position.copy(centre);
        sun.position.copy(centre).addScaledVector(sunDir, 220);
      }
      skyMat.uniforms.time.value = t;
      if (body) body.rotation.y += dt * 0.004;
    },
  };
}
