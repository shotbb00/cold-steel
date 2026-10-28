// Breakthrough: the Warsaw Pact attacks, NATO defends — line by line across the map.
//   • The map's villages are grouped into lines across the front (modes/shared.js lines()).
//     The Pact holds its half; NATO holds the rest and has two minutes to dig in first.
//   • Only the line being fought over can be taken (the others are locked). Take all of it and
//     the front moves on: the next line opens, the attack gets fresh reserves and more time.
//   • The attacker has a reserve of command points and no income — each line taken adds more.
//     The defender earns a steady trickle for reinforcements and fortifications.
//   • The attack wins by taking the last line; the defence wins when the clock runs out or the
//     attack has spent itself (no stacks left and no reserves to bring more).
// Either side can be played; the AI takes the other (defending: no offensives, just holding,
// reinforcing and fortifying). In the campaign (game.campaign) the attacker and both forces come
// from the campaign, reserves are small, and the result goes back into it.
import { ControlPoints } from '../systems/ControlPoints.js';
import { FrontlineDirector } from '../ai/FrontlineDirector.js';
import { FrontlineHUD } from '../ui/FrontlineHUD.js';
import { enemyOf, FACTIONS } from '../data/factions.js';
import { lines, deploy, makeBuyer, clientSetup, clientUpdate, clock, fieldStrength } from './shared.js';
import { loadCampaign, recordBattle } from '../campaign/Campaign.js';

const ATTACKER = 'pact';
const SETUP = 120;               // seconds the defence gets before the assault
const TIME = 14 * 60;            // for the first line
const TIME_PER_LINE = 8 * 60;    // added with every line taken
const RESERVES = 3400;           // attacker CP at the start…
const RESERVES_PER_LINE = 900;   // …and per line taken
const DEFENCE_CP = 900;
const DEFENCE_INCOME = 1.4;      // CP / s

const ATTACK_FORCE = ['rifles', 'rifles', 'rifles', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'tank', 'tank', 'ifv', 'mortar', 'engineers', 'scouts', 'aa'];
const DEFENCE_FORCE = ['rifles', 'rifles', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'atTeam', 'tank', 'mortar', 'engineers', 'scouts'];

