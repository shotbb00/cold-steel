// 1918 air support (data/epoch.js swaps these into systems/AirStrike.js KINDS): per kind, each army's
// own aircraft — `nato` the British (the RAF from April 1918), `fr` the French, `pact` the German Army's
// air service, `st` the Schlachtstaffeln that flew with the storm troops. Biplanes: slow, low, rifle-
// calibre machine guns and small bombs (`flight`: their own speeds and heights over KINDS').
//   jet    – ground attack: down low along a line, machine guns and a few small bombs
//   cap    – fighter patrol: circles the spot, dives on enemy aircraft with its guns
//   recon  – the spotter: one run along the line, what it sees shows on the map
// At sea (the North Sea maps: KINDS' sea missions, from the shore stations unless HMS Furious has them aboard —
// data/epoch.js makes every 1918 sea mission's deck optional):
//   navCap   – fighter cover: the Ship's Camel / the Brandenburg seaplane fighter, circling the spot
//   torpBomb – the torpedo seaplanes: low over the water, a torpedo into the ship nearest the spot
//   navScout – air scouting: the Zeppelin (a long slow leg, seeing far) / the Felixstowe flying boat
//   asw      – the sub hunt: a flying boat or patrol seaplane along a line, bombs on the boat it finds
import { plane, zeppelin } from './models/ww1Aircraft.js';
import type { Aircraft } from '../types.ts';

const VICKERS = { rate: 14, damage: 70, splash: 0.3, vsArmor: 0.04, pierce: 0.1, speed: 750, tracer: 0.25, size: 0.6, sound: 'nato.mg' };   // twin rifle-calibre guns
const SPANDAU = { ...VICKERS, sound: 'pact.mg' };
const BOMBS = { count: 4, interval: 0.3, damage: 300, splash: 4.5, vsArmor: 0.5, pierce: 0.3, speed: 60, sound: 'heli.rocket' };
const NOGUN = { rate: 1, damage: 0, splash: 0, vsArmor: 0, pierce: 0, speed: 600, tracer: 0, size: 0.5, sound: 'nato.mg' };
const PC10 = { colors: [0x4e4a30, 0x48442c, 0x535034, 0x45412a] as [number, number, number, number], scale: 0.9 };   // British khaki-green dope
const FRANCE = { colors: [0x8a7a4e, 0x55603a, 0x6a4a30, 0xb8aa80] as [number, number, number, number], scale: 0.7 }; // French five-colour camouflage
const LOZENGE = { colors: [0x5a5a6a, 0x6e5a6a, 0x4f5a48, 0x7a6e58] as [number, number, number, number], scale: 0.35 }; // the printed lozenge fabric
const STREAK = { colors: [0x5a6040, 0x4a5236, 0x6a6a48, 0x55603a] as [number, number, number, number], scale: 0.6 };
const SLOW = { cruiseSpeed: 50, attackSpeed: 44, cruiseAlt: 55, attackAlt: 22, approach: 900, gunFrom: 280, gunTo: 60, rocketsFrom: 160 };
const FIGHT = { cruiseSpeed: 56, attackSpeed: 52, cruiseAlt: 110, attackAlt: 110, approach: 900, orbit: 130 };
const SPOT = { cruiseSpeed: 45, attackSpeed: 42, cruiseAlt: 80, attackAlt: 70, approach: 900 };
type Plane = Aircraft & { flight?: Record<string, number> };

