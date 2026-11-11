// Landing: one side comes in from the sea, the other holds the coast (the coastal maps: Omaha).
//   • The side whose base is out at sea lands (systems/Landing.js: everything it buys for the land
//     comes in a landing craft). The map's first wave goes in at H-hour, at the start.
//   • The beach sectors (the map's points with `opens`) are open from the start. A sector the
//     landing side holds opens the zone behind it — the draw up to its village (`opens`: that
//     point's id); once open it stays open.
//   • The landing wins by holding every inland zone (the ones the sectors open) at once. The
//     defence wins when the clock runs out, or when the landing has spent itself.
//   • The landing side has a reserve of command points and a trickle more for each beach sector it
//     holds (supplies coming over the beach); every sector taken brings fresh reserves. The defence
//     earns a steady income for its reserves (they come from the inland edge).
// Either side can be played; the AI takes the other.
import { ControlPoints } from '../systems/ControlPoints.js';
import { LandingDirector } from '../ai/LandingDirector.js';
import { FrontlineHUD } from '../ui/FrontlineHUD.js';
import { enemyOf, FACTIONS } from '../data/factions.js';
import { deploy, makeBuyer, clientSetup, clientUpdate, clock } from './shared.js';

/** A side's strength in the field: its men, vehicles and ships — not the concrete (the bar would be all Atlantic Wall). */
const fieldStrength = (game, f) => game.world.stacksOf(f).filter((s) => !s.stats.structure).reduce((a, s) => a + s.hpRatio * (s.type.cost ?? 150), 0);

const TIME = 30 * 60;           // to take the villages
const RESERVES = 2400;          // the landing's CP at H-hour…
const RESERVES_PER_SECTOR = 800; // …and for each sector first taken
const BEACH_INCOME = 0.9;       // CP / s for each beach sector held (supplies over the beach)
const DEFENCE_CP = 700;
const DEFENCE_INCOME = 1.2;     // CP / s

const DEFENCE_FORCE = ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mortar', 'atTeam', 'rifles', 'atTeam', 'mortar', 'scouts'];

