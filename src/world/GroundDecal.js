// A flat ring/disc that drapes itself over the terrain (aura, selection rings, order markers).
// Vertices are re-projected onto the heightfield every time it is placed.
import * as THREE from 'three';

export class GroundDecal {
  /** @param {THREE.BufferGeometry} geometry flat on XZ around the origin */
  constructor(geometry, material, terrain, lift = 0.15) {
    this.terrain = terrain;
    this.lift = lift;
    this.base = Float32Array.from(geometry.attributes.position.array);
    this.geometry = geometry.clone();
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false; // vertices are written in world space
    this.mesh.renderOrder = 2;
  }

  place(x, z, scale = 1, rotation = 0) {
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    const b = this.base;
    const arr = this.geometry.attributes.position.array;
    for (let i = 0; i < b.length; i += 3) {
      const lx = b[i] * scale;
      const lz = b[i + 2] * scale;
      const wx = x + lx * c + lz * s;
      const wz = z - lx * s + lz * c;
      arr[i] = wx;
      arr[i + 1] = this.terrain.heightAt(wx, wz) + this.lift;
      arr[i + 2] = wz;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
}
