// Airfields (tester feedback 2026-11-17): on land and coastal maps each side gets an airfield near its
// base — or the map's own (`map.airfields`: [{ faction, x, z, yaw, large, group }], Midway's islands) — and
// its regular squadrons fly from there (systems/AirStrike.js: an airfield is a carrier whose deck is the
// runway). Placed the same on every machine (no dice: flat open ground near the base, mirrored for the
// enemy), the trees on the runway cleared and the runway, its markings and a hangar laid as props; the
// host spawns the airfield units (data/units/airfield.js). Shut when badly hit (CLOSED) until sappers, an
// engineer vehicle or a recovery vehicle within REPAIR.range repair it.
import { PropBuilder } from '../world/Props.js';
import { KINDS } from './AirStrike.js';
import { CLOSED } from '../data/units/airfield.js';
import { epoch } from '../data/epoch.js';

const RUNWAY = { len: 240, width: 32, side: 55 };   // m: the strip, and the tower this far off its centre line
const REPAIR = { range: 70, rate: 0.012 };          // a repair party within range: this share of its strength back a second
const REPAIRERS = new Set(['engineers', 'cev', 'recovery', 'mineClear']);

/** The squadrons an airfield holds: the land's (or at sea the island's) regular kinds this war flies. */
function defaultGroup(sea, game) {
  const g = sea ? (epoch() === '1985' ? { seaCap: 2, seaStrike: 3, aew: 1 } : { navCap: 3, diveBomb: 3, torpBomb: 2, navScout: 1 }) : { jet: 3, heli: 3, lift: 2, lightBomber: 2 };
  const n = game.rules?.airGroups; // the battle rule: this many groups of each kind in reserve
  for (const k of Object.keys(g)) { if (KINDS[k]?.off) delete g[k]; else if (n) g[k] = n; }
  return g;
}

export class Airfields {
  constructor(game) {
    this.game = game;
    this.list = []; // { faction, x, z, yaw, large, group }: the tower's spot
  }

  /** Where they go (every machine alike), clear the ground, lay the runways. `mineOnly`: the player's side's alone (boot camp). */
  plan(mineOnly = false) {
    const g = this.game, map = g.map;
    const sea = !!g.world.openSea;
    if (g.rules?.air === false || g.rules?.airfields === false || epoch() === '1806' || KINDS.jet?.off) return;
    if (sea && !map.airfields) return; // (at sea only a map's own: islands)
    if (map.airfields) this.list = map.airfields.map((a) => ({ ...a, group: { ...defaultGroup(sea, g), ...(a.group ?? {}) } }));
    else if (g.world.coastal) { // (a landing: not mirrored — each side where it has land behind it; the side coming from the sea has none)
      this.list = ['nato', 'pact'].map((f) => this.find(f)).filter(Boolean);
      for (const f of this.list) f.group = defaultGroup(false, g);
    } else {
      const a = this.find('nato');
      if (!a) return;
      this.list = [a, { ...a, faction: 'pact', x: -a.x, z: -a.z, yaw: a.yaw + Math.PI }];
      for (const f of this.list) f.group = defaultGroup(false, g);
    }
    if (mineOnly) this.list = this.list.filter((a) => a.faction === g.playerFaction).map((a) => ({ ...a, group: { lightBomber: 2 } })); // (boot camp: the light bombers only — its earlier lessons call the rest from the map edge)
    const props = new PropBuilder({ scene: g.scene, terrain: g.terrain, cover: g.cover, seed: 77 });
    for (const a of this.list) this.lay(props, a);
    props.finish();
  }

  /** The best flat open strip near `faction`'s base: the runway along x, the tower on the side toward the battle. */
  find(faction) {
    const g = this.game, map = g.map, T = g.terrain, base = map.bases?.[faction];
    if (!base) return null;
    const b = map.bounds, level = g.world.river?.level ?? -Infinity;
    const toward = -Math.sign(base.z) || 1; // (the battle lies this way in z)
    const blocked = (x, z, r) => (g.buildings?.list ?? []).some((h) => Math.hypot(h.x - x, h.z - z) < r) || (map.points ?? []).some((p) => Math.hypot(p.x - x, p.z - z) < r + (p.radius ?? 18));
    let best = null, bestS = Infinity;
    for (let dz = 0; dz <= 200; dz += 20) {
      const z = base.z + toward * (40 + dz);
      if (Math.abs(z) > b.z - 30) continue;
      for (let x = -b.x * 0.75; x <= b.x * 0.75; x += 20) {
        if (Math.abs(x - base.x) < RUNWAY.len / 2 + 40 && dz < 80) continue; // (not through the base itself)
        let lo = Infinity, hi = -Infinity, bad = false;
        for (let s = -RUNWAY.len / 2; s <= RUNWAY.len / 2 && !bad; s += 20) {
          for (const w of [-RUNWAY.width / 2, 0, RUNWAY.width / 2]) {
            const h = T.heightAt(x + s, z + w);
            if (h < level + 1 || blocked(x + s, z + w, 22)) { bad = true; break; }
            lo = Math.min(lo, h); hi = Math.max(hi, h);
          }
        }
        const tz = z + toward * RUNWAY.side;
        if (bad || hi - lo > 5 || blocked(x, tz, 18) || T.heightAt(x, tz) < level + 1) continue;
        const score = (hi - lo) + dz * 0.02 + Math.abs(Math.abs(x) - b.x * 0.4) * 0.01;
        if (score < bestS) { bestS = score; best = { faction, x, z: tz, yaw: toward > 0 ? -Math.PI / 2 : Math.PI / 2, large: false }; }
      }
    }
    return best;
  }

