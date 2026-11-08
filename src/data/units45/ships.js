// 1945 warships, the open-sea maps only (the Pacific: the US Navy on the `nato` side, the Imperial
// Japanese Navy on the `pact` side). One ship a stack. Ranges and speeds are the game's sea scale
// (the open-sea maps are ~5 km: real gun ranges of 15–40 km would cover all of it), layered so the
// bigger ship outranges the smaller.
// `mounts` per side: each gun mount fires on its own (entities/UnitStack.js updateShipWeapons) when
// the target bears within its arc — `facing` 0 over the bow, π over the stern, `arc` its full
// width; a torpedo mount (`torpedo`) fires a spread to whichever beam the target is on
// (systems/Torpedoes.js). `at`: where the shells leave, in the ship's frame (bow +z).
// `hull`: length and beam, for torpedoes and the damage parts.
import { buildFletcher, buildKagero, buildBuckley, buildKaibokan, buildBaltimore, buildTakao, buildIowa, buildYamato } from '../models/ships1945.js';

const NAVAL = { naval: true, eyeHeight: 18, aimHeight: 4, nightSight: undefined, crew: 0, breakMorale: 0, smoke: undefined, grenades: 0, lightAT: 0, fov: 6.3, burst: 1, burstInterval: 0, aimTime: 1, magSize: 9999, reloadTime: 1, antiArmor: true, tracer: 1 };
const FWD = 0;
const AFT = Math.PI;

/** A gun mount. */
const gun = (at, facing, o) => ({ at, facing, arc: 4.6, spread: 0.01, splash: 4, pierce: 0.3, shell: 900, size: 1.8, ...o });
/** A torpedo mount: a spread to the beam the target is on. */
const torps = (at, o) => ({ at, torpedo: true, arc: 2.2, count: 4, range: 1500, speed: 22, damage: 2600, reload: 90, ...o });

/** One warship class: the shared parts, the class's own, the two navies' mounts. */
const ship = (o) => ({
  category: 'naval', kind: 'vehicle', role: 'fighter',
  formation: { count: 1, columns: 1, spacing: 0 },
  weaponSound: 'cannon', engine: 'engine.diesel',
  ...o,
  stats: { ...NAVAL, weapon: 'cannon', ...o.stats },
});

const FIVE_INCH = { range: 2400, reload: 3.5, damage: 220, splash: 4, pierce: 0.3 };
const DD_JP = { range: 2400, reload: 4.5, damage: 260, splash: 4, pierce: 0.3 };

export const frigate = ship({
  id: 'frigate', name: 'Escort', shortName: 'Escort', cost: 280,
  hull: { length: 93, beam: 11 },
  stats: { hp: 2600, armor: 0.1, speed: 11.5, accel: 0.15, turnRate: 0.12, turretRate: 0.6, radius: 6, height: 8, sight: 2200, range: 1700, aggroRange: 1700, preferredRange: 1200, leash: 50, damage: 160, fireCooldown: 3, spread: 0.012, boltSpeed: 850, boltSize: 1.4, splash: 3, pierce: 0.2 },
  mounts: {
    nato: [gun([0, 6, 38], FWD, { range: 1700, reload: 3, damage: 150 }), gun([0, 8, 31], FWD, { range: 1700, reload: 3, damage: 150 }), gun([0, 6, -26], AFT, { range: 1700, reload: 3, damage: 150 })],
    pact: [gun([0, 6, 32], FWD, { range: 1700, reload: 3.5, damage: 170 }), gun([0, 6, -22], AFT, { range: 1700, reload: 4, damage: 2 * 170 / 1.6 })],
  },
  camera: { distance: 80, height: 26, shoulder: 0 },
  models: { nato: buildBuckley, pact: buildKaibokan },
  variants: {
    nato: { name: 'Buckley-class destroyer escort', weapon: '3 × 3-inch/50, depth charges', text: 'The convoy escort: slower and lighter armed than a destroyer, but cheap, handy, and built to hunt submarines.' },
    pact: { name: 'Kaibōkan escort', weapon: '12 cm guns, depth charges', text: 'The Imperial Navy\'s escort ship, built in numbers late in the war to guard the convoys.' },
  },
});

