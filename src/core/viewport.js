// What the browser really shows, as CSS variables (--vvw, --vvh: css/style.css). On an iPhone the page can be
// bigger than what is visible — Chrome's side buttons in landscape, Safari's sliding bars — and a layout made
// for the whole page puts its right-hand panels under them. visualViewport is the visible part; it settles a
// moment after a turn of the phone, so it is measured again then (and the game told: GameEngine.onResize).
export function trackViewport() {
  const v = window.visualViewport;
  if (!v) return;
  const root = document.documentElement.style;
  const fit = () => {
    if (Math.abs(v.scale - 1) > 0.01) return; // (pinch-zoomed: that is not a smaller screen)
    const w = `${Math.round(v.width)}px`, h = `${Math.round(v.height)}px`;
    if (root.getPropertyValue('--vvw') === w && root.getPropertyValue('--vvh') === h) return;
    root.setProperty('--vvw', w);
    root.setProperty('--vvh', h);
    window.dispatchEvent(new Event('resize')); // (the game resizes its picture to the new box)
  };
  fit();
  v.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => { for (const t of [100, 400, 900]) setTimeout(fit, t); });
}
