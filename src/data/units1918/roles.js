// The other fronts' missing roles (called once from ./index.js with TYPES_1918, after ./fronts.js): what the
// Ottomans, ANZACs, Italians, Austro-Hungarians and Russians lacked or borrowed —
//   ot     its own AA lorry (was the German K-Flak's model)
//   anzac  its engineers' own man (was a British soldier), an AA Ford of the light car patrols; its ships: the
//          Royal Navy's (data/epoch.js navyOf), so at Gallipoli it buys the squadron the map lists
//   it     anti-tank: rifle grenades
//   ah     the Škoda 8 cm M.5/8 AA lorry, the Romfell's own model, anti-tank: the 3.7 cm Infanteriegeschütz M.15
//   ru     anti-tank: the 37 mm Rosenberg trench gun; counter-battery: a sound-ranging station
// …and the Lanes mode's forts (bunker, strongpoint, hq: data/units/fortifications.ts, shared with 1985) as 1918
// copies, every 1918 army its own (models/lanesForts1918.js) — the 1985 turret bunkers stay 1985's.
import { buildWw1Soldier } from '../models/ww1Soldier.js';
import { buildAALorryOT, buildAALorryAH, buildFordAA, buildRomfellAC } from '../models/ww1Armour.js';
import { lanesFortModels1918 } from '../models/lanesForts1918.js';

/** Give type `t` to `army` (its own stats only: nothing inherited from its side's entry). */
const give = (t, army, { variant, model, special, stats }) => {
  if (model) t.models = { ...t.models, [army]: model };
  if (special) t.specialistModels = { ...t.specialistModels, [army]: special };
  if (stats) t.factionStats = { ...t.factionStats, [army]: stats };
  if (variant) t.variants = { ...t.variants, [army]: variant };
};

/** [bunker, strongpoint, hq] words for each army's forts. */
const FORTS = {
  uk: [['Bunker line', 'A Vickers in a sandbagged post and an 18-pounder in a dugout roofed with elephant iron and earth, wire in front.'], ['Strongpoint', 'Sandbag and timber dugouts in the support line: Vickers at the slits, two 18-pounders laid along the approach.'], ['Brigade headquarters', 'The brigade\'s dugout under elephant iron and earth, the telephone lines running back from the pole, the Union Flag.']],
  anzac: [['Bunker line', 'A Vickers in a sandbagged sangar and an 18-pounder dug in under iron and sand, wire in front.'], ['Strongpoint', 'Sandbag dugouts dug into the ridge: Vickers at the slits, two 18-pounders.'], ['Brigade headquarters', 'The brigade\'s dugout, a bivvy sheet off its side, the telephone pole and the Australian blue ensign.']],
  fr: [['Bunker line', 'A Hotchkiss in a sandbagged post and a 75 in a timbered abri, wire in front.'], ['Strongpoint', 'Timbered dugouts under earth: Hotchkiss guns at the slits, two 75s laid on the approach.'], ['Poste de commandement', 'The colonel\'s abri under logs and earth, an Adrian hut beside it, the telephone pole and the tricolour.']],
  de: [['Bunker line', 'An MG 08 in a concrete MG post — a "Mebu" — and a 7.7 cm in a concrete casemate, wire in front.'], ['Stützpunkt', 'Concrete casemates in the Hindenburg Line\'s manner: MG 08s at the slits, two 7.7 cm guns.'], ['Regimental headquarters', 'The concrete entrances of a deep Stollen, two stairways down into the chalk, the telephone pole and the black-white-red.']],
  ah: [['Bunker line', 'A Schwarzlose behind a breastwork of Karst limestone and an 8 cm gun in a stone-faced dugout, wire in front.'], ['Stützpunkt', 'Stone and timber dugouts blasted into the rock: Schwarzlose at the slits, two 8 cm guns.'], ['Brigade headquarters', 'A cavern cut into the mountain behind a dressed-stone portal, the telephone pole and the black and yellow.']],
  ot: [['Bunker line', 'An MG 08 behind a sangar of stacked stone and a 7.5 cm Krupp in a stone-faced dugout, wire in front.'], ['Redoubt', 'Stone-faced dugouts of the Gaza–Beersheba line: machine guns at the slits, two Krupp guns.'], ['Division headquarters', 'A stone redoubt house, thick walls and a roof of beams and earth, loopholes all round, the red flag with the crescent and star.']],
  ru: [['Bunker line', 'A Maxim on its Sokolov mount in a ring of logs and a 3-inch gun in a log-and-earth dugout, wire in front.'], ['Strongpoint', 'Log-and-earth dugouts behind an earth parapet: Maxims at the slits, two 3-inch guns.'], ['Regimental headquarters', 'The staff\'s zemlyanka under logs and earth, the stovepipe through the roof, the telephone pole and the white-blue-red.']],
  it: [['Bunker line', 'A Fiat-Revelli behind a breastwork of Carso limestone and a 75/27 in a stone-faced dugout roofed with iron, wire in front.'], ['Caposaldo', 'Stone and sandbag dugouts on the Carso: Fiat-Revelli at the slits, two 75/27s.'], ['Comando di brigata', 'A stone-faced shelter under iron and sandbags, the telephone pole and the tricolour with the Savoy shield.']],
};

