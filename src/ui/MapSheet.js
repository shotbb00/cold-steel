// The map table behind the main menu and the loading screen: a topographic sheet of a battle
// map drawn from the map's own terrain — contour lines from map.height (every fifth one an index
// contour), soft hill shading, the river, every village or control point by name, both bases in
// NATO symbology (a friendly rectangle, a hostile diamond), and grease-pencil front arrows: red
// thrusts from the Pact's side, a blue line where NATO means to hold. Your side sits at the
// bottom. Picking another map redraws it; the arrows are drawn in as you watch (not with
// reduced motion).
const INK = '#cfc9ad';
const CONTOUR = 'rgba(126, 140, 104, 0.38)';
const INDEX = 'rgba(160, 172, 128, 0.62)';
const TABLE = '#151912';
const BLUE = '#5f93e6';
const RED = '#e2513f';
const WATER = '#3f6f8f';
const N = 168;                // height samples across

/** Marching squares: line segments where the height field crosses `level`. */
function contour(h, n, level, out) {
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = h[j * n + i];
      const b = h[j * n + i + 1];
      const c = h[(j + 1) * n + i + 1];
      const d = h[(j + 1) * n + i];
      const k = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
      if (k === 0 || k === 15) continue;
      const t = (p, q) => (level - p) / (q - p || 1e-6);
      const top = [i + t(a, b), j];
      const right = [i + 1, j + t(b, c)];
      const bottom = [i + t(d, c), j + 1];
      const left = [i, j + t(a, d)];
      const seg = {
        1: [left, bottom], 2: [bottom, right], 3: [left, right], 4: [top, right], 5: [left, top, bottom, right],
        6: [top, bottom], 7: [left, top], 8: [left, top], 9: [top, bottom], 10: [left, bottom, top, right],
        11: [top, right], 12: [left, right], 13: [bottom, right], 14: [left, bottom],
      }[k];
      for (let s = 0; s < seg.length; s += 2) out.push(seg[s], seg[s + 1]);
    }
  }
}

