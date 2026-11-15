// Soft contact shadows for the presets without sun shadows (Very low): a dark, blurred disc on the ground
// under every man, horse, gun and vehicle that can be seen — without one they seem to hover over the field.
// All of them are one instanced quad (one draw call), rewritten each frame from the units' positions.
// A unit up in the air (a helicopter, a man on a roof) gets a fainter, wider one, gone above FADE_H.
import * as THREE from 'three';

const MAX = 2048;
const FADE_H = 8;  // m above the ground where a shadow is gone

function blobTexture() {
  const s = 64, cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d');
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,0.8)');
  r.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(cv);
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();

export class BlobShadows {
  constructor(game) {
    this.game = game;
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, map: blobTexture(), transparent: true, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    game.scene.add(this.mesh);
  }

  update() {
    const g = this.game, mesh = this.mesh;
    const on = g.quality?.q?.shadows === false;
    mesh.visible = on;
    if (!on) return;
    const T = g.world.terrain;
    let n = 0;
    for (const s of g.world.stacks) {
      if (s.stats.naval || s.stats.air) continue;
      const man = s.kind === 'infantry';
      for (const u of s.units) {
        if (!u.alive || u.visible === false || n >= MAX) continue;
        const y = T.heightAt(u.pos.x, u.pos.z);
        const up = Math.max(0, u.pos.y - y);
        if (up > FADE_H) continue;
        const k = 1 - up / FADE_H;                 // fainter and wider the higher
        const r = Math.max(0.45, u.radius ?? 0.5) * (man ? 1.5 : 1.25) * (2 - k);
        _p.set(u.pos.x, y + 0.06, u.pos.z);
        _q.setFromEuler(_e.set(0, u.yaw ?? 0, 0));
        _s.set(r * 2 * k, 1, r * (man ? 2 : 2.8) * k); // (a vehicle's longer than it is wide; k also shrinks it to nothing as it fades)
        mesh.setMatrixAt(n++, _m.compose(_p, _q, _s));
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  }
}