const STRIKE: Record<string, Plane> = {
  nato: { name: 'Sopwith Salamander', weapon: '2 × Vickers · 4 × 20 lb Cooper bombs', text: 'An armoured Snipe built to fly low over the trenches: bombs into the line, then the guns along it.', model: plane('salamander', { color: 0x4e4a30, kind: 'uk', rotary: true, bombs: 2 }), paint: PC10, engineSound: 'prop', gun: VICKERS, rockets: BOMBS, hp: 7, flight: SLOW },
  fr: { name: 'Breguet 14', weapon: 'Vickers · twin Lewis · bombs', text: 'The French day bomber in aluminium and fabric: a row of bombs along the line, the observer firing back.', model: plane('breguet', { color: 0x8a7a4e, kind: 'fr', span: 5.2, len: 7.0, seats: 2, bombs: 3 }), paint: FRANCE, engineSound: 'prop', gun: VICKERS, rockets: { ...BOMBS, count: 6 }, hp: 7, flight: SLOW },
  pact: { name: 'Junkers J.I', weapon: '2 × MG 08/15 · grenades', text: 'The "furniture van": all metal, armoured round its engine and crew, it flew low over the front almost untouchable by rifles.', model: plane('junkersJ1', { color: 0x6a6e60, kind: 'de', span: 5.4, len: 6.5, seats: 2, armour: true, bombs: 2 }), paint: STREAK, engineSound: 'prop', gun: SPANDAU, rockets: BOMBS, hp: 11, flight: SLOW },
  st: { name: 'Halberstadt CL.II', weapon: 'MG 08/15 · Parabellum · grenades', text: 'The Schlachtstaffel two-seater: in front of the storm troops at tree-top height, the observer throwing grenades over the side.', model: plane('halberstadt', { color: 0x5a6040, kind: 'de', span: 4.4, len: 5.9, seats: 2, bombs: 2 }), paint: STREAK, engineSound: 'prop', gun: SPANDAU, rockets: BOMBS, hp: 6, flight: SLOW },
};
const FIGHTER: Record<string, Plane> = {
  nato: { name: 'Sopwith Camel', weapon: '2 × Vickers', text: 'Tricky to fly, deadly in a turn: the fighter that shot down more German aircraft than any other.', model: plane('camel', { color: 0x4e4a30, kind: 'uk', span: 4.2, len: 5.7, rotary: true }), paint: PC10, engineSound: 'prop', gun: VICKERS, hp: 5, guns: true, flight: FIGHT },
  fr: { name: 'SPAD XIII', weapon: '2 × Vickers', text: 'Fast and strong: the French aces\' fighter — and the Americans\' — diving on its prey.', model: plane('spad', { color: 0xb8aa80, kind: 'fr', span: 4.05, len: 6.2 }), paint: FRANCE, engineSound: 'prop', gun: VICKERS, hp: 6, guns: true, flight: FIGHT },
  pact: { name: 'Fokker D.VII', weapon: '2 × MG 08/15', text: 'The best fighter of the war: the Armistice named it, of all Germany\'s aircraft, to be handed over.', model: plane('dvii', { color: 0x5a5a6a, kind: 'de', span: 4.4, len: 7.0 }), paint: LOZENGE, engineSound: 'prop', gun: SPANDAU, hp: 6, guns: true, flight: FIGHT },
  st: { name: 'Fokker Dr.I', weapon: '2 × MG 08/15', text: 'The triplane: slow, but it climbs and turns like nothing else.', model: plane('dr1', { color: 0x5a6040, kind: 'de', span: 3.6, len: 5.8, wings: 3, rotary: true }), paint: STREAK, engineSound: 'prop', gun: SPANDAU, hp: 5, guns: true, flight: FIGHT },
};
const SPOTTER: Record<string, Plane> = {
  nato: { name: 'R.E.8', weapon: 'camera, wireless', text: 'The "Harry Tate": the artillery\'s eyes over the line — what it sees, the guns are told by wireless.', model: plane('re8', { color: 0x5a5636, kind: 'uk', span: 6.5, len: 7.8, seats: 2 }), paint: PC10, engineSound: 'prop', gun: NOGUN, hp: 6, flight: SPOT },
  fr: { name: 'Salmson 2A2', weapon: 'camera, wireless', text: 'The French two-seat reconnaissance machine, sturdy and quick for its kind.', model: plane('salmson', { color: 0x8a7a4e, kind: 'fr', span: 5.9, len: 6.9, seats: 2, rotary: true }), paint: FRANCE, engineSound: 'prop', gun: NOGUN, hp: 6, flight: SPOT },
  pact: { name: 'DFW C.V', weapon: 'camera, wireless', text: 'The most-built German two-seater: photographs of the enemy line for the next morning\'s attack.', model: plane('dfw', { color: 0x6a6e60, kind: 'de', span: 6.0, len: 7.9, seats: 2 }), paint: STREAK, engineSound: 'prop', gun: NOGUN, hp: 6, flight: SPOT },
  st: { name: 'DFW C.V', weapon: 'camera, wireless', text: 'The most-built German two-seater: photographs of the enemy line for the next morning\'s attack.', model: plane('dfw', { color: 0x6a6e60, kind: 'de', span: 6.0, len: 7.9, seats: 2 }), paint: STREAK, engineSound: 'prop', gun: NOGUN, hp: 6, flight: SPOT },
};

