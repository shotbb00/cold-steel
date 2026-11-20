// The world campaign's screen (src/wcampaign): the war room. A paper map on the map table — theatres, provinces as pins,
// roads in ink, sea zones as water, every army group, fleet and air wing as a counter — the orders drawn as arrows,
// the battle board after each turn, the dispatches, and the save that goes to another device.
//   new WarRoomPanel({ onOpen })   the menu's Campaign tab: start a war, continue the last, load a code or a file
//   openWarRoom(campaign)          the full-screen war room over the menu
// Look: the map sheet's (ui/MapSheet.js) — cream ink on the dark table, blue and red pins — with paper counters.
import { WW2 } from '../wcampaign/wars/ww2.js';
import { newCampaign, order, resolveTurn, autoResolve, settle, endTurn, forcesAt, forceById, power, supplied, dateOf, hourOf, enemy, landingZone, raise, refit, moraleCap, STACK } from '../wcampaign/engine.js';
import { aiTurn } from '../wcampaign/ai.js';
import { encode, decode, saveFile, autosave, listSaves, loadSave, toPieces } from '../wcampaign/save.js';
import { UNIT_TYPES } from '../data/units/index.js';
import { MAPS } from '../maps/index.js';
import { ARMIES } from '../data/factions.js';
import { epoch } from '../data/epoch.js';

const WARS = { 1945: WW2 }; // (the wars with a world campaign: one at a time, 1945 first)
export const warFor = (ep = epoch()) => WARS[ep] ?? null;

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const btn = (label, cls, fn) => { const b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; };
const SIDE = { nato: 'Allies', pact: 'Axis' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso) => `${Number(iso.slice(8))} ${MONTHS.at(Number(iso.slice(5, 7)) - 1)} ${iso.slice(0, 4)}`;
const W = 1000, H = 640;

/** The unit types' costs as the campaign's power table (the engine has no game imports; set before it runs). */
function arm(c) { c.power ??= Object.fromEntries(Object.values(UNIT_TYPES).map((t) => [t.id, t.cost ?? 120])); return c; }
const mapsHere = () => new Set(Object.keys(MAPS));

// ---------------------------------------------------------------- the menu's Campaign tab

export class WarRoomPanel {
  constructor({ onOpen }) {
    this.onOpen = onOpen;
    this.root = el('div', 'campaign wc-start');
    this.choice = { scenario: '1942', side: 'nato' };
    this.render();
  }

