// One First World War campaign, AI against AI, turn by turn: each theatre's ground, morale, pools, war-weariness and the
// news (collapses, bases lost, events). For balancing wars/ww1.js.   node tools/ww1_trace.mjs [turns=60] [seed=1] [every=1]
import { newCampaign, resolveTurn, autoResolve, settle, endTurn, dateOf } from '../src/wcampaign/engine.js';
import { aiTurn } from '../src/wcampaign/ai.js';
import { WW1 as war } from '../src/wcampaign/wars/ww1.js';

const [TURNS = 60, SEED = 1, EVERY = 1] = process.argv.slice(2);
const c = newCampaign(war, { seed: +SEED });
for (let t = 0; t < +TURNS && !c.over; t++) {
  const logFrom = c.log.length;
  for (const side of ['nato', 'pact']) aiTurn(c, war, side);
  const board = resolveTurn(c, war);
  for (const b of board) if (!b.done) settle(c, war, b.id, autoResolve(c, war, b.id));
  endTurn(c, war);
  const by = {};
  for (const [id, p] of Object.entries(c.provinces)) { const th = war.provinces[id].theatre; (by[th] ??= { nato: 0, pact: 0 })[p.owner]++; }
  const news = c.log.slice(logFrom).filter((l) => l.depotLost || l.collapse || l.event || l.surrender).map((l) => (l.depotLost ? `BASE LOST ${l.depotLost}` : l.collapse ? `COLLAPSE ${l.collapse}` : l.surrender ? `SURRENDER ${l.surrender}` : l.event));
  const won = board.filter((b) => b.kind !== 'sea' && b.margin >= 0.6).map((b) => `${b.attackerSide[0]}:${b.at}`);
  if (c.turn % +EVERY === 0 || news.length) console.log(`t${c.turn} ${dateOf(c)} | ${Object.entries(by).map(([k, n]) => `${k} ${n.nato}:${n.pact}`).join(' ')} | mor ${Math.round(c.morale.nato)}:${Math.round(c.morale.pact)} | pool ${c.pool.nato}:${c.pool.pact} inc ${c.income?.nato}:${c.income?.pact} | w ${Object.entries(c.weary).map(([p, w]) => `${p.slice(0, 3)}${Math.round(w)}`).join(' ')} | took ${won.join(' ')} | ${news.join('; ')}`);
}
console.log(c.over ?? 'still at war');
