// The world campaign's screen (src/wcampaign): the war room. A paper map on the map table — theatres, provinces as pins,
// roads in ink, sea zones as water, every army group, fleet and air wing as a counter — the orders drawn as arrows,
// the battle board after each turn, the dispatches, and the save that goes to another device.
//   new WarRoomPanel({ onOpen })   the menu's Campaign tab: start a war, continue the last, load a code or a file
//   openWarRoom(campaign)          the full-screen war room over the menu
// Look: the real world (ui/WorldMap.js) in the map sheet's ink on the dark table, blue and red ground and pins, paper counters.
import { WW2 } from '../wcampaign/wars/ww2.js';
import { newCampaign, order, resolveTurn, autoResolve, settle, endTurn, forcesAt, forceById, power, supplied, dateOf, hourOf, enemy, landingZone, raise, refit, moraleCap, STACK, raiseFleet, raiseAir, fleetCost, airCost, upkeep, PRIORITY, ECON, MISSIONS, mission, airReach, income, winterNow, holderOf, AIR_WING } from '../wcampaign/engine.js';
import { writeLetter } from '../campaign/Letters.js';
import { showQR, scanQR } from './SaveQR.js';
import { aiTurn } from '../wcampaign/ai.js';
import { fightable, battleChoice, takeResult, clearResult, outcomeOf } from '../wcampaign/battle.js';
import { encode, decode, saveFile, autosave, listSaves, loadSave, toPieces } from '../wcampaign/save.js';
import { UNIT_TYPES } from '../data/units/index.js';
import { MAPS } from '../maps/index.js';
import { ARMIES } from '../data/factions.js';
import { airType } from '../systems/AirStrike.js';
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
/** The war's areas (war.areas, lon/lat) in the map's world units: where its ground is coloured. */
const areasOf = (map, war) => (war.areas ?? []).map((A) => A.map(([lon, lat]) => map.xy(lon, lat)));

// ---------------------------------------------------------------- the menu's Campaign tab

export class WarRoomPanel {
  constructor({ onOpen }) {
    this.onOpen = onOpen;
    this.back = this.applyResult(); // (a battle just fought: its result into the campaign, then straight back to the war room)
    this.root = el('div', 'campaign wc-start');
    this.choice = { side: 'nato', difficulty: 1, battles: 'normal' };
    this.render();
  }

