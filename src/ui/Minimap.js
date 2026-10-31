// Minimap: hill-shaded terrain shaded by the fog of war (render/FogOfWar.js: darker where
// your side can't see), control points, fortifications, your stacks and the enemy stacks you
// can currently see, helicopter runs, the unit you control and the camera's view.
// Left-click jumps the command camera there; right-click sends the selected stacks there.
// The terrain image is rendered once (and again when trenches are dug); overlays at 5 Hz.
import * as THREE from 'three';
import { CameraMode } from '../core/CameraManager.js';
import { FACTIONS, enemyOf } from '../data/factions.js';

const WIDTH = 180;
const INTERVAL = 0.2;
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
const _n = new THREE.Vector3();
const _p = new THREE.Vector3();

export class Minimap {
  constructor(game) {
    this.game = game;
    const b = game.world.bounds;
    this.bx = b.x;
    this.bz = b.z;
    this.w = WIDTH;
    this.h = Math.round(WIDTH * (b.z / b.x));
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'minimap';
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    document.getElementById('hud').appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.bg = document.createElement('canvas');
    this.bg.width = this.w;
    this.bg.height = this.h;
    this.timer = 0;
    this.renderTerrain();

    this.ally = hex(FACTIONS[game.playerFaction].glow);
    this.foe = hex(FACTIONS[enemyOf(game.playerFaction)].glow);
    game.bus.on('built', () => this.renderTerrain());
    game.bus.on('terrain:changed', () => this.renderTerrain());
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('mousedown', (e) => this.onClick(e));
  }

  /** Turned so your own side is at the bottom (the command camera's facing). */
  get flip() {
    return this.game.cameraManager.tactical.facing;
  }

  toWorld(mx, my) {
    const f = this.flip;
    return { x: f * ((mx / this.w) * 2 * this.bx - this.bx), z: f * ((my / this.h) * 2 * this.bz - this.bz) };
  }

  toMap(x, z) {
    const f = this.flip;
    return [((f * x + this.bx) / (2 * this.bx)) * this.w, ((f * z + this.bz) / (2 * this.bz)) * this.h];
  }

  /** The areas of our own special vehicles, as RangeIndicators shows them on the ground for the selected ones. */
  drawAreas(c) {
    const game = this.game;
    const radarOn = new Set((game.air.radars ?? []).filter((r) => r.on).map((r) => r.u));
    const area = (x, z, r, color, on, arc = null, yaw = 0) => {
      c.beginPath();
      if (arc) { // a sector: its outline as points, mapped (the minimap may be turned)
        const [cx, cy] = this.toMap(x, z);
        c.moveTo(cx, cy);
        for (let i = 0; i <= 24; i++) {
          const a = yaw - arc / 2 + (arc * i) / 24;
          c.lineTo(...this.toMap(x + Math.sin(a) * r, z + Math.cos(a) * r));
        }
        c.closePath();
      } else {
        const [mx, my] = this.toMap(x, z);
        c.ellipse(mx, my, (r / (2 * this.bx)) * this.w, (r / (2 * this.bz)) * this.h, 0, 0, Math.PI * 2);
      }
      c.setLineDash(on ? [] : [2, 3]);
      c.strokeStyle = color + (on ? 'cc' : '77');
      c.stroke();
      if (on) { c.fillStyle = color + '22'; c.fill(); }
      c.setLineDash([]);
    };
    for (const s of game.world.stacksOf(game.playerFaction)) {
      const st = s.stats;
      const u = s.units[0];
      if (!u?.alive || !game.mine(s)) continue;
      if (st.airRadar) area(u.pos.x, u.pos.z, st.airRadar.cover, '#7ff0ff', radarOn.has(u));
      if (st.cbRadar) area(u.pos.x, u.pos.z, st.cbRadar.range, '#ffc46a', !!u.radarOn, st.cbRadar.arc, u.yaw);
      if (st.jammer) area(u.pos.x, u.pos.z, st.jammer.radius, '#c49bff', !!u.jamming);
      if (st.commandPost) area(u.pos.x, u.pos.z, st.commandPost.lead, '#9fe08a', s.postReady);
    }
  }

  /** Darken what your side can't see (the same picture as the 3D fog of war). */
  drawFog(c) {
    const fow = this.game.fow;
    if (!fow) return;
    if (!this.fog) {
      this.fog = document.createElement('canvas');
      this.fog.width = this.w;
      this.fog.height = this.h;
      this.fogImg = this.fog.getContext('2d').createImageData(this.w, this.h);
    }
    const d = this.fogImg.data;
    const f = this.flip;
    for (let my = 0; my < this.h; my++) {
      const z = f * (((my + 0.5) / this.h) * 2 * this.bz - this.bz);
      for (let mx = 0; mx < this.w; mx++) {
        const x = f * (((mx + 0.5) / this.w) * 2 * this.bx - this.bx);
        const i = (my * this.w + mx) * 4;
        d[i] = 8;
        d[i + 1] = 10;
        d[i + 2] = 14;
        d[i + 3] = (1 - fow.at(x, z)) * 150;
      }
    }
    this.fog.getContext('2d').putImageData(this.fogImg, 0, 0);
    c.drawImage(this.fog, 0, 0);
  }

