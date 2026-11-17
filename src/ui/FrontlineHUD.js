// Frontline mode HUD: a strip at the top centre with both sides' name, front strength and stacks
// in the field (yours left, theirs right, the same width) round every control point (owner colour, capture progress, contested pulse), plus a reinforcement panel in the
// tactical command panel: command points, stacks in the field / limit, and the button that
// opens the reinforcement window (ui/ReinforceWindow.js, also C).
import * as THREE from 'three';
import { SIDE_OBJECTIVES, sideGain } from '../systems/Economy.js';
import { epoch } from '../data/epoch.js';
import { FACTIONS, enemyOf } from '../data/factions.js';
import { ReinforceWindow } from './ReinforceWindow.js';
import { forces } from '../modes/shared.js';
import { icon } from './Icons.js';

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

const _v = new THREE.Vector3();

export class FrontlineHUD {
  constructor(game, state) {
    this.game = game;
    this.state = state;
    this.me = game.playerFaction;
    this.foe = enemyOf(this.me);

    const bar = document.createElement('div');
    bar.id = 'frontline';
    const side = (cls, f) => `<div class="fl-side ${cls}"><div class="fl-top"><b>${FACTIONS[f].name}</b><span class="fl-val"></span></div>
      <div class="fl-bar"><i></i></div><small class="fl-n"></small></div>`;
    bar.innerHTML = `${side('ally', this.me)}<div class="fl-points"></div>${side('enemy', this.foe)}<div class="fl-status"></div>`;
    document.getElementById('hud').appendChild(bar);
    this.allyFill = bar.querySelector('.ally i');
    this.allyText = bar.querySelector('.ally .fl-val');
    this.allyN = bar.querySelector('.ally .fl-n');
    this.enemyN = bar.querySelector('.enemy .fl-n');
    this.enemyFill = bar.querySelector('.enemy i');
    this.enemyText = bar.querySelector('.enemy .fl-val');
    this.statusEl = bar.querySelector('.fl-status');
    const strip = bar.querySelector('.fl-points');
    // nearest to your base first, so your side of the strip sits next to your strength bar
    const home = game.map.bases?.[this.me] ?? { x: 0, z: 0 };
    const ordered = [...state.points.points].sort((a, b) => Math.hypot(a.x - home.x, a.z - home.z) - Math.hypot(b.x - home.x, b.z - home.z));
    this.pills = ordered.map((p) => {
      const el = document.createElement('div');
      el.className = 'fl-point';
      el.innerHTML = `<b>${p.id}</b><i></i>`;
      el.title = p.name;
      strip.appendChild(el);
      return { p, el, fill: el.querySelector('i') };
    });
    // the side objectives (systems/Economy.js) after them, their own look: what they are and what they bring — a tap says it in words
    const sides = state.sides?.points ?? [];
    if (sides.length) {
      const gap = document.createElement('span'); gap.className = 'fl-gap'; strip.appendChild(gap);
      for (const p of sides) {
        const el = document.createElement('div');
        el.className = `fl-point fl-side-obj so-${p.key}`;
        el.innerHTML = `<b>${p.id}</b><i></i><small>${p.support ? `+${p.support}` : `+${p.build}`}</small>`;
        el.title = `${p.name}: ${sideGain(p)} while you hold it`;
        el.addEventListener('click', () => game.bus.emit('toast', el.title));
        strip.appendChild(el);
        this.pills.push({ p, el, fill: el.querySelector('i') });
      }
    }
    // over each one on the field: its name and what it brings (projected every frame)
    this.sideTags = sides.map((p) => {
      const el = document.createElement('div');
      el.className = `side-tag so-${p.key}`;
      el.innerHTML = `<b>${p.id} ${p.name}</b><small>${sideGain(p)}</small>`;
      document.body.appendChild(el);
      return { p, el };
    });

    const panel = document.createElement('div');
    panel.id = 'reinforce';
    panel.innerHTML = `<div class="rf-info"><b class="rf-cp"></b><span class="rf-rate" title="Command points coming in per minute"></span><span class="rf-stacks" title="Stacks in the field / limit"></span></div><div class="rf-pools" hidden><span class="rf-build" title="Building budget: pays for every structure. ${SIDE_OBJECTIVES.filter((o) => o.build).map((o) => o.names[epoch()] ?? o.names.any).join(' and ')} raise it"></span><span class="rf-support" title="Support points: air strikes, barrages, powers. ${SIDE_OBJECTIVES.filter((o) => o.support).map((o) => o.names[epoch()] ?? o.names.any).join(' and ')} raise them"></span></div>
      <button type="button" tabindex="-1" class="rf-open">${icon('reinforce')}<span>Reinforce</span><kbd data-key="reinforce"></kbd></button>`;
    // its own bar beside the orders, bottom right: the points stay in sight with the orders folded away
    const orders = document.getElementById('command-panel');
    const dock = document.createElement('div');
    dock.id = 'dock';
    orders.before(dock);
    dock.append(panel, orders);
    if (state.noReinforcements) panel.hidden = true; // e.g. Recon raid: you have what you came with
    this.cpText = panel.querySelector('.rf-cp');
    this.rateText = panel.querySelector('.rf-rate');
    this.pools = panel.querySelector('.rf-pools');
    this.buildText = panel.querySelector('.rf-build');
    this.supportText = panel.querySelector('.rf-support');
    this.stacksText = panel.querySelector('.rf-stacks');
    this.window = new ReinforceWindow(game, state);
    panel.querySelector('.rf-open').addEventListener('click', (e) => { e.currentTarget.blur(); this.window.toggle(); });
  }

