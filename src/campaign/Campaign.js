// The Fulda campaign: a war of several battles on a strategic map, with one battalion that
// carries its losses and its veterans from battle to battle.
//   • The front: three columns (west, centre, east), six sectors deep from your rear to the
//     enemy's; each column's front sits between two sectors. A successful attack pushes the front
//     one sector into the defender's ground; a defence that holds keeps it where it is.
//   • Turns alternate: the enemy attacks somewhere (you defend), then you pick where to attack.
//     Each battle is a Breakthrough on the map that sector looks like (river sectors on the
//     Werra Valley), at the hour the war has reached, in whatever weather comes.
//   • Your battalion: every stack keeps its men and its experience. Survivors come home with
//     what they have; the dead are gone. Between battles replacement points (more for every
//     sector held) refill squads or bring in new stacks.
//   • You win by breaking through to the enemy's rear in any column, or by holding more ground
//     than they do after twelve turns. You lose if they reach yours.
// Saved in localStorage ('coldsteel.campaign').
import { UNIT_TYPES } from '../data/units/index.js';
import { enemyOf } from '../data/factions.js';

const KEY = 'coldsteel.campaign';
const ROWS = 6;
const TURNS = 12;
export const COLUMNS = ['west', 'centre', 'east'];
// sector names from the NATO rear (row 0) to the Pact rear (row 5)
const NAMES = {
  west: ['Bad Hersfeld', 'Rasdorf', 'Geisa', 'Philippsthal', 'Dermbach', 'Bad Salzungen'],
  centre: ['Fulda', 'Hünfeld', 'Point Alpha', 'Vacha', 'Tiefenort', 'Eisenach'],
  east: ['Gersfeld', 'Tann', 'Wenigentaft', 'Heringen', 'Kaltennordheim', 'Meiningen'],
};
const RIVER_ROWS = [3];             // the Werra runs through these rows: river battles
const HOURS = ['day', 'dusk', 'night', 'dawn', 'day', 'day'];
const WEATHERS = ['overcast', 'overcast', 'clear', 'rain', 'fog', 'overcast'];
export const START_BATTALION = ['rifles', 'rifles', 'rifles', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'atTeam', 'tank', 'mortar', 'engineers', 'scouts', 'ifv'];
const REPLACEMENTS = 450;           // per turn…
const PER_SECTOR = 60;              // …plus per sector held
const MAX_BATTALION = 18;

let uid = 1;
const unit = (type, name) => ({ cid: `c${Date.now().toString(36)}${uid++}`, type, name, men: UNIT_TYPES[type].formation.count, xp: 0 });

export function loadCampaign() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
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

export function newCampaign(side) {
  const count = {};
  const battalion = START_BATTALION.map((t) => {
    count[t] = (count[t] ?? 0) + 1;
    const T = UNIT_TYPES[t];
    return unit(t, `${side === 'pact' ? (T.variants?.pact?.name ?? T.shortName) : (T.variants?.nato?.name ?? T.shortName)} ${['I', 'II', 'III', 'IV', 'V'][count[t] - 1] ?? count[t]}`);
  });
  const c = {
    side,
    turn: 1,
    front: { west: 3, centre: 3, east: 3 }, // sectors 0..front-1 are NATO's, front..5 the Pact's
    battalion,
    points: 200,
    log: [`Turn 1 — the war begins. The ${side === 'nato' ? 'Warsaw Pact is massing on the border' : 'NATO line is thin along the border'}.`],
    next: null,
    over: null,
  };
  c.next = planBattle(c);
  saveCampaign(c);
  return c;
}

/** Sector name at (column, row) and who holds it. */
export function sector(c, col, row) {
  return { name: NAMES[col][row], owner: row < c.front[col] ? 'nato' : 'pact', river: RIVER_ROWS.includes(row) };
}

export function held(c, faction) {
  let n = 0;
  for (const col of COLUMNS) n += faction === 'nato' ? c.front[col] : ROWS - c.front[col];
  return n;
}

/** The coming battle: odd turns the enemy attacks (in its pick of column), even turns you choose. */
export function planBattle(c, col = null) {
  const me = c.side;
  const foe = enemyOf(me);
  const enemyTurn = c.turn % 2 === 1;
  const attacker = enemyTurn ? foe : me;
  if (!col) {
    // the enemy goes for the column where it's furthest forward (it smells a breakthrough)
    const score = (k) => (foe === 'pact' ? ROWS - c.front[k] : c.front[k]) + Math.random() * 1.5;
    col = enemyTurn ? COLUMNS.reduce((a, b) => (score(b) > score(a) ? b : a)) : null;
  }
  if (!col) return { attacker, col: null, choose: true };
  // the contested sector: the defender's sector at the front in that column
  const row = attacker === 'pact' ? c.front[col] - 1 : c.front[col];
  const s = sector(c, col, Math.max(0, Math.min(ROWS - 1, row)));
  return {
    attacker,
    col,
    row,
    name: s.name,
    map: s.river ? 'werra-valley' : 'fulda-gap',
    time: HOURS[(c.turn - 1) % HOURS.length],
    weather: WEATHERS[Math.floor(Math.random() * WEATHERS.length)],
    choose: false,
  };
}

