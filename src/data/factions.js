// Factions of a Cold War gone hot (1985). Team colours: NATO blue, Warsaw Pact red — used for
// the HUD, flags, minimap and the small identification markings on soldiers and vehicles.
// Uniforms and vehicle camouflage are realistic and live in the models (data/models/).
export const FACTIONS = {
  nato: {
    id: 'nato',
    name: 'NATO',
    enemyOf: 'pact',
    color: 0x3f7fe0,   // team colour
    glow: 0x4a9bff,    // HUD / flags / minimap
    marking: 0x2f6fe0, // identification markings on models (armbands, turret panels)
    bolt: 0xff6a3a,    // tracers: red-orange
    css: '#6fa8ff',    // interface colour (HUD, labels) when this side is yours or the enemy
  },
  pact: {
    id: 'pact',
    name: 'Warsaw Pact',
    enemyOf: 'nato',
    color: 0xd23a2a,
    glow: 0xff4a3a,
    marking: 0xc8261e, // red stars and armbands
    bolt: 0x8cff5a,    // tracers: green
    css: '#ff5a48',
  },
};

export const PLAYER_FACTION = 'nato'; // default side (the main menu lets you pick)

export const enemyOf = (factionId) => FACTIONS[factionId].enemyOf;

// Armies: each side fields one of two — NATO the US Army or the Bundeswehr, the Pact the Soviet
// Army or the NVA — picked before the battle (game.armies). A unit type's per-side tables
// (models, specialistModels, factionStats, variants) may have an entry per army (`bw`, `nva`);
// without one the side's entry is used (forArmy), so an army can grow its own roster type by type.
export const ARMIES = {
  us: { id: 'us', faction: 'nato', name: 'US Army' },
  bw: { id: 'bw', faction: 'nato', name: 'Bundeswehr' },
  sov: { id: 'sov', faction: 'pact', name: 'Soviet Army' },
  nva: { id: 'nva', faction: 'pact', name: 'NVA' },
};
export const DEFAULT_ARMY = { nato: 'us', pact: 'sov' };

/** The two sides' armies from a choice like { nato: 'bw' } (anything unknown: the default). */
/**
 * The armies the two sides field, from what was picked (`o`): any of the side's armies — on `map` one that
 * fits it (the Pacific's armies on its land maps, `map.pacific`, and only there; at sea each side's navy).
 */
/** Does army `a` (ARMIES entry) fight in region `reg` when the maps there don't name their armies: its `regions`, else the Pacific's only there and the rest everywhere else. */
export const armyIn = (a, reg) => !a.coastal && (a.regions ? a.regions.includes(reg) : !!a.pacific === (reg === 'pacific'));

export function armiesFrom(o, map = null) {
  const fits = (a) => !map || map.theatre === 'sea' || (ARMIES[a]?.regions ? ARMIES[a].regions.includes(map.region ?? 'europe') : !!ARMIES[a]?.pacific === !!map.pacific);
  const out = {};
  for (const f of Object.keys(DEFAULT_ARMY)) {
    const want = ARMIES[o?.[f]]?.faction === f ? o[f] : DEFAULT_ARMY[f];
    out[f] = fits(want) ? want : Object.keys(ARMIES).find((a) => ARMIES[a].faction === f && fits(a)) ?? want;
  }
  return out;
}

/** May `army` field unit type `t`: the type's own army list (the NVA's Kampfgruppe), and an army with only its own roster (Japan) only what was written for it. */
export const armyHas = (t, army) => (!t.armies || t.armies.includes(army)) && (!ARMIES[army]?.own || !!t.variants?.[army]);

/** A per-side table's entry for `army` of `faction` (table[army], else table[faction]). */
export const forArmy = (table, army, faction) => table?.[army] ?? table?.[faction];

/** The key a unit type's own art is filed under for this army: the army's if it has a model, else the side's. */
export const artKey = (type, army, faction) => (type.models?.[army] ? army : faction);
