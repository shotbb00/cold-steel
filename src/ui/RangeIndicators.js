// What a stack can reach, drawn on the ground for the stacks you're looking at — the selected
// ones in the command view, the one you lead in direct control: a ring per weapon (`weapons`),
// coloured by what it is for — white the main gun against armour, orange anti-tank missiles and
// rockets, green machine guns, autocannon and rifles against men, dashed grey the indirect fire of
// mortars and guns (their nearest and farthest), dashed violet the drones' reach — each with its
// name and range on the edge toward you, and a faint fill out to where it still hits well (the
// spread grows with the distance: UnitStack, `1 + d / range`). One or two stacks: all of it; more:
// the main ring each, no names. Either way it only shoots at what your side has spotted.
// The special areas show too: light blue for air defence against aircraft (a towed gun's own eyes,
// and faintly the full reach an air search radar gives it), cyan for an air search radar's
// cover and warning range, amber for a counter-battery radar's sector (it turns with the
// vehicle), violet for a jammer's circle, green for where a command post steadies troops.
// What it sees is the lit ground of the fog of war (render/FogOfWar.js).
import * as THREE from 'three';
import { GroundDecal } from '../world/GroundDecal.js';
import { CameraMode } from '../core/CameraManager.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LAW } from '../entities/UnitStack.js';

const MAX_SHOWN = 10;
const BAND = 0.2;            // half-width of the drawn lines, metres

// not hidden by the ground: the shapes lie on it at every vertex, but between vertices a rise in
// the terrain would cover them and leave holes
const mat = (color, opacity) => new THREE.MeshBasicMaterial({
  color, transparent: true, opacity, depthWrite: false, depthTest: false, toneMapped: false, side: THREE.DoubleSide,
});
// what each weapon is for (`weapons`): its ring, its faint fill out to where it hits well, the label's colour
const ROLE = {
  armour: { ring: mat(0xffffff, 0.45), fill: mat(0xffffff, 0.035), css: '#ffffff' },
  missile: { ring: mat(0xffb060, 0.45), fill: mat(0xffb060, 0.03), css: '#ffb060' },
  men: { ring: mat(0x8fe07a, 0.45), fill: mat(0x8fe07a, 0.035), css: '#8fe07a' },
  indirect: { ring: mat(0xc8ccd0, 0.35), fill: null, css: '#c8ccd0', dashed: true },
  drone: { ring: mat(0xc49bff, 0.4), fill: null, css: '#c49bff', dashed: true },
  ssm: { ring: mat(0xff6a5a, 0.45), fill: null, css: '#ff6a5a' }, // (a ship's anti-ship missiles)
};
const EFFECTIVE = 0.6; // of the reach: where the spread is still small (1.6x at most)
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

/** The `i`th part of the weapon line of the stack's own variant ('25 mm M242 Bushmaster · TOW'), short. */
function weaponName(stack, i) {
  const v = stack.type.variants?.[stack.army] ?? stack.type.variants?.[stack.faction];
  const part = (v?.weapon ?? '').split('·')[i]?.split(',')[0]?.trim();
  return part && part.length <= 26 ? part : null;
}

/**
 * Each weapon of the stack, farthest of its men: { role, range, min?, name, vs } — the main weapon, the missile, a
 * tank's machine gun, the squad's anti-tank rockets, the drones. The main one first.
 */
