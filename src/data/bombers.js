// The bombers per war (systems/AirStrike.js KINDS lightBomber / heavyBomber; data/epoch.js puts a war's own
// into KINDS): a flight from the side's airfields, level over the spot, a stick of bombs along the line.
//   lightBomber – twins and strike jets lower down: a short, dense stick
//   heavyBomber – the big ones high up: a long carpet
// `bombs` per plane over KINDS' (count, damage, splash, crater), `flight` the war's own speeds and heights.
// Keyed like the rest: an army without its own flies its side's (forArmy).
import { plane } from './models/ww1Aircraft.js';
import { buildB26, buildJu88, buildB17, buildPe8, buildHe177, buildF111, buildTornado, buildSu24M, buildTu22M3, buildB1B, buildB52 } from './models/bombers.js';
import { buildSovPe2 } from './models/ww2Aircraft.js';
import { buildNatoF15 } from './models/fighters.js';
import { buildF16, buildSu35 } from './models/aircraft2027.js';

const NOGUN = { rate: 1, damage: 0, splash: 0, vsArmor: 0, pierce: 0, speed: 600, tracer: 0, size: 0.5, sound: 'nato.mg' };
const paint = (colors, scale = 0.8) => ({ colors, scale });
const OD = paint([0x4d4f34, 0x45472e, 0x55573a, 0x4a4c32]);
const SOVG = paint([0x4f5a34, 0x2a2c22, 0x56603a, 0x3a4428], 0.6);
const RLM = paint([0x5a6248, 0x434a36, 0x6a7058, 0x4e5540], 0.6);
const PC10 = paint([0x4e4a30, 0x48442c, 0x535034, 0x45412a], 0.9);
const LOZENGE = paint([0x5a5a6a, 0x6e5a6a, 0x4f5a48, 0x7a6e58], 0.35);
const FRANCE = paint([0x8a7a4e, 0x55603a, 0x6a4a30, 0xb8aa80], 0.7);
const EURO = paint([0x4a5244, 0x3a4038, 0x555c4c, 0x2f342c], 0.8);
const LW = paint([0x4e5440, 0x5c6150, 0x3f4436, 0x60645a], 0.7);
const GREY = paint([0x6e7479, 0x5f656a, 0x7a8085, 0x666c71], 0.9);
const RU = paint([0x8b928e, 0x7d8480, 0x969d99, 0x848b87], 1.1);
const TU = paint([0xa0a6a6, 0x959b9b, 0xabb1b1, 0x9aa0a0], 1.4);
const FLANKER = paint([0x5f6f7a, 0x7a8a96, 0x4a5862, 0x6c7c88], 1.2);
const DARKGREY = paint([0x4a4e52, 0x44484c, 0x50545a, 0x3e4246], 1.2);
const B52 = paint([0x5a6058, 0x4a5048, 0x646a60, 0x52584e], 1.2);

const prop = { engineSound: 'prop', gun: NOGUN };
const jet = { engineSound: 'jet', gun: NOGUN };
const B18 = { count: 4, damage: 320, splash: 5, crater: 0.4 };
const H18 = { count: 8, damage: 450, splash: 7, crater: 0.6 };
const SLOW18 = { cruiseSpeed: 48, attackSpeed: 45, cruiseAlt: 120, attackAlt: 100, approach: 1200 };
const HEAVY18 = { cruiseSpeed: 40, attackSpeed: 38, cruiseAlt: 160, attackAlt: 150, approach: 1200 };
const B45 = { count: 6, damage: 700, splash: 10, crater: 0.9 };
const H45 = { count: 10, damage: 800, splash: 11, crater: 1.0 };
const MED45 = { cruiseSpeed: 95, attackSpeed: 90, cruiseAlt: 200, attackAlt: 160, approach: 2000 };
const HEAVY45 = { cruiseSpeed: 85, attackSpeed: 80, cruiseAlt: 320, attackAlt: 300, approach: 2600, flight: 4 };

