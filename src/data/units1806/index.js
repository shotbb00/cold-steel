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
import { buildCavalry, buildCavalryFoot } from '../models/napCavalry.js';

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
  damage: 120, spread: 0.03, boltSpeed: 300, boltSize: 0.5, tracer: 0, vsArmor: 1, // (no armour in 1806: a ball fells horse or man)
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

// ------------------------------------------------------------------ cavalry
// kind 'cavalry': drawn like vehicles (one rig per trooper: render/RigRenderer.js), no cover. Their
// weapon is the charge (UnitStack.startCharge): at the gallop into the enemy, the shock to its nerve,
// then the sabres; a square stops them. Pistols and carbines for close range. A trooper's death may
// leave a loose horse or a man on foot (UnitStack.unhorse).
const ARMY_KEY = { nato: 'fr', by: 'by', pact: 'pr', sx: 'sx' };
const mounts = (kind, mounted = true) => Object.fromEntries(Object.entries(ARMY_KEY).map(([k, army]) => [k, () => buildCavalry({ army, kind, mounted })]));
const HORSE = {
  armor: 0, turnRate: 2.6, turretRate: 3, radius: 0.85, height: 2.6, eyeHeight: 2.5, aimHeight: 1.6, fov: 2.6, nightSight: undefined,
  aggroRange: 150, preferredRange: 18, fireCooldown: 1, aimTime: 0.4, burst: 1, burstInterval: 0, spread: 0.06, boltSpeed: 280,
  boltSize: 0.5, tracer: 0, magSize: 1, weapon: 'musket', vsArmor: 1, pierce: 0, breakMorale: 0.25, noStabilizer: false,
};
const cavalry = (id, kind, o) => ({
  id, category: 'cavalry', kind: 'cavalry', role: 'frontline', weaponSound: 'musket',
  formation: { count: 12, columns: 6, spacing: 2.6 },   // two ranks, knee to knee
  ...o,
  stats: { ...HORSE, ...o.stats },
  models: mounts(kind),
});

const reconVehicle = cavalry('reconVehicle', 'light', {
  name: 'Light Cavalry', shortName: 'Light horse', cost: 220,
  stats: { hp: 140, speed: 4.6, sight: 280, range: 35, damage: 90, reloadTime: 30, cavalry: { chargeSpeed: 11.5, shock: 0.25, sabre: 105, reach: 2.8 } },
  variants: {
    nato: { name: 'Hussards', weapon: 'Sabre, pistols, carbine', text: 'The French hussars: fast, bold and far ahead of the army. They find the enemy, ride down his skirmishers and pursue the broken.' },
    by: { name: 'Chevaulegers', weapon: 'Sabre, carbine', text: 'Bavaria\'s light horse in green: the eyes of the army and quick to pursue.' },
    pact: { name: 'Husaren', weapon: 'Sabre, carbine', text: 'The Prussian hussars: scouts and raiders, the pride of Frederick\'s cavalry.' },
    sx: { name: 'Husaren', weapon: 'Sabre, carbine', text: 'The Saxon hussars in light blue: few, but well mounted.' },
  },
});
const ifv = cavalry('ifv', 'medium', {
  name: 'Dragoons', shortName: 'Dragoons', cost: 260,
  stats: { hp: 160, speed: 4.2, sight: 220, range: 90, damage: 110, reloadTime: 22, cavalry: { chargeSpeed: 10.5, shock: 0.33, sabre: 120, reach: 2.8 } },
  variants: {
    nato: { name: 'Dragons', weapon: 'Sabre, dragoon musket', text: 'The French dragoons in green and their brass helmets: they charge like any horsemen, and their muskets reach further than a carbine.' },
    by: { name: 'Dragoner', weapon: 'Sabre, carbine', text: 'Bavarian dragoons: the line cavalry of Napoleon\'s new ally.' },
    pact: { name: 'Dragoner', weapon: 'Sabre, carbine', text: 'The Prussian dragoons in light blue: heavy enough to charge, quick enough to scout.' },
    sx: { name: 'Chevauxlegers', weapon: 'Sabre, carbine', text: 'The Saxon light dragoons in red coats.' },
  },
});
const tank = cavalry('tank', 'heavy', {
  name: 'Heavy Cavalry', shortName: 'Cuirassiers', cost: 320,
  stats: { hp: 190, speed: 3.9, sight: 200, range: 25, damage: 100, reloadTime: 30, cavalry: { chargeSpeed: 10, shock: 0.45, sabre: 140, reach: 2.9 } },
  variants: {
    nato: { name: 'Cuirassiers', weapon: 'Straight sword, pistols, cuirass', text: 'The French heavy cavalry in steel breastplates: big men on big horses, kept for the charge that decides the day.' },
    by: { name: 'Garde du Corps', weapon: 'Sword, pistols, cuirass', text: 'The Bavarian king\'s horse guards in their cuirasses: few and heavy.' },
    pact: { name: 'Kürassiere', weapon: 'Pallasch, pistols', text: 'The Prussian cuirassiers in their white kollets: the heavy fist of Frederick\'s cavalry.' },
    sx: { name: 'Kürassiere', weapon: 'Pallasch, pistols', text: 'The Saxon heavy horse in straw-yellow: few, steady and dangerous in the charge.' },
  },
});

// what a trooper's death can leave behind (UnitStack.unhorse): not bought, not commanded
const looseHorse = {
  id: 'looseHorse', name: 'Loose horse', shortName: 'Horse', hidden: true, uncapped: true, category: 'other', kind: 'cavalry', role: 'support', cost: 0,
  formation: { count: 1, columns: 1, spacing: 1 },
  stats: { ...HORSE, hp: 90, speed: 2, sight: 60, fov: 6.2, range: 1, damage: 0, reloadTime: 1, weapon: undefined, loose: true, breakMorale: undefined },
  models: mounts('light', false),
  variants: { nato: { name: 'Loose horse', text: 'Its rider is down: it bolts from the fire and wanders.' } },
};
const dismounted = {
  id: 'dismounted', name: 'Dismounted troopers', shortName: 'On foot', hidden: true, uncapped: true, category: 'other', kind: 'infantry', role: 'support', cost: 0,
  formation: { count: 1, columns: 1, spacing: 1.5 },
  stats: { ...T.rifles.stats, ...MUSKET, drill: false, volley: false, stance: 'crouch', leash: 6, speed: 1.4, range: 30, damage: 80, reloadTime: 25, breakMorale: 0.5, dismounted: true },
  weaponSound: 'musket',
  models: Object.fromEntries(Object.entries(ARMY_KEY).map(([k, army]) => [k, () => buildCavalryFoot({ army, kind: 'medium' })])),
  variants: { nato: { name: 'Dismounted troopers', text: 'His horse went down: he looks for another, or makes his way back.' } },
};

export const TYPES_1806 = {
  rifles, reconVehicle, ifv, tank, looseHorse, dismounted,
  bunker: T.bunker, strongpoint: T.strongpoint, hq: T.hq,   // (the fortifications: earthworks for now)
};

/** Everything not built yet fights as line infantry (ponytail: replaced as the roster grows). */
export const ALIAS_1806 = Object.fromEntries(Object.keys(T).filter((id) => !TYPES_1806[id]).map((id) => [id, 'rifles']));
