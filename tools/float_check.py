"""
Floating-part check: builds every vehicle model (each side and each army with a model of its
own), splits it into its separate pieces (triangles sharing a corner), and reports the pieces
that touch nothing else — boxes hanging in the air, antennas above the roof, blades in front of
the hull. Pieces closer than TOL m count as touching. Needs the dev server (npx vite --port 5173).

  py -I tools/float_check.py [unit ...]
"""
import json, sys
from playwright.sync_api import sync_playwright

JS = r'''async ({ only, tol }) => {
  const THREE = await import('/node_modules/three/build/three.module.js');
  const { UNIT_TYPES } = await import('/src/data/units/index.js');
  const mats = { body: new THREE.MeshBasicMaterial(), glow: new THREE.MeshBasicMaterial() };
  const v = new THREE.Vector3();
  const out = [];
  /** World-space boxes of the connected pieces of one mesh (instances each their own). */
  const pieces = (mesh) => {
    const g = mesh.geometry, p = g.attributes.position;
    const idx = g.index ? g.index.array : null;
    const n = idx ? idx.length : p.count;
    const parent = new Int32Array(p.count).map((_, i) => i);
    const find = (i) => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
    const join = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
    for (let t = 0; t < n; t += 3) { const a = idx ? idx[t] : t, b = idx ? idx[t + 1] : t + 1, c = idx ? idx[t + 2] : t + 2; join(a, b); join(b, c); }
    // corners at the same place belong together (separate triangles of one part)
    const seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = `${Math.round(p.getX(i) * 1000)},${Math.round(p.getY(i) * 1000)},${Math.round(p.getZ(i) * 1000)}`;
      const o = seen.get(k); if (o === undefined) seen.set(k, i); else join(i, o);
    }
    const boxes = new Map();
    const mats4 = mesh.isInstancedMesh ? Array.from({ length: mesh.count }, (_, i) => { const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m); return m.premultiply(mesh.matrixWorld); }) : [mesh.matrixWorld];
    mats4.forEach((M, inst) => {
      for (let i = 0; i < p.count; i++) {
        const key = `${inst}:${find(i)}`;
        let b = boxes.get(key); if (!b) boxes.set(key, (b = new THREE.Box3()));
        b.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(M));
      }
    });
    return [...boxes.values()];
  };
  // every vehicle model per key, and (as 'air:<kind>') every aircraft per side and army (data/air.ts)
  globalThis.__all = only.includes('all');
  const builds = [];
  // both wars (data/epoch.js): the 1945 types and aircraft as '45:<id>'
  const { TYPES_1945 } = await import('/src/data/units45/index.js');
  for (const [pre, types] of [['', UNIT_TYPES], ['45:', TYPES_1945]]) {
    for (const type of Object.values(types)) {
      if (type.kind === 'infantry' || !type.models || type.stats?.structure) continue;
      for (const key of Object.keys(type.models)) builds.push([pre + type.id, key, type.models[key]]);
    }
  }
  const air = await import('/src/data/air.ts');
  const air45 = await import('/src/data/air45.ts');
  for (const [kind, table] of [['heli', air.AIRCRAFT], ['jet', air.JETS], ['lift', air.LIFT], ['cap', air.FIGHTERS], ['recon', air.RECON]]) for (const [key, a] of Object.entries(table)) builds.push([`air:${kind}`, key, a.model]);
  for (const [kind, table] of Object.entries(air45.AIR_1945)) for (const [key, a] of Object.entries(table)) builds.push([`45:air:${kind}`, key, a.model]);
  const sea85 = await import('/src/data/air85sea.js'); // (1985 at sea: the carrier and shore aircraft, the ships' helicopters)
  for (const [kind, table] of [['seaStrike', sea85.SEA_STRIKE], ['seaCap', sea85.SEA_CAP], ['asw', sea85.ASW], ['aew', sea85.AEW], ['helo', sea85.HELO]]) for (const [key, a] of Object.entries(table)) builds.push([`air:${kind}`, key, a.model]);
  for (const [id, key, build] of builds) {
    {
      if (only.length && !only.includes(id) && !(only.includes('air') && id.startsWith('air:')) && !(only.includes('45') && id.startsWith('45:'))) continue;
      const type = { id };
      let rig;
      try { rig = build(mats); } catch (e) { out.push({ unit: type.id, key, error: String(e).slice(0, 120) }); continue; }
      const root = rig.root;
      root.traverse((o) => { o.visible = true; });
      // everything at its working pose: masts up, antennas out (u.deployK 1), the load on
      root.updateMatrixWorld(true);
      const inTow = (o) => { for (let q = o; q; q = q.parent) if (q.name === 'tow') return true; return false; };
      const report = [];
      for (const towPart of [false, true]) {
      const boxes = [];
      root.traverse((o) => { if (o.isMesh && o.geometry?.attributes?.position && inTow(o) === towPart) boxes.push(...pieces(o)); });
      if (!boxes.length) continue;
      // which pieces touch: boxes overlapping within tol; the biggest cluster is the vehicle
      const parent = boxes.map((_, i) => i);
      const find = (i) => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
      const grown = boxes.map((b) => b.clone().expandByScalar(tol));
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (grown[i].intersectsBox(boxes[j])) { const a = find(i), c = find(j); if (a !== c) parent[a] = c; }
      // whatever stands on the ground is not floating (a baseplate, jacks)
      const gnd = boxes.map((_, i) => i).filter((i) => boxes[i].min.y <= tol);
      for (const i of gnd.slice(1)) { const a = find(i), c = find(gnd[0]); if (a !== c) parent[a] = c; }
      const size = new Map();
      boxes.forEach((b, i) => { const r = find(i); const s = new THREE.Vector3(); b.getSize(s); size.set(r, (size.get(r) ?? 0) + s.x * s.y * s.z + 1e-6); });
      const main = [...size.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const loose = boxes.map((b, i) => ({ b, i })).filter(({ i }) => find(i) !== main);
      report.push({ loose, n: boxes.length, towPart });
      }
      const loose = report.flatMap((r) => r.loose), boxes = { length: report.reduce((n, r) => n + r.n, 0) };
      if (loose.length) out.push({ unit: type.id, key, pieces: boxes.length, floating: loose.slice(0, globalThis.__all ? 99 : 6).map(({ b }) => { const c = new THREE.Vector3(), s = new THREE.Vector3(); b.getCenter(c); b.getSize(s); return `at ${c.x.toFixed(2)},${c.y.toFixed(2)},${c.z.toFixed(2)} size ${s.x.toFixed(2)}×${s.y.toFixed(2)}×${s.z.toFixed(2)}`; }), more: Math.max(0, loose.length - (globalThis.__all ? 99 : 6)) });
    }
  }
  return out;
}'''

if __name__ == '__main__':
    only = sys.argv[1:]
    with sync_playwright() as p:
        b = p.chromium.launch(channel='msedge', headless=True)
        pg = b.new_page()
        pg.goto('http://localhost:5173/?mode=skirmish&map=fulda-gap', timeout=300000)
        pg.wait_for_function('window.booted', timeout=300000)
        res = pg.evaluate(JS, {'only': only, 'tol': 0.03})
        b.close()
    for r in res:
        if 'error' in r: print(f"{r['unit']:<14} {r['key']:<5} ERROR {r['error']}"); continue
        print(f"{r['unit']:<14} {r['key']:<5} {len(r['floating']) + r['more']:>3} loose of {r['pieces']}: " + ' | '.join(r['floating']) + (f" (+{r['more']})" if r['more'] else ''))
    print(len(res), 'models with loose pieces')