// ---------------------------------------------------------------- at sea
const SEA_FIGHT = { approach: 2200, cruiseSpeed: 58, attackSpeed: 54, cruiseAlt: 200, attackAlt: 200, orbit: 260, station: 90, aam: { count: 8, range: 260, speed: 420, pk: 0.22, hits: 99, every: 2 } }; // (the guns, as the kit's air-to-air shots: short, many, few hits)
const SEA_TORP = { approach: 2200, cruiseSpeed: 44, attackSpeed: 40, cruiseAlt: 90, attackAlt: 14, drop: 450 };
const SEA_SCOUT = { approach: 2200, cruiseSpeed: 42, attackSpeed: 40, cruiseAlt: 260, attackAlt: 240, runLength: 1800, swath: 550, hold: 40 };
const ZEPP = { approach: 1400, cruiseSpeed: 12, attackSpeed: 11,   // (a quarter of a fighter's speed: she hangs over the fleet a long time — and the fighters catch her)
  cruiseAlt: 420, attackAlt: 400, runLength: 1800, swath: 900, hold: 60, turn: 0.15 };
const SEA_ASW = { approach: 2200, cruiseSpeed: 40, attackSpeed: 38, cruiseAlt: 140, attackAlt: 70, runLength: 2000, swath: 450, hold: 45 };
const RNAS = { colors: [0x8a8a7c, 0x7e7e70, 0x94948a, 0x84846e] as [number, number, number, number], scale: 0.8 };     // the seaplanes' clear doped linen, grey-washed
const MARINE = { colors: [0x8a8e8a, 0x7a807c, 0x969a94, 0x6e7470] as [number, number, number, number], scale: 0.6 };

