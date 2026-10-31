// Lanes — a fortified defence line, inspired by DotA. Each side's half of the map is crossed by
// three roads (the map's base entries: west, centre, east), and each road is barred by two
// fortifications per side (data/units/fortifications.js): a forward bunker line, and behind it
// a strongpoint. The headquarters sits in front of each base.
//   • Order of battle: a strongpoint is shielded until the bunker line in front of it falls;
//     the headquarters is shielded until one whole lane of that side — both — is destroyed.
//     Destroy the enemy's headquarters to win.
//   • Lane waves: every 50 s each side sends an infantry section down each road (an AT team
//     every second wave, an MG team every fourth, a tank every fifth). They march on their own
//     at the next enemy fortification in their lane and fight whatever they meet — the line
//     you push behind. You don't command them.
//   • Your army is what you buy with command points: income, kill bounties, a big reward for each
//     fortification destroyed, and the jungle — supply caches in the woods between the roads,
//     worth CP while you hold them.
//   • Fortifications are on everyone's map and shrug off small arms: tank guns, AT rockets,
//     artillery, mortars and air strikes bring them down.
// The AI commander (the enemy, or the other side in co-op) buys an army and pushes your weakest
// lane, and turns it round to defend its own fortifications when they're under attack.
import { ControlPoints } from '../systems/ControlPoints.js';
import { FrontlineHUD } from '../ui/FrontlineHUD.js';
import { enemyOf, FACTIONS } from '../data/factions.js';
import { AIState } from '../ai/StackAI.js';
import { UNIT_TYPES } from '../data/units/index.js';
import { makeBuyer, clientSetup, clientUpdate, forces } from './shared.js';

const START_CP = 700;
const INCOME = 2.2;             // CP / s
const CACHE_INCOME = 0.8;       // per cache held
const BOUNTY = 0.25;            // share of a kill's cost
const STRUCTURE_REWARD = 400;
const WAVE_EVERY = 50;
const FIRST_WAVE = 25;
const MAX_WAVES_PER_LANE = 3;   // waves alive in one lane before the next is held back
const THINK = 1;
const ARMY_ORDER = ['rifles', 'atTeam', 'tank', 'mortar', 'rifles', 'mgTeam', 'cev', 'tank', 'tankDestroyer', 'atTeam', 'ifv', 'artillery', 'rifles', 'heavyTank', 'recovery', 'tank', 'rockets', 'aa', 'manpads'];
const LANE_NAMES = (x) => (x < -20 ? 'West' : x > 20 ? 'East' : 'Centre');

