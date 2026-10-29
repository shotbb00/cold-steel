// The Campaign tab of the main menu (campaign/Campaign.js): start a campaign as either side;
// then the strategic map (three columns, six sectors deep, your rear at the bottom; the battles
// fought so far marked where they were, an arrow on the coming one), the briefing for the coming
// battle (or, on your turns, a choice of where to attack) with the war's latest event and what
// intel knows of the enemy, the battalion with its men, wounded and ranks — refill squads and
// recruit with replacement points — and the war so far.
import { FACTIONS, enemyOf } from '../data/factions.js';
import { UNIT_TYPES } from '../data/units/index.js';
import { MAPS } from '../maps/index.js';
import { TIMES, WEATHER } from '../core/Conditions.js';
import { RANKS } from '../entities/UnitStack.js';
import {
  loadCampaign, newCampaign, clearCampaign, saveCampaign, planBattle, battleChoice, sector, held,
  refill, refillCost, recruit, intel, EVENTS, COLUMNS, ROWS, TURNS, MAX_BATTALION,
} from '../campaign/Campaign.js';

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const btn = (label, cls, fn) => {
  const b = el('button', cls, label);
  b.type = 'button';
  b.addEventListener('click', fn);
  return b;
};

export class CampaignPanel {
  /** `onPreview(mapId, side)`: the map the coming battle is fought on, for the menu's map table. */
  constructor({ onBattle, onPreview = () => {} }) {
    this.onBattle = onBattle;
    this.onPreview = onPreview;
    this.root = el('div', 'campaign');
    this.side = 'nato';
    this.render();
  }

  render() {
    const r = this.root;
    r.replaceChildren(el('h2', '', 'Campaign'));
    const c = loadCampaign();
    if (!c) {
      this.renderNew();
      return this.onPreview('fulda-gap', this.side);
    }
    this.onPreview(c.next && !c.next.choose ? c.next.map : 'fulda-gap', c.side);
    this.c = c;
    const me = c.side;
    r.append(el('p', 'mp-lead', `${esc(FACTIONS[me].name)} · turn ${Math.min(c.turn, TURNS)} of ${TURNS} · we hold ${held(c, me)} of ${COLUMNS.length * ROWS} sectors · <b>${c.points}</b> replacement points`));
    const grid = el('div', 'cp-grid');
    grid.append(this.mapView(c));
    const right = el('div', 'cp-right');
    right.append(this.battleCard(c));
    grid.append(right);
    r.append(grid);
    r.append(this.battalionView(c));
    if (c.letter) r.append(this.letterView(c.letter));
    const log = el('div', 'cp-log');
    log.append(el('h3', 'menu-sub', 'The war so far'));
    for (const line of c.log.slice(0, 8)) log.append(el('p', '', esc(line)));
    r.append(log);
    const end = el('div', 'deploy-row');
    end.append(btn('Abandon campaign', 'mp-btn', () => {
      if (!this.confirming) { this.confirming = true; end.firstChild.textContent = 'Click again to abandon'; return; }
      clearCampaign();
      this.confirming = false;
      this.render();
    }));
    r.append(end);
  }

  /** The latest letter home (campaign/Letters.js), on a sheet of field-post paper. */
  letterView(l) {
    const box = el('div', 'cp-letter');
    box.append(el('h3', 'menu-sub', 'A letter home'));
    const paper = el('div', 'cp-paper');
    paper.append(el('p', 'cp-greet', esc(l.greet)));
    for (const line of l.body) paper.append(el('p', '', esc(line)));
    paper.append(el('p', 'cp-sign', `${esc(l.sign)}<br>${esc(l.from)}${l.unit ? `, ${esc(l.unit)}` : ''}`));
    box.append(paper);
    return box;
  }

