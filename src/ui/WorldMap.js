// The world campaign's map (ui/WarRoom.js): the real world — Natural Earth's coastlines (world-atlas, loaded only when the
// war room opens) in Mercator, centred on 40° E so the Atlantic and the Pacific to Hawaii are both on the sheet — drawn as
// the 1945 staff map on the table (tools/mapstyles.html, the style chosen): yellowed paper with its grain, folds and a
// coffee ring, sepia coastlines, the front in grease pencil. Zoom and pan (wheel, drag, pinch): the paper moves with it.
// A screen-space layer on top takes the war room's pins, counters and arrows at a constant size whatever the zoom.
//   const m = new WorldMap(host, { onView, style })   onView(t): the view changed (redraw the overlay; t: d3-zoom's transform);
//                                              style 'paper' (1945) or 'acetate' (1985: a printed map under a plastic sheet —
//                                              blue grid, marker on the plastic, its glare; css .wm-acetate) or 'trench'
//                                              (1918: the squared trench-map sheet, its big square letters, the front as
//                                              blue and red trench lines with the wire between; css .wm-trench) or
//                                              'engraved' (1806: a hand-coloured copperplate — cream paper, water lines
//                                              along the coasts, the front as a soft wash of each side's colour; css .wm-engraved)
//   await m.load()                             the coastlines
//   m.xy(lon, lat) → [x, y]                    world units (W × H)
//   m.territory(points, areas)                 [{ x, y, side }], [[[x, y] …] …]: each side's ground and the front, inside the war's areas
//   m.flyTo(xys, maxK)                         frame these world points
import { geoMercator, geoPath, geoGraticule, geoGraticule10, geoContains, geoBounds } from 'd3-geo';
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';
import { Delaunay } from 'd3-delaunay';
import { feature, mesh, merge } from 'topojson-client';

export const W = 2000;
const SQUARE = 25; // world units: a lettered square of the 1918 trench-map sheet (about 4.5° of longitude)
const NS = 'http://www.w3.org/2000/svg';
const LAT = [-58, 80];

/** The paper's grain: a tile of noise drawn once (a canvas → an image the sheet repeats). */
let grain = null;
function grainTile() {
  if (grain) return grain;
  const n = 256, cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const g = cv.getContext('2d'), img = g.createImageData(n, n);
  for (let i = 0; i < n * n; i++) { const v = Math.random(), fibre = Math.random() < 0.004 ? 60 : 0; img.data[i * 4] = 70; img.data[i * 4 + 1] = 52; img.data[i * 4 + 2] = 24; img.data[i * 4 + 3] = v * 26 + fibre; }
  g.putImageData(img, 0, 0);
  return (grain = cv.toDataURL());
}

