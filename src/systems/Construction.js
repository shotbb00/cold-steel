// Field fortifications. A stack is ordered to build a structure at a spot: a blueprint appears,
// the stack walks there and digs in, and progress accrues per working soldier (any friendly
// infantry within reach that isn't busy shooting). Finished structures are real cover:
//   sandbags – a chest-high bag wall (cover spots on both sides)
//   trench   – the ground is actually dug out (units inside stand lower), sandbag parapet in
//              front, earth mound behind; trench positions shelter from every direction
//   wire     – concertina coils: enemy infantry crossing slows to a crawl; vehicles flatten it
//   mines    – a mixed field (anti-personnel and anti-tank): invisible to the enemy until the
//              first blast; infantry and vehicles moving through risk setting one off (a vehicle
//              hit is immobilised if it survives); a limited number of mines per field. The
//              owner sees warning signs; your own troops know the lanes and don't trigger it.
// Engineer jobs (only stacks with stats.engineer work on them; engineers also build ×3):
//   clear    – lift every mine and cut every coil of wire within ~9 m of the spot
//   demolish – charges on a bridge (map.bridgeAt); when done the bridge goes up (game.blowBridge)
// Combat engineer vehicles (stats.dozer) dig with their blade:
//   revetment – a vehicle position: a pit the length of a tank, a ramp out at the back and a
//              spoil berm in front. A vehicle in it sits a metre lower, so the berm takes the
//              rounds aimed at its hull while its gun still clears it (hull down).
// Mine clearing vehicles:
//   plough      (stats.minePlough) driving through an enemy minefield lifts its mines as it goes
//               (and rarely sets one off) and leaves a lane: whoever keeps to its track is safe;
//               the field is gone when the last mine is lifted
//   line charge (stats.lineCharge: { count, range }) a rocket drags an explosive hose out to the
//               aimed point and the whole strip goes up: every minefield and coil of wire it
//               crosses is gone, and anyone standing in it is hurt (Orders 'lineCharge')
// Bridge layers (stats.bridgeLayer) have one job of their own:
//   span     – drive to the near bank at the clicked spot and lay a bridge over (game.layBridge)
// Engineers also find enemy minefields within 16 m, and set them off only a quarter as often.
// Orientation: `yaw` turns the structure like Object3D.rotation.y; its "front" (parapet side)
// faces local +z, i.e. world (sin yaw, cos yaw).
import * as THREE from 'three';
import { P, merge } from '../data/units/geometry.js';
import { smoothstep } from '../core/math.js';

export const STRUCTURES = {
  sandbags: { id: 'sandbags', name: 'Sandbags', cost: 15, work: 60, length: 4.5, width: 0.8 },
  trench: { id: 'trench', name: 'Trench', cost: 30, work: 140, length: 9, width: 3.2 },
  wire: { id: 'wire', name: 'Wire', cost: 20, work: 45, length: 10, width: 1.4 },
  mines: { id: 'mines', name: 'Minefield', cost: 40, work: 70, length: 14, width: 9, mines: 8 },
  clear: { id: 'clear', name: 'Clearing', cost: 0, work: 40, length: 12, width: 12, action: true, engineers: true },
  demolish: { id: 'demolish', name: 'Demolition charges', cost: 30, work: 55, length: 8, width: 7, action: true, engineers: true },
  revetment: { id: 'revetment', name: 'Vehicle position', cost: 25, work: 22, length: 4.6, width: 8, dozer: true },
  span: { id: 'span', name: 'Bridge', cost: 0, work: 20, length: 5, width: 26, action: true, layer: true },
};
const CLEAR_RADIUS = 9;
const FUSE = 8;             // seconds from the charges being set to the bridge going up
const DETECT = 16;          // metres: engineers spot enemy mines this close
const LANE = 2.2;           // m either side of a plough's track that is safe
const LINE = { flight: 1.6, step: 6, half: 3.5, men: 300, vehicles: 450 }; // line charge: rocket flight (s), blasts every 6 m, strip half-width
const REVETMENT = { depth: 1.0, berm: 0.75 }; // m: the vehicle sits this much lower; the berm stands this high