export function weapons(stack) {
  const out = [];
  const add = (w) => { if (w.range > 1 && !out.some((o) => o.role === w.role && Math.abs(o.range - w.range) < 6)) out.push(w); };
  // the team's weapon: the mortar or the gun, else the cannon or launcher, else the longest reach — whoever carries it (a
  // mortar team's or MG team's specialists, a Javelin team's own stats); the rest of the men are its riflemen
  const all = [stack.stats, ...stack.units.map((_, i) => stack.unitStats(i))].filter((s) => s.damage > 0 || s.drone);
  const heavy = (s) => s.weapon === 'cannon' || s.weapon === 'rocket' || s.weapon === 'autocannon';
  const s0 = all.find((s) => s.indirect || s.weapon === 'artillery') ?? all.find(heavy) ?? all.reduce((a, s) => ((s.range ?? 0) > (a.range ?? 0) ? s : a), stack.stats);
  let atgm = null, side = 0, law = 0, rifles = 0;
  const min = s0.minRange ?? 0;
  for (const s of all) {
    if (s.atgm?.range > (atgm?.range ?? 0)) atgm = s.atgm;
    for (const g of s.sideGuns ?? []) side = Math.max(side, g.range ?? 0);
    if (s.lightAT > 0) law = LAW.range;
    if (s.weapon !== s0.weapon && s.damage > 0 && !s.indirect && s.weapon !== 'artillery') rifles = Math.max(rifles, s.range ?? 0);
  }
  const D = stack.stats.drone ?? s0.drone;
  if (stack.stats.naval) return shipWeapons(stack, add, out);
  if (s0.structure) return out; // (forts: nothing here)
  const w = s0.weapon, main = s0.gunRange ?? s0.range ?? 0, own = !D && weaponName(stack, 0); // (a drone team's weapon line names its drones)
  if (s0.indirect || w === 'artillery') add({ role: 'indirect', range: main, min, name: own || (w === 'artillery' ? 'Guns' : 'Mortar'), vs: 'indirect, at what is spotted' });
  else if (s0.damage > 0) {
    const role = w === 'cannon' ? 'armour' : w === 'rocket' ? 'missile' : 'men';
    add({ role, range: main, name: own || (w === 'cannon' ? 'Main gun' : w === 'autocannon' ? 'Cannon' : w === 'rocket' ? 'Rockets' : 'Rifles'), vs: role !== 'men' ? 'vs armour' : w === 'autocannon' ? 'vs men, light vehicles' : 'vs men' });
  }
  if (rifles && Math.abs(rifles - main) > 5) add({ role: 'men', range: rifles, name: 'Rifles', vs: 'vs men' });
  if (atgm) add({ role: 'missile', range: atgm.range, name: weaponName(stack, 1) ?? 'ATGM', vs: 'vs armour' });
  if (side) add({ role: 'men', range: side, name: 'MG', vs: 'vs men' });
  if (law) add({ role: 'missile', range: law, name: 'AT rockets', vs: 'vs armour, close' });
  if (D?.range && D.kind !== 'usv') add({ role: 'drone', range: D.range, name: D.kind === 'recon' ? 'Recon drone' : D.kind === 'fpv' ? 'FPV drones' : 'Loitering munitions', vs: D.kind === 'recon' ? 'finds them' : 'vs what is spotted' });
  return out;
}
/** A ship's weapons, from her mounts (data/units45/ships.js, ships85.js): main guns, secondaries, torpedoes, missiles, ASW. */
function shipWeapons(stack, add, out) {
  const st = stack.stats, mounts = stack.type.mounts?.[stack.army] ?? stack.type.mounts?.[stack.faction] ?? [];
  const mounted = mounts.filter((m) => !m.missile && !m.torpedo).map((m) => m.range ?? 0).filter((r) => r > 1); // (her turrets: `stats.range` is her longest reach, missiles too)
  const guns = [...new Set(mounted.length ? mounted : st.damage > 0 && st.range > 1 ? [st.range] : [])].sort((a, b) => b - a);
  if (guns[0]) add({ role: 'armour', range: guns[0], name: 'Main guns', vs: 'vs ships' });
  if (guns.length > 1 && guns[0] - guns.at(-1) > 150) add({ role: 'men', range: guns.at(-1), name: 'Secondary guns', vs: 'vs light craft' });
  const most = (f) => mounts.filter(f).reduce((a, m) => ((m.range ?? 0) > (a?.range ?? 0) ? m : a), null);
  const msl = most((m) => m.missile), torp = most((m) => m.torpedo);
  if (msl) add({ role: 'ssm', range: msl.range, name: msl.name ?? 'Missiles', vs: 'vs ships' });
  if (torp) add({ role: 'missile', range: torp.range, name: 'Torpedoes', vs: 'vs ships' });
  if (st.asTorp?.range) add({ role: 'indirect', range: st.asTorp.range, name: 'ASW torpedo', vs: 'vs submarines' });
  return out;
}
export const ROLE_CSS = Object.fromEntries(Object.entries(ROLE).map(([k, v]) => [k, v.css]));

/** A dashed ring: short arcs every few metres, in one geometry. */
function dashedGeometry(r) {
  const b = Math.max(BAND, r * 0.0012), n = Math.max(24, Math.round((r * Math.PI * 2) / 9)), arc = (Math.PI * 2) / n;
  const parts = Array.from({ length: n }, (_, i) => new THREE.RingGeometry(r - b, r + b, 3, 1, i * arc, arc * 0.55));
  const g = mergeGeometries(parts);
  parts.forEach((q) => q.dispose());
  return flat(g);
}

/** Flat on XZ; theta 0 points along +z (yaw 0), as GroundDecal.place rotates. */
const flat = (g) => g.rotateX(-Math.PI / 2).rotateY(-Math.PI / 2);

