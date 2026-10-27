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
