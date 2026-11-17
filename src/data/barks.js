// Callouts soldiers shout, by language and situation, the language by army (LANG: the Bundeswehr,
// NVA, Wehrmacht and Fallschirmjäger shout German, the Soviets Russian — on whichever side they
// fight), else by side. UnitStack.bark(unit, kind) picks a random line.
// Shown as floating text above the soldier (ui/Barks.js); Russian in transliteration. There is no speech.
import { epoch } from './epoch.js';

const LINES = {
  nato: {
    contact: ['Contact front!', 'Enemy infantry!', 'Got movement, eleven o\'clock!', 'Contact! Contact!', 'Eyes on, hostiles!'],
    cover: ['Get down!', 'Take cover!', 'Find cover!', 'Behind the wall!', 'Moving!'],
    reload: ['Changing mag!', 'Reloading!', 'Cover me, I\'m out!', 'Mag out!'],
    hit: ['I\'m hit!', 'Agh!', 'I\'m okay, I\'m okay!', 'Son of a—!'],
    wounded: ['I\'m hit bad!', 'Medic!', 'Corpsman!', 'Can\'t feel my leg!'],
    down: ['Man down!', 'We got a man down!', 'Medic! Medic!', 'He\'s gone!'],
    pinned: ['We\'re pinned!', 'Keep your heads down!', 'Too much fire!'],
    retreat: ['Fall back!', 'Pull back, pull back!', 'Break contact!'],
    flank: ['Flanking left!', 'Move around them!', 'Second squad, go right!'],
    rally: ['On me!', 'Form up on me!', 'Regroup!'],
    bail: ['Bail out, bail out!', 'We\'re hit, get out!', 'Out, out, out!'],
    officer: ['The LT\'s down!', 'Lieutenant\'s hit!', 'We lost the lieutenant!', 'Who\'s in charge?!'],
    straddle: ['Straddle!', 'We have the range!', 'Splashes all round her!', 'On target — fire for effect!'],
    // a ship's (UnitStack.bark maps hit / wounded / contact to these at sea)
    shipHit: ['We’re hit!', 'Hit amidships!', 'Shell aboard aft!', 'Fire on the boat deck!', 'Damage control, forward!'],
    shipBad: ['She’s taking water!', 'Flooding forward!', 'We’re listing!', 'All hands to damage control!', 'Can’t hold her much longer!'],
    shipContact: ['Ships in sight!', 'Smoke on the horizon!', 'Radar contact!', 'Enemy ships, bearing two-seven-zero!'],
    // the coastal maps (systems/Landing.js): off the boat
    landing: ['Ramp going down!', 'Go, go, go!', 'Off the boat, move!', 'Get off the beach!', 'Follow me!', 'Keep moving, don\'t bunch up!'],
  },
  pact: {
    contact: ['Protivnik!', 'Vizhu vraga!', 'Kontakt!', 'Vrag vperedi!'],
    cover: ['Lozhis\'!', 'V ukrytiye!', 'Prigni golovu!'],
    reload: ['Perezaryazhayu!', 'Prikroy!', 'Magazin pustoy!'],
    hit: ['Ranen!', 'Chyort!', 'Ya v poryadke!'],
    wounded: ['Sanitar!', 'Ya ranen!', 'Pomogite!'],
    down: ['Ubit!', 'Poteri!', 'Sanitara!'],
    pinned: ['Prizhali!', 'Ne vysovyvat\'sya!'],
    retreat: ['Otkhodim!', 'Nazad!', 'Otstupat\'!'],
    flank: ['Obkhodim sleva!', 'V obkhod!'],
    rally: ['Ko mne!', 'Vperyod!', 'Za mnoy!'],
    bail: ['Pokinut\' mashinu!', 'Gorim! Vylezay!'],
    officer: ['Leytenanta ubili!', 'Komandir ranen!', 'Kto komanduyet?!'],
    // the naval infantry off the boats (the coastal maps: Hohwacht) — 'Polundra!', their old battle cry
    landing: ['Polundra!', 'Vperyod, vperyod!', 'Iz katera — begom!', 'S plyazha — vperyod!', 'Za mnoy!', 'Ne skuchivat\'sya!'],
    // the Soviet Navy's ships (1985 at sea)
    shipHit: ['Popadaniye!', 'Pozhar v nadstroyke!', 'Popadaniye v kormu!', 'Avariynaya partiya — v nos!'],
    shipBad: ["Postupayet voda!", "Kren na bort!", "Vse na bor'bu za zhivuchest'!", "Ne uderzhim!"],
    shipContact: ["Tsel' obnaruzhena!", "Kontakt na radare!", "Korabli protivnika, peleng dva-sem'-nol'!"],
    straddle: ["Nakrytiye!", "Est' popadaniye!", "Tak derzhat'!"],
  },
  de: {
    boats: ['Landungsboote!', 'Feuer auf die Boote!', 'Sie kommen!', 'Alarm — Landung!', 'Da, am Strand!'], // (the coastal maps: the boats coming in)
    landing: ['Rampe runter!', 'Los, los, los!', 'Raus aus dem Boot!', 'Runter vom Strand!', 'Mir nach!', 'Auseinander, nicht zusammenballen!'], // (the NVA's naval infantry off the boats, Hohwacht)
    contact: ['Feind!', 'Feindkontakt!', 'Feind voraus!', 'Achtung, Feind!', 'Bewegung, elf Uhr!'],
    cover: ['Deckung!', 'In Deckung!', 'Runter!', 'Hinter die Mauer!'],
    reload: ['Nachladen!', 'Magazin leer!', 'Feuerschutz!'],
    hit: ['Getroffen!', 'Verdammt!', 'Geht schon, geht schon!'],
    wounded: ['Sanitäter!', 'Ich bin verwundet!', 'Hilfe!', 'Mein Bein!'],
    down: ['Mann am Boden!', 'Sanitäter! Sanitäter!', 'Er ist tot!'],
    pinned: ['Die nageln uns fest!', 'Köpfe runter!', 'Zu viel Feuer!'],
    retreat: ['Zurück!', 'Absetzen!', 'Rückzug, Rückzug!'],
    flank: ['Links umgehen!', 'Umgehen!', 'Zweite Gruppe, rechts rum!'],
    rally: ['Zu mir!', 'Sammeln!', 'Mir nach!'],
    bail: ['Aussteigen, raus!', 'Wir brennen, raus!', 'Raus, raus, raus!'],
    officer: ['Der Leutnant ist gefallen!', 'Leutnant getroffen!', 'Wer führt jetzt?!'],
  },
};

