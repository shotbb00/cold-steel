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
export function armiesFrom(o) {
  const out = { ...DEFAULT_ARMY };
  for (const f of Object.keys(DEFAULT_ARMY)) if (ARMIES[o?.[f]]?.faction === f) out[f] = o[f];
  return out;
}

/** A per-side table's entry for `army` of `faction` (table[army], else table[faction]). */
export const forArmy = (table, army, faction) => table?.[army] ?? table?.[faction];

/** The key a unit type's own art is filed under for this army: the army's if it has a model, else the side's. */
export const artKey = (type, army, faction) => (type.models?.[army] ? army : faction);
