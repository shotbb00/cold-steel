// The world campaign's map (ui/WarRoom.js): the real world — Natural Earth's coastlines (world-atlas, loaded only when the
// war room opens) in Mercator, centred on 40° E so the Atlantic and the Pacific to Hawaii are both on the sheet — with zoom
// and pan (wheel, drag, pinch), each province's ground shaded in its owner's colour, and a screen-space layer on top that
// the war room draws its pins, counters and arrows into at a constant size whatever the zoom.
//   const m = new WorldMap(host, { onView })   onView(t): the view changed (redraw the overlay; t.x/t.y/t.k: d3-zoom's transform)
//   await m.load()                             the coastlines
//   m.xy(lon, lat) → [x, y]                    world units (W × H)
//   m.territory(points)                        [{ x, y, side }]: the shaded ground (Voronoi cells, out to R, on land only)
//   m.flyTo(xys, maxK)                         frame these world points
import { geoMercator, geoPath, geoGraticule10 } from 'd3-geo';
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';
import { Delaunay } from 'd3-delaunay';
import { feature, mesh } from 'topojson-client';

export const W = 2000;
const R = 60; // a province's ground reaches this far (world units: ~11° of longitude) — beyond, the sheet stays unshaded
const NS = 'http://www.w3.org/2000/svg';
const LAT = [-58, 80];

export class WorldMap {
  constructor(host, { onView = () => {} } = {}) {
    this.onView = onView;
    const s = W / (2 * Math.PI), merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
    this.H = Math.round(s * (merc(LAT[1]) - merc(LAT[0])));
    this.proj = geoMercator().rotate([-40, 0]).scale(s).translate([W / 2, s * merc(LAT[1])]).clipExtent([[0, 0], [W, this.H]]);
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.classList.add('wm');
    this.svg.innerHTML = `<defs>
        <radialGradient id="wm-nato"><stop offset="0" stop-color="#5f93e6" stop-opacity="0.34"/><stop offset="0.7" stop-color="#5f93e6" stop-opacity="0.2"/><stop offset="1" stop-color="#5f93e6" stop-opacity="0"/></radialGradient>
        <radialGradient id="wm-pact"><stop offset="0" stop-color="#e2513f" stop-opacity="0.34"/><stop offset="0.7" stop-color="#e2513f" stop-opacity="0.2"/><stop offset="1" stop-color="#e2513f" stop-opacity="0"/></radialGradient>
        <clipPath id="wm-landclip"><path class="wm-landshape"/></clipPath>
        <marker id="wm-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker>
      </defs>
      <g class="wm-world">
        <rect class="wm-sea" width="${W}" height="${this.H}"/>
        <path class="wm-grat"/>
        <path class="wm-land"/>
        <g class="wm-terr" clip-path="url(#wm-landclip)"></g>
        <path class="wm-border"/>
        <path class="wm-coast"/>
      </g>
      <g class="wm-over"></g>`;
    host.append(this.svg);
    this.world = this.svg.querySelector('.wm-world');
    this.over = this.svg.querySelector('.wm-over');
    this.t = zoomIdentity;
    this.zoom = d3zoom().on('zoom', (e) => { this.t = e.transform; this.world.setAttribute('transform', e.transform.toString()); this.onView(this.t); });
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

  /** The ground each province holds: its Voronoi cell among the provinces, out to R, on land, in its owner's colour. */
  territory(points) {
    const key = points.map((p) => `${p.x | 0},${p.y | 0}`).join(';');
    if (key !== this.cellsKey) {
      this.cellsKey = key;
      const v = Delaunay.from(points, (p) => p.x, (p) => p.y).voronoi([0, 0, W, this.H]);
      this.cells = points.map((_, i) => `M${v.cellPolygon(i).map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('L')}Z`);
    }
    this.svg.querySelector('.wm-terr').innerHTML = points.map((p, i) => `<clipPath id="wm-cell${i}"><path d="${this.cells[i]}"/></clipPath><circle clip-path="url(#wm-cell${i})" cx="${p.x}" cy="${p.y}" r="${R}" fill="url(#wm-${p.side})"/>`).join('');
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
