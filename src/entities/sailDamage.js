// What a sailing ship's fight does to her (1806, `stats.sail`), on top of the steel navies' hull damage
// (UnitStack.shipHit: leaks, fire and the magazine, the wheel, dismounted guns):
//   raking    a ball along her length — in at the bow, or worse through the stern windows — runs down the
//             whole gun deck: far more damage, far more men (breaking the line rakes the ships either side)
//   crew      u.crew, 1 → 0: the men at the guns; fewer, slower broadsides (UnitStack fire) and a weaker
//             boarding party later
//   masts     u.masts [fore, main, mizzen] standing (their hit points u.mastHp); a hit high up — the French
//             aim at the rigging — can bring one down: she loses its drive (MAST_DRIVE) and handles worse;
//             after JURY s her people rig a jury mast and get back half of it
//   striking  beaten (the hull shattered, the crew cut down or the masts gone) and her nerve gone, she strikes
//             her colours: no more firing, her sails let fly, and nobody fires at her (UnitStack.pickTarget).
//             She seldom sinks — the fire reaching the magazine, or the sea coming in faster than the pumps.
export const MAST_DRIVE = [0.32, 0.45, 0.23];   // the share of her speed under each mast, fore … mizzen
const MAST_HP = 0.18;                          // a mast's hit points, as a share of the hull's
const JURY = 90;                               // s until a jury mast is up where one fell
const RAKE = { bow: 1.6, stern: 2.2, along: 0.82 }; // damage × through the bow, through the stern; |cos| of the shot to her keel that counts as along it
const NAMES = ['foremast', 'mainmast', 'mizzen'];

/** How much harder a shot along `dir` (the way the ball flies) hits her: raking her from ahead or from astern. */
export function rakeFactor(u, dir) {
  if (!dir) return 1;
  const l = Math.hypot(dir.x, dir.z) || 1;
  const c = (dir.x * Math.sin(u.yaw) + dir.z * Math.cos(u.yaw)) / l; // +1: flying the way she points (in through her stern)
  return c > RAKE.along ? RAKE.stern : c < -RAKE.along ? RAKE.bow : 1;
}

/** Her drive under sail, from her masts: standing, or a jury rig (half). */
export function mastDrive(u) {
  if (!u.masts) return 1;
  let k = 0;
  for (let i = 0; i < 3; i++) k += MAST_DRIVE[i] * (u.masts[i] ? 1 : u.jury?.[i] ? 0.5 : 0);
  return k;
}

/** A hit that got through (after shipHit's hull damage): the men, the masts — and how hard it was (raked). */
export function sailHit(st, u, dealt, source, rake) {
  const tell = (t) => st.services.tell(st.faction, `${st.name}: ${t}`);
  u.masts ??= [true, true, true];
  u.mastHp ??= [1, 1, 1].map(() => u.maxHp * MAST_HP);
  const k = dealt / u.maxHp;
  u.crew = Math.max(0, (u.crew ?? 1) - k * (rake > 1 ? 1.5 : 0.7));
  if (rake > 1 && !(u.rakeTold > st.world.time - 20)) { u.rakeTold = st.world.time; tell(rake > 2 ? 'raked through the stern!' : 'raked from ahead!'); }
  // the rigging: the French gunners fire on the up-roll, at the masts (source: the French side, nato)
  const high = source?.faction === 'nato' && source?.stats?.sail ? 0.5 : 0.18;
  if (Math.random() < high) {
    const i = Math.floor(Math.random() * 3);
    if (u.masts[i]) {
      u.mastHp[i] -= dealt * (source?.faction === 'nato' ? 1.6 : 1);
      if (u.mastHp[i] <= 0) {
        u.masts[i] = false;
        (u.fellAt ??= [])[i] = st.world.time;
        st.morale = Math.max(0, st.morale - 0.12);
        st.services.effects.waterSplash?.({ x: u.pos.x + Math.cos(u.yaw) * 12, y: st.world.river?.level ?? 0, z: u.pos.z - Math.sin(u.yaw) * 12 }, 3);
        tell(`the ${NAMES[i]} has gone by the board!`);
      }
    }
  }
  st.morale = Math.max(0, st.morale - k * 0.6);
}

/** Every frame: jury masts going up, and whether she strikes. */
export function sailUpkeep(st, u, dt) {
  const now = st.world.time;
  if (u.masts) for (let i = 0; i < 3; i++) if (!u.masts[i] && !u.jury?.[i] && now - (u.fellAt?.[i] ?? now) > JURY) { (u.jury ??= [])[i] = true; st.services.tell(st.faction, `${st.name}: a jury ${NAMES[i]} rigged`); }
  if (u.struck) return;
  const hull = u.hp / u.maxHp, crew = u.crew ?? 1, drive = mastDrive(u);
  const beaten = Math.max(0, 0.45 - hull) * 2.5 + Math.max(0, 0.5 - crew) * 2.2 + (drive < 0.3 ? 0.4 : 0) + ((u.blaze ?? 0) > 0.6 ? 0.2 : 0); // 0: still fighting … 1 and more: done for
  if (beaten <= 0) return;
  const grit = st.faction === 'pact' ? 0.6 : 1; // (the Royal Navy fought on longer)
  if (Math.random() < dt * beaten * 0.2 * grit * (1.5 - st.morale)) strike(st, u); // (beaten 1 and low spirits: struck within some seconds; a stout crew holds a while longer)
}

/** She strikes her colours: out of the fight, her sails let fly — a prize for whoever takes possession (boarding, step 3). */
export function strike(st, u) {
  u.struck = true;
  u.target = null;
  st.moveTarget = null;
  st.services.tell(st.faction, `${st.name} has struck her colours`);
  const foe = st.faction === 'nato' ? 'pact' : 'nato';
  st.services.tell(foe, `${st.name} has struck to us!`);
}
