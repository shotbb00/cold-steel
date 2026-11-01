// The reinforcement window (C, or the button in the command panel): every unit you can call in,
// under tabs — infantry, armour, fire support, air defence — each with its cost, what it's
// for, how many you have out, and why it can't be bought when it can't. Click to call one in
// (it arrives at your base); the window stays open for more, and Buy again repeats the last. Unit types sort themselves in by their `category`; anything new without
// one lands under "Other". The battle doesn't pause.
import { unitCost } from '../data/doctrine.js';
import { UNIT_TYPES } from '../data/units/index.js';
import { forces } from '../modes/shared.js';
import { silhouette } from './Icons.js';
import { forArmy, artKey } from '../data/factions.js';

const SECTIONS = [
  ['infantry', 'Infantry'],
  ['armour', 'Armour'],
  ['fire', 'Fire support'],
  ['airdefence', 'Air defence'],
  ['support', 'Support'],
  ['other', 'Other'],
];

/** The first sentence of the unit's description, for the card. */
const blurb = (type, faction, army) => (forArmy(type.variants, army, faction)?.text ?? '').split(/(?<=\.)\s/)[0];

/**
 * How hard a unit hits infantry, armour and aircraft, 0 (nothing) to 3, from its own weapons
 * (the main one and the specialist's): splash, indirect fire, long bursts and quick fire are
 * for men; anti-tank punch (vsArmor and pierce) or missiles for armour; anti-air for aircraft.
 */
export function damageVs(type) {
  const ws = [type.stats, type.specialist?.stats].filter((w) => w && (w.damage > 0 || w.antiAir || w.atgm));
  const best = (f) => ws.reduce((a, w) => Math.max(a, f(w)), 0);
  const va = (w) => w.vsArmor ?? 1;
  return {
    inf: best((w) => !(w.damage > 0) ? 0 : w.splash >= 3 || w.indirect || (w.burst ?? 1) >= 3 || (w.fireCooldown <= 0.5 && va(w) < 0.9) ? 3 : va(w) >= 0.9 ? 1 : 2),
    armour: best((w) => w.atgm || (va(w) >= 0.9 && (w.pierce ?? 0) >= 0.5) ? 3 : !(w.damage > 0) ? 0 : va(w) >= 0.4 ? 2 : 1),
    air: best((w) => (w.antiAir ? 3 : 0)),
  };
}
const GRADE = [['\u2013', 'none'], ['\u2193', 'low'], ['\u2192', 'medium'], ['\u2191', 'high']];
/** The card's row of three: infantry, armour, air — a dash, or an arrow down / level / up. */
const damageRow = (type) => {
  const d = damageVs(type);
  return `<span class="rw-dmg">${[['inf', 'Inf'], ['armour', 'Arm'], ['air', 'Air']].map(([k, label]) => {
    const [mark, word] = GRADE[d[k]];
    return `<span class="g${d[k]}" title="${label === 'Inf' ? 'Infantry' : label === 'Arm' ? 'Armour' : 'Aircraft'}: ${word}">${label}<b>${mark}</b></span>`;
  }).join('')}</span>`;
};

export class ReinforceWindow {
  constructor(game, state) {
    this.game = game;
    this.state = state;
    const me = game.playerFaction;
    const army = game.armyOf(me);
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
    const types = Object.values(UNIT_TYPES).filter((t) => !t.hidden && !t.airOnly && (!t.armies || t.armies.includes(army)) && (!allow || allow(t)) && (!t.needsRiver || game.world.river)); // air assault squads come by helicopter; bridge layers need a river
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
        card.innerHTML = `${silhouette(type.id, artKey(type, army, me), 'rw-sil')}<span class="rw-name">${forArmy(type.variants, army, me)?.name ?? type.name}</span><span class="rw-cost">${unitCost(type, army)}</span>
          <span class="rw-text">${blurb(type, me, army)}</span>${damageRow(type)}<span class="rw-have"></span><span class="rw-why"></span>`;
        card.addEventListener('click', () => game.bus.emit('ui:reinforce', type.id));
        sec.querySelector('.rw-cards').append(card);
        this.cards.push({ card, type, have: card.querySelector('.rw-have'), why: card.querySelector('.rw-why') });
      }
      body.append(sec);
    }
    this.show(tabs.firstElementChild, body.firstElementChild);
    const nameOf = (id) => forArmy(UNIT_TYPES[id]?.variants, army, me)?.name ?? UNIT_TYPES[id]?.name ?? id;
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
    const cp = Math.floor(this.state.cp[g.wallet(me, g.myOwner)]); // co-op: your own
    const mine = g.world.stacksOf(me).filter((s) => g.mine(s));
    const count = forces(g, me).length;
    const full = count >= this.state.maxStacks;
    this.cp.textContent = `${cp} CP`;
    this.stacks.textContent = `${count} / ${this.state.maxStacks} stacks`;
    this.stacks.classList.toggle('full', full);
    const lastType = this.last && this.cards.find((c) => c.type.id === this.last)?.type;
    const army = g.armyOf(me);
    if (lastType) this.again.disabled = full || cp < unitCost(lastType, army);
    for (const { card, type, have, why } of this.cards) {
      const cost = unitCost(type, army);
      const capped = full && !type.uncapped;
      card.disabled = capped || cp < cost;
      why.textContent = capped ? 'Stack limit reached' : cp < cost ? `Need ${cost - cp} more CP` : '';
      const n = mine.filter((s) => s.type.id === type.id).length;
      have.textContent = n ? `${n} in the field` : '';
    }
  }
}
