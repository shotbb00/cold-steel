// Skirmish: spawn the map's armies, let a bot director drive the enemy, and feed both sides
// reinforcement waves. Win by destroying every enemy stack once the last enemy wave has
// landed; lose if all of yours fall.
//
// A game mode is { id, name, description, setup(game), update(game, dt) }. setup spawns
// whatever the mode needs and may push extra systems ({ update(dt, t) }) onto game.systems.
import { epoch } from '../data/epoch.js';
import { EnemyDirector } from '../ai/EnemyDirector.js';
import { SeaDirector } from '../ai/SeaDirector.js';
import { enemyOf, FACTIONS } from '../data/factions.js';

// Reinforcement schedule (seconds of game time) for the enemy and for your side. Units spawn
// at that side's map spawn points.
const WAVES = [
  { at: 95, side: 'enemy', units: ['rifles', 'atTeam'] },
  { at: 150, side: 'ally', units: ['rifles'] },
  { at: 190, side: 'enemy', units: ['rifles', 'rifles', 'atTeam'] },
];
// at sea: the follow-on squadrons
const SEA_WAVES = [
  { at: 120, side: 'enemy', units: ['destroyer', 'frigate'] },
  { at: 200, side: 'ally', units: ['destroyer'] },
  { at: 280, side: 'enemy', units: ['cruiser', 'destroyer', 'submarine'] },
];

export default {
  id: 'skirmish',
  name: 'Skirmish',
  description: 'Hold the line against the enemy and their follow-on echelons.',

  setup(game) {
    for (const [faction, spawns] of Object.entries(game.map.spawns)) {
      for (const sp of spawns) game.spawnStack(sp.unit, faction, sp, sp.facing ?? 0, epoch() === '1985' ? sp.name : undefined); // (the maps' names are 1985's: "1-ya Rota")
    }
    const foe = enemyOf(game.playerFaction);
    const sea = !!game.world.river?.sea;
    game.systems.push(sea
      ? new SeaDirector(game, foe, { maxStacks: 99, cp: { [foe]: 0 } }, { hunt: true }) // (no points to take: it goes for your fleet)
      : new EnemyDirector(game, foe, { holdTime: 12 }));
    game.modeState = { waves: (sea ? SEA_WAVES : WAVES).map((w) => ({ ...w, faction: w.side === 'enemy' ? foe : game.playerFaction, done: false })), waveNo: 0 };
    game.bus.emit('toast', sea ? 'An enemy squadron is out there, more on the way — find it and sink it' : 'Enemy stacks are massing across the valley — set your lines');
  },

  update(game) {
    const state = game.modeState;
    for (const wave of state.waves) {
      if (wave.done || game.time < wave.at) continue;
      wave.done = true;
      const layout = game.map.spawns[wave.faction];
      wave.units.forEach((unit, i) => {
        const sp = layout[i % layout.length];
        const sea = !!game.world.river?.sea;
        const name = sea ? undefined : `${wave.faction === game.playerFaction ? 'Relief' : 'Echelon'} ${['I', 'II', 'III', 'IV'][i] ?? i + 1}-${++state.waveNo}`; // (ships keep their class name)
        game.spawnStack(unit, wave.faction, { x: sp.x + (Math.random() - 0.5) * (sea ? 300 : 6), z: sp.z }, sp.facing ?? 0, name);
      });
      game.bus.emit('wave', { faction: wave.faction, units: wave.units });
      game.bus.emit('toast', wave.faction === game.playerFaction
        ? `Reinforcements have reached your base (${wave.units.length} stack${wave.units.length > 1 ? 's' : ''})`
        : game.world.river?.sea ? `More enemy ships are coming in (${wave.units.length})` : `Enemy reinforcements are entering the valley (${wave.units.length} stacks)`);
    }

    const foe = enemyOf(game.playerFaction);
    const world = game.world;
    const allies = world.stacksOf(game.playerFaction).length;
    const enemies = world.stacksOf(foe).length;
    const enemyWavesLeft = state.waves.some((w) => !w.done && w.faction === foe);
    if (enemies === 0 && !enemyWavesLeft) game.end({ victory: true, title: 'Victory', subtitle: `The ${FACTIONS[foe].name} offensive has been broken.` });
    else if (allies === 0) game.end({ victory: false, title: 'Defeat', subtitle: 'All your stacks have fallen.' });
  },
};