const NAV_FIGHTER: Record<string, Plane> = {
  nato: { name: 'Sopwith 2F.1 Ship\'s Camel', weapon: 'Vickers · Lewis', text: 'The Camel for the fleet: off HMS Furious or a platform on a turret, after the Zeppelins and the seaplanes.', model: plane('camel2f', { color: 0x4e4a30, kind: 'uk', span: 4.1, len: 5.5, rotary: true }), paint: PC10, engineSound: 'prop', gun: VICKERS, hp: 5, guns: true, flight: SEA_FIGHT },
  pact: { name: 'Hansa-Brandenburg W.29', weapon: '2 × MG 08/15 · Parabellum', text: 'Christiansen\'s monoplane-looking seaplane fighter from Zeebrugge: fast for a floatplane, it shot down British flying boats and motor boats alike.', model: plane('w29', { color: 0x8a8e8a, kind: 'de', span: 4.5, len: 7.0, seats: 2, floats: true }), paint: MARINE, engineSound: 'prop', gun: SPANDAU, hp: 6, guns: true, flight: SEA_FIGHT },
  // off a seaplane carrier (data/units1918/shipTypes.js: systems/AirStrike.js flies `${faction}${carrier.air}`)
  natoSeaplane: { name: 'Sopwith Baby', weapon: 'Lewis gun', text: 'A little single-seat floatplane from the seaplane carriers: hoisted out, off the water, up after the Zeppelins and the German seaplanes.', model: plane('baby', { color: 0x8a8a7c, kind: 'uk', span: 3.9, len: 7.0, rotary: true, floats: true }), paint: RNAS, engineSound: 'prop', gun: VICKERS, hp: 4, guns: true, flight: SEA_FIGHT },
};
const SEA_TORPEDO: Record<string, Plane> = {
  nato: { name: 'Sopwith Cuckoo', weapon: '18-inch torpedo', text: 'The first landplane torpedo bomber built to fly from a carrier\'s deck: low and level at the ship, the torpedo dropped close in.', model: plane('cuckoo', { color: 0x4e4a30, kind: 'uk', span: 7.0, len: 8.7, torpedo: true }), paint: PC10, engineSound: 'prop', gun: NOGUN, hp: 7, torpedo: { count: 1, speed: 15, range: 900, damage: 1900 }, flight: SEA_TORP },
  pact: { name: 'Gotha WD.11', weapon: '45 cm torpedo', text: 'A twin-engined torpedo seaplane from the Flanders stations: slow and big, it goes for the ship nearest the spot and drops at close range.', model: plane('wd11', { color: 0x8a8e8a, kind: 'de', span: 8.8, len: 13.4, seats: 2, floats: true, torpedo: true, engines: 2, scale: 1 }), paint: MARINE, engineSound: 'prop', gun: NOGUN, hp: 8, torpedo: { count: 1, speed: 15, range: 900, damage: 1900 }, flight: SEA_TORP },
  natoSeaplane: { name: 'Short 184', weapon: '14-inch torpedo', text: 'The seaplane carriers\' torpedo plane: off the water alongside her, low over the sea, the torpedo dropped close in. Off Gallipoli in August 1915 a Short 184 from Ben-my-Chree sank a Turkish ship with the first air-launched torpedo.', model: plane('short184', { color: 0x8a8a7c, kind: 'uk', span: 9.7, len: 12.4, seats: 2, floats: true, torpedo: true }), paint: RNAS, engineSound: 'prop', gun: NOGUN, hp: 7, torpedo: { count: 1, speed: 14, range: 800, damage: 1600 }, flight: SEA_TORP },
};
const SEA_SCOUTING: Record<string, Plane> = {
  nato: { name: 'Felixstowe F.2A', weapon: 'wireless, Lewis guns', text: 'The big flying boat from Felixstowe and Great Yarmouth: a long patrol leg over the North Sea, and what it sees is on the plot by wireless.', model: plane('f2a', { color: 0x8a8a7c, kind: 'uk', span: 6.2, len: 6.6, seats: 2, boat: true, engines: 2, scale: 2.2 }), paint: RNAS, engineSound: 'prop', gun: NOGUN, hp: 12, flight: SEA_SCOUT },
  pact: { name: 'Zeppelin (L 53 type)', weapon: 'wireless, machine guns', text: 'The fleet\'s eyes: a naval airship on a slow leg high over the sea, seeing further than anything afloat. Hydrogen-filled — one incendiary burst and she goes up in flames.', model: zeppelin('l53', { len: 160, r: 11 }), paint: { colors: [0x9a968a, 0x8e8a80, 0xa4a094, 0x949086] as [number, number, number, number], scale: 0.4 }, engineSound: 'prop', gun: NOGUN, hp: 24, flight: ZEPP },
  natoSeaplane: { name: 'Short 184 (reconnaissance)', weapon: 'wireless, Lewis gun', text: 'A Short 184 from the seaplane carrier, off the water alongside her: a long leg over the sea, what the observer sees is on the plot by wireless.', model: plane('short184r', { color: 0x8a8a7c, kind: 'uk', span: 9.7, len: 12.4, seats: 2, floats: true }), paint: RNAS, engineSound: 'prop', gun: NOGUN, hp: 7, flight: SEA_SCOUT },
};
const SEA_HUNT: Record<string, Plane> = {
  nato: { name: 'Curtiss H.12 Large America', weapon: '4 × 100 lb bombs', text: 'The flying boat on the "Spider Web" patrol over the U-boats\' routes: a search along the line, bombs on the boat it catches at periscope depth.', model: plane('h12', { color: 0x8a8a7c, kind: 'uk', span: 6.6, len: 6.4, seats: 2, boat: true, engines: 2, scale: 2.1 }), paint: RNAS, engineSound: 'prop', gun: NOGUN, hp: 12, torpedo: { count: 1, radius: 30, damage: 1800 }, flight: SEA_ASW },
  pact: { name: 'Friedrichshafen FF.49', weapon: 'bombs, Parabellum', text: 'The patrol seaplane over the German Bight and the Flanders coast: it searches a line for the British submarines and bombs the one it finds.', model: plane('ff49', { color: 0x8a8e8a, kind: 'de', span: 8.6, len: 11.6, seats: 2, floats: true, bombs: 2 }), paint: MARINE, engineSound: 'prop', gun: NOGUN, hp: 8, torpedo: { count: 1, radius: 30, damage: 1600 }, flight: SEA_ASW },
};

/** Per support kind: the aircraft table (data/epoch.js), keyed by side (nato, pact) and army (fr, st). */
export const AIR_1918 = { jet: STRIKE, cap: FIGHTER, recon: SPOTTER, navCap: NAV_FIGHTER, torpBomb: SEA_TORPEDO, navScout: SEA_SCOUTING, asw: SEA_HUNT };
