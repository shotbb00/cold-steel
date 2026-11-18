// What the player sees while placing a support power or a fire order (systems/CommandSystem.js targeting): the
// power's true footprint on the ground, in its own colour — a run strip, a bomb carpet as wide as the flight, a
// creeping barrage's belt and how far it walks, a gas cloud and where the wind takes it, the circle a strike
// looks for its ship in, a search swath, a patrol ring. Built from a few shapes (the kit below), draped over
// the ground (world/GroundDecal.js), turned by the approach — the way it really comes: from the runway or
// deck it takes off from (fixed), else as Q/E set it.
import * as THREE from 'three';
import { GroundDecal } from '../world/GroundDecal.js';
import { KINDS, airType } from '../systems/AirStrike.js';
import { barrageOf } from '../systems/Barrage.js';
import { enemyOf } from '../data/factions.js';
import { epoch } from '../data/epoch.js';
import { wind } from '../world/Wind.js';

// one colour per kind of thing
export const MARK = { air: 0xff6a3d, fire: 0xff9a3c, gas: 0xc8c46a, smoke: 0xeceae4, recon: 0x6cc8ff, troops: 0xffc35a, works: 0xffd27a };
const FILL = 0.22, LINE = 0.85;

// ---------------------------------------------------------------- the kit (local metres: +z the approach, +x across)
const rect = (x0, x1, z0, z1) => { const s = new THREE.Shape(); s.moveTo(x0, z0); s.lineTo(x1, z0); s.lineTo(x1, z1); s.lineTo(x0, z1); s.closePath(); return s; };
/** An outline: the four sides of a rectangle `w` wide. */
const frame = (x0, x1, z0, z1, w = 1.2) => [rect(x0, x1, z0, z0 + w), rect(x0, x1, z1 - w, z1), rect(x0, x0 + w, z0, z1), rect(x1 - w, x1, z0, z1)];
const ring = (r, w = 1.5, cx = 0, cz = 0) => { const s = new THREE.Shape(); s.absarc(cx, cz, r + w / 2, 0, Math.PI * 2, false); const h = new THREE.Path(); h.absarc(cx, cz, Math.max(0.1, r - w / 2), 0, Math.PI * 2, true); s.holes.push(h); return [s]; };
const disc = (r, cx = 0, cz = 0) => { const s = new THREE.Shape(); s.absarc(cx, cz, r, 0, Math.PI * 2, false); return [s]; };
/** A dashed circle: how far from the spot it looks for its target. */
const dashed = (r, w = 1.5, n = Math.max(16, Math.round(r / 6))) => Array.from({ length: n }, (_, i) => {
  const a0 = (i / n) * Math.PI * 2, a1 = a0 + (Math.PI / n);
  const s = new THREE.Shape(); s.absarc(0, 0, r + w / 2, a0, a1, false); s.absarc(0, 0, r - w / 2, a1, a0, true); return s;
});
/** An arrow from z0 to z1 (its head at z1), `w` wide. */
const arrow = (z0, z1, w = 2, head = Math.max(6, w * 3)) => {
  const s = new THREE.Shape(), d = Math.sign(z1 - z0) || 1, hz = z1 - d * head * 1.4;
  s.moveTo(-w / 2, z0); s.lineTo(w / 2, z0); s.lineTo(w / 2, hz); s.lineTo(head, hz); s.lineTo(0, z1); s.lineTo(-head, hz); s.lineTo(-w / 2, hz); s.closePath();
  return [s];
};
/** Area fire: a faint fill and its rim. */
const area = (r, color) => [{ shapes: disc(r), color, opacity: FILL }, { shapes: ring(r, Math.max(2, r * 0.04)), color, opacity: LINE }];
/** A strip of ground hit along the run: faint fill, outline. */
const band = (w, z0, z1, color, fill = FILL) => [{ shapes: [rect(-w / 2, w / 2, z0, z1)], color, opacity: fill }, { shapes: frame(-w / 2, w / 2, z0, z1, Math.max(2, w * 0.03)), color, opacity: LINE }];

// ---------------------------------------------------------------- what each power covers

/** The base a flight of `kind` takes off from (null: in from the map edge, turned as you like) — the one AirStrike.call would pick. */
function launchBase(game, faction, kind, fromId, p) {
  const type = airType(kind, faction, game.armyOf(faction));
  if (type?.rotorSound) return null; // (helicopters come round on whatever heading you give them)
  if (!game.air.based(faction, kind)) return null;
  const bases = game.world.basesOf(faction).filter((s) => (game.air.hangar(s.units[0])[kind] ?? 0) > 0);
  const b = bases.find((s) => s.id === fromId) ?? bases.sort((a, c) => Math.hypot(a.centroid.x - p.x, a.centroid.z - p.z) - Math.hypot(c.centroid.x - p.x, c.centroid.z - p.z))[0];
  return b ?? null;
}