  async render() {
    const r = this.root, war = warFor();
    r.replaceChildren(el('h2', '', 'Campaign'));
    if (!war) { r.append(el('p', 'mp-lead', `The world campaign starts with the Second World War: switch to 1945 to play it. ${esc(epoch())} follows.`)); return; }
    r.append(el('p', 'mp-lead', 'The whole war on one map: Western Europe, the Eastern Front, North Africa and the Mediterranean, the Pacific and the Atlantic. Move army groups, fleets and air wings in turns of half a week; every clash becomes a battle that turn. The war runs for as long as it lasts — and goes the way you fight it.'));
    const saves = (await listSaves()).filter((s) => s.war === war.id);
    if (saves.length) {
      const last = saves[0];
      const row = el('div', 'deploy-row');
      row.append(btn(`Continue — turn ${last.turn}`, 'deploy', async () => { const c = await loadSave(last.key); if (c) this.onOpen(arm(c)); }));
      r.append(row);
    }
    r.append(el('h3', 'menu-sub', 'A new war'));
    const sc = el('div', 'cards sides');
    for (const [id, s] of Object.entries(war.scenarios)) {
      const card = btn(`<b>${esc(s.name)}</b><span>Starts ${esc(longDate(s.start))}.</span>`, `card${this.choice.scenario === id ? ' on' : ''}`, () => { this.choice.scenario = id; for (const o of sc.children) o.classList.toggle('on', o === card); });
      sc.append(card);
    }
    const sides = el('div', 'cards sides');
    for (const f of ['nato', 'pact']) {
      const card = btn(`<b>${SIDE[f]}</b><span>${f === 'nato' ? 'Britain, the Soviet Union and the United States' : 'Germany and Japan'}</span>`, `card ${f}${this.choice.side === f ? ' on' : ''}`, () => { this.choice.side = f; for (const o of sides.children) o.classList.toggle('on', o === card); });
      sides.append(card);
    }
    r.append(sc, sides);
    const go = el('div', 'deploy-row');
    go.append(btn('Start the war', 'deploy', () => this.onOpen(arm(newCampaign(war, { scenario: this.choice.scenario, side: this.choice.side, seed: Math.floor(Math.random() * 1e9), maps: mapsHere() })))));
    r.append(go);
    // from another device: the code, or the file
    r.append(el('h3', 'menu-sub', 'Continue from another device'));
    const area = el('textarea', 'wc-code');
    area.placeholder = 'Paste a campaign code (CS1.…)';
    const msg = el('p', 'cp-hint');
    const file = el('input');
    file.type = 'file';
    file.accept = '.coldsteel,text/plain';
    file.hidden = true;
    const load = async (text) => { try { this.onOpen(arm(await decode(text))); } catch (e) { msg.textContent = e.message; } };
    file.addEventListener('change', async () => { if (file.files[0]) load(await file.files[0].text()); });
    const row = el('div', 'deploy-row');
    row.append(btn('Load the code', 'mp-btn', () => load(area.value)), btn('Open a save file', 'mp-btn', () => file.click()), file);
    r.append(area, row, msg);
  }
}

// ---------------------------------------------------------------- the war room

/** Map coordinates for every province and sea zone of a theatre (or of all): the real places, spread so pins never pile up. */
function layout(war, theatre) {
  const items = [
    ...Object.entries(war.provinces).filter(([, p]) => !theatre || p.theatre === theatre).map(([id, p]) => ({ id, kind: 'prov', p })),
    ...Object.entries(war.seas).filter(([, s]) => !theatre || s.theatre === theatre).map(([id, s]) => ({ id, kind: 'sea', p: s })),
  ];
  const lonOf = (q) => (theatre === 'pacific' && q.lon < 0 ? q.lon + 360 : q.lon); // (the Pacific across the date line)
  const lats = items.map((i) => i.p.lat), lons = items.map((i) => lonOf(i.p));
  const lat0 = Math.min(...lats), lat1 = Math.max(...lats), lon0 = Math.min(...lons), lon1 = Math.max(...lons);
  const k = Math.cos(((lat0 + lat1) / 2) * Math.PI / 180);
  const sx = (W - 160) / Math.max(1, (lon1 - lon0) * k), sy = (H - 140) / Math.max(1, lat1 - lat0), s = Math.min(sx, sy);
  const ox = (W - (lon1 - lon0) * k * s) / 2, oy = (H - (lat1 - lat0) * s) / 2;
  for (const i of items) { i.x = ox + (lonOf(i.p) - lon0) * k * s; i.y = oy + (lat1 - i.p.lat) * s; i.x0 = i.x; i.y0 = i.y; }
  // spread: pins push apart (at least 92 px), each pulled back toward its true place; kept on the sheet
  for (let it = 0; it < 160; it++) {
    for (const a of items) for (const b of items) {
      if (a === b) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, min = a.kind === 'sea' || b.kind === 'sea' ? 110 : 96;
      if (d < min) { const push = (min - d) / 2 / d; a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push; }
    }
    for (const a of items) { a.x += (a.x0 - a.x) * 0.02; a.y += (a.y0 - a.y) * 0.02; a.x = Math.max(70, Math.min(W - 70, a.x)); a.y = Math.max(60, Math.min(H - 70, a.y)); }
  }
  return Object.fromEntries(items.map((i) => [i.id, i]));
}

