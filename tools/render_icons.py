"""PNG app icons from the logo SVGs (PWA icons, apple-touch-icon, favicon)."""
import sys, pathlib
from playwright.sync_api import sync_playwright
SRC, OUT = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
jobs = [('icon.svg', 512, 'icon-512.png', 1.0), ('icon.svg', 192, 'icon-192.png', 1.0), ('icon.svg', 180, 'apple-touch-icon.png', 1.0),
        ('icon.svg', 512, 'icon-maskable-512.png', 0.8), ('icon-small.svg', 64, 'favicon-64.png', 1.0)]
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True)
    for src, px, name, k in jobs:
        pg = b.new_page(viewport={'width': px, 'height': px})
        svg = (SRC / src).read_text(encoding='utf-8')
        pg.set_content(f'<html><body style="margin:0;background:#17191b;display:flex;align-items:center;justify-content:center;width:{px}px;height:{px}px">'
                       f'<div style="width:{px * k}px;height:{px * k}px">{svg.replace("<svg ", "<svg width=\"100%\" height=\"100%\" ", 1)}</div></body></html>')
        pg.wait_for_timeout(150)
        pg.screenshot(path=str(OUT / name))
        pg.close()
    b.close()
print('ok')
