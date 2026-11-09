// Pooled rounds: bullets, tank shells, rockets and artillery shells. Each frame a round's
// swept segment is tested against enemy soldiers (vertical cylinders that shrink when they
// crouch), cover colliders and the terrain; the nearest hit wins. Rounds that fly close by,
// or smack into cover next to someone, suppress them — that's what keeps heads down.
// Only tracers are drawn (a thin glowing streak, one InstancedMesh); ball ammunition is
// invisible, as it is in life — you see its dust kicks. Rockets leave a smoke trail.
// Artillery shells (`gravity` > 0) fly real arcs, whistle as they come down, and may leave
// craters in the terrain.
// `cosmetic` (a multiplayer client): rounds fly, strike and burst exactly the same, but hurt and
// rattle nobody — the host decides hits, and its snapshots carry the result.
import { stampFoam } from '../world/SeaFoam.js';
import * as THREE from 'three';
import { enemyOf } from '../data/factions.js';

const MAX_BOLTS = 2048;
const NEAR_MISS = 1.8;     // metres from a soldier's centre that still rattles them
const FLARE_BURST = 70;    // metres above the aim point an illumination round bursts
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _seg = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _near = [];

export class ProjectileSystem {
  constructor(scene, world, effects) {
    this.world = world;
    this.effects = effects;

    const geo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    geo.rotateX(Math.PI / 2); // length along +z
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_BOLTS);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.setColorAt(0, new THREE.Color());
    this.mesh.count = 0;
    scene.add(this.mesh);

