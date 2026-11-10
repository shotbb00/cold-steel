// Every player order as a plain, serialisable command. The interface (CommandSystem, minimap,
// reinforcement panel) builds them and calls issue(); run() carries them out for a faction.
// In single player and on a multiplayer host that happens at once; a multiplayer client sends
// them to the host, which runs them for the client's side (net/NetHost.js) — so both players'
// orders go through exactly the same code.
//   { t: 'hold', s: [ids] }                      { t: 'move', m: [[id, x, z], …], hold, face? (yaw), q? (add a waypoint) }
//   { t: 'attack', s: [ids], target: id }        { t: 'build', s: id, k: kind, x, z, yaw }
//   { t: 'unload', s: [ids] }                    { t: 'board', s: id, c: carrierId }
//   { t: 'garrison', s: [ids], b: buildingIndex, face? }{ t: 'popSmoke', s: [ids] }
//   { t: 'smoke', s: [ids], x, z }               { t: 'air', x, z, yaw, k: 'heli' | 'jet' | 'lift' }
//   { t: 'fireMission', s: [ids], x, z }         (shells on the spot, from binoculars in direct control)
//   { t: 'flare', s: [ids], x, z }             { t: 'buy', u: unitTypeId, e?: road (base entry index), k?: squad kit (data/kits.js) }
//   { t: 'leave', s: [ids] }                     (come out of a building)
//   { t: 'barrage', x, z }                       (the Soviet Army's preparatory barrage, systems/Barrage.js)
//   { t: 'walze', s: [ids], x, z }               (the NVA's creeping barrage: its artillery, UnitStack.startBarrage)
//   { t: 'cancelBuild', s: [ids] }               (call off their unfinished build orders)
//   { t: 'lineCharge', s: id, x, z }             (a mine-clearing line charge, Construction.fireLineCharge)
//   { t: 'refill', s: [ids] }                    (depleted squads near supply take in new men for CP, UnitStack.refill)
//   { t: 'withdraw', s: [ids] }                  (back to base and off the field: frees the slot, half the price back)
//   { t: 'shipSpeed', s: [ids], v }              (ships' engine orders: slow / half / full / flank, UnitStack SHIP_SPEEDS)
//   { t: 'zigzag', s: [ids], on }                (ships weave either side of their course)
//   { t: 'formation', s: [ids], f }              (ships: 'ahead' line ahead, 'abreast' line abreast, 'screen' round the biggest, 'free')
//   { t: 'shipSmoke', s: [ids] }                 (destroyers and escorts lay a smoke screen for a minute)
//   { t: 'searchlight', s: [ids], on }           (ships at night: light the target up — and show yourself)
//   { t: 'radar', s: [ids], on }                 (1985 ships: radar on — see, and be heard — or silent: systems/Sensors.js)
//   { t: 'missileAt', s: [ids], x, z, n }        (1985 ships: n anti-ship missiles at a point — a bearing fix: systems/Missiles.js)
//   { t: 'damageControl', s: [ids], p }          (ships: 'flood' / 'fire' / 'repair' first, 'auto' all alike, 'counter' counter-flood the list)
import { unitCost } from '../data/doctrine.js';
import { promoteCost } from '../modes/pitched.js';
import { HOUSE_UPGRADES } from '../systems/Buildings.js';
import { RANKS } from '../entities/UnitStack.js';
import { enemyOf } from '../data/factions.js';
import { STRUCTURES, structureCost } from '../systems/Construction.js';
import { planCover } from '../world/CoverPlan.js';


/** What new men for `s`'s empty places cost: its price times the share missing. */
export const refillCost = (s) => Math.ceil(unitCost(s.type, s.army) * (s.missing / s.units.length));
export class Orders {
  constructor(game) {
    this.game = game;
  }

