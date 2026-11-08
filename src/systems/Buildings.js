// Buildings you can fight from (the map's farmhouses, world/Props.js `house`). Right-click a
// house with infantry selected to garrison it: the squad walks up, goes in, and each man takes a
// window — the inside wall positions, facing out — and stays at it (`u.window`, ai/SoldierAI.js).
// More men than windows wait inside the room; a full house says so. Inside, men are harder to
// spot (VisibilitySystem) and take less damage (UnitStack.damageUnit). Any other move order
// (or Leave: E, or the badge over the house, ui/BuildingMarkers.js) brings them out first.
// High explosive wears a building down — tank rounds, shells, mortar bombs, rockets
// (ProjectileSystem.detonate calls blast) — until it collapses: the walls come down to a low
// rubble pile (still low cover), and whoever was inside is likely hurt or killed.
import { P } from '../data/units/geometry.js';
// House upgrades, paid from the building budget (core/Orders.js 'houseUpgrade', systems/Economy.js):
//   sandbag – bags along the walls: the men at its windows take 40 % less (UnitStack.receiveDamage)
//   aid     – an aid station: a medic jeep (an ambulance: systems/Support.js drives it to the wounded)
//             stays posted at the house; lost, the next one comes AID_EVERY s later
export const HOUSE_UPGRADES = { sandbag: { cost: 40, label: 'sandbagged' }, aid: { cost: 60, label: 'an aid station' } };
const AID_EVERY = 90;
const BURN = { time: 150, smoke: 0.8 }; // s a collapsed house burns; its smoke cloud × the house's size

export class Buildings {
  constructor(game, list = []) {
    this.game = game;
    this.list = list;
    list.forEach((b, i) => { b.index = i; }); // the same on every machine: the map builds them in order
    for (const b of list) {
      b.hp = b.maxHp = 1400 + b.w * b.d * 6;
      for (const c of b.colliders) c.building = b;
    }
    // the wall positions on the inside are the garrison's (the outside ones are just cover)
    for (const s of game.cover.spots) {
      const b = s.collider.building;
      if (b && this.inside(b, s.x, s.z, -0.1)) s.interior = b;
    }
  }

  /** The intact building whose footprint (plus `margin` metres) contains (x, z), if any. */
  at(x, z, margin = 1) {
    for (const b of this.list) if (!b.collapsed && this.inside(b, x, z, margin)) return b;
    return null;
  }

  /** Is (x, z) within `b`'s footprint (plus `margin`)? */
  inside(b, x, z, margin = 0.2) {
    const dx = x - b.x;
    const dz = z - b.z;
    const c = Math.cos(b.yaw);
    const s = Math.sin(b.yaw);
    return Math.abs(dx * c - dz * s) <= b.w / 2 + margin && Math.abs(dx * s + dz * c) <= b.d / 2 + margin;
  }

  /**
   * Send an infantry stack into a building. `face` (yaw): the way the order pointed (a
   * right-drag onto the house) — the windows looking that way are manned first; without it,
   * the ones toward the enemy's side of the field.
   */
  garrison(stack, b, face = null) {
    if (stack.entered === b) {
      // already in: a new direction re-mans the windows that way
      if (face == null) return;
      stack.garrisonFace = face;
      for (const u of stack.units) this.game.cover.release(u);
      return this.enter(stack, b);
    }
    const free = this.windows(b).filter((s) => !s.occupant || !s.occupant.alive).length;
    const squads = this.game.world.stacks.filter((o) => o !== stack && o.alive && (o.garrison === b || o.entered === b)).length;
    if (!free || squads >= this.capacity(b)) return this.game.tell(stack.faction, `The ${b.name} is full${this.capacity(b) > 1 ? ' (two squads)' : ''}`);
    if (stack.entered) this.exit(stack);
    const door = this.door(b, stack.anchor);
    stack.ai.moveTo(door, { hold: true, ordered: this.game.isHuman(stack.faction) });
    stack.garrison = b; // after moveTo, which clears it
    stack.garrisonFace = face;
    this.game.tell(stack.faction, `${stack.name} moving into the ${b.name}`);
  }

  /** Squads a building takes: two in a big one (18 windows or more: town hall, church, station, big town houses), else one. */
  capacity(b) {
    return this.windows(b).length >= 18 ? 2 : 1;
  }

  /** The window positions of a building: its inside wall cover spots. */
  windows(b) {
    return (b.windows ??= this.game.cover.spots.filter((s) => s.interior === b));
  }

