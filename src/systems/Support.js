// Battlefield support: recovery vehicles (data/units/recovery.js, `repair`) mend friendly
// vehicles parked near them — hit points back, mine-blown tracks fixed after a few seconds —
// and field ambulances (ambulance.js, `heal`) patch up wounded infantry nearby. Left to
// themselves (no order of the player's standing), both drive to the nearest friendly work
// within `seek` metres that isn't in the middle of a fight. Runs where the simulation runs
// (the multiplayer host), twice a second.
// The work shows: the support vehicle's label says what it's doing (stack.job: "Repairing
// T-72 2 · tracks 60 %", "Treating 4 wounded"), the stacks it works on carry a badge
// (stack.tended until a moment after the last care), and there is something to see at each
// patient — welding sparks on a vehicle, a medic's glow over a wounded man (EffectsSystem).
import { dist2DSq } from '../core/math.js';
import { AIState } from '../ai/StackAI.js';

const TICK = 0.5;
const SEEK_EVERY = 3;   // seconds between looking for new work

export class Support {
  constructor(game) {
    this.game = game;
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    if (this.t < TICK) return;
    const step = this.t;
    this.t = 0;
    const world = this.game.world;
    for (const s of world.stacks) {
      if (!s.alive) continue;
      const kit = s.stats.repair ?? s.stats.heal;
      if (!kit) continue;
      const repair = !!s.stats.repair;
      let working = false;
      let job = null;       // the label's line: the most telling task this tick
      let treated = 0;
      for (const o of world.stacksOf(s.faction)) {
        if (o === s || !o.alive || o.stats.structure || o.usesCover === repair) continue;
        for (const u of o.units) {
          if (!(u.alive || (repair && u.recoverable && o.alive)) || !this.needs(u, repair) || !s.units.some((m) => m.alive && dist2DSq(m.pos, u.pos) < kit.range * kit.range)) continue;
          working = true;
          o.tended = { kind: repair ? 'repair' : 'heal', until: this.game.time + 1.2 };
          treated++;
          this.show(u, repair);
          if (!u.alive) { // a knocked-out vehicle of a platoon still in the fight: hauled back into running order
            u.reviveT = (u.reviveT ?? 0) + step;
            job = `Recovering a knocked-out ${o.name} · ${Math.min(99, Math.round((u.reviveT / (kit.mend * 2)) * 100))} %`;
            if (u.reviveT < s.stats.repair.mend * 2) continue;
            this.revive(o, u);
            this.game.tell(s.faction, `${s.name}: ${o.name} has a vehicle back in service`);
            continue;
          }
          u.hp = Math.min(u.maxHp, u.hp + kit.rate * step);
          if (!u.wounded) u.woundedBarked = false;
          if (repair && !job?.startsWith('Recovering')) {
            const part = u.speedMul === 0 ? ['tracks', u.mendT] : u.gunOut ? ['gun', u.partT] : u.engineHit ? ['engine', u.partT] : null;
            // a timed job (tracks, gun, engine) says more than patching a hull
            if (part) job = `Repairing ${o.name} · ${part[0]} ${Math.min(99, Math.round(((part[1] ?? 0) / s.stats.repair.mend) * 100))} %`;
            else job ??= `Repairing ${o.name} · hull`;
          }
          if (repair && u.speedMul === 0) {
            u.mendT = (u.mendT ?? 0) + step;
            if (u.mendT >= kit.mend) {
              u.speedMul = 0.95;
              u.mendT = 0;
              this.game.tell(s.faction, `${s.name}: ${o.name} is moving again`);
            }
          }
          if (repair && (u.gunOut || u.engineHit) && (u.partT = (u.partT ?? 0) + step) >= kit.mend) {
            u.gunOut = false;
            u.engineHit = false;
            u.partT = 0;
            this.game.tell(s.faction, `${s.name}: ${o.name} is fully repaired`);
          }
        }
      }
      s.working = working;
      s.job = repair ? job : treated ? `Treating ${treated} wounded` : null;
      if (!working) this.seek(s, s.stats.repair ?? s.stats.heal, repair);
    }
  }

  /** Something to see at the patient: welding sparks on a vehicle, a medic's glow over a man. */
  show(u, repair) {
    const fx = this.game.effects;
    if (!fx || Math.random() < 0.35) return; // not every patient every tick: a flicker of work, not a light show
    const p = { x: u.pos.x + (Math.random() - 0.5) * 2, y: u.pos.y + (repair ? 0.8 + Math.random() * 1.2 : 0.6), z: u.pos.z + (Math.random() - 0.5) * 2 };
    if (repair) fx.weld(p);
    else fx.tend(p);
  }

  /** A knocked-out vehicle running again: a third of its strength, its tracks still to be mended. */
  revive(stack, u) {
    u.alive = true;
    u.recoverable = false;
    u.reviveT = 0;
    u.hp = u.maxHp * 0.3;
    u.speedMul = 0;
    u.deathTime = 0;
    stack.aliveCount++;
    stack.renderer.done = false;
  }

  needs(u, repair) {
    return repair ? !u.alive || u.hp < u.maxHp || u.speedMul === 0 || u.gunOut || u.engineHit : u.hp < u.maxHp;
  }

  /** Idle and unordered: drive over to the nearest friendly that needs us, away from the fighting. */
  seek(s, job, repair) {
    const now = this.game.time;
    if (now < (s.seekAt ?? 0)) return;
    s.seekAt = now + SEEK_EVERY;
    const ai = s.ai;
    if (ai.ordered || s.leader || (ai.state !== AIState.IDLE && ai.state !== AIState.DEFEND)) return;
    let best = null;
    let bestD = job.seek * job.seek;
    for (const o of this.game.world.stacksOf(s.faction)) {
      if (o === s || !o.alive || o.stats.structure || o.usesCover === repair) continue;
      if (this.game.time - o.lastHitTime < 6) continue; // still under fire: wait for it to pull back
      for (const u of o.units) {
        if (!(u.alive || (repair && u.recoverable && o.alive)) || !(repair ? !u.alive || u.hp < u.maxHp * 0.8 || u.speedMul === 0 || u.gunOut || u.engineHit : u.wounded)) continue;
        const d = dist2DSq(u.pos, s.centroid);
        if (d < bestD && d > job.range * job.range * 0.5) { bestD = d; best = u; }
      }
    }
    if (best) ai.moveTo({ x: best.pos.x, z: best.pos.z }, { hold: true, ordered: false });
  }
}
