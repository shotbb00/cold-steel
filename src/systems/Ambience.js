// The war around your corner of it — scenery and sound only, nothing here touches the battle:
//   • jets: now and then a pair of fast jets streaks low across the map on their way somewhere
//     else, roaring past with a Doppler drop in pitch
//   • distant artillery: flashes flicker on the horizon beyond the map edge, the rumble arriving
//     seconds later (sound travels ~340 m/s)
//   • burning villages: two or three smoke columns rising beyond the edge, kept alight
// Each player's machine makes its own (multiplayer doesn't send any of it); run from
// GameEngine.render so the multiplayer host doesn't record it for the client.
import * as THREE from 'three';

const JET_SPEED = 230;            // m/s
const JET_GAP = [55, 120];        // seconds between passes
const ARTY_GAP = [6, 18];         // seconds between salvoes
const SOUND = 340;                // m/s
const rand = ([a, b]) => a + Math.random() * (b - a);

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,240,210,1)');
  grad.addColorStop(0.25, 'rgba(255,190,110,0.6)');
  grad.addColorStop(1, 'rgba(255,140,60,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** A low-poly strike jet: tapered fuselage, swept wings, fin, tailplanes. */
function buildJet(color) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.LatheGeometry([[0, -8], [0.7, -7], [0.95, -2], [0.9, 4], [0.5, 7.5], [0, 8.5]].map(([r, y]) => new THREE.Vector2(r, y)), 10), mat);
  body.rotation.x = Math.PI / 2; // nose along +z
  const wingShape = new THREE.Shape([[0, 0], [5.6, -2.6], [5.6, -3.6], [0, -3.8]].map(([x, y]) => new THREE.Vector2(x, y)));
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.18, bevelEnabled: false });
  wingGeo.rotateX(Math.PI / 2);
  for (const side of [1, -1]) {
    const w = new THREE.Mesh(wingGeo, mat);
    w.scale.x = side;
    w.position.set(0, 0, 1.5);
    g.add(w);
    const t = new THREE.Mesh(wingGeo, mat);
    t.scale.set(side * 0.45, 1, 0.45);
    t.position.set(0, 0.1, -5.5);
    g.add(t);
  }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.6, 2.4), mat);
  fin.position.set(0, 1.4, -6);
  fin.rotation.x = -0.35;
  g.add(body, fin);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export class Ambience {
  constructor(game) {
    this.game = game;
    this.bounds = game.world.bounds;
    this.jets = [];
    this.nextJet = rand([25, 60]);
    this.nextArty = rand([3, 8]);
    this.flashes = [];
    this.pending = [];  // [time, () => …] sounds on their way
    this.fires = [];
    this.glow = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
    this.jetModels = { nato: buildJet(0x5d6460), pact: buildJet(0x7a807e) };
    this.t = 0;
  }

  update(dt) {
    if (!dt) return;
    const g = this.game;
    this.t += dt;
    const t = this.t;

    // ---- jets
    if (t >= this.nextJet) {
      this.nextJet = t + rand(JET_GAP);
      this.launchJets();
    }
    for (let i = this.jets.length - 1; i >= 0; i--) {
      const j = this.jets[i];
      j.d += JET_SPEED * dt;
      const x = j.x0 + j.dx * j.d;
      const z = j.z0 + j.dz * j.d;
      const y = Math.max(g.terrain.heightAt(x, z) + j.alt, j.y);
      j.y += (y - j.y) * Math.min(1, dt * 0.8);
      for (const m of j.meshes) m.position.set(x + m.userData.ox, j.y + m.userData.oy, z + m.userData.oz);
      // Doppler: higher while coming, lower going away (listener-relative closing speed)
      const l = g.audio.listenerPos ?? g.camera.position;
      const rx = x - l.x;
      const rz = z - l.z;
      const r = Math.hypot(rx, j.y - (l.y ?? 0), rz) || 1;
      const closing = -(rx * j.dx + rz * j.dz) * JET_SPEED / r;
      j.loop.setRate(Math.max(0.7, Math.min(1.4, 1 / (1 - closing / SOUND))));
      j.loop.setPos({ x, y: j.y, z });
      if (j.d > j.len) {
        j.loop.stop();
        for (const m of j.meshes) m.removeFromParent();
        this.jets.splice(i, 1);
      }
    }

    // ---- artillery on the horizon
    if (t >= this.nextArty) {
      this.nextArty = t + rand(ARTY_GAP);
      this.salvo();
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.t += dt;
      const k = f.t / f.life;
      f.sprite.material.opacity = Math.max(0, 1 - k) * f.peak;
      if (k >= 1) {
        f.sprite.removeFromParent();
        f.sprite.material.dispose();
        this.flashes.splice(i, 1);
      }
    }
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (this.pending[i][0] <= t) {
        this.pending[i][1]();
        this.pending.splice(i, 1);
      }
    }

    // ---- burning villages beyond the edge
    if (!this.fires.length) this.placeFires();
    for (const f of this.fires) {
      if (t < f.renew) continue;
      f.renew = t + 55;
      g.effects.burn(f.pos, 60, f.size);
    }
  }

  launchJets() {
    const g = this.game;
    const side = Math.random() < 0.5 ? 'nato' : 'pact';
    // across the map at a random heading, passing within ~200 m of the middle
    const a = Math.random() * Math.PI * 2;
    const off = (Math.random() - 0.5) * 400;
    const dx = Math.sin(a);
    const dz = Math.cos(a);
    const len = 2600;
    const x0 = -dx * len / 2 + dz * off;
    const z0 = -dz * len / 2 - dx * off;
    const alt = 90 + Math.random() * 70;
    const meshes = [];
    for (const [side2, back] of [[0, 0], [-22, -30]]) {   // a pair: lead and wingman (metres aside, behind)
      const m = this.jetModels[side].clone();
      m.rotation.y = Math.atan2(dx, dz);
      m.userData = { ox: back * dx + side2 * dz, oy: (Math.random() - 0.5) * 6, oz: back * dz - side2 * dx };
      g.scene.add(m);
      meshes.push(m);
    }
    const loop = g.audio.loop('jet', { x: x0, y: alt, z: z0 }, 9);
    this.jets.push({ x0, z0, dx, dz, d: 0, len, alt, y: alt + 20, meshes, loop });
  }

  /** A battery somewhere beyond the edge: a few flashes, their thunder arriving later. */
  salvo() {
    const g = this.game;
    const b = this.bounds;
    const r = Math.random();
    // beyond one of the four edges (mostly front and back: that's where the guns are)
    let x;
    let z;
    if (r < 0.35) { x = (Math.random() - 0.5) * 900; z = -(b.z + 180 + Math.random() * 260); }
    else if (r < 0.7) { x = (Math.random() - 0.5) * 900; z = b.z + 180 + Math.random() * 260; }
    else { x = (Math.random() < 0.5 ? -1 : 1) * (b.x + 180 + Math.random() * 260); z = (Math.random() - 0.5) * 700; }
    const shots = 2 + Math.floor(Math.random() * 4);
    const cam = g.camera.position;
    for (let i = 0; i < shots; i++) {
      const delay = i * (0.3 + Math.random() * 0.9);
      const px = x + (Math.random() - 0.5) * 60;
      const pz = z + (Math.random() - 0.5) * 60;
      const ground = g.terrain.heightAt(Math.max(-490, Math.min(490, px)), Math.max(-490, Math.min(490, pz)));
      this.pending.push([this.t + delay, () => {
        const s = new THREE.Sprite(this.glow.clone());
        const size = 40 + Math.random() * 50;
        s.scale.set(size, size * 0.6, 1);
        s.position.set(px, ground + 6 + Math.random() * 10, pz);
        s.renderOrder = -5;
        g.scene.add(s);
        this.flashes.push({ sprite: s, t: 0, life: 0.18 + Math.random() * 0.25, peak: 0.5 + Math.random() * 0.5 });
      }]);
      const dist = Math.hypot(px - cam.x, pz - cam.z);
      this.pending.push([this.t + delay + dist / SOUND, () => {
        g.audio.play('arty.distant', null, { volume: Math.min(0.5, 120 / dist), throttle: 0.15 });
      }]);
    }
  }

  placeFires() {
    const g = this.game;
    const b = this.bounds;
    const spots = [
      [-(b.x + 90), -b.z * 0.55], [b.x + 120, b.z * 0.25], [b.x * 0.4, -(b.z + 110)],
    ];
    for (const [x, z] of spots) {
      const cx = Math.max(-480, Math.min(480, x));
      const cz = Math.max(-480, Math.min(480, z));
      this.fires.push({ pos: { x: cx, y: g.terrain.heightAt(cx, cz) + 2, z: cz }, size: 2.5 + Math.random(), renew: 0 });
    }
  }
}
