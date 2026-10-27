// Renderer for vehicles: each unit gets its own scene-graph rig built by the faction's model
// function (data/models/), sharing cached geometry. The rig animates itself (suspension,
// turret, recoil) from the unit's state; when knocked out it explodes, chars, burns and
// smokes for a while, and much later sinks away.
//
// Model contract: build(mats) → { root, muzzle (Object3D), animate(u, dt, t, ctx), die?(time) }
//   mats: { body, glow }   ctx: { terrain, onStep(worldPos, size) }
import * as THREE from 'three';
import { paintMaterial, MERDC } from './paint.js';

const materialCache = new Map();
const WRECK = new THREE.MeshStandardMaterial({ color: 0x2a2624, vertexColors: true, roughness: 1, metalness: 0 });
const DEAD_GLOW = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1 });
const SINK_AFTER = 90; // seconds a wreck stays on the field

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
      }
      u.deathTime += dt;
      rig.die?.(u.deathTime, dt);
      if (u.deathTime > SINK_AFTER) rig.root.position.y -= dt * 0.6;
      if (u.deathTime < SINK_AFTER + 12) animating = true;
      else rig.root.visible = false;
    }
    if (!animating) this.done = true;
  }

  dispose() {
    for (const rig of this.rigs) rig.root.removeFromParent();
  }
}
