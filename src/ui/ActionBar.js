// The command panel's buttons (src/ui/Icons.js draws them):
//   actions         what the selection can do, as icon tiles with the key in the corner —
//                   stop (anything that moves), sandbags / trench / wire / mines (one infantry stack), clear or blow a bridge
//                   (engineers), lay a bridge, smoke, flare (night), unload, cancel a job, leave a building
//   support powers  always there in their own row: helicopter, jet, air assault, fighters, recon — each with
//                   its price, or while it recharges a ring running round and the seconds left
// Rebuilt when the selection changes, and twice a second (rounds run out, squads climb in).
import { POWERS_1806 } from '../systems/Powers1806.js';
import { epoch, year } from '../data/epoch.js';
import { refillCost } from '../core/Orders.js';
import { promoteCost } from '../modes/pitched.js';
import { RANKS } from '../entities/UnitStack.js';
import { doctrine, armyDoctrine } from '../data/doctrine.js';
import { STRUCTURES, structureCost } from '../systems/Construction.js';
import { KINDS } from '../systems/AirStrike.js';
import { keyOf } from '../core/Keys.js';
import { icon, silhouette } from './Icons.js';

const ACTIONS = [
  { cmd: 'hold', label: 'Stop', icon: 'stop', key: 'hold', tip: 'Stop where they are and hold the spot', when: (sel) => sel.some((s) => s.stats.speed > 0 && !s.stats.structure) },
  { cmd: 'sprint', label: 'Sprint', icon: 'charge', key: 'sprint', tip: 'Infantry on the move runs for 10 s, then is winded (slower) for 20 s. With a mouse: give the move order twice', when: (sel) => sel.some((s) => s.usesCover && s.moveTarget && !s.stats.structure), on: (sel) => sel.some((s) => s.sprinting) },
  { cmd: 'waypoints', label: (g) => (g.commands.queueing ? 'Waypoints on' : 'Waypoints'), icon: 'place', key: 'waypoints', tip: 'Each order adds a waypoint to the route instead of replacing it (with a mouse: Shift+right-click)', when: (sel) => document.body.classList.contains('touch') && sel.some((s) => s.stats.speed > 0 && !s.stats.structure) },
  { cmd: 'build:sandbags', label: 'Sandbags', icon: 'sandbags', key: 'sandbags', cost: (g) => structureCost(g, g.playerFaction, STRUCTURES.sandbags), tip: 'A chest-high bag wall: cover from the front', when: (sel) => one(sel, (s) => s.usesCover) },
  { cmd: 'build:trench', label: 'Trench', icon: 'trench', key: 'trench', cost: (g) => structureCost(g, g.playerFaction, STRUCTURES.trench), tip: 'Dig a trench: shelter from every direction', when: (sel) => one(sel, (s) => s.usesCover) },
  { cmd: 'build:wire', label: 'Wire', icon: 'wire', key: 'wire', cost: (g) => structureCost(g, g.playerFaction, STRUCTURES.wire), tip: 'Concertina wire: enemy infantry crawls through it', when: (sel) => one(sel, (s) => s.usesCover) },
  { cmd: 'build:revetment', label: 'Dig in', icon: 'trench', key: 'trench', cost: (g) => structureCost(g, g.playerFaction, STRUCTURES.revetment), tip: 'The blade digs a vehicle position: any vehicle in it is hull down behind the berm', when: (sel) => one(sel, (s) => s.stats.dozer) },
  { cmd: 'build:mines', label: 'Mines', icon: 'mines', key: 'mines', cost: (g) => structureCost(g, g.playerFaction, STRUCTURES.mines), tip: 'A minefield the enemy can\'t see until the first blast', when: (sel) => one(sel, (s) => s.usesCover) },
  {
    cmd: 'engineer', icon: 'engineer', key: 'engineer',
    label: (g) => (g.map.bridgeAt ? 'Clear / blow' : 'Clear'),
    tip: (g) => `Engineers: click a minefield or wire to lift it${g.map.bridgeAt ? ', or a bridge to blow it (8 s fuse)' : ''}`,
    when: (sel) => sel.some((s) => s.stats.engineer),
  },
  { cmd: 'engineer', label: 'Line charge', icon: 'mines', key: 'engineer', tip: 'Fire the rocket-towed hose: it blows a lane through minefields and wire', when: (sel) => sel.some((s) => s.stats.lineCharge && (s.units[0].lineCharges ?? s.stats.lineCharge.count) > 0), count: (sel) => sel.reduce((a, s) => a + (s.stats.lineCharge ? s.units[0].lineCharges ?? s.stats.lineCharge.count : 0), 0) },
  { cmd: 'bridge', label: 'Lay bridge', icon: 'bridge', key: 'engineer', tip: 'Bridge layer: click the river — it drives to the bank and lays a crossing', when: (sel) => sel.some((s) => s.stats.bridgeLayer && !s.units[0].dropped) },
  { cmd: 'smoke', label: 'Smoke', icon: 'smoke', key: 'smoke', tip: 'Vehicles pop their launchers; mortars: click where to lay the screen', when: (sel) => sel.some((s) => s.smokeLeft > 0 || s.smokeRounds > 0), count: (sel) => sel.reduce((a, s) => a + (s.smokeLeft || 0) + (s.smokeRounds || 0), 0) },
  { cmd: 'flare', label: 'Flare', icon: 'flare', key: 'flare', tip: 'Illumination: light the ground for half a minute', when: (sel, g) => g.conditions?.night && sel.some((s) => s.flareRounds > 0), count: (sel) => sel.reduce((a, s) => a + (s.flareRounds || 0), 0) },
  { cmd: 'barrage', label: 'Feuerwalze', icon: 'flare', key: 'barrage', tip: 'Creeping barrage: click where it starts — the shells walk forward ahead of your advance', when: (sel) => sel.some((s) => s.stats.indirect && armyDoctrine(s.army, 'walze')) },
  { cmd: 'unload', label: 'Unload', icon: 'unload', key: 'unload', tip: 'The squad climbs out behind the vehicles', when: (sel) => sel.some((s) => s.passengers > 0) },
  { cmd: 'cancelJob', label: 'Cancel job', icon: 'cancel', key: 'cancelJob', tip: 'Call off the build order: the blueprint goes and the command points come back', when: (sel, g) => sel.some((s) => g.construction.sites.some((site) => site.stackId === s.id)) },
  { cmd: 'refill', label: 'Refill', icon: 'reinforce', key: 'refill', cost: (g) => [...g.commands.selected].reduce((a, s) => a + (s.missing && s.supplied ? refillCost(s) : 0), 0), tip: (g) => ([...g.commands.selected].some((s) => s.missing && !s.supplied) ? 'New men for the missing: only near the base or a set-up command post' : 'New men fill the squad\'s empty places'), when: (sel, g) => !!g.modeState?.cp && sel.some((s) => s.missing > 0) },
  { cmd: 'promote', label: 'Promote', icon: 'reinforce', key: 'promote', tip: 'A pitched battle\'s setup: one rank up for its price (30 % of the stack\'s cost)', when: (sel, g) => !!g.modeState?.setup && g.mode?.budget && sel.some((s) => s.rank + 1 < RANKS.length), cost: (g) => [...g.commands.selected].reduce((a, s) => a + (promoteCost(g, s) ?? 0), 0) },
  { cmd: 'withdraw', label: 'Withdraw', icon: 'withdraw', key: 'withdraw', tip: 'Back to base and off the field: its slot is free at once, half its price comes back (less for damage)', when: (sel, g) => !!g.modeState?.cp && sel.some((s) => !s.stats.structure && s.type.id !== 'crew') },
  ...['line', 'column', 'square', 'skirmish'].map((f) => ({
    cmd: `form:${f}`, label: f[0].toUpperCase() + f.slice(1), icon: `form${f[0].toUpperCase()}${f.slice(1)}`, key: 'formation',
    tip: { line: 'Two ranks: every musket fires — the most firepower', column: 'Six files deep: faster on the march and for the charge; only the front rank fires', square: 'Facing out on all sides: cavalry can\'t break in — but guns tear it apart', skirmish: 'A loose screen in cover, each man firing when ready' }[f],
    when: (sel) => sel.some((s) => s.stats.formations),
    on: (sel) => sel.some((s) => s.form === f),
  })),
  { cmd: 'charge', label: 'Charge!', icon: 'charge', key: 'charge', tip: 'Foot: bayonets, at the run. Horse: at the gallop, sabres out. At the nearest enemy in sight — horses will not go into a square', when: (sel) => sel.some((s) => s.stats.formations || (s.stats.cavalry && !s.stats.loose)) },
  { cmd: 'leave', label: 'Leave', icon: 'leave', key: 'leave', tip: 'Come out of the building and hold next to it', when: (sel) => sel.some((s) => s.garrison) },
];