export default {
  id: 'breakthrough',
  name: 'Breakthrough',
  description: 'The Pact attacks line by line; NATO has two minutes to dig in. Take every line — or hold until the clock runs out.',
  multiplayer: true,

  setup(game) {
    if (game.net?.isClient) {
      clientSetup(game);
      game.bus.emit('toast', 'Breakthrough — the Pact attacks, NATO holds. One line at a time.');
      return;
    }
    const map = game.map;
    const camp = game.campaign;
    const att = camp?.attacker ?? ATTACKER;
    const def = enemyOf(att);
    const { lines: ls, mid, at } = lines(map, att);
    const byId = Object.fromEntries(map.points.map((p) => [p.id, p]));
    // the attacker holds every line on its half; the first line beyond it is the fight
    let active = at.findIndex((t) => t > mid - 25);
    if (active <= 0) active = 1;
    const owners = {};
    ls.forEach((ids, i) => ids.forEach((id) => { owners[id] = i < active ? att : def; }));
    const points = new ControlPoints(game, map.points.map((p) => ({ ...p, owner: owners[p.id] })));
    const pointsOf = (i) => points.points.filter((p) => ls[i]?.includes(p.id));

    const state = {
      points,
      cp: camp ? { [att]: 500, [def]: 400 } : { [att]: RESERVES, [def]: DEFENCE_CP },
      attacker: att,
      strength: { [att]: 1, [def]: 1 },
      maxStrength: 1,
      maxStacks: map.maxStacks ?? 22,
      line: active,
      lines: ls.length,
      setupUntil: SETUP,
      deadline: SETUP + TIME,
      status: () => {
        const n = ls.length - active;
        const left = state.line - active + 1;
        const phase = game.time < state.setupUntil ? `Assault in ${clock(state.setupUntil - game.time)}` : `${clock(state.deadline - game.time)} left`;
        return `Line ${left} of ${n} · ${phase} · Attack reserves ${Math.floor(state.cp[att])} CP`;
      },
    };
    state.buy = makeBuyer(game, state);
    game.modeState = state;
    this.lock(state, pointsOf, true);

    // forces: the attack massed behind its front line, the defence on the line and behind it
    const front = pointsOf(active - 1);
    deploy(game, att, camp?.forces?.[att] ?? ATTACK_FORCE, front.length ? front : [map.bases[att]], { back: 40, spread: 30 });
    deploy(game, def, camp?.forces?.[def] ?? DEFENCE_FORCE, [...pointsOf(active), ...pointsOf(active + 1)], { back: 12, spread: 18 });
    state.strength[att] = state.maxStrength = Math.max(fieldStrength(game, att), fieldStrength(game, def)) * 1.2;
    state.strength[def] = fieldStrength(game, def);

    // campaign events (campaign/Campaign.js EVENTS): who may call in aircraft
    if (camp?.event === 'airCover') game.air.limit[enemyOf(game.playerFaction)] = 0;
    if (camp?.event === 'enemyAir') game.air.limit[game.playerFaction] = 0;
    game.systems.push(points);
    const ai = enemyOf(game.playerFaction);
    if (!game.net || game.coop) {
      const defending = ai === def;
      game.systems.push(new FrontlineDirector(game, ai, state, defending
        ? { attack: false, expand: false }
        : { expand: false, firstAssault: SETUP + 20, targetable: (p) => ls[state.line]?.includes(p.id) }));
    }
    game.frontlineHud = new FrontlineHUD(game, state);
    game.bus.on('ui:reinforce', (typeId) => game.orders.issue({ t: 'buy', u: typeId }));
    if (camp) game.tell(game.playerFaction, `Campaign: ${camp.sector}`);
    game.bus.emit('toast', game.playerFaction === att
      ? 'Breakthrough — take the line ahead, then the next. NATO has two minutes to dig in.'
      : 'Breakthrough — two minutes to dig in. Hold every line as long as you can.');
    this.pointsOf = pointsOf;
  },

  /** Only the line under attack is in play — and nothing at all during the defence's set-up. */
  lock(state, pointsOf, all = false) {
    for (const p of state.points.points) p.locked = true;
    if (!all) for (const p of pointsOf(state.line)) p.locked = false;
    for (const p of state.points.points) state.points.paint(p);
  },

  update(game, dt) {
    const state = game.modeState;
    const att = state.attacker;
    const def = enemyOf(att);
    if (state.setupUntil && game.time >= state.setupUntil) {
      state.setupUntil = 0;
      this.lock(state, this.pointsOf);
      game.announce('The assault begins!');
    }
    state.cp[def] += dt * DEFENCE_INCOME;
    state.strength[att] = fieldStrength(game, att);
    state.strength[def] = fieldStrength(game, def);

    // the line has fallen: the front moves on
    const fight = this.pointsOf(state.line);
    if (!state.setupUntil && fight.length && fight.every((p) => p.owner === att)) {
      state.line++;
      if (state.line >= state.lines) return this.finish(game, def, 'The last line has fallen.');
      state.deadline += TIME_PER_LINE;
      state.cp[att] += RESERVES_PER_LINE;
      this.lock(state, this.pointsOf);
      game.tellBoth(att, `Line broken! On to ${this.pointsOf(state.line).map((p) => p.name).join(', ')} — reserves are moving up.`,
        `The line has fallen — fall back to ${this.pointsOf(state.line).map((p) => p.name).join(', ')}!`);
    }
    if (game.time >= state.deadline) return this.finish(game, att, 'The attack has run out of time.');
    const spent = (f) => game.world.stacksOf(f).length === 0 && state.cp[f] < 150;
    if (spent(att)) return this.finish(game, att, 'The attack has spent itself.');
    if (spent(def)) return this.finish(game, def, 'The defence has been wiped out.');
    game.frontlineHud.update();
  },

  finish(game, loser, why) {
    const result = (f) => (f === loser
      ? { victory: false, title: 'Defeat', subtitle: why }
      : { victory: true, title: 'Victory', subtitle: `${why} The ${FACTIONS[loser].name} is beaten.` });
    game.net?.sendEnd(result(game.net.remoteFaction));
    const mine = result(game.playerFaction);
    if (game.campaign) {
      // survivors go home with what they have; the campaign moves the front
      const survivors = game.world.stacksOf(game.playerFaction).map((s) => ({
        cid: s.cid ?? null, type: s.type.id, name: s.name, men: s.aliveCount, xp: s.xp, rank: s.rank,
      }));
      const c = loadCampaign();
      if (c?.next) {
        const { gain } = recordBattle(c, { won: mine.victory, survivors });
        mine.subtitle += ` ${survivors.length} stacks come back; ${gain} replacement points.`;
      }
    }
    game.end(mine);
  },

  clientUpdate,
};
