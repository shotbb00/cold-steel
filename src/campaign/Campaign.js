// The Fulda campaign: a war on a road map of East Hesse and West Thuringia. You command a
// brigade of three battalions that carry their men, wounded and veterans from battle to battle.
//   • The map: sixteen sectors (SECTORS), each a real place fought on the battle map that fits its
//     ground, linked by roads. Each side's rear holds its depots and its objectives.
//   • A turn is half a day: you give each battalion a move along one road (or it holds); the
//     enemy plans its own; then the moves resolve. A move into an empty enemy sector takes it;
//     a move into one the enemy holds with a battalion is a battle (c.battles, fought one after
//     another, or resolved by the numbers at a penalty). Win an attack and the defenders fall
//     back down the road (with nowhere to go they are destroyed); lose it and you stay put.
//   • Your battalions are lists of stacks (men, experience, rank) like the old battalion; the
//     enemy's are a kind and a strength (0..1) that its battles wear down and rest builds up,
//     and a fresh one arrives from its depots every few turns.
//   • Wounded: four in ten of a stack's losses come back after its next battle or a quiet turn.
//   • Supply: a sector is supplied if a road runs from it through its side's ground to one of its
//     depots (supplied()). A battalion outside it is cut off (cutLevel(), counted in turns):
//     1 — no refills or recruits, wounded stay away, 40 % less command points in its battles;
//     2 — no air support or barrages there either, and its men start shaken;
//     3 and on — a man in ten lost each turn, experience stops growing, and at half strength it
//     surrenders unless it attacked that turn (a breakout). The enemy lives by the same rule,
//     and its planning looks for cuts and breakouts.
//   • Intel: with scouts or a recon vehicle in a battalion the briefing counts the enemy.
//   • Map damage: each sector remembers what its last battle left (c.scars: craters, standing
//     defences, ruins, bridges — GameEngine.scars), and its next battle starts from that.
//   • War length (the player's pick): endless, until one side has no battalions left, or the
//     eight-day timetable — the Pact must take Fulda and Bad Hersfeld, NATO hold them (or take
//     Eisenach) until the last turn.
// Saved in localStorage ('coldsteel.campaign.2'); the old column campaign's saves are left alone.
import { UNIT_TYPES } from '../data/units/index.js';
import { writeLetter } from './Letters.js';
import { enemyOf, forArmy, armiesFrom } from '../data/factions.js';
import { unitCost } from '../data/doctrine.js';

const KEY = 'coldsteel.campaign.2';
export const TIMETABLE = 16;        // turns in the eight-day war
export const MAX_STACKS = 18;       // per battalion
const REPLACEMENTS = 300;           // replacement points a turn…
const PER_SECTOR = 40;              // …plus per sector held
const WOUNDED_SHARE = 0.4;
const AUTO_PENALTY = 0.85;          // resolving by the numbers: our strength counts this much
const DEFENDER = 1.25;              // dug in: the defender's strength counts this much more
const ECHELON = 6;                  // a fresh enemy battalion every this many turns…
const ENEMY_MAX = { pact: 7, nato: 6 }; // …up to this many
const REST = 0.12;                  // strength an enemy battalion recovers in a quiet turn
const RECON = ['scouts', 'reconVehicle'];

