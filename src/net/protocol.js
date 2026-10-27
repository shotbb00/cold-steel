// What travels between host and client.
//
// Binary snapshot (15 per second, unreliable channel), little endian:
//   u8 kind (1) · f64 host time · u16 stacks · u8 sorties
//   per stack:  u16 id · u8 units
//     per unit (18 bytes): i16 x·40 · i16 z·40 · u16 yaw · u16 turret yaw · i8 gun pitch·80 ·
//       u8 crouch · u8 prone · u8 reload pose · u8 health · u8 flags · u16 target stack · u8 target member
//   per sortie: u16 id · u8 faction · u8 state · f32 x, y, z · u16 yaw · i16 pitch·1e4 · i16 roll·1e4
// Everything else is JSON on the reliable channel ({ k: kind, ... }).
import * as THREE from 'three';

export const NET_VERSION = 1;
export const SNAPSHOT_RATE = 15;   // per second
export const STATE_RATE = 4;       // stack / economy state per second

export const FLAG = { alive: 1, spotted: 2, run: 4, working: 8, peek: 16, reloading: 32, recoil: 64 };
export const SORTIE_STATES = ['inbound', 'ingress', 'attack', 'break', 'home', 'down', 'done', 'land'];
const FACTION_IDS = ['nato', 'pact'];

const TAU = Math.PI * 2;
const angleToU16 = (a) => Math.round((((a % TAU) + TAU) % TAU) / TAU * 65535);
const u16ToAngle = (v) => (v / 65535) * TAU;
const clampI16 = (v) => Math.max(-32767, Math.min(32767, Math.round(v)));
const unit8 = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));

const UNIT_BYTES = 18;
const SORTIE_BYTES = 22;

/** Encode the battle's moving parts. `ref(unit)` → [stackId, index] of its target (or null). */
export function encodeSnapshot(time, stacks, sorties) {
  let size = 12;
  for (const s of stacks) size += 3 + s.units.length * UNIT_BYTES;
  size += sorties.length * SORTIE_BYTES;
  const buf = new ArrayBuffer(size);
  const v = new DataView(buf);
  let o = 0;
  v.setUint8(o, 1); o += 1;
  v.setFloat64(o, time, true); o += 8;
  v.setUint16(o, stacks.length, true); o += 2;
  v.setUint8(o, sorties.length); o += 1;
  for (const s of stacks) {
    v.setUint16(o, s.id, true); o += 2;
    v.setUint8(o, s.units.length); o += 1;
    for (const u of s.units) {
      v.setInt16(o, clampI16(u.pos.x * 40), true);
      v.setInt16(o + 2, clampI16(u.pos.z * 40), true);
      v.setUint16(o + 4, angleToU16(u.yaw), true);
      v.setUint16(o + 6, angleToU16(u.turretYaw), true);
      v.setInt8(o + 8, Math.max(-127, Math.min(127, Math.round((u.gunPitch ?? 0.05) * 80))));
      v.setUint8(o + 9, unit8(u.crouch));
      v.setUint8(o + 10, unit8(u.prone));
      v.setUint8(o + 11, unit8(u.reloadAnim));
      v.setUint8(o + 12, u.alive ? Math.max(1, Math.ceil((u.hp / u.maxHp) * 255)) : 0);
      let f = 0;
      if (u.alive) f |= FLAG.alive;
      if (u.spotted) f |= FLAG.spotted;
      if (u.run) f |= FLAG.run;
      if (u.working) f |= FLAG.working;
      if (u.peekT > 0) f |= FLAG.peek;
      if (u.reloadT > 0) f |= FLAG.reloading;
      if (u.recoil > 0.75) f |= FLAG.recoil; // fired within the last ~1/12 s
      v.setUint8(o + 13, f);
      const t = u.alive && u.target?.stack?.id ? u.target : null;
      v.setUint16(o + 14, t ? t.stack.id : 0, true);
      v.setUint8(o + 16, t ? t.index : 0);
      o += UNIT_BYTES;
    }
  }
  for (const a of sorties) {
    v.setUint16(o, a.id, true);
    v.setUint8(o + 2, Math.max(0, FACTION_IDS.indexOf(a.faction)));
    v.setUint8(o + 3, Math.max(0, SORTIE_STATES.indexOf(a.state)));
    v.setFloat32(o + 4, a.pos.x, true);
    v.setFloat32(o + 8, a.pos.y, true);
    v.setFloat32(o + 12, a.pos.z, true);
    v.setUint16(o + 16, angleToU16(a.yaw), true);
    v.setInt16(o + 18, clampI16(a.pitch * 1e4), true);
    v.setInt16(o + 20, clampI16(a.roll * 1e4), true);
    o += SORTIE_BYTES;
  }
  return buf;
}