  /** Hill-shaded relief: green lowlands, brown slopes, grey heights. */
  renderTerrain() {
    const terrain = this.game.terrain;
    const g = this.bg.getContext('2d');
    const img = g.createImageData(this.w, this.h);
    const light = new THREE.Vector3(-0.5, 0.75, -0.45).normalize();
    const river = this.game.world.river;
    for (let my = 0; my < this.h; my++) {
      for (let mx = 0; mx < this.w; mx++) {
        const { x, z } = this.toWorld(mx + 0.5, my + 0.5);
        const y = terrain.heightAt(x, z);
        terrain.normalAt(x, z, _n);
        const shade = 0.55 + 0.6 * Math.max(0, _n.dot(light));
        const rock = Math.min(1, Math.max(0, (0.92 - _n.y) * 5 + (y - 12) / 20));
        const r = (62 + (110 - 62) * rock) * shade;
        const gr = (84 + (106 - 84) * rock) * shade;
        const bl = (52 + (104 - 52) * rock) * shade;
        const i = (my * this.w + mx) * 4;
        const water = river && river.level - y > 0.12;
        img.data[i] = water ? 52 : r;
        img.data[i + 1] = water ? 74 : gr;
        img.data[i + 2] = water ? 86 : bl;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }

  onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const rect = this.canvas.getBoundingClientRect();
    const { x, z } = this.toWorld(((e.clientX - rect.left) / rect.width) * this.w, ((e.clientY - rect.top) / rect.height) * this.h);
    const game = this.game;
    if (e.altKey && game.coop && (e.button === 0 || e.button === 2)) {
      game.bus.emit('ping', { x, z, kind: e.button === 2 ? 'danger' : 'here' }); // co-op: mark it for the teammate
      return;
    }
    if (e.button === 0) {
      if (game.cameraManager.mode === CameraMode.TACTICAL) game.cameraManager.tactical.target.set(x, 0, z);
    } else if (e.button === 2) {
      const stacks = [...game.commands.selected].filter((s) => s.alive);
      if (!stacks.length) return game.bus.emit('toast', 'Select stacks first, then right-click the map');
      _p.set(x, game.terrain.heightAt(x, z), z);
      game.commands.moveGroup(stacks, _p.clone(), { hold: e.ctrlKey || e.altKey });
      game.commands.addMarker(_p, 'move');
      game.bus.emit('order', { kind: 'move' });
    }
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = INTERVAL;
    const { ctx: c, game } = this;
    c.drawImage(this.bg, 0, 0);
    this.drawFog(c);
    c.lineWidth = 1;

    // control points
    for (const p of game.modeState?.points?.points ?? []) {
      const [mx, my] = this.toMap(p.x, p.z);
      const r = (p.radius / (2 * this.bx)) * this.w + 2;
      c.beginPath();
      c.arc(mx, my, r, 0, Math.PI * 2);
      c.fillStyle = p.owner ? (p.owner === game.playerFaction ? this.ally : this.foe) + '55' : 'rgba(200,200,200,0.25)';
      c.fill();
      c.strokeStyle = p.contested ? '#ffffff' : 'rgba(255,255,255,0.5)';
      c.stroke();
      c.fillStyle = '#fff';
      c.font = 'bold 9px Segoe UI, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(p.id, mx, my);
    }

    // our radars, jammers and command posts: what they cover (dashed until they work)
    this.drawAreas(c);

    // the mode's own marks (Recon raid: search areas, marked targets)
    for (const m of game.modeState?.markers?.() ?? []) {
      const [mx, my] = this.toMap(m.x, m.z);
      const r = Math.max(3, (m.r / (2 * this.bx)) * this.w);
      c.strokeStyle = m.color;
      c.setLineDash(m.dashed ? [3, 3] : []);
      c.beginPath();
      c.arc(mx, my, r, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      if (m.label) {
        c.fillStyle = m.color;
        c.font = 'bold 9px Segoe UI, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(m.label, mx, my);
      }
    }

    // fortifications
    const drawLine = (s, style, width) => {
      const half = s.def.length / 2;
      const [x0, y0] = this.toMap(s.x - Math.cos(s.yaw) * half, s.z + Math.sin(s.yaw) * half);
      const [x1, y1] = this.toMap(s.x + Math.cos(s.yaw) * half, s.z - Math.sin(s.yaw) * half);
      c.strokeStyle = style;
      c.lineWidth = width;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
    };
    for (const s of game.construction.structures) {
      if (s.faction === game.playerFaction || this.seenNear(s)) drawLine(s, s.kind === 'trench' ? '#2b1d14' : '#c8b07a', 2);
    }
    for (const s of game.construction.sites) if (s.faction === game.playerFaction) drawLine(s, 'rgba(143,233,255,0.7)', 1.5);
    c.lineWidth = 1;

    // view cones of the selected stacks (what they can actually watch)
    const selected = game.commands.selected;
    for (const s of selected) {
      if (!s.alive) continue;
      const st = s.stats;
      const [mx, my] = this.toMap(s.centroid.x, s.centroid.z);
      const r = (st.sight / (2 * this.bx)) * this.w;
      const half = (st.fov ?? 2.1) / 2;
      const yaw = s.leader ? (s.usesCover ? s.leader.yaw : s.leader.turretYaw) : s.facing;
      // canvas angle: world (sin yaw, cos yaw) on the x/z plane maps to map (x, y)
      const a0 = Math.atan2(Math.cos(yaw), Math.sin(yaw));
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.beginPath();
      c.moveTo(mx, my);
      c.arc(mx, my, r, a0 - half, a0 + half);
      c.closePath();
      c.fill();
    }

    // stacks
    for (const s of game.world.stacks) {
      if (!s.alive) continue;
      const mine = s.faction === game.playerFaction;
      if (!mine && s.visible === false) continue;
      const [mx, my] = this.toMap(s.centroid.x, s.centroid.z);
      const size = s.kind === 'vehicle' ? 4 : 3;
      c.fillStyle = mine ? (game.mine(s) ? this.ally : '#b8d89a') : this.foe; // co-op partner: pale green
      if (s.kind === 'infantry') {
        c.beginPath();
        c.arc(mx, my, size, 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillRect(mx - size, my - size, size * 2, size * 2);
      }
      if (selected.has(s)) {
        c.strokeStyle = '#ffc35a';
        c.lineWidth = 1.5;
        c.strokeRect(mx - size - 2, my - size - 2, size * 2 + 4, size * 2 + 4);
        c.lineWidth = 1;
      }
    }

    // helicopter runs: yours from the call, the enemy's once it shows up
    for (const s of game.air.sorties) {
      const mine = s.faction === game.playerFaction;
      if (!mine && s.state === 'inbound') continue;
      const [tx, ty] = this.toMap(s.target.x, s.target.z);
      c.strokeStyle = '#ff6a3d';
      c.beginPath();
      c.arc(tx, ty, 4, 0, Math.PI * 2);
      c.stroke();
      if (s.state === 'inbound') continue;
      const [hx, hy] = this.toMap(s.pos.x, s.pos.z);
      c.fillStyle = mine ? this.ally : this.foe;
      c.beginPath();
      c.arc(hx, hy, 3, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = c.fillStyle;
      c.beginPath();
      if (s.kind === 'jet') {                   // a jet: a dart along its heading
        const [ax, ay] = this.toMap(s.pos.x + Math.sin(s.yaw) * 30, s.pos.z + Math.cos(s.yaw) * 30);
        const k = 7 / (Math.hypot(ax - hx, ay - hy) || 1);
        c.moveTo(hx + (ax - hx) * k, hy + (ay - hy) * k);
        c.lineTo(hx - (ax - hx) * k * 0.7, hy - (ay - hy) * k * 0.7);
      } else c.arc(hx, hy, 6, 0, Math.PI * 2);   // rotor disc
      c.stroke();
    }

    // the unit you control, and what the camera sees
    const u = game.player.unit;
    if (u) {
      const [mx, my] = this.toMap(u.pos.x, u.pos.z);
      const yaw = game.cameraManager.yaw + Math.PI;
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(mx + Math.sin(yaw) * 6, my + Math.cos(yaw) * 6);
      c.lineTo(mx + Math.sin(yaw + 2.5) * 4, my + Math.cos(yaw + 2.5) * 4);
      c.lineTo(mx + Math.sin(yaw - 2.5) * 4, my + Math.cos(yaw - 2.5) * 4);
      c.fill();
    }
    if (game.cameraManager.mode === CameraMode.TACTICAL) this.drawViewFootprint(c);
    // co-op pings (ui/Chat.js): pulsing rings
    for (const p of game.chat?.pings ?? []) {
      const [px, py] = this.toMap(p.x, p.z);
      c.strokeStyle = p.kind === 'danger' ? '#ff5a48' : '#ffc35a';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(px, py, 5 + 3 * Math.abs(Math.sin(p.t * 3)), 0, Math.PI * 2);
      c.stroke();
    }
    c.lineWidth = 1;
  }

  /** Is an enemy structure where your side can see? (fog of war applies to fortifications too) */
  seenNear(site) {
    for (const u of this.game.world.combatants(this.game.playerFaction)) {
      const r = u.stats.sight ?? 100;
      if ((u.pos.x - site.x) ** 2 + (u.pos.z - site.z) ** 2 < r * r) return true;
    }
    return false;
  }

  drawViewFootprint(c) {
    const cmd = this.game.commands;
    const W = innerWidth;
    const H = innerHeight;
    const corners = [[0, H * 0.08], [W, H * 0.08], [W, H], [0, H]];
    const pts = [];
    for (const [x, y] of corners) {
      const p = cmd.pickGround(x, y, _p);
      if (!p) return;
      pts.push(this.toMap(p.x, p.z));
    }
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.stroke();
  }
}
