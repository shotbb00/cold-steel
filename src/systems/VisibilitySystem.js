// Spotting, symmetric for both sides, Gates of Hell style: short sight, and only inside each
// spotter's view cone (stats.fov, facing = body for infantry, turret for vehicles). A unit is
// `spotted` while any enemy can see it: in the cone, within sight range (bigger targets are
// seen from farther; crouched in cover 60 %, prone 45 %, moving 115 %), with a clear line of
// sight over the terrain. Outside the cone a spotter only notices what is very close
// (AWARE: peripheral vision and hearing). Firing gives a unit away for a few seconds to anyone
// in range, whichever way they face (muzzle flashes, the crack of the shot). Smoke screens
// (systems/Smoke.js) block all of it beyond the AWARE range.
// Light and weather (core/Conditions.js) scale every spotter's range: dusk, rain and fog
// shorten it, night halves it and more — except thermal sights, and except for targets standing
// under an illumination flare (systems/Flares.js). A muzzle flash still shows far in the dark.
// Woodland (maps with `woods(x, z)` → 0..1 density, e.g. the Thuringian Forest): looking
// through trees shortens the range — the more forest along the line, the closer a target has
// to be (WOODS_CUT at full density). Sampled from a grid built once.
// Units only shoot spotted enemies, so hidden, prone troops create real lulls.
// For the player: hidden enemies aren't drawn, labelled or orderable (`visible`), nor are
// spotted ones standing in the fog of war; their gunfire can still be heard.

import * as THREE from 'three';
const INTERVAL = 0.25;
const REVEAL_TIME = 3;     // seconds a shot keeps the shooter revealed
const AWARE = 12;          // metres: noticed this close in any direction, line of sight or not
const WOODS_CUT = 0.7;     // sight lost looking through solid forest
const WOODS_CELL = 6;      // metres per woods grid cell

const CONTACT_FADE = 45; // s a lost submarine contact stays marked

