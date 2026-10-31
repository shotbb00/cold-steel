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
import { CHAPTERS, chaptersDone, chapterBattle } from '../modes/bootcamp.js';
import { TIMES, WEATHER } from '../core/Conditions.js';
import { RULE_OPTIONS, rulesFrom, DIFFICULTY } from '../data/rules.js';
import { CODEX } from '../data/codex.js';
import { keyOf } from '../core/Keys.js';
import { MapSheet } from './MapSheet.js';
import { logo } from './Logo.js';

// shown on the loading screen while a battle is built
const TIPS = [
  'Infantry takes points; tanks cannot. Let the riflemen lead into the villages.',
  'Mortars and guns fire on anything your side can see. Forward observers make them land tight.',
  'Right-drag a move to choose which way the squad faces — and which side of the wall it takes.',
  'A pinned squad hugs the ground and barely fires back. Suppress first, then move.',
  'Smoke blinds both sides for about forty seconds. Lay it between the gun and your advance.',
  'At night, flares light the ground and thermal sights see through the dark (N in direct control).',
  'Engineers clear wire and mines. The enemy uses them too.',
  'Wounded men in a campaign come back after the next battle; the dead do not.',
];

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
function rulesPicker(rules, economy, onChange = () => {}) {
  const box = el('div', 'conditions rules');
  const rows = [['difficulty', 'AI difficulty', 'How well the enemy shoots, how fast it earns and how soon it attacks'], ['air', 'Air support', 'Helicopters, jets, air assault and gas for both sides'], ['changingWeather', 'Weather', 'Every few minutes the weather moves on — rain, fog, clearing skies — with a radio warning first'], ['timePasses', 'Time of day', 'The day goes on: a dusk battle runs into the night, a night one into the dawn']];
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
function statRows(type, faction) {
  const s = type.factionStats?.[faction] ? { ...type.stats, ...type.factionStats[faction] } : type.stats; // the side's own numbers (UnitStack does the same)
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
  const w = sp ? { ...s, ...sp } : s;
  const armed = w.range > 1 && (w.damage ?? 1) > 0; // ambulances, bridge layers: no gun to describe
  if (armed && w.fireCooldown < 0.2) rows.push(['Fire', `rapid fire, ${w.magSize}-round bursts`]);
  else if (armed) rows.push(['Fire', `${w.burst > 1 ? `${w.burst}-round bursts` : 'single shots'}, every ${w.fireCooldown} s`]);
  if (s.bridgeLayer) rows.push(['Bridge', `one, laid over a river in ~20 s (${keyOf('engineer')}, maps with a river)`]);
  const aa = s.antiAir ?? sp?.antiAir;
  if (aa) {
    const reach = aa.optical ? `the gunner's eyes: ${Math.round(aa.range * aa.optical)} m (${aa.range} m under an air search radar)` : `out to ${aa.range} m`;
    rows.push(['Anti-air', aa.shared ? `${s.atgm.count} missiles in one rack for aircraft and armour, ${reach}`
      : aa.missile ? `heat-seeking missiles, ${aa.count} ready, ${reach}` : aa.optical ? `cannon, ${reach}` : `radar-directed cannon, ${reach}`]);
    // can it hit back at the ground? (anti-air that can't needs the line in front of it)
    const gun = w.range > 1 && w.damage > 0 ? (s.gunRange && s.gunRange < w.range ? s.gunRange : w.range) : 0;
    const ground = [];
    if (s.atgm) ground.push(`missiles against vehicles out to ${s.atgm.range} m`);
    if (gun > 1) ground.push(`${w.weapon === 'autocannon' || aa.missile === undefined ? 'cannon' : 'small arms'} out to ${gun} m${(w.vsArmor ?? 1) < 0.5 ? ' (infantry and trucks, not armour)' : ''}`);
    if (!ground.length && sp && s.range > 1) ground.push(`the rest of the team's rifles, out to ${s.range} m`);
    rows.push(['Ground targets', ground.length ? `yes — ${ground.join('; ')}` : 'none: keep it behind the line']);
  }
  if (s.airRadar) rows.push(['Radar', `warns of aircraft within ${s.airRadar.detect} m; air defence within ${s.airRadar.cover} m reaches further (set up ${s.airRadar.deploy} s)`]);
  if (s.cbRadar) rows.push(['Radar', `locates guns firing within ${s.cbRadar.range} m in a ${Math.round(s.cbRadar.arc * 57.3)}° sector ahead (set up ${s.cbRadar.deploy} s)`]);
  if (s.jammer) rows.push(['Jamming', `enemy support calls, observers and radars within ${s.jammer.radius} m (set up ${s.jammer.deploy} s); seen while it jams`]);
  if (s.commandPost) rows.push(['Command post', `reinforcements arrive here once set up (${s.commandPost.deploy} s); steadies stacks within ${s.commandPost.lead} m`]);
  if (s.dozer) rows.push(['Blade', `digs vehicle positions (${keyOf('trench')}): hull down behind the berm`]);
  if (s.minePlough) rows.push(['Plough', 'lifts mines as it drives through a field and leaves a safe lane']);
  if (s.lineCharge) rows.push(['Line charge', `${s.lineCharge.count}, blow a lane through mines and wire, 25–${s.lineCharge.range} m (${keyOf('engineer')})`]);
  if (sp?.marksman) rows.push(['Marksman', 'picks officers first, then crews and observers; a shot gives little away']);
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
  if (armed) rows.push(['Against armour', w.antiArmor || (w.vsArmor ?? 1) >= 0.5 ? 'effective' : 'next to nothing']);
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
    r.classList.remove('loading-open', 'boot');
    r.replaceChildren();
    const side = el('aside', 'menu-side');
    side.append(el('div', 'menu-brand', logo(GAME.title, GAME.tagline)));
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
    this.sheet = new MapSheet(r);   // the map table behind it all (ui/MapSheet.js)
    this.sheet.show(MAPS[this.choice.map] ?? Object.values(MAPS)[0], this.choice.side);
  }

  open(id) {
    for (const [k, b] of Object.entries(this.tabs)) b.classList.toggle('on', k === id);
    if (id !== 'units' && this.preview) { this.preview.dispose(); this.preview = null; }
    this.panel.replaceChildren();
    this.panel.dataset.panel = id;
    // the map table beside a battle being set up or about to be fought (single player, multiplayer,
    // boot camp, the campaign's next battle); units and settings on the plain table
    if (id === 'battle') this.sheet?.show(MAPS[this.choice.map] ?? Object.values(MAPS)[0], this.choice.side, true, 'menu');
    else if (id === 'bootcamp') this.sheet?.show(MAPS['fulda-gap'] ?? Object.values(MAPS)[0], 'nato', true, 'menu'); // where the exercise runs
    else if (id !== 'multi' && id !== 'campaign') this.sheet?.hide(); // campaign: its panel says which map (below)
    if (id === 'battle') this.battlePanel();
    else if (id === 'bootcamp') this.bootcampPanel();
    else if (id === 'campaign') {
      this.panel.append(new CampaignPanel({
        onBattle: (choice) => this.deploy(choice),
        onPreview: (map, side) => { if (this.panel.dataset.panel === 'campaign') this.sheet?.show(MAPS[map] ?? Object.values(MAPS)[0], side, true, 'menu'); },
      }).root);
    } else if (id === 'multi') {
      this.lobby ??= new Lobby({
        onStart: (choice) => this.deploy(choice),
        onPreview: (map, side) => {
          if (this.panel.dataset.panel !== 'multi') return;
          if (MAPS[map]) this.sheet?.show(MAPS[map], side, true, 'menu'); else this.sheet?.hide();
        },
      });
      this.panel.append(this.lobby.root);
      this.lobby.preview();
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
    const c = this.choice;
    p.append(el('h2', '', 'Single player'));
    p.append(el('p', 'mp-lead', 'Against the AI. Command from above, or take direct control of any of your squads and vehicles.'));

    const q = (title, body) => {
      const sec = el('section', 'setup-q');
      sec.append(el('h3', '', title), body);
      p.append(sec);
      return sec;
    };

    // what kind of battle: the names, and what the chosen one is about
    const kinds = el('div', 'map-pick');
    const modes = el('div', 'map-chips');
    modes.setAttribute('role', 'radiogroup');
    const modeAbout = el('p', 'map-about', MODES[c.mode]?.description ?? '');
    for (const m of Object.values(MODES).filter((m) => !m.hidden)) {
      const b = el('button', `map-chip${c.mode === m.id ? ' on' : ''}`, m.name);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(c.mode === m.id));
      b.addEventListener('click', () => {
        c.mode = m.id;
        for (const o of modes.children) { o.classList.toggle('on', o === b); o.setAttribute('aria-checked', String(o === b)); }
        modeAbout.textContent = m.description;
        this.drawRules();
        this.drawSummary();
      });
      modes.append(b);
    }
    kinds.append(modes, modeAbout);
    q('What kind of battle', kinds);

    // where: the map table behind redraws as you pick
    const where = el('div', 'map-pick');
    const chips = el('div', 'map-chips');
    chips.setAttribute('role', 'radiogroup');
    const about = el('p', 'map-about', MAPS[c.map]?.description ?? '');
    for (const m of Object.values(MAPS)) {
      const b = el('button', `map-chip${c.map === m.id ? ' on' : ''}`, m.name);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(c.map === m.id));
      b.addEventListener('click', () => {
        c.map = m.id;
        for (const o of chips.children) { o.classList.toggle('on', o === b); o.setAttribute('aria-checked', String(o === b)); }
        about.textContent = m.description ?? '';
        this.sheet?.show(m, c.side);
      });
      chips.append(b);
    }
    where.append(chips, about);
    q('Where', where);

    // which side
    const sides = el('div', 'side-pick');
    const sideText = {
      nato: 'Hold the West German border: dig in, keep the villages, break the offensive.',
      pact: 'Punch through the Fulda Gap: mass the Guards, find the weak point, take Hünfeld.',
    };
    for (const f of ['nato', 'pact']) {
      const b = el('button', `side-card ${f}${c.side === f ? ' on' : ''}`, `<b>${FACTIONS[f].name}</b><span>${sideText[f]}</span>`);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(c.side === f));
      b.addEventListener('click', () => {
        c.side = f;
        for (const o of sides.children) { o.classList.toggle('on', o === b); o.setAttribute('aria-pressed', String(o === b)); }
        this.sheet?.show(MAPS[c.map], f);
      });
      sides.append(b);
    }
    q('Which side', sides);

    // conditions and rules: one sentence, the controls folded away until asked for
    const more = el('div', 'setup-more');
    more.hidden = true;
    more.append(el('h3', 'menu-sub', 'Time and weather'), conditionsPicker(c, () => this.drawSummary()));
    more.append(el('h3', 'menu-sub', 'Battle rules'));
    this.rulesBox = el('div', 'rules-box');
    more.append(this.rulesBox);
    const sum = el('div', 'setup-summary');
    this.summaryText = el('p', '');
    const change = el('button', 'set-button', 'Change conditions');
    change.type = 'button';
    change.setAttribute('aria-expanded', 'false');
    change.addEventListener('click', () => {
      more.hidden = !more.hidden;
      change.textContent = more.hidden ? 'Change conditions' : 'Done';
      change.setAttribute('aria-expanded', String(!more.hidden));
      this.drawSummary();
    });
    sum.append(this.summaryText, change);
    p.append(sum, more);
    this.drawRules();
    this.drawSummary();

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
    p.append(el('p', 'mp-lead', 'New to Cold Steel? Guided exercises near your base on the Fulda Gap, a few minutes each, nothing to lose. Start with the basics, then take the chapters in any order.'));
    const done = chaptersDone();
    const list = el('div', 'bc-chapters');
    CHAPTERS.forEach((c, i) => {
      const card = el('div', `bc-chapter${done.has(c.id) ? ' done' : ''}`);
      card.append(el('span', 'bc-num', done.has(c.id) ? '✓' : String(i + 1)));
      const body = el('div', 'bc-body');
      body.append(el('h3', '', c.title), el('p', '', c.blurb), el('small', '', `${c.steps.length} lessons${done.has(c.id) ? ' · done' : ''}`));
      card.append(body);
      const go = el('button', i === 0 && !done.has(c.id) ? 'deploy' : 'mp-btn', done.has(c.id) ? 'Again' : 'Start');
      go.type = 'button';
      go.addEventListener('click', () => this.deploy({ ...this.choice, ...chapterBattle(c.id, this.choice.rules) }));
      card.append(go);
      list.append(card);
    });
    p.append(list);
  }

  /** The conditions and rules in a sentence or two, under the three questions. */
  drawSummary() {
    if (!this.summaryText) return;
    const c = this.choice;
    const r = c.rules;
    const sky = { clear: 'Clear skies', overcast: 'Overcast', rain: 'Rain', fog: 'Fog' }[c.weather] ?? WEATHER[c.weather]?.name;
    const when = { day: 'by day', dawn: 'at dawn', dusk: 'at dusk', night: 'at night' }[c.time] ?? '';
    const enemy = `${DIFFICULTY[r.difficulty]?.label ?? 'Regular'} enemy`;
    const moving = [r.changingWeather !== false ? 'the weather' : '', r.timePasses !== false ? 'the daylight' : ''].filter(Boolean).join(' and ');
    const air = r.air === false ? ' No air support.' : '';
    this.summaryText.textContent = `${sky} ${when}, ${enemy.toLowerCase()}.${moving ? ` ${moving[0].toUpperCase()}${moving.slice(1)} will change as the battle goes on.` : ''}${air}`;
  }

  /** The rules rows for the chosen mode (economy rows only where command points matter). */
  drawRules() {
    if (!this.rulesBox) return;
    this.rulesBox.replaceChildren(rulesPicker(this.choice.rules, !!MODES[this.choice.mode]?.economy, () => this.drawSummary()));
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
    const sheet = this.sheet?.canvas;
    this.sheet?.show(MAPS[choice.map] ?? MAPS[this.choice.map], choice.side, false, 'full'); // drawn at once: the build is about to block the page
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    const box = el('div', 'loading-card', `${logo(GAME.title, GAME.tagline)}<div id="ts-status">Deploying forces on ${MAPS[choice.map]?.name ?? 'the map'}…</div><p class="loading-tip">${tip}</p>`);
    this.root.replaceChildren(...(sheet ? [sheet] : []), box);
    this.root.classList.add('loading-open');
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
    for (const [k, val] of statRows(type, faction)) dl.append(el('dt', '', k), el('dd', '', String(val)));
    this.info.append(dl);
    this.codex(id, faction);
  }
}
