// The HUD's icons: filled technical silhouettes on a 32 px grid (orders, support powers,
// reinforcements, the touch bar), a few fine-line ones where a silhouette would read worse.
// icon(name) → the <svg> markup; colour and size come from CSS (.ico, .ico.line in style.css).
const FILLED = {
  sandbags: '<rect x="1.5" y="21.5" width="9" height="7" rx="3"/><rect x="11.5" y="21.5" width="9" height="7" rx="3"/><rect x="21.5" y="21.5" width="9" height="7" rx="3"/><rect x="6.5" y="13.5" width="9" height="7" rx="3"/><rect x="16.5" y="13.5" width="9" height="7" rx="3"/><rect x="11.5" y="5.5" width="9" height="7" rx="3"/>',
  trench: '<path d="M1 15h7l3.5 11h9L24 15h7v14H1z"/><rect x="1.5" y="10.5" width="7" height="4" rx="1.6"/><rect x="23.5" y="12" width="6" height="2.5" rx="1"/>',
  mines: '<path fill-rule="evenodd" d="M4 18.5C4 16 9.4 14 16 14s12 2 12 4.5v3.5c0 2.5-5.4 4.5-12 4.5S4 24.5 4 22zm12 2.2c5 0 9-1 9-2.2s-4-2.2-9-2.2-9 1-9 2.2 4 2.2 9 2.2z"/><rect x="13" y="10" width="6" height="5.5" rx="1"/><path d="M0 24.5h32V30H0z" opacity="0.45"/>',
  smoke: '<circle cx="10.5" cy="17" r="5.5"/><circle cx="18" cy="12.5" r="7"/><circle cx="24" cy="18.5" r="5"/><rect x="5" y="18" width="23" height="6" rx="3"/><rect x="13" y="26" width="6" height="4" rx="1"/>',
  heli: '<rect x="2" y="7" width="28" height="1.4"/><rect x="17.3" y="8.2" width="1.6" height="3.5"/><path d="M2 14.6h10.5l3.5-2.6h8c3.2 0 5.7 1.5 6.8 3.6-1 2-3.6 3.2-6.8 3.2h-9.5l-2.8-2.4H2z"/><rect x="1.2" y="11" width="1.6" height="7.5"/><path d="M14.5 19h1.4l-.6 3.3h11.4l-.6-3.3h1.4l.7 3.3h.8v1.3H12.6v-1.3h1.3z"/>',
  jet: '<path d="M15 2h2l1 5.5V27l-1 3h-2l-1-3V7.5z"/><path d="M1.5 13h29v3.2L18 17.4h-4L1.5 16.2z"/><rect x="10.3" y="18.5" width="3.2" height="6" rx="1.3"/><rect x="18.5" y="18.5" width="3.2" height="6" rx="1.3"/><path d="M8 25.5h16v2.2H8z"/><rect x="7.6" y="23.5" width="1.6" height="6"/><rect x="22.8" y="23.5" width="1.6" height="6"/>',
  assault: '<rect x="2" y="3" width="28" height="1.4"/><rect x="15.2" y="4.2" width="1.6" height="2.8"/><path d="M3 9.8h7.5l2.2-2.6h9.5c3.4 0 6.3 1.8 6.8 4.6-.6 2.4-3.4 3.6-6.8 3.6H12l-1.8-2.6H3z"/><rect x="2.2" y="7" width="1.6" height="6"/><path d="M16 17l6 6.5h-4V30h-4v-6.5h-4z"/>',
  gas: '<path fill-rule="evenodd" d="M16 2.5c6.4 0 10.5 4.3 10.5 10.2v3.6c0 6-4.6 10.7-10.5 10.7S5.5 22.3 5.5 16.3v-3.6C5.5 6.8 9.6 2.5 16 2.5zM11.4 10.5c-1.9 0-3.3 1.3-3.3 3s1.4 3 3.3 3 3.3-1.3 3.3-3-1.4-3-3.3-3zm9.2 0c-1.9 0-3.3 1.3-3.3 3s1.4 3 3.3 3 3.3-1.3 3.3-3-1.4-3-3.3-3z"/><path fill-rule="evenodd" d="M16 21.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2.4a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2z"/>',
  reinforce: '<path d="M16 5l12 9v4.5L16 9.5 4 18.5V14z"/><path d="M16 14l12 9v4.5l-12-9-12 9V23z"/>',
  chat: '<path d="M5 7h22v14H14l-6 5v-5H5z"/>',
  pause: '<rect x="8" y="6" width="5.5" height="20"/><rect x="18.5" y="6" width="5.5" height="20"/>',
};
const LINE = {
  wire: '<path d="M1 27h30M4 27V12M28 27V12"/><ellipse cx="9" cy="18" rx="4.5" ry="7"/><ellipse cx="14" cy="18" rx="4.5" ry="7"/><ellipse cx="19" cy="18" rx="4.5" ry="7"/><ellipse cx="24" cy="18" rx="4.5" ry="7"/><path d="M7 10.5l1.5 1.5M12 10.5l1.5 1.5M17 10.5l1.5 1.5M22 10.5l1.5 1.5M10 25l1.5-1.5M15 25l1.5-1.5M20 25l1.5-1.5"/>',
  cancel: '<path d="M4 10V4h6M22 4h6v6M28 22v6h-6M10 28H4v-6"/><path d="M11 11l10 10M21 11L11 21"/>',
  control: '<circle cx="16" cy="16" r="8.5"/><path d="M16 2v8M16 22v8M2 16h8M22 16h8"/><circle cx="16" cy="16" r="1.6" class="dot"/>',
  engineer: '<path d="M25 3L12 20"/><path d="M22.5 5.5l4 3"/><ellipse cx="9" cy="24" rx="7.5" ry="3.2"/><path d="M2 30h28"/>',
  flare: '<circle cx="16" cy="11" r="3.2" class="dot"/><path d="M16 2v3.5M16 16.5V20M7 11h3.5M21.5 11H25M9.6 4.6l2.4 2.4M20 15l2.4 2.4M22.4 4.6L20 7M12 15l-2.4 2.4"/><path d="M16 22v2M16 26.5v2"/>',
  unload: '<path d="M2 22h16v-7l-3.5-4H2z"/><path d="M2 26h16"/><path d="M20 18h10M26 14l4 4-4 4"/>',
  leave: '<path d="M4 29V12l10-8 10 8v3"/><path d="M10 29v-8h6v8"/><path d="M19 23h11M26 19l4 4-4 4"/>',
  bridge: '<path d="M2 13h28M5 13v9M27 13v9"/><path d="M9 13c2.5-5 11.5-5 14 0"/><path d="M2 26c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 7 0 4.5 2 7 0"/>',
  selectAll: '<path d="M4 9V4h5M23 4h5v5M28 23v5h-5M9 28H4v-5"/><path d="M10 16.5l4 4 8-9"/>',
  deselect: '<path d="M4 9V4h5M23 4h5v5M28 23v5h-5M9 28H4v-5"/><path d="M11 11l10 10M21 11L11 21"/>',
  turnLeft: '<path d="M9 13a9 9 0 1 1 1.5 10"/><path d="M8 5v8h8"/>',
  turnRight: '<path d="M23 13a9 9 0 1 0-1.5 10"/><path d="M24 5v8h-8"/>',
  close: '<path d="M8 8l16 16M24 8L8 24"/>',
  place: '<path d="M6 17l6 6L26 9"/>',
  withdraw: '<path d="M27 9H11v13"/><path d="M5 16l6 6 6-6"/><path d="M4 28h24"/>',
};

/** The <svg> for icon `name` ('' if there is none), with extra CSS classes `cls`. */
export function icon(name, cls = '') {
  const filled = FILLED[name];
  const body = filled ?? LINE[name];
  if (!body) return '';
  return `<svg class="ico${filled ? '' : ' line'}${cls ? ` ${cls}` : ''}" viewBox="0 0 32 32" aria-hidden="true">${body}</svg>`;
}

/** A unit's side-view silhouette (public/silhouettes, made by tools/render_silhouettes.py), as a
 *  mask so CSS gives it its colour; nothing shows if the type has none. */
export function silhouette(typeId, faction, cls = '') {
  const url = `url(silhouettes/${typeId}-${faction}.png)`;
  return `<i class="sil${cls ? ` ${cls}` : ''}" style="-webkit-mask-image:${url};mask-image:${url}" aria-hidden="true"></i>`;
}
