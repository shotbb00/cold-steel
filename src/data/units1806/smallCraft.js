// 1806: the small craft and special types the sea maps were missing, as new types beside ./ships.js's slots (their ids
// have no other era's counterpart; data/units/index.js ROLE gives each a stand-in for an army without it, a map's own
// `fleetOrder` has the AI buy them: ai/SeaDirector.js). Called once with TYPES_1806 (./index.js).
//   prame        the French invasion flotilla's floating battery: three masts, flat-bottomed, twelve 24-pounders (fr)
//   gunVessel    the bateau canonnier: lug-rigged, a 24-pounder forward and a field gun aft, sweeps (fr)
//   peniche      the péniche: a long rowing boat under two lugs, a howitzer in her bow and sixty soldiers aboard (fr)
//                (the gun-brig, the chaloupe canonnière, is ./ships.js ptBoat; the brick canonnier its destroyer)
//   bombVessel   the Royal Navy's bomb ketch: two 13-inch mortars, shells lobbed far over the sea (gb)
//   cutter       the Royal Navy's cutter: one mast, fast and handy, a few small guns (gb)
//   lugger       the hired lugger: three lugs, the fastest thing on the Channel, the despatch boat (gb)
//   merchant     the convoy's merchantman, every side's (as 1918's: `landing` — her cargo brings in command points)
//   rocketTroop  Congreve's rockets ashore: the Royal Horse Artillery's rocket troop (gb; the others: their horse guns)
// and the French landing boats (flatboat, horseBoat for `nato`): a French landing rows péniches and chaloupes.
import { buildPrame, buildGunVessel, buildPeniche, buildBombVessel, buildCutter, buildLugger, buildIndiaman, buildMerchantFR, buildMerchantDK,
  buildPenicheBoat, buildChaloupeBoat, buildRocketTroop } from '../models/ships1806craft.js';
import { CODEX1806 } from '../codex.js';

// (as ./ships.js: the sailing ship's stats, a battery of guns on one side)
const SAIL = {
  naval: true, sail: true, eyeHeight: 40, aimHeight: 5, nightSight: { nato: 0.45, pact: 0.45 }, crew: 0, breakMorale: 0, smoke: undefined, grenades: 0, lightAT: 0,
  fov: 6.3, burst: 1, burstInterval: 0, aimTime: 1, magSize: 9999, reloadTime: 1, antiArmor: true, tracer: 0, esm: false,
};
const BEAM = Math.PI / 2;
const battery = (x, y, z, o) => ({ at: [x, y, z], facing: x > 0 ? BEAM : -BEAM, arc: 1.5, spread: 0.022, splash: 2.5, pierce: 0.5, shell: 420, size: 0.7, ...o });
const oneDecker = (beam, len, y, guns) => [-1, 1].flatMap((s) => [battery(s * (beam / 2 + 1), y, len * 0.15, guns), battery(s * (beam / 2 + 1), y, -len * 0.15, guns)]);
const bow = (y, z, o) => ({ ...battery(0, y, z, o), facing: 0, arc: 0.9 });
const stern = (y, z, o) => ({ ...battery(0, y, z, o), facing: Math.PI, arc: 0.9 });
const drilled = (g) => ({ ...g, reload: g.reload * 0.85 }); // (the Royal Navy's gun crews: ./ships.js DRILLED)
const ship = (o) => ({
  category: 'naval', kind: 'vehicle', role: 'fighter',
  formation: { count: 1, columns: 1, spacing: 0 },
  weaponSound: 'arty', engine: 'engine.sail', tracks: 'wash',
  ...o,
  stats: { ...SAIL, weapon: 'cannon', ...o.stats },
});
const both = (list) => ({ nato: list, pact: list }); // (a type one navy sails: the other side's mounts too, if a map ever gives it one)

const G24 = { range: 720, reload: 28, damage: 240 };

