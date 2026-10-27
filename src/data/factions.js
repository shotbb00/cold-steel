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
