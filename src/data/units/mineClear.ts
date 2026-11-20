// Mine clearing — NATO M60A3 with a mine plough, Pact UR-77 Meteorit. They open the way through
// fields the engineers would take minutes over. The M60's plough lifts the mines out of its path
// as it drives through a field (now and then one goes off under the blade), and it is still a
// tank with a 105 mm gun. The UR-77 is a lightly armoured launcher: two rocket-towed line charges
// that blow an 80 m lane through mines and wire (X, aimed) — and through anyone standing in it.
import { buildBwMinenpflug, buildNvaKMT5 } from '../models/armySupport.js';
import tank from './tank.ts';
import { buildNatoPlough, buildPactUR77 } from '../models/support.js';
import type { UnitType, UnitStats } from '../../types.ts';

/** The plough tank (M60A3, the Bundeswehr's Leopard 1 with a plough, the NVA's T-55 with rollers). */
const BASE = {
  ...tank.stats,
  hp: 1250,
  armor: 0.62,
  speed: 4.2,
  damage: 380,
  range: 180,
  minePlough: true,
  smoke: { charges: 2 },
  crew: 4,
};
/** The Soviet UR-77: a launcher, not a tank. */
const PACT = { // a 2S1 hull with a launcher box and a PKT
  minePlough: false, lineCharge: { count: 2, range: 110 }, hp: 650, armor: 0.25, speed: 5, range: 110, gunRange: 110,
  weapon: 'rifle', weaponSound: 'mg', fireCooldown: 0.12, damage: 85, splash: 0, pierce: 0.05, vsArmor: 0.08, boltSpeed: 450, boltSize: 0.7,
  tracer: 0.35, spread: 0.02, magSize: 25, reloadTime: 4, antiArmor: false, crew: 2,
} satisfies Partial<UnitStats>;

export default {
  id: 'mineClear',
  name: 'Mine Clearing Vehicle',
  shortName: 'Mine clear',
  category: 'support', // reinforcement window section
  kind: 'vehicle',
  role: 'support',
  cost: 340,

  formation: { count: 1, columns: 1, spacing: 10 },

  stats: BASE,
  factionStats: {
    pact: PACT,
    // the NVA's T-55 KMT-5 is a roller tank, not the UR-77: the Pact's launcher stats undone (army stats go over the side's), a T-55's numbers
    nva: { ...Object.fromEntries(Object.keys(PACT).map((k) => [k, (BASE as Record<string, unknown>)[k]])), armor: 0.5, hp: 1150, damage: 320 },
  },

  camera: { distance: 13, height: 5.5, shoulder: 2.4 },
  models: { nato: buildNatoPlough, pact: buildPactUR77, bw: buildBwMinenpflug, nva: buildNvaKMT5 },
  weaponSound: 'cannon',
  engine: 'engine.diesel',
  tracks: 'tracks.heavy',
  variants: {
    bw: { name: 'Leopard 1 Minenpflug', weapon: '105 mm L7A3 · mine plough', text: 'A Leopard 1 pushing a track-width plough: it lifts the mines out of its path and leaves a cleared lane behind it — and still fights as a tank.' },
    nva: { name: 'T-55 KMT-5', weapon: '100 mm D-10T · mine rollers', text: 'A T-55 pushing heavy rollers ahead of its tracks: they set off the mines before the tank reaches them, lane after lane.' },
    nato: { name: 'M60A3 with mine plough', weapon: '105 mm M68, track-width mine plough', text: 'A fighting tank that ploughs its own lane: drive it through a minefield and the plough lifts the mines out of its way.' },
    pact: { name: 'UR-77 Meteorit', weapon: '2 line charges, PKT', text: 'Two rockets that drag 90 m of explosive hose across a minefield and blow it: a lane through mines and wire in seconds.' },
  },
} satisfies UnitType;
