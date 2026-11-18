"""Every map's airfields: anything standing on the runway, the tower or the hangars (walls, fences, wrecks …)?

  py -I tools/airfield_check.py http://localhost:5173 [mapId,mapId|all]

Per airfield: its side, where, how many colliders (trees excluded: the runway clears them) on the strip and
by the tower, the ground's rise along the strip, water under it. 0 / 0 is what every map should show.
"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ONLY = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != 'all' else None

CHECK = """() => {
  const A = game.airfields;
  if (!A) return 'no airfields';
  const T = game.terrain, level = game.world.river?.level ?? -Infinity;
  const stand = (game.cover?.colliders ?? []).filter((c) => !c.tree && !c.airfield); // (the airfield's own tower and hangars aside)
  return (A.list ?? []).map((a) => {
    const s = A.strip(a);
    const along = (c) => (c.x - s.cx) * s.fx + (c.z - s.cz) * s.fz, across = (c) => (c.x - s.cx) * s.fz - (c.z - s.cz) * s.fx;
    const onStrip = stand.filter((c) => Math.abs(along(c)) < s.len / 2 + c.r && Math.abs(across(c)) < s.width / 2 + c.r);
    const byTower = stand.filter((c) => Math.abs((c.x - a.x) * s.fx + (c.z - a.z) * s.fz) < 60 + c.r && Math.abs((c.x - a.x) * s.fz - (c.z - a.z) * s.fx) < 16 + c.r);
    let lo = Infinity, hi = -Infinity, wet = 0;
    for (let k = -s.len / 2; k <= s.len / 2; k += 10) for (const w of [-s.width / 2, 0, s.width / 2]) {
      const x = s.cx + s.fx * k + s.fz * w, z = s.cz + s.fz * k - s.fx * w, h = T.heightAt(x, z);
      lo = Math.min(lo, h); hi = Math.max(hi, h); if (h < level + 0.5) wet++;
    }
    return `${a.faction} at ${Math.round(a.x)},${Math.round(a.z)}: strip ${onStrip.length} tower ${byTower.length} rise ${(hi - lo).toFixed(1)} m wet ${wet}`;
  }).join(' | ');
}"""

with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True, args=['--use-angle=d3d11'])
    pg = b.new_page(); pg.goto(URL + '/'); pg.wait_for_timeout(3000)
    info = pg.evaluate("async (ids) => { const m = await import('/src/maps/index.js'); return (ids ?? Object.keys(m.MAPS).filter((k) => !m.MAPS[k].wip && m.MAPS[k].theatre !== 'sea')).map((id) => [id, (m.MAPS[id].epochs || ['1985'])[0], (m.MAPS[id].modes || ['frontline'])[0]]); }", ONLY.split(',') if ONLY else None)
    pg.close()
    bad = 0
    for id, ep, mode in info:
        pg = b.new_page(viewport={'width': 800, 'height': 500})
        pg.add_init_script("try{const s=JSON.parse(localStorage.getItem('coldsteel.settings')||'{}');s.quality='low';s.epoch='%s';localStorage.setItem('coldsteel.settings',JSON.stringify(s))}catch(e){}" % ep)
        try:
            pg.goto(f'{URL}/?mode={mode}&map={id}&epoch={ep}&side=nato&time=day&weather=clear', timeout=180000)
            pg.wait_for_function("window.game && !document.getElementById('loading')", timeout=400000, polling=2000)
            r = pg.evaluate(CHECK)
            flag = any(seg.split('strip ')[1].split(' ')[0] != '0' or seg.split('tower ')[1].split(' ')[0] != '0' or ' wet 0' not in seg for seg in r.split(' | ') if 'strip' in seg)
            bad += bool(flag)
            print(('BAD ' if flag else 'ok  ') + id, r, flush=True)
        except Exception as e:
            print('FAIL', id, str(e)[:120], flush=True)
        pg.close()
    b.close()
    print(bad, 'maps with something on an airfield')
