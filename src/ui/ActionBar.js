// The command panel's buttons (src/ui/Icons.js draws them):
//   actions         what the selection can do, as icon tiles with the key in the corner —
//                   sandbags / trench / wire / mines (one infantry stack), clear or blow a bridge
//                   (engineers), lay a bridge, smoke, flare (night), unload, cancel a job, leave a building
//   support powers  always there in their own row: helicopter, jet, air assault, gas — each with
//                   its price, or while it recharges a ring running round and the seconds left
// Rebuilt when the selection changes, and twice a second (rounds run out, squads climb in).
import { STRUCTURES } from '../systems/Construction.js';
import { KINDS } from '../systems/AirStrike.js';
import { GAS } from '../systems/Gas.js';
import { keyOf } from '../core/Keys.js';
import { icon } from './Icons.js';

const ACTIONS = [
  { cmd: 'build:sandbags', label: 'Sandbags', icon: 'sandbags', key: 'sandbags', cost: STRUCTURES.sandbags.cost, tip: 'A chest-high bag wall: cover from the front', when: (sel) => one(sel, (s) => s.usesCover) },
  { cmd: 'build:trench', label: 'Trench', icon: 'trench', key: 'trench', cost: STRUCTURES.trench.cost, tip: 'Dig a trench: shelter from every direction', when: (sel) => one(sel, (s) => s.usesCover) },
  { cmd: 'build:wire', label: 'Wire', icon: 'wire', key: 'wire', cost: STRUCTURES.wire.cost, tip: 'Concertina wire: enemy infantry crawls through it', when: (sel) => one(sel, (s) => s.usesCover) },
  { cmd: 'build:revetment', label: 'Dig in', icon: 'trench', key: 'trench', cost: STRUCTURES.revetment.cost, tip: 'The blade digs a vehicle position: any vehicle in it is hull down behind the berm', when: (sel) => one(sel, (s) => s.stats.dozer) },
  { cmd: 'build:mines', label: 'Mines', icon: 'mines', key: 'mines', cost: STRUCTURES.mines.cost, tip: 'A minefield the enemy can\'t see until the first blast', when: (sel) => one(sel, (s) => s.usesCover) },
  {
    cmd: 'engineer', icon: 'engineer', key: 'engineer',
    label: (g) => (g.map.bridgeAt ? 'Clear / blow' : 'Clear'),
    tip: (g) => `Engineers: click a minefield or wire to lift it${g.map.bridgeAt ? ', or a bridge to blow it (8 s fuse)' : ''}`,
    when: (sel) => sel.some((s) => s.stats.engineer),
  },
  { cmd: 'bridge', label: 'Lay bridge', icon: 'bridge', key: 'engineer', tip: 'Bridge layer: click the river — it drives to the bank and lays a crossing', when: (sel) => sel.some((s) => s.stats.bridgeLayer && !s.units[0].dropped) },
  { cmd: 'smoke', label: 'Smoke', icon: 'smoke', key: 'smoke', tip: 'Vehicles pop their launchers; mortars: click where to lay the screen', when: (sel) => sel.some((s) => s.smokeLeft > 0 || s.smokeRounds > 0), count: (sel) => sel.reduce((a, s) => a + (s.smokeLeft || 0) + (s.smokeRounds || 0), 0) },
  { cmd: 'flare', label: 'Flare', icon: 'flare', key: 'flare', tip: 'Illumination: light the ground for half a minute', when: (sel, g) => g.conditions?.night && sel.some((s) => s.flareRounds > 0), count: (sel) => sel.reduce((a, s) => a + (s.flareRounds || 0), 0) },
  { cmd: 'unload', label: 'Unload', icon: 'unload', key: 'unload', tip: 'The squad climbs out behind the vehicles', when: (sel) => sel.some((s) => s.passengers > 0) },
  { cmd: 'cancelJob', label: 'Cancel job', icon: 'cancel', key: 'cancelJob', tip: 'Call off the build order: the blueprint goes and the command points come back', when: (sel, g) => sel.some((s) => g.construction.sites.some((site) => site.stackId === s.id)) },
  { cmd: 'leave', label: 'Leave', icon: 'leave', key: 'leave', tip: 'Come out of the building and hold next to it', when: (sel) => sel.some((s) => s.garrison) },
];

