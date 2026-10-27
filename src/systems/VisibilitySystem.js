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
// For the player: hidden enemies aren't drawn, labelled or orderable (`visible`); their
// gunfire can still be heard.
const INTERVAL = 0.25;
const REVEAL_TIME = 3;     // seconds a shot keeps the shooter revealed
const AWARE = 12;          // metres: noticed this close in any direction, line of sight or not
const WOODS_CUT = 0.7;     // sight lost looking through solid forest
const WOODS_CELL = 6;      // metres per woods grid cell

export class VisibilitySystem {
  constructor(game, playerFaction) {
    this.game = game;
    this.world = game.world;
    this.player = playerFaction;
    this.timer = 0;
    this.enabled = true;
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

  /** Note that a unit fired (called from UnitStack.shoot). */
  static revealShooter(u) {
    u.revealT = REVEAL_TIME;
  }

  update(dt) {
    for (const s of this.world.stacks) for (const u of s.units) if (u.revealT > 0) u.revealT -= dt;
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
        u.visible = s.faction === this.player || u.spotted;
        if (u.visible) any = true;
      }
      s.visible = s.faction === this.player || any;
    }
  }

  enemyOfPlayer() {
    return this.world.stacks.find((s) => s.faction !== this.player)?.faction ?? null;
  }

  isSeen(u, spotters, terrain) {
    const smoke = this.game.smoke;
    const cond = this.game.conditions;
    const lit = this.game.flares?.lit(u.pos.x, u.pos.z) ?? false;
    const inBuilding = u.atCover && u.coverSpot?.interior;
    const conceal = (inBuilding ? 0.45 : u.prone > 0.7 ? 0.45 : u.crouch > 0.6 && u.atCover ? 0.6 : 1) * (u.moving ? 1.15 : 1) * (u.stats.stealth ?? 1);
    for (const o of spotters) {
      const os = o.stats;
      const base = (os.sight ?? 100) * (os.binoculars && !o.moving ? 1.25 : 1);
      let r = (base * (cond ? cond.sightFor(os, o.faction, lit) : 1) + u.height * 4) * conceal;
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
