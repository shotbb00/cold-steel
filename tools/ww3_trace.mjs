// One World War III campaign, AI against AI, turn by turn: each theatre's ground, morale, the escalation and what raised
// it (bases taken and bombed). For balancing wars/ww3.js.   node tools/ww3_trace.mjs [turns=40] [seed=1]
import { newCampaign, resolveTurn, autoResolve, settle, endTurn, dateOf } from '../src/wcampaign/engine.js';
import { aiTurn } from '../src/wcampaign/ai.js';
import { WW3 as war } from '../src/wcampaign/wars/ww3.js';

const [TURNS = 40, SEED = 1] = process.argv.slice(2);
const c = newCampaign(war, { seed: +SEED });
for (let t = 0; t < +TURNS && !c.over; t++) {
  const logFrom = c.log.length;
  for (const side of ['nato', 'pact']) aiTurn(c, war, side);
  for (const b of resolveTurn(c, war)) if (!b.done) settle(c, war, b.id, autoResolve(c, war, b.id));
  endTurn(c, war);
  const by = {};
  for (const [id, p] of Object.entries(c.provinces)) { const th = war.provinces[id].theatre; (by[th] ??= { nato: 0, pact: 0 })[p.owner]++; }
  const news = c.log.slice(logFrom).filter((l) => l.depotLost || l.brink || /struck/.test(l.text ?? '') && /East Germany|Kola|North Korea|Vladivostok|Rhine|Britain|Seoul|Bodø|United States|Japan/.test(l.text ?? ''))
    .map((l) => l.depotLost ? `BASE LOST ${l.depotLost} (${l.side})` : l.brink ? `LEVEL ${l.brink}` : `strike: ${l.text.slice(0, 60)}`);
  console.log(`t${c.turn} ${dateOf(c)} | ${Object.entries(by).map(([k, n]) => `${k} ${n.nato}:${n.pact}`).join(' ')} | morale ${Math.round(c.morale.nato)}:${Math.round(c.morale.pact)} | esc ${Math.round(c.escalation)}@${c.escalatedAt} | ${news.join('; ')}`);
}
console.log(c.over ?? 'still at war');
