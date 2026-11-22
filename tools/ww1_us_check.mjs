// The First World War with and without the Americans: the same seeds, AI against AI — the full war, the war without the
// AEF's arrivals (aef-* events), and without the United States at all (no AEF, no declaration, no American industry).
// Does the US matter?   node tools/ww1_us_check.mjs
import { newCampaign, resolveTurn, autoResolve, settle, endTurn } from '../src/wcampaign/engine.js';
import { aiTurn } from '../src/wcampaign/ai.js';
import { WW1 } from '../src/wcampaign/wars/ww1.js';
const variants = { full: WW1, noAEF: { ...WW1, events: WW1.events.filter((e) => !/^aef-/.test(e.id)) }, noUSAtAll: { ...WW1, events: WW1.events.filter((e) => !/^aef-|us-war|american-industry/.test(e.id)) } };
for (const [k, war] of Object.entries(variants)) {
  const t = { nato: 0, pact: 0, open: 0 };
  for (let seed = 1; seed <= 80; seed++) {
    const c = newCampaign(war, { seed });
    for (let i = 0; i < 200 && !c.over; i++) { for (const s of ['nato', 'pact']) aiTurn(c, war, s); for (const b of resolveTurn(c, war)) if (!b.done) settle(c, war, b.id, autoResolve(c, war, b.id)); endTurn(c, war); }
    t[c.over?.winner ?? 'open']++;
  }
  console.log(k, t);
}
