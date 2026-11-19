// 2027 on the coast (Gotland: the Baltic Fleet lands, US and Polish troops hold): the Russian landing ships and the
// naval infantry's swimmers, on the 1985 landing machinery (units/baltic85.js, systems/Landing.js). Never bought:
// what Russia buys for the land comes ashore in one (the map's `landing.craft` / `landing.swim`).
import { craftType, swimmer, AA, gun, natya } from '../units/baltic85.js';
import { buildRopuchaL, buildZubr, buildAlexandrit } from '../models/baltic85.js';

const G30 = { range: 900, reload: 0.5, damage: 40, splash: 1.2, size: 0.8 };   // (AK-630M)
const G57 = { range: 1300, reload: 1.2, damage: 110, splash: 2.5, size: 1.2 }; // (twin AK-725)
const FWD = 0;
const AFT = Math.PI;

export const ropucha = craftType({
  id: 'ropucha', name: 'Landing Ship (Ropucha)', shortName: 'Ropucha',
  names: { pact: ['Kaliningrad', 'Minsk', 'Korolev', 'Aleksandr Shabalin'], nato: ['L-1'] },
  hull: { length: 112, beam: 15 },
  stats: { draft: 2.6, hp: 4200, armor: 0.06, speed: 8, accel: 0.1, turnRate: 0.09, turretRate: 0.8, radius: 7.5, height: 16, sight: 1800, ...AA(600, 0.16, 0.04), defence: { ciws: { range: 260, pk: 0.18 }, chaff: { count: 6, cooldown: 10 } }, damage: 110 },
  mounts: { pact: [gun([0, 12, -9.6], FWD, G57), gun([0, 8, -43], AFT, G57)], nato: [] },
  camera: { distance: 100, height: 28, shoulder: 0 },
  models: { pact: buildRopuchaL, nato: buildRopuchaL },
  variants: { pact: { name: 'Ropucha-class landing ship', weapon: '2 × twin 57 mm, Grad-M', text: 'The Baltic Fleet\'s big tank landing ships, Polish-built in the 1970s and still the workhorses: a company of tanks or BTRs onto the sand through her bow doors.' }, nato: { name: 'Landing ship', weapon: '—', text: 'A landing ship.' } },
});

export const zubr = craftType({
  id: 'zubr', name: 'Hovercraft (Zubr)', shortName: 'Zubr', engine: 'engine.hover',
  names: { pact: ['Mordoviya', 'Yevgeny Kocheshkov'], nato: ['H-1'] },
  hull: { length: 57, beam: 25.6 },
  stats: { hover: true, draft: -1, hp: 1800, armor: 0.02, speed: 18, accel: 0.5, turnRate: 0.2, turretRate: 1, radius: 10, height: 13, sight: 1400, ...AA(500, 0.15, 0.03), damage: 40 },
  mounts: { pact: [gun([-8.8, 8.2, 6], FWD, G30), gun([8.8, 8.2, 6], FWD, G30)], nato: [] },
  camera: { distance: 70, height: 22, shoulder: 0 },
  models: { pact: buildZubr, nato: buildZubr },
  variants: { pact: { name: 'Zubr-class assault hovercraft', weapon: '2 × AK-630M', text: 'The biggest hovercraft in the world, both of hers in the Baltic Fleet: 60 knots over the mines and straight up the sand, three tanks or 500 men aboard — and the loudest thing on the sea.' }, nato: { name: 'Hovercraft', weapon: '—', text: 'A hovercraft.' } },
});

/** The minesweeper (bought: map `landing.navy`): where she steams the moored mines are cut — a new lane, or a wider one (systems/Landing.js `sweeper`). */
export const alexandrit = {
  ...natya, id: 'alexandrit', name: 'Minesweeper (Alexandrit)', shortName: 'Minesweeper',
  names: { pact: ['Aleksandr Obukhov', 'Ivan Antonov', 'Vladimir Yemelyanov', 'Georgiy Kurbatov'], nato: ['M-1'] },
  hull: { length: 62, beam: 10.2 },
  stats: { ...natya.stats, hp: 1200, speed: 7.5 },
  mounts: { pact: [gun([0, 4, 22], FWD, G30)], nato: [gun([0, 4, 22], FWD, G30)] },
  models: { pact: buildAlexandrit, nato: buildAlexandrit },
  variants: {
    pact: { name: 'Alexandrit-class minesweeper', weapon: 'AK-306 30 mm, the sweep, mine-hunting drones', text: 'A fibreglass hull the magnetic mines can’t feel: where she steams the mines are cut — a new lane for the landing ships, or a wider one. Slow, and she has nothing against aircraft.' },
    nato: { name: 'Minesweeper', weapon: '30 mm', text: 'A minesweeper.' },
  },
};

/** The 2027 swimmers: each army's own vehicle (BTR-82A, BMP-2M…) afloat — they replace 1985's in this war's list. */
export const coastal2027 = (T) => ({ ropucha, zubr, alexandrit, swimIfv: swimmer('swimIfv', T.ifv, 1.25), swimRecon: swimmer('swimRecon', T.reconVehicle, 1.2) });