  /** An order from this machine's player. Returns run()'s result (null on a client). */
  issue(cmd) {
    const net = this.game.net;
    if (cmd.t === 'buy' && cmd.e === undefined) cmd.e = this.game.reinforceEntry ?? null; // the road picked in the reinforcement window
    if (cmd.t === 'buy' && cmd.k === undefined) cmd.k = this.game.reinforceKit ?? null;   // …and the rifle squads' kit
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
      return s && s.alive && !s.withdrawing && s.faction === faction && (!g.coop || !owner || s.owner === owner) ? s : null; // a withdrawing stack takes no more orders
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
        for (const s of mine(cmd.s)) {
          s.waypoints = null;
          if (s.moveTarget) { s.anchor.x = s.centroid.x; s.anchor.z = s.centroid.z; } // stop here, not at the end of the formation's slide
          s.ai.defend();
          s.smokeOrder = null; // (a fire mission, sustained fire: off)
          // vehicles halt each where it stands, not back into formation (ai/SoldierAI.js reads plannedSpots)
          if (!s.usesCover) s.ai.plannedSpots = new Map(s.units.filter((u) => u.alive).map((u) => [u, { x: u.pos.x, z: u.pos.z }]));
        }
        return null;
      case 'move':
        for (const [id, x, z] of cmd.m ?? []) {
          const s = own(id);
          if (!s) continue;
          if (g.deployment?.on && !s.stats.structure) { g.deployment.place(s, x, z, cmd.face ?? null); continue; } // deployment: placed there at once
          const face = Number.isFinite(cmd.face) ? cmd.face : null;
          // a waypoint: queued behind the route it's already on (StackAI takes the next on arrival)
          if (cmd.q && (s.moveTarget || s.waypoints?.length)) { (s.waypoints ??= []).push({ x, z, hold: !!cmd.hold, face }); continue; }
          if (s.station) { // a ship in formation: sent on with her leader, she keeps her place; sent alone, she leaves it
            if ((cmd.m ?? []).some(([lid]) => lid === s.station.lead)) continue;
            s.station = null;
          }
          s.waypoints = null;
          s.ai.moveTo({ x, z }, { hold: !!cmd.hold, face });
          // infantry sent next to cover takes it — the spots the command view previewed
          const plan = s.moveTarget && (s.usesCover ? planCover(g.world, s, s.moveTarget, face) : g.construction.planRevetments(s, s.moveTarget)); // cover, or dug-in vehicle positions
          if (plan) { s.ai.plannedSpots = plan; s.ai.holdOnArrival = true; }
        }
        return null;
      case 'attack': {
        for (const s of mine(cmd.s)) s.waypoints = null;
        const target = g.world.stackById(cmd.target);
        if (!target?.alive || target.faction === faction) return null;
        for (const s of mine(cmd.s)) {
          if (s.stats.cavalry && !s.stats.loose && s.startCharge(target)) continue; // 1806 horse: an attack order is a charge, after the enemy wherever it goes
          s.ai.attack(target);
        }
        return null;
      }
      case 'houseUpgrade': { // the house a squad holds: sandbags or an aid station, from the building budget (systems/Buildings.js)
        const s = own(cmd.s);
        const b = s?.entered;
        const up = HOUSE_UPGRADES[cmd.k];
        if (!b || !up) return g.tell(faction, 'Put a squad in the house first');
        if (cmd.k === 'sandbag' ? b.fortified : b.aid) return g.tell(faction, `The ${b.name} is ${up.label} already`);
        if (!g.spendFrom('build', faction, up.cost)) return g.tell(faction, `Not enough ${g.poolName('build')} (${up.cost})`);
        g.buildings.upgrade(b, cmd.k, faction);
        g.tell(faction, `The ${b.name} is ${up.label} now`);
        return null;
      }
      case 'shipSpeed': // ships' engine orders (UnitStack SHIP_SPEEDS)
        for (const s of mine(cmd.s)) if (s.stats.naval) s.shipSpeed = cmd.v;
        return null;
      case 'zigzag':
        for (const s of mine(cmd.s)) if (s.stats.naval && !s.stats.submarine) s.zigzag = !!cmd.on;
        return null;
      case 'formation': { // the biggest ship leads; the rest take their stations on her (UnitStack.keepStation)
        const ships = mine(cmd.s).filter((s) => s.stats.naval && !s.stats.submarine);
        for (const s of ships) s.station = null;
        if (cmd.f === 'free' || ships.length < 2) return null;
        const size = (s) => s.type.hull?.length ?? 100;
        const [lead, ...rest] = [...ships].sort((a, b) => (b.type.cost ?? 0) - (a.type.cost ?? 0) || size(b) - size(a));
        let back = size(lead) / 2;
        rest.forEach((s, i) => {
          let dx = 0, dz = 0;
          if (cmd.f === 'ahead') { dz = -(back + 130 + size(s) / 2); back = -dz + size(s) / 2; }
          else if (cmd.f === 'abreast') { dx = (i % 2 ? -1 : 1) * Math.ceil((i + 1) / 2) * 260; }
          else { // screen: a ring ahead and round the sides
            const r = size(lead) / 2 + 480;
            const a = rest.length === 1 ? 0 : (-1 + (2 * i) / (rest.length - 1)) * 2.1;
            dx = Math.sin(a) * r; dz = Math.cos(a) * r;
          }
          s.station = { lead: lead.id, dx, dz };
          s.waypoints = null;
        });
        g.tell(faction, `${lead.name} leads: ${{ ahead: 'line ahead', abreast: 'line abreast', screen: 'the screen closes round her' }[cmd.f] ?? cmd.f}`);
        return null;
      }
      case 'damageControl': // where a ship's damage control parties go first (UnitStack.shipUpkeep); counter-flooding rights a list
        for (const s of mine(cmd.s)) {
          if (!s.stats.naval) continue;
          for (const u of s.units) {
            if (!u.alive) continue;
            if (cmd.p === 'counter') {
              if (Math.abs(u.list ?? 0) < 0.02 || u.counterK != null) continue;
              u.counterK = 0;
              u.flood = (u.flood ?? 0) + 0.05; // (the price: water let in on the other side)
              g.tell(faction, `${s.name}: counter-flooding — coming upright`);
            } else u.dc = cmd.p === 'auto' ? null : cmd.p;
          }
        }
        return null;
      case 'radar': // 1985 ships: radar on (sees all a horizon and the islands let it — and every enemy hears it) or off
        for (const s of mine(cmd.s)) if (s.stats.radar) s.radarOn = !!cmd.on;
        return null;
      case 'missileAt': // 1985 ships: a missile salvo at a point (a bearing fix): the seekers find what's there
        for (const s of mine(cmd.s)) s.missileStrike?.(cmd.x, cmd.z, cmd.n ?? 2);
        return null;
      case 'searchlight': // ships at night: the beam on the target — she lights it up for everyone, and shows herself
        for (const s of mine(cmd.s)) if (s.stats.naval && !s.stats.submarine) s.searchlight = !!cmd.on;
        return null;
      case 'shipSmoke': // a smoke screen: a minute of it, then the generators need a while
        for (const s of mine(cmd.s)) {
          const sg = s.stats.smokeGen;
          if (!sg) continue;
          if ((s.smokeReady ?? 0) > g.world.time) { g.tell(faction, `${s.name}: smoke again in ${Math.ceil(s.smokeReady - g.world.time)} s`); continue; }
          s.smokeUntil = g.world.time + sg.last;
          s.smokeReady = s.smokeUntil + sg.cooldown;
        }
        return null;
      case 'subDepth': // a submarine: surface / periscope / deep (UnitStack.shipUpkeep)
        for (const s of mine(cmd.s)) {
          if (!s.stats.submarine) continue;
          for (const u of s.units) {
            if (cmd.d !== 'surface' && (u.depthMode ?? 'periscope') === 'surface' && u.alive) g.audio?.play('klaxon', u.pos, { volume: 0.8, throttle: 1 }); // dive, dive!
            u.depthMode = cmd.d;
          }
        }
        return null;
      case 'silent': // a submarine: silent running — half the speed, half as easy to hear
        for (const s of mine(cmd.s)) if (s.stats.submarine) s.silent = !!cmd.on;
        return null;
      case 'holdFire': // per stack: hold fire (only the attack target) or fire at will (the default)
        for (const s of mine(cmd.s)) { s.holdFire = !!cmd.on; for (const u of s.units) if (cmd.on && u.target) u.target = null; }
        return null;
      case 'sprint': // foot on the move: ~10 s at the run, then winded (slower) for 20 s; no second sprint till then
        for (const s of mine(cmd.s)) {
          if (!s.usesCover || !s.moveTarget || s.sprinting) continue;
          if ((s.windedUntil ?? 0) > g.world.time) { g.tell(faction, `${s.name} is still out of breath`); continue; }
          s.sprintUntil = g.world.time + 10;
          s.windedUntil = s.sprintUntil + 20;
        }
        return null;
      case 'promote': { // a pitched battle's setup: a rank for a price (modes/pitched.js)
        const st = g.modeState;
        if (!st?.setup) return null;
        for (const s of mine(cmd.s)) {
          const cost = promoteCost(g, s);
          if (cost == null) { g.tell(faction, `${s.name} is ${RANKS[s.rank].name} already`); continue; }
          if (!g.spend(faction, cost)) { g.tell(faction, `Not enough command points to promote ${s.name} (${cost})`); continue; }
          s.setXp(RANKS[s.rank + 1].xp);
          s.paid = (s.paid ?? 0) + cost;
          g.tell(faction, `${s.name} promoted: ${RANKS[s.rank].name}`);
        }
        return null;
      }
      case 'surrender': // a pitched battle: this side gives up (the battle menu's button)
        if (g.modeState && !g.modeState.setup) g.modeState.surrendered = faction;
        return null;
      case 'withdraw': {
        const base = g.map.bases?.[faction];
        if (!base) return null;
        if (g.modeState?.setup && g.mode?.budget) { // setting up a pitched battle: sold back, the whole price (and its ranks)
          for (const s of mine(cmd.s)) { if (s.paid) g.modeState.cp[g.wallet(faction)] += s.paid; g.removeStack(s); }
          return null;
        }
        for (const s of mine(cmd.s)) {
          if (s.stats.structure || s.type.id === 'crew') continue;
          s.withdrawing = true;
          s.ai.moveTo({ x: base.x, z: base.z }, { hold: true, ordered: true });
        }
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
        const cost = structureCost(g, faction, def);
        if (!g.spendFrom('build', faction, cost)) return g.tell(faction, `Not enough ${g.poolName('build')} (${cost})`);
        if (!g.construction.place(cmd.k, cmd.x, cmd.z, cmd.yaw, faction, s)) {
          g.refundTo('build', faction, cost);
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
      case 'power': // 1806: the grand battery, the cavalry reserve, the Guard (systems/Powers1806.js)
        return g.powers.call(faction, cmd.k, cmd.x, cmd.z);
      case 'form': // 1806: line / column / square / skirmish (data/formations.js)
        for (const s of mine(cmd.s)) s.setForm(cmd.f);
        return null;
      case 'charge': { // 1806: the bayonet charge on a stack (cmd.at), or the nearest enemy in sight
        for (const s of mine(cmd.s)) {
          const target = (cmd.at != null && g.world.stackById(cmd.at)) || g.world.stacksOf(enemyOf(faction))
            .filter((e) => e.alive && e.units.some((u) => u.alive && u.spotted) && Math.hypot(e.centroid.x - s.centroid.x, e.centroid.z - s.centroid.z) < (s.stats.cavalry ? 400 : 160))
            .sort((a, b) => Math.hypot(a.centroid.x - s.centroid.x, a.centroid.z - s.centroid.z) - Math.hypot(b.centroid.x - s.centroid.x, b.centroid.z - s.centroid.z))[0];
          if (!s.startCharge(target)) g.tell(faction, `${s.name}: no enemy in sight to charge`);
        }
        return null;
      }
      case 'leave':
        for (const s of mine(cmd.s)) if (s.garrison) g.buildings.leave(s);
        return null;
      case 'popSmoke':
        for (const s of mine(cmd.s)) {
          const u = s.units.find((v) => v.alive);
          if (!s.usesCover) s.ai.halt(); // (a squad throws its grenade on the move)
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
      case 'fireMission': { // called through binoculars in direct control (systems/PlayerControl.js): shells on the spot
        const tubes = (s) => s.units.filter((u) => u.alive && u.stats.indirect);
        const guns = mine(cmd.s).filter((s) => !s.barrage && tubes(s).some((u) => Math.hypot(cmd.x - u.pos.x, cmd.z - u.pos.z) <= u.stats.range));
        for (const s of guns) {
          s.ai.halt(); // (as for smoke: they stop, set up and fire)
          s.smokeOrder = cmd.m === 'area' // sustained fire: a minute on the area, scattered over it (Stop ends it)
            ? { x: cmd.x, z: cmd.z, left: Infinity, kind: 'he', area: 25, until: g.world.time + 60 }
            : { x: cmd.x, z: cmd.z, left: Math.min(cmd.m === 'salvo' ? 16 : 12, (cmd.m === 'salvo' ? 4 : 3) * tubes(s).length), kind: 'he' }; // a salvo: four rounds a tube
          for (const u of s.units) u.retarget = 0;
        }
        g.tell(faction, guns.length ? `${cmd.m === 'area' ? 'Sustained fire' : cmd.m === 'salvo' ? 'Salvo' : 'Fire mission'}: ${guns.map((s) => s.name).join(', ')}` : 'Fire mission: no guns in range');
        return null;
      }
      case 'flare':
        if (!g.conditions?.night) return g.tell(faction, 'Illumination rounds are for night battles');
        for (const s of mine(cmd.s)) {
          if (!(s.flareRounds > 0)) continue;
          const d = Math.hypot(cmd.x - s.centroid.x, cmd.z - s.centroid.z);
          const range = s.unitStats(0).range;
          if (d > range) { g.tell(faction, `${s.name}: out of range (${range} m)`); continue; }
          if (s.stats.naval) { // a ship's star shell: from a 5-inch gun, it bursts high over the spot after its flight and lights the sea far round
            const u = s.units.find((v) => v.alive);
            if (!u) continue;
            s.flareRounds--;
            s.starAt = g.world.time;
            g.flares.later(d / 700, cmd.x, 260, cmd.z, { radius: 450 });
            g.effects.muzzle({ x: u.pos.x, y: u.pos.y + 8, z: u.pos.z }, { x: cmd.x - u.pos.x, y: 0.6 * d, z: cmd.z - u.pos.z }, 1.4, 'artillery');
            g.audio?.weapon(s.faction, 'cannon', u.pos);
            g.tell(faction, `${s.name}: star shell (${s.flareRounds} left)`);
            return null;
          }
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
        const back = jobs.reduce((n, site) => n + structureCost(g, faction, site.def), 0);
        for (const site of jobs) g.construction.cancel(site);
        for (const s of mine(cmd.s)) if (jobs.some((site) => site.stackId === s.id)) s.ai.halt(); // stop where they are
        g.tell(faction, jobs.length ? `Order cancelled${back ? ` — ${back} CP back` : ''}` : 'Nothing to cancel');
        return null;
      }
      case 'refill': {
        let men = 0;
        let spent = 0;
        let far = 0;
        for (const s of mine(cmd.s)) {
          if (!s.missing) continue;
          if (!s.supplied) { far++; continue; }
          const cost = refillCost(s);
          if (!g.spend(faction, cost)) { g.tell(faction, `Not enough command points to refill ${s.name} (${cost})`); continue; }
          spent += cost;
          men += s.refill();
        }
        if (men) g.tell(faction, `${men} new men join — ${spent} CP`);
        else if (far) g.tell(faction, 'New men only reach squads near the base or a set-up command post');
        return null;
      }
      case 'barrage':
        return g.barrage.call(faction, cmd.x, cmd.z);
      case 'walze':
        for (const s of mine(cmd.s)) s.startBarrage?.(cmd.x, cmd.z);
        return null;
      case 'buy':
        return g.modeState?.buy?.(faction, cmd.u, cmd.e ?? null, cmd.k ?? null) ?? null;
      default:
        return null;
    }
  }
}
