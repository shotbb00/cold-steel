// Two budgets beside the command points (Frontline and its variants), each side the same base income:
//   build    – every structure (sandbags to bunkers, house upgrades) is paid from it (core/Orders.js 'build')
//   support  – air strikes, barrages and the 1806 powers (systems/AirStrike.js, Barrage.js, Powers1806.js)
// Side objectives raise them: an airfield, a refinery and a factory on the map's middle line, taken
// and held like control points (a second systems/ControlPoints.js, so they don't count toward the
// front's bleed or the CP income). Modes without these pools pay everything in CP (GameEngine.spendFrom).
import { ControlPoints } from './ControlPoints.js';
import { enemyOf } from '../data/factions.js';

/** Per minute; `start` at the beginning of the battle. */
export const BUDGETS = { build: { start: 150, base: 5 }, support: { start: 200, base: 40 } };
export const SIDE_OBJECTIVES = [
  { id: '✈', name: 'Airfield', from: [-0.88, -0.4], support: 30, build: 0 },
  { id: '⛽', name: 'Refinery', from: [0.4, 0.88], support: 15, build: 3 },
  { id: '⚙', name: 'Factory', from: [-0.4, 0.4], support: 0, build: 5 },
];

/**
 * Where the side objectives go: on or near the middle line (fair to both sides), in their stretch
 * of it, as far from the control points and each other as there is room — dry and clear ground.
 * The same on every machine (terrain and cover are), so a multiplayer client finds the same spots.
 */
export function sideObjectiveDefs(game, points) {
  const { bounds, river } = game.world;
  const t = game.terrain;
  const taken = [];
  const defs = [];
  for (const o of SIDE_OBJECTIVES) {
    let best = null;
    let bestScore = -Infinity;
    for (let x = o.from[0] * bounds.x; x <= o.from[1] * bounds.x; x += 10) {
      for (const z of [0, 25, -25, 50, -50]) {
        if (river && river.level - t.heightAt(x, z) > -0.3) continue; // in or at the water
        if (game.cover.pointBlocked(x, z, 6)) continue;
        const d = Math.min(...points.map((p) => Math.hypot(p.x - x, p.z - z)), ...taken.map((q) => Math.hypot(q.x - x, q.z - z)));
        const score = Math.min(d, 160) - Math.abs(z) * 1.5;
        if (d > 70 && score > bestScore) { bestScore = score; best = { x, z }; }
      }
    }
    if (!best) continue;
    taken.push(best);
    defs.push({ ...o, ...best, owner: null, radius: 20 });
  }
  return defs;
}

const BY_ID = Object.fromEntries(SIDE_OBJECTIVES.map((o) => [o.id, o]));

export class Economy {
  constructor(game, state) {
    this.game = game;
    this.state = state;
    const me = game.playerFaction;
    const foe = enemyOf(me);
    state.build = { [me]: BUDGETS.build.start, [foe]: BUDGETS.build.start };
    state.support = { [me]: BUDGETS.support.start, [foe]: BUDGETS.support.start };
    state.sides = new ControlPoints(game, sideObjectiveDefs(game, state.points.points));
  }

  update(dt) {
    const { state, game } = this;
    state.sides.update(dt, game.time);
    for (const f of Object.keys(state.build)) {
      const held = state.sides.points.filter((p) => p.owner === f).map((p) => BY_ID[p.id]);
      const k = (dt / 60) * (state.income?.[f] ?? 1);
      state.build[f] += k * (BUDGETS.build.base + held.reduce((a, p) => a + p.build, 0));
      state.support[f] += k * (BUDGETS.support.base + held.reduce((a, p) => a + p.support, 0));
    }
  }
}
