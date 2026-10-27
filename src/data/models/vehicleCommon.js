// Shared kit for tracked vehicle models:
//   sideProfile / planProfile – hull and turret bodies extruded from real outlines (side view
//                               or top view) instead of stacked boxes
//   runningGear               – individual track links around sprocket, idler, road wheels and
//                               return rollers; road wheels come back as positions so they can spin
//   spinningWheels            – one InstancedMesh per vehicle for its road wheels, turned by the
//                               distance driven
//   groundTilt / meshAdder    – hull settling on slopes, adding meshes to rig groups
import * as THREE from 'three';
import { P, part, merge, grime, loft } from '../units/geometry.js';

/**
 * Extrude a side-view outline [[z, y], …] (z forward, y up) to `width`, centred on x = 0.
 * `opts` are geometry.js part options (x/y/z offsets, color, camo…).
 */
export function sideProfile(points, width, opts = {}, bevel = 0.04) {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, steps: 1 });
  geo.rotateY(-Math.PI / 2);                   // shape x → world z, extrusion → world -x
  geo.translate(width / 2 - bevel, 0, 0);
  return part(geo, opts);
}

/** Extrude a top-view outline [[x, z], …] upward by `height`, starting at y = 0. */
export function planProfile(points, height, opts = {}, bevel = 0.04) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, steps: 1 });
  geo.rotateX(-Math.PI / 2);                   // shape y → world -z, extrusion → world +y
  geo.translate(0, bevel, 0);
  return part(geo, opts);
}

/**
 * Armoured hull (or turret) from cross-sections — "stations" — along z, mirrored across x = 0:
 * `stations` [[z, [[x, y], …]], …], each a half outline from the bottom centre (x = 0) round
 * the +x side to the top centre (x = 0), all with the same number of points. Between stations
 * the plates are flat, so sloped sides, tapering glacis plates and bevelled corners come out
 * as real facets. Ends are closed. `opts` are geometry.js part options. `axis: 'y'` sweeps
 * along y instead (turrets: stations are heights, outlines in the x–z plane from the rear).
 */
