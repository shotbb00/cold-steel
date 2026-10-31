// Pieces the game modes share.
//   lines(map, attacker)     the map's control points grouped into lines across the front,
//                            ordered from the attacker's base toward the defender's
//   deploy(game, faction, units, anchors, back)   spawn a list of unit types spread over anchor
//                            points (round robin), set back toward their own base
//   clientSetup(game, extra) the multiplayer client's side of a points-based mode: points and
//                            HUD only — the numbers come from the host
//   clock(s)                 m:ss
import { ControlPoints } from '../systems/ControlPoints.js';
import { FrontlineHUD } from '../ui/FrontlineHUD.js';
import { enemyOf } from '../data/factions.js';
import { UNIT_TYPES } from '../data/units/index.js';

/**
 * state.buy(faction, typeId) for points-and-CP modes: pay, check the stack limit, and bring
 * the new stack in at the side's base (on one of its roads in, on big maps).
 */
export function makeBuyer(game, state) {
  const counter = {};
  return (faction, typeId) => {
    const map = game.map;
    const type = UNIT_TYPES[typeId];
    if (!type || type.hidden || type.airOnly || (state.allow && !state.allow(type))) return null;
    if (state.cp[faction] < type.cost) {
      game.tell(faction, `Not enough command points for ${type.shortName} (${type.cost})`);
      return null;
    }
    if (forces(game, faction).length >= state.maxStacks) {
      game.tell(faction, 'Stack limit reached');
      return null;
    }
    state.cp[faction] -= type.cost;
    counter[typeId] = (counter[typeId] ?? 0) + 1;
    const base = map.bases[faction];
    const toward = -Math.sign(base.z);
    const entry = base.entries ? base.entries[Math.floor(Math.random() * base.entries.length)] : 0;
    let pos = { x: base.x + entry + (Math.random() - 0.5) * 40, z: base.z + toward * (8 + Math.random() * 10) };
    // a forward command post that is set up and not under fire takes the new arrivals (the one furthest forward)
    const post = game.world.stacksOf(faction)
      .filter((s) => s.postReady && !game.world.stacks.some((e) => e.faction !== faction && e.alive && !e.stats.structure
        && Math.hypot(e.centroid.x - s.centroid.x, e.centroid.z - s.centroid.z) < s.stats.commandPost.safe))
      .sort((a, b) => Math.abs(b.centroid.z - base.z) - Math.abs(a.centroid.z - base.z))[0];
    if (post && !type.stats.structure) pos = { x: post.centroid.x + (Math.random() - 0.5) * 24, z: post.centroid.z - toward * (12 + Math.random() * 8) };
    const name = `${faction === 'pact' ? 'Guards ' : ''}${type.shortName} ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][counter[typeId] - 1] ?? counter[typeId]}`;
    const stack = game.spawnStack(typeId, faction, pos, toward > 0 ? 0 : Math.PI, name);
    game.bus.emit('wave', { faction, units: [typeId] });
    game.tell(faction, `${type.shortName} called in — arriving at ${post ? post.name : 'base'}`);
    return stack;
  };
}

/** A side's own forces: what counts toward the stack limit (not fortifications or lane waves). */
export const forces = (game, f) => game.world.stacksOf(f).filter((s) => !s.stats.structure && !s.autonomous && s.type.id !== 'crew');

export const clock = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

/** Points grouped into lines across the attack axis (a gap of more than `gap` m starts a new line). */
export function lines(map, attacker, gap = 30) {
  const a = map.bases[attacker];
  const d = map.bases[enemyOf(attacker)];
  const dx = d.x - a.x;
  const dz = d.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const t = (p) => ((p.x - a.x) * dx + (p.z - a.z) * dz) / len;
  const sorted = map.points.map((p) => ({ p, t: t(p) })).sort((x, y) => x.t - y.t);
  const out = [];
  for (const e of sorted) {
    const last = out[out.length - 1];
    if (last && e.t - last.t1 <= gap) { last.ids.push(e.p.id); last.t1 = e.t; } else out.push({ ids: [e.p.id], t0: e.t, t1: e.t });
  }
  return { lines: out.map((l) => l.ids), mid: len / 2, at: out.map((l) => (l.t0 + l.t1) / 2) };
}

/**
 * Spawn `units` for `faction`, spread round robin over `anchors` ({x, z}), `back` m toward home.
 * A unit is a type id, or a saved stack { type, name, men, xp, cid } (the campaign's battalion).
 */
export function deploy(game, faction, units, anchors, { back = 25, spread = 28, names = {} } = {}) {
  const base = game.map.bases[faction];
  const counter = {};
  return units.map((entry, i) => {
    const saved = typeof entry === 'object' ? entry : null;
    const id = saved ? saved.type : entry;
    const a = anchors[i % anchors.length];
    const dx = base.x - a.x;
    const dz = base.z - a.z;
    const d = Math.hypot(dx, dz) || 1;
    const lat = (Math.floor(i / anchors.length) % 2 ? -1 : 1) * (6 + Math.random() * spread);
    const x = a.x + (dx / d) * back + (-dz / d) * lat;
    const z = a.z + (dz / d) * back + (dx / d) * lat;
    const facing = Math.atan2(-dx, -dz);
    counter[id] = (counter[id] ?? 0) + 1;
    const name = saved?.name ?? (names[id] ? `${names[id]} ${counter[id]}` : undefined);
    const pos = game.world.river ? game.world.river.dry({ x, z }) : { x, z };
    const s = game.spawnStack(id, faction, pos, facing, name, saved?.men ? { count: saved.men } : {});
    if (saved?.xp) s.setXp(saved.xp);
    if (saved?.cid) s.cid = saved.cid;
    return s;
  });
}

/** Multiplayer client: the points and the HUD; the host's state packets fill in the numbers. */
export function clientSetup(game, { cp = 0, maxStacks = 22 } = {}) {
  const me = game.playerFaction;
  const foe = enemyOf(me);
  const state = {
    points: new ControlPoints(game, game.map.points),
    cp: { [me]: cp, [foe]: cp },
    strength: { [me]: 1000, [foe]: 1000 },
    maxStrength: 1000,
    maxStacks: game.map.maxStacks ?? maxStacks,
    statusText: '',
  };
  game.modeState = state;
  game.frontlineHud = new FrontlineHUD(game, state);
  game.bus.on('ui:reinforce', (typeId) => game.orders.issue({ t: 'buy', u: typeId }));
  return state;
}

export function clientUpdate(game) {
  game.modeState.points.flutter(game.time);
  game.frontlineHud.update();
}

/** A side's forces in the field, valued like the director does (health × cost). */
export const fieldStrength = (game, f) => game.world.stacksOf(f).reduce((a, s) => a + s.hpRatio * (s.type.cost ?? 150), 0);
