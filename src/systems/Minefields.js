// Moored mines at sea (1918: the North Sea maps' `minefields`, and what the minelayers lay). Each side
// knows its own fields — it sees its mines, and its ships keep to the gaps (they don't set them off) — and
// knows nothing of the other's until a ship strikes one: then the mines round the blast are found and
// marked. A minesweeper under way (`stats.sweeper`: her sweep's reach, m) cuts every enemy mine she
// passes and finds the ones a little further off. A minelayer (`stats.minelayer`: { count, spacing })
// ordered to lay (Orders layMines) drops one off her stern every `spacing` m while she's under way.
// The fields are seeded (host and guest lay the same); the host decides everything after that and the
// guest copies it (net event 'mine').
import * as THREE from 'three';
import { mulberry32 } from '../core/math.js';

const REACH = 10;          // m from a mine to a hull (plus her radius) that sets it off
const DAMAGE = 1800;       // a destroyer's back broken; the big ships a bad hole (and more, below)
const BIG = 0.1;           // and a tenth of her hit points besides (Audacious went down to one in 1914)
const FOUND = 350;         // m round a blast: the rest of that field is found
const FINDS = 2.5;         // a sweeper finds mines out to this many times her sweep's reach

export class Minefields {
  constructor(game) {
    this.game = game;
    this.mines = [];
    this.next = 1;
    for (const [k, o] of (game.map.minefields ?? []).entries()) this.field(o, k);
    this.dirty = true;
    this.mesh = null;
  }

  /** A map's field: `count` mines over a w × d box at (x, z) turned `yaw`, none in the `gaps` (x offsets, `gap` m wide) nor in water too shallow for one. */
  field(o, k) {
    const g = this.game, r = mulberry32(o.seed ?? 1918 + k), level = g.world.river?.level ?? 0;
    const c = Math.cos(o.yaw ?? 0), s = Math.sin(o.yaw ?? 0);
    for (let i = 0, n = 0; n < o.count && i < o.count * 20; i++) {
      const a = (r() - 0.5) * o.w, b = (r() - 0.5) * o.d;
      if ((o.gaps ?? []).some((gx) => Math.abs(a - gx) < (o.gap ?? 80) / 2)) continue;
      const x = o.x + a * c + b * s, z = o.z - a * s + b * c;
      if (level - g.terrain.heightAt(x, z) < 5) continue;
      this.mines.push({ id: this.next++, x, z, f: o.owner, live: true, seen: {} });
      n++;
    }
  }

  /** The live enemy mine faction `f` knows of nearest (x, z) within `within` m, and how far: { x, z, d } or null. */
  nearestKnown(x, z, f, within) {
    let best = null;
    for (const m of this.mines) {
      if (!m.live || m.f === f || !m.seen[f]) continue;
      const d = Math.hypot(m.x - x, m.z - z);
      if (d < within && (!best || d < best.d)) best = { x: m.x, z: m.z, d };
    }
    return best;
  }

  /** Can faction `f` see mine `m`? (its own, or one it has found) */
  known(m, f) { return m.f === f || !!m.seen[f]; }

  update(dt) {
    const g = this.game;
    if (!g.net?.isClient) this.host(dt);
    if (this.dirty) this.draw();
  }

  host(dt) {
    const g = this.game;
    const ships = g.world.stacks.filter((s) => s.alive && s.stats.naval && s.units[0]?.alive);
    for (const s of ships) {
      const u = s.units[0], speed = Math.hypot(u.vel.x, u.vel.z);
      // a minelayer laying: one off the stern every `spacing` m run
      const ml = s.stats.minelayer;
      if (ml && s.laying && speed > 1) {
        s.minesLeft ??= ml.count;
        s.layRun = (s.layRun ?? 0) + speed * dt;
        if (s.layRun >= ml.spacing && s.minesLeft > 0) {
          s.layRun = 0;
          s.minesLeft--;
          const back = (s.type.hull?.length ?? 60) / 2 + 4;
          this.lay(u.pos.x - Math.sin(u.yaw) * back, u.pos.z - Math.cos(u.yaw) * back, s.faction);
          if (!s.minesLeft) { s.laying = false; g.tell(s.faction, `${s.name}: all mines laid`); }
        }
      }
      // a sweeper under way: cuts the enemy's mines in her sweep, finds those a little further off
      const sw = s.stats.sweeper;
      if (sw && speed > 1) {
        let cut = 0;
        for (const m of this.mines) {
          if (!m.live || m.f === s.faction) continue;
          const d = Math.hypot(u.pos.x - m.x, u.pos.z - m.z);
          if (d < sw) { this.remove(m, false); cut++; } else if (d < sw * FINDS && !m.seen[s.faction]) this.see(m, s.faction);
        }
        if (cut && (s.sweptT ?? 0) <= g.world.time) { s.sweptT = g.world.time + 15; g.tell(s.faction, `${s.name}: mines swept`); }
      }
      // a hull over an enemy mine
      if (s.stats.hover) continue;
      for (const m of this.mines) {
        if (!m.live || m.f === s.faction || Math.hypot(u.pos.x - m.x, u.pos.z - m.z) > REACH + u.radius) continue;
        this.remove(m, true);
        s.damageUnit(u, DAMAGE + u.maxHp * BIG, null, 1);
        g.tellBoth(s.faction, `${s.name}: struck a mine!`, `${s.name} has struck one of our mines`);
        for (const o of this.mines) if (o.live && o.f === m.f && !o.seen[s.faction] && Math.hypot(o.x - m.x, o.z - m.z) < FOUND) this.see(o, s.faction);
        break;
      }
    }
  }