export function stationHull(stations, opts = {}, axis = 'z') {
  const rings = stations.map(([s, half]) => {
    const full = [...half, ...half.slice(1, -1).reverse().map(([x, v]) => [-x, v])];
    return full.map(([x, v]) => (axis === 'z' ? [x, v, s] : [x, s, v]));
  });
  const m = rings[0].length;
  const tri = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let k = 0; k < m; k++) {
      const a = rings[i][k], b = rings[i][(k + 1) % m], c = rings[i + 1][k], d = rings[i + 1][(k + 1) % m];
      tri.push(a, c, b, b, c, d);
    }
  }
  for (const [ring, first] of [[rings[0], true], [rings[rings.length - 1], false]]) {
    const cen = [0, 1, 2].map((j) => ring.reduce((t, p) => t + p[j], 0) / m);
    for (let k = 0; k < m; k++) {
      const a = ring[k], b = ring[(k + 1) % m];
      if (first) tri.push(cen, a, b); else tri.push(cen, b, a);   // same winding as the sides
    }
  }
  const pos = new Float32Array(tri.length * 3);
  tri.forEach((p, i) => pos.set(p, i * 3));
  // make the faces point outward, whichever way round the outlines were given
  const cen = [0, 1, 2].map((j) => tri.reduce((t, p) => t + p[j], 0) / tri.length);
  let out = 0;
  for (let i = 0; i < tri.length; i += 3) {
    const [a, b, c] = [tri[i], tri[i + 1], tri[i + 2]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    out += n[0] * (a[0] - cen[0]) + n[1] * (a[1] - cen[1]) + n[2] * (a[2] - cen[2]);
  }
  if (out < 0) {
    for (let i = 0; i < pos.length; i += 9) {
      for (let j = 0; j < 3; j++) [pos[i + 3 + j], pos[i + 6 + j]] = [pos[i + 6 + j], pos[i + 3 + j]];
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return part(g, opts);
}

/**
 * A cast turret (T-72, T-80): one smooth casting swept through sections [[z, halfWidth, height], …]
 * from the gun end back, low and wide with thick cheeks, its underside cut flat at the turret
 * ring (y = 0). `e` > 2 flattens the roof and squares the shoulders a little.
 */
export function castTurret(sections, opts = {}, e = 2.6) {
  return loft(sections.map(([z, w, h]) => [0, 0, z, w, h, e]), { ...opts, warp: (v) => { if (v.y < 0) v.y = 0; } }, 22);
}

/**
 * The usual tracked hull for stationHull from a few stations [[z, top, bottom], …]: the belly
 * between the tracks out to `belly`, the fender shelf over the tracks at `fenderY` out to
 * `fender`, the side up to the roof with its edge chamfered in. Low stations (the nose) keep
 * at least the fender shelf.
 */
export function trackedHull(stations, { belly, fender, fenderY, chamfer = 0.08 }, opts = {}) {
  return stationHull(stations.map(([z, top, bottom]) => {
    const t = Math.max(top, fenderY + chamfer + 0.02);
    return [z, [[0, bottom], [belly, bottom], [belly, fenderY], [fender, fenderY], [fender, t - chamfer], [fender - chamfer, t], [0, t]]];
  }), opts);
}

/**
 * Tracks and suspension, both sides.
 *   halfWidth  – track centre line from the vehicle axis
 *   length     – ground contact from first to last road wheel centre, roughly
 *   wheels     – road wheels per side; wheelR their radius
 *   sprocket   – +1 drive sprocket at the front (M109, 2S1), -1 at the rear (Abrams, T-72)
 *   rollers    – return rollers per side (0 = none: the track rests on the wheels)
 * Returns { parts (static geometry parts), wheels: [{ x, y, z }], wheelR }.
 */
export function runningGear({
  halfWidth, length, wheels, wheelR, sprocket = -1, rollers = 3, trackWidth = 0.62,
  trackColor = 0x2a2a26, wheelColor = 0x3e4232, camo = 0,
}) {
  const parts = [];
  const wheelList = [];
  const endR = wheelR * 0.95;                       // sprocket / idler radius
  const half = length / 2;
  const endY = wheelR + 0.25;                       // sprocket and idler sit higher than the wheels
  const contactY = 0.04;
  for (const s of [-1, 1]) {
    const x = s * halfWidth;
    // road wheels: spread along the ground run
    for (let i = 0; i < wheels; i++) {
      const z = -half + wheelR + (i * (length - wheelR * 2)) / (wheels - 1);
      wheelList.push({ x, y: wheelR + contactY, z });
    }
    // sprocket (toothed) and idler at the ends
    for (const end of [-1, 1]) {
      const z = end * (half + endR * 0.6);
      const isSprocket = end === sprocket;
      parts.push(P.cyl(endR, endR, trackWidth * 0.7, { x, y: endY, z, rz: Math.PI / 2, color: wheelColor, camo }, 16));
      parts.push(P.cyl(endR * 0.4, endR * 0.4, trackWidth * 0.75, { x, y: endY, z, rz: Math.PI / 2, color: 0x2e302a }, 10));
      if (isSprocket) {
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2;
          parts.push(P.box(trackWidth * 0.5, 0.09, 0.09, { x, y: endY + Math.sin(a) * endR, z: z + Math.cos(a) * endR, rx: -a, color: 0x2e302a }));
        }
      }
    }
    // return rollers on the upper run
    for (let i = 0; i < rollers; i++) {
      const z = -half * 0.65 + (i * half * 1.3) / Math.max(1, rollers - 1);
      parts.push(P.cyl(0.11, 0.11, trackWidth * 0.5, { x: x - s * 0.08, y: endY + endR + 0.04 - 0.14, z, rz: Math.PI / 2, color: wheelColor }, 10)); // under the top run
    }
    // track links: walk the closed loop — ground run, up around the front end, top run, down around the rear
    const zF = half + endR * 0.6;
    const zR = -zF;
    const path = [];
    const linkStep = 0.17;
    const run = (z0, y0, z1, y1) => {
      const len = Math.hypot(z1 - z0, y1 - y0);
      const n = Math.max(1, Math.round(len / linkStep));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        path.push([z0 + (z1 - z0) * t, y0 + (y1 - y0) * t, Math.atan2(y1 - y0, z1 - z0)]);
      }
    };
    const arc = (cz, cy, r, a0, a1) => {
      const n = Math.max(2, Math.round((Math.abs(a1 - a0) * r) / linkStep));
      for (let k = 0; k < n; k++) {
        const a = a0 + ((a1 - a0) * k) / n;
        path.push([cz + Math.cos(a) * r, cy + Math.sin(a) * r, a + Math.PI / 2]);
      }
    };
    const rr = endR + 0.04;
    run(zR + wheelR * 0.4, contactY, zF - wheelR * 0.4, contactY);  // ground run
    run(zF - wheelR * 0.4, contactY, zF + rr * 0.55, endY - rr * 0.8); // up the nose to the front end
    arc(zF, endY, rr, -0.95, Math.PI / 2);                            // around the front end
    run(zF, endY + rr, zR, endY + rr);                                // top run (sags onto the rollers)
    arc(zR, endY, rr, Math.PI / 2, Math.PI + 0.95);                   // around the rear end
    run(zR - rr * 0.55, endY - rr * 0.8, zR + wheelR * 0.4, contactY);
    for (const [z, y, a] of path) {
      parts.push(P.box(trackWidth, 0.055, linkStep * 0.88, { x, y, z, rx: -a, color: trackColor }));
      parts.push(P.box(0.06, 0.07, linkStep * 0.5, { x, y: y + Math.cos(a) * 0.05, z: z - Math.sin(a) * 0.05, rx: -a, color: 0x3a3a34 })); // guide horn
    }
  }
  return { parts, wheels: wheelList, wheelR };
}

