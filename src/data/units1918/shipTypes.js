// 1918 at sea: the ship classes the sea maps were missing, as new types beside ./ships.js's slots (their ids have no 1985
// counterpart; data/units/index.js ROLE gives each a stand-in for an army without it, ai/SeaDirector.js ORDER_1918 buys them):
//   monitor          the Royal Navy's big-gun monitor (Abercrombie class): one twin 14-inch turret, slow, bulged
//   seaplaneCarrier  Ben-my-Chree (the French: Campinas): her seaplanes off the water alongside (stats.carrier deckX,
//                    `air: 'Seaplane'` — systems/AirStrike.js flies data/air18.ts natoSeaplane off her)
//   merchant         the convoy's tramp steamer (not the troopship): her cargo brings in command points like a transport
//   trawler          the armed trawler (the Royal Navy's) and the Vorpostenboot (the Kaiserliche Marine's)
//   minelayerSub     the UC II boat: a U-boat that lays mines (systems/Minefields.js) as well as torpedoing
//   cruiserSub       the U-cruiser (U 151): two 15 cm guns for the merchantmen, slow to dive
// and every landing navy's own boats on ./ships.js ml (the men) and ferry (the vehicles): the French ones are ./navyMed.js's.
import { buildAbercrombie, buildBenMyChree, buildCampinas, buildTrampRN, buildTrampDE, buildTrampFR, buildTrampIT, buildTrampRU, buildArmedTrawler, buildVorpostenboot, buildUC2, buildUKreuzer,
  buildPinnaceDE, buildPinnaceAH, buildPinnaceRU, buildCutterOT, buildMotobarcaIT, buildLighterDE, buildLighterAH, buildBargeRU, buildBettolinaIT, buildMavnaOT } from '../models/ships1918extra.js';

// (as ./ships.js: the 1918 ship, its guns, tubes, charges, and the sea scale)
const NAVAL = { naval: true, eyeHeight: 18, aimHeight: 4, nightSight: { nato: 0.4, pact: 0.48 }, crew: 0, breakMorale: 0, smoke: undefined, grenades: 0, lightAT: 0, fov: 6.3, burst: 1, burstInterval: 0, aimTime: 1, magSize: 9999, reloadTime: 1, antiArmor: true, tracer: 1 };
const FWD = 0;
const AFT = Math.PI;
const BEAM = Math.PI / 2;
const AA = (range, hitNear, hitFar) => ({ antiAir: { range, optical: 1, rate: 1, burst: 3, pause: 1, hitNear: hitNear * 0.3, hitFar: hitFar * 0.3 } });
const gun = (at, facing, o) => ({ at, facing, arc: 4.6, spread: 0.013, splash: 4, pierce: 0.3, shell: 760, size: 1.8, ...o });
const DC = (o) => ({ count: 4, reload: 22, radius: 35, damage: 1000, ...o });
const TUBES = (at, facing, o) => ({ at, torpedo: true, facing, arc: 0.9, count: 2, range: 1300, speed: 18, damage: 2400, reload: 110, ...o });
const RANGE = 0.55;
const SCALED = ['range', 'aggroRange', 'preferredRange', 'sight', 'sonar', 'hearing'];
const near = (o) => { const r = { ...o }; for (const k of SCALED) if (r[k]) r[k] = Math.round(r[k] * RANGE / 5) * 5; return r; };
const ship = (o) => ({
  category: 'naval', kind: 'vehicle', role: 'fighter',
  formation: { count: 1, columns: 1, spacing: 0 },
  weaponSound: 'naval', engine: 'engine.ship', tracks: 'wash',
  ...o,
  stats: near({ ...NAVAL, weapon: 'cannon', ...o.stats }),
  ...(o.factionStats && { factionStats: Object.fromEntries(Object.entries(o.factionStats).map(([k, v]) => [k, near(v)])) }),
  ...(o.mounts && { mounts: Object.fromEntries(Object.entries(o.mounts).map(([side, list]) => [side, list.map(near)])) }),
});

