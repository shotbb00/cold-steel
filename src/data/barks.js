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
const LANG = { us: 'nato', sov: 'pact', bw: 'de', nva: 'de', wh: 'de', fj: 'de', ijn: 'ja' };

/** A random line for this army (else faction) and situation, or null. */
export function barkLine(faction, kind, army = null) {
  const lang = LANG[army] ?? faction;
  const list = LINES[lang]?.[kind] ?? (lang === 'ja' ? null : LINES.nato[kind]); // (the Japanese crews say only what they have lines for: no English)
  return list ? list[Math.floor(Math.random() * list.length)] : null;
}
