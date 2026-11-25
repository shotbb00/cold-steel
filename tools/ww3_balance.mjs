// World War III balance over many seeds: AI against AI, every battle resolved, up to N turns. Per seed: how it ended
// (or the state at the end), the escalation's peak and the turn the brink levels came.   node tools/ww3_balance.mjs [seeds=12] [turns=120]
import { newCampaign, resolveTurn, autoResolve, settle, endTurn, dateOf } from '../src/wcampaign/engine.js';
import { aiTurn } from '../src/wcampaign/ai.js';
import { WW3 as war } from '../src/wcampaign/wars/ww3.js';

const [SEEDS = 12, TURNS = 120] = process.argv.slice(2);
const tally = { nato: 0, pact: 0, ceasefire: 0, open: 0 };
for (let seed = 1; seed <= +SEEDS; seed++) {
  const c = newCampaign(war, { seed });
  let peak = c.escalation;
  for (let t = 0; t < +TURNS && !c.over; t++) {
    for (const side of ['nato', 'pact']) aiTurn(c, war, side);
    for (const b of resolveTurn(c, war)) if (!b.done) settle(c, war, b.id, autoResolve(c, war, b.id));
    endTurn(c, war);
    peak = Math.max(peak, c.escalation);
  }
  const by = {};
  for (const [id, p] of Object.entries(c.provinces)) { const th = war.provinces[id].theatre; (by[th] ??= { nato: 0, pact: 0 })[p.owner]++; }
  const levels = c.log.filter((l) => l.brink).map((l) => `${l.brink}@t${l.turn}`).join(' ');
  if (c.over?.ceasefire) tally.ceasefire++;
  if (c.over) tally[c.over.winner]++; else tally.open++;
  console.log(`seed ${seed}: ${c.over ? `${c.over.winner} t${c.turn} (${c.over.ceasefire ? 'ceasefire' : 'peace'})` : `open t${c.turn}`} | ${Object.entries(by).map(([k, n]) => `${k} ${n.nato}:${n.pact}`).join(' ')} | morale ${Math.round(c.morale.nato)}:${Math.round(c.morale.pact)} | esc peak ${Math.round(peak)} ${levels}`);
}
console.log(tally);
