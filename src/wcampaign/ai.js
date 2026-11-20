// The world campaign's strategic AI: one side's orders for a turn (src/wcampaign/engine.js). It plays each theatre on
// its own, the way a staff would: attack where the odds are good, hold where they are not, bring reserves to the front,
// fight for the sea before a landing, land where an enemy coast is weak, spend the pool on refits first, then new
// battalions where the front needs them. It knows only what its side has seen (`seen`: its provinces and those next
// to them), so a surprise landing is a surprise.
import { forcesAt, enemy, power, order, refit, raise, supplied, reserves, landingZone } from './engine.js';

const ATTACK_ODDS = 1.15;   // its power (and the reserves its pool can send) against the defence it can see, before it attacks
const LAND_ODDS = 1.6;      // a landing wants more

/** What `side` can see: its provinces and their neighbours, by land and across the sea zones its fleets hold. */
export function seenBy(c, war, side) {
  const seen = new Set();
  for (const [id, p] of Object.entries(c.provinces)) if (p.owner === side) { seen.add(id); for (const n of war.provinces[id].land) seen.add(n); }
  for (const f of c.forces) if (f.side === side && f.kind === 'fleet') { seen.add(f.at); for (const k of war.seas[f.at].coasts) seen.add(k); for (const z of war.seas[f.at].seas) seen.add(z); }
  return seen;
}

const fort = (c, id) => 1 + 0.25 * Math.max(c.provinces[id].fort ?? 0, c.provinces[id].depot ? 2 : 0);
/** The defence `side` expects at a province: the forces it can see there and next door, the ground, the garrison. */
function defenceAt(c, war, side, id, seen) {
  const foe = enemy(side), here = seen.has(id) ? forcesAt(c, id, foe, 'army') : [];
  const near = war.provinces[id].land.filter((n) => seen.has(n)).flatMap((n) => forcesAt(c, n, foe, 'army')).slice(0, 1);
  return Math.max(150, [...here, ...near].reduce((a, f) => a + power(c, f), 0)) * fort(c, id) + reserves(c, foe);
}

/** Steps by land from province `from` to the nearest province matching `goal` (Infinity: none). */
function stepsTo(war, from, goal) {
  const seen = new Set([from]); let ring = [from];
  for (let d = 0; ring.length && d < 20; d++) {
    if (ring.some(goal)) return d;
    const next = [];
    for (const id of ring) for (const n of war.provinces[id].land) if (!seen.has(n)) { seen.add(n); next.push(n); }
    ring = next;
  }
  return Infinity;
}

