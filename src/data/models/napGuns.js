// 1806 artillery (data/units1806): a field gun on its carriage, its gunners, and the limber with
// its team of four horses (models/horse.js) — one rig per gun for render/RigRenderer.js.
//   On the march (u.towing, UnitStack: limbered) the gun's trail rides on the limber and the team
//   pulls it, muzzle to the rear; set up, the team and limber wait a few metres behind and the
//   gunners stand round the piece. The barrel traverses a little on the carriage (stats.traverse);
//   it jumps back when it fires.
//   size: 'field' (6- and 8-pounders), 'heavy' (12-pounders), 'horse' (light, the horse artillery),
//   'howitzer' (the short, fat barrel for shells).
import * as THREE from 'three';
import { P, merge, loft } from '../units/geometry.js';
import { buildHorse } from './horse.js';
import { buildNapSoldier, ARMIES_1806 } from './napSoldier.js';

const WOOD = { fr: 0x51613a, by: 0x4a5a6a, pr: 0x3e4a5a, sx: 0x3e4a5a, gb: 0x5a6670 };   // carriages: French olive green, the Germans' blue-grey
const BRONZE = 0x9a7a3a;
const IRON = 0x2a2a28;
const SIZES = {
  field: { wheel: 0.66, barrel: 1.9, bore: 0.1, cheek: 1.9 },
  heavy: { wheel: 0.72, barrel: 2.4, bore: 0.13, cheek: 2.3 },
  horse: { wheel: 0.62, barrel: 1.6, bore: 0.09, cheek: 1.7 },
  howitzer: { wheel: 0.66, barrel: 1.1, bore: 0.15, cheek: 1.8 },
};

/** A spoked wheel standing on the ground, facing x (as a geometry list). */
function wheel(x, r, color) {
  const parts = [P.torus(r - 0.03, 0.035, { x, y: r, ry: Math.PI / 2, color: IRON }, 20), P.cyl(0.09, 0.09, 0.16, { x, y: r, rz: Math.PI / 2, color })];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    parts.push(P.box(0.03, r - 0.06, 0.035, { x, y: r + Math.cos(a) * (r / 2), z: Math.sin(a) * (r / 2), rx: a, color }));
  }
  return parts;
}

const material = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.1 });
const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };

/** The gun on its carriage: a group with the barrel group (traverse, recoil) and its muzzle. */
function piece(army, size) {
  const S = SIZES[size] ?? SIZES.field;
  const wood = WOOD[army] ?? WOOD.fr;
  const mat = material();
  const g = new THREE.Group();
  g.add(mesh(merge([
    ...wheel(0.62, S.wheel, wood), ...wheel(-0.62, S.wheel, wood),
    P.cyl(0.05, 0.05, 1.3, { y: S.wheel, rz: Math.PI / 2, color: IRON }),                                       // the axle
    ...[-1, 1].map((s) => P.box(0.08, 0.28, S.cheek, { x: s * 0.2, y: S.wheel - 0.05, z: -S.cheek / 2 + 0.35, rx: -0.26, color: wood })), // the cheeks, sloping to the trail
    P.box(0.34, 0.12, 0.5, { y: 0.14, z: -S.cheek + 0.5, color: wood }),                                       // the trail on the ground
  ]), mat));
  const barrel = new THREE.Group();
  barrel.position.set(0, S.wheel + 0.18, 0.1);
  const L = S.barrel;
  barrel.add(mesh(merge([
    loft([[0, 0, -0.32, S.bore * 1.6, S.bore * 1.6, 2], [0, 0, -0.18, S.bore * 1.9, S.bore * 1.9, 2], [0, 0, L * 0.35, S.bore * 1.55, S.bore * 1.55, 2], [0, 0, L - 0.2, S.bore * 1.2, S.bore * 1.2, 2], [0, 0, L - 0.08, S.bore * 1.45, S.bore * 1.45, 2], [0, 0, L, S.bore * 1.3, S.bore * 1.3, 2]], { color: BRONZE }, 14),
    P.sphere(S.bore * 1.1, { z: -0.4, color: BRONZE }, 8, 6),                                                  // the cascabel
    P.cyl(0.05, 0.05, 0.55, { rz: Math.PI / 2, color: BRONZE }, 8),                                            // the trunnions
    P.cyl(S.bore * 0.7, S.bore * 0.7, 0.02, { z: L + 0.005, rx: Math.PI / 2, color: 0x080808 }, 12),          // the bore
  ]), mat));
  barrel.rotation.x = -0.04;
  const muzzle = new THREE.Object3D();
  muzzle.position.z = L + 0.05;
  barrel.add(muzzle);
  g.add(barrel);
  return { group: g, barrel, muzzle, trail: S.cheek };
}

