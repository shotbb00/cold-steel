// The other fronts of 1918 (data/epoch.js): called once with the Western Front's types (./index.js) to give
// each type the five armies field their `variants[army]`, and models / factionStats / armyCost where they differ.
// All five are `own`: only the types given a variant here are on their lists.
//   ot     the Ottoman Army (pact): Gallipoli 1915, Gaza and Beersheba 1917, Megiddo 1918 — German guns and MGs
//   anzac  the Australian and New Zealand Army Corps (nato): the Light Horse, the light car patrols
//   it     the Italian Army (nato): the Alps, the Isonzo, the Piave — Alpini, Arditi, bombarde, mountain guns
//   ah     the Austro-Hungarian Army (pact): the Isonzo and the Piave, Sturmbataillone, Škoda guns
//   ru     the Russian Army of 1917 (nato): Mosins and Maxims, Cossacks, Austin armoured cars
// Two types of their own: the assault troops (Arditi, Sturmbataillon, Ottoman Hücum taburu) and the mountain guns.
import { buildWw1Soldier } from '../models/ww1Soldier.js';
import { buildWw1Gun } from '../models/ww1Guns.js';
import { buildAmbulanceUK, buildAmbulanceOT, buildAmbulanceIT, buildAmbulanceAH, buildAmbulanceRU, buildStaffCarOT, buildStaffCarAU, buildStaffCarIT, buildStaffCarAH, buildStaffCarRU,
  buildAALorryIT, buildAALorryRU, buildLanciaAC, buildAustinAC, buildFordPatrol,
  buildAALorryDE, buildBalloonFR, buildBalloonDE, buildSupplyLorryFR, buildRenaultFT, buildEhrhardtAC, buildFiat2000, buildGarfordPutilov } from '../models/ww1Armour.js';

const SIDE = { ot: 'pact', anzac: 'nato', it: 'nato', ah: 'pact', ru: 'nato' };
const man = (army, o = {}) => () => buildWw1Soldier({ army, ...o });

/** Give type `t` to `army`: its variant, and where it differs its model, stats (over its side's), price. */
const give = (t, army, { variant, model, special, stats, cost }) => {
  if (model) t.models = { ...t.models, [army]: model };
  if (special) t.specialistModels = { ...t.specialistModels, [army]: special };
  if (stats) t.factionStats = { ...t.factionStats, [army]: { ...t.factionStats?.[SIDE[army]], ...stats } };
  if (cost) t.armyCost = { ...t.armyCost, [army]: Math.round(t.cost * cost) };
  t.variants = { ...t.variants, [army]: variant };
};