  /**
   * Behind the Campaign tab: the world map on its paper (ui/WorldMap.js), still — no zoom, no clicks — with the ground each
   * side holds, the front and a pin for every province: from the last autosave, or as the war begins.
   */
  async backdrop(war, save) {
    const host = el('div', 'wc-backdrop');
    host.setAttribute('aria-hidden', 'true');
    const table = this.root.closest('.title-screen') ?? document.body; // (on the menu's table, as its map sheet: ui/MapSheet.js)
    table.querySelector('.wc-backdrop')?.remove();
    if (!this.root.isConnected || !matchMedia('(min-width: 901px)').matches) return; // (a phone: the panel fills the screen — no map behind it)
    table.prepend(host);
    const c = (save && await loadSave(save.key).catch(() => null)) ?? newCampaign(war, { side: 'nato', maps: mapsHere() });
    const map = new WorldMap(host, { neutral: war.neutral });
    map.sel.on('.zoom', null); // (a picture: nothing to drag or wheel)
    const pts = Object.entries(war.provinces).map(([id, p]) => { const [x, y] = map.xy(p.lon, p.lat); return { id, x, y, side: c.provinces[id].owner, depot: !!c.provinces[id].depot }; });
    map.onView = (t) => {
      map.over.innerHTML = pts.map((p) => `<circle class="wc-bd-pin ${p.side}" cx="${t.applyX(p.x).toFixed(1)}" cy="${t.applyY(p.y).toFixed(1)}" r="${p.depot ? 5 : 3.2}"/>`).join('')
        + Object.values(war.theatres).map((th) => { const [x, y] = map.xy(th.lon, th.lat); return `<text class="wc-theatre" x="${t.applyX(x)}" y="${t.applyY(y)}" text-anchor="middle">${esc(th.name)}</text>`; }).join('');
    };
    map.territory(pts.map((p) => ({ ...p, lon: war.provinces[p.id].lon, lat: war.provinces[p.id].lat })), areasOf(map, war));
    // the European fronts in the open part of the table, right of the menu
    const europe = pts.filter((p) => ['west', 'east', 'med'].includes(war.provinces[p.id].theatre)).map((p) => [p.x, p.y]);
    map.flyTo(europe, 6, 0, [0.74, 0.5]);
    map.load().catch(() => {});
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
    this.backdrop(war, saves[0]); // (the war's map behind the tab: the last save's front, or where it begins)
    if (saves.length) {
      const last = saves[0];
      const row = el('div', 'deploy-row');
      row.append(btn(`Continue — turn ${last.turn}`, 'deploy', async () => { const c = await loadSave(last.key); if (c) this.onOpen(arm(c)); }));
      r.append(row);
    }
    r.append(el('h3', 'menu-sub', 'A new war'));
    const start = Object.values(war.scenarios)[0];
    r.append(el('p', 'cp-hint', `The war begins on ${esc(longDate(start.start))} — ${esc(start.name.replace(/^[^:]*:\s*/, ''))}.`));
    const sides = el('div', 'cards sides');
    for (const f of ['nato', 'pact']) {
      const card = btn(`<b>${SIDE[f]}</b><span>${f === 'nato' ? 'Britain, the Soviet Union and the United States' : 'Germany and Japan'}</span>`, `card ${f}${this.choice.side === f ? ' on' : ''}`, () => { this.choice.side = f; for (const o of sides.children) o.classList.toggle('on', o === card); });
      sides.append(card);
    }
    const diff = el('div', 'seg');
    diff.title = 'The enemy’s edge in every battle’s result';
    for (const [label, k] of [['Easy', 0.85], ['Normal', 1], ['Hard', 1.2]]) {
      const b = btn(label, this.choice.difficulty === k ? 'on' : '', () => { this.choice.difficulty = k; for (const o of diff.children) o.classList.toggle('on', o === b); });
      diff.append(b);
    }
    const count = el('div', 'seg');
    count.title = 'How many of a turn’s battles go on the board to fight or delegate; the smaller rest are settled at once';
    for (const [label, k] of [['Small · 4 a turn', 'small'], ['Normal · 8', 'normal'], ['Grand · all', 'grand']]) {
      const b = btn(label, this.choice.battles === k ? 'on' : '', () => { this.choice.battles = k; for (const o of count.children) o.classList.toggle('on', o === b); });
      count.append(b);
    }
    r.append(sides, el('h3', 'menu-sub', 'Difficulty'), diff, el('h3', 'menu-sub', 'Battles'), count);
    const go = el('div', 'deploy-row');
    go.append(btn('Start the war', 'deploy', () => this.onOpen(arm(newCampaign(war, { side: this.choice.side, difficulty: this.choice.difficulty, battles: this.choice.battles, seed: Math.floor(Math.random() * 1e9), maps: mapsHere() })))));
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
    row.append(btn('Load the code', 'mp-btn', () => load(area.value)), btn('Open a save file', 'mp-btn', () => file.click()), btn('Scan QR codes', 'mp-btn', () => scanQR((code) => load(code))), file);
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
  document.querySelector('.wc-backdrop')?.remove(); // (the Campaign tab's map: one WorldMap at a time — their svg ids would clash; the tab draws it again on return)
  const room = el('div', 'wc-room');
  document.body.append(room);
  let qTimer = 0; // (the next delegated battle's countdown)
  const st = { theatre: null, sel: null, place: null, msg: '', reach: new Map() };
  const me = c.side, foe = enemy(me);
  let top = el('div'), tabBar = el('div'), side = el('div');
  const body = el('div', 'wc-body'), mapBox = el('div', 'wc-map');
  body.append(mapBox, side);
  room.append(top, tabBar, body);
  const map = new WorldMap(mapBox, { onView: () => drawOverlay(), neutral: war.neutral });
  const areas = areasOf(map, war);
  const tools = el('div', 'wc-zoom');
  tools.append(btn('+', '', () => map.zoomBy(2)), btn('−', '', () => map.zoomBy(0.5)), btn('⤢', '', () => frame(st.theatre)));
  tools.lastChild.title = 'Back to the whole theatre';
  mapBox.append(tools, el('div', 'cp-legend wc-legend', `<span class="ours">Allies</span><span class="theirs">Axis</span><span class="obj">Fort</span><span class="star">Objective</span><span class="cut">Cut off</span><span class="foe">Order: move · attack · landing</span>`));
  map.load().catch(() => { st.msg = 'The coastlines could not be loaded.'; render(); });
  const close = () => { map.dispose(); room.remove(); onClose(); document.removeEventListener('keydown', keys); };
  /** What an order does, in words: "Attacks Bobruisk", "Ships to Okinawa", "Rebases to Saipan". */
  const orderText = (f, o) => `${f.kind === 'air' ? 'Rebases to' : o.land ? (c.provinces[o.to]?.owner === me ? 'Ships to' : 'Lands on') : war.provinces[o.to] && c.provinces[o.to].owner !== me ? 'Attacks' : 'Moves to'} <b>${esc(nameOf(o.to))}</b>`;
  /** Take back a force's order (and an air wing's mission). */
  const cancel = (id, what = 'order') => { if (what === 'mission') delete c.missions?.[me]?.[id]; else delete c.orders[me][id]; st.msg = ''; render(); };
  // keys: Delete / Backspace takes back the chosen force's order (or its mission), Escape lets go of it
  const keys = (e) => {
    if (!room.isConnected || e.target.closest?.('input, textarea') || room.querySelector('.wc-modal')) return;
    const f = st.sel != null ? forceById(c, st.sel) : null;
    if ((e.key === 'Delete' || e.key === 'Backspace') && f) { e.preventDefault(); cancel(f.id, c.orders[me][f.id] ? 'order' : 'mission'); }
    else if (e.key === 'Escape' && (st.sel != null || st.place)) { e.preventDefault(); st.sel = null; st.place = null; st.airMode = null; st.msg = ''; render(); }
  };
  document.addEventListener('keydown', keys);

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
      if (war.provinces[f.at].port) {
        const near = new Set(war.provinces[f.at].seas ?? []);
        for (let i = 0; i < 2; i++) for (const z of [...near]) for (const n of war.seas[z].seas) near.add(n); // (within two sea zones of the port: engine.js landingZone)
        for (const k of Object.keys(war.provinces)) {
          const zs = war.provinces[k].seas ?? [];
          if (k === f.at || out.has(k) || !zs.length || !zs.some((z) => near.has(z))) continue;
          if (landingZone(c, war, me, f.at, k)) out.set(k, { land: true });
          else out.set(k, { needs: zs.filter((z) => near.has(z)) }); // (no fleet of ours off it yet: shown, not orderable)
        }
      }
    } else if (f.kind === 'fleet') for (const z of war.seas[f.at].seas) out.set(z, {});
    else if (st.airMode && st.airMode !== 'rebase') {
      for (const k of airReach(war, f.at)) {
        const sea = !!war.seas[k];
        if ((st.airMode === 'support' && sea) || (st.airMode === 'attack' && !sea && c.provinces[k].owner === me)) continue; // (support over land; attack the enemy's ground or any sea)
        out.set(k, { mission: st.airMode });
      }
    } else {
      for (const k of airReach(war, f.at)) if (k !== f.at && war.provinces[k]?.airfield && c.provinces[k].owner === me) out.set(k, {}); // (rebase: over land or sea)
    }
    return out;
  }
  const selected = () => (st.sel != null ? forceById(c, st.sel) : null);

  function render() {
    st.reach = targets(selected());
    const t2 = topBar(), b2 = tabs(), d2 = drawer();
    top.replaceWith(t2); tabBar.replaceWith(b2); side.replaceWith(d2);
    top = t2; tabBar = b2; side = d2;
    map.territory(Object.keys(war.provinces).map((id) => ({ x: PL[id].x, y: PL[id].y, side: c.provinces[id].owner, lon: war.provinces[id].lon, lat: war.provinces[id].lat })), areas);
    drawOverlay();
  }

  function topBar() {
    const bar = el('div', 'wc-top');
    const mor = (s) => `<span class="wc-morale ${s}"><i style="--m:${Math.max(0, Math.round(c.morale[s]))}%"></i>${SIDE[s]} ${Math.max(0, Math.round(c.morale[s]))}</span>`;
    bar.append(el('div', 'wc-date', `<b>${esc(longDate(dateOf(c)))}</b><small>turn ${c.turn} · ${esc(hourOf(c))}${winterNow(c, war) ? ` · <span class="wc-winter" title="${esc(war.winter.text.start)}">❄ winter in the ${esc(war.theatres[war.winter.theatre].name.replace(/^The /, ''))}</span>` : ''}</small>`),
      el('div', 'wc-morales', `${mor('nato')}${mor('pact')}`),
      el('div', 'wc-pool', `<small>production</small><b>${Math.round(c.pool[me]).toLocaleString('en')}</b><small title="income after upkeep, each turn · what isn't spent beyond ${ECON.stockTurns} turns' income is lost">${income(c, war, me).net >= 0 ? '+' : ''}${income(c, war, me).net.toLocaleString('en')} a turn · upkeep ${upkeep(c, me).toLocaleString('en')}</small>`));
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

  function seen(id) { // (enemy counters: where we stand or next door, or a sea zone we hold, or where our recon flew)
    if (c.seenBy?.[me]?.includes(id)) return true;
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
    for (const o of war.objectives ?? []) {
      const N = nodeOf[o.at], ob = c.objectives?.[o.id];
      if (!N || ob?.won) continue;
      s += `<text class="wc-star${ob?.holder ? ` ${ob.holder}` : ''}" x="${N.x - 17}" y="${N.y - 4}" text-anchor="middle"><title>${esc(o.name)}</title>★</text>`;
    }
    for (const [fid, m] of Object.entries(c.missions?.[me] ?? {})) {
      const f = forceById(c, +fid), A = nodeOf[f?.at], B = nodeOf[m.at];
      if (!A || !B) continue;
      s += `<g class="wc-mission ${m.kind}">${A !== B ? `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>` : ''}<circle cx="${B.x}" cy="${B.y}" r="19"/><text x="${B.x + 22}" y="${B.y - 18}">${esc(MISSIONS[m.kind]?.name ?? m.kind)}</text></g>`;
    }
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
      const reach = ids.some((id) => st.reach.has(id) && !st.reach.get(id).needs), land = one && st.reach.get(one)?.land, needs = one && st.reach.get(one)?.needs;
      const own = c.forces.filter((f) => f.side === me && ids.includes(f.at));
      const theirs = c.forces.filter((f) => f.side === foe && ids.includes(f.at) && seen(f.at));
      let g = `<g class="wc-node${reach ? ` reach${land ? ' landing' : ''}` : needs ? ' needs' : ''}${ids.includes(st.place) ? ' sel' : ''}" data-ids="${ids.join(',')}" transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})">`;
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
    if (st.sel !== f.id) st.airMode = null;
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
      const r = st.reach.get(id);
      if (r?.needs) { st.msg = `To land on ${nameOf(id)}, a fleet of yours must first hold ${r.needs.map(nameOf).join(' or ')} (no enemy fleet there). Move one in this turn — the landing can go next turn.`; return render(); }
      const why = r?.mission ? mission(c, war, me, sf.id, r.mission, id) : order(c, war, me, sf.id, id, r ?? {});
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
      if (f.kind !== 'air' || o) d.append(el('p', 'wc-order-line', o ? orderText(f, o) : 'Holds its ground. Click a highlighted place to move, attack or land.'));
      if (o) d.append(btn('Cancel order <small>(Delete)</small>', 'mp-btn wc-cancel', () => cancel(f.id)));
      if (f.kind === 'army' && war.provinces[f.at]?.port) d.append(el('p', 'cp-hint', 'In a port: it can land on an enemy coast or ship to one of ours across the sea. Red rings: possible now. Grey rings: a fleet of yours must first hold a sea zone off that coast (within two zones of this port) — click one to see which.'));
      if (f.kind === 'army') {
        for (const b of f.battalions) {
          const hp = b.units.reduce((a, u) => a + u.hp, 0) / b.units.length;
          d.append(el('div', 'wc-bn', `<span>${esc(b.kind)} battalion</span><span class="wc-hp"><i style="width:${Math.round(hp * 100)}%"></i></span><small>${b.units.length} stacks</small>`));
        }
        d.append(btn('Refit (production)', 'mp-btn', () => { const spent = refit(c, war, f); st.msg = spent ? `Refitted for ${spent} production.` : 'Nothing to refit, cut off, or not enough production.'; render(); }));
      } else if (f.kind === 'fleet') d.append(el('p', 'cp-hint', esc(f.ships.map((s) => s.t).join(', '))));
      else {
        d.append(el('p', 'cp-hint', esc(f.squadrons.map((s) => `${s.planes} ${s.k}${s.k === 'fighter' || s.k === 'bomber' ? 's' : ''}`).join(' · '))));
        const m = c.missions?.[me]?.[f.id];
        d.append(el('p', 'wc-order-line', m ? `Mission: <b>${MISSIONS[m.kind]?.name ?? m.kind}</b> over ${esc(nameOf(m.at))} — ${MISSIONS[m.kind]?.text ?? ''}` : 'No mission: air cover over its base. Pick a mission, then a highlighted place.'));
        if (m) d.append(btn('Cancel mission', 'mp-btn wc-cancel', () => cancel(f.id, 'mission')));
        const seg = el('div', 'seg wc-air');
        for (const [k, label] of [['rebase', 'Move'], ...Object.entries(MISSIONS).map(([k2, v]) => [k2, v.name])]) seg.append(btn(label, (st.airMode ?? 'rebase') === k ? 'on' : '', () => { st.airMode = k; render(); }));
        d.append(seg);
      }
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
        const sideName = ARMIES[army]?.name ?? army, have = Math.round(c.pool[me]);
        d.append(el('h4', 'wc-th', `Build here · ${sideName} · ${have.toLocaleString('en')} production`));
        // what each thing is, by this army's own names: its units, where it goes, what it costs and costs to keep
        const unitName = (t) => { const T = UNIT_TYPES[t]; return T?.variants?.[army]?.name ?? T?.variants?.[me]?.name ?? T?.shortName ?? T?.name ?? t; };
        const list = (types) => { const n = new Map(); for (const t of types) n.set(unitName(t), (n.get(unitName(t)) ?? 0) + 1); return [...n].map(([k, v]) => (v > 1 ? `${v} × ${k}` : k)).join(', '); };
        const card = (title, cost, what, where, keep, go) => {
          const b = btn(`<span class="wc-buy-top"><b>${esc(title)}</b><span>${cost.toLocaleString('en')}</span></span><span class="wc-buy-what">${esc(what)}</span><span class="wc-buy-where">${esc(where)} · upkeep ${keep} a turn</span>`, 'wc-buy', go);
          b.disabled = c.pool[me] < cost;
          if (b.disabled) b.title = `Not enough production: ${have.toLocaleString('en')} of ${cost.toLocaleString('en')}`;
          d.append(b);
        };
        const ROLE = { infantry: 'Infantry battalion', armour: 'Armoured battalion', artillery: 'Artillery battalion' };
        for (const kind of Object.keys(war.battalions)) {
          const types = war.battalions[kind], cost = types.reduce((a, t) => a + (c.power[t] ?? 120), 0);
          card(ROLE[kind] ?? `${kind} battalion`, cost, `${types.length} stacks: ${list(types)}`, `joins an army group of yours here (or one at the front with room), else a new group here`, ECON.upkeep.battalion,
            () => { const r = raise(c, war, me, army, id, kind); st.msg = r ? `A ${kind} battalion joins ${r.name}.` : `Not possible: no room here (at most ${STACK.army} army groups, ${STACK.battalions} battalions each).`; render(); });
        }
        const FLEET = { battle: 'Battle fleet', carrier: 'Carrier task force', escort: 'Escort group', amphibious: 'Landing fleet', submarines: 'Submarine flotilla' };
        const FLEET_FOR = { battle: 'fights other fleets', carrier: 'fights other fleets, its aircraft strike far', escort: 'guards convoys and landings, hunts submarines', amphibious: 'carries landings: a fleet of yours off a coast lets armies land', submarines: 'raids shipping, hard to find' };
        if (p.port) for (const kind of Object.keys(war.fleets)) {
          const types = war.fleets[kind];
          card(FLEET[kind] ?? `${kind} fleet`, fleetCost(c, war, kind), `${list(types)} — ${FLEET_FOR[kind] ?? ''}`, `puts to sea off ${nameOf(id)}`, ECON.upkeep.ship * types.length,
            () => { const r = raiseFleet(c, war, me, army, id, kind); st.msg = r ? `${r.name} puts to sea in ${nameOf(r.at)}.` : `Not possible: no room off this port (at most ${STACK.fleet} fleets a sea zone).`; render(); });
        }
        if (p.airfield) {
          const plane = (k) => { try { return airType(k, me, army)?.name; } catch { return null; } };
          const fighters = plane('cap'), strikers = plane('jet'), n = (k) => (AIR_WING[k] ?? 0) * 12;
          card('Air wing', airCost(), `${n('fighter')} ${fighters ?? 'fighters'}${fighters ? ' fighters' : ''} and ${n('strike')} ${strikers ?? 'strike aircraft'}${strikers ? ' fighter-bombers' : ''} — close support, reconnaissance and attacks on land or sea within two steps`, `formed at ${nameOf(id)}`, ECON.upkeep.squadron * Object.keys(AIR_WING).length,
            () => { const r = raiseAir(c, war, me, army, id); st.msg = r ? `${r.name} is formed at ${nameOf(id)}.` : 'Not possible.'; render(); });
        }
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
    d.append(el('p', 'cp-hint', 'Click one of your counters, then a highlighted place: a road next door to move or attack, a coast across the water to land or ship to (a fleet of yours must hold a sea zone off it — grey rings are coasts waiting for one). Scroll or pinch to zoom, drag to pan; a numbered pin is several places — click it to zoom in.'));
    const given = [...Object.entries(c.orders[me]).map(([id, o]) => ['order', +id, o]), ...Object.entries(c.missions?.[me] ?? {}).map(([id, m]) => ['mission', +id, m])]
      .map(([what, id, o]) => ({ what, f: forceById(c, id), o })).filter((x) => x.f && (!st.theatre || theatreOf(x.f.at) === st.theatre));
    d.append(el('p', 'cp-hint', `${given.length} order${given.length === 1 ? '' : 's'} given this turn${st.theatre ? ' here' : ''} · morale can reach ${Math.round(moraleCap(c, me))} at most with the ground you hold`));
    if (given.length) {
      const list = el('div', 'wc-orders');
      for (const { what, f, o } of given) {
        const row = el('div', 'wc-order-row');
        const name = btn(`<b>${esc(f.name)}</b> <span>${what === 'mission' ? `${MISSIONS[o.kind]?.name ?? o.kind} over ${esc(nameOf(o.at))}` : orderText(f, o)}</span>`, 'wc-order-go', () => choose(f));
        const x = btn('✕', 'wc-order-x', () => cancel(f.id, what));
        x.title = what === 'mission' ? 'Cancel this mission' : 'Cancel this order';
        row.append(name, x);
        list.append(row);
      }
      d.append(el('h4', 'wc-th', 'Orders this turn'), list);
    }
    for (const [tid, th] of Object.entries(war.theatres)) {
      if (st.theatre && st.theatre !== tid) continue;
      const provs = Object.keys(war.provinces).filter((k) => war.provinces[k].theatre === tid);
      const n = provs.filter((k) => c.provinces[k].owner === 'nato').length, q = provs.length - n;
      const forces = (sd) => c.forces.filter((f) => f.side === sd && theatreOf(f.at) === tid).length;
      const prio = el('div', 'seg wc-prio');
      prio.title = 'Priority: how much of your reserves this theatre’s battles draw (the AI sets its own)';
      for (const [name, k] of Object.entries(PRIORITY)) prio.append(btn(name, (c.priority[me][tid] ?? 1) === k ? 'on' : '', () => { c.priority[me][tid] = k; render(); }));
      const obj = (war.objectives ?? []).filter((o) => o.theatre === tid).map((o) => {
        const s = c.objectives?.[o.id] ?? {}, who = (x) => (x === 'nato' ? 'Allies' : 'Axis');
        return `<span class="wc-line wc-obj">★ ${esc(o.name)} — ${s.won ? `secured by the ${who(s.won)}` : s.holder ? `${who(s.holder)} ${s.turns}/${o.hold} turns` : `${s.start ? `the ${who(s.start)}’ to lose` : 'open'} · hold ${o.hold} turns: +${o.morale} morale`}</span>`;
      }).join('');
      d.append(btn(`<span class="wc-kicker">${esc(th.name)}</span>${provs.length ? `<span class="wc-bar"><i class="nato" style="flex:${n || 0.001}"></i><i class="pact" style="flex:${q || 0.001}"></i></span><span class="wc-line">${n} of ${provs.length} provinces Allied</span>` : '<span class="wc-line">the sea lanes</span>'}<span class="wc-line">Allies ${forces('nato')} forces · Axis ${forces('pact')} forces</span>${obj}`, 'wc-card', () => goTheatre(tid)), prio);
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

  /** A letter home from a man of one of our army groups in this turn's battles (the one fought on its map first, else the hardest). */
  function letterHome() {
    const VOICE = { us: 'us', usmc: 'us', sov: 'sov', wh: 'wh', fj: 'fj' }; // (the armies with letters of their own: campaign/Letters45.js)
    const ours = c.board.filter((b) => b.done).map((b) => ({ b, f: [...b.attackers, ...b.defenders, ...(b.support ?? [])].map((i) => forceById(c, i)).find((x) => x?.side === me && x.kind === 'army' && VOICE[x.army]) })).filter((x) => x.f);
    const pickB = ours.find((x) => x.b.how === 'fought') ?? ours.sort((x, y) => (y.b.lost?.[me] ?? 0) - (x.b.lost?.[me] ?? 0))[0];
    if (!pickB) return null;
    const { b, f } = pickB, army = VOICE[f.army];
    const shim = { side: me, army, battalion: f.battalions.flatMap((bn) => bn.units).map((u, i) => ({ cid: `${f.id}:${i}`, name: f.name, type: u.t })),
      writer: c.writers?.[army], letterUsed: c.letterUsed, turn: c.turn, day: c.turn, cut: f.cut };
    const lost = b.lost?.[me] ?? 0;
    const letter = writeLetter(shim, { name: nameOf(b.at), attacker: b.attackerSide, time: hourOf(c) }, { attackerWon: b.margin >= 0.6, lost, wounded: Math.round(lost * 1.5) });
    (c.writers ??= {})[army] = shim.writer;
    c.letterUsed = shim.letterUsed;
    c.letters = [...(c.letters ?? []), { ...letter, date: dateOf(c) }].slice(-12);
    return letter;
  }

  async function finish() {
    const before = c.log.length;
    let letter = null;
    try { letter = letterHome(); } catch (e) { console.warn('letter home', e); } // (a letter is a grace note: never in the way of the turn)
    endTurn(c, war);
    st.sel = null;
    await autosave(c);
    render();
    const news = c.log.slice(before).map(dispatch).filter(Boolean);
    if (news.length || c.over || letter) {
      const modal = el('div', 'wc-modal');
      const box = el('div', 'wc-modal-box wc-paper');
      box.append(el('span', 'cp-kicker', 'Dispatches'), el('h3', '', esc(longDate(dateOf(c)))));
      for (const n of news) box.append(el('p', '', esc(n)));
      if (letter) {
        const L = el('div', 'wc-letter');
        L.append(el('p', 'wc-letter-greet', esc(letter.greet)));
        for (const line of [letter.body.join(' ')]) L.append(el('p', '', esc(line)));
        L.append(el('p', 'wc-letter-sign', `${esc(letter.sign)}<br>${esc(letter.from)}${letter.unit ? `, ${esc(letter.unit)}` : ''}`));
        box.append(el('h4', 'wc-th', 'A letter home'), L);
      }
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
    box.append(el('p', 'cp-hint', `The war is saved in this browser after every turn. To go on elsewhere, take it along as a code (${(code.length / 1024).toFixed(1)} KB) or a file, and load it in the Campaign tab there — or show the ${pieces.length} QR code${pieces.length === 1 ? '' : 's'} below to the other device’s camera (Campaign tab: Scan QR codes).`));
    const area = el('textarea', 'wc-code');
    area.value = code;
    area.readOnly = true;
    const msg = el('p', 'cp-hint');
    const row = el('div', 'deploy-row');
    row.append(btn('Copy the code', 'mp-btn', async () => { try { await navigator.clipboard.writeText(code); msg.textContent = 'Copied.'; } catch { area.select(); msg.textContent = 'Select and copy it.'; } }),
      btn('Save as a file', 'mp-btn', () => saveFile(c)), btn('Close', 'deploy', () => modal.remove()));
    box.append(area, row, msg);
    showQR(box, code);
    modal.append(box);
    room.append(modal);
  }

  render();
  frame(null, 0);
  if (c.board.length) battleBoard(); // (back from a battle in the middle of a turn: the board, as it was left)
  return { close };
}