/** Which lines an army shouts (its language), whatever side it is on. */
// the Imperial Japanese Navy's ships (Japanese, in transliteration)
LINES.ja = {
  straddle: ['Kyōsa!', 'Kyori yoshi!', 'Meichū!', 'Utechi-kata, tsuzuke!'],
  shipHit: ['Hidan!', 'Kanpan ni hidan!', 'Kasai hassei!', 'Kōbu ni meichū!'],
  shipBad: ['Shinsui!', 'Keisha shite iru!', 'Haisui isoge!', 'Ōkyū shūri!'],
  shipContact: ['Teki-kan miyu!', 'Teki kantai hakken!', 'Kokuen miyu!'],
};
// 1806: the Grande Armée and the French Navy in French; Prussia, Saxony and Bavaria in German; the Royal Navy
// in the English of its day (only what it has lines for of its own: the rest as the English lines)
LINES.fr = {
  contact: ["L'ennemi!", 'En face!', 'Les voilà!', 'Attention, devant!'],
  cover: ['À terre!', 'Serrez les rangs!', 'Tenez bon!'],
  reload: ['Chargez!', 'Chargez vos armes!', 'Rechargez!'],
  hit: ['Je suis touché!', 'Aïe!', "Ce n'est rien!"],
  wounded: ['Je suis blessé!', 'Au secours!', 'Ma jambe!'],
  down: ['Un homme à terre!', 'Il est tombé!', 'Serrez les rangs!'],
  pinned: ['Nous sommes cloués!', 'Le feu est trop vif!'],
  retreat: ['En retraite!', 'Repliez-vous!', 'Sauve qui peut!'],
  flank: ['Par le flanc!', 'Tournez-les!', 'Par la gauche!'],
  rally: ['À moi!', 'Ralliez-vous!', 'Au drapeau!'],
  officer: ['Le capitaine est tombé!', "L'officier est touché!", 'Qui commande?'],
  straddle: ['Bien pointé!', 'Tirez à démâter!', 'Feu à volonté!', 'Encore une bordée!'],
  shipHit: ['Touché!', 'Un boulet dans la batterie!', 'Le feu à bord!', 'Le gréement est coupé!'],
  shipBad: ["Une voie d'eau!", 'Aux pompes!', 'Le grand mât tombe!', 'Nous coulons bas!'],
  shipContact: ['Voile en vue!', "L'ennemi au vent!", 'Navires anglais!', 'Branle-bas de combat!'],
};
LINES.rn = {
  straddle: ['Fire as she bears!', 'Well laid, lads!', 'Another broadside!', 'Double-shot the guns!'],
  shipHit: ['We\'re hulled!', 'Shot through the lower deck!', 'Fire in the waist!', 'The rigging\'s cut to pieces!'],
  shipBad: ['Man the pumps!', 'Six feet of water in the well!', 'The mainmast\'s going!', 'She\'s settling, sir!'],
  shipContact: ['Sail ho!', 'Enemy fleet in sight!', 'Beat to quarters!', 'Frenchmen, sir — to leeward!'],
};
// the British army of 1801 (Aboukir): the redcoats' English of the day, ashore; at sea its boats speak the Navy's
LINES.gb = {
  ...LINES.rn,
  contact: ['Frenchmen ahead!', 'There they are, lads!', 'Enemy on the sand hills!', 'Here they come!'],
  cover: ['Down, lads!', 'Steady!', 'Close up!', 'Hold your ground!'],
  reload: ['Load!', 'Handle cartridge!', 'Prime and load!', 'Ram down cartridge!'],
  hit: ['I\'m hit!', 'Ah — damn them!', 'It\'s nothing, sir!'],
  wounded: ['I\'m hit bad!', 'Surgeon!', 'My leg — help me!'],
  down: ['Man down!', 'He\'s gone, poor devil!', 'Close the ranks!'],
  pinned: ['Too hot, sir!', 'Keep your heads down!', 'We can\'t get on!'],
  retreat: ['Fall back!', 'Retire, lads!', 'Back to the boats!'],
  flank: ['Round their flank!', 'Wheel left!', 'Light company, forward!'],
  rally: ['On me!', 'Rally on the colours!', 'Form on me!'],
  officer: ['The captain\'s down!', 'The colonel\'s hit!', 'Who commands?'],
  landing: ['Over the side, lads!', 'Keep your powder dry!', 'Up the beach!', 'Form on the sand!', 'Fix bayonets!', 'At them!'],
};
LINES.fr.boats = ['Les chaloupes!', 'Feu sur les barques!', 'Ils débarquent!', 'Aux armes — les Anglais!', 'Mitraille sur la plage!']; // (Aboukir: the boats coming in)

