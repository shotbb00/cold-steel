// Two camera poses, both computed every frame, blended by an eased 0..1 progress value:
//   ACTION   – over-the-shoulder chase cam driven by mouse look (pointer lock)
//   TACTICAL – high isometric-ish RTS cam with WASD / edge pan and wheel zoom
// Both poses stay live, so the transition follows the controlled unit smoothly. The game
// starts in TACTICAL; ACTION is used while the player controls a unit (systems/PlayerControl).
import { settings } from './Settings.js';
import * as THREE from 'three';
import { clamp } from './math.js';
import { keys } from './Keys.js';

export const CameraMode = Object.freeze({ ACTION: 'action', TACTICAL: 'tactical' });

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class CameraManager {
  constructor(camera, input, { bounds, terrain, cover = null }) {
    this.camera = camera;
    this.input = input;
    this.bounds = bounds; // { x, z } half-extents
    this.terrain = terrain;
    this.cover = cover;   // props the chase camera must not hide behind
    this.mode = CameraMode.TACTICAL;
    this.progress = 1;          // 0 = action pose, 1 = tactical pose
    this.transitionTime = 0.9;  // seconds

    this.action = { yaw: 0, pitch: 0.08, distance: 6.6, shoulder: 1.3, height: 2.7, sensitivity: 0.0022 };
    this.tactical = {
      target: new THREE.Vector3(),
      groundY: 0,      // smoothed terrain height under the target
      height: 95,
      minHeight: 22,
      maxHeight: 330,
      tilt: 0.62,      // camera sits this many "heights" behind its target (middle-drag up/down)…
      minTilt: 0.18,   // …from nearly straight down…
      maxTilt: 1.7,    // …to a low, long view
      orbit: 0,        // …on this bearing round it (middle-drag left/right): 0 = south of it looking north
      facing: 1,       // the side the view starts from: +1 south looking north, -1 north looking south
      panSpeed: 1.05,
      edge: 12,        // px from the window edge that starts edge-scrolling
    };

    this.followTarget = null;
    this.shakeAmount = 0;

    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._pivot = new THREE.Vector3();
    this._ideal = new THREE.Vector3();
    this._actionPos = new THREE.Vector3();
    this._actionLook = new THREE.Vector3();
    this._tacPos = new THREE.Vector3();
    this._tacLook = new THREE.Vector3();
    this._look = new THREE.Vector3();
  }

  /** Command camera back to its default angle and height (Home, or double-click the middle button), over the same spot. */
  resetView() {
    const tc = this.tactical;
    tc.orbit = 0;
    tc.tilt = 0.62;
    tc.height = 95;
  }

  /** Point the camera is looking at this frame (used to place the audio listener). */
  get lookTarget() { return this._look; }

  get yaw() { return this.action.yaw; }
  get pitch() { return this.action.pitch; }
  get blend() { return easeInOutCubic(this.progress); }

  /** Chase anything with a `pos` Vector3 (the unit under player control). */
  follow(target) {
    if (target !== this.followTarget) {
      this._followY = undefined; // re-seed smoothing for the new body
      this._boom = undefined;
    }
    this.followTarget = target;
  }

  /** Chase-cam framing for the controlled unit: { distance, height, shoulder }. */
  setProfile({ distance, height, shoulder }) {
    Object.assign(this.action, { distance, height, shoulder });
    this._boom = undefined;
  }

  setMode(mode) {
    this.mode = mode;
  }

  shake(amount) {
    this.shakeAmount = Math.min(0.22, this.shakeAmount + amount);
  }

  /** Full 3D aim direction of the action camera. */
  forward(out) {
    const { yaw, pitch } = this.action;
    return out.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  }

  /** Aim direction flattened onto the ground (for WASD movement). */
  flatForward(out) {
    return out.set(-Math.sin(this.action.yaw), 0, -Math.cos(this.action.yaw));
  }

  right(out) {
    return out.set(Math.cos(this.action.yaw), 0, -Math.sin(this.action.yaw));
  }

  /** Read mouse look / pan / zoom. Called early in the frame so the player uses fresh aim. */
  handleInput(dt) {
    const md = this.input.consumeMouseDelta();
    const wheel = this.input.consumeWheel();

    if (this.mode === CameraMode.ACTION) {
      if (this.input.locked || this.input.touch) { // touch: the look pad feeds the same deltas (ui/TouchControls.js)
        const a = this.action;
        const k = a.sensitivity * settings.get('sensitivity');
        a.yaw -= md.x * k;
        a.pitch = clamp(a.pitch - md.y * k * (settings.get('invertY') ? -1 : 1), -0.6, 0.85);
      }
      return;
    }

    const tc = this.tactical;
    let px = this.input.axis(keys.all('left'), keys.all('right'));
    let pz = this.input.axis(keys.all('up'), keys.all('down'));
    const m = this.input.mouse;
    if (m.inside && !this.input.isMouseDown(0)) {
      if (m.x < tc.edge) px -= 1; else if (m.x > innerWidth - tc.edge) px += 1;
      if (m.y < tc.edge) pz -= 1; else if (m.y > innerHeight - tc.edge) pz += 1;
    }
    if (this.input.isMouseDown(1)) {
      // middle-drag: left/right orbits round the point in view; up/down tilts the camera where it
      // is — the camera stays put and the point it looks at slides nearer or farther
      tc.orbit -= md.x * 0.006;
      const tilt = clamp(tc.tilt - md.y * 0.004 * (settings.get('invertY') ? -1 : 1), tc.minTilt, tc.maxTilt); // drag up: look up
      const shift = (tilt - tc.tilt) * tc.height;   // how much farther the camera now sits behind the look point
      tc.target.x -= Math.sin(tc.orbit) * tc.facing * shift;
      tc.target.z -= Math.cos(tc.orbit) * tc.facing * shift;
      tc.tilt = tilt;
    }
    // screen directions turn with the view: "up" is away from the camera, "right" across it
    const speed = tc.height * tc.panSpeed * dt;
    const s = Math.sin(tc.orbit) * tc.facing;
    const c = Math.cos(tc.orbit) * tc.facing;
    px = clamp(px, -1, 1);
    pz = clamp(pz, -1, 1);
    tc.target.x = clamp(tc.target.x + (px * c + pz * s) * speed, -this.bounds.x, this.bounds.x);
    tc.target.z = clamp(tc.target.z + (-px * s + pz * c) * speed, -this.bounds.z, this.bounds.z);
    if (wheel) tc.height = clamp(tc.height * (1 + wheel * 0.0012), tc.minHeight, tc.maxHeight);
  }

  /** Advance the transition and place the camera. Called after entities have moved. */
  update(dt) {
    const goal = this.mode === CameraMode.TACTICAL ? 1 : 0;
    const step = dt / this.transitionTime;
    this.progress = goal > this.progress ? Math.min(goal, this.progress + step) : Math.max(goal, this.progress - step);

    const a = this.action;
    if (this.followTarget) {
      const p = this.followTarget.pos;
      // Smooth the vertical follow so steps in the ground don't jolt the view (snap on teleports).
      if (this._followY === undefined || Math.abs(p.y - this._followY) > 4) this._followY = p.y;
      this._followY += (p.y - this._followY) * Math.min(1, dt * 12);
      this.forward(this._fwd);
      this.right(this._right);
      this._pivot.set(p.x, this._followY + a.height, p.z).addScaledVector(this._right, a.shoulder);

      // Boom: if a hill sits between the shoulder and the ideal camera spot, pull in — fast when
      // blocked, easing back out — instead of popping the camera upward.
      let clear = a.distance;
      for (let d = 0.5; d <= a.distance; d += 0.5) {
        const x = this._pivot.x - this._fwd.x * d;
        const y = this._pivot.y - this._fwd.y * d;
        const z = this._pivot.z - this._fwd.z * d;
        if (y < this.terrain.heightAt(x, z) + 0.45) { clear = Math.max(1.2, d - 0.5); break; }
      }
      if (this.cover) {
        // …and the same for walls, columns and pylons
        this._ideal.copy(this._pivot).addScaledVector(this._fwd, -a.distance);
        const t = this.cover.segmentHit(this._pivot, this._ideal);
        if (t >= 0) clear = Math.min(clear, Math.max(1.2, t * a.distance - 0.4));
      }
      if (this._boom === undefined) this._boom = clear;
      // Rate-limited so even a sudden crest can't snap the view (the floor clamp below keeps
      // the lens out of the ground meanwhile).
      const maxStep = (clear < this._boom ? 9 : 3) * dt;
      this._boom += clamp(clear - this._boom, -maxStep, maxStep);
      this._actionPos.copy(this._pivot).addScaledVector(this._fwd, -this._boom);
      const floor = this.terrain.heightAt(this._actionPos.x, this._actionPos.z) + 0.4;
      if (this._actionPos.y < floor) this._actionPos.y = floor;
      this._actionLook.copy(this._pivot).addScaledVector(this._fwd, 30);
    }

    const tc = this.tactical;
    tc.groundY += (this.terrain.heightAt(tc.target.x, tc.target.z) - tc.groundY) * Math.min(1, dt * 3);
    const back = tc.height * tc.tilt;
    this._tacPos.set(tc.target.x + Math.sin(tc.orbit) * back * tc.facing, tc.groundY + tc.height, tc.target.z + Math.cos(tc.orbit) * back * tc.facing);
    this._tacLook.set(tc.target.x, tc.groundY, tc.target.z);

    const e = this.blend;
    const cam = this.camera;
    cam.position.lerpVectors(this._actionPos, this._tacPos, e);
    this._look.lerpVectors(this._actionLook, this._tacLook, e);

    if (this.shakeAmount > 0.001) {
      // Smooth (sum-of-sines) shake rather than per-frame random jumps.
      this._shakeT = (this._shakeT ?? 0) + dt;
      const t = this._shakeT;
      const s = this.shakeAmount * (1 - e * 0.8);
      cam.position.x += (Math.sin(t * 41) + Math.sin(t * 67) * 0.5) * 0.33 * s;
      cam.position.y += (Math.sin(t * 53 + 1) + Math.sin(t * 79) * 0.5) * 0.33 * s;
      cam.position.z += Math.sin(t * 47 + 2) * 0.25 * s;
      this.shakeAmount *= Math.exp(-dt * 9);
    }
    cam.lookAt(this._look);
  }
}
