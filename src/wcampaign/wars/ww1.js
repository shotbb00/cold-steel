// The 1918 war's world for the world campaign (src/wcampaign): the First World War from the spring of 1917 — the Western
// Front, Italy, the Eastern Front, the Salonika front in the Balkans, the Middle East (Palestine and the Dardanelles) and the
// sea. Data only, no game imports (the fields as in wars/ww2.js). New here, generic engine hooks (engine.js):
//   powers[id].weary   war-weariness, nation by nation (weariness(), collapse()): Russia first — a revolution, a peace —
//                      then Italy, Bulgaria, the Ottomans, Austria-Hungary; Germany's or France's ends the war
//   trade              the U-boats on the convoy routes and the blockade of Germany: production cut while the enemy is at sea
//                      there (tradeLeft())
//   events' `if`/`until`, `weary`, `industryBy`, `trade`: the calendar of 1917–18, each turn of it only if the war has gone
//                      that way (the Bolshevik coup only in a Russia already worn out; the spring offensive's full weight only
//                      with the East won; the Americans only through an Atlantic the U-boats have not closed)
// Province maps: the 1918 maps where they fit; a province or sea zone with no `map:` is resolved until its map is built (the
// gap list: the step after this one). The armies aef, serb and bg have no roster yet (data/epoch.js: `own`, no regions): on a
// map they fight as the side's army that fits it (data/factions.js armiesFrom — the British or French, the Germans).

const INF = 'infantry', ARM = 'armour', ART = 'artillery', CAV = 'cavalry';

