// Direct control. From the tactical view, select a stack and press Tab to take over one of
// its members — a soldier or a vehicle — in third person:
//   WASD move · Shift sprint · C crouch · Z prone (infantry) · mouse aim · LMB fire
//   R reload · Q / E switch to another member of the same stack · Tab back to command
// The rest of the stack follows and fights around you (StackAI Follow), and your presence
// steadies and empowers nearby allies (AuraSystem). If your unit falls you take over the
// next living member; when the whole stack is gone you return to the tactical view.
import * as THREE from 'three';
import { CameraMode } from '../core/CameraManager.js';
import { enemyOf } from '../data/factions.js';
import { angleDelta, clamp } from '../core/math.js';
import { GroundDecal } from '../world/GroundDecal.js';

const DEFAULT_CAMERA = { distance: 6.6, height: 2.7, shoulder: 1.3 };
const _wish = new THREE.Vector3();
const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _dir = new THREE.Vector3();

export class PlayerControl {
  constructor(game) {
    this.game = game;
    this.unit = null;
    this.stack = null;
    this.fireTimer = 0;
    this.beam = null;
    this.aimPoint = new THREE.Vector3();

    const ringGeo = new THREE.RingGeometry(0.85, 1, 48);
    ringGeo.rotateX(-Math.PI / 2);
    this.ring = new GroundDecal(ringGeo, new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xffc35a).multiplyScalar(1.6), transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }), game.terrain, 0.2);
    this.ring.mesh.visible = false;
    game.scene.add(this.ring.mesh);

    const bus = game.bus;
    bus.on('key', ({ code }) => this.onKey(code));
    bus.on('unit:death', ({ unit }) => { if (unit === this.unit) this.onUnitDeath(); });
  }

  get active() {
    return !!this.unit;
  }

  onKey(code) {
    if (!this.unit) return;
    if (code === 'KeyR') this.reload();
    else if (code === 'KeyC' && this.stack.usesCover) {
      this.unit.crouchTarget = this.unit.crouchTarget > 0.5 ? 0 : 1;
      this.unit.proneTarget = 0;
    } else if (code === 'KeyZ' && this.stack.usesCover) {
      this.unit.proneTarget = this.unit.proneTarget > 0.5 ? 0 : 1;
    }
    else if (code === 'KeyQ') this.cycle(-1);
    else if (code === 'KeyE') this.cycle(1);
  }

  /** Take over `unit` (default: the living member of `stack` nearest the stack's centre). */
  possess(stack, unit = null) {
    const candidates = stack.units.filter((m) => m.alive);
    if (!candidates.length) return false;
    unit ??= candidates.reduce((best, m) => (m.pos.distanceToSquared(stack.centroid) < best.pos.distanceToSquared(stack.centroid) ? m : best));
    if (this.unit && this.unit !== unit) this.detach();

    this.unit = unit;
    this.stack = stack;
    unit.possessed = true;
    unit.target = null;
    unit.burstLeft = 0;
    unit.crouchTarget = 0;
    unit.proneTarget = 0;
    unit.nearMiss = () => this.game.audio.play('snap', null, { volume: 0.5, throttle: 0.12 });
    this.game.cover.release(unit);
    stack.ai.follow(unit);

    const cm = this.game.cameraManager;
    cm.setProfile(stack.type.camera ?? DEFAULT_CAMERA);
    cm.follow(unit);
    if (cm.mode !== CameraMode.ACTION) {
      cm.action.yaw = unit.yaw + Math.PI; // look the way the unit faces
      cm.action.pitch = 0.05;
      cm.setMode(CameraMode.ACTION);
      this.game.bus.emit('view', CameraMode.ACTION);
    }
    this.game.input.requestLock();
    this.ring.mesh.visible = true;
    this.game.bus.emit('possess', { unit, stack });
    this.game.bus.emit('toast', `Now leading ${stack.name}${stack.units.length > 1 ? ` — member ${unit.index + 1}` : ''}`);
    return true;
  }

  /** Hand the unit back to its stack's AI. */
  detach() {
    const u = this.unit;
    if (!u) return;
    if (this.beam) this.game.beams.stop(this.beam);
    this.beam = null;
    u.possessed = false;
    u.nearMiss = null;
    u.thinkT = 0;
    u.retarget = 0;
    u.crouchTarget = 0;
    if (this.stack.ai.state === 'Following you') this.stack.ai.idle();
    this.unit = null;
  }

  /** Back to the tactical view. */
  release() {
    const u = this.unit;
    const stack = this.stack;
    this.detach();
    this.stack = null;
    this.ring.mesh.visible = false;
    const cm = this.game.cameraManager;
    if (u) cm.tactical.target.set(u.pos.x, 0, u.pos.z);
    cm.setMode(CameraMode.TACTICAL);
    this.game.input.releaseLock();
    this.game.bus.emit('view', CameraMode.TACTICAL);
    if (stack) this.game.commands.select([stack]);
  }

  cycle(step) {
    const alive = this.stack.units.filter((m) => m.alive);
    if (alive.length < 2) return;
    const i = alive.indexOf(this.unit);
    this.possess(this.stack, alive[(i + step + alive.length) % alive.length]);
  }

  onUnitDeath() {
    const stack = this.stack;
    this.game.bus.emit('player:down');
    this.detach();
    const next = stack.units.find((m) => m.alive);
    if (next) {
      this.game.bus.emit('toast', 'You fell — taking over the next member');
      this.possess(stack, next);
    } else {
      this.game.bus.emit('toast', `${stack.name} is gone — back to command`);
      this.stack = stack;
      this.release();
    }
  }

  reload() {
    const u = this.unit;
    const s = u.stats;
    if (s.weapon === 'beam' || u.reloadT > 0 || u.mag >= s.magSize) return;
    this.stack.startReload(u);
    this.wasReloading = true;
  }

  // ---------------------------------------------------------------- per frame

  update(dt) {
    const u = this.unit;
    if (!u || !u.alive) return;
    const game = this.game;
    const stack = this.stack;
    const s = stack.stats; // body (speed, turning)
    const ws = u.stats;    // weapon (specialists differ)
    const input = game.input;
    const cam = game.cameraManager;
    const infantry = stack.usesCover;

    // --- movement, camera-relative
    const fwd = input.axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']);
    const strafe = input.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
    _wish.set(0, 0, 0).addScaledVector(cam.flatForward(_f), fwd).addScaledVector(cam.right(_r), strafe);
    const sprint = infantry && (input.isDown('ShiftLeft') || input.isDown('ShiftRight'));
    if (sprint) u.crouchTarget = u.proneTarget = 0;
    if (_wish.lengthSq() > 0) {
      let speed = s.speed * (sprint ? 1.7 : 1.15);
      if (u.crouch > 0.5) speed *= 0.45;
      if (u.prone > 0.5) speed = Math.min(speed, 0.8); // crawl
      if (u.wounded && infantry) speed *= 0.8;
      _wish.normalize().multiplyScalar(speed);
    }
    if (!infantry && _wish.lengthSq() > 0) {
      // heavy hulls can't strafe: drive along the hull, turning it toward the wish direction
      const wishYaw = Math.atan2(_wish.x, _wish.z);
      u.yaw += clamp(angleDelta(u.yaw, wishYaw), -s.turnRate * dt, s.turnRate * dt);
      const along = Math.max(0, Math.cos(angleDelta(u.yaw, wishYaw)));
      _wish.set(Math.sin(u.yaw), 0, Math.cos(u.yaw)).multiplyScalar(_wish.length() * along);
    }
    stack.separate(u, _wish); // don't walk through your own squad
    u.vel.lerp(_wish, Math.min(1, dt * (infantry ? 9 : 2.5)));
    stack.moveBody(u, dt);

    // --- aim: infantry turn to the crosshair; vehicles traverse their turret
    const aimYaw = cam.yaw + Math.PI;
    u.aimYaw = aimYaw;
    u.aimPitch = cam.pitch; // the renderer raises the weapon to the crosshair
    if (infantry) u.yaw = aimYaw;
    else u.turretYaw += clamp(angleDelta(u.turretYaw, aimYaw), -s.turretRate * 1.6 * dt, s.turretRate * 1.6 * dt);
    this.computeAimPoint(this.aimPoint);

    // --- weapon
    this.fireTimer -= dt;
    const trigger = input.locked && input.isMouseDown(0) && !game.ended;
    if (ws.weapon === 'beam') {
      if (trigger && !this.beam && u.cooldown <= 0) {
        this.beam = game.beams.start(u, stack, { player: true, aim: this.aimPoint });
        u.cooldown = ws.beamDuration + ws.fireCooldown * 0.6;
      }
      if (this.beam) {
        if (!trigger || this.beam.t >= this.beam.duration) {
          game.beams.stop(this.beam);
          this.beam = null;
        } else this.beam.aim.copy(this.aimPoint);
      }
    } else if (trigger && this.fireTimer <= 0 && u.reloadT <= 0 && u.mag > 0 && (u.prone > 0.85 || u.prone < 0.1)) {
      const aligned = infantry || Math.abs(angleDelta(u.turretYaw, aimYaw)) < 0.08;
      if (aligned) {
        stack.fireAt(u, this.aimPoint);
        this.fireTimer = ws.playerFireInterval ?? 0.3;
        u.mag--;
        game.cameraManager.shake(infantry ? 0.015 : 0.08);
        if (u.mag <= 0) this.reload();
      }
    }
    if (this.wasReloading && u.reloadT <= 0) {
      this.wasReloading = false;
      game.bus.emit('player:reloaded');
    }

    this.ring.place(u.pos.x, u.pos.z, u.radius + 0.8);
  }

  /** What the crosshair is on: the first enemy along the camera ray, else ground, else far. */
  computeAimPoint(out) {
    const game = this.game;
    const camera = game.camera;
    const dir = game.cameraManager.forward(_dir);
    const range = this.unit.stats.range * 1.3;
    const hit = game.world.raycast(camera.position, dir, enemyOf(this.stack.faction), range);
    let dist = hit ? hit.distance : range;
    const ground = game.terrain.raycast(camera.position, dir, dist, _aim);
    if (ground) dist = Math.min(dist, ground.distanceTo(camera.position));
    return out.copy(camera.position).addScaledVector(dir, dist);
  }
}
