// The world campaign's engine (design doc: "Cold Steel — World Campaign design"): one war per campaign on a map of
// theatres, provinces and sea zones (src/wcampaign/wars/*.js), played in turns of half a week. No game imports and no
// DOM: the whole state is plain JSON (saved by ./save.js), and the engine runs headless (tools/campaign_sim.mjs).
//
//   newCampaign(war, opts)        a fresh state from one of the war's scenarios
//   order(c, side, forceId, to)   move an army, fleet or air wing (validated; `land: true` = an army's landing from a fleet)
//   resolveTurn(c)                both sides' orders at once → this turn's battles (c.board)
//   settle(c, battleId, outcome)  a battle's result back onto the map (a fought or delegated battle's outcome, or autoResolve's)
//   autoResolve(c, battleId)      the instant result from strength, ground, supply, air, commanders and luck
//   endTurn(c)                    after the board: supply, attrition, pockets, production, morale, the calendar
//
// Power comes from the unit types through `c.power` (set by the caller: in the game the types' costs, headless a table).
// Randomness is the campaign's own seeded generator, stored in the state — a saved campaign replays the same.

export const VERSION = 1;
const TURN_DAYS = 3.5;
const CUT_SURRENDER = 6;           // turns cut off before a pocket surrenders (three weeks)
const ATTRITION = 0.05;
/** National morale (0: the side sues for peace): what a loss costs, how fast it comes back in a quiet turn, the most it holds. */
export const MORALE = { province: 1, gain: 0.6, destroyed: 2, fleet: 2.5, surrender: 4, depot: 15, recover: 0.4, floor: 25 };            // of each unit's strength, a turn cut off
const DEFAULT_POWER = { rifles: 150, mgTeam: 140, atTeam: 150, mortar: 140, engineers: 130, scouts: 100, tank: 300, ifv: 200, tankDestroyer: 260, reconVehicle: 160, artillery: 260, observers: 90, towedAA: 120,
  battleship: 1800, cruiser: 900, destroyer: 450, frigate: 280, carrier: 1600, transport: 200, oldBattleship: 1000, submarine: 420, ptBoat: 150 };
const SQUADRON = { fighter: 220, strike: 240, bomber: 300, recon: 80, transport: 60 };
/** A battle draws reserves from its side's pool (replacements, shells, fuel): this share of the pool, at most RESERVE.max power. */
export const RESERVE = { share: 0.15 }; // (the side that produces more has more to throw in: production decides the long war)
/** How many of a turn's battles go on the board to be fought or delegated (c.battles); the smaller rest are settled at once. */
export const BATTLE_COUNT = { small: 4, normal: 8, grand: Infinity };
export const STACK = { army: 3, fleet: 3, battalions: 6 }; // army groups a province, fleets a sea zone (the front must be held, not piled up)
/**
 * The war economy: a stockpile holds at most `stockTurns` turns of income (what isn't spent is lost — production is for
 * using), and every force costs its upkeep each turn (a battalion, a ship, a squadron of aircraft).
 */
export const ECON = { stockTurns: 6, stockFloor: 4000, upkeep: { battalion: 8, ship: 6, squadron: 4 } };
/** A theatre's priority (c.priority[side][theatre]): its battles' share of the reserves, where new units are raised first. */
export const PRIORITY = { low: 0.5, normal: 1, high: 1.6 };
/**
 * An air wing's mission for the turn (c.missions[side][wingId] = { kind, at }), anywhere in its reach (airReach): no
 * mission is air cover over its own base. Fighters fly cover and escort; strike squadrons support, strike or hit ships.
 */
export const MISSIONS = {
  support: { name: 'Close support', text: 'its strike aircraft join the battle there, its fighters hold that sky' },
  recon: { name: 'Reconnaissance', text: 'see the enemy in it and round it' },
  attack: { name: 'Attack', text: 'bomb the enemy there: on land its troops and production, at sea its ships' },
};
/** Old saves' mission names → today's (a wing's mission is given again each turn: only one in hand when saved). */
const MISSION_WAS = { strike: 'attack', naval: 'attack', cover: 'support' };
const STRIKERS = ['strike', 'bomber'];
/** What new forces cost beyond their units: a fleet is built in a port, an air wing formed at an airfield. */
export const AIR_WING = { fighter: 1, strike: 1 };
const TRAITS = ['aggressive', 'careful', 'logistician', 'tenacious', 'night', 'artillerist'];

// ---------------------------------------------------------------- randomness (stored, so a save replays)

