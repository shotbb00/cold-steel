// Draws a stack with five InstancedMeshes per model variant (torso, arms + weapon, markings,
// thighs, shins) and poses every soldier procedurally each frame:
//   legs   – walk / run cycle with stride and knee lift from speed, a limp when wounded,
//            kneeling blend from crouch, a shuffle when turning on the spot, crawling prone
//   torso  – leans into a run, breathes, bobs, kicks back with recoil, flinches when hit
//   arms   – pivot at the shoulders: weapon up and aimed at the target's elevation, held at
//            low ready on the move, lowered and jiggled for a reload, chopping when digging,
//            pawing forward when crawling; muzzle climb on each shot
//   death  – one of three falls per soldier (backward, forward over the knees, sideways
//            crumple), then the body lies a while and sinks away
// Level of detail: every model is built twice, the full one and a light stand-in (units/geometry.js
// `lod`: half the segments, no small parts). Each frame every soldier is drawn by one of the two by
// his distance from the camera (setLodDistance — render/Quality.js; 0 = always the light one), the
// near ones packed at the front of the full meshes and the far ones of the light, so neither draws
// more instances than it shows.
// Specialists (type.specialist) can carry their own model (type.specialistModels), e.g. the
// MG gunner in a team of riflemen. Smoothed per-soldier pose state lives in typed arrays.
import * as THREE from 'three';
import { lerp, angleDelta, TAU } from '../core/math.js';
import { paintMaterial, WOODLAND } from './paint.js';
import { lod } from '../data/units/geometry.js';

const bodyMaterial = paintMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.05, roughness: 0.85 }), { colors: WOODLAND, scale: 15, wear: 0.18, surfaces: true }); // M81 blotches at their real size; cloth weave (soldierBody finish)
const FLASH = new THREE.Color(0.35, 0.3, 0.28); // hit: a dark jolt, not a glow
const glowMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
const modelCache = new Map();

const X_AXIS = new THREE.Vector3(1, 0, 0);
const ONE = new THREE.Vector3(1, 1, 1);
const WHITE = new THREE.Color(1, 1, 1);
const _root = new THREE.Matrix4();
const _local = new THREE.Matrix4();
const _shift = new THREE.Matrix4();
const _body = new THREE.Matrix4();
const _out = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

const CORPSE_TIME = 10; // seconds bodies stay before sinking away
const smooth = (cur, want, rate, dt) => cur + (want - cur) * Math.min(1, rate * dt);

let LOD_DISTANCE = 45;   // metres: soldiers farther from the camera are drawn by the light model
let LOD_CAMERA = null;
/** Distance beyond which soldiers use the light model (0: always), and the camera it's measured from. */
export function setLodDistance(d, camera = LOD_CAMERA) {
  LOD_DISTANCE = d;
  if (camera) LOD_CAMERA = camera;
}

/** The faction's model for a unit type (falls back to the type's first model); `low`: the light stand-in. */
export function modelFor(type, faction, specialist = false, low = false) {
  const models = specialist && type.specialistModels ? type.specialistModels : type.models;
  const key = `${type.id}:${faction}:${specialist && type.specialistModels ? 's' : 'b'}${low ? ':low' : ''}`;
  if (!modelCache.has(key)) {
    const build = models[faction] ?? Object.values(models)[0];
    lod.low = low;
    try {
      modelCache.set(key, build());
    } finally {
      lod.low = false;
    }
  }
  return modelCache.get(key);
}

/** One detail level's instanced meshes (torso, arms + weapon, markings, thighs, shins). */
class Level {
  constructor(model, n, scene, make) {
    this.torso = make(model.torso, bodyMaterial, n, scene, true);
    this.arms = model.arms ? make(model.arms, bodyMaterial, n, scene, true) : null;
    this.glow = make(model.glow, glowMaterial, n, scene, false);
    this.thigh = make(model.thigh, bodyMaterial, n * 2, scene, true);
    this.shin = make(model.shin, bodyMaterial, n * 2, scene, true);
    this.meshes = [this.torso, this.arms, this.glow, this.thigh, this.shin].filter(Boolean);
    this.n = 0;   // instances written this frame
  }

  /** Draw only the first n instances of every mesh. */
  setCount(n) {
    this.n = n;
    this.torso.count = this.glow.count = n;
    if (this.arms) this.arms.count = n;
    this.thigh.count = this.shin.count = n * 2;
  }
}

