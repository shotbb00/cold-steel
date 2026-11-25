"""Which maps are near-copies of each other (same river, same hills, same points)?

  py -I tools/map_similarity.py http://localhost:5173 [threshold=0.8] [theatre=all]

Samples every registered map on a 24 x 28 grid across its bounds (so different sizes compare): the height (z-scored),
the water (height below the river/sea level) and its control points (in the same unit square). Every pair in the same
theatre is compared in all four orientations (as is, x mirrored, z mirrored, both: a map turned round is still the
same map) and the best orientation counts:
  terrain   correlation of the z-scored heights (1.0 = the same ground)
  water     overlap of the water masks (intersection / union; 1.0 = the same river in the same bed)
  points    mean distance from each point to the other map's nearest point, in % of the map width (0 = same layout)
  score     0.5 * terrain + 0.3 * water + 0.2 * (1 - points/25) — a pair above the threshold is listed
Prints the pairs, worst first, and writes tools/map_similarity.json.
"""
import sys, json
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5173'
TH = float(sys.argv[2]) if len(sys.argv) > 2 else 0.8
ONLY = sys.argv[3] if len(sys.argv) > 3 else 'all'

SAMPLE = """async () => {
  const M = await import('/src/maps/index.js');
  const NX = 24, NZ = 28, out = [];
  for (const m of Object.values(M.MAPS)) {
    if (m.wip || typeof m.height !== 'function') continue;
    const bx = m.bounds?.x ?? 500, bz = m.bounds?.z ?? 560;
    const lvl = (m.river?.level ?? 0) + 0.3;
    const h = [], w = [];
    try {
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
        const x = -bx + (2 * bx * (i + 0.5)) / NX, z = -bz + (2 * bz * (j + 0.5)) / NZ;
        const v = m.height(x, z); h.push(Number.isFinite(v) ? v : 0); w.push(v < lvl ? 1 : 0);
      }
    } catch (e) { out.push({ id: m.id, err: String(e).slice(0, 80) }); continue; }
    const pts = (m.points ?? []).map((p) => [p.x / bx, p.z / bz]);
    out.push({ id: m.id, name: m.name, theatre: m.theatre ?? 'land', epochs: m.epochs ?? (m.epoch ? [m.epoch] : []), region: m.region ?? '', h, w, pts });
  }
  return out;
}"""

def zs(a):
    n = len(a); mu = sum(a) / n; sd = (sum((x - mu) ** 2 for x in a) / n) ** 0.5 or 1
    return [(x - mu) / sd for x in a]

NX, NZ = 24, 28
def orient(grid, fx, fz):
    return [grid[(NZ - 1 - j if fz else j) * NX + (NX - 1 - i if fx else i)] for j in range(NZ) for i in range(NX)]

def compare(a, b):
    best = None
    for fx in (0, 1):
        for fz in (0, 1):
            hb, wb = orient(b['zh'], fx, fz), orient(b['w'], fx, fz)
            r = sum(x * y for x, y in zip(a['zh'], hb)) / len(hb)
            inter = sum(1 for x, y in zip(a['w'], wb) if x and y); union = sum(1 for x, y in zip(a['w'], wb) if x or y)
            water = inter / union if union else (1.0 if not any(a['w']) and not any(wb) else 0.0)
            pb = [((-x if fx else x), (-z if fz else z)) for x, z in b['pts']]
            if a['pts'] and pb:
                d1 = sum(min(((x - u) ** 2 + (z - v) ** 2) ** 0.5 for u, v in pb) for x, z in a['pts']) / len(a['pts'])
                d2 = sum(min(((x - u) ** 2 + (z - v) ** 2) ** 0.5 for u, v in a['pts']) for x, z in pb) / len(pb)
                pd = (d1 + d2) / 2 * 50  # (unit square half-width 1 = 50 % of the map width)
            else:
                pd = 25
            score = 0.5 * r + 0.3 * water + 0.2 * max(0, 1 - pd / 25)
            if best is None or score > best[0]:
                best = (score, r, water, pd, fx, fz)
    return best

with sync_playwright() as p:
    br = p.chromium.launch(channel='msedge', headless=True)
    pg = br.new_page()
    pg.goto(URL + '/', timeout=600000)
    pg.wait_for_timeout(3000)
    maps = pg.evaluate(SAMPLE)
    br.close()

bad = [m for m in maps if 'err' in m]
maps = [m for m in maps if 'err' not in m and (ONLY == 'all' or m['theatre'] == ONLY)]
for m in maps:
    m['zh'] = zs(m['h'])
pairs = []
for i, a in enumerate(maps):
    for b in maps[i + 1:]:
        if a['theatre'] != b['theatre']:
            continue
        s, r, water, pd, fx, fz = compare(a, b)
        if s >= TH:
            pairs.append({'a': a['id'], 'b': b['id'], 'score': round(s, 3), 'terrain': round(r, 2), 'water': round(water, 2), 'points': round(pd, 1),
                          'flip': ('x' if fx else '') + ('z' if fz else ''), 'theatre': a['theatre'], 'ea': a['epochs'], 'eb': b['epochs']})
pairs.sort(key=lambda q: -q['score'])
for q in pairs:
    print(f"{q['score']:.3f}  {q['a']:24s} {q['b']:24s} terrain {q['terrain']:5.2f} water {q['water']:4.2f} points {q['points']:5.1f}%  {q['theatre']} {'/'.join(q['ea'])}|{'/'.join(q['eb'])} {q['flip']}")
print(f'{len(maps)} maps, {len(pairs)} pairs at or above {TH}; sampling errors: {[m["id"] for m in bad]}')
json.dump(pairs, open('tools/map_similarity.json', 'w'), indent=1)
