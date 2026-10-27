// Multiplayer lobby, inside the main menu's Multiplayer tab. One player hosts (picks the map
// and their side, gets a five-letter code), the other joins with that code; the host presses
// Start and both load the battle. If the code server can't be reached, either side can connect
// with pasted invitation / reply codes instead (net/Link.js), which also works offline on a LAN.
// The host also picks the mode and whether it's versus (one side each) or co-op (both on the
// same side against the AI; a mode's `multiplayer` is true for both, 'coop' for co-op only).
// Lobby messages: hello { v } (joiner) → lobby { map, mode, side, coop, time, weather } (host,
// again on every change) → start { … } (host). A version mismatch gets refuse { reason }.
import { MAPS, DEFAULT_MAP } from '../maps/index.js';
import { MODES } from '../modes/index.js';
import { FACTIONS, enemyOf } from '../data/factions.js';
import { NET_VERSION } from '../net/protocol.js';
import { hostGame, joinGame, createInvite, acceptInvite, acceptReply, cleanCode, CODE_LEN } from '../net/Link.js';
import { conditionsPicker } from './MainMenu.js';
import { TIMES, WEATHER } from '../core/Conditions.js';

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

/** "NATO", but "the Warsaw Pact". */
const sideName = (f) => (FACTIONS[f].name === 'NATO' ? 'NATO' : `the ${FACTIONS[f].name}`);

const button = (label, cls, onClick) => {
  const b = el('button', cls, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
};

async function copy(text, field) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    field?.select();
    return document.execCommand?.('copy') ?? false;
  }
}

export class Lobby {
  constructor({ onStart }) {
    this.onStart = onStart;
    const mode = Object.values(MODES).find((m) => m.multiplayer);
    this.choice = { mode: mode?.id ?? 'frontline', map: DEFAULT_MAP, side: 'nato', time: 'day', weather: 'overcast', coop: false };
    this.role = 'host';
    this.link = null;
    this.hosting = null;
    this.root = el('div', 'lobby');
    this.render();
  }

  // ------------------------------------------------------------------ layout

  render() {
    const r = this.root;
    r.replaceChildren();
    r.append(el('h2', '', 'Multiplayer'));
    r.append(el('p', 'mp-lead', 'Play a friend over the internet or on your network — one of you hosts, the other joins with a code. No account, no server to rent: your browsers connect directly. Your friend needs this same version of Cold Steel, started with <b>start.bat</b>.'));
    if (this.link) return this.renderConnected();

    const seg = el('div', 'seg mp-role');
    for (const [id, label] of [['host', 'Host a game'], ['join', 'Join a game']]) {
      seg.append(button(label, id === this.role ? 'on' : '', () => {
        if (this.busy) return;
        this.role = id;
        this.render();
      }));
    }
    r.append(seg);
    if (this.role === 'host') this.renderHost(); else this.renderJoin();
  }

  status(text, kind = '') {
    this.statusEl ??= el('div', 'mp-status');
    this.statusEl.className = `mp-status ${kind}`;
    this.statusEl.innerHTML = text;
    return this.statusEl;
  }

