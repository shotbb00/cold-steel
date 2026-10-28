// Frontline: a war over control points, in the spirit of Gates of Hell's conquest battles.
//   • Points earn command points (CP) every second; spend them to call in reinforcements
//     (they march in from your base). The enemy director does the same.
//   • Each side has front strength. Holding fewer points than the enemy bleeds it, and every
//     unit lost costs a share of its price. Reach zero and the front collapses.
//   • Only infantry captures; armour and guns support. Defenders that hold still dig in.
// Variants (modes/infantry.js) reuse it with `allow(type)`: which unit types may fight — the
// opening forces are filtered and only those can be bought — and `air: false` for no air support.
// Multiplayer: the host runs the mode for both sides (no AI director — the other side is a
// person); the client only builds the points and the HUD and shows the host's numbers.
import { ControlPoints } from '../systems/ControlPoints.js';
import { FrontlineDirector } from '../ai/FrontlineDirector.js';
import { FrontlineHUD } from '../ui/FrontlineHUD.js';
import { enemyOf, FACTIONS } from '../data/factions.js';
import { makeBuyer } from './shared.js';
import { getUnitType } from '../data/units/index.js';
import { DIFFICULTY } from '../data/rules.js';

const START_CP = 350;
const BASE_INCOME = 1.5;      // CP / s regardless of points
const POINT_INCOME = 1.1;     // CP / s per held point
const START_STRENGTH = 1000;
const BLEED = 0.6;            // strength / s per point of difference
const LOSS_SHARE = 0.2;       // fraction of a unit's cost removed from strength when it dies
const MAX_STACKS = 12;        // per side, unless the map sets maxStacks

export default {
  id: 'frontline',
  name: 'Frontline',
  description: 'Hold and take control points. Points earn command points for reinforcements; the side holding fewer bleeds strength.',
  multiplayer: true,
  economy: true,   // the menu offers the command-point and strength rules (data/rules.js)

  setup(game) {
    if (game.net?.isClient) return this.setupClient(game);
    const map = game.map;
    for (const [faction, spawns] of Object.entries(map.spawns)) {
      const allowed = spawns.filter((sp) => this.allows(sp.unit));
      for (const sp of allowed.length ? allowed : spawns.slice(0, 1).map((sp) => ({ ...sp, unit: 'rifles' }))) {
        game.spawnStack(sp.unit, faction, sp, sp.facing ?? 0, sp.name);
      }
    }
    const foe = enemyOf(game.playerFaction);
    const points = new ControlPoints(game, map.points);
    const R = game.rules;
    const state = {
      points,
      cp: { [game.playerFaction]: R.startCp ?? START_CP, [foe]: R.startCp ?? START_CP },
      strength: { [game.playerFaction]: R.strength ?? START_STRENGTH, [foe]: R.strength ?? START_STRENGTH },
      maxStrength: R.strength ?? START_STRENGTH,
      maxStacks: R.maxStacks ?? map.maxStacks ?? MAX_STACKS,
      allow: this.allow ?? null,
      income: { [game.playerFaction]: R.income ?? 1, [foe]: (R.income ?? 1) * (DIFFICULTY[R.difficulty]?.income ?? 1) },
    };
    state.buy = makeBuyer(game, state);
    if (this.air === false) for (const f of [game.playerFaction, foe]) game.air.limit[f] = 0;
    game.modeState = state;
    game.systems.push(points);
    if (!game.net || game.coop) game.systems.push(new FrontlineDirector(game, foe, state, { tempo: DIFFICULTY[R.difficulty]?.tempo ?? 1 })); // versus: a person plays it
    game.frontlineHud = new FrontlineHUD(game, state);

    game.bus.on('unit:death', ({ stack }) => {
      const cost = stack.type.cost ?? 150;
      state.strength[stack.faction] -= (cost / stack.units.length) * LOSS_SHARE;
    });
    game.bus.on('ui:reinforce', (typeId) => game.orders.issue({ t: 'buy', u: typeId }));
    game.bus.emit('toast', 'Hold your points, take theirs. Call in reinforcements with command points.');
  },

  /** Multiplayer client: points and HUD only; the numbers arrive from the host. */
  setupClient(game) {
    const map = game.map;
    const me = game.playerFaction;
    const foe = enemyOf(me);
    const state = {
      points: new ControlPoints(game, map.points),
      cp: { [me]: START_CP, [foe]: START_CP },
      strength: { [me]: START_STRENGTH, [foe]: START_STRENGTH },
      maxStrength: START_STRENGTH,
      maxStacks: map.maxStacks ?? MAX_STACKS,
      allow: this.allow ?? null,
    };
    if (this.air === false) for (const f of [me, foe]) game.air.limit[f] = 0;
    game.modeState = state;
    game.frontlineHud = new FrontlineHUD(game, state);
    game.bus.on('ui:reinforce', (typeId) => game.orders.issue({ t: 'buy', u: typeId }));
    game.bus.emit('toast', 'Hold your points, take theirs. Call in reinforcements with command points.');
  },

  /** May unit type `id` fight in this mode? */
  allows(id) {
    return !this.allow || this.allow(getUnitType(id));
  },

  clientUpdate(game) {
    game.modeState.points.flutter(game.time);
    game.frontlineHud.update();
  },

  update(game, dt) {
    const state = game.modeState;
    const me = game.playerFaction;
    const foe = enemyOf(me);
    const mine = state.points.owned(me);
    const theirs = state.points.owned(foe);
    state.cp[me] += dt * (BASE_INCOME + POINT_INCOME * mine) * (state.income?.[me] ?? 1);
    state.cp[foe] += dt * (BASE_INCOME + POINT_INCOME * theirs) * (state.income?.[foe] ?? 1);
    if (mine > theirs) state.strength[foe] -= (mine - theirs) * BLEED * dt;
    else if (theirs > mine) state.strength[me] -= (theirs - mine) * BLEED * dt;
    game.frontlineHud.update();

    const outOf = (f) => game.world.stacksOf(f).length === 0 && state.cp[f] < 150;
    const lost = (f) => state.strength[f] <= 0 || outOf(f);
    const loser = lost(foe) ? foe : lost(me) ? me : null;
    if (!loser) return;
    // each side's own banner (the multiplayer client gets its version from the host)
    const result = (f) => (f === loser
      ? { victory: false, title: 'Defeat', subtitle: 'Your front has collapsed.' }
      : { victory: true, title: 'Victory', subtitle: `The ${FACTIONS[loser].name}'s front has collapsed.` });
    game.net?.sendEnd(result(game.net.remoteFaction));
    game.end(result(me));
  },
};
