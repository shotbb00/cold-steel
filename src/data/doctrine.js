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
};

export const ARTILLERY = new Set(['artillery', 'rockets', 'spMortar', 'mortar']);

/** An army's doctrine `id`, if it has it. */
export const armyDoctrine = (army, id) => DOCTRINE[army]?.find((d) => d.id === id);

/** What unit `type` costs `army`: the NVA's Feuerwalze makes its artillery cheaper. */
export const unitCost = (type, army) => Math.round(type.cost * (ARTILLERY.has(type.id) ? armyDoctrine(army, 'walze')?.cost ?? 1 : 1) * (type.id === 'heavyTank' ? armyDoctrine(army, 'cats')?.cost ?? 1 : 1)); // (the NVA's Feuerwalze, the Wehrmacht's Big cats)

/** `game`'s doctrine `id` for `faction`, if its army has it (else undefined). */
export const doctrine = (game, faction, id) => DOCTRINE[game.armyOf?.(faction)]?.find((d) => d.id === id);
