// First World War balance over many seeds: AI against AI, every battle resolved, up to N turns. Per seed: how it ended (or
// the state at the end), which powers collapsed and when (Russia's first), how many American divisions came over.
//   node tools/ww1_balance.mjs [seeds=20] [turns=200] [first=1]
import { newCampaign, resolveTurn, autoResolve, settle, endTurn, dateOf } from '../src/wcampaign/engine.js';
import { aiTurn } from '../src/wcampaign/ai.js';
import { WW1 as war } from '../src/wcampaign/wars/ww1.js';

const [SEEDS = 20, TURNS = 200, FIRST = 1] = process.argv.slice(2);
const tally = { nato: 0, pact: 0, open: 0 }, russia = [];
for (let seed = +FIRST; seed < +FIRST + +SEEDS; seed++) {
  const c = newCampaign(war, { seed });
  let jan = null;
  for (let t = 0; t < +TURNS && !c.over; t++) {
    if (!jan && dateOf(c) >= '1918-01-01') jan = Object.entries(c.weary).map(([p, w]) => `${p.slice(0, 3)}${c.surrendered?.includes(p) ? '×' : Math.round(w)}`).join(' ');
    for (const side of ['nato', 'pact']) aiTurn(c, war, side);
    for (const b of resolveTurn(c, war)) if (!b.done) settle(c, war, b.id, autoResolve(c, war, b.id));
    endTurn(c, war);
  }
  const by = {};
  for (const [id, p] of Object.entries(c.provinces)) { const th = war.provinces[id].theatre; (by[th] ??= { nato: 0, pact: 0 })[p.owner]++; }
  const out = c.log.filter((l) => l.collapse || l.surrender).map((l) => `${(l.collapse ?? l.surrender).slice(0, 3)}${l.surrender ? '!' : ''} ${l.date.slice(0, 7)}`);
  const ru = c.log.find((l) => (l.collapse ?? l.surrender) === 'russia');
  russia.push(ru ? ru.date.slice(0, 7) : 'held');
  const aef = c.log.filter((l) => /^aef-/.test(l.event ?? '')).length;
  tally[c.over?.winner ?? 'open']++;
  console.log(`seed ${seed}: ${c.over ? `${c.over.winner} ${dateOf(c)} (${c.over.why})` : `open ${dateOf(c)}`} | ${Object.entries(by).map(([k, n]) => `${k} ${n.nato}:${n.pact}`).join(' ')} | mor ${Math.round(c.morale.nato)}:${Math.round(c.morale.pact)} | out: ${out.join(', ') || '—'} | AEF ${aef}/7 | Jan 1918: ${jan ?? '—'}`);
}
console.log(tally, '| Russia:', russia.join(' '));
