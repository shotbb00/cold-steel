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
};
const CLEAR_RADIUS = 9;
const FUSE = 8;             // seconds from the charges being set to the bridge going up
const DETECT = 16;          // metres: engineers spot enemy mines this close

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
  place(kind, x, z, yaw, faction, stack = null, { id = null, force = false } = {}) {
    const def = STRUCTURES[kind];
    const { cover, world } = this.game;
    if (!force && (Math.abs(x) > world.bounds.x || Math.abs(z) > world.bounds.z)) return null;
    if (!force && !def.action && cover.pointBlocked(x, z, def.width * 0.5 + 0.4)) return null;
    const bridge = kind === 'demolish' ? this.game.map.bridgeAt?.(x, z) ?? null : null;
    if (kind === 'demolish' && (!bridge || bridge.blown)) return null;
    const ghost = new THREE.Mesh(new THREE.BoxGeometry(def.length, def.action ? 0.25 : 1, def.width), ghostMat);
    ghost.position.set(x, this.game.terrain.heightAt(x, z) + 0.5, z);
    ghost.rotation.y = yaw;
    ghost.visible = faction === this.game.playerFaction; // you don't see the enemy's blueprints
    this.game.scene.add(ghost);
    const site = { id: id ?? this.nextId++, def, kind, x, z, yaw, faction, progress: 0, ghost, bridge, stack };
    this.sites.push(site);
    this.game.netEvent('site', site.id, kind, x, z, yaw, faction);
    if (stack) {
      // stand just behind the work so the squad isn't silhouetted in front of it
      const back = def.width / 2 + 2;
      stack.ai.moveTo({ x: x - Math.sin(yaw) * back, z: z - Math.cos(yaw) * back }, { hold: true, ordered: this.game.isHuman(stack.faction) });
      stack.fortifications = (stack.fortifications ?? 0) + 1;
    }
    return site;
  }

  update(dt) {
    for (const s of this.game.world.stacks) for (const u of s.units) { u.working = false; u.slow = 1; }
    this.updateObstacles(dt);
    for (let i = this.fuses.length - 1; i >= 0; i--) {
      if (this.game.time < this.fuses[i].at) continue;
      this.game.blowBridge(this.fuses[i].bridge);
      this.fuses.splice(i, 1);
    }
    for (let i = this.sites.length - 1; i >= 0; i--) {
      const site = this.sites[i];
      let workers = 0;
      for (const s of this.game.world.stacksOf(site.faction)) {
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
  }

  /** The blueprint is done: take it away and build the real thing. */
  finish(site) {
    const i = this.sites.indexOf(site);
    if (i < 0) return;
    this.sites.splice(i, 1);
    site.ghost.removeFromParent();
    site.ghost.geometry.dispose();
    this.complete(site);
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
      const side = s?.alive ? river.side(s.anchor.x, s.anchor.z) : 1;
      if (s?.alive) s.ai.moveTo({ x: c.x, z: c.z + side * (river.halfWidth + 22) }, { hold: true, ordered: game.isHuman(s.faction) });
      this.fuses.push({ bridge: c, at: game.time + FUSE });
      game.tell(site.faction, `Charges set on the ${c.name} — clear the bridge, ${FUSE} seconds!`);
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
          } else if (ob.kind === 'mines' && roll && u.moving) {
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
