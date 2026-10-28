// Main menu, built into the title screen (#loading): Single player (pick a mode and a map,
// then deploy, as either side, against the AI — with direct control), Multiplayer (ui/Lobby.js:
// host or join a friend's battle), Units (a 3D preview of every unit for both sides, with
// stats), Settings. Modes and maps come straight from their registries, so new ones show up
// here by themselves. `onDeploy({ mode, map, side, net? })` starts the battle.
import { GAME } from '../data/game.js';
import { MODES, DEFAULT_MODE } from '../modes/index.js';
import { MAPS, DEFAULT_MAP } from '../maps/index.js';
import { UNIT_TYPES } from '../data/units/index.js';
import { FACTIONS } from '../data/factions.js';
import { buildSettings } from './SettingsPanel.js';
import { UnitPreview, INFANTRY_POSES, VEHICLE_POSES, AIRCRAFT_POSES } from './UnitPreview.js';
import { KINDS } from '../systems/AirStrike.js';
import { Lobby } from './Lobby.js';
import { CampaignPanel } from './CampaignPanel.js';
import { takeMenuTab } from '../core/replay.js';
import { TIMES, WEATHER } from '../core/Conditions.js';
import { RULE_OPTIONS, rulesFrom } from '../data/rules.js';
import { CODEX } from '../data/codex.js';
import { keyOf } from '../core/Keys.js';

/** Two rows of segmented buttons: time of day and weather (core/Conditions.js). */
export function conditionsPicker(choice, onChange = () => {}) {
  const box = el('div', 'conditions');
  for (const [key, list, label] of [['time', TIMES, 'Time'], ['weather', WEATHER, 'Weather']]) {
    const row = el('div', 'cond-row');
    row.append(el('span', 'cond-label', label));
    const seg = el('div', 'seg');
    for (const [id, def] of Object.entries(list)) {
      const b = el('button', id === choice[key] ? 'on' : '', def.name);
      b.type = 'button';
      b.addEventListener('click', () => {
        for (const o of seg.children) o.classList.toggle('on', o === b);
        choice[key] = id;
        onChange();
      });
      seg.append(b);
    }
    row.append(seg);
    box.append(row);
  }
  return box;
}

/**
 * Battle rules (data/rules.js) as rows of choices. `economy`: also the command-point and
 * strength rows (point-capture modes). Remembered between visits in localStorage.
 */
const RULES_KEY = 'coldsteel.rules';
export function loadRules() {
  try { return rulesFrom(JSON.parse(localStorage.getItem(RULES_KEY) ?? 'null')); } catch { return rulesFrom(null); }
}
function rulesPicker(rules, economy) {
  const box = el('div', 'conditions rules');
  const rows = [['difficulty', 'AI difficulty', 'How well the enemy shoots, how fast it earns and how soon it attacks'], ['air', 'Air support', 'Helicopters, jets and air assault for both sides'], ['changingWeather', 'Weather', 'Every few minutes the weather moves on — rain, fog, clearing skies — with a radio warning first']];
  if (economy) rows.push(
    ['startCp', 'Starting CP', 'Command points each side starts with'],
    ['income', 'CP income', 'How fast both sides earn command points'],
    ['strength', 'Battle length', 'Front strength: how much each side can lose before its front collapses'],
    ['maxStacks', 'Stack limit', 'Units each side may have in the field'],
  );
  for (const [key, label, hint] of rows) {
    const row = el('div', 'cond-row');
    const l = el('span', 'cond-label', label);
    l.title = hint;
    row.append(l);
    const seg = el('div', 'seg');
    for (const [v, text] of RULE_OPTIONS[key]) {
      const b = el('button', v === rules[key] ? 'on' : '', text);
      b.type = 'button';
      b.title = hint;
      b.addEventListener('click', () => {
        for (const o of seg.children) o.classList.toggle('on', o === b);
        rules[key] = v;
        try { localStorage.setItem(RULES_KEY, JSON.stringify(rules)); } catch { /* private mode */ }
      });
      seg.append(b);
    }
    row.append(seg);
    box.append(row);
  }
  return box;
}

/**
 * On a phone or tablet: battles are played sideways and full screen. Both need the tap that
 * starts the battle (browsers refuse them otherwise); iPhones allow neither, so the battle
 * also asks to be turned (css: #rotate-hint).
 */
