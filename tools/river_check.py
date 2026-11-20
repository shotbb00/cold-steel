"""Can anyone get over a river where there is no crossing? (land and coastal maps with a river; not the sea)

  py -I tools/river_check.py http://localhost:5173 [mapId|all] [epoch]

Walks along each channel of the map's river every 4 m and, across it, finds the deepest water on the real terrain
mesh (what units and the routes see: world/Nav.js, UnitStack.moveBody). Where even the deepest point is shallower
than `water.deep` (anyone wades it), and no ford or bridge is there, the river leaks: it prints those stretches.
Every line should read `ok`.
"""
import sys, json
from playwright.sync_api import sync_playwright

URL = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5173').rstrip('/')
ONLY = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != 'all' else None
EP = sys.argv[3] if len(sys.argv) > 3 else None

CHECK = """() => {
  const g = game, r = g.world.river, t = g.terrain;
  if (!r || r.sea || !r.channels) return { none: true };
  const deep = r.water.deep, out = [];
  const near = (x, z) => r.crossings.some((c) => !c.blown && Math.hypot(x - c.x, z - c.z) < (c.width ?? 8) / 2 + r.halfWidth + 6);
  r.channels.forEach((_, ci) => {
    const pts = r.course(ci, 4); let run = null;
    for (const [x, z, nx, nz] of pts) {
      if (Math.abs(x) > g.map.bounds.x + 20 || Math.abs(z) > g.map.bounds.z + 20) { if (run) { out.push(run); run = null; } continue; }
      let best = -1e9;
      for (let s = -r.halfWidth * 1.4; s <= r.halfWidth * 1.4; s += 1) best = Math.max(best, r.level - t.heightAt(x + nx * s, z + nz * s));
      const leak = best <= deep && !near(x, z);
      if (leak) { run ??= { channel: ci, from: [Math.round(x), Math.round(z)], depth: best }; run.to = [Math.round(x), Math.round(z)]; run.depth = Math.min(run.depth, best); }
      else if (run) { out.push(run); run = null; }
    }
    if (run) out.push(run);
  });
  return { leaks: out.map((l) => ({ ...l, depth: +l.depth.toFixed(2) })) };
}"""

with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True, args=['--use-angle=d3d11'])
    pg = b.new_page(viewport={'width': 800, 'height': 500})
    pg.goto(URL + '/?epoch=1985', timeout=180000)
    pg.wait_for_selector('.menu-nav', timeout=180000)
    maps = pg.evaluate("""async () => { const u = performance.getEntriesByType('resource').map((e) => e.name).find((x) => x.includes('/src/maps/index.js'));
      const M = await import(u); return Object.values(M.MAPS).filter((m) => m.river && !m.river.sea && m.river.channels && !m.wip).map((m) => [m.id, (m.epochs ?? ['1985'])[0]]); }""")
    if ONLY: maps = [[ONLY, EP or next((e for i, e in maps if i == ONLY), '1985')]]
    bad = 0
    for mid, ep in maps:
        pg.goto(f'{URL}/?mode=frontline&map={mid}&epoch={ep}&side=nato&time=day', timeout=300000)
        pg.wait_for_function("window.game && !document.getElementById('loading')", timeout=400000, polling=1000)
        r = pg.evaluate(CHECK)
        if r.get('none'): print('--  ', mid, 'no river'); continue
        if r['leaks']: bad += 1; print('LEAK', mid, json.dumps(r['leaks']))
        else: print('ok  ', mid, flush=True)
    print(bad, 'maps where a river can be waded without a crossing')
    b.close()