// the British infantry of 1918: the Tommies' own words (the 1918 Germans shout the German lines, the French the French)
// 1918 at sea: the Royal Navy's English of the Grand Fleet, the Kaiserliche Marine's German
LINES.rn18 = {
  straddle: ['Straddle!', 'Spotting top reports a straddle!', 'Hitting now — rapid salvoes!', 'Down two hundred, fire!'],
  shipHit: ['We\'re hit!', 'Shell aboard aft!', 'Hit on Q turret!', 'Fire in the battery!', 'Flood the magazine!'],
  shipBad: ['She\'s taking water forward!', 'We\'re listing, sir!', 'Pumps can\'t hold it!', 'Clear lower deck — all hands to the pumps!'],
  shipContact: ['Enemy in sight!', 'Smoke on the horizon, sir!', 'Enemy battlecruisers bearing east!', 'Zeppelin, fine on the bow!'],
};
LINES.km = {
  straddle: ['Deckend!', 'Gabel — Salve gut!', 'Wirkung! Schnellfeuer!', 'Zwei hundert ab, Feuer!'],
  shipHit: ['Treffer!', 'Treffer achtern!', 'Treffer in der Kasematte!', 'Feuer im Turm!', 'Munitionskammer fluten!'],
  shipBad: ['Wassereinbruch vorn!', 'Das Schiff krängt!', 'Die Pumpen schaffen es nicht!', 'Alle Mann an die Lenzpumpen!'],
  shipContact: ['Feind in Sicht!', 'Rauchwolken am Horizont!', 'Feindliche Schlachtkreuzer, Backbord voraus!', 'Unterseeboot, Steuerbord!'],
};
LINES.uk18 = {
  contact: ['Jerry! Over there!', 'Enemy front!', 'Huns in the wood!', 'Here they come!', 'Movement by the wire!'],
  cover: ['Get down!', 'Into the shell hole!', 'Keep your heads down!', 'Down in the trench!'],
  reload: ['Reloading!', 'Charger in!', 'Load!', 'Five rounds!'],
  hit: ["I'm hit!", 'Ah — bloody hell!', "It's a Blighty one!", "I'm all right, I'm all right!"],
  wounded: ['Stretcher bearer!', "I'm hit bad!", 'Stretcher bearers!', 'Me leg!'],
  down: ['Man down!', "He's gone west!", 'Stretcher bearer!', 'Poor sod!'],
  pinned: ["We can't get on!", 'Too hot, sarge!', 'Keep your heads down!', "Machine gun — we're pinned!"],
  retreat: ['Fall back!', 'Back to the trench!', 'Get back, lads!'],
  flank: ['Bombers, round the left!', 'Lewis gun, cover us!', 'Work round them!'],
  rally: ['On me!', 'Rally on me, lads!', 'Form on me!'],
  bail: ["Get out, she's burning!", 'Out, out!', 'Bale out!'],
  officer: ["The officer's down!", "Mister Thompson's hit!", "Who's in charge?", "Sarge, you're in command!"],
  landing: ['Over the top!', 'Come on, lads!', 'Follow me!', 'Keep up with the barrage!'],
};

