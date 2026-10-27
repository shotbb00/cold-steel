// In-battle pause menu (Esc): Resume, Settings, Restart, Main menu. While it is open the
// simulation stands still and the sound is suspended — except in multiplayer, where the battle
// goes on (there's nobody to pause it for both) and "Leave battle" ends the connection.
import { requestReplay, toMenu } from '../core/replay.js';
import { buildSettings } from './SettingsPanel.js';

export class PauseMenu {
  constructor(game) {
    this.game = game;
    const root = (this.root = document.createElement('div'));
    root.id = 'pause';
    root.hidden = true;
    root.innerHTML = `
      <div class="pause-box">
        <h2>Paused</h2>
        <p class="pause-note" hidden>The battle goes on while this menu is open.</p>
        <div class="pause-buttons">
          <button type="button" data-act="resume">Resume <kbd>Esc</kbd></button>
          <button type="button" data-act="settings">Settings</button>
          <button type="button" data-act="restart">Restart battle</button>
          <button type="button" data-act="menu">Main menu</button>
        </div>
        <div class="settings" hidden></div>
      </div>`;
    document.body.append(root);
    this.settingsBox = root.querySelector('.settings');
    root.addEventListener('click', (e) => {
      const act = e.target.closest('button')?.dataset.act;
      if (act === 'resume') this.close();
      else if (act === 'settings') {
        this.settingsBox.hidden = !this.settingsBox.hidden;
        if (!this.settingsBox.hidden) buildSettings(this.settingsBox);
      } else if (act === 'restart') requestReplay();
      else if (act === 'menu') { game.net?.link.close(); toMenu(); }
    });
    game.bus.on('key', ({ code }) => {
      if (code !== 'Escape' || game.ended) return;
      if (game.commands.escConsumed) { game.commands.escConsumed = false; return; } // that Esc cancelled targeting
      if (this.open) this.close(); else this.show();
    });
  }

  get open() {
    return !this.root.hidden;
  }

  show() {
    const online = !!this.game.net;
    this.root.hidden = false;
    this.settingsBox.hidden = true;
    this.root.querySelector('h2').textContent = online ? 'Menu' : 'Paused';
    this.root.querySelector('.pause-note').hidden = !online;
    this.root.querySelector('[data-act="restart"]').hidden = online;
    this.root.querySelector('[data-act="menu"]').textContent = online ? 'Leave battle' : 'Main menu';
    this.game.input.releaseLock?.();
    if (online) return;
    this.game.paused = true;
    this.game.audio.ctx?.suspend();
  }

  close() {
    this.root.hidden = true;
    if (this.game.net) return;
    this.game.paused = false;
    this.game.audio.ctx?.resume();
  }
}
