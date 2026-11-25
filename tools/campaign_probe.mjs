// Where a simulated war stands after N turns (tools/campaign_sim.mjs plays it): per theatre, who holds what and which
// forces are where; and what each side's AI would order next. For finding out why a front has frozen.
//   node tools/campaign_probe.mjs [scenario] [turns] [seed] [theatre]
import { newCampaign, resolveTurn, autoResolve, settle, endTurn, power, reserves } from '../src/wcampaign/engine.js';
import { aiTurn } from '../src/wcampaign/ai.js';
import { WW2 } from '../src/wcampaign/wars/ww2.js';

const [scenario = '1942', TURNS = 400, SEED = 1, TH = 'pacific'] = process.argv.slice(2);
const war = WW2, c = newCampaign(war, { scenario, seed: +SEED });
for (let i = 0; i < +TURNS && !c.over; i++) {
  for (const s of ['nato', 'pact']) aiTurn(c, war, s);
  for (const b of resolveTurn(c, war)) if (!b.done) settle(c, war, b.id, autoResolve(c, war, b.id));
  endTurn(c, war);
}
const where = (id) => war.provinces[id]?.theatre ?? war.seas[id]?.theatre;
console.log(`turn ${c.turn}, pools ${Math.round(c.pool.nato)}:${Math.round(c.pool.pact)}, income ${c.income?.nato}:${c.income?.pact}, reserves here ${Math.round(reserves(c, 'nato', TH))}:${Math.round(reserves(c, 'pact', TH))}`);
for (const [id, p] of Object.entries(war.provinces).filter(([, p]) => p.theatre === TH)) {
  const P = c.provinces[id], fs = c.forces.filter((f) => f.at === id);
  console.log(`  ${id.padEnd(14)} ${P.owner}${P.depot ? ' depot' : ''}${p.port ? ' port' : ''}${p.airfield ? ' air' : ''} fort ${P.fort} | ${fs.map((f) => `${f.side[0]}:${f.kind}:${Math.round(power(c, f))}`).join(' ')}`);
}
for (const [id, z] of Object.entries(war.seas).filter(([, z]) => z.theatre === TH)) console.log(`  ~${id.padEnd(13)} | ${c.forces.filter((f) => f.at === id).map((f) => `${f.side[0]}:${Math.round(power(c, f))}`).join(' ')}`);
for (const s of ['nato', 'pact']) console.log(s, 'would:', aiTurn(c, war, s).filter((x) => true).slice(0, 12).join(' · ') || 'nothing');