  /**
   * The free windows `n` men of `faction` would man in `b`, best first: those looking most
   * squarely toward `face` (default: the enemy's side of the field), then the sides.
   */
  pickWindows(b, n, face, faction, all = false) {
    let yaw = face;
    if (yaw == null) {
      const foe = Object.entries(this.game.world.bases).find(([f]) => f !== faction)?.[1];
      yaw = foe ? Math.atan2(foe.x - b.x, foe.z - b.z) : 0;
    }
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const out = (w) => -(w.dirX * fx + w.dirZ * fz); // a window's spot faces the wall: out is -dir
    // front and side windows only: a man at a back window just watches the wrong way — the rest
    // wait in the room (enter()) until a new order points the squad elsewhere
    return this.windows(b).filter((w) => (!w.occupant || !w.occupant.alive) && (all || out(w) > -0.3)).sort((a, c) => out(c) - out(a)).slice(0, n);
  }

  /** A point just outside the building on the side facing `from`. */
  door(b, from) {
    const dx = from.x - b.x;
    const dz = from.z - b.z;
    const d = Math.hypot(dx, dz) || 1;
    const r = Math.max(b.w, b.d) / 2 + 3;
    return { x: b.x + (dx / d) * r, z: b.z + (dz / d) * r };
  }

  /** Upgrade `b` for `faction` (on every machine: the host sends it on). */
  upgrade(b, kind, faction) {
    const g = this.game;
    g.netEvent('house', b.index, kind, faction);
    if (kind === 'sandbag') {
      b.fortified = true;
      const parts = [];
      for (const [turn, off, len] of [[0, b.d / 2 + 0.45, b.w], [0, -(b.d / 2 + 0.45), b.w], [Math.PI / 2, b.w / 2 + 0.45, b.d], [Math.PI / 2, -(b.w / 2 + 0.45), b.d]]) {
        g.construction.bagRows({ x: b.x, z: b.z, yaw: b.yaw + turn }, off, len, 3, parts);
      }
      b.bags = g.construction.addMesh(parts);
    } else if (kind === 'aid') {
      b.aid = { faction, next: g.time, medic: null };
      const [x, z] = g.construction.local({ x: b.x, z: b.z, yaw: b.yaw }, 0, b.d / 2 + 0.05); // a red cross by the door
      const y = g.terrain.heightAt(x, z) + 2.2;
      b.sign = g.construction.addMesh([
        P.box(1.2, 1.2, 0.05, { x, y, z, ry: b.yaw, color: 0xf2f2ee }),
        P.box(0.85, 0.25, 0.07, { x, y, z, ry: b.yaw, color: 0xc8202a }),
        P.box(0.25, 0.85, 0.07, { x, y, z, ry: b.yaw, color: 0xc8202a }),
      ]);
    }
  }

  /** Aid stations keep their medic jeep (the host only: the jeep is a stack like any other). */
  updateAid() {
    const g = this.game;
    if (g.net?.isClient) return;
    for (const b of this.list) {
      const a = b.aid;
      if (!a || b.collapsed || a.medic?.alive || g.time < a.next) continue;
      if (a.medic) { a.medic = null; a.next = g.time + AID_EVERY; continue; } // lost: the next later
      const [x, z] = g.construction.local({ x: b.x, z: b.z, yaw: b.yaw }, 0, b.d / 2 + 5);
      a.medic = g.spawnStack('ambulance', a.faction, { x, z }, b.yaw, `${b.name} medics`);
      a.medic.autonomous = true; // (the station's: it goes to the wounded by itself)
      g.tell(a.faction, `Aid station in the ${b.name}: a medic jeep is ready`);
    }
  }

  /** Stacks on their way in go in once they're at the door. */
  update() {
    this.updateAid();
    for (const s of this.game.world.stacks) {
      if (!s.alive) continue;
      // a new order (moveTo clears garrison) brings them out first
      if (s.entered && s.garrison !== s.entered) this.exit(s);
      const b = s.garrison;
      if (!b || s.entered || b.collapsed || !s.usesCover) continue;
      // at the door — or as near as it got (a yard wall or a hedge round the house) and stopped there
      const d = Math.hypot(s.anchor.x - b.x, s.anchor.z - b.z);
      const near = Math.max(b.w, b.d) / 2 + 7;
      if (d < near || (!s.moveTarget && d < near + 6)) this.enter(s, b);
    }
  }

