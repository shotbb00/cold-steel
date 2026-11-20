// The world campaign's battles fought on their maps (ui/WarRoom.js: Fight, Delegate). The bridge between the campaign
// (engine.js: pure data) and a battle (GameEngine with `campaign: { wc: true, … }`):
//   fightable(c, war, b)        '' or why this battle can only be resolved
//   battleChoice(c, war, b, o)  what MainMenu.deploy() starts: the map, the mode, the armies, the time; on land the
//                               campaign's own army groups as stacks, at sea and on a beach both sides' command points
//                               scaled by their campaign power. o.delegate: the AI commands both sides (fast-forward).
//   watchBattle(game)           (GameEngine) counts what each side fields and loses; at the end stores the result
//   takeResult() / outcomeOf()  the menu's Campaign tab reads it back and settles the battle (engine.js settle)
// The result rides in localStorage across the page load that a return to the menu is (core/replay.js toMenu).
import { forceById, power, enemy, hourOf } from './engine.js';
import { MAPS } from '../maps/index.js';
import { UNIT_TYPES } from '../data/units/index.js';
import { RANKS } from '../entities/UnitStack.js';

const KEY = 'cs.wcampaign.result';
const MAX_STACKS = 24; // a side's army groups on the field at most (the rest wait in reserve: unhurt)

const sides = (c, b) => {
  const A = b.attackers.map((id) => forceById(c, id)).filter(Boolean), D = [...b.defenders, ...(b.support ?? [])].map((id) => forceById(c, id)).filter(Boolean);
  return { [b.attackerSide]: A, [enemy(b.attackerSide)]: D };
};

/** '' when the battle can be fought on its map; otherwise why not (it is resolved instead). */
export function fightable(c, war, b) {
  if (!b.map || !MAPS[b.map]) return 'no map for it yet';
  if (b.kind === 'coastal' && (MAPS[b.map].landing?.attacker ?? 'nato') !== b.attackerSide) return 'its map is a landing by the other side';
  const s = sides(c, b);
  if (!s.nato.length || !s.pact.length) return 'one side has no force there';
  return '';
}

/** An army group's units as the battle's stacks: { type, name, men, xp, cid } — cid "<force id>:<unit index>". */
function stacksOf(f) {
  if (f.kind !== 'army') return [];
  return f.battalions.flatMap((bn) => bn.units).map((u, i) => {
    const t = UNIT_TYPES[u.t];
    if (!t || u.hp <= 0.05) return null;
    return { type: u.t, name: `${f.name}`, men: Math.max(1, Math.round((t.formation?.count ?? 1) * u.hp)), xp: RANKS[Math.min(u.vet ?? 0, RANKS.length - 1)]?.xp ?? 0, cid: `${f.id}:${i}`, hp: u.hp };
  }).filter(Boolean);
}

export function battleChoice(c, war, b, { delegate = false } = {}) {
  const s = sides(c, b), map = MAPS[b.map];
  const pw = (fs) => fs.reduce((a, f) => a + power(c, f), 0), P = { nato: pw(s.nato), pact: pw(s.pact) }, mean = (P.nato + P.pact) / 2 || 1;
  const scale = Object.fromEntries(['nato', 'pact'].map((f) => [f, Math.max(0.4, Math.min(1.8, P[f] / mean))]));
  const land = b.kind === 'land';
  const forces = land ? Object.fromEntries(['nato', 'pact'].map((f) => [f, s[f].flatMap(stacksOf).sort((x, y) => y.hp - x.hp).slice(0, MAX_STACKS)])) : null;
  const armyOf = (fs) => fs.find((f) => f.kind !== 'air')?.army ?? null;
  const name = war.provinces[b.at]?.name ?? war.seas[b.at]?.name ?? b.at;
  return {
    mode: b.kind === 'sea' ? (map.modes?.[0] ?? 'frontline') : b.kind === 'coastal' ? 'landing' : 'breakthrough',
    map: b.map, side: c.side, time: hourOf(c) === 'night' ? 'night' : hourOf(c), weather: ['clear', 'clear', 'overcast', 'overcast', 'rain'][(c.turn * 7 + b.id.length) % 5],
    armies: { nato: armyOf(s.nato), pact: armyOf(s.pact) },
    campaign: { wc: true, war: war.id, battle: b.id, delegate, attacker: b.attackerSide, sector: name, forces, scale: land ? null : scale },
  };
}

