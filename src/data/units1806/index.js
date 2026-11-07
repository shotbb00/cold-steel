// The 1806 roster (data/epoch.js): the Jena–Auerstedt campaign, France and Bavaria against Prussia
// and Saxony. Variants and models are keyed `nato` (France), `by` (Bavaria), `pact` (Prussia),
// `sx` (Saxony). Like 1945, each type keeps a 1985 id so the modes, maps and the AI work; what
// this epoch doesn't have yet stands in through ALIAS_1806 (units/index.js typeOf).
//   drill:  the men keep their places in the ranks (no cover seeking: ai/SoldierAI.js)
//   stance: 'stand' — they stand to fire and to take fire, as the era fought
//   volley: they fire together on the word, then reload (UnitStack.volley); every volley leaves a
//           bank of powder smoke in front of the company
// Phase 1: the line infantry. Next: formations, cavalry, artillery (see the 1806 design notes).
import { TYPES_1985 } from '../units/index.js';
import { buildNapSoldier } from '../models/napSoldier.js';

const T = TYPES_1985;
const men = (o = {}) => ({
  nato: () => buildNapSoldier({ army: 'fr', ...o }), by: () => buildNapSoldier({ army: 'by', ...o }),
  pact: () => buildNapSoldier({ army: 'pr', ...o }), sx: () => buildNapSoldier({ army: 'sx', ...o }),
});

/** Smoothbore musket and drill, shared by the foot. */
const MUSKET = {
  hp: 100, grenades: 0, lightAT: 0, nightSight: undefined,
  speed: 1.6,              // the marching pace (the charge runs ~1.6×)
  sight: 250, range: 130, aggroRange: 135, preferredRange: 75,   // (massed coloured coats: seen far off; the musket reaches a hundred-odd paces)
  fireCooldown: 0.5, aimTime: 0.5, burst: 1, burstInterval: 0,
  damage: 120, spread: 0.03, boltSpeed: 300, boltSize: 0.5, tracer: 0,
  magSize: 1, reloadTime: 17,   // three rounds a minute, from a drilled company
  stance: 'stand', drill: true, leash: 0, volley: true, weapon: 'musket',
  formations: true, bayonet: 110,   // line / column / square / skirmish (data/formations.js); the bayonet hand to hand
  breakMorale: 0.22, playerFireInterval: 17,
  muzzle: { x: 0.2, y: 1.335, z: 1.3 },
};

const rifles = {
  ...T.rifles,
  name: 'Line Infantry', shortName: 'Line',
  formation: { count: 24, columns: 12, spacing: 0.95 },  // two ranks, shoulder to shoulder
  stats: { ...T.rifles.stats, ...MUSKET },
  weaponSound: 'musket',
  models: men(),
  variants: {
    nato: { name: 'Fusiliers de ligne', weapon: 'Charleville musket, bayonet', text: 'The French line infantry: a company in two ranks. Volleys at a hundred paces, then the bayonet.' },
    by: { name: 'Linien-Infanterie', weapon: 'Musket, bayonet', text: 'Bavarian line infantry in cornflower blue and the crested Raupenhelm, newly reformed and Napoleon\'s allies.' },
    pact: { name: 'Musketiere', weapon: 'Potsdam musket, bayonet', text: 'The Prussian musketeers of Frederick\'s army: drilled to fire faster than anyone, in long straight lines.' },
    sx: { name: 'Linien-Infanterie', weapon: 'Musket, bayonet', text: 'Saxon line infantry in white coats: few, steady, and Prussia\'s ally in 1806.' },
  },
};

export const TYPES_1806 = {
  rifles,
  bunker: T.bunker, strongpoint: T.strongpoint, hq: T.hq,   // (the fortifications: earthworks for now)
};

/** Everything not built yet fights as line infantry (ponytail: replaced as the roster grows). */
export const ALIAS_1806 = Object.fromEntries(Object.keys(T).filter((id) => !TYPES_1806[id]).map((id) => [id, 'rifles']));
