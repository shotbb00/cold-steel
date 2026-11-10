// What a sailing ship's fight does to her (1806, `stats.sail`), on top of the steel navies' hull damage
// (UnitStack.shipHit: leaks, fire and the magazine, the wheel, dismounted guns):
//   raking    a ball along her length — in at the bow, or worse through the stern windows — runs down the
//             whole gun deck: far more damage, far more men (breaking the line rakes the ships either side)
//   crew      u.crew, 1 → 0: the men at the guns; fewer, slower broadsides (UnitStack fire) and a weaker
//             boarding party
//   masts     u.masts (fore … mizzen; a brig two, a gunboat one) standing, their hit points u.mastHp; a hit high
//             up — the French aim at the rigging — can bring one down: she loses its drive (mastShares) and
//             handles worse; after JURY s her people rig a jury mast and get back half of it
//   striking  beaten (the hull shattered, the crew cut down or the masts gone) and her nerve gone, she strikes
//             her colours: no more firing, her sails let fly, and nobody fires at her (UnitStack.pickTarget).
//             A flagship near (stats.flagship, not struck) steadies the squadron: they hold out longer.
//             She seldom sinks — the fire reaching the magazine, or the sea coming in faster than the pumps.
//   boarding  alongside an enemy (CONTACT), ordered to (st.boardTarget: Orders 'board') or with men enough to
//             spare (BOARD_ODDS), she grapples her: the two lie locked together and the crews fight it out on
//             the decks — the French carry more soldiers — until one side's men are cut down (BOARD_END).
//             The loser is taken; a ship that has already struck is taken by whoever lies alongside her
//             for TAKE_POSSESSION s. A prize changes sides with a prize crew (PRIZE_CREW): weak, slow at her
//             guns — and her old side can board her back.
import { FACTIONS } from '../data/factions.js';
import { wind } from '../world/Wind.js';

export const GALE = 11; // m/s: a gale — the lower deck ports shut (UnitStack fire), masts carry away sooner

const MAST_HP = 0.18;                          // a mast's hit points, as a share of the hull's
const JURY = 90;                               // s until a jury mast is up where one fell
const RAKE = { bow: 1.6, stern: 2.2, along: 0.82 }; // damage × through the bow, through the stern; |cos| of the shot to her keel that counts as along it
const CONTACT = 30;                            // m between two hulls' middles: alongside, or fouled (the yards locked)
const TAKE_POSSESSION = 8;                     // s alongside a ship that has struck to take her
const POSSESS = 75;                            // m: near enough a struck ship to send a boat across and take possession
const BOARD_ODDS = 1.4;                        // her boarders outnumber theirs this much: over the side without orders
const BOARD_RATE = 0.06;                       // crew lost a second on the losing side of an even fight (more when it isn't)
const BOARD_END = 0.1;                         // the crew left when a side gives up the deck
const PRIZE_CREW = 0.25;                       // the share of a full crew put aboard a prize
const FLAG_REACH = 700;                        // m the flagship's example carries
const MARINES = { nato: 1.3, pact: 1 };        // the French ships' soldiers aboard (and the British marines)
const NAMES3 = ['foremast', 'mainmast', 'mizzen'], NAMES2 = ['foremast', 'mainmast'], NAMES1 = ['mast'];

/** Each mast's share of her drive: a ship's three, a brig's two, a gunboat's one. */
const mastShares = (n) => (n >= 3 ? [0.32, 0.45, 0.23] : n === 2 ? [0.5, 0.5] : [1]);
const mastNames = (n) => (n >= 3 ? NAMES3 : n === 2 ? NAMES2 : NAMES1);
const mastsOf = (st) => st.stats.masts ?? 3;

/** How much harder a shot along `dir` (the way the ball flies) hits her: raking her from ahead or from astern. */
export function rakeFactor(u, dir) {
  if (!dir) return 1;
  const l = Math.hypot(dir.x, dir.z) || 1;
  const c = (dir.x * Math.sin(u.yaw) + dir.z * Math.cos(u.yaw)) / l; // +1: flying the way she points (in through her stern)
  return c > RAKE.along ? RAKE.stern : c < -RAKE.along ? RAKE.bow : 1;
}