// ------------------------------------------------------------------ the French invasion flotilla (Boulogne, 1803–05)
export const prame = ship({
  fleet: 'line', armies: ['fr'],
  id: 'prame', name: 'Prame', shortName: 'Prame', cost: 380, limit: 3,
  names: { nato: ['Ville de Rouen', 'Ville de Genève', 'Ville d\'Anvers', 'Ville de Mayence', 'Ville de Bruges', 'Ville de Liège', 'Ville de Cherbourg', 'Ville de Paris'], pact: ['Prame 1'] },
  hull: { length: 34, beam: 9.6 },
  stats: { masts: 3, hp: 3000, armor: 0.2, speed: 5.4, accel: 0.04, turnRate: 0.06, turretRate: 1, radius: 6, height: 14, sight: 2600, range: 720, aggroRange: 850, preferredRange: 320, leash: 80, damage: 240, fireCooldown: 28, spread: 0.022, boltSpeed: 420, boltSize: 0.65, splash: 2.5, pierce: 0.5 },
  mounts: both(oneDecker(9.6, 34, 1.6, G24)),
  camera: { distance: 55, height: 18, shoulder: 0 },
  models: { nato: buildPrame, pact: buildPrame },
  variants: {
    nato: { name: 'Prame', weapon: '12 × 24-pdr', text: 'A floating battery built for the crossing: three short masts on a flat-bottomed hull that sails over the Boulogne shoals, a frigate\'s broadside of 24-pounders. Slow and leewardly — she was meant to cover the landing beaches, not to chase.' },
    pact: { name: 'Prame', weapon: '12 × 24-pdr', text: 'A French flat-bottomed floating battery.' },
  },
});

export const gunVessel = ship({
  fleet: 'under', armies: ['fr'],
  id: 'gunVessel', name: 'Gun Vessel', shortName: 'Bateau', cost: 140,
  names: { nato: ['Bateau canonnier 1', 'Bateau canonnier 2', 'Bateau canonnier 3', 'Bateau canonnier 4', 'Bateau canonnier 5', 'Bateau canonnier 6', 'Bateau canonnier 7', 'Bateau canonnier 8'], pact: ['Gun vessel 1'] },
  hull: { length: 19, beam: 5 },
  stats: { masts: 2, oars: 0.45, smallCraft: true, stealth: 0.6, hp: 620, armor: 0, speed: 7.2, accel: 0.14, turnRate: 0.28, turretRate: 1, radius: 3, height: 7, eyeHeight: 6, sight: 2200, range: 780, aggroRange: 900, preferredRange: 420, leash: 80, damage: 260, fireCooldown: 30, spread: 0.02, boltSpeed: 430, boltSize: 0.6, splash: 2.5, pierce: 0.5 },
  mounts: both([bow(1.8, 7, { range: 780, reload: 30, damage: 260 }), stern(1.6, -7, { range: 420, reload: 16, damage: 80, size: 0.45 })]),
  camera: { distance: 30, height: 10, shoulder: 0 },
  models: { nato: buildGunVessel, pact: buildGunVessel },
  variants: {
    nato: { name: 'Bateau canonnier', weapon: '1 × 24-pdr, 1 field gun', text: 'The flotilla\'s gun vessel, two lugs and sweeps: a long 24-pounder on a slide in her bow, a field gun aft to land with the army — and a stall amidships for two horses. In a calm she rows in under a frigate\'s stern.' },
    pact: { name: 'Gun vessel', weapon: '1 × 24-pdr', text: 'A French lug-rigged gun vessel.' },
  },
});

export const peniche = ship({
  fleet: 'under', armies: ['fr'],
  id: 'peniche', name: 'Péniche', shortName: 'Péniche', cost: 90,
  names: { nato: ['Péniche 1', 'Péniche 2', 'Péniche 3', 'Péniche 4', 'Péniche 5', 'Péniche 6', 'Péniche 7', 'Péniche 8', 'Péniche 9', 'Péniche 10'], pact: ['Péniche 1'] },
  hull: { length: 18, beam: 3.6 },
  // (boarders: sixty soldiers sit between the rowers — alongside a becalmed brig she carries her: entities/sailDamage.js)
  stats: { masts: 2, oars: 0.7, smallCraft: true, stealth: 0.75, boarders: 3, hp: 360, armor: 0, speed: 7.6, accel: 0.2, turnRate: 0.34, turretRate: 1, radius: 2.4, height: 5, eyeHeight: 4, sight: 1800, range: 480, aggroRange: 600, preferredRange: 120, leash: 80, damage: 150, fireCooldown: 26, spread: 0.028, boltSpeed: 360, boltSize: 0.55, splash: 4, pierce: 0.2 },
  mounts: both([bow(1.2, 7, { range: 480, reload: 26, damage: 150, splash: 4, pierce: 0.2, size: 0.55 })]),
  camera: { distance: 26, height: 9, shoulder: 0 },
  models: { nato: buildPeniche, pact: buildPeniche },
  variants: {
    nato: { name: 'Péniche', weapon: '1 howitzer, 60 soldiers', text: 'The flotilla\'s smallest and most numerous craft: a long open boat with two lugs and eighteen oars, a howitzer in her bow and a company of infantry sitting between the rowers. Weak to gunfire — but in a calm she rows faster than anything, and her soldiers can carry a becalmed brig by boarding.' },
    pact: { name: 'Péniche', weapon: 'howitzer', text: 'A French rowing boat full of soldiers.' },
  },
});

