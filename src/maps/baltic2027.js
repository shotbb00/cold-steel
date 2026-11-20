// The Baltic States' 2027 maps' own pieces (maps/narva.ts, maps/daugavpils.ts): stone curtain walls with
// their towers and gates — the Hermann Castle and Ivangorod at Narva, Dinaburg's ramparts at Daugavpils.

/**
 * A curtain wall round the closed polygon `corners` ([x, z] …), `h` m high, in short pieces that follow the
 * ground, a square tower at each corner; left open for `gate` m round each of `gates` ([x, z]).
 * @param {any} props @param {any} cover @param {any} terrain @param {number[][]} corners
 * @param {{ h?: number, t?: number, gates?: number[][], gate?: number, tower?: number, towerH?: number, color?: number }} [o]
 */
export function curtainWall(props, cover, terrain, corners, { h = 7, t = 2.4, gates = [], gate = 8, tower = 7, towerH = 11, color = 0xb8b2a2 } = {}) {
  const shut = (x, z) => !gates.some(([gx, gz]) => Math.hypot(x - gx, z - gz) < gate);
  for (let i = 0; i < corners.length; i++) {
    const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % corners.length];
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 4)), yaw = Math.atan2(-(z1 - z0), x1 - x0), len = L / n;
    for (let k = 0; k < n; k++) {
      const x = x0 + (x1 - x0) * (k + 0.5) / n, z = z0 + (z1 - z0) * (k + 0.5) / n;
      if (!shut(x, z)) continue;
      const g = terrain.heightAt(x, z);
      props.box('stone', x, g + h / 2 - 1, z, len + 0.05, h + 2, t, yaw, color);
      props.box('stone', x, g + h + 0.6, z, len * 0.55, 1.2, t * 0.5, yaw, color);  // the battlements
      cover.addBox({ x, z, yaw, length: len, thickness: t, height: h, spots: false });
    }
    if (shut(x0, z0)) {
      const g = terrain.heightAt(x0, z0);
      props.box('stone', x0, g + towerH / 2 - 1, z0, tower, towerH + 2, tower, yaw, color);
      props.box('metal', x0, g + towerH + 1.2, z0, tower * 0.8, 2.4, tower * 0.8, yaw + Math.PI / 4, 0x6a3a2e); // the red tile cap
      cover.addBox({ x: x0, z: z0, yaw, length: tower, thickness: tower, height: towerH, spots: false });
    }
  }
}