export class WorldMap {
  constructor(host, { onView = () => {}, neutral = [], style = 'paper' } = {}) {
    this.onView = onView;
    this.style = style;
    this.neutral = new Set(neutral); // (the war's neutral countries: never coloured, hatched)
    const s = W / (2 * Math.PI), merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
    this.H = Math.round(s * (merc(LAT[1]) - merc(LAT[0])));
    this.proj = geoMercator().rotate([-40, 0]).scale(s).translate([W / 2, s * merc(LAT[1])]).clipExtent([[0, 0], [W, this.H]]);
    const H = this.H, fold = (x, y, w, h, id) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})"/>`;
    const ring = (lon, lat, r, seed, o = {}) => { const [x, y] = this.proj([lon, lat]); return coffeeStain(x, y, r, seed, o); };
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.classList.add('wm', `wm-${style}`);
    this.svg.innerHTML = `<defs>
        <pattern id="wm-neutral" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V7" stroke="#6a5a3a" stroke-opacity="0.35" stroke-width="0.9"/></pattern>
        <pattern id="wm-grain" width="140" height="140" patternUnits="userSpaceOnUse"><image href="${grainTile()}" width="140" height="140"/></pattern>
        <linearGradient id="wm-foldv" x1="0" x2="1"><stop offset="0" stop-color="#5a4320" stop-opacity="0"/><stop offset="0.45" stop-color="#5a4320" stop-opacity="0.14"/><stop offset="0.5" stop-color="#fff8e0" stop-opacity="0.3"/><stop offset="0.58" stop-color="#5a4320" stop-opacity="0"/></linearGradient>
        <linearGradient id="wm-foldh" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#5a4320" stop-opacity="0"/><stop offset="0.45" stop-color="#5a4320" stop-opacity="0.12"/><stop offset="0.5" stop-color="#fff8e0" stop-opacity="0.28"/><stop offset="0.58" stop-color="#5a4320" stop-opacity="0"/></linearGradient>
        <filter id="wm-stain" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="0.25"/></filter>
        <filter id="wm-soak" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
        <radialGradient id="wm-ring"><stop offset="0.8" stop-color="#7a5020" stop-opacity="0"/><stop offset="0.88" stop-color="#7a5020" stop-opacity="0.24"/><stop offset="0.94" stop-color="#7a5020" stop-opacity="0.08"/><stop offset="1" stop-color="#7a5020" stop-opacity="0"/></radialGradient>
        <radialGradient id="wm-age" r="0.75"><stop offset="0.55" stop-color="#5a4020" stop-opacity="0"/><stop offset="1" stop-color="#5a4020" stop-opacity="0.35"/></radialGradient>
        <clipPath id="wm-landclip"><path class="wm-landshape"/></clipPath>
        <clipPath id="wm-warclip"><path class="wm-warshape"/></clipPath>
        <clipPath id="wm-frontclip"><path class="wm-landshape wm-frontland"/></clipPath>
        <filter id="wm-pencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="turbulence" baseFrequency="0.06" numOctaves="2" seed="5" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="4" xChannelSelector="R" yChannelSelector="G"/></filter>
        <filter id="wm-marker" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="turbulence" baseFrequency="0.12" numOctaves="1" seed="3" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter>
        <linearGradient id="wm-glare" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.02"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.14"/><stop offset="0.56" stop-color="#fff" stop-opacity="0.02"/><stop offset="1" stop-color="#fff" stop-opacity="0.08"/></linearGradient>
        <filter id="wm-wipe" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
        <filter id="wm-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="1.5" dy="2.5" stdDeviation="1.5" flood-color="#2a1c08" flood-opacity="0.45"/></filter>
        <radialGradient id="wm-ph-nato" fx="0.32" fy="0.3" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.2" stop-color="#5f8fe8"/><stop offset="0.8" stop-color="#1c3f9a"/><stop offset="1" stop-color="#0c1f55"/></radialGradient>
        <radialGradient id="wm-ph-pact" fx="0.32" fy="0.3" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.2" stop-color="#f05a48"/><stop offset="0.8" stop-color="#9a1a12"/><stop offset="1" stop-color="#4a0806"/></radialGradient>
        <radialGradient id="wm-ph-gold" fx="0.32" fy="0.3" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.2" stop-color="#f2c24a"/><stop offset="0.8" stop-color="#a87810"/><stop offset="1" stop-color="#5a3c04"/></radialGradient>
        <pattern id="wm-wire" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M1,1L6,6M6,1L1,6" stroke="#1d1d1a" stroke-width="0.8"/></pattern>
        <path id="wm-coastd" vector-effect="non-scaling-stroke"/>
        <filter id="wm-tintblur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3.5"/></filter>
        <linearGradient id="wm-blockside" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b48a55"/><stop offset="1" stop-color="#7a5430"/></linearGradient>
        <marker id="wm-arrowe" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10L2.5 5z" fill="context-stroke"/></marker>
        <marker id="wm-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker>
      </defs>
      <g class="wm-world">
        <rect class="wm-sea" width="${W}" height="${H}"/>
        <path class="wm-grat"/>
        ${style === 'engraved' ? `<g class="wm-ripples">${[21, 14, 8, 3.4].map((w) => `<use href="#wm-coastd" class="ink" stroke-width="${w}"/><use href="#wm-coastd" class="sea" stroke-width="${w - 1.3}"/>`).join('')}</g>` : '' /* 1806: the engraver's water lines along every coast, the land laid over their inner half */}
        <path class="wm-land"/>
        <path class="wm-neutral"/>
        <g class="wm-terr" clip-path="url(#wm-landclip)"></g>
        <path class="wm-border"/>
        <path class="wm-coast"/>
        ${style === 'acetate' ? `<g class="wm-paper" pointer-events="none">${this.smudges()}<rect width="${W}" height="${H}" fill="url(#wm-glare)"/></g>` /* the plastic: old marker wiped off, its glare */
    : style === 'trench' ? `<g class="wm-paper" pointer-events="none"><rect width="${W}" height="${H}" fill="url(#wm-grain)" opacity="0.5"/><path class="wm-sheet minor"/><path class="wm-sheet major"/><g class="wm-squares"></g></g>` /* the squared sheet: its grid and square letters (sheetGrid) */
    : style === 'engraved' ? `<g class="wm-paper" pointer-events="none"><rect width="${W}" height="${H}" fill="url(#wm-grain)" fill-opacity="0.55"/><rect width="${W}" height="${H}" fill="url(#wm-age)" fill-opacity="0.6"/></g>` /* the copperplate's cream paper, its edges browned */
    : `<g class="wm-paper" pointer-events="none"><rect width="${W}" height="${H}" fill="url(#wm-grain)"/>
          ${fold(W / 4 - 5, 0, 10, H, 'wm-foldv')}${fold(W / 2 - 5, 0, 10, H, 'wm-foldv')}${fold((3 * W) / 4 - 5, 0, 10, H, 'wm-foldv')}${fold(0, H / 2 - 5, W, 10, 'wm-foldh')}
          ${ring(-30, -38, 46, 1, { twice: true })}${ring(102, 63, 38, 2, { drip: true })}${ring(-12, 8, 30, 3, { twice: true, drip: true })}<rect width="${W}" height="${H}" fill="url(#wm-age)"/></g>`}
      </g>
      <g class="wm-front" clip-path="url(#wm-frontclip)"${style === 'trench' || style === 'engraved' ? '' : ` filter="url(#${style === 'acetate' ? 'wm-marker' : 'wm-pencil'})"`}></g>
      <g class="wm-over"></g>`;
    host.append(this.svg);
    this.world = this.svg.querySelector('.wm-world');
    this.front = this.svg.querySelector('.wm-front');
    this.frontLand = this.svg.querySelector('.wm-frontland');
    this.over = this.svg.querySelector('.wm-over');
    this.segs = [];
    this.t = zoomIdentity;
    this.zoom = d3zoom().on('zoom', (e) => { this.t = e.transform; this.world.setAttribute('transform', e.transform.toString()); this.drawFront(); this.onView(this.t); });
    this.sel = select(this.svg).call(this.zoom).on('dblclick.zoom', null);
    this.svg.querySelector('.wm-grat').setAttribute('d', style === 'trench' ? '' : geoPath(this.proj).digits(1)(style === 'acetate' ? geoGraticule().step([2, 2])() : geoGraticule10())); // (1985: the printed map's close grid; 1918: the sheet's own squares instead)
    if (style === 'trench') this.sheetGrid();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
  }

  /** The svg's size → its viewBox (screen pixels), the zoom's limits (the sheet always covers the frame). */
  resize() {
    const r = this.svg.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    if (w === this.w && h === this.h) return;
    const first = !this.w;
    this.w = w; this.h = h;
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.kMin = Math.max(w / W, h / this.H);
    this.zoom.extent([[0, 0], [w, h]]).scaleExtent([this.kMin, this.kMin * 120]).translateExtent([[0, 0], [W, this.H]]);
    if (first && this.pending) { const [pts, maxK, anchor] = this.pending; this.pending = null; this.flyTo(pts, maxK, 0, anchor); } else this.sel.call(this.zoom.transform, this.t.k < this.kMin ? zoomIdentity.scale(this.kMin) : this.t);
  }

  async load() {
    const topo = (await import('world-atlas/countries-50m.json')).default;
    const path = geoPath(this.proj).digits(1);
    const all = feature(topo, topo.objects.countries), land = path(all);
    const fighting = { ...all, features: all.features.filter((f) => !this.neutral.has(String(f.id))) }, neutral = { ...all, features: all.features.filter((f) => this.neutral.has(String(f.id))) };
    this.svg.querySelector('.wm-land').setAttribute('d', land);
    for (const p of this.svg.querySelectorAll('.wm-landshape')) p.setAttribute('d', path(fighting)); // (ground and front: only the belligerents' land)
    this.svg.querySelector('.wm-neutral').setAttribute('d', neutral.features.length ? path(neutral) : '');
    // the landmasses (every country merged: continents and islands), each with its bounds for a quick test
    this.lands = merge(topo, topo.objects.countries.geometries).coordinates.map((rings) => {
      const geo = { type: 'Polygon', coordinates: rings };
      const bounds = geoBounds(geo);
      return { geo, bounds, path: path(geo), mid: [bounds[0][0] <= bounds[1][0] ? (bounds[0][0] + bounds[1][0]) / 2 : ((bounds[0][0] + bounds[1][0] + 360) / 2 + 180) % 360 - 180, (bounds[0][1] + bounds[1][1]) / 2] };
    });
    if (this.terrArgs) this.territory(...this.terrArgs);
    const coast = path(mesh(topo, topo.objects.countries, (a, b) => a === b));
    this.svg.querySelector('.wm-coast').setAttribute('d', coast);
    if (this.style === 'engraved') { // (the water lines: <use>s of the coarser 110m coast — ten strokes of the 50m one on every pan cost ten times the map)
      const c110 = (await import('world-atlas/countries-110m.json')).default;
      this.svg.querySelector('#wm-coastd').setAttribute('d', path(mesh(c110, c110.objects.countries, (a, b) => a === b)));
    }
    this.svg.querySelector('.wm-border').setAttribute('d', path(mesh(topo, topo.objects.countries, (a, b) => a !== b))); // (today's borders, faint: only to find one's way)
  }

  xy(lon, lat) { return this.proj([lon, lat]); }

  /**
   * The trench map's squares (1918), in world units so they zoom with the map: a fine grid, every fifth line heavier — the
   * lettered squares of the sheet (their letters drawn once the war's areas are known: sheetLetters).
   */
  sheetGrid() {
    const line = (step) => { let d = ''; for (let x = 0; x <= W; x += step) d += `M${x},0V${this.H}`; for (let y = 0; y <= this.H; y += step) d += `M0,${y}H${W}`; return d; };
    this.svg.querySelector('.wm-sheet.minor').setAttribute('d', line(SQUARE / 5));
    this.svg.querySelector('.wm-sheet.major').setAttribute('d', line(SQUARE));
  }
  /** A big faint letter and number in every square of the sheet over the war's areas (world-unit polygons). */
  sheetLetters(areas) {
    const g = this.svg.querySelector('.wm-squares');
    if (!g || g.dataset.done || !areas.length) return;
    g.dataset.done = '1';
    const ROWS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
    let out = '';
    for (const A of areas) {
      const xs = A.map((q) => q[0]), ys = A.map((q) => q[1]);
      for (let i = Math.floor(Math.min(...xs) / SQUARE); i * SQUARE < Math.max(...xs); i++) for (let j = Math.floor(Math.min(...ys) / SQUARE); j * SQUARE < Math.max(...ys); j++) {
        const cx = (i + 0.5) * SQUARE, cy = (j + 0.5) * SQUARE;
        if (inside([cx, cy], A)) out += `<text x="${cx}" y="${cy + SQUARE * 0.12}" text-anchor="middle">${ROWS[j % ROWS.length]}${(i % 60) + 1}</text>`;
      }
    }
    g.innerHTML = out;
  }

  /** The acetate's ghosts: where marker was wiped off with a sleeve — faint blurred smears, the same every time. */
  smudges() {
    let h = 7;
    const r = () => { h = (h * 9301 + 49297) % 233280; return h / 233280; };
    let s = '';
    for (let i = 0; i < 9; i++) { const x = (r() * W).toFixed(0), y = (r() * this.H).toFixed(0); s += `<ellipse cx="${x}" cy="${y}" rx="${(40 + r() * 70).toFixed(0)}" ry="${(10 + r() * 16).toFixed(0)}" transform="rotate(${(r() * 50 - 25).toFixed(0)} ${x} ${y})" fill="${r() < 0.5 ? '#5a6a8a' : '#8a3a3a'}" opacity="${(0.05 + r() * 0.04).toFixed(3)}" filter="url(#wm-wipe)"/>`; }
    return s;
  }

  /**
   * Each side's ground: its colour, flat, over each province's Voronoi cell inside the war's areas (`areas`: world-unit
   * polygons), on the belligerents' land — so it ends at a coast, a neutral border or an area's edge (drawn in ink); and the
   * front: the cell edges between provinces of different sides, inside the areas, for drawFront in grease pencil.
   */
  territory(points, areas = []) {
    this.terrArgs = [points, areas];
    if (!this.lands) return; // (drawn once the coastlines are in: load)
    const poly = (A) => `M${A.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('L')}Z`, ring = (pts) => `M${pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('L')}Z`;
    // the shapes (by where the provinces are, not who holds them): each province on its landmass — Great Britain is England's
    // alone, the Japanese islands Japan's — and the landmasses with several split among them, every edge wiggled once
    const key = points.map((p) => `${p.x | 0},${p.y | 0}`).join(';');
    if (key !== this.shapeKey) {
      this.shapeKey = key;
      const landOf = (p) => this.lands.findIndex((l) => { const [[x0, y0], [x1, y1]] = l.bounds, lon = ((p.lon + 540) % 360) - 180; return (x0 <= x1 ? lon >= x0 && lon <= x1 : lon >= x0 || lon <= x1) && p.lat >= y0 && p.lat <= y1 && geoContains(l.geo, [lon, p.lat]); });
      const groups = new Map();
      points.forEach((p, i) => { const k = landOf(p); if (k >= 0) (groups.get(k) ?? groups.set(k, []).get(k)).push(i); });
      // islands without a province of their own go to the nearest one within 4.5° (Japan's home islands, Sardinia to Italy)
      const near = (a, b) => { const dl = Math.abs(((a[0] - b[0] + 540) % 360) - 180); return Math.hypot(dl * Math.cos((a[1] * Math.PI) / 180), a[1] - b[1]); };
      const extra = [];
      this.lands.forEach((l, k) => {
        if (groups.has(k)) return;
        let best = -1, bd = 4.5;
        points.forEach((p, i) => { const dd = near(l.mid, [p.lon, p.lat]); if (dd < bd) { bd = dd; best = i; } });
        if (best >= 0) extra.push({ k, cells: { [best]: null }, edges: [] });
      });
      this.shape = [...extra, ...[...groups].map(([k, members]) => {
        if (members.length === 1) return { k, cells: { [members[0]]: null }, edges: [] }; // (alone on it: the whole landmass)
        const pts = members.map((i) => points[i]), d = Delaunay.from(pts, (p) => p.x, (p) => p.y), v = d.voronoi([-W, -this.H, 2 * W, 2 * this.H]);
        const polys = pts.map((_, n) => v.cellPolygon(n)), cells = {}, edges = [];
        members.forEach((i, n) => {
          const c = polys[n], out = [];
          for (let e = 0; e < c.length - 1; e++) out.push(...wiggleC(c[e], c[e + 1]).slice(0, -1)); // (each edge as its neighbour draws it)
          cells[i] = ring(out);
        });
        const same = (a, b) => Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;
        const shape = new Path2D(this.lands[k].path), onLand = (q) => hitCtx().isPointInPath(shape, q[0], q[1], 'evenodd'); // (an edge out over the sea and onto another landmass — Britain, an island — is no front)
        members.forEach((i, n) => { for (const m of d.neighbors(n)) if (m > n) { const sh = polys[n].filter((a) => polys[m].some((b) => same(a, b))); if (sh.length >= 2) { const pts = wiggleC(sh[0], sh[1]); edges.push({ i, j: members[m], pts, on: pts.map(onLand) }); } } });
        return { k, cells, edges };
      })];
    }
    this.svg.querySelector('.wm-warshape').setAttribute('d', areas.map(poly).join(''));
    if (this.style === 'trench') this.sheetLetters(areas);
    let fills = '', clips = '';
    for (const g of this.shape) {
      clips += `<clipPath id="wm-land${g.k}"><path d="${this.lands[g.k].path}"/></clipPath>`;
      fills += `<g clip-path="url(#wm-land${g.k})">${Object.entries(g.cells).map(([i, d]) => `<path class="wm-wash ${points[i].side}" d="${d ?? this.lands[g.k].path}"/>`).join('')}</g>`;
    }
    this.svg.querySelector('.wm-terr').innerHTML = `${clips}<g clip-path="url(#wm-warclip)">${fills}</g>` + areas.map((A) => `<path class="wm-area" d="${poly(A)}"/>`).join('');
    // the front: the edges between neighbours on a landmass held by different sides, in runs inside the areas (where it
    // leaves one it stops, at its ink edge) — the very edges the colours meet on
    const inArea = (q) => areas.some((A) => inside(q, A));
    this.segs = [];
    for (const g of this.shape) for (const e of g.edges) {
      if (points[e.i].side === points[e.j].side) continue;
      const nato = points[e.i].side === 'nato' ? points[e.i] : points[e.j];
      let run = [];
      for (const [n, q] of [...e.pts, null].entries()) {
        if (q && e.on[n] && inArea(q)) { run.push(q); continue; }
        if (run.length > 1) this.segs.push({ a: run[0], b: run.at(-1), nato, pts: run });
        run = [];
      }
    }
    this.drawFront();
  }

  /** The front in grease pencil, in screen space (the pencil the same width at any zoom): blue on the Allied side, red on the Axis side. */
  drawFront() {
    const t = this.t, ap = (p) => [t.applyX(p[0]), t.applyY(p[1])];
    this.frontLand.setAttribute('transform', t.toString());
    let blue = '', red = '', blue2 = '', red2 = '', wire = '';
    for (const s of this.segs) {
      const A = ap(s.a), B = ap(s.b), N = ap([s.nato.x, s.nato.y]);
      const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1;
      const side = (N[0] - A[0]) * (-dy / l) + (N[1] - A[1]) * (dx / l) < 0 ? -1 : 1; // (which way is the Allied side of it)
      // the wiggling line in screen space, each point pushed off along its own normal: blue toward the Allies, red away
      // its points at least 7 px apart on the screen: from afar the line keeps its course without the scribble, close up every bend
      const all = s.pts.map(ap), P = [all[0]];
      for (let i = 1; i < all.length; i++) if (i === all.length - 1 || Math.hypot(all[i][0] - P.at(-1)[0], all[i][1] - P.at(-1)[1]) >= 7) P.push(all[i]);
      const o = 3.2;
      const off = (pts, k) => pts.map((p, i) => {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)], tx = p1[0] - p0[0], ty = p1[1] - p0[1], tl = Math.hypot(tx, ty) || 1;
        return [p[0] + (-ty / tl) * side * k, p[1] + (tx / tl) * side * k];
      });
      const d = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
      if (this.style === 'trench') { // (1918: each side's fire trench with its traverses, a support line behind it, the wire between)
        blue += d(traverses(off(P, 6), 7, 2.2)); red += d(traverses(off(P, -6), 7, 2.2));
        blue2 += d(traverses(off(P, 14), 9, 1.8)); red2 += d(traverses(off(P, -14), 9, 1.8));
        wire += `${d([...off(P, 3), ...off(P, -3).reverse()])}Z`;
        continue;
      }
      if (this.style === 'engraved') { blue += d(off(P, 11)); red += d(off(P, -11)); blue2 += d(P); continue; } // (1806: a broad soft band of each side's colour, a fine dotted limit between)
      blue += d(off(P, o)); red += d(off(P, -o));
    }
    this.front.innerHTML = this.style === 'engraved'
      ? `<path d="${blue}" class="wm-tint nato" filter="url(#wm-tintblur)"/><path d="${red}" class="wm-tint pact" filter="url(#wm-tintblur)"/><path d="${blue2}" class="wm-limit"/>`
      : this.style === 'trench'
      ? `<path d="${wire}" class="wm-wire"/><path d="${blue2}" class="wm-pen nato second"/><path d="${red2}" class="wm-pen pact second"/><path d="${blue}" class="wm-pen nato"/><path d="${red}" class="wm-pen pact"/>`
      : `<path d="${blue}" class="wm-pen nato"/><path d="${red}" class="wm-pen pact"/>`;
  }

  /**
   * Frame these world points (padding round them, no closer than maxK × the whole sheet), their middle at `anchor` (shares
   * of the frame: [0.5, 0.5] its centre) — kept on the sheet, as a drag or a wheel would be.
   */
  flyTo(pts, maxK = 14, ms = 650, anchor = [0.5, 0.5]) {
    if (!this.w) { this.pending = [pts, maxK, anchor]; return; }
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min(this.kMin * maxK, Math.max(this.kMin, Math.min((this.w * 0.8) / Math.max(1, x1 - x0), (this.h * 0.75) / Math.max(1, y1 - y0))));
    const t = this.zoom.constrain()(zoomIdentity.translate(this.w * anchor[0], this.h * anchor[1]).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2), [[0, 0], [this.w, this.h]], [[0, 0], [W, this.H]]);
    (ms ? this.sel.transition().duration(ms) : this.sel).call(this.zoom.transform, t);
  }
  zoomBy(f) { this.sel.transition().duration(250).call(this.zoom.scaleBy, f); }
  dispose() { this.ro.disconnect(); }
}

