// Squad kits: what a rifle squad (any type carrying light anti-tank rockets, stats.lightAT) takes
// into the field, picked in the reinforcement window before buying (ui/ReinforceWindow.js →
// the buy order's `k` → modes/shared.js makeBuyer → UnitStack.setKit). Same price: a trade, not
// an upgrade. `stats(s)` gives the changes on top of the squad's own stats.
export const KITS = {
  standard: { label: 'Standard', short: '', tip: 'Rifles, two light anti-tank rockets, grenades', stats: () => ({}) },
  at: { label: 'Anti-tank', short: 'AT', tip: 'Five light anti-tank rockets, one grenade a man', stats: () => ({ lightAT: 5, grenades: 1 }) },
  assault: {
    label: 'Assault', short: 'Assault', tip: 'Four grenades a man, quicker fire at shorter range, no rockets',
    stats: (s) => ({ grenades: 4, lightAT: 0, fireCooldown: s.fireCooldown * 0.75, range: s.range * 0.75, preferredRange: s.preferredRange * 0.6 }),
  },
};

/** Does this unit type take a kit? */
export const takesKit = (type) => type.kind === 'infantry' && type.stats.lightAT > 0;