/** Her drive under sail, from her masts: standing, or a jury rig (half). */
export function mastDrive(u) {
  if (!u.masts) return 1;
  const sh = mastShares(u.masts.length);
  let k = 0;
  for (let i = 0; i < u.masts.length; i++) k += sh[i] * (u.masts[i] ? 1 : u.jury?.[i] ? 0.5 : 0);
  return k;
}

const ensure = (st, u) => {
  const n = mastsOf(st);
  u.masts ??= Array(n).fill(true);
  u.mastHp ??= Array(n).fill(u.maxHp * MAST_HP);
};

/** A hit that got through (after shipHit's hull damage): the men, the masts — and how hard it was (raked). */
export function sailHit(st, u, dealt, source, rake) {
  const tell = (t) => st.services.tell(st.faction, `${st.name}: ${t}`);
  ensure(st, u);
  const k = dealt / u.maxHp;
  u.crew = Math.max(0, (u.crew ?? 1) - k * (rake > 1 ? 1.5 : 0.7) * (u.prize ? 2 : 1)); // (a prize crew is few: every man lost counts)
  if (rake > 1 && !(u.rakeTold > st.world.time - 20)) { u.rakeTold = st.world.time; tell(rake > 2 ? 'raked through the stern!' : 'raked from ahead!'); }
  // the rigging: the French gunners fire on the up-roll, at the masts (source: the French side, nato)
  const french = source?.faction === 'nato' && source?.stats?.sail;
  if (Math.random() < (french ? 0.5 : 0.18)) {
    const i = Math.floor(Math.random() * u.masts.length);
    if (u.masts[i]) {
      u.mastHp[i] -= dealt * (french ? 1.6 : 1) * (wind.speed > GALE ? 1.5 : 1);
      if (u.mastHp[i] <= 0) {
        u.masts[i] = false;
        (u.fellAt ??= [])[i] = st.world.time;
        st.morale = Math.max(0, st.morale - 0.12);
        st.services.effects.waterSplash?.({ x: u.pos.x + Math.cos(u.yaw) * 12, y: st.world.river?.level ?? 0, z: u.pos.z - Math.sin(u.yaw) * 12 }, 3);
        tell(`the ${mastNames(u.masts.length)[i]} has gone by the board!`);
      }
    }
  }
  st.morale = Math.max(0, st.morale - k * 0.6);
}

/** Every frame: jury masts going up, boarding and possession, and whether she strikes. */
export function sailUpkeep(st, u, dt) {
  const now = st.world.time;
  ensure(st, u);
  for (let i = 0; i < u.masts.length; i++) if (!u.masts[i] && !u.jury?.[i] && now - (u.fellAt?.[i] ?? now) > JURY) { (u.jury ??= [])[i] = true; st.services.tell(st.faction, `${st.name}: a jury ${mastNames(u.masts.length)[i]} rigged`); }
  if (st.services.game?.net?.isClient) return; // (the host decides who boards, strikes and takes)
  if (st.stats.fireship) return fireship(st, u, dt);
  board(st, u, dt);
  if (u.struck || u.grappled) return;
  const hull = u.hp / u.maxHp, crew = u.crew ?? 1, drive = mastDrive(u);
  const crewLow = u.prize ? 0.12 : 0.5; // (a prize crew is few to begin with: only its loss counts)
  const beaten = Math.max(0, 0.45 - hull) * 2.5 + Math.max(0, crewLow - crew) * 2.2 + (drive < 0.3 ? 0.4 : 0) + ((u.blaze ?? 0) > 0.6 ? 0.2 : 0); // 0: still fighting … 1 and more: done for
  if (beaten <= 0) return;
  if (!st.world.stacksOf(st.faction === 'nato' ? 'pact' : 'nato').some((e) => e.stats.naval && !e.units[0]?.struck && Math.hypot(e.centroid.x - u.pos.x, e.centroid.z - u.pos.z) < 1500)) return; // (no enemy near to strike to)
  const flag = st.world.stacksOf(st.faction).some((f) => f !== st && f.stats.flagship && !f.units[0]?.struck && Math.hypot(f.centroid.x - u.pos.x, f.centroid.z - u.pos.z) < FLAG_REACH);
  const grit = (st.faction === 'pact' ? 0.75 : 1) * (flag ? 0.6 : 1) * (st.services.game?.powers?.signalled?.(st.faction) ? 0.5 : 1); // (the Royal Navy fought on longer; the admiral's flag in sight, everyone did)
  if (Math.random() < dt * beaten * 0.2 * grit * (1.5 - st.morale)) strike(st, u);
}

