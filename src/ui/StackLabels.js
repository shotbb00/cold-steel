// Floating tags over each stack, one line: the unit's symbol (NATO style: a rectangle for yours,
// a diamond for the enemy; the sign inside says what it is), a short callsign and how many are
// left, a hairline of health under it and an amber one for suppression. Words appear only when
// something is wrong, as a coloured chip: broken, pinned, wavering, shaken, a gun or tracks out;
// support vehicles at work show what they're doing. Your heavy weapons wear a reload ring round
// the symbol that fills as they load and flashes as they fire. Rank stars sit under the symbol,
// LT marks a platoon leader, a cross or a wrench a stack being treated or repaired. The AI's state
// and morale in words are in the selection panel (ui/HUD.js).
import * as THREE from 'three';
import { RANKS } from '../entities/UnitStack.js';

const RANK_NAMES = RANKS.map((r) => r.name);

// ---------------------------------------------------------------- the symbol

/** Which sign goes in the frame (by unit type, or what the stack is). */
const SIGN_BY_TYPE = {
  tank: 'armor', heavyTank: 'armor', ifv: 'mech', reconVehicle: 'recon', scouts: 'recon', tankDestroyer: 'at', atTeam: 'at',
  artillery: 'arty', rockets: 'arty', spMortar: 'arty', mortar: 'mortar', observers: 'obs',
  aa: 'aa', towedAA: 'aa', gunMissile: 'aa', sam: 'aa', manpads: 'aa', airRadar: 'radar', cbRadar: 'radar', jammer: 'radar',
  engineers: 'eng', cev: 'eng', bridgeLayer: 'eng', mineClear: 'eng', recovery: 'repair', ambulance: 'med', commandPost: 'hq',
};
function signOf(stack) {
  const s = stack.stats;
  if (s.submarine) return 'sub';
  if (s.naval) return 'ship';
  if (SIGN_BY_TYPE[stack.type.id]) return SIGN_BY_TYPE[stack.type.id];
  if (s.cavalry) return 'recon';
  if (s.indirect || s.gun) return 'arty';
  if (s.antiAir) return 'aa';
  return stack.usesCover ? 'inf' : 'armor';
}

const W = 20;
const H = 14;
/** The sign's strokes inside a 20 × 14 box. */
const SIGNS = {
  inf: '<path d="M4 3L16 11M16 3L4 11"/>',
  armor: '<rect x="5" y="4" width="10" height="6" rx="3" fill="none"/>',
  mech: '<rect x="5" y="4" width="10" height="6" rx="3" fill="none"/><path d="M4 3L16 11M16 3L4 11"/>',
  recon: '<path d="M4 11L16 3"/>',
  at: '<path d="M5 11L10 4L15 11"/>',
  arty: '<circle cx="10" cy="7" r="2.2" class="fill"/>',
  mortar: '<circle cx="10" cy="8.5" r="1.8" class="fill"/><path d="M10 7V3"/>',
  obs: '<path d="M10 3.5L14 10.5H6Z" fill="none"/>',
  aa: '<path d="M4.5 11Q10 1 15.5 11" fill="none"/>',
  radar: '<path d="M5 9L8 5L11 9L14 5"/>',
  eng: '<path d="M5 10V5H15V10M10 5V10"/>',
  repair: '<path d="M6 10L14 4M5.5 5.5L8 3M12 11L14.5 8.5"/>',
  med: '<path d="M10 3.5V10.5M6.5 7H13.5"/>',
  hq: '<path d="M6 11V3H14L12 5L14 7H6"/>',
  ship: '<path d="M3.5 7.5H16.5L14.5 10.5H5.5Z" class="fill"/><path d="M8.5 7.5V4.5H11.5V7.5" class="fill"/>',
  sub: '<path d="M3.5 9.5Q10 3.5 16.5 9.5Z" class="fill"/>',
};
const symbolCache = new Map();
function symbol(sign, hostile) {
  const key = `${sign}:${hostile}`;
  if (!symbolCache.has(key)) {
    const frame = hostile ? '<path class="frame" d="M10 -1.5L21 7L10 15.5L-1 7Z"/>' : `<rect class="frame" x="0.8" y="0.8" width="${W - 1.6}" height="${H - 1.6}"/>`;
    symbolCache.set(key, `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${frame}<g class="sign">${SIGNS[sign] ?? SIGNS.inf}</g></svg>`);
  }
  return symbolCache.get(key);
}

