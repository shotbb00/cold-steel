// High-level brain for a bot faction. Individual stacks already retaliate and engage what
// comes near (StackAI); the director adds intent: muster for a few seconds, then send every
// idle stack at the nearest hostile group so the bots push toward the player's side.
import { FACTIONS } from '../data/factions.js';
import { AIState, notFleeing } from './StackAI.js';

export class EnemyDirector {
  constructor(game, faction, { holdTime = 6, thinkInterval = 1.5 } = {}) {
    this.game = game;
    this.faction = faction;
    this.holdTime = holdTime;
    this.thinkInterval = thinkInterval;
    this.elapsed = 0;
    this.timer = 0;
    this.announced = false;
  }

  update(dt) {
    this.elapsed += dt;
    this.timer -= dt;
    if (this.timer > 0 || this.elapsed < this.holdTime) return;
    this.timer = this.thinkInterval;

    if (!this.announced) {
      this.announced = true;
      this.game.bus.emit('toast', `${FACTIONS[this.faction].name} forces are advancing!`);
    }

    const world = this.game.world;
    for (const s of world.stacksOf(this.faction)) {
      if (s.ai.state !== AIState.IDLE) continue;
      const target = world.nearestEnemyGroup(s.centroid, this.faction, Infinity, notFleeing);
      if (target) s.ai.attack(target, { ordered: false });
    }
  }
}
