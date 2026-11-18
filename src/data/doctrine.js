// Each army's two signature mechanics (data/factions.js ARMIES): what the army picker shows
// (ui/MainMenu.js armiesPicker) and the numbers the systems read, in one place.
//   US Army      AirLand Battle   air support recharges faster and costs less while our ground
//                                 units are in contact; knocking out enemy guns and HQs pays CP
//                Cavalry screen   recon sees further and marks what it sees: marked enemies take
//                                 more damage from everyone
//   Bundeswehr   Sperrverband     engineers build twice as fast, fortifications cost less, a
//                                 dug-in line is waiting at the start
//                Verbundene Waffen Panzergrenadiere near their IFV aim better and hold under fire
//   Soviet Army  Mass artillery   the preparatory barrage: a whole sector shelled for a minute
//                Reckless tempo   advancing units move and shoot faster; stalled ones break easier
//   NVA          Kampfgruppen     cheap factory militia that doesn't count against the unit cap
//                Feuerwalze       fire missions come faster and cheaper; the creeping barrage order
export const DOCTRINE = {
  us: [
    { id: 'airland', name: 'AirLand Battle', text: 'Air support costs 30 % less and recharges 40 % faster while your troops are in contact. Knocking out enemy artillery and command posts pays 20 CP.',
      cost: 0.7, cooldown: 0.6, contact: 6, bounty: 20 },
    { id: 'cavalry', name: 'Cavalry screen', text: 'Scouts and recon vehicles see 25 % further and mark what they see: marked enemies take 15 % more damage from everyone for 10 s.',
      sight: 1.25, mark: 10, damage: 1.15 },
  ],
  bw: [
    { id: 'sperr', name: 'Sperrverband', text: 'Engineers build twice as fast and fortifications cost 40 % less. A dug-in line of trenches and wire waits in front of your base at the start.',
      build: 2, cost: 0.6 },
    { id: 'verbund', name: 'Verbundene Waffen', text: 'Infantry within 40 m of a friendly infantry fighting vehicle aims 20 % better and takes a third less suppression.',
      range: 40, aim: 1.2, suppression: 0.67 },
  ],
  sov: [
    { id: 'mass', name: 'Mass artillery', text: 'The preparatory barrage: every gun on a whole sector for a minute, pinning everything inside (support power, 150 CP).',
      cost: 150, cooldown: 240, radius: 60, duration: 60 },
    { id: 'tempo', name: 'Reckless tempo', text: 'Units advancing on the enemy move 15 % faster and fire 15 % faster. Units stalled in contact for 20 s take 30 % more suppression.',
      speed: 1.15, fire: 1.15, stall: 20, suppression: 1.3 },
  ],
  nva: [
    { id: 'kampf', name: 'Kampfgruppen', text: 'Kampfgruppen der Arbeiterklasse: cheap factory militia with old rifles that doesn’t count against your unit cap.' },
    { id: 'walze', name: 'Feuerwalze', text: 'Guns, rocket launchers and mortars cost 25 % less and reload 35 % faster. Their creeping barrage order walks the shells forward ahead of your advance.',
      cooldown: 0.65, cost: 0.75, step: 12, every: 6, steps: 8 },
  ],
  // the Northern Flank and Korea (data/epoch.js)
  no: [
    { id: 'carlGustaf', name: 'Carl Gustaf', text: 'Anti-tank teams cost 30 % less and fire 25 % faster: in Brigade Nord every section carries the recoilless rifle, and the valleys funnel the tanks onto it.',
      costs: { atTeam: 0.7 }, mods: { atTeam: { fireCooldown: 0.75 } } },
    { id: 'homeGround', name: 'Home ground', text: 'Every unit sees 20 % further: the Norwegians know every valley, every ridge and every frozen lake of the North.',
      mods: { all: { sight: 1.2 } } },
  ],
  usmc: [
    { id: 'amphibious', name: 'From the sea', text: 'Amphibious tractors and LAVs cost 20 % less and move 10 % faster: the Marine Amphibious Brigade comes ashore on its own wheels and tracks.',
      costs: { ifv: 0.8, reconVehicle: 0.8 }, mods: { ifv: { speed: 1.1 }, reconVehicle: { speed: 1.1 } } },
    { id: 'rifleman', name: 'Every Marine a rifleman', text: 'Rifle squads reach 20 % further: Marine marksmanship, taught at 500 yards on the known-distance range.',
      mods: { rifles: { range: 1.2 } } },
  ],
  rok: [
    { id: 'conscripts', name: 'Every man has served', text: 'Rifle squads, MG teams and anti-tank teams start as Veterans: the army is filled with men who did their service on the DMZ.',
      veteran: ['rifles', 'mgTeam', 'atTeam'] },
    { id: 'dmzWatch', name: 'The DMZ watch', text: 'Scouts and observers see 30 % further, observers cost 30 % less: the posts on the DMZ have watched the same hills for thirty years.',
      mods: { scouts: { sight: 1.3 }, observers: { sight: 1.3 } }, costs: { observers: 0.7 } },
  ],
  kpa: [
    { id: 'kampf', name: 'Worker-Peasant Red Guards', text: 'The whole country under arms: cheap militia squads with old rifles that don’t count against your unit cap.' },
    { id: 'hardSites', name: 'Hardened artillery sites', text: 'Guns, rocket launchers and mortars take 40 % less damage: the long-range guns north of the DMZ fire from tunnels cut into the hills.',
      mods: { guns: { take: 0.6 } } },
  ],
};