function landscape() {
  if (!matchMedia('(pointer: coarse)').matches) return;
  const root = document.documentElement;
  const full = document.fullscreenElement ? Promise.resolve() : root.requestFullscreen?.({ navigationUI: 'hide' });
  Promise.resolve(full).then(() => screen.orientation?.lock?.('landscape')).catch(() => { /* not allowed here */ });
}

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

const POSE_LABEL = { idle: 'At ease', aim: 'Aim', kneel: 'Kneel', prone: 'Prone', walk: 'Walk', run: 'Run', reload: 'Reload', traverse: 'Traverse', drive: 'Drive', fire: 'Fire', hover: 'Hover', fly: 'Fly' };
const AIR_LABEL = { heli: 'Helicopter', jet: 'Jet', lift: 'Transport' }; // support powers in the units list

/** Rows for an aircraft's stats card (systems/AirStrike.js KINDS, data/air.ts). */
function aircraftRows(kind, faction) {
  const p = KINDS[kind];
  const a = p.aircraft[faction];
  const rows = [
    ['Support power', `${p.label} · key ${keyOf({ heli: 'heli', jet: 'jet', lift: 'lift' }[kind]) ?? p.key}`],
    ['Cost', `${p.cost} CP · ready again after ${p.cooldown} s`],
    ['Speed', `${Math.round(p.attackSpeed * 3.6)}–${Math.round(p.cruiseSpeed * 3.6)} km/h`],
    ['Toughness', `${a.hp} hits from ground fire; missiles do several at once`],
  ];
  if (a.gun) rows.push(['Gun', `${a.gun.rate} rounds/s`]);
  if (a.rockets) rows.push([kind === 'jet' && a.rockets.count <= 4 ? 'Missiles' : 'Rockets', `${a.rockets.count}`]);
  if (a.squad) rows.push(['Carries', '8-man air assault squad, landed on the spot']);
  return rows;
}

/** Rows for the stats card. */
function statRows(type) {
  const s = type.stats;
  const sp = type.specialist?.stats;
  const vehicle = type.kind !== 'infantry';
  const rows = [
    [vehicle ? 'Vehicles' : 'Men', type.formation.count],
    ['Cost', `${type.cost} CP`],
    ['Speed', `${Math.round(s.speed * 3.6)} km/h`],
    ['Sight', `${s.sight} m`],
    ['Range', (sp ?? s).range <= 1 ? (s.antiAir ? 'no ground weapon' : 'unarmed') : `${(sp ?? s).minRange ? `${(sp ?? s).minRange}–` : ''}${s.gunRange ?? (sp ?? s).range} m`],
  ];
  if (vehicle) {
    rows.push(['Hit points', s.hp]);
    rows.push(['Armour', `${Math.round(s.armor * 100)} % front · ${Math.round(s.armor * 70)} % side · ${Math.round(s.armor * 35)} % rear`]);
  } else {
    rows.push(['Toughness', 'one solid hit usually downs a man']);
  }
  const w = sp ?? s;
  if (w.fireCooldown < 0.2) rows.push(['Fire', `rapid fire, ${w.magSize}-round bursts`]);
  else rows.push(['Fire', `${w.burst > 1 ? `${w.burst}-round bursts` : 'single shots'}, every ${w.fireCooldown} s`]);
  const aa = s.antiAir ?? sp?.antiAir;
  if (aa) rows.push(['Anti-air', aa.missile ? `heat-seeking missiles, ${aa.count} ready, out to ${aa.range} m` : `radar-directed, out to ${aa.range} m`]);
  if (s.repair) rows.push(['Repairs', `vehicles within ${s.repair.range} m, mends blown tracks`]);
  if (s.heal) rows.push(['Heals', `wounded infantry within ${s.heal.range} m`]);
  if (s.observer) rows.push(['Observes', `indirect fire on what they see: ${Math.round(s.observer.scatter * 100)} % of the scatter`]);
  if (s.atgm) rows.push(['Missile', `${s.atgm.count} per vehicle, out to ${s.atgm.range} m`]);
  if (s.stealth) rows.push(['Stealth', `spotted at ${Math.round(s.stealth * 100)} % of the usual range; holds fire while hidden`]);
  if (s.binoculars) rows.push(['Binoculars', `sight ×1.25 when standing still`]);
  if (s.carries) rows.push(['Carries', `${s.carries.count}-man rifle squad (${keyOf('unload')} unloads)`]);
  if (s.smoke) rows.push(['Smoke', `${s.smoke.charges} launcher salvos (${keyOf('smoke')})`]);
  if (sp?.smokeRounds) rows.push(['Smoke', `${sp.smokeRounds} smoke bombs (${keyOf('smoke')})`]);
  if (w.splash) rows.push(['Blast', `${w.splash} m radius`]);
  rows.push(['Against armour', w.antiArmor || (w.vsArmor ?? 1) >= 0.5 ? 'effective' : 'next to nothing']);
  return rows;
}

