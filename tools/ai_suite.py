"""
Does the AI go for your points? Runs Frontline battles with the bot against a side that only
holds, and for each assault logs what the group was made of, how many men reached the point
and whether it fell. Needs the dev server (npx vite --port 5173).

  py -I tools/ai_suite.py [map] [minutes] [defenders] [mode]
    defenders 0: only what the mode gives the player  ·  12: a line of squads and tanks on its points
"""
import json, sys
from playwright.sync_api import sync_playwright

MAP = sys.argv[1] if len(sys.argv) > 1 else 'fulda-gap'
MINUTES = int(sys.argv[2]) if len(sys.argv) > 2 else 15
DEFENDERS = int(sys.argv[3]) if len(sys.argv) > 3 else 12
MODE = sys.argv[4] if len(sys.argv) > 4 else 'frontline'

SETUP = r"""(defenders) => { const g = game; g.renderer.setAnimationLoop(null); g.end = () => {};
  const d = window.__d = g.systems.find((s) => s.constructor.name === 'FrontlineDirector');
  const me = g.playerFaction;
  // the defenders: spread over the points nearest the player's base, holding
  const base = g.world.bases[me];
  const pts = [...d.points].sort((a, b) => Math.hypot(a.x - base.x, a.z - base.z) - Math.hypot(b.x - base.x, b.z - base.z));
  const kinds = ['rifles', 'rifles', 'mgTeam', 'rifles', 'tank', 'atTeam'];
  for (let i = 0; i < defenders; i++) {
    const p = pts[i % Math.min(5, pts.length)];
    const s = g.spawnStack(kinds[i % kinds.length], me, { x: p.x + (i % 3 - 1) * 12, z: p.z + (i % 2 ? 8 : -8) }, 0);
    s.ai.defend();
  }
  // give them the points they stand on: a front to attack
  for (const p of pts.slice(0, Math.min(5, pts.length))) if (defenders && !p.owner) { p.owner = me; p.progress = 1; d.state.points.paint?.(p); }
  const L = window.__L = { ops: [], caps: [], samples: [] };
  const inf = (s) => s.usesCover;
  const rec = new Map();
  const op1 = (op) => { let r = rec.get(op); if (!r) { r = { target: op.plan.target.name, t0: Math.round(d.now), group: op.plan.group.map((s) => s.type.id).join(' '), squads: op.plan.group.filter(inf).length, peakOn: 0, secOn: 0, secContested: 0 }; rec.set(op, r); L.ops.push(r); } return r; };
  const sp = d.setPhase.bind(d); d.setPhase = (op, ph) => { (op1(op).phases ??= []).push(`${ph}@${Math.round(d.now)}`); sp(op, ph); };
  const eo = d.endOp.bind(d); d.endOp = (op) => { const r = op1(op); r.end = Math.round(d.now); r.took = op.plan.target.owner === d.faction; r.waves = op.plan.group.length; r.left = op.plan.group.filter((s) => s.alive).length; r.recovering = op.plan.group.filter((s) => s.alive && d.roles.get(s)?.role === 'recover').length; eo(op); };
  window.__was = new Map(d.points.map((p) => [p, p.owner]));
  g.bus.on('point:captured', ({ point, owner }) => { L.caps.push([Math.round(d.now), point.name, owner === d.faction ? 'AI' : 'player', __lost.has(point) || __was.get(point) === me ? 'from player' : 'neutral']); __was.set(point, owner); });
  window.__lost = new Set();
  window.__tick = () => {
    for (const p of d.points) if (p.owner === me) __lost.add(p); else if (p.owner) __lost.delete(p);
    for (const op of d.ops) {
      const r = op1(op); if (op.phase !== 'assault') continue; const t = op.plan.target;
      const on = op.plan.group.filter((s) => s.alive && inf(s)).reduce((a, s) => a + s.units.filter((u) => u.alive && Math.hypot(u.pos.x - t.x, u.pos.z - t.z) < t.radius).length, 0);
      r.peakOn = Math.max(r.peakOn, on); if (on) { r.secOn += 5; if (t.contested) r.secContested += 5; }
    }
    const mine = d.myStacks(); const by = {};
    for (const [s, r] of d.roles) if (s.alive) { const k = `${r.role}${inf(s) ? ':inf' : ''}`; by[k] = (by[k] ?? 0) + 1; }
    L.samples.push({ t: Math.round(d.now), stacks: mine.length, inf: mine.filter(inf).length, roles: by, pointsAI: d.points.filter((p) => p.owner === d.faction).length, pointsPlayer: d.points.filter((p) => p.owner === me).length, foes: g.world.stacksOf(me).length });
  };
  return { ai: d.faction, points: d.points.length }; }"""
STEP = "() => { for (let i = 0; i < 150; i++) game.step(1 / 30); __tick(); }"

with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 640, "height": 400})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f"http://localhost:5173/?mode={MODE}&map={MAP}&side=nato&time=day&weather=overcast", timeout=300000)
    pg.wait_for_function("window.game && !document.getElementById('loading')", timeout=300000)
    print(pg.evaluate(SETUP, DEFENDERS), flush=True)
    for i in range(MINUTES * 12):
        pg.evaluate(STEP)
    L = pg.evaluate("__L")
    for s in L['samples'][::24]:
        print(json.dumps(s))
    print('captures', L['caps'])
    for r in L['ops']:
        print(json.dumps(r))
    first = next((r['t0'] for r in L['ops'] if r['squads']), None)
    print(f"SUMMARY first assault with squads at {first} s · assaults {len(L['ops'])}, with squads {sum(1 for r in L['ops'] if r['squads'])}, reached the point {sum(1 for r in L['ops'] if r['peakOn'])}, took it {sum(1 for r in L['ops'] if r.get('took'))} · taken from the player {sum(1 for c in L['caps'] if c[2] == 'AI' and c[3] == 'from player')} · errors {errs[:3]}")
    b.close()