/** The flight's numbers as it will fly them (a war's own aircraft: their own `flight`). */
export function flightOf(game, faction, kind) {
  const type = airType(kind, faction, game.armyOf(faction));
  return type?.flight ? { ...KINDS[kind], ...type.flight } : KINDS[kind];
}

/** Does the run's heading follow Q/E (false: it comes the way it must — from its runway or deck, or a circle)? */
export function turnable(game, faction, t) {
  if (t.kind === 'air') { const p = flightOf(game, faction, t.air); return !p.orbit && !launchBase(game, faction, t.air, t.from, { x: 0, z: 0 }); }
  return t.kind === 'build';
}

/**
 * The marker for targeting `t` at ground point `at`: { key, parts: [{ shapes, color, opacity }], x, z, yaw, note }.
 * `key` changes when the shapes must be built again (a lane's length); otherwise only x, z, yaw move.
 */
export function markerSpec(game, faction, t, at) {
  const g = game, foe = enemyOf(faction), eb = g.world.bases?.[foe], ob = g.world.bases?.[faction];
  const toward = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  const spec = { key: 'static', parts: [], x: at.x, z: at.z, yaw: 0 };
  if (t.kind === 'air') {
    const p = flightOf(g, faction, t.air), k = t.air;
    const base = launchBase(g, faction, k, t.from, at);
    spec.yaw = base ? toward(base.centroid, at) : (t.yaw ?? t.autoYaw ?? 0);
    spec.key = `air:${k}`;
    spec.from = base?.name ?? null;
    if (p.orbit) { // a patrol circle (fighters) — with a radar picture's reach round it; its centre kept `orbit` in from the edges, as the call does
      spec.yaw = 0;
      const bb = g.map.bounds ?? { x: 1e4, z: 1e4 }, cx = Math.max(0, bb.x - p.orbit), cz = Math.max(0, bb.z - p.orbit);
      spec.x = Math.max(-cx, Math.min(cx, at.x)); spec.z = Math.max(-cz, Math.min(cz, at.z));
      if (p.picture) spec.parts.push({ shapes: disc(p.picture), color: MARK.recon, opacity: 0.08 }, { shapes: ring(p.picture, 6), color: MARK.recon, opacity: 0.5 });
      spec.parts.push({ shapes: ring(p.orbit, 4), color: p.picture ? MARK.recon : MARK.air, opacity: 0.7 });
      if (p.aam?.range) spec.parts.push({ shapes: dashed(p.aam.range, 3), color: MARK.air, opacity: 0.35 }); // (how far their missiles reach)
      return spec;
    }
    if (p.swath) { // a search run: the band its cameras or buoys take in
      const L = (p.runLength || 900) / 2;
      spec.parts.push(...band(p.swath * 2, -L, L, MARK.recon, 0.1), { shapes: arrow(-L * 0.4, L * 0.4, Math.max(4, p.swath * 0.05), Math.max(10, p.swath * 0.15)), color: MARK.recon, opacity: LINE });
      return spec;
    }
    if (p.bombs) { // a carpet as wide as the flight lays it (Sortie.bomb: the wingmen ±14 × spread, each bomb ±7 × spread across)
      const s = p.spread ?? 1, W = ((p.flight ?? 1) > 1 ? 28 : 0) * s + 14 * s, L = p.runLength / 2;
      spec.parts.push(...band(W, -L, L, MARK.air, 0.2), { shapes: arrow(-L - 120, -L - 10, 3), color: MARK.air, opacity: LINE });
      return spec;
    }
    if (p.sea || k === 'coastStrike') { // a strike on a ship: whichever is nearest the spot, within this
      const r = p.asmStrike ? 900 : 450; // (as Sortie: a missile strike looks further)
      spec.parts.push({ shapes: dashed(r, 3), color: MARK.air, opacity: 0.7 }, { shapes: disc(6), color: MARK.air, opacity: 0.8 }, { shapes: arrow(-r - 220, -r - 20, 4), color: MARK.air, opacity: 0.6 });
      return spec;
    }
    if (k === 'lift') { // the landing zone — 1945: the stick of paratroopers along the track, 24 m short of the spot
      const L = 60;
      if (epoch() === '1945') spec.parts.push(...band(12, -50, 4, MARK.troops, 0.22));
      else spec.parts.push({ shapes: ring(10, 2), color: MARK.troops, opacity: 0.85 }, { shapes: disc(10), color: MARK.troops, opacity: FILL });
      spec.parts.push({ shapes: arrow(-L - 40, -14, 3), color: MARK.air, opacity: 0.7 });
      return spec;
    }
    // a gun or rocket run: the line it walks, as wide as its rounds land
    const L = (p.runLength || 60) / 2, W = k === 'heli' ? 18 : 10;
    spec.parts.push(...band(W, -L, L, MARK.air, 0.2), { shapes: arrow(-L - 60, -L - 4, 3), color: MARK.air, opacity: LINE });
    return spec;
  }
  if (t.kind === 'engineer') {
    if (t.lineCharge) { // the lane it blows, from the vehicle to the spot
      const s = t.stack.centroid, len = Math.max(25, Math.min(t.stack.stats.lineCharge.range, Math.hypot(at.x - s.x, at.z - s.z)));
      spec.x = s.x; spec.z = s.z; spec.yaw = toward(s, at); spec.key = `lane:${Math.round(len / 2)}`;
      spec.parts.push(...band(7, 0, len, MARK.works, 0.25));
      return spec;
    }
    const bridge = g.map.bridgeAt?.(at.x, at.z);
    if (bridge && !bridge.blown) { spec.x = bridge.x; spec.z = bridge.z; spec.parts.push({ shapes: ring(7, 1), color: MARK.works, opacity: LINE }); spec.key = 'bridge'; return spec; }
    spec.parts.push({ shapes: ring(9, 1), color: MARK.works, opacity: LINE });
    return spec;
  }
  // ---- 'smoke': the powers, the barrages, gas, the units' fire orders
  if (t.tunnel) { // the cave mouth it would come out at: the nearest to the cursor (systems/Caves.js)
    const k = g.caves?.mouthNear(at, 60) ?? -1, m = k >= 0 ? g.caves.list[k] : null;
    if (m) { spec.x = m.x; spec.z = m.z; }
    spec.key = `tunnel:${!!m}`;
    spec.parts.push({ shapes: ring(10, 2.5), color: m ? MARK.troops : MARK.smoke, opacity: 0.85 }, { shapes: disc(10), color: MARK.troops, opacity: m ? 0.2 : 0.05 });
    return spec;
  }
  if (t.power) {
    const k = t.power;
    spec.key = `power:${k}`;
    if (k === 'battery') { spec.parts.push(...area(25, MARK.fire)); return spec; }
    if (k === 'monitors') { spec.parts.push(...area(55, MARK.fire)); return spec; }
    if (k === 'starShell') { spec.parts.push(...area(300, MARK.smoke)); return spec; }
    if (k === 'smokeScreen') { // a line of seven clouds across the way in, 24 m apart
      spec.yaw = ob ? toward(ob, at) : 0;
      spec.parts.push(...band(3 * 24 * 2 + 40, -20, 20, MARK.smoke, 0.3)); // (across the approach: the band's width is its length)
      return spec;
    }
    if (k === 'reserve') { // the cavalry: the enemy nearest the spot within 150 m, ridden at from the nearer edge
      const from = g.powers?.entryFor?.(faction, at) ?? ob;
      const d = from ? Math.hypot(at.x - from.x, at.z - from.z) : 100;
      spec.yaw = from ? toward(from, at) : 0; spec.key = `reserve:${Math.round(d / 10)}`;
      spec.parts.push({ shapes: dashed(150, 2.5), color: MARK.troops, opacity: 0.75 }, { shapes: arrow(-d, -150, 4), color: MARK.troops, opacity: 0.5 });
      return spec;
    }
    if (k === 'guard' || k === 'squadron') { // marching (sailing) up from the base to the spot
      const r = k === 'guard' ? 9 : 100, d = ob ? Math.hypot(at.x - ob.x, at.z - ob.z) : 100;
      spec.yaw = ob ? toward(ob, at) : 0; spec.key = `${k}:${Math.round(d / 10)}`;
      spec.parts.push({ shapes: ring(r, 2), color: MARK.troops, opacity: 0.8 }, { shapes: disc(r), color: MARK.troops, opacity: FILL }, { shapes: arrow(-d + 20, -r - 2, 3), color: MARK.troops, opacity: 0.4 });
      return spec;
    }
    if (k === 'fireship') { // down the wind from 700 m upwind
      spec.yaw = Math.atan2(wind.x, wind.z);
      spec.parts.push({ shapes: ring(20, 2), color: MARK.fire, opacity: LINE }, { shapes: arrow(-700, -22, 4), color: MARK.fire, opacity: 0.45 });
      return spec;
    }
    spec.parts.push(...area(10, MARK.troops));
    return spec;
  }
  if (t.barrage) {
    const b = barrageOf(g, faction);
    if (b?.id === 'creep') { // a belt across, walking toward the enemy: a tick at each step
      spec.yaw = eb ? toward(at, eb) : 0;
      const end = (b.steps - 1) * b.step + b.depth / 2;
      spec.parts.push(...band(b.width, -b.depth / 2, b.depth / 2, MARK.fire, 0.28));
      spec.parts.push({ shapes: Array.from({ length: b.steps - 1 }, (_, i) => rect(-b.width / 2, b.width / 2, (i + 1) * b.step + b.depth / 2 - 0.8, (i + 1) * b.step + b.depth / 2)), color: MARK.fire, opacity: 0.35 });
      spec.parts.push({ shapes: arrow(b.depth / 2 + 4, end + 12, 3), color: MARK.fire, opacity: LINE });
      return spec;
    }
    spec.parts.push(...area(b?.radius ?? 40, MARK.fire)); // (the mass barrage's sector; Time on Target: the guns' scatter)
    return spec;
  }
  if (t.walze) { // the guns' aim point walks 12 m × 8 toward the enemy
    spec.yaw = eb ? toward(at, eb) : 0;
    spec.parts.push(...area(18, MARK.fire), ...band(36, 0, 96, MARK.fire, 0.1), { shapes: arrow(20, 110, 3), color: MARK.fire, opacity: LINE });
    return spec;
  }
  if (t.gas) { // six shells within 26 m, clouds of 13 m — and where the wind takes them in 75 s
    const drift = Math.hypot(wind.x, wind.z) * 0.5 * 75;
    spec.yaw = Math.atan2(wind.x, wind.z);
    spec.parts.push(...area(39, MARK.gas), { shapes: [rect(-39, 39, 0, drift)], color: MARK.gas, opacity: 0.1 }, { shapes: arrow(10, drift + 39, 3), color: MARK.gas, opacity: 0.6 });
    return spec;
  }
  const ships = (t.stacks ?? []).some((s) => s.stats.naval);
  if (t.fire === 'salvo') { spec.parts.push(...area(15, MARK.fire)); return spec; }
  if (t.fire === 'area') { spec.parts.push(...area(25, MARK.fire)); return spec; }
  if (t.fire === 'helo') { spec.parts.push({ shapes: ring(120, 2.5), color: MARK.recon, opacity: 0.7 }, { shapes: disc(5), color: MARK.recon, opacity: 0.8 }); return spec; }
  if (t.fire === 'board') { spec.parts.push({ shapes: dashed(150, 2.5), color: MARK.troops, opacity: 0.75 }); return spec; }
  if (t.fire === 'missile') { spec.parts.push({ shapes: dashed(600, 4), color: MARK.fire, opacity: 0.7 }, { shapes: disc(8), color: MARK.fire, opacity: 0.8 }); return spec; }
  if (t.flare) { spec.parts.push(...area(ships ? 450 : 110, MARK.smoke)); return spec; }
  spec.parts.push(...area(10, MARK.smoke)); // smoke: the screen
  return spec;
}