/** One model's two detail levels plus which stack members they draw. */
class Variant {
  constructor(model, low, members, scene, make) {
    this.rig = model.rig;
    this.muzzle = model.muzzle;
    this.members = members;
    const n = members.length;
    this.hi = new Level(model, n, scene, make);
    this.lo = new Level(low, n, scene, make);
    this.meshes = [...this.hi.meshes, ...this.lo.meshes];
  }
}

export class StackRenderer {
  constructor(stack, scene) {
    this.stack = stack;
    const type = stack.type;
    const n = stack.units.length;
    const nSpec = type.specialistModels ? Math.min(type.specialist?.count ?? 0, n) : 0;
    const all = stack.units.map((u) => u.index);
    const make = (...a) => this.make(...a);
    this.variants = [new Variant(modelFor(type, stack.faction), modelFor(type, stack.faction, false, true), all.slice(nSpec), scene, make)];
    if (nSpec) this.variants.push(new Variant(modelFor(type, stack.faction, true), modelFor(type, stack.faction, true, true), all.slice(0, nSpec), scene, make));
    this.variantOf = all.map((i) => this.variants[i < nSpec ? 1 : 0]);
    this.meshes = this.variants.flatMap((v) => v.meshes);
    // smoothed pose state per soldier
    this.armPitch = new Float32Array(n).fill(0.4);
    this.armYaw = new Float32Array(n);
    this.armRoll = new Float32Array(n);
    this.prevYaw = Float32Array.from(stack.units, (u) => u.yaw);
    this.turnPhase = new Float32Array(n);
    this.turnAmt = new Float32Array(n);
    this.done = false;
  }

  /** Muzzle offset (model space) for stack member i. */
  muzzleOf(i) {
    return this.variantOf[i]?.muzzle;
  }

  make(geo, mat, count, scene, shadow) {
    const m = new THREE.InstancedMesh(geo, mat, count);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false; // instances spread far beyond the base geometry's bounds
    m.castShadow = shadow;
    m.setColorAt(0, WHITE);  // allocate instanceColor before first render
    scene.add(m);
    return m;
  }

