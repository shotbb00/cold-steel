// Entry point. Opens the main menu (ui/MainMenu.js) — always, on a normal start or reload.
// A multiplayer battle comes from the menu's lobby with `net` (its connection) attached.
// Two ways straight into a battle:
//   • "Play again" / "Restart battle" set a one-shot replay note in sessionStorage
//     (requestReplay) and reload; the next load starts that battle and clears the note
//   • ?mode=…&map=…&side=… in the address (development and headless tests)
import { GameEngine } from './core/GameEngine.js';
import { GAME } from './data/game.js';
import { getMap } from './maps/index.js';
import { getMode } from './modes/index.js';
import { MainMenu } from './ui/MainMenu.js';
import { MenuMusic } from './audio/MenuMusic.js';
import { FACTIONS, PLAYER_FACTION } from './data/factions.js';
import { takeReplay, rememberBattle } from './core/replay.js';
import { registerServiceWorker } from './pwa/register.js';
import './core/Keys.js';   // fills every key hint in the page (data-key) and keeps them current

document.title = GAME.title;
const screen = document.getElementById('loading');

function start({ mode, map, side, time, weather, coop = false, net = null, campaign = null, rules = null }) {
  const playerFaction = FACTIONS[side] ? side : PLAYER_FACTION;
  if (!net && !campaign) rememberBattle({ mode, map, side: playerFaction, time, weather, rules });
  const conditions = time || weather ? { time: time ?? 'day', weather: weather ?? 'overcast' } : null;
  const game = new GameEngine(document.getElementById('app'), { map: getMap(map), mode: getMode(mode), playerFaction, net, conditions, coop, campaign, rules });
  window.game = game; // handy for poking at the simulation from the dev console
}

const params = new URLSearchParams(location.search);
const replay = takeReplay();
if (params.has('mode')) start({ mode: params.get('mode'), map: params.get('map'), side: params.get('side'), time: params.get('time'), weather: params.get('weather') });
else if (replay) start(replay);
else {
  const music = new MenuMusic(); // the menu's own synth tune, until a battle is deployed
  new MainMenu(screen, { onDeploy: (o) => { music.stop(); start(o); } });
}
registerServiceWorker(); // the installed game keeps itself up to date (src/pwa/)
window.booted = true; // every module loaded: the index.html watchdog stands down