// ---------------------------------------------------------------- on the ground

/**
 * The geometry cut into triangles no longer than about a fortieth of its size (4 m at least): a draped
 * decal follows the ground only at its corners, and a 400 m carpet of two triangles sinks into every hill.
 */
function fine(geo) {
  const src = (geo.index ? geo.toNonIndexed() : geo).attributes.position.array;
  geo.computeBoundingBox();
  const bb = geo.boundingBox, size = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
  const max = Math.max(4, size / 40), max2 = max * max, out = [];
  const split = (a, b, c, depth) => {
    const ab = (a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2, bc = (b[0] - c[0]) ** 2 + (b[2] - c[2]) ** 2, ca = (c[0] - a[0]) ** 2 + (c[2] - a[2]) ** 2;
    const m = Math.max(ab, bc, ca);
    if (m <= max2 || depth > 14) { out.push(...a, ...b, ...c); return; }
    const mid = (p, q) => [(p[0] + q[0]) / 2, 0, (p[2] + q[2]) / 2];
    if (m === ab) { const d = mid(a, b); split(a, d, c, depth + 1); split(d, b, c, depth + 1); }
    else if (m === bc) { const d = mid(b, c); split(a, b, d, depth + 1); split(a, d, c, depth + 1); }
    else { const d = mid(c, a); split(a, b, d, depth + 1); split(d, b, c, depth + 1); }
  };
  for (let i = 0; i < src.length; i += 9) split([src[i], 0, src[i + 2]], [src[i + 3], 0, src[i + 5]], [src[i + 6], 0, src[i + 8]], 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  geo.dispose();
  return g;
}

/** The draped decals of a spec, in one group: `place(spec)` moves them, `dispose()` frees them. */
export class TargetMarker {
  constructor(surface, dim = 1) { // (dim: a placed one's fainter copy — PendingMarkers)
    this.surface = surface;
    this.dim = dim;
    this.group = new THREE.Group();
    this.decals = [];
    this.key = null;
  }

  build(spec) {
    this.clear();
    this.key = spec.key;
    for (const part of spec.parts) {
      if (!part.shapes.length) continue;
      const geo = fine(new THREE.ShapeGeometry(part.shapes, 24).rotateX(Math.PI / 2)); // (shape y → +z: the approach; small triangles, so it follows the ground)
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(part.color).multiplyScalar(part.opacity < 0.3 ? 1 : 1.4), transparent: true, opacity: part.opacity * this.dim, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide }); // (no haze: readable from high up)
      const d = new GroundDecal(geo, mat, this.surface, 0.3 + this.decals.length * 0.02);
      d.mesh.renderOrder = 2 + this.decals.length;
      this.decals.push(d);
      this.group.add(d.mesh);
    }
  }

  place(spec) {
    if (spec.key !== this.key) this.build(spec);
    for (const d of this.decals) d.place(spec.x, spec.z, 1, spec.yaw);
  }

  clear() {
    for (const d of this.decals) { d.mesh.removeFromParent(); d.geometry.dispose(); d.mesh.material.dispose(); }
    this.decals = [];
  }
}

