// The Warsaw Pact's Baltic ships, 1985 (the coastal maps only, `coastal`: Hohwacht). Models: models/baltic85.js.
//   escorts   Parchim corvette, Osa missile boat, Natya minesweeper (`sweeper`: systems/Landing.js) — bought
//             with CP when the map's `landing.navy` lists them; their guns work the beach, their AA the jets
//   craft     Frosch I and Polnocny landing ships, the Aist hovercraft — never bought: what the Pact buys for the
//             land comes in one (map `landing.craft`, systems/Landing.js launch). The hovercraft (`hover`) runs
//             over the mines and up onto the dry sand.
import { buildFrosch, buildPolnocny, buildAist, buildParchim, buildOsa, buildNatya, buildPT76, afloat } from '../models/baltic85.js';
import tank from './tank.ts';
import ifv from './ifv.ts';
import reconVehicle from './reconVehicle.ts';
import rockets from './rockets.ts';

const NAVAL = { naval: true, eyeHeight: 14, aimHeight: 3, nightSight: { nato: 0.5, pact: 0.5 }, crew: 0, breakMorale: 0, smoke: undefined, grenades: 0, lightAT: 0, fov: 6.3, burst: 1, burstInterval: 0, aimTime: 1, magSize: 9999, reloadTime: 1, antiArmor: true, tracer: 1 };
const FWD = 0;
const AFT = Math.PI;
const AA = (range, hitNear, hitFar) => ({ antiAir: { range, optical: 1, rate: 2.4, burst: 6, pause: 0.4, hitNear: hitNear * 0.3, hitFar: hitFar * 0.3 } });
const RADAR = (range = 2400, height = 16) => ({ range, height });
const gun = (at, facing, o) => ({ at, facing, arc: 4.6, spread: 0.012, splash: 2.5, pierce: 0.25, shell: 900, size: 1.2, ...o });
const G57 = { range: 1300, reload: 1.2, damage: 110, splash: 2.5, size: 1.2 };  // (twin AK-725)
const G30 = { range: 900, reload: 0.5, damage: 40, splash: 1.2, size: 0.8 };    // (twin AK-230)
const OSA_SAM = { range: 800, channels: 1, load: 20, reload: 2.5, speed: 240, pk: 0.4 };
const CHAFF = { count: 6, cooldown: 10 };

const ship = (o) => ({
  category: 'naval', kind: 'vehicle', role: 'fighter', coastal: true,
  formation: { count: 1, columns: 1, spacing: 0 },
  weaponSound: 'naval', engine: 'engine.ship', tracks: 'wash', // (audio: the screws' beat, the bow wave — as the other navies')
  ...o,
  stats: { ...NAVAL, weapon: 'cannon', leash: 60, spread: 0.012, boltSpeed: 900, boltSize: 1.2, splash: 2.5, pierce: 0.25, fireCooldown: 1.2, ...o.stats },
});
/** A landing craft: never bought (hidden, uncapped), steered by systems/Landing.js. */
const craftType = (o) => ship({ hidden: true, uncapped: true, cost: 0, ...o, stats: { landingCraft: true, range: 900, aggroRange: 900, preferredRange: 0, damage: 40, ...o.stats } });

export const parchim = ship({
  fleet: 'escort',
  id: 'parchim', name: 'Corvette', shortName: 'Corvette', cost: 380, limit: 2,
  names: { pact: ['Wismar', 'Parchim', 'Perleberg', 'Lübz', 'Bützow', 'Waren', 'Ribnitz-Damgarten', 'Teterow'], nato: ['K-1'] },
  hull: { length: 72, beam: 9.4 },
  stats: { hp: 2400, armor: 0.05, speed: 12, accel: 0.15, turnRate: 0.11, turretRate: 0.8, radius: 5, height: 10, sight: 2400, radar: RADAR(2400, 16), ...AA(700, 0.2, 0.05),
    defence: { point: OSA_SAM, chaff: CHAFF }, range: 1300, aggroRange: 1300, preferredRange: 900, damage: 110 },
  mounts: { pact: [gun([0, 4.5, -24], AFT, G57), gun([0, 6.5, -8], FWD, G30)], nato: [gun([0, 4.5, -24], AFT, G57)] },
  camera: { distance: 70, height: 20, shoulder: 0 },
  models: { pact: buildParchim, nato: buildParchim },
  variants: {
    pact: { name: 'Parchim-class corvette', weapon: 'twin 57 mm, twin 30 mm, SA-N-5, RBU-6000', text: 'The Volksmarine\'s small sub-hunter: her guns cover the boats going in, her missiles and 30 mm the jets diving on them.' },
    nato: { name: 'Corvette', weapon: '57 mm', text: 'A corvette.' },
  },
});

