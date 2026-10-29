// Draws a stack with five InstancedMeshes per model variant (torso, arms + weapon, markings,
// thighs, shins) and poses every soldier procedurally each frame:
//   legs   – walk / run cycle with planted feet: the swing reaches as far as the body travels
//            per step (stats.stride), the knee folds while the leg swings through and gives a
//            little under the weight, the hip dips at double support (a walk) or floats (a
//            run, blended in smoothly); a limp when wounded, kneeling blend from crouch, a
//            shuffle when turning on the spot, and a leopard crawl prone — knees drawn up to
//            the side in turn, the body rolling onto the pushing leg
//   torso  – leans into a run, counter-twists against the stride, breathes, kicks back with
//            recoil, flinches when hit
//   arms   – pivot at the shoulders: weapon up and aimed at the target's elevation, held at
//            low ready on the move, a reload in steps (magazine out, the new one seated with a
//            knock, the charging handle racked, back up), chopping when digging, pawing forward
//            when crawling; muzzle climb on each shot
//   death  – one of three falls per soldier (backward, forward over the knees, sideways
//            crumple), then the body lies where it fell for the rest of the battle
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
const HALF_PI = Math.PI / 2;
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

const FALL_TIME = 2;    // seconds a body takes to fall; it then lies where it fell for the rest of the battle
const smooth = (cur, want, rate, dt) => cur + (want - cur) * Math.min(1, rate * dt);
const ease = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

/**
 * The weapon through a reload, q = 0..1 of the way: [pitch, yaw, roll] of the arms and how far
 * the head and shoulders bend over it. Down and canted to swap the magazine, a knock as the new
 * one seats, a jerk on the charging handle, then back up into the aim.
 */