/**
 * A stretch of front between two points, as a front is on a real map: bulges and salients, kinks, back and forth — the ends
 * fixed (the stretches meet), the same every time (its shape from the points), in world units (it zooms with the map).
 */
function wiggle(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  if (L < 1) return [a, b];
  const nx = -dy / L, ny = dx / L, n = Math.max(6, Math.min(48, Math.round(L / 1.5)));
  let h = Math.abs(Math.sin(a[0] * 12.9898 + a[1] * 78.233 + b[0] * 37.719 + b[1] * 4.581) * 43758.5453); // (a seed from the ends: the same front every time)
  const r = () => { h = (h * 9301 + 49297) % 233280; return h / 233280; };
  const waves = [[1 + Math.floor(r() * 2), 0.11], [2 + Math.floor(r() * 3), 0.05], [6 + Math.floor(r() * 5), 0.018]].map(([k, amp]) => ({ k, amp: amp * L * (0.6 + r() * 0.8), ph: r() * Math.PI * 2 }));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, env = Math.sin(Math.PI * t); // (nothing at the ends: the stretches join)
    const off = env * waves.reduce((s, w) => s + w.amp * Math.sin(2 * Math.PI * w.k * t + w.ph), 0);
    out.push([a[0] + dx * t + nx * off, a[1] + dy * t + ny * off]);
  }
  return out;
}

