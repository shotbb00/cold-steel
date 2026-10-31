// Every player order as a plain, serialisable command. The interface (CommandSystem, minimap,
// reinforcement panel) builds them and calls issue(); run() carries them out for a faction.
// In single player and on a multiplayer host that happens at once; a multiplayer client sends
// them to the host, which runs them for the client's side (net/NetHost.js) — so both players'
// orders go through exactly the same code.
//   { t: 'hold', s: [ids] }                      { t: 'move', m: [[id, x, z], …], hold, face? (yaw) }
//   { t: 'attack', s: [ids], target: id }        { t: 'build', s: id, k: kind, x, z, yaw }
//   { t: 'unload', s: [ids] }                    { t: 'board', s: id, c: carrierId }
//   { t: 'garrison', s: [ids], b: buildingIndex, face? }{ t: 'popSmoke', s: [ids] }
//   { t: 'smoke', s: [ids], x, z }               { t: 'air', x, z, yaw, k: 'heli' | 'jet' | 'lift' }
//   { t: 'flare', s: [ids], x, z }               { t: 'buy', u: unitTypeId }
//   { t: 'leave', s: [ids] }                     (come out of a building)
//   { t: 'gas', x, z }                           (chemical fire mission, systems/Gas.js)
//   { t: 'cancelBuild', s: [ids] }               (call off their unfinished build orders)
//   { t: 'lineCharge', s: id, x, z }             (a mine-clearing line charge, Construction.fireLineCharge)
import { STRUCTURES } from '../systems/Construction.js';
import { planCover } from '../world/CoverPlan.js';

export class Orders {
  constructor(game) {
    this.game = game;
  }

  /** An order from this machine's player. Returns run()'s result (null on a client). */
  issue(cmd) {
    const net = this.game.net;
    if (net?.isClient) {
      net.sendOrder(cmd);
      return null;
    }
    return this.run(this.game.playerFaction, cmd, this.game.myOwner);
  }

  /**
   * Carry out `cmd` for `faction`, touching only that side's stacks — in co-op only those of
   * `owner` (the player who gave it); stacks it brings in become theirs.
   */
  run(faction, cmd, owner = null) {
    const g = this.game;
    const own = (id) => {
      const s = g.world.stackById(id);
      return s && s.alive && s.faction === faction && (!g.coop || !owner || s.owner === owner) ? s : null;
    };
    g.currentOwner = owner;
    try {
      return this.exec(g, faction, cmd, own);
    } finally {
      g.currentOwner = null;
    }
  }

