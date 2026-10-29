// DOM HUD: view badge (and the ? that opens the key card, also F1), stack counts, FPS, toasts,
// the targeting hint, the tactical selection panel, the end banner and — while you control a unit — its health, weapon state (ammo / reload / beam
// charge) and leadership bonus. Markup lives in index.html; modes may add their own HUD.
import { requestReplay, toMenu } from '../core/replay.js';
import { renderReport } from './AfterAction.js';
import { ActionBar } from './ActionBar.js';
import { settings } from '../core/Settings.js';
import { CameraMode } from '../core/CameraManager.js';
import { ACTIONS, keys, keyName } from '../core/Keys.js';
import { silhouette } from './Icons.js';

// the key card: every bound key by where it works, and what the mouse does
const MOUSE = {
  command: ['Left click / drag: select', 'Right click: move · on an enemy: attack · on a house: occupy', 'Right drag: move and face that way',
    'Wheel: zoom · middle drag: turn and tilt the view', 'Double-click a stack: take direct control', 'Minimap: left looks, right moves'],
  control: ['Mouse: aim · left button: fire'],
};
const CARD = [['command', 'Command view'], ['control', 'Direct control'], ['both', 'Everywhere']];

export class HUD {
  constructor(game) {
    this.game = game;
    const $ = (id) => document.getElementById(id);
    this.el = {
      modeBadge: $('mode-badge'), allyCount: $('ally-count'), enemyCount: $('enemy-count'), fps: $('fps'),
      unitName: $('unit-name'), hpFill: $('hp-fill'), hpText: $('hp-text'),
      ammoLabel: $('ammo-label'), ammoFill: $('ammo-fill'), ammoText: $('ammo-text'), ammoBar: $('ammo-bar'),
      crosshair: $('crosshair'), lockHint: $('lock-hint'),
      selection: $('selection-info'), toasts: $('toasts'), banner: $('banner'),
      targetHint: $('target-hint'), keyCard: $('key-card'),
    };
    $('keys-open').addEventListener('click', (e) => { e.currentTarget.blur(); this.toggleKeys(); });
    this.el.keyCard.addEventListener('click', (e) => { if (e.target === this.el.keyCard || e.target.closest('.kc-close')) this.toggleKeys(false); });

    // command buttons, including the ones the action bar adds and removes
    document.getElementById('command-panel').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cmd]');
      if (!btn) return;
      btn.blur(); // keep Space from re-clicking it
      game.bus.emit('ui:command', btn.dataset.cmd);
    });
    this.actions = new ActionBar(game);
    this.el.banner.querySelector('[data-act="again"]').addEventListener('click', () => requestReplay());
    this.el.banner.querySelector('[data-act="menu"]').addEventListener('click', () => { game.net?.link.close(); toMenu(game.campaign ? 'campaign' : null); });

    document.body.classList.toggle('night', !!game.conditions?.night);
    // multiplayer is fought from the command view: no direct-control button or hints
    if (game.net) document.body.classList.add('online');

    const bus = game.bus;
    bus.on('toast', (msg) => this.toast(msg));
    bus.on('key', ({ code }) => {
      if (code === 'F1') this.toggleKeys();
      else if (code === 'Escape' && !this.el.keyCard.hidden) { this.toggleKeys(false); game.commands.escConsumed = true; }
    });
    bus.on('stack:destroyed', (s) => this.toast(`${s.name} ${s.faction === game.playerFaction ? 'lost' : 'destroyed'}`));
    bus.on('selection', () => this.renderSelection());
    bus.on('game:end', (r) => this.showBanner(r));

    this.slowTimer = 0;
    this.frames = 0;
    this.fpsStart = performance.now();
    const showFps = () => { this.el.fps.hidden = !settings.get('fpsCounter'); };
    showFps();
    settings.on((key) => { if (key === 'fpsCounter') showFps(); });
  }

  update(dt) {
    const g = this.game;
    this.actions.update(dt);
    const tactical = g.cameraManager.mode === CameraMode.TACTICAL;
    const el = this.el;
    document.body.classList.toggle('tactical', tactical);
    el.modeBadge.textContent = tactical ? 'Command' : 'Control';
    const hint = (tactical && g.commands.targeting?.hint) || '';
    if (hint !== this.hint) { this.hint = hint; el.targetHint.textContent = hint; el.targetHint.hidden = !hint; }

    const u = g.player.unit;
    if (u) {
      const s = u.stats;
      el.hpFill.style.width = `${(u.hp / u.maxHp) * 100}%`;
      el.hpText.textContent = `${Math.ceil(u.hp)}`;
      if (s.weapon === 'beam') {
        const beam = u.beam;
        const charge = beam ? 1 - beam.t / beam.duration : u.cooldown > 0 ? 0 : 1;
        el.ammoLabel.textContent = 'Beam';
        el.ammoFill.style.width = `${Math.max(0, charge) * 100}%`;
        el.ammoText.textContent = beam ? 'FIRING' : u.cooldown > 0 ? `${u.cooldown.toFixed(1)}s` : 'READY';
        el.ammoBar.classList.toggle('overheated', !beam && u.cooldown > 0);
      } else {
        const reloading = u.reloadT > 0;
        el.ammoLabel.textContent = 'Ammo';
        el.ammoFill.style.width = `${(reloading ? 1 - u.reloadT / s.reloadTime : u.mag / s.magSize) * 100}%`;
        el.ammoText.textContent = reloading ? 'RELOADING' : `${u.mag}/${s.magSize}`;
        el.ammoBar.classList.toggle('overheated', reloading);
      }
      el.crosshair.classList.toggle('overheated', u.reloadT > 0);
    }
    el.lockHint.classList.toggle('show', !tactical && !!u && !g.input.locked && !g.ended);
    // under fire in direct control: the view closes in with the man's suppression
    const sup = !tactical && u?.alive ? Math.min(1, u.suppression) : 0;
    const vig = Math.round(sup * 20) / 20;
    if (vig !== this.vignette) { this.vignette = vig; (this.vigEl ??= document.getElementById('suppress-vignette')).style.opacity = String(vig * 0.9); }

    this.frames++;
    const now = performance.now();
    if (now - this.fpsStart >= 500) {
      el.fps.textContent = `${Math.round((this.frames * 1000) / (now - this.fpsStart))} fps · CPU ${Math.round(g.cpuMs ?? 0)} ms`;
      this.frames = 0;
      this.fpsStart = now;
    }

    this.slowTimer -= dt;
    if (this.slowTimer <= 0) {
      this.slowTimer = 0.25;
      el.allyCount.textContent = g.world.stacksOf(g.playerFaction).length;
      el.enemyCount.textContent = g.world.stacks.filter((s) => s.alive && s.faction !== g.playerFaction && s.visible !== false).length;
      if (u) {
        el.unitName.innerHTML = '';
        el.unitName.append(u.stack.name, Object.assign(document.createElement('em'), {
          textContent: ` · ${u.stack.type.shortName}${u.stack.units.length > 1 ? ` ${u.index + 1}/${u.stack.units.length}` : ''}`,
        }));
      }
      if (tactical) this.renderSelection();
    }
  }

  renderSelection() {
    const sel = [...this.game.commands.selected].filter((s) => s.alive);
    const box = this.el.selection;
    if (!sel.length) {
      box.className = 'empty';
      box.textContent = this.game.input.touch ? 'Tap a stack to select it' : 'Click or drag to select your stacks';
      return;
    }
    const span = (cls, text) => Object.assign(document.createElement('span'), { className: cls, textContent: text });
    const bar = (s) => {
      const b = document.createElement('i');
      b.className = 'sel-hp';
      b.style.setProperty('--hp', String(s.units.reduce((a, u) => a + Math.max(0, u.hp) / u.maxHp, 0) / s.units.length));
      return b;
    };
    if (sel.length === 1) {
      const [s] = sel;
      box.className = 'one';
      const top = document.createElement('div');
      top.className = 'sel-top';
      top.append(span('sel-name', s.name), span('sel-type', `${s.type.shortName} · ${s.aliveCount}/${s.units.length}`));
      box.replaceChildren(top, span('sel-state', `${s.ai.state} · ${s.moraleWord}`), bar(s));
      box.insertAdjacentHTML('afterbegin', silhouette(s.type.id, s.faction, 'sel-sil'));
      return;
    }
    box.className = 'many';
    const head = span('sel-count', `${sel.length} stacks`);
    const rows = sel.slice(0, 4).map((s) => {
      const row = document.createElement('div');
      row.className = 'sel';
      row.append(span('sel-name', s.name), span('sel-type', `${s.aliveCount}/${s.units.length}`), bar(s));
      return row;
    });
    if (sel.length > 4) rows.push(span('sel-more', `+ ${sel.length - 4} more`));
    box.replaceChildren(head, ...rows);
  }

  /** The key card (F1, the ? in the top bar): built fresh each time, so it shows rebindings. */
  toggleKeys(on = this.el.keyCard.hidden) {
    const card = this.el.keyCard;
    card.hidden = !on;
    if (!on) return;
    const touch = this.game.input.touch;
    const cols = CARD.map(([ctx, title]) => {
      const list = ACTIONS.filter((a) => a.ctx === ctx && !(this.game.net && a.ctx === 'control'));
      const rows = list.map((a) => `<li><kbd>${keyName(keys.code(a.id))}</kbd><span>${a.label}</span></li>`).join('');
      const mouse = touch ? '' : (MOUSE[ctx] ?? []).map((m) => `<li class="kc-mouse"><span>${m}</span></li>`).join('');
      return `<section><h4>${title}</h4><ul>${mouse}${rows}</ul></section>`;
    }).join('');
    card.innerHTML = `<div class="kc-box"><div class="kc-head"><b>Keys</b><span>Rebind them in Settings → Controls</span><button type="button" class="kc-close" aria-label="Close">×</button></div><div class="kc-cols">${cols}</div></div>`;
  }

  toast(message) {
    const last = this.el.toasts.lastElementChild;
    if (last && last.textContent === message) return; // already on screen
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = message;
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => t.remove(), 3000);
  }

  showBanner({ victory, title, subtitle, report }) {
    const b = this.el.banner;
    b.className = victory ? 'victory' : 'defeat';
    b.querySelector('h1').textContent = title;
    b.querySelector('p').textContent = subtitle;
    b.querySelector('.aar')?.remove();
    if (report) b.querySelector('.banner-buttons').before(renderReport(report, this.game.playerFaction));
    b.querySelector('[data-act="again"]').hidden = !!this.game.net || !!this.game.campaign; // multiplayer / campaign: via the menu
    if (this.game.campaign) b.querySelector('[data-act="menu"]').textContent = 'Continue campaign';
    b.hidden = false;
    // the report takes the screen: the battle HUD (score bar, minimap, radio log …) steps aside
    document.getElementById('hud')?.classList.add('over');
    document.getElementById('labels')?.classList.add('over');
  }
}
