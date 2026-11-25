// Napoleon's western allies, 1805: the Armada Española (`es`) and the Bataafse Marine (`nl`), both on the nato side, on the
// 1806 ship types (./ships.js), and the Spanish army's garrison troops ashore — called once from ./index.js. Each army gets
// its own entry in the type's tables (variants, names written in full, models, mounts, factionStats over the side's French
// ones, armyCost, armyType for her own hull size), as data/units1918/navyEast.js does. Models: models/ships1806west.js,
// the soldiers models/napSoldier.js (army 'es'), the guns models/napGuns.js.
//   es  `own` (data/epoch.js): Santísima Trinidad, the four-decker (battleship; the Santa Ana-class 112s — Príncipe de
//       Asturias, Santa Ana, Real Carlos, San Hermenegildo — in the same slot with their own lines: `namedModels`), the 74s
//       (cruiser), frigates, brigs (destroyer), the lanchas cañoneras (ptBoat), brulotes (fireship); ashore the line infantry
//       in white, the light infantry, the Real Cuerpo de Artillería, the provincial militia (`militia`, Spain's only), the
//       Guardias Españolas for the Guard. Spanish crews: Havana-built hulls as stout as any, gun crews of landsmen and
//       soldiers — slower broadsides (GREEN).
//   nl  not `own`: the Batavian navy's own ships; ashore (she has no army of her own here) the French types stand in. Dutch
//       74s and 68s for the shoals: shorter, lower and shallower, a little slower and more leewardly; the flagship (an 80)
//       in the first rate's slot, frigates, brigs, kanonneerboten, branders.
import { buildNapSoldier } from '../models/napSoldier.js';
import { buildFieldGun } from '../models/napGuns.js';
import { buildWagon } from '../models/napWagons.js';
import { buildFireship } from '../models/ships1806.js';
import { buildTrinidad, buildSpanish112, buildSeventyFourES, buildFrigateES, buildBrigES, buildGunboatES,
  buildSeventyFourNL, buildFlagshipNL, buildFrigateNL, buildBrigNL, buildGunboatNL } from '../models/ships1806west.js';

const BEAM = Math.PI / 2;
// (as ./ships.js: a battery is a deck's guns on one side, forward or aft half)
const battery = (x, y, z, o) => ({ at: [x, y, z], facing: x > 0 ? BEAM : -BEAM, arc: 1.5, spread: 0.022, splash: 2.5, pierce: 0.5, shell: 420, size: 0.7, ...o });
/** Every gun deck `[y, guns]` (lowest first: shut in a gale), both sides, forward and aft. */
const decks = (beam, len, list) => [-1, 1].flatMap((s) => list.flatMap(([y, guns], k) => [0.15, -0.15].map((f) => battery(s * (beam / 2 + 1), y, len * f, { ...guns, ...(k === 0 && list.length > 1 && { lower: true }) }))));
const GREEN = 1.15; // (the Spanish gun crews: a broadside a little slower than the French)
const slow = (g, k = GREEN) => ({ ...g, reload: g.reload * k });
const G36 = { range: 750, reload: 30, damage: 330 }, G24 = { range: 720, reload: 28, damage: 240 }, G18 = { range: 650, reload: 26, damage: 190 }, G12 = { range: 600, reload: 22, damage: 140 }, G8 = { range: 520, reload: 20, damage: 100 };

/** Put `army`'s own ship (or company) on type `t`. */
function give(t, army, { names, model, variant, stats, mounts, cost, hull, camera }) {
  if (names) t.names = { ...t.names, [army]: names };
  t.models = { ...t.models, [army]: model };
  t.variants = { ...t.variants, [army]: variant };
  if (stats) t.factionStats = { ...t.factionStats, [army]: stats };
  if (mounts) t.mounts = { ...t.mounts, [army]: mounts };
  if (cost) t.armyCost = { ...t.armyCost, [army]: cost };
  if (hull) t.armyType = { ...t.armyType, [army]: { ...t.armyType?.[army], hull, ...(camera && { camera }) } };
}