// The map (positions for the campaign screen, 720 × 430). `home`: whose ground at the start.
export const SECTORS = {
  hersfeld: { name: 'Bad Hersfeld', x: 80, y: 90, map: 'hersfeld-airbase', home: 'nato', depot: true, objective: 'pact' },
  heringen: { name: 'Heringen', x: 190, y: 80, map: 'monte-kali', home: 'nato' },
  burghaun: { name: 'Burghaun', x: 190, y: 175, map: 'haune-fulda', home: 'nato' },
  fulda: { name: 'Fulda', x: 80, y: 300, map: 'haune-fulda', home: 'nato', depot: true, objective: 'pact' },
  huenfeld: { name: 'Hünfeld', x: 200, y: 300, map: 'huenfeld', home: 'nato' },
  tann: { name: 'Tann (Rhön)', x: 180, y: 380, map: 'thuringian-forest', home: 'nato' },
  philippsthal: { name: 'Philippsthal', x: 300, y: 85, map: 'werra-valley', home: 'nato' },
  rasdorf: { name: 'Rasdorf · Point Alpha', x: 300, y: 200, map: 'fulda-gap', home: 'nato' },
  geisa: { name: 'Geisa', x: 400, y: 300, map: 'fulda-gap', home: 'pact' },
  vacha: { name: 'Vacha', x: 420, y: 110, map: 'werra-valley', home: 'pact' },
  dermbach: { name: 'Dermbach', x: 420, y: 215, map: 'thuringian-forest', home: 'pact' },
  eisenach: { name: 'Eisenach', x: 560, y: 60, map: 'huenfeld', home: 'pact', depot: true, objective: 'nato' },
  salzungen: { name: 'Bad Salzungen', x: 560, y: 170, map: 'werra-valley', home: 'pact' },
  kaltennordheim: { name: 'Kaltennordheim', x: 650, y: 255, map: 'thuringian-forest', home: 'pact' },
  meiningen: { name: 'Meiningen', x: 560, y: 330, map: 'fulda-gap', home: 'pact', depot: true },
};
export const ROADS = [
  ['hersfeld', 'heringen'], ['hersfeld', 'burghaun'], ['hersfeld', 'fulda'], ['heringen', 'philippsthal'], ['burghaun', 'philippsthal'],
  ['burghaun', 'rasdorf'], ['burghaun', 'fulda'], ['fulda', 'huenfeld'], ['huenfeld', 'rasdorf'], ['huenfeld', 'tann'], ['fulda', 'tann'],
  ['huenfeld', 'geisa'], ['philippsthal', 'vacha'], ['rasdorf', 'vacha'], ['rasdorf', 'dermbach'], ['vacha', 'eisenach'], ['vacha', 'salzungen'],
  ['dermbach', 'salzungen'], ['dermbach', 'geisa'], ['geisa', 'meiningen'], ['salzungen', 'eisenach'], ['salzungen', 'kaltennordheim'],
  ['kaltennordheim', 'meiningen'], ['dermbach', 'kaltennordheim'],
];
const LINKS = {};
for (const [a, b] of ROADS) { (LINKS[a] ??= []).push(b); (LINKS[b] ??= []).push(a); }
export const neighbours = (id) => LINKS[id] ?? [];

