// 1918 air support (data/epoch.js swaps these into systems/AirStrike.js KINDS): per kind, each army's
// own aircraft — `nato` the British (the RAF from April 1918), `fr` the French, `pact` the German Army's
// air service, `st` the Schlachtstaffeln that flew with the storm troops. Biplanes: slow, low, rifle-
// calibre machine guns and small bombs (`flight`: their own speeds and heights over KINDS').
//   jet    – ground attack: down low along a line, machine guns and a few small bombs
//   cap    – fighter patrol: circles the spot, dives on enemy aircraft with its guns
//   recon  – the spotter: one run along the line, what it sees shows on the map
import { plane } from './models/ww1Aircraft.js';
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

/** Per support kind: the aircraft table (data/epoch.js), keyed by side (nato, pact) and army (fr, st). */
export const AIR_1918 = { jet: STRIKE, cap: FIGHTER, recon: SPOTTER };
