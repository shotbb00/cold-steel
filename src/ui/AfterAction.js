// The after-action report under the victory / defeat banner: the two sides side by side,
// a chart of front strength over the battle with the moments that mattered marked on it, and
// the stacks that did the most damage; below them the most valuable unit, a map of where each
// side lost its men and vehicles, the key moments in order, and your losses by unit type. Fed by systems/BattleStats.js report() (plain data —
// a multiplayer client gets it from the host and reads it from its own side).
import { FACTIONS, enemyOf } from '../data/factions.js';
import { RANKS } from '../entities/UnitStack.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const ROWS = [
  ['Men lost', 'menLost'],
  ['Vehicles lost', 'vehiclesLost'],
  ['Stacks destroyed', 'stacksLost'],
  ['Enemy killed', 'kills'],
  ['Villages taken', 'captures'],
  ['Reinforcements', 'reinforcements'],
  ['Command points spent', 'cpSpent'],
  ['Rounds fired', 'shots'],
  ['Air strikes', 'airStrikes'],
  ['Helicopters lost', 'helisLost'],
  ['Fortifications built', 'built'],
  ['Mines set off by them', 'minesSetOff'],
];

export function renderReport(report, me) {
  const foe = enemyOf(me);
  const a = report.sides[me];
  const b = report.sides[foe];
  const wrap = document.createElement('div');
  wrap.className = 'aar';
  const table = ROWS.map(([label, key]) => {
    const va = Math.round(a[key] ?? 0);
    const vb = Math.round(b[key] ?? 0);
    return `<tr><td>${va}</td><th>${label}</th><td>${vb}</td></tr>`;
  }).join('');
  const best = (f) => report.stacks.filter((s) => s.faction === f).slice(0, 4).map((s) => `
    <li><b>${esc(s.name)}</b> <span>${esc(s.type)}${s.rank ? ` · ${RANKS[s.rank]?.name}` : ''}${s.alive === false && !s.support ? ' · lost' : ''}</span><em>${s.kills}</em></li>`).join('')
    || '<li class="none">No kills</li>';
  wrap.innerHTML = `
    <div class="aar-head"><span>After-action report</span><span>${clock(report.duration)} of fighting</span></div>
    <div class="aar-grid">
      <table class="aar-table">
        <thead><tr><td class="ally">${esc(FACTIONS[me].name)}</td><th></th><td class="enemy">${esc(FACTIONS[foe].name)}</td></tr></thead>
        <tbody>${table}</tbody>
      </table>
      <div class="aar-right">
        <div class="aar-chart">${chart(report, me, foe)}</div>
        <div class="aar-best">
          <div><h4>Your best</h4><ol>${best(me)}</ol></div>
          <div><h4>Theirs</h4><ol>${best(foe)}</ol></div>
        </div>
      </div>
    </div>
    <div class="aar-lower">
      <div class="aar-map"><h4>Where they fell</h4>${lossMap(report, me, foe)}</div>
      <div class="aar-side">
        ${mvp(report, me)}
        <div class="aar-moments"><h4>Key moments</h4>${moments(report, me)}</div>
        <div class="aar-lost"><h4>Your losses</h4>${lostByType(a)}</div>
      </div>
    </div>`;
  return wrap;
}

/** The player's stack with the most kills. */
function mvp(report, me) {
  const s = report.stacks.find((x) => x.faction === me && !x.support);
  if (!s) return '';
  return `<div class="aar-mvp"><span>Most valuable</span><b>${esc(s.name)}</b><em>${esc(s.type)}${s.rank ? ` · ${RANKS[s.rank]?.name}` : ''} · ${s.kills} kill${s.kills === 1 ? '' : 's'}${s.alive === false ? ' · lost' : ''}</em></div>`;
}

/** The moments that mattered, in order, with the time. */
function moments(report, me) {
  const ev = report.events ?? [];
  if (!ev.length) return '<p class="aar-empty">A quiet battle.</p>';
  return `<ol>${ev.slice(-14).map((e) => `<li class="${e.faction === me ? 'ally' : e.faction ? 'enemy' : ''}"><time>${clock(e.t)}</time>${esc(e.text)}</li>`).join('')}</ol>`;
}

