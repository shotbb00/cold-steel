"""The unit silhouettes (public/silhouettes/<type>-<faction>.png) from the real models.
Run with the dev server up (npm run dev), after changing a unit model:

  py tools/render_silhouettes.py [http://localhost:5173]      (needs Playwright + Edge)"""
import sys, base64, pathlib
from playwright.sync_api import sync_playwright
URL = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5173').rstrip('/') + '/tools/silhouettes.html'
OUT = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'silhouettes'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 360})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(URL)
    pg.wait_for_function('window.ready', timeout=120000)
    shots = pg.evaluate('() => window.silhouettes()')
    b.close()
for name, url in shots.items():
    if url: (OUT / f'{name}.png').write_bytes(base64.b64decode(url.split(',', 1)[1]))
print(len([u for u in shots.values() if u]), 'silhouettes,', 'errors:', errors[:3])
