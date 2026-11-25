// 1918 in the Mediterranean: the Regia Marina (`it`), the k.u.k. Kriegsmarine (`ah`) and the Marine nationale (`fr`) on
// the 1918 ship types (./ships.js), called once from ./index.js. Each navy gets its own entry in the type's tables —
// names (written in full: entities/UnitStack.js shipName), model, variant, mounts, factionStats (over the side's: the
// `pact` Germans' are merged under the k.u.k. ones, so those are overridden here) and armyType (her own hull and camera).
// `it` and `ah` are `own` (data/factions.js armyHas: these variants put the ships on their lists); `fr` is not, so every
// type she can buy gets a French entry here or she would sail the Royal Navy's hulls (forArmy: table[army] ?? table[faction]).
// Models: models/ships1918med.js. Italian and k.u.k. ships are matched class for class (Premuda: maps/premuda.ts).
//   it  Conte di Cavour (battleship), Pisa (cruiser), Aquila tuned (lightCruiser), destroyer tuned, PN torpedo boat (frigate),
//       F-class (submarine), a trooping steamer, Partenope (minelayer), RD sweeper (minesweeper); the MAS stays as it is
//   ah  Tegetthoff (battleship), Radetzky (cruiser), Tb 250t (frigate), Chamäleon (minelayer), a Lloyd steamer (transport)
//   fr  Courbet, Waldeck-Rousseau (cruiser), Jurien de la Gravière (lightCruiser), Bisson (destroyer), Arras aviso (frigate),
//       Brumaire (submarine), a vedette (ptBoat), a Messageries liner (transport), Pollux (minelayer), a trawler sweeper,
//       and the landing's craft: a vedette (ml) and a chaland (ferry); no carrier (she flew from the shore)
import { buildCavour, buildPisa, buildPN, buildFClass, buildPiroscafo, buildPartenope, buildRD, buildTegetthoff, buildRadetzky, buildTb250, buildChamaleon, buildLloyd,
  buildCourbet, buildWaldeckRousseau, buildJurien, buildBisson, buildArras, buildBrumaire, buildVedetteLT, buildPaquebot, buildPollux, buildChalutier, buildChalutierArme, buildVedette, buildChaland } from '../models/ships1918med.js';

const FWD = 0;
const AFT = Math.PI;
const BEAM = Math.PI / 2;
// (as ./ships.js: the 1918 gun, tubes, charges, smoke, and the sea scale)
const gun = (at, facing, o) => ({ at, facing, arc: 4.6, spread: 0.013, splash: 4, pierce: 0.3, shell: 760, size: 1.8, ...o });
const torps = (at, o) => ({ at, torpedo: true, arc: 2.2, count: 2, range: 1300, speed: 18, damage: 2400, reload: 110, ...o });
const TUBES = (at, facing, o) => torps(at, { facing, arc: 0.9, ...o });
const DC = (o) => ({ count: 4, reload: 22, radius: 35, damage: 1000, ...o });
const SMOKE_GEN = { last: 50, cooldown: 140 };
const RANGE = 0.55;
const SCALED = ['range', 'aggroRange', 'preferredRange', 'sight', 'sonar', 'hearing'];
const near = (o) => { const r = { ...o }; for (const k of SCALED) if (r[k]) r[k] = Math.round(r[k] * RANGE / 5) * 5; return r; };
const reach = (r) => ({ range: r, aggroRange: r });

/** Put `army`'s own ship on type `t`. */
function give(t, army, { names, model, variant, stats, mounts, type, cost }) {
  t.variants = { ...t.variants, [army]: variant };
  t.models = { ...t.models, [army]: model };
  if (names) t.names = { ...t.names, [army]: names };
  if (stats) t.factionStats = { ...t.factionStats, [army]: near(stats) };
  if (mounts) t.mounts = { ...t.mounts, [army]: mounts.map(near) };
  if (type) t.armyType = { ...t.armyType, [army]: type };
  if (cost) t.armyCost = { ...t.armyCost, [army]: cost };
}
const hull = (shortName, length, beam, distance, height) => ({ shortName, hull: { length, beam }, camera: { distance, height, shoulder: 0 } });

