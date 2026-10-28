// Battle rules a single-player battle can be set up with (main menu → Single player → Battle rules):
//   difficulty  how hard the AI fights: its soldiers' aim, its income, how soon and how often it
//               attacks (DIFFICULTY)
//   air         false: no air support for either side
//   changingWeather  the weather moves on every few minutes (systems/WeatherChange.js)
//   timePasses  the day goes on: day → dusk → night → dawn (systems/WeatherChange.js)
// and, for the point-capture modes (mode.economy — Frontline, Infantry only):
//   startCp     command points each side starts with
//   income      multiplier on both sides' command-point income
//   strength    front strength each side starts with: how long a battle lasts
//   maxStacks   stacks each side may have in the field (null: the map's own limit)
// Multiplayer and campaign battles use the defaults.
export const DEFAULT_RULES = { difficulty: 'normal', air: true, changingWeather: true, timePasses: true, startCp: 350, income: 1, strength: 1000, maxStacks: null };

export const DIFFICULTY = {
  //            enemy aim (spread ×)  enemy income ×  first assault, gaps between operations ×
  recruit: { label: 'Recruit', aim: 1.35, income: 0.7, tempo: 1.4 },
  normal: { label: 'Regular', aim: 1, income: 1, tempo: 1 },
  hard: { label: 'Veteran', aim: 0.85, income: 1.25, tempo: 0.8 },
  elite: { label: 'Elite', aim: 0.72, income: 1.5, tempo: 0.65 },
};

/** The choices offered in the menu: [value, label] per rule. */
export const RULE_OPTIONS = {
  difficulty: Object.entries(DIFFICULTY).map(([k, d]) => [k, d.label]),
  air: [[true, 'On'], [false, 'Off']],
  changingWeather: [[true, 'Changes'], [false, 'Stays as chosen']],
  timePasses: [[true, 'Passes'], [false, 'Stays as chosen']],
  startCp: [[150, '150'], [350, '350'], [600, '600'], [1000, '1000']],
  income: [[0.5, 'Low'], [1, 'Normal'], [1.5, 'High'], [2.5, 'Very high']],
  strength: [[500, 'Short'], [1000, 'Normal'], [1800, 'Long'], [3000, 'Very long']],
  maxStacks: [[8, '8'], [12, '12'], [null, 'Map'], [22, '22']],
};

/** Rules from a (possibly partial or old) saved choice, with every field filled. */
export const rulesFrom = (r) => ({ ...DEFAULT_RULES, ...(r ?? {}) });