const STEEL = 0x55575a;
const RUST = 0x5a3c2a;
const SIGN = 0xd8c86a;

const REACH = 9;          // metres: soldiers this close to a site work on it
const BAG = 0xb8a57a;
const BAG_DARK = 0x8f7d57;
const EARTH = 0x4a3a2c;

const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x8fe9ff, transparent: true, opacity: 0.28, depthWrite: false });

export class Construction {
  constructor(game) {
    this.game = game;
    this.sites = [];
    this.structures = [];
    this.obstacles = [];   // finished wire and minefields
    this.obstacleT = 0;
    this.nextId = 1;
    this.fuses = [];       // demolition charges burning down
  }

  /**
   * Lay a blueprint and send `stack` to build it. Returns the site or null if the spot is bad.
   * A multiplayer client passes the host's `id` (and `force`: the host already checked the spot).
   */
  place(kind, x, z, yaw, faction, stack = null, { id = null, force = false, stackId = null } = {}) {
    const def = STRUCTURES[kind];
    const { cover, world } = this.game;
    if (!force && (Math.abs(x) > world.bounds.x || Math.abs(z) > world.bounds.z)) return null;
    if (!force && !def.action && cover.pointBlocked(x, z, def.width * 0.5 + 0.4)) return null;
    const bridge = kind === 'demolish' ? this.game.map.bridgeAt?.(x, z) ?? null : null;
    if (kind === 'demolish' && (!bridge || bridge.blown)) return null;
    const river = this.game.world.river;
    if (kind === 'span') {
      if (!river || Math.abs(z - river.path(x)) > river.halfWidth + 25) return null; // not at the river
      const sid = stack?.id ?? stackId;
      for (const old of this.sites.filter((s) => s.kind === 'span' && s.stackId === sid)) this.cancel(old); // only the last order counts
      if (river.crossings.some((c) => !c.blown && Math.abs(c.x - x) < 14)) return null;   // a crossing already there
      z = river.path(x);
      yaw = 0;
    }
    const ghost = new THREE.Mesh(new THREE.BoxGeometry(def.length, def.action ? 0.25 : 1, def.width), ghostMat);
    ghost.position.set(x, this.game.terrain.heightAt(x, z) + 0.5, z);
    ghost.rotation.y = yaw;
    ghost.visible = faction === this.game.playerFaction; // you don't see the enemy's blueprints
    this.game.scene.add(ghost);
    const site = { id: id ?? this.nextId++, def, kind, x, z, yaw, faction, progress: 0, ghost, bridge, stack, stackId: stack?.id ?? stackId };
    const from = stack ?? (site.stackId != null ? world.stackById(site.stackId) : null);
    if ((bridge || kind === 'span') && from && river) site.home = river.side(from.centroid.x, from.centroid.z); // the bank they set out from
    if (kind === 'span') ghost.visible = false; // the laying animation shows the work instead
    this.sites.push(site);
    this.game.netEvent('site', site.id, kind, x, z, yaw, faction, site.stackId);
    if (stack) {
      // stand just behind the work so the squad isn't silhouetted in front of it
      // (a clearing or demolition job covers a wide patch but is worked from its middle: close in)
      const back = def.dozer ? 0 : def.action ? 3 : def.width / 2 + 2; // a dozer works the pit from inside it
      const to = def.layer // a bridge layer pulls up at the near bank, facing across
        ? { x, z: z + river.side(stack.anchor.x, stack.anchor.z) * (river.halfWidth + 9) }
        : { x: x - Math.sin(yaw) * back, z: z - Math.cos(yaw) * back };
      stack.ai.moveTo(to, { hold: true, ordered: this.game.isHuman(stack.faction) });
      stack.fortifications = (stack.fortifications ?? 0) + 1;
    }
    return site;
  }

