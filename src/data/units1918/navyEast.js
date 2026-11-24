// The navies of the east, 1918: the Russian Baltic Fleet (`ru`, the nato side: Moon Sound, October 1917) and the
// Ottoman Navy (`ot`, the pact side: the Dardanelles, Imbros, the Black Sea) on the 1918 ship types (./ships.js),
// called once from ./index.js. Each army gets its own entry in the type's tables — variants, names (written in
// full, no HMS/SMS: entities/UnitStack.js shipName), models, mounts, factionStats (its stats over the side's), armyCost,
// and armyType (its own hull length and camera where her size differs). Both armies are `own` (data/factions.js
// armyHas): these variants put the ships on their lists. Models: models/ships1918east.js.
//   ru  Gangut (battleship), Slava (cruiser: the old battleship in the capital ship's second slot), Bayan (lightCruiser),
//       Novik (destroyer), Grozyashchiy gunboat (frigate), Bars (submarine), Amur (minelayer), Fugas (minesweeper)
//   ot  Turgut Reis (battleship), Yavuz Sultan Selim (cruiser), Midilli (lightCruiser), Muavenet-i Milliye (destroyer),
//       Peyk-i Şevket (frigate), Nusret (minelayer), troopship (transport). No submarines, no motor boats: none in service.
import { buildGangut, buildSlava, buildBayan, buildNovik, buildGrozyashchiy, buildBars, buildAmur, buildFugas,
  buildYavuz, buildMidilli, buildTurgutReis, buildMuavenet, buildPeyk, buildNusret, buildTroopshipOT } from '../models/ships1918east.js';

const FWD = 0;
const AFT = Math.PI;
const BEAM = Math.PI / 2;
// (as ./ships.js: a gun mount, a torpedo mount, the sea scale)
const gun = (at, facing, o) => ({ at, facing, arc: 4.6, spread: 0.013, splash: 4, pierce: 0.3, shell: 760, size: 1.8, ...o });
const torps = (at, o) => ({ at, torpedo: true, arc: 2.2, count: 2, range: 1300, speed: 18, damage: 2400, reload: 110, ...o });
const TUBES = (at, facing, o) => torps(at, { facing, arc: 0.9, ...o });
const DC = (o) => ({ count: 4, reload: 22, radius: 35, damage: 1000, ...o });
const RANGE = 0.55;
const SCALED = ['range', 'aggroRange', 'preferredRange', 'sight', 'sonar', 'hearing'];
const near = (o) => { const r = { ...o }; for (const k of SCALED) if (r[k]) r[k] = Math.round(r[k] * RANGE / 5) * 5; return r; };

/** Put `army`'s own ship on type `t`. */
function give(t, army, { names, model, variant, stats, mounts, cost, hull, camera }) {
  t.names = { ...t.names, [army]: names };
  t.models = { ...t.models, [army]: model };
  t.variants = { ...t.variants, [army]: variant };
  if (stats) t.factionStats = { ...t.factionStats, [army]: near(stats) };
  if (mounts) t.mounts = { ...t.mounts, [army]: mounts.map(near) };
  if (cost) t.armyCost = { ...t.armyCost, [army]: cost };
  if (hull) t.armyType = { ...t.armyType, [army]: { ...t.armyType?.[army], hull, ...(camera && { camera }) } };
}

