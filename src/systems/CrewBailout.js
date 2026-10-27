// When a vehicle is knocked out, its crew may get out alive: a small 'crew' stack
// appears beside the wreck and runs for base (StackAI retreat). Chance and crew size come from
// the vehicle's stats (`crew`, `bailChance`).
export class CrewBailout {
  constructor(game) {
    this.game = game;
    game.bus.on('unit:death', ({ unit, stack }) => this.onDeath(unit, stack));
  }

  onDeath(unit, stack) {
    const s = stack.stats;
    if (stack.usesCover || !s.crew || Math.random() > (s.bailChance ?? 0.6)) return;
    const count = 1 + Math.floor(Math.random() * s.crew); // not everyone always makes it
    // tumble out on the side away from where the vehicle was facing
    const back = s.radius + 1.5;
    const pos = { x: unit.pos.x - Math.sin(unit.yaw) * back, z: unit.pos.z - Math.cos(unit.yaw) * back };
    const crew = this.game.spawnStack('crew', stack.faction, pos, unit.yaw + Math.PI, `${stack.name} crew`, { count });
    crew.morale = 0.5;
    crew.barkAny('bail');
    crew.ai.retreat();
    this.game.tell(stack.faction, `${stack.name}: crew bailed out (${count})`);
  }
}