function rand(c) {
  c.rng = (c.rng + 0x6d2b79f5) | 0;
  let t = Math.imul(c.rng ^ (c.rng >>> 15), 1 | c.rng);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (c, list) => list[Math.floor(rand(c) * list.length)];

// ---------------------------------------------------------------- a new campaign

/**
 * @param {any} war  the war's data (wars/ww2.js)
 * @param {{ scenario?: string, side?: 'nato'|'pact', battles?: 'small'|'normal'|'grand', difficulty?: number, seed?: number, maps?: Set<string> }} o
 *   `maps`: the map ids that exist (a planned map not built yet is dropped: its battles are resolved)
 */
export function newCampaign(war, o = {}) {
  const sc = war.scenarios[o.scenario ?? Object.keys(war.scenarios)[0]];
  const has = (id) => id && (!o.maps || o.maps.has(id));
  const c = {
    v: VERSION, war: war.id, scenario: o.scenario ?? Object.keys(war.scenarios)[0], seed: o.seed ?? 1944, rng: o.seed ?? 1944,
    side: o.side ?? 'nato', battles: o.battles ?? 'normal', difficulty: o.difficulty ?? 1,
    turn: 1, start: sc.start, over: null, eventsDone: (war.events ?? []).filter((e) => e.date < sc.start).map((e) => e.id), // (a scenario already shows what happened before its start)
    provinces: {}, seas: {}, forces: [], nextId: 1,
    pool: { nato: 0, pact: 0 }, morale: { nato: 100, pact: 100 }, industry: { nato: 1, pact: 1, ...(sc.industry ?? {}) },
    priority: { nato: {}, pact: {} },
    orders: { nato: {}, pact: {} }, board: [], log: [],
  };
  for (const [id, p] of Object.entries(war.provinces)) {
    const depot = id in (sc.depots ?? {}) ? sc.depots[id] : p.depot ?? null; // (a scenario can hold a depot back: Algeria before Torch)
    const owner = depot ?? (sc.owners.nato.includes(id) ? 'nato' : 'pact');
    c.provinces[id] = { owner, depot, fort: p.fort ?? 0, cut: 0, map: has(p.map) ? p.map : null, coastal: (p.coastal ?? []).filter(has), scars: 0 };
  }
  for (const [id, s] of Object.entries(war.seas)) c.seas[id] = { map: has(s.map) ? s.map : null };
  for (const t of Object.keys(war.theatres)) for (const f of ['nato', 'pact']) c.priority[f][t] = 1;
  for (const f of sc.forces) spawnForce(c, war, f);
  applyEvents(c, war); // (what had already happened by the start date)
  c.held = Object.fromEntries(['nato', 'pact'].map((side) => [side, Object.values(c.provinces).filter((p) => p.owner === side).reduce((a, p) => a + (p.depot === side ? 3 : 1), 0)])); // (the ground morale is measured against)
  c.objectives = Object.fromEntries((war.objectives ?? []).map((o) => [o.id, { holder: null, turns: 0, won: null, start: holderOf(c, war, o) }])); // (who holds each when the war begins)
  if (war.escalation) c.escalation = war.escalation.start ?? 0;
  return c;
}

/** A side's name in this war (war.sides: the Allies, NATO …), `the` in front when asked. */
export const sideName = (war, side, the = false) => { const n = war.sides?.[side] ?? side; return the && !/^the /i.test(n) ? `the ${n}` : n; };

/**
 * The nuclear shadow (war.escalation, 1985): `by` nearer the brink (a base taken: E.depot; a base bombed: E.strike). Each
 * level crossed on the way up is told once and costs both sides E.level.morale; the last ends the war — a ceasefire on
 * the lines held, won by the side in better heart. Quiet turns let it ebb (endTurn: E.decay).
 */
export function escalate(c, war, by) {
  const E = war.escalation;
  if (!E || c.over) return;
  const was = c.escalation ?? E.start ?? 0;
  c.escalation = Math.max(0, Math.min(100, was + by));
  c.escalatedAt = c.turn;
  for (const L of E.levels) {
    if (!(was < L.at && c.escalation >= L.at)) continue;
    c.log.push({ turn: c.turn, date: dateOf(c), text: L.text ?? L.end, brink: L.at });
    if (L.morale) for (const side of ['nato', 'pact']) c.morale[side] -= L.morale;
    if (L.end) c.over = { winner: c.morale.nato >= c.morale.pact ? 'nato' : 'pact', why: L.end, ceasefire: true };
  }
}

/**
 * The war's dated events (war.events: { id, date, owner?: { province: side }, depot?: { province: side|null },
 * forces?: [...], morale?: { side: n }, text }) — each once, on the first turn on or after its date. Campaigns are
 * endless (the user's rule): the real calendar runs on until one side's morale breaks.
 */
export function applyEvents(c, war) {
  const today = dateOf(c);
  for (const e of war.events ?? []) {
    if (c.eventsDone.includes(e.id) || e.date > today) continue;
    c.eventsDone.push(e.id);
    for (const [id, side] of Object.entries(e.owner ?? {})) c.provinces[id].owner = side;
    for (const [id, side] of Object.entries(e.depot ?? {})) c.provinces[id].depot = side;
    for (const f of e.forces ?? []) {
      // (the war has gone its own way: a power that has surrendered sends nothing; a force due somewhere the enemy holds
      // arrives at a base of its side in the same theatre instead — or not at all)
      if (Object.entries(war.powers ?? {}).some(([id, pw]) => c.surrendered?.includes(id) && pw.armies.includes(f.army))) continue;
      let at = f.at;
      if (war.provinces[at] && c.provinces[at].owner !== f.side) {
        const t = war.provinces[at].theatre;
        at = Object.keys(war.provinces).find((k) => war.provinces[k].theatre === t && c.provinces[k].depot === f.side && c.provinces[k].owner === f.side) ?? null;
      }
      if (at) spawnForce(c, war, { ...f, at });
    }
    for (const [side, n] of Object.entries(e.morale ?? {})) c.morale[side] += n;
    for (const [side, k] of Object.entries(e.industry ?? {})) c.industry[side] = k; // (war production from now on: the US arsenal, the bombing of the Reich)
    c.log.push({ turn: c.turn, date: today, event: e.id, text: e.text });
  }
}

/** A force onto the map: an army's battalions of stacks, a fleet's ships, an air wing's squadrons, a commander. */
export function spawnForce(c, war, f) {
  const force = { id: c.nextId++, kind: f.kind, side: f.side, army: f.army, at: f.at, name: f.name, cut: 0, moved: false,
    commander: { name: f.commander ?? `${f.name}'s commander`, trait: pick(c, TRAITS), xp: 0 } };
  if (f.kind === 'army') force.battalions = f.battalions.map((b) => ({ kind: b, units: war.battalions[b].map((t) => ({ t, hp: 1, vet: 0 })) }));
  if (f.kind === 'fleet') force.ships = war.fleets[f.ships].map((t) => ({ t, hp: 1, vet: 0 }));
  if (f.kind === 'air') force.squadrons = Object.entries(f.squadrons).map(([k, n]) => ({ k, planes: n * 12 }));
  c.forces.push(force);
  return force;
}

// ---------------------------------------------------------------- reading the map

export const forceById = (c, id) => c.forces.find((f) => f.id === id);
export const forcesAt = (c, at, side = null, kind = null) => c.forces.filter((f) => f.at === at && (!side || f.side === side) && (!kind || f.kind === kind));
export const enemy = (side) => (side === 'nato' ? 'pact' : 'nato');
const units = (f) => (f.kind === 'army' ? f.battalions.flatMap((b) => b.units) : f.ships ?? []);
/** A force's strength 0..1: its units' average hp. */
const strengthOf = (f) => { const us = units(f); return us.length ? us.reduce((a, u) => a + Math.max(0, u.hp), 0) / us.length : 0; };

/** A force's fighting power: its units' power × strength × veterancy (an air wing: its planes). */
export function power(c, f) {
  if (f.kind === 'air') return f.squadrons.reduce((a, s) => a + (SQUADRON[s.k] ?? 100) * s.planes / 12, 0);
  const p = c.power ?? DEFAULT_POWER;
  return units(f).reduce((a, u) => a + (p[u.t] ?? 120) * Math.max(0, u.hp) * (1 + 0.12 * u.vet), 0);
}

/** Provinces next to `id` by land, and those across a sea zone touching it (landings, embarking). */
export const landNeighbours = (war, id) => war.provinces[id]?.land ?? [];

/**
 * The provinces each side can supply: from its depots through its own provinces by land, and over a sea zone that
 * touches both ends where it has a fleet and the enemy none (a sea lane).
 */
export function supplied(c, war, side) {
  const own = (id) => c.provinces[id]?.owner === side;
  const lane = (s) => forcesAt(c, s, side, 'fleet').length > 0 && forcesAt(c, s, enemy(side), 'fleet').length === 0;
  const seen = new Set(), queue = Object.keys(war.provinces).filter((id) => c.provinces[id].depot === side && c.provinces[id].owner === side);
  for (const id of queue) seen.add(id);
  while (queue.length) {
    const id = queue.shift(), p = war.provinces[id];
    const next = [...p.land];
    for (const s of p.seas ?? []) if (lane(s)) next.push(...war.seas[s].coasts);
    for (const n of next) if (own(n) && !seen.has(n)) { seen.add(n); queue.push(n); }
  }
  return seen;
}

// ---------------------------------------------------------------- orders

/** The sea zone a landing from port `from` onto coast `to` goes in by: one off `to` that `side`'s fleet holds, within two zones of the port's. */
export function landingZone(c, war, side, from, to) {
  const start = war.provinces[from].seas ?? [], near = new Set(start);
  for (const z of start) for (const n of war.seas[z].seas) near.add(n);
  for (const z of [...near]) for (const n of war.seas[z].seas) near.add(n);
  return (war.provinces[to].seas ?? []).find((z) => near.has(z) && forcesAt(c, z, side, 'fleet').length && !forcesAt(c, z, enemy(side), 'fleet').length) ?? null;
}

/** How many of `side`'s forces of `kind` will be at `to` after the orders given so far (those staying and those coming). */
function incoming(c, side, to, kind) {
  const o = c.orders[side];
  return c.forces.filter((f) => f.side === side && f.kind === kind && ((f.at === to && !o[f.id]) || o[f.id]?.to === to)).length;
}

/**
 * One force's move for this turn. `to`: a province (army, air wing) or a sea zone (fleet). An army moves one province by
 * land, or lands (`land: true`) on a coastal province across a sea zone where its side has a fleet; a fleet moves to a
 * neighbouring sea zone; an air wing rebases to an own airfield within two provinces. Returns '' or why not.
 */
export function order(c, war, side, forceId, to, { land = false } = {}) {
  const f = forceById(c, forceId);
  if (!f || f.side !== side) return 'not yours';
  if (to === f.at) { delete c.orders[side][forceId]; return ''; }
  if (f.kind === 'army') {
    const from = war.provinces[f.at], dest = war.provinces[to];
    if (!dest) return 'no such province';
    if (dest.safe && c.provinces[to].owner !== side) return `${dest.name} is out of the war’s reach`; // (a homeland across an ocean: the United States in 1985)
    if (land) {
      if (!from.port) return 'embark from a port';
      if (c.provinces[to].owner === side && incoming(c, side, to, 'army') >= STACK.army) return `no room: ${STACK.army} army groups there already`; // (by sea as by land)
      const zone = landingZone(c, war, side, f.at, to);
      if (!zone) return 'no fleet of yours off that coast within two sea zones of the port';
      c.orders[side][forceId] = { to, land: true, zone };
      return '';
    }
    if (!from.land.includes(to)) return 'not next to it by land';
    if (c.provinces[to].owner === side && incoming(c, side, to, 'army') >= STACK.army) return `no room: ${STACK.army} army groups there already`;
    c.orders[side][forceId] = { to };
    return '';
  }
  if (f.kind === 'fleet') {
    if (!war.seas[f.at].seas.includes(to)) return 'not a neighbouring sea zone';
    if (incoming(c, side, to, 'fleet') >= STACK.fleet) return `no room: ${STACK.fleet} fleets there already`;
    c.orders[side][forceId] = { to };
    return '';
  }
  // an air wing: to an own airfield within its reach (airReach: over land or sea)
  if (!war.provinces[to]?.airfield || c.provinces[to].owner !== side) return 'an own airfield';
  if (!airReach(war, f.at).has(to)) return 'too far';
  c.orders[side][forceId] = { to };
  return '';
}

// ---------------------------------------------------------------- the turn

/**
 * Both sides' orders happen at once. Fleets first (a landing needs its sea zone), then armies; every contact becomes a
 * battle on the board: `sea` where enemy fleets share a zone, `coastal` where a landing meets a defended or enemy-held
 * coast, `land` where an army moves into an enemy province or onto enemy forces.
 */
export function resolveTurn(c, war) {
  c.board = [];
  // fleets move
  for (const side of ['nato', 'pact']) for (const [id, o] of Object.entries(c.orders[side])) { const f = forceById(c, +id); if (f?.kind === 'fleet') f.at = o.to; }
  for (const s of Object.keys(war.seas)) {
    const a = forcesAt(c, s, 'nato', 'fleet'), b = forcesAt(c, s, 'pact', 'fleet');
    if (a.length && b.length) addBattle(c, war, { kind: 'sea', at: s, map: c.seas[s].map, attackers: a.map((f) => f.id), defenders: b.map((f) => f.id), attackerSide: 'nato' });
  }
  // contested ground: both sides' armies still there → the fight goes on (the side that doesn't own it attacks)
  for (const [id, p] of Object.entries(c.provinces)) {
    const n = forcesAt(c, id, 'nato', 'army'), q = forcesAt(c, id, 'pact', 'army');
    if (n.length && q.length) { const att = p.owner === 'nato' ? q : n, def = p.owner === 'nato' ? n : q; addBattle(c, war, { kind: 'land', at: id, map: p.map, from: id, attackers: att.map((f) => f.id), defenders: def.map((f) => f.id), attackerSide: att[0].side, contested: true }); }
  }
  // air wings rebase
  for (const side of ['nato', 'pact']) for (const [id, o] of Object.entries(c.orders[side])) { const f = forceById(c, +id); if (f?.kind === 'air') f.at = o.to; }
  resolveAir(c, war);
  // armies: where each is going
  const moves = [];
  for (const side of ['nato', 'pact']) for (const [id, o] of Object.entries(c.orders[side])) { const f = forceById(c, +id); if (f?.kind === 'army') moves.push({ f, ...o, from: f.at }); }
  for (const m of moves) {
    const p = c.provinces[m.to];
    if (c.board.some((b) => b.contested && b.attackers.concat(b.defenders).includes(m.f.id))) continue; // (locked in a fight where it stands)
    const defenders = forcesAt(c, m.to, enemy(m.f.side), 'army').filter((d) => !moves.some((n) => n.f === d && n.to !== m.from)); // (one that moves away and not at us: gone)
    const crossing = moves.find((n) => n.f.side !== m.f.side && n.to === m.from && n.from === m.to); // (both into the other's province: they meet on the way)
    if (crossing && m.f.side === 'pact') continue; // (one battle for the pair: counted once, nato's)
    if (m.land) {
      if (c.board.some((b) => b.kind === 'sea' && b.at === m.zone && !b.done)) { m.waitSea = m.zone; }
      const joinL = c.board.find((b) => b.kind === 'coastal' && b.at === m.to && b.attackerSide === m.f.side);
      if (joinL) { joinL.attackers.push(m.f.id); continue; }
      if (p.owner !== m.f.side || defenders.length) addBattle(c, war, { kind: 'coastal', at: m.to, map: p.coastal[0] ?? null, from: m.from, zone: m.zone, attackers: [m.f.id], defenders: defenders.map((d) => d.id), attackerSide: m.f.side, waitSea: m.waitSea ?? null });
      else m.f.at = m.to;
      continue;
    }
    if (p.owner !== m.f.side || defenders.length || crossing) {
      const join = c.board.find((b) => b.kind === 'land' && b.at === m.to && b.attackerSide === m.f.side);
      if (join) { join.attackers.push(m.f.id); continue; }
      addBattle(c, war, { kind: 'land', at: m.to, map: p.map, from: m.from, attackers: [m.f.id], defenders: [...defenders, ...(crossing ? [crossing.f] : [])].map((d) => d.id), attackerSide: m.f.side });
    } else m.f.at = m.to; // (into own ground, nobody there: just moves)
  }
  // a defender in a province next to the battle may hold its ground as a reserve: neighbours named on the battle
  for (const b of c.board) if (b.kind === 'land') b.support = (war.provinces[b.at].land ?? []).flatMap((n) => forcesAt(c, n, enemy(b.attackerSide), 'army').map((f) => f.id)).slice(0, 1);
  c.orders = { nato: {}, pact: {} };
  // the battle count: the biggest battles stay on the board; the rest (the smallest first, the sea before the land: a landing
  // may wait on it) are settled at once
  const cap = BATTLE_COUNT[c.battles] ?? BATTLE_COUNT.normal;
  if (c.board.length > cap) {
    const size = (b) => [...b.attackers, ...b.defenders, ...(b.support ?? [])].map((id) => forceById(c, id)).filter(Boolean).reduce((a, f) => a + power(c, f), 0);
    const small = [...c.board].sort((x, y) => size(y) - size(x)).slice(cap).sort((x, y) => Number(y.kind === 'sea') - Number(x.kind === 'sea'));
    for (const b of small) if (!b.done) { settle(c, war, b.id, { ...autoResolve(c, war, b.id), how: 'auto' }); b.note ??= 'settled at once (battle count)'; }
  }
  return c.board;
}

function addBattle(c, war, b) {
  const t = war.provinces[b.at]?.theatre ?? war.seas[b.at]?.theatre;
  c.board.push({ id: `${c.turn}-${c.board.length + 1}`, theatre: t, done: false, ...b });
}

/** Where an air wing based at `base` can fly: within two land steps, and the sea zones off those coasts. */
export function airReach(war, base, hops = 2) {
  // steps: a road between provinces or a crossing between sea zones is one; out over a coast onto its sea zone, or in from
  // it, is free (an island's planes fly as far over the sea as a mainland's over the land)
  const dist = new Map([[base, 0]]), queue = [base];
  const edges = (n) => (war.provinces[n] ? [...(war.provinces[n].land ?? []).map((m) => [m, 1]), ...(war.provinces[n].seas ?? []).map((z) => [z, 0])]
    : [...(war.seas[n]?.seas ?? []).map((z) => [z, 1]), ...(war.seas[n]?.coasts ?? []).map((k) => [k, 0])]);
  while (queue.length) {
    const n = queue.shift(), d = dist.get(n);
    for (const [m, w] of edges(n)) {
      const nd = d + w;
      if (nd > hops || (dist.has(m) && dist.get(m) <= nd)) continue;
      dist.set(m, nd);
      if (w === 0) queue.unshift(m); else queue.push(m);
    }
  }
  return new Set(dist.keys());
}

/** Give air wing `wingId` a mission (MISSIONS) over `at`. Returns '' or why not. */
export function mission(c, war, side, wingId, kind, at) {
  const f = forceById(c, wingId);
  if (!f || f.side !== side || f.kind !== 'air') return 'not an air wing of yours';
  if (!MISSIONS[kind]) return 'no such mission';
  if (!airReach(war, f.at).has(at)) return 'out of its reach';
  if (kind === 'support' && war.seas[at]) return 'close support is flown over a province';
  if (kind === 'attack' && war.provinces[at] && c.provinces[at].owner === side) return 'attack the enemy’s ground, or a sea zone';
  ((c.missions ??= { nato: {}, pact: {} })[side] ??= {})[wingId] = { kind, at };
  return '';
}

/**
 * This turn's air war, flown by every wing on its mission (out of reach after a rebase: cover over its base). Over each
 * place the two sides' fighters fight it out (both lose aircraft, the outnumbered more); strikes and naval strikes run
 * the gauntlet of the enemy's fighters there (escorts help) and then hit; recon shows what is there. Leaves c.sky (the
 * fighters over each place, for airShare), c.support (strike aircraft over a battle), c.seenBy (recon) and the damage.
 */
export function resolveAir(c, war) {
  c.sky = {}; c.support = { nato: {}, pact: {} }; c.seenBy = { nato: [], pact: [] };
  const planes = (f, kinds) => f.squadrons.filter((q) => kinds.includes(q.k)).reduce((a, q) => a + q.planes, 0);
  const lose = (f, kinds, n) => { const total = planes(f, kinds); if (!total) return; for (const q of f.squadrons) if (kinds.includes(q.k)) q.planes = Math.max(0, Math.round(q.planes - n * q.planes / total)); };
  const flying = c.forces.filter((f) => f.kind === 'air').map((f) => {
    const m = c.missions?.[f.side]?.[f.id];
    const kind = MISSION_WAS[m?.kind] ?? m?.kind;
    return { f, m: m && MISSIONS[kind] && airReach(war, f.at).has(m.at) ? { ...m, kind } : { kind: 'cover', at: f.at } }; // (none: its fighters over its own base)
  });
  const places = [...new Set(flying.map((w) => w.m.at))];
  for (const at of places) {
    const here = flying.filter((w) => w.m.at === at), side = (s) => here.filter((w) => w.f.side === s);
    const fighters = (s) => side(s).reduce((a, w) => a + planes(w.f, ['fighter']), 0);
    const fN = fighters('nato'), fP = fighters('pact');
    if (fN && fP) { // the dogfight: each side loses in proportion to the other's numbers
      for (const [s, mine, theirs] of [['nato', fN, fP], ['pact', fP, fN]]) {
        const loss = theirs * 0.12 * (theirs / (mine + theirs)) * (0.7 + rand(c) * 0.6);
        for (const w of side(s)) lose(w.f, ['fighter'], loss * planes(w.f, ['fighter']) / mine);
      }
    }
    c.sky[at] = { nato: fighters('nato'), pact: fighters('pact') };
    for (const s of ['nato', 'pact']) {
      const foe = enemy(s), escort = c.sky[at][s], enemyF = c.sky[at][foe];
      for (const w of side(s)) {
        const { kind } = w.m;
        if (kind === 'recon') { c.seenBy[s].push(at, ...landNeighbours(war, at)); continue; }
        const n = planes(w.f, STRIKERS);
        if (!n || kind === 'cover') continue;
        const shotDown = n * 0.2 * (enemyF / (enemyF + escort + n || 1)); // (intercepted: escorts draw them off)
        lose(w.f, STRIKERS, shotDown);
        const through = planes(w.f, STRIKERS);
        if (kind === 'support') c.support[s][at] = (c.support[s][at] ?? 0) + through;
        else if (kind === 'attack' && war.provinces[at] && c.provinces[at].owner === foe && through > 4) {
          c.provinces[at].bombed = 2; // (two turns of reduced production)
          if (c.provinces[at].depot === foe) escalate(c, war, war.escalation?.strike ?? 0); // (a strike deep in the enemy's homeland: nearer the brink)
          const fortHit = through > 20 && c.provinces[at].fort > 0 && rand(c) < 0.25;
          if (fortHit) c.provinces[at].fort--;
          // the troops there: bombed and strafed (a full wing of strike aircraft through: about a tenth of their strength)
          const hit = forcesAt(c, at, foe, 'army').map((f) => { const was = strengthOf(f); wound(c, f, Math.min(0.12, through / 260)); prune(c, f); return `${f.name} ${c.forces.includes(f) ? `−${Math.max(1, Math.round((was - strengthOf(f)) * 100))} %` : 'destroyed'}`; });
          c.log.push({ turn: c.turn, date: dateOf(c), side: s, text: `${w.f.name} struck ${war.provinces[at].name}: ${hit.length ? `${hit.join(', ')}; ` : 'no troops there; '}its production cut for two turns${fortHit ? ', its defences damaged' : ''}${shotDown >= 1 ? ` — ${Math.round(shotDown)} aircraft lost` : ''}.` });
        } else if (kind === 'attack' && war.seas[at]) {
          const hit = forcesAt(c, at, foe, 'fleet').map((fl) => { const was = strengthOf(fl); wound(c, fl, Math.min(0.35, through / 160)); prune(c, fl); return `${fl.name} ${c.forces.includes(fl) ? `−${Math.max(1, Math.round((was - strengthOf(fl)) * 100))} %` : 'sunk'}`; });
          c.log.push({ turn: c.turn, date: dateOf(c), side: s, text: `${w.f.name} struck at sea in ${war.seas[at].name}: ${hit.length ? hit.join(', ') : 'no enemy ships found'}${shotDown >= 1 ? ` — ${Math.round(shotDown)} aircraft lost` : ''}.` });
        }
      }
    }
  }
  for (const f of c.forces.filter((x) => x.kind === 'air')) prune(c, f);
  c.missions = { nato: {}, pact: {} }; // (given again each turn; none: cover over the base)
}

/** Air superiority over a province for `side`: its fighters within reach (a wing's base or next to it) against the enemy's, 0..1. */
export function airShare(c, war, at, side) {
  const sky = c.sky?.[at];
  if (sky && sky.nato + sky.pact > 0) return sky[side] / (sky.nato + sky.pact); // (this turn's air war over it)
  const reach = (f) => f.at === at || landNeighbours(war, f.at).includes(at) || (war.seas[at] && (war.seas[at].coasts ?? []).includes(f.at));
  const fighters = (s) => c.forces.filter((f) => f.kind === 'air' && f.side === s && reach(f)).reduce((a, f) => a + f.squadrons.filter((q) => q.k === 'fighter').reduce((x, q) => x + q.planes, 0), 0);
  const a = fighters(side), b = fighters(enemy(side));
  return a + b ? a / (a + b) : 0.5;
}

/**
 * The instant result: each side's power (its forces, the ground's forts for the defender, supply, air superiority,
 * commanders' traits) and the campaign's luck → `margin` 0..1 for the attacker, and the losses that follow.
 */
export function autoResolve(c, war, battleId) {
  const b = c.board.find((x) => x.id === battleId);
  const side = b.attackerSide, other = enemy(side);
  const A = b.attackers.map((id) => forceById(c, id)).filter(Boolean), D = [...b.defenders, ...(b.support ?? [])].map((id) => forceById(c, id)).filter(Boolean);
  const trait = (fs, t) => (fs.some((f) => f.commander?.trait === t) ? 1 : 0);
  const sup = (fs) => (fs.every((f) => f.cut === 0) ? 1 : 0.6);
  let pa = A.reduce((a, f) => a + power(c, f), 0) * sup(A) * (1 + 0.1 * trait(A, 'aggressive'));
  let pd = D.reduce((a, f) => a + power(c, f), 0) * sup(D) * (1 + 0.1 * trait(D, 'tenacious'));
  if (b.kind !== 'sea') {
    pd *= 1 + 0.25 * Math.max(c.provinces[b.at].fort ?? 0, c.provinces[b.at].depot ? 2 : 0); // prepared defences (a depot: a fortress)
    if (b.kind === 'coastal') pd *= 1.3;                                 // landing under fire
    const air = airShare(c, war, b.at, side);
    pa *= 0.85 + 0.3 * air; pd *= 0.85 + 0.3 * (1 - air);               // whoever owns the sky
    pa += (c.support?.[side]?.[b.at] ?? 0) * 22; pd += (c.support?.[other]?.[b.at] ?? 0) * 22; // close support: the strike aircraft over it
  }
  if (winterNow(c, war) && b.theatre === war.winter.theatre) { if (side === war.winter.attacks) pa *= war.winter.bonus; } // (winter: the side at home in it attacks harder)
  if (side !== c.side) pa *= c.difficulty; else pd *= c.difficulty;      // (harder: the AI's side stronger)
  if (!D.length) pd = Math.max(pd, 150 * (1 + (c.provinces[b.at]?.fort ?? 0))); // (an empty province still has its garrison and its mines)
  const ra = reserves(c, side, b.theatre), rd = reserves(c, other, b.theatre); // (each side throws in what its pool can send there: the theatre's priority)
  pa += ra; pd += rd;
  b.reserves = { [side]: ra, [other]: rd };
  const luck = 0.8 + rand(c) * 0.4;
  const margin = pa * luck / (pa * luck + pd || 1);
  return { margin, losses: { attackers: 0.12 + (1 - margin) * 0.35, defenders: 0.12 + margin * 0.35 } };
}

/** The reserves `side` can throw into one battle: a share of its pool, capped (paid when the battle is settled). */
export const reserves = (c, side, theatre = null) => Math.max(0, c.pool[side]) * RESERVE.share * (theatre ? c.priority?.[side]?.[theatre] ?? 1 : 1);

/**
 * A battle's result onto the map. `outcome`: { margin (0..1 for the attacker), losses: { attackers, defenders } as
 * shares of strength, or survivors: { [forceId]: units } from a fought battle }. ≥ 0.6: the attacker takes the
 * ground (land: the province; sea: the zone, the loser falls back); 0.45–0.6: contested, both stay; below: the attack fails.
 */
export function settle(c, war, battleId, outcome) {
  const b = c.board.find((x) => x.id === battleId);
  if (!b || b.done) return;
  b.done = true;
  b.margin = outcome.margin;
  for (const [s2, r] of Object.entries(b.reserves ?? {})) c.pool[s2] = Math.max(0, c.pool[s2] - Math.round(r * 0.6)); // (the reserves: spent, most of them)
  const A = b.attackers.map((id) => forceById(c, id)).filter(Boolean), D = [...b.defenders, ...(b.support ?? [])].map((id) => forceById(c, id)).filter(Boolean);
  const alive = (fs) => fs.reduce((a, f) => a + (f.kind === 'air' ? 0 : units(f).filter((u) => u.hp > 0.05).length), 0), before = { A: alive(A), D: alive(D) };
  if (outcome.survivors) for (const [id, us] of Object.entries(outcome.survivors)) { const f = forceById(c, +id); if (f) setUnits(f, us); }
  else { for (const f of A) wound(c, f, outcome.losses.attackers); for (const f of D) wound(c, f, outcome.losses.defenders); }
  for (const f of [...A, ...D]) { for (const u of units(f)) if (u.hp > 0) u.vet = Math.min(3, u.vet + (rand(c) < 0.3 ? 1 : 0)); prune(c, f); }
  // aircraft lost over a battle fought on its map: off the side's air wings that could reach it, in proportion to their planes
  for (const [s2, n] of Object.entries(outcome.airLost ?? {})) {
    const wings = c.forces.filter((f) => f.kind === 'air' && f.side === s2 && airReach(war, f.at).has(b.at)), total = wings.reduce((a, f) => a + f.squadrons.reduce((x, q) => x + q.planes, 0), 0);
    if (!n || !total) continue;
    for (const f of wings) { for (const q of f.squadrons) q.planes = Math.max(0, Math.round(q.planes - n * q.planes / total)); prune(c, f); }
  }
  const side = b.attackerSide, live = (fs) => fs.filter((f) => c.forces.includes(f));
  b.lost = { [side]: before.A - alive(live(A)), [enemy(side)]: before.D - alive(live(D)) }; // (units gone: the letters count them)
  b.how = outcome.how ?? 'auto';
  const won = outcome.margin >= 0.6, held = outcome.margin >= 0.45;
  if (b.kind === 'sea') {
    if (won) for (const f of live(D)) retreatFleet(c, war, f);
    else if (!held) for (const f of live(A)) retreatFleet(c, war, f);
    // a landing waiting on this zone: it goes ahead only if its side holds the sea
    for (const l of c.board.filter((x) => x.waitSea === b.at && !x.done)) if (!(side === l.attackerSide ? won : !held)) { l.done = true; l.margin = 0; l.note = 'the landing was called off: the sea was not won'; }
  } else {
    const p = c.provinces[b.at];
    if (won) {
      for (const f of live(D)) if (f.at === b.at) retreat(c, war, f);
      if (live(D).every((f) => f.at !== b.at)) { if (p.owner !== side) { const lost = p.depot === enemy(side); p.owner = side; if (lost) p.depot = side; /* (a base taken: the captor’s now — its rail yards and stores) */ c.morale[side] += MORALE.gain; c.morale[enemy(side)] -= lost ? MORALE.depot : MORALE.province; if (lost) { c.log.push({ turn: c.turn, depotLost: b.at, side: enemy(side) }); escalate(c, war, war.escalation?.depot ?? 0); } } for (const f of live(A)) f.at = b.at; }
      p.fort = Math.max(0, p.fort - 1);
    } else if (held) { for (const f of live(A)) f.at = b.at; p.contested = true; }
    // a failed attack stays where it came from (a failed landing: back on its ships, at the port it left)
    p.scars = Math.min(5, p.scars + 1);
  }
  c.log.push({ turn: c.turn, id: b.id, kind: b.kind, at: b.at, side, margin: +outcome.margin.toFixed(2), how: outcome.how ?? 'auto' });
}

const setUnits = (f, us) => { if (f.kind === 'army') { let i = 0; for (const bn of f.battalions) for (const u of bn.units) { const s = us[i++]; if (s) Object.assign(u, s); else u.hp = 0; } } else f.ships = us; };
function wound(c, f, share) {
  if (f.kind === 'air') { for (const s of f.squadrons) s.planes = Math.max(0, Math.round(s.planes * (1 - share * 0.5))); return; }
  for (const u of units(f)) u.hp = Math.max(0, u.hp - share * (0.5 + rand(c)));
}
/** Units at nothing are gone; a battalion with none left is gone; a force with nothing left is destroyed. */
function prune(c, f) {
  if (f.kind === 'army') { for (const b of f.battalions) b.units = b.units.filter((u) => u.hp > 0.05); f.battalions = f.battalions.filter((b) => b.units.length); }
  if (f.kind === 'fleet') f.ships = f.ships.filter((u) => u.hp > 0.05);
  if (f.kind === 'air') f.squadrons = f.squadrons.filter((s) => s.planes > 0);
  if (!(f.battalions ?? f.ships ?? f.squadrons).length) { c.forces.splice(c.forces.indexOf(f), 1); c.morale[f.side] -= f.kind === 'fleet' ? MORALE.fleet : MORALE.destroyed; c.log.push({ turn: c.turn, destroyed: f.name, side: f.side }); }
}
/** Back to an own neighbouring province (the one nearest the depot); none: the force is caught — half lost, then it surrenders. */
function retreat(c, war, f) {
  const back = (war.provinces[f.at].land ?? []).filter((n) => c.provinces[n].owner === f.side);
  if (back.length) { f.at = back.sort((a, b) => forcesAt(c, a, f.side).length - forcesAt(c, b, f.side).length)[0]; return; }
  wound(c, f, 0.5); prune(c, f);
  if (c.forces.includes(f)) { c.forces.splice(c.forces.indexOf(f), 1); c.morale[f.side] -= MORALE.surrender; c.log.push({ turn: c.turn, surrendered: f.name, side: f.side }); }
}
function retreatFleet(c, war, f) { const z = war.seas[f.at].seas.find((s) => !forcesAt(c, s, enemy(f.side), 'fleet').length); if (z) f.at = z; }

/** After the board: supply, attrition and pockets, refits, production, morale, the calendar, the end. */
export function endTurn(c, war) {
  for (const b of c.board) if (!b.done) settle(c, war, b.id, autoResolve(c, war, b.id)); // (anything left on the board resolves)
  for (const side of ['nato', 'pact']) {
    const ok = supplied(c, war, side);
    for (const f of c.forces.filter((x) => x.side === side && x.kind === 'army')) {
      if (ok.has(f.at)) { f.cut = 0; continue; }
      f.cut++;
      for (const u of units(f)) u.hp = Math.max(0, u.hp - ATTRITION);
      prune(c, f);
      if (c.forces.includes(f) && f.cut >= CUT_SURRENDER) { c.forces.splice(c.forces.indexOf(f), 1); c.morale[side] -= MORALE.surrender; c.log.push({ turn: c.turn, surrendered: f.name, side }); }
    }
    // production: every supplied province's yield into the side's pool, less its forces' upkeep
    const { gross, keep } = income(c, war, side, ok);
    c.pool[side] = Math.min(c.pool[side] + gross - keep, Math.max(ECON.stockFloor, gross * ECON.stockTurns)); // (the rest is lost: unspent)
    c.pool[side] = Math.max(0, c.pool[side]);
    (c.income ??= {})[side] = gross - keep;
    (c.upkeep ??= {})[side] = keep;
    // how long each theatre has been quiet for this side (no attack of its own there): the AI's patience runs out (ai.js)
    const q = ((c.quiet ??= {})[side] ??= {});
    for (const t of Object.keys(war.theatres)) q[t] = c.board.some((b) => b.theatre === t && b.attackerSide === side && b.kind !== 'sea') ? 0 : (q[t] ?? 0) + 1;
  }
  for (const [id, p] of Object.entries(c.provinces)) {
    const n = forcesAt(c, id, 'nato', 'army').length, q = forcesAt(c, id, 'pact', 'army').length;
    p.contested = n > 0 && q > 0; // (still both there: still contested)
    if (!p.contested && (n || q)) { // (held by one side alone: theirs — a base too, its stores and rail yards with it)
      const holder = n ? 'nato' : 'pact';
      if (p.owner !== holder) {
        const base = p.depot === enemy(holder);
        p.owner = holder; c.morale[holder] += MORALE.gain; c.morale[enemy(holder)] -= base ? MORALE.depot : MORALE.province;
        if (base) { p.depot = holder; c.log.push({ turn: c.turn, depotLost: id, side: enemy(holder) }); escalate(c, war, war.escalation?.depot ?? 0); }
      }
    }
  }
  for (const p of Object.values(c.provinces)) if (p.bombed) p.bombed--;
  // winter: the side without winter clothing loses men to the cold in its theatre
  if (winterNow(c, war)) for (const f of c.forces.filter((x) => x.kind === 'army' && x.side === war.winter.freezes && war.provinces[x.at]?.theatre === war.winter.theatre)) { for (const u of units(f)) u.hp = Math.max(0, u.hp - war.winter.attrition); prune(c, f); }
  objectives(c, war);
  c.board = [];
  const wasWinter = winterNow(c, war);
  c.turn++;
  if (war.winter && winterNow(c, war) !== wasWinter) c.log.push({ turn: c.turn, date: dateOf(c), text: war.winter.text[wasWinter ? 'end' : 'start'] });
  for (const side of ['nato', 'pact']) c.morale[side] = Math.min(moraleCap(c, side), c.morale[side] + MORALE.recover); // (a quiet half-week: the country takes heart a little)
  applyEvents(c, war);
  surrenders(c, war);
  for (const side of ['nato', 'pact']) if (c.morale[side] <= 0 && !c.over) c.over = { winner: enemy(side), why: `${sideName(war, side, true)} sued for peace` }; // (the end: no turn limit — or the nuclear brink, escalate())
  if (war.escalation && c.escalatedAt !== c.turn - 1) c.escalation = Math.max(0, (c.escalation ?? 0) - (war.escalation.decay ?? 0)); // (a turn with no base taken or bombed: the fear ebbs a little)
}

/**
 * The war ends power by power (war.powers: { id: { name, side, armies, capitals } }): a power that has lost all its
 * capitals surrenders — its forces leave the war, its side's morale takes the blow. A side whose powers have all
 * surrendered has lost.
 */
export function surrenders(c, war) {
  c.surrendered ??= [];
  for (const [id, pw] of Object.entries(war.powers ?? {})) {
    if (c.surrendered.includes(id) || !pw.capitals.every((k) => c.provinces[k].owner !== pw.side)) continue;
    c.surrendered.push(id);
    for (const f of c.forces.filter((x) => x.side === pw.side && pw.armies.includes(x.army))) c.forces.splice(c.forces.indexOf(f), 1);
    c.morale[pw.side] -= 20;
    c.log.push({ turn: c.turn, date: dateOf(c), surrender: id, text: `${pw.name} surrenders.` });
  }
  for (const side of ['nato', 'pact']) {
    const mine = Object.entries(war.powers ?? {}).filter(([, pw]) => pw.side === side);
    if (mine.length && mine.every(([id]) => c.surrendered.includes(id)) && !c.over) c.over = { winner: enemy(side), why: `${mine.map(([, pw]) => pw.name).join(' and ')} have surrendered` };
  }
}

/** Is it winter in the war's winter theatre on this turn's date? */
export const winterNow = (c, war) => !!war.winter && war.winter.months.includes(Number(dateOf(c).slice(5, 7)) - 1);

/** Who holds an objective now: a province's owner (not while contested), a sea zone's only fleets' side; else nobody. */
export function holderOf(c, war, o) {
  if (war.seas[o.at]) { const n = forcesAt(c, o.at, 'nato', 'fleet').length, q = forcesAt(c, o.at, 'pact', 'fleet').length; return n && !q ? 'nato' : q && !n ? 'pact' : null; }
  return c.provinces[o.at].contested ? null : c.provinces[o.at].owner;
}

/** The objectives' count of turns held (c.objectives[id] = { holder, turns, won, start }): the first to take one and hold it long enough wins it. */
function objectives(c, war) {
  for (const o of war.objectives ?? []) {
    const s = (c.objectives ??= {})[o.id] ??= { holder: null, turns: 0, won: null, start: holderOf(c, war, o) }; // (start: who held it when the war began — taking it is the objective, not sitting in it)
    if (s.won) continue;
    const h0 = holderOf(c, war, o), h = h0 && h0 !== s.start ? h0 : null;
    s.turns = h && h === s.holder ? s.turns + 1 : h ? 1 : 0;
    s.holder = h;
    if (h && s.turns >= o.hold) {
      s.won = h;
      (c.moraleBonus ??= {})[h] = (c.moraleBonus[h] ?? 0) + o.morale / 2; c.morale[h] = Math.min(moraleCap(c, h), c.morale[h] + o.morale); // (for good: the morale it can reach rises too)
      c.log.push({ turn: c.turn, date: dateOf(c), text: `${sideName(war, h, true).replace(/^t/, 'T')} ${/s$/.test(sideName(war, h)) ? 'have' : 'has'} secured ${o.name}.` });
    }
  }
}

/** How high a side's morale can climb: MORALE.floor plus the rest in the share of its starting ground it still holds (a depot counts three). */
export function moraleCap(c, side) {
  const weight = (p) => (p.depot === side ? 3 : 1);
  const now = Object.values(c.provinces).filter((p) => p.owner === side).reduce((a, p) => a + weight(p), 0);
  return Math.min(100, MORALE.floor + (100 - MORALE.floor) * now / (c.held?.[side] || now || 1) + (c.moraleBonus?.[side] ?? 0)); // (+ the objectives won)
}

/** The date of turn `t` (half a week each): ISO yyyy-mm-dd. */
export const dateOf = (c, t = c.turn) => new Date(Date.parse(c.start) + (t - 1) * TURN_DAYS * 864e5).toISOString().slice(0, 10);
/** Dawn, day, dusk or night for a battle this turn (as the old campaign's hours). */
export const hourOf = (c, t = c.turn) => ['dawn', 'day', 'dusk', 'night'][(t - 1) % 4];

// ---------------------------------------------------------------- refits and new units (spending the pool)

/** Bring an army's units back up, up to the pool: cost ∝ the strength restored. Only when supplied. */
export function refit(c, war, f) {
  if (f.cut || f.kind !== 'army') return 0;
  let spent = 0;
  for (const u of units(f)) {
    const need = 1 - u.hp, cost = Math.round(need * ((c.power ?? DEFAULT_POWER)[u.t] ?? 120) * 0.6);
    if (need > 0.05 && cost <= c.pool[f.side]) { c.pool[f.side] -= cost; spent += cost; u.hp = 1; u.vet = Math.max(0, u.vet - (need > 0.5 ? 1 : 0)); }
  }
  return spent;
}

/** A turn's production for `side`: every supplied province's yield (a bombed one less) × its industry, and the upkeep. */
export function income(c, war, side, ok = supplied(c, war, side)) {
  let prod = 0;
  for (const id of ok) prod += (war.provinces[id].prod ?? 0) * (c.provinces[id].bombed ? 0.75 : 1);
  const gross = Math.round(prod * 40 * (c.industry?.[side] ?? 1)), keep = upkeep(c, side);
  return { gross, keep, net: gross - keep };
}

/** What a side's forces cost each turn to keep (ECON.upkeep). */
export function upkeep(c, side) {
  const u = ECON.upkeep;
  return c.forces.filter((f) => f.side === side).reduce((a, f) => a + (f.battalions?.length ?? 0) * u.battalion + (f.ships?.length ?? 0) * u.ship + (f.squadrons?.length ?? 0) * u.squadron, 0);
}

/** The cost of a new fleet of `kind` (war.fleets) or a new air wing. */
export const fleetCost = (c, war, kind) => war.fleets[kind].reduce((a, t) => a + ((c.power ?? DEFAULT_POWER)[t] ?? 120), 0);
export const airCost = () => Object.entries(AIR_WING).reduce((a, [k, n]) => a + (SQUADRON[k] ?? 100) * n * 3, 0);

/** A new fleet built at a depot port, put to sea in the zone off it (room for it there: STACK.fleet). */
export function raiseFleet(c, war, side, army, port, kind = 'escort') {
  const P = war.provinces[port], cost = fleetCost(c, war, kind);
  if (!P?.port || c.provinces[port].depot !== side || c.provinces[port].owner !== side || c.pool[side] < cost) return null;
  const room = (P.seas ?? []).filter((z) => forcesAt(c, z, side, 'fleet').length < STACK.fleet);
  const zone = room.find((z) => !forcesAt(c, z, enemy(side), 'fleet').length) ?? room[0]; // (blockaded: it sails out to fight)
  if (!zone) return null;
  c.pool[side] -= cost;
  return spawnForce(c, war, { kind: 'fleet', side, army, at: zone, name: `New ${kind} group`, ships: kind });
}

/** A new air wing formed at a depot with an airfield. */
export function raiseAir(c, war, side, army, base) {
  const cost = airCost();
  if (!war.provinces[base]?.airfield || c.provinces[base].depot !== side || c.provinces[base].owner !== side || c.pool[side] < cost) return null;
  c.pool[side] -= cost;
  return spawnForce(c, war, { kind: 'air', side, army, at: base, name: 'New air wing', squadrons: { ...AIR_WING } });
}

/** A new battalion for an army at a depot (or a new army there), from the pool. */
export function raise(c, war, side, army, depot, kind = 'infantry') {
  const types = war.battalions[kind], cost = types.reduce((a, t) => a + ((c.power ?? DEFAULT_POWER)[t] ?? 120), 0);
  if (c.pool[side] < cost || c.provinces[depot]?.depot !== side) return null;
  c.pool[side] -= cost;
  const theatre = war.provinces[depot].theatre, ok = supplied(c, war, side);
  const here = forcesAt(c, depot, side, 'army').find((f) => f.army === army && f.battalions.length < STACK.battalions)
    ?? c.forces.find((f) => f.side === side && f.kind === 'army' && f.army === army && f.battalions.length < STACK.battalions && !f.cut && ok.has(f.at) && war.provinces[f.at].theatre === theatre); // (sent up the line to a group with room)
  if (!here && forcesAt(c, depot, side, 'army').length >= STACK.army) { c.pool[side] += cost; return null; } // (no room at the depot: send what's there to the front first)
  if (here) { here.battalions.push({ kind, units: types.map((t) => ({ t, hp: 1, vet: 0 })) }); return here; }
  return spawnForce(c, war, { kind: 'army', side, army, at: depot, name: `New ${kind} group`, battalions: [kind] });
}