export const destroyer = ship({
  id: 'destroyer', name: 'Destroyer', shortName: 'Destroyer', cost: 450,
  hull: { length: 115, beam: 12 },
  stats: { hp: 4200, armor: 0.2, speed: 16, accel: 0.12, turnRate: 0.09, turretRate: 0.5, radius: 7, height: 10, sight: 2600, range: 2400, aggroRange: 2400, preferredRange: 1600, leash: 60, damage: 220, fireCooldown: 3.5, spread: 0.012, boltSpeed: 900, boltSize: 1.8, splash: 4, pierce: 0.3 },
  mounts: {
    nato: [gun([0, 7, 48], FWD, FIVE_INCH), gun([0, 10, 41], FWD, FIVE_INCH), gun([0, 10, -20], AFT, FIVE_INCH), gun([0, 7, -38], AFT, FIVE_INCH), gun([0, 7, -47], AFT, FIVE_INCH),
      torps([0, 7, 0], { count: 5, range: 1400, speed: 22 }), torps([0, 7, -9], { count: 5, range: 1400, speed: 22 })],
    pact: [gun([0, 7.5, 45], FWD, DD_JP), gun([0, 10.5, -21], AFT, DD_JP), gun([0, 7.5, -40], AFT, DD_JP),
      torps([0, 7, -6], { count: 4, range: 2200, speed: 25, damage: 3200, reload: 120, wakeless: true }), torps([0, 7, 20], { count: 4, range: 2200, speed: 25, damage: 3200, reload: 120, wakeless: true })],
  },
  camera: { distance: 95, height: 32, shoulder: 0 },
  models: { nato: buildFletcher, pact: buildKagero },
  variants: {
    nato: { name: 'Fletcher-class destroyer', weapon: '5 × 5-inch/38, 10 torpedo tubes', text: 'The workhorse of the US Navy in the Pacific: fast, well armed, radar-directed guns. Screens the big ships, hunts submarines, makes torpedo runs.' },
    pact: { name: 'Kagerō-class destroyer', weapon: '6 × 12.7 cm, 8 Long Lance torpedoes', text: 'The fleet destroyer of the Imperial Navy: its Long Lance torpedoes reach further than any enemy\'s and leave no wake to see them coming.' },
  },
});

const EIGHT_INCH = { range: 3000, reload: 9, damage: 700, splash: 7, pierce: 0.55, shell: 950, size: 2.6, spread: 0.009 };
const TWENTY_CM = { range: 3000, reload: 10, damage: 560, splash: 7, pierce: 0.55, shell: 950, size: 2.6, spread: 0.009 };