export class MainMenu {
  constructor(root, { onDeploy }) {
    this.root = root;
    this.onDeploy = onDeploy;
    this.choice = { mode: DEFAULT_MODE, map: DEFAULT_MAP, side: 'nato', time: 'day', weather: 'overcast', rules: loadRules() };
    this.unit = { id: 'rifles', faction: 'nato', pose: 'idle' };
    this.build();
    this.open(takeMenuTab() ?? 'battle');
  }

  build() {
    const r = this.root;
    r.classList.add('menu-open');
    r.replaceChildren();
    const side = el('aside', 'menu-side');
    side.append(el('div', 'ts-brand', `<h1>${GAME.title}</h1><p>${GAME.tagline}</p>`));
    const nav = el('nav', 'menu-nav');
    this.tabs = {};
    for (const [id, label] of [['bootcamp', 'Boot camp'], ['battle', 'Single player'], ['campaign', 'Campaign'], ['multi', 'Multiplayer'], ['units', 'Units'], ['settings', 'Settings']]) {
      const b = el('button', '', label);
      b.type = 'button';
      b.addEventListener('click', () => this.open(id));
      nav.append(b);
      this.tabs[id] = b;
    }
    side.append(nav, el('p', 'menu-blurb', GAME.blurb));
    this.panel = el('section', 'menu-panel');
    r.append(side, this.panel);
  }

  open(id) {
    for (const [k, b] of Object.entries(this.tabs)) b.classList.toggle('on', k === id);
    if (id !== 'units' && this.preview) { this.preview.dispose(); this.preview = null; }
    this.panel.replaceChildren();
    this.panel.dataset.panel = id;
    if (id === 'battle') this.battlePanel();
    else if (id === 'bootcamp') this.bootcampPanel();
    else if (id === 'campaign') {
      this.panel.append(new CampaignPanel({ onBattle: (choice) => this.deploy(choice) }).root);
    } else if (id === 'multi') {
      this.lobby ??= new Lobby({ onStart: (choice) => this.deploy(choice) });
      this.panel.append(this.lobby.root);
    } else if (id === 'units') this.unitsPanel();
    else {
      this.panel.append(el('h2', '', 'Settings'));
      const box = el('div', 'settings');
      buildSettings(box);
      this.panel.append(box);
    }
  }

  // ------------------------------------------------------------------ battle

  battlePanel() {
    const p = this.panel;
    p.append(el('h2', '', 'Single player'));
    p.append(el('p', 'mp-lead', 'Against the AI. Command from above, or take direct control of any of your squads and vehicles (Tab, or double-click a stack).'));
    p.append(el('h3', 'menu-sub', 'Game mode'));
    const modes = el('div', 'cards');
    for (const m of Object.values(MODES).filter((m) => !m.hidden)) {
      modes.append(this.card(m.name, m.description, this.choice.mode === m.id, () => { this.choice.mode = m.id; this.drawRules(); }, modes));
    }
    p.append(modes);

    p.append(el('h3', 'menu-sub', 'Map'));
    const maps = el('div', 'cards');
    for (const m of Object.values(MAPS)) {
      maps.append(this.card(m.name, m.description ?? '', this.choice.map === m.id, () => { this.choice.map = m.id; }, maps));
    }
    p.append(maps);

    p.append(el('h3', 'menu-sub', 'Side'));
    const sides = el('div', 'cards sides');
    const sideText = {
      nato: 'Defend the West German border: dig in, hold the villages, break the offensive.',
      pact: 'Punch through the Fulda Gap: mass your guards, find the weak point, take Hünfeld.',
    };
    for (const f of ['nato', 'pact']) {
      sides.append(this.card(FACTIONS[f].name, sideText[f], this.choice.side === f, () => { this.choice.side = f; }, sides, f));
    }
    p.append(sides);

    p.append(el('h3', 'menu-sub', 'Conditions'));
    p.append(conditionsPicker(this.choice));

    p.append(el('h3', 'menu-sub', 'Battle rules'));
    this.rulesBox = el('div', 'rules-box');
    p.append(this.rulesBox);
    this.drawRules();

    const go = el('button', 'deploy', 'Deploy');
    go.type = 'button';
    go.addEventListener('click', () => this.deploy());
    const row = el('div', 'deploy-row');
    row.append(go);
    p.append(row);
  }

