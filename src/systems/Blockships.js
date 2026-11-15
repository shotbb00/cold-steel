// The blockships (the coastal map's `landing.blockships`: Zeebrugge, 1918). Old cruisers filled with concrete come in
// from the sea at `t`; steered round the Mole-head into the canal mouth and sunk there (Orders 'scuttle', or by the
// defence's guns), each one inside the `zone` blocks it — `need` of them shut the U-boats in, and the landing has
// won. Sunk anywhere else she is wasted. When the side that lands is the computer's, it steers them itself along the
// map's `route`, scuttling each one as she enters the zone. The host decides; a guest sees the ships as any other.
const LOOK = 120; // m ahead along the route she steers at

export class Blockships {
  constructor(game) {
    this.game = game;
    this.o = game.map.landing.blockships;
    this.ships = [];
    this.blocked = 0;
    this.wasted = 0;
    this.spawned = false;
  }

  /** The side that lands (its base is out at sea). */
  get side() { return ['nato', 'pact'].find((f) => this.game.landing?.lands(f)) ?? 'nato'; }
  inZone(x, z) { const Z = this.o.zone; return x > Z.x0 && x < Z.x1 && z > Z.z0 && z < Z.z1; }
  won() { return this.blocked >= (this.o.need ?? 2); }

  update(dt) {
    const g = this.game, f = this.side;
    if (g.net?.isClient) return;
    if (!this.spawned && g.time >= this.o.t) {
      this.spawned = true;
      for (const p of this.o.ships) {
        const s = g.spawnStack('blockship', f, { x: p.x, z: p.z }, p.facing ?? Math.PI, p.name);
        this.ships.push({ s, leg: 0, counted: false, x: p.x, z: p.z }); // (leg: m along the route)
      }
      g.tellBoth(f, this.o.say ?? 'The blockships are coming in: round the Mole-head, into the canal mouth between the piers — and scuttle them there', this.o.sayOther ?? 'Ships coming round the Mole-head — they are making for the canal!');
    }
    const ai = !g.net && f !== g.playerFaction; // (the computer's landing steers its own)
    for (const b of this.ships) {
      if (b.counted) continue;
      const s = b.s, u = s.units[0];
      if (s.alive && u?.alive) {
        b.x = u.pos.x; b.z = u.pos.z;
        if (ai) this.steer(b, u, dt);
        continue;
      }
      b.counted = true; // gone down: where?
      if (this.inZone(b.x, b.z)) {
        this.blocked++;
        g.tellBoth(f, `${s.name} lies sunk in the canal mouth — ${this.blocked} of ${this.o.need ?? 2}`, `${s.name} has gone down in the canal entrance!`);
      } else {
        this.wasted++;
        g.tellBoth(f, `${s.name} went down short of the canal — wasted`, `${s.name} sunk before she reached the canal`);
      }
    }
  }

  /** The computer's blockship: along the route, and scuttled as soon as she is inside the zone. */
  steer(b, u, dt) {
    const r = this.o.route;
    const inside = this.inZone(u.pos.x, u.pos.z);
    b.stuck = inside && Math.hypot(u.vel.x, u.vel.z) < 0.5 ? (b.stuck ?? 0) + dt : 0;
    if (inside && (u.pos.z < (this.o.scuttleZ ?? Infinity) || b.stuck > 4)) { this.scuttle(b.s); return; } // (well into the mouth — or jammed in it: that blocks it too)
    // along the route as a line, not from point to point (her turning circle would never hit them): where she is on it,
    // never going back (`b.leg`: metres along it), and a point LOOK further on to steer at
    let acc = 0, best = { d: Infinity, at: b.leg ?? 0 };
    for (let i = 0; i < r.length - 1; i++) {
      const a = r[i], c = r[i + 1], L = Math.hypot(c.x - a.x, c.z - a.z);
      const t = Math.max(0, Math.min(1, ((u.pos.x - a.x) * (c.x - a.x) + (u.pos.z - a.z) * (c.z - a.z)) / (L * L)));
      const d = Math.hypot(u.pos.x - (a.x + (c.x - a.x) * t), u.pos.z - (a.z + (c.z - a.z) * t));
      if (d < best.d && acc + t * L >= (b.leg ?? 0) - 40) best = { d, at: acc + t * L };
      acc += L;
    }
    b.leg = Math.max(b.leg ?? 0, best.at);
    let want = Math.min(acc, b.leg + LOOK), p = r[r.length - 1];
    for (let i = 0, run = 0; i < r.length - 1; i++) {
      const a = r[i], c = r[i + 1], L = Math.hypot(c.x - a.x, c.z - a.z);
      if (run + L >= want) { const t = (want - run) / L; p = { x: a.x + (c.x - a.x) * t, z: a.z + (c.z - a.z) * t }; break; }
      run += L;
    }
    if (!b.s.moveTarget || Math.hypot(b.s.moveTarget.x - p.x, b.s.moveTarget.z - p.z) > 8) b.s.ai.moveTo({ x: p.x, z: p.z }, { ordered: true });
  }

  /** Open the sea cocks and fire the charges: she settles where she lies (Orders 'scuttle'). */
  scuttle(s) {
    const g = this.game, u = s.units[0];
    if (!s.alive || !u?.alive || s.scuttled) return;
    s.scuttled = true;
    const b = this.ships.find((q) => q.s === s);
    if (b) { b.x = u.pos.x; b.z = u.pos.z; }
    g.effects?.explosion?.({ x: u.pos.x, y: (g.world.river?.level ?? 0) + 1, z: u.pos.z }, 2.5, { ground: false });
    g.audio?.play('explosion', { x: u.pos.x, y: 2, z: u.pos.z }, { volume: 1 });
    s.damageUnit(u, u.hp + 1, null, 1);
  }
}