  update(dt) {
    for (const s of this.game.world.stacks) for (const u of s.units) { u.working = false; u.slow = 1; }
    this.updateObstacles(dt);
    this.updateRevetments();
    if (this.lineCharges?.length) {
      for (const c of this.lineCharges.filter((c) => this.game.time >= c.at)) this.blowLineCharge(c);
      this.lineCharges = this.lineCharges.filter((c) => this.game.time < c.at);
    }
    for (let i = this.fuses.length - 1; i >= 0; i--) {
      if (this.game.time < this.fuses[i].at) continue;
      this.game.blowBridge(this.fuses[i].bridge);
      this.fuses.splice(i, 1);
    }
    for (let i = this.sites.length - 1; i >= 0; i--) {
      const site = this.sites[i];
      // an engineer or bridge-layer job dies with the team that was sent to do it (on the host;
      // the client hears it as 'unsite')
      if (site.def.action && site.stack && (!site.stack.alive || site.stack.removed) && !this.game.net?.isClient) {
        this.cancel(site, false);
        continue;
      }
      let workers = 0;
      for (const s of this.game.world.stacksOf(site.faction)) {
        if (site.def.layer) { // only its own bridge layer, parked on the bank
          const u = s === site.stack && s.units[0];
          if (u?.alive && !u.dropped && Math.hypot(u.pos.x - site.x, u.pos.z - site.z) < this.game.world.river.halfWidth + 14 && !u.moving) workers += 1;
          continue;
        }
        if (site.def.dozer) { // the blade: the engineer vehicle itself, at the spot and not driving off
          const u = s.stats.dozer && s.units[0];
          if (u?.alive && !u.possessed && Math.hypot(u.pos.x - site.x, u.pos.z - site.z) < REACH) workers += 1;
          continue;
        }
        if (!s.usesCover) continue;
        if (site.def.engineers && !s.stats.engineer) continue; // engineer jobs
        const rate = s.stats.engineer ? 3 : 1;
        for (const u of s.units) {
          if (!u.alive || u.possessed || u.target || u.reloadT > 0) continue;
          if ((u.pos.x - site.x) ** 2 + (u.pos.z - site.z) ** 2 > REACH * REACH) continue;
          u.working = true;
          workers += rate;
        }
      }
      site.progress += (workers * dt) / site.def.work;
      this.showProgress(site);
      if (site.progress >= 1) this.finish(site);
    }
  }

  showProgress(site) {
    site.ghost.scale.y = 0.15 + Math.min(1, site.progress) * 0.85;
    site.ghost.material.opacity = 0.2 + site.progress * 0.2;
    if (site.kind === 'span' && site.progress > 0) this.layingAnimation(site);
  }

