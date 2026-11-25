// The after-action report under the victory / defeat banner, read top to bottom:
//   • the headline: losses on both sides, the exchange (kills for each loss), objectives held, time
//   • the two sides compared row by row — a bar for each side growing out from the middle — only the
//     rows that happened in this battle, worded for its era and for the sea (guns in 1806, ships at sea)
//   • front strength over the battle with the moments that mattered marked on it
//   • where each side lost its men, guns, vehicles and ships; the key moments in order
//   • the most valuable unit, the best of each side, and your losses by type
// Fed by systems/BattleStats.js report() (plain data — a multiplayer guest gets it from the host and
// reads it from its own side). Older reports without the battle's era read as 1985 on land.
import { FACTIONS, enemyOf } from '../data/factions.js';
import { RANKS } from '../entities/UnitStack.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;
const num = (v) => Math.round(v ?? 0).toLocaleString('en');

/**
 * The rows comparing the sides: [label, key, always]. A row that isn't `always` shows only when it
 * happened to either side — no air strikes in 1806, no ships lost ashore, no mines where none were laid.
 */
function rows(r) {
  const old = r.epoch === '1806';
  return [
    [old ? 'Men and riders lost' : 'Men lost', 'menLost', !r.sea],
    ['Ships lost', 'shipsLost', r.sea],
    ['Guns lost', 'gunsLost'],
    [old ? 'Wagons lost' : 'Vehicles lost', 'vehiclesLost'],
    ['Units destroyed', 'stacksLost', true],
    ['Enemy killed', 'kills', true],
    ['Objectives taken', 'captures'],
    ['Reinforcements', 'reinforcements'],
    ['Command points spent', 'cpSpent', true],
    [old ? 'Shots fired' : 'Rounds fired', 'shots', true],
    ['Air strikes', 'airStrikes'],
    ['Helicopters lost', 'helisLost'],
    ['Fortifications built', 'built'],
    ['Mines set off by them', 'minesSetOff'],
  ];
}

export function renderReport(report, me) {
  const foe = enemyOf(me);
  const a = report.sides[me];
  const b = report.sides[foe];
  const wrap = document.createElement('div');
  wrap.className = 'aar';
  const where = [report.map, report.epoch, report.mode].filter(Boolean).map(esc).join(' · ');
  wrap.innerHTML = `
    <div class="aar-head"><span>After-action report</span>${where ? `<span class="aar-where">${where}</span>` : ''}<span>${clock(report.duration)} of fighting</span></div>
    ${tiles(report, me, foe)}
    <div class="aar-grid">
      <section class="aar-vs" aria-label="The two sides compared">
        <div class="aar-sides"><span class="ally">${esc(FACTIONS[me].name)}</span><span class="enemy">${esc(FACTIONS[foe].name)}</span></div>
        ${versus(report, a, b)}
      </section>
      <div class="aar-units">
        <section class="aar-chart">${chart(report, me, foe)}</section>
        ${mvp(report, me)}
        <div class="aar-best">
          <section><h4>Your best</h4>${best(report, me)}</section>
          <section><h4>Their best</h4>${best(report, foe)}</section>
        </div>
      </div>
    </div>
    <div class="aar-lower">
      <section class="aar-map"><h4>Where they fell</h4>${lossMap(report, me, foe)}</section>
      <section class="aar-moments"><h4>Key moments</h4>${moments(report, me)}</section>
      <section class="aar-lost"><h4>Your losses by type</h4>${lostByType(a)}</section>
    </div>`;
  return wrap;
}

