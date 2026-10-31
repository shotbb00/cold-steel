"""
Movement regression suite: walled-in traps, villages, garrisons, river crossings (bridges standing,
blown, laid) and an AI-vs-AI battle. Needs the dev server (npx vite --port 5173) and Playwright + Edge.

  py -I tools/nav_suite.py            all pages
  py -I tools/nav_suite.py rivers ai  just those

Per scenario: seconds until every stack has arrived (all men at their spots), or STUCK n/m (men
still away after the time limit). `stuck` is the unit-seconds spent wanting to move while getting
less than 1 m in 10 s, summed over every unit in the page.
"""
import json, sys, time
from playwright.sync_api import sync_playwright

URL = 'http://localhost:5173/?mode=frontline&map={map}&side=nato'

# runs in the page: helpers, then the page's scenarios; returns {scenario: result, stuck: n}
COMMON = '''
const g = game; g.renderer.setAnimationLoop(null);
g.visibility.enabled = false;
if (!AI) g.systems = g.systems.filter((s) => s.constructor.name !== 'FrontlineDirector'); // nobody attacks
const W = g.world, B = W.bases, dir = Math.sign(B.pact.z - B.nato.z) || 1;
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const groups = {};       // scenario -> [{ s, t }]
const add = (name, s) => (groups[name] ??= []).push({ s, t: null });
const spawn = (id, x, z, faction = 'nato') => g.spawnStack(id, faction, { x, y: 0, z }, dir > 0 ? 0 : Math.PI, id + Math.round(rnd() * 1e4));
const move = (s, x, z) => g.orders.run(s.faction, { t: 'move', m: [[s.id, x, z]] });
const alive = (s) => s.units.filter((u) => u.alive);
const away = (s) => alive(s).filter((u) => Math.hypot(u.pos.x - u.dest.x, u.pos.z - u.dest.z) >= 5);
'''

RUN = '''
const hist = new Map(); let stuck = 0;
const t0 = performance.now();
for (let k = 0; k < 30 * SECONDS; k++) {
  g.step(1 / 30);
  if (k % 30) continue;
  const now = k / 30;
  for (const [name, list] of Object.entries(groups)) for (const r of list) {
    if (r.t == null && r.s.alive && !r.s.moveTarget && !away(r.s).length && (!r.done || r.done())) r.t = now;
  }
  for (const s of W.stacks) for (const u of s.units) {
    if (!u.alive || s.faction == null) continue;
    let h = hist.get(u); if (!h) hist.set(u, (h = []));
    h.push({ x: u.pos.x, z: u.pos.z });
    if (h.length > 11) h.shift();
    if (u.wantsMove && h.length === 11 && Math.hypot(h[0].x - u.pos.x, h[0].z - u.pos.z) < 1) stuck++;
  }
}
const out = { stuck, ms: Math.round(performance.now() - t0) };
for (const [name, list] of Object.entries(groups)) out[name] = list.map((r) => r.t != null ? Math.round(r.t) : !r.s.alive ? 'dead' : 'STUCK ' + away(r.s).length + '/' + alive(r.s).length + (r.s.moveTarget ? ' mt' : '')).join(' ');
return out;
'''

