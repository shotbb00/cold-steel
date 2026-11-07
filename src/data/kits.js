// Squad kits: what a rifle squad takes into the field, picked in the reinforcement window before
// buying (ui/ReinforceWindow.js → the buy order's `k` → modes/shared.js makeBuyer → UnitStack.setKit).
// Same price: a trade, not an upgrade. `stats(s)` gives the changes on top of the squad's own stats;
// `carry` re-arms riflemen (not the squad's own specialist, its MG): `count` of them get `weapon`,
// shown in their hands (the type's kitModels[weapon], render/StackRenderer.js) — with the anti-tank
// kit only those men fire the squad's rockets (UnitStack.lightATAt).
export const KITS = {
  standard: { label: 'Standard', short: '', tip: 'Rifles, the squad\'s usual anti-tank rockets, grenades', stats: () => ({}) },
  at: {
    label: 'Anti-tank', short: 'AT', tip: 'Three men with anti-tank launchers (five rockets for the squad), one grenade a man',
    stats: () => ({ lightAT: 5, grenades: 1 }), carry: { weapon: 'at', count: 3 },
  },
  assault: {
    label: 'Assault', short: 'Assault', tip: 'Sub-machine guns and four grenades a man: quicker fire at shorter range, no rockets',
    stats: (s) => ({ grenades: 4, lightAT: 0, fireCooldown: s.fireCooldown * 0.75, range: s.range * 0.75, preferredRange: s.preferredRange * 0.6 }),
    carry: { weapon: 'smg', count: Infinity },
  },
};

/** Does this unit type take a kit? (The rifle squads: they have the models for it.) */
export const takesKit = (type) => type.kind === 'infantry' && !!type.kitModels;