  /** The side objectives' tags over their flags: shown when on screen and not too far (owner's colour on the rim). */
  placeSideTags() {
    const g = this.game, cam = g.camera, r = g.canvas.getBoundingClientRect();
    for (const { p, el } of this.sideTags ?? []) {
      _v.set(p.x, g.terrain.heightAt(p.x, p.z) + 12, p.z);
      const far = cam.position.distanceTo(_v) > 700;
      _v.project(cam);
      const off = far || _v.z > 1 || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05 || !document.body.classList.contains('tactical');
      el.hidden = off;
      if (off) continue;
      el.style.transform = `translate(${r.left + (_v.x + 1) / 2 * r.width}px, ${r.top + (1 - _v.y) / 2 * r.height}px) translate(-50%, -100%)`;
      el.style.borderColor = p.owner ? hex(FACTIONS[p.owner].glow) : 'rgba(255,255,255,0.3)';
    }
  }

  update() {
    const { strength, maxStrength, cp } = this.state;
    const a = Math.max(0, strength[this.me]);
    const e = Math.max(0, strength[this.foe]);
    this.allyFill.style.width = `${(a / maxStrength) * 100}%`;
    this.enemyFill.style.width = `${(e / maxStrength) * 100}%`;
    this.allyText.textContent = Math.ceil(a);
    this.enemyText.textContent = Math.ceil(e);
    const myColor = hex(FACTIONS[this.me].glow);
    const foeColor = hex(FACTIONS[this.foe].glow);
    for (const { p, el, fill } of this.pills) {
      const color = p.progress > 0 ? myColor : foeColor;
      fill.style.width = `${Math.abs(p.progress) * 100}%`;
      fill.style.background = color;
      el.style.borderColor = p.owner ? (p.owner === this.me ? myColor : foeColor) : 'rgba(255,255,255,0.25)';
      el.classList.toggle('contested', p.contested);
      el.classList.toggle('locked', !!p.locked);
    }
    this.placeSideTags();
    const status = this.state.status ? this.state.status() : this.state.statusText ?? '';
    if (status !== this.lastStatus) {
      this.lastStatus = status;
      this.statusEl.textContent = status;
      this.statusEl.hidden = !status;
    }
    const raw = cp[this.game.wallet(this.me, this.game.myOwner)] ?? 0; // co-op: your own
    const myCp = Math.floor(raw);
    if (this.cpText.textContent !== `${myCp} CP`) this.cpText.textContent = `${myCp} CP`;
    // what comes in per minute: the rise of the CP over the last ~10 s (what is spent doesn't count) — every
    // mode pays its own way (points, bounties, reserves), so it is measured, not worked out
    const now = this.game.time;
    const dt = now - (this.rateT ?? now);
    if (dt > 0 && this.lastCp != null) this.cpRate = (this.cpRate ?? 0) + (Math.max(0, raw - this.lastCp) / dt - (this.cpRate ?? 0)) * Math.min(1, dt / 10);
    if (dt > 0 || this.lastCp == null) { this.rateT = now; this.lastCp = raw; }
    const rate = `+${Math.round((this.cpRate ?? 0) * 60)}/min`;
    if (this.rateText.textContent !== rate) this.rateText.textContent = rate;
    if (this.state.build) { // the two budgets (systems/Economy.js)
      this.pools.hidden = false;
      const b = `Build ${Math.floor(this.state.build[this.me] ?? 0)}`;
      const s = `Support ${Math.floor(this.state.support[this.me] ?? 0)}`;
      if (this.buildText.textContent !== b) this.buildText.textContent = b;
      this.buildText.hidden = !!this.game.world.openSea; // (at sea: nothing to build)
      if (this.supportText.textContent !== s) this.supportText.textContent = s;
    }
    const stacks = forces(this.game, this.me).length; // what counts toward the limit (bailed-out crews don't)
    const full = stacks >= this.state.maxStacks;
    this.stacksText.textContent = `${stacks}/${this.state.maxStacks} stacks`;
    const g = this.game;
    this.allyN.textContent = `${g.world.stacksOf(this.me).length} stacks`;
    this.enemyN.textContent = `${g.world.stacks.filter((s) => s.alive && s.faction === this.foe && s.visible !== false).length} seen`;
    this.stacksText.classList.toggle('full', full);
    this.window.update();
  }
}
