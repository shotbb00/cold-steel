// The Imperial Russian Navy of 1805–07, the Russian and Prussian landing boats, and the Danish Army of 1807 — called
// once from ./index.js with TYPES_1806. Each army gets its own entry in a type's tables (variants, models, names written
// in full — no HMS: entities/UnitStack.js shipName —, mounts, factionStats over the side's, armyCost, armyType).
//   ru  (pact) Seniavin's Mediterranean squadron and the Baltic fleet (models/ships1806east.js): the 74s and 66s
//       (cruiser), the 80-gun two-decker (battleship), the frigates, the brigs, a brander (fireship), the Baltic skerry
//       galley (ptBoat); the ship's barkas and the pram for the landings (flatboat, horseBoat).
//   pr  (pact) the Haffkahn and the Prahm (flatboat, horseBoat): Prussia had no navy — her ships are still Britain's.
//   dk  (nato, `own`: data/epoch.js) the Danish Army of 1807 on Zealand (Køge, Copenhagen): the line in red with yellow
//       facings and the round hat, the Landeværn in grey, the light infantry and the Jægers in green, the Livgarde, the
//       Hussars and the Zealand Dragoons, field guns and howitzers, the wagons (models/napSoldier.js, napCavalry.js,
//       napGuns.js, napWagons.js `dk`). No heavy horse, heavy or horse batteries, pontoons: epoch.js standIn.
//       At sea the Royal Danish Navy keeps ./ships.js's `dk` variants (the kanonbåd is already her own).
import { buildSeventyFourRU, buildEightyRU, buildFrigateRU, buildBrigRU, buildFireshipRU, buildGalleyRU, buildBarkasRU, buildPramRU, buildKahnPR, buildPrahmPR } from '../models/ships1806east.js';
import { buildNapSoldier } from '../models/napSoldier.js';
import { buildCavalry, buildCavalryFoot } from '../models/napCavalry.js';
import { buildFieldGun } from '../models/napGuns.js';
import { buildWagon } from '../models/napWagons.js';

// (as ./ships.js: a battery is a deck's guns on one side, forward or aft half)
const BEAM = Math.PI / 2;
const battery = (x, y, z, o) => ({ at: [x, y, z], facing: x > 0 ? BEAM : -BEAM, arc: 1.5, spread: 0.022, splash: 2.5, pierce: 0.5, shell: 420, size: 0.7, ...o });
const twoDecker = (beam, len, lower, upper) => [-1, 1].flatMap((s) => [
  battery(s * (beam / 2 + 1), 1.6, len * 0.15, { ...lower, lower: true }), battery(s * (beam / 2 + 1), 1.6, -len * 0.15, { ...lower, lower: true }),
  battery(s * (beam / 2 + 1), 3.9, len * 0.15, upper), battery(s * (beam / 2 + 1), 3.9, -len * 0.15, upper),
]);
const oneDecker = (beam, len, y, guns) => [-1, 1].flatMap((s) => [battery(s * (beam / 2 + 1), y, len * 0.15, guns), battery(s * (beam / 2 + 1), y, -len * 0.15, guns)]);
const G30 = { range: 740, reload: 30, damage: 280 };   // the Russian 30-pounders (and the licornes' shell among them)
const G18 = { range: 650, reload: 26, damage: 190 };

/** Put `army`'s own ship (or boat) on type `t`. */
function give(t, army, { names, model, variant, stats, mounts, cost, hull, camera }) {
  if (names) t.names = { ...t.names, [army]: names };
  t.models = { ...t.models, [army]: model };
  t.variants = { ...t.variants, [army]: variant };
  if (stats) t.factionStats = { ...t.factionStats, [army]: stats };
  if (mounts) t.mounts = { ...t.mounts, [army]: mounts };
  if (cost) t.armyCost = { ...t.armyCost, [army]: cost };
  if (hull) t.armyType = { ...t.armyType, [army]: { ...t.armyType?.[army], hull, ...(camera && { camera }) } };
}

/** The Danish Army's type: its variant, model, stats over the type's and price (× the type's). */
function dane(t, variant, model, { stats, cost } = {}) {
  t.models = { ...t.models, dk: model };
  t.variants = { ...t.variants, dk: variant };
  if (stats) t.factionStats = { ...t.factionStats, dk: stats };
  if (cost) t.armyCost = { ...t.armyCost, dk: Math.round(t.cost * cost) };
}
const man = (kind) => () => buildNapSoldier({ army: 'dk', kind });

