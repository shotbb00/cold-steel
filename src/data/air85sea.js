// 1985 at sea (systems/AirStrike.js KINDS seaStrike / seaCap / asw / aew): the aircraft of the four air
// powers, `nato` the US Navy's, `pact` the Soviet Naval Aviation's. The jets (strike, fighters) fly only off a
// carrier that has them aboard (her stats.carrier.airGroup); the patrol planes (ASW, AEW) in from the shore.
// `pactDeck` is what flies off the Kiev (her Yak-38s).
import { buildF14, buildA6, buildE2, buildP3, buildTu22M, buildYak38, buildIl38, buildTu95 } from './models/navalAir85.js';
import { buildPactMiG23 } from './models/fighters.js';
import { buildSH60, buildKa27 } from './models/navalAir85.js';

const GREY = { colors: [0x8c949a, 0x868e94, 0x929aa0, 0x828a90], scale: 0.9 };
const SOV = { colors: [0x8e9696, 0x889090, 0x949c9c, 0x848c8c], scale: 0.9 };
const NOGUN = { rate: 1, damage: 0, splash: 0, vsArmor: 0, pierce: 0, speed: 600, tracer: 0, size: 0.5, sound: 'nato.mg' };

// the missiles they carry (systems/Missiles.js; a third of the real speed, like the ships')
const HARPOON = { name: 'Harpoons', speed: 160, range: 4600, seeker: 1200, skim: true, damage: 2300, pierce: 0.6 };
const KH23 = { name: 'Kh-23s', speed: 200, range: 3200, seeker: 800, alt: 30, damage: 1600, pierce: 0.4 };
const KH22 = { name: 'Kh-22s', speed: 330, range: 6000, seeker: 1800, alt: 70, damage: 5200, pierce: 0.7 };

export const SEA_STRIKE = {
  nato: { name: 'A-6E Intruder', weapon: '3 Harpoon each', text: 'The Navy\'s all-weather attack jet: a flight of two comes in low, fires six Harpoons from beyond the defences and turns for home.', model: buildA6, paint: GREY, engineSound: 'jet', gun: NOGUN, hp: 9, asm: { ...HARPOON, perPlane: 3 } },
  pactDeck: { name: 'Yak-38 Forger', weapon: '2 Kh-23 each', text: "The Kiev's jump jets on a strike: short-legged, two radio-guided Kh-23s each — a sting, not a blow. The Soviet Navy's real strike is in its missile ships.", model: buildYak38, paint: SOV, engineSound: 'jet', gun: NOGUN, hp: 5, asm: { ...KH23, perPlane: 2 } },
  pact: { name: 'Tu-22M3 Backfire', weapon: '2 Kh-22 each', text: 'The Soviet Navy\'s carrier killer: three supersonic bombers, six huge Kh-22s diving from high up. Each one can gut a cruiser.', model: buildTu22M, paint: SOV, engineSound: 'jet', gun: NOGUN, hp: 14, asm: { ...KH22, perPlane: 2 } },
};
export const SEA_CAP = {
  nato: { name: 'F-14A Tomcat', weapon: 'Phoenix, Sparrow, Sidewinder', text: 'The fleet defender: four Tomcats circle the spot and shoot down the bombers before they can fire.', model: buildF14, paint: GREY, engineSound: 'jet', gun: NOGUN, hp: 8 },
  pact: { name: 'MiG-23MLD', weapon: 'R-23, R-60', text: 'Fighters from the Kola airfields: cover over the fleet for as long as their fuel lasts.', model: buildPactMiG23, paint: SOV, engineSound: 'jet', gun: NOGUN, hp: 7 },
  pactDeck: { name: 'Yak-38 Forger', weapon: 'R-60', text: 'The Kiev\'s jump jets: short-legged and lightly armed, but over the fleet at once.', model: buildYak38, paint: SOV, engineSound: 'jet', gun: NOGUN, hp: 5 },
};
export const ASW = {
  nato: { name: 'P-3C Orion', weapon: 'sonobuoys, MAD, Mk 46 torpedoes', text: 'The sub hunter from Iceland and Norway: a long search over the spot, sonobuoys down — and a homing torpedo on what it finds.', model: buildP3, paint: GREY, engineSound: 'prop', gun: NOGUN, hp: 10, torpedo: { count: 1, radius: 70, damage: 2600 } },
  pact: { name: 'Il-38 May', weapon: 'sonobuoys, MAD, AT-1 torpedoes', text: 'The Il-18 airliner made a sub hunter: buoys over the spot, and a torpedo for the boat it finds.', model: buildIl38, paint: SOV, engineSound: 'prop', gun: NOGUN, hp: 10, torpedo: { count: 1, radius: 70, damage: 2400 } },
};
// a ship's own helicopter (KINDS.helo, Orders 'helo'): out to the spot, it hovers there dipping its sonar —
// submarines near it found and a torpedo on one; its radar finds the ships round it (the Ka-25/27's
// targeting link reaches further: the Soviet missile ships' eyes over the horizon).
// (models/navalAir85.js: the Seahawk and the coaxial Helix)
export const HELO = {
  nato: { name: 'SH-60B Seahawk', weapon: 'dipping sonar, Mk 46 torpedo', text: 'The frigate\'s and destroyer\'s own helicopter: sent out to a spot, it hovers there with its sonar down — and drops on what it hears.', model: buildSH60, paint: GREY, rotorSound: 'rotor.uh60', rotorSpeed: 26, gun: NOGUN, hp: 6, torpedo: { count: 1, radius: 70, damage: 2400 }, picture: 1400 },
  pact: { name: 'Ka-27 Helix', weapon: 'dipping sonar, torpedo, targeting radar', text: 'The ship\'s helicopter: sonar for the submarines, and a radar that passes the ships it finds to the missile launchers.', model: buildKa27, paint: SOV, rotorSound: 'rotor.mi8', rotorSpeed: 22, gun: NOGUN, hp: 7, torpedo: { count: 1, radius: 70, damage: 2400 }, picture: 2400 },
};
export const AEW = {
  nato: { name: 'E-2C Hawkeye', weapon: 'APS-125 radar', text: 'The radar in the sky: while it circles, every enemy ship within three kilometres shows on your map — your missiles can be fired at them.', model: buildE2, paint: GREY, engineSound: 'prop', gun: NOGUN, hp: 8 },
  pact: { name: 'Tu-95RTs Bear-D', weapon: 'Uspekh targeting radar', text: 'The Bear that finds the targets: every enemy ship within three kilometres of it is passed to your missile ships and submarines.', model: buildTu95, paint: SOV, engineSound: 'prop', gun: NOGUN, hp: 16 },
};