/**
 * A coffee stain where a mug stood on the map: the faint soaked-in tint inside, and the ring — darkest at the rim where the
 * coffee dried, uneven in width, never quite round, broken where the cup lifted, its edge frayed by the paper (wm-stain).
 * `twice`: the mug set down again a little off (a fainter partial ring); `drip`: a drop beside it.
 */
function coffeeStain(cx, cy, r, seed, { twice = false, drip = false } = {}) {
  let h = seed * 9973 + 17;
  const rnd = () => { h = (h * 9301 + 49297) % 233280; return h / 233280; };
  const shape = (rr, k = 1) => { // a wobbly closed ring of radius rr
    const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], n = 72, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, w = 1 + k * (0.035 * Math.sin(2 * a + ph[0]) + 0.02 * Math.sin(5 * a + ph[1]) + 0.012 * Math.sin(11 * a + ph[2]));
      pts.push([cx + Math.cos(a) * rr * w, cy + Math.sin(a) * rr * w]);
    }
    return pts;
  };
  const d = (pts, close = true) => `M${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}${close ? 'Z' : ''}`;
  const rim = shape(r), circ = 2 * Math.PI * r, gapAt = rnd(), gap = circ * (0.06 + rnd() * 0.08);
  let s = `<g class="wm-coffee">`;
  s += `<path d="${d(rim)}" fill="#8a5a22" fill-opacity="0.07" filter="url(#wm-soak)"/>`;                                            // the soaked-in tint
  s += `<path d="${d(rim)}" fill="none" stroke="#6b4316" stroke-opacity="0.32" stroke-width="${(r * 0.055).toFixed(1)}" stroke-dasharray="${(circ - gap).toFixed(1)} ${gap.toFixed(1)}" stroke-dashoffset="${(circ * gapAt).toFixed(1)}" filter="url(#wm-stain)"/>`; // the dried rim
  s += `<path d="${d(rim)}" fill="none" stroke="#4a2c0c" stroke-opacity="0.28" stroke-width="${(r * 0.012).toFixed(2)}" transform="translate(${cx} ${cy}) scale(1.026) translate(${-cx} ${-cy})" stroke-dasharray="${(circ - gap).toFixed(1)} ${gap.toFixed(1)}" stroke-dashoffset="${(circ * gapAt).toFixed(1)}" filter="url(#wm-stain)"/>`; // its crisp outer edge, where the coffee dried darkest
  s += `<path d="${d(shape(r * 0.955, 1.4))}" fill="none" stroke="#7a5020" stroke-opacity="0.13" stroke-width="${(r * 0.03).toFixed(1)}" filter="url(#wm-stain)"/>`; // the second, inner tide line
  if (twice) { // set down again: a fainter part of another ring
    const ox = (rnd() - 0.5) * r * 0.5, oy = (rnd() - 0.5) * r * 0.5, part = shape(r * (0.97 + rnd() * 0.06)).map(([x, y]) => [x + ox, y + oy]), from = Math.floor(rnd() * 72);
    s += `<path d="${d([...part.slice(from), ...part.slice(0, from)].slice(0, 30 + Math.floor(rnd() * 20)), false)}" fill="none" stroke="#6b4316" stroke-opacity="0.17" stroke-width="${(r * 0.04).toFixed(1)}" stroke-linecap="round" filter="url(#wm-stain)"/>`;
  }
  if (drip) { // a drop that ran down the mug's side
    const a = rnd() * Math.PI * 2, dr = r * (1.15 + rnd() * 0.15), rr = r * (0.06 + rnd() * 0.05);
    s += `<ellipse cx="${(cx + Math.cos(a) * dr).toFixed(1)}" cy="${(cy + Math.sin(a) * dr).toFixed(1)}" rx="${rr.toFixed(1)}" ry="${(rr * 0.8).toFixed(1)}" fill="#7a5020" fill-opacity="0.12" stroke="#6b4316" stroke-opacity="0.3" stroke-width="${(rr * 0.25).toFixed(1)}" filter="url(#wm-stain)"/>`;
  }
  return `${s}</g>`;
}

