// 1806 cavalry (data/units1806): a rider on a horse (models/horse.js), one rig per trooper for
// render/RigRenderer.js — contract { root, muzzle, animate(u, dt, t, ctx), die(time, dt) }.
//   kind: light (hussars, chevaulegers), medium (dragoons), heavy (cuirassiers, Garde du Corps)
//   The rider sits the saddle: torso on the seat, thighs forward and out round the barrel, shins
//   down to the stirrups; he rides with the horse's body (its bounce and rock), sabre at the slope.
//   The gait follows the trooper's speed (walk, trot, canter, gallop).
//   Death (u.fate, set by UnitStack.unhorse): 'rider' — the man falls, the horse runs on as a
//   loose horse of its own (another stack, so this rig shows only the man on the ground); 'horse'
//   — the horse goes down and the man gets up and walks (a dismounted stack); 'both'.
// buildCavalryFoot: the same trooper standing, for the dismounted (render/StackRenderer.js).
import * as THREE from 'three';
import { P, merge, loft, limb, pair } from '../units/geometry.js';
import { head, trunk, arms as armsHold, thigh as thighPart, shin as shinPart, finish } from './soldierBody.js';
import { buildHorse } from './horse.js';
import { bicorne, shako, raupenhelm } from './napSoldier.js';

const BLACK = 0x161616;
const STEEL = 0xb8bab6;
const BRASS = 0xb08a3a;

/** A helmet with a crest and a black horsehair mane (dragoons, cuirassiers). */
const crestHelmet = (metal) => [
  loft([[0, 1.74, -0.01, 0.112, 0.12, 2], [0, 1.82, -0.01, 0.11, 0.118, 2], [0, 1.88, -0.012, 0.075, 0.085, 2]], { color: metal }, 12),
  P.box(0.18, 0.012, 0.07, { y: 1.75, z: 0.125, rx: 0.2, color: BLACK }),
  loft([[0, 1.88, 0.08, 0.025, 0.03, 2], [0, 1.95, 0.0, 0.03, 0.05, 2], [0, 1.92, -0.09, 0.025, 0.04, 2]], { color: BRASS }, 8),
  loft([[0, 1.93, -0.08, 0.04, 0.03, 2], [0, 1.8, -0.17, 0.06, 0.03, 2], [0, 1.55, -0.2, 0.05, 0.025, 2]], { color: BLACK }, 8),     // the mane down the back
];
/** The busby (hussars): tall fur with a coloured bag. */
const busby = (bag) => [
  P.cyl(0.115, 0.108, 0.24, { y: 1.87, color: 0x1e1a16 }, 14),
  loft([[0.03, 1.98, 0, 0.03, 0.06, 2], [0.12, 1.9, 0, 0.03, 0.05, 2]], { color: bag }, 8),
];

