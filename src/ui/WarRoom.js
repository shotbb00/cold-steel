// The world campaign's screen (src/wcampaign): the war room. A paper map on the map table — theatres, provinces as pins,
// roads in ink, sea zones as water, every army group, fleet and air wing as a counter — the orders drawn as arrows,
// the battle board after each turn, the dispatches, and the save that goes to another device.
//   new WarRoomPanel({ onOpen })   the menu's Campaign tab: start a war, continue the last, load a code or a file
//   openWarRoom(campaign)          the full-screen war room over the menu
// Look: the real world (ui/WorldMap.js) in the map sheet's ink on the dark table, blue and red ground and pins, paper counters.
import { WW2 } from '../wcampaign/wars/ww2.js';
import { newCampaign, order, resolveTurn, autoResolve, settle, endTurn, forcesAt, forceById, power, supplied, dateOf, hourOf, enemy, landingZone, raise, refit, moraleCap, STACK, raiseFleet, raiseAir, fleetCost, airCost, upkeep, PRIORITY, ECON } from '../wcampaign/engine.js';
import { aiTurn } from '../wcampaign/ai.js';
import { fightable, battleChoice, takeResult, clearResult, outcomeOf } from '../wcampaign/battle.js';
import { encode, decode, saveFile, autosave, listSaves, loadSave, toPieces } from '../wcampaign/save.js';
import { UNIT_TYPES } from '../data/units/index.js';
import { MAPS } from '../maps/index.js';
import { ARMIES } from '../data/factions.js';
import { epoch } from '../data/epoch.js';
import { WorldMap } from './WorldMap.js';

const WARS = { 1945: WW2 }; // (the wars with a world campaign: one at a time, 1945 first)
export const warFor = (ep = epoch()) => WARS[ep] ?? null;

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const btn = (label, cls, fn) => { const b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; };
const SIDE = { nato: 'Allies', pact: 'Axis' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso) => `${Number(iso.slice(8))} ${MONTHS.at(Number(iso.slice(5, 7)) - 1)} ${iso.slice(0, 4)}`;

/** The unit types' costs as the campaign's power table (the engine has no game imports; set before it runs). */
function arm(c) { c.power ??= Object.fromEntries(Object.values(UNIT_TYPES).map((t) => [t.id, t.cost ?? 120])); return c; }
const mapsHere = () => new Set(Object.keys(MAPS));

// ---------------------------------------------------------------- the menu's Campaign tab

export class WarRoomPanel {
  constructor({ onOpen }) {
    this.onOpen = onOpen;
    this.back = this.applyResult(); // (a battle just fought: its result into the campaign, then straight back to the war room)
    this.root = el('div', 'campaign wc-start');
    this.choice = { scenario: '1942', side: 'nato' };
    this.render();
  }

  /** The last campaign battle's result (wcampaign/battle.js), settled into the autosaved campaign it came from. */
  async applyResult() {
    const r = takeResult(), war = warFor();
    if (!r || !war || r.war !== war.id) return;
    const save = (await listSaves()).find((s) => s.war === war.id);
    const c = save && arm(await loadSave(save.key));
    const b = c?.board.find((x) => x.id === r.battle && !x.done);
    clearResult(); // (this war's: used now, or stale — its battle settled already)
    if (!b) return;
    settle(c, war, b.id, outcomeOf(c, b, r));
    c.queue = (c.queue ?? []).filter((id) => id !== b.id);
    await autosave(c);
    this.onOpen(c);
  }

