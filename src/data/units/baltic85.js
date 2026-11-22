// The Warsaw Pact's Baltic ships, 1985 (the coastal maps only, `coastal`: Hohwacht). Models: models/baltic85.js.
//   escorts   Parchim corvette, Osa missile boat, Natya minesweeper (`sweeper`: systems/Landing.js) — bought
//             with CP when the map's `landing.navy` lists them; their guns work the beach, their AA the jets
//   craft     Frosch I and Polnocny landing ships, the Aist hovercraft — never bought: what the Pact buys for the
//             land comes in one (map `landing.craft`, systems/Landing.js launch). The hovercraft (`hover`) runs
//             over the mines and up onto the dry sand.
import { buildFrosch, buildPolnocny, buildAist, buildParchim, buildOsa, buildNatya, buildPT76, afloat, buildLCU1610, buildType520, buildLCM521, buildAggressive, buildLindau } from '../models/baltic85.js';
import { buildLCT, buildLCVP } from '../models/landingCraft45.js'; // (NATO's 1985 boats on the 1944 frames they grew out of)
import { buildKondor, buildYukto, buildKongBang, buildHantae } from '../models/baltic85.js'; // (the Volksmarine's and the KPA navy's own, below)
import { buildKpaHY2, buildKpaHY2Radar } from '../models/armour85.js';
import tank from './tank.ts';
import ifv from './ifv.ts';
import reconVehicle from './reconVehicle.ts';
import rockets from './rockets.ts';

const NAVAL = { naval: true, eyeHeight: 14, aimHeight: 3, nightSight: { nato: 0.5, pact: 0.5 }, crew: 0, breakMorale: 0, smoke: undefined, grenades: 0, lightAT: 0, fov: 6.3, burst: 1, burstInterval: 0, aimTime: 1, magSize: 9999, reloadTime: 1, antiArmor: true, tracer: 1 };
const FWD = 0;
const AFT = Math.PI;
export const AA = (range, hitNear, hitFar) => ({ antiAir: { range, optical: 1, rate: 2.4, burst: 6, pause: 0.4, hitNear: hitNear * 0.3, hitFar: hitFar * 0.3 } });
const RADAR = (range = 2400, height = 16) => ({ range, height });
export const gun = (at, facing, o) => ({ at, facing, arc: 4.6, spread: 0.012, splash: 2.5, pierce: 0.25, shell: 900, size: 1.2, ...o });
const G57 = { range: 1300, reload: 1.2, damage: 110, splash: 2.5, size: 1.2 };  // (twin AK-725)
const G30 = { range: 900, reload: 0.5, damage: 40, splash: 1.2, size: 0.8 };    // (twin AK-230)
const G40 = { range: 1000, reload: 0.9, damage: 50, splash: 1.4, size: 0.9 };   // (a single 40 mm Bofors: the NATO sweepers)
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
export const craftType = (o) => ship({ hidden: true, uncapped: true, cost: 0, ...o, stats: { landingCraft: true, range: 900, aggroRange: 900, preferredRange: 0, damage: 40, ...o.stats } });