// the support powers: [command, icon, key action, label, tooltip]
const SUPPORT = [
  ['air', 'heli', 'heli', 'Helicopter', 'Attack helicopter: rockets and the chin gun along a line'],
  ['air:jet', 'jet', 'jet', 'Jet', 'Ground-attack jet: one fast, devastating gun run'],
  ['air:lift', 'assault', 'lift', 'Air assault', 'A helicopter lands a squad where you click'],
  ['gas', 'gas', 'gas', 'Gas', 'Chemical shells: infantry there mask up, aim worse and see less'],
];

function one(sel, test) {
  return sel.length === 1 && test(sel[0]);
}

const value = (v, g) => (typeof v === 'function' ? v(g) : v);

export class ActionBar {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('cmd-actions');
    this.key = '';
    this.timer = 0;
    this.buildSupport();
    game.bus.on('selection', () => this.render(true));
    game.bus.on('order', () => setTimeout(() => this.render(true), 0)); // a job placed: its Cancel button at once
  }

  buildSupport() {
    const row = document.querySelector('.cmd-buttons.support');
    this.support = SUPPORT.map(([cmd, ic, key, label, tip]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.className = 'sup';
      b.dataset.cmd = cmd;
      b.title = `${label} — ${tip}`;
      b.innerHTML = `<i class="cd"></i>${icon(ic)}<span class="sup-name">${label}</span><small></small><kbd data-key="${key}">${keyOf(key)}</kbd>`;
      return { b, cmd, small: b.querySelector('small') };
    });
    row.replaceChildren(...this.support.map((s) => s.b));
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.5;
    this.render();
    this.supportPowers();
  }

  /** Price or recharge on the support powers: a ring runs round while one is cooling down. */
  supportPowers() {
    const g = this.game;
    const me = g.playerFaction;
    const off = g.air.limit[me] === 0; // no support in this battle
    for (const { b, cmd, small } of this.support) {
      const gas = cmd === 'gas';
      const kind = gas ? null : cmd.slice(4) || 'heli';
      const left = Math.ceil(gas ? g.gas.cooldownLeft(me) : g.air.cooldownLeft(me, kind));
      const total = gas ? GAS.cooldown : KINDS[kind].cooldown;
      const text = left > 0 ? `${left} s` : String(gas ? GAS.cost : KINDS[kind].cost);
      if (small.textContent !== text) small.textContent = text;
      b.classList.toggle('cooling', left > 0);
      b.style.setProperty('--cd', left > 0 ? String(1 - left / total) : '1');
      b.hidden = off;
    }
  }

  render(force = false) {
    const g = this.game;
    const sel = [...g.commands.selected].filter((s) => s.alive);
    const shown = ACTIONS.filter((a) => a.when(sel, g));
    // only touch the DOM when what's shown changed
    const key = shown.map((a) => `${a.cmd}:${a.count?.(sel) ?? ''}`).join('|');
    if (!force && key === this.key) return;
    this.key = key;
    this.el.replaceChildren(...shown.map((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.className = 'act';
      b.dataset.cmd = a.cmd;
      const label = value(a.label, g);
      b.title = `${label}${a.cost ? ` (${a.cost} CP)` : ''} — ${value(a.tip, g)}`;
      const n = a.count?.(sel);
      b.innerHTML = `${icon(a.icon)}<span>${label}</span>${a.cost ? `<small>${a.cost}</small>` : ''}${n ? `<small class="n">×${n}</small>` : ''}<kbd data-key="${a.key}">${keyOf(a.key)}</kbd>`;
      return b;
    }));
    this.el.hidden = !shown.length;
  }
}