export default {
  id: 'lanes',
  name: 'Lanes',
  description: 'Three roads, two fortifications per road and side, a headquarters behind them. Break a lane to open their HQ. Waves march by themselves; your army decides it.',
  multiplayer: true,

  setup(game) {
    if (game.net?.isClient) {
      clientSetup(game);
      game.bus.emit('toast', 'Lanes — break one of their lanes, then their headquarters.');
      return;
    }
    const map = game.map;
    const sides = ['nato', 'pact'];
    const entries = map.bases.nato.entries ?? [-200, 0, 200];
    const lanes = entries.map((x, i) => ({ i, x, name: LANE_NAMES(x) }));
    const dry = (p) => (game.world.river ? game.world.river.dry(p) : p);

    // ---- the fortifications
    const forts = {};
    for (const f of sides) {
      const base = map.bases[f];
      const sz = Math.sign(base.z) || 1;
      const depth = Math.abs(base.z);
      const facing = sz > 0 ? Math.PI : 0;
      forts[f] = { lanes: [], hq: null };
      for (const lane of lanes) {
        const outer = game.spawnStack('bunker', f, dry({ x: base.x + lane.x, z: sz * depth * 0.4 }), facing, `${lane.name} bunker line`);
        const inner = game.spawnStack('strongpoint', f, dry({ x: base.x + lane.x, z: sz * depth * 0.7 }), facing, `${lane.name} strongpoint`);
        forts[f].lanes.push({ outer, inner });
      }
      forts[f].hq = game.spawnStack('hq', f, { x: base.x, z: base.z - sz * 34 }, facing, f === 'nato' ? 'Brigade HQ' : 'Regimental HQ');
    }

    // ---- the jungle: supply caches in the woods between the roads
    const caches = [];
    for (let i = 0; i + 1 < lanes.length; i++) {
      const x = (lanes[i].x + lanes[i + 1].x) / 2;
      for (const f of sides) {
        const z = Math.sign(map.bases[f].z) * Math.abs(map.bases[f].z) * 0.2; // no-man's-land, between the bunker lines
        const p = dry({ x, z });
        caches.push({ id: String.fromCharCode(65 + caches.length), name: `${x < 0 ? 'West' : 'East'} woods cache (${f === 'nato' ? 'south' : 'north'})`, x: p.x, z: p.z, radius: 14, owner: null, sector: x < 0 ? 'west' : 'east' });
      }
    }
    const points = new ControlPoints(game, caches);

    const state = {
      points,
      cp: { nato: START_CP, pact: START_CP },
      strength: { nato: 1000, pact: 1000 },
      maxStrength: 1000,
      maxStacks: Math.min(18, map.maxStacks ?? 18),
      lanes,
      forts,
      wave: 0,
      nextWave: FIRST_WAVE,
      statusFor: (me) => this.statusLine(game, state, me),
      status: () => this.statusLine(game, state, game.playerFaction),
    };
    state.buy = makeBuyer(game, state);
    game.modeState = state;
    this.lock(game, state);

    // ---- opening forces, by each headquarters
    for (const f of sides) {
      const base = map.bases[f];
      const sz = Math.sign(base.z) || 1;
      ['rifles', 'rifles', 'atTeam', 'mgTeam'].forEach((id, k) => {
        game.spawnStack(id, f, { x: base.x + (k - 1.5) * 18, z: base.z - sz * 62 }, sz > 0 ? Math.PI : 0);
      });
    }

    // ---- economy
    game.bus.on('unit:death', ({ stack, killer }) => {
      if (stack.stats.structure) return;
      const foe = enemyOf(stack.faction);
      if (killer?.faction === foe) state.cp[foe] += ((stack.type.cost ?? 150) / stack.units.length) * BOUNTY;
    });
    game.bus.on('stack:destroyed', (s) => {
      if (!s.stats.structure || s.type.id === 'hq') return;
      const foe = enemyOf(s.faction);
      state.cp[foe] += STRUCTURE_REWARD;
      game.tellBoth(foe, `${s.name} destroyed! +${STRUCTURE_REWARD} CP`, `We've lost the ${s.name}!`);
      this.lock(game, state);
    });

    game.systems.push(points);
    this.ai = null;
    if (!game.net || game.coop) this.ai = enemyOf(game.playerFaction); // versus: both sides are people
    game.frontlineHud = new FrontlineHUD(game, state);
    game.bus.on('ui:reinforce', (typeId) => game.orders.issue({ t: 'buy', u: typeId }));
    game.bus.emit('toast', 'Lanes — break one of their lanes, then their headquarters. Waves march by themselves.');
    this.timer = 0;
    this.buildIndex = 0;
  },

  /** Who can be hit: a strongpoint once its bunker line is gone; the HQ once a whole lane is. */
  lock(game, state) {
    for (const f of ['nato', 'pact']) {
      const fo = state.forts[f];
      let laneDown = false;
      for (const { outer, inner } of fo.lanes) {
        this.shield(inner, outer.alive, 'destroy the bunker line in front of it first');
        if (!outer.alive && !inner.alive) laneDown = true;
      }
      this.shield(fo.hq, !laneDown, 'break one whole lane first');
      fo.open = laneDown;
    }
  },

  shield(s, on, why) {
    if (!s?.alive) return;
    s.shieldReason = why;
    for (const u of s.units) u.invulnerable = on;
  },

  /** The next thing a stack in `lane` should go for on `foe`'s side. */
  objective(state, foe, lane) {
    const fo = state.forts[foe];
    const l = fo.lanes[lane];
    if (l.outer.alive) return l.outer;
    if (l.inner.alive) return l.inner;
    if (fo.hq.alive && fo.open) return fo.hq;
    // this lane is through but the HQ is still shielded: help the next lane over
    for (const o of fo.lanes) if (o.outer.alive || o.inner.alive) return o.outer.alive ? o.outer : o.inner;
    return fo.hq;
  },

  update(game, dt) {
    const state = game.modeState;
    for (const f of ['nato', 'pact']) state.cp[f] += dt * (INCOME + CACHE_INCOME * state.points.owned(f));
    if (game.time >= state.nextWave) this.waves(game, state);
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = THINK;
      this.march(game, state);
      if (this.ai) this.command(game, state, this.ai);
    }
    for (const f of ['nato', 'pact']) {
      const c = state.forts[f].hq.units[0];
      state.strength[f] = c.alive ? (c.hp / c.maxHp) * 1000 : 0;
    }
    game.frontlineHud.update();
    // the end: a headquarters' blockhouse is gone
    for (const f of ['nato', 'pact']) {
      if (state.forts[f].hq.units[0].alive) continue;
      const result = (side) => (side === f
        ? { victory: false, title: 'Defeat', subtitle: 'Our headquarters has been destroyed.' }
        : { victory: true, title: 'Victory', subtitle: `The ${FACTIONS[f].name} headquarters is destroyed.` });
      game.net?.sendEnd(result(game.net.remoteFaction));
      game.end(result(game.playerFaction));
      return;
    }
  },

  /** A section down every road, for both sides. */
  waves(game, state) {
    state.wave++;
    state.nextWave = game.time + WAVE_EVERY;
    const n = state.wave;
    const units = ['rifles'];
    if (n % 2 === 0) units.push('atTeam');
    if (n % 4 === 0) units.push('mgTeam');
    if (n % 5 === 0) units.push('tank');
    for (const f of ['nato', 'pact']) {
      const base = game.map.bases[f];
      const sz = Math.sign(base.z) || 1;
      for (const lane of state.lanes) {
        const alive = game.world.stacksOf(f).filter((s) => s.autonomous && s.lane === lane.i).length;
        if (alive >= MAX_WAVES_PER_LANE) continue;
        units.forEach((id, k) => {
          const s = game.spawnStack(id, f, { x: base.x + lane.x + (k - (units.length - 1) / 2) * 9, z: base.z - sz * 14 },
            sz > 0 ? Math.PI : 0, `${lane.name} wave ${n}${units.length > 1 ? ` ${UNIT_TYPES[id].shortName}` : ''}`, id === 'rifles' ? { count: 6 } : {});
          s.autonomous = true; // nobody's to command: it goes by itself
          s.lane = lane.i;
        });
      }
    }
    game.bus.emit('wave', { faction: game.playerFaction, units });
  },

  /** Waves (and the AI's lane groups) go for the next fortification in their lane. */
  march(game, state) {
    for (const s of game.world.stacks) {
      if (!s.alive || s.lane == null || s.stats.structure) continue;
      if (!s.autonomous && !s.aiLane) continue; // the players' own stacks are theirs to command
      const foe = enemyOf(s.faction);
      const target = this.objective(state, foe, s.lane);
      const busy = s.ai.state === AIState.ATTACK && s.ai.targetGroup?.alive && !s.ai.targetGroup.stats.structure;
      if (busy) continue; // in a fight with troops: let it finish
      if (s.ai.state === AIState.RETREAT) continue;
      if (s.ai.targetGroup !== target || s.ai.state !== AIState.ATTACK) s.ai.attack(target, { ordered: false });
    }
  },

  /** The AI side: buy along an order, give each new stack a lane, defend fortifications under attack. */
  command(game, state, me) {
    const foe = enemyOf(me);
    // buy
    if (forces(game, me).length < state.maxStacks) {
      const id = ARMY_ORDER[this.buildIndex % ARMY_ORDER.length];
      if (state.cp[me] >= UNIT_TYPES[id].cost) {
        const s = state.buy(me, id);
        this.buildIndex++;
        if (s) {
          // the lane where the enemy's next fortification is weakest
          const weakest = state.lanes.map((l) => ({ l, hp: this.objective(state, foe, l.i).hpRatio })).sort((a, b) => a.hp - b.hp)[0];
          s.lane = weakest.l.i;
          s.aiLane = true;
        }
      }
    }
    // the jungle: one infantry stack each goes for a supply cache we don't hold
    for (const p of state.points.points) {
      if (p.owner === me) continue;
      const sent = game.world.stacksOf(me).find((s) => s.cache === p && s.alive);
      if (sent) {
        if (sent.ai.state !== AIState.MOVE && sent.ai.state !== AIState.ATTACK) sent.ai.moveTo({ x: p.x, z: p.z }, { hold: true, ordered: false });
        continue;
      }
      const runner = game.world.stacksOf(me).filter((s) => s.aiLane && s.usesCover && !s.cache)
        .sort((a, b) => Math.hypot(a.centroid.x - p.x, a.centroid.z - p.z) - Math.hypot(b.centroid.x - p.x, b.centroid.z - p.z))[0];
      if (!runner) continue;
      runner.cache = p;
      runner.aiLane = false; // off the lane: it holds the cache
      runner.ai.moveTo({ x: p.x, z: p.z }, { hold: true, ordered: false });
    }
    // defend: a fortification of ours with enemies at it pulls the lane's AI stacks back
    const enemies = game.world.stacksOf(foe).filter((s) => !s.stats.structure);
    for (const l of state.lanes) {
      const mine = state.forts[me].lanes[l.i];
      const fort = mine.outer.alive ? mine.outer : mine.inner.alive ? mine.inner : state.forts[me].hq;
      const raider = enemies.find((e) => Math.hypot(e.centroid.x - fort.centroid.x, e.centroid.z - fort.centroid.z) < 140);
      if (!raider) continue;
      for (const s of game.world.stacksOf(me)) {
        if (s.aiLane && s.lane === l.i && s.ai.targetGroup !== raider && s.ai.state !== AIState.RETREAT) s.ai.attack(raider, { ordered: false });
      }
    }
  },

  statusLine(game, state, me) {
    const foe = enemyOf(me);
    const side = (f) => state.lanes.map((l) => {
      const { outer, inner } = state.forts[f].lanes[l.i];
      return `${l.name[0]} ${outer.alive ? '■' : '□'}${inner.alive ? '■' : '□'}`;
    }).join('  ');
    const hq = (f) => (state.forts[f].open ? 'HQ open' : 'HQ shielded');
    const next = Math.max(0, Math.ceil(state.nextWave - game.time));
    return `Ours ${side(me)} · ${hq(me)}   |   Theirs ${side(foe)} · ${hq(foe)}   |   next wave ${next} s`;
  },

  clientUpdate,
};
