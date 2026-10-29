// The reinforcement window (C, or the button in the command panel): every unit you can call in,
// under tabs — infantry, armour, fire support, air defence — each with its cost, what it's
// for, how many you have out, and why it can't be bought when it can't. Click to call one in
// (it arrives at your base); the window stays open for more, and Buy again repeats the last. Unit types sort themselves in by their `category`; anything new without
// one lands under "Other". The battle doesn't pause.
import { UNIT_TYPES } from '../data/units/index.js';
import { silhouette } from './Icons.js';

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
      <button type="button" class="rw-again" tabindex="-1" hidden></button>
      <button type="button" class="rw-close" aria-label="Close">×</button></div><div class="rw-tabs"></div><div class="rw-body"></div>`;
    document.getElementById('hud').append(root);
    this.cp = root.querySelector('.rw-cp');
    this.stacks = root.querySelector('.rw-stacks');
    const body = root.querySelector('.rw-body');
    const tabs = root.querySelector('.rw-tabs');
    this.again = root.querySelector('.rw-again');
    const allow = state?.allow; // the mode may bar some types (modes/infantry.js)
    const types = Object.values(UNIT_TYPES).filter((t) => !t.hidden && !t.airOnly && (!allow || allow(t)) && (!t.needsRiver || game.world.river)); // air assault squads come by helicopter; bridge layers need a river
    this.cards = [];
    for (const [cat, title] of SECTIONS) {
      const list = types.filter((t) => (SECTIONS.some(([c]) => c === t.category) ? t.category : 'other') === cat);
      if (!list.length) continue;
      const sec = document.createElement('section');
      sec.innerHTML = '<div class="rw-cards"></div>';
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.tabIndex = -1;
      tab.textContent = title;
      tab.addEventListener('click', () => this.show(tab, sec));
      tabs.append(tab);
      for (const type of list) {
        const card = document.createElement('button');
        card.type = 'button';
        card.tabIndex = -1;
        card.className = 'rw-card';
        card.innerHTML = `${silhouette(type.id, me, 'rw-sil')}<span class="rw-name">${type.variants?.[me]?.name ?? type.name}</span><span class="rw-cost">${type.cost}</span>
          <span class="rw-text">${blurb(type, me)}</span><span class="rw-have"></span><span class="rw-why"></span>`;
        card.addEventListener('click', () => game.bus.emit('ui:reinforce', type.id));
        sec.querySelector('.rw-cards').append(card);
        this.cards.push({ card, type, have: card.querySelector('.rw-have'), why: card.querySelector('.rw-why') });
      }
      body.append(sec);
    }
    this.show(tabs.firstElementChild, body.firstElementChild);
    const nameOf = (id) => UNIT_TYPES[id]?.variants?.[me]?.name ?? UNIT_TYPES[id]?.name ?? id;
    game.bus.on('ui:reinforce', (id) => {
      this.last = id;
      this.again.textContent = `Buy again: ${nameOf(id)}`;
      this.again.hidden = false;
    });
    this.again.addEventListener('click', () => this.last && game.bus.emit('ui:reinforce', this.last));
    root.querySelector('.rw-close').addEventListener('click', () => this.toggle(false));
    game.bus.on('ui:reinforcements', () => this.toggle());
    game.bus.on('key', ({ code }) => {
      if (code === 'Escape' && this.open) {
        this.toggle(false);
        game.commands.escConsumed = true; // not the pause menu as well
      }
    });
  }

  /** One tab's cards at a time. */
  show(tab, sec) {
    if (!tab) return;
    for (const t of tab.parentNode.children) t.classList.toggle('on', t === tab);
    for (const s of sec.parentNode.children) s.hidden = s !== sec;
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
    const lastType = this.last && this.cards.find((c) => c.type.id === this.last)?.type;
    if (lastType) this.again.disabled = full || cp < lastType.cost;
    for (const { card, type, have, why } of this.cards) {
      card.disabled = full || cp < type.cost;
      why.textContent = full ? 'Stack limit reached' : cp < type.cost ? `Need ${type.cost - cp} more CP` : '';
      const n = mine.filter((s) => s.type.id === type.id).length;
      have.textContent = n ? `${n} in the field` : '';
    }
  }
}
