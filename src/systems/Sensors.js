// Radar and ESM at sea (1985: data/units/ships85.js `radar`, `esm`). A ship's radar (stack.radarOn,
// on unless ordered off: Orders 'radar') sees every surface ship in its reach that no island hides
// (systems/VisibilitySystem.js isSeen) — and gives her away: every enemy ship listening (`esm`) gets a
// bearing on her, out to ESM_REACH. Your side's bearings are drawn as lines from the listener out
// along the bearing, fading over BEARING_LIFE s; where two cross is a fix to fire missiles at
// (the minimap draws them too: ui/Minimap.js). Off, she sees only by eye — and is silent.
import * as THREE from 'three';
import { enemyOf } from '../data/factions.js';

const EVERY = 3;            // s between fresh bearings
const BEARING_LIFE = 12;    // s a bearing line fades over
const ESM_REACH = 3800;     // m: a radar is heard further than it sees (3 km) — not across the whole sea
const NOISE = 0.02;         // rad: a bearing's error (±1°)
const SPREAD1 = 450;        // m: a fix from one listener — how far off it may be
const SPREAD2 = 150;        // m: from two or more

export class Sensors {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.marks = new Map(); // emitter stack → { line, ring, x, z, a, fix, at } (the player's side: what it has heard)
    this.fixes = { nato: [], pact: [] }; // per side: { stack, x, z } — an enemy heard by two or more of its ships (SeaDirector fires at them)
    this.lineMat = new THREE.LineBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.55, depthWrite: false, depthTest: false, toneMapped: false, fog: false });
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.8, depthWrite: false, depthTest: false, toneMapped: false, fog: false, side: THREE.DoubleSide });
    this.heard = new Set();
    this.launches = []; // { faction (who fired), x, z, at } — heard and seen by the other side as a bearing (Missiles.launch)
  }

  /** A missile launch at (x, z) by `faction`: the flash and the booster are a bearing for the other side (not a position). */
  launch(faction, x, z) {
    this.launches.push({ faction, x, z, at: this.game.time });
  }

  /** What `f`'s ships hear: every radiating enemy within ESM_REACH (and every launch), and by how many of them. */
  hear(f) {
    const g = this.game;
    const ears = g.world.stacksOf(f).filter((s) => s.alive && s.stats.esm).map((s) => s.units.find((u) => u.alive)).filter((u) => u && (u.depth ?? 0) <= 9);
    const out = [];
    const sea = g.world.river?.level ?? 0, terrain = g.world.terrain;
    // what an island hides it doesn't hear either: a radar's emission (or a launch's flash) needs a line of sight to the mast
    const clear = (u, x, z, h) => !terrain?.lineOfSight || terrain.lineOfSight(u.pos.x, sea + ((u.depth ?? 0) > 1 ? 2 : u.stats.radar?.height ?? 25), u.pos.z, x, sea + h, z);
    const listen = (key, x, z, h) => {
      const by = ears.filter((u) => Math.hypot(x - u.pos.x, z - u.pos.z) < ESM_REACH && clear(u, x, z, h)).sort((a, b) => Math.hypot(x - a.pos.x, z - a.pos.z) - Math.hypot(x - b.pos.x, z - b.pos.z));
      if (by.length) out.push({ key, x, z, by });
    };
    for (const e of g.world.stacksOf(enemyOf(f))) {
      if (!e.alive || !e.stats.radar || e.radarOn === false) continue;
      const eu = e.units.find((x) => x.alive);
      if (eu && (eu.depth ?? 0) <= 1) listen(e, eu.pos.x, eu.pos.z, e.stats.radar.height);
    }
    for (const l of this.launches) if (l.faction !== f && g.time - l.at < 6) listen(l, l.x, l.z, 80); // (the booster climbs before it dives to the sea)
    return out;
  }

  /**
   * Radar discipline from the start, for both sides alike: a ship arrives silent (radarOn false) — except the
   * player's first picket, the smallest radar ship, so the fleet isn't blind (the AI keeps its own: SeaDirector.emcon).
   */
  silence() {
    const g = this.game, me = g.playerFaction;
    for (const s of g.world.stacks) if (s.stats.radar && !s.__emcon) { s.__emcon = true; s.radarOn = false; }
    if (!this.picket) {
      const mine = g.world.stacksOf(me).filter((s) => s.alive && s.stats.radar && !s.stats.carrier);
      const VALUE = (s) => s.type.cost ?? 0;
      this.picket = mine.sort((a, b) => VALUE(a) - VALUE(b))[0] ?? null;
      if (this.picket) { this.picket.radarOn = true; g.tell(me, `${this.picket.name}: radar picket — the rest of the fleet is silent (^: all radars on)`); }
    }
  }

  update(dt) {
    const g = this.game;
    this.silence();
    if ((this.t -= dt) > 0) return this.fade();
    this.t = EVERY;
    this.launches = this.launches.filter((l) => g.time - l.at < 6);
    const me = g.playerFaction;
    for (const f of ['nato', 'pact']) {
      const heard = this.hear(f);
      // two or more listeners: a fix (where the bearings cross, give or take SPREAD2); one: a bearing only
      this.fixes[f] = heard.filter((h) => h.by.length >= 2 && h.key.units).map((h) => {
        const r = SPREAD2 * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2;
        return { stack: h.key, x: h.x + Math.cos(a) * r, z: h.z + Math.sin(a) * r };
      });
      if (f !== me) continue;
      const y = (g.world.river?.level ?? 0) + 3;
      for (const h of heard) {
        if (h.key.units && h.key.visible) continue; // (one you see needs no bearing)
        let m = this.marks.get(h.key);
        if (!m) {
          const line = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3)), this.lineMat.clone());
          const ring = new THREE.Mesh(new THREE.RingGeometry(SPREAD2 * 0.8, SPREAD2, 40).rotateX(-Math.PI / 2), this.ringMat.clone());
          for (const o of [line, ring]) { o.frustumCulled = false; o.renderOrder = 5; g.scene.add(o); }
          m = { line, ring };
          this.marks.set(h.key, m);
          if (h.key.units && !this.heard.has(h.key.id)) { this.heard.add(h.key.id); g.tell(me, `ESM: enemy radar bearing ${Math.round(((Math.atan2(h.x - h.by[0].pos.x, h.z - h.by[0].pos.z) * 180) / Math.PI + 360) % 360)}°`); }
          if (!h.key.units) g.tell(me, `Missile launch detected, bearing ${Math.round(((Math.atan2(h.x - h.by[0].pos.x, h.z - h.by[0].pos.z) * 180) / Math.PI + 360) % 360)}°`);
        }
        const fix = h.by.length >= 2;
        const lu = h.by[0], a = Math.atan2(h.x - lu.pos.x, h.z - lu.pos.z) + (Math.random() - 0.5) * 2 * NOISE;
        const fx = h.x + (Math.random() - 0.5) * SPREAD2, fz = h.z + (Math.random() - 0.5) * SPREAD2;
        Object.assign(m, { x: lu.pos.x, z: lu.pos.z, a, fix, fx, fz, at: g.time });
        const p = m.line.geometry.attributes.position;
        p.setXYZ(0, lu.pos.x, y, lu.pos.z);
        p.setXYZ(1, lu.pos.x + Math.sin(a) * ESM_REACH, y, lu.pos.z + Math.cos(a) * ESM_REACH);
        p.needsUpdate = true;
        m.ring.position.set(fx, y, fz);
      }
    }
    this.fade();
  }

  /** A bearing (one ship heard it) or a fix ring (two or more), fading over BEARING_LIFE s once no longer heard. */
  fade() {
    const g = this.game;
    for (const [key, m] of this.marks) {
      const k = 1 - (g.time - m.at) / BEARING_LIFE;
      if (k <= 0 || (key.units && key.visible)) { for (const o of [m.line, m.ring]) { o.removeFromParent(); o.geometry.dispose(); o.material.dispose(); } this.marks.delete(key); continue; }
      m.line.visible = !m.fix;
      m.ring.visible = m.fix;
      m.line.material.opacity = 0.55 * k;
      m.ring.material.opacity = 0.8 * k;
    }
  }

  /** The player's bearings and fixes (for the minimap): { x, z, a, k, fix, fx, fz }. */
  lines() {
    const out = [];
    for (const m of this.marks.values()) out.push({ x: m.x, z: m.z, a: m.a, k: 1 - (this.game.time - m.at) / BEARING_LIFE, fix: m.fix, fx: m.fx, fz: m.fz });
    return out;
  }
}
