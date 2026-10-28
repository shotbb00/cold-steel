// The Cold Steel mark, "Iron Star": a riveted steel disc holding a faceted star, NATO blue on one
// half and Pact red on the other, an M7 bayonet driven down the line between them; beside it a
// chamfered stencil wordmark drawn as paths. The artwork lives in public/brand/ (mark.svg: the
// lockup, emblem.svg: the disc alone; the app icons in public/icons/ are rendered from it); the
// tagline is page text in the UI font. Used by the main menu and the loading screen (index.html
// has the same markup for the first paint).
export function logo(title, tagline) {
  return `<div class="logo"><img class="logo-art" src="brand/mark.svg" alt="${title}" width="605" height="268" decoding="async"><span class="logo-tag">${tagline}</span></div>`;
}
