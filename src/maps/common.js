// Building blocks shared by the maps: cover sites (farmsteads, field walls, hay, roadblocks,
// rocks, wrecks), villages around a control point, and each side's command post. All take
// their own seeds, so a map can build point-mirrored copies that come out identical.
import { PropBuilder } from '../world/Props.js';
import { mulberry32 } from '../core/math.js';

/** Build one cover site. Uses its own seeded RNG so a mirrored copy comes out identical. */
export function buildSite(props, site, x, z, yaw) {
  const r = mulberry32(site.seed);
  props.rand = r;
  const L = (lx, lz) => PropBuilder.local(x, z, yaw, lx, lz);
  switch (site.kind) {
    case 'farm': {
      props.house({ x, z, yaw, width: 8 + r() * 3, depth: 6 + r() * 2 });
      const [bx, bz] = L(7 + r() * 2, -3);
      props.wall({ x: bx, z: bz, yaw: yaw + Math.PI / 2, length: 5 + r() * 3, height: 1.2 });
      if (r() < 0.6) {
        const [cx, cz] = L(-2, 7 + r() * 2);
        props.wreckCar({ x: cx, z: cz, yaw: yaw + (r() - 0.5) * 0.8 });
      }
      break;
    }
    case 'fieldwall': {
      const len = 9 + r() * 6;
      props.wall({ x, z, yaw, length: len, height: 1.15 });
      if (r() < 0.6) {
        const [ax, az] = L(len / 2 + 0.4, 2.2 + r());
        props.wall({ x: ax, z: az, yaw: yaw + Math.PI / 2, length: 4 + r() * 3, height: 1.1 });
      }
      if (r() < 0.5) {
        const [cx, cz] = L((r() - 0.5) * 4, -4 - r() * 2);
        props.boulder({ x: cx, z: cz, radius: 1 + r() * 0.6 });
      }
      break;
    }
    case 'hay': {
      props.hayBales({ x, z, yaw, count: 2 + Math.floor(r() * 3) });
      const [bx, bz] = L((r() - 0.5) * 6, 5 + r() * 3);
      props.hayBales({ x: bx, z: bz, yaw: yaw + (r() - 0.5), count: 1 + Math.floor(r() * 2) });
      break;
    }
    case 'roadblock': {
      props.jersey({ x, z, yaw, length: 6 });
      const [ax, az] = L(6, 2);
      props.jersey({ x: ax, z: az, yaw: yaw + 0.3, length: 3 });
      for (let i = 0; i < 3; i++) {
        const [hx, hz] = L(-6 + i * 3.2 + (r() - 0.5), -5 - r() * 2);
        props.hedgehog({ x: hx, z: hz });
      }
      if (r() < 0.5) {
        const [cx, cz] = L(-7, 3);
        props.wreckCar({ x: cx, z: cz, yaw: yaw + 1.2 + r() });
      }
      break;
    }
    case 'rocks': {
      const n = 2 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const [bx, bz] = L((i - (n - 1) / 2) * 3.6 + (r() - 0.5) * 1.5, (r() - 0.5) * 4);
        props.boulder({ x: bx, z: bz, radius: 1.1 + r() * 1.1 });
      }
      break;
    }
    case 'wrecks': {
      props.wreckCar({ x, z, yaw });
      const [ax, az] = L(4 + r() * 2, 2 + r() * 2);
      props.wreckCar({ x: ax, z: az, yaw: yaw + 0.5 + r() });
      const [bx, bz] = L(-4, -3);
      props.wall({ x: bx, z: bz, yaw: yaw + 0.2, length: 4, height: 1.1 });
      break;
    }
  }
}

/** A village around a control point: a few farmsteads around a lane, garden walls, a wreck. */
export function buildVillage(props, p, seed, mirror = 1) {
  const r = mulberry32(seed);
  const n = 3 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.6;
    const d = 13 + r() * 9;
    const x = p.x + Math.cos(a) * d * mirror;
    const z = p.z + Math.sin(a) * d * mirror;
    const kind = i % 2 ? 'farm' : r() < 0.5 ? 'farm' : 'fieldwall';
    buildSite(props, { kind, seed: Math.floor(r() * 1e9) }, x, z, a + Math.PI / 2 + (mirror < 0 ? Math.PI : 0));
  }
}