  /** Everyone in: a window each (facing out), the rest inside the room. */
  enter(s, b) {
    const cover = this.game.cover;
    const men = s.units.filter((u) => u.alive).length;
    const shared = this.game.world.stacks.some((o) => o !== s && o.alive && o.entered === b); // the second squad in: the back windows too (all round)
    const free = this.pickWindows(b, men, s.garrisonFace, s.faction, shared); // the side that matters first
    const terrain = this.game.terrain;
    let i = 0;
    for (const u of s.units) {
      if (!u.alive) continue;
      const w = free[i++];
      if (w) {
        cover.claim(w, u);
        u.window = w;
        u.pos.set(w.x, w.y, w.z);
      } else {
        // no window left: wait in the room, a step from the middle
        const x = b.x + (Math.random() - 0.5) * b.w * 0.4;
        const z = b.z + (Math.random() - 0.5) * b.d * 0.4;
        u.window = { x, y: terrain.heightAt(x, z), z, room: true };
        cover.release(u);
        u.pos.set(x, u.window.y, z);
      }
      u.dest.copy(u.pos);
      u.vel.set(0, 0, 0);
      u.yaw = w ? Math.atan2(-w.dirX, -w.dirZ) : u.yaw; // looking out of the window
    }
    s.entered = b;
    s.anchor.set(b.x, s.anchor.y, b.z);
    s.moveTarget = null;
    if (s.ai.state !== 'Defend') s.ai.defend();
    if (s.garrisonFace != null) s.facing = s.holdFacing = s.garrisonFace;
    this.game.tell(s.faction, `${s.name} is in the ${b.name}${i > free.length ? ` — ${i - free.length} wait inside` : ''}`);
  }

  /** Out of the building, onto the side they came in by. */
  exit(s) {
    const b = s.entered;
    s.entered = null;
    if (!b) return;
    const out = this.door(b, this.game.world.bases[s.faction] ?? s.anchor);
    for (const u of s.units) {
      if (!u.window) continue;
      u.window = null;
      this.game.cover.release(u);
      if (!u.alive) continue;
      u.pos.set(out.x + (Math.random() - 0.5) * 4, 0, out.z + (Math.random() - 0.5) * 4);
      u.pos.y = this.game.terrain.heightAt(u.pos.x, u.pos.z);
      u.dest.copy(u.pos);
    }
    return out;
  }

  /** Leave (E, or the badge): out, and hold just outside. */
  leave(s) {
    const out = this.exit(s) ?? this.door(s.garrison, this.game.world.bases[s.faction] ?? s.anchor);
    s.garrison = null;
    s.ai.moveTo(out, { hold: true, ordered: this.game.isHuman(s.faction) });
  }

  /** A high-explosive burst at `point` (damage, blast radius): wear down buildings it hits. */
  blast(point, damage, radius) {
    for (const b of this.list) {
      if (b.collapsed) continue;
      const reach = Math.hypot(b.w, b.d) / 2 + radius;
      const d = Math.hypot(point.x - b.x, point.z - b.z);
      if (d > reach) continue;
      b.hp -= damage * (d < reach - radius ? 1 : 0.5);
      this.game.effects.dust(point, 2.5);
      if (b.hp <= 0) this.collapse(b);
    }
  }

  collapse(b) {
    const game = this.game;
    game.quietly(() => this.collapseVisual(b)); // every machine shows the collapse itself
    // the people inside
    for (const s of game.world.stacks) {
      if (s.garrison === b) s.garrison = null;
      if (s.entered === b) { s.entered = null; for (const u of s.units) u.window = null; }
      if (!s.usesCover) continue;
      for (const u of s.units) {
        if (!u.alive || !this.inside(b, u.pos.x, u.pos.z)) continue;
        if (Math.random() < 0.55) u.receiveDamage(400, null, 1);
        else u.suppress?.(1.5);
      }
    }
    game.netEvent('collapse', b.index);
    // the ruin burns for a few minutes: flames and a smoke column nobody sees through
    const y = game.terrain.heightAt(b.x, b.z);
    game.effects.burn({ x: b.x, y: y + 1, z: b.z }, BURN.time, Math.max(b.w, b.d) / 6);
    game.smoke?.add(b.x, b.z, { radius: Math.max(b.w, b.d) * BURN.smoke, duration: BURN.time });
    game.bus.emit('building:collapsed', b);
    game.announce(`The ${b.name} collapses!`);
  }

  /** The walls coming down: rubble, lower cover, dust and noise (no casualties — that's collapse()). */
  collapseVisual(b) {
    if (b.collapsed) return;
    const game = this.game;
    b.collapsed = true;
    // walls slump into a rubble pile: squash the meshes toward the ground
    for (const m of b.meshes) {
      m.scale.y = 0.3;
      m.position.y = b.ground * 0.7;
    }
    for (const c of b.colliders) c.top = Math.min(c.top, c.y + 0.6 + 0.85);
    for (const s of game.cover.spots) if (s.collider.building === b) { s.height = s.collider.top - s.y; s.interior = null; }
    // dust and debris
    for (let i = 0; i < 5; i++) {
      const p = { x: b.x + (Math.random() - 0.5) * b.w, y: b.ground + 1, z: b.z + (Math.random() - 0.5) * b.d };
      game.effects.explosion(p, 0.9, { ground: true, fire: 0.3 });
    }
    game.audio.play('explosion.big', { x: b.x, y: b.ground, z: b.z }, { volume: 1 });
  }
}