export const osa = ship({
  fleet: 'escort',
  id: 'osa', name: 'Missile Boat (Osa)', shortName: 'Osa boat', cost: 220, limit: 3,
  names: { pact: ['Rudolf Egelhofer', 'Fritz Gast', 'Joseph Schares', 'Max Reichpietsch', 'Paul Wieczorek', 'August Lütgens'], nato: ['P-1'] },
  hull: { length: 39, beam: 7.6 },
  stats: { hp: 600, armor: 0, speed: 20, accel: 0.4, turnRate: 0.26, turretRate: 1, radius: 3.4, height: 6, eyeHeight: 7, sight: 2000, stealth: 0.75, smallCraft: true, radar: RADAR(2000, 8), ...AA(500, 0.14, 0.03),
    defence: { chaff: { count: 4, cooldown: 12 } }, range: 900, aggroRange: 900, preferredRange: 700, leash: 40, damage: 40 },
  mounts: { pact: [gun([0, 3, 13], FWD, G30), gun([0, 3, -15], AFT, G30)], nato: [gun([0, 3, 13], FWD, G30)] },
  camera: { distance: 44, height: 13, shoulder: 0 },
  models: { pact: buildOsa, nato: buildOsa },
  variants: {
    pact: { name: 'Osa I missile boat', weapon: '4 P-15 Termit, 2 × twin 30 mm', text: 'Four Styx missiles for ships that aren\'t here, and two quick twin 30 mm mounts that rake the beach and the dunes. Small, fast, fragile.' },
    nato: { name: 'Missile boat', weapon: '30 mm', text: 'A missile boat.' },
  },
});

export const natya = ship({
  fleet: 'escort',
  id: 'natya', name: 'Minesweeper (Natya)', shortName: 'Minesweeper', cost: 200, limit: 3,
  names: { pact: ['Kühlungsborn', 'Boltenhagen', 'Ueckermünde', 'Zingst', 'Prerow', 'Graal-Müritz'], nato: ['M-1'] },
  hull: { length: 61, beam: 10 },
  stats: { sweeper: 45, hp: 1300, armor: 0.03, speed: 7, accel: 0.25, turnRate: 0.14, turretRate: 0.8, radius: 4.5, height: 8, sight: 1600, radar: RADAR(1600, 12), ...AA(500, 0.12, 0.03),
    range: 900, aggroRange: 900, preferredRange: 700, leash: 40, damage: 40 },
  mounts: { pact: [gun([0, 4, 22], FWD, G30), gun([0, 6, -6], AFT, G30)], nato: [gun([0, 4, 22], FWD, G30)] },
  camera: { distance: 60, height: 18, shoulder: 0 },
  models: { pact: buildNatya, nato: buildNatya },
  variants: {
    pact: { name: 'Natya-class minesweeper', weapon: '2 × twin 30 mm, the sweep', text: 'Where she steams the moored mines are cut: a new lane for the landing ships, or a wider one. Steel-hulled, slow.' },
    nato: { name: 'Minesweeper', weapon: '30 mm', text: 'A minesweeper.' },
  },
});

