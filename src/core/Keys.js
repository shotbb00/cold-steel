// Key bindings: every action the keyboard drives, its default key, and the player's own choice
// (settings 'keys': { action: code }), shared by the handlers (keys.is(code, action), keys.down),
// the settings panel (rebinding) and the on-screen help line. Codes are KeyboardEvent.code, so a
// binding stays on the same physical key whatever the keyboard layout. `ctx` says where an action
// applies — 'command' (the command view), 'control' (direct control of a unit) or 'both' — and
// two actions may only share a key if they never apply at the same time.
import { settings } from './Settings.js';

export const ACTIONS = [
  // camera / movement (held)
  { id: 'up', label: 'Pan / move forward', ctx: 'both', key: 'KeyW', alt: 'ArrowUp' },
  { id: 'down', label: 'Pan / move back', ctx: 'both', key: 'KeyS', alt: 'ArrowDown' },
  { id: 'left', label: 'Pan / move left', ctx: 'both', key: 'KeyA', alt: 'ArrowLeft' },
  { id: 'right', label: 'Pan / move right', ctx: 'both', key: 'KeyD', alt: 'ArrowRight' },
  { id: 'resetView', label: 'Reset the camera', ctx: 'command', key: 'Home' },
  { id: 'toggleView', label: 'Command view / direct control', ctx: 'both', key: 'Tab' },
  // command view
  { id: 'selectAll', label: 'Select all', ctx: 'command', key: 'KeyQ' },
  { id: 'reinforce', label: 'Reinforcements', ctx: 'command', key: 'KeyC' },
  { id: 'hold', label: 'Hold position', ctx: 'command', key: 'KeyH' },
  { id: 'sandbags', label: 'Build sandbags', ctx: 'command', key: 'KeyN' },
  { id: 'trench', label: 'Dig a trench', ctx: 'command', key: 'KeyT' },
  { id: 'wire', label: 'Lay wire', ctx: 'command', key: 'KeyV' },
  { id: 'mines', label: 'Lay mines', ctx: 'command', key: 'KeyF' },
  { id: 'engineer', label: 'Engineers: clear / blow bridge', ctx: 'command', key: 'KeyX' },
  { id: 'smoke', label: 'Smoke', ctx: 'command', key: 'KeyK' },
  { id: 'flare', label: 'Illumination flare (night)', ctx: 'command', key: 'KeyL' },
  { id: 'unload', label: 'Unload', ctx: 'command', key: 'KeyU' },
  { id: 'leave', label: 'Leave a building', ctx: 'command', key: 'KeyE' },
  { id: 'heli', label: 'Helicopter', ctx: 'command', key: 'KeyY' },
  { id: 'jet', label: 'Jet gun run', ctx: 'command', key: 'KeyJ' },
  { id: 'lift', label: 'Air assault', ctx: 'command', key: 'KeyP' },
  { id: 'turnLeft', label: 'Turn the air run left', ctx: 'command', key: 'KeyQ', targeting: true },
  { id: 'turnRight', label: 'Turn the air run right', ctx: 'command', key: 'KeyE', targeting: true },
  // direct control
  { id: 'sprint', label: 'Sprint', ctx: 'control', key: 'ShiftLeft', alt: 'ShiftRight' },
  { id: 'reload', label: 'Reload', ctx: 'control', key: 'KeyR' },
  { id: 'crouch', label: 'Crouch', ctx: 'control', key: 'KeyC' },
  { id: 'prone', label: 'Prone', ctx: 'control', key: 'KeyZ' },
  { id: 'prevMember', label: 'Previous squad member', ctx: 'control', key: 'KeyQ' },
  { id: 'nextMember', label: 'Next squad member', ctx: 'control', key: 'KeyE' },
  { id: 'sight', label: 'Thermal / night sight', ctx: 'control', key: 'KeyN' },
  // anywhere
  { id: 'quality', label: 'Cycle graphics quality', ctx: 'both', key: 'KeyG' },
  { id: 'mute', label: 'Mute', ctx: 'both', key: 'KeyM' },
  { id: 'chat', label: 'Chat (multiplayer)', ctx: 'both', key: 'Enter', alt: 'NumpadEnter' },
  { id: 'bloom', label: 'Bloom on / off', ctx: 'both', key: 'KeyB' },
  { id: 'ao', label: 'Ambient occlusion on / off', ctx: 'both', key: 'KeyO' },
];
const BY_ID = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

/** Escape (menus, cancel) is never rebindable. */
export const RESERVED = new Set(['Escape']);

export const keys = {
  /** The key bound to an action now. */
  code(id) {
    return settings.get('keys')?.[id] ?? BY_ID[id]?.key;
  },
  /** Does this key press mean that action? (the default's second key, e.g. the arrows, still works unless rebound) */
  is(code, id) {
    const a = BY_ID[id];
    if (!a) return false;
    return code === this.code(id) || (!settings.get('keys')?.[id] && code === a.alt);
  },
  /** Every key that currently triggers the action (for held keys: input.isDown / axis). */
  all(id) {
    const a = BY_ID[id];
    const own = settings.get('keys')?.[id];
    return own ? [own] : [a.key, a.alt].filter(Boolean);
  },
  bind(id, code) {
    settings.set('keys', { ...(settings.get('keys') ?? {}), [id]: code });
  },
  reset() {
    settings.set('keys', {});
  },
  /** Other actions on the same key that apply at the same time. */
  conflicts(id) {
    const a = BY_ID[id];
    const code = this.code(id);
    return ACTIONS.filter((b) => b.id !== id && this.code(b.id) === code
      && (a.ctx === 'both' || b.ctx === 'both' || a.ctx === b.ctx) && !!a.targeting === !!b.targeting);
  },
};

/** A key code as printed on the key: KeyQ → Q, Digit1 → 1, ArrowUp → ↑, ShiftLeft → Shift. */
export function keyName(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  const named = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ShiftLeft: 'Shift', ShiftRight: 'R-Shift', ControlLeft: 'Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'Alt', AltRight: 'Alt Gr', Space: 'Space', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\' };
  return named[code] ?? code;
}

/** Name of the key bound to an action, for help texts. */
export const keyOf = (id) => keyName(keys.code(id));

/**
 * Key hints in the page: any element with data-key="action" shows that action's key. Filled at
 * start, again whenever the bindings change, and for hints added later (panels built on the fly).
 */
export function fillKeyHints(root = document) {
  for (const el of root.querySelectorAll('[data-key]')) {
    if (el.dataset.key) el.textContent = keyOf(el.dataset.key);
  }
}
if (typeof document !== 'undefined') {
  const start = () => {
    fillKeyHints();
    new MutationObserver((list) => {
      for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.dataset?.key || n.querySelector?.('[data-key]'))) fillKeyHints(n.parentNode ?? n);
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  settings.on((key) => { if (key === 'keys') fillKeyHints(); });
}
