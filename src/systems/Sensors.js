// Radar and ESM at sea (1985: data/units/ships85.js `radar`, `esm`). A ship's radar (stack.radarOn,
// on unless ordered off: Orders 'radar') sees every surface ship in its reach that no island hides
// (systems/VisibilitySystem.js isSeen) — and gives her away: every enemy ship listening (`esm`) gets a
// bearing on her, out to ESM_REACH. Your side's bearings are drawn as lines from the listener out
// along the bearing, fading over BEARING_LIFE s; where two cross is a fix to fire missiles at
// (the minimap draws them too: ui/Minimap.js). Off, she sees only by eye — and is silent.
import * as THREE from 'three';

const EVERY = 3;            // s between fresh bearings
const BEARING_LIFE = 20;    // s a bearing line fades over
const ESM_REACH = 7000;     // m: a radar is heard far beyond what it sees
const LINE = 6000;          // m: how far a bearing line is drawn
const NOISE = 0.02;         // rad: a bearing's error (±1°)

export class Sensors {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.bearings = new Map(); // `${listener.id}:${emitter.id}` → { x, z, a, at, line } (the player's side)
    this.mat = new THREE.LineBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.6, depthWrite: false, depthTest: false, toneMapped: false, fog: false });
  }

  update(dt) {
    const g = this.game;
    if ((this.t -= dt) <= 0) {
      this.t = EVERY;
      const me = g.playerFaction;
      for (const e of g.world.stacks) {
        if (!e.alive || !e.stats.radar || e.radarOn === false || e.faction === me || e.visible) continue; // (one you see already needs no bearing)
        const eu = e.units.find((x) => x.alive);
        if (!eu || (eu.depth ?? 0) > 1) continue;
        for (const l of g.world.stacksOf(me)) {
          if (!l.alive || !l.stats.esm) continue;
          const lu = l.units.find((x) => x.alive);
          if (!lu || (lu.depth ?? 0) > 9 || Math.hypot(eu.pos.x - lu.pos.x, eu.pos.z - lu.pos.z) > ESM_REACH) continue;
          const key = `${l.id}:${e.id}`;
          const a = Math.atan2(eu.pos.x - lu.pos.x, eu.pos.z - lu.pos.z) + (Math.random() - 0.5) * 2 * NOISE;
          let b = this.bearings.get(key);
          if (!b) {
            const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
            const line = new THREE.LineSegments(geo, this.mat.clone());
            line.frustumCulled = false;
            line.renderOrder = 5;
            g.scene.add(line);
            b = { line };
            this.bearings.set(key, b);
            if (!this.heard?.has(e.id)) { (this.heard ??= new Set()).add(e.id); g.tell(me, `ESM: enemy radar bearing ${Math.round(((a * 180) / Math.PI + 360) % 360)}°`); }
          }
          Object.assign(b, { x: lu.pos.x, z: lu.pos.z, a, at: g.time });
          const y = (g.world.river?.level ?? 0) + 3, p = b.line.geometry.attributes.position;
          p.setXYZ(0, b.x, y, b.z);
          p.setXYZ(1, b.x + Math.sin(a) * LINE, y, b.z + Math.cos(a) * LINE);
          p.needsUpdate = true;
        }
      }
    }
    for (const [key, b] of this.bearings) {
      const k = 1 - (g.time - b.at) / BEARING_LIFE;
      if (k <= 0) { b.line.removeFromParent(); b.line.geometry.dispose(); b.line.material.dispose(); this.bearings.delete(key); continue; }
      b.line.material.opacity = 0.6 * k;
    }
  }

  /** The player's live bearings (for the minimap): { x, z, a, k }. */
  lines() {
    const out = [];
    for (const b of this.bearings.values()) out.push({ x: b.x, z: b.z, a: b.a, k: 1 - (this.game.time - b.at) / BEARING_LIFE });
    return out;
  }
}