PAGES = {
    # walled-in box (too high to climb), a village crossed through its buildings, garrisons
    'fulda': ('fulda-gap', 150, False, '''
const ox = B.nato.x + 30, oz = B.nato.z + dir * 40, c = g.cover;
c.addBox({ x: ox, z: oz + dir * 8, yaw: 0, length: 24, thickness: 0.6, height: 2.5, spots: false });
c.addBox({ x: ox - 12, z: oz + dir * 1, yaw: Math.PI / 2, length: 14, thickness: 0.6, height: 2.5, spots: false });
c.addBox({ x: ox + 12, z: oz + dir * 1, yaw: Math.PI / 2, length: 14, thickness: 0.6, height: 2.5, spots: false });
for (const [id, dx] of [['rifles', -4], ['tank', 4]]) { const s = spawn(id, ox + dx, oz); move(s, ox, oz + dir * 70); add('box', s); }
const near = (b) => Math.hypot(b.x - B.nato.x, b.z - B.nato.z) < Math.hypot(b.x - B.pact.x, b.z - B.pact.z) * 0.7;
const bl = g.buildings.list.filter((b) => !b.collapsed && near(b));
for (let n = 0; n < 9; n++) {
  const b = bl[Math.floor(rnd() * bl.length)], a = rnd() * 6.28;
  const s = spawn(n % 3 === 2 ? 'tank' : 'rifles', b.x + Math.sin(a) * 14, b.z + Math.cos(a) * 14);
  move(s, b.x - Math.sin(a) * 45, b.z - Math.cos(a) * 45); add('village', s);
}
for (let n = 0; n < 2; n++) {
  const b = bl[Math.floor(rnd() * bl.length)], a = rnd() * 6.28;
  const s = spawn('rifles', b.x + Math.sin(a) * 40, b.z + Math.cos(a) * 40);
  g.buildings.garrison(s, b); add('garrison', s); groups.garrison.at(-1).done = () => s.entered === b;
}
'''),
    # over both rivers by the bridges; then with the nearest bridge blown
    'rivers': ('haune-fulda', 240, False, '''
const R = W.river;
const far = (x) => Math.max(...R.channels.map((p) => p(x) * dir)) * dir + dir * 45;
const xs = [-120, 0, 120];
for (const [i, id] of ['rifles', 'tank', 'ambulance'].entries()) {
  const x = xs[i], s = spawn(id, x, B.nato.z + dir * 30); move(s, x + 20, far(x + 20)); add('cross', s);
}
const first = R.crossings.filter((c) => !c.blown).sort((a, b) => Math.abs(a.x - 60) - Math.abs(b.x - 60))[0];
g.blowBridge(first);
for (const id of ['rifles', 'tank']) { const s = spawn(id, first.x + (id === 'tank' ? 8 : -8), B.nato.z + dir * 30); move(s, first.x, far(first.x)); add('blown', s); }
'''),
    # every bridge down, one laid by the engineers: everyone over that one
    'laid': ('werra-valley', 200, False, '''
const R = W.river;
for (const c of [...R.crossings]) g.blowBridge(c);
g.layBridge(40, R.path(40));
const far = R.path(40) + dir * 50;
for (const [id, dx] of [['rifles', -30], ['tank', 10], ['ambulance', 50]]) { const s = spawn(id, 40 + dx, R.path(40) - dir * 70); move(s, 40 + dx / 2, far); add('laid', s); }
'''),
    # a battle with the AI on both sides: only the stuck count matters
    'ai': ('fulda-gap', 300, True, '''
const { FrontlineDirector } = await import('/src/ai/FrontlineDirector.js');
g.modeState.cp.nato = g.modeState.cp.pact = 3000;
g.systems.push(new FrontlineDirector(g, 'nato', g.modeState, { tempo: 1 }));
'''),
}


def run(page, name):
    mp, seconds, ai, body = PAGES[name]
    page.goto(URL.format(map=mp))
    page.wait_for_function("window.game && !document.getElementById('loading')", timeout=300000)
    js = 'async () => {' + f'const AI = {str(ai).lower()}, SECONDS = {seconds};' + COMMON + body + RUN + '}'
    return page.evaluate(js)


if __name__ == '__main__':
    names = sys.argv[1:] or list(PAGES)
    with sync_playwright() as p:
        b = p.chromium.launch(channel='msedge', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        for name in names:
            page = b.new_context(viewport={'width': 800, 'height': 600}).new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)[:300]))
            t = time.time()
            res = run(page, name)
            print(name, json.dumps(res), f'({time.time() - t:.0f} s)', ('ERRORS ' + ' | '.join(errs[:3])) if errs else '', flush=True)
            page.context.close()
        b.close()
