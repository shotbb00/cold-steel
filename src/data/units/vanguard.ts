// Rifle squad: the line infantry. NATO M16A2s, Pact AK-74s — single aimed shots; one solid
// hit usually puts a man down (see UnitStack.damageUnit). Stats are shared by both factions;
// `models` gives each its own look (data/models/). `stats.muzzle` is a fallback — models
// supply their own. (File name kept from the prototype; the id is 'rifles'.)
import { buildNatoSoldier } from '../models/natoSoldier.js';
import { buildPactSoldier } from '../models/pactSoldier.js';
import { buildBwSoldier } from '../models/bwSoldier.js';
import { buildNvaSoldier } from '../models/nvaSoldier.js';
import type { UnitType } from '../../types.ts';

export default {
  id: 'rifles',
  name: 'Rifle Squad',
  shortName: 'Rifles',
  category: 'infantry', // reinforcement window section
  kind: 'infantry',
  role: 'frontline', // forms the front row when a group is ordered to move
  cost: 150,

  formation: { count: 9, columns: 5, spacing: 2.4 },

  stats: {
    hp: 100,              // one solid hit is usually enough
    grenades: 2,          // hand grenades per man (UnitStack GRENADE)
    lightAT: 2,           // light anti-tank rockets the squad carries (UnitStack LAW)
    smoke: { charges: 2 }, // smoke grenades: thrown toward the shooter when hit in the attack or pinned (UnitStack.receiveDamage), or on order
    armor: 0,
    speed: 3.3,           // walking pace, m/s (runs ~1.6x)
    radius: 0.45,         // hit / body radius
    height: 1.9,
    eyeHeight: 1.6,
    sight: 70,            // spotting range (in the view cone)
    fov: 2.1,             // view cone, radians (~120°)
    aimHeight: 1.25,
    range: 90,
    aggroRange: 95,       // idle stacks engage enemies this close
    preferredRange: 55,   // attacking stacks settle about this far from the target
    leash: 10,            // soldiers look for cover this far around their stack
    fireCooldown: 1.8,
    burst: 1,
    burstInterval: 0,
    damage: 110,
    boltSpeed: 380,       // game-scaled muzzle velocity, m/s
    boltSize: 0.6,
    tracer: 0.3,          // share of rounds drawn as tracers
    spread: 0.012,
    magSize: 30,
    reloadTime: 3.0,
    stance: 'crouch',     // posture in the open; goes prone when pinned or shooting far
    breakMorale: 0.18,    // stack retreats below this morale
    pierce: 0,            // fraction of target armour ignored
    playerFireInterval: 0.25, // seconds between shots when you control one
    aimTime: 0.9,         // seconds of aiming per shot (scaled by distance and suppression)
    vsArmor: 0.02,        // rifle rounds do next to nothing to tanks
    muzzle: { x: 0.2, y: 1.31, z: 0.94 },
  },

  models: { nato: () => buildNatoSoldier(), pact: () => buildPactSoldier(),
    bw: () => buildBwSoldier(), nva: () => buildNvaSoldier() },
  // the squad kits' weapons in the riflemen's hands (data/kits.js)
  kitModels: {
    at: { nato: () => buildNatoSoldier({ weapon: 'at' }), pact: () => buildPactSoldier({ weapon: 'at' }), bw: () => buildBwSoldier({ weapon: 'at' }), nva: () => buildNvaSoldier({ weapon: 'at' }) },
    smg: { nato: () => buildNatoSoldier({ weapon: 'smg' }), pact: () => buildPactSoldier({ weapon: 'smg' }), bw: () => buildBwSoldier({ weapon: 'smg' }), nva: () => buildNvaSoldier({ weapon: 'smg' }) },
  },
  weaponSound: 'rifle',
  // shown in the main menu's unit preview
  variants: {
    bw: { name: 'Panzergrenadier Squad', weapon: 'G3 rifles, MG3, Panzerfaust 44', text: 'West German mechanised infantry: they ride the Marder into battle and fight beside it. Steady, well drilled, and at their best in a prepared position.' },
    nva: { name: 'Mot.-Schützen Squad', weapon: 'MPi-KM rifles, RPG-18', text: 'The East German motor riflemen: drilled hard, well equipped, and expected to go first through the gap their artillery has made.' },
    nato: { name: 'Rifle Squad', weapon: 'M16A2 rifles, M72 LAW', text: 'The backbone of the line: nine men with single aimed shots. They hold ground, dig in and take points.' },
    pact: { name: 'Motor Rifle Section', weapon: 'AK-74 rifles, RPG-18', text: 'Soviet motor riflemen, the mass of every assault wave. Dangerous in numbers, brittle once pinned.' },
  },
} satisfies UnitType;