// the support powers: [command, icon, key action, label, tooltip]
const SUPPORT = [
  ['air', 'heli', 'heli', 'Helicopter', 'Attack helicopter: rockets and the chin gun along a line'],
  ['air:jet', 'jet', 'jet', 'Jet', 'Ground-attack jet: one fast, devastating gun run'],
  ['air:lift', 'assault', 'lift', 'Air assault', 'A helicopter lands a squad where you click'],
  ['air:cap', 'fighter', 'cap', 'Fighters', 'Fighter patrol: circles over the spot and shoots down enemy aircraft that come near'],
  ['air:recon', 'recon', 'recon', 'Recon', 'Recon flight: a photo run along the line — every enemy near it shows on your map for 30 s'],
  ['barrage', 'flare', 'barrage', 'Barrage', 'Preparatory barrage: a whole sector shelled for a minute (Soviet Army)'],
  ...Object.entries(POWERS_1806).map(([k, p]) => [`power:${k}`, p.icon, p.key, p.label, p.tip]), // 1806 (systems/Powers1806.js)
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
    game.bus.on('order', () => setTimeout(() => this.render(true), 0));
    this.formTick = setInterval(() => { if (game.commands?.selected?.size) this.render(); }, 500); // (a formation finishing: its button lights) // a job placed: its Cancel button at once
  }

  buildSupport() {
    const row = document.querySelector('.cmd-buttons.support');
    this.support = SUPPORT.map(([cmd, ic, key, label, tip]) => {
      if (cmd === 'air:jet' && epoch() === '1945') [label, tip] = ['Strike', 'Fighter-bomber: rockets or a bomb, then the guns along a line']; // (data/epoch.js)
      if (cmd === 'air:lift' && epoch() === '1945') [label, tip] = ['Paradrop', 'A transport flies over the spot and drops a stick of paratroopers']
      const b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.className = 'sup';
      b.dataset.cmd = cmd;
      b.title = `${label} — ${tip}`;
      // an air power shows the army's own aircraft (tools/render_silhouettes.py air-…), the rest their icon
      const kind = cmd === 'air' ? 'heli' : cmd.startsWith('air:') ? cmd.slice(4) : null;
      const me = this.game.playerFaction;
      const own = kind && KINDS[kind]?.aircraft?.[this.game.armyOf(me)] ? this.game.armyOf(me) : me;
      const art = kind === 'lift' && epoch() === '1945' ? icon('parachute') : kind ? silhouette(`air-${kind}`, own, 'ico sup-sil') : icon(ic); // (the paradrop: a parachute)
      b.innerHTML = `<i class="cd"></i>${art}<span class="sup-name">${label}</span><small></small><kbd data-key="${key}">${keyOf(key)}</kbd>`;
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
      if (cmd.startsWith('power:') || year() < 1900) { // 1806: its own three powers, nothing else
        const k = cmd.startsWith('power:') ? cmd.slice(6) : null;
        b.hidden = off || !k || year() >= 1900;
        if (b.hidden) continue;
        const P = POWERS_1806[k], left = g.powers.cooldownLeft(me, k);
        const text = left === Infinity ? 'used' : left > 0 ? `${Math.ceil(left)} s` : String(P.cost);
        if (small.textContent !== text) small.textContent = text;
        b.classList.toggle('cooling', left > 0);
        b.style.setProperty('--cd', left === Infinity ? '0' : left > 0 ? String(1 - left / P.cooldown) : '1');
        continue;
      }
      const mass = cmd === 'barrage' ? doctrine(g, me, 'mass') ?? doctrine(g, me, 'tot') ?? false : null; // the Soviet Army's barrage, the 1945 US Army's Time on Target
      const kind = mass !== null ? null : cmd.slice(4) || 'heli';
      const left = Math.ceil(mass !== null ? g.barrage.cooldownLeft(me) : g.air.cooldownLeft(me, kind));
      const total = mass ? mass.cooldown : mass === false ? 1 : g.air.span[g.air.key(me, kind)] ?? KINDS[kind].cooldown;
      const terms = kind ? g.air.terms(me, kind) : null;
      const text = left > 0 ? `${left} s` : String(mass !== null ? mass.cost ?? '' : terms.cost);
      b.classList.toggle('airland', !!terms?.airland); // the US Army's AirLand Battle: cheaper right now
      if (small.textContent !== text) small.textContent = text;
      b.classList.toggle('cooling', left > 0);
      b.style.setProperty('--cd', left > 0 ? String(1 - left / total) : '1');
      b.hidden = off || mass === false || !!(kind && KINDS[kind]?.off); // (not in this war: data/epoch.js)
      if (mass?.id === 'tot' && b.querySelector('.sup-name').textContent !== 'Time on Target') { b.querySelector('.sup-name').textContent = 'Time on Target'; b.title = 'Time on Target — every gun in range fires one salvo; all the shells land at the same moment'; }
    }
  }

  render(force = false) {
    const g = this.game;
    const sel = [...g.commands.selected].filter((s) => s.alive);
    const foot = sel.length && sel.every((s) => s.stats.formations); // 1806 companies: they don't dig, wire or mine (the pioneers do)
    const shown = ACTIONS.filter((a) => a.when(sel, g) && !(foot && a.cmd.startsWith('build:')) && !(year() < 1900 && (a.cmd === 'build:wire' || a.cmd === 'build:mines'))); // (1806: no wire, no mines)
    // only touch the DOM when what's shown changed
    const key = shown.map((a) => `${a.cmd}:${a.count?.(sel) ?? ''}:${a.on?.(sel) ? 1 : 0}`).join('|');
    if (!force && key === this.key) return;
    this.key = key;
    this.el.replaceChildren(...shown.map((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.className = a.on?.(sel) ? 'act on' : 'act';
      b.dataset.cmd = a.cmd;
      const label = value(a.label, g);
      const cost = value(a.cost, g);
      b.title = `${label}${cost ? ` (${cost} CP)` : ''} — ${value(a.tip, g)}`;
      const n = a.count?.(sel);
      b.innerHTML = `${icon(a.icon)}<span>${label}</span>${cost ? `<small>${cost}</small>` : ''}${n ? `<small class="n">×${n}</small>` : ''}${keyOf(a.key) === "—" ? "" : `<kbd data-key="${a.key}">${keyOf(a.key)}</kbd>`}`;
      return b;
    }));
    this.el.hidden = !shown.length;
  }
}
