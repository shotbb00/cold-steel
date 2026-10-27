// Capturable control points (Frontline mode). Only infantry captures: a point swings toward
// whichever side has soldiers inside its radius (faster with more of them, up to 8), stops
// while contested, passes through neutral, and belongs to a side once fully swung. Each
// point shows a flag that climbs its pole with progress and a ring in the owner's colour.
import * as THREE from 'three';
import { FACTIONS, enemyOf } from '../data/factions.js';
import { GroundDecal } from '../world/GroundDecal.js';

const INTERVAL = 0.25;
const RATE = 0.012;  // progress per second per soldier (max 8 count)
const NEUTRAL = new THREE.Color(0x9a9a9a);

export class ControlPoints {
  /** @param defs [{ id, name, x, z, radius, owner }] — owner is a faction id or null */
  constructor(game, defs) {
    this.game = game;
    this.home = game.playerFaction;     // progress +1 = player's side
    this.foe = enemyOf(game.playerFaction);
    this.timer = 0;
    this.points = defs.map((d) => this.build(d));
  }

  sign(faction) {
    return faction === this.home ? 1 : -1;
  }

  build(d) {
    const { scene, terrain } = this.game;
    const y = terrain.heightAt(d.x, d.z);
    const radius = d.radius ?? 16;
    const flagMat = new THREE.MeshStandardMaterial({ color: NEUTRAL, emissive: NEUTRAL, emissiveIntensity: 0.25, side: THREE.DoubleSide });
    const ringMat = new THREE.MeshBasicMaterial({ color: NEUTRAL, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc9ced8, metalness: 0.6, roughness: 0.4 }));
    pole.position.set(d.x, y + 5, d.z);
    pole.castShadow = true;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), flagMat);
    flag.position.set(1.35, 0, 0);
    const flagPivot = new THREE.Group();
    flagPivot.position.set(d.x, y + 2, d.z);
    flagPivot.add(flag);
    const ringGeo = new THREE.RingGeometry(0.97, 1, 96);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new GroundDecal(ringGeo, ringMat, terrain, 0.25);
    ring.place(d.x, d.z, radius);
    scene.add(pole, flagPivot, ring.mesh);
    this.game.cover.addCylinder({ x: d.x, z: d.z, radius: 0.25, height: 10, spots: false }); // solid to bolts and the camera
    const owner = d.owner ?? null;
    const p = {
      id: d.id, name: d.name ?? d.id, x: d.x, z: d.z, y, radius, sector: d.sector ?? null,
      owner, progress: owner ? this.sign(owner) : 0, contested: false, counts: {},
      flag, flagPivot, flagMat, ringMat,
    };
    this.paint(p);
    return p;
  }

  owned(faction) {
    return this.points.filter((p) => p.owner === faction).length;
  }

  paint(p) {
    const c = p.progress === 0 ? NEUTRAL : new THREE.Color(FACTIONS[p.progress > 0 ? this.home : this.foe].glow);
    const k = Math.abs(p.progress);
    p.flagMat.color.copy(NEUTRAL).lerp(c, k);
    p.flagMat.emissive.copy(p.flagMat.color);
    p.ringMat.color.copy(NEUTRAL).lerp(c, p.owner ? 1 : k * 0.6).multiplyScalar(p.contested ? 1.8 : 1.2);
    p.ringMat.opacity = p.locked ? 0.18 : 0.55;
    p.flagPivot.position.y = p.y + 2 + 7 * k;
  }

  /** Flags in the wind (every machine animates its own). */
  flutter(t) {
    for (const p of this.points) p.flag.rotation.y = Math.sin(t * 2.3 + p.x) * 0.25;
  }

  /** A multiplayer client takes the host's state; `natoProgress` is +1 for NATO, -1 for the Pact. */
  apply(p, natoProgress, owner, contested, locked = false) {
    const progress = this.home === 'nato' ? natoProgress : -natoProgress;
    if (progress === p.progress && owner === p.owner && contested === p.contested && locked === !!p.locked) return;
    p.locked = locked;
    const prev = p.owner;
    p.progress = progress;
    p.owner = owner;
    if (owner !== prev) this.game.bus.emit('point:owner', { point: p, owner, prev });
    p.contested = contested;
    this.paint(p);
  }

  update(dt, t) {
    this.flutter(t);
    this.timer -= dt;
    if (this.timer > 0) return;
    const step = INTERVAL - this.timer;
    this.timer = INTERVAL;

    for (const p of this.points) {
      if (p.locked) { // not in play (Breakthrough: behind the line being fought over)
        if (p.contested) { p.contested = false; this.paint(p); }
        continue;
      }
      let home = 0;
      let foe = 0;
      for (const s of this.game.world.stacks) {
        if (!s.alive || !s.usesCover) continue; // vehicles can't take ground
        for (const u of s.units) {
          if (!u.alive || (u.pos.x - p.x) ** 2 + (u.pos.z - p.z) ** 2 > p.radius * p.radius) continue;
          if (s.faction === this.home) home++; else foe++;
        }
      }
      p.counts = { [this.home]: home, [this.foe]: foe };
      p.contested = home > 0 && foe > 0;
      const before = p.progress;
      if (!p.contested && (home || foe)) {
        const dir = home ? 1 : -1;
        p.progress = Math.max(-1, Math.min(1, p.progress + dir * RATE * Math.min(home + foe, 8) * step));
      }
      // ownership: full swing captures; crossing neutral loses it
      if (p.owner && Math.sign(p.progress) !== this.sign(p.owner)) {
        this.game.announce(`${p.name} lost by ${FACTIONS[p.owner].name}`);
        const prev = p.owner;
        p.owner = null;
        this.game.bus.emit('point:owner', { point: p, owner: null, prev });
      }
      if (!p.owner && Math.abs(p.progress) >= 1) {
        p.owner = p.progress > 0 ? this.home : this.foe;
        this.game.bus.emit('point:captured', { point: p, owner: p.owner });
        this.game.bus.emit('point:owner', { point: p, owner: p.owner, prev: null });
        this.game.announce(`${p.name} captured by ${FACTIONS[p.owner].name}`);
      }
      if (before !== p.progress || p.contested !== p.wasContested) this.paint(p);
      p.wasContested = p.contested;
    }
  }
}
