// Fewer, shared meshes for the hand-built 1806 rigs (horse and rider, gun and team, wagon): built
// of dozens of small parts each, a squadron came to ~650 meshes and a phone's GPU gave out after a
// few squadrons. compactRig(rig, probe):
//   1. runs `probe()` — the rig through its poses (gaits, limbered or not, firing…) — and notes which
//      leaf meshes moved, turned, scaled or showed/hid relative to their parent;
//   2. merges the ones that didn't, per parent and material, into one mesh (their place baked in):
//      the joints the animation and the death fall turn are groups, and they stay;
//   3. shares identical merged geometry between rigs (same parts, same coat): one copy on the GPU.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const shared = new Map(); // geometry key → geometry

function hashArray(a) {
  let h = a.length;
  const step = Math.max(1, Math.floor(a.length / 512));
  for (let i = 0; i < a.length; i += step) h = (h * 31 + Math.round(a[i] * 1000)) | 0;
  return h;
}

function keyOf(geo) {
  return Object.keys(geo.attributes).sort().map((n) => `${n}:${hashArray(geo.attributes[n].array)}`).join('|') + `|i:${geo.index ? hashArray(geo.index.array) : 0}`;
}

const signature = (geo) => Object.keys(geo.attributes).sort().join(',') + (geo.index ? '+i' : '');

export function compactRig(rig, probe) {
  const leaves = [];
  rig.root.updateMatrixWorld(true);
  rig.root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !o.children.length) leaves.push(o); });
  const pose = (m) => { m.updateMatrix(); return [...m.matrix.elements, m.visible ? 1 : 0]; };
  const before = new Map(leaves.map((m) => [m, pose(m)]));
  const moved = new Set();
  const look = () => { for (const m of leaves) { const p = pose(m), b = before.get(m); if (p.some((v, i) => Math.abs(v - b[i]) > 1e-5)) moved.add(m); } };
  probe(look);
  look();
  // per parent and material (and attribute set): the still parts merged into one
  const groups = new Map();
  for (const m of leaves) {
    if (moved.has(m) || !m.visible || !m.parent) continue;
    const k = `${m.parent.uuid}|${m.material.uuid}|${signature(m.geometry)}`;
    (groups.get(k) ?? groups.set(k, []).get(k)).push(m);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const parent = list[0].parent;
    const geos = list.map((m) => { m.updateMatrix(); return m.geometry.index ? m.geometry.clone().applyMatrix4(m.matrix) : m.geometry.clone().applyMatrix4(m.matrix); });
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const k = keyOf(merged);
    let geo = shared.get(k);
    if (geo) merged.dispose();
    else { geo = merged; shared.set(k, geo); }
    const mesh = new THREE.Mesh(geo, list[0].material);
    mesh.castShadow = list.some((m) => m.castShadow);
    mesh.receiveShadow = list.some((m) => m.receiveShadow);
    parent.add(mesh);
    for (const m of list) m.removeFromParent();
  }
  // the parts left alone: identical geometry shared too
  rig.root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    const k = keyOf(o.geometry);
    const geo = shared.get(k);
    if (geo && geo !== o.geometry) o.geometry = geo; // (the duplicate is left for the collector: rigs are built per unit)
    else if (!geo) shared.set(k, o.geometry);
  });
  return rig;
}

/**
 * A stand-in for a rig seen from afar: the whole of it in its rest pose, merged into one mesh per
 * material (render/RigRenderer.js shows it beyond LOD_FAR and stops animating the parts). The parts
 * move into rig.detail, the stand-in is rig.impostor — both under rig.root.
 */
export function addImpostor(rig) {
  const root = rig.root;
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const shown = (o) => { for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return false; return true; };
  const groups = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !shown(o)) return;
    const k = `${o.material.uuid}|${signature(o.geometry)}`;
    (groups.get(k) ?? groups.set(k, []).get(k)).push(o);
  });
  const impostor = new THREE.Group();
  const m4 = new THREE.Matrix4();
  for (const list of groups.values()) {
    const geos = list.map((m) => m.geometry.clone().applyMatrix4(m4.multiplyMatrices(inv, m.matrixWorld)));
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const k = keyOf(merged);
    let geo = shared.get(k);
    if (geo) merged.dispose();
    else { geo = merged; shared.set(k, geo); }
    const mesh = new THREE.Mesh(geo, list[0].material);
    mesh.castShadow = true;
    impostor.add(mesh);
  }
  const detail = new THREE.Group();
  while (root.children.length) detail.add(root.children[0]);
  root.add(detail, impostor);
  impostor.visible = false;
  rig.detail = detail;
  rig.impostor = impostor;
  return rig;
}