export const parchim = ship({
  fleet: 'escort',
  id: 'parchim', name: 'Corvette', shortName: 'Corvette', cost: 380, limit: 2,
  names: { pact: ['MPK-67', 'MPK-99', 'MPK-105', 'MPK-192', 'MPK-205', 'MPK-213', 'MPK-216', 'MPK-224'], nato: ['K-1'] }, // (the Soviet Parchim IIs by their hull numbers; the Volksmarine's names: navy() below)
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
  names: { pact: ['R-15', 'R-24', 'R-32', 'R-46', 'R-54', 'R-71'], nato: ['P-1'] }, // (Soviet missile boats went by numbers)
  hull: { length: 39, beam: 7.6 },
  stats: { hp: 600, armor: 0, speed: 20, accel: 0.4, turnRate: 0.26, turretRate: 1, radius: 3.4, height: 6, eyeHeight: 7, sight: 2000, stealth: 0.75, smallCraft: true, radar: RADAR(2000, 8), ...AA(500, 0.14, 0.03),
    defence: { chaff: { count: 4, cooldown: 12 } }, range: 900, aggroRange: 900, preferredRange: 700, leash: 40, damage: 40 },
  mounts: { pact: [gun([0, 3, 13], FWD, G30), gun([0, 3, -15], AFT, G30)], nato: [gun([0, 3, 13], FWD, G30)] },
  camera: { distance: 44, height: 13, shoulder: 0 },
  models: { pact: buildOsa, nato: buildOsa },
  variants: {
    pact: { name: 'Osa I missile boat', weapon: '4 P-15 Termit, 2 × twin 30 mm', text: 'Four Styx missiles for ships that aren\'t here, and two quick twin 30 mm mounts that rake the beach and the dunes. Small, fast, fragile.' },
    nato: { name: 'Missile boat', weapon: '30 mm', text: 'A missile boat.' },
    kpa: { name: 'Osa I missile boat (KPN)', weapon: '4 P-15 Termit, 2 × twin 30 mm', text: 'The Korean People’s Navy’s Soviet-built missile boats: they escort a landing in close and rake the beach with their 30 mm.' }, // (the KPA's own roster: data/units/armies85.js — a variant puts her on it)
  },
});

export const natya = ship({
  fleet: 'escort',
  id: 'natya', name: 'Minesweeper (Natya)', shortName: 'Minesweeper', cost: 200, limit: 3,
  names: { pact: ['Kontr-admiral Khoroshkin', 'Navodchik', 'Dizelist', 'Turbinist', 'Radist', 'Motorist'], nato: ['M-1'],
    us: ['USS Conquest', 'USS Gallant', 'USS Pledge', 'USS Constant', 'USS Fortify', 'USS Illusive', 'USS Inflict', 'USS Leader'],
    bw: ['Lindau', 'Göttingen', 'Koblenz', 'Minden', 'Marburg', 'Wetzlar', 'Cuxhaven', 'Tübingen'] },
  hull: { length: 61, beam: 10 },
  stats: { sweeper: 45, hp: 1300, armor: 0.03, speed: 7, accel: 0.25, turnRate: 0.14, turretRate: 0.8, radius: 4.5, height: 8, sight: 1600, radar: RADAR(1600, 12), ...AA(500, 0.12, 0.03),
    range: 900, aggroRange: 900, preferredRange: 700, leash: 40, damage: 40 },
  mounts: { pact: [gun([0, 4, 22], FWD, G30), gun([0, 6, -6], AFT, G30)], nato: [gun([0, 4, 22], FWD, G30)], us: [gun([0, 5, 19], FWD, G40)], bw: [gun([0, 4.5, 12.5], FWD, G40)] },
  camera: { distance: 60, height: 18, shoulder: 0 },
  models: { pact: buildNatya, nato: buildNatya, us: buildAggressive, bw: buildLindau },
  // the NATO navies' own sweepers, wooden-hulled and smaller (entities/UnitStack.js armyType)
  armyType: { us: { shortName: 'MSO', hull: { length: 52, beam: 10.9 } }, bw: { shortName: 'Minensucher', hull: { length: 47.5, beam: 8.3 } } },
  factionStats: { us: { hp: 1100, radius: 4.2 }, bw: { hp: 1000, radius: 3.8, height: 7 } },
  variants: {
    us: { name: 'Aggressive-class ocean minesweeper', weapon: '40 mm, the sweep', text: 'A wooden-hulled ocean sweeper of the Naval Reserve, built not to set off the magnetic mines she cuts: slow, lightly armed, she opens the lane for the landing craft.' },
    bw: { name: 'Minensucher Klasse 320 (Lindau)', weapon: '40 mm Bofors, the sweep', text: 'The Bundesmarine’s wooden coastal minesweeper, built for the shallow Baltic: she cuts the moored mines out of the lane ahead of the Type 520s.' },
    pact: { name: 'Natya-class minesweeper', weapon: '2 × twin 30 mm, the sweep', text: 'Where she steams the moored mines are cut: a new lane for the landing ships, or a wider one. Steel-hulled, slow.' },
    nato: { name: 'Minesweeper', weapon: '30 mm', text: 'A minesweeper.' },
    kpa: { name: 'Yukto-class minesweeper', weapon: '2 × twin 30 mm, the sweep', text: 'A small North Korean-built sweeper: slow, wooden-hulled, but she cuts a lane through the moored mines for the landing craft.' },
  },
});

