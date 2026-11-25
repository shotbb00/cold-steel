// The Atlantic Wall, 1944 (the coastal maps: placed by the map, modes/landing.js; never bought). Fixed
// fortifications like data/units/fortifications.ts (structure: never move, never break, always known),
// at the ranges of a beach and its bluffs:
//   wn       a Widerstandsnest: an 88 in a flanking casemate (its embrasure along the beach: craft, tanks,
//            men) and two Tobruk MG pits (the MG 42's long bursts: men pinned on the sand)
//   battery  a coastal battery: two 155 mm guns in casemates inland — ships only (`shipsOnly`): the
//            destroyers have to find and silence it

import { buildCasemate, buildTobruk } from '../models/atlanticWall.js';
import { buildBritPillbox, buildBritType28, buildBritBattery, buildUsPillbox, buildUsGunCasemate, buildUsBattery, buildJpPillbox, buildJpBlockhouse, buildJpCaveGun, buildJpCommandPost } from '../models/coastForts45.js';
import { lanesFortModels45, buildGermanCommandBunker } from '../models/lanesForts45.js';

const FIXED = { structure: true, concealed: true, stealth: 0.55, /* (dug in and camouflaged: found by eye, or by its fire — then it stays marked) */ speed: 0, turnRate: 0, fov: 6.3, eyeHeight: 2.2, aggroRange: 0, preferredRange: 0, leash: 0, breakMorale: 0, stance: 'stand' };

const TOBRUK = {
  ...FIXED, hp: 1000, armor: 0.62, radius: 2.3, height: 1.4, aimHeight: 0.9, sight: 600, flanking: true, // (no MG at a destroyer)
  range: 380, weapon: 'rifle', weaponSound: 'mg', turretRate: 1.8, fireCooldown: 0.1, magSize: 50, reloadTime: 5, // (the MG 42: a long ripping burst, then the barrel change)
  damage: 32, boltSpeed: 700, boltSize: 0.7, tracer: 0.3, spread: 0.034, suppressPower: 2.6, vsArmor: 0.03, pierce: 0,
};
const EIGHTY_EIGHT = {
  ...FIXED, hp: 2400, armor: 0.78, radius: 4, height: 3.4, aimHeight: 1.5, sight: 1000, flanking: true,
  range: 900, weapon: 'cannon', weaponSound: 'cannon', turretRate: 0.5, fireCooldown: 8, magSize: 60, reloadTime: 8,
  damage: 380, splash: 3, pierce: 0.6, boltSpeed: 800, boltSize: 1.6, tracer: 1, spread: 0.004, antiArmor: true, vsArmor: 1,
};
const ONE_FIVE_FIVE = {
  ...FIXED, hp: 4200, armor: 0.88, radius: 6, height: 5, aimHeight: 2.5, sight: 1800, shipsOnly: true,
  range: 1500, weapon: 'cannon', weaponSound: 'navalHeavy', turretRate: 0.25, fireCooldown: 28, magSize: 60, reloadTime: 28, // (slow and none too accurate against a ship under way: a few minutes to sink a destroyer that stays in reach)
  damage: 600, splash: 8, pierce: 0.5, boltSpeed: 600, boltSize: 2.4, tracer: 0, spread: 0.02, antiArmor: true, vsArmor: 1,
};

export const wn = {
  id: 'wn', name: 'Widerstandsnest', shortName: 'WN', kind: 'vehicle', hidden: true, cost: 700,
  formation: { count: 3, columns: 3, spacing: 14 },
  stats: TOBRUK,
  specialist: { count: 1, stats: EIGHTY_EIGHT },
  models: { nato: buildTobruk(), pact: buildTobruk() },
  specialistModels: { nato: buildCasemate(1, 5.2, 0.7)(), pact: buildCasemate(1, 5.2, 0.7)() },
  weaponSound: 'mg',
  variants: {
    nato: { name: 'Strongpoint', weapon: '88 mm in a casemate, 2 MGs', text: 'A gun casemate and two MG pits.' },
    jp: { name: 'Pillbox complex', weapon: '47 mm anti-tank gun in a blockhouse, 2 × Type 92 MGs in pillboxes', text: 'Reinforced concrete under volcanic ash, only the embrasures showing: the 47 mm fires along the terraces at tanks and amtracs, the MGs sweep the sand. Flame and demolition charges, or a tank point-blank, are what finishes them.' },
    pact: { name: 'Widerstandsnest', weapon: '8.8 cm PaK 43 in an H677 casemate, 2 × MG 42 in Tobruks', text: 'A resistance nest of the Atlantic Wall: the 88 in its casemate fires along the beach, not out to sea, so the ships can\'t see into it; the MG 42s in their Tobruks sweep the sand. Concrete: tank guns, the destroyers\' 5-inch and the engineers\' charges bring it down.' },
  },
};