/** Orders for every force of `side`, and its spending. Returns a list of what it decided (for logs and tests). */
export function aiTurn(c, war, side) {
  const did = [], foe = enemy(side), seen = seenBy(c, war, side);
  const mine = c.forces.filter((f) => f.side === side);
  const front = (id) => war.provinces[id].land.some((n) => c.provinces[n].owner === foe);
  // ---- fleets: together into a zone where their combined strength beats the enemy's; else toward an enemy coast
  const fleets = mine.filter((x) => x.kind === 'fleet'), sailing = new Set();
  const zones = [...new Set(fleets.flatMap((f) => war.seas[f.at].seas))].filter((z) => forcesAt(c, z, foe, 'fleet').length)
    .map((z) => ({ z, foe: forcesAt(c, z, foe, 'fleet').reduce((a, x) => a + power(c, x), 0) })).sort((a, b) => a.foe - b.foe);
  for (const t of zones) {
    const can = fleets.filter((f) => !sailing.has(f) && war.seas[f.at].seas.includes(t.z));
    const sum = can.reduce((a, x) => a + power(c, x), 0);
    if (sum < t.foe * 1.2) continue;
    for (const f of can) if (!order(c, war, side, f.id, t.z)) { sailing.add(f); did.push(`${f.name} → ${t.z}`); }
  }
  for (const f of fleets) {
    if (sailing.has(f)) continue;
    const here = war.seas[f.at], mineHere = forcesAt(c, f.at, side, 'fleet').reduce((a, x) => a + power(c, x), 0);
    const offCoast = (z) => war.seas[z].coasts.some((k) => c.provinces[k].owner === foe);
    if (offCoast(f.at)) continue; // (already off an enemy coast: there to cover a landing)
    const step = here.seas.filter((z) => forcesAt(c, z, foe, 'fleet').reduce((a, x) => a + power(c, x), 0) < mineHere).sort((a, b) => Number(offCoast(b)) - Number(offCoast(a)))[0];
    if (step && offCoast(step) && !order(c, war, side, f.id, step)) did.push(`${f.name} → ${step}, off the enemy coast`);
  }
  // ---- armies: break out of pockets, attack together where the odds are good, land, or move up to the front
  const armies = mine.filter((x) => x.kind === 'army'), busy = new Set(), taken = new Set();
  for (const f of armies.filter((x) => x.cut)) { // cut off: break out toward an own province next door
    const out = war.provinces[f.at].land.find((n) => c.provinces[n].owner === side);
    if (out && !order(c, war, side, f.id, out)) did.push(`${f.name} breaks out → ${out}`);
    busy.add(f);
  }
  // every enemy province next to one of ours: who could go in, and against what
  const targets = [...new Set(armies.filter((f) => !busy.has(f)).flatMap((f) => war.provinces[f.at].land))]
    .filter((n) => c.provinces[n].owner === foe)
    .map((n) => ({ n, def: defenceAt(c, war, side, n, seen), by: armies.filter((f) => !busy.has(f) && war.provinces[f.at].land.includes(n)).sort((x, y) => power(c, y) - power(c, x)) }))
    .sort((x, y) => x.def - y.def);
  for (const t of targets) {
    const go = [];
    let sum = reserves(c, side);
    for (const f of t.by) { if (busy.has(f) || go.length >= 3) continue; go.push(f); sum += power(c, f); if (sum >= t.def * ATTACK_ODDS * 1.15) break; } // (enough, with a margin: the rest hold the line)
    if (sum < t.def * ATTACK_ODDS) continue;
    for (const f of go) if (!order(c, war, side, f.id, t.n)) { busy.add(f); taken.add(t.n); }
    did.push(`${go.map((f) => f.name).join(' + ')} attack ${t.n} (${(sum / t.def).toFixed(1)}:1)`);
  }
  for (const f of armies) {
    if (busy.has(f)) continue;
    const pw = power(c, f), P = war.provinces[f.at];
    // a landing: every free army in this port together, across a sea zone it holds, onto a weak enemy coast
    if (P.port) {
      const party = armies.filter((x) => x.at === f.at && !busy.has(x)).slice(0, 3), sum = party.reduce((a2, x) => a2 + power(c, x), 0) + reserves(c, side);
      const coasts = Object.keys(war.provinces).filter((k) => c.provinces[k].owner === foe && !taken.has(k) && (war.provinces[k].seas ?? []).length && landingZone(c, war, side, f.at, k))
        .map((k) => ({ k, odds: sum / (defenceAt(c, war, side, k, seen) * 1.3) })).sort((x, y) => y.odds - x.odds);
      if (coasts[0] && coasts[0].odds >= LAND_ODDS) {
        for (const x of party) if (!order(c, war, side, x.id, coasts[0].k, { land: true })) busy.add(x);
        taken.add(coasts[0].k);
        did.push(`${party.map((x) => x.name).join(' + ')} land on ${coasts[0].k} (${coasts[0].odds.toFixed(1)}:1)`);
        continue;
      }
    }
    // not at the front: a step toward it, wherever there is room
    if (!front(f.at)) {
      const steps = P.land.filter((n) => c.provinces[n].owner === side && stepsTo(war, n, front) < stepsTo(war, f.at, front)).sort((x, y) => stepsTo(war, x, front) - stepsTo(war, y, front));
      for (const n of steps) if (!order(c, war, side, f.id, n)) { did.push(`${f.name} → ${n}`); break; }
    }
  }
  // ---- spending: refits first, then a battalion at the depot of the theatre with the most front and the least army
  for (const f of mine.filter((x) => x.kind === 'army')) refit(c, war, f);
  const ok = supplied(c, war, side);
  const depots = Object.keys(war.provinces).filter((id) => c.provinces[id].depot === side && c.provinces[id].owner === side && ok.has(id));
  const need = (d) => {
    const t = war.provinces[d].theatre, ids = Object.keys(war.provinces).filter((id) => war.provinces[id].theatre === t);
    const theirs = c.forces.filter((x) => x.side === foe && x.kind === 'army' && ids.includes(x.at)).reduce((a, x) => a + power(c, x), 0);
    const ours = c.forces.filter((x) => x.side === side && x.kind === 'army' && ids.includes(x.at)).reduce((a, x) => a + power(c, x), 0);
    return theirs - ours;
  };
  for (const d of depots.sort((a, b) => need(b) - need(a))) {
    const army = c.forces.find((x) => x.side === side && x.kind === 'army' && war.provinces[x.at].theatre === war.provinces[d].theatre)?.army ?? c.forces.find((x) => x.side === side && x.kind === 'army')?.army;
    if (!army) continue;
    const r = raise(c, war, side, army, d, need(d) > 1500 ? 'armour' : 'infantry');
    if (r) did.push(`raises a battalion at ${d}`); // (no room or no money here: try the next depot)
  }
  return did;
}