/** The limber: an ammunition chest on two wheels, its pole forward. */
function limber(army) {
  const wood = WOOD[army] ?? WOOD.fr;
  return mesh(merge([
    ...wheel(0.62, 0.6, wood), ...wheel(-0.62, 0.6, wood),
    P.cyl(0.05, 0.05, 1.3, { y: 0.6, rz: Math.PI / 2, color: IRON }),
    P.box(1.0, 0.45, 0.6, { y: 1.0, color: wood }),                                                          // the chest
    P.box(1.04, 0.05, 0.64, { y: 1.24, color: 0x3a2a1a }),
    P.box(0.07, 0.07, 2.6, { y: 0.7, z: 1.4, rx: 0.05, color: wood }),                                       // the pole
  ]), material());
}

/** A standing gunner, as one static mesh (the line soldier's figure in the army's colours). */
function gunner(army, mat) {
  const m = buildNapSoldier({ army, armed: false });
  return mesh(merge([m.torso, m.arms, m.thigh.clone().translate(0.12, 0.96, 0), m.thigh.clone().translate(-0.12, 0.96, 0), m.shin.clone().translate(0.12, 0.48, 0), m.shin.clone().translate(-0.12, 0.48, 0)]), mat);
}

export function buildFieldGun({ army = 'fr', size = 'field' } = {}) {
  const root = new THREE.Group();
  const gun = piece(army, size);
  root.add(gun.group);
  // the team: four horses in pairs, a driver on each near horse; then the limber
  const team = new THREE.Group();
  const horses = [];
  for (const [x, z] of [[0.7, 6.2], [-0.7, 6.2], [0.7, 3.6], [-0.7, 3.6]]) {
    const h = buildHorse({ coat: ['bay', 'black', 'chestnut', 'bay'][horses.length], saddle: x > 0 ? { cloth: ARMIES_1806[army]?.coat ?? 0x24324a, trim: 0x2a1c12 } : false });
    h.root.position.set(x, 0, z);
    team.add(h.root);
    horses.push(h);
  }
  const lim = limber(army);
  lim.position.z = 1.6;
  team.add(lim);
  root.add(team);
  // the gunners round the piece (set up), on the limber chest and walking beside the team (limbered)
  const crewMat = material();
  const crew = [];
  for (const [x, z, yaw] of [[1.0, 0.4, 0], [-1.0, 0.4, 0], [0.9, -1.0, 0.3], [-0.9, -1.0, -0.3], [1.6, -0.4, 0.4], [0.0, -2.2, 0]]) {
    const c = gunner(army, crewMat);
    c.userData.set = { x, z, yaw };
    root.add(c);
    crew.push(c);
  }
  let gait = 'halt';
  return {
    root,
    muzzle: gun.muzzle,
    animate(u, dt, t) {
      const towing = !!u.towing;
      const v = Math.hypot(u.vel.x, u.vel.z);
      // limbered: the gun hooked behind the limber, muzzle to the rear, the team pulling; set up: the
      // gun faces the enemy, the team and limber a few metres behind it
      gun.group.rotation.y = towing ? Math.PI : 0;
      gun.group.position.z = towing ? -(gun.trail - 0.5) : 0;
      team.position.z = towing ? 0.2 : -(gun.trail + 7);
      team.rotation.y = towing ? 0 : Math.PI;
      gait = v > 3.5 ? 'trot' : v > 0.4 ? 'walk' : 'halt';
      for (const h of horses) h.update(dt, towing ? gait : 'halt');
      gun.barrel.rotation.y = towing ? 0 : Math.max(-0.4, Math.min(0.4, Math.atan2(Math.sin(u.turretYaw - u.yaw), Math.cos(u.turretYaw - u.yaw))));
      gun.barrel.position.z = 0.1 - (u.recoil ?? 0) * 0.35;                                // the recoil
      gun.group.position.z += towing ? 0 : -(u.recoil ?? 0) * 0.5;                         // the whole carriage runs back
      crew.forEach((c, i) => {
        const p = c.userData.set;
        if (towing) c.position.set(i % 2 ? -1.6 : 1.6, 0, 1 + i * 1.2 + Math.sin(t * 6 + i) * 0.02);
        else c.position.set(p.x, 0, p.z);
        c.rotation.y = towing ? 0 : p.yaw;
      });
    },
    die(time, dt) {
      // knocked out: the gun dismounted, the horses down
      const k = Math.min(1, time / 0.8);
      gun.group.rotation.z = 0.35 * k;
      for (const h of horses) { h.body.rotation.z = 1.3 * k; h.body.position.y = 1.2 - 0.6 * k; }
      crew.forEach((c, i) => { c.rotation.x = -1.45 * k * (i % 2 ? 1 : 0.9); });
    },
  };
}

