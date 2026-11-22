// Epochs: the war the game is set in, picked in the main menu (settings 'epoch') — 1985, the Cold
// War gone hot, or 1945, spring on the Western Front. An epoch is its own set of sides' names,
// armies, unit types, aircraft and army doctrines; setEpoch swaps them into the registries
// everything already imports (data/factions.js FACTIONS / ARMIES / DEFAULT_ARMY, data/units
// UNIT_TYPES, data/doctrine.js DOCTRINE, systems/AirStrike.js KINDS), in place, before a battle
// or the menu is built. Unit ids stay the same across epochs ('rifles', 'tank' …) so the modes,
// maps and the AI keep working; a type an epoch doesn't have falls back to `alias` (units/index.js
// typeOf), else it isn't there. Props read epoch() for their era (world/Props.js).
import { FACTIONS, ARMIES, DEFAULT_ARMY } from './factions.js';
import { DOCTRINE } from './doctrine.js';
import { UNIT_TYPES, TYPES_1985, ALIAS } from './units/index.js';
import { TYPES_1945, ALIAS_1945 } from './units45/index.js';
import { TYPES_1806, ALIAS_1806 } from './units1806/index.js';
import { TYPES_1918, ALIAS_1918 } from './units1918/index.js';
import { TYPES_2027, ALIAS_2027 } from './units2027/index.js';
import { KINDS, AIR_1985 } from '../systems/AirStrike.js';
import { AIR_1945 } from './air45.ts';
import { AIR_2027 } from './air27.js';
import { BOMBERS } from './bombers.js';
import { AIRFIELD } from './units/airfield.js';
import { AIR_1918 } from './air18.ts';

const DOCTRINE_1985 = { ...DOCTRINE };

