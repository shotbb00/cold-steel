// Renderer for vehicles: each unit gets its own scene-graph rig built by the faction's model
// function (data/models/), sharing cached geometry. The rig animates itself (suspension,
// turret, recoil) from the unit's state; when knocked out it explodes, chars, burns and
// smokes for a while, and the wreck stays for the rest of the battle. Fighting vehicles often
// cook off: their ammunition goes up in pops and showers of sparks over the next half minute,
// sometimes ending in one big blast — anyone close by gets hurt.
//
// Model contract: build(mats) → { root, muzzle (Object3D), animate(u, dt, t, ctx), die?(time) }
//   mats: { body, glow }   ctx: { terrain, onStep(worldPos, size) }
import { epoch } from '../data/epoch.js';
import * as THREE from 'three';
import { paintMaterial, MERDC } from './paint.js';
import { compactRig, addImpostor } from './compactRig.js';

const materialCache = new Map();
const WRECK = new THREE.MeshStandardMaterial({ color: 0x2a2624, vertexColors: true, roughness: 1, metalness: 0 });
const DEAD_GLOW = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1 });
const COOK_OFF = { chance: 0.6, pops: [4, 11], first: [2, 6], gap: [0.6, 4], big: 0.35, hurt: 5 };
const rnd = ([a, b]) => a + Math.random() * (b - a);

// camouflage per army (parts with camo 1): MERDC for the US Army, the Bundeswehr's NATO three-tone
// of 1984 (bronze green, leather brown, tar black); the Pact armies paint plain green
const ARMY_CAMO = { bw: [0x3b4a2c, 0x4d3c2a, 0x1c1c1a, 0x3b4a2c] };
// 1945 (data/epoch.js): US olive drab and the Red Army's 4BO green, plain; the Germans' dark
// yellow with olive green and red-brown over it
const ARMY_CAMO_1945 = {
  us: [0x4d4f34, 0x4a4c31, 0x515337, 0x484a30],
  sov: [0x4a5a34, 0x475631, 0x4e5e37, 0x44532f],
  wh: [0x9a8a5a, 0x4f5a36, 0x5e3f2a, 0x9a8a5a],
  fj: [0x9a8a5a, 0x4f5a36, 0x5e3f2a, 0x9a8a5a],
};

function materialsFor(army, glowColor) {
  const key = `${epoch()}:${army}`; // (the 1985 and the 1945 US Army don't share a paint)
  if (!materialCache.has(key)) {
    const camo = epoch() === '1945' ? ARMY_CAMO_1945[army] : ARMY_CAMO[army];
    materialCache.set(key, {
      body: paintMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.25, roughness: 0.7 }), { colors: camo ?? MERDC, scale: 0.9, wear: 0.22, surfaces: true }),
      glow: new THREE.MeshStandardMaterial({ color: glowColor, roughness: 0.7 }), // markings
    });
  }
  return materialCache.get(key);
}

const _p = new THREE.Vector3();

const COMPACT = new Set(['cavalry', 'gun', 'wagon']);
const LOD_FAR = 90;  // m from the camera: a horse and rider beyond it is drawn as one piece, not animated (LOD_NEAR back)
const LOD_NEAR = 80;
/** A rig through its poses (render/compactRig.js): every gait, limbered and not, firing, traversed, set up, unloaded — what moves stays a part of its own. */
function probe(rig, u, look) {
  const base = { ...u, vel: { x: 0, z: 0 }, towing: false, recoil: 0, turretYaw: u.yaw, deployK: 0, dropped: false, laying: false, alive: true };
  const runs = [{ v: 1.5 }, { v: 4 }, { v: 6.5 }, { v: 11 }, { v: 0 }, { towing: true, v: 2 }, { towing: true, v: 5 }, { recoil: 1 }, { turretYaw: u.yaw + 0.3 }, { deployK: 1 }, { dropped: true }, { laying: true }];
  let t = 0;
  for (const r of runs) {
    const f = { ...base, ...r, vel: { x: r.v ?? 0, z: 0 } };
    for (let i = 0; i < 24; i++) rig.animate(f, 1 / 24, (t += 1 / 24), null);
    look();
  }
  for (let i = 0; i < 24; i++) rig.animate(base, 1 / 24, (t += 1 / 24), null); // (back at rest)
}

export class RigRenderer {
  constructor(stack, scene) {
    this.stack = stack;
    const build = stack.type.models[stack.army] ?? stack.type.models[stack.faction] ?? Object.values(stack.type.models)[0];
    this.build = build;
    this.scene = scene;
    // specialists (the first type.specialist.count members) may have a model of their own
    const special = stack.type.specialistModels?.[stack.army] ?? stack.type.specialistModels?.[stack.faction] ?? null;
    const specials = stack.type.specialist?.count ?? 0;
    this.mats = materialsFor(stack.army ?? stack.faction, stack.glowColor);
    // 1806 horse, gun, wagon: ~54 parts each — the still ones merged and shared (or phones give out), and a horse and rider a single piece from afar
    this.make = (fn, u) => {
      const rig = fn(this.mats);
      if (!COMPACT.has(stack.kind)) return rig;
      compactRig(rig, (look) => probe(rig, u, look));
      if (stack.kind === 'cavalry') addImpostor(rig);
      return rig;
    };
    this.rigs = stack.units.map((u) => {
      const rig = this.make(special && u.index < specials ? special : build, u);
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
      onHoof: (pos, gait) => { // 1806: a hoof set down — louder and dustier the faster
        const fast = gait === 'gallop' ? 1 : gait === 'canter' ? 0.75 : gait === 'trot' ? 0.55 : 0.32;
        if (fast < 0.7) s.audio?.play('hoof', pos, { volume: fast, rate: 0.95 + Math.random() * 0.1, throttle: 0.06 }); // (canter and gallop: the squadron's gallop recording, AudioSystem.updateHooves)
        if (fast > 0.7 && Math.random() < 0.25) s.effects.dust(pos, 0.5);
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
      if (u.alive && rig.dead) { // brought back (1806: a dismounted trooper caught a horse and remounted) — a fresh rig
        rig.root.removeFromParent();
        this.rigs[i] = this.make(this.build, u);
        this.rigs[i].root.position.copy(u.pos);
        this.scene.add(this.rigs[i].root);
        continue;
      }
      if (u.alive) {
        animating = true;
        rig.root.position.copy(u.pos);
        rig.root.rotation.y = u.yaw;
        if (rig.impostor) { // far off: the one-piece stand-in, nothing to animate
          const cam = this.stack.services.game?.camera?.position;
          const d = cam ? Math.hypot(cam.x - u.pos.x, cam.y - u.pos.y, cam.z - u.pos.z) : 0;
          const far = rig.impostor.visible ? d > LOD_NEAR : d > LOD_FAR;
          rig.impostor.visible = far;
          rig.detail.visible = !far;
          if (far) continue;
        }
        rig.animate(u, dt, t, this.ctx);
        continue;
      }
      if (rig.impostor?.visible) { rig.impostor.visible = false; rig.detail.visible = true; } // (the fall is the detailed rig's)
      if (!rig.dead && (this.stack.stats.cavalry || this.stack.stats.loose || this.stack.stats.gun || this.stack.stats.wagon)) { // 1806 horse and rider, a loose horse, gun and team: they fall (models/napCavalry.js, napGuns.js), nothing burns
        rig.dead = true;
        rig.fate = u.fate;
      } else if (!rig.dead) {
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
