// Continuous laser beams (walkers). A beam sweeps from where it started toward its aim at a
// limited turn rate, so it carves a line across the field; each frame it is traced against
// enemy bodies, cover and terrain, burns the first thing it touches (plus a small splash at
// the end point), and throws sparks and dust where it lands. AI beams aim at the unit's
// target; player beams follow the crosshair (`beam.aim`).
import * as THREE from 'three';
import { enemyOf } from '../data/factions.js';

const Z_AXIS = new THREE.Vector3(0, 0, 1);
const _want = new THREE.Vector3();
const _end = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _axis = new THREE.Vector3();
const _near = [];

export class BeamSystem {
  constructor(scene, world, effects) {
    this.scene = scene;
    this.world = world;
    this.effects = effects;
    this.audio = null;
    this.beams = [];
    this.geo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
    this.geo.rotateX(Math.PI / 2);
  }

  /** Start a beam from unit `u` of `stack`. Returns the beam (player code keeps it to steer). */
  start(u, stack, { player = false, aim = null } = {}) {
    const s = stack.stats;
    const color = stack.boltColor.clone();
    const mk = (c, opacity) => {
      const m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({
        color: c, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      m.frustumCulled = false;
      this.scene.add(m);
      return m;
    };
    const b = {
      u, stack, player, t: 0,
      duration: s.beamDuration, dps: s.dps, range: s.range, width: s.beamWidth, pierce: s.pierce ?? 0,
      turnRate: player ? 2.5 : s.beamTurnRate,
      origin: new THREE.Vector3(), dir: new THREE.Vector3(), aim: new THREE.Vector3(), length: 0,
      core: mk(new THREE.Color(1, 1, 1).lerp(color, 0.35).multiplyScalar(2.5), 0.95),
      glow: mk(color.clone().multiplyScalar(1.4), 0.3),
      color, fxT: 0, sound: null,
    };
    stack.muzzleWorld(u, b.origin);
    // AI beams open a little short of and beside the target, then sweep onto it.
    if (aim) b.aim.copy(aim);
    else if (u.target) {
      const t = u.target.pos;
      const side = (Math.random() - 0.5) * 14;
      b.aim.set(t.x + Math.cos(u.aimYaw) * side, t.y, t.z - Math.sin(u.aimYaw) * side)
        .lerp(b.origin, 0.12);
    } else b.aim.copy(b.origin).addScaledVector(new THREE.Vector3(Math.sin(u.turretYaw), -0.1, Math.cos(u.turretYaw)), 50);
    b.dir.subVectors(b.aim, b.origin).normalize();
    u.revealT = 4; // a beam is impossible to miss
    b.sound = this.audio?.loop(`${stack.faction}.beam`, b.origin, 0.8) ?? null;
    u.beam = b;
    this.beams.push(b);
    return b;
  }

  stop(b) {
    b.t = b.duration;
  }

  update(dt) {
    const { terrain, cover } = this.world;
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      const u = b.u;
      b.t += dt;
      if (!u.alive || b.t >= b.duration) {
        this.remove(i);
        continue;
      }
      b.stack.muzzleWorld(u, b.origin);

      // steer toward the aim at a limited rate (the sweep)
      if (!b.player && u.target?.alive) {
        const tp = u.target.pos;
        _want.set(tp.x, tp.y + u.target.aimHeight * 0.6, tp.z);
        b.aim.lerp(_want, Math.min(1, dt * 1.5));
      }
      _want.subVectors(b.aim, b.origin).normalize();
      const angle = b.dir.angleTo(_want);
      if (angle > 1e-4) {
        const step = Math.min(1, (b.turnRate * dt) / angle);
        _axis.crossVectors(b.dir, _want).normalize();
        if (_axis.lengthSq() > 0.5) b.dir.applyQuaternion(_q.setFromAxisAngle(_axis, angle * step)).normalize();
      }

      // trace: terrain, cover, then bodies — the nearest wins
      let dist = b.range;
      const ground = terrain.raycast(b.origin, b.dir, dist, _hit);
      if (ground) dist = Math.min(dist, _hit.distanceTo(b.origin));
      _end.copy(b.origin).addScaledVector(b.dir, dist);
      const ct = cover.segmentHit(b.origin, _end);
      if (ct >= 0) dist *= ct;
      let victim = null;
      for (const e of this.world.combatants(enemyOf(b.stack.faction))) {
        if (!e.alive) continue;
        const cx = e.pos.x - b.origin.x;
        const cz = e.pos.z - b.origin.z;
        const tc = cx * b.dir.x + (e.pos.y + e.height * 0.5 - b.origin.y) * b.dir.y + cz * b.dir.z;
        if (tc < 0 || tc > dist) continue;
        const px = b.origin.x + b.dir.x * tc - e.pos.x;
        const pz = b.origin.z + b.dir.z * tc - e.pos.z;
        const py = b.origin.y + b.dir.y * tc;
        const r = e.radius + b.width;
        if (px * px + pz * pz > r * r || py < e.pos.y - 0.2 || py > e.pos.y + e.height) continue;
        dist = tc;
        victim = e;
      }
      _end.copy(b.origin).addScaledVector(b.dir, dist);
      b.length = dist;

      if (victim) {
        victim.receiveDamage(b.dps * dt, b.stack, b.pierce, b.dir);
        b.stack.noteHit();
      }
      // the burning end point scorches whatever stands around it
      const foe = enemyOf(b.stack.faction);
      for (const e of this.world.neighbors(_end, 3, _near)) {
        if (e === victim || e.faction !== foe || !e.alive) continue;
        const d = Math.hypot(e.pos.x - _end.x, e.pos.z - _end.z);
        if (d < 2.5) e.receiveDamage(b.dps * 0.35 * dt * (1 - d / 2.5), b.stack, b.pierce);
        e.suppress?.(dt * 1.5);
      }

      b.fxT -= dt;
      if (b.fxT <= 0) {
        b.fxT = 0.05;
        this.effects.impact(_end, b.color, 2.4);
        this.effects.dust(_end, 1.3);
      }

      // visuals: a bright core inside a soft glow, flickering in width
      const flick = 0.85 + Math.random() * 0.3;
      _q.setFromUnitVectors(Z_AXIS, b.dir);
      for (const [m, w] of [[b.core, b.width * flick], [b.glow, b.width * 4 * flick]]) {
        m.position.copy(b.origin).addScaledVector(b.dir, dist / 2);
        m.quaternion.copy(_q);
        m.scale.set(w, w, dist);
      }
      const fade = Math.min(1, b.t / 0.15, (b.duration - b.t) / 0.25);
      b.core.material.opacity = 0.95 * fade;
      b.glow.material.opacity = 0.3 * fade;
      b.sound?.setPos(_end.lerp(b.origin, 0.5));
    }
  }

  remove(i) {
    const b = this.beams[i];
    for (const m of [b.core, b.glow]) {
      m.removeFromParent();
      m.material.dispose();
    }
    b.sound?.stop();
    if (b.u.beam === b) b.u.beam = null;
    this.beams.splice(i, 1);
  }
}