// the guns (before the sea scale)
const G305 = { range: 3500, reload: 26, damage: 1400, splash: 10, pierce: 0.7, shell: 800, size: 3.2, spread: 0.011 };
const G305x3 = { ...G305, damage: 1800, size: 3.4 };                                       // (a triple: one more shell in the salvo)
const G254 = { range: 3000, reload: 18, damage: 900, splash: 8, pierce: 0.55, shell: 790, size: 2.8, spread: 0.012 };
const G240 = { range: 2900, reload: 16, damage: 760, splash: 7, pierce: 0.55, shell: 790, size: 2.7, spread: 0.011 };
const G194 = { range: 2700, reload: 12, damage: 560, splash: 6, pierce: 0.45, shell: 790, size: 2.5, spread: 0.012 };
const G190 = { range: 2600, reload: 12, damage: 520, splash: 6, pierce: 0.45, shell: 790, size: 2.5, spread: 0.012 };
const G164 = { range: 2300, reload: 7, damage: 280, splash: 5, pierce: 0.38, shell: 780, size: 2.1, spread: 0.013 };
const G152 = { range: 2400, reload: 7, damage: 330, splash: 5, pierce: 0.4, shell: 780, size: 2.2, spread: 0.013 };
const G138 = { range: 1900, reload: 5, damage: 200, splash: 4, pierce: 0.3, shell: 760, size: 1.8 };
const G120 = { range: 1900, reload: 4, damage: 165, splash: 3.5, pierce: 0.25, shell: 750, size: 1.5 };
const G100 = { range: 2000, reload: 4, damage: 175, splash: 3.5, pierce: 0.25, shell: 760, size: 1.6 };
const G76 = { range: 1600, reload: 3, damage: 100, splash: 2.5, pierce: 0.15, shell: 700, size: 1.1 };
const G66 = { range: 1500, reload: 3, damage: 90, splash: 2.5, pierce: 0.15, shell: 700, size: 1.1 };
const G65 = G66;
const G47 = { range: 1100, reload: 2, damage: 55, splash: 1.5, pierce: 0.1, shell: 700, size: 0.8 };
const CASEMATE = (at, facing, o) => gun(at, facing, { range: 1900, reload: 4.5, damage: 160, splash: 3.5, pierce: 0.25, arc: 2.2, ...o });
const casemates = (x, z1, z2, o) => [CASEMATE([x, 6, z1], BEAM, o), CASEMATE([-x, 6, z1], -BEAM, o), CASEMATE([x, 6, z2], BEAM, o), CASEMATE([-x, 6, z2], -BEAM, o)];
const wings = (x, y, z1, z2, g, arc = 3) => [gun([x, y, z1], BEAM, { ...g, arc }), gun([-x, y, z1], -BEAM, { ...g, arc }), gun([x, y, z2], BEAM, { ...g, arc }), gun([-x, y, z2], -BEAM, { ...g, arc })];

/** The line's stats (dreadnought / armoured cruiser) from hp, armour, speed and the big guns' reach. */
const line = (hp, armor, speed, g, o) => ({ hp, armor, speed, flareRounds: 4, ...reach(g.range), preferredRange: Math.round(g.range * 0.8), damage: g.damage, fireCooldown: g.reload, spread: g.spread, boltSpeed: g.shell, boltSize: g.size, splash: g.splash, pierce: g.pierce, ...o });

