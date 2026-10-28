// DOM HUD: view badge, stack counts, FPS, toasts, the tactical selection panel, the end
// banner and — while you control a unit — its health, weapon state (ammo / reload / beam
// charge) and leadership bonus. Markup lives in index.html; modes may add their own HUD.
import { requestReplay, toMenu } from '../core/replay.js';
import { renderReport } from './AfterAction.js';
import { ActionBar } from './ActionBar.js';
import { settings } from '../core/Settings.js';
import { CameraMode } from '../core/CameraManager.js';

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
    };

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
    bus.on('stack:destroyed', (s) => this.toast(`${s.name} ${s.faction === game.playerFaction ? 'lost' : 'destroyed'}`));
    bus.on('selection', () => this.renderSelection());
    bus.on('game:end', (r) => this.showBanner(r));

    this.slowTimer = 0;
    this.frames = 0;
    this.fpsStart = performance.now();
    const showFps = () => { this.el.fps.style.visibility = settings.get('showFps') ? '' : 'hidden'; };
    showFps();
    settings.on((key) => { if (key === 'showFps') showFps(); });
  }

  update(dt) {
    const g = this.game;
    this.actions.update(dt);
    const tactical = g.cameraManager.mode === CameraMode.TACTICAL;
    const el = this.el;
    document.body.classList.toggle('tactical', tactical);
    el.modeBadge.textContent = tactical ? 'Command view' : 'Direct control';

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
    const sel = [...this.game.commands.selected];
    const box = this.el.selection;
    if (!sel.length) {
      box.textContent = 'Click or drag to select your stacks';
      return;
    }
    box.replaceChildren(...sel.map((s) => {
      const row = document.createElement('div');
      row.className = 'sel';
      const name = document.createElement('span');
      name.textContent = s.name;
      const info = document.createElement('em');
      info.textContent = `${s.ai.state} · ${s.moraleWord} · ${s.aliveCount}/${s.units.length}`;
      row.append(name, info);
      return row;
    }));
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