  /** The runway's centre and direction for an airfield (the tower RUNWAY.side off it). */
  strip(a) {
    const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw);
    return { cx: a.x - fz * RUNWAY.side, cz: a.z + fx * RUNWAY.side, fx, fz, len: RUNWAY.len, width: RUNWAY.width * (a.large ? 1.4 : 1) };
  }

  /** Clear the trees off it, and lay the asphalt, its markings and the hangars. */
  lay(props, a) {
    const g = this.game, T = g.terrain, s = this.strip(a);
    const along = (x, z) => (x - s.cx) * s.fx + (z - s.cz) * s.fz, across = (x, z) => (x - s.cx) * s.fz - (z - s.cz) * s.fx;
    for (const f of g.cover.forests ?? []) f.clear?.((x, z) => Math.abs(along(x, z)) < s.len / 2 + 30 && Math.abs(across(x, z)) < s.width / 2 + 45);
    const yaw = Math.atan2(s.fx, s.fz);
    for (let t = -s.len / 2; t < s.len / 2; t += 10) {
      const x = s.cx + s.fx * (t + 5), z = s.cz + s.fz * (t + 5), y = T.heightAt(x, z);
      props.box('stone', x, y + 0.05, z, s.width, 0.2, 10.2, yaw, 0x55555a);              // the asphalt
      if (Math.round(t / 10) % 2 === 0) props.box('plain', x, y + 0.17, z, 0.5, 0.04, 6, yaw, 0xd8d8d0); // the centre line
    }
    for (const end of [-1, 1]) for (let k = -3; k <= 3; k++) { // threshold bars
      const x = s.cx + s.fx * end * (s.len / 2 - 6) + s.fz * k * 3.4, z = s.cz + s.fz * end * (s.len / 2 - 6) - s.fx * k * 3.4;
      props.box('plain', x, T.heightAt(x, z) + 0.17, z, 1.6, 0.04, 8, yaw, 0xd8d8d0);
    }
    for (const k of a.large ? [-50, 50] : [40]) { // the hangars beside the tower
      const x = a.x + s.fx * k, z = a.z + s.fz * k;
      if (epoch() === '1945' || epoch() === '1918') props.timberHangar({ x, z, yaw: yaw + Math.PI / 2 });
      else props.hall({ x, z, yaw, width: 26, depth: 18, height: 8, color: 0x8a8c88, roof: 0x5a5c5e, door: 14, name: 'hangar' });
    }
  }

  /** The host: the airfield units at their spots, each with its own hangar and runway. */
  spawn() {
    const g = this.game;
    for (const a of this.list) {
      const st = g.spawnStack('airfield', a.faction, { x: a.x, z: a.z }, a.yaw, a.name ?? `${a.large ? 'Air base' : 'Airfield'}`);
      st.stats = { ...st.stats, carrier: { ...st.stats.carrier, deckX: -RUNWAY.side, slots: a.large ? 2 : 1, airGroup: a.group } };
      for (const u of st.units) u.hangar = { ...a.group };
      st.holdFire = true;
    }
  }

  /** Twice a second (systems/Support.js): repair parties at work on a damaged runway. */
  repair(step) {
    const g = this.game;
    for (const st of g.world.stacks) {
      if (!st.stats.airfield || !st.alive) continue;
      const u = st.units[0];
      if (!u?.alive || u.hp >= u.maxHp) { st.job = null; continue; }
      const crew = g.world.stacks.find((o) => o.faction === st.faction && o.alive && REPAIRERS.has(o.type.id) && Math.hypot(o.centroid.x - u.pos.x, o.centroid.z - u.pos.z) < REPAIR.range);
      const closed = u.hp < u.maxHp * CLOSED;
      if (!crew) { st.job = closed ? 'runway shut — needs sappers' : null; continue; }
      const was = closed;
      u.hp = Math.min(u.maxHp, u.hp + u.maxHp * REPAIR.rate * step);
      st.job = `repairing the runway ${Math.round((u.hp / u.maxHp) * 100)} %`;
      crew.job = `repairing ${st.name}`;
      if (was && u.hp >= u.maxHp * CLOSED) g.tell(st.faction, `${st.name}: runway repaired — flights can take off again`);
    }
  }
}

/** Is this base's runway open (a carrier's deck always is)? */
export const runwayOpen = (st) => !st.stats.airfield || (st.units[0]?.hp ?? 0) >= (st.units[0]?.maxHp ?? 1) * CLOSED;