  bootcampPanel() {
    const p = this.panel;
    p.append(el('h2', '', 'Boot camp'));
    p.append(el('p', 'mp-lead', 'New to Cold Steel? A short, guided exercise near your base on the Fulda Gap — about ten minutes, nothing to lose.'));
    const list = el('ol', 'bc-steps');
    for (const s of ['Moving the command camera', 'Selecting and moving a squad', 'Attacking and suppression', 'Mortar smoke', 'Artillery and forward observers', 'Direct control of a soldier', 'Calling in reinforcements', 'Taking a control point']) {
      list.append(el('li', '', s));
    }
    p.append(list);
    const go = el('button', 'deploy', 'Start boot camp');
    go.type = 'button';
    go.addEventListener('click', () => this.deploy({ ...this.choice, mode: 'bootcamp', map: 'fulda-gap', side: 'nato', time: 'day', weather: 'clear' }));
    const row = el('div', 'deploy-row');
    row.append(go);
    p.append(row);
  }

  /** The rules rows for the chosen mode (economy rows only where command points matter). */
  drawRules() {
    if (!this.rulesBox) return;
    this.rulesBox.replaceChildren(rulesPicker(this.choice.rules, !!MODES[this.choice.mode]?.economy));
  }

  card(title, text, on, pick, group, extra = '') {
    const c = el('button', `card${on ? ' on' : ''} ${extra}`, `<b>${title}</b><span>${text}</span>`);
    c.type = 'button';
    c.addEventListener('click', () => {
      for (const o of group.children) o.classList.toggle('on', o === c);
      pick();
    });
    return c;
  }

  deploy(choice = this.choice) {
    landscape();
    this.preview?.dispose();
    this.preview = null;
    this.root.classList.remove('menu-open');
    this.root.replaceChildren(el('div', 'ts-brand', `<h1>${GAME.title}</h1><p>${GAME.tagline}</p>`), el('div', 'ts-menu', '<div id="ts-status">Deploying forces…</div>'));
    // let the loading screen paint before the heavy world build blocks the page
    requestAnimationFrame(() => setTimeout(() => this.onDeploy({ ...choice }), 30));
  }

  // ------------------------------------------------------------------ units

  unitsPanel() {
    const p = this.panel;
    p.append(el('h2', '', 'Units'));
    const wrap = el('div', 'units');
    const list = el('div', 'unit-list');
    const types = Object.values(UNIT_TYPES).filter((t) => !t.hidden);
    for (const t of types) {
      const b = el('button', t.id === this.unit.id ? 'on' : '', t.shortName);
      b.type = 'button';
      b.addEventListener('click', () => {
        for (const o of list.children) o.classList.toggle('on', o === b);
        this.unit.id = t.id;
        this.unit.pose = 'idle';
        this.showUnit();
      });
      list.append(b);
    }
    // the support powers' aircraft
    for (const kind of Object.keys(KINDS)) {
      const id = `air:${kind}`;
      const b = el('button', id === this.unit.id ? 'on air' : 'air', AIR_LABEL[kind]);
      b.type = 'button';
      b.addEventListener('click', () => {
        for (const o of list.children) o.classList.toggle('on', o === b);
        this.unit.id = id;
        this.unit.pose = 'hover';
        this.showUnit();
      });
      list.append(b);
    }
    const sideToggle = el('div', 'seg faction-seg');
    for (const f of ['nato', 'pact']) {
      const b = el('button', `${f}${f === this.unit.faction ? ' on' : ''}`, FACTIONS[f].name);
      b.type = 'button';
      b.addEventListener('click', () => {
        for (const o of sideToggle.children) o.classList.toggle('on', o === b);
        this.unit.faction = f;
        this.showUnit();
      });
      sideToggle.append(b);
    }
    const stage = el('div', 'unit-stage');
    const canvas = el('canvas', 'unit-canvas');
    canvas.setAttribute('aria-label', 'Unit preview — drag to turn, scroll to zoom');
    this.poses = el('div', 'seg pose-seg');
    stage.append(canvas, this.poses, el('small', 'unit-hint', 'Drag to turn · scroll to zoom'));
    this.info = el('div', 'unit-info');
    const left = el('div', 'unit-left');
    left.append(sideToggle, list);
    wrap.append(left, stage, this.info);
    p.append(wrap);
    this.preview = new UnitPreview(canvas);
    this.showUnit();
  }