// Every shape is draped over the terrain at its vertices (GroundDecal), so they sit close enough
// together to follow hills: a straight edge between far-apart vertices runs under a rise.
const STEP = 3;      // m between vertices along a ring
const RADIAL = 8;    // m between rings of vertices across a disc

function ringGeometry(r) {
  const b = Math.max(BAND, r * 0.0012); // (a ship's 2 km reach, seen from high up: a line you can see)
  return flat(new THREE.RingGeometry(r - b, r + b, Math.min(1440, Math.max(64, Math.round((r * Math.PI * 2) / STEP))), 1));
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
    this.items = new Map(); // stack → { decals: [{ decal, turns }], labels: [{ el, r }], x, z, yaw, full }
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
    const list = this.shown(), full = list.length <= 2; // (one or two stacks: every ring, the fills, the names)
    const show = new Set(list);
    for (const [s, item] of this.items) if (!show.has(s) || item.full !== full) this.remove(s, item);
    const cam = this.game.camera, rect = this.game.canvas?.getBoundingClientRect?.();
    for (const s of show) {
      const item = this.items.get(s) ?? this.create(s, full);
      const { x, z } = s.centroid;
      const yaw = s.units[0]?.yaw ?? 0;
      if (Math.abs(x - item.x) + Math.abs(z - item.z) > 0.3 || Math.abs(yaw - item.yaw) > 0.02) {
        for (const a of item.decals) a.decal.place(x, z, 1, a.turns ? yaw : 0);
        item.x = x;
        item.z = z;
        item.yaw = yaw;
      }
      if (item.labels.length && rect) this.placeLabels(item, cam, rect);
    }
  }

  /** The names on the rings: on their side edge, hidden when the ring is too small on screen to read. */
  placeLabels(item, cam, rect) {
    const T = this.game.terrain;
    const toward = Math.atan2(cam.position.x - item.x, cam.position.z - item.z) + Math.PI / 2; // (the ring's side as you look at it: the near edge runs off the bottom of the screen)
    _c.set(item.x, T.heightAt(item.x, item.z), item.z).project(cam);
    item.labels.forEach((l, i) => {
      const a = toward + (i - (item.labels.length - 1) / 2) * 0.16; // (fanned out a little: rings close together don't stack their names)
      const px = item.x + Math.sin(a) * l.r, pz = item.z + Math.cos(a) * l.r;
      _t.set(px, T.heightAt(px, pz) + 1, pz).project(cam);
      const small = Math.hypot((_t.x - _c.x) * rect.width, (_t.y - _c.y) * rect.height) / 2 < 70;
      const off = small || _t.z > 1 || Math.abs(_t.x) > 1.05 || Math.abs(_t.y) > 1.05;
      l.el.hidden = off;
      if (!off) l.el.style.transform = `translate(${rect.left + ((_t.x + 1) / 2) * rect.width}px, ${rect.top + ((1 - _t.y) / 2) * rect.height}px) translate(-50%, -50%)`;
    });
  }

  create(s, full) {
    const g = this.game;
    const item = { decals: [], labels: [], x: Infinity, z: Infinity, yaw: Infinity, full };
    const put = (geo, m, turns = false) => { const decal = new GroundDecal(geo, m, g.terrain, 0.25); g.scene.add(decal.mesh); item.decals.push({ decal, turns }); };
    const ws = weapons(s);
    for (const w of full ? ws : ws.slice(0, 1)) {
      const R = ROLE[w.role];
      put(R.dashed ? dashedGeometry(w.range) : ringGeometry(w.range), R.ring);
      if (w.min > 1) put(dashedGeometry(w.min), R.ring);
      if (!full) continue;
      if (R.fill && !s.stats.naval) put(discGeometry(w.range * EFFECTIVE), R.fill); // (a ship's reach is kilometres: the rings alone)
      const el = document.createElement('div');
      el.className = 'range-tag';
      el.style.color = R.css;
      el.textContent = `${w.name} ${Math.round(w.range)} m`;
      el.hidden = true;
      document.body.appendChild(el);
      item.labels.push({ el, r: w.range });
    }
    for (const [geo, m, turns] of areas(s)) put(geo, m, !!turns);
    this.items.set(s, item);
    return item;
  }

  remove(s, item) {
    for (const { decal } of item.decals) { decal.mesh.removeFromParent(); decal.geometry.dispose(); }
    for (const l of item.labels) l.el.remove();
    this.items.delete(s);
  }
}
const _t = new THREE.Vector3();
const _c = new THREE.Vector3();