// the guns
const TWELVE = { range: 3600, reload: 30, damage: 1900, splash: 11, pierce: 0.68, shell: 800, size: 3.4, spread: 0.012 };   // (Gangut's triple 12-inch/52)
const OLD_TWELVE = { range: 3000, reload: 34, damage: 1300, splash: 10, pierce: 0.6, shell: 780, size: 3.2, spread: 0.014 }; // (Slava's twin 12-inch/40)
const TWIN_SIX = { range: 2200, reload: 8, damage: 380, splash: 5, pierce: 0.38, shell: 780, size: 2.2, spread: 0.014 };
const EIGHT = { range: 2700, reload: 12, damage: 560, splash: 6, pierce: 0.5, shell: 780, size: 2.6, spread: 0.013 };
const CASEMATE = (at, facing, o) => gun(at, facing, { range: 2100, reload: 6, damage: 260, splash: 4, pierce: 0.3, arc: 2.2, ...o });
const RU102 = { range: 2000, reload: 4, damage: 170, splash: 3.5, pierce: 0.25, shell: 760, size: 1.5 };     // (the 102 mm/60: long and quick)
const ELEVEN = { range: 3400, reload: 26, damage: 1300, splash: 10, pierce: 0.68, shell: 800, size: 3.1, spread: 0.009 }; // (Yavuz's 28 cm SK L/50)
const OLD_ELEVEN = { range: 2700, reload: 36, damage: 1150, splash: 9, pierce: 0.55, shell: 760, size: 3, spread: 0.015 }; // (Turgut Reis's 28 cm of 1891)
const FIFTEEN_CM = { range: 2400, reload: 7, damage: 300, splash: 5, pierce: 0.4, shell: 780, size: 2.2, spread: 0.011 };
const SMALL = { range: 1600, reload: 3, damage: 100, splash: 2.5, pierce: 0.15, shell: 700, size: 1.1 };      // (75 mm, 57 mm)
const TEN_FIVE = { range: 1900, reload: 4, damage: 160, splash: 3.5, pierce: 0.25, shell: 750, size: 1.5 };