export const WW1 = {
  id: 'ww1',
  epoch: '1918',
  name: 'The First World War',
  mapStyle: 'trench', // (ui/WorldMap.js: the squared trench-map sheet, trench lines and wire for the front, glass-head pins with paper flags)
  sides: { nato: 'Entente', pact: 'Central Powers' },
  blurb: 'The Great War from the spring of 1917 on one map: the Western Front, Italy, the Eastern Front, Salonika, Palestine and the Dardanelles, and the sea. Russia is near breaking, the Americans have only just declared war and have yet to cross the Atlantic, the U-boats are sinking a ship in four. Every nation is worn thin — push one too hard and it breaks. Turns of half a week.',
  sideText: { nato: 'Britain and the Dominions, France, Russia, Italy, Serbia and the United States', pact: 'Germany, Austria-Hungary, the Ottoman Empire and Bulgaria' },
  home: ['west', 'italy'],
  areas: [
    [[-12, 61], [45, 62], [45, 29.5], [30, 29.5], [24, 31.6], [10, 37.3], [-6, 35.6], [-12, 36]], // Europe, the Levant and Egypt (not Libya)
    [[-82, 30], [-60, 30], [-60, 46], [-82, 46]],                                                    // the United States' east coast
  ],
  theatres: {
    west: { name: 'The Western Front', lat: 50.2, lon: 3.6 },
    italy: { name: 'The Italian Front', lat: 46.3, lon: 12.6 },
    east: { name: 'The Eastern Front', lat: 53, lon: 25 },
    balkans: { name: 'Salonika and the Balkans', lat: 42.4, lon: 22.6 },
    mideast: { name: 'Palestine and the Dardanelles', lat: 34, lon: 34 },
    sea: { name: 'The North Sea and the Atlantic', lat: 55, lon: -8, sea: true },
    med: { name: 'The Mediterranean', lat: 37.5, lon: 19, sea: true },
  },

  // The powers: a power whose capitals are all lost surrenders (engine surrenders()); one too war-weary collapses (weariness()).
  // `home`: its own provinces (enemy-held ones wear it down: `ground`); `cede`: what passes to the enemy when it collapses.
  powers: {
    britain: { name: 'Britain and the Dominions', side: 'nato', armies: ['uk', 'anzac'], capitals: ['britain'] },
    france: { name: 'France', short: 'France', side: 'nato', armies: ['fr'], capitals: ['paris'],
      weary: { start: 40, base: 0.16, low: 0.4, won: 0.3, lost: 0.3, ground: 0.4, home: ['paris', 'channelPorts', 'arras', 'somme', 'amiens', 'soissons', 'champagne', 'verdun', 'nancy'], at: 100, morale: 30, ends: true,
        text: 'France can fight no more: the army will not go forward again and Paris asks for terms.', endText: 'France asked for an armistice' } },
    russia: { name: 'Russia', short: 'Russia', side: 'nato', armies: ['ru'], capitals: ['petrograd', 'kiev'],
      weary: { start: 40, base: 0.13, low: 0.3, won: 0.35, lost: 0.4, ground: 0.3, home: ['petrograd', 'pskov', 'riga', 'minsk', 'lutsk', 'tarnopol', 'kiev', 'romania'], at: 100, morale: 8,
        cede: ['riga', 'minsk', 'lutsk', 'tarnopol', 'kiev', 'romania', 'pskov', 'petrograd'],
        text: 'Russia leaves the war. The soldiers vote with their feet; the new government asks for peace and signs away Poland, the Baltic and the Ukraine. Romania, alone, must follow.' } },
    italy: { name: 'Italy', short: 'Italy', side: 'nato', armies: ['it'], capitals: ['lombardy'],
      weary: { start: 32, base: 0.14, low: 0.3, won: 0.3, lost: 0.4, ground: 0.35, home: ['lombardy', 'rome', 'venice', 'vittorio', 'asiago', 'caporetto', 'isonzo'], at: 100, morale: 12,
        cede: ['venice', 'vittorio', 'asiago', 'caporetto', 'isonzo', 'lombardy', 'rome'],
        text: 'Italy breaks: the army melts away from the Piave and Rome sues for a separate peace.' } },
    serbia: { name: 'Serbia', side: 'nato', armies: ['serb'], capitals: ['salonika'] }, // (its army in exile: its base is Salonika)
    usa: { name: 'The United States', side: 'nato', armies: ['aef'], capitals: ['usa'] },
    germany: { name: 'Germany', short: 'Germany', side: 'pact', armies: ['de', 'st'], capitals: ['germany', 'berlin'],
      weary: { start: 27, base: 0.14, low: 0.5, won: 0.25, lost: 0.25, ground: 0.6, home: ['germany', 'berlin', 'wilhelmshaven', 'metz', 'eastPrussia', 'posen'], at: 100, morale: 30, ends: true,
        text: 'Germany is finished: the fleet mutinies, the soldiers’ councils take the cities, the Kaiser flees to Holland.', endText: 'Germany asked for an armistice' } },
    austria: { name: 'Austria-Hungary', short: 'Austria', side: 'pact', armies: ['ah'], capitals: ['vienna'],
      weary: { start: 34, base: 0.14, low: 0.4, won: 0.25, lost: 0.3, ground: 0.3, home: ['vienna', 'trentino', 'trieste', 'carniola', 'carinthia', 'galicia', 'cracow'], at: 100, morale: 14,
        cede: ['trentino', 'trieste', 'carniola', 'carinthia', 'cattaro', 'galicia', 'cracow', 'belgrade', 'vienna'],
        text: 'Austria-Hungary falls apart: Czechs, Poles, South Slavs and Hungarians go their own ways, and the army goes home.' } },
    ottoman: { name: 'The Ottoman Empire', short: 'Ottomans', side: 'pact', armies: ['ot'], capitals: ['constantinople'],
      weary: { start: 38, base: 0.15, low: 0.3, won: 0.3, lost: 0.35, ground: 0.25, home: ['constantinople', 'dardanelles', 'aleppo', 'damascus', 'megiddo', 'jerusalem', 'gaza', 'beersheba'], at: 100, morale: 10,
        cede: ['gaza', 'beersheba', 'jerusalem', 'megiddo', 'damascus', 'aleppo', 'dardanelles', 'constantinople'],
        text: 'The Ottoman Empire signs an armistice at Mudros: the Straits open, the armies in Syria lay down their arms.' } },
    bulgaria: { name: 'Bulgaria', short: 'Bulgaria', side: 'pact', armies: ['bg'], capitals: ['sofia'],
      weary: { start: 24, base: 0.08, low: 0.3, won: 0.3, lost: 0.25, ground: 0.3, home: ['sofia', 'skopje', 'dobroPole'], at: 100, morale: 10,
        cede: ['dobroPole', 'skopje', 'sofia'],
        text: 'Bulgaria signs an armistice at Salonika: the first of the Central Powers out of the war, the road to the Danube open.' } },
  },

  provinces: {
    // ---- the Western Front: from the Channel coast to the Vosges, the Hindenburg Line behind the German front
    britain: { name: 'Britain', theatre: 'west', depot: 'nato', safe: true, port: true, airfield: true, prod: 9, seas: ['channel', 'northSea', 'westernApproaches'], land: [], lat: 51.6, lon: -1.2 },
    channelPorts: { name: 'Calais, Boulogne and the Channel ports', theatre: 'west', map: 'the-lys', depot: 'nato', port: true, airfield: true, prod: 2, seas: ['channel'], land: ['ypres', 'arras', 'amiens'], fort: 3, garrison: 1800, lat: 50.72, lon: 1.75 },
    ypres: { name: 'Ypres and Passchendaele', theatre: 'west', map: 'passchendaele', prod: 1, fort: 2, land: ['channelPorts', 'belgianCoast', 'lille', 'arras'], lat: 50.85, lon: 2.88 },
    arras: { name: 'Arras and Vimy Ridge', theatre: 'west', map: 'vimy', prod: 1, fort: 2, land: ['channelPorts', 'ypres', 'lille', 'cambrai', 'somme'], lat: 50.3, lon: 2.72 },
    somme: { name: 'The Somme and Le Hamel', theatre: 'west', map: 'le-hamel', prod: 1, land: ['arras', 'cambrai', 'stQuentin', 'amiens'], fort: 1, lat: 49.98, lon: 2.75 },
    amiens: { name: 'Amiens and Villers-Bretonneux', theatre: 'west', map: 'villers-bretonneux', airfield: true, prod: 2, land: ['channelPorts', 'somme', 'stQuentin', 'soissons', 'paris'], fort: 1, lat: 49.85, lon: 2.25 },
    soissons: { name: 'Soissons and the Aisne', theatre: 'west', map: 'soissons', prod: 1, land: ['amiens', 'stQuentin', 'laon', 'champagne', 'marne'], fort: 2, lat: 49.35, lon: 3.3 },
    champagne: { name: 'Reims and the Champagne', theatre: 'west', map: 'montagne-de-reims', prod: 1, fort: 2, land: ['soissons', 'laon', 'argonne', 'verdun', 'marne'], lat: 49.2, lon: 4.1 },
    verdun: { name: 'Verdun', theatre: 'west', map: 'cote-304', prod: 1, fort: 3, land: ['champagne', 'argonne', 'stMihiel', 'nancy'], lat: 49.16, lon: 5.38 },
    nancy: { name: 'Nancy and the Vosges', theatre: 'west', map: 'seicheprey', prod: 1, land: ['verdun', 'stMihiel', 'metz'], fort: 2, lat: 48.6, lon: 6.3 },
    marne: { name: 'The Marne and Château-Thierry', theatre: 'west', map: 'belleau-wood', prod: 1, land: ['soissons', 'champagne', 'paris'], lat: 49.05, lon: 3.4 },
    paris: { name: 'Paris', theatre: 'west', map: 'matz', depot: 'nato', airfield: true, prod: 8, land: ['amiens', 'marne'], fort: 3, garrison: 1800, lat: 48.86, lon: 2.35 },
    belgianCoast: { name: 'Ostend and Zeebrugge', theatre: 'west', map: 'nieuport', coastal: ['zeebrugge'], port: true, prod: 1, fort: 2, seas: ['channel', 'northSea'], land: ['ypres', 'lille', 'brussels'], lat: 51.25, lon: 3.1 },
    lille: { name: 'Lille and Douai', theatre: 'west', map: 'hill-70', airfield: true, prod: 3, land: ['belgianCoast', 'ypres', 'arras', 'cambrai', 'brussels'], fort: 2, lat: 50.5, lon: 3.3 },
    cambrai: { name: 'Cambrai and the Hindenburg Line', theatre: 'west', map: 'cambrai', prod: 1, fort: 3, land: ['lille', 'arras', 'somme', 'stQuentin'], lat: 50.17, lon: 3.23 },
    stQuentin: { name: 'St Quentin', theatre: 'west', map: 'st-quentin', prod: 1, fort: 3, land: ['cambrai', 'somme', 'amiens', 'soissons', 'laon'], lat: 49.85, lon: 3.29 },
    laon: { name: 'Laon and the Chemin des Dames', theatre: 'west', map: 'chemin-des-dames', prod: 1, fort: 3, land: ['stQuentin', 'soissons', 'champagne', 'argonne', 'ardennes'], lat: 49.52, lon: 3.65 },
    argonne: { name: 'The Argonne and Sedan', theatre: 'west', map: 'meuse-argonne', prod: 1, fort: 2, land: ['laon', 'champagne', 'verdun', 'stMihiel', 'ardennes'], lat: 49.45, lon: 4.9 },
    stMihiel: { name: 'The St Mihiel salient', theatre: 'west', map: 'st-mihiel', prod: 1, fort: 2, land: ['argonne', 'verdun', 'nancy', 'metz'], lat: 48.9, lon: 5.55 },
    metz: { name: 'Metz and Lorraine', theatre: 'west', map: 'metz', prod: 2, fort: 3, land: ['stMihiel', 'nancy', 'germany'], lat: 49.12, lon: 6.4 },
    brussels: { name: 'Brussels and occupied Belgium', theatre: 'west', map: 'courtrai', prod: 2, land: ['belgianCoast', 'lille', 'ardennes', 'germany'], lat: 50.85, lon: 4.35 },
    ardennes: { name: 'The Ardennes and Luxembourg', theatre: 'west', map: 'sedan-1918', prod: 1, land: ['brussels', 'laon', 'argonne', 'germany'], lat: 49.8, lon: 5.6 },
    germany: { name: 'The Rhineland and the Ruhr', theatre: 'west', map: 'rhine-1918', depot: 'pact', airfield: true, prod: 10, land: ['brussels', 'ardennes', 'metz', 'wilhelmshaven', 'berlin'], fort: 3, garrison: 1800, lat: 50.9, lon: 6.95 },
    wilhelmshaven: { name: 'Wilhelmshaven and the Jade', theatre: 'west', depot: 'pact', safe: true, /* (behind Heligoland's guns and the minefields: no landing) */ port: true, prod: 2, seas: ['heligoland'], land: ['germany', 'berlin'], fort: 3, lat: 53.52, lon: 8.13 },

    // ---- the Italian Front: the Isonzo and the Alps, Venice behind them
    lombardy: { name: 'Milan and the Po valley', theatre: 'italy', map: 'montello', depot: 'nato', airfield: true, prod: 7, land: ['venice', 'asiago', 'vittorio', 'rome'], fort: 3, garrison: 1800, lat: 45.45, lon: 9.9 },
    rome: { name: 'Rome, Taranto and the south', theatre: 'italy', map: 'garigliano', port: true, prod: 3, seas: ['otranto', 'centralMed'], land: ['lombardy'], lat: 40.9, lon: 15.6 }, // (the Regia Marina's base at Taranto)
    asiago: { name: 'The Asiago plateau', theatre: 'italy', map: 'asiago', prod: 1, fort: 2, land: ['lombardy', 'vittorio', 'trentino'], lat: 45.87, lon: 11.51 },
    vittorio: { name: 'Vittorio Veneto and Monte Grappa', theatre: 'italy', map: 'vittorio-veneto', prod: 1, fort: 1, land: ['lombardy', 'asiago', 'venice', 'caporetto'], lat: 46.0, lon: 12.25 },
    venice: { name: 'Venice and the Piave', theatre: 'italy', coastal: ['lido'], map: 'piave', port: true, prod: 2, seas: ['adriatic'], land: ['lombardy', 'vittorio', 'isonzo'], lat: 45.45, lon: 12.4 },
    caporetto: { name: 'Caporetto and the upper Isonzo', theatre: 'italy', map: 'caporetto', prod: 1, fort: 2, land: ['vittorio', 'isonzo', 'carniola'], lat: 46.25, lon: 13.58 },
    isonzo: { name: 'Gorizia and the Bainsizza', theatre: 'italy', map: 'bainsizza', prod: 1, fort: 2, land: ['venice', 'caporetto', 'trieste', 'carniola'], lat: 45.92, lon: 13.55 },
    trentino: { name: 'Trento and the Tyrol', theatre: 'italy', map: 'ortigara', prod: 1, fort: 3, land: ['asiago', 'carinthia'], lat: 46.1, lon: 11.1 },
    trieste: { name: 'Trieste and the Hermada', theatre: 'italy', coastal: ['trieste-1918'], map: 'hermada', port: true, prod: 2, fort: 3, seas: ['adriatic'], land: ['isonzo', 'carniola'], lat: 45.65, lon: 13.78 },
    carniola: { name: 'Laibach and Carniola', theatre: 'italy', map: 'tolmein', prod: 1, fort: 2, land: ['caporetto', 'isonzo', 'trieste', 'carinthia', 'cattaro'], lat: 46.05, lon: 14.5 },
    cattaro: { name: 'Cattaro and Dalmatia', theatre: 'italy', map: 'cattaro', port: true, prod: 1, fort: 2, seas: ['adriatic', 'otranto'], land: ['carniola', 'belgrade'], lat: 43.0, lon: 17.4 }, // (the k.u.k. Kriegsmarine's cruisers and U-boats at Cattaro)
    carinthia: { name: 'Villach and Carinthia', theatre: 'italy', map: 'tarvis', prod: 1, land: ['trentino', 'carniola', 'vienna'], lat: 46.62, lon: 13.85 },
    vienna: { name: 'Vienna', theatre: 'italy', map: 'vienna', depot: 'pact', airfield: true, prod: 7, land: ['carinthia', 'cracow', 'belgrade'], fort: 3, garrison: 1800, lat: 48.2, lon: 16.37 },

    // ---- the Eastern Front: from the Gulf of Riga to the Carpathians and Romania
    petrograd: { name: 'Petrograd', theatre: 'east', map: 'narva', depot: 'nato', airfield: true, prod: 6, /* (behind Kronstadt and the minefields: no landing, no port for the campaign) */ land: ['pskov'], fort: 3, garrison: 1800, lat: 59.93, lon: 30.33 },
    pskov: { name: 'Pskov and Lake Peipus', theatre: 'east', map: 'pskov', prod: 1, land: ['petrograd', 'riga', 'minsk'], lat: 57.82, lon: 28.33 },
    riga: { name: 'Riga and the Dvina', theatre: 'east', coastal: ['albion'], map: 'riga', port: true, prod: 2, seas: ['baltic'], land: ['pskov', 'minsk', 'courland'], fort: 1, lat: 56.95, lon: 24.1 },
    minsk: { name: 'Minsk and the Western Front', theatre: 'east', map: 'krevo', prod: 1, land: ['pskov', 'riga', 'kiev', 'brest', 'courland'], fort: 1, lat: 53.9, lon: 27.56 },
    lutsk: { name: 'Lutsk and Volhynia', theatre: 'east', map: 'lutsk', prod: 1, land: ['kiev', 'brest', 'galicia', 'tarnopol'], fort: 1, lat: 50.75, lon: 25.33 },
    tarnopol: { name: 'Tarnopol and Brody', theatre: 'east', map: 'zborov', prod: 1, land: ['kiev', 'lutsk', 'galicia', 'romania'], fort: 1, lat: 49.55, lon: 25.6 },
    kiev: { name: 'Kiev and the Ukraine', theatre: 'east', map: 'kiev-1918', depot: 'nato', airfield: true, prod: 5, land: ['minsk', 'lutsk', 'tarnopol', 'romania'], fort: 3, garrison: 1800, lat: 50.45, lon: 30.52 },
    romania: { name: 'Moldavia and the Romanian front', theatre: 'east', map: 'marasesti', prod: 1, fort: 1, land: ['kiev', 'tarnopol', 'galicia', 'bucharest'], lat: 46.8, lon: 27.3 },
    courland: { name: 'Courland and Mitau', theatre: 'east', coastal: ['domesnes'], map: 'jakobstadt', port: true, prod: 1, seas: ['baltic'], land: ['riga', 'minsk', 'eastPrussia'], fort: 1, lat: 56.6, lon: 22.3 },
    eastPrussia: { name: 'East Prussia and the Masurian Lakes', theatre: 'east', coastal: ['samland'], map: 'tannenberg', port: true, prod: 2, fort: 1, seas: ['baltic'], land: ['courland', 'warsaw', 'posen'], lat: 54.0, lon: 20.6 },
    brest: { name: 'Brest-Litovsk and the Pripet', theatre: 'east', map: 'baranovichi', prod: 1, land: ['minsk', 'lutsk', 'warsaw'], fort: 1, lat: 52.1, lon: 23.7 },
    warsaw: { name: 'Warsaw and Poland', theatre: 'east', map: 'warsaw', prod: 3, land: ['brest', 'eastPrussia', 'galicia', 'cracow', 'posen'], lat: 52.23, lon: 21.0 },
    galicia: { name: 'Galicia: Gorlice to Lemberg', theatre: 'east', map: 'gorlice', prod: 2, land: ['lutsk', 'tarnopol', 'romania', 'warsaw', 'cracow'], fort: 1, lat: 49.8, lon: 22.6 },
    cracow: { name: 'Cracow and Silesia', theatre: 'east', map: 'cracow', prod: 2, land: ['galicia', 'warsaw', 'vienna'], lat: 50.06, lon: 19.94 },
    posen: { name: 'Posen and West Prussia', theatre: 'east', map: 'posen', prod: 2, land: ['eastPrussia', 'warsaw', 'berlin'], lat: 52.4, lon: 16.9 },
    berlin: { name: 'Berlin and Prussia', theatre: 'east', map: 'berlin-1918', depot: 'pact', airfield: true, prod: 8, land: ['posen', 'germany', 'wilhelmshaven'], fort: 3, garrison: 1800, lat: 52.52, lon: 13.4 },

    // ---- Salonika and the Balkans: the Macedonian front, occupied Serbia, Bulgaria, occupied Wallachia
    salonika: { name: 'Salonika and the Vardar', theatre: 'balkans', coastal: ['salonika-landing'], map: 'salonika', depot: 'nato', port: true, airfield: true, prod: 2, seas: ['aegean'], land: ['monastir', 'doiran'], fort: 3, garrison: 1800, lat: 40.64, lon: 22.94 },
    monastir: { name: 'Monastir and the Crna bend', theatre: 'balkans', map: 'kajmakcalan', prod: 1, land: ['salonika', 'dobroPole', 'skopje'], fort: 1, lat: 40.95, lon: 21.3 },
    doiran: { name: 'Lake Doiran', theatre: 'balkans', map: 'doiran', prod: 1, fort: 2, land: ['salonika', 'dobroPole', 'skopje'], lat: 41.2, lon: 22.75 },
    dobroPole: { name: 'Dobro Pole and the Moglena', theatre: 'balkans', map: 'dobro-pole', prod: 1, fort: 3, land: ['monastir', 'doiran', 'skopje'], lat: 41.3, lon: 21.95 },
    skopje: { name: 'Skopje and Macedonia', theatre: 'balkans', map: 'skopje', prod: 1, land: ['dobroPole', 'monastir', 'doiran', 'sofia', 'belgrade'], fort: 1, lat: 42.0, lon: 21.43 },
    sofia: { name: 'Sofia', theatre: 'balkans', map: 'sofia', depot: 'pact', airfield: true, prod: 3, land: ['skopje', 'bucharest', 'constantinople', 'belgrade'], fort: 3, garrison: 1800, lat: 42.7, lon: 23.32 },
    belgrade: { name: 'Belgrade and occupied Serbia', theatre: 'balkans', map: 'nis', prod: 1, land: ['skopje', 'sofia', 'vienna', 'cattaro'], lat: 44.8, lon: 20.47 },
    bucharest: { name: 'Bucharest and the Wallachian oil', theatre: 'balkans', map: 'arges', prod: 3, land: ['romania', 'sofia'], lat: 44.43, lon: 26.1 },

    // ---- Palestine and the Dardanelles: from the Suez Canal to Damascus and Aleppo; the Straits and Constantinople
    egypt: { name: 'Egypt and the Canal', theatre: 'mideast', coastal: ['port-said'], map: 'romani', depot: 'nato', port: true, airfield: true, prod: 4, seas: ['easternMed'], land: ['sinai'], fort: 3, garrison: 1800, lat: 30.6, lon: 32.3 },
    sinai: { name: 'Sinai and El Arish', theatre: 'mideast', map: 'magdhaba', prod: 0, land: ['egypt', 'gaza', 'beersheba'], lat: 31.0, lon: 33.6 },
    gaza: { name: 'Gaza', theatre: 'mideast', coastal: ['gaza-landing'], map: 'gaza', prod: 1, fort: 2, seas: ['easternMed'], land: ['sinai', 'beersheba', 'jerusalem'], lat: 31.5, lon: 34.45 },
    beersheba: { name: 'Beersheba and the wells', theatre: 'mideast', map: 'beersheba', prod: 1, land: ['sinai', 'gaza', 'jerusalem'], fort: 1, lat: 31.25, lon: 34.79 },
    jerusalem: { name: 'Jerusalem and the Judean hills', theatre: 'mideast', map: 'nebi-samwil', prod: 1, fort: 2, land: ['gaza', 'beersheba', 'megiddo', 'damascus'], lat: 31.77, lon: 35.21 },
    megiddo: { name: 'Megiddo and the plain of Sharon', theatre: 'mideast', map: 'megiddo', prod: 1, land: ['jerusalem', 'damascus'], lat: 32.58, lon: 35.18 },
    damascus: { name: 'Damascus', theatre: 'mideast', map: 'damascus', prod: 1, land: ['jerusalem', 'megiddo', 'aleppo'], lat: 33.51, lon: 36.29 },
    aleppo: { name: 'Aleppo and the Taurus railway', theatre: 'mideast', map: 'haritan', prod: 1, land: ['damascus', 'constantinople'], lat: 36.2, lon: 37.16 },
    dardanelles: { name: 'Gallipoli and the Dardanelles', theatre: 'mideast', map: 'krithia', coastal: ['gallipoli'], prod: 1, fort: 3, seas: ['aegean'], land: ['constantinople'], lat: 40.2, lon: 26.4 },
    constantinople: { name: 'Constantinople', theatre: 'mideast', coastal: ['bosphorus'], map: 'chatalja', depot: 'pact', port: true, airfield: true, prod: 4, seas: ['aegean'], land: ['dardanelles', 'aleppo', 'sofia'], fort: 3, garrison: 1800, lat: 41.01, lon: 28.98 },

    // ---- across the Atlantic: the arsenal
    usa: { name: 'The United States', theatre: 'sea', depot: 'nato', safe: true, port: true, prod: 5, seas: ['atlantic'], land: [], lat: 39.0, lon: -75.0 },
  },

  seas: {
    northSea: { name: 'The North Sea', theatre: 'sea', map: 'doggerBank', seas: ['heligoland', 'channel', 'westernApproaches'], coasts: ['britain', 'belgianCoast'], lat: 56, lon: 3 },
    heligoland: { name: 'The Heligoland Bight', theatre: 'sea', map: 'heligolandBight', seas: ['northSea', 'baltic'], coasts: ['wilhelmshaven'], lat: 54.4, lon: 7.4 }, // (the Kiel Canal to the Baltic)
    channel: { name: 'The Dover Strait and the Channel', theatre: 'sea', map: 'doverStrait', seas: ['northSea', 'westernApproaches'], coasts: ['britain', 'channelPorts', 'belgianCoast'], lat: 50.3, lon: -0.6 },
    westernApproaches: { name: 'The Western Approaches', theatre: 'sea', map: 'openSea', seas: ['northSea', 'channel', 'atlantic'], coasts: ['britain'], lat: 49.5, lon: -9 },
    atlantic: { name: 'The Atlantic convoy routes', theatre: 'sea', map: 'openSea', seas: ['westernApproaches', 'centralMed'], coasts: ['usa'], lat: 42, lon: -38 }, /* (round Gibraltar to the Mediterranean) */
    baltic: { name: 'The Baltic', theatre: 'east', map: 'openSea', seas: ['heligoland'], coasts: ['riga', 'courland', 'eastPrussia'], lat: 57.6, lon: 19.4 },
    adriatic: { name: 'The Adriatic', theatre: 'med', map: 'openSea', seas: ['otranto'], coasts: ['venice', 'trieste', 'cattaro'], lat: 43.6, lon: 15.3 },
    otranto: { name: 'The Otranto Strait', theatre: 'med', map: 'otranto', seas: ['adriatic', 'centralMed'], coasts: ['rome', 'cattaro'], lat: 40.2, lon: 18.9 },
    centralMed: { name: 'The central Mediterranean', theatre: 'med', map: 'openSea', seas: ['otranto', 'aegean', 'easternMed', 'atlantic'], coasts: ['rome'], lat: 35.8, lon: 17 },
    aegean: { name: 'The Aegean', theatre: 'med', map: 'openSea', seas: ['centralMed', 'easternMed'], coasts: ['salonika', 'dardanelles', 'constantinople'], lat: 38.6, lon: 25 },
    easternMed: { name: 'The Levant coast', theatre: 'med', map: 'openSea', seas: ['aegean', 'centralMed'], coasts: ['egypt', 'gaza'], lat: 32.9, lon: 32.4 },
  },

  /** A battalion: the stacks it fields (1918's unit type ids; an army without a type fields its stand-in: data/epoch.js standIn). */
  battalions: {
    infantry: ['rifles', 'rifles', 'rifles', 'rifles', 'mgTeam', 'mgTeam', 'mortar', 'engineers'],
    armour: ['tank', 'tank', 'reconVehicle', 'rifles', 'rifles', 'mgTeam', 'atTeam'], // (the tanks of 1917–18; the Ottomans' and the Austrians' come as cavalry and armoured cars)
    artillery: ['artillery', 'artillery', 'spMortar', 'observers', 'mgTeam'],
    cavalry: ['ifv', 'ifv', 'ifv', 'reconVehicle', 'mgTeam'], // (the Light Horse, the Cossacks, the Süvari)
  },
  /** Fleets, by 1918's ship slots (data/units1918/ships.js). */
  fleets: {
    battle: ['battleship', 'battleship', 'cruiser', 'lightCruiser', 'destroyer'],
    cruisers: ['cruiser', 'lightCruiser', 'lightCruiser', 'destroyer'],
    escort: ['destroyer', 'destroyer', 'frigate', 'frigate'],
    amphibious: ['transport', 'transport', 'lightCruiser', 'destroyer'],
    submarines: ['submarine', 'submarine', 'submarine'],
  },

  /**
   * The war at sea in the economy (engine tradeLeft): the U-boats on the convoy routes cut the Entente's production while
   * they are out there (the convoys, from May 1917, halve it: event 'convoys'); the Royal Navy's distant blockade cuts the
   * Central Powers' while it holds the North Sea.
   */
  /** The trenches (engine dig): a province left in peace for four weeks digs another line, up to its own defences or one. */
  dig: { turns: 6, max: 2 },
  /** Trench warfare: a resolved land battle takes the ground only at a margin of 0.64 (else the fight goes on), and an empty
   *  stretch of front still has its trench garrison (power per level of defences + 1; a capital's own `garrison`: its
   *  fortress and depot troops); each level of defences is worth
   *  half again the defenders' strength (twice what it is in the later wars). */
  take: 0.64, garrison: 1000, fortWeight: 0.5,
  /** An army that has taken ground must bring up its guns and supplies before it attacks again: two weeks (engine order()). */
  pause: 6,
  trade: [
    { id: 'uboats', side: 'nato', zones: ['westernApproaches', 'atlantic'], cut: 0.18, text: 'U-boats on the convoy routes' },
    { id: 'blockade', side: 'pact', zones: ['northSea'], cut: 0.12, text: 'the blockade' },
  ],

  /** Countries out of the war (world-atlas ids): Spain, the Netherlands, Switzerland, Denmark, Norway, Sweden, Persia. */
  neutral: ['724', '528', '756', '208', '578', '752', '364'],
  objectives: [
    { id: 'paris', theatre: 'west', at: 'paris', name: 'Paris', hold: 4, morale: 12 },
    { id: 'ports', theatre: 'west', at: 'channelPorts', name: 'The Channel ports', hold: 4, morale: 8 },
    { id: 'amiens', theatre: 'west', at: 'amiens', name: 'Amiens and its railway junction', hold: 4, morale: 4 },
    { id: 'hindenburg', theatre: 'west', at: 'cambrai', name: 'Through the Hindenburg Line', hold: 4, morale: 5 },
    { id: 'rhine', theatre: 'west', at: 'germany', name: 'The Rhine', hold: 4, morale: 10 },
    { id: 'venice', theatre: 'italy', at: 'venice', name: 'Venice', hold: 4, morale: 6 },
    { id: 'trieste', theatre: 'italy', at: 'trieste', name: 'Trieste', hold: 4, morale: 4 },
    { id: 'vienna', theatre: 'italy', at: 'vienna', name: 'Vienna', hold: 4, morale: 8 },
    { id: 'petrograd', theatre: 'east', at: 'petrograd', name: 'Petrograd', hold: 4, morale: 6 },
    { id: 'riga', theatre: 'east', at: 'riga', name: 'Riga', hold: 4, morale: 3 },
    { id: 'berlin', theatre: 'east', at: 'berlin', name: 'Berlin', hold: 4, morale: 10 },
    { id: 'salonika', theatre: 'balkans', at: 'salonika', name: 'Salonika', hold: 4, morale: 4 },
    { id: 'sofia', theatre: 'balkans', at: 'sofia', name: 'Sofia', hold: 4, morale: 4 },
    { id: 'jerusalem', theatre: 'mideast', at: 'jerusalem', name: 'Jerusalem', hold: 4, morale: 5 },
    { id: 'damascus', theatre: 'mideast', at: 'damascus', name: 'Damascus', hold: 4, morale: 4 },
    { id: 'dardanelles', theatre: 'mideast', at: 'dardanelles', name: 'The Dardanelles', hold: 4, morale: 6 },
    { id: 'constantinople', theatre: 'mideast', at: 'constantinople', name: 'Constantinople', hold: 4, morale: 6 },
    { id: 'convoys', theatre: 'sea', at: 'westernApproaches', name: 'The convoy routes', hold: 8, morale: 6 },
    { id: 'northSea', theatre: 'sea', at: 'northSea', name: 'Command of the North Sea', hold: 8, morale: 5 },
  ],

  // The calendar of 1917–18. `if`: only if the war has gone that way (waits for it, until `until`); `weary`: war-weariness
  // added; `industryBy`: production multiplied; `trade`: a war.trade cut from now on.
  events: [
    { id: 'us-war', date: '1917-04-06', text: 'The United States declares war on Germany. Its army is a hundred thousand men — it will take a year to bring it over.', industryBy: { nato: 1.05 }, morale: { nato: 4 }, weary: { france: -4 } },
    { id: 'nivelle', date: '1917-04-16', text: 'The Nivelle offensive breaks on the Chemin des Dames: the decisive blow promised for forty-eight hours costs a hundred thousand men.', weary: { france: 10 }, morale: { nato: -2 } },
    { id: 'mutinies', date: '1917-05-20', until: '1917-07-15', if: { weary: { france: 42 } }, text: 'Mutinies in the French army: whole divisions will hold the line but refuse to attack.', weary: { france: 8 } },
    { id: 'petain', date: '1917-06-10', until: '1917-09-01', if: { done: 'mutinies' }, text: 'Pétain restores the French army: leave, better food, no more useless attacks — wait for the tanks and the Americans.', weary: { france: -14 } },
    { id: 'convoys', date: '1917-05-24', text: 'The Admiralty adopts the convoy system: merchantmen sail in escorted groups, and the sinkings fall by half.', trade: { uboats: 0.09 },
      forces: [{ kind: 'fleet', side: 'nato', army: 'uk', at: 'westernApproaches', name: 'Convoy escorts', ships: 'escort' }] },
    { id: 'aef-1', date: '1917-06-26', if: { open: { westernApproaches: 'nato' } }, text: 'The first American troops land at St-Nazaire: the 1st Division.', weary: { france: -2 },
      forces: [{ kind: 'army', side: 'nato', army: 'aef', at: 'paris', name: 'American 1st Division', battalions: [INF] }] },
    { id: 'kerensky', date: '1917-07-01', text: 'The Kerensky offensive: the last Russian attack of the war rolls toward Lemberg — and breaks within a week.', weary: { russia: 5 },
      forces: [{ kind: 'army', side: 'nato', army: 'ru', at: 'tarnopol', name: 'Shock battalions', battalions: [INF] }] },
    { id: 'yildirim', date: '1917-08-15', text: 'Army Group Yildirim: German officers, the Asia Corps and new divisions for Palestine.',
      forces: [{ kind: 'army', side: 'pact', army: 'de', at: 'jerusalem', name: 'Asienkorps', battalions: [INF, ART] }] },
    { id: 'riga-offensive', date: '1917-09-01', text: 'Hutier crosses the Dvina at Riga behind a hurricane bombardment: the storm-troop method, first tried in the East.', weary: { russia: 5 },
      forces: [{ kind: 'army', side: 'pact', army: 'st', at: 'courland', name: 'Eighth Army storm battalions', battalions: [INF, ART] }] },
    { id: 'aef-2', date: '1917-10-21', if: { open: { westernApproaches: 'nato' } }, until: '1918-06-01', text: 'The American 1st Division goes into the line in Lorraine; the 2nd and the 26th are landing.', weary: { france: -2 },
      forces: [{ kind: 'army', side: 'nato', army: 'aef', at: 'paris', name: 'American 2nd and 26th Divisions', battalions: [INF, INF] }] },
    { id: 'caporetto', date: '1917-10-24', text: 'Caporetto: seven German divisions and the Austrians break through on the upper Isonzo with gas and storm troops.', weary: { italy: 12 },
      forces: [{ kind: 'army', side: 'pact', army: 'st', at: 'carniola', name: 'Fourteenth Army', battalions: [INF, INF, ART] }] },
    { id: 'beersheba', date: '1917-10-31', text: 'Allenby strikes at Beersheba: the Australian Light Horse charges the wells at dusk.',
      forces: [{ kind: 'army', side: 'nato', army: 'anzac', at: 'egypt', name: 'Desert Mounted Corps', battalions: [CAV, CAV] }, { kind: 'army', side: 'nato', army: 'uk', at: 'egypt', name: 'XX Corps', battalions: [INF, INF, ART] }] },
    { id: 'bolsheviks', date: '1917-11-07', until: '1918-09-01', if: { in: 'russia', weary: { russia: 78 } }, text: 'The Bolsheviks seize power in Petrograd: “Peace, land and bread.” The army dissolves into the countryside.', weary: { russia: 18 }, morale: { nato: -4 } },
    { id: 'rapallo', date: '1917-11-10', text: 'After Caporetto, Britain and France send divisions to Italy under Plumer and Fayolle.',
      forces: [{ kind: 'army', side: 'nato', army: 'uk', at: 'lombardy', name: 'XIV Corps', battalions: [INF, INF] }, { kind: 'army', side: 'nato', army: 'fr', at: 'lombardy', name: 'French Tenth Army', battalions: [INF] }], weary: { italy: -6 } },
    { id: 'cambrai', date: '1917-11-20', text: 'Cambrai: nearly four hundred British tanks break the Hindenburg Line without a preliminary bombardment.',
      forces: [{ kind: 'army', side: 'nato', army: 'uk', at: 'channelPorts', name: 'Tank Corps', battalions: [ARM, ARM] }] },
    { id: 'jerusalem', date: '1917-12-09', until: '1918-06-30', if: { owner: { jerusalem: 'nato' } }, text: 'Allenby enters Jerusalem on foot by the Jaffa Gate: a Christmas present for the British people.', morale: { nato: 4 }, weary: { ottoman: 6 } },
    { id: 'fourteen-points', date: '1918-01-08', text: 'President Wilson’s Fourteen Points: a peace without annexations, self-determination for the peoples of Austria-Hungary.', weary: { austria: 3, germany: 2 } },
    { id: 'strikes', date: '1918-01-28', text: 'Strikes in Vienna, Budapest and Berlin: a million workers out for bread and peace.', weary: { germany: 5, austria: 5 } },
    { id: 'aef-3', date: '1918-03-01', if: { open: { westernApproaches: 'nato' } }, until: '1918-09-01', text: 'The American I Corps forms in France: the Rainbow Division and the 32nd.', weary: { france: -2 },
      forces: [{ kind: 'army', side: 'nato', army: 'aef', at: 'paris', name: 'American I Corps', battalions: [INF, INF, ART] }] },
    { id: 'brest-litovsk', date: '1918-03-03', until: '1918-12-31', if: { out: 'russia' }, text: 'The Treaty of Brest-Litovsk: Russia gives up Poland, the Baltic and the Ukraine. The Ukraine’s grain is promised to the Central Powers.', industryBy: { pact: 1.08 } },
    { id: 'russia-fights', date: '1918-03-03', until: '1918-03-31', if: { in: 'russia' }, text: 'Russia is still in the war: half a million Germans and Austrians are still tied down in the East.', morale: { nato: 3 } },
    { id: 'michael', date: '1918-03-21', until: '1918-06-01', if: { out: 'russia' }, text: 'Operation Michael: with the divisions from the East, Ludendorff throws everything at the British in the fog — the storm troops’ great offensive.',
      industryBy: { pact: 1.2 }, morale: { pact: 8 }, weary: { france: 6 },
      forces: [{ kind: 'army', side: 'pact', army: 'st', at: 'germany', name: 'Seventeenth Army', battalions: [INF, INF, ART] }, { kind: 'army', side: 'pact', army: 'st', at: 'germany', name: 'Eighteenth Army', battalions: [INF, INF, ART] }, { kind: 'army', side: 'pact', army: 'de', at: 'lille', name: 'Second Army', battalions: [INF, ARM, ART] }] },
    { id: 'michael-small', date: '1918-03-21', until: '1918-06-01', if: { in: 'russia', notDone: 'michael' }, text: 'Ludendorff attacks in the West with what can be spared from the East: the storm battalions alone.',
      industryBy: { pact: 1.07 }, forces: [{ kind: 'army', side: 'pact', army: 'st', at: 'germany', name: 'Storm battalions', battalions: [INF, INF] }] },
    { id: 'aef-4', date: '1918-05-28', if: { open: { westernApproaches: 'nato' } }, until: '1918-11-30', text: 'Cantigny and Belleau Wood: the Americans fight their first battles; the II Corps lands, ten thousand men a day.', weary: { france: -2 },
      forces: [{ kind: 'army', side: 'nato', army: 'aef', at: 'paris', name: 'American II Corps', battalions: [INF, INF, ART] }] },
    { id: 'solstice', date: '1918-06-15', text: 'The Battle of the Solstice: Austria-Hungary’s last offensive across the Piave fails.', weary: { austria: 8 } },
    { id: 'aef-5', date: '1918-07-10', if: { open: { westernApproaches: 'nato' } }, until: '1918-12-31', text: 'A million Americans in France: the III Corps, with French tanks.', weary: { france: -2 },
      forces: [{ kind: 'army', side: 'nato', army: 'aef', at: 'paris', name: 'American III Corps', battalions: [INF, INF, ARM, ART] }] },
    { id: 'spent', date: '1918-07-18', until: '1918-12-31', if: { done: 'michael' }, text: 'The Second Marne: the German offensive is spent, its best men dead in the salients it won.', industryBy: { pact: 0.8 }, weary: { germany: 8 } },
    { id: 'spent-small', date: '1918-07-18', until: '1918-12-31', if: { done: 'michael-small' }, text: 'The Second Marne: the last German attack in the West is over.', industryBy: { pact: 0.94 }, weary: { germany: 4 } },
    { id: 'american-industry', date: '1918-07-01', text: 'American war production in full stride: guns, shells, ships and aircraft by the shipload.', industryBy: { nato: 1.1 } },
    { id: 'black-day', date: '1918-08-08', text: 'Amiens, “the black day of the German army”: Canadians, Australians and tanks break through and the Germans surrender by thousands.', weary: { germany: 8 }, morale: { nato: 3 },
      forces: [{ kind: 'army', side: 'nato', army: 'anzac', at: 'channelPorts', name: 'Australian Corps', battalions: [INF, INF, ARM] }] },
    { id: 'aef-6', date: '1918-08-30', if: { open: { westernApproaches: 'nato' } }, until: '1919-03-01', text: 'The American First Army takes its own sector at St Mihiel under Pershing.', weary: { france: -2 },
      forces: [{ kind: 'army', side: 'nato', army: 'aef', at: 'paris', name: 'American First Army', battalions: [INF, INF, ART] }] },
    { id: 'dobro-pole', date: '1918-09-15', text: 'Dobro Pole: the Serbs and the French storm the mountain wall of Macedonia.', weary: { bulgaria: 18 },
      forces: [{ kind: 'army', side: 'nato', army: 'serb', at: 'salonika', name: 'Serbian Second Army', battalions: [INF, INF] }, { kind: 'army', side: 'nato', army: 'fr', at: 'salonika', name: 'Armée d’Orient reserve', battalions: [INF, ART] }] },
    { id: 'megiddo', date: '1918-09-19', text: 'Megiddo: Allenby’s cavalry rides through the gap on the coast to the Ottoman rear.', weary: { ottoman: 14 },
      forces: [{ kind: 'army', side: 'nato', army: 'uk', at: 'egypt', name: 'XXI Corps', battalions: [INF, CAV] }] },
    { id: 'aef-7', date: '1918-10-12', if: { open: { westernApproaches: 'nato' } }, until: '1919-06-01', text: 'The American Second Army forms: two million Americans are in France.', weary: { france: -2 },
      forces: [{ kind: 'army', side: 'nato', army: 'aef', at: 'paris', name: 'American Second Army', battalions: [INF, INF, ART] }] },
    { id: 'vittorio', date: '1918-10-24', text: 'Vittorio Veneto: the Italians, the British and the French cross the Piave a year after Caporetto.', weary: { austria: 14 },
      forces: [{ kind: 'army', side: 'nato', army: 'it', at: 'lombardy', name: 'Eighth Army', battalions: [INF, INF] }] },
    { id: 'kiel', date: '1918-10-29', until: '1919-12-31', if: { weary: { germany: 70 } }, text: 'The High Seas Fleet mutinies at Kiel rather than sail for a last battle: red flags in the ports.', weary: { germany: 16 } },
    { id: 'blockade-bites', date: '1918-11-01', text: 'The fourth winter of the blockade: the Central Powers’ factories and fields are worn out.', industryBy: { pact: 0.92 } },
  ],

  scenarios: {
    // April 1917: Arras and the Nivelle offensive in the West, the Russian army after the February Revolution, the Isonzo, Gaza
    1917: {
      name: 'April 1917: the year of crisis',
      start: '1917-04-02',
      owners: { nato: ['britain', 'channelPorts', 'ypres', 'arras', 'somme', 'amiens', 'soissons', 'champagne', 'verdun', 'nancy', 'paris', 'marne',
        'lombardy', 'rome', 'asiago', 'vittorio', 'venice', 'caporetto', 'isonzo',
        'petrograd', 'pskov', 'riga', 'minsk', 'lutsk', 'tarnopol', 'kiev', 'romania',
        'salonika', 'monastir', 'doiran', 'egypt', 'sinai', 'usa'] },
      industry: { nato: 1, pact: 1.05 },
      forces: [
        // the Entente, the Western Front
        { kind: 'army', side: 'nato', army: 'uk', at: 'ypres', name: 'Second Army', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'anzac', at: 'ypres', name: 'I ANZAC Corps', battalions: [INF, INF] },
        { kind: 'army', side: 'nato', army: 'uk', at: 'arras', name: 'First Army and the Canadian Corps', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'uk', at: 'arras', name: 'Third Army', battalions: [INF, ARM, ART] },
        { kind: 'army', side: 'nato', army: 'uk', at: 'somme', name: 'Fifth Army', battalions: [INF, INF] },
        { kind: 'army', side: 'nato', army: 'uk', at: 'amiens', name: 'Fourth Army', battalions: [INF, ART] },
        { kind: 'army', side: 'nato', army: 'uk', at: 'channelPorts', name: 'Lines of communication', battalions: [INF] },
        { kind: 'army', side: 'nato', army: 'uk', at: 'britain', name: 'Home Forces', battalions: [INF] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'soissons', name: 'Sixth Army', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'soissons', name: 'Tenth Army', battalions: [INF, ARM] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'champagne', name: 'Fourth and Fifth Armies', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'verdun', name: 'Second Army', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'nancy', name: 'Eighth Army', battalions: [INF, INF] },
        { kind: 'army', side: 'nato', army: 'fr', at: 'paris', name: 'Groupe d’armées de réserve', battalions: [INF, ART] },
        { kind: 'air', side: 'nato', army: 'uk', at: 'channelPorts', name: 'Royal Flying Corps', squadrons: { fighter: 3, strike: 1, recon: 2 } },
        { kind: 'air', side: 'nato', army: 'uk', at: 'britain', name: 'Home Defence squadrons', squadrons: { fighter: 2, bomber: 1 } },
        { kind: 'air', side: 'nato', army: 'fr', at: 'paris', name: 'Aéronautique Militaire', squadrons: { fighter: 3, bomber: 1, recon: 1 } },
        // the Entente, Italy
        { kind: 'army', side: 'nato', army: 'it', at: 'isonzo', name: 'Third Army', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'it', at: 'caporetto', name: 'Second Army', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'it', at: 'asiago', name: 'First Army', battalions: [INF, INF] },
        { kind: 'army', side: 'nato', army: 'it', at: 'vittorio', name: 'Fourth Army', battalions: [INF] },
        { kind: 'army', side: 'nato', army: 'it', at: 'venice', name: 'Duke of Aosta’s reserve', battalions: [INF] },
        { kind: 'army', side: 'nato', army: 'it', at: 'lombardy', name: 'Comando Supremo reserve', battalions: [INF, ART] },
        { kind: 'air', side: 'nato', army: 'it', at: 'lombardy', name: 'Corpo Aeronautico', squadrons: { fighter: 2, bomber: 1, recon: 1 } },
        // the Entente, the Eastern Front
        { kind: 'army', side: 'nato', army: 'ru', at: 'riga', name: 'Twelfth Army', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'ru', at: 'minsk', name: 'Western Front', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'ru', at: 'lutsk', name: 'Special Army', battalions: [INF, CAV] },
        { kind: 'army', side: 'nato', army: 'ru', at: 'tarnopol', name: 'Eleventh and Seventh Armies', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'ru', at: 'kiev', name: 'Southwestern Front reserve', battalions: [INF] },
        { kind: 'army', side: 'nato', army: 'ru', at: 'romania', name: 'Romanian First and Second Armies', battalions: [INF, INF] },
        { kind: 'army', side: 'nato', army: 'ru', at: 'petrograd', name: 'Petrograd garrison', battalions: [INF] },
        { kind: 'air', side: 'nato', army: 'ru', at: 'kiev', name: 'Imperial Russian Air Service', squadrons: { fighter: 1, recon: 1 } },
        // the Entente, Salonika
        { kind: 'army', side: 'nato', army: 'fr', at: 'salonika', name: 'Armée d’Orient', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'uk', at: 'doiran', name: 'British Salonika Army', battalions: [INF, INF] },
        { kind: 'army', side: 'nato', army: 'serb', at: 'monastir', name: 'Serbian First Army', battalions: [INF, INF] },
        { kind: 'air', side: 'nato', army: 'fr', at: 'salonika', name: 'Aviation de l’Armée d’Orient', squadrons: { fighter: 1, recon: 1 } },
        // the Entente, Egypt
        { kind: 'army', side: 'nato', army: 'uk', at: 'egypt', name: 'Eastern Force', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'nato', army: 'anzac', at: 'egypt', name: 'Desert Column', battalions: [CAV, CAV] },
        { kind: 'air', side: 'nato', army: 'uk', at: 'egypt', name: 'RFC Middle East', squadrons: { fighter: 1, strike: 1, recon: 1 } },
        // the Entente, at sea
        { kind: 'fleet', side: 'nato', army: 'uk', at: 'northSea', name: 'Grand Fleet', ships: 'battle' },
        { kind: 'fleet', side: 'nato', army: 'uk', at: 'northSea', name: 'Battlecruiser Force', ships: 'cruisers' },
        { kind: 'fleet', side: 'nato', army: 'uk', at: 'channel', name: 'Dover Patrol', ships: 'escort' },
        { kind: 'fleet', side: 'nato', army: 'uk', at: 'otranto', name: 'Otranto barrage', ships: 'escort' },
        { kind: 'fleet', side: 'nato', army: 'it', at: 'adriatic', name: 'Regia Marina', ships: 'cruisers' },
        { kind: 'fleet', side: 'nato', army: 'uk', at: 'aegean', name: 'Aegean Squadron', ships: 'cruisers' },
        { kind: 'fleet', side: 'nato', army: 'uk', at: 'easternMed', name: 'Egypt and Red Sea Squadron', ships: 'amphibious' },
        { kind: 'fleet', side: 'nato', army: 'ru', at: 'baltic', name: 'Baltic Fleet', ships: 'cruisers' },

        // the Central Powers, the Western Front (the Hindenburg Line)
        { kind: 'army', side: 'pact', army: 'de', at: 'belgianCoast', name: 'Marinekorps Flandern', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'de', at: 'lille', name: 'Fourth Army', battalions: [INF, INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'de', at: 'lille', name: 'Sixth Army', battalions: [INF, INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'de', at: 'cambrai', name: 'Second Army', battalions: [INF, INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'de', at: 'stQuentin', name: 'First Army', battalions: [INF, INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'de', at: 'laon', name: 'Seventh Army', battalions: [INF, INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'de', at: 'argonne', name: 'Third Army', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'de', at: 'stMihiel', name: 'Armee-Abteilung C', battalions: [INF, INF] },
        { kind: 'army', side: 'pact', army: 'de', at: 'metz', name: 'Fifth Army', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'st', at: 'germany', name: 'OHL reserve: Sturmbataillone', battalions: [INF, INF] },
        { kind: 'army', side: 'pact', army: 'de', at: 'germany', name: 'Army Group Crown Prince Rupprecht reserve', battalions: [INF, ART] },
        { kind: 'air', side: 'pact', army: 'de', at: 'lille', name: 'Jagdgeschwader I', squadrons: { fighter: 3, recon: 1 } },
        { kind: 'air', side: 'pact', army: 'de', at: 'germany', name: 'Luftstreitkräfte', squadrons: { fighter: 2, strike: 1, bomber: 2, recon: 1 } },
        // the Central Powers, Italy
        { kind: 'army', side: 'pact', army: 'ah', at: 'trentino', name: 'Eleventh Army', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'ah', at: 'carniola', name: 'Isonzo Army', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'ah', at: 'trieste', name: 'Boroević’s Fifth Army', battalions: [INF, ART] },
        { kind: 'army', side: 'pact', army: 'ah', at: 'vienna', name: 'Armeeoberkommando reserve', battalions: [INF] },
        { kind: 'air', side: 'pact', army: 'ah', at: 'vienna', name: 'k.u.k. Luftfahrtruppen', squadrons: { fighter: 2, recon: 1 } },
        // the Central Powers, the Eastern Front
        { kind: 'army', side: 'pact', army: 'de', at: 'courland', name: 'Eighth Army', battalions: [INF, INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'de', at: 'eastPrussia', name: 'Tenth Army', battalions: [INF, INF] },
        { kind: 'army', side: 'pact', army: 'de', at: 'brest', name: 'Army Group Linsingen', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'de', at: 'warsaw', name: 'Ninth Army', battalions: [INF, INF] },
        { kind: 'army', side: 'pact', army: 'ah', at: 'galicia', name: 'Second Army', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'de', at: 'galicia', name: 'Südarmee', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'de', at: 'berlin', name: 'Replacement Army', battalions: [INF] },
        { kind: 'air', side: 'pact', army: 'de', at: 'berlin', name: 'Luftstreitkräfte Ost', squadrons: { fighter: 1, recon: 1 } },
        // the Central Powers, the Balkans
        { kind: 'army', side: 'pact', army: 'bg', at: 'dobroPole', name: 'Eleventh Army', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'bg', at: 'skopje', name: 'First Army', battalions: [INF, INF] },
        { kind: 'army', side: 'pact', army: 'bg', at: 'sofia', name: 'Second Army', battalions: [INF] },
        { kind: 'army', side: 'pact', army: 'de', at: 'bucharest', name: 'Mackensen’s Ninth Army', battalions: [INF, INF] },
        { kind: 'army', side: 'pact', army: 'ah', at: 'belgrade', name: 'Occupation corps', battalions: [INF] },
        { kind: 'air', side: 'pact', army: 'bg', at: 'sofia', name: 'Bulgarian Air Corps', squadrons: { fighter: 1, recon: 1 } },
        // the Central Powers, Palestine and the Straits
        { kind: 'army', side: 'pact', army: 'ot', at: 'gaza', name: 'Eighth Army', battalions: [INF, INF, ART] },
        { kind: 'army', side: 'pact', army: 'ot', at: 'beersheba', name: 'III Corps', battalions: [INF, CAV] },
        { kind: 'army', side: 'pact', army: 'ot', at: 'jerusalem', name: 'Seventh Army', battalions: [INF] },
        { kind: 'army', side: 'pact', army: 'ot', at: 'damascus', name: 'Fourth Army', battalions: [INF] },
        { kind: 'army', side: 'pact', army: 'ot', at: 'dardanelles', name: 'Fifth Army', battalions: [INF, ART] },
        { kind: 'army', side: 'pact', army: 'ot', at: 'constantinople', name: 'First Army', battalions: [INF] },
        { kind: 'air', side: 'pact', army: 'de', at: 'constantinople', name: 'Fliegerabteilung Pascha', squadrons: { fighter: 1, recon: 1 } },
        // the Central Powers, at sea
        { kind: 'fleet', side: 'pact', army: 'de', at: 'heligoland', name: 'High Seas Fleet', ships: 'battle' },
        { kind: 'fleet', side: 'pact', army: 'de', at: 'heligoland', name: 'I Scouting Group', ships: 'cruisers' },
        { kind: 'fleet', side: 'pact', army: 'de', at: 'westernApproaches', name: 'U-boat flotillas', ships: 'submarines' },
        { kind: 'fleet', side: 'pact', army: 'de', at: 'atlantic', name: 'U-cruisers', ships: 'submarines' },
        { kind: 'fleet', side: 'pact', army: 'de', at: 'centralMed', name: 'Cattaro U-boats', ships: 'submarines' },
        { kind: 'fleet', side: 'pact', army: 'ah', at: 'adriatic', name: 'k.u.k. Kriegsmarine', ships: 'cruisers' },
      ],
    },
  },
};