export const EPOCHS = {
  1806: {
    id: '1806', name: '1806', title: 'Jena and Auerstedt, 1806',
    blurb: 'October 1806. Napoleon\'s Grande Armée marches through the Thuringian Forest against Prussia and her Saxon allies: muskets, bayonets, horses and guns.',
    sides: { nato: 'France', pact: 'Prussia' },
    regions: { // (the menu's regions: maps/index.js REGIONS — their name in this war, a title and line)
      europe: { name: 'Germany', // (and at sea: per theatre, ui/MainMenu.js regionInfo)
        sea: { name: 'European waters', title: 'The War at Sea, 1805–07', blurb: 'Trafalgar, the blockade of Brest and Copenhagen: the Royal Navy against the fleets of France, Spain and Denmark.' } },
      east: { name: 'Poland', title: 'Poland and East Prussia, 1807', blurb: 'Poland and East Prussia, 1806–07: the Grande Armée against the Russian army — the mud at Pułtusk, snow at Eylau, the redoubts of Heilsberg, the river at Friedland.' },
      iberia: { name: 'The Peninsula', title: 'The Peninsular War', blurb: 'Portugal and Spain, 1808–11: Wellington’s redcoats in their line against the French columns — Vimeiro, Talavera, the ridge of Bussaco, the village of Fuentes de Oñoro.' },
      africa: { name: 'Egypt', title: 'Egypt, 1798–1801', blurb: 'The Nile and the Egyptian coast: Nelson at Aboukir Bay, Abercromby’s landing.' },
      caribbean: { title: 'The West Indies', blurb: 'Frigates and ships of the line among the sugar islands.' },
    },
    armies: {
      fr: { id: 'fr', faction: 'nato', name: 'Grande Armée' },
      by: { id: 'by', faction: 'nato', name: 'Bavaria' },
      pr: { id: 'pr', faction: 'pact', name: 'Prussia' },
      sx: { id: 'sx', faction: 'pact', name: 'Saxony' },
      ru: { id: 'ru', faction: 'pact', name: 'Russian Army', regions: ['east'] },          // (Poland 1807: Eylau, Friedland)
      gb: { id: 'gb', faction: 'pact', name: 'British Army', regions: ['iberia', 'africa'] }, // (the Peninsula, and Egypt: the Aboukir landing)
      dk: { id: 'dk', faction: 'nato', name: 'Denmark', navy: 'Royal Danish Navy', regions: [] }, // (Søetaten, at Copenhagen only: the map names it — its ships in the French hulls, her own colours: data/units1806/ships.js)
    },
    defaults: { nato: 'fr', pact: 'pr' },
    types: TYPES_1806, alias: ALIAS_1806, air: {},
    // each army's two signatures (they take effect as the units they need arrive: formations, cavalry, guns)
    doctrine: {
      fr: [
        { id: 'pasDeCharge', name: 'Pas de charge', text: 'Columns march 20 % faster, and their bayonet charge hits the enemy\'s nerve 50 % harder.', speed: 1.2, shock: 1.5 },
        { id: 'tirailleurs', name: 'Tirailleur swarm', text: 'Light infantry is harder to spot, and its skirmishing fire pins 30 % more.', stealth: 1.3, suppress: 1.3 },
      ],
      by: [
        { id: 'quickGuns', name: 'Quick guns', text: 'Artillery limbers and unlimbers 40 % faster (the reformed artillery of 1804).', deploy: 0.6 },
        { id: 'lightHorse', name: 'Light horse', text: 'Light cavalry costs 20 % less and sees farther.', cost: 0.8, sight: 1.25 },
      ],
      pr: [
        { id: 'peloton', name: 'Peloton fire', text: 'Line infantry reloads 15 % faster and hits better in line (the drill of Frederick the Great).', reload: 0.85, spread: 0.85 },
        { id: 'cuirassiers', name: 'Heavy cuirassiers', text: 'Heavy cavalry charges 25 % harder — but formations change 25 % slower (the old rigid drill).', shock: 1.25, form: 1.25 },
      ],
      sx: [
        { id: 'squares', name: 'Steady squares', text: 'Squares never break against cavalry and lose less nerve under artillery (the Saxon grenadiers left Jena in square).' },
        { id: 'gardeDuCorps', name: 'Garde du Corps', text: 'Heavy cavalry starts as Veterans.' },
      ],
      ru: [
        { id: 'greatBattery', name: 'Great batteries', text: 'Guns with two more of yours within 60 m fire 30 % faster: the Russian army massed more guns than anyone, and at Eylau they stood wheel to wheel on the ridge.', near: 60, count: 2, fire: 1.3 },
        { id: 'stubborn', name: 'Stubborn defence', text: 'Infantry in line takes 20 % less damage: at Eylau the Russian lines stood in the snow and had to be killed where they stood.', take: 0.8 },
      ],
      gb: [
        { id: 'twoDeep', name: 'Two-deep line', text: 'Infantry in line that has stood still for 3 s hits 20 % harder: the thin line waits, then every musket fires at once.', still: 3, dmg: 1.2 },
        { id: 'baker', name: 'The Baker rifle', text: 'Riflemen reach 30 % further and cost 20 % less: the 95th picked off officers at ranges no musket could answer.', mods: { sniper: { range: 1.3 } }, costs: { sniper: 0.8 } },
      ],
      dk: [
        { id: 'blockships', name: 'Blockships', text: 'Ships of the line cost 20 % less: old hulls cut down and moored as floating batteries, fought where they lay.', costs: { cruiser: 0.8 } },
        { id: 'volunteers', name: 'Copenhagen\'s volunteers', text: 'Ships of the line and frigates take 10 % less damage: students, dock hands and the city\'s men rowed out to fill the gaps at the guns.', mods: { cruiser: { take: 0.9 }, frigate: { take: 0.9 } } },
      ],
    },
  },
  1918: {
    id: '1918', name: '1918', title: 'The Western Front, 1918',
    blurb: '1918 in Picardy. Germany throws everything into one last offensive; then the Allies strike back with tanks, aircraft and guns. Trenches, wire and gas, and the first tank battles.',
    sides: { nato: 'Allies', pact: 'Germany' },
    regions: {
      europe: { name: 'Western Front',
        sea: { name: 'North Sea', title: 'The North Sea, 1914–18', blurb: 'Dogger Bank, the Heligoland Bight and the Dover Strait: the Grand Fleet against the High Seas Fleet.' } },
      east: { title: 'The Eastern Front, 1914–17', blurb: 'Russia against Germany and Austria-Hungary: the lakes of Tannenberg, the breakthrough at Gorlice, Brusilov’s offensive at Lutsk, and Riga, where the storm troops first crossed the Dvina.' },
      italy: { title: 'The Italian Front', blurb: 'The Alps and the Piave, 1917–18: Italy, with British divisions, against Austria-Hungary and Germany — Caporetto, the Asiago plateau, the Piave and the last crossing at Vittorio Veneto.' },
      middleEast: { title: 'The Middle East', blurb: 'Gallipoli 1915 and Palestine 1918: the British Empire, ANZACs among them, against the Ottoman Empire.' },
      med: { title: 'The Mediterranean', blurb: 'The Otranto Barrage, 1917: Austro-Hungarian cruisers against the drifters and destroyers closing the Adriatic.' },
    },
    armies: {
      uk: { id: 'uk', faction: 'nato', name: 'British Army' },
      fr: { id: 'fr', faction: 'nato', name: 'French Army' },
      de: { id: 'de', faction: 'pact', name: 'German Army' },
      st: { id: 'st', faction: 'pact', name: 'Sturmtruppen' },
      // the other fronts (own: only the types data/units1918/fronts.js writes for them)
      // standIn: a type the army lacks is fielded as this one of its own (null: not at all); else one of the same role it has (data/units/index.js standInFor)
      ot: { id: 'ot', faction: 'pact', name: 'Ottoman Army', own: true, regions: ['middleEast'], standIn: { tank: 'ifv', heavyTank: 'ifv', reconVehicle: 'ifv' } }, // (no armour at all: the Süvari are its mobile arm)
      anzac: { id: 'anzac', faction: 'nato', name: 'ANZAC', own: true, regions: ['middleEast'], standIn: { tank: 'reconVehicle', heavyTank: 'reconVehicle', aa: 'manpads' } }, // (the Light Car Patrol; the Lewis AA teams)
      it: { id: 'it', faction: 'nato', name: 'Italian Army', own: true, navy: 'Regia Marina', regions: ['italy'] },
      ah: { id: 'ah', faction: 'pact', name: 'Austro-Hungarian Army', own: true, navy: 'k.u.k. Kriegsmarine', regions: ['italy', 'east'], standIn: { tank: 'reconVehicle', heavyTank: 'reconVehicle' } }, // (no tanks: the Romfell armoured car)
      ru: { id: 'ru', faction: 'nato', name: 'Russian Army', own: true, regions: ['east'], standIn: { tank: 'reconVehicle' } }, // (no tanks: the Austin-Putilov armoured cars)
      // the world campaign's own armies (wcampaign/wars/ww1.js), no roster yet. `own` with no types: they field nothing of
      // another nation's; no regions: no map picks them, so a campaign battle fights them as the side's army that fits its
      // map (data/factions.js armiesFrom — the British or French, the Germans). TODO units: their rosters, then their regions.
      aef: { id: 'aef', faction: 'nato', name: 'American Expeditionary Forces', own: true, regions: [] },
      serb: { id: 'serb', faction: 'nato', name: 'Serbian Army', own: true, regions: [] },
      bg: { id: 'bg', faction: 'pact', name: 'Bulgarian Army', own: true, regions: [] },
    },
    defaults: { nato: 'uk', pact: 'de' },
    types: TYPES_1918, alias: ALIAS_1918, air: { ...AIR_1918, ...BOMBERS[1918] },
    // each army's two signatures (ponytail: their effects are wired as the units they need arrive — tanks, guns)
    doctrine: {
      uk: [
        { id: 'allArms', name: 'All arms', text: 'Tanks with infantry close by break down half as often (Hamel and Amiens: tanks, infantry, guns and aircraft as one plan).' },
        { id: 'lewis', name: 'Lewis guns', text: 'Every infantry section carries a Lewis gun: its fire pins 25 % more.', suppress: 1.25 },
      ],
      fr: [
        { id: 'soixanteQuinze', name: 'The 75', text: 'Field guns fire 30 % faster: the quick-firing Canon de 75.', fire: 1.3 },
        { id: 'swarm', name: 'Tank swarm', text: 'Renault FTs cost 25 % less: thousands of light tanks.', cost: 0.75 },
      ],
      de: [
        { id: 'depth', name: 'Defence in depth', text: 'Infantry in cover — a trench, a shell hole, a ruin — breaks only at 60 % of the losses others do.', morale: 0.6 },
        { id: 'bruchmueller', name: 'Hurricane bombardment', text: 'The barrage is short and sharp: it costs 25 % less and lands sooner.', cost: 0.75 },
      ],
      st: [
        { id: 'infiltrate', name: 'Infiltration', text: 'Storm troops move 20 % faster and are harder to spot: they slip past the strongpoints and leave them to the next wave.', speed: 1.2, stealth: 1.3 },
        { id: 'grenades', name: 'Grenade fighting', text: 'Grenades are thrown 30 % further: the storm troops clear a trench bay from the next one.', reach: 1.3 },
      ],
      // the other fronts: the mechanics above, 1945's and 1985's, under their own names
      ot: [
        { id: 'digIn', name: 'Dig in', text: 'Infantry that has stood still for 15 s takes 25 % less damage: at Gallipoli the Ottoman trenches were dug in a night and held for eight months.', still: 15, take: 0.75 },
        { id: 'ridge', name: 'Hold the ridge', text: 'Infantry at least 4 m above the nearest enemy (within 300 m) aims 25 % better: Kemal’s men on Chunuk Bair looked down on every attack.', rise: 4, within: 300, aim: 1.25 },
      ],
      anzac: [
        { id: 'walers', name: 'The Light Horse', text: 'Horsemen move 20 % faster and are 15 % tougher: the Walers carried the Light Horse across the desert to the wells of Beersheba at the gallop.', mods: { cavalry: { speed: 1.2, hp: 1.15 } } },
        { id: 'hamel', name: 'Monash’s tanks', text: 'Infantry within 40 m of a friendly tank takes 20 % less damage: at Hamel the Australians walked in behind the tanks and took the village in 93 minutes.', range: 40, take: 0.8 },
      ],
      it: [
        { id: 'bombarde', name: 'The bombarde', text: 'Mortars reach 30 % further and their bombs burst 30 % wider: the Italian trench mortars cut the Austrian wire on the Isonzo.', mods: { mortar: { range: 1.3, splash: 1.3 }, spMortar: { range: 1.3, splash: 1.3 } } },
        { id: 'arditi', name: 'Arditi', text: 'Infantry with an enemy within 40 m hits 30 % harder: the Arditi went in with dagger and grenade, black flames on their collars.', range: 40, dmg: 1.3 },
      ],
      ah: [
        { id: 'skoda', name: 'Škoda guns', text: 'Field guns reach 15 % further and hit fortifications twice as hard: the Škoda works built the guns that broke the forts of Belgium.', mods: { artillery: { range: 1.15, vsStructure: 2 } } },
        { id: 'standschuetzen', name: 'Standschützen', text: 'Snipers and scouts see 20 % further and cost 30 % less: the Tyrolean rifle clubs knew every crag of their own mountains.', mods: { sniper: { sight: 1.2 }, scouts: { sight: 1.2 } }, costs: { sniper: 0.7, scouts: 0.7 } },
      ],
      ru: [
        { id: 'committees', name: 'The army of 1917', text: 'Rifle squads cost 20 % less but break sooner: after the Revolution the soldiers’ committees voted on orders, and the will to go on drained away.', costs: { rifles: 0.8 }, mods: { rifles: { breakMorale: 1.3 } } },
        { id: 'cossacks', name: 'Cossacks', text: 'Horsemen do double damage to guns, mortars, ambulances, observers and staff: the Cossacks rode for the rear, not for the trenches.', soft: 2 },
      ],
      // the world campaign's armies (no roster yet: these take effect when their units are built)
      aef: [
        { id: 'doughboys', name: 'Doughboys', text: 'Rifle squads are 15 % tougher but cost 10 % more: big, fresh, well-fed men, two million of them, none worn down by three years in the trenches.', mods: { rifles: { hp: 1.15 } }, costs: { rifles: 1.1 } },
        { id: 'frenchGuns', name: 'French guns', text: 'Field guns and heavy howitzers cost 20 % less: the AEF went into battle with French 75s and 155s, and France had them by the thousand.', costs: { artillery: 0.8, spMortar: 0.8 } },
      ],
      serb: [
        { id: 'albania', name: 'The retreat through Albania', text: 'Rifle squads and machine-gun teams start as Veterans: the men who survived the winter march over the Albanian mountains in 1915.', veteran: ['rifles', 'mgTeam'] },
        { id: 'goatTracks', name: 'Goat tracks', text: 'Infantry moves 15 % faster: the Serbs went up the Kajmakčalan and the Dobro Pole by paths no mule could climb.', mods: { infantry: { speed: 1.15 } } },
      ],
      bg: [
        { id: 'mountainWall', name: 'The mountain wall', text: 'Machine-gun teams and mortars take 20 % less damage: for three years the Bulgarians held the crests of Macedonia, a nest on every one.', mods: { mgTeam: { take: 0.8 }, mortar: { take: 0.8 } } },
        { id: 'smallholders', name: 'A nation in arms', text: 'Rifle squads and cavalry cost 15 % less: a country of smallholders called up one man in four.', costs: { rifles: 0.85, ifv: 0.85 } },
      ],
    },
  },
  1985: {
    id: '1985', name: '1985', title: 'World War III, 1985',
    sides: { nato: 'NATO', pact: 'Warsaw Pact' },
    regions: {
      north: { title: 'The Northern Flank, 1985', blurb: 'Norway: the Soviet army comes over the Finnmark tundra, against the Lyngen line, into the Målselv valley and down the fjords toward Narvik — the Norwegians and the US Marines hold.' },
      korea: { title: 'Korea, 1985', blurb: 'The second Korean War: the North’s army pours through the DMZ — down the Chorwon valley, over the Imjin, toward Uijeongbu and Seoul — against South Korea and the US 2nd Infantry Division.' },
    },
    armies: {
      us: { id: 'us', faction: 'nato', name: 'US Army', regions: ['europe', 'korea'] },
      bw: { id: 'bw', faction: 'nato', name: 'Bundeswehr', regions: ['europe'] },
      sov: { id: 'sov', faction: 'pact', name: 'Soviet Army', regions: ['europe', 'north'] },
      nva: { id: 'nva', faction: 'pact', name: 'NVA', regions: ['europe'] },
      // the Northern Flank and Korea: each only the types written for it (data/units/armies85.js)
      // standIn: as 1918's; navyOf: the ships of that army of the same nation (data/factions.js armyHas)
      no: { id: 'no', faction: 'nato', name: 'Norwegian Army', own: true, regions: ['north'], standIn: { aa: 'towedAA', sam: 'towedAA', heavyTank: 'tank', rockets: 'artillery' } }, // (Bofors L/70; Leopard 1; M109) (the Royal Norwegian Navy: data/units/navies85.js)
      usmc: { id: 'usmc', faction: 'nato', name: 'US Marine Corps', own: true, regions: ['north'], navyOf: 'us', standIn: { aa: 'sam', heavyTank: 'tank', rockets: 'artillery' } }, // (the US Navy's ships; Improved HAWK; M60A1; M198)
      rok: { id: 'rok', faction: 'nato', name: 'ROK Army', own: true, regions: ['korea'] },
      kpa: { id: 'kpa', faction: 'pact', name: 'Korean People’s Army', own: true, regions: ['korea'] },
    },
    defaults: { nato: 'us', pact: 'sov' },
    types: TYPES_1985, alias: {}, air: AIR_1985, doctrine: DOCTRINE_1985,
  },
  2027: {
    id: '2027', name: '2027', title: 'The Suwałki Gap, 2027', beta: true,
    blurb: '2027, a war that has not happened: Russia strikes for the Suwałki Gap, the narrow land bridge between Poland and Lithuania. Drones overhead, jammers in every wood, and rockets that hit what they can find.',
    // the menu's regions (maps/index.js REGIONS): the land is the Gap (the war's own title), the sea and the coast their own
    regions: {
      europe: { name: 'Suwałki Gap',
        sea: { title: 'The Baltic, 2027', blurb: '2027 at sea: the US and Polish navies against the Russian Baltic Fleet — stealthy missiles, sea drones and drones over the horizon, from the Gotland Gap to the Gulf of Finland.' },
        coastal: { title: 'Gotland, 2027', blurb: 'The island in the middle of the Baltic: whoever holds it can cover the whole sea with air defence. The Baltic Fleet lands at dawn on Gotland’s west coast; US and Polish troops hold the beaches.' },
      },
      baltic: { title: 'The Baltic States, 2027', blurb: 'Estonia and Latvia: Narva on the border river, the tank country round Tapa, the twin town of Valga and Valka, Latgale’s lakes — NATO’s forward battlegroups against a Russian thrust from Pskov and Ivangorod.' },
      north: { title: 'The Northern Flank, 2027', blurb: 'Finnish Lapland and the Norwegian Arctic, NATO’s newest border with Russia: Salla, Kuusamo and Ivalo in the forests and fells, Kirkenes on the Pasvik — roads few, rivers many, winter long.' },
    },
    sides: { nato: 'NATO', pact: 'Russia' },
    armies: {
      us: { id: 'us', faction: 'nato', name: 'US Army', navy: 'US Navy' },
      pl: { id: 'pl', faction: 'nato', name: 'Polish Army', navy: 'Polish Navy' },
      ru: { id: 'ru', faction: 'pact', name: 'Russian Army', navy: 'Russian Baltic Fleet' },
      by: { id: 'by', faction: 'pact', name: 'Belarus' }, // (no navy: not offered at sea)
    },
    defaults: { nato: 'us', pact: 'ru' },
    types: TYPES_2027, alias: ALIAS_2027, air: { ...AIR_2027, ...BOMBERS[2027] },
    // each army's two signatures: 1985's mechanics where they still fit, three of their own (systems/Drones.js, CounterBattery.js, data/doctrine.js unitCost)
    doctrine: {
      // (2027: each army its own — the plain doctrine numbers, data/doctrine.js mods/costs; Poland keeps its volunteers, the militia mechanic)
      us: [{ id: 'precision', name: 'Precision fires', text: 'Guided shells and rockets: guns cost 15 % less, rocket launchers 20 % less and reload 20 % faster — GMLRS and Excalibur hit what they are aimed at.', costs: { artillery: 0.85, rockets: 0.8 }, mods: { rockets: { fireCooldown: 0.8 } } },
        { id: 'sensor', name: 'Sensor-to-shooter', text: 'Whatever your drones and counter-battery radars find is marked: marked enemies take 15 % more damage from everyone for 10 s.', mark: 10, damage: 1.15 }],
      pl: [{ id: 'armouredFist', name: 'Armoured fist', text: 'Tanks cost 15 % less and are 10 % tougher: Poland bought K2s and Abrams by the hundred to have the strongest tank force in Europe.', costs: { tank: 0.85, heavyTank: 0.85 }, mods: { tank: { hp: 1.1 }, heavyTank: { hp: 1.1 } } },
        { ...DOCTRINE_1985.nva[0], name: 'Territorial Defence', text: 'Obrona Terytorialna: cheap local volunteers with modern rifles and missiles that don’t count against your unit cap.' }],
      ru: [{ id: 'thermobaric', name: 'Thermobaric rockets', text: 'Rocket launchers burst 40 % wider and hit buildings and fortifications half again as hard: the TOS-1A burns out whole villages.', mods: { rockets: { splash: 1.4, vsStructure: 1.5 } } },
        { id: 'dronewar', name: 'Drone war', text: 'FPV and loitering munition teams cost 30 % less and launch their drones 30 % faster.', cost: 0.7, every: 0.7 }],
      by: [{ id: 'polonez', name: 'Polonez', text: 'Rocket launchers reach 20 % further: Belarus’ own long-range Polonez fires deep into the enemy’s rear.', mods: { rockets: { range: 1.2 } } },
        { id: 'airDefence', name: 'Unified air defence', text: 'Air-defence guns, missiles and teams see 30 % further and reach 15 % further: Belarus and Russia guard one shared sky.', mods: { aa: { sight: 1.3, range: 1.15 }, sam: { sight: 1.3, range: 1.15 }, manpads: { sight: 1.3, range: 1.15 }, gunMissile: { sight: 1.3, range: 1.15 } } }],
    },
  },
  1945: {
    id: '1945', name: '1945', title: 'Western Front, spring 1945',
    blurb: 'Spring 1945. The Allies are across the Rhine and driving into the heart of Germany; the Wehrmacht fights on in the hills of Hesse and Thuringia.', // (the menu's line; 1985's is data/game.js)
    // the menu's regions (maps/index.js REGIONS): each its own title and line
    regions: {
      east: { title: 'The Eastern Front', blurb: 'The Red Army against the Wehrmacht: Stalingrad on the Volga, the night landing at Novorossiysk, Bobruisk in the marshes, the Seelow Heights over the Oder and the last battle in Berlin.' },
      africa: { title: 'North Africa', blurb: 'The desert war and the Mediterranean: the boxes at Gazala, the minefields of El Alamein, the passes of Tunisia, the landing at Gela in Sicily and the Malta convoys.' },
      pacific: { title: 'The Pacific War', blurb: 'From Midway and Guadalcanal to Saipan, Iwo Jima and Okinawa, and Kohima on the Burma front: the Marines, the Army and the US Navy against an Imperial Army and Navy that will not surrender.' },
      europe: { sea: { name: 'North Atlantic', title: 'The Battle of the Atlantic', blurb: 'The convoys from Halifax and New York to Britain, and the U-boat packs waiting for them in the air gap of mid-ocean: Royal Navy escorts against the Kriegsmarine.' } },
      med: { sea: { title: 'The Mediterranean, 1942', blurb: 'Malta, besieged in the middle of the sea: the convoys fight through the Sicilian narrows past U-boats, E-boats and the German cruisers.' } },
    },
    sides: { nato: 'Allies', pact: 'Germany' },
    armies: {
      us: { id: 'us', faction: 'nato', name: 'US Army', pacific: 'both' }, // (Europe and the Pacific: the Army fought on Saipan and Okinawa beside the Marines)
      sov: { id: 'sov', faction: 'nato', name: 'Red Army' },
      wh: { id: 'wh', faction: 'pact', name: 'Wehrmacht', navy: 'Kriegsmarine' },
      fj: { id: 'fj', faction: 'pact', name: 'Fallschirmjäger' },
      // the Pacific (data/units45 the end): only on the Pacific's land maps (map.pacific), and there only they
      usmc: { id: 'usmc', faction: 'nato', name: 'US Marine Corps', pacific: true },
      brit: { id: 'brit', faction: 'nato', name: 'British 8th Army', navy: 'Royal Navy', own: true, regions: ['africa'] },
      brit21: { id: 'brit21', faction: 'nato', name: '21st Army Group', navy: 'Royal Navy', own: true, regions: ['europe'] }, // (NW Europe 1944: data/units45/brit21.js)
      brit14: { id: 'brit14', faction: 'nato', name: '14th Army', navy: 'Royal Navy', own: true, regions: ['pacific'] },   // (Burma 1944: data/units45/brit14.js) // (North Africa: El Alamein — data/units45 the end)
      jp: { id: 'jp', faction: 'pact', name: 'Imperial Japanese Army', navy: 'Imperial Navy', pacific: true, own: true }, // (own: only the types written for it)
    },
    defaults: { nato: 'us', pact: 'wh' },
    types: TYPES_1945, alias: ALIAS_1945, air: { ...AIR_1945, ...BOMBERS[1945] },
    // each army's two signatures (1945's own ids: tot, airsup, riders, counter, cats, hold, paradrop;
    // the Soviets' mass barrage is 1985's)
    doctrine: {
      us: [
        { id: 'tot', name: 'Time on Target', text: 'A support power (Z): every gun and mortar of yours in range fires one salvo on the spot — timed so that all the shells land at the same moment (120 CP).',
          cost: 120, cooldown: 120, flight: 9 },
        { id: 'airsup', name: 'Air superiority', text: 'Fighter patrols cost 40 % less and are ready again 30 % sooner.', cost: 0.6, cooldown: 0.7 },
      ],
      sov: [
        DOCTRINE_1985.sov[0],
        { id: 'riders', name: 'Tank riders', text: 'Every T-34 platoon brings a rifle squad riding on its hulls: drive them up, U puts them down.' },
      ],
      wh: [
        { id: 'counter', name: 'Counter-attack', text: 'For two minutes after a point is lost, your units within 60 m of it fire 25 % faster, aim 20 % better and get their nerve back.',
          window: 120, radius: 60, fire: 1.25, aim: 1.2, morale: 0.04 },
        { id: 'cats', name: 'Big cats', text: 'Heavy tanks cost 15 % more and come with Veteran crews. (The Panther and the Tiger arrive with the next units.)', cost: 1.15 },
      ],
      fj: [
        { id: 'hold', name: 'Hold to the last', text: 'Squads in cover break only at less than half the losses other squads do.', morale: 0.4 },
        { id: 'paradrop', name: 'Paradrop', text: 'Their paradrop costs 30 % less and is ready again 30 % sooner. (The paradrop arrives with the next units.)', cost: 0.7, cooldown: 0.7 },
      ],
      usmc: [
        { id: 'flame', name: 'Corkscrew and blowtorch', text: 'Engineers hit bunkers and fortifications 50 % harder: on Iwo Jima the Marines burned and blasted the caves one at a time.', mods: { engineers: { vsStructure: 1.5 } } },
        { id: 'valor', name: 'Uncommon valor', text: 'Squads down to half their men aim 25 % better and don’t break: “uncommon valor was a common virtue.”', aim: 1.25 },
      ],
      brit: [
        { id: 'stonk', name: 'The stonk', text: 'Guns, mortars and rockets fire 25 % faster while you have a Forward Observation Officer: at Alamein the Royal Artillery’s fire plans came down on one map reference.', fire: 1.25 },
        { id: 'reme', name: 'REME', text: 'Recovery vehicles cost 40 % less and repair twice as fast: the desert war went to whoever got his knocked-out tanks back first.', costs: { recovery: 0.6 }, mods: { recovery: { repair: 2 } } },
      ],
      brit21: [
        { id: 'funnies', name: 'Hobart’s Funnies', text: 'Assault and mine-clearing tanks cost 30 % less and are 30 % tougher: the 79th Armoured Division’s specialised tanks led every landing and every breach.', costs: { cev: 0.7, mineClear: 0.7 }, mods: { cev: { hp: 1.3 }, mineClear: { hp: 1.3 } } },
        { id: 'cabRank', name: 'Cab rank', text: 'Air support recharges 40 % faster: the Typhoons circled over the front waiting to be called down, like taxis on a rank.', cooldown: 0.6 },
      ],
      brit14: [
        { id: 'adminBox', name: 'The Admin Box', text: 'Units within 80 m of your command post don’t break: in the Arakan the boxes stood and fought surrounded instead of falling back.', range: 80 },
        { id: 'airSupply', name: 'Air supply', text: 'Every 20 s each infantry squad patches up a wounded man from what the Dakotas dropped: the 14th Army lived off the air.', every: 20, hp: 40 },
      ],
      jp: [
        { id: 'banzai', name: 'Banzai', text: 'Infantry within 60 m of the enemy charges: 30 % faster, 20 % harder hitting, unbreakable — and 15 % easier to kill.', range: 60, speed: 1.3, dmg: 1.2, take: 1.15 },
        { id: 'caves', name: 'Cave fortresses', text: 'Bunkers and fortifications take 40 % less damage: on Iwo Jima and Okinawa the defences were cut into the rock.', mods: { structures: { take: 0.6 } } },
      ],
    },
  },
};