  exec(g, faction, cmd, own) {
    const mine = (ids) => (ids ?? []).map(own).filter(Boolean);
    switch (cmd.t) {
      case 'hold':
        for (const s of mine(cmd.s)) s.ai.defend();
        return null;
      case 'move':
        for (const [id, x, z] of cmd.m ?? []) {
          const s = own(id);
          if (!s) continue;
          const face = Number.isFinite(cmd.face) ? cmd.face : null;
          s.ai.moveTo({ x, z }, { hold: !!cmd.hold, face });
          // infantry sent next to cover takes it — the spots the command view previewed
          const plan = s.moveTarget && planCover(g.world, s, s.moveTarget, face);
          if (plan) { s.ai.plannedSpots = plan; s.ai.holdOnArrival = true; }
        }
        return null;
      case 'attack': {
        const target = g.world.stackById(cmd.target);
        if (!target?.alive || target.faction === faction) return null;
        for (const s of mine(cmd.s)) s.ai.attack(target);
        return null;
      }
      case 'lineCharge': {
        const s = own(cmd.s);
        if (s?.stats.lineCharge) g.construction.fireLineCharge(s, cmd.x, cmd.z);
        return null;
      }
      case 'build': {
        const s = own(cmd.s);
        const def = STRUCTURES[cmd.k];
        if (!s || !def || (def.layer ? !s.stats.bridgeLayer : def.dozer ? !s.stats.dozer : !s.usesCover)) return null;
        if (def.engineers && !s.stats.engineer) return g.tell(faction, 'Only engineers can do that');
        if (def.layer && s.units[0]?.dropped) return g.tell(faction, `${s.name} has already laid its bridge`);
        if (cmd.k === 'demolish' && !g.map.bridgeAt?.(cmd.x, cmd.z)) return g.tell(faction, 'No bridge there to blow');
        if (!g.spend(faction, def.cost)) return g.tell(faction, `Not enough command points (${def.cost})`);
        if (!g.construction.place(cmd.k, cmd.x, cmd.z, cmd.yaw, faction, s)) {
          g.refund(faction, def.cost);
          g.tell(faction, def.layer ? 'Pick a spot on the river, away from the other crossings' : "Can't build there");
        }
        return null;
      }
      case 'unload':
        return mine(cmd.s).map((s) => { s.ai.halt(); return g.transport.unload(s); }).filter(Boolean);
      case 'board': {
        const squad = own(cmd.s);
        const carrier = own(cmd.c);
        if (squad && carrier) g.transport.board(squad, carrier);
        return null;
      }
      case 'garrison': {
        const b = g.buildings.list[cmd.b];
        if (!b || b.collapsed) return null;
        for (const s of mine(cmd.s)) if (s.usesCover) g.buildings.garrison(s, b, Number.isFinite(cmd.face) ? cmd.face : null);
        return null;
      }
      case 'leave':
        for (const s of mine(cmd.s)) if (s.garrison) g.buildings.leave(s);
        return null;
      case 'popSmoke':
        for (const s of mine(cmd.s)) {
          const u = s.units.find((v) => v.alive);
          s.ai.halt();
          if (u) s.popSmoke(u);
        }
        return null;
      case 'smoke':
        for (const s of mine(cmd.s)) {
          if (!(s.smokeRounds > 0)) continue;
          const d = Math.hypot(cmd.x - s.centroid.x, cmd.z - s.centroid.z);
          const range = s.unitStats(0).range;
          if (d > range) { g.tell(faction, `${s.name}: out of range (${range} m)`); continue; }
          s.ai.halt();   // a fire mission cancels the move: they stop, set up and fire
          s.smokeOrder = { x: cmd.x, z: cmd.z, left: 3, kind: 'smoke' };
          for (const u of s.units) u.retarget = 0;
        }
        return null;
      case 'flare':
        if (!g.conditions?.night) return g.tell(faction, 'Illumination rounds are for night battles');
        for (const s of mine(cmd.s)) {
          if (!(s.flareRounds > 0)) continue;
          const d = Math.hypot(cmd.x - s.centroid.x, cmd.z - s.centroid.z);
          const range = s.unitStats(0).range;
          if (d > range) { g.tell(faction, `${s.name}: out of range (${range} m)`); continue; }
          s.ai.halt();
          s.smokeOrder = { x: cmd.x, z: cmd.z, left: 1, kind: 'flare' };
          for (const u of s.units) u.retarget = 0;
          g.tell(faction, `${s.name}: illumination on the way (${s.flareRounds - 1} left)`);
          return null; // one flare per order
        }
        return null;
      case 'air':
        return g.air.call(faction, cmd.x, cmd.z, cmd.yaw ?? null, cmd.k ?? 'heli');
      case 'cancelBuild': {
        const ids = new Set(mine(cmd.s).map((s) => s.id));
        const jobs = g.construction.sites.filter((site) => site.faction === faction && ids.has(site.stackId));
        const back = jobs.reduce((n, site) => n + site.def.cost, 0);
        for (const site of jobs) g.construction.cancel(site);
        for (const s of mine(cmd.s)) if (jobs.some((site) => site.stackId === s.id)) s.ai.halt(); // stop where they are
        g.tell(faction, jobs.length ? `Order cancelled${back ? ` — ${back} CP back` : ''}` : 'Nothing to cancel');
        return null;
      }
      case 'gas':
        return g.gas.call(faction, cmd.x, cmd.z);
      case 'buy':
        return g.modeState?.buy?.(faction, cmd.u) ?? null;
      default:
        return null;
    }
  }
}
