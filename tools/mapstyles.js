// A mock-up of the world campaign's map in one style per war (tools/mapstyles.html): the same stretch of Europe —
// the Channel to Berlin — and the same made-up situation (a front near the Rhine, three corps a side, an attack each way)
// drawn as each war would have drawn it. Not the game: a look to choose from.
import { geoMercator, geoPath } from 'd3-geo';
import { zoom } from 'd3-zoom';
import { select } from 'd3-selection';
import { feature, mesh } from 'topojson-client';
import topo from 'world-atlas/countries-50m.json';

const VW = 1200, VH = 800;
const proj = geoMercator().fitExtent([[0, 0], [VW, VH]], { type: 'MultiPoint', coordinates: [[0.6, 46.9], [14.6, 54.7]] }).clipExtent([[-300, -300], [VW + 300, VH + 300]]);
const path = geoPath(proj).digits(1);
const LAND = path(feature(topo, topo.objects.countries));
const COAST = path(mesh(topo, topo.objects.countries, (a, b) => a === b));
const BORDERS = path(mesh(topo, topo.objects.countries, (a, b) => a !== b));
const P = (lon, lat) => proj([lon, lat]);

// ---- the situation
const FRONT = [[5.6, 53.7], [6.1, 52.5], [6.3, 51.8], [6.6, 51.1], [7.0, 50.4], [7.5, 49.7], [7.9, 48.9], [7.7, 48.1], [7.6, 46.8]].map(([a, b]) => P(a, b));
const RIVERS = [
  [[7.6, 47.56], [7.8, 48.6], [8.3, 49.0], [8.45, 49.5], [8.25, 50.0], [7.6, 50.36], [7.1, 50.73], [6.96, 50.94], [6.77, 51.23], [6.6, 51.6], [6.2, 51.85], [5.9, 51.9], [5.0, 51.95], [4.1, 51.95]], // the Rhine
  [[14.3, 50.75], [13.74, 51.05], [12.9, 51.75], [11.64, 52.13], [11.0, 52.9], [10.0, 53.55], [9.0, 53.85]],                                                          // the Elbe
  [[8.5, 47.95], [10.0, 48.4], [11.4, 48.75], [12.1, 49.0], [13.4, 48.57], [14.6, 48.25]],                                                                             // the Danube
  [[8.25, 50.0], [9.0, 50.1], [10.0, 49.9], [10.9, 50.0], [11.8, 50.2]],                                                                                               // the Main
  [[4.8, 49.7], [5.0, 50.3], [5.6, 50.6], [5.75, 51.2], [5.9, 51.7], [5.5, 51.75], [4.9, 51.8]],                                                                       // the Meuse
].map((r) => r.map(([a, b]) => P(a, b)));
const CITIES = [['Paris', 2.35, 48.86, 'Paris'], ['Brussels', 4.35, 50.85, 'Bruxelles'], ['Amsterdam', 4.9, 52.37, 'Amsterdam'], ['Cologne', 6.96, 50.94, 'Cologne'], ['Frankfurt', 8.68, 50.11, 'Francfort'],
  ['Strasbourg', 7.75, 48.58, 'Strasbourg'], ['Hamburg', 10.0, 53.55, 'Hambourg'], ['Leipzig', 12.37, 51.34, 'Leipsick'], ['Berlin', 13.4, 52.52, 'Berlin'], ['Munich', 11.58, 48.14, 'Munich'], ['Kassel', 9.48, 51.31, 'Cassel']]
  .map(([en, lon, lat, fr]) => ({ en, fr, xy: P(lon, lat) }));
const SPOTS = { blue: [[5.3, 51.6], [6.0, 50.25], [6.6, 49.0]], red: [[7.7, 51.45], [8.2, 50.5], [8.7, 49.25]] };
const UNITS = (names) => ['blue', 'red'].flatMap((side) => SPOTS[side].map(([lon, lat], i) => ({ side, xy: P(lon, lat), name: names[side][i], armour: i === 1 })));
const ATTACKS = { blue: [[6.0, 50.25], [6.9, 50.75], [7.6, 50.75]], red: [[8.7, 49.25], [7.9, 49.3], [7.2, 49.05]] };
const arrowPts = (side) => ATTACKS[side].map(([a, b]) => P(a, b));
const WOODS = [[5.6, 50.1, 0.9, 0.35], [9.7, 50.5, 0.6, 0.4], [8.2, 48.5, 0.35, 0.8], [10.6, 50.7, 0.7, 0.25], [7.3, 50.3, 0.5, 0.25]]; // the Ardennes, Rhön, Black Forest, Thuringia, Eifel