export const battery = {
  id: 'battery', name: 'Coastal Battery', shortName: 'Battery', kind: 'vehicle', hidden: true, cost: 900,
  formation: { count: 2, columns: 2, spacing: 26 },
  stats: ONE_FIVE_FIVE,
  models: { nato: buildCasemate(1.5, 8, 1.2)(), pact: buildCasemate(1.5, 8, 1.2)() },
  weaponSound: 'navalHeavy',
  variants: {
    nato: { name: 'Coastal battery', weapon: '2 × 155 mm', text: 'Heavy guns in casemates, laid on the sea.' },
    jp: { name: 'Coast defence guns', weapon: '2 × 12 cm naval guns in casemates', text: 'Naval guns dug into the rock of Suribachi and the plateau, laid on the sea: they fire on the ships and the landing craft. Find them and silence them, or the boats will burn on the way in.' },
    pact: { name: 'Küstenbatterie', weapon: '2 × 15.5 cm K 418(f) in casemates', text: 'The coastal battery inland: two heavy guns that fire on ships only — the destroyers and the landing craft out at sea. Find it and silence it, or the boats will burn on the way in.' },
  },
};

// …and the beaches the Allies and Japan hold get their own forts (models/coastForts45.js): the British (Hythe, Bône,
// Abu Qir) Type 24 and Type 28 pillboxes and a 6-inch battery, the US (Bône, Haleiwa) Oahu's pillboxes and a 155 mm
// GPF on its Panama mount, Japan log-and-coral pillboxes, a 47 mm blockhouse and cave guns. Same stats: only the art and words differ.
const own = (t, army, { model, special, variant }) => {
  t.models[army] = model;
  if (special) t.specialistModels[army] = special;
  t.variants[army] = variant;
};
const BRIT_WN = { name: 'Pillbox group', weapon: '2-pdr in a Type 28 pillbox, 2 × Bren in Type 24 pillboxes', text: 'The stop line on the beach: hexagonal Type 24 pillboxes, a Bren in every loophole, and a Type 28 with a 2-pounder laid along the sand at the tanks. Concrete: tank guns, the ships\' guns and the engineers\' charges bring them down.' };
const BRIT_BATTERY = { name: 'Coast battery', weapon: '2 × BL 6-inch Mk VII', text: 'The Coast Artillery\'s 6-inch guns on their pivots, in open emplacements under a thick concrete canopy against air attack: they fire on ships only — the destroyers and the landing craft out at sea. Find them and silence them, or the boats will burn on the way in.' };
const US_WN = { name: 'Beach pillboxes', weapon: '37 mm M3 in a casemate, 2 × Browning M1919 in pillboxes', text: 'The beach defences built after Pearl Harbor: low concrete pillboxes faced with lava rock, Brownings sweeping the sand through their slits, and a 37 mm anti-tank gun in a casemate laid along the beach. Tank guns, the ships\' guns and the engineers\' charges bring them down.' };
const US_BATTERY = { name: '155 mm battery', weapon: '2 × 155 mm GPF on Panama mounts', text: 'The Coast Artillery\'s 155s on Panama mounts — a concrete pivot and a steel rail round it for the trails, so the gun swings to follow a ship. Ships only: find them and silence them, or the boats will burn on the way in.' };
for (const a of ['brit', 'brit21', 'brit14']) {
  own(wn, a, { model: buildBritPillbox, special: buildBritType28, variant: BRIT_WN });
  own(battery, a, { model: buildBritBattery, variant: BRIT_BATTERY });
}
for (const a of ['us', 'usmc']) {
  own(wn, a, { model: buildUsPillbox, special: buildUsGunCasemate, variant: US_WN });
  own(battery, a, { model: buildUsBattery, variant: US_BATTERY });
}
own(wn, 'jp', { model: buildJpPillbox, special: buildJpBlockhouse, variant: wn.variants.jp });
own(battery, 'jp', { model: buildJpCaveGun, variant: battery.variants.jp });

