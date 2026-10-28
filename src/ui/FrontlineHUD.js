// Frontline mode HUD: a strip at the top with both sides' front strength and every control
// point (owner colour, capture progress, contested pulse), plus a reinforcement panel in the
// tactical command panel: command points, stacks in the field / limit, and the button that
// opens the reinforcement window (ui/ReinforceWindow.js, also C).
import { FACTIONS, enemyOf } from '../data/factions.js';
import { ReinforceWindow } from './ReinforceWindow.js';

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

export class FrontlineHUD {
  constructor(game, state) {
    this.game = game;
    this.state = state;
    this.me = game.playerFaction;
    this.foe = enemyOf(this.me);

    const bar = document.createElement('div');
    bar.id = 'frontline';
    bar.innerHTML = `
      <div class="fl-side ally"><div class="fl-bar"><i></i></div><span></span></div>
      <div class="fl-points"></div>
      <div class="fl-side enemy"><span></span><div class="fl-bar"><i></i></div></div>
      <div class="fl-status"></div>`;
    document.getElementById('hud').appendChild(bar);
    this.allyFill = bar.querySelector('.ally i');
    this.allyText = bar.querySelector('.ally span');
    this.enemyFill = bar.querySelector('.enemy i');
    this.enemyText = bar.querySelector('.enemy span');
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
    panel.innerHTML = '<button type="button" tabindex="-1" class="rf-open">Reinforcements <kbd data-key="reinforce"></kbd></button><span class="rf-stacks" title="Stacks in the field / limit"></span><span class="rf-cp"></span>';
    document.getElementById('command-panel').prepend(panel);
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
    const myCp = Math.floor(cp[this.me]);
    this.cpText.textContent = `${myCp} CP`;
    const stacks = this.game.world.stacksOf(this.me).filter((s) => !s.stats.structure && !s.autonomous).length;
    const full = stacks >= this.state.maxStacks;
    this.stacksText.textContent = `${stacks} / ${this.state.maxStacks} stacks`;
    this.stacksText.classList.toggle('full', full);
    this.window.update();
  }
}