/** A fireship: alongside an enemy, her crew lights her and takes to the boat — the enemy catches fire, she burns to the waterline. */
function fireship(st, u, dt) {
  if ((u.contactT = (u.contactT ?? 0) - dt) > 0) return;
  u.contactT = 0.5;
  for (const es of st.world.stacksOf(st.faction === 'nato' ? 'pact' : 'nato')) {
    const e = es.units[0];
    if (!es.stats.sail || !e?.alive || Math.hypot(e.pos.x - u.pos.x, e.pos.z - u.pos.z) > CONTACT + 8) continue;
    e.blaze = Math.min(1, (e.blaze ?? 0) + 0.75);
    es.morale = Math.max(0, es.morale - 0.25);
    st.services.effects.burn({ x: u.pos.x, y: u.pos.y + 4, z: u.pos.z }, 30, 3);
    st.services.effects.explosion({ x: u.pos.x, y: u.pos.y + 3, z: u.pos.z }, 2.5, { ground: false, fire: 3 });
    st.services.tell(es.faction, `${es.name}: a fireship alongside — she's caught fire!`);
    st.services.tell(st.faction, `${st.name} has set ${es.name} ablaze`);
    st.damageUnit(u, u.hp * 10 + 1e5, null, 1, null, 1); // (she burns down to the waterline)
    return;
  }
}

/** She strikes her colours: out of the fight, her sails let fly — a prize for whoever takes possession. */
export function strike(st, u) {
  u.struck = true;
  u.target = null;
  st.moveTarget = null;
  st.boardTarget = null;
  st.services.tell(st.faction, `${st.name} has struck her colours`);
  st.services.tell(st.faction === 'nato' ? 'pact' : 'nato', `${st.name} has struck to us!`);
}

/** Her boarders' weight: the men left, her size (a first rate's crew against a brig's), the soldiers aboard, their spirit. */
const boarders = (st, u) => (u.crew ?? 1) * ((st.type.hull?.length ?? 52) / 52) ** 1.5 * (MARINES[st.faction] ?? 1) * (0.5 + st.morale * 0.5);