/** Men and vehicles lost, by unit type, most first. */
function lostByType(side) {
  const rows = Object.entries(side.lostByType ?? {}).sort((x, y) => y[1] - x[1]);
  if (!rows.length) return '<p class="aar-empty">None.</p>';
  return `<ul>${rows.map(([t, n]) => `<li><span>${esc(t)}</span><b>${n}</b></li>`).join('')}</ul>`;
}

/**
 * The battlefield from above, your side at the bottom: control points and their last owner,
 * a dot for every man lost and a square for every vehicle, in each side's colour.
 */
function lossMap(report, me, foe) {
  const B = report.bounds;
  const L = report.losses ?? [];
  if (!B || !L.length) return '<p class="aar-empty">No losses to show.</p>';
  const W = 300;
  const H = Math.round(W * Math.min(1.6, Math.max(0.6, B.z / B.x)));
  const flip = (report.baseZ?.[me] ?? 1) < 0;            // put the player's base at the bottom
  const x = (v) => ((v + B.x) / (2 * B.x)) * W;
  const y = (v) => (((flip ? -v : v) + B.z) / (2 * B.z)) * H;
  const colour = { [me]: 'var(--ally)', [foe]: 'var(--enemy)' };
  const pts = (report.points ?? []).map((p) => `<g><circle cx="${x(p.x).toFixed(1)}" cy="${y(p.z).toFixed(1)}" r="6" class="aar-point" stroke="${p.owner ? colour[p.owner] : 'var(--muted)'}"/><title>${esc(p.name)}</title></g>`).join('');
  const dots = L.map((d) => d.v
    ? `<rect x="${(x(d.x) - 3).toFixed(1)}" y="${(y(d.z) - 3).toFixed(1)}" width="6" height="6" fill="${colour[d.f]}" class="aar-veh"/>`
    : `<circle cx="${x(d.x).toFixed(1)}" cy="${y(d.z).toFixed(1)}" r="2.4" fill="${colour[d.f]}" class="aar-man"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Map of losses: dots are men, squares vehicles">
      <rect width="${W}" height="${H}" class="aar-field"/>${pts}${dots}
    </svg><p class="aar-legend"><i class="m"></i> man <i class="v"></i> vehicle <i class="p"></i> control point · your side at the bottom</p>`;
}

/** Front strength over time (SVG), with the battle's moments as ticks along the bottom. */
function chart(report, me, foe) {
  const pts = report.timeline;
  if (pts.length < 2) return '<p class="aar-empty">Too short a battle for a chart.</p>';
  const W = 460;
  const H = 150;
  const T = Math.max(1, pts[pts.length - 1].t);
  const max = Math.max(report.maxStrength ?? 0, ...pts.map((p) => Math.max(p.strength[me], p.strength[foe])), 1);
  const x = (t) => (t / T) * W;
  const y = (v) => H - 18 - (Math.max(0, v) / max) * (H - 30);
  const line = (f) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.strength[f]).toFixed(1)}`).join('');
  const colour = { [me]: 'var(--ally)', [foe]: 'var(--enemy)' };
  const marks = report.events.map((e) => {
    const c = e.faction ? colour[e.faction] : 'var(--muted)';
    return `<line x1="${x(e.t).toFixed(1)}" x2="${x(e.t).toFixed(1)}" y1="${H - 14}" y2="${H - 4}" stroke="${c}" stroke-width="2"><title>${clock(e.t)} ${esc(e.text)}</title></line>`;
  }).join('');
  const label = report.maxStrength ? 'Front strength' : 'Strength in the field';
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label} over the battle">
      <text x="0" y="10" class="aar-axis">${label}</text>
      <line x1="0" x2="${W}" y1="${H - 18}" y2="${H - 18}" class="aar-base"/>
      <path d="${line(foe)}" fill="none" stroke="${colour[foe]}" stroke-width="2"/>
      <path d="${line(me)}" fill="none" stroke="${colour[me]}" stroke-width="2.5"/>
      ${marks}
      <text x="${W}" y="${H}" text-anchor="end" class="aar-axis">${clock(T)}</text>
    </svg>`;
}

