// Limited stocks that come back (tester feedback 2026-11-17): what a unit carries and spends — an ATGM
// launcher's missiles, a mortar's smoke and illumination rounds, a ship's depth charges, a minelayer's
// mines (the drones: systems/Drones.js restock) — returns slowly with the supplies: one every EVERY[k] s
// wherever the stack is, HOME × as fast near the side's base (a ship: her home point; a minelayer's mines
// only there, from the depot). `label(stack)` is what its tag shows (ui/StackLabels.js; a guest gets it
// from the host).
const EVERY = { atgm: 30, dc: 30, smoke: 45, flare: 60, mine: 6 }; // s for one back, in the field
const HOME = 4;
const NEAR = { land: 200, sea: 900 };

/** Is the stack at home: its base (on land), or its side's home point (at sea, as systems/Missiles.js rearm)? */
function atHome(game, s) {
  const c = s.centroid;
  if (s.stats.naval) {
    const p = game.map.points?.find((q) => q.owner === s.faction && (q.id === 'A' || q.id === 'K'));
    const b = p ?? game.world.bases?.[s.faction];
    return !!b && Math.hypot(b.x - c.x, b.z - c.z) < NEAR.sea;
  }
  const b = game.world.bases?.[s.faction];
  return !!b && Math.hypot(b.x - c.x, b.z - c.z) < NEAR.land;
}

/** One more of `key` on `o` (a unit or the stack) when its timer runs out; `full` is what it carries full. */
function tick(o, key, full, every, k, step) {
  const tk = `${key}T`;
  if ((o[key] ?? full) >= full) { o[tk] = 0; o[`${key}Next`] = 0; return; }
  o[tk] = (o[tk] ?? 0) + k;
  o[`${key}Next`] = (every - o[tk]) / (k / step); // (s until the next one: the tag's countdown)
  if (o[tk] >= every) { o[tk] = 0; o[key] = (o[key] ?? full) + 1; }
}

/** Every `step` s (systems/Support.js): the stocks come back. */
export function restockAll(game, step) {
  for (const s of game.world.stacks) {
    if (!s.alive || s.stats.structure) continue;
    const st = s.stats;
    if (!st.atgm && !s.smokeFull && !s.flareFull && !st.depthCharges && !st.minelayer) continue;
    const home = atHome(game, s), k = step * (home ? HOME : 1);
    for (const u of s.units) {
      if (!u.alive) continue;
      if (st.atgm && !(st.antiAir?.shared && (u.missileReload ?? 0) > 0)) tick(u, 'atgmLeft', st.atgm.count, EVERY.atgm, k, step); // (a shared rack: its own reload, UnitStack.engageAirMissile)
      if (u.stats.depthCharges) tick(u, 'dcLeft', u.stats.depthCharges.count, EVERY.dc, k, step);
    }
    if (s.smokeFull) tick(s, 'smokeRounds', s.smokeFull, EVERY.smoke, k, step);
    if (s.flareFull) tick(s, 'flareRounds', s.flareFull, EVERY.flare, k, step);
    if (st.minelayer && home) tick(s, 'minesLeft', st.minelayer.count, EVERY.mine, step, step); // (mines: from the depot only)
  }
}

/** What the stack's tag shows of its stocks: ['Missiles 5/8', ok]… (`ok` false: empty — amber). */
export function stockChips(s) {
  if (s.netStocks != null) return s.netStocks; // (a guest: the host's)
  const out = [], st = s.stats, alive = s.units.filter((u) => u.alive);
  // left of full, and while it isn't full: the seconds until the next one comes up (like the reload ring)
  const add = (name, left, full, next) => { if (full > 0) out.push([`${name} ${left}/${full}${left < full && next > 0 && next < Infinity ? ` · ${Math.ceil(next)} s` : ''}`, left > 0]); };
  const soonest = (us, key) => Math.min(...us.map((u) => u[key] || Infinity));
  const D = st.drone;
  if (D && Number.isFinite(D.count)) add(D.kind === 'lancet' ? 'Munitions' : 'Drones', s.dronesLeft ?? D.count, D.count, s.restockNext);
  if (st.atgm && alive.length) add('Missiles', alive.reduce((n, u) => n + (u.atgmLeft ?? st.atgm.count), 0), st.atgm.count * alive.length, soonest(alive, 'atgmLeftNext'));
  if (s.smokeFull) add('Smoke', s.smokeRounds, s.smokeFull, s.smokeRoundsNext);
  if (s.flareFull) add('Flares', s.flareRounds, s.flareFull, s.flareRoundsNext);
  const dcs = alive.filter((u) => u.stats.depthCharges);
  if (dcs.length) add('Depth charges', dcs.reduce((n, u) => n + (u.dcLeft ?? u.stats.depthCharges.count), 0), dcs.reduce((n, u) => n + u.stats.depthCharges.count, 0), soonest(dcs, 'dcLeftNext'));
  if (st.minelayer) add('Mines', s.minesLeft ?? st.minelayer.count, st.minelayer.count, s.minesLeftNext);
  return out;
}
