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
import { buildFieldGun } from '../models/napGuns.js';

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

// ------------------------------------------------------------------ artillery
// kind 'gun': a piece and its team (models/napGuns.js), two to a battery. Limbered it moves behind
// its horses; it unlimbers to fire (stats.towed — Bavaria's quick guns: 40 % sooner). Roundshot
// flies flat, bounces and goes through the ranks (stats.gun.through / bounce: combat/ProjectileSystem);
// close in it fires canister, a spray of balls. The howitzers lob shells over cover.
const guns = (size) => Object.fromEntries(Object.entries(ARMY_KEY).map(([k, army]) => [k, () => buildFieldGun({ army, size })]));
const GUN = {
  armor: 0, hp: 320, turnRate: 0.7, turretRate: 0.5, radius: 1.6, height: 1.8, eyeHeight: 1.7, aimHeight: 1, fov: 2.4, nightSight: undefined,
  sight: 450, aggroRange: 750, fireCooldown: 1, aimTime: 1.2,   // (an officer with a telescope over open ground) burst: 1, burstInterval: 0, magSize: 1, spread: 0.01, boltSpeed: 240,
  boltSize: 1.3, tracer: 1, weapon: 'cannon', vsArmor: 1, pierce: 0, splash: 0, traverse: 0.35, noStabilizer: true, breakMorale: 0.28,
};
const gunType = (id, size, o) => ({
  id, category: 'fire', kind: 'gun', role: 'support', weaponSound: 'arty',
  formation: { count: 2, columns: 2, spacing: 9 },
  ...o,
  stats: { ...GUN, ...o.stats },
  models: guns(size),
});
const artillery = gunType('artillery', 'field', {
  name: 'Foot Battery', shortName: 'Battery', cost: 240,
  stats: { speed: 2.8, range: 700, preferredRange: 450, damage: 170, reloadTime: 18, towed: { deploy: 20 }, gun: { canister: 220, pellets: 16, pelletDamage: 75, pelletSpread: 0.07, through: 4, bounce: 2 } },
  variants: {
    nato: { name: 'Artillerie à pied', weapon: '8-pounder Gribeauval guns', text: 'Two French 8-pounders: roundshot that ploughs through the ranks at long range, canister that sweeps the field close in.' },
    by: { name: 'Fußartillerie', weapon: '6-pounder guns', text: 'Bavarian foot artillery, reformed and quick to come into action.' },
    pact: { name: 'Fußartillerie', weapon: '6-pounder guns', text: 'Prussian field guns: steady, but slow to move once unlimbered.' },
    sx: { name: 'Fußartillerie', weapon: '8-pounder guns', text: 'The Saxon foot artillery: few guns, well served.' },
  },
});
const spMortar = gunType('spMortar', 'heavy', {
  name: 'Heavy Battery', shortName: '12-pdr', cost: 320,
  stats: { hp: 380, speed: 2.2, range: 900, preferredRange: 600, damage: 230, reloadTime: 24, towed: { deploy: 30 }, gun: { canister: 250, pellets: 22, pelletDamage: 80, pelletSpread: 0.075, through: 5, bounce: 2 } },
  variants: {
    nato: { name: 'Batterie de 12', weapon: '12-pounder guns', text: '"The Emperor\'s beautiful daughters": the heavy 12-pounders that reach furthest and hit hardest — and move slowest.' },
    by: { name: 'Schwere Batterie', weapon: '12-pounder guns', text: 'Bavaria\'s heavy guns.' },
    pact: { name: 'Schwere Batterie', weapon: '12-pounder guns', text: 'The Prussian position guns: heavy, far-reaching, slow.' },
    sx: { name: 'Schwere Batterie', weapon: '12-pounder guns', text: 'The Saxon heavy guns.' },
  },
});
const rockets = gunType('rockets', 'horse', {
  name: 'Horse Artillery', shortName: 'Horse guns', cost: 280,
  stats: { speed: 4.6, range: 600, preferredRange: 380, damage: 140, reloadTime: 16, towed: { deploy: 10 }, gun: { canister: 200, pellets: 14, pelletDamage: 70, pelletSpread: 0.07, through: 3, bounce: 2 } },
  variants: {
    nato: { name: 'Artillerie à cheval', weapon: 'Light 6-pounders', text: 'Guns that keep up with the cavalry: every gunner mounted, in action in moments, gone again before the enemy answers.' },
    by: { name: 'Reitende Artillerie', weapon: 'Light 6-pounders', text: 'Bavaria\'s horse artillery.' },
    pact: { name: 'Reitende Artillerie', weapon: 'Light 6-pounders', text: 'Prussia\'s horse artillery, with the cavalry.' },
    sx: { name: 'Reitende Artillerie', weapon: 'Light guns', text: 'Saxony\'s horse artillery.' },
  },
});
const mortar = gunType('mortar', 'howitzer', {
  name: 'Howitzers', shortName: 'Howitzers', cost: 280,
  stats: { speed: 2.6, range: 850, minRange: 90, preferredRange: 500, damage: 190, splash: 6, reloadTime: 22, indirect: true, weapon: 'artillery', scatter: 18, towed: { deploy: 22 },
    gun: { canister: 160, pellets: 14, pelletDamage: 70, pelletSpread: 0.08, through: 0, bounce: 0 } },
  variants: {
    nato: { name: 'Obusiers', weapon: '6-inch howitzers', text: 'Short guns that throw explosive shells over walls and hedges onto troops in cover — and onto villages.' },
    by: { name: 'Haubitzen', weapon: '7-pounder howitzers', text: 'Bavarian howitzers: shells for troops behind cover.' },
    pact: { name: 'Haubitzen', weapon: '10-pounder howitzers', text: 'Prussian howitzers: shells over cover.' },
    sx: { name: 'Haubitzen', weapon: '8-pounder howitzers', text: 'Saxon howitzers.' },
  },
});

// the Guard (the once-a-battle support power: systems/Powers1806.js) — not bought, called
const guard = {
  ...rifles, id: 'guard', hidden: true, uncapped: true, name: 'The Guard', shortName: 'Guard', cost: 0,
  stats: { ...rifles.stats, hp: 120, breakMorale: 0.08, spread: 0.022, reloadTime: 14 },
  models: men({ kind: 'grenadier' }),
  variants: {
    nato: { name: 'Grenadiers de la Garde', weapon: 'Musket, bayonet', text: 'The Old Guard: veterans of every campaign in their bearskins. They do not break.' },
    by: { name: 'Leib-Regiment', weapon: 'Musket, bayonet', text: 'The Bavarian king\'s own regiment.' },
    pact: { name: 'Garde', weapon: 'Musket, bayonet', text: 'The Prussian Guard regiment.' },
    sx: { name: 'Leibgrenadiergarde', weapon: 'Musket, bayonet', text: 'The Saxon life grenadier guard.' },
  },
};

export const TYPES_1806 = {
  rifles, reconVehicle, ifv, tank, looseHorse, dismounted, artillery, spMortar, rockets, mortar, guard,
  bunker: T.bunker, strongpoint: T.strongpoint, hq: T.hq,   // (the fortifications: earthworks for now)
};

/** Everything not built yet fights as line infantry (ponytail: replaced as the roster grows). */
export const ALIAS_1806 = Object.fromEntries(Object.keys(T).filter((id) => !TYPES_1806[id]).map((id) => [id, 'rifles']));
