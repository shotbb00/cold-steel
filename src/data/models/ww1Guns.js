// 1918 artillery (data/units1918): the quick-firing gun of the Great War on 1806's horse team and
// limber (napGuns.js buildFieldGun), its gunners the 1918 infantryman without his rifle.
//   field    18-pounder / 75 / FK 16: the long steel barrel on its recoil cylinder, the shield, the
//            box trail, wooden wheels with steel tyres; laid a little up
//   heavy    6-inch / 155 / sFH 13: the short fat howitzer barrel, big wheels, laid high
//   mortar   the heavy trench mortar: a squat tube on its timber bed, laid steeply (no wheels of its
//            own: the limber carries it)
import * as THREE from 'three';
import { P, merge, pair } from '../units/geometry.js';
import { buildFieldGun, wheel } from './napGuns.js';
import { buildWw1Soldier } from './ww1Soldier.js';

const PAINT = { uk: 0x5a5c46, fr: 0x6c7480, de: 0x5c5e50, st: 0x5c5e50 };   // British service green, French grey-blue, German field grey
const STEEL = 0x2e302c;
const WOOD = 0x6a4a2c;
const SIZES = {
  field: { wheel: 0.66, barrel: 2.4, bore: 0.05, trail: 2.6, shield: true, elevate: 0.22 },
  heavy: { wheel: 0.78, barrel: 2.0, bore: 0.09, trail: 3.0, shield: false, elevate: 0.6 },
  mortar: { wheel: 0, barrel: 1.3, bore: 0.13, trail: 1.4, shield: false, elevate: 1.0 },
};

const material = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.15 });
const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };

function piece(army, size) {
  const S = SIZES[size] ?? SIZES.field;
  const paint = PAINT[army] ?? PAINT.uk;
  const mat = material();
  const g = new THREE.Group();
  const axleY = S.wheel || 0.45;
  g.add(mesh(merge(S.wheel ? [
    ...pair((s) => wheel(s * 0.7, S.wheel, WOOD)).flat(),
    P.cyl(0.05, 0.05, 1.45, { y: axleY, rz: Math.PI / 2, color: STEEL }),
    P.box(0.3, 0.2, S.trail, { y: axleY * 0.55, z: -S.trail / 2 + 0.2, rx: -0.2, color: paint }),             // the box trail, down to the ground
    P.box(0.5, 0.1, 0.3, { y: 0.08, z: -S.trail + 0.35, color: STEEL }),                                       // its spade
    ...(S.shield ? [
      P.box(1.35, 0.95, 0.04, { y: axleY + 0.55, z: 0.42, rx: -0.1, color: paint }),                         // the shield
      P.box(1.15, 0.35, 0.04, { y: axleY - 0.1, z: 0.45, color: paint }),                                    // its lower apron
    ] : []),
  ] : [
    P.box(1.2, 0.25, 1.6, { y: 0.12, color: WOOD }),                                                         // the mortar's timber bed
    ...pair((s) => P.box(0.12, 0.5, 0.9, { x: s * 0.32, y: 0.45, color: paint })),                          // its cradle cheeks
  ]), mat));
  const barrel = new THREE.Group();
  barrel.position.set(0, axleY + 0.22, 0.1);
  const L = S.barrel;
  barrel.add(mesh(merge([
    P.cyl(S.bore * 1.25, S.bore * 1.6, L, { z: L / 2 - 0.4, rx: Math.PI / 2, color: paint }, 14),            // the barrel
    P.cyl(S.bore * 1.9, S.bore * 1.9, 0.5, { z: -0.35, rx: Math.PI / 2, color: paint }, 12),                 // the breech
    ...(S.wheel ? [P.cyl(S.bore * 1.0, S.bore * 1.0, L * 0.7, { y: -S.bore * 2.2, z: L * 0.3 - 0.3, rx: Math.PI / 2, color: STEEL }, 10)] : []), // the recoil cylinder under it
    P.cyl(S.bore * 0.8, S.bore * 0.8, 0.02, { z: L - 0.39, rx: Math.PI / 2, color: 0x080808 }, 12),          // the bore
  ]), mat));
  const muzzle = new THREE.Object3D();
  muzzle.position.z = L - 0.35;
  barrel.add(muzzle);
  g.add(barrel);
  return { group: g, barrel, muzzle, trail: S.trail, elevate: S.elevate };
}

/** A standing gunner, one static mesh: the 1918 infantryman, his rifle slung out of sight. */
function gunner(army, mat) {
  const m = buildWw1Soldier({ army, weapon: 'none' });
  return mesh(merge([m.torso, m.arms, m.thigh.clone().translate(0.12, 0.96, 0), m.thigh.clone().translate(-0.12, 0.96, 0), m.shin.clone().translate(0.12, 0.48, 0), m.shin.clone().translate(-0.12, 0.48, 0)]), mat);
}

export const buildWw1Gun = ({ army = 'uk', size = 'field' } = {}) => buildFieldGun({ army, size, make: piece, man: gunner, paint: PAINT[army] });