export default function westNavies(T) {
  // ---------------------------------------------------------------- the Armada Española
  give(T.battleship, 'es', { names: ['Santísima Trinidad', 'Príncipe de Asturias', 'Santa Ana', 'Real Carlos', 'San Hermenegildo'], model: buildTrinidad, cost: 1450,
    hull: { length: 61, beam: 16.4 }, camera: { distance: 95, height: 34, shoulder: 0 },
    stats: { hp: 13500, speed: 6.6, turnRate: 0.045, radius: 11, height: 30 },
    mounts: decks(16.4, 61, [[2.2, slow(G36)], [4.5, slow(G24)], [6.8, slow(G12)], [9.1, slow(G8)]]),
    variant: { name: 'Santísima Trinidad', weapon: '30 × 36-pdr, 32 × 24-pdr, 32 × 12-pdr, 18 × 8-pdr, 24 pedreros', text: 'El Escorial de los mares: built in Havana of Cuban hardwood, the only four-decker afloat, 136 guns and the admiral\'s flag. Slow, crank and hard to handle — but no ship could take her broadside, and at Trafalgar it took three British ships of the line to bring her masts down.' } });
  // her consorts in the first rate's slot, on their own lines (render/RigRenderer.js namedModels): the Santa Ana-class three-deckers of 112 guns
  T.battleship.namedModels = { ...T.battleship.namedModels, 'Príncipe de Asturias': buildSpanish112, 'Santa Ana': buildSpanish112, 'Real Carlos': buildSpanish112, 'San Hermenegildo': buildSpanish112 };

  give(T.cruiser, 'es', { names: ['San Juan Nepomuceno', 'Monarca', 'Montañés', 'San Ildefonso', 'Bahama', 'San Agustín', 'San Justo', 'San Leandro', 'Neptuno', 'Argonauta', 'San Francisco de Asís', 'San Fernando', 'Firme', 'San Rafael', 'España'],
    model: buildSeventyFourES, hull: { length: 54, beam: 15 },
    stats: { hp: 6700, speed: 8.3 }, // (stout Havana hulls, foul bottoms)
    mounts: decks(15, 54, [[1.6, slow({ range: 750, reload: 30, damage: 310 })], [3.9, slow(G18)]]),
    variant: { name: 'San Ildefonso-class 74', weapon: '28 × 24-pdr, 30 × 18-pdr, 16 × 8-pdr', text: 'Romero Landa\'s Spanish 74: fine-lined, strongly built, as good a ship as any in the world — manned by press-ganged landsmen and soldiers from the garrison, who fire a slower broadside. Churruca fought San Juan Nepomuceno against six British ships at Trafalgar until he was killed.' } });

  give(T.frigate, 'es', { names: ['Mercedes', 'Fama', 'Medea', 'Clara', 'Santa Sabina', 'Ceres', 'Atocha', 'Soledad', 'Flora', 'Pomona'],
    model: buildFrigateES, hull: { length: 45, beam: 12 },
    stats: { speed: 10.2 },
    mounts: decks(12, 45, [[3, slow({ range: 650, reload: 24, damage: 170 })]]),
    variant: { name: 'Fragata de 34', weapon: '26 × 12-pdr, 8 × 6-pdr', text: 'A Spanish frigate: lighter guns than a French or British 38, but the treasure ships\' escort — Medea, Fama, Clara and Mercedes were bringing the silver of the Río de la Plata home when Moore\'s frigates fell on them off Cape Santa María in 1804.' } });

  give(T.destroyer, 'es', { names: ['Vigilante', 'Galgo', 'Alerta', 'Saeta', 'Ardilla', 'Palomo', 'Cuervo', 'Descubridor'],
    model: buildBrigES, hull: { length: 29, beam: 8.6 },
    mounts: decks(8.6, 29, [[1.8, slow({ range: 450, reload: 18, damage: 90 })]]),
    variant: { name: 'Bergantín', weapon: '16 × 12-pdr carronades', text: 'A Spanish brig: the squadron\'s messenger and the coast\'s policeman, quick, lightly armed, and no match for a frigate.' } });

  give(T.ptBoat, 'es', { names: ['Lancha cañonera 1', 'Lancha cañonera 2', 'Lancha cañonera 3', 'Lancha cañonera 4', 'Lancha cañonera 5', 'Lancha cañonera 6'],
    model: buildGunboatES, cost: 110,
    mounts: [{ ...battery(0, 1.8, 9, { range: 800, reload: 30, damage: 290 }), facing: 0, arc: 0.9 }],
    variant: { name: 'Lancha cañonera', weapon: '1 × 24-pdr', text: 'Barceló\'s gunboat: an open launch with a long 24-pounder in her bow and twenty oars. Under the walls of Cádiz in 1797 and in the Bay of Gibraltar they rowed out in swarms on calm days and laid their guns on the helpless ships of the line.' } });

  give(T.fireship, 'es', { names: ['Brulote 1', 'Brulote 2', 'Brulote 3', 'Brulote 4'], model: buildFireship,
    variant: { name: 'Brulote', weapon: 'pitch, tar and powder', text: 'An old hull packed with pitch, tar and powder, set alight and sent down the wind onto an anchored line — at Cádiz in 1797 the Spaniards used them against Nelson\'s boats.' } });

  // ---------------------------------------------------------------- the Spanish army ashore (Cádiz, the Peninsula)
  give(T.rifles, 'es', { model: () => buildNapSoldier({ army: 'es' }),
    variant: { name: 'Infantería de línea', weapon: 'Musket of 1801, bayonet', text: 'The Spanish line in white coats: regiments with a long history and few men, slow to manoeuvre, often badly led — and stubborn behind a wall. At Bailén in 1808 they made a French army lay down its arms.' } });
  give(T.mgTeam, 'es', { model: () => buildNapSoldier({ army: 'es', kind: 'light' }),
    variant: { name: 'Infantería ligera', weapon: 'Light musket, bayonet', text: 'The light battalions in dark blue — Voluntarios de Cataluña, Barbastro, Campo Mayor: mountain men, quick in the broken country, out in front of the line in open order.' } });
  give(T.artillery, 'es', { model: () => buildFieldGun({ army: 'es', size: 'field' }),
    variant: { name: 'Real Cuerpo de Artillería', weapon: '8-pounder guns', text: 'The Royal Artillery Corps, Spain\'s best-schooled arm, from the academy at Segovia: few guns, well laid. Daoíz and Velarde fired theirs in the Monteleón barracks on the Dos de Mayo.' } });
  give(T.guard, 'es', { model: () => buildNapSoldier({ army: 'es', kind: 'guard' }),
    variant: { name: 'Guardias Españolas', weapon: 'Musket, bayonet', text: 'The King\'s Spanish Guards in blue and red: picked men of the royal household, who do not break.' } });
  give(T.commandPost, 'es', { model: () => buildWagon({ army: 'es', kind: 'hq' }),
    variant: { name: 'Estado Mayor', weapon: 'Aides, couriers', text: 'The captain-general\'s staff: reinforcements come forward to it; troops near it hold their nerve.' } });
  give(T.jammer, 'es', { model: () => buildWagon({ army: 'es', kind: 'ammo' }),
    variant: { name: 'Carro de municiones', weapon: 'Cartridges, men', text: 'Companies within 60 m take in new men and refill their pouches.' } });
  give(T.ambulance, 'es', { model: () => buildWagon({ army: 'es', kind: 'ambulance' }),
    variant: { name: 'Hospital de campaña', weapon: 'Surgeons', text: 'Wounded men near it are patched up and go back to the line.' } });
  // the provincial militia: Spain's own, cheap and many, poor shots who give way under fire — but they hold walls and towns
  const r = T.rifles;
  T.militia = {
    ...r, id: 'militia', name: 'Militia', shortName: 'Militia', cost: 90, armies: ['es'],
    stats: { ...r.stats, hp: 90, breakMorale: 0.32, spread: 0.04, reloadTime: 22, bayonet: 80, speed: 1.5 },
    models: { es: () => buildNapSoldier({ army: 'es', kind: 'militia' }) },
    variants: { es: { name: 'Milicias provinciales', weapon: 'Old musket, bayonet', text: 'The provincial militia in brown: farmers and townsmen drilled a few weeks a year, called up to hold the coast and the towns. Cheap, many, poor shots, quick to give way in the open — and dogged behind a wall.' } },
  };

  // ---------------------------------------------------------------- the Bataafse Marine (the Texel squadron)
  give(T.battleship, 'nl', { names: ['Koninklijke Hollander', 'Vrijheid', 'Admiraal De Ruyter'], model: buildFlagshipNL, cost: 1100,
    hull: { length: 53, beam: 15 }, camera: { distance: 78, height: 27, shoulder: 0 },
    stats: { hp: 7800, speed: 7.6, turnRate: 0.065, radius: 9.5, height: 23 },
    mounts: decks(15, 53, [[1.6, { range: 750, reload: 30, damage: 300 }], [3.9, G18]]),
    variant: { name: 'Vlagschip (80)', weapon: '30 × 36-pdr (Amsterdam), 32 × 18-pdr, 18 × 8-pdr', text: 'The flag officer\'s ship: a big two-decker of 80 guns, flat-floored for the shoals like every Dutch ship. Where Hartsinck\'s flag flies the squadron holds out longer.' } });

  give(T.cruiser, 'nl', { names: ['Brutus', 'Doggersbank', 'Haarlem', 'Utrecht', 'Wreker', 'Pluto', 'Hersteller', 'Schrikverwekker', 'Chatham', 'Zeeland', 'Kortenaer', 'Piet Hein'],
    model: buildSeventyFourNL, hull: { length: 49, beam: 14.4 },
    stats: { hp: 5700, speed: 7.9, turnRate: 0.072 },
    mounts: decks(14.4, 49, [[1.5, { range: 740, reload: 31, damage: 290 }], [3.7, { ...G18, damage: 180 }]]),
    variant: { name: '74 / 68 (Hollands)', weapon: '28 × 24-pdr, 28 × 12-pdr, 12 × 6-pdr', text: 'The Dutch ship of the line, built to cross the Texel\'s banks and the Zuiderzee: shallow, flat-floored and low — handy in the channels, leewardly in the open sea, and as stubborn as at Camperdown, where de Winter\'s ships fought until they sank.' } });

  give(T.frigate, 'nl', { names: ['Kenau Hasselaar', 'Pallas', 'Proserpina', 'Maria Riggersbergen', 'Rijn', 'Amphitrite', 'Utile', 'Furie'],
    model: buildFrigateNL, hull: { length: 43, beam: 11.6 },
    stats: { hp: 3000, speed: 9.8 },
    mounts: decks(11.6, 43, [[2.8, { range: 640, reload: 24, damage: 170 }]]),
    variant: { name: 'Fregat', weapon: '24 × 12-pdr, 8 × 6-pdr', text: 'A Dutch frigate: shallow enough to lie in the Texel roads at any tide, the squadron\'s eyes out to the banks where Russell\'s blockaders keep station.' } });

  give(T.destroyer, 'nl', { names: ['Lynx', 'Zeemeeuw', 'Atalante', 'Mercurius', 'Echo', 'Ajax', 'Gier', 'Haai'],
    model: buildBrigNL, hull: { length: 28, beam: 8.8 },
    mounts: decks(8.8, 28, [[1.7, { range: 450, reload: 18, damage: 90 }]]),
    variant: { name: 'Brik', weapon: '16 × 18-pdr carronades', text: 'A Dutch brig: the squadron\'s messenger, quick in the shallows off the dunes.' } });

  give(T.ptBoat, 'nl', { names: ['Kanonneerboot 1', 'Kanonneerboot 2', 'Kanonneerboot 3', 'Kanonneerboot 4', 'Kanonneerboot 5', 'Kanonneerboot 6'],
    model: buildGunboatNL,
    variant: { name: 'Kanonneerboot', weapon: '1 × 24-pdr', text: 'A flat-bottomed gunboat of the Flushing and Texel flotillas — built for Napoleon\'s invasion, rowed through the shallows where no frigate can follow, one long gun in the bow.' } });

  give(T.fireship, 'nl', { names: ['Brander 1', 'Brander 2', 'Brander 3'], model: buildFireship,
    variant: { name: 'Brander', weapon: 'pitch, tar and powder', text: 'An old hull filled with everything that burns, sent down the wind onto the enemy line.' } });
}
