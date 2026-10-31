// What a stack can reach, drawn on the ground for the stacks you're looking at — the selected
// ones in the command view, the one you lead in direct control: a faint white ring at the reach of
// what it fires at anything (mortars and guns: their indirect range; IFVs: the cannon), and a
// fainter one further out where an anti-tank missile reaches vehicles. Either way it only shoots
// at what your side has spotted.
// The special areas show too: light blue for air defence against aircraft (a towed gun's own eyes,
// and faintly the full reach an air search radar gives it), cyan for an air search radar's
// cover and warning range, amber for a counter-battery radar's sector (it turns with the
// vehicle), violet for a jammer's circle, green for where a command post steadies troops.
// What it sees is the lit ground of the fog of war (render/FogOfWar.js).
import * as THREE from 'three';
import { GroundDecal } from '../world/GroundDecal.js';
import { CameraMode } from '../core/CameraManager.js';

const MAX_SHOWN = 10;
const BAND = 0.2;            // half-width of the drawn lines, metres

// not hidden by the ground: the shapes lie on it at every vertex, but between vertices a rise in
// the terrain would cover them and leave holes
const mat = (color, opacity) => new THREE.MeshBasicMaterial({
  color, transparent: true, opacity, depthWrite: false, depthTest: false, toneMapped: false, side: THREE.DoubleSide,
});
const RING = mat(0xffffff, 0.2);
const MISSILE_RING = mat(0xffd9a0, 0.1);
const AIR_RING = mat(0x9fd2ff, 0.22);       // reach against aircraft
const AIR_FAINT = mat(0x9fd2ff, 0.09);
const RADAR_FILL = mat(0x7ff0ff, 0.045);    // an air search radar's cover…
const RADAR_RING = mat(0x7ff0ff, 0.22);
const RADAR_FAINT = mat(0x7ff0ff, 0.08);    // …and its warning range
const CB_FILL = mat(0xffc46a, 0.045);        // counter-battery sector
const CB_EDGE = mat(0xffc46a, 0.25);
const JAM_FILL = mat(0xc49bff, 0.05);       // jammed area
const JAM_EDGE = mat(0xc49bff, 0.25);
const POST_RING = mat(0x9fe08a, 0.22);      // a command post's steadying radius

/** The farthest the stack can hit anything (its guns), and its missiles' reach against vehicles (0: none). */
export function weaponReach(stack) {
  let gun = 0;
  let missile = 0;
  for (let i = 0; i < stack.units.length; i++) {
    const s = stack.unitStats(i);
    gun = Math.max(gun, s.gunRange ?? s.range ?? 0);
    missile = Math.max(missile, s.atgm?.range ?? 0);
  }
  return { gun, missile: missile > gun + 5 ? missile : 0 };
}

/** Flat on XZ; theta 0 points along +z (yaw 0), as GroundDecal.place rotates. */
const flat = (g) => g.rotateX(-Math.PI / 2).rotateY(-Math.PI / 2);

// Every shape is draped over the terrain at its vertices (GroundDecal), so they sit close enough
// together to follow hills: a straight edge between far-apart vertices runs under a rise.
const STEP = 3;      // m between vertices along a ring
const RADIAL = 8;    // m between rings of vertices across a disc

function ringGeometry(r) {
  return flat(new THREE.RingGeometry(r - BAND, r + BAND, Math.min(1440, Math.max(64, Math.round((r * Math.PI * 2) / STEP))), 1));
}

/** A filled disc (or, with `arc`, a sector centred on +z) of radius r. */
function discGeometry(r, arc = Math.PI * 2) {
  const segs = Math.min(720, Math.max(24, Math.round((r * arc) / RADIAL)));
  return flat(new THREE.RingGeometry(0.01, r, segs, Math.max(2, Math.ceil(r / RADIAL)), -arc / 2, arc));
}