const FOURTEEN_INCH = { range: 3900, reload: 34, damage: 2000, splash: 12, pierce: 0.7, shell: 800, size: 3.6, spread: 0.012 };
const SIX_INCH = { range: 2400, reload: 7, damage: 330, splash: 5, pierce: 0.4, shell: 780, size: 2.2, spread: 0.013 };
const TWELVE_PDR = { range: 1400, reload: 3.5, damage: 90, splash: 2, pierce: 0.12, shell: 720, size: 1, arc: 4.4 };
const EIGHT_EIGHT = { range: 1500, reload: 3.5, damage: 110, splash: 2.5, pierce: 0.15, shell: 740, size: 1.2, arc: 4.4 };
const FIFTEEN_CM = { range: 2000, reload: 8, damage: 300, splash: 4, pierce: 0.3, shell: 760, size: 2, surfaced: true, arc: 5.2 };

export const monitor = ship({
  fleet: 'line', armies: ['uk'],
  id: 'monitor', name: 'Monitor', shortName: 'Monitor', cost: 650, limit: 1,
  names: { nato: ['Abercrombie', 'Havelock', 'Raglan', 'Roberts', 'Erebus', 'Terror'], pact: ['Raglan'] },
  hull: { length: 102, beam: 27.4 },
  stats: { flareRounds: 4, hp: 11000, armor: 0.62, /* (the bulges: a torpedo spends itself on them) */ speed: 4.5, accel: 0.04, turnRate: 0.04, turretRate: 0.15, radius: 12, height: 26, eyeHeight: 30, sight: 3400, ...AA(450, 0.1, 0.02),
    range: 3900, aggroRange: 3900, preferredRange: 3400, leash: 100, damage: 2000, fireCooldown: 34, spread: 0.012, boltSpeed: 800, boltSize: 3.6, splash: 12, pierce: 0.7 },
  mounts: {
    nato: [gun([0, 9, 26], FWD, FOURTEEN_INCH), gun([6.5, 7, -8], BEAM, { ...SIX_INCH, arc: 3 }), gun([-6.5, 7, -8], -BEAM, { ...SIX_INCH, arc: 3 })],
    pact: [gun([0, 9, 26], FWD, FOURTEEN_INCH)],
  },
  camera: { distance: 120, height: 40, shoulder: 0 },
  models: { nato: buildAbercrombie, pact: buildAbercrombie },
  variants: {
    nato: { name: 'Abercrombie-class monitor', weapon: '2 × 14-inch, 2 × 6-inch', text: 'A battleship\'s guns on a hull built to float in shallow water: one twin 14-inch turret, the tall tripod to spot her fall of shot far inland, bulges against the torpedo. Six knots at best — she reaches the fight late, but nothing afloat outranges her. Raglan was sunk by Goeben off Imbros in January 1918.' },
    pact: { name: 'Monitor', weapon: '—', text: 'A monitor.' },
  },
});

export const seaplaneCarrier = ship({
  fleet: 'carrier', armies: ['uk', 'fr'],
  id: 'seaplaneCarrier', name: 'Seaplane Carrier', shortName: 'Seaplane carrier', cost: 450, limit: 1,
  names: { nato: ['Ben-my-Chree', 'Empress', 'Engadine', 'Riviera', 'Vindex', 'Manxman'], fr: ['Campinas', 'Nord', 'Pas-de-Calais'], pact: ['Ben-my-Chree'] },
  hull: { length: 114, beam: 14 },
  stats: {
    // the seaplanes are swung out onto the water beside her and take off from it (deckX: alongside, deck: on the water); back, they alight there and are hoisted in
    carrier: { deck: 0.8, deckX: 18, deckZ: 0, deckLen: 180, air: 'Seaplane', airGroup: { navScout: 2, torpBomb: 1, navCap: 1 } },
    hp: 4200, armor: 0.06, speed: 13, accel: 0.08, turnRate: 0.07, turretRate: 0.5, radius: 8, height: 16, eyeHeight: 14, sight: 2600, smokeGen: { last: 50, cooldown: 140 }, ...AA(400, 0.08, 0.02),
    range: 1400, aggroRange: 1400, preferredRange: 2400, leash: 80, damage: 90, fireCooldown: 3.5, spread: 0.016, boltSpeed: 720, boltSize: 1, splash: 2, pierce: 0.12,
  },
  factionStats: { fr: { hp: 5200, speed: 7.5, smokeGen: undefined } },   // (Campinas: a cargo steamer, not a cross-Channel flyer)
  mounts: {
    nato: [gun([0, 8, 46], FWD, TWELVE_PDR), gun([0, 7, -54], AFT, TWELVE_PDR)],
    fr: [gun([0, 9, 50], FWD, { ...TWELVE_PDR, damage: 100 }), gun([0, 8, -52], AFT, { ...TWELVE_PDR, damage: 100 })],
    pact: [],
  },
  armyType: { fr: { hull: { length: 115, beam: 15 } } },
  camera: { distance: 120, height: 38, shoulder: 0 },
  models: { nato: buildBenMyChree, fr: buildCampinas, pact: buildBenMyChree },
  variants: {
    nato: { name: 'Seaplane carrier (Ben-my-Chree)', weapon: 'Short 184s, a Sopwith Baby · 4 × 12-pounder', text: 'A fast Isle of Man steamer with a hangar built over her stern: her seaplanes are hoisted out, take off from the water alongside and alight there again. In August 1915 one of her Short 184s sank a Turkish ship with the first air-launched torpedo. Soft — keep her back with the fleet.' },
    fr: { name: 'Transport d\'hydravions (Campinas)', weapon: 'seaplanes · 2 × 47 mm', text: 'A cargo steamer of the Chargeurs Réunis with canvas hangars over her holds: her seaplanes scouted the Syrian coast and the Gulf of Smyrna for the French Levant squadron. Slow, and soft.' },
    pact: { name: 'Seaplane carrier', weapon: '—', text: 'A seaplane carrier.' },
  },
});

