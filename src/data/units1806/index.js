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
import { buildWagon } from '../models/napWagons.js';
import { SHIPS_1806 } from './ships.js';

const T = TYPES_1985;
const men = (o = {}) => ({
  nato: () => buildNapSoldier({ army: 'fr', ...o }), by: () => buildNapSoldier({ army: 'by', ...o }),
  pact: () => buildNapSoldier({ army: 'pr', ...o }), sx: () => buildNapSoldier({ army: 'sx', ...o }),
  gb: () => buildNapSoldier({ army: 'gb', ...o }),
});

/** Smoothbore musket and drill, shared by the foot. */
const MUSKET = {
  hp: 100, grenades: 0, lightAT: 0, nightSight: undefined, smoke: undefined,
  speed: 1.6,              // the marching pace (the charge runs ~1.6×)
  sight: 110, range: 80, aggroRange: 85, preferredRange: 50,   // (the game's scale: a 1985 rifle squad sees 70 m and shoots 90; massed coloured coats are seen a little further, the musket reaches less)
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
const ARMY_KEY = { nato: 'fr', by: 'by', pact: 'pr', sx: 'sx', gb: 'gb' };
const mounts = (kind, mounted = true) => Object.fromEntries(Object.entries(ARMY_KEY).map(([k, army]) => [k, () => buildCavalry({ army, kind, mounted })]));
const HORSE = {
  armor: 0, turnRate: 2.6, turretRate: 3, radius: 0.85, height: 2.6, eyeHeight: 2.5, aimHeight: 1.6, fov: 2.6, nightSight: undefined,
  aggroRange: 100, preferredRange: 18, fireCooldown: 1, aimTime: 0.4, burst: 1, burstInterval: 0, spread: 0.06, boltSpeed: 280,
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
  stats: { hp: 140, speed: 4.6, sight: 140, range: 35, damage: 90, reloadTime: 30, cavalry: { chargeSpeed: 11.5, shock: 0.25, sabre: 105, reach: 2.8 } },
  variants: {
    nato: { name: 'Hussards', weapon: 'Sabre, pistols, carbine', text: 'The French hussars: fast, bold and far ahead of the army. They find the enemy, ride down his skirmishers and pursue the broken.' },
    by: { name: 'Chevaulegers', weapon: 'Sabre, carbine', text: 'Bavaria\'s light horse in green: the eyes of the army and quick to pursue.' },
    pact: { name: 'Husaren', weapon: 'Sabre, carbine', text: 'The Prussian hussars: scouts and raiders, the pride of Frederick\'s cavalry.' },
    sx: { name: 'Husaren', weapon: 'Sabre, carbine', text: 'The Saxon hussars in light blue: few, but well mounted.' },
  },
});
const ifv = cavalry('ifv', 'medium', {
  name: 'Dragoons', shortName: 'Dragoons', cost: 260,
  stats: { hp: 160, speed: 4.2, sight: 120, range: 60, damage: 110, reloadTime: 22, cavalry: { chargeSpeed: 10.5, shock: 0.33, sabre: 120, reach: 2.8 } },
  variants: {
    nato: { name: 'Dragons', weapon: 'Sabre, dragoon musket', text: 'The French dragoons in green and their brass helmets: they charge like any horsemen, and their muskets reach further than a carbine.' },
    by: { name: 'Dragoner', weapon: 'Sabre, carbine', text: 'Bavarian dragoons: the line cavalry of Napoleon\'s new ally.' },
    pact: { name: 'Dragoner', weapon: 'Sabre, carbine', text: 'The Prussian dragoons in light blue: heavy enough to charge, quick enough to scout.' },
    sx: { name: 'Chevauxlegers', weapon: 'Sabre, carbine', text: 'The Saxon light dragoons in red coats.' },
  },
});
const tank = cavalry('tank', 'heavy', {
  name: 'Heavy Cavalry', shortName: 'Cuirassiers', cost: 320,
  stats: { hp: 190, speed: 3.9, sight: 110, range: 25, damage: 100, reloadTime: 30, cavalry: { chargeSpeed: 10, shock: 0.45, sabre: 140, reach: 2.9 } },
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
  sight: 120, aggroRange: 350, fireCooldown: 1, aimTime: 1.2,   // (the gunners see little further than the foot; the rest comes from whoever spots for them)
  burst: 1, burstInterval: 0, magSize: 1, spread: 0.01, boltSpeed: 240,
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
  stats: { speed: 2.8, range: 280, preferredRange: 200, damage: 170, reloadTime: 18, towed: { deploy: 20 }, gun: { canister: 100, pellets: 16, pelletDamage: 75, pelletSpread: 0.07, through: 4, bounce: 2 } },
  variants: {
    nato: { name: 'Artillerie à pied', weapon: '8-pounder Gribeauval guns', text: 'Two French 8-pounders: roundshot that ploughs through the ranks at long range, canister that sweeps the field close in.' },
    by: { name: 'Fußartillerie', weapon: '6-pounder guns', text: 'Bavarian foot artillery, reformed and quick to come into action.' },
    pact: { name: 'Fußartillerie', weapon: '6-pounder guns', text: 'Prussian field guns: steady, but slow to move once unlimbered.' },
    sx: { name: 'Fußartillerie', weapon: '8-pounder guns', text: 'The Saxon foot artillery: few guns, well served.' },
  },
});
const spMortar = gunType('spMortar', 'heavy', {
  name: 'Heavy Battery', shortName: '12-pdr', cost: 320,
  stats: { hp: 380, speed: 2.2, range: 340, preferredRange: 250, damage: 230, reloadTime: 24, towed: { deploy: 30 }, gun: { canister: 110, pellets: 22, pelletDamage: 80, pelletSpread: 0.075, through: 5, bounce: 2 } },
  variants: {
    nato: { name: 'Batterie de 12', weapon: '12-pounder guns', text: '"The Emperor\'s beautiful daughters": the heavy 12-pounders that reach furthest and hit hardest — and move slowest.' },
    by: { name: 'Schwere Batterie', weapon: '12-pounder guns', text: 'Bavaria\'s heavy guns.' },
    pact: { name: 'Schwere Batterie', weapon: '12-pounder guns', text: 'The Prussian position guns: heavy, far-reaching, slow.' },
    sx: { name: 'Schwere Batterie', weapon: '12-pounder guns', text: 'The Saxon heavy guns.' },
  },
});
const rockets = gunType('rockets', 'horse', {
  name: 'Horse Artillery', shortName: 'Horse guns', cost: 280,
  stats: { speed: 4.6, range: 240, preferredRange: 170, damage: 140, reloadTime: 16, towed: { deploy: 10 }, gun: { canister: 90, pellets: 14, pelletDamage: 70, pelletSpread: 0.07, through: 3, bounce: 2 } },
  variants: {
    nato: { name: 'Artillerie à cheval', weapon: 'Light 6-pounders', text: 'Guns that keep up with the cavalry: every gunner mounted, in action in moments, gone again before the enemy answers.' },
    by: { name: 'Reitende Artillerie', weapon: 'Light 6-pounders', text: 'Bavaria\'s horse artillery.' },
    pact: { name: 'Reitende Artillerie', weapon: 'Light 6-pounders', text: 'Prussia\'s horse artillery, with the cavalry.' },
    sx: { name: 'Reitende Artillerie', weapon: 'Light guns', text: 'Saxony\'s horse artillery.' },
  },
});
const mortar = gunType('mortar', 'howitzer', {
  name: 'Howitzers', shortName: 'Howitzers', cost: 280,
  stats: { speed: 2.6, range: 300, minRange: 60, preferredRange: 220, damage: 190, splash: 6, reloadTime: 22, indirect: true, weapon: 'artillery', scatter: 18, towed: { deploy: 22 },
    gun: { canister: 80, pellets: 14, pelletDamage: 70, pelletSpread: 0.08, through: 0, bounce: 0 } },
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

// ------------------------------------------------------------------ the rest of the foot
const foot = (id, kind, o) => ({
  ...T[id], ...o, id, kind: 'infantry', category: 'infantry', weaponSound: 'musket',
  stats: { ...T.rifles.stats, ...MUSKET, ...o.stats },
  models: men({ kind }),
});
const mgTeam = foot('mgTeam', 'light', {
  name: 'Light Infantry', shortName: 'Light', cost: 140, light: true,   // (light: they skirmish by default, ai/FrontlineDirector.drill)
  formation: { count: 20, columns: 10, spacing: 0.95 },
  specialist: undefined, specialistModels: undefined,
  stats: { speed: 1.8, spread: 0.026, sight: 120, formations: true, bayonet: 100 },
  variants: {
    nato: { name: 'Voltigeurs', weapon: 'Light musket, bayonet', text: 'The French light infantry: a cloud of skirmishers ahead of the columns, shooting the enemy\'s officers and gunners before the line comes on.' },
    by: { name: 'Leichte Infanterie', weapon: 'Musket, bayonet', text: 'Bavaria\'s light battalions in green: skirmishers in front of the line.' },
    pact: { name: 'Füsiliere', weapon: 'Musket, bayonet', text: 'The Prussian fusiliers in green: the army\'s light infantry, trained to fight in open order.' },
    sx: { name: 'Schützen', weapon: 'Musket, bayonet', text: 'Saxon light troops in green.' },
  },
});
const atTeam = foot('atTeam', 'grenadier', {
  name: 'Grenadiers', shortName: 'Grenadiers', cost: 190,
  formation: { count: 24, columns: 12, spacing: 0.95 },
  specialist: undefined, specialistModels: undefined,
  stats: { hp: 110, breakMorale: 0.15, formations: true, bayonet: 135, lightAT: 0 },
  variants: {
    nato: { name: 'Grenadiers', weapon: 'Musket, bayonet, sabre', text: 'The tallest and steadiest men of every battalion, in their bearskins: first into the assault, last to give way.' },
    by: { name: 'Grenadiere', weapon: 'Musket, bayonet', text: 'Bavarian grenadiers, the elite of their regiments.' },
    pact: { name: 'Grenadiere', weapon: 'Musket, bayonet', text: 'Prussian grenadiers: picked men, massed for the decisive attack.' },
    sx: { name: 'Grenadiere', weapon: 'Musket, bayonet', text: 'The Saxon grenadiers who left the field at Jena in square.' },
  },
});
const sniper = foot('sniper', 'rifle', {
  name: 'Riflemen', shortName: 'Riflemen', cost: 180,
  formation: { count: 8, columns: 4, spacing: 3 },
  specialist: undefined, specialistModels: undefined,
  stats: { drill: false, volley: false, stance: 'crouch', leash: 10, formations: false, marksman: true, scope: 0.3, stealth: 0.75,
    sight: 130, range: 150, aggroRange: 155, preferredRange: 120, damage: 130, spread: 0.008, reloadTime: 35, aimTime: 1.5, boltSpeed: 330 },
  variants: {
    nato: { name: 'Carabiniers', weapon: 'Rifled carbine', text: 'The light infantry\'s picked marksmen: few rifles, slow to load, deadly at range — they go for the officers.' },
    by: { name: 'Scharfschützen', weapon: 'Rifle', text: 'Bavarian marksmen with rifles.' },
    pact: { name: 'Feldjäger', weapon: 'Jäger rifle', text: 'Prussian foresters and huntsmen in green with rifled guns: they pick off officers and gunners from cover.' },
    sx: { name: 'Feldjäger', weapon: 'Jäger rifle', text: 'The Saxon Jäger company: huntsmen with rifles.' },
  },
});
const engineers = foot('engineers', 'pioneer', {
  name: 'Pioneers', shortName: 'Pioneers', cost: 150,
  formation: { count: 12, columns: 6, spacing: 1.4 },
  specialist: undefined, specialistModels: undefined,
  stats: { ...T.engineers.stats, ...MUSKET, drill: false, volley: false, stance: 'crouch', leash: 8, formations: false, engineer: true, range: 70 },
  variants: {
    nato: { name: 'Sapeurs', weapon: 'Musket, axe', text: 'The sappers with their axes and aprons: earthworks for the guns, breastworks for the foot, a way through hedges and walls — and bridges to blow.' },
    by: { name: 'Pioniere', weapon: 'Musket, axe', text: 'Bavarian pioneers: earthworks and bridges.' },
    pact: { name: 'Pioniere', weapon: 'Musket, axe', text: 'Prussian pioneers: field works and demolitions.' },
    sx: { name: 'Pioniere', weapon: 'Musket, axe', text: 'Saxon pioneers.' },
  },
});
const observers = foot('observers', 'officer', {
  name: 'Artillery Officers', shortName: 'Officers', cost: 120,
  formation: { count: 2, columns: 2, spacing: 3 },
  specialist: undefined, specialistModels: undefined,
  stats: { ...T.observers.stats, drill: false, volley: false, stance: 'crouch', leash: 6, formations: false, sight: 180, range: 1, damage: 0, smoke: undefined },
  variants: {
    nato: { name: 'Officiers d\'artillerie', weapon: 'Telescope, sword', text: 'Gunner officers with telescopes on a height: every gun and howitzer of yours lands tight on what they can see.' },
    by: { name: 'Artillerieoffiziere', weapon: 'Telescope, sword', text: 'Artillery officers with their telescopes.' },
    pact: { name: 'Artillerieoffiziere', weapon: 'Telescope, sword', text: 'Artillery officers with their telescopes.' },
    sx: { name: 'Artillerieoffiziere', weapon: 'Telescope, sword', text: 'Artillery officers with their telescopes.' },
  },
});

// ------------------------------------------------------------------ the wagons
// kind 'wagon' (render/RigRenderer.js, models/napWagons.js): a pair of horses and a driver, no weapon
const wagons = (kind) => Object.fromEntries(Object.entries(ARMY_KEY).map(([k, army]) => [k, () => buildWagon({ army, kind })]));
const WAGON = {
  armor: 0, hp: 220, speed: 2.8, turnRate: 1, turretRate: 1, radius: 1.6, height: 2.4, eyeHeight: 2.2, aimHeight: 1.2, sight: 70, fov: 3,
  range: 1, damage: 0, fireCooldown: 1, magSize: 1, reloadTime: 1, vsArmor: 1, weapon: undefined, nightSight: undefined, wagon: true, smoke: undefined,
};
const wagon = (id, kind, o) => ({
  ...T[id], ...o, id, kind: 'wagon', category: 'support', engine: undefined, weaponSound: undefined,
  formation: { count: 1, columns: 1, spacing: 10 },
  stats: { ...T[id].stats, ...WAGON, ...o.stats },
  models: wagons(kind),
});
const jammer = wagon('jammer', 'ammo', {
  name: 'Ammunition Wagon', shortName: 'Ammunition', cost: 120,
  stats: { jammer: undefined, supply: { deploy: 4, radius: 60, restock: 0.25 } },
  variants: {
    nato: { name: 'Caisson', weapon: 'Cartridges, men', text: 'The ammunition wagon: companies within 60 m take in new men (Refill) and refill their pouches.' },
    by: { name: 'Munitionswagen', weapon: 'Cartridges', text: 'Companies within 60 m refill.' },
    pact: { name: 'Munitionswagen', weapon: 'Cartridges', text: 'Companies within 60 m refill.' },
    sx: { name: 'Munitionswagen', weapon: 'Cartridges', text: 'Companies within 60 m refill.' },
  },
});
const ambulance = wagon('ambulance', 'ambulance', {
  name: 'Ambulance', shortName: 'Ambulance', cost: 100,
  variants: {
    nato: { name: 'Ambulance volante', weapon: 'Surgeons, litters', text: 'Larrey\'s "flying ambulance": light wagons that fetch the wounded from the field under fire. Wounded men near it are patched up and go back to the line.' },
    by: { name: 'Feldspitalwagen', weapon: 'Surgeons', text: 'The field hospital wagon: wounded men near it go back to the line.' },
    pact: { name: 'Feldlazarettwagen', weapon: 'Surgeons', text: 'The field hospital wagon: wounded men near it go back to the line.' },
    sx: { name: 'Feldspitalwagen', weapon: 'Surgeons', text: 'The field hospital wagon: wounded men near it go back to the line.' },
  },
});
const commandPost = wagon('commandPost', 'hq', {
  name: 'Headquarters', shortName: 'HQ', cost: 160, limit: 1, // (one a side on the field at a time)
  variants: {
    nato: { name: 'État-major', weapon: 'Aides, couriers', text: 'The marshal\'s staff: set up behind the front (the tent goes up), and your reinforcements come forward to it; troops near it hold their nerve.' },
    by: { name: 'Divisionsstab', weapon: 'Aides, couriers', text: 'The division\'s staff: reinforcements come forward to it.' },
    pact: { name: 'Generalstab', weapon: 'Aides, couriers', text: 'The general\'s staff: reinforcements come forward to it.' },
    sx: { name: 'Generalstab', weapon: 'Aides, couriers', text: 'The general\'s staff: reinforcements come forward to it.' },
  },
});
const bridgeLayer = wagon('bridgeLayer', 'pontoon', {
  name: 'Pontoon Train', shortName: 'Pontoons', cost: 140,
  variants: {
    nato: { name: 'Pontonniers', weapon: 'Pontoon bridge', text: 'The pontoon wagons: a bridge of boats over the river where none stood.' },
    by: { name: 'Brückentrain', weapon: 'Pontoon bridge', text: 'A bridge of boats over the river.' },
    pact: { name: 'Pontontrain', weapon: 'Pontoon bridge', text: 'A bridge of boats over the river.' },
    sx: { name: 'Brückentrain', weapon: 'Pontoon bridge', text: 'A bridge of boats over the river.' },
  },
});

// ------------------------------------------------------------------ the British (Egypt 1801)
// Abercromby's army at Aboukir (data/epoch.js 'gb', the coastal battle only): each type's British name
// and look. The Highlanders take the grenadiers' place, the Foot Guards the Guard's.
const GB = {
  rifles: { name: 'Regiment of Foot', weapon: 'India Pattern musket, bayonet', text: 'The British line infantry in red: two ranks, not three, so every musket fires. Steady volleys, then the bayonet.' },
  mgTeam: { name: 'Light Infantry', weapon: 'Light musket, bayonet', text: 'The light companies, the "light bobs": out in front in open order, shooting the enemy\'s skirmishers and gunners.' },
  atTeam: { name: 'Highlanders', weapon: 'Musket, bayonet', text: 'The 42nd Black Watch and the Gordon Highlanders in kilt and feather bonnet: first up the sand hills, last to give way.' },
  sniper: { name: 'Riflemen', weapon: 'Baker rifle', text: 'The new Rifle Corps in green: rifles that reach twice as far as a musket, slow to load, aimed at officers and gunners.' },
  engineers: { name: 'Royal Military Artificers', weapon: 'Musket, pick, axe', text: 'The engineers\' working men: breastworks on the sand, a way through the abatis, gun platforms on the beach.' },
  observers: { name: 'Royal Artillery officers', weapon: 'Telescope, sword', text: 'Gunner officers with their telescopes: every gun of yours lands tight on what they can see.' },
  guard: { name: 'Foot Guards', weapon: 'Musket, bayonet', text: 'The Brigade of Guards, the Coldstream and the Third: picked men who do not break.' },
  reconVehicle: { name: 'Light Dragoons', weapon: 'Sabre, carbine', text: 'The 12th and 26th Light Dragoons in their Tarleton helmets: few horses, and every one of them shipped from Malta.' },
  ifv: { name: 'Dragoons', weapon: 'Sabre, carbine', text: 'British dragoons in red: line cavalry, heavy enough to charge.' },
  tank: { name: 'Dragoon Guards', weapon: 'Heavy sword, pistols', text: 'The heavy cavalry of the line on big English horses: the charge that decides the day.' },
  artillery: { name: 'Royal Artillery', weapon: '6-pounder guns', text: 'The field guns, hauled through the sand by sailors as often as by horses.' },
  spMortar: { name: 'Royal Artillery, 12-pounders', weapon: '12-pounder guns', text: 'The heavy guns: far-reaching and slow, and harder still to land.' },
  rockets: { name: 'Royal Horse Artillery', weapon: 'Light 6-pounders', text: 'Guns that keep up with the cavalry: in action in moments.' },
  mortar: { name: 'Howitzers', weapon: '5½-inch howitzers', text: 'Shells over the sand hills onto troops behind them.' },
  jammer: { name: 'Ammunition cart', weapon: 'Cartridges, men', text: 'Companies within 60 m take in new men and refill their pouches.' },
  ambulance: { name: 'Hospital wagon', weapon: 'Surgeons', text: 'Wounded men near it are patched up and go back to the line.' },
  commandPost: { name: 'Headquarters', weapon: 'Aides, couriers', text: 'Abercromby\'s staff: reinforcements come forward to it; troops near it hold their nerve.' },
  bridgeLayer: { name: 'Pontoon train', weapon: 'Pontoon bridge', text: 'A bridge of boats over the water.' },
};
const BRITISH = { rifles, mgTeam, atTeam, sniper, engineers, observers, guard, reconVehicle, ifv, tank, artillery, spMortar, rockets, mortar, jammer, ambulance, commandPost, bridgeLayer };
for (const [id, v] of Object.entries(GB)) BRITISH[id].variants = { ...BRITISH[id].variants, gb: v };
atTeam.models = { ...atTeam.models, gb: () => buildNapSoldier({ army: 'gb', kind: 'highland' }) };

export const TYPES_1806 = {
  ...SHIPS_1806,   // the sea maps' sailing ships (./ships.js)
  rifles, reconVehicle, ifv, tank, looseHorse, dismounted, artillery, spMortar, rockets, mortar, guard,
  mgTeam, atTeam, sniper, engineers, observers, jammer, ambulance, commandPost, bridgeLayer,
  bunker: T.bunker, strongpoint: T.strongpoint, hq: T.hq,   // (the fortifications: earthworks for now)
};

/** 1806 has no such troops: what a map or mode that asks for one gets instead (the AI never buys these). */
const STAND_IN = { scouts: 'reconVehicle', heavyTank: 'tank', tankDestroyer: 'artillery', cev: 'spMortar', airRadar: 'observers', cbRadar: 'observers', mineClear: 'engineers', recovery: 'jammer', crew: 'dismounted' };
export const ALIAS_1806 = Object.fromEntries(Object.keys(T).filter((id) => !TYPES_1806[id]).map((id) => [id, STAND_IN[id] ?? 'rifles']));