  update(dt, t) {
    if (this.done) return;
    let animating = false;
    for (const v of this.variants) if (this.updateVariant(v, dt, t)) animating = true;
    for (const mesh of this.meshes) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
    }
    if (!animating) this.done = true;
  }

  updateVariant(v, dt, t) {
    const { units, glowColor } = this.stack;
    const r = v.rig;
    const L1 = r.thighLen;
    const hipStand = r.hipY;
    const hipKneel = r.shinLen + 0.17 * L1 + 0.03; // front foot flat, back knee on the ground
    const shoulderY = r.shoulderY ?? 1.47;
    const idt = dt > 0 ? 1 / dt : 0;
    let animating = false;
    const cam = LOD_CAMERA?.position;
    const far2 = LOD_DISTANCE * LOD_DISTANCE;
    let nHi = 0;
    let nLo = 0;

    for (let m0 = 0; m0 < v.members.length; m0++) {
      const k = v.members[m0];
      const u = units[k];
      const far = LOD_DISTANCE <= 0 || (cam && (u.pos.x - cam.x) ** 2 + (u.pos.y - cam.y) ** 2 + (u.pos.z - cam.z) ** 2 > far2);
      const L = far ? v.lo : v.hi;
      const i = far ? nLo++ : nHi++;
      let tilt = 0;   // whole body pitch about the feet (prone, falls)
      let roll = 0;
      let sink = 0;
      let scale = 1;
      let c = 0;      // kneel blend
      let m = 0;      // leg motion amount
      let run = 0;
      const pr = u.prone;
      if (u.visible === false) scale = 0; // fog of war

      // turning on the spot: a little stepping shuffle
      const yawRate = Math.abs(angleDelta(this.prevYaw[k], u.yaw)) * idt;
      this.prevYaw[k] = u.yaw;
      const turning = u.alive && !u.moving && pr < 0.5 && yawRate > 0.9;
      this.turnAmt[k] = smooth(this.turnAmt[k], turning ? 1 : 0, 6, dt);
      if (this.turnAmt[k] > 0.01) this.turnPhase[k] += dt * 9;

      let deathStyle = 0;
      if (u.alive) {
        animating = true;
        c = u.crouch;
        run = u.run && u.gait > 0.5 ? 1 : 0;
        m = u.gait * (1 - pr * 0.6); // crawling: smaller leg motion
        tilt = pr * 1.45 - u.flinch * 0.22 * (1 - pr);
        if (pr > 0.5 && u.moving) roll = Math.sin(u.walkPhase) * 0.12 * pr; // crawl wriggle
      } else {
        u.deathTime += dt;
        deathStyle = Math.floor((u.phase / TAU) * 3) % 3;
        const fall = Math.min(1, u.deathTime / 0.6);
        const e = fall * fall * (3 - 2 * fall);
        if (pr > 0.5) tilt = pr * 1.5; // shot while prone stays down
        else if (deathStyle === 0) { tilt = -e * 1.42; c = Math.max(0, 0.35 - u.deathTime) ; }             // thrown back, legs straighten
        else if (deathStyle === 1) { c = Math.min(1, u.deathTime * 4); tilt = Math.max(0, (u.deathTime - 0.25) / 0.5) ** 1.5 * 1.45; tilt = Math.min(1.45, tilt); } // knees, then forward
        else { c = Math.min(1, u.deathTime * 3.5); roll = e * 1.35 * (u.index % 2 ? 1 : -1); tilt = e * 0.25; } // crumples sideways
        if (u.deathTime > CORPSE_TIME) sink = (u.deathTime - CORPSE_TIME) * 0.5;
        if (u.deathTime > CORPSE_TIME + 3) scale = 0; else animating = true;
      }

      _e.set(tilt, u.yaw, roll, 'YXZ');
      _root.compose(_p.set(u.pos.x, u.pos.y - sink + pr * 0.28, u.pos.z), _q.setFromEuler(_e), _s.setScalar(scale));

      // --- legs: rotation about local x, negative swings the foot forward
      const ph = u.walkPhase;
      const stride = 0.6 + run * 0.3;
      const limp = u.wounded ? 0.45 : 1;
      let sw = Math.sin(ph) * stride * m;
      const tA = this.turnAmt[k];
      if (tA > 0.01) sw += Math.sin(this.turnPhase[k]) * 0.3 * tA;
      let aL = sw;
      let aR = -sw * limp;
      const lift = 0.9 + run * 0.5;
      let bL = aL + Math.max(0, Math.sin(ph + 1.3)) * lift * m + (tA > 0.01 ? Math.max(0, Math.sin(this.turnPhase[k] + 1.3)) * 0.4 * tA : 0);
      let bR = aR + Math.max(0, Math.sin(ph + 1.3 + Math.PI)) * lift * m * limp;
      aL = lerp(aL, -1.35, c);
      bL = lerp(bL, -0.05, c);
      aR = lerp(aR, 0.2, c);
      bR = lerp(bR, 1.45, c);
      if (!u.alive && deathStyle !== 1) { aL -= 0.3; aR += 0.2; } // legs go loose
      const bob = Math.abs(Math.cos(ph)) * (0.035 + run * 0.04) * m;
      const hipY = lerp(hipStand, hipKneel, c) + bob;

      // --- torso: pivots at the hip
      const breathe = u.alive ? Math.sin(t * 1.7 + u.phase) * 0.012 : 0;
      // prone: the chest only a little up off the ground, propped on the elbows (~20°), not sitting up
      let lean = (0.07 * m + 0.22 * run + 0.2 * c + u.reloadAnim * 0.15 + (u.working ? 0.35 : 0)) * (1 - pr) - pr * 0.3;
      lean += breathe - u.recoil * 0.05;
      let twist = 0;
      let side = u.reloadAnim * Math.sin(t * 9 + u.phase) * 0.07;
      if (u.wounded && u.alive) side += Math.sin(ph) * 0.06 * m; // limping sway
      if (u.alive && pr < 0.5 && u.target) twist = -0.18; // bladed stance behind the weapon
      _e.set(lean, twist, side, 'XYZ');
      _local.compose(_p.set(0, hipY, 0), _q.setFromEuler(_e), ONE).multiply(_shift.makeTranslation(0, -hipStand, 0));
      _body.multiplyMatrices(_root, _local);
      L.torso.setMatrixAt(i, _body);
      L.glow.setMatrixAt(i, _body);

      // --- arms + weapon: pivot at the shoulders, relative to the torso
      if (L.arms) {
        const P = tilt + lean; // how far the torso is already pitched forward
        let wantPitch;
        let wantYaw = 0;
        let wantRoll = 0;
        const aiming = u.alive && (u.target || u.possessed || u.peekT > 0) && u.reloadT <= 0 && !u.working;
        if (!u.alive) {
          wantPitch = 1.2;
          wantRoll = 0.3;
        } else if (u.working) {
          wantPitch = 0.9 + Math.sin(t * 6 + u.phase) * 0.45; // digging, filling sandbags
        } else if (u.reloadT > 0) {
          wantPitch = 0.55 - P * 0.4 + Math.sin(t * 7 + u.phase) * 0.06;
          wantRoll = 0.25;
          wantYaw = 0.25;
        } else if (aiming) {
          // level the weapon against the body's own pitch, then raise it to the target
          let elev = 0;
          if (u.target) {
            const dx = u.target.pos.x - u.pos.x;
            const dz = u.target.pos.z - u.pos.z;
            elev = Math.atan2(u.target.pos.y + (u.target.aimHeight ?? 1) - (u.pos.y + shoulderY * (1 - pr * 0.75)), Math.hypot(dx, dz));
          } else if (u.possessed) elev = u.aimPitch ?? 0;
          wantPitch = -P - elev;
          wantYaw = -twist; // the weapon stays on the line of fire while the body blades
        } else if (pr > 0.5 && u.moving) {
          wantPitch = -P + 0.35 + Math.sin(ph * 2) * 0.3; // crawling, pawing forward
        } else if (u.moving) {
          wantPitch = 0.5 - P * 0.4 + Math.sin(ph) * 0.06 * m + run * 0.15; // low ready
          wantYaw = 0.35 + run * 0.15;
        } else if (pr > 0.5) {
          wantPitch = -P + 0.12 + breathe; // lying ready: the rifle out in front, along the ground
        } else {
          wantPitch = 0.35 - P * 0.5 + breathe * 2; // at ease, muzzle down
          wantYaw = 0.2;
        }
        const rate = aiming ? 10 : 5;
        this.armPitch[k] = smooth(this.armPitch[k], wantPitch, rate, dt);
        this.armYaw[k] = smooth(this.armYaw[k], wantYaw, rate, dt);
        this.armRoll[k] = smooth(this.armRoll[k], wantRoll, rate, dt);
        _e.set(this.armPitch[k] - u.recoil * 0.12 - u.flinch * 0.15, this.armYaw[k], this.armRoll[k], 'YXZ');
        _local.compose(_p.set(0, shoulderY, -u.recoil * 0.04), _q.setFromEuler(_e), ONE).multiply(_shift.makeTranslation(0, -shoulderY, 0));
        L.arms.setMatrixAt(i, _out.multiplyMatrices(_body, _local));
      }

      for (let sd = 0; sd < 2; sd++) {
        const sx = sd ? r.hipX : -r.hipX;
        const a = sd ? aR : aL;
        const b = sd ? bR : bL;
        _local.compose(_p.set(sx, hipY, 0), _q.setFromAxisAngle(X_AXIS, a), ONE);
        L.thigh.setMatrixAt(i * 2 + sd, _out.multiplyMatrices(_root, _local));
        _local.compose(_p.set(sx, hipY - L1 * Math.cos(a), -L1 * Math.sin(a)), _q.setFromAxisAngle(X_AXIS, b), ONE);
        L.shin.setMatrixAt(i * 2 + sd, _out.multiplyMatrices(_root, _local));
      }

      // Palette lives in the vertex colours; the instance colour adds personal tint and hit flash.
      _c.setScalar(u.tint);
      if (u.flash > 0) _c.lerp(FLASH, u.flash / 0.12);
      if (!u.alive) _c.multiplyScalar(0.55);
      L.torso.setColorAt(i, _c);
      L.arms?.setColorAt(i, _c);
      L.thigh.setColorAt(i * 2, _c);
      L.thigh.setColorAt(i * 2 + 1, _c);
      L.shin.setColorAt(i * 2, _c);
      L.shin.setColorAt(i * 2 + 1, _c);
      L.glow.setColorAt(i, _c.copy(glowColor).multiplyScalar(u.alive ? 1 : 0.5));
    }
    v.hi.setCount(nHi);
    v.lo.setCount(nLo);
    return animating;
  }

  dispose() {
    for (const mesh of this.meshes) {
      mesh.removeFromParent();
      mesh.dispose();
    }
  }
}