export const merchant = ship({
  fleet: 'under',
  id: 'merchant', name: 'Merchant Steamer', shortName: 'Steamer', cost: 150,
  names: {
    nato: ['SS Kildale', 'SS Ashby', 'SS Wandby', 'SS Eastfield', 'SS Clan Macvey', 'SS Polvarth', 'SS Trevose', 'SS Kingsdyke', 'SS Gartness', 'SS Roxburgh', 'SS Westburn', 'SS Glenby'],
    pact: ['SS Hera', 'SS Kolga', 'SS Ceres', 'SS Gerda', 'SS Ostsee', 'SS Sirius', 'SS Rheinland', 'SS Pernau'],
    fr: ['Ville de Bône', 'Mont Viso', 'Saint-Simon', 'Medjerda', 'Sidi Brahim', 'Djurjura', 'Bou Saada', 'Gallia'],
    ru: ['Parokhod Kursk', 'Parokhod Tambov', 'Parokhod Kerch', 'Parokhod Imperator Nikolai', 'Parokhod Odessa', 'Parokhod Libava'],
    it: ['Piroscafo Volturno', 'Piroscafo Bormida', 'Piroscafo Lilla', 'Piroscafo Etruria', 'Piroscafo Ausonia', 'Piroscafo Città di Messina'],
  },
  hull: { length: 100, beam: 14 },
  stats: { landing: true, hp: 5000, armor: 0.05, speed: 6.5, accel: 0.04, turnRate: 0.045, turretRate: 0.4, radius: 8, height: 13, eyeHeight: 14, sight: 1800, ...AA(200, 0.03, 0.01),
    range: 1300, aggroRange: 1300, preferredRange: 1100, leash: 60, damage: 90, fireCooldown: 6, spread: 0.018, boltSpeed: 700, boltSize: 1.3, splash: 3, pierce: 0.15 },
  mounts: Object.fromEntries(['nato', 'pact', 'fr', 'it', 'ru'].map((k) => [k, [gun([0, 9, -46], AFT, { range: 1300, reload: 6, damage: 90, splash: 3, arc: 4 })]])),
  camera: { distance: 100, height: 32, shoulder: 0 },
  models: { nato: buildTrampRN, pact: buildTrampDE, fr: buildTrampFR, it: buildTrampIT, ru: buildTrampRU },
  variants: {
    nato: { name: 'Tramp steamer', weapon: 'one 12-pounder (DAMS)', text: 'A Tyne-built tramp of five thousand tons in dazzle paint, coal or grain or ore in her holds, a naval gun crew on the poop. Slow and soft: while she lies in a zone of yours her cargo brings in command points — the U-boats come for her before anything else.' },
    pact: { name: 'Frachtdampfer', weapon: 'one 8.8 cm', text: 'A German cargo steamer on the Baltic ore run from Sweden, a naval gun crew aboard: while she lies in a zone of yours her cargo brings in command points.' },
    fr: { name: 'Cargo à vapeur', weapon: 'one 90 mm', text: 'A French cargo steamer in camouflage on the Marseille–Algiers run, a navy gun on the poop: while she lies in a zone of yours her cargo brings in command points — and the U-boats hunt her.' },
    ru: { name: 'Gruzovoy parokhod', weapon: 'one 75 mm', text: 'A steamer of the Volunteer Fleet carrying coal and shells across the Baltic or the Black Sea, a navy gun crew aboard: while she lies in a zone of yours her cargo brings in command points.' },
    it: { name: 'Piroscafo da carico', weapon: 'one 76 mm', text: 'An Italian cargo steamer bringing coal from Britain past the U-boats off Malta and Sicily: while she lies in a zone of yours her cargo brings in command points.' },
  },
});