export default function navyEast(T) {
  // ---------------------------------------------------------------- the Russian Baltic Fleet (Moon Sound, October 1917)
  give(T.battleship, 'ru', { names: ['Gangut', 'Petropavlovsk', 'Sevastopol', 'Poltava'], model: buildGangut, cost: 1250,
    hull: { length: 181, beam: 26.9 },
    stats: { hp: 22000, armor: 0.56, speed: 13, flareRounds: 4 },
    mounts: [gun([0, 10, 57], FWD, TWELVE), gun([0, 10, 14], FWD, { ...TWELVE, arc: 3.6 }), gun([0, 10, -22], AFT, { ...TWELVE, arc: 3.6 }), gun([0, 10, -66], AFT, TWELVE),
      CASEMATE([13, 5, 30], BEAM), CASEMATE([-13, 5, 30], -BEAM), CASEMATE([13, 5, -30], BEAM), CASEMATE([-13, 5, -30], -BEAM)],
    variant: { name: 'Gangut-class dreadnought', weapon: '12 × 12-inch, 16 × 120 mm', text: 'Russia\'s first dreadnoughts, built in the Baltic yards: twelve 12-inch guns in four triple turrets all on one level, so every one bears on the broadside — and thin armour for so many guns. Kept at Helsingfors for most of the war, their crews mutinous by 1917.' } });

  give(T.cruiser, 'ru', { names: ['Slava', 'Grazhdanin'], model: buildSlava, cost: 780,
    hull: { length: 121, beam: 23.2 }, camera: { distance: 140, height: 44, shoulder: 0 },
    stats: { hp: 13000, armor: 0.5, speed: 10, radius: 10, height: 26, range: 3000, aggroRange: 3000, preferredRange: 2400, damage: 1300, fireCooldown: 34 },
    mounts: [gun([0, 10, 42], FWD, OLD_TWELVE), gun([0, 10, -46], AFT, OLD_TWELVE),
      gun([7.6, 12, 22], BEAM, { ...TWIN_SIX, arc: 3 }), gun([-7.6, 12, 22], -BEAM, { ...TWIN_SIX, arc: 3 }), gun([7.6, 12, 2], BEAM, { ...TWIN_SIX, arc: 3 }), gun([-7.6, 12, 2], -BEAM, { ...TWIN_SIX, arc: 3 }),
      gun([7.6, 12, -18], BEAM, { ...TWIN_SIX, arc: 3 }), gun([-7.6, 12, -18], -BEAM, { ...TWIN_SIX, arc: 3 })],
    variant: { name: 'Borodino-class battleship', weapon: '4 × 12-inch, 12 × 6-inch', text: 'The last of the Borodinos — her four sisters went down at Tsushima. An old pre-dreadnought, slow and outranged, she held the Moon Sound against König and Kronprinz in October 1917 until three hits flooded her and she was scuttled across the channel.' } });

  give(T.lightCruiser, 'ru', { names: ['Admiral Makarov', 'Bayan', 'Pallada'], model: buildBayan, cost: 520,
    stats: { hp: 7600, armor: 0.36, speed: 12.5, range: 2700, aggroRange: 2700, preferredRange: 2000, damage: 560, fireCooldown: 12 },
    mounts: [gun([0, 9, 52], FWD, EIGHT), gun([0, 9, -54], AFT, EIGHT),
      CASEMATE([8, 5, 16], BEAM), CASEMATE([-8, 5, 16], -BEAM), CASEMATE([8, 5, -14], BEAM), CASEMATE([-8, 5, -14], -BEAM)],
    variant: { name: 'Bayan-class armoured cruiser', weapon: '2 × 8-inch, 8 × 6-inch, mines', text: 'A belted cruiser of the Russo-Japanese War\'s design, rebuilt after it: two 8-inch in turrets, the 6-inch in casemates along her side. Slower than a light cruiser, far harder to sink — Bayan took a 12-inch shell off Moon Sound and steamed on.' } });

  give(T.destroyer, 'ru', { names: ['Novik', 'Grom', 'Pobeditel', 'Zabiyaka', 'Desna', 'Samson', 'Konstantin', 'Avtroil', 'Gavriil', 'Azard', 'Leytenant Ilyin', 'Kapitan Izylmetyev'], model: buildNovik, cost: 420,
    hull: { length: 102, beam: 9.5 },
    stats: { hp: 3000, speed: 17, range: 2000, aggroRange: 2000, preferredRange: 1400, damage: 170 },
    mounts: [gun([0, 7, 42], FWD, RU102), gun([0, 5, -8], AFT, { ...RU102, arc: 3.6 }), gun([0, 6, -36], AFT, RU102), gun([0, 6, -46], AFT, RU102),
      torps([0, 5, 8], { count: 2 }), torps([0, 5, -16], { count: 2 }), torps([0, 5, -22], { count: 2 }), torps([0, 5, -28], { count: 2 })],
    variant: { name: 'Novik-class destroyer', weapon: '4 × 102 mm, 8 torpedo tubes, mines', text: 'The fastest ship afloat in 1913 and the model for every destroyer after her: oil-fired turbines, four long 102 mm guns, eight tubes. Grom fought the German torpedo boats in the Kassar Wiek and was boarded sinking.' } });

  give(T.frigate, 'ru', { names: ['Grozyashchiy', 'Khrabry', 'Khivinets', 'Bobr'], model: buildGrozyashchiy, cost: 240,
    hull: { length: 69, beam: 12.6 },
    stats: { hp: 2600, armor: 0.2, speed: 8, sonar: 0, depthCharges: undefined, range: 2100, aggroRange: 2100, preferredRange: 1500, damage: 260, fireCooldown: 6 },
    mounts: [gun([0, 5, 26], FWD, { range: 2100, reload: 6, damage: 260, splash: 4, pierce: 0.3 }), gun([0, 5, -28], AFT, { range: 2100, reload: 6, damage: 260, splash: 4, pierce: 0.3 }),
      gun([4, 5, 4], BEAM, { ...TEN_FIVE, arc: 2.6 }), gun([-4, 5, 4], -BEAM, { ...TEN_FIVE, arc: 2.6 })],
    variant: { name: 'Armoured gunboat', weapon: '152 mm and 120 mm guns', text: 'A low, armoured gunboat of the 1890s for the shallows, up-gunned in the war: no match for a destroyer\'s speed, but her belt and her big guns held the Kassar Wiek against the German torpedo boats in October 1917.' } });

  give(T.submarine, 'ru', { names: ['Bars', 'Vepr', 'Volk', 'Gepard', 'Tur', 'Tigr', 'Lvitsa', 'Pantera', 'Rys', 'Yaguar', 'Edinorog', 'Ersh'], model: buildBars, cost: 420,
    hull: { length: 68, beam: 4.5 },
    stats: { hp: 1500, speed: 7.5, submarine: { submerged: 3.6, dive: 1.4, periscope: 5, deep: 30 } },
    mounts: [TUBES([0, -1, 30], 0, { count: 2, range: 1200, damage: 2200, reload: 60 }), TUBES([0, -1, -30], Math.PI, { count: 2, range: 1200, damage: 2200, reload: 70 }),
      torps([2.4, 0, 0], { facing: BEAM, arc: 0.9, count: 4, range: 1100, damage: 2200, reload: 9999 }), torps([-2.4, 0, 0], { facing: -BEAM, arc: 0.9, count: 4, range: 1100, damage: 2200, reload: 9999 }),
      gun([0, 3, 12], 0, { range: 1100, reload: 5, damage: 120, splash: 2.5, surfaced: true, arc: 5.2 })],
    variant: { name: 'Bars-class submarine', weapon: '4 tubes, 8 drop-collars, 57/75 mm', text: 'Bubnov\'s long boat: four tubes and eight Drzewiecki collars on the casing — torpedoes dropped over the side, a broadside once, no reloads. Slow to dive, and a quarter of the class lost in the Baltic.' } });

  give(T.minelayer, 'ru', { names: ['Amur', 'Ladoga', 'Volga', 'Narova', 'Pripyat', 'Onega'], model: buildAmur, cost: 380,
    hull: { length: 91, beam: 14 },
    stats: { minelayer: { count: 40, spacing: 30 }, hp: 3400, armor: 0.1, speed: 10, radius: 7, height: 11, range: 2000, aggroRange: 2000, preferredRange: 1500, damage: 200, fireCooldown: 5 },
    mounts: [gun([0, 7, 38], FWD, { ...TEN_FIVE, damage: 200, reload: 5 }), gun([4.6, 6, 4], BEAM, { ...TEN_FIVE, damage: 200, reload: 5, arc: 2.8 }), gun([-4.6, 6, 4], -BEAM, { ...TEN_FIVE, damage: 200, reload: 5, arc: 2.8 }), gun([0, 8, -20], AFT, { ...TEN_FIVE, damage: 200, reload: 5 })],
    variant: { name: 'Amur-class minelayer', weapon: '120 mm guns, 40 mines', text: 'The Baltic was the war\'s most mined sea, and most of the mines Russian: the Central Position across the Gulf of Finland, the fields off Moon Sound. Slow and soft — she lays her field at night where the Germans will come.' } });

  give(T.minesweeper, 'ru', { names: ['Fugas', 'Zapal', 'Vzryv', 'Provodnik', 'Minrep', 'Shchit', 'Kapsyul', 'Udarnik'], model: buildFugas, cost: 180,
    hull: { length: 50, beam: 6.4 },
    stats: { hp: 1100, speed: 8, radius: 4, height: 6 },
    mounts: [gun([0, 5, 18], FWD, SMALL), gun([0, 5, -6], AFT, SMALL)],
    variant: { name: 'Fugas-class minesweeper', weapon: '63 mm guns, the sweep', text: 'The first purpose-built minesweepers in any navy (1910): small coal-burners that cleared the Baltic Fleet\'s way out through its own fields and the Germans\'.' } });

  // ---------------------------------------------------------------- the Ottoman Navy (the Dardanelles, Imbros, the Black Sea)
  give(T.battleship, 'ot', { names: ['Turgut Reis', 'Barbaros Hayreddin'], model: buildTurgutReis, cost: 820,
    hull: { length: 115.7, beam: 19.5 }, camera: { distance: 140, height: 44, shoulder: 0 },
    stats: { hp: 12000, armor: 0.5, speed: 9.5, radius: 10, height: 24, range: 2700, aggroRange: 2700, preferredRange: 2200, damage: 1150, fireCooldown: 36 },
    mounts: [gun([0, 10, 40], FWD, OLD_ELEVEN), gun([0, 10, -14], AFT, { ...OLD_ELEVEN, arc: 3.8 }), gun([0, 10, -44], AFT, OLD_ELEVEN),
      CASEMATE([9.5, 5, 18], BEAM, { damage: 200 }), CASEMATE([-9.5, 5, 18], -BEAM, { damage: 200 })],
    variant: { name: 'Brandenburg-class battleship', weapon: '6 × 28 cm, 8 × 10.5 cm', text: 'Bought from Germany in 1910: an old pre-dreadnought with six 28 cm guns in three turrets on the centreline. Slow and worn out, she shelled the Allied landings at Gallipoli from across the peninsula.' } });

  give(T.cruiser, 'ot', { names: ['Yavuz Sultan Selim'], model: buildYavuz, cost: 950,
    hull: { length: 186.6, beam: 29.4 },
    stats: { hp: 17000, armor: 0.52, speed: 14.5, range: 3400, aggroRange: 3400, preferredRange: 2700, damage: 1300, fireCooldown: 26 },
    mounts: [gun([0, 10, 62], FWD, ELEVEN), gun([9, 10, 12], BEAM, { ...ELEVEN, arc: 3.2 }), gun([-9, 10, 4], -BEAM, { ...ELEVEN, arc: 3.2 }),
      gun([0, 13, -46], AFT, ELEVEN), gun([0, 10, -60], AFT, ELEVEN),
      CASEMATE([13, 5, 20], BEAM, { reload: 4.5 }), CASEMATE([-13, 5, 20], -BEAM, { reload: 4.5 }), CASEMATE([13, 5, -12], BEAM, { reload: 4.5 }), CASEMATE([-13, 5, -12], -BEAM, { reload: 4.5 })],
    variant: { name: 'Moltke-class battlecruiser', weapon: '10 × 28 cm, 12 × 15 cm', text: 'The Goeben: she ran from the Royal Navy to Constantinople in August 1914 and was handed to the Sultan, her German crew in fezzes. Ten 28 cm guns, the two wing turrets en echelon amidships — the strongest ship in the Black Sea, and she knew how to take a mine and come home.' } });

  give(T.lightCruiser, 'ot', { names: ['Midilli'], model: buildMidilli, cost: 560,
    stats: { hp: 6200, speed: 15.5 },
    mounts: [gun([2.4, 9, 56], FWD, FIFTEEN_CM), gun([-2.4, 9, 56], FWD, FIFTEEN_CM), gun([5.4, 7, 20], BEAM, { ...FIFTEEN_CM, arc: 3 }), gun([-5.4, 7, 20], -BEAM, { ...FIFTEEN_CM, arc: 3 }),
      gun([5.4, 7, -24], BEAM, { ...FIFTEEN_CM, arc: 3 }), gun([-5.4, 7, -24], -BEAM, { ...FIFTEEN_CM, arc: 3 }), gun([0, 9, -48], AFT, FIFTEEN_CM), gun([0, 7, -58], AFT, FIFTEEN_CM),
      torps([3.6, 6, -30], { count: 2, reload: 140 })],
    variant: { name: 'Magdeburg-class light cruiser', weapon: '8 × 15 cm, 2 torpedo tubes, mines', text: 'The Breslau, Goeben\'s consort, four funnels and a German crew under the Ottoman flag: she raided the Russian coast, laid mines off Novorossiysk, and sank on five mines off Imbros in January 1918.' } });

  give(T.destroyer, 'ot', { names: ['Muavenet-i Milliye', 'Yadigâr-ı Millet', 'Numune-i Hamiyet', 'Gayret-i Vataniye'], model: buildMuavenet, cost: 340,
    hull: { length: 74, beam: 7.9 },
    stats: { hp: 2200, speed: 15, range: 1600, aggroRange: 1600, preferredRange: 1100, damage: 100 },
    mounts: [gun([0, 5, 30], FWD, SMALL), gun([2.4, 5, 6], BEAM, { ...SMALL, arc: 2.6 }), gun([-2.4, 5, 6], -BEAM, { ...SMALL, arc: 2.6 }), gun([0, 5, -32], AFT, SMALL),
      torps([0, 5, 2], { count: 1, range: 1400 }), torps([0, 5, -10], { count: 1, range: 1400 }), torps([0, 5, -18], { count: 1, range: 1400 })],
    variant: { name: 'Muavenet-i Milliye-class destroyer', weapon: '2 × 75 mm, 2 × 57 mm, 3 torpedo tubes', text: 'Four Schichau boats of the German S 165 type, bought in 1910. On the night of 13 May 1915 Muavenet-i Milliye crept down the Dardanelles under the cliffs and torpedoed the battleship Goliath at anchor.' } });

  give(T.frigate, 'ot', { names: ['Peyk-i Şevket', 'Berk-i Satvet'], model: buildPeyk, cost: 240,
    stats: { hp: 1900, speed: 12, sonar: 300, depthCharges: DC({ count: 2, reload: 30 }), range: 1900, aggroRange: 1900, preferredRange: 1300, damage: 160 },
    mounts: [gun([0, 6, 32], FWD, TEN_FIVE), gun([0, 6, -34], AFT, TEN_FIVE), gun([3, 5, 12], BEAM, { ...SMALL, arc: 2.6 }), gun([-3, 5, 12], -BEAM, { ...SMALL, arc: 2.6 }),
      gun([3, 5, -16], BEAM, { ...SMALL, arc: 2.6 }), gun([-3, 5, -16], -BEAM, { ...SMALL, arc: 2.6 }), torps([0, 4, -26], { count: 1, range: 1300 })],
    variant: { name: 'Peyk-i Şevket-class torpedo gunboat', weapon: '2 × 105 mm, 6 × 57 mm, torpedo tubes', text: 'A Krupp-built torpedo cruiser of 1907, too slow for the fleet: she escorts the colliers along the Anatolian coast and guards the straits\' mouth.' } });

  give(T.minelayer, 'ot', { names: ['Nusret', 'İntibah', 'Giresun'], model: buildNusret, cost: 220,
    hull: { length: 40, beam: 7.5 }, camera: { distance: 55, height: 18, shoulder: 0 },
    stats: { minelayer: { count: 26, spacing: 30 }, hp: 900, armor: 0, speed: 9, radius: 4, height: 6, sight: 1800, range: 1200, aggroRange: 1200, preferredRange: 900, damage: 60, fireCooldown: 3 },
    mounts: [gun([0, 4, 14], FWD, { ...SMALL, range: 1200, damage: 60 }), gun([0, 4, -2], AFT, { ...SMALL, range: 1200, damage: 60 })],
    variant: { name: 'Nusret-class minelayer', weapon: '2 × 47 mm, 26 mines', text: 'A little German-built minelayer. On the night of 8 March 1915 she laid a line of twenty-six mines along Erenköy Bay, parallel to the shore where the Allied battleships turned: ten days later they sank Bouvet, Irresistible and Ocean.' } });

  give(T.transport, 'ot', { names: ['Gül Cemal', 'Bezm-i Âlem', 'Mithat Paşa', 'Plevne', 'Akdeniz', 'Kios'], model: buildTroopshipOT,
    hull: { length: 118, beam: 15 },
    variant: { name: 'Vapur (troopship)', weapon: 'one 7.5 cm', text: 'A Bosporus liner or Black Sea collier taken up for trooping, the Russians\' submarines her danger: the troops aboard hold a zone and bring in command points.' } });
}