// what can happen before a battle; weight = how often, apply(c, battle) changes it
export const EVENTS = {
  quiet: { weight: 5 },
  airCover: { weight: 1, text: 'Our air force holds the sky over the sector: the enemy\'s aircraft stay grounded for this battle.' },
  enemyAir: { weight: 1, text: 'Enemy air superiority: our helicopters and jets are grounded for this battle.' },
  guns: { weight: 1, text: 'Corps artillery has a battery to spare: a battery of guns is attached to us for this battle.' },
  reserves: { weight: 1, text: 'The enemy has brought up fresh reserves: expect more armour.' },
  fog: { weight: 1, text: 'Fog has settled in the valleys.', apply: (c, b) => { b.weather = 'fog'; } },
};
const rollEvent = () => {
  const all = Object.entries(EVENTS);
  let r = Math.random() * all.reduce((a, [, e]) => a + e.weight, 0);
  for (const [id, e] of all) if ((r -= e.weight) < 0) return id;
  return 'quiet';
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const WEATHERS = ['overcast', 'overcast', 'clear', 'rain', 'fog', 'overcast'];

// the brigade: three battalions of different kinds, and what each starts with
const KINDS = {
  armour: ['tank', 'tank', 'tank', 'tank', 'ifv', 'ifv', 'rifles', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'mortar', 'scouts', 'aa'],
  mech: ['rifles', 'rifles', 'rifles', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'atTeam', 'ifv', 'ifv', 'tank', 'mortar', 'engineers', 'scouts'],
  support: ['rifles', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'artillery', 'artillery', 'rockets', 'mortar', 'reconVehicle', 'engineers', 'manpads'],
};
const BRIGADE = ['armour', 'mech', 'support'];
const NAMES = {
  us: { armour: 'Armor Battalion', mech: 'Infantry Battalion', support: 'Field Artillery Battalion' },
  bw: { armour: 'Panzerbataillon', mech: 'Panzergrenadierbataillon', support: 'Panzerartilleriebataillon' },
  sov: { armour: 'Guards Tank Battalion', mech: 'Guards Motor Rifle Battalion', support: 'Guards Artillery Battalion' },
  nva: { armour: 'Panzerbataillon', mech: 'Mot.-Schützenbataillon', support: 'Artillerieabteilung' },
};
const ordinal = (n) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
const GERMAN = new Set(['bw', 'nva']);
const battalionName = (army, kind, n) => (GERMAN.has(army) ? `${NAMES[army][kind]} ${n}` : `${ordinal(n)} ${NAMES[army][kind]}`);
const START = { // where the battalions stand on turn 1
  nato: ['philippsthal', 'rasdorf', 'huenfeld', 'burghaun', 'heringen', 'fulda'],
  pact: ['vacha', 'dermbach', 'geisa', 'salzungen', 'kaltennordheim', 'meiningen', 'eisenach'],
};

let uid = 1;
const newId = (p) => `${p}${Date.now().toString(36)}${uid++}`;
const stack = (type, name) => ({ cid: newId('c'), type, name, men: UNIT_TYPES[type].formation.count, xp: 0 });
const stackName = (c, type, n) => `${forArmy(UNIT_TYPES[type].variants, c.armies[c.side], c.side)?.name ?? UNIT_TYPES[type].shortName} ${n}`;

export function loadCampaign() {
  try {
    const raw = localStorage.getItem(KEY);
    const c = raw ? JSON.parse(raw) : null;
    return c?.version === 2 ? c : null;
  } catch {
    return null;
  }
}

export function saveCampaign(c) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* storage blocked: the campaign lasts this session */ }
}

export function clearCampaign() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** A new war: `side`, `armies` ({ nato, pact }), `length` 'endless' | 'timetable'. */
export function newCampaign({ side, armies, length = 'endless' }) {
  const foe = enemyOf(side);
  const c = {
    version: 2, side, armies: armiesFrom(armies), length,
    turn: 1, weather: pick(WEATHERS), points: 200,
    owner: Object.fromEntries(Object.entries(SECTORS).map(([id, s]) => [id, s.home])),
    battalions: [], enemy: [], battles: [], history: [], fought: [],
    log: [`Day 1 — the war begins. The ${side === 'nato' ? 'Warsaw Pact is massing on the border' : 'NATO line is thin along the border'}.`],
    raised: 0, over: null, letter: null, writer: null,
  };
  const army = c.armies[side];
  BRIGADE.forEach((kind, i) => {
    const count = {};
    c.battalions.push({
      id: newId('b'), name: battalionName(army, kind, i + 1), kind, faction: side, at: START[side][i], order: null,
      stacks: KINDS[kind].map((t) => { count[t] = (count[t] ?? 0) + 1; return stack(t, stackName(c, t, count[t])); }),
    });
  });
  const n = foe === 'pact' ? 5 : 4;
  for (let i = 0; i < n; i++) raiseEnemy(c, START[foe][i]);
  saveCampaign(c);
  return c;
}

function raiseEnemy(c, at) {
  const foe = enemyOf(c.side);
  const kind = pick(['armour', 'mech', 'mech', 'support']);
  c.raised++;
  c.enemy.push({ id: newId('e'), name: battalionName(c.armies[foe], kind, c.raised + 3), kind, faction: foe, at, strength: 1, order: null });
}

// ------------------------------------------------------------------ the picture

export const sectorsOf = (c, f) => Object.keys(SECTORS).filter((id) => c.owner[id] === f);

