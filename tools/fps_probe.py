"""
Frame rate on this machine's real graphics card (headless Edge on Direct3D 11, not the software
renderer the other tools use): a map with the bot on both sides, the camera at a few heights, the
frames counted over a stretch of each. Needs the dev server (npx vite --port 5173).

  py -I tools/fps_probe.py [map] [epoch] [seconds per view]
"""
import sys
from playwright.sync_api import sync_playwright

MAP = sys.argv[1] if len(sys.argv) > 1 else 'midway'
EPOCH = sys.argv[2] if len(sys.argv) > 2 else '1945'
SECS = float(sys.argv[3]) if len(sys.argv) > 3 else 12
GPU = ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu']

with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True, args=GPU)
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.goto(f'http://localhost:5173/?mode=frontline&map={MAP}&epoch={EPOCH}&side=nato&time=day&weather=clear', timeout=600000)
    pg.wait_for_function("window.game && !document.getElementById('loading')", timeout=600000)
    gpu = pg.evaluate("(() => { const c = document.createElement('canvas').getContext('webgl2'); const e = c?.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; })()")
    print('GPU:', gpu)
    pg.evaluate("""async () => { const g = game; const sea = !!g.world.river?.sea;
      const m = sea ? await import('/src/ai/SeaDirector.js') : await import('/src/ai/FrontlineDirector.js');
      const D = sea ? m.SeaDirector : m.FrontlineDirector;
      g.systems.push(new D(g, g.playerFaction, g.modeState, {}));
      window.__frames = []; let last = performance.now();
      const tick = () => { const n = performance.now(); __frames.push(n - last); last = n; requestAnimationFrame(tick); }; requestAnimationFrame(tick); }""")
    pg.wait_for_timeout(15000) # (the fleets get going)
    for name, h in [('start view', None), ('high', 'max'), ('close', 'min')]:
        if h:
            pg.evaluate(f"(() => {{ const tc = game.cameraManager.tactical; tc.height = tc.{h}Height; }})()")
        pg.wait_for_timeout(1500)
        pg.evaluate("__frames.length = 0")
        pg.wait_for_timeout(int(SECS * 1000))
        r = pg.evaluate("(() => { const f = [...__frames].sort((a, b) => a - b); const sum = f.reduce((a, v) => a + v, 0); return { fps: +(f.length / (sum / 1000)).toFixed(1), median: +f[f.length >> 1].toFixed(1), p95: +f[Math.floor(f.length * 0.95)].toFixed(1), worst: +f[f.length - 1].toFixed(0) }; })()")
        print(f'{name:11s}', r)
        pg.screenshot(path=f'shots/fps_{MAP}_{name.split()[0]}.png', timeout=120000)
    print('errors:', errs[:3])
    b.close()
