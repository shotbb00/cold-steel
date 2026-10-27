// Shared types for the data registries: unit types (data/units), aircraft (data/air.ts), maps
// (maps/) and game modes (modes/). Data files declare themselves `satisfies UnitType` (etc.), so
// a misspelt stat or a missing field is caught by `npm run typecheck` instead of failing
// silently in battle. Engine-side objects (stacks, the game) stay loosely typed for now.

export type Faction = 'nato' | 'pact';
export type PerFaction<T> = Record<Faction, T>;

/** A model builder (data/models): materials in, a rig for render/RigRenderer or StackRenderer out. */
export type ModelBuilder = (mats?: any) => any;

export interface AntiAir {
  range: number;
  /** heat-seeking missiles (UnitStack.engageAirMissile) instead of a radar-directed gun */
  missile?: boolean;
  // gun
  rate?: number;
  burst?: number;
  pause?: number;
  hitNear?: number;
  hitFar?: number;
  // missiles
  count?: number;
  reload?: number;
  pk?: number;
  hits?: number;
  speed?: number;
  sound?: string;
}

export interface Atgm {
  range: number;
  damage: number;
  pierce: number;
  splash: number;
  speed: number;
  reload: number;
  count: number;
}

export interface UnitStats {
  hp: number;
  armor: number;
  speed: number;
  radius: number;
  height: number;
  aimHeight: number;
  sight: number;
  fov: number;
  range: number;
  aggroRange: number;
  preferredRange: number;
  leash?: number;
  fireCooldown: number;
  burst?: number;
  burstInterval?: number;
  damage: number;
  /** direct fire only: indirect weapons fly ballistic arcs (UnitStack.lob) */
  boltSpeed?: number;
  boltSize: number;
  spread: number;
  magSize: number;
  reloadTime: number;
  breakMorale: number;
  // optional: movement and senses
  turnRate?: number;
  turretRate?: number;
  eyeHeight?: number;
  stance?: 'stand' | 'crouch' | 'prone';
  nightSight?: number | Partial<PerFaction<number>>;
  binoculars?: boolean;
  stealth?: number;
  holdFire?: boolean;
  // weapon
  weapon?: 'rifle' | 'rocket' | 'cannon' | 'artillery' | 'autocannon' | 'beam';
  weaponSound?: string;
  muzzleKind?: string;
  muzzle?: { x: number; y: number; z: number };
  tracer?: number;
  trail?: boolean;
  splash?: number;
  pierce?: number;
  vsArmor?: number;
  suppressPower?: number;
  aimTime?: number;
  playerFireInterval?: number;
  antiArmor?: boolean;
  gunRange?: number;
  deployTime?: number;
  // indirect fire
  indirect?: boolean;
  minRange?: number;
  gravity?: number;
  scatter?: number;
  scatterPerM?: number;
  crater?: number;
  smokeRounds?: number;
  flareRounds?: number;
  // special equipment and roles
  antiAir?: AntiAir;
  atgm?: Atgm;
  smoke?: { charges: number };
  carries?: { unit: string; count: number };
  crew?: number;
  bailChance?: number;
  engineer?: boolean;
  observer?: { scatter: number };
  repair?: { range: number; rate: number; mend: number; seek: number };
  heal?: { range: number; rate: number; seek: number };
  medical?: boolean;
  structure?: boolean;
}

export interface UnitVariant {
  name: string;
  weapon?: string;
  text?: string;
}

