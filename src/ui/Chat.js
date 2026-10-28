// Chat and map pings between the two players of a multiplayer battle (net/Link.js reliable
// channel: { k: 'chat', from, text } and { k: 'mark', from, x, z, kind } — not 'ping', which the
// link itself uses to measure latency).
//   chat   – the chat key (Enter by default, core/Keys.js) opens a line at the bottom left; Enter
//            sends, Esc closes. Messages show with the sender's name and fade after a while;
//            while the line is open the last ones stay up. Keys typed there don't reach the game.
//   pings  – co-op only (in versus they'd go to the enemy): Alt + click on the battlefield or the
//            minimap marks the spot for your teammate ("here"), Alt + right-click marks danger.
//            A pulsing ring on the ground and on the minimap for PING_LIFE seconds, and a chat
//            line. ChatBox.attach(link, names) also gives the lobby the same chat (no pings).
import * as THREE from 'three';
import { keys } from '../core/Keys.js';

const LINES = 8;
const FADE_AFTER = 14;     // seconds a message stays visible while the line is closed
const MAX_LEN = 200;
export const PING_LIFE = 8;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** The chat log and input line, usable in the lobby and in battle. */
export class ChatBox {
  /** @param {HTMLElement} parent  @param {{ link, me: string, peer: string, inline?: boolean }} o */
  constructor(parent, { link, me, peer, inline = false }) {
    this.link = link;
    this.me = me;
    this.peer = peer;
    this.inline = inline;              // lobby: always open, no fading
    this.root = document.createElement('div');
    this.root.className = `chat${inline ? ' inline' : ''}`;
    this.log = document.createElement('div');
    this.log.className = 'chat-log';
    this.log.setAttribute('aria-live', 'polite');
    this.form = document.createElement('form');
    this.form.className = 'chat-form';
    this.input = document.createElement('input');
    Object.assign(this.input, { type: 'text', maxLength: MAX_LEN, autocomplete: 'off', placeholder: inline ? 'Message your friend…' : 'Say something — Enter sends, Esc closes' });
    this.input.setAttribute('aria-label', 'Chat message');
    this.form.append(this.input);
    this.root.append(this.log, this.form);
    parent.append(this.root);
    this.form.hidden = !inline;
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.send(this.input.value);
      this.input.value = '';
      if (!inline) this.close();
    });
    // keys typed into the line stay in it (the game listens on window)
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape' && !inline) { e.preventDefault(); this.close(); }
    });
    this.input.addEventListener('keyup', (e) => e.stopPropagation());
    link.on('chat', (m) => this.add(m.from ?? this.peer, m.text, 'them'));
  }

  get isOpen() {
    return !this.form.hidden;
  }

  open() {
    this.form.hidden = false;
    this.root.classList.add('open');
    // focus after the key that opened it is done, or that same Enter submits the empty line
    setTimeout(() => this.input.focus(), 0);
  }

  close() {
    if (this.inline) return;
    this.form.hidden = true;
    this.root.classList.remove('open');
    this.input.blur();
  }

  send(text) {
    const t = String(text ?? '').trim().slice(0, MAX_LEN);
    if (!t) return;
    this.link.send({ k: 'chat', from: this.me, text: t });
    this.add(this.me, t, 'me');
  }

  /** A line in the log: `kind` me / them / system / ping. */
  add(from, text, kind = 'them') {
    const row = document.createElement('div');
    row.className = `chat-line ${kind}`;
    row.innerHTML = from ? `<b>${esc(from)}</b> ${esc(text)}` : esc(text);
    this.log.append(row);
    while (this.log.children.length > (this.inline ? 60 : LINES)) this.log.firstChild.remove();
    this.log.scrollTop = this.log.scrollHeight;
    if (!this.inline) setTimeout(() => row.classList.add('old'), FADE_AFTER * 1000);
  }

  dispose() {
    this.link.off('chat');
    this.root.remove();
  }
}

/** In battle: the chat box, the chat key, and (co-op) pings with their markers. */
export class BattleChat {
  constructor(game) {
    this.game = game;
    this.pings = [];      // { x, z, kind, t, mesh } for the minimap and the ground markers
    const net = game.net;
    if (!net?.link) return;
    const names = game.netNames ?? {};
    this.box = new ChatBox(document.getElementById('hud'), { link: net.link, me: names.me ?? 'You', peer: names.peer ?? 'Your friend' });
    this.box.add('', game.coop ? 'Chat with Enter · Alt + click marks a spot for your teammate, Alt + right-click marks danger' : 'Chat with Enter', 'system');
    game.bus.on('key', ({ code }) => {
      if (game.ended || this.box.isOpen) return;
      if (keys.is(code, 'chat')) this.box.open();
    });
    if (game.coop) {
      net.link.on('mark', (m) => this.addPing(m.x, m.z, m.kind, m.from ?? this.box.peer, false));
      game.bus.on('ping', ({ x, z, kind }) => this.ping(x, z, kind));
    }
  }

  /** Mark a spot for the teammate (co-op). */
  ping(x, z, kind = 'here') {
    if (!this.game.coop || !this.box) return;
    this.game.net.link.send({ k: 'mark', from: this.box.me, x: Math.round(x), z: Math.round(z), kind });
    this.addPing(x, z, kind, this.box.me, true);
  }

  addPing(x, z, kind, from, mine) {
    const g = this.game;
    const colour = kind === 'danger' ? 0xff5a48 : 0xffc35a;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 3, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, fog: false }),
    );
    ring.position.set(x, g.terrain.heightAt(x, z) + 0.3, z);
    ring.renderOrder = 5;
    g.scene.add(ring);
    this.pings.push({ x, z, kind, t: 0, mesh: ring });
    while (this.pings.length > 6) this.dropPing(this.pings[0]);
    this.box.add(from, kind === 'danger' ? 'marked danger on the map' : 'marked a spot on the map', mine ? 'me ping' : 'them ping');
    g.audio?.play('click', null, { volume: 0.6 });
  }

  dropPing(p) {
    p.mesh.removeFromParent();
    p.mesh.geometry.dispose();
    p.mesh.material.dispose();
    this.pings.splice(this.pings.indexOf(p), 1);
  }

  update(dt) {
    for (const p of [...this.pings]) {
      p.t += dt;
      if (p.t >= PING_LIFE) { this.dropPing(p); continue; }
      const pulse = 1 + 0.35 * Math.sin(p.t * 6);
      p.mesh.scale.setScalar(pulse);
      p.mesh.material.opacity = 0.9 * Math.min(1, (PING_LIFE - p.t) / 1.5);
    }
  }
}
