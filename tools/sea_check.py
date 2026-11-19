"""Every sea map: does any ship start aground, and did core/GameEngine.js seaward have to move a home or a spawn?

  py -I tools/sea_check.py http://localhost:5173 [mapId,mapId|all]

Per map: ships, how many stand in water shallower than 3 m, and the console's "ashore" warnings (a map that sets
its homes or spawns on land after maps/index.js widenSea — fix the map, the guard is only a safety net).
"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ONLY = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != 'all' else None
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True, args=['--use-angle=d3d11'])
    pg = b.new_page(); pg.goto(URL + '/'); pg.wait_for_timeout(3000)
    info = pg.evaluate("async (ids) => { const m = await import('/src/maps/index.js'); return (ids ?? Object.keys(m.MAPS).filter((k) => !m.MAPS[k].wip && m.MAPS[k].theatre === 'sea')).map((id) => [id, (m.MAPS[id].epochs || ['1985'])[0], (m.MAPS[id].modes || ['frontline'])[0]]); }", ONLY.split(',') if ONLY else None)
    pg.close()
    bad = 0
    for id, ep, mode in info:
        pg = b.new_page(viewport={'width': 800, 'height': 500})
        warns, errs = [], []
        pg.on('console', lambda m: warns.append(m.text) if 'ashore' in m.text else None)
        pg.on('pageerror', lambda e: errs.append(str(e)[:120]))
        pg.add_init_script("try{const s=JSON.parse(localStorage.getItem('coldsteel.settings')||'{}');s.quality='low';s.epoch='%s';localStorage.setItem('coldsteel.settings',JSON.stringify(s))}catch(e){}" % ep)
        try:
            pg.goto(f'{URL}/?mode={mode}&map={id}&epoch={ep}&side=nato&time=day&weather=clear', timeout=180000)
            pg.wait_for_function("window.game && !document.getElementById('loading')", timeout=400000, polling=2000)
            n, dry = pg.evaluate("() => { const level = game.map.river?.level ?? 0; const ships = game.world.stacks.filter((s) => s.stats.naval); return [ships.length, ships.filter((s) => level - game.terrain.heightAt(s.centroid.x, s.centroid.z) < 3).map((s) => s.name)]; }")
            flag = bool(dry or warns or errs)
            bad += flag
            print(('BAD ' if flag else 'ok  ') + f'{id}: {n} ships, aground {dry or 0}', warns[:2], errs[:2], flush=True)
        except Exception as e:
            print('FAIL', id, str(e)[:120], flush=True)
        pg.close()
    b.close()
    print(bad, 'sea maps with a problem')
