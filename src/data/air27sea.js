// 2027 at sea, the Baltic (systems/AirStrike.js KINDS seaStrike / seaCap / asw / aew / seaDrone, and the ships'
// helicopters `helo`), keyed like the fleet: `nato` the US Navy and USAF, `pl` Poland, `pact` Russia. Nothing here
// needs a carrier (data/epoch.js: in 2027 the sea kinds fly from the shore), but the America's F-35Bs fly off her deck.
// The Lightning II is hard to find on radar (`stealth`: the ships' SAMs reach that share of their range, and hit as
// much less — systems/Missiles.js); the drones circle long and low, every ship near them on your map — your missiles
// can be fired at what they find.
// (models/navalAir2027.js; the 1985 Seahawk, Helix, May and the Flanker's model, re-equipped)
import { buildF35B, buildF35C, buildP8, buildE7, buildTu214R, buildMQ9, buildOrion, buildAW101 } from './models/navalAir2027.js';
import { buildSH60, buildKa27, buildIl38 } from './models/navalAir85.js';
import { buildSu35, buildF16 } from './models/aircraft2027.js';

const GREY = { colors: [0x8c949a, 0x868e94, 0x929aa0, 0x828a90], scale: 0.9 };
const RU = { colors: [0x8e9696, 0x889090, 0x949c9c, 0x848c8c], scale: 0.9 };
const FLANKER = { colors: [0x5f6f7a, 0x7a8a96, 0x4a5862, 0x6c7c88], scale: 1.2 };
const NOGUN = { rate: 1, damage: 0, splash: 0, vsArmor: 0, pierce: 0, speed: 600, tracer: 0, size: 0.5, sound: 'nato.mg' };
const JET = { engineSound: 'jet', gun: NOGUN };
const PROP = { engineSound: 'prop', gun: NOGUN };

// the missiles (systems/Missiles.js, the ships' scale: a third of the real speed)
const LRASM = { name: 'LRASMs', speed: 160, range: 5200, seeker: 1400, skim: true, stealth: 0.5, damage: 2600, pierce: 0.65 }; // (AGM-158C: stealthy, picks its ship out of the group)
const KH35 = { name: 'Kh-35Us', speed: 160, range: 4400, seeker: 1100, skim: true, damage: 1700, pierce: 0.6 };

const seaStrike = {
  nato: { ...JET, name: 'F-35C Lightning II', weapon: '2 AGM-158C LRASM each', text: 'Carrier jets from beyond the Danish straits (the America\'s own are F-35Bs): hard to see on any radar, they fire four stealthy LRASMs from far out and are gone before the SAMs find them.', model: buildF35C, paint: GREY, hp: 8, stealth: 0.5, asm: { ...LRASM, perPlane: 2 } },
  pact: { ...JET, name: 'Su-30SM', weapon: '3 Kh-35U each', text: 'The Baltic Fleet\'s naval strike fighters from Chernyakhovsk: a pair low over the sea, six Kh-35Us fired from beyond the defences.', model: buildSu35, paint: FLANKER, hp: 9, asm: { ...KH35, perPlane: 3 } },
};
const seaCap = {
  nato: { ...JET, name: 'F-35B Lightning II', weapon: 'AIM-120D, AIM-9X', text: 'Marine F-35Bs (off the America when she sails, else from ashore): over the fleet, unseen, the strike aircraft shot down before they fire.', model: buildF35B, paint: GREY, hp: 8, stealth: 0.5 },
  pl: { ...JET, name: 'F-16C Jastrząb', weapon: 'AIM-120C, AIM-9X', text: 'Polish F-16s from Łask over the coast and the fleet.', model: buildF16, paint: GREY, hp: 8 },
  pact: { ...JET, name: 'Su-35S', weapon: 'R-77, R-73', text: 'Flankers from Kaliningrad over the fleet: they shoot down the strike aircraft before they fire.', model: buildSu35, paint: FLANKER, hp: 9 },
};
const asw = {
  nato: { ...PROP, engineSound: 'jet', name: 'P-8A Poseidon', weapon: 'sonobuoys, Mk 54 torpedoes', text: 'The 737 made a sub hunter, from Sigonella and Keflavík: a long run of sonobuoys over the spot, a homing torpedo on what it finds.', model: buildP8, paint: GREY, hp: 10, torpedo: { count: 1, radius: 70, damage: 2600 } },
  pact: { ...PROP, name: 'Il-38N May', weapon: 'Novella radar, sonobuoys, torpedoes', text: 'The old May with a new search set: buoys over the spot and a torpedo for the boat it finds.', model: buildIl38, paint: RU, hp: 10, torpedo: { count: 1, radius: 70, damage: 2400 } },
};
const aew = {
  nato: { ...JET, name: 'E-7A Wedgetail', weapon: 'MESA radar', text: 'The radar plane: while it circles, every enemy ship within three kilometres shows on your map — and your missiles can be fired at them.', model: buildE7, paint: GREY, hp: 9 },
  pact: { ...JET, name: 'Tu-214R', weapon: 'MRK-411 radar', text: 'The reconnaissance airliner\'s side-looking radar: every enemy ship within three kilometres is passed to your missile ships.', model: buildTu214R, paint: { ...RU, scale: 0.6 }, hp: 10 },
};
const seaDrone = {
  nato: { ...PROP, name: 'MQ-9B SeaGuardian', weapon: 'sea search radar, cameras', text: 'A drone circling far out over the sea, for longer than any aircraft: the ships it finds show on your map, and your missiles can be fired at them without your own radars on. Slow and unarmoured — a SAM\'s easy kill.', model: buildMQ9, paint: GREY, hp: 4, picture: 2400 },
  pact: { ...PROP, name: 'Orion', weapon: 'radar, cameras', text: 'Kronshtadt\'s long-endurance drone (and the little Orlan-10s with it): it finds the enemy ships over the horizon for the Kalibr and Oniks ships. Slow — a SAM\'s easy kill.', model: buildOrion, paint: RU, hp: 3, picture: 2000 },
};
// a ship's own helicopter (KINDS.helo): sonar for the submarines, a radar for the ships round it
const helo = {
  nato: { name: 'MH-60R Seahawk', weapon: 'dipping sonar, Mk 54 torpedo, radar', text: 'The frigate\'s and destroyer\'s helicopter: out to a spot, sonar down, a torpedo on what it hears — its radar passes the ships it sees to the missiles.', model: buildSH60, paint: GREY, rotorSound: 'rotor.uh60', rotorSpeed: 26, gun: NOGUN, hp: 6, torpedo: { count: 1, radius: 70, damage: 2600 }, picture: 1800 },
  pl: { name: 'AW101 Merlin', weapon: 'dipping sonar, torpedo, radar', text: 'The Polish Navy\'s big three-engined sub hunter: sonar, torpedoes and a search radar.', model: buildAW101, paint: GREY, rotorSound: 'rotor.uh60', rotorSpeed: 22, gun: NOGUN, hp: 8, torpedo: { count: 1, radius: 70, damage: 2400 }, picture: 1800 },
  pact: { name: 'Ka-27M Helix', weapon: 'dipping sonar, torpedo, FH-A radar', text: 'The modernised Helix: a new radar that passes the ships it finds to the missile launchers, sonar for the submarines.', model: buildKa27, paint: RU, rotorSound: 'rotor.mi8', rotorSpeed: 22, gun: NOGUN, hp: 7, torpedo: { count: 1, radius: 70, damage: 2400 }, picture: 2400 },
};

export const AIR_2027_SEA = { seaStrike, seaCap, asw, aew, seaDrone, helo };
