// The world campaign's map (ui/WarRoom.js): the real world — Natural Earth's coastlines (world-atlas, loaded only when the
// war room opens) in Mercator, centred on 40° E so the Atlantic and the Pacific to Hawaii are both on the sheet — drawn as
// the 1945 staff map on the table (tools/mapstyles.html, the style chosen): yellowed paper with its grain, folds and a
// coffee ring, sepia coastlines, the front in grease pencil. Zoom and pan (wheel, drag, pinch): the paper moves with it.
// A screen-space layer on top takes the war room's pins, counters and arrows at a constant size whatever the zoom.
//   const m = new WorldMap(host, { onView })   onView(t): the view changed (redraw the overlay; t: d3-zoom's transform)
//   await m.load()                             the coastlines
//   m.xy(lon, lat) → [x, y]                    world units (W × H)
//   m.territory(points)                        [{ x, y, side }]: each side's ground (a faint wash) and the front between
//   m.flyTo(xys, maxK)                         frame these world points
import { geoMercator, geoPath, geoGraticule10 } from 'd3-geo';
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';
import { Delaunay } from 'd3-delaunay';
import { feature, mesh } from 'topojson-client';

export const W = 2000;
const R = 60; // a province's ground reaches this far (world units: ~11° of longitude) — beyond it, no wash and no front
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
  constructor(host, { onView = () => {} } = {}) {
    this.onView = onView;
    const s = W / (2 * Math.PI), merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
    this.H = Math.round(s * (merc(LAT[1]) - merc(LAT[0])));
    this.proj = geoMercator().rotate([-40, 0]).scale(s).translate([W / 2, s * merc(LAT[1])]).clipExtent([[0, 0], [W, this.H]]);
    const H = this.H, fold = (x, y, w, h, id) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})"/>`;
    const ring = (lon, lat, r) => { const [x, y] = this.proj([lon, lat]); return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#wm-ring)"/>`; };
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.classList.add('wm');
    this.svg.innerHTML = `<defs>
        <radialGradient id="wm-nato"><stop offset="0" stop-color="#2a5bd0" stop-opacity="0.05"/><stop offset="0.75" stop-color="#2a5bd0" stop-opacity="0.08"/><stop offset="1" stop-color="#2a5bd0" stop-opacity="0"/></radialGradient>
        <radialGradient id="wm-pact"><stop offset="0" stop-color="#d0302a" stop-opacity="0.05"/><stop offset="0.75" stop-color="#d0302a" stop-opacity="0.08"/><stop offset="1" stop-color="#d0302a" stop-opacity="0"/></radialGradient>
        <pattern id="wm-grain" width="140" height="140" patternUnits="userSpaceOnUse"><image href="${grainTile()}" width="140" height="140"/></pattern>
        <linearGradient id="wm-foldv" x1="0" x2="1"><stop offset="0" stop-color="#5a4320" stop-opacity="0"/><stop offset="0.45" stop-color="#5a4320" stop-opacity="0.14"/><stop offset="0.5" stop-color="#fff8e0" stop-opacity="0.3"/><stop offset="0.58" stop-color="#5a4320" stop-opacity="0"/></linearGradient>
        <linearGradient id="wm-foldh" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#5a4320" stop-opacity="0"/><stop offset="0.45" stop-color="#5a4320" stop-opacity="0.12"/><stop offset="0.5" stop-color="#fff8e0" stop-opacity="0.28"/><stop offset="0.58" stop-color="#5a4320" stop-opacity="0"/></linearGradient>
        <radialGradient id="wm-ring"><stop offset="0.8" stop-color="#7a5020" stop-opacity="0"/><stop offset="0.88" stop-color="#7a5020" stop-opacity="0.24"/><stop offset="0.94" stop-color="#7a5020" stop-opacity="0.08"/><stop offset="1" stop-color="#7a5020" stop-opacity="0"/></radialGradient>
        <radialGradient id="wm-age" r="0.75"><stop offset="0.55" stop-color="#5a4020" stop-opacity="0"/><stop offset="1" stop-color="#5a4020" stop-opacity="0.35"/></radialGradient>
        <clipPath id="wm-landclip"><path class="wm-landshape"/></clipPath>
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
    if (first && this.pending) { const p = this.pending; this.pending = null; this.flyTo(...p, 0); } else this.sel.call(this.zoom.transform, this.t.k < this.kMin ? zoomIdentity.scale(this.kMin) : this.t);
  }

  async load() {
    const topo = (await import('world-atlas/countries-50m.json')).default;
    const path = geoPath(this.proj).digits(1);
    const land = path(feature(topo, topo.objects.countries));
    for (const p of this.svg.querySelectorAll('.wm-land, .wm-landshape')) p.setAttribute('d', land);
    this.svg.querySelector('.wm-coast').setAttribute('d', path(mesh(topo, topo.objects.countries, (a, b) => a === b)));
    this.svg.querySelector('.wm-border').setAttribute('d', path(mesh(topo, topo.objects.countries, (a, b) => a !== b))); // (today's borders, faint: only to find one's way)
  }

  xy(lon, lat) { return this.proj([lon, lat]); }

  /**
   * Each side's ground: a faint wash of its colour over its provinces' Voronoi cells (out to R, on land); and the front —
   * the cell edges between provinces of different sides, out to R from them — for drawFront to put down in grease pencil.
   */
  territory(points) {
    const key = points.map((p) => `${p.x | 0},${p.y | 0}`).join(';');
    if (key !== this.cellsKey) {
      this.cellsKey = key;
      this.delaunay = Delaunay.from(points, (p) => p.x, (p) => p.y);
      const v = this.delaunay.voronoi([0, 0, W, this.H]);
      this.polys = points.map((_, i) => v.cellPolygon(i));
      this.cells = this.polys.map((c) => `M${c.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('L')}Z`);
    }
    this.svg.querySelector('.wm-terr').innerHTML = points.map((p, i) => `<clipPath id="wm-cell${i}"><path d="${this.cells[i]}"/></clipPath><circle clip-path="url(#wm-cell${i})" cx="${p.x}" cy="${p.y}" r="${R}" fill="url(#wm-${p.side})"/>`).join('');
    // the front: the shared edge of each pair of neighbouring cells held by different sides, cut to R from the two provinces
    this.segs = [];
    const same = (a, b) => Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;
    for (let i = 0; i < points.length; i++) for (const j of this.delaunay.neighbors(i)) {
      if (j < i || points[i].side === points[j].side) continue;
      const shared = this.polys[i].filter((a) => this.polys[j].some((b) => same(a, b)));
      if (shared.length < 2) continue;
      const seg = clipToCircle(shared[0], shared[1], points[i], R);
      if (seg) this.segs.push({ a: seg[0], b: seg[1], nato: points[i].side === 'nato' ? points[i] : points[j] });
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
      let nx = -dy / l, ny = dx / l;
      if ((N[0] - A[0]) * nx + (N[1] - A[1]) * ny < 0) { nx = -nx; ny = -ny; } // (the normal toward the Allied province)
      const o = 3.2, seg = (k) => `M${(A[0] + nx * k).toFixed(1)},${(A[1] + ny * k).toFixed(1)}L${(B[0] + nx * k).toFixed(1)},${(B[1] + ny * k).toFixed(1)}`;
      blue += seg(o); red += seg(-o);
    }
    this.front.innerHTML = `<path d="${blue}" class="wm-pen nato"/><path d="${red}" class="wm-pen pact"/>`;
  }

  /** Frame these world points (padding round them, no closer than maxK × the whole sheet). */
  flyTo(pts, maxK = 14, ms = 650) {
    if (!this.w) { this.pending = [pts, maxK]; return; }
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min(this.kMin * maxK, Math.max(this.kMin, Math.min((this.w * 0.8) / Math.max(1, x1 - x0), (this.h * 0.75) / Math.max(1, y1 - y0))));
    const t = zoomIdentity.translate(this.w / 2, this.h / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    (ms ? this.sel.transition().duration(ms) : this.sel).call(this.zoom.transform, t);
  }
  zoomBy(f) { this.sel.transition().duration(250).call(this.zoom.scaleBy, f); }
  dispose() { this.ro.disconnect(); }
}

/** The part of segment a–b within r of point c (both ends of a Voronoi edge are as far from either province): null if none. */
function clipToCircle(a, b, c, r) {
  const dx = b[0] - a[0], dy = b[1] - a[1], fx = a[0] - c.x, fy = a[1] - c.y;
  const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - r * r, D = B * B - 4 * A * C;
  if (D <= 0 || !A) return null;
  const s = Math.sqrt(D), t0 = Math.max(0, (-B - s) / (2 * A)), t1 = Math.min(1, (-B + s) / (2 * A));
  if (t0 >= t1) return null;
  return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]];
}