export interface UnitType {
  id: string;
  name: string;
  shortName: string;
  kind: 'infantry' | 'vehicle';
  /** reinforcement window section (ui/ReinforceWindow.js) */
  category?: 'infantry' | 'armour' | 'fire' | 'airdefence' | 'support';
  role?: 'frontline' | 'support';
  cost: number;
  /** not offered anywhere (fortifications, crews) */
  hidden?: boolean;
  /** only arrives by helicopter (air assault) */
  airOnly?: boolean;
  formation: { count: number; columns: number; spacing: number };
  stats: UnitStats;
  /** per-side changes on top of `stats` */
  factionStats?: Partial<PerFaction<Partial<UnitStats>>>;
  /** the first `count` members get these stats on top (and specialistModels) */
  specialist?: { count: number; stats: Partial<UnitStats> };
  models: Partial<PerFaction<ModelBuilder>>;
  specialistModels?: Partial<PerFaction<ModelBuilder>>;
  weaponSound?: string;
  engine?: string | PerFaction<string>;
  tracks?: string;
  camera?: { distance: number; height: number; shoulder: number };
  variants?: Partial<PerFaction<UnitVariant>>;
}

// ---------------------------------------------------------------- aircraft (data/air.ts)

export interface AircraftWeapon {
  rate?: number;
  count?: number;
  interval?: number;
  damage: number;
  splash: number;
  vsArmor: number;
  pierce: number;
  speed: number;
  tracer?: number;
  size?: number;
  sound?: string;
}

export interface Aircraft {
  name: string;
  weapon?: string;
  text?: string;
  model: ModelBuilder;
  paint: { colors: [number, number, number, number]; scale: number };
  rotorSound?: string;
  rotorSpeed?: number;
  engineSound?: string;
  gun: AircraftWeapon & { rate: number; tracer: number; sound: string };
  rockets?: AircraftWeapon & { count: number; interval: number };
  /** air assault: the unit type landed */
  squad?: string;
  hp: number;
}

// ---------------------------------------------------------------- maps (maps/)

export interface ControlPointDef {
  id: string;
  name: string;
  x: number;
  z: number;
  owner: Faction | null;
  sector?: 'west' | 'centre' | 'east';
  radius?: number;
}

export interface Spawn {
  unit: string;
  x: number;
  z: number;
  facing?: number;
  name?: string;
}

export interface TerrainPalette {
  grass: string;
  grassAlt: string;
  dryGrass: string;
  dirt: string;
  rock: string;
  strip?: string;
  pasture?: string;
  ploughed?: string;
  stubble?: string;
  meadow?: string;
  farmX?: [number, number];
  farmZ?: [number, number];
  roads?: number[];
  roadZ?: number;
  /** a map's own ground: streets, runways, salt — [hex colour, 0..1] or null */
  surface?: (x: number, z: number, y: number) => [number, number] | null;
}

export interface MapTheme {
  fogColor: number;
  fogDensity: number;
  skyTop: number;
  skyHorizon: number;
  skyBottom: number;
  sunColor: number;
  sunIntensity: number;
  sunDisk: number;
  clouds: number;
  cloudLight: number;
  cloudDark: number;
  sunDir: [number, number, number];
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  rimColor: number;
  rimIntensity: number;
  terrain: TerrainPalette;
}

export interface MapDef {
  id: string;
  name: string;
  description: string;
  size: number;
  segments: number;
  bounds: { x: number; z: number };
  seed: number;
  height: (x: number, z: number) => number;
  theme: MapTheme;
  fields?: any;
  bases: PerFaction<{ x: number; z: number; entries?: number[] }>;
  maxStacks?: number;
  cameraStart: PerFaction<{ x: number; z: number }>;
  points: ControlPointDef[];
  spawns: PerFaction<Spawn[]>;
  decorate?: (ctx: any) => any;
  /** world/River.js, maps with crossings */
  river?: any;
  bridgeAt?: (x: number, z: number) => any;
  /** forest density 0..1: shortens sight through the trees (systems/VisibilitySystem.js) */
  woods?: (x: number, z: number) => number;
  /** spotters looking down see farther */
  overwatch?: boolean;
  [extra: string]: unknown;
}

// ---------------------------------------------------------------- modes (modes/)

export interface ModeDef {
  id: string;
  name: string;
  description: string;
  multiplayer?: boolean;
  setup: (game: any) => void;
  update?: (game: any, dt: number) => void;
  [extra: string]: unknown;
}