/** The sectors `f` can reach by road from one of its depots through its own ground (`owner`: a what-if map). */
export function supplied(c, f, owner = c.owner) {
  const q = Object.keys(SECTORS).filter((id) => SECTORS[id].depot && owner[id] === f);
  const seen = new Set(q);
  while (q.length) for (const n of neighbours(q.pop())) if (owner[n] === f && !seen.has(n)) { seen.add(n); q.push(n); }
  return seen;
}

/** How long battalion `b` has been cut off, counting this turn (0: supplied). */
export const cutLevel = (c, b) => (supplied(c, b.faction).has(b.at) ? 0 : (b.cut ?? 0) + 1);
export const hour = (c) => (c.turn % 2 ? (c.turn % 4 === 1 ? 'dawn' : 'day') : (c.turn % 4 === 2 ? 'dusk' : 'night'));
export const day = (c) => Math.ceil(c.turn / 2);
const forcesAt = (c, id, f) => (f === c.side ? c.battalions : c.enemy).filter((b) => b.at === id);

/** A battalion's fighting power: what its men are worth (an enemy one: its strength of a full one). */
const FULL = KINDS.mech.reduce((a, t) => a + UNIT_TYPES[t].cost, 0);
export function power(b) {
  if (b.stacks) return b.stacks.reduce((a, u) => a + UNIT_TYPES[u.type].cost * (u.men / UNIT_TYPES[u.type].formation.count), 0);
  return b.strength * FULL;
}

/** The enemy battalions we know of: those next to our ground or our battalions (with numbers if one of them has recon). */
export function sighted(c) {
  const near = new Set();
  for (const id of [...sectorsOf(c, c.side), ...c.battalions.map((b) => b.at)]) { near.add(id); for (const n of neighbours(id)) near.add(n); }
  return c.enemy.filter((e) => near.has(e.at));
}

// ------------------------------------------------------------------ orders and the turn

/** Order battalion `bid` down the road to `to` (an adjacent sector), or to hold (to = null). */
export function orderMove(c, bid, to) {
  const b = c.battalions.find((x) => x.id === bid);
  if (!b || c.battles.length || c.over) return false;
  if (to && !neighbours(b.at).includes(to)) return false;
  b.order = to;
  saveCampaign(c);
  return true;
}

/** The enemy plans: attack where the odds look good or the ground is empty, rest when worn. */
function enemyOrders(c) {
  const foe = enemyOf(c.side);
  const bold = foe === 'pact' ? 0.8 : 1.1; // the Pact attacks on a timetable; NATO trades ground for time
  const value = (id) => (SECTORS[id].objective === foe ? 3 : SECTORS[id].depot ? 2 : 1);
  const ours = supplied(c, c.side);
  for (const e of c.enemy) {
    e.order = null;
    const cut = cutLevel(c, e);
    if (e.strength < 0.45 && !cut) continue; // worn out: rest (a pocket tries to break out regardless)
    let best = null;
    let score = 0;
    for (const n of neighbours(e.at)) {
      if (c.owner[n] === foe) continue;
      const def = forcesAt(c, n, c.side).reduce((a, b) => a + power(b), 0) * DEFENDER;
      const odds = def ? power(e) / def : 9;
      if (odds < (cut ? 0.5 : bold)) continue;
      // what taking it would do: reopen our road (a breakout) or cut theirs (a pocket)
      const after = { ...c.owner, [n]: foe };
      const opens = cut && supplied(c, foe, after).has(e.at) ? 4 : 0;
      const theirs = supplied(c, c.side, after);
      const cuts = c.battalions.filter((b) => ours.has(b.at) && !theirs.has(b.at)).length * 2;
      const s = (value(n) + opens + cuts) * Math.min(odds, 3) + Math.random();
      if (s > score) { score = s; best = n; }
    }
    e.order = best;
  }
}

/**
 * End the turn: the enemy plans, every move resolves. Moves into your own ground just happen; a
 * move into enemy ground with nobody in it takes it; one into a held sector is a battle (queued).
 * With no battle to fight the turn closes at once.
 */
