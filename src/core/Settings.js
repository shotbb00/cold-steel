// Player settings, shared by the main menu, the pause menu and the running game, kept in
// localStorage. settings.get(key) / settings.set(key, value); settings.on(fn) is told about
// every change as fn(key, value), so systems apply them live.
const STORE = 'coldsteel.settings';

export const DEFAULTS = {
  quality: null,       // 'low' | 'medium' | 'high'; null = not chosen yet (auto-detect on first run)
  benchmark: false,    // true: the next (or current) battle runs the graphics benchmark (render/Quality.js)
  renderScale: null,   // 0.5 … 1: render resolution against the screen; null = the quality preset's
  volume: 0.8,         // master volume 0..1
  sensitivity: 1,      // mouse look multiplier (direct control)
  invertY: false,
  showFps: true,
  keys: {},
  playerName: '',      // shown to the other player in multiplayer (lobby, chat)            // the player's own key bindings: { action: KeyboardEvent.code } (core/Keys.js)
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? '{}');
    // the quality preset used to live under its own key
    if (raw.quality == null) raw.quality = localStorage.getItem('coldsteel.quality');
    return raw;
  } catch {
    return {};
  }
}

class Settings {
  constructor() {
    this.values = { ...DEFAULTS, ...load() };
    this.listeners = new Set();
  }

  get(key) {
    return this.values[key];
  }

  set(key, value) {
    if (this.values[key] === value) return;
    this.values[key] = value;
    try { localStorage.setItem(STORE, JSON.stringify(this.values)); } catch { /* private mode */ }
    for (const fn of this.listeners) fn(key, value);
  }

  /** Subscribe to changes; returns an unsubscribe function. */
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const settings = new Settings();
