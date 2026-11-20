// The 1945 war's world for the world campaign (src/wcampaign): its theatres, provinces and sea zones, and the scenarios a
// campaign can start from. Data only, no game imports: the campaign engine (and tools/campaign_sim.mjs) run on it headless.
//
// A province is a piece of a theatre round one battlefield: `map` is the land map its battles are fought on (null: no
// land map there yet — its land battles are always resolved), `coastal` the landing maps that put a force ashore in it
// from `seas`, `land` its neighbours by land. `prod` = war production a turn while held and supplied; `port` lets
// fleets base and armies embark; `airfield` bases air wings; `depot` = a side's rear: new units appear there, supply
// starts there, it can't be attacked (the world map draws it off the front). `fort` = prepared defences (0–2).
// `lat`/`lon`: where it sits on the paper map (approximate, for drawing only).
// A sea zone holds fleets; `map` is the sea map its battles are fought on (null: resolved), `seas` its neighbour zones,
// `coasts` the provinces it touches (landings, ports, sea lanes for supply).
// Map ids are the game's (src/maps/index.js); the gap maps being built for this war are named in `planned` and used as
// soon as they exist (the engine checks).

export const WW2 = {
  id: 'ww2',
  epoch: '1945',
  name: 'The Second World War',
  sides: { nato: 'Allies', pact: 'Axis' },
  theatres: {
    west: { name: 'Western Europe', lat: 50, lon: 6 },
    east: { name: 'Eastern Front', lat: 52, lon: 27 },
    med: { name: 'North Africa and the Mediterranean', lat: 34, lon: 14 },
    pacific: { name: 'The Pacific', lat: 15, lon: 145 },
    atlantic: { name: 'The Atlantic', lat: 50, lon: -30, sea: true },
  },
  planned: ['gela', 'novorossiysk', 'guadalcanal', 'saipan', 'atlanticConvoy', 'maltaConvoy'], // (the gap maps: their final ids may differ — the engine skips a map that doesn't exist yet)

  // The powers on each side: a power whose capitals are all lost surrenders, its forces leave the war (engine surrenders()).
  powers: {
    germany: { name: 'Germany', side: 'pact', armies: ['wh', 'fj'], capitals: ['reichWest', 'reichEast'] },
    japan: { name: 'Japan', side: 'pact', armies: ['jp'], capitals: ['japan'] },
    britain: { name: 'Britain', side: 'nato', armies: ['brit', 'brit21', 'brit14'], capitals: ['england'] },
    ussr: { name: 'The Soviet Union', side: 'nato', armies: ['sov'], capitals: ['moscow'] },
    usa: { name: 'The United States', side: 'nato', armies: ['us', 'usmc'], capitals: ['hawaii'] },
  },

  provinces: {
    // ---- Western Europe: from the Channel coast to Thuringia
    england: { name: 'England', theatre: 'west', depot: 'nato', port: true, airfield: true, prod: 6, seas: ['channel', 'north-atlantic'], land: [], lat: 51.5, lon: -1 },
    normandy: { name: 'Normandy', theatre: 'west', map: 'bocage', coastal: ['omaha', 'goldBeach'], seas: ['channel'], port: true, prod: 1, fort: 1, land: ['ardennes', 'arnhem'], lat: 49.2, lon: -0.7 },
    ardennes: { name: 'The Ardennes', theatre: 'west', map: 'ardennes', prod: 1, land: ['normandy', 'remagen'], lat: 50.0, lon: 5.7 },
    arnhem: { name: 'Arnhem', theatre: 'west', map: 'arnhem', prod: 2, land: ['normandy', 'remagen'], lat: 52.0, lon: 5.9 },
    remagen: { name: 'Remagen', theatre: 'west', map: 'remagen', prod: 2, fort: 1, land: ['ardennes', 'arnhem', 'hersfeld', 'haune'], lat: 50.6, lon: 7.2 },
    hersfeld: { name: 'Hersfeld', theatre: 'west', map: 'hersfeld-airbase', airfield: true, prod: 1, land: ['remagen', 'kaliwerk'], lat: 50.9, lon: 9.7 },
    haune: { name: 'The Haune and the Fulda', theatre: 'west', map: 'haune-fulda', prod: 1, land: ['remagen', 'fulda'], lat: 50.6, lon: 9.6 },
    fulda: { name: 'The Fulda Gap', theatre: 'west', map: 'fulda-gap', prod: 2, land: ['haune', 'huenfeld'], lat: 50.55, lon: 9.7 },
    huenfeld: { name: 'Hünfeld', theatre: 'west', map: 'huenfeld', prod: 1, land: ['fulda', 'werra'], lat: 50.67, lon: 9.77 },
    kaliwerk: { name: 'Kaliwerk Hattorf', theatre: 'west', map: 'monte-kali', prod: 3, land: ['hersfeld', 'werra'], lat: 50.86, lon: 9.95 },
    werra: { name: 'The Werra valley', theatre: 'west', map: 'werra-valley', prod: 1, land: ['huenfeld', 'kaliwerk', 'thuringia'], lat: 50.9, lon: 10.1 },
    thuringia: { name: 'The Thuringian Forest', theatre: 'west', map: 'thuringian-forest', prod: 2, fort: 1, land: ['werra', 'reichWest'], lat: 50.7, lon: 10.8 },
    reichWest: { name: 'The Reich (west)', theatre: 'west', depot: 'pact', airfield: true, prod: 6, land: ['thuringia', 'reichEast'], /* (the Reich one country: the fronts meet here) */ lat: 51.3, lon: 11.5 },

    // ---- Eastern Front: from the Volga to Berlin
    moscow: { name: 'Moscow', theatre: 'east', depot: 'nato', airfield: true, prod: 7, land: ['stalingrad', 'bobruisk'], lat: 55.7, lon: 37.6 },
    stalingrad: { name: 'Stalingrad', theatre: 'east', map: 'stalingrad', prod: 3, fort: 1, land: ['moscow', 'kuban', 'bobruisk'], lat: 48.7, lon: 44.5 },
    kuban: { name: 'Novorossiysk and the Kuban', theatre: 'east', map: null, coastal: ['novorossiysk'], seas: ['blackSea'], port: true, prod: 1, fort: 1, land: ['stalingrad'], lat: 44.7, lon: 37.8 },
    bobruisk: { name: 'Bobruisk', theatre: 'east', map: 'bobruisk', prod: 1, land: ['moscow', 'stalingrad', 'oder'], lat: 53.1, lon: 29.2 },
    oder: { name: 'The Seelow Heights', theatre: 'east', map: 'seelow-heights', prod: 1, fort: 2, land: ['bobruisk', 'berlin'], lat: 52.5, lon: 14.4 },
    berlin: { name: 'Berlin', theatre: 'east', map: 'berlin', prod: 4, fort: 2, land: ['oder', 'reichEast'], lat: 52.5, lon: 13.4 },
    reichEast: { name: 'The Reich (east)', theatre: 'east', depot: 'pact', airfield: true, prod: 5, land: ['berlin', 'reichWest'], lat: 52.0, lon: 12.0 },

    // ---- North Africa and the Mediterranean
    alexandria: { name: 'Alexandria', theatre: 'med', depot: 'nato', port: true, airfield: true, prod: 4, seas: ['easternMed'], land: ['alamein'], lat: 31.2, lon: 29.9 },
    alamein: { name: 'El Alamein', theatre: 'med', map: 'el-alamein', prod: 1, fort: 1, land: ['alexandria', 'gazala'], lat: 30.8, lon: 28.9 },
    gazala: { name: 'Gazala and Tobruk', theatre: 'med', map: 'gazala', port: true, seas: ['easternMed'], prod: 2, fort: 1, land: ['alamein', 'tunisiaSouth'], lat: 32.1, lon: 23.4 },
    tunisiaSouth: { name: 'El Guettar', theatre: 'med', map: 'el-guettar', prod: 1, land: ['gazala', 'kasserine'], lat: 34.3, lon: 8.9 },
    kasserine: { name: 'The Kasserine Pass', theatre: 'med', map: 'kasserine-pass', prod: 1, land: ['tunisiaSouth', 'algeria'], lat: 35.3, lon: 8.7 },
    algeria: { name: 'Algeria', theatre: 'med', depot: 'nato', port: true, airfield: true, prod: 3, seas: ['westernMed'], land: ['kasserine'], lat: 36.7, lon: 3.1 },
    sicily: { name: 'Sicily', theatre: 'med', map: null, coastal: ['gela'], seas: ['westernMed', 'easternMed'], port: true, airfield: true, prod: 2, fort: 1, land: ['italy'], lat: 37.5, lon: 14.0 },
    italy: { name: 'Italy', theatre: 'med', depot: 'pact', port: true, airfield: true, prod: 5, seas: ['westernMed'], land: ['sicily'], lat: 41.9, lon: 12.5 },

    // ---- The Pacific: islands, Burma
    hawaii: { name: 'Hawaii', theatre: 'pacific', depot: 'nato', port: true, airfield: true, prod: 6, seas: ['centralPacific'], land: [], lat: 21.3, lon: -157.9 },
    guadalcanal: { name: 'Guadalcanal', theatre: 'pacific', map: 'guadalcanal', coastal: [], seas: ['solomons'], port: true, airfield: true, prod: 1, land: [], lat: -9.4, lon: 160.0 },
    saipan: { name: 'Saipan', theatre: 'pacific', map: 'saipan', coastal: [], seas: ['philippineSea'], port: true, airfield: true, prod: 1, fort: 1, land: [], lat: 15.2, lon: 145.7 },
    iwoJima: { name: 'Iwo Jima', theatre: 'pacific', map: null, coastal: ['iwoJima'], seas: ['philippineSea'], airfield: true, prod: 1, fort: 2, land: [], lat: 24.8, lon: 141.3 },
    okinawa: { name: 'Okinawa', theatre: 'pacific', map: 'okinawa', coastal: ['okinawaLanding'], seas: ['philippineSea', 'japanSeas'], port: true, airfield: true, prod: 2, fort: 2, land: [], lat: 26.3, lon: 127.8 },
    japan: { name: 'Japan', theatre: 'pacific', depot: 'pact', port: true, airfield: true, prod: 7, seas: ['japanSeas'], land: [], lat: 35.0, lon: 135.0 },
    imphal: { name: 'Imphal', theatre: 'pacific', depot: 'nato', airfield: true, prod: 2, land: ['kohima'], lat: 24.8, lon: 93.9 },
    kohima: { name: 'Kohima', theatre: 'pacific', map: 'kohima', prod: 1, fort: 1, land: ['imphal', 'burma'], lat: 25.7, lon: 94.1 },
    burma: { name: 'Burma', theatre: 'pacific', depot: 'pact', port: true, airfield: true, prod: 3, seas: ['bayOfBengal'], land: ['kohima'], lat: 21.9, lon: 96.0 },
  },

  seas: {
    'north-atlantic': { name: 'The North Atlantic', theatre: 'atlantic', map: 'atlanticConvoy', seas: ['channel'], coasts: ['england'], lat: 52, lon: -25 },
    channel: { name: 'The Channel', theatre: 'west', map: null, seas: ['north-atlantic'], coasts: ['england', 'normandy'], lat: 50.3, lon: -1 },
    blackSea: { name: 'The Black Sea', theatre: 'east', map: null, seas: [], coasts: ['kuban'], lat: 43.5, lon: 34 },
    westernMed: { name: 'The western Mediterranean', theatre: 'med', map: 'maltaConvoy', seas: ['easternMed'], coasts: ['algeria', 'sicily', 'italy'], lat: 38, lon: 9 },
    easternMed: { name: 'The eastern Mediterranean', theatre: 'med', map: null, seas: ['westernMed'], coasts: ['alexandria', 'gazala', 'sicily'], lat: 34, lon: 22 },
    centralPacific: { name: 'The central Pacific', theatre: 'pacific', map: 'midway', seas: ['solomons', 'philippineSea'], coasts: ['hawaii'], lat: 25, lon: -175 },
    solomons: { name: 'The Solomons', theatre: 'pacific', map: 'savoSound', seas: ['centralPacific', 'philippineSea'], coasts: ['guadalcanal'], lat: -8, lon: 158 },
    philippineSea: { name: 'The Philippine Sea', theatre: 'pacific', map: 'philippineSea', seas: ['centralPacific', 'solomons', 'japanSeas', 'bayOfBengal'], coasts: ['saipan', 'iwoJima', 'okinawa'], lat: 18, lon: 135 },
    bayOfBengal: { name: 'The Bay of Bengal', theatre: 'pacific', map: null, seas: ['philippineSea'], coasts: ['burma'], lat: 14, lon: 90 }, /* (Rangoon's sea: through the Malacca Strait to the Pacific) */
    japanSeas: { name: 'The seas off Japan', theatre: 'pacific', map: 'surigaoStrait', seas: ['philippineSea'], coasts: ['okinawa', 'japan'], lat: 30, lon: 132 },
  },

  /** A battalion: the stacks it fields (unit type ids of this war; the army's own roster decides the models). */
  battalions: {
    infantry: ['rifles', 'rifles', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mortar', 'engineers', 'scouts'],
    armour: ['tank', 'tank', 'tank', 'ifv', 'ifv', 'rifles', 'rifles', 'tankDestroyer', 'reconVehicle'],
    artillery: ['artillery', 'artillery', 'observers', 'towedAA', 'rifles', 'mgTeam'],
  },
  /** Fleets: the ships of a task force, by the war's ship slots. */
  fleets: {
    battle: ['battleship', 'cruiser', 'destroyer', 'destroyer', 'destroyer'],
    carrier: ['carrier', 'cruiser', 'destroyer', 'destroyer'],
    escort: ['destroyer', 'destroyer', 'frigate', 'frigate'],
    amphibious: ['transport', 'transport', 'oldBattleship', 'destroyer', 'destroyer'],
    submarines: ['submarine', 'submarine', 'submarine'],
  },

  // The calendar runs on for as long as the war does (campaigns are endless): what happened on its real day, once.
  events: [
    { id: 'us-in-britain', date: '1942-08-17', text: 'The Eighth Air Force flies its first raid from England.', forces: [{ kind: 'air', side: 'nato', army: 'us', at: 'england', name: 'Eighth Air Force', squadrons: { fighter: 3, bomber: 4, recon: 1 } }] },
    { id: 'torch', date: '1942-11-08', text: 'Operation Torch: the Americans land in Algeria and Morocco, a new Allied base in North Africa.', owner: { algeria: 'nato' }, depot: { algeria: 'nato' },
      forces: [{ kind: 'army', side: 'nato', army: 'us', at: 'algeria', name: 'II Corps', battalions: ['infantry', 'armour'] }, { kind: 'fleet', side: 'nato', army: 'us', at: 'westernMed', name: 'Western Task Force', ships: 'amphibious' }] },
    { id: 'arsenal-1943', date: '1943-01-01', text: 'American war production reaches full stride: the arsenal of democracy.', industry: { nato: 1.6 } },
    { id: 'arsenal-1944', date: '1944-01-01', text: 'The Allies now outbuild the Axis several times over; the bombing begins to bite into German industry.', industry: { nato: 2.1, pact: 0.85 } },
    { id: 'italy-armistice', date: '1943-09-08', text: 'Italy signs an armistice; the Germans disarm their former ally and fight on in Italy alone.', morale: { pact: -10, nato: 5 } },
    { id: 'first-army', date: '1943-10-20', text: 'The First US Army sets up in England for the invasion of France.', forces: [{ kind: 'army', side: 'nato', army: 'us', at: 'england', name: 'First US Army', battalions: ['infantry', 'infantry', 'armour', 'artillery'] }, { kind: 'fleet', side: 'nato', army: 'us', at: 'channel', name: 'Western Naval Task Force', ships: 'amphibious' }] },
    { id: 'fast-carriers', date: '1943-11-01', text: 'The new Essex-class carriers join the Pacific Fleet.', forces: [{ kind: 'fleet', side: 'nato', army: 'us', at: 'centralPacific', name: 'Fast Carrier Task Force', ships: 'carrier' }] },
  ],

  scenarios: {
    // June 1942: Gazala, Midway, then Stalingrad and Guadalcanal: the war from where its maps begin, run on for as long as it lasts
    1942: {
      name: 'June 1942: the turning of the war',
      start: '1942-06-01',
      owners: { nato: ['england', 'moscow', 'stalingrad', 'kuban', 'alexandria', 'alamein', 'gazala', 'hawaii', 'imphal', 'kohima'] },
      depots: { algeria: null }, // (Vichy French until Torch: the event makes it an Allied base)
      industry: { nato: 1.2, pact: 1 },
      forces: [
        { kind: 'army', side: 'nato', army: 'brit', at: 'gazala', name: 'Eighth Army', battalions: ['infantry', 'armour', 'artillery'] },
        { kind: 'army', side: 'nato', army: 'brit', at: 'alamein', name: 'XXX Corps', battalions: ['infantry'] },
        { kind: 'fleet', side: 'nato', army: 'brit', at: 'easternMed', name: 'Mediterranean Fleet', ships: 'escort' },
        { kind: 'army', side: 'nato', army: 'brit21', at: 'england', name: 'Home Forces', battalions: ['infantry', 'infantry'] },
        { kind: 'fleet', side: 'nato', army: 'brit21', at: 'north-atlantic', name: 'Western Approaches escort group', ships: 'escort' },
        { kind: 'army', side: 'nato', army: 'sov', at: 'stalingrad', name: '62nd Army', battalions: ['infantry', 'infantry', 'artillery'] },
        { kind: 'army', side: 'nato', army: 'sov', at: 'moscow', name: 'Western Front', battalions: ['infantry', 'infantry', 'armour', 'artillery'] },
        { kind: 'army', side: 'nato', army: 'sov', at: 'kuban', name: '47th Army', battalions: ['infantry'] },
        { kind: 'fleet', side: 'nato', army: 'us', at: 'centralPacific', name: 'Task Force 16', ships: 'carrier' },
        { kind: 'army', side: 'nato', army: 'usmc', at: 'hawaii', name: '1st Marine Division', battalions: ['infantry', 'infantry'] },
        { kind: 'fleet', side: 'nato', army: 'us', at: 'solomons', name: 'Task Force 62', ships: 'amphibious' },
        { kind: 'army', side: 'nato', army: 'brit14', at: 'imphal', name: 'IV Corps', battalions: ['infantry', 'infantry'] },
        { kind: 'air', side: 'nato', army: 'brit21', at: 'england', name: 'RAF Fighter and Bomber Command', squadrons: { fighter: 4, bomber: 3, recon: 1 } },
        { kind: 'air', side: 'nato', army: 'sov', at: 'moscow', name: 'VVS Western Front', squadrons: { fighter: 3, strike: 3 } },
        { kind: 'air', side: 'nato', army: 'us', at: 'hawaii', name: 'Seventh Air Force', squadrons: { fighter: 2, bomber: 2 } },
        { kind: 'army', side: 'pact', army: 'wh', at: 'tunisiaSouth', name: 'Panzerarmee Afrika', battalions: ['armour', 'infantry', 'artillery'] },
        { kind: 'army', side: 'pact', army: 'wh', at: 'kasserine', name: 'Italian XX Corps', battalions: ['infantry'] },
        { kind: 'army', side: 'pact', army: 'wh', at: 'bobruisk', name: 'Sixth Army', battalions: ['infantry', 'infantry', 'armour', 'artillery'] },
        { kind: 'army', side: 'pact', army: 'wh', at: 'oder', name: 'Army Group Centre reserve', battalions: ['infantry'] },
        { kind: 'army', side: 'pact', army: 'wh', at: 'normandy', name: 'Fifteenth Army', battalions: ['infantry'] },
        { kind: 'army', side: 'pact', army: 'wh', at: 'remagen', name: 'Replacement army', battalions: ['infantry'] },
        { kind: 'army', side: 'pact', army: 'fj', at: 'sicily', name: 'Sicily garrison', battalions: ['infantry'] },
        { kind: 'army', side: 'pact', army: 'jp', at: 'guadalcanal', name: 'Guadalcanal garrison', battalions: ['infantry'] },
        { kind: 'army', side: 'pact', army: 'jp', at: 'burma', name: '15th Army', battalions: ['infantry', 'infantry'] },
        { kind: 'army', side: 'pact', army: 'jp', at: 'saipan', name: 'Saipan garrison', battalions: ['infantry'] },
        { kind: 'army', side: 'pact', army: 'jp', at: 'okinawa', name: 'Okinawa garrison', battalions: ['infantry'] },
        { kind: 'fleet', side: 'pact', army: 'jp', at: 'centralPacific', name: 'Kido Butai', ships: 'carrier' },
        { kind: 'fleet', side: 'pact', army: 'jp', at: 'japanSeas', name: 'Main Body', ships: 'battle' },
        { kind: 'fleet', side: 'pact', army: 'wh', at: 'north-atlantic', name: 'U-boat packs', ships: 'submarines' },
        { kind: 'air', side: 'pact', army: 'wh', at: 'reichWest', name: 'Luftflotte 3', squadrons: { fighter: 4, strike: 2, bomber: 2 } },
        { kind: 'air', side: 'pact', army: 'wh', at: 'reichEast', name: 'Luftflotte 4', squadrons: { fighter: 3, strike: 4 } },
        { kind: 'air', side: 'pact', army: 'jp', at: 'japan', name: 'Japanese naval air', squadrons: { fighter: 3, strike: 3 } },
      ],
    },
    // June 1944 to spring 1945: D-Day, Bagration, Saipan — most of the war's maps fit this year
    1944: {
      name: 'June 1944: D-Day',
      industry: { nato: 2.1, pact: 0.85 },
      start: '1944-06-06',
      owners: { // every province not listed: the Axis; depots as their `depot` says
        nato: ['england', 'moscow', 'stalingrad', 'kuban', 'bobruisk', 'alexandria', 'alamein', 'gazala', 'tunisiaSouth', 'kasserine', 'algeria', 'hawaii', 'guadalcanal', 'imphal', 'kohima'],
      },
      forces: [
        // the Allies
        { kind: 'army', side: 'nato', army: 'us', at: 'england', name: 'First US Army', battalions: ['infantry', 'infantry', 'armour', 'artillery'] },
        { kind: 'army', side: 'nato', army: 'brit21', at: 'england', name: 'Second British Army', battalions: ['infantry', 'armour', 'infantry'] },
        { kind: 'fleet', side: 'nato', army: 'us', at: 'channel', name: 'Western Naval Task Force', ships: 'amphibious' },
        { kind: 'fleet', side: 'nato', army: 'us', at: 'north-atlantic', name: 'Atlantic escort group', ships: 'escort' },
        { kind: 'army', side: 'nato', army: 'sov', at: 'bobruisk', name: '1st Belorussian Front', battalions: ['infantry', 'infantry', 'armour', 'artillery'] },
        { kind: 'army', side: 'nato', army: 'sov', at: 'kuban', name: '18th Army', battalions: ['infantry', 'infantry'] },
        { kind: 'army', side: 'nato', army: 'brit', at: 'gazala', name: 'Eighth Army', battalions: ['infantry', 'armour', 'artillery'] },
        { kind: 'fleet', side: 'nato', army: 'us', at: 'easternMed', name: 'Mediterranean Fleet', ships: 'amphibious' },
        { kind: 'army', side: 'nato', army: 'usmc', at: 'guadalcanal', name: 'V Amphibious Corps', battalions: ['infantry', 'infantry', 'armour'] },
        { kind: 'fleet', side: 'nato', army: 'us', at: 'solomons', name: 'Task Force 58', ships: 'carrier' },
        { kind: 'fleet', side: 'nato', army: 'us', at: 'solomons', name: 'Task Force 52', ships: 'amphibious' },
        { kind: 'army', side: 'nato', army: 'brit14', at: 'kohima', name: 'Fourteenth Army', battalions: ['infantry', 'infantry'] },
        { kind: 'air', side: 'nato', army: 'us', at: 'england', name: 'Eighth Air Force', squadrons: { fighter: 4, strike: 3, bomber: 4, recon: 1 } },
        { kind: 'air', side: 'nato', army: 'sov', at: 'moscow', name: '16th Air Army', squadrons: { fighter: 4, strike: 4, recon: 1 } },
        // the Axis
        { kind: 'army', side: 'pact', army: 'wh', at: 'normandy', name: 'Seventh Army', battalions: ['infantry', 'infantry', 'armour'] },
        { kind: 'army', side: 'pact', army: 'wh', at: 'remagen', name: 'Fifteenth Army', battalions: ['infantry', 'infantry', 'artillery'] },
        { kind: 'army', side: 'pact', army: 'wh', at: 'oder', name: 'Ninth Army', battalions: ['infantry', 'infantry', 'armour', 'artillery'] },
        { kind: 'army', side: 'pact', army: 'wh', at: 'berlin', name: 'Berlin garrison', battalions: ['infantry', 'infantry'] },
        { kind: 'army', side: 'pact', army: 'fj', at: 'sicily', name: 'Hermann Göring division', battalions: ['armour', 'infantry'] },
        { kind: 'army', side: 'pact', army: 'wh', at: 'italy', name: 'Tenth Army', battalions: ['infantry', 'infantry'] },
        { kind: 'army', side: 'pact', army: 'jp', at: 'saipan', name: '31st Army', battalions: ['infantry', 'infantry'] },
        { kind: 'army', side: 'pact', army: 'jp', at: 'okinawa', name: '32nd Army', battalions: ['infantry', 'infantry', 'artillery'] },
        { kind: 'army', side: 'pact', army: 'jp', at: 'iwoJima', name: '109th Division', battalions: ['infantry'] },
        { kind: 'army', side: 'pact', army: 'jp', at: 'burma', name: '15th Army', battalions: ['infantry', 'infantry'] },
        { kind: 'fleet', side: 'pact', army: 'jp', at: 'philippineSea', name: 'Mobile Fleet', ships: 'carrier' },
        { kind: 'fleet', side: 'pact', army: 'jp', at: 'japanSeas', name: 'First Striking Force', ships: 'battle' },
        { kind: 'fleet', side: 'pact', army: 'wh', at: 'north-atlantic', name: 'U-boat packs', ships: 'submarines' },
        { kind: 'air', side: 'pact', army: 'wh', at: 'reichWest', name: 'Luftflotte Reich', squadrons: { fighter: 4, strike: 2, recon: 1 } },
        { kind: 'air', side: 'pact', army: 'jp', at: 'japan', name: 'Japanese naval air', squadrons: { fighter: 3, strike: 3 } },
      ],
    },
  },
};