// the German of 1806: Prussian, Saxon and Bavarian line infantry, horse and gunners (the drill words of the day)
LINES.de1806 = {
  contact: ['Der Feind!', 'Feind voraus!', 'Da kommen sie!', 'Achtung, Franzosen!'],
  cover: ['Nieder!', 'Haltet aus!', 'Schließt die Reihen!'],
  reload: ['Ladet!', 'Laden — Patron!', 'Ladestock!', 'Fertig machen!'],
  hit: ['Getroffen!', 'Au!', 'Es ist nichts!'],
  wounded: ['Ich bin verwundet!', 'Helft mir!', 'Mein Bein!'],
  down: ['Der ist gefallen!', 'Einer liegt!', 'Schließt die Lücke!'],
  pinned: ['Das Feuer ist zu stark!', 'Wir kommen nicht durch!'],
  retreat: ['Zurück!', 'Rückzug!', 'Rette sich, wer kann!'],
  flank: ['Links schwenkt!', 'In die Flanke!', 'Rechts um!'],
  rally: ['Zu mir!', 'Sammeln!', 'Zur Fahne!'],
  officer: ['Der Hauptmann ist gefallen!', 'Der Offizier ist getroffen!', 'Wer führt?'],
};
// Zeebrugge's storming parties (stats.raid: the Royal Marines and the bluejackets): the raid's own, the rest as the 1918 British
LINES.raid18 = {
  ...LINES.uk18,
  landing: ['Over the brows!', 'On to the Mole, lads!', 'Get those guns!', 'Follow me — St George for England!', 'Down the ladders — go!'],
  contact: ['Germans on the Mole!', 'Machine gun at the wire!', 'The battery — rush it!', 'Destroyer alongside the Mole!', 'They\'re in the sheds!'],
  flank: ['Along the parapet!', 'Lewis gun, cover the wire!', 'Round by the sheds!', 'Bomb them out!'],
  retreat: ['Back to the ship!', 'Fall back on Vindictive!', 'Back to the brows!'],
};
// 2027 (data/epoch.js): today's US soldiers, the Poles in Polish, Russians and Belarusians in Russian —
// and the new cry of every front, the drone overhead (`drone`: systems/Drones.js)
LINES.us27 = {
  ...LINES.nato,
  contact: ['Contact front!', 'Enemy dismounts!', 'Movement, treeline, eleven o\'clock!', 'Contact! Contact!', 'Got thermals on them!'],
  drone: ['Drone! Drone overhead!', 'FPV inbound!', 'Drone, get in cover!', 'Shoot it down!', 'Lancet! Scatter!'],
  wounded: ['I\'m hit bad!', 'Medic!', 'Doc! Doc!', 'Can\'t feel my leg!'],
};
LINES.pl = {
  contact: ['Kontakt!', 'Wróg z przodu!', 'Ruch, godzina jedenasta!', 'Kontakt! Kontakt!'],
  cover: ['Kryj się!', 'Do ukrycia!', 'Padnij!', 'Za mur!'],
  reload: ['Przeładowuję!', 'Osłaniaj!', 'Pusty magazynek!'],
  hit: ['Dostałem!', 'Cholera!', 'Nic mi nie jest!'],
  wounded: ['Sanitariusz!', 'Jestem ranny!', 'Pomocy!', 'Moja noga!'],
  down: ['Ranny! Ranny!', 'Mamy rannego!', 'Sanitariusz!', 'Nie żyje!'],
  pinned: ['Przygwoździli nas!', 'Głowy w dół!', 'Za duży ogień!'],
  retreat: ['Odwrót!', 'Wycofać się!', 'Do tyłu!'],
  flank: ['Obchodzimy z lewej!', 'Oskrzydlić ich!', 'Druga drużyna, w prawo!'],
  rally: ['Do mnie!', 'Zbiórka!', 'Za mną!'],
  bail: ['Opuścić wóz!', 'Trafieni, wychodzić!', 'Wychodzić, wychodzić!'],
  officer: ['Porucznik ranny!', 'Dowódca nie żyje!', 'Kto dowodzi?!'],
  drone: ['Dron! Dron nad nami!', 'FPV leci!', 'Dron, kryć się!', 'Zestrzelić go!'],
  landing: ['Rampa w dół!', 'Naprzód, naprzód!', 'Z łodzi, ruszać się!', 'Za mną!'],
};
LINES.ru27 = {
  ...LINES.pact,
  contact: ['Protivnik!', 'Vizhu vraga!', 'Kontakt!', 'Dvizheniye v posadke!', 'Teplak vidit ikh!'],
  drone: ['Dron! Dron nad nami!', 'FPV-shka letit!', 'Vozdukh! Vozdukh!', 'Ptichka! V ukrytiye!', 'Sbey yego!'],
};
const LANG27 = { us: 'us27', pl: 'pl', ru: 'ru27', by: 'ru27' };
const LANG = { us: 'nato', sov: 'pact', bw: 'de', nva: 'de', wh: 'de', fj: 'de', ijn: 'ja', fr: 'fr', frn: 'fr', by: 'de1806', pr: 'de1806', sx: 'de1806', rn: 'rn', gb: 'gb', uk: 'uk18', de: 'de', st: 'de', rn18: 'rn18', km: 'km', raid18: 'raid18' }; // (1918: the British their own; the German Army and the Sturmtruppen German)

/** A random line for this army (else faction) and situation, or null. */
export function barkLine(faction, kind, army = null) {
  const lang = (epoch() === '2027' ? LANG27[army] : null) ?? LANG[army] ?? faction;
  const list = LINES[lang]?.[kind] ?? (lang === 'ja' || lang === 'fr' || lang === 'de' || lang === 'de1806' || lang === 'gb' || lang === 'uk18' || lang === 'km' || lang === 'raid18' || lang === 'pl' ? null : LINES.nato[kind]); // (the Japanese, the French and the Germans say only what they have lines for: no English)
  return list ? list[Math.floor(Math.random() * list.length)] : null;
}