// ---------------------------------------------------------------- the callsign

// "M4A3(76)W Sherman 4" → "Sherman 4", "Fletcher-class destroyer 1" → "Fletcher 1",
// "Rifle Squad 3" → "Rifles 3", "81 mm Mortar Team 6" → "Mortar 6"; too long: the type's short name
const DESIGNATION = /^(?=.*\d)[A-Z0-9][A-Z0-9()./-]*$/; // M4A3(76)W, 2S1, 9K35, T-72M1
const GENERIC = /^(howitzer|ambulance|recovery|command|mortar|artillery|vehicle|carrier|post|radar|jammer|medical)$/i;
const callsignCache = new Map();
export function callsign(stack) {
  const name = stack.name;
  if (callsignCache.has(name)) return callsignCache.get(name);
  const num = name.match(/\s(\d+)$/)?.[1] ?? '';
  let base = num ? name.slice(0, -num.length).trim() : name;
  const cls = base.match(/^(\S+?)-class\b/);
  if (cls) base = cls[1];
  else {
    base = base.replace(/^\d+(\.\d+)?\s*(mm|cm)\s+/i, '').replace(/Machine-Gun/g, 'MG'); // a calibre in front; MG
    const m = base.match(/^(.*?)\s+(Squad|Team|Section|Trupp|Para|Platoon)$/);
    if (m) base = /(le|ier|er)$/.test(m[1]) && !/äger$/.test(m[1]) ? `${m[1]}s` : m[1];
    const words = base.split(/\s+/);
    if (words.length === 2 && DESIGNATION.test(words[0]) && /^[A-Z][a-z]/.test(words[1]) && !GENERIC.test(words[1])) base = words[1]; // a designation and a name: the name
    if (/escort$/.test(base) && base.split(' ').length > 1) base = base.split(' ')[0]; // Kaibōkan escort
  }
  if (base.length > 15) base = stack.type.shortName ?? base.split(' ')[0];
  const out = num ? `${base} ${num}` : base;
  callsignCache.set(name, out);
  return out;
}

// ---------------------------------------------------------------- the chips

