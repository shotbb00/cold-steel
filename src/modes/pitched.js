// Pitched battle, in the spirit of Total War's battles: no points to take — two armies, one field.
//   • Both sides get the same command points (the battle rule `budget`: small, medium, large).
//   • The battle opens in the deployment phase, the clock stopped (systems/Deployment.js): you buy
//     your army there (the reinforcement window), promote stacks (the Promote order: a rank costs
//     PROMOTE of its price; Withdraw gives the whole price back while setting up) and place it in
//     your zone. Start battle, and the buying is over: what CP is left pays for support — air
//     strikes, barrages, the 1806 powers — during the battle.
//   • A side loses when it has no troops left on the field, or when its commander surrenders (the
//     battle menu's Surrender button).
// The AI (ai/PitchedDirector.js) buys an army of a random style for the same budget and places it.
// Multiplayer (versus or co-op against the AI): the host runs the mode; each player builds their
// army in their own zone, and the battle starts once both have pressed Start.
import { ControlPoints } from '../systems/ControlPoints.js';
import { FrontlineHUD } from '../ui/FrontlineHUD.js';
import { enemyOf, FACTIONS } from '../data/factions.js';
import { makeBuyer, forces, fieldStrength } from './shared.js';
import { unitCost } from '../data/doctrine.js';
import { RANKS } from '../entities/UnitStack.js';
import { PitchedDirector } from '../ai/PitchedDirector.js';

export const PROMOTE = 0.3;   // a rank costs this share of the stack's price
const MAX_STACKS = 26;

/** What promoting `s` one rank costs (null: it is at the top already). */
export const promoteCost = (game, s) => (s.rank + 1 < RANKS.length ? Math.ceil(unitCost(s.type, s.army) * PROMOTE) : null);

export default {
  id: 'pitched',
  name: 'Pitched battle',
  description: 'No points to take: both sides get the same command points, build and promote their army before the battle and set it up. The last side with troops on the field wins — or the other surrenders. What CP is left pays for support during the battle.',
  multiplayer: true,
  budget: true,    // the menu offers the battle size (data/rules.js budget)
  deploys: true,   // opens in the deployment phase (core/GameEngine.js)
  deployText: 'Build your army with Reinforcements. Select a stack: its orders hold Promote (a rank for CP) and Withdraw (sold back). Place it behind the gold line, then Start battle.',

  setup(game) {
    const me = game.playerFaction;
    const foe = enemyOf(me);
    const budget = game.rules.budget ?? 3000;
    const state = {
      points: new ControlPoints(game, []),
      cp: { [me]: budget, [foe]: budget },
      strength: { [me]: 0, [foe]: 0 },   // the bars: each army's value in the field (health × price)
      maxStrength: budget,
      maxStacks: game.rules.maxStacks ?? game.map.maxStacks ?? MAX_STACKS,
      allow: (t) => !!t.stats?.naval === !!game.world.river?.sea, // (a sea map: warships only; a land map: no ships)
      setup: true,                       // buying and promoting: until Start battle
      surrendered: null,
      statusText: '',
    };
    game.modeState = state;
    game.frontlineHud = new FrontlineHUD(game, state);
    game.bus.on('ui:reinforce', (typeId) => game.orders.issue({ t: 'buy', u: typeId }));
    game.bus.on('deploy:go', () => {   // the battle begins: no more buying
      state.setup = false;
      state.noReinforcements = true;
      game.frontlineHud.window?.toggle(false);
      game.bus.emit('toast', 'No reinforcements in a pitched battle — your CP pays for support now');
    });
    if (game.net?.isClient) return; // (the host runs the rest)
    const buy = makeBuyer(game, state);
    state.buy = (...a) => {
      if (!state.setup) { game.tell(a[0], 'The battle has begun: no more troops — CP pays for support'); return null; }
      state.entryFree = {}; // (the clock stands still while setting up: the roads are never busy)
      const s = buy(...a);
      if (s) s.paid = unitCost(s.type, s.army);
      return s;
    };
    if (!game.net || game.coop) game.systems.push(new PitchedDirector(game, foe, state)); // versus: a person builds that army
    game.bus.emit('toast', 'Pitched battle: build your army, then Start battle');
  },

  update(game) {
    const state = game.modeState;
    const me = game.playerFaction;
    const foe = enemyOf(me);
    for (const f of [me, foe]) state.strength[f] = Math.round(fieldStrength(game, f));
    game.frontlineHud.update();
    if (game.net?.isClient || state.setup) return;
    const out = (f) => state.surrendered === f || forces(game, f).length === 0;
    const loser = out(foe) ? foe : out(me) ? me : null;
    if (!loser) return;
    const gave = state.surrendered === loser;
    const result = (f) => (f === loser
      ? { victory: false, title: 'Defeat', subtitle: gave ? 'You surrendered.' : 'Your army has been destroyed.' }
      : { victory: true, title: 'Victory', subtitle: gave ? `The ${FACTIONS[loser].name} surrendered.` : `The ${FACTIONS[loser].name} army has been destroyed.` });
    game.net?.sendEnd(result(game.net.remoteFaction));
    game.end(result(me));
  },

  clientUpdate(game) {
    this.update(game);
  },
};
