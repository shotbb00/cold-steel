// Ships' searchlight beams at night (entities/UnitStack.js shine: u.lightOn is where the beam falls): a
// long pale cone from the bridge to it, faint in the night air, brighter where it starts.
import * as THREE from 'three';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

export class Searchlights {
  constructor(game) {
    this.game = game;
    this.beams = new Map(); // unit → mesh
    this.geo = new THREE.CylinderGeometry(0.8, 26, 1, 20, 8, true).translate(0, 0.5, 0).rotateX(Math.PI / 2); // (along +z, one long: scaled to the distance)
    // the light itself is dim and fades along the beam: added to the night (additive blending), so dark is
    // see-through (the three.js fallback; Babylon draws it with its own shader, render/babylon/extras.js beam)
    const pos = this.geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color(0xfff2cc);
    for (let i = 0; i < pos.count; i++) {
      const k = 0.03 + 0.2 * (1 - pos.getZ(i)) ** 2;
      col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
    }
    this.geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
  }

  update() {
    const seen = new Set();
    for (const s of this.game.world.stacks) {
      if (!s.alive || !s.stats.naval) continue;
      for (const u of s.units) {
        if (!u.alive || !u.lightOn || u.visible === false) continue;
        seen.add(u);
        let m = this.beams.get(u);
        if (!m) { m = new THREE.Mesh(this.geo, this.mat); m.frustumCulled = false; m.userData.babylon = 'beam'; this.game.scene.add(m); this.beams.set(u, m); } // (Babylon: its own additive shader, render/babylon/extras.js beam)
        _a.set(u.pos.x, u.pos.y + (s.stats.height ?? 10) * 0.7, u.pos.z);
        _b.set(u.lightOn.x, (u.lightOn.y ?? 0) + 4, u.lightOn.z);
        m.position.copy(_a);
        m.lookAt(_b);
        m.scale.set(1, 1, _a.distanceTo(_b));
      }
    }
    for (const [u, m] of this.beams) if (!seen.has(u)) { m.removeFromParent(); this.beams.delete(u); }
  }
}