export function endTurn(c) {
  if (c.battles.length || c.over) return;
  enemyOrders(c);
  const all = [...c.battalions, ...c.enemy];
  // relocations inside one's own ground first
  for (const b of all) if (b.order && c.owner[b.order] === b.faction) { b.at = b.order; b.order = null; }
  // then the attacks, grouped by target
  const targets = new Map();
  for (const b of all) if (b.order) (targets.get(b.order) ?? targets.set(b.order, []).get(b.order)).push(b);
  c.attacked = [...targets.values()].flat().map((b) => b.id); // a pocket that attacked this turn is breaking out
  for (const [id, movers] of targets) {
    const owner = c.owner[id];
    const def = forcesAt(c, id, owner);
    if (!def.length) {
      c.owner[id] = movers[0].faction;
      for (const b of movers) b.at = id;
      c.log.unshift(`${stamp(c)} — ${movers[0].faction === c.side ? 'we moved into' : 'the enemy moved into'} ${SECTORS[id].name} unopposed.`);
      continue;
    }
    c.battles.push(planBattle(c, id, movers[0].faction, movers.map((b) => b.id), def.map((b) => b.id)));
  }
  for (const b of all) b.order = null;
  if (!c.battles.length) closeTurn(c);
  saveCampaign(c);
}

function planBattle(c, id, attacker, att, def) {
  const b = { sector: id, name: SECTORS[id].name, map: SECTORS[id].map, attacker, att, def, time: hour(c), weather: c.weather, event: c.turn === 1 ? 'quiet' : rollEvent() };
  EVENTS[b.event]?.apply?.(c, b);
  return b;
}

const stamp = (c) => `Day ${day(c)}, ${hour(c)}`;
const byId = (c, id) => c.battalions.find((b) => b.id === id) ?? c.enemy.find((b) => b.id === id);
/** Our battalions in battle `b`, and the enemy's. */
export function sides(c, b) {
  const ids = [...b.att, ...b.def];
  return { ours: c.battalions.filter((x) => ids.includes(x.id)), theirs: c.enemy.filter((x) => ids.includes(x.id)) };
}

/** The briefing's picture of the enemy in battle `b`: counted with recon in one of ours, otherwise guessed. */
export function intel(c, b) {
  const force = enemyForce(c, b);
  const scouted = sides(c, b).ours.some((x) => x.stacks.some((u) => RECON.includes(u.type)));
  const kinds = { Infantry: 0, Armour: 0, 'Fire support': 0, 'Air defence': 0 };
  for (const { type } of force) {
    const cat = UNIT_TYPES[type]?.category;
    kinds[cat === 'armour' ? 'Armour' : cat === 'fire' ? 'Fire support' : cat === 'airdefence' ? 'Air defence' : 'Infantry']++;
  }
  const guess = (n) => (n === 0 ? 'none seen' : n <= 1 ? 'some' : n <= 3 ? 'several' : 'strong');
  return { scouted, rows: Object.entries(kinds).map(([k, n]) => [k, scouted ? (n ? `${n} stack${n > 1 ? 's' : ''}` : 'none') : guess(n)]) };
}

/** The enemy's stacks in battle `b`: each battalion's kind at its strength, a little more as the war goes on. */
export function enemyForce(c, b) {
  const out = [];
  for (const e of sides(c, b).theirs) {
    const list = KINDS[e.kind];
    const n = Math.max(3, Math.round(list.length * e.strength));
    out.push(...list.slice(0, n));
  }
  out.push(...['rifles', 'tank', 'ifv', 'atTeam'].slice(0, Math.min(4, Math.floor(c.turn / 6))));
  if (b.event === 'reserves') out.push('tank', 'ifv', 'rifles');
  return out.map((type) => ({ type }));
}

