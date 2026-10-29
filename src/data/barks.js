// Callouts soldiers shout, by faction and situation. Add a faction or a situation here;
// UnitStack.bark(unit, kind) picks a random line.
// Shown as floating text above the soldier (ui/Barks.js); the Pact's lines are Russian in
// transliteration. There is no speech.
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
  },
};

/** A random line for this faction and situation, or null. */
export function barkLine(faction, kind) {
  const list = LINES[faction]?.[kind] ?? LINES.nato[kind];
  return list ? list[Math.floor(Math.random() * list.length)] : null;
}