/** What is wrong with the stack, worst first: [word, colour class]. */
function chipsOf(stack, word, pinned, mine) {
  const out = [];
  if (word === 'Broken') out.push(['Broken', 'bad flash']);
  if (pinned) out.push(['Pinned', 'warn']);
  if (word === 'Wavering') out.push(['Wavering', 'hot']);
  if (word === 'Shaken') out.push(['Shaken', 'warn']);
  if (word === 'Gun out' || word === 'Tracks hit' || word === 'Engine hit') out.push([word, 'bad']);
  if (mine && stack.job) out.push([stack.job, 'job']);
  return out;
}

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
    const side = stack.faction === g.playerFaction ? (g.mine(stack) ? 'ally' : 'ally partner') : 'enemy';
    el.className = `stack-label ${side}`;
    el.innerHTML = '<div class="sl-row"><span class="sl-sym"><i class="sl-ring"></i><span class="sl-glyph"></span><i class="sl-rank"></i></span>'
      + '<span class="sl-name"></span><span class="sl-count"></span><span class="sl-off" title="Platoon leader"></span><span class="sl-care"></span><span class="sl-chips"></span></div>'
      + '<div class="sl-bar"><i></i></div><div class="sl-sup"><i></i></div>';
    el.querySelector('.sl-glyph').innerHTML = symbol(signOf(stack), side === 'enemy');
    el.querySelector('.sl-name').textContent = callsign(stack);
    el.title = stack.name;
    this.root.appendChild(el);
    const item = {
      el,
      sym: el.querySelector('.sl-sym'),
      ring: el.querySelector('.sl-ring'),
      count: el.querySelector('.sl-count'),
      rank: el.querySelector('.sl-rank'),
      off: el.querySelector('.sl-off'),
      fill: el.querySelector('.sl-bar i'),
      sup: el.querySelector('.sl-sup i'),
      care: el.querySelector('.sl-care'),
      chips: el.querySelector('.sl-chips'),
      cycle: 0,          // the reload's length, measured: the countdown's value when it last jumped back up
      lastLeft: 0,
      fired: 0,          // until when the ring flashes
      last: {},
    };
    this.items.set(stack, item);
    return item;
  }

  update() {
    const { camera, cameraManager, commands, world } = this.game;
    const tactical = cameraManager.blend > 0.5;
    const { w, h } = this.game.view; // the drawn size (GameEngine.onResize)
    const now = performance.now();
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
      const many = stack.units.length > 1;
      this.set(item, 'count', stack.aliveCount * 100 + (stack.passengers ?? 0), () => (item.count.textContent = many || stack.passengers ? `${stack.aliveCount}/${stack.units.length}${stack.passengers ? ` +${stack.passengers}` : ''}` : ''));

      // suppression: the squad's average, and how many are pinned flat
      let sup = 0, pinned = 0, alive = 0;
      if (stack.usesCover) for (const u of stack.units) { if (!u.alive) continue; alive++; sup += Math.min(1, u.suppression); if (u.suppression > 0.9) pinned++; }
      const sp = alive ? Math.round((sup / alive) * 20) * 5 : 0;
      this.set(item, 'sup', sp, () => { item.sup.style.width = `${sp}%`; item.el.classList.toggle('suppressed', sp > 0); });
      const isPinned = alive > 0 && pinned / alive >= 0.5;

      const mine = stack.faction === this.game.playerFaction;
      const chips = chipsOf(stack, stack.moraleWord, isPinned, mine);
      const chipKey = chips.map((c) => c[0]).join('|');
      this.set(item, 'chips', chipKey, () => {
        item.chips.replaceChildren(...chips.map(([t, k]) => { const c = document.createElement('span'); c.className = `sl-chip ${k}`; c.textContent = t; return c; }));
        item.el.classList.toggle('trouble', chips.some((c) => c[1] !== 'job'));
      });

      this.set(item, 'rank', stack.rank, () => {
        item.rank.textContent = '★'.repeat(stack.rank);
        item.rank.title = RANK_NAMES[stack.rank] ?? '';
      });
      const off = stack.hadOfficer ? (stack.officerAlive ? 'on' : 'lost') : '';
      this.set(item, 'off', off, () => {
        item.off.textContent = off ? 'LT' : '';
        item.off.className = `sl-off ${off}`;
        item.off.title = off === 'lost' ? 'Platoon leader down: slower to react' : 'Platoon leader: steadies this and nearby stacks';
      });
      const care = stack.tended && stack.tended.until > this.game.time && mine ? stack.tended.kind : '';
      this.set(item, 'care', care, () => {
        item.care.textContent = care === 'heal' ? '✚' : care === 'repair' ? '⚙' : '';
        item.care.className = `sl-care ${care}`;
        item.care.title = care === 'heal' ? 'Being treated by an ambulance' : care === 'repair' ? 'Being repaired by a recovery vehicle' : '';
      });

      // reload: your own heavy weapons; the ring fills over the cycle, flashes as they fire
      const left = this.game.mine(stack) ? stack.reloadLeft : null;
      if (left != null) {
        if (left > item.lastLeft + 0.3) { item.cycle = left; if (item.lastLeft < 0.4) item.fired = now + 250; } // a fresh cycle (the guns just fired)
        item.lastLeft = left;
      }
      const loading = left != null && left > 0.15 && item.cycle > 0.5;
      const p = loading ? Math.round((1 - left / item.cycle) * 50) * 2 : 0;
      this.set(item, 'ring', loading ? p : -1, () => {
        item.sym.classList.toggle('loading', loading);
        if (loading) item.ring.style.setProperty('--p', `${p}%`);
      });
      const flash = item.fired > now;
      this.set(item, 'fire', flash, () => item.sym.classList.toggle('fire', flash));

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