export class MapSheet {
  constructor(parent) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'map-sheet';
    this.canvas.setAttribute('aria-hidden', 'true');
    parent.prepend(this.canvas);
    this.map = null;
    this.side = 'nato';
    this.layout = 'menu';     // 'menu': beside the menu column; 'quiet': dimmed behind a busy panel; 'full': centred (loading)
    this.cache = new Map();   // map id → { h, lo, hi }
    this.onResize = () => { clearTimeout(this.resizeT); this.resizeT = setTimeout(() => this.draw(false), 120); };
    window.addEventListener('resize', this.onResize);
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.raf);
    this.canvas.remove();
  }

  /** Take the sheet off the table (screens that aren't about a battle). */
  hide() {
    this.canvas.hidden = true;
  }

  /** Show `map` with `side` at the bottom; the arrows are drawn in when it's a new map (`animate`). */
  show(map, side = this.side, animate = true, layout = this.layout) {
    const wasHidden = this.canvas.hidden;
    this.canvas.hidden = false;
    const changed = wasHidden || map !== this.map || side !== this.side || layout !== this.layout;
    this.layout = layout;
    this.map = map;
    this.side = side;
    if (changed || !animate) this.draw(animate);
  }

  heights(map) {
    let c = this.cache.get(map.id);
    if (c) return c;
    const h = new Float32Array(N * N);
    const bx = map.bounds.x * 1.12;
    const bz = map.bounds.z * 1.12;
    let lo = Infinity;
    let hi = -Infinity;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const v = map.height(-bx + (i / (N - 1)) * 2 * bx, -bz + (j / (N - 1)) * 2 * bz);
        h[j * N + i] = v;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    c = { h, lo, hi, bx, bz };
    this.cache.set(map.id, c);
    return c;
  }

  draw(animate) {
    const map = this.map;
    if (!map) return;
    const cv = this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth || innerWidth;
    const H = cv.clientHeight || innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = TABLE;
    g.fillRect(0, 0, W, H);

    const { h, lo, hi, bx, bz } = this.heights(map);
    // the sheet: as big as fits, leaning right (the menu is on the left); our side at the bottom
    const full = this.layout === 'full';
    const wide = this.layout === 'menu' && W > 1000;   // room for the menu column and the sheet side by side
    const size = full ? Math.min(W * 0.92, H * 1.1) : Math.min(wide ? W * 0.5 : W * 1.05, H * 1.02);
    const ox = wide ? W - size - Math.max(0, (W * 0.5 - size) / 2) : (W - size) / 2;
    const oy = (H - size) / 2;
    const flip = this.side === 'pact' ? -1 : 1;           // NATO's base has z > 0: at the bottom
    const sx = (x) => ox + ((flip * x + bx) / (2 * bx)) * size;
    const sz = (z) => oy + ((flip * z + bz) / (2 * bz)) * size;
    const gi = (i) => ox + (flip > 0 ? i : N - 1 - i) / (N - 1) * size;
    const gj = (j) => oy + (flip > 0 ? j : N - 1 - j) / (N - 1) * size;

    // hill shading, very soft
    const shade = document.createElement('canvas');
    shade.width = shade.height = N;
    const sg = shade.getContext('2d');
    const img = sg.createImageData(N, N);
    for (let j = 1; j < N - 1; j++) {
      for (let i = 1; i < N - 1; i++) {
        const dx = h[j * N + i + 1] - h[j * N + i - 1];
        const dz = h[(j + 1) * N + i] - h[(j - 1) * N + i];
        const lit = Math.max(-1, Math.min(1, (-dx - dz) * 0.09));
        const ii = flip > 0 ? i : N - 1 - i;
        const jj = flip > 0 ? j : N - 1 - j;
        const p = (jj * N + ii) * 4;
        img.data[p] = lit > 0 ? 190 : 0;
        img.data[p + 1] = lit > 0 ? 196 : 0;
        img.data[p + 2] = lit > 0 ? 160 : 0;
        img.data[p + 3] = Math.abs(lit) * 70;
      }
    }
    sg.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(shade, ox, oy, size, size);

    // contours: about 18 across the height range, every fifth heavier
    const span = Math.max(1, hi - lo);
    const step = [1, 2, 2.5, 5, 10, 20].find((s) => span / s <= 22) ?? 25;
    const segs = [];
    for (let lv = Math.ceil(lo / step) * step, n = 0; lv < hi; lv += step, n++) {
      segs.length = 0;
      contour(h, N, lv, segs);
      const index = Math.round(lv / step) % 5 === 0;
      g.strokeStyle = index ? INDEX : CONTOUR;
      g.lineWidth = index ? 1.25 : 0.7;
      g.beginPath();
      for (let s = 0; s < segs.length; s += 2) {
        g.moveTo(gi(segs[s][0]), gj(segs[s][1]));
        g.lineTo(gi(segs[s + 1][0]), gj(segs[s + 1][1]));
      }
      g.stroke();
    }

    // the river
    const river = map.river;
    for (const path of river?.channels ?? []) {
      g.strokeStyle = WATER;
      g.lineWidth = Math.max(3, (river.halfWidth * 2 / (2 * bx)) * size);
      g.lineCap = 'round';
      g.beginPath();
      for (let x = -bx; x <= bx; x += bx / 60) {
        const px = sx(x);
        const pz = sz(path(x));
        if (x === -bx) g.moveTo(px, pz); else g.lineTo(px, pz);
      }
      g.stroke();
    }

    // a fade to the table at the sheet's edges, stronger on the menu side
    const fade = g.createLinearGradient(0, 0, W, 0);
    // side by side: a fade under the column; narrow: the whole sheet dimmed under the text;
    // loading: only a little toward the card at the lower left
    const dim = wide ? [0.96, 0.86, 0.08, 0.35] : full ? [0.7, 0.45, 0.1, 0.25] : [0.8, 0.78, 0.74, 0.78];
    fade.addColorStop(0, `rgba(21, 25, 18, ${dim[0]})`);
    fade.addColorStop(wide ? 0.5 : 0.3, `rgba(21, 25, 18, ${dim[1]})`);
    fade.addColorStop(wide ? 0.66 : 0.6, `rgba(21, 25, 18, ${dim[2]})`);
    fade.addColorStop(1, `rgba(21, 25, 18, ${dim[3]})`);
    g.fillStyle = fade;
    g.fillRect(0, 0, W, H);
    const cx = ox + size / 2;
    const vig = g.createRadialGradient(cx, H / 2, size * 0.2, cx, H / 2, size * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(10,12,8,0.6)');
    g.fillStyle = vig;
    g.fillRect(0, 0, W, H);

    // villages and points (faint where the menu's text lies over the sheet)
    const strength = wide || full ? 1 : 0.32;
    g.font = `500 ${Math.round(Math.max(11, size / 70))}px 'Barlow Semi Condensed', sans-serif`;
    g.textBaseline = 'middle';
    for (const p of map.points ?? []) {
      const x = sx(p.x);
      const y = sz(p.z);
      g.fillStyle = INK;
      g.globalAlpha = 0.85 * strength;
      g.fillRect(x - 3, y - 3, 6, 6);
      g.globalAlpha = 0.7 * strength;
      g.fillText(p.name ?? p.id, x + 8, y);
      g.globalAlpha = 1;
    }

    // bases: a friendly rectangle, a hostile diamond
    const sym = (b, faction) => {
      const x = sx(b.x);
      const y = sz(b.z);
      const r = Math.max(9, size / 60);
      g.lineWidth = 2;
      g.globalAlpha = strength;
      g.strokeStyle = faction === 'nato' ? BLUE : RED;
      g.fillStyle = faction === 'nato' ? 'rgba(95,147,230,0.18)' : 'rgba(226,81,63,0.18)';
      g.beginPath();
      if (faction === 'nato') g.rect(x - r * 1.4, y - r, r * 2.8, r * 2);
      else { g.moveTo(x, y - r * 1.4); g.lineTo(x + r * 1.4, y); g.lineTo(x, y + r * 1.4); g.lineTo(x - r * 1.4, y); g.closePath(); }
      g.fill();
      g.stroke();
      g.globalAlpha = 1;
    };
    if (map.bases?.nato) sym(map.bases.nato, 'nato');
    if (map.bases?.pact) sym(map.bases.pact, 'pact');

    // grease pencil: the Pact's thrusts and NATO's line
    const pact = map.bases?.pact ?? { x: 0, z: -bz };
    const nato = map.bases?.nato ?? { x: 0, z: bz };
    const lanes = [-0.55, 0, 0.55].map((k) => k * bx);
    const thrusts = lanes.map((lx, i) => {
      const from = { x: lx * 0.6, z: pact.z * 0.78 };
      const to = { x: lx * (i === 1 ? 0.9 : 1.08), z: pact.z * 0.78 + (nato.z - pact.z) * (i === 1 ? 0.46 : 0.38) };
      return [from, to];
    });
    const holdZ = (pact.z + nato.z) / 2 + (nato.z - pact.z) * 0.14;
    const strokes = [
      ...thrusts.map(([a, b]) => ({ kind: 'arrow', color: RED, pts: [a, { x: (a.x + b.x) / 2 + (b.x - a.x) * 0.2, z: (a.z + b.z) / 2 }, b] })),
      { kind: 'line', color: BLUE, pts: Array.from({ length: 13 }, (_, i) => ({ x: -bx * 0.85 + (i / 12) * bx * 1.7, z: holdZ + Math.sin(i * 1.7) * bz * 0.025 })) },
    ];
    const still = g.getImageData(0, 0, cv.width, cv.height);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const total = animate && !reduce ? 1100 : 0;
    const start = performance.now();
    cancelAnimationFrame(this.raf);
    const frame = () => {
      const k = total ? Math.min(1, (performance.now() - start) / total) : 1;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.putImageData(still, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      strokes.forEach((s, n) => {
        const local = Math.max(0, Math.min(1, k * 1.6 - n * 0.18));
        if (local > 0) this.pencil(g, s.pts.map((p) => [sx(p.x), sz(p.z)]), s.color, local, s.kind === 'arrow', size, strength); // faint under text
      });
      if (k < 1) this.raf = requestAnimationFrame(frame);
    };
    frame();
  }

  /** A grease-pencil stroke along `pts`, `k` of the way drawn; with an arrowhead at the end. */
  pencil(g, pts, color, k, head, size, strength = 1) {
    // the path as a smooth curve, then cut to k of its length
    const curve = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      for (let t = 0; t < 1; t += 0.1) curve.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
    curve.push(pts[pts.length - 1]);
    const n = Math.max(2, Math.round(curve.length * k));
    const w = Math.max(3, size / 150);
    g.save();
    g.strokeStyle = color;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // two passes slightly apart: the waxy, uneven edge of a grease pencil
    for (const [dx, dy, a, lw] of [[0, 0, 0.82, w], [0.8, -0.6, 0.35, w * 0.6]]) {
      g.globalAlpha = a * strength;
      g.lineWidth = lw;
      g.beginPath();
      curve.slice(0, n).forEach(([x, y], i) => (i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)));
      g.stroke();
    }
    if (head && k >= 1) {
      const [x1, y1] = curve[curve.length - 1];
      const [x0, y0] = curve[curve.length - 3];
      const a = Math.atan2(y1 - y0, x1 - x0);
      const L = w * 4.2;
      g.globalAlpha = 0.85 * strength;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(x1 - Math.cos(a - 0.5) * L, y1 - Math.sin(a - 0.5) * L);
      g.lineTo(x1, y1);
      g.lineTo(x1 - Math.cos(a + 0.5) * L, y1 - Math.sin(a + 0.5) * L);
      g.stroke();
    }
    g.restore();
  }
}
