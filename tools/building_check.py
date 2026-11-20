"""Every map's buildings: does any stand inside another (a church built into a house)?

  py -I tools/building_check.py http://localhost:5173 [mapId,mapId|all]

Footprints (world/Props.js beginBuilding: x, z, yaw, w, d) tested pairwise as oriented rectangles (separating axes),
each shrunk by 0.3 m so buildings wall to wall in a terrace don't count. Prints each overlap with both names and where.
"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
ONLY = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != 'all' else None

CHECK = """() => {
  const all = game.decor?.buildings ?? [], B = all.filter((b) => !b.removed).map((b) => ({ b, c: Math.cos(b.yaw), s: Math.sin(b.yaw), hw: b.w / 2 - 0.3, hd: b.d / 2 - 0.3 }));
  const axes = (o) => [[o.c, -o.s], [o.s, o.c]]; // (Props.local: local x → (cos, -sin), local z → (sin, cos))
  const proj = (o, ax) => Math.abs(o.hw * (o.c * ax[0] - o.s * ax[1])) + Math.abs(o.hd * (o.s * ax[0] + o.c * ax[1]));
  const out = [];
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
    const a = B[i], b = B[j], dx = b.b.x - a.b.x, dz = b.b.z - a.b.z;
    if (Math.hypot(dx, dz) > Math.hypot(a.hw, a.hd) + Math.hypot(b.hw, b.hd)) continue;
    if ([...axes(a), ...axes(b)].every((ax) => Math.abs(dx * ax[0] + dz * ax[1]) < proj(a, ax) + proj(b, ax))) out.push(`${a.b.name} × ${b.b.name} at ${Math.round((a.b.x + b.b.x) / 2)},${Math.round((a.b.z + b.b.z) / 2)}`);
  }
  return { n: B.length, removed: all.length - B.length, overlaps: out };
}"""

with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True, args=['--use-angle=d3d11'])
    pg = b.new_page(); pg.goto(URL + '/'); pg.wait_for_timeout(3000)
    info = pg.evaluate("async (ids) => { const m = await import('/src/maps/index.js'); return (ids?.filter((k) => m.MAPS[k]) ?? Object.keys(m.MAPS).filter((k) => !m.MAPS[k].wip && m.MAPS[k].theatre !== 'sea')).map((id) => [id, (m.MAPS[id].epochs || ['1985'])[0], (m.MAPS[id].modes || ['frontline'])[0]]); }", ONLY.split(',') if ONLY else None)
    pg.close()
    bad = 0
    for id, ep, mode in info:
        pg = b.new_page(viewport={'width': 800, 'height': 500})
        pg.add_init_script("try{const s=JSON.parse(localStorage.getItem('coldsteel.settings')||'{}');s.quality='low';s.epoch='%s';localStorage.setItem('coldsteel.settings',JSON.stringify(s))}catch(e){}" % ep)
        try:
            pg.goto(f'{URL}/?mode={mode}&map={id}&epoch={ep}&side=nato&time=day&weather=clear', timeout=180000)
            pg.wait_for_function("window.game && !document.getElementById('loading')", timeout=400000, polling=2000)
            r = pg.evaluate(CHECK)
            bad += bool(r['overlaps'])
            print(('BAD ' if r['overlaps'] else 'ok  ') + f"{id} ({ep}) {r['n']} buildings, {r['removed']} taken out", ' | '.join(r['overlaps']), flush=True)
        except Exception as e:
            print('FAIL', id, str(e)[:120], flush=True)
        pg.close()
    b.close()
    print(bad, 'maps with a building inside another')