// ---------------------------------------------------------------- in the battle (GameEngine)

/** What each side puts in the field (cost) and has left; at the end: the result for the campaign. */
export function watchBattle(game) {
  const camp = game.campaign, fielded = { nato: 0, pact: 0 }, seen = new Set();
  const count = (s) => { if (seen.has(s)) return; seen.add(s); fielded[s.faction] = (fielded[s.faction] ?? 0) + (s.type.cost ?? 150); };
  for (const s of game.world.stacks) count(s);
  game.bus.on('stack:spawned', count);
  game.bus.on('game:end', (r) => {
    const alive = (f) => game.world.stacksOf(f).reduce((a, s) => a + s.hpRatio * (s.type.cost ?? 150), 0);
    const loss = (f) => (fielded[f] ? Math.max(0, Math.min(1, 1 - alive(f) / fielded[f])) : 0);
    const winner = r.victory ? game.playerFaction : enemy(game.playerFaction);
    const survivors = {};
    for (const s of game.world.stacks) if (s.cid && s.alive) survivors[s.cid] = { hp: s.aliveCount / (s.type.formation?.count ?? s.units.length ?? 1), rank: s.rank ?? 0 };
    try { localStorage.setItem(KEY, JSON.stringify({ war: camp.war, battle: camp.battle, how: camp.delegate && !camp.tookCommand ? 'delegated' : 'fought', winner, loss: { nato: loss('nato'), pact: loss('pact') }, survivors, cids: camp.forces ? Object.values(camp.forces).flat().map((u) => u.cid) : [] })); } catch { /* storage blocked: the battle is resolved instead */ }
  });
}

/** The delegated battle's bar: the AI has both sides; speed 1–8×; take command (the AI lets go of your side). */
export function delegateBar(game, onTake) {
  const bar = document.createElement('div');
  bar.className = 'wc-delegate';
  bar.innerHTML = '<span>Delegated: the AI commands both sides</span>' + [1, 2, 4, 8].map((n) => `<button type="button" data-speed="${n}" class="${n === 4 ? 'on' : ''}">${n}×</button>`).join('') + '<button type="button" data-take>Take command</button>';
  game.speed = 4;
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.speed) { game.speed = +b.dataset.speed; for (const x of bar.querySelectorAll('[data-speed]')) x.classList.toggle('on', x === b); }
    if ('take' in b.dataset) { game.speed = 1; game.campaign.tookCommand = true; onTake(); bar.remove(); }
  });
  document.body.append(bar);
  game.bus.on('game:end', () => { game.speed = 1; bar.remove(); });
}

// ---------------------------------------------------------------- back in the war room

/** The stored result of the last campaign battle (kept until clearResult(): a menu opened in another war leaves it waiting). */
export function takeResult() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
}
export function clearResult() { try { localStorage.removeItem(KEY); } catch { /* storage blocked */ } }

/**
 * A fought battle's outcome for engine.js settle: the margin from who won and what each side lost (a held attack that cost
 * the defence more stays contested), the losses as shares; on land the survivors stack by stack — units not fielded keep
 * what they had, fielded ones that did not come back are gone.
 */
export function outcomeOf(c, b, r) {
  const att = b.attackerSide, def = enemy(att), la = r.loss[att], ld = r.loss[def];
  const margin = r.winner === att ? Math.min(0.95, 0.62 + 0.3 * (1 - la)) : la < ld ? 0.5 : Math.max(0.05, 0.35 - 0.3 * ld);
  const out = { margin, losses: { attackers: la, defenders: ld }, how: r.how };
  if (r.cids?.length) {
    const fielded = new Set(r.cids), survivors = {};
    for (const id of [...b.attackers, ...b.defenders, ...(b.support ?? [])]) {
      const f = forceById(c, id);
      if (!f || f.kind !== 'army') continue;
      survivors[id] = f.battalions.flatMap((bn) => bn.units).map((u, i) => {
        const cid = `${id}:${i}`, s = r.survivors[cid];
        if (!fielded.has(cid)) return { ...u };
        return s ? { ...u, hp: Math.max(0, Math.min(1, s.hp)), vet: Math.max(u.vet ?? 0, Math.min(3, s.rank)) } : { ...u, hp: 0 };
      });
    }
    out.survivors = survivors;
  }
  return out;
}
