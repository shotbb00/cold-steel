// The Campaign tab of the main menu (campaign/Campaign.js). A new war: side, army and length.
// Then the road map — sectors coloured by who holds them, depots ringed, objectives marked, your
// battalions numbered on their sectors, the enemy battalions you know of, the moves you've
// ordered as arrows and the battles still to fight. Select a battalion (on the map or in the
// orders list), click a sector next to it to move or attack, its own sector to hold; End turn.
// With battles queued, the card briefs the first one: Fight it, or resolve it by the numbers.
// Below: each battalion's stacks (refill, recruit), the latest letter home, the war so far.
import { FACTIONS, ARMIES, DEFAULT_ARMY, enemyOf } from '../data/factions.js';
import { UNIT_TYPES } from '../data/units/index.js';
import { MAPS } from '../maps/index.js';
import { TIMES, WEATHER } from '../core/Conditions.js';
import { RANKS } from '../entities/UnitStack.js';
import { unitCost } from '../data/doctrine.js';
import { armiesPicker } from './MainMenu.js';
import { epoch } from '../data/epoch.js';
import {
  loadCampaign, newCampaign, clearCampaign, battleChoice, orderMove, endTurn, autoResolve, sides, intel, sighted,
  refill, refillCost, recruit, recruitable, sectorsOf, neighbours, hour, day, power, supplied, cutLevel,
  SECTORS, ROADS, EVENTS, TIMETABLE, MAX_STACKS,
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
const ww2 = () => epoch() === '1945';
const LENGTHS = () => ({ endless: ['Endless', 'Until one side has no battalions left.'], timetable: ['Eight days', ww2()
  ? 'The Allies must take Eisenach and Meiningen in 16 turns; the Germans hold them, or win back Fulda and Bad Hersfeld.'
  : 'The Pact must take Fulda and Bad Hersfeld in 16 turns; NATO holds them, or takes Eisenach.'] });
/** What each side's war is, on the side cards. */
const SIDE_TEXT = () => (ww2()
  ? { nato: 'April 1945: across the Fulda and east into Thuringia — take Eisenach and Meiningen.', pact: 'Hold the hills before Eisenach and Meiningen, and throw the Allies back over the Fulda.' }
  : { nato: 'Hold the border, keep Fulda and Bad Hersfeld, then throw them back.', pact: 'Break the NATO line and drive for Fulda and Bad Hersfeld.' });

export class CampaignPanel {
  /** `onPreview(mapId, side)`: the map the coming battle is fought on, for the menu's map table. */
  constructor({ onBattle, onPreview = () => {} }) {
    this.onBattle = onBattle;
    this.onPreview = onPreview;
    this.root = el('div', 'campaign');
    this.choice = { side: 'nato', armies: { ...DEFAULT_ARMY }, length: 'endless' };
    this.sel = null;
    this.render();
  }

  render() {
    const r = this.root;
    r.replaceChildren(el('h2', '', 'Campaign'));
    const c = loadCampaign();
    if (!c) {
      this.renderNew();
      return this.onPreview('fulda-gap', this.choice.side);
    }
    this.c = c;
    if (!c.battalions.some((b) => b.id === this.sel)) this.sel = c.battalions[0]?.id ?? null;
    this.onPreview(c.battles[0]?.map ?? 'fulda-gap', c.side);
    const me = c.side;
    const army = ARMIES[c.armies[me]]?.name ?? FACTIONS[me].name;
    r.append(el('p', 'mp-lead', `${esc(army)} · day ${day(c)}, ${esc(TIMES[hour(c)]?.name.toLowerCase() ?? hour(c))} · turn ${c.turn}${c.length === 'timetable' ? ` of ${TIMETABLE}` : ''} · we hold ${sectorsOf(c, me).length} of ${Object.keys(SECTORS).length} sectors · <b>${c.points}</b> replacement points`));
    const grid = el('div', 'cp-grid');
    grid.append(this.mapView(c));
    const right = el('div', 'cp-right');
    right.append(c.over ? this.overCard(c) : c.battles.length ? this.battleCard(c) : this.ordersCard(c));
    grid.append(right);
    r.append(grid);
    if (!c.over) r.append(this.battalionView(c));
    if (c.letter) r.append(this.letterView(c.letter));
    const log = el('div', 'cp-log');
    log.append(el('h3', 'menu-sub', 'The war so far'));
    for (const line of c.log.slice(0, 10)) log.append(el('p', '', esc(line)));
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

  renderNew() {
    const r = this.root;
    const ch = this.choice;
    r.append(el('p', 'mp-lead', 'A war on the road map of East Hesse and West Thuringia. You command a brigade of three battalions: move them sector by sector, and every attack is a battle. Their men, their wounded and their veterans carry over from battle to battle.'));
    r.append(el('h3', 'menu-sub', 'Your side'));
    const sideCards = el('div', 'cards sides');
    for (const f of ['nato', 'pact']) {
      const text = SIDE_TEXT()[f];
      const card = btn(`<b>${FACTIONS[f].name}</b><span>${text}</span>`, `card ${f}${ch.side === f ? ' on' : ''}`, () => {
        ch.side = f;
        for (const o of sideCards.children) o.classList.toggle('on', o === card);
        this.onPreview('fulda-gap', f);
      });
      sideCards.append(card);
    }
    r.append(sideCards, armiesPicker(ch));
    r.append(el('h3', 'menu-sub', 'How long'));
    const seg = el('div', 'seg cp-length');
    const note = el('p', 'cp-hint', esc(LENGTHS()[ch.length][1]));
    for (const [id, [name, text]] of Object.entries(LENGTHS())) {
      const b = btn(name, ch.length === id ? 'on' : '', () => {
        ch.length = id;
        for (const o of seg.children) o.classList.toggle('on', o === b);
        note.textContent = text;
      });
      seg.append(b);
    }
    r.append(seg, note);
    const row = el('div', 'deploy-row');
    row.append(btn('Start campaign', 'deploy', () => { newCampaign(ch); this.sel = null; this.render(); }));
    r.append(row);
  }

  /** The road map: sectors, roads, our battalions numbered, the enemy's we know of, orders, battles. */
  mapView(c) {
    const me = c.side;
    const sel = c.battalions.find((b) => b.id === this.sel);
    const canOrder = !c.over && !c.battles.length && sel;
    const reach = new Set(canOrder ? [sel.at, ...neighbours(sel.at)] : []);
    const battleAt = new Set(c.battles.map((b) => b.sector));
    let svg = ROADS.map(([a, b]) => `<line class="cp-road" x1="${SECTORS[a].x}" y1="${SECTORS[a].y}" x2="${SECTORS[b].x}" y2="${SECTORS[b].y}"/>`).join('');
    // the moves ordered: an arrow from the battalion's sector most of the way to the target
    for (const b of c.battalions) {
      if (!b.order) continue;
      const A = SECTORS[b.at], B = SECTORS[b.order];
      const k = 0.78;
      const x = A.x + (B.x - A.x) * k, y = A.y + (B.y - A.y) * k;
      const ang = Math.atan2(B.y - A.y, B.x - A.x);
      const h = (d, s) => `${x - Math.cos(ang + s) * d},${y - Math.sin(ang + s) * d}`;
      svg += `<g class="cp-order${c.owner[b.order] === me ? '' : ' attack'}"><line x1="${A.x}" y1="${A.y}" x2="${x}" y2="${y}"/><path d="M${h(11, 0.5)}L${x},${y}L${h(11, -0.5)}"/></g>`;
    }
    const known = sighted(c);
    const sup = { nato: supplied(c, 'nato'), pact: supplied(c, 'pact') };
    for (const [id, s] of Object.entries(SECTORS)) {
      const ours = c.owner[id] === me;
      const cls = ['cp-sec', ours ? 'ours' : 'theirs', s.depot ? 'depot' : '', reach.has(id) ? 'reach' : '', battleAt.has(id) ? 'battle' : '', sel?.at === id ? 'here' : '', sup[c.owner[id]].has(id) ? '' : 'cut'].filter(Boolean).join(' ');
      let g = `<g class="${cls}" data-id="${id}"><circle cx="${s.x}" cy="${s.y}" r="${s.depot ? 13 : 11}"/>`;
      if (s.objective) g += `<rect class="obj" x="${s.x - 5}" y="${s.y - 5}" width="10" height="10" transform="rotate(45 ${s.x} ${s.y})"/>`;
      g += `<text x="${s.x}" y="${s.y - 19}" text-anchor="middle">${esc(s.name)}</text>`;
      // our battalions: numbered badges under the sector; the enemy's: red ones with their strength
      const mine = c.battalions.map((b, i) => [b, i]).filter(([b]) => b.at === id);
      const theirs = known.filter((e) => e.at === id);
      const all = [...mine.map(([b, i]) => ({ t: 'b', b, n: i + 1 })), ...theirs.map((e) => ({ t: 'e', e }))];
      all.forEach((m, j) => {
        const bx = s.x - ((all.length - 1) * 26) / 2 + j * 26;
        const by = s.y + 28;
        if (m.t === 'b') g += `<g class="cp-bn${m.b.id === this.sel ? ' sel' : ''}" data-bn="${m.b.id}"><rect x="${bx - 11}" y="${by - 11}" width="22" height="22" rx="2"/><text x="${bx}" y="${by + 5}" text-anchor="middle">${m.n}</text></g>`;
        else g += `<g class="cp-foe"><title>${esc(m.e.name)} · about ${Math.round(m.e.strength * 100)} %</title><rect x="${bx - 11}" y="${by - 11}" width="22" height="22" rx="2"/><rect class="bar" x="${bx - 8}" y="${by + 5}" width="${16 * m.e.strength}" height="2.5"/></g>`;
      });
      svg += `${g}</g>`;
    }
    const wrap = el('div', 'cp-map');
    wrap.innerHTML = `<svg viewBox="20 30 700 390" role="img" aria-label="Campaign map">${svg}</svg>
      <div class="cp-legend"><span class="ours">${esc(FACTIONS[me].name)}</span><span class="theirs">${esc(FACTIONS[enemyOf(me)].name)}</span><span class="obj">Objective</span><span class="cut">Cut off</span><span class="foe">Enemy battalion</span></div>`;
    wrap.querySelectorAll('.cp-sec').forEach((g) => g.addEventListener('click', (ev) => {
      const id = g.dataset.id;
      const bn = ev.target.closest('.cp-bn')?.dataset.bn;
      if (bn && bn !== this.sel) { this.sel = bn; return this.render(); }
      if (canOrder && reach.has(id)) { orderMove(c, sel.id, id === sel.at ? null : id); return this.render(); }
      const here = c.battalions.find((b) => b.at === id);
      if (here) { this.sel = here.id; this.render(); }
    }));
    return wrap;
  }

  ordersCard(c) {
    const card = el('div', 'cp-battle');
    card.append(el('span', 'cp-kicker', 'Orders'), el('h3', '', `Day ${day(c)} <small>${esc(TIMES[hour(c)]?.name ?? hour(c))} · ${esc(WEATHER[c.weather]?.name ?? c.weather)}</small>`));
    card.append(el('p', 'cp-hint', 'Select a battalion, then click a sector next to it: your own to move there, the enemy\'s to attack. Its own sector again: hold.'));
    const list = el('div', 'cp-orders');
    c.battalions.forEach((b, i) => {
      const men = b.stacks.reduce((a, u) => a + u.men, 0);
      const full = b.stacks.reduce((a, u) => a + UNIT_TYPES[u.type].formation.count, 0);
      const cut = cutLevel(c, b);
      const what = (cut ? `<em>cut off${cut > 1 ? ` · ${cut} turns` : ''}</em> · ` : '') + (!b.order ? `holds ${esc(SECTORS[b.at].name)}` : c.owner[b.order] === c.side ? `moves to ${esc(SECTORS[b.order].name)}` : `<b>attacks ${esc(SECTORS[b.order].name)}</b>`);
      const row = btn(`<span class="cp-num">${i + 1}</span><span class="cp-bname">${esc(b.name)}<small>${what}</small></span><span class="cp-men">${men} / ${full}</span>`, `cp-order-row${b.id === this.sel ? ' on' : ''}`, () => { this.sel = b.id; this.render(); });
      list.append(row);
    });
    card.append(list, btn('End turn', 'deploy', () => { endTurn(c); this.render(); }));
    return card;
  }

  battleCard(c) {
    const card = el('div', 'cp-battle');
    const b = c.battles[0];
    const { ours } = sides(c, b);
    const enemyAttacks = b.attacker !== c.side;
    card.append(el('span', 'cp-kicker', `${enemyAttacks ? 'Enemy attack' : 'Our attack'}${c.battles.length > 1 ? ` · 1 of ${c.battles.length}` : ''}`));
    card.append(el('h3', '', esc(b.name)));
    card.append(el('p', '', `${esc(MAPS[b.map]?.name ?? b.map)} · ${esc(TIMES[b.time]?.name ?? b.time)} · ${esc(WEATHER[b.weather]?.name ?? b.weather)}`));
    card.append(el('p', '', `${enemyAttacks ? 'Holding' : 'Attacking'}: ${ours.map((x) => esc(x.name)).join(', ')}`));
    const help = battleChoice(c).campaign.forces[c.side].filter((u) => u.cid === 'attached');
    if (help.length) card.append(el('p', '', `Supporting: ${help.map((u) => esc(u.name)).join(', ')}`));
    card.append(el('p', 'cp-hint', enemyAttacks
      ? 'They come at us here. You have two minutes to dig in before the assault. Lose, and the battalion falls back down the road.'
      : 'We go in here. Take their lines one after another before time runs out. Win, and the sector is ours.'));
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
    const row = el('div', 'cp-actions');
    row.append(btn('Fight', 'deploy', () => this.onBattle(battleChoice(c))));
    row.append(btn('Resolve by the numbers', 'mp-btn', () => { autoResolve(c); this.render(); }));
    card.append(row, el('p', 'cp-hint', 'By the numbers, our strength counts 15 % less than if you fight it yourself.'));
    return card;
  }

  overCard(c) {
    const card = el('div', 'cp-battle');
    card.append(el('h3', '', c.over.won ? 'Victory' : 'Defeat'), el('p', '', esc(c.over.text)));
    card.append(btn('New campaign', 'deploy', () => { clearCampaign(); this.render(); }));
    return card;
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

  battalionView(c) {
    const box = el('div', 'cp-battalion');
    const tabs = el('div', 'rw-tabs');
    c.battalions.forEach((b, i) => tabs.append(btn(`${i + 1} · ${esc(b.name)}`, b.id === this.sel ? 'on' : '', () => { this.sel = b.id; this.render(); })));
    box.append(tabs);
    const b = c.battalions.find((x) => x.id === this.sel);
    if (!b) return box;
    box.append(el('h3', 'menu-sub', `${esc(b.name)} · ${esc(SECTORS[b.at].name)} · ${b.stacks.length} / ${MAX_STACKS} stacks · strength ${Math.round(power(b))}`));
    const cut = cutLevel(c, b);
    if (cut) box.append(el('p', 'cp-event cut', esc(cut >= 3 ? 'Cut off for three turns or more: a man in ten lost every turn, and at half strength it surrenders unless it attacks. Break out, or open the road to it.'
      : cut === 2 ? 'Cut off for a second turn: no refills, no aircraft in its battles, and its men are shaken. Break out, or open the road to it.'
        : 'Cut off: the road to our depots is closed. No refills or recruits, wounded stay away, and its battles start with less command points.')));
    const list = el('div', 'cp-units');
    for (const u of b.stacks) {
      const T = UNIT_TYPES[u.type];
      const row = el('div', 'cp-unit');
      const rank = u.rank ? `<span class="cp-rank" title="${RANKS[u.rank]?.name}">${'★'.repeat(u.rank)}</span>` : '';
      const hurt = u.wounded ? ` <i title="Wounded, back after the next battle or a quiet turn">+${u.wounded}</i>` : '';
      row.append(el('span', 'cp-name', `${rank}${esc(u.name)}`), el('span', 'cp-men', `${u.men} / ${T.formation.count}${hurt}`));
      const cost = refillCost(c, u);
      const r = btn(cost ? `Refill ${cost}` : 'Full', 'mp-btn', () => { if (refill(c, b.id, u.cid)) this.render(); });
      r.disabled = !cost || cost > c.points || !!cut;
      row.append(r);
      list.append(row);
    }
    box.append(list);
    box.append(el('h3', 'menu-sub', `Recruit into ${esc(b.name)}`));
    const rec = el('div', 'cp-recruit');
    for (const T of recruitable(c)) {
      const cost = unitCost(T, c.armies[c.side]);
      const r = btn(`${esc(T.variants?.[c.armies[c.side]]?.name ?? T.shortName)}<small>${cost}</small>`, 'mp-btn', () => { if (recruit(c, b.id, T.id)) this.render(); });
      r.disabled = cost > c.points || b.stacks.length >= MAX_STACKS || !!cut;
      rec.append(r);
    }
    box.append(rec);
    return box;
  }
}
