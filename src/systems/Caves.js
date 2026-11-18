// Caves and tunnels (Iwo Jima: the Imperial Army's island fortress). The map's `caves` — { owner, list: [{ x, z, name }] } —
// are cave mouths dug into the rock; between them run tunnels. A squad of the owner's standing at a mouth (NEAR m) can go
// underground (the Tunnel order, or the AI when it is pinned or breaking) and come out at another mouth after the walk
// through the rock (WALK m/s, plus the climb in and out): unseen and out of reach on the way — the enemy sees it vanish
// here and appear there. Host-side; a co-op guest sees it move (the host's snapshot).
import { PropBuilder } from '../world/Props.js';
import { enemyOf } from '../data/factions.js';

const NEAR = 35;   // m from a mouth to go in
const WALK = 4;    // m/s underground (the galleries were dug for it: quicker than across the open, under fire)
const IN_OUT = 6;  // s to get in and out

export class Caves {
  constructor(game) {
    this.game = game;
    const c = game.map.caves;
    this.owner = c?.owner ?? null;
    this.list = c?.list ?? [];
    this.t = 0;
    if (!this.list.length) return;
    const props = new PropBuilder({ scene: game.scene, terrain: game.terrain, cover: game.cover, seed: 31 });
    for (const m of this.list) { // a rocky mound, the dark mouth on its side toward the sea (the island's south)
      const y = game.terrain.heightAt(m.x, m.z);
      props.boulder({ x: m.x, z: m.z - 3, radius: 4.5 });
      props.box('plain', m.x, y + 1.1, m.z + 1.4, 2.6, 2.2, 0.6, 0, 0x0c0b0a);
      props.box('plain', m.x, y + 2.35, m.z + 1.4, 3.4, 0.4, 1.0, 0, 0x3c3832); // (the lintel of logs and rock over it)
    }
    props.finish();
  }

  /** The cave mouth nearest `p` within `r` m (index), or -1. */
  mouthNear(p, r = NEAR) {
    let best = -1, bd = r;
    this.list.forEach((m, i) => { const d = Math.hypot(m.x - p.x, m.z - p.z); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  /** May stack `s` go underground here (the owner's infantry, at a mouth, not already in)? */
  canEnter(s) {
    return !!this.list.length && s.alive && s.usesCover && s.faction === this.owner && !s.tunnel && this.mouthNear(s.centroid) >= 0;
  }

  /** Into the tunnels at the nearest mouth, out at mouth `to` (index). */
  enter(s, to) {
    const g = this.game, from = this.mouthNear(s.centroid), dest = this.list[to];
    if (from < 0 || !dest || from === to) return false;
    const a = this.list[from], walk = Math.hypot(dest.x - a.x, dest.z - a.z) / WALK + IN_OUT;
    s.tunnel = { to, out: g.time + walk };
    s.ai.idle();
    s.placeAt(dest.x, dest.z + 6, s.facing); // (they will come out here: waiting inside the mouth meanwhile)
    for (const u of s.units) { u.target = null; u.spotted = false; }
    if (s.faction === g.playerFaction) g.tell(s.faction, `${s.name}: into the tunnels — out at ${dest.name} in ${Math.ceil(walk)} s`);
    return true;
  }

  update(dt) {
    const g = this.game;
    if (!this.list.length || g.net?.isClient) return;
    for (const s of g.world.stacks) {
      if (!s.tunnel) continue;
      if (!s.alive) { s.tunnel = null; continue; }
      if (g.time >= s.tunnel.out) {
        const m = this.list[s.tunnel.to];
        s.tunnel = null;
        if (s.faction === g.playerFaction) g.tell(s.faction, `${s.name}: out of the tunnels at ${m.name}`);
      }
    }
    if ((this.t += dt) < 2) return;
    this.t = 0;
    // the AI: a squad of the owner's at a mouth that is pinned or breaking goes back through the rock — out at the mouth
    // furthest from the enemy within a walk (it fights on from there)
    for (const s of g.world.stacksOf(this.owner)) {
      if (g.isHuman?.(this.owner) && g.mine?.(s)) continue;
      if (!this.canEnter(s)) continue;
      const alive = s.units.filter((u) => u.alive);
      const pinned = alive.filter((u) => u.suppression > 0.8).length >= alive.length * 0.5;
      if (!(pinned || s.morale < 0.35)) continue;
      const foes = g.world.combatants(enemyOf(this.owner));
      const here = this.mouthNear(s.centroid);
      let best = -1, bestD = 0;
      this.list.forEach((m, i) => {
        if (i === here || Math.hypot(m.x - this.list[here].x, m.z - this.list[here].z) > 700) return;
        const d = Math.min(...foes.map((u) => Math.hypot(u.pos.x - m.x, u.pos.z - m.z)), 1e4);
        if (d > bestD) { bestD = d; best = i; }
      });
      if (best >= 0 && bestD > 120) this.enter(s, best);
    }
  }
}
