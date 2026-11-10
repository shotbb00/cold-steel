// Floating tags over each stack, one line: the unit's symbol (NATO style: a rectangle for yours,
// a diamond for the enemy; the sign inside says what it is), a short callsign and how many are
// left, a hairline of health under it and an amber one for suppression. Words appear only when
// something is wrong, as a coloured chip: broken, pinned, wavering, shaken, a gun or tracks out;
// support vehicles at work show what they're doing. Your heavy weapons wear a reload ring round
// the symbol that fills as they load and flashes as they fire. Rank stars sit under the symbol,
// LT marks a platoon leader, a cross or a wrench a stack being treated or repaired. The AI's state
// and morale in words are in the selection panel (ui/HUD.js).
// Your damaged ships carry a damage-control strip under the tag (in the fight, by the ship, not in a
// panel): where her parties go first — the pumps, the fire, the repairs — each showing how bad it is,
// and counter-flood when she lists. Click the lit one again: all alike.
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
  let base = (num ? name.slice(0, -num.length).trim() : name).replace(/^(USS|SS) /, ''); // (a ship: her name)
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
  if (base.length > 18) base = stack.type.shortName ?? base.split(' ')[0];
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
      + '<div class="sl-bar"><i></i></div><div class="sl-sup"><i></i></div>'
      + (stack.stats.naval && side !== 'enemy' ? '<div class="sl-dc" hidden></div>' : '');
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
      dc: el.querySelector('.sl-dc'),
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

      if (item.dc) this.drawDamageControl(stack, item);

      this.set(item, 'auto', !!stack.autonomous, () => item.el.classList.toggle('wave', !!stack.autonomous));
      const sel = commands.selected.has(stack);
      this.set(item, 'sel', sel, () => item.el.classList.toggle('selected', sel));
    }
    this.updateAir(tactical, w, h);
  }

  /**
   * Your air missions: a tag over each flight — what it is, what it's doing, what it's after — the enemy
   * ship it's going for marked on her tag, and a word in the log as it lifts off, goes in, comes back
   * aboard or is lost. (The planes are small and fast: without this you can't tell where they are.)
   */
  updateAir(tactical, w, h) {
    const g = this.game;
    this.air ??= new Map();
    const marked = new Set();
    const seen = new Set();
    const sea = !!g.world.river?.sea;
    const eyes = sea ? g.world.stacksOf(g.playerFaction).filter((st) => st.alive && st.stats.naval).map((st) => [st.units.find((u) => u.alive), st]).filter(([u]) => u && (u.depth ?? 0) < 1) : [];
    // an enemy aircraft at sea: tagged while your radar (on) or your lookouts have it
    const spotted = (s) => s.airborne && eyes.some(([u, st]) => Math.hypot(u.pos.x - s.pos.x, u.pos.z - s.pos.z) < (st.stats.radar && st.radarOn !== false ? st.stats.radar.range * 1.2 : 1800));
    for (const s of g.air.sorties) {
      const own = s.faction === g.playerFaction;
      if (!own && !(sea && spotted(s))) continue;
      seen.add(s);
      let a = this.air.get(s);
      if (!a) {
        const el = document.createElement('div');
        el.className = `stack-label ${own ? 'ally' : 'enemy'} air-tag`;
        el.innerHTML = '<div class="sl-row"><span class="sl-plane">✈</span><span class="sl-name"></span><span class="sl-chips"><span class="sl-chip job"></span></span></div>';
        this.root.appendChild(el);
        a = { el, name: el.querySelector('.sl-name'), chip: el.querySelector('.sl-chip'), state: null, last: {} };
        a.name.textContent = s.type.name;
        this.air.set(s, a);
      }
      const ship = own && s.ship?.alive ? s.ship.stack : null;
      const what = ship ? ship.name : null;
      // the log, as it changes (yours only)
      if (own && s.state !== a.state) {
        const was = a.state;
        a.state = s.state;
        const from = s.cvUnit?.stack?.name;
        if (s.state === 'ingress' && was !== 'ingress') g.tell(s.faction, `${s.type.name} airborne${from ? ` off ${from}` : ''}${what ? ` — going for ${what}` : ''}`);
        else if (s.state === 'attack') g.tell(s.faction, `${s.type.name} attacking${what ? ` ${what}` : ''}`);
        else if (s.state === 'home' && was !== 'home') g.tell(s.faction, `${s.type.name} heading home`);
      }
      if (ship && (s.state === 'ingress' || s.state === 'attack')) marked.add(ship);
      // its tag
      const text = s.state === 'inbound' ? 'on deck' : s.state === 'takeoff' ? 'taking off' : s.state === 'landing' || s.state === 'rollout' ? 'landing' : s.state === 'ingress' ? (what ? `→ ${what}` : 'inbound') : s.state === 'attack' ? 'attacking' : s.state === 'down' ? 'shot down' : s.state === 'done' ? '' : 'returning';
      this.set(a, 'text', text, () => { a.chip.textContent = text; a.el.classList.toggle('lost', s.state === 'down'); });
      const v = this._v.set(s.pos.x, s.pos.y + 6, s.pos.z);
      v.project(g.camera);
      const show = s.state !== 'inbound' && s.state !== 'done' && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      this.set(a, 'display', show, () => (a.el.style.display = show ? '' : 'none'));
      if (show) a.el.style.transform = `translate(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%, -100%)`;
    }
    for (const [s, a] of this.air) if (!seen.has(s)) {
      if (s.faction === g.playerFaction && s.done !== false && s.state === 'done' && s.p?.sea && !s.homeShip && !s.wrecked && a.state !== 'down' && a.state !== 'inbound') g.tell(s.faction, `${s.type.name} back aboard`); // (landed: the sortie is over)
      a.el.remove();
      this.air.delete(s);
    }
    // the enemy ships your strikes are going for
    for (const [stack, item] of this.items) {
      const on = marked.has(stack);
      this.set(item, 'airTarget', on, () => item.el.classList.toggle('air-target', on));
    }
  }

  /** A damaged ship of yours: the damage-control buttons under her tag (Orders damageControl). */
  drawDamageControl(stack, item) {
    const u = stack.units[0];
    if (!u?.alive || !this.game.mine(stack)) return this.set(item, 'dc', '', () => (item.dc.hidden = true));
    const now = this.game.world.time;
    const flood = (u.leak ?? 0) > 0 || (u.flood ?? 0) > 0.03 ? Math.round((u.flood ?? 0) * 100) : -1;
    const fire = (u.blaze ?? 0) > 0.02 ? Math.round(u.blaze * 100) : -1;
    // what the repair parties can mend (a wrecked mount is gone for good: not on the button), and how long the next one takes
    const fixes = [u.engineHit ? u.engineFix : null, u.rudderHit > now ? u.rudderHit : null, u.bridgeHit > now ? u.bridgeHit : null, ...(u.mounts ?? []).filter((m) => m.out && Number.isFinite(m.fixAt)).map((m) => m.fixAt)].filter((t) => t != null);
    const broken = fixes.length;
    const next = broken ? Math.max(1, Math.ceil(Math.min(...fixes) - now)) : 0;
    const list = Math.abs(u.list ?? 0) > 0.03 && u.counterK == null;
    const key = `${flood}|${fire}|${broken}|${next}|${list}|${u.dc ?? ''}`;
    this.set(item, 'dc', key, () => {
      const any = flood >= 0 || fire >= 0 || broken > 0 || list;
      item.dc.hidden = !any;
      if (!any) return;
      const btn = (p, label, value, tip) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `sl-dc-b${u.dc === p ? ' on' : ''}`;
        b.innerHTML = `${label}<i>${value}</i>`;
        b.title = tip;
        b.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          e.preventDefault();
          const next = p === 'counter' ? u.dc : u.dc === p ? null : p; // (the lit one again: all alike)
          this.game.orders.issue({ t: 'damageControl', s: [stack.id], p: p === 'counter' ? p : next ?? 'auto' });
          u.dc = next; // (shown at once, also on a guest's screen)
          item.last.dc = null;
        });
        return b;
      };
      const parts = [];
      if (flood >= 0) parts.push(btn('flood', 'Pumps', `${flood}%`, 'Damage control on the flooding first: plug the holes, pump her out'));
      if (fire >= 0) parts.push(btn('fire', 'Fire', `${fire}%`, 'Every hose on the fire: even a big one dies down'));
      if (broken > 0) parts.push(btn('repair', 'Repair', `${broken} · ${next} s`, 'The repair parties first: engines, rudder, bridge, the guns — the next one mended in the time shown, sooner with them on it'));
      if (list) parts.push(btn('counter', 'Counter-flood', '', 'Flood her other side: she comes upright and shoots straight again — at the price of more water in her'));
      item.dc.replaceChildren(...parts);
    });
  }

  /** Only touch the DOM when a value actually changed. */
  set(item, key, value, apply) {
    if (item.last[key] === value) return;
    item.last[key] = value;
    apply();
  }
}