// ------------------------------------------------------------------ the Royal Navy's small craft
export const bombVessel = ship({
  fleet: 'line', armies: ['gb'],
  id: 'bombVessel', name: 'Bomb Vessel', shortName: 'Bomb', cost: 330, limit: 2,
  names: { pact: ['Sulphur', 'Thunder', 'Vesuvius', 'Aetna', 'Hecla', 'Zebra', 'Volcano', 'Meteor', 'Explosion', 'Devastation'], nato: ['Bombarde 1'] },
  hull: { length: 32, beam: 9.6 },
  // the mortars (a ripple of two shells on a high arc, anywhere within `scatter` of the aim: entities/UnitStack.js shipRocket) — at ships and the shore alike
  stats: { masts: 2, hp: 1700, armor: 0.1, speed: 8.6, accel: 0.07, turnRate: 0.1, turretRate: 1, radius: 5, height: 13, sight: 3000, range: 1150, aggroRange: 1150, preferredRange: 800, leash: 80, damage: 60, fireCooldown: 16, spread: 0.025, boltSpeed: 400, boltSize: 0.45, splash: 1.5, pierce: 0.3 },
  mounts: both([
    { at: [0, 4, 8], facing: 0, arc: 6.3, range: 1150, reload: 42, damage: 420, splash: 10, scatter: 38, rockets: { count: 2, every: 1.6, speed: 175 } },
    ...oneDecker(9.6, 32, 1.8, drilled({ range: 400, reload: 18, damage: 60 })),
  ]),
  camera: { distance: 45, height: 16, shoulder: 0 },
  models: { pact: buildBombVessel, nato: buildBombVessel },
  variants: {
    pact: { name: 'Bomb vessel', weapon: '13-inch and 10-inch mortars, 8 × 24-pdr carronades', text: 'A ketch built heavy to take the recoil: no foremast, the deck forward of the main given to two great mortars on their turning beds. She lobs shells high over the sea onto ships at anchor and the boats in a harbour from far beyond the reach of a broadside — slowly, and anywhere near the aim. The Downs squadron shelled the Boulogne roads with them.' },
    nato: { name: 'Bombarde', weapon: 'mortars', text: 'A mortar ketch.' },
  },
});

export const cutter = ship({
  fleet: 'escort', armies: ['gb'],
  id: 'cutter', name: 'Cutter', shortName: 'Cutter', cost: 150,
  names: { pact: ['Entreprenante', 'Nimble', 'Active', 'Hind', 'Sprightly', 'Admiral Mitchell', 'Griffin', 'Swift', 'Dolphin', 'Lively'], nato: ['Cotre 1'] },
  hull: { length: 21, beam: 6.8 },
  stats: { masts: 1, hp: 750, armor: 0.03, speed: 12, accel: 0.12, turnRate: 0.17, turretRate: 1, radius: 3.8, height: 11, sight: 3300, range: 400, aggroRange: 550, preferredRange: 200, leash: 80, damage: 55, fireCooldown: 15, spread: 0.025, boltSpeed: 400, boltSize: 0.4, splash: 1.2, pierce: 0.25 },
  mounts: both(oneDecker(6.8, 21, 1.4, drilled({ range: 400, reload: 15, damage: 55 }))),
  camera: { distance: 36, height: 13, shoulder: 0 },
  models: { pact: buildCutter, nato: buildCutter },
  variants: {
    pact: { name: 'Cutter', weapon: '10 × 12-pdr carronades', text: 'One tall mast with a great gaff mainsail and a running bowsprit: quick, handy, close-winded. She carries the despatches, chases the flotilla\'s boats in under the batteries and takes a struck ship in hand. Entreprenante, a cutter, sailed with Nelson at Trafalgar.' },
    nato: { name: 'Cotre', weapon: 'carronades', text: 'A cutter.' },
  },
});

