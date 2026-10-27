// Carrying infantry in vehicles (IFVs: `stats.carries`). A carrier stack has `passengers` men
// of `passengerType` riding inside — they don't fight or get spotted, they just ride.
//   unload(carrier)        – the squad climbs out of the back ramps as its own stack (U)
//   board(infantry, ifv)   – the squad walks to the vehicles and climbs in once it's close
//   carrier knocked out    – its share of the passengers is lost; about half of them make it out
// Carriers the player doesn't control dismount on their own when they come under fire or
// settle into a defence.
import { AIState } from '../ai/StackAI.js';

const BOARD_DISTANCE = 7;   // metres from a vehicle to climb in
const SQUAD_NAMES = { nato: 'Mech Squad', pact: 'Motor Rifle Squad' };

export class Transport {
  constructor(game) {
    this.game = game;
    this.boarding = new Map(); // infantry stack -> carrier stack
    this.counter = 0;
    game.bus.on('unit:death', ({ unit, stack }) => this.onDeath(unit, stack));
  }

  /** Called by UnitStack's constructor through GameEngine.spawnStack. */
  setup(stack) {
    const c = stack.stats.carries;
    if (!c) return;
    stack.passengers = c.count;
    stack.passengerType = c.unit;
  }

  canUnload(stack) {
    return stack.alive && stack.passengers > 0;
  }

  /** The squad climbs out behind the vehicles. Returns the new stack (or null). */
  unload(carrier, { quiet = false } = {}) {
    if (!this.canUnload(carrier)) return null;
    const game = this.game;
    const back = carrier.footprint + 3;
    const pos = { x: carrier.centroid.x - Math.sin(carrier.facing) * back, z: carrier.centroid.z - Math.cos(carrier.facing) * back };
    const name = `${SQUAD_NAMES[carrier.faction] ?? 'Squad'} ${++this.counter}`;
    const squad = game.spawnStack(carrier.passengerType, carrier.faction, pos, carrier.facing, name, { count: carrier.passengers });
    carrier.passengers = 0;
    squad.carrier = carrier;
    // keep doing what the vehicles were doing
    if (carrier.ai.state === AIState.ATTACK && carrier.ai.targetGroup?.alive) squad.ai.attack(carrier.ai.targetGroup, { ordered: carrier.ai.ordered });
    else squad.ai.moveTo({ x: carrier.centroid.x + Math.sin(carrier.facing) * 10, z: carrier.centroid.z + Math.cos(carrier.facing) * 10 }, { hold: true, ordered: carrier.ai.ordered });
    if (!quiet) game.tell(carrier.faction, `${carrier.name}: squad dismounted`);
    game.bus.emit('transport:unload', { carrier, squad });
    return squad;
  }

  /** Send `squad` to climb into `carrier`. Returns false if it can't. */
  board(squad, carrier) {
    const game = this.game;
    const cap = carrier.stats.carries?.count ?? 0;
    if (!carrier.alive || !cap) return false;
    if (carrier.passengers > 0) {
      game.tell(squad.faction, `${carrier.name} is already carrying a squad`);
      return false;
    }
    if (!squad.usesCover || squad.aliveCount > cap) {
      game.tell(squad.faction, `Room for ${cap} men only`);
      return false;
    }
    this.boarding.set(squad, carrier);
    squad.ai.moveTo({ x: carrier.centroid.x, z: carrier.centroid.z }, { ordered: game.isHuman(squad.faction) });
    game.tell(squad.faction, `${squad.name} boarding ${carrier.name}`);
    return true;
  }

  onDeath(unit, stack) {
    if (!stack.passengers) return;
    const aliveBefore = stack.aliveCount + 1;
    const share = Math.ceil(stack.passengers / aliveBefore);
    stack.passengers -= share;
    const survivors = Math.floor(share * (0.3 + Math.random() * 0.4));
    if (survivors > 0) {
      const back = stack.stats.radius + 2;
      const pos = { x: unit.pos.x - Math.sin(unit.yaw) * back, z: unit.pos.z - Math.cos(unit.yaw) * back };
      const sq = this.game.spawnStack(stack.passengerType, stack.faction, pos, unit.yaw, `${stack.name} survivors`, { count: survivors });
      sq.morale = 0.4;
      sq.ai.retreat();
    }
  }

  update() {
    const game = this.game;
    for (const [squad, carrier] of this.boarding) {
      if (!squad.alive || !carrier.alive || carrier.passengers > 0) { this.boarding.delete(squad); continue; }
      // follow the vehicles if they moved
      const near = carrier.units.some((v) => v.alive && squad.units.some((u) => u.alive && (u.pos.x - v.pos.x) ** 2 + (u.pos.z - v.pos.z) ** 2 < BOARD_DISTANCE ** 2));
      if (!near) {
        if (!squad.moveTarget) squad.ai.moveTo({ x: carrier.centroid.x, z: carrier.centroid.z }, { ordered: squad.ai.ordered });
        continue;
      }
      carrier.passengers = squad.aliveCount;
      carrier.passengerType = squad.type.id;
      this.boarding.delete(squad);
      game.removeStack(squad);
      game.tell(carrier.faction, `${carrier.name}: squad mounted (${carrier.passengers})`);
    }
    // carriers the player doesn't command dismount under fire or once they hold a position
    for (const s of game.world.stacks) {
      if (!s.passengers || !s.alive || game.isHuman(s.faction)) continue;
      const threatened = s.units.some((u) => u.alive && u.threat && Math.hypot(u.threat.pos.x - u.pos.x, u.threat.pos.z - u.pos.z) < 110);
      if (threatened || s.lastHitTime > game.time - 2 || s.ai.state === AIState.DEFEND) this.unload(s, { quiet: true });
    }
  }
}