const VP = ['Vp Senator Sachse', 'Vp Hamburg', 'Vp Bremen', 'Vp Kehdingen', 'Vp Altenwerder', 'Vp Wilhelmsburg', 'Vp Doggerbank', 'Vp Borkum'];
export const trawler = ship({
  fleet: 'escort',
  id: 'trawler', name: 'Armed Trawler', shortName: 'Trawler', cost: 120,
  names: { uk: ['HMT John Ebbs', 'HMT William Inwood', 'HMT Thomas Blackhorne', 'HMT James Pond', 'HMT George Clarke', 'HMT Nathaniel Cole', 'HMT Richard Bulkeley', 'HMT John Gillman', 'HMT Daniel Munro', 'HMT Robert Smith'], de: VP, pact: VP },
  hull: { length: 41, beam: 7 },
  stats: { hp: 800, armor: 0.02, speed: 6, accel: 0.1, turnRate: 0.13, turretRate: 0.7, radius: 3.5, height: 6, eyeHeight: 7, sight: 1600, sonar: 500, depthCharges: DC({ count: 4, reload: 24 }), ...AA(250, 0.04, 0.01),
    range: 1400, aggroRange: 1400, preferredRange: 900, leash: 40, damage: 90, fireCooldown: 3.5, spread: 0.018, boltSpeed: 720, boltSize: 1, splash: 2, pierce: 0.12 },
  factionStats: { pact: { sonar: 400, damage: 110, range: 1500, aggroRange: 1500, depthCharges: DC({ count: 2, reload: 30 }) } },   // (the 8.8 cm; fewer charges, a poorer hydrophone)
  mounts: { nato: [gun([0, 4, 15], FWD, TWELVE_PDR)], pact: [gun([0, 4, 15], FWD, EIGHT_EIGHT)] },
  camera: { distance: 45, height: 15, shoulder: 0 },
  models: { nato: buildArmedTrawler, pact: buildVorpostenboot },
  variants: {
    nato: { name: 'Admiralty trawler (Castle class)', weapon: '12-pounder, hydrophone, 4 depth charges', text: 'A steel North Sea trawler built for the Navy, her fishermen crew in naval rig: the gun on a bandstand over the bow, a hydrophone and the depth charges aft. Slow, but she patrols the convoy lanes and holds a U-boat down until the destroyers come.' },
    pact: { name: 'Vorpostenboot', weapon: '8.8 cm, 2 depth charges', text: 'A Hamburg fishing trawler taken up for the outpost flotillas: she watches the swept channels in the Bight and off Flanders, escorts the U-boats out and in, and fights the British drifters and motor boats with her one gun.' },
  },
});