export default {
  id: 'landing',
  name: 'Landing',
  only: true, // (offered only on the maps that list it: the coastal ones)
  description: 'One side lands from the sea, the other holds the coast. Take the beach sectors to open the ways inland, then hold every village — before the clock runs out.',
  multiplayer: true,

  setup(game) {
    if (game.net?.isClient) {
      clientSetup(game);
      game.bus.emit('toast', 'Landing — one side comes in from the sea, the other holds the coast.');
      return;
    }
    const map = game.map;
    const att = ['nato', 'pact'].find((f) => game.landing?.lands(f)) ?? 'nato';
    const def = enemyOf(att);
    const opens = Object.fromEntries(map.points.filter((p) => p.opens).map((p) => [p.id, p.opens]));
    const inland = new Set(Object.values(opens));
    const points = new ControlPoints(game, map.points.map((p) => ({ ...p, owner: p.owner ?? (opens[p.id] || inland.has(p.id) ? def : null) })));
    const state = {
      points,
      cp: { [att]: RESERVES, [def]: DEFENCE_CP },
      attacker: att,
      strength: { [att]: 1, [def]: 1 },
      maxStrength: 1,
      maxStacks: map.maxStacks ?? 22,
      deadline: TIME,
      taken: new Set(),   // sectors the landing has held at some point (their reserves paid, their zone open)
      status: () => {
        const held = [...inland].filter((id) => points.points.find((p) => p.id === id)?.owner === att).length;
        return `Inland ${held} of ${inland.size} · ${clock(state.deadline - game.time)} left · Landing reserves ${Math.floor(state.cp[att])} CP`;
      },
    };
    state.buy = makeBuyer(game, state);
    state.allow = (t, f = game.playerFaction) => !t.stats?.naval || (f === att && (map.landing?.navy ?? [t.id]).includes(t.id)); // (ships for the side that lands: the map's navy)
    game.modeState = state;
    this.opens = opens;
    this.inland = inland;
    this.lock(state);

    for (const sp of map.spawns?.[att] ?? []) game.spawnStack(sp.unit, att, sp, sp.facing ?? 0); // (the landing's ships, already off the beach)
    // the defence: its men on the bluffs over the beach and in the villages (the bunkers are the map's: coastal step 4)
    const hold = map.landing?.hold ?? map.points.filter((p) => p.owner !== att);
    deploy(game, def, map.landing?.defence ?? DEFENCE_FORCE, hold, { back: 6, spread: 16 });
    // the Atlantic Wall: the map's resistance nests and batteries, its wire, mines and tank traps
    for (const f of map.landing?.forts ?? []) game.spawnStack(f.unit, def, f, f.facing ?? 0);
    for (const w of map.landing?.works ?? []) {
      const site = game.construction.place(w.kind, w.x, w.z, w.yaw ?? 0, def);
      if (site) { site.quiet = true; game.construction.finish(site); }
    }
    state.strength[def] = fieldStrength(game, def);
    state.maxStrength = Math.max(state.strength[def], RESERVES) * 1.2;
    game.systems.push(points);
    const ai = enemyOf(game.playerFaction);
    if (!game.net || game.coop) {
      game.systems.push(new LandingDirector(game, ai, state, ai === def
        ? { attack: false, expand: false }
        : { expand: false, firstAssault: 30, targetable: (p) => !p.locked })); // (ai/LandingDirector.js: the landing's AI, or the defence's)
    }
    game.frontlineHud = new FrontlineHUD(game, state);
    game.bus.on('ui:reinforce', (typeId) => game.orders.issue({ t: 'buy', u: typeId }));
    game.bus.emit('toast', game.playerFaction === att
      ? 'Landing — the first wave is going in. Take the beach sectors to open the draws, then hold every village.'
      : 'Landing — they are coming in from the sea. Hold the beach and the draws: every village must stand when the clock runs out.');
  },

  /** The beach sectors are always in play; a zone inland only once its sector has been taken. The rest never. */
  lock(state) {
    for (const p of state.points.points) {
      const sector = !!this.opens[p.id];
      const open = this.inland.has(p.id) && [...state.taken].some((id) => this.opens[id] === p.id);
      p.locked = !(sector || open);
      state.points.paint(p);
    }
  },

  update(game, dt) {
    const state = game.modeState;
    const att = state.attacker;
    const def = enemyOf(att);
    const held = (id) => state.points.points.find((p) => p.id === id)?.owner === att;
    const sectors = Object.keys(this.opens);
    state.cp[def] += dt * DEFENCE_INCOME;
    state.cp[att] += dt * BEACH_INCOME * sectors.filter(held).length;
    state.strength[att] = fieldStrength(game, att);
    state.strength[def] = fieldStrength(game, def);

    // a sector taken for the first time: the draw behind it is open, and fresh reserves come in
    for (const id of sectors) {
      if (state.taken.has(id) || !held(id)) continue;
      state.taken.add(id);
      state.cp[att] += RESERVES_PER_SECTOR;
      this.lock(state);
      const p = state.points.points.find((q) => q.id === id), to = state.points.points.find((q) => q.id === this.opens[id]);
      game.tellBoth(att, `${p.name} is ours — the way up to ${to.name} is open. More boats are coming in.`, `${p.name} is lost — they are coming up the draw to ${to.name}!`);
    }
    if ([...this.inland].every(held)) return this.finish(game, def, `Every village is taken: the beachhead holds.`);
    if (game.time >= state.deadline) return this.finish(game, att, 'The landing has run out of time.');
    const spent = (f) => game.world.stacksOf(f).filter((s) => !s.stats.naval || s.cargo).length === 0 && Math.max(state.cp[f], state.cp[`${f}:guest`] ?? 0) < 150;
    if (game.time > 120 && spent(att)) return this.finish(game, att, 'The landing has spent itself on the beach.');
    if (spent(def)) return this.finish(game, def, 'The defence has been wiped out.');
    game.frontlineHud.update();
  },

  finish(game, loser, why) {
    const result = (f) => (f === loser
      ? { victory: false, title: 'Defeat', subtitle: why }
      : { victory: true, title: 'Victory', subtitle: `${why} The ${FACTIONS[loser].name} is beaten.` });
    game.net?.sendEnd(result(game.net.remoteFaction));
    game.end(result(game.playerFaction));
  },

  clientUpdate,
};