export const ARTILLERY = new Set(['artillery', 'rockets', 'spMortar', 'mortar']);

/** An army's doctrine `id`, if it has it. */
export const armyDoctrine = (army, id) => DOCTRINE[army]?.find((d) => d.id === id);

// A doctrine's plain numbers, read for any army (no code per doctrine needed):
//   mods     { key: { stat: ×factor } } on the stack's stats when it is raised (UnitStack) — `stealth` ×
//            means harder to spot, `take` the damage it takes, `repair` the recovery kit's speed
//   costs    { key: ×factor } on the price (unitCost)
//   veteran  [key] raised as Veterans (GameEngine.spawnStack)
// A key is a type id, or 'infantry' (on foot), 'cavalry' (horse), 'guns' (ARTILLERY), 'structures', 'all'.
const covers = (k, type, st = {}) => k === type.id || k === 'all' || (k === 'infantry' && type.kind === 'infantry' && !st.cavalry && !st.structure)
  || (k === 'cavalry' && !!st.cavalry) || (k === 'guns' && ARTILLERY.has(type.id)) || (k === 'structures' && !!st.structure);
export const doctrineCovers = (army, field, type, st = type.stats) => (DOCTRINE[army] ?? []).some((d) => (d[field] ?? []).some((k) => covers(k, type, st)));
const DEFAULTS = { sight: 100, vsStructure: 1, suppressPower: 1, take: 1 };
/** `stats` with `army`'s doctrine `mods` for `type` applied. */
export function withMods(army, type, stats) {
  for (const d of DOCTRINE[army] ?? []) for (const [k, m] of Object.entries(d.mods ?? {})) {
    if (!covers(k, type, stats)) continue;
    stats = { ...stats };
    for (const [st, f] of Object.entries(m)) {
      const v = stats[st];
      stats[st] = st === 'stealth' ? (v ?? 1) / f : v && typeof v === 'object' ? { ...v, rate: v.rate * f, mend: v.mend / f } : (v ?? DEFAULTS[st] ?? 0) * f;
    }
  }
  return stats;
}
const costMods = (type, army) => (DOCTRINE[army] ?? []).reduce((c, d) => Object.entries(d.costs ?? {}).reduce((c2, [k, f]) => (covers(k, type, type.stats) ? c2 * f : c2), c), 1);

/** What unit `type` costs `army`: the NVA's Feuerwalze makes its artillery cheaper. */
export const unitCost = (type, army) => Math.round((type.armyCost?.[army] ?? type.cost) * costMods(type, army) * // (an army's own price: the Germans' cheap Goliath in the mine clearers' slot)
   (ARTILLERY.has(type.id) ? armyDoctrine(army, 'walze')?.cost ?? 1 : 1) * (type.id === 'heavyTank' ? armyDoctrine(army, 'cats')?.cost ?? 1 : 1)
   * (type.id === 'reconVehicle' && type.stats?.cavalry ? armyDoctrine(army, 'lightHorse')?.cost ?? 1 : 1)
   * (type.id === 'tank' ? armyDoctrine(army, 'swarm')?.cost ?? 1 : 1)
   * (type.stats?.drone && type.stats.drone.kind !== 'recon' ? armyDoctrine(army, 'dronewar')?.cost ?? 1 : 1)); // (2027: Russia's drone war) // (France's Renault swarm, 1918) // (Bavaria's light horse, 1806) // (the NVA's Feuerwalze, the Wehrmacht's Big cats)

/** `game`'s doctrine `id` for `faction`, if its army has it (else undefined). */
export const doctrine = (game, faction, id) => DOCTRINE[game.armyOf?.(faction)]?.find((d) => d.id === id);
