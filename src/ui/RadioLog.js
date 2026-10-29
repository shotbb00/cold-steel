// The radio log: a short running record of the battle on the left of the screen — villages
// changing hands, stacks lost and destroyed, and traffic from the rest of the war (data/radio.js)
// every half minute or so (Settings: Radio chatter, off by default). Each line carries the battle
// clock and fades after a few seconds. Built from events every machine
// sees (multiplayer clients included), so both players get their own side's log.
import { RADIO } from '../data/radio.js';
import { FACTIONS } from '../data/factions.js';
import { settings } from '../core/Settings.js';

const LINES = 3;
const LIFE = 12;            // seconds a line stays (the fade is in style.css)
const CHATTER = [25, 55];   // seconds between radio traffic lines
const rand = ([a, b]) => a + Math.random() * (b - a);

export class RadioLog {
  constructor(game) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.id = 'radio-log';
    this.el.setAttribute('aria-live', 'polite');
    document.getElementById('hud').append(this.el);
    this.lines = [...(RADIO[game.playerFaction] ?? [])].sort(() => Math.random() - 0.5);
    this.next = rand([8, 16]);
    this.clock = game.conditions?.clock ?? 14 * 60; // minutes after midnight at the start
    const me = game.playerFaction;
    game.bus.on('point:owner', ({ point, owner, prev }) => {
      if (owner) this.add(owner === me ? `${point.name} is ours.` : `${point.name} has fallen to the ${FACTIONS[owner].name}.`, owner === me ? 'good' : 'bad');
      else if (prev) this.add(prev === me ? `We've been pushed out of ${point.name}.` : `The enemy has been thrown out of ${point.name}.`, prev === me ? 'bad' : 'good');
    });
    game.bus.on('stack:destroyed', (s) => {
      this.add(s.faction === me ? `Lost contact with ${s.name}.` : `Enemy ${s.type.shortName} destroyed.`, s.faction === me ? 'bad' : 'good');
    });
    game.bus.on('game:end', () => { this.next = Infinity; });
  }

  time() {
    const m = Math.floor(this.clock + this.game.time / 60);
    return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  add(text, kind = '') {
    const row = document.createElement('div');
    row.className = `rl-line ${kind}`;
    row.innerHTML = '<time></time><span></span>';
    row.querySelector('time').textContent = this.time();
    row.querySelector('span').textContent = text;
    this.el.append(row);
    while (this.el.children.length > LINES) this.el.firstChild.remove();
    setTimeout(() => row.remove(), LIFE * 1000);
  }

  update() {
    const t = this.game.time;
    if (t < this.next || !this.lines.length || !settings.get('radioChatter')) return;
    this.next = t + rand(CHATTER);
    const line = this.lines.shift();
    this.lines.push(line); // round and round, never twice in a row
    this.add(line, 'radio');
  }
}
