// The deployment phase (campaign battles, alone or in co-op): the battle opens with the clock stopped. You place
// your stacks on the field — select one and click where it should stand, and it is there at once,
// every man or vehicle in its slot — anywhere inside your deployment zone: your side of a gold line
// just ahead of where your forces start. Pull back out of contact, spread out, mass on a flank,
// then Start battle (the bar's button, Space or Enter). Until then the simulation doesn't step at
// all (mode timers, the AI, fire): only the camera, selection and orders, the HUD and the fog of
// war run (GameEngine.stepWaiting, plus the renderers of the stacks you place).
// Co-op: the host runs the guest's placements and shows them to it (NetHost.deploySnapshot); the
// battle starts once both have pressed Start (deploy-ready → deploy-go).
import * as THREE from 'three';
import { enemyOf } from '../data/factions.js';
import { GroundDecal } from '../world/GroundDecal.js';

const AHEAD = 30;        // m: the zone reaches this far past your most forward stack at the start

export class Deployment {
  constructor(game) {
    this.game = game;
    this.on = false;
    this.bar = document.createElement('div');
    this.bar.id = 'deploy-bar';
    this.bar.hidden = true;
    this.bar.innerHTML = '<span class="dp-title">Deployment</span><span class="dp-text">Place your stacks: select one and click where it should stand, anywhere behind the gold line.</span><button type="button" tabindex="-1" class="deploy dp-go">Start battle</button>';
    this.bar.querySelector('.dp-go').addEventListener('click', (e) => { e.currentTarget.blur(); this.start(); });
    document.getElementById('hud')?.append(this.bar);
  }

  /** The opening: the clock stopped, the zone drawn. */
  begin() {
    const g = this.game;
    const f = g.playerFaction;
    if (!g.world.bases[f] || !g.world.bases[enemyOf(f)]) return;
    // each side's own zone (versus: the guest's placements run here too, in its zone, not ours)
    this.zones = {};
    for (const side of [f, enemyOf(f)]) {
      const base = g.world.bases[side];
      const foe = g.world.bases[enemyOf(side)];
      const d = new THREE.Vector2(foe.x - base.x, foe.z - base.z);
      const len = d.length() || 1;
      d.divideScalar(len);
      const t = (p) => (p.x - base.x) * d.x + (p.z - base.z) * d.y;
      const mine = g.world.stacksOf(side).filter((s) => !s.stats.structure);
      const limit = (mine.length ? Math.max(...mine.map((s) => t(s.anchor))) : len * 0.35) + AHEAD;
      this.zones[side] = { base, d, limit, t };
    }
    this.zone = this.zones[f];
    const { base, d, limit } = this.zone;
    if (g.mode?.deployText) this.bar.querySelector('.dp-text').textContent = g.mode.deployText;
    // the front edge of the zone, a gold line across the field
    const span = Math.max(g.world.bounds.x, g.world.bounds.z) * 3;
    const geo = new THREE.PlaneGeometry(span, 1.6, 400, 1).rotateX(-Math.PI / 2);
    this.edge = new GroundDecal(geo, new THREE.MeshBasicMaterial({ color: 0xffc35a, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false }), g.commands?.surface ?? g.terrain, 0.25); // (at sea: on the water)
    this.edge.place(base.x + d.x * limit, base.z + d.y * limit, 1, Math.atan2(-d.x, -d.y));
    g.scene.add(this.edge.mesh);
    this.on = true;
    this.ready = { host: false, guest: false };
    this.bar.hidden = false;
  }

  /** Start battle (the button, Space, Enter) — in co-op, once the other player is ready too. */
  start() {
    if (!this.on) return;
    const net = this.game.net;
    if (!net) return this.go();
    this.bar.querySelector('.dp-text').textContent = 'Ready — waiting for the other player to start…';
    this.bar.querySelector('.dp-go').disabled = true;
    if (net.isClient) net.link.send({ k: 'deploy-ready' });
    else { this.ready.host = true; this.maybeGo(); }
  }

  /** Co-op host: both ready → the battle begins for both. */
  maybeGo() {
    if (!this.on || !this.ready.host || !this.ready.guest) return;
    this.game.net.link.send({ k: 'deploy-go', t: this.game.time });
    this.go();
  }

  /** The clock runs. */
  go() {
    if (!this.on) return;
    this.on = false;
    this.bar.hidden = true;
    this.edge?.mesh.removeFromParent();
    this.edge?.geometry.dispose();
    this.game.bus.emit('toast', 'The battle begins');
    this.game.bus.emit('deploy:go'); // (a pitched battle: the buying is over, modes/pitched.js)
  }

  /** A frame while deploying: what the player needs to look and place, nothing that moves the battle. */
  step(dt) {
    const g = this.game;
    if (g.net?.isHost) g.net.deploySnapshot(dt); // the guest's placements run here, and it sees them
    g.world.refresh();
    g.visibility?.update(dt);
    for (const s of g.world.stacks) s.renderer.update(0, g.time);
    g.frontlineHud?.update(); // (the CP and the forces while you buy: a pitched battle)
    g.stepWaiting(dt);
  }

  /** Put `s` at (x, z), facing the enemy (or `face`) — pulled back onto your side of the line if it was past it. */
  place(s, x, z, face = null) {
    const { base, d, limit, t } = this.zones?.[s.faction] ?? this.zone;
    const over = t({ x, z }) - limit;
    if (over > 0) { x -= d.x * over; z -= d.y * over; }
    const p = this.game.world.clampToBounds({ x, z });
    const dry = this.game.world.river ? this.game.world.river.dry(p) : p;
    s.placeAt(dry.x, dry.z, face ?? Math.atan2(base.x + d.x * 1e4 - dry.x, base.z + d.y * 1e4 - dry.z));
  }
}