export const minelayerSub = ship({
  fleet: 'under', armies: ['de'],
  id: 'minelayerSub', name: 'Minelaying U-boat', shortName: 'UC boat', cost: 400, limit: 2,
  names: { pact: ['UC 55', 'UC 61', 'UC 65', 'UC 71', 'UC 75', 'UC 21', 'UC 47', 'UC 74'], nato: ['UC 5'] },
  hull: { length: 50.5, beam: 5.2 },
  stats: {
    submarine: { submerged: 3.2, dive: 1.1, periscope: 5, deep: 30 }, minelayer: { count: 18, spacing: 30 }, hp: 1400, armor: 0.08, speed: 6.8, accel: 0.1, turnRate: 0.12, turretRate: 0.6, radius: 4, height: 5, eyeHeight: 6,
    sight: 1500, hearing: 1700, range: 1200, aggroRange: 1200, preferredRange: 900, leash: 60, damage: 120, fireCooldown: 5, spread: 0.016, boltSpeed: 750, boltSize: 1.1, splash: 2.5, pierce: 0.2,
  },
  mounts: {
    pact: [TUBES([1.2, -1, 22], 0, { count: 2, range: 1300, damage: 2400, reload: 70 }), TUBES([0, -1, -24], Math.PI, { count: 1, range: 1300, damage: 2400, reload: 80 }), gun([0, 3, 2], 0, { range: 1100, reload: 5, damage: 120, splash: 2.5, surfaced: true, arc: 5.2 })],
    nato: [],
  },
  camera: { distance: 58, height: 18, shoulder: 0 },
  models: { pact: buildUC2, nato: buildUC2 },
  variants: {
    pact: { name: 'UC II minelaying U-boat', weapon: '18 mines, 3 torpedo tubes, 8.8 cm', text: 'The Flanders flotilla\'s minelayer: six chutes in her bow, three mines in each, dropped as she runs submerged across a convoy route or a harbour mouth — then she hunts with her torpedoes. The UC boats\' fields sank more ships than any other mines of the war.' },
    nato: { name: 'Minelaying U-boat', weapon: '—', text: 'A minelaying U-boat.' },
  },
});

export const cruiserSub = ship({
  fleet: 'under', armies: ['de'],
  id: 'cruiserSub', name: 'U-Cruiser', shortName: 'U-cruiser', cost: 520, limit: 1,
  names: { pact: ['U 151', 'U 152', 'U 155', 'U 156', 'U 157', 'U 140'], nato: ['U 151'] },
  hull: { length: 65, beam: 8.9 },
  stats: {
    submarine: { submerged: 2.6, dive: 0.8, periscope: 5, deep: 30 }, hp: 2800, armor: 0.1, speed: 6, accel: 0.07, turnRate: 0.09, turretRate: 0.5, radius: 5, height: 6, eyeHeight: 7,
    sight: 1800, hearing: 1500, range: 2000, aggroRange: 2000, preferredRange: 1500, leash: 80, damage: 300, fireCooldown: 8, spread: 0.015, boltSpeed: 760, boltSize: 2, splash: 4, pierce: 0.3,
  },
  mounts: {
    pact: [TUBES([0, -1, 30], 0, { count: 2, range: 1300, damage: 2400, reload: 70 }), gun([0, 3, 12], FWD, FIFTEEN_CM), gun([0, 3, -11], AFT, FIFTEEN_CM)],
    nato: [],
  },
  camera: { distance: 72, height: 22, shoulder: 0 },
  models: { pact: buildUKreuzer, nato: buildUKreuzer },
  variants: {
    pact: { name: 'U-Kreuzer (U 151 class)', weapon: '2 × 15 cm, 2 torpedo tubes', text: 'A submarine cruiser built on the merchant U-boat Deutschland\'s hull for the long cruise to the Azores and America: two 15 cm guns to stop and sink steamers on the surface, the torpedoes kept for the warships. Big and slow to dive — caught on the surface by a destroyer, she is in trouble.' },
    nato: { name: 'U-cruiser', weapon: '—', text: 'A U-cruiser.' },
  },
});

/** Each navy's own landing boats (./ships.js ml: the men; ferry: the vehicles) — the same stats as the Dover Patrol's, their own hulls and names (entities/UnitStack.js armyType). */
function craftFor(t, armies, { model, hull, variant, camera }) {
  for (const army of armies) {
    t.models = { ...t.models, [army]: model };
    t.variants = { ...t.variants, [army]: variant };
    t.armyType = { ...t.armyType, [army]: { hull, ...(camera && { camera: { ...camera, shoulder: 0 } }) } };
  }
}
const LAUNCH_CAM = { distance: 30, height: 10 };
const LIGHTER_CAM = { distance: 48, height: 16 };

