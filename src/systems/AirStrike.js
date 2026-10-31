// Air support: the side spends command points to call a machine onto a spot and a heading;
// after a short radio delay it comes in from its own side of the map. Three kinds (KINDS):
//   heli – attack helicopter (data/air.ts AIRCRAFT: AH-1S Cobra / Mi-24 Hind), Y:
//          ingress → attack run: nose down, a rocket salvo on the approach, then the chin gun
//          walked along the strafe line through the target → break: turn away and climb, home.
//   jet  – ground-attack jet (JETS: A-10A / Su-25), J: much faster and from much further out,
//          missiles or a rocket salvo, then one long gun burst walked through the target, and
//          it pulls up and away. Hits hard, gone in seconds.
//   lift – air assault (LIFT: UH-60A / Mi-8), P: flies a squad to the spot, door guns firing
//          at anyone near the landing zone, touches down, the squad jumps out, it lifts off and
//          goes home. Shot down before it lands, the squad dies with it.
// Ground fire answers all of them: radar-directed SP anti-aircraft guns (data/units/aa.js) and
// missile air defence (manpads.js, sam.js — systems/AirStrike missile()) are the real threat;
// MG teams and tank machine guns add a little (visible tracers), rifles hardly at all; damaged,
// a machine aborts its run and trails smoke; enough hits and it goes down and crashes. Each
// side has a cooldown per kind. Used by the player (CommandSystem targeting) and the enemy
// director (before assaults, against dug-in troops).
import { JAM } from './Jamming.js';
import * as THREE from 'three';
import { AIRCRAFT, JETS, LIFT } from '../data/air.ts';
import { FACTIONS, enemyOf } from '../data/factions.js';
import { paintMaterial } from '../render/paint.js';
import { dist2DSq } from '../core/math.js';

/** Flight and cost parameters per kind. */
export const KINDS = {
  heli: {
    aircraft: AIRCRAFT,
    label: 'Strafing run',
    key: 'Y',
    cost: 150,
    cooldown: 90,      // seconds between runs per side
    delay: 5,          // seconds from the call until it appears
    approach: 420,     // metres out along the run line where it appears
    cruiseAlt: 34,     // metres above the ground
    attackAlt: 18,
    cruiseSpeed: 48,   // m/s
    attackSpeed: 34,
    rocketsFrom: 270,  // distance before the target where the salvo starts
    gunFrom: 190,      // …and the gun opens up
    gunTo: -25,        // …and stops (past the target)
    runLength: 60,     // metres of ground the gun walks across, centred on the target
    turn: 0.95,        // rad/s in the break
  },
  jet: {
    aircraft: JETS,
    label: 'Gun run',
    key: 'J',
    cost: 220,
    cooldown: 130,
    delay: 8,
    approach: 1500,
    cruiseAlt: 80,
    attackAlt: 42,
    cruiseSpeed: 130,
    attackSpeed: 112,
    rocketsFrom: 700,
    gunFrom: 430,
    gunTo: 200,        // the burst ends well short: the rounds are still flying
    runLength: 70,
    turn: 0,           // no turn: pull up and keep going
    pitchDown: 0.11,
  },
  lift: {
    aircraft: LIFT,
    label: 'Air assault',
    key: 'P',
    cost: 280,         // with the squad
    cooldown: 110,
    delay: 6,
    approach: 520,
    cruiseAlt: 30,
    attackAlt: 0,
    cruiseSpeed: 46,
    attackSpeed: 18,
    rocketsFrom: 300,
    gunFrom: 260,
    gunTo: 0,
    runLength: 0,
    turn: 0.8,
    hover: 4.5,        // seconds on the ground
  },
};
/** The helicopter run's parameters (older callers). */
export const AIR = KINDS.heli;
const GROUND_FIRE_RANGE = 150;

const _p = new THREE.Vector3();
const _d = new THREE.Vector3();
const _a = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const materials = {};

function materialsFor(kind, faction) {
  const key = `${kind}.${faction}`;
  if (!materials[key]) {
    const type = KINDS[kind].aircraft[faction];
    materials[key] = {
      body: paintMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.2, roughness: 0.65 }), { ...type.paint, wear: 0.2, surfaces: true }),
      glow: new THREE.MeshStandardMaterial({ color: FACTIONS[faction].marking, roughness: 0.7 }),
    };
  }
  return materials[key];
}