export const lugger = ship({
  fleet: 'escort', armies: ['gb'],
  id: 'lugger', name: 'Lugger', shortName: 'Lugger', cost: 130,
  names: { pact: ['Black Joke', 'Countess of Elgin', 'Fox', 'Agnes', 'Nile', 'Experiment', 'Speedwell', 'Hope'], nato: ['Lougre 1'] },
  hull: { length: 22, beam: 6 },
  stats: { masts: 3, stealth: 0.3, hp: 600, armor: 0.02, speed: 13, accel: 0.13, turnRate: 0.15, turretRate: 1, radius: 3.5, height: 10, sight: 3500, range: 380, aggroRange: 500, preferredRange: 220, leash: 80, damage: 45, fireCooldown: 14, spread: 0.026, boltSpeed: 400, boltSize: 0.4, splash: 1.2, pierce: 0.2 },
  mounts: both(oneDecker(6, 22, 1.4, drilled({ range: 380, reload: 14, damage: 45 }))),
  camera: { distance: 36, height: 12, shoulder: 0 },
  models: { pact: buildLugger, nato: buildLugger },
  variants: {
    pact: { name: 'Hired armed lugger', weapon: '8 × 12-pdr carronades', text: 'A Cornish or Channel Islands lugger hired by the Navy: three tanned lug sails on a long low black hull — the fastest thing on the Channel, the smugglers\' and privateers\' own rig. She scouts, carries word to the squadron and runs from anything that can fight.' },
    nato: { name: 'Lougre', weapon: 'carronades', text: 'A lugger.' },
  },
});

// ------------------------------------------------------------------ the merchantman (a convoy: every side's)
export const merchant = ship({
  fleet: 'under',
  id: 'merchant', name: 'Merchantman', shortName: 'Merchant', cost: 150, limit: 4,
  names: { // (gb: the army's own list, so no HMS before a merchantman's name — entities/UnitStack.js shipName)
    gb: ['Earl Camden', 'Lord Nelson', 'Brunswick', 'Warley', 'Cumberland', 'Hope', 'Ocean', 'Royal George', 'Exeter', 'Ganges', 'Alfred', 'Calcutta'],
    pact: ['Calcutta', 'Lord Nelson', 'Brunswick', 'Earl Camden', 'Warley', 'Cumberland', 'Hope', 'Ocean', 'Royal George', 'Exeter', 'Ganges', 'Alfred'],
    nato: ['Bonne Mère', 'Jeune Émilie', 'Ville de Nantes', 'Belle Poule', 'Deux Frères', 'Marie-Thérèse', 'Bordelais', 'Aimable Victoire'],
    dk: ['Fortuna', 'Anna Maria', 'Haabet', 'Christianshavn', 'Dorothea', 'Neptunus', 'Freden', 'Enigheden'],
  },
  hull: { length: 44, beam: 12.4 },
  // (`landing`: while she lies in a zone of yours her cargo brings in command points — ai/SeaDirector.js steers her to one)
  stats: { landing: true, masts: 3, hp: 2600, armor: 0.1, speed: 7.4, accel: 0.04, turnRate: 0.06, turretRate: 1, radius: 7, height: 18, sight: 2600, range: 550, aggroRange: 650, preferredRange: 400, leash: 60, damage: 110, fireCooldown: 32, spread: 0.028, boltSpeed: 400, boltSize: 0.5, splash: 2, pierce: 0.35 },
  factionStats: { nato: { hp: 1900, speed: 7.8, radius: 6, height: 16 }, dk: { hp: 1800, speed: 7.6, radius: 6, height: 15 } },
  mounts: {
    pact: oneDecker(12.4, 44, 2.8, { range: 550, reload: 32, damage: 110 }),
    nato: [battery(6.2, 2.4, 0, { range: 450, reload: 30, damage: 70 }), battery(-6.2, 2.4, 0, { range: 450, reload: 30, damage: 70 })],
  },
  armyType: { fr: { hull: { length: 36, beam: 10.4 } }, dk: { hull: { length: 34, beam: 10 } } },
  camera: { distance: 65, height: 22, shoulder: 0 },
  models: { pact: buildIndiaman, nato: buildMerchantFR, dk: buildMerchantDK },
  variants: {
    pact: { name: 'East Indiaman', weapon: '26 × 18-pdr', text: 'The Honourable Company\'s ship home from Canton or Bombay, tea and silk and saltpetre in her holds: as big as a frigate, her ports painted on to look like one, guns enough to keep off a privateer — her crew no man-of-war\'s. While she lies in a zone of yours her cargo brings in command points; the enemy comes for her first.' },
    nato: { name: 'Trois-mâts marchand', weapon: '6 × 6-pdr', text: 'A Bordeaux or Nantes merchant ship running the blockade home from the islands with sugar and coffee, a few guns against the privateers. While she lies in a zone of yours her cargo brings in command points — and the British cruisers hunt her.' },
    dk: { name: 'Koffardiskib', weapon: '6 × 6-pdr', text: 'A Danish merchant ship of the Baltic trade, timber and grain in her hold, under the Dannebrog: while she lies in a zone of yours her cargo brings in command points.' },
  },
});

