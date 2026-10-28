// Where a squad sent to a spot will take cover, decided when the order is given: the same choice
// its men make on arrival (Cover.findSpot round the destination, against a threat ahead along
// the way it will face), made in advance — so the command view can show it while you aim the
// order (CommandSystem preview), and the men then go to exactly those spots (the move order
// stores the plan in stack.ai.plannedSpots; SoldierAI takes a planned spot first). The facing is
// the one the order gives (right-drag), otherwise toward the enemy's side of the field, which is
// also what the squad faces once it holds there.
const TAKEN = { alive: true };

/** Yaw a stack holding at `dest` faces when the order gives none: toward the enemy base. */
export function defaultFacing(world, stack, dest) {
  const foe = Object.entries(world.bases).find(([f]) => f !== stack.faction)?.[1];
  return foe ? Math.atan2(foe.x - dest.x, foe.z - dest.z) : stack.facing;
}

/**
 * Map unit → cover spot for `stack` holding at `dest` facing `face` (null: the default), or null
 * when there is no cover within reach. Spots the stack's own men hold now count as free (they
 * leave them on the order); spots of other stacks don't.
 */
export function planCover(world, stack, dest, face = null) {
  if (!stack.usesCover || stack.garrison) return null;
  const cover = world.cover;
  const s = stack.stats;
  const yaw = face ?? defaultFacing(world, stack, dest);
  const threat = { x: dest.x + Math.sin(yaw) * 40, z: dest.z + Math.cos(yaw) * 40 };
  const men = stack.units.filter((u) => u.alive);
  const freed = [];
  for (const u of men) if (u.coverSpot?.occupant === u) { freed.push(u.coverSpot); u.coverSpot.occupant = null; }
  const taken = [];
  const plan = new Map();
  men.forEach((u, i) => {
    // as if he were already there: his place in a loose ring round the destination
    const a = i * 2.4;
    const r = 1 + i * 0.35;
    const proxy = { pos: { x: dest.x + Math.sin(a) * r, z: dest.z + Math.cos(a) * r }, stack: { garrison: null }, alive: true };
    const spot = cover.findSpot(proxy, threat, dest, s.leash, s.range);
    if (!spot) return;
    taken.push([spot, spot.occupant]);
    spot.occupant = TAKEN;
    plan.set(u, spot);
  });
  for (const [spot, was] of taken) spot.occupant = was;
  for (const spot of freed) if (!spot.occupant) spot.occupant = men.find((u) => u.coverSpot === spot) ?? null;
  return plan.size ? plan : null;
}