/** What the coming battle needs to start: the menu hands this to main.js start(). */
export function battleChoice(c) {
  const b = c.battles[0];
  const { ours } = sides(c, b);
  return {
    mode: 'breakthrough', map: b.map, side: c.side, time: b.time, weather: b.weather, armies: c.armies,
    campaign: {
      attacker: b.attacker, sector: b.name, event: b.event ?? 'quiet', scars: c.scars?.[b.sector] ?? null,
      // cut off: fewer command points; from the second turn no aircraft and shaken men (modes/breakthrough.js)
      cut: { [c.side]: Math.max(0, ...ours.map((x) => cutLevel(c, x))), [enemyOf(c.side)]: Math.max(0, ...sides(c, b).theirs.map((x) => cutLevel(c, x))) },
      forces: {
        [c.side]: [...ours.flatMap((x) => x.stacks.map((u) => ({ ...u }))), ...(b.event === 'guns' ? [{ type: 'artillery', cid: 'attached', name: 'Attached battery' }] : [])],
        [enemyOf(c.side)]: enemyForce(c, b),
      },
    },
  };
}

// ------------------------------------------------------------------ results

/**
 * After battle c.battles[0]: `won` (ours), `survivors` (our stacks: cid, men, xp, rank), `enemyLeft`
 * (the share of the enemy's strength still standing). Returns { gain } when it closed the turn.
 */
export function recordBattle(c, { won, survivors, enemyLeft, scars = null }) {
  const b = c.battles.shift();
  if (!b) return {};
  if (scars) (c.scars ??= {})[b.sector] = { ...scars, blasts: scars.blasts.slice(-400) }; // the oldest craters fade first
  const { ours, theirs } = sides(c, b);
  const alive = new Map(survivors.filter((s) => s.cid).map((s) => [s.cid, s]));
  let lost = 0;
  let wounded = 0;
  for (const x of ours) {
    const before = x.stacks.length;
    const starving = cutLevel(c, x) >= 3; // cut off long enough: experience stops growing
    x.stacks = x.stacks.filter((u) => alive.has(u.cid)).map((u) => {
      const s = alive.get(u.cid);
      const full = UNIT_TYPES[u.type].formation.count;
      const returning = Math.min(u.wounded ?? 0, full - s.men);
      const hurt = Math.round(Math.max(0, u.men - s.men) * WOUNDED_SHARE);
      wounded += hurt;
      return { ...u, men: s.men + returning, wounded: hurt, xp: starving ? u.xp : s.xp, rank: starving ? u.rank : s.rank };
    });
    lost += before - x.stacks.length;
  }
  // stacks bought during the battle join the first battalion with room
  for (const s of survivors) {
    if (s.cid) continue;
    const home = ours.find((x) => x.stacks.length < MAX_STACKS);
    if (home) home.stacks.push({ ...stack(s.type, s.name), men: s.men, xp: s.xp, rank: s.rank });
  }
  for (const e of theirs) e.strength = Math.max(0, e.strength * enemyLeft);
  const winner = won ? c.side : enemyOf(c.side);
  const attackerWon = winner === b.attacker;
  if (attackerWon) {
    // the defenders fall back down a road into their own ground — or, with none, are lost
    for (const d of [...b.def].map((id) => byId(c, id)).filter(Boolean)) {
      const back = neighbours(b.sector).find((n) => c.owner[n] === d.faction);
      if (back) d.at = back;
      else destroy(c, d, 'cut off with nowhere to fall back');
    }
    c.owner[b.sector] = b.attacker;
    for (const id of b.att) { const a = byId(c, id); if (a) a.at = b.sector; }
  }
  for (const x of [...c.battalions]) if (!x.stacks.length) destroy(c, x, 'destroyed');
  for (const e of [...c.enemy]) if (e.strength < 0.15) destroy(c, e, 'broken');
  c.fought.push(...b.att, ...b.def);
  c.history.push({ sector: b.sector, won, turn: c.turn });
  const men = [lost > 0 ? `${lost} stack${lost > 1 ? 's' : ''} lost` : '', wounded ? `${wounded} wounded` : ''].filter(Boolean).join(', ');
  const ourAttack = b.attacker === c.side;
  c.log.unshift(`${stamp(c)} — ${b.name}: ${attackerWon ? (ourAttack ? 'our attack broke through' : 'the enemy broke through') : (ourAttack ? 'our attack was thrown back' : 'we held')}.${men ? ` ${men[0].toUpperCase()}${men.slice(1)}.` : ''}`);
  // a soldier writes home about it (campaign/Letters.js reads the old single battalion's shape)
  const shim = { side: c.side, turn: c.turn, writer: c.writer, letter: c.letter, battalion: c.battalions.flatMap((x) => x.stacks) };
  writeLetter(shim, b, { attackerWon, lost, wounded });
  c.letter = shim.letter;
  c.writer = shim.writer;
  pruneBattles(c);
  const out = c.battles.length || c.over ? {} : closeTurn(c);
  checkEnd(c);
  saveCampaign(c);
  return out;
}

