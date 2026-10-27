// Rearguard: the front behind you is falling back; your battalion has to hold its corner of the
// map for 20 minutes so everyone else gets away.
//   • You start dug in on your own half with a mixed force and some command points; the
//     supply line is cut after 10 minutes — no more CP after that. Two air strikes, no more.
//   • The enemy comes in waves every ~80 s, each bigger than the last — rifles first, then
//     armour and IFVs — and its director throws them at your weakest village.
//   • Hold at least one village when the clock runs out and you win. Lose them all (or every
//     stack) and the rearguard is overrun.
// Co-op in multiplayer: both players defend together.
import { ControlPoints } from '../systems/ControlPoints.js';
import { FrontlineDirector } from '../ai/FrontlineDirector.js';
import { FrontlineHUD } from '../ui/FrontlineHUD.js';
import { enemyOf } from '../data/factions.js';
import { deploy, makeBuyer, clientSetup, clientUpdate, clock, fieldStrength } from './shared.js';

const HOLD = 20 * 60;
const SUPPLY_CUT = 10 * 60;
const INCOME = 2;               // CP / s until the supply line is cut
const START_CP = 700;
const AIR_STRIKES = 2;
const WAVE_EVERY = [70, 95];
const FORCE = ['rifles', 'rifles', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'atTeam', 'mortar', 'engineers', 'tank'];
// what each wave can draw from, by how far into the battle it is
const WAVES = [
  ['rifles', 'rifles', 'mgTeam'],
  ['rifles', 'rifles', 'atTeam', 'mgTeam'],
  ['rifles', 'ifv', 'rifles', 'mortar'],
  ['rifles', 'tank', 'ifv', 'atTeam', 'rifles'],
  ['tank', 'tank', 'ifv', 'rifles', 'rifles', 'mgTeam'],
  ['tank', 'ifv', 'ifv', 'rifles', 'rifles', 'rifles', 'atTeam'],
];

export default {
  id: 'rearguard',
  name: 'Rearguard',
  description: 'Hold your corner for 20 minutes against wave after wave. Supplies are cut halfway through.',
  multiplayer: 'coop',

  setup(game) {
    if (game.net?.isClient) {
      clientSetup(game);
      game.bus.emit('toast', 'Rearguard — hold for 20 minutes. Supplies will be cut halfway through.');
      return;
    }
    const map = game.map;
    const me = game.playerFaction;
    const foe = enemyOf(me);
    const mySide = Math.sign(map.bases[me].z);
    // our half's villages are ours, theirs are theirs, the middle is no-man's land
    const owners = Object.fromEntries(map.points.map((p) => [p.id, Math.sign(p.z) === mySide && Math.abs(p.z) > 40 ? me : Math.abs(p.z) > 40 ? foe : null]));
    const points = new ControlPoints(game, map.points.map((p) => ({ ...p, owner: owners[p.id] })));
    const state = {
      points,
      cp: { [me]: START_CP, [foe]: 0 },
      strength: { [me]: 1, [foe]: 1 },
      maxStrength: 1,
      maxStacks: map.maxStacks ?? 22,
      wave: 0,
      nextWave: 60,
      status: () => {
        const left = HOLD - game.time;
        const supply = game.time < SUPPLY_CUT ? ` · supplies cut in ${clock(SUPPLY_CUT - game.time)}` : ' · supply line cut';
        return `Hold for ${clock(left)}${supply} · wave ${state.wave} · air strikes left ${game.air.limit[me]}`;
      },
    };
    state.buy = makeBuyer(game, state);
    game.modeState = state;
    // dug in on our villages (the forward ones first)
    const mine = points.points.filter((p) => p.owner === me).sort((a, b) => Math.abs(a.z) - Math.abs(b.z));
    const force = game.coop ? [...FORCE, 'rifles', 'mgTeam', 'atTeam'] : FORCE;
    for (const s of deploy(game, me, force, mine.slice(0, 4), { back: 10, spread: 16 })) s.ai.defend();
    state.maxStrength = fieldStrength(game, me) * 1.6;
    game.air.limit[me] = AIR_STRIKES; // limited air support
    game.systems.push(points);
    this.director = new FrontlineDirector(game, foe, state, { buy: false, firstAssault: 75 });
    game.systems.push(this.director);
    game.frontlineHud = new FrontlineHUD(game, state);
    game.bus.on('ui:reinforce', (typeId) => game.orders.issue({ t: 'buy', u: typeId }));
    game.bus.emit('toast', 'Rearguard — hold for 20 minutes. Supplies will be cut halfway through.');
  },

  update(game, dt) {
    const state = game.modeState;
    const me = game.playerFaction;
    const foe = enemyOf(me);
    if (game.time < SUPPLY_CUT) state.cp[me] += dt * INCOME;
    else if (!state.cutAnnounced) {
      state.cutAnnounced = true;
      game.tell(me, 'The supply line has been cut — no more reinforcements. Hold with what you have!');
    }
    state.strength[me] = fieldStrength(game, me);
    state.strength[foe] = Math.min(state.maxStrength, fieldStrength(game, foe));
    if (game.time >= state.nextWave) this.wave(game, state, foe);
    game.frontlineHud.update();

    const held = state.points.owned(me);
    const result = (victory) => (victory
      ? { victory: true, title: 'Victory', subtitle: 'The rearguard held. Everyone else got away.' }
      : { victory: false, title: 'Defeat', subtitle: 'The rearguard has been overrun.' });
    let outcome = null;
    if (game.time >= HOLD && held > 0) outcome = true;
    else if (held === 0 || game.world.stacksOf(me).length === 0) outcome = false;
    if (outcome === null) return;
    game.net?.sendEnd(result(outcome));
    game.end(result(outcome));
  },

  /** The next wave arrives at the enemy's base, bigger as the battle goes on. */
  wave(game, state, foe) {
    state.wave++;
    state.nextWave = game.time + WAVE_EVERY[0] + Math.random() * (WAVE_EVERY[1] - WAVE_EVERY[0]);
    const tier = WAVES[Math.min(WAVES.length - 1, Math.floor((state.wave - 1) / 2))];
    const extra = Math.floor(state.wave / 4);
    const units = [...tier, ...tier.slice(0, extra)].slice(0, Math.max(1, state.maxStacks - game.world.stacksOf(foe).length));
    const base = game.map.bases[foe];
    const entries = base.entries ?? [0];
    const anchors = entries.map((e) => ({ x: base.x + e, z: base.z - Math.sign(base.z) * 12 }));
    deploy(game, foe, units, anchors, { back: 0, spread: 20, names: { rifles: 'Assault Rifles', tank: 'Assault Tanks', ifv: 'Assault BMPs' } });
    game.bus.emit('wave', { faction: foe, units });
    game.tellBoth(foe, `Wave ${state.wave} is moving up`, `Enemy wave ${state.wave} inbound — ${units.length} stacks`);
  },

  clientUpdate,
};
