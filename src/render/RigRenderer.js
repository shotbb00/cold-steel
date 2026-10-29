// Renderer for vehicles: each unit gets its own scene-graph rig built by the faction's model
// function (data/models/), sharing cached geometry. The rig animates itself (suspension,
// turret, recoil) from the unit's state; when knocked out it explodes, chars, burns and
// smokes for a while, and the wreck stays for the rest of the battle. Fighting vehicles often
// cook off: their ammunition goes up in pops and showers of sparks over the next half minute,
// sometimes ending in one big blast — anyone close by gets hurt.
//
// Model contract: build(mats) → { root, muzzle (Object3D), animate(u, dt, t, ctx), die?(time) }
//   mats: { body, glow }   ctx: { terrain, onStep(worldPos, size) }
import * as THREE from 'three';
import { paintMaterial, MERDC } from './paint.js';

const materialCache = new Map();
const WRECK = new THREE.MeshStandardMaterial({ color: 0x2a2624, vertexColors: true, roughness: 1, metalness: 0 });
const DEAD_GLOW = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1 });
const COOK_OFF = { chance: 0.6, pops: [4, 11], first: [2, 6], gap: [0.6, 4], big: 0.35, hurt: 5 };
const rnd = ([a, b]) => a + Math.random() * (b - a);

function materialsFor(faction, glowColor) {
  if (!materialCache.has(faction)) {
    materialCache.set(faction, {
      body: paintMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.25, roughness: 0.7 }), { colors: MERDC, scale: 0.9, wear: 0.22, surfaces: true }),
      glow: new THREE.MeshStandardMaterial({ color: glowColor, roughness: 0.7 }), // markings
    });
  }
  return materialCache.get(faction);
}

const _p = new THREE.Vector3();

export class RigRenderer {
  constructor(stack, scene) {
    this.stack = stack;
    const build = stack.type.models[stack.faction] ?? Object.values(stack.type.models)[0];
    // specialists (the first type.specialist.count members) may have a model of their own
    const special = stack.type.specialistModels?.[stack.faction] ?? null;
    const specials = stack.type.specialist?.count ?? 0;
    this.mats = materialsFor(stack.faction, stack.glowColor);
    this.rigs = stack.units.map((u) => {
      const rig = (special && u.index < specials ? special : build)(this.mats);
      rig.root.position.copy(u.pos);
      rig.root.rotation.y = u.yaw;
      scene.add(rig.root);
      return rig;
    });
    const s = stack.services;
    this.ctx = {
      terrain: stack.world.terrain,
      onStep: (pos, size = 1) => {
        s.effects.dust(pos, 1.6 * size);
        s.audio?.play('stomp', pos, { volume: 0.8 * size, throttle: 0.05 });
      },
    };
    this.done = false;
  }

  muzzleWorld(u, out) {
    return this.rigs[u.index].muzzle.getWorldPosition(out);
  }

  update(dt, t) {
    if (this.done) return;
    let animating = false;
    const units = this.stack.units;
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      const rig = this.rigs[i];
      rig.root.visible = u.visible !== false || rig.dead;
      if (u.alive) {
        animating = true;
        rig.root.position.copy(u.pos);
        rig.root.rotation.y = u.yaw;
        rig.animate(u, dt, t, this.ctx);
        continue;
      }
      if (!rig.dead) {
        rig.dead = true;
        rig.root.traverse((o) => {
          if (o.isMesh) o.material = o.material === this.mats.glow ? DEAD_GLOW : WRECK;
        });
        const s = this.stack.services;
        rig.root.getWorldPosition(_p);
        _p.y += this.stack.stats.height * 0.4;
        s.effects.explosion(_p, 1.4, { ground: false, fire: 2 });
        s.effects.burn(_p, 45 + Math.random() * 30, 1);
        s.audio?.play('explosion.big', _p, { volume: 0.8 });
        this.stack.world.terrain.scorch(_p.x, _p.z, this.stack.stats.radius * 1.8 + 1.5, 0.7);
        if (!s.game?.net?.isClient) s.game?.fire?.ignite(_p.x, _p.z, 0.5);
        const armed = this.stack.stats.weapon && this.stack.type.role !== 'support' && !this.stack.stats.structure;
        if (armed && Math.random() < COOK_OFF.chance) rig.cook = { next: rnd(COOK_OFF.first), left: Math.round(rnd(COOK_OFF.pops)), big: Math.random() < COOK_OFF.big };
      }
      if (rig.cook) this.cookOff(rig, dt);
      u.deathTime += dt;
      rig.die?.(u.deathTime, dt);
      if (u.deathTime < 6 || rig.cook) animating = true;
    }
    if (!animating) this.done = true;
  }

  /** The ammunition going up in a knocked-out wreck: pops, sparks, sometimes a last big blast. */
  cookOff(rig, dt) {
    const c = rig.cook;
    c.next -= dt;
    if (c.next > 0) return;
    const s = this.stack.services;
    rig.root.getWorldPosition(_p);
    _p.y += this.stack.stats.height * 0.6;
    c.left--;
    const last = c.left <= 0;
    const big = last && c.big;
    s.effects.explosion(_p, big ? 1.8 : 0.3 + Math.random() * 0.3, { ground: false, fire: big ? 2 : 1.4 });
    for (let i = 0; i < (big ? 30 : 10); i++) { // rounds and fragments flying out
      s.effects.fire.spawn(_p.x, _p.y, _p.z, {
        vx: (Math.random() - 0.5) * 14, vy: 4 + Math.random() * 12, vz: (Math.random() - 0.5) * 14, size: 0.12 + Math.random() * 0.12,
        grow: 0, life: 0.5 + Math.random() * 0.7, color: 0xffb347, bright: 3, drag: 0.4, gravity: 9,
      });
    }
    s.audio?.play(big ? 'explosion.big' : Math.random() < 0.5 ? 'explosion' : 'impact.armor', _p, { volume: big ? 1 : 0.45, throttle: 0.05 });
    if (big) s.effects.burn(_p, 60, 1.4);
    if (!s.game?.net?.isClient) { // the host hurts whoever stands too close
      const r = big ? COOK_OFF.hurt * 2 : COOK_OFF.hurt;
      for (const o of this.stack.world.neighbors(_p, r, [])) {
        if (o.alive && o.stack !== this.stack) o.receiveDamage((big ? 160 : 35) * (1 - Math.hypot(o.pos.x - _p.x, o.pos.z - _p.z) / r), null, 0.1, null, 0.3);
      }
    }
    if (last) rig.cook = null;
    else c.next = rnd(COOK_OFF.gap);
  }

  dispose() {
    for (const rig of this.rigs) rig.root.removeFromParent();
  }
}
