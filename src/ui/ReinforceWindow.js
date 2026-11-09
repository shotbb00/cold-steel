// The reinforcement window (C, or the button in the command panel): every unit you can call in,
// under tabs — infantry, armour, fire support, air defence — each with its cost, what it's
// for, how many you have out, and why it can't be bought when it can't. Click to call one in
// (it arrives at your base, on the road picked under the head: Auto — a forward command post,
// else any free road — or left, centre or right as you look at the field; each road brings one
// arrival at a time); the window stays open for more, and Buy again repeats the last. Unit types sort themselves in by their `category`; anything new without
// one lands under "Other". The battle doesn't pause.
import { unitCost } from '../data/doctrine.js';
import { UNIT_TYPES } from '../data/units/index.js';
import { forces } from '../modes/shared.js';
import { silhouette } from './Icons.js';
import { forArmy, artKey } from '../data/factions.js';
import * as THREE from 'three';
import { KITS, takesKit } from '../data/kits.js';
import { epoch, year } from '../data/epoch.js';

const SECTIONS = [
  ['infantry', 'Infantry'],
  ['cavalry', 'Cavalry'],   // (1806)
  ['armour', 'Armour'],
  ['fire', 'Fire support'],
  ['airdefence', 'Air defence'],
  ['support', 'Support'],
  ['line', 'Battle line'],   // (the open-sea maps: ships by their `fleet`, data/units45/ships.js)
  ['carrier', 'Carriers'],
  ['escort', 'Escorts'],
  ['under', 'Submarines & support'],
  ['naval', 'Warships'],
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
    armour: Math.max(type.stats.lightAT ? 2 : 0, best((w) => w.atgm || (va(w) >= 0.9 && (w.pierce ?? 0) >= 0.5) ? 3 : !(w.damage > 0) ? 0 : va(w) >= 0.4 ? 2 : 1)), // (a rifle squad's LAWs: a fair chance)
    air: best((w) => (w.antiAir ? 3 : 0)),
  };
}
const GRADE = [['\u2013', 'none'], ['\u2193', 'low'], ['\u2192', 'medium'], ['\u2191', 'high']];
/** The card's row of three: infantry, armour, air — a dash, or an arrow down / level / up. */
const damageRow = (type) => {
  const d = damageVs(type);
  if (year() < 1900) { // 1806: against foot and against horse (no armour, no aircraft); horsemen's weapon is the charge
    const cav = type.stats.cavalry && !type.stats.loose;
    const v = { inf: cav ? 3 : d.inf, horse: cav ? 2 : d.inf };
    return `<span class="rw-dmg">${[['inf', 'Foot'], ['horse', 'Horse']].map(([k, label]) => { const [mark, word] = GRADE[v[k]]; return `<span class="g${v[k]}" title="Against ${label.toLowerCase()}: ${word}">${label}<b>${mark}</b></span>`; }).join('')}</span>`;
  }
  if (type.category === 'naval') { // at sea: against ships (guns, torpedoes), submarines (depth charges) and aircraft (the AA)
    const st = type.stats, ms = Object.values(type.mounts ?? {}).flat();
    const aa = st.antiAir?.hitNear ?? 0;
    const v = {
      ships: ms.some((m) => m.torpedo) || st.damage >= 700 ? 3 : st.damage >= 200 ? 2 : st.damage > 0 ? 1 : 0,
      subs: st.depthCharges ? (st.sonar >= 500 ? 3 : 2) : 0,
      air: aa >= 0.075 ? 3 : aa >= 0.05 ? 2 : aa > 0 ? 1 : 0,
    };
    return `<span class="rw-dmg">${[['ships', 'Ships'], ['subs', 'Subs'], ['air', 'Air']].map(([k, label]) => { const [mark, word] = GRADE[v[k]]; return `<span class="g${v[k]}" title="Against ${k === 'subs' ? 'submarines' : k === 'air' ? 'aircraft' : 'ships'}: ${word}">${label}<b>${mark}</b></span>`; }).join('')}</span>`;
  }
  return `<span class="rw-dmg">${[['inf', 'Inf'], ['armour', 'Arm'], ['air', 'Air']].map(([k, label]) => {
    const [mark, word] = GRADE[d[k]];
    return `<span class="g${d[k]}" title="${label === 'Inf' ? 'Infantry' : label === 'Arm' ? 'Armour' : 'Aircraft'}: ${word}">${label}<b>${mark}</b></span>`;
  }).join('')}</span>`;
};