  choices(box) {
    box.append(el('h3', 'menu-sub', 'Game mode'));
    const modes = el('div', 'cards');
    const modeCards = Object.values(MODES).filter((m) => m.multiplayer);
    const together = el('div', 'seg mp-together');
    const setTogether = () => {
      const only = MODES[this.choice.mode]?.multiplayer === 'coop';
      if (only) this.choice.coop = true;
      together.replaceChildren();
      for (const [coop, label] of [[false, 'Versus — one side each'], [true, 'Co-op — together against the AI']]) {
        if (only && !coop) continue;
        const b = el('button', this.choice.coop === coop ? 'on' : '', label);
        b.type = 'button';
        b.addEventListener('click', () => { this.choice.coop = coop; setTogether(); this.renderSides(); this.sendLobby(); });
        together.append(b);
      }
    };
    for (const m of modeCards) {
      modes.append(this.card(m.name, m.description, this.choice.mode === m.id, () => { this.choice.mode = m.id; setTogether(); this.renderSides(); this.sendLobby(); }, modes));
    }
    box.append(modes, together);
    setTogether();
    box.append(el('h3', 'menu-sub', 'Map'));
    const maps = el('div', 'cards');
    for (const m of Object.values(MAPS)) {
      maps.append(this.card(m.name, m.description ?? '', this.choice.map === m.id, () => { this.choice.map = m.id; this.sendLobby(); }, maps));
    }
    box.append(maps);
    box.append(el('h3', 'menu-sub', 'Your side'));
    this.sidesBox = el('div', 'cards sides');
    box.append(this.sidesBox);
    this.renderSides();
    box.append(el('h3', 'menu-sub', 'Conditions'));
    box.append(conditionsPicker(this.choice, () => this.sendLobby()));
  }

  renderSides() {
    const sides = this.sidesBox;
    if (!sides) return;
    sides.replaceChildren();
    for (const f of ['nato', 'pact']) {
      const text = this.choice.coop ? 'You both command it, each your own stacks.' : `Your friend commands ${sideName(enemyOf(f))}.`;
      sides.append(this.card(FACTIONS[f].name, text, this.choice.side === f, () => { this.choice.side = f; this.sendLobby(); }, sides, f));
    }
  }

  card(title, text, on, pick, group, extra = '') {
    const c = el('button', `card${on ? ' on' : ''} ${extra}`, `<b>${title}</b><span>${text}</span>`);
    c.type = 'button';
    c.addEventListener('click', () => {
      for (const o of group.children) o.classList.toggle('on', o === c);
      pick();
    });
    return c;
  }

  renderHost() {
    const r = this.root;
    this.choices(r);
    const row = el('div', 'deploy-row mp-row');
    const go = button('Host game', 'deploy', () => this.host());
    go.hidden = this.busy;
    this.hostBtn = go;
    row.append(go);
    r.append(row, this.status(this.hosting ? this.statusEl.innerHTML : ''));
    r.append(this.manualHost());
  }