export const cruiser = ship({
  id: 'cruiser', name: 'Heavy Cruiser', shortName: 'Cruiser', cost: 750, limit: 3,
  hull: { length: 205, beam: 21 },
  stats: { hp: 11000, armor: 0.45, speed: 15, accel: 0.08, turnRate: 0.065, turretRate: 0.3, radius: 10, height: 16, sight: 3000, range: 3000, aggroRange: 3000, preferredRange: 2200, leash: 80, damage: 700, fireCooldown: 9, spread: 0.009, boltSpeed: 950, boltSize: 2.6, splash: 7, pierce: 0.55 },
  mounts: {
    nato: [gun([0, 10, 74], FWD, EIGHT_INCH), gun([0, 13, 60], FWD, EIGHT_INCH), gun([0, 10, -62], AFT, EIGHT_INCH)],
    pact: [gun([0, 9, 78], FWD, TWENTY_CM), gun([0, 12, 67], FWD, TWENTY_CM), gun([0, 9, 56], FWD, TWENTY_CM), gun([0, 12, -52], AFT, TWENTY_CM), gun([0, 9, -64], AFT, TWENTY_CM),
      torps([8, 8, -8], { count: 4, range: 2200, speed: 25, damage: 3200, reload: 150, wakeless: true }), torps([-8, 8, -8], { count: 4, range: 2200, speed: 25, damage: 3200, reload: 150, wakeless: true })],
  },
  camera: { distance: 150, height: 45, shoulder: 0 },
  models: { nato: buildBaltimore, pact: buildTakao },
  variants: {
    nato: { name: 'Baltimore-class heavy cruiser', weapon: '9 × 8-inch, 12 × 5-inch', text: 'Big, fast and bristling with anti-aircraft guns: the carriers\' bodyguard and a hard hitter in a surface fight.' },
    pact: { name: 'Takao-class heavy cruiser', weapon: '10 × 20 cm, 8 Long Lance torpedoes', text: 'Heavily armed for its size, with the Long Lance as well as its guns — deadly in a night action.' },
  },
});

const SIXTEEN_INCH = { range: 4000, reload: 30, damage: 2400, splash: 12, pierce: 0.8, shell: 1000, size: 4, spread: 0.008 };
const FORTY_SIX_CM = { range: 4000, reload: 36, damage: 2900, splash: 14, pierce: 0.85, shell: 1000, size: 4.4, spread: 0.008 };
const SECONDARY = (at, facing) => gun(at, facing, { range: 2200, reload: 4, damage: 220, splash: 4, pierce: 0.3, arc: 2.6 });

export const battleship = ship({
  id: 'battleship', name: 'Battleship', shortName: 'Battleship', cost: 1300, limit: 1,
  hull: { length: 262, beam: 33 },
  stats: { hp: 26000, armor: 0.7, speed: 15, accel: 0.06, turnRate: 0.05, turretRate: 0.2, radius: 14, height: 30, sight: 3600, range: 4000, aggroRange: 4000, preferredRange: 3000, leash: 100, damage: 2400, fireCooldown: 30, spread: 0.008, boltSpeed: 1000, boltSize: 4, splash: 12, pierce: 0.8 },
  factionStats: { pact: { hp: 30000, armor: 0.75, speed: 13.5 } },   // Yamato: the heaviest armour afloat, slower
  mounts: {
    nato: [gun([0, 13, 96], FWD, SIXTEEN_INCH), gun([0, 17, 78], FWD, SIXTEEN_INCH), gun([0, 13, -78], AFT, SIXTEEN_INCH), SECONDARY([11, 12, 20], Math.PI / 2), SECONDARY([-11, 12, 20], -Math.PI / 2), SECONDARY([11, 12, -20], Math.PI / 2), SECONDARY([-11, 12, -20], -Math.PI / 2)],
    pact: [gun([0, 14, 92], FWD, FORTY_SIX_CM), gun([0, 19, 74], FWD, FORTY_SIX_CM), gun([0, 14, -74], AFT, FORTY_SIX_CM), SECONDARY([12.5, 13, 8], Math.PI / 2), SECONDARY([-12.5, 13, 8], -Math.PI / 2)],
  },
  camera: { distance: 200, height: 60, shoulder: 0 },
  models: { nato: buildIowa, pact: buildYamato },
  variants: {
    nato: { name: 'Iowa-class battleship', weapon: '9 × 16-inch, 20 × 5-inch', text: 'The fastest battleship ever built: nine 16-inch guns, a wall of anti-aircraft fire, radar fire control.' },
    pact: { name: 'Yamato', weapon: '9 × 46 cm, 6 × 15.5 cm', text: 'The biggest battleship ever built: the heaviest guns and armour afloat. Slower than the Iowa — and there is only one.' },
  },
});

export const SHIPS_1945 = { frigate, destroyer, cruiser, battleship };