export class ReinforceWindow {
  constructor(game, state) {
    this.game = game;
    this.state = state;
    this._p = new THREE.Vector3();
    const me = game.playerFaction;
    const army = game.armyOf(me);
    const root = (this.root = document.createElement('div'));
    root.id = 'reinforce-window';
    root.hidden = true;
    root.innerHTML = `<div class="rw-head"><b>Reinforcements</b><span class="rw-cp"></span><span class="rw-stacks"></span>
      <button type="button" class="rw-again" tabindex="-1" hidden></button>
      <button type="button" class="rw-close" aria-label="Close">×</button></div><div class="rw-entry"><span>Arrive</span><div class="seg"></div></div><div class="rw-kit"><span>Rifle kit</span><div class="seg"></div></div><div class="rw-tabs"></div><div class="rw-body"></div>`;
    document.getElementById('hud').append(root);
    this.cp = root.querySelector('.rw-cp');
    this.stacks = root.querySelector('.rw-stacks');
    const body = root.querySelector('.rw-body');
    const tabs = root.querySelector('.rw-tabs');
    this.again = root.querySelector('.rw-again');
    // the road: Auto, then the base's entries ordered left to right as the camera sees them (update())
    const roads = game.map.bases[me]?.entries ?? [];
    this.roads = roads.map((x, i) => ({ i, x: game.map.bases[me].x + x, z: game.map.bases[me].z }));
    this.entrySeg = root.querySelector('.rw-entry .seg');
    root.querySelector('.rw-entry').hidden = roads.length < 2;
    game.reinforceEntry = null;
    this.entryBtns = [null, ...this.roads.map((r) => r.i)].map((i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.className = i === null ? 'on' : '';
      b.textContent = i === null ? 'Auto' : '';
      b.title = i === null ? 'At a forward command post if one is set up, else on any free road' : '';
      b.addEventListener('click', () => {
        game.reinforceEntry = i;
        for (const o of this.entryBtns) o.b.classList.toggle('on', o.b === b);
      });
      this.entrySeg.append(b);
      return { b, i };
    });
    const allow = state?.allow; // the mode may bar some types (modes/infantry.js)
    const types = Object.values(UNIT_TYPES).filter((t) => !t.hidden && !t.airOnly && (!t.armies || t.armies.includes(army)) && (!allow || allow(t)) && (!t.needsRiver || game.world.river)); // air assault squads come by helicopter; bridge layers need a river
    // the kit the next rifle squads bring (data/kits.js; same price)
    game.reinforceKit = null;
    const kitSeg = root.querySelector('.rw-kit .seg');
    root.querySelector('.rw-kit').hidden = !types.some(takesKit); // (the rifle squads of 1985 and 1945: the types with kitModels)
    for (const [id, kit] of Object.entries(KITS)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.textContent = kit.label;
      b.title = kit.tip;
      b.className = id === 'standard' ? 'on' : '';
      b.addEventListener('click', () => {
        game.reinforceKit = id === 'standard' ? null : id;
        for (const o of kitSeg.children) o.classList.toggle('on', o === b);
      });
      kitSeg.append(b);
    }
    this.cards = [];
    for (const [cat, title] of SECTIONS) {
      const list = types.filter((t) => (SECTIONS.some(([c]) => c === (t.fleet ?? t.category)) ? t.fleet ?? t.category : 'other') === cat);
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
    this.shown = null;
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
    // runs every frame: touch the DOM only when something shown has changed (rewriting it each frame
    // made the cards change height mid-scroll on phones: the list jumped and the header flickered)
    const cam = g.camera.matrixWorld.elements; // (its first column: the camera's right, in the world)
    const key = `${cp}|${count}|${this.last}|${mine.map((s) => s.type.id).sort().join()}|${Math.sign(cam[0]).toFixed(0)}${Math.round(cam[0] * 4)}${Math.round(cam[2] * 4)}`; // (the roads' names follow the camera's turn)
    if (key === this.shown) return;
    this.shown = key;
    this.cp.textContent = `${cp} CP`;
    // the roads, named as the field looks from where the camera is (left, centre, right), and how long each is busy
    // by the camera's right-hand direction, not the projection: the roads are at the base, usually behind
    // the camera, and a point behind it projects mirrored — left and right came out swapped
    const screenX = (r) => (r.x - g.camera.position.x) * cam[0] + (r.z - g.camera.position.z) * cam[2];
    const order = [...this.roads].sort((a, b) => screenX(a) - screenX(b));
    const names = order.length === 3 ? ['Left', 'Centre', 'Right'] : order.length === 2 ? ['Left', 'Right'] : order.map((_, k) => `Road ${k + 1}`);
    const free = this.state.entryFree ?? {};
    for (const o of this.entryBtns) {
      if (o.i === null) continue;
      const k = order.findIndex((r) => r.i === o.i);
      const wait = Math.ceil((free[`${me}:${o.i}`] ?? 0) - g.time);
      const text = wait > 0 ? `${names[k]} ${wait} s` : names[k];
      if (o.b.textContent !== text) o.b.textContent = text;
      o.b.style.order = String(k + 1);
      o.b.title = `Arrive on the ${names[k].toLowerCase()} road${wait > 0 ? ` (busy, ${wait} s)` : ''}`;
    }
    this.stacks.textContent = `${count} / ${this.state.maxStacks} stacks`;
    this.stacks.classList.toggle('full', full);
    const lastType = this.last && this.cards.find((c) => c.type.id === this.last)?.type;
    const army = g.armyOf(me);
    if (lastType) this.again.disabled = full || cp < unitCost(lastType, army);
    for (const { card, type, have, why } of this.cards) {
      const cost = unitCost(type, army);
      const n = mine.filter((s) => s.type.id === type.id).length;
      const limited = type.limit && g.world.stacksOf(me).filter((s) => s.type.id === type.id && !s.withdrawing).length >= type.limit; // (the side's, co-op included)
      const capped = (full && !type.uncapped) || limited;
      card.disabled = capped || cp < cost;
      why.textContent = limited ? `Limit reached (${type.limit})` : capped ? 'Stack limit reached' : cp < cost ? `Need ${cost - cp} more CP` : '';
      have.textContent = n ? `${n} in the field` : '';
    }
  }
}
