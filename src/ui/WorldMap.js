// The world campaign's map (ui/WarRoom.js): the real world — Natural Earth's coastlines (world-atlas, loaded only when the
// war room opens) in Mercator, centred on 40° E so the Atlantic and the Pacific to Hawaii are both on the sheet — drawn as
// the 1945 staff map on the table (tools/mapstyles.html, the style chosen): yellowed paper with its grain, folds and a
// coffee ring, sepia coastlines, the front in grease pencil. Zoom and pan (wheel, drag, pinch): the paper moves with it.
// A screen-space layer on top takes the war room's pins, counters and arrows at a constant size whatever the zoom.
//   const m = new WorldMap(host, { onView })   onView(t): the view changed (redraw the overlay; t: d3-zoom's transform)
//   await m.load()                             the coastlines
//   m.xy(lon, lat) → [x, y]                    world units (W × H)
//   m.territory(points, areas)                 [{ x, y, side }], [[[x, y] …] …]: each side's ground and the front, inside the war's areas
//   m.flyTo(xys, maxK)                         frame these world points
import { geoMercator, geoPath, geoGraticule10, geoContains, geoBounds } from 'd3-geo';
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';
import { Delaunay } from 'd3-delaunay';
import { feature, mesh, merge } from 'topojson-client';

export const W = 2000;
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
  constructor(host, { onView = () => {}, neutral = [] } = {}) {
    this.onView = onView;
    this.neutral = new Set(neutral); // (the war's neutral countries: never coloured, hatched)
    const s = W / (2 * Math.PI), merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
    this.H = Math.round(s * (merc(LAT[1]) - merc(LAT[0])));
    this.proj = geoMercator().rotate([-40, 0]).scale(s).translate([W / 2, s * merc(LAT[1])]).clipExtent([[0, 0], [W, this.H]]);
    const H = this.H, fold = (x, y, w, h, id) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})"/>`;
    const ring = (lon, lat, r) => { const [x, y] = this.proj([lon, lat]); return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#wm-ring)"/>`; };
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.classList.add('wm');
    this.svg.innerHTML = `<defs>
        <pattern id="wm-neutral" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V7" stroke="#6a5a3a" stroke-opacity="0.35" stroke-width="0.9"/></pattern>
        <pattern id="wm-grain" width="140" height="140" patternUnits="userSpaceOnUse"><image href="${grainTile()}" width="140" height="140"/></pattern>
        <linearGradient id="wm-foldv" x1="0" x2="1"><stop offset="0" stop-color="#5a4320" stop-opacity="0"/><stop offset="0.45" stop-color="#5a4320" stop-opacity="0.14"/><stop offset="0.5" stop-color="#fff8e0" stop-opacity="0.3"/><stop offset="0.58" stop-color="#5a4320" stop-opacity="0"/></linearGradient>
        <linearGradient id="wm-foldh" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#5a4320" stop-opacity="0"/><stop offset="0.45" stop-color="#5a4320" stop-opacity="0.12"/><stop offset="0.5" stop-color="#fff8e0" stop-opacity="0.28"/><stop offset="0.58" stop-color="#5a4320" stop-opacity="0"/></linearGradient>
        <radialGradient id="wm-ring"><stop offset="0.8" stop-color="#7a5020" stop-opacity="0"/><stop offset="0.88" stop-color="#7a5020" stop-opacity="0.24"/><stop offset="0.94" stop-color="#7a5020" stop-opacity="0.08"/><stop offset="1" stop-color="#7a5020" stop-opacity="0"/></radialGradient>
        <radialGradient id="wm-age" r="0.75"><stop offset="0.55" stop-color="#5a4020" stop-opacity="0"/><stop offset="1" stop-color="#5a4020" stop-opacity="0.35"/></radialGradient>
        <clipPath id="wm-landclip"><path class="wm-landshape"/></clipPath>
        <clipPath id="wm-warclip"><path class="wm-warshape"/></clipPath>
        <clipPath id="wm-frontclip"><path class="wm-landshape wm-frontland"/></clipPath>
        <filter id="wm-pencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="turbulence" baseFrequency="0.06" numOctaves="2" seed="5" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="4" xChannelSelector="R" yChannelSelector="G"/></filter>
        <filter id="wm-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="1.5" dy="2.5" stdDeviation="1.5" flood-color="#2a1c08" flood-opacity="0.45"/></filter>
        <radialGradient id="wm-ph-nato" fx="0.32" fy="0.3" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.2" stop-color="#5f8fe8"/><stop offset="0.8" stop-color="#1c3f9a"/><stop offset="1" stop-color="#0c1f55"/></radialGradient>
        <radialGradient id="wm-ph-pact" fx="0.32" fy="0.3" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.2" stop-color="#f05a48"/><stop offset="0.8" stop-color="#9a1a12"/><stop offset="1" stop-color="#4a0806"/></radialGradient>
        <radialGradient id="wm-ph-gold" fx="0.32" fy="0.3" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.2" stop-color="#f2c24a"/><stop offset="0.8" stop-color="#a87810"/><stop offset="1" stop-color="#5a3c04"/></radialGradient>
        <marker id="wm-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker>
      </defs>
      <g class="wm-world">
        <rect class="wm-sea" width="${W}" height="${H}"/>
        <path class="wm-grat"/>
        <path class="wm-land"/>
        <path class="wm-neutral"/>
        <g class="wm-terr" clip-path="url(#wm-landclip)"></g>
        <path class="wm-border"/>
        <path class="wm-coast"/>
        <g class="wm-paper" pointer-events="none"><rect width="${W}" height="${H}" fill="url(#wm-grain)"/>
          ${fold(W / 4 - 5, 0, 10, H, 'wm-foldv')}${fold(W / 2 - 5, 0, 10, H, 'wm-foldv')}${fold((3 * W) / 4 - 5, 0, 10, H, 'wm-foldv')}${fold(0, H / 2 - 5, W, 10, 'wm-foldh')}
          ${ring(-30, -38, 46)}${ring(102, 63, 38)}${ring(-12, 8, 30)}<rect width="${W}" height="${H}" fill="url(#wm-age)"/></g>
      </g>
      <g class="wm-front" clip-path="url(#wm-frontclip)" filter="url(#wm-pencil)"></g>
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
    this.svg.querySelector('.wm-grat').setAttribute('d', geoPath(this.proj).digits(1)(geoGraticule10()));
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
    this.svg.querySelector('.wm-coast').setAttribute('d', path(mesh(topo, topo.objects.countries, (a, b) => a === b)));
    this.svg.querySelector('.wm-border').setAttribute('d', path(mesh(topo, topo.objects.countries, (a, b) => a !== b))); // (today's borders, faint: only to find one's way)
  }

  xy(lon, lat) { return this.proj([lon, lat]); }

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
        members.forEach((i, n) => { for (const m of d.neighbors(n)) if (m > n) { const sh = polys[n].filter((a) => polys[m].some((b) => same(a, b))); if (sh.length >= 2) edges.push({ i, j: members[m], pts: wiggleC(sh[0], sh[1]) }); } });
        return { k, cells, edges };
      })];
    }
    this.svg.querySelector('.wm-warshape').setAttribute('d', areas.map(poly).join(''));
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
      for (const q of [...e.pts, null]) {
        if (q && inArea(q)) { run.push(q); continue; }
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
    let blue = '', red = '';
    for (const s of this.segs) {
      const A = ap(s.a), B = ap(s.b), N = ap([s.nato.x, s.nato.y]);
      const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1;
      const side = (N[0] - A[0]) * (-dy / l) + (N[1] - A[1]) * (dx / l) < 0 ? -1 : 1; // (which way is the Allied side of it)
      // the wiggling line in screen space, each point pushed off along its own normal: blue toward the Allies, red away
      // its points at least 7 px apart on the screen: from afar the line keeps its course without the scribble, close up every bend
      const all = s.pts.map(ap), P = [all[0]];
      for (let i = 1; i < all.length; i++) if (i === all.length - 1 || Math.hypot(all[i][0] - P.at(-1)[0], all[i][1] - P.at(-1)[1]) >= 7) P.push(all[i]);
      const o = 3.2;
      const line = (k) => {
        let d = '';
        for (let i = 0; i < P.length; i++) {
          const p0 = P[Math.max(0, i - 1)], p1 = P[Math.min(P.length - 1, i + 1)], tx = p1[0] - p0[0], ty = p1[1] - p0[1], tl = Math.hypot(tx, ty) || 1;
          const x = P[i][0] + (-ty / tl) * side * k, y = P[i][1] + (tx / tl) * side * k;
          d += `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
        }
        return d;
      };
      blue += line(o); red += line(-o);
    }
    this.front.innerHTML = `<path d="${blue}" class="wm-pen nato"/><path d="${red}" class="wm-pen pact"/>`;
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
