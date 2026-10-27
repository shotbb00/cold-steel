// Minimal pub/sub so systems can react to each other without direct references.
//
// Events used today:
//   key, mousedown, mouseup, pointerlock        (InputHandler)
//   unit:death, stack:destroyed                 (UnitStack)
//   possess, player:down, player:reloaded       (PlayerControl)
//   point:captured, wave, view, order           (modes / CommandSystem / GameEngine)
//   selection, ui:command, toast, game:end      (CommandSystem / HUD / GameEngine)

export class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  /** Subscribe; returns an unsubscribe function. */
  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type)?.delete(fn);
  }

  emit(type, payload) {
    const set = this.handlers.get(type);
    if (set) for (const fn of set) fn(payload);
  }
}
