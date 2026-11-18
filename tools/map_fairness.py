"""How fair and how mirrored a battle map is (land and sea; coastal maps are scenarios and lopsided on purpose).

  py -I tools/map_fairness.py http://localhost:5173 <mapId> [<epoch>]

Loads the map and measures, for the two sides (nato's base, pact's base):
  points      each neutral point's distance from both bases; `lead` = how much nearer nato is (m, + favours nato)
  sum lead    over all neutral points (fair: |sum| small against the map, say < 60 m; and no point with |lead| > ~150 m
              that the other side has no answer to)
  sorted      each side's distances to the points it is nearer to — the two lists should look alike
  high        the highest ground within 250 m of each base's front, and the share of the map's top-10 % heights on
              each half (fair: within ~10 points of 50 %)
  mirror      how much the map is its own point-mirror: terrain r (correlation of h(x,z) with h(-x,-z); 1.0 = an
              exact mirror) and points (mean m from each point to the nearest mirrored point; 0 = exact). The game
              wants fair but NOT visibly mirrored: terrain r below ~0.85, points well above 15 m.
"""
import sys, json
from playwright.sync_api import sync_playwright

URL, MAP = sys.argv[1], sys.argv[2]
EP = sys.argv[3] if len(sys.argv) > 3 else None

MEASURE = """() => {
  const m = game.map, t = game.terrain, B = m.bases;
  const bx = m.bounds?.x ?? 500, bz = m.bounds?.z ?? 560;
  const nato = B.nato, pact = B.pact;
  const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const neutral = m.points.filter((p) => !p.owner);
  const pts = neutral.map((p) => ({ id: p.id, name: p.name, toNato: Math.round(d(p, nato)), toPact: Math.round(d(p, pact)), lead: Math.round(d(p, pact) - d(p, nato)), h: +t.heightAt(p.x, p.z).toFixed(1) }));
  const sum = pts.reduce((a, p) => a + p.lead, 0);
  const near = (f) => pts.filter((p) => (f === 'nato' ? p.lead > 0 : p.lead < 0)).map((p) => (f === 'nato' ? p.toNato : p.toPact)).sort((a, b) => a - b);
  const hs = []; const step = 10;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, n = 0;
  for (let x = -bx; x <= bx; x += step) for (let z = -bz; z <= bz; z += step) {
    const a = t.heightAt(x, z), b = t.heightAt(-x, -z);
    hs.push([a, x, z]); sx += a; sy += b; sxx += a * a; syy += b * b; sxy += a * b; n++;
  }
  const r = (n * sxy - sx * sy) / Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  hs.sort((a, b) => b[0] - a[0]);
  const top = hs.slice(0, Math.max(1, Math.round(hs.length * 0.1)));
  const half = (x, z) => (Math.hypot(x - nato.x, z - nato.z) < Math.hypot(x - pact.x, z - pact.z) ? 'nato' : 'pact');
  const topNato = top.filter(([, x, z]) => half(x, z) === 'nato').length / top.length;
  const front = (b, o) => { const ux = (o.x - b.x), uz = (o.z - b.z), L = Math.hypot(ux, uz); let best = -1e9;
    for (let s = 60; s <= 250; s += 10) for (let w = -200; w <= 200; w += 10) { const x = b.x + ux / L * s - uz / L * w, z = b.z + uz / L * s + ux / L * w; best = Math.max(best, t.heightAt(x, z)); } return +best.toFixed(1); };
  const mirrorPts = m.points.map((p) => Math.min(...m.points.map((q) => Math.hypot(p.x + q.x, p.z + q.z)))).reduce((a, v) => a + v, 0) / m.points.length;
  return { map: m.id, points: pts, sumLead: Math.round(sum), sortedNato: near('nato'), sortedPact: near('pact'),
    highFront: { nato: front(nato, pact), pact: front(pact, nato) }, topHeightShareNato: +topNato.toFixed(2),
    mirror: { terrainR: +r.toFixed(3), pointsM: Math.round(mirrorPts) } };
}"""

with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True, args=['--use-angle=d3d11'])
    pg = b.new_page(viewport={'width': 1280, 'height': 800})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    if EP:
        pg.add_init_script("try{const s=JSON.parse(localStorage.getItem('coldsteel.settings')||'{}');s.quality='low';s.epoch='%s';localStorage.setItem('coldsteel.settings',JSON.stringify(s))}catch(e){}" % EP)
    pg.goto(f'{URL}/?mode=frontline&map={MAP}' + (f'&epoch={EP}' if EP else '') + '&side=nato&time=day&weather=clear', timeout=180000)
    pg.wait_for_function("window.game && !document.getElementById('loading')", timeout=400000, polling=2000)
    r = pg.evaluate(MEASURE)
    b.close()
print(json.dumps(r, indent=1, ensure_ascii=False))
if errs: print('page errors:', errs[:3])