/**
 * Road wheel geometry: dual discs with rubber tyres and a hub, axis along x. `tyre` is the
 * rubber's depth as a share of the radius (road wheels ~0.14, a truck tyre ~0.4).
 */
export function roadWheelGeometry(r, width, color = 0x3e4232, camo = 0, tyre = 0.14) {
  const disc = r * (1 - tyre);
  return grime(merge([
    ...[-1, 1].flatMap((s) => [
      P.cyl(r, r, width * 0.42, { x: s * width * 0.28, rz: Math.PI / 2, color: 0x1e1e1c, surf: 'rubber' }, 18),   // tyre
      P.cyl(disc, disc * 0.92, width * 0.45, { x: s * width * 0.29, rz: Math.PI / 2 * s, color, camo }, 16),    // dished disc
    ]),
    P.cyl(r * 0.32, r * 0.32, width * 1.05, { rz: Math.PI / 2, color: 0x2e302a }, 10), // hub
    ...[0, 1, 2, 3, 4].map((k) => P.box(width * 1.02, r * 0.12, r * 0.12, { y: Math.sin(k * 1.2566) * r * 0.5, z: Math.cos(k * 1.2566) * r * 0.5, color: 0x34372c })), // bolts
  ]), r * 0.6, -r, 0.8);
}

/**
 * A vehicle's road wheels as one InstancedMesh under `parent`. Call update(distance) with the
 * distance driven (metres) to turn them.
 */
export function spinningWheels(parent, geometry, wheels, r, material) {
  const mesh = new THREE.InstancedMesh(geometry, material, wheels.length);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();
  const axis = new THREE.Vector3(1, 0, 0);
  const update = (distance) => {
    q.setFromAxisAngle(axis, distance / r);
    for (let i = 0; i < wheels.length; i++) {
      const w = wheels[i];
      mesh.setMatrixAt(i, m.compose(p.set(w.x, w.y, w.z), q, one));
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return { mesh, update };
}

/** Distance a unit has driven, from its gait phase (UnitStack.moveBody: phase += dt·speed·π/stride). */
export const distanceDriven = (u, stride = 1.1) => (u.walkPhase * stride) / Math.PI;

const _n = new THREE.Vector3();

/** Ease `st.pitch` / `st.roll` toward the slope under the unit, in its own frame. */
export function groundTilt(st, u, ctx, dt, rate = 4) {
  ctx.terrain.normalAt(u.pos.x, u.pos.z, _n);
  const fx = Math.sin(u.yaw);
  const fz = Math.cos(u.yaw);
  const k = Math.min(1, dt * rate);
  st.pitch = (st.pitch ?? 0) + (Math.atan2(_n.x * fx + _n.z * fz, _n.y) - (st.pitch ?? 0)) * k;
  st.roll = (st.roll ?? 0) + (-Math.atan2(_n.x * fz - _n.z * fx, _n.y) - (st.roll ?? 0)) * k;
}

/** Make a mesh adder bound to a parent group. */
export function meshAdder(parent) {
  return (geo, mat, shadow = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    parent.add(m);
    return m;
  };
}
