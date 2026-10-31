// Frontline mode HUD: a strip at the top centre with both sides' name, front strength and stacks
// in the field (yours left, theirs right, the same width) round every control point (owner colour, capture progress, contested pulse), plus a reinforcement panel in the
// tactical command panel: command points, stacks in the field / limit, and the button that
// opens the reinforcement window (ui/ReinforceWindow.js, also C).
import { FACTIONS, enemyOf } from '../data/factions.js';
import { ReinforceWindow } from './ReinforceWindow.js';
import { forces } from '../modes/shared.js';
import { icon } from './Icons.js';

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

export class FrontlineHUD {
  constructor(game, state) {
    this.game = game;
    this.state = state;
    this.me = game.playerFaction;
    this.foe = enemyOf(this.me);

    const bar = document.createElement('div');
    bar.id = 'frontline';
    const side = (cls, f) => `<div class="fl-side ${cls}"><div class="fl-top"><b>${FACTIONS[f].name}</b><span class="fl-val"></span></div>
      <div class="fl-bar"><i></i></div><small class="fl-n"></small></div>`;
    bar.innerHTML = `${side('ally', this.me)}<div class="fl-points"></div>${side('enemy', this.foe)}<div class="fl-status"></div>`;
    document.getElementById('hud').appendChild(bar);
    this.allyFill = bar.querySelector('.ally i');
    this.allyText = bar.querySelector('.ally .fl-val');
    this.allyN = bar.querySelector('.ally .fl-n');
    this.enemyN = bar.querySelector('.enemy .fl-n');
    this.enemyFill = bar.querySelector('.enemy i');
    this.enemyText = bar.querySelector('.enemy .fl-val');
    this.statusEl = bar.querySelector('.fl-status');
    const strip = bar.querySelector('.fl-points');
    // nearest to your base first, so your side of the strip sits next to your strength bar
    const home = game.map.bases?.[this.me] ?? { x: 0, z: 0 };
    const ordered = [...state.points.points].sort((a, b) => Math.hypot(a.x - home.x, a.z - home.z) - Math.hypot(b.x - home.x, b.z - home.z));
    this.pills = ordered.map((p) => {
      const el = document.createElement('div');
      el.className = 'fl-point';
      el.innerHTML = `<b>${p.id}</b><i></i>`;
      el.title = p.name;
      strip.appendChild(el);
      return { p, el, fill: el.querySelector('i') };
    });

    const panel = document.createElement('div');
    panel.id = 'reinforce';
    panel.innerHTML = `<div class="rf-info"><b class="rf-cp"></b><span class="rf-stacks" title="Stacks in the field / limit"></span></div>
      <button type="button" tabindex="-1" class="rf-open">${icon('reinforce')}<span>Reinforce</span><kbd data-key="reinforce"></kbd></button>`;
    // its own bar beside the orders, bottom right: the points stay in sight with the orders folded away
    const orders = document.getElementById('command-panel');
    const dock = document.createElement('div');
    dock.id = 'dock';
    orders.before(dock);
    dock.append(panel, orders);
    if (state.noReinforcements) panel.hidden = true; // e.g. Recon raid: you have what you came with
    this.cpText = panel.querySelector('.rf-cp');
    this.stacksText = panel.querySelector('.rf-stacks');
    this.window = new ReinforceWindow(game, state);
    panel.querySelector('.rf-open').addEventListener('click', (e) => { e.currentTarget.blur(); this.window.toggle(); });
  }

  update() {
    const { strength, maxStrength, cp } = this.state;
    const a = Math.max(0, strength[this.me]);
    const e = Math.max(0, strength[this.foe]);
    this.allyFill.style.width = `${(a / maxStrength) * 100}%`;
    this.enemyFill.style.width = `${(e / maxStrength) * 100}%`;
    this.allyText.textContent = Math.ceil(a);
    this.enemyText.textContent = Math.ceil(e);
    const myColor = hex(FACTIONS[this.me].glow);
    const foeColor = hex(FACTIONS[this.foe].glow);
    for (const { p, el, fill } of this.pills) {
      const color = p.progress > 0 ? myColor : foeColor;
      fill.style.width = `${Math.abs(p.progress) * 100}%`;
      fill.style.background = color;
      el.style.borderColor = p.owner ? (p.owner === this.me ? myColor : foeColor) : 'rgba(255,255,255,0.25)';
      el.classList.toggle('contested', p.contested);
      el.classList.toggle('locked', !!p.locked);
    }
    const status = this.state.status ? this.state.status() : this.state.statusText ?? '';
    if (status !== this.lastStatus) {
      this.lastStatus = status;
      this.statusEl.textContent = status;
      this.statusEl.hidden = !status;
    }
    const myCp = Math.floor(cp[this.game.wallet(this.me, this.game.myOwner)]); // co-op: your own
    this.cpText.textContent = `${myCp} CP`;
    const stacks = forces(this.game, this.me).length; // what counts toward the limit (bailed-out crews don't)
    const full = stacks >= this.state.maxStacks;
    this.stacksText.textContent = `${stacks}/${this.state.maxStacks} stacks`;
    const g = this.game;
    this.allyN.textContent = `${g.world.stacksOf(this.me).length} stacks`;
    this.enemyN.textContent = `${g.world.stacks.filter((s) => s.alive && s.faction === this.foe && s.visible !== false).length} seen`;
    this.stacksText.classList.toggle('full', full);
    this.window.update();
  }
}