/** The headline: what each side lost, the exchange, objectives held at the end, how long it went on. */
function tiles(r, me, foe) {
  const a = r.sides[me];
  const b = r.sides[foe];
  const key = r.sea ? 'shipsLost' : 'menLost';
  const extra = (s) => { // the rest of what a side lost, under its number
    const parts = [];
    const n = (v, one) => `${num(v)} ${one}${Math.round(v) === 1 ? '' : 's'}`;
    if (!r.sea && s.shipsLost) parts.push(n(s.shipsLost, 'ship'));
    if (s.gunsLost) parts.push(n(s.gunsLost, 'gun'));
    if (s.vehiclesLost) parts.push(n(s.vehiclesLost, r.epoch === '1806' ? 'wagon' : 'vehicle'));
    if (r.sea && s.menLost) parts.push(n(s.menLost, 'man').replace(/mans$/, 'men'));
    return parts.length ? `+ ${parts.join(', ')}` : '';
  };
  // the exchange: enemies killed for each of yours lost
  const ka = a.kills ?? 0;
  const kb = b.kills ?? 0;
  const ratio = !ka && !kb ? '—' : !kb ? `${ka} : 0` : ka >= kb ? `${(ka / kb).toFixed(1)} : 1` : `1 : ${(kb / Math.max(1, ka)).toFixed(1)}`;
  const tone = ka > kb ? 'ally' : ka < kb ? 'enemy' : '';
  const pts = r.points ?? [];
  const held = pts.filter((p) => p.owner === me).length;
  const theirs = pts.filter((p) => p.owner === foe).length;
  return `<div class="aar-tiles">
      <div class="aar-tile aar-loss"><span>${r.sea ? 'Ships lost' : 'Men lost'}</span><div class="aar-pair"><b class="ally">${num(a[key])}</b><i>vs</i><b class="enemy">${num(b[key])}</b></div><div class="aar-pair aar-sub"><small>${extra(a)}</small><small>${extra(b)}</small></div></div>
      <div class="aar-tile"><span>Exchange</span><b class="${tone}">${ratio}</b><small>enemies killed for each of yours</small></div>
      ${pts.length ? `<div class="aar-tile"><span>Objectives at the end</span><b class="${held > theirs ? 'ally' : held < theirs ? 'enemy' : ''}">${held} <i>of</i> ${pts.length}</b><small>${theirs} theirs${pts.length - held - theirs ? `, ${pts.length - held - theirs} open` : ''}</small></div>` : ''}
      <div class="aar-tile"><span>Fighting</span><b>${clock(r.duration)}</b><small>${num((a.shots ?? 0) + (b.shots ?? 0))} ${r.epoch === '1806' ? 'shots' : 'rounds'} fired</small></div>
    </div>`;
}

/** Row by row: your number, the label, theirs, and a bar for each side out from the middle. */
function versus(r, a, b) {
  return rows(r).map(([label, key, always]) => {
    const va = Math.round(a[key] ?? 0);
    const vb = Math.round(b[key] ?? 0);
    if (!always && !va && !vb) return '';
    const max = Math.max(va, vb, 1);
    return `<div class="vs-row"><b class="a">${num(va)}</b><span>${label}</span><b class="b">${num(vb)}</b>
      <div class="vs-bar"><i class="a" style="width:${((va / max) * 100).toFixed(1)}%"></i><i class="b" style="width:${((vb / max) * 100).toFixed(1)}%"></i></div></div>`;
  }).join('');
}

/** The player's unit with the most kills. */
function mvp(r, me) {
  const s = r.stacks.find((x) => x.faction === me && !x.support);
  if (!s) return '';
  return `<div class="aar-mvp"><span>Most valuable</span><b>${esc(s.name)}</b><em>${esc(s.type)}${s.rank ? ` · ${RANKS[s.rank]?.name}` : ''} · ${s.kills} kill${s.kills === 1 ? '' : 's'}${s.alive === false ? ' · lost' : ''}</em></div>`;
}

/** A side's best four, each with a bar of its kills against the best of the battle. */
function best(r, f) {
  const list = r.stacks.filter((s) => s.faction === f).slice(0, 4);
  if (!list.length) return '<p class="aar-empty">No kills.</p>';
  const top = Math.max(1, ...r.stacks.map((s) => s.kills));
  return `<ol>${list.map((s) => `
    <li><div><b>${esc(s.name)}</b><span>${esc(s.type)}${s.rank ? ` · ${RANKS[s.rank]?.name}` : ''}${s.alive === false && !s.support ? ' · lost' : ''}</span></div><em>${s.kills}</em>
      <i class="kbar ${f}" style="width:${((s.kills / top) * 100).toFixed(1)}%"></i></li>`).join('')}</ol>`;
}

/** The moments that mattered, in order, with the time. */
function moments(r, me) {
  const ev = r.events ?? [];
  if (!ev.length) return '<p class="aar-empty">A quiet battle.</p>';
  return `<ol>${ev.slice(-16).map((e) => `<li class="${e.faction === me ? 'ally' : e.faction ? 'enemy' : ''}"><time>${clock(e.t)}</time><span>${esc(e.text)}</span></li>`).join('')}</ol>`;
}

/** Men, guns, vehicles and ships lost, by unit type, most first, as bars. */
function lostByType(side) {
  const list = Object.entries(side.lostByType ?? {}).sort((x, y) => y[1] - x[1]).slice(0, 8);
  if (!list.length) return '<p class="aar-empty">None.</p>';
  const top = list[0][1];
  return `<ul>${list.map(([t, n]) => `<li><span>${esc(t)}</span><b>${n}</b><i style="width:${((n / top) * 100).toFixed(1)}%"></i></li>`).join('')}</ul>`;
}

/**
 * The battlefield from above, your side at the bottom: objectives and their last owner, a dot for
 * every man lost, a square for a gun or vehicle, a diamond for a ship, in each side's colour.
 */
