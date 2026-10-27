// "Play again" without putting the battle into the address: the running battle remembers its
// mode and map; requestReplay() leaves a one-shot note in sessionStorage and reloads, and the
// next load (main.js) takes the note and skips the menu. A plain reload shows the menu.
const KEY = 'coldsteel.replay';
let current = null;

export function rememberBattle(choice) {
  current = choice;
}

/** Reload straight into the same battle. */
export function requestReplay() {
  try { if (current) sessionStorage.setItem(KEY, JSON.stringify(current)); } catch { /* storage blocked */ }
  location.reload();
}

/** Back to the main menu (optionally on one of its tabs, e.g. 'campaign'). */
export function toMenu(tab = null) {
  try {
    sessionStorage.removeItem(KEY);
    if (tab) sessionStorage.setItem(`${KEY}.tab`, tab);
  } catch { /* storage blocked */ }
  location.href = location.pathname;
}

/** The menu tab asked for by toMenu(tab), if any — consumed on read. */
export function takeMenuTab() {
  try {
    const tab = sessionStorage.getItem(`${KEY}.tab`);
    sessionStorage.removeItem(`${KEY}.tab`);
    return tab;
  } catch {
    return null;
  }
}

/** The pending replay, if any — consumed on read. */
export function takeReplay() {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