/** The sector's outline: its arc and both straight edges. */
function sectorEdge(r, arc) {
  const segs = Math.min(720, Math.max(24, Math.round((r * arc) / STEP)));
  const arcGeo = new THREE.RingGeometry(r - BAND * 2, r + BAND * 2, segs, 1, -arc / 2, arc);
  const pos = [...arcGeo.attributes.position.array];
  const idx = [...arcGeo.index.array];
  for (const a of [-arc / 2, arc / 2]) { // the two radial edges as strips of short quads
    const c = Math.cos(a), sn = Math.sin(a), nx = -sn * BAND * 2, ny = c * BAND * 2;
    const n = Math.max(2, Math.ceil(r / STEP));
    const base = pos.length / 3;
    for (let i = 0; i <= n; i++) {
      const d = (r * i) / n;
      pos.push(c * d + nx, sn * d + ny, 0, c * d - nx, sn * d - ny, 0);
      if (i < n) { const k = base + i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return flat(g);
}

/** The special areas of a stack: [geometry, material, turns with the vehicle?]. */
function areas(stack) {
  const s = stack.stats;
  const out = [];
  const aa = s.antiAir ?? stack.type.specialist?.stats.antiAir;
  if (aa) {
    if (aa.optical) { out.push([ringGeometry(aa.range * aa.optical), AIR_RING]); out.push([ringGeometry(aa.range), AIR_FAINT]); }
    else out.push([ringGeometry(aa.range), AIR_RING]);
  }
  if (s.airRadar) { out.push([discGeometry(s.airRadar.cover), RADAR_FILL]); out.push([ringGeometry(s.airRadar.cover), RADAR_RING]); out.push([ringGeometry(s.airRadar.detect), RADAR_FAINT]); }
  if (s.cbRadar) { out.push([discGeometry(s.cbRadar.range, s.cbRadar.arc), CB_FILL, true]); out.push([sectorEdge(s.cbRadar.range, s.cbRadar.arc), CB_EDGE, true]); }
  if (s.jammer) { out.push([discGeometry(s.jammer.radius), JAM_FILL]); out.push([ringGeometry(s.jammer.radius), JAM_EDGE]); }
  if (s.commandPost) out.push([ringGeometry(s.commandPost.lead), POST_RING]);
  return out;
}

export class RangeIndicators {
  constructor(game) {
    this.game = game;
    this.items = new Map(); // stack → { ring, missile?, x, z }
  }

  shown() {
    const g = this.game;
    if (g.ended) return [];
    if (g.cameraManager.mode === CameraMode.ACTION) {
      const s = g.player.unit?.stack;
      return s?.alive ? [s] : [];
    }
    return [...g.commands.selected].filter((s) => s.alive).slice(0, MAX_SHOWN);
  }

  update() {
    const show = new Set(this.shown());
    for (const [s, item] of this.items) if (!show.has(s)) this.remove(s, item);
    for (const s of show) {
      const item = this.items.get(s) ?? this.create(s);
      const { x, z } = s.centroid;
      const yaw = s.units[0]?.yaw ?? 0;
      if (Math.abs(x - item.x) + Math.abs(z - item.z) > 0.3 || Math.abs(yaw - item.yaw) > 0.02) {
        item.ring.place(x, z);
        item.missile?.place(x, z);
        for (const a of item.areas) a.decal.place(x, z, 1, a.turns ? yaw : 0);
        item.x = x;
        item.z = z;
        item.yaw = yaw;
      }
    }
  }

  create(s) {
    const g = this.game;
    const reach = weaponReach(s);
    const item = { ring: new GroundDecal(ringGeometry(Math.max(1, reach.gun)), RING, g.terrain, 0.25), x: Infinity, z: Infinity, yaw: Infinity };
    item.ring.mesh.visible = reach.gun > 1; // unarmed: no weapon ring
    if (reach.missile) item.missile = new GroundDecal(ringGeometry(reach.missile), MISSILE_RING, g.terrain, 0.25);
    item.areas = areas(s).map(([geo, m, turns]) => ({ decal: new GroundDecal(geo, m, g.terrain, 0.25), turns: !!turns }));
    for (const d of [item.ring, item.missile, ...item.areas.map((a) => a.decal)]) if (d) g.scene.add(d.mesh);
    this.items.set(s, item);
    return item;
  }

  remove(s, item) {
    for (const d of [item.ring, item.missile, ...item.areas.map((a) => a.decal)]) {
      if (!d) continue;
      d.mesh.removeFromParent();
      d.geometry.dispose();
    }
    this.items.delete(s);
  }
}