/** Battles whose sides a battle before them moved or destroyed: a sector left empty is simply taken. */
function pruneBattles(c) {
  while (c.battles.length) {
    const b = c.battles[0];
    b.att = b.att.filter((id) => byId(c, id));
    b.def = b.def.filter((id) => byId(c, id)?.at === b.sector);
    if (b.att.length && b.def.length) return;
    c.battles.shift();
    if (!b.att.length) continue;
    c.owner[b.sector] = b.attacker;
    for (const id of b.att) byId(c, id).at = b.sector;
    c.log.unshift(`${stamp(c)} — ${b.attacker === c.side ? 'we moved into' : 'the enemy moved into'} ${b.name}: the defenders had gone.`);
  }
}

function destroy(c, b, why) {
  const list = b.stacks ? c.battalions : c.enemy;
  const i = list.indexOf(b);
  if (i < 0) return;
  list.splice(i, 1);
  c.log.unshift(`${stamp(c)} — ${b.stacks ? 'our' : 'the enemy\'s'} ${b.name} ${why}.`);
}

/**
 * Resolve battle c.battles[0] by the numbers instead of fighting it: the odds from both sides'
 * strength (the defender's counts more, ours counts less for not being there), and losses to match.
 */
export function autoResolve(c) {
  const b = c.battles[0];
  if (!b) return {};
  const { ours, theirs } = sides(c, b);
  const defending = b.attacker !== c.side;
  const p = ours.reduce((a, x) => a + power(x), 0) * AUTO_PENALTY * (defending ? DEFENDER : 1);
  const q = theirs.reduce((a, x) => a + power(x), 0) * (defending ? 1 : DEFENDER);
  const won = Math.random() < p / (p + q || 1);
  const rnd = (a, z) => a + Math.random() * (z - a);
  const loss = won ? rnd(0.1, 0.25) : rnd(0.3, 0.5);
  const survivors = ours.flatMap((x) => x.stacks).map((u) => ({ ...u, men: Math.round(u.men * (1 - Math.min(1, loss * rnd(0.4, 1.6)))), xp: u.xp + 0.05 }))
    .filter((u) => u.men > 1);
  return recordBattle(c, { won, survivors, enemyLeft: won ? rnd(0.35, 0.6) : rnd(0.65, 0.85) });
}

