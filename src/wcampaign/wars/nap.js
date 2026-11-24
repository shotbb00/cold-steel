// The 1806 war's world for the world campaign (src/wcampaign): the wars of the Third and Fourth Coalitions from the autumn
// of 1805 — Ulm, Trafalgar, Austerlitz; Jena and Auerstedt in 1806; Poland in 1807: Eylau, Friedland, Tilsit. Germany and
// Austria, Prussia and Poland, Italy and Dalmatia, and the sea (the Atlantic and the Channel, the North Sea and the Baltic,
// the Mediterranean and the Adriatic). Data only, no game imports (the fields as in wars/ww1.js). The coalitions change by
// the engine's generic hooks (engine.js):
//   scenario `neutral`   powers not in the war yet (Prussia and Saxony in 1805, Denmark until 1807): their `lands` are
//                        closed to every army (closed()), their armies stay home (idle())
//   events' `joins`      a neutral power comes in (Prussia, with Saxony: in 1806 — or in December 1805 if Austria still stands)
//   events' `peace`      a power makes peace (collapse()): its `cede` passes to the enemy, the rest of its `lands` is handed
//                        back and closed — Austria at Pressburg, Prussia and Russia at Tilsit
//   events' `switch`     a power goes over to the other side (switchSides()): Saxony after Jena
//   war.ends             the war's own end: the three continental powers all at peace — Britain fights on alone at sea
// Province maps: the 1806 maps where they exist (jena, auerstedt, pultusk, eylau, heilsberg, friedland; at sea trafalgar,
// brest, copenhagen, caribbean); every other `map:` / `coastal:` id is the map planned for it (TODO map: not built yet —
// engine newCampaign/refreshMaps drop an id the game doesn't have, so the battle is resolved until its map is built; the
// gap list: cold-steel-map-briefs/1806/GAPS.md). Sea zones without their own map are fought on openSea.
// The armies: France (fr) and Bavaria (by) against Prussia (pr), Saxony (sx), Russia (ru) and Britain (gb, at sea and in
// landings); Austria (au) is the campaign's own new army, no roster yet (data/epoch.js `own`, no regions): on a map it
// fights as the side's army that fits it (data/units/index.js campaignArmy). Spain's ships sail as the French navy's.

const INF = 'infantry', ARM = 'armour', ART = 'artillery', CAV = 'cavalry', GUARD = 'guard';

