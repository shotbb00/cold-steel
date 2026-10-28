// The installable game: registers the service worker (src/pwa/sw-template.js, written to
// dist/sw.js by the build) in a built game, never in `npm run dev`. It checks for a new build
// when the game starts, every half hour, and whenever the app comes back to the front. A new
// build takes over in the background; the page then reloads into it the next time it shows
// the main menu — never in the middle of a battle.
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  let pending = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // the very first install: this page is already the new build
    pending = true;
    reloadWhenIdle();
  });
  const reloadWhenIdle = () => {
    if (!pending) return;
    if (!window.game) location.reload();            // in the menu: straight in
    else setTimeout(reloadWhenIdle, 5000);          // in battle: wait for the menu (a reload shows it)
  };
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
      const check = () => reg.update().catch(() => { /* offline */ });
      setInterval(check, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    } catch { /* no service worker (private mode, file://): the game still runs, just not offline */ }
  });
}
