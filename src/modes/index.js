// Game mode registry. Add a mode file shaped like frontline.js / skirmish.js and register it
// here; load it with ?mode=<id>.
import frontline from './frontline.js';
import skirmish from './skirmish.js';
import breakthrough from './breakthrough.js';
import rearguard from './rearguard.js';
import recon from './recon.js';
import lanes from './lanes.js';
import infantry from './infantry.js';
import bootcamp from './bootcamp.js';

export const MODES = {
  [frontline.id]: frontline,
  [infantry.id]: infantry,
  [breakthrough.id]: breakthrough,
  [rearguard.id]: rearguard,
  [recon.id]: recon,
  [lanes.id]: lanes,
  [skirmish.id]: skirmish,
  [bootcamp.id]: bootcamp,   // hidden: started from the Boot camp tab
};

export const DEFAULT_MODE = frontline.id;

export function getMode(id) {
  return MODES[id] ?? MODES[DEFAULT_MODE];
}