export default function shipTypes(T) {
  Object.assign(T, { monitor, seaplaneCarrier, merchant, trawler, minelayerSub, cruiserSub });
  const { ml, ferry } = T;
  // the Kaiserliche Marine (Ösel 1917: the battleships' pinnaces towed in by the torpedo boats, the troops' lighters behind the steamers)
  craftFor(ml, ['pact', 'de', 'st'], { model: buildPinnaceDE, hull: { length: 14, beam: 3.4 }, camera: LAUNCH_CAM,
    variant: { name: 'Dampfpinasse', weapon: 'a machine gun', text: 'A battleship\'s steam pinnace, a string of cutters full of infantry in tow: at Tagga Bay on 12 October 1917 the torpedo boats brought them in close and cast them off for the beach.' } });
  craftFor(ferry, ['pact', 'de', 'st'], { model: buildLighterDE, hull: { length: 32, beam: 8 }, camera: LIGHTER_CAM,
    variant: { name: 'Prahm (lighter)', weapon: 'a machine gun', text: 'A harbour lighter with a steam engine aft, as Operation Albion brought its guns, horses and wagons ashore on Ösel: flat-bottomed, she runs up onto the shingle and they go over her bow.' } });
  // the k.u.k. Kriegsmarine
  craftFor(ml, ['ah'], { model: buildPinnaceAH, hull: { length: 13, beam: 3.4 }, camera: LAUNCH_CAM,
    variant: { name: 'Dampfbarkasse', weapon: 'a Schwarzlose', text: 'A k.u.k. steam launch from Pola, the landing party crowded under her awning: she runs a section in to the beach and goes back for the next.' } });
  craftFor(ferry, ['ah'], { model: buildLighterAH, hull: { length: 30, beam: 8 }, camera: LIGHTER_CAM,
    variant: { name: 'Schleppleichter', weapon: 'a Schwarzlose', text: 'A Trieste harbour lighter with her own engine: the guns and their teams go ashore over her bow.' } });
  // the Russian Baltic and Black Sea fleets
  craftFor(ml, ['ru'], { model: buildPinnaceRU, hull: { length: 15, beam: 3.4 }, camera: LAUNCH_CAM,
    variant: { name: 'Parovoy kater', weapon: 'a Maxim', text: 'A battleship\'s steam launch of the Baltic Fleet, a platoon aboard and boats in tow: she brings the landing party in to the beach.' } });
  craftFor(ferry, ['ru'], { model: buildBargeRU, hull: { length: 34, beam: 7 }, camera: LIGHTER_CAM,
    variant: { name: 'Desantnaya barzha', weapon: 'a Maxim', text: 'A self-propelled landing barge like the Elpidifors built for the Bosphorus landing: a flat bottom to run up on the beach, guns and wagons in her hold.' } });
  // the Regia Marina
  craftFor(ml, ['it'], { model: buildMotobarcaIT, hull: { length: 20, beam: 3.6 }, camera: LAUNCH_CAM,
    variant: { name: 'Motobarca', weapon: 'a Fiat-Revelli', text: 'A motor boat of the MAS yards, longer and slower, built to carry the men: in fast to the quay with a section of Bersaglieri, out again for the next.' } });
  craftFor(ferry, ['it'], { model: buildBettolinaIT, hull: { length: 26, beam: 7 }, camera: LIGHTER_CAM,
    variant: { name: 'Bettolina', weapon: 'a Fiat-Revelli', text: 'A Venetian harbour lighter with a motor: the guns and their mules go ashore over her bow.' } });
  // the Ottoman Navy
  craftFor(ml, ['ot'], { model: buildCutterOT, hull: { length: 12, beam: 3.8 }, camera: LAUNCH_CAM,
    variant: { name: 'Buharlı filika', weapon: 'a Maxim', text: 'A wooden steam cutter from the Golden Horn, a section of assault troops aboard: she runs them in to the beach and goes back for more.' } });
  craftFor(ferry, ['ot'], { model: buildMavnaOT, hull: { length: 26, beam: 7.5 }, camera: LIGHTER_CAM,
    variant: { name: 'Mavna (lighter)', weapon: 'a Maxim', text: 'A wooden Bosphorus lighter, towed in by a tug: guns, horses and wagons go ashore over her side.' } });
}