export default function roles(T) {
  const { rifles, atTeam, cbRadar, engineers, aa, reconVehicle } = T;

  // ---------------------------------------------------------------- the Ottomans: their own AA
  give(aa, 'ot', { model: buildAALorryOT, variant: { name: 'Uçaksavar Topu', weapon: '7.5 cm Krupp on a pivot, on a lorry', text: 'A Krupp field gun bolted to a pivot on a lorry\'s bed, sandbags round it, laid at the sky: the Ottoman gunners\' answer to the British aircraft over the Gaza line.' } });

  // ---------------------------------------------------------------- the ANZACs: their engineers' own man, an AA Ford
  give(engineers, 'anzac', { special: () => buildWw1Soldier({ army: 'anzac' }) });
  give(aa, 'anzac', { model: buildFordAA,
    stats: { weaponSound: 'mg', hp: 200, armor: 0.02, speed: 8, antiAir: { range: 220, optical: 1, rate: 8, burst: 2, pause: 1, hitNear: 0.07, hitFar: 0.015 } }, // (two Lewis guns: a stream of bullets, not shrapnel)
    variant: { name: 'AA Light Car', weapon: 'two Lewis guns on a high post, Ford Model T', text: 'The AIF had no anti-aircraft guns of its own: the light car patrols put two Lewis guns on a tall post in a Model T and kept the German two-seaters high over the desert. Fast, no armour.' } });

  // ---------------------------------------------------------------- anti-tank: Italy's rifle grenades, the k.u.k. and Russian infantry guns
  const RESET = Object.fromEntries(Object.keys(atTeam.factionStats.pact).map((k) => [k, atTeam.stats[k]])); // (the side's Tankgewehr numbers back to the grenade's)
  const IG = { weapon: 'rifle', weaponSound: 'cannon', damage: 210, range: 130, splash: 1.5, vsArmor: 0.9, pierce: 0.4, boltSpeed: 320, boltSize: 0.8, magSize: 1, fireCooldown: 4, reloadTime: 4 };
  give(atTeam, 'it', { stats: RESET, variant: { name: 'Granatieri a fucile', weapon: 'Carcano with rifle grenades', text: 'Rifle grenades fired from a cup on the Carcano: a light bomb into a machine-gun post a hundred metres off. Against armour only at the weak spots.' } });
  give(atTeam, 'ah', { stats: { ...RESET, ...IG }, variant: { name: 'Infanteriegeschütz', weapon: 'Škoda 3.7 cm Infanteriegeschütz M.15', text: 'Škoda\'s little infantry gun, manhandled into the front line: a 37 mm shell straight into a loophole or an armoured car\'s side. It goes where the battalion goes.' } });
  give(atTeam, 'ru', { stats: IG, variant: { name: '37 mm Trench Gun', weapon: '37 mm Rosenberg trench gun M1915', text: 'Rosenberg\'s trench gun of 1915: a short 37 mm barrel on a wooden frame, light enough for its crew to drag — the battalion\'s own gun against machine-gun nests, and against armour if it ever came.' } });
  atTeam.specialist = { ...atTeam.specialist, armyStats: { ...atTeam.specialist.armyStats, ...Object.fromEntries(['it', 'ah', 'ru'].map((a) => [a, { ...rifles.factionStats[a], lightAT: 0, grenades: 0 }])) } };

  // ---------------------------------------------------------------- Russia: sound ranging
  give(cbRadar, 'ru', { variant: { name: 'Sound-Ranging Station', weapon: 'microphones, plotting board (French-supplied)', text: 'The sound-ranging stations raised in 1916–17 on the French model: microphones time the bang of each enemy gun, and the plot puts your guns on it. Needs 25 s to lay out.' } });

  // ---------------------------------------------------------------- Austria-Hungary: the Škoda AA gun, the Romfell's own model
  give(aa, 'ah', { model: buildAALorryAH, variant: { name: '8 cm Luftfahrzeugabwehrkanone M.5/8', weapon: 'Škoda 8 cm M.5/8 on a lorry', text: 'The 8 cm field gun on Škoda\'s high anti-aircraft pedestal, carried on a lorry to wherever the Italian Capronis come over; outriggers steady it to fire.' } });
  give(reconVehicle, 'ah', { model: buildRomfellAC });

  // ---------------------------------------------------------------- the Lanes mode's forts: 1918 copies, every army its own
  const copy = (t) => ({ ...t, models: { ...t.models }, specialistModels: { ...t.specialistModels }, variants: { ...t.variants } });
  const b = copy(T.bunker), s = copy(T.strongpoint), h = copy(T.hq);
  const KEY = { uk: ['uk', 'nato'], anzac: ['anzac'], fr: ['fr'], de: ['de', 'st', 'pact'], ah: ['ah'], ot: ['ot'], ru: ['ru'], it: ['it'] }; // (the side keys: the British and German art, for any army without its own)
  for (const [style, words] of Object.entries(FORTS)) {
    const m = lanesFortModels1918(style);
    const [vb, vs, vh] = words.map(([name, text]) => ({ name, text }));
    for (const a of KEY[style]) {
      give(b, a, { model: m.nest, special: m.gunDugout, variant: vb });
      give(s, a, { model: m.mgDugout, special: m.bigGunDugout, variant: vs });
      give(h, a, { model: m.gunDugout, special: m.command, variant: vh });
    }
  }
  T.bunker = b; T.strongpoint = s; T.hq = h;
}
