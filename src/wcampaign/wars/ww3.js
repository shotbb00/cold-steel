// The 1985 war's world for the world campaign (src/wcampaign): World War III that never was — NATO against the Warsaw
// Pact on the Central Front, the Northern Flank, in Korea, over the Atlantic and the Mediterranean. Data only, no game
// imports (the fields as in wars/ww2.js). New here: `escalation` — the nuclear shadow over the war (engine escalate()).

export const WW3 = {
  id: 'ww3',
  epoch: '1985',
  name: 'World War III',
  mapStyle: 'acetate', // (ui/WorldMap.js: a printed map under a plastic sheet, marked in marker pen)
  sides: { nato: 'NATO', pact: 'Warsaw Pact' },
  blurb: 'The war that never was, on one map: the Central Front in Germany, the Northern Flank in Norway, Korea, the Atlantic and the Mediterranean. The Pact strikes first and fast; NATO has to hold until the reinforcements cross the Atlantic. Move army groups, fleets and air wings in turns of half a week — and mind the nuclear shadow: strike too deep and both sides step to the brink.',
  sideText: { nato: 'The United States, West Germany, Norway and South Korea', pact: 'The Soviet Union, East Germany and North Korea' },
  // the theatres shown behind the menu (the backdrop's first view)
  home: ['central', 'north'],
  areas: [
    [[-26, 72], [-26, 62], [-12, 58], [-12, 34], [42, 34], [42, 72]], // Europe, the Mediterranean, Iceland and Kola together
    [[124, 33], [142, 33], [142, 44], [130, 44], [124, 41]],          // Korea, Japan, Vladivostok
    [[-82, 30], [-60, 30], [-60, 46], [-82, 46]],                      // the United States' east coast
  ],
  theatres: {
    central: { name: 'The Central Front', lat: 51.3, lon: 9 },
    north: { name: 'The Northern Flank', lat: 68.5, lon: 20 },
    korea: { name: 'Korea', lat: 38, lon: 127.5 },
    atlantic: { name: 'The Atlantic', lat: 52, lon: -35, sea: true },
    med: { name: 'The Mediterranean', lat: 37, lon: 22, sea: true },
  },

  powers: {
    usa: { name: 'The United States', side: 'nato', armies: ['us', 'usmc'], capitals: ['usa'] },
    frg: { name: 'West Germany', side: 'nato', armies: ['bw'], capitals: ['rhine'] },
    norway: { name: 'Norway', side: 'nato', armies: ['no'], capitals: ['bodo'] },
    rok: { name: 'South Korea', side: 'nato', armies: ['rok'], capitals: ['seoul'] },
    ussr: { name: 'The Soviet Union', side: 'pact', armies: ['sov'], capitals: ['kola', 'eastGermany', 'vladivostok'] },
    gdr: { name: 'East Germany', side: 'pact', armies: ['nva'], capitals: ['eastGermany'] },
    dprk: { name: 'North Korea', side: 'pact', armies: ['kpa'], capitals: ['pyongyang'] },
  },

  provinces: {
    // ---- the Central Front: from the Rhine to the inner-German border in Hesse, and the Baltic coast
    rhine: { name: 'The Rhine and the Low Countries', theatre: 'central', depot: 'nato', map: 'wesel', coastal: ['scheveningen'], port: true, airfield: true, prod: 7, seas: ['northSea'], land: ['frankfurt', 'schleswig'], lat: 51.0, lon: 6.0 },
    frankfurt: { name: 'Frankfurt and the Rhine-Main', theatre: 'central', map: 'rhein-main', airfield: true, prod: 4, land: ['rhine', 'hersfeld', 'haune', 'fulda'], lat: 50.1, lon: 8.7 },
    hersfeld: { name: 'Bad Hersfeld', theatre: 'central', map: 'hersfeld-airbase', airfield: true, prod: 1, land: ['frankfurt', 'haune', 'kaliwerk'], lat: 50.87, lon: 9.71 },
    haune: { name: 'The Haune and the Fulda', theatre: 'central', map: 'haune-fulda', prod: 1, land: ['frankfurt', 'hersfeld', 'fulda'], lat: 50.68, lon: 9.62 },
    fulda: { name: 'The Fulda Gap', theatre: 'central', map: 'fulda-gap', prod: 2, fort: 1, land: ['frankfurt', 'haune', 'huenfeld'], lat: 50.55, lon: 9.68 },
    huenfeld: { name: 'Hünfeld', theatre: 'central', map: 'huenfeld', prod: 1, land: ['fulda', 'werra', 'thuringia'], lat: 50.67, lon: 9.77 },
    kaliwerk: { name: 'Kaliwerk Hattorf', theatre: 'central', map: 'monte-kali', prod: 2, fort: 1, land: ['hersfeld', 'werra'], lat: 50.86, lon: 9.95 },
    werra: { name: 'The Werra valley', theatre: 'central', map: 'werra-valley', prod: 1, land: ['huenfeld', 'kaliwerk', 'thuringia'], lat: 50.92, lon: 10.12 },
    thuringia: { name: 'The Thuringian Forest', theatre: 'central', map: 'thuringian-forest', prod: 2, fort: 1, land: ['huenfeld', 'werra', 'eastGermany'], lat: 50.7, lon: 10.7 },
    eastGermany: { name: 'East Germany', theatre: 'central', depot: 'pact', map: 'magdeburg', airfield: true, prod: 11, fort: 1, land: ['thuringia', 'mecklenburg'], lat: 52.1, lon: 12.9 },
    mecklenburg: { name: 'Mecklenburg and Rostock', theatre: 'central', map: 'schwerin', coastal: ['wismar'], seas: ['baltic'], port: true, airfield: true, prod: 2, fort: 1, land: ['eastGermany', 'schleswig'], lat: 53.8, lon: 11.9 },
    schleswig: { name: 'Schleswig-Holstein', theatre: 'central', map: 'ratzeburg-lakes', coastal: ['hohwacht'], seas: ['baltic', 'northSea'], port: true, airfield: true, prod: 2, fort: 1, land: ['rhine', 'mecklenburg'], lat: 54.2, lon: 10.2 },
    britain: { name: 'Britain', theatre: 'central', depot: 'nato', map: 'east-anglia', coastal: ['felixstowe'], port: true, airfield: true, prod: 5, seas: ['northSea', 'eastAtlantic'], land: [], lat: 52.5, lon: -1.5 },

    // ---- the Northern Flank: from the Kola Peninsula over Finnmark down the fjords to Narvik
    kola: { name: 'The Kola Peninsula', theatre: 'north', depot: 'pact', map: 'murmansk', port: true, airfield: true, prod: 6, fort: 2, seas: ['barents'], land: ['pechenga'], lat: 68.9, lon: 33.1 },
    pechenga: { name: 'Pechenga', theatre: 'north', map: 'pechenga', coastal: ['liinakhamari'], prod: 1, fort: 1, seas: ['barents'], land: ['kola', 'finnmark'], lat: 69.5, lon: 31.2 },
    finnmark: { name: 'Finnmark', theatre: 'north', map: 'finnmark', coastal: ['varanger'], prod: 1, seas: ['barents'], land: ['pechenga', 'lyngen'], lat: 70.0, lon: 25.0 },
    lyngen: { name: 'The Lyngen line', theatre: 'north', map: 'lyngen', prod: 1, fort: 2, land: ['finnmark', 'malselv'], lat: 69.6, lon: 20.2 },
    malselv: { name: 'Målselv and Bardufoss', theatre: 'north', map: 'malselv', airfield: true, prod: 1, land: ['lyngen', 'narvik'], lat: 69.06, lon: 18.5 },
    narvik: { name: 'Narvik', theatre: 'north', map: 'narvik', coastal: ['ofotfjord'], port: true, prod: 2, seas: ['norwegianSea'], land: ['malselv', 'bodo'], lat: 68.44, lon: 17.43 },
    andoya: { name: 'Andøya', theatre: 'north', map: 'andenes', coastal: ['andoya'], seas: ['norwegianSea'], port: true, airfield: true, prod: 1, land: [], lat: 69.3, lon: 16.1 },
    bodo: { name: 'Bodø and the south', theatre: 'north', depot: 'nato', map: 'bodo', coastal: ['bodo-landing'], port: true, airfield: true, prod: 4, seas: ['norwegianSea'], land: ['narvik'], lat: 67.28, lon: 14.4 },
    iceland: { name: 'Iceland and Keflavík', theatre: 'atlantic', map: 'reykjanes', coastal: ['keflavik'], seas: ['eastAtlantic', 'norwegianSea'], port: true, airfield: true, prod: 1, land: [], lat: 64.0, lon: -22.6 },

    // ---- Korea: across the DMZ toward Seoul
    pyongyang: { name: 'North Korea', theatre: 'korea', depot: 'pact', map: 'pyongyang', coastal: ['nampo'], port: true, airfield: true, prod: 6, fort: 2, seas: ['yellowSea'], land: ['kaesong'], lat: 39.0, lon: 125.75 },
    kaesong: { name: 'Kaesong', theatre: 'korea', map: 'kaesong', prod: 1, fort: 2, land: ['pyongyang', 'dmz', 'chorwon'], lat: 38.2, lon: 126.55 },
    dmz: { name: 'The DMZ at Panmunjom', theatre: 'korea', map: 'korea', prod: 1, fort: 2, land: ['kaesong', 'chorwon', 'imjin'], lat: 37.96, lon: 126.68 },
    chorwon: { name: 'The Chorwon valley', theatre: 'korea', map: 'chorwon-valley', prod: 1, fort: 1, land: ['kaesong', 'dmz', 'uijeongbu'], lat: 38.25, lon: 127.21 },
    imjin: { name: 'The Imjin River', theatre: 'korea', map: 'imjin-river', prod: 1, fort: 1, land: ['dmz', 'uijeongbu'], lat: 37.89, lon: 126.95 },
    uijeongbu: { name: 'Uijeongbu', theatre: 'korea', map: 'uijeongbu', prod: 2, land: ['chorwon', 'imjin', 'seoul'], lat: 37.74, lon: 127.05 },
    seoul: { name: 'Seoul', theatre: 'korea', depot: 'nato', map: 'seoul', coastal: ['incheon'], port: true, airfield: true, prod: 6, seas: ['yellowSea'], land: ['uijeongbu'], lat: 37.55, lon: 126.98 },
    japan: { name: 'Japan', theatre: 'korea', depot: 'nato', map: 'hokkaido', coastal: ['ishikari'], port: true, airfield: true, prod: 4, fort: 2, seas: ['seaOfJapan'], land: [], lat: 35.4, lon: 139.6 },
    vladivostok: { name: 'Vladivostok', theatre: 'korea', depot: 'pact', map: 'vladivostok', coastal: ['ussuri'], port: true, airfield: true, prod: 5, fort: 1, seas: ['seaOfJapan'], land: [], lat: 43.1, lon: 131.9 },

    // ---- across the oceans: the arsenal, and the Mediterranean's two ends
    usa: { name: 'The United States', theatre: 'atlantic', depot: 'nato', safe: true, port: true, airfield: true, prod: 9, seas: ['westAtlantic'], land: [], lat: 39.0, lon: -75.0 },
    italy: { name: 'Italy and Naples', theatre: 'med', depot: 'nato', map: 'naples', coastal: ['salerno'], port: true, airfield: true, prod: 3, seas: ['ionian'], land: [], lat: 40.8, lon: 14.3 },
    syria: { name: 'Tartus', theatre: 'med', depot: 'pact', map: 'tartus', coastal: ['tartus-landing'], port: true, prod: 1, seas: ['easternMed'], land: [], lat: 34.9, lon: 35.9 },
  },

  seas: {
    northSea: { name: 'The North Sea', theatre: 'central', map: 'openSea', seas: ['baltic', 'eastAtlantic', 'norwegianSea'], coasts: ['britain', 'rhine', 'schleswig'], lat: 56, lon: 3 },
    baltic: { name: 'The Baltic', theatre: 'central', map: 'balticSea', seas: ['northSea'], coasts: ['schleswig', 'mecklenburg'], lat: 55, lon: 14 },
    barents: { name: 'The North Cape and the Barents Sea', theatre: 'north', map: 'northCape', seas: ['norwegianSea'], coasts: ['kola', 'pechenga', 'finnmark'], lat: 71.5, lon: 30 },
    norwegianSea: { name: 'The Norwegian Sea', theatre: 'north', map: 'norwegianSea', seas: ['barents', 'northSea', 'eastAtlantic'], coasts: ['narvik', 'andoya', 'bodo', 'iceland'], lat: 68, lon: 5 },
    eastAtlantic: { name: 'The GIUK gap and the convoy routes', theatre: 'atlantic', map: 'giukGap', seas: ['westAtlantic', 'northSea', 'norwegianSea', 'ionian'], coasts: ['britain', 'iceland'], lat: 56, lon: -20 },
    westAtlantic: { name: 'The western Atlantic', theatre: 'atlantic', map: 'openSea', seas: ['eastAtlantic'], coasts: ['usa'], lat: 40, lon: -55 },
    ionian: { name: 'The Ionian Sea', theatre: 'med', map: 'ionianSea', seas: ['eastAtlantic', 'easternMed'], coasts: ['italy'], lat: 38, lon: 18 }, /* (round Gibraltar to the Atlantic) */
    easternMed: { name: 'The eastern Mediterranean', theatre: 'med', map: 'openSea', seas: ['ionian'], coasts: ['syria'], lat: 34, lon: 30 },
    yellowSea: { name: 'The Yellow Sea', theatre: 'korea', map: 'openSea', seas: ['seaOfJapan'], coasts: ['seoul', 'pyongyang'], lat: 37, lon: 124.5 },
    seaOfJapan: { name: 'The Sea of Japan', theatre: 'korea', map: 'seaOfJapan', seas: ['yellowSea'], coasts: ['japan', 'vladivostok'], lat: 39.5, lon: 134 },
  },

  /** A battalion: the stacks it fields (1985's unit type ids; the army's own roster decides the models). */
  battalions: {
    infantry: ['rifles', 'rifles', 'rifles', 'ifv', 'ifv', 'atTeam', 'mortar', 'engineers', 'manpads'],
    armour: ['tank', 'tank', 'tank', 'ifv', 'ifv', 'rifles', 'rifles', 'atTeam', 'reconVehicle'],
    artillery: ['artillery', 'artillery', 'rockets', 'observers', 'aa', 'rifles'],
  },
  /** The armies with rosters of their own (data/units/armies85.js) field a stand-in for a type they lack (wcampaign/battle.js). */
  swap: {
    rok: { reconVehicle: 'tankDestroyer' },
    no: { rockets: 'artillery', aa: 'towedAA' },
    usmc: { rockets: 'artillery', aa: 'sam' },
  },
  /** Fleets: the ships of a task force, by 1985's ship slots (data/units/ships85.js). */
  fleets: {
    battle: ['battleship', 'cruiser', 'destroyer', 'destroyer', 'frigate'],
    carrier: ['carrier', 'cruiser', 'destroyer', 'frigate'],
    escort: ['destroyer', 'frigate', 'frigate', 'frigate'],
    amphibious: ['transport', 'transport', 'destroyer', 'frigate'],
    submarines: ['submarine', 'submarine', 'missileSub'],
  },

  /** Countries out of the war (world-atlas ids): hatched. Sweden, Finland, Austria, Switzerland, Ireland, Yugoslavia's successors, Albania, China. */
  neutral: ['752', '246', '040', '756', '372', '705', '191', '070', '688', '499', '807', '008', '156'],
  objectives: [
    { id: 'fulda', theatre: 'central', at: 'fulda', name: 'The Fulda Gap', hold: 4, morale: 6 },
    { id: 'frankfurt', theatre: 'central', at: 'frankfurt', name: 'Frankfurt and the Rhine-Main', hold: 4, morale: 8 },
    { id: 'thuringia', theatre: 'central', at: 'thuringia', name: 'Across the inner-German border', hold: 6, morale: 5 },
    { id: 'narvik', theatre: 'north', at: 'narvik', name: 'Narvik and the ore railway', hold: 4, morale: 5 },
    { id: 'northCape', theatre: 'north', at: 'barents', name: 'The North Cape', hold: 6, morale: 4 },
    { id: 'seoul', theatre: 'korea', at: 'seoul', name: 'Seoul', hold: 4, morale: 8 },
    { id: 'chorwon', theatre: 'korea', at: 'chorwon', name: 'The Chorwon valley', hold: 4, morale: 3 },
    { id: 'bridge', theatre: 'atlantic', at: 'eastAtlantic', name: 'The Atlantic bridge', hold: 8, morale: 6 },
    { id: 'iceland', theatre: 'atlantic', at: 'iceland', name: 'Iceland and Keflavík', hold: 4, morale: 4 },
    { id: 'med', theatre: 'med', at: 'ionian', name: 'The central Mediterranean', hold: 8, morale: 3 },
  ],
  /** The Arctic winter (Dec–Feb): the side that isn't trained for it loses men, the other attacks with an edge. */
  winter: { theatre: 'north', months: [11, 0, 1], freezes: 'pact', attrition: 0.02, attacks: 'nato', bonus: 1.1,
    text: { start: 'The polar night falls over the Northern Flank: the Norwegians and the Marines are at home in it, the motor rifle divisions are not.', end: 'The sun comes back over Finnmark; the snow will lie for months yet.' } },
  /**
   * The nuclear shadow (engine escalate()): a base taken or bombed deep in the enemy's rear brings both sides nearer
   * the brink; quiet turns let it ebb. At each level both sides' morale pays for the fear; at 100 both governments step
   * back — a ceasefire on the lines held, won by the side in better heart.
   */
  escalation: {
    start: 5, depot: 30, strike: 4, decay: 3,
    levels: [
      { at: 30, text: 'DEFCON 3: the strategic forces go on alert. The world holds its breath.' },
      { at: 60, morale: 3, text: 'DEFCON 2: nuclear weapons are dispersed to the field. In both capitals the word “tactical” is spoken aloud.' },
      { at: 85, morale: 5, text: 'The brink: release authority goes to the front commanders. One more step and there is no war left to win.' },
      { at: 100, end: 'Both governments step back from the nuclear brink: a ceasefire on the lines held.' },
    ],
  },
  events: [
    { id: 'marines-norway', date: '1985-08-29', text: 'The 4th Marine Amphibious Brigade lands in Norway and draws its prepositioned equipment.', forces: [{ kind: 'army', side: 'nato', army: 'usmc', at: 'bodo', name: '4th Marine Amphibious Brigade', battalions: ['infantry', 'infantry'] }] },
    { id: 'second-echelon', date: '1985-09-05', text: 'The Soviet second strategic echelon rolls out of Belorussia toward the front.', forces: [{ kind: 'army', side: 'pact', army: 'sov', at: 'eastGermany', name: '3rd Shock Army', battalions: ['armour', 'armour', 'infantry'] }] },
    { id: 'reforger', date: '1985-09-12', text: 'REFORGER: III Corps flies in from Texas and draws its stored equipment in the Low Countries.', forces: [{ kind: 'army', side: 'nato', army: 'us', at: 'rhine', name: 'III Corps', battalions: ['armour', 'armour', 'infantry', 'artillery'] }] },
    { id: 'mobilised', date: '1985-09-26', text: 'NATO’s mobilisation is complete: the reserves are at the front and the factories on a war footing.', industry: { nato: 1.25 } },
    { id: 'sealift', date: '1985-10-24', text: 'The first sealift convoys reach Europe: heavy divisions and ammunition by the shipload.', forces: [{ kind: 'army', side: 'nato', army: 'us', at: 'rhine', name: '1st Cavalry Division', battalions: ['armour', 'armour', 'artillery'] }] },
    { id: 'war-economy', date: '1986-01-01', text: 'The West’s economies are fully at war: the Pact cannot match the output for long.', industry: { nato: 1.35, pact: 1.1 } },
  ],

  scenarios: {
    // August 1985: the Pact comes out of its summer exercises across the border, before NATO has mobilised
    1985: {
      name: 'August 1985: the storm out of the east',
      start: '1985-08-15',
      owners: { nato: ['rhine', 'frankfurt', 'hersfeld', 'haune', 'fulda', 'huenfeld', 'kaliwerk', 'schleswig', 'britain', 'finnmark', 'lyngen', 'malselv', 'narvik', 'andoya', 'bodo', 'iceland', 'dmz', 'chorwon', 'imjin', 'uijeongbu', 'seoul', 'japan', 'usa', 'italy'] },
      industry: { nato: 0.85, pact: 1.3 }, // (the Pact surge: NATO's industry comes up with mobilisation and the war economy)
      forces: [
        // NATO, Central Front
        { kind: 'army', side: 'nato', army: 'us', at: 'fulda', name: 'V Corps', battalions: ['armour', 'infantry', 'artillery'] },
        { kind: 'army', side: 'nato', army: 'us', at: 'huenfeld', name: '11th Armored Cavalry', battalions: ['armour'] },
        { kind: 'army', side: 'nato', army: 'bw', at: 'kaliwerk', name: 'III. Korps', battalions: ['armour', 'infantry'] },
        { kind: 'army', side: 'nato', army: 'bw', at: 'hersfeld', name: '2. Panzergrenadierdivision', battalions: ['infantry'] },
        { kind: 'army', side: 'nato', army: 'us', at: 'frankfurt', name: '3rd Armored Division', battalions: ['armour', 'artillery'] },
        { kind: 'army', side: 'nato', army: 'bw', at: 'schleswig', name: 'I. Korps', battalions: ['infantry', 'infantry', 'armour'] },
        { kind: 'army', side: 'nato', army: 'bw', at: 'rhine', name: 'NORTHAG reserve', battalions: ['infantry', 'armour'] },
        { kind: 'air', side: 'nato', army: 'us', at: 'frankfurt', name: 'Seventeenth Air Force', squadrons: { fighter: 3, strike: 3, recon: 1 } },
        { kind: 'air', side: 'nato', army: 'bw', at: 'schleswig', name: 'Luftwaffe', squadrons: { fighter: 2, strike: 2 } },
        { kind: 'air', side: 'nato', army: 'us', at: 'britain', name: 'Third Air Force', squadrons: { fighter: 2, bomber: 2 } },
        // NATO, Northern Flank
        { kind: 'army', side: 'nato', army: 'no', at: 'finnmark', name: 'Finnmark garrison', battalions: ['infantry'] },
        { kind: 'army', side: 'nato', army: 'no', at: 'lyngen', name: 'Brigade Nord', battalions: ['infantry', 'artillery'] },
        { kind: 'army', side: 'nato', army: 'no', at: 'malselv', name: '6th Division', battalions: ['infantry'] },
        { kind: 'air', side: 'nato', army: 'no', at: 'bodo', name: 'Royal Norwegian Air Force', squadrons: { fighter: 2, strike: 1 } },
        // NATO, Korea and Japan
        { kind: 'army', side: 'nato', army: 'rok', at: 'dmz', name: 'ROK I Corps', battalions: ['infantry', 'infantry'] },
        { kind: 'army', side: 'nato', army: 'rok', at: 'chorwon', name: 'ROK VI Corps', battalions: ['infantry', 'artillery'] },
        { kind: 'army', side: 'nato', army: 'us', at: 'uijeongbu', name: '2nd Infantry Division', battalions: ['infantry', 'armour'] },
        { kind: 'army', side: 'nato', army: 'rok', at: 'seoul', name: 'Capital Defence Command', battalions: ['infantry', 'artillery'] },
        { kind: 'army', side: 'nato', army: 'rok', at: 'seoul', name: 'ROK III Corps', battalions: ['infantry', 'infantry'] },
        { kind: 'army', side: 'nato', army: 'us', at: 'japan', name: 'US Forces Japan', battalions: ['infantry', 'infantry'] },
        { kind: 'air', side: 'nato', army: 'us', at: 'seoul', name: 'Seventh Air Force', squadrons: { fighter: 2, strike: 2 } },
        { kind: 'air', side: 'nato', army: 'us', at: 'japan', name: 'Fifth Air Force', squadrons: { fighter: 2, recon: 1 } },
        // NATO, the oceans
        { kind: 'army', side: 'nato', army: 'us', at: 'usa', name: 'XVIII Airborne Corps', battalions: ['infantry', 'infantry'] },
        { kind: 'fleet', side: 'nato', army: 'us', at: 'eastAtlantic', name: 'Striking Fleet Atlantic', ships: 'carrier' },
        { kind: 'fleet', side: 'nato', army: 'us', at: 'westAtlantic', name: 'Convoy escort group', ships: 'escort' },
        { kind: 'fleet', side: 'nato', army: 'us', at: 'norwegianSea', name: 'Iowa surface action group', ships: 'battle' },
        { kind: 'fleet', side: 'nato', army: 'us', at: 'ionian', name: 'Sixth Fleet', ships: 'carrier' },
        { kind: 'fleet', side: 'nato', army: 'us', at: 'yellowSea', name: 'Seventh Fleet', ships: 'carrier' },
        // the Pact, Central Front (the first strategic echelon)
        { kind: 'army', side: 'pact', army: 'sov', at: 'thuringia', name: '8th Guards Army', battalions: ['armour', 'armour', 'infantry', 'artillery'] },
        { kind: 'army', side: 'pact', army: 'sov', at: 'werra', name: '1st Guards Tank Army', battalions: ['armour', 'armour', 'infantry'] },
        { kind: 'army', side: 'pact', army: 'sov', at: 'eastGermany', name: '2nd Guards Tank Army', battalions: ['armour', 'armour', 'artillery'] },
        { kind: 'army', side: 'pact', army: 'nva', at: 'mecklenburg', name: 'NVA 5th Army', battalions: ['infantry', 'armour', 'infantry'] },
        { kind: 'army', side: 'pact', army: 'nva', at: 'eastGermany', name: 'NVA 3rd Army', battalions: ['infantry', 'armour'] },
        { kind: 'fleet', side: 'pact', army: 'nva', at: 'baltic', name: 'Volksmarine landing force', ships: 'amphibious' },
        { kind: 'fleet', side: 'pact', army: 'sov', at: 'baltic', name: 'Baltic Fleet', ships: 'escort' },
        { kind: 'air', side: 'pact', army: 'sov', at: 'eastGermany', name: '16th Air Army', squadrons: { fighter: 4, strike: 4, recon: 1 } },
        // the Pact, Northern Flank
        { kind: 'army', side: 'pact', army: 'sov', at: 'pechenga', name: '6th Army', battalions: ['infantry', 'armour', 'artillery', 'infantry'] },
        { kind: 'army', side: 'pact', army: 'sov', at: 'kola', name: 'Leningrad Military District reserve', battalions: ['infantry', 'infantry'] },
        { kind: 'fleet', side: 'pact', army: 'sov', at: 'barents', name: 'Northern Fleet', ships: 'battle' },
        { kind: 'fleet', side: 'pact', army: 'sov', at: 'barents', name: 'Northern Fleet landing force', ships: 'amphibious' },
        { kind: 'fleet', side: 'pact', army: 'sov', at: 'eastAtlantic', name: 'Northern Fleet submarines', ships: 'submarines' },
        { kind: 'air', side: 'pact', army: 'sov', at: 'kola', name: 'Northern Fleet aviation', squadrons: { fighter: 2, strike: 3 } },
        // the Pact, Korea and the Pacific
        { kind: 'army', side: 'pact', army: 'kpa', at: 'kaesong', name: 'KPA I Corps', battalions: ['infantry', 'infantry', 'artillery'] },
        { kind: 'army', side: 'pact', army: 'kpa', at: 'kaesong', name: 'KPA II Corps', battalions: ['infantry', 'armour', 'infantry'] },
        { kind: 'army', side: 'pact', army: 'kpa', at: 'pyongyang', name: 'KPA V Corps', battalions: ['infantry', 'infantry', 'artillery'] },
        { kind: 'army', side: 'pact', army: 'sov', at: 'vladivostok', name: 'Far East Military District', battalions: ['infantry', 'armour'] },
        { kind: 'air', side: 'pact', army: 'kpa', at: 'pyongyang', name: 'KPA Air Force', squadrons: { fighter: 3, strike: 2 } },
        { kind: 'fleet', side: 'pact', army: 'sov', at: 'seaOfJapan', name: 'Pacific Fleet', ships: 'carrier' },
        // the Pact, the Mediterranean
        { kind: 'fleet', side: 'pact', army: 'sov', at: 'easternMed', name: '5th Operational Squadron', ships: 'escort' },
      ],
    },
  },
};