export const BOMBERS = {
  1918: {
    lightBomber: {
      nato: { ...prop, name: 'Airco DH.4', weapon: 'Vickers · Lewis · 2 × 230 lb bombs', text: 'The best day bomber of the war: fast enough to leave most fighters behind, a stick of bombs on the line.', model: plane('dh4', { color: 0x4e4a30, kind: 'uk', span: 6.0, len: 8.2, seats: 2, bombs: 2 }), paint: PC10, hp: 8, bombs: B18, flight: SLOW18 },
      fr: { ...prop, name: 'Breguet 14 B2', weapon: 'Vickers · twin Lewis · 32 bombs', text: 'The French bomber in its bombing version: racks of small bombs under the lower wing.', model: plane('breguetB2', { color: 0x8a7a4e, kind: 'fr', span: 5.2, len: 7.0, seats: 2, bombs: 4 }), paint: FRANCE, hp: 7, bombs: B18, flight: SLOW18 },
      pact: { ...prop, name: 'DFW C.V', weapon: 'Spandau · Parabellum · bombs', text: 'The two-seater of the German army cooperation units, here with bombs along the line.', model: plane('dfwC5', { color: 0x6a6e60, kind: 'de', span: 5.6, len: 7.8, seats: 2, bombs: 2 }), paint: LOZENGE, hp: 7, bombs: B18, flight: SLOW18 },
    },
    heavyBomber: {
      nato: { ...prop, name: 'Handley Page O/400', weapon: '3 × Lewis · 16 × 112 lb bombs', text: 'The bloody paralyser: twin engines, a wingspan of a hundred feet and a long stick of bombs.', model: plane('o400', { color: 0x4e4a30, kind: 'uk', span: 9.0, len: 12.0, seats: 2, engines: 2, bombs: 4 }), paint: PC10, hp: 12, bombs: H18, flight: HEAVY18 },
      pact: { ...prop, name: 'Gotha G.V', weapon: '2 × Parabellum · bombs', text: 'The Gothas that bombed London: two engines, a gun in the nose and the tail, bombs across the line.', model: plane('gotha', { color: 0x6a6e60, kind: 'de', span: 9.5, len: 11.8, seats: 2, engines: 2, bombs: 4 }), paint: LOZENGE, hp: 12, bombs: H18, flight: HEAVY18 },
    },
  },
  1945: {
    lightBomber: {
      nato: { ...prop, name: 'B-26 Marauder', weapon: '4,000 lb of bombs · .50 cals', text: 'The Ninth Air Force’s medium bomber: a flight in at a few thousand feet, sticks across the target.', model: buildB26, paint: OD, hp: 10, bombs: B45, flight: MED45 },
      sov: { ...prop, name: 'Pe-2', weapon: 'FAB-100 bombs', text: 'The Peshka: fast twin-engined dive and level bomber of the Red Air Force, bombs in a short stick.', model: buildSovPe2, paint: SOVG, hp: 9, bombs: B45, flight: MED45 },
      pact: { ...prop, name: 'Ju 88 A-4', weapon: 'SC 250 bombs · MG 81', text: 'The Luftwaffe’s workhorse bomber, flying what fuel allows in the last winter.', model: buildJu88, paint: RLM, hp: 9, bombs: B45, flight: MED45 },
    },
    heavyBomber: {
      nato: { ...prop, name: 'B-17G Flying Fortress', weapon: '13 × .50 cal · 6,000 lb of bombs', text: 'Four engines and a box of guns: high over the target, the bombardier sees the spot, and a carpet of bombs falls along the line.', model: buildB17, paint: paint([0xb4b7b6, 0xa9acab, 0xbfc2c1, 0xa2a5a4], 1.2), hp: 16, bombs: H45, flight: HEAVY45 },
      sov: { ...prop, name: 'Pe-8', weapon: 'FAB-250 / FAB-500 bombs', text: 'The Soviet four-engined bomber of the long-range aviation: few, but big.', model: buildPe8, paint: SOVG, hp: 15, bombs: H45, flight: HEAVY45 },
      pact: { ...prop, name: 'He 177 A-5 Greif', weapon: 'SC 500 bombs', text: 'The Luftwaffe’s only heavy bomber: two coupled engines in each nacelle, and a habit of catching fire.', model: buildHe177, paint: RLM, hp: 14, bombs: H45, flight: HEAVY45 },
    },
  },
  1985: {
    lightBomber: {
      nato: { ...jet, name: 'F-111F Aardvark', weapon: '12 × Mk 82 bombs', text: 'The swing-wing strike jet from Lakenheath: low and fast in, wings swept, a stick along the line.', model: buildF111, paint: EURO, hp: 10 },
      bw: { ...jet, name: 'Tornado IDS', weapon: 'BL755 · Mk 82', text: 'The Luftwaffe’s strike jet, Jagdbombergeschwader 31 to 34: a pair low over the target, bombs across it.', model: buildTornado, paint: LW, hp: 10 },
      pact: { ...jet, name: 'Su-24M Fencer', weapon: 'FAB-500 bombs', text: 'The Soviet swing-wing frontline bomber: fast, low, a heavy stick on the line.', model: buildSu24M, paint: RU, hp: 10 },
    },
    heavyBomber: {
      nato: { ...jet, name: 'B-52G Stratofortress', weapon: '51 × Mk 82 bombs', text: 'A cell of B-52s from England: nothing to hear until the ground starts heaving under a carpet a kilometre long.', model: buildB52, paint: B52, hp: 18 },
      pact: { ...jet, name: 'Tu-22M3 Backfire', weapon: '69 × FAB-250 bombs', text: 'The long-range swing-wing bomber, here over the front: a long carpet along the line.', model: buildTu22M3, paint: TU, hp: 16 },
    },
  },
  2027: {
    lightBomber: {
      nato: { ...jet, name: 'F-15E Strike Eagle', weapon: 'GBU-39 · Mk 82', text: 'The two-seat strike Eagle: a pair over the line, a stick of bombs walked along it.', model: buildNatoF15, paint: DARKGREY, hp: 10 },
      pl: { ...jet, name: 'F-16C Jastrząb', weapon: 'Mk 82 · GBU-12', text: 'Polish F-16s in the strike role: bombs in a stick along the line.', model: buildF16, paint: GREY, hp: 9 },
      pact: { ...jet, name: 'Su-34 Fullback', weapon: 'FAB-500 with UMPK glide kits', text: 'The side-by-side strike Flanker: a heavy stick on the line from a height the air defence has to reach.', model: buildSu35, paint: FLANKER, hp: 11 },
      by: { ...jet, name: 'Su-24M', weapon: 'FAB-250 bombs', text: 'Belarus’s old swing-wing bombers, still flying.', model: buildSu24M, paint: RU, hp: 9 },
    },
    heavyBomber: {
      nato: { ...jet, name: 'B-1B Lancer', weapon: '84 × Mk 82 bombs', text: 'The Bone: in low and fast, wings swept, a carpet of bombs along a kilometre of the line.', model: buildB1B, paint: DARKGREY, hp: 18 },
      pact: { ...jet, name: 'Tu-22M3M Backfire', weapon: 'FAB-250 / FAB-500 bombs', text: 'The Backfire over the front: the long-range bomber laying a carpet along the line.', model: buildTu22M3, paint: TU, hp: 16 },
    },
  },
};

/** The 1985 ones (systems/AirStrike.js KINDS' own, as AIR_1985). */
export const LIGHT_BOMBERS = BOMBERS[1985].lightBomber;
export const HEAVY_BOMBERS = BOMBERS[1985].heavyBomber;