const US_LANES = [
  ['Bunker line', 'Two Browning .30s in sandbagged nests and a 57 mm anti-tank gun dug in under logs and earth.'],
  ['Strongpoint', 'Log-and-earth bunkers dug deep: Brownings behind the slits, two 57 mm guns laid on the road.'],
  ['Regimental command post', 'A sandbagged dugout, the wall tent and the radio mast under the Stars and Stripes, ringed by 57 mm guns in log bunkers.'],
];
const LANES_45 = {
  us: US_LANES,
  usmc: US_LANES,
  brit: [
    ['Sangar line', 'Brens in sangars of stacked stone — the rock is too hard to dig — and a 6-pounder under corrugated iron and sandbags.'],
    ['Box', 'A defended box: stone-and-sandbag dugouts, Brens at the slits, two 6-pounders laid along the track.'],
    ['Brigade headquarters', 'A stone sangar under a canvas lean-to, the wireless mast and the Union Flag, the 6-pounders round it.'],
  ],
  brit21: [
    ['Bunker line', 'Bren pits ringed with sandbags and a 6-pounder in an earth-and-timber dugout.'],
    ['Strongpoint', 'Earth-and-timber dugouts in the hedgerow banks: Brens at the slits, two 6-pounders.'],
    ['Brigade headquarters', 'Dugouts of earth and timber under a camouflage net, the wireless mast, the Union Flag, the 6-pounders round it.'],
  ],
  brit14: [
    ['Bunker line', 'Brens behind rings of logs and a 6-pounder in a log bunker roofed with earth, the jungle growing over it.'],
    ['Box', 'Log bunkers dug into the ridge: Brens at the slits, two 6-pounders.'],
    ['Brigade headquarters', 'A log bunker and a thatched basha, the wireless mast and the Union Flag, the 6-pounders in bunkers round it.'],
  ],
  sov: [
    ['DZOT line', 'A Maxim in a DZOT and a 45 mm gun in another — log-and-earth bunkers, only the slits showing.'],
    ['Strongpoint', 'A trench line: Maxims in log-revetted nests behind an earth parapet, two 45 mm guns in DOTs.'],
    ['Regimental headquarters', 'The command zemlyanka under logs and earth, the radio mast and the red banner, the 45 mm guns in DZOTs round it.'],
  ],
};

/** The Lanes mode's fortifications (data/units/fortifications.ts, shared with 1985) for 1945: copies, every 1945 army its own on top. */
export function lanesForts45({ bunker, strongpoint, hq }) {
  const copy = (t) => ({ ...t, models: { ...t.models }, specialistModels: { ...t.specialistModels }, variants: { ...t.variants } });
  const b = copy(bunker), s = copy(strongpoint), h = copy(hq);
  own(b, 'jp', { model: buildJpPillbox, special: buildJpBlockhouse, variant: { name: 'Bunker line', text: 'A 47 mm gun in a log-and-concrete blockhouse and two MG pillboxes of coconut logs and coral, earth over them: only the slits show.' } });
  own(s, 'jp', { model: buildJpPillbox, special: buildJpBlockhouse, variant: { name: 'Strongpoint', text: 'Two 47 mm blockhouses and two log pillboxes, dug deeper and covered thicker.' } });
  own(h, 'jp', { model: buildJpBlockhouse, special: buildJpCommandPost, variant: { name: 'Battalion headquarters', text: 'The command dugout under logs and earth, ringed by 47 mm blockhouses.' } });
  // every other army its own (models/lanesForts45.js): [bunker, strongpoint, hq] words
  for (const [a, words] of Object.entries(LANES_45)) {
    const m = lanesFortModels45(a === 'usmc' ? 'us' : a);
    const [vb, vs, vh] = words.map(([name, text]) => ({ name, text }));
    if (a === 'sov') { // (the DZOT line in front, the trench strongpoint behind)
      own(b, a, { model: m.mgDugout, special: m.gunDugout, variant: vb });
      own(s, a, { model: m.nest, special: m.bigGunDugout, variant: vs });
    } else {
      own(b, a, { model: m.nest, special: m.gunDugout, variant: vb });
      own(s, a, { model: m.mgDugout, special: m.bigGunDugout, variant: vs });
    }
    own(h, a, { model: m.gunDugout, special: m.command, variant: vh });
  }
  const pak = buildCasemate(0.75, 4.5, 0.7)(), tobruk = buildTobruk();
  for (const a of ['wh', 'fj']) {
    own(b, a, { model: tobruk, special: pak, variant: { name: 'Bunker line', text: 'An 8.8 cm PaK 43 in a concrete casemate and two MG 42s in Tobruk ringstands.' } });
    own(s, a, { model: tobruk, special: pak, variant: { name: 'Stützpunkt', text: 'Two PaK casemates and two Tobruks, thicker concrete.' } });
    own(h, a, { model: pak, special: buildGermanCommandBunker, variant: { name: 'Regimental command bunker', text: 'A Regelbau command bunker — two metres of concrete, a steel observation cupola, the aerial on the roof — ringed by PaK casemates.' } });
  }
  return { bunker: b, strongpoint: s, hq: h };
}

export const ATLANTIC_WALL = { wn, battery };