  /**
   * A bridge being laid, scissors-fashion, following the job's progress: the bridge comes off the
   * vehicle folded in half, rises at the near bank until it stands upright with its hinge on top,
   * then lowers across the river while the outer half unfolds over it, until both lie flat.
   */
  layingAnimation(site) {
    const river = this.game.world.river;
    const side = site.home ?? 1;
    const layer = this.game.world.stackById(site.stackId)?.units[0];
    if (layer) layer.laying = true; // the bridge is off its back, swinging out
    if (!site.anim) {
      const L = river.spanLength;
      const pivot = new THREE.Group();           // at the near bank: the near half swings about it
      const near = river.steelSpan(L / 2);
      near.position.set(0, 0, -side * L / 4);
      const hinge = new THREE.Group();           // the scissors hinge at the near half's far end
      hinge.position.set(0, 0, -side * L / 2);
      const far = river.steelSpan(L / 2);
      far.position.set(0, 0, -side * L / 4);
      hinge.add(far);
      pivot.add(near, hinge);
      pivot.position.set(site.x, river.deck, site.z + side * L / 2);
      this.game.scene.add(pivot);
      site.anim = { pivot, hinge };
    }
    const ease = (t) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };
    const p = site.progress;
    const rise = ease((p - 0.05) / 0.3);         // folded, lying back over the vehicle → upright
    const open = ease((p - 0.35) / 0.65);        // upright → lowered across, unfolding as it goes
    const up = Math.PI * 0.85 - Math.PI * 0.35 * rise;  // the near half's angle: ~150° → 90°…
    site.anim.pivot.rotation.x = side * (up - (Math.PI / 2) * open); // …→ 0°, flat across the river
    site.anim.hinge.rotation.x = -side * Math.PI * (1 - open);          // the outer half: folded back → straight, opening out over the river
  }

  /** The blueprint is done: take it away and build the real thing. */
  finish(site) {
    const i = this.sites.indexOf(site);
    if (i < 0) return;
    this.sites.splice(i, 1);
    site.ghost.removeFromParent();
    site.ghost.geometry.dispose();
    site.anim?.pivot.removeFromParent(); // the laid bridge takes its place
    this.complete(site);
  }

  /** Call off a job not yet finished: the blueprint goes, its command points come back. */
  cancel(site, refund = true) {
    const i = this.sites.indexOf(site);
    if (i < 0) return false;
    this.sites.splice(i, 1);
    site.ghost.removeFromParent();
    site.ghost.geometry.dispose();
    if (site.anim) { // called off half-laid: the bridge goes back on the vehicle
      site.anim.pivot.removeFromParent();
      const layer = this.game.world.stackById(site.stackId)?.units[0];
      if (layer) layer.laying = false;
    }
    if (!this.game.net?.isClient) {
      if (refund) this.game.refund(site.faction, site.def.cost);
      this.game.netEvent('unsite', site.id);
    }
    return true;
  }

  siteById(id) {
    return this.sites.find((s) => s.id === id) ?? this.structures.find((s) => s.id === id) ?? null;
  }

  complete(site) {
    if (site.def.action) {
      this.game.netEvent('built', site.id); // the client takes its blueprint away
      return this.finishJob(site);
    }
    if (site.kind === 'trench') this.buildTrench(site);
    else if (site.kind === 'revetment') this.buildRevetment(site);
    else if (site.kind === 'wire') this.buildWire(site);
    else if (site.kind === 'mines') this.buildMines(site);
    else this.buildSandbags(site);
    this.structures.push(site);
    this.game.netEvent('built', site.id);
    this.game.bus.emit('built', site);
    this.game.tell(site.faction, `${site.def.name} finished`);
  }

  /** An engineer job is done (the host does the work; a multiplayer client gets the results). */
  finishJob(site) {
    const game = this.game;
    if (game.net?.isClient) return;
    if (site.kind === 'clear') {
      const near = this.obstacles.filter((ob) => Math.hypot(ob.x - site.x, ob.z - site.z) < CLEAR_RADIUS + Math.max(ob.hx, ob.hz));
      for (const ob of near) this.removeObstacle(ob);
      game.tell(site.faction, near.length ? `Engineers: ${near.length === 1 ? 'obstacle' : `${near.length} obstacles`} cleared` : 'Engineers: nothing to clear there');
    } else if (site.kind === 'demolish' && site.bridge) {
      // charges set, fuse lit: the engineers run back to their own bank before it goes
      const c = site.bridge;
      const river = game.world.river;
      const s = site.stack;
      const side = site.home ?? (s?.alive ? river.side(s.centroid.x, s.centroid.z) : 1); // back the way they came
      if (s?.alive) s.ai.moveTo({ x: c.x, z: c.z + side * (river.halfWidth + 22) }, { hold: true, ordered: game.isHuman(s.faction) });
      this.fuses.push({ bridge: c, at: game.time + FUSE });
      game.tell(site.faction, `Charges set on the ${c.name} — clear the bridge, ${FUSE} seconds!`);
    } else if (site.kind === 'span') {
      const u = site.stack?.units[0];
      if (!u?.alive) return;
      u.dropped = true;
      u.laying = false;
      game.layBridge(site.x);
    }
  }

  /** World position of local (lx, lz) in a structure frame. */
  local(site, lx, lz) {
    const c = Math.cos(site.yaw);
    const s = Math.sin(site.yaw);
    return [site.x + lx * c + lz * s, site.z - lx * s + lz * c];
  }

  /** A row (or stack of rows) of rounded bags along local x at lz. */
  bagRows(site, lz, length, rows, parts, lift = 0) {
    const terrain = this.game.terrain;
    const n = Math.max(2, Math.round(length / 0.5));
    for (let row = 0; row < rows; row++) {
      for (let i = 0; i < n - (row % 2); i++) {
        const lx = -length / 2 + (i + 0.5 + (row % 2) * 0.5) * (length / n);
        const [x, z] = this.local(site, lx, lz + (Math.random() - 0.5) * 0.04);
        const y = terrain.heightAt(x, z) + lift + 0.15 + row * 0.27;
        parts.push(P.sphere(1, {
          x, y, z, ry: site.yaw + (Math.random() - 0.5) * 0.2,
          sx: (length / n) * 0.56, sy: 0.15, sz: 0.2, color: row % 2 ? BAG_DARK : BAG,
        }, 8, 5));
      }
    }
  }

  addMesh(parts) {
    const mesh = new THREE.Mesh(merge(parts), bodyMat);
    mesh.castShadow = mesh.receiveShadow = true;
    this.game.scene.add(mesh);
    return mesh;
  }

  buildSandbags(site) {
    const parts = [];
    this.bagRows(site, 0, site.def.length, 3, parts);
    site.mesh = this.addMesh(parts);
    this.game.cover.addStructureBox({ x: site.x, z: site.z, yaw: site.yaw, length: site.def.length, thickness: 0.6, height: 0.95 });
  }

  /** A vehicle position: the pit (ramped at the back), the spoil berm in front, and its cover. */
  buildRevetment(site) {
    const { terrain, cover } = this.game;
    const halfX = site.def.length / 2 - 0.3;
    const c = Math.cos(site.yaw);
    const s = Math.sin(site.yaw);
    terrain.dig(site.x, site.z, 6, REVETMENT.depth, (x, z) => {
      const dx = x - site.x;
      const dz = z - site.z;
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      const ramp = smoothstep(-4.6, -2.2, lz);                 // the way in and out, from the back
      return smoothstep(halfX + 0.5, halfX - 0.2, Math.abs(lx)) * smoothstep(3.4, 2.8, lz) * ramp;
    });
    const parts = [];
    for (let i = 0; i < 3; i++) {                     // the spoil berm in front, and some to the sides
      const [x, z] = this.local(site, -1.6 + i * 1.6, 3.9);
      parts.push(P.sphere(1, { x, y: terrain.heightAt(x, z), z, ry: site.yaw, sx: 1.4, sy: REVETMENT.berm, sz: 0.9, color: EARTH }, 10, 6));
    }
    for (const sx of [-1, 1]) {
      const [x, z] = this.local(site, sx * (halfX + 1.1), 0.8);
      parts.push(P.sphere(1, { x, y: terrain.heightAt(x, z), z, ry: site.yaw, sx: 0.6, sy: REVETMENT.berm * 0.7, sz: 2.6, color: EARTH }, 10, 6));
    }
    site.mesh = this.addMesh(parts);
    const [fx, fz] = this.local(site, 0, 3.9);
    site.berm = cover.addBox({ x: fx, z: fz, yaw: site.yaw, length: site.def.length + 0.4, thickness: 1.2, height: REVETMENT.berm, spots: false });
    this.revetments = [...(this.revetments ?? []), site];
  }

  /** Vehicles standing in a vehicle position are hull down (their rounds clear their own berm). */
  updateRevetments() {
    const list = this.revetments;
    if (!list?.length) return;
    for (const s of this.game.world.stacks) {
      if (s.usesCover) continue;
      for (const u of s.units) {
        u.hullDown = null;
        if (!u.alive || u.moving) continue;
        for (const r of list) {
          const dx = u.pos.x - r.x;
          const dz = u.pos.z - r.z;
          const lx = dx * Math.cos(r.yaw) - dz * Math.sin(r.yaw);
          const lz = dx * Math.sin(r.yaw) + dz * Math.cos(r.yaw);
          if (Math.abs(lx) < r.def.length / 2 && lz > -3 && lz < 3.2) { u.hullDown = r; break; }
        }
      }
    }
  }

  /** Concertina wire: a row of coils on pickets. */
  buildWire(site) {
    const parts = [];
    const L = site.def.length;
    const terrain = this.game.terrain;
    const coils = Math.round(L / 0.55);
    for (let i = 0; i < coils; i++) {
      const lx = -L / 2 + (i + 0.5) * (L / coils);
      const [x, z] = this.local(site, lx, (Math.random() - 0.5) * 0.08);
      const y = terrain.heightAt(x, z) + 0.45;
      parts.push(P.torus(0.45, 0.012, { x, y, z, ry: site.yaw + Math.PI / 2 + 0.15, rz: (Math.random() - 0.5) * 0.2, color: STEEL }, 14));
    }
    for (let i = 0; i <= 4; i++) {
      const [x, z] = this.local(site, -L / 2 + (i * L) / 4, 0);
      parts.push(P.box(0.05, 1.1, 0.05, { x, y: terrain.heightAt(x, z) + 0.5, z, color: RUST }));
    }
    site.mesh = this.addMesh(parts);
    this.addObstacle(site);
  }

  /** Minefield: churned soil patches, and warning signs only its owner (or anyone, once revealed) sees. */
  buildMines(site) {
    const terrain = this.game.terrain;
    const L = site.def.length;
    const W = site.def.width;
    const soil = [];
    for (let i = 0; i < 16; i++) {
      const [x, z] = this.local(site, (Math.random() - 0.5) * L, (Math.random() - 0.5) * W);
      soil.push(P.sphere(1, { x, y: terrain.heightAt(x, z) - 0.02, z, sx: 0.35, sy: 0.05, sz: 0.35, color: 0x3c3024 }, 6, 3));
    }
    site.mesh = this.addMesh(soil);
    const signs = [];
    for (const [lx, lz] of [[-L / 2, -W / 2], [L / 2, -W / 2], [-L / 2, W / 2], [L / 2, W / 2], [0, -W / 2], [0, W / 2]]) {
      const [x, z] = this.local(site, lx, lz);
      const g = terrain.heightAt(x, z);
      signs.push(P.box(0.05, 1.0, 0.05, { x, y: g + 0.5, z, color: 0x4a3a2a }));
      signs.push(P.box(0.4, 0.28, 0.03, { x, y: g + 0.95, z, ry: site.yaw, rz: Math.PI / 4, color: SIGN }));
    }
    site.signs = this.addMesh(signs);
    this.addObstacle(site, { charges: site.def.mines });
  }

  addObstacle(site, extra = {}) {
    const ob = { kind: site.kind, site, x: site.x, z: site.z, yaw: site.yaw, hx: site.def.length / 2, hz: site.def.width / 2, faction: site.faction, revealed: false, ...extra };
    this.obstacles.push(ob);
    this.showObstacle(ob);
  }

  showObstacle(ob) {
    const own = ob.faction === this.game.playerFaction;
    if (ob.site.signs) ob.site.signs.visible = own || ob.revealed;
    if (ob.kind === 'mines') ob.site.mesh.visible = own || ob.revealed;
  }

  /** Is (x, z) inside the obstacle's footprint? */
  within(ob, x, z) {
    const dx = x - ob.x;
    const dz = z - ob.z;
    const c = Math.cos(ob.yaw);
    const s = Math.sin(ob.yaw);
    return Math.abs(dx * c - dz * s) <= ob.hx && Math.abs(dx * s + dz * c) <= ob.hz;
  }

  removeObstacle(ob) {
    const i = this.obstacles.indexOf(ob);
    if (i < 0) return;
    this.game.netEvent('cleared', ob.site.id);
    this.obstacles.splice(i, 1);
    ob.site.mesh?.removeFromParent();
    ob.site.signs?.removeFromParent();
  }

  /**
   * A line charge from `stack` at (x, z): the rocket flies out (LINE.flight s), then the hose
   * detonates along the strip from just in front of the launcher to the aimed point.
   */
  fireLineCharge(stack, x, z) {
    const game = this.game;
    const u = stack.units[0];
    const lc = stack.stats.lineCharge;
    if (!u?.alive || !lc) return false;
    u.lineCharges ??= lc.count;
    if (u.lineCharges <= 0) return game.tell(stack.faction, `${stack.name} has no line charges left`) ?? false;
    const d = Math.hypot(x - u.pos.x, z - u.pos.z);
    if (d > lc.range || d < 25) return game.tell(stack.faction, `A line charge reaches 25–${lc.range} m`) ?? false;
    u.lineCharges--;
    const from = { x: u.pos.x + ((x - u.pos.x) / d) * 8, z: u.pos.z + ((z - u.pos.z) / d) * 8 };
    const y = game.terrain.heightAt(u.pos.x, u.pos.z) + 2.2;
    const dir = { x: (x - u.pos.x) / d, y: 0.25, z: (z - u.pos.z) / d };
    game.projectiles.spawn({
      origin: { x: u.pos.x, y, z: u.pos.z }, dir, speed: d / LINE.flight, damage: 0, faction: stack.faction, color: stack.boltColor,
      size: 1.2, source: stack, life: LINE.flight, tracer: true, trail: true,
    });
    game.audio.play('rocket', { x: u.pos.x, y, z: u.pos.z }, { volume: 0.9 });
    (this.lineCharges ??= []).push({ at: game.time + LINE.flight, from, to: { x, z }, stack });
    return true;
  }

  /** The hose goes up: explosions along the strip, obstacles in it gone, whoever stands in it hurt. */
  blowLineCharge(c) {
    const game = this.game;
    const { from, to } = c;
    const len = Math.hypot(to.x - from.x, to.z - from.z);
    const n = Math.max(2, Math.round(len / LINE.step));
    const field = { faction: c.stack.faction, name: c.stack.name, kind: 'Line charge' };
    const hit = new Set();
    for (let i = 0; i <= n; i++) {
      const x = from.x + ((to.x - from.x) * i) / n;
      const z = from.z + ((to.z - from.z) * i) / n;
      const pos = { x, y: game.terrain.heightAt(x, z), z };
      game.effects.explosion(pos, 1.1, { ground: true });
      if (i % 3 === 0) game.audio.play('explosion.big', pos, { volume: 0.8, throttle: 0.02 });
      for (const ob of [...this.obstacles]) {
        if (this.within({ ...ob, hx: ob.hx + LINE.half, hz: ob.hz + LINE.half }, x, z)) this.removeObstacle(ob);
      }
      for (const o of game.world.neighbors(pos, LINE.half + 1, [])) {
        if (hit.has(o)) continue;
        hit.add(o);
        if (o.stack.usesCover) o.receiveDamage(LINE.men, field, 1);
        else o.receiveDamage(LINE.vehicles, field, 0.5, null, 1); // a tank: tracks and belly plate
      }
    }
    game.tell(c.stack.faction, `${c.stack.name}: line charge fired — lane open`);
  }

  /** Wire slows enemy infantry (every frame); mines get a chance to go off a few times a second. */
  updateObstacles(dt) {
    if (!this.obstacles.length) return;
    this.obstacleT -= dt;
    const roll = this.obstacleT <= 0;
    if (roll) this.obstacleT = 0.2;
    const world = this.game.world;
    for (const ob of [...this.obstacles]) {
      for (const s of world.stacks) {
        if (s.faction === ob.faction || !s.alive) continue;
        // engineers find hidden mines before they walk into them
        if (roll && ob.kind === 'mines' && !ob.revealed && s.stats.engineer
          && s.units.some((u) => u.alive && Math.hypot(u.pos.x - ob.x, u.pos.z - ob.z) < DETECT + ob.hx)) {
          ob.revealed = true;
          this.showObstacle(ob);
          this.game.netEvent('revealed', ob.site.id);
          this.game.tell(s.faction, `${s.name}: minefield found — clear it with engineers (X)`);
        }
        for (const u of s.units) {
          if (!u.alive || !this.within(ob, u.pos.x, u.pos.z)) continue;
          if (ob.kind === 'wire') {
            if (s.usesCover) u.slow = 0.25;
            else { this.game.effects.dust(u.pos, 1.5); this.removeObstacle(ob); break; } // flattened
          } else if (ob.kind === 'mines' && roll && u.moving && s.stats.minePlough) {
            // the plough lifts them out of its path and leaves a lane; one in a while goes off under the blade
            if (!ob.revealed) { ob.revealed = true; this.showObstacle(ob); this.game.netEvent('revealed', ob.site.id); }
            if (!ob.lane) this.game.tell(s.faction, `${s.name}: ploughing a lane — follow its track`);
            (ob.lane ??= []).push({ x: u.pos.x, z: u.pos.z });
            if (Math.random() < 0.02) this.detonate(ob, u);
            else if (Math.random() < 0.25 && --ob.charges <= 0) {
              this.removeObstacle(ob);
              this.game.tell(s.faction, `${s.name}: minefield ploughed clear`);
            }
          } else if (ob.kind === 'mines' && roll && u.moving) {
            if (ob.lane?.some((q) => (q.x - u.pos.x) ** 2 + (q.z - u.pos.z) ** 2 < LANE * LANE)) continue; // in the ploughed lane
            if (Math.random() < (s.usesCover ? 0.09 : 0.22) * (s.stats.engineer ? 0.25 : 1)) this.detonate(ob, u);
          }
        }
        if (!this.obstacles.includes(ob)) break;
      }
    }
  }

  detonate(ob, u) {
    const game = this.game;
    const vehicle = !u.stack.usesCover;
    const pos = { x: u.pos.x, y: u.pos.y, z: u.pos.z };
    game.effects.explosion(pos, vehicle ? 1.3 : 0.6, { ground: true });
    game.audio.play(vehicle ? 'explosion.big' : 'explosion', pos, { volume: 0.9 });
    const field = { faction: ob.faction, name: 'Minefields', kind: 'Mines' }; // kill credit
    if (vehicle) {
      u.receiveDamage(1000, field, 0.9, null, 1);
      if (u.alive) u.speedMul = 0; // tracks blown: it can still shoot, but it's going nowhere
    } else {
      u.receiveDamage(400, field, 1);
      for (const o of game.world.neighbors(pos, 4, [])) if (o !== u && o.faction === u.faction) o.receiveDamage(120, field, 0.5);
    }
    ob.charges--;
    if (!ob.revealed) {
      ob.revealed = true;
      this.showObstacle(ob);
      game.netEvent('revealed', ob.site.id);
      game.tellBoth(ob.faction, 'The enemy has run into our minefield!', 'Mines! We\'re in a minefield!');
    }
    game.bus.emit('mine', { ob, unit: u });
    if (ob.charges <= 0) this.removeObstacle(ob);
  }

  buildTrench(site) {
    const { terrain, cover } = this.game;
    const L = site.def.length;
    const halfL = L / 2;
    const halfW = 0.9;
    const c = Math.cos(site.yaw);
    const s = Math.sin(site.yaw);
    terrain.dig(site.x, site.z, halfL + 2, 1.3, (x, z) => {
      const dx = x - site.x;
      const dz = z - site.z;
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      return smoothstep(halfW + 0.5, halfW - 0.2, Math.abs(lz)) * smoothstep(halfL + 0.5, halfL - 0.3, Math.abs(lx));
    });
    const parts = [];
    this.bagRows(site, 1.6, L, 2, parts, -0.05);    // parapet in front, just outside the cut
    for (let i = 0; i < 4; i++) {                   // spoil mound behind
      const [x, z] = this.local(site, -halfL + (i + 0.5) * (L / 4), -1.75);
      parts.push(P.sphere(1, { x, y: terrain.heightAt(x, z), z, ry: site.yaw, sx: L / 7, sy: 0.35, sz: 0.6, color: EARTH }, 10, 6));
    }
    site.mesh = this.addMesh(parts);
    const [fx, fz] = this.local(site, 0, 1.6);
    const front = cover.addBox({ x: fx, z: fz, yaw: site.yaw, length: L, thickness: 0.6, height: 0.55, spots: false });
    const [bx, bz] = this.local(site, 0, -1.75);
    cover.addBox({ x: bx, z: bz, yaw: site.yaw, length: L, thickness: 0.9, height: 0.35, spots: false });
    cover.addTrenchSpots({ x: site.x, z: site.z, yaw: site.yaw, length: L - 1.6, collider: front, spacing: 1.1 });
  }
}