    this.pool = Array.from({ length: MAX_BOLTS }, () => ({
      pos: new THREE.Vector3(), prev: new THREE.Vector3(), dir: new THREE.Vector3(), color: new THREE.Color(),
      speed: 0, life: 0, damage: 0, size: 1, faction: null, source: null, ignore: null,
      vel: new THREE.Vector3(), target: new THREE.Vector3(), gravity: 0, age: 0, whistleAt: -1, crater: 0,
    }));
    this.free = this.pool.slice();
    this.active = [];
    this._target = null;
    this.cosmetic = false;
  }

  spawn({
    origin, dir, speed, damage, faction, color, size = 1, source = null, life = 1.8, ignore = null,
    splash = 0, pierce = 0, vsArmor = 1, suppress = 1, gravity = 0, target = null, whistleAt = -1, crater = 0,
    tracer = true, trail = false, smoke = false, guide = null, flare = false, ignite = null, through = 0, bounce = 0,
  }) {
    const b = this.free.pop();
    if (!b) return null;
    b.gravity = gravity;
    b.vel.copy(dir).multiplyScalar(speed);
    if (target) b.target.copy(target);
    b.whistleAt = whistleAt; // seconds after launch to play the incoming whistle at the target
    b.crater = crater;       // crater depth on ground impact
    b.ignite = ignite;       // chance it sets what it lands on burning (a flamethrower's fuel), else the blast's own
    b.age = 0;
    b.tracer = tracer; // drawn as a glowing streak
    b.smoke = smoke;   // a smoke round: lays a screen where it lands, no damage
    b.flare = flare;   // an illumination round: bursts at the top of its arc (systems/Flares.js)
    b.guide = guide;   // wire-guided missile: steers toward this unit, flying nap-of-the-earth
    b.trail = trail;   // rocket: smoke trail
    b.splash = splash;
    b.through = through;  // 1806 roundshot: men it goes on through after the first
    b.bounce = bounce;    // …and times it bounces off the ground and flies on
    b.hitSet = through ? (b.hitSet ?? new Set()) : null;
    b.hitSet?.clear();
    b.pierce = pierce;
    b.vsArmor = vsArmor;   // multiplier vs vehicles (small arms barely scratch armour)
    b.suppress = suppress; // how hard near misses rattle (MGs pin)
    b.pos.copy(origin);
    b.prev.copy(origin);
    (b.origin ??= new THREE.Vector3()).copy(origin);
    b.dir.copy(dir);
    b.color.copy(color);
    b.speed = speed;
    b.damage = damage;
    b.faction = faction;
    b.size = size;
    b.source = source;
    b.life = life;
    b.ignore = ignore;
    this.active.push(b);
    return b;
  }

  update(dt) {
    const { terrain, cover } = this.world;
    const active = this.active;
    for (let i = active.length - 1; i >= 0; i--) {
      const b = active[i];
      b.prev.copy(b.pos);
      if (b.gravity) {
        b.vel.y -= b.gravity * dt;
        b.pos.addScaledVector(b.vel, dt);
        b.dir.copy(b.vel).normalize();
      } else {
        if (b.guide) this.steer(b, dt);
        b.pos.addScaledVector(b.dir, b.speed * dt);
      }
      b.life -= dt;
      b.age += dt;
      if (b.trail) this.effects.trail(b.pos, b.dir);
      else if (b.ignite) this.effects.flame?.(b.pos, b.dir, b.age); // (a flamethrower: drawn as flame, not a tracer)
      const heavy = b.splash > 5; // howitzer / rocket artillery: a long tearing scream, heard farther
      if (b.whistleAt >= 0 && b.age >= b.whistleAt - (heavy ? 1.2 : 0)) {
        b.whistleAt = -1;
        // only heard by whoever is close to where it lands
        const d = this.audio ? this.audio.distanceTo(b.target) : Infinity;
        if (heavy && d < 160) this.audio.play('incoming.big', b.target, { volume: 0.8 * (1 - d / 190), throttle: 0.5 });
        else if (d < 70) this.audio.play(`incoming.${Math.floor(Math.random() * 3)}`, b.target, { volume: 0.4 * (1 - d / 90), throttle: 1.2 });
      }

      let dead = b.life <= 0;
      if (!dead && b.flare && b.vel.y < 0 && (b.pos.y < b.target.y + FLARE_BURST || Math.hypot(b.pos.x - b.target.x, b.pos.z - b.target.z) < 25)) {
        // coming down over the target: the time fuse bursts the star shell high above the aim
        // point, not at the top of the arc (that is halfway there) — the host makes the flare
        if (!this.cosmetic) this.flares?.add(b.target.x, b.target.y + FLARE_BURST, b.target.z);
        dead = true;
      } else if (!dead && b.smoke) {
        // smoke rounds don't hit anything: they burst on the ground (or cover) and lay a screen
        const gy = terrain.heightAt(b.pos.x, b.pos.z);
        if (b.pos.y <= gy + 0.3 || cover.segmentHit(b.prev, b.pos, b.ignore) >= 0) {
          if (!this.cosmetic) this.smoke?.add(b.pos.x, b.pos.z); // (the host sends the client its screens)
          if (!this.cosmetic) this.fire?.ignite(b.pos.x, b.pos.z, 0.15); // white phosphorus may set the grass alight
          dead = true;
        }
      } else if (!dead) {
        const unitT = this.collideUnits(b);
        const coverT = cover.segmentHit(b.prev, b.pos, b.ignore);
        if (unitT >= 0 && (coverT < 0 || unitT <= coverT)) {
          const target = this._target;
          if (!this.cosmetic) {
            target.alertFrom?.(b.origin ?? b.prev);
            target.receiveDamage(b.damage, b.source, b.pierce, b.dir, b.vsArmor);
            b.source?.noteHit?.();
          }
          const armored = target.stack && !target.stack.usesCover && !target.stack.stats.cavalry; // (1806 horses: flesh, not plate)
          if (!b.splash) {
            this.effects.impact(_hit, armored ? 'armor' : 'flesh');
            this.audio?.play(armored ? 'impact.armor' : 'impact.flesh', _hit, { volume: armored ? 0.6 : 0.4, throttle: 0.04 });
          }
          if (b.splash) this.detonate(b, _hit, target, !armored);
          if (b.through > 0 && !b.splash) { b.through--; b.hitSet.add(target); b.damage *= 0.85; } // (the ball ploughs on through the file)
          else dead = true;
        } else if (coverT >= 0) {
          _hit.copy(b.prev).lerp(b.pos, coverT);
          if (!b.splash) this.effects.impact(_hit, 'stone');
          this.audio?.play('impact.stone', _hit, { volume: 0.4, throttle: 0.04 });
          if (!b.splash && Math.random() < 0.04) this.audio?.play('ricochet', _hit, { volume: 0.25, throttle: 1.5 }); // now and then, not every burst
          this.suppressAround(_hit, b.faction, 2.2, 0.12 * b.suppress);
          if (b.splash) this.detonate(b, _hit, null);
          dead = true;
        } else {
          const sea = this.world.river?.sea ? this.world.river.level : -Infinity; // (the open sea: rounds burst at the surface, not on the sea floor)
          const ground = terrain.heightAt(b.pos.x, b.pos.z);
          const gy = Math.max(ground, sea);
          if (b.pos.y <= gy && gy === sea && ground < sea) {
            b.pos.y = sea;
            if ((b.splash || 0) >= 3) { // a warship's shell: the tall column, and its foam on the water
              this.effects.shellSplash?.(b.pos, b.splash);
              if (this.world.river.foam) stampFoam(this.world.river.foam, b.pos.x, b.pos.z, 6 + b.splash * 1.5, 230);
            } else this.effects.waterSplash?.(b.pos, Math.max(0.4, (b.splash || 1) / 4));
            if ((b.splash || 0) >= 3) this.audio?.play(b.splash >= 9 ? 'splash.big' : 'splash', b.pos, { volume: Math.min(1, 0.55 + b.splash / 20), throttle: 0.08 }); // (a shell short: the column going up)
            if (b.splash) this.detonate(b, b.pos, null, false, true);
            dead = true;
          } else if (b.pos.y <= gy) {
            b.pos.y = gy;
            if (!b.splash) this.effects.impact(b.pos, 'ground');
            this.audio?.play('impact.ground', b.pos, { volume: 0.35, throttle: 0.05 });
            this.suppressAround(b.pos, b.faction, 2.5, 0.1 * b.suppress);
            if (b.splash) this.detonate(b, b.pos, null);
            if (b.bounce > 0) { // the ball skips off the ground and flies on, lower and slower
              b.bounce--;
              b.vel.copy(b.dir).multiplyScalar(b.speed);
              b.vel.y = Math.abs(b.vel.y) * 0.4 + 1.5;
              b.vel.x *= 0.7; b.vel.z *= 0.7;
              b.speed = b.vel.length();
              b.dir.copy(b.vel).normalize();
              b.gravity ||= 9.8;
              b.pos.y = gy + 0.05;
              this.effects.dust(b.pos, 0.8);
            } else dead = true;
          }
        }
      }
      if (dead) {
        active[i] = active[active.length - 1];
        active.pop();
        this.free.push(b);
      }
    }

    // Tracers: a streak as long as ~1/40 s of flight (never longer than the path flown so
    // far), very thin; rockets draw a short hot body instead.
    let k = 0;
    for (const b of active) {
      if (!b.tracer) continue;
      const flown = b.pos.distanceTo(b.origin);
      const len = b.trail ? 0.8 : Math.min(b.speed * 0.025 * (b.size > 1 ? 0.6 : 1), flown);
      if (len < 0.05) continue;
      const thick = b.trail ? 0.09 : 0.02 + 0.02 * b.size;
      _q.setFromUnitVectors(Z_AXIS, b.dir);
      _p.copy(b.pos).addScaledVector(b.dir, -len / 2);
      _m.compose(_p, _q, _s.set(thick, thick, len));
      this.mesh.setMatrixAt(k, _m);
      this.mesh.setColorAt(k, b.color);
      k++;
    }
    this.mesh.count = k;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }

  /**
   * Wire guidance: turn toward the target's current position (gunner keeping the crosshair on
   * it), and hold a metre or more above the ground in between so a crest doesn't eat it.
   */
  steer(b, dt) {
    const t = b.guide;
    if (!t.alive) { b.guide = null; return; }
    _seg.set(t.pos.x - b.pos.x, t.pos.y + t.aimHeight - b.pos.y, t.pos.z - b.pos.z);
    const dist = _seg.length();
    if (dist < 1) return;
    _seg.divideScalar(dist);
    const ahead = Math.min(dist, b.speed * 0.6);
    const floor = this.world.terrain.heightAt(b.pos.x + b.dir.x * ahead, b.pos.z + b.dir.z * ahead) + 1.2;
    if (dist > 25 && b.pos.y + _seg.y * ahead < floor) _seg.y += (floor - b.pos.y) / ahead; // pop over the crest
    b.dir.lerp(_seg, Math.min(1, dt * 3)).normalize();
  }

  /**
   * Swept test of this frame's segment against enemy combatants. Returns the hit's t along
   * the segment (and sets this._target / _hit) or -1. Near misses add suppression.
   */
  collideUnits(b) {
    const targets = this.world.combatants(enemyOf(b.faction));
    _seg.subVectors(b.pos, b.prev);
    const segLen2 = _seg.lengthSq() || 1e-6;
    const reach = Math.sqrt(segLen2) + NEAR_MISS + 1;
    let bestT = -1;

    for (const t of targets) {
      if (!t.alive || b.hitSet?.has(t) || (t.depth ?? 0) > 2) continue; // (a submarine under the surface: the water takes the shell)
      const cx = t.pos.x;
      const cz = t.pos.z;
      if (Math.abs(b.pos.x - cx) > reach || Math.abs(b.pos.z - cz) > reach) continue;

      const cy = t.pos.y + t.height * 0.5;
      const u = Math.max(0, Math.min(1,
        ((cx - b.prev.x) * _seg.x + (cy - b.prev.y) * _seg.y + (cz - b.prev.z) * _seg.z) / segLen2));
      const px = b.prev.x + _seg.x * u;
      const py = b.prev.y + _seg.y * u;
      const pz = b.prev.z + _seg.z * u;
      const dx = px - cx;
      const dz = pz - cz;
      const r = t.radius + 0.08 * b.size;
      if (dx * dx + dz * dz <= r * r && py >= t.pos.y && py <= t.pos.y + t.height) {
        if (bestT < 0 || u < bestT) {
          bestT = u;
          this._target = t;
          _hit.set(px, py, pz);
        }
      } else if (!this.cosmetic && dx * dx + dz * dz + (py - cy) ** 2 < NEAR_MISS * NEAR_MISS) {
        t.suppress?.(0.08 * b.suppress);
        t.alertFrom?.(b.origin ?? b.prev);
        t.nearMiss?.();
      }
    }
    return bestT;
  }

  /** Shell burst: falloff damage to enemies around the impact (the direct-hit target excluded). */
  detonate(b, point, directTarget, ground = true, water = false) {
    const foe = enemyOf(b.faction);
    const r = b.splash;
    if (!this.cosmetic) {
      for (const u of this.world.neighbors(point, r + 3, _near)) {
        if (u === directTarget || u.faction !== foe || !u.alive) continue;
        const d = Math.hypot(u.pos.x - point.x, u.pos.y + u.height * 0.4 - point.y, u.pos.z - point.z) - u.radius;
        if (d > r) continue;
        u.receiveDamage(b.damage * 0.75 * (1 - Math.max(0, d) / r), b.source, b.pierce, null, b.vsArmor);
      }
      this.suppressAround(point, b.faction, r * 2.2, 0.6);
      this.buildings?.blast(point, b.damage, r);
    }
    if (water) return; // (in the sea: the splash is all there is to see)
    if (b.ignite) { // a flamethrower's fuel: it burns where it lands, nothing goes bang
      this.effects.flameSplash?.(point);
      if (!this.cosmetic && Math.abs(point.y - this.world.terrain.heightAt(point.x, point.z)) < 1.5) this.fire?.ignite(point.x, point.z, b.ignite);
      return;
    }
    const size = Math.max(0.5, r / 3.5); // tank round / rocket ~1, 155 mm ~2
    // earth is thrown up only where it bursts on the earth; a hedge, tree or wall top hit in the air
    // makes a grey puff, and only a vehicle hit the black smoke of something burning
    const low = Math.abs(point.y - this.world.terrain.heightAt(point.x, point.z)) < 1.5;
    this.effects.explosion(point, size, { ground: ground && low, soot: !ground && !!directTarget });
    if (b.crater && Math.abs(point.y - this.world.terrain.heightAt(point.x, point.z)) < 1.5) {
      const cr = r * 0.45;
      this.world.terrain.dig(point.x, point.z, cr + 1, b.crater, (x, z) => Math.max(0, 1 - Math.hypot(x - point.x, z - point.z) / cr) ** 1.5, 0.9);
      if (!this.cosmetic && b.crater >= 0.3) this.onCrater?.(point, r, b.crater); // trees down, crater cover (GameEngine.blastTerrain)
    }
    const onGround = Math.abs(point.y - this.world.terrain.heightAt(point.x, point.z)) < 1.5;
    if (onGround && size >= 0.8) {
      const t = this.world.terrain;
      t.scorch(point.x, point.z, Math.max(r * 0.7 + 1, t.cell * 1.6), 0.55); // the blast leaves a black mark — for the rest of the battle (at least a ground cell and a half: on the big maps it was a dot)
      if (size >= 1.3) this.effects.smoulder?.({ x: point.x, y: t.heightAt(point.x, point.z), z: point.z }, 25 + Math.random() * 20, Math.min(2, size * 0.8)); // a big one smoulders a while
    }
    if (onGround && !this.cosmetic) this.fire?.ignite(point.x, point.z, b.ignite ?? 0.045 * size); // dry grass may catch — now and then (was 0.18: a salvo set the field alight; flame rounds bring their own b.ignite)
    // small HE (autocannon rounds) pops quieter and runs together: a burst of them mustn't flood the mix
    this.audio?.play(size > 1.5 ? 'explosion.big' : 'explosion', point, size < 0.8 ? { volume: 0.5, throttle: 0.12 } : { volume: 0.75, throttle: 0.05 });
    if (this.cameraManager && this.audio && size > 0.9) { // the ground shakes under the camera
      const d = this.audio.distanceTo(point);
      const reach = 35 * size;
      if (d < reach) this.cameraManager.shake(0.07 * size * (1 - d / reach));
    }
  }

  /** Impacts near enemies of the shooter make them flinch and duck. */
  suppressAround(point, boltFaction, radius, amount) {
    if (this.cosmetic) return;
    const foe = enemyOf(boltFaction);
    for (const u of this.world.neighbors(point, radius, _near)) {
      if (u.faction === foe && u.suppress) u.suppress(amount);
    }
  }
}
