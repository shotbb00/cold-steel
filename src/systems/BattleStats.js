// Keeps the record of a battle for the after-action report (ui/AfterAction.js), and hands out
// veterancy: a stack that kills earns experience (UnitStack.gainXp).
//   per side:  men and vehicles lost (by type), stacks destroyed, kills, rounds fired, CP spent,
//              reinforcements, villages taken, air strikes flown and helicopters lost,
//              structures built, mines set off
//   per stack: kills (credited to the stack that fired, or to the air strike, the minefield …)
//   timeline:  every 10 s each side's front strength and villages held, plus the moments that
//              mattered (captures, vehicles knocked out, helicopters down, houses collapsing)
// Runs where the simulation runs (single player, multiplayer host); report() is plain data, so
// the host sends it to the client with the battle's end.
import { enemyOf } from '../data/factions.js';

const SAMPLE = 10;

const blank = () => ({
  menLost: 0, vehiclesLost: 0, lostByType: {}, stacksLost: 0, kills: 0, shots: 0, cpSpent: 0,
  reinforcements: 0, captures: 0, airStrikes: 0, helisLost: 0, built: 0, minesSetOff: 0,
});

/** XP a kill is worth: the victim's share of its stack's cost. */
export const killValue = (stack) => (stack.type.cost ?? 150) / stack.units.length / 30;

export class BattleStats {
  constructor(game) {
    this.game = game;
    this.sides = { nato: blank(), pact: blank() };
    this.stacks = new Map();   // stack id → { name, faction, type, kills, rank, alive }
    this.timeline = [];        // { t, strength: {f: n}, points: {f: n} }
    this.events = [];          // { t, faction, kind, text }
    this.sampleT = 0;
    const bus = game.bus;
    bus.on('unit:death', (e) => this.onDeath(e));
    bus.on('stack:destroyed', (s) => { this.sides[s.faction].stacksLost++; this.entry(s).alive = false; });
    bus.on('point:owner', ({ point, owner }) => {
      if (!owner) return;
      this.sides[owner].captures++;
      this.event(owner, 'capture', `${point.name} taken`);
    });
    bus.on('airstrike', ({ faction }) => { this.sides[faction].airStrikes++; });
    bus.on('heli:down', ({ faction, name }) => {
      this.sides[faction].helisLost++;
      this.event(faction, 'heli', `${name} shot down`);
    });
    bus.on('built', (site) => { this.sides[site.faction].built++; });
    bus.on('mine', ({ unit }) => { this.sides[unit.faction].minesSetOff++; });
    bus.on('wave', ({ faction, units }) => { this.sides[faction].reinforcements += units.length; });
    bus.on('building:collapsed', (b) => this.event(null, 'collapse', `${b.name} collapsed`));
    // rounds fired and command points spent
    const ps = game.projectiles;
    const spawn = ps.spawn.bind(ps);
    ps.spawn = (o) => {
      if (o.damage > 0 && this.sides[o.faction]) this.sides[o.faction].shots++;
      return spawn(o);
    };
    const spend = game.spend.bind(game);
    game.spend = (faction, cost) => {
      const ok = spend(faction, cost);
      if (ok && this.sides[faction]) this.sides[faction].cpSpent += cost;
      return ok;
    };
    bus.on('stack:spawned', (s) => this.entry(s));
  }

  entry(s) {
    let e = this.stacks.get(s.id);
    if (!e) {
      e = { name: s.name, faction: s.faction, type: s.type.shortName, kills: 0, rank: 0, alive: true };
      this.stacks.set(s.id, e);
    }
    return e;
  }

  event(faction, kind, text) {
    this.events.push({ t: Math.round(this.game.time), faction, kind, text });
  }

  onDeath({ stack, killer }) {
    const side = this.sides[stack.faction];
    if (stack.usesCover) side.menLost++;
    else {
      side.vehiclesLost++;
      this.event(stack.faction, 'vehicle', `${stack.type.shortName} knocked out`);
    }
    const type = stack.type.shortName;
    side.lostByType[type] = (side.lostByType[type] ?? 0) + 1;
    const foe = enemyOf(stack.faction);
    this.sides[foe].kills++;
    // credit: a stack, an air strike, a minefield … (anything with a name and a faction)
    if (killer?.faction === foe) {
      if (killer.units) {
        const e = this.entry(killer);
        e.kills++;
        if (!killer.stats?.structure) killer.gainXp?.(killValue(stack));
        e.rank = killer.rank ?? 0;
      } else {
        const key = `${foe}:${killer.name ?? 'other'}`;
        const e = this.stacks.get(key) ?? { name: killer.name ?? 'Other', faction: foe, type: killer.label ?? killer.kind ?? '', kills: 0, rank: 0, alive: true, support: true };
        e.kills++;
        this.stacks.set(key, e);
      }
    }
  }

  update(dt) {
    this.sampleT -= dt;
    if (this.sampleT > 0) return;
    this.sampleT = SAMPLE;
    this.sample();
  }

  sample() {
    const g = this.game;
    const ms = g.modeState;
    const strength = {};
    const points = {};
    for (const f of ['nato', 'pact']) {
      strength[f] = Math.round(ms?.strength?.[f] ?? g.world.stacksOf(f).reduce((a, s) => a + s.hpRatio * (s.type.cost ?? 150), 0));
      points[f] = ms?.points ? ms.points.owned(f) : 0;
    }
    this.timeline.push({ t: Math.round(g.time), strength, points });
  }

  /** Everything the report shows, as plain data. */
  report() {
    this.sample();
    for (const [id, e] of this.stacks) {
      const s = typeof id === 'number' ? this.game.world.stackById(id) : null;
      if (s) { e.rank = s.rank ?? e.rank; e.alive = s.alive; }
    }
    return {
      duration: Math.round(this.game.time),
      sides: this.sides,
      stacks: [...this.stacks.values()].filter((e) => e.kills > 0).sort((a, b) => b.kills - a.kills),
      timeline: this.timeline,
      events: this.events.slice(-40),
      maxStrength: this.game.modeState?.maxStrength ?? null,
    };
  }
}
