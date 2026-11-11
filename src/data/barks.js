// Callouts soldiers shout, by language and situation, the language by army (LANG: the Bundeswehr,
// NVA, Wehrmacht and Fallschirmjäger shout German, the Soviets Russian — on whichever side they
// fight), else by side. UnitStack.bark(unit, kind) picks a random line.
// Shown as floating text above the soldier (ui/Barks.js); Russian in transliteration. There is no speech.
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
    // the Soviet Navy's ships (1985 at sea)
    shipHit: ['Popadaniye!', 'Pozhar v nadstroyke!', 'Popadaniye v kormu!', 'Avariynaya partiya — v nos!'],
    shipBad: ["Postupayet voda!", "Kren na bort!", "Vse na bor'bu za zhivuchest'!", "Ne uderzhim!"],
    shipContact: ["Tsel' obnaruzhena!", "Kontakt na radare!", "Korabli protivnika, peleng dva-sem'-nol'!"],
    straddle: ["Nakrytiye!", "Est' popadaniye!", "Tak derzhat'!"],
  },
  de: {
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
const LANG = { us: 'nato', sov: 'pact', bw: 'de', nva: 'de', wh: 'de', fj: 'de', ijn: 'ja', fr: 'fr', frn: 'fr', by: 'de1806', pr: 'de1806', sx: 'de1806', rn: 'rn' };

/** A random line for this army (else faction) and situation, or null. */
export function barkLine(faction, kind, army = null) {
  const lang = LANG[army] ?? faction;
  const list = LINES[lang]?.[kind] ?? (lang === 'ja' || lang === 'fr' || lang === 'de' || lang === 'de1806' ? null : LINES.nato[kind]); // (the Japanese, the French and the Germans say only what they have lines for: no English)
  return list ? list[Math.floor(Math.random() * list.length)] : null;
}