  renderNew() {
    const r = this.root;
    r.append(el('p', 'mp-lead', 'A war of up to twelve battles on the Fulda front. One battalion fights them all — its men and its veterans carry over, and so do its losses. Win battles to push the front; lose them and it comes back at you.'));
    r.append(el('h3', 'menu-sub', 'Your side'));
    const sides = el('div', 'cards sides');
    for (const f of ['nato', 'pact']) {
      const text = f === 'nato' ? 'Hold the Fulda Gap with a mechanised battalion, then throw them back.' : 'A Guards motor rifle battalion: break the NATO line and drive for Fulda.';
      const card = btn(`<b>${FACTIONS[f].name}</b><span>${text}</span>`, `card ${f}${this.side === f ? ' on' : ''}`, () => {
        this.side = f;
        for (const o of sides.children) o.classList.toggle('on', o === card);
        this.onPreview('fulda-gap', f);
      });
      sides.append(card);
    }
    r.append(sides);
    const row = el('div', 'deploy-row');
    row.append(btn('Start campaign', 'deploy', () => { newCampaign(this.side); this.render(); }));
    r.append(row);
  }

  /** Strategic map: columns × sectors, our rear at the bottom, the front between the colours. */
  mapView(c) {
    const me = c.side;
    const W = 420;
    const H = 360;
    const cw = W / COLUMNS.length;
    const rh = H / ROWS;
    const rowY = (row) => (me === 'nato' ? H - (row + 1) * rh : row * rh); // our rear at the bottom
    const b = c.next;
    let cells = '';
    COLUMNS.forEach((col, i) => {
      for (let row = 0; row < ROWS; row++) {
        const s = sector(c, col, row);
        const ours = s.owner === me;
        const target = b && !b.choose && b.col === col && b.row === row;
        const pick = b?.choose && !ours && ((me === 'nato' && row === c.front[col]) || (me === 'pact' && row === c.front[col] - 1));
        const x = i * cw;
        const y = rowY(row);
        cells += `<g class="cp-sector${ours ? ' ours' : ' theirs'}${target ? ' target' : ''}${pick ? ' pick' : ''}${s.river ? ' river' : ''}" data-col="${col}" data-row="${row}">
          <rect x="${x + 2}" y="${y + 2}" width="${cw - 4}" height="${rh - 4}" rx="2"/>
          <text x="${x + cw / 2}" y="${y + rh / 2 + 4}" text-anchor="middle">${esc(s.name)}</text></g>`;
      }
    });
    // the front line, over everything: one step per column
    COLUMNS.forEach((col, i) => {
      const fy = me === 'nato' ? H - c.front[col] * rh : c.front[col] * rh;
      cells += `<line class="cp-front" x1="${i * cw}" x2="${(i + 1) * cw}" y1="${fy}" y2="${fy}"/>`;
    });
    // battles fought: a mark in the sector's corner, ours won or lost (the latest on top)
    const seen = new Set();
    for (const h of [...(c.history ?? [])].reverse()) {
      const k = `${h.col}:${h.row}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const x = COLUMNS.indexOf(h.col) * cw + cw - 14;
      const y = rowY(h.row) + 14;
      cells += `<g class="cp-mark ${h.won ? 'won' : 'lost'}"><title>Turn ${h.turn}: ${h.won ? 'won' : 'lost'}</title><circle cx="${x}" cy="${y}" r="7"/><path d="M${x - 3.5} ${y - 3.5}L${x + 3.5} ${y + 3.5}M${x + 3.5} ${y - 3.5}L${x - 3.5} ${y + 3.5}"/></g>`;
    }
    // the coming battle: an arrow from the attacker's side across the front into the target
    if (b && !b.choose) {
      const x = COLUMNS.indexOf(b.col) * cw + cw / 2;
      const fromUs = b.attacker === me;   // we attack upward (our rear is at the bottom)
      const fy = me === 'nato' ? H - c.front[b.col] * rh : c.front[b.col] * rh;
      const dir = fromUs ? -1 : 1;
      const y0 = fy - dir * rh * 0.45;
      const y1 = fy + dir * rh * 0.3;
      cells += `<g class="cp-arrow ${fromUs ? 'ours' : 'theirs'}"><path d="M${x} ${y0}L${x} ${y1}"/><path class="head" d="M${x - 9} ${y1 - dir * 9}L${x} ${y1 + dir * 3}L${x + 9} ${y1 - dir * 9}"/></g>`;
    }
    const wrap = el('div', 'cp-map');
    wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Strategic map">${cells}</svg>
      <div class="cp-legend"><span class="ours">${esc(FACTIONS[me].name)}</span><span class="theirs">${esc(FACTIONS[enemyOf(me)].name)}</span><span class="river">Werra crossing</span></div>`;
    wrap.querySelectorAll('.cp-sector.pick').forEach((g) => {
      g.addEventListener('click', () => {
        c.next = planBattle(c, g.dataset.col);
        saveCampaign(c);
        this.render();
      });
    });
    return wrap;
  }

  battleCard(c) {
    const card = el('div', 'cp-battle');
    if (c.over) {
      card.append(el('h3', '', c.over.won ? 'Victory' : 'Defeat'), el('p', '', esc(c.over.text)));
      card.append(btn('New campaign', 'deploy', () => { clearCampaign(); this.render(); }));
      return card;
    }
    const b = c.next;
    if (b.choose) {
      card.append(el('h3', '', 'Your move'), el('p', '', 'Pick the sector to attack — one of the enemy\'s front sectors, highlighted on the map.'));
      return card;
    }
    const enemyAttacks = b.attacker !== c.side;
    card.append(el('span', 'cp-kicker', enemyAttacks ? 'Enemy attack' : 'Our attack'));
    card.append(el('h3', '', `${esc(b.name)} <small>${b.col}</small>`));
    card.append(el('p', '', `${esc(MAPS[b.map]?.name ?? b.map)} · ${TIMES[b.time].name} · ${WEATHER[b.weather].name}`));
    card.append(el('p', 'cp-hint', enemyAttacks
      ? 'They come at us here. You have two minutes to dig in before the assault — hold every line, or hold until the clock runs out.'
      : 'We go in here. Take their lines one after another before time runs out.'));
    const ev = EVENTS[b.event];
    if (ev?.text) card.append(el('p', `cp-event ${b.event}`, esc(ev.text)));
    const { scouted, rows } = intel(c, b);
    const box = el('div', 'cp-intel');
    box.append(el('span', 'cp-kicker', scouted ? 'Intel · scouted' : 'Intel · estimate'));
    const dl = el('dl');
    for (const [k, v] of rows) dl.append(el('dt', '', esc(k)), el('dd', '', esc(v)));
    box.append(dl);
    if (!scouted) box.append(el('p', 'cp-hint', 'Scouts or a recon vehicle in the battalion would give us numbers.'));
    card.append(box);
    const go = btn('Fight', 'deploy', () => this.onBattle(battleChoice(c)));
    go.disabled = !c.battalion.length;
    card.append(go);
    return card;
  }

  battalionView(c) {
    const box = el('div', 'cp-battalion');
    box.append(el('h3', 'menu-sub', `Battalion · ${c.battalion.length} / ${MAX_BATTALION} stacks`));
    const list = el('div', 'cp-units');
    for (const u of c.battalion) {
      const T = UNIT_TYPES[u.type];
      const row = el('div', 'cp-unit');
      const rank = u.rank ? `<span class="cp-rank" title="${RANKS[u.rank]?.name}">${'★'.repeat(u.rank)}</span>` : '';
      const hurt = u.wounded ? ` <i title="Wounded, back after the next battle">+${u.wounded}</i>` : '';
      row.append(el('span', 'cp-name', `${rank}${esc(u.name)}`), el('span', 'cp-men', `${u.men} / ${T.formation.count}${hurt}`));
      const cost = refillCost(u);
      const b = btn(cost ? `Refill ${cost}` : 'Full', 'mp-btn', () => { if (refill(c, u.cid)) this.render(); });
      b.disabled = !cost || cost > c.points;
      row.append(b);
      list.append(row);
    }
    box.append(list);
    box.append(el('h3', 'menu-sub', 'Recruit'));
    const rec = el('div', 'cp-recruit');
    for (const T of Object.values(UNIT_TYPES).filter((t) => !t.hidden && !t.airOnly && !t.needsRiver)) {
      const b = btn(`${T.shortName}<small>${T.cost}</small>`, 'mp-btn', () => { if (recruit(c, T.id)) this.render(); });
      b.disabled = T.cost > c.points || c.battalion.length >= MAX_BATTALION;
      rec.append(b);
    }
    box.append(rec);
    return box;
  }
}