function reloadPose(q) {
  const down = ease(q / 0.14) * (1 - ease((q - 0.82) / 0.18));
  const knock = Math.exp(-(((q - 0.5) / 0.035) ** 2));    // the magazine slapped home
  const rack = Math.exp(-(((q - 0.7) / 0.04) ** 2));      // charging handle back and let go
  const fumble = q > 0.18 && q < 0.45 ? Math.sin(q * 60) * 0.03 : 0;
  return [down * 0.6 - knock * 0.12 + fumble, down * 0.28 + rack * 0.16, down * (0.42 - ease((q - 0.6) / 0.1) * 0.2) - rack * 0.12, down * 0.14];
}

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
    this.glow = model.glow ? make(model.glow, glowMaterial, n, scene, false) : null; // markings on the torso, if any
    this.thigh = make(model.thigh, bodyMaterial, n * 2, scene, true);
    this.shin = make(model.shin, bodyMaterial, n * 2, scene, true);
    this.meshes = [this.torso, this.arms, this.glow, this.thigh, this.shin].filter(Boolean);
    this.n = 0;   // instances written this frame
  }

  /** Draw only the first n instances of every mesh. */
  setCount(n) {
    this.n = n;
    this.torso.count = n;
    if (this.glow) this.glow.count = n;
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
    this.runAmt = new Float32Array(n);
    this.crawlAmt = new Float32Array(n);
    this.reloadClock = new Float32Array(n);
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
    const legLen = L1 + r.shinLen;
    // swing that reaches as far as the body moves on one step, so the stance foot stays put
    const amp = Math.asin(Math.min(0.8, (this.stack.stats?.stride ?? 1.1) / (2 * legLen)));
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

      this.runAmt[k] = smooth(this.runAmt[k], u.run && u.gait > 0.5 ? 1 : 0, 4, dt);
      this.crawlAmt[k] = smooth(this.crawlAmt[k], u.alive && pr > 0.5 && u.moving ? 1 : 0, 5, dt);
      const cr = this.crawlAmt[k];
      this.reloadClock[k] = u.reloadT > 0 ? this.reloadClock[k] + dt : 0;

      let deathStyle = 0;
      if (u.alive) {
        animating = true;
        c = u.crouch;
        run = this.runAmt[k] * (1 - pr);
        m = Math.min(1, u.gait * 2.5) * (1 - pr) * (1 - c * 0.5); // walking; crawling has its own legs
        tilt = pr * 1.45 - u.flinch * 0.22 * (1 - pr);
        roll = Math.sin(u.walkPhase) * 0.16 * cr; // rolling onto the leg that pushes
      } else {
        u.deathTime += dt;
        deathStyle = Math.floor((u.phase / TAU) * 3) % 3;
        const fall = Math.min(1, u.deathTime / 0.6);
        const e = fall * fall * (3 - 2 * fall);
        if (pr > 0.5) tilt = pr * 1.5; // shot while prone stays down
        else if (deathStyle === 0) { tilt = -e * 1.42; c = Math.max(0, 0.35 - u.deathTime) ; }             // thrown back, legs straighten
        else if (deathStyle === 1) { c = Math.min(1, u.deathTime * 4); tilt = Math.max(0, (u.deathTime - 0.25) / 0.5) ** 1.5 * 1.45; tilt = Math.min(1.45, tilt); } // knees, then forward
        else { c = Math.min(1, u.deathTime * 3.5); roll = e * 1.35 * (u.index % 2 ? 1 : -1); tilt = e * 0.25; } // crumples sideways
        if (u.deathTime < FALL_TIME) animating = true;
      }

      _e.set(tilt, u.yaw, roll, 'YXZ');
      _root.compose(_p.set(u.pos.x, u.pos.y + pr * 0.28, u.pos.z), _q.setFromEuler(_e), _s.setScalar(scale));

      // --- legs: rotation about local x, negative swings the foot forward. Left leg at phase
      // ph, right at ph + π; a leg swings through while cos(phase) < 0 and stands on the
      // ground while cos(phase) > 0.
      const ph = u.walkPhase;
      const limp = u.wounded ? 0.45 : 1;
      const A = amp * (1 + run * 0.15);
      const sw = Math.sin(ph) * A * m;
      const swingL = Math.max(0, -Math.cos(ph));                 // 0..1..0 through the swing
      const swingR = Math.max(0, Math.cos(ph));
      const lift = 0.85 + run * 0.85;                              // the knee folds: a run kicks the heel up
      const give = 0.12 + run * 0.25;                              // ...and gives a little under the weight
      const tA = this.turnAmt[k];
      const shuffle = tA > 0.01 ? Math.sin(this.turnPhase[k]) * 0.3 * tA : 0;
      let aL = sw + shuffle;
      let aR = -sw * limp;
      let bL = aL + (swingL * lift + swingR * give) * m + (tA > 0.01 ? Math.max(0, Math.sin(this.turnPhase[k] + 1.3)) * 0.4 * tA : 0);
      let bR = aR + (swingR * lift + swingL * give) * m * limp;
      aL = lerp(aL, -1.35, c);
      bL = lerp(bL, -0.05, c);
      aR = lerp(aR, 0.2, c);
      bR = lerp(bR, 1.45, c);
      if (!u.alive && deathStyle !== 1) { aL -= 0.3; aR += 0.2; } // legs go loose
      // the hip: down a little with both feet on the ground (walk), up in the float (run)
      const spread = 1 - Math.cos(A * Math.sin(ph));
      const bob = (-0.5 * legLen * spread * (1 - run) + run * 0.07 * Math.abs(Math.sin(ph)) - give * 0.04 * Math.abs(Math.cos(ph))) * m;
      const hipY = lerp(hipStand, hipKneel, c) + bob;
      // leopard crawl: each knee drawn up beside the body in turn, the shin folded back
      const drawL = Math.max(0, Math.sin(ph)) * cr;
      const drawR = Math.max(0, -Math.sin(ph)) * cr;

      // --- torso: pivots at the hip
      const breathe = u.alive ? Math.sin(t * 1.7 + u.phase) * 0.012 : 0;
      // prone: the chest only a little up off the ground, propped on the elbows (~20°), not sitting up
      const rq = u.alive && u.reloadT > 0 ? reloadPose((this.reloadClock[k] / Math.max(0.5, u.stats.reloadTime ?? 2)) % 1) : null;
      let lean = (0.06 * m + 0.24 * run + 0.2 * c + (rq ? rq[3] : 0) + (u.working ? 0.35 : 0)) * (1 - pr) - pr * 0.3;
      lean += breathe - u.recoil * 0.05 + Math.cos(ph * 2) * 0.025 * run; // a run pumps with each stride
      let twist = -Math.sin(ph) * (0.07 + run * 0.06) * m;               // shoulders against the hips
      let side = Math.sin(ph) * 0.025 * m;                              // weight over the standing leg
      if (u.wounded && u.alive) side += Math.sin(ph) * 0.06 * m; // limping sway
      if (u.alive && pr < 0.5 && u.target) twist = -0.18; // bladed stance behind the weapon
      _e.set(lean, twist, side, 'XYZ');
      _local.compose(_p.set(0, hipY, 0), _q.setFromEuler(_e), ONE).multiply(_shift.makeTranslation(0, -hipStand, 0));
      _body.multiplyMatrices(_root, _local);
      L.torso.setMatrixAt(i, _body);
      L.glow?.setMatrixAt(i, _body);

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
        } else if (rq) {
          wantPitch = rq[0] - P * (0.4 + pr * 0.6) + 0.05;
          wantYaw = rq[1];
          wantRoll = rq[2];
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
        const rate = aiming ? 10 : rq ? 14 : 5;
        this.armPitch[k] = smooth(this.armPitch[k], wantPitch, rate, dt);
        this.armYaw[k] = smooth(this.armYaw[k], wantYaw, rate, dt);
        this.armRoll[k] = smooth(this.armRoll[k], wantRoll, rate, dt);
        _e.set(this.armPitch[k] - u.recoil * 0.12 - u.flinch * 0.15, this.armYaw[k], this.armRoll[k], 'YXZ');
        _local.compose(_p.set(0, shoulderY, -u.recoil * 0.04), _q.setFromEuler(_e), ONE).multiply(_shift.makeTranslation(0, -shoulderY, 0));
        L.arms.setMatrixAt(i, _out.multiplyMatrices(_body, _local));
      }

      for (let sd = 0; sd < 2; sd++) {
        const sx = sd ? r.hipX : -r.hipX;
        const out = sd ? 1 : -1;
        const draw = sd ? drawR : drawL;
        // crawling: the thigh swings out sideways along the ground and turns on its own axis so
        // the knee folds in that plane too
        const a = lerp(sd ? aR : aL, 0, cr);
        const knee = lerp((sd ? bR : bL) - (sd ? aR : aL), 0.25 + draw * 1.6, cr);
        _e.set(a, out * HALF_PI * cr, out * (0.12 + draw * 0.85) * cr, 'XZY');
        _local.compose(_p.set(sx, hipY, 0), _q.setFromEuler(_e), ONE);
        _body.multiplyMatrices(_root, _local);
        L.thigh.setMatrixAt(i * 2 + sd, _body);
        _local.compose(_p.set(0, -L1, 0), _q.setFromAxisAngle(X_AXIS, knee), ONE);
        L.shin.setMatrixAt(i * 2 + sd, _out.multiplyMatrices(_body, _local));
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
      L.glow?.setColorAt(i, _c.copy(glowColor).multiplyScalar(u.alive ? 1 : 0.5));
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