/** Each side's command post: tents, crates, a radio mast and a ring of sandbags. */
export function commandPost(props, base, toward, canvas) {
  props.sandbagRing({ x: base.x, z: base.z, radius: 7, toward });
  props.tent({ x: base.x - 3, z: base.z - toward * 1, yaw: 0.2, color: canvas });
  props.tent({ x: base.x + 3.5, z: base.z - toward * 2, yaw: -0.15, color: canvas });
  props.crates({ x: base.x + 0.5, z: base.z + toward * 3, yaw: 0.4 });
  props.mast({ x: base.x - 9, z: base.z - toward * 6 });
  for (let i = 0; i < 4; i++) {
    const x = -15 + i * 10;
    props.wall({ x, z: base.z + toward * (17 + Math.abs(x) * 0.12), yaw: (toward > 0 ? 0 : Math.PI) + x * -0.012, length: 4.6, height: 1.1 });
  }
}

/**
 * Build something twice, point-mirrored: fn(m, flip) with m = 1 then -1 (multiply x and z by it)
 * and flip = 0 then π (add to yaw), each time from the same seed so both copies match.
 */
export function mirrored(props, seed, fn) {
  for (const m of [1, -1]) {
    props.rand = mulberry32(seed);
    fn(m, m > 0 ? 0 : Math.PI);
  }
}

/**
 * A trench line along `points` ([[x, z], …], left to right as its owner looks at the enemy) for the
 * Western Front maps: 9 m trench bays end to end (`zig` m steps them back and forth), and `belts` of wire `wireAt` m in front
 * (rows 5 m apart, a gap every `gapEvery` m for the patrols). Returns works for game.replayScars.
 */
export function trenchLine(points, faction, { zig = 0, wireAt = 24, belts = 2, gapEvery = 90 } = {}) {
  const works = [];
  const walk = (offset, step, fn) => { // along the polyline, `offset` m out in front, every `step` m
    let k = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = points[i], [bx, bz] = points[i + 1];
      const len = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / len, dz = (bz - az) / len;
      const nx = dz, nz = -dx;  // the front: to the right of the way along, as its owner faces
      for (let t = step / 2; t < len; t += step, k++) fn(ax + dx * t + nx * offset, az + dz * t + nz * offset, Math.atan2(nx, nz), k, t + i * 1e4, nx, nz);
    }
  };
  walk(0, 8.6, (x, z, yaw, k, _t, nx, nz) => { const o = k % 2 ? zig : -zig; works.push({ kind: 'trench', x: x + nx * o, z: z + nz * o, yaw, faction }); });
  for (let b = 0; b < belts; b++) {
    walk(wireAt + b * 5, 10.2, (x, z, yaw, k) => { if ((k + b * 4) % Math.round(gapEvery / 10.2) !== 0) works.push({ kind: 'wire', x, z, yaw, faction }); });
  }
  return works;
}

/**
 * Shell craters over a fought-over field, point-mirrored like the maps: `density(x, z)` (craters
 * per 1000 m², the half with z > 0 asked) over `bounds`. Returns blasts for game.replayScars
 * ([x, z, splash radius, depth]: core/GameEngine.js digs them, scorches them, fells the trees).
 */
export function shellField(seed, bounds, density) {
  const r = mulberry32(seed), blasts = [];
  for (let z = 0; z < bounds.z; z += 10) {
    for (let x = -bounds.x; x < bounds.x; x += 10) {
      const n = density(x + 5, z + 5) * 0.1;               // (a 10 × 10 m cell: a tenth of 1000 m²)
      for (let i = 0; i < Math.floor(n) + (r() < n % 1 ? 1 : 0); i++) {
        const cx = x + r() * 10, cz = z + r() * 10, big = r();
        const blast = [Math.round(cx * 10) / 10, Math.round(cz * 10) / 10, 4 + big * 7, 0.4 + big * big * 1.8]; // most shallow, a few deep (the heavies: two metres)
        blasts.push(blast, [-blast[0], -blast[1], blast[2], blast[3]]);
      }
    }
  }
  return blasts;
}