/** The turn is over: replacements, the wounded of quiet battalions back, the enemy rests and reinforces. */
function closeTurn(c) {
  const gain = REPLACEMENTS + PER_SECTOR * sectorsOf(c, c.side).length;
  c.points += gain;
  for (const x of [...c.battalions]) {
    const cut = (x.cut = cutLevel(c, x));
    if (!cut && !c.fought.includes(x.id)) {
      for (const u of x.stacks) { u.men = Math.min(UNIT_TYPES[u.type].formation.count, u.men + (u.wounded ?? 0)); u.wounded = 0; }
    }
    const men = () => x.stacks.reduce((a, u) => a + u.men, 0);
    if (cut === 1) x.cutMen = men(); // half of this and it gives up
    if (cut < 3) continue;
    for (const u of x.stacks) for (let k = u.men; k > 0; k--) if (Math.random() < 0.1) u.men--; // the pocket withers: a man in ten
    x.stacks = x.stacks.filter((u) => u.men > 1);
    if (!x.stacks.length || (men() < (x.cutMen ?? 0) / 2 && !c.attacked?.includes(x.id))) destroy(c, x, 'surrendered, cut off and out of strength');
  }
  for (const e of [...c.enemy]) {
    const cut = (e.cut = cutLevel(c, e));
    if (!cut && !c.fought.includes(e.id)) e.strength = Math.min(1, e.strength + REST);
    if (cut < 3) continue;
    e.strength *= 0.9;
    if (e.strength < 0.5 && !c.attacked?.includes(e.id)) destroy(c, e, 'surrendered in its pocket');
  }
  c.attacked = [];
  const foe = enemyOf(c.side);
  if (c.turn % ECHELON === 0 && c.enemy.length < ENEMY_MAX[foe]) {
    const depot = Object.keys(SECTORS).find((id) => SECTORS[id].depot && c.owner[id] === foe && !c.enemy.some((e) => e.at === id));
    if (depot) { raiseEnemy(c, depot); c.log.unshift(`${stamp(c)} — fresh enemy forces have reached ${SECTORS[depot].name}.`); }
  }
  c.fought = [];
  c.turn++;
  if (c.turn % 2) c.weather = pick(WEATHERS); // one roll a day
  checkEnd(c);
  return { gain };
}

function checkEnd(c) {
  if (c.over) return;
  const me = c.side;
  const holds = (f, ids) => ids.every((id) => c.owner[id] === f);
  const pactGoal = ['fulda', 'hersfeld'];
  if (!c.battalions.length) c.over = { won: false, text: 'The brigade has been destroyed.' };
  else if (!c.enemy.length) c.over = { won: true, text: 'The enemy has no battalions left in the field. The war on this front is won.' };
  else if (c.length === 'timetable') {
    if (holds('pact', pactGoal)) c.over = { won: me === 'pact', text: 'Fulda and Bad Hersfeld are in Pact hands: the road to the Rhine is open.' };
    else if (c.owner.eisenach === 'nato') c.over = { won: me === 'nato', text: 'NATO has taken Eisenach: the offensive has collapsed.' };
    else if (c.turn > TIMETABLE) c.over = { won: me === 'nato', text: 'Eight days, and Fulda and Bad Hersfeld still hold: the reinforcements from home have arrived.' };
  }
  if (c.over) c.battles = [];
}

// ------------------------------------------------------------------ between battles

export function refillCost(c, u) {
  const T = UNIT_TYPES[u.type];
  const missing = T.formation.count - u.men;
  return Math.ceil((unitCost(T, c.armies[c.side]) * missing) / T.formation.count);
}

export function refill(c, bid, cid) {
  const x = c.battalions.find((b) => b.id === bid);
  const u = x?.stacks.find((s) => s.cid === cid);
  if (!u || cutLevel(c, x)) return false; // nothing gets through to a pocket
  const cost = refillCost(c, u);
  if (!cost || c.points < cost) return false;
  c.points -= cost;
  u.men = UNIT_TYPES[u.type].formation.count;
  u.xp *= 0.8; // the new men dilute the experience a little
  saveCampaign(c);
  return true;
}

/** Types this army can recruit into a battalion. */
export const recruitable = (c) => Object.values(UNIT_TYPES).filter((t) => !t.hidden && !t.airOnly && !t.needsRiver && (!t.armies || t.armies.includes(c.armies[c.side])));

export function recruit(c, bid, type) {
  const x = c.battalions.find((b) => b.id === bid);
  const T = UNIT_TYPES[type];
  const cost = T && unitCost(T, c.armies[c.side]);
  if (!x || !T || c.points < cost || x.stacks.length >= MAX_STACKS || cutLevel(c, x)) return false;
  c.points -= cost;
  x.stacks.push(stack(type, stackName(c, type, x.stacks.filter((u) => u.type === type).length + 1)));
  saveCampaign(c);
  return true;
}