let current = '1985';
/** The epoch now in force: '2027', '1985', '1945', '1918' or '1806'. */
export const epoch = () => current;
/** The epoch's year as a number, for 'before …' tests (props, sounds). */
export const year = () => Number(current);
export const epochInfo = () => EPOCHS[current];

const swap = (target, source) => {
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, source);
};

/** Put epoch `id` in force (unknown: 1985). */
export function setEpoch(id) {
  const e = EPOCHS[id] ?? EPOCHS[1985];
  current = e.id;
  FACTIONS.nato.name = e.sides.nato;
  FACTIONS.pact.name = e.sides.pact;
  swap(ARMIES, e.armies);
  Object.assign(DEFAULT_ARMY, e.defaults);
  swap(UNIT_TYPES, e.types);
  UNIT_TYPES.airfield ??= AIRFIELD; // (every war's airfields: systems/Airfields.js)
  swap(ALIAS, e.alias);
  swap(DOCTRINE, e.doctrine);
  for (const [kind, k] of Object.entries(KINDS)) {
    const aircraft = e.air[kind];
    k.off = !aircraft;           // no helicopters in 1945 (nor a recon flight yet)
    k.label0 ??= k.label;
    k.label = (e.id === '1945' && { lift: 'Paradrop', jet: 'Strike run' }[kind]) || (e.id === '1918' && { jet: 'Ground attack', recon: 'Spotter flight', navScout: 'Air scouting', torpBomb: 'Torpedo seaplanes' }[kind]) || k.label0;
    if (!('deck0' in k)) k.deck0 = k.deck;
    k.deck = (e.id === '1918' || e.id === '2027') && k.sea && k.deck0 !== 'ship' ? 'optional' : k.deck0; // (1918: the seaplanes from their shore stations — off HMS Furious if she has them aboard; 2027: the jets from the shore, off the America if she has them)
    if (aircraft) k.aircraft = aircraft;
  }
  return e;
}