/**
 * Decode into { time, stacks: Map(id → { n, d: Float32Array(n·9), f: Uint8Array(n), ts, ti }), sorties: Map }.
 * Per unit in d: x, z, yaw, turretYaw, gunPitch, crouch, prone, reloadAnim, health ratio.
 */
export function decodeSnapshot(buf) {
  const v = new DataView(buf);
  let o = 0;
  if (v.getUint8(o) !== 1) return null;
  o += 1;
  const time = v.getFloat64(o, true); o += 8;
  const ns = v.getUint16(o, true); o += 2;
  const na = v.getUint8(o); o += 1;
  const stacks = new Map();
  for (let i = 0; i < ns; i++) {
    const id = v.getUint16(o, true); o += 2;
    const n = v.getUint8(o); o += 1;
    const d = new Float32Array(n * 9);
    const f = new Uint8Array(n);
    const ts = new Uint16Array(n);
    const ti = new Uint8Array(n);
    for (let k = 0; k < n; k++) {
      const b = k * 9;
      d[b] = v.getInt16(o, true) / 40;
      d[b + 1] = v.getInt16(o + 2, true) / 40;
      d[b + 2] = u16ToAngle(v.getUint16(o + 4, true));
      d[b + 3] = u16ToAngle(v.getUint16(o + 6, true));
      d[b + 4] = v.getInt8(o + 8) / 80;
      d[b + 5] = v.getUint8(o + 9) / 255;
      d[b + 6] = v.getUint8(o + 10) / 255;
      d[b + 7] = v.getUint8(o + 11) / 255;
      d[b + 8] = v.getUint8(o + 12) / 255;
      f[k] = v.getUint8(o + 13);
      ts[k] = v.getUint16(o + 14, true);
      ti[k] = v.getUint8(o + 16);
      o += UNIT_BYTES;
    }
    stacks.set(id, { n, d, f, ts, ti });
  }
  const sorties = new Map();
  for (let i = 0; i < na; i++) {
    sorties.set(v.getUint16(o, true), {
      faction: FACTION_IDS[v.getUint8(o + 2)],
      state: SORTIE_STATES[v.getUint8(o + 3)],
      x: v.getFloat32(o + 4, true), y: v.getFloat32(o + 8, true), z: v.getFloat32(o + 12, true),
      yaw: u16ToAngle(v.getUint16(o + 16, true)),
      pitch: v.getInt16(o + 18, true) / 1e4,
      roll: v.getInt16(o + 20, true) / 1e4,
    });
    o += SORTIE_BYTES;
  }
  return { time, stacks, sorties };
}

// ------------------------------------------------------------------ call arguments

const round = (n, k = 100) => Math.round(n * k) / k;

/** Make effect / sound call arguments JSON-friendly (vectors → {x,y,z}, numbers rounded). */
export function packArgs(args) {
  return args.map((a) => {
    if (a == null || typeof a !== 'object') return typeof a === 'number' ? round(a, 1000) : a;
    if (typeof a.x === 'number' && typeof a.z === 'number') return { x: round(a.x), y: round(a.y ?? 0), z: round(a.z) };
    const o = {};
    for (const [k, val] of Object.entries(a)) o[k] = typeof val === 'number' ? round(val, 1000) : val;
    return o;
  });
}

/** The reverse: {x,y,z} objects become Vector3s again. */
export function unpackArgs(args) {
  return args.map((a) => (a && typeof a === 'object' && 'x' in a && 'z' in a && Object.keys(a).length === 3 ? new THREE.Vector3(a.x, a.y, a.z) : a));
}

export const v3 = (p) => [round(p.x), round(p.y), round(p.z)];
export const dir3 = (d) => [round(d.x, 1e4), round(d.y, 1e4), round(d.z, 1e4)];
