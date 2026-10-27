// The command panel's action buttons, shown only when the selection can use them:
//   sandbags / trench / wire / mines   one infantry stack selected (they dig and wire it)
//   clear (and blow bridge)            engineers selected: lift mines and cut wire, or charge a bridge
//   smoke                              vehicles with smoke launchers, or a mortar with smoke bombs
//   flare                              at night, a mortar with illumination rounds
//   unload                             IFVs with a squad inside
// The support powers (helicopter, jet, air assault) are always there (bottom row), as is
// "select all"; each shows its price, or the seconds until it's ready again.
// Rebuilt when the selection changes, and twice a second (rounds run out, squads climb in).
import { STRUCTURES } from '../systems/Construction.js';
import { KINDS } from '../systems/AirStrike.js';

const ACTIONS = [
  { cmd: 'build:sandbags', label: 'Sandbags', key: 'N', cost: STRUCTURES.sandbags.cost, tip: 'A chest-high bag wall: cover from the front', when: (sel) => one(sel, (s) => s.usesCover) },
  { cmd: 'build:trench', label: 'Trench', key: 'T', cost: STRUCTURES.trench.cost, tip: 'Dig a trench: shelter from every direction', when: (sel) => one(sel, (s) => s.usesCover) },
  { cmd: 'build:wire', label: 'Wire', key: 'V', cost: STRUCTURES.wire.cost, tip: 'Concertina wire: enemy infantry crawls through it', when: (sel) => one(sel, (s) => s.usesCover) },
  { cmd: 'build:mines', label: 'Mines', key: 'F', cost: STRUCTURES.mines.cost, tip: 'A minefield the enemy can\'t see until the first blast', when: (sel) => one(sel, (s) => s.usesCover) },
  {
    cmd: 'engineer', key: 'X',
    label: (g) => (g.map.bridgeAt ? 'Clear / blow bridge' : 'Clear mines & wire'),
    tip: (g) => `Engineers: click a minefield or wire to lift it${g.map.bridgeAt ? ', or a bridge to blow it (8 s fuse)' : ''}`,
    when: (sel) => sel.some((s) => s.stats.engineer),
  },
  { cmd: 'smoke', label: 'Smoke', key: 'K', tip: 'Vehicles pop their launchers; mortars: click where to lay the screen', when: (sel) => sel.some((s) => s.smokeLeft > 0 || s.smokeRounds > 0), count: (sel) => sel.reduce((a, s) => a + (s.smokeLeft || 0) + (s.smokeRounds || 0), 0) },
  { cmd: 'flare', label: 'Flare', key: 'L', tip: 'Illumination: light the ground for half a minute', when: (sel, g) => g.conditions?.night && sel.some((s) => s.flareRounds > 0), count: (sel) => sel.reduce((a, s) => a + (s.flareRounds || 0), 0) },
  { cmd: 'unload', label: 'Unload', key: 'U', tip: 'The squad climbs out behind the vehicles', when: (sel) => sel.some((s) => s.passengers > 0) },
  { cmd: 'leave', label: 'Leave building', key: 'E', tip: 'Come out of the building and hold next to it', when: (sel) => sel.some((s) => s.garrison) },
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
    game.bus.on('selection', () => this.render(true));
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.5;
    this.render();
    this.supportPowers();
  }

  /** Price or cooldown on the support-power buttons. */
  supportPowers() {
    const g = this.game;
    for (const b of document.querySelectorAll('.cmd-buttons.support [data-cmd^="air"]')) {
      const kind = b.dataset.cmd.slice(4) || 'heli';
      const left = Math.ceil(g.air.cooldownLeft(g.playerFaction, kind));
      const text = left > 0 ? `${left} s` : String(KINDS[kind].cost);
      const small = b.querySelector('small');
      if (small && small.textContent !== text) small.textContent = text;
      b.classList.toggle('cooling', left > 0);
      b.hidden = g.air.limit[g.playerFaction] === 0; // no air support in this battle
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
      b.tabIndex = -1;
      b.dataset.cmd = a.cmd;
      b.title = value(a.tip, g);
      const n = a.count?.(sel);
      b.innerHTML = `${value(a.label, g)}${a.cost ? ` <small>${a.cost}</small>` : ''}${n ? ` <small class="n">×${n}</small>` : ''} <kbd>${a.key}</kbd>`;
      return b;
    }));
    this.el.hidden = !shown.length;
  }
}
