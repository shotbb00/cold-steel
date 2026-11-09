"""
Sea soak test: AI against AI on a sea map for a stretch of game time, and what must never happen
does not — a ship with no position (NaN), a surface ship aground (water under her shallower than a
hull needs, world/Nav.js SHIP_DEPTH) for more than a few seconds, two hulls overlapping, a script
error. Also reports how the battle went and what a simulation step costs (CPU, ms).
Needs the dev server (npx vite --port 5173).

  py -I tools/sea_suite.py [map] [minutes] [mode] [base url]
"""
import sys
from playwright.sync_api import sync_playwright

MAP = sys.argv[1] if len(sys.argv) > 1 else 'midway'
MINUTES = float(sys.argv[2]) if len(sys.argv) > 2 else 15
MODE = sys.argv[3] if len(sys.argv) > 3 else 'frontline'
BASE = sys.argv[4] if len(sys.argv) > 4 else 'http://localhost:5173'  # (a build on its own port: npx vite preview --port 5174 — not reloaded while you edit)

SETUP = r"""() => { const g = game; g.renderer.setAnimationLoop?.(null); g.end = () => { window.__ended = true; };
  const D = g.systems.find((s) => typeof s.submarine === 'function' && typeof s.objective === 'function'); // (the admiral: by what it does — a build minifies class names)
  if (D) g.systems.push(new D.constructor(g, g.playerFaction, g.modeState, {})); // the player's side played by the bot too
  window.__t = { aground: new Map(), worstAground: 0, overlaps: 0, nan: 0, steps: [], sunk: { nato: 0, pact: 0 }, spawned: { nato: 0, pact: 0 } };
  g.bus.on('stack:destroyed', (s) => { if (s.stats.naval) __t.sunk[s.faction]++; });
  return !!D;
}"""

RUN = r"""(secs) => {
  const g = game, T = g.world.terrain, t = __t, level = g.world.river?.level ?? 0;
  const seg = [0, 0, 0, 0, 0], seg2 = [0, 0, 0, 0, 0];
  const near = (a, b) => { let best = 1e9; for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) best = Math.min(best, Math.hypot(a[0] + (a[2] - a[0]) * i / 12 - b[0] - (b[2] - b[0]) * j / 12, a[1] + (a[3] - a[1]) * i / 12 - b[1] - (b[3] - b[1]) * j / 12)); return best; };
  for (let i = 0; i < 30 * secs; i++) {
    const t0 = performance.now();
    g.step(1 / 30);
    t.steps.push(performance.now() - t0);
    if (i % 30) continue;
    const ships = [];
    for (const s of g.world.stacks) {
      if (!s.alive || !s.stats.naval) continue;
      for (const u of s.units) {
        if (!u.alive) continue;
        if (!Number.isFinite(u.pos.x) || !Number.isFinite(u.pos.z) || !Number.isFinite(u.pos.y)) t.nan++;
        if (!s.stats.submarine) ships.push([s, u]);
        const depth = level - T.heightAt(u.pos.x, u.pos.z);
        const k = u;
        if (!s.stats.submarine && depth < 3.5) { const n = (t.aground.get(k) ?? 0) + 1; t.aground.set(k, n); t.worstAground = Math.max(t.worstAground, n); }
        else t.aground.delete(k);
      }
    }
    for (let a = 0; a < ships.length; a++) for (let b = a + 1; b < ships.length; b++) {
      const [sa, ua] = ships[a], [sb, ub] = ships[b];
      if (Math.abs(ua.pos.x - ub.pos.x) > 300 || Math.abs(ua.pos.z - ub.pos.z) > 300) continue;
      const A = sa.hullOf(ua, seg), B = sb.hullOf(ub, seg2);
      if (near(A, B) < A[4] + B[4] - 1.5) t.overlaps++;
    }
    if (window.__ended) break;
  }
  const st = g.modeState;
  return { time: Math.round(g.world.time), strength: st?.strength && [Math.round(st.strength.nato), Math.round(st.strength.pact)],
    ships: ['nato', 'pact'].map((f) => g.world.stacksOf(f).filter((s) => s.alive && s.stats.naval).length), sunk: { ...t.sunk }, ended: !!window.__ended };
}"""

with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 800, 'height': 500})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.on('console', lambda c: c.type == 'error' and errs.append(c.text[:300]))
    pg.goto(f'{BASE}/?mode={MODE}&map={MAP}&epoch=1945&side=nato&time=day&weather=clear', timeout=600000)
    pg.wait_for_function("window.game && !document.getElementById('loading')", timeout=600000)
    print('bot on both sides:', pg.evaluate(SETUP))
    left = MINUTES * 60
    while left > 0:
        chunk = min(60, left)
        r = pg.evaluate(RUN, chunk)
        left -= chunk
        print(r, errs[-1:] if errs else '')
        if r['ended']:
            break
    t = pg.evaluate("(() => { const s = [...__t.steps].sort((a, b) => a - b); const q = (k) => +s[Math.floor(s.length * k)].toFixed(2); return { nan: __t.nan, overlaps: __t.overlaps, worstAgroundSeconds: __t.worstAground, stepMs: { median: q(0.5), p95: q(0.95), max: +s[s.length - 1].toFixed(1) } }; })()")
    b.close()
print('RESULT', t, 'errors:', len(errs))
for e in errs[:5]:
    print('  ', e)
ok = t['nan'] == 0 and t['overlaps'] == 0 and t['worstAgroundSeconds'] <= 5 and not errs
print('PASS' if ok else 'FAIL')
sys.exit(0 if ok else 1)