export default function eastNavies(T) {
  // ---------------------------------------------------------------- the Imperial Russian Navy (Seniavin, the Baltic)
  give(T.cruiser, 'ru', { model: buildSeventyFourRU, cost: 660,
    names: ['Tverdyi', 'Selafail', 'Yaroslav', 'Moskva', 'Silnyi', 'Retvizan', 'Sviatoi Piotr', 'Skoryi', 'Mochnyi', 'Sviataia Elena', 'Vsevolod', 'Emgeiten'],
    stats: { hp: 5800, speed: 7.8 }, // (built fast of fir and larch at Arkhangelsk: lighter in the hull, slower under sail)
    mounts: twoDecker(14.6, 52, G30, G18),
    variant: { name: 'Line-of-battle ship (74 / 66)', weapon: '30-pdr and 18-pdr guns, licornes', text: 'Seniavin\'s line: 74s and 66s off the Arkhangelsk slips, black and white under the St Andrew\'s flag. At Athos in June 1807 they fell on the Turkish line in pairs and broke it — slower than a British 74 and lighter built, but their crews had been at sea for two years.' } });

  give(T.battleship, 'ru', { model: buildEightyRU, cost: 1100,
    names: ['Rafail', 'Uriil', 'Gavriil'],
    hull: { length: 56, beam: 15.6 }, camera: { distance: 80, height: 28, shoulder: 0 },
    stats: { hp: 8600, speed: 7.6, radius: 9.5, height: 24 },
    mounts: twoDecker(15.6, 56, { ...G30, damage: 300 }, { ...G18, damage: 210 }),
    variant: { name: '80-gun ship', weapon: '30-pdr and 24-pdr guns, licornes', text: 'A long two-decker of 80 and more guns, the squadron\'s heaviest: Rafail took the Turkish flagship\'s fire at the Dardanelles and Athos. Where the admiral\'s flag flies the squadron holds out longer.' } });

  give(T.frigate, 'ru', { model: buildFrigateRU, cost: 380,
    names: ['Venus', 'Avtroil', 'Legkii', 'Kildyuin', 'Mikhail', 'Nazaret', 'Grigorii', 'Speshnyi'],
    stats: { speed: 9.6 },
    mounts: oneDecker(11.8, 45, 3, { range: 650, reload: 24, damage: 180 }),
    variant: { name: 'Frigate', weapon: '24-pdr and 12-pdr guns', text: 'The squadron\'s cruisers off Corfu and the Dalmatian islands: Venus, 44 guns, took the French privateers one after another and blockaded Ragusa from the sea.' } });

  give(T.destroyer, 'ru', { model: buildBrigRU, cost: 190,
    names: ['Aleksandr', 'Feniks', 'Argus', 'Diomid', 'Bonasorte', 'Orel', 'Letun', 'Shpitsbergen'],
    mounts: oneDecker(8.8, 29, 1.8, { range: 450, reload: 18, damage: 90 }),
    variant: { name: 'Brig', weapon: '18 × 24-pdr carronades', text: 'A two-masted brig, many of them French and Ragusan prizes taken into the squadron: they carry the signals, chase the coasters and land the soldiers at Tenedos and in the Bocche.' } });

  give(T.fireship, 'ru', { model: buildFireshipRU, mounts: [],
    names: ['Brander 1', 'Brander 2', 'Brander 3', 'Brander 4'],
    variant: { name: 'Brander', weapon: 'pitch, tar and powder', text: 'A worn-out transport filled with everything that burns: the Russian navy had sent its branders into the Turkish fleet at Chesma in 1770, and every one of its officers knew the story.' } });

  give(T.ptBoat, 'ru', { model: buildGalleyRU, cost: 160,
    names: ['Galera Abo', 'Galera Pernov', 'Galera Rogervik', 'Galera Revel', 'Galera Vyborg', 'Galera Kotlin', 'Galera Narva', 'Galera Sveaborg'],
    hull: { length: 26, beam: 5 }, camera: { distance: 36, height: 12, shoulder: 0 },
    stats: { hp: 700, radius: 4, oars: 0.5, speed: 6.6, damage: 280 },
    mounts: [{ ...battery(0, 1.8, 10, { range: 800, reload: 30, damage: 280 }), facing: 0, arc: 0.9 }, { ...battery(0, 1.8, 10, { range: 550, reload: 16, damage: 110 }), facing: 0, arc: 1.1 }],
    variant: { name: 'Skerry galley', weapon: '1 × 24-pdr, 2 × 6-pdr', text: 'The Baltic fleet\'s rowing flotilla (grebnoi flot) for the Finnish skerries: a long open galley with ten sweeps a side, two lateen sails and her guns in the bow. In a calm she rows where ships can\'t sail.' } });

  // the landing boats: the Russians' (Castelnuovo, Ancona, Corfu, Tenedos) and the Prussians' (Kolberg, Memel)
  give(T.flatboat, 'ru', { model: buildBarkasRU,
    variant: { name: 'Barkas', weapon: 'none', text: 'The ship\'s barkas, the big boat of a ship of the line: forty soldiers packed between the rowers in green jackets, the St Andrew\'s flag at her stern.' } });
  give(T.horseBoat, 'ru', { model: buildPramRU,
    variant: { name: 'Pram', weapon: 'carronade', text: 'A flat-bottomed pram for the guns and their teams, a carronade in her bow to sweep the beach.' } });
  give(T.flatboat, 'pr', { model: buildKahnPR,
    variant: { name: 'Haffkahn', weapon: 'none', text: 'Prussia had no navy: the boats are the Haff\'s fishing Kähne, pressed with their fishermen at the oars — the soldiers sit on the floor among the nets.' } });
  give(T.horseBoat, 'pr', { model: buildPrahmPR,
    variant: { name: 'Prahm', weapon: 'light gun', text: 'A river barge from the Pregel and the Oder, a light gun lashed in her bow: the guns and the horses go over in her.' } });

  // ---------------------------------------------------------------- the Danish Army, Zealand 1807 (Køge, Copenhagen)
  const { rifles, atTeam, mgTeam, sniper, engineers, observers, guard, reconVehicle, ifv, artillery, mortar, jammer, ambulance, commandPost, looseHorse, dismounted } = T;
  dane(rifles, { name: 'Linieinfanteri', weapon: 'Musket of 1791, bayonet', text: 'The Danish line in red, yellow facings and the round hat with its brim turned up: the few regular battalions left on Zealand in 1807 — most of the army stood in Holstein against the French.' }, man('line'));
  dane(atTeam, { name: 'Landeværn', weapon: 'Musket, pike', text: 'The Zealand militia in grey vadmel: farmers called out in August 1807, a few weeks\' drill, muskets for some and pikes for the rest. At Køge they stood in the rain against Wellesley\'s brigade, and broke.' }, man('militia'),
    { stats: { hp: 95, breakMorale: 0.34, spread: 0.038, reloadTime: 21, bayonet: 90 }, cost: 0.55 });
  dane(mgTeam, { name: 'Let Infanteri', weapon: 'Light musket, bayonet', text: 'The light companies in green: out in front in open order along the hedges and dykes.' }, man('light'));
  dane(sniper, { name: 'Jægerkorps', weapon: 'Rifled Jæger carbine', text: 'The Kronprinsens Livjægerkorps, Copenhagen\'s students and craftsmen in green with rifles: they had fought on the Trekroner in 1801, and in 1807 they sniped at the British siege lines from the suburbs.' }, man('rifle'));
  dane(engineers, { name: 'Ingeniører og pionerer', weapon: 'Musket, axe', text: 'The engineers and their working men: the city\'s earthworks thrown up in a fortnight, the suburbs burned to clear the glacis.' }, man('pioneer'));
  dane(observers, { name: 'Artilleriofficerer', weapon: 'Telescope, sword', text: 'Gunner officers with their telescopes: every gun of yours lands tight on what they can see.' }, man('officer'));
  dane(guard, { name: 'Livgarden til Fods', weapon: 'Musket, bayonet', text: 'The King\'s Foot Guard in red and dark blue under the bearskin, the garrison of Copenhagen: picked men who do not break.' }, man('grenadier'));
  dane(reconVehicle, { name: 'Husarer', weapon: 'Sabre, carbine', text: 'The Danish Hussar Regiment in red dolmans laced white: the eyes of the army, and quick to fall on stragglers.' }, () => buildCavalry({ army: 'dk', kind: 'light' }));
  dane(ifv, { name: 'Sjællandske Dragoner', weapon: 'Sabre, carbine', text: 'The Zealand Dragoons in red and the crested helmet: line cavalry, and in 1807 nearly all the horse Zealand had.' }, () => buildCavalry({ army: 'dk', kind: 'medium' }));
  dane(artillery, { name: 'Feltartilleri', weapon: '6-pounder guns', text: 'Danish field guns on their oxblood carriages: roundshot at long range, canister close in.' }, () => buildFieldGun({ army: 'dk', size: 'field' }));
  dane(mortar, { name: 'Haubitser', weapon: '10-pounder howitzers', text: 'Short guns that throw shells over the dykes and hedges onto troops behind them.' }, () => buildFieldGun({ army: 'dk', size: 'howitzer' }));
  dane(jammer, { name: 'Ammunitionsvogn', weapon: 'Cartridges, men', text: 'Companies within 60 m take in new men and refill their pouches.' }, () => buildWagon({ army: 'dk', kind: 'ammo' }));
  dane(ambulance, { name: 'Lazaretvogn', weapon: 'Surgeons', text: 'Wounded men near it are patched up and go back to the line.' }, () => buildWagon({ army: 'dk', kind: 'ambulance' }));
  dane(commandPost, { name: 'Generalstab', weapon: 'Aides, couriers', text: 'Castenschiold\'s staff: reinforcements come forward to it; troops near it hold their nerve.' }, () => buildWagon({ army: 'dk', kind: 'hq' }));
  dane(looseHorse, looseHorse.variants.nato, () => buildCavalry({ army: 'dk', kind: 'light', mounted: false }));
  dane(dismounted, dismounted.variants.nato, () => buildCavalryFoot({ army: 'dk', kind: 'medium' }));
}
