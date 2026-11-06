// When a vehicle is knocked out, its crew may get out alive: a small 'crew' stack
// appears beside the wreck and runs for base (StackAI retreat). Chance and crew size come from
// the vehicle's stats (`crew`, `bailChance`).
// A crew can man a vehicle again: one of yours that was knocked out but didn't brew up
// (u.recoverable). Stay beside it for REMAN.time s out of the fire and they climb in — any crew,
// any of your wrecks — and it is back in its platoon at a third of its strength, tracks still to
// mend (systems/Support.js).
const REMAN = { range: 7, time: 5, hp: 0.3, calm: 4 };

export class CrewBailout {
  constructor(game) {
    this.game = game;
    this.t = 0;
    game.bus.on('unit:death', ({ unit, stack }) => this.onDeath(unit, stack));
  }

  /** Twice a second (where the simulation runs): crews beside a wreck they can man climb in. */
  update(dt) {
    const g = this.game;
    if (g.net?.isClient || (this.t += dt) < 0.5) return;
    const step = this.t;
    this.t = 0;
    for (const crew of g.world.stacks) {
      if (crew.type.id !== 'crew' || !crew.alive || g.world.time - crew.lastHitTime < REMAN.calm) continue;
      const hull = this.wreckNear(crew);
      if (!hull) { crew.remanT = 0; continue; }
      if ((crew.remanT = (crew.remanT ?? 0) + step) < REMAN.time) continue;
      const { stack, unit } = hull;
      unit.alive = true;
      unit.recoverable = false;
      unit.hp = unit.maxHp * REMAN.hp;
      unit.speedMul = 0;
      unit.deathTime = 0;
      stack.aliveCount++;
      stack.renderer.done = false;
      if (stack.ai.state === 'Retreat') stack.ai.idle();
      g.tell(stack.faction, `${crew.name} man a knocked-out ${stack.name} vehicle — it needs its tracks mended`);
      g.removeStack(crew);
    }
  }

  /** A wreck of `crew`'s side, knocked out but not burnt out, that the crew stands beside: { stack, unit }. */
  wreckNear(crew, range = REMAN.range) {
    for (const s of this.game.world.stacks) { // (a platoon with every vehicle knocked out is still here, as its wrecks)
      if (s.faction !== crew.faction) continue;
      if (s.usesCover || s.stats.structure || !s.stats.crew) continue;
      for (const u of s.units) {
        if (u.alive || !u.recoverable) continue;
        if (crew.units.some((m) => m.alive && Math.hypot(m.pos.x - u.pos.x, m.pos.z - u.pos.z) < range)) return { stack: s, unit: u };
      }
    }
    return null;
  }

  onDeath(unit, stack) {
    const s = stack.stats;
    if (stack.usesCover || !s.crew || Math.random() > (s.bailChance ?? 0.6)) return;
    const count = 1 + Math.floor(Math.random() * s.crew); // not everyone always makes it
    // tumble out on the side away from where the vehicle was facing
    const back = s.radius + 1.5;
    const pos = { x: unit.pos.x - Math.sin(unit.yaw) * back, z: unit.pos.z - Math.cos(unit.yaw) * back };
    const was = this.game.currentOwner;
    this.game.currentOwner = stack.owner ?? was; // co-op: the crew stays with the player whose vehicle it was
    const crew = this.game.spawnStack('crew', stack.faction, pos, unit.yaw + Math.PI, `${stack.name} crew`, { count });
    this.game.currentOwner = was;
    crew.morale = 0.5;
    crew.barkAny('bail');
    crew.ai.retreat();
    this.game.tell(stack.faction, `${stack.name}: crew bailed out (${count})`);
  }
}