// each army's horsemen: coat, facings, breeches, headgear, cuirass, the shabraque and its border
const CAV = {
  fr: {
    light: { coat: 0x7aa6d6, facing: 0xb02424, breeches: 0xa02a2a, hat: () => shako(0xb02424), cloth: 0x7aa6d6, trim: 0xe6e2d6, lace: 0xe0c050 },
    medium: { coat: 0x245437, facing: 0xb02424, breeches: 0xe2ddcf, hat: () => crestHelmet(BRASS), cloth: 0x245437, trim: 0xe6e2d6 },
    heavy: { coat: 0x1d2a5c, facing: 0xb02424, breeches: 0xe2ddcf, hat: () => crestHelmet(STEEL), cuirass: STEEL, cloth: 0x1d2a5c, trim: 0xe6e2d6 },
  },
  by: {
    light: { coat: 0x2f5a3a, facing: 0xa82626, breeches: 0xd8d0b0, hat: () => raupenhelm(), cloth: 0x2f5a3a, trim: 0xa82626 },
    medium: { coat: 0x7fa6c8, facing: 0x1a1a1a, breeches: 0xd8d0b0, hat: () => raupenhelm(), cloth: 0x7fa6c8, trim: 0xe6e2d6 },
    heavy: { coat: 0x2f4f8a, facing: 0xa82626, breeches: 0xd8d0b0, hat: () => raupenhelm(0xe6e2d6), cuirass: STEEL, cloth: 0x2f4f8a, trim: 0xd8b54a },
  },
  pr: {
    light: { coat: 0x23452e, facing: 0xb02a2a, breeches: 0x1b2440, hat: () => busby(0xb02a2a), cloth: 0x23452e, trim: 0xb02a2a, lace: 0xe6e2d6 },
    medium: { coat: 0x7fa6c8, facing: 0xb02a2a, breeches: 0xe2ddcf, hat: (c) => bicorne(c, 0xe6e2d6), cloth: 0x24324a, trim: 0xb02a2a },
    heavy: { coat: 0xe8e2cc, facing: 0xb02a2a, breeches: 0xe2ddcf, hat: (c) => bicorne(c, null), cloth: 0xb02a2a, trim: 0xe6e2d6 },
  },
  sx: {
    light: { coat: 0x87aee0, facing: 0xe6e2d6, breeches: 0x87aee0, hat: () => busby(0xe6e2d6), cloth: 0x87aee0, trim: 0xe6e2d6, lace: 0xe6e2d6 },
    medium: { coat: 0xa62a2a, facing: 0x1a1a1a, breeches: 0xe2ddcf, hat: (c) => bicorne(c, 0xe6e2d6), cloth: 0xa62a2a, trim: 0xe6e2d6 },
    heavy: { coat: 0xd9c88a, facing: 0xa82a2a, breeches: 0xe2ddcf, hat: (c) => bicorne(c, null), cloth: 0xa82a2a, trim: 0xe6e2d6 },
  },
};
const COCKADE = { fr: [0x1d2a8c, 0xf0f0f0, 0xc02020], by: [0x3a6ac0, 0xf0f0f0], pr: [BLACK, 0xf0f0f0], sx: [0xf0f0f0, 0x2a7a3a] };

/** The trooper's parts in standing coordinates (feet at 0, hips at 0.96): torso, arms, a thigh, a shin. */
function trooper(army, kind) {
  const c = { ...(CAV[army] ?? CAV.fr)[kind] ?? CAV.fr.heavy, hat: undefined, cockade: COCKADE[army] ?? COCKADE.fr };
  const cfg = (CAV[army] ?? CAV.fr)[kind] ?? CAV.fr.heavy;
  const torso = [
    ...trunk({ upper: c.coat, lower: c.breeches, cut: 1.08 }),
    loft([[0, 1.53, -0.01, 0.122, 0.104, 2], [0, 1.6, -0.02, 0.112, 0.096, 2]], { color: c.facing }, 12),        // collar
    ...(c.lace ? [1.22, 1.29, 1.36, 1.43].map((y) => P.box(0.2, 0.014, 0.01, { y, z: 0.14, color: c.lace })) : []), // the hussar's braid
    ...(c.cuirass ? [loft([[0, 1.1, 0.0, 0.19, 0.135, 2.4], [0, 1.3, 0.0, 0.21, 0.145, 2.4], [0, 1.48, -0.005, 0.2, 0.13, 2.6]], { color: c.cuirass }, 12)] : []),
    P.box(0.04, 0.5, 0.03, { x: -0.16, y: 0.85, z: -0.05, rx: 0.4, color: BLACK }),                                // the sabre's scabbard
    ...head(),
    ...cfg.hat(c),
  ];
  // the arms forward to the reins; the sabre held at the slope against the right shoulder
  const arms = [
    ...armsHold({ sleeve: c.coat, cuff: c.facing }),
    P.box(0.012, 0.75, 0.03, { x: 0.2, y: 1.62, z: 0.12, rx: -0.35, color: STEEL }),
    P.box(0.07, 0.02, 0.04, { x: 0.2, y: 1.27, z: 0.25, color: BRASS }),                                         // the hilt
  ];
  return { torso, arms, thigh: [thighPart({ color: c.breeches })], shin: shinPart({ color: c.breeches, boot: BLACK, bootTop: 0.48, blouse: false }), cfg };
}

const SEAT = { y: 1.66, z: 0.05 };          // the saddle seat (horse space)
const material = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });

/** The rider seated, as a group to sit on the horse's body (or to lie on the ground when he falls). */
function rider(army, kind) {
  const p = trooper(army, kind);
  const mat = material();
  const g = new THREE.Group();
  const lift = SEAT.y - 0.96;
  const body = new THREE.Mesh(merge([...p.torso, ...p.arms]), mat);
  body.position.set(0, lift, SEAT.z);
  g.add(body);
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.14, SEAT.y, SEAT.z + 0.02);
    hip.rotation.set(-1.2, 0, s * 0.32);       // the thigh forward and out over the barrel
    hip.add(new THREE.Mesh(merge(p.thigh), mat));
    const knee = new THREE.Group();
    knee.position.y = -0.48;
    knee.rotation.x = 1.38;                    // the lower leg down to the stirrup
    knee.add(new THREE.Mesh(merge(p.shin), mat));
    hip.add(knee);
    g.add(hip);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, cfg: p.cfg };
}

const COATS = ['bay', 'bay', 'chestnut', 'black', 'grey'];
const HEAVY_COATS = ['black', 'bay', 'black', 'bay'];

/** One trooper's rig. `mounted` false: a loose horse, saddled, no one on it. */
export function buildCavalry({ army = 'fr', kind = 'heavy', mounted = true } = {}) {
  const cfg = ((CAV[army] ?? CAV.fr)[kind]) ?? CAV.fr.heavy;
  const coats = kind === 'heavy' ? HEAVY_COATS : COATS;
  const horse = buildHorse({ coat: coats[Math.floor(Math.random() * coats.length)], saddle: { cloth: cfg.cloth, trim: cfg.trim } });
  const root = horse.root;
  let man = null;
  if (mounted) {
    man = rider(army, kind).group;
    man.position.y = -1.2;                    // (the horse's body group sits at y 1.2)
    horse.body.add(man);
  }
  const muzzle = new THREE.Object3D();         // the carbine or pistol, at the rider's hand
  muzzle.position.set(0.25, 0.48, 0.5);
  horse.body.add(muzzle);
  let gait = 'halt';
  let fall = 0;
  return {
    root,
    muzzle,
    animate(u, dt) {
      const v = Math.hypot(u.vel.x, u.vel.z);
      // the gait for the speed, with a little slack so it doesn't flicker between two
      const up = { halt: 0.35, walk: 2.4, trot: 4.8, canter: 7.5 }, down = { walk: 0.2, trot: 1.9, canter: 4.2, gallop: 6.8 };
      const order = ['halt', 'walk', 'trot', 'canter', 'gallop'];
      let i = order.indexOf(gait);
      while (i < 4 && v > up[order[i]]) i++;
      while (i > 0 && v < down[order[i]]) i--;
      gait = order[i];
      horse.update(dt, gait);
    },
    die(time, dt) {
      const fate = this.fate ?? 'both';
      if (!this.fallen) {
        this.fallen = true;
        if (man && fate === 'rider') { horse.body.remove(man); root.add(man); man.position.set(0.9, 0, 0.6); }
        if (fate === 'rider') { horse.body.visible = false; for (const L of horse.legs) L.top.visible = false; }   // (the horse runs on: a loose-horse stack)
        if (fate === 'horse' && man) man.visible = false;                                                       // (he got up: a dismounted stack)
      }
      fall = Math.min(1, fall + dt * 1.3);
      const k = fall * fall * (3 - 2 * fall);
      if (fate !== 'rider') {                  // the horse goes down on its side
        horse.body.rotation.z = 1.35 * k;
        horse.body.position.y = 1.2 - 0.62 * k;
      }
      if (man && fate === 'rider') man.rotation.x = -1.4 * k; // he goes over backwards out of the saddle (with 'both' he goes down with the horse)
    },
  };
}

/** The trooper on foot (render/StackRenderer.js contract), for a man whose horse went down. */
export function buildCavalryFoot({ army = 'fr', kind = 'heavy' } = {}) {
  const p = trooper(army, kind);
  return {
    torso: finish(merge(p.torso)),
    arms: finish(merge(p.arms)),
    glow: null,
    thigh: finish(merge(p.thigh), false),
    shin: finish(merge(p.shin), false),
    rig: { hipX: 0.12, hipY: 0.96, thighLen: 0.48, shinLen: 0.48, shoulderY: 1.47 },
    muzzle: { x: 0.2, y: 1.32, z: 0.6 },
  };
}