export const frosch = craftType({
  id: 'frosch', name: 'Landing Ship (Frosch I)', shortName: 'Frosch',
  names: { pact: ['Hoyerswerda', 'Hagenow', 'Frankfurt (Oder)', 'Eisleben', 'Lübben', 'Schwerin', 'Neubrandenburg', 'Cottbus'], nato: ['L-1'] },
  hull: { length: 98, beam: 11 },
  stats: { draft: 2.2, hp: 3200, armor: 0.06, speed: 8, accel: 0.12, turnRate: 0.1, turretRate: 0.8, radius: 6, height: 14, sight: 1800, ...AA(600, 0.16, 0.04), defence: { point: OSA_SAM, chaff: CHAFF }, damage: 110 },
  mounts: { pact: [gun([0, 7.5, 27], FWD, G57), gun([0, 11.5, -36], AFT, G30)], nato: [] },
  camera: { distance: 90, height: 26, shoulder: 0 },
  models: { pact: buildFrosch, nato: buildFrosch },
  variants: { pact: { name: 'Frosch I tank landing ship', weapon: 'twin 57 mm, twin 30 mm', text: 'The Volksmarine\'s big landing ship: tanks and IFVs straight onto the beach through her bow doors.' }, nato: { name: 'Landing ship', weapon: '—', text: 'A landing ship.' } },
});

export const polnocny = craftType({
  id: 'polnocny', name: 'Landing Ship (Polnocny)', shortName: 'Polnocny',
  names: { pact: ['Grunwald', 'Kołobrzeg', 'Brda', 'Narew', 'Oksywie', 'Gniezno', 'Lenino', 'Cedynia'], nato: ['L-2'] },
  hull: { length: 73, beam: 8.6 },
  stats: { draft: 1.6, hp: 1900, armor: 0.04, speed: 9, accel: 0.16, turnRate: 0.13, turretRate: 0.8, radius: 4.5, height: 11, sight: 1600, ...AA(500, 0.14, 0.03), damage: 40 },
  mounts: { pact: [gun([0, 8.2, -14], FWD, G30), gun([0, 8.2, -30], AFT, G30)], nato: [] },
  camera: { distance: 70, height: 20, shoulder: 0 },
  models: { pact: buildPolnocny, nato: buildPolnocny },
  variants: { pact: { name: 'Polnocny medium landing ship', weapon: '2 × twin 30 mm, beach rockets', text: 'The Polish sea-landing division\'s workhorse: a company of naval infantry or a few vehicles, straight onto the sand.' }, nato: { name: 'Landing ship', weapon: '—', text: 'A landing ship.' } },
});

export const aist = craftType({
  id: 'aist', name: 'Hovercraft (Aist)', shortName: 'Aist', engine: 'engine.hover', // (audio/SoundBank.js: the propellers' thrum and the turbines' whine — heard from far out)
  names: { pact: ['MDK-89', 'MDK-102', 'MDK-113', 'MDK-118', 'MDK-121', 'MDK-123'], nato: ['H-1'] },
  hull: { length: 47, beam: 17.8 },
  stats: { hover: true, draft: -1, hp: 1100, armor: 0.02, speed: 16, accel: 0.5, turnRate: 0.22, turretRate: 1, radius: 7, height: 10, sight: 1400, ...AA(500, 0.15, 0.03), damage: 40 },
  mounts: { pact: [gun([-3, 8, 5], FWD, G30), gun([3, 8, 5], FWD, G30)], nato: [] },
  camera: { distance: 60, height: 18, shoulder: 0 },
  models: { pact: buildAist, nato: buildAist },
  variants: { pact: { name: 'Aist assault hovercraft', weapon: '2 × twin 30 mm', text: 'Fast and loud, riding over the mines on her skirt and straight up the beach: the naval infantry come off her ramp dry-shod.' }, nato: { name: 'Hovercraft', weapon: '—', text: 'A hovercraft.' } },
});

export const BALTIC_85 = { parchim, osa, natya, frosch, polnocny, aist }; // (+ the swimmers, below)

// ---------------------------------------------------------------- the swimmers
// The Pact's amphibious vehicles swim in on their own (a map's `landing.swim`: cargo type → swimmer; systems/Landing.js):
// launched a few hundred metres out, a slow paddle in, then up the beach on their tracks or wheels. No canvas screen
// to swamp, unlike 1944's DD tanks.

