// Headless world campaign: both sides played by the strategic AI, every battle auto-resolved, the state checked
// every turn; then a save code round trip — and the loaded save must play on exactly as the original.
//
//   node tools/campaign_sim.mjs [scenario=1942|1985] [turns=200] [seed=7]   (1942: the Second World War's one start, 1985: World War III's)
import { newCampaign, resolveTurn, autoResolve, settle, endTurn, dateOf, forcesAt } from '../src/wcampaign/engine.js';
import { aiTurn } from '../src/wcampaign/ai.js';
import { encode, decode, toPieces, fromPieces } from '../src/wcampaign/save.js';
import { WW2 } from '../src/wcampaign/wars/ww2.js';
import { WW3 } from '../src/wcampaign/wars/ww3.js';

const [scenario = '1942', TURNS = 200, SEED = 7] = process.argv.slice(2);
const war = scenario === '1985' ? WW3 : WW2; // (the war of that start: 1942 → 1945's, 1985 → World War III)

function check(c) {
  const bad = [];
  for (const f of c.forces) {
    const place = war.provinces[f.at] ?? war.seas[f.at];
    if (!place) bad.push(`${f.name} at unknown ${f.at}`);
    if (f.kind === 'fleet' && !war.seas[f.at]) bad.push(`fleet ${f.name} on land ${f.at}`);
    if (f.kind !== 'fleet' && !war.provinces[f.at]) bad.push(`${f.kind} ${f.name} at sea ${f.at}`);
    if (f.kind === 'army' && c.provinces[f.at].owner !== f.side && !c.provinces[f.at].contested) bad.push(`${f.name} in enemy ${f.at}`);
    for (const u of f.battalions?.flatMap((b) => b.units) ?? f.ships ?? []) if (!(u.hp > 0 && u.hp <= 1)) bad.push(`${f.name} unit hp ${u.hp}`);
  }
  for (const s of ['nato', 'pact']) if (!Number.isFinite(c.morale[s]) || !Number.isFinite(c.pool[s])) bad.push(`${s} morale/pool NaN`);
  return bad;
}

function playTurn(c) {
  for (const side of ['nato', 'pact']) aiTurn(c, war, side);
  const board = resolveTurn(c, war);
  for (const b of board) if (!b.done) settle(c, war, b.id, autoResolve(c, war, b.id));
  endTurn(c, war);
  return board;
}

const summary = (c) => {
  const by = {};
  for (const [id, p] of Object.entries(c.provinces)) { const t = war.provinces[id].theatre; (by[t] ??= { nato: 0, pact: 0 })[p.owner]++; }
  return `turn ${c.turn} ${dateOf(c)} | ${Object.entries(by).map(([t, n]) => `${t} ${n.nato}:${n.pact}`).join(' ')} | morale ${Math.round(c.morale.nato)}:${Math.round(c.morale.pact)} | forces ${c.forces.filter((f) => f.side === 'nato').length}:${c.forces.filter((f) => f.side === 'pact').length} | pool ${c.pool.nato}:${c.pool.pact}`;
};

const c = newCampaign(war, { scenario, seed: +SEED });
console.log(`${war.name}, ${war.scenarios[scenario].name}, seed ${SEED}`);
console.log(summary(c));
let battles = 0, problems = 0;
const kinds = {};
for (let t = 0; t < +TURNS && !c.over; t++) {
  const board = playTurn(c);
  battles += board.length;
  for (const b of board) kinds[b.kind] = (kinds[b.kind] ?? 0) + 1;
  const bad = check(c);
  if (bad.length) { problems += bad.length; if (problems < 20) console.log('  !', c.turn, bad.slice(0, 3).join('; ')); }
  if (c.turn % 25 === 0) console.log(summary(c));
}
console.log(summary(c));
console.log(`battles ${battles} (${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', ')}), problems ${problems}, over: ${c.over ? `${c.over.winner} — ${c.over.why}` : 'no'}`);
console.log('events:', c.log.filter((l) => l.event).map((l) => `${l.date} ${l.event}`).join(', ') || 'none');

// ---- the save: a code, its size, the QR pieces; load it and play on — both copies must stay identical
const code = await encode(c);
const back = await decode(fromPieces(toPieces(code).reverse()));
const json = JSON.stringify(c);
console.log(`save: JSON ${(json.length / 1024).toFixed(1)} KB → code ${(code.length / 1024).toFixed(1)} KB, ${toPieces(code).length} QR codes; round trip ${JSON.stringify(back) === JSON.stringify({ ...c, power: undefined }) ? 'identical' : 'DIFFERENT'}`);
if (!c.over) {
  for (let t = 0; t < 10; t++) { playTurn(c); playTurn(back); }
  console.log(`after 10 more turns from the original and from the loaded save: ${JSON.stringify(c) === JSON.stringify(back) ? 'the same war' : 'DIVERGED'}`);
}
try { await decode(code.slice(0, -5) + 'AAAAA'); console.log('a damaged code: LOADED (bad)'); } catch (e) { console.log('a damaged code:', e.message); }
