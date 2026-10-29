// The reinforcement window (C, or the button in the command panel): every unit you can call in,
// in sections — infantry, armour, fire support, air defence — each with its cost, what it's
// for, and how many you have out. Click to call one in (it arrives at your base); the window
// stays open for more. Unit types sort themselves in by their `category`; anything new without
// one lands under "Other". The battle doesn't pause.
import { UNIT_TYPES } from '../data/units/index.js';

const SECTIONS = [
  ['infantry', 'Infantry'],
  ['armour', 'Armour'],
  ['fire', 'Fire support'],
  ['airdefence', 'Air defence'],
  ['support', 'Support'],
  ['other', 'Other'],
];

/** The first sentence of the unit's description, for the card. */
const blurb = (type, faction) => (type.variants?.[faction]?.text ?? '').split(/(?<=\.)\s/)[0];

export class ReinforceWindow {
  constructor(game, state) {
    this.game = game;
    this.state = state;
    const me = game.playerFaction;
    const root = (this.root = document.createElement('div'));
    root.id = 'reinforce-window';
    root.hidden = true;
    root.innerHTML = `<div class="rw-head"><b>Reinforcements</b><span class="rw-cp"></span><span class="rw-stacks"></span>
      <button type="button" class="rw-close" aria-label="Close">×</button></div><div class="rw-body"></div>`;
    document.getElementById('hud').append(root);
    this.cp = root.querySelector('.rw-cp');
    this.stacks = root.querySelector('.rw-stacks');
    const body = root.querySelector('.rw-body');
    const allow = state?.allow; // the mode may bar some types (modes/infantry.js)
    const types = Object.values(UNIT_TYPES).filter((t) => !t.hidden && !t.airOnly && (!allow || allow(t)) && (!t.needsRiver || game.world.river)); // air assault squads come by helicopter; bridge layers need a river
    this.cards = [];
    for (const [cat, title] of SECTIONS) {
      const list = types.filter((t) => (SECTIONS.some(([c]) => c === t.category) ? t.category : 'other') === cat);
      if (!list.length) continue;
      const sec = document.createElement('section');
      sec.innerHTML = `<h4>${title}</h4><div class="rw-cards"></div>`;
      for (const type of list) {
        const card = document.createElement('button');
        card.type = 'button';
        card.tabIndex = -1;
        card.className = 'rw-card';
        card.innerHTML = `<span class="rw-name">${type.variants?.[me]?.name ?? type.name}</span><span class="rw-cost">${type.cost}</span>
          <span class="rw-text">${blurb(type, me)}</span><span class="rw-have"></span>`;
        card.addEventListener('click', () => game.bus.emit('ui:reinforce', type.id));
        sec.querySelector('.rw-cards').append(card);
        this.cards.push({ card, type, have: card.querySelector('.rw-have') });
      }
      body.append(sec);
    }
    root.querySelector('.rw-close').addEventListener('click', () => this.toggle(false));
    game.bus.on('ui:reinforcements', () => this.toggle());
    game.bus.on('key', ({ code }) => {
      if (code === 'Escape' && this.open) {
        this.toggle(false);
        game.commands.escConsumed = true; // not the pause menu as well
      }
    });
  }

  get open() {
    return !this.root.hidden;
  }

  toggle(on = !this.open) {
    if (this.state.noReinforcements) on = false;
    this.root.hidden = !on;
    if (on) this.update();
  }

  update() {
    if (!this.open) return;
    const g = this.game;
    const me = g.playerFaction;
    const cp = Math.floor(this.state.cp[me]);
    const mine = g.world.stacksOf(me).filter((s) => g.mine(s));
    const count = g.world.stacksOf(me).filter((s) => !s.stats.structure && !s.autonomous).length;
    const full = count >= this.state.maxStacks;
    this.cp.textContent = `${cp} CP`;
    this.stacks.textContent = `${count} / ${this.state.maxStacks} stacks`;
    this.stacks.classList.toggle('full', full);
    for (const { card, type, have } of this.cards) {
      card.disabled = full || cp < type.cost;
      const n = mine.filter((s) => s.type.id === type.id).length;
      have.textContent = n ? `${n} in the field` : '';
    }
  }
}
