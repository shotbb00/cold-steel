// Fixed fortifications for the Lanes mode (modes/lanes.js) — not purchasable (`hidden`), they
// never move (speed 0), never break, and are always known to both sides (`structure`):
//   bunker      a lane's forward line: a turret bunker (tank gun: armour and men alike) flanked
//               by two MG pits (long bursts that pin infantry)
//   strongpoint the second line: two turret bunkers and two MG pits, thicker concrete
//   hq          the headquarters: the command blockhouse and three turret bunkers around it.
//               It falls when the blockhouse does.
// Concrete shrugs off small arms; tank guns, AT rockets, artillery and engineers' charges are
// what bring it down. Members are stack units like any other: the first `specialist.count` of
// each have the specialist stats and model.
import { buildTurretBunker, buildMgPit, buildCommandBunker } from '../models/fortifications.js';
import type { UnitType, UnitStats, ModelBuilder } from '../../types.ts';

const FIXED = {
  structure: true,
  speed: 0,
  turnRate: 0,
  fov: 6.3,             // all round
  eyeHeight: 2.4,
  sight: 140,
  aggroRange: 0,
  preferredRange: 0,
  leash: 0,
  breakMorale: 0,
  stance: 'stand',
} satisfies Partial<UnitStats>;

const MG = {
  ...FIXED,
  hp: 1050,
  armor: 0.72,
  radius: 2.3,
  height: 1.5,
  aimHeight: 0.9,
  range: 120,
  weapon: 'rifle',
  weaponSound: 'mg',
  turretRate: 1.8,
  fireCooldown: 0.16,     // a long burst…
  magSize: 45,
  reloadTime: 3.5,        // …then a pause
  damage: 95,
  boltSpeed: 400,
  boltSize: 0.7,
  tracer: 0.35,
  spread: 0.016,
  suppressPower: 2.2,
  vsArmor: 0.03,
  pierce: 0,
} satisfies UnitStats;

const GUN = {
  ...FIXED,
  hp: 1800,
  armor: 0.8,
  radius: 3.2,
  height: 2.8,
  aimHeight: 1.8,
  range: 150,
  weapon: 'cannon',
  weaponSound: 'cannon',
  turretRate: 0.6,
  fireCooldown: 5.5,
  magSize: 60,
  reloadTime: 5,
  damage: 380,
  splash: 3.2,
  pierce: 0.5,
  boltSpeed: 600,
  boltSize: 1.6,
  tracer: 1,
  spread: 0.005,
  antiArmor: true,
  vsArmor: 1,
} satisfies UnitStats;

const COMMAND = {
  ...FIXED,
  hp: 5200,
  armor: 0.82,
  radius: 6,
  height: 3.2,
  aimHeight: 1.8,
  range: 0,             // the headquarters itself doesn't shoot — its guns do
  weapon: 'rifle',
  fireCooldown: 999,
  magSize: 1,
  reloadTime: 999,
  damage: 0,
  boltSpeed: 1,
  boltSize: 0,
  spread: 0,
  turretRate: 0,
} satisfies UnitStats;

const MODELS = (fn: (side: string) => ModelBuilder) => ({ nato: fn('nato'), pact: fn('pact') });

export const bunker = {
  id: 'bunker',
  name: 'Bunker line',
  shortName: 'Bunker',
  kind: 'vehicle',
  hidden: true,
  cost: 600,
  formation: { count: 3, columns: 3, spacing: 11 },
  stats: MG,
  specialist: { count: 1, stats: GUN },
  models: MODELS(buildMgPit),
  specialistModels: MODELS(buildTurretBunker),
  weaponSound: 'mg',
  variants: {
    nato: { name: 'Bunker line', text: 'A turret bunker with an M48 turret and two MG pits.' },
    pact: { name: 'Bunker line', text: 'A T-55 turret on a concrete casemate, with two MG pits.' },
  },
} satisfies UnitType;

export const strongpoint = {
  id: 'strongpoint',
  name: 'Strongpoint',
  shortName: 'Strongpoint',
  kind: 'vehicle',
  hidden: true,
  cost: 900,
  formation: { count: 4, columns: 4, spacing: 10 },
  stats: { ...MG, hp: 1300 },
  specialist: { count: 2, stats: { ...GUN, hp: 2200, armor: 0.82 } },
  models: MODELS(buildMgPit),
  specialistModels: MODELS(buildTurretBunker),
  weaponSound: 'mg',
  variants: {
    nato: { name: 'Strongpoint', text: 'Two turret bunkers and two MG pits, thicker concrete.' },
    pact: { name: 'Strongpoint', text: 'Two turret bunkers and two MG pits, thicker concrete.' },
  },
} satisfies UnitType;

export const hq = {
  id: 'hq',
  name: 'Headquarters',
  shortName: 'HQ',
  kind: 'vehicle',
  hidden: true,
  cost: 2000,
  formation: { count: 4, columns: 4, spacing: 13 },
  stats: { ...GUN, hp: 2400, armor: 0.82 },
  specialist: { count: 1, stats: COMMAND },
  models: MODELS(buildTurretBunker),
  specialistModels: MODELS(buildCommandBunker),
  weaponSound: 'cannon',
  variants: {
    nato: { name: 'Brigade headquarters', text: 'The command blockhouse, ringed by turret bunkers.' },
    pact: { name: 'Regimental headquarters', text: 'The command blockhouse, ringed by turret bunkers.' },
  },
} satisfies UnitType;