function board(st, u, dt) {
  const g = st.services.game;
  if (st.boardTarget && (!st.boardTarget.alive || st.boardTarget.faction === st.faction)) st.boardTarget = null;
  // ordered to board: steer for her (the AI and the player: Orders 'board')
  if (st.boardTarget && !u.grappled && (st.boardT = (st.boardT ?? 0) - dt) <= 0) {
    st.boardT = 2;
    const t = st.boardTarget.units[0];
    st.ai.moveTo({ x: t.pos.x + (t.vel?.x ?? 0) * 6, z: t.pos.z + (t.vel?.z ?? 0) * 6 }, { ordered: false });
  }
  if ((u.contactT = (u.contactT ?? 0) - dt) > 0) return; // (every half second: the deck fight too)
  u.contactT = 0.5;
  // locked together with her enemy: the fight on the decks
  if (u.grappled) {
    const e = u.grappled, es = e.stack;
    if (!e.alive || es.faction === st.faction || Math.hypot(e.pos.x - u.pos.x, e.pos.z - u.pos.z) > CONTACT * 1.6) { u.grappled = null; if (e.grappled === u) e.grappled = null; return; }
    if (e.grappled !== u) e.grappled = u;
    if (st.id > es.id) return; // (one of the pair runs the fight)
    const a = boarders(st, u), b = boarders(es, e) * 1.15; // (the defenders hold their own deck a little better — whoever is defending, it's both at once)
    const step = BOARD_RATE * 0.5 * 2; // (this runs every CONTACT check, 0.5 s)
    u.crew = Math.max(0, (u.crew ?? 1) - step * (b / (a + b)) * (u.prize ? 2 : 1));
    e.crew = Math.max(0, (e.crew ?? 1) - step * (a / (a + b)) * (e.prize ? 2 : 1));
    if ((e.crew ?? 1) < BOARD_END || (e.struck && (u.crew ?? 1) > BOARD_END)) takePrize(es, e, st, u);
    else if ((u.crew ?? 1) < BOARD_END) takePrize(st, u, es, e);
    return;
  }
  // alongside an enemy: take her if she has struck, else grapple — ordered to, or with men enough to spare
  if (u.struck) return;
  for (const es of st.world.stacksOf(st.faction === 'nato' ? 'pact' : 'nato')) {
    const e = es.units[0];
    const gap = Math.hypot(e.pos.x - u.pos.x, e.pos.z - u.pos.z);
    if (!es.stats.sail || !e?.alive || gap > (e.struck ? POSSESS : CONTACT + ((es.type.hull?.beam ?? 14) + (st.type.hull?.beam ?? 14)) * 0.2)) continue;
    if (e.struck) {
      if ((u.possessT = (u.possessT ?? 0) + 0.5) >= TAKE_POSSESSION) { u.possessT = 0; takePrize(es, e, st, u); }
      return;
    }
    if (e.grappled) continue;
    if (st.boardTarget === es || boarders(st, u) > boarders(es, e) * BOARD_ODDS) {
      u.grappled = e;
      e.grappled = u;
      st.moveTarget = null;
      es.moveTarget = null;
      st.services.tell(st.faction, `${st.name}: boarders away — alongside ${es.name}!`);
      st.services.tell(es.faction, `${es.name}: boarded by ${st.name}!`);
      g?.audio?.play('explosion.small', u.pos, { volume: 0.4 });
      return;
    }
  }
  u.possessT = 0;
}

/** `st` is taken by `by`: she changes sides with a prize crew from her captor (taken out of his own). */
export function takePrize(st, u, by, bu) {
  const g = st.services.game;
  const from = st.faction, to = by.faction;
  u.grappled = null;
  bu.grappled = null;
  st.faction = to;
  st.factionDef = FACTIONS[to];
  st.army = by.army;
  st.owner = by.owner;
  for (const x of st.units) x.faction = to;
  st.glowColor.set(st.factionDef.marking);
  st.boltColor.set(st.factionDef.bolt).multiplyScalar(2.4);
  u.struck = false;
  u.prize = true;
  u.crew = PRIZE_CREW;
  u.target = null;
  bu.crew = Math.max(BOARD_END, (bu.crew ?? 1) - PRIZE_CREW * 0.4); // (her captor's men put aboard her)
  st.morale = 0.6;
  st.moveTarget = null;
  st.boardTarget = null;
  st.ai.idle?.();
  st.services.tell(to, `${st.name} taken — a prize crew is aboard!`);
  st.services.tell(from, `${st.name} has been taken by the enemy`);
  st.services.bus.emit('stack:side', st);
  g?.netEvent?.('side', st.id, to);
}

/** A guest: the host says a ship has changed hands (NetClient 'side'). */
export function sideChanged(st, to) {
  st.faction = to;
  st.factionDef = FACTIONS[to];
  for (const x of st.units) x.faction = to;
  st.glowColor?.set(st.factionDef.marking);
  if (st.units[0]) { st.units[0].prize = true; st.units[0].struck = false; }
  st.services.bus.emit('stack:side', st);
}