export class VisibilitySystem {
  constructor(game, playerFaction) {
    this.game = game;
    this.world = game.world;
    this.player = playerFaction;
    this.timer = 0;
    this.enabled = true;
    this.contacts = []; // lost submarine contacts: { x, z, at, ring } — where it was last found (fades out)
    const map = game.map;
    this.overwatch = !!map?.overwatch; // maps with a commanding height (Monte Kali): up to +50 % sight looking down
    if (map?.woods) {
      const half = map.size / 2;
      const n = Math.ceil(map.size / WOODS_CELL);
      const grid = new Float32Array(n * n);
      for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) grid[iz * n + ix] = map.woods(-half + (ix + 0.5) * WOODS_CELL, -half + (iz + 0.5) * WOODS_CELL);
      this.woods = { grid, n, half };
    }
  }

  /** Average woods density along the sight line (0 = open ground). */
  woodsAlong(ax, az, bx, bz) {
    const { grid, n, half } = this.woods;
    let sum = 0;
    for (let k = 1; k <= 5; k++) {
      const t = k / 5;
      const ix = Math.min(n - 1, Math.max(0, ((ax + (bx - ax) * t + half) / WOODS_CELL) | 0));
      const iz = Math.min(n - 1, Math.max(0, ((az + (bz - az) * t + half) / WOODS_CELL) | 0));
      sum += grid[iz * n + ix];
    }
    return sum / 5;
  }

  /**
   * A submarine under the surface: a ship's sonar finds it within its range (half as far if the boat
   * runs silent, or the hunter goes too fast to listen); a periscope is seen close by, from a ship's
   * bridge; and its torpedoes' tracks lead back to it for a while.
   */
  underwater(u, spotters, terrain) {
    const periscope = (u.depth ?? 0) < 9;
    const now = this.game.time;
    for (const o of spotters) {
      const os = o.stats;
      const d = Math.hypot(o.pos.x - u.pos.x, o.pos.z - u.pos.z);
      if (u.revealT > 0 && d < 1400) return true;
      if (os.sonar && (o.depth ?? 0) < 1) {
        const fast = Math.hypot(o.vel?.x ?? 0, o.vel?.z ?? 0) > 12;
        const range = os.sonar * (u.stack.silent ? 0.5 : 1) * (fast ? 0.5 : 1);
        if (d < range) {
          u.contactAt = now;
          if (!(o.pingAt > now - 3.5)) { o.pingAt = now; this.game.audio?.play('sonar.ping', o.pos, { volume: 0.7, throttle: 0.5 }); } // the hunter's sonar, holding the contact
          return true;
        }
        if (now - (u.contactAt ?? -99) < 10 && d < os.sonar * 1.3) return true; // contact held a while: where it was, where it was heading
      }
      if (periscope && d < 350 && os.naval && terrain.lineOfSight(o.pos.x, o.pos.y + (os.eyeHeight ?? 1.5), o.pos.z, u.pos.x, (this.world.river?.level ?? 0) + 1, u.pos.z)) return true;
    }
    return false;
  }

  /** An enemy submarine just slipped out of contact: a fading ring where it was last found (and on the minimap). */
  lostContact(u) {
    const level = this.world.river?.level ?? 0;
    const ring = new THREE.Mesh(new THREE.RingGeometry(26, 32, 40), new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false, fog: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(u.pos.x, level + 0.4, u.pos.z);
    this.game.scene.add(ring);
    this.contacts.push({ x: u.pos.x, z: u.pos.z, at: this.game.time, ring });
    if (this.contacts.length > 6) this.dropContact(0);
  }

  dropContact(i) {
    const c = this.contacts[i];
    c.ring.removeFromParent();
    c.ring.geometry.dispose();
    c.ring.material.dispose();
    this.contacts.splice(i, 1);
  }

  /** Note that a unit fired (called from UnitStack.shoot). */
  static revealShooter(u) {
    u.revealT = REVEAL_TIME * (u.stats.quietShot ?? 1); // a sniper's single shot is hard to place
  }

  update(dt) {
    for (const s of this.world.stacks) for (const u of s.units) if (u.revealT > 0) u.revealT -= dt;
    for (let i = this.contacts.length - 1; i >= 0; i--) { // lost contacts fade over CONTACT_FADE s
      const k = 1 - (this.game.time - this.contacts[i].at) / CONTACT_FADE;
      if (k <= 0) this.dropContact(i);
      else this.contacts[i].ring.material.opacity = 0.7 * k;
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = INTERVAL;

    const terrain = this.world.terrain;
    for (const s of this.world.stacks) {
      const spotters = this.world.combatants(s.faction === this.player ? this.enemyOfPlayer() : this.player);
      let any = false;
      for (const u of s.units) {
        if (!u.alive) continue; // a body stays where (and as) it was last seen
        // fortifications are on everyone's maps
        u.spotted = !this.enabled || s.stats.structure || this.isSeen(u, spotters, terrain);
        if (u.wasSpotted && !u.spotted && s.faction !== this.player && (u.depth ?? 0) > 3) this.lostContact(u); // gone under: mark where
        u.wasSpotted = u.spotted;
        // drawn only where your fog of war is clear (render/FogOfWar.js): spotted by a shot's flash or
        // a tall hull past the edge of view, your troops may fire at it, you don't see it. A gun a
        // counter-battery radar has tracked back is shown wherever it is: that's what the radar is for
        const located = u.locatedUntil > this.game.time;
        u.visible = s.faction === this.player || (u.spotted && (!this.enabled || s.stats.structure || located || (this.game.fow?.at(u.pos.x, u.pos.z) ?? 1) > 0.3));
        if (u.visible) any = true;
      }
      s.visible = s.faction === this.player || any;
    }
  }

  enemyOfPlayer() {
    return this.world.stacks.find((s) => s.faction !== this.player)?.faction ?? null;
  }

  isSeen(u, spotters, terrain) {
    if (u.locatedUntil > this.game.time) return true; // tracked back by a counter-battery radar (systems/CounterBattery.js)
    if ((u.depth ?? 0) > 3) return this.underwater(u, spotters, terrain);
    const smoke = this.game.smoke;
    const cond = this.game.conditions;
    const lit = this.game.flares?.lit(u.pos.x, u.pos.z) ?? false;
    const inBuilding = u.atCover && u.coverSpot?.interior;
    const posture = inBuilding ? 0.45 : u.prone > 0.7 ? 0.45 : u.crouch > 0.6 && u.atCover ? 0.6 : 1;
    const rest = (u.moving ? 1.15 : 1) * (u.stats.stealth ?? 1) * (!u.moving && this.game.construction?.underNet(u.pos.x, u.pos.z, u.faction) ? 0.5 : 1); // a camouflage net: half as far
    for (const o of spotters) {
      const os = o.stats;
      if ((o.depth ?? 0) > 9) { // a boat deep down sees nothing — but hears the screws of a ship under way
        if (u.stack.stats.naval && u.moving && (u.pos.x - o.pos.x) ** 2 + (u.pos.z - o.pos.z) ** 2 < ((os.hearing ?? 0) * (u.stack.noise ?? 1)) ** 2) return true; // (her engine order: slow is quiet, flank loud)
        continue;
      }
      // a sniper's scope (stats.scope: the share of that cover it sees past) finds men lying low
      const conceal = (os.scope ? 1 - (1 - posture) * (1 - os.scope) : posture) * rest;
      const base = (os.sight ?? 100) * (os.binoculars && !o.moving ? 1.25 : 1);
      let r = (base * (cond ? cond.sightFor(os, o.faction, lit) : 1) + u.height * 4) * conceal;
      if (this.game.squalls) r *= 1 - 0.65 * Math.max(this.game.squalls.inside(o.pos.x, o.pos.z), this.game.squalls.inside(u.pos.x, u.pos.z)); // (in a rain squall: a third as far)
      if (this.overwatch && o.pos.y > u.pos.y) r *= 1 + Math.min(0.5, (o.pos.y - u.pos.y) / 50); // looking down from a height
      const dx = o.pos.x - u.pos.x;
      const dz = o.pos.z - u.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < AWARE * AWARE) return true;
      if (smoke.blocks(o.pos.x, o.pos.z, u.pos.x, u.pos.z)) continue; // nobody sees through a screen
      if (u.revealT > 0 && d2 < (Math.max(r, base * 0.8) * 1.5) ** 2) return true; // heard / saw the shot (a flash shows in the dark)
      if (d2 > r * r) continue;
      if (this.woods) {
        const rw = r * (1 - WOODS_CUT * this.woodsAlong(o.pos.x, o.pos.z, u.pos.x, u.pos.z));
        if (d2 > rw * rw) continue;
      }
      // view cone: no eyes in the back of the head
      const facing = o.stack.usesCover ? o.yaw : o.turretYaw;
      const toward = Math.atan2(-dx, -dz);
      let off = Math.abs(toward - facing) % (Math.PI * 2);
      if (off > Math.PI) off = Math.PI * 2 - off;
      if (off > (os.fov ?? 2.1) / 2) continue;
      if (terrain.lineOfSight(o.pos.x, o.pos.y + (os.eyeHeight ?? 1.5), o.pos.z, u.pos.x, u.pos.y + Math.max(0.4, u.height * 0.8), u.pos.z)) {
        return true;
      }
    }
    return false;
  }
}
