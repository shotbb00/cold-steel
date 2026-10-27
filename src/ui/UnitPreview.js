// The main menu's unit preview: a small turntable scene with its own renderer that shows any
// unit type for either side, built by the game's real renderers (render/StackRenderer for
// infantry, render/RigRenderer for vehicles) driven by stand-in units — so what you see here is
// exactly what you get in battle, poses and animation included.
//   preview.show(typeId, faction)   preview.setPose(pose)   preview.dispose()
// Drag to orbit, wheel to zoom; it turns slowly on its own when left alone.
import * as THREE from 'three';
import { getUnitType } from '../data/units/index.js';
import { FACTIONS } from '../data/factions.js';
import { StackRenderer } from '../render/StackRenderer.js';
import { RigRenderer } from '../render/RigRenderer.js';
import { buildAircraft, KINDS } from '../systems/AirStrike.js';

export const INFANTRY_POSES = ['idle', 'aim', 'kneel', 'prone', 'walk', 'run', 'reload'];
export const VEHICLE_POSES = ['idle', 'traverse', 'drive', 'fire'];
export const AIRCRAFT_POSES = ['hover', 'fly'];

const FLAT = {
  heightAt: () => 0,
  normalAt: (x, z, out) => out.set(0, 1, 0),
};

/** A stand-in for entities/Unit with just what the renderers read. */
function standIn(stack, index, x, yaw) {
  return {
    stack, index, alive: true, visible: true, pos: new THREE.Vector3(x, 0, 0), vel: new THREE.Vector3(),
    yaw, turretYaw: yaw, aimYaw: yaw, prone: 0, crouch: 0, gait: 0, run: false, moving: false, walkPhase: index * 1.3,
    phase: index * 2.1 + 0.5, tint: 0.95 + index * 0.04, flash: 0, flinch: 0, recoil: 0, reloadAnim: 0, reloadT: 0,
    working: false, wounded: false, target: null, possessed: false, peekT: 0, deathTime: 0, cooldown: 0, aimPitch: 0,
    stats: stack.stats,
  };
}

function groundTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, '#59603f');
  grad.addColorStop(0.65, '#3f4630');
  grad.addColorStop(1, 'rgba(20,22,16,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) {           // speckle: soil and grass
    g.fillStyle = `rgba(${30 + Math.random() * 60},${35 + Math.random() * 50},${20 + Math.random() * 25},${Math.random() * 0.35})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class UnitPreview {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    const scene = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    scene.add(new THREE.HemisphereLight(0xc6ccd2, 0x4a4434, 1.3));
    const sun = new THREE.DirectionalLight(0xf0e6d2, 2.2);
    sun.position.set(-6, 10, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xb8c4d0, 0.6);
    rim.position.set(6, 4, -8);
    scene.add(rim);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(10, 48), new THREE.MeshStandardMaterial({ map: groundTexture(), transparent: true, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    this.orbit = { yaw: 0.7, pitch: 0.28, zoom: 1, target: new THREE.Vector3(0, 1, 0), idle: 0 };
    this.fit = { w: 2, h: 1.2 }; // half-extents (m) the camera keeps in frame
    this.bindInput();
    this.clock = new THREE.Clock();
    this.time = 0;
    this.renderer.setAnimationLoop(() => this.frame());
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
  }

  bindInput() {
    const c = this.canvas;
    let drag = null;
    c.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => {
      if (!drag) return;
      this.orbit.yaw -= (e.clientX - drag.x) * 0.008;
      this.orbit.pitch = Math.max(0.02, Math.min(1.2, this.orbit.pitch + (e.clientY - drag.y) * 0.006));
      drag = { x: e.clientX, y: e.clientY };
      this.orbit.idle = 0;
    });
    c.addEventListener('pointerup', () => { drag = null; });
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.orbit.zoom = Math.max(0.45, Math.min(2.2, this.orbit.zoom * (1 + Math.sign(e.deltaY) * 0.1)));
    }, { passive: false });
  }

  resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Show `typeId` as fielded by `faction`. */
  show(typeId, faction) {
    this.clear();
    const type = getUnitType(typeId);
    const vehicle = type.kind !== 'infantry';
    const stack = {
      type, faction, kind: type.kind, stats: type.stats, units: [],
      glowColor: new THREE.Color(FACTIONS[faction].marking),
      services: { effects: { dust() {}, explosion() {}, burn() {} }, audio: null },
      world: { terrain: FLAT },
    };
    const n = vehicle ? 1 : Math.min(type.formation.count, 3);
    for (let i = 0; i < n; i++) stack.units.push(standIn(stack, i, (i - (n - 1) / 2) * 1.15, Math.PI * 0.08 * (i - 1)));
    this.stack = stack;
    this.view = vehicle ? new RigRenderer(stack, this.scene) : new StackRenderer(stack, this.scene);
    this.vehicle = vehicle;
    this.orbit.target.set(0, vehicle ? 1.2 : 0.9, 0);
    this.orbit.zoom = 1;
    this.fit = vehicle ? { w: 4.4, h: 2.1 } : { w: 0.55 + n * 0.5, h: 1.1 };
    this.setPose('idle');
  }

  /** Show an aircraft of support power `kind` ('heli', 'jet', 'lift') for `faction`, in the air. */
  showAircraft(kind, faction) {
    this.clear();
    const rig = buildAircraft(kind, faction);
    this.aircraft = { rig, kind, type: KINDS[kind].aircraft[faction] };
    this.scene.add(rig.root);
    const jet = kind === 'jet';
    this.orbit.target.set(0, jet ? 3.2 : 3, 0);
    this.orbit.zoom = 1;
    this.fit = jet ? { w: 9.5, h: 3.4 } : { w: (rig.rotorRadius ?? 7) + 1.2, h: 3.4 };
    this.setPose('hover');
  }

  setPose(pose) {
    this.pose = pose;
    if (!this.stack) return;
    const aim = { pos: new THREE.Vector3(0, 0, 40), aimHeight: 1.2 };
    for (const u of this.stack.units) {
      Object.assign(u, { prone: 0, crouch: 0, gait: 0, run: false, moving: false, target: null, peekT: 0, reloadT: 0, reloadAnim: 0, recoil: 0 });
      if (pose === 'aim' || pose === 'kneel' || pose === 'prone') u.target = aim;
      if (pose === 'kneel') u.crouch = 1;
      if (pose === 'prone') u.prone = 1;
      if (pose === 'walk') Object.assign(u, { gait: 0.6, moving: true });
      if (pose === 'run') Object.assign(u, { gait: 1, moving: true, run: true });
      if (pose === 'reload') Object.assign(u, { reloadT: 2, reloadAnim: 1, crouch: 0.85 });
      if (pose === 'drive') Object.assign(u, { gait: 1, moving: true });
    }
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    const t = this.time;
    if (this.aircraft) {
      const { rig, type, kind } = this.aircraft;
      const fly = this.pose === 'fly';
      // hovering: a gentle bob; flying: nose down, banking in a lazy turn
      rig.root.position.set(0, (kind === 'jet' ? 3 : 2.6) + Math.sin(t * 1.3) * 0.12, 0);
      rig.root.rotation.set(fly ? (kind === 'jet' ? 0.05 : 0.14) : 0, 0, fly ? Math.sin(t * 0.5) * 0.35 : Math.sin(t * 0.9) * 0.03, 'YXZ');
      if (rig.rotor) rig.rotor.rotation.y += dt * (type.rotorSpeed ?? 25);
      if (rig.tailRotor) rig.tailRotor.rotation.x += dt * 70;
    }
    if (this.stack) {
      for (const u of this.stack.units) {
        if (u.moving) u.walkPhase += dt * (this.vehicle ? 4 : u.run ? 9 : 5.5);
        if (this.pose === 'traverse') u.turretYaw = u.yaw + Math.sin(t * 0.6) * 1.2;
        if (this.pose === 'fire' || (this.pose === 'aim' && !this.vehicle)) {
          if ((t + u.index * 0.7) % (this.vehicle ? 3 : 1.6) < dt) u.recoil = 1;
          u.recoil = Math.max(0, u.recoil - dt * 3);
        }
        if (this.pose === 'reload') u.reloadT = 2; // keep reloading
      }
      this.view.done = false;
      this.view.update(dt, t);
    }
    const o = this.orbit;
    o.idle += dt;
    if (o.idle > 3) o.yaw += dt * 0.15; // slow turntable when left alone
    // distance that keeps the unit's half-extents in frame for this canvas shape
    const tv = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const dist = Math.max(this.fit.h / tv, this.fit.w / (tv * this.camera.aspect)) * 1.05 * o.zoom;
    const cp = Math.cos(o.pitch);
    this.camera.position.set(o.target.x + Math.sin(o.yaw) * cp * dist, o.target.y + Math.sin(o.pitch) * dist, o.target.z + Math.cos(o.yaw) * cp * dist);
    this.camera.lookAt(o.target);
    this.renderer.render(this.scene, this.camera);
  }

  clear() {
    this.view?.dispose();
    this.view = null;
    this.stack = null;
    this.aircraft?.rig.root.removeFromParent();
    this.aircraft = null;
  }

  dispose() {
    this.clear();
    this.ro.disconnect();
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
