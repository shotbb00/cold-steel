// Floating HTML labels over each stack: name, survivors, health bar, (tactical view) AI state and
// morale, and how hard it is being shot at: an amber suppression bar under the health bar (the
// squad's average), PINNED when most of it is pinned down, the morale word coloured from steady
// through shaken and wavering to broken (flashing).
import * as THREE from 'three';
import { RANKS } from '../entities/UnitStack.js';

const RANK_NAMES = RANKS.map((r) => r.name);

export class StackLabels {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('labels');
    this.items = new Map();
    game.bus.on('stack:removed', (s) => { this.items.get(s)?.el.remove(); this.items.delete(s); });
    this._v = new THREE.Vector3();
  }

  create(stack) {
    const el = document.createElement('div');
    const g = this.game;
    el.className = `stack-label ${stack.faction === g.playerFaction ? (g.mine(stack) ? 'ally' : 'ally partner') : 'enemy'}`;
    el.innerHTML = '<div class="sl-head"><span class="sl-rank"></span><span class="sl-name"></span><span class="sl-count"></span></div>'
      + '<div class="sl-bar"><i></i></div><div class="sl-sup"><i></i></div><div class="sl-state"><span class="sl-ai"></span><span class="sl-sep"> · </span><span class="sl-morale"></span><span class="sl-pinned">Pinned</span></div>';
    el.querySelector('.sl-name').textContent = stack.name;
    this.root.appendChild(el);
    const item = {
      el,
      count: el.querySelector('.sl-count'),
      rank: el.querySelector('.sl-rank'),
      fill: el.querySelector('.sl-bar i'),
      ai: el.querySelector('.sl-ai'),
      morale: el.querySelector('.sl-morale'),
      sup: el.querySelector('.sl-sup i'),
      last: {},
    };
    this.items.set(stack, item);
    return item;
  }

  update() {
    const { camera, cameraManager, commands, world } = this.game;
    const tactical = cameraManager.blend > 0.5;
    const { w, h } = this.game.view; // the drawn size (GameEngine.onResize)
    this.root.classList.toggle('tactical', tactical);

    for (const stack of world.stacks) {
      let item = this.items.get(stack);
      if (!stack.alive) {
        if (item) {
          item.el.remove();
          this.items.delete(stack);
        }
        continue;
      }
      if (!item) item = this.create(stack);

      const v = this._v.set(stack.centroid.x, stack.centroid.y + 3.4, stack.centroid.z);
      const dist = v.distanceTo(camera.position);
      v.project(camera);
      const visible = stack.visible !== false && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && (tactical || dist < 90);
      this.set(item, 'display', visible ? '' : 'none', () => (item.el.style.display = visible ? '' : 'none'));
      if (!visible) continue;

      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      item.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;

      const pct = Math.round(stack.hpRatio * 100);
      this.set(item, 'pct', pct, () => (item.fill.style.width = `${pct}%`));
      this.set(item, 'count', stack.aliveCount * 100 + (stack.passengers ?? 0), () => (item.count.textContent = `${stack.aliveCount}/${stack.units.length}${stack.passengers ? ` · ${stack.passengers} inside` : ''}`));
      this.set(item, 'ai', stack.ai.state, () => (item.ai.textContent = stack.ai.state));
      const word = stack.moraleWord;
      this.set(item, 'morale', word, () => {
        item.morale.textContent = word;
        item.el.dataset.morale = word.toLowerCase().replace(' ', '-');
      });
      // suppression: the squad's average, and how many are pinned flat
      let sup = 0, pinned = 0, alive = 0;
      if (stack.usesCover) for (const u of stack.units) { if (!u.alive) continue; alive++; sup += Math.min(1, u.suppression); if (u.suppression > 0.9) pinned++; }
      const sp = alive ? Math.round((sup / alive) * 20) * 5 : 0;
      this.set(item, 'sup', sp, () => { item.sup.style.width = `${sp}%`; item.el.classList.toggle('suppressed', sp > 0); });
      const isPinned = alive > 0 && pinned / alive >= 0.5;
      this.set(item, 'pinned', isPinned, () => item.el.classList.toggle('pinned', isPinned));
      this.set(item, 'rank', stack.rank, () => {
        item.rank.textContent = '★'.repeat(stack.rank);
        item.rank.title = RANK_NAMES[stack.rank] ?? '';
      });
      this.set(item, 'auto', !!stack.autonomous, () => item.el.classList.toggle('wave', !!stack.autonomous));
      const sel = commands.selected.has(stack);
      this.set(item, 'sel', sel, () => item.el.classList.toggle('selected', sel));
    }
  }

  /** Only touch the DOM when a value actually changed. */
  set(item, key, value, apply) {
    if (item.last[key] === value) return;
    item.last[key] = value;
    apply();
  }
}