/** A counter's symbol (NATO style): infantry ✕, armour an oval, both for mixed; a ship; an aircraft. */
function glyph(f) {
  if (f.kind === 'fleet') return '<path d="M-10 2h20l-3 4h-14z M-6 2v-4h9v4 M-1 -2v-3h2v3"/>';
  if (f.kind === 'air') return '<path d="M-10 0h20 M-2 -5v10 M4 -2v4 M-1 0l1 -6l1 6"/>';
  const armour = f.battalions.some((b) => b.kind === 'armour'), inf = f.battalions.some((b) => b.kind !== 'armour');
  return `${inf ? '<path d="M-10 -6L10 6 M-10 6L10 -6"/>' : ''}${armour ? '<ellipse cx="0" cy="0" rx="7" ry="4"/>' : ''}`;
}
/** 0..1: a force's strength against full. */
function strength(f) {
  if (f.kind === 'air') return Math.min(1, f.squadrons.reduce((a, s) => a + s.planes, 0) / (f.squadrons.length * 12 || 1));
  const us = f.kind === 'army' ? f.battalions.flatMap((b) => b.units) : f.ships;
  return us.reduce((a, u) => a + u.hp, 0) / (us.length || 1);
}

export function openWarRoom(c, { onClose = () => {}, war = WW2 } = {}) {
  const room = el('div', 'wc-room');
  document.body.append(room);
  const st = { theatre: null, sel: null, place: null, msg: '' };
  const me = c.side, foe = enemy(me);
  const close = () => { room.remove(); onClose(); };

  const nameOf = (id) => war.provinces[id]?.name ?? war.seas[id]?.name ?? id;
  const mapName = (id) => (id && MAPS[id] ? MAPS[id].name : null);

  /** Where force `f` may go this turn: { to: { land? } } — the engine's own rules (order() tried on a copy would cost a deep clone: these mirror it). */
  function targets(f) {
    const out = new Map();
    if (!f || f.side !== me || c.over) return out;
    if (f.kind === 'army') {
      for (const n of war.provinces[f.at].land) out.set(n, {});
      if (war.provinces[f.at].port) for (const k of Object.keys(war.provinces)) if (k !== f.at && !out.has(k) && (war.provinces[k].seas ?? []).length && landingZone(c, war, me, f.at, k)) out.set(k, { land: true });
    } else if (f.kind === 'fleet') for (const z of war.seas[f.at].seas) out.set(z, {});
    else {
      const near = new Set([f.at, ...war.provinces[f.at].land]);
      for (const n of [...near]) for (const m of war.provinces[n].land) near.add(m);
      for (const k of near) if (k !== f.at && war.provinces[k].airfield && c.provinces[k].owner === me) out.set(k, {});
    }
    return out;
  }

  function render() {
    room.replaceChildren(topBar(), tabs(), body());
  }

  function topBar() {
    const bar = el('div', 'wc-top');
    const mor = (s) => `<span class="wc-morale ${s}"><i style="--m:${Math.max(0, Math.round(c.morale[s]))}%"></i>${SIDE[s]} ${Math.max(0, Math.round(c.morale[s]))}</span>`;
    bar.append(el('div', 'wc-date', `<b>${esc(longDate(dateOf(c)))}</b><small>turn ${c.turn} · ${esc(hourOf(c))}</small>`),
      el('div', 'wc-morales', `${mor('nato')}${mor('pact')}`),
      el('div', 'wc-pool', `<small>production</small><b>${Math.round(c.pool[me]).toLocaleString('en')}</b>`));
    const right = el('div', 'wc-actions');
    right.append(btn('Save / move', 'mp-btn', saveDialog), c.over ? el('span', 'wc-over', 'The war is over') : btn('End turn', 'deploy', endOfTurn), btn('×', 'wc-close', close));
    bar.append(right);
    return bar;
  }

  function tabs() {
    const t = el('div', 'seg wc-tabs');
    const tab = (id, label) => { const b = btn(label, st.theatre === id ? 'on' : '', () => { st.theatre = id; st.place = null; render(); }); t.append(b); };
    tab(null, 'The war');
    for (const [id, th] of Object.entries(war.theatres)) tab(id, th.name);
    return t;
  }

  function body() {
    const b = el('div', 'wc-body');
    b.append(st.theatre ? theatreMap() : situationBoard(), drawer());
    return b;
  }

  /** The war at a glance: each theatre's ground held, its forces, a click into it. */
  function situationBoard() {
    const board = el('div', 'wc-board');
    for (const [id, th] of Object.entries(war.theatres)) {
      const provs = Object.keys(war.provinces).filter((k) => war.provinces[k].theatre === id);
      const held = (s) => provs.filter((k) => c.provinces[k].owner === s).length;
      const forces = (s) => c.forces.filter((f) => f.side === s && ((war.provinces[f.at]?.theatre ?? war.seas[f.at]?.theatre) === id));
      const n = held('nato'), p = held('pact');
      const card = btn(`<span class="wc-kicker">${esc(th.name)}</span>
        <span class="wc-bar"><i class="nato" style="flex:${n || 0.001}"></i><i class="pact" style="flex:${p || 0.001}"></i></span>
        <span class="wc-line">${provs.length ? `${n} of ${provs.length} provinces Allied` : 'the sea lanes'}</span>
        <span class="wc-line">Allies: ${forces('nato').length} forces · Axis: ${forces('pact').length} forces</span>`, 'wc-card', () => { st.theatre = id; render(); });
      board.append(card);
    }
    const log = el('div', 'wc-dispatches');
    log.append(el('h3', 'menu-sub', 'Dispatches'));
    const news = c.log.slice(-12).reverse().map(dispatch).filter(Boolean);
    for (const n of news) log.append(el('p', '', esc(n)));
    if (!news.length) log.append(el('p', 'cp-hint', 'Nothing yet: the war’s first turn.'));
    board.append(log);
    return board;
  }

  function dispatch(l) {
    if (l.text) return `${l.date ? longDate(l.date) + ': ' : ''}${l.text}`;
    if (l.destroyed) return `${l.destroyed} has been destroyed.`;
    if (l.surrendered) return `${l.surrendered} has surrendered.`;
    if (l.depotLost) return `${nameOf(l.depotLost)} has fallen.`;
    if (l.kind) return `Turn ${l.turn}: ${l.kind === 'sea' ? 'battle in' : l.kind === 'coastal' ? 'landing at' : 'battle for'} ${nameOf(l.at)} — ${l.margin >= 0.6 ? `${SIDE[l.side]} victory` : l.margin >= 0.45 ? 'undecided' : `${SIDE[l.side]} thrown back`}.`;
    return '';
  }

  /** One theatre on paper: provinces and sea zones, roads and sea lanes, counters, orders. */
  function theatreMap() {
    const L = layout(war, st.theatre);
    const sel = st.sel != null ? forceById(c, st.sel) : null;
    const reach = targets(sel);
    const ok = supplied(c, war, me);
    let svg = '<defs><filter id="wc-paper"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0.81  0 0 0 0 0.79  0 0 0 0 0.68  0 0 0 0.05 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>'
      + '<marker id="wc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>'
      + `<rect width="${W}" height="${H}" class="wc-sheet"/><rect width="${W}" height="${H}" filter="url(#wc-paper)"/>`;
    // sea zones: water washes, their lanes to each other and the coasts they touch
    for (const [id, s] of Object.entries(war.seas)) {
      const a = L[id];
      if (!a) continue;
      svg += `<ellipse class="wc-water" cx="${a.x}" cy="${a.y}" rx="80" ry="46"/>`;
      for (const k of s.coasts) if (L[k]) svg += `<line class="wc-coast" x1="${a.x}" y1="${a.y}" x2="${L[k].x}" y2="${L[k].y}"/>`;
      for (const z of s.seas) if (L[z] && z > id) svg += `<line class="wc-lane" x1="${a.x}" y1="${a.y}" x2="${L[z].x}" y2="${L[z].y}"/>`;
    }
    // roads between provinces
    for (const [id, p] of Object.entries(war.provinces)) for (const n of p.land) if (L[id] && L[n] && n > id) svg += `<line class="wc-road" x1="${L[id].x}" y1="${L[id].y}" x2="${L[n].x}" y2="${L[n].y}"/>`;
    // orders: an ink arrow from the force's place most of the way to the target (blue our moves, red attacks, dashed landings)
    for (const [fid, o] of Object.entries(c.orders[me])) {
      const f = forceById(c, +fid), A = L[f?.at], B = L[o.to];
      if (!A || !B) continue;
      const attack = war.provinces[o.to] && c.provinces[o.to].owner !== me;
      const x = A.x + (B.x - A.x) * 0.82, y = A.y + (B.y - A.y) * 0.82;
      svg += `<line class="wc-order${attack ? ' attack' : ''}${o.land ? ' landing' : ''}" x1="${A.x}" y1="${A.y}" x2="${x}" y2="${y}" marker-end="url(#wc-arrow)"/>`;
    }
    // pins and counters
    for (const [id, a] of Object.entries(L)) {
      const isSea = a.kind === 'sea', P = c.provinces[id];
      const owner = isSea ? null : P.owner;
      const cls = ['wc-place', isSea ? 'sea' : owner, !isSea && P.depot ? 'depot' : '', reach.has(id) ? (reach.get(id).land ? 'reach landing' : 'reach') : '', st.place === id ? 'sel' : '', !isSea && owner === me && !ok.has(id) ? 'cut' : '', !isSea && P.contested ? 'contested' : ''].filter(Boolean).join(' ');
      let g = `<g class="${cls}" data-id="${id}">`;
      if (isSea) g += `<rect class="hit" x="${a.x - 70}" y="${a.y - 36}" width="140" height="72" rx="30"/>`;
      else g += `<circle class="pin" cx="${a.x}" cy="${a.y}" r="${P.depot ? 9 : 7}"/>${P.fort ? `<circle class="fort" cx="${a.x}" cy="${a.y}" r="${P.depot ? 13 : 11}"/>` : ''}${war.provinces[id].airfield ? `<path class="field" d="M${a.x + 11} ${a.y - 12}h8"/>` : ''}`;
      g += `<text class="name" x="${a.x}" y="${a.y - (isSea ? 20 : 14)}" text-anchor="middle">${esc(nameOf(id))}</text>`;
      const here = c.forces.filter((f) => f.at === id && (f.side === me || isSea || seen(id)));
      here.forEach((f, j) => {
        const cx = a.x - ((Math.min(here.length, 4) - 1) * 30) / 2 + (j % 4) * 30, cy = a.y + 20 + Math.floor(j / 4) * 26;
        g += `<g class="wc-counter ${f.side}${f.id === st.sel ? ' sel' : ''}${c.orders[me][f.id] ? ' ordered' : ''}" data-f="${f.id}" transform="translate(${cx} ${cy})"><title>${esc(f.name)}</title><rect class="face" x="-13" y="-10" width="26" height="20" rx="2"/><g class="sym">${glyph(f)}</g><rect class="str" x="-11" y="7" width="${22 * strength(f)}" height="2"/></g>`;
      });
      svg += `${g}</g>`;
    }
    const wrap = el('div', 'wc-map');
    wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(war.theatres[st.theatre].name)}">${svg}</svg>
      <div class="cp-legend"><span class="ours">${SIDE[me]}</span><span class="theirs">${SIDE[foe]}</span><span class="obj">Fort</span><span class="cut">Cut off</span><span class="foe">Order: move · attack · landing</span></div>`;
    wrap.querySelector('svg').addEventListener('click', (ev) => {
      const counter = ev.target.closest('.wc-counter'), place = ev.target.closest('.wc-place')?.dataset.id;
      const sf = st.sel != null ? forceById(c, st.sel) : null;
      if (sf && place && (reach.has(place) || place === sf.at) && !(counter && +counter.dataset.f !== sf.id && place === sf.at)) {
        const why = order(c, war, me, sf.id, place, reach.get(place) ?? {});
        st.msg = why ? `Not possible: ${why}.` : '';
        return render();
      }
      if (counter) { const f = forceById(c, +counter.dataset.f); if (f?.side === me) { st.sel = f.id; st.place = f.at; st.msg = ''; return render(); } }
      if (place) { st.place = place; st.sel = null; st.msg = ''; render(); }
    });
    return wrap;
  }
  function seen(id) { // (enemy counters: where we stand or next door, or a sea zone we hold)
    if (war.seas[id]) return forcesAt(c, id, me).length > 0 || war.seas[id].coasts.some((k) => c.provinces[k].owner === me);
    return c.provinces[id].owner === me || war.provinces[id].land.some((n) => c.provinces[n].owner === me);
  }

  /** The drawer: the selected force, or the selected place, or how to play. */
  function drawer() {
    const d = el('div', 'wc-drawer');
    if (st.msg) d.append(el('p', 'wc-msg', esc(st.msg)));
    const f = st.sel != null ? forceById(c, st.sel) : null;
    if (f) {
      const kind = { army: 'Army group', fleet: 'Fleet', air: 'Air wing' }[f.kind];
      d.append(el('span', 'cp-kicker', `${kind} · ${esc(ARMIES[f.army]?.name ?? f.army)}`), el('h3', '', esc(f.name)));
      d.append(el('p', 'cp-hint', `At ${esc(nameOf(f.at))}${f.cut ? ` · <em>cut off for ${f.cut} turns</em>` : ''} · strength ${Math.round(strength(f) * 100)} % · power ${Math.round(power(c, f)).toLocaleString('en')}`));
      d.append(el('p', 'cp-hint', `${esc(f.commander.name)}: ${esc(f.commander.trait)}`));
      const o = c.orders[me][f.id];
      d.append(el('p', 'wc-order-line', o ? `${o.land ? 'Lands on' : war.provinces[o.to] && c.provinces[o.to].owner !== me ? 'Attacks' : 'Moves to'} <b>${esc(nameOf(o.to))}</b>` : 'Holds its ground. Click a highlighted place to move, attack or land; click its own place to hold.'));
      if (f.kind === 'army') {
        for (const b of f.battalions) {
          const hp = b.units.reduce((a, u) => a + u.hp, 0) / b.units.length;
          d.append(el('div', 'wc-bn', `<span>${esc(b.kind)} battalion</span><span class="wc-hp"><i style="width:${Math.round(hp * 100)}%"></i></span><small>${b.units.length} stacks</small>`));
        }
        d.append(btn('Refit (production)', 'mp-btn', () => { const spent = refit(c, war, f); st.msg = spent ? `Refitted for ${spent} production.` : 'Nothing to refit, cut off, or not enough production.'; render(); }));
      } else if (f.kind === 'fleet') d.append(el('p', 'cp-hint', esc(f.ships.map((s) => s.t).join(', '))));
      else d.append(el('p', 'cp-hint', esc(f.squadrons.map((s) => `${s.k} ${s.planes}`).join(' · '))));
      return d;
    }
    const id = st.place;
    if (id && war.provinces[id]) {
      const P = c.provinces[id], p = war.provinces[id];
      d.append(el('span', 'cp-kicker', `${esc(war.theatres[p.theatre].name)} · ${SIDE[P.owner]}${P.depot ? ' base' : ''}`), el('h3', '', esc(p.name)));
      const maps = [mapName(P.map) ? `Battles here: <b>${esc(mapName(P.map))}</b>` : 'No battle map here yet: battles are resolved', ...P.coastal.map((m) => `Landings: <b>${esc(mapName(m) ?? m)}</b>`)];
      d.append(el('p', 'cp-hint', maps.join('<br>')));
      d.append(el('p', 'cp-hint', `Production ${p.prod ?? 0}${P.fort ? ` · fortified (${P.fort})` : ''}${p.port ? ' · port' : ''}${p.airfield ? ' · airfield' : ''}`));
      if (P.depot === me && P.owner === me) {
        const armies = [...new Set(c.forces.filter((x) => x.side === me && x.kind === 'army' && war.provinces[x.at]?.theatre === p.theatre).map((x) => x.army))];
        const army = armies[0] ?? (me === 'nato' ? 'us' : 'wh');
        for (const kind of Object.keys(war.battalions)) {
          const cost = war.battalions[kind].reduce((a, t) => a + (c.power[t] ?? 120), 0);
          d.append(btn(`Raise ${kind} battalion · ${cost}`, 'mp-btn', () => { const r = raise(c, war, me, army, id, kind); st.msg = r ? `A ${kind} battalion joins ${r.name}.` : `Not possible: not enough production, or no room here (at most ${STACK.army} army groups).`; render(); }));
        }
      }
      return d;
    }
    if (id && war.seas[id]) {
      d.append(el('span', 'cp-kicker', 'Sea zone'), el('h3', '', esc(war.seas[id].name)));
      d.append(el('p', 'cp-hint', mapName(c.seas[id].map) ? `Battles here: <b>${esc(mapName(c.seas[id].map))}</b>` : 'No sea map here yet: battles are resolved'));
      return d;
    }
    d.append(el('span', 'cp-kicker', 'Orders'), el('h3', '', st.theatre ? esc(war.theatres[st.theatre].name) : 'The war'));
    d.append(el('p', 'cp-hint', st.theatre ? 'Click one of your counters, then a highlighted place: a road next door to move or attack, a coast across the water to land (a fleet of yours must hold the sea off it). End the turn when every front has its orders — the enemy moves at the same time.' : 'Pick a theatre above to give orders there. Every front fights every turn, whether you look at it or not.'));
    const ordered = Object.keys(c.orders[me]).length;
    d.append(el('p', 'cp-hint', `${ordered} order${ordered === 1 ? '' : 's'} given this turn · morale can reach ${Math.round(moraleCap(c, me))} at most with the ground you hold`));
    return d;
  }

  // ---------------------------------------------------------------- the turn: the enemy's orders, the battle board, the dispatches

  function endOfTurn() {
    if (c.over) return;
    aiTurn(c, war, foe);
    resolveTurn(c, war);
    if (c.board.length) battleBoard(); else finish();
  }

  function battleBoard() {
    const modal = el('div', 'wc-modal');
    const box = el('div', 'wc-modal-box');
    const draw = () => {
      box.replaceChildren(el('span', 'cp-kicker', `Turn ${c.turn} · ${esc(longDate(dateOf(c)))}`), el('h3', '', 'The battle board'));
      box.append(el('p', 'cp-hint', 'Every clash on every front this turn. Fight it on its map, have the AI fight it for you, or resolve it at once. (Fighting and delegating come next: for now every battle is resolved.)'));
      const byTheatre = {};
      for (const b of c.board) (byTheatre[b.theatre] ??= []).push(b);
      for (const [t, list] of Object.entries(byTheatre)) {
        box.append(el('h4', 'wc-th', esc(war.theatres[t]?.name ?? t)));
        for (const b of list) {
          const att = b.attackers.map((i) => forceById(c, i)).filter(Boolean), def = [...b.defenders, ...(b.support ?? [])].map((i) => forceById(c, i)).filter(Boolean);
          const pa = att.reduce((a, f) => a + power(c, f), 0), pd = def.reduce((a, f) => a + power(c, f), 0);
          const map = mapName(b.map);
          const row = el('div', `wc-battle ${b.done ? 'done' : ''}`);
          row.append(el('div', '', `<b>${b.kind === 'sea' ? 'At sea' : b.kind === 'coastal' ? 'Landing' : 'Battle'}: ${esc(nameOf(b.at))}</b><small>${map ? esc(map) : 'no map: resolved'}</small>
            <span class="wc-vs"><span class="${b.attackerSide}">${esc(att.map((f) => f.name).join(', ') || '—')}</span> against <span class="${enemy(b.attackerSide)}">${esc(def.map((f) => f.name).join(', ') || 'the garrison')}</span></span>
            <small>${Math.round(pa).toLocaleString('en')} : ${Math.round(pd).toLocaleString('en')}${b.done ? ` · ${b.note ?? (b.margin >= 0.6 ? `${SIDE[b.attackerSide]} win` : b.margin >= 0.45 ? 'undecided — the fight goes on' : `${SIDE[b.attackerSide]} thrown back`)}` : ''}</small>`));
          if (!b.done) {
            const acts = el('div', 'wc-battle-acts');
            const fight = btn('Fight', 'mp-btn', () => {}); fight.disabled = true; fight.title = 'Coming next: fight it on its map';
            const del = btn('Delegate', 'mp-btn', () => {}); del.disabled = true; del.title = 'Coming next: the AI fights it for you';
            acts.append(fight, del, btn('Resolve', 'mp-btn', () => { settle(c, war, b.id, { ...autoResolve(c, war, b.id), how: 'auto' }); draw(); }));
            row.append(acts);
          }
          box.append(row);
        }
      }
      const open = c.board.filter((b) => !b.done).length;
      const row = el('div', 'deploy-row');
      if (open) row.append(btn(`Resolve the rest (${open})`, 'mp-btn', () => { for (const b of c.board) if (!b.done) settle(c, war, b.id, { ...autoResolve(c, war, b.id), how: 'auto' }); draw(); }));
      else row.append(btn('Continue', 'deploy', () => { modal.remove(); finish(); }));
      box.append(row);
    };
    draw();
    modal.append(box);
    room.append(modal);
  }

  async function finish() {
    const before = c.log.length;
    endTurn(c, war);
    st.sel = null;
    await autosave(c);
    render();
    const news = c.log.slice(before).map(dispatch).filter(Boolean);
    if (news.length || c.over) {
      const modal = el('div', 'wc-modal');
      const box = el('div', 'wc-modal-box wc-paper');
      box.append(el('span', 'cp-kicker', 'Dispatches'), el('h3', '', esc(longDate(dateOf(c)))));
      for (const n of news) box.append(el('p', '', esc(n)));
      if (c.over) box.append(el('p', 'wc-over', `${SIDE[c.over.winner]} have won the war: ${esc(c.over.why)}.`));
      box.append(btn('To the map', 'deploy', () => modal.remove()));
      modal.append(box);
      room.append(modal);
    }
  }

  // ---------------------------------------------------------------- saving and moving to another device

  async function saveDialog() {
    const modal = el('div', 'wc-modal');
    const box = el('div', 'wc-modal-box');
    const code = await encode(c);
    const pieces = toPieces(code);
    box.append(el('span', 'cp-kicker', 'Save'), el('h3', '', 'Continue on another device'));
    box.append(el('p', 'cp-hint', `The war is saved in this browser after every turn. To go on elsewhere, take it along as a code (${(code.length / 1024).toFixed(1)} KB) or a file, and load it in the Campaign tab there. (QR codes: ${pieces.length} of them — showing them comes next.)`));
    const area = el('textarea', 'wc-code');
    area.value = code;
    area.readOnly = true;
    const msg = el('p', 'cp-hint');
    const row = el('div', 'deploy-row');
    row.append(btn('Copy the code', 'mp-btn', async () => { try { await navigator.clipboard.writeText(code); msg.textContent = 'Copied.'; } catch { area.select(); msg.textContent = 'Select and copy it.'; } }),
      btn('Save as a file', 'mp-btn', () => saveFile(c)), btn('Close', 'deploy', () => modal.remove()));
    box.append(area, row, msg);
    modal.append(box);
    room.append(modal);
  }

  render();
  return { close };
}