// ------------------------------------------------------------------ Congreve's rockets (ashore)
/** The rocket troop (an army without it: its horse guns, `rockets` — data/units/index.js ROLE). From the 1806 field battery's stats. */
const rocketTroopOf = (artillery) => ({
  ...artillery, id: 'rocketTroop', name: 'Rocket Troop', shortName: 'Rockets', cost: 260, armies: ['gb'],
  weaponSound: 'mlrs',
  stats: {
    ...artillery.stats, speed: 4.4, range: 420, minRange: 70, preferredRange: 320, weapon: 'artillery', indirect: true, gravity: 25,
    scatter: 22, scatterPerM: 0.07, damage: 110, splash: 5, pierce: 0.1, trail: true, muzzleKind: 'rocket', vsArmor: 1,
    magSize: 6, fireCooldown: 0.7, reloadTime: 34, halted: true, layTime: 4, towed: { deploy: 8 }, gun: undefined, breakMorale: 0.3,
  },
  models: { gb: () => buildRocketTroop('gb'), pact: () => buildRocketTroop('gb') },
  variants: {
    gb: { name: 'Congreve rockets', weapon: '12-pounder rockets on troughs', text: 'The Royal Horse Artillery\'s rocket troop: no guns, only Colonel Congreve\'s iron rockets on their long sticks, fired from light troughs in salvoes. They reach further than a field gun, frighten horses and men and set fire to what they strike — and land nowhere near where they were laid. Fired into Boulogne in October 1806 and Copenhagen in 1807.' },
    pact: { name: 'Congreve rockets', weapon: '12-pounder rockets', text: 'A British rocket troop: salvoes of rockets, long-ranged and wild.' },
  },
});