/** An aircraft model with its paint, as the sorties and the multiplayer client's copies use it. */
export function buildAircraft(kind, faction) {
  const rig = KINDS[kind].aircraft[faction].model(materialsFor(kind, faction));
  rig.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return rig;
}
export const buildHelicopter = (faction) => buildAircraft('heli', faction);

/** Spin rotors (helicopters) — jets have none. */
function spin(rig, type, dt, k = 1) {
  if (rig.rotor) rig.rotor.rotation.y += dt * type.rotorSpeed * k;
  if (rig.tailRotor) rig.tailRotor.rotation.x += dt * 70 * k;
}

const loopSound = (type) => type.rotorSound ?? type.engineSound;

const WRECK = new THREE.MeshStandardMaterial({ color: 0x1e1c1a, roughness: 1 });

/** Compass direction from `a` to `b`, in words ('from the north-east'): +z is north on our maps. */
function bearing(a, b) {
  const names = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  const k = Math.round(((Math.atan2(b.x - a.x, b.z - a.z) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
  return `from the ${names[k]}`;
}

class Sortie {
  constructor(game, faction, x, z, yaw, id, kind = 'heli', owner = null) {
    this.game = game;
    this.id = id;
    this.kind = kind;
    this.owner = owner;       // co-op: whose squad an air assault brings
    this.p = KINDS[kind];
    this.faction = faction;
    this.type = this.p.aircraft[faction];
    this.target = new THREE.Vector3(x, game.terrain.heightAt(x, z), z);
    this.yaw = yaw;
    this.dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    this.side = new THREE.Vector3(this.dir.z, 0, -this.dir.x);
    this.pos = this.target.clone().addScaledVector(this.dir, -this.p.approach);
    this.pos.y = game.terrain.heightAt(this.pos.x, this.pos.z) + this.p.cruiseAlt;
    this.appearAt = game.time + this.p.delay;
    this.state = 'inbound';   // inbound → ingress → attack (lift: land) → break → home | down → done
    this.hp = this.type.hp;
    this.rocketsLeft = this.type.rockets?.count ?? 0;
    this.rocketT = 0;
    this.gunT = 0;
    this.fireT = 0;
    this.turned = 0;
    this.turnSign = Math.random() < 0.5 ? 1 : -1;
    this.pitch = 0;
    this.roll = 0;
    this.speed = this.p.cruiseSpeed;
    this.homeT = 0;
    this.landT = 0;
  }

  /** Flying and visible to radar: everything between appearing and being shot down. */
  get airborne() {
    return this.state === 'ingress' || this.state === 'attack' || this.state === 'land' || this.state === 'break' || this.state === 'home';
  }

  /** For kill credit (systems/BattleStats.js). */
  get name() {
    return `${this.type.name} runs`;
  }

  /** For kill credit: what sort of support it was. */
  get label() {
    return this.p.label;
  }

  /** Current velocity (m/s), for anti-aircraft lead. */
  get velocity() {
    return (this._vel ??= new THREE.Vector3()).copy(this.dir).multiplyScalar(this.speed);
  }

  /** Distance still to go to the target along the run line (negative once past it). */
  get toGo() {
    return _d.subVectors(this.target, this.pos).setY(0).dot(this.dir);
  }

  spawn() {
    const rig = buildAircraft(this.kind, this.faction);
    this.rig = rig;
    this.game.scene.add(rig.root);
    this.loop = this.game.audio.loop(loopSound(this.type), this.pos, this.kind === 'jet' ? 1.3 : 0.9);
    this.state = 'ingress';
    const what = this.kind === 'lift' ? 'inbound with the assault squad' : 'on station — starting its run';
    this.game.tellBoth(this.faction, `${this.type.name} ${what}`, `Enemy ${this.type.name} inbound!`);
  }

  update(dt) {
    const game = this.game;
    if (this.state === 'inbound') {
      if (game.time >= this.appearAt) this.spawn();
      return;
    }
    if (this.state === 'done') return;
    if (this.state === 'down') return this.updateCrash(dt);
    const p = this.p;
    const terrain = game.terrain;
    const d = this.toGo;

    if (this.kind === 'lift') {
      if (this.state === 'ingress' && d < 140) this.state = 'attack';     // the approach: slowing, guns on the LZ
      if (this.state === 'attack' && d < 4) this.state = 'land';
    } else {
      if (this.state === 'ingress' && d < p.rocketsFrom + 40) this.state = 'attack';
      if (this.state === 'attack' && d < p.gunTo - 15) this.state = 'break';
    }

    // flight: speed, height and attitude by phase
    let alt = p.cruiseAlt;
    let wantSpeed = p.cruiseSpeed;
    let wantPitch = 0;
    let wantRoll = 0;
    if (this.state === 'attack' && this.kind === 'lift') {
      alt = 6 + Math.max(0, d) * 0.15;                      // flaring down into the LZ
      wantSpeed = Math.max(3, Math.min(p.cruiseSpeed, d * 0.35));
      wantPitch = -0.12;                                     // nose up, slowing
    } else if (this.state === 'land') {
      alt = 0.4;
      wantSpeed = 0;
      this.landT += dt;
      if (this.landT > 0.8 && !this.dropped) this.dropSquad();
      if (this.landT > p.hover) this.state = 'break';
    } else if (this.state === 'attack') {
      alt = p.attackAlt;
      wantSpeed = p.attackSpeed;
      wantPitch = p.pitchDown ?? 0.14;   // nose down onto the target
    } else if (this.state === 'break' || this.state === 'home') {
      alt = p.cruiseAlt + (this.kind === 'jet' ? 60 : 12);
      if (this.kind === 'lift') wantSpeed = p.cruiseSpeed;
      if (p.turn && this.turned < Math.PI) {
        const step = Math.min(Math.PI - this.turned, dt * p.turn);
        this.turned += step;
        this.yaw += step * this.turnSign;
        this.dir.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        wantRoll = -0.55 * this.turnSign;
      } else {
        this.state = 'home';
        this.homeT += dt;
        if (this.homeT > (this.kind === 'jet' ? 7 : 9)) return this.finish();
      }
      wantPitch = this.kind === 'jet' ? -0.25 : -0.08;
    }
    if (this.hp <= this.type.hp * 0.35 && (this.state === 'attack' || (this.kind === 'lift' && this.state === 'ingress'))) this.abort();
    this.speed += (wantSpeed - this.speed) * Math.min(1, dt * (this.kind === 'jet' ? 0.6 : 1.2));
    this.pos.addScaledVector(this.dir, this.speed * dt);
    const look = this.kind === 'jet' ? 120 : 40;
    const ground = Math.max(terrain.heightAt(this.pos.x, this.pos.z), this.state === 'land' ? -Infinity : terrain.heightAt(this.pos.x + this.dir.x * look, this.pos.z + this.dir.z * look));
    this.pos.y += (ground + alt - this.pos.y) * Math.min(1, dt * (this.state === 'land' ? 3 : 1.5));
    this.pitch += (wantPitch - this.pitch) * Math.min(1, dt * 2);
    this.roll += (wantRoll - this.roll) * Math.min(1, dt * 2);
    this.place(dt);

    if (this.state === 'attack' || this.state === 'land') {
      if (this.kind === 'lift') this.coverLZ(dt, d); else this.fireWeapons(dt, d);
    }
    this.fireT -= dt;
    const exposed = this.state === 'attack' || this.state === 'land' || (this.state === 'ingress' && d < p.rocketsFrom + 120);
    if (this.fireT <= 0 && exposed) {
      this.fireT = 0.25;
      this.groundFire();
    }
    if (this.hp < this.type.hp * 0.6) game.effects.trail(_p.copy(this.pos).addScaledVector(UP, 1.5), this.dir); // trailing smoke
  }

  place(dt) {
    const r = this.rig;
    r.root.position.copy(this.pos);
    r.root.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ');
    spin(r, this.type, dt);
    this.loop.setPos(this.pos);
  }

  fireWeapons(dt, d) {
    const game = this.game;
    const w = this.type;
    const p = this.p;
    // rockets / missiles: from the pods, spread over the target area
    if (this.rocketsLeft > 0 && d < p.rocketsFrom) {
      this.rocketT -= dt;
      if (this.rocketT <= 0) {
        this.rocketT = w.rockets.interval;
        const pod = this.rig.pods[this.rocketsLeft % this.rig.pods.length];
        pod.getWorldPosition(_p);
        const vehicle = w.rockets.vsArmor >= 1 ? this.vehicleNear(this.target, 45) : null; // Mavericks pick a vehicle
        if (vehicle) _a.set(vehicle.pos.x, vehicle.pos.y + 1, vehicle.pos.z);
        else {
          _a.copy(this.target).addScaledVector(this.dir, (Math.random() - 0.4) * 30).addScaledVector(this.side, (Math.random() - 0.5) * 18);
          _a.y = game.terrain.heightAt(_a.x, _a.z);
        }
        this.shoot(_p, _a, w.rockets, true, vehicle);
        game.effects.muzzle(_p, _d.subVectors(_a, _p).normalize(), 1, 'rocket');
        game.audio.play(w.rockets.sound ?? 'heli.rocket', _p, { volume: 0.7, throttle: 0.05 });
        this.rocketsLeft--;
      }
    }
    // gun: walked along the strafe line through the target
    if (d < p.gunFrom && d > p.gunTo) {
      if (this.kind === 'jet' && !this.brrrt) {
        this.brrrt = true;
        this.rig.gun.getWorldPosition(_p);
        game.audio.play(w.gun.sound, _p, { volume: 1 });
      }
      this.gunT -= dt;
      while (this.gunT <= 0) {
        this.gunT += 1 / w.gun.rate;
        const k = (p.gunFrom - d) / (p.gunFrom - p.gunTo);            // 0 → 1 across the run
        const along = (k - 0.5) * p.runLength;
        this.rig.gun.getWorldPosition(_p);
        _a.copy(this.target).addScaledVector(this.dir, along + (Math.random() - 0.5) * 4).addScaledVector(this.side, (Math.random() - 0.5) * 5);
        _a.y = game.terrain.heightAt(_a.x, _a.z) + 0.3;
        this.shoot(_p, _a, w.gun, Math.random() < w.gun.tracer);
        game.effects.muzzle(_p, _d.subVectors(_a, _p).normalize(), 1.2, 'rifle');
        if (this.kind !== 'jet') game.audio.play(w.gun.sound, _p, { volume: 0.75, throttle: 0.045 });
      }
    }
  }

  /** Air assault approach: door guns on whoever is near the landing zone, the Hip's rockets too. */
  coverLZ(dt, d) {
    const game = this.game;
    const w = this.type;
    const foe = this.enemyNear(this.target, 120);
    if (!foe) return;
    if (this.rocketsLeft > 0 && d > 60 && this.state === 'attack') {
      this.rocketT -= dt;
      if (this.rocketT <= 0) {
        this.rocketT = w.rockets.interval;
        const pod = this.rig.pods[this.rocketsLeft % this.rig.pods.length];
        pod.getWorldPosition(_p);
        _a.set(foe.pos.x + (Math.random() - 0.5) * 12, foe.pos.y, foe.pos.z + (Math.random() - 0.5) * 12);
        this.shoot(_p, _a, w.rockets, true);
        game.effects.muzzle(_p, _d.subVectors(_a, _p).normalize(), 1, 'rocket');
        game.audio.play('heli.rocket', _p, { volume: 0.7, throttle: 0.05 });
        this.rocketsLeft--;
      }
    }
    this.gunT -= dt;
    while (this.gunT <= 0) {
      this.gunT += 1 / w.gun.rate;
      this.rig.gun.getWorldPosition(_p);
      _a.set(foe.pos.x + (Math.random() - 0.5) * 3, foe.pos.y + 0.8, foe.pos.z + (Math.random() - 0.5) * 3);
      this.shoot(_p, _a, w.gun, Math.random() < w.gun.tracer);
      game.effects.muzzle(_p, _d.subVectors(_a, _p).normalize(), 0.8, 'rifle');
      game.audio.play(w.gun.sound, _p, { volume: 0.6, throttle: 0.06 });
    }
  }

  enemyNear(pos, r) {
    let best = null;
    let bestD = r * r;
    for (const e of this.game.world.combatants(enemyOf(this.faction))) {
      if (!e.alive || !e.spotted) continue;
      const d = dist2DSq(e.pos, pos);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  vehicleNear(pos, r) {
    let best = null;
    let bestD = r * r;
    for (const e of this.game.world.combatants(enemyOf(this.faction))) {
      if (!e.alive || !e.spotted || e.stack.usesCover) continue;
      const d = dist2DSq(e.pos, pos);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  /** Touchdown: the squad jumps out around the helicopter. */
  dropSquad() {
    const game = this.game;
    this.dropped = true;
    const was = game.currentOwner;
    game.currentOwner = this.owner;
    const s = game.spawnStack(this.type.squad, this.faction, { x: this.pos.x + this.side.x * 6, z: this.pos.z + this.side.z * 6 }, this.yaw);
    game.currentOwner = was;
    s.ai.moveTo({ x: this.target.x + this.dir.x * 14, z: this.target.z + this.dir.z * 14 }, { hold: true, ordered: false });
    game.tell(this.faction, `${s.name} on the ground`);
  }

  shoot(from, to, wp, tracer, guide = null) {
    _d.subVectors(to, from);
    const dist = _d.length();
    this.game.projectiles.spawn({
      origin: from, dir: _d.normalize(), speed: wp.speed, damage: wp.damage, faction: this.faction,
      color: new THREE.Color(FACTIONS[this.faction].bolt).multiplyScalar(2.4), size: wp.size ?? 1.2,
      source: this, life: dist / wp.speed + 0.6, splash: wp.splash, pierce: wp.pierce, vsArmor: wp.vsArmor,
      suppress: 2.5, tracer, trail: !!wp.count, guide,
    });
  }

  /**
   * Enemy troops under the run shoot back: a chance of a hit per shooter (MGs and tank coaxes
   * most, riflemen a little, pinned men hardly at all), with tracers flying up at it. A jet at
   * 400 km/h is a much harder target than a helicopter.
   */
  groundFire() {
    const game = this.game;
    const r2 = GROUND_FIRE_RANGE ** 2;
    const fast = this.kind === 'jet' ? 0.3 : 1;
    for (const s of game.world.stacksOf(enemyOf(this.faction))) {
      for (const u of s.units) {
        if (!u.alive) continue;
        const dx = u.pos.x - this.pos.x;
        const dz = u.pos.z - this.pos.z;
        if (dx * dx + dz * dz > r2) continue;
        const st = u.stats;
        if (st.antiAir) continue; // the AA guns and missiles have their own, aimed fire (UnitStack.engageAir)
        // what's left is small arms and coaxial MGs: MG teams a little, rifles hardly at all
        const p = (s.usesCover ? (st.burst > 1 ? 0.02 : 0.0015) : 0.012) * (1 - Math.min(0.9, u.suppression)) * fast;
        if (Math.random() < 0.35 && (st.burst > 1 || !s.usesCover)) this.tracerUp(u);
        if (Math.random() < p) this.hit();
      }
    }
  }

  tracerUp(u) {
    _p.set(u.pos.x, u.pos.y + 1.4, u.pos.z);
    _a.copy(this.pos).add(_d.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 8));
    _d.subVectors(_a, _p);
    const dist = _d.length();
    this.game.projectiles.spawn({
      origin: _p, dir: _d.normalize(), speed: 380, damage: 0, faction: u.faction,
      color: new THREE.Color(FACTIONS[u.faction].bolt).multiplyScalar(2.4), size: 0.6, source: null,
      life: dist / 380 + 0.4, tracer: true,
    });
    this.game.audio.play(`${u.faction}.mg`, _p, { volume: 0.45, throttle: 0.08 });
  }

  hit(n = 1) {
    if (!this.airborne) return;
    this.hp -= n;
    const game = this.game;
    game.effects.impact(this.pos, 'armor');
    game.audio.play('impact.armor', this.pos, { volume: 0.8, throttle: 0.1 });
    if (this.hp <= 0) this.shotDown();
  }

  abort() {
    this.state = 'break';
    this.game.tell(this.faction, this.kind === 'lift' ? `${this.type.name} hit — aborting the landing` : `${this.type.name} hit — aborting the run`);
  }

  shotDown() {
    this.state = 'down';
    this.fall = { vy: 0, spin: this.kind === 'jet' ? 0.6 : 2.5 + Math.random() * 2 };
    const lost = this.kind === 'lift' && !this.dropped ? ' — the squad aboard is lost' : '';
    this.game.tellBoth(this.faction, `${this.type.name} shot down!${lost}`, `Enemy ${this.type.name} shot down!`);
    this.game.bus.emit('heli:down', { faction: this.faction, name: this.type.name });
  }

  updateCrash(dt) {
    const game = this.game;
    const f = this.fall;
    f.vy -= 9.81 * dt;
    this.pos.addScaledVector(this.dir, this.speed * 0.6 * dt);
    this.pos.y += f.vy * dt;
    this.yaw += f.spin * dt;
    this.roll += dt * (this.kind === 'jet' ? 1.6 : 0.6);
    this.pitch += dt * 0.3;
    this.place(dt * 0.5);
    game.effects.trail(this.pos, this.dir);
    if (Math.random() < 0.5) game.effects.explosion(this.pos, 0.25, { ground: false, fire: 0.5 });
    const ground = game.terrain.heightAt(this.pos.x, this.pos.z);
    if (this.pos.y > ground + 0.5) return;
    this.pos.y = ground;
    game.effects.explosion(this.pos, 1.8, { ground: true, fire: 2 });
    game.effects.burn(this.pos, 50, 1.2);
    game.audio.play('explosion.big', this.pos, { volume: 1 });
    // the wreck itself is deadly to anyone it lands on
    for (const u of game.world.neighbors(this.pos, 8, [])) u.receiveDamage(400, null, 0.5, null, 0.5);
    this.finish(true);
  }

  finish(wreck = false) {
    this.state = 'done';
    this.loop.stop();
    if (!wreck) this.rig.root.removeFromParent();
    else this.rig.root.traverse((o) => { if (o.isMesh) o.material = WRECK; });
  }
}

/**
 * A multiplayer client's copy of a sortie: the host flies it; this one shows the aircraft
 * where the snapshots put it (net/NetClient.js), spins its rotors and plays its sound.
 * Same shape as a Sortie for the minimap and the AA turrets (faction, state, pos, target).
 */
export class SortieView {
  constructor(game, id, faction, x, z, yaw, kind = 'heli') {
    this.game = game;
    this.id = id;
    this.kind = kind;
    this.faction = faction;
    this.type = KINDS[kind].aircraft[faction];
    this.state = 'inbound';
    this.target = new THREE.Vector3(x, game.terrain.heightAt(x, z), z);
    this.pos = new THREE.Vector3();
    this.yaw = yaw;
    this.pitch = 0;
    this.roll = 0;
    this.rig = null;
  }

  get airborne() {
    return this.state === 'ingress' || this.state === 'attack' || this.state === 'land' || this.state === 'break' || this.state === 'home';
  }

  show(s, dt) {
    if (!this.rig) {
      this.rig = buildAircraft(this.kind, this.faction);
      this.game.scene.add(this.rig.root);
      this.loop = this.game.audio.loop(loopSound(this.type), this.pos, this.kind === 'jet' ? 1.3 : 0.9);
    }
    this.state = s.state;
    this.pos.set(s.x, s.y, s.z);
    this.yaw = s.yaw;
    this.pitch = s.pitch;
    this.roll = s.roll;
    const r = this.rig;
    r.root.position.copy(this.pos);
    r.root.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ');
    spin(r, this.type, dt, this.state === 'down' ? 0.5 : 1);
    this.loop.setPos(this.pos);
  }

  /** The host is done with it: gone home, or a wreck on the ground. */
  finish() {
    if (this.state === 'done') return;
    const wreck = this.state === 'down';
    this.state = 'done';
    this.loop?.stop();
    if (!this.rig) return;
    if (wreck) this.rig.root.traverse((o) => { if (o.isMesh) o.material = WRECK; });
    else this.rig.root.removeFromParent();
  }
}

/**
 * A surface-to-air missile in flight (MANPADS, Chaparral, Strela-10): the smoke trail chases
 * the aircraft; when it gets there it hits (a chance, `pk`) or is decoyed / misses.
 */
class Missile {
  constructor(game, from, target, faction, m) {
    this.game = game;
    this.target = target;
    this.m = m;
    this.pos = from.clone();
    this.dir = _d.subVectors(target.pos, from).normalize().clone();
    this.speed = m.speed ?? 260;
    this.age = 0;
    this.faction = faction;
    this.color = new THREE.Color(FACTIONS[faction].bolt).multiplyScalar(2.4);
    this.done = false;
  }

  update(dt) {
    const t = this.target;
    this.age += dt;
    _d.subVectors(t.pos, this.pos);
    const dist = _d.length();
    if (!t.airborne || this.age > 8) return this.burst(false);
    _d.divideScalar(dist || 1);
    this.dir.lerp(_d, Math.min(1, dt * 5)).normalize();
    this.pos.addScaledVector(this.dir, this.speed * dt);
    this.game.effects.trail(this.pos, this.dir);
    if (dist < this.speed * dt * 1.5 + 2) this.burst(Math.random() < this.m.pk * (t.kind === 'jet' ? 0.7 : 1));
  }

  burst(hit) {
    this.done = true;
    if (hit) {
      this.target.hit(this.m.hits ?? 4);
      this.game.effects.explosion(this.pos, 0.5, { ground: false, fire: 0.6 });
      this.game.audio.play('explosion.big', this.pos, { volume: 0.6 });
    } else if (this.target.airborne) {
      this.game.effects.explosion(this.pos.addScaledVector(this.dir, 10), 0.25, { ground: false, fire: 0.2 }); // self-destruct past it
    }
  }
}

export class AirStrike {
  constructor(game) {
    this.game = game;
    this.sorties = [];
    this.missiles = [];
    this.readyAt = {};
    this.nextId = 1;
    this.limit = {};   // modes can ration air support per side: { faction: calls left }
  }

  /** Cooldowns are kept per side and kind: 'nato' (the helicopter), 'nato.jet', 'nato.lift'. */
  key(faction, kind) {
    return kind === 'heli' ? faction : `${faction}.${kind}`;
  }

  ready(faction, kind = 'heli') {
    return this.game.time >= (this.readyAt[this.key(faction, kind)] ?? 0);
  }

  cooldownLeft(faction, kind = 'heli') {
    return Math.max(0, (this.readyAt[this.key(faction, kind)] ?? 0) - this.game.time);
  }

  /** The default heading: straight in from the side's own base toward (x, z). */
  defaultYaw(faction, x, z) {
    const base = this.game.world.bases?.[faction] ?? { x: 0, z: 0 };
    return Math.atan2(x - base.x, z - base.z);
  }

  /** Call air support of `kind` on (x, z), flown along `yaw` (default: from our base). True if accepted. */
  call(faction, x, z, yaw = null, kind = 'heli') {
    const game = this.game;
    const p = KINDS[kind] ?? KINDS.heli;
    const name = p.aircraft[faction].name;
    if (this.limit[faction] === 0) {
      game.tell(faction, 'No air support left');
      return false;
    }
    if (!this.ready(faction, kind)) {
      game.tell(faction, `${name} not ready (${Math.ceil(this.cooldownLeft(faction, kind))} s)`);
      return false;
    }
    if (!game.spend(faction, p.cost)) {
      game.tell(faction, `Not enough command points for the ${p.label.toLowerCase()} (${p.cost})`);
      return false;
    }
    this.readyAt[this.key(faction, kind)] = game.time + p.cooldown;
    if (this.limit[faction] > 0) this.limit[faction]--;
    const jam = game.jamming?.jammed(faction, x, z);
    if (jam) { // the request gets through garbled: late, and not quite where it was asked for
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * JAM.miss;
      x += Math.cos(a) * r;
      z += Math.sin(a) * r;
    }
    const heading = yaw ?? this.defaultYaw(faction, x, z);
    const sortie = new Sortie(game, faction, x, z, heading, this.nextId++, kind, game.currentOwner ?? null);
    if (jam) sortie.appearAt += JAM.delay;
    this.sorties.push(sortie);
    game.netEvent('air', sortie.id, faction, x, z, heading, kind);
    game.tell(faction, jam ? `Radio jammed — ${name} tasked, but late (${p.delay + JAM.delay} s) and off the mark` : `${name} tasked — on station in ${p.delay} s`);
    game.bus.emit('airstrike', { faction, x, z, kind });
    return true;
  }

  /** Is (x, z) under one of `faction`'s working air search radars (data/units/airRadar.ts)? */
  radarCovers(faction, pos) {
    for (const r of this.radars ?? []) {
      if (r.faction !== faction || !r.on) continue;
      if ((r.u.pos.x - pos.x) ** 2 + (r.u.pos.z - pos.z) ** 2 < r.cover * r.cover) return true;
    }
    return false;
  }

  /**
   * Air search radars: one works once it has stood still for `deploy` seconds (the antenna turns);
   * it reports every enemy aircraft that comes inside `detect` to its side, once per sortie.
   */
  updateRadars(dt) {
    const game = this.game;
    this.radarT = (this.radarT ?? 0) - dt;
    if (this.radarT <= 0 || !this.radars) {
      this.radarT = 1;
      const prev = new Map((this.radars ?? []).map((r) => [r.u, r]));
      this.radars = [];
      for (const s of game.world.stacks) {
        const R = s.stats.airRadar;
        if (!R || !s.alive) continue;
        for (const u of s.units) if (u.alive) this.radars.push(prev.get(u) ?? { u, faction: s.faction, cover: R.cover, detect: R.detect, deploy: R.deploy, still: 0, on: false });
      }
    }
    for (const r of this.radars) {
      // set up = stayed put (the idle shuffle of a metre or so doesn't count as moving off)
      const p = r.u.pos;
      if (!r.at || !r.u.alive || (p.x - r.at.x) ** 2 + (p.z - r.at.z) ** 2 > 2.5 * 2.5) { r.at = { x: p.x, z: p.z }; r.still = 0; }
      else r.still += dt;
      r.on = r.u.alive && r.still >= r.deploy && !game.jamming?.jammed(r.faction, r.u.pos.x, r.u.pos.z); // jammed: blind
      r.u.spinning = r.on;
      if (!r.on) continue;
      for (const s of this.sorties) {
        if (s.faction === r.faction || !s.airborne || s.warned?.[r.faction]) continue;
        if ((s.pos.x - r.u.pos.x) ** 2 + (s.pos.z - r.u.pos.z) ** 2 > r.detect * r.detect) continue;
        (s.warned ??= {})[r.faction] = true;
        const name = s.type?.name ?? 'aircraft';
        game.tell(r.faction, `Radar: enemy ${name} inbound — ${bearing(r.u.pos, s.pos)}`);
        game.bus.emit('radar:contact', { faction: r.faction, x: s.pos.x, z: s.pos.z });
      }
    }
  }

  /** The nearest airborne enemy aircraft (of `faction`'s enemies) within `range` of `pos`. */
  nearestThreat(faction, pos, range) {
    let best = null;
    let bestD = range * range;
    for (const s of this.sorties) {
      if (s.faction === faction || !s.airborne) continue;
      const d = (s.pos.x - pos.x) ** 2 + (s.pos.z - pos.z) ** 2;
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  /** Launch a surface-to-air missile from `from` at sortie `target` (data/units: antiAir.missile). */
  missile(from, target, faction, m) {
    this.missiles.push(new Missile(this.game, from, target, faction, m));
  }

  update(dt) {
    this.updateRadars(dt);
    for (let i = this.sorties.length - 1; i >= 0; i--) {
      const s = this.sorties[i];
      s.update(dt);
      if (s.state === 'done') this.sorties.splice(i, 1);
    }
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      this.missiles[i].update(dt);
      if (this.missiles[i].done) this.missiles.splice(i, 1);
    }
  }
}
