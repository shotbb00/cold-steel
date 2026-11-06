// Direct control. From the tactical view, select a stack and press Tab to take over one of
// its members — a soldier or a vehicle — in third person:
//   WASD move · Shift sprint · C crouch · Z prone (infantry) · mouse aim · LMB fire
//   R reload · F anti-tank rocket / guided missile · T grenade · X smoke launchers (vehicles)
//   V binoculars (observers, scouts, recon): a click calls every gun in range on the spot
//   Q / E switch to another member of the same stack · Tab back to command
// The rest of the stack follows and fights around you (StackAI Follow) — no bonuses: you are one
// more man (or vehicle) in the fight, not a buff for the others. If your unit falls you take over the
// next living member; when the whole stack is gone you return to the tactical view.
import * as THREE from 'three';
import { CameraMode } from '../core/CameraManager.js';
import { enemyOf } from '../data/factions.js';
import { angleDelta, clamp } from '../core/math.js';
import { GroundDecal } from '../world/GroundDecal.js';
import { keys } from '../core/Keys.js';
import { GRENADE, LAW } from '../entities/UnitStack.js';

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
    if (keys.is(code, 'reload')) this.reload();
    else if (keys.is(code, 'crouch') && this.stack.usesCover) {
      this.unit.crouchTarget = this.unit.crouchTarget > 0.5 ? 0 : 1;
      this.unit.proneTarget = 0;
    } else if (keys.is(code, 'prone') && this.stack.usesCover) {
      this.unit.proneTarget = this.unit.proneTarget > 0.5 ? 0 : 1;
    }
    else if (keys.is(code, 'prevMember')) this.cycle(-1);
    else if (keys.is(code, 'nextMember')) this.cycle(1);
    else if (keys.is(code, 'sight')) this.toggleSight();
    else if (keys.is(code, 'rocket')) this.rocket();
    else if (keys.is(code, 'grenade')) this.grenade();
    else if (keys.is(code, 'vehicleSmoke')) {
      if (this.stack.usesCover || !this.stack.popSmoke(this.unit)) this.game.bus.emit('toast', this.stack.usesCover || !(this.stack.smokeLeft > 0) ? 'No smoke launchers' : 'Smoke launchers reloading');
    } else if (keys.is(code, 'binoculars')) this.toggleBinoculars();
  }

  /** Does the unit in hand carry what this action uses? (the touch buttons) */
  has(action) {
    const u = this.unit;
    const st = this.stack;
    if (!u) return false;
    if (action === 'rocket') return !!u.stats.atgm || (st.usesCover && u.stats.lightAT > 0);
    if (action === 'grenade') return st.usesCover && u.stats.grenades > 0;
    if (action === 'vehicleSmoke') return !st.usesCover && st.smokeLeft > 0;
    if (action === 'binoculars') return !!(st.stats.binoculars || st.stats.observer);
    return true;
  }

  /** F: the squad's light anti-tank rocket at the crosshair, or a vehicle's guided missile at the vehicle under it. */
  rocket() {
    const u = this.unit;
    const st = this.stack;
    const m = u.stats.atgm;
    const time = this.game.world.time;
    if (m) {
      const t = this.aimHit;
      if ((u.atgmLeft ??= m.count) <= 0) return this.game.bus.emit('toast', 'No missiles left');
      if (time < (u.atgmReady ?? 0)) return this.game.bus.emit('toast', 'Missile reloading');
      if (!t || t.stack.usesCover || u.pos.distanceTo(t.pos) > m.range) return this.game.bus.emit('toast', `Put the crosshair on a vehicle within ${m.range} m`);
      u.target = t;
      st.fireMissile(u, m);
      u.target = null;
      return;
    }
    if (!st.usesCover || !u.stats.lightAT) return this.game.bus.emit('toast', 'No anti-tank rockets');
    if ((st.lightAT ??= u.stats.lightAT) <= 0) return this.game.bus.emit('toast', 'No rockets left — the squad gets more after a lull');
    if (time < (st.nextLightAT ?? 0)) return;
    u.proneTarget = 0; // (you can't fire one lying down)
    st.fireLightAT(u, this.aimPoint);
    this.game.cameraManager.shake(0.05);
    this.game.bus.emit('toast', `Rocket away — ${st.lightAT} left`);
  }

  /** T: a hand grenade, lobbed at the crosshair (as far as a man can throw). */
  grenade() {
    const u = this.unit;
    if (!this.stack.usesCover || !u.stats.grenades) return this.game.bus.emit('toast', 'No grenades');
    if ((u.grenades ??= u.stats.grenades) <= 0) return this.game.bus.emit('toast', 'No grenades left — more after a lull');
    if (this.game.world.time < (u.nextGrenade ?? 0)) return;
    _aim.subVectors(this.aimPoint, u.pos).setY(0);
    const d = Math.min(GRENADE.range, Math.max(GRENADE.min, _aim.length()));
    _aim.setLength(d).add(u.pos);
    _aim.y = this.game.terrain.heightAt(_aim.x, _aim.z);
    this.stack.throwGrenade(u, _aim);
    u.nextGrenade = this.game.world.time + 2; // (your own arm: quicker than the AI's)
    this.game.bus.emit('toast', `Grenade! ${u.grenades} left`);
  }

  /** V: binoculars up (zoomed in) or down; with them up, a click calls a fire mission at the crosshair. */
  toggleBinoculars(on = !this.binos) {
    if (on && !(this.stack.stats.binoculars || this.stack.stats.observer)) return this.game.bus.emit('toast', 'Only observers, scouts and recon vehicles carry binoculars');
    this.binos = on;
    const cam = this.game.camera;
    if (on) this.fov ??= cam.fov;
    cam.fov = on ? this.fov / 4 : (this.fov ?? cam.fov);
    cam.updateProjectionMatrix();
    document.body.classList.toggle('binoculars', on);
    if (on) this.game.bus.emit('toast', 'Binoculars — click to call a fire mission on the spot, V to lower them');
  }

  /** Every gun of yours in range fires on the crosshair (core/Orders.js 'fireMission'). */
  callFire() {
    const g = this.game;
    if (g.world.time < (this.nextCall ?? 0)) return g.bus.emit('toast', `The guns are still firing — next call in ${Math.ceil(this.nextCall - g.world.time)} s`);
    const guns = g.world.stacksOf(this.stack.faction).filter((s) => g.mine(s) && s.units.some((u) => u.alive && u.stats.indirect));
    if (!guns.length) return g.bus.emit('toast', 'No mortars or guns to call on');
    this.nextCall = g.world.time + 15;
    g.orders.issue({ t: 'fireMission', s: guns.map((s) => s.id), x: Math.round(this.aimPoint.x), z: Math.round(this.aimPoint.z) });
  }

  /**
   * The sight this stack fights with at night: 'thermal' (its side's nightSight 0.85 or better —
   * the Abrams, the Bradleys), 'ir' (any lesser night sight: Pact infrared, scouts' goggles), or null.
   */
  sightKind(stack = this.stack) {
    const ns = stack?.stats.nightSight;
    const v = typeof ns === 'number' ? ns : ns?.[stack.faction];
    return !v ? null : v >= 0.85 ? 'thermal' : 'ir';
  }

  /** N: the sight on or off (render/babylon/sight.js). */
  toggleSight() {
    const kind = this.sightKind();
    if (!kind) return this.game.bus.emit('toast', `${this.stack.name} has no night sight`);
    if (!this.game.babylon) return this.game.bus.emit('toast', 'Sights need the default renderer');
    this.setSight(this.sight ? null : kind);
    this.game.bus.emit('toast', this.sight ? (this.sight === 'thermal' ? 'Thermal sight' : 'Night sight') : 'Sight off');
  }

  setSight(mode) {
    this.sight = mode;
    this.game.babylon?.setSight(mode);
    document.body.classList.toggle('sighting', !!mode);
  }

  /** Take over `unit` (default: the living member of `stack` nearest the stack's centre). */
  possess(stack, unit = null) {
    const candidates = stack.units.filter((m) => m.alive);
    if (!candidates.length) return false;
    unit ??= candidates.reduce((best, m) => (m.pos.distanceToSquared(stack.centroid) < best.pos.distanceToSquared(stack.centroid) ? m : best));
    if (this.unit && this.unit !== unit) this.detach();
    if (this.sight && this.stack !== stack) this.setSight(null); // another stack, another sight

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
    if (this.binos) this.toggleBinoculars(false);
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
    if (this.sight) this.setSight(null);
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
    const fwd = input.axis(keys.all('down'), keys.all('up'));
    const strafe = input.axis(keys.all('left'), keys.all('right'));
    _wish.set(0, 0, 0).addScaledVector(cam.flatForward(_f), fwd).addScaledVector(cam.right(_r), strafe);
    const sprint = infantry && keys.all('sprint').some((k) => input.isDown(k));
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
    const trigger = (input.locked || input.touch) && input.isMouseDown(0) && !game.ended;
    if (this.binos) { // binoculars up: a click is a fire mission, not a shot
      if (trigger && !this.calling) this.callFire();
      this.calling = trigger;
    } else if (ws.weapon === 'beam') {
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
    const range = this.binos ? 1500 : Math.max(this.unit.stats.range * 1.3, this.unit.stats.atgm?.range ?? 0, this.unit.stats.lightAT ? LAW.range : 0);
    const hit = game.world.raycast(camera.position, dir, enemyOf(this.stack.faction), range);
    this.aimHit = hit?.target ?? null; // (what's under the crosshair: the missile's target)
    let dist = hit ? hit.distance : range;
    const ground = game.terrain.raycast(camera.position, dir, dist, _aim);
    if (ground) dist = Math.min(dist, ground.distanceTo(camera.position));
    return out.copy(camera.position).addScaledVector(dir, dist);
  }
}