/** The enemy's force for this battle: grows with the war. */
export function enemyForce(c, battle) {
  const att = battle.attacker !== c.side;
  const base = att
    ? ['rifles', 'rifles', 'rifles', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'tank', 'tank', 'ifv', 'mortar', 'engineers', 'scouts', 'aa']
    : ['rifles', 'rifles', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'atTeam', 'tank', 'mortar', 'engineers', 'scouts'];
  const extra = ['rifles', 'tank', 'ifv', 'atTeam', 'mgTeam', 'artillery'].slice(0, Math.floor(c.turn / 2));
  return [...base, ...extra].map((type) => ({ type }));
}

/** What a battle needs to start: the menu hands this to main.js start(). */
export function battleChoice(c) {
  const b = c.next;
  return {
    mode: 'breakthrough',
    map: b.map,
    side: c.side,
    time: b.time,
    weather: b.weather,
    campaign: {
      attacker: b.attacker,
      sector: b.name,
      forces: {
        [c.side]: c.battalion.map((u) => ({ ...u })),
        [enemyOf(c.side)]: enemyForce(c, b),
      },
    },
  };
}

/**
 * After the battle: survivors keep their men and experience, the dead are struck off, stacks
 * bought during the battle join the battalion; the front moves; replacement points come in.
 */
export function recordBattle(c, { won, survivors }) {
  const b = c.next;
  const byId = new Map(survivors.filter((s) => s.cid).map((s) => [s.cid, s]));
  const before = c.battalion.length;
  c.battalion = c.battalion.filter((u) => byId.has(u.cid)).map((u) => {
    const s = byId.get(u.cid);
    return { ...u, men: s.men, xp: s.xp, rank: s.rank };
  });
  const lost = before - c.battalion.length;
  for (const s of survivors) if (!s.cid && c.battalion.length < MAX_BATTALION) c.battalion.push({ ...unit(s.type, s.name), men: s.men, xp: s.xp, rank: s.rank });
  // the front: the winner pushes a sector into the loser's ground in that column
  // the front moves only when an attack succeeds: a sector into the defender's ground
  const winner = won ? c.side : enemyOf(c.side);
  const attackerWon = winner === b.attacker;
  if (attackerWon) c.front[b.col] = Math.max(0, Math.min(ROWS, c.front[b.col] + (winner === 'nato' ? 1 : -1)));
  c.log.unshift(`Turn ${c.turn} — ${b.name} (${b.col}): ${attackerWon ? `${b.attacker === c.side ? 'our attack broke through' : 'the enemy broke through'}` : `${b.attacker === c.side ? 'our attack was thrown back' : 'we held'}`}.${lost > 0 ? ` ${lost} stack${lost > 1 ? 's' : ''} lost.` : ''}`);
  // replacements
  const gain = REPLACEMENTS + PER_SECTOR * held(c, c.side);
  c.points += gain;
  c.turn++;
  // the end?
  const me = c.side;
  const enemyRear = me === 'nato' ? ROWS : 0;
  const ourRear = me === 'nato' ? 0 : ROWS;
  if (COLUMNS.some((k) => c.front[k] === enemyRear)) c.over = { won: true, text: 'Breakthrough to the enemy\'s rear — the campaign is won.' };
  else if (COLUMNS.some((k) => c.front[k] === ourRear)) c.over = { won: false, text: 'The enemy has broken through to our rear — the campaign is lost.' };
  else if (!c.battalion.length) c.over = { won: false, text: 'The battalion has been destroyed.' };
  else if (c.turn > TURNS) {
    const mine = held(c, me);
    const theirs = held(c, enemyOf(me));
    c.over = mine >= theirs
      ? { won: true, title: 'Campaign won', text: `After ${TURNS} turns we hold ${mine} sectors to their ${theirs}. The front has held.` }
      : { won: false, text: `After ${TURNS} turns the enemy holds ${theirs} sectors to our ${mine}.` };
  }
  c.next = c.over ? null : planBattle(c);
  saveCampaign(c);
  return { gain };
}

/** Between battles: refill a squad (men back to full) — cost by the share missing. */
export function refillCost(u) {
  const T = UNIT_TYPES[u.type];
  const missing = T.formation.count - u.men;
  return Math.ceil((T.cost * missing) / T.formation.count);
}

export function refill(c, cid) {
  const u = c.battalion.find((x) => x.cid === cid);
  if (!u) return false;
  const cost = refillCost(u);
  if (!cost || c.points < cost) return false;
  c.points -= cost;
  u.men = UNIT_TYPES[u.type].formation.count;
  u.xp *= 0.8; // the new men dilute the experience a little
  saveCampaign(c);
  return true;
}

export function recruit(c, type) {
  const T = UNIT_TYPES[type];
  if (!T || c.points < T.cost || c.battalion.length >= MAX_BATTALION) return false;
  c.points -= T.cost;
  const n = c.battalion.filter((u) => u.type === type).length + 1;
  c.battalion.push(unit(type, `${T.variants?.[c.side]?.name ?? T.shortName} ${n}`));
  saveCampaign(c);
  return true;
}

export { ROWS, TURNS, MAX_BATTALION };