/** The French landing boats (./ships.js flatboat, horseBoat — a French landing's: `nato`), and the codex. */
export default function smallCraft(T) {
  Object.assign(T, { prame, gunVessel, peniche, bombVessel, cutter, lugger, merchant, rocketTroop: rocketTroopOf(T.artillery) });
  T.flatboat.models = { ...T.flatboat.models, nato: buildPenicheBoat };
  T.flatboat.variants = { ...T.flatboat.variants, nato: { name: 'Péniche', weapon: 'none', text: 'A péniche of the Boulogne flotilla, her masts struck: sixty soldiers sit packed between the rowers. When she grounds they go over the bow into the surf.' } };
  T.horseBoat.models = { ...T.horseBoat.models, nato: buildChaloupeBoat };
  T.horseBoat.variants = { ...T.horseBoat.variants, nato: { name: 'Chaloupe', weapon: 'a 6-pounder', text: 'A ship\'s big boat, a 6-pounder in her bow: the field guns and their teams, the horses swum alongside.' } };

  Object.assign(CODEX1806, {
    prame: {
      use: 'A slow floating battery: twelve 24-pounders on a flat hull. Keep her with the gunboats in the zone you hold and let the enemy come to her broadside; she can\'t catch anything.',
      strong: 'Brigs, cutters and boats that come close, holding a zone', weak: 'Frigates that choose the range, fireships, bomb vessels',
      counter: 'Stay out of her broadside and use the wind: she is too slow to follow. Bomb vessels can shell her from far off.',
      nato: 'Napoleon had some twenty prames built for the invasion of England; they carried twelve 24-pounders and drew so little water that they could go where no warship could. In 1804 the Ville de Genève and others fought Keith\'s squadron off Boulogne.',
    },
    gunVessel: {
      use: 'A lug-rigged gun vessel with a long 24-pounder forward and a field gun aft. Like the gunboats: deadly in a calm, a target in a breeze.',
      strong: 'Becalmed ships, a stern in a calm', weak: 'Ships with way on, carronades close in',
      counter: 'A brig or cutter while there is wind.',
      nato: 'The bateau canonnier was to carry a field gun, its gunners and two horses to the English beaches as well as fight on the way.',
    },
    peniche: {
      use: 'A big rowing boat with a howitzer and a company of soldiers. Row in on a becalmed enemy and board her; don\'t trade fire.',
      strong: 'Boarding becalmed or damaged small ships, rowing in a calm', weak: 'Any gunfire, carronades',
      counter: 'Keep her off with grape and carronades; keep moving.',
      nato: 'The péniches were the most numerous craft of the flotilla: about sixty soldiers each, with a howitzer and a small gun, under two lug sails or oars.',
    },
    bombVessel: {
      use: 'Mortars that reach further than any broadside: keep her well back and let her shell ships that lie still, slow ones and the enemy\'s boats. The shells land anywhere near the aim. Keep her away from a broadside.',
      strong: 'Slow or anchored ships, prames, crowded boats, from far off', weak: 'Anything that reaches her: frigates, brigs',
      counter: 'Close in fast: she has only a few carronades. Keep moving and her shells miss.',
      pact: 'Bomb vessels were built strong to stand the mortars\' recoil. They shelled the Boulogne flotilla in 1804, Copenhagen in 1807, and Fort McHenry in 1814: "the bombs bursting in air".',
    },
    cutter: {
      use: 'Fast and handy, a few carronades. Scout, chase down boats and take struck ships in hand. Keep out of a broadside.',
      strong: 'Gunboats, péniches, scouting', weak: 'Frigates, prames, anything with long guns',
      counter: 'Long guns from out of carronade range.',
      pact: 'The Royal Navy had dozens of cutters for the Channel: the hired cutter Entreprenante was at Trafalgar and saved men from the burning Achille.',
    },
    lugger: {
      use: 'The fastest ship afloat and the weakest: scout ahead, carry word, then get away. Don\'t fight anything.',
      strong: 'Speed, scouting', weak: 'Any gunfire',
      counter: 'Anything that catches her.',
      pact: 'Lugs were the rig of the Channel smugglers and privateers; the Navy hired luggers as tenders and despatch boats.',
    },
    merchant: {
      use: 'A merchant ship: while she lies in a zone you hold her cargo brings in command points. Keep her in a safe zone behind your warships; she fights only to defend herself.',
      strong: 'Command points', weak: 'Everything: she is slow and her crew are no gunners',
      counter: 'Go for her first: frigates are fast enough to catch her.',
      pact: 'The East India Company\'s ships were as big as frigates and painted to look like them. In 1804 a convoy of Indiamen under Nathaniel Dance bluffed Linois\' squadron into running away at Pulo Aura.',
      nato: 'French merchant ships ran the British blockade to the West Indies and the Indian Ocean; many were taken as prizes.',
    },
    rocketTroop: {
      use: 'Congreve\'s rockets: salvoes onto a spotted area further than any field gun, very scattered. Use them on masses of troops, villages and boats, never on a small target. Then move: the launch gives you away.',
      strong: 'Massed troops, villages, crowded boats, at long range', weak: 'Anything small, cavalry that reaches them',
      counter: 'Cavalry or skirmishers onto the troughs; they can\'t hit a dispersed line.',
      gb: 'Congreve\'s rockets were first used at Boulogne in October 1806 and set fire to the town; at Copenhagen in 1807 they burned much of the city. A rocket troop fought on land at Leipzig in 1813.',
    },
  });
}