/** PT-76 (the coastal maps, the NVA and the Soviets): the amphibious light tank of the naval infantry. */
export const pt76 = {
  ...tank, id: 'pt76', name: 'Amphibious Tanks', shortName: 'PT-76', cost: 260, coastal: true, armies: ['nva', 'sov'],
  stats: { ...tank.stats, hp: 650, armor: 0.12, speed: 6.2, damage: 210, pierce: 0.35, splash: 2.5, fireCooldown: 4.5, reloadTime: 6, nightSight: { nato: 0.5, pact: 0.5 }, smoke: undefined },
  factionStats: undefined,
  models: { pact: buildPT76, nva: buildPT76, nato: buildPT76 },
  engine: 'engine.dieselSmall', tracks: 'tracks.light',
  variants: {
    nva: { name: 'PT-76B', weapon: '76 mm D-56TS', text: 'The amphibious light tank: it swims in with the first wave and drives straight up the beach. Thin armour and a small gun — a fire-support tank against bunkers and infantry, not against Leopards.' },
    pact: { name: 'PT-76B', weapon: '76 mm D-56TS', text: 'The naval infantry\'s amphibious light tank: it swims in with the first wave and drives straight up the beach. Thin armour and a small gun — support for the infantry, not a tank killer.' },
    nato: { name: 'Light tank', weapon: '76 mm', text: 'An amphibious light tank.' },
  },
};

/** A vehicle swimming in: `of` its land type, drawn with that type's own models (low in the water). */
const swimmer = (id, of, sink) => craftType({
  id, name: `${of.name} (swimming)`, shortName: 'Afloat', engine: 'engine.dieselSmall',
  hull: { length: 7, beam: 3 },
  stats: { swims: true, draft: 1.2, hp: 400, armor: 0.08, speed: 3.5, accel: 0.5, turnRate: 0.3, turretRate: 1, radius: 2.4, height: 1.6, eyeHeight: 2, sight: 400, smallCraft: true, stealth: 0.5,
    range: 0, aggroRange: 0, preferredRange: 0, leash: 20, damage: 0 },
  mounts: { pact: [], nato: [] },
  camera: { distance: 18, height: 6, shoulder: 0 },
  models: Object.fromEntries(Object.entries(of.models).map(([k, b]) => [k, afloat(b, sink)])),
  variants: { pact: { name: 'Swimming', weapon: '— (afloat)', text: 'An amphibious vehicle swimming in: it can\'t fire till it is ashore.' }, nato: { name: 'Swimming', weapon: '—', text: 'Afloat.' } },
});
export const swimIfv = swimmer('swimIfv', ifv, 1.25);
export const swimRecon = swimmer('swimRecon', reconVehicle, 1.2);
export const swimPT76 = swimmer('swimPT76', pt76, 1.2);

Object.assign(BALTIC_85, { pt76, swimIfv, swimRecon, swimPT76 });

// ---------------------------------------------------------------- the coast's defence

/** The Bundeswehr's coastal missile battery (placed by the map, `landing.forts`; never bought): two launcher trucks
 *  hidden inland that fire on the landing's ships only (systems/Landing.js batteries) — one missile, then away to a
 *  new hide before the ships' guns find them. Nothing against the land. */
export const coastMissile = {
  ...rockets, id: 'coastMissile', name: 'Coastal Missile Battery', shortName: 'Missile battery', hidden: true, coastal: true, cost: 0, armies: undefined,
  formation: { count: 2, columns: 2, spacing: 24 },
  stats: { ...rockets.stats, range: 0, minRange: 0, preferredRange: 0, damage: 0, sight: 300, stealth: 0.8, hp: 380,
    antiShip: { name: 'Exocet', range: 2800, reload: 70, load: 4, count: 1, speed: 300, damage: 900, pierce: 0.6, seeker: 1400, skim: true } },
  factionStats: undefined,
  variants: {
    bw: { name: 'MM38 Exocet battery', weapon: '2 × MM38 Exocet launchers', text: 'Two launcher trucks hidden behind the coast: a sea-skimming missile at the biggest ship in reach, then away to a new hide. Find them before they find the Frosch.' },
    nato: { name: 'Coastal missile battery', weapon: 'anti-ship missiles', text: 'Launcher trucks hidden inland that fire on ships, then move.' },
    pact: { name: 'Coastal missile battery', weapon: 'anti-ship missiles', text: 'Launcher trucks hidden inland that fire on ships, then move.' },
  },
};

Object.assign(BALTIC_85, { coastMissile });