// ---- geometry helpers
const f1 = (v) => v.toFixed(1);
const poly = (pts) => `M${pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join('L')}`;
const curve = (pts) => { let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`; for (let i = 1; i < pts.length - 1; i++) { const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; d += `Q${f1(pts[i][0])},${f1(pts[i][1])} ${f1(m[0])},${f1(m[1])}`; } const l = pts.at(-1); return `${d}L${f1(l[0])},${f1(l[1])}`; };
function normals(pts) { return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; }); }
const offset = (pts, d) => { const n = normals(pts); return pts.map((p, i) => [p[0] + n[i][0] * d, p[1] + n[i][1] * d]); }; // (+d: west of a north-to-south line)
function resample(pts, step) { const out = [pts[0]]; let carry = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); let t = step - carry; while (t <= L) { out.push([a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L]); t += step; } carry = L - (t - step); } return out; }
/** A trench: the line resampled, its traverses square out to one side then the other. */
function trench(pts, step, amp) { const r = resample(pts, step), n = normals(r), out = []; r.forEach((p, i) => { const s = i % 2 ? amp : -amp; out.push([p[0] + n[i][0] * s, p[1] + n[i][1] * s]); if (r[i + 1]) out.push([(p[0] + r[i + 1][0]) / 2 + n[i][0] * s, (p[1] + r[i + 1][1]) / 2 + n[i][1] * s]); }); return out; }
/** FLOT: semicircles along the line, bulging toward the enemy (east). */
function flot(pts, step) { const r = resample(pts, step), n = normals(r); let d = `M${f1(r[0][0])},${f1(r[0][1])}`; for (let i = 1; i < r.length; i++) d += `A${step / 2},${step / 2} 0 0 ${n[i][0] > 0 ? 1 : 0} ${f1(r[i][0])},${f1(r[i][1])}`; return d; }
const WEST = [...FRONT, [-300, VH + 300], [-300, -300]], EAST = [...FRONT, [VW + 300, VH + 300], [VW + 300, -300]];
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function woods(sym) { seed = 7; let s = ''; for (const [lon, lat, rx, ry] of WOODS) for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()); const [x, y] = P(lon + Math.cos(a) * rx * r, lat + Math.sin(a) * ry * r); s += sym(x, y); } return s; }
const arrowHead = (id, color, size = 6) => `<marker id="${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="${size}" markerHeight="${size}" orient="auto"><path d="M0 0L10 5L0 10z" fill="${color}"/></marker>`;
const paper = (id, base, grain = 0.06, freq = 0.75) => `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="3"/><feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0 0.1  0 0 0 ${grain} 0"/><feComposite in2="SourceGraphic" operator="in"/><feBlend in="SourceGraphic" mode="multiply"/></filter><rect id="${id}-base" fill="${base}"/>`;
const rough = (id, scale = 3, freq = 0.08) => `<filter id="${id}"><feTurbulence type="turbulence" baseFrequency="${freq}" numOctaves="2" seed="5" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/></filter>`;
const seaClip = `<clipPath id="sea"><path clip-rule="evenodd" d="M-300,-300H${VW + 300}V${VH + 300}H-300Z ${LAND}"/></clipPath><clipPath id="land"><path d="${LAND}"/></clipPath>`;
const nato = (u, w, h) => `${u.armour ? `<ellipse rx="${w * 0.32}" ry="${h * 0.24}" fill="none"/>` : `<path d="M${-w / 2},${-h / 2}L${w / 2},${h / 2}M${-w / 2},${h / 2}L${w / 2},${-h / 2}" fill="none"/>`}`;

// ---- the five styles
const STYLES = {
  1806: {
    about: 'An engraved campaign map: hand-coloured copperplate, water lines along the coast, wooden blocks for the corps, dotted march routes.',
    draw() {
      const units = UNITS({ blue: ['Ier Corps', 'Réserve de cavalerie', 'IIIe Corps'], red: ['Hohenlohe', 'Brunswick', 'Rüchel'] });
      const ink = '#3b2e1f', sea = '#e3dcc0', blue = '#4f6fae', red = '#b5523f';
      let water = ''; for (const w of [34, 26, 19, 13, 8, 4]) water += `<path d="${COAST}" fill="none" stroke="${ink}" stroke-width="${w}" opacity="0.45"/><path d="${COAST}" fill="none" stroke="${sea}" stroke-width="${w - 1.1}"/>`;
      return {
        defs: `${seaClip}${arrowHead('ah-b', blue)}${arrowHead('ah-r', red)}<filter id="bshadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter>
          <linearGradient id="side" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b48a55"/><stop offset="1" stop-color="#7a5430"/></linearGradient>
          <pattern id="grain" width="60" height="7" patternUnits="userSpaceOnUse"><path d="M0,1.5q15,-1 30,0t30,0M0,4.2q15,1.2 30,0t30,0M0,6.2q20,-0.8 40,0t20,0" fill="none" stroke="#1a0f04" stroke-opacity="0.22" stroke-width="0.5"/></pattern><filter id="wash"><feGaussianBlur stdDeviation="9"/></filter><filter id="pp" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" seed="2"/><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.09 0"/></filter><radialGradient id="vig" r="0.75"><stop offset="0.6" stop-color="#7a5a2a" stop-opacity="0"/><stop offset="1" stop-color="#7a5a2a" stop-opacity="0.35"/></radialGradient>`,
        under: `<rect width="${VW}" height="${VH}" fill="#ecdfbf"/>`,
        world: `<rect x="-300" y="-300" width="${VW + 600}" height="${VH + 600}" fill="${sea}"/><g clip-path="url(#sea)">${water}</g>
          <path d="${LAND}" fill="#eee2c3"/>
          <g clip-path="url(#land)" opacity="0.8"><g clip-path="url(#w)"><path d="${curve(FRONT)}" stroke="${blue}" stroke-width="60" fill="none" filter="url(#wash)" opacity="0.6"/></g><g clip-path="url(#e)"><path d="${curve(FRONT)}" stroke="${red}" stroke-width="60" fill="none" filter="url(#wash)" opacity="0.6"/></g></g>
          <clipPath id="w"><path d="${poly(WEST)}Z"/></clipPath><clipPath id="e"><path d="${poly(EAST)}Z"/></clipPath>
          ${woods((x, y) => `<path d="M${f1(x - 3)},${f1(y + 2)}q3,-6 6,0" fill="none" stroke="${ink}" stroke-width="0.7" opacity="0.7"/>`)}
          ${RIVERS.map((r) => `<path d="${curve(r)}" fill="none" stroke="#56708a" stroke-width="1.6"/>`).join('')}
          <path d="${COAST}" fill="none" stroke="${ink}" stroke-width="1.3"/>
          ${CITIES.map((c) => `<g transform="translate(${f1(c.xy[0])} ${f1(c.xy[1])})"><circle r="3.2" fill="none" stroke="${ink}"/><circle r="1.2" fill="${ink}"/><text x="6" y="-4" font-family="IM Fell English" font-style="italic" font-size="15" fill="${ink}">${c.fr}</text></g>`).join('')}
          ${['blue', 'red'].map((s) => `<path d="${curve(arrowPts(s))}" fill="none" stroke="${s === 'blue' ? blue : red}" stroke-width="2.4" stroke-dasharray="1 5" stroke-linecap="round" marker-end="url(#ah-${s[0]})"/>`).join('')}
          ${units.map((u, n) => { const face = u.side === 'blue' ? '#3f5f9e' : '#9c3f2c', mark = n % 3 === 1 ? '<path d="M-6,-4L6,4" stroke="#f3ead2" stroke-width="1.6"/>' : '<path d="M-6,-4L6,4M-6,4L6,-4" stroke="#f3ead2" stroke-width="1.4"/>';
            return `<g transform="translate(${f1(u.xy[0])} ${f1(u.xy[1])}) rotate(${[-6, 4, -2, 7, -4, 3][n]})">
              <rect x="-17" y="-6" width="40" height="22" rx="2" fill="#2a1a08" opacity="0.4" filter="url(#bshadow)"/>
              <path d="M18,-10L22,-6V12H-15L-19,8H18Z" fill="url(#side)"/><path d="M18,8L22,12" stroke="#4a2f14" stroke-width="0.6"/>
              <rect x="-19" y="-10" width="37" height="18" rx="1" fill="${face}"/><rect x="-19" y="-10" width="37" height="18" rx="1" fill="url(#grain)"/>
              <path d="M-18.5,-9.4H17.5" stroke="#fff" stroke-opacity="0.35" stroke-width="0.8"/><rect x="-19" y="-10" width="37" height="18" rx="1" fill="none" stroke="#2a1a08" stroke-width="0.7"/>
              <rect x="-8" y="-6" width="16" height="10" fill="none" stroke="#f3ead2" stroke-width="1.1" transform="translate(-1 1)"/><g transform="translate(-1 1)">${mark}</g>
              <text x="13" y="3.5" text-anchor="middle" font-family="IM Fell English" font-size="9" fill="#f3ead2">${['I', 'R', 'III', 'H', 'B', 'R'][n]}</text>
              <text y="27" text-anchor="middle" font-family="IM Fell English" font-style="italic" font-size="14" fill="${ink}">${u.name}</text></g>`; }).join('')}
          <text x="${P(4.2, 53.9)[0]}" y="${P(4.2, 53.9)[1]}" font-family="IM Fell English SC" font-size="22" letter-spacing="10" fill="${ink}" opacity="0.8">Mer du Nord</text>
          <text x="${P(9.3, 49.3)[0]}" y="${P(9.3, 49.3)[1]}" font-family="IM Fell English SC" font-size="26" letter-spacing="14" fill="${ink}" opacity="0.5" transform="rotate(-12 ${P(9.3, 49.3)[0]} ${P(9.3, 49.3)[1]})">Allemagne</text>`,
        over: `<rect width="${VW}" height="${VH}" filter="url(#pp)" pointer-events="none"/><rect width="${VW}" height="${VH}" fill="url(#vig)" pointer-events="none"/>
          <rect x="10" y="10" width="${VW - 20}" height="${VH - 20}" fill="none" stroke="${ink}" stroke-width="3"/><rect x="17" y="17" width="${VW - 34}" height="${VH - 34}" fill="none" stroke="${ink}" stroke-width="0.8"/>
          <g transform="translate(46 44)"><rect width="330" height="96" fill="#efe3c4" stroke="${ink}" stroke-width="1.5"/><rect x="5" y="5" width="320" height="86" fill="none" stroke="${ink}" stroke-width="0.6"/>
            <text x="165" y="36" text-anchor="middle" font-family="IM Fell English SC" font-size="22" fill="${ink}">Carte du Théâtre de la Guerre</text><text x="165" y="62" text-anchor="middle" font-family="IM Fell English" font-style="italic" font-size="17" fill="${ink}">en Allemagne, pour la Campagne de 1806</text><text x="165" y="82" text-anchor="middle" font-family="IM Fell English" font-size="12" fill="${ink}">Dépôt de la Guerre</text></g>
          <g transform="translate(${VW - 90} ${VH - 90})" fill="${ink}" stroke="${ink}"><circle r="40" fill="none" stroke-width="0.8"/><circle r="34" fill="none" stroke-width="0.5"/><path d="M0,-44L6,0L0,44L-6,0Z M-44,0L0,6L44,0L0,-6Z" stroke-width="0.6" fill="#efe3c4"/><path d="M0,-44L6,0L0,0Z M44,0L0,6L0,0Z M0,44L-6,0L0,0Z M-44,0L0,-6L0,0Z" stroke="none"/><text y="-50" text-anchor="middle" font-family="IM Fell English SC" font-size="16" stroke="none">N</text></g>`,
      };
    },
  },
  1918: {
    about: 'A trench map: squared sheet, blue and red trench lines with wire between, woods as tree symbols, typed corrections.',
    draw() {
      const units = UNITS({ blue: ['Canadian Corps', 'Cavalry Corps', 'XX Corps'], red: ['17. Armee', '2. Armee', '18. Armee'] });
      const ink = '#1d1d1a', blue = '#2457a8', red = '#c0281e', g = 100;
      let grid = '', L = 'ABCDEFGHIJKLMNOP';
      for (let x = 0; x <= VW; x += g) grid += `<path d="M${x},-300V${VH + 300}" stroke="${ink}" stroke-width="0.5" opacity="0.5"/>`;
      for (let y = 0; y <= VH; y += g) grid += `<path d="M-300,${y}H${VW + 300}" stroke="${ink}" stroke-width="0.5" opacity="0.5"/>`;
      for (let i = 0; i < VW / g; i++) for (let j = 0; j < VH / g; j++) grid += `<text x="${i * g + 50}" y="${j * g + 62}" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="34" fill="${ink}" opacity="0.07">${L[i]}${j + 1}</text>`;
      const nml = [...offset(FRONT, 7), ...offset(FRONT, -7).reverse()];
      return {
        defs: `${seaClip}${arrowHead('ah-b', blue, 5)}${arrowHead('ah-r', red, 5)}<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2"/></filter>
          ${['blue', 'red'].map((sd) => `<radialGradient id="ph-${sd}" cx="0.5" cy="0.5" fx="0.32" fy="0.3" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.18" stop-color="${sd === 'blue' ? '#5f8fe8' : '#f05a48'}"/><stop offset="0.75" stop-color="${sd === 'blue' ? '#1c3f9a' : '#9a1a12'}"/><stop offset="1" stop-color="${sd === 'blue' ? '#0c1f55' : '#4a0806'}"/></radialGradient>`).join('')}<pattern id="wire" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M1,1L7,7M7,1L1,7" stroke="${ink}" stroke-width="0.7"/></pattern><filter id="pp" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0.05 0"/></filter>`,
        under: `<rect width="${VW}" height="${VH}" fill="#f2efe4"/>`,
        world: `<rect x="-300" y="-300" width="${VW + 600}" height="${VH + 600}" fill="#dfe6e3"/><path d="${LAND}" fill="#f2efe4"/>
          <path d="${BORDERS}" fill="none" stroke="${ink}" stroke-width="1" stroke-dasharray="1 3 6 3" opacity="0.6"/>
          ${woods((x, y) => `<g transform="translate(${f1(x)} ${f1(y)})" stroke="${ink}" stroke-width="0.6" fill="none"><path d="M0,3V0"/><circle cy="-2" r="2"/></g>`)}
          ${RIVERS.map((r) => `<path d="${curve(r)}" fill="none" stroke="#3a6fb0" stroke-width="1.4"/>`).join('')}
          <path d="${COAST}" fill="none" stroke="${ink}" stroke-width="1"/>${grid}
          <path d="${poly(nml)}Z" fill="url(#wire)" opacity="0.8"/>
          <path d="${poly(trench(offset(FRONT, 10), 7, 2.4))}" fill="none" stroke="${blue}" stroke-width="2.2"/>
          <path d="${poly(trench(offset(FRONT, -10), 7, 2.4))}" fill="none" stroke="${red}" stroke-width="2.2"/>
          <path d="${poly(trench(offset(FRONT, -26), 9, 2))}" fill="none" stroke="${red}" stroke-width="1.3"/>
          <path d="${poly(trench(offset(FRONT, 26), 9, 2))}" fill="none" stroke="${blue}" stroke-width="1.3"/>
          ${CITIES.map((c) => `<g transform="translate(${f1(c.xy[0])} ${f1(c.xy[1])})"><rect x="-3" y="-3" width="6" height="6" fill="${ink}"/><text x="7" y="-5" font-family="Georgia, serif" font-size="13" letter-spacing="1" fill="${ink}">${c.en.toUpperCase()}</text></g>`).join('')}
          ${['blue', 'red'].map((s) => `<path d="${curve(arrowPts(s))}" fill="none" stroke="${s === 'blue' ? blue : red}" stroke-width="1.6" marker-end="url(#ah-${s[0]})"/>`).join('')}
          ${units.map((u) => { const w = u.name.length * 6.6 + 12; return `<g transform="translate(${f1(u.xy[0])} ${f1(u.xy[1])})">
              <path d="M0,0L13,-6" stroke="#000" stroke-opacity="0.22" stroke-width="1.6" filter="url(#soft)"/><circle cx="15" cy="-7" r="5.5" fill="#000" opacity="0.2" filter="url(#soft)"/>
              <path d="M-2,-21h${w}v14h-${w}z" fill="#000" opacity="0.12" transform="translate(5 3)" filter="url(#soft)"/>
              <path d="M-2,-21h${w}v14h-${w}z" fill="#fbf8ee" stroke="#6b665a" stroke-width="0.5"/><path d="M${w - 6},-21h4v14h-4z" fill="${u.side === 'blue' ? blue : red}"/>
              <text x="3" y="-10.5" font-family="Special Elite" font-size="11.5" fill="${ink}">${u.name}</text>
              <path d="M0,0L-3,-28" stroke="#8d8d88" stroke-width="1.4"/><path d="M-0.5,-2L-3.2,-26" stroke="#e8e8e2" stroke-width="0.4"/>
              <circle cx="-3" cy="-30" r="6" fill="url(#ph-${u.side})"/><circle cx="-3" cy="-30" r="6" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="0.5"/></g>`; }).join('')}`,
        over: `<rect width="${VW}" height="${VH}" filter="url(#pp)" pointer-events="none"/>
          <g transform="translate(${VW - 330} ${VH - 92})"><rect width="310" height="72" fill="#f2efe4" stroke="${ink}"/><text x="12" y="24" font-family="Georgia, serif" font-weight="700" font-size="16" fill="${ink}">SHEET 51 B · EDITION 4 A</text><text x="12" y="44" font-family="Special Elite" font-size="13" fill="${ink}">Trenches corrected to 1-6-18.</text><text x="12" y="62" font-family="Special Elite" font-size="13" fill="${red}">German trenches in red. Wire shown thus: ✕✕</text></g>`,
      };
    },
  },
  1945: {
    about: 'A staff map on the table: yellowed paper with folds and a coffee ring, the front in grease pencil, cardboard counters, wax-pencil arrows.',
    draw() {
      const units = UNITS({ blue: ['XXX Corps', 'VII Corps', 'XV Corps'], red: ['1. Fsch.-Armee', 'XLVII Pz.K.', '19. Armee'] });
      const ink = '#3d2f1e', blue = '#2a5bd0', red = '#d0302a';
      return {
        defs: `${seaClip}${arrowHead('ah-b', blue, 4)}${arrowHead('ah-r', red, 4)}${rough('rough', 4, 0.06)}<filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="2" dy="3" stdDeviation="1.8" flood-color="#000" flood-opacity="0.45"/></filter>
          <filter id="pp" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="4" seed="4"/><feColorMatrix values="0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0 0.12  0 0 0 0.12 0"/></filter>
          <linearGradient id="foldv" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.48" stop-color="#5a4320" stop-opacity="0.13"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.52" stop-color="#000" stop-opacity="0"/></linearGradient>
          <linearGradient id="foldh" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.48" stop-color="#5a4320" stop-opacity="0.11"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.2"/><stop offset="0.52" stop-color="#000" stop-opacity="0"/></linearGradient>
          <radialGradient id="ring"><stop offset="0.82" stop-color="#7a5020" stop-opacity="0"/><stop offset="0.9" stop-color="#7a5020" stop-opacity="0.22"/><stop offset="0.95" stop-color="#7a5020" stop-opacity="0.07"/><stop offset="1" stop-color="#7a5020" stop-opacity="0"/></radialGradient>
          <radialGradient id="vig" r="0.8"><stop offset="0.55" stop-color="#5a4020" stop-opacity="0"/><stop offset="1" stop-color="#5a4020" stop-opacity="0.4"/></radialGradient>`,
        under: `<rect width="${VW}" height="${VH}" fill="#e7d8b0"/>`,
        world: `<rect x="-300" y="-300" width="${VW + 600}" height="${VH + 600}" fill="#bfc8bf"/><path d="${LAND}" fill="#e9dbb4"/>
          <path d="${BORDERS}" fill="none" stroke="${ink}" stroke-width="0.9" stroke-dasharray="5 3 1 3" opacity="0.45"/>
          ${woods((x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="3.4" fill="#9aa775" opacity="0.35"/>`)}
          ${RIVERS.map((r) => `<path d="${curve(r)}" fill="none" stroke="#5f7f95" stroke-width="1.5"/>`).join('')}
          <path d="${COAST}" fill="none" stroke="${ink}" stroke-width="1.2"/>
          <g filter="url(#rough)" opacity="0.85"><path d="${curve(offset(FRONT, 5))}" fill="none" stroke="${blue}" stroke-width="5" stroke-linecap="round"/><path d="${curve(offset(FRONT, -5))}" fill="none" stroke="${red}" stroke-width="5" stroke-linecap="round"/></g>
          ${CITIES.map((c) => `<g transform="translate(${f1(c.xy[0])} ${f1(c.xy[1])})"><circle r="2.6" fill="${ink}"/><text x="6" y="-4" font-family="Special Elite" font-size="13" fill="${ink}">${c.en}</text></g>`).join('')}
          <g filter="url(#rough)">${['blue', 'red'].map((s) => `<path d="${curve(arrowPts(s))}" fill="none" stroke="${s === 'blue' ? blue : red}" stroke-width="5" stroke-linecap="round" opacity="0.85" marker-end="url(#ah-${s[0]})"/>`).join('')}</g>
          ${[[7.6, 50.75, blue], [7.2, 49.05, red], [6.96, 50.94, '#e0b020']].map(([lon, lat, col]) => { const [x, y] = P(lon, lat); return `<g filter="url(#shadow)"><path d="M${f1(x)},${f1(y)}l7,-14" stroke="#888" stroke-width="1.6"/><circle cx="${f1(x + 7)}" cy="${f1(y - 14)}" r="5" fill="${col}"/><circle cx="${f1(x + 5.5)}" cy="${f1(y - 15.5)}" r="1.6" fill="#fff" opacity="0.6"/></g>`; }).join('')}
          ${units.map((u, i) => `<g transform="translate(${f1(u.xy[0])} ${f1(u.xy[1])}) rotate(${[-4, 3, -2, 5, -3, 2][i]})"><g filter="url(#shadow)"><rect x="-21" y="-15" width="42" height="30" rx="1.5" fill="${u.side === 'blue' ? '#bcd0f2' : '#f2c1b6'}" stroke="#2a2418" stroke-width="0.8"/></g><rect x="-13" y="-6" width="26" height="15" fill="none" stroke="#1a1a1a" stroke-width="1.3"/><g transform="translate(0 1.5)" stroke="#1a1a1a" stroke-width="1.2">${nato(u, 26, 15)}</g><text y="-8.5" text-anchor="middle" font-family="Special Elite" font-size="7" fill="#1a1a1a">XXX</text><text y="29" text-anchor="middle" font-family="Special Elite" font-size="12" fill="${ink}">${u.name}</text></g>`).join('')}
          <text x="${P(3.0, 53.8)[0]}" y="${P(3.0, 53.8)[1]}" font-family="Stardos Stencil" font-weight="700" font-size="24" letter-spacing="8" fill="#4d6470" opacity="0.8">NORTH SEA</text>`,
        over: `<rect width="${VW}" height="${VH}" filter="url(#pp)" pointer-events="none"/><rect width="${VW}" height="${VH}" fill="url(#foldv)" pointer-events="none"/><rect width="${VW}" height="${VH}" fill="url(#foldh)" pointer-events="none"/>
          <circle cx="${VW * 0.78}" cy="${VH * 0.26}" r="58" fill="url(#ring)" pointer-events="none"/><rect width="${VW}" height="${VH}" fill="url(#vig)" pointer-events="none"/>
          <g transform="translate(40 36) rotate(-1.5)"><g filter="url(#shadow)"><rect width="300" height="74" fill="#f4ecd4"/></g><rect x="120" y="-8" width="60" height="18" fill="#efe6c0" opacity="0.75" transform="rotate(3 150 0)"/>
            <text x="14" y="30" font-family="Special Elite" font-size="15" fill="#222">SITUATION 1200 HRS 18 SEP 44</text><text x="14" y="54" font-family="Special Elite" font-size="13" fill="#222">G-3 · 12th ARMY GROUP · SECRET</text></g>`,
      };
    },
  },
  1985: {
    about: 'A printed military map under an acetate sheet: grid, forests in green, units and phase lines in grease pencil and marker, the glare of the plastic.',
    draw() {
      const units = UNITS({ blue: ['I (BE) Corps', 'V (US) Corps', 'VII (US) Corps'], red: ['3 Shock Army', '8 Gds Army', '1 Gds Tank Army'] });
      const blue = '#1f4fe0', red = '#e0261f', mk = '#151515';
      let grid = ''; for (let x = 0; x <= VW; x += 60) grid += `<path d="M${x},-300V${VH + 300}" stroke="#3b6aa0" stroke-width="0.5" opacity="0.5"/><text x="${x + 2}" y="12" font-family="Arial" font-size="8" fill="#3b6aa0">${String(x / 6 % 100).padStart(2, '0')}</text>`;
      for (let y = 0; y <= VH; y += 60) grid += `<path d="M-300,${y}H${VW + 300}" stroke="#3b6aa0" stroke-width="0.5" opacity="0.5"/><text x="2" y="${y - 2}" font-family="Arial" font-size="8" fill="#3b6aa0">${String(y / 6 % 100).padStart(2, '0')}</text>`;
      const pl = (d, name, at) => { const pts = offset(FRONT, d); const m = pts[at]; return `<path d="${curve(pts)}" fill="none" stroke="${mk}" stroke-width="2.4" stroke-dasharray="22 10" filter="url(#rough)"/><text x="${f1(m[0] - 30)}" y="${f1(m[1])}" font-family="Architects Daughter" font-size="17" stroke="${mk}" stroke-width="0.5" fill="${mk}">PL ${name}</text>`; };
      return {
        defs: `${seaClip}${arrowHead('ah-r', red, 4)}${rough('rough', 2.5, 0.12)}<linearGradient id="glare" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.02"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.14"/><stop offset="0.56" stop-color="#fff" stop-opacity="0.02"/><stop offset="1" stop-color="#fff" stop-opacity="0.08"/></linearGradient><filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>`,
        under: `<rect width="${VW}" height="${VH}" fill="#ece9d6"/>`,
        world: `<rect x="-300" y="-300" width="${VW + 600}" height="${VH + 600}" fill="#b9d3e2"/><path d="${LAND}" fill="#eeead6"/>
          <g clip-path="url(#land)">${woods((x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="#bcd6a0" opacity="0.7"/>`)}</g>
          <path d="${BORDERS}" fill="none" stroke="#8a3a9a" stroke-width="2" stroke-dasharray="8 3 2 3" opacity="0.7"/>
          ${RIVERS.map((r) => `<path d="${curve(r)}" fill="none" stroke="#2f7fc0" stroke-width="2"/>`).join('')}
          <path d="${COAST}" fill="none" stroke="#2b5f86" stroke-width="1"/>${grid}
          ${CITIES.map((c) => `<g transform="translate(${f1(c.xy[0])} ${f1(c.xy[1])})"><path d="M-4,-4h8v8h-8z" fill="#d23a2a" opacity="0.75"/><text x="7" y="-5" font-family="Arial Narrow, Arial" font-weight="700" font-size="12" fill="#2a2a2a">${c.en.toUpperCase()}</text></g>`).join('')}
          <g filter="url(#rough)"><path d="${flot(offset(FRONT, 4), 14)}" fill="none" stroke="${blue}" stroke-width="3"/></g>
          ${pl(48, 'GOLD', 4)}${pl(-60, 'DOG', 2)}
          <g filter="url(#rough)" stroke-linejoin="round">${(() => { const a = arrowPts('red'), l = offset(a, 9), r = offset(a, -9), tip = a.at(-1), n = normals(a).at(-1), dir = [n[1], -n[0]]; const hw = (s) => [tip[0] - dir[0] * 18 + n[0] * s, tip[1] - dir[1] * 18 + n[1] * s]; return `<path d="${poly([...l.slice(0, -1), hw(9), hw(20), [tip[0] + dir[0] * 6, tip[1] + dir[1] * 6], hw(-20), hw(-9), ...r.slice(0, -1).reverse()])}Z" fill="${red}" fill-opacity="0.12" stroke="${red}" stroke-width="2.6"/>`; })()}</g>
          ${units.map((u) => `<g transform="translate(${f1(u.xy[0])} ${f1(u.xy[1])})" stroke="${u.side === 'blue' ? blue : red}" stroke-width="2.4" fill="none"><g filter="url(#rough)">${u.side === 'blue' ? '<rect x="-18" y="-11" width="36" height="22"/>' : '<path d="M0,-18L18,0L0,18L-18,0Z"/>'}<g stroke-width="2">${nato(u, u.side === 'blue' ? 36 : 22, u.side === 'blue' ? 22 : 14)}</g></g><text y="${u.side === 'blue' ? -15 : -22}" text-anchor="middle" font-family="Architects Daughter" font-size="12" stroke-width="0.4" fill="${u.side === 'blue' ? blue : red}">XXX</text><text y="${u.side === 'blue' ? 28 : 33}" text-anchor="middle" font-family="Architects Daughter" font-size="15" stroke-width="0.5" fill="${u.side === 'blue' ? blue : red}">${u.name}</text></g>`).join('')}`,
        over: `<g pointer-events="none"><ellipse cx="${VW * 0.3}" cy="${VH * 0.7}" rx="70" ry="22" fill="#5a6a8a" opacity="0.07" filter="url(#blur6)"/><ellipse cx="${VW * 0.62}" cy="${VH * 0.2}" rx="50" ry="16" fill="#8a3a3a" opacity="0.06" filter="url(#blur6)"/><rect width="${VW}" height="${VH}" fill="url(#glare)"/><rect x="4" y="4" width="${VW - 8}" height="${VH - 8}" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="2"/></g>
          <g transform="translate(${VW - 250} 30)"><rect width="220" height="64" fill="#fff" fill-opacity="0.85" stroke="#222"/><text x="10" y="22" font-family="Arial" font-weight="700" font-size="12" fill="#222">SERIES M745 · SHEET NB 4-7</text><text x="10" y="44" font-family="Architects Daughter" font-weight="700" font-size="14" fill="#222">OPORD 3-85 · H-HOUR 0430</text></g>`,
      };
    },
  },
  2027: {
    screen: true, // (a screen: its HUD stays where it is; everything else is paper or plastic on the map)
    about: 'A digital command display: dark vector map with glowing coastline, hostile frames as diamonds, air-defence and drone rings, animated axes, a HUD.',
    draw() {
      const units = UNITS({ blue: ['MND-NE', 'V CORPS', '1 PL DIV'], red: ['6 CAA', '1 GTA', '11 AC'] });
      const cyan = '#38d6e8', blue = '#4c9bff', red = '#ff4a3d';
      let grid = ''; for (let x = 0; x <= VW; x += 50) grid += `<path d="M${x},-300V${VH + 300}" stroke="#12323c" stroke-width="0.6"/>`; for (let y = 0; y <= VH; y += 50) grid += `<path d="M-300,${y}H${VW + 300}" stroke="#12323c" stroke-width="0.6"/>`;
      const sam = P(9.3, 50.2), drone = P(6.6, 50.6);
      return {
        defs: `${seaClip}<clipPath id="w"><path d="${poly(WEST)}Z"/></clipPath><clipPath id="e"><path d="${poly(EAST)}Z"/></clipPath>${arrowHead('ah-b', blue, 4)}${arrowHead('ah-r', red, 4)}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity="0.35"/></pattern><radialGradient id="vig" r="0.8"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/></radialGradient>`,
        under: `<rect width="${VW}" height="${VH}" fill="#06090c"/>`,
        world: `<rect x="-300" y="-300" width="${VW + 600}" height="${VH + 600}" fill="#071016"/>${grid}<path d="${LAND}" fill="#0e1a20"/>
          <g clip-path="url(#land)"><g clip-path="url(#w)"><rect x="-300" y="-300" width="${VW + 600}" height="${VH + 600}" fill="${blue}" opacity="0.1"/></g><g clip-path="url(#e)"><rect x="-300" y="-300" width="${VW + 600}" height="${VH + 600}" fill="${red}" opacity="0.1"/></g></g>
          <path d="${BORDERS}" fill="none" stroke="#1f6a75" stroke-width="0.8" stroke-dasharray="3 3"/>
          ${RIVERS.map((r) => `<path d="${curve(r)}" fill="none" stroke="#1c5a7a" stroke-width="1.2"/>`).join('')}
          <path d="${COAST}" fill="none" stroke="${cyan}" stroke-width="1" filter="url(#glow)"/>
          <path d="${curve(FRONT)}" fill="none" stroke="#eaf6ff" stroke-width="1.6" filter="url(#glow)"/>
          <g transform="translate(${f1(sam[0])} ${f1(sam[1])})"><circle r="120" fill="${red}" fill-opacity="0.04" stroke="${red}" stroke-width="1" stroke-dasharray="6 5" opacity="0.8"/><text y="-124" text-anchor="middle" font-family="Share Tech Mono" font-size="11" fill="${red}">S-400 · 120 KM</text><path d="M-6,4L0,-6L6,4Z" fill="none" stroke="${red}" stroke-width="1.4"/></g>
          <g transform="translate(${f1(drone[0])} ${f1(drone[1])})"><circle class="spin" r="34" fill="none" stroke="${cyan}" stroke-width="1.2" stroke-dasharray="10 6"/><text y="-40" text-anchor="middle" font-family="Share Tech Mono" font-size="10" fill="${cyan}">UAS ORBIT · 3 KM</text></g>
          ${['blue', 'red'].map((s) => `<path class="march" d="${curve(arrowPts(s))}" fill="none" stroke="${s === 'blue' ? blue : red}" stroke-width="2.2" stroke-dasharray="12 8" filter="url(#glow)" marker-end="url(#ah-${s[0]})"/>`).join('')}
          ${CITIES.map((c) => `<g transform="translate(${f1(c.xy[0])} ${f1(c.xy[1])})"><rect x="-2.5" y="-2.5" width="5" height="5" fill="none" stroke="#7fa6b4"/><text x="7" y="-4" font-family="Share Tech Mono" font-size="11" fill="#7fa6b4">${c.en.toUpperCase()}</text></g>`).join('')}
          ${units.map((u, i) => { const col = u.side === 'blue' ? blue : red, frame = u.side === 'blue' ? '<rect x="-17" y="-11" width="34" height="22"/>' : '<path d="M0,-17L17,0L0,17L-17,0Z"/>'; const str = [0.92, 0.71, 0.84, 0.66, 0.9, 0.58][i]; return `<g transform="translate(${f1(u.xy[0])} ${f1(u.xy[1])})" filter="url(#glow)"><g fill="${col}" fill-opacity="0.18" stroke="${col}" stroke-width="1.5">${frame}</g><g stroke="${col}" stroke-width="1.3">${nato(u, u.side === 'blue' ? 34 : 20, u.side === 'blue' ? 22 : 13)}</g><text y="${u.side === 'blue' ? -15 : -21}" text-anchor="middle" font-family="Share Tech Mono" font-size="10" fill="${col}">XXX</text><text x="${u.side === 'blue' ? 22 : 22}" y="-2" font-family="Share Tech Mono" font-size="11" fill="#d8eef6">${u.name}</text><rect x="22" y="4" width="40" height="3" fill="#1a2a30"/><rect x="22" y="4" width="${40 * str}" height="3" fill="${str > 0.75 ? '#4ce08a' : '#e8c240'}"/></g>`; }).join('')}`,
        over: `<g pointer-events="none"><rect width="${VW}" height="${VH}" fill="url(#scan)"/><rect width="${VW}" height="${VH}" fill="url(#vig)"/>
          <g stroke="${cyan}" stroke-width="2" fill="none" opacity="0.8"><path d="M14,44V14H44M${VW - 44},14H${VW - 14}V44M14,${VH - 44}V${VH - 14}H44M${VW - 44},${VH - 14}H${VW - 14}V${VH - 44}"/></g>
          <text x="28" y="36" font-family="Share Tech Mono" font-size="14" fill="${cyan}">JOC · CENTRAL EUROPE · 2027-05-14 06:42Z</text><text x="28" y="54" font-family="Share Tech Mono" font-size="11" fill="#5fa4b0">BLUE 3 CORPS · RED 3 ARMIES · EW: CONTESTED · LINK 16 OK</text>
          <text x="${VW - 28}" y="${VH - 26}" text-anchor="end" font-family="Share Tech Mono" font-size="11" fill="#5fa4b0">ZOOM · PAN · 52°N 008°E</text></g>`,
      };
    },
  },
};

// ---- the page: tabs, the map with zoom and pan
const svg = document.getElementById('map'), tabs = document.getElementById('tabs');
let current = new URLSearchParams(location.search).get('style') ?? '1945', t = 'translate(0,0) scale(1)';
function show(id) {
  current = id;
  const s = STYLES[id].draw();
  svg.innerHTML = STYLES[id].screen ? `<defs>${s.defs}</defs>${s.under}<g id="world" transform="${t}">${s.world}</g>${s.over}` : `<defs>${s.defs}</defs><g id="world" transform="${t}">${s.under}${s.world}${s.over}</g>`;
  document.getElementById('about').textContent = STYLES[id].about;
  for (const b of tabs.children) b.classList.toggle('on', b.dataset.id === id);
}
for (const id of Object.keys(STYLES)) { const b = document.createElement('button'); b.textContent = id; b.dataset.id = id; b.onclick = () => show(id); tabs.append(b); }
select(svg).call(zoom().scaleExtent([1, 8]).translateExtent([[0, 0], [VW, VH]]).on('zoom', (e) => { t = e.transform.toString(); svg.querySelector('#world')?.setAttribute('transform', t); }));
await document.fonts.ready;
show(current);
window.ready = true;
