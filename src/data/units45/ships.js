// 1945 warships, the open-sea maps only (the Pacific: the US Navy on the `nato` side, the Imperial
// Japanese Navy on the `pact` side). One ship a stack. Ranges and speeds are the game's sea scale
// (the open-sea maps are ~5 km: real gun ranges of 15–40 km would cover all of it), layered so
// the bigger ship outranges the smaller. Batch 1 of the sea battles: the destroyer, moving and
// shooting with one gun picture; the mounts, torpedoes, flooding and the other classes follow.
import { buildFletcher, buildKagero } from '../models/ships1945.js';

const naval = { naval: true, armor: 0.2, eyeHeight: 18, aimHeight: 4, height: 10, nightSight: undefined, crew: 0, breakMorale: 0, smoke: undefined, grenades: 0, lightAT: 0 };

export const destroyer = {
  id: 'destroyer',
  name: 'Destroyer',
  shortName: 'Destroyer',
  category: 'naval',
  kind: 'vehicle',
  role: 'fighter',
  cost: 450,
  formation: { count: 1, columns: 1, spacing: 0 },
  stats: {
    ...naval,
    hp: 4200,
    speed: 16,            // ~31 knots on the sea scale
    accel: 0.12,          // way on, way off: slow
    turnRate: 0.09,       // rad/s at speed: a turning circle of ~350 m
    turretRate: 0.5,
    radius: 7,            // (routing and keeping clear of other ships: the beam and a margin)
    sight: 2600,          // lookouts from the masthead
    fov: 6.3,
    range: 2400,
    aggroRange: 2400,
    preferredRange: 1600,
    leash: 60,
    weapon: 'cannon',
    fireCooldown: 1.6,    // five mounts between them (the mounts get their own fire in batch 2)
    burst: 1,
    burstInterval: 0,
    aimTime: 1.2,
    damage: 260,
    splash: 4,
    pierce: 0.3,
    boltSpeed: 900,
    boltSize: 1.8,
    tracer: 1,
    spread: 0.012,
    magSize: 400,
    reloadTime: 5,
    antiArmor: true,
    playerFireInterval: 1.2,
  },
  camera: { distance: 95, height: 32, shoulder: 0 },
  models: { nato: buildFletcher, pact: buildKagero },
  weaponSound: 'cannon',
  engine: 'engine.diesel',
  variants: {
    nato: { name: 'Fletcher-class destroyer', weapon: '5 × 5-inch/38, 10 torpedo tubes', text: 'The workhorse of the US Navy in the Pacific: fast, well armed, radar-directed guns. Screens the big ships, hunts submarines, makes torpedo runs.' },
    pact: { name: 'Kagerō-class destroyer', weapon: '6 × 12.7 cm, 8 Long Lance torpedoes', text: 'The fleet destroyer of the Imperial Navy: its Long Lance torpedoes reach further than any enemy\'s and leave no wake to see them coming.' },
  },
};

export const SHIPS_1945 = { destroyer };
