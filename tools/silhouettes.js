// Side-view silhouettes of every unit type for both sides, drawn by the main menu's unit
// preview (the game's real models and poses) in flat white on nothing, then trimmed to the
// shape. window.silhouettes() → { 'tank-nato': dataURL, … }; tools/render_silhouettes.py saves them.
import * as THREE from 'three';
import { UNIT_TYPES } from '../src/data/units/index.js';
import { UnitPreview } from '../src/ui/UnitPreview.js';

const W = 240, H = 84; // the saved image: the shape fitted inside, bottom-aligned

const preview = new UnitPreview(document.getElementById('c'));
preview.renderer.setAnimationLoop(null);
preview.renderer.setPixelRatio(2);
preview.renderer.shadowMap.enabled = false;
preview.resize();
const scene = preview.scene;
scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
for (const o of scene.children) if (o.isMesh) o.visible = false; // the ground disc

/** The drawn canvas cut down to its opaque pixels and fitted into W × H. */
function trim(canvas) {
  const src = document.createElement('canvas');
  src.width = canvas.width;
  src.height = canvas.height;
  const g = src.getContext('2d');
  g.drawImage(canvas, 0, 0);
  const { data } = g.getImageData(0, 0, src.width, src.height);
  let x0 = src.width, y0 = src.height, x1 = -1, y1 = -1;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      if (data[(y * src.width + x) * 4 + 3] < 8) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const k = Math.min((W * 2) / w, (H * 2) / h);
  const out = document.createElement('canvas');
  out.width = W * 2;
  out.height = H * 2;
  out.getContext('2d').drawImage(src, x0, y0, w, h, (out.width - w * k) / 2, out.height - h * k, w * k, h * k);
  return out.toDataURL('image/png');
}

window.silhouettes = () => {
  const out = {};
  for (const type of Object.values(UNIT_TYPES)) {
    if (!type.models || type.stats?.structure) continue; // bunkers and the HQ are never on a card
    for (const faction of ['nato', 'pact']) {
      preview.show(type.id, faction);
      const units = preview.stack.units;
      // infantry: the men one behind the other along their line of march, so the side view
      // shows them in file; each faces straight ahead
      units.forEach((u, i) => { u.pos.set(0, 0, (i - (units.length - 1) / 2) * 1.1); u.yaw = u.turretYaw = u.aimYaw = 0; });
      preview.setPose(preview.vehicle ? 'idle' : 'aim');
      Object.assign(preview.orbit, { yaw: -Math.PI / 2, pitch: 0.04, zoom: 1, idle: 0 }); // from the left: the front faces right
      preview.fit = preview.vehicle ? { w: 4.6, h: 2.4 } : { w: 2.2, h: 1.1 };
      for (let i = 0; i < 3; i++) preview.frame(); // let the poses settle
      out[`${type.id}-${faction}`] = trim(preview.canvas);
    }
  }
  return out;
};
window.ready = true;
