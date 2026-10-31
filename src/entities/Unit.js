// One member of a stack (soldier or vehicle). Holds body, weapon, brain and animation
// state; UnitStack drives it each frame, ai/SoldierAI.js decides what it wants, a renderer
// in render/ draws it. Every member gets a small personality roll so no two behave alike.
import * as THREE from 'three';
import { TAU } from '../core/math.js';

export class Unit {
  constructor(stack, index, offset) {
    // Most members share the type's stats; specialists (e.g. an MG gunner) override some.
    const s = stack.unitStats(index);
    this.stats = s;
    this.specialist = s !== stack.stats;
    this.stack = stack;
    this.index = index;
    this.offset = offset; // formation slot: x = lateral, y = forward (metres)
    this.faction = stack.faction;

    // Combatant interface (what shots and AI see)
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.alive = true;
    this.maxHp = s.hp;
    this.hp = s.hp;
    this.radius = s.radius;
    this.height = s.height;       // shrinks while crouched or prone
    this.aimHeight = s.aimHeight;

    // Personality
    this.skill = 0.8 + Math.random() * 0.45;    // spread multiplier (lower = better shot)
    this.courage = 0.75 + Math.random() * 0.6;  // how soon a wounded soldier backs off
    this.speedMul = 0.92 + Math.random() * 0.16;
    this.tint = 0.88 + Math.random() * 0.2;

    // Brain
    this.dest = new THREE.Vector3();
    this.threat = null;
    this.coverSpot = null;
    this.atCover = false;
    this.run = false;
    this.thinkT = Math.random() * 0.5;
    this.coverSearchT = 0;
    this.stuckT = 0;       // seconds of trying to move without getting anywhere
    this.stuckN = 0;       // stuck spells in a row
    this.detourX = 0;
    this.detourZ = 0;
    this.ghostT = 0;       // seconds of squeezing through (collisions off) after being stuck a while
    this.wander = new THREE.Vector2();
    this.wanderT = 0;

    // Weapon
    this.target = null;
    this.retarget = Math.random() * 0.4;
    this.cooldown = Math.random() * s.fireCooldown;
    this.burstLeft = 0;
    this.burstTimer = 0;
    this.mag = s.magSize;
    this.reloadT = 0;
    this.peekT = 0;
    this.deployT = 0;      // seconds stationary — heavy weapons need to be set up
    this.fireRateMult = 1;
    this.damageMult = 1;

    // Body / animation
    this.suppression = 0;
    this.crouch = 0;
    this.prone = 0;        // 0 standing/crouched … 1 lying flat
    this.wantsMove = false;
    this.flinch = 0;
    this.flash = 0;
    this.reloadAnim = 0;
    this.yaw = stack.facing;
    this.aimYaw = stack.facing;
    this.moveYaw = stack.facing;
    this.moving = false;
    this.gait = 0;
    this.walkPhase = Math.random() * TAU;
    this.phase = Math.random() * TAU;
    this.deathTime = 0;
    this.woundedBarked = false;
    this.recoil = 0;
    this.alertYaw = 0;   // where the last incoming fire came from
    this.alertT = 0;
    this.turretYaw = stack.facing; // vehicles aim independently of their hull
    this.beam = null;              // active beam (unused for now)

    // Player control (systems/PlayerControl.js)
    this.visible = true;           // fog of war (systems/VisibilitySystem.js)
    this.revealT = 0;
    this.possessed = false;
    this.crouchTarget = 0;
    this.proneTarget = 0;
    this.spotted = true;           // seen by the enemy faction (both sides use the same rules)
    this.nearMiss = null;          // set while possessed: callback when a bolt just misses
  }

  get reloading() {
    return this.reloadT > 0;
  }

  get wounded() {
    return this.hp < this.maxHp * 0.35;
  }

  suppress(amount) {
    this.suppression = Math.min(1.5, this.suppression + amount);
  }

  /** A shot came from `from` (near miss or hit): look that way for a while. */
  alertFrom(from) {
    this.alertYaw = Math.atan2(from.x - this.pos.x, from.z - this.pos.z);
    this.alertT = 5;
  }

  receiveDamage(amount, source, pierce = 0, dir = null, vsArmor = 1) {
    this.stack.damageUnit(this, amount, source, pierce, dir, vsArmor);
  }
}