/** A trench along a screen line: resampled every `step` px, its traverses squared out to one side and the other by `amp`. */
function traverses(pts, step, amp) {
  const r = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let t = step - carry;
    for (; t <= L; t += step) r.push([a[0] + ((b[0] - a[0]) * t) / L, a[1] + ((b[1] - a[1]) * t) / L]);
    carry = L - (t - step);
  }
  if (r.length < 2) return pts;
  const out = [];
  r.forEach((p, i) => {
    const q = r[Math.min(r.length - 1, i + 1)], o = r[Math.max(0, i - 1)], tx = q[0] - o[0], ty = q[1] - o[1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl, k = i % 2 ? amp : -amp;
    out.push([p[0] + nx * k, p[1] + ny * k]);
    if (r[i + 1]) out.push([(p[0] + r[i + 1][0]) / 2 + nx * k, (p[1] + r[i + 1][1]) / 2 + ny * k]);
  });
  return out;
}

/** A 2D context for point-in-path tests (the browser's own, fast: a landmass has thousands of points). */
let hit = null;
const hitCtx = () => (hit ??= document.createElement('canvas').getContext('2d'));

/** wiggle(), the same line whichever end it is walked from (two cells share each edge). */
function wiggleC(a, b) {
  return a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]) ? wiggle(a, b) : wiggle(b, a).reverse();
}

/** Is point q inside polygon A (even-odd)? */
function inside(q, A) {
  let c = false;
  for (let i = 0, j = A.length - 1; i < A.length; j = i++) if ((A[i][1] > q[1]) !== (A[j][1] > q[1]) && q[0] < ((A[j][0] - A[i][0]) * (q[1] - A[i][1])) / (A[j][1] - A[i][1]) + A[i][0]) c = !c;
  return c;
}