export const frosch = craftType({
  id: 'frosch', name: 'Landing Ship (Frosch I)', shortName: 'Frosch',
  names: { pact: ['Hoyerswerda', 'Hagenow', 'Frankfurt (Oder)', 'Eisleben', 'Lübben', 'Schwerin', 'Neubrandenburg', 'Cottbus'], nato: ['L-1'] },
  hull: { length: 98, beam: 11 },
  stats: { draft: 2.2, hp: 3200, armor: 0.06, speed: 8, accel: 0.12, turnRate: 0.1, turretRate: 0.8, radius: 6, height: 14, sight: 1800, ...AA(600, 0.16, 0.04), defence: { point: OSA_SAM, chaff: CHAFF }, damage: 110 },
  mounts: { pact: [gun([0, 8.8, 38], FWD, G57), gun([0, 11.5, -36], AFT, G30)], nato: [] }, // (the 57s on the raised forecastle)
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

// ---------------------------------------------------------------- the Volksmarine's and the KPA navy's own (nva, kpa)
// Each navy its own ships' names and its own words for them; where it sails another class, her model, size (entities/
// UnitStack.js armyType), guns and stats over the side's. (The Polnocny and the Aist stay the Polish and Soviet ships
// that carry the NVA's troops at Hohwacht: the Volksmarine had neither.)
const G25 = { range: 800, reload: 0.4, damage: 30, splash: 1, size: 0.7 };    // (twin 25 mm 2M-3)
const G37 = { range: 900, reload: 0.7, damage: 40, splash: 1.1, size: 0.8 };  // (a single 37 mm)
const G14 = { range: 600, reload: 0.25, damage: 14, splash: 0.4, size: 0.5 }; // (twin 14.5 mm)
/** Give `army` its own entry on ship type `t`. */
export function navy(t, army, { names, model, variant, mounts, stats, type }) {
  if (names) t.names = { ...t.names, [army]: names };
  if (model) t.models = { ...t.models, [army]: model };
  if (variant) t.variants = { ...t.variants, [army]: variant };
  if (mounts) t.mounts = { ...t.mounts, [army]: mounts };
  if (stats) t.factionStats = { ...t.factionStats, [army]: stats };
  if (type) t.armyType = { ...t.armyType, [army]: type };
}

navy(parchim, 'nva', {
  names: ['Wismar', 'Parchim', 'Perleberg', 'Lübz', 'Bützow', 'Waren', 'Teterow', 'Gadebusch', 'Grevesmühlen', 'Bad Doberan', 'Güstrow', 'Angermünde', 'Prenzlau', 'Ludwigslust', 'Sternberg', 'Ribnitz-Damgarten'],
  variant: { name: 'Kleines U-Jagdschiff Projekt 133.1 (Parchim)', weapon: 'twin 57 mm, twin 30 mm, Strela, RBU-6000', text: 'The Volksmarine\'s own sub-hunter, built at Wolgast: her guns cover the boats going in, her missiles and 30 mm the jets diving on them.' },
});
navy(osa, 'nva', {
  names: ['Max Reichpietsch', 'Richard Sorge', 'Albin Köbis', 'Paul Wieczorek', 'August Lütgens', 'Josef Schares', 'Fritz Gast', 'Karl Meseberg', 'Walter Kramer', 'Otto Tost', 'Heinrich Dorrenbach'],
  variant: { name: 'Raketenschnellboot Projekt 205 (Osa I)', weapon: '4 P-15 Termit, 2 × twin 30 mm', text: 'The 6th Flotilla\'s missile boats: four Styx for ships that aren\'t here, and two quick twin 30 mm mounts that rake the beach and the dunes. Small, fast, fragile.' },
});
navy(natya, 'nva', {
  names: ['Kühlungsborn', 'Boltenhagen', 'Ueckermünde', 'Zingst', 'Prerow', 'Graal-Müritz', 'Wolgast', 'Bansin', 'Pasewalk', 'Kamenz', 'Röbel', 'Strasburg'],
  model: buildKondor,
  variant: { name: 'Minenabwehrschiff Kondor II', weapon: '3 × twin 25 mm, the sweep', text: 'The Volksmarine\'s coastal minesweeper, built at Wolgast: where she steams the moored mines are cut — a new lane for the landing ships, or a wider one. Small, slow, three twin 25 mm against the jets.' },
  mounts: [gun([0, 4.8, 15], FWD, G25), gun([0, 7.2, -3.9], AFT, G25), gun([0, 4.8, -6.6], AFT, G25)],
  stats: { hp: 1050, radius: 3.8, height: 8 },
  type: { shortName: 'Kondor II', hull: { length: 56.7, beam: 7.8 }, camera: { distance: 56, height: 17, shoulder: 0 } },
});
navy(frosch, 'nva', {
  names: ['Hoyerswerda', 'Hagenow', 'Frankfurt (Oder)', 'Eisleben', 'Lübben', 'Schwerin', 'Neubrandenburg', 'Cottbus', 'Halle', 'Halberstadt'],
  variant: { name: 'Großes Landungsschiff Projekt 108 (Frosch I)', weapon: 'twin 57 mm, twin 30 mm', text: 'The Volksmarine\'s big landing ship: tanks and IFVs straight onto the beach through her bow doors.' },
});

navy(osa, 'kpa', { names: ['KPN 711', 'KPN 712', 'KPN 713', 'KPN 714', 'KPN 715', 'KPN 716', 'KPN 717', 'KPN 718'] }); // (Soviet-built: the Osa is right, as is her variant above)
navy(natya, 'kpa', {
  names: ['KPN 511', 'KPN 512', 'KPN 513', 'KPN 514', 'KPN 515', 'KPN 516'],
  model: buildYukto,
  variant: { name: 'Yukto-class minesweeper', weapon: '37 mm, twin 14.5 mm, the sweep', text: 'A small North Korean-built sweeper: wooden, slow and lightly armed, but she cuts a lane through the moored mines for the landing craft.' },
  mounts: [gun([0, 2.5, 7], FWD, G37), gun([0, 2.4, -5], AFT, G14)],
  stats: { hp: 380, armor: 0, speed: 6, radius: 2.2, height: 4, eyeHeight: 5, sight: 1000, smallCraft: true, radar: RADAR(1000, 5), ...AA(400, 0.1, 0.02) },
  type: { shortName: 'Yukto', hull: { length: 24, beam: 4.4 }, camera: { distance: 30, height: 10, shoulder: 0 } },
});
navy(aist, 'kpa', {
  names: ['KPN 3101', 'KPN 3102', 'KPN 3103', 'KPN 3104', 'KPN 3105', 'KPN 3106', 'KPN 3107', 'KPN 3108'],
  model: buildKongBang,
  variant: { name: 'Kong Bang assault hovercraft', weapon: 'twin 14.5 mm', text: 'The North\'s own hovercraft, built by the hundred for one job: a platoon of sea-landing infantry over the mud and the mines at speed, straight up the beach.' },
  mounts: [gun([0, 5.6, 5], FWD, G14)],
  stats: { hp: 450, radius: 3.6, height: 5, eyeHeight: 6, speed: 17 },
  type: { shortName: 'Kong Bang', hull: { length: 21, beam: 8.4 }, camera: { distance: 34, height: 11, shoulder: 0 } },
});
navy(polnocny, 'kpa', {
  names: ['KPN 2321', 'KPN 2322', 'KPN 2323', 'KPN 2324', 'KPN 2325', 'KPN 2326', 'KPN 2327', 'KPN 2328'],
  model: buildHantae,
  variant: { name: 'Hantae-class landing ship', weapon: '4 × twin 25 mm', text: 'The North\'s own medium landing ship: three or four tanks or a company of naval infantry, onto the beach through her bow doors.' },
  mounts: [gun([-1.6, 3.6, -10.3], FWD, G25), gun([1.6, 3.6, -10.3], FWD, G25), gun([0, 7, -20.2], AFT, G25), gun([0, 3.6, -22.4], AFT, G25)],
  stats: { hp: 1300, radius: 3.6, height: 9 },
  type: { shortName: 'Hantae', hull: { length: 48, beam: 6.6 }, camera: { distance: 58, height: 17, shoulder: 0 } },
});

// NATO's landing craft, 1985 (the Pact's are above). Real boats on the 1944
// frames they grew out of: the Bundesmarine's Type 520 (Barbe class, 22 built for the Baltic: a 40 m ramped LCU, the
// wheelhouse aft — the LCT's lines) and the US Navy's LCVP Mk 7 (still the Higgins boat's shape, off the amphibious ships).
export const lcu520 = craftType({
  engine: 'engine.diesel',
  id: 'lcu520', name: 'Landing Craft (Type 520)', shortName: 'Type 520',
  names: { nato: ['Barbe', 'Delphin', 'Dorsch', 'Felchen', 'Forelle', 'Hering', 'Karpfen', 'Lachs', 'Renke', 'Salm', 'Stör', 'Zander'], pact: ['L-1'],
    us: ['LCU 1614', 'LCU 1617', 'LCU 1627', 'LCU 1631', 'LCU 1641', 'LCU 1645', 'LCU 1655', 'LCU 1660'] },
  hull: { length: 40, beam: 8.8 },
  stats: { draft: 1.4, hp: 1300, armor: 0.06, speed: 7.5, accel: 0.4, turnRate: 0.17, turretRate: 1, radius: 5, height: 5, eyeHeight: 6, sight: 600, smallCraft: true, range: 0, aggroRange: 0, preferredRange: 0, damage: 0 },
  mounts: { nato: [], pact: [] },
  camera: { distance: 60, height: 18, shoulder: 0 },
  models: { nato: buildType520, pact: buildLCT, bw: buildType520, us: buildLCU1610 },
  // the US Navy's own: the LCU-1610 off the dock landing ships (entities/UnitStack.js armyType)
  armyType: { us: { shortName: 'LCU', hull: { length: 41, beam: 9 } } },
  variants: { us: { name: 'LCU-1610 utility landing craft', weapon: '2 × .50 machine guns', text: 'The US Navy’s utility landing craft, carried in the well decks of the amphibious ships: an M60 or a platoon of Marines straight onto the sand through the bow ramp. Slow and big on the run in.' },
    bw: { name: 'Landungsboot Klasse 520 (Barbe)', weapon: '2 × 20 mm', text: 'The Bundesmarine’s landing craft, built for the Baltic: a Leopard or a company of Panzergrenadiere straight onto the sand through the bow ramp. Slow and big on the run in.' },
    nato: { name: 'Type 520 landing craft (Barbe class)', weapon: '2 × 20 mm', text: 'The Bundesmarine’s landing craft, built for the Baltic: a Leopard or a company of Panzergrenadiere straight onto the sand through the bow ramp. Slow and big on the run in.' }, pact: { name: 'Landing craft', weapon: '—', text: 'A landing craft.' } },
});
export const lcvp85 = craftType({
  engine: 'engine.dieselSmall',
  id: 'lcvp85', name: 'Landing Craft (LCVP Mk 7)', shortName: 'LCVP',
  names: { nato: ['LCVP 1', 'LCVP 2', 'LCVP 3', 'LCVP 4', 'LCVP 5', 'LCVP 6', 'LCVP 7', 'LCVP 8'], pact: ['L-2'], bw: ['LCM 1', 'LCM 2', 'LCM 3', 'LCM 4', 'LCM 5', 'LCM 6', 'LCM 7', 'LCM 8'] },
  hull: { length: 10.9, beam: 3.3 },
  stats: { draft: 0.9, hp: 300, armor: 0.04, speed: 9, accel: 0.8, turnRate: 0.45, turretRate: 1, radius: 2.4, height: 2.6, eyeHeight: 3, sight: 400, smallCraft: true, stealth: 0.4, range: 0, aggroRange: 0, preferredRange: 0, damage: 0 },
  mounts: { nato: [], pact: [] },
  camera: { distance: 26, height: 9, shoulder: 0 },
  models: { nato: buildLCVP, pact: buildLCVP, bw: buildLCM521 },
  // the Bundesmarine's small craft is the bigger LCM (entities/UnitStack.js armyType)
  armyType: { bw: { shortName: 'Type 521', hull: { length: 23.6, beam: 6.4 }, camera: { distance: 38, height: 12, shoulder: 0 } } },
  factionStats: { bw: { hp: 450, radius: 3.4, height: 3.4, eyeHeight: 3.6, stealth: 0.6 } },
  variants: { bw: { name: 'Landungsboot Klasse 521 (LCM)', weapon: '—', text: 'The Bundesmarine’s small landing craft, an LCM: a platoon of Panzergrenadiere from the ships to the beach, the ramp down, out.' },
    nato: { name: 'LCVP Mk 7', weapon: '—', text: 'The amphibious ships’ small landing craft: a squad from the ship to the beach, the ramp down, out. Forty years on, still the Higgins boat.' }, pact: { name: 'Landing craft', weapon: '—', text: 'A small landing craft.' } },
});

// the Marines sail the US Navy's boats (data/epoch.js navyOf)
for (const t of [natya, lcu520]) for (const k of ['names', 'models', 'mounts', 'armyType', 'factionStats', 'variants']) if (t[k]?.us) t[k].usmc = t[k].us;

export const BALTIC_85 = { parchim, osa, natya, frosch, polnocny, aist, lcu520, lcvp85 }; // (+ the swimmers, below; NATO's boats for its landings: Wismar Bay, Nampo …)

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
export const swimmer = (id, of, sink) => craftType({
  id, name: `${of.name} (swimming)`, shortName: 'Afloat', engine: 'engine.dieselSmall',
  hull: { length: 7, beam: 3 },
  stats: { swims: true, draft: 1.2, hp: 400, armor: 0.08, speed: 3.5, accel: 0.5, turnRate: 0.3, turretRate: 1, radius: 2.4, height: 1.6, eyeHeight: 2, sight: 400, smallCraft: true, stealth: 0.5,
    range: 0, aggroRange: 0, preferredRange: 0, leash: 20, damage: 0 },
  mounts: { pact: [], nato: [] },
  camera: { distance: 18, height: 6, shoulder: 0 },
  models: Object.fromEntries(Object.entries(of.models).map(([k, b]) => [k, afloat(b, sink)])),
  variants: Object.fromEntries(Object.entries(of.variants ?? {}).map(([k, v]) => [k, { name: `${v.name} (afloat)`, weapon: '— (afloat)', text: 'An amphibious vehicle swimming in: it can\'t fire till it is ashore.' }])), // (each army's own vehicle)
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

// the KPA's (Nampo): the HY-2 Silkworm — the launcher towed in behind a truck and set down, the Square Tie radar on its
// truck beside it (the first of the two the launcher: type.specialist). A big, high-flying missile, not a sea-skimmer.
coastMissile.models = { ...coastMissile.models, kpa: buildKpaHY2Radar };
coastMissile.variants.kpa = { name: 'HY-2 Silkworm battery', weapon: 'HY-2 launcher, Square Tie radar', text: 'The Chinese Styx on its towed launcher, the radar truck beside it: a big missile at the biggest ship in reach, then the launcher is hitched up and away to a new hide. Find it before it finds the battleship.' };
coastMissile.factionStats = { kpa: { towed: { deploy: 15 }, antiShip: { name: 'HY-2', range: 2800, reload: 80, load: 4, count: 1, speed: 220, damage: 1200, pierce: 0.6, seeker: 1200, alt: 30 } } };
coastMissile.armyType = { kpa: { specialist: { count: 1, stats: {} }, specialistModels: { kpa: buildKpaHY2 } } };

Object.assign(BALTIC_85, { coastMissile });
