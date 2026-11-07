// The horse demo (tools/horse.html): data/models/horse.js on a treadmill — the ground and a row of
// fence posts slide past at the horse's speed — with its gaits, coats, a saddle, a herd of four and
// slow motion. window.demo is there for tests (setGait, step, render).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildHorse, GAITS, COATS } from '../src/data/models/horse.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaebfcc);
scene.fog = new THREE.Fog(0xaebfcc, 30, 90);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.1, 0);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xe6eef4, 0x5a5640, 1.4));
const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
sun.position.set(6, 12, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
scene.add(sun);

// the ground: grass with a worn track, moving under the horse
const tex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#5e6b3c';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `hsl(${70 + Math.random() * 25}, ${25 + Math.random() * 20}%, ${22 + Math.random() * 18}%)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 3 + Math.random() * 4);
  }
  g.fillStyle = 'rgba(110, 90, 60, 0.55)'; // the track
  g.fillRect(96, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(20, 20);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
})();
const TILE = 200 / 20; // metres per texture repeat
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const posts = [];
const postGeo = new THREE.BoxGeometry(0.12, 1.1, 0.12);
const railGeo = new THREE.BoxGeometry(0.05, 0.08, 4);
const wood = new THREE.MeshStandardMaterial({ color: 0x6b5236, roughness: 0.9 });
for (let i = 0; i < 16; i++) {
  const p = new THREE.Group();
  const post = new THREE.Mesh(postGeo, wood); post.position.y = 0.55; post.castShadow = true;
  const rail = new THREE.Mesh(railGeo, wood); rail.position.set(0, 0.9, 2); rail.castShadow = true;
  p.add(post, rail);
  p.position.set(3.2, 0, -30 + i * 4);
  scene.add(p);
  posts.push(p);
}

// the horses
let herd = false;
let saddle = false;
let coat = 'bay';
let horses = [];
const HERD = [['bay', -3.3], ['grey', -1.1], ['chestnut', 1.1], ['black', 3.3]];
function rebuild() {
  for (const h of horses) scene.remove(h.root);
  horses = (herd ? HERD : [[coat, 0]]).map(([c, x]) => {
    const h = buildHorse({ coat: c, saddle });
    h.root.position.x = x;
    if (herd) h.root.position.z = (Math.random() - 0.5) * 1.5;
    scene.add(h.root);
    return h;
  });
}

const NAMES = { halt: 'Halt', walk: 'Walk', trot: 'Trot', canter: 'Canter', gallop: 'Gallop' };
let gait = 'halt';
let slow = 1;
const VIEWS = {
  side: [[5.2, 1.3, 0.2], [0, 1.0, 0]],
  'three-quarter': [[4.8, 2.6, 5.2], [0, 1.0, 0]],
  front: [[0.6, 1.8, 7], [0, 1.1, 0]],
  legs: [[3.2, 0.55, 0.6], [0, 0.55, 0]],
};
function view(id) {
  const [p, t] = VIEWS[id];
  camera.position.set(...p);
  controls.target.set(...t);
  controls.update();
}

// the controls
const el = (tag, text, cls) => { const e = document.createElement(tag); e.textContent = text; if (cls) e.className = cls; return e; };
function buttons(box, items, current, pick) {
  const all = items.map(([id, label]) => {
    const b = el('button', label, id === current ? 'on' : '');
    b.type = 'button';
    b.addEventListener('click', () => { for (const o of all) o.classList.toggle('on', o === b); pick(id); });
    box.append(b);
    return b;
  });
  return all;
}
const gaitButtons = buttons(document.getElementById('gaits'), Object.keys(GAITS).map((g) => [g, NAMES[g]]), gait, (g) => setGait(g));
buttons(document.getElementById('coats'), Object.keys(COATS).map((c) => [c, c[0].toUpperCase() + c.slice(1)]), coat, (c) => { coat = c; herd = false; herdBtn.classList.remove('on'); rebuild(); });
buttons(document.getElementById('views'), Object.keys(VIEWS).map((v) => [v, v[0].toUpperCase() + v.slice(1)]), 'three-quarter', view);
const opts = document.getElementById('opts');
const toggle = (label, on) => { const b = el('button', label); b.type = 'button'; b.addEventListener('click', () => b.classList.toggle('on', on(!b.classList.contains('on')))); opts.append(b); return b; };
toggle('Saddle', (v) => { saddle = v; rebuild(); return v; });
const herdBtn = toggle('Herd', (v) => { herd = v; rebuild(); return v; });
toggle('Slow motion', (v) => { slow = v ? 0.25 : 1; return v; });

function setGait(g) {
  gait = g;
  gaitButtons.forEach((b, i) => b.classList.toggle('on', Object.keys(GAITS)[i] === g));
  document.getElementById('gait').textContent = NAMES[g];
}
addEventListener('keydown', (e) => { const g = Object.keys(GAITS)[Number(e.key) - 1]; if (g) setGait(g); });

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

let travelled = 0;
function step(dt) {
  dt *= slow;
  for (const h of horses) h.update(dt, gait);
  const v = horses[0]?.speed ?? 0;
  travelled += v * dt;
  tex.offset.y = (travelled / TILE) % 1;                 // the ground slides back under the hooves
  for (const p of posts) { p.position.z -= v * dt; if (p.position.z < -32) p.position.z += 64; }
  document.getElementById('speed').textContent = `${Math.round(v * 3.6)} km/h`;
}
const clock = new THREE.Clock();
function frame() {
  step(Math.min(0.05, clock.getDelta()));
  controls.update();
  renderer.render(scene, camera);
}

rebuild();
resize();
view('three-quarter');
renderer.setAnimationLoop(frame);
window.demo = { setGait, step, render: () => renderer.render(scene, camera), view, camera, controls, stop: () => renderer.setAnimationLoop(null), horses: () => horses };
window.ready = true;