/**
 * A shore gun (the coastal battle, Aboukir 1801: data/units1806 shoreBattery): a 24-pounder on its garrison carriage
 * behind a sand parapet with an embrasure, laid on the sea; beside it the furnace where the shot is heated red
 * (the glow at its mouth) and a pile of cold shot. Fixed: the barrel traverses within the embrasure.
 */
export function buildShoreGun() {
  const SAND = 0xc8ab78, BRICK = 0x8a4a32;
  const base = merge([
    // the parapet: a long bank of sand in front, cut by the embrasure, the cheeks of the cut faced with fascines
    ...[-1, 1].map((s) => loft([[s * 3.2, 0, 2.8, 2.4, 0.05, 2], [s * 3.2, 1.2, 2.6, 2.2, 1.4, 2.2], [s * 3.2, 1.6, 2.4, 1.9, 0.9, 2]], { color: SAND }, 10)),
    loft([[0, 0, 3.4, 1.2, 0.05, 2], [0, 0.6, 3.2, 1.1, 1.0, 2.2]], { color: SAND }, 8),                // the sole of the embrasure, lower
    ...[-1, 1].map((s) => P.box(0.25, 1.5, 2.4, { x: s * 1.0, y: 0.8, z: 2.6, color: 0x6a5a3a })),       // the fascines
    P.box(4.6, 0.12, 4.4, { y: 0.06, color: 0x8a7458, surf: 'deck' }),                                    // the platform
    // the furnace for the heated shot: a squat brick oven, its mouth glowing
    P.box(1.6, 1.3, 1.6, { x: 4.4, y: 0.65, z: -1.6, color: BRICK }),
    P.cyl(0.2, 0.25, 1.2, { x: 4.4, y: 1.8, z: -1.9, color: 0x5a3a2a }, 8),
    P.box(0.6, 0.5, 0.05, { x: 4.4, y: 0.5, z: -0.79, color: 0xff7a2a }),
    // the shot, piled
    ...[[0, 0], [0.32, 0], [0.16, 0.28], [0.16, 0.1]].map(([x, z], i) => P.sphere(0.15, { x: -3.6 + x, y: 0.15 + (i === 3 ? 0.24 : 0), z: -1.2 + z, color: IRON }, 8, 6)),
  ]);
  const gunGeo = merge([
    P.box(0.9, 0.5, 1.8, { y: 0.4, z: -0.1, color: 0x5a4a34 }),                                              // the garrison carriage (trucks, not wheels)
    ...[-1, 1].flatMap((s) => [-0.6, 0.5].map((z) => P.cyl(0.22, 0.22, 0.12, { x: s * 0.5, y: 0.22, z, rz: Math.PI / 2, color: 0x4a3a2a }, 10))),
    P.cyl(0.17, 0.27, 3.0, { y: 0.85, z: 0.6, rx: Math.PI / 2, color: IRON }, 12),                          // the long iron 24-pounder
    P.cyl(0.2, 0.2, 0.15, { y: 0.85, z: 2.1, rx: Math.PI / 2, color: IRON }, 12),
    P.sphere(0.16, { y: 0.85, z: -0.95, color: IRON }, 8, 6),                                                // the cascabel
  ]);
  return (mats) => {
    const mat = mats?.body ?? material();
    const root = new THREE.Group();
    root.add(mesh(base, mat));
    const gun = new THREE.Group();
    gun.position.set(0, 0.12, 0.6);
    gun.add(mesh(gunGeo, mat));
    root.add(gun);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.85, 2.2);
    gun.add(muzzle);
    return {
      root,
      muzzle,
      animate(u) {
        const rel = Math.atan2(Math.sin((u.turretYaw ?? u.yaw) - u.yaw), Math.cos((u.turretYaw ?? u.yaw) - u.yaw));
        gun.rotation.y = Math.max(-0.7, Math.min(0.7, rel));
        gun.position.z = 0.6 - (u.recoil ?? 0) * 0.8;
      },
      die(time) { gun.rotation.z = Math.min(0.35, time * 0.5); gun.rotation.x = Math.min(0.25, time * 0.4); },
    };
  };
}