function lossMap(r, me, foe) {
  const B = r.bounds;
  const L = r.losses ?? [];
  if (!B || !L.length) return '<p class="aar-empty">No losses to show.</p>';
  const W = 300;
  const H = Math.round(W * Math.min(1.6, Math.max(0.6, B.z / B.x)));
  const flip = (r.baseZ?.[me] ?? 1) < 0;            // put the player's base at the bottom: turned round (both axes, as the minimap), never mirrored
  const x = (v) => (((flip ? -v : v) + B.x) / (2 * B.x)) * W;
  const y = (v) => (((flip ? -v : v) + B.z) / (2 * B.z)) * H;
  const colour = { [me]: 'var(--ally)', [foe]: 'var(--enemy)' };
  const pts = (r.points ?? []).map((p) => `<g><circle cx="${x(p.x).toFixed(1)}" cy="${y(p.z).toFixed(1)}" r="6" class="aar-point" stroke="${p.owner ? colour[p.owner] : 'var(--muted)'}"/><title>${esc(p.name)}</title></g>`).join('');
  const dots = L.map((d) => {
    const cx = x(d.x).toFixed(1), cy = y(d.z).toFixed(1);
    if (d.v === 2) return `<rect x="${cx - 4}" y="${cy - 4}" width="8" height="8" transform="rotate(45 ${cx} ${cy})" fill="${colour[d.f]}" class="aar-veh"/>`;
    if (d.v) return `<rect x="${(cx - 3).toFixed(1)}" y="${(cy - 3).toFixed(1)}" width="6" height="6" fill="${colour[d.f]}" class="aar-veh"/>`;
    return `<circle cx="${cx}" cy="${cy}" r="2.4" fill="${colour[d.f]}" class="aar-man"/>`;
  }).join('');
  const kinds = new Set(L.map((d) => d.v));
  const legend = [kinds.has(0) && '<i class="m"></i> man', kinds.has(1) && `<i class="v"></i> ${r.epoch === '1806' ? 'gun' : 'vehicle'}`, kinds.has(2) && '<i class="s"></i> ship', pts && '<i class="p"></i> objective'].filter(Boolean).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Map of losses">
      <rect width="${W}" height="${H}" class="aar-field"/>${pts}${dots}
    </svg><p class="aar-legend">${legend} · your side at the bottom</p>`;
}

/** Front strength over time: both sides' lines with a soft fill, time marks, the moments as ticks. */
function chart(r, me, foe) {
  const pts = r.timeline;
  if (pts.length < 2) return '<p class="aar-empty">Too short a battle for a chart.</p>';
  const W = 460;
  const H = 170;
  const T = Math.max(1, pts[pts.length - 1].t);
  const max = Math.max(r.maxStrength ?? 0, ...pts.map((p) => Math.max(p.strength[me], p.strength[foe])), 1);
  const base = H - 30;
  const x = (t) => (t / T) * W;
  const y = (v) => base - (Math.max(0, v) / max) * (base - 16);
  const line = (f) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.strength[f]).toFixed(1)}`).join('');
  const area = (f) => `${line(f)}L${x(pts[pts.length - 1].t).toFixed(1)},${base}L0,${base}Z`;
  const colour = { [me]: 'var(--ally)', [foe]: 'var(--enemy)' };
  const marks = (r.events ?? []).map((e) => {
    const c = e.faction ? colour[e.faction] : 'var(--muted)';
    return `<line x1="${x(e.t).toFixed(1)}" x2="${x(e.t).toFixed(1)}" y1="${base + 4}" y2="${base + 13}" stroke="${c}" stroke-width="2"><title>${clock(e.t)} ${esc(e.text)}</title></line>`;
  }).join('');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => `<text x="${(k * W).toFixed(1)}" y="${H - 2}" text-anchor="${k === 0 ? 'start' : k === 1 ? 'end' : 'middle'}" class="aar-axis">${clock(k * T)}</text>`).join('');
  const label = r.maxStrength ? 'Front strength' : 'Strength in the field';
  return `<h4>${label} <span class="aar-key"><i class="ally"></i>${esc(FACTIONS[me].name)} <i class="enemy"></i>${esc(FACTIONS[foe].name)}</span></h4>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label} over the battle">
      ${[0.25, 0.5, 0.75].map((k) => `<line x1="0" x2="${W}" y1="${y(max * k).toFixed(1)}" y2="${y(max * k).toFixed(1)}" class="aar-grid-line"/>`).join('')}
      <line x1="0" x2="${W}" y1="${base}" y2="${base}" class="aar-base"/>
      <path d="${area(foe)}" fill="${colour[foe]}" opacity="0.1"/>
      <path d="${area(me)}" fill="${colour[me]}" opacity="0.14"/>
      <path d="${line(foe)}" fill="none" stroke="${colour[foe]}" stroke-width="2"/>
      <path d="${line(me)}" fill="none" stroke="${colour[me]}" stroke-width="2.5"/>
      ${marks}${ticks}
    </svg>
    <p class="aar-legend">Ticks under the line: the key moments (hover for what happened)</p>`;
}