export const NAP = {
  id: 'nap',
  epoch: '1806',
  name: 'The Napoleonic Wars, 1805–07',
  mapStyle: 'paper', // (ui/WorldMap.js: the yellowed paper sheet, sepia coast and grease-pencil front — the closest of the war room's styles to an engraved campaign map: tools/mapstyles.js 'engraved' is a sketch only)
  sides: { nato: 'French Empire', pact: 'Coalition' },
  blurb: 'Autumn 1805 on one map: the Grande Armée has left the Channel camps and crosses the Rhine for the Danube; the Austrians wait at Ulm, the Russians are on the march, Nelson is off Cádiz. Prussia sits on the fence. Coalitions form and break — Austria may make peace, Prussia may join, Saxony may change sides, Russia may come to terms on a raft on the Niemen. Turns of half a week.',
  sideText: { nato: 'France, the Kingdom of Italy and Bavaria — Spain’s fleet, later Saxony and Denmark', pact: 'Britain, Austria, Russia — and Prussia and Saxony, when they come in' },
  home: ['germany', 'prussia', 'italy'],
  areas: [
    [[-12, 60], [33, 60], [33, 35.2], [15.5, 35.2], [12, 37.6], [8, 38.2], [-1, 37.0], [-5.2, 36.0], [-12, 36.0]], // Europe from the Atlantic to Vilna (not Africa's coast)
    [[-80, 12], [-58, 12], [-58, 26], [-80, 26]],   // the West Indies
  ],
  theatres: {
    germany: { name: 'Germany and Austria', lat: 49.2, lon: 12.2 },
    prussia: { name: 'Prussia and Poland', lat: 53.3, lon: 18.2 },
    italy: { name: 'Italy and Dalmatia', lat: 42.6, lon: 13.4 },
    atlantic: { name: 'The Atlantic and the Channel', lat: 45, lon: -9, sea: true },
    northern: { name: 'The North Sea and the Baltic', lat: 56.5, lon: 9, sea: true },
    med: { name: 'The Mediterranean and the Adriatic', lat: 38, lon: 9, sea: true },
  },

  // The powers: a power whose capitals are all lost surrenders (engine surrenders()); one too war-weary collapses
  // (weariness()) — a peace treaty: `cede` to the enemy (spoil: false — the new owner's own), the rest of its `lands` back.
  powers: {
    france: { name: 'France', short: 'France', side: 'nato', armies: ['fr'], capitals: ['paris'],
      lands: ['paris', 'boulogne', 'brittany', 'alsace', 'rhineland', 'toulon', 'milan', 'verona', 'romagna'],
      weary: { start: 8, base: 0.06, low: 0.4, won: 0.25, lost: 0.35, ground: 0.6, home: ['paris', 'boulogne', 'brittany', 'alsace', 'rhineland', 'toulon'], at: 100, morale: 30, ends: true,
        text: 'France has had enough: the conscripts hide in the woods, the Bourse collapses, the marshals tell the Emperor the army will march no further.', endText: 'France asked for peace' } },
    bavaria: { name: 'Bavaria', side: 'nato', morale: 8, armies: ['by'], capitals: ['franconia', 'munich'] },
    denmark: { name: 'Denmark', side: 'nato', morale: 5, armies: ['dk'], capitals: ['zealand'], lands: ['zealand'] },
    britain: { name: 'Britain', side: 'pact', armies: ['gb'], capitals: ['britain'], lands: ['britain', 'gibraltar', 'sicily'] },
    austria: { name: 'Austria', short: 'Austria', side: 'pact', armies: ['au'], capitals: ['vienna', 'hungary'],
      lands: ['vienna', 'hungary', 'wachau', 'linz', 'inn', 'styria', 'moravia', 'olmutz', 'bohemia', 'galicia', 'tyrol', 'carinthia', 'trieste', 'friuli', 'venetia', 'dalmatia', 'cattaro'],
      weary: { start: 20, base: 0.1, low: 0.4, won: 0.3, lost: 0.6, ground: 0.5, home: ['vienna', 'hungary', 'wachau', 'linz', 'inn', 'moravia', 'bohemia', 'tyrol', 'venetia'], at: 100, morale: 12, rally: 40, spoil: false,
        cede: ['venetia', 'friuli', 'dalmatia', 'cattaro', 'tyrol', 'ulm', 'donauworth', 'munich'],
        text: 'Austria makes peace: Venetia and Dalmatia to Napoleon’s Kingdom of Italy, the Tyrol to Bavaria — the French march out of Vienna, the Russians march home.' } },
    russia: { name: 'Russia', short: 'Russia', side: 'pact', armies: ['ru'], capitals: ['russia'], lands: ['vilna', 'volhynia', 'russia', 'corfu'],
      weary: { start: 10, base: 0.04, low: 0.2, won: 0.3, lost: 0.35, ground: 0.2, home: ['vilna', 'volhynia'], at: 100, morale: 15, rally: 30, spoil: false, cede: ['corfu', 'cattaro'],
        text: 'Russia makes peace: the Tsar comes to terms with Napoleon, gives up Corfu and Cattaro and joins the Continental System.' } },
    prussia: { name: 'Prussia', short: 'Prussia', side: 'pact', armies: ['pr'], capitals: ['berlin', 'konigsberg', 'memel'],
      lands: ['bayreuth', 'erfurt', 'magdeburg', 'berlin', 'stettin', 'silesia', 'posen', 'thorn', 'danzig', 'warsaw', 'bialystok', 'eylau', 'heilsberg', 'friedland', 'konigsberg', 'memel'],
      weary: { start: 10, base: 0.1, low: 0.5, won: 0.3, lost: 0.9, ground: 0.7, home: ['berlin', 'magdeburg', 'stettin', 'silesia', 'konigsberg', 'danzig', 'posen', 'warsaw'], at: 100, morale: 15, rally: 30, spoil: false,
        cede: ['bayreuth', 'erfurt', 'magdeburg', 'posen', 'thorn', 'warsaw', 'bialystok', 'danzig'],
        text: 'Prussia makes peace: half the kingdom is gone — everything west of the Elbe, the Polish provinces for a new Duchy of Warsaw, Danzig a free city.' } },
    saxony: { name: 'Saxony', side: 'pact', armies: ['sx'], capitals: ['dresden'], lands: ['dresden', 'leipzig', 'thuringia', 'naumburg', 'saalfeld'] },
    naples: { name: 'Naples', side: 'pact', armies: [], morale: 5, capitals: ['naples'], lands: ['naples', 'calabria'] }, // (neutral by the treaty of September 1805 until the Anglo-Russian landing; its army fights as theirs)
  },

  provinces: {
    // ---- Germany and Austria: France's Rhine frontier, Swabia and Franconia, the Danube to Vienna, Bohemia and Moravia
    paris: { name: 'Paris', theatre: 'germany', map: 'paris-barriers', depot: 'nato', prod: 9, land: ['boulogne', 'brittany', 'alsace', 'rhineland', 'toulon'], fort: 2, garrison: 1500, lat: 48.86, lon: 2.35 },
    boulogne: { name: 'Boulogne and the Channel camp', theatre: 'germany', map: 'boulogne', coastal: ['boulogne-raid'], depot: 'nato', port: true, prod: 2, seas: ['channel'], land: ['paris', 'rhineland'], fort: 2, garrison: 1200, lat: 50.72, lon: 1.61 },
    brittany: { name: 'Brest and Brittany', theatre: 'germany', map: 'rennes', coastal: ['quiberon'], depot: 'nato', port: true, prod: 2, seas: ['ushant', 'biscay'], land: ['paris'], fort: 3, garrison: 1200, lat: 48.2, lon: -3.4 },
    alsace: { name: 'Strasbourg and Alsace', theatre: 'germany', map: 'kehl', prod: 3, fort: 3, land: ['paris', 'rhineland', 'swabia'], lat: 48.58, lon: 7.75 },
    rhineland: { name: 'Mainz and the Rhine', theatre: 'germany', map: 'mainz', depot: 'nato', prod: 3, fort: 3, land: ['paris', 'boulogne', 'alsace', 'swabia', 'franconia', 'hanover', 'erfurt'], lat: 50.0, lon: 8.27 },
    swabia: { name: 'Stuttgart and Württemberg', theatre: 'germany', map: 'black-forest', prod: 2, land: ['alsace', 'rhineland', 'franconia', 'ulm'], lat: 48.78, lon: 9.18 },
    franconia: { name: 'Würzburg and Franconia', theatre: 'germany', map: 'wurzburg', depot: 'nato', prod: 2, fort: 1, land: ['rhineland', 'swabia', 'ulm', 'donauworth', 'bayreuth', 'saalfeld'], lat: 49.79, lon: 9.95 }, // (the Bavarian court and army's refuge in 1805)
    ulm: { name: 'Ulm and the Iller', theatre: 'germany', map: 'elchingen', prod: 1, land: ['swabia', 'franconia', 'donauworth', 'munich', 'tyrol'], lat: 48.4, lon: 9.99 },
    donauworth: { name: 'Donauwörth and Ingolstadt', theatre: 'germany', map: 'wertingen', prod: 1, land: ['franconia', 'ulm', 'munich', 'bohemia'], lat: 48.75, lon: 11.0 },
    munich: { name: 'Munich and Bavaria', theatre: 'germany', map: 'hohenlinden', prod: 3, fort: 1, land: ['ulm', 'donauworth', 'inn', 'tyrol'], lat: 48.14, lon: 11.58 },
    inn: { name: 'The Inn, Braunau and Salzburg', theatre: 'germany', map: 'lambach', prod: 1, fort: 1, land: ['munich', 'tyrol', 'linz'], lat: 48.1, lon: 13.1 },
    linz: { name: 'Linz and the Traun', theatre: 'germany', map: 'amstetten', prod: 2, land: ['inn', 'wachau', 'bohemia', 'styria'], lat: 48.3, lon: 14.29 },
    wachau: { name: 'Melk, Krems and the Wachau', theatre: 'germany', map: 'durnstein', prod: 1, land: ['linz', 'vienna', 'moravia'], lat: 48.4, lon: 15.5 },
    vienna: { name: 'Vienna', theatre: 'germany', map: 'tabor-bridge', depot: 'pact', prod: 8, fort: 3, garrison: 1500, land: ['wachau', 'moravia', 'hungary', 'styria'], lat: 48.2, lon: 16.37 },
    hungary: { name: 'Pressburg and Hungary', theatre: 'germany', map: 'pressburg-1809', prod: 5, fort: 1, land: ['vienna', 'moravia', 'olmutz', 'styria', 'galicia'], lat: 47.9, lon: 17.6 },
    styria: { name: 'Graz and Styria', theatre: 'germany', map: 'graz-1809', prod: 2, land: ['vienna', 'hungary', 'linz', 'carinthia'], lat: 47.07, lon: 15.44 },
    moravia: { name: 'Brünn and Austerlitz', theatre: 'germany', map: 'austerlitz', prod: 2, land: ['wachau', 'vienna', 'hungary', 'olmutz', 'bohemia'], lat: 49.15, lon: 16.75 },
    olmutz: { name: 'Olmütz and the Moravian Gate', theatre: 'germany', map: 'wischau', prod: 1, fort: 2, land: ['moravia', 'hungary', 'galicia', 'silesia', 'bohemia'], lat: 49.6, lon: 17.25 },
    bohemia: { name: 'Prague and Bohemia', theatre: 'germany', map: 'stecken', prod: 4, fort: 1, land: ['donauworth', 'linz', 'moravia', 'olmutz', 'dresden', 'bayreuth'], lat: 50.08, lon: 14.42 },
    tyrol: { name: 'Innsbruck and the Tyrol', theatre: 'germany', map: 'scharnitz', prod: 1, fort: 2, land: ['ulm', 'munich', 'inn', 'venetia', 'carinthia'], lat: 47.27, lon: 11.39 },

    // ---- Prussia and Poland: Hanover, Thuringia and Saxony, Brandenburg, Silesia, the Vistula, East Prussia, the Russian border
    hanover: { name: 'Hanover and the Weser', theatre: 'prussia', map: 'hameln', coastal: ['cuxhaven'], port: true, prod: 2, seas: ['northSea'], land: ['rhineland', 'erfurt', 'magdeburg'], fort: 1, lat: 52.37, lon: 9.73 },
    bayreuth: { name: 'Bayreuth and Hof', theatre: 'prussia', map: 'schleiz', prod: 1, land: ['franconia', 'bohemia', 'saalfeld', 'dresden'], lat: 50.1, lon: 11.75 },
    erfurt: { name: 'Erfurt and Hesse', theatre: 'prussia', map: 'erfurt', prod: 1, fort: 2, land: ['rhineland', 'hanover', 'magdeburg', 'thuringia', 'saalfeld'], lat: 51.1, lon: 10.4 },
    saalfeld: { name: 'Saalfeld and the Thuringian Forest', theatre: 'prussia', map: 'saalfeld', prod: 1, land: ['franconia', 'bayreuth', 'erfurt', 'thuringia'], lat: 50.6, lon: 11.2 },
    thuringia: { name: 'Jena and Weimar', theatre: 'prussia', map: 'jena', prod: 1, land: ['saalfeld', 'erfurt', 'naumburg', 'leipzig'], lat: 50.93, lon: 11.59 },
    naumburg: { name: 'Naumburg and the Kösen pass', theatre: 'prussia', map: 'auerstedt', prod: 1, land: ['thuringia', 'leipzig', 'magdeburg'], lat: 51.2, lon: 11.85 },
    leipzig: { name: 'Leipzig and Halle', theatre: 'prussia', map: 'halle-1806', prod: 2, land: ['thuringia', 'naumburg', 'dresden', 'magdeburg', 'berlin'], lat: 51.4, lon: 12.37 },
    dresden: { name: 'Dresden and Saxony', theatre: 'prussia', map: 'dresden', depot: 'pact', prod: 4, fort: 1, land: ['leipzig', 'bayreuth', 'bohemia', 'silesia', 'berlin'], lat: 51.05, lon: 13.74 },
    magdeburg: { name: 'Magdeburg and the Elbe', theatre: 'prussia', map: 'magdeburg-1806', prod: 2, fort: 3, land: ['hanover', 'erfurt', 'naumburg', 'leipzig', 'berlin'], lat: 52.13, lon: 11.63 },
    berlin: { name: 'Berlin and Brandenburg', theatre: 'prussia', map: 'spandau', depot: 'pact', prod: 5, fort: 2, garrison: 1500, land: ['magdeburg', 'leipzig', 'dresden', 'stettin', 'silesia', 'posen'], lat: 52.52, lon: 13.4 },
    stettin: { name: 'Stettin and Pomerania', theatre: 'prussia', map: 'prenzlau', coastal: ['kolberg'], port: true, prod: 2, fort: 2, seas: ['baltic'], land: ['berlin', 'posen', 'danzig'], lat: 53.43, lon: 14.55 },
    silesia: { name: 'Breslau and Silesia', theatre: 'prussia', map: 'breslau', prod: 3, fort: 3, land: ['dresden', 'berlin', 'posen', 'olmutz', 'galicia'], lat: 51.11, lon: 17.03 },
    posen: { name: 'Posen and Great Poland', theatre: 'prussia', map: 'posen-1806', prod: 2, land: ['berlin', 'stettin', 'silesia', 'warsaw', 'thorn'], lat: 52.41, lon: 16.93 },
    thorn: { name: 'Thorn, Graudenz and Mohrungen', theatre: 'prussia', map: 'mohrungen', prod: 1, fort: 2, land: ['posen', 'danzig', 'warsaw', 'eylau'], lat: 53.2, lon: 18.9 },
    danzig: { name: 'Danzig', theatre: 'prussia', map: 'danzig', coastal: ['weichselmunde'], port: true, prod: 2, fort: 3, seas: ['baltic'], land: ['stettin', 'thorn', 'eylau'], lat: 54.35, lon: 18.65 },
    warsaw: { name: 'Warsaw, Pułtusk and the Narew', theatre: 'prussia', map: 'pultusk', prod: 2, fort: 1, land: ['posen', 'thorn', 'galicia', 'bialystok', 'eylau', 'volhynia'], lat: 52.4, lon: 21.0 },
    bialystok: { name: 'Białystok and Ostrołęka', theatre: 'prussia', map: 'ostroleka', prod: 1, land: ['warsaw', 'eylau', 'heilsberg', 'vilna', 'volhynia'], lat: 53.1, lon: 22.6 },
    eylau: { name: 'Preussisch Eylau and Allenstein', theatre: 'prussia', map: 'eylau', prod: 1, land: ['thorn', 'danzig', 'warsaw', 'bialystok', 'heilsberg', 'friedland', 'konigsberg'], lat: 54.0, lon: 20.2 },
    heilsberg: { name: 'Heilsberg and Guttstadt', theatre: 'prussia', map: 'heilsberg', prod: 1, fort: 2, land: ['eylau', 'bialystok', 'friedland'], lat: 53.85, lon: 21.15 },
    friedland: { name: 'Friedland and the Alle', theatre: 'prussia', map: 'friedland', prod: 1, land: ['eylau', 'heilsberg', 'konigsberg', 'memel'], lat: 54.45, lon: 21.3 },
    konigsberg: { name: 'Königsberg and Pillau', theatre: 'prussia', map: 'konigsberg', coastal: ['pillau'], depot: 'pact', port: true, prod: 2, fort: 3, seas: ['baltic'], land: ['eylau', 'friedland'], lat: 54.71, lon: 20.51 },
    memel: { name: 'Memel and Tilsit', theatre: 'prussia', map: 'tilsit', coastal: ['memel-landing'], port: true, prod: 1, seas: ['baltic'], land: ['friedland', 'vilna'], lat: 55.3, lon: 21.6 },
    vilna: { name: 'Vilna and Grodno', theatre: 'prussia', map: 'grodno', depot: 'pact', prod: 4, fort: 2, garrison: 1500, land: ['memel', 'bialystok', 'volhynia', 'russia'], lat: 54.68, lon: 25.28 },
    volhynia: { name: 'Brest-Litovsk and Volhynia', theatre: 'prussia', map: 'brest-litovsk', prod: 2, fort: 1, garrison: 1200, land: ['warsaw', 'bialystok', 'galicia', 'vilna', 'russia'], lat: 51.6, lon: 24.8 },
    russia: { name: 'Russia: St Petersburg and Moscow', theatre: 'prussia', depot: 'pact', safe: true, port: true, prod: 6, seas: ['baltic'], land: ['vilna', 'volhynia'], lat: 57.5, lon: 29.5 }, // (out of the war's reach: Russia leaves the war only by a peace)
    galicia: { name: 'Cracow and Galicia', theatre: 'prussia', map: 'sandomierz', prod: 3, land: ['olmutz', 'hungary', 'silesia', 'warsaw', 'volhynia'], lat: 50.06, lon: 20.6 },

    // ---- Italy and Dalmatia: Napoleon's Kingdom of Italy, Austrian Venetia, the road to Vienna, Naples and the islands
    toulon: { name: 'Toulon and Provence', theatre: 'italy', map: 'toulon', coastal: ['hyeres'], depot: 'nato', port: true, prod: 3, fort: 3, garrison: 1200, seas: ['lion'], land: ['paris', 'milan'], lat: 43.12, lon: 5.93 },
    milan: { name: 'Milan and Lombardy', theatre: 'italy', map: 'marengo', depot: 'nato', prod: 6, fort: 2, land: ['toulon', 'verona', 'romagna'], lat: 45.46, lon: 9.19 },
    verona: { name: 'Verona and the Adige', theatre: 'italy', map: 'veronetta', prod: 2, fort: 3, land: ['milan', 'venetia', 'romagna'], lat: 45.44, lon: 10.99 },
    venetia: { name: 'Vicenza, Padua and Venice', theatre: 'italy', map: 'caldiero', coastal: ['chioggia'], port: true, prod: 3, seas: ['adriatic'], land: ['verona', 'tyrol', 'friuli', 'romagna'], lat: 45.5, lon: 11.9 },
    friuli: { name: 'Friuli and the Tagliamento', theatre: 'italy', map: 'tagliamento', prod: 1, land: ['venetia', 'carinthia', 'trieste'], lat: 46.06, lon: 13.23 },
    carinthia: { name: 'Klagenfurt and Carinthia', theatre: 'italy', map: 'malborghetto', prod: 1, fort: 1, land: ['friuli', 'tyrol', 'styria', 'trieste'], lat: 46.62, lon: 14.31 },
    trieste: { name: 'Trieste and Istria', theatre: 'italy', map: 'trieste-1805', coastal: ['trieste-raid'], port: true, prod: 2, seas: ['adriatic'], land: ['friuli', 'carinthia', 'dalmatia'], lat: 45.65, lon: 13.78 },
    dalmatia: { name: 'Zara, Spalato and Dalmatia', theatre: 'italy', map: 'gospic', coastal: ['spalato-landing'], port: true, prod: 1, seas: ['adriatic'], land: ['trieste', 'cattaro'], lat: 44.0, lon: 15.8 },
    cattaro: { name: 'Ragusa and the Bocche di Cattaro', theatre: 'italy', map: 'ragusa', coastal: ['castelnuovo'], port: true, prod: 1, fort: 2, seas: ['adriatic', 'ionian'], land: ['dalmatia'], lat: 42.55, lon: 18.2 },
    romagna: { name: 'Bologna and Ancona', theatre: 'italy', map: 'ancona', coastal: ['ancona-landing'], port: true, prod: 2, seas: ['adriatic'], land: ['milan', 'verona', 'venetia', 'rome'], lat: 44.2, lon: 12.2 },
    rome: { name: 'Rome and the Papal States', theatre: 'italy', map: 'civita-castellana', coastal: ['civitavecchia'], port: true, prod: 2, seas: ['tyrrhenian'], land: ['romagna', 'naples'], lat: 41.9, lon: 12.5 },
    naples: { name: 'Naples and Gaeta', theatre: 'italy', map: 'gaeta', coastal: ['naples-landing'], port: true, prod: 4, fort: 2, seas: ['tyrrhenian'], land: ['rome', 'calabria'], lat: 40.85, lon: 14.27 },
    calabria: { name: 'Calabria', theatre: 'italy', map: 'campo-tenese', coastal: ['maida'], port: true, prod: 1, seas: ['tyrrhenian', 'ionian'], land: ['naples'], lat: 39.0, lon: 16.4 },
    sicily: { name: 'Sicily and Malta', theatre: 'italy', depot: 'pact', safe: true, port: true, prod: 3, seas: ['tyrrhenian', 'ionian'], land: [], lat: 37.6, lon: 14.0 }, // (the Neapolitan court's refuge under the Royal Navy's guns)
    corfu: { name: 'Corfu and the Ionian Islands', theatre: 'italy', coastal: ['corfu-landing'], depot: 'pact', port: true, prod: 1, fort: 2, seas: ['ionian'], land: [], lat: 39.62, lon: 19.92 }, // (the Russians' Mediterranean base)

    // ---- across the water: Britain, Gibraltar, Spain's Cádiz, Denmark
    britain: { name: 'Britain', theatre: 'atlantic', depot: 'pact', safe: true, port: true, prod: 8, seas: ['channel', 'northSea', 'westernApproaches'], land: [], lat: 51.8, lon: -1.2 },
    gibraltar: { name: 'Gibraltar', theatre: 'atlantic', depot: 'pact', safe: true, port: true, prod: 0, seas: ['cadiz', 'alboran'], land: [], lat: 36.14, lon: -5.35 },
    andalusia: { name: 'Cádiz and Andalusia', theatre: 'atlantic', coastal: ['cadiz-landing'], port: true, prod: 2, fort: 2, garrison: 1200, seas: ['cadiz'], land: [], lat: 36.9, lon: -6.0 }, // (Spain's arsenal: the Combined Fleet's base)
    zealand: { name: 'Copenhagen and Zealand', theatre: 'northern', coastal: ['koge'], depot: 'nato', port: true, prod: 2, fort: 2, seas: ['sound'], land: [], lat: 55.5, lon: 11.9 },
  },

  seas: {
    channel: { name: 'The Channel', theatre: 'atlantic', map: 'openSea', seas: ['northSea', 'ushant', 'westernApproaches'], coasts: ['britain', 'boulogne'], lat: 50.2, lon: -1.0 }, // TODO map: the Boulogne flotilla
    westernApproaches: { name: 'The Western Approaches', theatre: 'atlantic', map: 'openSea', seas: ['channel', 'ushant', 'finisterre', 'westIndies'], coasts: ['britain'], lat: 49.3, lon: -9.5 },
    ushant: { name: 'Off Brest and Ushant', theatre: 'atlantic', map: 'brest', seas: ['channel', 'westernApproaches', 'biscay'], coasts: ['brittany'], lat: 48.2, lon: -6.0 },
    biscay: { name: 'The Bay of Biscay', theatre: 'atlantic', map: 'openSea', seas: ['ushant', 'finisterre'], coasts: ['brittany'], lat: 45.5, lon: -4.5 }, // TODO map: Cape Ortegal (Strachan, 4 November 1805)
    finisterre: { name: 'Cape Finisterre and the Portuguese coast', theatre: 'atlantic', map: 'openSea', seas: ['biscay', 'cadiz', 'westernApproaches', 'westIndies'], coasts: [], lat: 41.5, lon: -11.0 }, // TODO map: Calder's action off Finisterre (July 1805)
    cadiz: { name: 'Off Cádiz and Cape Trafalgar', theatre: 'atlantic', map: 'trafalgar', seas: ['finisterre', 'alboran'], coasts: ['andalusia', 'gibraltar'], lat: 36.1, lon: -7.2 },
    westIndies: { name: 'The West Indies', theatre: 'atlantic', map: 'caribbean', seas: ['westernApproaches', 'finisterre'], coasts: [], lat: 18.3, lon: -68.5 }, // (San Domingo, February 1806)
    northSea: { name: 'The North Sea', theatre: 'northern', map: 'openSea', seas: ['channel', 'sound'], coasts: ['britain', 'hanover'], lat: 55.0, lon: 3.5 }, // TODO map: the German Bight
    sound: { name: 'The Sound and Copenhagen', theatre: 'northern', map: 'copenhagen', seas: ['northSea', 'baltic'], coasts: ['zealand'], lat: 56.1, lon: 12.6 },
    baltic: { name: 'The Baltic', theatre: 'northern', map: 'openSea', seas: ['sound'], coasts: ['stettin', 'danzig', 'konigsberg', 'memel', 'russia'], lat: 55.9, lon: 18.0 }, // TODO map: off Danzig (1807)
    alboran: { name: 'The Strait and Cartagena', theatre: 'med', map: 'openSea', seas: ['cadiz', 'lion'], coasts: ['gibraltar'], lat: 36.4, lon: -2.4 }, // TODO map: Algeciras (1801)
    lion: { name: 'The Gulf of Lion and Toulon', theatre: 'med', map: 'openSea', seas: ['alboran', 'tyrrhenian'], coasts: ['toulon'], lat: 42.2, lon: 5.6 }, // TODO map: off Toulon
    tyrrhenian: { name: 'The Tyrrhenian Sea', theatre: 'med', map: 'openSea', seas: ['lion', 'ionian'], coasts: ['rome', 'naples', 'calabria', 'sicily'], lat: 39.8, lon: 12.0 }, // TODO map: the Bay of Naples
    ionian: { name: 'The Ionian Sea and Corfu', theatre: 'med', map: 'openSea', seas: ['tyrrhenian', 'adriatic'], coasts: ['calabria', 'sicily', 'corfu', 'cattaro'], lat: 38.3, lon: 18.3 }, // TODO map: off Corfu
    adriatic: { name: 'The Adriatic', theatre: 'med', map: 'openSea', seas: ['ionian'], coasts: ['venetia', 'trieste', 'dalmatia', 'cattaro', 'romagna'], lat: 43.6, lon: 15.0 }, // TODO map: Lissa (1811)
  },

  /** A battalion — here a division or a brigade: the stacks it fields (1806's unit type ids: data/units1806). */
  battalions: {
    infantry: ['rifles', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'artillery'],      // line, light infantry, grenadiers, a foot battery
    armour: ['tank', 'tank', 'ifv', 'rockets'],                                       // the heavy cavalry reserve: cuirassiers, dragoons, horse artillery
    artillery: ['artillery', 'artillery', 'spMortar', 'mortar', 'observers'],         // the corps artillery: foot, heavy and howitzer batteries
    cavalry: ['reconVehicle', 'reconVehicle', 'ifv', 'ifv', 'rockets'],               // hussars, chasseurs and dragoons with horse guns
    guard: ['atTeam', 'atTeam', 'atTeam', 'mgTeam', 'tank', 'rockets'],               // a Guard: grenadiers and chasseurs à pied, its horse and guns
  },
  /** Fleets, by 1806's ship slots (data/units1806/ships.js): first-rates, seventy-fours, frigates, brigs, gunboats. */
  fleets: {
    battle: ['battleship', 'cruiser', 'cruiser', 'cruiser', 'frigate'],
    squadron: ['cruiser', 'cruiser', 'frigate', 'destroyer'],
    escort: ['frigate', 'frigate', 'destroyer'],
    amphibious: ['cruiser', 'frigate', 'flatboat', 'flatboat'],
    gunboats: ['ptBoat', 'ptBoat', 'ptBoat', 'destroyer'],
  },

  /** The war at sea in the economy (engine tradeLeft): the blockade off France's ports; the privateers on Britain's trade. */
  trade: [
    { id: 'blockade', side: 'nato', zones: ['ushant', 'cadiz', 'lion', 'channel'], cut: 0.1, text: 'the Royal Navy’s blockade' },
    { id: 'privateers', side: 'pact', zones: ['westernApproaches', 'westIndies', 'finisterre'], cut: 0.06, text: 'French privateers and raiding squadrons' },
    { id: 'sound', side: 'pact', zones: ['sound'], cut: 0.05, text: 'the Sound closed: no Baltic timber, hemp and grain' },
  ],
  /** On land the Grande Armée fights above its numbers (engine autoResolve, ai.js): the corps system, the marshals, the Emperor. */
  edge: { nato: 1.4 },
  /** Battles of the age were decided in a day: a resolved land battle takes the ground at a margin of 0.55 (engine takeAt). */
  take: 0.55,
  /** A side whose morale breaks loses its most war-weary power to a separate peace, not the whole war (engine endTurn). */
  moraleBreaks: 'peace',
  /** Winter in Poland: mud, then snow — Napoleon's "fifth element"; the Russians are at home in it. */
  winter: { theatre: 'prussia', months: [11, 0, 1, 2], freezes: 'nato', attrition: 0.01, attacks: 'pact', bonus: 1.1,
    text: { start: 'Winter in Poland: the roads turn to mud, then freeze — Napoleon’s “fifth element”. The Grande Armée’s horses die in the traces.', end: 'The thaw is over in Poland: the roads dry, the armies can march again.' } },

  /** Countries out of the war (world-atlas ids): Portugal, Switzerland, Sweden, the Ottoman Empire. */
  neutral: ['620', '756', '752', '792'],
  objectives: [
    { id: 'ulm', theatre: 'germany', at: 'ulm', name: 'Ulm', hold: 2, morale: 6 },
    { id: 'munich', theatre: 'germany', at: 'munich', name: 'Munich', hold: 3, morale: 4 },
    { id: 'vienna', theatre: 'germany', at: 'vienna', name: 'Vienna', hold: 2, morale: 10 },
    { id: 'austerlitz', theatre: 'germany', at: 'moravia', name: 'Moravia and the field of Austerlitz', hold: 3, morale: 8 },
    { id: 'strasbourg', theatre: 'germany', at: 'alsace', name: 'Strasbourg and the Rhine', hold: 4, morale: 6 },
    { id: 'paris', theatre: 'germany', at: 'paris', name: 'Paris', hold: 4, morale: 15 },
    { id: 'jena', theatre: 'prussia', at: 'thuringia', name: 'Jena and the Saale', hold: 2, morale: 6 },
    { id: 'berlin', theatre: 'prussia', at: 'berlin', name: 'Berlin', hold: 3, morale: 10 },
    { id: 'warsaw', theatre: 'prussia', at: 'warsaw', name: 'Warsaw', hold: 4, morale: 5 },
    { id: 'konigsberg', theatre: 'prussia', at: 'konigsberg', name: 'Königsberg', hold: 4, morale: 6 },
    { id: 'milan', theatre: 'italy', at: 'milan', name: 'Milan', hold: 4, morale: 8 },
    { id: 'venice', theatre: 'italy', at: 'venetia', name: 'Venice', hold: 4, morale: 5 },
    { id: 'naples', theatre: 'italy', at: 'naples', name: 'Naples', hold: 4, morale: 4 },
    { id: 'channel', theatre: 'atlantic', at: 'channel', name: 'Command of the Channel', hold: 8, morale: 6 },
    { id: 'cadiz', theatre: 'atlantic', at: 'cadiz', name: 'The waters off Cádiz', hold: 6, morale: 5 },
  ],
  /** The war's own end (engine surrenders): the three continental powers at peace — Britain cannot win it alone at sea. */
  ends: [
    { if: { out: ['austria', 'prussia', 'russia'] }, winner: 'nato', why: 'Austria, Prussia and Russia have all made peace: the Continent is Napoleon’s, Britain fights on alone at sea' },
  ],

  // The calendar of 1805–07. `if`: only if the war has gone that way (waits for it, until `until`); `joins` / `peace` /
  // `switch`: the coalitions change; `weary`, `industryBy`: as ww1.js.
  events: [
    { id: 'rhine', date: '1805-09-26', text: 'The Grande Armée crosses the Rhine: seven corps from the Channel camps wheel toward the Danube, behind the Austrians at Ulm.', morale: { nato: 2 } },
    { id: 'bavaria', date: '1805-09-28', text: 'Bavaria joins France: driven out of Munich by the Austrians, the Elector’s army joins Bernadotte at Würzburg.',
      forces: [{ kind: 'army', side: 'nato', army: 'by', at: 'franconia', name: 'Bavarian army (Wrede and Deroy)', battalions: [INF, INF, CAV] }] },
    { id: 'ansbach', date: '1805-10-03', if: { neutral: 'prussia' }, until: '1805-12-31', text: 'Bernadotte marches through Prussian Ansbach without asking: Berlin is furious, and the Prussian army mobilises.', morale: { pact: 1 } },
    { id: 'ulm', date: '1805-10-17', until: '1806-03-01', if: { owner: { ulm: 'nato' } }, text: 'Mack capitulates at Ulm: “the unfortunate General Mack” marches out with his army into captivity.', weary: { austria: 10 }, morale: { pact: -3 } },
    { id: 'trafalgar', date: '1805-10-21', until: '1806-03-01', if: { clear: { cadiz: 'nato' }, open: { cadiz: 'pact' } }, text: 'Trafalgar: the Combined Fleet is gone from Cádiz, Nelson dead in the hour of victory. Napoleon will not challenge Britain at sea again.', morale: { nato: -3, pact: 4 } },
    { id: 'potsdam', date: '1805-11-03', if: { neutral: 'prussia' }, until: '1805-12-31', text: 'The Treaty of Potsdam: the Tsar at the tomb of Frederick the Great — Prussia will join the Coalition unless Napoleon accepts its mediation.' },
    { id: 'class-1806', date: '1805-11-05', text: 'The conscripts of the class of 1806 march to the depots on the Rhine.',
      forces: [{ kind: 'army', side: 'nato', army: 'fr', at: 'rhineland', name: 'Conscripts of 1806', battalions: [INF, INF] }] },
    { id: 'vienna', date: '1805-11-13', until: '1806-06-30', if: { owner: { vienna: 'nato' } }, text: 'Murat and Lannes bluff their way across the Tabor bridge: Vienna falls without a shot.', weary: { austria: 8 } },
    { id: 'russian-guard', date: '1805-11-15', text: 'The Russian Guard and Buxhoeveden’s second army reach Olmütz: the Tsar comes to command in person.',
      forces: [{ kind: 'army', side: 'pact', army: 'ru', at: 'olmutz', name: 'Russian Imperial Guard', battalions: [GUARD, CAV] }, { kind: 'army', side: 'pact', army: 'ru', at: 'olmutz', name: 'Buxhoeveden’s column', battalions: [INF, INF, ART] }] },
    { id: 'naples-landing', date: '1805-11-20', joins: 'naples', text: 'An Anglo-Russian army lands at Naples: Lacy’s Russians from Corfu and Craig’s British from Malta, and Naples joins the Coalition.',
      forces: [{ kind: 'army', side: 'pact', army: 'ru', at: 'naples', name: 'Lacy’s expedition', battalions: [INF, INF] }, { kind: 'army', side: 'pact', army: 'gb', at: 'naples', name: 'Craig’s expedition', battalions: [INF] }] },
    { id: 'austerlitz', date: '1805-12-02', until: '1806-02-01', if: { owner: { moravia: 'nato' } }, text: 'The sun of Austerlitz: the Allies come down from the Pratzen, Soult takes it behind them, and the Battle of the Three Emperors is lost.', weary: { austria: 15, russia: 8 }, morale: { nato: 4 } },
    { id: 'pressburg', date: '1805-12-26', until: '1807-12-31', if: { owner: { vienna: 'nato' }, in: 'austria' }, peace: 'austria', text: 'The Peace of Pressburg: with Vienna in French hands, Austria signs.' },
    { id: 'pressburg-weary', date: '1806-01-15', until: '1807-12-31', if: { weary: { austria: 75 }, owner: { moravia: 'nato' }, in: 'austria' }, peace: 'austria', text: 'Austria, beaten in Moravia and worn out, asks for peace.' },
    { id: 'prussia-early', date: '1805-12-15', until: '1806-01-31', if: { neutral: 'prussia', in: 'austria', owner: { vienna: 'pact', ulm: 'pact', munich: 'pact' } }, joins: ['prussia', 'saxony'], morale: { pact: 5 }, text: 'The Austrians still hold Ulm and Munich, Vienna still stands: Haugwitz delivers Prussia’s ultimatum, and Prussia and Saxony march with the Coalition.' },
    { id: 'conscripts-1806', date: '1806-01-15', text: 'The class of 1807 called early: new battalions for the Grande Armée.',
      forces: [{ kind: 'army', side: 'nato', army: 'fr', at: 'paris', name: 'Reserve of the Grande Armée', battalions: [INF, INF] }] },
    { id: 'naples-invasion', date: '1806-02-08', until: '1806-12-31', if: { out: 'austria' }, text: 'Joseph Bonaparte’s Army of Naples marches south: “the dynasty of Naples has ceased to reign”.',
      forces: [{ kind: 'army', side: 'nato', army: 'fr', at: 'rome', name: 'Army of Naples (Masséna)', battalions: [INF, INF, CAV] }] },
    { id: 'stuart', date: '1806-06-25', text: 'Stuart’s expedition sails from Sicily for Calabria.',
      forces: [{ kind: 'army', side: 'pact', army: 'gb', at: 'sicily', name: 'Stuart’s expedition', battalions: [INF, INF] }] },
    { id: 'confederation', date: '1806-07-12', text: 'The Confederation of the Rhine: sixteen German princes leave the Empire and put their contingents under Napoleon.', industryBy: { nato: 1.05 },
      forces: [{ kind: 'army', side: 'nato', army: 'fr', at: 'rhineland', name: 'Rheinbund contingents', battalions: [INF, INF] }] },
    { id: 'hre', date: '1806-08-06', text: 'Francis II lays down the crown of the Holy Roman Empire: a thousand years end with a proclamation.' },
    { id: 'prussia-war', date: '1806-10-01', until: '1807-12-31', if: { neutral: 'prussia' }, joins: ['prussia', 'saxony'], morale: { pact: 4 }, text: 'Prussia’s ultimatum: the French out of Germany by 8 October. The army of Frederick the Great marches, and Saxony with it.' },
    { id: 'grande-armee-1806', date: '1806-10-01', text: 'The Grande Armée concentrates in Franconia: three columns for the Thuringian Forest.',
      forces: [{ kind: 'army', side: 'nato', army: 'fr', at: 'franconia', name: 'Grande Armée reinforcements', battalions: [INF, INF, CAV] }] },
    { id: 'jena', date: '1806-10-14', until: '1807-03-01', if: { owner: { thuringia: 'nato' }, in: 'prussia' }, text: 'Jena and Auerstedt: in one day the army of Frederick the Great is broken — Napoleon at Jena, Davout alone against the main army at Auerstedt.', weary: { prussia: 20 }, morale: { nato: 4 } },
    { id: 'saxony', date: '1806-10-20', until: '1807-12-31', if: { owner: { thuringia: 'nato' }, in: 'saxony' }, switch: 'saxony', text: 'Saxony changes sides: the Elector makes peace at Posen, becomes a king and puts his army at Napoleon’s side.' },
    { id: 'polish-rising', date: '1806-11-06', until: '1807-06-30', if: { owner: { posen: 'nato' } }, text: 'Dąbrowski calls the Poles to arms: Polish legions rise in Great Poland for Napoleon.',
      forces: [{ kind: 'army', side: 'nato', army: 'fr', at: 'posen', name: 'Polish legions', battalions: [INF, CAV] }] },
    { id: 'berlin-decree', date: '1806-11-21', until: '1807-12-31', if: { owner: { berlin: 'nato' } }, text: 'The Berlin Decree: the Continental System — no British goods anywhere in Napoleon’s Europe. Both sides pay for it.', industryBy: { pact: 0.95, nato: 0.98 } },
    { id: 'bennigsen', date: '1806-11-25', text: 'Bennigsen’s and Buxhoeveden’s armies cross into Prussian Poland.',
      forces: [{ kind: 'army', side: 'pact', army: 'ru', at: 'vilna', name: 'Bennigsen’s reinforcements', battalions: [INF, INF, ART] }] },
    { id: 'class-1808', date: '1807-02-01', text: 'The class of 1808 called a year early; Spain’s and the Rheinbund’s divisions march for the Vistula.',
      forces: [{ kind: 'army', side: 'nato', army: 'fr', at: 'magdeburg', name: 'Reinforcements for Poland', battalions: [INF, INF, ARM] }] },
    { id: 'eylau', date: '1807-02-08', until: '1807-04-01', if: { owner: { eylau: 'nato' } }, text: 'Eylau in the snow: Augereau’s corps lost in the blizzard, Murat’s eighty squadrons charge. “What a massacre, and for no result.”', weary: { russia: 8, france: 6 } },
    { id: 'russian-guard-1807', date: '1807-04-15', text: 'The Russian Guard and Lobanov’s reserves come up to the Niemen.',
      forces: [{ kind: 'army', side: 'pact', army: 'ru', at: 'vilna', name: 'Russian Guard and reserves', battalions: [GUARD, INF, CAV] }] },
    { id: 'danzig', date: '1807-05-24', until: '1807-12-31', if: { owner: { danzig: 'nato' } }, text: 'Danzig capitulates to Lefebvre after a two-month siege.', weary: { prussia: 8 } },
    { id: 'friedland', date: '1807-06-14', until: '1807-12-31', if: { owner: { friedland: 'nato' } }, text: 'Friedland: Bennigsen caught with the Alle at his back — Russia’s army is beaten, the anniversary of Marengo.', weary: { russia: 20 } },
    { id: 'tilsit', date: '1807-06-25', until: '1808-12-31', if: { owner: { konigsberg: 'nato' }, in: 'russia' }, peace: ['prussia', 'russia'], text: 'Tilsit: the two emperors meet on a raft on the Niemen. Russia makes peace; Prussia pays for it.' },
    { id: 'tilsit-weary', date: '1807-07-07', until: '1808-12-31', if: { out: 'prussia', in: 'russia', weary: { russia: 60 } }, peace: 'russia', text: 'With Prussia gone and its army worn down, Russia comes to terms.' },
    { id: 'copenhagen', date: '1807-08-16', until: '1808-12-31', if: { neutral: 'denmark' }, joins: 'denmark', text: 'Britain demands the Danish fleet; Copenhagen refuses. Gambier and Cathcart sail for the Sound — and Denmark goes over to Napoleon.',
      forces: [{ kind: 'fleet', side: 'nato', army: 'dk', at: 'sound', name: 'Royal Danish Navy', ships: 'battle' }, { kind: 'army', side: 'nato', army: 'dk', at: 'zealand', name: 'Danish army and Copenhagen militia', battalions: [INF, ART] },
        { kind: 'fleet', side: 'pact', army: 'gb', at: 'northSea', name: 'Gambier’s fleet', ships: 'battle' }, { kind: 'army', side: 'pact', army: 'gb', at: 'britain', name: 'Cathcart’s army', battalions: [INF, INF, ART] }] },
  ],

  scenarios: {
    // 25 September 1805: the Grande Armée on the Rhine, Mack at Ulm, Archduke Charles on the Adige, Kutuzov marching through
    // Galicia, Nelson off Cádiz; Prussia and Saxony neutral, Denmark too
    1805: {
      name: 'Autumn 1805: the War of the Third Coalition',
      start: '1805-09-25',
      owners: { nato: ['paris', 'boulogne', 'brittany', 'alsace', 'rhineland', 'swabia', 'franconia', 'hanover', 'toulon', 'milan', 'verona', 'romagna', 'rome', 'andalusia', 'zealand'] },
      neutral: ['prussia', 'saxony', 'denmark', 'naples'],
      industry: { nato: 1.5, pact: 1 }, // (the Empire's taxes, the Kingdom of Italy's and Spain's subsidies against the Coalition's spread-out lands)
      forces: [
        // France: the Grande Armée on the Rhine
        { kind: 'army', side: 'nato', army: 'fr', at: 'alsace', name: 'Imperial Guard', battalions: [GUARD, ART] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'alsace', name: 'Lannes’ V Corps', battalions: [INF, INF, CAV] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'alsace', name: 'Murat’s Cavalry Reserve', battalions: [ARM, ARM, CAV] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'swabia', name: 'Ney’s VI Corps', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'swabia', name: 'Soult’s IV Corps', battalions: [INF, INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'rhineland', name: 'Davout’s III Corps', battalions: [INF, INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'rhineland', name: 'Marmont’s II Corps', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'franconia', name: 'Bernadotte’s I Corps', battalions: [INF, INF, CAV] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'brittany', name: 'Augereau’s VII Corps', battalions: [INF, INF] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'boulogne', name: 'Brune’s Army of the Coasts', battalions: [INF] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'hanover', name: 'Hameln garrison', battalions: [INF] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'paris', name: 'Paris garrison and the depots', battalions: [INF] },
        // France: the Army of Italy
        { kind: 'army', side: 'nato', army: 'fr', at: 'verona', name: 'Masséna’s Army of Italy', battalions: [INF, INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'verona', name: 'Army of Italy, Duhesme and Molitor', battalions: [INF, INF, CAV] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'milan', name: 'Army of Italy reserve', battalions: [INF, CAV] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'rome', name: 'Gouvion Saint-Cyr’s corps', battalions: [INF, INF] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'toulon', name: 'Toulon garrison', battalions: [INF] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'andalusia', name: 'Spanish garrison of Cádiz', battalions: [INF] },
        // France and Spain at sea
        { kind: 'fleet', side: 'nato', army: 'fr', at: 'cadiz', name: 'Combined Fleet (Villeneuve)', ships: 'battle' },
        { kind: 'fleet', side: 'nato', army: 'fr', at: 'cadiz', name: 'Spanish squadron (Gravina)', ships: 'squadron' },
        { kind: 'fleet', side: 'nato', army: 'fr', at: 'biscay', name: 'Brest fleet (Ganteaume)', ships: 'battle' },
        { kind: 'fleet', side: 'nato', army: 'fr', at: 'biscay', name: 'Rochefort squadron (Allemand)', ships: 'escort' },
        { kind: 'fleet', side: 'nato', army: 'fr', at: 'lion', name: 'Cartagena squadron (Salcedo)', ships: 'squadron' },
        { kind: 'fleet', side: 'nato', army: 'fr', at: 'channel', name: 'Boulogne flotilla', ships: 'gunboats' },

        // Austria: Mack in Swabia, Kienmayer on the Danube, Archduke John in the Tyrol, Archduke Charles in Italy
        { kind: 'army', side: 'pact', army: 'au', at: 'ulm', name: 'Mack and Archduke Ferdinand', battalions: [INF, INF, INF, CAV, ART] },
        { kind: 'army', side: 'pact', army: 'au', at: 'ulm', name: 'Riesch’s corps', battalions: [INF, INF] },
        { kind: 'army', side: 'pact', army: 'au', at: 'donauworth', name: 'Kienmayer’s corps', battalions: [INF, CAV] },
        { kind: 'army', side: 'pact', army: 'au', at: 'munich', name: 'Austrian garrison of Munich', battalions: [INF] },
        { kind: 'army', side: 'pact', army: 'au', at: 'tyrol', name: 'Archduke John’s Army of Tyrol', battalions: [INF, INF] },
        { kind: 'army', side: 'pact', army: 'au', at: 'tyrol', name: 'Jellachich’s division', battalions: [INF] },
        { kind: 'army', side: 'pact', army: 'au', at: 'venetia', name: 'Archduke Charles’ Army of Italy', battalions: [INF, INF, INF, CAV, ART] },
        { kind: 'army', side: 'pact', army: 'au', at: 'venetia', name: 'Army of Italy, second line', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'au', at: 'friuli', name: 'Reserve of Inner Austria', battalions: [INF] },
        { kind: 'army', side: 'pact', army: 'au', at: 'vienna', name: 'Vienna garrison', battalions: [INF, ART] },
        { kind: 'army', side: 'pact', army: 'au', at: 'bohemia', name: 'Bohemian levies', battalions: [INF] },
        { kind: 'army', side: 'pact', army: 'au', at: 'hungary', name: 'Hungarian insurrection', battalions: [CAV, INF] },
        { kind: 'army', side: 'pact', army: 'au', at: 'dalmatia', name: 'Dalmatian garrison', battalions: [INF] },
        // Russia: Kutuzov through Galicia, Buxhoeveden in Volhynia, Bennigsen on the Prussian border, Lacy on Corfu
        { kind: 'army', side: 'pact', army: 'ru', at: 'galicia', name: 'Kutuzov’s Army of Podolia', battalions: [INF, INF, INF, CAV, ART] },
        { kind: 'army', side: 'pact', army: 'ru', at: 'volhynia', name: 'Buxhoeveden’s Army of Volhynia', battalions: [INF, INF, CAV, ART] },
        { kind: 'army', side: 'pact', army: 'ru', at: 'vilna', name: 'Bennigsen’s army', battalions: [INF, INF, CAV] },
        { kind: 'army', side: 'pact', army: 'ru', at: 'vilna', name: 'Essen’s corps', battalions: [INF] },
        { kind: 'army', side: 'pact', army: 'ru', at: 'russia', name: 'Army of the interior', battalions: [INF, CAV] },
        { kind: 'army', side: 'pact', army: 'ru', at: 'corfu', name: 'Corfu garrison', battalions: [INF] },
        { kind: 'fleet', side: 'pact', army: 'ru', at: 'ionian', name: 'Russian Adriatic squadron (Seniavin)', ships: 'squadron' },
        // Britain: the home army, Gibraltar, Malta and Sicily; the Royal Navy
        { kind: 'army', side: 'pact', army: 'gb', at: 'britain', name: 'Home army', battalions: [INF, INF] },
        { kind: 'army', side: 'pact', army: 'gb', at: 'gibraltar', name: 'Gibraltar garrison', battalions: [INF] },
        { kind: 'army', side: 'pact', army: 'gb', at: 'sicily', name: 'Mediterranean garrisons', battalions: [INF] },
        { kind: 'fleet', side: 'pact', army: 'gb', at: 'cadiz', name: 'Nelson’s fleet', ships: 'battle' },
        { kind: 'fleet', side: 'pact', army: 'gb', at: 'cadiz', name: 'Collingwood’s division', ships: 'battle' },
        { kind: 'fleet', side: 'pact', army: 'gb', at: 'ushant', name: 'Channel Fleet (Cornwallis)', ships: 'battle' },
        { kind: 'fleet', side: 'pact', army: 'gb', at: 'northSea', name: 'North Sea Fleet (Keith)', ships: 'squadron' },
        { kind: 'fleet', side: 'pact', army: 'gb', at: 'tyrrhenian', name: 'Mediterranean frigates', ships: 'escort' },
        { kind: 'fleet', side: 'pact', army: 'gb', at: 'westIndies', name: 'Leeward Islands squadron', ships: 'escort' },
        // Prussia and Saxony: neutral, at home (engine idle(): they stay until Prussia joins)
        { kind: 'army', side: 'pact', army: 'pr', at: 'berlin', name: 'Prussian Guard and the Berlin garrison', battalions: [INF, CAV, ART] },
        { kind: 'army', side: 'pact', army: 'pr', at: 'berlin', name: 'Hohenlohe’s army', battalions: [INF, INF, CAV] },
        { kind: 'army', side: 'pact', army: 'pr', at: 'magdeburg', name: 'Brunswick’s main army', battalions: [INF, INF, INF, CAV, ART] },
        { kind: 'army', side: 'pact', army: 'pr', at: 'erfurt', name: 'Rüchel’s corps', battalions: [INF, INF] },
        { kind: 'army', side: 'pact', army: 'pr', at: 'silesia', name: 'Silesian army', battalions: [INF, INF] },
        { kind: 'army', side: 'pact', army: 'pr', at: 'warsaw', name: 'South Prussian garrison', battalions: [INF] },
        { kind: 'army', side: 'pact', army: 'pr', at: 'konigsberg', name: 'L’Estocq’s corps', battalions: [INF, CAV] },
        { kind: 'army', side: 'pact', army: 'sx', at: 'dresden', name: 'Saxon army', battalions: [INF, INF, CAV] },
      ],
    },
  },
};