// ---------------------------------------------------------------- after it is placed

/**
 * What you called stays on the map (marker plan step 2): a fainter copy of its footprint until it is over, and a
 * tag over it — the power's icon and the time to the first bomb or shell, then 'now'. A creeping barrage's belt
 * moves forward with the shells. Each entry knows when it ends: the sortie that flies it leaves the run, the
 * barrage's time runs out, or (what the client cannot see) a set time.
 *   add(t, at, follow) — `follow()`: { impactAt, over, x?, z? } each frame (null: over)
 */
export class PendingMarkers {
  constructor(game, surface) {
    this.game = game;
    this.surface = surface;
    this.list = [];
  }

  add(t, at, icon, follow) {
    const g = this.game, spec = markerSpec(g, g.playerFaction, t, at);
    const m = new TargetMarker(this.surface, 0.5);
    m.place(spec);
    g.scene.add(m.group);
    const el = document.createElement('div');
    el.className = 'pend-tag';
    el.innerHTML = `${icon}<span></span>`;
    document.body.appendChild(el);
    this.list.push({ m, spec, el, text: el.querySelector('span'), follow, x0: spec.x, z0: spec.z });
  }

  update() {
    const g = this.game, now = g.time, cam = g.camera, r = g.canvas.getBoundingClientRect();
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i], f = e.follow();
      if (!f) { e.m.clear(); e.m.group.removeFromParent(); e.el.remove(); this.list.splice(i, 1); continue; }
      if (f.x != null) { e.spec.x = f.x; e.spec.z = f.z; e.m.place(e.spec); } // (the belt walking on)
      const left = Math.ceil(f.impactAt - now), txt = left > 0 ? `${left} s` : 'now';
      if (e.text.textContent !== txt) e.text.textContent = txt;
      _t.set(e.spec.x, g.terrain.heightAt(e.spec.x, e.spec.z) + 6, e.spec.z).project(cam);
      const off = _t.z > 1 || Math.abs(_t.x) > 1.1 || Math.abs(_t.y) > 1.1;
      e.el.hidden = off;
      if (!off) e.el.style.transform = `translate(${r.left + (_t.x + 1) / 2 * r.width}px, ${r.top + (1 - _t.y) / 2 * r.height}px) translate(-50%, -100%)`;
    }
  }
}
const _t = new THREE.Vector3();