  renderJoin() {
    const r = this.root;
    r.append(el('h3', 'menu-sub', 'Join code'));
    const form = el('form', 'mp-join');
    const input = el('input', 'mp-code-input');
    Object.assign(input, { maxLength: CODE_LEN + 2, autocomplete: 'off', spellcheck: false, placeholder: 'K7Q2M' });
    input.setAttribute('aria-label', 'Join code from the host');
    input.addEventListener('input', () => { input.value = cleanCode(input.value); });
    const go = el('button', 'deploy', 'Join');
    go.type = 'submit';
    form.append(input, go);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.join(input.value);
    });
    r.append(form, this.status(''));
    r.append(this.manualJoin());
    setTimeout(() => input.focus(), 0);
  }

  manualHost() {
    const d = el('details', 'mp-manual');
    d.append(el('summary', '', 'No internet, or the code won\'t connect? Connect without a code'));
    const body = el('div', 'mp-manual-body');
    body.append(el('p', '', '1. Create an invitation and send it to your friend (any chat works). 2. They paste it under Join a game and send you their reply. 3. Paste the reply here.'));
    const invite = el('textarea', 'mp-paste');
    invite.readOnly = true;
    invite.rows = 3;
    invite.placeholder = 'Your invitation appears here';
    const reply = el('textarea', 'mp-paste');
    reply.rows = 3;
    reply.placeholder = 'Paste your friend\'s reply here';
    const make = button('Create invitation', 'mp-btn', async () => {
      make.disabled = true;
      this.status('Preparing the invitation…');
      try {
        this.invite = await createInvite();
        invite.value = this.invite.code;
        copyBtn.disabled = false;
        this.status('Invitation ready — copy it and send it to your friend, then paste their reply below.');
      } catch (e) {
        make.disabled = false;
        this.status(e.message, 'bad');
      }
    });
    const copyBtn = button('Copy', 'mp-btn', async () => {
      if (await copy(invite.value, invite)) copyBtn.textContent = 'Copied';
    });
    copyBtn.disabled = true;
    const connect = button('Connect', 'mp-btn', async () => {
      if (!this.invite) return this.status('Create the invitation first.', 'bad');
      this.status('Connecting…');
      try {
        const link = await acceptReply(this.invite, reply.value);
        this.connected(link, 'host');
      } catch (e) {
        this.status(e.message, 'bad');
      }
    });
    const row = (...items) => {
      const b = el('div', 'mp-btns');
      b.append(...items);
      return b;
    };
    body.append(row(make), invite, row(copyBtn), reply, row(connect));
    d.append(body);
    return d;
  }

  manualJoin() {
    const d = el('details', 'mp-manual');
    d.append(el('summary', '', 'Got an invitation instead of a code?'));
    const body = el('div', 'mp-manual-body');
    body.append(el('p', '', 'Paste the host\'s invitation, create your reply and send it back to them. You\'re connected as soon as they paste it.'));
    const invite = el('textarea', 'mp-paste');
    invite.rows = 3;
    invite.placeholder = 'Paste the host\'s invitation here';
    const reply = el('textarea', 'mp-paste');
    reply.readOnly = true;
    reply.rows = 3;
    reply.placeholder = 'Your reply appears here';
    const copyBtn = button('Copy', 'mp-btn', async () => {
      if (await copy(reply.value, reply)) copyBtn.textContent = 'Copied';
    });
    copyBtn.disabled = true;
    const make = button('Create reply', 'mp-btn', async () => {
      make.disabled = true;
      this.status('Preparing your reply…');
      try {
        const answer = await acceptInvite(invite.value);
        reply.value = answer.code;
        copyBtn.disabled = false;
        this.status('Reply ready — copy it and send it to the host. Waiting for them to paste it…');
        this.connected(await answer.link, 'join');
      } catch (e) {
        make.disabled = false;
        this.status(e.message, 'bad');
      }
    });
    const b1 = el('div', 'mp-btns');
    b1.append(make);
    const b2 = el('div', 'mp-btns');
    b2.append(copyBtn);
    body.append(invite, b1, reply, b2);
    d.append(body);
    return d;
  }

  renderConnected() {
    const r = this.root;
    const host = this.role === 'host';
    const card = el('div', 'mp-connected');
    card.append(el('b', '', 'Connected to your opponent'));
    this.pingEl = el('span', 'mp-ping', '');
    card.append(this.pingEl);
    r.append(card);
    if (host) {
      this.choices(r);
      const row = el('div', 'deploy-row mp-row');
      row.append(button('Start battle', 'deploy', () => this.start()));
      row.append(button('Leave', 'mp-btn', () => this.leave()));
      r.append(row);
    } else {
      const info = this.lobbyInfo;
      const map = info ? MAPS[info.map]?.name ?? info.map : '…';
      const side = info ? sideName(info.coop ? info.side : enemyOf(info.side)) + (info.coop ? ' together with the host' : '') : '…';
      const modeName = info ? MODES[info.mode]?.name ?? info.mode : '…';
      const when = info ? `${TIMES[info.time]?.name ?? 'Day'}, ${(WEATHER[info.weather]?.name ?? 'Overcast').toLowerCase()}` : '…';
      r.append(el('p', 'mp-wait', `The host picks the mode, map, sides and conditions.<br><b>${modeName}</b> on <b>${map}</b> · You command <b>${side}</b> · <b>${when}</b>.`));
      r.append(this.status('Waiting for the host to start the battle…'));
      const row = el('div', 'deploy-row mp-row');
      row.append(button('Leave', 'mp-btn', () => this.leave()));
      r.append(row);
    }
    clearInterval(this.pinger);
    this.pinger = setInterval(() => {
      if (this.pingEl && this.link) this.pingEl.textContent = this.link.rtt ? `Ping ${Math.round(this.link.rtt)} ms` : '';
    }, 1000);
  }

  // ------------------------------------------------------------------ connecting

  async host() {
    if (this.busy) return;
    this.busy = true;
    if (this.hostBtn) this.hostBtn.hidden = true;
    this.status('Getting a join code…');
    this.hosting = hostGame({
      onCode: (code) => {
        this.status(`<span class="mp-label">Your join code</span><span class="mp-code">${code}</span>
          <span class="mp-btns"><button type="button" class="mp-btn mp-copy">Copy</button><button type="button" class="mp-btn mp-cancel">Cancel</button></span>
          <span class="mp-hint">Send it to your friend — they pick <b>Join a game</b> and type it in. Waiting for them…</span>`);
        this.statusEl.querySelector('.mp-copy').addEventListener('click', async (e) => {
          if (await copy(code)) e.target.textContent = 'Copied';
        });
        this.statusEl.querySelector('.mp-cancel').addEventListener('click', () => {
          this.hosting?.cancel();
          this.status('');
        });
      },
    });
    try {
      this.connected(await this.hosting.link, 'host');
    } catch (e) {
      if (e.message !== 'cancelled') this.status(e.message, 'bad');
    } finally {
      this.busy = false;
      this.hosting = null;
      if (this.hostBtn) this.hostBtn.hidden = false;
    }
  }

  async join(code) {
    const c = cleanCode(code);
    if (c.length !== CODE_LEN) return this.status(`A join code has ${CODE_LEN} letters and digits.`, 'bad');
    if (this.busy) return;
    this.busy = true;
    this.status(`Connecting to game ${c}…`);
    try {
      this.connected(await joinGame(c), 'join');
    } catch (e) {
      this.status(e.message, 'bad');
    } finally {
      this.busy = false;
    }
  }

  /** Connected (by code or by hand): the lobby handshake. */
  connected(link, role) {
    this.link = link;
    this.role = role;
    this.statusEl = null;
    link.onClose(() => this.lost());
    if (role === 'host') {
      link.on('hello', (m) => {
        if (m.v !== NET_VERSION) {
          link.send({ k: 'refuse', reason: 'Your friend is running a different version of Cold Steel — you both need the same one.' });
          setTimeout(() => link.close(), 300);
          return;
        }
        this.sendLobby();
      });
    } else {
      link.on('lobby', (m) => { this.lobbyInfo = m; this.render(); });
      link.on('refuse', (m) => { this.refused = m.reason; });
      link.on('start', (m) => this.begin({ mode: m.mode, map: m.map, side: m.coop ? m.side : enemyOf(m.side), time: m.time, weather: m.weather, coop: !!m.coop, net: { role: 'client', link } }));
      link.send({ k: 'hello', v: NET_VERSION });
    }
    this.render();
  }

  sendLobby() {
    if (this.link && this.role === 'host') this.link.send({ k: 'lobby', ...this.choice });
  }

  start() {
    const link = this.link;
    link.send({ k: 'start', ...this.choice });
    this.begin({ ...this.choice, net: { role: 'host', link } });
  }

  begin(choice) {
    for (const k of ['hello', 'lobby', 'refuse', 'start']) this.link.off(k);
    clearInterval(this.pinger);
    this.started = true;
    this.onStart(choice);
  }

  leave() {
    this.link?.close();
  }

  lost() {
    if (this.started) return;
    clearInterval(this.pinger);
    this.link = null;
    this.lobbyInfo = null;
    this.render();
    this.root.append(this.status(this.refused ?? 'The connection was closed.', 'bad'));
    this.refused = null;
  }

  dispose() {
    this.hosting?.cancel();
    if (!this.started) this.link?.close();
    clearInterval(this.pinger);
  }
}