export default function navyMed(T) {
  const { battleship, cruiser, lightCruiser, destroyer, frigate, submarine, ptBoat, transport, minelayer, minesweeper, carrier, trawler, ml, ferry } = T;

  // ---------------------------------------------------------------- the Regia Marina
  give(battleship, 'it', {
    model: buildCavour, cost: 1150, type: hull('Cavour', 176, 28, 175, 54),
    names: ['Conte di Cavour', 'Giulio Cesare', 'Andrea Doria', 'Caio Duilio'],
    stats: line(20000, 0.6, 13.5, G305, { radius: 13, height: 28 }),
    mounts: [gun([0, 12, 66], FWD, G305x3), gun([0, 15, 53], FWD, G305), gun([0, 12, 0], AFT, { ...G305x3, arc: 4 }), gun([0, 15, -50], AFT, G305), gun([0, 12, -63], AFT, G305x3),
      ...casemates(13, 24, -20, { damage: 165 })],
    variant: { name: 'Conte di Cavour-class battleship', weapon: '13 × 305 mm, 18 × 120 mm', text: 'Thirteen 305 mm guns in five turrets, the triple on the centreline amidships firing to either beam: more guns than any dreadnought in the Adriatic, a knot faster than the Tegetthoffs, and less armour. With the Doria and Duilio she waited at Taranto for the k.u.k. fleet to come out — it came out once, in June 1918.' },
  });
  give(cruiser, 'it', {
    model: buildPisa, cost: 760, type: hull('Pisa', 140, 21, 150, 46),
    names: ['Pisa', 'San Marco', 'San Giorgio'],
    stats: line(13000, 0.4, 14.5, G254, { radius: 11, height: 24 }),
    mounts: [gun([0, 9, 52], FWD, G254), gun([0, 9, -52], AFT, G254), ...wings(7.6, 8, 26, -24, G190)],
    variant: { name: 'Pisa-class armoured cruiser', weapon: '4 × 254 mm, 8 × 190 mm', text: 'An armoured cruiser of the Brindisi squadron: four 254 mm on the centreline, eight 190 mm in turrets on the beams, 23 knots. Her sister Amalfi went down to a U-boat in 1915; her sisters covered the Adriatic coast and the Otranto barrage.' },
  });
  // (Premuda: Aquila at 3800 hp / 0.12 and the destroyers' light guns lost six battles of seven — matched to Novara and Tátra here)
  lightCruiser.factionStats.it = { ...lightCruiser.factionStats.it, hp: 5000, armor: 0.2, preferredRange: near({ preferredRange: 1500 }).preferredRange };   // (close enough for her 76s to bear)
  destroyer.factionStats.it = { ...destroyer.factionStats.it, hp: 2400, damage: 165 };
  destroyer.mounts.it = destroyer.mounts.it.map((m) => (m.torpedo ? m : { ...m, reload: m.reload * 0.75 }));   // (quick-firing 76s and the 120: Tátra's six 6.6 cm out-shot them)
  give(frigate, 'it', {
    model: buildPN, cost: 200, type: hull('PN boat', 42.5, 4.6, 50, 16),
    names: ['40 PN', '41 PN', '42 PN', '43 PN', '44 PN', '45 PN', '46 PN', '47 PN', '48 PN', '49 PN'],
    stats: { hp: 1200, armor: 0.05, speed: 14, accel: 0.18, turnRate: 0.15, radius: 4, height: 6, sight: 1900, sonar: 450, flareRounds: 2, depthCharges: DC({ count: 2, reload: 24 }), ...reach(1600), preferredRange: 1100, damage: 100, fireCooldown: 3, boltSize: 1.1, splash: 2.5, pierce: 0.15 },
    mounts: [gun([0, 3.5, 15], FWD, G76), gun([0, 3.5, -15], AFT, G76), torps([0, 3, -8], { count: 2, range: 1300 })],
    variant: { name: 'PN-class torpedo boat', weapon: '2 × 76 mm, 2 torpedo tubes, depth charges', text: 'A small coastal torpedo boat built by Pattison at Naples in 1917–18: two 76 mm, two tubes and a couple of depth charges — she escorts the convoys down the coast and goes in at night on the Dalmatian islands.' },
  });
  give(submarine, 'it', {
    model: buildFClass, cost: 400, type: hull('F-class', 45.6, 4.2, 55, 16),
    names: ['F 1', 'F 3', 'F 5', 'F 7', 'F 10', 'F 12', 'F 14', 'F 17', 'F 19', 'F 21'],
    stats: { hp: 1200, speed: 7.5, radius: 3, height: 4, range: 1100, aggroRange: 1100, preferredRange: 850, damage: 110 },
    mounts: [TUBES([0, -1, 20], 0, { count: 2, range: 1200, damage: 2200, reload: 60 }), gun([0, 3, 6.5], 0, { ...G76, damage: 110, surfaced: true, arc: 5.2 })],
    variant: { name: 'F-class submarine', weapon: '2 torpedo tubes, 76 mm', text: 'A Laurenti boat built by Fiat at La Spezia: two bow tubes and a 76 mm. Out of Venice and Brindisi she watches Pola and Cattaro for the k.u.k. fleet, waiting for the k.u.k. ships to put to sea.' },
  });
  give(transport, 'it', {
    model: buildPiroscafo, cost: 210, type: hull('Piroscafo', 112, 14, 100, 32),
    names: ['Città di Catania', 'Città di Siracusa', 'Città di Palermo', 'Principe di Udine', 'Duca degli Abruzzi', 'Re Vittorio'],
    stats: { hp: 5200, speed: 7.5 },
    mounts: [gun([0, 9, -49], AFT, { ...G76, range: 1400, reload: 5, arc: 4 })],
    variant: { name: 'Piroscafo (troop transport)', weapon: 'one 76 mm', text: 'A coastal liner of the Navigazione Generale taken up for trooping, as they carried the army to Albania and Valona: soft and slow, but the landing party aboard holds a zone and brings in command points.' },
  });
  give(minelayer, 'it', {
    model: buildPartenope, cost: 380, type: hull('Partenope', 73, 8.2, 80, 26),
    names: ['Partenope', 'Minerva', 'Euridice', 'Goito', 'Montebello'],
    stats: { minelayer: { count: 24, spacing: 30 }, hp: 2400, armor: 0.08, speed: 13.5, radius: 6, height: 8, ...reach(1600), preferredRange: 1300, damage: 100, fireCooldown: 3 },
    mounts: [gun([0, 5, 28], FWD, G76), gun([0, 5, 2], FWD, { ...G76, arc: 3.6 })],
    variant: { name: 'Partenope-class minelayer', weapon: '2 × 76 mm, 24 mines', text: 'An old torpedo cruiser of the 1890s, her tubes gone for mine rails: she lays the fields that close the Italian ports and the lanes behind the Otranto barrage. Your ships know where the mines are; theirs find out the hard way.' },
  });
  give(minesweeper, 'it', {
    model: buildRD, cost: 170, type: hull('RD', 35, 5.8, 45, 14),
    names: ['RD 1', 'RD 3', 'RD 6', 'RD 9', 'RD 12', 'RD 15', 'RD 18', 'RD 21'],
    stats: { hp: 1000, speed: 8.5, radius: 3.6, height: 6, ...reach(1500), damage: 100, fireCooldown: 3 },
    mounts: [gun([0, 4, 12], FWD, G76), gun([0, 4, -8], AFT, { ...G47, arc: 4 })],
    variant: { name: 'RD sweeper (rimorchiatore dragamine)', weapon: '76 mm, a light gun, the sweep', text: 'A small steel sweeper on a tug\'s lines, built by the dozen in 1916–18: she clears the channels into Venice, Ancona and Brindisi after the U-boats have laid their mines in the night.' },
  });

  // ---------------------------------------------------------------- the k.u.k. Kriegsmarine
  give(battleship, 'ah', {
    model: buildTegetthoff, cost: 1150, type: hull('Tegetthoff', 152, 27.3, 165, 52),
    names: ['SMS Viribus Unitis', 'SMS Tegetthoff', 'SMS Prinz Eugen', 'SMS Szent István'],
    stats: line(20500, 0.62, 12.5, G305, { radius: 12, height: 28, flareRounds: 6 }),
    mounts: [gun([0, 11, 52], FWD, G305x3), gun([0, 14, 39], FWD, G305x3), gun([0, 14, -38], AFT, G305x3), gun([0, 11, -51], AFT, G305x3),
      ...casemates(13, 18, -16, { damage: 175 })],
    variant: { name: 'Tegetthoff-class battleship', weapon: '12 × 30.5 cm, 12 × 15 cm', text: 'The first dreadnought with triple turrets superfiring at both ends: twelve Škoda 30.5 cm on a hull of only 20,000 tonnes — a powerful broadside, but top-heavy and thin below the waterline. Two of Rizzo\'s torpedoes off Premuda were enough for Szent István.' },
  });
  give(cruiser, 'ah', {
    model: buildRadetzky, cost: 860, type: hull('Radetzky', 139, 24.6, 150, 48),
    names: ['SMS Radetzky', 'SMS Erzherzog Franz Ferdinand', 'SMS Zrínyi'],
    stats: line(14500, 0.46, 12.5, G305, { radius: 11, height: 26, flareRounds: 6 }),
    mounts: [gun([0, 10, 50], FWD, G305), gun([0, 10, -50], AFT, G305), ...wings(8.4, 9, 22, -22, G240)],
    variant: { name: 'Radetzky-class battleship', weapon: '4 × 30.5 cm, 8 × 24 cm, 20 × 10 cm', text: 'The semi-dreadnought: two twin 30.5 cm and four twin 24 cm in turrets on the beams — more than an armoured cruiser, less than a dreadnought, and slow. The three of them shelled Ancona on the day Italy entered the war.' },
  });
  give(frigate, 'ah', {
    model: buildTb250, cost: 220, type: hull('Tb 250t', 57.8, 5.8, 60, 18),
    names: ['Tb 74 T', 'Tb 75 T', 'Tb 76 T', 'Tb 77 T', 'Tb 78 T', 'Tb 80 T', 'Tb 82 F', 'Tb 84 F', 'Tb 87 F', 'Tb 93 F', 'Tb 98 M', 'Tb 100 M'],
    stats: { hp: 1300, armor: 0.05, speed: 14.5, accel: 0.18, turnRate: 0.14, radius: 4, height: 6, sight: 1900, sonar: 450, flareRounds: 4, depthCharges: DC({ count: 2, reload: 24 }), ...reach(1500), preferredRange: 1100, damage: 90, fireCooldown: 3, boltSize: 1.1, splash: 2.5, pierce: 0.15 },
    mounts: [gun([0, 3.5, 21], FWD, G66), gun([0, 3.5, -22], AFT, G66), torps([0, 3, -6], { count: 2 }), torps([0, 3, -13], { count: 2 })],
    variant: { name: 'Tb 250t torpedo boat', weapon: '2 × 6.6 cm, 4 torpedo tubes', text: 'The 250-tonne boats of the Trieste, Fiume and Monfalcone yards, the first small turbine boats: two 6.6 cm and four tubes. Boats of the class screened Szent István off Premuda the night the MAS boats came in.' },
  });
  give(transport, 'ah', {
    model: buildLloyd, cost: 210, type: hull('Lloyd steamer', 105, 13.4, 95, 30),
    names: ['SS Wien', 'SS Helouan', 'SS Gablonz', 'SS Carniolia', 'SS Bohemia', 'SS Graz'],
    stats: { hp: 5000, speed: 7.5 },
    mounts: [gun([0, 9, -46], AFT, { ...G66, range: 1400, reload: 5, arc: 4 })],
    variant: { name: 'Lloyd steamer (troop transport)', weapon: 'one 6.6 cm', text: 'An Österreichischer Lloyd steamer out of Trieste, taken up as a transport for the Albanian coast: soft and slow, but the troops aboard hold a zone and bring in command points.' },
  });
  give(minelayer, 'ah', {
    model: buildChamaleon, cost: 380, type: hull('Chamäleon', 72, 9, 80, 26),
    names: ['SMS Chamäleon', 'SMS Basilisk', 'SMS Salamander', 'SMS Pelikan'],
    // (over the Germans' Brummer: every key she sets is set again here)
    stats: { minelayer: { count: 30, spacing: 30 }, hp: 2400, armor: 0.08, speed: 13, radius: 6, height: 8, sight: 2200, flareRounds: 4, smokeGen: SMOKE_GEN, ...reach(1500), preferredRange: 1200, damage: 90, fireCooldown: 3 },
    mounts: [gun([0, 5, 26], FWD, G66), gun([0, 5, -6], AFT, { ...G66, arc: 3.6 })],
    variant: { name: 'Chamäleon (minelayer)', weapon: '2 × 6.6 cm, 30 mines', text: 'The k.u.k. navy\'s purpose-built minelayer of 1913: she sowed the fields off Pola and the Dalmatian islands that held the Italian fleet at arm\'s length. Your ships know where the mines are; theirs find out the hard way.' },
  });

  // ---------------------------------------------------------------- the Marine nationale
  give(battleship, 'fr', {
    model: buildCourbet, cost: 1150, type: hull('Courbet', 166, 27, 170, 54),
    names: ['Courbet', 'Jean Bart', 'France', 'Paris'],
    stats: line(21000, 0.6, 13, G305, { radius: 13, height: 28 }),
    mounts: [gun([0, 12, 62], FWD, G305), gun([0, 15, 50], FWD, G305), gun([9.6, 12, 4], BEAM, { ...G305, arc: 3 }), gun([-9.6, 12, 4], -BEAM, { ...G305, arc: 3 }), gun([0, 15, -46], AFT, G305), gun([0, 12, -58], AFT, G305),
      ...casemates(13, 20, -14, { damage: 170 })],
    variant: { name: 'Courbet-class battleship', weapon: '12 × 305 mm, 22 × 138.6 mm', text: 'France\'s first dreadnoughts: six twin turrets, two at each end and one on either beam, and a battery of 138.6 mm against torpedo boats. Courbet and Jean Bart sank the Zenta off Antivari in 1914; then they held the Otranto Strait from Corfu.' },
  });
  give(cruiser, 'fr', {
    model: buildWaldeckRousseau, cost: 720, type: hull('Waldeck-Rousseau', 159, 21.5, 160, 48),
    names: ['Waldeck-Rousseau', 'Edgar Quinet', 'Ernest Renan', 'Jules Michelet', 'Victor Hugo', 'Jules Ferry'],
    stats: line(12500, 0.38, 14.5, G194, { radius: 11, height: 24 }),
    mounts: [gun([0, 9, 58], FWD, G194), gun([0, 9, -58], AFT, G194), ...wings(8.4, 8, 34, -26, { ...G194, damage: 300 })],
    variant: { name: 'Edgar Quinet-class armoured cruiser', weapon: '14 × 194 mm', text: 'The last and biggest of France\'s armoured cruisers: fourteen 194 mm, six funnels in two groups, 23 knots. Waldeck-Rousseau fought off the k.u.k. U-boats and destroyers in the Adriatic and kept the Otranto line with the battleships.' },
  });
  give(lightCruiser, 'fr', {
    model: buildJurien, cost: 480, type: hull('Jurien', 137, 15, 130, 40),
    names: ['Jurien de la Gravière', 'Guichen', 'D\'Entrecasteaux', 'Châteaurenault', 'Lavoisier', 'Cassard'],
    stats: { hp: 5800, armor: 0.22, speed: 13.5, flareRounds: 6, ...reach(2300), preferredRange: 1700, damage: 280 },
    mounts: [gun([0, 8, 56], FWD, G164), ...wings(6, 7, 30, 0, G164), gun([6, 7, -30], BEAM, { ...G164, arc: 3 }), gun([-6, 7, -30], -BEAM, { ...G164, arc: 3 }), gun([0, 8, -56], AFT, G164)],
    variant: { name: 'Protected cruiser (Jurien de la Gravière)', weapon: '8 × 164.7 mm', text: 'France built no light cruisers before the war: her scouts were the older protected cruisers — eight 164.7 mm on the centreline and the beams, a steel deck over the boilers, and slower than the Novaras.' },
  });
  give(destroyer, 'fr', {
    model: buildBisson, cost: 380, type: hull('Bisson', 78, 8, 80, 26),
    names: ['Bisson', 'Renaudin', 'Commandant Lucas', 'Mangini', 'Protet', 'Magon', 'Bouclier', 'Casque', 'Cimeterre', 'Dague', 'Boutefeu', 'Commandant Rivière'],
    stats: { hp: 2300, speed: 15.5, damage: 175, ...reach(2000), preferredRange: 1400 },
    mounts: [gun([0, 5, 31], FWD, G100), ...wings(2.6, 5, 6, -16, G65, 2.6), gun([0, 5, -33], AFT, G100), torps([0, 5, -10], { count: 2 }), torps([0, 5, -26], { count: 2 })],
    variant: { name: 'Bisson-class destroyer', weapon: '2 × 100 mm, 4 × 65 mm, 4 torpedo tubes', text: 'The 800-tonne torpilleurs d\'escadre of Brindisi and Corfu: a 100 mm at each end, the 65 mm in the waist. Bisson sank the k.u.k. submarine U 3 in 1915; Renaudin was torpedoed in the Adriatic the next spring.' },
  });
  give(frigate, 'fr', {
    model: buildArras, cost: 260, type: hull('Arras', 74.9, 8.7, 75, 24),
    names: ['Arras', 'Amiens', 'Béthune', 'Belfort', 'Épernay', 'Lassigny', 'Les Éparges', 'Montdidier', 'Remiremont', 'Vimy'],
    stats: { hp: 2400, speed: 10.5, damage: 200, fireCooldown: 5 },
    mounts: [gun([0, 7, 27], FWD, G138), gun([0, 6, -30], AFT, G138)],
    variant: { name: 'Arras-class aviso', weapon: '2 × 138.6 mm, depth charges', text: 'The convoy sloop of 1918, named for the towns of the front: built like a merchantman so a U-boat captain can\'t tell which way she is steaming, two big guns and a stern full of depth charges.' },
  });
  give(submarine, 'fr', {
    model: buildBrumaire, cost: 400, type: hull('Brumaire', 52.1, 5.4, 58, 18),
    names: ['Brumaire', 'Frimaire', 'Nivôse', 'Floréal', 'Messidor', 'Thermidor', 'Fructidor', 'Coulomb', 'Arago', 'Le Verrier', 'Euler', 'Bernoulli'],
    stats: { hp: 1250, speed: 7.5, radius: 3.2, height: 4.5, range: 1000, aggroRange: 1000, preferredRange: 800, damage: 60 },
    mounts: [TUBES([0, -1, 24], 0, { count: 3, range: 1000, damage: 2000, reload: 70 }), gun([0, 3, 7], 0, { ...G47, surfaced: true, arc: 5.2 })],
    variant: { name: 'Brumaire-class submarine', weapon: '1 bow tube, 6 drop collars, 47 mm', text: 'A Laubeuf boat with one bow tube and six torpedoes in drop collars along her casing: they spoil in the water and run wild, but a Brumaire in the Adriatic still finds the k.u.k. cruisers on their way home to Cattaro. Bernoulli was lost there.' },
  });
  give(ptBoat, 'fr', {
    model: buildVedetteLT, cost: 120, type: hull('Vedette', 18.3, 3.2, 34, 10),
    names: ['VTB 1', 'VTB 2', 'VTB 3', 'VTB 4', 'VTB 5', 'VTB 6', 'VTB 7', 'VTB 8'],
    stats: { speed: 17, hp: 280 },
    variant: { name: 'Vedette lance-torpille', weapon: 'a torpedo, a machine gun', text: 'A fast motor boat on the Italian MAS\'s lines with a torpedo on her frame: in under the guns in the dark, the shot, and away. Fragile, and helpless in a rough sea.' },
  });
  give(transport, 'fr', {
    model: buildPaquebot, cost: 220, type: hull('Paquebot', 130, 15.5, 110, 34),
    names: ['Lutetia', 'Sontay', 'Gange', 'Djemnah', 'Australien', 'Médie'],
    stats: { hp: 6200, speed: 7.5 },
    mounts: [gun([0, 9, -57], AFT, { ...G138, range: 1400, reload: 6, damage: 140, arc: 4 })],
    variant: { name: 'Paquebot (troop transport)', weapon: 'one 138.6 mm', text: 'A Messageries Maritimes liner of the Marseille lines taken up to carry the Armée d\'Orient to Salonika — U-boats sank many of them on the way. The troops aboard hold a zone and bring in command points.' },
  });
  give(minelayer, 'fr', {
    model: buildPollux, cost: 340, type: hull('Pollux', 62, 8, 70, 22),
    names: ['Pollux', 'Cerbère', 'Castor', 'Pluton'],
    stats: { minelayer: { count: 24, spacing: 30 }, hp: 1900, armor: 0.06, speed: 12, radius: 5, height: 7, ...reach(1100), preferredRange: 900, damage: 55, fireCooldown: 2 },
    mounts: [gun([0, 5, 23], FWD, G47), gun([0, 5, -2], AFT, { ...G47, arc: 3.6 })],
    variant: { name: 'Mouilleur de mines (Pollux)', weapon: '2 × 47 mm, 24 mines', text: 'A small minelayer of 1913: she sows the fields off the French bases and the lanes behind the Otranto barrage. Your ships know where the mines are; theirs find out the hard way.' },
  });
  give(minesweeper, 'fr', {
    model: buildChalutier, cost: 170, type: hull('Chalutier', 40, 7, 48, 15),
    names: ['Jacques Cœur', 'Marie-Thérèse', 'Notre-Dame des Flots', 'Saint-Pierre', 'Alcyon', 'Goéland', 'Mouette', 'Pétrel'],
    stats: { hp: 1100, speed: 8, radius: 4, height: 6, ...reach(1100), damage: 55, fireCooldown: 2 },
    mounts: [gun([0, 4, 15], FWD, G47), gun([0, 4, -9], AFT, { ...G47, arc: 4 })],
    variant: { name: 'Chalutier dragueur', weapon: '47 mm, a light gun, the sweep', text: 'A Boulogne trawler and her fishermen taken up for sweeping: she cuts every mine in her path and finds the field round it. Slow and soft — sweep ahead of the fleet, not under the enemy\'s guns.' },
  });
  if (trawler) give(trawler, 'fr', { // (./shipTypes.js's type: navyMed runs after it in ./index.js)
    model: buildChalutierArme, type: hull('Chalutier', 40, 7, 45, 15),
    names: ['Ailly', 'Cap Gris-Nez', 'Hirondelle', 'Lamproie', 'Marsouin', 'Sardine', 'Thon', 'Turbot'],
    mounts: [gun([0, 4, 15], FWD, { ...G47, damage: 70, range: 1300, reload: 2.5 })],
    variant: { name: 'Chalutier armé', weapon: '75 mm, hydrophone, depth charges', text: 'A Boulogne or Lorient trawler with a navy gun on her bow and her fishermen in naval rig: she patrols the convoy lanes off Provence and Algeria, listens for U-boats and drops her charges where she hears one.' },
  });
  carrier.armies = (carrier.armies ?? []).filter((a) => a !== 'fr'); // (France had no carrier: her seaplanes flew from the shore)
  // the landing's craft (systems/Landing.js: the map's `landing.craft`; never bought) — her own boats, not the Dover Patrol's
  give(ml, 'fr', {
    model: buildVedette, type: hull('Vedette', 21, 4, 36, 11),
    variant: { name: 'Vedette à moteur', weapon: '37 mm, a Hotchkiss', text: 'A motor launch of the Patrouilles: she lays the smoke the landing hides behind, brings a section in to the beach and takes off the wounded.' },
  });
  give(ferry, 'fr', {
    model: buildChaland, type: hull('Chaland', 34, 8, 48, 15),
    variant: { name: 'Chaland automoteur', weapon: 'a Hotchkiss', text: 'A flat steel lighter with an engine aft, as the French Corps came ashore at Kum Kale and Seddülbahir: men, guns and mules go in over her bow on the beach.' },
  });
}
