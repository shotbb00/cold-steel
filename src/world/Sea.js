// The open sea (a sea map's `river`: it answers the questions the game asks of water — level, how
// deep stops a man, no bridges, no fords). The surface is one big sheet at `level`; the map's
// height function makes the sea floor (deep) and the islands, reefs and sandbanks (above or just
// under it). Ships (UnitStack `naval`) need water at least world/Nav.js SHIP_DEPTH deep.
import * as THREE from 'three';

/** @param {{ level?: number, size: number, color?: number }} o */
export function createSea({ level = 0, size, color = 0x1f4a5e }) {
  return {
    sea: true,
    level,
    water: { level, deep: 0.95 },
    crossings: [],
    channels: [],
    halfWidth: 0,
    channelAt: () => 0,
    path: () => Infinity,          // (no river line anywhere)
    side: () => 1,
    dry: (p) => p,
    bridgeAt: () => null,
    blow() {},
    lay() { return null; },

    build(scene) {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 }); // (any gloss: the sun's highlight is a white blot across a flat sheet this size)
      mat.userData.matte = true; // (Babylon: no specular at all — render/babylon/BabylonView.js)
      const water = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000, 1, 1), mat); // (to beyond the far plane: the haze hides where it ends)
      water.rotation.x = -Math.PI / 2;
      water.position.y = level;
      water.receiveShadow = true;
      water.userData.noAO = true;
      scene.add(water);
      this.waterMesh = water;
    },
  };
}
