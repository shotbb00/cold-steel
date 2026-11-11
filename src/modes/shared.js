// Pieces the game modes share.
//   lines(map, attacker)     the map's control points grouped into lines across the front,
//                            ordered from the attacker's base toward the defender's
//   deploy(game, faction, units, anchors, back)   spawn a list of unit types spread over anchor
//                            points (round robin), set back toward their own base
//   clientSetup(game, extra) the multiplayer client's side of a points-based mode: points and
//                            HUD only — the numbers come from the host
//   clock(s)                 m:ss
import { unitCost } from '../data/doctrine.js';
import { forArmy } from '../data/factions.js';
import { ControlPoints } from '../systems/ControlPoints.js';
import { FrontlineHUD } from '../ui/FrontlineHUD.js';
import { enemyOf } from '../data/factions.js';
import { UNIT_TYPES } from '../data/units/index.js';
import { KITS, takesKit } from '../data/kits.js';
import { CRAFT } from '../systems/Landing.js';

/**
 * state.buy(faction, typeId) for points-and-CP modes: pay, check the stack limit, and bring
 * the new stack in at the side's base (on one of its roads in, on big maps).
 */
const ENTRY_GAP = 10; // seconds: each road brings in one arrival at a time

export function makeBuyer(game, state) {
  const counter = (state.bought ??= {}); // (shared with a coastal map's landing waves: systems/Landing.js)
  state.entryFree ??= {}; // `${faction}:${road}` → battle time the road is free again
  /** `entry`: the road to arrive on (an index into the base's entries), or null: a command post, else any free road. */
  return (faction, typeId, entry = null, kit = null) => {
    const map = game.map;
    const type = UNIT_TYPES[typeId];
    if (!type || type.hidden || type.airOnly || (type.armies && !type.armies.includes(game.armyOf(faction))) || (state.allow && !state.allow(type, faction))) return null;
    const cost = unitCost(type, game.armyOf(faction));
    if (state.cp[game.wallet(faction)] < cost) {
      game.tell(faction, `Not enough command points for ${type.shortName} (${cost})`);
      return null;
    }
    if (!type.uncapped && forces(game, faction).length >= state.maxStacks) {
      game.tell(faction, 'Stack limit reached');
      return null;
    }
    if (type.limit && game.world.stacksOf(faction).filter((s) => s.type.id === type.id && !s.withdrawing).length >= type.limit) {
      game.tell(faction, `No more than ${type.limit} ${type.shortName} in the field`);
      return null;
    }
    const base = map.bases[faction];
    const toward = -Math.sign(base.z);
    // the road it comes in on: the one asked for, else any that's free (one arrival per road every ENTRY_GAP s)
    const roads = base.entries ?? [0];
    const freeAt = (i) => state.entryFree[`${faction}:${i}`] ?? 0;
    const asked = entry != null && roads[entry] !== undefined ? entry : null;
    const open = roads.map((_, i) => i).filter((i) => freeAt(i) <= game.time);
    const road = asked ?? open[Math.floor(Math.random() * open.length)] ?? null;
    if (road === null || freeAt(road) > game.time) {
      const wait = Math.ceil(Math.min(...(asked !== null ? [asked] : roads.map((_, i) => i)).map(freeAt)) - game.time);
      game.tell(faction, `${asked !== null ? 'That road is' : 'Every road is'} busy: the next arrival in ${wait} s`);
      return null;
    }
    const landing = !type.stats.naval && game.landing?.lands(faction); // (a coastal map's side that lands: it comes in a landing craft)
    if (landing && game.landing.busy(faction) >= CRAFT) { game.tell(faction, `All ${CRAFT} landing craft are on a run: wait for one to come back`); return null; }
    game.spend(faction, cost); // (through game.spend: the battle report counts what was spent)
    counter[typeId] = (counter[typeId] ?? 0) + 1;
    let pos = { x: base.x + roads[road] + (Math.random() - 0.5) * 40, z: base.z + toward * (8 + Math.random() * 10) };
    // a forward command post that is set up and not under fire takes the new arrivals (the one furthest
    // forward) — in co-op only the buyer's own: each player brings their troops in at their post
    const buyer = game.currentOwner ?? 'host';
    const post = game.world.stacksOf(faction)
      .filter((s) => s.postReady && (!game.coop || faction !== game.playerFaction || s.owner === buyer) && !game.world.stacks.some((e) => e.faction !== faction && e.alive && !e.stats.structure
        && Math.hypot(e.centroid.x - s.centroid.x, e.centroid.z - s.centroid.z) < s.stats.commandPost.safe))
      .sort((a, b) => Math.abs(b.centroid.z - base.z) - Math.abs(a.centroid.z - base.z))[0];
    if (post && asked === null && !type.stats.structure) pos = { x: post.centroid.x + (Math.random() - 0.5) * 24, z: post.centroid.z - toward * (12 + Math.random() * 8) };
    else if (game.rules?.roadCooldown !== false) state.entryFree[`${faction}:${road}`] = game.time + ENTRY_GAP; // (battle rule: off — everything bought arrives at once)
    const army = game.armyOf(faction);
    const label = forArmy(type.variants, army, faction)?.name ?? type.shortName; // each army's own name for it
    const kitted = takesKit(type) && KITS[kit]?.short ? kit : null; // (a squad kit, data/kits.js: in its name too)
    const name = `${army === 'sov' ? 'Guards ' : ''}${label} ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][counter[typeId] - 1] ?? counter[typeId]}${kitted ? ` (${KITS[kitted].short})` : ''}`;
    if (landing) { // in to the beach sector of the road it was sent on (Dog, Easy, Fox), not at the base out at sea
      const craft = game.landing.launch(faction, { typeId, name, kit: kitted }, roads[road] + (Math.random() - 0.5) * 50);
      game.bus.emit('wave', { faction, units: [typeId], bought: true });
      game.tell(faction, `${type.shortName} called in: an ${craft.type.shortName} is taking ${name} in`);
      return craft;
    }
    const facing = type.stats.naval && game.world.coastal ? (pos.x > 0 ? -Math.PI / 2 : Math.PI / 2) : toward > 0 ? 0 : Math.PI; // (a coastal map: along the coast, toward the middle)
    const stack = game.spawnStack(typeId, faction, pos, facing, type.names?.[faction] ? undefined : name); // (a warship: her own name, UnitStack shipName)
    if (kitted) stack.setKit(kitted);
    game.bus.emit('wave', { faction, units: [typeId], bought: true });
    game.tell(faction, `${type.shortName} called in — arriving at ${post && asked === null ? post.name : 'base'}`);
    return stack;
  };
}

/** A side's own forces: what counts toward the stack limit (not fortifications or lane waves). */
export const forces = (game, f) => game.world.stacksOf(f).filter((s) => s.cargo || !s.stats.structure && !s.autonomous && !s.withdrawing && s.type.id !== 'crew' && !s.type.uncapped); // (the NVA's Kampfgruppen are outside the cap) // withdrawing: its slot is free already

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