  showAircraft(kind, faction) {
    const a = KINDS[kind].aircraft[faction];
    this.preview.showAircraft(kind, faction);
    if (!AIRCRAFT_POSES.includes(this.unit.pose)) this.unit.pose = 'hover';
    this.preview.setPose(this.unit.pose);
    this.poses.replaceChildren();
    for (const pose of AIRCRAFT_POSES) {
      const b = el('button', pose === this.unit.pose ? 'on' : '', POSE_LABEL[pose]);
      b.type = 'button';
      b.addEventListener('click', () => {
        for (const o of this.poses.children) o.classList.toggle('on', o === b);
        this.unit.pose = pose;
        this.preview.setPose(pose);
      });
      this.poses.append(b);
    }
    this.info.replaceChildren();
    this.info.className = `unit-info ${faction}`;
    this.info.append(el('p', 'unit-side', FACTIONS[faction].name));
    this.info.append(el('h3', '', a.name));
    if (a.weapon) this.info.append(el('p', 'unit-weapon', a.weapon));
    if (a.text) this.info.append(el('p', 'unit-text', a.text));
    const dl = el('dl', 'stats');
    for (const [k, val] of aircraftRows(kind, faction)) dl.append(el('dt', '', k), el('dd', '', String(val)));
    this.info.append(dl);
    this.codex(`air:${kind}`, faction);
  }

  /** The encyclopedia entry under the stats: use, strengths, counters, history (data/codex.js). */
  codex(id, faction) {
    const c = CODEX[id];
    if (!c) return;
    const text = (t) => t.replace(/\{(\w+)\}/g, (m, a) => keyOf(a));
    const box = el('div', 'codex');
    for (const [label, body] of [['How to use it', c.use], ['Strong against', c.strong], ['Weak against', c.weak], ['When the enemy has it', c.counter]]) {
      if (!body) continue;
      const row = el('div', 'codex-row');
      row.append(el('h4', '', label), el('p', '', ''));
      row.lastChild.textContent = text(body);
      box.append(row);
    }
    if (c[faction]) {
      const h = el('div', 'codex-row codex-history');
      h.append(el('h4', '', 'History'), el('p', '', ''));
      h.lastChild.textContent = c[faction];
      box.append(h);
    }
    this.info.append(box);
  }

  showUnit() {
    const { id, faction } = this.unit;
    if (id.startsWith('air:')) return this.showAircraft(id.slice(4), faction);
    const type = UNIT_TYPES[id];
    this.preview.show(id, faction);
    this.preview.setPose(this.unit.pose);
    const poses = type.kind === 'infantry' ? INFANTRY_POSES : VEHICLE_POSES;
    this.poses.replaceChildren();
    for (const pose of poses) {
      const b = el('button', pose === this.unit.pose ? 'on' : '', POSE_LABEL[pose]);
      b.type = 'button';
      b.addEventListener('click', () => {
        for (const o of this.poses.children) o.classList.toggle('on', o === b);
        this.unit.pose = pose;
        this.preview.setPose(pose);
      });
      this.poses.append(b);
    }
    const v = type.variants?.[faction] ?? { name: type.name, weapon: '', text: '' };
    this.info.replaceChildren();
    this.info.className = `unit-info ${faction}`;
    this.info.append(el('p', 'unit-side', FACTIONS[faction].name));
    this.info.append(el('h3', '', v.name));
    if (v.weapon) this.info.append(el('p', 'unit-weapon', v.weapon));
    if (v.text) this.info.append(el('p', 'unit-text', v.text));
    const dl = el('dl', 'stats');
    for (const [k, val] of statRows(type)) dl.append(el('dt', '', k), el('dd', '', String(val)));
    this.info.append(dl);
    this.codex(id, faction);
  }
}
