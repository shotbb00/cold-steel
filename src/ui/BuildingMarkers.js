// A small badge over every occupied house: a house icon and how many men are inside — yours in
// your colour with a Leave button (the same as E with the stack selected), the enemy's in theirs
// once you've seen them in there. Counted from the men inside each footprint, so it works the
// same on a multiplayer client.
import * as THREE from 'three';

const ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8 8 3l6 5v6H10v-4H6v4H2z" fill="currentColor"/></svg>';

export class BuildingMarkers {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('labels');
    this.items = new Map(); // building → { el, count, last }
    this._v = new THREE.Vector3();
    this.timer = 0;
  }

  update() {
    const g = this.game;
    const me = g.playerFaction;
    const tactical = g.cameraManager.blend > 0.5;
    const occupied = new Map(); // building → { mine: [stacks], men, foe }
    for (const s of g.world.stacks) {
      if (!s.alive || !s.usesCover) continue;
      const b = s.garrison ?? s.entered;
      if (!b || b.collapsed) continue;
      const inside = s.units.filter((u) => u.alive && g.buildings.inside(b, u.pos.x, u.pos.z, 0.3));
      if (!inside.length) continue;
      const own = s.faction === me;
      if (!own && !inside.some((u) => u.visible !== false)) continue; // unseen enemies stay unseen
      const e = occupied.get(b) ?? { mine: [], men: 0, foe: false };
      if (own) { if (g.mine(s)) e.mine.push(s); } else e.foe = true;
      e.men += inside.length;
      occupied.set(b, e);
    }
    for (const [b, item] of this.items) {
      if (!occupied.has(b)) { item.el.remove(); this.items.delete(b); }
    }
    for (const [b, e] of occupied) {
      let item = this.items.get(b);
      if (!item) item = this.create(b);
      const v = this._v.set(b.x, b.ground + 10.5, b.z); // above the roof, clear of the squad's own label
      const dist = v.distanceTo(g.camera.position);
      v.project(g.camera);
      const show = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && (tactical || dist < 70);
      item.el.style.display = show ? '' : 'none';
      if (!show) continue;
      item.el.style.transform = `translate(${((v.x * 0.5 + 0.5) * g.view.w).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * g.view.h).toFixed(1)}px) translate(-50%, -100%)`;
      const key = `${e.men}|${e.mine.length}|${e.foe}`;
      if (key !== item.last) {
        item.last = key;
        item.el.className = `bld-mark ${e.mine.length ? 'ally' : 'enemy'}`;
        item.count.textContent = e.men;
        item.leave.hidden = !e.mine.length;
        item.el.title = e.mine.length ? `${b.name}: ${e.mine.map((s) => s.name).join(', ')}` : `${b.name}: enemy inside`;
      }
      item.stacks = e.mine;
    }
  }

  create(b) {
    const el = document.createElement('div');
    el.innerHTML = `${ICON}<b></b><button type="button" tabindex="-1" title="Leave the building (E)">Leave</button>`;
    this.root.append(el);
    const item = { el, count: el.querySelector('b'), leave: el.querySelector('button'), last: '', stacks: [] };
    item.leave.addEventListener('click', (ev) => {
      ev.stopPropagation();
      ev.currentTarget.blur();
      const ids = item.stacks.filter((s) => s.alive).map((s) => s.id);
      if (ids.length) this.game.orders.issue({ t: 'leave', s: ids });
      this.game.bus.emit('order', { kind: 'move' });
    });
    this.items.set(b, item);
    return item;
  }
}