export default function fronts(T) {
  const { rifles, mgTeam, tank, heavyTank, artillery, spMortar, rockets, mortar, observers, cbRadar, airRadar, ifv, looseHorse, dismounted, reconVehicle, crew, atTeam, sniper, scouts, engineers, mineClear, aa, manpads, ambulance, recovery, commandPost } = T;
  const MEDIUM_MW = rockets.factionStats.st;   // (the medium trench mortar: the Sturmtruppen's 17 cm numbers)
  const LORRY = { armor: 0.05, hp: 360, speed: 5.5, breakdown: undefined, ditch: undefined };   // (a workshop lorry, not Britain's supply tank)
  const CANNON = { weapon: 'cannon', weaponSound: undefined, antiArmor: true, vsArmor: 1, magSize: 40, boltSize: 1.4 };

  // ---------------------------------------------------------------- the two types of the other fronts
  const stormTroops = {
    ...rifles, id: 'stormTroops', name: 'Assault Troops', shortName: 'Assault', armies: ['ot', 'it', 'ah'], cost: (rifles.cost ?? 100) + 40,
    stats: { ...rifles.stats, hp: 110, breakMorale: 0.12, grenades: 4, range: 90 },
    factionStats: {
      ot: { fireCooldown: 2.0, magSize: 5, reloadTime: 3, playerFireInterval: 1.0 },
      it: { fireCooldown: 1.9, magSize: 6, reloadTime: 3, playerFireInterval: 1.0, grenades: 5 },   // (the Arditi: the moschetto, and grenades by the sackful)
      ah: { fireCooldown: 1.8, magSize: 5, reloadTime: 2.8, playerFireInterval: 0.9 },
    },
    models: { ot: man('ot'), it: man('itA'), ah: man('ahS') },
    variants: {
      ot: { name: 'Hücum Taburu', weapon: 'Mauser carbines, stick grenades', text: 'The Ottoman assault battalions of 1917–18, trained by German instructors in Palestine and in the Caucasus: picked men, carbines and grenades, to retake a lost trench at night.' },
      it: { name: 'Arditi', weapon: 'Moschetto 91, petardi, daggers', text: 'The "daring ones": volunteers in the open-collared jacket and the black flames, who cross no man\'s land at a run behind their grenades and fight in the trench with the dagger. Fast, fierce, they do not break.' },
      ah: { name: 'Sturmbataillon', weapon: 'Repetierstutzen M95, Stielhandgranaten', text: 'Every k.u.k. division raised its storm battalion from 1917 on the German model: short carbines, sacks of grenades, wire cutters — the spearhead of Caporetto and the Piave.' },
    },
  };
  const mountainGun = {
    ...artillery, id: 'mountainGun', name: 'Mountain Guns', shortName: 'Mountain guns', armies: ['it', 'ah'], cost: 230,
    stats: { ...artillery.stats, hp: 240, range: 260, preferredRange: 190, damage: 115, splash: 5, speed: 3.2, fireCooldown: 3.5, towed: { deploy: 10 }, traverse: 0.15 },
    factionStats: {},
    models: { it: () => buildWw1Gun({ army: 'it', size: 'mountain' }), ah: () => buildWw1Gun({ army: 'ah', size: 'mountain' }) },
    variants: {
      it: { name: 'Cannone da 65/17', weapon: '65 mm mountain gun', text: 'The Alpini\'s gun: it comes apart into mule loads and goes up where no road goes. A small shell, quick into action — and on the Piave it went forward with the infantry.' },
      ah: { name: '7.5 cm Gebirgskanone M.15', weapon: 'Škoda 7.5 cm mountain gun', text: 'Škoda\'s mountain gun, taken apart for seven pack animals: light, quick into action, the gun of the Dolomites and the Isonzo heights.' },
    },
  };

  // ---------------------------------------------------------------- the Ottoman Army
  give(rifles, 'ot', { variant: { name: 'Piyade Mangası', weapon: 'Mauser M1903, bayonets', text: 'The Mehmetçik: Anatolian peasants in khaki and the kabalak, with the Turkish Mauser. Hard men to shift from a trench — Gallipoli and Gaza proved it.' } });
  give(mgTeam, 'ot', { variant: { name: 'Makineli Tüfek Takımı', weapon: 'MG 08, 7.65 mm', text: 'German machine guns, many with German crews in the Asia Corps: the guns that held the ridges over Anzac Cove.' } });
  give(artillery, 'ot', { variant: { name: '7.5 cm Krupp', weapon: '7.5 cm field gun M1903', text: 'The Krupp field gun of the Ottoman batteries: German-built, German-trained gunners, good at fire from cover over a ridge.' } });
  give(spMortar, 'ot', { variant: { name: '15 cm Howitzer', weapon: '15 cm sFH 13 (German-supplied)', text: 'German heavy howitzers sent with the Yıldırım army group: the big shells of the Gaza line.' } });
  give(mortar, 'ot', { variant: { name: 'Minenwerfer', weapon: '7.58 cm leichter Minenwerfer', text: 'German light trench mortars: bombs over into the enemy trench a stone\'s throw away, as at Gallipoli.' } });
  give(observers, 'ot', { variant: { name: 'Topçu Gözcüsü', weapon: 'pistol, field telephone', text: 'The battery\'s observer on the ridge: within his sight the guns are accurate.' } });
  give(ifv, 'ot', { variant: { name: 'Süvari', weapon: 'sword, Mauser carbine', text: 'The Ottoman cavalry in the kalpak: scouts and raiders on the desert flank, quick to fill a gap.' } });
  give(sniper, 'ot', { variant: { name: 'Keskin Nişancı', weapon: 'Mauser M1903', text: 'The snipers of the Gallipoli ridges: patient, hidden in the scrub, deadly to anyone who shows himself.' } });
  give(scouts, 'ot', { model: man('ot', { scout: true, hat: 'kalpak' }), variant: { name: 'Keşif Kolu', weapon: 'carbines, binoculars', text: 'The scouts: they know the wadis and the hills, and see the enemy coming long before he sees them.' } });
  give(engineers, 'ot', { special: man('ot'), variant: { name: 'İstihkam', weapon: 'Mauser, picks, wire', text: 'The Ottoman sappers: trenches, wire and the redoubts of the Gaza–Beersheba line.' } });
  give(ambulance, 'ot', { model: buildAmbulanceOT, variant: { name: 'Hilal-i Ahmer Ambulance', weapon: 'unarmed', text: 'The Red Crescent\'s motor ambulance: wounded men near it are patched up and go back to the line.' } });
  give(rockets, 'ot', { stats: MEDIUM_MW, variant: { name: 'Mittlerer Minenwerfer', weapon: '17 cm medium trench mortar (German crew)', text: 'The German Minenwerfer companies sent east, to Gallipoli and with Pasha I to the Gaza line: a heavy bomb lobbed short into the enemy trench.' } });
  give(mineClear, 'ot', { variant: { name: 'Tel Kesme Kolu', weapon: 'explosive charges, wire cutters', text: 'Sappers with long charges and wire cutters, German-trained: a lane through the enemy wire for the assault (X). Three charges.' } });
  give(aa, 'ot', { model: buildAALorryDE, variant: { name: 'K-Flak', weapon: '7.7 cm K-Flak on a lorry (German crew)', text: 'A German anti-aircraft gun on a lorry, sent with the Yıldırım army group to keep the British aircraft off the Gaza line.' } });
  give(manpads, 'ot', { variant: { name: 'Uçaksavar Takımı', weapon: 'MG 08 on an AA mount', text: 'A machine gun on a high mount, pointed at the sky: keeps the British reconnaissance aircraft high.' } });
  // left empty: tank, heavyTank, reconVehicle and recovery — the Ottoman Army had no tanks or armoured cars, so nothing to mend either;
  // cbRadar, airRadar — no sound ranging or kite balloons on its fronts (its eyes were the German aircraft of Pasha); atTeam — no anti-tank weapon reached Palestine
  give(commandPost, 'ot', { model: buildStaffCarOT, variant: { name: 'Karargâh', weapon: 'staff car, field telephones', text: 'The division\'s headquarters: the reinforcements come forward to it.' } });

  // ---------------------------------------------------------------- the ANZACs
  give(rifles, 'anzac', { variant: { name: 'Infantry Section', weapon: 'SMLE Mk III, Lewis gun, Mills bombs', text: 'The diggers of the AIF and the New Zealanders: volunteers to a man, the slouch hat and the Lee-Enfield. Gallipoli made their name; 1918 made them the shock troops of the Empire.' } });
  give(mgTeam, 'anzac', { variant: { name: 'Lewis Gun Team', weapon: 'Lewis gun, .303', text: 'The Lewis gun goes forward with the section: the fire that carries the attack.' } });
  give(artillery, 'anzac', { variant: { name: '18-pounder', weapon: '18-pdr QF, 84 mm', text: 'The field batteries of the Australian and New Zealand divisions: shrapnel and high explosive, the creeping barrage the infantry walk behind.' } });
  give(spMortar, 'anzac', { stats: { range: 380, damage: 210, splash: 8, towed: { deploy: 25 } }, variant: { name: '4.5-inch Howitzer', weapon: 'QF 4.5-inch howitzer', text: 'The divisional howitzer: a lighter shell than the 6-inch, but it goes where the division goes.' } });
  give(mortar, 'anzac', { variant: { name: 'Stokes Mortar Team', weapon: '3-inch Stokes mortar', text: 'A plain tube on a baseplate: a bomb every few seconds into the next trench.' } });
  give(observers, 'anzac', { variant: { name: 'Forward Observation Officer', weapon: 'revolver, field telephone', text: 'An artillery officer up with the infantry, the wire running back to the guns: what he sees, they hit.' } });
  give(ifv, 'anzac', { stats: { speed: 5.5, range: 110, cavalry: { chargeSpeed: 12, shock: 0.34, sabre: 110, reach: 2.6 } },
    variant: { name: 'Australian Light Horse', weapon: 'SMLE, bayonets, Walers', text: 'Mounted infantry on their Walers: they ride to the fight and shoot on foot — but at Beersheba, 31 October 1917, two regiments charged the trenches at the gallop with bayonets in their fists and took the wells.' } });
  give(reconVehicle, 'anzac', { model: buildFordPatrol, stats: { hp: 200, armor: 0.02, speed: 8, sight: 110, ditch: 0.25 },
    variant: { name: 'Light Car Patrol', weapon: 'Lewis gun', text: 'A Ford Model T with a Lewis gun on a post: no armour at all, but fast across the hard desert and far out on the flank.' } });
  give(crew, 'anzac', { variant: { name: 'Car Crew', weapon: 'revolvers', text: 'The crew of a lost car: a few men with revolvers.' } });
  give(atTeam, 'anzac', { variant: { name: 'Rifle Grenadiers', weapon: 'SMLE with No. 36 rifle grenades', text: 'Mills bombs fired from a cup on the rifle: a light bomb at a hundred yards, enough for a machine-gun post.' } });
  give(sniper, 'anzac', { variant: { name: 'Sniper Pair', weapon: 'SMLE with a scope', text: 'The bushmen\'s marksmen: at Gallipoli Trooper Billy Sing of the Light Horse was credited with some 150 kills from Chatham\'s Post.' } });
  give(scouts, 'anzac', { model: man('anzac', { scout: true, hat: 'plume' }), variant: { name: 'Light Horse Scouts', weapon: 'SMLE, binoculars', text: 'Light horsemen out ahead of the line: they find the enemy\'s posts and the wells.' } });
  give(engineers, 'anzac', { variant: { name: 'Field Company', weapon: 'SMLE, picks, wire', text: 'The engineers: they dig, put up wire and clear it, and find water in the desert.' } });
  give(manpads, 'anzac', { variant: { name: 'Lewis AA Team', weapon: 'Lewis gun on a post mount', text: 'A Lewis gun on a post, pointed at the sky: keeps the German Taubes off the trench.' } });
  give(ambulance, 'anzac', { model: buildAmbulanceUK, variant: { name: 'Field Ambulance', weapon: 'unarmed', text: 'A motor ambulance of the field ambulance: wounded men near it are patched up and go back to the line.' } });
  give(rockets, 'anzac', { variant: { name: '9.45-inch Mortar', weapon: '9.45 in trench mortar', text: 'Each Australian division had its heavy trench mortar battery: the "Flying Pig", a huge bomb that flattens wire and dugouts at short reach.' } });
  give(cbRadar, 'anzac', { variant: { name: 'Sound Ranging Section', weapon: 'Tucker microphones, plotting board', text: 'Sound ranging was an Adelaide man’s work: Lawrence Bragg’s microphones time the bang of each enemy gun, and the plot puts your guns on it. Needs 25 s to lay out.' } });
  give(mineClear, 'anzac', { variant: { name: 'Bangalore Team', weapon: 'Bangalore torpedoes, wire cutters', text: 'Sappers of the field company with lengths of pipe packed with explosive: pushed under the wire and fired, a lane for the assault (X). Three charges.' } });
  // left empty: tank, heavyTank — the tanks the Australians fought beside (Gaza, Hamel, Amiens) were the British Tank Corps’, never their own; recovery — nothing of theirs to mend;
  // airRadar — the Australian Flying Corps flew aeroplanes, the balloons were the RFC’s; aa — the AIF had no anti-aircraft artillery of its own
  give(commandPost, 'anzac', { model: buildStaffCarAU, variant: { name: 'Brigade Headquarters', weapon: 'staff car, field telephones', text: 'The brigade\'s headquarters: where it stops, the telephone lines run out and the reinforcements report there.' } });

  // ---------------------------------------------------------------- the Italian Army
  give(rifles, 'it', { stats: { fireCooldown: 2.3, magSize: 6, reloadTime: 3, playerFireInterval: 1.2 }, variant: { name: 'Squadra di Fanteria', weapon: 'Carcano M91, Fiat-Revelli, petardi', text: 'The Italian infantry in grigio-verde, the Carcano and its six-round clip: eleven battles on the Isonzo, then they held the Piave.' } });
  give(mgTeam, 'it', { stats: { burst: 8, burstInterval: 0.13, fireCooldown: 2.2, magSize: 50, reloadTime: 5 }, variant: { name: 'Mitraglieri', weapon: 'Fiat-Revelli Mod. 1914, 6.5 mm', text: 'The Fiat-Revelli: water-cooled, fed from a box of ten-round compartments — oiled cartridges, it jams in the dust, but it fires all day.' } });
  give(artillery, 'it', { variant: { name: 'Cannone da 75/27', weapon: '75 mm field gun mod. 1911', text: 'The Italian field gun: quick-firing, its shells into the enemy wire and trenches before every attack.' } });
  give(spMortar, 'it', { variant: { name: 'Obice da 149/12', weapon: '149 mm howitzer', text: 'The Italian heavy howitzer: a big shell at a steep angle into the Austrian trenches on the Carso.' } });
  give(rockets, 'it', { variant: { name: 'Bombarda da 240', weapon: '240 mm bombarda', text: 'The bombarde: Italy\'s great trench mortars, massed by the hundred to blast the wire before an attack. A huge bomb, a short reach.' } });
  give(mortar, 'it', { variant: { name: 'Bombarda da 58', weapon: '58 mm bombarda', text: 'The light bombarda, from the French 58: winged bombs over into the next trench.' } });
  give(observers, 'it', { variant: { name: 'Osservatori d\'artiglieria', weapon: 'pistol, field telephone', text: 'The artillery\'s observers on the heights: within their sight the guns are accurate.' } });
  give(ifv, 'it', { variant: { name: 'Lancieri', weapon: 'lance, sword, moschetto', text: 'The Italian lancers: little use in the mountains, but on the plains after Vittorio Veneto they rode through the broken Austrian army.' } });
  give(reconVehicle, 'it', { model: buildLanciaAC, variant: { name: 'Lancia 1ZM', weapon: 'three Fiat-Revelli machine guns', text: 'The Italian armoured car: a big turret with two machine guns and a little one on top for a third, and rails to cut wire. It needs the roads.' } });
  give(crew, 'it', { variant: { name: 'Equipaggio', weapon: 'pistols', text: 'The crew of a lost car: a few men with pistols.' } });
  give(sniper, 'it', { variant: { name: 'Tiratori scelti', weapon: 'Carcano with a scope', text: 'The marksmen: hidden in the rocks of the Carso, deadly to anyone who looks over the parapet.' } });
  give(scouts, 'it', { model: man('it', { scout: true, hat: 'alpini' }), stats: { speed: 2.3 },
    variant: { name: 'Alpini', weapon: 'Carcano, ice axes, binoculars', text: 'The mountain troops in the felt hat with the raven\'s feather: recruited in the Alpine valleys, they climb where nobody else can and see the enemy first.' } });
  give(engineers, 'it', { special: man('it'), variant: { name: 'Genio Zappatori', weapon: 'Carcano, picks, wire', text: 'The Italian sappers: trenches cut into the rock, wire, mines under the enemy\'s summits.' } });
  give(mineClear, 'it', { variant: { name: 'Tubi di gelatina', weapon: 'gelatine tubes, wire cutters', text: 'Sappers with long tubes of explosive pushed under the enemy wire: a lane for the assault (X). Three charges.' } });
  give(aa, 'it', { model: buildAALorryIT, variant: { name: 'Autocannone da 75 CK', weapon: '75 mm AA gun on a Lancia', text: 'A 75 mm gun on a high mount on a Lancia lorry: the first Italian anti-aircraft guns, quick to wherever the enemy\'s aircraft are.' } });
  give(ambulance, 'it', { model: buildAmbulanceIT, variant: { name: 'Autoambulanza', weapon: 'unarmed', text: 'The Italian motor ambulance (Hemingway drove one on the Piave): wounded men near it are patched up and go back to the line.' } });
  give(tank, 'it', { model: buildRenaultFT, stats: tank.factionStats.fr, cost: tank.armyCost.fr / tank.cost,
    variant: { name: 'Renault FT', weapon: 'Puteaux 37 mm', text: 'A handful of French FTs came to Italy in 1918, and the first Italian tank unit formed round them: small, a turret that turns all the way round. Big shell holes swallow it.' } });
  give(heavyTank, 'it', { model: buildFiat2000, cost: 1.3,
    stats: { ...CANNON, damage: 220, pierce: 0.35, splash: 3, fireCooldown: 5, reloadTime: 6, range: 160, playerFireInterval: 5, hp: 1400, armor: 0.45, speed: 1.4, crew: 10, height: 3.6, radius: 3.0, breakdown: 1 / 200, ditch: 0.06, traverse: undefined,
      sideGuns: [Math.PI / 2, Math.PI / 2, -Math.PI / 2, -Math.PI / 2, Math.PI].map((at) => ({ at, arc: 0.9, range: 140, damage: 60, rate: 8, burst: 10 })) },
    variant: { name: 'Fiat 2000', weapon: '65 mm gun in a turret, seven Fiat-Revelli MGs', text: 'Italy’s own heavy tank: forty tonnes, ten men, a turret on top that turns all the way round. Two were built, too late for the war — here it goes up to the Piave. Slow as a walk.' } });
  give(cbRadar, 'it', { variant: { name: 'Sezione fonotelemetrica', weapon: 'microphones, plotting board', text: 'Sound ranging: every enemy gun that fires within reach is plotted for your artillery. Needs 25 s to lay out.' } });
  give(airRadar, 'it', { model: buildBalloonFR, variant: { name: 'Pallone frenato', weapon: 'telephone, binoculars', text: 'The observation balloon of the Italian aerostieri: from its basket the Carso and the Piave lie open to the guns.' } });
  give(manpads, 'it', { variant: { name: 'Mitragliatrice contraerea', weapon: 'Fiat-Revelli on an AA mount', text: 'The Fiat-Revelli on a high mount, pointed at the sky: keeps the Austrian aircraft off the trench.' } });
  give(recovery, 'it', { model: buildSupplyLorryFR, stats: LORRY, variant: { name: 'Fiat 18 BL', weapon: 'unarmed', text: 'The Fiat lorry that carried the Italian army up the mountain roads, here with stores and a workshop: tanks near it are mended and got going again.' } });
  // left empty: atTeam — the Austrians had no tanks to stop
  give(commandPost, 'it', { model: buildStaffCarIT, variant: { name: 'Comando di brigata', weapon: 'staff car, field telephones', text: 'The brigade\'s command post: the reinforcements come forward to it.' } });

  // ---------------------------------------------------------------- the Austro-Hungarian Army
  give(rifles, 'ah', { stats: { fireCooldown: 2.0, magSize: 5, reloadTime: 3, playerFireInterval: 1.0 }, variant: { name: 'Infanterie-Schwarm', weapon: 'Mannlicher M95, Schwarzlose, Handgranaten', text: 'The k.u.k. infantry in pike grey under the German helmet: a dozen languages in one regiment, the straight-pull Mannlicher — quick to work, and the Isonzo trenches held for two years.' } });
  give(mgTeam, 'ah', { stats: { burst: 12, burstInterval: 0.15, fireCooldown: 2.0, magSize: 250, reloadTime: 7 }, variant: { name: 'Schwarzlose MG Team', weapon: 'Schwarzlose M07/12, 8 mm', text: 'The Schwarzlose: a simple, sturdy delayed-blowback gun with a short barrel and a long flash hider, fed from a 250-round belt.' } });
  give(artillery, 'ah', { variant: { name: '8 cm Feldkanone M.5', weapon: '8 cm field gun', text: 'The Austro-Hungarian field gun, its barrel of steel-bronze: shrapnel and high explosive along the Piave.' } });
  give(spMortar, 'ah', { variant: { name: '15 cm schwere Feldhaubitze M.14', weapon: 'Škoda 15 cm howitzer', text: 'Škoda\'s heavy howitzer from Pilsen: the big shells of the Isonzo and of Caporetto\'s bombardment.' } });
  give(rockets, 'ah', { variant: { name: 'Schwerer Minenwerfer', weapon: 'heavy trench mortar', text: 'The heavy Minenwerfer: its bombs come down almost straight on the trench, and nothing in it survives.' } });
  give(mortar, 'ah', { variant: { name: 'Leichter Minenwerfer', weapon: 'light trench mortar', text: 'The light trench mortar: bombs over into the next trench, carried forward with the infantry.' } });
  give(observers, 'ah', { variant: { name: 'Artilleriebeobachter', weapon: 'Pistole, Feldtelefon, Scherenfernrohr', text: 'The artillery observer on the summit: within his sight the guns are accurate.' } });
  give(ifv, 'ah', { variant: { name: 'Dragoner', weapon: 'sword, Mannlicher carbine', text: 'The k.u.k. cavalry: most of it fought on foot in the trenches by 1918, but a few squadrons kept their horses for a pursuit.' } });
  give(sniper, 'ah', { variant: { name: 'Scharfschützen', weapon: 'Mannlicher with Zielfernrohr', text: 'The marksmen of the Kaiserjäger and the Standschützen: hidden in the rocks, deadly at long range.' } });
  give(scouts, 'ah', { variant: { name: 'Patrouille', weapon: 'Repetierstutzen, Handgranaten', text: 'The night patrol: two men who crawl to the enemy wire and come back with what they saw.' } });
  give(engineers, 'ah', { special: man('ah', { weapon: 'flame' }), variant: { name: 'Sappeure', weapon: 'Mannlicher, Flammenwerfer', text: 'The k.u.k. sappers with the flamethrower: a jet of burning oil into the dugout ends the fight for a trench.' } });
  give(ambulance, 'ah', { model: buildAmbulanceAH, variant: { name: 'Sanitätsautomobil', weapon: 'unarmed', text: 'The motor ambulance: wounded men near it are patched up and go back to the line.' } });
  give(reconVehicle, 'ah', { model: buildEhrhardtAC, stats: { hp: 280, sideGuns: undefined },
    variant: { name: 'Romfell', weapon: 'Schwarzlose M07/12 in a turret', text: 'Built in the Budapest arsenal in 1915 by two officers, Romanić and Fellner, whose names it bears: armour all round, one machine gun in a turret. Only a couple were made. It needs the roads.' } });
  give(cbRadar, 'ah', { variant: { name: 'Schallmesstrupp', weapon: 'microphones, plotting board', text: 'The sound-ranging troop: every enemy gun that fires within reach is plotted for your artillery. Needs 25 s to lay out.' } });
  give(airRadar, 'ah', { model: buildBalloonDE, variant: { name: 'Feldballon', weapon: 'Feldtelefon, Fernglas', text: 'The balloon company’s tethered balloon over the Isonzo: its observers direct the guns onto everything that moves.' } });
  give(mineClear, 'ah', { variant: { name: 'Drahtschneider', weapon: 'gestreckte Ladungen, Drahtscheren', text: 'Sappers with long charges and wire cutters, ahead of the Sturmbataillon: a lane through the enemy wire (X). Three charges.' } });
  give(aa, 'ah', { model: buildAALorryDE, variant: { name: '8 cm Luftfahrzeugabwehrkanone', weapon: '8 cm M.5/8 on a lorry', text: 'The field gun on a high anti-aircraft pedestal, carried on a lorry to wherever the Italian Capronis come over.' } });
  give(manpads, 'ah', { variant: { name: 'Fliegerabwehr-MG', weapon: 'Schwarzlose on an AA mount', text: 'The Schwarzlose on its anti-aircraft mount: keeps the enemy aircraft off the trench.' } });
  // left empty: tank, heavyTank — Austria-Hungary built none (Burstyn’s 1911 design stayed on paper); atTeam — the Italians had no tanks in the line; recovery — a couple of armoured cars, nothing to mend
  give(commandPost, 'ah', { model: buildStaffCarAH, variant: { name: 'Gefechtsstand', weapon: 'Stabswagen, Feldtelefon', text: 'The brigade\'s battle headquarters: the reinforcements come forward to it.' } });

  // ---------------------------------------------------------------- the Russian Army of 1917
  give(rifles, 'ru', { stats: { fireCooldown: 2.5, magSize: 5, reloadTime: 4, playerFireInterval: 1.3 }, variant: { name: 'Strelkovoye Otdeleniye', weapon: 'Mosin M1891, bayonets fixed', text: 'The Russian infantry of 1917: the Mosin with its bayonet that never comes off, the greatcoat rolled over the shoulder. Brave in the attack — and tired of the war, after the Revolution.' } });
  give(mgTeam, 'ru', { stats: { burst: 14, burstInterval: 0.11, fireCooldown: 2.0, magSize: 250, reloadTime: 7 }, variant: { name: 'Maxim Team', weapon: 'Maxim M1910 on the Sokolov mount', text: 'The Russian Maxim on its little wheeled carriage, a steel shield in front: dragged into position like a cart, it fires as long as the water and the belts last.' } });
  give(artillery, 'ru', { stats: { fireCooldown: 3.4 }, variant: { name: '3-inch Field Gun', weapon: '76 mm M1902', text: 'The "three-inch": Russia\'s quick-firing field gun, as good as any in the war — its shrapnel cut down whole waves at short range.' } });
  give(spMortar, 'ru', { variant: { name: '152 mm Howitzer', weapon: '152 mm howitzer M1910', text: 'The heavy howitzer, of Schneider design: never enough of them, and never enough shells.' } });
  give(mortar, 'ru', { variant: { name: 'Bombomyot Team', weapon: 'trench mortar (bomb-thrower)', text: 'The "bomb-thrower": a trench mortar lobbing its bombs into the enemy line.' } });
  give(observers, 'ru', { variant: { name: 'Artillery Observers', weapon: 'revolver, field telephone', text: 'The battery\'s observers in the front line: within their sight the guns are accurate.' } });
  give(ifv, 'ru', { stats: { cavalry: { chargeSpeed: 11.5, shock: 0.32, sabre: 125, reach: 3.3 } }, variant: { name: 'Cossacks', weapon: 'pika lance, shashka, carbine', text: 'The Don Cossacks in the papakha: the lance and the shashka at the charge, the carbine on foot. Still the terror of an enemy caught in the open.' } });
  give(reconVehicle, 'ru', { model: buildAustinAC, stats: { hp: 340, armor: 0.15, sideGuns: [{ at: 0, arc: 1.4, range: 140, damage: 60, rate: 8, burst: 10, y: 2.3 }] },
    variant: { name: 'Austin-Putilov', weapon: 'two Maxims in two turrets', text: 'A British Austin chassis armoured at the Putilov works: two machine-gun turrets side by side, each covering its own half. Fast on roads, lost in the mud.' } });
  give(crew, 'ru', { variant: { name: 'Crew', weapon: 'Nagant revolvers', text: 'The crew of a lost armoured car: a few men with revolvers.' } });
  give(sniper, 'ru', { variant: { name: 'Snipers', weapon: 'Mosin with a scope', text: 'The marksmen: hidden in the forest along the Dvina, patient and deadly.' } });
  give(scouts, 'ru', { model: man('ru', { scout: true, hat: 'papakha' }), variant: { name: 'Okhotniki', weapon: 'carbines, binoculars', text: 'The "hunters": the regiment\'s volunteer scouts, out by night to find the enemy\'s posts and take a prisoner.' } });
  give(engineers, 'ru', { special: man('ru'), variant: { name: 'Sappers', weapon: 'Mosin, picks, wire', text: 'The Russian sappers: trenches, wire, and the bridges over the Dvina.' } });
  give(aa, 'ru', { model: buildAALorryRU, variant: { name: '76 mm AA Lorry', weapon: 'Lender 76 mm on a Russo-Balt', text: 'The first Russian anti-aircraft gun, the Lender 3-inch, on a lorry: shrapnel bursts round the enemy aircraft.' } });
  give(ambulance, 'ru', { model: buildAmbulanceRU, variant: { name: 'Motor Ambulance', weapon: 'unarmed', text: 'A motor ambulance of the Red Cross: wounded men near it are patched up and go back to the line.' } });
  give(heavyTank, 'ru', { model: buildGarfordPutilov,
    stats: { ...CANNON, damage: 230, pierce: 0.3, splash: 3, fireCooldown: 4, reloadTime: 6, range: 170, playerFireInterval: 4, hp: 600, armor: 0.15, speed: 3.2, crew: 9, height: 2.9, radius: 2.4, breakdown: 1 / 300, ditch: 0.35, traverse: 2.35,
      sideGuns: [{ at: Math.PI / 2, arc: 1.2, range: 140, damage: 60, rate: 8, burst: 10, y: 1.8 }, { at: -Math.PI / 2, arc: 1.2, range: 140, damage: 60, rate: 8, burst: 10, y: 1.8 }] },
    variant: { name: 'Garford-Putilov', weapon: '76 mm gun in a turret, three Maxims', text: 'An American Garford lorry armoured at the Putilov works: eleven tonnes, the three-inch in a turret at the back and a Maxim in each side. Slow, heavy, it needs a good road — and it out-guns any armoured car.' } });
  give(rockets, 'ru', { stats: MEDIUM_MW, variant: { name: 'Heavy Bombomyot', weapon: '58 mm No. 2 trench mortar (French-supplied)', text: 'A French trench mortar firing a big winged bomb from the end of its tube: the heavy bomb-throwers of the 1916 offensive, to blast the wire short.' } });
  give(airRadar, 'ru', { model: buildBalloonFR, variant: { name: 'Aerostat', weapon: 'telephone, binoculars', text: 'The kite balloon of a Russian balloon detachment: two observers in the basket, the whole sector laid out for the guns.' } });
  give(mineClear, 'ru', { variant: { name: 'Sapper Wire Party', weapon: 'explosive charges, wire cutters', text: 'Sappers who crawl out at night and blow lanes in the enemy wire, as before Brusilov’s attack of 1916 (X). Three charges.' } });
  give(manpads, 'ru', { variant: { name: 'Maxim AA Team', weapon: 'Maxim on an AA mount', text: 'The Maxim lifted off its wheels onto a high mount, pointed at the sky: keeps the German aircraft high.' } });
  give(recovery, 'ru', { model: buildSupplyLorryFR, stats: LORRY, variant: { name: 'Workshop Lorry', weapon: 'unarmed', text: 'The armoured-car division’s workshop and stores lorry: armoured cars near it are mended and got going again.' } });
  // left empty: tank — Russia had none (Lebedenko’s Tsar Tank stuck in the mud on its first trial); cbRadar — no sound ranging we can name at the Russian front; atTeam — the Germans sent no tanks east
  give(commandPost, 'ru', { model: buildStaffCarRU, variant: { name: 'Regimental Staff', weapon: 'staff car, field telephones', text: 'The regiment\'s headquarters — and its soldiers\' committee, in 1917: the reinforcements come forward to it.' } });

  // the riderless horse and the men who lost theirs, for every army with horses
  for (const a of Object.keys(SIDE)) {
    looseHorse.variants[a] ??= looseHorse.variants.nato;
    dismounted.variants[a] ??= dismounted.variants.nato;
  }
  // the engineers: a flamethrower only where the army had them (Austria-Hungary's): the rest carry their rifles
  engineers.specialist = { ...engineers.specialist, armyStats: { ...engineers.specialist.armyStats,
    ot: { ...rifles.stats, ...rifles.factionStats.pact, ignite: undefined, weaponSound: undefined },
    anzac: engineers.specialist.armyStats.nato,
    it: { ...rifles.stats, ...rifles.factionStats.it, ignite: undefined, weaponSound: undefined },
    ru: { ...rifles.stats, ...rifles.factionStats.ru, ignite: undefined, weaponSound: undefined } } };

  return { stormTroops, mountainGun };
}