  lay(x, z, f, id = this.next) {
    this.next = Math.max(this.next, id + 1);
    this.mines.push({ id, x, z, f, live: true, seen: {} });
    this.dirty = true;
    this.game.netEvent('mine', 'lay', id, Math.round(x * 10) / 10, Math.round(z * 10) / 10, f);
  }

  /** A mine gone: cut by a sweep, or blown under a hull (`boom`: the column of water). */
  remove(m, boom) {
    const g = this.game;
    m.live = false;
    this.dirty = true;
    if (boom) {
      const pos = { x: m.x, y: g.world.river?.level ?? 0, z: m.z };
      g.effects.waterSplash?.(pos, 3.5);
      g.effects.explosion?.(pos, 2, { ground: false });
      g.audio?.play('explosion', pos, { volume: 1 });
    }
    g.netEvent('mine', boom ? 'boom' : 'cut', m.id);
  }

  see(m, f) {
    m.seen[f] = true;
    this.dirty = true;
    this.game.netEvent('mine', 'seen', m.id, f);
  }

  /** The guest's copy of the host's change (net event 'mine'). */
  net(op, id, a, b, c) {
    const m = this.mines.find((q) => q.id === id);
    if (op === 'lay') { if (!m) { this.mines.push({ id, x: a, z: b, f: c, live: true, seen: {} }); this.next = Math.max(this.next, id + 1); } }
    else if (op === 'seen') { if (m) m.seen[a] = true; }
    else if (m?.live) {
      m.live = false;
      if (op === 'boom') { const pos = { x: m.x, y: this.game.world.river?.level ?? 0, z: m.z }; this.game.effects.waterSplash?.(pos, 3.5); this.game.effects.explosion?.(pos, 2, { ground: false }); }
    }
    this.dirty = true;
  }

  /** The mines this player knows of: horned spheres awash, each in a ring on the water as wide as it reaches (yours in your colour, the enemy's found ones red). */
  draw() {
    this.dirty = false;
    const g = this.game, me = g.playerFaction, level = g.world.river?.level ?? 0;
    const shown = this.mines.filter((m) => m.live && this.known(m, me));
    if (!this.mesh) {
      const cap = Math.max(64, this.mines.length + 200);
      this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshStandardMaterial({ color: 0x1e2224, roughness: 0.5, metalness: 0.4 }), cap);
      const ring = new THREE.RingGeometry(REACH - 2.5, REACH, 24).rotateX(-Math.PI / 2);
      this.rings = new THREE.InstancedMesh(ring, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false }), cap);
      this.mesh.frustumCulled = this.rings.frustumCulled = false;
      g.scene.add(this.mesh, this.rings);
    }
    const mat = new THREE.Matrix4(), col = new THREE.Color();
    let n = 0;
    for (const m of shown) {
      if (n >= this.mesh.instanceMatrix.count) break;
      this.mesh.setMatrixAt(n, mat.makeTranslation(m.x, level - 0.2, m.z));
      this.rings.setMatrixAt(n, mat.makeTranslation(m.x, level + 0.15, m.z));
      this.rings.setColorAt(n, col.set(m.f === me ? (me === 'nato' ? 0x3f7fe0 : 0xd23a2a) : 0xff8a1a));
      n++;
    }
    this.mesh.count = this.rings.count = n;
    this.mesh.instanceMatrix.needsUpdate = this.rings.instanceMatrix.needsUpdate = true;
    if (this.rings.instanceColor) this.rings.instanceColor.needsUpdate = true;
  }
}