  async render() {
    await this.back;
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
const CLUSTER = 30; // px: places closer than this on screen share one pin (click it: the map zooms in)

export function openWarRoom(c, { onClose = () => {}, onBattle = () => {}, war = WW2 } = {}) {
  const room = el('div', 'wc-room');
  document.body.append(room);
  let qTimer = 0; // (the next delegated battle's countdown)
  const st = { theatre: null, sel: null, place: null, msg: '', reach: new Map() };
  const me = c.side, foe = enemy(me);
  let top = el('div'), tabBar = el('div'), side = el('div');
  const body = el('div', 'wc-body'), mapBox = el('div', 'wc-map');
  body.append(mapBox, side);
  room.append(top, tabBar, body);
  const map = new WorldMap(mapBox, { onView: () => drawOverlay() });
  const tools = el('div', 'wc-zoom');
  tools.append(btn('+', '', () => map.zoomBy(2)), btn('−', '', () => map.zoomBy(0.5)), btn('⤢', '', () => frame(st.theatre)));
  tools.lastChild.title = 'Back to the whole theatre';
  mapBox.append(tools, el('div', 'cp-legend wc-legend', `<span class="ours">${SIDE[me]}</span><span class="theirs">${SIDE[foe]}</span><span class="obj">Fort</span><span class="cut">Cut off</span><span class="foe">Order: move · attack · landing</span>`));
  map.load().catch(() => { st.msg = 'The coastlines could not be loaded.'; render(); });
  const close = () => { map.dispose(); room.remove(); onClose(); };

  const nameOf = (id) => war.provinces[id]?.name ?? war.seas[id]?.name ?? id;
  const mapName = (id) => (id && MAPS[id] ? MAPS[id].name : null);
  const theatreOf = (id) => war.provinces[id]?.theatre ?? war.seas[id]?.theatre;
  // every place on the real map (world units)
  const PL = {};
  for (const [id, p] of [...Object.entries(war.provinces), ...Object.entries(war.seas)]) { const [x, y] = map.xy(p.lon, p.lat); PL[id] = { id, sea: !!war.seas[id], x, y }; }
  const frame = (theatre, ms = 650) => { const ids = Object.keys(PL).filter((id) => !theatre || theatreOf(id) === theatre); map.flyTo(ids.map((id) => [PL[id].x, PL[id].y]), theatre ? 40 : 1, ms); };

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
  const selected = () => (st.sel != null ? forceById(c, st.sel) : null);

  function render() {
    st.reach = targets(selected());
    const t2 = topBar(), b2 = tabs(), d2 = drawer();
    top.replaceWith(t2); tabBar.replaceWith(b2); side.replaceWith(d2);
    top = t2; tabBar = b2; side = d2;
    map.territory(Object.keys(war.provinces).map((id) => ({ x: PL[id].x, y: PL[id].y, side: c.provinces[id].owner })));
    drawOverlay();
  }

  function topBar() {
    const bar = el('div', 'wc-top');
    const mor = (s) => `<span class="wc-morale ${s}"><i style="--m:${Math.max(0, Math.round(c.morale[s]))}%"></i>${SIDE[s]} ${Math.max(0, Math.round(c.morale[s]))}</span>`;
    bar.append(el('div', 'wc-date', `<b>${esc(longDate(dateOf(c)))}</b><small>turn ${c.turn} · ${esc(hourOf(c))}</small>`),
      el('div', 'wc-morales', `${mor('nato')}${mor('pact')}`),
      el('div', 'wc-pool', `<small>production</small><b>${Math.round(c.pool[me]).toLocaleString('en')}</b><small title="income after upkeep, each turn · what isn't spent beyond ${ECON.stockTurns} turns' income is lost">${(c.income?.[me] ?? 0) >= 0 ? '+' : ''}${Math.round(c.income?.[me] ?? 0).toLocaleString('en')} a turn · upkeep ${Math.round(upkeep(c, me)).toLocaleString('en')}</small>`));
    const right = el('div', 'wc-actions');
    right.append(btn('Save / move', 'mp-btn', saveDialog), c.over ? el('span', 'wc-over', 'The war is over') : btn('End turn', 'deploy', endOfTurn), btn('×', 'wc-close', close));
    bar.append(right);
    return bar;
  }

  function goTheatre(id) { st.theatre = id; st.place = null; st.sel = null; st.msg = ''; render(); frame(id); }
  function tabs() {
    const t = el('div', 'seg wc-tabs');
    t.append(btn('The world', st.theatre == null ? 'on' : '', () => goTheatre(null)));
    for (const [id, th] of Object.entries(war.theatres)) t.append(btn(th.name, st.theatre === id ? 'on' : '', () => goTheatre(id)));
    return t;
  }

  function dispatch(l) {
    if (l.text) return `${l.date ? longDate(l.date) + ': ' : ''}${l.text}`;
    if (l.destroyed) return `${l.destroyed} has been destroyed.`;
    if (l.surrendered) return `${l.surrendered} has surrendered.`;
    if (l.depotLost) return `${nameOf(l.depotLost)} has fallen.`;
    if (l.kind) return `Turn ${l.turn}: ${l.kind === 'sea' ? 'battle in' : l.kind === 'coastal' ? 'landing at' : 'battle for'} ${nameOf(l.at)} — ${l.margin >= 0.6 ? `${SIDE[l.side]} victory` : l.margin >= 0.45 ? 'undecided' : `${SIDE[l.side]} thrown back`}.`;
    return '';
  }

  function seen(id) { // (enemy counters: where we stand or next door, or a sea zone we hold)
    if (war.seas[id]) return forcesAt(c, id, me).length > 0 || war.seas[id].coasts.some((k) => c.provinces[k].owner === me);
    return c.provinces[id].owner === me || war.provinces[id].land.some((n) => c.provinces[n].owner === me);
  }

  /** The screen layer over the map: pins (near ones as one), roads, sea lanes, order arrows, counters — redrawn on every pan and zoom. */
  let nodeOf = {};
  function drawOverlay() {
    const t = map.t, k = t.k / (map.kMin || t.k), sf = selected(), ok = supplied(c, war, me);
    const rank = (id) => (sf?.at === id ? 0 : st.reach.has(id) ? 1 : c.provinces[id]?.depot ? 2 : PL[id].sea ? 4 : 3);
    const nodes = [];
    nodeOf = {};
    for (const id of Object.keys(PL).sort((a, b) => rank(a) - rank(b))) {
      const x = t.applyX(PL[id].x), y = t.applyY(PL[id].y);
      let n = nodes.find((m) => m.sea === PL[id].sea && Math.hypot(m.x - x, m.y - y) < CLUSTER);
      if (!n) nodes.push((n = { ids: [], sea: PL[id].sea, x, y }));
      n.ids.push(id);
      nodeOf[id] = n;
    }
    let s = '';
    if (k < 2.2) for (const th of Object.values(war.theatres)) { const [x, y] = map.xy(th.lon, th.lat); s += `<text class="wc-theatre" x="${t.applyX(x)}" y="${t.applyY(y)}" text-anchor="middle">${esc(th.name)}</text>`; }
    const seenLinks = new Set();
    const link = (a, b, cls) => { const A = nodeOf[a], B = nodeOf[b]; if (!A || !B || A === B) return; const key = [nodes.indexOf(A), nodes.indexOf(B), cls].sort().join(); if (seenLinks.has(key)) return; seenLinks.add(key); s += `<line class="${cls}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`; };
    for (const [id, z] of Object.entries(war.seas)) { for (const n of z.seas) link(id, n, 'wc-lane'); for (const n of z.coasts) link(id, n, 'wc-coast'); }
    for (const [id, p] of Object.entries(war.provinces)) for (const n of p.land) link(id, n, 'wc-road');
    let arrows = '';
    for (const [fid, o] of Object.entries(c.orders[me])) {
      const f = forceById(c, +fid), A = nodeOf[f?.at], B = nodeOf[o.to];
      if (!A || !B || A === B) continue;
      const d = Math.hypot(B.x - A.x, B.y - A.y), cut = Math.max(0, (d - 16) / d), ex = A.x + (B.x - A.x) * cut, ey = A.y + (B.y - A.y) * cut;
      const bow = Math.min(40, d * 0.14), cx = (A.x + ex) / 2 - ((B.y - A.y) / d) * bow, cy = (A.y + ey) / 2 + ((B.x - A.x) / d) * bow; // (drawn by hand: bowed)
      const attack = war.provinces[o.to] && c.provinces[o.to].owner !== me;
      arrows += `<path class="wc-order${attack ? ' attack' : ''}${o.land ? ' landing' : ''}" d="M${A.x.toFixed(1)},${A.y.toFixed(1)}Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}" marker-end="url(#wm-arrow)"/>`;
    }
    s += `<g filter="url(#wm-pencil)">${arrows}</g>`;
    const boxes = [], vw = map.w ?? 2000, vh = map.h ?? 2000;
    /** A label where it fits: none over another (the ones that matter first — nodes come in rank order), a forced one always. */
    const label = (text, y, cls, x0, y0, force) => {
      const w = text.length * 6.6 + 6, b = [x0 - w / 2, y0 + y - 12, x0 + w / 2, y0 + y + 3];
      if (!force && boxes.some((q) => b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1])) return '';
      boxes.push(b);
      return `<text class="name${cls}" y="${y}" text-anchor="middle">${esc(text)}</text>`;
    };
    for (const n of nodes) {
      if (n.x < -80 || n.y < -80 || n.x > vw + 80 || n.y > vh + 80) continue; // (off the screen: not drawn)
      const ids = n.ids, one = ids.length === 1 ? ids[0] : null;
      const reach = ids.some((id) => st.reach.has(id)), land = one && st.reach.get(one)?.land;
      const own = c.forces.filter((f) => f.side === me && ids.includes(f.at));
      const theirs = c.forces.filter((f) => f.side === foe && ids.includes(f.at) && seen(f.at));
      let g = `<g class="wc-node${reach ? ` reach${land ? ' landing' : ''}` : ''}${ids.includes(st.place) ? ' sel' : ''}" data-ids="${ids.join(',')}" transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})">`;
      if (one && n.sea) g += `<circle class="hit" r="16"/><circle class="anchor" r="3"/>${label(nameOf(one), -9, ' sea', n.x, n.y, reach)}`;
      else if (one) {
        const P = c.provinces[one];
        const head = P.depot ? 7 : 5.5, hy = P.depot ? -24 : -20;
        g += `<g class="wc-pin ${P.owner}${P.depot ? ' depot' : ''}${P.owner === me && !ok.has(one) ? ' cut' : ''}"><circle class="hit" r="15" cy="-8"/>${P.fort ? '<circle class="fort" r="10"/>' : ''}<circle class="town" r="2.2"/>${war.provinces[one].airfield ? '<path class="field" d="M8,8h10M13,4v8"/>' : ''}
          <path class="pshadow" d="M0,0L${-hy * 0.5},${hy * 0.2}"/><circle class="pshadow" cx="${-hy * 0.55}" cy="${hy * 0.2}" r="${head}"/>
          <path class="needle" d="M0,0L-3,${hy + 2}"/><circle class="head" cx="-3" cy="${hy}" r="${head}" fill="url(#wm-ph-${P.contested ? 'gold' : P.owner})"/></g>`;
        if (k >= 2.5 || P.depot || reach || st.place === one || sf?.at === one) g += label(nameOf(one), hy - head - 5, '', n.x, n.y, reach || st.place === one || sf?.at === one);
      } else {
        const provs = ids.filter((id) => !PL[id].sea), nato = provs.filter((id) => c.provinces[id].owner === 'nato').length;
        const lead = ids.find((id) => c.provinces[id]?.depot) ?? ids[0];
        g += `<g class="wc-pin cluster ${n.sea ? 'sea' : nato * 2 >= provs.length ? 'nato' : 'pact'}"><circle class="hit" r="16"/><circle class="disc" r="11" filter="url(#wm-shadow)"/><circle class="edge" r="9"/><text class="count" y="4.5" text-anchor="middle">${ids.length}</text></g>${label(`${nameOf(lead)} +${ids.length - 1}`, -16, n.sea ? ' sea' : '', n.x, n.y, false)}`;
      }
      g += pile(own, 16, 'own') + pile(theirs, -16, 'foe');
      s += `${g}</g>`;
    }
    map.over.innerHTML = s;
  }
  /** A pile of counters beside a pin: the top one face up, the rest peeking out under it, the number on it. */
  function pile(fs, dx, kind) {
    if (!fs.length) return '';
    const top = fs.find((f) => f.id === st.sel) ?? fs[0], n = fs.length, x = dx + (dx > 0 ? 8 : -8), tilt = ((top.id * 37) % 9) - 4;
    let s = `<g class="wc-pile" data-pile="${kind}" transform="translate(${x} 14) rotate(${tilt})">`;
    for (let i = Math.min(n, 3) - 1; i > 0; i--) s += `<rect class="face under ${top.side}" x="${-15 + i * 3}" y="${-11 - i * 3}" width="30" height="22" rx="1.5" filter="url(#wm-shadow)"/>`;
    s += `<g class="wc-counter ${top.side}${top.id === st.sel ? ' sel' : ''}${c.orders[me][top.id] ? ' ordered' : ''}"><title>${esc(fs.map((f) => f.name).join(' · '))}</title><rect class="face" x="-15" y="-11" width="30" height="22" rx="1.5" filter="url(#wm-shadow)"/>${top.kind === 'army' ? '<rect class="frame" x="-11" y="-7" width="22" height="13"/>' : ''}<g class="sym" transform="translate(0 -0.5) scale(0.95)">${glyph(top)}</g><rect class="str" x="-12" y="8" width="${(24 * strength(top)).toFixed(1)}" height="1.8"/></g>`;
    if (n > 1) s += `<g class="wc-badge"><rect x="9" y="-19" width="13" height="12" rx="1" filter="url(#wm-shadow)"/><text x="15.5" y="-10" text-anchor="middle">${n}</text></g>`;
    return `${s}</g>`;
  }

  /** Select a force: its place and where it can go must be on screen, each on a pin of its own — else the map moves there. */
  function choose(f) {
    st.sel = f.id; st.place = f.at; st.msg = ''; render();
    const ids = [f.at, ...st.reach.keys()];
    const r = map.svg.getBoundingClientRect();
    if (ids.some((id) => !nodeOf[id] || nodeOf[id].ids.length > 1 || nodeOf[id].x < 0 || nodeOf[id].y < 0 || nodeOf[id].x > r.width || nodeOf[id].y > r.height)) map.flyTo(ids.map((id) => [PL[id].x, PL[id].y]), 120);
  }
  map.svg.addEventListener('click', (ev) => {
    const node = ev.target.closest('[data-ids]');
    if (!node) return;
    const ids = node.dataset.ids.split(','), pileKind = ev.target.closest('[data-pile]')?.dataset.pile, sf = selected();
    if (ids.length > 1) return map.flyTo(ids.map((id) => [PL[id].x, PL[id].y]), 120); // (a cluster: closer)
    const id = ids[0];
    if (sf && pileKind !== 'own' && (st.reach.has(id) || id === sf.at)) {
      const why = order(c, war, me, sf.id, id, st.reach.get(id) ?? {});
      st.msg = why ? `Not possible: ${why}.` : '';
      return render();
    }
    if (pileKind === 'own') { const mine = c.forces.filter((f) => f.side === me && f.at === id); return choose(mine[(mine.findIndex((f) => f.id === st.sel) + 1) % mine.length]); }
    st.place = id; st.sel = null; st.msg = ''; render();
  });

  /** The forces at a place in the drawer: ours to pick, theirs where we can see them. */
  function forcesHere(d, id) {
    const fs = c.forces.filter((f) => f.at === id && (f.side === me || seen(id)));
    if (!fs.length) return;
    d.append(el('h4', 'wc-th', 'Here'));
    for (const f of fs) {
      const b = btn(`<b>${esc(f.name)}</b><small>${Math.round(strength(f) * 100)} %${c.orders[me][f.id] ? ` · to ${esc(nameOf(c.orders[me][f.id].to))}` : ''}</small>`, `wc-force ${f.side}`, () => { if (f.side === me) choose(f); });
      b.disabled = f.side !== me;
      d.append(b);
    }
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
      forcesHere(d, id);
      if (P.depot === me && P.owner === me) {
        const armies = [...new Set(c.forces.filter((x) => x.side === me && x.kind === 'army' && war.provinces[x.at]?.theatre === p.theatre).map((x) => x.army))];
        const army = armies[0] ?? (me === 'nato' ? 'us' : 'wh');
        for (const kind of Object.keys(war.battalions)) {
          const cost = war.battalions[kind].reduce((a, t) => a + (c.power[t] ?? 120), 0);
          d.append(btn(`Raise ${kind} battalion · ${cost}`, 'mp-btn', () => { const r = raise(c, war, me, army, id, kind); st.msg = r ? `A ${kind} battalion joins ${r.name}.` : `Not possible: not enough production, or no room here (at most ${STACK.army} army groups).`; render(); }));
        }
        if (p.port) for (const kind of Object.keys(war.fleets)) {
          d.append(btn(`Build ${kind} fleet · ${fleetCost(c, war, kind)}`, 'mp-btn', () => { const r = raiseFleet(c, war, me, army, id, kind); st.msg = r ? `${r.name} puts to sea in ${nameOf(r.at)}.` : `Not possible: not enough production, or no room off this port (at most ${STACK.fleet} fleets a sea zone).`; render(); }));
        }
        if (p.airfield) d.append(btn(`Form air wing · ${airCost()}`, 'mp-btn', () => { const r = raiseAir(c, war, me, army, id); st.msg = r ? `${r.name} is formed at ${nameOf(id)}.` : 'Not possible: not enough production.'; render(); }));
      }
      return d;
    }
    if (id && war.seas[id]) {
      d.append(el('span', 'cp-kicker', 'Sea zone'), el('h3', '', esc(war.seas[id].name)));
      d.append(el('p', 'cp-hint', mapName(c.seas[id].map) ? `Battles here: <b>${esc(mapName(c.seas[id].map))}</b>` : 'No sea map here yet: battles are resolved'));
      forcesHere(d, id);
      return d;
    }
    d.append(el('span', 'cp-kicker', 'Orders'), el('h3', '', st.theatre ? esc(war.theatres[st.theatre].name) : 'The war'));
    d.append(el('p', 'cp-hint', 'Click one of your counters, then a highlighted place: a road next door to move or attack, a coast across the water to land (a fleet of yours must hold the sea off it). Scroll or pinch to zoom, drag to pan; a numbered pin is several places — click it to zoom in.'));
    const ordered = Object.keys(c.orders[me]).length;
    d.append(el('p', 'cp-hint', `${ordered} order${ordered === 1 ? '' : 's'} given this turn · morale can reach ${Math.round(moraleCap(c, me))} at most with the ground you hold`));
    for (const [tid, th] of Object.entries(war.theatres)) {
      if (st.theatre && st.theatre !== tid) continue;
      const provs = Object.keys(war.provinces).filter((k) => war.provinces[k].theatre === tid);
      const n = provs.filter((k) => c.provinces[k].owner === 'nato').length, q = provs.length - n;
      const forces = (sd) => c.forces.filter((f) => f.side === sd && theatreOf(f.at) === tid).length;
      const prio = el('div', 'seg wc-prio');
      prio.title = 'Priority: how much of your reserves this theatre’s battles draw (the AI sets its own)';
      for (const [name, k] of Object.entries(PRIORITY)) prio.append(btn(name, (c.priority[me][tid] ?? 1) === k ? 'on' : '', () => { c.priority[me][tid] = k; render(); }));
      d.append(btn(`<span class="wc-kicker">${esc(th.name)}</span>${provs.length ? `<span class="wc-bar"><i class="nato" style="flex:${n || 0.001}"></i><i class="pact" style="flex:${q || 0.001}"></i></span><span class="wc-line">${n} of ${provs.length} provinces Allied</span>` : '<span class="wc-line">the sea lanes</span>'}<span class="wc-line">Allies ${forces('nato')} forces · Axis ${forces('pact')} forces</span>`, 'wc-card', () => goTheatre(tid)), prio);
    }
    d.append(el('h3', 'menu-sub', 'Dispatches'));
    const news = c.log.slice(-10).reverse().map(dispatch).filter(Boolean);
    for (const n of news) d.append(el('p', 'wc-news', esc(n)));
    if (!news.length) d.append(el('p', 'cp-hint', 'Nothing yet: the war’s first turn.'));
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
      box.append(el('p', 'cp-hint', 'Every clash on every front this turn. Fight it on its map, have the AI fight it on its map for you (fast-forward, one after another), or resolve it at once.'));
      if (c.queue?.length) {
        const next = c.board.find((x) => x.id === c.queue[0] && !x.done);
        const bar = el('div', 'wc-queue', `<b>Delegated battles:</b> ${c.queue.length} to go — next: ${esc(next ? nameOf(next.at) : '')}`);
        const stop = btn('Stop delegating', 'mp-btn', () => { clearTimeout(qTimer); c.queue = []; autosave(c); draw(); });
        bar.append(stop);
        box.append(bar);
        clearTimeout(qTimer);
        qTimer = next ? setTimeout(() => { if (modal.isConnected && c.queue?.length) launch(next, true); }, 2500) : 0;
        if (!next) c.queue = [];
      }
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
            const why = fightable(c, war, b);
            const fight = btn('Fight', 'mp-btn', () => launch(b, false)), del = btn('Delegate', 'mp-btn', () => launch(b, true));
            fight.disabled = del.disabled = !!why;
            fight.title = del.title = why ? `Resolved only: ${why}` : '';
            acts.append(fight, del, btn('Resolve', 'mp-btn', () => { settle(c, war, b.id, { ...autoResolve(c, war, b.id), how: 'auto' }); draw(); }));
            row.append(acts);
          }
          box.append(row);
        }
      }
      const open = c.board.filter((b) => !b.done).length;
      const row = el('div', 'deploy-row');
      const canFight = c.board.filter((b) => !b.done && !fightable(c, war, b));
      if (canFight.length && !c.queue?.length) row.append(btn(`Delegate all on their maps (${canFight.length})`, 'mp-btn', () => { c.queue = canFight.map((b) => b.id); launch(canFight[0], true); }));
      if (open) row.append(btn(`Resolve the rest (${open})`, 'mp-btn', () => { c.queue = []; for (const b of c.board) if (!b.done) settle(c, war, b.id, { ...autoResolve(c, war, b.id), how: 'auto' }); draw(); }));
      else row.append(btn('Continue', 'deploy', () => { modal.remove(); finish(); }));
      box.append(row);
    };
    draw();
    modal.append(box);
    room.append(modal);
  }

  /** Off to the battle: the campaign saved as it stands (the board half done), the war room closed, the battle started. */
  async function launch(b, delegate) {
    await autosave(c);
    room.remove();
    onBattle(battleChoice(c, war, b, { delegate }));
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
  frame(null, 0);
  if (c.board.length) battleBoard(); // (back from a battle in the middle of a turn: the board, as it was left)
  return { close };
}
